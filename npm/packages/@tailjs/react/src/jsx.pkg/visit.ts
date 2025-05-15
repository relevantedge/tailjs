import React, {
  createElement,
  ReactNode,
  Fragment,
  PropsWithChildren,
  ComponentClass,
  FunctionComponent,
  ComponentType as ReactComponentType,
  ComponentProps,
} from "react";

import {
  isBoundaryData,
  tail,
  type BoundaryData,
  type ProvisionalTracker,
} from "@tailjs/client/external";
import type { View } from "@tailjs/types";

import { updateState } from "../updateState";

const baseTracker = tail;
let tracker = baseTracker;

const wrapped = Symbol();

type ComponentType = ComponentClass<any, any> | React.FunctionComponent<any>;
type ElementType = string | ComponentType;

export interface BoundaryDataWithView extends BoundaryData {
  view?: View | null;
}

export type StateMapperConfiguration<CustomState = never> =
  | StateMapper<CustomState>
  | {
      state: StateMapper<CustomState>;

      /**
       * Override the default behavior that maps the boundary data to tailjs commands.
       *
       * return `false` to suppress default behavior.
       */

      ref?: ElementStateMapper<CustomState>;
    };

export type ElementStateMapper<CustomState = never> = (
  tail: ProvisionalTracker,
  el: Element,
  data: BoundaryDataWithView | CustomState
) => void | false;
export interface JsxConfiguration<CustomState = never> {
  /**
   * The script to inject in the the page's `<head>` section.
   *
   * @default false
   */
  script?:
    | { src?: string; async?: boolean; attrs?: Record<string, any> }
    | false;

  /** Maps component types and properties to boundary data (views, components etc.) */
  map?: StateMapperConfiguration<CustomState>;

  /**
   * Include React components with a `displayName` in tracking. Works well with something like `webpack-react-component-name`.
   *
   * @default true
   */
  trackJsx?: boolean | ((type: ComponentType) => string | Nullish);

  /** The key the tracker requires to accept commands (if configured on the tracker). */
  key?: string;
}

type Nullish = null | undefined;

let config: JsxConfiguration | Nullish = null;

let stateMapper: StateMapper<any> | Nullish = null;
let script: JsxConfiguration["script"] | Nullish = null;
let customRef: ElementStateMapper<any> | Nullish = null;

const isClientComponentReference = (type: any) =>
  type?.$$typeof?.toString() === "Symbol(react.client.reference)";

const isClassComponent = (type: any): type is React.Component =>
  type?.prototype &&
  ((React.Component && type.prototype instanceof React.Component) ||
    type.prototype?.render);

export type StateMapper<CustomState = never> = (
  currentState: BoundaryDataWithView | CustomState | undefined,
  type: ElementType,
  props: Record<string, any>
) => BoundaryDataWithView | CustomState | Nullish | void;

export type ConfigUpdater = (
  update: (current: JsxConfiguration | undefined) => JsxConfiguration | Nullish
) => void;

export const updateConfig: ConfigUpdater = (update: any) => {
  config = update(stateMapper);

  if (typeof config?.map === "object") {
    stateMapper = config.map.state;
    customRef = config.map.ref;
  } else {
    stateMapper = config?.map;
    customRef = null;
  }
  script =
    (config?.script as any)?.src || typeof config?.script === "function"
      ? config!.script
      : false;

  const trackJsx = config?.trackJsx ?? true;
  if (trackJsx !== false) {
    const innerMapper = stateMapper;
    stateMapper = (currentState, type, props) => {
      currentState = innerMapper?.(currentState, type, props) ?? currentState;
      if (typeof type === "function" && !isClientComponentReference(type)) {
        let displayName = trackJsx === true ? type.displayName : trackJsx(type);
        if (displayName) {
          currentState = updateState(currentState, {
            component: {
              id: displayName,
              name: displayName,
              inferred: true,
              source: "jsx",
            },
          });
        }
      }
      return currentState;
    };
  }

  const key = config?.key;
  tracker = key
    ? (...commands: any) => baseTracker(key, ...commands)
    : baseTracker;
};

const asArray = (value: any): any[] | undefined =>
  Array.isArray(value)
    ? value
    : typeof value !== "string" && value?.[Symbol.iterator]
    ? [...value]
    : undefined;

const cloneIfFrozen = <T>(obj: T): T => {
  if (!Object.isFrozen(obj)) return obj;
  if (Array.isArray(obj)) {
    return [...obj] as T;
  }
  const props = Object.getOwnPropertyDescriptors(obj);
  for (let prop in props) {
    if (props[prop].writable === false) {
      props[prop].writable = true;
    }
  }
  return Object.defineProperties({}, props) as T;
};

const singleOrArray = (children: any[], alwaysArray = false) =>
  children.length === 1 && !alwaysArray
    ? children[0]
    : children.map((child, i) => {
        if (child == null || typeof child !== "object" || child.key) {
          return child;
        }
        child = cloneIfFrozen(child);
        child.key = `__child_${i}`;
        return child;
      });

const PARENT_STATE_PROP = "_tjs_ps";
/** This is allowed on all elements/components to explicitly define the boundary data. */
const EXPLICIT_STATE_PROP = "tailjs";
const withProp = (target: any, prop: keyof any, value: any) => {
  target = cloneIfFrozen(target);
  target.props = cloneIfFrozen(target.props ?? {});
  target.props[prop] = value;
  return target;
};

// `state` may also be CustomState, but for simplicity we just assume boundary data here.
const tryBindState = (jsx: any, state: BoundaryDataWithView): any => {
  if (!jsx) {
    return undefined;
  }

  if (typeof jsx.type === "string") {
    // HTML element.
    if (jsx.ref) {
      // Don't replace refs (it might confuse e.g. Motion), so need to put them on children.
      if (!jsx.props.children) {
        // Nothing to do about.
        return jsx;
      }

      const updatedChildren = tryBindState(jsx.props.children, state);
      return updatedChildren && withProp(jsx, "children", updatedChildren);
    }

    if (typeof window === "undefined") {
      // No refs on server.
      return undefined;
    }

    let previousElement: any;
    const ref = (el: any) => {
      if (el && el !== previousElement) {
        previousElement = el;
        if (customRef?.(tracker, el, state) === false) {
          return;
        }

        const view = state.view;
        if (view) {
          tracker({ set: { scope: "view", key: "view", value: view } });
          delete state.view;
        }

        if (isBoundaryData(state)) {
          tracker({ boundary: el, ...state });
        }
      }
    };

    jsx = cloneIfFrozen(jsx);
    jsx.ref = ref;

    return jsx;
  } else if (typeof jsx.type === "function") {
    const wrapped = wrapType(jsx.type);
    if (wrapped && wrapped !== jsx.type) {
      jsx = cloneIfFrozen(jsx);
      jsx.type = wrapped;
    }
    return withStateProperty(jsx, PARENT_STATE_PROP, state, true);
  } else if (jsx.type === Fragment) {
    return tryBindState(jsx.props?.children, state);
  } else if (isClientComponentReference(jsx.type)) {
    return withStateProperty(jsx, PARENT_STATE_PROP, state, true);
  }

  let list = asArray(jsx);
  if (list) {
    let hasChanges = false;
    for (let i = 0; i < list.length; i++) {
      let updated = tryBindState(list[i], state);
      if (updated) {
        if (!hasChanges) {
          list = cloneIfFrozen(list);
          hasChanges = true;
        }
        list[i] = updated;
      }
    }
    return hasChanges ? list : undefined;
  }
  return undefined;
};

const withStateRefs = (render: () => any, state: any) => {
  const output = render();
  return output?.then
    ? output.then((output: any) => tryBindState(output, state) ?? output)
    : tryBindState(output, state) ?? output;
};

const withStateProperty = (
  props: any,
  prop: string,
  state: any,
  jsx = false
) => {
  if (!state) {
    return props;
  }
  if (jsx) {
    return withProp(props, prop, JSON.stringify(state));
  }

  props = cloneIfFrozen(props);
  props[prop] = JSON.stringify(state);
  return props;
};
const parseStateProperty = (props: any, prop: string) => {
  let state = props?.[prop];
  if (typeof state === "string") {
    try {
      return JSON.parse(state);
    } catch (e) {}
  } else if (state && typeof state === "object") {
    return state;
  }
  return undefined;
};

const wrapRender = (
  type: ElementType,
  props: Record<string, any>,
  render: () => ReactNode
) => {
  const parentState = parseStateProperty(props, PARENT_STATE_PROP);
  const state = stateMapper
    ? stateMapper(parentState, type, props)
    : parentState;

  if (state) {
    return withStateRefs(render, state);
  }

  return render();
};

const indexOfChild = (el: any, test: (el: any) => boolean) => {
  if (!el) {
    return null;
  }

  if (Array.isArray(el)) {
    let i = 0;
    for (const child of el) {
      if (indexOfChild(child, test) != null) {
        return i;
      }
      ++i;
    }
    return null;
  } else if (typeof el.type === "symbol") {
    return indexOfChild(el.props?.children, test) != null ? 0 : null;
  } else {
    return test(el) ? 0 : null;
  }
};

let headCreated: boolean[] = [];
const EnsureHeadScript = () => {
  const hasHead = headCreated.pop();

  return !script || hasHead
    ? null
    : createElement("head", { children: createScriptElement(script) });
};
const CaptureHead = ({ children }: PropsWithChildren<{}>) => {
  headCreated.push(false);
  const htmlChildren = getChildArray(children);
  const bodyIndex = htmlChildren.findIndex((el) => el.type === "body");
  htmlChildren.splice(
    bodyIndex === -1 ? htmlChildren.length : bodyIndex,
    0,
    // Utilize that react components are rendered depth-first, so our "EnsureHeadScript" component will not be rendered
    // before any preceding components might have created a `<head />` element which we capture in `injectScript`.
    createElement(EnsureHeadScript)
  );
  return createElement(Fragment, {
    children: singleOrArray(htmlChildren, Array.isArray(children)),
  });
};

const createScriptElement = (script: JsxConfiguration["script"]) =>
  script && script.src
    ? createElement("script", {
        src: script.src,
        async: script.async ?? true,
        ...script.attrs,
      })
    : null;

const getChildArray = (children: any) =>
  children == null ? [] : Array.isArray(children) ? [...children] : [children];

const injectScript = (
  type: ElementType,
  props: Record<string, any>,
  children?: ReactNode[]
) => {
  if (!script) {
    return;
  }

  if (type === "html") {
    props = cloneIfFrozen(props ?? {});
    children ??= props.children;
    const wrapper = createElement(CaptureHead, {
      children: children ?? props.children,
    });
    props.children = singleOrArray([wrapper], Array.isArray(children));

    return { type, props };
  } else if (type === "head") {
    if (headCreated.length) {
      headCreated[headCreated.length - 1] = true;
    }
    children ??= props.children;
    const headChildren = getChildArray(children);
    headChildren.unshift(createScriptElement(script));
    props = cloneIfFrozen(props);
    props.children = singleOrArray(headChildren, Array.isArray(children));
  }
};

const mergeChildren = (props: any, children: any) => {
  if (children) {
    // createElement's variadic `...children` parameter takes precedence over props.children.
    // https://github.com/facebook/react/blob/d85f86cf017151bcf5908d593c3899d876656a01/packages/react/src/jsx/ReactJSXElement.js#L711
    props = cloneIfFrozen(props ?? {});
    props.children = children;
  }
  return props;
};

const getStateFromProps = (type: any, props: any) => {
  if (props) {
    let state = parseStateProperty(props, EXPLICIT_STATE_PROP);
    if (stateMapper) {
      const parentState = parseStateProperty(props, PARENT_STATE_PROP);
      const mappedState = stateMapper(parentState, type, props);
      state = state ? updateState(mappedState, state) : mappedState;
    }
    return state;
  }
};

export const visit = (
  source: string,
  type: ElementType,
  props: Record<string, any>,
  children?: ReactNode[]
) => {
  if (!stateMapper) {
    return;
  }
  let updated = false;
  const injected = injectScript(type, props, children);
  if (injected) {
    updated = true;
    ({ type, props } = injected);
  }

  if (typeof type === "function" && type !== TrackerBoundary) {
    const state = getStateFromProps(type, props);
    if (!state) {
      return;
    }
    if (isClientComponentReference(type)) {
      return {
        type,
        props: withStateProperty(props, PARENT_STATE_PROP, state),
      };
    }

    type = wrapType(type);
    if (type) {
      props = mergeChildren(props, children);
      updated = true;
    }
  } else {
    if (typeof type === "string") {
      const state = getStateFromProps(type, props);
      if (state) {
        const boundState = tryBindState(
          { type, props: mergeChildren(props, children), ref: props?.ref },
          state
        );

        if (boundState?.type) {
          type = boundState.type;
          props = withProp(boundState, "ref", boundState.ref).props;
          updated = true;
        }
      }
    }

    if (props?.[PARENT_STATE_PROP] || props?.[EXPLICIT_STATE_PROP]) {
      // Make sure these properties don't leak into the SSR-generated HTML.
      props = cloneIfFrozen(mergeChildren(props, children));
      delete props[PARENT_STATE_PROP];
      delete props[EXPLICIT_STATE_PROP];
      updated = true;
    }
  }
  if (updated) {
    return { type, props };
  }
};

const wrapType = (type: any) => {
  if (
    typeof type === "function" &&
    !isClientComponentReference(type) &&
    type !== TrackerBoundary
  ) {
    let isClass = false;
    if (type[wrapped]) {
      return type[wrapped];
    } else {
      try {
        isClass = isClassComponent(type);
      } catch (e) {
        // Next.js client component reference that escaped?.
        console.warn(`Unexpected client reference: ${e}`, type, e);
        return;
      }

      const originalType = type;
      if (isClass) {
        type = class extends originalType {
          render() {
            return wrapRender(originalType, this.props, () => super.render());
          }
        };
      } else {
        type = (props: any) =>
          wrapRender(originalType, props, () => (originalType as any)(props));
      }

      mergeProperties(type, originalType);

      originalType[wrapped] = type;
    }
    return type;
  }
  return undefined;
};

/** Use this component to explicitly define tracker boundary data for its children (components, content, etc.). */
export const TrackerBoundary = (props: PropsWithChildren<BoundaryData>) => {
  let state = stateMapper?.(
    parseStateProperty(props, PARENT_STATE_PROP),
    TrackerBoundary,
    props
  );

  const { children, ...stateProps } = props;
  if (isBoundaryData(stateProps)) {
    state = updateState(state, stateProps);
  }
  if (state) {
    return withStateRefs(() => children, state);
  }
  return children;
};

const mergeProperties = (
  target: any,
  source: any,
  overwrite: Record<string, boolean> = { name: true }
) => {
  for (const [name, value] of Object.entries(
    Object.getOwnPropertyDescriptors(source)
  )) {
    const own = Object.getOwnPropertyDescriptor(target, name);
    if (own && (!own.configurable || !overwrite[name])) {
      continue;
    }
    Object.defineProperty(target, name, { ...value, configurable: true });
  }
  return target;
};

type PropertyMapper<P> = (
  props: Readonly<P>
) => BoundaryDataWithView | null | undefined | void;

export type WithTrackingFunction = {
  <C, P extends object>(
    Component: FunctionComponent<P> & C,
    mapState: PropertyMapper<P>
  ): C;
  <T extends ReactComponentType<any>>(
    Component: T,
    mapState: PropertyMapper<ComponentProps<T>>
  ): T;
};

export const withTracking: WithTrackingFunction =
  (component: any, mapState: any) => (props: any) => {
    const mapped = mapState(props);
    return mapped
      ? createElement(component, props)
      : TrackerBoundary({
          ...mapped,
          children: createElement(component, props),
        });
  };

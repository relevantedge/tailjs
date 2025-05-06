import React, { ReactNode, Fragment, PropsWithChildren } from "react";

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

type ComponentType = JSX.ElementClass | React.FunctionComponent<any>;
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
  /** The script to include the the page's `<head>` section. */
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
  script = (config?.script as any)?.src ? config!.script : false;

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

const PARENT_STATE_PROP = "__tjsps";
const withProp = (target: any, prop: keyof any, value: any) => {
  if (Object.isFrozen(target) || Object.isFrozen((target.props ??= {}))) {
    return { ...target, props: { ...target.props, [prop]: value } };
  }

  target.props[prop] = value;
  return target;
};

// `state` may also be CustomState, but for simplicity we just assume boundary data here.
const tryBindState = (jsx: any, state: BoundaryDataWithView) => {
  if (!jsx) {
    return undefined;
  }

  if (typeof jsx.type === "string") {
    // HTML element.
    if (jsx.props?.ref) {
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

    if (Object.isFrozen(jsx)) {
      jsx = { ...jsx, ref };
    } else {
      jsx.ref = ref;
    }
    return jsx;
  } else if (typeof jsx.type === "function") {
    const wrapped = wrapType(jsx.type);
    if (wrapped && wrapped !== jsx.type) {
      if (Object.isFrozen(jsx)) {
        jsx = { ...jsx };
      }
      jsx.type = wrapped;
    }
    return withProp(jsx, PARENT_STATE_PROP, state);
  } else if (jsx.type === Fragment) {
    return tryBindState(jsx.props?.children, state);
  }

  let list = asArray(jsx);
  if (list) {
    let hasChanges = false;
    for (let i = 0; i < list.length; i++) {
      let updated = tryBindState(list[i], state);
      if (updated) {
        if (!hasChanges) {
          if (Object.isFrozen(list)) {
            list = [...list];
          }
          hasChanges = true;
        }
        list[i] = updated;
      }
    }
    return hasChanges ? list : undefined;
  }
  return undefined;
};

const wrapRender = (
  type: ElementType,
  props: Record<string, any>,
  render: () => ReactNode
) => {
  const parentState = props?.[PARENT_STATE_PROP];
  const state = stateMapper
    ? stateMapper(parentState, type, props)
    : parentState;

  if (state) {
    let rendered = render();
    if (rendered?.["then"]) {
      return (rendered as any).then((rendered: any) =>
        tryBindState(rendered, state)
      );
    }
    return tryBindState(rendered, state) ?? rendered;
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

  if (type === "head") {
    if (
      indexOfChild(
        children ?? props.children,
        (el) =>
          el &&
          (el.key === "tailjs-script" ||
            (el.type === "script" && el.props?.src === (script as any).src))
      )
    ) {
      return;
    }

    children = getChildArray(children ?? props?.children);
    let scriptIndex =
      indexOfChild(children, (el) => el?.type === "script") ?? children.length;
    children.splice(
      scriptIndex,
      0,
      React.createElement("script", {
        src: script.src,
        key: "tailjs-script",
        async: script.async ?? true,
        ...script.attrs,
      })
    );
    if (Object.isFrozen(props)) {
      props = { ...props };
    }

    props.children = children;
    return { type, props };
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

  const parentState = props?.[PARENT_STATE_PROP];

  if (typeof type === "function" && type !== TrackerBoundary) {
    const currentState = stateMapper(parentState, type, props);
    if (!currentState) {
      return;
    }
    type = wrapType(type);
    if (type) {
      if (children && !props.children) {
        // Not frozen at this point.
        props.children = children;
      }

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
  let state = stateMapper?.(props[PARENT_STATE_PROP], TrackerBoundary, props);

  const { children, ...stateProps } = props;
  if (isBoundaryData(stateProps)) {
    state = updateState(state, stateProps);
  }
  return state ? tryBindState(children, state) : children;
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

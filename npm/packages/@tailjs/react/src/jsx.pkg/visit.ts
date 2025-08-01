import {
  ComponentProps,
  createElement,
  FunctionComponent,
  memo,
  PropsWithChildren,
  ComponentType as ReactComponentType,
  ReactNode,
} from "react";

import { tail } from "@tailjs/client/external";

import {
  clearTrackingDataExtensions,
  EventSpecificTags,
  ExtendedTrackingBoundaryData,
  isEmptyTrackingData,
  normalizeTrackingData,
  TrackingBoundaryData,
  updateTrackingData,
} from "@tailjs/types";
import {
  ElementStateMapper,
  ElementType,
  JsxConfiguration,
  StateMapper,
  StateMapperCollection,
} from "../shared";

import type { TrackingBoundaryType } from "./TrackingBoundary";

const {
  TrackingBoundary,
}: {
  TrackingBoundary: TrackingBoundaryType;
} = require("./TrackingBoundary.js");

const baseTracker = tail;
const FRAGMENT_SYMBOL = Symbol.for("react.fragment");

let tracker = baseTracker;

let config: JsxConfiguration | null = null;

let stateMapper: StateMapper<any> | null = null;
let script: JsxConfiguration["script"] | null = null;
let customRef: ElementStateMapper<any> | null = null;

const clientReferenceSymbol = Symbol.for("react.client.reference");
const isClientComponentReference = (type: any) =>
  type?.$$typeof == clientReferenceSymbol;

export type ConfigUpdater = (
  update: (
    current: JsxConfiguration | undefined
  ) => JsxConfiguration | undefined
) => void;

const flattenStateMapperCollection = (
  mappers: StateMapperCollection
): StateMapper[] =>
  !mappers
    ? []
    : typeof mappers === "function"
    ? [mappers]
    : mappers.flatMap(flattenStateMapperCollection);

const chainStateMappers = (
  collection: StateMapperCollection
): typeof stateMapper => {
  const mappers = flattenStateMapperCollection(collection);
  return mappers.length > 1
    ? (currentState, type, props) => {
        let mergedState = currentState;
        for (const mapper of mappers) {
          mergedState =
            updateTrackingData(undefined, mapper(mergedState, type, props)) ??
            mergedState;
        }
        return mergedState === currentState ? undefined : mergedState;
      }
    : mappers.length > 0
    ? mappers[0]
    : null;
};

let disabled = false;
export const updateConfig: ConfigUpdater = (update: any) => {
  config = update(stateMapper);

  disabled = config?.disabled ?? false;

  if (config?.map) {
    if ("state" in config.map) {
      stateMapper = chainStateMappers(config.map.state);
      customRef = config.map.ref ?? null;
    } else {
      stateMapper = config?.map ? chainStateMappers(config.map) : null;
      customRef = null;
    }
  }
  script =
    (config?.script as any)?.src || typeof config?.script === "function"
      ? config!.script
      : false;

  const trackJsx = config?.trackJsx ?? false;
  if (trackJsx !== false) {
    const innerMapper = stateMapper;
    stateMapper = (currentState, type, props) => {
      currentState =
        (innerMapper?.(currentState, type, props) as any) ?? currentState;
      if (typeof type === "function") {
        let displayName = trackJsx === true ? type.displayName : trackJsx(type);
        if (displayName) {
          return [
            currentState,
            {
              component: [
                {
                  id: displayName,
                  name: displayName,
                  inferred: true,
                  source: "jsx",
                },
              ],
            },
          ];
        }
      }
    };
  }

  const key = config?.key;
  tracker = key
    ? (...commands: any) => baseTracker(key, ...commands)
    : baseTracker;
};

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
  children == null
    ? children
    : children.length === 1 && !alwaysArray
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

const currentElementStates = new WeakMap<Element, any>();
export const bindState = (el: any, state: ExtendedTrackingBoundaryData) => {
  if (currentElementStates.get(el) === state) {
    // Don't call the tracker more than necessary.
    return;
  }
  currentElementStates.set(el, state);
  if (customRef?.(tracker, el, state) === false) {
    return;
  }

  const view = state.view;
  if (view) {
    tracker({ view });
    delete state.view;
  }
  const viewTags = (state.tags as EventSpecificTags)?.events?.view;
  if (viewTags) {
    tracker({ view: { addTags: viewTags } });
    delete (state.tags! as EventSpecificTags).events!.view;
  }

  if (!isEmptyTrackingData(state, true)) {
    tracker({ boundary: el, add: !state.reset, ...state });
  }
};

const withStateProperty = (
  props: any,
  prop: string,
  state: any,
  jsx = false
) => {
  if (!state || typeof state === "string") {
    return props;
  }
  if (jsx) {
    return withProp(props, prop, JSON.stringify(state));
  }

  props = cloneIfFrozen(props);
  props[prop] = JSON.stringify(state);
  return props;
};
const parseStateProperty = (
  props: any,
  prop: string
): TrackingBoundaryData | undefined => {
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

export const getStateFromProps = (type: any, props: any) => {
  if (props) {
    let state = parseStateProperty(props, EXPLICIT_STATE_PROP);
    if (stateMapper && type) {
      const parentState = parseStateProperty(props, PARENT_STATE_PROP);

      const mappedState = updateTrackingData(
        undefined,
        stateMapper(
          normalizeTrackingData(parentState),
          isClientComponentReference(type)
            ? { $$typeof: type.$$typeof, $$id: type.$$id } // Copy type to free the consumer from handling weird "server can't call client" errors.
            : type,
          props
        )
      );

      state = state
        ? updateTrackingData(mappedState, state) ?? parentState
        : mappedState;
    }
    state = normalizeTrackingData(state);

    return state;
  }
};

export const visit = (
  factory: (type: any, props: any, key?: any) => any,
  type: ElementType,
  props: Record<string, any>,
  children?: ReactNode[]
) => {
  if (disabled || !props) {
    return;
  }

  const injected = tryInjectScript(type, props, children);

  let updated = false;
  if (injected) {
    ({ type, props } = injected);
    updated = true;
  }

  if (!stateMapper) {
    return;
  }

  if (typeof type === "string") {
    if (props[EXPLICIT_STATE_PROP]) {
      props = withStateProperty(
        props,
        EXPLICIT_STATE_PROP,
        props[EXPLICIT_STATE_PROP]
      );
      updated = true;
    }
  } else if ((type as any) !== FRAGMENT_SYMBOL) {
    const state = getStateFromProps(type, props);
    if (state || isClientComponentReference(type)) {
      props = {
        children: singleOrArray([factory(type, props)], true),
        state, // Will be undefined if a client component reference without state. In that case we wrap it.
      };
      type = TrackingBoundary;
      updated = true;
    }
  }
  if (updated) {
    return { type, props };
  }
};

type PropertyMapper<P> = (
  props: Readonly<P>
) => ExtendedTrackingBoundaryData | null | undefined | void;

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
    const mapped = clearTrackingDataExtensions(mapState(props));
    return mapped // Empty object will also create a TrackingBoundary to support state that depends on a parameter (e.g., sometimes returns `{}` sometimes return `{tags: ...}`)
      ? createElement(TrackingBoundary, {
          state: updateTrackingData(null, mapped),
          children: createElement(component, props),
        })
      : createElement(component, props);
  };

let hasHead = false;
const TrackingScript = memo(
  ({ head }: { head?: boolean }) => {
    if (locallyDisabled || disabled || !script || !script.src) {
      return null;
    }
    if (hasHead && head) {
      // Reset (child under html element comes last).
      hasHead = false;
      if (head) {
        return null;
      }
    }

    const scriptElement = createElement("script", {
      src: script.src,
      async: script.async ?? true,
      ...script.attrs,
    });

    return head ? createElement("head", {}, scriptElement) : scriptElement;
  },
  () => true
);

const EnsureScript = ({ children }: PropsWithChildren) => {
  const htmlChildren = getChildArray(children);
  const bodyIndex = htmlChildren.findIndex((el) => {
    if (el.type === "body") {
      if (
        parseStateProperty(el.props, EXPLICIT_STATE_PROP)?.tracking?.disable ===
        true
      ) {
        locallyDisabled = true;
      }
      return true;
    }
    return false;
  });
  htmlChildren.splice(
    bodyIndex === -1 ? htmlChildren.length : bodyIndex,
    0,
    // Utilize that react components are rendered depth-first, so our "EnsureHeadScript" component will not be rendered
    // before any preceding components might have created a `<head />` element which we capture in `tryInjectScript`.
    createElement(TrackingScript, { head: true })
  );
  return singleOrArray(htmlChildren, Array.isArray(children));
};

let locallyDisabled = false;
const tryInjectScript = (
  type: ElementType,
  props: Record<string, any>,
  children?: ReactNode[]
) => {
  if (!script || disabled) {
    return;
  }

  switch (type) {
    case "html":
      // Reset state
      hasHead = false;

      locallyDisabled =
        parseStateProperty(props, EXPLICIT_STATE_PROP)?.tracking?.disable ===
        true;
      props = cloneIfFrozen(props ?? {});
      children ??= props.children;
      const wrapper = createElement(EnsureScript, {
        children,
      });
      props.children = singleOrArray([wrapper], Array.isArray(children));
      return { type, props };

    case "head":
      hasHead = true;
      children ??= props.children;
      const headChildren = getChildArray(children);
      let insertIndex = 0;
      headChildren.forEach((child, index) => {
        if (
          child.type === "title" ||
          (child.type === "meta" &&
            ["description", "charset", "viewport"].includes(child.props.name))
        ) {
          insertIndex = index + 1;
        }
      });

      headChildren.splice(insertIndex, 0, createElement(TrackingScript));

      props = cloneIfFrozen(props);
      props.children = singleOrArray(headChildren, Array.isArray(children));
      return { type, props };
  }
};

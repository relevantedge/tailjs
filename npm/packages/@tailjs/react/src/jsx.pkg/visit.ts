import {
  ComponentProps,
  createElement,
  FunctionComponent,
  PropsWithChildren,
  ComponentType as ReactComponentType,
  ReactNode,
} from "react";

import { tail } from "@tailjs/client/external";

import {
  ExtendedTrackingBoundaryData,
  isEmptyTrackingData,
  TrackingBoundaryData,
  TrackingDataExtensionType,
  updateTrackingData,
} from "@tailjs/types";
import {
  ElementStateMapper,
  ElementType,
  JsxConfiguration,
  StateMapper,
} from "../shared";

import type { TrackingBoundaryType } from "./TrackingBoundary";

const {
  TrackingBoundary,
}: {
  TrackingBoundary: TrackingBoundaryType;
} = require("./TrackingBoundary.js");

const baseTracker = tail;
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

const chainStateMappers = <Extensions extends TrackingDataExtensionType>(
  mappers: StateMapper<Extensions> | StateMapper<Extensions>[]
): StateMapper<Extensions> => {
  if (!Array.isArray(mappers)) {
    return mappers;
  }
  return (currentState, type, props) => {
    let mergedState = currentState;
    for (const mapper of mappers) {
      mergedState =
        updateTrackingData(undefined, mapper(mergedState, type, props)) ??
        mergedState;
    }
    return mergedState === currentState ? undefined : mergedState;
  };
};

let disabled = false;
export const updateConfig: ConfigUpdater = (update: any) => {
  config = update(stateMapper);

  disabled = config?.disabled ?? false;

  if (typeof config?.map === "object" && !Array.isArray(config.map)) {
    stateMapper = chainStateMappers(config.map.state);
    customRef = config.map.ref ?? null;
  } else {
    stateMapper = config?.map ? chainStateMappers(config.map) : null;
    customRef = null;
  }
  script =
    (config?.script as any)?.src || typeof config?.script === "function"
      ? config!.script
      : false;

  const trackJsx = config?.trackJsx ?? false;
  if (trackJsx !== false) {
    const innerMapper = stateMapper;
    stateMapper = (currentState, type, props) => {
      currentState = innerMapper?.(currentState, type, props) ?? currentState;
      if (typeof type === "function") {
        let displayName = trackJsx === true ? type.displayName : trackJsx(type);
        if (displayName) {
          currentState = updateTrackingData(currentState, {
            component: [
              {
                id: displayName,
                name: displayName,
                inferred: true,
                source: "jsx",
              },
            ],
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

export const bindState = (el: any, state: any) => {
  if (customRef?.(tracker, el, state) === false) {
    return;
  }

  const view = state.view;
  if (view) {
    tracker({ set: { scope: "view", key: "view", value: view } });
    delete state.view;
  }

  if (!isEmptyTrackingData(state)) {
    tracker({ boundary: el, ...state });
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

const getStateFromProps = (type: any, props: any) => {
  if (props) {
    let state = parseStateProperty(props, EXPLICIT_STATE_PROP);
    if (stateMapper) {
      const parentState = parseStateProperty(props, PARENT_STATE_PROP);
      const mappedState = updateTrackingData(
        undefined,
        stateMapper(
          parentState,
          isClientComponentReference(type)
            ? { $$typeof: type.$$typeof, $$id: type.$$id }
            : type,
          props
        )
      );
      state = state
        ? updateTrackingData(mappedState, state) ?? parentState
        : mappedState;
    }
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
  } else {
    const state = getStateFromProps(type, props);
    if (state) {
      props = {
        children: singleOrArray([factory(type, props)], true),
        state,
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
    const mapped = mapState(props);
    return mapped
      ? createElement(TrackingBoundary, {
          state: updateTrackingData(null, mapped),
          children: createElement(component, props),
        })
      : createElement(component, props);
  };

let hasHead = false;
const TrackingScript = ({ head }: { head?: boolean }) => {
  if (locallyDisabled || disabled || !script || !script.src) {
    return null;
  }
  const scriptElement = createElement("script", {
    src: script.src,
    async: script.async ?? true,
    ...script.attrs,
  });

  return head
    ? hasHead
      ? undefined
      : createElement("head", {}, scriptElement)
    : scriptElement;
};

const EnsureScript = ({ children }: PropsWithChildren) => {
  const htmlChildren = getChildArray(children);
  const bodyIndex = htmlChildren.findIndex((el) => el.type === "body");
  htmlChildren.splice(
    bodyIndex === -1 ? htmlChildren.length : bodyIndex,
    0,
    // Utilize that react components are rendered depth-first, so our "EnsureHeadScript" component will not be rendered
    // before any preceding components might have created a `<head />` element which we capture in `injectScript`.
    createElement(TrackingScript, { head: true })
  );
  return singleOrArray(htmlChildren);
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
      headChildren.unshift(createElement(TrackingScript));
      props = cloneIfFrozen(props);
      props.children = singleOrArray(headChildren, Array.isArray(children));
      return { type, props };
  }
};

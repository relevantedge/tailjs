import {
  ComponentProps,
  createElement,
  FunctionComponent,
  memo,
  PropsWithChildren,
  ComponentType as ReactComponentType,
} from "react";

import { tail } from "@tailjs/client/external";

import {
  appendTrackingData,
  ExtendedTrackingBoundaryData,
  normalizeTrackingData,
  TrackingBoundaryData,
} from "@tailjs/types";
import {
  ElementStateMapper,
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

let stateMapper: StateMapper | null = null;
let script: JsxConfiguration["script"] | null = null;
let customRef: ElementStateMapper | null = null;

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
            appendTrackingData(undefined, mapper(mergedState, type, props)) ??
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
              components: [
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

const withKey = (el: any, key: string) =>
  el?.key || !key ? el : setProperty(el, "key", key);

const withProp = (obj: any, prop: string, value: any) =>
  obj?.props?.[prop] === value
    ? obj
    : setProperty(obj, "props", setProperty(obj.props ?? {}, prop, value));

const setProperty = <T>(obj: T, name: keyof any, value: any): T => {
  if (obj == null || typeof obj !== "object") {
    return obj;
  }
  if (Object.isFrozen(obj)) {
    if (Array.isArray(obj)) {
      return [...obj] as T;
    }

    if (!(name in (obj as any)) && value == undefined) {
      return obj;
    }

    const clone = {};
    for (const prop of Object.getOwnPropertyNames(obj)) {
      clone[prop] = obj[prop];
    }

    obj = clone as any;
    // // This only happens in debug mode, so the performance overhead doesn't matter in prod.
    // const props = Object.getOwnPropertyDescriptors(obj);
    // for (let prop in props) {
    //   if (props[prop].writable === false) {
    //     props[prop].writable = true;
    //   }
    // }
    // obj = Object.defineProperties({}, props) as T;
  }
  if (value === undefined) {
    delete obj[name];
  } else {
    obj[name] = value;
  }
  return obj;
};

/** This is allowed on all elements/components to explicitly define the boundary data. */
const EXPLICIT_STATE_PROP = "data-tailjs";

const currentElementStates = new WeakMap<Element, any>();
const REACT_BOUNDARY_DATA_KEY = Symbol("react boundary");

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
    state = { ...state, view: undefined };
  }

  tracker({
    boundary: el,
    ...state,
    layer: state.layer ?? REACT_BOUNDARY_DATA_KEY,
  });
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
  children == null
    ? []
    : Array.isArray(children)
    ? [...children.map((child, i) => withKey(child, "__child_" + i))]
    : [withKey(children, "child")];

export const getStateFromProps = (el: any) => {
  if (!el.props) {
    return undefined;
  }
  const { type, props } = el;
  let state = parseStateProperty(props, EXPLICIT_STATE_PROP);
  if (stateMapper && el.type) {
    const mappedState = appendTrackingData(
      undefined,
      stateMapper(
        undefined,
        isClientComponentReference(type)
          ? { $$typeof: type.$$typeof, $$id: type.$$id } // Copy type to free the consumer from handling weird "server can't call client" errors.
          : type,
        props
      )
    );

    state = state ? appendTrackingData(mappedState, state) : mappedState;
  }
  state = normalizeTrackingData(state, true);

  return state;
};

export const visit = (
  factory: (type: any, props: any, key?: any) => any,
  original: any
) => {
  if (disabled || !original?.props) {
    return;
  }

  original = tryInjectScript(factory, original) ?? original;

  if (!stateMapper) {
    return original;
  }

  let state: any;
  if (typeof original.type === "string") {
    if (original.props && EXPLICIT_STATE_PROP in original.props) {
      state = normalizeTrackingData(
        parseStateProperty(original.props, EXPLICIT_STATE_PROP)
      );
      original = withProp(original, EXPLICIT_STATE_PROP, undefined);
      if (state) {
        return withKey(
          factory(TrackingBoundary, {
            state,
            children: [withKey(original, "wrapped")],
          }),
          original.key
        );
      }
    }
  } else if ((original.type as any) !== FRAGMENT_SYMBOL) {
    const state = getStateFromProps(original);
    if (state || isClientComponentReference(original.type)) {
      return withKey(
        factory(TrackingBoundary, {
          state, // Will be undefined if a client component reference without state. In that case we wrap the component to make sure state checks are made client-side.
          children: [withKey(original, "wrapped")],
        }),
        original.key
      );
    }
  }
  return original;
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
    return mapped // Empty object will also create a TrackingBoundary to support state that depends on a parameter (e.g., sometimes returns `{}` sometimes return `{tags: ...}`)
      ? createElement(TrackingBoundary, {
          state: appendTrackingData(null, mapped),
          children: [createElement(component, props)],
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

    return head
      ? createElement("head", {
          children: [withKey(scriptElement, "__tailjs")],
        })
      : scriptElement;
  },
  () => true
);

const EnsureScript = ({ children }: PropsWithChildren) => {
  const htmlChildren = getChildArray(children);
  const bodyIndex = htmlChildren.findIndex((el) => {
    if (el.type === "body") {
      if (
        parseStateProperty(el.props, EXPLICIT_STATE_PROP)?.track?.disable ===
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
  return htmlChildren;
};

let locallyDisabled = false;
const tryInjectScript = (
  factory: (type: any, props: any, key?: any) => any,
  original: any
) => {
  if (!script || disabled) {
    return;
  }

  switch (original.type) {
    case "html":
      // Reset state
      hasHead = false;

      locallyDisabled =
        parseStateProperty(original.props, EXPLICIT_STATE_PROP)?.track
          ?.disable === true;
      const wrapper = factory(EnsureScript, {
        children: getChildArray(original.props?.children),
      });
      return withProp(original, "children", [withKey(wrapper, "wrapped")]);

    case "head":
      hasHead = true;
      const headChildren = getChildArray(original.props?.children ?? []);
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

      headChildren.splice(
        insertIndex,
        0,
        withKey(factory(TrackingScript, {}), "__tailjs")
      );

      return withProp(original, "children", headChildren);
  }
};

import React, {
  ExoticComponent,
  Fragment,
  ReactNode,
  isValidElement,
} from "react";
import { ExcludeRule } from "../rules";

export type Nullish = null | undefined | void;

export let currentContext: TraverseContext | null = null;

const CONTEXT_PROPERTY = Symbol();

type RefFunction = (el: HTMLElement) => void;
export type TraversableElement = JSX.Element & {
  ref?: RefFunction | { current: any };
  /**
   * Check this flag before accessing any other property than `name` and the elements `type` property if in server component context
   * (often the case if using NextJS).
   * The type may be a client module that has not yet been loaded in a server component in which case NextJS will throw
   * a nasty error like "[...] You cannot dot into a client module from a server component".
   *
   * If you have a mix of client and server components, a better options is to use your own component that wraps
   * the Tracker element with its configuration and use the {@link ConfiguredTrackerSettings.clientTracker} property.
   */
  clientTypeReference?: boolean;
};

const isLazy = (type: any) => type._payload;
const isForwardRef = (type: any) => type.render;

export type TraverseResult = TraversableElement | ExoticComponent;

export type MapStateFunction<State = any, Context = any> = (
  el: TraversableElement,
  currentState: State | null,
  traverseContext: TraverseContext<State, Context>
) => State | null;

export type PatchPropertiesFunction<State = any, Context = any> = (
  el: TraversableElement,
  parentState: State | null,
  currentState: State | null,
  context: Context
) =>
  | { ref?: RefFunction; props?: Record<string, any>; state?: State | null }
  | void
  | false;

export type ComponentRefreshedFunction<State = any, Context = any> = (
  type: any,
  state: State | null,
  props: Record<string, any>,
  context: Context
) => void;

export type ParseOverrideFunction = (
  el: TraversableElement,
  traverse: (el: TraversableElement) => TraversableElement
) => TraverseResult | void | false;

export interface TraverseFunctions<T, C> {
  mapState: MapStateFunction<T, C>;
  patchProperties?: PatchPropertiesFunction<T, C>;
  componentRefreshed?: ComponentRefreshedFunction<T, C>;
  /** Hook for custom parsing of certain elements if required. */
  parse?: ParseOverrideFunction;
  ignoreType?: ExcludeRule;
}

export interface TraverseOptions<T, Context>
  extends TraverseFunctions<T, Context> {
  initialState?: T;
  context?: Context;
}

export interface TraverseContext<T = any, C = any>
  extends TraverseFunctions<T, C> {
  state: T | null;
  el: TraversableElement;
  parent: TraverseContext<T, C> | null;
  context: C;
  depth: number;
  debug?: boolean;

  /** The current React component containing the context's node.  */
  component?: TraversableElement | null;

  clientComponentContext?: boolean;
}

// Potentially have a look at what the React Dev tool extension does.
// The code in this file is significantly shorter, but also a little bit "heuristic".
//
// If anything turns out to fail, we can start looking into porting the Dev tool approach:
// https://github.com/facebook/react-devtools/blob/v3/backend/attachRendererFiber.js

const createInitialContext = <T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
): TraverseContext<T, C> => ({
  ...options,
  state: options.initialState ?? null,
  el: node! as TraversableElement,
  parent: null,
  component: null,
  context: options.context as any,
  depth: 0,
});

export const traverseNodes = <T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
) => traverseNodesInternal(node, createInitialContext(node, options));

const componentCache = new WeakMap<any, any>();
function getOrSet<K, V>(
  map: { get: (key: K) => V | undefined; set: (key: K, value: V) => any },
  key: K,
  factory: () => V
) {
  let current = map.get(key);
  if (current === undefined) {
    map.set(key, (current = factory()));
  }
  return current;
}

const isTraversable = (el: any): el is TraversableElement =>
  el && (Array.isArray(el) || isValidElement(el) || isLazy(el));

function mergeProperties(
  target: any,
  source: any,
  overwrite: Record<string, boolean> = { name: true }
) {
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
}

function createChildContext<T, C>(
  el: TraversableElement,
  parentContext: TraverseContext<T, C>
) {
  let state = parentContext.mapState(
    // Make sure there are props, to allow destructuring without weird edge case undefined errors.
    el.props ? el : { ...el, props: {} },
    parentContext.state,
    parentContext
  );

  const component =
    typeof el.type === "function" ? el : parentContext.component;

  const childContext: TraverseContext<T, C> = {
    ...parentContext,
    state,
    el,
    parent: parentContext as any,
    depth: parentContext.depth + 1,
    component,
  };

  const patched = parentContext.patchProperties?.(
    el,
    parentContext.state,
    state,
    parentContext.context
  );

  if (patched === false) {
    // Do not traverse the element further.
    return undefined;
  } else if (patched) {
    if (patched.state) {
      childContext.state = patched.state;
    }
    if (patched.props || patched.ref) {
      const currentRef = el.ref;
      const patchedRef = patched.ref;
      childContext.el = {
        ...el,
        props: patched.props ?? el.props,
        ref: patchedRef
          ? currentRef // Combine the current and new refs
            ? typeof currentRef === "function"
              ? (el) => (patchedRef(el), currentRef(el))
              : ({
                  get current() {
                    return currentRef.current;
                  },
                  set current(el) {
                    patchedRef(el);
                    currentRef.current = el;
                  },
                } as any)
            : patchedRef
          : currentRef,
      };
    }
  }

  return childContext;
}

const mapCache = new WeakMap<any, any>();
export function traverseNodesInternal<T, C>(
  node: ReactNode,
  context: TraverseContext<T, C> | Nullish
) {
  if (!context || !isTraversable(node)) {
    return node;
  }

  // We do this caching because portals and similar may otherwise cause infinite loops
  let mapped = mapCache.get(node);
  if (mapped) {
    return mapped;
  }

  if (Array.isArray(node)) {
    mapCache.set(
      node,
      (mapped = node.map((node) => traverseNodesInternal(node, context)))
    );
    return mapped;
  }

  mapCache.set(node, (mapped = inner(node, context)));

  return mapped;

  function inner(
    el: TraversableElement,
    parentContext: TraverseContext
  ): TraverseResult {
    if (parentContext.ignoreType?.((node as any)?.type)) {
      return el;
    }

    if (el.type === Fragment) {
      // A group of elements. Traverse as if it was an array.
      return {
        ...el,
        props: {
          ...el.props,
          children: traverseNodesInternal(el.props.children, parentContext),
        },
      };
    }

    if (parentContext.parse) {
      // Check for parse overrides (e.g. child components in NextJs)
      const parsed = parentContext.parse(el, (el) =>
        traverseProps(el, parentContext)
      );
      if (parsed) {
        return parsed;
      }
    }

    if (isLazy(el)) {
      // A React.lazy is also valid as an element itself.
      return traverseLazy(el, true, parentContext);
    }

    const childContext = createChildContext(el, parentContext);
    if (!childContext) {
      return el;
    }
    el = childContext.el;

    const wrapped = wrapType(el.type, parentContext);

    if (wrapped) {
      return {
        ...el,
        props: { ...el.props, [CONTEXT_PROPERTY]: childContext },
        type: wrapped,
      };
    }

    return traverseProps(el, parentContext);
  }
}

const traverseLazy = (
  lazy: any,
  forElement: boolean,
  context: TraverseContext
) => {
  // A lazy can both be used as a replacement for a type and an element.
  // The latter case seems to be the only situation where react allows something that is not
  // {type, props, ...} like.
  return getOrSet(componentCache, lazy, () => {
    const replaceValue = () => {
      const value = lazy._payload.value;
      if (forElement) {
        lazy._payload.value = traverseNodesInternal(value, context);
      } else if (!context.ignoreType?.(value)) {
        const wrapped = wrapType(value, context);
        if (!wrapped) {
          lazy._payload.value = ({ [CONTEXT_PROPERTY]: context }: any = {}) =>
            traverseNodesInternal(value, context);
        } else {
          lazy._payload.value = (props) => {
            return traverseNodesInternal(
              React.createElement(value, props),
              props[CONTEXT_PROPERTY]
            );
          };
        }
      }
    };
    if (lazy._payload.status === "fulfilled") {
      replaceValue();
    } else {
      lazy._payload.then(replaceValue);
    }

    return lazy;
  });
};

const ignoreType = (type: any, context: TraverseContext) =>
  !type || context.ignoreType?.(type);

const IS_WRAPPED = Symbol();
function wrapType(type: any, context: TraverseContext) {
  if (ignoreType(type, context)) {
    return;
  }

  if (type[IS_WRAPPED]) {
    return type;
  }

  const wrapped = inner();
  if (wrapped) {
    wrapped[IS_WRAPPED] = true;
    return wrapped;
  }

  function inner() {
    if (
      (React.Component && type.prototype instanceof React.Component) ||
      type.prototype?.render
    ) {
      return getOrSet(componentCache, type, () =>
        mergeProperties(
          class extends type {
            render() {
              return wrapRender(type, this.props, (props) =>
                super.render(props)
              );
            }
          },
          type
        )
      );
    } else if (typeof type === "function") {
      return getOrSet(componentCache, type, () =>
        mergeProperties((props: any) => wrapRender(type, props), type)
      );
    }
    if (isLazy(type)) {
      return traverseLazy(type, false, context);
    } else if (type?.type) {
      // Memo
      return getOrSet(componentCache, type, () =>
        mergeProperties({ type: wrapType(type.type, context) ?? type }, type)
      );
    } else if (isForwardRef(type)) {
      // Forward ref.
      return getOrSet(componentCache, type, () =>
        React.forwardRef(
          ({ [CONTEXT_PROPERTY]: context, ...props }: any = {}, ref: any) =>
            traverseNodesInternal(type.render(props, ref), context)
        )
      );
    }
  }
}

function wrapRender(
  type: any,
  props: any = {},
  inner: (props: any) => any = type
) {
  let context = props[CONTEXT_PROPERTY] as TraverseContext;

  // Get context from the injected properties.
  // Also, remove it before the props are passed to the wrapped component lest it gets confused by an extra, unexpected property.
  if (!context) {
    return inner.call(type, props);
  }

  // if (context.el.type !== type) {
  //   context = createChildContext({ ...context.el, type }, context.parent!)!;
  // }

  if (context.state != null) {
    context.componentRefreshed?.(type, context.state, props, context.context);
  }

  let innerResult = inner.call(type, props);

  const render = (innerResult: any) => {
    try {
      return traverseNodesInternal(innerResult, context);
    } catch (e) {
      console.error("traverseNodesInternal failed: ", e);
    }
  };

  return innerResult?.then ? innerResult.then(render) : render(innerResult);
}

const traversePropValue = (value: any, context: TraverseContext) =>
  isTraversable(value)
    ? traverseNodesInternal(value, context)
    : typeof value === "function"
    ? (...args: any) => traversePropValue(value(...args), context)
    : value;

const traverseProps = (el: any, context: TraverseContext) =>
  el.props
    ? {
        ...el,
        props: Object.fromEntries(
          Object.entries(el.props).map(([key, value]) => [
            key,
            traversePropValue(value, context),
          ])
        ),
      }
    : el;

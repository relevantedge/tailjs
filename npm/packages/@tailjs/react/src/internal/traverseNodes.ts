import React, {
  ExoticComponent,
  Fragment,
  FunctionComponent,
  PropsWithChildren,
  ReactNode,
  isValidElement,
  useEffect,
} from "react";
import { Tracker } from "../Tracker";

export let currentContext: TraverseContext | null = null;

const CONTEXT_PROPERTY = Symbol();

type Ref = (el: HTMLElement) => void;
export type TraversableElement = JSX.Element & {
  ref?: Ref;
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

export const LAZY_SYMBOL = React.lazy((() => {}) as any)?.["$$typeof"];

export type TraverseResult = TraversableElement | ExoticComponent;

export type ConfiguredTrackerComponent = FunctionComponent<
  PropsWithChildren<{ clientSide?: boolean; root?: boolean }>
>;

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
  | { ref?: Ref; props?: Record<string, any>; state?: State | null }
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
  ignoreType?: (type: any) => boolean | void;
}

export interface TraverseOptions<T, Context>
  extends TraverseFunctions<T, Context> {
  initialState?: T;
  context?: Context;
}

export interface TraverseContext<T = any, C = any, N = ReactNode>
  extends TraverseFunctions<T, C> {
  state: T | null;
  node: N;
  parent: TraverseContext<T, C, TraversableElement> | null;
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
  node,
  parent: null,
  component: null,
  context: options.context as any,
  depth: 0,
});

export const traverseNodes = <T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
) => traverseNodesInternal(node, createInitialContext(node, options));

// This is the (seemingly) best way to detect context components in Preact since they are functional components
// without any other obvious traits.
// It is not an issue in React where they are `$$typeof: Symbol(react.provider)`,
// that is, neither component classes nor functional components, and will then just get their children traversed.
const frameworkComponents = /ErrorBoundary|Provider|Switch|[a-z_]*Context/gi;

const wrapperTypeKind = Symbol("typeKind");

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

function wrapType(
  type: any,
  context: TraverseContext
): [kind: number, type: any] {
  if (
    context.ignoreType?.(type) ||
    type === Tracker ||
    (type.displayName || type.name)?.match(frameworkComponents)
  ) {
    return [2, type];
  }

  const wrappedTypeKind = type[wrapperTypeKind];
  if (wrappedTypeKind != null) return [wrappedTypeKind, type];

  let wrapper: any;
  let typeKind = 2;
  if (type.$$typeof === LAZY_SYMBOL) {
    typeKind = 1;

    wrapper = type;

    type._payload.then(() => {
      let resolvedType = type._payload.value;
      const wrapped = wrapType(resolvedType, context)[1];
      wrapped.default = wrapped;
      // We need to do it this way. Returning a new React.lazy based on the current's payload
      // results in some weird errors caused to double rendering.
      // The specific lazy component must have some special meaning deep inside NextJs and React's stomachs.
      type._payload.value = wrapped;
    });
  } else if (
    (React.Component && type.prototype instanceof React.Component) ||
    type.prototype?.render
  ) {
    typeKind = 0;

    wrapper = getOrSet(
      componentCache,
      type,
      () =>
        class extends type {
          render() {
            return wrapRender(type, this.props, (props) => super.render(props));
          }
        }
    );
    mergeProperties(wrapper, type);
  } else if (typeof type === "function") {
    typeKind = 1;
    wrapper = getOrSet(
      componentCache,
      type,
      () => (props: any) => wrapRender(type, props, type.render ?? type)
    );
    mergeProperties(wrapper, type);
  } else if (typeof type.render === "function") {
    const wrapped = type.render;
    wrapper = getOrSet(componentCache, type, () => ({
      ...type,
      render: (props: any, ref: any) =>
        props[CONTEXT_PROPERTY]
          ? traverseNodesInternal(wrapped(props, ref), props[CONTEXT_PROPERTY])
          : wrapped(props, ref),
    }));
  }
  if (wrapper) {
    wrapper[wrapperTypeKind] = typeKind;

    return [typeKind, wrapper];
  }

  return [2, type];
}

function wrapRender(type: any, props: any, inner: (props: any) => any) {
  // Get context from the injected properties.
  // Also, remove it before the props are passed to the wrapped component lest it gets confused by an extra, unexpected property.
  let { [CONTEXT_PROPERTY]: context, ...rest } = props;
  if (!context) {
    return inner.call(type, rest);
  }

  if (context.state != null) {
    context.componentRefreshed?.(type, context.state, rest, context.context);
  }

  let innerResult = inner.call(type, rest);

  try {
    currentContext = context;
    return traverseNodesInternal(innerResult, context);
  } catch (e) {
    console.error("traverseNodesInternal failed: ", e);
  } finally {
    currentContext = null;
  }
}

function isTraversable(el: ReactNode): el is TraversableElement {
  return isValidElement(el);
}

function mergeProperties(target: any, source: any, overwrite = true) {
  for (const [name, value] of Object.entries(
    Object.getOwnPropertyDescriptors(source)
  )) {
    if (!overwrite && target[name]) return;

    if (Object.getOwnPropertyDescriptor(target, name)?.configurable === false) {
      continue;
    }
    Object.defineProperty(target, name, { ...value, configurable: true });
  }
}

const mapCache = new WeakMap<any, any>();
export function traverseNodesInternal<T, C>(
  node: ReactNode,
  context: TraverseContext<T, C>
) {
  if (
    (node as any)?.type === Tracker ||
    !node ||
    context.ignoreType?.((node as any)?.type)
  ) {
    // Trackers do not traverse Trackers.
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

  if (!isTraversable(node)) {
    return node;
  }

  mapped = inner(node);
  mapCache.set(node, mapped);

  return mapped;

  function inner(el: TraversableElement): TraverseResult {
    if (context.parse) {
      const parsed = context.parse(el, (el) =>
        traverseNodesInternal(el, context)
      );
      if (parsed) {
        return parsed;
      }
    }

    let currentState = context.mapState(el, context.state, context);

    const component = typeof el.type === "function" ? el : context.component;

    const newContext: TraverseContext<T, C> = {
      ...context,
      state: currentState,
      node,
      parent: context as any,
      depth: context.depth + 1,
      component,
    };

    if (el.type === Fragment) {
      return {
        ...el,
        props: {
          ...el.props,
          children: traverseNodesInternal(el.props.children, newContext),
        },
      };
    }

    const patched = context.patchProperties?.(
      el,
      context.state,
      currentState,
      context.context
    );

    if (patched === false) {
      return el;
    } else if (patched) {
      if (patched.state) {
        newContext.state = patched.state;
      }
      if (patched.props || patched.ref) {
        const [currentRef, patchedRef] = [el["ref"], patched.ref];
        el = {
          ...el,
          props:
            patched.props && patched.props !== el.props
              ? patched.props
              : el.props,
          ref: patchedRef
            ? currentRef
              ? typeof currentRef === "function"
                ? (el) => (patchedRef(el), currentRef(el))
                : ({
                    get current() {
                      return (currentRef as any).current;
                    },
                    set current(el) {
                      patchedRef(el);
                      (currentRef as any).current = el;
                    },
                  } as any)
              : patchedRef
            : currentRef,
        };
      }
    }

    const [kind, type] = wrapType(el.type, context);

    switch (kind) {
      case 0: // Class component
      case 1: // Function component
        return {
          ...el,
          props: { ...el.props, [CONTEXT_PROPERTY]: newContext },
          type,
        };

      default:
        if (el.props.value && isValidElement(el.props.value)) {
          // A context provider may have an element as its value.
          // If so, traverse it.
          el = {
            ...el,
            props: {
              ...el.props,
              value: traverseNodes(el.props.value, context),
            },
          };
        }
        const children = el.props?.children;
        let memoProps: any;

        let memoType = el.type?.type;
        if (memoType) {
          const [kind, type] = wrapType(memoType, context);

          if (kind <= 1) {
            memoProps = {
              type,
              props: { ...el.props, [CONTEXT_PROPERTY]: newContext },
            };
          }
        }

        return children
          ? {
              ...el,
              ...memoProps,
              props: {
                ...el.props,
                children:
                  typeof children === "function"
                    ? (...args: any) =>
                        traverseNodesInternal(
                          children.apply(el, args),
                          newContext
                        )
                    : traverseNodesInternal(children, newContext),
              },
            }
          : memoProps
          ? { ...el, ...memoProps }
          : el;
    }
  }
}

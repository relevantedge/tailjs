import React, { isValidElement, ReactNode, Fragment } from "react";

export let currentContext: TraverseContext | null = null;
const sourceNode = Symbol("tail_source");

const CONTEXT_PROPERTY = Symbol(); //"__traverse_ctx";

type Ref = (el: HTMLElement) => void;
export type TraversableElement = JSX.Element & {
  ref?: Ref;
  [sourceNode]?: any;
};

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

export interface TraverseFunctions<T, C> {
  mapState: MapStateFunction<T, C>;
  patchProperties?: PatchPropertiesFunction<T, C>;
  componentRefreshed?: ComponentRefreshedFunction<T, C>;
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
}

const createInitialContext = <T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
): TraverseContext<T, C> => ({
  ...options,
  state: options.initialState ?? null,
  node,
  parent: null,
  context: options.context as any,
  depth: 0,
});

export function traverseNodes<T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
) {
  return traverseNodesInternal(node, createInitialContext(node, options));
}

// This is the (seemingly) best way to detect context components in Preact since they are functional components
// without any other obvious traits.
// It is not an issue in React where they are `$$typeof: Symbol(react.provider)`,
// that is, neither component classes nor functional components, and will then just get their children traversed.
const preactFrameworkComponents = new Set(["Provider", "Consumer"]);

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
function wrapType(type: any) {
  if (preactFrameworkComponents.has(type.name)) {
    return [2, type];
  }
  const wrappedTypeKind = type[wrapperTypeKind];
  if (wrappedTypeKind != null) return [wrappedTypeKind, type];

  let wrapper: any;
  let typeKind = 2;

  if (type.prototype instanceof React.Component || type.prototype?.render) {
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
  } else if (typeof type === "function") {
    typeKind = 1;
    wrapper = getOrSet(
      componentCache,
      type,
      () => (props: any) => wrapRender(type, props, type.render ?? type)
    );
  } else if (typeof type.render === "function") {
    const wrapped = type.render;
    return [
      1,
      {
        ...type,
        render: (props: any, ref: any) =>
          props[CONTEXT_PROPERTY]
            ? traverseNodesInternal(
                wrapped(props, ref),
                props[CONTEXT_PROPERTY]
              )
            : wrapped(props, ref),
      },
    ];
  }
  if (wrapper) {
    wrapper[wrapperTypeKind] = typeKind;
    mergeProperties(wrapper, type);

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

function mergeProperties(target: any, source: any) {
  for (const [name, value] of Object.entries(
    Object.getOwnPropertyDescriptors(source)
  )) {
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

  mapCache.set(node, (mapped = inner(node)));
  return mapped;

  function inner(el: TraversableElement) {
    let currentState = context.mapState(el, context.state, context);

    const newContext: TraverseContext<T, C> = {
      ...context,
      state: currentState,
      node,
      parent: context as any,
      depth: context.depth + 1,
    };
    if (el.type === Fragment) {
      return {
        ...el,
        [sourceNode]: el,
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

    const [kind, type] = wrapType(el.type);

    switch (kind) {
      case 0: // Class component
      case 1: // Function component
        return {
          ...el,
          [sourceNode]: el,
          props: { ...el.props, [CONTEXT_PROPERTY]: newContext },
          type,
        };

      default:
        const children = el.props?.children;
        let memoProps: any;

        let memoType = el.type?.type;
        if (memoType) {
          const [kind, type] = wrapType(memoType);

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
              [sourceNode]: el,
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
          ? { ...el, [sourceNode]: el, ...memoProps }
          : el;
    }
  }
}

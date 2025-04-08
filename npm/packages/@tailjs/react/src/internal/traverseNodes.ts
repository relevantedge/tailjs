import { forEach2 } from "@tailjs/util";
import React, {
  ExoticComponent,
  Fragment,
  isValidElement,
  ReactNode,
} from "react";
import { ExcludeRule } from "../rules";

export type Nullish = null | undefined | void;

export let currentContext: TraverseContext | null = null;

const CONTEXT_PROPERTY = "__t$ctx";
const IS_WRAPPED = "__t$wrp";

export type RefFunction = (el: Element) => void;
export type TraversableElement = JSX.Element & {
  ref?: any;
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

const USE_REF = !(parseInt(React.version?.split(".")[0]) >= 19);

export type TraverseResult = TraversableElement | ExoticComponent;

export type MapStateFunction<State = any> = (
  el: TraversableElement,
  currentState: State | null,
  traverseContext: TraverseContext<State>
) => State | null;

export type PatchPropertiesFunction<State = any> = (
  el: TraversableElement,
  parentState: State | null,
  currentState: State | null
) =>
  | {
      mappedElementState?: State;
      props?: Record<string, any>;
      state?: State | null;
    }
  | void
  | false;

export type ComponentRefreshedFunction<State = any> = (
  type: any,
  state: State | null,
  props: Record<string, any>
) => void;

export type TraverseOverrideFunction<T> = (
  el: TraversableElement,
  state: T
) => TraverseResult | void | false;

export type MapElementStateFunction<State> = (
  el: HTMLElement,
  state: State
) => void;

export interface TraverseFunctions<T> {
  mapElementState: MapStateFunction<T>;
  patchProperties?: PatchPropertiesFunction<T>;
  componentRefreshed?: ComponentRefreshedFunction<T>;
  /** Hook for custom traversal of certain elements if required. */
  traverse?: TraverseOverrideFunction<T>;
  ignoreType?: ExcludeRule;
  applyElementState?: MapElementStateFunction<T>;
}

export interface TraverseOptions<T> extends TraverseFunctions<T> {
  initialState?: T;
}

export type ElementStateMapping<T = any> = {
  id: string;
  state: T;
  clearId?: boolean;
};

export interface RootTraverseContext<T = any> extends TraverseFunctions<T> {
  state: T | null;
  el: TraversableElement;
}

export interface TraverseContext<T = any> {
  state: T | null;
  el: TraversableElement;
  root: RootTraverseContext<T>;
  parent: TraverseContext<T> | null;
  depth: number;
  additionalProperties?: Record<string, any>;
  debug?: boolean;

  /**
   * A value here will be mapped to {@link el} (always an HTML element) via {@link TraverseFunctions.applyElementState}
   */
  mappedState?: T;

  /**
   * If the state cannot be mapped to an HTML element (e.g. because a ref that cannot be updated, it is pushed to its child elements)
   */
  pendingElementState?: T;

  componentContext: TraverseContext;
  clientComponentContext?: boolean;
}

const createRootContext = <T>(
  node: ReactNode,
  options: TraverseOptions<T>
): TraverseContext<T> => {
  const root: RootTraverseContext = {
    ...options,
    state: options.initialState ?? null,
    el: node! as TraversableElement,
  };
  return {
    root,
    state: root.state,
    parent: null,
    depth: 0,
    el: root.el,
    componentContext: null!,
  };
};

export const traverseNodes = <T>(
  node: ReactNode,
  options: TraverseOptions<T>
) => {
  const context = createRootContext(node, options);
  context.componentContext = context;
  return traverseNodesInternal(node, context);
};

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

function createChildContext<T>(
  el: TraversableElement,
  context: TraverseContext<T>
) {
  const root = context.root;
  let childState = root.mapElementState(
    // Make sure there are props, to allow destructuring without weird edge case undefined errors.
    el.props ? el : { ...el, props: {} },
    context.state,
    context
  );

  const childContext: TraverseContext<T> = {
    ...context,
    mappedState: undefined,
    pendingElementState: undefined,
    state: childState,
    el,
    parent: context as any,
    depth: context.depth + 1,
  };

  const patched = context.root.patchProperties?.(el, context.state, childState);

  if (patched === false) {
    // Do not traverse the element further.
    return undefined;
  }

  const mappedElementState =
    patched?.mappedElementState ?? context.pendingElementState;
  if (patched) {
    if (patched.state) {
      childContext.state = patched.state;
    }
    childContext.additionalProperties = patched.props;
  }
  if (mappedElementState) {
    if (!canHaveElementState(el)) {
      childContext.pendingElementState = mappedElementState;
    } else {
      childContext.mappedState = mappedElementState;
    }
  }

  return childContext;
}

const canHaveElementState = (el: TraversableElement) =>
  typeof el.type === "string" &&
  !el.clientTypeReference &&
  !(USE_REF ? el.ref : el.props.ref);

const mapCache = new WeakMap<any, any>();
export function traverseNodesInternal<T>(
  node: ReactNode,
  context: TraverseContext<T>
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
    const root = parentContext.root;
    if (root.ignoreType?.((node as any)?.type)) {
      return el;
    }

    if (el.type === Fragment) {
      // A group of elements. Traverse as if it was an array.
      return traverseProps(el, parentContext);
    }

    if (root.traverse) {
      // Check for parse overrides (e.g. child components in NextJs)
      const parsed = root.traverse(el, parentContext.state);
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
    const wrappedType = wrapType(el.type, parentContext);
    if (wrappedType) {
      childContext.componentContext = childContext;
      return {
        ...el,
        props: { ...el.props, [CONTEXT_PROPERTY]: childContext },
        type: wrappedType,
      };
    }

    return traverseProps(el, parentContext, childContext);
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
      } else if (!context.root.ignoreType?.(value)) {
        const wrapped = wrapType(value, context);
        if (!wrapped) {
          lazy._payload.value = () => traverseNodesInternal(value, context);
        } else {
          lazy._payload.value = (
            props: any // CONTEXT_PROPERTY is here for the wrapped.
          ) => {
            return React.createElement(wrapped, props);
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
  !type || context.root.ignoreType?.(type);

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
    if (isForwardRef(type)) {
      // Check on type.render. Do this before classes.
      // Forward ref.
      return getOrSet(componentCache, type, () =>
        React.forwardRef(
          ({ [CONTEXT_PROPERTY]: context, ...props }: any = {}, ref: any) =>
            traverseNodesInternal(type.render(props, ref), context)
        )
      );
    }

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
    }
    if (typeof type === "function") {
      return getOrSet(componentCache, type, () =>
        mergeProperties((props: any) => wrapRender(type, props), type)
      );
    }
    if (isLazy(type)) {
      return traverseLazy(type, false, context);
    }
    if (type?.type) {
      // Memo
      return getOrSet(componentCache, type, () =>
        mergeProperties({ type: wrapType(type.type, context) ?? type }, type)
      );
    }
  }
}

function wrapRender(
  type: any,
  { [CONTEXT_PROPERTY]: context, ...props }: any = {},
  inner: (props: any) => any = type
) {
  // Get context from the injected properties.
  // Also, remove it before the props are passed to the wrapped component lest it gets confused by an extra, unexpected property.
  if (!context) {
    return inner.call(type, props);
  }
  if (context.state != null) {
    context.root.componentRefreshed?.(type, context.state, props);
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

const traverseProps = (
  el: TraversableElement,
  parentContext: TraverseContext,
  currentContext?: TraverseContext
) => {
  let patched = currentContext?.additionalProperties;
  if (typeof el.type === "string") {
    parentContext = currentContext!;
  }
  forEach2(el.props, ([key, value]) => {
    const traversed = traversePropValue(value, parentContext);
    if (traversed !== value) {
      (patched ??= {})[key] = traversed;
    }
  });

  let ref = USE_REF ? el.ref : undefined;
  if (
    typeof window !== "undefined" &&
    canHaveElementState(el) &&
    currentContext?.mappedState &&
    typeof el.type === "string"
  ) {
    let current: any;
    patched ??= {};
    ref = (el: HTMLElement) => {
      if (!el || el === current) {
        return;
      }
      current = el;
      parentContext.root.applyElementState?.(el, currentContext.mappedState);
    };
  }
  if (patched) {
    const props = { ...el.props, ...patched };
    // Seems like `children` and `dangerouslySetInnerHTML` may sometimes be assigned as `null` or `undefined`,
    // which makes React choke on e.g. images or because both are "set". React looks for keys in props, not  values.
    // It is unclear why this should give an error when using the spread operator to clone the element, yet, it does.
    if (!props.children && "children" in props) {
      delete props.children;
    }
    if (!props.dangerouslySetInnerHTML && "dangerouslySetInnerHTML" in props) {
      delete props.dangerouslySetInnerHTML;
    }

    el = { ...el, props };
    ref && ((USE_REF ? el : el.props).ref = ref);
  }
  return el;
};

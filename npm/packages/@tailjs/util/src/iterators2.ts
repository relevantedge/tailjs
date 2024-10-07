import { isArray, UnionToIntersection } from ".";

// Faster versions of map and forEach. The others are a bit "muddy".
// Here we assign a designated iterator to an object's prototype in the hope V8 megamorphism are less likely to kick in.

let stopInvoked = false;

export const stop2 = <T>(value?: T) => ((stopInvoked = true), value);

const symbolIterator = Symbol.iterator;
const throwError = function (e: string) {
  throw new Error(e);
};
export const TRUISH = <T>(item: T) => item || undefined;

const forEachFunction = Symbol();

type Nullish = null | undefined | void;

type ItFunction2<T, S, R> = (
  item: T,
  index: number,
  previous?: S
) => R | readonly [any, any] | undefined | void;

type ForEachFunction = (
  target: any,
  projection: ItFunction2<any, any, any> | undefined,
  mapped?: any[]
) => any;

type KeyValues<T> = { [P in keyof T]: [P, T[P]] }[keyof T];

type ItItem<T> = T extends Nullish
  ? never
  : T extends Iterable<infer T>
  ? T
  : T extends number
  ? number
  : T extends (current?: any) => infer R
  ? R
  : KeyValues<T>;

type ItProjection<R> = R extends undefined | void ? never : R;

type ItSource<T = any> =
  | object
  | number
  | ((current: T) => T)
  | Iterable<T>
  | Nullish;

type Kv2 = readonly [keyof any | undefined, any];

type Obj2<KeyValues extends Kv2 | Nullish> = UnionToIntersection<
  KeyValues extends readonly [infer Key extends keyof any, infer Value]
    ? { [P in Key]: Value }
    : {}
> extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

type Obj2Source =
  | { [P in keyof any]: any }
  | Iterable<readonly [keyof any | undefined, any]>
  | Nullish;

type OptionalKeys<T, K extends keyof T = keyof T> = K extends keyof any
  ? T extends { [P in K]: unknown }
    ? never
    : K
  : never;

type Merge2<
  T1,
  T2,
  O1 extends keyof T1 = OptionalKeys<T1>,
  O2 extends keyof T2 = OptionalKeys<T2>,
  R1 extends keyof T1 = Exclude<keyof T1, O1>,
  R2 extends keyof T2 = Exclude<keyof T2, O2>
> = {
  // Optional in T1.If optional in T2, it can be either.
  [P in Exclude<O1, R2>]?: P extends keyof T2 ? T1[P] | T2[P] : T1[P];
} & {
  // Required in T1. If optional in T2 it can be either.
  [P in Exclude<R1, R2>]: P extends keyof T2 ? T1[P] | T2[P] : T1[P];
} & {
  // Optional in T2, not already handled above.
  [P in Exclude<O2, keyof T1>]?: T2[P];
} & {
  // In T2, not optional or not in T1
  [P in R2]: T2[P];
};

type Obj2SourceToObj<T> = T extends Nullish
  ? {}
  : T extends Iterable<infer Kv extends Kv2>
  ? Obj2<Kv>
  : T;

type MergeObj2Sources<
  S extends readonly any[],
  Merged = {}
> = S extends readonly [infer T, ...infer Rest]
  ? T extends infer T
    ? MergeObj2Sources<Rest, Merge2<Merged, Obj2SourceToObj<T>>>
    : never
  : Merged;

const forEachIterable2: () => ForEachFunction =
  () => (target, projection, mapped) => {
    let projected: any,
      i = 0,
      seed: any;
    for (const item of target) {
      if (
        (projected = projection ? projection(item, i++, seed) : item) !==
        undefined
      ) {
        seed = projected;
        if (mapped) mapped.push(projected);
      }
      if (stopInvoked) {
        stopInvoked = false;
        break;
      }
    }
    return mapped || seed;
  };

const forEachKeyValue2: () => ForEachFunction =
  () => (target, projection, mapped) => {
    let projected: any,
      item: any,
      i = 0,
      seed: any;
    for (const key in target) {
      item = [key, target[key]];
      if (
        (projected = projection ? projection(item, i++, seed) : item) !==
        undefined
      ) {
        seed = projected;
        if (mapped) mapped.push(projected);
      }
      if (stopInvoked && !(stopInvoked = false)) break;
    }
    return mapped || seed;
  };

const forEachArray2: () => ForEachFunction =
  () => (target: any[], projection, mapped) => {
    let projected: any, item: any, seed: any;
    for (let i = 0, n = target.length; i < n; i++) {
      item = target[i];
      if (
        (projected = projection ? projection(item, i, seed) : item) !==
        undefined
      ) {
        seed = projected;
        if (mapped) mapped.push(projected);
      }
      if (stopInvoked && !(stopInvoked = false)) break;
    }
    return mapped || seed;
  };

export function* range2(length: number) {
  for (let i = 0; i < length; i++) yield i;
}

export function* traverse2(next: (current: any) => any) {
  let item: any = undefined;
  while ((item = next(item)) !== undefined) yield item;
}

const createForEachFunction = (target: any): ForEachFunction => {
  let it1: any, it2: any;
  return target.constructor === Array
    ? forEachArray2()
    : target.constructor === Object
    ? ((it1 = forEachIterable2()),
      (it2 = forEachKeyValue2()),
      (target, projection, mapped) =>
        (target.constructor === Object
          ? symbolIterator in target
            ? it1
            : it2
          : assignForEach(target))(target, projection, mapped))
    : typeof target === "number"
    ? ((it1 = forEachIterable2()),
      (target, projection: any, mapped) =>
        it1(range2(target), projection, mapped))
    : typeof target === "function"
    ? ((it1 = forEachIterable2()),
      (target, projection: any, mapped) =>
        it1(traverse2(target), projection, mapped))
    : typeof target === "object"
    ? symbolIterator in target
      ? forEachIterable2()
      : forEachKeyValue2()
    : () => {};
};

const assignForEach = (target: any) =>
  (Object.getPrototypeOf(target)[forEachFunction] =
    createForEachFunction(target));

export const filter2: {
  <It extends ItSource, T, R = ItItem<It>, S extends R | unknown = unknown>(
    target: It | ItSource<T>,
    filter?: ItFunction2<ItItem<It>, S, R>
  ): R extends Nullish ? R : ItProjection<R>[];
} = (items, filter) =>
  map2(
    items,
    filter
      ? (item, index, prev) => filter(item, index, prev as any) || undefined
      : TRUISH
  );

export const map2: {
  <It extends ItSource, T, R = ItItem<It>, S extends R | unknown = unknown>(
    target: It | ItSource<T>,
    projection?: ItFunction2<ItItem<It>, S, R>
  ): R extends Nullish ? R : ItProjection<R>[];
} = (target: any, projection?: any) =>
  target != null
    ? (target[forEachFunction] || assignForEach(target))(target, projection, [])
    : target;

export const obj2: {
  <It extends Obj2Source>(source: It | ItSource): It extends Nullish
    ? It
    : Obj2SourceToObj<It>;
  <It extends ItSource, T, R extends Kv2, S extends R>(
    source: It | ItSource<T>,
    projection: ItFunction2<ItItem<It>, S, R>
  ): It extends Nullish ? It : Obj2<ItProjection<R>>;
  <It extends ItSource, T, R extends Kv2, S extends R, Target>(
    source: It | ItSource<T>,
    projection: ItFunction2<ItItem<It>, S, R>,
    target: Target
  ): It extends Nullish
    ? Target
    : Merge2<
        Target extends undefined ? {} : Target,
        Obj2<ItProjection<R>>
      > extends infer T
    ? { [P in keyof T]: T[P] }
    : never;
} = (source: any, projection?: any, target = {}) => {
  forEach2(
    source,
    (item, index, seed) => (
      projection && (item = projection(item, index, seed)),
      item && (target[item[0]] = item[1])
    )
  );
  return target;
};

export const assign2: {
  <T, Its extends readonly Obj2Source[]>(
    target: T,
    ...sources: Its
  ): MergeObj2Sources<Its, T> extends infer T
    ? { [P in keyof T]: T[P] }
    : never;
} = (target: any, ...sources: any[]) => {
  for (const source of sources)
    source && forEach2(source, ([key, value]) => key && (target[key] = value));
  return target;
};

export const clone2: {
  <T>(value: T, depth?: number): T;
} = (value, depth = -1) => {
  const ctor = value?.constructor;
  if (ctor === Object || ctor === Array) {
    const clone: any = ctor();
    for (const p in value) {
      const propValue = value[p];
      clone[p] =
        depth !== 0 && typeof propValue === "object" && propValue
          ? clone2(propValue, depth - 1)
          : propValue;
    }
    return clone;
  }
  return value;
};

export const add2: {
  <T>(target: Set<T>, item: T): boolean;
  <T extends {}>(target: WeakSet<T>, item: T): boolean;
} = (target: Set<any> | WeakSet<any>, item: any) =>
  !target.has(item) && !!target.add(item);

export const get2: {
  <K, V, R extends V | undefined = V | undefined>(
    target: Map<K, V>,
    key: K,
    add?: () => R
  ): R;
  <K extends {}, V, R extends V | undefined = undefined>(
    target: WeakMap<K, V>,
    key: K,
    add?: () => R
  ): R;
} = (target: Map<any, any> | WeakMap<any, any>, key: any, add: any) => {
  let value = target.get(key);
  if (value === undefined && add && (value = add()) !== undefined) {
    target.set(key, value);
  }
  return value;
};

export const update2: {
  <K, V, R extends V | undefined = V | undefined>(
    target: Map<K, V>,
    key: K,
    update: R | ((current: V | undefined) => R)
  ): R;
  <K extends {}, V, R extends V | undefined = undefined>(
    target: WeakMap<K, V>,
    key: K,
    update: R | ((current: V | undefined) => R)
  ): R;
} = (target: Map<any, any> | WeakMap<any, any>, key: any, update: any) => {
  let value =
    typeof update === "function"
      ? update(target.get ? target.get(key) : target[key])
      : update;
  if (value === undefined) {
    target.delete(key);
  } else {
    target.set(key, value);
  }
  return value;
};

export const forEach2: {
  <It extends ItSource, T, R = ItItem<It>, S extends R | unknown = unknown>(
    target: It | ItSource<T>,
    projection?: ItFunction2<ItItem<It>, S, R>
  ): R extends Nullish ? R : ItProjection<R> | undefined;
} = (target: any, projection?: any) =>
  target != null
    ? (
        target[forEachFunction] ||
        (Object.getPrototypeOf(target)[forEachFunction] =
          createForEachFunction(target))
      )(target, projection)
    : target;

export const array2 = <T>(
  source: T
): unknown extends T
  ? any
  : T extends Nullish
  ? T
  : T extends readonly any[]
  ? T
  : T extends Iterable<infer T>
  ? T[]
  : [T] =>
  source == null
    ? source
    : isArray(source)
    ? source
    : source[symbolIterator] && typeof source !== "string"
    ? [...(source as any)]
    : ([source] as any);

type Sortable = string | boolean | number | Nullish;

export const sort2: {
  <T extends Sortable, It extends Iterable<T> | Nullish>(
    items: It,
    descending?: boolean
  ): It extends Nullish ? T : ItItem<T>[];

  <T, It extends Iterable<T> | Nullish>(
    items: It,
    selector: (item: T) => Sortable,
    descending?: boolean
  ): T extends Nullish ? T : ItItem<T>[];
} = (items: any, selector?: any, descending?: any) => {
  typeof selector === "boolean" &&
    ([descending, selector] = [selector, undefined]);
  descending = descending ? -1 : 1;
  return (array2(items) as any[]).sort((x, y) => {
    selector && ((x = selector(x)), (y = selector(y)));
    return (
      descending *
      (typeof x === "string"
        ? typeof y === "string"
          ? x.localeCompare(y)
          : 1
        : typeof y === "string"
        ? -1
        : +x - +y)
    );
  }) as any;
};

export const topoSort = <T>(
  items: Iterable<T>,
  dependencies: (item: T) => Iterable<T> | Nullish
) => {
  type Info = [item: T, dependents: Info[], blockingEdges: number];

  let clear: Info[] = [];
  let mapped: T[] = [];
  const edges = new Map<T, Info>(map2(items, (item) => [item, [item, [], 0]]));
  for (const [item, info] of edges) {
    for (const dependency of dependencies(item) ?? []) {
      // Ignore dependencies not present.
      edges.get(dependency)?.[1].push(info) && ++info[2];
    }
    if (!info[2]) {
      clear.push(info);
    }
  }

  for (const [item, dependents] of clear) {
    mapped.push(item);
    for (const dependent of dependents) {
      if (!--dependent[2]) {
        clear.push(dependent);
      }
    }
  }

  return mapped.length === edges.size
    ? mapped
    : throwError("Cyclic dependencies");
};

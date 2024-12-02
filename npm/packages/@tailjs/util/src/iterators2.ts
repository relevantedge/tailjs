import {
  AllRequired,
  Falsish,
  isArray,
  PartialRecord,
  RecordType,
  UnionToIntersection,
} from ".";

// Faster versions of map and forEach. The others are a bit "muddy".
// Here we assign a designated iterator to an object's prototype in the hope V8 megamorphism are less likely to kick in.

let stopInvoked = false;
const stopSymbol = Symbol();
export const skip2 = Symbol();
export const stop2: (<T = any>(value: T) => T) & typeof stopSymbol = (<T>(
  value: T
) => ((stopInvoked = true), value)) as any;

const symbolIterator = Symbol.iterator;
const throwError = function (e: string) {
  throw new Error(e);
};

const TRUISH = <T>(item: T) => item || skip2;

const forEachFunction = Symbol();

type Nullish = null | undefined | void;

type EncourageTuples =
  | readonly [any]
  | readonly [any][]
  | readonly [any][][]
  | readonly [any][][][];

type ItCallback2<It, S, R, Context = It> = (
  item: ItItem<It>,
  index: number,
  accumulated: unknown extends S ? any : S,
  context: Context
) =>
  | R
  | typeof skip2
  | typeof stop2
  // Encourage TypeScript to interpret return values as tuples rather than arrays,
  // e.g. `[1,2,[3,4]]` becomes `[number,number,[number,number]]` instead of `(number|number[])[]`).
  | EncourageTuples;

type ItFilterCallback2<It> = (
  item: ItItem<It>,
  index: number,
  previous: ItItem<It> | undefined,
  context: It
) => any;

type ItGuardedFilterCallback2<It, R> = (
  item: ItItem<It>,
  index: number,
  previous: ItItem<It> | undefined,
  context: It
) => item is R & ItItem<It>;

type ForEachFunction = (
  target: any,
  projection: ItCallback2<any, any, any> | undefined,
  mapped: any[] | undefined,
  seed: any,
  context: any
) => any;

type KeyValues<T> = { [P in keyof T]-?: [P, T[P]] }[keyof T];

type ItItem<T> = unknown extends T
  ? any
  : T extends Exclude<Falsish, number>
  ? never
  : T extends Iterable<infer T>
  ? T
  : T extends number
  ? number
  : T extends (current?: any) => infer R
  ? R
  : T extends object
  ? KeyValues<T>
  : never;

type ItArray<It> = It extends Nullish
  ? It
  : [ItItem<It>] extends [never]
  ? undefined
  : ItItem<It>[];

type ItProjection<R> = R extends typeof skip2 | typeof stop2 ? never : R;

type ItSource = object | number | ((current: any) => any) | Falsish;
type ItSourceOf<T> = unknown extends T
  ? ItSource
  : [T] extends [never]
  ? ItSource
  :
      | (T extends Kv2<infer K extends keyof any, infer V>
          ? { [P in K]: V }
          : never)
      | (T extends number ? number : never)
      | ((current: T) => T | undefined)
      | Iterable<T>
      | Nullish;

type Kv2<K = keyof any, V = any> = readonly [K, V];

type Obj2<KeyValues extends Kv2 | Nullish> = UnionToIntersection<
  KeyValues extends readonly [infer Key extends keyof any, infer Value]
    ? { [P in Key]: Value }
    : {}
> extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

type Obj2Source<K = keyof any, V = any> =
  | ({ [P in K & keyof any]: V } & { [Symbol.iterator]?: undefined })
  | Iterable<Kv2<K, V> | undefined>
  | Nullish;

type SpecificKeys<K extends keyof any> = K extends keyof any
  ? string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K
  : never;

type GenericKeys<K extends keyof any> = K extends keyof any
  ? string extends K
    ? K
    : number extends K
    ? K
    : symbol extends K
    ? K
    : never
  : never;

type OptionalKeys<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]?: T[K] } extends Pick<T, K>
    ? K
    : never
  : never;

type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

type Merge2<T1, T2, MergeRecords, Overwrite> = T1 extends Nullish
  ? T1
  : T2 extends Nullish
  ? T2
  : _Merge2<T1, T2, MergeRecords, Overwrite>;

type _MergeRecords2<
  T1P,
  T2P,
  Deep,
  Overwrite,
  Default = never
> = Deep extends true
  ? T1P extends RecordType
    ? T2P extends RecordType
      ? Merge2<T1P, T2P, true, Overwrite>
      : Default
    : Default
  : Default;

type _Merge2<
  T1,
  T2,
  MergeRecords,
  Overwrite,
  O1 extends keyof T1 = OptionalKeys<T1>,
  O2 extends keyof T2 = OptionalKeys<T2>,
  R1 extends keyof T1 = RequiredKeys<T1>,
  R2 extends keyof T2 = RequiredKeys<T2>
> = Pick<T1, Exclude<keyof T1, SpecificKeys<keyof T2>>> &
  Pick<T2, Exclude<keyof T2, SpecificKeys<keyof T1>>> & {
    // Resulting property may be optional only if both optional in T1 and T2
    [P in O1 & O2]?:
      | T1[P]
      | T2[P]
      | _MergeRecords2<T1[P], T2[P], MergeRecords, Overwrite>;
  } & {
    // Can only be T1 if overwrite=false
    [P in O1 & R2]:
      | T2[P]
      | _MergeRecords2<
          T1[P],
          T2[P],
          MergeRecords,
          Overwrite,
          Overwrite extends false
            ? Exclude<T1[P], RecordType | undefined>
            : never
        >;
  } & {
    // Will never be T2 if overwrite=false
    [P in R1 & O2]:
      | T1[P]
      | _MergeRecords2<
          T1[P],
          T2[P],
          MergeRecords,
          Overwrite,
          Overwrite extends false ? never : Exclude<T2[P], RecordType>
        >;
  } & {
    // Overwrite decides whether the value is T1 or T2
    [P in R1 & R2]: _MergeRecords2<
      T1[P],
      T2[P],
      MergeRecords,
      Overwrite,
      Exclude<
        Overwrite extends false
          ? T1[P] | T2[GenericKeys<R1> & keyof T2]
          : T1[GenericKeys<R2> & keyof T1] | T2[P],
        RecordType
      >
    >;
  } extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

type Obj2SourceToObj<T> = T extends Nullish
  ? {}
  : T extends Iterable<infer Kv extends Kv2>
  ? Obj2<Kv>
  : T;

type MergeObj2Sources<
  S extends readonly any[],
  Merged,
  MergeRecords,
  Overwrite
> = (
  S extends readonly [infer T, ...infer Rest]
    ? T extends infer T
      ? MergeObj2Sources<
          Rest,
          Merge2<Merged, Obj2SourceToObj<T>, MergeRecords, Overwrite>,
          MergeRecords,
          Overwrite
        >
      : never
    : Merged
) extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

const forEachIterable2: () => ForEachFunction =
  () => (target, projection, mapped, seed, context) => {
    let projected: any,
      i = 0;
    for (const item of target) {
      if (
        (projected = projection
          ? projection(item, i++, seed, context)
          : item) !== skip2
      ) {
        if (projected === stop2) {
          break;
        }
        seed = projected;
        if (mapped) mapped.push(projected);
        if (stopInvoked) {
          stopInvoked = false;
          break;
        }
      }
    }
    return mapped || seed;
  };

const forEachKeyValue2: () => ForEachFunction =
  () => (target, projection, mapped, seed, context) => {
    let projected: any,
      item: any,
      i = 0;
    for (const key in target) {
      item = [key, target[key]];
      if (
        (projected = projection
          ? projection(item, i++, seed, context)
          : item) !== skip2
      ) {
        if (projected === stop2) {
          break;
        }
        seed = projected;
        if (mapped) mapped.push(projected);
        if (stopInvoked) {
          stopInvoked = false;
          break;
        }
      }
    }
    return mapped || seed;
  };

const forEachArray2: () => ForEachFunction =
  () => (target: any[], projection, mapped, seed, context) => {
    let projected: any, item: any;
    for (let i = 0, n = target.length; i < n; ) {
      item = target[i];
      if (
        (projected = projection
          ? projection(item, i++, seed, context)
          : item) !== skip2
      ) {
        if (projected === stop2) {
          break;
        }
        seed = projected;
        if (mapped) mapped.push(projected);
        if (stopInvoked) {
          stopInvoked = false;
          break;
        }
      }
    }
    return mapped || seed;
  };

export function* range2(length: number) {
  for (let i = 0; i < length; i++) yield i;
}

export function* traverse2(next: <T>(current: T | undefined) => T | Nullish) {
  let item: any = undefined;
  while ((item = next(item)) !== undefined) yield item;
}

export const collect2 = <T>(
  source: T | Iterable<T>,
  generator: (item: T) => Iterable<T> | Nullish,
  includeSelf = true,
  collected = new Set<T>()
): Set<T> => {
  if (source[symbolIterator]) {
    forEach2(source as Iterable<T>, (item) =>
      collect2(item, generator, includeSelf, collected)
    );
  } else if (toggle2(collected, source as any)) {
    let generated = generator(source as any);
    const stack: (Iterable<T> | Nullish)[] = [generated];
    while ((generated = stack.pop())) {
      for (const item of generated) {
        if (!toggle2(collected, item)) continue;
        (generated = generator(item)) && stack.push(generated);
      }
    }
  }
  return collected;
};

const createForEachFunction = (target: any): ForEachFunction => {
  let it1: any, it2: any;
  return target.constructor === Array
    ? forEachArray2()
    : target.constructor === Object
    ? ((it1 = forEachIterable2()),
      (it2 = forEachKeyValue2()),
      (target, projection, mapped, seed, context) =>
        (target.constructor === Object
          ? symbolIterator in target
            ? it1
            : it2
          : assignForEach(target))(target, projection, mapped, seed, context))
    : typeof target === "number"
    ? ((it1 = forEachIterable2()),
      (target, projection: any, mapped, seed, context) =>
        it1(range2(target), projection, mapped, seed, context))
    : typeof target === "function"
    ? ((it1 = forEachIterable2()),
      (target, projection: any, mapped, seed, context) =>
        it1(traverse2(target), projection, mapped, seed, context))
    : typeof target === "object"
    ? symbolIterator in target
      ? forEachIterable2()
      : forEachKeyValue2()
    : () => {};
};

const assignForEach = (target: any) =>
  (Object.getPrototypeOf(target)[forEachFunction] =
    createForEachFunction(target));

export const map2: {
  <It extends ItSourceOf<T>, T, Target = never[]>(
    source: It,
    projection?: undefined | null,
    target?: Target & T[]
  ): Target extends never[] ? ItArray<It> : Target;
  <
    It extends ItSource | Falsish,
    R extends T,
    S extends R,
    T,
    Target = undefined,
    Context = It
  >(
    source: It,
    projection: ItCallback2<It, S, R> | Nullish,
    target?: Target & T[],
    seed?: S,
    context?: Context
  ): It extends Falsish
    ? Target
    : Target extends never[] | undefined
    ? ItProjection<R>[]
    : Target;
} = (
  source: any,
  projection?: any,
  target = [],
  seed?: any,
  context = source
) =>
  !source && source !== 0
    ? source == null
      ? source
      : undefined
    : (source[forEachFunction] || assignForEach(source))(
        source,
        projection,
        target,
        seed,
        context
      );

const normalizeSelector = (selector: Selector, require = false) =>
  typeof selector === "function"
    ? selector
    : selector != null
    ? (item: any) =>
        (item = item[selector]) === undefined && require ? skip2 : item
    : (item: any) => item;

type AnyKey<T> = T extends infer T ? keyof T : never;
type Selector<T = any> = AnyKey<T> | ((item: T, ...args: any) => any) | Nullish;

type ValueOf<T, K> = T extends infer T
  ? K extends keyof T
    ? T[K]
    : never
  : never;

type SelectorResult<
  T,
  S extends Selector,
  Require extends boolean = true
> = S extends Nullish
  ? T
  : S extends (...args: any) => infer R
  ? R
  : Exclude<ValueOf<T, S>, Require extends true ? undefined : never>;

export const pick2: {
  <T extends object | Nullish, TK extends keyof (T & {}), K extends AnyKey<T>>(
    target: T,
    // The `K | G` trick is because TypeScript will consider `["prop1", "prop2"]` as `string[]`
    //  without the `K extends keyof T` constraint (in which case it gets it right as ("prop1"|"prop2")[]).
    // `keyof T` is too restrictive since we also want to support intersection types.
    keys: Iterable<TK | K>
  ): T extends Nullish
    ? T
    : T extends infer T
    ? (TK | K) & keyof T extends infer K extends keyof T
      ? {
          [P in K]: T[P];
        }
      : never
    : never;
} = (target, keys) =>
  target == null
    ? target
    : (obj2(keys, (key) =>
        // The first check is presumably faster than the `in` operator.
        target[key as any] != null || key in target
          ? [key, target[key as any]]
          : skip2
      ) as any);

export const filter2: {
  <It extends ItSource>(target: It): It extends Nullish
    ? It
    : Exclude<ItItem<It>, typeof skip2 | typeof stop2 | Nullish>[];
  <
    It extends ItSource,
    R extends Exclude<ItItem<It>, typeof skip2 | typeof stop2 | Nullish>
  >(
    target: It,
    filter: ItGuardedFilterCallback2<It, R>,
    invert?: boolean
  ): It extends Nullish ? It : R[];

  <It extends ItSource>(target: It, filter: ItFilterCallback2<It>): ItArray<It>;

  <It extends ItSource>(
    target: It,
    filter: { has(item: Exclude<ItItem<It>, Nullish>): any },
    invert?: boolean
  ): It extends Nullish ? It : ItItem<Exclude<It, Nullish>>[];
} = (items: any, filter?: any, invert = false) =>
  map2(
    items,
    !filter
      ? TRUISH
      : filter.has
      ? (item) => (item == null || filter.has(item) === invert ? skip2 : item)
      : (item, index, prev) =>
          !filter(item, index, prev) === invert ? item : skip2
  );

export const take2: {
  <It extends ItSource | Falsish>(
    source: It,
    count: number,
    projection?: undefined
  ): ItArray<It>;
  <It extends ItSource | Falsish, R, S extends R>(
    source: It,
    count: number,
    projection: ItCallback2<It, S, R>
  ): It extends Falsish ? undefined : ItProjection<R>[];
} = (source: any, count: any, projection?: any) =>
  map2(
    source,
    (item, index, prev) => (
      index === count + 1 && (stopInvoked = true),
      projection ? projection(item, index, prev) : item
    )
  );

export const first2: {
  <It extends ItSource, R>(
    source: It,
    predicate: ItGuardedFilterCallback2<It, R>
  ): R | undefined;
  <It extends ItSource>(source: It, predicate?: ItFilterCallback2<It>):
    | ItItem<It>
    | undefined;
} = (source: any, predicate = source) =>
  forEach2(
    source,
    (item, index, prev) => (
      (!predicate || predicate(item, index, prev, source)) &&
        (stopInvoked = true),
      item
    )
  );

type Ones<N extends number, A extends number[] = []> = A["length"] extends N
  ? A
  : Ones<N, [...A, 1]>;

type Dec<A extends number> = A extends 0
  ? -1
  : `${A}` extends `-${infer _}`
  ? -1
  : Ones<A> extends [any, ...infer Rest]
  ? Rest["length"]
  : never;

type Flat<T, Depth extends number> = Depth extends 0
  ? T
  : T extends readonly (infer T)[]
  ? Flat<T, Dec<Depth>>
  : T;

export const flatMap2: {
  <It extends ItSource, Depth extends number = -1>(
    source: It,
    projection?: Nullish,
    depth?: Depth,
    target?: any[]
  ): It extends Nullish ? It : Flat<ItItem<It>, Depth>[];
  <
    It extends ItSource,
    R,
    S extends R,
    Context = It,
    Depth extends number = -1
  >(
    source: It,
    projection: ItCallback2<It, S, R> | Nullish,
    depth?: Depth,
    target?: any[],
    seed?: S,
    context?: Context
  ): It extends Nullish ? It : Flat<ItProjection<R>, Depth>[];
} = (
  source: any,
  projection?: any,
  depth: any = -1,
  target: any[] = [],
  seed?: any,
  context = source
) =>
  map2(
    source,
    (item, index, previous) =>
      isArray(projection ? (item = projection(item, index, previous)) : item) &&
      depth
        ? (flatMap2(item, undefined, depth - 1, target, item), skip2)
        : item,
    target,
    seed,
    context
  );

export const forEach2: {
  <It extends ItSource | Falsish>(source: It): It extends Falsish
    ? undefined
    : ItItem<It> | undefined;
  <It extends ItSource | Falsish, R, S extends R, Context = It>(
    source: It,
    projection: ItCallback2<It, S, R, Context> | Nullish,
    seed?: S,
    context?: Context
  ): It extends Falsish ? undefined : ItProjection<R> | undefined;
} = (source: any, projection?: any, seed?: any, context = source) =>
  source
    ? (
        source[forEachFunction] ||
        (Object.getPrototypeOf(source)[forEachFunction] =
          createForEachFunction(source))
      )(source, projection, undefined, seed, context)
    : undefined;

type Group2Result<Source, AsMap> = AsMap extends true
  ? Source extends Iterable<infer T extends Kv2<any>>
    ? Map<Exclude<T[0], undefined>, T[1][]>
    : Source extends { [P in infer Key]: infer Value }
    ? Map<Key, Value[]>
    : never
  : Source extends Iterable<infer T extends Kv2>
  ? { [P in Exclude<T[0], undefined>]: T[1] }
  : Source extends { [P in infer Key]: infer Value }
  ? { [P in Key]: Value[] }
  : never;

export const group2: {
  <It extends Obj2Source, AsMap extends boolean = true>(
    source: It,
    map?: AsMap
  ): It extends Nullish ? It : Group2Result<Obj2SourceToObj<It>, AsMap>;
  <It extends Obj2Source<any>>(source: It): It extends Nullish
    ? It
    : Group2Result<Obj2SourceToObj<It>, true>;
  <
    It extends ItSource,
    T,
    R extends Kv2,
    S extends R,
    AsMap extends boolean = true
  >(
    source: It,
    projection: ItCallback2<It, S, R>,
    map?: AsMap
  ): Group2Result<R, AsMap>;
  <It extends ItSource, R extends Kv2<any>, S extends R>(
    source: It,
    projection: ItCallback2<It, S, R>
  ): Group2Result<R, true>;
} = (source: any, projection?: any, map?: any) => {
  projection != null &&
    typeof projection !== "function" &&
    ([projection, map] = [undefined, projection]);
  let groups: any, kv: [any, any];
  forEach2(
    source,
    map !== false
      ? ((groups = new Map()),
        (item, index, prev) =>
          (kv = projection ? projection(item, index, prev) : item) &&
          get2(groups, kv[0], () => []).push(kv[1]))
      : ((groups = {}),
        (item, index, prev) =>
          (kv = projection ? projection(item, index, prev) : item) &&
          (groups[kv[0]] ??= []).push(kv[1]))
  );
  return groups as any;
};

export const obj2: {
  <It extends Obj2Source>(source: It): It extends Nullish
    ? It
    : Obj2SourceToObj<It>;
  <It extends ItSource, R extends Kv2 | Nullish, S extends R>(
    source: It,
    projection: ItCallback2<It, S, R>
  ): It extends Nullish ? It : Obj2<ItProjection<R>>;
} = (source: any, projection?: any) => {
  const target = {};
  forEach2(
    source,
    (item, index, seed) => (
      projection && (item = projection(item, index, seed)),
      item && typeof item !== "symbol" ? (target[item[0]] = item[1]) : item
    )
  );
  return target;
};

const assignSymbol = Symbol();
const getSymbol = Symbol();
const setupAssign = (
  target: any,
  symbol: typeof assignSymbol | typeof getSymbol
) => {
  for (const { prototype } of [Map, WeakMap]) {
    prototype[assignSymbol] = ((item, _1, _2, map) =>
      item &&
      (item[1] === undefined
        ? map.delete(item[0])
        : map.set(item[0], item[1]))) as ItCallback2<
      any,
      any,
      any,
      Map<any, any>
    >;
    prototype[getSymbol] = prototype.get;
  }
  for (const { prototype } of [Set, WeakSet]) {
    prototype[assignSymbol] = ((item, _1, _2, set) =>
      item &&
      (item[1] ? set.add(item[0]) : set.delete(item[0]))) as ItCallback2<
      any,
      any,
      any,
      Set<any>
    >;
    prototype[getSymbol] = prototype.has;
  }

  Object.prototype[assignSymbol] = ((item: any, _1, _2, target) =>
    item &&
    (item[1] === undefined
      ? delete target[item[0]]
      : (target[item[0]] = item[1]))) as ItCallback2<any, any, any, any>;

  Object.prototype[getSymbol] = function (key: any) {
    return this[key];
  };

  return target[symbol];
};

export const assign2: {
  <K, V, T extends Map<K, V> | WeakMap<K & {}, V>>(
    target: T,
    ...sources: Obj2Source<K, V>[]
  ): T;
  <K, T extends Set<K> | WeakSet<K & {}>>(
    target: T,
    ...sources: Obj2Source<K>[]
  ): T;
  <V, T extends Set<V> | WeakSet<V & {}>>(
    target: T,
    ...sources: readonly (Nullish | Iterable<V>)[]
  ): T;
  <T, Its extends Obj2Source[]>(target: T, ...sources: Its): MergeObj2Sources<
    Its,
    T,
    false,
    true
  >;
  <T, Its extends Obj2Source[], Merge extends boolean>(
    target: T,
    ...sources: [...sources: Its, deep: Merge]
  ): MergeObj2Sources<Its, T, Merge, true>;
  <
    T,
    Its extends Obj2Source[],
    Merge extends boolean,
    Overwrite extends boolean
  >(
    target: T,
    ...sources: [...sources: Its, deep: Merge, overwrite: Overwrite]
  ): MergeObj2Sources<Its, T, Merge, Overwrite>;
} = (target: any, ...sources: any[]) => {
  const assign = target[assignSymbol] || setupAssign(target, assignSymbol);
  let merge: boolean;
  if (typeof (merge = sources[sources.length - 1]) === "boolean") {
    let overwrite: boolean,
      n = sources.length - 1;

    if (typeof (overwrite = sources[sources.length - 2]) === "boolean") {
      [merge, overwrite] = [overwrite, merge];
      --n;
    } else {
      overwrite = true;
    }
    if (merge || !overwrite) {
      let current: any;
      for (const source of sources) {
        if (!n--) break;
        forEach2(
          source,
          (kv: any, index, acc, context) => {
            if (!kv) return;
            if (
              merge &&
              kv[1]?.constructor === Object &&
              (current = target[kv[0]])?.constructor === Object
            ) {
              assign2(current, kv[1], merge, overwrite);
            } else if (overwrite || target[kv[0]] === undefined) {
              assign(kv, index, acc, context);
            }
          },
          undefined,
          target
        );
      }
      return target;
    }
  }

  for (const source of sources) {
    forEach2(source, assign, undefined, target);
  }

  return target;
};

export const exchange2: {
  <K, V>(target: Map<K, V> | WeakMap<K & {}, V>, key: K, value: V | undefined):
    | V
    | undefined;
  <K>(target: Set<K> | WeakSet<K & {}>, key: K, toggle: any): boolean;
  <T, K extends AnyKey<T>>(target: T, key: K, value: ValueOf<T, K>): ValueOf<
    T,
    K
  >;
} = (target: any, key: any, value: any) => {
  const current = (
    target[getSymbol] || (setupAssign(target, getSymbol), target[getSymbol])
  )(key);
  if (current !== value) {
    target[assignSymbol]!([key, value], 0, 0, target);
  }
  return current as any;
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

type NeverIsOkay<V> = V extends readonly any[] ? never[] : V;
type NeverIsAny<T> = T extends never[]
  ? any[]
  : unknown extends T
  ? any
  : [T] extends [never]
  ? any
  : T;

export const get2: {
  <K, V, R = undefined>(
    target: Map<K, V> | WeakMap<K & WeakKey, V>,
    key: K,
    add?: () => (R & UnknownIsOkay<R, V>) | EncourageTuples
  ): unknown extends V
    ? NeverIsAny<R>
    : R extends undefined
    ? V | undefined
    : V;
} = (target: Map<any, any> | WeakMap<any, any>, key: any, add: any) => {
  let value = target.get(key);
  if (value === undefined && add && (value = add()) !== undefined) {
    target.set(key, value);
  }
  return value;
};

export const update2: {
  <K, V, R extends V | undefined | NeverIsOkay<V>>(
    target: Map<K, V> | WeakMap<K & WeakKey, V>,
    key: K,
    update: (current: V | undefined) => R
  ): unknown extends V
    ? NeverIsAny<R>
    : R extends undefined
    ? V | undefined
    : V;
  <K, V, R extends V | undefined | NeverIsOkay<V>>(
    target: Map<K, V> | WeakMap<K & WeakKey, V>,
    key: K,
    update: R
  ): unknown extends V
    ? NeverIsAny<R>
    : R extends undefined
    ? V | undefined
    : V;
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

export const toggle2: {
  <T>(target: Set<T> | WeakSet<T & {}>, item: T, toggle?: boolean): boolean;
} = (target: Set<any> | WeakSet<any>, item: any, toggle = true) =>
  target.has(item) !== toggle &&
  !!(toggle ? target.add(item) : target.delete(item));

type UnknownIsOkay<R, V> = R extends undefined
  ? R
  : unknown extends V
  ? any
  : R extends V
  ? R
  : V & R extends never[]
  ? R
  : never;

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

export const set2 = <T>(
  source: T
): unknown extends T
  ? any
  : T extends Nullish
  ? T
  : T extends Set<any>
  ? T
  : T extends Iterable<infer T>
  ? Set<T>
  : Set<T> =>
  source instanceof Set
    ? source
    : source == null
    ? source
    : (new Set(source[symbolIterator] ? source : ([source] as any)) as any);

export const some2: {
  <It extends ItSource>(source: It, predicate?: ItFilterCallback2<It>): boolean;
} = (source, predicate) =>
  forEach2(source, (item, index, prev) =>
    (predicate ? predicate(item, index, prev, source) : item)
      ? (stopInvoked = true)
      : item
  ) === true;

export const all2: {
  <It extends ItSource>(source: It, predicate?: ItFilterCallback2<It>): boolean;
} = (source, predicate) =>
  forEach2(source, (item, index, prev) =>
    !(predicate ? predicate(item, index, prev, source) : item)
      ? !(stopInvoked = true)
      : item
  ) !== false;

export const concat2: {
  <T extends readonly any[]>(args: T): T extends readonly (infer T)[]
    ? (T extends Iterable<infer T> ? T : T)[]
    : never;

  <T extends readonly any[]>(...args: T): {
    [P in keyof T]: T[P] extends Iterable<infer T> ? T : T[P];
  }[number][];
} = (arg0: any, ...other: any[]) => {
  if (other.length) return clone2([arg0, ...other]);

  const result: any[] = [];
  for (const arg of arg0) {
    if (arg != null) {
      if (arg[symbolIterator]) map2(arg, undefined, result);
      else result.push(arg);
    }
  }
  return result;
};

type Sortable = string | boolean | number | Nullish;

export const sort2: {
  <T extends Sortable, It>(
    items: It & (Iterable<T> | Nullish),
    descending?: boolean
  ): It extends Nullish ? T : ItItem<T>[];

  <T, It>(
    items: It & (Iterable<T> | undefined),
    selector: (item: T) => Sortable | Sortable[],
    descending?: boolean
  ): It extends Nullish ? T : T[];
} = (items: any, selector?: any, descending?: any) => {
  typeof selector === "boolean" &&
    ([descending, selector] = [selector, undefined]);
  descending = descending ? -1 : 1;
  return (array2(items) as any[]).sort((x, y) => {
    selector && ((x = selector(x)), (y = selector(y)));
    return (
      descending *
      (x === y
        ? 0
        : typeof x === "string"
        ? typeof y === "string"
          ? x.localeCompare(y)
          : 1
        : typeof y === "string"
        ? -1
        : +x - +y)
    );
  }) as any;
};

export const topoSort2 = <T>(
  items: Iterable<T>,
  dependencies: (item: T) => Iterable<T> | Nullish,
  format?: Selector<T>
) => {
  type Info = [item: T, dependents: Info[], blockingEdges: Set<T>];

  let clear: Info[] = [];
  let mapped: T[] = [];

  const edges = new Map<T, Info>(
    map2(items, (item) => [item, [item, [], null!]])
  );
  for (const [item, info] of edges) {
    for (const dependency of dependencies(item) ?? []) {
      // Ignore dependencies not present.
      edges.get(dependency)?.[1].push(info) &&
        (info[2] ??= new Set()).add(dependency);
    }
    if (!info[2]) {
      clear.push(info);
    }
  }

  for (const [item, dependents] of clear) {
    mapped.push(item);
    for (const dependent of dependents) {
      dependent[2].delete(item);
      if (!dependent[2].size) {
        clear.push(dependent);
      }
    }
  }

  return mapped.length === edges.size
    ? mapped
    : throwError(
        `Cyclic dependencies: ${enumerate2(
          map2(edges, ([, info]) =>
            info[2]?.size
              ? (format = normalizeSelector(format))(info[0]) +
                " depends on " +
                enumerate2(info[2], format)
              : skip2
          )
        )}.`
      );
};

type ReduceFunction<Default = undefined, By = false> = {
  <It>(source: It & Iterable<number | undefined>): It extends Nullish
    ? It
    : number | Default;
  <
    It extends ItSource,
    R extends number | undefined,
    S extends R = any,
    Item extends boolean = false
  >(
    ...args: [
      source: It,
      projection: ItCallback2<It, S, R>,
      ...(true extends By ? [returnItem?: Item] : [])
    ]
  ): It extends Nullish
    ? It
    : Item extends true
    ? ItItem<It>
    : number | Default;
};

const reduce2 = (
  source: any,
  projection: any,
  reduce: (current: number | undefined, value: number) => number | undefined,
  returnItem = false
) => {
  let value: number | undefined;
  let result: any;
  forEach2(
    source,
    returnItem
      ? (item, index, prev: any) =>
          (value = projection ? projection(item, index, prev) : item) !==
            undefined && prev !== (prev = reduce(prev, value))
            ? ((result = item), prev)
            : prev
      : (item, index, prev: any) =>
          (value = projection ? projection(item, index, prev) : item) !==
          undefined
            ? (result = reduce(prev, value))
            : prev
  ) as any;
  return result;
};

export const min2: ReduceFunction<undefined, true> = (
  source: any,
  projection?: any,
  by?: boolean
) =>
  reduce2(
    source,
    projection,
    (prev, x) => (prev == null || x < prev ? x : prev),
    by
  );

export const max2: ReduceFunction<undefined, true> = (
  source: any,
  projection?: any,
  by?: boolean
) =>
  reduce2(
    source,
    projection,
    (prev, x) => (prev == null || x > prev ? x : prev),
    by
  );

export const sum2: ReduceFunction<number> = (source: any, projection?: any) =>
  reduce2(source, projection, (prev = 0, x) => {
    return prev + x;
  }) || 0;

export const avg2: ReduceFunction<number> = (source: any, projection?: any) => {
  let n = 0;
  let sum = reduce2(source, projection, (prev = 0, x) => (n++, prev + x));
  return n ? sum / n : undefined;
};

export const join2: {
  <It extends ItSource>(source: It, separator?: string): It extends Nullish
    ? It
    : string;
  <It extends ItSource, R, S extends R = any>(
    source: It,
    projection?: ItCallback2<It, S, R>,
    separator?: string
  ): It extends Nullish ? It : string;
} = (source: any, arg1: any, arg2?: any) =>
  source == null
    ? source
    : typeof arg1 === "function"
    ? map2(source, arg1).join(arg2 ?? ",")
    : array2(source).join(arg1 ?? ",");

export const enumerate2: {
  <It extends ItSource>(
    values: It,
    conjunction?: string | Nullish,
    separator?: string | Nullish,
    result?: (enumerated: string, n: number) => string
  ): It extends Nullish ? It : string;
  <It extends ItSource, R, S extends R>(
    values: It,
    format: ItCallback2<It, S, R>,
    conjunction?: string,
    separator?: string | Nullish,
    result?: (enumerated: string, n: number) => string
  ): It extends Nullish ? It : string;
} = (
  values: any,
  conjunction: any = "and",
  separator?: any,
  result?: any,
  rest?: any
) => {
  if (!values && values !== 0) return values == null ? values : undefined;

  if (typeof conjunction === "function") {
    return enumerate2(map2(values, conjunction), separator, result, rest);
  }

  const first: string[] = [];
  const last = forEach2(values, (item, _, prev) =>
    item != null && item !== ""
      ? (prev && first.push(prev), item.toString())
      : skip2
  );
  const enumerated =
    last != null
      ? first.length
        ? `${first.join((separator ??= ",") + " ")}${
            conjunction && conjunction[0] !== "," ? " " : ""
          }${conjunction || separator} ${last}`
        : last
      : "";
  return (
    result?.(enumerated, first.length + +(last !== null)) ?? (enumerated as any)
  );
};

export const toJSON2 = JSON.stringify;
export const fromJSON2 = <Value extends string | Nullish>(
  value: Value
): Value extends Nullish ? Value : string =>
  value == null ? value : JSON.parse(value);

import {
  AsyncIterationItem,
  AsyncIterationProjection,
  AsyncIterationSource,
  AsyncIterationSourceOf,
  AsyncItProjection,
  Falsish,
  get,
  isArray,
  isIterable,
  isPromiseLike,
  itemize,
  IterationFilterCallback,
  IterationProjected,
  IterationProjection,
  IterationSource,
  IterationSourceOf,
  IterationTypeGuardCallback,
  IteratorItem,
  MaybeArray,
  MaybeNullish,
  MaybeNullishOrFalse,
  Nullish,
  NullishOrFalse,
  ObjectSource,
  Sortable,
  symbolAsyncIterator,
  throwError,
  ToggleArray,
  TupleOrArray,
  UnwrapPromiseLike,
} from ".";
import {
  EncourageTuples,
  findDeclaringScope,
  IterationResultArray,
  KeyValueType,
  ObjectSourceToObject,
  Selector,
} from "./_internal";

let stopInvoked = false;
const stopSymbol = Symbol();

export const skip = Symbol();
export const stop: (<T = any>(value: T) => T) & typeof stopSymbol = (<T>(
  value: T
) => ((stopInvoked = true), value)) as any;

// #region region_iterator_implementations
const forEachSymbol = Symbol();
const asyncIteratorFactorySymbol = Symbol();
const symbolIterator = Symbol.iterator;

// Prototype extensions are assigned on-demand to exclude them when tree-shaking code that are not using any of the iterators.
const ensureForEachImplementations = <R>(
  target: any,
  error: any,
  retry: () => R
): R => {
  if (target == null || target?.[forEachSymbol]) {
    throw error;
  }
  let scope = findDeclaringScope(target);
  if (!scope) {
    throw error;
  }

  const forEachIterable: () => ForEachFunction =
    // Factory to generate separate functions for each prototype. JavaScript JIT compilers probably like that.
    () => (target, projection, mapped, seed, context) => {
      let projected: any,
        i = 0;
      for (const item of target) {
        if (
          (projected = projection
            ? projection(item, i++, seed, context)
            : item) !== skip
        ) {
          if (projected === stop) {
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

  scope.Array.prototype[forEachSymbol] = ((
    target: any[],
    projection,
    mapped,
    seed,
    context
  ) => {
    let projected: any, item: any;
    for (let i = 0, n = target.length; i < n; i++) {
      item = target[i];
      if (
        (projected = projection ? projection(item, i, seed, context) : item) !==
        skip
      ) {
        if (projected === stop) {
          break;
        }
        seed = projected;
        if (mapped) {
          mapped.push(projected);
        }
        if (stopInvoked) {
          stopInvoked = false;
          break;
        }
      }
    }
    return mapped || seed;
  }) satisfies ForEachFunction;

  const genericForEachIterable = forEachIterable();
  scope.Object.prototype[forEachSymbol] = ((
    target,
    projection,
    mapped,
    seed,
    context
  ) => {
    if (target[symbolIterator]) {
      if (target.constructor === Object) {
        return genericForEachIterable(
          target,
          projection,
          mapped,
          seed,
          context
        );
      }
      return (Object.getPrototypeOf(target)[forEachSymbol] = forEachIterable())(
        target,
        projection,
        mapped,
        seed,
        context
      );
    }
    let projected: any,
      item: any,
      i = 0;
    for (const key in target) {
      item = [key, target[key]];
      if (
        (projected = projection
          ? projection(item, i++, seed, context)
          : item) !== skip
      ) {
        if (projected === stop) {
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
  }) satisfies ForEachFunction;

  scope.Object.prototype[asyncIteratorFactorySymbol] = function () {
    if (this[symbolIterator] || this[symbolAsyncIterator]) {
      if (this.constructor === Object) {
        return this[symbolAsyncIterator]() ?? this[symbolIterator]();
      }
      const proto = Object.getPrototypeOf(this);
      proto[asyncIteratorFactorySymbol] =
        proto[symbolAsyncIterator] ?? proto[symbolIterator];
      return this[asyncIteratorFactorySymbol]();
    }

    return iterateEntries(this);
  };

  for (const proto of [
    scope.Map.prototype,
    scope.WeakMap.prototype,
    scope.Set.prototype,
    scope.WeakSet.prototype,
    // Generator function
    Object.getPrototypeOf(function* () {}),
  ]) {
    proto[forEachSymbol] = forEachIterable();
    proto[asyncIteratorFactorySymbol] = proto[symbolIterator];
  }

  scope.Number.prototype[forEachSymbol] = ((
    target,
    projection,
    mapped,
    seed,
    context
  ) =>
    genericForEachIterable(
      range(target),
      projection,
      mapped,
      seed,
      context
    )) satisfies ForEachFunction;
  scope.Number.prototype[asyncIteratorFactorySymbol] = range;

  scope.Function.prototype[forEachSymbol] = ((
    target,
    projection,
    mapped,
    seed,
    context
  ) =>
    genericForEachIterable(
      traverse(target),
      projection,
      mapped,
      seed,
      context
    )) satisfies ForEachFunction;

  scope.Function.prototype[asyncIteratorFactorySymbol] = traverse;

  return retry();
};

export type ForEachFunction = (
  target: any,
  projection: IterationProjection<any, any, any> | undefined,
  mapped: any[] | undefined,
  seed: any,
  context: any
) => any;

// #endregion

export function* range(length: number = this) {
  for (let i = 0; i < length; i++) yield i;
}

export function* traverse(
  next: <T>(current: T | undefined) => T | Nullish = this
) {
  let item: any = undefined;
  while ((item = next(item)) !== undefined) yield item;
}

function* iterateEntries(source: any) {
  for (const key in source) {
    yield [key, source[key]];
  }
}

export const forEach: {
  <Source extends IterationSource>(source: Source): MaybeNullishOrFalse<
    IteratorItem<Source> | undefined,
    Source
  >;
  <
    Source extends IterationSource,
    Projected,
    Signal extends typeof skip | typeof stop | never,
    Accumulator extends Projected | undefined = undefined,
    Context = Source
  >(
    source: Source,
    projection:
      | IterationProjection<Source, Accumulator, Projected | Signal, Context>
      | Nullish,
    seed?: Accumulator,
    context?: Context
  ): MaybeNullishOrFalse<IterationProjected<Projected> | Accumulator, Source>;
} = (source: any, projection?: any, seed?: any, context?: any) => {
  try {
    return source
      ? source[forEachSymbol](source, projection, undefined, seed, context) ??
          seed
      : source == null
      ? source
      : undefined;
  } catch (e) {
    return ensureForEachImplementations(source, e, () =>
      forEach(source, projection, seed, context)
    );
  }
};

export let map: {
  <
    Source extends IterationSource,
    Projected,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never, // Otherwise Projected may be `symbol`
    Target = undefined,
    Context = Source
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>,
    target?: Target & IterationProjected<Projected>[],
    seed?: Accumulator,
    context?: Context
  ): MaybeNullishOrFalse<
    IterationProjected<Projected>[] extends Target
      ? Target
      : IterationProjected<Projected>[],
    Source
  >;

  <Source extends IterationSourceOf<T>, T, Target = never[]>(
    source: Source,
    projection?: undefined | null,
    target?: Target & T[],
    seed?: any,
    context?: any
  ): Target extends never[] ? IterationResultArray<Source> : Target;
} = (
  source: any,
  projection?: any,
  target = [],
  seed?: any,
  context = source
) => {
  try {
    return !source && source !== 0 && source !== ""
      ? source == null
        ? source
        : undefined
      : source[forEachSymbol](source, projection, target, seed, context);
  } catch (e) {
    return ensureForEachImplementations(source, e, () =>
      map(source, projection, target, seed, context)
    );
  }
};

export const batch = <T, Arg>(
  source: Arg & Iterable<T>,
  batchSize: number
): MaybeNullish<T[][], Arg> => {
  if (source == null) return source;

  const batches: T[][] = [];
  let batch: T[] = [];
  for (const item of source) {
    batch.push(item);
    if (batch.length === batchSize) {
      batches.push(batch);
      batch = [];
    }
  }
  if (batch.length > 0) {
    batches.push(batch);
  }
  return batches as any;
};

type FilterTruish<T extends readonly any[]> = T extends readonly [
  infer T,
  ...infer Rest
]
  ? T extends Falsish
    ? FilterTruish<Rest>
    : [T, ...FilterTruish<Rest>]
  : T extends readonly []
  ? []
  : T extends readonly (infer T)[]
  ? Exclude<T, Falsish>[]
  : never;

/** Creates an array with the parameters that are not false'ish */
export const truish: {
  <Values extends TupleOrArray<{} | Falsish>>(
    values: Values
  ): FilterTruish<Values>;
  <Values extends readonly ({} | Falsish)[]>(
    ...values: Values
  ): FilterTruish<Values>;
} = (...values: any[]) =>
  filter(values.length === 1 ? values[0] : values, false) as any;

export let filter: {
  <Source extends IterationSource, Strict extends boolean = true>(
    target: Source,
    /**
     * Whether to filter out only `null` and `undefined` or all false'ish values (`null`, `undefined`, `false`, `""` and `0`).
     * If the latter behavior is preferred, you can also use {@link truish}.
     *
     * @default true
     */
    strict?: Strict
  ): MaybeNullishOrFalse<
    Exclude<
      IteratorItem<Source>,
      typeof skip | typeof stop | (Strict extends true ? Nullish : Falsish)
    >[],
    Source
  >;
  <
    Source extends IterationSource,
    R extends Exclude<IteratorItem<Source>, typeof skip | typeof stop | Falsish>
  >(
    target: Source,
    filter: IterationTypeGuardCallback<Source, R>,
    invert?: boolean
  ): MaybeNullishOrFalse<R[], Source>;

  <Source extends IterationSource>(
    target: Source,
    filter: IterationFilterCallback<Source>,
    invert?: boolean
  ): IterationResultArray<Source>;

  <Source extends IterationSource>(
    target: Source,
    filter: { has(item: Exclude<IteratorItem<Source>, Nullish>): any },
    invert?: boolean
  ): MaybeNullishOrFalse<
    IteratorItem<Exclude<Source, NullishOrFalse>>[],
    Source
  >;
} = (items: any, filter: any = true, invert = false) =>
  map(
    items,
    filter === true
      ? (item) => item ?? skip
      : !filter
      ? (item) => item || skip
      : filter.has
      ? (item) => (item == null || filter.has(item) === invert ? skip : item)
      : (item, index, prev) =>
          !filter(item, index, prev, items) === invert ? item : skip
  );

export const take: {
  <Source extends IterationSource>(
    source: Source,
    count: number,
    projection?: undefined
  ): IterationResultArray<Source>;
  <
    Source extends IterationSource,
    Projected,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never
  >(
    source: Source,
    count: number,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>
  ): MaybeNullishOrFalse<IterationProjected<Projected>[], Source>;
} = (source: any, count: any, projection?: any) =>
  map(
    source,
    (item, index, prev) => (
      index === count + 1 && (stopInvoked = true),
      projection ? projection(item, index, prev) : item
    )
  );
export const first: {
  <Source extends IterationSource, R>(
    source: Source,
    predicate: IterationTypeGuardCallback<Source, R>
  ): R | undefined;
  <Source extends IterationSource>(
    source: Source,
    predicate?: IterationFilterCallback<Source>
  ): IteratorItem<Source> | undefined;
} = (source: any, predicate?: any) =>
  !predicate && isArray(source)
    ? source[0]
    : forEach(
        source,
        (item, index, prev) => (
          (!predicate || predicate(item, index, prev, source)) &&
            (stopInvoked = true),
          item
        )
      );

export const last: {
  <Source extends IterationSource, R>(
    source: Source,
    predicate: IterationTypeGuardCallback<Source, R>
  ): R | undefined;
  <Source extends IterationSource>(
    source: Source,
    predicate?: IterationFilterCallback<Source>
  ): IteratorItem<Source> | undefined;
} = (source: any, predicate?: any) =>
  !predicate && isArray(source)
    ? source[source.length - 1]
    : forEach(source, (item, index, prev) =>
        !predicate || predicate(item, index, prev, source) ? item : skip
      );

export const count = <Source extends IterationSource>(
  source: Source,
  predicate?: IterationFilterCallback<Source>
) => {
  let n = 0;
  forEach(
    source,
    predicate
      ? (item, index, prev) => predicate(item, index, prev, source) && ++n
      : () => ++n
  );
  return n;
};

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
  : T extends string
  ? T
  : T extends Iterable<infer T>
  ? Flat<T, Dec<Depth>>
  : T;

export const flatMap: {
  <
    Source extends IterationSource,
    Projected,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never, // Otherwise R may be `symbol`
    Target = undefined,
    Context = Source,
    Depth extends number = -1
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>,
    depth?: Depth,
    target?: Target & Flat<IterationProjected<Projected>, Depth>[],
    seed?: Accumulator,
    context?: Context
  ): MaybeNullishOrFalse<
    Flat<IterationProjected<Projected>, Depth>[] extends Target
      ? Target
      : Flat<IterationProjected<Projected>, Depth>[],
    Source
  >;

  <Source extends IterationSource, Depth extends number = -1>(
    source: Source,
    projection?: Nullish,
    depth?: Depth,
    target?: any[],
    seed?: any,
    context?: any
  ): Source extends Nullish ? Source : Flat<IteratorItem<Source>, Depth>[];
} = (
  source: any,
  projection?: any,
  depth: any = -1,
  target: any[] = [],
  seed?: any,
  context = source
) =>
  map(
    source,
    (item, index, previous) =>
      (projection ? (item = projection(item, index, previous)) : item) !=
        null &&
      item[Symbol.iterator] &&
      typeof item !== "string" &&
      depth
        ? (flatMap(item, undefined, depth - 1, target, item), skip)
        : item,
    target,
    seed,
    context
  );

type Group2Result<Source, AsMap, Many = true> = AsMap extends true
  ? Source extends Iterable<infer T extends KeyValueType<any>>
    ? Map<Exclude<T[0], undefined>, ToggleArray<T[1], Many>>
    : Source extends { [P in infer Key]: infer Value }
    ? Map<Key, ToggleArray<Value, Many>>
    : never
  : Source extends Iterable<infer T extends KeyValueType>
  ? { [P in Exclude<T[0], undefined>]: ToggleArray<T[1], Many> }
  : Source extends { [P in infer Key]: infer Value }
  ? { [P in Key]: ToggleArray<Value, Many> }
  : never;

export const group: {
  <
    Source extends ObjectSource<any> | NullishOrFalse,
    AsMap extends boolean = true
  >(
    source: Source,
    map?: AsMap
  ): MaybeNullishOrFalse<
    Group2Result<ObjectSourceToObject<Source>, AsMap>,
    Source
  >;

  <Source extends Iterable<KeyValueType<any>> | NullishOrFalse>(
    source: Source,
    map?: true
  ): MaybeNullishOrFalse<
    Group2Result<ObjectSourceToObject<Source>, true>,
    Source
  >;

  <
    Source extends IterationSource,
    Projected extends KeyValueType<keyof any> | Falsish,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never,
    AsMap extends boolean = true
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>,
    map?: AsMap
  ): MaybeNullishOrFalse<
    Group2Result<IterationProjected<Projected, Falsish>[], AsMap>,
    Source
  >;
  <
    Source extends IterationSource,
    Projected extends KeyValueType<any> | Falsish,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>,
    map?: true
  ): MaybeNullishOrFalse<
    Group2Result<IterationProjected<Projected, Falsish>[], true>,
    Source
  >;
} = (source: any, projection?: any, map?: any) => {
  if (projection != null && typeof projection !== "function") {
    [projection, map] = [undefined, projection];
  }
  let groups: any, kv: [any, any];
  forEach(
    source,
    map !== false
      ? ((groups = new Map()),
        (item, index, prev) => {
          kv = projection ? projection(item, index, prev) : item;
          if (kv[0] !== undefined) {
            get(groups, kv[0], () => []).push(kv[1]);
          }
        })
      : ((groups = {}),
        (item, index, prev) =>
          (kv = projection ? projection(item, index, prev) : item) &&
          kv[0] !== undefined &&
          (groups[kv[0]] ??= []).push(kv[1]))
  );

  return groups;
};

export let forEachAwait: {
  <Source extends AsyncIterationSource | Nullish>(source: Source): Promise<
    MaybeNullish<AsyncIterationItem<Source>, Source> | undefined
  >;
  <
    Source extends AsyncIterationSource | Nullish,
    Projected,
    Accumulated extends UnwrapPromiseLike<Projected>,
    Signal extends typeof skip | typeof stop | never,
    Context = Source
  >(
    source: Source,
    projection:
      | AsyncIterationProjection<
          Source,
          Accumulated,
          EncourageTuples<Projected> | Signal,
          Context
        >
      | Nullish,
    seed?: Accumulated,
    context?: Context
  ): Promise<MaybeNullish<AsyncItProjection<Projected>, Source> | undefined>;
} = (source: any, projection?: any, seed?: any, context?: any) => {
  try {
    return iterateAsync(source, projection, undefined, seed, context);
  } catch (e) {
    return ensureForEachImplementations(source, e, () =>
      forEachAwait(source, projection, seed, context)
    );
  }
};

export let mapAwait: {
  <
    Source extends IterationSource,
    Projected,
    Accumulator extends UnwrapPromiseLike<Projected>,
    Signal extends typeof skip | typeof stop | never, // Otherwise R may be `symbol`
    Target = undefined,
    Context = Source
  >(
    source: Source,
    projection: AsyncIterationProjection<
      Source,
      Accumulator,
      Projected | Signal
    >,
    target?: Target & AsyncItProjection<Projected>[],
    seed?: Accumulator,
    context?: Context
  ): Promise<
    MaybeNullishOrFalse<
      AsyncItProjection<Projected>[] extends Target
        ? Target
        : AsyncItProjection<Projected>[],
      Source
    >
  >;

  <Source extends AsyncIterationSourceOf<T>, T, Target = never[]>(
    source: Source,
    projection?: undefined | null,
    target?: Target & T[],
    seed?: any,
    context?: any
  ): Promise<
    Target extends never[]
      ? IterationResultArray<Iterable<AsyncIterationItem<Source>>>
      : Target
  >;
} = (source: any, projection: any, target = [], seed: any, context: any) => {
  try {
    return iterateAsync(source, projection, target, seed, context);
  } catch (e) {
    return ensureForEachImplementations(source, e, () =>
      mapAwait(source, projection, target, seed, context)
    );
  }
};

const iterateAsync = async (
  source: any,
  projection?: IterationProjection<any, any, any, any> | Nullish,
  mapped?: any[],
  seed?: any,
  context?: any
) => {
  if ((source = await source) == null) return source;
  if (source === false) return undefined;

  const iterator = source[asyncIteratorFactorySymbol]() as AsyncIterator<any>;

  let result: IteratorResult<any>;
  let projected: any,
    i = 0;

  while ((result = iterator.next() as any)) {
    if (isPromiseLike(result)) {
      result = await result;
    }
    if (result.done) {
      break;
    }

    let item = result.value;
    if (isPromiseLike(item)) {
      item = await item;
    }
    if (
      (projected = await (projection
        ? projection(item, i++, seed, context)
        : item)) !== skip
    ) {
      if (projected === stop) {
        break;
      }
      seed = projected;
      mapped?.push(projected);
      if (stopInvoked) {
        stopInvoked = false;
        break;
      }
    }
  }

  return mapped || seed;
};

export const collect = <T, Nulls>(
  source: T | Iterable<T> | Nulls,
  generator: (item: T) => Iterable<T> | T | typeof skip | typeof stop,
  includeSelf = true,
  collected?: Set<T>
): MaybeNullish<Set<T>, Nulls> => {
  if (source == null) return source as any;
  const root = collected;
  collected ??= new Set();
  if (source[symbolIterator] && typeof source !== "string") {
    for (const item of source as Iterable<any>) {
      if ((collect(item, generator, includeSelf, collected) as any) === stop) {
        break;
      }
    }
  } else if (!collected.has(source as any)) {
    if (includeSelf) {
      collected.add(source as any);
    }
    let generated = generator(source as any);
    if (generated === stop) return root ? stop : (collected as any);
    if (generated !== skip) {
      collect(generated, generator, true, collected);
    }
  }
  return collected as any;
};

export const distinct = <T>(
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
  source == null
    ? source
    : source instanceof Set
    ? source
    : (new Set(
        source[symbolIterator] && typeof source !== "string"
          ? source
          : ([source] as any)
      ) as any);

export const iterable = <T>(
  source: T
): T extends undefined ? [] : T extends Iterable<any> ? T : [T] =>
  source === void 0
    ? []
    : source?.[symbolIterator] && typeof source !== "string"
    ? source
    : ([source] as any);

export const array = <T>(
  source: T
): unknown extends T
  ? any[]
  : T extends Nullish
  ? T
  : T extends readonly any[]
  ? T
  : T extends Iterable<infer Item>
  ? Item[]
  : [T] =>
  source == null
    ? source
    : isArray(source)
    ? source
    : source[symbolIterator] && typeof source !== "string"
    ? [...(source as any)]
    : ([source] as any);

export const some: {
  <Source extends IterationSource>(
    source: Source,
    predicate?: IterationFilterCallback<Source>
  ): boolean;
} = (source, predicate) =>
  forEach(source, (item, index, prev) =>
    (predicate ? predicate(item, index, prev, source) : item)
      ? (stopInvoked = true)
      : item
  ) === true;

export const all: {
  <Source extends IterationSource>(
    source: Source,
    predicate?: IterationFilterCallback<Source>
  ): boolean;
} = (source, predicate) =>
  forEach(source, (item, index, prev) =>
    !(predicate ? predicate(item, index, prev, source) : item)
      ? !(stopInvoked = true)
      : item
  ) !== false;

type ConcatResult<T extends readonly any[]> = [Nullish | T[number]] extends [
  Nullish
]
  ? undefined
  : {
      [P in keyof T]: T[P] extends infer T
        ? unknown extends T
          ? any
          : T extends Iterable<infer T>
          ? T
          : T extends Nullish
          ? never
          : T
        : never;
    }[number][];
export const concat: {
  <T extends readonly any[]>(args: T): ConcatResult<T>;
  <T extends readonly any[]>(...args: T): ConcatResult<T>;
} = (arg0: any, ...other: any[]) => {
  if (other.length || !isIterable(arg0)) {
    arg0 = [arg0, ...other];
  }

  let result: any[] | undefined;
  for (const arg of arg0) {
    if (arg == null) continue;
    if (isIterable(arg)) {
      (result ??= []).push(...arg);
      continue;
    }
    (result ??= []).push(arg);
  }
  return result as any;
};

const sortCompare = (x: Sortable, y: Sortable, descending: boolean) =>
  (descending ? -1 : 1) *
  (x === y
    ? 0
    : typeof x === "string"
    ? typeof y === "string"
      ? x.localeCompare(y)
      : 1
    : typeof y === "string"
    ? -1
    : x == null
    ? y == null
      ? 0
      : -1
    : y == null
    ? 1
    : (x as any) - (y as any));

export const sort: {
  <T extends Sortable, Source>(
    items: Source & (Iterable<T> | Nullish),
    descending?: boolean
  ): Source extends Nullish ? T : IteratorItem<T>[];

  <T, Source>(
    items: Source & (Iterable<T> | undefined),
    selector: MaybeArray<(item: T) => Sortable>,
    descending?: boolean
  ): Source extends Nullish ? T : T[];
} = (items: any, selector: any, descending?: any) =>
  (array(items) as any[]).sort(
    typeof selector === "function"
      ? (x, y) => sortCompare(selector(x), selector(y), descending)
      : isArray(selector)
      ? selector.length
        ? (x, y) => {
            let c = 0;
            for (let i = 0; i < selector.length && !c; i++) {
              c = sortCompare(selector[i](x), selector[i](y), descending);
            }
            return c;
          }
        : (x, y) => sortCompare(x, y, descending)
      : (x, y) => sortCompare(x, y, selector)
  );

export const topoSort = <Source, T>(
  items: (Iterable<T> | Nullish) & Source,
  dependencies: (item: T) => Iterable<T> | Nullish,
  format?: Selector<T>
): MaybeNullish<T[], Source> => {
  if (items == null) return items as any;

  type Info = [item: T, dependents: Info[], blockingEdges: Set<T>];

  let clear: Info[] = [];
  let mapped: T[] = [];

  const edges = new Map<T, Info>(
    map(items, (item) => [item, [item, [], null!]])
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
    ? (mapped as any)
    : throwError(
        `Cyclic dependencies: ${itemize(
          map(edges, ([, info]) =>
            info[2]?.size
              ? (format = normalizeSelector(format))(info[0]) +
                " depends on " +
                itemize(info[2], format)
              : skip
          )
        )}.`
      );
};

const normalizeSelector = (selector: Selector, require = false) =>
  typeof selector === "function"
    ? selector
    : selector != null
    ? (item: any) =>
        (item = item[selector]) === undefined && require ? skip : item
    : (item: any) => item;

type ReduceFunction<Default = undefined, By = false> = {
  <T extends number>(source: readonly [T, ...T[]]): T;
  <Source>(
    source: Source & Iterable<number | undefined>
  ): Source extends Nullish ? Source : IteratorItem<Source> | Default;
  <
    Source extends IterationSource,
    Projected extends number | undefined,
    Signal extends typeof skip | typeof stop | never,
    Accumulator extends Projected = any,
    Item extends boolean = false
  >(
    ...args: [
      source: Source,
      projection: IterationProjection<Source, Accumulator, Projected | Signal>,
      ...(true extends By ? [returnItem?: Item] : [])
    ]
  ): Source extends Nullish
    ? Source
    : Item extends true
    ? IteratorItem<Source>
    : number | Default;
};

const reduce = (
  source: any,
  projection: any,
  reduce: (current: number | undefined, value: number) => number | undefined,
  returnItem = false
) => {
  let value: number | undefined;
  let result: any;
  forEach(
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
  );
  return result;
};

export const min: ReduceFunction<undefined, true> = (
  source: any,
  projection?: any,
  by?: boolean
) =>
  !projection && isArray(source)
    ? Math.min(...source)
    : reduce(
        source,
        projection,
        (prev, x) => (prev == null || x < prev ? x : prev),
        by
      );

export const max: ReduceFunction<undefined, true> = (
  source: any,
  projection?: any,
  by?: boolean
) =>
  !projection && isArray(source)
    ? Math.max(...source)
    : reduce(
        source,
        projection,
        (prev, x) => (prev == null || x > prev ? x : prev),
        by
      );

export const sum: ReduceFunction<number> = (source: any, projection?: any) =>
  reduce(source, projection, (prev = 0, x) => {
    return prev + x;
  }) || 0;

export const avg: ReduceFunction<number> = (source: any, projection?: any) => {
  let n = 0;
  let sum = reduce(source, projection, (prev = 0, x) => (n++, prev + x));
  return n ? sum / n : undefined;
};

export const keys = Object.keys;

export const hasKeys = (obj: any) => !!keyCount(obj, true);
export const keyCount = (obj: any, some = false) => {
  if (!obj) return 0;
  let count = 0;
  for (const _ in obj) {
    if (++count && some) {
      return 1;
    }
  }
  return count;
};

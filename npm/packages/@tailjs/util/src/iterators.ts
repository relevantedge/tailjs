import {
  add,
  ConstToNormal,
  GeneralizeContstants,
  get,
  hasMethod,
  IsAny,
  isArray,
  isDefined,
  isFalsish,
  isFunction,
  isObject,
  isSet,
  isTruish,
  IterableOrArrayLike,
  KeyValuePairsToObject,
  MAX_SAFE_INTEGER,
  Minus,
  NotFunction,
  RecordType,
  symbolIterator,
  toArray,
  undefined,
  UndefinedNotAny,
} from ".";

export const UTF16MAX = 0xffff;

let stopInvoked = false;
export const stop = (yieldValue?: any) => ((stopInvoked = true), yieldValue);

export const toCharCodes = (s: string) =>
  [...new Array(s.length)].map((_, i) => s.charCodeAt(i));
export const codePoint = (string: string, index: number = 0) =>
  string.codePointAt(index)!;

export type IteratorSource =
  | any
  | null
  | undefined
  | number
  | Iterable<any>
  | NotFunction
  | NavigatingIteratorStep;

export type IteratorSourceOf<T> =
  | (T extends number ? number : never)
  | Iterable<T>
  | (T extends readonly [infer K, infer V]
      ? K extends keyof any
        ? { [P in K]: V }
        : never
      : never)
  | NavigatingIteratorStep<T>;

type IteratorItem<S extends IteratorSource> = IsAny<S> extends true
  ? any
  : S extends number
  ? number
  : S extends RecordType
  ? [keyof S, S[keyof S]]
  : S extends (...args: any) => infer T | undefined
  ? T
  : S extends Iterable<infer T>
  ? T
  : never;

export type IteratorItems<S extends IteratorSource[]> = S extends readonly [
  infer S
]
  ? IteratorItem<S>
  : S extends readonly [infer S, ...infer Rest]
  ? IteratorItem<S> | IteratorItems<Rest>
  : S extends (infer S)[]
  ? IteratorItem<S>
  : never;

export interface IteratorControl<S extends IteratorSource> {
  source: S;
  prev: IteratorItem<S> | undefined;
  skip(): void;
  end(): void;
  end<P>(value: P): P;
}

export type IteratorAction<
  S extends IteratorSource = IteratorSource,
  Projection = IteratorItem<S>,
  Value = IteratorItem<S>
> = (
  value: Value,
  index: number
) => Projection | typeof stop | undefined | void;

type IteratorProjection<
  S extends IteratorSource,
  Projection
> = unknown extends Projection ? IteratorItem<S> : ConstToNormal<Projection>;

type StartEndArgs<S extends IteratorSource> =
  | []
  | (S extends number
      ? [offset?: number]
      : S extends NavigatingIteratorStep<infer T>
      ? [offset?: T, maxIterations?: number]
      : [start?: number, end?: number]);

export type NavigatingIteratorStep<T = any> = (
  current: T | undefined
) => T | undefined;

type FlatIteratorItem<T, D extends number = 1, O = false> = T extends
  | undefined
  | void
  ? never
  : D extends 0
  ? T
  : T extends Iterable<any> | (O extends true ? Record<keyof any, any> : never)
  ? D extends 1
    ? IteratorItem<T>
    : FlatIteratorItem<IteratorItem<T>, Minus<D, 1>, O>
  : T;

type UndefinedIfUndefined<S, T> = S extends null | void | undefined
  ? undefined
  : T;

type ProjectedItem<P> = Exclude<P, undefined | void | typeof stop>;

function* createFilteringIterator<
  S extends IteratorSource,
  P = IteratorItem<S>
>(source: S, action?: IteratorAction<S, P>): Iterable<ProjectedItem<P>> {
  if (!source) return;

  let i = 0;
  for (let item of source as any) {
    action && (item = action(item, i++));
    if (item !== undefined) {
      yield item;
    }
    if (stopInvoked) {
      stopInvoked = false;
      break;
    }
  }
}

function* createObjectIterator<
  S extends Record<keyof any, any>,
  P = IteratorItem<S>
>(source: S, action?: IteratorAction<S, P>): Iterable<P> {
  let i = 0;
  for (const key in source) {
    let value = [key, source[key]] as any;
    action && (value = action(value, i++));

    if (value !== undefined) {
      yield value;
    }
    if (stopInvoked) {
      stopInvoked = false;
      break;
    }
  }
}

function* createRangeIterator(length = 0, offset = 0): Iterable<number> {
  while (length--) yield offset++;
}

export function* createStringIterator(
  input: string,
  start: number,
  end: number
): Iterable<[char: string, codePoint: number]> {
  while (start < end) {
    const codePoint = input.codePointAt(start)!;
    let p = input[start++];
    if (codePoint > UTF16MAX) {
      start++;
      p = String.fromCodePoint(codePoint);
    }
    yield [p, codePoint];
  }
}

export function* createNavigatingIterator<T>(
  step: NavigatingIteratorStep<T>,
  start?: T | undefined,
  maxIterations = Number.MAX_SAFE_INTEGER
): Iterator<T> {
  if (isDefined(start)) yield start;
  while (maxIterations-- && isDefined((start = step(start)))) {
    yield start;
  }
}

const sliceAction = <
  S extends IteratorSource,
  A extends IteratorAction<S, any> | undefined
>(
  action: A,
  start: any,
  end: any
): A =>
  (start ?? end) !== undefined
    ? ((start ??= 0),
      (end ??= MAX_SAFE_INTEGER),
      (value, index) =>
        start--
          ? undefined
          : end!--
          ? action
            ? action(value, index)
            : value
          : end)
    : (action as any);

export type Filter<S extends IteratorSource> = (
  value: IteratorItem<S>,
  index: number
) => any;

const createIterator = <S extends IteratorSource, P = IteratorItem<S>>(
  source: S,
  action?: IteratorAction<S, P>,
  start?: any,
  end?: any
): Iterable<P> =>
  source == null
    ? ([] as any)
    : source[symbolIterator]
    ? createFilteringIterator(
        source,
        start === undefined ? action : sliceAction(action, start as any, end)
      )
    : typeof source === "object"
    ? createObjectIterator(
        source as any,
        sliceAction(action, start as any, end)
      )
    : createIterator(
        isFunction(source)
          ? createNavigatingIterator(source, start, end)
          : (createRangeIterator(source as number, start as any) as any),
        action
      );

const mapToArray = <T, M>(
  projected: Iterable<T>,
  map: M
): true extends M ? T[] : Iterable<T> =>
  map && !isArray(projected) ? [...projected] : (projected as any);

type ProjectFunction = {
  <S extends IteratorSource, R>(
    source: S,
    projection?: IteratorAction<S, R> | null,
    ...rest: StartEndArgs<S>
  ): Iterable<IteratorProjection<S, R>>;
  <S extends IteratorSource>(source: S, ...rest: StartEndArgs<S>): Iterable<
    IteratorItem<S>
  >;
};

type MapFunction = {
  <S extends IteratorSource, R>(
    source: S,
    projection?: IteratorAction<S, R> | null,
    ...rest: StartEndArgs<S>
  ): UndefinedNotAny<S, IteratorProjection<S, R>[]>;
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): UndefinedNotAny<S, IteratorItem<S>[]>;
};

type FlatProjectFunction = <
  S extends IteratorSource,
  D extends number = 1,
  R = IteratorItem<S>,
  O extends boolean = false
>(
  source: S,
  projection?: FlatIteratorAction<S, R, D, O>,
  depth?: D,
  expandObjects?: O,
  ...rest: StartEndArgs<S>
) => FlatIteratorItem<Iterable<R>, D>;

export const project: ProjectFunction = ((
  source: any,
  projection: any,
  start: any,
  end: any
) =>
  projection != null && !isFunction(projection)
    ? // The second argument is the value of `start`.
      createIterator(source, undefined, projection, start)
    : createIterator(source, projection, start, end)) as any;

export const flatProject: FlatProjectFunction = function (
  source,
  projection?,
  depth = 1 as any,
  expandObjects: any = false,
  start?: any,
  end?: any
) {
  return createIterator(
    flatten(
      createIterator(source, undefined, start, end),
      depth + 1,
      expandObjects,
      false
    ),
    projection
  ) as any;

  function* flatten(
    value: any,
    depth: number,
    expandObjects: boolean,
    nested: boolean
  ) {
    if (value != null) {
      if (
        value?.[symbolIterator] ||
        (expandObjects && value && typeof value === "object")
      ) {
        for (const item of nested ? createIterator(value) : value) {
          if (depth > 1 || depth <= 0) {
            yield* flatten(item, depth - 1, expandObjects, true);
          } else {
            yield item;
          }
        }
      } else {
        yield value;
      }
    }
  }
};

export const map: MapFunction = (
  source: any,
  projection?: any,
  start: any = undefined,
  end?: any
) => {
  if (start === undefined && isArray(source)) {
    let i = 0;
    const mapped: any[] = [];
    for (let j = 0, n = source.length; j < n && !stopInvoked; j++) {
      let value = source[j];
      if (projection && value !== undefined) {
        value = projection(value, i++);
      }
      if (value !== undefined) {
        mapped.push(value);
      }
    }
    stopInvoked = false;
    return mapped;
  }
  return source !== undefined
    ? toArray(project(source, projection, start, end))
    : (undefined as any);
};

export const zip = <Lhs extends IteratorSource, Rhs extends IteratorSource>(
  lhs: Lhs,
  rhs: Rhs
): Iterable<[IteratorItem<Lhs>, IteratorItem<Rhs> | undefined]> => {
  const it2 = createIterator(rhs)[Symbol.iterator]();
  return createIterator(lhs, (lhs) => [lhs, it2.next()?.value] as [any, any]);
};

export const distinct: {
  <S extends IteratorSource, R>(
    source: S,
    projection?: IteratorAction<S, R> | null,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : Set<IteratorProjection<S, R>>;
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : Set<IteratorItem<S>>;
} = (source: any, projection?: any, start?: any, end?: any) =>
  isDefined(source)
    ? new Set<any>([...project(source, projection, start, end)])
    : undefined;

export const single: {
  <S extends IteratorSource, R>(
    source: S,
    projection?: IteratorAction<S, R> | null,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : IteratorProjection<S, R> | undefined;
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : IteratorItem<S> | undefined;
} = (source: any, projection?: any, start?: any, end?: any) =>
  !source
    ? undefined
    : (source = mapDistinct(source, projection, start, end) as any).length > 1
    ? undefined
    : source[0];

export const mapDistinct: MapFunction = (
  source: any,
  projection?: any,
  start?: any,
  end?: any
) =>
  isDefined(source)
    ? [...(distinct as any)(source, projection, start, end)]
    : source;

export function* concatIterators<S extends IteratorSource[]>(
  ...iterators: S
): Iterable<IteratorItems<S>> {
  for (const iterator of iterators) {
    if (!iterator) continue;
    yield* createIterator(iterator);
  }
}

type AllCanBeUndefined<T extends any[]> = T extends readonly [infer S]
  ? undefined extends S
    ? true
    : false
  : T extends readonly [infer S, ...infer Rest]
  ? AllCanBeUndefined<Rest> extends false
    ? false
    : undefined extends S
    ? true
    : false
  : true;

export const concat = <S extends (IterableOrArrayLike<any> | undefined)[]>(
  ...iterators: S
):
  | (AllCanBeUndefined<S> extends true ? undefined : never)
  | IteratorItems<S>[] =>
  iterators.reduce(
    (r: undefined | any[], it) => (it ? (r ?? []).concat(toArray(it)) : r),
    undefined
  ) as any;

export const intersection = <
  T,
  A extends Iterable<T> | undefined,
  B extends Iterable<T> | undefined,
  MapToArray extends boolean = A extends any[]
    ? true
    : B extends any[]
    ? true
    : false
>(
  a: A,
  b: B,
  mapToArray?: MapToArray
): MapToArray extends true ? T[] : Iterable<T> => {
  if (!a || !b) return [];
  isSet(b) && ([b, a] = [a, b] as any);
  const lookup = isSet(a) ? a : new Set(a);
  return filter(b, (value) => lookup.has(value), mapToArray) as any;
};

export const intersects = (
  a: Iterable<any> | undefined,
  b: Iterable<any> | undefined
) => !!count(intersection(a, b));

type FlatIteratorAction<
  S extends IteratorSource,
  R = FlatIteratorItem<S>,
  D extends number = 1,
  O = false
> = IteratorAction<S, R, FlatIteratorItem<S, D, O>>;

export const flatMap = <
  S extends IteratorSource,
  D extends number = 1,
  O extends boolean = false,
  R = IteratorItem<S>
>(
  source: S,
  action: FlatIteratorAction<S, R, D, O> = (item) => item as any,
  depth: D = 1 as any,
  expandObjects: O = false as any,
  ...rest: StartEndArgs<S>
): FlatIteratorItem<R, D>[] =>
  map(flatProject(source, action, depth, expandObjects, ...rest)) as any;

const traverseInternal = <T>(
  root: T | T[] | undefined,
  selector: (current: T) => Iterable<T> | undefined,
  include: boolean,
  results: T[],
  seen: Set<T>
) => {
  if (isArray(root)) {
    forEachInternal(root, (item) =>
      traverseInternal(item, selector, include, results, seen)
    );
    return results;
  }
  if (!root || !add(seen, root)) {
    return undefined;
  }
  include && results.push(root);
  forEachInternal(selector(root), (item) =>
    traverseInternal(item, selector, true, results, seen)
  );

  return results;
};

type JoinResult<T> = T extends readonly []
  ? never
  : T extends readonly [infer Item, ...infer Rest]
  ?
      | Exclude<Item extends Iterable<infer T> ? T : Item, undefined>
      | JoinResult<Rest>
  : never;

export const join = <T extends readonly any[]>(...items: T): JoinResult<T>[] =>
  items.flatMap((item) => toArray(item) ?? []).filter(isDefined) as any;

export const expand = <T>(
  root: T | T[],
  selector: (
    current: Exclude<T, undefined>
  ) => Iterable<T | undefined> | undefined,
  includeSelf = true
): T extends undefined ? undefined : Exclude<T, undefined>[] =>
  traverseInternal(root, selector, includeSelf, [], new Set()) as any;

const forEachArray = (source: readonly any[], action: any) => {
  let returnValue: any;
  let i = 0;
  for (let j = 0, n = source.length; j < n; j++) {
    if (
      source[j] !== undefined &&
      ((returnValue = action(source[j], i++) ?? returnValue), stopInvoked)
    ) {
      stopInvoked = false;
      break;
    }
  }
  return returnValue;
};

const forEachItereable = (source: Iterable<any>, action: any) => {
  let returnValue: any;
  let i = 0;
  for (let value of source as any) {
    if (
      value !== undefined &&
      ((returnValue = action(value, i++) ?? returnValue), stopInvoked)
    ) {
      stopInvoked = false;
      break;
    }
  }
  return returnValue;
};

const forEachObject = (source: any, action: any) => {
  let returnValue: any;
  let i = 0;
  for (let key in source) {
    if (
      ((returnValue = action([key, source[key]], i++) ?? returnValue),
      stopInvoked)
    ) {
      stopInvoked = false;
      break;
    }
  }
  return returnValue;
};

const forEachInternal: <S extends IteratorSource, R>(
  source: S,
  action: IteratorAction<S, R>,
  start?: any,
  end?: any
) => R | undefined = (source, action, start = undefined, end?: any) => {
  if (source == null) return;

  let returnValue: any;
  if (start === undefined) {
    if (isArray(source)) return forEachArray(source, action);
    if (source[symbolIterator]) return forEachItereable(source as any, action);
    if (typeof source === "object") return forEachObject(source, action);
  }

  for (const value of createIterator(source, action, start, end)) {
    returnValue = (value as any) ?? returnValue;
  }

  return returnValue;
};

export const forEach = forEachInternal as <S extends IteratorSource, R>(
  source: S,
  action: IteratorAction<S, R>,
  ...rest: StartEndArgs<S>
) => R | undefined;

export const flatForEach = <
  S extends IteratorSource,
  R,
  Depth extends number,
  O extends boolean = false
>(
  source: S,
  action: FlatIteratorAction<S, R, Depth, O>,
  depth: Depth = 1 as any,
  expandObjects: O = false as any,
  ...rest: StartEndArgs<S>
): R | undefined =>
  forEachInternal(
    flatProject(source, undefined, depth, expandObjects, ...(rest as any)),
    action as any
  ) as any;

export const obj: {
  <S extends IteratorSource, P extends readonly [keyof any, any]>(
    source: S,
    selector: IteratorAction<S, P>,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<P>;
  <S extends IteratorSourceOf<readonly [keyof any, any]>>(
    source: S,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<IteratorItem<S>>;
} = ((source: any, selector: any, ...rest: any[]) =>
  Object.fromEntries((map as any)(source, selector, ...rest))) as any;

export const groupReduce: <
  S extends IteratorSource,
  Key,
  Accumulator = unknown
>(
  source: S,
  keySelector: (item: IteratorItem<S>, index: number) => Key,
  reducer: (
    accumulator: GeneralizeContstants<Accumulator>,
    ...rest: Parameters<IteratorAction<S, Accumulator>>
  ) => Accumulator,
  seed?: Accumulator | (() => Accumulator),
  ...reset: StartEndArgs<S>
) => Map<Key, Accumulator> = (
  source,
  keySelector,
  reducer,
  seed,
  start?: any,
  end?: any
) => {
  const groups = new Map<any, any>();
  const seedFactory = () => (isFunction(seed) ? seed() : seed);
  const action: IteratorAction<any, any> = (item, index) => {
    const key = keySelector(item, index);
    let acc = groups.get(key) ?? seedFactory();
    const value = reducer(acc, item, index);
    if (isDefined(value)) {
      groups.set(key, value);
    }
  };
  forEachInternal(source, action, start, end);
  return groups as any;
};

export const group: <S extends IteratorSource, Key, R = IteratorItem<S>>(
  source: S,
  keySelector: (item: IteratorItem<S>, index: number) => Key,
  valueSelector?: (item: IteratorItem<S>, index: number) => R,
  ...rest: StartEndArgs<S>
) => S extends undefined ? undefined : Map<Key, R[]> = (
  source,
  keySelector,
  valueSelector = (item: any) => item,
  start?: any,
  end?: any
) => {
  if (source == null) return undefined as any;
  const groups = new Map<any, any[]>();
  (forEachInternal as any)(
    source,
    (item: any, index: number) => {
      const key = keySelector(item, index);
      const value = valueSelector(item, index);
      get(groups, key as any, () => []).push(value);
    },
    start,
    end
  );
  return groups as any;
};

export const reduce: <
  S extends IteratorSource,
  Reducer extends (
    ...args: [
      accumulator: unknown extends Accumulator
        ? any
        : GeneralizeContstants<Accumulator>,
      ...rest: Parameters<IteratorAction<S, Accumulator>>
    ]
  ) => GeneralizeContstants<Accumulator>,
  Accumulator
>(
  source: S,
  reducer: Reducer,
  seed?: Accumulator | (() => Accumulator),
  ...rest: StartEndArgs<S>
) => Reducer extends (...args: any) => infer R
  ? R | (unknown extends Accumulator ? undefined : never)
  : never = (source, reducer, seed, start?: any, end?: any) => {
  const seedFactory = () => (isFunction(seed) ? seed() : seed);
  return (
    forEachInternal(
      source,
      (value, index) =>
        (seed =
          ((reducer as any)(seed as any, value, index) as any) ??
          seedFactory()),
      start,
      end
    ) ?? (seedFactory() as any)
  );
};

type FilterItem<S extends IteratorSource, F> = F extends (
  value: any,
  ...args: any
) => value is infer T
  ? T
  : IteratorItem<S>;

export const filter: {
  <
    S extends IteratorSource,
    MapToArray extends boolean = S extends any[] ? true : false,
    P extends Filter<S> = Filter<S>
  >(
    source: S,
    predicate?: P,
    map?: MapToArray,
    ...rest: StartEndArgs<S>
  ): MapToArray extends true
    ? UndefinedIfUndefined<S, FilterItem<S, P>[]>
    : Iterable<FilterItem<S, P>>;
} = (
  source: IteratorSource,
  predicate: Filter<any> = (item: any) => item != null,
  map = isArray(source) as any,
  start?: any,
  end?: any
) =>
  mapToArray(
    createIterator(
      source,
      (item, index) => (predicate(item, index) ? item : undefined),
      start,
      end
    ),
    map
  ) as any;

let filterInternal = filter;

export const count: <S>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
) => UndefinedIfUndefined<S, number> = (
  source: IteratorSource,
  filter?: Filter<IteratorSource>,
  start?: any,
  end?: any
) => {
  if (!source) return undefined as any;

  let n: number;
  if (filter) {
    source = filterInternal(source, filter, false, start, end) as any;
  } else {
    if (isDefined((n = source!["length"] ?? source!["size"]))) {
      return n;
    }
    if (!source[symbolIterator]) {
      return Object.keys(source).length;
    }
  }
  n = 0;
  return forEachInternal(source, () => ++n) as any;
};

export const sum: {
  <S extends IteratorSourceOf<number>>(
    source: S,
    selector?: IteratorAction<S, number>,
    ...rest: StartEndArgs<S>
  ): number;
  <S extends IteratorSource>(
    source: S,
    selector: IteratorAction<S, number>,
    ...rest: StartEndArgs<S>
  ): number;
} = (
  source: any,
  selector: any = (item: any) => item,
  start?: any,
  end?: any
) =>
  reduce(
    source,
    (sum, value, index) => sum + (selector(value, index) ?? 0),
    0,
    start,
    end
  );

export const values: <S extends IteratorSource>(
  source: S,
  ...rest: StartEndArgs<S>
) => UndefinedIfUndefined<
  S,
  IteratorItem<S> extends readonly [any, infer Item] ? Item : IteratorItem<S>
> = (source, start?: any, end?: any) =>
  (map as any)(
    source,
    isObject(source) ? (item: any) => item[1] : (item: any) => item,
    start,
    end
  );

export const keys: <S extends IteratorSource>(
  source: S,
  ...rest: StartEndArgs<S>
) => UndefinedIfUndefined<
  S,
  IteratorItem<S> extends readonly [infer Key, any] ? Key : number
> = (source, start?: any, end?: any) =>
  (map as any)(
    source,
    isObject(source) ? (item: any) => item[0] : (_item: any, i: number) => i,
    start,
    end
  );

export const first: <S extends IteratorSource>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
) => IteratorItem<S> | undefined = (
  source,
  predicate?: Filter<any>,
  start?: any,
  end?: any
) =>
  !source || isArray(source)
    ? source?.[0]
    : forEachInternal(
        source,
        (value, i) =>
          !predicate || predicate(value, i) ? stop(value) : undefined,
        start,
        end
      );

export const last: <S extends IteratorSource>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
) => IteratorItem<S> | undefined = (
  source,
  predicate?: any,
  start?: any,
  end?: any
) =>
  !source
    ? undefined
    : isArray(source)
    ? source[source.length - 1]
    : forEachInternal(
        source,
        (item, i) => (!predicate || predicate(item, i) ? item : undefined),
        start,
        end
      );

export const find = <S extends IteratorSource>(
  source: S,
  predicate: Filter<S>,
  ...rest: StartEndArgs<S>
): UndefinedIfUndefined<S, IteratorItem<S>> =>
  !source
    ? undefined
    : (source as any).find
    ? (source as any).find(predicate)
    : first(filterInternal(source as any, predicate, false, ...rest));

export const some: <S extends IteratorSource>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
) => UndefinedIfUndefined<S, boolean> = (
  source,
  predicate,
  start?: any,
  rangeEnd?: any
) =>
  source === undefined
    ? undefined
    : hasMethod(source, "some")
    ? source.some(predicate ?? isTruish)
    : forEachInternal<any, boolean>(
        source,
        predicate
          ? (item, index) => (predicate(item, index) ? stop(true) : false)
          : () => stop(true),
        start,
        rangeEnd
      ) ?? false;

export const every = <S extends IteratorSource>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
): UndefinedIfUndefined<S, boolean> =>
  !source
    ? undefined
    : (!some(
        source,
        predicate ? (item, index) => !predicate(item, index) : isFalsish,
        ...rest
      ) as any);

export const binarySearch: {
  (arr: Array<number>, find: number): number;
  <T = number>(arr: Array<T>, find: T, compare: (x: T, y: T) => number): number;
} = <T = number>(
  arr: Array<T>,
  find: T,
  compare: (x: T, y: T) => number = ((x: any, y: any) => x - y) as any
) => {
  let m = 0;
  let n = arr.length - 1;
  let cmp: number;
  let k: number;
  while (m <= n) {
    k = (n + m) >> 1;
    cmp = compare(find, arr[k]);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return ~m;
};

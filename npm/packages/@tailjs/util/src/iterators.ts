import { isSet } from "util/types";
import {
  ConstToNormal,
  GeneralizeContstants,
  IsAny,
  IterableOrArrayLike,
  KeyValuePairsToObject,
  Minus,
  get,
  hasMethod,
  hasValue,
  isArray,
  isDefined,
  isFalsish,
  isFunction,
  isIterable,
  isObject,
  isTruish,
  isUndefined,
  toArray,
} from ".";

export const UTF16MAX = 0xffff;

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
  | { [P in keyof any]: any }
  | NavigatingIteratorStep;

export type IteratorSourceOf<T> =
  | (T extends number ? number : never)
  | Iterable<T>
  | (T extends [infer K, infer V]
      ? K extends keyof any
        ? { [P in K]: V }
        : never
      : never)
  | NavigatingIteratorStep<T>;

type IteratorItem<S extends IteratorSource> = IsAny<S> extends true
  ? any
  : S extends number
  ? number
  : S extends Record<any, any> & { [Symbol.iterator]?: never }
  ? S extends (...args: any) => infer T | undefined
    ? T
    : [keyof S, S[keyof S]]
  : S extends Iterable<infer T>
  ? T
  : never;

export type IteratorItems<S extends IteratorSource[]> = S extends [infer S]
  ? IteratorItem<S>
  : S extends [infer S, ...infer Rest]
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
  Projection = IteratorItem<S>
> = (
  value: IteratorItem<S>,
  index: number,
  control: IteratorControl<S>
) => Projection | undefined | void;

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

type FlatIteratorItem<T, Depth extends number = 1> = T extends undefined | void
  ? never
  : Depth extends 0
  ? FlatIteratorItem<T, 100>
  : T extends Iterable<infer T>
  ? Depth extends 1
    ? T
    : FlatIteratorItem<T, Minus<Depth, 1>>
  : T;

type UndefinedIfUndefined<S, T> = S extends null | void | undefined
  ? undefined
  : T;

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

const sliceIterator = <T>(
  source: Iterable<T>,
  start = 0,
  end?: number
): Iterable<T> => {
  if (!start && !isDefined(end)) {
    return source;
  }

  if (source["slice"]) {
    return source["slice"](start, end);
  } else if (start < 0 || end! < 0) {
    return sliceIterator([...source], start, end);
  }

  return (function* () {
    end ??= Number.MAX_SAFE_INTEGER;

    for (const item of source) {
      if (start--) continue;
      if (!end--) break;
      yield item;
    }
  })();
};

export type Filter<S extends IteratorSource> = (
  value: IteratorItem<S>,
  index: number
) => any;

const filterIterator = <T>(
  source: Iterable<T>,
  filter: Filter<Iterable<T>> = isTruish
): Iterable<T> => {
  if (isArray(source)) return source.filter(filter);
  return (function* () {
    let i = 0;
    for (const item of source) {
      if (filter(item, i++)) {
        yield item;
      }
    }
  })();
};

const enum IterationFlag {
  Yield = 0,
  Skip = 1,
  YieldThenEnd = 2,
  End = 3,
}

// Important, this must only be called if the action has less than 3 arguments (no requirement for control).
const createFilteringIterator = <S extends Iterable<any>, P = IteratorItem<S>>(
  source: S,
  action?: (value: IteratorItem<S>, index: number) => P
) => {
  if (isArray(source)) {
    const mapped = (action ? source.map(action as any) : source).filter(
      isDefined
    );
    return mapped;
  }

  return (function* (source: S, capturedAction: typeof action) {
    let i = 0;
    // Capture the action parameter. Seems like functions that close over variables from outer scope are slower.
    for (let item of source) {
      if (
        isDefined(capturedAction ? (item = capturedAction(item, i++)) : item)
      ) {
        yield item;
      }
    }
  })(source, action);
};

function* createControllableIterator<
  S extends Iterable<any>,
  P = IteratorItem<S>
>(source: S, action: IteratorAction<S, P>) {
  let i = 0;
  let flag = IterationFlag.Yield;
  let result: P | undefined;
  const control: IteratorControl<S> = {
    prev: undefined,
    source,
    skip: () => (flag = IterationFlag.Skip),
    end: (value?: any) => (
      (flag = isDefined(value)
        ? IterationFlag.YieldThenEnd
        : IterationFlag.End),
      value
    ),
  };

  for (const item of source) {
    if ((result = action(item, i++, control!)!) !== undefined && !(flag % 2)) {
      yield result;
      control.prev = item;
    }
    if (flag > 1) {
      break;
    }
    flag = IterationFlag.Yield;
  }
}

const createIterator = <S extends IteratorSource, P = IteratorItem<S>>(
  source: S,
  action?: IteratorAction<S, P>,
  start?: any,
  end?: any
) =>
  action?.length! >= 3
    ? createControllableIterator(mapIterator(source, start, end), action as any)
    : createFilteringIterator(mapIterator(source, start, end), action as any);

const mapIterator = <S extends IteratorSource>(
  source: S,
  start?: any,
  end?: any
): Iterable<IteratorItem<S>> =>
  isIterable(source, true)
    ? isDefined(end)
      ? sliceIterator(mapIterator(source), start, end)
      : source
    : !isDefined(source)
    ? []
    : isObject(source)
    ? (mapIterator(Object.entries(source), start, end) as any)
    : isFunction(source)
    ? (createNavigatingIterator(source, start, end) as any)
    : (createRangeIterator(source as number, start) as any);

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
  ): S extends undefined ? undefined : IteratorProjection<S, R>[];
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : IteratorItem<S>[];
};

type FlatProjectFunction = <
  S extends IteratorSource,
  R = IteratorItem<S>,
  Depth extends number = 1
>(
  source: S,
  projection?: IteratorAction<S, R>,
  depth?: Depth,
  ...rest: StartEndArgs<S>
) => Iterable<FlatIteratorItem<R, Depth>>;

export const project: ProjectFunction = ((
  source: any,
  projection: any,
  start: any,
  end: any
) => {
  if (!isFunction(projection) && hasValue(projection)) {
    [start, end, projection] = [projection, start, end];
  }
  return createIterator(source, projection, start, end);
}) as any;

export const flatProject: FlatProjectFunction = function* (
  source,
  projection?,
  depth = 1 as any,
  start?: any,
  end?: any
) {
  yield* flatten(createIterator(source, projection, start, end), depth);

  function* flatten(value: any, depth: number) {
    if (isIterable(value)) {
      for (const item of value) {
        if (depth > 1 || depth <= 0) {
          yield* flatten(value, depth - 1);
        } else {
          yield* item;
        }
      }
    } else {
      yield value;
    }
  }
};

export const map: MapFunction = (
  source: any,
  projection?: any,
  start?: any,
  end?: any
) => (source ? toArray(project(source, projection, start, end)) : undefined);

export const zip = <Lhs extends IteratorSource, Rhs extends IteratorSource>(
  lhs: Lhs,
  rhs: Rhs
): Iterable<[IteratorItem<Lhs>, IteratorItem<Rhs> | undefined]> => {
  const it2 = mapIterator(rhs)[Symbol.iterator]();
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
    yield* mapIterator(iterator);
  }
}

type AllCanBeUndefined<T extends any[]> = T extends [infer S]
  ? undefined extends S
    ? true
    : false
  : T extends [infer S, ...infer Rest]
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

export const flatMap = <
  S extends IteratorSource,
  R = IteratorItem<S>,
  Depth extends number = 1
>(
  source: S,
  action: IteratorAction<S, R> = (item) => item as any,
  depth: Depth = 1 as any,
  ...rest: StartEndArgs<S>
): FlatIteratorItem<R, Depth>[] =>
  map(flatProject(source, action, depth, ...rest)) as any;

export const forEach: <S extends IteratorSource, R>(
  source: S,
  action: IteratorAction<S, R>,
  ...rest: StartEndArgs<S>
) => R | undefined = (source, action, start?: any, end?: any) => {
  let returnValue: any = undefined;
  for (const value of createIterator(source, action, start, end)) {
    returnValue = value as any;
  }
  return returnValue;
};

export const flatForEach = <S extends IteratorSource, R, Depth extends number>(
  source: S,
  action: IteratorAction<FlatIteratorItem<S>, R>,
  depth: Depth = 1 as any,
  ...rest: StartEndArgs<S>
): R | undefined =>
  forEach(
    flatProject(source, undefined, depth, ...(rest as any)),
    action as any
  ) as any;

export const obj: {
  <S extends IteratorSource, P extends [keyof any, any]>(
    source: S,
    selector: IteratorAction<S, P>,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<P[]>;
  <S extends IteratorSourceOf<[keyof any, any]>>(
    source: S,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<S>;
} = ((source: any, selector: any, ...rest: any[]) =>
  Object.fromEntries((map as any)(source, selector, ...rest))) as any;

export const groupReduce = <
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
  ...rest: StartEndArgs<S>
): Map<Key, Accumulator> => {
  const groups = new Map<any, any>();
  const seedFactory = () => (isFunction(seed) ? seed() : seed);
  const action: IteratorAction<S, any> = (item, index, control) => {
    const key = keySelector(item, index);
    let acc = groups.get(key) ?? seedFactory();
    const value = reducer(acc, item, index, control);
    if (isDefined(value)) {
      groups.set(key, value);
    }
  };
  forEach(
    source,
    reducer.length > 3 ? action : (item, index) => (action as any)(item, index),
    ...rest
  );
  return groups as any;
};

export const group = <S extends IteratorSource, Key, R = IteratorItem<S>>(
  source: S,
  keySelector: (item: IteratorItem<S>, index: number) => Key,
  valueSelector: (item: IteratorItem<S>, index: number) => R = (item: any) =>
    item,
  ...rest: StartEndArgs<S>
): S extends undefined ? undefined : Map<Key, R[]> => {
  if (!source) return undefined as any;

  const groups = new Map<Key, R[]>();
  forEach(
    source,
    (item, index) => {
      const key = keySelector(item, index);
      const value = valueSelector(item, index);
      get(groups, key, () => []).push(value);
    },
    ...rest
  );

  return groups as any;
};

export const reduce = <
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
): Reducer extends (...args: any) => infer R
  ? R | (unknown extends Accumulator ? undefined : never)
  : never => {
  const seedFactory = () => (isFunction(seed) ? seed() : seed);
  return (
    forEach(
      source,
      reducer.length > 3
        ? (value, index, control) =>
            (seed =
              (reducer(seed as any, value, index, control as any) as any) ??
              seedFactory())
        : (value, index) =>
            (seed =
              ((reducer as any)(seed as any, value, index) as any) ??
              seedFactory()),
      ...rest
    ) ?? (seed as any)
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
  map
    ? !source
      ? undefined
      : isArray(source)
      ? source.filter(predicate)
      : toArray((filter as any)(source, predicate, false, start, end))
    : (filterIterator(
        mapIterator(source, start, end) as any,
        predicate
      ) as any);

let filterInternal = filter;

export const count: <S>(
  source: S,
  filter?: Filter<S>,
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
    if (isObject(source)) {
      return Object.keys(source).length;
    }
    source = mapIterator(source, start, end);
  }
  n = 0;
  return forEach(source, () => ++n) as any;
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
    (sum, value, index, control) =>
      sum + (selector(value, index, control) ?? 0),
    0,
    start,
    end
  );

export const first = <S extends IteratorSource>(
  source: S,
  ...rest: StartEndArgs<S>
): IteratorItem<S> | undefined => {
  if (!source || isArray(source)) return source?.[0];
  for (const item of mapIterator(source, ...rest)) {
    return item;
  }
  return undefined;
};

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

export const some = <S extends IteratorSource>(
  source: S,
  predicate?: Filter<S>,
  ...rest: StartEndArgs<S>
): UndefinedIfUndefined<S, boolean> =>
  !source
    ? undefined
    : isUndefined(predicate)
    ? count(source) > 0
    : hasMethod(source, "some")
    ? source.some(
        predicate
          ? (item: any, index: number) => predicate(item, index)
          : isTruish
      )
    : predicate
    ? some(filterInternal(source as any, predicate, false, ...rest))
    : forEach<any, boolean>(source, (item, index, { end }) => end(true)) ??
      false;

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

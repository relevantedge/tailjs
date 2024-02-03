import {
  ConstToTuples,
  GeneralizeContstants,
  IsAny,
  KeyValuePairsToObject,
  hasMethod,
  hasValue,
  isArray,
  isDefined,
  isFalsish,
  isFunction,
  isIterable,
  isObject,
  isTruish,
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
  ? T extends string
    ? string
    : T
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

type AnyTuple = [any, ...any[]];

type IteratorProjection<
  S extends IteratorSource,
  Projection,
  TupleProjection extends AnyTuple
> = unknown extends Projection
  ? IteratorItem<S>
  : TupleProjection extends Projection
  ? ConstToTuples<TupleProjection>
  : ConstToTuples<Projection>;

type StartEndArgs<S extends IteratorSource> = S extends number
  ? [offset?: number]
  : S extends NavigatingIteratorStep<infer T>
  ? [offset?: T, maxIterations?: number]
  : [start?: number, end?: number];

export type NavigatingIteratorStep<T = any> = (
  current: T | undefined
) => T | undefined;

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
  } else if (start < 0 || (end as any) < 0) {
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
  filter: (item: T, index: number) => any
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

function* createControllableIterator<
  S extends Iterable<any>,
  P = IteratorItem<S>
>(
  source: S,
  action: IteratorAction<S, P> = (item) => item as any,
  collect?: (result: P) => void
) {
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
    if ((result = action(item, i++, control)!) !== undefined && !(flag % 2)) {
      if (!collect) {
        yield result;
      } else {
        collect(result);
      }
      control.prev = item;
    }
    if (flag > 1) {
      break;
    }
    flag = IterationFlag.Yield;
  }
}

const mapIterator = <S extends IteratorSource>(
  source: S,
  start?: any,
  end?: any
) => {
  if (isIterable(source, true)) {
    return start || end
      ? sliceIterator(mapIterator(source), start, end)
      : source;
  }
  if (!isDefined(source)) return [];
  if (isObject(source)) return mapIterator(Object.entries(source), start, end);
  if (isFunction(source)) return createNavigatingIterator(source, start, end);
  return createRangeIterator(source as number, start);
};

export const project: {
  <S extends IteratorSource, R, RT extends AnyTuple>(
    source: S,
    projection?: IteratorAction<S, R | RT> | null,
    ...rest: StartEndArgs<S>
  ): IteratorProjection<S, R, RT>[];
} = (source, projection, ...rest) => {
  return createControllableIterator(
    mapIterator(source, ...rest),
    projection as any
  ) as any;
};

export function* flatProject<S extends IteratorSource, R, RT extends AnyTuple>(
  source: S,
  projection?: IteratorAction<S, R | RT> | null,
  ...rest: StartEndArgs<S>
): Iterable<FlatIteratorItem<IteratorProjection<S, R, RT>>> {
  for (const item of project(
    mapIterator(source, ...(rest as any)),
    projection as any
  )) {
    if (isIterable(item)) {
      yield* item;
    } else if (isObject(item)) {
      yield* Object.entries(item) as any;
    } else {
      yield item;
    }
  }
}

export const map: {
  <S extends IteratorSource, R, RT extends AnyTuple>(
    source: S,
    projection?: IteratorAction<S, R | RT> | null,
    ...rest: StartEndArgs<S>
  ): IteratorProjection<S, R, RT>[];
  <S extends IteratorSource, R, RT extends AnyTuple>(
    source: S,
    ...rest: StartEndArgs<S>
  ): IteratorProjection<S, R, RT>[];
} = ((source: any, projection: any, ...rest: any[]) => {
  if (!isFunction(projection) && hasValue(projection)) {
    // The "projection" parameter is the start index.
    rest.unshift(projection);
    projection = null;
  }
  source = mapIterator(source, ...rest);
  return projection
    ? projection.length < 3 && hasMethod(source, "map")
      ? source["map"](projection).filter(isDefined)
      : [...createControllableIterator(source as any, projection)]
    : (toArray(source, true) as any);
}) as any;

type FlatIteratorItem<S extends IteratorSource> =
  IteratorItem<S> extends Iterable<infer T>
    ? T
    : IteratorItem<S> extends Record<infer K, infer V>
    ? [K, V]
    : IteratorItem<S>;

export const flatMap = <
  S extends IteratorSourceOf<any | Iterable<any>>,
  R,
  RT extends AnyTuple
>(
  source: S,
  action: IteratorAction<S, R> = (item) => item as any,
  ...rest: StartEndArgs<S>
): FlatIteratorItem<IteratorProjection<S, R, RT>>[] =>
  map(flatProject(source, action, ...rest)) as any;

export const forEach = <S extends IteratorSource, R>(
  source: S,
  action: IteratorAction<S, R>,
  ...rest: StartEndArgs<S>
): R | undefined => {
  let returnValue: R | undefined = undefined;
  let innerReturnValue: any;
  source = mapIterator(source, ...rest);
  if (action.length < 3 && hasMethod(source, "forEach")) {
    source.forEach(
      (item: any, index: any) =>
        isDefined((innerReturnValue = (action as any)(item, index))) &&
        (returnValue = innerReturnValue)
    );
  } else {
    for (const _ of createControllableIterator(
      source as any,
      action as any,
      (value) => (returnValue = value as any)
    ));
  }
  return returnValue;
};

export const flatForEach = <S extends IteratorSourceOf<any | Iterable<any>>, R>(
  source: S,
  action: IteratorAction<FlatIteratorItem<S>, R>,
  ...rest: StartEndArgs<S>
): R | undefined =>
  forEach(
    flatProject(source, undefined, ...(rest as any)),
    action as any
  ) as any;

export const toObject: {
  <S extends IteratorSourceOf<[keyof any, any]>>(
    source: S,
    selector?: null,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<S>;
  <S extends IteratorSource, P extends [keyof any, any]>(
    source: S,
    selector: IteratorAction<S, P>,
    ...rest: StartEndArgs<S>
  ): KeyValuePairsToObject<P[]>;
} = (source: any, selector: any, ...rest: any[]) =>
  Object.fromEntries((map as any)(source, selector, ...rest));

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
  seed?: Accumulator,
  ...rest: StartEndArgs<S>
): Reducer extends (...args: any) => infer R
  ? R | (unknown extends Accumulator ? undefined : never)
  : never =>
  forEach(
    source,
    (value, index, control) =>
      (seed =
        (reducer(seed as any, value, index, control as any) as any) ?? seed),
    ...rest
  ) ?? (seed as any);

export const filter = <
  S extends IteratorSource,
  MapToArray extends boolean = false
>(
  source: S,
  filter: Filter<S> = isTruish,
  map?: MapToArray,
  ...rest: StartEndArgs<S>
): S extends any[] | null | undefined | (MapToArray extends true ? any : never)
  ? IteratorItem<S>[]
  : Iterable<IteratorItem<S>> =>
  map
    ? toArray((filter as any)(source, filter, false, ...rest))
    : (filterIterator(mapIterator(source, ...rest) as any, filter) as any);

let filterInternal = filter;

export const count = <S extends IteratorSource>(
  source: S,
  filter?: Filter<S> | null,
  ...rest: StartEndArgs<S>
): number => {
  if (filter) {
    source = filterInternal(source, filter, false, ...rest) as any;
  } else {
    source = mapIterator(source, ...rest);
  }
  let n = source!["length"] ?? source!["size"];
  return isDefined(n) ? n : reduce(source, (n) => n + 1, 0, ...rest);
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
} = (source: any, selector: any = (item: any) => item, ...rest: any) =>
  reduce(
    source,
    (sum, value, index, control) =>
      sum + (selector(value, index, control) ?? 0),
    0,
    ...rest
  );

export const some = <S extends IteratorSource>(
  source: S,
  filter?: Filter<S> | null,
  ...rest: StartEndArgs<S>
) =>
  hasMethod(source, "some")
    ? source.some(
        filter ? (item: any, index: number) => filter(item, index) : isTruish
      )
    : filter
    ? some(filterInternal(source as any, filter, false, ...rest))
    : forEach<any, boolean>(source, (item, index, { end }) => end(true)) ??
      false;

export const every = <S extends IteratorSource>(
  source: S,
  filter?: Filter<S>,
  ...rest: StartEndArgs<S>
) =>
  !some(
    source,
    filter ? (item, index) => !filter(item, index) : isFalsish,
    ...rest
  );

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

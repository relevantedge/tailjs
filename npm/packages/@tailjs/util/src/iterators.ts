import {
  AllKeys,
  AnyAll,
  ArraysAsEmpty,
  Entries,
  Extends,
  FILTER_NULLISH,
  GeneralizeConstants,
  If,
  IfNot,
  IterableOrArrayLike,
  KeyValuePairsToObject,
  KeyValueSource,
  KeyValueSourcesToObject,
  MAX_SAFE_INTEGER,
  MaybeUndefined,
  Minus,
  Nullish,
  OmitNullish,
  Property,
  RecordType,
  StrictUndefined,
  UndefinedIfEmpty,
  add,
  array,
  get,
  ifDefined,
  isArray,
  isBoolean,
  isFalsish,
  isFunction,
  isIterable,
  isMap,
  isNumber,
  isObject,
  isPlainObject,
  isSet,
  isString,
  isTruish,
  symbolIterator,
  undefined,
} from ".";

export const UTF16MAX = 0xffff;

let stopInvoked = false;
export const stop = (yieldValue?: any) => ((stopInvoked = true), yieldValue);

export const toCharCodes = (s: string) =>
  [...new Array(s.length)].map((_, i) => s.charCodeAt(i));
export const codePoint = (string: string, index: number = 0) =>
  string.codePointAt(index)!;

export type IteratorSource =
  | Nullish
  | number
  | Iterable<any>
  | RecordType
  | NavigatingIteratorStep;

export type IteratorSourceOf<T> =
  | (T extends number ? number : never)
  | Iterable<T>
  | (T extends readonly [infer K, infer V]
      ? K extends keyof any
        ? RecordType<K, V>
        : never
      : never)
  | NavigatingIteratorStep<T>;

export type IteratorItem<S extends IteratorSource> = unknown extends S
  ? any
  : S extends number
  ? number
  : S extends Iterable<infer T>
  ? T
  : S extends RecordType<infer K, infer V>
  ? readonly [K, V]
  : S extends ArrayLike<infer T>
  ? T
  : S extends (...args: any) => infer T | Nullish
  ? T
  : never;

export type IteratorItems<S extends readonly IteratorSource[]> =
  S extends readonly [infer S]
    ? IteratorItem<S & IteratorSource>
    : S extends readonly [infer S, ...infer Rest]
    ? IteratorItem<S & IteratorSource> | IteratorItems<Rest & IteratorSource[]>
    : S extends readonly (infer S)[]
    ? IteratorItem<S & IteratorSource>
    : never;

export interface IteratorControl<S extends IteratorSource> {
  source: S;
  prev: IteratorItem<S> | undefined;
  skip(): void;
  end(): void;
  end<P>(value: P): P;
}

export type FunctionalIteratorAction<
  S extends IteratorSource = IteratorSource,
  Projection = any,
  Value = IteratorItem<S>
> = (
  value: Value,
  index: number
) => Projection | readonly [any, any] | typeof stop | Nullish;

export type IteratorAction<
  S extends IteratorSource = IteratorSource,
  Projection = unknown,
  Value = IteratorItem<S>
> = AllKeys<IteratorItem<S>> | FunctionalIteratorAction<S, Projection, Value>;

// We need both the inferred return value from the IteratorAction and the IteratorAction itself used as the parameter
// in functions like `<S extends IteratorSource, Return, Action>(source: S, action: IteratorAction<S,Return> | P)=>IteratorProjection<S,Return,Action>.
// It is important to set the generic type for Action's default value to undefined
// This seems to be the only way we can both automatically infer non-readonly tuples from `()=>["test", 1]` as tuples, and at the same time
// allow property names from the source's items. If we did not include the parameter itself it would not be possible to differentiate
// between property names and return values.
type IteratorProjection<
  S extends IteratorSource,
  Return,
  Action,
  Default = IteratorItem<S>
> = Action extends Nullish
  ? Default
  : unknown extends Action
  ? Default
  : Action extends keyof any
  ? Exclude<Property<IteratorItem<S>, Action>, Nullish>
  : Return;

type IteratorProjectionWithUndefined<
  S extends IteratorSource,
  Return,
  Action,
  Default = IteratorItem<S>
> =
  | IteratorProjection<S, Return, Action, Default>
  | (Action extends (...args: any) => infer R
      ? R extends typeof stop
        ? undefined
        : StrictUndefined<R>
      : Action extends keyof any
      ? StrictUndefined<Property<IteratorItem<S>, Action>>
      : never) extends infer T
  ? T
  : never;

type StartEndArgs<S extends IteratorSource> =
  | []
  | (S extends number
      ? [offset?: number | Nullish]
      : S extends NavigatingIteratorStep<infer T>
      ? [seed?: T, maxIterations?: number]
      : [start: number | Nullish, end?: number | Nullish]);

export type NavigatingIteratorStep<T = any> = (
  current: T | undefined
) => T | undefined;

type FlatIteratorItem<T, D extends number = 1, Object = false> = T extends
  | undefined
  | void
  ? never
  : D extends 0
  ? T
  : T extends
      | Iterable<any>
      | (Object extends true ? Record<keyof any, any> : never)
  ? D extends 1
    ? IteratorItem<T>
    : FlatIteratorItem<IteratorItem<T>, Minus<D, 1>, Object>
  : T;

const wrapProjection = <P>(
  projection: P | undefined
): undefined | ((item: any, index: number) => any) =>
  projection == null
    ? undefined
    : isFunction(projection)
    ? (projection as any)
    : (item) => item[projection as any];

function* createFilteringIterator<S extends IteratorSource, R, P>(
  source: S,
  projection?: IteratorAction<S, R> | P
): Iterable<IteratorProjection<S, R, P>> {
  if (source == null) return;
  if (projection) {
    projection = wrapProjection(projection)!;
    let i = 0;
    for (let item of source as any) {
      if ((item = projection(item, i++)) != null) {
        yield item;
      }
      if (stopInvoked) {
        stopInvoked = false;
        break;
      }
    }
  } else {
    for (let item of source as any) {
      if (item != null) yield item;
    }
  }
}

function* createObjectIterator<S extends Record<keyof any, any>, R, P>(
  source: S,
  action?: IteratorAction<S, R> | P
): Iterable<IteratorProjection<S, P, R>> {
  action = wrapProjection(action);
  let i = 0;
  for (const key in source) {
    let value = [key, source[key]] as any;
    action && (value = action(value, i++));

    if (value != null) {
      yield value;
    }
    if (stopInvoked) {
      stopInvoked = false;
      break;
    }
  }
}

function* createRangeIterator(length = 0, offset?: number): Iterable<number> {
  if (length < 0) {
    offset ??= -length - 1;
    while (length++) yield offset--;
  } else {
    offset ??= 0;
    while (length--) yield offset++;
  }
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
  if (start != null) yield start;
  while (maxIterations-- && (start = step(start)) != null) {
    yield start;
  }
}

const sliceAction = <S extends IteratorSource, R, P>(
  action: IteratorAction<S, R> | P,
  start: any,
  end: any
): P =>
  (start ?? end) !== undefined
    ? ((action = wrapProjection(action)!),
      (start ??= 0),
      (end ??= MAX_SAFE_INTEGER),
      (value, index) =>
        start--
          ? undefined
          : end!--
          ? action
            ? (action as any)(value, index)
            : value
          : end)
    : (action as any);

export type IteratorFilter<S extends IteratorSource> = (
  value: IteratorItem<S>,
  index: number
) => any;

/** Faster way to exclude null'ish elements from an array than using {@link filter} or {@link map} */
export const filterArray = <T extends readonly any[] | undefined>(
  array: T
): T extends readonly (infer Item)[] ? OmitNullish<Item>[] : undefined =>
  array?.filter(FILTER_NULLISH) as any;

const createIterator = <S extends IteratorSource, R, P>(
  source: S,
  projection?: IteratorAction<S, R> | P,
  start?: any,
  end?: any
): Iterable<IteratorProjection<S, R, P>> =>
  source == null
    ? ([] as any)
    : !projection && isArray(source)
    ? filterArray(source)
    : source[symbolIterator]
    ? createFilteringIterator(
        source,
        start === undefined
          ? projection
          : sliceAction(projection, start as any, end)
      )
    : isObject(source)
    ? createObjectIterator(
        source as any,
        sliceAction(projection, start as any, end)
      )
    : createIterator(
        isFunction(source)
          ? createNavigatingIterator(source, start, end)
          : (createRangeIterator(source as number, start as any) as any),
        projection
      );

const mapToArray = <T, M>(
  projected: Iterable<T>,
  map: M
): true extends M ? T[] : Iterable<T> =>
  map && !isArray(projected) ? [...projected] : (projected as any);

type ProjectFunction = {
  <S extends IteratorSource, R, P>(
    source: S,
    projection?: IteratorAction<S, R> | P,
    ...rest: StartEndArgs<S>
  ): Iterable<IteratorProjection<S, R, P>>;
};

type MapFunction = {
  <S extends IteratorSource, R, P>(
    source: S,
    projection?: IteratorAction<S, R> | P,
    ...rest: StartEndArgs<S>
  ): MaybeUndefined<S, Exclude<IteratorProjection<S, R, P>, Nullish>[]>;
};

type FlatProjectFunction = <
  S extends IteratorSource,
  R,
  P,
  D extends number = 1,
  O extends boolean = false
>(
  source: S,
  projection?: IteratorAction<S, R> | P,
  depth?: D,
  expandObjects?: O,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<
  S,
  Iterable<FlatIteratorItem<IteratorProjection<S, R, P>, D, O>>
>;

export const project: ProjectFunction = ((
  source: any,
  projection: any,
  start: any,
  end: any
) => createIterator(source, projection, start, end)) as any;

function* flattenInternal(
  value: any,
  depth: number,
  expandObjects: boolean,
  nested: boolean
) {
  if (value != null) {
    if (value[symbolIterator] || (expandObjects && isObject(value))) {
      for (const item of nested ? createIterator(value) : value) {
        if (depth !== 1) {
          yield* flattenInternal(item, depth - 1, expandObjects, true);
        } else {
          yield item;
        }
      }
    } else {
      yield value;
    }
  }
}
export const flatten: FlatProjectFunction = (
  source,
  projection?,
  depth = 1 as any,
  expandObjects: any = false,
  start?: any,
  end?: any
) =>
  flattenInternal(
    createIterator(source, projection as any, start, end),
    depth + 1,
    expandObjects,
    false
  ) as any;

export const map: MapFunction = (
  source: any,
  projection?: any,
  start?: any,
  end?: any
) => {
  projection = wrapProjection(projection);
  if (isArray(source)) {
    let i = 0;
    const mapped: any[] = [];
    start = start! < 0 ? source.length + start! : start ?? 0;
    end = end! < 0 ? source.length + end! : end ?? source.length;
    for (; start < end && !stopInvoked; start++) {
      let value = source[start];
      if ((projection ? (value = projection(value, i++)) : value) != null) {
        mapped.push(value);
      }
    }
    stopInvoked = false;
    return mapped;
  }
  return source != null
    ? array(project(source, projection, start, end))
    : (undefined as any);
};

export const mapAsync: <S extends IteratorSource, R, P>(
  source: S,
  projection: IteratorAction<S, R> | P,
  ...rest: StartEndArgs<S>
) => Promise<
  MaybeUndefined<S, Exclude<Awaited<IteratorProjection<S, R, P>>, Nullish>[]>
> = async (source: any, projection?: any, start?: any, end?: any) => {
  projection = wrapProjection(projection);
  const mapped: any = [];
  await forEachAsync(
    source,
    async (item) => (item = await projection(item)) != null && mapped.push(item)
  );
  return mapped as any;
};

export const zip = <Lhs extends IteratorSource, Rhs extends IteratorSource>(
  lhs: Lhs,
  rhs: Rhs
): Iterable<[IteratorItem<Lhs>, IteratorItem<Rhs> | undefined]> => {
  const it2 = createIterator(rhs)[Symbol.iterator]();
  return createIterator(lhs, (lhs) => [lhs, it2.next()?.value] as [any, any]);
};

export const distinct: {
  <S extends IteratorSource, R, P>(
    source: S,
    projection?: IteratorAction<S, R>,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : Set<IteratorProjection<S, R, P>>;
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : Set<IteratorItem<S>>;
} = (source: any, projection?: any, start?: any, end?: any) =>
  source != null
    ? new Set<any>([...project(source, projection, start, end)])
    : undefined;

export const single: {
  <S extends IteratorSource, R, P>(
    source: S,
    projection?: IteratorAction<S, R> | P,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : IteratorProjection<S, R, P> | undefined;
  <S extends IteratorSource>(
    source: S,
    ...rest: StartEndArgs<S>
  ): S extends undefined ? undefined : IteratorItem<S> | undefined;
} = (source: any, projection?: any, start?: any, end?: any) =>
  source == null
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
  source != null
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

export const flatMapKv = <S extends IteratorSource, R, P, D extends number = 1>(
  source: S,
  action?: IteratorAction<S, R> | P,
  depth: D = 1 as any
): FlatIteratorItem<IteratorProjection<S, R, P>, D, true>[] =>
  flatMap(source, action, depth, true);

export const flatMap: <
  S extends IteratorSource,
  R,
  P,
  D extends number = 1,
  O extends boolean = false
>(
  source: S,
  action?: IteratorAction<S, R> | P,
  depth?: D,
  expandObjects?: O,
  ...rest: StartEndArgs<S>
) => FlatIteratorItem<IteratorProjection<S, R, P>, D, O>[] = (
  source,
  action,
  depth = 1 as any,
  expandObjects = false as any,
  start?: any,
  end?: any
) =>
  array(
    (flatten as any)(source, action, depth, expandObjects, start, end) as any
  ) as any;

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

type ConcatResult_<T> = T extends readonly []
  ? never
  : T extends readonly [infer Item, ...infer Rest]
  ?
      | Exclude<Item extends Iterable<infer T> ? T : Item, Nullish>
      | ConcatResult_<Rest>
  : T extends Iterable<infer Item>
  ? Exclude<Item extends Iterable<infer T> ? T : Item, Nullish>
  : never;

type ConcatResult<T> = ConcatResult_<T> extends never
  ? undefined
  : ConcatResult_<T>[];

type FinalIteratorItem<
  T,
  ArraysOnly = false,
  MaxDepth extends number = -1
> = MaxDepth extends 0
  ? T
  : T extends string
  ? string
  : T extends (
      [ArraysOnly] extends [true]
        ? readonly (infer T)[]
        : IterableOrArrayLike<infer T>
    )
  ? FinalIteratorItem<
      T,
      ArraysOnly,
      -1 extends MaxDepth ? -1 : Minus<MaxDepth, 1>
    >
  : T;

export const unnest = <
  T extends readonly any[],
  ArraysOnly extends boolean = false,
  Depth extends number = -1
>(
  items: T,
  arraysOnly: ArraysOnly,
  depth: Depth = -1 as any
): FinalIteratorItem<T, ArraysOnly>[] => {
  if (!depth) return items as any;

  const results: any[] = [];
  const test = arraysOnly ? isArray : isIterable;
  forEach(items, (item) =>
    test(item)
      ? results.push(...unnest(item, arraysOnly, depth - 1))
      : item != null && results.push(item)
  );
  return results;
};

export const unarray: {
  <T extends readonly any[], Depth extends number = -1>(
    items: T
  ): FinalIteratorItem<T, true>[];
  <T extends readonly any[]>(...items: T): FinalIteratorItem<T, true>[];
} = (...items: any[]) => unnest(items.length === 1 ? items[0] : items, true);

export const concat: {
  <T extends readonly any[]>(items: T):
    | ConcatResult<T>
    | IfNot<AnyAll<ArraysAsEmpty<T[number]>, false>>;
  <T extends readonly any[]>(...items: T):
    | ConcatResult<T>
    | IfNot<AnyAll<ArraysAsEmpty<T[number]>, false>>;
} = (...items: any[]) => {
  let merged: any[] | undefined;
  forEach(
    items.length === 1 ? items[0] : items,
    (item) => item != null && (merged ??= []).push(...(array(item) as any))
  );
  return merged as any;
};

export const expand = <T>(
  root: T | T[],
  selector: (
    current: Exclude<T, Nullish>
  ) => Iterable<T | undefined> | undefined,
  includeSelf = true
): T extends undefined ? undefined : Exclude<T, Nullish>[] =>
  traverseInternal(root, selector, includeSelf, [], new Set()) as any;

const forEachArray = (
  source: readonly any[],
  action: any,
  start: any,
  end: any
) => {
  let returnValue: any;
  let i = 0;
  start = start! < 0 ? source.length + start! : start ?? 0;
  end = end! < 0 ? source.length + end! : end ?? source.length;
  for (; start < end; start++) {
    if (
      source[start] != null &&
      ((returnValue = action(source[start], i++) ?? returnValue), stopInvoked)
    ) {
      stopInvoked = false;
      break;
    }
  }
  return returnValue;
};

const forEachIterable = (source: Iterable<any>, action: any) => {
  let returnValue: any;
  let i = 0;
  for (let value of source as any) {
    if (
      value != null &&
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

export const apply: <S, R, Args extends readonly any[]>(
  source: S,
  action: (
    item: S extends IteratorSource ? IteratorItem<S> : OmitNullish<S>,
    ...args: Args
  ) => R,
  ...args: Args
) => S extends undefined ? undefined : Exclude<R, Nullish>[] = (
  source,
  action,
  ...args
) =>
  source == null
    ? undefined
    : isIterable(source)
    ? map(source, (item) => action(item as any, ...args))
    : (action(source as any, ...args) as any);

export const applyAsync: <
  S extends IteratorSource,
  R extends PromiseLike<any>,
  Args extends readonly any[]
>(
  source: S,
  action: (item: IteratorItem<S>, ...args: Args) => R,
  ...args: Args
) => Promise<S extends undefined ? undefined : Exclude<R, Nullish>[]> = (
  source,
  action,
  ...args
) => mapAsync(source, (item) => action(item, ...args)) as any;

const forEachInternal: <S extends IteratorSource, R>(
  source: S,
  action?: IteratorAction<S, R>,
  start?: any,
  end?: any
) => R | undefined = (source, action, start?: any, end?: any) => {
  if (source == null) return;

  if (isArray(source)) return forEachArray(source, action, start, end);
  if (start === undefined) {
    if (source[symbolIterator]) return forEachIterable(source as any, action);
    if (typeof source === "object") return forEachObject(source, action);
  }
  let returnValue: any;
  for (const value of createIterator(source, action, start, end)) {
    value != null && (returnValue = value);
  }

  return returnValue;
};

export const forEach = forEachInternal as {
  <S extends IteratorSource, R>(
    source: S,
    action: FunctionalIteratorAction<S, R>,
    ...rest: StartEndArgs<S>
  ): R | undefined;
};

export const forEachAsync: <
  S extends IteratorSource,
  R extends PromiseLike<any>
>(
  source: S,
  action: IteratorAction<S, R>,
  ...rest: StartEndArgs<S>
) => Promise<R | undefined> = async (
  source: any,
  action: any,
  start?: any,
  end?: any
) => {
  if (source == null) return undefined;
  let returnValue: any;
  for (let item of project(source, action, start, end)) {
    (item = (await item) as any) != null && (returnValue = item);
    if (stopInvoked) {
      stopInvoked = false;
      break;
    }
  }
  return returnValue;
};

export const flatForEach = <
  S extends IteratorSource,
  R,
  P,
  Depth extends number,
  O extends boolean = false
>(
  source: S,
  action: IteratorAction<S, R> | P,
  depth: Depth = 1 as any,
  expandObjects: O = false as any,
  ...rest: StartEndArgs<S>
): FlatIteratorItem<IteratorProjection<S, R, P>, Depth, O> | undefined =>
  forEachInternal(
    flatten(source, undefined, depth, expandObjects, ...(rest as any)),
    action as any
  ) as any;

type KeyValueParts<T> = T extends readonly [infer Key, infer Value]
  ? [Key, Value]
  : [undefined, undefined];

const fromEntries = Object.fromEntries;

/**
 * Like Object.fromEntries, but accepts any iterable source and a projection instead of just key/value pairs.
 * Properties with undefined values are not included in the resulting object.
 */
export const obj: {
  <S extends KeyValueSource | Nullish>(source: S): MaybeUndefined<
    S,
    KeyValuePairsToObject<IteratorItem<S>>
  >;
  <S extends Iterable<KeyValueSource> | Nullish, G extends boolean>(
    source: S,
    group: G
  ): S extends Nullish
    ? undefined
    : KeyValueSourcesToObject<IteratorItem<S>, G>;

  <S extends IteratorSource | Nullish, R extends readonly [any, any], P>(
    source: S,
    selector: IteratorAction<S, R> | P,
    merge?: (
      current: KeyValueParts<IteratorProjection<S, R, P>>[1] | undefined,
      value: KeyValueParts<IteratorProjection<S, R, P>>[1]
    ) => KeyValueParts<IteratorProjection<S, R, P>>[1] | Nullish
  ): KeyValuePairsToObject<IteratorProjection<S, R, P>>;
} = ((source: any, selector?: any, merge?: any) => {
  if (source == null) return undefined;

  if (isBoolean(selector) || merge) {
    let result = {} as any;
    forEach(
      source,
      merge
        ? (item, i) =>
            (item = selector(item, i)) != null &&
            (item[1] = merge(result[item[0]], item[1])) != null &&
            (result[item[0]] = item[1])
        : (source) =>
            forEach(
              source,
              selector
                ? (item) =>
                    item?.[1] != null &&
                    ((result[item[0]] ??= []).push(item[1]), result)
                : (item) =>
                    item?.[1] != null && ((result[item[0]] = item[1]), result)
            )
    );
    return result;
  }
  return fromEntries(
    map(
      source,
      selector
        ? (item, index) => ifDefined(selector(item, index), 1)
        : (item) => ifDefined(item, 1)
    )!
  );
}) as any;

export const groupReduce: <
  S extends IteratorSource,
  Key,
  Accumulator = unknown
>(
  source: S,
  keySelector: (item: IteratorItem<S>, index: number) => Key,
  reducer: (
    accumulator: GeneralizeConstants<Accumulator>,
    item: IteratorItem<S>,
    index: number
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
    if (value != null) {
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
        : GeneralizeConstants<Accumulator>,
      item: IteratorItem<S>,
      index: number
    ]
  ) => GeneralizeConstants<Accumulator>,
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
    MapToArray extends boolean = S extends Nullish | readonly any[]
      ? true
      : false,
    P extends IteratorFilter<S> = IteratorFilter<S>
  >(
    source: S,
    predicate?: P,
    map?: MapToArray,
    ...rest: StartEndArgs<S>
  ): MapToArray extends true
    ? MaybeUndefined<S, FilterItem<S, P>[]>
    : Iterable<FilterItem<S, P>>;
} = (
  source: IteratorSource,
  predicate: IteratorFilter<any> = (item: any) => item != null,
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

export const count: <S extends IteratorSource>(
  source: S,
  predicate?: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<S, number> = (
  source: IteratorSource,
  filter?: IteratorFilter<IteratorSource>,
  start?: any,
  end?: any
) => {
  if (source == null) return undefined as any;

  let n: number;
  if (filter) {
    source = filterInternal(source, filter, false, start, end) as any;
  } else {
    if ((n = source!["length"] ?? source!["size"]) != null) {
      return n;
    }
    if (!source[symbolIterator]) {
      return Object.keys(source).length;
    }
  }
  n = 0;
  return forEachInternal(source, () => ++n) ?? (0 as any);
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

type CanBeEmptySource<S extends IteratorSource> = any[] extends S
  ? true
  : S extends { length: 0 } | 0 // Zero length range.
  ? true
  : S extends readonly any[] | number
  ? false
  : true;

type MinMaxFunction = {
  <S extends readonly number[]>(...numbers: S | readonly [number]):
    | (S extends readonly [] ? undefined : number)
    | UndefinedIfEmpty<S>;
  <S extends IteratorSource, R, P>(
    source: S | readonly [number],
    selector?: IteratorAction<S, R> | P,
    ...rest: StartEndArgs<S>
  ): true extends CanBeEmptySource<S>
    ? number | undefined
    : If<
        Extends<IteratorProjectionWithUndefined<S, R, P>, number>,
        number,
        undefined
      >;
};

export const min: MinMaxFunction = (source: any, ...args: any[]) =>
  source == null
    ? undefined
    : isNumber(source)
    ? Math.min(source, ...args)
    : reduce(
        source,
        (
          min,
          value,
          index,
          projected = args[1] ? args[1](value, index) : value
        ) =>
          min == null || (isNumber(project) && projected < min)
            ? projected
            : max,
        undefined,
        args[2],
        args[3]
      );

export const max: MinMaxFunction = (source: any, ...args: any[]) =>
  source == null
    ? undefined
    : isNumber(source)
    ? Math.max(source, ...args)
    : reduce(
        source,
        (
          max,
          value,
          index,
          projected = args[1] ? args[1](value, index) : value
        ) =>
          max == null || (isNumber(projected) && projected > max)
            ? projected
            : max,
        undefined,
        args[2],
        args[3]
      );

export const values: <S extends IteratorSource>(
  source: S,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<
  S,
  IteratorItem<S> extends readonly [any, infer Item] ? Item : IteratorItem<S>
> = (source, start?: any, end?: any) =>
  (map as any)(
    source,
    isPlainObject(source) ? (item: any) => item[1] : (item: any) => item,
    start,
    end
  );

export const entries: <S extends Iterable<any> | RecordType>(
  target: S
) => Entries<S> = (target) =>
  !isArray(target) && isIterable(target)
    ? map(
        target,
        isMap(target)
          ? (value) => value
          : isSet(target)
          ? (value) => [value, true]
          : (value, index) => [index, value]
      )
    : isObject(target)
    ? (Object.entries(target) as any)
    : undefined;

export const keys: <S extends IteratorSource>(
  source: S,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<
  S,
  IteratorItem<S> extends readonly [infer Key, any] ? Key : number
> = (source, start?: any, end?: any) =>
  (map as any)(
    source,
    isPlainObject(source)
      ? (item: any) => item[0]
      : (_item: any, i: number) => i,
    start,
    end
  );

export const mapFirst: <S extends IteratorSource, R, P>(
  source: S,
  projection: IteratorAction<S, R> | P,
  ...rest: StartEndArgs<S>
) => IteratorProjection<S, R, P> | undefined = (
  source,
  projection,
  start?: any,
  end?: any
) =>
  source == null
    ? undefined
    : ((projection = wrapProjection(projection)!),
      forEachInternal(
        source,
        (value, i) =>
          !projection || (value = (projection as any)(value, i))
            ? stop(value)
            : undefined,
        start,
        end
      ));

export const first: <S extends IteratorSource>(
  source: S,
  predicate?: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => IteratorItem<S> | undefined = (
  source,
  predicate?: IteratorFilter<any>,
  start?: any,
  end?: any
) =>
  source == null
    ? undefined
    : forEachInternal(
        source,
        (value, i) =>
          !predicate || predicate(value, i) ? stop(value) : undefined,
        start,
        end
      );

export const last: <S extends IteratorSource | undefined>(
  source: S,
  predicate?: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => IteratorItem<S> | undefined = (
  source,
  predicate?: any,
  start?: any,
  end?: any
) =>
  source == null
    ? undefined
    : isArray(source) || isString(source)
    ? source[source.length - 1]
    : forEachInternal(
        source,
        (item, i) => (!predicate || predicate(item, i) ? item : undefined),
        start,
        end
      );

export const find: <S extends IteratorSource>(
  source: S,
  predicate: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<S, IteratorItem<S>> = (
  source,
  predicate,
  start?: any,
  end?: any
) =>
  source == null
    ? undefined
    : (source as any).find
    ? (source as any).find(predicate)
    : first(filterInternal(source as any, predicate, false, start, end));

export const rank = <S extends IteratorSource>(source: S) =>
  createIterator(source, (item, i) => [item, i] as const);

export const some: <S extends IteratorSource>(
  source: S,
  predicate?: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<S, boolean> = (source, predicate, start?: any, end?: any) =>
  source == null
    ? undefined
    : isPlainObject(source) && !predicate
    ? Object.keys(source).length > 0
    : (source as any).some?.(predicate ?? isTruish) ??
      forEachInternal<any, boolean>(
        source,
        predicate
          ? (item, index) => (predicate(item, index) ? stop(true) : false)
          : () => stop(true),
        start,
        end
      ) ??
      false;

export const every: <S extends IteratorSource>(
  source: S,
  predicate?: IteratorFilter<S>,
  ...rest: StartEndArgs<S>
) => MaybeUndefined<S, boolean> = (source, predicate, start?: any, end?: any) =>
  source == null
    ? undefined
    : (!(some as any)(
        source,
        predicate
          ? (item: any, index: number) => !predicate(item, index)
          : isFalsish,
        start,
        end
      ) as any);

/**
 * Array's `sort` function that offers a single function that is applied on each element instead of having to do it twice (`[...].sort(x,y)=>f(x)-f(y)`).
 * Default is to use the value directly.
 */
export const sort = <T extends any[] | Nullish, Item extends IteratorItem<T>>(
  items: T,
  rank: (item: Item) => number = (item) => item as any
): MaybeUndefined<T, Item[]> =>
  (items?.sort((lhs, rhs) => rank(lhs) - rank(rhs)), items) as any;

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

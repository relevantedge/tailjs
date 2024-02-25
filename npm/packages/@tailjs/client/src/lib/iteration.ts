// Utility functions for arrays and iterables.

import {
  isObject,
  type ArgNulls,
  type ConstToTuples,
  type IterableOrArrayLike,
  type IterableOrSelf,
  type KeyValueProjection,
  type Nullish,
  type Nulls,
} from "@tailjs/util";
import { F, T, array, bool, fun, hashSet, iterable, nil, num, obj } from ".";

/**
 * Array's `sort` function that offers a single function that is applied on each element instead of having to do it twice (`[...].sort(x,y)=>f(x)-f(y)`).
 * Default is to use the value directly.
 */
export const sort = <T = number, Arg = any>(
  items: ArgNulls<T[], Arg>,
  sortKey: (item: T) => number = (item) => item as any
): Nulls<Arg> =>
  (items?.sort((lhs, rhs) => sortKey(lhs) - sortKey(rhs)), items) as any;

/**
 * Array's `splice` method for efficient minifying.
 */
export const splice = <T, Arg>(
  value: ArgNulls<T[], Arg>,
  start: number,
  deleteCount?: number,
  ...values: T[]
): T[] | Nulls<Arg> =>
  value &&
  (deleteCount != nil
    ? (value.splice as any)(start, deleteCount, ...values)
    : (value.splice as any)(start));

/**
 * Array's `unshift` method for efficient minifying that also returns the array itself for fluent convenience.
 */
export const unshift = <T extends { unshift(...args: any): any }, Arg>(
  target: ArgNulls<T, Arg>,
  ...values: T["unshift"] extends (...args: infer A) => any ? A : never
): T | Nulls<Arg, undefined> => (target?.unshift(...values), target) as any;

/**
 * Array's `shift` method for efficient minifying.
 */
export const shift = <T>(array: { shift(): T } | Nullish) => array?.shift();

/**
 * Array's `push` method for efficient minifying that also returns the array itself for fluent convenience.
 */
export const push = <T extends { push(...args: any): any }, Arg>(
  target: ArgNulls<T, Arg>,
  ...values: T["push"] extends (...args: infer A) => any ? A : never
): T | Nulls<Arg, undefined> => (target?.push(...values), target) as any;

/**
 * Array's `pop` method for efficient minifying.
 */
export const pop = <T>(array: { pop(): T } | Nullish) => array?.pop();

/**
 * Like Array's `concat` but supports iterables.
 */
export const concat = <T>(...sources: (IterableOrSelf<T> | Nullish)[]): T[] =>
  size((sources = filter(sources))) < 2
    ? map(sources[0])
    : ([].concat(...(map(sources as any, map as any) as any)) as any);

/**
 * Gives the distinct elements of the specified values. If a value is iterable it is expanded.
 */
export const distinct = <T>(
  ...values: (IterableOrSelf<T | Nullish> | Nullish)[]
): T[] => map(hashSet<T>(filter(concat(...values)))) as any;

/**
 * Constructs a range (or empty array) with the given attributes.
 */
export const range: {
  (length: number, empty?: false): number[];
  (length: number, empty: true): undefined[];
  <T = number>(length: number, project: (n: number) => T): T[];
  (start: number, end: number): number[];
} = (arg0: any, arg1: any) =>
  arg1 === T
    ? [...Array(arg0)]
    : num(arg1)
    ? range(arg1 - arg0, (n) => arg0 + n)
    : (fun(arg1) || (arg1 = ((n: number) => n) as any),
      map(range(arg0, T), (_, i) => (arg1 as any)(i)));

/**
 * The length of an array and strings, size of sets and maps and the number of keys in an object.
 *
 * If the value is a primitive type (not string) the size is defined as 0.
 */
export const size = (
  item:
    | Iterable<any>
    | Record<keyof any, any>
    | { size: number }
    | { length: number }
    | Nullish
) =>
  item == nil
    ? 0
    : item["length"] ?? item["size"] ?? (obj(item) ? keys(item).length : 0);

/**
 * An extended version of Object.entries that also supports maps, sets and arrays.
 */
export const entries: {
  <K, V, P = [K, V]>(
    map:
      | {
          entries(): Iterable<[K, V]>;
        }
      | Nullish,
    project?: KeyValueProjection<K, V, P>
  ): ConstToTuples<P>[];
  <V, P = [number, V]>(
    array: V[],
    project?: KeyValueProjection<number, V, P>
  ): ConstToTuples<P>[];
  <K extends keyof any = keyof any, V = any, P = [K, V]>(
    record: { [key in K]?: V },
    project?: KeyValueProjection<K, V, P>
  ): ConstToTuples<P>[];
} = (mapOrRecord: any, project?: any) =>
  !mapOrRecord
    ? []
    : array(mapOrRecord)
    ? map(mapOrRecord, (value, index) =>
        project ? project(index, value) : [index, value]
      )
    : map(mapOrRecord.entries?.() ?? Object.entries(mapOrRecord), project);

/**
 * An extended version of Object.keys that also supports maps and sets.
 */
export const keys: {
  <K = keyof any, P = K>(
    map:
      | {
          keys(): Iterable<K>;
        }
      | Nullish,
    project?: (key: K, index: number) => P
  ): ConstToTuples<P>[];
  <K extends keyof any = keyof any, P = K>(
    record: { [key in K]?: any },
    project?: (key: K, index: number) => P
  ): ConstToTuples<P>[];
} = (mapOrRecord: any, project?: any) =>
  !mapOrRecord
    ? []
    : map(mapOrRecord.keys?.() ?? Object.keys(mapOrRecord), project);

/**
 * An extended version of Object.values that also supports arrays and sets.
 */
export const values: {
  <V, P = V>(
    map:
      | {
          values(): Iterable<V>;
        }
      | Nullish,
    project?: (value: V, index: number) => P
  ): ConstToTuples<P>[];
  <V = any, P = V>(
    record: { [key in keyof any]?: V },
    project?: (value: V, index: number) => P
  ): ConstToTuples<P>[];
} = (mapOrRecord: any, project?: any) =>
  !mapOrRecord
    ? []
    : map(mapOrRecord.values?.() ?? Object.values(mapOrRecord), project);

/**
 * Generalized version of Array's `forEach` method that enables breaking and a return value.
 * Non iterables are intepreted as an array with themselves as the only item.
 *
 * If the `breakSignal` is called, iteration will stop.
 * For convenience the break function can be called with a value that will then be passed through to combine breaking and returning a value.
 * This does not change the return value by itself.
 *
 * `const hasPositive = forEach(numbers, (x,_,stop)=>x > 0 && stop(true))`
 *
 * @returns The last returned value from the action.
 */
export const forEach = <T, R = void, InitialValue = undefined>(
  items: IterableOrSelf<T> | Nullish,
  action: (
    item: T,
    index: number,
    breakSignal: <T>(passThroughValue?: T) => T,
    currentValue: R | InitialValue
  ) => R,
  initialValue?: InitialValue
): InitialValue | R => {
  if (item == nil || !size(iterable(items) ? items : (items = [items] as any)))
    return initialValue as any;

  const breakSignal = (...args: any) => (
    (index = 0), size(args) ? args[0] : initialValue
  );

  let index = 0;
  for (const item of items as any)
    if (
      ((initialValue = action(
        item,
        index++,
        breakSignal,
        initialValue as any
      ) as any),
      !index) // Index is set to zero from the breakSignal
    )
      break;

  return initialValue as any;
};

/**
 * Generalized version of Array's `map` method that also supports iterables and node lists.
 *
 * If called without a projection, it converts whatever is passed to it to an array.
 * When the value is already an array, the `clone` parameter decides whether the array itself or a clone should be returned.
 */
export const map: {
  <T, P = T extends IterableOrArrayLike<infer T> ? T : T>(
    value: IterableOrSelf<T> | Nullish,
    projection: (item: T, index: number) => P
  ): ConstToTuples<P>[];
  <T, P = T extends IterableOrArrayLike<infer T> ? T : T>(
    value: IterableOrSelf<T> | Nullish,
    clone?: boolean
  ): ConstToTuples<P>[];
} = (value: any, cloneOrProject?: any): any[] =>
  value == nil
    ? []
    : fun(cloneOrProject)
    ? (map(value, F).map((value, index) => cloneOrProject(value, index)) as any)
    : array(value) && !cloneOrProject
    ? value
    : (iterable(value) && [...value]) || [value];

/**
 * A generalized version of Array's `flatMap` that also supports iterables and node lists.
 */
export const flatMap: {
  <T, P = T extends Iterable<infer T> ? T : T>(
    value: IterableOrArrayLike<T> | T | Nullish,
    project: (item: T, index: number) => P | P[]
  ): ConstToTuples<P>[];
} = <T, P = T>(
  value: T | Iterable<T | Nullish> | Nullish,
  projection: (item: T, index: number) => P | P[] = (item) => item as any
): ConstToTuples<P>[] =>
  value == nil
    ? []
    : (filter(map(value, F)).flatMap((item, index) =>
        projection(item as any, index)
      ) as any);

/**
 * A convenience method for returning the n'th item from an iterable or the n'th character from a string.
 *
 * If the source is not alrady an array (or indexable by an item method), it will be converted to one first.
 * The latter feature should be used with caution since it adds a terrible performance overhead if used from within a loop.
 */
export const item: {
  <T>(
    array:
      | Iterable<T>
      | T
      | { [index: number]: T; length: number }
      | string
      | null
      | undefined,
    index?: number
  ): T | undefined;
  (text: string, index?: number): string | undefined;
} = <T>(source: any, index = 0): T | undefined =>
  source == nil
    ? undefined
    : (source.length == null && (source = map(source)),
      source.item,
      source[index < 0 ? (source as T[]).length + index : index]);

/**
 * A generalized version of Array's `filter` that works on all the types supported by {@link map}.
 *
 * In addition it allows an empty result to be returned as `null`
 */
export const filter: {
  <T, R extends T = T, B extends boolean = false>(
    value: IterableOrSelf<T> | Nullish,
    predicate: (item: R, index: number) => any,
    emptyIsNull?: B
  ): T[] | (B extends true ? null : never);
  <T, B extends boolean = false>(
    value: IterableOrSelf<T | Nullish> | Nullish,
    emptyIsNull?: B
  ): T[] | (B extends true ? null : never);
} = <T>(
  value: IterableOrSelf<T> | Nullish,
  predicate?: boolean | ((item: T, index: number) => any),
  emptyIsNull = bool(predicate) || F
): T[] =>
  ((value = (map(value) as any).filter((item: any, index: any) =>
    (fun(predicate, true) ?? ((item: any) => item != nil))(item, index)
  )),
  emptyIsNull && !size(value!) ? nil : value) as any;

/**
 * A convenience method to test whether an iterable has any element matching the predicate specified.
 *
 * If the parameter is not iterable is in interpreted as an array with itself as the only element.
 */
export const any = <T>(
  value: IterableOrSelf<T>,
  predicate: (item: T, index: number) => any = (item) =>
    item != (nil as any) && item !== F
): boolean => {
  return (
    value != nil &&
    (iterable(value) || isObject(value)) &&
    (!predicate
      ? !!size(value as any)
      : forEach(value, (item, i, stop) => predicate(item, i) && stop(T), F))
  );
};

/**
 * Array's `reduce` method that also works for iterables.
 */
export const reduce = <T, V>(
  items: IterableOrArrayLike<T>,
  reducer: (previous: V, item: T) => V,
  initialValue: V
) =>
  map(items).reduce(
    (previous, current) => reducer(previous, current as any),
    initialValue
  );

/**
 * Takes the sum of the items in an iterable.
 */
export const sum = <T, Arg>(
  items: ArgNulls<IterableOrArrayLike<T>, Arg>,
  selector?: (item: T) => number
): number | Nulls<Arg> =>
  items &&
  (reduce(
    items,
    (sum, item) => (selector?.(item) ?? (item as number)) + sum,
    0
  ) as any);

/**
 * Returns the highest value in a series of numbers.
 */
export const max: (typeof Math)["max"] = (...values) => Math.max(...values);

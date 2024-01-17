// Utility functions for testing and manipulating values, sets and objects.

import type {
  ArgNulls,
  KeyValueProjection,
  Nullish,
  Nulls,
  OmitNullish,
} from "@tailjs/util";
import {
  F,
  T,
  array,
  assign,
  entries,
  filter,
  forEach,
  fromEntries,
  fun,
  keys,
  nil,
  obj,
} from ".";

/**
 * Better minifyable way to instantiate a Set.
 */
export const hashSet = <T = any>(values?: readonly T[] | null) =>
  new Set<T>(values);

/**
 * Better minifyable way to instantiate a Map.
 */
export const hashMap = <K = any, V = any>(
  entries?: readonly (readonly [K, V])[] | null
) => new Map<K, V>(entries);

/**
 * Better minifyable way to instantiate a WeakMap.
 */
export const weakMap = <K extends object = any, V = any>(
  entries?: readonly (readonly [K, V])[] | null
) => new WeakMap<K, V>(entries);

/**
 * A common pattern used in the code base where something has a `clear` method.
 */
type Clearable<A extends any[]> = { clear(...args: A): any };

/**
 *  General function to "clear" objects, arrays, sets and maps.
 */
export const clear: {
  <T extends Clearable<A> | Nullish, A extends any[] = []>(
    map: T,
    ...args: A
  ): T;
  <T extends Record<keyof any, any>>(record: T): T;
} = (clearable: any, ...args: any[]) => (
  clearable != nil &&
    (clearable.clear
      ? clearable.clear(...args)
      : array(clearable)
      ? (clearable.length = 0)
      : keys(clearable, (key) => del(clearable, key))),
  clearable
);

/**
 * Test whether a set has a specified key, and if not, sets it and returns `true`. `false` otherwise.
 *
 * This is useful for recursive iteration where the same element must not be visited more than once (because infinite recursion sucks).
 */
export const mark = <K>(
  set: { has(value: K): boolean; add(value: K): any },
  value: K
) => (set.has(value) ? F : (set.add(value), T));

/**
 * A generalized function to get values from maps, test existence in sets and get properties on objects.
 */
export const get: {
  <K, V, Arg>(
    target: ArgNulls<{ get(key: K): V } | { has(key: K): V }, Arg>,
    key: K
  ): V | Nulls<Arg, undefined>;
  <K extends keyof any, V, Arg>(target: ArgNulls<Record<K, V>, Arg>, key: K):
    | V
    | Nulls<Arg, undefined>;
} = (target: any, key: any) =>
  target.get?.(key) ?? target?.has(key) ?? target?.[key];

/**
 * A generalized function to remove items from sets and maps, and delete properties from objects.
 * When only a single key/property is specified the deleted value is returned (`undefined` if not present).
 *
 * Multiple keys can be specified as once in which case the target will just be returned (like fluent API or whatever).
 */

export const del: {
  (target: null | undefined, keys: string | string[]): undefined;
  <K, V>(target: { get(key: K): V; delete(key: K): any }, item: K):
    | V
    | undefined;
  <K, R>(
    target: { has(key: K): boolean; delete(key: K): any },
    item: K
  ): boolean;
  <T extends { delete(key: K): any }, K>(target: T, keys: K[]): T;
  <T, K extends keyof T>(target: T, key: K): T[K] | undefined;
  <T>(target: T, keys: (keyof T)[]): T;
} = <T>(
  target:
    | { get?(item: T): any; has?(key: any): boolean; delete?(item: T): any }
    | null
    | undefined,
  key: any
) =>
  !target
    ? undefined
    : array(key)
    ? (forEach(key, (key) => target.delete?.(key) ?? delete target[key]),
      target)
    : (currentValue = target.has?.(key)) != null
    ? !currentValue
      ? undefined
      : ((currentValue = target.get?.(key)),
        target.delete!(key),
        currentValue ?? T)
    : ((currentValue = target[key]), delete target[key], currentValue);

/**
 * Sets the value for the specified key in a map, toggles the item in a set, or sets the property on an object.
 *
 * The value `undefined` deletes the key/property from maps and objects.
 * For sets `undefined` corresponds to the default value `true`, so here it has the opposite effect.
 */
let currentValue: any;
export const set: {
  <T>(
    set: { add(key: T): void; delete(key: T): void },
    item: T,
    toggle?: boolean
  ): boolean;
  <K, V>(
    map: {
      get(key: K): V | null;
      set(key: K, value: V): any;
      delete(key: K): void;
    },
    key: K,
    value: V | ((current: V | null) => V | null) | Nullish
  ): boolean;
} = (target: any, key: any, value: any = undefined) =>
  !!target.add // It's a set
    ? ((currentValue = target.has(key)),
      currentValue === (value ??= T) // Toggle? (Default is `true` which we set here).
        ? F
        : (value ? target.add(key) : del(target, key), T))
    : ((currentValue = target.get?.(key) ?? target[key]), // Get item from map / read property from object.
      fun(value) && (value = value(currentValue)), // Apply optional projection on current value.
      value === currentValue
        ? F // No change
        : (value === undefined // `undefined` means "delete".
            ? del(target, key)
            : target.set?.(key, value) ?? (target[key] = value),
          // Return that the value was changed.
          T));

/**
 * Gets the current item for a key in a map, or a property on an object.
 * If no value is present, it is initialized with the `defaultValue` and then returned.
 */
export const getOrSet: {
  <K, V, R extends V | Readonly<V>>(
    map:
      | {
          has(key: K): boolean;
          get(key: K): V | Nullish;
          set(key: K, value: V): void;
        }
      | Record<keyof any, any>,
    key: K,
    defaultValue: (key: K) => R
  ): V;
  <
    T extends Record<keyof any, any>,
    K extends keyof T,
    V,
    R extends V | Readonly<V>
  >(
    target: T,
    key: K,
    defaultValue: (key: K) => R
  ): V;
} = (map: any, key: any, defaultValue: (key: any) => any) =>
  map.has?.(key)
    ? map.get?.(key)
    : ((currentValue = defaultValue(key)),
      map.set?.(key, currentValue)
        ? currentValue
        : (map[key] ??= defaultValue(key)));

/**
 * Convenient way to use the values from a tuple.
 * If the tuple is null or undefined, that will be returned instead of applying the function.
 */
export const decompose = <Values extends any[] | Nullish, R>(
  tuple: Values,
  apply: (...values: OmitNullish<Values>) => R
): R | Nulls<Values> => tuple && apply(...(tuple as any));

/**
 * Creates a new object by projecting or excluding the properties of an existing one.
 */
export const transpose = <
  K extends keyof any,
  V,
  KP extends keyof any = K,
  VP = V
>(
  source: Record<K, V>,
  projection?: KeyValueProjection<K, V, [KP, VP] | null>,
  additionalEntries?: Record<KP, VP>
): Record<KP, VP> =>
  additionalEntries
    ? assign(transpose(source, projection), additionalEntries)
    : projection
    ? (fromEntries(filter(entries(source, projection)) as any) as any)
    : source;

/** Removes null'ish properties from an object */
export const clean = <T extends object>(o: T): Required<T> => {
  const inner = (o: object) =>
    forEach(entries(o), ([key, value], F) =>
      value == nil || (obj(value) && !inner(value)) ? (del(o, key), F) : T
    );
  inner(o);
  return o as any;
};

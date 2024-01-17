// General utility functions.

import type { ConstToTuples, Nullish } from "@tailjs/util";
import {
  F,
  bool,
  filter,
  keys,
  match,
  nil,
  push,
  size,
  str,
  undefined,
  type Json,
} from ".";

/**
 * Raises an error in the UI based on configuration and build settings.
 */
export const err = (code: string | Nullish, args?: any, error?: Error): void =>
  console.error(
    ...filter([code ?? error?.message ?? error ?? "error", args, error])
  );

/**
 * Applies a function to a value if it is not its types default value.
 * An object without properties and an empty array are considered the "default" for those types.
 */
export const ifNotDefault = <T, R = T>(
  value: T,
  action?: (value: T) => R
): R | undefined =>
  (typeof value === "object" && size(keys(value as any))) || value
    ? action
      ? action(value)
      : value
    : (undefined as any);

/**
 * Round a number of to the specified number of decimals.
 */
export const round = (x: number, decimals: number | boolean = 0) =>
  (bool(decimals) ? --(decimals as any) : decimals) < 0
    ? x
    : ((decimals = Math.pow(10, decimals as any)),
      Math.round(x * decimals) / decimals);

/**
 * `decodeURIComponent` for efficient minifying.
 */
export const decode = <T extends string | Nullish>(
  value: T
): T extends string ? string : null =>
  value == nil ? nil : (decodeURIComponent(value) as any);

/**
 * `encodeURIComponent` for efficient minifying.
 */
export const encode = <T extends string | Nullish>(
  value: T
): T extends string ? string : null =>
  value == nil ? nil : (encodeURIComponent(value) as any);

let parameters = {};
/**
 * Parses key/value pairs encoded as a URI query string (blah=foo&bar=gz%25nk).
 *
 * It supports that the same key can be specified multiple times.
 */
export const parseParameters = <T extends string | Nullish>(
  query: T
): T extends string ? Record<string, string[]> : T =>
  query == nil
    ? (query as any)
    : ((parameters = {}),
      match(query, /([^&=]+)(?:=([^&]+))?/g, (all, name, value) =>
        push(
          (parameters[lowerCase(decode(name))] ??= []),
          decode(str(value, F))
        )
      ),
      parameters);

/**
 * Convenient way to compare a value against multiple others.
 */
export const equals = <T>(value: T, ...values: T[]) =>
  values.some(value == nil ? (test) => test == nil : (test) => value === test);

/**
 *  Better minifyable version of `String`'s `toLowerCase` method that allows a null'ish parameter.
 */
export const lowerCase = <T extends string | Nullish>(s: T): T =>
  s?.toLowerCase() ?? (s as any);

/**
 * `JSON.stringify` with default settings for pretty-printing any value.
 */
export const prettify = (value: any): string => stringify(value, nil, 2) ?? "";

/**
 * `JSON.stringify` method for efficient minifying that also ignores null'ish values.
 */
export const stringify = <T>(
  value: T,
  replacer?: any,
  space?: string | number
): T extends Nullish ? null : string =>
  value == nil ? nil : (JSON.stringify(value, replacer, space) as any);

/**
 * `JSON.parse` method for efficient minifying that also gracefully handles null values.
 */
export const parse = <T extends Json = Json>(value: string | null): T =>
  value == nil ? nil : JSON.parse(value);

/**
 * Fast way to join two optional strings with a space.
 * If they are both nullish, nullish will be returned (unless `defaultValue`).
 */
export const concat2 = <
  T1 extends string | Nullish,
  T2 extends string | Nullish,
  Default extends string | Nullish = null
>(
  value1: T1,
  value2: T2,
  defaultValue: Default = nil as any
) =>
  value1 && value2 ? value1 + " " + value2 : (value1 || value2) ?? defaultValue;

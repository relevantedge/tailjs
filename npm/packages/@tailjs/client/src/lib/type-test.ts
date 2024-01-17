import type { IsAny, IterableOrArrayLike, Nullish } from "@tailjs/util";
import { F, T, nil } from ".";

/**
 * Converts various types' common representation of `true` and `false` to actual `true` and `false`.
 */
export const parseBoolean = (
  value: string | boolean | null | number | undefined
) =>
  bool(value)
    ? value
    : value === 0
    ? F
    : value === 1
    ? T
    : value === "false"
    ? F
    : value === "true"
    ? T
    : undefined;

/** Constants for type testing. */
export const STRING = 0,
  BOOLEAN = 1,
  NUMBER = 2,
  FUNCTION = 3,
  OBJECT = 4,
  ARRAY = 5,
  REGEX = 6;

/**
 * When checking the string from `typeof blah`, no more than this is required for type tests.
 */
const typePrefixes = ["s", "b", "n", "f", "o"];

/**
 * Tests whether a given value is of the desired type.
 */
export const is = <T extends number>(
  type: T,
  value: any
): value is T extends typeof STRING
  ? string
  : T extends typeof BOOLEAN
  ? boolean
  : T extends typeof NUMBER
  ? number
  : T extends typeof FUNCTION
  ? (...args: any) => any
  : T extends typeof OBJECT
  ? { [P in keyof any]: any }
  : T extends typeof ARRAY
  ? any[]
  : T extends typeof REGEX
  ? RegExp
  : never =>
  type === ARRAY
    ? Array.isArray(value)
    : (value != nil && typePrefixes[type] === (typeof value)[0]) ||
      (type === REGEX && value.exec);

type UnwrapArray<T, V = any> = IsAny<V> extends true
  ? T
  : T extends IterableOrArrayLike<any>
  ? V extends IterableOrArrayLike<infer V> & { toLowerCase?(): never }
    ? V[]
    : T
  : T;

/**
 * A general pattern used to type test or parse values of various types.
 */
export type TestOrConvertFunction<
  T,
  AllowParse = never,
  ConvertArgs extends any[] = []
> = {
  <V>(value: V, parseStrict: false, ...args: ConvertArgs): V extends T
    ? T extends V
      ? UnwrapArray<T, V>
      : V
    : V extends AllowParse
    ? UnwrapArray<T, V>
    : T | undefined;
  <V>(value: V, parseStrict: true): V extends T ? V : T;
  <V extends T = T>(value: any): value is Exclude<V, Nullish>;
};

/**
 * Factory creating {@link TestOrConvertFunction}s.
 */
export const testOrConvertFunction: {
  <T, AllowParse = never, ConvertArgs extends any[] = []>(
    type: number,
    convert: (value: any, ...args: ConvertArgs) => T | undefined
  ): TestOrConvertFunction<T, AllowParse, ConvertArgs>;
  <T>(type: number): <V extends T = T>(
    value: any
  ) => value is Exclude<V, Nullish>;
} =
  (
    type: number,
    convert?: (value: any, parse?: boolean, ...args: any[]) => any
  ) =>
  (value: any, parse?: boolean, ...args: any): value is any =>
    parse === undefined
      ? is(type, value)
      : is(type, value)
      ? value
      : !parse
      ? undefined
      : convert?.(value, parse, ...args);

/**
 * Tests or parses Boolean values.
 */
export const bool = testOrConvertFunction<boolean, any>(
  BOOLEAN,
  (value) => value !== "0" && value !== "false" && value !== "no" && !!value
);

/**
 * Tests or parses numerical values.
 */
export const num = testOrConvertFunction<number>(
  NUMBER,
  (value) => ((value = parseFloat(value)), isNaN(value) ? undefined : value)
);

/**
 * Tests if a value is a string, and if not, makes one by calling the value's `toString()` method.
 */
export const str = testOrConvertFunction<string>(STRING, (value) =>
  value?.toString()
);

/**
 * Tests if a value can be invoked as a function.
 */
export const fun = testOrConvertFunction<(...args: any[]) => any>(
  FUNCTION,
  (_) => undefined
);

/**
 * Tests if a value is strictly an object (object but not array).
 */
export const obj = testOrConvertFunction<object>(OBJECT);

/**
 * Tests if a value is an ECMAScript array (not TypedArray, those are too fancy).
 */
export const array = (() =>
  // Needs wrapped in function, otherwise the multi-line type screws syntax highlighting.
  testOrConvertFunction<
    any[],
    IterableOrArrayLike<any> & { toLowerCase?(): never }
  >(ARRAY, (value) => (iterable(value) ? [...value] : undefined)))();

/**
 * Utility type for {@link iterable} to help TypeScript know strings are not iterables.
 */
type IterableNotString<T> = T extends string
  ? never
  : T extends IterableOrArrayLike<any>
  ? T
  : never;

/**
 * Tests if a value is an iterable collection of values (Iterable but not string).
 */
export const iterable = <T>(value: T): value is IterableNotString<T> =>
  value && !str(value) && !!value[Symbol.iterator];

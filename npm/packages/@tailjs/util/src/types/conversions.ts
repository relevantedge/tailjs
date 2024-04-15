import type { Defined, MaybePromise, MaybeUndefined } from "..";
import { tryCatch } from "..";

/**
 * Trick for having a function that returns a non-null value, if a formal paramter always has a non-null value,
 * simliar to .NET's [NotNullIfNotNull].
 *
 * If the actual parameter can have a null or undefined value the return value will include these options.
 *
 * `function example<T,A>(arg: (T|null|undefined)&A): string | Null<A> {...}`
 * `example(80)` returns `string`
 *  `const x: number|null; example(x)` returns `string|null`.
 *
 * There can also be a "null" default (so all Null'ish values maps to one value). If the function above returned `string | Null<T,undefined>`, then
 * `example(x)` returns `string|undefined`.
 */
export type Nulls<T, NullLevels = null | undefined> = T extends
  | null
  | undefined
  | void
  ? T extends NullLevels | void
    ? T & NullLevels
    : NullLevels
  : never;

export type AllKeys<Ts> = Ts extends infer T ? keyof T : never;
/**
 * Creates a new type where with all the properties from any of the specified types.
 * This can make life easier for code working with polymorphic types.
 */

export type CommonTypeTemplate<Ts> = {
  [P in AllKeys<Ts>]?: Ts extends infer T
    ? P extends keyof T
      ? T[P]
      : never
    : never;
};

export type ExpandTypes<
  Ts,
  Common = CommonTypeTemplate<Ts>
> = Ts extends infer T
  ? {
      [P in keyof Common]: P extends keyof T ? T[P] : Common[P];
    }
  : never;

/**
 * Typescript has the distinction between `void` and `undefined`.
 * I'm sure there is a theorically sound explanation. Both that and the distinction are annoying so this little utility type maps `void` to `undefined`.
 *
 * The ampersand union trick makes TypeScript relax instead of the "The type T could be instantiated etc..." error.
 */
export type Voidefined<T> = T extends void ? T & undefined : T;

export const NULL = 0;
export const UNDEFINED = 1;
export const BOOLEAN = 2;
export const NUMBER = 3;
export const BIGINT = 4;
export const STRING = 5;
export const ARRAY = 6;
export const OBJECT = 7;
export const DATE = 8;
export const SYMBOL = 9;
export const FUNCTION = 10;
export const ITERABLE = 11;
export const MAP = 12;
export const SET = 13;
export const PROMISE = 14;

const T1 = {
  ["n"]: NUMBER,
  ["f"]: FUNCTION,
};
const T2 = {
  ["o"]: BOOLEAN,
  ["i"]: BIGINT,
  ["t"]: STRING,
  ["y"]: SYMBOL,
};

export type TypeTester<T> = (value: any) => value is T;
export type TypeConverter<T> = (value: any, parse?: boolean) => T | undefined;

export const undefined = void 0;
export const nil = null;

/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolIterator = Symbol.iterator;

/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolAsyncIterator = Symbol.asyncIterator;

/** Fast way to check for precence of function argument. */
export const NO_ARG = Symbol();

const createConverter =
  <T>(typeTester: TypeTester<T>, parser?: (value: any) => T | undefined) =>
  (value: any, parse = true) =>
    typeTester(value)
      ? value
      : parser && parse && isDefined((value = parser(value)))
      ? value
      : undefined;

export const isNull = (value: any): value is null => value === nil;

export const isUndefined = (value: any): value is undefined | void =>
  value === undefined;

export const isDefined = <T>(value: T): value is Defined<T> =>
  value !== undefined;

export const ifDefined = <T, R>(
  value: T,
  result: (value: NonNullable<T>) => R
): MaybeUndefined<T, R> =>
  value !== undefined ? (result(value as any) as any) : undefined;

export const isNullish = (value: any): value is undefined | void | null =>
  value == nil;

export const hasValue = <T>(
  value: T
): value is Exclude<T, undefined | void | null> => value != nil;

export const isBoolean = (value: any): value is boolean =>
  typeof value === "boolean";

export const parseBoolean = createConverter(isBoolean, (value) => !!value);
export const isTruish = (value: any) => !!value;

export type Falsish = void | null | undefined | 0 | "" | false;

export const isFalsish = (value: any): value is Falsish => !value;

export const isInteger: (value: any) => value is number =
  Number.isSafeInteger as any;

export const isNumber = (value: any): value is number =>
  typeof value === "number";

export const isFinite: (value: any) => value is number = Number.isFinite as any;

export const parseNumber = createConverter(isNumber, (value) =>
  parseFloat(value)
);

export const isBigInt = (value: any): value is bigint =>
  typeof value === "bigint";
export const parseBigInt = createConverter(isBigInt, (value) =>
  tryCatch(() => BigInt(value))
);

export const isString = (value: any): value is string =>
  typeof value === "string";

export const toString = createConverter(isString, (value) =>
  hasValue(value) ? "" + value : value
);

export const isArray: (value: any) => value is readonly any[] = Array.isArray;

/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */
export const toArray: {
  // <T>(value: AsyncIterable<T>, clone?: boolean): MaybeUndefined<
  //   [T][0],
  //   Promise<T[]>
  // >;
  <T>(value: T | Iterable<T>, clone?: boolean): MaybeUndefined<[T][0], T[]>;
} = (value: any, clone = false): any =>
  isUndefined(value)
    ? undefined
    : !clone && isArray(value)
    ? value
    : isIterable(value)
    ? [...value]
    : // : isAsyncIterable(value)
      // ? toArrayAsync(value)
      ([value] as any);

const toArrayAsync = async (
  values: AsyncIterable<any>,
  results: any[] = []
) => {
  for await (const value of values) {
    results.push(value);
  }
  return results;
};

export const isObject = <AcceptIterables extends boolean = false>(
  value: any,
  acceptIterables: AcceptIterables = false as any
): value is AcceptIterables extends true
  ? object & (Record<keyof any, any> | Iterable<any>)
  : object & Record<keyof any, any> & { [Symbol.iterator]?: never } =>
  value != null &&
  typeof value === "object" &&
  (acceptIterables || !value[symbolIterator]);

export const hasMethod = <T, Name extends keyof any>(
  value: T | unknown,
  name: Name | keyof T
): value is {
  [P in keyof T]: P extends Name
    ? T extends { [P in Name]?: (...args: infer Args) => infer R }
      ? Args extends unknown
        ? (...args: any) => any
        : (...args: Args) => R
      : (...args: any) => any
    : T[P];
} => typeof (value as any)?.[name] === "function";

export const isDate = (value: any): value is Date => value instanceof Date;
export const parseDate = createConverter(isDate, (value) =>
  isNaN((value = Date.parse(value))) ? undefined : value
);

export const isSymbol = (value: any): value is symbol =>
  typeof value === "symbol";

export const isFunction = (value: any): value is (...args: any) => any =>
  typeof value === "function";

export const isIterable = (
  value: any,
  acceptStrings = false
): value is Iterable<any> =>
  !!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));

export const isAsyncIterable = (value: any): value is AsyncIterable<any> =>
  !!value?.[symbolAsyncIterator];

export const toIterable = <T>(value: T | Iterable<T>): Iterable<T> =>
  isIterable(value) ? value : [value];

export const isMap = (value: any): value is Map<any, any> =>
  value instanceof Map;

export const isSet = (value: any): value is Set<any> => value instanceof Set;

export const isAwaitable = (value: any): value is Promise<any> => !!value?.then;

export const typeCode = (value: any, typeName = typeof value) =>
  value == nil
    ? value === nil
      ? NULL
      : UNDEFINED
    : T1[typeName[0]] ??
      T2[typeName[1]] ??
      (Array.isArray(value) ? ARRAY : value instanceof Date ? DATE : OBJECT);

/**
 * Evaluates a function that can be used to capture values using parameter default values.
 *
 * For example `(previous=current)=>(current+=2, previous)
 */
export const capture = <R>(capture: (...args: any[]) => R) => capture();

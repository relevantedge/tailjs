export type EncodableArray = Encodable[];

export type EncodableTuple = [...Items: Encodable[]];

export type EncodableObject = Partial<{
  [K in string | number]?: Encodable;
}>;

/**
 * All possible values that can be represented with JSON.
 */
export type Encodable =
  | null
  | undefined
  | string
  | number
  | boolean
  | EncodableArray
  | EncodableTuple
  | EncodableObject;

type ConverterFunctionValue<T> = T extends { toJSON(): infer V }
  ? V
  : T extends { valueOf(): infer V }
  ? V
  : T;

type ConverterValue<T> = T extends ConverterFunctionValue<T>
  ? never
  : ConverterFunctionValue<T>;

type IsNever<T> = [T] extends [never] ? true : false;

/**
 * The shape of the data that will come back when decoding the encoded value of a type.
 *
 * This assumes that only the shapes permitted by {@link Encodable} are serialized.
 * Otherwise not ignored since functions are in fact serialized as `{}`.
 */
export type Decoded<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reason, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? Decoded<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: Decoded<T[index]> }
  : T extends Iterable<infer T>
  ? Decoded<T>[]
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      -readonly [P in keyof T as P extends string | number
        ? Decoded<T[P]> extends undefined
          ? never
          : P
        : never]: Decoded<T[P]>;
    }
  : never;

/**
 * The broadest possible subtype of a given type that can be serialized and then deserialized without violating the type's contract,
 * with the exception of well-known symbol properties. Those are ignored.
 *
 * Not violating the constract does not mean that the type can loslessly be serialized and then deserialized back.
 * It just means that its contract will not be violated if values of a certain type are omitted or deserialized back to another valid subtype.
 * For example, an iterable that is not an array will be deserialized as an array.
 *
 * In particular functions or promises are serialized as empty objects `{}`, and cannot be deserialized back.
 * This means that required constraints on properies that only allow these types can never be met.
 * Similarly, arrays the can only hold functions or promises must be empty (`never[]`) to satisfy the type constraint.
 *
 */
export type EncodableContract<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reasons, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined | void
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? EncodableContract<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: EncodableContract<T[index]> }
  : T extends Iterable<any>
  ? T
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      // Fun fact: TypeScript keeps optional properties if we iterate keyof P and then exclude symbols with the `extends` construct.
      //  `(keyof T & symbol)` or `Exclude <keyof T, symbol>` makes all properties required. (`{ a?: undefined}` becomes `{a:undefined}`)
      // Keeping optional `undefined` properties means that the property name is still allowed in a type like `{a()?: boolean}`, even though functions are not allowed.
      [P in keyof T as P extends symbol ? never : P]: EncodableContract<T[P]>;
    }
  : never;

/**
 * Shorthand for a value that is optionally awaitable.
 */
export type MaybePromise<T> = PromiseLike<T> | T;

export type ValueOrDefault<T, R, D = undefined> = T extends
  | null
  | undefined
  | void
  ? D
  : R;

/** Shorter than writing all this out, and slightly easier to read. */
export type Nullish = null | undefined;

/**
 * Removes null'ish values from a union.
 */
export type OmitNullish<T> = T extends Nullish ? never : T;

/**
 * Common function type used for projection of [key,value] entries.
 */
export type KeyValueProjection<K, V, R> = (
  entry: [key: K, value: V],
  index: number
) => R;

/**
 * Shorthand for a type that is inferred from a parameter and can either be the item in an iterable, or just the type itself.
 */
export type IterableOrSelf<T> = IterableOrArrayLike<T> | T;

/**
 * Tests if a type is `any`. The test used is technically impossable to succeed unless the type is in fact `any`.
 */
export type IsAny<T> = ((unlikely: { d7d52e56b9c14b2b99c207f89f839630: T }) => {
  bd88181902d54401bb37e71194dd8b7d: T;
}) extends T
  ? true
  : false;

/**
 * Utility type to allow `as const` to be used on tuples returned from functions without actually making them `readonly` (which is annoying).
 * Normally TypeScript considers the return value of a function like `x=>[10,"four"]` to be `(string|number)[]` (which is also annoying).
 */
export type ConstToTuples<T> = T extends readonly any[]
  ? { -readonly [P in keyof T]: T[P] }
  : Voidefined<T>;

/**
 * Goes with {@link Nulls} to simplify the expression.
 */
export type ArgNulls<T, Arg> = (T | Nullish) & Arg;

/**
 * Trick for having a function that returns a non-null value, if a formal paramter always has a non-null value.
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

/**
 * Typescript has the distinction between `void` and `undefined`.
 * I'm sure there is a theorically sound explanation. Both that and the distinction are annoying so this little utility type maps `void` to `undefined`.
 *
 * The ampersand union trick makes TypeScript relax instead of the "The type T could be instantiated etc..." error.
 */
export type Voidefined<T> = T extends void ? T & undefined : T;

/**
 * An extension to T[] and Iterable<T> that also correctly captures weird things like NodeListOf<T>
 */
export type IterableOrArrayLike<T> =
  | Iterable<T>
  | { [item: number]: T; length: number };

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

const createConverter =
  <T>(typeTester: TypeTester<T>, parser?: (value: any) => T | undefined) =>
  (value: any, parse = true) =>
    typeTester(value)
      ? value
      : parser && parse && isDefined((value = parser(value)))
      ? value
      : undefined;

export const tryCatch = <T, C = undefined>(
  expression: () => T,
  errorHandler?: (error: any) => C,
  clean?: () => void
): T | C => {
  try {
    return expression();
  } catch (e) {
    return errorHandler?.(e) as any;
  } finally {
    clean?.();
  }
};

export const tryCatchAsync = async <T, C = undefined>(
  expression: () => Promise<T> | T,
  errorHandler?: (error: any) => Promise<C> | C,
  always?: () => void
): Promise<T | C> => {
  try {
    return await expression();
  } catch (e) {
    return (await errorHandler?.(e)) as any;
  } finally {
    always?.();
  }
};

export const isNull = (value: any): value is null => value === nil;
export const isUndefined = (value: any): value is undefined | void =>
  value === undefined;
export const isDefined = <T>(value: T): value is Exclude<T, undefined | void> =>
  !isUndefined(value);

export const hasValue = <T>(
  value: T
): value is Exclude<T, undefined | void | null> => value != nil;

export const isBoolean = (value: any): value is boolean =>
  typeof value === "boolean";
export const parseBoolean = createConverter(isBoolean, (value) => !!value);

export const isNumber = (value: any): value is number =>
  typeof value === "number";
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

export const isArray = Array.isArray;
export const toArray = <T>(value: T | Iterable<T>): T[] =>
  value == null
    ? []
    : isArray(value)
    ? value
    : isIterable(value)
    ? [...value]
    : ([value] as any);

export const isObject = (value: any): value is object =>
  value && typeof value === "object";

/** Tests whether a value is an object but not an array. */
export const isPureObject = (
  value: any
): value is object & { [Symbol.iterator]?: never } =>
  isObject(value) && !isIterable(value);

export const isDate = (value: any): value is Date => value instanceof Date;
export const parseDate = createConverter(isDate, (value) =>
  isNaN((value = Date.parse(value))) ? undefined : value
);

export const isSymbol = (value: any): value is symbol =>
  typeof value === "symbol";

export const isFunction = (value: any): value is (...args: any) => any =>
  typeof value === "function";

export const isIterable = (value: any): value is Iterable<any> =>
  value?.[Symbol.iterator] && !isString(value);

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

export const identity = <T = any>(value: T) => value;

export const clone = <T>(value: T): T =>
  isArray(value)
    ? [...value]
    : isPureObject(value)
    ? { ...value }
    : (value as any);

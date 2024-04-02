import { Wrapped, map, obj, unwrap, type reduce } from ".";

export type IsNever<T> = [T] extends [never] ? true : false;

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
 * The defined part of a type, excluding undefined and void (which is also undefined).
 */
export type Defined<T> = Exclude<T, undefined | void>;

/**
 * A record that may have the specified keys and values.
 */
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

/**
 * Makes the specified properties partial.
 */
export type PickPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Makes all other properties than the specified partial.
 */
export type OmitPartial<T, K extends keyof T> = Pick<T, K> &
  Partial<Omit<T, K>>;

/**
 * The ECMAScript primitive types.
 */
export type Primitives =
  | null
  | undefined
  | void
  | boolean
  | number
  | bigint
  | string
  | symbol
  | Date;

export type RecordType = object &
  Record<keyof any, any> & {
    [Symbol.iterator]?: never;
    [Symbol.hasInstance]?: never;
  };

/** Simplifies the return value for functions like `get<T,Required extends boolean>(value: T, required?:Required): MaybeRequired<T,Required> => ...` */
export type MaybeRequired<T, Required> = IIf<Required, T, T | undefined>;

/** Negates a Boolean value */
export type Not<B> = IIf<B, false, true>;

/** Simplifies Boolean checks (insted of having to write B extends bla, bla...).  */
export type IfNot<B, T> = IIf<B, never, T>;

/** Simplifies Boolean checks (insted of having to write B extends bla, bla...).  */
export type IIf<B, True, False = never> = B extends true
  ? True
  : B extends (unknown extends B ? any : false)
  ? False
  : never;

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

type FunctionComparisonEqualsWrapped<T> = T extends (
  T extends {} ? infer R & {} : infer R
)
  ? { [P in keyof R]: R[P] }
  : never;

type FunctionComparisonEquals<A, B> = (<
  T
>() => T extends FunctionComparisonEqualsWrapped<A> ? 1 : 2) extends <
  T
>() => T extends FunctionComparisonEqualsWrapped<B> ? 1 : 2
  ? true
  : false;

/**
 * Tests if a type is `any`.
 */
export type IsAny<T> = FunctionComparisonEquals<T, any>;

/**
 * Only returns the type if it is not `any`.
 */
export type ExcludeAny<T> = FunctionComparisonEquals<T, any> extends true
  ? never
  : T;

/**
 * Utility type to allow `as const` to be used on tuples returned from functions without actually making them `readonly` (which is annoying).
 * Normally TypeScript considers the return value of a function like `x=>[10,"four"]` to be `(string|number)[]` (which is also annoying).
 */
export type ConstToNormal<T> = T extends readonly [...any[]]
  ? { -readonly [P in keyof T]: ConstToNormal<T[P]> }
  : Voidefined<T>;

/**
 * Goes with {@link Nulls} to simplify the expression.
 */
export type ArgNulls<T, Arg> = (T | Nullish) & Arg;

/**
 *  TypeScript may be very literal when it infers types. The type fo a function parameter with the value `10` may be inferred as `10` and not `number`.
 *  This is an issue in e.g. {@link reduce}.
 */
export type GeneralizeContstants<T> = T extends number
  ? number
  : T extends string
  ? string
  : T extends boolean
  ? boolean
  : T extends (...args: infer A) => infer R
  ? (...args: GeneralizeContstants<A>) => GeneralizeContstants<R>
  : unknown extends T
  ? unknown
  : {
      [P in keyof T]: GeneralizeContstants<T[P]>;
    };

/**
 * The eclectic type found everywhere on the Internet.
 * It convers a union like `{a:1}|{b:2}` to the intersection `{a:1, b:2}`
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Makes a union of objects like `{a:1}&{b:2}` appear as `{a:1,b:2}` in intellisense.
 */
export type PrettifyIntersection<T> = T extends { [P in infer K]: any }
  ? { [P in K]: T[P] }
  : never;

type KeyValuePairToProperty<K, V> = K extends keyof any
  ? { [P in K]: V }
  : never;

/**
 * Makes an array of key/value pairs to an object with the corresponding properties.
 */
export type KeyValuePairsToObject<T> = PrettifyIntersection<
  T extends []
    ? {}
    : T extends [[infer K, infer V], ...infer Rest]
    ? KeyValuePairToProperty<K, V> & KeyValuePairsToObject<Rest>
    : T extends [infer K, infer V][]
    ? UnionToIntersection<KeyValuePairToProperty<K, V>>
    : never
>;

/**
 * Anything but a function.
 */
export type NotFunction =
  | bigint
  | boolean
  | null
  | number
  | string
  | symbol
  | undefined
  | {
      [key: string | number | symbol]: any;
      [Symbol.hasInstance]?: never;
    };

type CreateArray<Len, Ele, Arr extends Ele[] = []> = Arr["length"] extends Len
  ? Arr
  : CreateArray<Len, Ele, [Ele, ...Arr]>;

export type Add<A extends number, B extends number> = [
  ...CreateArray<A, 1>,
  ...CreateArray<B, 1>
]["length"];

export type Minus<A extends number, B extends number> = CreateArray<
  A,
  1
> extends [...CreateArray<B, 1>, ...infer R]
  ? R["length"]
  : never;

export type Entries<T> = UnionToTuple<
  {
    [P in keyof T]: [P, T[P]];
  } extends infer T
    ? T[keyof T]
    : never
>;

const internal = Symbol();
type Token = typeof internal;

/** Can be used to avoid infinite recursion by recognizing if a type has already been seen. Use with {@link CurrentRecursion}. */

export type RecursionKey<T, Seen> = Seen extends [Token, T, ...infer Rest]
  ? [Token, T, T, ...Rest]
  : [Token, T, T];

/** Can be used to avoid infinite recursion by recognizing if how many times a type has already been seen. Use with {@link RecursionKey}. */
export type CurrentRecursion<T, Seen> = Seen extends [Token, T, ...infer Rest]
  ? Rest["length"]
  : 0;

/** Can be used to avoid infinite recursion by recognizing if how many times a type has already been seen. Use instead of `never` as the seed for seen types. */
export type RecursionSeed = Token;

// From https://www.hacklewayne.com/typescript-convert-union-to-tuple-array-yes-but-how.

export type UnionToTuple<T> = PickOne<T> extends infer U // assign PickOne<T> to U
  ? Exclude<T, U> extends never // T and U are the same
    ? [T]
    : [...UnionToTuple<Exclude<T, U>>, U] // recursion
  : never;

type Contra<T> = T extends any ? (arg: T) => void : never;

type InferContra<T> = [T] extends [(arg: infer I) => void] ? I : never;

type PickOne<T> = InferContra<InferContra<Contra<Contra<T>>>>;

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

/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolIterator = Symbol.iterator;

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

export const tryCatch = <T, C = undefined>(
  expression: () => T,
  errorHandler: boolean | ((error: any) => C) = true as any,
  clean?: () => void
): T | C => {
  try {
    return expression();
  } catch (e) {
    if (!isBoolean(errorHandler)) {
      return errorHandler?.(e) as any;
    }
    if (errorHandler) {
      throw e;
    }
    console.error(e);
    return undefined as any;
  } finally {
    clean?.();
  }
};

export const tryCatchAsync = async <T, C = void>(
  expression: () => PromiseLike<T> | T,
  errorHandler:
    | boolean
    | ((error: any, last: boolean) => Promise<C> | C) = true as any,
  clean?: () => void,
  retries = 1
): Promise<T | C> => {
  while (retries--) {
    try {
      return await expression();
    } catch (e) {
      if (!isBoolean(errorHandler)) {
        (await errorHandler(e, !retries)) as any;
      } else if (errorHandler && !retries) {
        throw e;
      } else {
        console.error(e);
      }
    } finally {
      clean?.();
    }
  }
  return undefined as any;
};

export const as = <T, D = undefined, Args extends any[] = []>(
  value: any,
  converter: (value: any, ...rest: Args) => T | undefined,
  defaultValue?: D,
  ...args: Args
): T | D => ((value = converter(value, ...args)) ?? defaultValue) as any;

export const cast = <T, V, Args extends any[] = []>(
  value: V,
  typeTest: (value: any, ...args: Args) => value is T,
  ...args: Args
): V extends T ? V : undefined =>
  typeTest(value, ...args) ? (value as any) : undefined;

export const isNull = (value: any): value is null => value === nil;

export const isUndefined = (value: any): value is undefined | void =>
  value === undefined;

export const isDefined = <T>(value: T): value is Defined<T> =>
  value !== undefined;

export const isNullish = <T>(
  value: T
): value is Exclude<T, undefined | void | null> => value == nil;

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
export const toArray = <T>(
  value: T | Iterable<T>,
  clone = false
): T extends undefined ? undefined : T[] =>
  isUndefined(value)
    ? undefined
    : !clone && isArray(value)
    ? value
    : isIterable(value)
    ? [...value]
    : ([value] as any);

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
  value?.[symbolIterator] && (typeof value === "object" || acceptStrings);

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

export const clone = <T>(value: T, depth: number | boolean = true): T =>
  isObject(value, true)
    ? isArray(value)
      ? depth
        ? value.map((value) => clone(value, depth === true || --(depth as any)))
        : [...value]
      : isSet(value)
      ? new Set<any>(
          depth
            ? (map as any)(value, (value: any) =>
                clone(value, depth === true || --(depth as any))
              )
            : value
        )
      : isMap(value)
      ? new Map<any, any>(
          depth
            ? (map as any)(value, (value: any) =>
                // Does not clone keys.
                [value[0], clone(value[1], depth === true || --(depth as any))]
              )
            : value
        )
      : depth
      ? obj(
          map(value as any, ([k, v]) => [
            k,
            clone(v, depth === true || --(depth as any)),
          ])!
        )
      : { ...value }
    : (value as any);

/**
 * Evaluates a function that can be used to capture values using parameter default values.
 *
 * For example `(previous=current)=>(current+=2, previous)
 */
export const capture = <R>(capture: (...args: any[]) => R) => capture();

type ErrorGenerator = string | Error | (() => string | Error);

export const throwError = <T = any>(
  error: ErrorGenerator,
  transform: (string: string) => Error = (message) => new TypeError(message)
): T => {
  throw isString((error = unwrap(error))) ? transform(error) : error;
};

type CombineTypeTests<T> = T extends []
  ? {}
  : T extends [infer F, ...infer Rest]
  ? F extends (value: any) => value is infer R
    ? (IsAny<R> extends true ? T : R) & CombineTypeTests<Rest>
    : never
  : never;

export const validate = <
  T,
  Validator extends
    | ((candidate: T) => candidate is any)
    | ((candiate: T) => R)
    | [
        validate: (candiate: T) => any,
        ...typeTests: ((candidate: T) => candidate is any)[]
      ]
    | (R & NotFunction),
  R
>(
  value: T,
  validate: Validator | R,
  validationError?: ErrorGenerator,
  undefinedError?: ErrorGenerator
): Defined<
  Validator extends [any, ...infer TypeTests]
    ? CombineTypeTests<TypeTests>
    : Validator extends ((value: any) => infer R) | infer R
    ? R extends Falsish
      ? never
      : Validator extends (value: any) => value is infer R
      ? IsAny<R> extends true
        ? T
        : Defined<R>
      : T
    : never
> =>
  (
    isArray(validate)
      ? validate.every((test) => test(value))
      : isFunction(validate)
      ? validate(value)
      : validate
  )
    ? value
    : required(value, undefinedError ?? validationError) &&
      (throwError(validationError ?? "Validation failed.") as any);

export class InvariantViolatedError extends Error {
  constructor(invariant?: string) {
    super(invariant ? "INV: " + invariant : "An invariant was violated.");
  }
}

/**
 * States an invariant.
 */
export const invariant = <T>(
  test: Wrapped<T | false>,
  description?: string
): Defined<T> => {
  const valid = unwrap(test);
  return isDefined(valid) && valid !== false
    ? (valid as any)
    : throwError(new InvariantViolatedError(description));
};

export const required = <T>(value: T, error?: ErrorGenerator): Defined<T> =>
  isDefined(value)
    ? value
    : throwError(
        error ?? "A required value is missing",
        (text) => new TypeError(text.replace("...", " is required."))
      );

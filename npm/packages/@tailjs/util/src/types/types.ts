import { AllKeys, Extends, MaybeUndefined, tryCatch } from "..";

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

export type NonAsync =
  | Primitives
  | Iterable<any>
  | ((...args: any[]) => any)
  | SimpleObject;

/**
 * Common function type used for projection of [key,value] entries.
 */
export type KeyValueProjection<K, V, R> = (
  entry: [key: K, value: V],
  index: number
) => R;

/**
 * Anything but a promise.
 */
export type NotPromise = { then?: never };

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

/** Shorter than writing all this out, and slightly easier to read. */
export type Nullish = null | undefined;
export type CaptureNullish<Parameter, Nulls> = (Parameter | Nullish) & Nulls;
export type MaybeNullish<ReturnType, Nulls = ReturnType> = Nulls extends Nullish
  ? Nulls
  : ReturnType;

export type PromiseIfPromiseLike<
  Value,
  ParameterValue = Value
> = ParameterValue extends PromiseLike<any>
  ? Promise<UnwrapPromiseLike<Value>>
  : Value;

export const isTruish = <T>(value: T): value is Exclude<T, Falsish> => !!value;
export const isTrue = (value: any): value is true => value === T;
export const isNotTrue = <T>(value: T): value is Exclude<T, true> =>
  value !== T;

export type Falsish = void | null | undefined | 0 | "" | false;
export type CaptureFalsish<Parameter, Nulls> = (Parameter | Falsish) & Nulls;
export type MaybeFalsish<
  ReturnType,
  Value = ReturnType
> = ReturnType extends Falsish
  ? ReturnType extends Nullish
    ? ReturnType
    : undefined
  : Value;

export type NullishOrFalse = void | null | undefined | false;
export type CaptureNullishOrFalse<Parameter, Nulls> = (
  | Parameter
  | NullishOrFalse
) &
  Nulls;

export type MaybeNullishOrFalse<
  ReturnType,
  Parameter = ReturnType
> = Parameter extends NullishOrFalse
  ? Parameter extends Nullish
    ? Parameter
    : undefined
  : ReturnType;

/** A record type that is neither iterable or a function. */
export type SimpleObject<K extends keyof any = keyof any, V = any> = object & {
  readonly [P in K]?: V;
} & {
  [Symbol.iterator]?: never;
  [Symbol.asyncIterator]?: never;
  [Symbol.hasInstance]?: never;

  then?(
    onfulfilled?: ((value: any) => any) | undefined | null,
    onrejected?: ((reason: any) => any) | undefined | null
  ): never;
};

export type UnwrapPromiseLike<T> = T extends PromiseLike<infer T>
  ? UnwrapPromiseLike<T>
  : T;

export type MaybePromiseLike<T> = T | PromiseLike<T>;

export type MaybePromise<T> = T | Promise<T>;

/**
 * Shorthand for a value that is optionally awaitable.
 */
export type TogglePromise<T, Toggle = boolean> = Toggle extends
  | true
  | PromiseLike<any>
  ? T extends PromiseLike<any>
    ? T
    : PromiseLike<T>
  : T extends PromiseLike<infer T>
  ? UnwrapPromiseLike<T>
  : T;

/**
 * Trick for having a function that returns a non-null value, if a formal parameter always has a non-null value,
 * similar to .NET's [NotNullIfNotNull].
 *
 * If the actual parameter can have a null or undefined value the return value will include these options.
 *
 * `function example<T,A>(arg: (T|null|undefined)&A): string | Null<A> {...}`
 * `example(80)` returns `string`
 *  `const x: number|null; example(x)` returns `string|null`.
 *
 * There can also be a "null" default (so all Null'ish values maps to one value). If the function above returned `string | Null<T,undefined>`, then
 * `example(x)` returns `string|undefined`.
 *
 * @obsolete
 */
export type Nulls<T, NullLevels = null | undefined> = T extends
  | null
  | undefined
  | void
  ? T extends NullLevels | void
    ? T & NullLevels
    : NullLevels
  : never;

/** If any type in a union has a value for the given property that cannot be null'ish.*/
export type HasRequiredProperty<T, P> = true extends (
  T extends infer T
    ? true extends Extends<
        Nullish,
        keyof T extends P ? T[P & keyof T] : P extends keyof T ? T[P] : never
      >
      ? false
      : true
    : never
)
  ? true
  : false;

export type IfNever<T, Default> = [T] extends [never] ? Default : T;
export type IfNotNever<Test, Value, Default = never> = [Test] extends [never]
  ? Default
  : Value;

export type Filter<T, FilterTypes, Default = never> = IfNever<
  T extends infer T ? (T extends FilterTypes ? T : never) : never,
  Default
>;

/** Returns the type of a property for each type in a union when the type has the given property. */
export type Property<T, P> = T extends infer T
  ? keyof T extends P
    ? T[P & keyof T]
    : P extends keyof T
    ? T[P]
    : never
  : never;

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

/**
 * Maps all null'ish types to `undefined`.
 */
export type Undefined<T> = T extends Nullish | void ? undefined : T;

export type ExpandTypes<
  Ts,
  Common = CommonTypeTemplate<Ts>
> = Ts extends infer T
  ? {
      [P in keyof Common]: P extends keyof T ? T[P] : Common[P];
    }
  : never;

/* JSON */

/** Merges properties in a union which makes it look prettier in Intellisense. */
export type Pretty<T> = T extends infer T ? { [P in keyof T]: T[P] } : never;

/**
 * Use for function parameters where you want an array to be interpreted as as tuple with a finite number of elements.
 *
 * By suggesting a parameter may be a one-tuple, TypeScript will treat the argument as a tuple,
 * also if there are more than one element.
 */
export type TupleParameter<T> = readonly T[] | readonly [T];

/** Minify friendly version of `false`. */
export const undefined = void 0;

/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
export const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;

/** Minify friendly version of `false`. */
export const F = false;

/** Minify friendly version of `true`. */
export const T = true;

/** Minify friendly version of `null`. */
export const nil = null;

export type NoOpFunction = (...args: any) => void;

/** A function that does nothing. */
export const NOOP: NoOpFunction = () => {};

export type IdentityFunction = <T>(item: T, ...args: any) => T;

/** The identity function (x)=>x. */
export const IDENTITY: IdentityFunction = (item: any) => item;

export type NullFilterFunction = <T>(item: T | Nullish) => boolean;

/** A function that filters out values != null. */
export const FILTER_NULLISH: NullFilterFunction = (item: any) => item != nil;

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
export type TypeConverter<T> = <V, P extends boolean = true>(
  value: V,
  parse?: P
) => T extends Nullish
  ? undefined
  : V extends T
  ? V
  : (true extends P ? T : never) | undefined;

/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolIterator = Symbol.iterator;

/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolAsyncIterator = Symbol.asyncIterator;

export const createTypeConverter =
  /*#__PURE__*/

    <T>(
      typeTester: TypeTester<T>,
      parser?: (value: any) => T | undefined
    ): TypeConverter<T> =>
    (value: any, parse = true as any) =>
      typeTester(value)
        ? value
        : parser && parse && value != null && (value = parser(value)) != null
        ? value
        : (undefined as any);

export const ifDefined = <T, P, R>(
  value: T,
  resultOrProperty: (
    | (AllKeys<T> & (keyof any & {}))
    | ((value: Exclude<T, Nullish>) => R)
  ) &
    P
): MaybeUndefined<T, P extends keyof any ? Exclude<T, Nullish> : R> =>
  isFunction(resultOrProperty)
    ? value !== undefined
      ? (resultOrProperty(value as any) as any)
      : undefined
    : value?.[resultOrProperty as any] !== undefined
    ? value
    : undefined;

export const isNullish = (value: any): value is undefined | void | null =>
  value == null;

export const isBoolean = (value: any): value is boolean =>
  typeof value === "boolean";

export const parseBoolean = createTypeConverter(isBoolean, (value) =>
  value == 0 // Both numbers and string with the value 0 or 1
    ? false
    : value == 1
    ? true
    : value === "false"
    ? false
    : value === "true"
    ? true
    : undefined
);

export type FalsishToUndefined<
  T,
  Undefined = undefined
> = T extends readonly any[]
  ? { [P in keyof T]: FalsishToUndefined<T[P]> }
  : T extends Falsish
  ? Undefined
  : T;

export const isFalsish = (value: any): value is Falsish => !value;

export const isFalse = (value: any): value is false => value === F;
export const isNotFalse = <T>(value: T): value is Exclude<T, false> =>
  value !== F;

export const truish: {
  <T>(items: Iterable<T | Falsish>, keepUndefined?: false): T[];
  <T>(items: Iterable<T>, keepUndefined: true): (T extends Falsish
    ? undefined
    : T)[];
  <T extends { [Symbol.iterator]?: never } | string>(
    value: T | Falsish
  ): T extends Falsish ? undefined : Exclude<T, Falsish>;
} = (value: any, keepUndefined?: boolean) =>
  isArray(value)
    ? keepUndefined
      ? value.map((item) => (!!item ? item : undefined))
      : value.filter((item: any) => !!item)
    : !!value
    ? (value as any)
    : undefined;

export const isInteger: (value: any) => value is number =
  Number.isSafeInteger as any;

export const isNumber = (value: any): value is number =>
  typeof value === "number";

export const isFinite: (value: any) => value is number = Number.isFinite as any;

export const parseNumber = createTypeConverter(isNumber, (value) =>
  isNaN((value = parseFloat(value))) ? undefined : value
);

export const isBigInt = (value: any): value is bigint =>
  typeof value === "bigint";

export const parseBigInt = createTypeConverter(isBigInt, (value) =>
  tryCatch(() => BigInt(value))
);

export const isString = (value: any): value is string =>
  typeof value === "string";

export const toString = createTypeConverter(isString, (value) =>
  value?.toString()
);

export const isArray: <T>(
  value: readonly any[] | T
) => value is T extends any[]
  ? any[]
  : unknown extends T
  ? any[]
  : readonly any[] = Array.isArray as any;

export const isError = /*#__PURE__*/ (value: any): value is Error =>
  value instanceof Error;

/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */
export const array: {
  // <T>(value: AsyncIterable<T>, clone?: boolean): MaybeUndefined<
  //   [T][0],
  //   Promise<T[]>
  // >;
  <T>(value: T, clone?: boolean): T extends any
    ? unknown[] extends T
      ? any[]
      : T extends Nullish
      ? undefined
      : T extends Iterable<infer Item>
      ? T extends Item[]
        ? T
        : Item[]
      : T[]
    : never;
} = /*#__PURE__*/ (value: any, clone = false as any): any =>
  value == null
    ? undefined
    : !clone && isArray(value)
    ? value
    : isIterable(value)
    ? [...value]
    : ([value] as any);

export const isObject = /*#__PURE__*/ (
  value: any
): value is object & Record<any, any> => value && typeof value === "object";

export const isPlainObject = /*#__PURE__*/ (
  value: any
): value is SimpleObject<keyof any, any> => value?.constructor === Object;

export const hasProperty = /*#__PURE__*/ <P extends keyof any>(
  value: any,
  property: P
): value is { [Prop in P]: any } => isObject(value) && property in value;

export const hasMethods = /*#__PURE__*/ <Names extends readonly (keyof any)[]>(
  value: any,
  ...names: Names
): value is {
  [P in Names[number]]: (...args: any) => any;
} =>
  value == null
    ? false
    : names.every((name) => typeof value[name] === "function");

export const hasMethod = /*#__PURE__*/ <Name extends keyof any>(
  value: any,
  name: Name
): value is {
  [P in Name]: (...args: any) => any;
} => typeof (value as any)?.[name] === "function";

export const isDate = /*#__PURE__*/ (value: any): value is Date =>
  value instanceof Date;
export const parseDate = createTypeConverter(isDate, (value) =>
  isNaN((value = Date.parse(value))) ? undefined : value
);

export const isSymbol = /*#__PURE__*/ (value: any): value is symbol =>
  typeof value === "symbol";

export const isFunction = /*#__PURE__*/ (
  value: any
): value is (...args: any) => any => typeof value === "function";

export const isPromiseLike = /*#__PURE__*/ (
  value: any
): value is PromiseLike<any> => !!value?.["then"];

export const isIterable = /*#__PURE__*/ (
  value: any,
  acceptStrings = false
): value is Iterable<any> =>
  !!(value?.[symbolIterator] && (typeof value !== "string" || acceptStrings));

export const isAsyncIterable = /*#__PURE__*/ (
  value: any
): value is AsyncIterable<any> => !!value?.[symbolAsyncIterator];

export const toIterable = /*#__PURE__*/ <T>(
  value: T | Iterable<T>
): Iterable<T> => (isIterable(value) ? value : [value]);

export const asMap: <T extends Iterable<readonly [any, any]> | Nullish>(
  values: T
) => T extends Iterable<readonly [infer Key, infer Value]>
  ? Map<Key, Value>
  : undefined = /*#__PURE__*/ (values: any): any =>
  values == null ? undefined : new Set(values);

export const isMap = /*#__PURE__*/ (value: any): value is Map<any, any> =>
  value instanceof Map;

export const asSet: <T extends Iterable<any> | Nullish>(
  values: T
) => T extends Iterable<infer T> ? Set<T> : undefined = /*#__PURE__*/ (
  values: any
): any => (values == null ? undefined : new Set(values));

export const isSet = /*#__PURE__*/ (value: any): value is Set<any> =>
  value instanceof Set;

export const isAwaitable = /*#__PURE__*/ (value: any): value is Promise<any> =>
  !!value?.then;

/**
 * If the value is a promise, it will be awaited.
 */
export const awaitIfAwaitable = <T, R>(
  value: T,
  action: (value: T extends PromiseLike<infer T> ? T : T) => R
): TogglePromise<R, T> =>
  (value as any)?.then?.((value: any) => action(value)) ?? action(value as any);

export const typeCode = (value: any, typeName = typeof value) =>
  value == null
    ? value === null
      ? NULL
      : UNDEFINED
    : T1[typeName[0]] ??
      T2[typeName[1]] ??
      (Array.isArray(value) ? ARRAY : value instanceof Date ? DATE : OBJECT);

/**
 * Round a number of to the specified number of decimals.
 */
export const round = <T extends number | Nullish>(
  number: T,
  decimals?: number | boolean
): MaybeUndefined<T, number> =>
  number == null
    ? (undefined as any)
    : decimals === false
    ? number
    : ((decimals = Math.pow(10, !decimals || decimals === true ? 0 : decimals)),
      Math.round(number * decimals) / decimals);

const testFirstLast = (s: string, first: string, last: string) =>
  s[0] === first && s[s.length - 1] === last;

export const isJsonString = (value: any): boolean =>
  isString(value) &&
  (testFirstLast(value, "{", "}") || testFirstLast(value, "[", "]"));

export type Mutable<T> = T extends
  | Map<any, any>
  | WeakMap<any, any>
  | Set<any>
  | WeakSet<any>
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<K, V>
  : T extends ReadonlySet<infer K>
  ? Set<K>
  : T extends Primitives
  ? T
  : { -readonly [P in keyof T]: Mutable<T[P]> };

/** For when an object that contains internal state that needs to be changed is exposed as read-only public property. */
export const mutate2 = /*#__PURE__*/ <T>(target: T): Mutable<T> =>
  target as any;

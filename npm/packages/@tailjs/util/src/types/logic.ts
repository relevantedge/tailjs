import type { Nullish } from ".";

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsTruish<T, UnknownIsTrue = true> = T extends Nullish | false
  ? false
  : unknown extends T
  ? UnknownIsTrue
  : true;

export type IsFalsish<T, UnknownIsTrue = true> = T extends Nullish | false
  ? true
  : unknown extends T
  ? Not<UnknownIsTrue>
  : false;

export type Not<B> = If<B, false, true>;

export type And<P1, P2 = true> = [P1 | P2] extends [true] ? true : false;

export type Or<P1, P2 = false> = true extends P1 | P2 ? true : false;

/** Returns whether any type in a union may be an empty array. */
export type CanBeEmpty<T> = ArraysAsEmpty<T, true> extends infer Array
  ? Array extends readonly []
    ? true
    : false
  : false;

/** Returns undefined if the type includes an array that may be empty. */
export type UndefinedIfEmpty<T> = true extends CanBeEmpty<T>
  ? undefined
  : never;

/**
 * Since arrays may have length zero, this utility function either turns them into empty tuples or includes an empty tuple with them.
 * Actual tuples are preserved.
 */
export type ArraysAsEmpty<T, IncludeOriginal = false> = T extends readonly any[]
  ? T extends [any, ...any]
    ? T
    : [] | (T extends never[] ? [] : IncludeOriginal extends true ? T : never)
  : T;

/**
 * Test whether all types in a union are defined. When passed a tuple, it tests whether all elements are strictly defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are not.
 */
export type All<P, UnknownIsValue extends boolean = true> = (
  P extends readonly []
    ? false
    : P extends readonly [infer Item, ...infer Rest]
    ? And<
        HasValue<Item, UnknownIsValue>,
        Rest extends [] ? true : All<Rest, true>
      >
    : P extends readonly (infer Item)[]
    ? And<HasValue<Item, UnknownIsValue>>
    : And<HasValue<P, UnknownIsValue>>
) extends true
  ? true
  : false;

/**
 * Tests whether at least one type in a union is defined. When passed a tuple, it tests whether at least one element may be defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are not.
 */
export type Any<P, UnknownIsValue extends boolean = true> = false extends (
  P extends readonly []
    ? false
    : P extends readonly [infer Item, ...infer Rest]
    ? Or<
        HasValue<Item, UnknownIsValue>,
        Rest extends [] ? false : Any<Rest, true>
      >
    : P extends readonly (infer Item)[]
    ? Or<HasValue<Item, UnknownIsValue>>
    : Or<HasValue<P, UnknownIsValue>>
)
  ? false
  : true;

/**
 * Tests whether all types in a union are defined. When passed a tuple, it tests whether at least one element is strictly defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are.
 */
export type AnyAll<P, UnknownIsValue extends boolean = true> = false extends (
  P extends readonly []
    ? false
    : P extends readonly [infer Item, ...infer Rest]
    ? Or<
        And<HasValue<Item, UnknownIsValue>>,
        Rest extends [] ? false : AnyAll<Rest, true>
      >
    : P extends readonly (infer Item)[]
    ? And<HasValue<Item, UnknownIsValue>>
    : And<HasValue<P, UnknownIsValue>>
)
  ? false
  : true;

/** Simplifies Boolean checks (instead of having to write B extends bla, bla...).  */
export type IfNot<B, True = undefined, False = never> = If<B, False, True>;

/** Simplifies Boolean checks (instead of having to write B extends bla, bla...).  */
export type If<B, True, False = never> = B extends Nullish | false
  ? False
  : True;

/** Type 1 extends type 2 */
export type Extends<T1, T2> = T1 extends T2 ? true : false;

/** Any of the union in a type extends a another type. */
export type ExtendsAny<T1, T2> = true extends Extends<T1, T2> ? true : false;

type FunctionComparisonEqualsWrapped<T> = T extends (
  T extends {} ? infer R & {} : infer R
)
  ? { [P in keyof R]: R[P] }
  : never;

export type FunctionComparisonEquals<A, B> = (<
  T
>() => T extends FunctionComparisonEqualsWrapped<A> ? 1 : 2) extends <
  T
>() => T extends FunctionComparisonEqualsWrapped<B> ? 1 : 2
  ? true
  : false;

/**
 * Tests if a type or any type in a union are not null'ish.
 */
export type IsNullish<
  T,
  UnknownIsValue extends boolean = boolean
> = T extends Nullish ? true : unknown extends T ? Not<UnknownIsValue> : false;

/**
 * Tests if a type or any type in a union are not null'ish.
 */
export type HasValue<
  T,
  UnknownIsValue extends boolean = true
> = T extends Nullish ? false : unknown extends T ? UnknownIsValue : true;

/**
 * Tests if a type is `any`.
 */
export type IsAny<T> = FunctionComparisonEquals<T, any>;

/**
 * Tests if a type is `unknown`.
 */
export type IsUnknown<T> = Extends<unknown, T>;

/**
 * Tests if a type is not `unknown`.
 */
export type IsKnown<T> = Not<Extends<unknown, T>>;

/**
 * Tests if a type is `unknown`.
 */
export type IsStrictlyUnknown<T, Else = never> =
  | If<IsAny<T>, false, Extends<unknown, T>>
  | Else;

/**
 * Tests if a type extends the specified type unless it is `unknown` or `any`.
 */
export type Is<T, Test> = If<
  IsUnknown<Test>,
  IsUnknown<T>,
  If<Extends<T, Test>, Not<IsUnknown<T>>, false>
>;

/**
 * Treats `unknown` as `any`.
 */
export type UnknownIsAny<T> = unknown extends T ? any : T;

/** Converts `null`, `undefined` and `void` to another type (default `undefined`). */
export type ValueOrDefault<T, R, D = undefined> = T extends NonNullable<T>
  ? R
  : T extends null | undefined | void
  ? D
  : R;

/**
 * Removes null'ish values from a union.
 */
export type OmitNullish<T, Default = never> = T extends Nullish ? Default : T;

/**
 * The union all keys of the types in union.
 */
export type AllKeys<T> = T extends infer T ? keyof T : never;

/**
 * Version of Omit that restricts the keys to those actually keys of the type for safety during refactoring.
 */
export type OmitKeys<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Removes the specified keys from each type in a union.
 */
export type OmitUnion<T, K extends AllKeys<T>> = T extends infer T
  ? Omit<T, K>
  : never;

/**
 * Picks the specified keys from each type in a union.
 */
export type PickUnion<T, K extends keyof any> = T extends infer T
  ? Pick<T, K & keyof T>
  : never;

/**
 * The defined part of a type, excluding undefined and void (which is also undefined).
 * `null` is considered defined. Use {@link OmitNullish} if `null` should also not be removed.
 */
export type Defined<T> = T extends Nullish ? never : T;

/**
 * Can be used to collect null values from a function parameter.
 */
export type Nullable<T, Collector = T> = T | (Nullish & Collector);

/**
 * Converts null'ish values to `undefined`.
 */
export type StrictUndefined<T> = T extends Nullish ? undefined : T;

/**
 * Returns a type if the another type is not undefined or false.
 *
 * Can be used in constructs like `<T extends string | undefined>(value: T): MaybeUndefined<T,number>`
 * that will return `number` if `value` is `string`, `number | undefined` if `value` is `string|undefined`,
 * and `undefined` if `value` is `undefined`.
 *
 */
export type MaybeUndefined<
  T,
  Defined = OmitNullish<T>,
  Nulls = Nullish | void
> = unknown extends T
  ? Defined | undefined
  : T extends Nulls
  ? undefined
  : Defined;

export type ToggleRequired<T, Toggle> =
  | OmitNullish<T>
  | (Toggle extends true ? undefined : never);

/**
 * Only returns the type if it is not `any`.
 */
export type ExcludeAny<T> = FunctionComparisonEquals<T, any> extends true
  ? never
  : T;

/**
 * Goes with {@link Nulls} to simplify the expression.
 */
export type ArgNulls<T, Arg> = (T | Nullish) & Arg;

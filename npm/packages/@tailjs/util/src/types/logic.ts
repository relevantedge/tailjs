import type { Nullish } from ".";

export type ToBoolean<Criteria> = Criteria extends
  | null
  | undefined
  | never
  | void
  | false
  ? false
  : true;

export type IsNever<T> = [T] extends [never] ? true : false;

export type Not<B> = If<B, false, true>;

export type And<P1, P2> = P1 | P2 extends true ? true : false;

export type Or<P1, P2> = true extends P1 | P2 ? true : false;

export type Every<P extends readonly any[]> = P extends []
  ? true
  : P extends [infer Item, ...infer Rest]
  ? And<Item extends false ? false : true, Every<Rest>>
  : false;

/** Simplifies Boolean checks (insted of having to write B extends bla, bla...).  */
export type IfNot<B, True = undefined, False = never> = If<B, False, True>;

/** Simplifies Boolean checks (insted of having to write B extends bla, bla...).  */
export type If<B, True, False = never> = ToBoolean<B> extends true
  ? True
  : False;

/** Type 1 extends type 2 */
export type Extends<T1, T2> = T1 extends T2 ? true : false;

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
 * Tests if a type is `any`.
 */
export type IsAny<T> = FunctionComparisonEquals<T, any>;

/** Converts `null`, `undefined` and `void` to another type (default `undeined`). */
export type ValueOrDefault<T, R, D = undefined> = T extends
  | null
  | undefined
  | void
  ? D
  : R;

/**
 * Removes null'ish values from a union.
 */
export type OmitNullish<T, Default = never> = T extends Nullish ? Default : T;

/**
 * The defined part of a type, excluding undefined and void (which is also undefined).
 * `null` is considered defined. Use {@link OmitNullish} if `null` should also not be removed.
 */
export type Defined<T> = Exclude<T, undefined | void>;

/**
 * Returns a type if the another type is not undefined or false.
 *
 * Can be used in constructs like `<T extends string | undefined>(value: T): MaybeUndefined<T,number>`
 * that will return `number` if `value` is `string`, `number | undefined` if `value` is `string|undefined`,
 * and `undefined` if `value` is `undefined`.
 *
 * Can also be used like `<T, Required extends boolean=false>(value: T, required?:Required): MaybeUndefined<Required,T>`.
 * Here the boolean flag `required` decides whether the return value is `T` or `T | undefined`.
 */
export type MaybeUndefined<T, Defined = T, Nulls = Nullish> = If<
  IsAny<T>,
  Defined,
  T extends Nulls | false ? Defined | undefined : Defined
>;

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

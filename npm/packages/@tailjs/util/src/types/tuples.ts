import type { Extends, If, IsAny, Voidefined } from ".";

export type Empty = readonly [];

export type IsTuple<T> = T extends [] | [any, ...any] ? true : false;

export type MaybeArray<
  T,
  Readonly extends boolean = false
> = IsAny<T> extends true
  ? any
  : [T] extends readonly [readonly (infer Item)[]]
  ? MaybeArray<Item, Extends<T, any[]>>
  : T | (Readonly extends false ? T[] : readonly T[]);

/**
 * An extension to T[] and Iterable<T> that also correctly captures weird things like NodeListOf<T>
 */
export type IterableOrArrayLike<T> =
  | Iterable<T>
  | { [item: number]: T; length: number };

/**
 * Shorthand for a type that is inferred from a parameter and can either be the item in an iterable, or just the type itself.
 */
export type IterableOrSelf<T> = IterableOrArrayLike<T> | T;

export type ToggleReadonly<
  T extends readonly any[],
  Test extends readonly any[] | boolean
> = Test extends any[] | false
  ? [...T]
  : Test extends readonly any[] | true
  ? readonly [...T]
  : never;

export type Head<T extends readonly any[]> = T extends readonly [
  infer Head,
  ...any
]
  ? Head
  : T extends readonly (infer First)[]
  ? First
  : never;

export type Tail<
  T extends readonly any[],
  Readonly extends readonly any[] | boolean = T
> = T extends readonly []
  ? never
  : T extends readonly [any, ...infer Tail]
  ? ToggleReadonly<Tail, Readonly>
  : T extends readonly any[]
  ? ToggleReadonly<T, Readonly>
  : never;

export type Last<T extends readonly any[]> = T extends readonly [
  ...any,
  infer Last
]
  ? Last
  : T extends readonly (infer Head)[]
  ? Head
  : never;

export type Leading<
  T extends readonly any[],
  Readonly extends readonly any[] | boolean = T
> = T extends readonly []
  ? never
  : T extends readonly [...infer Tail, any]
  ? ToggleReadonly<Tail, Readonly>
  : T extends readonly any[]
  ? ToggleReadonly<T, Readonly>
  : never;

export type Prefixes<T extends readonly any[]> = T extends Empty
  ? never
  : T | Prefixes<Leading<T>>;

export type TakeFirst<
  T extends readonly any[],
  N extends number = 1
> = T["length"] extends N ? T : TakeFirst<Leading<T>, N>;

export type TakeLast<
  T extends readonly any[],
  N extends number = 1
> = T["length"] extends N ? T : TakeLast<Tail<T>, N>;

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
 * Utility type to allow `as const` to be used on tuples returned from functions without actually making them `readonly` (which is annoying).
 * Normally TypeScript considers the return value of a function like `x=>[10,"four"]` to be `(string|number)[]` (which is also annoying).
 */
export type ConstToNormal<T> = T extends readonly [...any[]]
  ? { -readonly [P in keyof T]: ConstToNormal<T[P]> }
  : Voidefined<T>;

import type {
  AllKeys,
  IfNot,
  IsAny,
  IsStrictlyUnknown,
  Subtract,
  Nullish,
} from ".";

export type Empty = readonly [];

export type IsTuple<T> = T extends [] | [any, ...any] ? true : false;

/** A simpler version of {@link MaybeArray} that does not use type inference to simplify function signatures. */
export type ArrayOrSelf<T> = T | T[];

export type ToggleArray<T, Toggle = boolean> = T extends readonly (infer Item)[]
  ? Toggle extends true
    ? T
    : Item
  : Toggle extends true
  ? T[]
  : T;

export type MaybeArray<
  T,
  Readonly extends boolean | readonly any[] = T extends readonly any[]
    ? T
    : false,
  AlwaysArray = false
> = IsAny<T> extends true
  ? any
  : [T] extends [readonly any[]]
  ? IfNot<AlwaysArray, T[0]> | ToggleReadonly<T, Readonly>
  : IfNot<AlwaysArray, T> | (Readonly extends false ? T[] : readonly T[]);

/**
 * An extension to T[] and Iterable<T> that also correctly captures weird things like NodeListOf<T>
 */
export type IterableOrArrayLike<T> =
  | Iterable<T>
  | { [item: number]: T; length: number }
  | { [index: number]: T; item(index: number): T | Nullish };

/**
 * Shorthand for a type that is inferred from a parameter and can either be the item in an iterable, or just the type itself.
 */
export type IterableOrSelf<T> = IterableOrArrayLike<T> | T;

export type ToggleReadonly<T extends readonly any[], Test> = Test extends
  | any[]
  | false
  ? [...T]
  : Test extends readonly any[] | true
  ? readonly [...T]
  : never;

export type Head<T> = T extends readonly [infer Head, ...any]
  ? Head
  : T extends readonly (infer Head)[]
  ? Head
  : never;

export type Tail<T> = T extends [any, ...infer Rest]
  ? Rest
  : T extends readonly [any, ...infer Rest]
  ? readonly [...Rest]
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

export type UnionToTuple<
  T,
  Readonly extends boolean = false
> = PickOne<T> extends infer U // assign PickOne<T> to U
  ? Exclude<T, U> extends never // T and U are the same
    ? ToggleReadonly<[T], Readonly>
    : ToggleReadonly<[...UnionToTuple<Exclude<T, U>, Readonly>, U], Readonly> // recursion
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
  : T extends void
  ? undefined
  : T;

/** By adding a single item readonly tuple TypeScript starts interpreting arrays as tuples in function calls. */
export type TupleOrArray<Item> = readonly Item[] | readonly [Item];

export type VariableTuple<
  Item,
  Template extends readonly any[] = any[],
  MaxLength extends number = number extends Template["length"]
    ? 1
    : Template["length"]
> = MaxLength extends 0
  ? readonly []
  : readonly [Item, ...VariableTuple<Item, Template, Subtract<MaxLength, 1>>];

type Navigate<T, K extends keyof any> = K extends ""
  ? T
  : K extends keyof T
  ? T[K]
  : never;

type HasUnknown<T extends readonly any[]> = true extends (
  T extends readonly []
    ? false
    : T extends [infer Item, ...infer Rest]
    ? IsStrictlyUnknown<Item, HasUnknown<Rest>>
    : T extends readonly (infer Item)[]
    ? IsStrictlyUnknown<Item>
    : IsStrictlyUnknown<T>
)
  ? true
  : false;

type MatchOverload<A extends readonly [any, any], MatchArgs = any> = A extends [
  infer Args,
  infer R
]
  ? Args extends readonly any[]
    ? IfNot<
        HasUnknown<Args | [R]>,
        Args extends MatchArgs
          ? A
          : Args extends (
              MatchArgs extends readonly (infer Item)[]
                ? readonly Item[]
                : never
            )
          ? A
          : never
      >
    : never
  : never;

/** Returns tuples with arguments and return values for all non-generic overloads of a function, optionally matching a signature. */
export type Overloads<F, MatchArgs = any> = unknown extends F
  ? [any, any]
  : MatchOverload<
      F extends {
        (...args: infer P1): infer R1;
        (...args: infer P2): infer R2;
        (...args: infer P3): infer R3;
        (...args: infer P4): infer R4;
        (...args: infer P5): infer R5;
        (...args: infer P6): infer R6;
      }
        ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4] | [P5, R5] | [P6, R6]
        : F extends {
            (...args: infer P1): infer R1;
            (...args: infer P2): infer R2;
            (...args: infer P3): infer R3;
            (...args: infer P4): infer R4;
            (...args: infer P5): infer R5;
          }
        ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4] | [P5, R5]
        : F extends {
            (...args: infer P1): infer R1;
            (...args: infer P2): infer R2;
            (...args: infer P3): infer R3;
            (...args: infer P4): infer R4;
          }
        ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4]
        : F extends {
            (...args: infer P1): infer R1;
            (...args: infer P2): infer R2;
            (...args: infer P3): infer R3;
          }
        ? [P1, R1] | [P2, R2] | [P3, R3]
        : F extends {
            (...args: infer P1): infer R1;
            (...args: infer P2): infer R2;
          }
        ? [P1, R1] | [P2, R2]
        : F extends (...args: infer P) => infer R
        ? [P, R]
        : never,
      MatchArgs
    >;

/** Returns the non-generic overloads of a function, optionally matching a signature. */
export type PickOverloads<T, MatchArgs = any> = Overloads<
  T,
  MatchArgs
> extends [infer Args, infer R]
  ? Args extends readonly any[]
    ? (...args: Args) => R
    : never
  : never;

/** Returns the non-generic overloads of a type's method, optionally matching a signature. */
export type MethodOverloads<
  T,
  Name extends AllKeys<T> | (string & {}) = AllKeys<T>,
  MatchArgs = any
> = Overloads<Navigate<T, Name>, MatchArgs>;

/** Returns tuples with arguments and return values for all non-generic overloads of a type's method, optionally matching a signature. */
export type PickMethodOverload<
  T,
  Name extends AllKeys<T> | (string & {}) = AllKeys<T>,
  MatchArgs = any
> = PickOverloads<Navigate<T, Name>, MatchArgs>;

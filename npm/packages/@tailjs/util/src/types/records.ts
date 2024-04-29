import type { Add, AllKeys, Primitives, UnionToTuple, UnknownAny } from ".";
/**
 * A record that may have the specified keys and values.
 */
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type PartialDefined<T> = Partial<Exclude<T, undefined | void>>;

export type UnionPropertyValue<T, Keys extends keyof any> = T extends infer T
  ? Keys extends infer K
    ? K extends keyof T
      ? T[K]
      : never
    : never
  : never;

/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
export type MaybePick<
  T,
  Keys extends AllKeys<T> | (keyof any & {})
> = PrettifyIntersection<
  T extends infer T
    ? keyof T & Keys extends never
      ? never
      : Pick<T, Extract<keyof T, Keys>>
    : never
>;

/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
export type MaybeOmit<
  T,
  Keys extends AllKeys<T> | (keyof any & {})
> = PrettifyIntersection<
  T extends infer T
    ? keyof T & Keys extends never
      ? T
      : Pick<T, Exclude<keyof T, Keys>> extends infer T
      ? {} extends T
        ? never
        : T
      : never
    : never
>;

/**
 * Makes the specified properties partial.
 */
export type PickRequired<T, K extends AllKeys<T>> = T extends infer T
  ? PrettifyIntersection<MaybeOmit<T, K> & Required<MaybePick<T, K>>>
  : never;

/**
 * Makes the specified properties partial.
 */
export type PickPartial<T, K extends AllKeys<T>> = T extends infer T
  ? PrettifyIntersection<MaybeOmit<T, K> & Partial<MaybePick<T, K>>>
  : never;

/**
 * Makes all other properties than the specified partial.
 */
export type OmitPartial<T, K extends AllKeys<T>> = T extends infer T
  ? PrettifyIntersection<MaybePick<T, K> & Partial<MaybeOmit<T, K>>>
  : never;

/**
 *  TypeScript may be very literal when it infers types. The type fo a function parameter with the value `10` may be inferred as `10` and not `number`.
 *  This is an issue in e.g. {@link reduce}.
 */
export type GeneralizeConstants<T> = T extends number
  ? number
  : T extends string
  ? string
  : T extends boolean
  ? boolean
  : T extends (...args: infer A) => infer R
  ? (...args: GeneralizeConstants<A>) => GeneralizeConstants<R>
  : unknown extends T
  ? UnknownAny<T>
  : {
      [P in keyof T]: GeneralizeConstants<T[P]>;
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
 * Makes a intersection of objects like `{a:1}&{b:2}` appear as `{a:1,b:2}` in intellisense.
 */
export type PrettifyIntersection<T> = T extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

/**
 * Makes an array of key/value pairs to an object with the corresponding properties.
 */
export type KeyValuePairsToObject<T extends readonly [keyof any, any]> =
  PrettifyIntersection<
    UnionToIntersection<
      T extends readonly [infer K, infer V]
        ? { [P in K & keyof any]: V }
        : never
    >
  >;

type TupleEntries<T, Index extends number = 0> = T extends readonly []
  ? readonly []
  : T extends readonly [infer Item, ...infer Rest]
  ? readonly [[Index, Item], ...TupleEntries<Rest, Add<Index, 1>>]
  : T extends Iterable<infer T>
  ? readonly (readonly [number, T])[]
  : never;

export type Entries<T> = T extends infer T
  ? T extends Primitives
    ? never
    : T extends Iterable<any>
    ? T extends ReadonlySet<infer T>
      ? readonly (readonly [T, true])[]
      : T extends ReadonlyMap<infer K, infer V>
      ? readonly (readonly [K, V])[]
      : TupleEntries<T>
    : UnionToTuple<
        {
          [P in keyof T]: [P, T[P]];
        } extends infer T
          ? T[keyof T]
          : never,
        true
      > extends infer T
    ? T extends readonly [never]
      ? []
      : T
    : never
  : never;

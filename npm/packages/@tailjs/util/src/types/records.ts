import type {
  Add,
  AllKeys,
  Nullish,
  Primitives,
  Property,
  RecordType,
  UnionToTuple,
  UnknownIsAny,
} from ".";
/**
 * A record that may have the specified keys and values.
 */
export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export type ReadonlyRecord<K extends keyof any = keyof any, V = any> = {
  readonly [P in K]: V;
};

export type PartialDefined<T> = Partial<Exclude<T, undefined | void>>;

/** Makes all properties and properties on nested objects required. */
export type AllRequired<T> = {
  [P in keyof T]-?: T[P] extends RecordType ? AllRequired<T[P]> : T[P];
};

export type UnionPropertyValue<T, Keys extends keyof any> = T extends infer T
  ? Keys extends infer K
    ? K extends keyof T
      ? T[K]
      : never
    : never
  : never;

/** Removes record without properties from a union. */
export type RequireProperties<T> = {} extends T ? never : T;

/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
export type MaybePick<
  T,
  Keys extends AllKeys<T> | (keyof any & {})
> = PrettifyIntersection<
  T extends infer T ? Pick<T, Extract<keyof T, Keys>> : never
>;

/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
export type MaybeOmit<
  T,
  Keys extends AllKeys<T> | (keyof any & {})
> = PrettifyIntersection<
  T extends infer T ? Pick<T, Exclude<keyof T, Keys>> : never
>;

/**
 * Replaces one or more properties the types in a union with a different value, optionally given a filter the types must extend.
 */
export type ReplaceProperties<
  T,
  Values extends Record<keyof any, any>,
  Filter = any
> = T extends infer T
  ? T extends Filter
    ? { [P in keyof T]: P extends keyof Values ? Values[P] : T[P] }
    : T
  : never;

/**
 * Makes the specified properties required.
 */
export type PickRequired<T, K extends AllKeys<T>> = T extends infer T
  ? PrettifyIntersection<MaybeOmit<T, K> & Required<MaybePick<T, K>>>
  : never;

/**
 * Makes the specified properties partial.
 */
export type PickPartial<
  T,
  K extends AllKeys<T> | (string & {})
> = T extends infer T
  ? PrettifyIntersection<MaybeOmit<T, K> & Partial<MaybePick<T, K>>>
  : never;

/**
 * Makes all other properties than the specified partial.
 */
export type PartialExcept<T, K extends AllKeys<T>> = T extends infer T
  ? PrettifyIntersection<Required<MaybePick<T, K>> & Partial<MaybeOmit<T, K>>>
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
  ? UnknownIsAny<T>
  : {
      [P in keyof T]: GeneralizeConstants<T[P]>;
    };

/**
 * The eclectic type found everywhere on the Internet.
 * It converts a union like `{a:1}|{b:2}` to the intersection `{a:1, b:2}`
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Makes a intersection of objects like `{a:1}&{b:2}` appear as `{a:1,b:2}` in intellisense.
 */
export type PrettifyIntersection<
  T,
  Deep extends boolean = false
> = T extends infer T
  ? { [P in keyof T]: Deep extends true ? PrettifyIntersection<T[P]> : T[P] }
  : never;

export type KeyValueSource =
  | Nullish
  | readonly (readonly [keyof any, any])[]
  | RecordType<keyof any, any>
  | Map<keyof any, any>;

type Gather<T, Group extends boolean> = [T] extends [never]
  ? never
  : {
      [P in AllKeys<T>]: Group extends true ? Property<T, P>[] : Property<T, P>;
    };

/**
 * Decomposes they key/value pairs of one or more types into an object.
 */
export type KeyValueSourcesToObject<
  T extends KeyValueSource,
  Group extends boolean = false
> = Gather<
  KeyValuePairsToObject<
    T extends Iterable<infer Item>
      ? Item extends readonly [keyof any, any]
        ? Item
        : never
      : { [P in keyof T]: readonly [P, T[P]] }[keyof T]
  >,
  Group
>;

/**
 * Makes an array of key/value pairs to an object with the corresponding properties.
 */
export type KeyValuePairsToObject<
  T extends readonly [keyof any, any],
  Group extends boolean = false
> = Gather<
  T extends readonly [infer K extends keyof any, infer V]
    ? { [P in K]: V }
    : never,
  Group
>;

type TupleEntries<T, Index extends number = 0> = T extends readonly []
  ? never
  : T extends readonly [infer Item, ...infer Rest]
  ? readonly [[Index, Item], ...TupleEntries<Rest, Add<Index, 1>>]
  : T extends Iterable<infer T>
  ? readonly (readonly [number, T])[]
  : never;

export type Entries<T> = T extends infer T
  ? T extends Primitives
    ? never
    : T extends Iterable<any>
    ? T extends ReadonlyMap<infer K, infer V>
      ? readonly (readonly [K, V])[]
      : T extends ReadonlySet<infer T>
      ? readonly (readonly [T, true])[]
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

export type ExpandOnProperty<T, K extends keyof any> = T extends {
  [P in K]: infer Values;
}
  ? Values extends infer Value
    ? {
        [P in keyof T]: P extends K ? Value : T[P];
      }
    : never
  : never;

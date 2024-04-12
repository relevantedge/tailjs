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

/**
 * Common function type used for projection of [key,value] entries.
 */
export type KeyValueProjection<K, V, R> = (
  entry: [key: K, value: V],
  index: number
) => R;

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
export type Nullish = null | undefined | void;

/** A record type that is neither iterable or a function. */
export type RecordType<K extends keyof any = keyof any, V = any> = object &
  Record<K, V> & {
    [Symbol.iterator]?: never;
    [Symbol.hasInstance]?: never;
  };

/**
 * Shorthand for a value that is optionally awaitable.
 */
export type MaybePromise<T, Toggle = boolean> = Toggle extends true
  ? PromiseLike<T>
  : T;

/* JSON */

export type JsonArray = Json[];

export type JsonTuple = {
  [TupleIndex in number]?: Json;
};

export type JsonObject = RecordType & {
  [P in string]?: Json;
};

/**
 * All possible values that can be represented with JSON.
 */
export type Json =
  | null
  | undefined
  | string
  | number
  | boolean
  | JsonArray
  | JsonTuple
  | JsonObject;

export type ToJsonAble<T> = { toJSON(): T };

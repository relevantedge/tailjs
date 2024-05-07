import { RecordType } from "@tailjs/util";

export type JsonArray = Json[];

export type JsonTuple = {
  [TupleIndex in number]?: Json;
};

export type JsonObject = RecordType & {
  [P in string | number]?: Json;
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

type ToJsonAble<T> = { toJSON(): T };
/**
 * The shape the JSON data when a given type is serialized.
 *
 * This assumes that only the shapes permitted by {@link JsonSerializable} are serialized.
 * Otherwise not ignored since functions are in fact serialized as `{}`.
 */
export type JsonOf<T> = Json extends T
  ? Json
  : T extends string | number | boolean | null | undefined | void
  ? undefined
  : T extends ToJsonAble<infer R>
  ? R extends ToJsonAble<any>
    ? R
    : JsonOf<R>
  : T extends any[]
  ? { [index in keyof T]: JsonOf<T[index]> }
  : T extends Iterable<infer T>
  ? JsonOf<T>[]
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      -readonly [P in keyof T as P extends string
        ? JsonOf<T[P]> extends undefined
          ? never
          : P
        : never]: JsonOf<T[P]>;
    }
  : never;

/**
 * The broadest possible subtype of a given type that can be serialized and then deserialized without violating the type's contract,
 * with the exception of symbol properties. Those are ignored.
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

export type JsonSerializable<T> = Json extends T
  ? Json
  : T extends string | number | boolean | null | undefined | void
  ? undefined
  : T extends ToJsonAble<infer R>
  ? R extends ToJsonAble<any>
    ? R
    : JsonSerializable<R>
  : T extends any[]
  ? { [index in keyof T]: JsonSerializable<T[index]> }
  : T extends Iterable<any>
  ? T
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      [P in keyof T as P extends string
        ? undefined extends T[P]
          ? P
          : JsonSerializable<T[P]> extends undefined
          ? never
          : P
        : never]: undefined extends T[P] // It's okay to have a function if it can be undefined. It will not break the contract even though it will always get deserialized as `undefined`.
        ? T[P]
        : JsonSerializable<T[P]>;
    }
  : never;

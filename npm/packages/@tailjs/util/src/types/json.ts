import { isPlainObject, Nullish } from "..";

/**
 * All possible values that can be represented with JSON.
 */
export type Json<T = unknown> = unknown extends T
  ? Nullish | string | number | boolean | JsonArray | JsonTuple | JsonObject
  : Omit<
      {
        [P in keyof T]: JsonOnly<T[P]>;
      },
      symbol
    >;

export type JsonArray = Json[];

export type JsonTuple = {
  [TupleIndex in number]?: Json;
};

export type JsonObject = {
  [props: string | number]: Json;
} & { [symbols: symbol]: never };

type JsonOnly<T> = T extends Json ? T : never;

export type ToJsonable<T> = { toJSON(): T };

/**
 * Clones a value by its JSON representation.
 */
export const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Checks if the JSON representation of two objects are equal.
 *
 * Be aware that, give or take performance overhead, this also requires that properties
 * for objects are in the same order.
 */
export const jsonEquals = (comparand: any, value: any) =>
  JSON.stringify(comparand) === JSON.stringify(value);

export const isJsonObject = (value: any): value is JsonObject =>
  isPlainObject(value);

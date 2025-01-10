import { createEnumParser, Nullish } from "@tailjs/util";
import { Timestamp } from "../..";
import { SchemaDataUsage } from "../schema/SchemaDataUsage";
import { VariableKey } from "./VariableKey";

export type KnownVariableMap = {
  [scope: string]: { [key: string]: any };
};

const levels = {
  global: "global",
  session: "session",
  device: "device",
  user: "user",
} as const;

export type VariableScope = (typeof levels)[keyof typeof levels];

export const variableScope = createEnumParser("variable scope", levels);

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T extends {} = any> extends VariableKey {
  /**
   * This information is only provided if the variable is schema bound.
   */
  schema?: {
    type?: string;
    version?: string;
    usage: SchemaDataUsage;
  };

  /**
   * When the variable was created (Unix timestamp in milliseconds).
   */
  created: Timestamp;

  /**
   * When the variable was last modified. (Unix ms).
   */
  modified: Timestamp;

  /**
   * A unique token that changes every time a variable is updated.
   *
   * It follows the semantics of a "weak" ETag in the HTTP protocol.
   * How the value is generated is an internal implementation detail specific to the storage that manages the variable.
   *
   *
   */
  version: string;

  /**
   * This is a hint to variable storages that the variable should be deleted if it has not been
   * accessed for this amount of time (time to live).
   *
   * Variable storages can decide how accurately they want to enforce this in the background,
   * yet it will be accurate from a client perspective assuming the storage provides accurate access timestamps.
   *
   * Tail.js uses "delete on read" based on the time the variable was last accessed if its
   * storage has not yet cleaned it.
   */
  ttl?: number;

  /**
   * The value of the variable. It must only be undefined in a set operation in which case it means "delete".
   */
  value: T;
}

/** Returns a description of a key that can be used for logging and error messages.  */
export const formatVariableKey = (
  {
    key,
    scope = "",
    entityId = "",
    source = "",
  }: {
    source?: string | null;
    scope?: string;
    key: string;
    entityId?: string;
  },
  error: string | undefined = ""
) =>
  [
    "'" + key + "'",
    source && "from '" + source + "'",
    error,
    scope && "in " + scope + " scope",
    entityId && "for '" + entityId + "'",
  ]
    .filter((s) => s)
    .join(" ");

export const extractKey = <
  T extends (Partial<VariableKey> & { key: string }) | Nullish
>(
  value: T
): T extends infer T
  ? Pick<T, keyof T & ("source" | "key" | "scope" | "entityId")> extends infer T
    ? { [P in keyof T]: T[P] }
    : never
  : never =>
  value == null
    ? value
    : ({
        source: value.source,
        key: value.key,
        scope: value.scope,
        entityId: value.entityId,
      } as any);

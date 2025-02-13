import { createEnumParser, Nullish } from "@tailjs/util";
import { Timestamp, VariableKey } from "../..";
import { SchemaDataUsage } from "../schema/SchemaDataUsage";

export type KnownVariableMap = {
  [scope: string]: { [key: string]: any };
};

const variableScopeNames = {
  /**
   * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
   * These may be used for purposes such as shared runtime configuration
   * or augmenting external entities with real-time data for personalization or testing.
   */
  global: "global",

  /**
   * Variables that relates to an individual's current session. These are purged when the session ends.
   *
   * Session variables can only be read for the current session from untrusted contexts.
   */
  session: "session",

  /**
   * Variables that relates to an individual's device.
   *
   * These variables are physically stored in the device where the available space may be very limited.
   * For example, do not exceed a total of 2 KiB if targeting web browsers.
   *
   * To prevent race conditions between concurrent requests, device data may temporarily be loaded into session storage.
   *
   * Any data stored here is per definition at least `indirect` since it is linked to a device.
   */
  device: "device",

  /**
   * Variables that relates to an individual across devices.
   *
   * Associating a user ID with a session can only happen from a trusted context,
   * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
   *
   * Any data stored here is per definition at least `direct` since it directly linked to an individual.
   */
  user: "user",
} as const;

export type VariableServerScope =
  (typeof variableScopeNames)[keyof typeof variableScopeNames];

export type VariableExplicitServerScopes = "global";

export const VariableServerScope = createEnumParser(
  "variable scope",
  variableScopeNames
);

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
   * This is a hint to variable storages that the variable should be deleted after this amount of milliseconds
   * unless updated or refreshed (via VariableStorage in @tailjs/engine set or refresh methods).
   *
   * Variable storages can decide how accurately they want to enforce this in the background,
   * yet it will be accurate from a client perspective, since tail.js filters out expired variables on read.
   */
  ttl?: number;

  /** If the variable has a time-to-live, this is when it should expire. */
  expires?: number;

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

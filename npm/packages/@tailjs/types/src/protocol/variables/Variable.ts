import { createEnumParser, Nullish } from "@tailjs/util";
import { Timestamp } from "../..";
import { SchemaDataUsage } from "../schema/SchemaDataUsage";
import { VariableKey } from "./VariableKey";

/**
 * The scope for a variable including the entity it relates to and its life time..
 */
export type VariableScope =
  /**
   * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
   * These may be used for purposes such as shared runtime configuration
   * or augmenting external entities with real-time data for personalization or testing.
   */
  | "global"

  /**
   * Variables that relates to an individuals current session. These are purged when the session ends.
   *
   * Session variables can only be read for the current session from untrusted contexts.
   */
  | "session"

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
  | "device"

  /**
   * Variables that relates to an individual across devices.
   * Associating a user ID with a session can only happen from a trusted context,
   * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
   *
   * Any data stored here is per definition at least `direct` since it directly linked to an individual.
   */
  | "user";

export const variableScope = createEnumParser("variable scope", [
  "global",
  "session",
  "device",
  "user",
]);

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any> extends VariableKey {
  schema?: {
    type: string;
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

// Helpers
export type StripKey<T> = T extends infer T
  ? Omit<T, keyof VariableKey>
  : never;
export type PickKey<T> = Pick<T, keyof VariableKey & keyof T>;

/** Limits the allowed scopes for a variable key.  */
export type RestrictVariableScopes<KeyType, Scopes> = [Scopes] extends [never]
  ? never
  : { [P in keyof KeyType]: P extends "scope" ? Scopes : KeyType[P] };

export type ReplaceKey<Target, Source> = StripKey<Target> & PickKey<Source>;

/**
 * Split a type the extends VariableKey into two version:
 *  - Explicit scopes where entityId is required
 *  - Implicit scopes where the entityId is implied, so it must either be omitted or undefined.
 */
export type ScopedKey<
  KeyType extends VariableKey = VariableKey,
  Scopes extends string = string,
  ExplicitScopes extends string = any
> = [unknown] extends [ExplicitScopes]
  ? KeyType extends KeyType
    ? RestrictVariableScopes<
        Omit<KeyType, "entityId"> & {
          entityId?: string;
        }, // Entity ID is optional for all scopes (accepts any kind of key).
        Scopes
      >
    : never
  : [Scopes] extends [ExplicitScopes]
  ? KeyType // No change. Entity ID always required.
  : KeyType extends KeyType
  ? [ExplicitScopes] extends [never]
    ? RestrictVariableScopes<
        Omit<KeyType, "entityId"> & { entityId?: undefined },
        Scopes
      >
    :
        | RestrictVariableScopes<KeyType, ExplicitScopes & Scopes>
        | RestrictVariableScopes<
            // vscode intellisense is too "smart", and will initially not suggest the explicit scopes before entityId is set
            // if just using {entityId?: string}
            Omit<KeyType, "entityId"> & { entityId?: undefined },
            Exclude<Scopes, ExplicitScopes>
          >
  : never;

export type MatchKey<Key, Source> = (
  Key extends any
    ? Omit<Key, "entityId" | "scope"> &
        Pick<
          Source & { scope: Key[keyof Key & "scope"] },
          keyof Source & ("scope" | "entityId")
        >
    : never
) extends infer T
  ? { [P in keyof T]: T[P] }
  : never;
/** Returns a description of a key that can be used for logging and error messages.  */
export const formatKey = (
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
    entityId && "for " + entityId,
  ]
    .filter((s) => s)
    .join(" ");

export const extractKey = <
  T extends (Partial<VariableKey> & { key: string }) | Nullish
>(
  value: T
): Pick<T, keyof T & ("source" | "key" | "scope" | "entityId")> =>
  value == null
    ? value
    : ({
        source: value.source,
        key: value.key,
        scope: value.scope,
        entityId: value.entityId,
      } as any);

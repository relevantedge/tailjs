import { createEnumParser, Nullish, OmitUnion, Pretty } from "@tailjs/util";
import { Timestamp, VariableGetter, VariableSetter } from "..";
import { SchemaDataUsage } from "./SchemaDefinition";

/**
 * The scope for a variable including the entity it relates to and its life time..
 */
export type VariableScope =
  /**
   * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
   * These may be used for purposes such as shared runtime configuration
   * or to augment an external entity with real-time data for personalization or testing.
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
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey {
  /**
   * An optional identifier of a specific variable storage such as "crm" or "personalization"
   * if not addressing tail.js's own storage.
   */
  source?: string;

  /** The scope the variable belongs to. */
  scope: string;

  /**
   * The name of the variable.
   *
   * A key may have a prefix that decides which variable storage it is routed to such as `crm:` or `personalization:`.
   * The prefix and the key are separated by a colon (`prefix:key`), and the key may not contain a colon itself.
   */
  key: string;

  /**
   * The ID of the entity in the scope the variable belongs to.
   *
   * In the global scope, variables augmenting external entities the IDs should be prefixed with the entity type such as `page:xxxx`
   * if they are not unique identifiers to avoid clashes.
   */
  entityId: string;
}

/**
 * A {@link VariableKey} that optionally includes the expected version of a variable value.
 * This is used for "if none match" queries to invalidate caches efficiently.
 */
export interface VersionedVariableKey extends VariableKey {
  version?: string;
}

export interface VariableMetadata {
  /**
   * Optionally categorizes variables.
   *
   * For example, the tag `address` could be used for all variables related to a user's address,
   * or `newsletter` for everything related to newsletter subscriptions.
   */
  tags?: string[];

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
}

/**
 * Information about when a variable's value was modified and a unique version (ETag) used for conflict resolution
 * in case multiple processes try to update it at the same time (optimistic concurrency).
 *
 * Only the version, and not the modified timestamp must be relied on during conflict resolution.
 */
export interface VariableVersion {
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
}

export interface VariableSchemaSource extends SchemaDataUsage {
  namespace: string;
  type: string;
  property: string;
}

export interface VariableSource {
  /** Optional metadata about the variables definition. */
  schema?: VariableSchemaSource;
}

/**
 * All data related to a variable except its value.
 */
export interface VariableHeader
  extends VariableKey,
    VariableMetadata,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any> extends VariableHeader {
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
  Scopes extends string,
  ExplicitScopes extends string = Scopes,
  KeyType extends VariableKey = VariableKey
> = [Scopes] extends [ExplicitScopes]
  ? KeyType // No change. Entity ID always required.
  : KeyType extends KeyType
  ? [unknown] extends [ExplicitScopes]
    ? RestrictVariableScopes<Omit<KeyType, "entityId">, { entityId?: string }> // Entity ID is optional for all scopes (accepts any kind of key).
    : [ExplicitScopes] extends [never]
    ? RestrictVariableScopes<
        Omit<KeyType, "entityId"> & { entityId?: undefined },
        Scopes
      >
    :
        | RestrictVariableScopes<KeyType, ExplicitScopes & Scopes>
        | RestrictVariableScopes<
            // vscode intellisense is too "smart", and will initially not suggest the explicit scopes before entityId is set
            // if just using {entityId?: string}
            Omit<KeyType, "entityId"> & ({ entityId: undefined } | {}),
            Exclude<Scopes, ExplicitScopes>
          >
  : never;

/**
 * Remove source and scope from a type the extends VariableKey.
 * This is used for core variable storages that are already mapped to a source and scope.
 */
export type RemoveVariableContext<
  KeyType,
  AddFields = {}
> = KeyType extends infer KeyType
  ? Omit<KeyType, "source" | "scope"> &
      (KeyType extends VariableKey ? AddFields : {})
  : never;

/** Returns a description of a key that can be used for logging and error messages.  */
export const formatKey = (
  {
    key,
    scope = "",
    entityId = "",
  }: {
    key: string;
    scope?: string;
    entityId?: string;
  },
  error: string | undefined = ""
) =>
  [
    "'" + key + "'",
    error,
    scope && "in " + scope + "scope",
    entityId && "for " + entityId,
  ].join(" ");

export const copyKey = <
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

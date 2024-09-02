import { createEnumParser } from "@tailjs/util";
import { Timestamp } from "..";
import { SchemaDataUsage, SchemaEntity } from "./SchemaDefinition";

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
  /** The scope the variable belongs to. */
  scope: VariableScope;

  /**
   * An optional identifier of a specific variable storage such as "crm" or "personalization"
   * if not addressing tail.js's own storage.
   */
  source?: string;

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

export type WithScopeDefaults<
  T extends { scope: string; entityId: string },
  AllowNonDefault extends boolean = false
> = AllowNonDefault extends true
  ? T
  : Omit<T, "scope" | "entityId"> &
      (T["scope"] extends infer Scope extends string
        ? Scope extends "global"
          ? {
              scope: Scope;
              entityId: string;
            }
          : { scope: Scope; entityId?: undefined }
        : never);

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

/** Returns a description of a key that can be used for logging and error messages.  */
export const formatKey = (
  key: {
    key: string;
    scope: string;
    entityId?: string;
  },
  error?: string
) =>
  `'${key.key}'${error ? " " + error : ""} in ${key.scope} scope${
    key.entityId ? `for '${key.entityId}'` : ""
  }`;

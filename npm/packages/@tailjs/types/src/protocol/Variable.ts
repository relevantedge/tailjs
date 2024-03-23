import {
  DataClassification,
  DataPurposes,
  DataClassificationValue,
  DataPurposeValue,
  VariableScopeValue,
  Timestamp,
  dataClassification,
  dataPurposes,
  variableScope,
} from "..";

export const enum VariableScope {
  Global = 0,
  Session = 1,
  Device = 2,
  User = 3,
  Entity = 4,
}

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey<Strict extends boolean = true> {
  /** The scope the variable belongs to. */
  scope: VariableScopeValue<Strict>;

  /**
   * The name of the variable.
   *
   * A key may have a prefix that decides which variable storage it is routed to.
   * The prefix and the key are separated by colon (`prefix:key`). Additional colons will be considered part of the variable name.
   * To address a variable with a colon in its name without prefix use `:key`, for example `:colon:in:my:name`.
   */
  key: string;

  /**
   * The ID of the entity in the scope the variable belongs to.
   * This is ignored for global variables, and can be set to `""`.
   */
  targetId?: string;
}

/**
 * A {@link VariableKey} that optionally includes the expected version of a variable value.
 * This is used for "if none match" queries to invalidate caches efficiently.
 */
export interface VersionedVariableKey<Strict extends boolean = true>
  extends VariableKey<Strict> {
  version?: string;
}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableClassification<Strict extends boolean = true> {
  /**
   * The legal classification of the kind of data a variable holds.
   * This limits which data will be stored based on a user's consent.
   */
  classification: DataClassificationValue<Strict>;

  /**
   * Optionally defines the possible uses of the data a variables holds (they are binary flags).
   * When a variable is requested by some logic, it may be stated what the data is used for.
   * If the user has not consented to data being used for this purpose the variable will not be avaiable.
   */
  purposes?: DataPurposeValue<Strict>;

  /**
   * Optionally categorizes variables.
   *
   * For example, the tag `address` could be used for all variables related to a user's address,
   * or `newsletter` for everything related to newsletter subscriptions.
   */
  tags?: string[];
}

/**
 * Information about when a variable's value was modified and a unqiue version (ETag) used for conflict resolution
 * in case multiple processes try to update it at the same time (optimistic concurrency).
 *
 * Only the version, and not the modified timestamp must be relied on during conflict resolution.
 */
export interface VariableVersion {
  /**
   * Timestamp for when the variable was created.
   */
  created?: Timestamp;

  /**
   * Timestamp for when the variable was created or modified.
   */
  modified?: Timestamp;

  /**
   * A unique token that changes everytime a variable is changed.
   * It follows the semantics of a "weak" ETag in the HTTP protocol.
   * How the value is generated is an internal implementation detail specific to the storage that manages the variable.
   *
   * The value is only undefined if it is not assumed to exist before a set operation.
   */
  version?: string | undefined;
}

/**
 * All data related to a variable except its value.
 */
export interface VariableHeader<Strict extends boolean = true>
  extends VariableKey<Strict>,
    VariableClassification<Strict>,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any, Strict extends boolean = true>
  extends VariableHeader<Strict> {
  /**
   * The value of the variable is read-only. Trying to update its value in its storage will result in an error.
   */
  readonly?: boolean;

  /**
   * The value of the variable. It must only be undefined in a set operation in which case it means "delete".
   */
  value: T;
}

/**
 * The information needed about a variable to validate whether it complies with a user's consents,
 * or meets other authorization based requirements.
 */
export type VariableValidationBasis<Strict extends boolean = boolean> =
  VariableKey<Strict> & Partial<VariableClassification<Strict>>;

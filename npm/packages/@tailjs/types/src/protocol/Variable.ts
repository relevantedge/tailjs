import {
  MaybeUndefined,
  ParsableEnumValue,
  createEnumAccessor,
} from "@tailjs/util";
import {
  DataClassification,
  DataPurposeFlags,
  DataClassificationValue,
  DataPurposeValue,
  Timestamp,
} from "..";

export enum VariableScope {
  /** Global variables. */
  Global = 0,

  /** Variables related to sessions. */
  Session = 1,

  /** Variables related to a device (browser or app). */
  Device = 2,

  /** Variables related to an identified user. */
  User = 3,

  /**
   * Variables related to an external identity.
   * One use case could be used to augment data a CMS with real-time data related to personalization or testing.
   */
  Entity = 4,
}

export const variableScope = createEnumAccessor(
  VariableScope as typeof VariableScope,
  false,
  "variable scope"
);

export type VariableScopeValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<typeof VariableScope, Numeric, false, VariableScope>;

/** Transforms properties with known enum types to their parsable counterparts. */
export type Parsable<T, Numeric extends boolean | undefined = boolean> = {
  [P in keyof T]: T[P] extends DataClassification | undefined | null
    ? DataClassificationValue<MaybeUndefined<T[P], Numeric>>
    : T[P] extends DataPurposeFlags | undefined | null
    ? DataPurposeValue<MaybeUndefined<T[P], Numeric>>
    : T[P] extends VariableScope | undefined | null
    ? VariableScopeValue<MaybeUndefined<T[P], Numeric>>
    : Parsable<T[P], Numeric>;
};

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey<NumericEnums extends boolean = boolean> {
  /** The scope the variable belongs to. */
  scope: VariableScopeValue<NumericEnums>;

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
export interface VersionedVariableKey<NumericEnums extends boolean = boolean>
  extends VariableKey<NumericEnums> {
  version?: string;
}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableClassification<
  NumericEnums extends boolean = boolean
> {
  /**
   * The legal classification of the kind of data a variable holds.
   * This limits which data will be stored based on a user's consent.
   */
  classification: DataClassificationValue<NumericEnums>;

  /**
   * Optionally defines the possible uses of the data a variables holds (they are binary flags).
   * When a variable is requested by some logic, it may be stated what the data is used for.
   * If the user has not consented to data being used for this purpose the variable will not be avaiable.
   */
  purposes: DataPurposeValue<NumericEnums>;
}

export interface VariableMetadata {
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
export interface VariableHeader<NumericEnums extends boolean = true>
  extends VariableKey<NumericEnums>,
    VariableClassification<NumericEnums>,
    VariableMetadata,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any, NumericEnums extends boolean = true>
  extends VariableHeader<NumericEnums> {
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
export type VariableValidationBasis<NumericEnums extends boolean = boolean> =
  VariableKey<NumericEnums> & Partial<VariableClassification<NumericEnums>>;

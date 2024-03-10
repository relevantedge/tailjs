import { DataClassification, DataPurpose, Timestamp } from "..";

/** Defines a filter used to query variables.  */
export interface VariableFilter {
  /** Limits the results to variables for these specific target IDs. */
  targetIds?: string[];

  /**
   * Limits the results to variables from any of these scopes.
   */
  scopes?: VariableScope[];

  /**
   * Limits the results to variables with one of these keys.
   */
  keys?: string[];

  /**
   * When multiple storages are used for different purposes, the query only goes to the storages registered for these prefixes.
   * Storages that are not explicitly registered for a prefix implicitly have the prefix "".
   */
  prefixes?: { include: string[]; exclude: string[] };

  /**
   * Limits the results to variables with these tag combiniations.
   * Each entry is a combination, that is, the first level means "any", and the second level means "all".
   *
   * For example [["tag1", "tag2"], ["tag3"]] will match variables that either have _both_  "tag1" and "tag2" or just "tag3".
   */
  tags?: string[][];

  /**
   * Limits the variables by their origin. This is in particular useful for purging all data related to an extension or feature.
   */
  origins?: string[];

  /**
   * Limits the results to variables with these classifications.
   */
  classifications?: {
    /** The variable must have at least this classification. */
    min?: DataClassification;

    /** The variable must not have a higher classification than this. */
    max?: DataClassification;

    /** The variable must have any of these classifications. */
    levels?: DataClassification[];
  };

  /**
   * Limits the results to variables with any of these purposes.
   */
  purposes?: DataPurpose[];
}

/** Settings that controls how results are returned when querying variables. */
export interface VariableQuerySettings {
  /**
   * Do not return more results than this.
   */
  top?: number;

  /**
   * Used for paging by specifying the value of {@link VariableQueryResult.cursor} from a previous query result.
   */
  cursor?: any;

  /**
   * Limits the results to variables created or updated after this timestamp.
   */
  ifModifiedSince?: Timestamp;

  /**
   * Limits the results to variables that are not included here or have a different version.
   *
   * Can be used to reduce the data transferred when refreshing the values of variables already loaded.
   */
  ifNoneMatch?: VersionedVariableKey[];
}

export interface VariableQueryResult<T> {
  count?: number;
  results: T[];
  cursor?: any;
}

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey {
  scope: VariableScope;
  key: string;
  targetId?: string;
}

/**
 * Defines the version of a variable value.
 * The storage containing the variable defines the semantics of the version and what it contains.
 *
 * If the version is undefined it means the variable does not yet exist.
 *
 * Versioning is used for what is called "optimistic concurrency" to make sure that if two things try to update the same variable
 * at the same time, one of them will get an error and be told that the value has changed since it was read.
 */
export interface VariableVersion {
  version?: string;
}

/**
 *  Uniquely addresses a variable's value by its version and the variable's scope, target and key name.
 */
export interface VersionedVariableKey extends VariableKey, VariableVersion {}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableMetadata {
  /**
   * The legal classification of the kind of data a variable holds.
   * This limits which data will be stored based on a user's consent.
   */
  classification: DataClassification;

  /**
   * Optionally defines the possible uses of the data a variables holds.
   * When a variable is requested by some logic, it may be stated what the data is used for.
   * If the user has not consented to data being used for this purpose the variable will not be avaiable.
   */
  purposes?: DataPurpose[];

  /**
   * Optional tags that can be used for queries, for example all variables related to an address (address, postal code, city, ...) may have the tag "address".
   */
  tags?: string[];

  /**
   * An optional string describing the origin of the variable.
   * It is best practice that extensions include their name or purpose here, e.g. "geo-data".
   */
  origin?: string;
}

/**
 * The combination of a variable key and the variable's settings. The actual value and version is not included.
 */
export interface VariableHeader
  extends VariableKey,
    VariableMetadata,
    VariableVersion {}

/**
 * Represents the value of a variable regardless of its key, version and other settings.
 */
export interface VariableValue<T = any> {
  /**
   * The date the variable was stored for the first time.
   * This value comes from a storage and cannot be set via the API.
   */
  created?: Timestamp;

  /**
   * The date the variable was last stored including both updates and creation.
   * This value comes from a storage and cannot be set via the API.
   */
  modified?: Timestamp;

  /**
   * The value of a variable. This can be both primitive and structured values.
   *
   * If a variable is saved with the value of `undefined` it will be deleted.
   * A storage will never return a value with the value `undefined`
   */
  value: T | undefined;
}

/**
 * Represents a variable with its key, settings, version and value.
 */
export interface Variable<T = any> extends VariableHeader, VariableValue<T> {}

export type VariableForScope<
  Scope extends VariableScope,
  T = any
> = Scope extends VariableScope.Global
  ? GlobalVariable<T>
  : TargetedVariable<T>;

export type TargetIdForScope<Scope extends VariableScope> =
  Scope extends VariableScope.Global ? undefined : string;

export interface GlobalVariable<T = any> extends Variable<T> {
  targetId?: "";
  scope: VariableScope.Global;
}

export interface TargetedVariable<T = any> extends Variable<T> {
  targetId: string;
  scope: TargetedVariableScope;
}

export interface VariableKeyInitializer<T = any> extends VariableMetadata {
  value: T;
}

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified, the variable is stored with the purposes it can be used for and do not include this,
 * a result will also not be returned. (best practice)
 */
export interface VariableGetter<T = any> extends VersionedVariableKey {
  initializer?: () =>
    | VariableKeyInitializer<T>
    | Promise<VariableKeyInitializer<T>>;
  purpose?: DataPurpose;
}

export const VariableScopes = [0, 1, 2, 3, 4, 5];
export const enum VariableScope {
  Global = 0,
  Session = 1,
  DeviceSession = 2,
  Device = 3,
  User = 4,
  Entity = 5,
}

export const VariableScopeNames = [
  "global",
  "session",
  "device session",
  "device",
  "user",
  "entity",
];

export type TargetedVariableScope =
  | VariableScope.Session
  | VariableScope.DeviceSession
  | VariableScope.Device
  | VariableScope.User
  | VariableScope.Entity;

export const enum VariablePatchType {
  Add,
  IfGreater,
  IfSmaller,
  IfMatch,
  Always,
}

export const enum VariableSetStatus {
  Success = 0,
  Unchanged = 1,
  Conflict = 2,
  Unsupported = 3,
  Denied = 4,
  ReadOnly = 5,
  NotFound = 6,
  Error = 7,
}

export const isSuccessResult = <T>(
  result: VariableSetResult<T>
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
} => result.status <= VariableSetStatus.Unchanged;

export const isErrorResult = <T>(
  result: VariableSetResult<T>
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Error;
} => result.status === VariableSetStatus.Error;

export const isConflictResult = <T>(
  result: VariableSetResult<T>
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Conflict;
} => result.status === VariableSetStatus.Conflict;

export type VariableSetResult<T = any> = {
  source: VariableSetter;
} & (
  | ({
      status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
    } & VariableVersion &
      VariableValue<T>)
  | {
      status:
        | VariableSetStatus.Denied
        | VariableSetStatus.NotFound
        | VariableSetStatus.Unsupported
        | VariableSetStatus.ReadOnly;
    }
  | {
      status: VariableSetStatus.Conflict;
      current: Variable | undefined;
    }
  | { status: VariableSetStatus.Error; transient?: boolean; error: any }
);

export const isVariablePatchAction = <T = any>(
  setter: any
): setter is VariablePatchAction<T> => !!setter["setter"];

export interface VariablePatchAction<T = any> extends VariableHeader {
  patch: (current: T | undefined) => { set: T | undefined } | undefined;
}

export const isVariableValuePatch = <T = any>(
  setter: any
): setter is VariableValuePatch<T> => !!setter["patchType"];

export interface VariableValuePatch<T = any> extends Variable<T> {
  patchType: VariablePatchType;
  /** The path to the property of an object addressed by the {@link Variable<T>.key} the patch applies to. */
  selector?: string;
  match?: any;
}

export type VariablePatch<T = any> =
  | VariablePatchAction<T>
  | VariableValuePatch<T>;

export type VariableSetter<T = any> =
  | Variable<T>
  | VariableValuePatch<T>
  | VariablePatchAction<T>;

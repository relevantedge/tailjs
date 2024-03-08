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
   * Limits the results to variables created or updated after this timestamp.
   */
  ifModifiedSince?: Timestamp;

  //ifChanged?:

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
 * Versioning is used for what is called "optimistic concurrency" to make sure that if two things try to update the same variable
 * at the same time, one of them will get an error and be told that the value has changed since it was read.
 */
export interface VariableVersion {
  version?: string;
}

/**
 *  Uniquely addresses a variable's value by its version and the variable's scope, target and key name.
 */
export interface VersionedVariableKey extends VariableKey, VariableValue {}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 * A variable can also have optional tags that can be used for queries, for example all fields related to an address may have the tag "address".
 */
export interface VariableSettings {
  classification: DataClassification;
  purposes?: DataPurpose[];
  tags?: string[];
}

/**
 * The combination of a variable key and the variable's settings. The actual value and version is not included.
 */
export interface VariableHeader
  extends VariableKey,
    VariableSettings,
    VariableVersion {}

/**
 * Represents the value of a variable regardless of its key, version and other settings.
 */
export interface VariableValue<T = any> {
  created?: number;
  modified?: number;
  value: T | undefined;
}

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

export interface VariableQueryParameters {
  top?: number;
  cursor?: any;
}

export interface VariableQueryResult {
  count?: number;
  results: Variable[];
  cursor?: any;
}

export interface VariableKeyInitializer<T = any> extends VariableSettings {
  value: T;
}

export interface VariableKeyWithInitializer<T = any> extends VariableKey {
  initializer?: () => VariableKeyInitializer<T>;
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
    } & VariableValue<T>)
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

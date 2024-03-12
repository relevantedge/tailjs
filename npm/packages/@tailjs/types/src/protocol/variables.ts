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
   *
   * Use the wildcard `*` to return all keys. The wildcard may optionally have a prefix, as example,  `crm:*` will limit the query
   * to the storage mapped to the `crm` prefix. To limit the query to the default storage (that does not have a prefix) use `:*`.
   *
   * Wildcards can also be used for prefixes. `*:name` will query all storages for a variable with the name `name`.
   *
   * Using wildcards for partial matching is not supported, so the query `*name` will _not_ return all variables
   * where their name ends with  "name". Use tags to group and organize variables instead.
   */
  keys: string[];

  /**
   * Specific keys or key patterns to exclude. The syntax is the same as for {@link keys}.
   */
  exclude?: string[];

  /**
   * Limit the results to variables that has any of these tag combinations.
   */
  tags?: string[][];

  /**
   * Limits the results to variables with these classifications.
   */
  classification?: {
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
export interface VariableQueryOptions {
  /**
   * Include the total number of matching of variables in the results (not just the top N first).
   * Default is `false`.
   */
  count?: number;

  /**
   * Do not return more results than this. A storage will decide its own default value if not specified.
   */
  top?: number;

  /**
   * Used for paging by specifying the value of {@link VariableQueryResult.cursor} from a previous query result.
   */
  cursor?: string;

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

export interface VariableQueryResult<T = Variable> {
  count?: number;
  results: T[];
  cursor?: string;
}

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
export interface VariableKey {
  /** The scope the variable belongs to. */
  scope: VariableScope;

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
   */
  targetId?: string;
}

/**
 * A {@link VariableKey} that optionally includes the expected version of a variable value.
 * This is used for "if none match" queries to invalidate caches efficiently.
 */
export interface VersionedVariableKey extends VariableKey {
  version?: string;
}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableClassification {
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
export interface VariableHeader
  extends VariableKey,
    VariableClassification,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any> extends VariableHeader {
  /**
   * The value of the variable is read-only. Trying to update its value in its storage will result in an error.
   */
  readonly?: boolean;

  /**
   * The value of the variable. It must only be undefined in a set operation in which case it means "delete".
   */
  value: T | undefined;
}

export type VariableInitializer<T = any> = () =>
  | VariablePatchResult<T>
  | undefined
  | Promise<VariablePatchResult<T> | undefined>;

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified and the variable is only stored for other purposes, a result will also not be returned. (best practice)
 */
export type VariableGetter<
  T = any,
  Scoped extends boolean = boolean
> = VersionedVariableKey &
  MatchTarget<Scoped> & {
    /**
     * If the variable does not exist, it will be created with the value returned from this function.
     * Since another value from another process may have been used at the same time,
     * you cannot trust that just because the function was called, its value was used.
     *
     * However, it is guaranteed that the returned value is the most current at the time the request was made.
     */
    initializer?: VariableInitializer<T>;

    /**
     * Optionally, the purpose the variable will be used for in the context it is requested.
     *
     * A variable may be used for multiple purposes but only stored for the purpose a user has consented to.
     * For example, a user's country may be used both in analytics and for personalization purposes.
     * However, if the user has only consented to "Performance", but not "Functionality", the value must not be used for personalization.
     *
     * It should be considered best practice always to include the intended purpose when requesting data about the user
     * to be sure their consent is respected.
     *
     * It is currently not mandatory to specify the purpose but this requirement may change in the future.
     */
    purpose?: DataPurpose;

    /**
     * Indicates that the value must be re-read from the source storage if a caching layer is used on top.
     */
    refresh?: boolean;
  };

export const VariableScopes = [0, 1, 2, 3, 4, 5];
export const enum VariableScope {
  Global = 0,
  Session = 1,
  Device = 2,
  User = 3,
  Entity = 4,
}

export const VariableScopeNames = [
  "global",
  "session",
  "device",
  "user",
  "entity",
];

export type MatchTarget<Scoped extends boolean> = boolean extends Scoped
  ? {}
  : Scoped extends true
  ? ScopedTarget
  : RequireTarget;

export type ScopedTarget =
  | {
      scope: VariableScope.Entity;
      targetId: string;
    }
  | {
      scope: Exclude<VariableScope, VariableScope.Entity>;
    };

export type RequireTarget =
  | {
      scope: VariableScope.Global;
      targetId?: "";
    }
  | {
      scope: Exclude<VariableScope, VariableScope.Global>;
      targetId: string;
    };

export type TargetedVariableScope =
  | VariableScope.Session
  | VariableScope.Device
  | VariableScope.User
  | VariableScope.Entity;

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

export const isSuccessResult = <T extends VariableSetResult>(
  result: T
): result is T & {
  status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
} => result?.status! <= VariableSetStatus.Unchanged;

export const isConflictResult = <T, S extends VariableSetter<T> = any>(
  result: VariableSetResult<T, S>
): result is VariableSetResult<T, S> & {
  status: VariableSetStatus.Conflict;
} => result?.status === VariableSetStatus.Conflict;

export const isErrorResult = <T, S extends VariableSetter<T> = any>(
  result: VariableSetResult<T, S>
): result is VariableSetResult<T, S> & {
  status: VariableSetStatus.Error;
} => result?.status === VariableSetStatus.Error;

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  source: Source;
} & (Source extends VariableSetter<any, infer S> ? MatchTarget<S> : never) &
  (
    | {
        status:
          | VariableSetStatus.Success
          | VariableSetStatus.Unchanged
          | VariableSetStatus.Conflict;
        current: Variable<T> | undefined;
      }
    | {
        status:
          | VariableSetStatus.Denied
          | VariableSetStatus.NotFound
          | VariableSetStatus.Unsupported
          | VariableSetStatus.ReadOnly;
      }
    | { status: VariableSetStatus.Error; transient?: boolean; error: any }
  );

export interface VariablePatchSource<T = any>
  extends VariableVersion,
    VariableClassification {
  value: T;
}

export interface VariablePatchResult<T = any> extends VariableClassification {
  value: T;
}

export type VariablePatchAction<T = any> = (
  current: VariablePatchSource<T> | undefined
) => VariablePatchResult<T> | undefined;

export const enum VariablePatchType {
  Add,
  Min,
  Max,
  IfMatch,
}

export type VariableValuePatch<T = any> = VariableClassification & {
  selector?: string;
} & (
    | {
        type: VariablePatchType.Add;
        by: number;
      }
    | {
        type: VariablePatchType.Min | VariablePatchType.Max;
        value: number;
      }
    | {
        type: VariablePatchType.IfMatch;
        match: T | undefined;
        value: T | undefined;
      }
  );

export const isVariablePatch = (setter: any): setter is VariablePatch =>
  !!setter["patch"];

export type VariablePatch<
  T = any,
  Scoped extends boolean = boolean
> = VariableKey &
  MatchTarget<Scoped> & {
    patch: VariablePatchAction<T> | VariableValuePatch;
  };

export type VariableSetter<T = any, Scoped extends boolean = boolean> =
  | (Variable<T> & MatchTarget<Scoped>)
  | VariablePatch<T, Scoped>;

/**
 * The information needed about a variable to validate whether it complies with a user's consents,
 * or meets other authorization based requirements.
 */
export type VariableValidationBasis = VariableKey &
  Partial<VariableClassification>;

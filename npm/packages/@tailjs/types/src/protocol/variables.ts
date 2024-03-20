import {
  DataClassification,
  DataPurposes,
  ParsableDataClassification,
  ParsableDataPurposes,
  ParsableVariableScope,
  Timestamp,
  dataClassification,
  dataPurposes,
  variableScope,
} from "..";

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
   *
   * If a key starts with `!` it means "not", and these kind of filters takes precedence over the others.
   *
   * For example the query ["*", "!test"] will return all keys in the default storage except "test".
   * Conversely, the query ["test", "!*"] will not return anything since all keys has been excluded.
   *
   */
  keys: string[];

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
  purposes?: DataPurposes[];
}

/** Settings that controls how results are returned when querying variables. */
export interface VariableQueryOptions {
  /**
   * Include the total number of matching of variables in the results (not just the top N first).
   * Default is `false`.
   */
  count?: number;

  /**
   * Hint to indicate that no more results than this are needed.
   * A storage will decide its own default value if not specified, and may choose to return fewer results if more efficient.
   *
   * If a cursor is requested this property changes its meaning slightly to be the prefered page size instead of max results.
   * In this case a storage may also decide to return more results than requested if that is more efficient for paging.
   *
   */
  top?: number;

  /**
   * Used for paging by specifying the value of {@link VariableQueryResult.cursor} from a previous query result.
   * If a previous cursor is specified, the `include` property is ignored.
   *
   * Please not that the results may not neccessarily contain a cursor. If a cursor was requested and none returned,
   * it means that there are no more data.
   */
  cursor?: {
    include?: boolean;
    previous?: string;
  };

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
export interface VariableKey<Strict = true> {
  /** The scope the variable belongs to. */
  scope: ParsableVariableScope<Strict>;

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
export interface VersionedVariableKey<Strict = true>
  extends VariableKey<Strict> {
  version?: string;
}

/**
 * Defines how the value of variable is classified and for which purposes it can be used.
 */
export interface VariableClassification<Strict = true> {
  /**
   * The legal classification of the kind of data a variable holds.
   * This limits which data will be stored based on a user's consent.
   */
  classification: ParsableDataClassification<Strict>;

  /**
   * Optionally defines the possible uses of the data a variables holds (they are binary flags).
   * When a variable is requested by some logic, it may be stated what the data is used for.
   * If the user has not consented to data being used for this purpose the variable will not be avaiable.
   */
  purposes?: ParsableDataPurposes<Strict>;

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
export interface VariableHeader<Strict = true>
  extends VariableKey<Strict>,
    VariableClassification<Strict>,
    VariableVersion {}

/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
export interface Variable<T = any, Strict = true>
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

export type VariableInitializer<T = any> = () =>
  | (VariableClassification & { value: T })
  | undefined
  | Promise<(VariableClassification<false> & { value: T }) | undefined>;

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified and the variable is only stored for other purposes, a result will also not be returned. (best practice)
 */
export interface VariableGetter<T = any, Strict = false>
  extends VersionedVariableKey<Strict> {
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
  purpose?: ParsableDataPurposes<Strict>;

  /**
   * Indicates that the value must be re-read from the source storage if a caching layer is used on top.
   */
  refresh?: boolean;
}

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
  result: T | undefined
): result is T & {
  status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
} => result?.status! <= VariableSetStatus.Unchanged;

export const isConflictResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Conflict;
} => result?.status === VariableSetStatus.Conflict;

export const isErrorResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Error;
} => result?.status === VariableSetStatus.Error;

export type VariableSetResult<
  T = any,
  Strict = false,
  Source extends VariableSetter<T, Strict> = VariableSetter<T, Strict>
> = {
  source: Source;
} & (
  | {
      status:
        | VariableSetStatus.Success
        | VariableSetStatus.Unchanged
        | VariableSetStatus.Conflict;
      current: Source extends VariableSetter<undefined>
        ? Variable<T> | undefined
        : Variable<T>;
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

export interface VariablePatchSource<T = any, Strict = false>
  extends VariableVersion,
    VariableClassification<Strict> {
  value: T;
}

export type VariablePatchResult<T = any, Strict = false> =
  | (Partial<VariableClassification<Strict>> & {
      value: T | undefined;
    })
  | undefined;

export type VariablePatchAction<T = any> = (
  current: VariablePatchSource<T, true> | undefined
) => VariablePatchResult<T> | undefined;

export const enum VariablePatchType {
  Add,
  Min,
  Max,
  IfMatch,
}

export type VariableValuePatch<T = any> = {
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

type StrictTypes = {
  scope: VariableScope;
  purpose: DataPurposes;
  purposes: DataPurposes;
  classification: DataClassification;
};

export const toStrict: <T>(value: T) => T extends null | undefined
  ? T
  : {
      [P in keyof T]: P extends keyof StrictTypes ? StrictTypes[P] : T[P];
    } = (value: any) => {
  (value as VariableClassification)?.classification != null &&
    (value.classification = dataClassification.parse(value.classification));

  (value as VariableClassification)?.purposes != null &&
    (value.purposes = dataPurposes.parse(value.purposes));

  (value as VariableKey)?.scope != null &&
    (value.scope = variableScope.parse(value.scope));
  return value as any;
};

export type VariablePatch<T = any, Strict = false> = VariableKey<Strict> &
  Partial<Variable<T, Strict>> &
  (
    | {
        patch: VariablePatchAction<T>;
      }
    | (VariableClassification<Strict> & {
        patch: VariableValuePatch<T>;
      })
  );

export type VariableSetter<T = any, Strict = false> =
  | Variable<T, Strict>
  | (VersionedVariableKey<Strict> & { value: undefined })
  | VariablePatch<T, Strict>;

/**
 * The information needed about a variable to validate whether it complies with a user's consents,
 * or meets other authorization based requirements.
 */
export type VariableValidationBasis<Strict = false> = VariableKey<Strict> &
  Partial<VariableClassification<Strict>>;

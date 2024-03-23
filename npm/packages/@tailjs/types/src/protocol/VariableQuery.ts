import {
  DataClassification,
  DataClassificationValue,
  DataPurposeValue,
  DataPurposes,
  Timestamp,
  Variable,
  VariableScope,
  VariableScopeValue,
  VersionedVariableKey,
} from "..";

/** Defines a filter used to query variables.  */
export interface VariableFilter {
  /** Limits the results to variables for these specific target IDs. */
  targetIds?: string[];

  /**
   * Limits the results to variables from any of these scopes.
   */
  scopes?: VariableScopeValue[];

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
    min?: DataClassificationValue;

    /** The variable must not have a higher classification than this. */
    max?: DataClassificationValue;

    /** The variable must have any of these classifications. */
    levels?: DataClassificationValue[];
  };

  /**
   * Limits the results to variables with any of these purposes.
   */
  purposes?: DataPurposeValue;
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

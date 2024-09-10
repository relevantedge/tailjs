import { MergeKeysUndefined, Pretty } from "@tailjs/util";
import { VariableScope } from ".";
import { DataClassification, DataPurposes } from "..";

export type KeyFilter<T = string> = MergeKeysUndefined<
  Iterable<T> | { not: Iterable<T> }
>;

export type RangeFilter<T> = MergeKeysUndefined<
  { eq: T } | (({ gt?: T } | { gte: T }) & ({ lt?: T } | { lte: T }))
>;

export const filterKeys = <T, Values extends Iterable<T>>(
  filter: KeyFilter<T> | undefined,
  values: Values,
  assignCompiled: (filter: KeyFilter<T>) => void
): Values => {
  if (filter == null) {
    return values;
  }

  let set: Set<T>;

  if (filter.not) {
    set =
      filter.not instanceof Set
        ? filter.not
        : (filter.not = new Set(filter.not));
  } else {
    set =
      filter instanceof Set
        ? filter
        : (assignCompiled((filter = new Set(filter))), filter as any);
  }

  return [...values].filter(
    (value) => set.has(value) === (set === filter)
  ) as any;
};

export const filterRangeValue = <T>(
  value: T | undefined,
  filter: RangeFilter<T> | undefined,
  rank: (value: Exclude<T, undefined>) => number
) => {
  if (value == null || filter == null) {
    return true;
  }

  if ("eq" in filter) {
    return value === filter.eq;
  }

  const valueRank = rank(value);
  return (
    (filter.lt
      ? valueRank < rank(filter.lt)
      : filter.lte
      ? valueRank <= rank(filter.lte)
      : true) &&
    (filter.gt
      ? valueRank > rank(filter.gt)
      : filter.gte
      ? valueRank >= rank(filter.gte)
      : true)
  );
};

/** Queries the keys for a given entity. */
export interface VariableQuery<Scopes extends string = string> {
  /**
   *  The sources to query. If omitted, all sources are queried.
   *  Use the empty string (`""`) for the default source.
   */
  sources?: KeyFilter;

  /** Only query keys in these scopes. If omitted, all scopes are queried. */
  scopes?: KeyFilter<Scopes>;

  /** The keys to match. If omitted, all keys are targeted. */
  keys?: KeyFilter;

  /** The entity the query applies to*/
  entityId: string;

  /** Gets variables that have changed since this timestamp. (Not implemented). */
  ifModifiedSince?: number;

  /** Only query keys for variables with a data classification in this range. */
  classification?: RangeFilter<DataClassification>;

  /**
   * Only query keys for variables that have/do not have the combination of these purposes.
   */
  purposes?: DataPurposes;
}

// import {
//   DataClassificationValue,
//   DataPurposeValue,
//   Timestamp,
//   Variable,
//   VariableKey,
//   VariableScopeValue,
//   VersionedVariableKey,
// } from "..";

// /** Defines a filter used to query variables.  */
// export interface VariableFilter<NumericEnums extends boolean = boolean> {
//   /** Limits the results to variables for these specific target IDs. */
//   targetIds?: readonly string[];

//   /**
//    * Limits the results to variables from any of these scopes.
//    */
//   scopes?: readonly VariableScopeValue<NumericEnums>[];

//   /**
//    * Limits the results to variables with one of these keys.
//    *
//    * Use the wildcard `*` to return all keys. The wildcard may optionally have a prefix to target specific storages.
//    *
//    * For example,  `crm:*` will limit the query to the storage mapped to the `crm` prefix.
//    *
//    * To limit the query to the default storage (that does not have a prefix) use `:*`.
//    *
//    * Wildcards can also be used for prefixes. Where `name` will only query the default storage,
//    * `*:name` will query all storages for a variable with the name `name`.
//    *
//    * Using wildcards for partial matching is not supported, so the query `*name` will _not_ return all variables
//    * where their name ends with  "name". Use tags to group and organize variables instead.
//    *
//    * If a key starts with `!` it means "not", and these kind of filters takes precedence over the others.
//    *
//    * For example the query ["*", "!test"] will return all keys in the default storage except "test".
//    * Conversely, the query ["test", "!*"] will not return anything since all keys has been excluded.
//    *
//    */
//   keys: readonly string[];

//   /**
//    * Limit the results to variables that has any of these tag combinations.
//    */
//   tags?: readonly (readonly string[])[];

//   /**
//    * Limits the results to variables with these classifications.
//    */
//   classification?: {
//     /** The variable must have at least this classification. */
//     min?: DataClassificationValue<NumericEnums>;

//     /** The variable must not have a higher classification than this. */
//     max?: DataClassificationValue<NumericEnums>;

//     /** The variable must have any of these classifications. */
//     levels?: readonly DataClassificationValue<NumericEnums>[];
//   };

//   /**
//    * Limits the results to variables with any of these purposes.
//    */
//   purposes?: DataPurposeValue<NumericEnums>;
// }

// /** Settings that controls how results are returned when querying variables. */
// export interface VariableQueryOptions<NumericEnums extends boolean = boolean> {
//   /**
//    * Include the total number of matching of variables in the results (not just the top N first).
//    * Default is `false`.
//    */
//   count?: boolean;

//   /**
//    * Hint to indicate that no more results than this are needed.
//    * A storage will decide its own default value if not specified, and may choose to return fewer results if more efficient.
//    *
//    * If a cursor is requested this property changes its meaning slightly to be the prefered page size instead of max results.
//    * In this case a storage may also decide to return more results than requested if that is more efficient for paging.
//    *
//    */
//   top?: number;

//   /**
//    * Used for paging by specifying the value of {@link VariableQueryResult.cursor} from a previous query result.
//    * If a previous cursor is specified, the `include` property is ignored.
//    *
//    * Please not that the results may not necessarily contain a cursor. If a cursor was requested and none returned,
//    * it means that there are no more data.
//    */
//   cursor?: {
//     include?: boolean;
//     previous?: string;
//   };

//   /**
//    * Limits the results to variables created or updated after this timestamp.
//    */
//   ifModifiedSince?: Timestamp;

//   /**
//    * Limits the results to variables that are not included here or have a different version.
//    *
//    * Can be used to reduce the data transferred when refreshing the values of variables already loaded.
//    */
//   ifNoneMatch?: VersionedVariableKey<NumericEnums>[];
// }

// export interface VariableQueryResult<T extends VariableKey = Variable> {
//   count?: number;
//   results: T[];
//   cursor?: string;
// }

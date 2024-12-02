import { StrictUnion } from "@tailjs/util";
import { DataClassification, DataPurposes, Variable } from "../..";

export type KeyFilter<T = string> = StrictUnion<
  Iterable<T> | { not: Iterable<T> }
>;

export type RangeFilter<T> = StrictUnion<
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
  value: T,
  filter: RangeFilter<T> | undefined,
  rank: (value: NonNullable<T>) => number
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
   *  Use `null` or the empty string (`""`) for the default source.
   */
  sources?: KeyFilter<string | null>;

  /** Only query keys in these scopes. If omitted, all scopes are queried. */
  scopes?: KeyFilter<Scopes>;

  /** The keys to match. If omitted, all keys are targeted. */
  keys?: KeyFilter;

  /** The entities the query targets. */
  entityIds?: string[];

  /** Gets variables that have changed since this timestamp. (Not implemented). */
  ifModifiedSince?: number;

  /** Only query keys for variables with a data classification in this range. */
  classification?: RangeFilter<DataClassification>;

  /**
   * Only query keys for variables that have/do not have the combination of these purposes.
   */
  purposes?: DataPurposes;
}

export interface VariableQueryOptions {
  /**
   * The _preferred_ number of results before a cursor must be used to fetch the next set.
   *
   * The actual page size is determined by the storage.
   */
  page?: number;

  /** Used to fetch the next page of results returned from a previous query. */
  cursor?: string | null;
}

export interface VariableQueryResult {
  variables: Variable[];

  /** The cursor to use if there are more results. */
  cursor?: string;
}

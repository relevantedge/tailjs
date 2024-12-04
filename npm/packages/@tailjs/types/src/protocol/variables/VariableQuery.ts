import { map2, Nullish, set2, skip2, StrictUnion } from "@tailjs/util";
import { DataClassification, DataPurposes, Variable } from "../..";

export type KeyFilter<T = string> = StrictUnion<
  Iterable<T> | { not: Iterable<T> }
>;

export type RangeFilter<T> = StrictUnion<
  { eq: T } | (({ gt?: T } | { gte: T }) & ({ lt?: T } | { lte: T }))
>;

const filterSetSymbol = Symbol();
export const filterKeys = <T, Values, K = T>(
  filter: KeyFilter<K> | undefined,
  values: Iterable<T> & Values,
  key?: (item: T) => K
): Values | T[] => {
  if (filter == null) {
    return values;
  }

  let cached = filter[filterSetSymbol] as { set: Set<K>; not: boolean };

  if (!cached) {
    cached = filter[filterSetSymbol] = filter.not
      ? { set: set2(filter.not), not: true }
      : { set: set2(filter), not: false };
  }
  const { set, not } = cached;

  return map2(values, (value) =>
    set.has(key ? key(value) : (value as any)) !== not ? value : skip2
  ) as T[];
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

  /** Only query keys in this scopes. Takes precedence over {@link scopes}. */
  scope?: Scopes | Nullish;

  /** Only query keys in these scopes. If omitted, all scopes are queried. */
  scopes?: Scopes[];

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

export interface VariablePurgeOptions {
  /**
   * Without this flag, purge filters not addressing specific entity IDs will fail as a safety measure.
   *
   * Also, bulk deletes are not allowed from untrusted context.
   */
  bulk?: boolean;
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

export const consumeQueryResults = async (
  query: (cursor: string | undefined) => Promise<VariableQueryResult>,
  callback: (results: Variable[]) => any
) => {
  let cursor: string | undefined;
  do {
    const { variables, cursor: nextCursor } = await query(cursor);
    if (variables.length) {
      await callback(variables);
    }
    cursor = nextCursor;
  } while (cursor);
};

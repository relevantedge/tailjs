import type { ExternalReference, Integer, UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

export interface SearchEvent extends UserInteractionEvent {
  type: "search";

  /**
   * The free-text query used for the search.
   */
  query?: string;

  /**
   * Any filters that were applied to the search in addition to the query.
   * Filters are assumed combined using "and" semantics unless they are for the same field in
   * which case it means that the field must match at least one of the values.
   *
   * For example "age>=10 AND age<=20 AND (type=horse OR type=cat)"
   */
  filters?: SearchFilter[];

  /** The number of results that matched the query. */
  hits?: Integer;

  /**
   * If some or all of the results are relevant for analytics or AI, they can be included here.
   */
  topHits?: SearchResult[];
}

export interface SearchResult extends ExternalReference {
  rank: Integer;
}

/**
 * A filter that applies to a field in a search query.
 */
export interface SearchFilter extends ExternalReference {
  /**
   * If the filter consisted of multiple groups of filters where one of them should match
   * this can be used to separate the groups.
   *
   * For example (age>=10 AND age<=20 AND type=horse) OR (age<5 AND type=cat).
   */
  group?: number;

  /**
   * The value the field must match. Use UNIX ms timestamps for dates and durations.
   * If the value is the ID of a defined entity use {@link reference} instead.
   */
  value?: string | number | boolean;

  /** If the value is a defined entity such as a product category use this instead of {@link value}. */
  reference?: ExternalReference;

  /**
   * How the field compares against the value.
   *
   * @default "eq"
   */
  comparison?: "<" | "<=" | "=" | "!=" | ">=" | ">";
}

/**
 * A search filter that applies to a single field that must match a defined entity (e.g. "manufacturer").
 */
export interface SearchFieldReferenceFilter extends ExternalReference {
  /** A list of entities where the field must match at least one of them (or none depending on the comparison). */
  references?: ExternalReference[];

  comparison?: "eq" | "neq";
}

export const isSearchEvent = typeTest<SearchEvent>("search");

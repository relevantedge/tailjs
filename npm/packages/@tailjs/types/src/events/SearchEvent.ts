import type {
  ExternalReference,
  Integer,
  TrackedEvent,
  UserInteractionEvent,
} from "..";
import { typeTest } from "../util/type-test";

export interface SearchEvent extends UserInteractionEvent {
  type: "search";

  query?: string;
  searchParameter?: Record<string, SearchParameter>;
  resultCount?: Integer;
  significantResults?: SearchResult[];
}

export interface SearchResult extends ExternalReference {
  rank: Integer;
}

export interface SearchParameter extends ExternalReference {
  value: string;
  comparison?: "lt" | "eq" | "gt";
}

export const isSearchEvent = typeTest<SearchEvent>("search");

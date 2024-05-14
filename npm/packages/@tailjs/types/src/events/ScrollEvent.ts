import type { ScreenPosition, TrackedEvent, UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

export interface ScrollEvent extends UserInteractionEvent {
  type: "scroll";

  /**
   * The offset relative to the page size (100 % is bottom, 0 % is top)
   */
  offset: ScreenPosition;

  /**
   * The type of scrolling.
   */
  scrollType?:
    | "fold" // The user scrolled more than 200 pixels past the fold.
    | "article-end" // Not yet implemented. Needs a notion of special components that are defined as the main "article".
    | "page-middle" // The user scrolled past the middle of the page.
    | "page-end" // The user scrolled to the end of the page.
    | "read" // Not yet implemented. Will be fun to come up with some kind of heuristic, like "At least x amount of smaller scrolls duration y apart for at least z seconds."
    | "offset"; // Not yet implemented. A pre-configured percentage.
}

export const isScrollEvent = typeTest<ScrollEvent>("scroll");

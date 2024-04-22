import { UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

/** The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3) */
export interface AnchorNavigationEvent extends UserInteractionEvent {
  type: "anchor_navigation";

  /** The name of the anchor. */
  anchor: string;
}

export const isAnchorEvent =
  typeTest<AnchorNavigationEvent>("anchor_navigation");

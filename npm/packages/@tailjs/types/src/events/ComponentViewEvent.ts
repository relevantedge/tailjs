import { UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.
 */
export interface ComponentViewEvent extends UserInteractionEvent {
  type: "COMPONENT_VIEW";
}

export const isComponentViewEent =
  typeTest<ComponentViewEvent>("COMPONENT_VIEW");

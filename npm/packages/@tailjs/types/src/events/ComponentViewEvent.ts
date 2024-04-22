import { UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.
 */
export interface ComponentViewEvent extends UserInteractionEvent {
  type: "component_view";
}

export const isComponentViewEvent =
  typeTest<ComponentViewEvent>("component_view");

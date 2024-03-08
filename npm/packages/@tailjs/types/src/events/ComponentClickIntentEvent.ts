import type { UserInteractionEvent, TrackingSettings } from "..";
import { typeTest } from "../util/type-test";

/**
 * The event is triggered when a component is clicked.
 *
 * This applies only to components that have click tracking configured,
 *  either via {@link TrackingSettings.clicked}, "track-clicks" in the containing DOM or "--track-clicks" via CSS.
 */
export interface ComponentClickEvent extends UserInteractionEvent {
  type: "COMPONENT_CLICK_INTENT";
}

export const isComponentClickIntentEvent = typeTest<ComponentClickEvent>(
  "COMPONENT_CLICK_INTENT"
);

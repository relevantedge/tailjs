import type {
  UserInteractionEvent,
  TrackingSettings,
  ElementInfo,
  Position,
  ScreenPosition,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * The event is triggered when a user probably wanted to click a component but nothing happened.
 *
 * Used for UX purposes where it may indicate that navigation is not obvious to the users.
 * This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.
 *
 * This applies only to components that have click tracking configured,
 *  either via {@link TrackingSettings.clicked}, "track-clicks" in the containing DOM or "--track-clicks" via CSS.
 */
export interface ComponentClickIntentEvent extends UserInteractionEvent {
  type: "component_click_intent";

  clicks?: Position[];

  clickables?: ElementInfo[];
}

export const isComponentClickIntentEvent = typeTest<ComponentClickIntentEvent>(
  "component_click_intent"
);

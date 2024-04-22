import type { TrackedEvent, ViewTimingData, ViewEvent, PassiveEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is sent when a user leaves a view (page, screen or similar).
 *
 * Due to the chaotic and state-less nature of the Internet, there is no guarantee that every {@link ViewEvent} has a matching end event.
 * In case a view has no end event, the most recent {@link HeartbeatEvent} can be used to approximate when the user left.
 */
export interface ViewTimingEvent extends ViewTimingData, PassiveEvent {
  type: "view_timing";
}

export const isViewEndedEvent = typeTest<ViewTimingEvent>("view_ended");

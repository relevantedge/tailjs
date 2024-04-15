import type { TrackedEvent, ViewTimingEvent, ViewEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is sent when a user leaves a view (page, screen or similar).
 *
 * Due to the chaotic and state-less nature of the Internet, there is no guarantee that every {@link ViewEvent} has a matching end event.
 * In case a view has no end event, the most recent {@link HeartbeatEvent} can be used to approximate when the user left.
 */
export interface ViewEndedEvent extends TrackedEvent, ViewTimingEvent {
  type: "VIEW_ENDED";
}

export const isViewEndedEvent = typeTest<ViewEndedEvent>("VIEW_ENDED");

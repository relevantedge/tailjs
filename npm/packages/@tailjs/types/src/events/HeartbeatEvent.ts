import type {
  SystemEvent,
  TrackedEvent,
  ViewTimingEvent,
  ViewTimingData,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * An event that is sent whenever a tab loses focus. In addition it may be sent regularly if a user stays in a tab for a long time.
 *
 * In case {@link ViewTimingEvent}s are not sent or gets lost these heartbeats can be used to approximate page view durations.
 * They also enable live statistics, since duration is tracked before the view ends.
 *
 */
export interface HeartbeatEvent
  extends TrackedEvent,
    ViewTimingData,
    SystemEvent {
  type: "heartbeat";
}

export const isHeartBeatEvent = typeTest<HeartbeatEvent>("heartbeat");

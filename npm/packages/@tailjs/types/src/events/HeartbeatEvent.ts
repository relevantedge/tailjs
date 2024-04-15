import type {
  SystemEvent,
  TrackedEvent,
  ViewEndedEvent,
  ViewTimingEvent,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * An event that is sent whenever a tab loses focus. In addition it may be sent regularly if a user stays in a tab for a long time.
 *
 * In case {@link ViewEndedEvent}s are not sent or gets lost these heartbeats can be used to approximate page view durations.
 * They also enable live statistics, since duration is tracked before the view ends.
 *
 */
export interface HeartbeatEvent
  extends TrackedEvent,
    ViewTimingEvent,
    SystemEvent {
  type: "HEARTBEAT";
}

export const isHeartBeatEvent = typeTest<HeartbeatEvent>("HEARTBEAT");

import type {
  SystemEvent,
  TrackedEvent,
  ViewEndedEvent,
  ViewTimingEvent,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * An event that may be sent regularaly from the client to indicate how long it has been alive.
 * In case {@link ViewEndedEvent}s are not sent or gets lost these heartbeats can be used to approximate page view durations.
 */
export interface HeartbeatEvent
  extends TrackedEvent,
    ViewTimingEvent,
    SystemEvent {
  type: "HEARTBEAT";
}

export const isHeartBeatEvent = typeTest<HeartbeatEvent>("HEARTBEAT");

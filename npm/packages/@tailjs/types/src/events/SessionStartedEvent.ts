import type { Duration, Integer, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/** @privacy anonymous */
export interface SessionStartedEvent extends TrackedEvent {
  type: "session_started";

  url?: string;

  /**
   * The total number of sessions from the given device (regardless of username).
   */
  sessionNumber?: Integer;

  /**
   * The time since the last session from this device.
   */
  timeSinceLastSession?: Duration;
}

export const isSessionStartedEvent =
  typeTest<SessionStartedEvent>("session_started");

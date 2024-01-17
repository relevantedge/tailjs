import { typeTest } from "../util/type-test";
import { SystemEvent } from "./SystemEvent";
import { TrackedEvent } from "./TrackedEvent";

/**
 * An event that can be used to reset the current session and optionally also device.
 * Intended for debugging and not relayed to backends.
 */
export interface ResetEvent extends TrackedEvent, SystemEvent {
  type: "RESET";
  /**
   * Whether only the session or also the device should be reset.
   *
   * @default true
   */
  includeDevice?: boolean;
}

export const isResetEvent = typeTest<ResetEvent>("RESET");

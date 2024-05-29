import { SystemEvent, TrackedEvent } from ".";
import { typeTest } from "../util/type-test";

/**
 * An event that can be used to reset the current session and optionally also device.
 * Intended for debugging and not relayed to backends.
 */
export interface ResetEvent extends TrackedEvent, SystemEvent {
  type: "reset";
  /**
   * Whether only the session or also the device should be reset.
   *
   * @default true
   */
  includeDevice?: boolean;

  /**
   * Whether to also reset the consent.
   */
  includeConsent?: boolean;
}

export const isResetEvent = typeTest<ResetEvent>("reset");

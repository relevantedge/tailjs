import { TrackedEvent } from "..";

export interface PostRequest {
  /** New events to add. */
  events?: TrackedEvent[];

  /** Variables to set. */
  variables?: {
    // get: TrackerVariableFilter;
    // set: TrackerVariable;
  };

  /**
   * A client-generated session ID.
   */
  deviceSessionId?: string;

  /**
   * A client-genereated device ID. If specified, the server will not generate one.
   *
   * Useful for apps amongst other things.
   */
  deviceId?: string;
}

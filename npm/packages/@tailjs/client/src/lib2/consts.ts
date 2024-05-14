import { TrackedEvent } from "@tailjs/types";
import { throwError } from "@tailjs/util";

export const DEBUG = true;
export const HEARTBEAT_FREQUENCY = 5_000;
export const STORAGE_PREFIX = "_t:";
export const REQUEST_LOCK_KEY = "rq";
export const VARIABLE_POLL_FREQUENCY = 3_000;
export const VARIABLE_CACHE_DURATION = 3_000;
export const EVENT_POST_FREQUENCY = 2000;
export const STATE_KEY = STORAGE_PREFIX + "data";

export const NOT_INITIALIZED = () => () => throwError("Not initialized.");

export type TrackerContext = {
  deviceSessionId?: string;

  applyEventExtensions(event: TrackedEvent): TrackedEvent | undefined;
};

export const DEBUG = true;
export const HEARTBEAT_FREQUENCY = 5_000;
export const STORAGE_PREFIX = "_t:";
export const REQUEST_LOCK_KEY = STORAGE_PREFIX + "lck";
export const VARIABLE_POLL_FREQUENCY = 3_000;
export const VARIABLE_CACHE_DURATION = 3_000;
export const EVENT_POST_FREQUENCY = 2000;

export type TrackerContext = {
  deviceSessionId?: string;
};

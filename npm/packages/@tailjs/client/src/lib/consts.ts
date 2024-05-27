import { CLIENT_STORAGE_PREFIX } from "@constants";
import { TrackedEvent } from "@tailjs/types";
import { Nullish, throwError } from "@tailjs/util";

export const DEBUG = true;
export const HEARTBEAT_FREQUENCY = 5_000;
export const REQUEST_LOCK_KEY = CLIENT_STORAGE_PREFIX + "rq";
export const VARIABLE_POLL_FREQUENCY = 3_000;
export const VARIABLE_CACHE_DURATION = 3_000;
export const EVENT_POST_FREQUENCY = 5000;

export const NOT_INITIALIZED = () => () => throwError("Not initialized.");

export type TrackerContext = {
  deviceSessionId?: string;

  applyEventExtensions(event: TrackedEvent): TrackedEvent | undefined;

  validateKey: {
    (key: string | Nullish, throwIfInvalid?: true): true;
    (key: string | Nullish, throwIfInvalid: false): boolean;
  };
};

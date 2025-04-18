import { PLACEHOLDER_SCRIPT } from "@constants";

import { isTracker, trackerConfig } from "../lib/config";
import { ProvisionalTracker } from "../interfaces";

export const CLIENT_CONFIG = trackerConfig;

// Don't pollute globalThis in server context.
let ssrTracker: any;

export const setTrackerName = (name: string): ProvisionalTracker => {
  if (typeof window === "undefined") {
    return (ssrTracker ??= () => {});
  }
  const prop = Object.getOwnPropertyDescriptor(globalThis, CLIENT_CONFIG.name);
  if (prop?.value && prop.writable) {
    Object.defineProperty(globalThis, name, {
      value: prop.value,
      writable: prop.value[isTracker],
    });
  } else if (!globalThis[name]) {
    PLACEHOLDER_SCRIPT(name);
  }
  return globalThis[(CLIENT_CONFIG.name = name)];
};

export let tail = setTrackerName(CLIENT_CONFIG.name);
tail((actualTail: any) => (tail = actualTail));

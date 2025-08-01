import { TRACKER_CONFIG_PLACEHOLDER } from "@constants";
import { initializeTracker } from ".";
import { waitFor } from "@tailjs/util";

// Don't initialize before we have a body.
waitFor(
  () => document.body,
  () => initializeTracker(TRACKER_CONFIG_PLACEHOLDER)
);

import type { Tracker, TrackerAttributes, TrackerConfiguration } from "..";
import { trackerConfig } from "../lib2/config";

export const DEFAULT_CLIENT_CONFIG: Required<TrackerConfiguration> = {
  ...trackerConfig,
};

export * from "../commands";
export * from "../interfaces";
export * from "./ensureTracker";

export * from "./configureTracker";
export { Tracker, TrackerAttributes };

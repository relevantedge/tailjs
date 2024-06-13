import type {
  Tracker,
  TrackerAttributes,
  TrackerClientConfiguration,
} from "..";
import { trackerConfig } from "../lib/config";

export const DEFAULT_CLIENT_CONFIG: Required<TrackerClientConfiguration> = {
  ...trackerConfig,
};

export * from "../commands";
export * from "../interfaces";
export * from "./ensureTracker";

export * from "./configureTracker";
export { Tracker, TrackerAttributes };

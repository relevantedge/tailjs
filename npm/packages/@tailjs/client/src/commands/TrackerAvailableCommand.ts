import type { Tracker, TrackerCommand } from "..";

export type TrackerAvailableCommand = (tracker: Tracker) => void;
export const isTrackerAvailableCommand = (
  command: TrackerCommand
): command is (tracker: Tracker) => void => typeof command === "function";

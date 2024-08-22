import type { Tracker, TrackerCommand } from "..";

export type UseTrackerCommand = (tracker: Tracker) => void;
export const isTrackerAvailableCommand = (
  command: TrackerCommand
): command is (tracker: Tracker) => void => typeof command === "function";

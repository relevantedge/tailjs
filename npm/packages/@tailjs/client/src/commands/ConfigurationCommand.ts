import { TrackingBehavior } from "@tailjs/types";
import { commandTest } from "./shared";

export type ConfigurationCommand = {
  track: TrackingBehavior;
};
export const isConfigurationCommand =
  commandTest<ConfigurationCommand>("track");

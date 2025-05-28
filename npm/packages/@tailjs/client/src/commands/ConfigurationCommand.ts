import { TrackingBehavior } from "@tailjs/types";
import { commandTest } from "./shared";

export type ConfigurationCommand = {
  tracking: TrackingBehavior;
};
export const isConfigurationCommand =
  commandTest<ConfigurationCommand>("tracking");

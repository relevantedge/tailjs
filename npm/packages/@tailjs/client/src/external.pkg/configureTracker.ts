import { TrackerConfiguration } from ".";
import { tail } from ".";
import { isTracker, trackerConfig } from "../lib/config";

export interface EmbeddedTrackerConfiguration extends TrackerConfiguration {
  /**
   * Set this if the client script is loaded and configured by some other mechanism (e.g. when your code is not the main entry point but only contains components that are individually rendered by another host).
   * The effect will be that the client script is not automatically injected, and other parameters than name set with {@function configureTracker} are ignored.
   * @default true
   */
  external?: boolean;
}

export function isExternal() {
  return (trackerConfig as EmbeddedTrackerConfiguration).external;
}
export function configureTracker(
  configuration: Partial<EmbeddedTrackerConfiguration>
): void;
export function configureTracker(
  configure: (
    configuration: EmbeddedTrackerConfiguration
  ) => Partial<EmbeddedTrackerConfiguration>
): void;
export function configureTracker(configure: any) {
  const configured =
    typeof configure === "function" ? configure(trackerConfig) : configure;

  if (tail[isTracker]) {
    console.error(
      "Tracker has already been initialized. Too late to configure."
    );
    return;
  }
  Object.assign(trackerConfig, configured);
}

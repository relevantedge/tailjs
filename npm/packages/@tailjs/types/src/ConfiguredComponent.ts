import type { Component, TrackingSettings } from ".";

export interface ConfiguredComponent extends Component {
  /**
   * Settings for how the component will be tracked.
   *
   * These settings are not tracked, that is, this property is stripped from the data sent to the server.
   */
  track?: TrackingSettings;
}

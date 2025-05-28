import type { Component, TrackingBehavior } from ".";

export interface ConfiguredComponent extends Component {
  /**
   * Settings for how the component will be tracked.
   *
   * These settings are not tracked, that is, this property is stripped from the data sent to the server.
   */
  tracking?: ComponentTrackingBehavior;
}

export interface ComponentTrackingBehavior extends TrackingBehavior {
  /**
   * Always include content and component, also if it is a parent component.
   * By default only the closest component will be included.
   *
   * This does not apply to impression tracking.
   *
   * Not inherited by child components.
   *
   * HTML attribute: `track-promote`.
   * CSS: `--track-promote: 0/no/false/1/yes/true`.
   *
   * @default false
   */
  promote?: boolean;

  /**
   * The component will only be tracked with the closest non-secondary component as if the latter had the {@link promote} flag.
   *
   * This does not apply to impression tracking.
   *
   * Not inherited by child components.
   *
   * HTML attribute: `track-secondary`. \
   * CSS: `--track-secondary: 0/no/false/1/yes/true`.
   *
   * @default false
   */
  secondary?: boolean;
}

import type { UserInteractionEvent } from ".";
export interface TrackingSettings {
  /**
   * Always include in {@link UserInteractionEvent.components}, also if it is a parent component.
   * By default only the closest component will be included.
   *
   * This does not apply to impression tracking.
   *
   * Not inherited by child components.
   *
   * HTML attribute: `track-promote`.
   * CSS: `--track-promote: 1/yes/true`.
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
   * CSS: `--track-secondary: 1/yes/true`.
   *
   * @default false
   */
  secondary?: boolean;

  /**
   * Track the visible region occupied by the component or content.
   *
   * Inherited by child components (also if specified on non-component DOM element).
   *
   * HTML attribute: `track-region`. \
   * CSS: `--track-region: 1/yes/true`.
   *
   * @default false
   */
  region?: boolean;

  /**
   * Track clicks. Note that clicks are always tracked if they cause navigation.
   *
   * Inherited by child components (also if specified on non-component DOM element).
   *
   * HTML attribute: `track-clicks`.
   * CSS: `--track-clicks: 1/yes/true`.
   *
   * @default true unless in a `<nav>` tag
   */
  clicks?: boolean;

  /**
   * Track impressions, that is, when the component becomes visible in the user's browser for the first time.
   * This goes well with {@link region}.
   *
   * Not inherited by child components.
   *
   * HTML attribute: `track-impressions`.
   * CSS: `--track-impressions: 1/yes/true`.
   *
   * @default false
   */
  impressions?: boolean;
}

import type {
  Duration,
  Integer,
  UserInteractionEvent,
  TrackingSettings,
  ViewTimingData,
  TrackedEvent,
  LocalID,
  PassiveEvent,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * The event is triggered when more than 75 % of the component has been visible for at least 1 second.
 * Components that are too big for 75 % of them to fit in the viewport are counted if they cross the page fold.
 *
 * This applies only to components that have impression tracking configured,
 *  either via {@link TrackingSettings.impressions}, "track-impressions" in the containing DOM or "--track-impressions" via CSS.
 *
 * Note that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance.
 * Impression tracking is still possible for these if explicitly set via {@link TrackingSettings.impressions}.
 *
 * Use {@link ImpressionTimingEvent} in processing to determine for how long the impression lasted, and how many individual impressions there were (the component may have left the viewport and then come back at a later point).
 * Obviously, there was at least one impression if this event happened, so summary the events will not include this first impression.
 */
export interface ImpressionEvent extends UserInteractionEvent {
  type: "impression";
}

/**
 * Provides statistics for an {@link ImpressionEvent} that is referenced via {@link TrackedEvent.relatedEventId}.
 *
 * Both duration and impressions are deltas, so they can be added to get the total duration and number of impressions in processing.
 */
export interface ImpressionTimingEvent extends PassiveEvent {
  type: "impression_timing";

  /** The additional duration since the previous summary event. */
  duration?: Duration;

  /**
   * The number of additional impressions since the previous summary event.
   */
  impressions?: Integer;
}

export const isImpressionEvent = typeTest<ImpressionEvent>("impression");

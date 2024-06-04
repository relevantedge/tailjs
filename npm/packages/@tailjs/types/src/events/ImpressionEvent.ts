import type {
  Duration,
  Integer,
  Percentage,
  TrackingSettings,
  UserInteractionEvent,
  ViewTimingData,
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
 */
export interface ImpressionEvent extends UserInteractionEvent {
  type: "impression";

  impressions?: Integer;

  duration?: ViewTimingData;

  /**
   * Detailed information about the parts of the component that was viewed.
   *
   * TODO: Not implemented.
   */
  details?: {
    top?: ViewDetails;
    middle?: ViewDetails;
    bottom?: ViewDetails;
  };

  /**
   * The length and number of words in the component's text.
   * This combined with the active time can give an indication of how much the user read if at all.
   */
  text?: {
    /**
     * The number of characters in the text (including punctuation).
     */
    characters?: Integer;

    /**
     * The number of words in the text.
     */
    words?: Integer;

    /**
     * The number of sentences.
     */
    sentences?: Integer;
  };

  /**
   * The percentage of the component that was viewed.
   *
   * TODO: Not implemented.
   */
  percentage?: Percentage;
}

export interface ViewDetails {
  seen?: boolean;
  duration?: Duration;
  impression?: Integer;
}

export const isImpressionEvent = typeTest<ImpressionEvent>("impression");

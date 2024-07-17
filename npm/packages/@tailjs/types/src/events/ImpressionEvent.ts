import { TextStats } from "@tailjs/util";
import type {
  Duration,
  Integer,
  Percentage,
  TrackingSettings,
  UserInteractionEvent,
  ViewTimingData,
} from "..";
import { typeTest } from "../util/type-test";

export interface ImpressionTextStats extends Omit<TextStats, "boundaries"> {}

/**
 * The event is triggered when more than 75 % of the component's has been visible for at least 1 second,
 * or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.
 *
 *
 * This only gets tracked for components that have impression tracking configured,
 *  either via {@link TrackingSettings.impressions}, "track-impressions" in the containing DOM or "--track-impressions" via CSS.
 *
 * Note that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components
 * since the number of these can be considerable and it would hurt performance.
 * Impression tracking is still possible for these if explicitly set via {@link TrackingSettings.impressions}.
 *
 */
export interface ImpressionEvent extends UserInteractionEvent {
  type: "impression";

  /**
   * The number of times the component was sufficiently visible  to count as an impression.
   * This counter will increment if the component leaves the user's viewport and then comes back.
   *
   */
  impressions?: Integer;

  /**
   * For how long the component was visible. This counter starts after an impression has been detected.
   */
  duration?: ViewTimingData;

  /**
   * Detailed information about the parts of the component that was viewed.
   * This information is only provided if the component spans more than 125 % of the viewport's height.
   */
  regions?: {
    /** The top 25 % of the component. */
    top?: ImpressionRegionStats;

    /** The middle 25 - 75 % of the component. */
    middle?: ImpressionRegionStats;

    /** The bottom 25 % of the component. */
    bottom?: ImpressionRegionStats;
  };

  /**
   * The length and number of words in the component's text.
   * This combined with the active time can give an indication of how much the user read if at all.
   */
  text?: ImpressionTextStats;

  /**
   * The percentage of the component's area that was visible at some point during the {@link View}.
   */
  seen?: Percentage;

  /**
   * The percentage of the text the user can reasonably be assumed to have read
   *  based on the number of words and duration of the impression.
   */
  read?: Percentage;
}

export interface ImpressionRegionStats {
  duration?: Duration;

  impressions?: Integer;

  seen?: Percentage;

  /**
   * The percentage of the component's area that was visible at some point during the {@link View}.
   */
  read?: Percentage;
}

export const isImpressionEvent = typeTest<ImpressionEvent>("impression");

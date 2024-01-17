import { Duration, Integer, TrackedEvent } from "..";

export interface ViewTimingEvent extends TrackedEvent {
  timing?: {
    /**
     * The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar.
     * Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds.
     */
    interactiveTime?: Duration;

    /**
     * The time the view/tab has been visible.
     */
    visibleTime?: Duration;

    /**
     * The time elapsed since the view/tab was opened.
     */
    totalTime?: Duration;

    /**
     * The number of times the user toggled away from the view/tab and back.
     */
    activations?: Integer;
  };
}

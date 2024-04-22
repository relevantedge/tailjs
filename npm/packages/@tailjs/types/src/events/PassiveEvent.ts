import { LocalID, TrackedEvent } from "..";

/**
 * Base type for events that adds timing or similar data to events that has already been posted.
 * These events are special in the sense that they do not start a new session, so if the session has expired
 * after the event they relate to they will not get tracked.
 */
export interface PassiveEvent extends TrackedEvent {
  /**
   * This property must be implemented in events implementing the interface.
   * Since events are just data templates and not polymorphic classes
   */
  passive: true;

  /** @inheritdoc */
  relatedEventId: LocalID;
}

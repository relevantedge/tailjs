import { EventMetadata, LocalID, TrackedEvent } from "..";

/**
 * Base type for events that adds timing or similar "after-the-fact" data to events that has already been posted.
 * These events are special in the sense that they do not start a new session, so if the session has expired
 * before the event is sent to the server, it will not start a new session, but also not be tracked.
 */
export interface PassiveEvent extends TrackedEvent {
  /**
   * This property must be set on events implementing the interface
   * since events are just data templates and not polymorphic classes.
   */
  metadata: EventMetadata & {
    passive: true;
  };
}

export const isPassiveEvent = (value: any): value is PassiveEvent =>
  !!(
    (value?.metadata as EventMetadata)?.passive ||
    (value as TrackedEvent)?.patchTargetId
  );

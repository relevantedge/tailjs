import type {
  CartUpdatedEvent,
  ComponentClickEvent,
  EventMetadata,
  LocalID,
  Session,
  Tagged,
  Timestamp,
  Uuid,
  ViewEvent,
} from "..";

/**
 * The base type for all events that are tracked.
 *
 * The naming convention is:
 * - If the event represents something that can also be considered an entity like "a page view", "a user location" etc. the name should be a (deverbal) noun.
 * - If the event only indicates something that happened, like "session started", "view ended" etc. the name should be a verb in the past tense.
 *
 * @id urn:tailjs:core:event
 * @privacy censor-ignore anonymous necessary
 */
export interface TrackedEvent extends Tagged {
  /**
   * The type name of the event.
   *
   * This MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered.
   * */
  type: string;

  /**
   * The ID of the schema the event comes from. It is suggested that the schema ID includes a SemVer version number in the end. (e.g. urn:tailjs:0.9.0 or https://www.blah.ge/schema/3.21.0)
   */
  schema?: string;

  /**
   * This is assigned by the server. Only use {@link clientId} client-side.
   *
   */
  id?: Uuid;

  /**
   * This is set by the client and used to when events reference each other.
   */
  clientId?: LocalID;

  /** These properties are used to track the state of the event as it gets collected, and is not persisted. */
  metadata?: EventMetadata;

  /**
   * If set, it means this event contains updates to an existing event with this {@link clientId}, and should not be considered a separate event.
   * It must have the target event's {@link TrackedEvent.type} postfixed with "_patch" (for example "view_patch").
   *
   * Numbers in patches are considered incremental which means the patch will include the amount to add to an existing number (or zero if it does not yet have a value).
   * All other values are just overwritten with the patch values.
   *
   * Please pay attention to this property when doing analytics lest you may over count otherwise.
   *
   * Patches are always considered passive, cf. {@link EventMetadata.passive}.
   */
  patchTargetId?: LocalID;

  /**
   * The client ID of the event that caused this event to be triggered or got triggered in the same context.
   * For example, a {@link NavigationEvent} may trigger a {@link ViewEvent},
   * or a {@link CartUpdatedEvent} may be triggered with a {@link ComponentClickEvent}.
   *
   */
  relatedEventId?: LocalID;

  /**
   * The session associated with the event.
   */
  session?: Session;

  /**
   * When applicable, the view where the event happened (related by {@link ViewEvent}).
   */
  view?: LocalID;

  /**
   * This timestamp will always have a value before it reaches a backend.
   * If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).
   *
   * @default now
   */
  timestamp?: Timestamp;
}

export const isTrackedEvent = (ev: any): ev is TrackedEvent =>
  ev && typeof ev.type === "string";

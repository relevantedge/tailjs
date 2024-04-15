import type {
  CartUpdatedEvent,
  ComponentClickEvent,
  Integer,
  LocalID,
  Session,
  Tagged,
  Timestamp,
  ViewEvent,
} from "..";

/**
 * The base type for all events that are tracked.
 *
 * The naming convention is:
 * - If the event represents something that can also be considered an entity like "a page view", "a user location" etc. the name should be a (deverbal) noun.
 * - If the event only indicates something that happend, like "session started", "view ended" etc. the name should be a verb in the past tense.
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
   * The ID of the schema the event comes from. It is suggested that the schema ID ends with a hash followed by a SemVer version number. (e.g. urn:tailjs#0.9.0)
   */
  schema?: string;

  /**
   * This may be assigned or transformed by backends if needed.
   * It is client-assigned for {@link ViewEvent}s
   */
  id?: LocalID;

  /**
   * This is set by the client and can be used to dedupplicate events sent multiple times if the endpoint timed out.
   */
  clientId?: LocalID;

  /**
   * The number of times the client tried to sent the event if the endpoint timed out
   *
   * @default 0
   */
  retry?: Integer;

  /**
   * The event that caused this event to be triggered or got triggered in the same context.
   * For example a {@link NavigationEvent} may trigger a {@link ViewEvent},
   * or a {@link CartUpdatedEvent} my be triggered with a {@link ComponentClickEvent}.
   */
  relatedClientId?: LocalID;

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

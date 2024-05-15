import { Nullish } from "@tailjs/util";
import { TrackedEvent } from ".";

/** These properties are used to track the state of events as they get collected, and not stored. */
export interface EventMetadata {
  /** Hint to the request handler, that new sessions should not be started if all posted events are passive. */
  passive?: boolean;

  /** Hint that the event has been queued. */
  queued?: boolean;

  /** Hint to client code, that the event has been posted to the server. */
  posted?: boolean;
}

let metadata: EventMetadata | undefined;
export const clearMetadata = <
  T extends TrackedEvent | Nullish,
  ClientSide extends boolean
>(
  event: T,
  client: ClientSide
): T &
  (ClientSide extends true
    ? { metadata?: { posted?: undefined } }
    : { metadata?: undefined }) => (
  (metadata = event?.metadata) &&
    (client
      ? (delete metadata.posted,
        delete metadata.queued,
        !Object.entries(metadata).length && delete event.metadata)
      : delete event.metadata),
  event as any
);

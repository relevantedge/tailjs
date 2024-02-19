import { TrackerScope } from "@tailjs/types";

/**
 * An IdProvider is used to map client-local IDs to global IDs in the context of a {@link TrackerScope} (session, user or device).
 *
 * It also enables temporary session IDs to be anonymized by removing all traits related to an individual when the temporary session ID
 * is based on client-specific information such as IP address.
 *
 * Mapped IDs will not be exposed to the client in script scope, since a client must never be able to make updates
 * outside its scope (e.g. others' sessions or events).
 *
 * If exposed to the client in HttpOnly cookies, they are encrypted, hence still useless for external parties.
 */
export interface IdentifierProvider {
  /**
   * Returns the specified number of globally unique identifiers, as defined by the implementation.
   */
  nextIds(count: number): Promise<string[]>;

  /**
   * Maps a client-local identifier to a globally unique ID.
   *
   * If a time-to-live is specified the mapped ID will be the same if this method is called
   * with the same parameters for this amount of time. Each time it is called, the expiry time will be extended.
   *
   * A zero (or negative) time-to-live will remove the mapping. This should be called as soon as possible it is known that an ID
   * mapping will not be needed anymore.
   *
   * Otherwise, it is not guaranteed that IDs will be the same.
   *
   * TTL should only be used for entities that may be patched since it adds a performance overhead.
   * Examples are cookie-less session hashes, and page view events where the active duration is continously extended.
   *
   */
  mapId(
    scope: TrackerScope,
    scopeId: string,
    localId?: string,
    ttl?: number
  ): Promise<string>;
}

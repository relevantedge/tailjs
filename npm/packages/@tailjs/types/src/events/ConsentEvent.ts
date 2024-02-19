import type { DataConsentLevel, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.
 *
 * This event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device.
 * In the same way, such information is cleared if the user opts out.
 *
 * Backends are required to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.
 *
 * The user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with {@link nonEssentialTracking} `false` revokes the consent if already given.
 * The event should ideally be sent from a cookie disclaimer.
 *
 * Granular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events.
 * This event only ensures that non-essential tracking information is not stored at the user unless consent is given.
 *
 * Also, "consent" and "event" rhymes.
 */
export interface ConsentEvent extends TrackedEvent {
  type: "CONSENT";

  level: DataConsentLevel;
  /**
   * Whether the user has consented to non-essential tracking.
   */
  nonEssentialTracking: boolean;
}

export const isConsentEvent = typeTest<ConsentEvent>("CONSENT");

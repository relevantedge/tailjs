import type { DataClassification, SignOutEvent, Uuid, UserConsent } from ".";

/**
 * Identifiers related to a user's session, login and device.
 * Based on the user's consent some of these fields may be unavailable.
 *
 * @privacy anonymous, necessary
 *
 */
export interface Session {
  /**
   * If a non-anonymous session started as an anonymous session, this is the anonymous session ID.
   * Since an anonymous session is not necessarily unique to a device, processing logic may decide
   * whether and how to stitch the anonymous and non-anonymous session together.
   */
  originalSessionId?: Uuid;

  /**
   * The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards).
   * Sessions are reset when an authenticated user logs out (triggered by the {@link SignOutEvent}).
   *
   * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
   * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
   *
   * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
   *
   */
  sessionId: Uuid;

  /**
   * The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.
   *
   * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
   * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
   *
   * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
   */
  deviceId?: Uuid;

  /**
   * The unique ID of the user's device session ID. A device session starts when the user enters the site like a normal server session, but unlike
   * server sessions, device sessions stay active as long as the user has tabs related to the site open.
   * This means that device sessions survives when the user puts their computer to sleep, or leaves tabs open in the background on their phone.
   *
   * After the user has completely left the site, device sessions time out in the same way as server sessions.
   *
   */
  deviceSessionId?: Uuid;

  /**
   * The current user owning the session.
   *
   * @privacy direct
   */
  userId?: string;

  /**
   * The user's consent choices. {@link DataClassification.Anonymous} means the session is cookie-less.
   *
   */
  consent?: UserConsent;

  /**
   *
   * The IP address of the device where the session is active.
   *
   * @privacy indirect, necessary
   */
  clientIp?: string;

  /**
   * This value indicates that an old device session "woke up" with an old device session ID and took over a new one.
   * This allows post-processing to decide what to do when the same tab participates in two sessions (which goes against the definition of a device session).
   *
   */
  expiredDeviceSessionId?: string;
}

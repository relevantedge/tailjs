import type {
  DataClassification,
  DataPurposes,
  SignOutEvent,
  UUID,
  UserConsent,
} from ".";

export interface Session {
  /**
   * The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards).
   * Sessions are reset when an authenticated user logs out (triggered by the {@link SignOutEvent}).
   *
   * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
   * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
   *
   * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
   */
  sessionId: UUID;

  /**
   * The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.
   *
   * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
   * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
   *
   * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
   */
  deviceId?: UUID;

  /**
   * The unique ID of the user's device session ID. A device session ends when the user has closed all tabs and windows, and starts whenever the user visits the site again.
   * This means that device sessions can both be significantly shorter and longer that "normal" sessions
   * in that it restarts whenever the user navigates completely away from the site and comes back (e.g. while evaluating search results),
   * but it will also survive the user putting their computer to sleep or leaving their browser app in the background for a long time on their phone.
   *
   * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
   * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
   *
   * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
   */
  deviceSessionId?: UUID;

  /**
   * The current user owning the session.
   */
  userId?: string;

  /**
   * The user's consent choices. {@link DataClassification.None} means the session is cookie-less.
   */
  consent: UserConsent;

  /**
   * This value indicates that an old device session "woke up" with an old device session ID and took over a new one.
   * This allows post-processing to decide what to do when the same tab participates in two sessions (which goes against the definition of a device session).
   */
  expiredDeviceSessionId?: string;
}

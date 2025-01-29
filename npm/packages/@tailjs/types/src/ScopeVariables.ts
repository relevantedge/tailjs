import {
  CONSENT_INFO_KEY,
  SCOPE_INFO_KEY,
  SESSION_REFERENCE_KEY,
} from "@constants";

import { Timestamp, UserConsent } from ".";

/**
 * @abstract
 * @privacy anonymous, necessary, trusted-write
 */
export interface ScopeInfo {
  id: string;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  views: number;
  isNew?: boolean;
}

export interface SessionInfo extends ScopeInfo {
  /** @access trusted-only */
  id: string;

  deviceSessionId?: string;

  deviceId?: string;

  userId?: string;

  previousSession?: Timestamp;

  hasUserAgent?: boolean;

  /** The total number of tabs opened during the session. */
  tabs?: number;
}

export interface DeviceInfo extends ScopeInfo {
  /** @access trusted-write */
  id: string;
  sessions: number;
}

export interface ScopeVariables {
  session: {
    /** @privacy anonymous, necessary */
    [SCOPE_INFO_KEY]?: SessionInfo;

    /**
     * User consent is a dynamic variable that is resolved by the Tracker and cannot be set.
     *
     * @privacy anonymous, necessary
     * @access dynamic
     */
    [CONSENT_INFO_KEY]?: UserConsent;

    /**
     * @privacy anonymous, necessary
     * @access trusted-only
     */
    [SESSION_REFERENCE_KEY]?: string;
  };
  device: {
    /** @privacy indirect, necessary */
    [SCOPE_INFO_KEY]?: DeviceInfo;
  };
}

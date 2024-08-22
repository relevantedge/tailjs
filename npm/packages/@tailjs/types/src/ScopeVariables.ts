import {
  CONSENT_INFO_KEY,
  SCOPE_INFO_KEY,
  SESSION_REFERENCE_KEY,
} from "@constants";

import { Timestamp, UserConsent } from ".";

/** @privacy anonymous, necessary, server_write */
export interface ScopeInfo {
  id: string;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  views: number;
  isNew?: boolean;
}

export interface SessionInfo extends ScopeInfo {
  /** @privacy server */
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
  sessions: number;
}

export interface SessionVariables {
  /** @privacy anonymous, necessary */
  [SCOPE_INFO_KEY]?: SessionInfo;

  /** @privacy anonymous, necessary */
  [CONSENT_INFO_KEY]?: UserConsent;

  /** @privacy anonymous, necessary */
  [SESSION_REFERENCE_KEY]?: string;
}

export interface DeviceVariables {
  /** @privacy indirect, necessary */
  [SCOPE_INFO_KEY]?: DeviceInfo;
}

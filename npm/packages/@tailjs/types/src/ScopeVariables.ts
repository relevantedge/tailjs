import { Timestamp } from ".";

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
  info?: SessionInfo;
}

export interface DeviceVariables {
  /** @privacy anonymous, necessary */
  info?: DeviceInfo;
}

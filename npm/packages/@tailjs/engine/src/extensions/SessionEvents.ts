import { QUERY_DEVICE } from "@constants";
import {
  DataClassification,
  SessionStartedEvent,
  Timestamp,
  TrackedEvent,
  VariableScope,
  cast,
  isConsentEvent,
  isSignInEvent,
  isSignOutEvent,
  isUserAgentEvent,
  isViewEvent
} from "@tailjs/types";
import { now } from "@tailjs/util";
import {
  NextPatchExtension,
  Tracker,
  TrackerExtension
} from "../shared";

export type SessionConfiguration = {
  /**
   * The session timeout in minutes.
   *
   * @default 30
   */
  timeout?: number;

  /**
   * The device session timeout in minutes.
   *
   * @default 10
   */
  deviceTimeout?: number;

  /**
   * Include the client's IP address.
   *
   * @default true
   */
  includeIp?: boolean;
};

const applyDefaults = (
  configuration: SessionConfiguration
): Required<SessionConfiguration> => {
  configuration.timeout ??= 30;
  configuration.deviceTimeout ??= 10;
  configuration.includeIp ??= true;

  return configuration as any;
};


const DATA_KEY = "stat";
const QUERY_DEVICE = "query_device";

const createInitialSessionStats = (id: string, firstSeen: Timestamp): SessionData => ({
  id,
  firstSeen,
  lastSeen: firstSeen,
  isNew: true,
  views: 0,
});

const createInitialDeviceStats = (timestamp: Timestamp): DeviceData => ({
  firstSeen: timestamp,
  lastSeen: timestamp,
  views: 0,
});

export class SessionEvents implements TrackerExtension {
  private _configuration: Required<SessionConfiguration>;

  public readonly id = "session";

  constructor(configuration: SessionConfiguration = {}) {
    this._configuration = applyDefaults(configuration);
  }

  public static async initializeSessionData(tracker: Tracker, 
    internalServerSessionId: string,
    internalClientSessionId: string|undefined,
    deviceId: string | undefined){
      const device = tracker.deviceId && (await tracker.get({key: DATA_KEY, scope: VariableScope.Device}));

    }

  public async patch(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker
  ) {
    events = await next(events);
    if (!tracker.sessionId) {
      return events;
    }

    let timestamp = now();
    events.forEach(
      (ev) => ev.timestamp! < timestamp && (timestamp = ev.timestamp!)
    );

    const device = await tracker.get
    let [serverSession, deviceSession, device] = await tracker.get(
      {
        key: DATA_KEY,
        scope: VariableScope.Session,
        initializer: () => ({
          classification: DataClassification.Indirect,
          value: createInitialSessionStats(timestamp),
        }),
      },
      tracker.deviceSessionId
        ? {
            key: DATA_KEY,
            scope: VariableScope.DeviceSession,
            initializer: () => ({
              classification: DataClassification.Indirect,
              value: createInitialSessionStats(timestamp),
            }),
          }
        : null,
      tracker.deviceId
        ? {
            key: DATA_KEY,
            scope: VariableScope.DeviceSession,
            initializer: () => ({
              classification: DataClassification.Indirect,
              value: createInitialDeviceStats(timestamp),
            }),
          }
        : null
    );

    const patched: TrackedEvent[] = [];

    for (const event of events) {
      patched.push(event);

      event.session = {
        sessionId: tracker.sessionId,
        timestamp: serverSession.,
        deviceId: tracker.deviceId,
        username: tracker.userId,
      };

      if (this._configuration.includeIp !== false) {
        event.session.ip = tracker.clientIp ?? undefined;
      }

      if (isConsentEvent(event)) {
        // TODO!
      }

      if (isUserAgentEvent(event)) {
        tracker.set();
      } else if (isViewEvent(event)) {
        serverSession = { ...serverSession, views: serverSession.views + 1 };
        device && (device = { ...device, views: device.views + 1 });
        deviceSession &&
          (deviceSession = { ...device, views: deviceSession.views + 1 });

        if (event.landingPage) {
          if (
            Date.now() - (tracker.deviceSession.lastSeen ?? 0) >
            this._configuration.deviceTimeout
          ) {
            await tracker.deviceSession.reset();
          } else {
            event.landingPage = false;
          }
        }
      } else if (isSignInEvent(event)) {
        const changed = tracker.userId && tracker.userId != event.username;
        if (changed) {
          await tracker.session.reset();
          await tracker.deviceSession.reset();
        }
        tracker.userId = event.session.username = event.username;
        if (changed) {
          patched.splice(
            -1,
            0,
            this._getSessionStartedEvent(tracker, event.timestamp)
          );
        }
      } else if (isSignOutEvent(event)) {
        event.username = tracker.userId;
        tracker.userId = undefined;
        await tracker.session.reset();
        patched.push(this._getSessionStartedEvent(tracker, event.timestamp));
      }
    }

    return patched;
  }

  private _getSessionStartedEvent(tracker: Tracker, timestamp = Date.now()) {
    const { session, deviceSession, device } = tracker;
    session.persisted = true;
    deviceSession.persisted = true;
    return cast<SessionStartedEvent>({
      type: "SESSION_STARTED",
      url: tracker.url,
      sessionNumber: device.sessions,
      timeSinceLastSession: session.previous
        ? session.started - session.previous
        : undefined,
      tags: tracker.env.tags,
      timestamp,
    });
  }
}

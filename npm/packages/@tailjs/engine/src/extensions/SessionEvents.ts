import {
  SessionStartedEvent,
  TrackedEvent,
  isConsentEvent,
  isSignInEvent,
  isSignOutEvent,
  isUserAgentEvent,
  isViewEvent,
  cast,
} from "@tailjs/types";
import { NextPatchExtension, Tracker, TrackerExtension } from "../shared";
import { QUERY_DEVICE } from "@constants";

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

export class SessionEvents implements TrackerExtension {
  private _configuration: Required<SessionConfiguration>;

  public readonly id = "session";

  constructor(configuration: SessionConfiguration = {}) {
    this._configuration = applyDefaults(configuration);
  }

  public async patch(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker
  ) {
    const session = tracker.session;
    if (!session) {
      return await next(events);
    }

    if (!session.persisted) {
      for (const event of events) {
        session.started = Math.min(
          event.timestamp ?? session.started,
          session.started
        );
      }
      tracker.vars[QUERY_DEVICE] = {
        scope: "session",
        essential: true,
        client: true,
        value: !tracker.vars[QUERY_DEVICE]?.value || session.isNew,
      };
      events.unshift(this._getSessionStartedEvent(tracker, session.started));
    }
    events = await next(events);

    const patched: TrackedEvent[] = [];

    for (const event of events) {
      patched.push(event);

      event.session = {
        sessionId: tracker.session.id,
        timestamp: tracker.session.started,
        deviceId: tracker.device.id,
        username: tracker._clientState.username,
      };

      if (this._configuration.includeIp !== false) {
        event.session.ip = tracker.clientIp ?? undefined;
      }

      if (isConsentEvent(event)) {
        tracker.consent = {
          active: event.nonEssentialTracking !== false,
          timestamp: event.timestamp,
        };
      }

      if (isUserAgentEvent(event)) {
        tracker.vars[QUERY_DEVICE] = {
          scope: "session",
          essential: true,
          client: true,
          value: false,
        };
      } else if (isViewEvent(event)) {
        ++tracker.session.views;
        ++tracker.device.views;
        ++tracker.deviceSession.views;
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
        const changed = tracker.userid && tracker.userid != event.username;
        if (changed) {
          await tracker.session.reset();
          await tracker.deviceSession.reset();
        }
        tracker.userid = event.session.username = event.username;
        if (changed) {
          patched.splice(
            -1,
            0,
            this._getSessionStartedEvent(tracker, event.timestamp)
          );
        }
      } else if (isSignOutEvent(event)) {
        event.username = tracker.userid;
        tracker.userid = undefined;
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

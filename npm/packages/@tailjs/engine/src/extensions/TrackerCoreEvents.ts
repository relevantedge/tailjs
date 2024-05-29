import {
  DeviceInfo,
  ScopeInfo,
  SessionInfo,
  SessionStartedEvent,
  SignInEvent,
  SignOutEvent,
  TrackedEvent,
  dataClassification,
  dataPurposes,
  isConsentEvent,
  isResetEvent,
  isSignInEvent,
  isSignOutEvent,
  isUserAgentEvent,
  isViewEvent,
} from "@tailjs/types";
import { now } from "@tailjs/util";
import { NextPatchExtension, Tracker, TrackerExtension } from "../shared";

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

export class TrackerCoreEvents implements TrackerExtension {
  public readonly id = "core_events";

  public async patch(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker
  ) {
    if (!tracker.session) {
      // Do nothing if there is no session. We do not want to start sessions on passive requests (only timing events).
      return [];
    }

    events = await next(events);

    if (!tracker.sessionId) {
      return events;
    }

    let timestamp = now();
    events.forEach(
      (ev) => ev.timestamp! < timestamp && (timestamp = ev.timestamp!)
    );

    // Apply updates via patches. This enables multiple requests for the same session to execute concurrently.

    let sessionPatches: ((current: SessionInfo) => void)[] = [];
    let devicePatches: ((current: DeviceInfo) => void)[] = [];

    const flushUpdates = async () => {
      [sessionPatches, devicePatches].forEach((patches) =>
        patches.unshift(
          (info: ScopeInfo) =>
            info.lastSeen < timestamp &&
            ((info.isNew = false), (info.lastSeen = timestamp))
        )
      );

      await tracker.set([
        {
          ...tracker._session!,
          patch: (current) => {
            if (!current) return;

            sessionPatches.forEach((patch) => patch(current.value));
            return current;
          },
        },
        tracker.device
          ? {
              ...tracker._device!,
              patch: (current) => {
                if (!current) return;

                devicePatches.forEach((patch) => patch(current.value));
                return current;
              },
            }
          : undefined,
      ]);
      sessionPatches = [];
      devicePatches = [];
    };

    const updatedEvents: TrackedEvent[] = [];

    for (let event of events) {
      if (isConsentEvent(event)) {
        await tracker.updateConsent(
          dataClassification.tryParse(event.consent.level),
          dataPurposes.tryParse(event.consent.purposes)
        );
      } else if (isResetEvent(event)) {
        if (tracker.session.userId) {
          // Fake a sign out event if the user is currently authenticated.
          events.push(event);
          event = {
            type: "sign_out",
            userId: tracker.authenticatedUserId,
            timestamp: event.timestamp,
          } as SignOutEvent;
        } else {
          // Start new session
          await flushUpdates();
          await tracker.reset(
            true,
            event.includeDevice,
            event.includeConsent,
            event.timestamp
          );
        }
      }

      updatedEvents.push(event);

      if (tracker.session.isNew) {
        updatedEvents.push({
          type: "session_started",
          url: tracker.url,
          sessionNumber: tracker.device?.sessions ?? 1,
          timeSinceLastSession: tracker.session.previousSession
            ? tracker.session.firstSeen - tracker.session.previousSession
            : undefined,
          tags: tracker.env.tags,
          timestamp,
        } as SessionStartedEvent);
      }

      event.session = {
        sessionId: tracker.sessionId,
        deviceSessionId: tracker.deviceSessionId,
        deviceId: tracker.deviceId,
        userId: tracker.authenticatedUserId,
        consent: {
          level: dataClassification.lookup(tracker.consent.level),
          purposes: dataPurposes.lookup(tracker.consent.purposes),
        },
        expiredDeviceSessionId: tracker._expiredDeviceSessionId,
        clientIp: tracker.clientIp ?? undefined,
      };

      if (isUserAgentEvent(event)) {
        sessionPatches.push((data) => (data.hasUserAgent = true));
      } else if (isViewEvent(event)) {
        sessionPatches.push(
          (data) => ++data.views,
          (data) =>
            event.tabNumber! > (data.tabs ??= 0) &&
            (data.tabs = event.tabNumber)
        );
        devicePatches.push((data) => ++data.views);
      } else if (isSignInEvent(event)) {
        const changed =
          tracker.authenticatedUserId &&
          tracker.authenticatedUserId != event.userId;

        if (
          changed &&
          (await tracker._requestHandler._validateLoginEvent(
            event.userId,
            event.evidence
          ))
        ) {
          event.session.userId = event.userId;
          sessionPatches.push(
            (data) => (data.userId = (event as SignInEvent).userId)
          );
        }
      } else if (isSignOutEvent(event)) {
        sessionPatches.push((data) => (data.userId = undefined));
      } else if (isConsentEvent(event)) {
        await tracker.updateConsent(
          event.consent.level,
          event.consent.purposes
        );
      }
    }

    await flushUpdates();

    return updatedEvents;
  }
}

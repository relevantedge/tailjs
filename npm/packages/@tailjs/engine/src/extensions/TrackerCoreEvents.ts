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
  public readonly id = "session";

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

    // Apply data updates to a copy of the scope data so the logic gets the updated values.
    let sessionInfo: SessionInfo;
    let deviceInfo: DeviceInfo | undefined;

    type ScopeDataPatch<T extends ScopeInfo> = (current: T) => void;

    let sessionDataUpdates: ScopeDataPatch<SessionInfo>[];
    let deviceDataUpdates: ScopeDataPatch<DeviceInfo>[];

    const updateSnapshot = () => {
      sessionDataUpdates = [];
      deviceDataUpdates = [];
      [sessionInfo, deviceInfo] = [
        tracker._session!.value,
        tracker._device?.value,
      ];
      updateData(false, (current) => (current.lastSeen = timestamp));
      updateData(true, (current) => (current.lastSeen = timestamp));
    };
    updateSnapshot();

    const updateData = <
      D extends boolean,
      T extends DeviceInfo | SessionInfo = D extends true
        ? DeviceInfo
        : SessionInfo
    >(
      device: D,
      patch: ScopeDataPatch<T>
    ) => {
      if (device && !deviceInfo) {
        return;
      }
      patch((device ? deviceInfo : sessionInfo) as T);
      (
        (device ? deviceDataUpdates : sessionDataUpdates) as ScopeDataPatch<T>[]
      ).push(patch);
    };

    const flushUpdates = async () => {
      await tracker.set(
        sessionDataUpdates.length
          ? {
              ...tracker._session!,
              patch: (current) => ({
                value:
                  current &&
                  sessionDataUpdates.reduce(
                    (data, update) => update(data),
                    current.value
                  ),
              }),
            }
          : undefined
      );
      updateSnapshot();
    };

    const updatedEvents: TrackedEvent[] = [];
    for (let event of events) {
      if (isConsentEvent(event)) {
        await tracker.updateConsent(
          dataClassification.tryParse(event.level),
          dataPurposes.tryParse(event.purposes)
        );
      }

      if (isResetEvent(event)) {
        if (tracker.session.userId) {
          // Fake a sign out event if the user is currently authenticated.
          events.push(event);
          event = {
            type: "sign_out",
            userId: tracker.authenticatedUserId,
            timestamp: event.timestamp,
          } as SignOutEvent;
        } else {
          await flushUpdates();
          await tracker.reset(
            true,
            event.includeDevice,
            event.includeConsent,
            event.timestamp
          );
          updateSnapshot();
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
        updateData(false, (data) => (data.hasUserAgent = true));
      } else if (isViewEvent(event)) {
        updateData(false, (data) => ++data.views);
        updateData(true, (data) => ++data.views);
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
          updateData(
            false,
            (data) => (data.userId = (event as SignInEvent).userId)
          );
        }
      } else if (isSignOutEvent(event)) {
        updateData(false, (data) => (data.userId = undefined));
      } else if (isConsentEvent(event)) {
        await tracker.updateConsent(event.level, event.purposes);
      }
    }

    await flushUpdates();

    return updatedEvents;
  }
}

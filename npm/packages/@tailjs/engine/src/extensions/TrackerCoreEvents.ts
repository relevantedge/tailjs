import { SCOPE_INFO_KEY } from "@constants";
import {
  DeviceInfo,
  ScopeInfo,
  Session,
  SessionInfo,
  SessionStartedEvent,
  SignInEvent,
  SignOutEvent,
  TrackedEvent,
  DataUsage,
  isConsentEvent,
  isResetEvent,
  isSignInEvent,
  isSignOutEvent,
  isUserAgentEvent,
  isViewEvent,
} from "@tailjs/types";
import { now } from "@tailjs/util";
import {
  NextPatchExtension,
  ParseResult,
  Tracker,
  TrackerExtension,
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

export class TrackerCoreEvents implements TrackerExtension {
  public readonly id = "core_events";

  public async patch(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker
  ) {
    if (!tracker.session || !tracker.sessionId) {
      // Abort the pipeline and do nothing if there is no session.
      return [];
    }

    let currentTime = now();

    const pipelineEvents: ParseResult[] = [];
    // Assign IDs and adjust timestamps.
    for (const event of events) {
      if (event.timestamp) {
        if (event.timestamp > 0) {
          pipelineEvents.push({
            error:
              "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
            source: event,
          });
          continue;
        }
        event.timestamp = currentTime + event.timestamp;
      } else {
        event.timestamp = currentTime;
      }

      event.id = await tracker.env.nextId();
      pipelineEvents.push(event);
    }

    // Finish the pipeline to get the final events.
    events = await next(events);

    for (const event of events) {
      event.timestamp! < currentTime && (currentTime = event.timestamp!);
    }

    // Apply updates via patches. This enables multiple requests for the same session to execute concurrently.

    let sessionPatches: ((current: SessionInfo) => void)[] = [];
    let devicePatches: ((current: DeviceInfo) => void)[] = [];

    const flushUpdates = async () => {
      [sessionPatches, devicePatches].forEach((patches) =>
        patches.unshift(
          (info: ScopeInfo) =>
            info.lastSeen < currentTime &&
            ((info.isNew = false), (info.lastSeen = currentTime))
        )
      );

      await tracker.set([
        {
          scope: "session",
          key: SCOPE_INFO_KEY,
          patch: (current: SessionInfo) => {
            if (!current) return;
            sessionPatches.forEach((patch) => patch(current));

            return current;
          },
        },
        tracker.device && {
          scope: "device",
          key: SCOPE_INFO_KEY,
          patch: (current: DeviceInfo) => {
            if (!current) return;

            devicePatches.forEach((patch) => patch(current));
            return current;
          },
        },
      ]);

      sessionPatches = [];
      devicePatches = [];
    };

    const updatedEvents: ParseResult[] = [];

    for (let event of events) {
      if (isConsentEvent(event)) {
        await tracker.updateConsent(event.consent);
      } else if (isResetEvent(event)) {
        const resetEvent = event;
        if (tracker.session.userId) {
          // Fake a sign out event if the user is currently authenticated.
          events.push(event);
          event = {
            type: "sign_out",
            userId: tracker.authenticatedUserId,
            timestamp: event.timestamp,
          } satisfies SignOutEvent as TrackedEvent;
        }
        // Start new session
        await flushUpdates();
        await tracker.reset({
          session: true,
          device: resetEvent.includeDevice,
          consent: resetEvent.includeConsent,
          referenceTimestamp: resetEvent.timestamp,
        });
      }

      const session: Session = {
        sessionId: tracker.sessionId,
        deviceSessionId: tracker.deviceSessionId,
        deviceId: tracker.deviceId,
        userId: tracker.authenticatedUserId,
        consent: DataUsage.clone(tracker.consent),
        expiredDeviceSessionId: tracker._expiredDeviceSessionId,
        clientIp: tracker.clientIp ?? undefined,
      };

      updatedEvents.push(event);

      if (tracker.session.isNew) {
        let isNewSession = true;
        await tracker.set({
          scope: "session",
          key: SCOPE_INFO_KEY,
          patch: (current: SessionInfo) => {
            // Make sure we only post the "session_started" event once.
            if (current?.isNew === true) {
              return { ...current, isNew: false };
            }
            isNewSession = false;
            return current; // No change.
          },
        });

        if (isNewSession) {
          updatedEvents.push({
            type: "session_started",
            url: tracker.url,
            sessionNumber: tracker.device?.sessions ?? 1,
            timeSinceLastSession: tracker.session.previousSession
              ? tracker.session.firstSeen - tracker.session.previousSession
              : undefined,
            session,
            tags: tracker.env.tags,
            timestamp: currentTime,
          } satisfies SessionStartedEvent as TrackedEvent);
        }
      }

      event.session = session;

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
        const changed = tracker.authenticatedUserId != event.userId;

        if (changed) {
          if (
            !(await tracker._requestHandler._validateSignInEvent(
              tracker,
              event
            ))
          ) {
            updatedEvents[updatedEvents.length - 1] = {
              error:
                "Sign-ins without evidence is only possible in a trusted context. To support sign-ins from the client API, you must register an extension that validates the sign-in event based on its provided evidence.",
              source: event,
            };
          }
          event.session.userId = event.userId;

          sessionPatches.push((data) => {
            data.userId = (event as SignInEvent).userId;
          });
        }
      } else if (isSignOutEvent(event)) {
        sessionPatches.push((data) => (data.userId = undefined));
      } else if (isConsentEvent(event)) {
        await tracker.updateConsent(event.consent);
      }
    }

    await flushUpdates();

    return updatedEvents;
  }
}

import { dataClassification, dataPurposes, isConsentEvent, isResetEvent, isSignInEvent, isSignOutEvent, isUserAgentEvent, isViewEvent, } from "@tailjs/types";
import { now } from "@tailjs/util";
const applyDefaults = (configuration) => {
    configuration.timeout ??= 30;
    configuration.deviceTimeout ??= 10;
    configuration.includeIp ??= true;
    return configuration;
};
export class TrackerCoreEvents {
    id = "session";
    constructor(configuration = {}) { }
    async patch(events, next, tracker) {
        events = await next(events);
        if (!tracker.sessionId) {
            return events;
        }
        let timestamp = now();
        events.forEach((ev) => ev.timestamp < timestamp && (timestamp = ev.timestamp));
        // Apply data updates to a copy of the scope data so the logic gets the updated values.
        let sessionData;
        let deviceData;
        let sessionDataUpdates;
        let deviceDataUpdates;
        const updateSnapshot = () => {
            sessionDataUpdates = [];
            deviceDataUpdates = [];
            [sessionData, deviceData] = [
                tracker._session.value,
                tracker._device?.value,
            ];
            updateData(false, (current) => (current.lastSeen = timestamp));
            updateData(true, (current) => (current.lastSeen = timestamp));
        };
        updateSnapshot();
        const updateData = (device, patch) => {
            if (device && !deviceData) {
                return;
            }
            patch((device ? deviceData : sessionData));
            (device ? deviceDataUpdates : sessionDataUpdates).push(patch);
        };
        const flushUpdates = async () => {
            await tracker.set([
                sessionDataUpdates.length
                    ? {
                        ...tracker._session,
                        patch: (current) => ({
                            value: current &&
                                sessionDataUpdates.reduce((data, update) => update(data), current.value),
                        }),
                    }
                    : undefined,
                tracker._device && deviceDataUpdates.length
                    ? {
                        ...tracker._device,
                        patch: (current) => ({
                            value: current &&
                                deviceDataUpdates.reduce((data, update) => update(data), current.value),
                        }),
                    }
                    : undefined,
            ]);
            updateSnapshot();
        };
        const updatedEvents = [];
        for (let event of events) {
            if (isConsentEvent(event)) {
                await tracker.updateConsent(dataClassification.tryParse(event.level), dataPurposes.tryParse(event.purposes));
            }
            if (isResetEvent(event)) {
                if (tracker.session.userId) {
                    // Fake a sign out event if the user is currently authenticated.
                    events.push(event);
                    event = {
                        type: "SIGN_OUT",
                        userId: tracker.authenticatedUserId,
                        timestamp: event.timestamp,
                    };
                }
                else {
                    await flushUpdates();
                    await tracker.reset(true, event.includeDevice, event.includeConsent, event.timestamp);
                    updateSnapshot();
                }
            }
            updatedEvents.push(event);
            if (tracker.session.isNew) {
                updatedEvents.push({
                    type: "SESSION_STARTED",
                    url: tracker.url,
                    sessionNumber: tracker.device?.sessions ?? 1,
                    timeSinceLastSession: tracker.session.previousSession
                        ? tracker.session.firstSeen - tracker.session.previousSession
                        : undefined,
                    tags: tracker.env.tags,
                    timestamp,
                });
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
            };
            if (isUserAgentEvent(event)) {
                updateData(false, (data) => (data.hasUserAgent = true));
            }
            else if (isViewEvent(event)) {
                updateData(false, (data) => ++data.views);
                updateData(true, (data) => ++data.views);
            }
            else if (isSignInEvent(event)) {
                const changed = tracker.authenticatedUserId &&
                    tracker.authenticatedUserId != event.userId;
                if (changed &&
                    (await tracker._requestHandler._validateLoginEvent(event.userId, event.evidence))) {
                    event.session.userId = event.userId;
                    updateData(false, (data) => (data.userId = event.userId));
                }
            }
            else if (isSignOutEvent(event)) {
                updateData(false, (data) => (data.userId = undefined));
            }
        }
        await flushUpdates();
        return updatedEvents;
    }
}
//# sourceMappingURL=TrackerCoreEvents.js.map
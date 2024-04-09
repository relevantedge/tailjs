import { Expired, F, MAX_SAFE_INTEGER, Reset, T, TAB_ID, any, clear, createChannel, debug, defer, del, delay, entries, formatDuration, getMinTabId, keys, listen, nil, now, openPromise, push, registerStartupHandler, size, splice, timeout, trackerConfig, tryAsync, values, window, } from ".";
// After this amount of ms it is assumed safe that all tabe have received a message sent from any other tab.
const MAX_MESSAGE_DELAY = 25;
const CLOSED_TAB_TIMEOUT = 500; // After this duration a closed tab is considered gone.
// This is used to keep track of open and closing tabs so we can evaluate which tabs has the smalles ID (was opened first).
// This tab must be the one comitting since it is the only one that is guaranteed to have seen all previous posts form other tabs.
// This approach can also be thought of as an efficient algorithm for "leader election" to prevent multiple tabs making HTTP requests at the same time.
// Interleaved HTTP requests must be avoided since it breaks the server state stored in the HTTP cookies.
//
// It cannot be prevented when all tabs are closing and an existing request has already been made to a slow server.
// In this case the client flags the request to let the server know the the state should not be updated with the final request.
// When this final race-condition occurs it is assumed _unlikely_ that the final request will contain other events than "VIEW_END" events (no "VIEW" events in particular),
// so the book-keeping made for session duration, number of views,  previous session etc. is equally _unlikely_ to get out of sync.
const knownTabs = {};
const actionHandlers = {};
let localData = {};
const flushLocalData = () => {
    const currentData = localData;
    localData = {};
    return currentData;
};
export const registerAction = (id, ...actionHandler) => {
    actionHandlers[id] = actionHandler;
    return [
        (...data) => size(data) &&
            (push((localData[id] ??= []), ...data),
                !closing &&
                    defer(() => size(localData) && channel([3 /* MessageType.Collect */, flushLocalData()]))),
        () => coordinateCommit(id),
    ];
};
const actionStates = {};
const getActionState = (id) => (actionStates[id] ??= [
    [],
    openPromise(trackerConfig.requestTimeout * 2)([T, 0]),
]);
const purgeClosedTabs = (timeout) => entries(knownTabs, ([key, value]) => value && Date.now() - value > timeout && del(knownTabs, key));
const getCoordinatorId = () => getMinTabId(TAB_ID, ...keys(knownTabs));
const isLastTab = () => !any(values(knownTabs), (closing) => !closing) &&
    getCoordinatorId() === TAB_ID;
const channel = createChannel("cs", {
    [1 /* MessageType.Loaded */]: ([sourceId, direct]) => {
        knownTabs[sourceId] ??= nil;
        !direct &&
            sourceId !== TAB_ID &&
            !closing &&
            channel([1 /* MessageType.Loaded */], sourceId);
    },
    [2 /* MessageType.Unloading */]([sourceId], freezing, data) {
        knownTabs[sourceId] = Date.now();
        entries(data, ([key, value]) => collect(key, value));
        if (!freezing) {
            keys(actionHandlers, (key) => isLastTab() && channel([5 /* MessageType.Commit */, key, TAB_ID, T]));
        }
    },
    [3 /* MessageType.Collect */](_, data) {
        entries(data, ([key, value]) => collect(key, value));
    },
    [4 /* MessageType.Coordinate */](_, actionId) {
        coordinateCommit(actionId);
    },
    [5 /* MessageType.Commit */](_, actionId, coordinator, critical) {
        const [collected, handle] = getActionState(actionId);
        const data = splice(collected, 0);
        TAB_ID === coordinator &&
            (async () => {
                const n = size(data);
                let success = !n ||
                    ((await tryAsync(actionHandlers[actionId]?.[0](data, critical))) ??
                        T);
                if (!success || n) {
                    debug(`The action handler for '${actionId}' ${success ? "completed sucessfully" : "rejected"}.`);
                }
                // The action did not succeed.
                // It will only return false if it got cancelled or the server definitely failed in a way where the events will not get duplicated if posted again.
                // Share the failed data with all tabs, instead of just keeping it locally, so it will get posted again even in the rare event where this tab got unloaded before the commit failed.
                !success &&
                    (channel([3 /* MessageType.Collect */, { [actionId]: data }]),
                        critical && debug("A critical request to commit got rejected."));
                handle([success, n]);
            })();
    },
    [6 /* MessageType.Activated */]: ([sourceId]) => (purgeClosedTabs(0), // At least one tab isn't closing. Purge the closed ones.
        updatePollingTab(sourceId)),
    [7 /* MessageType.Deactivated */]: () => updatePollingTab(nil),
}, T);
const collect = (actionId, data) => {
    return push(getActionState(actionId)[0], ...data);
};
let closing = T;
let initPromise = nil;
const init = async () => {
    await initPromise;
    if (closing === (closing = F)) {
        return;
    }
    initPromise = openPromise();
    try {
        clear(knownTabs);
        channel([1 /* MessageType.Loaded */]);
        // At this point we don't know how many tabs there are, if any. We need to wait a bit and see.
        await delay(50);
    }
    finally {
        initPromise(T);
    }
};
const terminate = async (freeze) => {
    if (closing === (closing = T)) {
        return;
    }
    values(actionHandlers, (handler) => handler[1]?.(T));
    channel([2 /* MessageType.Unloading */, freeze, flushLocalData()]);
    // We unloaded or froze. If we were the timeout leader (either coordinator or active) we need to tell the others that we deactivated.
    toggleActive(F);
};
const coordinateCommit = async (actionId) => {
    await initPromise;
    if (closing)
        return 0; // Don't initiate commit when closing.
    // If we are shutting down we will allow another tab shutting down to be elected as master. (Shutdown means all tabs are closed).
    const coordinator = getCoordinatorId();
    if (coordinator !== TAB_ID) {
        channel([4 /* MessageType.Coordinate */, actionId], coordinator);
        return 0;
    }
    const handle = getActionState(actionId)[1];
    const t0 = now(F);
    let result = await handle;
    handle(Reset);
    channel([5 /* MessageType.Commit */, actionId, TAB_ID, F]);
    result = await handle;
    debug(result === Expired
        ? `Commit timed out for '${actionId}.`
        : !result[0] ||
            (result[1] &&
                `${result[0] ? "Successfully comitted" : "Failed to commit"} ${result[1]} items for '${actionId}' after ${formatDuration(now(F) - t0)}`));
    return result[1];
};
// Timeout leader coordination
let safeTimeoutTimestamp = MAX_SAFE_INTEGER;
let selectedPollingTab = nil;
const updatePollingTab = (activeId) => (selectedPollingTab = activeId ??= getCoordinatorId()) === TAB_ID
    ? (safeTimeoutTimestamp = Math.min(safeTimeoutTimestamp, now() + MAX_MESSAGE_DELAY))
    : (safeTimeoutTimestamp = MAX_SAFE_INTEGER);
// Polling for responses / regularly posting events etc.  must happen from intervals /timeouts in all tabs,
// but only the one that is the "timeout leader" may execute the logic to avoid race conditions.
// The coordinator can always be reached via messages (they are not throttled), but the tab in control of polling should preferably be the one that has focus
// since background tabs are throttled.
export const isForegroundTab = () => initPromise?.() === T &&
    (purgeClosedTabs(CLOSED_TAB_TIMEOUT), now() > safeTimeoutTimestamp);
let active = F;
const toggleActive = (toggle) => active !== (active = toggle) && toggle
    ? channel([6 /* MessageType.Activated */])
    : !toggle &&
        TAB_ID === selectedPollingTab &&
        channel([7 /* MessageType.Deactivated */]);
registerStartupHandler(() => {
    listen(window, "pageshow", () => init());
    listen(document, "resume", () => init());
    init();
    listen(window, ["beforeunload", "pagehide"], () => terminate(F));
    listen(document, "freeze", () => terminate(T));
    // Background flush event buffer.
    timeout(() => isForegroundTab() && keys(actionHandlers, (key) => coordinateCommit(key)), -trackerConfig.postFrequency);
    listen(document, "visibilitychange", () => toggleActive(document.visibilityState === "visible"));
    listen(window, "focus", () => toggleActive(T));
    listen(window, "blur", () => toggleActive(F));
    toggleActive(document.visibilityState === "visible");
});
//# sourceMappingURL=coordinate-commits.js.map
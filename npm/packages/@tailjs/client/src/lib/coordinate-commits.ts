import {
  Expired,
  F,
  MAX_SAFE_INTEGER,
  OpenPromise,
  OpenPromiseWithTimeout,
  Reset,
  T,
  TAB_ID,
  TabId,
  any,
  clear,
  createChannel,
  debug,
  defer,
  del,
  delay,
  entries,
  formatDuration,
  getMinTabId,
  keys,
  listen,
  nil,
  now,
  openPromise,
  push,
  registerStartupHandler,
  size,
  splice,
  timeout,
  trackerConfig,
  tryAsync,
  values,
  window,
} from ".";

type Data = any;
type ActionId = string;

// After this amount of ms it is assumed safe that all tabe have received a message sent from any other tab.
const MAX_MESSAGE_DELAY = 25;
const CLOSED_TAB_TIMEOUT = 500; // After this duration a closed tab is considered gone.

export type CommitAction<Data = any> = (
  data: Data[],
  critical: boolean
) => Promise<boolean | void>;

export type ExitAction = (terminating: boolean) => void;

const enum MessageType {
  /**
   * Informs other tabs that a new tab loaded (either from bf cache or first load).
   * The other tabs will reply with the same message to the new tab so it will know about all current tabs.
   */
  Loaded = 1,

  /**
   * Informs other tabs that a tab is unloading (either to bf cache or for good).
   * When all tabs are unloading the last one will collect and commit their pending data.
   *
   */
  Unloading = 2,

  /**
   * Broadcasts events that were collected in the tab.
   */
  Collect = 3,

  /**
   * Instructs a tab to coordinate a commit. It will do so if it has the smallest known tab ID, otherwise it will forward the request
   * to the tab it thinks has the smallest ID.
   */
  Coordinate = 4,

  /**
   * Tabs will clear their collected data on this message. The tab that has the cooridnator ID will additionally commit it.
   */
  Commit = 5,

  /**
   * The tab received focus.
   */
  Activated = 6,

  /**
   * Tab lost focus.
   */
  Deactivated = 7,
}

export type ActionHandler = [commit: CommitAction, exit?: ExitAction];
type ActionState = [
  collected: Data[],
  commitHandle: OpenPromiseWithTimeout<[success: boolean, items: number]>
];

// This is used to keep track of open and closing tabs so we can evaluate which tabs has the smalles ID (was opened first).
// This tab must be the one comitting since it is the only one that is guaranteed to have seen all previous posts form other tabs.
// This approach can also be thought of as an efficient algorithm for "leader election" to prevent multiple tabs making HTTP requests at the same time.
// Interleaved HTTP requests must be avoided since it breaks the server state stored in the HTTP cookies.
//
// It cannot be prevented when all tabs are closing and an existing request has already been made to a slow server.
// In this case the client flags the request to let the server know the the state should not be updated with the final request.
// When this final race-condition occurs it is assumed _unlikely_ that the final request will contain other events than "VIEW_END" events (no "VIEW" events in particular),
// so the book-keeping made for session duration, number of views,  previous session etc. is equally _unlikely_ to get out of sync.
const knownTabs: Record<
  TabId,
  number | null // If closed, at timestamp for when it happened.
> = {};

const actionHandlers: Record<string, ActionHandler> = {};

let localData: Record<ActionId, Data[]> = {};

const flushLocalData = () => {
  const currentData = localData;
  localData = {};
  return currentData;
};
export const registerAction = <Data>(
  id: ActionId,
  ...actionHandler: ActionHandler
): [
  post: (...data: Data[]) => void,
  commit: (critical?: boolean) => Promise<number>
] => {
  actionHandlers[id] = actionHandler;
  return [
    (...data) =>
      size(data) &&
      (push((localData[id] ??= []), ...data),
      !closing &&
        defer(
          () =>
            size(localData) && channel([MessageType.Collect, flushLocalData()])
        )),
    () => coordinateCommit(id),
  ];
};

const actionStates: Record<TabId, ActionState> = {};
const getActionState = (id: ActionId): ActionState =>
  (actionStates[id] ??= [
    [],
    openPromise<[success: boolean, items: number]>(
      trackerConfig.requestTimeout * 2
    )([T, 0]),
  ]);

const purgeClosedTabs = (timeout: number) =>
  entries(
    knownTabs,
    ([key, value]) =>
      value && Date.now() - value > timeout && del(knownTabs, key)
  );

const getCoordinatorId = () => getMinTabId(TAB_ID, ...keys(knownTabs));

const isLastTab = () =>
  !any(values(knownTabs), (closing) => !closing) &&
  getCoordinatorId() === TAB_ID;

const channel = createChannel(
  "cs",
  {
    [MessageType.Loaded]: ([sourceId, direct]) => {
      knownTabs[sourceId] ??= nil;
      !direct &&
        sourceId !== TAB_ID &&
        !closing &&
        channel([MessageType.Loaded], sourceId);
    },
    [MessageType.Unloading](
      [sourceId],
      freezing: boolean,
      data: Record<string, any>
    ) {
      knownTabs[sourceId] = Date.now();
      entries(data, ([key, value]) => collect(key, value));
      if (!freezing) {
        keys(
          actionHandlers,
          (key) => isLastTab() && channel([MessageType.Commit, key, TAB_ID, T])
        );
      }
    },

    [MessageType.Collect](_, data: Record<ActionId, Data[]>) {
      entries(data, ([key, value]) => collect(key, value));
    },
    [MessageType.Coordinate](_, actionId: ActionId) {
      coordinateCommit(actionId);
    },
    [MessageType.Commit](
      _,
      actionId: ActionId,
      coordinator: TabId,
      critical: boolean
    ) {
      const [collected, handle] = getActionState(actionId);
      const data = splice(collected, 0);
      TAB_ID === coordinator &&
        (async () => {
          const n = size(data);
          let success =
            !n ||
            ((await tryAsync(actionHandlers[actionId]?.[0](data, critical))) ??
              T);

          if (!success || n) {
            debug(
              `The action handler for '${actionId}' ${
                success ? "completed sucessfully" : "rejected"
              }.`
            );
          }

          // The action did not succeed.
          // It will only return false if it got cancelled or the server definitely failed in a way where the events will not get duplicated if posted again.
          // Share the failed data with all tabs, instead of just keeping it locally, so it will get posted again even in the rare event where this tab got unloaded before the commit failed.
          !success &&
            (channel([MessageType.Collect, { [actionId]: data }]),
            critical && debug("A critical request to commit got rejected."));

          handle([success, n]);
        })();
    },
    [MessageType.Activated]: ([sourceId]) => (
      purgeClosedTabs(0), // At least one tab isn't closing. Purge the closed ones.
      updatePollingTab(sourceId)
    ),
    [MessageType.Deactivated]: () => updatePollingTab(nil),
  },
  T
);

const collect = (actionId: ActionId, data: Data[]) => {
  return push(getActionState(actionId)[0], ...data);
};

let closing = T;
let initPromise: OpenPromise | null = nil;
const init = async () => {
  await initPromise;
  if (closing === (closing = F)) {
    return;
  }
  initPromise = openPromise();
  try {
    clear(knownTabs);
    channel([MessageType.Loaded]);
    // At this point we don't know how many tabs there are, if any. We need to wait a bit and see.
    await delay(50);
  } finally {
    initPromise(T);
  }
};

const terminate = async (freeze: boolean) => {
  if (closing === (closing = T)) {
    return;
  }
  values(actionHandlers, (handler) => handler[1]?.(T));

  channel([MessageType.Unloading, freeze, flushLocalData()]);
  // We unloaded or froze. If we were the timeout leader (either coordinator or active) we need to tell the others that we deactivated.
  toggleActive(F);
};

const coordinateCommit = async (actionId: ActionId): Promise<number> => {
  await initPromise;
  if (closing) return 0; // Don't initiate commit when closing.

  // If we are shutting down we will allow another tab shutting down to be elected as master. (Shutdown means all tabs are closed).
  const coordinator = getCoordinatorId();
  if (coordinator !== TAB_ID) {
    channel([MessageType.Coordinate, actionId], coordinator);
    return 0;
  }

  const handle = getActionState(actionId)[1];
  const t0 = now(F);

  let result = await handle;
  handle(Reset);

  channel([MessageType.Commit, actionId, TAB_ID, F]);
  result = await handle;
  debug(
    result === Expired
      ? `Commit timed out for '${actionId}.`
      : !result[0] ||
          (result[1] &&
            `${result[0] ? "Successfully comitted" : "Failed to commit"} ${
              result[1]
            } items for '${actionId}' after ${formatDuration(now(F) - t0)}`)
  );

  return result[1];
};

// Timeout leader coordination

let safeTimeoutTimestamp: number = MAX_SAFE_INTEGER;
let selectedPollingTab: TabId | null = nil;

const updatePollingTab = (activeId: TabId | null) =>
  (selectedPollingTab = activeId ??= getCoordinatorId()) === TAB_ID
    ? (safeTimeoutTimestamp = Math.min(
        safeTimeoutTimestamp,
        now() + MAX_MESSAGE_DELAY
      ))
    : (safeTimeoutTimestamp = MAX_SAFE_INTEGER);

// Polling for responses / regularly posting events etc.  must happen from intervals /timeouts in all tabs,
// but only the one that is the "timeout leader" may execute the logic to avoid race conditions.
// The coordinator can always be reached via messages (they are not throttled), but the tab in control of polling should preferably be the one that has focus
// since background tabs are throttled.
export const isForegroundTab = () =>
  initPromise?.() === T &&
  (purgeClosedTabs(CLOSED_TAB_TIMEOUT), now() > safeTimeoutTimestamp);

let active = F;
const toggleActive = (toggle: boolean) =>
  active !== (active = toggle) && toggle
    ? channel([MessageType.Activated])
    : !toggle &&
      TAB_ID === selectedPollingTab &&
      channel([MessageType.Deactivated]);

registerStartupHandler(() => {
  listen(window, "pageshow", () => init());
  listen(document, "resume" as any, () => init());
  init();

  listen(window, ["beforeunload", "pagehide"], () => terminate(F));
  listen(document, "freeze" as any, () => terminate(T));

  // Background flush event buffer.
  timeout(
    () =>
      isForegroundTab() && keys(actionHandlers, (key) => coordinateCommit(key)),
    -trackerConfig.postFrequency
  );

  listen(document, "visibilitychange", () =>
    toggleActive(document.visibilityState === "visible")
  );
  listen(window, "focus", () => toggleActive(T));
  listen(window, "blur", () => toggleActive(F));
  toggleActive(document.visibilityState === "visible");
});

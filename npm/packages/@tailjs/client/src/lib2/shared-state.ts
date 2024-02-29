import { clear, clock, createEvent, forEach, now, assign } from "@tailjs/util";
import {
  TAB_HEARTBEAT,
  TAB_ID,
  addPageLoadedListener,
  subscribeChannel,
} from ".";

export type TabState = {
  id: string;
  hearbeat: number;
  viewId?: string;
  navigated?: number;
};

export type State = {
  knownTabs: Record<string, TabState>;
  variables: Record<string, any>;
};

const tabState: TabState = {
  id: TAB_ID,
  hearbeat: now(),
};

const state: State = {
  knownTabs: {
    [TAB_ID]: tabState,
  },
  variables: {},
};

type StateMessage =
  | { type: "query"; data?: undefined }
  | {
      type: "set";
      data: State;
    }
  | {
      type: "patch";
      data: State["variables"];
    }
  | {
      type: "tab";
      data?: TabState;
    };

const initTimeout = clock(() => dispatchState("ready", { state }), -25);
const stateChannel = subscribeChannel<StateMessage>(
  "state",
  (sender, { type, data }) => {
    if (type === "query") {
      !initTimeout.active &&
        stateChannel.post({ type: "set", data: state }, sender);
    } else if (type === "set" && initTimeout.active) {
      assign(state, data);
      initTimeout.trigger();
    } else if (type === "patch") {
      assign(state, data);
      dispatchState("update", { state, variables: data });
    } else if (type === "tab") {
      assign(state.knownTabs, sender, data);
      dispatchState("update", { state, tab: data });
    }
  }
);

const [addStateListener, dispatchState] = createEvent<
  [
    event: "ready" | "update",
    state: {
      state: State;
      variables?: State["variables"];
      tab?: TabState;
    }
  ]
>();

const heartbeat = clock(() => {
  const timeout = now() - TAB_HEARTBEAT * 2;
  forEach(
    state?.knownTabs,
    // Remove interval tabs.
    ([tabId, tabState]) =>
      tabState[0] < timeout && clear(state!.knownTabs, tabId)
  );
  tabState.hearbeat = now();
  stateChannel.post({ type: "tab", data: tabState });
}, TAB_HEARTBEAT);

const toggleTab = (loading: boolean) => {
  stateChannel.post({ type: "tab", data: loading ? tabState : undefined });
  if (loading) {
    initTimeout.restart();
    stateChannel.post({ type: "query" });
  } else {
    initTimeout.toggle(false);
  }
  heartbeat.toggle(loading);
};

addPageLoadedListener((loaded) => toggleTab(loaded), true);

export { addStateListener };

import { Variable } from "@tailjs/types";
import {
  assign,
  clear,
  clock,
  createEvent,
  forEach,
  map,
  now,
  obj,
} from "@tailjs/util";
import {
  HEARTBEAT_FREQUENCY,
  TAB_ID,
  addHeartBeatListener,
  addPageLoadedListener,
  subscribeChannel,
  toggleHearbeat,
  variableKeyToString,
} from ".";

export type TabState = {
  id: string;
  hearbeat: number;
  viewId?: string;
  navigated?: number;
};

export type StateVariable = Variable<any, true> & { timestamp: number };

export type State = {
  knownTabs: Record<string, TabState>;
  variables: Map<string, StateVariable>;
};

const tabState: TabState = {
  id: TAB_ID,
  hearbeat: now(),
};

const state: State = {
  knownTabs: {
    [TAB_ID]: tabState,
  },
  variables: new Map(),
};

type StateMessage =
  | { type: "query"; payload?: undefined }
  | {
      type: "set";
      payload: State;
    }
  | {
      type: "patch";
      payload: Record<string, StateVariable | undefined>;
    }
  | {
      type: "tab";
      payload: TabState | undefined;
    };

const [addStateListener, dispatchState] = createEvent<
  | [event: "ready", state: State]
  | [event: "tab", tab: TabState]
  | [
      event: "variables",
      updates: Record<string, StateVariable | undefined>,
      self: boolean
    ]
>();

const initTimeout = clock(() => dispatchState("ready", state), -25);
const stateChannel = subscribeChannel<StateMessage>(
  "state",
  (sender, { type, payload: data }) => {
    if (type === "query") {
      !initTimeout.active &&
        stateChannel.post({ type: "set", payload: state }, sender);
    } else if (type === "set" && initTimeout.active) {
      assign(state, data);
      initTimeout.trigger();
    } else if (type === "patch") {
      assign(state.variables, data);
      dispatchState("variables", data, false);
    } else if (type === "tab") {
      assign(state.knownTabs, sender, data);
      data && dispatchState("tab", data);
    }
  }
);

export const getStateVariables = (): Readonly<State["variables"]> =>
  state.variables;
export const updateVariableState = (
  updates: (Variable<any, true> | undefined)[] | undefined
) => {
  if (!updates?.length) return;
  const changes = obj(
    map(
      updates,
      (variable) =>
        variable && [
          variableKeyToString(variable),
          { ...variable, timestamp: now() },
        ]
    )
  );
  assign(state.variables, changes);

  dispatchState("variables", changes, true);

  stateChannel.post({ type: "patch", payload: changes });
};

const toggleTab = (loading: boolean) => {
  stateChannel.post({ type: "tab", payload: loading ? tabState : undefined });
  if (loading) {
    initTimeout.restart();
    stateChannel.post({ type: "query" });
  } else {
    initTimeout.toggle(false);
  }
  toggleHearbeat(loading);
};

addHeartBeatListener(() => {
  const timeout = now() - HEARTBEAT_FREQUENCY * 2;
  forEach(
    state?.knownTabs,
    // Remove tabs that no longer responds (presumably closed but may also have been frozen).
    ([tabId, tabState]) =>
      tabState[0] < timeout && clear(state!.knownTabs, tabId)
  );
  tabState.hearbeat = now();
  stateChannel.post({ type: "tab", payload: tabState });
});

addPageLoadedListener((loaded) => toggleTab(loaded), true);

export { addStateListener };

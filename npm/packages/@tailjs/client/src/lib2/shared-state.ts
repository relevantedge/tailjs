import {
  RestrictVariableTargets,
  Variable,
  VariableClassification,
  VariableResultStatus,
} from "@tailjs/types";
import {
  PickPartial,
  assign,
  clear,
  clock,
  createEvent,
  forEach,
  now,
  obj,
} from "@tailjs/util";
import {
  HEARTBEAT_FREQUENCY,
  LocalVariable,
  TAB_ID,
  addPageLoadedListener,
  subscribeChannel,
  variableKeyToString,
} from ".";

export type TabState = {
  id: string;
  heartbeat: number;
  viewId?: string;
  navigated?: number;
};

export type StateVariableSource =
  | (LocalVariable & {
      status: VariableResultStatus.Success | VariableResultStatus.Created;
    })
  | PickPartial<
      RestrictVariableTargets<
        Omit<Variable<any, true>, "value"> & {
          status: VariableResultStatus;
          value?: any;
        }
      >,
      keyof VariableClassification
    >;

export type StateVariable = StateVariableSource & {
  timestamp: number;
  expires: number;
};

export type State = {
  knownTabs: Record<string, TabState>;
  variables: Map<string, StateVariable>;
};

const tabState: TabState = {
  id: TAB_ID,
  heartbeat: now(),
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
  | [event: "ready", state: State, self: boolean]
  | [event: "tab", tab: TabState, self: boolean]
  | [
      event: "variables",
      updates: Record<string, StateVariable | undefined>,
      self: boolean
    ]
>();

const initTimeout = clock(() => dispatchState("ready", state, true), -25);
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
      data && dispatchState("tab", data, false);
    }
  }
);

export const getStateVariables = (): Readonly<State["variables"]> =>
  state.variables;

export const updateVariableState = (
  updates: (StateVariable | undefined)[] | undefined
) => {
  if (!updates?.length) return;
  const changes = obj(
    updates,
    (variable) => variable && [variableKeyToString(variable), variable]
  );
  assign(state.variables, changes);

  dispatchState("variables", changes, true);

  stateChannel.post({ type: "patch", payload: changes });
};

const heartbeat = clock({
  callback: () => {
    const timeout = now() - HEARTBEAT_FREQUENCY * 2;
    forEach(
      state?.knownTabs,
      // Remove tabs that no longer responds (presumably closed but may also have been frozen).
      ([tabId, tabState]) =>
        tabState[0] < timeout && clear(state!.knownTabs, tabId)
    );
    tabState.heartbeat = now();
    stateChannel.post({ type: "tab", payload: tabState });
  },
  frequency: HEARTBEAT_FREQUENCY,
  paused: true,
});

const toggleTab = (loading: boolean) => {
  stateChannel.post({ type: "tab", payload: loading ? tabState : undefined });
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

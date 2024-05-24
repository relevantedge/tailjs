import { CLIENT_STATE_CHANNEL_ID } from "@constants";
import { UUID, dataPurposes, sortVariables } from "@tailjs/types";
import {
  F,
  MaybeUndefined,
  Nullish,
  T,
  assign,
  clear,
  clock,
  concat,
  count,
  createEvent,
  filter,
  forEach,
  map,
  now,
  obj,
  replace,
  stickyTimeout,
} from "@tailjs/util";
import {
  ClientVariable,
  ClientVariableGetter,
  ClientVariableResults,
  GetterIntellisense,
  HEARTBEAT_FREQUENCY,
  LocalVariableScope,
  NOT_INITIALIZED,
  VARIABLE_CACHE_DURATION,
  addEncryptionNegotiatedListener,
  addPageLoadedListener,
  childGroups,
  debug,
  formatAnyVariableScope,
  listen,
  toNumericVariableEnums,
  variableKeyToString,
} from ".";

export interface TabState {
  id: string;
  heartbeat: number;
  viewId?: string;
}

interface StateVariableMetadata {
  timestamp: number;
  expires: number;
}

export type StateVariable = ClientVariable & StateVariableMetadata;

export interface State {
  knownTabs: Record<string, TabState>;
  /** All variables except local. */
  variables: Record<string, StateVariable>;
}

let localId = 0;

export let TAB_ID: string = undefined as any;
export const nextId = () => (TAB_ID ?? NOT_INITIALIZED()) + "_" + nextLocalId();
export const nextLocalId = () => ++localId;

const randomValues = (arg: any) => crypto.getRandomValues(arg);
export const uuidv4 = (): UUID =>
  replace(
    ([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11,
    /[018]/g,
    (c: any) => (
      (c *= 1),
      (c ^ (randomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    )
  );

/** All variables, both local and others. */
let tabVariables: Record<string, StateVariable> = {};

const tabState: TabState = {
  id: TAB_ID,
  heartbeat: now(),
};

const state: State = {
  knownTabs: {
    [TAB_ID]: tabState,
  },
  variables: {},
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
>();

const [addVariablesChangedListener, dispatchVariablesChanged] =
  createEvent<
    [
      changes: [current: StateVariable, previous: StateVariable | undefined][],
      all: Readonly<typeof tabVariables>,
      local: boolean
    ]
  >();

export { addVariablesChangedListener };

let post: (message: StateMessage, target?: string) => void = NOT_INITIALIZED;

export const tryGetVariable: {
  <K extends ClientVariableGetter>(key: K | GetterIntellisense[0]):
    | (ClientVariableResults<[K], true>[0] & StateVariableMetadata)
    | undefined;
  <K extends string | Nullish>(key: K): MaybeUndefined<K, StateVariable>;
} = (key: any) => tabVariables[variableKeyToString(key)!] as any;

export const setLocalVariables = (
  ...variables: ClientVariable<any, string, true, boolean>[]
) =>
  updateVariableState(
    (variables as StateVariable[]).map(
      (variable: StateVariable) => (
        (variable.timestamp = now()),
        (variable.expires = VARIABLE_CACHE_DURATION),
        toNumericVariableEnums(variable)
      )
    )
  );

const getVariableChanges = (variables: (StateVariable | undefined)[]) =>
  map(
    variables,
    (current) =>
      current && [current, tabVariables[variableKeyToString(current)]]
  );

export const updateVariableState = (
  updates: (StateVariable | undefined)[] | undefined
) => {
  const changes = map(
    updates,
    (variable) => variable && [variableKeyToString(variable), variable]
  );
  if (!changes?.length) return;

  // Collect now before updating the state, but dispatch after the state has changed.
  const changedEventData = getVariableChanges(updates!);

  assign(tabVariables, changes);
  const sharedChanges = filter(
    changes,
    (variable) => variable[1].scope > LocalVariableScope.Tab
  );

  if (sharedChanges.length) {
    assign(state.variables, sharedChanges);
    post({ type: "patch", payload: obj(sharedChanges) });
  }

  dispatchVariablesChanged(changedEventData, tabVariables, true);
};

addEncryptionNegotiatedListener((httpEncrypt, httpDecrypt) => {
  // Keep tab ID and variables between pages in the same tab.
  addPageLoadedListener((loaded) => {
    if (loaded) {
      const localState = httpDecrypt(
        sessionStorage.getItem(CLIENT_STATE_CHANNEL_ID)
      ) as [tabId: string, variables: StateVariable[]];
      sessionStorage.removeItem(CLIENT_STATE_CHANNEL_ID);

      TAB_ID =
        localState?.[0] ??
        now().toString(36) +
          Math.trunc(1296 * Math.random())
            .toString(36)
            .padStart(2, "0");

      tabVariables = obj(
        concat(
          // Whatever view variables we already had in case of bf navigation.
          filter(
            tabVariables,
            ([, variable]) => variable.scope === LocalVariableScope.View
          ),
          map(localState?.[1], (variable) => [
            variableKeyToString(variable),
            variable,
          ])
        )
      )!;
    } else {
      sessionStorage.setItem(
        CLIENT_STATE_CHANNEL_ID,
        httpEncrypt([
          TAB_ID,
          map(tabVariables, ([, variable]) =>
            variable.scope !== LocalVariableScope.View ? variable : undefined
          ),
        ])
      );
    }
  }, true);

  post = (message: StateMessage, target?: string) => {
    if (!httpEncrypt) return;
    localStorage.setItem(
      CLIENT_STATE_CHANNEL_ID,
      httpEncrypt([TAB_ID, message, target])
    );
    localStorage.removeItem(CLIENT_STATE_CHANNEL_ID);
  };

  listen(window, "storage", (ev) => {
    if (ev.key === CLIENT_STATE_CHANNEL_ID) {
      const message = httpDecrypt?.(ev.newValue) as [
        sender: string,
        message: StateMessage,
        target?: string
      ];
      if (!message || (message[2] && message[2] !== TAB_ID)) return;
      const [sender, { type, payload }] = message;

      if (type === "query") {
        !initTimeout.active && post({ type: "set", payload: state }, sender);
      } else if (type === "set" && initTimeout.active) {
        assign(state, payload);
        assign(tabVariables, payload.variables);
        initTimeout.trigger();
      } else if (type === "patch") {
        // Collect now before updating the state, but dispatch after the state has changed.
        const changedEventData = getVariableChanges(map(payload, 1));

        assign(state.variables, payload);
        assign(tabVariables, payload);

        dispatchVariablesChanged(changedEventData, tabVariables, false);
      } else if (type === "tab") {
        assign(state.knownTabs, sender, payload);
        payload && dispatchState("tab", payload, false);
      }
    }
  });

  const initTimeout = clock(() => dispatchState("ready", state, true), -25);

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
      post({ type: "tab", payload: tabState });
    },
    frequency: HEARTBEAT_FREQUENCY,
    paused: true,
  });

  const toggleTab = (loading: boolean) => {
    post({ type: "tab", payload: loading ? tabState : undefined });
    if (loading) {
      initTimeout.restart();
      post({ type: "query" });
    } else {
      initTimeout.toggle(false);
    }
    heartbeat.toggle(loading);
  };

  addPageLoadedListener((loaded) => toggleTab(loaded), true);
}, true);
export { addStateListener };

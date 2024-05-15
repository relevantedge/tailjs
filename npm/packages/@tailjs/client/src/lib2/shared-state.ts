import { UUID } from "@tailjs/types";
import {
  MaybeUndefined,
  Nullish,
  assign,
  clear,
  clock,
  concat,
  createEvent,
  filter,
  forEach,
  map,
  now,
  obj,
  replace,
} from "@tailjs/util";
import {
  ClientVariable,
  ClientVariableGetter,
  ClientVariableResults,
  GetterIntellisense,
  HEARTBEAT_FREQUENCY,
  LocalVariableScope,
  NOT_INITIALIZED,
  STATE_KEY,
  VARIABLE_CACHE_DURATION,
  addEncryptionNegotiatedListener,
  addPageLoadedListener,
  listen,
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
  variables: Map<string, StateVariable>;
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
let tabVariables: Map<string, StateVariable> = undefined as any;

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

let post: (message: StateMessage, target?: string) => void = NOT_INITIALIZED;

export const tryGetVariable: {
  <K extends ClientVariableGetter>(key: K | GetterIntellisense[0]):
    | (ClientVariableResults<[K], true>[0] & StateVariableMetadata)
    | undefined;
  <K extends string | Nullish>(key: K): MaybeUndefined<K, StateVariable>;
} = (key: any) => tabVariables.get(variableKeyToString(key)!) as any;

export const setLocalVariables = (
  ...variables: ClientVariable<any, string, true>[]
) =>
  updateVariableState(
    (variables as StateVariable[]).map(
      (variable: StateVariable) => (
        (variable.timestamp = now()),
        (variable.expires = VARIABLE_CACHE_DURATION),
        variable
      )
    )
  );

// export const getStateVariables = (): Readonly<State["variables"]> =>
//   tabVariables;

export const updateVariableState = (
  updates: (StateVariable | undefined)[] | undefined
) => {
  const changes = map(
    updates,
    (variable) => variable && [variableKeyToString(variable), variable]
  );
  if (!changes?.length) return;

  assign(tabVariables, changes);
  const sharedChanges = filter(
    changes,
    (variable) => variable[1].scope > LocalVariableScope.Tab
  );
  if (sharedChanges.length) {
    assign(state.variables, changes);
    post({ type: "patch", payload: obj(sharedChanges) });
  }
  dispatchState("variables", obj(changes), true);
};

addEncryptionNegotiatedListener((httpEncrypt, httpDecrypt) => {
  // Keep tab ID and variables between pages in the same tab.
  addPageLoadedListener((loaded) => {
    if (loaded) {
      const localState = httpDecrypt(sessionStorage.getItem(STATE_KEY)) as [
        tabId: string,
        variables: StateVariable[]
      ];

      TAB_ID =
        localState?.[0] ??
        now().toString(36) +
          Math.trunc(1296 * Math.random())
            .toString(36)
            .padStart(2, "0");

      tabVariables = new Map(
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
      );
      sessionStorage.removeItem(STATE_KEY);
    } else {
      sessionStorage.setItem(
        STATE_KEY,
        httpEncrypt([
          TAB_ID,
          filter(
            tabVariables,
            ([, variable]) => variable.scope !== LocalVariableScope.View
          ),
        ])
      );
    }
  }, true);

  post = (message: StateMessage, target?: string) => {
    if (!httpEncrypt) return;
    localStorage.setItem(STATE_KEY, httpEncrypt([TAB_ID, message, target]));
    localStorage.removeItem(STATE_KEY);
  };

  listen(window, "storage", (ev) => {
    if (ev.key === STATE_KEY) {
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
        initTimeout.trigger();
      } else if (type === "patch") {
        assign(state.variables, payload);
        assign(tabVariables, payload);
        dispatchState("variables", payload, false);
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

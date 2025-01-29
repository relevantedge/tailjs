import { CLIENT_STATE_CHANNEL_ID } from "@constants";

import { UuidV4, extractKey } from "@tailjs/types";
import {
  PartialRecord,
  assign2,
  clock,
  concat2,
  createEvent,
  filter2,
  forEach2,
  isString,
  map2,
  now,
  obj2,
  replace,
  set2,
  skip2,
} from "@tailjs/util";
import {
  HEARTBEAT_FREQUENCY,
  NOT_INITIALIZED,
  VARIABLE_CACHE_DURATION,
  addEncryptionNegotiatedListener,
  addPageLoadedListener,
  listen,
} from ".";
import {
  ClientVariable,
  ClientVariableKey,
  anyVariableScope,
  stringToVariableKey,
  variableKeyToString,
} from "..";

export interface TabState {
  id: string;
  heartbeat: number;
  viewId?: string;
}

export interface StateVariableMetadata {
  cache?: [timestamp: number, ttl?: number];
}

export type StateVariable<
  T extends {} = any,
  LocalScope extends boolean = boolean
> = ClientVariable<T, LocalScope> & StateVariableMetadata;

export type StateVariableEntry = [
  key: ClientVariableKey,
  variable: StateVariable | undefined
];

export interface State {
  knownTabs: Map<string, TabState>;
  /** All variables except local. */
  variables: Map<string, StateVariable>;
}

let localId = 0;

export let TAB_ID: string = undefined as any;
export const nextId = () => (TAB_ID ?? NOT_INITIALIZED()) + "_" + nextLocalId();
export const nextLocalId = () =>
  (now(true) - (parseInt(TAB_ID.slice(0, -2), 36) || 0)).toString(36) +
  "_" +
  (++localId).toString(36);

const randomValues = (arg: any) => crypto.getRandomValues(arg);
export const uuidv4 = (): UuidV4 =>
  replace(
    ([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11,
    /[018]/g,
    (c: any) => (
      (c *= 1),
      (c ^ (randomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    )
  );

/** All variables, both local and others. */
let tabVariables = new Map<string, StateVariable>();

const tabState: TabState = {
  id: TAB_ID,
  heartbeat: now(),
};

const state: State = {
  knownTabs: new Map([[TAB_ID, tabState]]),
  variables: new Map(),
};

type StateMessage =
  | { type: "query"; payload?: undefined }
  | {
      type: "set";
      payload: [
        knownTabs: [string, TabState][],
        variables: [string, StateVariable][]
      ];
    }
  | {
      type: "patch";
      payload: PartialRecord<string, StateVariable>;
    }
  | {
      type: "tab";
      payload: TabState | undefined;
    };

const [addStateListener, dispatchState] = createEvent<
  | [event: "ready", state: State, self: boolean]
  | [event: "tab", tab: TabState, self: boolean]
>();

export type StateVariableChange = readonly [
  key: ClientVariableKey,
  current: ClientVariable | undefined,
  previous: ClientVariable | undefined
];
const [addVariablesChangedListener, dispatchVariablesChanged] =
  createEvent<
    [
      changes: StateVariableChange[],
      all: ReadonlyMap<string, StateVariable>,
      local: boolean
    ]
  >();

export { addVariablesChangedListener };

let post: (message: StateMessage, target?: string) => void = NOT_INITIALIZED;

export const tryGetVariable = (
  key: ClientVariableKey | string,
  timestamp = now()
): StateVariable | undefined => {
  const variable = tabVariables.get(
    isString(key) ? key : variableKeyToString(key)
  );
  return variable?.cache && variable.cache[0]! + variable.cache[1]! <= timestamp
    ? undefined
    : variable;
};

export const setLocalVariables = (
  ...variables: Omit<
    ClientVariable<any, true>,
    "created" | "modified" | "version"
  >[]
) => {
  const timestamp = now();
  return updateVariableState(
    map2(variables, (variable) => {
      (variable as StateVariable).cache = [timestamp];
      return [
        extractKey(variable),
        { ...variable, created: timestamp, modified: timestamp, version: "0" },
      ];
    })
  );
};

const getVariableChanges = (
  variables: (StateVariableEntry | undefined)[] | undefined
): [
  key: string,
  current: StateVariable | undefined,
  previous: StateVariable | undefined,
  sourceKey: ClientVariableKey
][] =>
  map2(variables, (current) => {
    if (!current) return skip2;
    const key = variableKeyToString(current[0]);
    const previous = tabVariables.get(key);
    return previous !== current[1]
      ? [key, current[1], previous, current[0]]
      : skip2;
  }) ?? [];

export const updateVariableState = (
  updates: (StateVariableEntry | undefined)[] | undefined
) => {
  // Collect now before updating the state, but dispatch after the state has changed.
  const changes = getVariableChanges(updates);
  if (!changes?.length) return;

  const timestamp = now();
  forEach2(changes, ([, current, previous]) => {
    if (current && !current.cache) {
      current.cache = previous?.cache ?? [timestamp, VARIABLE_CACHE_DURATION];
    }
  });
  assign2(tabVariables, changes);

  const sharedChanges = filter2(
    changes,
    ([, , , key]) => anyVariableScope.compare(key.scope, "tab") > 0
  );

  if (sharedChanges.length) {
    post({ type: "patch", payload: obj2(sharedChanges) });
  }

  dispatchVariablesChanged(
    map2(changes, ([, current, previous, key]) => [key, current, previous]),
    tabVariables,
    true
  );
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
        now(true).toString(36) +
          Math.trunc(1296 * Math.random())
            .toString(36)
            .padStart(2, "0");

      tabVariables = new Map(
        concat2(
          filter2(tabVariables, ([, variable]) => variable?.scope === "view"),
          map2(localState?.[1], (variable) => [
            variableKeyToString(variable),
            variable,
          ])
        )
      );
    } else {
      sessionStorage.setItem(
        CLIENT_STATE_CHANNEL_ID,
        httpEncrypt([
          TAB_ID,
          map2(tabVariables, ([, variable]) =>
            variable && variable.scope !== "view" ? variable : skip2
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
        !initTimeout.active &&
          post(
            {
              type: "set",
              payload: [map2(state.knownTabs), map2(state.variables)],
            },
            sender
          );
      } else if (type === "set" && initTimeout.active) {
        state.knownTabs = new Map(payload[0]);
        state.variables = new Map(payload[1]);
        tabVariables = new Map(payload[1]);
        initTimeout.trigger();
      } else if (type === "patch") {
        // Collect now before updating the state, but dispatch after the state has changed.
        const changedEventData = getVariableChanges(
          map2(payload, ([key, value]) => [stringToVariableKey(key), value])
        );

        assign2(state.variables, payload);
        assign2(tabVariables, payload);

        dispatchVariablesChanged(
          map2(changedEventData, ([, current, previous, key]) => [
            key,
            current,
            previous,
          ]),
          tabVariables,
          false
        );
      } else if (type === "tab") {
        set2(state.knownTabs, sender, payload);
        payload && dispatchState("tab", payload, false);
      }
    }
  });

  const initTimeout = clock(() => dispatchState("ready", state, true), -25);

  const heartbeat = clock({
    callback: () => {
      const timeout = now() - HEARTBEAT_FREQUENCY * 2;
      forEach2(
        state.knownTabs,
        // Remove tabs that no longer responds (presumably closed but may also have been frozen).
        ([tabId, tabState]) =>
          tabState[0] < timeout && set2(state.knownTabs, tabId, undefined)
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

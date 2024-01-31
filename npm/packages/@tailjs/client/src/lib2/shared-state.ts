import { clear, forEach, set } from "@tailjs/util";
import {
  STATE_KEY,
  TAB_HEARTBEAT,
  TAB_ID,
  addPageListener,
  bindStorage,
  createEvent,
  now,
  clock,
  sharedStorage,
} from ".";

export type TabState = {
  hearbeat: number;
  view?: number;
  navigated?: number;
};

export type State = {
  knownTabs: Record<string, TabState>;
  variables: Record<string, any>;
};

const initialState: State = {
  knownTabs: {},
  variables: {},
};

const [addStateListener, dispatch] =
  createEvent<[event: "ready" | "update", state: State]>();

const storage = bindStorage<State>(STATE_KEY, sharedStorage);

const heartbeat = clock(() => toggleTab(true), TAB_HEARTBEAT);
let tabState: TabState = { hearbeat: now() };

const toggleTab = (loading: boolean) => {
  const deadline = now() - TAB_HEARTBEAT * 2;
  heartbeat.toggle(loading, true);

  return dispatch(
    "ready",
    storage.update((state) => {
      forEach(
        state?.knownTabs,
        // Remove interval tabs.
        ([tabId, tabState]) =>
          tabState[0] < deadline && clear(state!.knownTabs, tabId)
      );

      tabState.hearbeat = now();

      return (
        set(
          (state ??= initialState).knownTabs,
          TAB_ID,
          loading ? tabState : undefined
        ),
        state
      );
    })
  );
};

addPageListener((visible, loaded) => !loaded && toggleTab(visible));

export const updateTabState = (update: (tabState: TabState) => void) => (
  update(tabState), toggleTab(true)
);

export { addStateListener };

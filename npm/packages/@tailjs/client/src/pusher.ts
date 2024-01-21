import { isPureObject } from "@tailjs/util";
import { TAB_ID, bindStorage, listen, now } from "./lib2";

const enum TabState {
  Open = 1,
  Active = 2,
  Closed = 3,
}

type ChatMessage = {
  message?: string;
  tab?: TabState;
};

type TabData = {};

type State = {
  openTabs: Record<string, TabData>;
};

const state: State = {
  openTabs: { [TAB_ID]: {} },
};

const activeTabs = bindStorage<Record<string, number>>("active2");

export const attach = async () => {
  listen(
    window,
    "pageshow",
    () =>
      activeTabs.update(
        (current) => (
          ((current = isPureObject(current) ? current : {})[TAB_ID] = now()),
          current
        )
      )
    //activeStorage.update((current) => (current ?? 0) + 1)
  );
  listen(
    window,
    "pagehide",
    () =>
      activeTabs.update(
        (current) => (isPureObject(current) && delete current[TAB_ID], current)
      )
    // activeStorage.update((current: any) =>
    //   current > 0 ? current - 1 : current
    // )
  );
};

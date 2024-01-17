import { commandTest } from "./shared";

export type RefreshCommand = "refresh";
export const isRefreshCommand = commandTest<RefreshCommand>("refresh");

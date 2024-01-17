import { commandTest } from "./shared";

/**
 * Enables or disables tracking.
 */
export type ToggleCommand = {
  disable: boolean;
};
export const isToggleCommand = commandTest<ToggleCommand>("disable");

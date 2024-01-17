import { Content } from "@tailjs/types";
import { commandTest } from "./shared";

/**
 * Trigers a manual {@link ViewEvent} with the view context set to the specified value.
 */
export interface ViewCommand {
  view: Content | null;
}

export const isViewCommand = commandTest<ViewCommand>("view");

import { ExtendedTrackingBoundaryData } from "@tailjs/types";
import { CurrentView } from "../interfaces";
import { commandTest } from "./shared";

/**
 * Triggers a manual {@link ViewEvent} (or patches the current) with the view context set to the specified value.
 */
export interface ViewCommand {
  view: CurrentView | ExtendedTrackingBoundaryData["view"] | undefined;
}

export const isViewCommand = commandTest<ViewCommand>("view");

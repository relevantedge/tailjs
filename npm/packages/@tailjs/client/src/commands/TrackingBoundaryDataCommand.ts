import type { TrackingBoundaryData } from "@tailjs/types";

import { Nullish } from "@tailjs/util";
import { commandTest } from "./shared";

/**
 * Registers an element as the boundary for a component or similar tracking data. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
export type TrackingBoundaryDataCommand = {
  boundary: Element;
} & (
  | (TrackingBoundaryData & {
      /**
       * The content, tags and components will be added to the existing, if any.
       */
      add?: boolean;
    })
  | {
      update: (
        current?: TrackingBoundaryData<true>
      ) => TrackingBoundaryData | Nullish;
    }
);

export const isTrackingDataCommand =
  commandTest<TrackingBoundaryDataCommand>("boundary");

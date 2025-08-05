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
  | {
      /** Remove all boundary data from the element from all {@link layer}s. */
      clear: boolean;
      layer?: never;
    }
  | ({
      /**
       * Used to avoid conflicts between different logic that provides boundary data for the same element.
       * The default is that all exiting boundary data for the element gets replaced, but this key allows you
       * to only replace the data related to some specific logic.
       *
       * The different layers gets merged after each update.
       */
      layer?: string | symbol;
    } & (
      | (TrackingBoundaryData & { update?: never })
      | {
          update: (
            current?: TrackingBoundaryData<true>
          ) => TrackingBoundaryData | Nullish;
        }
    ))
);

export const isTrackingDataCommand =
  commandTest<TrackingBoundaryDataCommand>("boundary");

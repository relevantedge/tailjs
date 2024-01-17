import type { BoundaryData } from "@tailjs/client/external";
import { currentContext, mergeStates } from "./internal";

export type UseTrackingOptions = BoundaryData;

export function useTracking(
  update: (current: UseTrackingOptions | null) => UseTrackingOptions
): void;
export function useTracking(data: UseTrackingOptions): void;
export function useTracking(data: any) {
  if (currentContext) {
    currentContext.state = mergeStates(
      currentContext.state,
      typeof data === "function"
        ? data(currentContext.state)
        : { ...currentContext.state, ...data }
    );
  }
}

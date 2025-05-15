import type { BoundaryData } from "@tailjs/client/external";

export type UseTrackingOptions = BoundaryData;

export function useTracking(
  update: (current: UseTrackingOptions | null) => UseTrackingOptions
): void;
export function useTracking(data: UseTrackingOptions): void;
export function useTracking(data: any) {
  // TODO: Add a tracker component.
  console.warn(
    "The `useTracking` hook is currently not available due to the JSX visitor changes in v0.39.3. Use the `TrackerBoundary` component for now."
  );
  return;
  // if (currentContext) {
  //   currentContext.state = mergeStates(
  //     currentContext.state,
  //     typeof data === "function"
  //       ? data(currentContext.state)
  //       : { ...currentContext.state, ...data }
  //   );
  // }
}

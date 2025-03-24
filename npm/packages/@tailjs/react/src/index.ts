export type {
  TraversableElement,
  TraverseContext,
  TrackerScriptSettings,
} from "./internal";

import type { TrackerAttributes } from "@tailjs/client";
export * from "./rules";
export * from "./MapState";
export * from "./Tracker";
export * from "./useTracking";
export * from "./useTrackerVariable";
export * from "./useConsent";

export declare namespace React {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
}
declare module "react" {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
}

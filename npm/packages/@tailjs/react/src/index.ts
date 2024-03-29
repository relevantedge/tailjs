import type { TrackerAttributes } from "@tailjs/client";
export * from "./MapState";
export * from "./Tracker";
export * from "./useTracking";
export * from "./useConsent";
export type { TraversableElement, TraverseContext } from "./traverseNodes";
export * from "./trackingDom";
export * from "./trackingServerDom";
export * from "./useTrackerVariable";

export declare namespace React {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
}
declare module "react" {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
}

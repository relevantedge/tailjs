import type { TrackingBoundaryData } from "@tailjs/types";

import type { TrackerAttributes } from "@tailjs/client/external";
//@ts-ignore
import jsx from "@tailjs/react/jsx";

export type {
  StateMapperConfiguration,
  ElementStateMapper,
  ComponentType,
  ElementType,
  StateMapper,
  StateMapperResult,
  UpdateStateOptions,
} from "./shared";

export * from "./config";

export * from "./MapState";
export * from "./rules";
export * from "./Tracker";
export * from "./useConsent";
export * from "./useTrackerVariable";
export * from "./useTracking";

import type { TrackingBoundaryType } from "./jsx.pkg/TrackingBoundary";

import type { WithTrackingFunction } from "./jsx.pkg/visit";

import type { JsxConfiguration } from "./config";

let config: JsxConfiguration | undefined;

export const updateConfig: (
  update: (
    current: JsxConfiguration | undefined
  ) => JsxConfiguration | undefined
) => void = (update) => {
  config = update(config);
  (jsx.updateConfig as any)(() => config?.tracker);
};

export const TrackerBoundary: TrackingBoundaryType = jsx.TrackerBoundary;

export const withTracking: WithTrackingFunction = jsx.withTracking;

export declare namespace React {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
  interface Attributes {
    tailjs?: TrackingBoundaryData;
  }
}

declare module "react" {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
  interface Attributes {
    tailjs?: TrackingBoundaryData;
  }
}

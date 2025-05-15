import type { BoundaryData, TrackerAttributes } from "@tailjs/client/external";
//@ts-ignore
import jsx from "@tailjs/react/jsx";

export type {
  BoundaryDataWithView,
  StateMapperConfiguration,
} from "./jsx.pkg/visit";

export * from "./config";

export * from "./MapState";
export * from "./rules";
export * from "./Tracker";
export * from "./updateState";
export * from "./useConsent";
export * from "./useTrackerVariable";
export * from "./useTracking";

import type {
  TrackerBoundary as TrackerBoundaryComponent,
  WithTrackingFunction,
} from "./jsx.pkg/visit";

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

export const TrackerBoundary: typeof TrackerBoundaryComponent =
  jsx.TrackerBoundary;

export const withTracking: WithTrackingFunction = jsx.withTracking;

export declare namespace React {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
  interface Attributes {
    tailjs?: BoundaryData;
  }
}

declare module "react" {
  interface DOMAttributes<T> extends TrackerAttributes {}
  interface HTMLAttributes<T> extends TrackerAttributes {}
  interface Attributes {
    tailjs?: BoundaryData;
  }
}

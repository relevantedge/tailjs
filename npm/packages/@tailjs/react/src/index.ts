import React from "react";

import type {
  DataClassification,
  FormFieldTrackingLevel,
  TrackingBehavior,
  TrackingBoundaryData,
} from "@tailjs/types";

import type { TrackerAttributes } from "@tailjs/client/external";
export { tail } from "@tailjs/client/external";

//@ts-ignore
import jsx from "@tailjs/react/jsx";

export type {
  StateMapperConfiguration,
  ElementStateMapper,
  ComponentType,
  ElementType,
  StateMapper,
  StateMapperResult,
  StateMapperCollection,
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

export const isComponent: {
  ();
} = () => {};

export const updateConfig: (
  update: (
    current: JsxConfiguration | undefined
  ) => JsxConfiguration | undefined
) => void = (update) => {
  config = update(config);
  (jsx.updateConfig as any)(() => config?.tracker);
};

export const TrackingBoundary: TrackingBoundaryType = jsx.TrackingBoundary;

export const withTracking: WithTrackingFunction = jsx.withTracking;

export const tracking = (track: TrackingBehavior) => ({
  "data-tailjs": { track },
});
tracking.form = (
  values: FormFieldTrackingLevel,
  privacy?: DataClassification
) =>
  tracking(
    !values
      ? { forms: false }
      : { forms: true, formFields: { values, privacy } }
  );
tracking.field = (
  values: FormFieldTrackingLevel,
  privacy?: DataClassification
) => tracking({ formFields: { values, privacy } });

declare module "react" {
  interface DOMAttributes<T> extends TrackerAttributes {
    ["data-tailjs"]?: TrackingBoundaryData;
  }
  interface HTMLAttributes<T>
    extends TrackerAttributes,
      React.DOMAttributes<T> {
    ["data-tailjs"]?: TrackingBoundaryData;
  }
  interface Attributes {
    ["data-tailjs"]?: TrackingBoundaryData;
  }
}

import type { ProvisionalTracker } from "@tailjs/client/external";
import type { ExtendedTrackingBoundaryData } from "@tailjs/types";
import { Falsish } from "@tailjs/util";
import type { ComponentClass } from "react";

export type ComponentType = (
  | ComponentClass<any, any>
  | React.FunctionComponent<any>
) & { $$typeof?: any };

export type ElementType = string | ComponentType;

export type StateMapperResult =
  | ExtendedTrackingBoundaryData
  | StateMapperResult[]
  | Falsish;

export type UpdateStateOptions = {
  uniqueIds?: boolean;
  mergeExtensions?: (
    target: ExtendedTrackingBoundaryData,
    update: ExtendedTrackingBoundaryData
  ) => ExtendedTrackingBoundaryData;
};

export type StateMapper = (
  /** The result from the previous state mapper, when state mappers are chained in the configuration. */
  currentState: ExtendedTrackingBoundaryData | undefined,
  /** The type of the rendering component. */
  type: ComponentType,
  /** The properties of the rendering component.  */
  props: Record<string, any>
) => StateMapperResult;

export type StateMapperCollection =
  | Voidish
  | false
  | StateMapper
  | StateMapperCollection[];

export type StateMapperConfiguration =
  | StateMapperCollection
  | {
      state: StateMapperCollection;

      /**
       * Override the default behavior that maps the boundary data to tailjs commands.
       *
       * return `false` to suppress default behavior.
       */

      ref?: ElementStateMapper;
    };

export type ElementStateMapper = (
  tail: ProvisionalTracker,
  el: Element,
  data: ExtendedTrackingBoundaryData
) => void | boolean;

export interface JsxConfiguration {
  /**
   * The script to inject in the the page's `<head>` section.
   *
   * @default false
   */
  script?:
    | { src?: string; async?: boolean; attrs?: Record<string, any> }
    | false;

  /** Maps component types and properties to boundary data (views, components etc.) */
  map?: StateMapperConfiguration;

  disabled?: false;

  /**
   * Include React components with a `displayName` in tracking. Works well with something like `webpack-react-component-name`.
   *
   * @default true
   */
  trackJsx?: boolean | ((type: ComponentType) => string | Nullish);

  /** The key the tracker requires to accept commands (if configured on the tracker). */
  key?: string;
}

type Nullish = null | undefined;
type Voidish = void | Nullish;

export type ConfigUpdater = (
  update: (
    current: JsxConfiguration | undefined
  ) => JsxConfiguration | undefined
) => void;

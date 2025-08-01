import type { ProvisionalTracker } from "@tailjs/client/external";
import type {
  ExtendedTrackingBoundaryData,
  TrackingDataExtensionType,
} from "@tailjs/types";
import type { ComponentClass } from "react";

export type ComponentType = (
  | ComponentClass<any, any>
  | React.FunctionComponent<any>
) & { $$typeof?: any };

export type ElementType = string | ComponentType;

export type StateMapperResult<
  Extensions extends TrackingDataExtensionType = {}
> =
  | ExtendedTrackingBoundaryData<Extensions>
  | StateMapperResult<Extensions>[]
  | Voidish;

export type UpdateStateOptions<
  Extensions extends TrackingDataExtensionType = {}
> = {
  uniqueIds?: boolean;
  mergeExtensions?: (
    target: ExtendedTrackingBoundaryData<Extensions>,
    update: ExtendedTrackingBoundaryData<Extensions>
  ) => ExtendedTrackingBoundaryData<Extensions>;
};

export type StateMapper<Extensions extends TrackingDataExtensionType = {}> = (
  /** The result from the previous state mapper, when state mappers are chained in the configuration. */
  currentState: ExtendedTrackingBoundaryData<Extensions, true> | undefined,
  /** The type of the rendering component. */
  type: ComponentType,
  /** The properties of the rendering component.  */
  props: Record<string, any>
) => StateMapperResult<Extensions>;

export type StateMapperCollection<
  Extensions extends TrackingDataExtensionType = {}
> = Voidish | false | StateMapper<Extensions> | StateMapperCollection[];

export type StateMapperConfiguration<
  Extensions extends TrackingDataExtensionType = {}
> =
  | StateMapperCollection
  | {
      state: StateMapperCollection;

      /**
       * Override the default behavior that maps the boundary data to tailjs commands.
       *
       * return `false` to suppress default behavior.
       */

      ref?: ElementStateMapper<Extensions>;
    };

export type ElementStateMapper<
  CustomState extends TrackingDataExtensionType = {}
> = (
  tail: ProvisionalTracker,
  el: Element,
  data: ExtendedTrackingBoundaryData<TrackingDataExtensionType> | CustomState
) => void | boolean;

export interface JsxConfiguration<
  TrackingDataExtensions extends TrackingDataExtensionType = {}
> {
  /**
   * The script to inject in the the page's `<head>` section.
   *
   * @default false
   */
  script?:
    | { src?: string; async?: boolean; attrs?: Record<string, any> }
    | false;

  /** Maps component types and properties to boundary data (views, components etc.) */
  map?: StateMapperConfiguration<TrackingDataExtensions>;

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

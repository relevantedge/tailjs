import type {
  CartAction,
  CartEventData,
  ConfiguredComponent,
  Content,
  Tag,
  TrackingSettings,
} from "@tailjs/types";

import { commandTest } from "./shared";

export interface BoundaryData {
  /**
   * The component definition(s) associated with the boundary element.
   */
  component?: ConfiguredComponent | ConfiguredComponent[] | null;

  /**
   * The content definition(s) associated with the boundary element.
   */
  content?: Content | Content[] | null;

  /**
   * The name of the content area associated with the boundary element.
   *
   * A content area is used to indicate where activated components are used.
   */
  area?: string | null;

  /**
   *  These tags will be added to the components and content in user activations with the boundary element or any of its descendants.
   */
  tags?: Tag | Tag[] | null;

  /**
   * The element will include cart data when activated.
   */
  cart?: CartAction | CartEventData;

  /**
   * Settings that will apply to components contained by the boundary element including itself, similar to specifying "track-*" HMTL attributes on the element.
   */
  track?: TrackingSettings;
}

/**
 * Registers an element as the boundary for a component or similar tracking data. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
export type BoundaryCommand = {
  boundary: Element;
} & (
  | (BoundaryData & {
      /**
       * The content, tags and components will be added to the existing, if any.
       */
      add?: boolean;
    })
  | { update: (current?: BoundaryData) => BoundaryData | null }
);

// {
//   /**
//    * The component definition(s) associated with the boundary element.
//    */
//   component?: ConfiguredComponent | ConfiguredComponent[] | null;

//   /**
//    * The content definition(s) associated with the boundary element.
//    */
//   content?: Content | Content[] | null;

//   /**
//    * The name of the content area associated with the boundary element.
//    *
//    * A content area is used to indicate where activated components are used.
//    */
//   area?: string | string[] | null;

//   /**
//    *  These tags will be added to the components and content in user activations with the boundary element or any of its descendants.
//    */
//   tags?: Tag | Tag[] | null;

//   /**
//    * The element will include cart data when activated.
//    */
//   cart?: CartAction | CartEventData;

//   /**
//    * The element's component will be included in the stack even when the activation tracking level is `direct`.
//    */
//   promote?: boolean;

//   /**
//    * Specifies how the this command modifies the data associated with the boundary element.
//    *
//    * Only properties present in this command are affected (e.g. `component` or `content`) unless the action is `clear`.
//    *
//    * @default "add"
//    */
//   action?: "add" | "remove" | "clear";

//   /**
//    * The DOM element that gets this command's data associated.
//    */
//   boundary: Element;
// }

export const isDataBoundaryCommand = commandTest<BoundaryCommand>("boundary");

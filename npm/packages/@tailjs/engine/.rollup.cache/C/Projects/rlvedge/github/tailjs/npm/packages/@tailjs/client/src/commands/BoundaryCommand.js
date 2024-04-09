import { commandTest } from "./shared";
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
export const isDataBoundaryCommand = commandTest("boundary");
//# sourceMappingURL=BoundaryCommand.js.map
import type { ActivatedContent, Component, Rectangle } from ".";

/**
 * The component definition related to a user activation.
 */
export interface ActivatedComponent extends Component {
  /**
   * The activated content in the component.
   */
  content?: ActivatedContent[];

  /**
   * The size and position of the component when it was activated relative to the document top (not viewport).
   */
  rect?: Rectangle;

  /**
   * An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
   */
  area?: string;
}

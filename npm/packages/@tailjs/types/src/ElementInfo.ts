import { ActivatedComponent, Component, Rectangle } from ".";

/** Basic information about an HTML element. */
export interface ElementInfo {
  /** The tag name of the activated element.  */
  tagName?: string;

  /** The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image) */
  text?: string;

  /** The target of the link, if any.  */
  href?: string;

  rect?: Rectangle;
}

/** Basic information about an HTML element that is associated with a component. */
export interface ComponentElementInfo extends ElementInfo {
  component?: Component;
}

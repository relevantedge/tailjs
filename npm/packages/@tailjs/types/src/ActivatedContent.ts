import type { Content, Rectangle } from ".";

/**
 * The content definition related to a user activation.
 */
export interface ActivatedContent extends Content {
  /**
   * The current size and position of the element representing the content relative to the document top (not viewport).
   */
  rect?: Rectangle;
}

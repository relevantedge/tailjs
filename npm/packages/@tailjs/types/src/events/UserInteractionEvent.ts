import type {
  ActivatedComponent,
  ElementInfo,
  ScreenPosition,
  TrackedEvent,
  ViewTimingData,
  Viewport,
} from "..";

export interface UserInteractionEvent extends TrackedEvent {
  /**
   * Relevant components and content in the scope of the activated element.
   */
  components?: ActivatedComponent[];

  /** The time the event happened relative to the view were it was generated. */
  timeOffset?: ViewTimingData;

  /**
   * The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).
   */
  pos?: ScreenPosition;

  /**
   * The viewport of the user's browser when the event happened.
   */
  viewport?: Viewport;

  /**
   * An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
   */
  area?: string;

  /** Information about the activated element, if any. */
  element?: ElementInfo;
}

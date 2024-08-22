import { Domain, LocalID, TrackedEvent, UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

export interface NavigationEvent extends UserInteractionEvent {
  type: "navigation";
  /**
   * The ID of the navigation event. This will be added as {@link TrackedEvent.relatedEventId} to view event that followed after the navigation.
   */
  clientId: LocalID;

  /** The destination URL of the navigation */
  href: string;

  /** Indicates that the user went away from the site to an external URL. */
  exit?: boolean;

  /** The anchor specified in the href if any. */
  anchor?: string;

  /** Indicates that the navigation is to an external domain  */
  external?: boolean;

  /** The domain of the destination */
  domain?: Domain;

  /**
   * Whether the navigation happened in the current view or a new tab/window was opened.
   */
  self: boolean;
}

export const isNavigationEvent = typeTest<NavigationEvent>("navigation");

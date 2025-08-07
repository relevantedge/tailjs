import type {
  CartAction,
  CartEventData,
  DataClassification,
  FormFieldTrackingLevel,
  TrackingBehavior,
} from "@tailjs/types";
import { ParsableTags, TrackingBoundaryData } from "@tailjs/types";

/***
 * Attributes that can be added to HTML elements to extend tracking.
 * `track-tags`, `track-clicks` and `track-button` can also be set via css properties as `--track-tags`, `--track-button` and `--track-clicks` respectively.
 */
export interface TrackerAttributes {
  /**
   * The DOM element represents a layout area where components are inserted.
   */
  ["data-track-area"]?: TrackingBoundaryData["area"];

  /**
   * The DOM element represents a component
   */
  ["data-track-component"]?: string | TrackingBoundaryData["components"];

  /**
   * The DOM element represents a container for content.
   */
  ["data-track-content"]?: TrackingBoundaryData["content"];

  /**
   * These tags will be added to user activations with this DOM element or any of its descendants.
   */
  ["data-track-tags"]?: ParsableTags;

  /**
   * Track clicks on this DOM element as if it was a button (clicks are tracked by default for A and BUTTON elements).
   * If the `track-cart` attribute is present the element is already assumed to be a button.
   */
  ["data-track-button"]?: boolean | 0 | 1 | "";

  /**
   * An element with this attribute modifies the cart.
   * If not an object it is shorthand for the {@link CartCommandParameters.action} property where `true` or the empty string means `add`.
   */
  ["data-track-cart"]?: "" | true | CartAction | CartEventData;

  /**
   * Whether clicks are tracked or not.
   * This needs to be set to `true` on links and buttons rendered from server-side React components
   * if the tracker context should be included in the click events.
   */
  ["data-track-clicks"]?: boolean;

  /**
   * Corresponds to setting {@link TrackingBehavior.forms}.
   */
  ["data-track-form"]?: boolean;

  /**
   * Corresponds to setting {@link TrackingBehavior.formFields.values}.
   */
  ["data-track-field"]?: FormFieldTrackingLevel;

  /**
   * Corresponds to setting {@link TrackingBehavior.formFields.privacy}.
   */
  ["data-track-field-privacy"]?: DataClassification;
}

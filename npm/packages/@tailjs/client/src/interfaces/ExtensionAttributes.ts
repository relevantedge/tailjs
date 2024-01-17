import type {
  ActivationTracking,
  CartAction,
  CartEventData,
  Component,
  ConsentEvent,
  Content,
  FormEvent,
  View,
} from "@tailjs/types";
import { BoundaryData } from "../commands";

/***
 * Attributes that can be added to HTML elements to extend tracking.
 * `track-tags`, `track-clicks` and `track-button` can also be set via css properties as `--track-tags`, `--track-button` and `--track-clicks` respectively.
 */
export interface TrackerAttributes {
  /**
   * The DOM element represents a layout area where components are inserted.
   */
  ["track-area"]?: BoundaryData["area"];

  /**
   * The DOM element represents a component
   */
  ["track-component"]?: string | BoundaryData["component"];

  /**
   * The DOM element represents a container for content.
   */
  ["track-content"]?: BoundaryData["content"];

  /**
   * These tags will be added to user activations with this DOM element or any of its descendants.
   */
  ["track-tags"]?: string | string[];

  /**
   * Track clicks on this DOM element as if it was a button (clicks are tracked by default for A and BUTTON elements).
   * If the `track-cart` attribute is present the element is already assumed to be a button.
   */
  ["track-button"]?: boolean | 0 | 1 | "";

  /**
   *  element with this attribute modifies the cart.
   * If not an object it is shorthand for the {@link CartCommandParameters.action} property where `true` or the empty string means `add`.
   */
  ["track-cart"]?: "" | true | CartAction | CartEventData;

  /**
   * Defines how component clicks are tracked cf. {@link ActivationTracking}.
   */
  ["track-clicks"]?: ActivationTracking;

  /**
   * Used to indicate that the form field should be included in the {@link FormEvent} if the form is submitted.
   * It can be put on either each field individually or the entire form.
   *
   * Be careful NOT TO INADVERDENTLY TRACK PERSONAL DATA.
   * If you do it on purpose it may be perfectly fine depending on which backends you have connected.
   *
   * This attribute has no effect unless the user has consented via an {@link ConsentEvent}.
   */
  ["track-field"]?: boolean;

  /**
   * Corresponds to setting {@link TrackerAttributes["track-fields"]} on all fields. (Those with `track-fields` set to false will not be tracked).
   *
   */
  ["track-form"]?: boolean;

  /**
   * Defines the maximum amount of characters that will be sent when used in combination with {@link TrackerAttributes["track-fields"]} or {@link TrackerAttributes["track-form"]}.
   */
  ["track-max-length"]?: number;
}

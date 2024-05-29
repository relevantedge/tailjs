import { Duration, FormEvent, Integer } from ".";

/**
 * A form field value in a {@link FormEvent}.
 */
export interface FormField {
  id?: string;
  /** The name of the form field. */
  name: string;

  /** The label of the form field. */
  label?: string;

  /** The type of the input field. */
  type?: string;

  /**
   * If a user provided a value for the form field.
   *
   * For checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them).
   */
  filled?: boolean;

  /**
   * The number of times the field was changed after initially being filled.
   */
  corrections?: Integer;

  /**
   * How long the user was active in the field (field had focus on active tab).
   */
  activeTime?: Duration;

  /**
   * How long the user was in the field (including if the user left the tab and came back).
   */
  totalTime?: Duration;

  /**
   * The value of the form field. Be careful with this one, if you have connected a backend where you don't control the data.
   * This value will not be populated unless the user has consented.
   */
  value?: string;

  /**
   * This field's number in the order the form was filled.
   * A field is "filled" the first time the user types something in it.
   *
   * If a checkbox or pre-filled drop down is left unchanged it will not get assigned a number.
   */
  fillOrder?: Integer;

  /**
   * The field was the last one to be filled before the form was either submitted or abandoned.
   */
  lastField?: boolean;
}

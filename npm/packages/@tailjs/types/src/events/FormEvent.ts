import type { Duration, FormField, Timestamp, UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

export interface FormEvent extends UserInteractionEvent {
  type: "form";

  /**
   * The name of the form that was submitted.
   */
  name?: string;

  /**
   * Indicates whether the form was completed (that is, submitted).
   * If this is false it means that the form was abandoned.
   *
   * @default false
   */
  completed?: boolean;

  /**
   * The duration the user was actively filling the form.
   */
  activeTime?: Duration;

  /**
   * The total duration from the user started filling out the form until completion or abandoment..
   */
  totalTime?: Duration;

  /** All fields in the form (as detected). */
  fields?: Record<string, FormField>;

  /**
   * A correlation ID.
   * If a hidden input element has the name "_tailref", the HTML attribute "track-ref" or css variable "--track-ref: 1" its value will be used.
   * If all of the above is difficult to inject in the way the form is embedded,
   * the form element or any of its ancestors may alternatively have the HTML attribute "track-ref" with the name of the hidden input field that contains the reference.
   *
   * If no initial value a unique one will be assigned. Make sure to store the value in receiving end.
   */
  ref?: string;
}

export const isFormEvent = typeTest<FormEvent>("form");

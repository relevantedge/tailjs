import { commandTest } from "./shared";

export type FormCommandAction = "submit" | "validation-error";

/**
 * Use this command if you have custom validation logic or submit logic that does not get detected automatically by tail.js.
 * If no element reference is explicitly provided, the currently submitting form is assumed.
 *
 * This command is only valid while a form is submitting (the form's "submit" event has been triggered),
 * or a reference is specified for a form where the user has started filling it.
 */
export type FormCommand = {
  form: FormCommandAction;
  ref?: HTMLFormElement | { target: EventTarget };
};

export const isFormCommand = commandTest<FormCommand>("form");

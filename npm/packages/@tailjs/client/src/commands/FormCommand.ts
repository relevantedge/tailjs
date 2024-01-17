/**
 * Use this command if you have custom logic to "submit" a form that does not use
 * normal `<input type=submit>` or `<button type=submit>` buttons that submits the form in the normal HTML way.
 *
 * If you push this command from within a click handler for an element contained in the form (your custom "submit" button),
 * the library will automatically figure out which form it is.
 *
 * For very custom scenarios where the button is not in the form, or maybe not even a button,
 * you can add a reference to the form's HTML element in the {@link ref} property.
 *
 */
export type FormCommand = {
  form:
    | {
        ref?: HTMLFormElement;
        action?: "submit" | "abandon";
      }
    | "submit"
    | "abandon";
};

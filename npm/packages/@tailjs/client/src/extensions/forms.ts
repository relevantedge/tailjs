import { FormEvent, FormField, Timestamp, cast } from "@tailjs/types";
import type { Nullish } from "@tailjs/util";
import {
  TrackerExtensionFactory,
  addViewChangedListener,
  getComponentContext,
  getVisibleDuration,
  onFrame,
} from "..";
import {
  NodeWithParentElement,
  T,
  addTerminationListener,
  attr,
  document,
  entries,
  get,
  getOrSet,
  getRect,
  item,
  listen,
  map,
  nil,
  now,
  push,
  replace,
  scopeAttr,
  timeout,
  trackerFlag,
  trackerPropertyName,
  undefined,
  uuidv4,
} from "../lib";

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const enum FormFillState {
  None = 0,
  Submitted = 1,
  Pending = 2,
  Submitting = 3,
}

type FormState = [
  event: FormEvent,
  fields: WeakMap<Element, FormFieldState>,
  element: HTMLFormElement,
  fillState: FormFillState,
  started: Timestamp,
  nextFillOrder: number
];

const currentValue = Symbol();
type FormFieldState = FormField & {
  [currentValue]: string;
};

export const forms: TrackerExtensionFactory = {
  id: "forms",
  setup(tracker) {
    const formEvents = new Map<HTMLFormElement, FormState>();

    const getFormFieldValue = (element: any): string =>
      element.selectedOptions
        ? [...element.selectedOptions].map((option) => option.value).join(",")
        : element.type === "checkbox"
        ? element.checked
          ? "yes"
          : "no"
        : element.value;

    const getFormState = (
      el: FormElement
    ): [input: FormElement, state: FormState] | undefined => {
      const formElement = el.form;
      if (!formElement) return; // Don't care if we started with an element that didn't map to a field.

      const refName =
        scopeAttr(formElement, trackerPropertyName("ref")) || "track_ref";

      const parseElements = () => {
        map(
          formElement.querySelectorAll(
            "INPUT,SELECT,TEXTAREA"
          ) as NodeListOf<FormElement>,
          (el, i) => {
            if (!el.name || el.type === "hidden") {
              if (
                el.type === "hidden" &&
                (el.name === refName || trackerFlag(el, "ref"))
              ) {
                !el.value && (el.value = uuidv4());
                state[0].ref = el.value;
              }
              return;
            }

            const name = el.name;
            const field = (state[0].fields![name] ??= {
              id: el.id || name,
              name,
              label: replace(
                item(el.labels, 0)?.innerText ?? el.name,
                /^\s*(.*?)\s*\*?\s*$/g,
                "$1"
              ),
              activeTime: 0,
              type: el.type ?? "unknown",
              [currentValue as any]: getFormFieldValue(el),
            }) as FormFieldState;

            state[0].fields![field.name] = field;
            state[1].set(el, field);
          }
        );
      };

      let capturedContext: ReturnType<typeof getComponentContext>;

      const isFormVisible = () =>
        formElement.isConnected && getRect(formElement).width;

      const state = getOrSet(formEvents, formElement, () => {
        const fieldMap = new Map<Element, FormFieldState>();
        const ev: FormEvent = {
          type: "FORM",
          name:
            scopeAttr(formElement, trackerPropertyName("form-name")) ||
            attr(formElement, "name") ||
            formElement.id ||
            undefined,
          activeTime: 0,
          totalTime: 0,
          fields: {},
        };

        let state: FormState;
        const commitEvent = () => {
          handleLostFocus(); // focusout or change events may not be called when the user leaves the page while a field has focus.

          // If the form has disappeared it is heuristically assumed it was submitted successfully.
          state[3] >= FormFillState.Pending &&
            (ev.completed =
              state[3] === FormFillState.Submitting || !isFormVisible());
          push(
            tracker,
            cast<FormEvent>({
              ...capturedContext,
              ...ev,
              totalTime: now(T) - state[4],
            })
          );
          state[3] = FormFillState.Submitted;
        };

        addViewChangedListener(commitEvent);
        addTerminationListener(commitEvent);

        const commitTimeout = timeout();

        listen(formElement, "submit", () => {
          capturedContext = getComponentContext(formElement);
          state[3] = FormFillState.Submitting;

          commitTimeout(() => {
            // If the form disappears within 750 ms but no navigation happens it is assumed that it was "submitted" somehow, e.g. via AJAX.
            // This heurtistic may result in false positives if the user clicks submit, gets vaildation errors and then leaves the site instantly.
            //
            // If the server is aggressively slow to respond to a post and the for goes back into pending state,
            // it is undefined whether the submit happened or not, if the user leaves the site before the server responds.
            // In this case it will count as abandondment.

            if (formElement.isConnected && getRect(formElement).width > 0) {
              state[3] = FormFillState.Pending;
              commitTimeout();
            } else {
              commitEvent();
            }
          }, 750);
        });

        return (state = [
          ev,
          fieldMap,
          formElement,
          FormFillState.None,
          now(T),
          1,
        ]);
      });
      if (!get(state[1], el)) {
        // This will also be the case if a new field was added to the DOM.
        parseElements();
      }
      return [el!, state];
    };

    const getFieldInfo = (
      el: NodeWithParentElement,
      [formElement, state] = getFormState(el as any) ?? [],
      field = state?.[1].get(formElement as Element)
    ) => field && ([state![0], field, formElement!, state!] as const);

    let currentField: ReturnType<typeof getFieldInfo> | null = nil;
    const handleLostFocus = () => {
      if (!currentField) return;

      const [form, field, el, state] = currentField;
      const active = -(tv0 - (tv0 = getVisibleDuration()));
      const total = -(t0 - (t0 = now(T)));

      const previousValue = field[currentValue];
      const newValue = (field[currentValue] = getFormFieldValue(el));

      if (newValue !== previousValue) {
        field.fillOrder ??= state[5]++;
        if (field.filled) {
          field.corrections = (field.corrections ?? 0) + 1;
        }
        field.filled = T;

        state[3] = FormFillState.Pending;
        entries(
          form.fields!,
          ([name, value]) =>
            (value.lastField = name === field.name || undefined)
        );
      }

      field.activeTime! += active;
      field.totalTime! += total;
      form.activeTime! += active;
      currentField = nil;
    };

    let tv0 = 0;
    let t0 = 0;
    const wireFormFields = (document: Document | Nullish) => {
      document &&
        listen(
          document,
          ["focusin", "focusout", "change"],
          (ev, _, current = getFieldInfo(ev.target)) => {
            current &&
              ((currentField = current),
              ev.type === "focusin"
                ? ((t0 = now(T)), (tv0 = getVisibleDuration()))
                : handleLostFocus());
          }
        );
    };

    wireFormFields(document);
    onFrame((frame) => frame.contentDocument && wireFormFields);
  },
};
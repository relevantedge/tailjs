import { FormEvent, FormField, Timestamp } from "@tailjs/types";
import {
  T,
  ansi,
  createTimeout,
  ellipsis,
  forEach2,
  get2,
  nil,
  now,
  parseBoolean,
  replace,
  some2,
  tryCatch,
  type Nullish,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  getComponentContext,
  getViewTimeOffset,
  getVisibleDuration,
  onFrame,
} from "..";
import {
  NodeWithParentElement,
  addPageLoadedListener,
  attr,
  debug,
  getRect,
  isVisible,
  listen,
  scopeAttribute,
  trackerFlag,
  trackerPropertyName,
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

/** The time waited after a form submit event to test if it still there, which is assumed to indicate that there are validation errors. */
const VALIDATION_ERROR_TIMEOUT = 1750;

export const forms: TrackerExtensionFactory = {
  id: "forms",
  setup(tracker) {
    const formEvents = new Map<HTMLFormElement, FormState>();

    const getFormFieldValue = (element: any, tracked = false): string => {
      let include =
        !tracked || scopeAttribute(element, trackerPropertyName("form-value"));

      tracked &&
        (include = include
          ? parseBoolean(include)
          : element.type === "checkbox");

      let value = element.selectedOptions
        ? [...element.selectedOptions].map((option) => option.value).join(",")
        : element.type === "checkbox"
        ? element.checked
          ? "true"
          : "false"
        : element.value;

      if (tracked && value) {
        value = ellipsis(value, 200);
      }
      return include ? value : undefined;
    };

    const getFormState = (
      el: FormElement
    ): [input: FormElement, state: FormState] | undefined => {
      const formElement = el.form;
      if (!formElement) return; // Don't care if we started with an element that didn't map to a field.

      const refName =
        scopeAttribute(formElement, trackerPropertyName("ref")) || "track_ref";

      const parseElements = () => {
        forEach2(
          formElement.querySelectorAll(
            "INPUT,SELECT,TEXTAREA,BUTTON"
          ) as any as Iterable<FormElement>,
          (el, i) => {
            if (el.tagName === "BUTTON" && el.type !== "submit") {
              return;
            }
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
                el.labels?.[0]?.innerText ?? el.name,
                /^\s*(.*?)\s*\*?\s*$/g,
                "$1"
              ),
              activeTime: 0,
              totalTime: 0,
              type: el.type ?? "unknown",
              [currentValue as any]: getFormFieldValue(el),
              value: getFormFieldValue(el, true),
            }) as FormFieldState;

            state[0].fields![field.name] = field;
            state[1].set(el, field);
          }
        );
      };

      let capturedContext: ReturnType<typeof getComponentContext>;

      const isFormVisible = () =>
        formElement.isConnected && getRect(formElement).width;

      const state = get2(formEvents, formElement, () => {
        const fieldMap = new Map<Element, FormFieldState>();
        const ev: FormEvent = {
          type: "form",
          name:
            scopeAttribute(formElement, trackerPropertyName("form-name")) ||
            attr(formElement, "name") ||
            formElement.id ||
            undefined,
          activeTime: 0,
          totalTime: 0,
          fields: {},
        };

        tracker.events.post(ev);

        tracker.events.registerEventPatchSource(
          ev,
          () => ({ ...ev, timeOffset: getViewTimeOffset() } as any)
        );

        let state: FormState;
        const commitEvent = () => {
          if (state[3] === FormFillState.Submitted) {
            // The final form event has already been submitted.
            return;
          }
          handleLostFocus(); // focusout or change events may not be called when the user leaves the page while a field has focus.

          // If the form has disappeared it is heuristically assumed it was submitted successfully.
          if (state[3] >= FormFillState.Pending) {
            ev.completed =
              state[3] === FormFillState.Submitting || !isFormVisible();
          }

          tracker.events.postPatch(ev, {
            ...capturedContext,
            completed: ev.completed,
            totalTime: now(T) - state[4],
          });

          state[3] = FormFillState.Submitted;
        };

        const commitTimeout = createTimeout();

        const isReCaptchaActive = () => {
          let probeDoc: Document | undefined = formElement.ownerDocument;
          while (probeDoc) {
            if (
              some2(
                probeDoc.querySelectorAll("iframe"),
                (frame) =>
                  frame.src.match(
                    // reCAPTCHA challenge URLs are like `https://www.google.com/recaptcha/(something)/bframe?(something)`
                    // There may be other iframes with `recaptcha` in the URL, but that is typically the "badge" shown in some forms.
                    /https:\/\/www.google.com\/.*(?<=\/)recaptcha\/.*(?<=\/)bframe/gi
                  ) && isVisible(frame)
              )
            ) {
              return true;
            }

            // Walk up the frames. The dialog may have been injected into the main window.
            probeDoc = tryCatch(
              () => probeDoc!.defaultView?.frameElement?.ownerDocument,
              () => undefined
            );
          }
          return false;
        };

        listen(
          formElement.ownerDocument.body,
          "submit",
          (submitEvent) => {
            capturedContext = getComponentContext(formElement);
            state[3] = FormFillState.Submitting;

            if (submitEvent.defaultPrevented) {
              // Might be XHR. If so, the default would have been prevented.
              // However, we must wait and see if the form disappears, otherwise, it could also be validation errors.
              const [unbindNavigationListener] = addPageLoadedListener(
                (loaded) => {
                  if (loaded) return;

                  // If the browser navigates while waiting, this is also considered a submit.
                  if (recaptcha) {
                    debug(
                      `The browser is navigating to another page after submit leaving a reCAPTCHA challenge. ${ansi(
                        "Form not submitted",
                        1
                      )}`
                    );
                  } else if (state[3] === FormFillState.Submitting) {
                    debug(
                      `The browser is navigating to another page after submit. ${ansi(
                        "Form submitted",
                        1
                      )}`
                    );
                    commitEvent();
                  } else {
                    debug(
                      `The browser is navigating to another page after submit, but submit was earlier cancelled because of validation errors. ${ansi(
                        "Form not submitted.",
                        1
                      )}`
                    );
                  }
                  unbindNavigationListener();
                }
              );
              let recaptcha = false;
              commitTimeout(() => {
                if (isReCaptchaActive()) {
                  state[3] = FormFillState.Pending;
                  debug("reCAPTCHA challenge is active.");
                  recaptcha = true;
                  return true;
                }
                if (recaptcha) {
                  recaptcha = false;
                  debug("reCAPTCHA challenge ended (for better or worse).");
                  state[3] = FormFillState.Submitting;
                }
                if (formElement.isConnected && getRect(formElement).width > 0) {
                  state[3] = FormFillState.Pending;
                  debug(
                    `Form is still visible after ${VALIDATION_ERROR_TIMEOUT} ms, validation errors assumed. ${ansi(
                      "Form not submitted",
                      1
                    )}`
                  );
                  unbindNavigationListener();
                } else {
                  debug(
                    `Form is no longer visible ${VALIDATION_ERROR_TIMEOUT} ms after submit. ${ansi(
                      "Form submitted",
                      1
                    )}`
                  );
                  commitEvent();
                  unbindNavigationListener();
                }
              }, VALIDATION_ERROR_TIMEOUT);
              return;
            } else {
              debug(
                `Submit event triggered and default not prevented. ${ansi(
                  "Form submitted",
                  1
                )}`
              );
              commitEvent();
            }
          },
          { capture: false }
        );

        return (state = [
          ev,
          fieldMap,
          formElement,
          FormFillState.None,
          now(T),
          1,
        ]);
      });
      if (!state[1].get(el)) {
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
        forEach2(
          form.fields!,
          ([name, value]) => (value.lastField = name === field.name)
        );
      }
      field.value = getFormFieldValue(el, true);

      field.activeTime! += active;
      field.totalTime! += total;
      form.activeTime! += active;
      form.totalTime! += total;
      currentField = nil;
    };

    let tv0 = 0;
    let t0 = 0;
    const wireFormFields = (document: Document | Nullish) =>
      document &&
      listen(
        document,
        ["focusin", "focusout", "change"],
        (ev, _, current = ev.target && getFieldInfo(ev.target)) =>
          current &&
          ((currentField = current),
          ev.type === "focusin"
            ? ((t0 = now(T)), (tv0 = getVisibleDuration()))
            : handleLostFocus())
      );

    wireFormFields(document);
    onFrame(
      (frame) => frame.contentDocument && wireFormFields(frame.contentDocument),
      true
    );
  },
};

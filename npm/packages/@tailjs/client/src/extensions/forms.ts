import { FormEvent, FormField, Timestamp } from "@tailjs/types";
import {
  T,
  ansi,
  createTimeout,
  ellipsis,
  forEach,
  get,
  nil,
  now,
  parseBoolean,
  replace,
  some,
  tryCatch,
  type Nullish,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  getComponentContext,
  getViewTimeOffset,
  getVisibleDuration,
  isFormCommand,
  onFrame,
} from "..";
import {
  NodeWithParentElement,
  addPageLoadedListener,
  attr,
  debug,
  forAncestorsOrSelf,
  getRect,
  isVisible,
  listen,
  logError,
  scopeAttribute,
  tagName,
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

type FormSubmitState = {
  formElement: Element;
  cancel(explicit: boolean): boolean;
  complete(explicit: boolean): boolean;
};
type FormState = [
  event: FormEvent,
  fields: WeakMap<Element, FormFieldState>,
  element: HTMLFormElement,
  fillState: FormFillState,
  started: Timestamp,
  nextFillOrder: number,
  submit: (explicit?: boolean) => boolean,
  cancelSubmit: () => boolean
];

const currentValue = Symbol();
type FormFieldState = FormField & {
  [currentValue]: string;
};

const VALIDATION_POLL_INTERVAL = 1000;
/** The time waited after a form submit event to test if it still there, which is assumed to indicate that there are validation errors. */
const VALIDATION_ERROR_TIMEOUT = 8000;

export const forms: TrackerExtensionFactory = {
  id: "forms",
  setup(tracker) {
    const formEvents = new Map<HTMLFormElement, FormState>();

    const pendingFormSubmits: FormSubmitState[] = [];

    const getFormFieldValue = (element: any, tracked = false): string => {
      let include = true as any;
      //!tracked || scopeAttribute(element, trackerPropertyName("form-value"));

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
        forEach(
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

      const state = get(formEvents, formElement, () => {
        const fieldMap = new Map<Element, FormFieldState>();
        const ev: FormEvent = {
          type: "form",
          name:
            scopeAttribute(formElement, trackerPropertyName("form-name")) ||
            attr(formElement, "name") ||
            formElement.id ||
            undefined,
          ...getComponentContext(formElement, { eventType: "form" }),
          activeTime: 0,
          totalTime: 0,
          fields: {},
        };

        tracker.events.post(ev);

        tracker.events.registerEventPatchSource(
          ev,
          (previous) =>
            ({
              ...ev,
              ...getComponentContext(formElement, {
                eventType: "form",
                previous,
              }),
              timeOffset: getViewTimeOffset(),
            } as any)
        );

        let state: FormState;
        const commitEvent = (explicit = false) => {
          if (!explicit && state[3] === FormFillState.Submitted) {
            // The final form event has already been submitted.
            return false;
          }
          handleChange(); // focusout or change events may not be called when the user leaves the page while a field has focus.

          // If the form has disappeared it is heuristically assumed it was submitted successfully.
          if (state[3] >= FormFillState.Pending || explicit) {
            ev.completed =
              explicit ||
              state[3] === FormFillState.Submitting ||
              !isFormVisible();
          }

          tracker.events.postPatch(ev, {
            ...(capturedContext ??
              getComponentContext(formElement, {
                eventType: "form",
              })),
            completed: ev.completed,
            totalTime: now(T) - state[4],
          });
          capturedContext = undefined;

          state[3] = FormFillState.Submitted;
          return true;
        };

        const commitTimeout = createTimeout();

        const isReCaptchaActive = () => {
          let probeDoc: Document | undefined = formElement.ownerDocument;
          while (probeDoc) {
            if (
              some(
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

        let unbindNavigationListener: (() => void) | undefined;

        let pendingFormSubmit: (typeof pendingFormSubmits)[number] | null =
          null;

        listen(formElement.ownerDocument.body, "submit", (submitEvent) => {
          capturedContext = getComponentContext(formElement, {
            eventType: "form",
          });

          state[3] = FormFillState.Submitting;
          const clearPendingSubmit = () => {
            if (!pendingFormSubmit) {
              return false;
            }
            const index = pendingFormSubmits.indexOf(pendingFormSubmit);
            if (index > -1) {
              pendingFormSubmits.splice(index, 1);
            }
            pendingFormSubmit = null;
            unbindNavigationListener?.();
            commitTimeout(false);
            return true;
          };

          clearPendingSubmit();
          pendingFormSubmit = {
            formElement: formElement,
            cancel(explicit) {
              if (!clearPendingSubmit()) {
                return false;
              }
              state[3] = FormFillState.Pending;
              if (explicit) {
                debug(
                  `Form submit explicitly cancelled. ${ansi(
                    "Form not submitted",
                    1
                  )}`
                );
              }
              return true;
            },
            complete(explicit) {
              if (!clearPendingSubmit()) {
                return false;
              }

              if (explicit) {
                debug(
                  `Form explicitly submitted. ${ansi("Form submitted", 1)}`
                );
                if (state[3] === FormFillState.Pending) {
                  state[3] = FormFillState.Submitting;
                }
              }
              commitEvent();

              return true;
            },
          };

          pendingFormSubmits.push(pendingFormSubmit);

          // Add a short timeout make sure we get the correct value of event.defaultPrevent if we are not the last event handler.
          setTimeout(() => {
            if (submitEvent.defaultPrevented) {
              // Might be XHR. If so, the default would have been prevented.
              // However, we must wait and see if the form disappears, otherwise, it could also be validation errors.
              [unbindNavigationListener] = addPageLoadedListener((loaded) => {
                if (loaded) return;

                // If the browser navigates while waiting, this is also considered a submit.
                if (recaptcha) {
                  if (pendingFormSubmit?.cancel(false)) {
                    debug(
                      `The browser is navigating to another page after submit leaving a reCAPTCHA challenge. ${ansi(
                        "Form not submitted",
                        1
                      )}`
                    );
                  }
                } else if (state[3] === FormFillState.Submitting) {
                  if (pendingFormSubmit?.complete(false)) {
                    debug(
                      `The browser is navigating to another page after submit. ${ansi(
                        "Form submitted",
                        1
                      )}`
                    );
                  }
                } else if (state[3] !== FormFillState.Submitted) {
                  if (pendingFormSubmit?.cancel(false)) {
                    debug(
                      `The browser is navigating to another page after submit, but submit was cancelled earlier because of validation errors. ${ansi(
                        "Form not submitted.",
                        1
                      )}`
                    );
                  }
                }
              });

              let recaptcha = false;
              let started = now();
              commitTimeout(() => {
                const elapsed = now() - started;

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
                  if (elapsed >= VALIDATION_ERROR_TIMEOUT) {
                    //if (pendingFormSubmit?.cancel(false)) {
                    state[3] = FormFillState.Pending;
                    debug(
                      `Form is still visible after ${elapsed} ms, validation errors assumed. Logic for auto-detecting submit is suspended. ${ansi(
                        "Form not submitted",
                        1
                      )}`
                    );
                    return false;
                  }
                } else {
                  if (pendingFormSubmit?.complete(false)) {
                    debug(
                      `Form is no longer visible ${elapsed} ms after submit. ${ansi(
                        "Form submitted",
                        1
                      )}`
                    );
                  }
                }
                // Check again until elapsed < error timeout.
                return true;
              }, VALIDATION_POLL_INTERVAL);
              return;
            } else {
              if (pendingFormSubmit?.complete(false)) {
                debug(
                  `Submit event triggered and default not prevented. ${ansi(
                    "Form submitted",
                    1
                  )}`
                );
              }
            }
          }, 1);
        });

        return (state = [
          ev,
          fieldMap,
          formElement,
          FormFillState.None,
          now(T),
          1,
          commitEvent,
          () => pendingFormSubmit?.cancel(false) ?? false,
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
    const handleChange = () => {
      if (!currentField) return;

      const [form, field, el, state] = currentField;
      const active = -(tv0 - (tv0 = getVisibleDuration()));
      const total = -(t0 - (t0 = now(T)));

      const previousValue = field[currentValue];
      const newValue = (field[currentValue] = getFormFieldValue(el));

      if (newValue !== previousValue) {
        // If a submit is in progress, we cancel it.
        if (state[7]()) {
          debug(
            `Field got changed, assuming validation error correction. ${ansi(
              "Form not submitted",
              1
            )}`
          );
        }

        field.fillOrder ??= state[5]++;
        if (field.filled) {
          field.corrections = (field.corrections ?? 0) + 1;
        }
        field.filled = T;

        state[3] = FormFillState.Pending;
        forEach(
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
        (ev, _, current = ev.target && getFieldInfo(ev.target)) => {
          if (current) {
            currentField = current;
            if (ev.type === "focusin") {
              (t0 = now(T)), (tv0 = getVisibleDuration());
            } else {
              handleChange();
            }
          }
        }
      );

    wireFormFields(document);
    onFrame(
      (frame) => frame.contentDocument && wireFormFields(frame.contentDocument),
      true
    );

    return {
      processCommand: (command) => {
        if (isFormCommand(command)) {
          let { ref, form: action } = command;

          if (ref) {
            ref = forAncestorsOrSelf(
              typeof ref["nodeType"] === "number"
                ? (ref as HTMLElement)
                : (ref.target as HTMLElement),
              (el, r) => {
                tagName(el) === "FORM" && r(el as HTMLFormElement);
              }
            );
            if (!ref) {
              logError(
                command,
                "Neither the reference or its ancestors is a `<form>` element."
              );
              return true;
            }
          }

          const pendingFormSubmit = ref
            ? pendingFormSubmits.find((submit) => submit.formElement === ref)
            : pendingFormSubmits.pop();

          if (!pendingFormSubmit) {
            if (ref && action === "submit") {
              let manualSubmit = formEvents.get(ref as HTMLFormElement)?.[6];
              if (manualSubmit) {
                manualSubmit(true);
                return true;
              }
            }
            debug(
              `No pending submit for the form command '${command.form}'${
                ref ? " with the specified element reference" : ""
              }.`
            );
          } else if (action === "validation-error") {
            pendingFormSubmit.cancel(true);
          } else if (action === "submit") {
            pendingFormSubmit.complete(true);
          }
          return true;
        }
        return false;
      },
    };
  },
};

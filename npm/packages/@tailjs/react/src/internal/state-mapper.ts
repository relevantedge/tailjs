import { Nullish } from "@tailjs/util";

export type ApplyStateFunction<T> = (el: HTMLElement, state: T) => void;

type PendingEntry<T = any> = { apply: ApplyStateFunction<T>; state: T };

const scheduled = new Set<any>();
const pending: PendingEntry[] = [];
const processed: HTMLElement[] = [];

let observer: MutationObserver | undefined;
const STATE_PROPERTY = "data-pop";
//"data-" + Math.trunc(60466175 * Math.random()).toString(36); // 0 to zzzzz
if (typeof window !== "undefined") {
  let entryId: string | null;
  let entry: PendingEntry | undefined;
  observer = new MutationObserver((elements) => {
    for (const el of elements) {
      //console.log((el.target as HTMLElement).getAttribute(STATE_PROPERTY));
      if (
        (entryId = (el.target as HTMLElement).getAttribute(STATE_PROPERTY))
          ?.length &&
        (entry = pending[parseInt(entryId, 36)])
      ) {
        entry.apply(el.target as HTMLElement, entry.state);
        // console.log({ LEMAP: processed.length, n: pending.length });
        processed.push(el.target as HTMLElement);
        if (processed.length === pending.length) {
          observer!.disconnect();
          for (const el of processed) {
            // We remove the attribute after disconnecting the observer to avoid double parsing.
            el.removeAttribute(STATE_PROPERTY);
          }

          scheduled.clear();
          processed.length = pending.length = 0;
        }
      }
    }
  });
}

/**
 * Returns the property name and value for a React HTML element to associate
 * the specified state with the HTMLElement when rendered.
 *
 * This is an non-intrusive equivalent to using a React `ref`.
 * Unfortunately, we can't use that since wrapping the existing `ref` of e.g. `motion.div` elements
 * breaks Motion's internal logic (it must rely on keeping track of specific function references somehow).
 *
 */
export const scheduleStateMapping = <T>(
  el: any,
  state: T | Nullish,
  apply: (el: HTMLElement, state: T) => void,
  props: Record<string, any>
) => {
  if (!observer || !state || scheduled.has(el)) {
    return undefined;
  }
  if (!pending.length) {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributeFilter: [STATE_PROPERTY],
    });
  }
  // console.log(
  //   JSON.stringify({
  //     type: key.type,
  //     props: { ...key.props, children: undefined },
  //     state,
  //   })
  // );
  scheduled.add(el);
  props.suppressHydrationWarning = true;
  props[STATE_PROPERTY] = pending.length.toString(36);
  pending.push({ apply, state });
};

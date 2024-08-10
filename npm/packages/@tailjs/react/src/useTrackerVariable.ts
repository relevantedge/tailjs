import { ClientVariableKey, tail } from "@tailjs/client/external";
import { DataClassificationValue, DataPurposeValue } from "@tailjs/types";
import { useRef, useState } from "react";

export function useTrackerVariable<T = any>(
  key: ClientVariableKey,
  poll = true
) {
  let [, notifyChanged] = useState<T>();

  const state = (useRef<
    { polling?: boolean; current?: [any]; wired?: boolean } | undefined
  >().current ??= {});

  state.polling = poll;

  if (!state.wired) {
    let loadedSynchronously = true;
    tail({
      get: {
        ...(key as any),
        result: (current, _, poll) => {
          if (!state.current || current?.value !== state.current?.[0]) {
            state.current = [current?.value];
            // Don't update the state if we got the variable result instantly from cache or whatever.
            !loadedSynchronously && notifyChanged(state.current[0]);
          }
          if (state.polling) {
            return poll();
          } else {
            // This handler will be unbound, so we need to create a new one next time.
            state.wired = false;
          }
        },
      },
    });
    loadedSynchronously = false;
    state.wired = true;
  }
  return [
    state.current?.[0],
    (
      value: T,
      classification?: DataClassificationValue,
      purposes?: DataPurposeValue
    ) => tail({ set: { ...(key as any), value, classification, purposes } }),
  ] as const;
}

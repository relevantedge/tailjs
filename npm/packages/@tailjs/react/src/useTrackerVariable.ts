"use client";
import {
  ClientVariable,
  ClientVariableKey,
  GetCommand,
  tail,
} from "@tailjs/client/external";
import {
  formatVariableResult,
  isVariableResult,
  VariableResultStatus,
} from "@tailjs/types";
import { useRef, useState } from "react";

export function useTrackerVariable<T extends {} = any>(
  key: ClientVariableKey,
  poll = true
): [
  value: ClientVariable<T> | undefined,
  update: (value: T | undefined) => Promise<void>,
  refresh: () => Promise<ClientVariable<T> | undefined>
] {
  let [, notifyChanged] = useState<ClientVariable<T> | undefined>();

  const state = (useRef<
    { polling?: boolean; current?: [any]; wired?: boolean } | undefined
  >().current ??= {});

  state.polling = poll;

  if (!state.wired) {
    let loadedSynchronously = true;
    tail(<GetCommand>{
      get: {
        ...key,
        callback: (current) => {
          if (!state.current || current !== state.current?.[0]) {
            state.current = [current];
            // Don't update the state if we got the variable result instantly from cache or whatever.
            !loadedSynchronously && notifyChanged(state.current[0]);
          }
          if (state.polling) {
            return true;
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
    (value) => tail({ set: { ...(key as any), value } }),
    () => {
      let resolve: any, reject: any;
      const promise = new Promise<any>(
        (rs, rj) => ((resolve = rs), (reject = rj))
      );
      tail(<GetCommand>{
        get: {
          ...key,
          refresh: true,
          callback: (current) => {
            isVariableResult(current, false) // Cannot be status NotModified because refresh and no conditional cache headers.
              ? resolve(notifyChanged(current.value && current))
              : reject(formatVariableResult(current));
          },
        },
      });
      return promise;
    },
  ] as const;
}

"use client";
import {
  ClientVariable,
  ClientVariableKey,
  GetCommand,
  tail,
} from "@tailjs/client/external";
import { formatVariableResult, isVariableResult } from "@tailjs/types";
import { useEffect, useRef, useState } from "react";

export type TrackerVariablePollOptions =
  | boolean
  | { poll: boolean; refresh?: boolean };

export function useTrackerVariable<T extends {} = any>(
  key: ClientVariableKey,
  poll: TrackerVariablePollOptions = true
): [
  value: ClientVariable<T> | undefined,
  update: (value: T | undefined) => Promise<void>,
  refresh: () => Promise<ClientVariable<T> | undefined>
] {
  let [, notifyChanged] = useState<ClientVariable<T> | undefined>();

  const state = (useRef<
    { polling?: boolean; current?: [any]; wired?: boolean } | undefined
  >(null!).current ??= {});

  if (typeof poll === "boolean") {
    poll = { poll };
  }
  state.polling = poll.poll;

  useEffect(() => {
    if (!state.wired) {
      let loadedSynchronously = true;
      tail(<GetCommand>{
        get: {
          ...key,
          refresh: poll.refresh ?? false,
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
  }, [state.wired]);

  return [
    state.current?.[0],
    (value) =>
      new Promise((resolve) =>
        tail({ set: { ...(key as any), value, callback: () => resolve() } })
      ),
    () =>
      new Promise((resolve, reject) => {
        tail(<GetCommand>{
          get: {
            ...key,
            refresh: true,
            callback: (current) => {
              isVariableResult(current, false) // Cannot be status NotModified because refresh and no conditional cache headers.
                ? resolve(
                    (notifyChanged(current.value && current), current as any)
                  )
                : reject(Error(formatVariableResult(current)));
            },
          },
        });
      }),
  ] as const;
}

"use client";
import { tail } from "@tailjs/client/external";
import { UserConsent } from "@tailjs/types";
import { useRef, useState } from "react";

type ConsentPatcher = (current: UserConsent) => UserConsent;
const updateConsent = (consent: UserConsent, callback: () => void) =>
  tail({
    consent: {
      set: { consent, callback },
    },
  });
export function useConsent(): [
  value: UserConsent | undefined,
  update: (patch: ConsentPatcher) => Promise<void>,
  updating: boolean
] {
  let [{ consent, updating }, notifyChanged] = useState<{
    consent?: UserConsent;
    updating: boolean;
  }>({ consent: undefined, updating: false });

  const state = (useRef<
    | {
        current?: [any];
        wired?: boolean;
        updating: boolean;
        pendingPatch?: (consent: UserConsent) => void;
      }
    | undefined
  >().current ??= { updating: false });

  if (!state.wired) {
    tail({
      consent: {
        get: (consent) => {
          if (state.pendingPatch) {
            // We have a pending patch because consent has not yet been initialized.
            // Don't change the updating flag.
            state.pendingPatch(consent);
            state.pendingPatch = undefined;
          } else {
            notifyChanged({ consent, updating: false });
          }
          return true;
        },
      },
    });
    state.wired = true;
  }

  return [
    consent,
    (patch) =>
      new Promise((resolve) => {
        notifyChanged({ consent, updating: true });
        if (!consent) {
          state.pendingPatch = (consent) =>
            updateConsent(patch(consent), resolve);
        } else {
          updateConsent(patch(consent), resolve);
        }
      }),
    updating,
  ];
}

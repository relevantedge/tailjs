import { CONSENT_INFO_KEY } from "@constants";

import {
  ConsentEvent,
  DataPurposeName,
  DataPurposes,
  DataUsage,
  UserConsent,
  VariablePollCallback,
} from "@tailjs/types";
import { Clock, F, Nullish, T, clock, map2, restrict } from "@tailjs/util";
import {
  ConsentCommand,
  TrackerExtensionFactory,
  isUpdateConsentCommand,
} from "..";
import { debug, document, window } from "../lib";

export const consent: TrackerExtensionFactory = {
  id: "consent",
  setup(tracker) {
    const getCurrentConsent = async (
      callback?: VariablePollCallback<UserConsent>
    ) =>
      (await tracker.variables
        .get({
          scope: "session",
          key: CONSENT_INFO_KEY,
          poll: callback,
          refresh: true,
        })
        .value()) as UserConsent | undefined;

    const updateConsent = async <C extends UserConsent | Nullish>(
      consent: C
    ): Promise<
      C extends Nullish
        ? undefined
        : [updated: boolean, current: UserConsent | undefined]
    > => {
      if (!consent) return undefined as any;

      let current = await getCurrentConsent();

      if (!current || DataUsage.equals(current, consent)) {
        return [false, current] as any;
      }

      await tracker.events.post(
        restrict<ConsentEvent>({
          type: "consent",
          consent,
        }),
        {
          async: false,
          variables: {
            get: [{ scope: "session", key: CONSENT_INFO_KEY }],
          },
        }
      );
      return [true, consent] as any;
    };

    (() => {
      // TODO: Make injectable to support more than one.
      // Ideally, it could be injected in the init script from the request handler.
      // However, hooking into the main categories of Google's consent mode v2 should cover most cases.

      // Since the data layer is a capped buffer that may get rotated
      // we detect changes by keeping track of the last element in the array.
      // This also handles the situation where someone replaces the data layer.

      const GCMv2Mappings: Record<string, DataPurposeName> = {
        // Performance
        analytics_storage: "performance",
        // Functionality
        functionality_storage: "functionality",

        // This should be covered with normal "functionality".
        // No distinction between functionality and personalization in common cookie CMP, e.g. CookieBot.
        // Not sure why Google thinks this is a different, but tail.js can be configured to treat this purpose separately.
        //
        personalization_storage: "personalization",

        ad_storage: "marketing", // Targeting

        security_storage: "security", // Security
      };

      let dataLayerHead: any;
      tracker({
        consent: {
          externalSource: {
            key: "Google Consent Mode v2",
            frequency: 250,
            poll: () => {
              const layer = window["dataLayer"];
              const previousHead = dataLayerHead;
              let n: number = layer?.length;
              if (
                !n ||
                (dataLayerHead === (dataLayerHead = layer[n - 1]) &&
                  dataLayerHead) // Also check that the last item has a value, otherwise an empty element could trick us.
              ) {
                return;
              }

              let item: any;
              while (
                n-- &&
                ((item = layer[n]) !== previousHead || !previousHead) // Check all items if we have not captured the previous head.
              ) {
                const purposes: DataPurposes = {};
                let anonymous = true;
                // Read from the end of the buffer to see if there is any ["consent", "update", ...] entry
                // since last time we checked.
                if (item?.[0] === "consent" && item[1] === "update") {
                  map2(
                    GCMv2Mappings,
                    ([key, code]) =>
                      item[2][key] === "granted" &&
                      ((purposes[code] = true),
                      (anonymous &&=
                        // Security is considered "necessary" for some external purpose by tail.js
                        // and does not deactivate anonymous tracking by itself.
                        code === "security" || code === "necessary"))
                  );

                  return {
                    classification: anonymous ? "anonymous" : "indirect",
                    purposes,
                  };
                }
              }
            },
          },
        },
      } as ConsentCommand);
    })();

    const externalConsentSources: Record<string, Clock> = {};

    return {
      processCommand(command) {
        if (isUpdateConsentCommand(command)) {
          const getter = command.consent.get;
          if (getter) {
            getCurrentConsent(getter);
          }

          const setter = command.consent.set;
          setter &&
            (async () =>
              (setter.callback ?? (() => {}))(
                ...(await updateConsent(setter))
              ))();

          const externalSource = command.consent.externalSource;

          if (externalSource) {
            const key = externalSource.key;
            const poller = (externalConsentSources[key] ??= clock({
              frequency: externalSource.frequency ?? 1000,
            }));
            let previousConsent: DataUsage | undefined;

            const pollConsent = async () => {
              if (!document.hasFocus()) return;

              const newConsent = externalSource.poll(previousConsent);

              if (!newConsent) return;

              if (
                newConsent &&
                !DataUsage.equals(previousConsent, newConsent)
              ) {
                const [updated, current] = await updateConsent(newConsent);
                if (updated) {
                  debug(current, "Consent was updated from " + key);
                }
                previousConsent = newConsent;
              }
            };
            poller.restart(externalSource.frequency, pollConsent).trigger();
          }

          return T;
        }
        return F;
      },
    };
  },
};

import { CONSENT_INFO_KEY } from "@constants";

import {
  ConsentEvent,
  DataUsageAttributes,
  ParsableDataUsageAttributes,
  UserConsent,
  dataClassification,
  dataPurposes,
  dataUsageEquals,
  parseDataUsage,
} from "@tailjs/types";
import { Clock, F, Nullish, T, clock, map, restrict } from "@tailjs/util";
import {
  ConsentCommand,
  TrackerExtensionFactory,
  isUpdateConsentCommand,
} from "..";
import { debug, document, window } from "../lib";

export const consent: TrackerExtensionFactory = {
  id: "consent",
  setup(tracker) {
    const getCurrentConsent = async (result?: any) =>
      (await tracker.variables.get({
        scope: "session",
        key: CONSENT_INFO_KEY,
        result,
      }).value) as UserConsent | undefined;

    const updateConsent = async <
      C extends ParsableDataUsageAttributes | Nullish
    >(
      consent: C
    ): Promise<
      C extends Nullish
        ? undefined
        : [updated: boolean, current: UserConsent | undefined]
    > => {
      if (!consent) return undefined as any;

      let current = await getCurrentConsent();
      if (
        !current ||
        dataUsageEquals(current, (consent = parseDataUsage(consent) as any))
      ) {
        return [false, current] as any;
      }

      const userConsent = {
        level: dataClassification.lookup(consent!.classification)!,
        purposes: dataPurposes.lookup(consent!.purposes)!,
      };

      await tracker.events.post(
        restrict<ConsentEvent>({
          type: "consent",
          consent: userConsent,
        }),
        {
          async: false,
          variables: {
            get: [{ scope: "session", key: CONSENT_INFO_KEY }],
          },
        }
      );
      return [true, userConsent] as any;
    };

    (() => {
      // TODO: Make injectable to support more than one.
      // Ideally, it could be injected in the init script from the request handler.
      // However, hooking into the main categories of Google's consent mode v2 should cover most cases.

      // Since the data layer is a capped buffer that may get rotated
      // we detect changes by keeping track of the last element in the array.
      // This also handles the situation where someone replaces the data layer.

      const GCMv2Mappings = {
        // Performance
        analytics_storage: 4,
        // Functionality
        functionality_storage: 2,

        // This should be covered with normal "functionality".
        // No distinction between functionality and personalization in common cookie CMP, e.g. CookieBot.
        // Not sure why Google thinks this is a different.
        //
        // Tail.js ignores it for now instead of adding even more things to think about when categorizing data.
        personalization_storage: 0,

        ad_storage: 8, // Targeting

        security_storage: 16, // Security
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
              let purposes = 1;
              while (
                n-- &&
                ((item = layer[n]) !== previousHead || !previousHead) // Check all items if we have not captured the previous head.
              ) {
                // Read from the end of the buffer to see if there is any ["consent", "update", ...] entry
                // since last time we checked.
                if (item?.[0] === "consent" && item[1] === "update") {
                  map(
                    GCMv2Mappings,
                    ([key, code]) =>
                      item[2][key] === "granted" && (purposes |= code)
                  );

                  return {
                    classification:
                      purposes > 1
                        ? 1 // Indirect
                        : 0, // Anonymous (cookie-less)
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

          const setter = parseDataUsage(command.consent.set);
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
            let previousConsent: DataUsageAttributes | undefined;

            const pollConsent = async () => {
              if (!document.hasFocus()) return;

              const externalConsent = externalSource.poll();

              if (!externalConsent) return;

              const consent = parseDataUsage({
                ...previousConsent,
                ...externalConsent,
              });
              if (consent && !dataUsageEquals(previousConsent, consent)) {
                const [updated, current] = await updateConsent(consent);
                if (updated) {
                  debug(current, "Consent was updated from " + key);
                }
                previousConsent = consent;
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

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
import { Clock, F, Nullish, T, clock, restrict } from "@tailjs/util";
import {
  ConsentCommand,
  TrackerExtensionFactory,
  isUpdateConsentCommand,
} from "..";
import { debug, document } from "../lib";

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
      const result = await tracker.events.post(
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

    const externalSources: Record<string, Clock> = {};

    return {
      processCommand(command) {
        if (isUpdateConsentCommand(command)) {
          const getter = command.consent.get;
          if (getter) {
            getCurrentConsent(getter);
          }

          const setter = parseDataUsage(command.consent.set);
          setter &&
            (async () => setter.callback?.(...(await updateConsent(setter))))();

          const externalSource = command.consent.externalSource;
          if (externalSource) {
            const key = externalSource.key;
            const poller = (externalSources[key] ??= clock({
              frequency: externalSource.pollFrequency ?? 1000,
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
            poller.restart(externalSource.pollFrequency, pollConsent).trigger();
          }

          return T;
        }
        return F;
      },
    };
  },
};
(() => {
  // Map CookieBot to tail.js purposes.
  const purposeMappings = {
    necessary: 1,
    preferences: 2,
    statistics: 4,
    marketing: 8,
  };

  (window as any).tail({
    consent: {
      externalSource: {
        key: "Cookiebot",
        poll: () => {
          const consentCookie = document.cookie.match(
            /CookieConsent=([^;]*)/
          )?.[1];
          if (!consentCookie) return;

          let mappedPurpose = 1;
          consentCookie?.replace(
            /([a-z]+):(true|false)/g,
            (_, category, toggled) => (
              toggled === "true" &&
                (mappedPurpose |= purposeMappings[category] ?? 0),
              ""
            )
          );

          return {
            level:
              mappedPurpose > 1
                ? 1 /* Indirect (using cookies). */
                : 0 /* Anonymous (cookie-less). */,
            purposes: mappedPurpose,
          };
        },
      },
    },
  } as ConsentCommand);
})();

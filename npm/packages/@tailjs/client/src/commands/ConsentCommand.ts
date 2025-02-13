import { DataUsage, UserConsent, VariablePollCallback } from "@tailjs/types";
import { commandTest } from "./shared";
import { MaybePromiseLike } from "@tailjs/util";

export type ExternalConsentPoller = (
  current: DataUsage | undefined
) => DataUsage | undefined;

/** Return `true` if you want this callback invoked every time the consent changes, and not just once. */
export type ConsentCallback = (
  consent: UserConsent,
  previous: UserConsent | undefined
) => MaybePromiseLike<boolean | undefined | void>;

/** Gets or updates the user's consent. */
export interface ConsentCommand {
  consent: {
    get?: ConsentCallback;
    set?:
      | DataUsage
      | {
          consent: DataUsage;
          callback?: (
            updated: boolean,
            current: UserConsent | undefined
          ) => void;
        };
    /**
     * This can be used to poll the client's browser environment for something that translates into a tail.js consent.
     * The primary use case is to integrate with a CMP (e.g. Cookiebot).
     *
     * Please provide a unique key for the poll function to avoid unintended double polling if for some reason
     * the command is unintentionally submitted more than once.
     */
    externalSource?: {
      key: string;
      poll: ExternalConsentPoller;
      /** @default 1000 */
      frequency?: number;
    };
  };
}

export const isUpdateConsentCommand = commandTest<ConsentCommand>("consent");

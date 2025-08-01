import { UserConsent } from "@tailjs/types";
import { MaybePromiseLike } from "@tailjs/util";
import { commandTest } from "./shared";

export type ExternalConsentPoller = (
  current: UserConsent | undefined
) => UserConsent | undefined;

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
      | UserConsent
      | {
          consent: UserConsent;
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

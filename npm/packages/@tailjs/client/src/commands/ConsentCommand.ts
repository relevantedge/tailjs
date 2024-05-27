import { CONSENT_INFO_KEY } from "@constants";
import { ParsableDataUsageAttributes, UserConsent } from "@tailjs/types";
import { ClientVariableCallback } from "../lib";
import { commandTest } from "./shared";

export type ExternalConsentPoller = () =>
  | ParsableDataUsageAttributes
  | undefined;

/** Gets or updates the user's consent. */
export interface ConsentCommand {
  /**
   * If a function, it will be invoked as a callback with the users current consent preferences.
   * Otherwise it will update the user's consent with the values provided.
   */
  consent: {
    get?: (
      value: UserConsent | undefined,
      previous: UserConsent | undefined,
      poll: () => void
    ) => void;
    set?: ParsableDataUsageAttributes & {
      callback?: (updated: boolean, current: UserConsent | undefined) => void;
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
      pollFrequency?: number;
    };
  };
}

export const isUpdateConsentCommand = commandTest<ConsentCommand>("consent");

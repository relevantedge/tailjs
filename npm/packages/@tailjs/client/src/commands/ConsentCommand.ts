import { DataUsage, UserConsent, VariablePollCallback } from "@tailjs/types";
import { ClientVariableGetterCallback } from "../interfaces";
import { commandTest } from "./shared";

export type ExternalConsentPoller = (
  current: DataUsage | undefined
) => DataUsage | undefined;

/** Gets or updates the user's consent. */
export interface ConsentCommand {
  consent: {
    get?: VariablePollCallback<UserConsent>;
    set?: DataUsage & {
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
      frequency?: number;
    };
  };
}

export const isUpdateConsentCommand = commandTest<ConsentCommand>("consent");

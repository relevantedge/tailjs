import { Nullish } from "@tailjs/util";
import {
  RestrictVariableTargets,
  TrackedEvent,
  VariableGetResult,
  VariableSetResult,
} from "..";

export type PostVariableGetResult = RestrictVariableTargets<
  VariableGetResult,
  true
>;

export type PostVariableSetResult = Omit<
  RestrictVariableTargets<VariableSetResult, true>,
  "source"
>;

export interface PostResponse {
  /**
   * Results from variable operations.
   * The server may push variables to the client by including get results that the client has not requested.
   */
  variables?: {
    /** Results from get operations made via a {@link PostRequest} or variables the server wants to push. */
    get?: (PostVariableGetResult | undefined)[];

    /** Result from set operations made via a {@link PostRequest}. */
    set?: (
      | Omit<RestrictVariableTargets<VariableSetResult, true>, "source">
      | undefined
    )[];
  };

  /** Events to be routed to an external client-side tracker. */
  clientEvents?: TrackedEvent[];
}

export const isPostResponse = (response: any): response is PostResponse =>
  !!response?.variables;

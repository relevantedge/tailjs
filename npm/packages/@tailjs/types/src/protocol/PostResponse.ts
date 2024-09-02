import {
  TrackedEvent,
  VariableGetResult,
  VariableSetResult,
  WithScopeDefaults,
} from "..";

export interface PostResponse {
  /**
   * Results from variable operations.
   * The server may push variables to the client by including get results that the client has not requested.
   */
  variables?: {
    /** Results from get operations made via a {@link PostRequest} or variables the server wants to push. */
    get?: (WithScopeDefaults<VariableGetResult> | undefined)[];

    /** Result from set operations made via a {@link PostRequest}. */
    set?: (WithScopeDefaults<VariableSetResult> | undefined)[];
  };

  /** Events to be routed to an external client-side tracker. */
  clientEvents?: TrackedEvent[];
}

export const isPostResponse = (response: any): response is PostResponse =>
  !!response?.variables;

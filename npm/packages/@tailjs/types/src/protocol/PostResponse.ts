import {
  VariableResultPromiseResult,
  ServerScoped,
  TrackedEvent,
  VariableGetResult,
  VariableSetResult,
} from "..";

export type VariableGetResponse<Scoped extends boolean = true> = ServerScoped<
  VariableGetResult & {
    /**
     * Callbacks polling for changes to this variable will not get notified when this flag is set.
     */
    passive?: boolean;
  },
  Scoped
>;

export type VariableSetResponse<Scoped extends boolean = true> = ServerScoped<
  VariableSetResult,
  Scoped
>;

export interface PostResponse<Scoped extends boolean = true> {
  /**
   * Results from variable operations.
   * The server may push variables to the client by including get results that the client has not requested.
   */
  variables?: {
    /** Results from get operations made via a {@link PostRequest} or variables the server wants to push. */
    get?: (
      | ServerScoped<
          VariableResultPromiseResult<"get", VariableGetResult>,
          Scoped
        >
      | undefined
    )[];

    /** Result from set operations made via a {@link PostRequest}. */
    set?: (
      | ServerScoped<
          VariableResultPromiseResult<"set", VariableSetResult>,
          Scoped
        >
      | undefined
    )[];
  };

  /** Events to be routed to an external client-side tracker. */
  clientEvents?: TrackedEvent[];
}

export const isPostResponse = (response: any): response is PostResponse =>
  !!response?.variables;

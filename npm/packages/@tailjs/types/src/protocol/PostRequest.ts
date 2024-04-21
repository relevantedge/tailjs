import { Nullish } from "@tailjs/util";
import {
  RestrictVariableTargets,
  StripPatchFunctions,
  TrackedEvent,
  VariableGetter,
  VariableSetter,
} from "..";

export interface PostRequest {
  /** New events to add. */
  events?: TrackedEvent[];

  /** Results from variable operations. */
  variables?: {
    get?: readonly (
      | RestrictVariableTargets<
          StripPatchFunctions<VariableGetter<any, false>>,
          true
        >
      | Nullish
    )[];
    set?: readonly (
      | RestrictVariableTargets<
          StripPatchFunctions<VariableSetter<any, false>>,
          true
        >
      | Nullish
    )[];
  };

  /**
   * The client will not process the response. This is used by the web client to send timing events when a tab loses focus.
   * Sessions are not created on these requests, and extensions such as client location should ignore the request.
   */
  passive?: boolean;

  /**
   * A client-generated session ID.
   */
  deviceSessionId?: string;

  /**
   * A client-genereated device ID. If specified, the server will not generate one.
   *
   * Useful for apps amongst other things.
   */
  deviceId?: string;
}

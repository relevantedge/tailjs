import { Nullish } from "@tailjs/util";
import {
  RestrictVariableTargets,
  StripPatchFunctions,
  TrackedEvent,
  VariableGetter,
  VariableSetter,
} from "..";

export type PostVariableGetter<
  T = any,
  K extends string = string
> = RestrictVariableTargets<
  StripPatchFunctions<VariableGetter<T, K, false>>,
  true
>;

export type PostVariableSetter<
  T = any,
  K extends string = string
> = RestrictVariableTargets<
  StripPatchFunctions<VariableSetter<T, K, false>>,
  true
>;

export interface PostRequest {
  /** New events to add. */
  events?: TrackedEvent[];

  /** Results from variable operations. */
  variables?: {
    get?: readonly (PostVariableGetter | Nullish)[];
    set?: readonly (PostVariableSetter | Nullish)[];
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
   * A client-generated device ID. If specified, the server will not generate one.
   *
   * Useful for apps amongst other things.
   */
  deviceId?: string;
}

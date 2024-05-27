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
   * If tail.js is hosted in a multi-tenant setup you know what to do.
   * Otherwise, leave this blank.
   */
  apiKey?: string;
  /**
   * The request was send passively from the client.
   * Any response such as changed variables will be pushed to the client via a cookie.
   */
  beacon?: boolean;

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

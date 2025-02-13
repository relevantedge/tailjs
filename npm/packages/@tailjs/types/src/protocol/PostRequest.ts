import { Nullish } from "@tailjs/util";
import {
  ReadOnlyVariableGetter,
  ServerScoped,
  TrackedEvent,
  VariableValueSetter,
} from "..";

export type VariableGetRequest<Scoped extends boolean = true> = ServerScoped<
  ReadOnlyVariableGetter & {
    /**
     * Callbacks polling for changes to this variable will not get notified when this flag is set.
     */
    passive?: boolean;
  },
  Scoped
>;

export type VariableSetRequest<Scoped extends boolean = true> = ServerScoped<
  VariableValueSetter,
  Scoped
>;

export interface PostRequest<Scoped extends boolean = true> {
  /** New events to add. */
  events?: TrackedEvent[];

  /** Results from variable operations. */
  variables?: {
    get?: readonly (VariableGetRequest<Scoped> | Nullish)[];
    set?: readonly (VariableSetRequest<Scoped> | Nullish)[];
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

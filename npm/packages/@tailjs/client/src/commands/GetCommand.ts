import type { ReservedVariables, Tracker } from "..";
import { commandTest } from "./shared";

/** Used to get a context variable from the tracker. This is async, so if a key is anticipated to eventually be set, the callback will wait for it if does not already have a value.
 * This command can also be used for polling by returning `true` from the callback in which case it will be called everytime the value is set (not necessarily with a changed value).
 *
 */
export interface GetCommand {
  /**
   * If the functions returns true it will be triggered again if the value changes.
   */
  get: Record<string, GetCallback> & {
    [key in keyof ReservedVariables]?: GetCallback<ReservedVariables[key]>;
  };
  /**
   * If no one has set the value after this amount of ms, the callback will be triggered with `undefined` as the value and a flag indicating that the request timed out.
   * If set to zero the callback will always be called synchronously with either the value or undefined if it is not defined.
   * Negative values means "no timeout".
   */
  timeout?: number;
}

/**
 * The callback that is called for {@link GetCommand}s when a tracker variable is set or changed.
 * To enable/simplify polling the callback gets triggered again next time the variable changes if it returns `true`.
 */
export type GetCallback<T = any> = (
  /** The current value of the variable in the tracker. */
  value: T | undefined,

  /** The key for which the callback is registered.  */
  key: string,

  /** Whether the callback is called with an undefined value because the timeout elapsed. */
  timeout: boolean,

  /** The tracker where the variable was set. */
  tracker: Tracker
) => any | true;

export const isGetCommand = commandTest<GetCommand>("get");

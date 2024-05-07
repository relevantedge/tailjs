import { ArrayOrSelf, MaybeArray, Nullish } from "@tailjs/util";
import type { TrackerCommand, TrackerConfiguration } from "..";
import { EventQueue, TrackerVariableStorage } from "../lib2";

export type Tracker = {
  /**
   * A unique identifier for the tracker instance.
   */
  readonly id: string;

  /**
   * A flag that indicates that the tracker has been initialized.
   */
  readonly initialized?: boolean;

  readonly events: EventQueue;

  readonly variables: TrackerVariableStorage;

  readonly push: {
    /** Allows commands to be passed as a HTTP encoded string instead of objects. This is useful for server-side generated data. */
    (httpEncoded: string): void;

    /**
     * Allows commands to be passed as a HTTP encoded string instead of objects. This is useful for server-side generated data.
     *
     * Use this overload if a {@link TrackerConfiguration.apiKey} has been configured.
     */
    (apiKey: string, httpEncoded: string): void;

    /** Executes the specified commands. */
    (...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;

    /**
     * Executes the specified commands.
     *
     * Use this overload if a {@link TrackerConfiguration.apiKey} has been configured.
     */
    (apiKey: string, ...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;
  };
  /**
   * The tracker was initialized during server-side rendering.
   */
  readonly ssr?: boolean;

  /**
   * Convenience method to reset session and device data, and then prevent the tracker from posting further events.
   * This method is only available in debug mode to raise the entry barrier for pranksters who can inject scripts.
   */
  readonly reset?: (includeDevice?: boolean) => void;
};

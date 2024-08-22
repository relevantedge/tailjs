import { ArrayOrSelf, Nullish } from "@tailjs/util";
import type { TrackerCommand, TrackerClientConfiguration } from "..";
import { EventQueue, TrackerVariableStorage } from "../lib";

export interface Tracker {
  /**
   * Allows commands to be passed as an HTTP encoded string or JSON instead of objects. This may be useful for server-side generated data.
   *
   * Use this overload if a {@link TrackerClientConfiguration.key} has been configured.
   */
  (key: string, encoded: string): void;

  /** Allows commands to be passed as an HTTP encoded string or JSON instead of objects. This may be useful for server-side generated data. */
  (encoded: string): void;

  /**
   * Executes the specified commands.
   *
   * Use this overload if a {@link TrackerClientConfiguration.key} has been configured.
   *
   */
  (key: string, ...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;

  /** Executes the specified commands. */
  (...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;

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

  /**
   * The tracker was initialized during server-side rendering.
   */
  readonly ssr?: boolean;

  /**
   * Convenience method to reset session and device data, and then prevent the tracker from posting further events.
   * This method is only available in debug mode to raise the entry barrier for pranksters who can inject scripts.
   */
  readonly reset?: (includeDevice?: boolean) => void;
}

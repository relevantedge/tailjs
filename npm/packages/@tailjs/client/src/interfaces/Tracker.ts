import type { TrackerCommand, TrackerConfiguration } from "..";

export type Tracker = {
  /**
   * A unique identifier for the tracker instance.
   */
  id: string;
  push: {
    /** Allows commands to be passed as a HTTP encoded string instead of objects. This is useful for server-side generated data. */
    (httpEncoded: string): void;

    /**
     * Allows commands to be passed as a HTTP encoded string instead of objects. This is useful for server-side generated data.
     *
     * Use this overload if a {@link TrackerConfiguration.apiKey} has been configured.
     */
    (apiKey: string, httpEncoded: string): void;

    /** Executes the specified commands. */
    (...args: (TrackerCommand | TrackerCommand[])[]): void;

    /**
     * Executes the specified commands.
     *
     * Use this overload if a {@link TrackerConfiguration.apiKey} has been configured.
     */
    (apiKey: string, ...args: (TrackerCommand | TrackerCommand[])[]): void;
  };
  /**
   * The tracker was initialized during server-side rendering.
   */
  ssr?: boolean;

  /**
   * Convenience method to reset session and device data, and then prevent the tracker from posting further events.
   * This method is only available in debug mode to raise the entry barrier for pranksters who can inject scripts.
   */
  reset?: (includeDevice?: boolean) => void;
};

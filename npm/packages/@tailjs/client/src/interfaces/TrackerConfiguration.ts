import type { ActivationTracking } from "@tailjs/types";
import type { IterableOrSelf, Nullish } from "@tailjs/util";
import type { ParsableRegExp } from "../lib";
import type { Tracker } from ".";

/**
 * Defines a mapping from HTML element attributes to tags based on their names.
 *
 * Use `selector` to limit the scope.
 * This could be if you have included some external HTML with the interesting attribute `data-uuid` but don't want to bloat events because data-uuid is generally used for something uninteresting.
 * Not that this comes with a performance overhead, if you have many of these.
 *
 * Use `prefix` if you want a different tag prefix than the attribute name.
 *
 * The reason why it is a object with keys, is to organize rules by their purpose. It also allows disabling rules by setting a known rule ID to `false` or `undefined`.
 */

export type TagMappings = Record<
  string,
  IterableOrSelf<
    | ParsableRegExp
    | { selector?: string; prefix?: string; match: ParsableRegExp }
  >
>;

/**
 * Tracker configuration.
 */
export interface TrackerConfiguration {
  /**
   * The name of the global variable used for tracking.
   *
   * @default tail
   */
  name?: string;

  /**
   * Flag to disable all tracking.
   */
  disabled?: boolean;

  /**
   * The URL to the tracker script
   */
  src: string;

  /**
   * If false events will be triggered but not posted.
   * This especially makes sense in a staging/preview environment where events can be debugged but does not affect analytics reporting.
   * @default true
   */
  postEvents?: boolean;

  /**
   * How often queued events should be posted (ms).
   *
   * @default 2000
   */
  postFrequency?: number;

  /**
   * How long time to wait before a request is considered timed out (ms).
   * This influences the global request mutex that prevents multiple requests to happen at the same time.
   *
   * @default 5000
   */
  requestTimeout?: number;

  /**
   * The frequency (ms) for "heart beat" events to be sent to indicate that the client is active when no other events has been sent.
   * Can be used to show live activity or estimate missing VIEW_ENDED event if the user's browser crashed.
   *
   * Since it adds a considerable amount of extra data this should only be enabled for specific use cases.
   *
   * @default 0
   */
  heartbeatFrequency?: number;

  /**
   * The minimum duration (ms) a component needs to be visible before it counts as an impression.
   *
   * @default 1000
   */
  impressionThreshold?: number;

  /**
   * The default level for activation tracking.
   *
   * @deprecated
   * @default 'direct`
   */
  defaultActivationTracking?: ActivationTracking;

  /**
   * Whether tabs opened via the right-click context menu should be tracked.
   * Be aware this will rewrite the links if the user picks "copy" from said menu (they will still work though).
   *
   * @default true
   */
  captureContextMenu?: boolean;

  /**
   * Log events to the browser's developer console.
   */
  debug?: boolean;

  /**
   * All inter-tab communication will be encrypted using this key.
   * The same applies to cookies used to communicate with the server.
   */
  clientKey: string | Nullish;

  /**
   * A key that locks down the tracker API from external access.
   *
   * When specified, it must be passed as the first argument to {@link Tracker.push}.
   */
  apiKey: string | Nullish;

  /**
   * Defines which `data-*` attributes in the surrounding DOM that gets mapped to tags (in addition to `track-tags`).
   *
   * Rules without at least an include or exclude rule are ignored, and
   * rules with selectors are evaluated first.
   *
   * The default is to include data-* attributes where the name ends with "id" or "name".
   *
   * Use an empty array to exclude all data attributes.
   *
   */
  tags?: TagMappings;
}
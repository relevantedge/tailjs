import type { TrackedEvent } from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type {
  ParseResult,
  Tracker,
  TrackerEnvironment,
  TrackerPostOptions,
} from "./shared";

export type NextPatchExtension = (
  events: ParseResult[]
) => Promise<TrackedEvent[]>;

export type TrackedEventBatch = TrackedEvent[];

export type TrackerExtensionContext = {
  passive: boolean;
};

/**
 * Tracker extensions enable the engine to interface with external systems, typically to store the collected events somewhere.
 * It may also be to extend the events collected from the client with additional data with Geo IP information being the canonical example.
 *
 * Without any extensions, nothing happens after events have been collected from clients.
 *
 * Since that is not very useful by iteself, a common use case for extensions is to store the collected events in a database or forwarding them to a CDP.
 * You may also have some legacy analytics solutions, or even run more than one side-by-side. In such case tail.js
 * Since any number of extensions can be loaded with the engine, this concept allows the collected events to "fan out", that is, store them in different systems for different purposes.
 * For the latter use case you can think of tail.js as a "reverse proxy on steroids".
 *
 * Typically you should want to store all the raw event data in some kind of cheap storage, so they can later be used for reporting.
 * You may also want to send certain significant events/conversions to a CRM or CDP because they are used for personalization or some business process like a customer changing lead status after filling out a form.
 **
 *
 * Extensions may do anything from altering, updating and/or adding events before they are processed by other extensions.
 *
 * An extension
 */
export interface TrackerExtension {
  readonly id: string;

  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  apply?(
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromise<void>;

  patch?(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromise<ParseResult[]>;

  post?(
    events: TrackedEventBatch,
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromise<void>;

  getClientScripts?(tracker: Tracker): ClientScript[] | undefined | null;
}

/**
 * Definition of a additional client-side scripts that will get loaded with the tracker.
 */
export type ClientScript =
  | {
      /** An external source for the script. */
      src: string;
      /** Whether the script can be loaded asynchronously. */
      defer?: boolean;
    }
  | {
      /** A script expression that will get evaluated directly. */
      inline: string;
      /** Whether there are dependencies between this script expression and others. If not, inline scripts can be merged more efficiently.  */
      allowReorder?: boolean;
    };

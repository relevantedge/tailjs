import type { TrackedEvent } from "@tailjs/types";
import type {
  ParseResult,
  Tracker,
  TrackerEnvironment,
  RequestHandler,
} from "./shared";

export type NextPatchExtension = (
  events: ParseResult[]
) => Promise<TrackedEvent[]>;

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
 *
 *
 *
 *
 *
 *
 * Extensions may do anything from altering, updating and/or adding events before they are processed by other extensions.
 *
 * An extension
 */
export interface TrackerExtension {
  readonly name: string;

  initialize?(environment: TrackerEnvironment): Promise<void>;

  apply?(tracker: Tracker, variables: Record<string, any>): Promise<void>;

  patch?(
    next: NextPatchExtension,
    events: TrackedEvent[],
    tracker: Tracker,
    environment: TrackerEnvironment
  ): Promise<ParseResult[]>;

  post?(
    events: TrackedEvent[],
    tracker: Tracker,
    environment: TrackerEnvironment
  ): Promise<void>;
  // patch?(
  //   events: Partial<TrackedEvent> & { id: string },
  //   tracker: Tracker,
  //   environment: TrackerEnvironment
  // ): Promise<void>;

  getClientScripts?(
    tracker: Tracker,
    environment: TrackerEnvironment
  ): ClientScript[] | undefined | null;

  getVariable?<T = any>(
    scope: VariableScope,
    id: string,
    tracker: Tracker,
    environment: TrackerEnvironment
  ): Promise<T>;

  setVariable?<T = any>(
    scope: VariableScope,
    id: string,
    value: T,
    tracker: Tracker,
    environment: TrackerEnvironment
  ): Promise<VariableUpdateResult<T>>;
}

export enum VariableScope {
  Session,
  Device,
  User,
}

export interface VariableUpdateResult<T> {
  succeded?: boolean;
  oldValue?: T | undefined;
  newValue?: T | undefined;
}

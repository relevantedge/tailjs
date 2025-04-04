import type { Session, SignInEvent, TrackedEvent } from "@tailjs/types";
import { DeferredAsync, MaybePromiseLike } from "@tailjs/util";
import type {
  ParseResult,
  SchemaBuilder,
  Tracker,
  TrackerEnvironment,
  VariableStorageMappings,
} from "./shared";

export type NextPatchExtension = (
  events: ParseResult[]
) => Promise<ServerTrackedEvent[]>;

export interface ServerTrackedEvent extends TrackedEvent {
  readonly id: string;
  timestamp: number;
  session: Session;
}

export type TrackedEventBatch = {
  events: (ServerTrackedEvent & Record<string, any>)[];
};

export type TrackerExtensionContext = {
  passive: boolean;
};

export interface TrackerEnvironmentInitializable {
  initialize?(environment: TrackerEnvironment): MaybePromiseLike<void>;
}

/**
 * Tracker extensions enable the engine to interface with external systems, typically to store the collected events somewhere.
 * It may also be to extend the events collected from the client with additional data with Geo IP information being the canonical example.
 *
 * Without any extensions, nothing happens after events have been collected from clients.
 *
 * Since that is not very useful by itself, a common use case for extensions is to store the collected events in a database or forwarding them to a CDP.
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
 * Be aware this interface my be split into separate interfaces for the different purposes in the future, but the
 * methods will keep their signatures to make this non-breaking.
 */
export interface TrackerExtension extends TrackerEnvironmentInitializable {
  readonly id: string;

  /** This method is called before the extension is initialized allowing it to export is variable types and similar. */
  registerTypes?(schema: SchemaBuilder): void;

  /**
   * Allows the extension to update the RequestHandler's storage mappings as an alternative to configuration.
   *
   * This may be convenient if an extension both comes with event and variable logic (e.g. @tailjs/ravendb).
   */
  patchStorageMappings?(mappings: VariableStorageMappings): void;

  apply?(
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromiseLike<void>;

  patch?(
    events: TrackedEventBatch,
    next: NextPatchExtension,
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromiseLike<ParseResult[]>;

  post?(
    events: TrackedEventBatch,
    tracker: Tracker,
    context: TrackerExtensionContext
  ): MaybePromiseLike<void>;

  getClientScripts?(
    tracker: DeferredAsync<Tracker>
  ): ClientScript[] | undefined | null;

  validateSignIn?(tracker: Tracker, event: SignInEvent): Promise<boolean>;
}

/**
 * Definition of a additional client-side scripts that will get loaded with the tracker.
 */
export type ClientScript =
  | {
      /** An external source for the script. */
      src: string;
      /** The script can be loaded asynchronously. */
      defer?: boolean;
    }
  | {
      /** A script expression that will get evaluated directly. */
      inline: string;
      /** There are dependencies between this script expression and others. If not, inline scripts can be merged more efficiently.  */
      allowReorder?: boolean;
    };

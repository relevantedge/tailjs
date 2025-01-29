import { PATCH_EVENT_POSTFIX } from "@constants";

import {
  EventPatch,
  PostRequest,
  PostResponse,
  TrackedEvent,
  clearMetadata,
  isEventPatch,
} from "@tailjs/types";
import {
  F,
  Nullish,
  ToggleArray,
  array,
  clock,
  clone,
  concat,
  count,
  diff,
  forEach2,
  isString,
  itemize2,
  map,
  merge,
  now,
  pluralize,
  push,
  structuralEquals,
  throwError,
  unshift,
} from "@tailjs/util";
import {
  EVENT_POST_FREQUENCY,
  TrackerContext,
  addPageVisibleListener,
  childGroups,
  debug,
  request,
} from ".";
import { UnlockApiCommand } from "..";

export interface EventQueuePostOptions {
  flush?: boolean;
  async?: boolean;
  variables?: PostRequest["variables"];
}

export type ProtectedEvent = TrackedEvent & UnlockApiCommand;

const postCallback = Symbol();
export const registerPostCallback = <T extends TrackedEvent>(
  ev: T,
  callback: (ev: T) => boolean | void
) => ((ev[postCallback] = callback), ev);

export interface EventQueue {
  /**
   * Posts events to the server. Do not post event patches using this method. Use {@link postPatch} instead.
   * If flush is not explicitly requested, the event will eventually get posted, either by the configured post frequency, or when the user leaves the tab.
   */
  post<
    T extends ToggleArray<ProtectedEvent[]>,
    Options extends EventQueuePostOptions | undefined
  >(
    events: T,
    options?: Options
  ): Promise<Options extends { async: false } ? PostResponse : void>;

  /**
   *  Posts a patch to an existing event.
   */
  postPatch<T extends ProtectedEvent>(
    target: T,
    patch: EventPatchData<T>,
    flush?: boolean
  ): Promise<void>;

  /**
   * Registers a passive event.
   *
   * The source will get invoked whenever the tab becomes deactivated. If the source returns undefined or false, the source is unregistered.
   * The return value is a function to manually unregister the source.
   */
  registerEventPatchSource<T extends ProtectedEvent>(
    sourceEvent: T,
    source: EventPatchSource<T>,
    initialPost?: boolean,
    relatedNode?: Node
  ): () => undefined;
}

export type EventPatchData<T extends ProtectedEvent> = Omit<
  EventPatch<T>,
  "patchTargetId" | "metadata" | "type"
> & { type?: undefined };

export type EventPatchSource<T extends ProtectedEvent = ProtectedEvent> = (
  current: EventPatchData<T>,
  unbind: () => undefined
) => EventPatchData<T> | undefined;

export const createEventQueue = (
  url: string,
  context: TrackerContext,
  postFrequency = EVENT_POST_FREQUENCY
): EventQueue => {
  type Factory = () => [event: EventPatch | undefined, unbinding: boolean];
  const queue: ProtectedEvent[] = [];

  const snapshots = new WeakMap<ProtectedEvent, any>();
  const sources = new Map<ProtectedEvent, Factory>();

  const mapPatchTarget = <T extends ProtectedEvent>(
    sourceEvent: T,
    patch: EventPatchData<T> | undefined
  ): EventPatch<T> =>
    !sourceEvent.metadata?.queued
      ? throwError("Source event not queued.")
      : (merge(patch, {
          type: sourceEvent.type + PATCH_EVENT_POSTFIX,
          patchTargetId: sourceEvent.clientId,
        }) as any);

  const registerEventPatchSource = <T extends ProtectedEvent>(
    sourceEvent: ProtectedEvent,
    source: EventPatchSource<T>,
    initialPost = false,
    relatedNode?: Node
  ) => {
    let unbinding = false;
    const unbind = (): undefined => {
      unbinding = true;
    };
    snapshots.set(sourceEvent, clone(sourceEvent));
    const factory: Factory = () => {
      if (relatedNode?.isConnected === false) {
        unbind();
      } else {
        const snapshot = snapshots.get(sourceEvent);
        let [delta, current] = diff(source(snapshot, unbind), snapshot) ?? [];

        if (delta && !structuralEquals(current, snapshot)) {
          // The new "current" differs from the previous.
          snapshots.set(sourceEvent, clone(current));
          // Add patch target ID and the correct event type to the delta data before we return it.
          return [mapPatchTarget(sourceEvent, delta) as any, unbinding];
        }
      }

      return [undefined, unbinding];
    };
    sources.set(sourceEvent, factory);
    if (initialPost) {
      post(sourceEvent);
    }
    return unbind;
  };

  const postEvents = async <Beacon>(
    events:
      | ProtectedEvent[]
      | [apiKey: string | Nullish, events: ProtectedEvent[]],
    beacon: Beacon = true as any,
    variables: any
  ): Promise<Beacon extends true ? void : PostResponse> => {
    let key: string | Nullish;
    if (!events[0] || isString(events[0])) {
      key = events[0];
      events = events.slice(1) as any;
    }
    events = map(events, (ev: any) => {
      context?.validateKey(key ?? ev.key);
      // Update metadata in the source event,
      // and send a clone of the event without client metadata, and its timestamp in relative time
      // (the server expects this, and will adjust accordingly to its own time).
      merge(ev, { metadata: { posted: true } });
      if (ev[postCallback]) {
        if (ev[postCallback](ev) === false) {
          return undefined;
        }
        delete ev[postCallback];
      }

      return merge(clearMetadata(clone(ev), true), {
        timestamp: ev.timestamp! - now(),
      });
    });

    debug(
      { [childGroups]: map(events, (ev) => [ev, ev.type, F]) },
      "Posting " +
        itemize2([
          pluralize("new event", [
            count(events, (ev) => !isEventPatch(ev)) || undefined,
          ]),
          pluralize("event patch", [
            count(events, (ev) => isEventPatch(ev)) || undefined,
          ]),
        ]) +
        (beacon ? " asynchronously" : " synchronously") +
        "."
    );

    return request<PostRequest>(
      url,
      {
        events,
        variables,
        deviceSessionId: context?.deviceSessionId,
      },
      { beacon: beacon as any }
    ) as any;
  };

  const post = async (
    events: ToggleArray<ProtectedEvent[]>,
    { flush = false, async = true, variables }: EventQueuePostOptions = {}
  ): Promise<any> => {
    const newEvents: ProtectedEvent[] = [];

    events = map(
      array(events),
      (event) => (
        !event.metadata?.queued && push(newEvents, event),
        merge(context.applyEventExtensions(event), {
          metadata: { queued: true },
        })
      )
    );

    forEach2(newEvents, (event) => debug(event, event.type));

    if (!async) {
      return postEvents(events, false, variables);
    }
    if (!flush) {
      events.length && push(queue, ...events);
      return;
    }

    if (queue.length) {
      unshift(events as any, ...queue.splice(0));
    }

    if (!events.length) return;

    await postEvents(events, true, variables);
  };

  postFrequency > 0 && clock(() => post([], { flush: true }), postFrequency);

  addPageVisibleListener((visible, unloading, delta) => {
    // Don't do anything if the tab has only been visible for less than a second and a half.
    // More than that the user is probably just switching between tabs moving past this one.
    // NOTE: (This number should preferably be better qualified. We could also look into user activation events).
    if (!visible && (queue.length || unloading || delta > 1500)) {
      const updatedEvents = map(sources, ([sourceEvent, source]) => {
        const [event, unbinding] = source();
        unbinding &&
          (sources.delete(sourceEvent), snapshots.delete(sourceEvent));
        return event;
      });

      if (queue.length || updatedEvents.length) {
        post(concat(queue.splice(0), updatedEvents)!, { flush: true });
      }
    }
  });

  return {
    post,
    postPatch: (target, patch, flush) =>
      post(mapPatchTarget(target, patch), { flush: true }),
    registerEventPatchSource,
  };
};

import { PATCH_EVENT_POSTFIX } from "@constants";
import {
  EventPatch,
  PostRequest,
  TrackedEvent,
  clearMetadata,
  isEventPatch,
} from "@tailjs/types";
import {
  ToggleArray,
  array,
  clock,
  clone,
  concat,
  count,
  diff,
  forEach,
  join,
  map,
  merge,
  now,
  pluralize,
  push,
  quote,
  separate,
  structuralEquals,
  throwError,
  unshift,
} from "@tailjs/util";
import {
  EVENT_POST_FREQUENCY,
  TrackerContext,
  addPageVisibleListener,
  debug,
  request,
} from ".";

export type EventQueue = {
  /**
   * Posts events to the server. Do not post event patches using this method. Use {@link postPatch} instead.
   * If flush is not explicitly requested, the event will eventually get posted, either by the configured post frequency, or when the user leaves the tab.
   */
  post<T extends ToggleArray<readonly TrackedEvent[]>>(
    events: T,
    flush?: boolean
  ): Promise<void>;

  /**
   *  Posts a patch to an existing event.
   */
  postPatch<T extends TrackedEvent>(
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
  registerEventPatchSource<T extends TrackedEvent>(
    sourceEvent: T,
    source: EventPatchSource<T>
  ): () => void;
};

type EventPatchData<T extends TrackedEvent> = Omit<
  EventPatch<T>,
  "patchTargetId" | "metadata" | "type"
> & { type?: undefined };

export type EventPatchSource<
  T extends TrackedEvent = TrackedEvent,
  AutoDiff extends boolean = true
> = (
  current: EventPatchData<T>,
  unbind: () => void
) => AutoDiff extends true
  ? EventPatchData<T>
  : [delta: EventPatchData<T>, current: EventPatchData<T>] | undefined;

export const createEventQueue = (
  url: string,
  context: TrackerContext,
  postFrequency = EVENT_POST_FREQUENCY
): EventQueue => {
  type Factory = () => [event: EventPatch | undefined, unbinding: boolean];
  const queue: TrackedEvent[] = [];

  const snapshots = new WeakMap<TrackedEvent, any>();
  const sources = new Map<TrackedEvent, Factory>();

  const mapPatchTarget = <T extends TrackedEvent>(
    sourceEvent: T,
    patch: EventPatchData<T> | undefined
  ): EventPatch<T> =>
    !sourceEvent.metadata?.queued
      ? throwError("Source event not queued.")
      : (merge(patch, {
          type: sourceEvent.type + PATCH_EVENT_POSTFIX,
          patchTargetId: sourceEvent.clientId,
        }) as any);

  const registerEventPatchSource = <
    T extends TrackedEvent,
    AutoDiff extends boolean = true
  >(
    sourceEvent: TrackedEvent,
    source: EventPatchSource<T, AutoDiff>,
    autoDiff = true
  ) => {
    let unbinding = false;
    const unbind = () => (unbinding = true);
    snapshots.set(sourceEvent, clone(sourceEvent));
    const factory: Factory = () => {
      const snapshot = snapshots.get(sourceEvent);
      let [delta, current] =
        (autoDiff
          ? diff(source(snapshot, unbind), snapshot)
          : source(snapshot, unbind)) ?? ([] as any);

      if (delta && !structuralEquals(current, snapshot)) {
        // The new "current" differs from the previous.
        snapshots.set(sourceEvent, clone(current));
        // Add patch target ID and the correct event type to the delta data before we return it.
        return [mapPatchTarget(sourceEvent, delta) as any, unbinding];
      } else {
        return [undefined, unbinding];
      }
    };
    sources.set(sourceEvent, factory);
    return unbind;
  };

  const post = async (
    events: ToggleArray<readonly TrackedEvent[]>,
    flush = false
  ) => {
    events = map(array(events), (event) =>
      merge(context.applyEventExtensions(event), { metadata: { queued: true } })
    );

    if (events.length) {
      forEach(events, (event) => debug(event, event.type));
    }
    if (!flush) {
      events.length && push(queue, ...events);
      return;
    }

    if (queue.length) {
      unshift(events as any, ...queue.splice(0));
    }

    if (!events.length) return;

    debug(
      join(events, (ev) => quote(ev.type), ["and"]),
      "Posting " +
        separate([
          pluralize("new event", [
            count(events, (ev) => !isEventPatch(ev)) || undefined,
          ]),
          pluralize("event update", [
            count(events, (ev) => isEventPatch(ev)) || undefined,
          ]),
        ]) +
        "."
    );

    request<PostRequest>(
      url,
      {
        events: events.map(
          (ev) => (
            // Update metadata in the source event,
            // and send a clone of the event without client metadata, and its timestamp in relative time
            // (the server expects this, and will adjust accordingly to its own time).
            merge(ev, { metadata: { posted: true } }),
            merge(clearMetadata(clone(ev), true), {
              timestamp: ev.timestamp! - now(),
            })
          )
        ),
        deviceSessionId: context?.deviceSessionId,
      },
      { beacon: true }
    );
  };

  postFrequency > 0 && clock(() => post([], true), postFrequency);

  addPageVisibleListener((visible, unloading, delta) => {
    // Don't do anything if the tab has only been visible for less than a second and a half.
    // More than that the user is probably just switching between tabs moving past this one.
    // NOTE: (This number should preferably be better qualified. We could also look into user activation events).
    if (!visible && (queue.length || unloading || delta > 1500)) {
      const updatedEvents = map(sources, ([sourceEvent, source]) => {
        const [event, unbinding] = source();
        unbinding && sources.delete(sourceEvent);
        return event;
      });

      if (queue.length || updatedEvents.length) {
        post(concat(queue.splice(0), updatedEvents)!, true);
      }
    }
  });

  return {
    post,
    postPatch: (target, patch, flush) =>
      post(mapPatchTarget(target, patch), flush),
    registerEventPatchSource,
  };
};

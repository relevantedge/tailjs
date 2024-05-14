import {
  EventPatch,
  PassiveEvent,
  PostRequest,
  TrackedEvent,
  clearMetadata,
} from "@tailjs/types";
import {
  ToggleArray,
  array,
  clock,
  clone,
  concat,
  forEach,
  isNumber,
  isObject,
  isPlainObject,
  map,
  merge,
  push,
  structuralEquals,
  throwError,
  unshift,
} from "@tailjs/util";
import {
  EVENT_POST_FREQUENCY,
  TrackerContext,
  addPageVisibleListener,
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

export const deltaDiff = <T>(current: T, previous: T | undefined): T => {
  if (!isPlainObject(previous)) return current;

  const diffed: any = {};
  let previousValue: number | undefined;
  if (isPlainObject(current)) {
    forEach(
      current,
      ([key, value]) =>
        // No change here.
        diffed[key] !== previous[key] &&
        (diffed[key] = isPlainObject(value)
          ? deltaDiff(value, previous[key])
          : isNumber(value) && isNumber((previousValue = previous[key]))
          ? value - previousValue
          : value)
    );
  }
  return diffed;
};

export type EventPatchSource<T extends TrackedEvent = TrackedEvent> = (
  previous: EventPatchData<T>,
  unbind: () => void
) => EventPatchData<T> | undefined;

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
          type: sourceEvent.type + "_patch",
          patchTargetId: sourceEvent.clientId,
        }) as any);

  const registerEventPatchSource = <T extends TrackedEvent>(
    sourceEvent: TrackedEvent,
    source: EventPatchSource<T>
  ) => {
    let unbinding = false;
    const unbind = () => (unbinding = true);
    snapshots.set(sourceEvent, clone(sourceEvent));
    const factory: Factory = () => {
      let updated = mapPatchTarget(
        sourceEvent,
        source(snapshots.get(sourceEvent), unbind)
      );

      if (updated && (!snapshots || !structuralEquals(updated, snapshots))) {
        updated && snapshots.set(sourceEvent, clone(updated));
        return [updated as any, unbinding];
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

    if (!events.length) return;

    if (!flush) {
      push(queue, ...events);
      return;
    }

    if (queue.length) {
      unshift(events as any, ...queue.splice(0));
    } else {
      return;
    }

    await request<PostRequest>(url, {
      events: events.map(
        (ev) => (
          merge(ev, { metadata: { posted: true } }), clearMetadata(ev, true)
        )
      ),
      deviceSessionId: context?.deviceSessionId,
    });
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
    registerEventPatchSource: registerEventPatchSource,
  };
};

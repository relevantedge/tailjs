import { PassiveEvent, PostRequest, TrackedEvent } from "@tailjs/types";
import {
  clock,
  clone,
  concat,
  map,
  push,
  structuresEqual,
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
   * Posts events to the server.
   * If flush is not explicitly requested, the event will eventually get posted, either by the configured post frequency, or when the user leaves the tab.
   */
  post(events: TrackedEvent[], flush: boolean): Promise<void>;

  /**
   * Registers a passive event.
   *
   * The source will get invoked whenever the tab becomes deactivated. If the source returns undefined or false, the source is unregistered.
   * The return value is a function to manually unregister the source.
   */
  registerPassiveEventSource<T extends PassiveEvent = PassiveEvent>(
    sourceEvent: TrackedEvent,
    source: PassiveEventSource<T>
  ): () => void;
};

export type PassiveEventSource<T extends PassiveEvent = PassiveEvent> = (
  previous: T | undefined,
  unbind: () => void
) => T | undefined;

export const createEventQueue = (
  url: string,
  context?: TrackerContext,
  postFrequency = EVENT_POST_FREQUENCY
): EventQueue => {
  type Factory = () => [event: PassiveEvent | undefined, unbinding: boolean];
  const queue: TrackedEvent[] = [];

  const snapshots = new WeakMap<TrackedEvent, any>();
  const sources = new Map<TrackedEvent, Factory>();

  const registerPassiveEventSource = <T extends PassiveEvent>(
    sourceEvent: TrackedEvent,
    source: PassiveEventSource<T>
  ) => {
    let unbinding = false;
    const unbind = () => (unbinding = true);
    const factory: Factory = () => {
      let updated = source(snapshots.get(sourceEvent), unbind);
      if (updated && (!snapshots || !structuresEqual(updated, snapshots))) {
        updated && snapshots.set(sourceEvent, clone(updated));
        return [updated, unbinding];
      } else {
        return [undefined, unbinding];
      }
    };
    sources.set(sourceEvent, factory);
    return unbind;
  };

  const post = async (events: TrackedEvent[], flush = false) => {
    if (!flush) {
      push(queue, ...events);
      return;
    }

    if (queue.length) {
      unshift(events, ...queue.splice(0));
    }
    if (!queue.length) return;

    await request<PostRequest>(url, {
      events: events,
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
    registerPassiveEventSource,
  };
};

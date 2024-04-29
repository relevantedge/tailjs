import { PassiveEvent, PostRequest, TrackedEvent } from "@tailjs/types";
import { clock, clone, concat, entriesEqual, map } from "@tailjs/util";
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

  const previous = new WeakMap<TrackedEvent, any>();
  const sources = new Map<TrackedEvent, Factory>();

  const registerPassiveEventSource = <T extends PassiveEvent>(
    sourceEvent: TrackedEvent,
    source: PassiveEventSource<T>
  ) => {
    let unbinding = false;
    const unbind = () => (unbinding = true);
    const factory: Factory = () => {
      let updated = source(previous.get(sourceEvent), unbind);
      if (!previous || !entriesEqual(updated, previous)) {
        updated && previous.set(sourceEvent, clone(updated));
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
      queue.push(...events);
      return;
    }

    if (queue.length) {
      events.unshift(...queue.splice(0));
    }
    if (!queue.length) return;

    await request<PostRequest>(url, {
      events: events,
      deviceSessionId: context?.deviceSessionId,
    });
  };

  postFrequency > 0 && clock(() => post([], true), postFrequency);

  addPageVisibleListener((visible, unloading, delta) => {
    // Don't do anything if the tab has only been visible for less than two seconds.
    if (!visible && (queue.length || unloading || delta > 2000)) {
      const updatedEvents = map(sources, ([sourceEvent, source]) => {
        const [event, unbinding] = source();
        unbinding && sources.delete(sourceEvent);
        return event;
      });

      if (queue.length || updatedEvents.length) {
        post(concat(queue.splice(0), updatedEvents), true);
      }
    }
  });

  return {
    post,
    registerPassiveEventSource,
  };
};

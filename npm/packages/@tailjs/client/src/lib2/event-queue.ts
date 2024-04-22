import { PassiveEvent, PostRequest, TrackedEvent } from "@tailjs/types";
import { clock, entriesEqual, get, ifDefined, join, map } from "@tailjs/util";
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
  registerPassiveEventSource(source: () => PassiveEvent | false): () => void;
};

export const createEventQueue = (
  url: string,
  context?: TrackerContext,
  postFrequency = EVENT_POST_FREQUENCY
): EventQueue => {
  const queue: TrackedEvent[] = [];

  const passiveEvents = new Map<
    () => PassiveEvent | undefined,
    [snapshot: PassiveEvent | undefined, leaving: boolean]
  >();

  const registerPassiveEventSource = (source: () => PassiveEvent) => {
    get(passiveEvents, source, () => [undefined, false])[1] = false;
    return () => {
      ifDefined(passiveEvents.get(source), (current) => (current[1] = true));
    };
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
      const updatedEvents = map(passiveEvents, ([source, stats]) => {
        const event = source();
        if (!event || passiveEvents[1]) {
          // Events that are no longer active but haven't been posted yet, gets posted but are then removed.
          // Also, if a source returns undefined or false, it will also be removed since it is no longer active.
          // In that case, nothing will get posted, it's just a way to unregister.

          passiveEvents.delete(source);
          if (!event) return;
        }
        if (!entriesEqual(event, stats[0])) {
          // Only post events if they have changed.
          stats[0] = { ...event, passive: true };
          return event;
        }
      });

      if (queue.length || updatedEvents.length) {
        post(join(queue.splice(0), updatedEvents), true);
      }
    }
  });

  return {
    post,
    registerPassiveEventSource,
  };
};

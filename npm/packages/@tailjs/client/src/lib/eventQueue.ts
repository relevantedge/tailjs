import type { TrackedEvent } from "@tailjs/types";
import { httpEncode } from "@tailjs/util";
import {
  ERR_POST_FAILED,
  F,
  TAB_ID,
  VAR_URL,
  addResponseListener,
  clean,
  completeDependency,
  debug,
  err,
  eventSet,
  hasDependencies,
  map,
  navigator,
  nil,
  now,
  push,
  registerAction,
  registerSharedState,
  shift,
  size,
  splice,
  startupLock,
  tryAcquireRequestLock,
} from ".";

const [addPostListener, callPostListeners] =
  eventSet<[events: TrackedEvent[]]>();

const [addShutdownListener, callShutdownListeners] = eventSet();

export {
  addPostListener as addQueuePostListener,
  addShutdownListener as addTerminationListener,
};
export const enqueueEvent = (event: TrackedEvent) => {
  const queue = [event];
  const batch: TrackedEvent[] = [];
  let ready: TrackedEvent[] | undefined;
  while (queue.length) {
    const event = shift(queue)!;
    if (hasDependencies(event)) {
      continue;
    }
    (ready = completeDependency(event)) && splice(queue, 1, 0, ...ready);

    push(batch, event);
  }
  post(...batch);
};

const [post, commit] = registerAction<TrackedEvent>(
  "events",
  async (events, force) => {
    if (!size(events)) {
      return F;
    }
    await startupLock;

    if (force && !affinity) {
      debug(
        "WARN: Force post downgraded to normal post because affinity has not been set."
      );
      force = F;
    }
    debug("Post started");

    callPostListeners(events);

    return await tryAcquireRequestLock(force, TAB_ID, (discardCookies) => {
      const t0 = now();
      const postData = httpEncode([
        map(
          events,
          (
            ev,
            _,
            event = {
              ...ev,
              timestamp: Math.min(0, (ev.timestamp ??= t0) - t0),
            }
          ) => (clean(event), debug(event, nil, event.type), event)
        ),
        [affinity, discardCookies],
      ]);
      !navigator.sendBeacon(
        VAR_URL,
        new Blob([postData], {
          // This content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
          // (application/x-www-form-urlencoded could also work).
          type: "text/plain",
        })
      ) && err(ERR_POST_FAILED, events);
    });
  },
  (terminating) => (terminating && callShutdownListeners(), undefined)
);

export { commit };

// Force posts will not happen before this is set.
let affinity: any | undefined;
const broadcastAffinity = registerSharedState(
  "affinity",
  () => affinity,
  (value) => (affinity = value)
);
const setAffinity = (value: any) => (
  (affinity = value), broadcastAffinity(value)
);

addResponseListener(setAffinity);

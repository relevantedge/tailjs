import { TrackedEvent } from "@tailjs/types";
import type { Nullish } from "@tailjs/util";
import {
  T,
  any,
  del,
  filter,
  get,
  getOrSet,
  hashMap,
  hashSet,
  map,
  push,
  set,
} from ".";

const dependencies = Symbol();

const cleared = hashSet<TrackedEvent>();

// If an event refers to another event it will not get posted before that is posted.
// That also means that if the referred event is never posted, neither is the event.
// TODO: Evaluate if this may cause a memory leak.
const pendingDependencies = hashMap<TrackedEvent, Set<TrackedEvent>>();
const areAllDependenciesPosted = (ev: TrackedEvent) =>
  !any(ev[dependencies], (dep) => !get(cleared, dep));

export const hasDependencies = (event: TrackedEvent) =>
  !areAllDependenciesPosted(event) &&
  (map(event[dependencies], (dep) =>
    set(
      getOrSet(pendingDependencies, dep, () => hashSet()),
      event
    )
  ),
  T);

let stalled: Set<TrackedEvent> | Nullish;
export const completeDependency = (event: TrackedEvent) => (
  set(cleared, event),
  (stalled = pendingDependencies.get(event)) && // Free memory when all dependant events are cleared
    (!stalled.size && del(pendingDependencies, event),
    filter(
      stalled,
      (dep) => areAllDependenciesPosted(dep) && (del(stalled!, dep), T)
    ))
);

export const addDependency = (
  event: TrackedEvent,
  dependency: TrackedEvent
) => (
  event !== dependency &&
    push(((event[dependencies] ??= []), dependency) as any),
  event
);

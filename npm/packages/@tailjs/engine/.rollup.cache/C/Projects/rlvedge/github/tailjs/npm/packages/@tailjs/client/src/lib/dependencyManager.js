import { T, any, del, filter, get, getOrSet, hashMap, hashSet, map, set, } from ".";
const dependencies = Symbol();
const cleared = hashSet();
// If an event refers to another event it will not get posted before that is posted.
// That also means that if the referred event is never posted, neither is the event.
// TODO: Evaluate if this may cause a memory leak.
const pendingDependencies = hashMap();
const areAllDependenciesPosted = (ev) => !any(ev[dependencies], (dep) => !get(cleared, dep));
export const hasDependencies = (event) => !areAllDependenciesPosted(event) &&
    (map(event[dependencies], (dep) => set(getOrSet(pendingDependencies, dep, () => hashSet()), event)),
        T);
let stalled;
export const completeDependency = (event) => (set(cleared, event),
    (stalled = pendingDependencies.get(event)) && // Free memory when all dependant events are cleared
        (!stalled.size && del(pendingDependencies, event),
            filter(stalled, (dep) => areAllDependenciesPosted(dep) && (del(stalled, dep), T))));
export const addDependency = (event, dependency) => (event !== dependency &&
    (event[dependencies] ??= []).push(dependency),
    event);
//# sourceMappingURL=dependencyManager.js.map
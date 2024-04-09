import { F, T, addTerminationListener, del, hashSet, map } from ".";
// These will be flushed when / if the user leaves the page.
const activeHandles = hashSet();
let flushing = F;
export const noopAction = () => { };
export const flushViewEndActions = () => {
    flushing = T;
    map(activeHandles, (item) => item(T));
};
export const registerViewEndAction = (action) => {
    const handler = (commit = T) => del(activeHandles, handler) && commit && action(flushing);
    activeHandles.add(handler);
    return handler;
};
addTerminationListener(() => flushViewEndActions());
//# sourceMappingURL=registerViewEndAction.js.map
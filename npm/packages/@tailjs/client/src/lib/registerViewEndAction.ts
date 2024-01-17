import { F, T, addTerminationListener, del, hashSet, map } from ".";

export type PendingActionHandle = (commit?: boolean) => void;

// These will be flushed when / if the user leaves the page.
const activeHandles = hashSet<PendingActionHandle>();

let flushing = F;

export const noopAction: PendingActionHandle = () => {};

export const flushViewEndActions = () => {
  flushing = T;
  map(activeHandles, (item) => item(T));
};

export const registerViewEndAction = (
  action: (flushed: boolean) => void
): PendingActionHandle => {
  const handler = (commit = T) =>
    del(activeHandles, handler) && commit && action(flushing);

  activeHandles.add(handler);

  return handler;
};

addTerminationListener(() => flushViewEndActions());

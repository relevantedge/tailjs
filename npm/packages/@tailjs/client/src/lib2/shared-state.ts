import { bindStickyStorage, createBinders, listen } from ".";

export const STATE_READY = "_t.sr";

export type EventHandler<T> = (payload: T) => void;

export const createEvent = <T>(): [
  listen: (listener: EventHandler<T>) => ReturnType<typeof listen>,
  dispatch: (payload: T) => void
] => {
  const listeners = new Set<EventHandler<T>>();

  return [
    (handler) =>
      createBinders(
        handler,
        (handler) => listeners.add(handler),
        (handler) => listeners.delete(handler)
      ),
    (payload) => listeners.forEach((handler) => handler(payload)),
  ];
};

export type State = {
  knownTabs: string[];
};

const initialState: State = { knownTabs: [] };

const [addStateListener, dispatch] = createEvent<State>();
export { addStateListener };

// const stateStorage = bindStickyStorage();

// setTimeout(() => {
//   dispatch(true);
// }, 100);

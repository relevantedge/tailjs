import { del, forEach, hashSet, openPromise, set } from ".";

type HandlerArgs<Args extends any[]> = [...params: Args, unbind: () => void];
export const eventSet = <Args extends any[] = []>(
  once = false
): [
  add: (handler: (...args: HandlerArgs<Args>) => void) => () => void,
  invoke: (...args: Args) => void
] => {
  const handlers = hashSet<(...args: HandlerArgs<Args>) => void>();
  const unbinder = (handler: any) => () => del(handlers, handler);
  let invokeArgs: Args | null = null;

  return [
    (handler: (...args: HandlerArgs<Args>) => void): (() => void) => (
      // If the event has already fired call the handler with whatever args were used when it happened.
      once && invokeArgs
        ? handler(...invokeArgs, () => {})
        : set(handlers, handler),
      unbinder(handler)
    ),
    (...args: Args) =>
      forEach(handlers, (handler) => {
        handler(...(invokeArgs = args), unbinder(handler));
      }),
  ];
};

export const startupLock = openPromise();

export const [registerStartupHandler, startupComplete] = eventSet(true);

registerStartupHandler(() => startupLock(true));

import { filter, some } from "@tailjs/util";

export type Rebinder = () => boolean;
export type Unbinder = () => boolean;
export type Binders = [unbind: Unbinder, rebind: Rebinder];

export type SourceListener<Args extends any[]> = (...args: Args) => void;
export type Listener<Args extends any[]> = (
  ...args: [...args: Args, unbind: Unbinder]
) => void;

export const createBinders = <Args extends any[]>(
  listener: Listener<Args>,
  attach: (listener: SourceListener<Args>) => void,
  detach: (listener: SourceListener<Args>) => void
): Binders => {
  let bound = false;

  const outerListener = (...args: Args) => listener(...args, unbind);

  const unbind = () =>
    bound !== (bound = false) && (detach(outerListener), true);

  const rebind = () =>
    bound !== (bound = true) && (attach(outerListener), true);

  rebind();
  return [unbind, rebind];
};

export const mergeBinders = (...binders: (Binders | undefined)[]): Binders => (
  (binders = filter(binders)),
  [
    () => some(binders, (binder) => binder![0]()),
    () => some(binders, (binder) => binder![1]()),
  ]
);

export type EventHandler<Args extends any[]> = (...payload: Args) => void;

export const createEvent = <Args extends any[]>(): [
  listen: (listener: Listener<Args>) => Binders,
  dispatch: (...payload: Args) => void
] => {
  const listeners = new Set<SourceListener<Args>>();

  return [
    (handler) =>
      createBinders(
        handler,
        (handler) => listeners.add(handler),
        (handler) => listeners.delete(handler)
      ),
    (...payload) => listeners.forEach((handler) => handler(...payload)),
  ];
};

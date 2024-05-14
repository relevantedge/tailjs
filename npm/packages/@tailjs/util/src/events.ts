import { filter, reduce } from ".";

export type Rebinder = () => boolean;
export type Unbinder = () => boolean;
export type Binders = [unbind: Unbinder, rebind: Rebinder];

export type SourceListener<Args extends readonly any[]> = (
  ...args: Args
) => void;
export type Listener<Args extends readonly any[]> = (
  ...args: [...args: Args, unbind: Unbinder]
) => void;

export const createEventBinders = <Args extends any[]>(
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

export const joinEventBinders = (
  ...binders: (Binders | undefined)[]
): Binders => (
  (binders = filter(binders)),
  [
    () => reduce(binders, (changed, binder) => binder![0]() || changed, false),
    () => reduce(binders, (changed, binder) => binder![1]() || changed, false),
  ]
);

export type EventHandler<Args extends readonly any[]> = (
  ...payload: Args
) => void;

export const createEvent = <Args extends readonly any[]>(): [
  listen: (listener: Listener<Args>, triggerCurrent?: boolean) => Binders,
  dispatch: (...payload: Args) => void
] => {
  const listeners = new Set<SourceListener<Args>>();
  let dispatchedArgs: Args | undefined;
  return [
    (handler, trigger) => {
      const binders = createEventBinders(
        handler as any,
        (handler) => listeners.add(handler),
        (handler) => listeners.delete(handler)
      );
      trigger &&
        dispatchedArgs &&
        (handler as any)(...dispatchedArgs, binders[0]);
      return binders;
    },
    (...payload) => (
      (dispatchedArgs = payload),
      listeners.forEach((handler) => handler(...payload))
    ),
  ];
};

export type ChainedEventHandler<Args extends any[], T> = (
  ...args: [
    ...args: Args,
    next: {
      (): T;
      (...args: Args): T;
    },
    unbind: Unbinder
  ]
) => T;

type LinkedNode<T> = [
  prev: LinkedNode<T> | undefined,
  item: T,
  next: LinkedNode<T> | undefined
];

export const createChainedEvent = <T = void, Args extends any[] = []>(): [
  register: (
    handler: ChainedEventHandler<Args, T>,
    priority?: number
  ) => Binders,
  invoke: (...args: Args) => T | undefined
] => {
  type Item = [
    handler: ChainedEventHandler<Args, T>,
    priority: number,
    binders: Binders
  ];
  type Node = LinkedNode<Item>;
  let head: Node | undefined;
  let tail: Node | undefined;
  let next: Node | undefined;

  const register = (
    handler: ChainedEventHandler<Args, T>,
    // Make sure that handler gets rebound at their previous priority without jumping discrete increments.
    // (It is deseriable to be able to specfiy priority 0 or  10 without having to think about how many 0s there are)
    priority = (tail?.[1][1] ?? 0) + 0.000001
  ) => {
    const registerNode = (node?: Node) => {
      let bound = true;
      node ??= [
        undefined,
        [
          handler,
          priority,
          [
            () => {
              if (!bound) return false;
              node![0] ? (node![0][2] = node![2]) : (head = node![2]);
              node![2] ? (node![2][0] = node![0]) : (tail = node![0]);
              node![0] = node![2] = undefined;
              return !(bound = false);
            },
            () => (bound ? false : (registerNode(node), (bound = true))),
          ],
        ],
        undefined,
      ];
      next = head;
      if (!next) {
        head = tail = node;
      } else if (priority >= tail![1][1]) {
        node[0] = tail;
        tail = tail![2] = node;
      } else {
        // INV: priority < tail.priority, so next will be non-null after loop;
        while (next![1][1]! <= priority) {
          next = next[2]!;
        }

        (node[0] = (node[2] = next)[0]) ? (node[0][2] = node) : (head = node);
        next[0] = node;
      }

      return node[1][2];
    };
    return registerNode();
  };

  const invoke = (node: Node | undefined, args: Args) => (
    (next = node?.[2]),
    node
      ? node[1][0](
          ...args,
          (...nextArgs: Args) =>
            invoke(next!, nextArgs.length ? nextArgs : args),
          node[1][2][0]
        )
      : undefined
  );

  return [register, (...args) => invoke(head, args)];
};

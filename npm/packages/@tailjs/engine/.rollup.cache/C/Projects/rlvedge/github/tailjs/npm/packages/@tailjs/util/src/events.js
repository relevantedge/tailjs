import { filter, reduce } from ".";
export const createEventBinders = (listener, attach, detach) => {
    let bound = false;
    const outerListener = (...args) => listener(...args, unbind);
    const unbind = () => bound !== (bound = false) && (detach(outerListener), true);
    const rebind = () => bound !== (bound = true) && (attach(outerListener), true);
    rebind();
    return [unbind, rebind];
};
export const joinEventBinders = (...binders) => ((binders = filter(binders)),
    [
        () => reduce(binders, (changed, binder) => binder[0]() || changed, false),
        () => reduce(binders, (changed, binder) => binder[1]() || changed, false),
    ]);
export const createEvent = () => {
    const listeners = new Set();
    let dispatchedArgs;
    return [
        (handler, trigger) => {
            const binders = createEventBinders(handler, (handler) => listeners.add(handler), (handler) => listeners.delete(handler));
            trigger && dispatchedArgs && handler(...dispatchedArgs, binders[0]);
            return binders;
        },
        (...payload) => ((dispatchedArgs = payload),
            listeners.forEach((handler) => handler(...payload))),
    ];
};
export const createChainedEvent = () => {
    let head;
    let tail;
    let next;
    const register = (handler, 
    // Make sure that handler gets rebound at their previous priority without jumping discrete increments.
    // (It is deseriable to be able to specfiy priority 0 or  10 without having to think about how many 0s there are)
    priority = (tail?.[1][1] ?? 0) + 0.000001) => {
        const registerNode = (node) => {
            let bound = true;
            node ??= [
                undefined,
                [
                    handler,
                    priority,
                    [
                        () => {
                            if (!bound)
                                return false;
                            node[0] ? (node[0][2] = node[2]) : (head = node[2]);
                            node[2] ? (node[2][0] = node[0]) : (tail = node[0]);
                            node[0] = node[2] = undefined;
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
            }
            else if (priority >= tail[1][1]) {
                node[0] = tail;
                tail = tail[2] = node;
            }
            else {
                // INV: priority < tail.priority, so next will be non-null after loop;
                while (next[1][1] <= priority) {
                    next = next[2];
                }
                (node[0] = (node[2] = next)[0]) ? (node[0][2] = node) : (head = node);
                next[0] = node;
            }
            return node[1][2];
        };
        return registerNode();
    };
    const invoke = (node, args) => ((next = node?.[2]),
        node
            ? node[1][0](...args, (...nextArgs) => invoke(next, nextArgs.length ? nextArgs : args), node[1][2][0])
            : undefined);
    return [register, (...args) => invoke(head, args)];
};
//# sourceMappingURL=events.js.map
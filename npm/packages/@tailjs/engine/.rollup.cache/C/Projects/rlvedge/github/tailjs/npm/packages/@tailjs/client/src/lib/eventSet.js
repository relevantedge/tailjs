import { del, forEach, hashSet, openPromise, set } from ".";
export const eventSet = (once = false) => {
    const handlers = hashSet();
    const unbinder = (handler) => () => del(handlers, handler);
    let invokeArgs = null;
    return [
        (handler) => (
        // If the event has already fired call the handler with whatever args were used when it happened.
        once && invokeArgs
            ? handler(...invokeArgs, () => { })
            : set(handlers, handler),
            unbinder(handler)),
        (...args) => forEach(handlers, (handler) => {
            handler(...(invokeArgs = args), unbinder(handler));
        }),
    ];
};
export const startupLock = openPromise();
export const [registerStartupHandler, startupComplete] = eventSet(true);
registerStartupHandler(() => startupLock(true));
//# sourceMappingURL=eventSet.js.map
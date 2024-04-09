import { T, assign, delay, nil, size, undefined } from ".";
export const promise = (...args) => !args.length ? Promise.resolve() : new Promise(args[0]);
/**
 * Magic value to reset an  {@link OpenPromise}.
 */
export const Reset = Symbol();
/**
 * Indicates that an {@link OpenPromiseWithTimeout} has timed out.
 */
export const Expired = Symbol();
/**
 * Creates a new {@link OpenPromise} or {@link OpenPromiseWithTimeout} if a timeout is specified.
 */
export const openPromise = (timeout) => {
    let currentResolve = nil;
    let currentPromise = nil;
    let resolved = undefined;
    const reset = () => {
        resolved = undefined;
        let capturedResolve = nil;
        currentPromise = promise((resolve) => {
            currentResolve = capturedResolve = (value) => capturedResolve &&
                ((capturedResolve = nil), resolve((resolved = value)));
        });
        if (timeout) {
            delay(timeout).then(() => capturedResolve?.(Expired));
        }
    };
    reset();
    const p = assign((...args) => !size(args)
        ? resolved
        : (args[0] === Reset
            ? (args[1] !== T || resolved !== undefined) && reset()
            : currentResolve(args[0]),
            p), {
        then: (...args) => currentPromise.then(...args),
    });
    return p;
};
//# sourceMappingURL=promise.js.map
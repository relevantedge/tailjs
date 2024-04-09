import { F, SSR, T, nil, performance, promise, setTimeout, undefined } from ".";
export const now = (round = T, _tmp) => ((_tmp = SSR ? Date.now() : performance.timeOrigin + performance.now()),
    round ? Math.trunc(_tmp) : _tmp);
export const delay = (ms) => promise((resolve) => setTimeout(resolve, ms));
export const formatDuration = (ms) => ms > 250 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
export const timeout = (callback, delay) => {
    let id = 0;
    let currentCallback = callback;
    let capturedCallback = null;
    const clear = () => ((currentCallback = undefined),
        id < 0 ? clearInterval(-id) : clearTimeout(id),
        (id = 0));
    const timeout = (callback, delay) => {
        clear();
        if (!callback)
            return;
        currentCallback = callback;
        id =
            delay < 0
                ? -setInterval(callback, -delay)
                : setTimeout(() => ((currentCallback = undefined), callback()), delay);
    };
    timeout.clear = (delay, cleanup, currentId = id) => id &&
        (delay
            ? setTimeout(() => id === currentId && (clear(), cleanup?.()), delay)
            : (clear(), cleanup?.()));
    timeout.wait = (delay) => promise((resolve) => timeout(resolve, delay));
    timeout.pulse = () => (currentCallback?.(), timeout);
    timeout.isActive = () => currentCallback != nil;
    timeout.finish = () => (capturedCallback = currentCallback) && (clear(), capturedCallback());
    return callback && timeout(callback, delay), timeout;
};
export const timer = (time = () => now(), started = T) => {
    let elapsed = 0;
    let origin = started ? time() : 0;
    const timer = (start) => {
        if (origin) {
            elapsed += -origin + (origin = time());
        }
        else if (start === T) {
            origin = time();
        }
        if (start === F) {
            origin = 0;
        }
        return elapsed;
    };
    timer.reset = () => (origin && (origin = time()), (elapsed = 0));
    return timer;
};
export const defer = (f, ms = 0) => ms ? setTimeout(f, ms) : window.queueMicrotask(f);
//# sourceMappingURL=time.js.map
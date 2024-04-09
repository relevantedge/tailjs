import { isDefined, isFunction, promise, tryCatchAsync, } from ".";
export let now = () => typeof performance !== "undefined"
    ? Math.trunc(performance.timeOrigin + performance.now())
    : Date.now();
export const timer = (started = true) => {
    let t0 = started ? now() : undefined;
    let elapsed = 0;
    return (toggle) => {
        isDefined(t0) && (elapsed += now() - t0);
        isDefined(toggle) && (t0 = toggle ? Date.now() : undefined);
        return elapsed;
    };
};
export const clock = (callbackOrSettings, frequency = 0) => {
    const settings = isFunction(callbackOrSettings)
        ? {
            frequency,
            callback: callbackOrSettings,
        }
        : callbackOrSettings;
    let { queue = true, paused = false, trigger = false, once = false, callback = () => { }, } = settings;
    frequency = settings.frequency ?? 0;
    let timeoutId = 0;
    const mutex = promise(true).resolve();
    const outerCallback = async (skipQueue) => {
        if (!timeoutId || (!queue && mutex.pending && skipQueue !== true)) {
            return false;
        }
        instance.busy = true;
        if (skipQueue !== true) {
            await mutex;
        }
        mutex.reset();
        let cancelled = frequency < 0 || once;
        await tryCatchAsync(() => callback(() => (cancelled = true)), false, () => mutex.resolve());
        if (cancelled) {
            reset(false);
        }
        instance.busy = false;
        return true;
    };
    const reset = (start) => {
        clearInterval(timeoutId);
        instance.active = !!(timeoutId = start
            ? setInterval(outerCallback, frequency < 0 ? -frequency : frequency)
            : 0);
        return instance;
    };
    const instance = {
        active: false,
        busy: false,
        restart: (newFrequency, newCallback) => {
            frequency = newFrequency ?? frequency;
            callback = newCallback ?? callback;
            return reset(true);
        },
        toggle: (start, trigger) => start !== instance.active
            ? start
                ? trigger
                    ? (reset(true), instance.trigger(), instance)
                    : reset(true)
                : reset(false)
            : instance,
        trigger: async (skipQueue) => (await outerCallback(skipQueue)) && (reset(instance.active), true),
    };
    return instance.toggle(!paused, trigger);
};
//# sourceMappingURL=time.js.map
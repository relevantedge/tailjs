import {
  F,
  MaybePromise,
  T,
  isBoolean,
  isFunction,
  isNotFalse,
  isTrue,
  promise,
  tryCatchAsync,
} from ".";

export let now: (round?: boolean) => number =
  typeof performance !== "undefined"
    ? (round = T) =>
        round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now()
    : Date.now;

export type Timer = {
  (toggle?: boolean, reset?: boolean): number;
};

export const reset = Symbol();

export const createTimer = (
  started = true,
  timeReference = () => now()
): Timer => {
  let t0: number = +started * timeReference();
  let elapsed = 0;
  let capturedElapsed: number;
  return (toggle = started, reset?: boolean) => {
    capturedElapsed = started
      ? (elapsed += -t0 + (t0 = timeReference()))
      : elapsed;
    reset && (elapsed = 0);
    (started = toggle) && (t0 = timeReference());
    return capturedElapsed;
  };
};

/**
 * The callback invoked when a {@link Clock} ticks.
 * If it returns `false` the clock will stop. Any other return value has no effect.
 */
export type ClockCallback = (
  elapsed: number,
  delta: number
) => MaybePromise<any>;

export interface Clock {
  readonly active: boolean;
  readonly busy: boolean;
  restart(frequency?: number, callback?: ClockCallback): Clock;
  toggle(start: boolean, trigger?: boolean): Clock;
  trigger(skipQueue?: boolean): Promise<boolean>;
}

export interface ClockSettings {
  frequency?: number;
  queue?: boolean;
  paused?: boolean;
  trigger?: boolean;
  once?: boolean;
  callback?: ClockCallback;
}

/** Light-weight version of {@link clock}. The trigger and cancel overloads returns true to enable chaining like `timeout(false)&&...` */
export const stickyTimeout = (
  defaultTimeout = 0
): {
  (callback: () => void, timeout?: number): void;
  (cancel: false): true;
  (trigger: true): true;
  (): boolean;
} => {
  let handle: number;
  let currentCallback: (() => void) | undefined;

  const stickyTimeout = (arg?: any, timeout = defaultTimeout) => {
    if (arg === undefined) {
      return !!currentCallback;
    }
    clearTimeout(handle);
    if (isBoolean(arg)) {
      arg && (timeout < 0 ? isNotFalse : isTrue)(currentCallback?.())
        ? stickyTimeout(currentCallback)
        : (currentCallback = undefined);
    } else {
      currentCallback = arg;
      handle = setTimeout(
        () => stickyTimeout(true, timeout),
        timeout < 0 ? -timeout : timeout
      );
    }
  };
  return stickyTimeout as any;
};

export const clock: {
  (callback: ClockCallback, frequency: number): Clock;
  (settings: ClockSettings): Clock;
} = (
  callbackOrSettings: ClockCallback | ClockSettings,
  frequency = 0
): Clock => {
  const settings = isFunction(callbackOrSettings)
    ? {
        frequency,
        callback: callbackOrSettings,
      }
    : callbackOrSettings;

  let {
    queue = true,
    paused = false,
    trigger = false,
    once = false,
    callback = () => {},
  } = settings;
  frequency = settings.frequency ?? 0;

  let timeoutId = 0;
  const mutex = promise(true).resolve();
  const timer = createTimer(!paused);
  let delta = timer();

  const outerCallback = async (skipQueue?: boolean) => {
    if (!timeoutId || (!queue && mutex.pending && skipQueue !== true)) {
      return false;
    }
    (instance as any).busy = true;
    if (skipQueue !== true) {
      await mutex;
    }

    mutex.reset();

    if (
      (await tryCatchAsync(
        () => callback!(timer(), -delta + (delta = timer())),
        false,
        () => mutex.resolve()
      )) === false ||
      frequency <= 0 ||
      once
    ) {
      reset(false);
    }

    return !((instance as any).busy = false);
  };

  const reset = (start: boolean, resetTimer = !start) => {
    timer(start, resetTimer);
    clearInterval(timeoutId);
    (instance as any).active = !!(timeoutId = start
      ? (setInterval(
          outerCallback,
          frequency < 0 ? -frequency : frequency
        ) as any)
      : 0);
    return instance;
  };

  const instance: Clock = {
    active: false,
    busy: false,
    restart: (newFrequency, newCallback) => {
      frequency = newFrequency ?? frequency;
      callback = newCallback ?? callback;
      return reset(true, true);
    },
    toggle: (start, trigger) =>
      start !== instance.active
        ? start
          ? trigger
            ? (reset(true), instance.trigger(), instance)
            : reset(true)
          : reset(false)
        : instance,
    trigger: async (skipQueue) =>
      (await outerCallback(skipQueue)) && (reset(instance.active), true),
  };

  return instance.toggle(!paused, trigger);
};

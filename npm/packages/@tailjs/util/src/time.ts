import { MaybePromise, isBoolean, isFunction, promise, tryCatchAsync } from ".";

export let now = () =>
  typeof performance !== "undefined"
    ? Math.trunc(performance.timeOrigin + performance.now())
    : Date.now();

export type CancellableCallback<Args extends any[] = []> = (
  ...args: [...args: Args, cancel: () => void]
) => MaybePromise<any>;

export type Timer = {
  (): number;
  (toggle: boolean, reset?: boolean): number;
};

export const createTimer = (started = true): Timer => {
  let t0: number | boolean = started && now();
  let elapsed = 0;
  let capturedElapsed: number;
  return (toggle?: boolean, reset?: boolean) => {
    t0 && (elapsed += now() - (t0 as number));
    capturedElapsed = elapsed;
    reset && (elapsed = 0);
    isBoolean(toggle) && (t0 = toggle && now());
    return capturedElapsed;
  };
};

export type ClockCallback = CancellableCallback<[delta: number]>;

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

  const outerCallback = async (skipQueue?: boolean) => {
    if (!timeoutId || (!queue && mutex.pending && skipQueue !== true)) {
      return false;
    }
    (instance as any).busy = true;
    if (skipQueue !== true) {
      await mutex;
    }

    mutex.reset();
    let cancelled = frequency < 0 || once;
    cancelled =
      (await tryCatchAsync(
        () => callback!(timer(), () => (cancelled = true)),
        false,
        () => mutex.resolve()
      )) === false || cancelled;

    if (cancelled) {
      reset(false);
    }

    (instance as any).busy = false;
    return true;
  };

  const reset = (start: boolean) => {
    timer(start, !start);
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
      return reset(true);
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

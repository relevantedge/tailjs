import { MaybePromise, isNumber, promise, tryCatchAsync } from ".";

export let now = () =>
  typeof performance !== "undefined"
    ? Math.trunc(performance.timeOrigin + performance.now())
    : Date.now();

export type CancelableCallback = (cancel: () => void) => MaybePromise<void>;

export interface Clock {
  readonly active: boolean;
  readonly busy: boolean;
  restart(callback?: CancelableCallback, frequency?: number): Clock;
  toggle(start: boolean, trigger?: boolean): Clock;
  trigger(skipQueue?: boolean): Promise<boolean>;
}

export interface ClockSettings {
  frequency?: number;
  queue?: boolean;
  paused?: boolean;
  trigger?: boolean;
}

type ClockSettingsParameter = ClockSettings & { frequency: number };

export const clock: {
  (callback: CancelableCallback, frequency: number): Clock;
  (callback: CancelableCallback, settings: ClockSettingsParameter): Clock;
} = (
  callback: CancelableCallback,
  settings: number | ClockSettingsParameter
): Clock => {
  let {
    queue = true,
    paused = false,
    trigger = false,
    frequency,
  } = isNumber(settings) ? { frequency: settings } : settings;

  let timeoutId = 0;
  const mutex = promise().resolve();

  const outerCallback = async (skipQueue?: boolean) => {
    if (!timeoutId || (!queue && !mutex.resolved && skipQueue !== true)) {
      return false;
    }
    (instance as any).busy = true;
    if (skipQueue !== true) {
      await mutex;
    }

    mutex.reset();
    let cancelled = frequency < 0;
    await tryCatchAsync(
      () => callback(() => (cancelled = true)),
      false,
      () => mutex.resolve()
    );
    if (cancelled) {
      reset(true);
    }

    (instance as any).busy = false;
    return true;
  };

  const reset = (start: boolean) => {
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
    restart: (newCallback, newFrequency) => {
      callback = newCallback ?? callback;
      frequency = newFrequency ?? frequency;
      return newCallback || newFrequency || !timeoutId ? reset(true) : instance;
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
      (await outerCallback(skipQueue)) && (reset(true), true),
  };

  return instance.toggle(!paused, trigger);
};

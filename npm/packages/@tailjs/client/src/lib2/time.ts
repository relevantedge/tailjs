import { isNumber, tryCatchAsync } from "@tailjs/util";
import { MaybePromise, promise } from ".";

export const now = () => Math.trunc(performance.timeOrigin + performance.now());
export type CancelableCallback = () => MaybePromise<void | boolean>;

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
    ((await tryCatchAsync(callback, false, () => mutex.resolve())) === false ||
      frequency < 0) &&
      reset(true);

    (instance as any).busy = false;
    return true;
  };

  const reset = (start: boolean) => {
    clearInterval(timeoutId);
    (instance as any).active = !!(timeoutId = start
      ? setInterval(outerCallback, frequency < 0 ? -frequency : frequency)
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

export const wait = <T = void>(timeout: number = 0, value?: T): Promise<T> =>
  new Promise<any>((resolve) =>
    timeout ? setTimeout(() => resolve(value), timeout) : resolve(value)
  );

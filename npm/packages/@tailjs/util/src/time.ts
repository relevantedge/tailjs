import {
  F,
  MAX_SAFE_INTEGER,
  MaybePromiseLike,
  Nullish,
  T,
  delay,
  isBoolean,
  isFunction,
  isNotFalse,
  isTrue,
  promise,
  throwError,
  tryCatchAsync,
} from ".";

export const MILLISECOND = 1;
export const SECOND = MILLISECOND * 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const FOREVER = MAX_SAFE_INTEGER;

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

export const formatTimestamp = <T extends number | Date | Nullish>(
  value: T,
  formatOptions?: Intl.DateTimeFormatOptions,
  locale?: string | string[]
): T extends Nullish ? T : string =>
  value == null
    ? (value as any)
    : formatOptions
    ? new Date(value.valueOf()).toLocaleString(locale, formatOptions)
    : new Date(value.valueOf()).toISOString();

export const formatDuration = <T extends number | Nullish>(
  ms: number
): T extends Nullish ? T : string => {
  if (ms == null) {
    return ms;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : (`${s}s` as any);
};

/**
 * The callback invoked when a {@link Clock} ticks.
 * If it returns `false` the clock will stop. Any other return value has no effect.
 */
export type ClockCallback = (
  elapsed: number,
  delta: number
) => MaybePromiseLike<any>;

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
  raf?: boolean;
}

/** Light-weight version of {@link clock}. The trigger and cancel overloads returns true to enable chaining like `timeout(false)&&...` */
export const createTimeout = (
  defaultTimeout = 0
): {
  (callback: (elapsed: number) => void, timeout?: number): void;
  (cancel: false): true;
  (trigger: true): true;
  (): boolean;
} => {
  let handle: any;
  let currentCallback: (() => void | boolean) | undefined;

  const stickyTimeout = (arg?: any, timeout = defaultTimeout) => {
    if (arg === undefined) {
      return !!currentCallback;
    }
    clearTimeout(handle);
    if (isBoolean(arg)) {
      arg && (timeout < 0 ? isNotFalse : isTrue)(currentCallback?.())
        ? stickyTimeout(currentCallback, timeout)
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

export type WaitForOptions<T> = {
  pollInterval?: number;
  timeout?: number;
  then?: (item: T, delay: number) => void;
};

export const waitFor: {
  <T extends {}>(
    selector: () => T | null | undefined,
    then: (item: T) => void,
    options?: WaitForOptions<T>
  ): T | Promise<T>;
  <T extends {}>(
    selector: () => T | null | undefined,
    options?: WaitForOptions<T>
  ): T | Promise<T>;
} = (selector: () => any, arg0?: any, arg1?: any) => {
  if (typeof arg0 === "function") {
    return waitFor(selector, { ...arg1, then: arg0 });
  }
  const {
    then,
    timeout = -1,
    pollInterval = 25,
  } = (arg0 as WaitForOptions<any>) ?? {};

  const t0 = now();
  let selected = selector();
  if (selected) {
    then?.(selected, 0);
    return selected;
  }

  return (async () => {
    while (!(selected = selector()) && (timeout <= 0 || now() - t0 < timeout)) {
      await delay(pollInterval);
    }
    return selected
      ? (then?.(selected, now() - t0), selected)
      : throwError(`Target not resolved after ${timeout} ms.`);
  })();
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
    raf,
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
      while (mutex.pending) {
        await mutex;
      }
    }

    !skipQueue && mutex.reset();

    if (
      (await tryCatchAsync(
        () => callback!(timer(), -delta + (delta = timer())),
        false,
        () => !skipQueue && mutex.resolve()
      )) === false ||
      frequency <= 0 ||
      once
    ) {
      reset(false);
    }

    return !((instance as any).busy = false);
  };

  const updateTimeout = () =>
    (timeoutId = setTimeout(
      () => (raf ? requestAnimationFrame(timeoutCallback) : timeoutCallback()),
      frequency < 0 ? -frequency : frequency
    ) as any);

  const timeoutCallback = () => {
    instance.active && outerCallback();
    instance.active && updateTimeout();
  };

  const reset = (start: boolean, resetTimer = !start) => {
    timer(start, resetTimer);
    clearTimeout(timeoutId);
    (instance as any).active = !!(timeoutId = start ? updateTimeout() : 0);
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

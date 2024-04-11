import { Timestamp } from "@tailjs/types";
import { F, SSR, T, nil, performance, promise, setTimeout, undefined } from ".";

export const now: (truncate?: boolean) => number = (
  round = T,
  _tmp?: number
) => (
  (_tmp = SSR ? Date.now() : performance.timeOrigin + performance.now()),
  round ? Math.trunc(_tmp) : _tmp
);

export type Timeout = {
  (): void; // Clear
  (callback: () => void, delay?: number): void;
  clear(delay?: number, cleanup?: () => void): void;
  wait(delay?: number): Promise<void>;
  isActive(): boolean;
  finish(): void;
  pulse(): Timeout;
};

export const delay = (ms: number): Promise<void> =>
  promise((resolve) => setTimeout(resolve, ms));

export const formatDuration = (ms: number) =>
  ms > 250 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

export const timeout = (callback?: () => void, delay?: number): Timeout => {
  let id = 0;
  let currentCallback = callback;
  let capturedCallback: typeof callback | null = null;

  const clear = () => (
    (currentCallback = undefined),
    id < 0 ? clearInterval(-id) : clearTimeout(id),
    (id = 0)
  );

  const timeout = (callback?: () => void, delay?: number) => {
    clear();
    if (!callback) return;

    currentCallback = callback;
    id =
      delay! < 0
        ? -setInterval(callback, -delay!)
        : (setTimeout(
            () => ((currentCallback = undefined), callback()),
            delay
          ) as any);
  };

  timeout.clear = (delay?: number, cleanup?: () => void, currentId = id) =>
    id &&
    (delay
      ? setTimeout(() => id === currentId && (clear(), cleanup?.()), delay)
      : (clear(), cleanup?.()));

  timeout.wait = (delay: number): Promise<void> =>
    promise((resolve) => timeout(resolve, delay));

  timeout.pulse = () => (currentCallback?.(), timeout);

  timeout.isActive = () => currentCallback != nil;
  timeout.finish = () =>
    (capturedCallback = currentCallback) && (clear(), capturedCallback());

  return callback && timeout(callback, delay), timeout;
};

export const timer = (time = () => now(), started = T) => {
  let elapsed = 0;
  let origin = started ? time() : 0;

  const timer = (start?: boolean): Timestamp => {
    if (origin) {
      elapsed += -origin + (origin = time());
    } else if (start === T) {
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

export const defer = (f: VoidFunction, ms = 0) =>
  ms ? setTimeout(f, ms) : window.queueMicrotask(f);

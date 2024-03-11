import {
  Lock,
  clock,
  isDefined,
  isUndefined,
  tryCatchAsync,
  delay,
  tryCatch,
} from "@tailjs/util";
import { TAB_ID, bindStorage } from ".";

export type MaybePromise<T> = T extends PromiseLike<infer T>
  ? MaybePromise<T>
  : T | PromiseLike<T>;

export interface OpenPromise<T = void> extends PromiseLike<T> {
  readonly resolved: (T extends void ? boolean : T) | undefined;
  reset(): OpenPromise<T>;
  resolve(value: T, reset?: boolean): OpenPromise<T>;
  reject(error: any): OpenPromise<T>;
  signal(value: T): OpenPromise<T>;
  wait(timeout: number): Promise<T | undefined>;
}

export const promise = <T = void>(initialValue?: T): OpenPromise<T> => {
  let capturedResolve: (value: T) => void;
  let capturedReject: (value: T) => void;
  let currentPromise: Promise<T>;
  const resetPromise = () => {
    (instance as any).resolved = undefined;
    currentPromise = new Promise<T>(
      (resolve, reject) => (
        (capturedResolve = (value: any) => {
          (instance as any).resolved = !isDefined(value) || value;
          resolve(value);
        }),
        (capturedReject = reject)
      )
    );
  };

  const instance: OpenPromise<T> = {
    resolved: undefined,
    reset: () => (resetPromise(), instance),
    resolve: (value) => (capturedResolve(value), instance),
    reject: (value) => (capturedReject(value), instance),
    signal: (value) => (capturedResolve(value), instance.reset()),
    then: (...args) => currentPromise.then(...args),
    wait: (timeout) => Promise.race([delay(timeout), currentPromise]) as any,
  };
  instance.reset();
  return initialValue ? instance.resolve(initialValue) : instance;
};

export const createLock = <Data = any>(
  id: string,
  timeout = 1000
): Lock<Data> => {
  const storage = bindStorage<[Data | undefined]>(id, timeout);
  let waitHandle = promise();
  storage.observe((value) => {
    if (isUndefined(value)) {
      waitHandle.signal();
    }
  });

  return Object.assign(
    async <T>(action: () => Promise<T>, waitTimeout?: number) => {
      let timeouts = 0;
      while (storage.get()) {
        if (timeouts > 3) {
          throw new Error(`Could not acquire lock after ${timeouts} attempts.`);
        }
        const waitHandleWait = waitHandle.wait(timeout);
        if (isDefined(waitTimeout)) {
          const waitTimeoutWait = delay(waitTimeout, -1);
          if ((await Promise.race([waitHandleWait, waitTimeoutWait])) === -1) {
            return [undefined, false];
          }
        } else {
          await waitHandleWait;
        }
      }
      const refresher = clock({
        frequency: timeout / 2,
        callback: () => {
          storage.update((current) => [current?.[0]]);
        },
        trigger: true,
      });

      let result = await tryCatchAsync(action, true, () => {
        refresher.toggle(false);
        storage.delete();
      });

      return isDefined(waitTimeout) ? [result, true] : result;
    },
    {
      data: {
        get: () => storage.get()?.[0],
        update: (newValue: (current: any) => any) =>
          storage.update((current) => [newValue(current?.[0])] as any),
      },
    }
  );
};

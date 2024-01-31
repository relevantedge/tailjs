import { isDefined, isUndefined, tryCatchAsync } from "@tailjs/util";
import { bindStorage, wait } from ".";

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
    wait: (timeout) => Promise.race([wait(timeout), currentPromise]) as any,
  };
  instance.reset();
  return initialValue ? instance.resolve(initialValue) : instance;
};

export type Lock = <T = void>(action: () => Promise<T> | T) => Promise<T>;

export const createLock = (id: string, timeout = 1000): Lock => {
  const storage = bindStorage<boolean>(id);
  let waitHandle = promise();
  storage.observe((value) => {
    if (isUndefined(value)) {
      waitHandle.signal();
    }
  });

  return async <T>(action: () => Promise<T>) => {
    let timeouts = 0;
    while (storage.get()) {
      if (timeouts > 3) {
        throw new Error(`Could not acquire lock after ${timeouts} attempts.`);
      }
      await waitHandle.wait(timeout);
    }
    storage.update(() => true);
    return await tryCatchAsync(action, true, () => storage.delete());
  };
};

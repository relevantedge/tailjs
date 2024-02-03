import { isDefined } from ".";

export type Lock<D = any> = {
  <T = void>(action: () => Promise<T> | T): Promise<T>;
  <T = void>(action: () => Promise<T> | T, waitTimeout: number): Promise<
    [value: T | undefined, acquired: boolean]
  >;
  data: {
    get(): D | undefined;
    update<Undefined extends undefined | never = never>(
      newValue: (current: D | undefined) => D | Undefined
    ): D | Undefined;
  };
};

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

export const delay = <T = void>(timeout: number = 0, value?: T): Promise<T> =>
  new Promise<any>((resolve) =>
    timeout ? setTimeout(() => resolve(value), timeout) : resolve(value)
  );

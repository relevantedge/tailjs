import { T, assign, delay, nil, size, undefined } from ".";

export const promise: {
  <T>(): Promise<void>;
  <T>(...args: ConstructorParameters<typeof Promise<T>>): Promise<T>;
} = (...args: any[]) =>
  !args.length ? Promise.resolve() : (new Promise(args[0]) as any);

/**
 * Magic value to reset an  {@link OpenPromise}.
 */
export const Reset = Symbol();

export type OpenPromise<T = boolean> = PromiseLike<T> & {
  /**
   * Resolves the promise with the specified value.
   */
  (value: T): OpenPromise<T>;

  /**
   * Resets the promise, optionally only if completed
   */
  (reset: typeof Reset, ifCompleted?: boolean): OpenPromise<T>;

  /**
   * Tests whether the promise is resolved, optionally timed out.
   */
  (): T | undefined;
};

/**
 * Indicates that an {@link OpenPromiseWithTimeout} has timed out.
 */
export const Expired = Symbol();
export type OpenPromiseWithTimeout<T = boolean> = OpenPromise<
  T | typeof Expired
>;

/**
 * Creates a new {@link OpenPromise} or {@link OpenPromiseWithTimeout} if a timeout is specified.
 */
export const openPromise: {
  <T = boolean>(): OpenPromise<T>;
  <T = boolean>(timeout: number): OpenPromiseWithTimeout<T>;
} = (timeout?: number): OpenPromise<any> => {
  let currentResolve: (value: any) => void = nil!;
  let currentPromise: Promise<any> = nil!;
  let resolved: any = undefined;

  const reset = () => {
    resolved = undefined;
    let capturedResolve: ((value: any) => void) | null = nil;

    currentPromise = promise((resolve) => {
      currentResolve = capturedResolve = (value) =>
        capturedResolve &&
        ((capturedResolve = nil), resolve((resolved = value)));
    });

    if (timeout) {
      delay(timeout).then(() => capturedResolve?.(Expired));
    }
  };
  reset();
  const p = assign(
    (...args: any[]): any =>
      !size(args)
        ? resolved
        : (args[0] === Reset
            ? (args[1] !== T || resolved !== undefined) && reset()
            : currentResolve(args[0]),
          p),
    {
      then: (...args: any) => currentPromise.then(...args),
    }
  );

  return p;
};

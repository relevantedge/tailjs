import {
  If,
  MaybePromiseLike,
  MaybeUndefined,
  Nullish,
  TogglePromise,
  Unwrap,
  Wrapped,
  isFunction,
  now,
  throwError,
  tryCatchAsync,
  undefined,
  unwrap,
} from ".";

export class ResettablePromise<T = void, E = any> implements PromiseLike<T> {
  private _promise: OpenPromise<T>;

  constructor() {
    this.reset();
  }

  public get value() {
    return this._promise.value;
  }
  public get error() {
    return this._promise.error;
  }
  public get pending() {
    return this._promise.pending;
  }

  public resolve(value: T, ifPending = false) {
    this._promise.resolve(value, ifPending);
    return this;
  }

  public reject(value?: E, ifPending = false) {
    this._promise.reject(value, ifPending);
    return this;
  }

  public reset() {
    this._promise = new OpenPromise<T>();
    return this;
  }

  public signal(value: T) {
    this.resolve(value);
    this.reset();
    return this;
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }
}

export class OpenPromise<T = void, E = any> implements PromiseLike<T> {
  private readonly _promise: Promise<T>;

  public readonly resolve: (value: T, ifPending?: boolean) => this;
  public readonly reject: (reason: E | undefined, ifPending?: boolean) => this;
  public readonly value: (T extends void ? true : T) | undefined;
  public readonly error: E | true;
  public pending = true;

  constructor() {
    let captured: any[];
    this._promise = new Promise((...args: any[]) => {
      captured = args.map((inner, i) => (value: any, ifPending: boolean) => {
        if (!this.pending) {
          if (ifPending) return this;
          throw new TypeError("Promise already resolved/rejected.");
        }

        (this as any).pending = false;
        (this as any)[i ? "error" : "value"] = value === undefined || value;
        inner(value);
        return this;
      });
    });

    [this.resolve, this.reject] = captured!;
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }
}

export interface Lock {
  /**
   * Wait until the lock is available. If a timeout is not specified or negative, the calling thread will wait indefinitely.
   * If a owner ID is specified the lock will be reentrant for that ID.
   */
  <Ms extends number | undefined = undefined>(
    timeout?: Ms,
    ownerId?: string
  ): Promise<(() => void) | If<Ms, undefined>>;

  /**
   * Performs the specified action when the lock becomes available.
   * If a timeout is not specified or negative, the calling thread will wait indefinitely.
   * If a owner ID is specified the lock will be reentrant for that ID.
   */
  <T, Ms extends number | undefined = undefined>(
    action: () => MaybePromiseLike<T>,
    timeout?: Ms,
    ownerId?: string
  ): Promise<T | If<Ms, undefined>>;
}

export type LockState = [owner: string | boolean, expires?: number];

export const createLock = (timeout?: number): Lock => {
  const semaphore = promise<LockState | boolean>(true);
  let state: LockState | undefined;

  const wait = async (
    arg1?: (() => any) | number,
    arg2?: number | string,
    arg3?: string
  ) => {
    if (isFunction(arg1)) {
      const release = await wait(arg2 as number, arg3);
      return release ? await tryCatchAsync(arg1, true, release) : undefined;
    }
    const ownerId = arg2 as string;

    let ms = arg1 as number;
    let renewInterval: any = 0;
    while (state && ownerId !== state[0] && (state[1] ?? 0)! < now()) {
      if (
        (await (ms >= 0 ? race(delay(ms), semaphore) : semaphore)) === undefined
      ) {
        return undefined;
      }
      // If the above did not return undefined we got the semaphore.
    }

    const release = () => {
      clearTimeout(renewInterval);
      state = undefined;
      semaphore.signal(false);
    };

    const renew = () => {
      state = [ownerId ?? true, timeout ? now() - timeout : undefined];
      timeout &&
        (renewInterval = setTimeout(() => state && renew(), timeout / 2));
    };
    renew();

    return release;
  };
  return wait;
};

export const defer = (f: VoidFunction, ms = 0) =>
  ms > 0 ? setTimeout(f, ms) : window.queueMicrotask(f);

export const delay = <
  Delay extends number | Nullish,
  T extends Wrapped<any> = void
>(
  ms: Delay,
  value?: T
): MaybeUndefined<Delay, TogglePromise<Unwrap<T>, true>> =>
  ms == null || isFinite(ms)
    ? !ms || ms <= 0
      ? unwrap(value)!
      : new Promise<any>((resolve) =>
          setTimeout(async () => resolve(await unwrap(value)), ms)
        )
    : (throwError(`Invalid delay ${ms}.`) as any);

export const promise: {
  <T = void>(resettable?: false): OpenPromise<T>;
  <T = void>(resettable: true): ResettablePromise<T>;
} = (resettable?: boolean) =>
  resettable ? new ResettablePromise() : (new OpenPromise() as any);

type UnwrapPromiseArg<T> = T extends () => infer T ? Awaited<T> : Awaited<T>;
type UnwrapPromiseArgs<T extends any[]> = T extends readonly [infer Arg]
  ? [UnwrapPromiseArg<Arg>]
  : T extends readonly [infer Arg, ...infer Rest]
  ? [UnwrapPromiseArg<Arg>, ...UnwrapPromiseArgs<Rest>]
  : [];

export type AsyncValue<T> =
  | undefined
  | T
  | PromiseLike<T>
  | (() => T)
  | (() => PromiseLike<T>);

export const waitAll = <Args extends AsyncValue<any>[]>(
  ...args: Args
): Promise<UnwrapPromiseArgs<Args>> =>
  Promise.all(args.map((arg) => (isFunction(arg) ? arg() : arg))) as any;

export const race = <Args extends AsyncValue<any>[]>(
  ...args: Args
): Promise<UnwrapPromiseArgs<Args>[number]> =>
  Promise.race(args.map((arg) => (isFunction(arg) ? arg() : arg))) as any;

import {
  If,
  MAX_SAFE_INTEGER,
  MaybePromise,
  Unwrap,
  Wrapped,
  createTimer,
  isDefined,
  isFunction,
  isUndefined,
  now,
  throwError,
  tryCatchAsync,
  undefined,
  unwrap,
} from ".";

export class ResetablePromise<T = void, E = any> implements PromiseLike<T> {
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
        (this as any)[i ? "error" : "value"] = !isDefined(value) || value;
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

export type MutableValue<T> = (value?: T) => T;

export const memoryValue: <T = any>(
  ...args: (undefined extends T ? [] : never) | [value: T]
) => MutableValue<T> =
  (value?: any) =>
  (...args: any) => {
    var b = 4;
    return args.length && (value = args[0]), value as any;
  };

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
    action: () => MaybePromise<T>,
    timeout?: Ms,
    ownerId?: string
  ): Promise<T | If<Ms, undefined>>;
}

export type LockState = [owner: string | boolean, expires?: number];

export const createLock = (
  timeout?: number,
  state: (
    state?: LockState | undefined,
    timeout?: number | undefined
  ) => LockState | undefined = memoryValue<LockState | undefined>()
): Lock => {
  const semaphore = promise<LockState | boolean>(true);

  const t0 = createTimer();
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
    let currentState: LockState | undefined;
    let renewInterval = 0;
    while (
      (currentState = state()) &&
      ownerId !== currentState[0] &&
      (currentState[1] ?? 0)! < now()
    ) {
      if (
        isUndefined(await (ms >= 0 ? race(delay(ms), semaphore) : semaphore))
      ) {
        return undefined;
      }
      ms -= t0(); // If the above did not return undefined we got the semaphore.
    }

    const release = () => (
      clearTimeout(renewInterval), semaphore.signal(state(undefined) ?? false)
    );
    const renew = () => {
      state([ownerId ?? true, timeout ? now() - timeout : undefined], timeout);
      timeout &&
        (renewInterval = setTimeout(
          () => (currentState = state()) && renew(),
          timeout / 2
        ));
    };
    renew();

    return release;
  };
  return wait;
};

export const delay = <T extends Wrapped<any> = void>(
  ms: number | undefined,
  value?: T
): MaybePromise<Unwrap<T>> =>
  isUndefined(ms) || isFinite(ms)
    ? !ms || ms <= 0
      ? unwrap(value)!
      : new Promise<any>((resolve) =>
          setTimeout(async () => resolve(await unwrap(value)), ms)
        )
    : throwError(`Invalid delay ${ms}.`);

export const promise: {
  <T = void>(resetable?: false): OpenPromise<T>;
  <T = void>(resetable: true): ResetablePromise<T>;
} = (resetable?: boolean) =>
  resetable ? new ResetablePromise() : (new OpenPromise() as any);

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

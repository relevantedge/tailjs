import { isDefined, isFunction } from ".";

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

export const delay = <T = void>(ms: number, action?: () => T): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(action?.() as T), ms));

export const promise = <T = void, Resetable extends boolean = false>(
  resetable?: Resetable
): Resetable extends true ? ResetablePromise<T> : OpenPromise<T> =>
  resetable ? new ResetablePromise<T>() : (new OpenPromise<T>() as any);

type UnwrapPromiseArg<T> = T extends () => infer T ? Awaited<T> : Awaited<T>;

type UnwrapPromiseArgs<T extends any[]> = T extends [infer Arg]
  ? [UnwrapPromiseArg<Arg>]
  : T extends [infer Arg, ...infer Rest]
  ? [UnwrapPromiseArg<Arg>, ...UnwrapPromiseArgs<Rest>]
  : [];

export type AsyncValue<T> =
  | T
  | PromiseLike<T>
  | (() => T)
  | (() => PromiseLike<T>);

export const waitAll = <Args extends AsyncValue<any>[]>(
  args: Args
): Promise<UnwrapPromiseArgs<Args>> =>
  Promise.all(args.map((arg) => (isFunction(arg) ? arg() : arg))) as any;

export const race = <Args extends AsyncValue<any>[]>(
  args: Args
): Promise<UnwrapPromiseArgs<Args>[number]> =>
  Promise.race(args.map((arg) => (isFunction(arg) ? arg() : arg))) as any;

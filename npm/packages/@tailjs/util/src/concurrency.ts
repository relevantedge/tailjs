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

  public get value() {
    return this._promise.value;
  }
  public get error() {
    return this._promise.error;
  }
  constructor() {
    this.reset();
  }

  public resolve(value: T, ifPending = false) {
    this._promise.resolve(value, ifPending);
  }
  public reject(value?: E, ifPending = false) {
    this._promise.reject(value, ifPending);
  }

  public reset() {
    this._promise = new OpenPromise<T>();
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

export class OpenPromise<T = void, E = any> extends Promise<T> {
  public readonly resolve: (value: T, ifPending?: boolean) => T;
  public readonly reject: (reason: E | undefined, ifPending?: boolean) => E;
  public readonly value: (T extends void ? true : T) | undefined;
  public readonly error: E | true;
  public readonly pending = true;

  constructor() {
    super((...args: any[]) => {
      [(this as any).resolve, (this as any).reject] = args.map(
        (inner, i) => (value: any, ifPending: boolean) => {
          if (!this.pending) {
            if (ifPending) return;
            throw new TypeError("Promise already resolved/rejected.");
          }

          (this as any).pending = false;
          (this as any)[i ? "error" : "value"] = !isDefined(value) || value;
          inner(value);
          return this;
        }
      );
    });
  }
}

export const delay = <T = void>(ms: number, action?: () => T): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(action?.() as T), ms));

export const promise = <T, Resetable extends boolean = false>(
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

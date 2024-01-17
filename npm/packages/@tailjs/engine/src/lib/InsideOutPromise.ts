export class InsideOutPromise<T> implements PromiseLike<T> {
  private _error: any = undefined;
  private _promise: Promise<T>;
  private _reject: (error: any) => void;
  private _resolve: (value: T) => void;
  private _value: T | undefined = undefined;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  public get error() {
    return this._error;
  }

  public get value() {
    return this._value;
  }

  public reject(error: any) {
    this._reject(error);
  }

  public resolve(value: T) {
    this._resolve(value);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): PromiseLike<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }
}

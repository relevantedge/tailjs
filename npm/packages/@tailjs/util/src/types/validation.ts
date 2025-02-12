import {
  Defined,
  Falsish,
  If,
  IsAny,
  MaybePromiseLike,
  NotFunction,
  Nullish,
  OmitNullish,
  TogglePromise,
  UnwrapPromiseLike,
  Wrapped,
  isArray,
  isAwaitable,
  isBoolean,
  isError,
  isFunction,
  isPlainObject,
  isString,
  unwrap,
} from "..";

export type ErrorGenerator = string | Error | (() => string | Error);

export const throwError = (
  error: ErrorGenerator,
  transform: (string: string) => Error = (message) => new Error(message)
): never => {
  throw isString((error = unwrap(error))) ? transform(error) : error;
};
export const throwTypeError = (message: string): never =>
  throwError(new TypeError(message));

type CombineTypeTests<T> = T extends []
  ? {}
  : T extends [infer F, ...infer Rest]
  ? F extends (value: any) => value is infer R
    ? (IsAny<R> extends true ? T : R) & CombineTypeTests<Rest>
    : never
  : never;

export const validate = <
  T,
  Validator extends
    | ((candidate: T) => candidate is any)
    | ((candidate: T) => R)
    | [
        validate: (candidate: T) => any,
        ...typeTests: ((candidate: T) => candidate is any)[]
      ]
    | (R & NotFunction),
  R
>(
  value: T,
  validate: Validator | R,
  validationError?: ErrorGenerator,
  undefinedError?: ErrorGenerator
): Defined<
  If<
    IsAny<Validator>,
    T,
    Validator extends readonly [any, ...infer TypeTests]
      ? CombineTypeTests<TypeTests>
      : Validator extends ((value: any) => infer R) | infer R
      ? R extends Falsish
        ? never
        : Validator extends (value: any) => value is infer R
        ? Defined<R>
        : T
      : never
  >
> =>
  (
    isArray(validate)
      ? validate.every((test) => test(value))
      : isFunction(validate)
      ? validate(value)
      : validate
  )
    ? value
    : required(value, undefinedError ?? validationError) &&
      (throwError(validationError ?? "Validation failed.") as any);

export class InvariantViolatedError extends Error {
  constructor(invariant?: string) {
    super(invariant ? "INV: " + invariant : "An invariant was violated.");
  }
}

export const structuralEquals = (
  value1: any,
  value2: any,
  depth = -1
): boolean => {
  if (value1 === value2) return true;
  // interpret `null` and `undefined` as the same.
  if ((value1 ?? value2) == null) return true;

  if (
    isPlainObject(value1) &&
    isPlainObject(value2) &&
    value1.length === value2.length
  ) {
    let n = 0;
    for (const key in value1) {
      if (
        value1[key] !== value2[key] &&
        !structuralEquals(value1[key], value2[key], depth - 1)
      ) {
        return false;
      }
      ++n;
    }
    return n === Object.keys(value2).length;
  }
  return false;
};

/** Tests whether a value equals at least one of some other values.  */
export const equalsAny: <T extends readonly any[]>(
  target: any,
  ...values: T
) => target is T[number] = ((
  target: any,
  singleValue: any,
  ...otherValues: any
) =>
  target === singleValue ||
  (otherValues.length > 0 &&
    otherValues.some((value: any) => equalsAny(target, value)))) as any;

/**
 * States an invariant.
 */
export const invariant = <T>(
  test: Wrapped<T | false>,
  description?: string
): Defined<T> => {
  const valid = unwrap(test);
  return valid != null && valid !== false
    ? (valid as any)
    : throwError(new InvariantViolatedError(description));
};

export const required = <T>(value: T, error?: ErrorGenerator): OmitNullish<T> =>
  value != null
    ? (value as any)
    : throwError(
        error ?? "A required value is missing",
        (text) => new TypeError(text.replace("...", " is required."))
      );

export const tryCatch = <T, E = true>(
  expression: () => T,
  errorHandler: E | (boolean | ((error?: any) => any) | Nullish) = true as any,
  always?: () => void
):
  | T
  | (E extends Nullish | true
      ? never
      : E extends false
      ? undefined
      : E extends (...args: any) => infer R
      ? R extends Error
        ? never
        : R extends void
        ? undefined
        : R
      : E) => {
  try {
    return expression();
  } catch (e) {
    return isFunction(errorHandler)
      ? isError((e = errorHandler(e)))
        ? throwError(e)
        : e
      : isBoolean(errorHandler)
      ? console.error(errorHandler ? throwError(e) : e)
      : (errorHandler as any);
  } finally {
    always?.();
  }
};

export type ErrorHandler = Nullish | boolean | ((error: any) => any);
type ErrorHandlerResult<Handler> = Handler extends true
  ? never
  : Handler extends (...args: any) => infer R
  ? TogglePromise<UnwrapPromiseLike<R> extends Error ? never : R, R>
  : void;

const maybeAwait = <T, R>(
  value: MaybePromiseLike<T>,
  action: (value: T) => R
): R => (value as any)?.then(action) ?? action(value as any);

const handleError = <Handler extends ErrorHandler>(
  errorHandler: Handler,
  error: any,
  log = true
): ErrorHandlerResult<Handler> =>
  errorHandler === false
    ? undefined
    : errorHandler === true ||
      errorHandler == null ||
      isError((error = errorHandler(error)))
    ? maybeAwait(
        error,
        (error) => (log && console.error(error), throwError(error))
      )
    : error;

type DeferredProperties<T> = { resolved?: Awaited<T> };

type NotDeferred = { resolved?: undefined };

export type Deferred<T> = (() => T) & DeferredProperties<T>;

export type DeferredAsync<T> = Deferred<MaybePromiseLike<T>>;

export type MaybeDeferred<T> = (T & NotDeferred) | Deferred<T>;
export type MaybeDeferredAsync<T> =
  | ((T | PromiseLike<T>) & NotDeferred)
  | DeferredAsync<T>;

export const resolveDeferred: {
  <T>(value: Deferred<T>): T;
  <T>(value: T): T;
} = (value: Deferred<any>) =>
  isFunction(value) ? (value as any)?.resolved ?? value() : value;

/** A value that is initialized lazily on-demand. */
export const deferred = <T>(
  expression: Wrapped<T>
): T extends PromiseLike<infer T> ? DeferredAsync<T> : Deferred<T> => {
  let result: any;
  const getter = (() => {
    if (getter.initialized || result) {
      // Result may either be the resolved value or a pending promise for the resolved value.
      return result;
    }
    result = unwrap(expression) as any;
    if (result.then) {
      return (result = result.then((resolvedValue: any) => {
        getter.initialized = true;
        return (getter.resolved = result = resolvedValue);
      }));
    }
    getter.initialized = true;
    return (getter.resolved = result);
  }) as any;
  return getter;
};

export const asDeferred = <T extends MaybeDeferred<any>>(
  deferredOrResolved: T
): T extends Deferred<any> ? T : Deferred<T> =>
  isFunction(deferredOrResolved)
    ? deferredOrResolved
    : (Object.assign(() => deferredOrResolved, {
        resolved: isAwaitable(deferredOrResolved)
          ? undefined
          : deferredOrResolved,
      }) as any);

class DeferredPromise<T> extends Promise<T> {
  private readonly _action: () => Promise<T>;
  private _result: Promise<T>;

  public get initialized() {
    return this._result != null;
  }

  constructor(action: () => Promise<T>) {
    super(() => {});
    this._action = action;
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
  ): Promise<TResult1 | TResult2> {
    return (this._result ??= this._action()).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): Promise<T | TResult> {
    return (this._result ??= this._action()).catch(onrejected);
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return (this._result ??= this._action()).finally(onfinally);
  }
}

export type MaybeDeferredPromise<T> =
  | (T & { initialized?: boolean })
  | DeferredPromise<T>;

/**
 * A promise that is initialized lazily on-demand.
 * For promises this is more convenient than {@link deferred}, since it just returns a promise instead of a function.
 */
export const deferredPromise = <T>(
  expression: Wrapped<MaybePromiseLike<T>>
): DeferredPromise<T> => new DeferredPromise(async () => unwrap(expression));

export const formatError = (error: any, includeStackTrace?: boolean): string =>
  !error
    ? "(unspecified error)"
    : includeStackTrace && error.stack
    ? `${formatError(error, false)}\n${error.stack}`
    : error.message
    ? `${error.name}: ${error.message}`
    : "" + error;

export const tryCatchAsync = async <
  T,
  C,
  E extends boolean | ((error: any) => MaybePromiseLike<C>),
  T1 = T
>(
  expression: Wrapped<MaybePromiseLike<T>>,
  errorHandler: E = true as any,
  always?: () => MaybePromiseLike<any>
): Promise<T1 | (E extends true ? never : C)> => {
  try {
    return (await unwrap(expression)) as any;
  } catch (e) {
    if (!isBoolean(errorHandler)) {
      return (await errorHandler(e)) as any;
    } else if (errorHandler) {
      throw e;
    }
    // `false` means "ignore".
    console.error(e);
  } finally {
    await always?.();
  }

  return undefined as any;
};

/**
 *  No-op function to validate types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 */
export const restrict: {
  <T>(item: T): T;
} = (item: any) => item as any;

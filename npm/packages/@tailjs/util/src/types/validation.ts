import {
  Defined,
  Extends,
  Falsish,
  IDENTITY,
  If,
  IsAny,
  MaybePromise,
  NotFunction,
  Nullish,
  OmitNullish,
  TogglePromise,
  Unwrap,
  UnwrapPromiseLike,
  Wrapped,
  isAnyObject,
  isArray,
  isBoolean,
  isDefined,
  isError,
  isFunction,
  isString,
  unwrap,
} from "..";

export type ErrorGenerator = string | Error | (() => string | Error);

export const throwError = (
  error: ErrorGenerator,
  transform: (string: string) => Error = (message) => new TypeError(message)
): never => {
  throw isString((error = unwrap(error))) ? transform(error) : error;
};

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

export const structuresEqual = (
  value1: any,
  value2: any,
  depth = -1
): boolean => {
  if (value1 === value2) return true;
  // interpret `null` and `undefined` as the same.
  if ((value1 ?? value2) == null) return true;

  if (
    isAnyObject(value1) &&
    isAnyObject(value2) &&
    value1.length === value2.length
  ) {
    let n = 0;
    for (const key in value1) {
      if (
        value1[key] !== value2[key] &&
        !structuresEqual(value1[key], value2[key], depth - 1)
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
export const eq: <T extends readonly any[]>(
  target: any,
  ...values: T
) => target is T[number] = ((
  target: any,
  singleValue: any,
  ...otherValues: any
) =>
  target === singleValue ||
  (otherValues.length > 0 &&
    otherValues.some((value: any) => eq(target, value)))) as any;

/**
 * States an invariant.
 */
export const invariant = <T>(
  test: Wrapped<T | false>,
  description?: string
): Defined<T> => {
  const valid = unwrap(test);
  return isDefined(valid) && valid !== false
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

export const tryCatch = <T, C = undefined>(
  expression: () => T,
  errorHandler: boolean | ((error: any) => C) = true as any,
  always?: () => void
): T | (C extends Error ? T : C) => {
  try {
    return expression();
  } catch (e) {
    if (!isBoolean(errorHandler)) {
      const error = errorHandler?.(e) as any;
      if (error instanceof Error) throw error;
      return error;
    }
    if (errorHandler) {
      throw e;
    }
    console.error(e);
    return undefined as any;
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

const maybeAwait = <T, R>(value: MaybePromise<T>, action: (value: T) => R): R =>
  (value as any)?.then(action) ?? action(value as any);

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

/** A value that is initialized lazily on-demand. */
export const deferred = <T>(expression: Wrapped<T>): (() => T) => {
  let result: T | undefined = undefined;
  return () => (result ??= unwrap(expression));
};

export interface DeferredPromise<T> extends PromiseLike<T> {
  initialized: boolean;
}

export type MaybeDeferredPromise<T> =
  | (T & { initialized?: boolean })
  | DeferredPromise<T>;

/**
 * A promise that is initialized lazily on-demand.
 * For promises this is more convenient than {@link deferred}, since it just returns a promise instead of a function.
 */
export const deferredPromise = <T>(
  expression: Wrapped<MaybePromise<T>>
): DeferredPromise<T> => {
  let promise: DeferredPromise<T> = {
    initialized: true,
    then: thenMethod(() => ((promise.initialized = true), unwrap(expression))),
  };
  return promise;
};

export const thenMethod = <T>(
  expression: Wrapped<MaybePromise<T>>
): (<TResult1 = T, TResult2 = never>(
  onfulfilled?:
    | ((value: T) => TResult1 | PromiseLike<TResult1>)
    | undefined
    | null,
  onrejected?:
    | ((reason: any) => TResult2 | PromiseLike<TResult2>)
    | undefined
    | null
) => PromiseLike<TResult1 | TResult2>) => {
  let result = deferred(expression);
  return (onfullfilled?, onrejected?) =>
    tryCatchAsync(result, [onfullfilled, onrejected] as any);
};

export const tryCatchAsync = async <
  T,
  C = void,
  E extends boolean | ((error: any) => MaybePromise<C>) = true,
  T1 = T
>(
  expression: Wrapped<MaybePromise<T>>,
  errorHandler: E = true as any,
  always?: () => void
): Promise<T1 | C> => {
  try {
    const result = (await unwrap(expression)) as any;
    return isArray(errorHandler) ? errorHandler[0]?.(result) : result;
  } catch (e) {
    if (!isBoolean(errorHandler)) {
      if (isArray(errorHandler)) {
        if (!errorHandler[1]) throw e;
        return errorHandler[1](e) as any;
      }

      const error = (await (errorHandler as any)?.(e)) as any;
      if (error instanceof Error) throw error;
      return error;
    } else if (errorHandler) {
      throw e;
    } else {
      // Boolean  means "swallow".
      console.error(e);
    }
  } finally {
    always?.();
  }

  return undefined as any;
};

/**
 *  No-op function to validate types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 *
 */
export const restrict: {
  <T extends any[] | undefined>(
    item: T extends (infer T)[] ? T : undefined
  ): T extends (infer T)[] ? T : undefined;
  <T>(item: T): T;
} = (item: any) => item as any;

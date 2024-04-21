import {
  Defined,
  Falsish,
  IsAny,
  MaybePromise,
  NotFunction,
  OmitNullish,
  Wrapped,
  hasProperty,
  isArray,
  isBoolean,
  isDefined,
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
    | ((candiate: T) => R)
    | [
        validate: (candiate: T) => any,
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
  Validator extends [any, ...infer TypeTests]
    ? CombineTypeTests<TypeTests>
    : Validator extends ((value: any) => infer R) | infer R
    ? R extends Falsish
      ? never
      : Validator extends (value: any) => value is infer R
      ? IsAny<R> extends true
        ? T
        : Defined<R>
      : T
    : never
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
    otherValues.some((value) => target === value))) as any;

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
  clean?: () => void
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
    clean?.();
  }
};

export const thenable = <T>(
  expression: Wrapped<MaybePromise<T>>
): PromiseLike<T> => ({
  then: thenMethod(expression),
});

export const thenMethod =
  <T>(
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
  ) => PromiseLike<TResult1 | TResult2>) =>
  (onfullfilled?, onrejected?) =>
    tryCatchAsync(expression, [onfullfilled, onrejected]);

export const tryCatchAsync = async <
  T,
  C = void,
  E extends
    | boolean
    | ((error: any, last: boolean) => MaybePromise<C>)
    | readonly [
        onfullfilled?: ((value: T) => MaybePromise<T1>) | undefined | null,
        onrejected?: ((reason: any) => MaybePromise<C>) | null | undefined
      ] = true,
  T1 = T
>(
  expression: Wrapped<MaybePromise<T>>,
  errorHandler: E = true as any,
  clean?: () => void,
  retries = 1
): Promise<T1 | C> => {
  while (retries--) {
    try {
      const result = (await unwrap(expression)) as any;
      return isArray(errorHandler) ? errorHandler[0]?.(result) : result;
    } catch (e) {
      if (!isBoolean(errorHandler)) {
        if (isArray(errorHandler)) return errorHandler[1]?.(e) as any;

        const error = (await errorHandler?.(e, !retries)) as any;
        if (error instanceof Error) throw error;
        return error;
      } else if (errorHandler && !retries) {
        throw e;
      } else {
        console.error(e);
      }
    } finally {
      clean?.();
    }
  }
  return undefined as any;
};

/**
 *  No-op function to validate types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 *
 */
export const restrict: {
  <T extends any[] | undefined>(item: T extends (infer T)[] ? T : never);
  <T>(item: T): T;
} = (item: any) => item as any;

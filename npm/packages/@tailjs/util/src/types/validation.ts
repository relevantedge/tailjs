import {
  Defined,
  Falsish,
  IsAny,
  NotFunction,
  OmitNullish,
  Wrapped,
  isArray,
  isBoolean,
  isDefined,
  isFunction,
  isString,
  unwrap,
} from "..";

export type ErrorGenerator = string | Error | (() => string | Error);

export const throwError = <T = any>(
  error: ErrorGenerator,
  transform: (string: string) => Error = (message) => new TypeError(message)
): T => {
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

export const tryCatchAsync = async <T, C = void>(
  expression: () => PromiseLike<T> | T,
  errorHandler:
    | boolean
    | ((error: any, last: boolean) => Promise<C> | C) = true as any,
  clean?: () => void,
  retries = 1
): Promise<T | C> => {
  while (retries--) {
    try {
      return await expression();
    } catch (e) {
      if (!isBoolean(errorHandler)) {
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

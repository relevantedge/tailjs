import { Nullish, throwError } from "@tailjs/util";
import { SchemaValidationContext, SchemaValueValidator } from ".";

export type ValidationErrorContext = {
  path: string;
  message: string;
  source: any;
  forbidden?: boolean;
};

export const VALIDATION_ERROR_SYMBOL = Symbol();

export const joinPath = (prefix: string, current: string) =>
  current?.length ? prefix + (current[0] === "[" ? "" : ".") + current : prefix;

export const pushInnerErrors = <T>(
  prefix: string,
  value: T,
  current: any,
  context: SchemaValidationContext,
  errors: ValidationErrorContext[],
  validatable: { validate: SchemaValueValidator }
): T | typeof VALIDATION_ERROR_SYMBOL => {
  const innerErrors: ValidationErrorContext[] = [];
  if (
    value != null &&
    ((value = validatable.validate(
      value,
      current,
      context,
      innerErrors
    ) as any) === VALIDATION_ERROR_SYMBOL ||
      innerErrors.length)
  ) {
    errors.push(
      ...innerErrors.map((error) => ({
        ...error,
        path: joinPath(prefix, error.path),
      }))
    );
  }
  return value;
};

export class ValidationError extends Error {
  constructor(errors: ValidationErrorContext[], message?: string) {
    super((message ? message + ":\n" : "") + formatValidationErrors(errors));
  }
}

export const handleValidationErrors = <
  R,
  Collected extends ValidationErrorContext[] | Nullish
>(
  action: (
    errors: ValidationErrorContext[]
  ) => R | typeof VALIDATION_ERROR_SYMBOL,
  collectedErrors?: Collected,
  message?: string
): Collected extends Nullish
  ? Exclude<R, typeof VALIDATION_ERROR_SYMBOL>
  : R => {
  const errors: ValidationErrorContext[] = collectedErrors ?? [];

  const result = action(errors);
  if (
    !collectedErrors &&
    (result === VALIDATION_ERROR_SYMBOL || errors.length)
  ) {
    throw new ValidationError(errors, message);
  }
  return result as any;
};

export const formatValidationErrors = (
  errors: readonly ValidationErrorContext[]
): string | undefined => {
  if (!errors.length) return "(unspecified error)";

  const formatted = (errors.length > 10 ? errors.slice(0, 10) : errors).map(
    ({ path, message }) => (path ? `${path}: ${message}` : message)
  );
  if (errors.length > 10) {
    formatted.push("", `(and ${errors.length - 10} more)`);
  }
  return formatted.join("\n");
};

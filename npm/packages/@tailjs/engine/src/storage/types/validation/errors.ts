import { SchemaValidationContext, SchemaValueValidator } from ".";

export type SchemaValidationError = {
  path: string;
  message: string;
  source: any;
  security?: boolean;
};

export const VALIDATION_ERROR = Symbol();

export const joinPath = (prefix: string, current: string) =>
  current.length ? prefix + (prefix[0] === "[" ? "" : ".") + current : prefix;

export const pushInnerErrors = (
  prefix: string,
  value: any,
  current: any,
  context: SchemaValidationContext,
  errors: SchemaValidationError[],
  validatable: { validate: SchemaValueValidator }
) => {
  const innerErrors: SchemaValidationError[] = [];
  if (
    (value = validatable.validate(value, current, context, innerErrors)) ===
    VALIDATION_ERROR
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

export const formatValidationErrors = (
  errors: readonly SchemaValidationError[]
): string | undefined => {
  if (!errors.length) return undefined;

  const formatted = errors.map(({ path, message }) =>
    path ? path + ": " + message : message
  );
  return formatted.join("\n");
};

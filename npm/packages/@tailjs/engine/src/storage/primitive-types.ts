import {
  SchemaArrayType,
  SchemaPrimitiveType,
  SchemaRecordType,
} from "@tailjs/types";
import { ValidatableSchemaEntity, VALIDATION_ERROR } from "..";
import { enumerate } from "@tailjs/util";

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}Z$/;
const REGEX_DATETIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?)?Z$/;
const REGEX_GUID =
  /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

const REGEX_URI =
  /^(?:(?:([\w+.-]+):)?(\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/;
const REGEX_EMAIL =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\[(([0-9.]+)|([0-9a-f:]+))\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/;

export type SchemaPrimitiveValueValidator = (
  value: any,
  errors: any[]
) => any | null;

const addError = (errors: string[], value: any, message: string) => (
  errors.push(`${JSON.stringify(value)} ${message}.`), VALIDATION_ERROR
);

const primitiveValidators: Record<string, SchemaPrimitiveValueValidator> = {};
export const getPrimitiveTypeValidator = (
  type: SchemaPrimitiveType
): {
  validator: SchemaPrimitiveValueValidator;
  enumValues: any[] | undefined;
} => {
  let validator = (primitiveValidators[type.primitive] ??= create(
    type.primitive
  ));

  const maxLength = type["maxLength"];
  if (maxLength != null) {
    const inner = validator;
    validator = (value, errors) =>
      (value = inner(value, errors)) === VALIDATION_ERROR
        ? value
        : value.length > maxLength
        ? addError(
            errors,
            value,
            `exceeds the maximum allowed ${maxLength} number of characters`
          )
        : value;
  }
  const min = type["min"],
    max = type["max"];
  if (min != null || max != null) {
    const errorMessage =
      min != null
        ? max != null
          ? `between ${min} and ${max}`
          : `at least ${min}`
        : `at most ${max}`;
    const inner = validator;
    validator = (value, errors) =>
      (value = inner(value, errors)) === VALIDATION_ERROR
        ? value
        : (min == null || value >= min) && (max == null || value <= max)
        ? value
        : addError(errors, value, errorMessage);
  }

  let enumValues: Set<any> | undefined;
  if ("enum" in type) {
    const inner = validator;
    enumValues = new Set(
      (Array.isArray(type.enum) ? type.enum : [type.enum]).map((value) => {
        const errors = [];
        if ((value = inner(value, errors) === VALIDATION_ERROR)) {
          throw new TypeError(errors[0]);
        }
        return value;
      })
    );

    if (!enumValues.size) {
      throw new TypeError(
        "At least one const value to test against is required."
      );
    }

    const errorMessage = enumerate(
      (type.enum as any[]).map((value: any) => JSON.stringify(value), ["or"])
    );

    validator = (value, errors) =>
      (value = inner(value, errors)) === VALIDATION_ERROR
        ? value
        : enumValues!.has(value)
        ? value
        : addError(errors, value, errorMessage);
  }
  return { validator, enumValues: enumValues ? [...enumValues] : undefined };

  function create(
    type: SchemaPrimitiveType["primitive"]
  ): SchemaPrimitiveValueValidator {
    switch (type) {
      case "boolean":
        return (value, errors) =>
          typeof value === "boolean"
            ? value
            : addError(errors, value, "is not a valid Boolean");

      case "date":
        return (value, errors) =>
          REGEX_DATE.test(value) && !isNaN(new Date(value).valueOf())
            ? value
            : addError(errors, value, "is not a valid ISO8601 date");

      case "datetime":
        return (value, errors) => {
          if (typeof value === "number") {
            if (!Number.isInteger(value))
              return addError(errors, value, "is not a valid UNIX timestamp");
          } else if (
            !REGEX_DATETIME.test(value) &&
            isNaN(new Date(value).valueOf())
          ) {
            return addError(
              errors,
              value,
              "is not a valid ISO 8601 UTC date/time"
            );
          }

          return new Date(value).toISOString();
        };

      case "duration":
        return (value, errors) =>
          typeof value === "number" && Number.isInteger(value)
            ? value
            : addError(
                errors,
                value,
                "is not a valid duration (must be provided as milliseconds)"
              );

      case "integer":
        return (value, errors) =>
          Number.isInteger(value)
            ? value
            : addError(errors, value, "is not a valid integer");

      case "number":
        return (value, errors) =>
          typeof value === "number"
            ? value
            : addError(errors, value, "is not a valid number");
      case "string":
        return (value, errors) =>
          typeof value === "string"
            ? value
            : addError(errors, value, "is not a valid string");

      case "uuid":
        return (value, errors) =>
          REGEX_GUID.exec(value)?.[1].toLowerCase() ??
          addError(errors, value, "is not a valid UUID");

      case "uri":
        return (value, errors) =>
          REGEX_URI.test(value)
            ? value
            : addError(errors, value, "is not a valid URI");

      case "url":
        return (value, errors) => {
          const match = REGEX_URI.exec(value);
          if (!match) return addError(errors, value, "is not a valid URL");
          return match[2]
            ? value
            : addError(
                errors,
                value,
                "is not a valid URL (it is a URI, but a URL is required)"
              );
        };
      case "email":
        return (value, errors) =>
          REGEX_EMAIL.test(value)
            ? value.toLowerCase()
            : addError(errors, value, "is not a valid email address");

      default:
        throw new TypeError(`'${type}' is not a supported primitive type.`);
    }
  }
};

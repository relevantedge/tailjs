import { distinct2, itemize2 } from "@tailjs/util";
import {
  SchemaEnumTypeDefinition,
  SchemaPrimitiveTypeDefinition,
  SchemaValidationError,
  VALIDATION_ERROR_SYMBOL,
} from "../../../..";
import { formatErrorSource } from ".";

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?)?Z$/;
const REGEX_DATETIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?)?Z$/;
const REGEX_UUID =
  /^\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\}?$/;

const REGEX_URI =
  /^(?:(?:([\w+.-]+):)(\/\/)?)((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))(?::(\d*))?)(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/;
const REGEX_EMAIL =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\[(([0-9.]+)|([0-9a-f:]+))\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/;

export type SchemaPrimitiveValueValidator = (
  value: any,
  errors: SchemaValidationError[]
) => any | null;

const addError = (
  errors: SchemaValidationError[],
  value: any,
  message: string
) => (
  errors.push({
    path: "",
    type: null,
    source: value,
    message: `${formatErrorSource(value)} ${message}.`,
  }),
  VALIDATION_ERROR_SYMBOL
);

const isNumber = (value: any, integer: boolean, allowStrings: boolean) =>
  (typeof value === "number" &&
    // Only actual numbers. IEEE 754 stuff like NaN is not supported in JSON so also not here.
    ((!integer && Number.isFinite(value) && !Number.isNaN(value)) ||
      Number.isInteger(value))) ||
  (allowStrings &&
    typeof value === "string" &&
    isNumber(integer ? parseInt(value) : parseFloat(value), integer, false));

const primitiveValidators: Record<string, SchemaPrimitiveValueValidator> = {};
export const getPrimitiveTypeValidator = (
  type: SchemaPrimitiveTypeDefinition | SchemaEnumTypeDefinition,
  allowNumericStrings = false
): {
  validator: SchemaPrimitiveValueValidator;
  primitive: SchemaPrimitiveTypeDefinition["primitive"];
  enumValues: Set<string | number> | undefined;
} => {
  let primitive =
    type.primitive ?? (type.primitive = typeof (type.enum?.[0] ?? "") as any);

  let validator = (primitiveValidators[
    type.primitive + "-" + (type["format"] ?? "") + "-" + allowNumericStrings
  ] ??= create(type as SchemaPrimitiveTypeDefinition, allowNumericStrings));

  const maxLength = type["maxLength"];
  if (maxLength != null) {
    const inner = validator;
    validator = (value, errors) =>
      (value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL
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
      (value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL
        ? value
        : (min == null || value >= min) && (max == null || value <= max)
        ? value
        : addError(errors, value, errorMessage);
  }

  let enumValues: Set<any> | undefined;
  if ("enum" in type) {
    const inner = validator;
    enumValues = new Set(
      (Array.isArray(type.enum) ? type.enum : [type.enum]).map((value: any) => {
        const errors = [];
        if ((value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL) {
          throw new TypeError(errors[0]);
        }
        return value;
      })
    );

    if (!enumValues.size) {
      throw new TypeError(
        "At least one enum value to test against is required."
      );
    }

    const errorMessage =
      "is not the constant value " +
      itemize2(
        (type.enum as any[]).map((value: any) => JSON.stringify(value)),
        "or"
      );

    validator = (value, errors) =>
      (value = inner(value, errors)) === VALIDATION_ERROR_SYMBOL
        ? value
        : enumValues!.has(value)
        ? value
        : addError(errors, value, errorMessage);
  }
  return {
    validator,
    primitive,
    enumValues: distinct2(enumValues),
  };
};

function create(
  type: SchemaPrimitiveTypeDefinition,
  allowNumericStrings: boolean
): SchemaPrimitiveValueValidator {
  switch (type.primitive) {
    case "boolean":
      return (value, errors) =>
        typeof value === "boolean"
          ? value
          : addError(errors, value, "is not a Boolean");

    case "date":
      return (value, errors) =>
        value && REGEX_DATE.test(value) && !isNaN(+new Date(value))
          ? value
          : addError(
              errors,
              value,
              "is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)"
            );

    case "timestamp":
    case "datetime":
      const iso =
        "format" in type
          ? type.format !== "unix"
          : type.primitive === "datetime";
      return (value, errors) => {
        if (!value || isNumber(value, false, allowNumericStrings)) {
          if (!isNumber(value, true, allowNumericStrings)) {
            return addError(errors, value, "is not a valid UNIX timestamp");
          }
          value = +value;
        } else if (!REGEX_DATETIME.test(value) || isNaN(+new Date(value))) {
          return addError(
            errors,
            value,
            "is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)"
          );
        }

        value = new Date(value);
        return iso ? new Date(value).toISOString() : +value;
      };

    case "duration":
      return (value, errors) =>
        isNumber(value, true, allowNumericStrings)
          ? +value
          : addError(
              errors,
              value,
              "is not a valid duration (must be provided as milliseconds)"
            );

    case "integer":
      return (value, errors) =>
        isNumber(value, true, allowNumericStrings)
          ? +value
          : addError(errors, value, "is not a valid integer");

    case "number":
      return (value, errors) =>
        isNumber(value, false, allowNumericStrings)
          ? value
          : addError(errors, value, "is not a number");

    case "string":
      switch (type.format) {
        case "uri":
          return (value, errors) =>
            typeof value === "string" && REGEX_URI.test(value)
              ? value
              : addError(errors, value, "is not a valid URI");

        case "url":
          return (value, errors) => {
            const match = typeof value === "string" && REGEX_URI.exec(value);
            if (!match) return addError(errors, value, "is not a valid URL");
            return match[2]
              ? value
              : addError(
                  errors,
                  value,
                  "is not a valid URL (it is a URI, but a URL is required)"
                );
          };
        case "urn":
          return (value, errors) => {
            const match = typeof value === "string" && REGEX_URI.exec(value);
            if (!match) return addError(errors, value, "is not a valid URN");
            return match[1] === "urn" && !match[2]
              ? value
              : addError(
                  errors,
                  value,
                  "is not a valid URN (it is a URI, but a URN is required)"
                );
          };
        case "email":
          return (value, errors) =>
            typeof value === "string" && REGEX_EMAIL.test(value)
              ? value.toLowerCase()
              : addError(errors, value, "is not a valid email address");
      }
      return (value, errors) =>
        typeof value === "string"
          ? value
          : addError(errors, value, "is not a string");

    case "uuid":
      return (value, errors) =>
        (typeof value === "string"
          ? REGEX_UUID.exec(value)?.[1].toLowerCase()
          : null) ?? addError(errors, value, "is not a valid UUID");

    default:
      throw new TypeError(
        `'${formatErrorSource(type)}' is not a supported primitive type.`
      );
  }
}

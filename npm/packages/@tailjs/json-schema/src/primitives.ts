import { DataClassification, DataPurposeFlags } from "@tailjs/types";
import {
  forEach,
  isInteger,
  isNumber,
  isString,
  single,
  unlock,
} from "@tailjs/util";
import { Schema, SchemaPrimitiveType } from ".";

const primitiveSchema: Schema = {
  id: "urn:tailjs:primitive",
  title: "Primitive types",
  classification: DataClassification.Anonymous,
  purposes: DataPurposeFlags.Any,
  types: new Map(),
};

const primitiveShared: Pick<
  SchemaPrimitiveType,
  "classification" | "purposes" | "primitive" | "patch" | "validate" | "schema"
> = {
  classification: DataClassification.Anonymous,
  purposes: DataPurposeFlags.Any,
  primitive: true,
  schema: primitiveSchema,
  patch: (value) => value,
  validate: (value) => value,
};

export const primitives = {
  boolean: {
    id: primitiveSchema.id + "#boolean",
    name: "boolean",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  integer: {
    id: primitiveSchema.id + "#integer",
    name: "integer",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  float: {
    id: primitiveSchema.id + "#float",
    name: "float",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  string: {
    id: primitiveSchema.id + "#string",
    name: "string",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  date: {
    id: primitiveSchema.id + "#date",
    name: "datetime",

    ...primitiveShared,
  } as SchemaPrimitiveType,

  time: {
    id: primitiveSchema.id + "#time",
    name: "time",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  duration: {
    id: primitiveSchema.id + "#duration",
    name: "duration",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  datetime: {
    id: primitiveSchema.id + "#datetime",
    name: "datetime",
    ...primitiveShared,
  } as SchemaPrimitiveType,

  uuid: {
    id: primitiveSchema.id + "#uuid",
    name: "uuid",
    ...primitiveShared,
  } as SchemaPrimitiveType,
} as const;

forEach(primitives, ([, type]) =>
  unlock(primitiveSchema.types).set(type.id, type)
);

export const inferPrimitiveFromValue = (value: any) =>
  isString(value)
    ? primitives.string
    : isInteger(value)
    ? primitives.integer
    : isNumber(value)
    ? primitives.float
    : undefined;

export const tryParsePrimitiveType = (schemaProperty: any) => {
  if (!schemaProperty) return undefined;

  switch (schemaProperty.type) {
    case "integer":
      return primitives.integer;
    case "number":
      return primitives.float;
    case "string":
      switch (schemaProperty.format) {
        case "date":
          return primitives.date;
        case "date-time":
          return primitives.datetime;
        case "time":
          return primitives.time;
        case "duration":
          return primitives.duration;
        case "uuid":
          return primitives.uuid;
        default:
          return primitives.string;
      }
    default:
      if (
        (schemaProperty.anyOf as any[])?.some(
          (item) => isNumber(item.const) || (item.enum as any[])?.some(isNumber)
        )
      ) {
        // anyOf's with const numbers are interpreted as enums.
        // We do the fancy pants transformation where the string names are also included as valid enum values
        // so the criteria is that if any of the anyOf nodes have an `enum` property containing a number, it is also considered a number.
        return primitives.integer;
      }

      const allowedValues =
        schemaProperty.const != null
          ? [schemaProperty.const]
          : schemaProperty.enum;

      const type = schemaProperty.const
        ? inferPrimitiveFromValue(schemaProperty.const)
        : single(schemaProperty.enum, inferPrimitiveFromValue);

      return type && { ...type, allowedValues };
  }
};

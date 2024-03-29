import { DataClassification, DataPurposes } from "@tailjs/types";
import {
  forEach,
  isInteger,
  isNumber,
  isString,
  single,
  unlock,
} from "@tailjs/util";
import { Schema, SchemaType } from "..";

const primitiveSchema: Schema = {
  id: "urn:tailjs:primitive",
  classification: DataClassification.Anonymous,
  purposes: DataPurposes.Any,
  types: new Map(),
};

const primitiveShared: Pick<
  SchemaType,
  "classification" | "purposes" | "primitive" | "censor" | "validate" | "schema"
> = {
  classification: DataClassification.Anonymous,
  purposes: DataPurposes.Any,
  primitive: true,
  schema: primitiveSchema,
  censor: (value) => value,
  validate: (value) => value,
};

export const primitives = {
  boolean: {
    id: primitiveSchema + "#boolean",
    name: "boolean",
    ...primitiveShared,
  } as SchemaType,

  integer: {
    id: primitiveSchema + "#integer",
    name: "integer",
    ...primitiveShared,
  } as SchemaType,

  float: {
    id: primitiveSchema + "#float",
    name: "float",
    ...primitiveShared,
  } as SchemaType,

  string: {
    id: primitiveSchema + "#string",
    name: "string",
    ...primitiveShared,
  } as SchemaType,

  date: {
    id: primitiveSchema + "#date",
    name: "datetime",

    ...primitiveShared,
  } as SchemaType,

  time: {
    id: primitiveSchema + "#time",
    name: "time",
    ...primitiveShared,
  } as SchemaType,

  duration: {
    id: primitiveSchema + "#duration",
    name: "duration",
    ...primitiveShared,
  } as SchemaType,

  datetime: {
    id: primitiveSchema + "#datetime",
    name: "datetime",
    ...primitiveShared,
  } as SchemaType,

  uuid: {
    id: primitiveSchema + "#uuid",
    name: "uuid",
    ...primitiveShared,
  } as SchemaType,
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
  switch (schemaProperty?.type) {
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
      return schemaProperty.const
        ? inferPrimitiveFromValue(schemaProperty.const)
        : single(schemaProperty.enum, inferPrimitiveFromValue);
  }
};

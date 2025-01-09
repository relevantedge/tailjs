import { forEach2, throwTypeError } from "@tailjs/util";
import {
  Schema,
  SchemaEntity,
  SchemaObjectType,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyType,
} from "../../..";
import { serializeAnnotations } from ".";

const requiresSyntheticType = (
  type: SchemaObjectType,
  restrictProperties: boolean
) => restrictProperties && type.abstract === false && type.extendedBy?.length;

const getSyntheticBaseTypeName = (
  type: SchemaObjectType,
  restrictProperties: boolean
) => {
  if (!requiresSyntheticType(type, restrictProperties)) return type.name;

  for (let i = 0; ; i++) {
    const name = type.name + "Base" + (i ? i + 1 : 0);
    if (!type.schema.types.has(name)) {
      return name;
    }
  }
};

const getJsonRef = (
  entity: SchemaEntity | SchemaObjectType,
  force = false,
  restrictProperties: boolean
) => {
  if (
    !force &&
    "abstract" in entity &&
    !entity.abstract &&
    entity.extendedBy.length
  ) {
    return `${entity.schema.namespace}#${getSyntheticBaseTypeName(
      entity,
      restrictProperties
    )}`;
  }
  return `${entity.schema.namespace}#${entity.name}`;
};

const serializeProperty = (
  type: SchemaPropertyType,
  restrictProperties: boolean
) => {
  let jsonProperty: any;
  if ("primitive" in type) {
    const source = type.source as SchemaPrimitiveTypeDefinition;
    switch (source.primitive) {
      case "datetime":
        jsonProperty =
          source.format === "unix"
            ? {
                type: "integer",
              }
            : {
                type: "string",
                format: "date-time",
              };
        break;
      case "date":
      case "uuid":
        jsonProperty = {
          type: "string",
          format: source.primitive,
        };
        break;
      case "string":
        jsonProperty = {
          type: "string",
          format: source.format,
        };
        break;
      case "boolean":
      case "integer":
      case "timestamp":
      case "duration":
      case "number":
        jsonProperty = {
          type: source.primitive,
        };
        break;

      default:
        return throwTypeError(
          `Unsupported primitive type '${type.primitive}'.`
        );
    }
    if ("enumValues" in type && type["enumValues"]) {
      const enumValues = [...type.enumValues];
      if (enumValues.length === 1) {
        jsonProperty.const = enumValues[0];
      } else {
        jsonProperty.enum = enumValues;
      }
    }
  } else if ("properties" in type) {
    if (type.embedded) {
      jsonProperty = serializeType(type, restrictProperties);
    } else {
      jsonProperty = {
        $ref: getJsonRef(type, false, restrictProperties),
      };
    }
  } else if ("key" in type) {
    jsonProperty = {
      type: "object",
      additionalProperties: serializeProperty(type.value, restrictProperties),
    };
  } else if ("item" in type) {
    jsonProperty = {
      type: "array",
      items: serializeProperty(type.item, restrictProperties),
    };
  }

  if ("usageOverrides" in type) {
    Object.assign(jsonProperty, serializeAnnotations(type) ?? {});
  }
  return jsonProperty;
};

const serializeType = (type: SchemaObjectType, restrictProperties: boolean) => {
  let jsonType = {
    type: "object",
    description: type.description,
    ...serializeAnnotations(type),
    properties: {},
  } as any;

  forEach2(type.ownProperties, ([name, property]) => {
    jsonType.properties[name] = serializeProperty(
      property.type,
      restrictProperties
    );
    if (property.required) {
      (jsonType.required ??= []).push(name);
    }
  });

  if (!type.extends) {
    var b = 4;
  }
  if (type.extends.length) {
    jsonType = {
      allOf: [
        ...type.extends.map((type) => ({
          $ref: getJsonRef(type, false, restrictProperties),
        })),
        jsonType,
      ],
    };
  }

  if (
    !type.abstract &&
    !requiresSyntheticType(type, restrictProperties) &&
    restrictProperties
  ) {
    jsonType.additionalProperties = false;
  }

  return {
    $anchor: getSyntheticBaseTypeName(type, restrictProperties),
    ...jsonType,
  };
};

export const serializeSchema = (
  schema: Pick<Schema, "namespace" | "description" | "types">,
  subSchemas: readonly Schema[],
  restrictProperties: boolean
) => {
  {
    const jsonSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: schema.namespace,
      description: schema.description,
      $defs: {},
    };

    const defs = (jsonSchema.$defs = {});

    for (const [name, type] of schema.types) {
      if (requiresSyntheticType(type, restrictProperties)) {
        const syntheticTypeName = getSyntheticBaseTypeName(
          type,
          restrictProperties
        );
        defs[syntheticTypeName] = serializeType(type, restrictProperties);
        defs[type.name] = {
          type: "object",
          $ref: getJsonRef(type, false, restrictProperties),
          additionalProperties: false,
        };
      } else {
        defs[name] = {
          $anchor: getJsonRef(type, true, restrictProperties),
          ...serializeType(type, restrictProperties),
        };
      }
    }

    for (const subSchema of subSchemas) {
      defs[subSchema.namespace] = serializeSchema(
        subSchema,
        [],
        restrictProperties
      );
    }

    return JSON.stringify(jsonSchema, null, 2);
  }
};

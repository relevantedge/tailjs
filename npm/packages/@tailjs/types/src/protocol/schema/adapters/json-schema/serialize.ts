import { forEach2, throwTypeError } from "@tailjs/util";
import { serializeAnnotations } from ".";
import {
  Schema,
  SchemaObjectType,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyType,
} from "../../..";

const getJsonRef = (entity: SchemaObjectType) =>
  `${entity.schema.namespace}#${entity.name}`;

const serializeProperty = (type: SchemaPropertyType) => {
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
      jsonProperty = serializeType(type);
    } else {
      jsonProperty = {
        $ref: getJsonRef(type),
      };
    }
  } else if ("key" in type) {
    jsonProperty = {
      type: "object",
      additionalProperties: serializeProperty(type.value),
    };
  } else if ("item" in type) {
    jsonProperty = {
      type: "array",
      items: serializeProperty(type.item),
    };
  }

  if ("usageOverrides" in type) {
    Object.assign(jsonProperty, serializeAnnotations(type) ?? {});
  }
  return jsonProperty;
};

const serializeType = (type: SchemaObjectType) => {
  let jsonType = {
    type: "object",
    description: type.description,
    ...serializeAnnotations(type),
    properties: {},
  } as any;

  forEach2(type.ownProperties, ([name, property]) => {
    jsonType.properties[name] = serializeProperty(property.type);
    if (property.required) {
      (jsonType.required ??= []).push(name);
    }
  });

  if (type.extends.length) {
    jsonType = {
      allOf: [
        ...type.extends.map((type) => ({
          $ref: getJsonRef(type),
        })),
        jsonType,
      ],
    };
  }

  return {
    $anchor: type.name,
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
      defs[name] = {
        $anchor: getJsonRef(type),
        ...serializeType(type),
      };
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

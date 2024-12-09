import { forEach2, throwTypeError } from "@tailjs/util";
import {
  Schema,
  SchemaEntity,
  SchemaObjectType,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyType,
} from "../../..";

const requiresSyntheticType = (type: SchemaObjectType) =>
  type.abstract === false && type.extendedBy?.length;

const getSyntheticBaseTypeName = (type: SchemaObjectType) => {
  if (!requiresSyntheticType(type)) return type.name;

  for (let i = 0; ; i++) {
    const name = type.name + "Base" + (i ? i + 1 : 0);
    if (!type.schema.types.has(name)) {
      return name;
    }
  }
};

const getJsonRef = (entity: SchemaEntity | SchemaObjectType, force = false) => {
  if (
    !force &&
    "abstract" in entity &&
    !entity.abstract &&
    entity.extendedBy.length
  ) {
    return `${entity.schema.namespace}#${getSyntheticBaseTypeName(entity)}`;
  }
  return `${entity.schema.namespace}#${entity.name}`;
};

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
  return jsonProperty;
};

const serializeType = (type: SchemaObjectType) => {
  let jsonType = {
    type: "object",
    description: type.description,

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
        ...type.extends.map((type) => ({ $ref: getJsonRef(type) })),
        jsonType,
      ],
    };
  }

  if (!type.abstract && !requiresSyntheticType(type)) {
    jsonType.additionalProperties = false;
  }
  return { $anchor: getSyntheticBaseTypeName(type), ...jsonType };
};

export const serializeSchema = (
  schema: Pick<Schema, "namespace" | "description" | "types">,
  subSchemas: readonly Schema[]
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
      if (requiresSyntheticType(type)) {
        const syntheticTypeName = getSyntheticBaseTypeName(type);
        defs[syntheticTypeName] = serializeType(type);
        defs[type.name] = {
          type: "object",
          $ref: getJsonRef(type),
          additionalProperties: false,
        };
      } else {
        defs[name] = {
          $anchor: getJsonRef(type, true),
          ...serializeType(type),
        };
      }
    }

    for (const subSchema of subSchemas) {
      defs[subSchema.namespace] = serializeSchema(subSchema, []);
    }

    return JSON.stringify(jsonSchema, null, 2);
  }
};

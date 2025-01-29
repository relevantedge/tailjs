import { forEach2, map2, obj2, skip2, throwError } from "@tailjs/util";
import {
  AnySchemaTypeDefinition,
  CORE_EVENT_DISCRIMINATOR,
  formatQualifiedTypeName,
  isSchemaObjectType,
  Schema,
  SchemaDefinition,
  SchemaObjectType,
  SchemaPrimitiveType,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyDefinition,
  SchemaPropertyType,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  SchemaVariableDefinition,
} from "../../../..";

export const createEventPatchDefinition = (
  eventType: SchemaObjectType,
  type: SchemaObjectType
): SchemaTypeDefinition => {
  return {
    version: type.version,
    description: `Patch type for ${type.id}.`,
    ...type.usage,
    extends: [formatQualifiedTypeName(eventType)],
    properties: obj2(type.properties, ([key, property]) =>
      key === CORE_EVENT_DISCRIMINATOR
        ? [
            key,
            {
              primitive: "string",
              enum: map2(
                (property.type as SchemaPrimitiveType)?.enumValues,
                (typeName) => `${typeName}_patch`
              ),
              required: true,
            } satisfies SchemaPropertyDefinition,
          ]
        : eventType.properties[key]
        ? skip2
        : [
            key,
            {
              ...serializePropertyType(property.type),
              description: property.description,
              ...property.usage,
              required: false,
            } satisfies SchemaPropertyDefinition,
          ]
    ),
  };
};

export const serializeAsDefinitions = (
  schemas: readonly Schema[]
): SchemaDefinition[] => {
  const definitions: SchemaDefinition[] = [];
  for (const schema of schemas) {
    const definition: SchemaDefinition = {
      namespace: schema.namespace,
      ...schema.usage,
      description: schema.description,
      name: schema.name,
      version: schema.version,
    };
    definitions.push(definition);
    forEach2(schema.types, ([typeName, type]) => {
      (definition.types ??= {})[typeName] = {
        version: type.version,
        description: type.description,
        abstract: type.abstract,
        ...type.usage,
        extends: type.extends.map((type) => formatQualifiedTypeName(type)),
        system: (type.source as SchemaSystemTypeDefinition).system,
        properties: obj2(type.ownProperties, ([key, property]) => [
          key,
          {
            ...serializePropertyType(property.type),
            description: property.description,
            ...property.usage,
            required: property.required,
          } satisfies SchemaPropertyDefinition,
        ]),
      } as SchemaSystemTypeDefinition;
    });

    forEach2(schema.variables, ([scope, variables]) => {
      const scopeVariableDefinitions = ((definition.variables ??= {})[scope] =
        {});
      forEach2(variables, ([variableKey, variable]) => {
        scopeVariableDefinitions[variableKey] = {
          ...serializePropertyType(variable.type),
          description: variable.description,
          ...variable.usage,
          dynamic: variable.dynamic,
        } satisfies SchemaVariableDefinition;
      });
    });
  }

  return definitions;
};

const serializePropertyType = (
  type: SchemaPropertyType
): AnySchemaTypeDefinition => {
  if (isSchemaObjectType(type)) {
    return {
      reference: formatQualifiedTypeName(type),
    };
  }
  if ("primitive" in type) {
    return type.source;
  }
  if ("item" in type) {
    return {
      item: serializePropertyType(type.item),
    };
  }
  if ("key" in type) {
    return {
      key: serializePropertyType(type.key) as SchemaPrimitiveTypeDefinition,
      value: serializePropertyType(type.value),
    };
  }
  if ("union" in type) {
    return {
      union: type.union.map((type) => serializePropertyType(type)),
    };
  }

  return throwError("Unsupported schema type.");
};

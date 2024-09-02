import {
  DataPurposeName,
  DEFAULT_SCHEMA_EVENT_TYPE,
  DEFAULT_SCHEMA_NS,
  type PrimitiveSchemaType,
  type SchemaDefinition,
  type SchemaEntity,
  type SchemaProperty,
  type SchemaPropertyType,
  type SchemaType,
  type VariableScope,
} from "@tailjs/types";
import { VariableStorageContext } from "..";
import { parseSchemaEntity, SchemaParseContext } from "./validation";

export interface ParsedSchemaEntity extends SchemaEntity {
  id: string;
  namespace: string;

  censor<T>(
    value: T,
    context: VariableStorageContext,
    targetPurpose?: DataPurposeName
  ): T | null;

  validate<T>(
    value: T,
    previous: T | null,
    context: VariableStorageContext,
    errors?: string[]
  ): T | null;
}

export interface ParsedSchemaType extends ParsedSchemaEntity {
  baseType?: ParsedSchemaType;
  anonymous?: boolean;
  abstract?: boolean;

  /** The type is for an event */
  event?: boolean;
  properties: { [P in string]: ParsedSchemaProperty };

  source: SchemaType;
}

export type ParsedSchemaPropertyType =
  | PrimitiveSchemaType
  | ParsedSchemaType
  | { const: any }
  | { item: ParsedSchemaPropertyType }
  | { key: PrimitiveSchemaType; item: ParsedSchemaPropertyType };

export interface ParsedSchemaProperty extends ParsedSchemaEntity {
  name: string;
  required?: boolean;
  type: ParsedSchemaPropertyType;

  source: SchemaProperty;
}

export class TypeResolver {
  private readonly _sourceTypes = new Map<string, SchemaType>();
  private readonly _types = new Map<string, ParsedSchemaType>();
  private readonly _variables = new Map<string, ParsedSchemaType>();
  private readonly _events = new Map<string, ParsedSchemaType>();

  private _eventBaseType: SchemaType | undefined;

  private _visitSourceTypes(
    entity: SchemaDefinition | SchemaType | SchemaProperty | SchemaPropertyType,
    schema: SchemaDefinition
  ) {
    if (typeof entity === "string" || "const" in entity) {
      return;
    }
    if ("item" in entity) {
      return this._visitSourceTypes(entity.item, schema);
    }
    if ("type" in entity) {
      if (typeof entity.type === "string") {
        // Type reference or primitive type.
        return;
      }
      // Property or property type reference.
      return this._visitSourceTypes(entity.type, schema);
    }
    if ("properties" in entity) {
      for (const key in entity.properties) {
        this._visitSourceTypes(entity.properties[key], schema);
      }

      if (entity.name != undefined) {
        const typeId = schema.namespace + "#" + entity.name;
        if (this._sourceTypes.has(typeId)) {
          throw new Error(
            `The type '${typeId}' has been declared more than once.`
          );
        }
        this._sourceTypes.set(typeId, entity as any);

        if (
          schema.namespace === DEFAULT_SCHEMA_NS &&
          entity.name === DEFAULT_SCHEMA_EVENT_TYPE
        ) {
          this._eventBaseType = entity as any;
        }
      }
      return;
    }

    entity.namespace ??= entity.name;
    if (!entity.namespace.match(/^(urn:|[^:]+:\/\/)/)) {
      entity.namespace = "urn:" + entity.namespace;
    }

    entity.types?.forEach((type) => this._visitSourceTypes(type, schema));

    schema.variables &&
      Object.entries(schema.variables).forEach(
        ([scope, vars]) =>
          vars &&
          Object.entries(vars).forEach(
            ([key, type]) =>
              type && "name" in type && this._visitSourceTypes(type, schema)
          )
      );
  }

  constructor(schemas: SchemaDefinition[]) {
    for (const schema of schemas) {
      this._visitSourceTypes(schema, schema);
    }
    if (this._eventBaseType == null) {
      throw new Error(
        "The core schema's TrackedEvent type was not present in any of the provided schemas."
      );
    }

    for (const schema of schemas) {
      const parseContext: SchemaParseContext = {
        schema,
        defaultUsage: schema.usage,
        eventBaseType: this._eventBaseType,
        resolveType: (reference, context) => {
          const parts = reference.type.split("#");
          if (
            parts.length > 1 &&
            reference.schema &&
            reference.schema !== parts[0]
          ) {
            throw new Error(
              `The qualified type name and schema is inconsistent in the type reference for '${reference.type}'.`
            );
          }

          const id =
            parts.length > 1
              ? reference.type
              : (reference.schema ?? context.schema.namespace!) +
                "#" +
                reference.type;
          const type = this._sourceTypes.get(id);
          if (!type) {
            throw new Error(
              `The type '${id}' could not be resolved from any of the provided schemas.`
            );
          }
          return type;
        },
        collect: (type) => {
          if (!("properties" in type)) {
            return;
          }

          if (this._types.has(type.id)) {
            throw new Error(`Duplicate type ID '${type.id}'.`);
          }

          this._types.set(type.id, type);
          if (type.event && !type.abstract) {
            const typeName = (type.properties["type"] as any)?.const;
            if (!typeName) {
              throw new Error(
                `A non abstract event type must have a constant type name - '${type.id}' does not.`
              );
            }
            const currentEventType = this._events.get(typeName);
            if (currentEventType) {
              throw new Error(
                `The event type must be unique, yet the type '${typeName}' is used by both '${currentEventType}' and '${type.id}'.`
              );
            }
            this._events.set(typeName, type);
          }
        },
      };
      schema.types?.forEach((type) => parseSchemaEntity(type, parseContext));
      schema.variables &&
        Object.entries(schema.variables).forEach(
          ([scope, vars]) =>
            vars &&
            Object.entries(vars).forEach(([key, type]) => {
              if (!type) return;
              const uniqueKey = scope + "-" + key;
              let variableType = this._variables.get(uniqueKey);
              if (variableType) {
                throw new Error(
                  `Variable keys must be unique, but both the schemas '${variableType.namespace}' and '${schema.namespace}' declare a variable with the key '${key}' in ${scope} scope.`
                );
              }
              variableType =
                // Reference
                parseSchemaEntity(
                  "type" in type
                    ? parseContext.resolveType(type, parseContext)
                    : type,
                  parseContext
                );

              (this.variables as any).push({
                key: { scope, key },
                type: variableType,
              });
              this._variables.set(uniqueKey, variableType);
            })
        );
    }
  }

  getEvent<Required extends boolean = true>(
    eventType: string,
    required: Required = false as any
  ): ParsedSchemaType | (Required extends true ? never : undefined) {
    const type = this._events.get(eventType);
    if (required && !type) {
      throw new Error(`The event '${eventType}' is not defined.`);
    }
    return type as any;
  }

  getType<Required extends boolean = true>(
    typeName: string,
    required: Required = false as any,
    defaultSchema?: SchemaDefinition
  ): ParsedSchemaType | (Required extends true ? never : undefined) {
    const typeId = typeName.includes("#")
      ? typeName
      : (defaultSchema ?? DEFAULT_SCHEMA_NS) + "#" + typeName;

    const type = this._types.get(typeId);
    if (required && !type) {
      throw new Error(`The type '${typeId}' is not defined.`);
    }
    return type as any;
  }

  public readonly variables: readonly {
    key: { scope: VariableScope; key: string };
    type: ParsedSchemaType;
  }[] = [];

  getVariable<Required extends boolean = true>(
    scope: VariableScope,
    key: string,
    required?: Required
  ): ParsedSchemaType | (Required extends true ? never : undefined) {
    const uniqueKey = scope + "-" + key;
    const variable = this._variables.get(uniqueKey);
    if (!variable && required) {
      throw new Error(
        `The variable '${key}' in ${scope} scope is not defined.`
      );
    }
    return variable as any;
  }
}

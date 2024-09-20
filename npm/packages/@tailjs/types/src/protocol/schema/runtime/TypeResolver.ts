import {
  CORE_SCHEMA_NS,
  SCHEMA_DATA_USAGE_ANONYMOUS,
  SchemaTypeDefinition,
  type SchemaDefinition,
  type SchemaTypeReference,
  type VariableScope,
} from "@tailjs/types";
import {
  enumerate,
  first,
  forEach,
  get,
  isString,
  throwError,
  tryAdd,
} from "@tailjs/util";

export const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity = {
  validate: (value, _current, _context, _errors) => value,
  censor: (value, _context) => value,
};

import {
  CORE_EVENT_DISCRIMINATOR,
  ParsedSchemaDefinition,
  ParsedSchemaObjectType,
  ParsedSchemaPrimitiveType,
  SchemaVariableKey,
} from "../..";

import {
  createSchemaTypeMapper,
  parseBaseTypes,
  parseType,
  parseTypeProperties,
  SchemaTypeMapper,
  TypeParseContext,
} from "./parsing";
import {
  getPrimitiveTypeValidator,
  throwValidationErrors,
  ValidatableSchemaEntity,
} from "./validation";
import { addTypeValidators } from "./validation/add-type-validators";

export type SchemaDefinitionSource = {
  definition: SchemaDefinition;
  referencesOnly?: boolean;
};

export class TypeResolver {
  private readonly _schemas = new Map<string, ParsedSchemaDefinition>();
  private readonly _types = new Map<string, ParsedSchemaObjectType>();
  private readonly _systemTypes: TypeParseContext["systemTypes"] = {};

  private readonly _events = new Map<string, ParsedSchemaObjectType>();
  private _eventMapper: SchemaTypeMapper | undefined;

  private readonly _variables = new Map<
    string,
    Map<string, ParsedSchemaObjectType>
  >();

  private readonly _source: readonly SchemaDefinitionSource[];

  constructor(
    schemas: readonly SchemaDefinitionSource[],
    defaultUsage = SCHEMA_DATA_USAGE_ANONYMOUS
  ) {
    this._source = schemas;
    const typeStubs: [
      context: TypeParseContext,
      variable: SchemaVariableKey | undefined,
      type: ParsedSchemaObjectType | SchemaTypeReference
    ][] = [];

    const schemaContexts: [
      schema: ParsedSchemaDefinition,
      context: TypeParseContext
    ][] = schemas.map(({ definition, referencesOnly }) => {
      const namespace = throwValidationErrors((errors) =>
        getPrimitiveTypeValidator({
          primitive: "string",
          format: "uri",
        }).validator(definition.namespace, errors)
      );
      if (this._schemas.has(namespace)) {
        throw new Error(
          `Only one schema can define the namespace '${namespace}'.`
        );
      }
      const parsed: ParsedSchemaDefinition = {
        id: namespace,
        namespace,
        source: definition,
        schema: undefined as any,
        name: definition.name ?? namespace,
        qualifiedName: namespace,
        referencesOnly: !!referencesOnly,
        version: definition.version,
        usageOverrides: definition.usage,
        types: new Map(),
        events: new Map(),
        variables: new Map(),
      };
      parsed.schema = parsed;
      this._schemas.set(namespace, parsed);

      return [
        parsed,
        {
          schema: parsed,
          parsedTypes: this._types,
          systemTypes: this._systemTypes,
          eventTypes: this._events,
          defaultUsage,
          usageOverrides: definition.usage,
          referencesOnly: !!referencesOnly,
          localTypes: parsed.types,
        },
      ];
    });

    for (const [schema, context] of schemaContexts) {
      // Populate the type dictionary with initial type stubs without properties and base types.
      // This allows circular references to be resolved, and schemas and their types be parsed in any order.
      forEach(
        schema.source.types,
        ([name, type]: [string, SchemaTypeDefinition]) => {
          typeStubs.push([context, , parseType([name, type], context, null)]);
        }
      );
    }

    for (const [schema, context] of schemaContexts) {
      // Parse base types so "extendedBy" is populated for all types before we parse properties..
      forEach(schema.types, ([, type]) => parseBaseTypes(type, context));
    }

    for (const [schema, context] of schemaContexts) {
      // Find variables.
      forEach(schema.source.variables, ([scope, keys]) => {
        forEach(keys, ([key, type]) => {
          let variableType: ParsedSchemaObjectType;

          if (!("type" in type)) {
            // Not a reference, upgrade the anonymous object types to a type definition by giving it a name.

            variableType = parseType([scope + "_" + key, type], context, null);
          } else {
            // Get the referenced type.
            variableType = parseType(type, context, null);
          }

          tryAdd(
            get(this._variables, scope, () => new Map()),
            key,
            variableType,
            (current) => {
              throw new Error(
                `The type "${variableType.id}" cannot be registered for the variable key "${key}" in ${scope} scope, since it is already used by "${current.id}".`
              );
            }
          );

          get(schema.variables, scope, () => new Map()).set(key, variableType);
          get(
            (variableType.variables ??= new Map()),
            scope,
            () => new Set()
          ).add(key);
        });
      });
      forEach(schema.types, ([, type]) => parseTypeProperties(type, context));
    }

    forEach(this._types, ([, type]) => {
      // Finish the types.
      addTypeValidators(type);

      forEach(type.extendedBy, (subtype) => {
        forEach(type.referencedBy, (prop) => subtype.referencedBy.add(prop));
        forEach(type.variables, ([scope, keys]) =>
          forEach(keys, (key) =>
            get((subtype.variables ??= new Map()), scope, () => new Set()).add(
              key
            )
          )
        );
      });
    });

    const eventType = this._systemTypes.event;
    if (eventType) {
      const { map, selector, unmapped } = createSchemaTypeMapper(
        [eventType],
        (type) =>
          !type.schema.referencesOnly &&
          !!(
            type.properties[CORE_EVENT_DISCRIMINATOR]
              ?.type as ParsedSchemaPrimitiveType
          ).enumValues,
        ["type"]
      );
      if (unmapped.size) {
        throwError(
          unmapped.size > 1
            ? `The event types ${enumerate(
                unmapped
              )} do not have at least one unique value for their 'type' property.`
            : `The event type ${first(
                unmapped
              )} does not have at least one unique value for its 'type' property.`
        );
      }

      forEach(
        selector?.subtypes?.type?.values,
        ([typeName, { type, baseType }]) => {
          if (!type && !baseType) {
            throwError(
              "If multiple types are using the same event type name, they must share a common base class."
            );
          } else if (isString(typeName)) {
            type = baseType ?? type!;
            type.schema.types.set(typeName, type);
            (type.eventNames ??= []).push(typeName);

            this._events.set(typeName, type);
          }
        }
      );

      this._eventMapper = map;
    }
  }

  getEvent<Required extends boolean = true>(
    eventType: string,
    required: Required = true as any
  ): ParsedSchemaObjectType | (Required extends true ? never : undefined) {
    let type = this._events.get(eventType) ?? this._types.get(eventType);
    if (required && !type) {
      throw new Error(`The event "${eventType}" is not defined.`);
    }
    if (type && !type.eventNames?.length) {
      if (required) {
        throw new Error(`The type "${type.id}" is not a concrete event type.`);
      }
      return undefined as any;
    }

    return type as any;
  }

  getType<Required extends boolean = true>(
    typeName: string,
    required: Required = true as any,
    defaultNamespace?: string
  ): ParsedSchemaObjectType | (Required extends true ? never : undefined) {
    const typeId = typeName.includes("#")
      ? typeName
      : (defaultNamespace ?? CORE_SCHEMA_NS) + "#" + typeName;

    const type = this._types.get(typeId);
    if (required && !type) {
      throw new Error(`The type '${typeId}' is not defined.`);
    }
    return type as any;
  }

  public readonly variables: readonly {
    key: { scope: VariableScope; key: string };
    type: ParsedSchemaObjectType;
  }[] = [];

  public get definition() {
    return JSON.stringify(this._source);
  }

  getVariable<Required extends boolean = true>(
    scope: string,
    key: string,
    required: Required = true as any
  ): ParsedSchemaObjectType | (Required extends true ? never : undefined) {
    const uniqueKey = scope + "-" + key;
    const variable = this._variables.get(uniqueKey);
    if (!variable && required) {
      throw new Error(
        `The variable '${key}' in ${scope} scope is not defined.`
      );
    }
    return variable as any;
  }

  public *getTypes() {
    for (const [, type] of this._types) {
      yield type;
    }
  }

  public *getVariables() {}

  public subset(schemas: string | string[]) {
    const selectedSchemas = new Set<SchemaDefinitionSource>();
    for (const schemaSelector of Array.isArray(schemas) ? schemas : [schemas]) {
      let matchedAny = false;
      for (const source of this._source) {
        if (
          schemaSelector === "*" ||
          schemaSelector === source.definition.namespace ||
          schemaSelector === source.definition.name
        ) {
          matchedAny = true;
          selectedSchemas.add(source);
        }
      }
      if (!matchedAny) {
        throw new Error(
          `The schema selector '${schemaSelector}' did not match any schemas currently loaded in the global type resolver.`
        );
      }
    }

    return new TypeResolver(
      this._source.map((source) =>
        selectedSchemas.has(source)
          ? { ...source, referencesOnly: false }
          : { ...source, referencesOnly: true }
      )
    );
  }
}

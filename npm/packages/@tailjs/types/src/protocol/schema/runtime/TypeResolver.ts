import {
  array2,
  ellipsis,
  forEach2,
  get2,
  Nullish,
  obj2,
  throwError,
  tryAdd,
} from "@tailjs/util";
import {
  CORE_SCHEMA_NS,
  SCHEMA_DATA_USAGE_ANONYMOUS,
  SchemaTypeDefinition,
  type SchemaDefinition,
  type VariableServerScope,
} from "../../..";

export const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity = {
  validate: (value: any, _current, _context, _errors) => value,
  censor: (value, _context) => value,
};

import {
  CORE_EVENT_DISCRIMINATOR,
  hasEnumValues,
  isSchemaObjectType,
  Schema,
  SchemaDataUsage,
  SchemaObjectType,
  SchemaPropertyType,
  SchemaSystemTypeDefinition,
  SchemaVariable,
} from "../..";

import {
  createEventPatchDefinition,
  createSchemaTypeMapper,
  parseBaseTypes,
  parseProperty,
  parseType,
  parseTypeProperties,
  SchemaTypeSelector,
  serializeAsDefinitions,
  TypeParseContext,
} from "./parsing";
import {
  createAccessValidator,
  createCensorAction,
  getPrimitiveTypeValidator,
  handleValidationErrors,
  overrideUsage,
  ValidatableSchemaEntity,
  VALIDATION_ERROR_SYMBOL,
  addTypeValidators,
} from "./validation";
import { PATCH_EVENT_POSTFIX } from "@constants";

export type SchemaDefinitionSource = {
  schema: SchemaDefinition;
  /**
   * Do not add events and variables from this schema to avoid name clashes.
   * Use this if the types from the schema are only referenced by other schemas that provide events and variables.
   */
  typesOnly?: boolean;
};

const uriValidator = getPrimitiveTypeValidator({
  primitive: "string",
  format: "uri",
});
export class TypeResolver {
  private readonly _schemas = new Map<string, Schema>();
  private readonly _types = new Map<string, SchemaObjectType>();
  private readonly _systemTypes: TypeParseContext["systemTypes"] = {};
  private readonly _eventMapper: SchemaTypeSelector | undefined;

  private readonly _variables = new Map<string, Map<string, SchemaVariable>>();

  public readonly schemas: readonly Schema[];

  private readonly _sourceDefinitions: readonly SchemaDefinitionSource[];
  public readonly definitions: readonly SchemaDefinition[];
  private readonly _defaultUsage: SchemaDataUsage;

  constructor(
    definitions: readonly SchemaDefinitionSource[],
    defaultUsage = SCHEMA_DATA_USAGE_ANONYMOUS
  ) {
    this._sourceDefinitions = definitions;
    this._defaultUsage = defaultUsage;
    const schemaContexts: [schema: Schema, context: TypeParseContext][] =
      definitions.map(({ schema, typesOnly }) => {
        if (!schema.namespace) {
          throw new Error(
            `${ellipsis(
              JSON.stringify(schema),
              40,
              true
            )} is not a valid schema - namespace is missing.`
          );
        }
        const namespace = handleValidationErrors((errors) =>
          uriValidator.validator(schema.namespace, errors)
        );
        if (this._schemas.has(namespace)) {
          throw new Error(
            `Only one schema can define the namespace '${namespace}'.`
          );
        }
        const parsed: Schema = {
          id: namespace,
          namespace,
          source: schema,
          description: schema.description,
          name: schema.name ?? namespace,
          qualifiedName: namespace,
          typesOnly: !!typesOnly,
          version: schema.version,
          usageOverrides: schema,
          types: new Map(),
          events: new Map(),
          variables: new Map(),
        };
        this._schemas.set(namespace, parsed);

        return [
          parsed,
          {
            schema: parsed,
            parsedTypes: this._types,
            systemTypes: this._systemTypes,
            defaultUsage: overrideUsage(defaultUsage, parsed.usageOverrides),
            usageOverrides: schema,
            typesOnly: !!typesOnly,
            localTypes: parsed.types,
            typeAliases: new Map(),
          },
        ];
      });

    for (const [schema, context] of schemaContexts) {
      // Populate the type dictionary with initial type stubs without properties and base types.
      // This allows circular references to be resolved, and schemas and their types be parsed in any order.
      forEach2(
        schema.source.types,
        ([name, type]: [string, SchemaTypeDefinition]) =>
          parseType([name, type], context, null)
      );
    }
    const eventType = this._systemTypes.event;

    for (const [schema, context] of schemaContexts) {
      // Parse base types so "extendedBy" is populated for all types before we parse properties..
      forEach2(schema.types, ([, type]) => parseBaseTypes(type, context));
    }

    for (const [schema, context] of schemaContexts) {
      forEach2(schema.types, ([, type]) => parseTypeProperties(type, context));
    }

    if (eventType) {
      // Make a copy of the original event types to avoid infinite loop (that is, patch types for patch types for patch types etc...).
      forEach2(eventType.extendedByAll, (type) => {
        const context = (schemaContexts.find(
          (context) => context[0] === type.schema
        ) ??
          throwError(
            `No parse context for the schema '${type.schema.name}'.`
          ))[1];

        if (!hasEnumValues(type.properties[CORE_EVENT_DISCRIMINATOR]?.type)) {
          // Event types without a specific const value for `type` are per definition abstract.
          type.abstract = true;
        } else if (
          !type.name.endsWith(PATCH_EVENT_POSTFIX) &&
          !this._types.has(type.id + PATCH_EVENT_POSTFIX)
        ) {
          // Create a corresponding patch type.
          const patchDefinition = createEventPatchDefinition(eventType, type);
          (patchDefinition as SchemaSystemTypeDefinition).system = "patch";
          const patchType = parseType(
            [type.name + PATCH_EVENT_POSTFIX, patchDefinition],
            context,
            null
          );
          parseBaseTypes(patchType, context);
          parseTypeProperties(patchType, context);
        }
      });
    }

    forEach2(this._types, ([, type]) => {
      // Finish the types.
      addTypeValidators(type);

      forEach2(type.extendedBy, (subtype) => {
        forEach2(type.referencedBy, (prop) => subtype.referencedBy.add(prop));
        forEach2(type.variables, ([scope, keys]) =>
          forEach2(keys, (key) =>
            get2((subtype.variables ??= new Map()), scope, () => new Set()).add(
              key
            )
          )
        );
      });
    });

    if (eventType) {
      this._eventMapper = createSchemaTypeMapper([eventType]).match;
    }

    for (const [schema, context] of schemaContexts) {
      if (schema.typesOnly) {
        // Schema only included for type references, do not consider exported variables.
        continue;
      }
      // Find variables.
      forEach2(schema.source.variables, ([scope, keys]) => {
        forEach2(keys, ([key, definition]) => {
          if (!definition) {
            return;
          }
          let variableType: SchemaPropertyType | undefined;

          if ("reference" in definition) {
            // Get the referenced type.
            variableType = parseType(definition, context, null);
          } else if ("properties" in definition) {
            // Not a reference, upgrade the anonymous object types to a type definition by giving it a name.
            variableType = parseType(
              [scope + "_" + key, definition],
              context,
              null
            );
            parseBaseTypes(variableType, context);
            parseTypeProperties(variableType, context);
            addTypeValidators(variableType);
          }

          const dummyProperty = parseProperty(
            variableType as any,
            key,
            definition as any,
            context
          );

          variableType ??= dummyProperty.type;

          const variable: SchemaVariable = {
            key,
            scope,
            type: variableType,
            description: dummyProperty.description,
            usage: dummyProperty.usage,
            validate: dummyProperty.validate,
            censor: dummyProperty.censor,
            dynamic: !!definition.dynamic,
          };

          tryAdd(
            get2(this._variables, scope, () => new Map()),
            key,
            variable,
            (current) => {
              throw new Error(
                `The type "${variableType.toString()}" cannot be registered for the variable key "${key}" in ${scope} scope, since it is already used by "${
                  current.type.toString
                }".`
              );
            }
          );

          get2(schema.variables, scope, () => new Map()).set(key, variable);

          if ("properties" in variableType) {
            get2(
              (variableType.variables ??= new Map()),
              scope,
              () => new Set()
            ).add(key);
          }
        });
      });
    }

    this.types = obj2(this._types);
    this.variables = obj2(this._variables, ([scope, variables]) => [
      scope,
      obj2(variables, ([key, variable]) => {
        const usage = (variable.usage = overrideUsage(
          isSchemaObjectType(variable.type) ? variable.type.usage : undefined,
          variable.usage
        ));

        const innerValidator = createAccessValidator(
          scope + "." + key,
          variable.type,
          usage,
          "variable"
        );

        variable.validate = variable.dynamic
          ? (value, current, context, errors, polymorphic) =>
              handleValidationErrors((errors) => {
                if (context.forResponse) {
                  return innerValidator(
                    value,
                    current,
                    context,
                    errors,
                    polymorphic
                  );
                }
                errors.push({
                  message:
                    "The value is dynamically calculated and cannot be set",
                  path: "",
                  type: variable.type,
                  source: value,
                  forbidden: true,
                });
                return VALIDATION_ERROR_SYMBOL as any;
              }, errors)
          : innerValidator;

        variable.censor = createCensorAction(usage, variable.type);

        return [key, variable];
      }),
    ]);

    this.schemas = [...this._schemas.values()];

    this.definitions = serializeAsDefinitions(this.schemas);
  }

  public getEventType<T>(
    eventData: T
  ): T extends Nullish ? T : SchemaObjectType {
    return !this._eventMapper
      ? throwError("System event type has not been configured")
      : eventData && (this._eventMapper(eventData) as any);
  }

  public getType<Required extends boolean = true>(
    typeName: string,
    required: Required = true as any,
    defaultNamespace?: string
  ): SchemaObjectType | (Required extends true ? never : undefined) {
    const typeId = typeName.includes("#")
      ? typeName
      : (defaultNamespace ?? CORE_SCHEMA_NS) + "#" + typeName;

    const type = this._types.get(typeId);
    if (required && !type) {
      throw new Error(`The type '${typeId}' is not defined.`);
    }
    return type as any;
  }

  public getVariable<Required extends boolean = true>(
    scope: string,
    key: string,
    required: Required = true as any
  ): SchemaVariable | (Required extends true ? never : undefined) {
    const variable = this._variables.get(scope)?.get(key);
    if (!variable && required) {
      throw new Error(
        `The variable '${key}' in ${scope} scope is not defined.`
      );
    }
    return variable as any;
  }

  public readonly types: {
    readonly [P in string]?: Readonly<SchemaObjectType>;
  };

  public readonly variables: {
    readonly [P in VariableServerScope | (string & {})]?: {
      readonly [P in string]: Readonly<SchemaVariable>;
    };
  };

  public subset(namespaces: string | string[]) {
    const selectedSchemas = new Set<SchemaDefinitionSource>();
    for (const schemaSelector of Array.isArray(namespaces)
      ? namespaces
      : [namespaces]) {
      let matchedAny = false;
      for (const source of this._sourceDefinitions) {
        if (
          schemaSelector === "*" ||
          schemaSelector === source.schema.namespace ||
          schemaSelector === source.schema.name
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
      this._sourceDefinitions.map(
        (source) =>
          selectedSchemas.has(source)
            ? { ...source, typesOnly: false }
            : { ...source, typesOnly: true },
        this._defaultUsage
      )
    );
  }
}

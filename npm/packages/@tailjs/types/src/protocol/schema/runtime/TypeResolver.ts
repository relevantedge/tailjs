import {
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
  type SchemaTypeDefinitionReference,
  type VariableScope,
} from "../../..";

export const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity = {
  validate: (value, _current, _context, _errors) => value,
  censor: (value, _context) => value,
};

import {
  Schema,
  SchemaObjectType,
  SchemaVariable,
  SchemaVariableKey,
} from "../..";

import {
  createSchemaTypeMapper,
  parseBaseTypes,
  parseType,
  parseTypeProperties,
  SchemaTypeSelector,
  TypeParseContext,
} from "./parsing";
import {
  createAccessValidator,
  createCensorAction,
  getPrimitiveTypeValidator,
  overrideUsage,
  handleValidationErrors,
  ValidatableSchemaEntity,
} from "./validation";
import { addTypeValidators } from "./validation/addTypeValidators";

export type SchemaDefinitionSource = {
  definition: SchemaDefinition;
  /**
   * Do not add events and variables from this schema to avoid name clashes.
   * Use this if the types from the schema are referenced by other schemas that provide events and variables.
   */
  typesOnly?: boolean;
};

export class TypeResolver {
  private readonly _schemas = new Map<string, Schema>();
  private readonly _types = new Map<string, SchemaObjectType>();
  private readonly _systemTypes: TypeParseContext["systemTypes"] = {};
  private readonly _eventMapper: SchemaTypeSelector | undefined;

  private readonly _variables = new Map<string, Map<string, SchemaVariable>>();

  private readonly _source: readonly SchemaDefinitionSource[];

  public schemas: readonly Schema[];

  constructor(
    schemas: readonly SchemaDefinitionSource[],
    defaultUsage = SCHEMA_DATA_USAGE_ANONYMOUS
  ) {
    this._source = schemas;
    const typeStubs: [
      context: TypeParseContext,
      variable: SchemaVariableKey | undefined,
      type: SchemaObjectType | SchemaTypeDefinitionReference
    ][] = [];

    const schemaContexts: [schema: Schema, context: TypeParseContext][] =
      schemas.map(({ definition, typesOnly }) => {
        const namespace = handleValidationErrors((errors) =>
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
        const parsed: Schema = {
          id: namespace,
          namespace,
          source: definition,
          schema: undefined as any,
          description: definition.description,
          name: definition.name ?? namespace,
          qualifiedName: namespace,
          typesOnly: !!typesOnly,
          version: definition.version,
          usageOverrides: definition,
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
            defaultUsage,
            usageOverrides: definition,
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
        ([name, type]: [string, SchemaTypeDefinition]) => {
          typeStubs.push([context, , parseType([name, type], context, null)]);
        }
      );
    }

    for (const [schema, context] of schemaContexts) {
      // Parse base types so "extendedBy" is populated for all types before we parse properties..
      forEach2(schema.types, ([, type]) => parseBaseTypes(type, context));
    }

    for (const [schema, context] of schemaContexts) {
      forEach2(schema.types, ([, type]) => parseTypeProperties(type, context));
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

    const eventType = this._systemTypes.event;
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
          let variableType: SchemaObjectType;

          if (typeof definition === "string") {
            definition = { reference: definition };
          }
          if (!("reference" in definition) && !("type" in definition)) {
            definition = { type: definition };
          }

          if ("reference" in definition) {
            // Get the referenced type.
            variableType = parseType(definition, context, null);
          } else {
            // Not a reference, upgrade the anonymous object types to a type definition by giving it a name.
            variableType = parseType(
              [scope + "_" + key, definition.type],
              context,
              null
            );
          }

          const variable: SchemaVariable = {
            key,
            scope,
            type: variableType,
            description: definition.description,

            // These gets initialized later.
            usage: definition as any,
            validate: null!,
            censor: null!,
          };

          tryAdd(
            get2(this._variables, scope, () => new Map()),
            key,
            variable,
            (current) => {
              throw new Error(
                `The type "${variableType.id}" cannot be registered for the variable key "${key}" in ${scope} scope, since it is already used by "${current.type.id}".`
              );
            }
          );

          get2(schema.variables, scope, () => new Map()).set(key, variable);
          get2(
            (variableType.variables ??= new Map()),
            scope,
            () => new Set()
          ).add(key);
        });
      });
    }

    this.types = obj2(this._types);
    this.variables = obj2(this._variables, ([scope, variables]) => [
      scope,
      obj2(variables, ([key, variable]) => {
        const usage = (variable.usage = overrideUsage(
          variable.type.usage,
          variable.usage
        ));

        variable.validate = createAccessValidator(
          scope + "." + key,
          variable.type,
          usage,
          "variable"
        );

        variable.censor = createCensorAction(usage, variable.type);

        return [key, variable];
      }),
    ]);

    this.schemas = [...this._schemas.values()];
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

  public get definition() {
    return JSON.stringify(this._source);
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
    readonly [P in VariableScope | (string & {})]?: {
      readonly [P in string]: Readonly<SchemaVariable>;
    };
  };

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
          ? { ...source, typesOnly: false }
          : { ...source, typesOnly: true }
      )
    );
  }
}

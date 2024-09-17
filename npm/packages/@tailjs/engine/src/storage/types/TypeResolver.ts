import {
  CORE_EVENT_DISCRIMINATOR,
  CORE_SCHEMA_NS,
  SCHEMA_DATA_USAGE_ANONYMOUS,
  SCHEMA_DATA_USAGE_MAX,
  SchemaPrimitiveType,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  validateConsent,
  type SchemaDataUsage,
  type SchemaDefinition,
  type SchemaObjectType,
  type SchemaPropertyDefinition,
  type SchemaPropertyType,
  type SchemaTypeReference,
  type VariableScope,
} from "@tailjs/types";
import { forEach, get, isArray } from "@tailjs/util";

export const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity = {
  validate: (value, _current, _context, _errors) => value,
  censor: (value, _context) => value,
};

import {
  ParsedSchemaObjectType,
  ParsedSchemaPrimitiveType,
  ParsedSchemaPropertyDefinition,
  ParsedSchemaPropertyType,
  ParsedSchemaUnionType,
  SCHEMA_TYPE_PROPERTY,
  TypedSchemaData,
} from "../..";

import {
  createTypeSelector,
  getMinimumUsage,
  getPrimitiveTypeValidator,
  mergeUsage,
  pushInnerErrors,
  throwValidationErrors,
  ValidatableSchemaEntity,
  VALIDATION_ERROR,
} from "./validation";

export type SchemaDefinitionSource = {
  definition: SchemaDefinition;
  referencesOnly?: boolean;
};

type TypeParseContext = {
  namespace: string;
  defaultUsage: SchemaDataUsage;
  usageOverrides: Partial<SchemaDataUsage> | undefined;

  /** Do not load event types and variables. */
  referencesOnly: boolean;
};

const getTypeId = (namespace: string, name: string) => namespace + "#" + name;

export class TypeResolver {
  private readonly _types = new Map<string, ParsedSchemaObjectType>();
  private readonly _variables = new Map<
    string,
    Map<string, ParsedSchemaObjectType>
  >();
  private readonly _events = new Map<string, ParsedSchemaObjectType>();

  private _eventBaseType: ParsedSchemaObjectType | undefined;

  private _parsePropertyType(
    property: ParsedSchemaPropertyDefinition,
    type: SchemaPropertyType & { required?: boolean },
    parseContext: TypeParseContext
  ): ParsedSchemaPropertyType {
    const propertyType = ((): ParsedSchemaPropertyType => {
      if ("primitive" in type || "enum" in type) {
        const { validator: inner, enumValues } =
          getPrimitiveTypeValidator(type);
        return {
          source: type,
          enumValues,
          validate: (value, _current, _context, errors) => inner(value, errors),
          censor: (value) => value,
        };
      }
      if ("item" in type) {
        const required = !!type.required;

        const itemType = this._parsePropertyType(
          property,
          type.item,
          parseContext
        );
        return {
          source: type,
          item: itemType,
          validate: (value, current, context, errors) => {
            if (!Array.isArray(value)) {
              errors.push({
                path: "",
                source: value,
                message: `${JSON.stringify(value)} is not an array.`,
              });
              return VALIDATION_ERROR;
            }
            let initialErrors = errors.length;
            let index = 0;
            let validated: any[] = value;
            for (let item of value) {
              let validatedItem = pushInnerErrors(
                "[" + index + "]",
                item,
                current === undefined ? undefined : current?.[index] ?? null,
                context,
                errors,
                itemType
              );
              if (validatedItem !== item) {
                if (validated === value) {
                  validated = [...value];
                }
                validated[index] =
                  validatedItem === VALIDATION_ERROR
                    ? undefined
                    : validatedItem;
              }

              ++index;
            }

            return errors.length > initialErrors
              ? VALIDATION_ERROR
              : (validated as any);
          },

          censor: (value: any, context) => {
            let censored: any[] = value;
            let censoredItem: any;
            let index = 0;
            for (let item of value) {
              const censoredItem = itemType.censor(item, context);
              if (censoredItem !== item) {
                if (censoredItem == null && type.item.required) {
                  return undefined;
                }

                if (censored === value) {
                  censored = [...censored];
                }
                censored[index] = censored;
              }

              ++index;
            }
            return censored as any;
          },
        };
      }
      if ("key" in type) {
        const keyType = this._parsePropertyType(
          property,
          { ...type.key, required: true },
          parseContext
        ) as ParsedSchemaPrimitiveType;
        const valueType = this._parsePropertyType(
          property,
          type.value,
          parseContext
        );
        return {
          source: type,
          key: keyType,
          value: valueType,
          validate: (value, current, context, errors) => {
            if (typeof value !== "object" || isArray(value)) {
              errors.push({
                path: "",
                source: value,
                message: `${JSON.stringify(
                  value
                )} is not a record (JSON object).`,
              });
              return VALIDATION_ERROR;
            }
            let validated: Record<keyof any, any> = value as any;
            const initialErrors = errors.length;
            for (let key in value) {
              if (
                pushInnerErrors(
                  "[key]",
                  key,
                  undefined,
                  context,
                  errors,
                  keyType
                ) === VALIDATION_ERROR
              ) {
                continue;
              }

              const property = value[key];
              const validatedProperty = pushInnerErrors(
                key,
                value[key],
                current === undefined ? undefined : current?.[key] ?? null,
                context,
                errors,
                valueType
              );
              if (validatedProperty !== property) {
                if (validated === value) {
                  validated = { ...value };
                }
                validated[key] =
                  validatedProperty === VALIDATION_ERROR
                    ? undefined
                    : validatedProperty;
              }
            }
            return errors.length > initialErrors ? VALIDATION_ERROR : validated;
          },
          censor: (value, context) => {
            let censored: Record<any, any> = {};
            for (const key in value) {
              const propertyValue = value[key];
              const censoredPropertyValue = valueType.censor(
                propertyValue,
                context
              );
              if (censoredPropertyValue !== propertyValue) {
                if (type.value.required && censoredPropertyValue == null) {
                  return undefined;
                }

                if (censored === value) {
                  censored = { ...value } as any;
                }

                censored[key] = censoredPropertyValue;
              }
            }
            return censored;
          },
        };
      }

      let union: ParsedSchemaUnionType;
      if ("properties" in type || "type" in type) {
        const parsed = this._parseType(type, parseContext, property);
        if (parsed.extendedBy.length > 1) {
          union = {
            union: [parsed],
            source: type,
            ...DEFAULT_CENSOR_VALIDATE,
          };
        } else {
          return parsed;
        }
      }
      if (!("union" in type)) {
        throw new TypeError(
          "Unsupported property type: " + JSON.stringify(type)
        );
      }

      union = {
        union: type.union.map((type) => {
          const parsed = this._parsePropertyType(property, type, parseContext);
          if (!("properties" in parsed)) {
            throw new TypeError("Only object types can be part of a union");
          }
          return parsed;
        }),
        source: type,
        ...DEFAULT_CENSOR_VALIDATE,
      };

      const { selector } = createTypeSelector(union.union);
      union.censor = (target, context) =>
        selector(target, [])?.censor(target, context);
      union.validate = (target, current, context, errors) => {
        const type = selector(target, errors);
        let validated: typeof target & TypedSchemaData;
        if (
          !type ||
          (validated = type.validate(
            target,
            current,
            context,
            errors
          ) as any) === VALIDATION_ERROR
        ) {
          return VALIDATION_ERROR;
        }

        const currentTypeInfo = validated[SCHEMA_TYPE_PROPERTY];
        if (
          currentTypeInfo?.type !== type.id ||
          currentTypeInfo?.version !== type.version
        ) {
          if (validated === target) {
            validated = { ...validated };
          }
          validated[SCHEMA_TYPE_PROPERTY] = {
            type: type.id,
            version: type.version,
          };
        }
        return validated;
      };

      return union;
    })();

    if (type.required) {
      const inner = propertyType.validate.bind(propertyType);
      propertyType.validate = (value, current, context, errors) => {
        if (value == null) {
          errors.push({
            path: "",
            message: "A value is required",
            source: value,
          });
          return VALIDATION_ERROR;
        }
        return inner(value, current, context, errors);
      };
    }
    return propertyType;
  }

  /**
   * Parses the specified type, _not_ including properties.
   * A separate call to {@link _parseTypeProperties} must follow,
   * when all types have been parsed.
   */
  private _parseType(
    source: SchemaObjectType | SchemaTypeReference | SchemaTypeDefinition,
    context: TypeParseContext,
    referencingProperty: ParsedSchemaPropertyDefinition | null
  ): ParsedSchemaObjectType {
    let id: string;
    if ("type" in source) {
      id = getTypeId(source.namespace ?? context.namespace, source.type);
      // Reference.
      const parsed = this._types.get(id);
      if (!parsed) {
        throw new Error(
          `The referenced type "${id}" is not defined in any schema.`
        );
      }
      referencingProperty && parsed.referencedBy.push(referencingProperty);
      return parsed;
    }

    let name = (source as SchemaTypeDefinition).name;
    let embedded = false;

    if (!name) {
      if (!referencingProperty) {
        throw new TypeError(
          "A type must have a name or be embedded in a property."
        );
      }
      embedded = true;
      const namePath: string[] = [];
      while (referencingProperty) {
        namePath.unshift(referencingProperty.name, "type");

        if (referencingProperty.declaringType.embedded) {
          if (
            !(referencingProperty =
              referencingProperty.declaringType.referencedBy[0])
          ) {
            throw new Error(
              "INV: An embedded type is referenced by exactly one property (the one that embeds it)."
            );
          }
        } else {
          namePath.unshift(referencingProperty.declaringType.id);
          break;
        }
      }

      name = namePath.join("_");
    }
    id = getTypeId(context.namespace, name);
    if (this._types.has(id)) {
      throw new Error(
        `The namespace '${context.namespace}' already contains a type with the name '${name}'.`
      );
    }

    const parsed: ParsedSchemaObjectType = {
      id,
      name,
      namespace: context.namespace,
      usage: SCHEMA_DATA_USAGE_MAX,
      usageOverrides: (source as SchemaTypeDefinition).usage ?? {},
      embedded: !("name" in source),
      abstract: !!(source as SchemaTypeDefinition).abstract,
      extends: [],
      properties: undefined as any,
      allProperties: {},
      extendedBy: [],
      referencedBy: [],
      eventNames: null,
      source: source,
      ...DEFAULT_CENSOR_VALIDATE,
    };

    this._types.set(id, parsed);

    if ((source as SchemaSystemTypeDefinition).system === "event") {
      if (this._eventBaseType) {
        throw new Error(
          `'${id}' tries to define itself as the base type for tracked events, yet '${this._eventBaseType.id}' has already done that.`
        );
      }
      if (
        (source.properties?.[CORE_EVENT_DISCRIMINATOR] as SchemaPrimitiveType)
          ?.primitive !== "string" ||
        source.properties?.[CORE_EVENT_DISCRIMINATOR].required !== true
      ) {
        throw new Error(
          `'${id}' tries to define itself as the base type for tracked events, but is missing the required string property '${CORE_EVENT_DISCRIMINATOR}'.`
        );
      }
      this._eventBaseType = parsed;
    }

    if (referencingProperty != null) {
      parsed.usageOverrides = mergeUsage(
        parsed.usageOverrides,
        referencingProperty.usageOverrides
      );
      parsed.referencedBy.push(referencingProperty);
    }

    if (embedded) {
      this._parseTypeProperties(parsed, context);
    }

    return parsed;
  }

  private _parseTypeProperties(
    parsedType: ParsedSchemaObjectType,
    context: TypeParseContext
  ): ParsedSchemaObjectType {
    if (parsedType.properties != null) {
      return parsedType;
    }

    parsedType.properties = {};

    const source = parsedType.source;
    let usageOverrides = parsedType.usageOverrides;
    parsedType.extends =
      source.extends?.map((baseType) =>
        this._parseTypeProperties(
          this._parseType(baseType, context, null),
          context
        )
      ) ?? [];

    if (
      parsedType.source["event"] ||
      parsedType === this._eventBaseType ||
      parsedType.extends.some((baseType) => baseType === this._eventBaseType)
    ) {
      parsedType.eventNames = [];
    }

    if (
      parsedType.eventNames &&
      parsedType !== this._eventBaseType &&
      !parsedType.extends.some((baseType) => baseType.eventNames)
    ) {
      // The first type in the inheritance chain that is an event.
      // Make the type extend the event base type (if we have any).
      if (!this._eventBaseType) {
        throw new Error(
          `The type "${parsedType.id}" is marked as an event, but the system event base type is not defined in any schema.`
        );
      }
      parsedType.extends.unshift(this._eventBaseType);
    }

    for (const parsedBaseType of parsedType.extends) {
      if ("usage" in parsedBaseType.source) {
        usageOverrides = mergeUsage(
          usageOverrides,
          parsedBaseType.source.usage
        );
      }
      parsedBaseType.extendedBy.push(parsedType);
    }

    // Don't apply context usage before we have merged the extended types' usage.
    parsedType.usageOverrides = mergeUsage(
      context.usageOverrides,
      usageOverrides
    );

    for (const baseType of parsedType.extends) {
      for (const key in baseType.properties) {
        parsedType.allProperties[key] ??= baseType.properties[key];
      }
    }

    for (const key in source.properties) {
      const baseProperty = parsedType.allProperties[key];
      const sourceProperty = source.properties[key];
      if (baseProperty?.required) {
        if (sourceProperty.required === false) {
          throw new Error(
            "A property cannot explicitly be defined as optional if its base property is required."
          );
        }
        sourceProperty.required = true;
      }

      const property = this._parseProperty(parsedType, key, sourceProperty, {
        ...context,
        usageOverrides:
          // Overridden properties inherits the (final) usage from the overridden property.
          baseProperty?.usage ?? parsedType.usageOverrides,
      });

      parsedType.allProperties[key] = parsedType.properties[key] = property;
    }

    const props = parsedType.allProperties;
    if (parsedType.eventNames) {
      const discriminator = props[CORE_EVENT_DISCRIMINATOR];
      if (!discriminator) {
        throw new Error(
          `The type "${parsedType.id}" is marked as an event but missing the "${CORE_EVENT_DISCRIMINATOR}" property.`
        );
      }

      if ("enumValues" in discriminator.type && discriminator.type.enumValues) {
        if (!context.referencesOnly) {
          if (!discriminator.type.enumValues?.length) {
            throw new Error(
              `The event type "${parsedType.id}" does not have any discriminator values.`
            );
          }

          (parsedType.eventNames = discriminator.type.enumValues).forEach(
            (discriminator) => {
              const current = this._events.get(discriminator);
              if (current) {
                throw new Error(
                  `The event type "${parsedType.id}" cannot use the discriminator "${discriminator}" since that is already used by "${current.id}"`
                );
              }
              this._events.set(discriminator, parsedType);
            }
          );
        }
      } else if (!parsedType.abstract) {
        throw new Error(
          `A non-abstract event type must have specific type name(s) defined as enum values for its '${CORE_EVENT_DISCRIMINATOR}' property.`
        );
      }
    }
    const requiredProperties: ParsedSchemaPropertyDefinition[] = [];

    for (const key in props) {
      const prop = props[key];
      parsedType.usage = getMinimumUsage(parsedType.usage, prop.usage);

      prop.required && requiredProperties.push(prop);
    }

    parsedType.censor = (target, context) => {
      let censored = target;

      for (const key in target) {
        const prop = props[key];

        const targetValue = target[prop.name];
        const censoredValue = !prop
          ? // Remove keys we do not know.
            undefined
          : prop.censor(targetValue, context);

        if (censoredValue != targetValue) {
          if (censoredValue === undefined && prop.required) {
            // When a required property gets completely censored away
            // the entire object becomes censored (since it would be invalid if missing a required property).
            return undefined;
          }
          if (target === censored) {
            // Make a shallow clone if we are changing values.
            censored = { ...target };
          }
          censored[key] = censoredValue;
        }
      }
      return censored;
    };

    parsedType.validate = (target, current, context, errors) => {
      // Here we could leverage the type's `usage` that is the minimum usage defined
      // by any property. Let's do that when we have tested the rest of this code...
      const currentErrors = errors.length;
      let validated = target;
      const validateProperty = (prop: ParsedSchemaPropertyDefinition) => {
        const targetValue = target[prop.name];
        const validatedValue = prop.validate(
          targetValue,
          current === undefined ? undefined : current?.[prop.name] ?? null,
          context,
          errors
        );

        if (validatedValue !== targetValue) {
          if (target === validated) {
            // Make a shallow clone if we are changing values.
            validated = { ...target };
          }

          validated[prop.name] =
            validatedValue === VALIDATION_ERROR
              ? (undefined as any)
              : validatedValue;
        }
      };

      for (const required of requiredProperties) {
        validateProperty(required);
      }
      for (const key in target) {
        const prop = props[key];
        if (!prop) {
          errors.push({
            path: key,
            source: target,
            message: `The property is not defined for the type '${parsedType.id}'.`,
          });
          continue;
        } else if (!prop.required) {
          // Required properties have already been validated.
          validateProperty(prop);
        }
      }

      return currentErrors < errors.length ? VALIDATION_ERROR : validated;
    };

    return parsedType;
  }

  private _parseProperty(
    declaringType: ParsedSchemaObjectType,
    name: string,
    property: SchemaPropertyDefinition,
    context: TypeParseContext
  ): ParsedSchemaPropertyDefinition {
    const usageOverrides = mergeUsage(context.usageOverrides, property.usage);

    const parsed: ParsedSchemaPropertyDefinition = {
      namespace: context.namespace,
      declaringType,
      id: declaringType.id + "." + name,
      name,
      usage: mergeUsage(context.defaultUsage, usageOverrides),
      usageOverrides,
      type: null as any,
      required: !!property.required,
      source: property,
      ...DEFAULT_CENSOR_VALIDATE,
    };
    parsed.type = this._parsePropertyType(parsed, property, {
      ...context,
      usageOverrides,
    });

    const { type, usage } = parsed;

    const { readonly, visibility } = usage;

    parsed.censor = (value, context) =>
      !context.trusted && visibility === "trusted-only"
        ? undefined
        : context.consent && !validateConsent(usage, context.consent)
        ? undefined
        : type.censor(value, context);

    parsed.validate = (value, current, context, errors) => {
      if (readonly && (value || value !== current)) {
        errors.push({
          path: name,
          source: value,
          message: "The property is read-only (cannot be changed once set).",
          security: true,
        });
      }
      if (visibility !== "public" && value !== current) {
        errors.push({
          path: name,
          source: value,
          message: "The property cannot be set from untrusted context.",
          security: true,
        });
      }
      return pushInnerErrors(name, value, current, context, errors, type);
    };

    if (property.default != null) {
      property.default = throwValidationErrors(
        (errors) =>
          parsed.type.validate(
            property.default,
            undefined,
            { trusted: true },
            errors
          ),
        `The default value does not match the property type for ${parsed.id}`
      );
    }

    return parsed;
  }

  private readonly _source: readonly SchemaDefinitionSource[];

  constructor(
    schemas: readonly SchemaDefinitionSource[],
    defaultUsage = SCHEMA_DATA_USAGE_ANONYMOUS
  ) {
    this._source = schemas;
    const typeStubs: [
      context: TypeParseContext,
      variable: [scope: string, key: string] | undefined,
      type: ParsedSchemaObjectType | SchemaTypeReference
    ][] = [];
    for (const { definition: schema, referencesOnly } of schemas) {
      // Validate schema namespaces and
      // populate the type dictionary with initial type stubs without properties and base types.

      throwValidationErrors((errors) =>
        getPrimitiveTypeValidator({
          primitive: "string",
          format: "uri",
        }).validator(schema.namespace, errors)
      );

      schema.name ??= schema.namespace;

      const schemaParseContext: TypeParseContext = {
        namespace: schema.namespace!,
        defaultUsage: mergeUsage(defaultUsage, schema.usage),
        usageOverrides: schema.usage,
        referencesOnly: !!referencesOnly,
      };

      // Start by populating the types dictionary with type stubs without properties and base types.
      forEach(schema.types, ([name, type]: [string, SchemaTypeDefinition]) => {
        type.name ??= name;
        typeStubs.push([
          schemaParseContext,
          ,
          this._parseType(type, schemaParseContext, null),
        ]);
      });
    }

    for (const { definition: schema, referencesOnly } of schemas) {
      const schemaParseContext: TypeParseContext = {
        namespace: schema.namespace!,
        defaultUsage: mergeUsage(defaultUsage, schema.usage),
        usageOverrides: schema.usage,
        referencesOnly: !!referencesOnly,
      };

      // Find variables.
      forEach(schema.variables, ([scope, keys]) => {
        forEach(keys, ([key, type]) => {
          if (!("type" in type)) {
            // Not a reference, upgrade the anonymous object types to a type definition by giving it a name.

            (type as SchemaTypeDefinition).name = scope + "_" + key;
            typeStubs.push([
              schemaParseContext,
              referencesOnly ? undefined : [scope, key],
              this._parseType(type, schemaParseContext, null),
            ]);
          } else {
            // Need to resolve this one when all type stubs are parsed.
            typeStubs.push([
              schemaParseContext,
              referencesOnly ? undefined : [scope, key],
              type,
            ]);
          }
        });
      });
    }

    // Finish the types (extensions, properties).
    for (let [context, variable, type] of typeStubs) {
      type = this._parseTypeProperties(
        "type" in type ? this._parseType(type, context, null) : type,
        context
      );
      if (variable) {
        const variableKeys = get(this._variables, variable[0], () => new Map());
        const current = variableKeys.get(variable[1]);
        if (current) {
          throw new Error(
            `The type "${type.id}" cannot be registered for the variable key "${variable[1]}" in ${variable[0]} scope, since it is already used by "${current.id}".`
          );
        }
        variableKeys.set(variable[1], type);
      }
    }
  }

  getEventType<Required extends boolean = true>(
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

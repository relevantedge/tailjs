import {
  CORE_EVENT_DISCRIMINATOR,
  CORE_EVENT_TYPE,
  CORE_SCHEMA_NS,
  SCHEMA_DATA_USAGE_ANONYMOUS,
  SCHEMA_DATA_USAGE_MAX,
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
import { forEach, get } from "@tailjs/util";

export const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity = {
  validate: (value, _current, _context, _errors) => value,
  censor: (value, _context) => value,
};

import {
  ParsedSchemaObjectType,
  ParsedSchemaPropertyDefinition,
  ParsedSchemaPropertyType,
  ParsedSchemaUnionType,
  ParsedSchemaValueType,
  SCHEMA_TYPE_PROPERTY,
  SchemaTypeInfo,
  TypedSchemaData,
} from "../..";

import {
  createTypeSelector,
  getMinimumUsage,
  getPrimitiveTypeValidator,
  mergeUsage,
  pushInnerErrors,
  ValidatableSchemaEntity,
  VALIDATION_ERROR,
} from "./validation";
import { version } from "os";

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
    type: SchemaPropertyType,
    required: boolean,
    parseContext: TypeParseContext
  ): ParsedSchemaPropertyType {
    const prefix = property.name;

    if ("primitive" in type) {
      const { validator: inner, enumValues } = getPrimitiveTypeValidator(type);
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
        required,
        parseContext
      );
      return {
        source: type,
        item: itemType,
        validate: (value, current, context, errors) => {
          if (!Array.isArray(value)) {
            errors.push({
              path: prefix,
              source: value,
              message: "The value is not an array.",
            });
            return VALIDATION_ERROR;
          }
          let hasErrors = false;
          let index = 0;
          const validated: any[] = [];
          for (let item of value) {
            if (
              (item = pushInnerErrors(
                "[" + index + "]",
                item,
                current === undefined ? undefined : current[index] ?? null,
                context,
                errors,
                itemType
              )) === VALIDATION_ERROR
            ) {
              hasErrors = true;
            }
            validated.push(item);
          }

          return hasErrors ? VALIDATION_ERROR : (validated as any);
        },
        censor: (value: any, context) => {
          const censored: any[] = [];
          for (let item of value) {
            if ((item = itemType.censor(item, context)) === undefined) {
              if (required) {
                return undefined;
              }
            }
            censored.push(item);
          }
          return censored as any;
        },
      };
    }
    if ("key" in type) {
      const keyType = this._parsePropertyType(
        property,
        type.key,
        true,
        parseContext
      ) as ParsedSchemaValueType;
      const valueType = this._parsePropertyType(
        property,
        type.value,
        !!type.required,
        parseContext
      );
      return {
        source: type,
        key: keyType,
        value: valueType,
        validate: (value, current, context, errors) => {
          if (typeof value !== "object") {
            errors.push({
              path: "",
              source: value,
              message: "The value is not a record (JSON object).",
            });
            return VALIDATION_ERROR;
          }
          const validated: Record<keyof any, any> = {};
          let hasErrors = false;
          for (let key in value) {
            if (
              (key = pushInnerErrors(
                "[key]",
                key,
                undefined,
                context,
                errors,
                keyType
              )) === VALIDATION_ERROR
            ) {
              hasErrors = true;
              continue;
            }

            if (
              (validated[key] = pushInnerErrors(
                key,
                value[key],
                current === undefined ? undefined : current[key] ?? null,
                context,
                errors,
                valueType
              ))
            ) {
              hasErrors = true;
            }
          }
          return hasErrors ? VALIDATION_ERROR : validated;
        },
        censor: (value, context) => {
          const censored: Record<any, any> = {};
          for (const key in value) {
            const propertyValue = valueType.censor(value[key], context);
            if (propertyValue !== undefined) {
              censored[key] = propertyValue;
            } else if (required) {
              return undefined;
            }
          }
          return censored;
        },
      };
    }

    let union: ParsedSchemaUnionType;
    if ("properties" in type) {
      const parsed = this._parseType(type, parseContext, property);
      if (parsed.extendedBy.length) {
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
      throw new TypeError("Unsupported property type: " + JSON.stringify(type));
    }

    union = {
      union: type.union.map((type) => {
        const parsed = this._parsePropertyType(
          property,
          type,
          false,
          parseContext
        );
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
        (validated = type.validate(target, current, context, errors) as any) ===
          VALIDATION_ERROR
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
  }

  /**
   * Parses the specified type, _not_ including properties.
   * A separate call to {@link _parseTypeProperties} must follow,
   * when all types have been parsed.
   */
  private _parseType(
    source: SchemaObjectType | SchemaTypeReference | SchemaObjectType,
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
    if (!name) {
      if (!referencingProperty) {
        throw new TypeError(
          "A type must have a name or be embedded in a property."
        );
      }
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

    const parsed: ParsedSchemaObjectType = {
      id,
      name,
      namespace: context.namespace,
      usage: SCHEMA_DATA_USAGE_MAX,
      usageOverrides: undefined,
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

    if (id === CORE_EVENT_TYPE) {
      if (this._eventBaseType) {
        throw new Error(
          `The base type for tracked events ("${CORE_EVENT_TYPE}") can only be defined once.`
        );
      }
      this._eventBaseType = parsed;
    }

    let usageOverrides = (source as SchemaTypeDefinition).usage ?? {};
    if (referencingProperty != null) {
      usageOverrides = mergeUsage(
        referencingProperty.usageOverrides,
        usageOverrides
      );
      parsed.referencedBy.push(referencingProperty);
    }

    return parsed;
  }

  private _parseTypeProperties(
    parsed: ParsedSchemaObjectType,
    context: TypeParseContext
  ): ParsedSchemaObjectType {
    if (parsed.properties != null) {
      return parsed;
    }

    parsed.properties = {};

    const source = parsed.source;
    let usageOverrides = parsed.usageOverrides;
    parsed.extends =
      source.extends?.map((baseType) =>
        this._parseTypeProperties(
          this._parseType(baseType, context, null),
          context
        )
      ) ?? [];

    if (
      parsed.source["event"] ||
      parsed === this._eventBaseType ||
      parsed.extends.some((baseType) => baseType === this._eventBaseType)
    ) {
      parsed.eventNames = [];
    }

    if (
      parsed.eventNames &&
      parsed !== this._eventBaseType &&
      !parsed.extends.some((baseType) => baseType.eventNames)
    ) {
      // The first type in the inheritance chain that is an event.
      // Make the type extend the event base type (if we have any).
      if (!this._eventBaseType) {
        throw new Error(
          `The type "${parsed.id}" is marked as an event, but the base type ("${CORE_EVENT_TYPE}") is not defined in any schema.`
        );
      }
      parsed.extends.unshift(this._eventBaseType);
    }

    for (const parsedBaseType of parsed.extends) {
      if ("usage" in parsedBaseType.source) {
        usageOverrides = mergeUsage(
          usageOverrides,
          parsedBaseType.source.usage
        );
      }
      parsedBaseType.extendedBy.push(parsed);
    }

    // Don't apply context usage before we have merged the extended types' usage.
    parsed.usageOverrides = mergeUsage(context.usageOverrides, usageOverrides);

    for (const baseType of parsed.extends) {
      for (const key in baseType.properties) {
        parsed.allProperties[key] ??= baseType.properties[key];
      }
    }

    for (const key in source.properties) {
      const property = this._parseProperty(parsed, source.properties[key], {
        ...context,
        usageOverrides:
          // Overridden properties inherits the (final) usage from the overridden property.
          parsed.allProperties[key]?.usage ?? parsed.usageOverrides,
      });
      parsed.allProperties[key] = parsed.properties[key] = property;
    }

    const props = parsed.allProperties;
    if (parsed.eventNames) {
      const discriminator = props[CORE_EVENT_DISCRIMINATOR];
      if (!discriminator) {
        throw new Error(
          `The type "${parsed.id}" is marked as an event but missing the "${CORE_EVENT_DISCRIMINATOR}" property.`
        );
      }

      if (
        "enumValues" in discriminator.type &&
        discriminator.type.enumValues &&
        !context.referencesOnly
      ) {
        if (!discriminator.type.enumValues?.length) {
          throw new Error(
            `The event type "${parsed.id}" does not have any discriminator values.`
          );
        }

        (parsed.eventNames = discriminator.type.enumValues).forEach(
          (discriminator) => {
            const current = this._events.get(discriminator);
            if (current) {
              throw new Error(
                `The event type "${parsed.id}" cannot use the discriminator "${discriminator}" since that is already used by "${current.id}"`
              );
            }
            this._events.set(discriminator, parsed);
          }
        );
      }
    }
    const requiredProperties: ParsedSchemaPropertyDefinition[] = [];

    for (const key in props) {
      const prop = props[key];
      parsed.usage = getMinimumUsage(parsed.usage, prop.usage);

      prop.required && requiredProperties.push(prop);
    }

    parsed.censor = (target, context) => {
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
          if (targetValue !== censoredValue) {
            if (target === censored) {
              // Make a shallow clone if we are changing values.
              censored = { ...target };
            }
            target[key] = censoredValue;
          }
        }
      }
      return censored;
    };

    parsed.validate = (target, current, context, errors) => {
      // Here we could leverage the type's `usage` that is the minimum usage defined
      // by any property. Let's do that when we have tested the rest of this code...
      const currentErrors = errors.length;
      let validated = target;
      for (const key in target) {
        const prop = props[key];
        if (!prop) {
          errors.push({
            path: key,
            source: target,
            message: "The property is not defined in the schema.",
          });
          continue;
        }
        const targetValue = target[key];
        const validatedValue = prop.validate(
          targetValue,
          current === undefined ? undefined : current?.[key] ?? null,
          context,
          errors
        );
        if (targetValue !== validatedValue) {
          if (target === validated) {
            // Make a shallow clone if we are changing values.
            validated = { ...target };
          }
          validated[key] = targetValue;
        }
      }

      return currentErrors < errors.length ? VALIDATION_ERROR : validated;
    };

    return parsed;
  }

  private _parseProperty(
    declaringType: ParsedSchemaObjectType,
    property: SchemaPropertyDefinition,
    context: TypeParseContext
  ): ParsedSchemaPropertyDefinition {
    const usageOverrides = mergeUsage(context.usageOverrides, property.usage);

    const parsed: ParsedSchemaPropertyDefinition = {
      namespace: context.namespace,
      declaringType,
      id: declaringType.id + "_" + property.name,
      name: property.name,
      usage: mergeUsage(context.defaultUsage, usageOverrides),
      usageOverrides,
      type: null as any,

      source: property,
      ...DEFAULT_CENSOR_VALIDATE,
    };
    parsed.type = this._parsePropertyType(
      parsed,
      property.type,
      !!property.required,
      { ...context, usageOverrides }
    );
    const { type, name, usage } = parsed;

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
      if (visibility !== "public") {
        errors.push({
          path: name,
          source: value,
          message: "The property cannot be set from untrusted context.",
          security: true,
        });
      }
      return pushInnerErrors(name, value, current, context, errors, type);
    };

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
      // Parse types only (no extensions, no properties).
      schema.namespace ??=
        "urn:" + schema.name.toLowerCase().replace(/[^_:.a-zA-Z0-9]/g, "_");
      const schemaParseContext: TypeParseContext = {
        namespace: schema.namespace!,
        defaultUsage: mergeUsage(defaultUsage, schema.usage),
        usageOverrides: schema.usage,
        referencesOnly: !!referencesOnly,
      };
      schema.types?.forEach((type) =>
        typeStubs.push([
          schemaParseContext,
          ,
          this._parseType(type, schemaParseContext, null),
        ])
      );
      forEach(schema.variables, ([scope, keys]) => {
        forEach(keys, ([key, type]) => {
          if (!("type" in type)) {
            // Not a reference, yet cannot be embedded here,
            // so we give it a name.

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
      }
    }
  }

  getEvent<Required extends boolean = true>(
    eventType: string,
    required: Required = false as any
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
    required: Required = false as any,
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
    required?: Required
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

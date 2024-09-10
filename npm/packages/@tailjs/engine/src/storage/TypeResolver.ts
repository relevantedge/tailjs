import {
  CORE_EVENT_DISCRIMINATOR,
  CORE_EVENT_TYPE,
  CORE_SCHEMA_NS,
  dataClassification,
  DataUsage,
  dataVisibility,
  SCHEMA_DATA_USAGE_ANONYMOUS,
  SCHEMA_DATA_USAGE_MAX,
  SchemaArrayType,
  SchemaDataUsage,
  SchemaEmbeddedType,
  SchemaRecordType,
  SchemaTypeReference,
  SchemaUnionType,
  validateConsent,
  type SchemaDefinition,
  type SchemaPrimitiveType,
  type SchemaProperty,
  type SchemaPropertyType,
  type SchemaType,
  type VariableScope,
} from "@tailjs/types";
import { forEach, fromEntries, get, Nullish } from "@tailjs/util";

import { createTypeSelector, getPrimitiveTypeValidator } from ".";

export type SchemaDefinitionSource = {
  definition: SchemaDefinition;
  referencesOnly?: boolean;
};

export interface ParsedSchemaEntity {
  id: string;
  namespace: string;
  name: string;

  /** The minimum required usage for any data from this type to appear. */
  usage: SchemaDataUsage;

  // The usage hints as they built up following types, properties and base types.
  usageOverrides: Partial<SchemaDataUsage> | undefined;
}

export interface SchemaValidationContext {
  trusted: boolean;
}

export interface SchemaCensorContext {
  trusted: boolean;
  consent?: DataUsage;
}

export const VALIDATION_ERROR = Symbol();

export type SchemaValueValidator = <T>(
  target: T,
  current: any,
  context: SchemaValidationContext,
  errors: SchemaValidationError[]
) => T | typeof VALIDATION_ERROR;

export type SchemaCensorFunction = <T>(
  target: T,
  context: SchemaCensorContext
) => T | undefined;

export interface ValidatableSchemaEntity {
  validate: SchemaValueValidator;
  censor: SchemaCensorFunction;
}

export interface ParsedSchemaPrimitiveType extends ValidatableSchemaEntity {
  enumValues?: any[];
  source: SchemaPrimitiveType;
}

export interface ParsedSchemaArrayType extends ValidatableSchemaEntity {
  item: ParsedSchemaPropertyType;
  source: SchemaArrayType;
}

export interface ParsedSchemaRecordType extends ValidatableSchemaEntity {
  key: ParsedSchemaPrimitiveType;
  value: ParsedSchemaPropertyType;
  source: SchemaRecordType;
}

export interface ParsedSchemaUnionType extends ValidatableSchemaEntity {
  union: ParsedSchemaType[];
  source: SchemaUnionType | SchemaTypeReference | SchemaEmbeddedType;
}

export type ParsedSchemaPropertyType =
  | ParsedSchemaPrimitiveType
  | ParsedSchemaArrayType
  | ParsedSchemaRecordType
  | ParsedSchemaType
  | ParsedSchemaUnionType;

export interface ParsedSchemaType
  extends ParsedSchemaEntity,
    ValidatableSchemaEntity {
  extends: ParsedSchemaType[];

  properties: { [P in string]: ParsedSchemaProperty };

  allProperties: { [P in string]: ParsedSchemaProperty };

  embedded: boolean;

  marker: boolean;

  referencedBy: ParsedSchemaProperty[];

  extendedBy: ParsedSchemaType[];

  /**
   * The values of an event's `type` property that maps to this schema type.
   * An empty array means that the type is a base type for events that cannot be used directly.
   *
   * `null` means "unrelated to events".
   */
  eventNames: string[] | null;

  source: SchemaEmbeddedType;
}

export interface ParsedSchemaProperty
  extends ParsedSchemaEntity,
    ValidatableSchemaEntity {
  name: string;
  required?: boolean;
  type: ParsedSchemaPropertyType;

  source: SchemaProperty;

  declaringType: ParsedSchemaType;
}

type TypeParseContext = {
  namespace: string;
  defaultUsage: SchemaDataUsage;
  usageOverrides: Partial<SchemaDataUsage> | undefined;

  /** Do not load event types and variables. */
  referencesOnly: boolean;
};

export interface ParsedTypeCollection {
  events: Map<string, ParsedSchemaType>;
  variables: Map<string, Map<string, ParsedSchemaType>>;
  types: Map<string, ParsedSchemaType>;
}

export interface ParsedSchemaDefinition
  extends ParsedSchemaEntity,
    ParsedTypeCollection {
  source: SchemaDefinition;
}

export type SchemaValidationError = [
  path: string,
  message: string,
  type: "forbidden" | "invalid"
];

export const formatValidationErrors = (
  errors: readonly SchemaValidationError[]
): string | undefined => {
  if (!errors.length) return undefined;

  const formatted = errors.map(([field, message]) =>
    field ? field + ": " + message : message
  );
  return formatted.join("\n");
};

const getMinimumUsage = <T extends SchemaDataUsage | Nullish>(
  current: T,
  other: T
): T =>
  current
    ? other
      ? {
          readonly: current.readonly && other.readonly,
          visibility:
            dataVisibility.ranks[current.visibility] <=
            dataVisibility.ranks[other.visibility]
              ? current.visibility
              : other.visibility,
          classification:
            dataClassification.ranks[current.classification] <=
            dataClassification.ranks[other.classification]
              ? current.classification
              : other.classification,
          purposes: fromEntries(current.purposes, ([key, value]) =>
            value && !other.purposes[key] ? undefined : [key, value]
          ),
        }
      : current
    : (other as any);

const mergeUsage = <
  T extends undefined | Partial<SchemaDataUsage>,
  U extends undefined | Partial<SchemaDataUsage>
>(
  current: T,
  update: U
): T extends undefined ? (U extends undefined ? undefined : U) : T & U =>
  update
    ? current
      ? ({
          readonly: update.readonly ?? current.readonly,
          visibility: update.visibility ?? current.visibility,
          classification: update.classification ?? current.classification,
          purposes: update.purposes ?? current.purposes,
        } as any)
      : update
    : current;

const getTypeId = (namespace: string, name: string) => namespace + "#" + name;

const joinPath = (prefix: string, current: string) =>
  current.length ? prefix + (prefix[0] === "[" ? "" : ".") + current : prefix;

const pushInnerErrors = (
  prefix: string,
  value: any,
  current: any,
  context: SchemaValidationContext,
  errors: SchemaValidationError[],
  validatable: { validate: SchemaValueValidator }
) => {
  const innerErrors: SchemaValidationError[] = [];
  if (
    (value = validatable.validate(value, current, context, innerErrors)) ===
    VALIDATION_ERROR
  ) {
    errors.push(
      ...innerErrors.map(
        ([path, error, type]) =>
          [joinPath(prefix, path), error, type] as SchemaValidationError
      )
    );
  }
  return value;
};

const VALIDATE_PASSTHROUGH: SchemaValueValidator = (
  value,
  _current,
  _context,
  _errors
) => value;
const CENSOR_PASSTHROUGH: SchemaCensorFunction = (value, _context) => value;

const typeStub = Symbol();

export class TypeResolver {
  private readonly _types = new Map<string, ParsedSchemaType>();
  private readonly _variables = new Map<
    string,
    Map<string, ParsedSchemaType>
  >();
  private readonly _events = new Map<string, ParsedSchemaType>();

  private _eventBaseType: ParsedSchemaType | undefined;

  private _parsePropertyType(
    property: ParsedSchemaProperty,
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
            errors.push([
              prefix,
              JSON.stringify(value) + " is not an array.",
              "invalid",
            ]);
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
      ) as ParsedSchemaPrimitiveType;
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
            errors.push([
              "",
              JSON.stringify(value) + " is not a record (JSON object).",
              "invalid",
            ]);
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
          censor: CENSOR_PASSTHROUGH,
          validate: VALIDATE_PASSTHROUGH,
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
      censor: CENSOR_PASSTHROUGH,
      validate: VALIDATE_PASSTHROUGH,
    };

    const { selector } = createTypeSelector(union.union);
    union.censor = (target, context) =>
      selector(target, [])?.censor(target, context);
    union.validate = (target, current, context, errors) =>
      selector(target, errors)?.validate(target, current, context, errors) ??
      VALIDATION_ERROR;

    return union;
  }

  /**
   * Parses the specified type, _not_ including properties.
   * A separate call to {@link _parseTypeProperties} must follow,
   * when all types have been parsed.
   */
  private _parseType(
    source: SchemaType | SchemaTypeReference | SchemaEmbeddedType,
    context: TypeParseContext,
    referencingProperty: ParsedSchemaProperty | null
  ): ParsedSchemaType {
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
    let name = (source as SchemaType).name;
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

    const parsed: ParsedSchemaType = {
      id,
      name,
      namespace: context.namespace,
      usage: SCHEMA_DATA_USAGE_MAX,
      usageOverrides: undefined,
      embedded: !("name" in source),
      marker: !!source.marker,
      extends: [],
      properties: undefined as any,
      allProperties: {},
      censor: CENSOR_PASSTHROUGH,
      validate: VALIDATE_PASSTHROUGH,
      extendedBy: [],
      referencedBy: [],
      eventNames: null,
      source: source,
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

    let usageOverrides = source.usage ?? {};
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
    parsed: ParsedSchemaType,
    context: TypeParseContext
  ): ParsedSchemaType {
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
      parsed.source.event ||
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
      usageOverrides = mergeUsage(usageOverrides, parsedBaseType.source.usage);
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
    const requiredProperties: ParsedSchemaProperty[] = [];

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
          errors.push([
            key,
            "The property is not defined in the schema.",
            "invalid",
          ]);
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
    declaringType: ParsedSchemaType,
    property: SchemaProperty,
    context: TypeParseContext
  ): ParsedSchemaProperty {
    const usageOverrides = mergeUsage(context.usageOverrides, property.usage);

    const parsed: ParsedSchemaProperty = {
      namespace: context.namespace,
      declaringType,
      id: declaringType.id + "_" + property.name,
      name: property.name,
      usage: mergeUsage(context.defaultUsage, usageOverrides),
      usageOverrides,
      type: null as any,

      validate: VALIDATE_PASSTHROUGH,
      censor: CENSOR_PASSTHROUGH,
      source: property,
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
        errors.push([
          name,
          "The property is read-only (cannot be changed once set).",
          "forbidden",
        ]);
      }
      if (visibility !== "public") {
        errors.push([
          name,
          "The property cannot be set from untrusted context.",
          "forbidden",
        ]);
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
      type: ParsedSchemaType | SchemaTypeReference
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

            (type as SchemaType).name = scope + "_" + key;
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
  ): ParsedSchemaType | (Required extends true ? never : undefined) {
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
  ): ParsedSchemaType | (Required extends true ? never : undefined) {
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
    type: ParsedSchemaType;
  }[] = [];

  public get definition() {
    return JSON.stringify(this._source);
  }

  getVariable<Required extends boolean = true>(
    scope: string,
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

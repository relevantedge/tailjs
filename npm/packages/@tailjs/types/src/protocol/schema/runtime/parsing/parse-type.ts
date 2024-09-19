import {
  CORE_EVENT_DISCRIMINATOR,
  SCHEMA_DATA_USAGE_MAX,
  SchemaObjectType,
  SchemaPrimitiveType,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  SchemaTypeReference,
} from "@tailjs/types";
import { first } from "@tailjs/util";
import { parseTypeProperties, TypeParseContext } from ".";
import {
  DEFAULT_CENSOR_VALIDATE,
  ParsedSchemaObjectType,
  ParsedSchemaPropertyDefinition,
} from "../../..";
import { mergeUsage } from "../validation";

export const getTypeId = (namespace: string, name: string) =>
  namespace + "#" + name;

export const getEntityIdProperties = (id: string, version?: string) => ({
  id,
  version,
  qualifiedName: version ? id + "," + version : id,
});

/**
 * Parses the specified type, _not_ including properties.
 * A separate call to {@link _parseTypeProperties} must follow,
 * when all types have been parsed.
 */
export const parseType = (
  source:
    | SchemaObjectType
    | SchemaTypeReference
    | [name: string, definition: SchemaTypeDefinition],
  context: TypeParseContext,
  referencingProperty: ParsedSchemaPropertyDefinition | null
): ParsedSchemaObjectType => {
  let id: string;

  const { schema, parsedTypes, localTypes, systemTypes: systemTypes } = context;
  if ("type" in source) {
    id = getTypeId(source.namespace ?? schema.namespace, source.type);
    // Reference.
    const parsed = parsedTypes.get(id);
    if (!parsed) {
      throw new Error(
        `The referenced type "${id}" is not defined in any schema.`
      );
    }
    referencingProperty && parsed.referencedBy.add(referencingProperty);
    return parsed;
  }

  let name: string;
  let embedded: boolean;
  if (Array.isArray(source)) {
    name = source[0];
    source = source[1];
    embedded = false;
  } else {
    embedded = true;
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
          !(referencingProperty = first(
            referencingProperty.declaringType.referencedBy
          ) as any)
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
  id = getTypeId(schema.namespace, name);
  if (parsedTypes.has(id)) {
    throw new Error(
      `The namespace '${schema.namespace}' already contains a type with the name '${name}'.`
    );
  }

  const version = (source as SchemaTypeDefinition).version ?? schema.version;
  const stringName = "'" + id + "'";
  const parsed: ParsedSchemaObjectType = {
    ...getEntityIdProperties(id, version),
    schema,
    name,

    usage: SCHEMA_DATA_USAGE_MAX,
    usageOverrides: (source as SchemaTypeDefinition).usage ?? {},
    embedded: embedded,
    abstract: !!(source as SchemaTypeDefinition).abstract,
    extends: [],
    ownProperties: undefined as any,
    properties: {},
    extendedBy: new Set(),
    referencedBy: new Set(referencingProperty ? [referencingProperty] : []),
    source: source,
    ...DEFAULT_CENSOR_VALIDATE,
    toString: () => stringName,
  };

  parsedTypes.set(id, parsed);
  localTypes.set(name, parsed);

  if ((source as SchemaSystemTypeDefinition).system === "event") {
    if (systemTypes.event) {
      throw new Error(
        `'${id}' tries to define itself as the base type for tracked events, yet '${systemTypes.event.id}' has already done that.`
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
    systemTypes.event = parsed;
  }

  if (referencingProperty != null) {
    parsed.usageOverrides = mergeUsage(
      referencingProperty.usageOverrides,
      parsed.usageOverrides
    );
    parsed.referencedBy.add(referencingProperty);
  }

  if (embedded) {
    parseTypeProperties(parsed, context);
  }

  return parsed;
};

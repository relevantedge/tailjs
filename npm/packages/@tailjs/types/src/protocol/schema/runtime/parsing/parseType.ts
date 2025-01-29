import { first, throwError, throwTypeError } from "@tailjs/util";
import { parseBaseTypes, parseTypeProperties, TypeParseContext } from ".";
import {
  CORE_EVENT_DISCRIMINATOR,
  DEFAULT_CENSOR_VALIDATE,
  formatQualifiedTypeName,
  parseQualifiedTypeName,
  QualifiedSchemaTypeName,
  SchemaObjectType,
  SchemaObjectTypeDefinition,
  SchemaPrimitiveTypeDefinition,
  SchemaProperty,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  SchemaTypeDefinitionReference,
} from "../../../..";
import { overrideUsage } from "../validation";

export const getTypeId = (namespace: string, name: string) =>
  namespace + "#" + name;

export const getEntityIdProperties = (
  {
    namespace = throwError("Namespace expected."),
    name,
    version,
  }: QualifiedSchemaTypeName,
  postfix = ""
) => ({
  id:
    (namespace ?? throwError(`Namespace expected for ${name}`)) +
    "#" +
    name +
    postfix,
  namespace,
  version,
  qualifiedName: formatQualifiedTypeName({
    namespace,
    name: name + postfix,
    version,
  }),
});

const resolveLocalTypeMapping = (
  nameOrId: string,
  context: TypeParseContext
) => {
  nameOrId = nameOrId.split("#")[0];

  if (nameOrId === context.schema.source.localTypeMappings?.event) {
    return (
      context.systemTypes.event ??
      throwTypeError(
        "Schemas with a local mapping to the system event type must be included after the system schema"
      )
    );
  }
};

/**
 * Parses the specified type, _not_ including base types properties.
 * A separate call to {@link _parseTypeProperties} must follow,
 * when all types have been parsed.
 */
export const parseType = (
  source:
    | SchemaObjectTypeDefinition
    | SchemaTypeDefinitionReference
    | string
    | [name: string, definition: SchemaTypeDefinition],
  context: TypeParseContext,
  referencingProperty: SchemaProperty | null,
  typeNamePostfix?: string
): SchemaObjectType => {
  let id: string;

  const {
    schema,
    parsedTypes,
    localTypes,
    typeAliases,
    systemTypes: systemTypes,
  } = context;
  if (typeof source === "string") {
    source = { reference: source };
  }
  if ("reference" in source) {
    let { namespace, name } = parseQualifiedTypeName(source.reference);

    // Type reference.
    id = getTypeId(namespace ?? schema.namespace, name);
    id = typeAliases.get(id) ?? id;

    const parsed = resolveLocalTypeMapping(id, context) ?? parsedTypes.get(id);
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
    // Key/value pair from a definition's `types` map.
    [name, source] = source;
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
      if (typeNamePostfix) {
        namePath.unshift(typeNamePostfix);
      }

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
        namePath.unshift(referencingProperty.declaringType.name);
        break;
      }
    }

    name = namePath.join("_");
  }

  const mappedType = resolveLocalTypeMapping(name, context);
  if (mappedType) {
    return mappedType;
  }

  id = getTypeId(schema.namespace, name);

  if (parsedTypes.has(id)) {
    throw new Error(
      `The namespace '${schema.namespace}' already contains a type with the name '${name}'.`
    );
  }

  if (source.name && source.name !== name) {
    name = source.name;
    const originalId = id;
    id = getTypeId(schema.namespace, name);
    if (parsedTypes.has(id)) {
      throw new Error(
        `The namespace '${schema.namespace}' already contains a type with the name '${name}'.`
      );
    }
    typeAliases.set(originalId, id);
  }

  const version = (source as SchemaTypeDefinition).version ?? schema.version;
  const stringName = "'" + id + "'";
  const parsed: SchemaObjectType = {
    ...getEntityIdProperties({ namespace: schema.namespace, name, version }),
    schema,
    name,

    usage: null!,
    usageOverrides: overrideUsage(schema.usageOverrides, source) ?? {},
    embedded: embedded,
    description: (source as SchemaTypeDefinition).description,
    abstract: !!(source as SchemaTypeDefinition).abstract,
    extends: null as any, // Indicate that base types has not been parsed yet (parseBaseTypes).
    extendsAll: new Set(),
    extendedBy: [],
    extendedByAll: new Set(),
    ownProperties: null as any, // We use this to indicate the properties has not been parsed yet (parseTypeProperties).
    properties: {},
    referencedBy: new Set(referencingProperty ? [referencingProperty] : []),
    ...DEFAULT_CENSOR_VALIDATE,

    source: source,
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
      (
        source.properties?.[
          CORE_EVENT_DISCRIMINATOR
        ] as SchemaPrimitiveTypeDefinition
      )?.primitive !== "string" ||
      source.properties?.[CORE_EVENT_DISCRIMINATOR].required !== true
    ) {
      throw new Error(
        `'${id}' tries to define itself as the base type for tracked events, but is missing the required string property '${CORE_EVENT_DISCRIMINATOR}'.`
      );
    }
    systemTypes.event = parsed;
  }

  if (referencingProperty != null) {
    parsed.usageOverrides = overrideUsage(
      referencingProperty.usageOverrides,
      parsed.usageOverrides
    );
    parsed.referencedBy.add(referencingProperty);
  }

  if (embedded) {
    parseBaseTypes(parsed, context);
    parseTypeProperties(parsed, context);
  }

  return parsed;
};

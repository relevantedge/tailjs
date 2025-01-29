import {
  forEach2,
  itemize2,
  Nullish,
  OmitUnion,
  throwError,
} from "@tailjs/util";
import { getEntityIdProperties, parsePropertyType, TypeParseContext } from ".";
import {
  DEFAULT_CENSOR_VALIDATE,
  handleValidationErrors,
  SchemaObjectType,
  SchemaProperty,
  SchemaPropertyDefinition,
} from "../../../..";
import {
  createAccessValidator,
  createCensorAction,
  overrideUsage,
} from "../validation";

type MatchPropertyType<DeclaringType> = DeclaringType extends Nullish
  ? OmitUnion<
      SchemaProperty,
      "id" | "version" | "qualifiedName" | "declaringType"
    >
  : SchemaProperty;

export const parseProperty = <DeclaringType extends SchemaObjectType | null>(
  declaringType: DeclaringType,
  name: string,
  definition: SchemaPropertyDefinition,
  context: TypeParseContext,
  baseProperty?: SchemaProperty
): MatchPropertyType<DeclaringType> => {
  const usageOverrides = overrideUsage(
    // Properties inherit usage from base properties, not from the type that overrides them.
    baseProperty
      ? baseProperty.usageOverrides
      : declaringType
      ? declaringType.usageOverrides
      : context.schema.usageOverrides,
    definition
  );

  const { defaultUsage } = context;

  const parsedProperty: MatchPropertyType<DeclaringType> = {
    ...(declaringType && getEntityIdProperties(declaringType, "." + name)),
    schema: declaringType?.schema ?? context.schema,
    ...(declaringType && { declaringType }),
    name,
    description: definition.description,
    usage: overrideUsage(defaultUsage, usageOverrides),
    usageOverrides,
    type: null as any,
    required: !!definition.required,
    source: definition,
    ...DEFAULT_CENSOR_VALIDATE,
  };

  if (baseProperty?.required) {
    if (definition.required === false) {
      throw new Error(
        "A property cannot explicitly be defined as optional if its base property is required."
      );
    }
    parsedProperty.required = true;
  }

  parsedProperty.type =
    definition["reference"] === "base"
      ? baseProperty?.type ??
        throwError(
          "The property type 'base' is only valid for overriding properties"
        )
      : parsePropertyType(
          declaringType ? (parsedProperty as SchemaProperty) : null,
          definition,
          {
            ...context,
            usageOverrides,
          }
        );

  const { type, usage } = parsedProperty;

  const logId = `'${
    declaringType ? (parsedProperty as SchemaProperty).id : parsedProperty.name
  }'`;

  if ((parsedProperty.baseProperty = baseProperty)) {
    const overrideError = (
      message = `The types ${baseProperty.type} and ${parsedProperty.type} are not compatible.`
    ) =>
      throwError(
        `The property ${logId} cannot override '${baseProperty.id}': ${message}.`
      );

    let baseType = baseProperty.type;
    let type = parsedProperty.type;
    while (true) {
      if ("item" in baseType) {
        type = type["item"] ?? overrideError();
        continue;
      }
      if ("value" in baseType) {
        type = type["value"] ?? overrideError();
        continue;
      }
      break;
    }

    const baseTypes =
      "union" in baseType
        ? baseType.union.filter((type) => "properties" in type)
        : "extendedBy" in baseType
        ? [baseType]
        : null;

    const types =
      "union" in type
        ? type.union.filter((type) => "properties" in type)
        : "extendedBy" in type
        ? [type]
        : null;

    if (baseTypes && types) {
      forEach2(
        types,
        (type) =>
          !baseTypes.some(
            (baseType) => type !== baseType && !baseType.extendedByAll.has(type)
          ) &&
          overrideError(
            `The type ${type} is not the same or an extension of the base property's ${itemize2(
              baseTypes,
              "or"
            )}`
          )
      );
    } else if ("enumValues" in type && type.enumValues) {
      if ("enumValues" in baseType && baseType.enumValues) {
        for (const value of type.enumValues) {
          if (!baseType.enumValues.has(value)) {
            overrideError();
          }
          if (baseType.enumValues.size === type.enumValues.size) {
            // They are the same, so we enable reference equality
            // between the types
            parsedProperty.type = baseType;
          }
        }
      }
    } else if ("" + baseType !== "" + type) {
      overrideError();
    } else {
      // Always merge base property type.
      // We do not handle min/max value or max-length overrides.
      parsedProperty.type = baseType;
    }
  }

  parsedProperty.censor = createCensorAction(usage, type);
  parsedProperty.validate = createAccessValidator(
    name,
    type,
    usage,
    "property"
  );

  if (definition.default != null) {
    definition.default = handleValidationErrors(
      (errors) =>
        parsedProperty.type.validate(
          definition.default,
          undefined,
          { trusted: true },
          errors
        ),
      null,
      `The default value does not match the property type for ${logId}.`
    );
  }

  return parsedProperty;
};

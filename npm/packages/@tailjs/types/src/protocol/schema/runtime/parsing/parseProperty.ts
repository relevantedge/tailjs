import { enumerate, forEach, throwError } from "@tailjs/util";
import { getEntityIdProperties, parsePropertyType, TypeParseContext } from ".";
import {
  DEFAULT_CENSOR_VALIDATE,
  SchemaObjectType,
  SchemaProperty,
  SchemaPropertyDefinition,
  throwValidationErrors,
  validateConsent,
} from "../../../..";
import {
  createAccessValidator,
  createCensorAction,
  overrideUsage,
} from "../validation";

export const parseProperty = (
  declaringType: SchemaObjectType,
  name: string,
  property: SchemaPropertyDefinition,
  context: TypeParseContext,
  baseProperty?: SchemaProperty
): SchemaProperty => {
  const usageOverrides = overrideUsage(
    // Properties inherit usage from base properties, not from the type that overrides them.
    baseProperty ? baseProperty.usageOverrides : declaringType.usageOverrides,
    property
  );

  const { defaultUsage } = context;

  const parsedProperty: SchemaProperty = {
    ...getEntityIdProperties(
      declaringType.id + "." + name,
      declaringType.version
    ),
    schema: declaringType.schema,
    declaringType,
    name,
    usage: overrideUsage(defaultUsage, usageOverrides),
    usageOverrides,
    type: null as any,
    required: !!property.required,
    source: property,
    ...DEFAULT_CENSOR_VALIDATE,
  };
  parsedProperty.type =
    property["type"] === "base"
      ? baseProperty?.type ??
        throwError(
          "The property type 'base' is only valid for overriding properties"
        )
      : parsePropertyType(parsedProperty, property, {
          ...context,
          usageOverrides,
        });

  const { type, usage } = parsedProperty;

  if (baseProperty?.required) {
    if (property.required === false) {
      throw new Error(
        "A property cannot explicitly be defined as optional if its base property is required."
      );
    }
    parsedProperty.required = true;
  }

  if ((parsedProperty.baseProperty = baseProperty)) {
    const overrideError = (
      message = `The types ${baseProperty.type} and ${parsedProperty.type} are not compatible.`
    ) =>
      throwError(
        `The property '${parsedProperty.id}' cannot override '${baseProperty.id}': ${message}.`
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
        ? baseType.union
        : "extendedBy" in baseType
        ? [baseType]
        : null;
    const types =
      "union" in type ? type.union : "extendedBy" in type ? [type] : null;
    if (baseTypes && types) {
      forEach(
        types,
        (type) =>
          !baseTypes.some(
            (baseType) => type !== baseType && !baseType.extendedByAll.has(type)
          ) &&
          overrideError(
            `The type ${type} is not the same or an extension of the base property's ${enumerate(
              baseTypes,
              ["or"]
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

  if (property.default != null) {
    property.default = throwValidationErrors(
      (errors) =>
        parsedProperty.type.validate(
          property.default,
          undefined,
          { trusted: true },
          errors
        ),
      `The default value does not match the property type for ${parsedProperty.id}`
    );
  }

  return parsedProperty;
};

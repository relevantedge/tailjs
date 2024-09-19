import { add, forEach, throwError } from "@tailjs/util";
import {
  createSchemaTypeMapper,
  parseProperty,
  parseType,
  TypeParseContext,
} from ".";
import {
  ParsedSchemaObjectType,
  ParsedSchemaPropertyDefinition,
} from "../../..";
import {
  getMinimumUsage,
  mergeUsage,
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR,
} from "../validation";

export const parseTypeProperties = (
  parsedType: ParsedSchemaObjectType,
  context: TypeParseContext
): ParsedSchemaObjectType => {
  if (parsedType.ownProperties != null) {
    return parsedType;
  }

  const { systemTypes: systemTypes, usageOverrides: baseUsageOverrides } =
    context;

  parsedType.ownProperties = {};

  const source = parsedType.source;
  let usageOverrides = parsedType.usageOverrides;
  parsedType.extends =
    source.extends?.map((baseType) =>
      parseTypeProperties(parseType(baseType, context, null), context)
    ) ?? [];

  if (
    parsedType.source["event"] &&
    !parsedType.extends.some((baseType) =>
      systemTypes.event?.extendedBy.has(baseType)
    )
  ) {
    parsedType.extends.unshift(
      systemTypes.event ??
        throwError(
          "The system base type for tracked events has not been defined."
        )
    );
  }

  for (const parsedBaseType of parsedType.extends) {
    if ("usage" in parsedBaseType.source) {
      usageOverrides = mergeUsage(parsedBaseType.source.usage, usageOverrides);
    }
    const traverse = (baseType: ParsedSchemaObjectType) =>
      add(baseType.extendedBy, parsedType) &&
      forEach(baseType.extends, traverse);
    traverse(parsedBaseType);
  }

  // Don't apply context usage before we have merged the extended types' usage.
  parsedType.usageOverrides = mergeUsage(baseUsageOverrides, usageOverrides);

  for (const baseType of parsedType.extends) {
    for (const key in baseType.ownProperties) {
      parsedType.properties[key] ??= baseType.ownProperties[key];
    }
  }

  for (const key in source.properties) {
    const parsedProperty = parseProperty(
      parsedType,
      key,
      source.properties[key],
      context,
      parsedType.properties[key]
    );

    parsedType.properties[key] = parsedType.ownProperties[key] = parsedProperty;
  }

  const props = parsedType.properties;

  const requiredProperties: ParsedSchemaPropertyDefinition[] = [];

  for (const key in props) {
    const prop = props[key];
    parsedType.usage = getMinimumUsage(parsedType.usage, prop.usage);

    prop.required && requiredProperties.push(prop);
  }
  parsedType.schema.usage = getMinimumUsage(
    parsedType.schema.usage,
    parsedType.usage
  );

  const censor: SchemaCensorFunction = (target, context) => {
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
        if (!censoredValue) {
          delete censored[key];
        } else {
          censored[key] = censoredValue;
        }
      }
    }
    return censored;
  };

  const validate: SchemaValueValidator = (target, current, context, errors) => {
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

  if (parsedType.extendedBy.size) {
    const {
      mapped,
      validation: { censor: polymorphicCensor, validate: polymorphicValidate },
    } = createSchemaTypeMapper([parsedType]);

    parsedType.censor = (target, context, polymorphic = true) =>
      (polymorphic ? polymorphicCensor : censor)(target, context);

    parsedType.validate = (
      target,
      current,
      context,
      errors,
      polymorphic = true
    ) =>
      (polymorphic ? polymorphicValidate : validate)(
        target,
        current,
        context,
        errors
      );

    // If the type cannot be mapped directly to a value
    parsedType.abstract ||= !mapped.has(parsedType);
  } else {
    parsedType.censor = censor;
    parsedType.validate = validate;
  }

  return parsedType;
};

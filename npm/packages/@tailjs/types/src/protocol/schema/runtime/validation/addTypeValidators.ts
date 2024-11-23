import {
  getMinimumUsage,
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR,
} from ".";
import {
  SCHEMA_TYPE_PROPERTY,
  SchemaObjectType,
  SchemaProperty,
} from "../../../..";
import { createSchemaTypeMapper } from "../parsing";

export const addTypeValidators = (type: SchemaObjectType) => {
  const props = type.properties;

  const requiredProperties: SchemaProperty[] = [];

  for (const key in props) {
    const prop = props[key];
    type.usage = getMinimumUsage(type.usage, prop.usage);
    prop.required && requiredProperties.push(prop);
  }

  const censor: SchemaCensorFunction = (target, context) => {
    let censored = target;

    for (const key in target) {
      if (key === SCHEMA_TYPE_PROPERTY) continue;

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
    const validateProperty = (prop: SchemaProperty) => {
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
      if (key === SCHEMA_TYPE_PROPERTY) continue;

      const prop = props[key];
      if (!prop) {
        errors.push({
          path: key,
          source: target,
          message: `The property is not defined for the type '${type.id}'.`,
        });
        continue;
      } else if (!prop.required) {
        // Required properties have already been validated.
        validateProperty(prop);
      }
    }

    validated[SCHEMA_TYPE_PROPERTY] = type.version
      ? [type.id, type.version]
      : [type.id];
    return currentErrors < errors.length ? VALIDATION_ERROR : validated;
  };

  if (type.extendedBy.length) {
    const { censor: polymorphicCensor, validate: polymorphicValidate } =
      createSchemaTypeMapper([type]);

    type.censor = (target, context, polymorphic = true) =>
      (polymorphic ? polymorphicCensor : censor)(target, context);

    type.validate = (target, current, context, errors, polymorphic = true) =>
      (polymorphic ? polymorphicValidate : validate)(
        target,
        current,
        context,
        errors
      );
  } else {
    type.censor = censor;
    type.validate = validate;
  }
};

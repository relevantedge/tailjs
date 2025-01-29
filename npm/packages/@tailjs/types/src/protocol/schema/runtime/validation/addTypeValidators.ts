import { isArray } from "@tailjs/util";
import {
  formatErrorSource,
  getMinimumUsage,
  handleValidationErrors,
  SchemaCensorFunction,
  SchemaValueValidator,
  VALIDATION_ERROR_SYMBOL,
} from ".";
import {
  SCHEMA_PRIVACY_PROPERTY,
  SCHEMA_TYPE_PROPERTY,
  SchemaObjectType,
  SchemaProperty,
  SchemaTypedDataPrivacyInfo,
} from "../../../..";
import {
  createAbstractTypeValidator,
  createSchemaTypeMapper,
} from "../parsing";

export const addTypeValidators = (type: SchemaObjectType) => {
  const props = type.properties;

  const requiredProperties: SchemaProperty[] = [];

  for (const key in props) {
    const prop = props[key];
    type.usage = getMinimumUsage(type.usage, prop.usage);
    prop.required && requiredProperties.push(prop);
  }

  const censor: SchemaCensorFunction = (target, context) => {
    if (target == null || target === VALIDATION_ERROR_SYMBOL) {
      return target;
    }
    let censored = target;
    let privacy: SchemaTypedDataPrivacyInfo | undefined;

    for (const key in target) {
      if (key === SCHEMA_TYPE_PROPERTY || key === SCHEMA_PRIVACY_PROPERTY) {
        continue;
      }

      const prop = props[key];
      const targetValue = target[key];
      const censoredValue = !prop
        ? // Remove keys we do not know.
          undefined
        : prop.censor(targetValue, context);

      if (censoredValue != targetValue) {
        (privacy ??= {}).censored = true;
        if (censoredValue === undefined && prop.required) {
          if (!context.forResponse) {
            // When a required property gets completely censored away during write,
            // the entire object becomes censored (since it would be invalid if missing a required property).
            return undefined;
          }
          privacy.invalid = true;
        }
        if (target === censored) {
          // Make a shallow clone if we are changing values.
          censored = { ...target };
        }
        if (censoredValue === undefined) {
          delete censored[key];
        } else {
          censored[key] = censoredValue as any;
        }
      }
    }

    if (privacy) {
      censored[SCHEMA_PRIVACY_PROPERTY] = privacy;
    }
    return censored;
  };

  const validate: SchemaValueValidator = (
    target: any,
    current,
    context,
    errors
  ) =>
    handleValidationErrors((errors) => {
      if (typeof target !== "object" || isArray(target) || target == null) {
        errors.push({
          path: "",
          type,
          source: target,
          message: `${formatErrorSource(target)} is not an object.`,
        });
        return VALIDATION_ERROR_SYMBOL;
      }

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
            validatedValue === VALIDATION_ERROR_SYMBOL
              ? (undefined as any)
              : validatedValue;
        }
      };

      for (const required of requiredProperties) {
        validateProperty(required);
      }
      for (const key in target) {
        if (key === SCHEMA_TYPE_PROPERTY || key === SCHEMA_PRIVACY_PROPERTY)
          continue;

        const prop = props[key];
        if (!prop) {
          errors.push({
            path: key,
            type,
            source: target,
            message: `The property is not defined for the type '${type.id}'.`,
          });
          continue;
        } else if (!prop.required) {
          // Required properties have already been validated.
          validateProperty(prop);
        }
      }
      if (currentErrors < errors.length) {
        return VALIDATION_ERROR_SYMBOL;
      }

      validated[SCHEMA_TYPE_PROPERTY] = type.qualifiedName;

      return validated;
    }, errors);

  if (type.abstract) {
    if (type.referencedBy.size) {
      // Polymorphic validation only applies to abstract types that are referenced by properties.
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
      ({ censor: type.censor, validate: type.validate } =
        createAbstractTypeValidator(type));
    }
  } else {
    type.censor = censor;
    type.validate = validate;
  }
};

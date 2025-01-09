import { indent2, isArray, map, throwError } from "@tailjs/util";
import { createSchemaTypeMapper, parseType, TypeParseContext } from ".";
import {
  SchemaObjectType,
  SchemaPrimitiveType,
  SchemaProperty,
  SchemaPropertyType,
  SchemaPropertyTypeDefinition,
  VALIDATION_ERROR_SYMBOL,
} from "../../../..";
import {
  formatErrorSource,
  formatValidationErrors,
  getPrimitiveTypeValidator,
  handleValidationErrors,
  pushInnerErrors,
  SchemaCensorFunction,
  SchemaValueValidator,
  ValidationErrorContext,
} from "../validation";

export const parsePropertyType = (
  property: SchemaProperty | null,
  definition: SchemaPropertyTypeDefinition & { required?: boolean },
  parseContext: TypeParseContext,
  allowNumericStrings = false,
  typeNamePostfix?: string
): SchemaPropertyType => {
  const propertyType = ((): SchemaPropertyType => {
    if ("primitive" in definition || "enum" in definition) {
      const {
        validator: inner,
        enumValues,
        primitive,
      } = getPrimitiveTypeValidator(definition, allowNumericStrings);
      let name = primitive;
      if ("format" in definition) {
        name += " (" + definition.format + ")";
      }
      if (enumValues) {
        name +=
          " [" +
          map(enumValues, (value) => JSON.stringify(value)).join(", ") +
          "]";
      }

      const parsedType: SchemaPropertyType = {
        source: definition,
        primitive,
        enumValues,
        validate: (value, _current, _context, errors) =>
          handleValidationErrors(
            (errors) => (
              errors.forEach((error) => (error.type = parsedType)),
              inner(value, errors)
            ),
            errors
          ),
        censor: (value) => value,
        toString: () => name,
      };
      return parsedType;
    }
    if ("item" in definition) {
      const itemType = parsePropertyType(
        property,
        definition.item,
        parseContext
      );
      const required = !!definition.required;

      const name = "array(" + itemType + ")";
      const parsedType: SchemaPropertyType = {
        source: definition,
        item: itemType,

        censor: (value: any, context) => {
          let censored: any[] = value;
          let index = 0;
          for (let item of value) {
            const censoredItem = itemType.censor(item, context);
            if (censoredItem !== item) {
              if (censoredItem == null && required) {
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
        validate: (value, current, context, errors) =>
          handleValidationErrors((errors) => {
            if (!Array.isArray(value)) {
              errors.push({
                path: "",
                type: parsedType,
                source: value,
                message: `${formatErrorSource(value)} is not an array.`,
              });
              return VALIDATION_ERROR_SYMBOL;
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
                  validatedItem === VALIDATION_ERROR_SYMBOL
                    ? undefined
                    : validatedItem;
              }

              ++index;
            }

            return errors.length > initialErrors
              ? VALIDATION_ERROR_SYMBOL
              : (validated as any);
          }, errors),
        toString: () => name,
      };
      return parsedType;
    }
    if ("key" in definition) {
      const keyType = parsePropertyType(
        property,
        { ...definition.key, required: true },
        parseContext,
        true
      ) as SchemaPrimitiveType;
      const valueType = parsePropertyType(
        property,
        definition.value,
        parseContext
      );
      const name = "record(" + keyType + ", " + valueType + ")";
      const parsedType: SchemaPropertyType = {
        source: definition,
        key: keyType,
        value: valueType,

        censor: (value, context) => {
          let censored: Record<any, any> = {};
          for (const key in value) {
            const propertyValue = value[key];
            const censoredPropertyValue = valueType.censor(
              propertyValue,
              context
            );
            if (censoredPropertyValue !== propertyValue) {
              if (definition.value.required && censoredPropertyValue == null) {
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
        validate: (value, current, context, errors) =>
          handleValidationErrors((errors) => {
            if (!value || typeof value !== "object" || isArray(value)) {
              errors.push({
                path: "",
                type: parsedType,
                source: value,
                message: `${formatErrorSource(
                  value
                )} is not a record (JSON object).`,
              });
              return VALIDATION_ERROR_SYMBOL;
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
                ) === VALIDATION_ERROR_SYMBOL
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
                  validatedProperty === VALIDATION_ERROR_SYMBOL
                    ? undefined
                    : validatedProperty;
              }
            }
            return errors.length > initialErrors
              ? VALIDATION_ERROR_SYMBOL
              : validated;
          }, errors),
        toString: () => name,
      };
      return parsedType;
    }

    if ("properties" in definition || "reference" in definition) {
      if (!property) {
        throwError(
          "Object-typed properties can only be parsed in the context of a name property (none was provided)."
        );
      }
      return parseType(definition, parseContext, property, typeNamePostfix);
    }

    if (!("union" in definition)) {
      throwError("Unsupported property type: " + JSON.stringify(definition));
    }

    const unionTypes = definition.union.map((type, i) =>
      parsePropertyType(property, type, parseContext, false, "" + i)
    );
    if (!unionTypes.length) {
      throwError("Empty union types are not allowed.");
    }

    const validators: {
      censor: SchemaCensorFunction;
      validate: SchemaValueValidator;
    }[] = [];

    const objectTypes: SchemaObjectType[] = [];

    for (const type of unionTypes) {
      if ("properties" in type) {
        objectTypes.push(type);
      } else {
        validators.push({ censor: type.censor, validate: type.validate });
      }
    }
    if (objectTypes.length) {
      validators.push(createSchemaTypeMapper(objectTypes));
    }

    const unionTypeList = unionTypes.map((type) => "" + type).join(", ");
    const name = `union(${unionTypeList})`;

    const parsedType: SchemaPropertyType = {
      union: unionTypes,
      source: definition,
      censor:
        validators.length === 1
          ? validators[0].censor
          : (target, context, polymorphic) => {
              for (const { censor, validate } of validators) {
                if (
                  validate(
                    target as any,
                    undefined,
                    context,
                    [],
                    polymorphic
                  ) !== VALIDATION_ERROR_SYMBOL
                ) {
                  return censor(target, context, polymorphic);
                }
                return target;
              }
            },
      validate:
        validators.length === 1
          ? validators[0].validate
          : (target, current, context, errors, polymorphic) =>
              handleValidationErrors((errors) => {
                const aggregatedErrors: ValidationErrorContext[] = [];
                for (const { validate } of validators) {
                  const validated = validate(
                    target as any,
                    current,
                    context,
                    aggregatedErrors,
                    polymorphic
                  );
                  if (validated !== VALIDATION_ERROR_SYMBOL) {
                    return validated;
                  }
                }

                errors.push({
                  path: "",
                  type: parsedType,
                  source: target,
                  message: `${formatErrorSource(
                    target
                  )} does not match any of the allowed types ${unionTypeList}:\n${indent2(
                    formatValidationErrors(aggregatedErrors, "- ")
                  )}`,
                });

                return VALIDATION_ERROR_SYMBOL;
              }, errors),
      toString: () => name,
    };
    return parsedType;
  })();

  if (property && (definition.required || property.required)) {
    const inner = propertyType.validate;
    propertyType.validate = (value, current, context, errors) =>
      handleValidationErrors((errors) => {
        if (value == null) {
          errors.push({
            path: "",
            type: propertyType,
            message: "A value is required",
            source: value,
          });
          return VALIDATION_ERROR_SYMBOL;
        }
        return inner(value, current, context, errors);
      }, errors);
  }

  return propertyType;
};

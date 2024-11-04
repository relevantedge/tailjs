import { SchemaPropertyType } from "@tailjs/types";
import { isArray, map, throwError } from "@tailjs/util";
import { createSchemaTypeMapper, parseType, TypeParseContext } from ".";
import {
  ParsedSchemaPrimitiveType,
  ParsedSchemaPropertyDefinition,
  ParsedSchemaPropertyType,
  VALIDATION_ERROR,
} from "../../..";
import { getPrimitiveTypeValidator, pushInnerErrors } from "../validation";

export const parsePropertyType = (
  property: ParsedSchemaPropertyDefinition,
  type: SchemaPropertyType & { required?: boolean },
  parseContext: TypeParseContext
): ParsedSchemaPropertyType => {
  const propertyType = ((): ParsedSchemaPropertyType => {
    if ("primitive" in type || "enum" in type) {
      const {
        validator: inner,
        enumValues,
        primitive,
      } = getPrimitiveTypeValidator(type);
      let name = primitive;
      if ("format" in type) {
        name += " (" + type.format + ")";
      }
      if (enumValues) {
        name +=
          " [" +
          map(enumValues, (value) => JSON.stringify(value)).join(", ") +
          "]";
      }

      return {
        source: type,
        primitive,
        enumValues,
        validate: (value, _current, _context, errors) => inner(value, errors),
        censor: (value) => value,
        toString: () => name,
      };
    }
    if ("item" in type) {
      const itemType = parsePropertyType(property, type.item, parseContext);
      const required = !!type.required;

      const name = "array(" + itemType + ")";
      return {
        source: type,
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
        validate: (value, current, context, errors) => {
          if (!Array.isArray(value)) {
            errors.push({
              path: "",
              source: value,
              message: `${JSON.stringify(value)} is not an array.`,
            });
            return VALIDATION_ERROR;
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
                validatedItem === VALIDATION_ERROR ? undefined : validatedItem;
            }

            ++index;
          }

          return errors.length > initialErrors
            ? VALIDATION_ERROR
            : (validated as any);
        },
        toString: () => name,
      };
    }
    if ("key" in type) {
      const keyType = parsePropertyType(
        property,
        { ...type.key, required: true },
        parseContext
      ) as ParsedSchemaPrimitiveType;
      const valueType = parsePropertyType(property, type.value, parseContext);
      const name = "record(" + keyType + ", " + valueType + ")";
      return {
        source: type,
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
              if (type.value.required && censoredPropertyValue == null) {
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
        validate: (value, current, context, errors) => {
          if (typeof value !== "object" || isArray(value)) {
            errors.push({
              path: "",
              source: value,
              message: `${JSON.stringify(
                value
              )} is not a record (JSON object).`,
            });
            return VALIDATION_ERROR;
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
              ) === VALIDATION_ERROR
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
                validatedProperty === VALIDATION_ERROR
                  ? undefined
                  : validatedProperty;
            }
          }
          return errors.length > initialErrors ? VALIDATION_ERROR : validated;
        },
        toString: () => name,
      };
    }

    if ("properties" in type || "type" in type) {
      return parseType(type, parseContext, property);
    }
    if (!("union" in type)) {
      throwError("Unsupported property type: " + JSON.stringify(type));
    }

    const union = type.union.map((type) =>
      parseType(type, parseContext, property)
    );

    const { censor, validate } = createSchemaTypeMapper(union);

    const name = "union(" + union.map((type) => "" + type).join(", ") + ")";
    return {
      union,
      source: type,
      censor,
      validate,
      toString: () => name,
    };
  })();

  if (type.required) {
    const inner = propertyType.validate.bind(propertyType);
    propertyType.validate = (value, current, context, errors) => {
      if (value == null) {
        errors.push({
          path: "",
          message: "A value is required",
          source: value,
        });
        return VALIDATION_ERROR;
      }
      return inner(value, current, context, errors);
    };
  }
  return propertyType;
};

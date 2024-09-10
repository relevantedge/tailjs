import {
  SchemaEmbeddedType,
  DataPurposeName,
  formatDataUsage,
  SchemaProperty,
  SchemaPropertyType,
  UserConsent,
} from "@tailjs/types";
import {
  getDefaultParseContext,
  getMinimumUsage,
  mergeUsage,
  SchemaParseContext,
  validateAccess,
  validateConsent,
  ValidateConsentOptions,
} from ".";
import {
  ParsedSchemaProperty,
  ParsedSchemaPropertyType,
  ParsedSchemaType,
  VariableStorageContext,
} from "../..";

const parsedTypeSymbol = Symbol();
const validatorSymbol = Symbol();
export type ValidatorFunction = (
  value: any,
  previousValue: any | null,
  context: {
    read: boolean;
    consent?: UserConsent;
    trusted?: boolean;
  } & ValidateConsentOptions,
  path: string,
  errors: string[]
) => any;

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}Z$/;
const REGEX_DATETIME =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?)?Z$/;
const REGEX_GUID =
  /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

const extendPath = (current: string, segment: string, sep: string) =>
  current ? current + sep + segment : segment;

const cachedTypeValidators = new Map<string, ValidatorFunction>();

const getParsedPropertyType = (
  type: SchemaPropertyType
): ParsedSchemaPropertyType => {
  if (typeof type === "string" || "const" in type) {
    return type;
  }
  if ("item" in type) {
    return { ...type, item: getParsedPropertyType(type.value) };
  }
  return type[parsedTypeSymbol] as ParsedSchemaType;
};

const getTypeValidator = (
  type: SchemaPropertyType,
  // For anonymous types.
  parseContext: SchemaParseContext
): ValidatorFunction => {
  let validator = cachedTypeValidators.get(JSON.stringify(type));
  if (validator) {
    return validator;
  }

  let typeTest: ((value: any) => boolean) | undefined;
  let validationError: string;
  let innerValidator: ValidatorFunction;
  switch (type) {
    case "boolean":
      typeTest = (value) => typeof value === "boolean";
      validationError = "is not a valid Boolean";
      break;
    case "date":
      typeTest = (value) =>
        typeof value === "string" &&
        REGEX_DATE.exec(value) != null &&
        !isNaN(new Date(value).valueOf());
      validationError = "is not a valid ISO8601 date";
      break;
    case "datetime":
      typeTest = (value) =>
        typeof value === "string" &&
        REGEX_DATETIME.exec(value) != null &&
        !isNaN(new Date(value).valueOf());
      validationError = "is not a valid ISO8601 date time";
      break;
    case "duration":
      typeTest = (value) => Number.isInteger(value);
      validationError = "is not a valid duration";
      break;
    case "timestamp":
      typeTest = (value) => Number.isInteger(value);
      validationError = "is not a valid UNIX timestamp (ms)";
      break;
    case "integer":
      typeTest = Number.isInteger;
      validationError = "is not a valid integer";
      break;
    case "number":
      typeTest = (value) => !Number.isNaN(value);
      validationError = "is not a valid number";
      break;
    case "string":
      typeTest = (value) => typeof value === "string";
      validationError = "is not a valid string";
      break;
    case "uuid":
      typeTest = (value) =>
        typeof value === "string" && REGEX_GUID.exec(value) != null;
      validationError = "is not a valid UUID";
      break;
    default:
      if ("const" in type) {
        typeTest = (value) => value === type.enum;
        validationError = "must have the value " + JSON.stringify(type.enum);
        break;
      }

      if ("key" in type) {
        typeTest = (value) => value !== null && typeof value === "object";
        validationError = "must be an object";
        const keyValidator = getTypeValidator(type.key, parseContext);
        const itemValidator = getTypeValidator(type.value, parseContext);
        innerValidator = (value, prev, context, path, errors) => {
          const validatedItems: Record<any, any> = [];
          let currentErrorCount = errors.length;
          for (const key in value) {
            keyValidator(
              key,
              undefined,
              context,
              extendPath(path, key, "."),
              errors
            );
            const validatedValue = itemValidator(
              value[key],
              undefined,
              context,
              extendPath(path, key, "."),
              errors
            );
            if (
              currentErrorCount !== (currentErrorCount = errors.length) ||
              validatedValue == null
            ) {
              continue;
            }
            validatedItems[key] = validatedValue;
          }
          return validatedItems;
        };
        break;
      }
      if ("item" in type) {
        typeTest = Array.isArray;
        validationError = "must be an array";
        const itemValidator = getTypeValidator(type.item, parseContext);
        innerValidator = (value, prev, context, path, errors) => {
          const validatedItems: any[] = [];
          let i = 0;
          for (const item of value) {
            const validated = itemValidator(
              item,
              undefined,
              context,
              extendPath(path, "[" + i++ + "]", ""),
              errors
            );
            if (validated != null) {
              validatedItems.push(validated);
            }
          }
          return validatedItems;
        };
        break;
      }
      const anonymousType = "properties" in type;
      if ("type" in type || anonymousType) {
        typeTest = (value) => value !== null && typeof value === "object";
        validationError = "must be an object";
        const parsedType = parseSchemaEntity(
          anonymousType ? type : parseContext.resolveType(type, parseContext),
          anonymousType ? parseContext : getDefaultParseContext(parseContext)
        );

        type[parsedTypeSymbol] = parsedType;
        innerValidator = parsedType.source[validatorSymbol];
        break;
      }
  }
  if (typeTest == null) {
    throw new Error("Unknown property type " + JSON.stringify(type));
  }

  cachedTypeValidators.set(
    JSON.stringify(type),
    (validator = (value, prev, context, path, errors) => {
      if (!typeTest(value)) {
        !context.read && errors.push(path + " " + validationError);

        return undefined;
      }

      return innerValidator
        ? innerValidator(value, prev, context, path, errors)
        : value;
    })
  );

  return validator;
};

export const parseSchemaEntity: {
  (
    type: SchemaEmbeddedType,
    parseContext: SchemaParseContext
  ): ParsedSchemaType;
  (
    type: SchemaProperty,
    parseContext: SchemaParseContext
  ): ParsedSchemaProperty;
} = (
  entity: SchemaEmbeddedType | SchemaProperty,
  parseContext: SchemaParseContext
): any => {
  let parsed = entity[parsedTypeSymbol];
  if (parsed) {
    return entity[parsedTypeSymbol];
  }

  let validator: ValidatorFunction;

  const props: Record<string, SchemaProperty> = {};
  const ownProps: Record<string, ParsedSchemaProperty> = {};

  const required: SchemaProperty[] = [];
  if ("properties" in entity) {
    const anonymous = !entity.name;

    if (!(entity.name ??= parseContext?.propertyPath)) {
      throw new Error(
        "An anonymous type can only be parsed in the context of a property or variable key."
      );
    }

    const typeId = parseContext.schema.namespace + "#" + entity.name;

    let baseType = entity;
    let usage = mergeUsage(entity.usage, parseContext?.defaultUsage);

    let minimumUsage = usage;

    let parsedBaseType: ParsedSchemaType | undefined;
    for (;;) {
      if (baseType !== entity) {
        // Make sure it is parsed.
        parsedBaseType ??= parseSchemaEntity(
          baseType,
          getDefaultParseContext(parseContext)
        );
      }

      for (const key in entity.properties) {
        if (!props[key]) {
          const prop = baseType.properties[key];

          props[key] = prop;
          if (prop.required) {
            required.push(prop);
          }

          const parsedProp = parseSchemaEntity(prop, {
            ...parseContext,
            propertyPath: parseContext.propertyPath
              ? extendPath(parseContext.propertyPath, key, "_")
              : baseType.name!,
            defaultUsage: usage,
          });
          if (baseType === entity) {
            ownProps[key] = parsedProp;
            parsedProp.id = typeId + "_" + key;
          }

          minimumUsage = getMinimumUsage(minimumUsage, prop.usage);
        }
      }

      if (baseType.extends) {
        baseType = parseContext.resolveType(baseType.extends, parseContext);
      } else if (baseType.event && baseType !== parseContext.eventBaseType) {
        baseType = parseContext.eventBaseType;
      } else {
        break;
      }
    }

    validator = (value, prev, context, path, errors) => {
      const { read } = context;
      if (value && typeof value !== "object") {
        !read && errors.push(path + " is not an object.");
        return undefined;
      }

      // Update the type's usage to the minimum usage we have after parsing the properties where the type's usage provided defaults.
      // In this way we can quickly reject an object when censoring if the consent does not match the type's minimum usage.
      if (
        minimumUsage?.access &&
        !validateAccess(
          read,
          minimumUsage.access,
          value,
          prev,
          context.trusted,
          path,
          errors
        )
      ) {
        return undefined;
      }

      if (
        !validateConsent(
          minimumUsage?.consent,
          context.consent
          // Do not use "required purposes". Only one is needed for writing.
        )
      ) {
        return undefined;
      }

      if (value == null) {
        return value;
      }

      let valid = true;
      for (const prop of required) {
        if (value[prop.name] == null) {
          valid = false;
          !read &&
            errors.push(
              extendPath(path, prop.name, ".") + " is missing a required value."
            );
        }
      }

      for (const key in value) {
        const prop = props[key];
        if (!prop) {
          !read &&
            errors.push(
              extendPath(path, key, ".") + " is not defined in the schema."
            );
          value === value && (value = { ...value });
          delete value[key];
          continue;
        }

        const propValue = value[key];
        const prevPropValue = prev?.[key];
        if (propValue != null || !prop.required) {
          const censored = prop[validatorSymbol](
            read,
            propValue,
            prevPropValue,
            context,
            path,
            errors
          );

          if (censored !== propValue) {
            value === value && (value = { ...value });
            value[key] = censored;
          }

          if (censored == null && prop.required) {
            !read &&
              errors.push(
                `${extendPath(
                  path,
                  prop.name,
                  "."
                )} does not satisfy the current consent for ${formatDataUsage(
                  context.consent
                )} only since it contains ${formatDataUsage(
                  prop.usage?.consent
                )}.`
              );
            valid = false;
          }
        }
      }

      return read || valid ? value : undefined;
    };

    parsed = {
      ...entity,
      id: typeId,
      anonymous,
      baseType: parsedBaseType,
      properties: ownProps,
    };
  } else {
    if (parseContext == null) {
      throw new Error(
        "An property can only be parsed in the context of a type."
      );
    }

    const typeValidator = getTypeValidator(entity.type, parseContext);

    parsed = {
      ...entity,
      type: getParsedPropertyType(entity.type),
    };

    validator = (value, prev, context, path, errors) => {
      const { read } = context;

      let initialErrors = errors.length;
      if (!validateConsent(entity.usage?.consent, context.consent, context)) {
        return undefined;
      }

      if (
        entity.usage?.access &&
        !validateAccess(
          read,
          entity.usage.access,
          value,
          prev,
          context.trusted,
          path,
          errors
        )
      ) {
        return undefined;
      }

      if (read) {
        return value;
      } else if (entity.required && value == null) {
        errors.push(path + " is required");
      }

      if (initialErrors < (initialErrors = errors.length)) {
        return undefined;
      }

      value = typeValidator(value, prev, context, path, errors);

      if (initialErrors < errors.length) {
        return undefined;
      }

      return value;
    };
  }

  entity[validatorSymbol] = validator;
  parseContext.collect(
    (parsed = Object.assign(parsed, {
      schema: parseContext.schema.namespace!,
      censor: (
        value: any,
        context: VariableStorageContext,
        targetPurpose?: DataPurposeName
      ) => {
        return validator!(
          value,
          undefined,
          {
            read: true,
            consent: context.scope?.consent,
            ...context.validation,
            targetPurpose,
            trusted: context.trusted,
          },
          "",
          []
        );
      },
      validate: (
        value: any,
        previous: any,
        context: VariableStorageContext,
        errors?: string[]
      ) => {
        const throwErrors = !errors;
        value = validator!(
          value,
          previous,
          {
            read: false,
            consent: context.scope?.consent,
            ...context.validation,
            trusted: context.trusted,
          },
          "",
          (errors ??= [])
        );
        if (throwErrors && errors.length) {
          throw new Error(
            errors.length === 1
              ? errors[0] + "."
              : errors.map((error) => " - " + error + ".\n").join("")
          );
        }
        return value;
      },
      source: entity,
    }))
  );

  return parsed;
};

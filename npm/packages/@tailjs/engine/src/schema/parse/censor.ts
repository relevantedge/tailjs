import { UserConsent, validateConsent } from "@tailjs/types";
import { isArray, isObject, isUndefined } from "@tailjs/util";
import { ParsedType } from ".";
import { SchemaClassification, SchemaPropertyStructure } from "../..";

const traverseValue = (
  type: ParsedType,
  structure: SchemaPropertyStructure | undefined,
  value: any,
  action: (type: ParsedType, value: any) => any
) => {
  if (structure?.map) {
    if (!isObject(value)) return undefined;
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [
        key,
        traverseValue(
          type,
          {
            array: structure!.array,
          },
          value,
          action
        ),
      ])
    );
  }
  if (structure?.array) {
    if (!isArray(value)) return undefined;
    structure = isObject(structure.array) ? structure.array : undefined;
    value = value
      .map((value) => traverseValue(type, structure, value, action))
      .filter((item) => item);
    return value.length ? value : undefined;
  }

  return action(type, value);
};

/**
 *  Removes all values beloning to properties that does not match the given consent.
 */
export const censor = (
  type: ParsedType,
  value: any,
  consent: SchemaClassification | UserConsent
) => {
  if (!isObject(value)) return value;

  if (!validateConsent(type as Required<SchemaClassification>, consent))
    return undefined;

  let any = false;
  const censored: any = {};

  for (const key in value) {
    const property = type.properties.get(key);
    if (!property || !validateConsent(property, consent)) {
      continue;
    }

    const propertyValue = property.objectType
      ? traverseValue(
          property.objectType,
          property.structure,
          value[key],
          (type, value) => censor(type, value, consent)
        )
      : value[key];

    if (isUndefined(propertyValue)) {
      continue;
    }

    censored[key] = propertyValue;
    if (!property.censorIgnore) {
      any = true;
    }
  }

  return any ? censored : undefined;
};

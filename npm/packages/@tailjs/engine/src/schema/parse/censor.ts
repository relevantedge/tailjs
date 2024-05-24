import { ParsableConsent, VariableUsage, validateConsent } from "@tailjs/types";
import { isArray, isPlainObject } from "@tailjs/util";
import { ParsedType } from ".";
import { SchemaClassification, SchemaPropertyStructure } from "../..";

const traverseValue = (
  type: ParsedType,
  structure: SchemaPropertyStructure | undefined,
  value: any,
  action: (type: ParsedType, value: any) => any
) => {
  if (structure?.map) {
    if (!isPlainObject(value)) return undefined;
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
    structure = isPlainObject(structure.array) ? structure.array : undefined;
    value = value
      .map((value) => traverseValue(type, structure, value, action))
      .filter((item) => item);
    return value.length ? value : undefined;
  }

  return action(type, value);
};

/**
 *  Removes all values belonging to properties that does not match the given consent.
 */
export const censor = (
  type: ParsedType,
  value: any,
  consent: ParsableConsent,
  defaultClassification?: VariableUsage,
  write = false
) => {
  if (!isPlainObject(value)) return value;

  if (
    !validateConsent(
      type as Required<SchemaClassification>,
      consent,
      defaultClassification,
      write
    )
  )
    return undefined;

  let any = false;
  const censored: any = {};

  for (const key in value) {
    const property = type.properties.get(key);

    if (
      !property ||
      !validateConsent(property, consent, defaultClassification)
    ) {
      continue;
    }

    const propertyValue = property.objectType
      ? traverseValue(
          property.objectType,
          property.structure,
          value[key],
          (type, value) => censor(type, value, consent, undefined, write)
        )
      : value[key];

    if (propertyValue == null) {
      continue;
    }

    censored[key] = propertyValue;
    if (!property.censorIgnore) {
      any = true;
    }
  }

  return any ? censored : undefined;
};

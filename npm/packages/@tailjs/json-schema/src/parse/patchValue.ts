import { ParsableConsent, VariableUsage, validateConsent } from "@tailjs/types";
import { isArray, isPlainObject } from "@tailjs/util";
import { ParsedType } from ".";
import {
  SchemaClassification,
  SchemaPropertyStructure,
  EntityMetadata,
} from "..";

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
 * Adds type metadata and removes all values belonging to properties that does not match the given consent.
 *
 * The schema depth is how "deep" we are compared to the patched value.
 * Only the top level gets metadata added, so when patching a variable we start at -1 since
 * we are passing an object with variable as a property.
 *
 */
export const patchValue = (
  type: ParsedType,
  value: any,
  consent: ParsableConsent | undefined,
  defaultClassification?: VariableUsage,
  write = false,
  schemaDepth = 0
) => {
  if (!isPlainObject(value)) return value;

  if (
    consent &&
    !validateConsent(
      type as Required<SchemaClassification>,
      consent,
      defaultClassification,
      write
    )
  )
    return undefined;

  let any = false;

  const patched: any = consent ? {} : value;

  if (consent) {
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
            (type, value) =>
              patchValue(
                type,
                value,
                consent,
                undefined,
                write,
                schemaDepth + 1
              )
          )
        : value[key];

      if (propertyValue == null) {
        continue;
      }

      patched[key] = propertyValue;
      if (!property.censorIgnore) {
        any = true;
      }
    }
    if (!any) return undefined;
  }

  if (schemaDepth === 0) {
    // Only add the type identifier to the main entity.
    patched[EntityMetadata.TypeId] =
      type.id + (type.version ? "@" + type.version : "");
  }

  return patched;
};

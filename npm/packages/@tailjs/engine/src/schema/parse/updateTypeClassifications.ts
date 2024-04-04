import { validateConsent } from "@tailjs/types";
import { add, forEach, isUndefined } from "@tailjs/util";
import {
  ParsedProperty,
  ParsedType,
  mergeBasePropertyClassifications,
  parseError,
  updateMinClassifications,
} from ".";
import { SchemaClassification } from "../..";

export const updateTypeClassifications = (
  type: ParsedType,
  seen: Set<ParsedType>
) => {
  if (!add(seen, type)) return type;
  // Make sure base types have classifications before their implementors.
  // This is needed to infer property classifications from base types, if properties have been overriden.
  type.extends?.forEach((type) => updateTypeClassifications(type, seen));

  const objectTypeProperties: ParsedProperty[] = [];

  forEach(type.properties, ([, property]) => {
    // Before looking classifications from the surrounding context, start by seing if a base type has property with the same name.
    // If so inherit those settings.
    mergeBasePropertyClassifications(
      property.declaringType,
      property.name,
      property
    );

    if (
      property.objectType &&
      (isUndefined(property.classification) || isUndefined(property.purposes))
    ) {
      // We do not resolve this from context, rather we look at the referenced object type.
      // (If classification is not explicitly set, we might as well use the minimum classification from the type that will not censor it away).
      objectTypeProperties.push(property);
    } else {
      // Normal properties without explicit classifications get them from the defaults at the place they are in the schema tree.
      property.classification ??= property.context.classification!;
      property.purposes ??= property.context.purposes!;
    }

    updateMinClassifications(type, property);
  });

  forEach(objectTypeProperties, (property) => {
    const type = updateTypeClassifications(property.objectType!, seen);
    property.classification ??= type.classification!;
    property.purposes ??= type.purposes!;
    updateMinClassifications(type, property);
  });

  forEach(type.properties, ([, property]) => {
    if (isUndefined(property.classification))
      throw parseError(
        property.context,
        "The property's classification is not explicitly specified and cannot be infered from scope."
      );

    if (isUndefined(property.purposes))
      throw parseError(
        property.context,
        "The property's purposes are not explicitly specified and cannot be infered from scope."
      );

    if (
      property.required &&
      !validateConsent(type as SchemaClassification, property)
    ) {
      throw parseError(
        property.context,
        "A required property cannot have a more restrictive classification than any other property in its type since a censored value without it would be invalid."
      );
    }

    updateMinClassifications(type.context.schema!, property);
  });

  return type;
};

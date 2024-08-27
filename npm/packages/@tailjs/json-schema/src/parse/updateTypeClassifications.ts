import { validateConsent } from "@tailjs/types";
import { add, forEach } from "@tailjs/util";
import {
  ParsedProperty,
  ParsedType,
  mergeBasePropertyClassifications,
  parseError,
  updateMinClassifications,
} from ".";
import { SchemaDataUsage } from "..";

export const updateTypeClassifications = (
  type: ParsedType,
  seen: Set<ParsedType>
) => {
  if (!add(seen, type)) return type;
  // Make sure base types have classifications before their implementors.
  // This is needed to infer property classifications from base types, if properties have been overridden.
  type.extends?.forEach((type) => updateTypeClassifications(type, seen));

  const objectTypeProperties: ParsedProperty[] = [];

  forEach(type.properties, ([, property]) => {
    // Before looking for classifications in the surrounding context, start by seeing if a base type has a property with the same name.
    // If so inherit those settings.
    mergeBasePropertyClassifications(
      property.declaringType,
      property.name,
      property
    );

    if (
      property.objectType &&
      (property.usage.classification == null || property.usage.purposes == null)
    ) {
      // We do not resolve this from context, rather we look at the referenced object type.
      // (If classification is not explicitly set, we might as well use the minimum classification from the type that will not censor it away).
      objectTypeProperties.push(property);
    } else {
      // Normal properties without explicit classifications get them from the defaults at the place they are in the schema tree.
      property.usage.classification ??= property.context.usage!.classification;
      property.usage.purposes ??= property.context.usage!.purposes;
    }

    updateMinClassifications(type.usage, property.usage);
  });

  forEach(objectTypeProperties, (property) => {
    const type = updateTypeClassifications(property.objectType!, seen);
    property.usage.classification ??= type.usage.classification!;
    property.usage.purposes ??= type.usage.purposes!;
    updateMinClassifications(type.usage, property.usage);
  });

  forEach(type.properties, ([, property]) => {
    if (property.usage.classification == null)
      throw parseError(
        property.context,
        "The property's classification is not explicitly specified and cannot be inferred from scope."
      );

    if (property.usage.purposes == null)
      throw parseError(
        property.context,
        "The property's purposes are not explicitly specified and cannot be inferred from scope."
      );

    if (
      property.required &&
      !validateConsent(type as SchemaDataUsage, property.usage)
    ) {
      throw parseError(
        property.context,
        "A required property cannot have a more restrictive classification than any other property in its type since a censored value without it would be invalid."
      );
    }

    updateMinClassifications(type.context.schema!.usage, property.usage);
  });

  return type;
};

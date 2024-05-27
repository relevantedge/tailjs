import { add, forEach, update } from "@tailjs/util";
import { ParsedType, censor } from ".";

export const mergeBaseProperties = (
  type: ParsedType,
  seen: Set<ParsedType>
) => {
  if (!add(seen, type)) return type;

  type.extends?.forEach((baseType) =>
    forEach(
      mergeBaseProperties(baseType, seen).properties,
      ([name, property]) =>
        update(type.properties, name, (current) => ({
          ...property,
          ...current,
          ...(!current?.explicit && property.explicit
            ? {
                classification: property.classification,
                purposes: property.purposes,
                censorIgnore: property.censorIgnore,
                explicit: true,
              }
            : {}),
        }))
    )
  );

  type.extends?.forEach((baseType) => {
    (baseType.subtypes ??= new Set()).add(type);
  });

  return type;
};

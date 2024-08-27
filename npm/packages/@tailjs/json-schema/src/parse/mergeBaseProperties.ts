import { add, forEach, update } from "@tailjs/util";
import { ParsedType } from ".";

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
          // Use the property's own usage if it is explicit.
          ...(!current?.usage?.explicit && property.usage?.explicit
            ? {
                usage: property.usage,
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

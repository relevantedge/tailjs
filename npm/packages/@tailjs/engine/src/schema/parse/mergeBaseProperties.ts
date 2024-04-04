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
        // Merge base property's settings on current if not overridden.
        update(type.properties, name, (current) => ({
          ...property,
          ...current,
        }))
    )
  );

  type.extends?.forEach((baseType) => {
    (baseType.subtypes ??= new Set()).add(type);
  });

  return type;
};

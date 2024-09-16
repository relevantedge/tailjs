import { enumerate, forEach, get, map } from "@tailjs/util";
import { ParsedSchemaObjectType, SchemaValidationError } from "../../..";

const formatTypeNames = (types: ParsedSchemaObjectType[]) =>
  enumerate(types.map((type) => quoteString(type.id)));

const quoteString = (s: any) =>
  s == null ? "" : typeof s === "string" ? '"' + s + '"' : "" + s;

export const createTypeSelector = (
  unionTypes: ParsedSchemaObjectType[]
): {
  discriminatedTypes: ParsedSchemaObjectType[];
  selector: (
    value: any,
    errors: SchemaValidationError[]
  ) => ParsedSchemaObjectType | undefined;
} => {
  const traverse = (
    types: ParsedSchemaObjectType[],
    action: (type: ParsedSchemaObjectType) => void,
    seen = new Set<ParsedSchemaObjectType>()
  ) => {
    for (const type of types) {
      if (seen.has(type)) {
        return;
      }
      seen.add(type);
      action(type);
      traverse(type.extendedBy, action, seen);
    }
  };
  // Type to enum value mappings per property.
  const enumProperties = new Map<string, Map<any, ParsedSchemaObjectType[]>>();

  const allTypes: ParsedSchemaObjectType[] = [];
  traverse(unionTypes, (type) => {
    allTypes.push(type);
    if (type.abstract) return;

    forEach(type.allProperties, ([key, property]) => {
      if (!("enumValues" in property.type) || !property.type.enumValues?.length)
        return;

      const values = get(enumProperties, key, () => new Map());

      property.type.enumValues
        .map((value) => quoteString(value))
        .concat(property.required ? [] : [""])
        .forEach((value) => get(values, value, () => []).push(type));
    });
  });

  // An abstract type is a marker type, or allowing any value for an enum type.
  const abstractTypes = new Set<ParsedSchemaObjectType>();

  const typesByDiscriminator = new Map<string, ParsedSchemaObjectType[]>();
  traverse(unionTypes, (type) => {
    if (type.abstract) {
      abstractTypes.add(type);
      return;
    }

    let discriminators: string[][] = [[]];
    forEach(enumProperties, ([key]) => {
      const property = type.properties[key];
      if (property) {
        if ("enumValues" in property.type && property.type.enumValues?.length) {
          property.type.enumValues
            .map((value) => quoteString(value))
            .concat(property.required ? [] : [""])
            .forEach(
              (value) =>
                (discriminators = discriminators.map((discriminator) => [
                  ...discriminator,
                  key + ":" + quoteString(value),
                ]))
            );
        } else {
          abstractTypes.add(type);
        }
      } else {
        discriminators = discriminators.map((discriminator) => [
          ...discriminator,
          key + ":" + quoteString(undefined),
        ]);
      }
    });

    if (!abstractTypes.has(type)) {
      discriminators.forEach((discriminator) =>
        get(typesByDiscriminator, discriminator.join(", "), () => []).push(type)
      );
    }
  });

  const uniqueDiscriminators = new Map<string, ParsedSchemaObjectType>();
  const unambiguousTypes = new Set<ParsedSchemaObjectType>();
  forEach(
    typesByDiscriminator,
    ([discriminator, types]) =>
      types.length === 1 &&
      (unambiguousTypes.add(types[0]),
      uniqueDiscriminators.set(discriminator, types[0]))
  );

  const ambiguousTypes: [
    ParsedSchemaObjectType,
    [string, ParsedSchemaObjectType[]][]
  ][] = [];
  traverse(unionTypes, (type) => {
    if (!abstractTypes.has(type) && !unambiguousTypes.has(type)) {
      ambiguousTypes.push([
        type,
        map(typesByDiscriminator, ([discriminator, types]) =>
          types.includes(type)
            ? [discriminator, types.filter((otherType) => otherType !== type)]
            : undefined
        ),
      ]);
    }
  });

  if (ambiguousTypes.length) {
    throw new TypeError(
      `The union of ${formatTypeNames(
        unionTypes
      )} is not supported. The types below are not base types, and do not have a unique combination of enum values:${ambiguousTypes
        .map(
          ([type, discriminators]) =>
            `  ${quoteString(
              type.id
            )} has these ambiguous discriminators:\n${discriminators.map(
              ([discriminator, types]) =>
                `    ${
                  discriminator || "(none)"
                }: Shared with ${formatTypeNames(types)}.`
            )}`
        )
        .join("\n")}`
    );
  }

  const enumKeys = [...enumProperties.keys()];

  return {
    discriminatedTypes: [...unambiguousTypes],
    selector: (value, errors) => {
      const discriminator = enumKeys
        .map((key) => key + ":" + quoteString(value[key]))
        .join(", ");
      const type = uniqueDiscriminators.get(discriminator);
      if (!type) {
        errors.push({
          path: "",
          source: value,
          message: `The discriminator ${discriminator} does not match any type in the union ${formatTypeNames(
            unionTypes
          )}.`,
        });
      }
      return type;
    },
  };
};

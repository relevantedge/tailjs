import { forEach } from "@tailjs/util";
import { parseProperty, TypeParseContext } from ".";
import { ParsedSchemaObjectType } from "../../..";
import { getMinimumUsage } from "../validation";

export const parseTypeProperties = (
  parsedType: ParsedSchemaObjectType,
  context: TypeParseContext
): ParsedSchemaObjectType => {
  if (parsedType.ownProperties != null) {
    return parsedType;
  }

  parsedType.ownProperties = {};

  const source = parsedType.source;

  forEach(parsedType.extendsAll, (baseType) =>
    // Make sure we have all the base type's properties.
    parseTypeProperties(baseType, context)
  );

  for (const baseType of parsedType.extendsAll) {
    for (const key in baseType.properties) {
      parsedType.properties[key] ??= baseType.properties[key];
    }
  }

  for (const key in source.properties) {
    const parsedProperty = parseProperty(
      parsedType,
      key,
      source.properties[key],
      context,
      parsedType.properties[key]
    );

    parsedType.properties[key] = parsedType.ownProperties[key] = parsedProperty;
  }

  parsedType.schema.usage = getMinimumUsage(
    parsedType.schema.usage,
    parsedType.usage
  );

  return parsedType;
};

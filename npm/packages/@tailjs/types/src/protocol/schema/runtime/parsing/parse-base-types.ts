import { add, forEach, throwError } from "@tailjs/util";
import { parseType, TypeParseContext } from ".";
import { ParsedSchemaObjectType } from "../../../..";
import { mergeUsage } from "../validation";

export const parseBaseTypes = (
  parsedType: ParsedSchemaObjectType,
  context: TypeParseContext
) => {
  if (parsedType.extends) {
    return parsedType;
  }
  const { systemTypes: systemTypes, usageOverrides: baseUsageOverrides } =
    context;

  const source = parsedType.source;
  let usageOverrides = parsedType.usageOverrides;
  parsedType.extends =
    source.extends?.map((baseType) =>
      parseBaseTypes(parseType(baseType, context, null), context)
    ) ?? [];

  if (
    parsedType.source["event"] &&
    !parsedType.extends.some((baseType) =>
      systemTypes.event?.extendedBy.has(baseType)
    )
  ) {
    parsedType.extends.unshift(
      systemTypes.event ??
        throwError(
          "The system base type for tracked events has not been defined."
        )
    );
    systemTypes.event?.extendedBy.add(parsedType);
  }

  for (const parsedBaseType of parsedType.extends) {
    if ("usage" in parsedBaseType.source) {
      usageOverrides = mergeUsage(parsedBaseType.source.usage, usageOverrides);
    }
    const traverse = (baseType: ParsedSchemaObjectType) =>
      add(baseType.extendedBy, parsedType) &&
      forEach(baseType.extends, traverse);
    traverse(parsedBaseType);
  }

  // Don't apply context usage before we have merged the extended types' usage.
  parsedType.usageOverrides = mergeUsage(baseUsageOverrides, usageOverrides);

  return parsedType;
};

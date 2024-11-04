import { add, throwError } from "@tailjs/util";
import { parseType, TypeParseContext } from ".";
import { ParsedSchemaObjectType } from "../../../..";
import { overrideUsage } from "../validation";

export const addBaseType = (
  subtype: ParsedSchemaObjectType,
  baseType: ParsedSchemaObjectType
) => {
  add(baseType.extendedByAll, subtype) && baseType.extendedBy.push(subtype);
  add(subtype.extendsAll, baseType) && subtype.extends.push(baseType);
  return subtype;
};

export const parseBaseTypes = (
  parsedType: ParsedSchemaObjectType,
  context: TypeParseContext
) => {
  if (parsedType.extends) {
    return parsedType;
  }
  parsedType.extends = [];

  const { systemTypes: systemTypes, usageOverrides: baseUsageOverrides } =
    context;

  const source = parsedType.source;
  let usageOverrides = parsedType.usageOverrides;

  source.extends?.forEach((baseType) =>
    addBaseType(
      parsedType,
      parseBaseTypes(parseType(baseType, context, null), context)
    )
  );

  if (
    parsedType.source["event"] &&
    !parsedType.extends.some((baseType) =>
      systemTypes.event?.extendedByAll.has(baseType)
    )
  ) {
    addBaseType(
      parsedType,
      systemTypes.event ??
        throwError(
          "The system base type for tracked events has not been defined."
        )
    );
  }

  for (const parsedBaseType of parsedType.extends) {
    if ("usage" in parsedBaseType.source) {
      usageOverrides = overrideUsage(
        parsedBaseType.source.usage,
        usageOverrides
      );
    }
  }

  // Don't apply context usage before we have merged the extended types' usage.
  parsedType.usageOverrides = overrideUsage(baseUsageOverrides, usageOverrides);

  return parsedType;
};

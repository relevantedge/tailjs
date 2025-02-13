import { add2, throwError } from "@tailjs/util";
import { parseType, TypeParseContext } from ".";
import { SchemaObjectType } from "../../../..";
import { overrideUsage } from "../validation";

const addBaseType = (subtype: SchemaObjectType, baseType: SchemaObjectType) => {
  add2(baseType.extendedByAll, subtype);
  add2(subtype.extendsAll, baseType);

  for (const baseBaseType of baseType.extends) {
    addBaseType(subtype, baseBaseType);
  }
};

export const parseBaseTypes = (
  parsedType: SchemaObjectType,
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

  if (
    parsedType.source["event"] &&
    !parsedType.extends.some((baseType) =>
      systemTypes.event?.extendedByAll.has(baseType)
    )
  ) {
    parsedType.extends.push(
      systemTypes.event ??
        throwError(
          "The system base type for tracked events has not been defined."
        )
    );
  }
  source.extends?.forEach((baseType) => {
    parsedType.extends.push(
      parseBaseTypes(parseType(baseType, context, null), context)
    );
  });

  for (const parsedBaseType of parsedType.extends) {
    usageOverrides = overrideUsage(parsedBaseType.source, usageOverrides);
  }

  for (const baseType of parsedType.extends) {
    baseType.extendedBy.push(parsedType);
    addBaseType(parsedType, baseType);
  }

  // Don't apply context usage before we have merged the extended types' usage.
  parsedType.usageOverrides = overrideUsage(baseUsageOverrides, usageOverrides);

  parsedType.usage = overrideUsage(
    context.defaultUsage,
    parsedType.usageOverrides
  );
  return parsedType;
};

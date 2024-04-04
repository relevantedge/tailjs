import { add, isDefined } from "@tailjs/util";
import { ParsedProperty, ParsedType } from ".";

export const mergeBasePropertyClassifications = (
  declaringType: ParsedType,
  name: string,
  target: ParsedProperty,
  seen?: Set<ParsedType>
) => {
  if (
    (isDefined(target.classification) &&
      isDefined(target.purposes) &&
      isDefined(target.censorIgnore)) ||
    !add((seen ??= new Set()), declaringType)
  ) {
    return;
  }

  declaringType.extends?.forEach((baseType) => {
    const baseProperty = baseType.properties.get(name);
    if (baseProperty) {
      target.classification ??= baseProperty.classification;
      target.purposes ??= baseProperty.purposes;
      target.censorIgnore ??= baseProperty.censorIgnore;
    }
    mergeBasePropertyClassifications(baseType, name, target, seen);
  });
};

import { add } from "@tailjs/util";
import { ParsedProperty, ParsedType } from ".";

export const mergeBasePropertyClassifications = (
  declaringType: ParsedType,
  name: string,
  target: ParsedProperty,
  seen?: Set<ParsedType>
) => {
  if (
    (target.classification != null &&
      target.purposes != null &&
      target.censorIgnore != null) ||
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

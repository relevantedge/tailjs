import { add } from "@tailjs/util";
import { ParsedProperty, ParsedType } from ".";

export const mergeBasePropertyClassifications = (
  declaringType: ParsedType,
  name: string,
  target: ParsedProperty,
  seen?: Set<ParsedType>
) => {
  const usage = target.usage;
  if (!add((seen ??= new Set()), declaringType)) {
    // Nothing to see here. Either processed or fully defined.
    return;
  }

  declaringType.extends?.forEach((baseType) => {
    const baseUsage = baseType.properties.get(name)?.usage;
    if (baseUsage && !usage.system) {
      if (baseUsage.system) {
        usage.classification = usage.purposes = undefined;
        usage.system = true;
      } else {
        usage.classification ??= baseUsage.classification;
        usage.purposes ??= baseUsage.purposes;
        usage.access ??= baseUsage.access;
      }
    }
    mergeBasePropertyClassifications(baseType, name, target, seen);
  });
};

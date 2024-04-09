import { add, isDefined } from "@tailjs/util";
export const mergeBasePropertyClassifications = (declaringType, name, target, seen) => {
    if ((isDefined(target.classification) &&
        isDefined(target.purposes) &&
        isDefined(target.censorIgnore)) ||
        !add((seen ??= new Set()), declaringType)) {
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
//# sourceMappingURL=mergeBasePropertyClassifications.js.map
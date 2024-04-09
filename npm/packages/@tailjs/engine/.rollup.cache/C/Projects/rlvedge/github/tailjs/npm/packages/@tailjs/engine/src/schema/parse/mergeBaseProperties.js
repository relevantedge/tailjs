import { add, forEach, update } from "@tailjs/util";
export const mergeBaseProperties = (type, seen) => {
    if (!add(seen, type))
        return type;
    type.extends?.forEach((baseType) => forEach(mergeBaseProperties(baseType, seen).properties, ([name, property]) => 
    // Merge base property's settings on current if not overridden.
    update(type.properties, name, (current) => ({
        ...property,
        ...current,
    }))));
    type.extends?.forEach((baseType) => {
        (baseType.subtypes ??= new Set()).add(type);
    });
    return type;
};
//# sourceMappingURL=mergeBaseProperties.js.map
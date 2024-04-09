import { expand, forEach, get, join, map, some } from "@tailjs/util";
import { getRefType, mergeBaseProperties, parseError, updateTypeClassifications, } from ".";
import { tryParsePrimitiveType } from "..";
export const updateBaseTypes = (context) => {
    const baseTypes = new Set();
    const properties = new Set();
    const typeNodes = context.parseContext.typeNodes;
    typeNodes.forEach((type) => {
        const addBaseTypes = (composition) => {
            if (composition.context) {
                const baseType = getRefType(composition.context, composition.ref?.id);
                if (baseType) {
                    (type.extends ??= new Set()).add(baseType);
                }
                join(composition.compositions, composition.ref?.composition).forEach(addBaseTypes);
            }
        };
        addBaseTypes(type.composition);
        mergeBaseProperties(type, baseTypes);
        updateTypeClassifications(type, properties);
    });
    // Seal concrete types.
    typeNodes.forEach((type) => {
        type.context.node.type = "object";
        if (type.subtypes?.size) {
            delete type.context.node.unevaluatedProperties;
            type.abstract = true;
        }
        else {
            // unevaluatedProperties does not have an effect if there are no allOfs
            type.context.node.unevaluatedProperties = false;
        }
    });
    // Update all references to abstract types with a oneOf construct referencing each of its concrete types.
    // Fail if they don't all have required const property with the same name to discriminate against.
    typeNodes.forEach((type) => {
        if (type.abstract && type.referencedBy?.size) {
            const concreateSubTypes = expand(type, (type) => type.subtypes).filter((type) => !type.abstract);
            // Collect all required const properties and their values here.
            // There must be at least one where all the types have different values;
            const discriminators = new Map();
            forEach(concreateSubTypes, (subtype) => forEach(subtype.properties, ([, property]) => {
                const allowedValues = tryParsePrimitiveType(property.context.node)?.allowedValues;
                if ((!property.required &&
                    !type.properties.get(property.name)?.required) ||
                    allowedValues?.length !== 1)
                    return;
                get(discriminators, property.name, () => new Set()).add(allowedValues[0]);
            }));
            if (some(discriminators, ([, value]) => value.size === concreateSubTypes.length)) {
                forEach(type.referencedBy, (property) => {
                    delete property.context.node.$ref;
                    property.context.node.oneOf = map(concreateSubTypes, (type) => ({
                        $ref: type.context.$ref,
                    }));
                    // property.context.node.type = "object";
                    // property.context.node.properties = {};
                    // property.context.node.unevaluatedProperties = false;
                });
            }
            else {
                throw parseError(type.context, () => "If an abstract type (that is, type extended by other types) is used as a property type, " +
                    "all its subtypes must have a common property with a const value to discriminate between them.\n" +
                    `${type.id} is extended by ${map(type.subtypes, (type) => type.id)?.join(", ")}, and referenced by ${map(type.referencedBy, (type) => type.id)?.join(", ")}`);
            }
        }
    });
};
//# sourceMappingURL=baseTypes.js.map
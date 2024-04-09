import { forEach, isDefined, throwError, update } from "@tailjs/util";
import { getRefType, parseClassifications, parseDescription, parseStructure, parseType, tryParseObjectComposition, updateContext, } from ".";
import { tryParsePrimitiveType } from "../..";
export const addProperties = (type, composition) => {
    const node = composition.node;
    const required = new Set(node.required ?? []);
    if (composition.context && node.properties) {
        const propertiesContext = updateContext(composition.context, "properties");
        forEach(node.properties, ([key, definition]) => {
            const context = updateContext(propertiesContext, key);
            const [typeContext, structure] = parseStructure(context);
            let objectType = typeContext.node.$ref
                ? getRefType(context, typeContext.node.$ref)
                : undefined;
            const ownClassification = parseClassifications(context);
            // TODO: Handle obsolete properties (renames).
            // Should be in the form "oldName": {$ref: "#new-property", deprecated: true}.
            const property = {
                id: type.id + "." + key,
                name: key,
                ...parseDescription(definition),
                context,
                declaringType: type,
                required: required.has(key),
                structure,
                // Allow classifications to be undefined for now. We will try to derive them from context later.
                censorIgnore: ownClassification.censorIgnore,
                classification: ownClassification.classification,
                purposes: ownClassification.purposes,
                typeContext,
            };
            if (typeContext.node.properties &&
                tryParseObjectComposition(typeContext.node, typeContext)) {
                objectType = parseType(typeContext.node, typeContext, property);
            }
            if ((property.objectType = objectType)) {
                (objectType.referencedBy ??= new Set()).add(property);
            }
            else {
                property.primitiveType = tryParsePrimitiveType(context.node);
            }
            if (update(type.properties, key, (current) => isDefined(current) &&
                (current.objectType ?? current.primitiveType)?.id !==
                    (property.objectType ?? property.primitiveType)?.id
                ? throwError("Properties in composed types must all have the same time.")
                : property)) {
            }
        });
    }
    forEach(composition.compositions, (composition) => addProperties(type, composition));
};
//# sourceMappingURL=addProperties.js.map
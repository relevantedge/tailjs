import { forEach } from "@tailjs/util";
import { parseDescription, parseError, tryParseObjectComposition, updateContext, } from ".";
export const parseType = (node, context, declaringProperty) => {
    if (node.$defs) {
        forEach(node.$defs, ([key, def]) => {
            const defContext = updateContext(context, "$defs");
            const type = parseType(def, updateContext(defContext, key));
            if (type) {
                defContext.schema?.types.set(type.name, type);
            }
        });
    }
    const objectComposition = tryParseObjectComposition(node, context);
    if (objectComposition) {
        if (node.node === context.schema?.context.node) {
            throw parseError(context, "A schema definition cannot declare a root type.");
        }
        let name = context.key;
        let property = declaringProperty;
        while (property) {
            name =
                property.declaringType.name +
                    "_" +
                    property.name +
                    (name !== context.key ? "_" + name : "");
            property = property.declaringType.declaringProperty;
        }
        const type = {
            id: context.schema?.id + "#" + name,
            schemaId: node.$id,
            name,
            ...parseDescription(node),
            context,
            declaringProperty,
            topLevel: !declaringProperty,
            properties: new Map(),
            composition: objectComposition,
        };
        context.node.$anchor ??= type.name;
        context.parseContext.typeNodes.set(node, type);
        context.parseContext.types.set(type.id, type);
        return type;
    }
};
//# sourceMappingURL=parseType.js.map
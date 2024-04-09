import { updateContext } from ".";
export const parseStructure = (context) => {
    let structure = undefined;
    let typeContext = context;
    if (context.node.additionalProperties) {
        structure = { map: true };
        typeContext = updateContext(typeContext, "additionalProperties");
    }
    if (typeContext.node.type === "array") {
        typeContext = updateContext(typeContext, "items");
        [typeContext, (structure ??= {}).array] = parseStructure(typeContext);
        structure.array ??= true;
    }
    return [typeContext, structure];
};
//# sourceMappingURL=parseStructure.js.map
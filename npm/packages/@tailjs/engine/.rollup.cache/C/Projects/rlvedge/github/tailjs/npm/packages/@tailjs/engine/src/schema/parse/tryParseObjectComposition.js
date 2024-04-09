import { expand, forEach, isDefined, join, throwError } from "@tailjs/util";
import { parseCompositions, parseError } from ".";
export const tryParseObjectComposition = (node, context) => {
    const composition = parseCompositions(node, context);
    let isObjectType = false;
    forEach(expand(composition, (composition) => join(composition.compositions, composition.ref?.composition)), (item) => item.node.type === "object"
        ? (isObjectType = true)
        : isDefined(item.node.type) &&
            isObjectType &&
            throwError(parseError(context, "If an object type is a composition, all included types must be objects.")));
    if (isObjectType) {
        return composition;
    }
};
//# sourceMappingURL=tryParseObjectComposition.js.map
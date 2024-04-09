import { forEach, required } from "@tailjs/util";
import { parseError, updateContext, } from ".";
export const parseCompositions = (node, context, seen = new Map(), childContext = context) => {
    const cached = seen.get(node);
    if (cached) {
        return cached;
    }
    const expandRef = (ref) => {
        if (!ref)
            return undefined;
        if (ref[0] === "#") {
            ref = context.schema?.id + ref;
        }
        const node = required(context.ajv.getSchema(ref)?.schema, () => parseError(context, `Ref '${ref}' not found`));
        return {
            id: ref,
            composition: parseCompositions(node, context, seen, null),
        };
    };
    const composition = {
        node,
        type: "schema",
        ref: expandRef(node.$ref),
        context: childContext,
    };
    forEach(["allOf", "oneOf", "anyOf"], (type, _, compositionContext = childContext &&
        childContext.node[type] &&
        updateContext(childContext, type)) => forEach(node[type], (node, i) => (composition.compositions ??= []).push(parseCompositions(node, context, seen, compositionContext && updateContext(compositionContext, i + "")))));
    return composition;
};
//# sourceMappingURL=parseCompositions.js.map
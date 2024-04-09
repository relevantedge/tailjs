import { isUndefined, required } from "@tailjs/util";
export const getRefType = (context, ref) => {
    if (isUndefined(ref))
        return undefined;
    if (ref.startsWith("#")) {
        ref = (context.schema?.id + ref);
    }
    const def = context.ajv.getSchema(ref)?.schema;
    return required(def && context.parseContext.typeNodes.get(def), `Referenced type '${ref}' is not defined`);
};
//# sourceMappingURL=getRefType.js.map
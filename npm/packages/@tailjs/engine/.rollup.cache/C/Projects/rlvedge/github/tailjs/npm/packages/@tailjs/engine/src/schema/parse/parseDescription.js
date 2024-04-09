import { toArray } from "@tailjs/util";
import { annotations } from "../..";
export const parseDescription = (node) => ({
    description: node.description,
    tags: toArray(node[annotations.tags]),
});
//# sourceMappingURL=parseDescription.js.map
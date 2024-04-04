import { toArray } from "@tailjs/util";
import { annotations } from "../..";

export const parseDescription = (node: any) => ({
  description: node.description,
  tags: toArray(node[annotations.tags]),
});

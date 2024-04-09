import { PrivacyAnnotations } from "@tailjs/types";
import { toArray } from "@tailjs/util";

export const parseDescription = (node: any) => ({
  description: node.description,
  tags: toArray(node[PrivacyAnnotations.Tags]),
});

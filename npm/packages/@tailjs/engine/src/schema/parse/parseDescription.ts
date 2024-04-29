import { SchemaAnnotations } from "@tailjs/types";
import { array } from "@tailjs/util";
import { ParsedSchemaEntity } from "packages/@tailjs/engine/src/schema/parse/types";

export const parseDescription = (
  node: any
): Partial<Pick<ParsedSchemaEntity, "title" | "description" | "tags">> => ({
  title: node.title,
  description: node.description,
  tags: array(node[SchemaAnnotations.Tags]),
});

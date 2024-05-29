import { array } from "@tailjs/util";
import { ParsedSchemaEntity } from ".";
import { SchemaAnnotations } from "..";

export const parseDescription = (
  node: any
): Partial<Pick<ParsedSchemaEntity, "title" | "description" | "tags">> => ({
  title: node.title,
  description: node.description,
  tags: array(node[SchemaAnnotations.Tags]),
});

import { TraverseContext } from ".";
import { SchemaPropertyStructure } from "../..";
import { updateContext } from ".";

export const parseStructure = (
  context: TraverseContext
): [
  typeNode: TraverseContext,
  structure: SchemaPropertyStructure | undefined
] => {
  let structure: SchemaPropertyStructure | undefined = undefined;
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

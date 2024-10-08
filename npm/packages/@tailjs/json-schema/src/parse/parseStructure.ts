import { TraverseContext, updateContext } from ".";
import { SchemaPropertyStructure } from "..";

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
    typeContext = updateContext(typeContext, "additionalProperties", true);
  }
  if (typeContext.node.type === "array") {
    typeContext = updateContext(typeContext, "items", true);

    [typeContext, (structure ??= {}).array] = parseStructure(typeContext);
    structure.array ??= true;
  }
  return [typeContext, structure];
};

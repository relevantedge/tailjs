import { concat, expand, forEach, throwError } from "@tailjs/util";
import { TraverseContext, parseCompositions, parseError } from ".";

export const tryParseObjectComposition = (
  node: any,
  context: TraverseContext
) => {
  const composition = parseCompositions(node, context);

  let isObjectType = false;
  forEach(
    expand(composition, (composition) =>
      concat(composition.compositions, composition.ref?.composition)
    ),
    (item) =>
      item.node.type === "object"
        ? (isObjectType = true)
        : item.node.type != null &&
          isObjectType &&
          throwError(
            parseError(
              context,
              "If an object type is a composition, all included types must be objects."
            )
          )
  );
  if (isObjectType) {
    return composition;
  }
};

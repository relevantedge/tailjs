import { forEach, required } from "@tailjs/util";
import {
  ParsedComposition,
  TraverseContext,
  parseError,
  updateContext,
} from ".";

export const normalizeBaseTypes = (node: any) => {
  if (node.$ref && node.properties) {
    (node.allOf ??= []).push({ $ref: node.$ref });
    delete node.$ref;
  }
};

export const parseCompositions = (
  node: any,
  context: TraverseContext,
  seen = new Map<any, ParsedComposition>(),
  childContext: TraverseContext | null = context
): ParsedComposition => {
  const cached = seen.get(node);
  if (cached) {
    return cached;
  }

  const expandRef = (ref: string | undefined) => {
    if (!ref) return undefined;
    if (ref[0] === "#") {
      ref = context.schema?.id + ref;
    }
    const node = required(context.ajv.getSchema(ref)?.schema, () =>
      parseError(context, `Ref '${ref}' not found`)
    );

    return {
      id: ref,
      composition: parseCompositions(node, context, seen, null),
    };
  };

  const composition: ParsedComposition = {
    node,
    type: "schema",
    ref: expandRef(node.$ref),
    context: childContext,
  };

  forEach(
    ["allOf", "oneOf", "anyOf"] as const,
    (
      type,
      _,
      compositionContext = childContext &&
        childContext.node[type] &&
        updateContext(childContext, type, true)
    ) =>
      forEach(node[type], (node, i) =>
        (composition.compositions ??= []).push({
          ...parseCompositions(
            node,
            context,
            seen,
            compositionContext &&
              updateContext(compositionContext, i + "", true)
          ),
          type,
        })
      )
  );

  return composition;
};

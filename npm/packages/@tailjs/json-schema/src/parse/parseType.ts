import { map, obj } from "@tailjs/util";
import {
  ParsedProperty,
  ParsedType,
  TraverseContext,
  parseDescription,
  parseError,
  parseSchemaUsage,
  tryParseObjectComposition,
  updateContext,
} from ".";
import { parseDataUsage } from "packages/@tailjs/types/dist";
import { schemaDataUsage } from "..";

export const parseType = (
  node: any,
  context: TraverseContext,
  declaringProperty?: ParsedProperty
): ParsedType | undefined => {
  ["$defs", "definitions"].forEach((defPath) => {
    let defs = node[defPath];
    if (defs) {
      defs = node[defPath] = obj(
        map(defs, ([key, def]) => {
          if (
            (key as string).startsWith("NamedParameters") ||
            def.properties?.namedArgs
          ) {
            // This is a TypeScript function that has sneaked into the schema. Remove.
            return undefined;
          }

          const defContext = updateContext(context, defPath, true);
          const type = parseType(def, updateContext(defContext, key));
          if (type) {
            defContext.schema?.types.set(type.name, type);
          }
          return [key, def] as const;
        })
      );
    }
  });

  const objectComposition = tryParseObjectComposition(node, context);
  if (objectComposition) {
    if (node.node === context.schema?.context.node) {
      throw parseError(
        context,
        "A schema definition cannot declare a root type."
      );
    }

    let name = context.key;
    let property = declaringProperty;
    while (property) {
      name =
        property.declaringType.name +
        "_" +
        property.name +
        (name !== context.key ? "_" + name : "");
      property = property.declaringType.declaringProperty!;
    }

    const type: ParsedType = {
      id: context.schema?.id! + "#" + name,
      schemaId: node.$id,
      name,
      ...parseDescription(node),
      context,
      declaringProperty,
      topLevel: !declaringProperty,
      properties: new Map(),
      composition: objectComposition,
      usage: parseSchemaUsage(context),
    };

    context.node.$anchor ??= encodeURIComponent(type.name);
    context.node.type ??= "object";
    context.parseContext.typeNodes.set(node, type);
    context.parseContext.types.set(type.id, type);
    return type;
  }
};

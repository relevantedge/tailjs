import {
  MaybeUndefined,
  Nullish,
  forEach,
  isArray,
  isPlainObject,
  required,
} from "@tailjs/util";
import { ParsedType, TraverseContext, parseError } from ".";

export const getRefSchema = <T extends string | undefined>(
  context: TraverseContext,
  ref: T
): any => {
  if (ref == null) return undefined as any;

  if (ref.startsWith("#")) {
    ref = (context.schema?.id! + ref) as any;
  }
  return context.parseContext.navigator(context, ref!); // context.ajv.getSchema(ref!)?.schema as any;
};

export const getRefType = <T extends string | undefined>(
  context: TraverseContext | Nullish,
  ref: T,
  require = false
): MaybeUndefined<T, ParsedType> => {
  if (ref == null || context == null) return undefined as any;

  const def = getRefSchema(context, ref);
  const resolved = def && context.parseContext.typeNodes.get(def);
  return require
    ? (required(
        resolved,
        () => `Referenced type '${ref}' is not defined`
      ) as any)
    : resolved;
};

export const createSchemaNavigator = (node: any) => {
  const ids = new Map<string, any>();

  const parseIds = (node: any) => {
    if (isArray(node)) {
      forEach(node, (node) => parseIds(node));
      return;
    } else if (!isPlainObject(node)) {
      return;
    }

    if (node.$id) {
      ids.set(node.$id, node);
    }
    forEach(node, ([, value]) => parseIds(value));
  };
  parseIds(node);

  return (context: TraverseContext, ref: string) => {
    const parts = ref.split("#");

    let node = ids.get(parts[0] ?? context.schema?.id);
    if (!node) {
      throw parseError(
        context,
        `Unabled to resolve navigation root node for the ref '${ref}'`
      );
    }
    const segments = (parts[1] ?? "").split("/").filter((item) => item);
    for (const segment of segments) {
      node = node[segment];
      if (!node) return undefined;
    }
    return node;
  };
};

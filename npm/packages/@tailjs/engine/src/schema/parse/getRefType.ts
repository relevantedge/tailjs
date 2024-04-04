import { MaybeUndefined, isUndefined, required } from "@tailjs/util";
import { ParsedType, TraverseContext } from ".";

export const getRefType = <T extends string | undefined>(
  context: TraverseContext,
  ref: T
): MaybeUndefined<T, ParsedType> => {
  if (isUndefined(ref)) return undefined as any;

  if (ref.startsWith("#")) {
    ref = (context.schema?.id! + ref) as any;
  }
  const def = context.ajv.getSchema(ref!)?.schema;
  return required(
    def && context.parseContext.typeNodes.get(def),
    `Referenced type '${ref}' is not defined`
  ) as any;
};

import { PickPartial, isDefined, required } from "@tailjs/util";
import {
  TraverseContext,
  parseEventTypes,
  parseClassifications,
  parseDescription,
} from ".";

export const updateContext = (
  context: PickPartial<TraverseContext, "key">,
  key: string
): TraverseContext => {
  const node =
    key === "#"
      ? context.node
      : required(context.node?.[key], () => `Cannot navigate to '${key}'.`);
  const childContext = {
    ...context,
    key,
    ...parseClassifications(context),
    node,
  };
  if (node.$id) {
    childContext.$ref = node.$id;
  } else if (key) {
    childContext.$ref =
      context.$ref + (childContext.$ref?.includes("/") ? "/" : "#/") + key;
  }

  childContext.path = [...context.path, key];

  if (isDefined(node.$schema)) {
    const schema = (childContext.schema = {
      id: node.$id,
      ...parseDescription(node),
      context: childContext,
      types: new Map(),
      definition: node,
    });

    if (context.schema) {
      (context.schema.subSchemas ??= new Map()).set(schema.id, schema);
    }
    context.parseContext.schemas.set(schema.id, schema);

    parseEventTypes(childContext);
  }
  return childContext;
};
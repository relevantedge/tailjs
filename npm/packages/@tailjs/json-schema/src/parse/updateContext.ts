import { PickPartial, required } from "@tailjs/util";
import { TraverseContext, parseClassifications, parseDescription } from ".";
import { SchemaAnnotations } from "../consts";

export const updateContext = (
  context: PickPartial<TraverseContext, "key">,
  key: string,
  // Whether to ignore the x-version property which must be the case below type level (e.g. properties).
  ignoreVersion = false
): TraverseContext => {
  const node =
    key === "#"
      ? context.node
      : required(context.node?.[key], () => `Cannot navigate to '${key}'.`);
  const childContext: TraverseContext = {
    ...context,
    parent: context,
    key,
    ...parseClassifications(context),
    version: context.version,
    node,
  };
  !ignoreVersion &&
    (childContext.version =
      node?.[SchemaAnnotations.Version] ?? context.version);

  if (node.$id) {
    childContext.$ref = node.$id;
  } else if (key) {
    childContext.$ref =
      context.$ref + (childContext.$ref?.includes("/") ? "/" : "#/") + key;
  }

  childContext.path = [...context.path, key];

  if (node.$schema != null) {
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

    //parseEventTypes(childContext);
  }

  return childContext;
};

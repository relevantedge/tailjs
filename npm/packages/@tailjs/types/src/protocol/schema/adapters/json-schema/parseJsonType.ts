import { forEach2, isObject } from "@tailjs/util";
import {
  contextError,
  navigateContext,
  parseAnnotations,
  ParseContext,
  parseDefinitions,
  ParsedJsonSchemaTypeDefinition,
  parseJsonProperty,
  sourceJsonSchemaSymbol,
} from ".";
import { SchemaTypeDefinition } from "../../../..";

export const isJsonObjectType = (node: any) => {
  let allOf: any;
  return (
    (node["type"] === "object" && !isObject(node.additionalProperties)) ||
    ((allOf = node["allOf"]) && allOf[allOf.length - 1]?.["type"] === "object")
  );
};

export const parseJsonType = (context: ParseContext, root: boolean) => {
  let { schema, node, key } = context;
  if (!schema) {
    contextError(context, "No schema for type definition.");
  }
  if (!isJsonObjectType(node)) {
    return contextError(context, "Object type definition expected");
  }

  const sourceNode = node;
  const allOf = node.allOf;
  if (isJsonObjectType(node) && node.type !== "object") {
    node = (context = navigateContext(
      navigateContext(context, "allOf"),
      allOf.length - 1
    )).node;
  }

  const description = sourceNode.description || node.description;

  const type = parseAnnotations<
    SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition
  >(context, {
    abstract:
      sourceNode["additionalProperties"] !== false ||
      description?.match(/@abstract\b/g),
    properties: {},
    [sourceJsonSchemaSymbol]: {
      schema: schema!,
      remove: () => {
        delete schema!.types![key!];
      },
    },
  });

  if (node.$ref) {
    context.refs.resolve(node.$ref, (id) => {
      (type.extends ??= []).push(id);
    });
  }

  if (node.properties) {
    const propertiesContext = navigateContext(context, "properties");
    for (const propertyName in propertiesContext.node) {
      parseJsonProperty(
        navigateContext(propertiesContext, propertyName),
        (property) => (type.properties[propertyName] = property)
      );
    }
  }
  if (root) {
    let id = schema!.namespace + "#" + key!;
    schema!.types![key!] = type;
    forEach2(context.refPaths, (ref) => context.refs.add(ref, id, type));
    context.types.set(id, type);
  }

  forEach2(allOf, (ref) => {
    if (ref.$ref) {
      context.refs.resolve(ref.$ref, (id) => (type.extends ??= []).push(id));
    }
  });

  parseDefinitions(context);
  return type;
};

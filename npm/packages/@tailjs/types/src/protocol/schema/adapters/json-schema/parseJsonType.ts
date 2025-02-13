import { forEach2, isObject, some2 } from "@tailjs/util";
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
import { SchemaSystemTypeDefinition, SchemaTypeDefinition } from "../../../..";
import { JsonSchemaAnnotations, TypeScriptAnnotations } from "@constants";

export const isIgnoredObject = (node: any) =>
  some2(
    node["properties"],
    ([key]: [string, string]) =>
      // This is a TypeScript function that has sneaked into the schema. Remove.
      key.startsWith("NamedParameters") || key.startsWith("namedArgs")
  );

export const isJsonObjectType = (node: any) => {
  let allOf: any;
  return (
    (node["type"] === "object" &&
      !isObject(node.additionalProperties) &&
      !isIgnoredObject(node)) ||
    ((allOf = node["allOf"]) && isJsonObjectType(allOf[allOf.length - 1]))
  );
};

export const parseJsonType = (
  context: ParseContext,
  root: boolean,
  forVariable = false
) => {
  let { schema, node, key } = context;
  if (!schema) {
    contextError(context, "No schema for type definition.");
  }
  if (!isJsonObjectType(node)) {
    return contextError(context, "Object type definition expected");
  }

  const sourceNode = node;
  const allOf = node.allOf;
  if (node.type !== "object") {
    node = (context = navigateContext(
      navigateContext(context, "allOf"),
      allOf.length - 1
    )).node;
  }

  const description = sourceNode.description || node.description;

  let type = parseAnnotations<
    SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition
  >(
    context,
    {
      abstract:
        (sourceNode["not"] &&
          typeof sourceNode["not"] === "object" &&
          !Object.keys(sourceNode["not"]).length) ||
        sourceNode[JsonSchemaAnnotations.Abstract] ||
        description?.match(
          new RegExp(`${TypeScriptAnnotations.abstract}\\b`, "g")
        )
          ? true
          : undefined,
      extends: undefined,
      properties: {},
      [sourceJsonSchemaSymbol]: {
        schema: schema!,
        remove: () => {
          delete schema!.types![key!];
        },
      },
    },
    forVariable
  );

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
        (property) => {
          type.properties[propertyName] = property;
        }
      );
    }
  }
  if (root) {
    let id = schema!.namespace + "#" + key!;
    schema!.types![key!] = type;

    forEach2(context.refPaths, (refPath) =>
      context.refs.add(refPath.replace(/\/allOf\/\d+$/g, ""), id, type)
    );
    context.types.set(id, type);
  }

  for (const typeDef of [sourceNode, node]) {
    if (
      typeDef[JsonSchemaAnnotations.Event] ||
      typeDef.description?.match?.(
        new RegExp(`@${TypeScriptAnnotations.event}\\b`, "g")
      )
    ) {
      if (!root) {
        contextError(context, "Inline object types cannot be used as events.");
      }
      type.event = true;
    }

    if (typeDef[JsonSchemaAnnotations.SystemType]) {
      (type as SchemaSystemTypeDefinition).system =
        typeDef[JsonSchemaAnnotations.SystemType];
    }
  }

  forEach2(allOf, (ref) => {
    if (ref.$ref) {
      context.refs.resolve(ref.$ref, (id) => (type.extends ??= []).push(id));
    }
  });

  parseDefinitions(context);
  return type;
};

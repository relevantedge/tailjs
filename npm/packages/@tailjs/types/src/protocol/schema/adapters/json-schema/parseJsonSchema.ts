import { forEach2, isObject } from "@tailjs/util";
import {
  contextError,
  isJsonObjectType,
  navigateContext,
  parseAnnotations,
  ParseContext,
  parseJsonProperty,
  parseJsonType,
} from ".";
import { SchemaDefinition, variableScope } from "../../../..";

export const isJsonSchema = (node: any) => node["$schema"];

export const parseJsonSchema = (context: ParseContext) => {
  const { node } = context;
  if (!isJsonSchema(node)) {
    return contextError(context, "$schema property expected.");
  }
  const schema = parseAnnotations<SchemaDefinition>(context, {
    namespace: node["$id"] ?? contextError(context, "$id property expected."),
    name: node["name"],
    description: node["description"],
    types: {},
    variables: {},
  });

  context.refPaths.push(schema.namespace + "#");
  context.schema = schema;

  parseDefinitions(context);
  context.schemas.push(schema);
};

const isScopeVariableDefinitionRoot = (key: string, node: any) =>
  isObject(node) &&
  (key === "ScopeVariables" ||
    key === "scope_variables" ||
    node["description"]?.match?.(/@scope_variables\b/g));

export const parseDefinitions = (context: ParseContext) => {
  const { node } = context;
  for (const definitionsKey of ["definitions", "$defs"]) {
    const defs = node[definitionsKey];
    if (isObject(defs)) {
      const defsContext = navigateContext(context, definitionsKey);
      for (const definitionKey in defs) {
        const def = defs[definitionKey];
        if (def?.properties?.["namedArgs"]) {
          // This is what TypeScript functions look like in generated JSON schemas.
          // Ignore those.
          continue;
        }

        if (isJsonSchema(def)) {
          parseJsonSchema(navigateContext(defsContext, definitionKey));
          continue;
        }
        if (isScopeVariableDefinitionRoot(definitionKey, def)) {
          forEach2(
            node["properties"],
            ([name, scopeProperties]: [string, any]) => {
              const scope = variableScope(name.toLowerCase())!;
              const propertiesContext = navigateContext(
                defsContext,
                "properties"
              );
              forEach2(scopeProperties["properties"], ([name]) => {
                parseJsonProperty(
                  navigateContext(propertiesContext, name),
                  (property) =>
                    (((context.schema!.variables ??= {})[scope] ??= {})[name] =
                      property as any)
                );
              });
            }
          );
          continue;
        }

        if (isJsonObjectType(def)) {
          parseJsonType(navigateContext(defsContext, definitionKey), true);
        }
      }
    }
  }
};

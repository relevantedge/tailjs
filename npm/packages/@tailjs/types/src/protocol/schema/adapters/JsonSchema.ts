import { forEach, Nullish, split, throwError } from "@tailjs/util";
import {
  SchemaAdapter,
  SchemaDataUsage,
  SchemaDefinition,
  SchemaEntity,
  SchemaObjectType,
  VersionedSchemaEntity,
} from "..";
import {
  DataAccess,
  DataClassification,
  dataClassification,
  DataPurposeName,
  dataPurposes,
  DataVisibility,
  dataVisibility,
  parseDataPurposes,
} from "../../..";

type ParseContext = {
  currentSchema?: SchemaDefinition;
  path: string;
  scan: boolean;
};

const SchemaAnnotations = {
  Tags: "x-tags",
  Purposes: "x-privacy-purposes",
  Classification: "x-privacy-class",
  Visibility: "x-privacy-visibility",

  /**
   * The version of an entity. When applied at schema level this will be the default, but can be used at type level.
   * ETL can use this for consistency and backwards compatibility.
   */
  Version: "x-version",
};

const parsedSymbol = Symbol();

const throwParseError: {
  <T>(
    context: ParseContext,
    ifValue: T | Nullish,
    message: (value: T) => string
  ): boolean;
  (context: ParseContext, message: string): never;
} = ((context: any, arg1: any, arg2?: any) =>
  arg2
    ? arg1
      ? throwParseError(context, arg2(arg1))
      : false
    : throwError(context.path + ": " + arg1)) as any;

const parseEntityAttributes = <T extends SchemaEntity>(
  context: ParseContext,
  target: T,
  node: any
) => {
  const version = node[SchemaAnnotations.Version];
  version && ((target as VersionedSchemaEntity).version = version);

  const keywords: string[] = [
    node[SchemaAnnotations.Visibility],
    node[SchemaAnnotations.Purposes],
    node[SchemaAnnotations.Classification],
  ];

  if (node.description) {
    const description = (node.description as string)
      .replace(/@privacy (.+)/g, (_, body: string) => {
        keywords.push(body);
        return "";
      })
      .trim();

    if (description) {
      target.description = description;
    }
  }

  let matched:
    | DataVisibility
    | DataClassification
    | DataPurposeName
    | undefined;
  let purposeNames: string[] = [];

  forEach(keywords, (keywords) =>
    forEach(split(keywords, /[,\s]+/), (keyword) => {
      if ((matched = dataClassification.tryParse(keyword))) {
        throwParseError(
          context,
          target.usage?.classification,
          (current) =>
            `Data classification can only be specified once. It is already '${current}'`
        );
        (target.usage ??= {}).classification = matched;
      } else if ((matched = dataVisibility.tryParse(keyword))) {
        throwParseError(
          context,
          target.usage?.visibility,
          (current) =>
            `Data visibility can only be specified once. It is already '${current}'`
        );
        (target.usage ??= {}).visibility = matched;
      } else {
        purposeNames.push(keyword);
      }
    })
  );
  purposeNames.length &&
    ((target.usage ??= {}).purposes = parseDataPurposes(purposeNames));

  return target;
};

export const JsonSchema: SchemaAdapter = {
  parse: (source) => {
    const json = JSON.parse(source);

    const parsed: SchemaDefinition[] = [];
    const typeRefs = new Map<string, SchemaObjectType>();

    const parseType = (node: any, context: ParseContext) => {};
    const traverseDefinition = (
      key: string,
      node: any,
      context: ParseContext
    ) => {
      context = {
        ...context,
        path: (context.path ? context.path + "/" : "") + key,
      };
      if (node["$schema"]) {
        context = {
          ...context,
          currentSchema: parseEntityAttributes(
            context,
            (node[parsedSymbol] ??= {
              namespace: node["$id"],
              name: node["name"],
              description: node["description"],
              types: {},
              variables: {},
            }),
            node
          ),
        };
      } else if (key === "definitions" || key === "$defs") {
        forEach(node, ([name, def]) => {
          traverseDefinition(name, def, context);
        });
      } else if (node["type"] === "object") {
      }
    };

    return [];
  },

  serialize: (schemas) => {
    return "";
  },
};

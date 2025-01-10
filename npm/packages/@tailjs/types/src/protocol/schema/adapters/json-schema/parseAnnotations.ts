import { filter2, isArray, map2, skip2 } from "@tailjs/util";
import { contextError, ParseContext } from ".";
import {
  DataClassification,
  DataClassification,
  DataPurposeName,
  dataPurposes,
  DataVisibility,
  DataVisibility,
  SchemaDefinitionEntity,
  SchemaEntity,
  SchemaObjectType,
  SchemaObjectTypeDefinition,
  SchemaTypeDefinition,
  VersionedSchemaEntity,
} from "../../../..";
import { SchemaType } from "@tailjs/json-schema";

const PRIVACY_ANNOTATIONS = [
  "x-tags",
  "x-privacy-purpose",
  "x-privacy-purposes",
  "x-privacy-class",
  "x-privacy-visibility",
];

const TYPE_VERSION = "x-version";

export const parseAnnotations = <T extends SchemaDefinitionEntity>(
  context: ParseContext,
  target: T,
  description?: string
): T => {
  const { node } = context;

  let version: string | undefined;
  const keywords: string[] = [];

  const nodes = [context.node];
  if (context.refPaths.some((refPath) => refPath.match(/\/allOf\/\d+$/g))) {
    nodes.push(context.parent!.parent!.node);
  }

  for (const node of nodes) {
    if (!version && (version = node[TYPE_VERSION])) {
      version && ((target as VersionedSchemaEntity).version = version);
    }

    map2(PRIVACY_ANNOTATIONS, (key) => node[key] || skip2, keywords);

    description ??= node.description;
    if (description) {
      description = description
        .replace(/@privacy (.+)/g, (_, body: string) => {
          keywords.push(body);
          return "";
        })
        .trim();

      if (!target.description && description) {
        target.description = description;
      }
    }
    if (node["x-abstract"]) {
      (target as any as SchemaTypeDefinition).abstract ??= node["x-abstract"];
    }
  }

  let matched:
    | DataVisibility
    | DataClassification
    | DataPurposeName
    | undefined;
  let purposeNames: string[] = [];

  for (const keywordGroup of keywords) {
    for (const keyword of isArray(keywordGroup)
      ? keywordGroup
      : keywordGroup.split(/[,\s]+/)) {
      if ((matched = DataClassification.parse(keyword, false))) {
        target.classification = target.classification
          ? contextError(
              context,
              `Data classification can only be specified once. It is already '${target.classification}'`
            )
          : matched;
      } else if ((matched = DataVisibility.parse(keyword, false))) {
        target.visibility = target.visibility
          ? contextError(
              context,
              `Data visibility can only be specified once. It is already '${target.visibility}'`
            )
          : matched;
      } else if (keyword === "readonly" || keyword === "writable") {
        target.readonly = keyword === "readonly";
      } else if (keyword !== "necessary") {
        // Don't include the default, that just gives an empty purposes object.
        purposeNames.push(keyword);
      }
    }
  }
  purposeNames.length && (target.purposes = dataPurposes(purposeNames));

  if (node.$anchor) {
    context.refPaths.push(
      `${
        context.schema?.namespace ??
        contextError(
          context,
          "$anchor property are not allowed outside schema definitions."
        )
      }#${node.$anchor}`
    );
  }

  return target;
};

export const serializeAnnotations = (entity: SchemaEntity) => {
  const usage = entity.usageOverrides;
  if (!usage) return;
  let annotations: any;
  if ((entity as SchemaObjectType).abstract) {
    (annotations ??= {})["x-abstract"] = true;
  }
  if (usage.classification) {
    (annotations ??= {})["x-privacy-class"] = usage.classification;
  }
  if (usage.purposes) {
    (annotations ??= {})["x-purposes"] = dataPurposes(usage.purposes, {
      names: true,
    });
  }
  if (usage.readonly || usage.visibility) {
    (annotations ??= {})["x-visibility"] = filter2(
      [usage.readonly && "readonly", usage.visibility],
      true
    );
  }
  return annotations;
};

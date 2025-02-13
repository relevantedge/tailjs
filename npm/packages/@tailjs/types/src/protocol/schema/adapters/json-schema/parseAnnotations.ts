import { JsonSchemaAnnotations, TypeScriptAnnotations } from "@constants";
import { filter2, map2, skip2 } from "@tailjs/util";
import { contextError, ParseContext } from ".";
import {
  DataPurposes,
  parseSchemaDataUsageKeywords,
  SchemaDefinitionEntity,
  SchemaEntity,
  SchemaObjectType,
  SchemaVariable,
  VersionedSchemaEntity,
} from "../../../..";

const PRIVACY_ANNOTATIONS = [
  JsonSchemaAnnotations.Classification,
  JsonSchemaAnnotations.Purposes,
  JsonSchemaAnnotations.Access,
];

export const parseAnnotations = <T extends SchemaDefinitionEntity>(
  context: ParseContext,
  target: T,
  forVariable = false
): T => {
  const { node } = context;

  let version: string | undefined;
  const keywords: string[] = [];

  const nodes = [context.node];
  if (context.refPaths.some((refPath) => refPath.match(/\/allOf\/\d+$/g))) {
    nodes.push(context.parent!.parent!.node);
  }

  for (const node of nodes) {
    if (!version && (version = node[JsonSchemaAnnotations.Version])) {
      version && ((target as VersionedSchemaEntity).version = version);
    }

    map2(PRIVACY_ANNOTATIONS, (key) => node[key] || skip2, keywords);

    let description: string = node["description"];
    if (description) {
      description = description
        .replace?.(
          new RegExp(
            `@(?:${TypeScriptAnnotations.privacy}|${TypeScriptAnnotations.access}) ([^@]+)`,
            "g"
          ),
          (_: any, body: string) => {
            keywords.push(body);
            return "";
          }
        )
        .trim();

      if (!target.description && description) {
        target.description = description;
      }
    }
  }

  try {
    const usage = parseSchemaDataUsageKeywords(keywords, forVariable);
    Object.assign(target, usage, target);
  } catch (e) {
    contextError(context, e.message ?? "" + e);
  }

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

export const serializeAnnotations = (entity: SchemaEntity | SchemaVariable) => {
  const usage = (entity as SchemaEntity).usageOverrides ?? {};

  let annotations: any;
  if ((entity as SchemaObjectType).abstract) {
    annotations ??= { not: {} };
    annotations[JsonSchemaAnnotations.Abstract] = true;
  }
  if (usage.classification) {
    (annotations ??= {})[JsonSchemaAnnotations.Classification] =
      usage.classification;
  }
  if (usage.purposes) {
    (annotations ??= {})[JsonSchemaAnnotations.Purposes] = DataPurposes.parse(
      usage.purposes,
      {
        names: true,
      }
    );
  }
  if (
    usage.readonly ||
    usage.visibility ||
    (entity as SchemaVariable).dynamic
  ) {
    (annotations ??= {})[JsonSchemaAnnotations.Access] = filter2(
      [
        usage.readonly && "readonly",
        usage.visibility,
        (entity as SchemaVariable).dynamic && "dynamic",
      ],
      false
    );
  }
  return annotations;
};

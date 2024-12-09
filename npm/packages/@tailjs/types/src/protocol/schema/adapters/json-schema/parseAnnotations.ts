import { forEach2, map2, skip2 } from "@tailjs/util";
import { contextError, ParseContext } from ".";
import {
  dataClassification,
  DataClassification,
  DataPurposeName,
  dataPurposes,
  dataVisibility,
  DataVisibility,
  SchemaDataUsage,
  SchemaDefinitionEntity,
  VersionedSchemaEntity,
} from "../../../..";

const PRIVACY_ANNOTATIONS = [
  "x-tags",
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

  const version = node[TYPE_VERSION];
  version && ((target as VersionedSchemaEntity).version = version);

  const keywords: string[] = map2(
    PRIVACY_ANNOTATIONS,
    (key) => node[key] || skip2
  );

  description ??= node.description;
  if (description) {
    description = description
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

  for (const keywordGroup of keywords) {
    for (const keyword of keywordGroup.split(/[,\s]+/)) {
      if ((matched = dataClassification.tryParse(keyword))) {
        target.classification = target.classification
          ? contextError(
              context,
              `Data classification can only be specified once. It is already '${target.classification}'`
            )
          : matched;
      } else if ((matched = dataVisibility.tryParse(keyword))) {
        target.visibility = target.visibility
          ? contextError(
              context,
              `Data visibility can only be specified once. It is already '${target.visibility}'`
            )
          : matched;
      } else if (keyword === "readonly" || keyword === "writable") {
        target.readonly = keyword === "readonly";
      } else {
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

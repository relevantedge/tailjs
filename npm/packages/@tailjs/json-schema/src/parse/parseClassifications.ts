import { LabelSet, throwError } from "@tailjs/util";
import { TraverseContext } from ".";
import {
  SchemaAnnotations,
  SchemaClassificationLabel,
  getPrivacyAnnotations,
  schemaDataUsage,
} from "..";

export const parseSchemaUsage = (context: Partial<TraverseContext>) => {
  const node = context.node;

  const keywords: LabelSet<SchemaClassificationLabel>[] = [
    node[SchemaAnnotations.System] && "system",
    node[SchemaAnnotations.Purposes],
    node[SchemaAnnotations.Classification],
  ];

  if (node.description) {
    node.description = (node.description as string)
      .replace(/@privacy (.+)/g, (_, body: string) => {
        keywords.push(...(body.split(/[,\s]+/) as any));
        return "";
      })
      .trim();

    if (!node.description.length) {
      // Remove the description if it only had privacy annotations.
      delete node.description;
    }
  }

  const nodeClassification = schemaDataUsage(keywords);
  if (
    nodeClassification?.system &&
    (nodeClassification.classification || nodeClassification.purposes)
  ) {
    throwError(
      "The system annotation cannot be combined with data classification or purposes"
    );
  }

  nodeClassification &&
    Object.assign(node, getPrivacyAnnotations(nodeClassification));

  let classification = schemaDataUsage.merge(context.usage ?? {}, keywords);
  if (classification !== context.usage) {
    classification.explicit = true;
  } else {
    classification = { ...classification };
  }

  return classification;
};

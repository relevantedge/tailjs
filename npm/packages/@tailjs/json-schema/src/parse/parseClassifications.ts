import {
  DataClassification,
  DataPurposeFlags,
  dataClassification,
  dataPurposes,
} from "@tailjs/types";
import { tryCatch } from "@tailjs/util";
import { ParsedSchemaClassification, TraverseContext, parseError } from ".";
import {
  SchemaAnnotations,
  getPrivacyAnnotations,
  parsePrivacyTokens,
} from "..";

export const parseClassifications = (
  context: Partial<TraverseContext>
): Partial<ParsedSchemaClassification> => {
  const node = context.node;

  const classification: Partial<ParsedSchemaClassification> = {};

  if (node[SchemaAnnotations.Censor] != null) {
    classification.censorIgnore = node[SchemaAnnotations.Censor] === "ignore";
  }

  if (
    (node[SchemaAnnotations.Purpose] ?? node[SchemaAnnotations.Purposes]) !=
    null
  ) {
    parseError(
      context,
      "x-privacy-purpose and x-privacy-purposes cannot be specified at the same time."
    );
  }

  classification.classification = dataClassification.parse(
    node[SchemaAnnotations.Classification]
  );

  classification.purposes = dataPurposes.parse(
    node[SchemaAnnotations.Purpose] ?? node[SchemaAnnotations.Purposes]
  );

  if (node.description) {
    const parsed = (node.description as string)
      .replace(/@privacy (.+)/g, (_, keywords: string) => {
        tryCatch(
          () => parsePrivacyTokens(keywords, classification),
          (err) => parseError(context, err)
        );
        return "";
      })
      .trim();

    if (!parsed.length) {
      delete node.description;
    }

    Object.assign(node, getPrivacyAnnotations(classification));
  }

  if ((classification.censorIgnore ??= context.censorIgnore)) {
    classification.classification ??= DataClassification.Anonymous;
    classification.purposes ??= DataPurposeFlags.Any;
  }

  return {
    classification: classification.classification ?? context.classification,
    purposes: classification.purposes ?? context.purposes,
    censorIgnore: classification.censorIgnore ?? context.censorIgnore,
    explicit:
      (classification.classification ?? classification.purposes) != null,
  };
};

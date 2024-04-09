import {
  DataClassification,
  DataPurposes,
  dataClassification,
  dataPurposes,
  getPrivacyAnnotations,
  parsePrivacyTokens,
  PrivacyAnnotations,
} from "@tailjs/types";
import { OmitPartial, isDefined, tryCatch } from "@tailjs/util";
import { ParsedSchemaClassification, TraverseContext, parseError } from ".";

export const parseClassifications = (
  context: OmitPartial<
    TraverseContext,
    "node" | "classification" | "purposes" | "path"
  >
): Partial<ParsedSchemaClassification> => {
  const node = context.node;

  const classification: Partial<ParsedSchemaClassification> = {};

  if (isDefined(node[PrivacyAnnotations.Censor])) {
    classification.censorIgnore = node[PrivacyAnnotations.Censor] === "ignore";
  }

  if (
    isDefined(
      node[PrivacyAnnotations.Purpose] ?? node[PrivacyAnnotations.Purposes]
    )
  ) {
    parseError(
      context,
      "x-privacy-purpose and x-privacy-purposes cannot be specified at the same time."
    );
  }

  classification.classification = dataClassification.parse(
    node[PrivacyAnnotations.Classification]
  );
  classification.purposes = dataPurposes.parse(
    node[PrivacyAnnotations.Purpose] ?? node[PrivacyAnnotations.Purposes]
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
    classification.purposes ??= DataPurposes.Any;
  }

  return {
    classification: classification.classification ?? context.classification,
    purposes: classification.purposes ?? context.purposes,
    censorIgnore: classification.censorIgnore ?? context.censorIgnore,
  };
};

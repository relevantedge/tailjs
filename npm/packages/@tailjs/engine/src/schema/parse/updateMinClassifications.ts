import { isDefined } from "@tailjs/util";
import { ParsedSchemaClassification } from ".";
import { DataPurposeFlags } from "@tailjs/types";

export const updateMinClassifications = (
  type: Partial<ParsedSchemaClassification>,
  classifications: Partial<ParsedSchemaClassification>
) => {
  if (isDefined(classifications.classification)) {
    type.classification = Math.min(
      type.classification ?? classifications.classification,
      classifications.classification
    );
  }
  if (isDefined(classifications.purposes)) {
    type.purposes =
      (type.purposes ?? 0) |
      // Flags higher than "Any" are reserved for special purposes, and does not participate here.
      (classifications.purposes & DataPurposeFlags.Any);
  }
  type.censorIgnore ??= classifications.censorIgnore;
};

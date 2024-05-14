import { DataPurposeFlags } from "@tailjs/types";
import { ParsedSchemaClassification } from ".";

export const updateMinClassifications = (
  type: Partial<ParsedSchemaClassification>,
  classifications: Partial<ParsedSchemaClassification>
) => {
  if (classifications.classification != null) {
    type.classification = Math.min(
      type.classification ?? classifications.classification,
      classifications.classification
    );
  }
  if (classifications.purposes != null) {
    type.purposes =
      (type.purposes ?? 0) |
      // Flags higher than "Any" are reserved for special purposes, and does not participate here.
      (classifications.purposes & DataPurposeFlags.Any);
  }
  type.censorIgnore ??= classifications.censorIgnore;
};

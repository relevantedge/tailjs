import { isDefined } from "@tailjs/util";
import { ParsedSchemaClassification } from ".";

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
    type.purposes = (type.purposes ?? 0) | classifications.purposes;
  }
  type.censorIgnore ??= classifications.censorIgnore;
};

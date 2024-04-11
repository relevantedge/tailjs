import { isDefined, isString, throwError } from "@tailjs/util";
import {
  DataClassificationValue,
  DataPurposeValue,
  dataPurposes,
  dataClassification,
} from "@tailjs/types";

import { SchemaAnnotations } from ".";

type SchemaClassification = {
  classification?: DataClassificationValue<true>;
  purposes?: DataPurposeValue<true>;
  censorIgnore?: boolean;
};

export const parsePrivacyTokens = (
  tokens: string,
  classification: SchemaClassification = {}
) => {
  tokens
    .split(/[,\s]/)
    .map((keyword) => keyword.trim())
    .filter((item) => item)
    .forEach((keyword) => {
      if (keyword === "censor-ignore" || keyword === "censor-include") {
        classification.censorIgnore ??= keyword === "censor-ignore";
        return;
      }

      let parsed = (dataPurposes.tryParse(keyword) ??
        dataPurposes.tryParse(keyword.replace(/\-purpose$/g, ""))) as
        | number
        | undefined;
      if (isDefined(parsed)) {
        classification.purposes = (classification.purposes ?? 0) | parsed;
        return;
      }

      parsed =
        dataClassification.tryParse(keyword) ??
        dataClassification.tryParse(keyword.replace(/^personal-/g, ""));
      if (isDefined(parsed)) {
        if (
          classification.classification &&
          parsed !== classification.classification
        ) {
          throwError(
            `The data classification '${dataClassification.format(
              classification.classification
            )}' has already been specified and conflicts with the classification'${dataClassification.format(
              parsed
            )} inferred from the description.`
          );
        }
        classification.classification ??= parsed;

        return;
      }

      throwError(`Unknown privacy keyword '${keyword}'.`);
    });

  return classification;
};

export const getPrivacyAnnotations = (classification: SchemaClassification) => {
  const attrs: Record<string, any> = {};
  isDefined(classification.classification) &&
    (attrs[SchemaAnnotations.Classification] = dataClassification.format(
      classification.classification
    ));

  let purposes = dataPurposes.format(classification.purposes);
  isDefined(purposes) &&
    (attrs[
      isString(purposes)
        ? SchemaAnnotations.Purpose
        : SchemaAnnotations.Purposes
    ] = purposes);

  isDefined(classification.censorIgnore) &&
    (attrs[SchemaAnnotations.Censor] = classification.censorIgnore
      ? "ignore"
      : "include");

  return attrs;
};

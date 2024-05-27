import {
  DataClassificationValue,
  DataPurposeValue,
  dataClassification,
  dataPurposes,
} from "@tailjs/types";
import { isString, throwError } from "@tailjs/util";

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

      let matched = false;
      let parsed = (dataPurposes.tryParse(keyword) ??
        dataPurposes.tryParse(keyword.replace(/\-purpose$/g, ""))) as
        | number
        | undefined;
      if (parsed != null) {
        classification.purposes = (classification.purposes ?? 0) | parsed;
        matched = true;
      }

      parsed =
        dataClassification.tryParse(keyword) ??
        dataClassification.tryParse(keyword.replace(/^personal-/g, ""));
      if (parsed != null) {
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
        matched = true;
      }

      !matched && throwError(`Unknown privacy keyword '${keyword}'.`);
    });

  return classification;
};

export const getPrivacyAnnotations = (classification: SchemaClassification) => {
  const attrs: Record<string, any> = {};
  classification.classification != null &&
    (attrs[SchemaAnnotations.Classification] = dataClassification.format(
      classification.classification
    ));

  let purposes = dataPurposes.format(classification.purposes);
  purposes != null &&
    (attrs[
      isString(purposes)
        ? SchemaAnnotations.Purpose
        : SchemaAnnotations.Purposes
    ] = purposes);

  classification.censorIgnore != null &&
    (attrs[SchemaAnnotations.Censor] = classification.censorIgnore
      ? "ignore"
      : "include");

  return attrs;
};

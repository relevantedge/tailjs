import {
  DataAccess,
  DataUsage,
  DataUsageLabel,
  dataClassification,
  dataPurposes,
  dataUsage,
} from "@tailjs/types";
import { createLabelParser, labelSource } from "@tailjs/util";
import { SchemaAnnotations } from ".";

export type SchemaClassificationLabel = DataUsageLabel | "system";

export const DEFAULT_SCHEMA_USAGE: SchemaDataUsage = {
  access: {},
  classification: "anonymous",
  purposes: {},
};

export const schemaDataUsage = createLabelParser<
  SchemaDataUsage,
  SchemaClassificationLabel,
  true
>(
  "data usage (schema)",
  true,
  {
    ...dataUsage[labelSource].mappings,
    system: (value) => (value.system = true),
  },
  (value, useDefault) => [
    dataUsage.format(value, useDefault),
    value.system && "system",
  ],
  dataUsage[labelSource].mutex
);

export const getPrivacyAnnotations = (classification: SchemaDataUsage) => {
  const attrs: Record<string, any> = {};
  classification.classification != null &&
    (attrs[SchemaAnnotations.Classification] = classification.classification);

  let purposes = dataPurposes.format(classification.purposes);
  purposes?.length && (attrs[SchemaAnnotations.Purposes] = purposes);

  classification.system != null &&
    (attrs[SchemaAnnotations.System] = classification.system
      ? "ignore"
      : "include");

  return attrs;
};

import {
  DataUsage,
  DataUsageLabel,
  dataClassification,
  dataPurposes,
  dataUsage,
} from "@tailjs/types";
import { createLabelParser, source } from "@tailjs/util";
import { SchemaAnnotations } from ".";

export type SchemaClassificationLabel = DataUsageLabel | "system";

export const DEFAULT_SCHEMA_USAGE: SchemaDataUsage = {
  access: {},
  classification: "anonymous",
  purposes: {},
};

export interface SchemaDataUsage extends DataUsage {
  /**
   * Properties with this annotation carries no useful information by themselves such as internal object identifiers,
   * and creation/modification timestamps. If only fields with this flag are left on an object after censoring
   * the object is ignored (`undefined`).
   *
   * It is an error to combine this annotation with data classification or purposes.
   *
   */
  system?: boolean;

  /**
   * The classification is explicitly defined on the object or property.
   */
  explicit?: boolean;
}

export const schemaDataUsage = createLabelParser<
  SchemaDataUsage,
  SchemaClassificationLabel,
  true
>(
  "data usage (schema)",
  true,
  {
    ...dataUsage[source].mappings,
    system: (value) => (value.system = true),
  },
  (value, useDefault) => [
    dataUsage.format(value, useDefault),
    value.system && "system",
  ],
  dataUsage[source].mutex
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

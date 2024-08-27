import {
  concat,
  createLabelParser,
  entries,
  ParsableLabelValue,
  LabelMapper,
  source,
} from "@tailjs/util";
import {
  dataAccess,
  DataAccess,
  DataAccessLabel,
  dataClassification,
  DataClassification,
  DataPurposeLabel,
  dataPurposes,
  DataPurposes,
} from ".";

export type DataUsageLabel =
  | DataClassification
  | DataAccessLabel
  | DataPurposeLabel;

/**
 * The classification, purposes and access restrictions for a piece of information
 * that in combination fully defines how it is allowed to pass through the system, if at all.
 */
export interface DataUsage {
  /**
   * The classification of the data.
   */
  classification?: DataClassification;

  /**
   * The purposes the data may be used for.
   */
  purposes?: DataPurposes;

  /**
   * Access restrictions that applies to the data.
   */
  access?: DataAccess;
}

export type DataUsageValue = ParsableLabelValue<DataUsage, DataUsageLabel>;

const mappings: Record<
  DataUsageLabel,
  LabelMapper<DataUsage, DataUsageLabel>
> = {} as any;

for (const [label, mapper] of entries(dataAccess[source].mappings))
  mappings[label] = (value) => mapper((value.access ??= {}), label);
for (const [label, mapper] of entries(dataPurposes[source].mappings))
  mappings[label] = (value) => mapper((value.purposes ??= {}), label);
for (const label of dataClassification.levels)
  mappings[label] = (value) => (value.classification = label);

export const dataUsage = createLabelParser<DataUsage, DataUsageLabel, true>(
  "data usage",
  true,
  mappings,
  (value, useDefault) => [
    dataAccess.format(value.access, useDefault),
    dataPurposes.format(value.purposes, useDefault),
    value.classification ?? (useDefault && "anonymous"),
  ],
  [...dataAccess[source].mutex!, dataClassification.levels]
);

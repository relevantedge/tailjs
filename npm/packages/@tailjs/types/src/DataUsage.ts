import { enumerate, map2, Nullish, skip2 } from "@tailjs/util";
import {
  dataClassification,
  DataClassification,
  dataPurposes,
  DataPurposes,
  PurposeTestOptions,
  SchemaDataUsage,
} from ".";

export const formatDataUsage = (usage?: DataUsage) =>
  (usage?.classification ?? "anonymous") +
  " data for " +
  enumerate(dataPurposes(usage?.purposes, { names: true })) +
  " purposes.";

export const validateConsent = (
  target: DataUsage,
  consent: DataUsage,
  options: PurposeTestOptions
) => {
  if (target.classification === "never" || consent.classification === "never") {
    return false;
  }
  if (target.classification === "anonymous") {
    // Anonymous data does not require consent (it is not "_personal_ data" - just _data_).
    return true;
  }
  if (
    dataClassification.ranks[target.classification] >
    dataClassification.ranks[consent.classification]
  ) {
    // Too personal.
    return false;
  }

  return dataPurposes.test(target.purposes, consent.purposes, options);
};

/**
 * The combination of the classification and purposes it can be used for determines whether
 * data can be stored or used when compared to an individual's consent.
 */
export interface DataUsage {
  /**
   * The maximum classification of data a user has consented to be collected and stored.
   *
   * Any property with a classification higher than this will be cleared (censored) before an object is stored.
   * If all properties gets censored, the object is not stored at all.
   *
   * Anonymous data does not require active consent, so data is stored regardless of its purposes
   * since it is not "personal data" but just "data".
   * This means you should not annotate all anonymous data as "necessary" in your schema, but rather
   * use the purpose(s) that would require consent had the data not been anonymous.
   *
   * In this way you can simply remove the `anonymous` annotation from a field or object if it turns
   * out it is not truly anonymous. After that the data can no longer be read for purposes without
   * user consent. However, tail.js does not currently support redacting/purging the data from storage
   * so this you need to do manually.
   *
   * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
   *
   * @default anonymous
   *
   */
  classification: DataClassification;

  /**
   * The purposes the data may be used for.
   *
   * If a data point has multiple purposes, consent is only need for one of them
   * for the data to get stored. However, if some logic tries to read the data for a purpose without consent,
   * it is not returned, since it is only stored for other purposes.
   *
   * Purposes do not restrict anonymous data.
   *
   * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
   */
  purposes: DataPurposes;
}

export const usageToString = (usage: DataUsage): string | null => {
  const purposes = dataPurposes(usage.purposes, { names: true });

  return usage.classification === "anonymous" && !purposes.length
    ? null
    : `${usage.classification}:${purposes}`;
};

export const usageFromString = (
  usageString: string | Nullish,
  defaultUsage?: DataUsage
): DataUsage => {
  if (!usageString)
    return defaultUsage
      ? {
          classification: defaultUsage.classification,
          purposes: { ...defaultUsage.purposes },
        }
      : { classification: "anonymous", purposes: {} };
  const [classification, purposes] = usageString.split(":");
  return {
    classification: dataClassification.tryParse(classification) ?? "anonymous",
    purposes: dataPurposes(purposes, { validate: false }),
  };
};

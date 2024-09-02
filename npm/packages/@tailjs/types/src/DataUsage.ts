import { DataClassification, DataPurposes } from ".";

/**
 * The classification and purposes of a data point that determines whether
 * it can be stored or used given an individual's consent.
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
   */
  classification?: DataClassification;

  /**
   * The purposes the data may be used for.
   *
   * If a data point has multiple purposes, consent is only need for one of them
   * for the data to get stored. However, if some logic tries to read the data for a purpose without consent,
   * it is not returned, since it is only stored for other purposes.
   *
   * Purposes do not restrict anonymous data.
   */
  purposes?: DataPurposes;
}

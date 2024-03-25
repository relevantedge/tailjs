import { DataClassificationValue, DataPurposeValue } from ".";

/** A user's consent choices.  */
export interface UserConsent {
  /**
   * The highest level of data classification the user has consented to be stored.
   */
  level: DataClassificationValue;

  /**
   * The purposes the user has consented their data to be used for.
   */
  purposes: DataPurposeValue;
}

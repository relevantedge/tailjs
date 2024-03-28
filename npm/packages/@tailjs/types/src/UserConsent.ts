import {
  DataClassification,
  DataClassificationValue,
  DataPurposeValue,
  DataPurposes,
} from ".";

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

export const validateConsent = (
  source: { classification: DataClassification; purposes: DataPurposes },
  consent: { classification: DataClassification; purposes: DataPurposes }
) =>
  source.classification <= consent.classification &&
  (source.classification === 0 || (source.purposes & consent.purposes) > 0);

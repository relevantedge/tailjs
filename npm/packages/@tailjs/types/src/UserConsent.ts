import {
  DataClassification,
  DataClassificationValue,
  DataPurposeValue,
  DataPurposes,
  dataClassification,
  dataPurposes,
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

export const isUserConsent = (value: any) => !!value?.["level"];

export const validateConsent = (
  source:
    | { classification?: DataClassificationValue; purposes?: DataPurposeValue }
    | undefined,
  consent:
    | UserConsent
    | { classification: DataClassificationValue; purposes: DataPurposeValue }
) =>
  source &&
  dataClassification.parse(source.classification)! <=
    dataClassification.parse(
      consent["classification"] ?? consent["level"],
      false
    ) &&
  (source.classification === 0 ||
    ((dataPurposes.parse(source.purposes, false) ?? 0) &
      dataPurposes.parse(consent.purposes, false)) >
      0);

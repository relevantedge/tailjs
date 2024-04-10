import { required } from "@tailjs/util";
import {
  DataClassification,
  DataClassificationValue,
  DataPurposeValue,
  DataPurposes,
  VariableClassification,
  dataClassification,
  dataPurposes,
} from ".";

/** A user's consent choices.  */
export interface UserConsent<NumericEnums = boolean> {
  /**
   * The highest level of data classification the user has consented to be stored.
   */
  level: DataClassificationValue<NumericEnums>;

  /**
   * The purposes the user has consented their data to be used for.
   */
  purposes: DataPurposeValue<NumericEnums>;
}

export const NoConsent: Readonly<UserConsent> = Object.freeze({
  level: DataClassification.Anonymous,
  purposes: DataPurposes.Anonymous,
});

export const FullConsent: Readonly<UserConsent> = Object.freeze({
  level: DataClassification.Sensitive,
  purposes: DataPurposes.Any,
});

export const isUserConsent = (value: any) => !!value?.["level"];

export const validateConsent = (
  source:
    | { classification?: DataClassificationValue; purposes?: DataPurposeValue }
    | undefined,
  consent:
    | UserConsent
    | { classification: DataClassificationValue; purposes: DataPurposeValue },
  defaultClassification?: VariableClassification
) => {
  if (!source) return undefined;
  const classification =
    dataClassification.parse(source.classification, false) ??
    required(
      dataClassification(defaultClassification?.classification),
      "The source has not defined a data classification and no default was provided."
    );
  const purposes =
    dataPurposes(source.purposes) ??
    required(
      dataPurposes(defaultClassification?.purposes),
      "The source has not defined data purposes and no default was provided."
    );
  return (
    source &&
    classification! <=
      dataClassification.parse(
        consent["classification"] ?? consent["level"],
        false
      ) &&
    (purposes & dataPurposes.parse(consent.purposes, false)) > 0
  );
};

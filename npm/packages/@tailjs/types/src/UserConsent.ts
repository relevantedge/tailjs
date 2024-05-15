import { required } from "@tailjs/util";
import {
  DataClassificationValue,
  DataPurposeFlags,
  DataPurposeValue,
  VariableClassification,
  dataClassification,
  dataPurposes,
} from ".";

// The `extender infer T` stuff below is to inline the enums in the JSON schema.
// Otherwise it looks weird.

/** A user's consent choices.  */
export interface UserConsent {
  /**
   * The highest level of data classification the user has consented to be stored.
   */
  level: DataClassificationValue<false> extends infer T ? T : never;

  /**
   * The purposes the user has consented their data to be used for.
   *
   * @privacy anonymous
   */
  purposes: DataPurposeValue<false> extends infer T ? T : never;
}

export const NoConsent: Readonly<UserConsent> = Object.freeze({
  level: "anonymous",
  purposes: "anonymous",
});

export const FullConsent: Readonly<UserConsent> = Object.freeze({
  level: "sensitive",
  purposes: "any",
});

export const isUserConsent = (value: any) => !!value?.["level"];

export type ParsableConsent =
  | {
      classification: DataClassificationValue;
      purposes: DataPurposeValue;
    }
  | { level: DataClassificationValue; purposes: DataPurposeValue };
export const validateConsent = (
  source: Partial<ParsableConsent> | undefined,
  consent: ParsableConsent,
  defaultClassification?: Partial<VariableClassification>
) => {
  if (!source) return undefined;
  const classification =
    dataClassification.parse(
      (source as any)?.classification ?? (source as any)?.level,
      false
    ) ??
    required(
      dataClassification(defaultClassification?.classification),
      "The source has not defined a data classification and no default was provided."
    );
  let purposes =
    dataPurposes.parse(source.purposes, false) ??
    required(
      dataPurposes.parse(defaultClassification?.purposes, false),
      "The source has not defined data purposes and no default was provided."
    );

  const consentClassification = dataClassification.parse(
    consent["classification"] ?? consent["level"],
    false
  );

  const consentPurposes = dataPurposes.parse(consent.purposes, false);

  if (
    purposes & DataPurposeFlags.Server &&
    !(consentPurposes & DataPurposeFlags.Server)
  ) {
    return false;
  }

  return (
    source &&
    classification! <= consentClassification &&
    (purposes &
      // No matter what is defined in the consent, it will always include the "anonymous" purposes.
      (consentPurposes | DataPurposeFlags.Anonymous)) >
      0
  );
};

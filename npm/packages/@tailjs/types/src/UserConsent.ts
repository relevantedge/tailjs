import { required } from "@tailjs/util";
import {
  DataClassificationValue,
  DataPurposeFlags,
  DataPurposeValue,
  VariableUsage,
  dataClassification,
  dataPurposes,
} from ".";

// The `extender infer T` stuff below is to inline the enums in the JSON schema.
// Otherwise it looks weird.

/** A user's consent choices.  */
export interface UserConsent<NumericEnums extends boolean = false> {
  /**
   * The highest level of data classification the user has consented to be stored.
   */
  level: DataClassificationValue<NumericEnums> extends infer T ? T : never;

  /**
   * The purposes the user has consented their data to be used for.
   *
   * @privacy anonymous
   */
  purposes: DataPurposeValue<NumericEnums> extends infer T ? T : never;
}

export const NoConsent: Readonly<UserConsent> = Object.freeze({
  level: "anonymous",
  purposes: "any_anonymous",
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
  defaultClassification?: Partial<VariableUsage>,
  write = false
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

  // If we are writing, also check that the type is not client-side read-only.
  // The context will only be given the `Server` flag. `ClientRead` is only for annotations.
  for (const serverFlag of [
    DataPurposeFlags.Server,
    write ? DataPurposeFlags.Server_Write : 0,
  ]) {
    if (purposes & serverFlag && !(consentPurposes & DataPurposeFlags.Server)) {
      return false;
    }
  }

  return (
    source &&
    classification! <= consentClassification &&
    (purposes &
      // No matter what is defined in the consent, it will always include the "anonymous" purposes.
      (consentPurposes | DataPurposeFlags.Any_Anonymous)) >
      0
  );
};

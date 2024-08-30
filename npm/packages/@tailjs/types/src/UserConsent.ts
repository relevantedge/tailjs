import { Nullish } from "@tailjs/util";
import {
  DataClassification,
  DataPurposes,
  DataUsage,
  dataClassification,
} from ".";

export interface UserConsent {
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

export const NoConsent: Readonly<UserConsent> = Object.freeze({
  classification: "anonymous",
  purposes: {
    necessary: true,
  },
});

export const FullConsent: Readonly<UserConsent> = Object.freeze({
  classification: "sensitive",
  purposes: {
    necessary: true,
    functionality: true,
    marketing: true,
    performance: true,
    personalization: true,
    security: true,
  },
});

export const isUserConsent = (value: any) => !!value?.["classification"];

export type ConsentEvaluationContext = {
  trusted?: boolean;
  write?: boolean;
};

export const validateConsent = (
  source: DataUsage | Nullish,
  consent: DataUsage | Nullish,
  defaultUsage?: DataUsage,

  { write, trusted }: ConsentEvaluationContext = {}
) => {
  if (!source) return undefined;

  // Collect no data for any reason.
  if (consent && !consent.purposes?.necessary) return false;

  // Anonymous data does not require consent.
  if (source.classification === "anonymous") return true;

  const restriction = source.access?.restriction;
  if (
    restriction === "disabled" ||
    (!trusted &&
      (restriction === "trusted-only" ||
        (restriction === "trusted-write" && write)))
  ) {
    return false;
  }

  if (!consent) {
    return true;
  }

  if (
    dataClassification.compare(
      source.classification ?? defaultUsage?.classification ?? 0,
      consent.classification ?? 0
    ) >= 0
  ) {
    return false;
  }

  const sp = source.purposes ?? defaultUsage?.purposes;
  const cp = consent?.purposes;

  return (
    !sp ||
    !cp ||
    !cp.performance ||
    sp.performance ||
    !cp.functionality ||
    sp.functionality ||
    !cp.marketing ||
    sp.marketing ||
    !cp.personalization ||
    sp.personalization ||
    !cp.security ||
    sp.security
  );
};

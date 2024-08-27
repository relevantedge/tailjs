import {
  LabelMapper,
  Nullish,
  ParsableLabelValue,
  createLabelParser,
  entries,
  isArray,
  isObject,
  isString,
  required,
  source,
} from "@tailjs/util";
import {
  DataClassification,
  DataPurposeLabel,
  DataPurposeValue,
  DataPurposes,
  DataUsage,
  VariableUsage,
  dataClassification,
  dataPurposes,
} from ".";

export interface UserConsent {
  /**
   * The classification of the data.
   */
  classification: DataClassification;

  /**
   * The purposes the data may be used for.
   */
  purposes: DataPurposes;
}

export const NoConsent: Readonly<UserConsent> = Object.freeze({
  classification: "anonymous",
  purposes: {},
});

export const FullConsent: Readonly<UserConsent> = Object.freeze({
  classification: "sensitive",
  purposes: {
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
  personalization?: boolean;
  security?: boolean;
};

export const validateConsent = (
  source: DataUsage | Nullish,
  consent: DataUsage | Nullish,
  defaultUsage?: DataUsage,

  { write, trusted, personalization, security }: ConsentEvaluationContext = {}
) => {
  if (!source) return undefined;

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
    ((!cp.performance || sp.performance) &&
      (!cp.functionality || sp.functionality) &&
      (!cp.marketing || sp.marketing) &&
      (!(personalization ? cp.personalization : cp.functionality) ||
        (personalization ? sp.personalization : cp.personalization)) &&
      (!security || !cp.security || sp.security))
  );
};

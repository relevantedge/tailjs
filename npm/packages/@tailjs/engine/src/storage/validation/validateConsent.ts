import {
  DataClassification,
  dataClassification,
  DataPurposeName,
  DataPurposes,
  DataUsage,
} from "@tailjs/types";

const DEFAULT_PURPOSES: DataPurposes = { necessary: true };
const DEFAULT_CLASSIFICATION = "anonymous";

type ConsentValidationOptions = {
  /** If data is being read for a specific purpose both the schema definition and consent must include the purpose. */
  targetPurpose?: DataPurposeName;

  /** The schema's data usage must have at least one of the consent's purposes, but none other.  */
  intersect?: boolean;

  /** Consider the security purpose different from "necessary". */
  security?: boolean;
  /** Consider the personalization purpose different from "functionality". */
  personalization?: boolean;
};
export const validateConsent = (
  schema?: DataUsage,
  test?: DataUsage,
  options?: ConsentValidationOptions
) => {
  if (schema?.classification === "never") {
    // This part of the schema is disabled.
    return false;
  }

  if (
    // Default is "anonymous".
    !schema?.classification ||
    schema?.classification === "anonymous" ||
    // Nothing to test against.
    // If no consent is specified it is assumed that we are _not_ acting on behalf of a tracker.
    !test
  ) {
    return true;
  }

  if (
    dataClassification.ranks[schema.classification || DEFAULT_CLASSIFICATION] >
    dataClassification.ranks[test.classification || DEFAULT_CLASSIFICATION]
  ) {
    // Classification is too high.
    return false;
  }

  return validateConsentPurposes(schema.purposes, test.purposes, options);
};

export const validateConsentPurposes = (
  schema: DataPurposes = DEFAULT_PURPOSES,
  test: DataPurposes = DEFAULT_PURPOSES,
  {
    targetPurpose,
    intersect,
    personalization,
    security,
  }: ConsentValidationOptions = {}
) => {
  if (targetPurpose && !(test[targetPurpose] && schema[targetPurpose])) {
    // Target purpose is not mentioned as a purpose for the data in the schema and/or there is no consent for the purpose.
    return false;
  }

  // Do we match at least one purpose?
  const hasOne =
    (schema.necessary && test.functionality) ||
    (schema.functionality && test.functionality) ||
    (schema.marketing && test.marketing) ||
    (schema.performance && test.performance) ||
    (schema.personalization &&
      (personalization ? test.personalization : test.functionality)) ||
    (schema.security && (security ? test.security : test.necessary));

  if (!hasOne || !intersect) {
    return true;
  }

  // Only accept if the schema also has no other purposes than those tested against.
  return (
    (!schema.necessary || (schema.necessary && test.necessary)) &&
    (!schema.functionality || (schema.functionality && test.functionality)) &&
    (!schema.marketing || (schema.marketing && test.marketing)) &&
    (!schema.performance || (schema.performance && test.performance)) &&
    (!schema.personalization ||
      (schema.personalization &&
        (personalization ? test.personalization : test.functionality))) &&
    (!schema.security ||
      (schema.security && (security ? test.security : test.necessary)))
  );
};

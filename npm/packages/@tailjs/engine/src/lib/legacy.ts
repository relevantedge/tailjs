import { DataClassification, DataPurposes, DataUsage } from "@tailjs/types";

const LegacyClassifications: DataClassification[] = [
  "anonymous",
  "indirect",
  "direct",
  "sensitive",
];

const LegacyPurposes = {
  Functionality: 2,

  Performance: 4,

  Targeting: 8,
};

export const tryConvertLegacyConsent = (
  consent: string | null | undefined
): DataUsage | undefined => {
  const match = consent?.match(/^(\d*)@(\d*)$/);
  if (!match) {
    return undefined;
  }

  const classification: DataClassification =
    LegacyClassifications[+(match[2] || 0)];
  const purposeFlags = +(match[1] || 0);
  const purposes: DataPurposes = {
    performance: (purposeFlags & LegacyPurposes.Performance) > 0,
    functionality: (purposeFlags & LegacyPurposes.Functionality) > 0,
    marketing: (purposeFlags & LegacyPurposes.Targeting) > 0,
  };
  purposes.personalization = purposes.performance;
  purposes.security = true;

  return {
    classification,
    purposes,
  };
};

export const tryConvertLegacyDeviceVariable = (
  values: any[]
): [string, string, any] | undefined => {
  if (values.length > 3) {
    return [values[0], values[2], values[3]];
  }
};

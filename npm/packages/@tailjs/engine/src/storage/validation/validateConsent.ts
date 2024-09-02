import {
  dataClassification,
  DataUsage,
  NECESSARY_CONSENT,
} from "@tailjs/types";
import type { AllRequired } from "@tailjs/util";

export const validateConsent = (
  target?: DataUsage,
  consent?: DataUsage,
  defaultConsent?: DataUsage
) => {
  let tp = target?.purposes!;
  let dp = defaultConsent?.purposes;
  let cp = consent?.purposes ?? dp;
  if ((cp?.necessary ?? dp?.necessary) === false || tp.necessary === false) {
    // We do literally never want anything.
    return false;
  }

  if (
    dataClassification.compare(
      consent?.classification ?? defaultConsent?.classification ?? 0,
      target?.classification ?? 0
    ) < 0
  ) {
    // Classification is not high enough.
    return false;
  }

  if (tp == null || cp == null) {
    // No requirements.
    return true;
  }

  dp ??= cp;

  // Check against each purpose. If required by target, it must be in the consent or the default consent.
  return (
    !tp.performance ||
    (cp.performance ?? dp.performance) ||
    !tp.functionality ||
    (cp.functionality ?? dp.functionality) ||
    !tp.marketing ||
    (cp.marketing ?? dp.marketing) ||
    !tp.personalization ||
    (cp.personalization ?? dp.personalization) ||
    !tp.security ||
    (cp.security ?? dp.security)
  );
};

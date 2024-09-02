import { AllRequired } from "@tailjs/util";
import { DataUsage } from ".";

export interface UserConsent extends DataUsage {}

export const NECESSARY_CONSENT: AllRequired<UserConsent> = Object.freeze({
  classification: "anonymous",
  purposes: {
    necessary: true,
    functionality: false,
    marketing: false,
    performance: false,
    personalization: false,
    security: true,
  },
});

export const FULL_CONSENT: AllRequired<UserConsent> = Object.freeze({
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

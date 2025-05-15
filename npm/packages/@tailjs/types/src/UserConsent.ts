import { DataUsage } from ".";

export interface UserConsent extends DataUsage {
  /** Where the consent comes from (typically Google Consent Mode v2 via a cookie consent screen). */
  source?: string;
}

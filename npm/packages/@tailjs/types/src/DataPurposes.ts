import { array, isArray, isString, Nullish } from "@tailjs/util";

export type DataPurposeName = keyof DataPurposes;
export const DATA_PURPOSES: DataPurposeName[] = [
  "necessary",
  "performance",
  "functionality",
  "marketing",
  "personalization",
  "security",
];

export const getDataPurposeNames = (
  purposes: DataPurposes | undefined
): DataPurposeName[] => {
  const names: any[] = [];
  if (!purposes) return names;
  for (const key in purposes) {
    purposes[key] && names.push(key);
  }

  return names;
};

export const parseDataPurposes = <
  T extends DataPurposeName | DataPurposeName[] | DataPurposes | Nullish
>(
  purposeNames: T
): T extends Nullish ? undefined : DataPurposes => {
  if (purposeNames == null) return undefined!;
  if (!isArray(purposeNames)) {
    if (!isString(purposeNames)) {
      return purposeNames as any;
    }
    purposeNames = [purposeNames] as any;
  }

  const purposes: DataPurposes = {};
  for (const name of purposeNames as any) {
    purposes[name as any] = true;
  }
  return purposes as any;
};

/**
 * The purposes data can be used for.
 * Non-necessary data requires an individual's consent to be collected and used.
 *
 * Data categorized as "anonymous" will be stored regardless of consent since a consent only relates
 * to "personal data", and anonymous data is just "data".
 *
 * Whether the two purposes "personalization" and "security" are considered separate purposes
 * is configurable. The default is to consider "personalization" the same as "functionality", and
 * "security" the same as "necessary".
 */
export interface DataPurposes {
  /**
   *
   * This purpose cannot be removed from a consent. If the intention is to not store data
   * for a specific individual, use the data classification "never" instead.
   *
   * Even necessary data will only be stored if its general data classification is compatible with the current consent.
   *
   * In schema definitions the data is assumed necessary if no other purposes are specified.
   * It is also possible to mark data as necessary in combination with other purposes.
   * This means the data needs to be there for a genuinely necessary purpose, but may optionally
   * _also_ be used for, say, personalization if the user has consented to their data being stored for this purpose.
   *
   * Even if stored for other purposes, data cannot be read and used for a purpose without consent.
   */
  necessary?: boolean;

  /**
   * Data stored for this purpose is used to gain insights on how individuals interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  performance?: boolean;

  /**
   * Data stored for this purpose is used for settings that adjust the appearance of a website or app
   * according to an individual's preferences such as "dark mode" or localization of date and number formatting.
   *
   * Depending on your configuration, a functionality consent may also include personalization.
   * Personalization such as suggested articles and videos is per definition functionality,
   * but a special subcategory may be used to make the distinction between profile settings
   * and behavioral history depending on your requirements.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Marketing} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product, brand or service, hence
   * the information is still "first party" with respect to the legal entity/brand to whom the consent is made.
   *
   * This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  functionality?: boolean;

  /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * When tagging data points in a schema it is good practice to also specify whether the data is related to
   * performance, functionality or both
   *
   * If the data is only used for different websites and apps that relate to the same product or service that belongs to your brand,
   * it might not be necessary to use this category.
   */
  marketing?: boolean;

  /**
   * Personalization is a special subcategory of functionality data that is
   * for things such as recommending articles and videos.
   * This purpose is per default synonymous with {@link DataPurposes.functionality}, but can be configured to be a separate purpose
   * that requires its own consent.
   */
  personalization?: boolean;

  /**
   * Data stored for this purpose is related to security such as authentication, fraud prevention, and other user protection.
   *
   * This purpose is per default synonymous with {@link DataPurposes.essential} but can be configured to be a separate purpose
   * that requires its own consent.
   */
  security?: boolean;
}

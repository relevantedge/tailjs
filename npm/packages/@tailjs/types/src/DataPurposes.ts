import {
  fromEntries,
  isArray,
  isString,
  Nullish,
  throwError,
} from "@tailjs/util";

export type DataPurposeName = keyof DataPurposes;
export const DATA_PURPOSES: DataPurposeName[] = [
  "necessary",
  "performance",
  "functionality",
  "marketing",
  "personalization",
  "security",
];

const VALID_PURPOSE_NAMES = fromEntries(
  DATA_PURPOSES.map((purpose) => [purpose, purpose])
);

export const DATA_PURPOSES_ALL: DataPurposes = Object.freeze(
  fromEntries(DATA_PURPOSES.map((purpose) => [purpose, true]))
);

/**
 * Compares whether a consent is sufficient for a set of target purposes, or whether
 * a filter matches all the purposes in a target.
 *
 * @param target The target to validate the consent against.
 * @param test The set of allowed purposes in either a consent or filter.
 * @param intersect  Whether the target must have all the purposes in the consent, and no other purposes than those.
 *  This is used for purging data when a consent is updated.
 *  If data is only stored for purposes that are no longer included in the consent, it must be deleted. Conversely, it may be kept
 *  if just one of its purposes are still valid.
 *
 *  The default is "normal" consent validation which only requires the target to have one purpose with consent (or no required purposes).
 *
 *  @default false
 * @returns
 */
export const testPurposes = (
  target: DataPurposes,
  test: DataPurposes,
  intersect = false
) => {
  if (intersect) {
    for (const purpose in test) {
      if (test[purpose] && !target[purpose]) {
        // At least one purpose in the consent is not present in the target.
        return false;
      }
    }
    for (const purpose in target) {
      if (target[purpose] && !test[purpose]) {
        // The target has a purpose that is not included in the consent.
        return false;
      }
    }

    return true;
  }
  let hasAny = false;
  for (const purpose in target) {
    if (target[purpose]) {
      if (test[purpose]) {
        // Just one of the purposes is good enough.
        return true;
      }
      hasAny = true;
    }
  }
  // The target has at least one required purpose, and the consent does not include any.
  return !hasAny;
};

export const dataPurposes: {
  <
    T extends string | string[] | DataPurposes | Nullish,
    Names extends boolean = false
  >(
    value: T,
    names?: Names
  ): T extends Nullish
    ? undefined
    : Names extends true
    ? DataPurposeName[]
    : DataPurposes;

  names: DataPurposeName[];
} = Object.assign(
  (value: any, names: boolean = false): any => {
    if (value == null) return undefined!;
    if (isString(value)) {
      value = [value] as any;
    }
    if (isArray(value)) {
      const purposes: DataPurposes = {};
      for (const name of value as any) {
        if (!VALID_PURPOSE_NAMES[name]) continue;
        purposes[name as any] = true;
      }
      value = purposes as any;
    }

    return names ? Object.keys(value as any) : (value as any);
  },
  { names: DATA_PURPOSES }
);

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
  T extends string | string[] | DataPurposes | Nullish
>(
  purposeNames: T,
  validate = true
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
    if (!VALID_PURPOSE_NAMES[name]) {
      validate && throwError(`The purpose name '${name}' is not defined.`);
      continue;
    }
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

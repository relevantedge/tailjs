import {
  fromEntries,
  isArray,
  isString,
  keys2,
  Nullish,
  obj2,
  throwError,
} from "@tailjs/util";
import { DataUsage } from "./DataUsage";

export type DataPurposeName = keyof DataPurposes | "necessary";
export const DATA_PURPOSES: DataPurposeName[] = [
  "necessary",
  "performance",
  "functionality",
  "marketing",
  "personalization",
  "security",
];

const VALID_PURPOSE_NAMES = obj2(DATA_PURPOSES, (purpose) => [
  purpose,
  purpose,
]);

export const DATA_PURPOSES_ALL: DataPurposes = Object.freeze(
  fromEntries(DATA_PURPOSES.map((purpose) => [purpose, true]))
);

/**
 * Optional purposes that must be treated separately.
 */
export interface OptionalPurposes {
  /**
   * Consider the security purpose different from "necessary".
   * @default false
   */
  security: boolean;

  /**
   * Consider the personalization purpose different from "functionality".
   * @default false
   */
  personalization: boolean;
}

const mapOptionalPurpose: {
  <T extends string | Nullish>(
    purpose: T,
    optionalPurposes: OptionalPurposes | Nullish
  ): T extends Nullish ? T : DataPurposeName;
} = (purpose, optionalPurposes): any =>
  purpose === "personalization" && optionalPurposes?.personalization !== true
    ? "functionality"
    : purpose === "security" && optionalPurposes?.security !== true
    ? "necessary"
    : purpose;

const mapOptionalPurposes: {
  (
    purposes: DataPurposes,
    optionalPurposes: OptionalPurposes | Nullish
  ): DataPurposes;
} = (purposes, optionalPurposes) => {
  let mappedPurposes = purposes;
  if (
    optionalPurposes?.personalization !== true &&
    mappedPurposes.personalization != null
  ) {
    mappedPurposes === purposes && (mappedPurposes = { ...purposes });
    if (mappedPurposes.functionality != null) {
      mappedPurposes.personalization = mappedPurposes.functionality;
    } else {
      mappedPurposes.functionality = mappedPurposes.personalization;
    }
    delete mappedPurposes.personalization;
  }
  if (optionalPurposes?.security !== true && mappedPurposes.security != null) {
    mappedPurposes === purposes && (mappedPurposes = { ...purposes });

    delete mappedPurposes.security;
  }

  return mappedPurposes;
};

export interface PurposeTestOptions {
  intersect?: "some" | "all" | false;
  targetPurpose?: DataPurposeName;
  optionalPurposes?: OptionalPurposes;
}

export const dataPurposes: {
  <
    T extends string | string[] | DataPurposes | DataUsage | Nullish,
    Names extends boolean = false
  >(
    value: T,
    options?: { names?: Names; validate?: boolean }
  ): T extends Nullish
    ? T
    : Names extends true
    ? DataPurposeName[]
    : DataPurposes;

  /**
   * Compares whether a consent is sufficient for a set of target purposes, or whether
   * a filter matches all the purposes in a target.
   *
   * @param target The target to validate the consent against.
   * @param test The set of allowed purposes in either a consent or filter.
   * @param options Options for how to test.
   *
   *  The default is "normal" consent validation which only requires the target to have one purpose with consent (or no required purposes).
   *
   */
  test(
    target: DataPurposes,
    test: DataPurposes,
    options?: PurposeTestOptions
  ): boolean;

  names: DataPurposeName[];
} = Object.assign(
  (value: any, { names = false, validate = true } = {}) => {
    if (value == null) return value;
    if (value.purposes) {
      // From DataUsage
      value = value.purposes;
    }

    if (isString(value)) {
      value = value.split(",");
    }
    if (isArray(value)) {
      const purposes: DataPurposes = {};
      for (const name of value as any) {
        if (!VALID_PURPOSE_NAMES[name]) {
          validate && throwError(`The purpose name '${name}' is not defined.`);
          continue;
        } else if (name !== "necessary") {
          purposes[name as any] = true;
        }
      }
      value = purposes;
    }

    if (names) {
      const result = keys2(value);
      return result.length ? result : ["necessary"];
    }
    return value;
  },
  {
    names: DATA_PURPOSES,
    test(
      target: DataPurposes,
      test: DataPurposes,
      { intersect, optionalPurposes, targetPurpose }: PurposeTestOptions
    ) {
      if (
        targetPurpose &&
        (targetPurpose = mapOptionalPurpose(
          targetPurpose,
          optionalPurposes
        )) !== "necessary" &&
        !test[mapOptionalPurpose(targetPurpose, optionalPurposes)]
      ) {
        return false;
      }

      target = mapOptionalPurposes(target, optionalPurposes);
      test = mapOptionalPurposes(test, optionalPurposes);

      if (intersect) {
        for (let purpose in test) {
          if (test[purpose] && !target[purpose]) {
            // At least one purpose in the consent is not present in the target.
            return false;
          }
        }

        if (intersect === "all") {
          for (let purpose in target) {
            if (target[purpose] && !test[purpose]) {
              // The target has a purpose that is not included in the consent.
              return false;
            }
          }
        }

        return true;
      }

      let hasAny = false;
      for (let purpose in target) {
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
    },
  }
);

//
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

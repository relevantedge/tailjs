import { LabeledValue, createLabelParser, map } from "@tailjs/util";

export type DataPurposeLabel = "necessary" | keyof DataPurposes;

/**
 * Defines the purposes data points will be used for in a schema,
 * and similarly which data points may be stored for a user given their consent.
 *
 * Essential "consent" is always implied.
 * Data-points that are categorized as "anonymous" will also be stored
 * regardless of consent.
 */
export interface DataPurposes {
  /**
   * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  performance?: boolean;

  /**
   * Data stored for this purpose is used for settings that adjust the appearance of a website or app
   * according to a user's preferences such as "dark mode" or localization of date and number formatting.
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
   * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
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

export type DataPurposeValue = LabeledValue<DataPurposes, DataPurposeLabel>;

export const dataPurposes = createLabelParser<
  DataPurposes,
  DataPurposeLabel,
  true
>(
  "data purpose",
  true,
  {
    necessary: (value) => value,
    performance: (value) => (value.performance = true),
    functionality: (value) => (value.functionality = true),
    marketing: (value) => (value.marketing = true),
    personalization: (value) => (value.personalization = true),
    security: (value) => (value.security = true),
  },
  (value) => {
    const mapped = map(value, ([key, value]) => value && key);
    return mapped.length ? mapped : ["necessary"];
  }
);

// /** Purposes data can be used for, including combinations of {@link DataPurpose} */
// export enum DataPurposeFlags {
//   /** Data without a purpose will not get stored and cannot be used for any reason. This can be used to disable parts of a schema. */
//   None = 0,

//   /**
//    * These cookies are required for basic functionality, and ensure that essential services work properly.
//    * For example, tail.js does not work without the ID fields on events.
//    *
//    * No active consent is needed for necessary cookies.
//    *
//    */
//   Necessary = 1,

//   /**
//    * Data stored for this purpose is used for settings that adjust the appearance of a website or app
//    * according to a user's preferences such as "dark mode" or localization of date and number formatting.
//    *
//    * It may also be used for personalization.
//    *
//    * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
//    * of the website or app. Use {@link DataPurposeFlags.Marketing} instead.
//    *
//    * It may be okay if the data is only used for different website and apps that relate to the same product, brand or service, hence
//    * the information is still "first party" with respect to the legal entity/brand to whom the consent is made.
//    *
//    * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
//    * also be distributed across multiple domain names.
//    *
//    */
//   Functionality = 2,

//   /**
//    * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
//    * demographics and similar traits with the purpose of optimizing the website or app.
//    *
//    * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
//    * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
//    *
//    * It may be okay if the data is only used for different website and apps that relate to the same product or service.
//    * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
//    * also be distributed across multiple domain names.
//    *
//    */
//   Performance = 4,

//   /**
//    * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
//    * or otherwise used to perform marketing outside the scope of the specific website or app.
//    *
//    * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
//    * to use this category.
//    * This would be the case if a user is able to use an app and website interchangeably for the same service. Different areas of a brand may
//    * also be distributed across multiple domain names.
//    */
//   Targeting = 8,

//   /**
//    * Data stored for this purpose is used for security purposes. As examples, this can both be data related to securing an authenticated user's session,
//    * or for a website to guard itself against various kinds of attacks.
//    *
//    * This is implicitly also `Necessary`.
//    */
//   Security = 16,
// }

// export type DataPurpose =
//   | DataPurposeFlags.Necessary
//   | DataPurposeFlags.Functionality
//   | DataPurposeFlags.Performance
//   | DataPurposeFlags.Targeting;

// const purePurposes: DataPurpose =
//   DataPurposeFlags.Necessary |
//   DataPurposeFlags.Functionality |
//   DataPurposeFlags.Performance |
//   DataPurposeFlags.Targeting |
//   DataPurposeFlags.Security;

// export const dataPurposes = createEnumAccessor(
//   DataPurposeFlags as typeof DataPurposeFlags,
//   true,
//   "data purpose",
//   purePurposes
// );

// export const singleDataPurpose = createEnumAccessor(
//   DataPurposeFlags as typeof DataPurposeFlags,
//   false,
//   "data purpose",
//   0
// );

// export type DataPurposeValue<Numeric = boolean> = EnumValue<
//   typeof DataPurposeFlags,
//   DataPurposeFlags,
//   true,
//   Numeric
// >;

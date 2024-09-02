/**
 * Defines the purposes data points will be used for in a schema,
 * and similarly which data points may be stored for (natural) individuals given their consent.
 *
 * Data-points that are categorized as "anonymous" will also be stored regardless of consent.
 */
export interface DataPurposes {
  /**
   * If this is explicitly disabled in a consent, no data will be collected for the individual.
   * This overrides any other purpose set in the consent.
   *
   * Likewise, if this is disabled a schema definition, that part of the schema will not be used.
   * This can be used to conditionally disable parts of the schema without deleting it.
   *
   * @default true
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

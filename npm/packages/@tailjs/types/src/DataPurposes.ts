import { ParsableEnumValue, createEnumAccessor } from "@tailjs/util";

export const enum DataPurposes {
  /**
   * Data stored for this purpose is vital for the system, website or app to function.
   */
  Necessary = 1 << 0,

  /**
   * Data stored for this purpose is used for personalization or otherwise adjust the appearance of a website or app
   * according to a user's preferences.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposes.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  Functionality = 1 << 1,

  /**
   * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposes.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  Performance = 1 << 2,

  /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
   * to use this category.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   */
  Targeting = 1 << 3,

  /**
   * Data stored for this purpose is used for security purposes. As examples, this can both be data related to securing an authenticated user's session,
   * or for a website to guard itself against various kinds of attacks.
   */
  Security = 1 << 4,

  /**
   * Data stored for this purpose may be similar to the performance category, however it is specifically
   * only used for things such as health monitoring, performance, scaling and error logging unrelated to user behavior.
   */
  Infrastructure = 1 << 5,
}

const purposes = {
  necessary: DataPurposes.Necessary,
  functionality: DataPurposes.Functionality,
  performance: DataPurposes.Performance,
  targeting: DataPurposes.Targeting,
  security: DataPurposes.Security,
  infrastructure: DataPurposes.Infrastructure,
} as const;

export const dataPurposes = createEnumAccessor(purposes, true, "data purpose");
export const dataPurpose = createEnumAccessor(purposes, false, "data purpose");

export type DataPurposeValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<typeof purposes, Numeric, true>;

export type SingleDataPurposeValue<
  Numeric extends boolean | undefined = boolean
> = ParsableEnumValue<typeof purposes, Numeric, false>;

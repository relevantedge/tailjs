import { ParsableEnumValue, createEnumAccessor } from "@tailjs/util";

// Grrr... We need to write out the calculated numbers for each enum value. Otherwise stupid JSON schema generator won't work.

/** Purposes data can be used for, including combinations of {@link DataPurpose} */
export enum DataPurposeFlags {
  /** Data without a purpose will not get stored and cannot be used for any reason. This can be used to disable parts of a schema. */
  None = 0,

  /**
   * Data stored for this purpose is vital for the system, website or app to function.
   */
  Necessary = 1,

  /**
   * Data stored for this purpose is used for personalization or otherwise adjust the appearance of a website or app
   * according to a user's preferences.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  Functionality = 2,

  /**
   * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */
  Performance = 4,

  /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
   * to use this category.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   */
  Targeting = 8,

  /**
   * Data stored for this purpose is used for security purposes. As examples, this can both be data related to securing an authenticated user's session,
   * or for a website to guard itself against various kinds of attacks.
   *
   * This is implicitly also `Necessary`.
   */
  Security = 16,

  /**
   * Data stored for this purpose may be similar to the performance category, however it is specifically
   * only used for things such as health monitoring, system performance and error logging and unrelated to user behavior.
   *
   * This is implicitly also `Necessary`.
   */
  Infrastructure = 32,

  /**
   * All purposes that are permissable for anonymous users.
   */
  Anonymous = 49, //DataPurposes.Necessary | DataPurposes.Infrastructure | DataPurposes.Security,

  /**
   * Data can be used for any purpose.
   */
  Any = 63,
}

export type DataPurpose =
  | DataPurposeFlags.Necessary
  | DataPurposeFlags.Functionality
  | DataPurposeFlags.Performance
  | DataPurposeFlags.Targeting
  | DataPurposeFlags.Security
  | DataPurposeFlags.Infrastructure;

const purePurposes: DataPurpose =
  DataPurposeFlags.Necessary |
  DataPurposeFlags.Functionality |
  DataPurposeFlags.Performance |
  DataPurposeFlags.Targeting |
  DataPurposeFlags.Security |
  DataPurposeFlags.Infrastructure;

export const dataPurposes = createEnumAccessor(
  DataPurposeFlags as typeof DataPurposeFlags,
  true,
  "data purpose",
  purePurposes
);

export const singleDataPurpose = createEnumAccessor(
  DataPurposeFlags as typeof DataPurposeFlags,
  false,
  "data purpose"
);

export type DataPurposeValue<Numeric = boolean> = ParsableEnumValue<
  typeof DataPurposeFlags,
  Numeric,
  true,
  DataPurposeFlags
> extends infer T
  ? T
  : never;

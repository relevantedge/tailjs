import { EnumValue, Nullish, createEnumAccessor, isNumber } from "@tailjs/util";
import { DataPurposeFlags, DataPurposeValue, dataPurposes } from ".";

/**
 * Defines to which extend a piece of information relates to a natural person (user of your app or website).
 *
 * Tail.js requires all data points (data types and their properties) to be classified to prevent any data from being stored or otherwise used beyond a user's consent.
 *
 * YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
 *
 */
export enum DataClassification {
  /**
   * The data cannot reasonably be linked to a specific user after the user leaves the website or app, and their session ends.
   *
   * Tail.js will collect this kind of data in a way that does not use cookies or rely on other information persisted in the user's device.
   *
   * Identifying returning visitors will not be possible at this level.
   * In-session personalization will be possible based on the actions a user has taken such as adding or removing things to a shopping basket, or reading an article.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */
  Anonymous = 0,

  /**
   * The data may possibly identify the user if put into context with other data, yet not specifically on its own.
   *
   * Examples of data you should classify as at least indirect personal data are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   *
   * Identifying returning visitors will be possible at this level of consent, but not across devices.
   * Some level of personalization to returning visitors will be possible without knowing their specific preferences with certainty.
   *
   * This level is the default when a user has consented to necessary information being collected via a  cookie disclaimer or similar.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */
  Indirect = 1,

  /**
   * The data directly identifies the user on its own.
   *
   * Examples are name, username, street address and email address.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * Personalization based on past actions such as purchases will also be possible.
   *
   * This level is the default should be considered the default level if users are offered an option to create a user profile or link an existing user profile from an external identity provider (Google, GitHub, Microsoft etc.).
   *
   * Please note it is possible to access user data even when nothing is tracked beyond the bla... level
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  Direct = 2,

  /**
   * Sensitive data about a user.
   *
   * Examples are data related to health, financial matters, race, political and religious views, and union membership.
   * If the user is given the option to consent at this level, it should be very clear, and you must make sure that all levels of your tail.js implementation and connected services meets the necessary levels of compliance for this in your infrastructure.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * and so will advanced personalization.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */
  Sensitive = 3,
}

export const dataClassification = createEnumAccessor(
  DataClassification,
  false,
  "data classification"
);

export type DataClassificationValue<Numeric = boolean> = EnumValue<
  typeof DataClassification,
  DataClassification,
  false,
  Numeric
> extends infer T
  ? T
  : never;

export type DataUsageAttributes<NumericEnums = true> = {
  classification: DataClassificationValue<NumericEnums>;
  purposes: DataPurposeValue<NumericEnums>;
};

export type ParsableDataUsageAttributes = {
  classification?: DataClassificationValue;
  level?: DataClassificationValue;
  purpose?: DataPurposeValue;
  purposes?: DataPurposeValue;
};

export const dataUsageEquals = (
  lhs: ParsableDataUsageAttributes | Nullish,
  rhs: ParsableDataUsageAttributes | Nullish
) =>
  dataClassification.parse(lhs?.classification ?? lhs?.level) ===
    dataClassification.parse(rhs?.classification ?? rhs?.level) &&
  dataPurposes.parse(lhs?.purposes ?? lhs?.purposes) ===
    dataPurposes.parse(rhs?.purposes ?? rhs?.purposes);

export const parseDataUsage = <T extends ParsableDataUsageAttributes | Nullish>(
  classificationOrConsent: T,
  defaults?: Partial<DataUsageAttributes<boolean>>
): T extends {}
  ? DataUsageAttributes<true> & Omit<T, keyof ParsableDataUsageAttributes>
  : undefined =>
  classificationOrConsent == null
    ? (undefined as any)
    : isNumber(classificationOrConsent.classification) &&
      isNumber(classificationOrConsent.purposes)
    ? classificationOrConsent
    : {
        ...classificationOrConsent,
        level: undefined,
        purpose: undefined,
        classification: dataClassification.parse(
          classificationOrConsent.classification ??
            classificationOrConsent.level ??
            defaults?.classification ??
            DataClassification.Anonymous
        ),
        purposes: dataPurposes.parse(
          classificationOrConsent.purposes ??
            classificationOrConsent.purpose ??
            defaults?.purposes ??
            DataPurposeFlags.Necessary
        ),
      };

import { createEnumParser } from "@tailjs/util";

/**
 * Defines to which extend a piece of information relates to a natural individual which is typically someone visiting your app or website.
 *
 * Tail.js requires all data that can be collected to be classified to prevent any data from being stored or otherwise used beyond
 * an individual's consent.
 *
 * Be aware that de default settings in the tail.js schema *do not* guarantee legal compliance, and you are responsible
 * for not using the collected data for other purposes than those intended.
 *
 */
export type DataClassification =
  /**
   * A "consent" for this data classification means that no data will be stored for any reason.
   *
   * Likewise, if used in a schema all data with this classification will not be stored.
   */
  | "never"

  /**
   * The data cannot be linked to a specific individual after they leave the website or app, and their session ends.
   *
   * This does _not_ include seemingly anonymous data such as the hash of an IP address, since that may still be linked back
   * to an individual using "additional information". As an example, if you want to test if a specific person visited a website at a given time
   * and you know their IP address at that time by some other means, you can generate a hash with the same algorithm and see if it is
   * in the data.
   *
   * Tail.js will collect this kind of data in a way that does not use cookies or other information persisted in the individual's device. */
  | "anonymous"

  /**
   * The data is unlikely to identify an individual by itself, but may link to a specific individual if combined with other data.
   *
   * Examples are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   */
  | "indirect"

  /**
   * The data directly identifies a specific individual.
   *
   * Examples are names, email addresses, user names, customer IDs from a CRM system or order numbers that can be linked
   * to another system where the persons details are available.
   */
  | "direct"

  /**
   * Not only does the data identify a specific individual but may also reveal sensitive information about the user
   * such as health data, financial matters, race, political and religious views, or union membership.
   *
   * tail.js's default schema does not have any data with this classification. If you intend to capture sensitive data in your events
   * you may consider pseudonomizing it by hashing it or obfuscating it by some other mechanism.
   * Whether the data will then classify as "indirect" or still be "sensitive" depends on context, but it will arguably then be
   * "less sensitive".
   */
  | "sensitive";

export const dataClassification = createEnumParser<DataClassification>(
  "data classification",
  ["never", "anonymous", "indirect", "direct", "sensitive"]
);

// export type DataClassificationValue<Numeric = boolean> = EnumValue<
//   typeof DataClassification,
//   DataClassification,
//   false,
//   Numeric
// > extends infer T
//   ? T
//   : never;

// export type DataUsageAttributes<NumericEnums = true> = {
//   classification: DataClassificationValue<NumericEnums>;
//   purposes: DataPurposeValue<NumericEnums>;
// };

// export type ParsableDataUsageAttributes = {
//   classification?: DataClassificationValue;
//   level?: DataClassificationValue;
//   purpose?: DataPurposeValue;
//   purposes?: DataPurposeValue;
// };

// export const dataUsageEquals = (
//   lhs: ParsableDataUsageAttributes | Nullish,
//   rhs: ParsableDataUsageAttributes | Nullish
// ) =>
//   dataClassification.parse(lhs?.classification ?? lhs?.level) ===
//     dataClassification.parse(rhs?.classification ?? rhs?.level) &&
//   dataPurposes.parse(lhs?.purposes ?? lhs?.purposes) ===
//     dataPurposes.parse(rhs?.purposes ?? rhs?.purposes);

// export const parseDataUsage = <T extends ParsableDataUsageAttributes | Nullish>(
//   classificationOrConsent: T,
//   defaults?: Partial<DataUsageAttributes<boolean>>
// ): T extends {}
//   ? DataUsageAttributes<true> & Omit<T, keyof ParsableDataUsageAttributes>
//   : undefined =>
//   classificationOrConsent == null
//     ? (undefined as any)
//     : isNumber(classificationOrConsent.classification) &&
//       isNumber(classificationOrConsent.purposes)
//     ? classificationOrConsent
//     : {
//         ...classificationOrConsent,
//         level: undefined,
//         purpose: undefined,
//         classification: dataClassification.parse(
//           classificationOrConsent.classification ??
//             classificationOrConsent.level ??
//             defaults?.classification ??
//             DataClassification.Anonymous
//         ),
//         purposes: dataPurposes.parse(
//           classificationOrConsent.purposes ??
//             classificationOrConsent.purpose ??
//             defaults?.purposes ??
//             DataPurposeFlags.Necessary
//         ),
//       };

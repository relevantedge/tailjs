import {
  EnumValue,
  Nullish,
  createEnumAccessor,
  fromEntries,
  isNumber,
  quote,
  throwError,
} from "@tailjs/util";
import { DataPurposeValue, dataPurposes } from ".";

/**
 * Defines to which extend a piece of information relates to a natural person (user of your app or website).
 *
 * Tail.js requires all data points (data types and their properties) to be classified to prevent any data from being stored or otherwise used beyond a user's consent.
 *
 * YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
 *
 */
export type DataClassification =
  /**
   * The data cannot be linked to a specific individual after they leave the website or app, and their session ends.
   *
   * This does NOT include seemingly anonymous data such as the hash of an IP address, since that may still be linked back
   * to an individual using "additional information". As an example, if you want to test if a specific person visited a website at a given time
   * and you know their IP address at that time by some other means, you can generate the same hash and see if it is there.
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

export const labels: readonly DataClassification[] = [
  "anonymous",
  "indirect",
  "direct",
  "sensitive",
];

const validClassifications = fromEntries(labels.map((key) => [key, key]));

export const dataClassification: {
  <T extends DataClassification | (string & {}) | Nullish>(
    value: T
  ): T extends Nullish ? undefined : DataClassification;

  readonly labels: readonly DataClassification[];
} = Object.assign(
  (value: any) =>
    value == null
      ? undefined
      : ((validClassifications[value] ??
          throwError(
            `The data classification '${quote(value)}' is not defined.`
          )) as any),
  { labels }
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

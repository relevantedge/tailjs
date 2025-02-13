import { Falsish, isArray, throwError } from "@tailjs/util";
import {
  DATA_PURPOSES_ALL,
  DataAccess,
  DataClassification,
  DataPurposeName,
  DataPurposes,
  DataUsage,
  DataVisibility,
} from "../..";

export const SCHEMA_DATA_USAGE_ANONYMOUS: SchemaDataUsage = Object.freeze({
  readonly: false,
  visibility: "public",
  classification: "anonymous",
  purposes: {},
});

/**
 * The most restrictive setting for all the attributes.
 */
export const SCHEMA_DATA_USAGE_MAX: SchemaDataUsage = Object.freeze({
  readonly: true,
  visibility: "trusted-only",
  classification: "sensitive",
  purposes: DATA_PURPOSES_ALL,
});

/**
 * The data usage for this type or property.
 * If only partially specified, missing attributes will be inherited in this way:
 * - A type declared directly in a schema inherits from types it extends in the order they are specified.
 *   That is, if the type does not have an attribute, the attribute will be inherited from the first extended type that has a value.
 * - A property inherits from its _originally_ declaring type. That means if a type overrides a property, the
 *   property will inherit the usage from the extended type, and not the current type.
 * - An embedded type inherits from its declaring property (the one that embeds it).
 *
 * If attributes are still missing they will be set from the schema that declares the type. Again, mind that
 * for properties this schema will be the schema of the _declaring_ type in case a type overrides a property from
 * another schema.
 */
export interface SchemaDataUsage extends DataUsage, DataAccess {}

export const parseSchemaDataUsageKeywords = <
  ForVariable extends boolean = false
>(
  keywords: string | (string | Falsish)[],
  forVariable: ForVariable = false as any
): SchemaDataUsage &
  (ForVariable extends true ? { dynamic?: boolean } : {}) => {
  if (!isArray(keywords)) {
    keywords = [keywords];
  }

  let matched:
    | DataVisibility
    | DataClassification
    | DataPurposeName
    | undefined;
  let purposeNames: string[] = [];

  const usage: Partial<SchemaDataUsage> & { dynamic?: boolean } = {};

  for (const keywordGroup of keywords) {
    if (!keywordGroup) continue;

    for (const keyword of isArray(keywordGroup)
      ? keywordGroup
      : keywordGroup.split(/[,\s]+/)) {
      if ((matched = DataClassification.parse(keyword, false))) {
        usage.classification = usage.classification
          ? throwError(
              `Data classification can only be specified once. It is already '${usage.classification}'`
            )
          : matched;
      } else if ((matched = DataVisibility.parse(keyword, false))) {
        usage.visibility = usage.visibility
          ? throwError(
              `Data visibility can only be specified once. It is already '${usage.visibility}'`
            )
          : matched;
      } else if (keyword === "readonly") {
        usage.readonly = keyword === "readonly";
      } else if (keyword === "dynamic") {
        if (forVariable) {
          usage.dynamic = true;
        } else {
          throwError("Dynamic access is only valid for variables.");
        }
      } else if (keyword !== "necessary") {
        // Don't include the default, that just gives an empty purposes object.
        purposeNames.push(keyword);
      }
    }
  }
  purposeNames.length && (usage.purposes = DataPurposes.parse(purposeNames));
  return usage as any;
};

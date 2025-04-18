import { Nullish, obj2 } from "@tailjs/util";
import {
  handleValidationErrors,
  pushInnerErrors,
  SchemaCensorFunction,
  SchemaValueValidator,
} from ".";
import {
  DataClassification,
  DataVisibility,
  SchemaDataUsage,
  SchemaPropertyType,
  validateConsent,
} from "../../../..";

export const getMinimumUsage = <T extends SchemaDataUsage | Nullish>(
  current: T,
  other: T | Nullish
): T =>
  current
    ? other
      ? {
          readonly: current.readonly && other.readonly,
          visibility:
            DataVisibility.ranks[current.visibility] <=
            DataVisibility.ranks[other.visibility]
              ? current.visibility
              : other.visibility,
          classification:
            DataClassification.ranks[current.classification] <=
            DataClassification.ranks[other.classification]
              ? current.classification
              : other.classification,
          purposes: obj2(current.purposes, ([key, value]) =>
            value && !other.purposes[key] ? undefined : [key, value]
          ),
        }
      : current
    : (other as any);

export const overrideUsage = <
  T extends undefined | Partial<SchemaDataUsage>,
  U extends undefined | Partial<SchemaDataUsage>
>(
  current: T,
  update: U
): T extends undefined ? (U extends undefined ? undefined : U) : T & U =>
  update
    ? current
      ? ({
          readonly: update.readonly ?? current.readonly,
          visibility: update.visibility ?? current.visibility,
          classification: update.classification ?? current.classification,
          purposes: update.purposes ?? current.purposes,
        } as any)
      : update
    : current;

export const createCensorAction =
  (
    usage: SchemaDataUsage | Nullish,
    type: { censor: SchemaCensorFunction }
  ): SchemaCensorFunction =>
  (value, context) =>
    !value || !usage
      ? type.censor(value, context)
      : !context.trusted && usage.visibility === "trusted-only"
      ? undefined
      : context.consent && !validateConsent(usage!, context.consent, context)
      ? undefined
      : type.censor(value, context);

export const createAccessValidator =
  (
    name: string,
    type: SchemaPropertyType,
    usage: SchemaDataUsage | Nullish,
    targetType = "property"
  ): SchemaValueValidator =>
  (value: any, current, context, errors) =>
    handleValidationErrors((errors) => {
      if (usage) {
        if (usage.readonly && current != null && value !== current) {
          errors.push({
            path: name,
            type,
            source: value,
            message: `The ${targetType} is read-only (cannot be changed once set).`,
            forbidden: true,
          });
        }
        if (
          !context.trusted &&
          usage.visibility !== "public" &&
          value !== current
        ) {
          errors.push({
            path: name,
            type,
            source: value,
            message: `The ${targetType} cannot be set from untrusted context.`,
            forbidden: true,
          });
        }
      }

      return pushInnerErrors(name, value, current, context, errors, type);
    }, errors);

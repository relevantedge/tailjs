import {
  dataClassification,
  dataVisibility,
  SchemaDataUsage,
} from "@tailjs/types";
import { fromEntries, Nullish } from "@tailjs/util";

export const getMinimumUsage = <T extends SchemaDataUsage | Nullish>(
  current: T,
  other: T
): T =>
  current
    ? other
      ? {
          readonly: current.readonly && other.readonly,
          visibility:
            dataVisibility.ranks[current.visibility] <=
            dataVisibility.ranks[other.visibility]
              ? current.visibility
              : other.visibility,
          classification:
            dataClassification.ranks[current.classification] <=
            dataClassification.ranks[other.classification]
              ? current.classification
              : other.classification,
          purposes: fromEntries(current.purposes, ([key, value]) =>
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

import type { SchemaDataUsage } from "@tailjs/types";

export const mergeUsage = (
  current: SchemaDataUsage | undefined,
  other: SchemaDataUsage | undefined
) => {
  if (current == null) {
    return other;
  }
  if (other == null) {
    return current;
  }

  if (other.access) {
    if (!current.access) {
      current = { ...current, access: other.access };
    } else if (other.access.readonly != null || other.access.visibility) {
      current = {
        ...current,
        access: {
          readonly: current.access.readonly ?? other.access.readonly,
          visibility: current.access.visibility ?? other.access.visibility,
        },
      };
    }
  }

  let currentUsage = current.consent;
  let otherUsage = other.consent;
  if (!currentUsage) {
    currentUsage = otherUsage;
  } else if (otherUsage) {
    if (!currentUsage.classification && otherUsage.classification) {
      currentUsage = {
        ...currentUsage,
        classification: otherUsage.classification,
      };
    }

    for (const key in otherUsage.purposes) {
      if (
        otherUsage.purposes[key] != null &&
        currentUsage.purposes?.[key] == null
      ) {
        if (currentUsage == current.consent) {
          currentUsage = { ...currentUsage };
        }
        currentUsage[key] = otherUsage.purposes[key];
      }
    }
  }
  if (currentUsage !== current.consent) {
    current = { ...current, consent: currentUsage };
  }

  return current;
};

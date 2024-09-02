import {
  dataClassification,
  dataVisibility,
  SchemaDataUsage,
} from "@tailjs/types";

export const getMinimumUsage = (
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
    let currentAccess = current.access;
    if (!currentAccess) {
      currentAccess = other.access;
    } else {
      if (currentAccess.readonly && other.access.readonly === false) {
        currentAccess = { ...currentAccess, readonly: false };
      }
      if (
        other.access.visibility &&
        (!currentAccess.visibility ||
          dataVisibility.compare(
            currentAccess.visibility,
            other.access.visibility
          ) > 0)
      ) {
        currentAccess = {
          ...currentAccess,
          visibility: other.access.visibility,
        };
      }
    }

    if (currentAccess !== current.access) {
      current = { ...current, access: currentAccess };
    }
  }

  let currentConsent = current.consent;
  let otherConsent = other.consent;
  if (otherConsent != null) {
    if (currentConsent == null) {
      current = { ...current, consent: { ...otherConsent } };
    } else {
      if (
        !currentConsent.classification ||
        (otherConsent.classification &&
          dataClassification.compare(
            currentConsent.classification,
            otherConsent.classification
          ) > 0)
      ) {
        // The other is less restrictive than us.
        currentConsent = {
          ...currentConsent,
          classification: otherConsent.classification,
        };
      }
      if (otherConsent.purposes) {
        if (!currentConsent.purposes) {
          currentConsent = {
            ...currentConsent,
            purposes: otherConsent.purposes,
          };
        } else {
          let minimumPurposes = currentConsent.purposes;
          for (const purpose in otherConsent.purposes) {
            if (purpose === "necessary") {
              // This flag may be used to disable a type or property, but does not count
              // when calculating the minimum required consent for a type since one property should not
              // disable the entire type.
              continue;
            }
            if (
              otherConsent.purposes[purpose] === false &&
              minimumPurposes[purpose]
            ) {
              if (minimumPurposes === currentConsent.purposes) {
                // We have it, but the other one doesn't. That means it is not required in the minimum.
                currentConsent = {
                  ...currentConsent,
                  purposes: (minimumPurposes = { ...minimumPurposes }),
                };
              }
              minimumPurposes[purpose] = false;
            }
          }
        }
      }
      if (currentConsent !== current.consent) {
        current = { ...current, consent: currentConsent };
      }
    }
  }

  return current;
};

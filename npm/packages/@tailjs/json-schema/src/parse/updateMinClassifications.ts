import { dataAccess, dataClassification, dataPurposes } from "@tailjs/types";
import { SchemaDataUsage } from "..";

export const updateMinClassifications = (
  typeUsage: SchemaDataUsage,
  apply: SchemaDataUsage
) => {
  typeUsage.classification = dataClassification.min(
    typeUsage.classification,
    apply.classification
  );

  typeUsage.purposes = dataPurposes.merge(typeUsage.purposes, apply.purposes);

  typeUsage.access ??= { readonly: apply.access?.readonly };
  typeUsage.access.readonly &&
    !apply.access?.readonly &&
    delete typeUsage.access.readonly;
  typeUsage.access.restriction = dataAccess.restrictions.min(
    typeUsage.access.restriction ?? 0,
    apply.access?.restriction ?? 0
  );
};

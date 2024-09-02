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
  typeUsage.access.visibility = dataAccess.restrictions.min(
    typeUsage.access.visibility ?? 0,
    apply.access?.visibility ?? 0
  );
};

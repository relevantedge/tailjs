import { isDefined } from "@tailjs/util";
export const updateMinClassifications = (type, classifications) => {
    if (isDefined(classifications.classification)) {
        type.classification = Math.min(type.classification ?? classifications.classification, classifications.classification);
    }
    if (isDefined(classifications.purposes)) {
        type.purposes = (type.purposes ?? 0) | classifications.purposes;
    }
    type.censorIgnore ??= classifications.censorIgnore;
};
//# sourceMappingURL=updateMinClassifications.js.map
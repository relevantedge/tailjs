import { dataClassification, dataPurposes, } from ".";
export const isUserConsent = (value) => !!value?.["level"];
export const validateConsent = (source, consent) => source &&
    dataClassification.parse(source.classification) <=
        dataClassification.parse(consent["classification"] ?? consent["level"], false) &&
    (source.classification === 0 ||
        ((dataPurposes.parse(source.purposes, false) ?? 0) &
            dataPurposes.parse(consent.purposes, false)) >
            0);
//# sourceMappingURL=UserConsent.js.map
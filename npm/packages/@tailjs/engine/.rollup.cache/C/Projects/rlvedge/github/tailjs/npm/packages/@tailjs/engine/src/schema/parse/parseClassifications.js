import { dataClassification, dataPurposes, } from "@tailjs/types";
import { isDefined } from "@tailjs/util";
import { parseError } from ".";
import { annotations } from "../..";
export const parseClassifications = (context) => {
    const node = context.node;
    let censorIgnore;
    if (isDefined(node[annotations.censor])) {
        censorIgnore = node[annotations.censor] === "ignore";
    }
    let privacyClass = node[annotations.classification];
    if (isDefined(node[annotations.purpose] ?? node[annotations.purposes])) {
        parseError(context, "x-privacy-purpose and x-privacy-purposes cannot be specified at the same time.");
    }
    let privacyPurposes = node[annotations.purpose] ?? node[annotations.purposes];
    let description = node.description
        ?.replace(/@privacy[: ]?(.+)/gm, (_, keywords) => {
        keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter((item) => item)
            .forEach((keyword) => {
            if (keyword === "censor_ignore" || keyword === "censor_include") {
                censorIgnore ??= keyword === "censor_ignore";
                return;
            }
            let parsed = dataPurposes.tryParse(keyword);
            if (isDefined(parsed)) {
                privacyPurposes = (privacyPurposes ?? 0) | parsed;
                return;
            }
            parsed = dataClassification.tryParse(keyword);
            if (isDefined(parsed)) {
                privacyClass ??= parsed;
                return;
            }
            parseError(context, `Unknown privacy keyword '${keyword}'.`);
        });
        return "";
    })
        .trim();
    if (!description?.length) {
        delete node.description;
    }
    censorIgnore ??= context.censorIgnore;
    if (censorIgnore) {
        privacyClass ??= 0 /* DataClassification.Anonymous */;
        privacyPurposes ??= -1 /* DataPurposes.Any */;
    }
    return {
        classification: dataClassification(privacyClass) ?? context.classification,
        purposes: dataPurposes(privacyPurposes) ?? context.purposes,
        censorIgnore,
    };
};
//# sourceMappingURL=parseClassifications.js.map
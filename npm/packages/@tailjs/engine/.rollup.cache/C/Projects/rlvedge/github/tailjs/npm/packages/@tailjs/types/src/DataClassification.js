import { createEnumAccessor } from "@tailjs/util";
const classifications = {
    anonymous: 0 /* DataClassification.Anonymous */,
    indirect: 1 /* DataClassification.Indirect */,
    direct: 2 /* DataClassification.Direct */,
    sensitive: 3 /* DataClassification.Sensitive */,
};
export const dataClassification = createEnumAccessor(classifications, false, "data classification");
//# sourceMappingURL=DataClassification.js.map
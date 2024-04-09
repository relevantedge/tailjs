import { createEnumAccessor, } from "@tailjs/util";
const purposes = {
    /**
     * {@link DataPurposes.Necessary}
     */
    necessary: 1 /* DataPurposes.Necessary */,
    functionality: 2 /* DataPurposes.Functionality */,
    performance: 4 /* DataPurposes.Performance */,
    targeting: 8 /* DataPurposes.Targeting */,
    security: 16 /* DataPurposes.Security */,
    infrastructure: 32 /* DataPurposes.Infrastructure */,
};
export const dataPurposes = createEnumAccessor(purposes, true, "data purpose");
export const dataPurpose = createEnumAccessor(purposes, false, "data purpose");
//# sourceMappingURL=DataPurposes.js.map
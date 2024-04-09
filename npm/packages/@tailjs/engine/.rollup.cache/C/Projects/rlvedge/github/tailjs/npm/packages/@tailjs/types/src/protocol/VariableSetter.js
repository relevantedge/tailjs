import { createEnumAccessor } from "@tailjs/util";
import { dataClassification, dataPurpose, dataPurposes, variableScope, } from "..";
const setStatusNames = {
    success: 0 /* VariableSetStatus.Success */,
    unchanged: 1 /* VariableSetStatus.Unchanged */,
    conflict: 2 /* VariableSetStatus.Conflict */,
    unsupported: 3 /* VariableSetStatus.Unsupported */,
    denied: 4 /* VariableSetStatus.Denied */,
    readonly: 5 /* VariableSetStatus.ReadOnly */,
    notFound: 6 /* VariableSetStatus.NotFound */,
    error: 7 /* VariableSetStatus.Error */,
};
export const setStatus = createEnumAccessor(setStatusNames, false, "variable set status");
const patchTypeNames = {
    add: 0 /* VariablePatchType.Add */,
    min: 1 /* VariablePatchType.Min */,
    max: 2 /* VariablePatchType.Max */,
    ifMatch: 3 /* VariablePatchType.IfMatch */,
};
export const patchType = createEnumAccessor(patchTypeNames, false, "variable patch type");
export const isVariablePatch = (setter) => !!setter["patch"];
const enumProperties = [
    ["scope", variableScope],
    ["purpose", dataPurpose],
    ["purposes", dataPurposes],
    ["classification", dataClassification],
];
export const toStrict = (value) => {
    if (!value)
        return value;
    enumProperties.forEach(([prop, helper]) => (value[prop] = helper(value[prop])));
    return value;
};
export const isSuccessResult = (result) => result?.status <= 1 /* VariableSetStatus.Unchanged */;
export const isConflictResult = (result) => result?.status === 2 /* VariableSetStatus.Conflict */;
export const isErrorResult = (result) => result?.status === 7 /* VariableSetStatus.Error */;
//# sourceMappingURL=VariableSetter.js.map
import { isErrorResult, variableScope, } from "@tailjs/types";
export class VariableSetError extends Error {
    constructor(result) {
        super(`The variable '${result.source.key}' in ${variableScope.lookup(result.source.scope)} scope could not be set${isErrorResult(result) ? `: ${result.error}` : ""}.`);
    }
}
export const isWritable = (storage) => storage.set;
//# sourceMappingURL=VariableStorage.js.map
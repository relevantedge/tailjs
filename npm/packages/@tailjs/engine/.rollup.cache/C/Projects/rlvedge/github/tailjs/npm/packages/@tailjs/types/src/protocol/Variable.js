import { createEnumAccessor } from "@tailjs/util";
const scopes = {
    global: 0 /* VariableScope.Global */,
    session: 1 /* VariableScope.Session */,
    device: 2 /* VariableScope.Device */,
    user: 3 /* VariableScope.User */,
    entity: 4 /* VariableScope.Entity */,
};
export const variableScope = createEnumAccessor(scopes, false, "variable scope");
//# sourceMappingURL=Variable.js.map
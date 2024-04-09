import { validateConsent, variableScope, } from "@tailjs/types";
import { forEach, isDefined, isString, map, throwError } from "@tailjs/util";
import { VariableMap } from "..";
export class SchemaVariableSet {
    _variables;
    schemas;
    /** @internal */
    constructor(manager, schemas) {
        this.schemas = map(schemas, (schema) => isString(schema) ? manager.getSchema(schema, true) : schema);
        this._variables = new VariableMap();
        this.schemas.forEach((schema) => {
            forEach(schema.variables, ([[scope, key], variable]) => {
                this._variables.update(scope, key, (current) => isDefined(current)
                    ? throwError(`The variable '${key}' in ${variableScope.lookup(scope)} scope from the schema '${variable.declaringType.schema.id}' is already defined in the other schema '${current.declaringType.schema.id}'.`)
                    : variable);
            });
        });
    }
    get(key) {
        return this._variables.get(key);
    }
    tryValidate(key, value) {
        return this._variables.get(key)?.tryValidate(value);
    }
    validate(key, value) {
        return this._variables.get(key)?.validate(value);
    }
    censor(key, value, consent) {
        const variable = this._variables.get(key);
        return !variable || !validateConsent(variable, consent)
            ? undefined
            : variable.censor(value, consent);
    }
}
//# sourceMappingURL=SchemaVariableSet.js.map
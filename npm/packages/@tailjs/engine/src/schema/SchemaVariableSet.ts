import {
  ParsableConsent,
  VariableKey,
  formatKey,
  validateConsent,
  variableScope,
} from "@tailjs/types";
import {
  array,
  forEach,
  ifDefined,
  isString,
  map,
  required,
  throwError,
  tryCatch,
} from "@tailjs/util";
import { Schema, SchemaManager, SchemaVariable, VariableMap } from "..";

export class SchemaVariableSet {
  private _variables: VariableMap<SchemaVariable>;

  public readonly schemas: readonly Schema[];

  /** @internal */
  public constructor(
    manager: SchemaManager,
    schemas: Iterable<string | Schema | undefined>
  ) {
    this.schemas = map(array(schemas), (schema) =>
      isString(schema) ? manager.getSchema(schema, true) : schema
    );

    this._variables = new VariableMap();
    this.schemas.forEach((schema) => {
      forEach(schema.variables, ([[scope, key], variable]) => {
        this._variables.update(scope, key, (current) =>
          current != null
            ? throwError(
                `The variable '${key}' in ${variableScope.lookup(
                  scope
                )} scope from the schema '${
                  variable.declaringType.schema.id
                }' is already defined in the other schema '${
                  current.declaringType.schema.id
                }'.`
              )
            : variable
        );
      });
    });
  }

  public has(key: VariableKey | null | undefined): boolean {
    return this._variables.has(key);
  }

  public get(key: VariableKey | null | undefined): SchemaVariable | undefined {
    return this._variables.get(key);
  }

  public tryValidate<T>(key: VariableKey, value: T): T | undefined {
    return this._variables.get(key)?.tryValidate(value);
  }

  public validate<T>(key: VariableKey, value: T): T | undefined {
    return tryCatch(
      () =>
        required(this._variables.get(key), "Variable not found.").validate(
          value
        ),
      (err: Error) => new Error(`${formatKey(key)}: ${err}`)
    );
  }

  public censor<T>(
    key: VariableKey,
    value: T,
    consent: ParsableConsent,
    validate = true
  ): T | undefined {
    return ifDefined(
      this._variables.get(key),
      (variable) => (
        validate && variable.validate(value),
        !validateConsent(variable, consent)
          ? undefined
          : variable.censor(value, consent)
      )
    );
  }
}

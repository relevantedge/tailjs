import {
  UserConsent,
  VariableKey,
  validateConsent,
  variableScope,
} from "@tailjs/types";
import {
  forEach,
  ifDefined,
  isDefined,
  isString,
  map,
  throwError,
  tryCatch,
} from "@tailjs/util";
import { Schema, SchemaClassification, SchemaVariable, VariableMap } from "..";
import { formatKey } from "../lib";
import { SchemaManager } from "./SchemaManager";

export class SchemaVariableSet {
  private _variables: VariableMap<SchemaVariable>;

  public readonly schemas: readonly Schema[];

  /** @internal */
  public constructor(
    manager: SchemaManager,
    schemas: Iterable<string | Schema | undefined>
  ) {
    this.schemas = map(schemas, (schema) =>
      isString(schema) ? manager.getSchema(schema, true) : schema
    );

    this._variables = new VariableMap();
    this.schemas.forEach((schema) => {
      forEach(schema.variables, ([[scope, key], variable]) => {
        this._variables.update(scope, key, (current) =>
          isDefined(current)
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
      this._variables.get(key)?.validate(value),
      (err: Error) => new Error(`${formatKey(key)}: ${err}`)
    );
  }

  public censor<T>(
    key: VariableKey,
    value: T,
    consent: SchemaClassification | UserConsent,
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

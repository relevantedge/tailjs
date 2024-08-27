import {
  ConsentEvaluationContext,
  UserConsent,
  VariableKey,
  VariableScope,
  formatKey,
  validateConsent,
  variableScope,
} from "@tailjs/types";
import {
  array,
  forEach,
  get,
  ifDefined,
  isString,
  map,
  required,
  throwError,
  tryCatch,
  update,
} from "@tailjs/util";
import { Schema, SchemaManager, SchemaVariable } from ".";

export class SchemaVariableSet {
  private _variables: Map<VariableScope, Map<string, SchemaVariable>>;

  public readonly schemas: readonly Schema[];

  /** @internal */
  public constructor(
    manager: SchemaManager,
    schemas: Iterable<string | Schema | undefined>
  ) {
    this.schemas = map(array(schemas), (schema) =>
      isString(schema) ? manager.getSchema(schema, true) : schema
    );

    this._variables = new Map();
    this.schemas.forEach((schema) => {
      forEach(schema.variables, ([scope, keys]) =>
        forEach(keys, ([key, variable]) => {
          update(
            get(this._variables, scope, () => new Map()),
            key,
            (current) =>
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
        })
      );
    });
  }

  public has(key: VariableKey | null | undefined): boolean {
    return key == null
      ? false
      : this._variables.get(variableScope(key.scope))?.has(key.key) == true;
  }

  public get(key: VariableKey | null | undefined): SchemaVariable | undefined {
    return key == null
      ? undefined
      : this._variables.get(variableScope(key.scope))?.get(key.key);
  }

  public tryValidate<T>(key: VariableKey, value: T): T | undefined {
    return this.get(key)?.tryValidate(value);
  }

  public validate<T>(key: VariableKey, value: T): T | undefined {
    return tryCatch(
      () => required(this.get(key), "Variable not found.").validate(value),
      (err: Error) => new Error(`${formatKey(key)}: ${err}`)
    );
  }

  public patch<T>(
    key: VariableKey,
    value: T,
    consent: UserConsent | undefined,
    validate = true,
    context?: ConsentEvaluationContext
  ): T | undefined {
    return ifDefined(
      this.get(key),
      (variable) => (
        validate && variable.validate(value),
        consent && !validateConsent(variable.usage, consent, undefined, context)
          ? undefined
          : variable.patch(value, consent, context)
      )
    );
  }
}

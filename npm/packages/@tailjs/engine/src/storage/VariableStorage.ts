import {
  DataUsage,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableQuery,
  VariableSetResult,
  VariableSetter,
  VariableScope,
  VariableKey,
  VariableValueSetter,
} from "@tailjs/types";

export const copyKey = (value: VariableKey) => ({
  key: value.key,
  scope: value.scope,
  entityId: value.entityId,
});

export const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export type DefineScopes<
  T,
  ValidScopes extends string = VariableScope,
  RestrictEntityIds extends boolean = false
> = ValidScopes extends infer Scope
  ? Scope extends (RestrictEntityIds extends true ? "global" : ValidScopes)
    ? Omit<T, "scope"> & { scope: Scope }
    : Omit<T, "scope" | "entityId"> & { scope: Scope; entityId?: undefined }
  : never;

export interface ReadOnlyVariableStorage {
  /** Gets or initializes the variables with the specified keys. */
  get(keys: VariableGetter[]): Promise<VariableGetResult[]>;

  /** Gets the variables for the specified entities. */
  query(queries: VariableQuery[]): Promise<Variable[]>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(values: VariableValueSetter[]): Promise<VariableSetResult[]>;
  /** Purges all the keys matching the specified queries.  */
  purge(queries: VariableQuery[]): Promise<void>;
}

export const isWritableStorage = (storage: any): storage is VariableStorage =>
  "set" in storage;

import {
  ReadOnlyVariableGetter,
  VariableGetResult,
  VariableQueryOptions,
  VariableQueryResult,
  VariableSetResult,
  VariableValueSetter,
} from "@tailjs/types";
import { TrackerEnvironmentInitializable } from "..";

export type VariableStorageQuery = {
  scope: string;
  entityIds?: string[];
  keys?: {
    exclude?: boolean;
    values: string[];
  };
  /** Gets variables that have changed since this timestamp. (Not implemented). */
  ifModifiedSince?: number;
};

// Pretty<
//   Omit<VariableQuery, "classification" | "purposes" | "scopes" | "sources"> & {
//     source?: string | null;
//     scope: string;
//   }
// >;
export interface ReadOnlyVariableStorage
  extends TrackerEnvironmentInitializable {
  /** Gets or initializes the variables with the specified keys. */
  get(keys: readonly ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;

  /** Gets the variables for the specified entities. */
  query(
    queries: readonly VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(values: readonly VariableValueSetter[]): Promise<VariableSetResult[]>;

  /** Purges all variables matching the specified queries. Returns the number of deleted variables.  */
  purge(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;

  /** Extends the time-to-live for the variables matching the specified queries. */
  renew(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
}

export const isWritableStorage = (storage: any): storage is VariableStorage =>
  "set" in storage;

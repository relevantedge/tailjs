import {
  ReadOnlyVariableGetter,
  VariableGetResult,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableSetResult,
  VariableValueSetter,
} from "@tailjs/types";
import { Pretty } from "@tailjs/util";
import { TrackerEnvironment } from "..";

export type VariableStorageQuery = Pretty<
  Omit<VariableQuery, "classification" | "purposes" | "scopes" | "sources"> & {
    source?: string | null;
    scope: string;
  }
>;
export interface ReadOnlyVariableStorage {
  /** Gets or initializes the variables with the specified keys. */
  get(keys: ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;

  /** Gets the variables for the specified entities. */
  query(
    queries: VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult>;

  initialize?(environment: TrackerEnvironment): Promise<void>;
}

export interface VariableStorage extends ReadOnlyVariableStorage {
  /** Sets the variables with the specified keys and values. */
  set(values: VariableValueSetter[]): Promise<VariableSetResult[]>;

  /** Purges all variables matching the specified queries. Returns the number of deleted variables.  */
  purge(queries: VariableStorageQuery[]): Promise<number>;

  /** Extends the time-to-live for the variables matching the specified queries. */
  refresh(queries: VariableStorageQuery[]): Promise<number>;
}

export const isWritableStorage = (storage: any): storage is VariableStorage =>
  "set" in storage;

import type {
  DataClassification,
  DataPurpose,
  Variable,
  VariableFilter,
  VariableQueryResult,
  VariableSetResult,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type { TrackerEnvironment } from ".";

export interface VariableQueryParameters {
  top?: number;
  cursor?: string;
}

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get(
    key: string,
    target?: VariableTarget | null,
    purpose?: DataPurpose,
    classification?: DataClassification
  ): MaybePromise<Variable | undefined>;

  query(
    filters: VariableFilter[],
    options?: VariableQueryParameters
  ): MaybePromise<VariableQueryResult>;
}

export const isWritable = (
  storage: ReadOnlyVariableStorage
): storage is VariableStorage => (storage as any).set;

export interface VariableStorage extends ReadOnlyVariableStorage {
  set(variables: VariableSetter[]): MaybePromise<VariableSetResult[]>;

  purge(filters: VariableFilter[]): MaybePromise<void>;
}

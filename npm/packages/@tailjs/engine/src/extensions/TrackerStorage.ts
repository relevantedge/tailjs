import { MaybePromise } from "@tailjs/util";
import {
  PatchableVariableStore,
  TrackerEnvironment,
  VariableData,
  VariableKey,
  VariableStorage,
  VariableStorageResult,
} from "..";
import {
  VariableSetter,
  VariableSetResult,
  VariableFilter,
  VariableTarget,
  DataPurpose,
  Variable,
} from "@tailjs/types";

export class TrackerStorage implements PatchableVariableStore {
  public readonly canPatch: true;

  set(...variables: VariableSetter[]): MaybePromise<VariableSetResult[]> {
    throw new Error("Method not implemented.");
  }
  purge(...values: VariableFilter[]): MaybePromise<void> {
    throw new Error("Method not implemented.");
  }
  initialize?(environment: TrackerEnvironment): MaybePromise<void> {
    throw new Error("Method not implemented.");
  }
  get(
    key: string,
    target?: VariableTarget | null | undefined,
    purpose?: DataPurpose | undefined
  ): MaybePromise<Variable | undefined> {
    throw new Error("Method not implemented.");
  }
  query(...filters: VariableFilter[]): MaybePromise<Variable[]> {
    throw new Error("Method not implemented.");
  }
}

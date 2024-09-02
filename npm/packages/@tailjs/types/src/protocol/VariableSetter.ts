import {
  VariableConflictResult,
  VariableErrorResult,
  VariableKey,
  VariableStatus,
  VariableUnchangedResult,
  VariableValueResult,
  VersionedVariableKey,
} from "..";

export interface VariableValueSetter<T = any> extends VersionedVariableKey {
  /** The value to set. Undefined means delete.*/
  value: T | null;

  /** Expire the variable if not changed or accessed within this number of ms. */
  ttl?: number;

  /** Ignore version and disable optimistic concurrency. */
  force?: boolean;
}

export interface VariablePatch<T = any> extends VariableKey {
  ttl?: number;
  patch: (current: T | null) => T | null;
}

export type VariableSetter<T = any> = VariableValueSetter<T> | VariablePatch<T>;

export interface VariableDeleteResult extends VariableKey {
  status: VariableStatus.Success | VariableStatus.Unchanged;
  value: null;
}

export type VariableSetResult<T = any> =
  | VariableErrorResult
  | VariableConflictResult<T>
  | VariableUnchangedResult
  | VariableDeleteResult
  | VariableValueResult<T>;

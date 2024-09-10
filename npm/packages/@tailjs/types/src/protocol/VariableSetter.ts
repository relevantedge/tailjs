import {
  VariableConflictResult,
  VariableErrorResult,
  VariableKey,
  VariableResult,
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
  /**
   * Apply a patch to the current value.
   * `null` means "delete", `undefined` means "do nothing", so be aware of your "nulls"
   * */
  patch: (current: T | null) => T | null | undefined;
}

export type VariableSetter<T = any> = VariableValueSetter<T> | VariablePatch<T>;

export interface VariableDeleteResult extends VariableResult {
  status: VariableStatus.Success | VariableStatus.NotModified;
  value: null;
}

export type VariableSetResult<T = any> =
  | VariableErrorResult
  | VariableConflictResult<T>
  | VariableUnchangedResult
  | (T extends null ? VariableDeleteResult : VariableValueResult<T>);

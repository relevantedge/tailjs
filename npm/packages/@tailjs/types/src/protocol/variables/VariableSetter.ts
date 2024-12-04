import { MaybePromiseLike } from "@tailjs/util";
import {
  ScopedKey,
  VariableConflictResult,
  VariableErrorResult,
  VariableKey,
  VariableResult,
  VariableResultStatus,
  VariableScope,
  VariableSuccessResult,
  VariableValueErrorResult,
} from "../..";

export interface VariableValueSetter<T = any> extends VariableKey {
  /** The value to set. Null means delete.*/
  value: T | null;

  /** Expire the variable if not changed or accessed within this number of ms. */
  ttl?: number;

  /** Ignore version and disable optimistic concurrency. */
  force?: boolean;

  /**
   * The version of the variable when a client read it.
   * This is used for optimistic concurrency, that is, providing an obsolete version of a variable will result in a conflict error,
   * where the client will have to decide whether and how to reapply its updates.
   *
   * @default null
   */
  version?: string | null;
}

/**
 * The two types need to be separate in this definition in order for the result to be inferred correctly
 * in {@link VariablePatch} (where they must be equal, anything else would not make sense).
 *
 * As an example, the type would be inferred as `never` in the below, had we used the same type for current and result.
 *  `(current: {x: number, y?: string})=>({x: 100, y: "test"})`
 *  since `{x: number, y:string}` does _not_ extend `{x:number, y?:string}` (required string does not extend optional string).
 *
 */
export type VariablePatchFunction<Current, Patched = Current> = (
  current?: Current | null
) => MaybePromiseLike<Patched | null | undefined>;

export interface VariablePatch<Current = any, Patched extends Current = Current>
  extends VariableKey {
  ttl?: number;
  /**
   * Apply a patch to the current value.
   * `null` means "delete" whereas `undefined` means "do nothing" - so be aware of your "nulls".
   * */
  patch: VariablePatchFunction<Current, Patched>;
}

export type VariableSetterCallback<T> = (result: VariableSetResult<T>) => any;

export type VariableSetter<T = any, Patched extends T = T> =
  | VariableValueSetter<T>
  | VariablePatch<T, Patched>;

export type ScopedVariableSetter<T = any, Patched extends T = T> = ScopedKey<
  VariableSetter<T, Patched>,
  VariableScope,
  any
>;

export interface VariableDeleteResult extends VariableResult {
  status: VariableResultStatus.Success | VariableResultStatus.NotModified;
  value: null;
}

export type VariableSetResult<T = any> =
  | VariableErrorResult
  | VariableConflictResult<T>
  | VariableValueErrorResult
  | (
      | (null extends T ? VariableDeleteResult : never)
      | VariableSuccessResult<T>
    );

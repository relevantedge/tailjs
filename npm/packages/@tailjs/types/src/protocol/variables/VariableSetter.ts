import { MaybePromiseLike, Nullish } from "@tailjs/util";
import {
  VariableConflictResult,
  VariableErrorResult,
  VariableKey,
  VariableNotFoundResult,
  VariableResult,
  VariableResultStatus,
  VariableSuccessResult,
  VariableValueErrorResult,
} from "../..";

export interface VariableValueSetter<T extends {} = any> extends VariableKey {
  /** The value to set. `null` or `undefined` means "delete". */
  value: T | null | undefined;

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

  patch?: undefined;
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
export type VariablePatchFunction<
  Current extends {},
  Patched extends Current = Current
> = (
  current: Current | undefined
) => MaybePromiseLike<Patched | null | undefined>;

export interface VariablePatch<
  Current extends {},
  Patched extends Current = Current
> extends VariableKey {
  ttl?: number;
  /**
   * Apply a patch to the current value.
   *
   * `null` and `undefined` means "delete". Return the current value to do nothing.
   * */
  patch: VariablePatchFunction<Current, Patched>;
}

export type VariableSetter<T extends {} = any, Patched extends T = T> =
  | VariableValueSetter<T>
  | VariablePatch<T, Patched>;

export interface VariableDeleteResult extends VariableResult {
  status: VariableResultStatus.Success;
  value?: undefined;
}

export type VariableSetResult<T extends {} = any> =
  | VariableErrorResult
  | VariableConflictResult<T>
  | VariableNotFoundResult
  | VariableValueErrorResult
  | (
      | (T extends null | undefined ? VariableDeleteResult : never)
      | VariableSuccessResult<T>
    );

import { MaybePromiseLike } from "@tailjs/util";
import {
  DataPurposeName,
  VariableErrorResult,
  VariableKey,
  VariableNotFoundResult,
  VariableNotModifiedResult,
  VariableSuccessResult,
  VariableValueErrorResult,
} from "../..";

export interface ReadOnlyVariableGetter extends VariableKey {
  ifModifiedSince?: number;
  ifNoneMatch?: string;
  /**
   * The purpose for which the data will be used.
   * If unspecified, it will default to the purposes defined in the schema.
   */
  purpose?: DataPurposeName;

  /**
   * The maximum number of milliseconds the value of this variable can be cached.
   * If omitted or `true` the default value of 3 seconds will be used.
   * `false` or 0 means the variable will not be cached.
   *
   * @default 0
   */
  cache?: number | boolean;

  /**
   * Do not accept a cached version of the variable.
   */
  refresh?: boolean;
}

export type VariableInitializerCallback<T extends {} = any> =
  () => MaybePromiseLike<T | null | undefined>;

export interface VariableInitializer<T extends {} = any>
  extends ReadOnlyVariableGetter {
  ttl?: number;
  init: VariableInitializerCallback<T>;
}

export type VariableGetter<T extends {} = any> = (
  | (ReadOnlyVariableGetter & { init?: undefined; ttl?: undefined })
  | VariableInitializer<T>
) & { value?: never; patch?: never }; // These two properties to avoid VariableGetter extends VariableSetter.

export type VariableGetResult<T extends {} = any> =
  | VariableErrorResult
  | VariableNotFoundResult
  | VariableNotModifiedResult
  | VariableValueErrorResult
  | VariableSuccessResult<T>;

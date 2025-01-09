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

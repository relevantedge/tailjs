import { MaybePromiseLike } from "@tailjs/util";
import {
  DataPurposeName,
  ScopedKey,
  VariableErrorResult,
  VariableKey,
  VariableNotFoundResult,
  VariableScope,
  VariableSuccessResult,
  VariableUnchangedResult,
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

export interface VariableInitializer<T> extends ReadOnlyVariableGetter {
  ttl?: number;
  init: () => MaybePromiseLike<T | null | undefined>;
}

export type VariableGetterCallback<T> = (result: VariableGetResult<T>) => any;

export type VariableGetter<T = any> = (
  | ReadOnlyVariableGetter
  | VariableInitializer<T>
) & { value?: never; patch?: never }; // These two properties to avoid VariableGetter extends VariableSetter.

export type ScopedVariableGetter<T = any> = ScopedKey<
  VariableGetter<T>,
  VariableScope,
  any
>;

export type VariableGetResult<T = any> =
  | VariableErrorResult
  | VariableNotFoundResult
  | (VariableUnchangedResult & { value: undefined })
  | VariableValueErrorResult
  | VariableSuccessResult<T>;

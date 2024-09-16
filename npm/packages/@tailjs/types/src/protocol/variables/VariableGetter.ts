import { MaybePromiseLike } from "@tailjs/util";
import {
  DataPurposeName,
  VariableErrorResult,
  VariableKey,
  VariableUnchangedResult,
  VariableValueResult,
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

export interface VariableGetter<T = any> extends ReadOnlyVariableGetter {
  ttl?: number;
  init?: () => MaybePromiseLike<T | null | undefined>;
}

export type VariableGetResult<T = any> =
  | VariableErrorResult
  | VariableUnchangedResult
  | VariableValueResult<T>;

import {
  DataPurposeName,
  DataPurposes,
  VariableErrorResult,
  VariableKey,
  VariableStatus,
  VariableUnchangedResult,
  VariableValueResult,
} from "..";

export interface VariableGetter extends VariableKey {
  ifModifiedSince?: number;
  ifNoneMatch?: string;
  /**
   * The purpose for which the data will be used.
   * If unspecified, it will default to the purposes defined in the schema.
   */
  purpose?: DataPurposeName;
}

export interface VariableGetterWithDefault<T = any> extends VariableGetter {
  ttl?: number;
  init?: (key: VariableKey) => T | null;
}

export interface VariableNotFoundResult extends VariableKey {
  status: VariableStatus.NotFound;
  value: null;
}

export type VariableGetResult<T = any> =
  | VariableErrorResult
  | VariableUnchangedResult
  | VariableValueResult<T>;

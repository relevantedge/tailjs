import {
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
   *
   * The only scenario where it makes sense to use this is if the variable has multiple purposes,
   * and the user has only consented to one of those.
   *
   * Requesting data for a purpose that is not defined in the schema will only return data
   * if the schema defines the purpose as "necessary".
   */
  purpose?: keyof DataPurposes | (keyof DataPurposes)[];
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

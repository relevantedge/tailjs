import { Variable, VariableKey } from ".";

export enum VariableStatus {
  Success = 200,
  Created = 201,
  Unchanged = 304,
  Denied = 403,
  NotFound = 404,
  ReadOnly = 405,
  Conflict = 409,
  Unsupported = 501,
  Invalid = 400,
  Error = 500,
}

export type VariableSuccessStatus =
  | VariableStatus.Success
  | VariableStatus.Created
  | VariableStatus.Unchanged;

export type VariableErrorStatus =
  | VariableStatus.Denied
  | VariableStatus.NotFound
  | VariableStatus.ReadOnly
  | VariableStatus.Unsupported
  | VariableStatus.Invalid
  | VariableStatus.Conflict
  | VariableStatus.Error;

export type VariableErrorResult<T = any> = VariableKey &
  (
    | {
        status:
          | VariableStatus.Denied
          | VariableStatus.NotFound
          | VariableStatus.ReadOnly
          | VariableStatus.Unsupported
          | VariableStatus.Invalid;
        error?: string;
        transient?: false;
      }
    | VariableConflictResult<T>
    | {
        status: VariableStatus.Error;
        error: string;
        transient?: boolean;
      }
  );

export const isSuccessResult = (
  value: any
): value is {
  status:
    | VariableStatus.Success
    | VariableStatus.Created
    | VariableStatus.Unchanged;
} => value?.status < 400;

export const isValueResult = (
  value: any
): value is {
  status: VariableStatus.Success | VariableStatus.Created;
} => value?.status < 300 && value.value;

export const isErrorResult = (value: any): value is VariableErrorResult =>
  value?.status >= 400;

export const isTransientError = (
  value: any
): value is { status: VariableStatus.Error; transient: true } =>
  (value as any)?.transient;

export interface VariableConflictResult<T = any> extends VariableKey {
  status: VariableStatus.Conflict;
  current: Variable<T> | null;
}

export interface VariableUnchangedResult extends VariableKey {
  status: VariableStatus.Unchanged;
}

export interface VariableValueResult<T = any> extends Variable<T> {
  status: VariableStatus.Success | VariableStatus.Created;
}

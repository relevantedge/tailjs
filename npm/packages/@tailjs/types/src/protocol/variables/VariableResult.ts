import {
  Variable,
  VariableGetResult,
  VariableKey,
  VariableSetResult,
} from "../..";

export enum VariableResultStatus {
  Success = 200,
  Created = 201,
  NotModified = 304,
  BadRequest = 400,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  Error = 500,
}

export type VariableSuccessStatusWithValue =
  | VariableResultStatus.Success
  | VariableResultStatus.Created;

export type VariableSuccessStatus =
  | VariableSuccessStatusWithValue
  | VariableResultStatus.NotModified;

export type VariableErrorStatus =
  | VariableResultStatus.Forbidden
  | VariableResultStatus.NotFound
  | VariableResultStatus.BadRequest
  | VariableResultStatus.Conflict
  | VariableResultStatus.Error;

export interface VariableResult extends VariableKey {
  status: VariableResultStatus;
}

export interface VariableNotFoundResult extends VariableResult {
  status: VariableResultStatus.NotFound;
  value?: undefined;
  version?: undefined;
}

export interface VariableValueErrorResult extends VariableResult {
  status: VariableResultStatus.Forbidden | VariableResultStatus.BadRequest;
  error?: string;
  transient?: false;
}

export interface VariableErrorResult extends VariableResult {
  status: VariableResultStatus.Error;
  error: string;
  transient?: boolean;
}

/** The variable operation succeeded, and the result represents a variable, or undefined if not found. */
export const isVariableResult: {
  <T extends {} = any>(value: any, requireFound?: true): value is Variable<T>;
  <T extends {} = any>(value: any, requireFound: boolean): value is
    | Variable<T>
    | undefined
    | {
        status: VariableResultStatus.NotFound;
        value?: undefined;
      };
} = (value: any, requireFound = true): value is any =>
  (value as Variable)?.value != null ||
  (!requireFound &&
    (!value ||
      (value as VariableGetResult).status === VariableResultStatus.NotFound));

/**
 * The variable existed so the result has a value,
 * or the variable did not exists, in which case the value can be interpreted as `null`.
 */

export const isSuccessResult: {
  <T = any>(
    value: any,
    /** Whether "not found" is considered a success. */
    requireFound?: true
  ): value is
    | {
        status: VariableResultStatus.Success | VariableResultStatus.Created;
        value: T | null;
      }
    | { status: VariableResultStatus.NotModified };

  <T extends {} = any>(
    value: any,
    /** Whether "not found" is considered a success. */
    requireFound: boolean
  ): value is
    | {
        status: VariableResultStatus.Success | VariableResultStatus.Created;
        value: T | undefined;
      }
    | {
        status:
          | VariableResultStatus.NotModified
          | VariableResultStatus.NotFound;
      };
} = (value: any, requireFound = true): value is any =>
  value &&
  ((value as VariableResult).status < 400 ||
    (!requireFound &&
      (value as VariableResult).status === VariableResultStatus.NotFound));

export const isTransientError = (
  value: any
): value is { status: VariableResultStatus.Error; transient: true } =>
  (value as any)?.transient;

export interface VariableConflictResult<T extends {} = any>
  extends VariableResult,
    Variable<T> {
  status: VariableResultStatus.Conflict;
}

export interface VariableNotModifiedResult extends VariableResult {
  status: VariableResultStatus.NotModified;
  value?: undefined;
}

export interface VariableSuccessResult<T extends {} = any>
  extends VariableResult,
    Variable<T> {
  status: VariableResultStatus.Success | VariableResultStatus.Created;
}

export type AnyVariableResult<T extends {} = any> =
  | VariableGetResult<T>
  | VariableSetResult<T>;

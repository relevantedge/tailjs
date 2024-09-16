import { OmitUnion } from "@tailjs/util";
import {
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariablePatch,
  VariableSetResult,
  VariableValueSetter,
} from "../..";

export enum VariableStatus {
  Success = 200,
  Created = 201,
  NotModified = 304,
  Forbidden = 403,
  NotFound = 404,
  BadRequest = 405,
  Conflict = 409,
  Unsupported = 501,

  Error = 500,
}

export type VariableSuccessStatus =
  | VariableStatus.Success
  | VariableStatus.Created
  | VariableStatus.NotModified;

export type VariableErrorStatus =
  | VariableStatus.Forbidden
  | VariableStatus.NotFound
  | VariableStatus.BadRequest
  | VariableStatus.Unsupported
  | VariableStatus.Conflict
  | VariableStatus.Error;

export interface VariableResult extends VariableKey {
  status: VariableStatus;
}

export type VariableErrorResult<T = any> = VariableResult &
  (
    | {
        status: VariableStatus.NotFound;
      }
    | {
        status:
          | VariableStatus.Forbidden
          | VariableStatus.BadRequest
          | VariableStatus.Unsupported
          | VariableStatus.NotFound;
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
    | VariableStatus.NotModified;
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

export interface VariableConflictResult<T = any> extends VariableResult {
  status: VariableStatus.Conflict;
  current: Variable<T> | null;
}

export interface VariableUnchangedResult extends VariableResult {
  status: VariableStatus.NotModified;
}

export interface VariableValueResult<T = any>
  extends VariableResult,
    Variable<T> {
  status: VariableStatus.Success | VariableStatus.Created;
}

export type AnyVariableResult<T = any> =
  | VariableGetResult<T>
  | VariableSetResult<T>;

type ReplaceKey<Target, Source> = Target extends infer Target
  ? Omit<Target, keyof VariableKey> &
      Pick<Source, keyof Source & keyof VariableKey> extends infer T
    ? { [P in keyof T]: T[P] }
    : never
  : never;

export type MapVariableResult<Operation> = Operation extends
  | Pick<VariableValueSetter<infer Result>, "value">
  | Pick<VariablePatch<infer Current, infer Result>, "patch">
  ? ReplaceKey<
      VariableSetResult<
        unknown extends Current
          ? unknown extends Result
            ? any
            : Result
          : Current
      >,
      Operation
    >
  : ReplaceKey<
      VariableGetResult<
        Operation extends Pick<VariableGetter<infer Result>, "init">
          ? unknown extends Result
            ? any
            : Result
          : never
      >,
      Operation
    >;

export type MapVariableResults<Operations extends readonly any[]> = {
  [Index in keyof Operations]: MapVariableResult<Operations[Index]>;
};

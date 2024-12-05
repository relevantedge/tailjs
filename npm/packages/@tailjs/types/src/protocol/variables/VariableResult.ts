import { AllKeys, Falsish } from "@tailjs/util";
import {
  ScopedKey,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableInitializer,
  VariableKey,
  VariablePatch,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
} from "../..";

export enum VariableResultStatus {
  Success = 200,
  Created = 201,
  NotModified = 304,
  Forbidden = 403,
  NotFound = 404,
  BadRequest = 405,
  Conflict = 409,

  Error = 500,
}

export type VariableSuccessStatus =
  | VariableResultStatus.Success
  | VariableResultStatus.Created
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
  value: null;
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

export const isVariableResult = (value: any): value is Variable =>
  (value as Variable)?.value != null;

export const isSuccessResult = <RequireFound extends boolean = true>(
  value: any,
  requireFound: RequireFound = true as any
): value is {
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Created
    | VariableResultStatus.NotModified
    | (true extends RequireFound ? never : VariableResultStatus.NotFound);
} =>
  value &&
  ((value as VariableResult).status < 400 ||
    (!requireFound &&
      (value as VariableResult).status === VariableResultStatus.NotFound));

export const isTransientError = (
  value: any
): value is { status: VariableResultStatus.Error; transient: true } =>
  (value as any)?.transient;

export interface VariableConflictResult<T = any> extends VariableResult {
  status: VariableResultStatus.Conflict;
  current: Variable<T> | null;
}

export interface VariableUnchangedResult extends VariableResult {
  status: VariableResultStatus.NotModified;
}

export interface VariableSuccessResult<T = any>
  extends VariableResult,
    Variable<T> {
  status: VariableResultStatus.Success | VariableResultStatus.Created;
}

export type AnyVariableResult<T = any> =
  | VariableGetResult<T>
  | VariableSetResult<T>;

type ReplaceKey<Target, Source> = Target extends infer Target
  ? Omit<Target, keyof Source & keyof VariableKey> &
      Pick<Source, keyof Source & keyof VariableKey> extends infer T
    ? { [P in keyof T]: T[P] }
    : never
  : never;

/** Any variable result that should not throw an error. */
export type ValidVariableResult<T = any> =
  | VariableSuccessResult<T>
  | VariableNotFoundResult;

export type MapVariableResult<
  Operation,
  Type extends "success" | "raw" | "value" = "success",
  Scopes extends string | never = never,
  ExplicitScopes extends string = any
> = Operation extends Falsish
  ? undefined
  : Operation extends readonly any[]
  ? {
      -readonly [P in keyof Operation]: MapVariableResult<
        Operation[P],
        Type,
        Scopes,
        ExplicitScopes
      >;
    }
  : (
      Operation extends
        | Pick<VariableValueSetter<infer Result>, "value">
        | Pick<VariablePatch<infer Current, infer Result>, "patch">
        ? [
            "set",
            ReplaceKey<
              VariableSetResult<
                unknown extends Current
                  ? unknown extends Result
                    ? any
                    : Result
                  : Current
              >,
              Operation
            >
          ]
        : [Operation] extends [never]
        ? never
        : [
            "get",
            ReplaceKey<
              VariableGetResult<
                Operation extends Pick<
                  VariableInitializer<infer Result>,
                  "init"
                >
                  ? unknown extends Result
                    ? any
                    : Result
                  : any
              > & {
                status: Exclude<
                  VariableResultStatus,
                  | (Operation extends
                      | { ifModifiedSince: number }
                      | { ifNoneMatch: string }
                      ? never
                      : VariableUnchangedResult["status"])
                  | (Operation extends { init: any }
                      ? never
                      :
                          | VariableResultStatus.Created
                          | VariableValueErrorResult["status"])
                >;
              },
              Operation
            >
          ]
    ) extends [infer OperationType, infer Result]
  ? (
      Type extends "raw"
        ? Result
        : Result extends { status: VariableResultStatus.NotFound }
        ? Type extends "value"
          ? undefined
          : OperationType extends "get"
          ? undefined
          : Result
        : Result extends { status: VariableResultStatus.NotModified }
        ? Type extends "value"
          ? undefined
          : Result
        : Result extends { status: VariableSuccessStatus; value: any }
        ? Type extends "value"
          ? Result["value"]
          : Result
        : never
    ) extends infer Result
    ? Type extends "value"
      ? Result
      : Result extends { [x: string]: never }
      ? never
      : [Scopes] extends [never]
      ? { [P in keyof Result]: Result[P] }
      : ScopedKey<
          Result & VariableKey,
          Scopes,
          ExplicitScopes
        > extends infer Pretty
      ? Pretty extends { [x: string]: never }
        ? never
        : { [P in keyof Pretty]: Pretty[P] }
      : never
    : never
  : never;

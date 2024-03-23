import {
  DataClassification,
  DataPurposes,
  EnumHelper,
  Variable,
  VariableClassification,
  VariableKey,
  VariableScope,
  VariableVersion,
  VersionedVariableKey,
  dataClassification,
  dataPurpose,
  dataPurposes,
  variableScope,
} from "..";

export type TargetedVariableScope =
  | VariableScope.Session
  | VariableScope.Device
  | VariableScope.User
  | VariableScope.Entity;

export const enum VariableSetStatus {
  Success = 0,
  Unchanged = 1,
  Conflict = 2,
  Unsupported = 3,
  Denied = 4,
  ReadOnly = 5,
  NotFound = 6,
  Error = 7,
}

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  source: Source;
} & (
  | {
      status:
        | VariableSetStatus.Success
        | VariableSetStatus.Unchanged
        | VariableSetStatus.Conflict;
      current: Source extends VariableSetter<undefined>
        ? Variable<T> | undefined
        : Variable<T>;
    }
  | {
      status:
        | VariableSetStatus.Denied
        | VariableSetStatus.NotFound
        | VariableSetStatus.Unsupported
        | VariableSetStatus.ReadOnly;
    }
  | { status: VariableSetStatus.Error; transient?: boolean; error: any }
);

export interface VariablePatchSource<
  T = any,
  NumericEnums extends boolean = false
> extends VariableVersion,
    VariableClassification<NumericEnums> {
  value: T;
}

export type VariablePatchResult<
  T = any,
  NumericEnums extends boolean = false
> =
  | (Partial<VariableClassification<NumericEnums>> & {
      value: T | undefined;
    })
  | undefined;

export type VariablePatchAction<T = any> = (
  current: VariablePatchSource<T, true> | undefined
) => VariablePatchResult<T> | undefined;

export const enum VariablePatchType {
  Add,
  Min,
  Max,
  IfMatch,
}

export type VariableValuePatch<T = any> = {
  selector?: string;
} & (
  | {
      type: VariablePatchType.Add;
      by: number;
    }
  | {
      type: VariablePatchType.Min | VariablePatchType.Max;
      value: number;
    }
  | {
      type: VariablePatchType.IfMatch;
      match: T | undefined;
      value: T | undefined;
    }
);

export const isVariablePatch = (setter: any): setter is VariablePatch =>
  !!setter["patch"];

const enumProperties = [
  ["scope", variableScope],
  ["purpose", dataPurpose],
  ["purposes", dataPurposes],
  ["classification", dataClassification],
] as const;

type EnumPropertyType<
  P extends keyof any,
  Default,
  Props
> = Props extends readonly []
  ? Default
  : Props extends readonly [
      readonly [infer Key, { values: (infer T)[] }],
      ...infer Rest
    ]
  ? P extends Key
    ? T
    : EnumPropertyType<P, Default, Rest>
  : never;

export const toStrict: <T>(value: T) => T extends null | undefined
  ? T
  : {
      [P in keyof T]: EnumPropertyType<P, T[P], typeof enumProperties>;
    } = (value: any) => {
  if (!value) return value;

  enumProperties.forEach(
    ([prop, helper]) => (value[prop] = helper(value[prop]))
  );

  return value as any;
};

export type VariablePatch<
  T = any,
  Strict extends boolean = boolean
> = VariableKey<Strict> &
  Partial<Variable<T, Strict>> &
  (
    | {
        patch: VariablePatchAction<T>;
      }
    | (VariableClassification<Strict> & {
        patch: VariableValuePatch<T>;
      })
  );

export type VariableSetter<T = any, NumericEnums extends boolean = boolean> =
  | Variable<T, NumericEnums>
  | (VersionedVariableKey<NumericEnums> & { value: undefined })
  | VariablePatch<T, NumericEnums>;

export const isSuccessResult = <T extends VariableSetResult>(
  result: T | undefined
): result is T & {
  status: VariableSetStatus.Success | VariableSetStatus.Unchanged;
} => result?.status! <= VariableSetStatus.Unchanged;

export const isConflictResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Conflict;
} => result?.status === VariableSetStatus.Conflict;

export const isErrorResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: VariableSetStatus.Error;
} => result?.status === VariableSetStatus.Error;

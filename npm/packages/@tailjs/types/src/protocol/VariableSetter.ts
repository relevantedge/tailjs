import {
  MaybePromise,
  ParsableEnumValue,
  PickPartial,
  createEnumAccessor,
  isDefined,
  isFunction,
} from "@tailjs/util";
import {
  Variable,
  VariableClassification,
  VariableKey,
  VariableScope,
  VariableVersion,
  VersionedVariableKey,
  dataClassification,
  singleDataPurpose,
  dataPurposes,
  variableScope,
  VariableMetadata,
} from "..";

export type TargetedVariableScope =
  | VariableScope.Session
  | VariableScope.Device
  | VariableScope.User
  | VariableScope.Entity;

export enum SetStatus {
  Success = 0,
  Unchanged = 1,
  Conflict = 2,
  Unsupported = 3,
  Denied = 4,
  ReadOnly = 5,
  NotFound = 6,
  Error = 7,
}

export const setStatus = createEnumAccessor(
  SetStatus as typeof SetStatus,
  false,
  "variable set status"
);

export type SetStatusValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<typeof SetStatus, Numeric, false, SetStatus>;

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  source: Source;
} & (
  | {
      status: SetStatus.Success | SetStatus.Unchanged | SetStatus.Conflict;
      current: Source extends VariableSetter<undefined>
        ? Variable<T, true> | undefined
        : Variable<T, true>;
    }
  | ((
      | {
          status:
            | SetStatus.Denied
            | SetStatus.NotFound
            | SetStatus.Unsupported
            | SetStatus.ReadOnly;
        }
      | { status: SetStatus.Error; transient?: boolean; error: any }
    ) & { current?: never })
);

export interface VariablePatchSource<
  T = any,
  NumericEnums extends boolean = boolean
> extends VariableVersion,
    VariableClassification<NumericEnums>,
    VariableMetadata {
  value: T;
}

export type VariablePatchResult<
  T = any,
  NumericEnums extends boolean = boolean
> =
  | (VariableMetadata &
      (Partial<VariableClassification<NumericEnums>> & {
        value: T | undefined;
      }))
  | undefined;

export type VariablePatchAction<T = any> = (
  current: VariablePatchSource<T, true> | undefined
) => MaybePromise<VariablePatchResult<T> | undefined>;

export enum VariablePatchType {
  Add = 0,
  Min = 1,
  Max = 2,
  IfMatch = 3,
}

export type VariablePatchTypeValue<
  Numeric extends boolean | undefined = boolean
> = ParsableEnumValue<
  typeof VariablePatchType,
  Numeric,
  false,
  VariablePatchType
>;

export const patchType = createEnumAccessor(
  VariablePatchType as typeof VariablePatchType,
  false,
  "variable patch type"
);

export type VariableValuePatch<T = any> = {
  selector?: string;
} & (
  | {
      type: VariablePatchType.Add | "add";
      by: number;
    }
  | {
      type: VariablePatchType.Min | VariablePatchType.Max | "min" | "max";
      value: number;
    }
  | {
      type: VariablePatchType.IfMatch | "ifMatch";
      match: T | undefined;
      value: T | undefined;
    }
);

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
    ([prop, helper]) => (value[prop] = helper.parse(value[prop]))
  );

  return value as any;
};

export type VariablePatchActionSetter<
  T = any,
  NumericEnums extends boolean = boolean
> = VariableKey<NumericEnums> &
  VariableKey &
  Partial<Variable<T, NumericEnums>> & {
    patch: VariablePatchAction<T>;
  };

export type VariableValuePatchSetter<
  T = any,
  NumericEnums extends boolean = boolean
> = VariableKey<NumericEnums> &
  Partial<Variable<T, NumericEnums>> &
  VariableKey &
  (Partial<VariableClassification<NumericEnums>> & {
    patch: VariableValuePatch<T>;
  });

export type VariablePatch<T = any, NumericEnums extends boolean = boolean> =
  | VariablePatchActionSetter<T, NumericEnums>
  | VariableValuePatchSetter<T, NumericEnums>;

export type VariableValueSetter<
  T = any,
  NumericEnums extends boolean = boolean
> = PickPartial<Variable<T, NumericEnums>, "classification" | "purposes">;

export type VariableSetter<T = any, NumericEnums extends boolean = boolean> =
  | VariableValueSetter
  | (VersionedVariableKey<NumericEnums> & { value: undefined })
  | VariablePatch<T, NumericEnums>;

export const isSuccessResult = <T extends VariableSetResult>(
  result: T | undefined
): result is T & {
  status: SetStatus.Success | SetStatus.Unchanged;
} => result?.status! <= SetStatus.Unchanged;

export const isConflictResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: SetStatus.Conflict;
} => result?.status === SetStatus.Conflict;

export const isErrorResult = <T>(
  result: VariableSetResult<T> | undefined
): result is VariableSetResult<T> & {
  status: SetStatus.Error;
} => result?.status === SetStatus.Error;

export const isVariablePatch = (setter: any): setter is VariablePatch =>
  !!setter["patch"];

export const isVariablePatchAction = (
  setter: any
): setter is VariablePatchActionSetter => isFunction(setter["patch"]);

const enumProperties = [
  ["scope", variableScope],
  ["purpose", singleDataPurpose],
  ["purposes", dataPurposes],
  ["classification", dataClassification],
] as const;

export const isScoped = <T>(value: any): value is T & VariableKey =>
  isDefined(value?.scope);

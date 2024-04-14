import {
  If,
  MaybePromise,
  Not,
  ParsableEnumValue,
  PickPartial,
  createEnumAccessor,
  eq,
  isDefined,
  isFunction,
  throwError,
} from "@tailjs/util";
import {
  Variable,
  VariableClassification,
  VariableKey,
  VariableMetadata,
  VariableScope,
  VariableVersion,
  VersionedVariableKey,
  formatKey,
} from "..";

export type TargetedVariableScope =
  | VariableScope.Session
  | VariableScope.Device
  | VariableScope.User
  | VariableScope.Entity;

export enum VariableResultStatus {
  Success = 200,
  Created = 201,
  Unchanged = 304,
  Conflict = 409,
  Unsupported = 501,
  Denied = 403,
  ReadOnly = 405,
  NotFound = 404,
  Invalid = 400,
  Error = 500,
}

export const resultStatus = createEnumAccessor(
  VariableResultStatus as typeof VariableResultStatus,
  false,
  "variable set status"
);

export type ResultStatusValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<
    typeof VariableResultStatus,
    Numeric,
    false,
    VariableResultStatus
  >;

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T, any> = VariableSetter<T, any>,
  Validated = true
> = (
  | VariableSetSuccessResult<T, Source>
  | ({
      source: Source;
    } & (
      | {
          status: VariableResultStatus.Conflict;
          current: Source extends VariableSetter<undefined>
            ? Variable<T, true> | undefined
            : Variable<T, true>;
        }
      | ((
          | {
              status:
                | VariableResultStatus.ReadOnly
                | VariableResultStatus.Invalid
                | VariableResultStatus.Denied
                | VariableResultStatus.NotFound
                | VariableResultStatus.Unsupported;

              error?: any;
            }
          | {
              status: VariableResultStatus.Error;
              transient?: boolean;
              error: any;
            }
        ) & { current?: never })
    ))
) &
  If<
    Not<Validated>,
    {
      /** Throws an error if the set request failed. Otherwise the setter that succeeded is returned. */
      validate(): VariableSetSuccessResult<T, Source>;
    },
    {}
  >;

export type VariableSetSuccessResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  source: Source;
  status: VariableResultStatus.Success | VariableResultStatus.Unchanged;
  current: Source extends VariableSetter<undefined>
    ? Variable<T, true> | undefined
    : Variable<T, true>;
};

export interface VariablePatchSource<
  T = any,
  NumericEnums extends boolean = boolean
> extends VariableVersion,
    VariableClassification<NumericEnums>,
    VariableMetadata {
  value: T;
}

export type VariablePatchResult<T = any, Validated = boolean> =
  | (VariableMetadata &
      (Partial<VariableClassification<If<Validated, true, boolean>>> & {
        value: T | undefined;
      }))
  | undefined;

export type VariablePatchAction<T = any, Validated = boolean> = (
  current: VariablePatchSource<T, If<Validated, true, boolean>> | undefined
) => MaybePromise<VariablePatchResult<T, Validated> | undefined>;

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
export type VariablePatchActionSetter<
  T = any,
  Validated = boolean
> = VariableKey<If<Validated, true, boolean>> &
  VariableKey &
  Partial<Variable<T, If<Validated, true, boolean>>> & {
    patch: VariablePatchAction<T, Validated>;
  };

export type VariableValuePatchSetter<
  T = any,
  Validated = boolean
> = VariableKey<If<Validated, true, boolean>> &
  Partial<Variable<T, If<Validated, true, boolean>>> &
  (Partial<VariableClassification<If<Validated, true, boolean>>> & {
    patch: VariableValuePatch<T>;
  });

export type VariablePatch<T = any, Validated = boolean> =
  | VariablePatchActionSetter<T, Validated>
  | VariableValuePatchSetter<T, Validated>;

export type VariableValueSetter<
  T = any,
  NumericEnums extends boolean = boolean
> = PickPartial<Variable<T, NumericEnums>, "classification" | "purposes">;

export type VariableSetter<T = any, Validated = boolean> =
  | VariableValueSetter<T, If<Validated, true, boolean>>
  | (VersionedVariableKey<If<Validated, true, boolean>> & { value: undefined })
  | VariablePatch<T, Validated>;

type MapVariableSetResult<
  Source,
  Validatable = false
> = Source extends VariableSetter<infer T>
  ? VariableSetResult<T, Source, Validatable>
  : never;

export type VariableSetResults<
  K extends readonly any[] = any[],
  Validatable = boolean
> = Validatable extends infer Validatable
  ? K extends readonly []
    ? []
    : K extends readonly [infer Item, ...infer Rest]
    ? [MapVariableSetResult<Item, Validatable>, ...VariableSetResults<Rest>]
    : K extends readonly (infer T)[]
    ? MapVariableSetResult<T, Validatable>[]
    : never
  : never;

export const isVariablePatch = <Validated>(
  setter: VariableSetter<any, Validated>
): setter is VariablePatch<any, Validated> => !!setter["patch"];

export const isVariablePatchAction = (
  setter: any
): setter is VariablePatchActionSetter => isFunction(setter["patch"]);

export const isScoped = <T>(value: any): value is T & VariableKey =>
  isDefined(value?.scope);

export const validateSetResult = <
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
>(
  result: VariableSetResult<T, Source>
): VariableSetSuccessResult<T, Source> =>
  result.status < 400
    ? (result as VariableSetSuccessResult<T, Source>)
    : throwError(
        `${formatKey(result.source)} could not be set because ${
          result.status === VariableResultStatus.Conflict
            ? `of a conflict. The expected version '${result.source.version}' did not match the current version '${result.current?.version}'.`
            : result.status === VariableResultStatus.Denied
            ? result.error ?? "the operation was denied."
            : result.status === VariableResultStatus.Invalid
            ? result.error ?? "the value does not conform to the schema"
            : result.status === VariableResultStatus.ReadOnly
            ? "it is read only."
            : result.status === VariableResultStatus.NotFound
            ? "it does not exist."
            : result.status === VariableResultStatus.Error
            ? `of an unexpected error: ${result.error}`
            : "of an unknown reason."
        }`
      );

export const addSetResultValidators = <K extends readonly any[] = any[]>(
  setters: VariableSetResults<K, boolean>
): VariableSetResults<K, true> =>
  setters.map(
    (setter: any) => (
      (setter.validate = () => validateSetResult(setter)), setter
    )
  ) as any;

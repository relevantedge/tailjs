import {
  If,
  MaybeArray,
  MaybePromise,
  Nullish,
  ParsableEnumValue,
  PickPartial,
  VariableTupleOrArray,
  createEnumAccessor,
  isArray,
  isDefined,
  isFunction,
  throwError,
} from "@tailjs/util";
import {
  Variable,
  VariableClassification,
  VariableGetResult,
  VariableGetResults,
  VariableGetSuccessResult,
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
  ParsableEnumValue<typeof resultStatus, Numeric>;

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T, any> = VariableSetter<T, any>,
  SuccessOnly = boolean
> =
  | VariableSetSuccessResult<T, Source>
  | (SuccessOnly extends false
      ? {
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
        )
      : never);

export type VariableSetSuccessResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  source: Source;
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Unchanged
    | VariableResultStatus.Created;
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
        value: T;
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
  IfNoneMatch = 4,
}

export type VariablePatchTypeValue<
  Numeric extends boolean | undefined = boolean
> = ParsableEnumValue<typeof patchType, Numeric>;

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
  | {
      type: VariablePatchType.IfNoneMatch | "ifNoneMatch";
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
  | ((
      | VariableValueSetter<T, If<Validated, true, boolean>>
      | (VersionedVariableKey<If<Validated, true, boolean>> & {
          value: undefined;
        })
    ) & { patch?: undefined })
  | (VariablePatch<T, Validated> & { value?: never });

type MapVariableSetResult<Source, SuccessOnly = boolean> = [Source] extends [
  VariableSetResult<infer T, infer Source, any>
]
  ? VariableSetResult<T, Source, SuccessOnly>
  : Source extends VariableSetter<infer T>
  ? VariableSetResult<T, Source, SuccessOnly>
  : never;

export type VariableSetParameter<Validated> = VariableTupleOrArray<
  VariableSetter<any, Validated> | Nullish
>;

/** @internal */
export type ParseSuccessOnly<Throw> = Throw extends boolean
  ? Throw
  : Throw extends { throw: infer Throw }
  ? Throw & boolean
  : Throw extends { throw?: false }
  ? false
  : true;

export type VariableSetResults<
  K extends readonly any[] = any[],
  SuccessOnly extends boolean | { throw?: boolean } = false
> = K extends readonly []
  ? []
  : K extends readonly [infer Item, ...infer Rest]
  ? [
      MapVariableSetResult<Item, ParseSuccessOnly<SuccessOnly>>,
      ...VariableSetResults<Rest, ParseSuccessOnly<SuccessOnly>>
    ]
  : K extends readonly (infer T)[]
  ? MapVariableSetResult<T, ParseSuccessOnly<SuccessOnly>>[]
  : never;

export const isVariablePatch = <Validated>(
  setter: VariableSetter<any, Validated> | undefined
): setter is VariablePatch<any, Validated> => !!setter?.["patch"];

export const isVariablePatchAction = (
  setter: any
): setter is VariablePatchActionSetter => isFunction(setter["patch"]);

export const isScoped = <T>(value: any): value is T & VariableKey =>
  isDefined(value?.scope);

export const handleResultErrors: {
  <T, Throw = true>(
    result: VariableGetResult<T, any, false>,
    throwErrors?: Throw
  ): VariableGetResult<T, Throw>;
  <T, Source extends VariableSetter<T>, Throw = true>(
    result: VariableSetResult<T, Source>
  ): VariableSetResult<T, Source, Throw>;

  <
    T extends VariableGetResults | readonly (VariableGetResult | undefined)[],
    Throw extends boolean | { throw?: boolean } = true
  >(
    results: T,
    throwErrors?: Throw
  ): VariableGetResults<T, Throw>;
  <
    T extends VariableSetResults | readonly (VariableSetResult | undefined)[],
    Throw extends boolean | { throw?: boolean } = true
  >(
    results: T,
    throwErrors?: Throw
  ): VariableSetResults<T, Throw>;
} = (
  result: MaybeArray<VariableGetResult | VariableSetResult>,
  throwErrors?: any
) => {
  if ((throwErrors?.throw ?? throwErrors) === false) {
    return result;
  }

  if (isArray(result)) {
    result.forEach(handleResultErrors);
    return result as any;
  }

  return result.status < 400 || result.status === 404 // Not found can only occur for get requests, and those are all right.
    ? result
    : throwError(
        `${formatKey(
          (result as VariableSetResult).source ?? result
        )} could not be ${
          (result as VariableSetResult).source ||
          result.status !== VariableResultStatus.Error
            ? "set"
            : "read"
        } because ${
          result.status === VariableResultStatus.Conflict
            ? `of a conflict. The expected version '${result.source.version}' did not match the current version '${result.current?.version}'.`
            : result.status === VariableResultStatus.Denied
            ? result.error ?? "the operation was denied."
            : result.status === VariableResultStatus.Invalid
            ? result.error ?? "the value does not conform to the schema"
            : result.status === VariableResultStatus.ReadOnly
            ? "it is read only."
            : result.status === VariableResultStatus.Error
            ? `of an unexpected error: ${result.error}`
            : "of an unknown reason."
        }`
      );
};

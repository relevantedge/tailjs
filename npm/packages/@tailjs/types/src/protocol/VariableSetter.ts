import {
  EnumValue,
  If,
  IfNot,
  Is,
  IsAny,
  Json,
  MaybeArray,
  MaybePromise,
  MaybeUndefined,
  Nullish,
  OmitPartial,
  ParsedValue,
  PickPartial,
  PrettifyIntersection,
  ToggleReadonly,
  TupleOrArray,
  createEnumAccessor,
  isFunction,
} from "@tailjs/util";
import {
  Variable,
  VariableClassification,
  VariableGetter,
  VariableKey,
  VariableMetadata,
  VariableScope,
  VariableSuccessResults,
  VariableVersion,
  variableScope,
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
  Denied = 403,
  NotFound = 404,
  ReadOnly = 405,
  Conflict = 409,
  Unsupported = 501,
  Invalid = 400,
  Error = 500,
}

export const resultStatus = createEnumAccessor(
  VariableResultStatus as typeof VariableResultStatus,
  false,
  "variable set status"
);

export type ResultStatusValue<Numeric extends boolean | undefined = boolean> =
  EnumValue<
    typeof VariableResultStatus,
    VariableResultStatus,
    false,
    Numeric
  > extends infer T
    ? T
    : never;

type PickScopeAndTarget<T> = T extends { scope: infer Scope }
  ? T extends { targetId: infer Target }
    ? { scope: ParsedValue<typeof variableScope, Scope>; targetId: Target }
    : { scope: ParsedValue<typeof variableScope, Scope> }
  : {};

type KeepVariableTarget<Source extends VariableSetter, T> = T extends undefined
  ? undefined
  : PickScopeAndTarget<Source> & Omit<Variable<T, true>, "scope" | "targetId">;

type VariableSetResultValue<Source extends VariableSetter> =
  PrettifyIntersection<
    KeepVariableTarget<Source, VariableSetResultValue_<Source>>
  >;

type VariableSetResultValue_<Source extends VariableSetter> = Source extends {
  patch: infer R & {};
}
  ? R extends (current: any) => infer R | { value: infer T }
    ?
        | (T extends undefined ? undefined : T)
        | (R extends undefined ? undefined : never)
    : R extends { match: any; value: infer T }
    ? T extends undefined
      ? undefined
      : T
    : R extends { type: VariablePatchTypeValue }
    ? number
    : never
  : Source extends { value: infer T }
  ? T extends undefined
    ? undefined
    : T
  : never;

export type VariableSetResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> =
  | VariableSetSuccessResult<T, Source>
  | ({
      source: Source;
    } & (
      | {
          status: VariableResultStatus.Conflict;
          current: VariableSetResultValue<Source>;
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
    ));

export type VariableSetSuccessResult<
  T = any,
  Source extends VariableSetter<T> = VariableSetter<T>
> = {
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Unchanged
    | (VariableSetResultValue<Source> extends undefined
        ? never
        : VariableResultStatus.Created);

  current: VariableSetResultValue<Source>;

  source: Source;
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
> = EnumValue<
  typeof VariablePatchType,
  VariablePatchType,
  false,
  Numeric
> extends infer T
  ? T
  : never;

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
      /**
       * The amount to add (subtract if negative).
       */
      by: number;
      /**
       * The initial value if none exists.
       * @default 0
       */
      seed?: number;
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

export type VariableValueSetter<T = any, Validated = false> = (
  | PickPartial<
      Variable<T, If<Validated, true, boolean>>,
      "classification" | "purposes" | "version"
    >
  | (OmitPartial<
      Variable<T, If<Validated, true, boolean>>,
      keyof VariableKey
    > & { value: undefined })
) & {
  /**
   * Ignore versioning (optimistic concurrency), and save the value regardless.
   * Consider your scenario before doing this.
   */
  force?: boolean;
};

/**
 * Defines options for creating, updating or deleting a variable.
 */
export type VariableSetter<
  T = any,
  K extends string = string,
  Validated = boolean
> = { key: K } & (
  | (VariableValueSetter<T, Validated> & { patch?: undefined })
  | (VariablePatch<T, Validated> & { value?: undefined })
);

export type VariableSetters<
  SetterType extends Partial<VariableSetter<any>> | boolean,
  Inferred extends VariableSetters<SetterType> = never
> =
  | Inferred
  | TupleOrArray<
      | (SetterType extends boolean
          ? VariableSetter<any, string, SetterType>
          : SetterType)
      | Nullish
    >;

export type MapVariableSetResult<Source> = Source extends VariableSetter<
  infer T
>
  ? VariableSetResult<T, Source>
  : never;

export type VariableSetResults<K extends readonly any[] = any[]> =
  K extends readonly []
    ? []
    : K extends readonly [infer Item, ...infer Rest]
    ? [MapVariableSetResult<Item>, ...VariableSetResults<Rest>]
    : K extends readonly (infer T)[]
    ? MapVariableSetResult<T>[]
    : never;

type StripPatchFunctionItems<
  T extends readonly (VariableGetter | VariableSetter)[]
> = T extends readonly []
  ? []
  : T extends readonly [infer T, ...infer Rest]
  ? [
      StripPatchFunctions<T & (VariableGetter | VariableSetter)>,
      ...StripPatchFunctionItems<
        Rest & readonly (VariableGetter | VariableSetter)[]
      >
    ]
  : T extends readonly any[]
  ? ToggleReadonly<StripPatchFunctions<T[number]>[], T>
  : never;

export type StripPatchFunctions<
  T extends MaybeArray<VariableGetter | VariableSetter | Nullish, true>
> = T extends Nullish
  ? T
  : T extends readonly any[]
  ? StripPatchFunctionItems<T>
  : T extends VariableGetter
  ? T & { init?: Json }
  : Exclude<VariableSetter, VariablePatchActionSetter>;

export const isVariablePatch = <Validated>(
  setter: VariableSetter<any, string, Validated> | undefined
): setter is VariablePatch<any, Validated> => !!setter?.["patch"];

export const isVariablePatchAction = (
  setter: any
): setter is VariablePatchActionSetter => isFunction(setter["patch"]);

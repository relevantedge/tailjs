import {
  EnumValue,
  If,
  Json,
  MaybeArray,
  MaybePromise,
  Nullish,
  ParsedValue,
  PartialExcept,
  PickPartial,
  PrettifyIntersection,
  ReplaceProperties,
  ToggleReadonly,
  TupleOrArray,
  createEnumAccessor,
  isFunction,
} from "@tailjs/util";
import {
  Variable,
  VariableGetter,
  VariableKey,
  VariableMetadata,
  VariableResultStatus,
  VariableUsage,
  VariableVersion,
  variableScope,
} from "..";

/**
 * Defines options for creating, updating or deleting a variable.
 */
export type VariableSetter<
  T = any,
  K extends string = string,
  Validated = boolean
> = { key: K } & (
  | (VariableValueSetter<T, Validated> & { patch?: undefined })
  | VariablePatch<T, Validated>
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

export interface VariablePatchSource<T = any> extends Variable<T> {
  value: T;
}

export type VariablePatchResult<T = any, Validated = boolean> =
  | (VariableMetadata &
      (Partial<VariableUsage<If<Validated, true, boolean>>> & {
        value: T;
      }))
  | undefined;

export type VariablePatchAction<T = any, Validated = boolean> = (
  current: VariablePatchSource<T> | undefined
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

export type VariableValueSetter<T = any, Validated = false> = (
  | PickPartial<
      Variable<T, If<Validated, true, boolean>>,
      "classification" | "purposes" | "version"
    >
  | (PartialExcept<
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

export type VariableValuePatchSetter<
  T = any,
  Validated = boolean
> = VariableKey<If<Validated, true, boolean>> &
  Partial<Variable<T, If<Validated, true, boolean>>> &
  Partial<VariableUsage<If<Validated, true, boolean>>> &
  ({
    selector?: string;
  } & (
    | {
        patch: VariablePatchType.Add | "add";
        /**
         * The amount to add (subtract if negative).
         */
        value: number;
        /**
         * The initial value if none exists.
         * @default 0
         */
        seed?: number;
      }
    | {
        patch: VariablePatchType.Min | VariablePatchType.Max | "min" | "max";
        value: number;
      }
    | {
        patch:
          | VariablePatchType.IfMatch
          | "ifMatch"
          | VariablePatchType.IfNoneMatch
          | "ifNoneMatch";
        match: T | undefined;
        value: T | undefined;
      }
  ));

export type VariablePatchActionSetter<
  T = any,
  Validated = boolean
> = VariableKey<If<Validated, true, boolean>> &
  VariableKey &
  Partial<Variable<T, If<Validated, true, boolean>>> & {
    patch: VariablePatchAction<T, Validated>;
    value?: undefined;
  };

export type VariablePatch<T = any, Validated = boolean> =
  | VariablePatchActionSetter<T, Validated>
  | VariableValuePatchSetter<T, Validated>;

export type StripPatchFunctions<
  T extends MaybeArray<VariableGetter | VariableSetter | Nullish, true>
> = T extends Nullish
  ? T
  : T extends readonly any[]
  ? StripPatchFunctionItems<T>
  : T extends VariableGetter
  ? T & { init?: Json }
  : Exclude<VariableSetter, VariablePatchActionSetter>;

export const isVariablePatchAction = (
  setter: any
): setter is { patch: VariablePatchAction } => isFunction(setter?.["patch"]);

/**
 * Any variable setter that only has numeric enum values.
 */
export type ValidatedVariableSetter = VariableSetter<any, string, true>;

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

type PickScopeAndTarget<T> = T extends { scope: infer Scope }
  ? T extends { targetId: infer Target }
    ? { scope: ParsedValue<typeof variableScope, Scope>; targetId: Target }
    : { scope: ParsedValue<typeof variableScope, Scope> }
  : {};

type KeepVariableTarget<Source extends VariableSetter, T> = T extends undefined
  ? undefined
  : ReplaceProperties<Variable<T, true>, PickScopeAndTarget<Source>>;

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

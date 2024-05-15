import {
  DataClassification,
  DataPurposeFlags,
  MapVariableGetResult,
  MapVariableSetResult,
  RestrictVariableTargets,
  StripPatchFunctions,
  Variable,
  VariableEnumProperties,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  variableScope,
} from "@tailjs/types";
import {
  EnumValue,
  GeneralizeConstants,
  If,
  IfNot,
  IsAny,
  MaybeUndefined,
  Nullish,
  PrettifyIntersection,
  ToggleArray,
  UnknownIsAny,
  createEnumAccessor,
  createEnumPropertyParser,
} from "@tailjs/util";

import type { LocalID, VariableScopeValue, View } from "@tailjs/types";

export type ReferringViewData = [
  viewId: LocalID,
  relatedEventId: LocalID | undefined
];

type ReservedVariableDefinitions = {
  view: View;
  tags: string[];
  rendered: boolean;
  consent: boolean;
  loaded: boolean;
  index: number;
  scripts: Record<string, "pending" | "loaded" | "failed">;
  referrer: ReferringViewData;
};

export type ReservedVariableType<
  K,
  Default = any
> = K extends ReservedVariableKey
  ? ReservedVariableDefinitions[K]
  : UnknownIsAny<Default>;

export type ReservedVariableKey = keyof ReservedVariableDefinitions;

export type LocalVariableKey = ReservedVariableKey | (string & {});

export enum LocalVariableScope {
  /** Variables are only available in memory in the current view. */
  View = -3,

  /** Variables are only available in memory in the current tab, including between views in the same tab as navigation occurs. */
  Tab = -2,

  /** Variables are only available in memory and shared between all tabs. */
  Shared = -1,
}

export const localVariableScope = createEnumAccessor(
  LocalVariableScope as typeof LocalVariableScope,
  false,
  "local variable scope"
);

export const anyVariableScope = (scope: string | number) =>
  localVariableScope.tryParse(scope) ?? variableScope(scope);

export type LocalVariableScopeValue<
  Numeric extends boolean | undefined = boolean
> = EnumValue<
  typeof LocalVariableScope,
  LocalVariableScope,
  false,
  Numeric
> extends infer T
  ? T
  : never;

export type LocalVariableHeader<NumericEnums extends boolean = boolean> = {
  key: LocalVariableKey;
  scope: LocalVariableScopeValue<NumericEnums>;
  targetId?: undefined;
  classification?: DataClassification.Anonymous;
  purposes?: DataPurposeFlags.Necessary;
  version?: string;
};

export type ReservedVariables<
  K extends ReservedVariableKey = ReservedVariableKey
> = K extends infer K
  ? LocalVariable<
      ReservedVariableDefinitions[K & ReservedVariableKey],
      K & string
    >
  : never;

type LocalVariable<
  T = unknown,
  K extends string = LocalVariableKey,
  NumericEnums extends boolean = true
> = PrettifyIntersection<
  {
    key: K;
    value: T;
  } & LocalVariableHeader<NumericEnums>
>;

type LocalVariableGetResult<
  T = any,
  K = LocalVariableKey,
  Patched = false
> = PrettifyIntersection<
  (
    | ({
        status:
          | VariableResultStatus.Success
          | VariableResultStatus.Unchanged
          | VariableResultStatus.Created;
      } & LocalVariable<T, K & string>)
    | IfNot<
        Patched,
        {
          status: VariableResultStatus.NotFound;
          value?: undefined;
        }
      >
  ) &
    LocalVariableHeader<true> & { key: K }
>;

type LocalVariableSetResult<T, Source> = PrettifyIntersection<{
  source: Source;
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Unchanged
    | VariableResultStatus.Created;
  current: Source extends { value: infer Value }
    ? Value extends undefined
      ? undefined
      : LocalVariable<T, Source extends { key: infer K } ? K & string : string>
    : never;
}>;
export type ClientVariable<
  T = any,
  K extends string = string,
  Local = boolean
> = Local extends true
  ? LocalVariable<T, K>
  : { key: K } & Omit<RestrictVariableTargets<Variable<T>>, "key">;

export type VariableCacheSettings = {
  /**
   * The maximum number of milliseconds the value of this variable can be cached.
   * If omitted or `true` the default value of 3 seconds will be used.
   * `false` or 0 means the variable will not be cached.
   */
  cache?: number | boolean;
};

export type ClientVariableCallback<
  T = any,
  K extends string = string & {},
  Local = boolean
> = (
  value: ClientVariable<T, K, Local> | undefined,
  previous: ClientVariable<T, K, Local> | undefined,
  poll: () => void
) => void;

export type ClientVariableGetter<
  T = any,
  K extends string = string & {},
  Local = boolean
> = PrettifyIntersection<
  (Local extends true
    ? { key: K } & LocalVariableHeader & {
          init?: { value: GeneralizeConstants<T> | undefined };
        }
    : StripPatchFunctions<
        RestrictVariableTargets<VariableGetter<T, K, false>, true>
      >) & {
    /**
     * A callback to do something with the result.
     * If the second function is invoked the variable will be polled for changes, and the callback will be invoked
     * next time the value changes. To keep polling, keep calling the poll function every time the callback is invoked.
     */
    result?: ToggleArray<ClientVariableCallback<T, K, Local>>;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (
      result: ClientVariableGetResult<T, K, boolean, Local>,
      error: string
    ) => void | boolean;

    /**
     * Do not accept a cached version of the variable.
     */
    refresh?: boolean;
  } & VariableCacheSettings
>;

export type ClientVariableSetter<
  T = any,
  K extends string = string,
  Local extends boolean = boolean
> = PrettifyIntersection<
  (Local extends true
    ? LocalVariable<GeneralizeConstants<T> | undefined, K, boolean> & {
        patch?: undefined;
      }
    : StripPatchFunctions<
        RestrictVariableTargets<VariableSetter<T, K, false>, true>
      >) & {
    /** A callback that will get invoked when the set operation has completed. */
    result?: (
      current: ClientVariable<T, K, Local> | undefined,
      source: Local extends true
        ? ClientVariableSetter<any, any, true>
        : ClientVariableSetter<any, any, false>
    ) => void;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (
      result: ClientVariableSetResult<
        any,
        Local extends true
          ? ClientVariableSetter<any, any, true>
          : ClientVariableSetter<any, any, false>
      >,
      error: string
    ) => void | boolean;
  } & VariableCacheSettings
>;

export type ClientScopeValue<
  NumericEnums extends boolean = boolean,
  Local extends boolean = boolean
> = Local extends true
  ? LocalVariableScopeValue<NumericEnums>
  : VariableScopeValue<NumericEnums>;

export type ClientVariableKey<
  NumericEnums extends boolean = boolean,
  Local extends boolean = boolean
> = Local extends false
  ? VariableKey<NumericEnums>
  : { key: string; scope: LocalVariableScopeValue<NumericEnums> };

type MapLocalGetResult<Getter> = Getter extends ClientVariableGetter<
  infer T,
  infer K & string,
  true
>
  ? LocalVariableGetResult<
      ReservedVariableType<K, T>,
      K,
      Getter extends { init: { value?: infer V } }
        ? If<IsAny<V>, false, undefined extends V ? false : true>
        : false
    >
  : Getter extends Nullish
  ? undefined
  : never;

type MapLocalSetResult<Setter> = Setter extends ClientVariableSetter<
  infer T,
  infer K & string,
  true
>
  ? LocalVariableSetResult<
      T extends undefined ? undefined : ReservedVariableType<K, T>,
      Setter
    >
  : Setter extends Nullish
  ? undefined
  : never;

type MapClientVariableResult<P, Getter> = P extends {
  scope: LocalVariableScopeValue;
}
  ? If<Getter, MapLocalGetResult<P>, MapLocalSetResult<P>>
  : RestrictVariableTargets<
      If<Getter, MapVariableGetResult<P>, MapVariableSetResult<P>>
    >;

export type ClientVariableGetResult<
  T = any,
  K extends string = string,
  Patched = boolean,
  Local = boolean
> = Local extends true
  ? LocalVariableGetResult<T, K, Patched>
  : RestrictVariableTargets<VariableGetResult<T, K, Patched>>;

export type ClientVariableSetResult<
  T = any,
  Source extends ClientVariableSetter = ClientVariableSetter<
    any,
    string,
    boolean
  >
> = Source extends ClientVariableSetter<any, any, true>
  ? LocalVariableSetResult<T, Source>
  : Source extends ClientVariableSetter<any, any, false>
  ? RestrictVariableTargets<VariableSetResult<T, Source>>
  : any;

export type ClientVariableResults<
  P extends readonly any[],
  Getters
> = P extends readonly []
  ? []
  : P extends readonly [infer Result, ...infer Rest]
  ? readonly [
      MapClientVariableResult<Result, Getters>,
      ...ClientVariableResults<Rest, Getters>
    ]
  : P extends readonly (infer Result)[]
  ? readonly MapClientVariableResult<Result, Getters>[]
  : never;

export const isLocalScopeKey = (
  key: any
): key is {
  scope: LocalVariableScopeValue;
} => !!localVariableScope.tryParse(key?.scope);

export const toNumericVariableEnums = createEnumPropertyParser(
  { scope: localVariableScope },
  VariableEnumProperties
);

export const variableKeyToString: <
  S extends ClientVariableKey | { source?: ClientVariableKey }
>(
  key: S
) => MaybeUndefined<S, string> = (key: any): any =>
  key == null
    ? undefined
    : key.source
    ? variableKeyToString(key.source)!
    : `${anyVariableScope(key.scope)}\0${key.key}\0${key.targetId ?? ""}`;

export const stringToVariableKey = (key: string): ClientVariableKey => {
  const parts = key.split("\0");
  return {
    scope: +parts[0],
    key: parts[1],
    targetId: parts[2],
  } as any;
};

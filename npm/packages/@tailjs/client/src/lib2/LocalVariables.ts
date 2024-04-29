import {
  DataClassification,
  DataPurposeFlags,
  MapVariableGetResult,
  MapVariableSetResult,
  RestrictVariableTargets,
  StripPatchFunctions,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  variableScope,
} from "@tailjs/types";
import {
  GeneralizeConstants,
  If,
  IfNot,
  IsAny,
  MaybeArray,
  Nullish,
  PrettifyIntersection,
  UnknownAny,
} from "@tailjs/util";

import type { View } from "@tailjs/types";

type ReservedVariableDefinitions = {
  view: View;
  tags: string[];
  rendered: boolean;
  consent: boolean;
  loaded: boolean;
  scripts: Record<string, "pending" | "loaded" | "failed">;
};

export type ReservedVariableType<
  K,
  Default = any
> = K extends ReservedVariableKey
  ? ReservedVariableDefinitions[K]
  : UnknownAny<Default>;

export type ReservedVariableKey = keyof ReservedVariableDefinitions;

export type LocalVariableKey = ReservedVariableKey | (string & {});

export type LocalVariableScope<NumericEnums extends boolean = boolean> =
  NumericEnums extends true ? -1 : "local";

export type LocalVariableHeader<NumericEnums extends boolean = boolean> = {
  key: LocalVariableKey;
  scope: LocalVariableScope<NumericEnums>;
  targetId?: undefined;
  classification?: DataClassification.Anonymous;
  purposes?: DataPurposeFlags.Necessary;
  version?: undefined;
};

export type ReservedVariables<
  K extends ReservedVariableKey = ReservedVariableKey
> = K extends infer K
  ? LocalVariable<
      ReservedVariableDefinitions[K & ReservedVariableKey],
      K & string
    >
  : never;

export type LocalVariable<
  T = unknown,
  K extends string = LocalVariableKey,
  NumericEnums extends boolean = true
> = PrettifyIntersection<
  {
    key: K;
    value: T;
  } & LocalVariableHeader<NumericEnums>
>;

type LocalGetResult<
  T = any,
  K = LocalVariableKey,
  Patched = false
> = PrettifyIntersection<
  | ({
      status:
        | VariableResultStatus.Success
        | VariableResultStatus.Unchanged
        | VariableResultStatus.Created;
    } & LocalVariable<T, K & string>)
  | IfNot<
      Patched,
      LocalVariableHeader<true> & { key: K } & {
        status: VariableResultStatus.NotFound;
        value?: undefined;
      }
    >
>;

type LocalSetResult<T, Source> = PrettifyIntersection<{
  source: Source;
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Unchanged
    | VariableResultStatus.Created;
  current: Source extends { value: undefined }
    ? undefined
    : LocalVariable<T, Source extends { key: infer K } ? K & string : string>;
}>;
export type ClientVariable<
  T = any,
  K extends string = string,
  Local = boolean
> = Local extends true
  ? LocalVariable<T, K>
  : { key: K } & Omit<Variable<T>, "key">;

export type VariableCacheSettings = {
  /**
   * The maximum number of milliseconds the value of this variable can be cached.
   * If omitted or `true` the default value of 3 seconds will be used.
   * `false` or 0 means the variable will not be cached.
   */
  cache?: number | boolean;
};

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
     * once when the value changes. To keep polling, keep calling the poll function every time the callback is invoked.
     */
    result?: MaybeArray<
      (
        value: ClientVariable<T, K, Local> | undefined,
        poll: (toggle?: boolean) => void
      ) => void
    >;

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

export type ClientVariableKey =
  | VariableKey
  | { key: string; scope: LocalVariableScope };

type MapLocalGetResult<Getter> = Getter extends ClientVariableGetter<
  infer T,
  infer K & string,
  true
>
  ? LocalGetResult<
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
  ? LocalSetResult<
      T extends undefined ? undefined : ReservedVariableType<K, T>,
      Setter
    >
  : Setter extends Nullish
  ? undefined
  : never;

type MapClientVariableResult<P, Getter> = P extends {
  scope: LocalVariableScope;
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
  ? LocalGetResult<T, K, Patched>
  : RestrictVariableTargets<VariableGetResult<T, K, Patched>>;

export type ClientVariableSetResult<
  T = any,
  Source extends ClientVariableSetter = ClientVariableSetter<
    any,
    string,
    boolean
  >
> = Source extends ClientVariableSetter<any, any, true>
  ? LocalSetResult<T, Source>
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
): key is { scope: LocalVariableScope } =>
  key?.scope === -1 || key?.scope === "local";

export const variableKeyToString = (key: ClientVariableKey): string =>
  `${isLocalScopeKey(key) ? "l" : variableScope(key.scope)}\0${key.key}\0${
    isLocalScopeKey(key) ? "" : key.targetId ?? ""
  }`;

export const stringToVariableKey = (key: string): ClientVariableKey => {
  const parts = key.split("\0");
  return parts[0] === "l"
    ? { key: parts[1], scope: -1 }
    : ({
        scope: variableScope(parts[0]),
        key: parts[1],
        targetId: parts[2],
      } as any);
};

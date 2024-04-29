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
  VariableSetter,
  variableScope,
} from "@tailjs/types";
import {
  GeneralizeConstants,
  If,
  IfNot,
  IsAny,
  MaybeArray,
  PrettifyIntersection,
  UnknownAny,
} from "@tailjs/util";
import { ReservedVariableTypes } from "..";

export type ReservedVariableType<
  K,
  Default = any
> = K extends ReservedVariableKey ? ReservedVariableTypes[K] : Default;

export type ReservedVariableKey = keyof ReservedVariableTypes;

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
  ? LocalVariable<ReservedVariableTypes[K & ReservedVariableKey], K & string>
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

export type RemoteVariableGetter<T = any> = StripPatchFunctions<
  RestrictVariableTargets<VariableGetter<T, false>, true>
> & { local?: false };

export type LocalVariableGetter<
  T = any,
  K extends string = LocalVariableKey
> = PrettifyIntersection<
  { key: K } & LocalVariableHeader & {
      init?: { value: GeneralizeConstants<T> | undefined };
    }
>;

export type LocalVariableSetter<
  T = any,
  K extends string = LocalVariableKey
> = LocalVariable<GeneralizeConstants<T> | undefined, K, boolean> & {
  patch?: undefined;
};

export type RemoteVariableSetter<T = any> = PrettifyIntersection<
  StripPatchFunctions<
    RestrictVariableTargets<VariableSetter<T, false>, true>
  > & { local?: false }
>;

export type LocalGetResult<
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

export type LocalSetResult<
  T = any,
  Source = LocalVariableSetter
> = PrettifyIntersection<{
  source: Source;
  status:
    | VariableResultStatus.Success
    | VariableResultStatus.Unchanged
    | VariableResultStatus.Created;
  current: LocalVariable<
    T,
    Source extends { key: infer K } ? K & string : string
  >;
}>;
export type ClientVariable<T = any> =
  | (Variable<T> & { local?: false })
  | LocalVariable<T>;

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
  K extends string = string
> = PrettifyIntersection<
  (RemoteVariableGetter | LocalVariableGetter<T, K>) & {
    /**
     * A callback to do something with the result.
     * If the second function is invoked the variable will be polled for changes, and the callback will be invoked
     * once when the value changes. To keep polling, keep calling the poll function every time the callback is invoked.
     */
    result?: MaybeArray<
      (
        value: ClientVariable<any> | undefined,
        poll: (toggle?: boolean) => void
      ) => void
    >;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (result: VariableGetResult, error: string) => void | boolean;

    /**
     * Do not accept a cached version of the variable.
     */
    refresh?: boolean;
  } & VariableCacheSettings
>;

export type ClientVariableSetter<T = any> = PrettifyIntersection<
  (LocalVariableSetter<T> | RemoteVariableSetter<T>) & {
    /** A callback that will get invoked when the set operation has completed. */
    result?: (
      current: ClientVariable<any> | undefined,
      source: ClientVariableSetter<T>
    ) => void;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (result: VariableGetResult, error: string) => void | boolean;
  } & VariableCacheSettings
>;

export type ClientVariableKey =
  | VariableKey
  | { key: string; scope: LocalVariableScope };

type MapLocalGetResult<Getter> = Getter extends LocalVariableGetter<
  infer T,
  infer K & string
>
  ? LocalGetResult<
      ReservedVariableType<K, UnknownAny<T>>,
      K,
      Getter extends { init: { value?: infer V } }
        ? If<IsAny<V>, false, undefined extends V ? false : true>
        : false
    >
  : never;

type MapLocalSetResult<Setter> = Setter extends LocalVariableSetter<
  infer T,
  infer K & string
>
  ? LocalSetResult<ReservedVariableType<K, UnknownAny<T>>, Setter>
  : never;

type MapClientVariableResult<P, Getter> = P extends {
  scope: LocalVariableScope;
}
  ? If<Getter, MapLocalGetResult<P>, MapLocalSetResult<P>>
  : RestrictVariableTargets<
      If<Getter, MapVariableGetResult<P>, MapVariableSetResult<P>>
    >;

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

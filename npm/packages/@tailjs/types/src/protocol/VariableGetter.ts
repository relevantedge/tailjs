import {
  If,
  MaybePromise,
  Nullish,
  ParsedValue,
  PrettifyIntersection,
  TupleOrArray,
  UnknownAny,
  Wrapped,
} from "@tailjs/util";
import {
  DataPurposeValue,
  Variable,
  VariableClassification,
  VariableKey,
  VariablePatchResult,
  VariableResultStatus,
  VersionedVariableKey,
  variableScope,
} from "..";

export type VariableInitializerResult<
  T = any,
  Validated = true
> = (Validated extends true
  ? VariableClassification<true>
  : Partial<VariableClassification<boolean>>) & {
  value: T;
};

export type VariableInitializer<T = any, Validated = true> = Wrapped<
  MaybePromise<VariableInitializerResult<T, Validated> | undefined>
>;

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified and the variable is only stored for other purposes, a result will also not be returned. (best practice)
 */
export interface VariableGetter<T = any, Validated = false>
  extends VersionedVariableKey<Validated extends true ? true : boolean> {
  /**
   * If the variable does not exist, it will be created with the value returned from this function.
   * Since another value from another process may have been used at the same time,
   * you cannot trust that just because the function was called, its value was used.
   *
   * However, it is guaranteed that the returned value is the most current at the time the request was made.
   */
  init?: VariableInitializer<T, Validated>;

  /**
   * Optionally, the purpose the variable will be used for in the context it is requested.
   *
   * A variable may be used for multiple purposes but only stored for the purpose a user has consented to.
   * For example, a user's country may be used both in analytics and for personalization purposes.
   * However, if the user has only consented to "Performance", but not "Functionality", the value must not be used for personalization.
   *
   * It should be considered best practice always to include the intended purpose when requesting data about the user
   * to be sure their consent is respected.
   *
   * It is currently not mandatory to specify the purpose but this requirement may change in the future.
   */
  purpose?: DataPurposeValue<If<Validated, true, boolean>>;

  /**
   * Indicates that the value must be re-read from the source storage if a caching layer is used on top.
   */
  refresh?: boolean;
}

export type VariableGetterArray<GetterType extends VariableGetter> = readonly (
  | GetterType
  | Nullish
)[];

export type VariableGetters<
  GetterType extends Partial<VariableGetter<any>> | boolean,
  Inferred extends VariableGetters<GetterType> = never
> =
  | Inferred
  | TupleOrArray<
      | (GetterType extends boolean
          ? VariableGetter<any, GetterType>
          : GetterType)
      | Nullish
    >;

/**
 * The result of a get request made to a {@link ReadonlyVariableStorage}.
 */
export type VariableGetResult<T = any, Patched = boolean> =
  | VariableGetSuccessResult<T>
  | VariableGetError<Patched>;

export interface VariableGetError<Patched = boolean> extends VariableKey<true> {
  /**
   * Apart from the generic error status, these statuses are only possible if the getter has an initializer.
   */
  status:
    | If<
        Patched,
        | VariableResultStatus.ReadOnly
        | VariableResultStatus.Denied
        | VariableResultStatus.Invalid
      >
    | VariableResultStatus.Error;
  error?: any;
  value?: undefined;
}

export type VariableGetSuccessResult<T = any> = (
  | ({
      status:
        | VariableResultStatus.Success
        | VariableResultStatus.Unchanged
        | VariableResultStatus.Created;

      value: Exclude<UnknownAny<T>, undefined>;
    } & Variable<T, true>)
  | (T extends undefined
      ? {
          status: VariableResultStatus.NotFound;
          value?: undefined;
        } & VariableKey<true>
      : never)
) & {
  error?: undefined;
};

type MapGetResultKey<T, Getter> = PrettifyIntersection<
  (Getter extends VariableKey
    ? {
        key: Getter["key"];
        scope: ParsedValue<typeof variableScope, Getter["scope"]>;
        targetId: Getter["targetId"];
      }
    : {}) &
    VariableGetResult<
      T,
      Getter extends {
        init?: Wrapped<MaybePromise<undefined>>;
      }
        ? false
        : true
    >
>;

export type MapVariableGetResult<Getter> = [
  Exclude<Getter, VariableGetError>
] extends [VariableGetResult<infer T>]
  ? MapGetResultKey<T, Getter>
  : Getter extends VariableGetter<infer T>
  ? Getter extends {
      init: Wrapped<MaybePromise<infer R>>;
    }
    ? [R] extends [VariablePatchResult<infer T, any> | undefined]
      ? MapGetResultKey<T | Extract<R, undefined>, Getter>
      : never
    : MapGetResultKey<T | undefined, Getter>
  : Getter extends Nullish
  ? undefined
  : unknown extends Getter
  ? MapGetResultKey<unknown, Getter>
  : never;

export type VariableGetResults<K extends readonly any[] = any[]> =
  any[] extends K
    ? MapVariableGetResult<any>[]
    : K extends readonly []
    ? []
    : K extends readonly [infer Item, ...infer Rest]
    ? [MapVariableGetResult<Item>, ...VariableGetResults<Rest>]
    : K extends readonly (infer T)[]
    ? MapVariableGetResult<T>[]
    : never;

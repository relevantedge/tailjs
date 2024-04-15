import {
  If,
  MaybePromise,
  MaybeUndefined,
  Nullish,
  ParsedValue,
  PrettifyIntersection,
  UnknownAny,
  VariableTupleOrArray,
} from "@tailjs/util";
import {
  DataPurposeValue,
  ParseSuccessOnly,
  Variable,
  VariableClassification,
  VariableKey,
  VariablePatchResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetSuccessResult,
  VersionedVariableKey,
  variableScope,
} from "..";

export type VariableInitializerResult<
  T = any,
  Validated = true
> = (Validated extends true
  ? VariableClassification<true>
  : Partial<VariableClassification<If<Validated, true, boolean>>>) & {
  value: T;
};
export type VariableInitializer<T = any, Validated = true> = () => MaybePromise<
  VariableInitializerResult<T, Validated> | undefined
>;

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified and the variable is only stored for other purposes, a result will also not be returned. (best practice)
 */
export interface VariableGetter<T = any, Validated = boolean>
  extends VersionedVariableKey<If<Validated, true, boolean>> {
  /**
   * If the variable does not exist, it will be created with the value returned from this function.
   * Since another value from another process may have been used at the same time,
   * you cannot trust that just because the function was called, its value was used.
   *
   * However, it is guaranteed that the returned value is the most current at the time the request was made.
   */
  initializer?: VariableInitializer<T, If<Validated, true, boolean>>;

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

export type VariableGetParameter<Validated> = VariableTupleOrArray<
  VariableGetter<any, Validated> | Nullish
>;

/**
 * The result of a get request made to a {@link ReadonlyVariableStorage}.
 */
export type VariableGetResult<T = any, Patched = boolean, Success = boolean> =
  | VariableGetSuccessResult<T>
  | (Success extends false ? VariableGetError<Patched> : never);

export interface VariableGetError<Patched = boolean> extends VariableKey {
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

export type VariableGetSuccessResult<T = any> =
  | (Variable<T, true> & {
      status:
        | VariableResultStatus.Success
        | VariableResultStatus.Unchanged
        | VariableResultStatus.Created;

      value: Exclude<UnknownAny<T>, undefined>;
    })
  | (T extends undefined
      ? VariableKey & {
          status: VariableResultStatus.NotFound;
          value?: undefined;
        }
      : never);

type GetResultWithKey<T, SuccessOnly, Getter> = (Getter extends VariableKey
  ? {
      key: Getter["key"];
      targetId: Getter["targetId"];
      scope: ParsedValue<typeof variableScope, Getter["scope"]>;
    }
  : {}) &
  VariableGetResult<
    T,
    Getter extends {
      initializer?(): MaybePromise<undefined>;
    }
      ? false
      : true,
    SuccessOnly
  >;

type MapVariableGetResult<Getter, SuccessOnly = boolean> = PrettifyIntersection<
  [Exclude<Getter, VariableGetError>] extends [VariableGetResult<infer T>]
    ? GetResultWithKey<T, SuccessOnly, Getter>
    : Getter extends VariableGetter<infer T>
    ? Getter extends {
        initializer(): MaybePromise<infer R>;
      }
      ? R extends VariablePatchResult<infer T, any>
        ? GetResultWithKey<T, SuccessOnly, Getter>
        : GetResultWithKey<UnknownAny<T | undefined>, SuccessOnly, Getter>
      : GetResultWithKey<T | undefined, SuccessOnly, Getter>
    : Getter extends Nullish
    ? undefined
    : unknown extends Getter
    ? GetResultWithKey<unknown, SuccessOnly, Getter>
    : never
>;

export type VariableGetResults<
  K extends readonly any[] = any[],
  SuccessOnly extends boolean | { throw?: boolean } = false
> = any[] extends K
  ? MapVariableGetResult<any, ParseSuccessOnly<SuccessOnly>>[]
  : K extends readonly []
  ? []
  : K extends readonly [infer Item, ...infer Rest]
  ? [
      MapVariableGetResult<Item, ParseSuccessOnly<SuccessOnly>>,
      ...VariableGetResults<Rest, ParseSuccessOnly<SuccessOnly>>
    ]
  : K extends readonly (infer T)[]
  ? MapVariableGetResult<T, ParseSuccessOnly<SuccessOnly>>[]
  : never;

export const getResultVariable = (
  result: VariableGetResult | VariableSetResult | undefined
): Variable<true> | undefined =>
  result?.status! < 400
    ? (result as VariableSetResult).current ?? (result as Variable)
    : undefined;

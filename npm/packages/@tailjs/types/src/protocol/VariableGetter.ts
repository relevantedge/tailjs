import { If, MaybePromise, Not, Nullish, eq, throwError } from "@tailjs/util";
import {
  DataPurposeValue,
  Variable,
  VariableClassification,
  VariableKey,
  VariablePatchResult,
  VariableResultStatus,
  VersionedVariableKey,
  formatKey,
  toNumericVariable,
} from "..";

export type VariableInitializerResult<
  T = any,
  Validated = true
> = (Validated extends true
  ? VariableClassification<true>
  : Partial<VariableClassification<If<Validated, true, boolean>>>) & {
  value: T | undefined;
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

/**
 * The result of a get request made to a {@link ReadonlyVariableStorage}.
 */
export type VariableGetResult<T = any, Validated = true> = {
  /**
   * The initializer was used to create the variable.
   */
  initialized?: boolean;

  /**
   * The variable has not changed since the version requested.
   */
  unchanged?: boolean;
} & (VariableGetError | VariableGetSuccessResult<T>) &
  If<
    Not<Validated>,
    {
      /* If an error occurred this method will throw it, otherwise it will return the result with numeric enum values.  */
      validate(): Exclude<VariableGetResult<T, true>, VariableGetError>;
    },
    {}
  >;

export interface VariableGetError extends VariableKey {
  /**
   * The denied and readonly statuses can only occur if an initializer was provided with the get request.
   */
  status:
    | VariableResultStatus.NotFound
    | VariableResultStatus.Denied
    | VariableResultStatus.ReadOnly
    | VariableResultStatus.Error;
  error?: any;
  value?: undefined;
}

export interface VariableGetSuccessResult<T = any> extends Variable<T, true> {
  /** Success status to test against to see if a get result was an error. */
  status: VariableResultStatus.Success;

  value: T;
}

type MapVariableGetResult<
  Getter,
  Validated = false
> = Getter extends VariableGetter<infer T>
  ? Getter extends {
      initializer: () => infer R;
    }
    ? Awaited<R> extends VariablePatchResult<infer T, any>
      ? VariableGetResult<T, Validated>
      : VariableGetResult<
          unknown extends T ? any | undefined : T | undefined,
          Validated
        >
    : VariableGetResult<
        unknown extends T ? any | undefined : undefined,
        Validated
      >
  : Getter extends Nullish
  ? undefined
  : unknown extends Getter
  ? VariableGetResult<unknown, Validated>
  : never;

export type VariableGetResults<
  K extends readonly any[],
  Validated = boolean
> = Validated extends infer Validatable
  ? K extends readonly []
    ? []
    : K extends readonly [infer Item, ...infer Rest]
    ? [
        MapVariableGetResult<Item, Validatable>,
        ...VariableGetResults<Rest, Validatable>
      ]
    : K extends readonly (infer T)[]
    ? MapVariableGetResult<T, Validatable>[]
    : never
  : never;

export const validateGetResult = <T = any>(
  result: VariableGetResult<T>
): VariableGetSuccessResult<T> =>
  eq(result.status, VariableResultStatus.Success, VariableResultStatus.NotFound)
    ? (toNumericVariable(result) as VariableGetSuccessResult<T>)
    : throwError(
        `${formatKey(result)} could not be retrieved because ${
          result.status === VariableResultStatus.Denied
            ? result.error ?? "the operation was denied."
            : result.status === VariableResultStatus.Error
            ? `of an error: ${result.error}`
            : "of an unknown reason."
        }`
      );

export const addGetResultValidators = <K extends readonly any[] = any[]>(
  getters: VariableGetResults<K, boolean>
): VariableGetResults<K, true> =>
  getters.map(
    (getter: any) => (
      (getter.validate = () => validateGetResult(getter)), getter
    )
  ) as any;

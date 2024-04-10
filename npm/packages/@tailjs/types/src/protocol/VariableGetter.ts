import {
  SingleDataPurposeValue,
  VariableClassification,
  VersionedVariableKey,
} from "..";

export type VariableInitializer<T = any> = () =>
  | (Partial<VariableClassification> & { value: T })
  | undefined
  | Promise<
      (Partial<VariableClassification<boolean>> & { value: T }) | undefined
    >;

/**
 * Uniquely addresses a variable by scope, target and key name, optionally with the purpose(s) it will be used for.
 *
 * - If a version is specified and the stored version matches this, a result will not be returned.
 * - If a purpose is specified and the variable is only stored for other purposes, a result will also not be returned. (best practice)
 */
export interface VariableGetter<T = any, NumericEnums extends boolean = boolean>
  extends VersionedVariableKey<NumericEnums> {
  /**
   * If the variable does not exist, it will be created with the value returned from this function.
   * Since another value from another process may have been used at the same time,
   * you cannot trust that just because the function was called, its value was used.
   *
   * However, it is guaranteed that the returned value is the most current at the time the request was made.
   */
  initializer?: VariableInitializer<T>;

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
  purposes?: SingleDataPurposeValue<NumericEnums>;

  /**
   * Indicates that the value must be re-read from the source storage if a caching layer is used on top.
   */
  refresh?: boolean;
}

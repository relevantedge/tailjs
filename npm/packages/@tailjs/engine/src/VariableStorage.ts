import {
  VariableGetter,
  VariableKey,
  VariablePatchAction,
  VariablePatchType,
  VariableQuerySettings,
  VariableScope,
  VariableScopeNames,
  VariableValuePatch,
  VersionedVariableKey,
  isErrorResult,
  isSuccessResult,
  isVariablePatchAction,
  type Variable,
  type VariableFilter,
  type VariableQueryResult,
  type VariableSetResult,
  type VariableSetter,
} from "@tailjs/types";
import { MaybePromise, filter, isDefined } from "@tailjs/util";
import type { TrackerEnvironment } from ".";

export class VariableSetError extends Error {
  constructor(result: VariableSetResult) {
    super(
      `The variable '${result.source.key}' in ${
        VariableScopeNames[result.source.scope]
      } scope could not be set${
        isErrorResult(result) ? `: ${result.error}` : ""
      }.`
    );
  }
}

type VariableGetResult<Result> = Result extends VariableGetter<infer T>
  ? Variable<unknown extends T ? any : T>
  : undefined;

export type VariableGetResults<K extends any[]> = K extends [infer Item]
  ? [VariableGetResult<Item>]
  : K extends [infer Item, ...infer Rest]
  ? [VariableGetResult<Item>, ...VariableGetResults<Rest>]
  : K extends (infer T)[]
  ? VariableGetResult<T>[]
  : never;

/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */
export const getVariableMapKey = <T extends VariableKey | undefined | null>(
  variable: T
) =>
  variable
    ? `${variable.scope}${variable.targetId ?? ""}:${variable.key}`
    : undefined;

export const formatSetResultError = (result?: VariableSetResult) => {
  if (!result || isSuccessResult(result)) return undefined;

  return filter([
    `Status ${result.status} for key ${result.source.key} (${result.source.scope})`,
    result["error"]?.toString(),
  ]).join(" - ");
};

export const applyGetFilters = (
  getter: VariableGetter,
  variable: Variable | undefined
) =>
  !variable ||
  (isDefined(getter.version) && variable.version === getter.version) ||
  (isDefined(getter.purpose) &&
    variable.purposes?.includes(getter.purpose) === false)
    ? undefined
    : variable;

export const getPatchedValue = (
  current: Variable | undefined,
  patch: VariableValuePatch | VariablePatchAction
): {
  changed: boolean;
  patchedContainer: Variable | undefined;
  patchedValue: any;
} => {
  if (isVariablePatchAction(patch)) {
    const update = patch.patch(current?.value);
    return isDefined(update)
      ? { changed: true, patchedContainer: current, patchedValue: update.set }
      : {
          changed: false,
          patchedContainer: current,
          patchedValue: current?.value,
        };
  }

  let { value, patchType, selector, match } = patch;
  let currentValue = current?.value;
  let patchedValue = selector ? currentValue?.[selector] : currentValue;

  if (selector) {
    patchedValue = patchedValue?.[selector];
  }

  if (patchType === VariablePatchType.Add) {
    patchedValue = (patchedValue ?? 0) + (value ?? 1);
  } else if (
    (patchType === VariablePatchType.IfMatch && patchedValue !== match) ||
    (patchType === VariablePatchType.IfGreater &&
      (!isDefined(patchedValue) || patchedValue >= match)) ||
    (patchType === VariablePatchType.IfSmaller &&
      (!isDefined(patchedValue) || patchedValue <= match))
  ) {
    return {
      changed: false,
      patchedContainer: current,
      patchedValue: currentValue,
    };
  }

  if (selector) {
    if (!currentValue && !patchedValue) {
      return {
        changed: false,
        patchedContainer: current,
        patchedValue: currentValue,
      };
    }
    currentValue = currentValue ? { ...currentValue } : {};
    currentValue[selector] = patchedValue;
  } else {
    currentValue = patchedValue;
  }
  return {
    changed: true,
    patchedContainer: currentValue,
    patchedValue: currentValue,
  };
};

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends (VariableGetter | null | undefined)[]>(
    ...keys: K
  ): MaybePromise<VariableGetResults<K>>;

  head(
    filters: VariableFilter[],
    options?: VariableQuerySettings
  ): MaybePromise<VariableQueryResult<VersionedVariableKey>>;
  query(
    filters: VariableFilter[],
    options?: VariableQuerySettings
  ): MaybePromise<VariableQueryResult<Variable>>;
}

export const isWritable = (
  storage: ReadOnlyVariableStorage
): storage is VariableStorage => (storage as any).set;

export interface VariableStorage extends ReadOnlyVariableStorage {
  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ): void;

  renew(scopes: VariableScope[], scopeIds: string[]): MaybePromise<void>;

  get<K extends (VariableGetter | null | undefined)[]>(
    ...keys: K
  ): MaybePromise<VariableGetResults<K>>;

  set(...variables: VariableSetter[]): MaybePromise<VariableSetResult[]>;
  set(
    ...variables: (VariableSetter | undefined | null)[]
  ): MaybePromise<(VariableSetResult | undefined)[]>;

  purge(filters: VariableFilter[], batch?: boolean): MaybePromise<void>;
}

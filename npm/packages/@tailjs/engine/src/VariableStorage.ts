import {
  VariableGetter,
  VariableKey,
  VariableQuerySettings,
  VariableScope,
  VariableScopeNames,
  VersionedVariableKey,
  isErrorResult,
  isSuccessResult,
  type Variable,
  type VariableFilter,
  type VariableQueryResult,
  type VariableSetResult,
  type VariableSetter,
  VariableHeader,
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

type MapVariableGetResult<Getter> = Getter extends VariableGetter<infer T>
  ? Variable<unknown extends T ? any : T> | undefined
  : undefined;

export type VariableGetResults<K extends any[]> = K extends [infer Item]
  ? [MapVariableGetResult<Item>]
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableGetResult<Item>, ...VariableGetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableGetResult<T>[]
  : never;

type MapVariableSetResult<Source> = [Source] extends [VariableSetter<infer T>]
  ? VariableSetResult<T, Source>
  : never;

export type VariableSetResults<K extends any[]> = K extends [infer Item]
  ? [MapVariableSetResult<Item>]
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableSetResult<Item>, ...VariableSetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableSetResult<T>[]
  : never;

/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */
export const variableKey = <T extends VariableKey | undefined | null>(
  variable: T
) =>
  variable
    ? variable.targetId
      ? variable.scope + variable.targetId + variable.key
      : "0" + variable.key
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

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends (VariableGetter | null | undefined)[]>(
    ...keys: K
  ): MaybePromise<VariableGetResults<K>>;

  head(
    filters: VariableFilter[],
    options?: VariableQuerySettings
  ): MaybePromise<VariableQueryResult<VariableHeader>>;
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

  set<K extends VariableSetter[]>(
    ...variables: K
  ): MaybePromise<VariableSetResults<K>>;

  purge(filters: VariableFilter[], batch?: boolean): MaybePromise<void>;
}

import {
  VariablePatchType,
  VariableScope,
  type Variable,
  type VariableFilter,
  type VariableQueryResult,
  type VariableSetResult,
  type VariableSetter,
  type VariableTarget,
} from "@tailjs/types";
import { MaybePromise, isDefined, isNumber } from "@tailjs/util";
import type { TrackerEnvironment } from ".";

/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */
export const getVariableKey = (variable: Variable) =>
  `${variable.target ? variable.target.scope + variable.target.id : ""}-${
    variable.key
  }`;

export const expandVariableFilters = (filters: VariableFilter[]) => {
  const expanded: VariableFilter[] = [];

  for (const filter of filters) {
    if (filter.variables) {
      expanded.push(
        ...filter.variables.map(
          (variable) =>
            ({
              targetIds: [variable.target?.id ?? ""],
              scopes: variable.target
                ? [variable.target.scope]
                : [VariableScope.None],
              keys: [variable.key],
            } as VariableFilter)
        )
      );
      continue;
    }
    expanded.push(filter);
  }
  return expanded;
};

export const getPatchedValue = (
  current: Variable | undefined,
  setter: VariableSetter
): [any] | undefined => {
  let { value, patch } = setter;
  if (!patch) return undefined;

  const currentValue = current?.value;
  const match = patch.match ?? value;
  if (patch.type === VariablePatchType.Add) {
    if (!isDefined(value)) {
      return undefined;
    }

    return [(currentValue ?? 0) + value];
  } else if (
    (patch.type === VariablePatchType.IfMatch && currentValue !== match) ||
    (isDefined(match) &&
      isNumber(currentValue) &&
      ((patch.type === VariablePatchType.IfGreater && currentValue >= match) ||
        (patch.type === VariablePatchType.IfSmaller && currentValue <= match)))
  ) {
    return undefined;
  }
  return [setter.value];
};

export interface VariableQueryParameters {
  top?: number;
  cursor?: any;
  globalFilters?: VariableFilter[];
}

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get(
    key: string,
    target?: VariableTarget | null
  ): MaybePromise<Variable | undefined>;

  query(
    filters: VariableFilter[],
    options?: VariableQueryParameters
  ): MaybePromise<VariableQueryResult>;
}

export const isWritable = (
  storage: ReadOnlyVariableStorage
): storage is VariableStorage => (storage as any).set;

export interface VariableStorage extends ReadOnlyVariableStorage {
  renew(scopes: VariableScope[], scopeIds: string[]): MaybePromise<void>;

  set(variables: VariableSetter[]): MaybePromise<VariableSetResult[]>;

  purge(filters: VariableFilter[], batch?: boolean): MaybePromise<void>;
}

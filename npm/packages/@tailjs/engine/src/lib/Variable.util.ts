import {
  DataClassification,
  Variable,
  VariableClassification,
  VariableFilter,
  VariableKey,
  VariablePatch,
  VariablePatchResult,
  VariablePatchSource,
  VariablePatchType,
  VariableQueryOptions,
  VariableScope,
  VariableSetResult,
  isConflictResult,
  isSuccessResult,
  toStrict,
} from "@tailjs/types";
import {
  MaybePromise,
  delay,
  filter,
  isDefined,
  isFunction,
  isNumber,
  isObject,
  isUndefined,
  now,
} from "@tailjs/util";
import { ReadOnlyVariableStorage, VariableStorage } from "..";

/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */
export const variableId = <T extends VariableKey | undefined | null>(
  variable: T
) =>
  variable
    ? variable.targetId
      ? variable.scope + variable.targetId + variable.key
      : variable.scope + variable.key
    : undefined;

export const copy = <
  T extends (Variable<any, any> & { value: any }) | undefined
>(
  variable: T,
  overrides?: Partial<Variable>
): T => {
  return (
    variable && {
      ...variable,
      ...(variable.tags ? [...variable.tags] : {}),
      ...overrides,
    }
  );
};

export const formatSetResultError = (result?: VariableSetResult) => {
  if (!result || isSuccessResult(result)) return undefined;

  return filter([
    `Status ${result.status} for key ${result.source.key} (${result.source.scope})`,
    result["error"]?.toString(),
  ]).join(" - ");
};

export const extractKey = <T extends VariableKey>(
  variable: T
): T extends undefined ? undefined : T =>
  variable
    ? ({
        scope: variable.scope,
        targetId: variable.targetId,
        key: variable.key,
      } as Required<VariableKey> as any)
    : undefined;

const patchSelector = (
  value: any,
  selector: string | undefined,
  update: (current: any) => any
) => {
  if (!selector) return update(value);

  let patchTarget: object;
  ("." + selector).split(".").forEach((segment, i, path) => {
    let current = i ? patchTarget[segment] : value;
    if (isDefined(current) && !isObject(current))
      throw new TypeError(
        `Invalid patch operation. The selector does not address a property on an object.`
      );
    if (i === path.length - 1) {
      const updated = (patchTarget[segment] = update(patchTarget[segment]));
      patchTarget[segment] = updated;
      if (!isDefined(update)) {
        delete patchTarget[segment];
      }
    } else {
      if (!current) {
        patchTarget = i
          ? (current = patchTarget[selector] ??= {})
          : (value ??= {});
      }
    }
  });
  return value;
};

const requireNumberOrUndefined = (value: any): number | undefined => {
  if (isUndefined(value) || isNumber(value)) return value!;
  throw new TypeError("The current value must be undefined or a number.");
};

export const applyPatchOffline = (
  current: VariablePatchSource<any, true> | undefined,
  { classification: level, purposes, patch }: VariablePatch<any, true>
): VariablePatchResult<any, true> | undefined => {
  if (isFunction(patch)) {
    const patched = toStrict(patch(current));

    if (patched) {
      patched.classification ??=
        current?.classification ?? DataClassification.Anonymous;
      !("purposes" in patched) && (patched.purposes = current?.purposes);
      !("tags" in patched) && (patched.tags = current?.tags);
    }
    return patched;
  }

  const classification: VariableClassification<true> = {
    classification: level!,
    purposes: purposes,
  };

  const value = current?.value;

  switch (patch.type) {
    case VariablePatchType.Add:
      return {
        ...classification,
        value: patchSelector(
          requireNumberOrUndefined(value),
          patch.selector,
          (value) => (value ?? 0) + patch.by
        ),
      };
    case VariablePatchType.Min:
    case VariablePatchType.Max:
      return {
        ...classification,
        value: patchSelector(value, patch.selector, (value) =>
          isDefined(requireNumberOrUndefined(value))
            ? Math[patch.type === VariablePatchType.Min ? "min" : "max"](
                value,
                patch.value
              )
            : patch.value
        ),
      };
    case VariablePatchType.IfMatch:
      if (current?.value !== patch.match) {
        return undefined;
      }
      return {
        ...classification,
        value: patchSelector(value, patch.selector, () => patch.value),
      };
  }
};

export type ParsedKey = {
  prefix: string;
  key: string;
  sourceKey: string;
  // For filters.
  not?: boolean;
};

export type PartitionItem<T> = [sourceIndex: number, item: T];
export type PartitionItems<T extends any[] = any[]> = T extends []
  ? []
  : T extends [infer Item, ...infer Rest]
  ? [PartitionItem<Item>, ...PartitionItems<Rest>]
  : PartitionItem<T[number]>[];

export const withSourceIndex = <T extends any[]>(items: T): PartitionItems<T> =>
  items.map(
    (item, sourceIndex) => [sourceIndex, item] as const
  ) as PartitionItems<T>;

export const partitionItems = <T extends any[]>(items: PartitionItems<T>): T =>
  items.map((item) => item[1]) as T;

export const mergeKeys = async <K extends any[], T extends any[]>(
  results: T,
  partitionMappings: PartitionItems<K>,
  partitionResults: (items: K) => MaybePromise<T>
) =>
  partitionMappings?.length &&
  (
    await partitionResults(partitionMappings.map((item) => item?.[1]) as K)
  ).forEach((result) => result && (results[result[0]] = result[1]));

export const hasPrefix = (key: string | undefined) => key?.includes(":");

export const parseKey = <T extends string | undefined>(
  sourceKey: T
): Exclude<T, string> | ParsedKey => {
  if (isUndefined(sourceKey)) return undefined as any;
  const not = sourceKey[0] === "1";
  if (not) {
    sourceKey = (sourceKey.slice(1) as T)!;
  }
  const prefixIndex = sourceKey.indexOf(":");
  const prefix = prefixIndex < 0 ? "" : sourceKey.substring(0, prefixIndex);
  const localKey =
    prefixIndex > -1 ? sourceKey.slice(prefixIndex + 1) : sourceKey;

  return {
    prefix,
    localKey,
    sourceKey,
    not,
  } as any;
};

export type FilterTarget = {
  targetIndex: number;
  scopes: Set<VariableScope>;
  prefixes: { exclude?: boolean; match: Set<string> };
};

export const splitFilters = (
  filters: VariableFilter[],
  splits: FilterTarget[],
  keepPrefix = false
) => {
  const splitFilters: VariableFilter[][] = splits.map(() => []);
  for (const filter of filters) {
    const keys = filter.keys?.map(parseKey);
    for (const { targetIndex: target, scopes, prefixes } of splits) {
      let splitKeys = keys;
      if (prefixes && splitKeys) {
        const { exclude = false, match } = prefixes;
        splitKeys = splitKeys.filter(
          (key) =>
            key.prefix === "*" ||
            key.sourceKey === "*" ||
            match.has(key.prefix) !== exclude
        );
      }

      if (splitKeys?.length !== 0) {
        splitFilters[target].push({
          ...filter,
          scopes: [...scopes],
          keys: splitKeys?.map((key) => (keepPrefix ? key.sourceKey : key.key)),
        });
      }
    }
  }
  return splitFilters;
};

export const distributeQueries = async (
  storages: ReadOnlyVariableStorage[],
  filters: VariableFilter[][],
  options: VariableQueryOptions
) => {};

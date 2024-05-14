import {
  Variable,
  VariableClassification,
  VariableFilter,
  VariableKey,
  VariablePatch,
  VariablePatchResult,
  VariablePatchSource,
  VariablePatchType,
  VariableScope,
  VariableSetResult,
  dataClassification,
  dataPurposes,
  parseKey,
  patchType,
  toNumericVariableEnums,
} from "@tailjs/types";
import {
  IfNot,
  MaybePromise,
  MaybeUndefined,
  Nullish,
  filter,
  isFunction,
  isPlainObject,
  throwError,
} from "@tailjs/util";

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
  T extends (Variable<any, any> & { value: any }) | Nullish,
  O = {}
>(
  variable: T,
  overrides?: O
): MaybeUndefined<T, T & O> => {
  return (variable && {
    ...variable,
    ...(variable.tags ? [...variable.tags] : {}),
    ...overrides,
  }) as any;
};

export const formatSetResultError = (result?: VariableSetResult) => {
  if (!result || result.status < 400) return undefined;

  return filter([
    `Status ${result.status} for key ${result.source.key} (${result.source.scope})`,
    result["error"]?.toString(),
  ]).join(" - ");
};

const patchSelector = (
  value: any,
  selector: string | undefined,
  update: (current: any) => any
) => {
  if (!selector) return update(value);

  let patchTarget: object;
  ("." + selector).split(".").forEach((segment, i, path) => {
    let current = i ? patchTarget[segment] : value;
    if (current != null && !isPlainObject(current))
      throw new TypeError(
        `Invalid patch operation. The selector does not address a property on an object.`
      );
    if (i === path.length - 1) {
      const updated = (patchTarget[segment] = update(patchTarget[segment]));
      patchTarget[segment] = updated;
      if (update === undefined) {
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

const requireNumberOrUndefined = (value: any): number | undefined =>
  value === undefined || typeof value === "number"
    ? value
    : throwError("The current value must be undefined or a number.");

export const applyPatch = async (
  current: VariablePatchSource<any, boolean> | undefined,
  {
    classification: level,
    purposes,
    patch,
  }: VariablePatch<any, false> | VariablePatch<any, true>
): Promise<VariablePatchResult<any, true> | undefined> => {
  if (isFunction(patch)) {
    const patched = toNumericVariableEnums(
      await patch(toNumericVariableEnums(current))
    );

    if (patched) {
      patched.classification ??= dataClassification.parse(
        current?.classification
      );
      patched.purposes ??= dataPurposes.parse(current?.purposes);
      !("tags" in patched) && (patched.tags = current?.tags);
    }

    return patched;
  }

  const classification: Partial<VariableClassification<true>> = {
    classification: dataClassification.parse(level!, false),
    purposes: dataPurposes(purposes ?? current?.purposes),
  };

  const value = current?.value;

  patch.type = patchType.parse(patch.type);

  switch (patch.type) {
    case VariablePatchType.Add:
      return {
        ...classification,
        value: patchSelector(
          requireNumberOrUndefined(value),
          patch.selector,
          (value) => (value ?? patch.seed ?? 0) + patch.by
        ),
      };
    case VariablePatchType.Min:
    case VariablePatchType.Max:
      return {
        ...classification,
        value: patchSelector(value, patch.selector, (value) =>
          requireNumberOrUndefined(value)
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

    case VariablePatchType.IfNoneMatch:
      if (current?.value === patch.match) {
        return undefined;
      }
      return {
        ...classification,
        value: patchSelector(value, patch.selector, () => patch.value),
      };
  }
};

export type PartitionItem<T> = [sourceIndex: number, item: T];
export type PartitionItems<
  T extends readonly any[] = any[],
  Remove = never,
  Append = undefined
> = T extends readonly []
  ? []
  : T extends readonly [infer Item, ...infer Rest]
  ? [
      PartitionItem<Exclude<Item, Remove> & IfNot<Append, Item>>,
      ...PartitionItems<Rest, Remove, Append>
    ]
  : PartitionItem<Exclude<T[number], Remove> & IfNot<Append, T[number]>>[];

export const withSourceIndex = <T extends any[]>(items: T): PartitionItems<T> =>
  items.map(
    (item, sourceIndex) => [sourceIndex, item] as const
  ) as PartitionItems<T>;

export const partitionItems = <T extends any[]>(items: PartitionItems<T>): T =>
  items.map((item) => item[1]) as T;

export const mergeKeys = async <K, T extends any[]>(
  results: T,
  partitionMappings: PartitionItem<K>[],
  partitionResults: (items: K[]) => MaybePromise<T>
) =>
  partitionMappings?.length
    ? (
        await partitionResults(partitionMappings.map((item) => item?.[1] as K))
      ).forEach(
        (result, i) => result && (results[partitionMappings[i][0]] = result)
      )
    : undefined;

export const hasPrefix = (key: string | undefined) => key?.includes(":");

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

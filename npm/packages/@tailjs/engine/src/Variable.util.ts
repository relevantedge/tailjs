import {
  DataPurpose,
  Variable,
  VariableClassification,
  VariableGetter,
  VariableKey,
  VariablePatch,
  VariablePatchResult,
  VariablePatchSource,
  VariablePatchType,
  VariableSetResult,
  VersionedVariableKey,
  isSuccessResult,
  isVariablePatchAction,
} from "@tailjs/types";
import {
  filter,
  isDefined,
  isNumber,
  isObject,
  isUndefined,
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
      : "0" + variable.key
    : undefined;

export const copy = <T extends Variable | undefined>(
  variable: T,
  overrides?: Partial<Variable>
): T => {
  return (
    variable && {
      ...variable,
      purposes: !overrides?.purposes &&
        variable.purposes && [...variable.purposes],
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
  current: VariablePatchSource | undefined,
  { patch }: VariablePatch
): VariablePatchResult | undefined => {
  if (isVariablePatchAction(patch)) {
    return patch(current);
  }
  const classification: VariableClassification = {
    classification: patch.classification,
    purposes: patch.purposes,
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
  localKey: string;
  sourceKey: string;

  purpose?: DataPurpose;
};

export const parseKey = <T extends string | undefined>(
  sourceKey: T
): Exclude<T, string> | ParsedKey => {
  if (isUndefined(sourceKey)) return undefined as any;
  const prefixIndex = sourceKey.indexOf(":");
  const prefix = prefixIndex < 0 ? "" : sourceKey.substring(0, prefixIndex);
  const localKey =
    prefixIndex > -1 ? sourceKey.slice(prefixIndex + 1) : sourceKey;

  return {
    prefix,
    localKey,
    sourceKey,
  } as any;
};

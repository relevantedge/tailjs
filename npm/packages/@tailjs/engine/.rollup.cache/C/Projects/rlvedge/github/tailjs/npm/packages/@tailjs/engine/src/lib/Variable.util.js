import { isSuccessResult, patchType, toStrict, } from "@tailjs/types";
import { filter, isDefined, isFunction, isNumber, isObject, isUndefined, } from "@tailjs/util";
/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */
export const variableId = (variable) => variable
    ? variable.targetId
        ? variable.scope + variable.targetId + variable.key
        : variable.scope + variable.key
    : undefined;
export const copy = (variable, overrides) => {
    return (variable && {
        ...variable,
        ...(variable.tags ? [...variable.tags] : {}),
        ...overrides,
    });
};
export const formatSetResultError = (result) => {
    if (!result || isSuccessResult(result))
        return undefined;
    return filter([
        `Status ${result.status} for key ${result.source.key} (${result.source.scope})`,
        result["error"]?.toString(),
    ]).join(" - ");
};
export const extractKey = (variable) => variable
    ? {
        scope: variable.scope,
        targetId: variable.targetId,
        key: variable.key,
    }
    : undefined;
const patchSelector = (value, selector, update) => {
    if (!selector)
        return update(value);
    let patchTarget;
    ("." + selector).split(".").forEach((segment, i, path) => {
        let current = i ? patchTarget[segment] : value;
        if (isDefined(current) && !isObject(current))
            throw new TypeError(`Invalid patch operation. The selector does not address a property on an object.`);
        if (i === path.length - 1) {
            const updated = (patchTarget[segment] = update(patchTarget[segment]));
            patchTarget[segment] = updated;
            if (!isDefined(update)) {
                delete patchTarget[segment];
            }
        }
        else {
            if (!current) {
                patchTarget = i
                    ? (current = patchTarget[selector] ??= {})
                    : (value ??= {});
            }
        }
    });
    return value;
};
const requireNumberOrUndefined = (value) => {
    if (isUndefined(value) || isNumber(value))
        return value;
    throw new TypeError("The current value must be undefined or a number.");
};
export const applyPatchOffline = (current, { classification: level, purposes, patch }) => {
    if (isFunction(patch)) {
        const patched = toStrict(patch(current));
        if (patched) {
            patched.classification ??=
                current?.classification ?? 0 /* DataClassification.Anonymous */;
            !("purposes" in patched) && (patched.purposes = current?.purposes);
            !("tags" in patched) && (patched.tags = current?.tags);
        }
        return patched;
    }
    const classification = {
        classification: level,
        purposes: purposes,
    };
    const value = current?.value;
    patch.type = patchType(patch.type);
    switch (patch.type) {
        case 0 /* VariablePatchType.Add */:
            return {
                ...classification,
                value: patchSelector(requireNumberOrUndefined(value), patch.selector, (value) => (value ?? 0) + patch.by),
            };
        case 1 /* VariablePatchType.Min */:
        case 2 /* VariablePatchType.Max */:
            return {
                ...classification,
                value: patchSelector(value, patch.selector, (value) => isDefined(requireNumberOrUndefined(value))
                    ? Math[patch.type === 1 /* VariablePatchType.Min */ ? "min" : "max"](value, patch.value)
                    : patch.value),
            };
        case 3 /* VariablePatchType.IfMatch */:
            if (current?.value !== patch.match) {
                return undefined;
            }
            return {
                ...classification,
                value: patchSelector(value, patch.selector, () => patch.value),
            };
    }
};
export const withSourceIndex = (items) => items.map((item, sourceIndex) => [sourceIndex, item]);
export const partitionItems = (items) => items.map((item) => item[1]);
export const mergeKeys = async (results, partitionMappings, partitionResults) => partitionMappings?.length &&
    (await partitionResults(partitionMappings.map((item) => item?.[1]))).forEach((result) => result && (results[result[0]] = result[1]));
export const hasPrefix = (key) => key?.includes(":");
export const parseKey = (sourceKey) => {
    if (isUndefined(sourceKey))
        return undefined;
    const not = sourceKey[0] === "1";
    if (not) {
        sourceKey = sourceKey.slice(1);
    }
    const prefixIndex = sourceKey.indexOf(":");
    const prefix = prefixIndex < 0 ? "" : sourceKey.substring(0, prefixIndex);
    const key = prefixIndex > -1 ? sourceKey.slice(prefixIndex + 1) : sourceKey;
    return {
        prefix,
        key,
        sourceKey,
        not,
    };
};
export const splitFilters = (filters, splits, keepPrefix = false) => {
    const splitFilters = splits.map(() => []);
    for (const filter of filters) {
        const keys = filter.keys?.map(parseKey);
        for (const { targetIndex: target, scopes, prefixes } of splits) {
            let splitKeys = keys;
            if (prefixes && splitKeys) {
                const { exclude = false, match } = prefixes;
                splitKeys = splitKeys.filter((key) => key.prefix === "*" ||
                    key.sourceKey === "*" ||
                    match.has(key.prefix) !== exclude);
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
export const distributeQueries = async (storages, filters, options) => { };
//# sourceMappingURL=Variable.util.js.map
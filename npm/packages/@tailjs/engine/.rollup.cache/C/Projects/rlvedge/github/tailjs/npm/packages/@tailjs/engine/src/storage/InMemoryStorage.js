import { dataClassification, dataPurposes, isVariablePatch, toStrict, variableScope, } from "@tailjs/types";
import { clock, forEach, isDefined, isUndefined, map, now, some, } from "@tailjs/util";
import { applyPatchOffline, copy, parseKey, variableId } from "../lib";
export const hasChanged = (getter, current) => isUndefined(getter.version) || current?.version !== getter.version;
export class InMemoryStorageBase {
    _ttl;
    _cleaner;
    /** For testing purposes to have the router apply the patches. @internal */
    _testDisablePatch;
    constructor() { }
    _remove(variable, timestamp) {
        const values = this._getScopeValues(variable.scope, variable.targetId, false);
        if (values?.[1].has(variable.key)) {
            const ttl = this._ttl?.[variable.scope];
            values[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
            values[1].delete(variable.key);
            return true;
        }
        return false;
    }
    _update(variable, timestamp) {
        let scopeValues = this._getScopeValues(variable.scope, variable.targetId, true);
        variable = toStrict(variable);
        const ttl = this._ttl?.[variable.scope];
        scopeValues[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
        scopeValues[1].set(variable.key, variable);
        return variable;
    }
    _validateKey(key) {
        if (key && key.scope !== 0 /* VariableScope.Global */ && !key.targetId) {
            throw new TypeError(`Target ID is required for non-global scopes.`);
        }
        return key;
    }
    _query(filters, settings) {
        const results = new Set();
        const timestamp = now();
        const ifNoneMatch = settings?.ifNoneMatch
            ? new Map(settings.ifNoneMatch.map((variable) => [
                variableId(variable),
                variable.version,
            ]))
            : null;
        const ifModifiedSince = settings?.ifModifiedSince ?? 0;
        for (const queryFilter of filters) {
            const match = (variable) => {
                const { purposes, classification, tags } = queryFilter;
                if (!variable ||
                    (variable.purposes &&
                        purposes &&
                        !(variable.purposes & dataPurposes(purposes))) ||
                    (classification &&
                        (variable.classification <
                            dataClassification(classification.min) ||
                            variable.classification >
                                dataClassification(classification.max) ||
                            classification.levels?.some((level) => variable.classification === dataClassification(level)) === false)) ||
                    (tags &&
                        (!variable.tags ||
                            !tags.some((tags) => tags.every((tag) => variable.tags.includes(tag)))))) {
                    return false;
                }
                let matchVersion;
                if ((ifModifiedSince && variable.modified < ifModifiedSince) ||
                    (isDefined((matchVersion = ifNoneMatch?.get(variableId(variable)))) &&
                        variable.version === matchVersion)) {
                    // Skip the variable because it is too old or unchanged based on the settings provided for the query.
                    return false;
                }
                return true;
            };
            for (const scope of map(queryFilter.scopes, variableScope) ??
                variableScope.values) {
                for (const [, scopeVars] of queryFilter.targetIds?.map((targetId) => [targetId, this._getScopeValues(scope, targetId, false)]) ?? this._getTargetsInScope(scope)) {
                    if (!scopeVars || scopeVars[0] <= timestamp)
                        continue;
                    const vars = scopeVars[1];
                    let nots = undefined;
                    const mappedKeys = queryFilter.keys?.map((key) => {
                        // Find keys that starts with `!` to exclude them from the results.
                        const parsed = parseKey(key);
                        if (parsed.not) {
                            (nots ??= new Set()).add(parsed.sourceKey);
                        }
                        return parsed.key;
                    }) ?? vars.keys();
                    for (const key of mappedKeys.includes("*")
                        ? vars.keys()
                        : mappedKeys) {
                        if (nots?.has(key))
                            continue;
                        const value = vars.get(key);
                        if (match(value)) {
                            results.add(value);
                        }
                    }
                }
            }
        }
        return [...results];
    }
    clean() {
        const timestamp = now();
        forEach(this._ttl, ([scope, ttl]) => {
            if (isUndefined(ttl))
                return;
            const variables = this._getTargetsInScope(scope);
            forEach(variables, ([targetId, variables]) => variables[0] <= timestamp - ttl &&
                this._deleteTarget(scope, targetId));
        });
    }
    renew(scope, targetIds, context) {
        const timestamp = now();
        const ttl = this._ttl?.[scope];
        if (!ttl)
            return;
        for (const targetId of targetIds) {
            const vars = this._getScopeValues(scope, targetId, false);
            if (vars) {
                vars[0] = timestamp;
            }
        }
    }
    configureScopeDurations(durations, context) {
        this._ttl ??= {};
        for (const [scope, duration] of Object.entries(durations).map(([scope, duration]) => [variableScope(scope), duration])) {
            duration > 0 ? (this._ttl[scope] = duration) : delete this._ttl[scope];
        }
        let hasTtl = some(this._ttl, ([, ttl]) => ttl > 0);
        if (this._cleaner || hasTtl) {
            (this._cleaner ??= clock({
                callback: () => this.clean(),
                frequency: 10000,
            })).toggle(hasTtl);
        }
    }
    _applyGetFilters(getter, variable) {
        return !variable ||
            (getter.purpose && // The variable has explicit purposes and not the one requested.
                isDefined(variable.purposes) &&
                !(variable.purposes & getter.purpose))
            ? undefined
            : isDefined(getter.version) && variable?.version == getter.version
                ? variable
                : copy(variable);
    }
    async get(getters, context) {
        const results = getters.map(toStrict).map((getter) => ({
            current: (getter = this._validateKey(getter))
                ? this._applyGetFilters(getter, this._getScopeValues(getter.scope, getter.targetId, false)?.[1].get(getter.key))
                : undefined,
            getter,
        }));
        for (const item of results) {
            if (item.getter?.initializer && !isDefined(item[0])) {
                const initialValue = await item.getter.initializer();
                if (initialValue) {
                    // Check if the variable has been created by someone else while the initializer was running.
                    const current = this._getScopeValues(item.getter.scope, item.getter.targetId, false)?.[1].get(item.getter.key);
                    if (!current) {
                        item.current = copy(this._update({ ...item[1], ...initialValue }));
                        item.current.initialized = true;
                    }
                }
            }
        }
        return results.map((item) => {
            const variable = copy(item.current);
            if (variable &&
                item.getter?.version &&
                item.getter?.version === item.current?.version) {
                variable.unchanged = true;
            }
            return variable;
        });
    }
    head(filters, options, context) {
        return this.query(filters, options);
    }
    query(filters, options, context) {
        const results = this._query(filters, options);
        return {
            count: options?.count ? results.length : undefined,
            // This current implementation does not bother with cursors. If one is requested we just return all results. Boom.
            results: (options?.top && !options?.cursor?.include
                ? results.slice(options.top)
                : results).map((variable) => copy(variable)),
        };
    }
    set(variables, context) {
        const timestamp = now();
        const results = [];
        for (const source of variables.map(toStrict)) {
            this._validateKey(source);
            if (!source) {
                results.push(undefined);
                continue;
            }
            let { key, targetId, scope, classification, purposes, value, version, tags, } = source;
            let scopeVars = this._getScopeValues(source.scope, source.targetId, false);
            if (scopeVars?.[0] < timestamp) {
                scopeVars = undefined;
            }
            let current = scopeVars?.[1].get(key);
            if (isVariablePatch(source)) {
                if (this._testDisablePatch) {
                    results.push({ status: 3 /* VariableSetStatus.Unsupported */, source });
                    continue;
                }
                const patched = toStrict(applyPatchOffline(current, source));
                if (!isDefined(patched)) {
                    results.push({
                        status: 1 /* VariableSetStatus.Unchanged */,
                        source,
                        current: copy(current),
                    });
                    continue;
                }
                classification = patched.classification;
                purposes = patched.purposes;
                value = patched.value;
            }
            else if (current?.version !== version) {
                results.push({
                    status: 2 /* VariableSetStatus.Conflict */,
                    source,
                    current: copy(current),
                });
                continue;
            }
            if (isUndefined(value)) {
                results.push({
                    status: current && this._remove(current)
                        ? 0 /* VariableSetStatus.Success */
                        : 1 /* VariableSetStatus.Unchanged */,
                    source,
                    current: undefined,
                });
                continue;
            }
            const nextValue = {
                key,
                value,
                classification,
                targetId,
                scope,
                purposes: isDefined(current?.purposes) || purposes
                    ? (current?.purposes ?? 0) | (purposes ?? 0)
                    : 1 /* DataPurposes.Necessary */,
                tags: tags && [...tags],
            };
            nextValue.version = this._getNextVersion(nextValue);
            current = this._update(nextValue, timestamp);
            results.push(current
                ? {
                    status: 0 /* VariableSetStatus.Success */,
                    source,
                    current,
                }
                : { status: 4 /* VariableSetStatus.Denied */, source });
        }
        return results;
    }
    purge(filters, context) {
        for (const variable of this._query(filters)) {
            this._remove(variable);
        }
    }
}
export class InMemoryStorage extends InMemoryStorageBase {
    _variables = variableScope.values.map(() => new Map());
    _nextVersion = 0;
    constructor() {
        super();
    }
    _getNextVersion(key) {
        return "" + ++this._nextVersion;
    }
    _getScopeValues(scope, targetId, require) {
        let values = this._variables[scope].get(targetId ?? "");
        if (!values && require) {
            this._variables[scope].set(targetId ?? "", (values = [undefined, new Map()]));
        }
        return values;
    }
    _resetScope(scope) {
        this._variables[scope].clear();
    }
    _deleteTarget(scope, targetId) {
        this._variables[scope].delete(targetId);
    }
    _getTargetsInScope(scope) {
        return this._variables[scope];
    }
}
//# sourceMappingURL=InMemoryStorage.js.map
import { toStrict, variableScope, } from "@tailjs/types";
import { get, isDefined, isFunction, map, waitAll, } from "@tailjs/util";
import { mergeKeys, parseKey } from "../lib";
import { isWritable, } from "..";
export class VariableSplitStorage {
    _mappings;
    _cachedStorages = null;
    constructor(mappings) {
        this._mappings = isFunction(mappings) ? mappings() : mappings;
    }
    _keepPrefix(storage) {
        return storage instanceof VariableSplitStorage;
    }
    _mapKey(source) {
        if (!source)
            return undefined;
        const parsed = parseKey(source.key);
        let storage = this._mappings[source.scope]?.get(parsed.prefix);
        if (!storage) {
            return undefined;
        }
        return {
            ...parsed,
            storage,
            source,
        };
    }
    get _storageScopes() {
        if (!this._cachedStorages) {
            this._cachedStorages = new Map();
            this._mappings.forEach((prefixes, scope) => prefixes?.forEach((storage) => get(this._cachedStorages, storage, () => new Set()).add(scope)));
        }
        return this._cachedStorages;
    }
    configureScopeDurations(durations, context) {
        this._storageScopes.forEach((_, storage) => isWritable(storage) &&
            storage.configureScopeDurations(durations, context));
    }
    async renew(scope, scopeIds, context) {
        await waitAll(map(this._storageScopes, ([storage, mappedScopes]) => isWritable(storage) &&
            mappedScopes.has(scope) &&
            storage.renew(scope, scopeIds, context)));
    }
    _splitKeys(keys) {
        const partitions = new Map();
        keys.forEach((sourceKey, sourceIndex) => {
            if (!sourceKey)
                return;
            const { storage, key } = this._mapKey(sourceKey);
            const keepPrefix = this._keepPrefix(storage);
            get(partitions, storage, () => []).push([
                sourceIndex,
                !keepPrefix && key !== sourceKey.key
                    ? { ...sourceKey, key: key }
                    : sourceKey,
            ]);
        });
        return partitions;
    }
    _splitFilters(filters) {
        const partitions = new Map();
        for (const filter of filters) {
            const keySplits = new Map();
            const addKey = (storage, key) => storage &&
                get(keySplits, storage, () => new Set()).add(this._keepPrefix(storage) ? key.sourceKey : key.key);
            const scopes = map(filter.scopes, variableScope) ?? variableScope.values;
            for (const scope of scopes) {
                const scopePrefixes = this._mappings[scope];
                if (!scopePrefixes)
                    continue;
                for (const key of filter.keys) {
                    const parsed = parseKey(key);
                    if (key === "*" || parsed.prefix === "*") {
                        scopePrefixes.forEach((storage) => addKey(storage, parsed));
                    }
                    else {
                        addKey(scopePrefixes.get(parsed.prefix), parsed);
                    }
                }
            }
            for (const [storage, keys] of keySplits) {
                const storageScopes = this._storageScopes.get(storage);
                if (!storageScopes)
                    continue;
                get(partitions, storage, () => []).push({
                    ...filter,
                    keys: [...keys],
                    scopes: filter.scopes
                        ? filter.scopes.filter((scope) => storageScopes.has(variableScope(scope)))
                        : [...storageScopes],
                });
            }
        }
        return [...partitions];
    }
    async _patchGetResults(storage, getters, results) {
        return results;
    }
    async get(keys, context) {
        const results = [];
        await waitAll(map(this._splitKeys(keys.map(toStrict)), ([storage, split]) => isWritable(storage) &&
            mergeKeys(results, split, async (variables) => await this._patchGetResults(storage, variables, await storage.get(variables, context)))));
        return results;
    }
    async _queryOrHead(method, filters, options, context) {
        const partitions = this._splitFilters(filters);
        const results = {
            count: options?.count ? 0 : undefined,
            results: [],
        };
        if (!partitions.length) {
            return results;
        }
        if (partitions.length === 1) {
            return await partitions[0][0][method](partitions[0][1], options);
        }
        const includeCursor = options?.cursor?.include || !!options?.cursor?.previous;
        let cursor = options?.cursor?.previous
            ? JSON.parse(options.cursor.previous)
            : undefined;
        let top = options?.top ?? 100;
        let anyCursor = false;
        for (let i = 0; 
        // Keep going as long as we need the total count, or have not sufficient results to meet top (or done).
        // If one of the storages returns an undefined count even though requested, we will also blank out the count in the combined results
        // and stop reading from additional storages since total count is no longer needed.
        i < partitions.length && (top > 0 || isDefined(results.count)); i++) {
            const [storage, query] = partitions[0];
            const storageState = cursor?.[i];
            let count;
            if (storageState && (!isDefined(storageState[1]) || !top)) {
                // We have persisted the total count from the storage in the combined cursor.
                // If the cursor is empty it means that we have exhausted the storage.
                // If there is a cursor but `top` is zero (we don't need more results), we use the count cached from the initial query.
                count = storageState[0];
            }
            else {
                const { count: storageCount, results: storageResults, cursor: storageCursor, } = await storage[method](query, {
                    ...options,
                    top,
                    cursor: {
                        include: includeCursor,
                        previous: storageState?.[1],
                    },
                });
                count = storageCount;
                if (includeCursor) {
                    anyCursor ||= !!storageCursor;
                    (cursor ??= [])[i] = [count, storageCursor];
                }
                else if (storageResults.length > top) {
                    // No cursor needed. Cut off results to avoid returning excessive amounts of data to the client.
                    storageResults.length = top;
                }
                results.results.push(...storageResults); // This is actually only the header for head requests.
                top = Math.max(0, top - storageResults.length);
            }
            isDefined(results.count) &&
                (results.count = isDefined(count) ? results.count + 1 : undefined);
        }
        if (anyCursor) {
            // Only if any of the storages returned a cursor for further results, we do this.
            // Otherwise, we return an undefined cursor to indicate that we are done.
            results.cursor = JSON.stringify(cursor);
        }
        return results;
    }
    head(filters, options, context) {
        return this._queryOrHead("head", filters, options, context);
    }
    query(filters, options, context) {
        return this._queryOrHead("query", filters, options, context);
    }
    async _patchSetResults(storage, setters, results) {
        return results;
    }
    async set(variables, context) {
        const results = [];
        await waitAll(map(this._splitKeys(variables.map(toStrict)), ([storage, split]) => isWritable(storage) &&
            mergeKeys(results, split, async (variables) => await this._patchSetResults(storage, variables, await storage.set(variables, context)))));
        return results;
    }
    async purge(filters, context) {
        const partitions = this._splitFilters(filters);
        if (!partitions.length) {
            return;
        }
        await waitAll(partitions.map(([storage, filters]) => isWritable(storage) && storage.purge(filters, context)));
    }
}
//# sourceMappingURL=VariableSplitStorage.js.map
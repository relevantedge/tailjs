import {
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetter,
} from "@tailjs/types";
import {
  MaybePromise,
  get,
  isDefined,
  isFunction,
  map,
  waitAll,
} from "@tailjs/util";
import { ParsedKey, PartitionItems, mergeKeys, parseKey } from "../lib";

import {
  ReadOnlyVariableStorage,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  isWritable,
} from "..";

export type PrefixMapping = Map<string, ReadOnlyVariableStorage>;
export type PrefixMappings = Map<string, ReadOnlyVariableStorage>[];

export class VariableSplitStorage implements VariableStorage {
  private readonly _mappings: PrefixMappings;
  private _cachedStorages: Map<
    ReadOnlyVariableStorage,
    Set<VariableScope>
  > | null = null;

  constructor(mappings: (() => PrefixMappings) | PrefixMappings) {
    this._mappings = isFunction(mappings) ? mappings() : mappings;
  }

  protected _keepPrefix(storage: ReadOnlyVariableStorage) {
    return storage instanceof VariableSplitStorage;
  }

  private _mapKey<K extends VariableKey | undefined>(
    source: K
  ): K extends undefined
    ? undefined
    : ParsedKey & {
        storage: ReadOnlyVariableStorage;
        source: K;
      } {
    if (!source) return undefined as any;

    const parsed = parseKey(source.key);
    let storage = this._mappings[source.scope]?.get(parsed.prefix);

    if (!storage) {
      return undefined!;
    }

    return {
      ...parsed,
      storage,
      source,
    } as any;
  }

  private get _storageScopes() {
    if (!this._cachedStorages) {
      this._cachedStorages = new Map();
      this._mappings.forEach((prefixes, scope: VariableScope) =>
        prefixes?.forEach((storage) =>
          get(this._cachedStorages!, storage, () => new Set()).add(scope)
        )
      );
    }
    return this._cachedStorages;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ): void {
    this._storageScopes.forEach(
      (_, storage) =>
        isWritable(storage) && storage.configureScopeDurations(durations)
    );
  }

  async renew(scopes: VariableScope[], scopeIds: string[]): Promise<void> {
    let matchingScopes: VariableScope[];
    await waitAll(
      map(
        this._storageScopes,
        ([storage, mappedScopes]) =>
          isWritable(storage) &&
          (matchingScopes = scopes.filter((scope) => mappedScopes.has(scope)))
            .length &&
          storage.renew(matchingScopes, scopeIds)
      )
    );
  }

  private _splitKeys<K extends (VariableKey | undefined | null)[]>(
    keys: K
  ): Map<ReadOnlyVariableStorage, PartitionItems<K>> {
    const partitions = new Map<ReadOnlyVariableStorage, PartitionItems<K>>();

    keys.forEach((sourceKey, sourceIndex) => {
      if (!sourceKey) return;

      const { storage, key } = this._mapKey(sourceKey);
      const keepPrefix = this._keepPrefix(storage);
      get(partitions, storage, () => [] as PartitionItems<K>).push([
        sourceIndex,
        !keepPrefix && key !== sourceKey.key
          ? { ...sourceKey, key: key }
          : sourceKey,
      ]);
    });

    return partitions;
  }

  private _splitFilters(filters: VariableFilter[]) {
    const partitions = new Map<ReadOnlyVariableStorage, VariableFilter[]>();
    for (const filter of filters) {
      const keySplits = new Map<ReadOnlyVariableStorage, Set<string>>();
      const addKey = (
        storage: ReadOnlyVariableStorage | undefined,
        key: ParsedKey
      ) =>
        storage &&
        get(keySplits, storage, () => new Set()).add(
          this._keepPrefix(storage) ? key.sourceKey : key.key
        );

      const scopes = filter.scopes ?? VariableScopes;
      for (const scope of scopes) {
        const scopePrefixes = this._mappings[scope];
        if (!scopePrefixes) continue;

        for (const key of filter.keys) {
          const parsed = parseKey(key);
          if (key === "*" || parsed.prefix === "*") {
            scopePrefixes.forEach((storage) => addKey(storage, parsed));
          } else {
            addKey(scopePrefixes.get(parsed.prefix), parsed);
          }
        }
      }

      for (const [storage, keys] of keySplits) {
        const storageScopes = this._storageScopes.get(storage);
        if (!storageScopes) continue;

        get(partitions, storage, () => []).push({
          ...filter,
          keys: [...keys],
          scopes: filter.scopes
            ? filter.scopes.filter((scope) => storageScopes.has(scope))
            : [...storageScopes],
        });
      }
    }
    return [...partitions];
  }

  protected async _patchGetResults(
    storage: ReadOnlyVariableStorage,
    getters: VariableGetter<any, false>[],
    results: (Variable | undefined)[]
  ) {
    return results;
  }

  async get<K extends (VariableGetter<any, false> | null | undefined)[]>(
    ...keys: K
  ): Promise<VariableGetResults<K>> {
    const results: VariableGetResults<K> = [] as any;
    await waitAll(
      map(
        this._splitKeys(keys),
        ([storage, split]) =>
          isWritable(storage) &&
          mergeKeys(
            results,
            split,
            async (variables) =>
              await this._patchGetResults(
                storage,
                variables as VariableGetter<any, false>[],
                await storage.get(...variables)
              )
          )
      )
    );

    return results;
  }

  private async _queryOrHead(
    method: "query" | "head",
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): Promise<VariableQueryResult<any>> {
    const partitions = this._splitFilters(filters);
    const results: VariableQueryResult = {
      count: options?.count ? 0 : undefined,
      results: [],
    };
    if (!partitions.length) {
      return results;
    }
    if (partitions.length === 1) {
      return await partitions[0][0][method](partitions[0][1], options);
    }

    type Cursor = [count: number | undefined, cursor: string | undefined][];
    let cursor = options?.cursor
      ? (JSON.parse(options.cursor) as Cursor)
      : undefined;

    let top = options?.top ?? 100;
    let anyCursor = false;

    for (
      let i = 0;
      // Keep going as long as we need the total count, or have not sufficient results to meet top (or done).
      // If one of the storages returns an undefined count even though requested, we will also blank out the count in the combined results
      // and stop reading from additional storages since total count is no longer needed.
      i < partitions.length && (top > 0 || isDefined(results.count));
      i++
    ) {
      const [storage, query] = partitions[0];
      const storageState = cursor?.[i];

      let count: number | undefined;
      if (storageState && (!isDefined(storageState[1]) || !top)) {
        // We have persisted the total count from the storage in the combined cursor.
        // If the cursor is empty it means that we have exhausted the storage.
        // If there is a cursor but `top` is zero (we don't need more results), we use the count cached from the initial query.
        count = storageState[0];
      } else {
        const {
          count: storageCount,
          results: storageResults,
          cursor: storageCursor,
        } = await storage[method](query, {
          ...options,
          top,
          cursor: storageState?.[1],
        });

        count = storageCount;
        anyCursor ||= !!storageCursor;
        (cursor ??= [])[i] = [count, storageCursor];
        results.results.push(...(storageResults as Variable[])); // This is actually only the header for head requests.
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

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): Promise<VariableQueryResult> {
    return this._queryOrHead("query", filters, options);
  }

  protected async _patchSetResults(
    storage: VariableStorage,
    setters: VariableSetter<any, false>[],
    results: (VariableSetResult | undefined)[]
  ) {
    return results;
  }

  async set<K extends (VariableSetter<any, false> | null | undefined)[]>(
    ...variables: K
  ): Promise<VariableSetResults<K>> {
    const results: VariableSetResults<K> = [] as any;
    await waitAll(
      map(
        this._splitKeys(variables),
        ([storage, split]) =>
          isWritable(storage) &&
          mergeKeys(
            results,
            split,
            async (variables) =>
              await this._patchSetResults(
                storage,
                variables as VariableSetter<any, false>[],
                await storage.set(...variables)
              )
          )
      )
    );

    return results;
  }

  async purge(filters: VariableFilter[]): Promise<void> {
    const partitions = this._splitFilters(filters);
    if (!partitions.length) {
      return;
    }
    await waitAll(
      partitions.map(
        ([storage, filters]) => isWritable(storage) && storage.purge(filters)
      )
    );
  }
}

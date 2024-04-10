import {
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableScopeValue,
  VariableSetResult,
  VariableSetter,
  toStrict,
  variableScope,
} from "@tailjs/types";
import {
  DoubleMap,
  MaybePromise,
  Wrapped,
  forEach,
  get,
  isDefined,
  map,
  unwrap,
  waitAll,
} from "@tailjs/util";
import { ParsedKey, PartitionItems, mergeKeys, parseKey } from "../lib";

import {
  ReadonlyVariableStorage,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  VariableStorageContext,
  isWritable,
} from "..";

export type PrefixMapping = { storage: ReadonlyVariableStorage };
export type PrefixMappings = Record<
  VariableScopeValue,
  Map<string, PrefixMapping> | undefined
>;

export class VariableSplitStorage implements VariableStorage {
  private readonly _mappings: DoubleMap<
    [VariableScope, string],
    ReadonlyVariableStorage
  >;
  private _cachedStorages: Map<
    ReadonlyVariableStorage,
    Set<VariableScope>
  > | null = null;

  constructor(mappings: Wrapped<PrefixMappings>) {
    forEach(unwrap(mappings), ([scope, mappings]) =>
      mappings?.forEach(({ storage }, prefix) =>
        this._mappings.set([variableScope(scope), prefix], storage)
      )
    );
  }

  protected _keepPrefix(storage: ReadonlyVariableStorage) {
    return storage instanceof VariableSplitStorage;
  }

  private _mapKey<K extends VariableKey | undefined>(
    source: K
  ): K extends undefined
    ? undefined
    : ParsedKey & {
        storage: ReadonlyVariableStorage;
        source: K;
      } {
    if (!source) return undefined as any;

    const parsed = parseKey(source.key);
    let storage = this._mappings.get([
      variableScope(source.scope),
      parsed.prefix,
    ]);

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
      this._mappings.forEach((storage, [scope]) =>
        get(this._cachedStorages!, storage, () => new Set()).add(scope)
      );
    }
    return this._cachedStorages;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext
  ): void {
    this._storageScopes.forEach(
      (_, storage) =>
        isWritable(storage) &&
        storage.configureScopeDurations(durations, context)
    );
  }

  public async renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext
  ): Promise<void> {
    await waitAll(
      map(
        this._storageScopes,
        ([storage, mappedScopes]) =>
          isWritable(storage) &&
          mappedScopes.has(scope) &&
          storage.renew(scope, scopeIds, context)
      )
    );
  }

  private _splitKeys<K extends (VariableKey | undefined | null)[]>(
    keys: K
  ): Map<ReadonlyVariableStorage, PartitionItems<K>> {
    const partitions = new Map<ReadonlyVariableStorage, PartitionItems<K>>();

    keys.forEach((sourceKey, sourceIndex) => {
      if (!sourceKey) return;

      const { storage, key } = this._mapKey(sourceKey);
      const keepPrefix = this._keepPrefix(storage);
      (get(partitions, storage, () => [] as any) as any).push([
        sourceIndex,
        !keepPrefix && key !== sourceKey.key
          ? { ...sourceKey, key: key }
          : sourceKey,
      ]);
    });

    return partitions;
  }

  private _splitFilters(filters: VariableFilter[]) {
    const partitions = new Map<ReadonlyVariableStorage, VariableFilter[]>();
    for (const filter of filters) {
      const keySplits = new Map<ReadonlyVariableStorage, Set<string>>();
      const addKey = (
        storage: ReadonlyVariableStorage | undefined,
        key: ParsedKey
      ) =>
        storage &&
        get(keySplits, storage, () => new Set()).add(
          this._keepPrefix(storage) ? key.sourceKey : key.key
        );

      const scopes = map(filter.scopes, variableScope) ?? variableScope.values;
      for (const scope of scopes) {
        const scopePrefixes = this._mappings.getMap(scope);
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
            ? filter.scopes.filter((scope) =>
                storageScopes.has(variableScope(scope))
              )
            : [...storageScopes],
        });
      }
    }
    return [...partitions];
  }

  protected async _patchGetResults(
    storage: ReadonlyVariableStorage,
    getters: VariableGetter<any>[],
    results: (Variable | undefined)[]
  ) {
    return results;
  }

  async get<K extends readonly (VariableGetter<any> | null | undefined)[]>(
    keys: K | readonly (VariableGetter<any> | null | undefined)[],
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K>> {
    const results: VariableGetResults<K> = [] as any;
    await waitAll(
      map(
        this._splitKeys(keys.map(toStrict)),
        ([storage, split]) =>
          isWritable(storage) &&
          mergeKeys(
            results,
            split,
            async (variables) =>
              await this._patchGetResults(
                storage,
                variables as VariableGetter<any>[],
                await storage.get(variables, context)
              )
          )
      )
    );

    return results;
  }

  private async _queryOrHead(
    method: "query" | "head",
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
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

    const includeCursor =
      options?.cursor?.include || !!options?.cursor?.previous;

    let cursor = options?.cursor?.previous
      ? (JSON.parse(options.cursor.previous) as Cursor)
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
          cursor: {
            include: includeCursor,
            previous: storageState?.[1],
          },
        });

        count = storageCount;
        if (includeCursor) {
          anyCursor ||= !!storageCursor;
          (cursor ??= [])[i] = [count, storageCursor];
        } else if (storageResults.length > top) {
          // No cursor needed. Cut off results to avoid returning excessive amounts of data to the client.
          storageResults.length = top;
        }
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
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options, context);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ): Promise<VariableQueryResult> {
    return this._queryOrHead("query", filters, options, context);
  }

  protected async _patchSetResults(
    storage: VariableStorage,
    setters: VariableSetter<any>[],
    results: (VariableSetResult | undefined)[]
  ) {
    return results;
  }

  async set<K extends readonly (VariableSetter<any> | null | undefined)[]>(
    variables: K | readonly (VariableSetter<any> | null | undefined)[],
    context?: VariableStorageContext
  ): Promise<VariableSetResults<K>> {
    const results: VariableSetResults<K> = [] as any;
    await waitAll(
      map(
        this._splitKeys(variables.map(toStrict)),
        ([storage, split]) =>
          isWritable(storage) &&
          mergeKeys(
            results,
            split,
            async (variables) =>
              await this._patchSetResults(
                storage,
                variables as VariableSetter<any, boolean>[],
                await storage.set(variables, context)
              )
          )
      )
    );

    return results;
  }

  async purge(
    filters: VariableFilter[],
    context?: VariableStorageContext
  ): Promise<void> {
    const partitions = this._splitFilters(filters);
    if (!partitions.length) {
      return;
    }
    await waitAll(
      partitions.map(
        ([storage, filters]) =>
          isWritable(storage) && storage.purge(filters, context)
      )
    );
  }
}

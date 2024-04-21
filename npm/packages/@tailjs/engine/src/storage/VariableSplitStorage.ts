import {
  ParsedKey,
  Variable,
  VariableFilter,
  VariableGetters,
  VariableGetResult,
  VariableGetResults,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableScope,
  VariableScopeValue,
  VariableSetters,
  VariableSetResult,
  VariableSetResults,
  VariableSetter,
  formatKey,
  parseKey,
  variableScope,
} from "@tailjs/types";
import {
  DoubleMap,
  MaybePromise,
  Nullish,
  PartialRecord,
  Wrapped,
  forEach,
  get,
  isDefined,
  map,
  unwrap,
  waitAll,
} from "@tailjs/util";
import { PartitionItems, mergeKeys } from "../lib";

import {
  ReadonlyVariableStorage,
  VariableStorage,
  VariableStorageContext,
  isWritable,
} from "..";

export type PrefixMapping = {
  storage: ReadonlyVariableStorage;
};
export type PrefixMappings = PartialRecord<
  VariableScopeValue<true>,
  Record<string, PrefixMapping>
>;

export class VariableSplitStorage implements VariableStorage {
  private readonly _mappings = new DoubleMap<
    [VariableScope, string],
    ReadonlyVariableStorage
  >();
  private _cachedStorages: Map<
    ReadonlyVariableStorage,
    Set<VariableScope>
  > | null = null;

  private readonly _errorWrappers = new Map<
    ReadonlyVariableStorage,
    SplitStorageErrorWrapper
  >();

  private readonly _patchGetResults: (
    storage: SplitStorageErrorWrapper,
    getters: (VariableGetter<any, true> | Nullish)[],
    results: (VariableGetResult<any, true> | undefined)[],
    context: VariableStorageContext | undefined
  ) => Promise<(VariableGetResult | undefined)[]>;

  private readonly _patchSetResults: (
    storage: SplitStorageErrorWrapper,
    setters: (VariableSetter<any, true> | Nullish)[],
    results: (VariableSetResult | undefined)[],
    context: VariableStorageContext | undefined
  ) => Promise<(VariableSetResult | undefined)[]>;

  constructor(
    mappings: Wrapped<PrefixMappings>,
    patchGetResults: (
      storage: SplitStorageErrorWrapper,
      getters: (VariableGetter<any, true> | Nullish)[],
      results: (VariableGetResult<any, true> | undefined)[],
      context: VariableStorageContext | undefined
    ) => Promise<(VariableGetResult | undefined)[]> = (results: any) => results,
    patchSetResults: (
      storage: SplitStorageErrorWrapper,
      setters: (VariableSetter<any, true> | Nullish)[],
      results: (VariableSetResult | undefined)[],
      context: VariableStorageContext | undefined
    ) => Promise<(VariableSetResult | undefined)[]> = (results: any) => results
  ) {
    this._patchGetResults = patchGetResults;
    this._patchSetResults = patchSetResults;
    forEach(unwrap(mappings), ([scope, mappings]) =>
      forEach(
        mappings,
        ([prefix, { storage }]) => (
          this._errorWrappers.set(
            storage,
            new SplitStorageErrorWrapperImpl(storage)
          ),
          this._mappings.set([1 * scope, prefix], storage as any)
        )
      )
    );
  }

  protected _keepPrefix(storage: ReadonlyVariableStorage) {
    return storage instanceof VariableSplitStorage;
  }

  private _mapKey<K extends VariableKey<true> | undefined>(
    source: K
  ): K extends undefined
    ? undefined
    : ParsedKey & {
        storage: ReadonlyVariableStorage;
        source: K;
      } {
    if (!source) return undefined as any;

    const parsed = parseKey(source.key);
    let storage = this._mappings.get([+source.scope, parsed.prefix]);

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
    durations: Partial<Record<VariableScope, number>>,
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
      ...map(
        this._storageScopes,
        ([storage, mappedScopes]) =>
          isWritable(storage) &&
          mappedScopes.has(scope) &&
          storage.renew(scope, scopeIds, context)
      )
    );
  }

  private _splitKeys<K extends readonly (VariableKey<true> | Nullish)[]>(
    keys: K
  ): Map<ReadonlyVariableStorage, PartitionItems<K, Nullish>> {
    const partitions = new Map<
      ReadonlyVariableStorage,
      PartitionItems<K, Nullish>
    >();

    keys.forEach((sourceKey, sourceIndex) => {
      if (!sourceKey) return;

      const mappedKey = this._mapKey(sourceKey);
      if (!mappedKey) {
        throw new Error(
          `No storage is mapped for the key ${formatKey(sourceKey)}.`
        );
      }
      const { storage, key } = mappedKey;
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

  private _splitFilters(filters: VariableFilter<true>[]) {
    const partitions = new Map<
      ReadonlyVariableStorage,
      VariableFilter<true>[]
    >();
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

      const scopes = filter.scopes ?? variableScope.values;
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
            ? filter.scopes.filter((scope) => storageScopes.has(scope))
            : [...storageScopes],
        });
      }
    }
    return [...partitions];
  }

  async get<K extends VariableGetters<true>>(
    keys: VariableGetters<true, K>,
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K>> {
    // Make sure none of the underlying storages makes us throw exceptions. A validated variable storage does not do that.
    context = { ...context, throw: false } as any;

    const results: (VariableGetResult | undefined)[] = [] as any;
    await waitAll(
      ...map(this._splitKeys(keys), ([storage, split]) =>
        mergeKeys(
          results,
          split,
          async (variables) =>
            await this._patchGetResults(
              this._errorWrappers.get(storage)!,
              variables,
              await storage.get(variables, context),
              context
            )
        )
      )
    );

    return results as VariableGetResults<K>;
  }

  private async _queryOrHead(
    method: "query" | "head",
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
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
        } = await storage[method](
          query,
          {
            ...options,
            top,
            cursor: {
              include: includeCursor,
              previous: storageState?.[1],
            },
          },
          context
        );

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
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true> | undefined,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options, context);
  }

  query(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true> | undefined,
    context?: VariableStorageContext
  ): Promise<VariableQueryResult> {
    return this._queryOrHead("query", filters, options, context);
  }

  async set<K extends VariableSetters<true>>(
    variables: VariableSetters<true, K>,
    context?: VariableStorageContext
  ): Promise<VariableSetResults<K>> {
    // Make sure none of the underlying storages makes us throw exceptions. A validated variable storage does not do that.
    context = { ...context, throw: false } as any;

    const results: VariableSetResults<K> = [] as any;
    await waitAll(
      ...map(
        this._splitKeys(variables),
        ([storage, split]) =>
          isWritable(storage) &&
          mergeKeys(
            results,
            split,
            async (variables) =>
              await this._patchSetResults(
                this._errorWrappers.get(storage)!,
                variables,
                await storage.set(variables, context),
                context
              )
          )
      )
    );

    return results;
  }

  async purge(
    filters: VariableFilter<true>[],
    context?: VariableStorageContext
  ): Promise<void> {
    const partitions = this._splitFilters(filters);
    if (!partitions.length) {
      return;
    }
    await waitAll(
      ...partitions.map(
        ([storage, filters]) =>
          isWritable(storage) && storage.purge(filters, context)
      )
    );
  }
}

export interface SplitStorageErrorWrapper {
  readonly writable: boolean;

  get<K extends VariableGetters<true>>(
    keys: K,
    context: VariableStorageContext
  ): PromiseLike<VariableGetResults<K>>;

  set<V extends VariableSetters<true>>(
    variables: V,
    context: VariableStorageContext
  ): PromiseLike<VariableSetResults<V>>;
}

class SplitStorageErrorWrapperImpl implements SplitStorageErrorWrapper {
  private readonly _storage: ReadonlyVariableStorage;
  public readonly writable: boolean;

  constructor(storage: ReadonlyVariableStorage) {
    this._storage = storage;
    this.writable = isWritable(storage);
  }

  async get<K extends VariableGetters<true>>(
    keys: K,
    context: VariableStorageContext
  ) {
    try {
      return await this._storage.get(keys, context);
    } catch (error) {
      return keys.map(
        (key) => key && { status: VariableResultStatus.Error, error }
      ) as any;
    }
  }
  async set<V extends VariableSetters<true>>(
    variables: V,
    context: VariableStorageContext
  ) {
    if (!this.writable) throw new TypeError("Storage is not writable.");
    try {
      return await (this._storage as VariableStorage).set(variables, context);
    } catch (error) {
      return variables.map(
        (source) =>
          source && { status: VariableResultStatus.Error, error, source }
      ) as any;
    }
  }
}

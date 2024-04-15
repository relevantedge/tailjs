import {
  ParsedKey,
  Variable,
  VariableFilter,
  VariableGetParameter,
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
  VariableSetParameter,
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
  storage: ReadonlyVariableStorage<true> | ReadonlyVariableStorage<false>;
};
export type PrefixMappings = PartialRecord<
  VariableScopeValue<true>,
  Record<string, PrefixMapping>
>;

export class VariableSplitStorage implements VariableStorage<true> {
  private readonly _mappings = new DoubleMap<
    [VariableScope, string],
    ReadonlyVariableStorage<boolean>
  >();
  private _cachedStorages: Map<
    ReadonlyVariableStorage<boolean>,
    Set<VariableScope>
  > | null = null;

  private readonly _errorWrappers = new Map<
    ReadonlyVariableStorage<boolean>,
    SplitStorageErrorWrapper
  >();

  private readonly _patchGetResults: (
    storage: SplitStorageErrorWrapper,
    getters: (VariableGetter<any, true> | Nullish)[],
    results: (VariableGetResult<any, true> | undefined)[],
    context: VariableStorageContext<true> | undefined
  ) => Promise<(VariableGetResult | undefined)[]>;

  private readonly _patchSetResults: (
    storage: SplitStorageErrorWrapper,
    setters: (VariableSetter<any, true> | Nullish)[],
    results: (VariableSetResult | undefined)[],
    context: VariableStorageContext<true> | undefined
  ) => Promise<(VariableSetResult | undefined)[]>;

  constructor(
    mappings: Wrapped<PrefixMappings>,
    patchGetResults: (
      storage: SplitStorageErrorWrapper,
      getters: (VariableGetter<any, true> | Nullish)[],
      results: (VariableGetResult<any, true> | undefined)[],
      context: VariableStorageContext<true> | undefined
    ) => Promise<(VariableGetResult | undefined)[]> = (results: any) => results,
    patchSetResults: (
      storage: SplitStorageErrorWrapper,
      setters: (VariableSetter<any, true> | Nullish)[],
      results: (VariableSetResult | undefined)[],
      context: VariableStorageContext<true> | undefined
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
    context?: VariableStorageContext<true>
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
    context?: VariableStorageContext<true>
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
  ): Map<ReadonlyVariableStorage<true>, PartitionItems<K, Nullish>> {
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

  async get<
    K extends VariableGetParameter<true>,
    C extends VariableStorageContext<true>
  >(
    keys: K | VariableGetParameter<true>,
    context?: C
  ): Promise<VariableGetResults<K, C>> {
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

    return results as VariableGetResults<K, C>;
  }

  private async _queryOrHead(
    method: "query" | "head",
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext<true>
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
    context?: VariableStorageContext<true>
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options, context);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext<true>
  ): Promise<VariableQueryResult> {
    return this._queryOrHead("query", filters, options, context);
  }

  async set<
    K extends VariableSetParameter<true>,
    C extends VariableStorageContext<true>
  >(
    variables: K | VariableSetParameter<true>,
    context?: C
  ): Promise<VariableSetResults<K, C>> {
    // Make sure none of the underlying storages makes us throw exceptions. A validated variable storage does not do that.
    context = { ...context, throw: false } as any;

    const results: VariableSetResults<K, C> = [] as any;
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
    filters: VariableFilter[],
    context?: VariableStorageContext<true>
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

  get<
    K extends VariableGetParameter<true>,
    C extends VariableStorageContext<true>
  >(
    keys: K,
    context: C
  ): PromiseLike<VariableGetResults<K, C>>;

  set<
    V extends VariableSetParameter<true>,
    C extends VariableStorageContext<true>
  >(
    variables: V,
    context: C
  ): PromiseLike<VariableSetResults<V, C>>;
}

class SplitStorageErrorWrapperImpl implements SplitStorageErrorWrapper {
  private readonly _storage: ReadonlyVariableStorage<true>;
  public readonly writable: boolean;

  constructor(storage: ReadonlyVariableStorage<boolean>) {
    this._storage = storage;
    this.writable = isWritable(storage);
  }

  async get<K extends VariableGetParameter<true>>(
    keys: K,
    context: VariableStorageContext<true>
  ) {
    try {
      return await this._storage.get(keys, context);
    } catch (error) {
      return keys.map(
        (key) => key && { status: VariableResultStatus.Error, error }
      ) as any;
    }
  }
  async set<V extends VariableSetParameter<true>>(
    variables: V,
    context: VariableStorageContext<true>
  ) {
    if (!this.writable) throw new TypeError("Storage is not writable.");
    try {
      return await (this._storage as VariableStorage<true>).set(
        variables,
        context
      );
    } catch (error) {
      return variables.map(
        (source) =>
          source && { status: VariableResultStatus.Error, error, source }
      ) as any;
    }
  }
}

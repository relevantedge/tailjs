import {
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableInitializer,
  VariablePatch,
  VariableQueryResult,
  VariableQuerySettings,
  VariableScope,
  VariableScopeNames,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  isConflictResult,
  isErrorResult,
  isSuccessResult,
  isVariablePatch,
} from "@tailjs/types";
import {
  PartialRecord,
  delay,
  forEach,
  get,
  group,
  isArray,
  isDefined,
  isUndefined,
  map,
  waitAll,
} from "@tailjs/util";
import {
  ReadOnlyVariableStorage,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  isWritable,
} from "..";

export interface StorageScopeMapping {
  default?: ReadOnlyVariableStorage;
  session?: ReadOnlyVariableStorage;

  /** Defaults to session if unspecified. */
  deviceSession?: ReadOnlyVariableStorage;

  device?: ReadOnlyVariableStorage;
  user?: ReadOnlyVariableStorage;
  global?: ReadOnlyVariableStorage;

  /** Defaults to global if unspecified. */
  entity?: ReadOnlyVariableStorage;
}

export interface StorageMapping extends StorageScopeMapping {
  prefixes?: Record<string, StorageScopeMapping>;
}

export interface VariableStorageRouterSettings {
  mapping: StorageMapping;
  retries?: number;
  retryDelay?: number;
}

const mapSet = <T>(source: T | T[] | undefined): Set<T> | undefined => {
  if (isUndefined(source)) return undefined;
  if (!isArray(source)) {
    source = [source];
  }
  return new Set(source);
};

type KeyMapping = {
  storage: ReadOnlyVariableStorage;
  prefix: string;
  key: string;
  sourceKey: string;
};

type ParsedKey = {
  prefix: string;
  localKey: string;
  localKeyQuery: string;
};

type MappedSetter<T extends VariableSetter = VariableSetter> =
  VariableSetter & {
    original: { index: number; source: T };
  };

type StorageInfo = { id: number; scopes: Set<VariableScope> };

const parseKey = (key: string): ParsedKey => {
  const prefixIndex = key.indexOf(":");
  const prefix = prefixIndex < 0 ? "" : key.substring(0, prefixIndex);
  const localKey = prefixIndex > -1 ? key.slice(prefixIndex + 1) : key;

  return {
    prefix,
    localKey: localKey.endsWith("*") ? localKey.slice(0, -1) : localKey,
    localKeyQuery: localKey,
  };
};

export class VariableStorageRouter implements VariableStorage {
  private readonly _storageMappings = new Map<
    string,
    Record<VariableScope, ReadOnlyVariableStorage | undefined>
  >();

  private readonly _storages = new Map<ReadOnlyVariableStorage, StorageInfo>();

  private readonly _keyMappings = new Map<
    string,
    PartialRecord<VariableScope, KeyMapping | null>
  >();

  private readonly _retries: number;
  private readonly _retryDelay: number;

  constructor({
    mapping,
    retries = 3,
    retryDelay = 50,
  }: VariableStorageRouterSettings) {
    this._retries = retries;
    this._retryDelay = retryDelay;

    const getScopeMappings = (
      mapping: StorageScopeMapping
    ): Record<VariableScope, ReadOnlyVariableStorage | undefined> =>
      [
        mapping.global ?? mapping.default,
        mapping.session ?? mapping.default,
        mapping.deviceSession ?? mapping.session ?? mapping.default,
        mapping.device ?? mapping.default,
        mapping.user ?? mapping.default,
        mapping.entity ?? mapping.global ?? mapping.default,
      ].map((storage, scope) => {
        if (storage) {
          get(this._storages, storage, () => ({
            id: this._storages.size + 1,
            scopes: new Set(),
          })).scopes.add(scope);
        }
        return storage;
      }) as any;

    this._storageMappings.set("", getScopeMappings(mapping));
    forEach(mapping.prefixes, ([prefix, mappings]) =>
      this._storageMappings.set(prefix, getScopeMappings(mappings))
    );
  }

  private _mapKey<Throw extends boolean = true>(
    scope: VariableScope,
    key: string,
    throwIfNoMatch: Throw = true as any
  ): KeyMapping | (Throw extends true ? never : undefined) {
    let mapping = this._keyMappings.get(key)?.[scope];
    if (!isDefined(mapping)) {
      const { prefix, localKey } = parseKey(key);
      const storage = this._storageMappings.get(prefix)?.[scope];
      mapping = storage
        ? { storage, prefix, key: localKey, sourceKey: key }
        : null;
    }

    if (mapping == null) {
      if (throwIfNoMatch) {
        throw new Error(
          `No storage is mapped for the key '${key}' in ${VariableScopeNames[scope]} scope.`
        );
      }
      return undefined as any;
    }
    return mapping;
  }

  private _splitFilters(filters: VariableFilter[], writableOnly = false) {
    const splits = new Map<ReadOnlyVariableStorage, VariableFilter[]>();

    for (const queryFilter of filters) {
      const prefixKeyQueries = group(
        queryFilter.keys?.map(parseKey),
        (parsed) => parsed.prefix,
        (parsed) => parsed.localKeyQuery
      );
      const scopeSplits = new Map<
        ReadOnlyVariableStorage,
        { scopes: Set<VariableScope>; keys?: Set<string> }
      >();

      for (const prefix of prefixKeyQueries?.keys() ??
        this._storageMappings.keys()) {
        const scopeMappings = this._storageMappings.get(prefix);
        if (!scopeMappings) {
          continue;
        }
        for (const scope of queryFilter.scopes ?? VariableScopes) {
          const storage = scopeMappings[scope];
          if (!storage || (writableOnly && !isWritable(storage))) continue;
          const local = get(scopeSplits, storage, () => ({
            scopes: new Set(),
            keys: new Set(),
          }));
          local.scopes.add(scope);
          prefixKeyQueries
            ?.get(prefix)
            ?.forEach((key) => (local.keys ??= new Set()).add(key));
        }
      }

      for (const [storage, storageFilters] of scopeSplits) {
        get(splits, storage, () => []).push({
          ...queryFilter,
          scopes:
            storageFilters.scopes.size < VariableScopes.length
              ? map(storageFilters)
              : undefined,
          keys: map(storageFilters.keys),
        });
      }
    }

    return splits;
  }

  private async _dispatchSetters<T extends VariableSetter>(
    storage: VariableStorage,
    setters: T[]
  ): Promise<VariableSetResult<any, T>[]> {
    const finalResults: VariableSetResult<any, T>[] = [];
    let pending = setters;

    const dispatchValueSetters = async <T extends VariableSetter>(
      setters: T[]
    ) => {
      try {
        return await storage.set(...setters);
      } catch (e) {
        finalResults.push(
          ...pending.map((source) => ({
            status: VariableSetStatus.Error as const,
            error: `Operation did not complete after ${this._retries} attempts.`,
            source: source,
          }))
        );
      }
      return undefined;
    };

    for (let i = 0; i <= this._retries; i++) {
      let results = await dispatchValueSetters(pending);
      if (!results) {
        break;
      }

      let patches: (VariablePatch & T)[] = [];

      pending = [];
      for (const result of results) {
        if (isErrorResult(result) && result.transient) {
          pending.push(result.source);
          continue;
        } else if (
          result.status === VariableSetStatus.Unsupported &&
          isVariablePatch(result.source)
        ) {
          patches.push(result.source);
        } else {
          finalResults.push(result);
        }
      }
      if (patches.length) {
        const current = await storage.get(...patches);
        patches = [];
        const patchSetters: MappedSetter<T>[] = [];
        for (let i = 0; i < patches.length; i++) {
          const patched = patches[i].patch(current[i]);
          if (patched) {
            patchSetters.push({
              ...current[i],
              ...(patched as VariableSetter),
              original: { index: i, source: patches[i] },
            });
          }
        }
        if (patchSetters.length) {
          let results = await dispatchValueSetters(patchSetters);
          if (!results) {
            break;
          }
          for (const result of results) {
            const source = result.source.original.source;
            if (isErrorResult(result) && result.transient) {
              pending.push(source);
              continue;
            } else {
              finalResults.push({
                ...result,
                source,
              });
            }
          }
        }
      }

      if (!pending.length) {
        break;
      } else if (i === this._retries) {
        finalResults.push(
          ...pending.map((source) => ({
            status: VariableSetStatus.Error as const,
            error: `Operation did not complete after ${this._retries} attempts.`,
            source: source,
          }))
        );
      } else {
        await delay((0.8 + 0.2 * Math.random()) & this._retryDelay);
      }
    }
    return finalResults;
  }

  public async get<K extends (VariableGetter | null | undefined)[]>(
    ...getters: K
  ): Promise<VariableGetResults<K>> {
    const results: (Variable | undefined)[] = [];
    const mappedGetters = map(getters, (getter, sourceIndex) => {
      return getter
        ? {
            ...(getter as VariableGetter),
            ...this._mapKey(getter.scope, getter.key),
            sourceIndex,
          }
        : undefined;
    });

    const mappings = group(mappedGetters, (item) => item.storage);

    await waitAll(
      map(mappings, async ([storage, getters]) => {
        const localResults = await storage.get(...getters);

        let initialValueSetters:
          | (Variable & { sourceIndex: number })[]
          | undefined;
        let writable = isWritable(storage);
        for (let i = 0; i < getters.length; i++) {
          let initializer: VariableInitializer | undefined;
          if (localResults[i]) {
            results[getters[i].sourceIndex] = localResults[i];
          } else if (writable && (initializer = getters[i].initializer)) {
            const initialValue = await initializer();

            if (isDefined(initialValue)) {
              (initialValueSetters ??= []).push({
                ...getters[i],
                ...initialValue,
                sourceIndex: i,
              });
            }
          }

          if (initialValueSetters) {
            // If any initial value setters, we know the storage is writable.
            for (const result of await this._dispatchSetters(
              storage as VariableStorage,
              initialValueSetters
            )) {
              if (isSuccessResult(result)) {
                results[result.source.sourceIndex] = result.current;
              }
            }
          }
        }
      })
    );

    return results as any;
  }

  head(
    filters: VariableFilter[],
    options?: VariableQuerySettings | undefined
  ): Promise<VariableQueryResult<VariableHeader>> {
    return this.query(filters, options);
  }

  async query(
    filters: VariableFilter[],
    options?: VariableQuerySettings | undefined
  ): Promise<VariableQueryResult<Variable>> {
    const split = this._splitFilters(filters);
    // We keep the last count returned from each storage.
    // If at least one of the storages returns a cursor, we have then captured the count from those that didn't.
    // In this way we can return the correct count from those storages not involved in paging with subsequent queries.
    //
    // Also not that we only make a special joined cursor if multiple storages are involved.
    // Otherwise, we just return whatever cursor the single storage came up with.
    const cursor:
      | Record<number, [count: number | undefined, cursor?: any]>
      | undefined = options?.cursor;

    const storageResults = new Map<
      ReadOnlyVariableStorage,
      VariableQueryResult<Variable>
    >();

    await waitAll(
      map(split, ([storage, filters]) => async () => {
        const storageCursor =
          split.size > 1
            ? cursor?.[this._storages.get(storage)!.id]?.[1]
            : options?.cursor;
        if (cursor && !isDefined(storageCursor)) {
          return;
        }
        storageResults.set(
          storage,
          await storage.query(
            filters,
            options
              ? {
                  ...options,
                  cursor: storageCursor,
                }
              : undefined
          )
        );
      })
    );

    if (storageResults.size === 1) {
      for (const [storage, result] of storageResults) {
        // Single storage involved. Just forward its results after checking the read-only flag.
        !isWritable(storage) &&
          result.results.forEach((result) => (result.readonly ??= true));

        return result;
      }
    }

    const finalResults: VariableQueryResult<Variable> = {
      count: 0,
      results: [],
    };
    let anyCursor = false;
    const nextCursor: typeof cursor = {};
    for (const storage of split.keys()) {
      const storageIndex = this._storages.get(storage)!.id;
      const results = storageResults.get(storage);
      let count: number | undefined;

      if (results) {
        anyCursor ||= isDefined(results.cursor);
        count = results.count;
        if (
          !isDefined(options?.top) ||
          finalResults.results.length < options.top
        ) {
          !isWritable(storage) &&
            results.results.forEach((result) => (result.readonly ??= true));

          finalResults.results.push(...results.results);
          if (results.results.length > (options?.top as any)) {
            finalResults.results.length = options!.top!;
          }
        }
      } else {
        count = cursor?.[storageIndex]?.[0];
      }

      if (isDefined(finalResults.count)) {
        finalResults.count =
          !cursor && isDefined(count) ? finalResults.count + count : undefined;
      }
      nextCursor[storageIndex] = [count, results?.cursor];
    }
    if (anyCursor && !isDefined(options?.top)) {
      // Only if any of the storages returned a cursor, we do this.
      // Otherwise we must return an empty cursor to indicate that we are done.
      finalResults.cursor = nextCursor;
    }
    return finalResults;
  }

  async configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ) {
    this._storages.forEach((id, storage) => {
      isWritable(storage) && storage.configureScopeDurations(durations);
    });
  }

  set<K extends (VariableSetter | null | undefined)[]>(
    ...variables: K
  ): Promise<VariableSetResults<K>>;
  async set(...variables: VariableSetter[]): Promise<VariableSetResult[]> {
    const results: VariableSetResult[] = [];
    const setters = group(
      variables.map((source, index) => ({
        ...source,
        ...this._mapKey(source.scope, source.key),
        original: { source, index },
      })),
      (setter) => setter.storage
    );
    await waitAll(
      map(setters, async ([storage, setters]) => {
        const storageResults = isWritable(storage)
          ? await this._dispatchSetters(storage, setters)
          : setters.map((setter) => ({
              status: VariableSetStatus.ReadOnly as const,
              source: setter,
            }));

        for (let i = 0; i < storageResults.length; i++) {
          const result = storageResults[i];
          if (
            (isSuccessResult(result) || isConflictResult(result)) &&
            result.current
          ) {
            result.current.key = setters[i].sourceKey;
          }
          const { source, index } = result.source.original;
          result.source = source as any;
          results[index] = result;
        }
      })
    );
    return results;
  }

  async renew(scopes: VariableScope[], targetIds: string[]) {
    await waitAll(
      map(this._storages, ([storage, info]) => {
        const storageScopes = scopes.filter((scope) => info.scopes.has(scope));
        return isWritable(storage) && storageScopes.length
          ? storage.renew(scopes, targetIds)
          : undefined;
      })
    );
  }

  async purge(filters: VariableFilter[], batch?: boolean): Promise<void> {
    const split = this._splitFilters(filters);
    await waitAll(
      map(split, ([storage, filters]) => {
        return isWritable(storage)
          ? async () => {
              await storage.purge(filters, batch);
            }
          : undefined;
      })
    );
  }
}

import {
  Variable,
  VariableFilter,
  VariableKeyWithInitializer,
  VariablePatchAction,
  VariableQueryParameters,
  VariableQueryResult,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableValuePatch,
  isConflictResult,
  isSuccessResult,
} from "@tailjs/types";
import {
  ValueType,
  delay,
  filter,
  get,
  group,
  isArray,
  isDefined,
  isUndefined,
  map,
} from "@tailjs/util";
import {
  ReadOnlyVariableStorage,
  VariableGetResults,
  VariableStorage,
  getPatchedValue,
  getVariableMapKey,
  isWritable,
} from "..";

export interface StorageRoute {
  storage: ReadOnlyVariableStorage;
  match?: StorageRouteMatch[];
  renames?: Record<string, string>;
}

export interface StorageRouteMatch {
  scope?: ArrayOrSingle<VariableScope>;
  prefix?: ArrayOrSingle<string>;
  key?: ArrayOrSingle<string>;
}

type ArrayOrSingle<T> = T | T[];
const mapSet = <T>(source: T | T[] | undefined): Set<T> | undefined => {
  if (isUndefined(source)) return undefined;
  if (!isArray(source)) {
    source = [source];
  }
  return new Set(source);
};

type StorageMapping = {
  storage: ReadOnlyVariableStorage;
  id: number;
  scopes: Set<VariableScope>;
};

interface RouteRegistration {
  storage: ReadOnlyVariableStorage;
  matches: RouteRegistrationMatch[];
  renames?: Record<string, string>;
}

interface RouteRegistrationMatch {
  scopes?: Set<VariableScope>;
  prefixes?: Set<string>;
  keys?: Set<string>;
}

interface KeyMapping {
  storage: ReadOnlyVariableStorage;
  key: string;
  match: RouteRegistrationMatch;
}

type SetterMapping<T extends VariableSetter = VariableSetter> = {
  setter: T;
  source: VariableSetter;
  sourceIndex: number;
};

type PatchCollection = Map<
  VariableStorage,
  Map<string, SetterMapping<VariableValuePatch | VariablePatchAction>[]>
>;

export type VariableStorageRouterSettings = {
  routes: StorageRoute[];
  retries?: number;
  retryDelay?: number;
};

export class VariableStorageRouter implements VariableStorage {
  private readonly _keyMappings: Map<string, KeyMapping>[] = [];
  private readonly _routes: RouteRegistration[];
  private readonly _prefixMappings: Map<
    string,
    { storage: ReadOnlyVariableStorage; scopeKeys: Set<string>[] }[]
  > = new Map();

  private readonly _sourceKeyMappings = new Map<
    ReadOnlyVariableStorage,
    Map<string, string>[]
  >();

  private readonly _storages = new Map<
    ReadOnlyVariableStorage,
    StorageMapping
  >();

  private readonly _retries: number;
  private readonly _retryDelay: number;

  constructor({
    routes,
    retries = 3,
    retryDelay = 50,
  }: VariableStorageRouterSettings) {
    this._retries = retries;
    this._retryDelay = retryDelay;

    const storageMappings = new Map<ReadOnlyVariableStorage, StorageMapping>();
    const registerStorageScopes = (
      storage: ReadOnlyVariableStorage,
      scopes: Set<VariableScope> | undefined
    ) => {
      const mapping = get(storageMappings, storage, () => ({
        storage,
        id: this._storages.size,
        scopes: new Set(),
      }));
      (scopes ?? VariableScopes).forEach((scope: VariableScope) =>
        mapping.scopes.add(scope)
      );
      return scopes;
    };

    // Project source routes to internal set-based objects for faster lookups.
    this._routes = routes.map(({ storage, match }) => {
      const reg: RouteRegistration = {
        storage: storage,
        matches: (match ?? [{} as StorageRouteMatch]).map((match) => {
          return {
            keys: mapSet(match.key),
            prefixes: mapSet(match.prefix),
            scopes: registerStorageScopes(storage, mapSet(match.scope)),
          };
        }),
      };

      return reg;
    });

    // Index storages by prefix. Routes without explicit prefixes implicitly have [""]
    for (const { storage, matches, renames } of this._routes) {
      matches.forEach((match) =>
        (match.prefixes ?? [""]).forEach((prefix: string) => {
          for (const scope of match.scopes ?? VariableScopes) {
            const mappings = get(this._prefixMappings, prefix, () => []);
            const newKeys = mappings.some(
              (mapping) => mapping.scopeKeys[scope]?.has("") === true
            )
              ? []
              : filter(
                  match.keys,
                  (key) =>
                    !mappings.some(
                      (mapping) => mapping.scopeKeys[scope]?.has(key) === true
                    ),
                  true
                );

            if (newKeys?.length === 0) {
              return;
            }

            let mapping = mappings.find(
              (mapping) => mapping.storage === storage
            );
            if (!mapping) {
              mapping = { storage, scopeKeys: [] };
              mappings.push(mapping);
            }

            const scopeKeys = (mapping.scopeKeys[scope] ??= new Set());
            const keyMappings = (get(
              this._sourceKeyMappings,
              storage,
              () => []
            )[scope] ??= new Map());
            if (!newKeys) {
              !keyMappings.has("") && keyMappings.set("", prefix);
              scopeKeys.add("");
            } else {
              newKeys.forEach((key) => {
                const sourceKey = renames?.[key] ?? key;
                !keyMappings.has(sourceKey) &&
                  keyMappings.set(sourceKey, prefix + key);
                scopeKeys.add(key);
              });
              // Make sure the "any key" mapping is last to route specific keys correctly.
              mappings.sort(
                (x, y) =>
                  (x.scopeKeys[scope]?.has("") ? 1 : 0) -
                  (y.scopeKeys[scope]?.has("") ? 1 : 0)
              );
            }
          }
        })
      );
    }
  }

  private _mapKey<T extends boolean = true>(
    scope: VariableScope,
    key: string,
    throwIfNoMatch: T = true as any
  ): KeyMapping | (T extends false ? undefined : never) {
    const scopeMappings = (this._keyMappings[scope ?? -1] ??= new Map());

    let mapped = scopeMappings.get(key);
    if (!mapped && key) {
      // Only evaluate the logic to find the storage for a key once, and then cache it to avoid performance overhead.
      const prefixIndex = key.indexOf(":");
      let prefix = prefixIndex < 0 ? "" : key.substring(0, prefixIndex);
      if (prefixIndex > -1) {
        key = key.substring(prefixIndex + 1);
      }

      for (const { storage, matches, renames } of this._routes) {
        for (const match of matches) {
          if (match.prefixes?.has(prefix) === false) {
            continue;
          }

          if (match.keys?.has(key) === false) {
            continue;
          }

          scopeMappings.set(
            key,
            (mapped = {
              storage,
              key: renames?.[key] ?? key,
              match,
            })
          );
          return mapped;
        }
      }
    }

    if (!mapped && throwIfNoMatch) {
      throw new Error(
        `No storage is mapped to the key ${key} in scope ${scope}.`
      );
    }
    return mapped as any;
  }

  private _splitFilters(filters: VariableFilter[]) {
    const splits = new Map<ReadOnlyVariableStorage, VariableFilter[]>();

    for (const filter of filters) {
      const filterSplits = new Map<
        ReadOnlyVariableStorage,
        Map<string, VariableFilter>
      >();

      const addFilter = (
        storage: ReadOnlyVariableStorage,
        key: string,
        update: (current: VariableFilter) => void
      ) => {
        const filters = get(filterSplits, storage, () => new Map());
        update(
          get(filters, key, () => {
            const split = {
              ...filter,
              prefixes: undefined,
              keys: undefined,
              scopes: undefined,
            };
            get(splits, storage, () => []).push(split);
            return split;
          })
        );
      };

      if (filter.keys) {
        for (const key of filter.keys) {
          // If the filter includes specific keys, figure out which key belongs to which providers.
          for (const scope of filter.scopes ?? VariableScopes) {
            const mapped = this._mapKey(scope, key, false);
            if (mapped) {
              // Since a key is mapped for a specific scope (no scopes in the route means "all scopes"),
              // we need to add a filter for each scope since different providers may handle the same key for different scopes.
              addFilter(mapped.storage, "" + scope, (current) => {
                (current.keys ??= []).push(mapped.key);
                current.scopes ??= [scope];
              });
            }
          }
        }
      } else {
        for (const prefix of filter.prefixes ?? this._prefixMappings.keys()) {
          // Apply the filters from the route mapping before forwarding the filters to the source storages
          // to make sure that we don't get data from a storage beyond what is routed.
          this._prefixMappings.get(prefix)?.forEach((mapping) => {
            for (const scope of filter.scopes ?? VariableScopes) {
              const scopeKeys = mapping.scopeKeys[scope];
              if (scopeKeys) {
                addFilter(
                  mapping.storage,
                  scopeKeys.has("") ? "" : "" + scope,
                  (current) => {
                    (current.scopes ??= []).push(scope);
                    if (!scopeKeys.has("")) {
                      (current.keys ??= []).push(...scopeKeys.keys());
                    }
                  }
                );
              }
            }
          });
        }
      }
    }

    return splits;
  }

  private async _distpatchSetters(
    storage: VariableStorage,
    mappings: SetterMapping[],
    results: VariableSetResult[],
    patches: PatchCollection
  ) {
    let storageResults: VariableSetResult[];
    let error: Error | undefined = undefined;
    try {
      storageResults = await storage.set(
        ...mappings.map((mapping) => mapping.setter)
      );
    } catch (e) {
      for (const mapping of mappings) {
        results[mapping.sourceIndex] = {
          status: VariableSetStatus.Error,
          error,
          source: mapping.source,
        };
      }
      return;
    }

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const result = storageResults[i];

      if (result.status === VariableSetStatus.Unsupported) {
        // The storage did not support the requested kind of patch.
        // Collect the setter so it can be applied later via optimistic concurrency.
        get(
          get(patches, storage, () => new Map()),
          getVariableMapKey(mapping.setter),
          () => []
        ).push(mapping as any);
        continue;
      }

      const storageResult = storageResults[i];
      results[mapping.sourceIndex] = (mapping.setter !== mapping.source
        ? {
            ...storageResult,
            source: mapping.source,
          }
        : storageResult) ?? {
        status: VariableSetStatus.Error,
        error: new Error(
          `The storage for setter #${mapping.sourceIndex} did not return a result.`
        ),
      };
    }
  }

  async _set(variables: VariableSetter[]): Promise<VariableSetResult[]> {
    type SetterMapping<T extends VariableSetter = VariableSetter> = {
      setter: T;
      source: VariableSetter;
      sourceIndex: number;
    };

    const results: VariableSetResult[] = [];

    // Split variables to their respective source storages.
    const splits = new Map<VariableStorage, SetterMapping[]>();
    let sourceIndex = -1;
    for (const source of variables) {
      ++sourceIndex;
      const { storage, key } = this._mapKey(source.scope, source.key) ?? {};
      if (!storage) {
        results[sourceIndex] = { status: VariableSetStatus.NotFound, source };
        continue;
      }

      if (!isWritable(storage)) {
        results[sourceIndex] = { status: VariableSetStatus.ReadOnly, source };
        continue;
      }

      get(splits, storage, () => []).push({
        setter: key !== source.key ? { ...source, key } : source,
        source,
        sourceIndex,
      });
    }

    let promises: Promise<void>[] = [];

    // Patches that were not supported by their storage grouped by storage, then by key.
    // (Multiple patches may exist for the same key with different selectors).
    let patches: PatchCollection | undefined;

    // Dispatch setters to their respective source stages in parallel.
    splits.forEach((setters, storage) => {
      promises.push(
        this._distpatchSetters(
          storage,
          setters,
          results,
          (patches ??= new Map())
        )
      );
    });

    await Promise.all(promises);

    // One or more of the storages did not supported the requested kind of patch operation.
    // We apply the patches via optimistic concurrency.
    if (patches?.size) {
      promises = [];
      patches.forEach((mappings, storage) => {
        promises.push(
          (async () => {
            const keys = map(mappings, ([, values]) => values[0].setter);

            const vars = new Map(
              filter(await storage.get(...keys)).map((value) => [
                getVariableMapKey(value),
                value,
              ])
            );

            keys.forEach((key) => {
              const mapKey = getVariableMapKey(key);
              if (!vars.has(mapKey)) {
                // Add new values (that is, keys that did not exist in the storage).
                vars.set(mapKey, {
                  ...key,
                  value: undefined,
                  version: undefined,
                });
              }
            });

            const updates: SetterMapping[] = [];
            mappings.forEach((mappings) =>
              mappings.forEach((mapping) => {
                const key = getVariableMapKey(mapping.setter);
                const current = vars.get(key) ?? {
                  ...mapping.setter,
                  version: undefined,
                  value: undefined,
                };
                const patchedValue = getPatchedValue(current, mapping.setter);
                if (patchedValue.changed) {
                  current.value = patchedValue.patchedValue;
                  updates.push({
                    ...mapping,
                    setter: {
                      ...mapping.setter,
                      version: current.version,
                      value: patchedValue[0],
                    },
                  });
                }
              })
            );

            if (updates.length) {
              await this._distpatchSetters(
                storage,
                updates,
                results,
                (patches ??= new Map())
              );
            }
          })()
        );
      });
      await Promise.all(promises);
    }

    return results;
  }

  public async get<K extends (VariableKeyWithInitializer | null | undefined)[]>(
    ...keys: K
  ): Promise<VariableGetResults<K>> {
    if (keys.length === 1) {
      const key = keys[0];
      if (!key) return [undefined] as any;
      const mapping = this._mapKey(key.scope, key.key);
      return (await mapping.storage.get({
        scope: key.scope,
        key: mapping.key,
        targetId: key.targetId,
      })) as any;
    }
    const finalResults: (Variable | undefined)[] = [];
    const mappedKeys = map(keys, (key, sourceIndex) => {
      return key
        ? {
            scope: key.scope,
            sourceIndex,
            originalKey: key.key,
            ...this._mapKey(key.scope, key.key),
            targetId: key.targetId,
            initializer: key.initializer,
          }
        : undefined;
    });

    const mappings = group(mappedKeys, (item) => item.storage);
    await Promise.all(
      map(mappings, ([storage, mappedKeys]) => async () => {
        let missingInit: ValueType<typeof mappedKeys>[] = null!;
        (await storage.get(...mappedKeys)).forEach((result, i) => {
          const mapped = mappedKeys[i];

          finalResults[mapped.sourceIndex] =
            result &&
            (mapped.originalKey !== result.key
              ? {
                  ...result,
                  key: mapped.originalKey,
                }
              : result);
          if (!result && mapped.initializer) {
            (missingInit ??= []).push(mapped);
          }
        });
        if (missingInit) {
          if (!isWritable(storage)) {
            throw new Error(
              `The variables ${missingInit
                .map((mapping) => `'${mapping.originalKey}'`)
                .join(
                  ", "
                )} can not be initialized since their storage is not writable.`
            );
          }
          const setters: Variable[] = missingInit.map((mapping) => ({
            ...mapping.initializer!(),
            scope: mapping.scope,
            key: mapping.key,
            targetId: mapping.targetId,
          }));

          const results = await storage.set(...setters);
          results.forEach((result, i) => {
            if (isConflictResult(result)) {
              finalResults[i] = result.current;
            } else if (isSuccessResult(result)) {
              finalResults[i] = { ...setters[i], ...result };
            }
          });
        }
      })
    );

    return finalResults as any;
  }

  async query(
    filters: VariableFilter[],
    options?: VariableQueryParameters | undefined
  ): Promise<VariableQueryResult> {
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
      VariableQueryResult
    >();

    await Promise.all(
      map(split, ([storage, filters]) =>
        (async () => {
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
        })()
      )
    );

    if (storageResults.size === 1) {
      for (const result of storageResults.values()) {
        // Single storage involved. Just forward its results.
        return result;
      }
    }

    const finalResults: VariableQueryResult = { count: 0, results: [] };
    let anyCursor = false;
    const nextCursor: typeof cursor = {};
    for (const storage of split.keys()) {
      const storageIndex = this._storages.get(storage)!.id;
      const results = storageResults.get(storage);
      let count: number | undefined;

      if (results) {
        anyCursor ||= isDefined(results.cursor);
        count = results.count;
        if (!isDefined(options?.top) || results.results.length < options.top) {
          results.results.push(...finalResults.results);
          if (results.results.length > (options?.top as any)) {
            results.results.length = options!.top!;
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
    this._storages.forEach(({ storage, scopes }) => {
      const storageDurations = Object.entries(durations).filter(([scope]) =>
        scopes.has(+scope)
      );
      if (!storageDurations.length || !isWritable(storage)) return;
      storage.configureScopeDurations(Object.fromEntries(storageDurations));
    });
  }

  set(...variables: VariableSetter[]): Promise<VariableSetResult[]>;
  set(
    ...variables: (VariableSetter | undefined | null)[]
  ): Promise<(VariableSetResult | undefined)[]>;
  async set(
    ...variables: (VariableSetter | undefined | null)[]
  ): Promise<(VariableSetResult | undefined)[]> {
    const finalResults: (VariableSetResult | undefined)[] = [];
    let pending = filter(variables);
    const sourceIndices = new Map<VariableSetter, number>();

    variables.forEach(
      (variable, index) => variable && sourceIndices.set(variable, index)
    );

    new Map(variables.map((setter, index) => [setter, index]));
    for (let i = 0; i <= this._retries; i++) {
      const results = await this._set(pending);
      pending = [];
      for (const result of results) {
        if (
          result.status === VariableSetStatus.Conflict ||
          (result.status === VariableSetStatus.Error && result.transient)
        ) {
          pending.push(result.source);
          continue;
        }
        finalResults[sourceIndices.get(result.source)!] = result;
      }
      if (!pending.length) {
        break;
      }
      await delay((0.8 + 0.2 * Math.random()) & this._retryDelay);
    }
    return finalResults;
  }

  async renew(scopes: VariableScope[], targetIds: string[]) {
    await Promise.all(
      map(this._storages.values(), (mapping) => {
        const storageScopes = scopes.filter((scope) =>
          mapping.scopes.has(scope)
        );
        return isWritable(mapping.storage) && storageScopes.length
          ? mapping.storage.renew(scopes, targetIds)
          : undefined;
      })
    );
  }

  async purge(filters: VariableFilter[], batch?: boolean): Promise<void> {
    const split = this._splitFilters(filters);
    await Promise.all(
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

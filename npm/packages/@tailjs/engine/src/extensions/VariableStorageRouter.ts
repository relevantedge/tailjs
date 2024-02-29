import {
  Variable,
  VariableFilter,
  VariableQueryResult,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import {
  filter,
  get,
  isArray,
  isDefined,
  isUndefined,
  map,
} from "@tailjs/util";
import {
  ReadOnlyVariableStorage,
  VariableQueryParameters,
  VariableStorage,
  getPatchedValue,
  getVariableKey,
  isWritable,
} from "..";

export interface StorageRoute {
  storage: ReadOnlyVariableStorage;
  match?: StorageRouteMatch[];
  renames?: Record<string, string>;
}

type ArrayOrSingle<T> = T | T[];
const mapSet = <T>(source: T | T[] | undefined): Set<T> | undefined => {
  if (isUndefined(source)) return undefined;
  if (!isArray(source)) {
    source = [source];
  }
  return new Set(source);
};

export interface StorageRouteMatch {
  scope?: ArrayOrSingle<VariableScope>;
  prefix?: ArrayOrSingle<string>;
  key?: ArrayOrSingle<string>;
}

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

export type VariableStorageRouterSettings = {
  routes: StorageRoute[];
  retries?: number;
  retryDelay?: number;
};

export class VariableStorageRouter {
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
    key: string,
    scope: VariableScope,
    throwIfNoMatch: T = true as any
  ): KeyMapping | (T extends false ? undefined : never) {
    const scopeMappings = (this._keyMappings[scope ?? -1] ??= new Map());

    let mapped = scopeMappings.get(key);
    if (!mapped && key) {
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

  private _mapVariable<T extends Variable | undefined>(
    source: ReadOnlyVariableStorage,
    variable: T
  ): T {
    if (!variable) return variable;

    const keyMappings =
      this._sourceKeyMappings.get(source)?.[
        variable.target?.scope ?? VariableScope.None
      ];
    variable.key =
      keyMappings?.get(variable.key) ??
      (keyMappings?.get("") ?? "") + variable.key;
    return variable;
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
            const mapped = this._mapKey(key, scope, false);
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

  async _set(variables: VariableSetter[]): Promise<VariableSetResult[]> {
    type SetterMapping = [
      setter: VariableSetter,
      source: VariableSetter,
      sourceIndex: number
    ];

    const results: VariableSetResult[] = [];

    const splits = new Map<VariableStorage, SetterMapping[]>();
    let sourceIndex = -1;
    for (const source of variables) {
      // Map variables to their source storages.
      ++sourceIndex;
      const { storage, key } =
        this._mapKey(
          source.key,
          source.target?.id ? source.target.scope : VariableScope.None
        ) ?? {};
      if (!storage) {
        results[sourceIndex] = { status: VariableSetStatus.NotFound, source };
        continue;
      }

      if (!isWritable(storage)) {
        results[sourceIndex] = { status: VariableSetStatus.ReadOnly, source };
        continue;
      }

      get(splits, storage, () => []).push([
        key !== source.key ? { ...source, key } : source,
        source,
        sourceIndex,
      ]);
    }

    let promises: Promise<void>[] = [];
    let patches: Map<VariableStorage, SetterMapping[]> | undefined;

    splits.forEach((setters, storage) => {
      promises.push(execSetters(storage, setters));
    });

    await Promise.all(promises);

    if (patches) {
      promises = [];
      patches.forEach((setters, storage) => {
        promises.push(
          (async () => {
            const vars = new Map(
              (
                await storage.query([
                  { variables: setters.map((setter) => setter[0]) },
                ])
              ).results.map((result) => [getVariableKey(result), result])
            );

            const updates: SetterMapping[] = [];
            for (let i = 0; i < setters.length; i++) {
              const setter = setters[i];
              const current = vars.get(getVariableKey(setter[1])) ?? {
                ...setter[1],
                version: undefined,
                value: undefined,
              };
              const patchedValue = getPatchedValue(current, setter[1]);
              if (patchedValue) {
                updates.push([
                  setter[0],
                  {
                    ...setter[1],
                    version: current.version,
                    value: patchedValue[0],
                  },
                  setter[2],
                ]);
              }
            }
            if (updates.length) {
              await execSetters(storage, updates);
            }
          })()
        );
      });
      await Promise.all(promises);
    }

    return results;

    async function execSetters(
      storage: VariableStorage,
      setters: SetterMapping[]
    ) {
      let storageResults: VariableSetResult[];
      let error: Error | undefined = undefined;
      try {
        storageResults = await storage.set(setters.map((setter) => setter[0]));
      } catch (e) {
        storageResults = [];
        error = e;
      }

      for (let i = 0; i < setters.length; i++) {
        const setter = setters[i];
        if (error) {
          results[setter[2]] = {
            status: VariableSetStatus.Error,
            error,
            source: setter[1],
          };
          continue;
        }

        if (storageResults[i].status === VariableSetStatus.Unsupported) {
          get((patches ??= new Map()), storage, () => []).push(setter);
          continue;
        }

        results[setter[2]] = (setter[0] !== setter[1]
          ? { ...storageResults[i], source: setter[0] }
          : storageResults[i]) ?? {
          status: VariableSetStatus.Error,
          error: new Error(
            `The storage for setter #${setter[2]} did not return a result.`
          ),
        };
      }
    }
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

  async set(variables: VariableSetter[]): Promise<VariableSetResult[]> {
    const finalResults: VariableSetResult[] = [];
    let pending = variables;
    const sourceIndices = new Map(
      variables.map((variable, index) => [variable, index])
    );
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
    }
    return finalResults;
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

  async get(
    key: string,
    target?: VariableTarget | null | undefined
  ): Promise<Variable | undefined> {
    const mapping = this._mapKey(key, target?.scope ?? VariableScope.None);
    return this._mapVariable(
      mapping.storage,
      await mapping.storage.get(key, target)
    );
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
}

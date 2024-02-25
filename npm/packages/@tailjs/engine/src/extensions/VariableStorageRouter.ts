import {
  DataClassification,
  DataPurpose,
  GenericError,
  Variable,
  VariableFilter,
  VariableQueryResult,
  VariableScope,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import {
  ReadOnlyVariableStorage,
  TrackerEnvironment,
  VariableQueryParameters,
  VariableStorage,
  isWritable,
} from "..";
import { MaybePromise, groupReduce, isArray, isDefined } from "@tailjs/util";

export interface StorageRoute {
  storage: ReadOnlyVariableStorage;
  match: StorageRouteMatch[];
  renames?: Record<string, string>;
}

export interface StorageRouteMatch {
  scope?: VariableScope[];
  prefix?: string | string[];
  key?: string | string[];
  volatile?: boolean;
  classification?: {
    min?: DataClassification;
    max?: DataClassification;
  };
}

interface StorageRouteRegistration extends StorageRoute {
  reverseRenames?: Record<string, string>;
}

const test = <T>(source: T | T[] | undefined, test: (value: T) => any) =>
  source == null || ((source as T[]).some?.(test) ?? test(source as any));

type KeyMapping = {
  storage: ReadOnlyVariableStorage;
  key: string;
  match: StorageRouteMatch;
};

export class VariableStorageRouter {
  private readonly _routeCache: Map<string, KeyMapping>[] = [];
  private readonly _routes: StorageRouteRegistration[];

  private readonly _writableStorages = new Set<VariableStorage>();

  constructor(routes: StorageRoute[]) {
    this._routes = [
      ...groupReduce(
        routes,
        (route) => route.storage,
        (acc: StorageRouteRegistration, item) => {
          if (!acc) {
            acc = item;
          } else {
            acc.match.push(...item.match);
            if (item.renames) {
              acc.renames = { ...acc.renames, ...item.renames };
            }
          }
          if (item.renames) {
            acc.reverseRenames ??= {};
            for (const [from, to] of Object.entries(item.renames)) {
              acc.reverseRenames[to] = from;
            }
          }
          return acc;
        }
      ).values(),
    ];

    for (const route of this._routes) {
      if (isWritable(route.storage)) {
        this._writableStorages.add(route.storage);
      }
    }
  }

  private _mapStorage<T extends boolean = true>(
    key: string,
    classification: DataClassification,
    scope: VariableScope | null,
    throwIfNoMatch: T = true as any
  ): KeyMapping | (T extends false ? undefined : never) {
    const scopeMappings = (this._routeCache[scope ?? -1] ??= new Map());

    let mapped = scopeMappings.get(key);
    if (!mapped) {
      for (const { storage, match: matches, renames } of this._routes) {
        for (const match of matches) {
          if (
            (!test(match.prefix, (prefix) => key.startsWith(prefix)) &&
              !test(match.key, (routeKey) => key === routeKey)) ||
            (isDefined(scope) &&
              !test(match.scope, (routeScope) => routeScope === scope)) ||
            classification < (match.classification?.min as any) ||
            classification > (match.classification?.max as any)
          ) {
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
        `No storage is mapped to the key ${key} in scope ${scope} for the classification ${classification}.`
      );
    }
    return mapped as any;
  }

  async set(variables: VariableSetter[]): Promise<VariableSetResult[]> {
    const results: VariableSetResult[] = [];

    const groups = new Map<
      VariableStorage,
      [setter: VariableSetter, source: VariableSetter, sourceIndex: number][]
    >();
    let sourceIndex = -1;
    for (const source of variables) {
      ++sourceIndex;
      const { storage, key } = this._mapStorage(
        source.key,
        source.classification,
        source.target?.id ? source.target.scope : VariableScope.None
      );

      if (!isWritable(storage)) {
        results[sourceIndex] = { status: VariableSetStatus.ReadOnly, source };
        continue;
      }

      let storageSetters = groups.get(storage);
      if (!storageSetters) {
        groups.set(storage, (storageSetters = []));
      }

      storageSetters.push([
        key !== source.key ? { ...source, key } : source,
        source,
        sourceIndex,
      ]);
    }

    const promises: Promise<void>[] = [];
    groups.forEach((setters, storage) => {
      promises.push(
        (async () => {
          let storageResults: VariableSetResult[];
          let error: Error | undefined = undefined;
          try {
            storageResults = await storage.set(
              setters.map((setter) => setter[0])
            );
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
                source: setter[0],
              };
              continue;
            }
            // TODO: Handle patch if the storage doesn't using optimistic concurrency version.
            results[setter[2]] = (setter[0] !== setter[1]
              ? { ...storageResults[i], source: setter[0] }
              : storageResults[i]) ?? {
              status: VariableSetStatus.Error,
              error: new Error(
                `The storage for setter #${setter[2]} did not return a result.`
              ),
            };
          }
        })()
      );
    });

    await Promise.all(promises);
    return results;
  }

  async purge(filters: VariableFilter[]): Promise<void> {
    const groups = new Map<VariableStorage, VariableFilter[]>();

    const addFilter = (storage: VariableStorage, filter: VariableFilter) => {
      let storageFilters = groups.get(storage);
      if (!storageFilters) {
        groups.set(storage, (storageFilters = []));
      }
      storageFilters.push(filter);
    };

    for (const filter of filters) {
      if (!filter.keys) {
        for (const storage of this._writableStorages) {
          addFilter(storage, filter);
        }
        continue;
      }

      const mappedFilters = new Map<VariableStorage, VariableFilter>();

      const mergeRoute = (mapping: KeyMapping | undefined) => {
        if (!mapping || !isWritable(mapping.storage)) {
          return;
        }

        let current = mappedFilters.get(mapping.storage);
        if (!current) {
          mappedFilters.set(
            mapping.storage,
            (current = { ...mapping, keys: [] })
          );
          addFilter(mapping.storage, current);
        }
        current.keys!.push(mapping.key);
      };

      const classifications = filter.classifications;
      let levels = classifications?.levels;
      if (!levels) {
        levels = [];
        for (
          let i = classifications?.min ?? 0, max = classifications?.max ?? 3;
          i <= max;
          i++
        ) {
          levels.push(i);
        }
      }
      const scopes = filter.scopes ?? [0, 1, 2, 3, 4, 5];
      for (const key of filter.keys) {
        const seen = new Set<KeyMapping>();
        for (const level of levels) {
          for (const scope of scopes) {
            const mapping = this._mapStorage(key, level, scope, false);
            if (mapping && !seen.has(mapping)) {
              seen.add(mapping);
              mergeRoute(mapping);
            }
          }
        }
      }
    }

    const promises: Promise<void>[] = [];
    groups.forEach((filters, storage) =>
      promises.push((async () => await storage.purge(filters))())
    );
    await Promise.all(promises);
  }

  async get(
    key: string,
    target?: VariableTarget | null | undefined,
    purpose?: DataPurpose | undefined,
    classification = DataClassification.None
  ): Promise<Variable | undefined> {
    const mapping = this._mapStorage(
      key,
      classification,
      target?.scope ?? VariableScope.None
    );
    return await mapping.storage.get(key, target, purpose, classification);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryParameters | undefined
  ): MaybePromise<VariableQueryResult> {
    // TODO:
    throw new Error("Method not implemented.");
  }
}

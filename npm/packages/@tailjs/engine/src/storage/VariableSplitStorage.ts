import {
  extractKey,
  filterKeys,
  ReadOnlyVariableGetter,
  Variable,
  VariableGetResult,
  VariableKey,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableServerScope,
  VariableSetResult,
  VariableValueErrorResult,
  VariableValueSetter,
} from "@tailjs/types";
import { forEach2, forEachAwait2, formatError, keys2 } from "@tailjs/util";
import {
  isTransientErrorObject,
  isWritableStorage,
  ReadOnlyVariableStorage,
  TrackerEnvironment,
  VariableStorage,
  VariableStorageMappings,
  VariableStorageQuery,
} from "..";

export type WithTrace<T, Trace> = T & {
  [traceSymbol]: Trace & { source: WithTrace<T, Trace> };
};

export type CopyTrace<T, Source> = T & {
  [traceSymbol]: Source extends { [traceSymbol]: infer Trace }
    ? Trace
    : undefined;
};

export type AddSourceTrace<Source, Trace> = Trace extends undefined
  ? Source & { [traceSymbol]?: undefined }
  : Source & { [traceSymbol]: [AddSourceTrace<Source, Trace>, Trace] };

const unknownSource = (key: { scope: string; source?: string | null }): any =>
  ({
    status: VariableResultStatus.BadRequest,
    ...extractKey(key as any as VariableKey),
    [traceSymbol]: key[traceSymbol],
    error: `The scope ${key.scope} has no source with the ID '${key.source}'.`,
  } satisfies WithTrace<VariableValueErrorResult, any>);

type SplitFields = Pick<VariableKey, "source" | "scope">;

const traceSymbol = Symbol();
export const addSourceTrace = <Item, Trace>(
  item: Item,
  trace: Trace
): AddSourceTrace<Item, Trace> => (
  (item[traceSymbol] = [item, trace]), item as any
);

export const withTrace = <Item, Trace>(
  item: Item,
  trace: Trace
): WithTrace<Item, Trace> => (
  (trace["source"] = item), (item[traceSymbol] = trace), item as any
);

export const copyTrace = <Item, Trace>(
  item: Item,
  trace: { [traceSymbol]: Trace }
): WithTrace<Item, Trace> => (
  (item[traceSymbol] = trace[traceSymbol]), item as any
);

export const clearTrace = <Item>(
  item: Item
): Item extends { [traceSymbol]: any }
  ? Omit<Item, typeof traceSymbol>
  : Item => {
  if (item?.[traceSymbol]) {
    delete item[traceSymbol];
  }
  return item as any;
};

export const getTrace = <Trace>(item: { [traceSymbol]: Trace }): Trace =>
  item[traceSymbol];

const mergeTrace = <Target extends {}, Trace>(
  target: Target,
  {
    source,
    scope,
    [traceSymbol]: trace,
  }: { [traceSymbol]?: Trace } & SplitFields
): WithTrace<Target & SplitFields, Trace> =>
  Object.assign(target, { source, scope, [traceSymbol]: trace }) as any;

export interface VariableSplitStorageSettings {
  includeStackTraces?: boolean;
}

export interface StorageMappingSettings {
  /** Default time to live for variables in milliseconds. (Document will be deleted roughly after this time) */
  ttl: number | undefined;
}
export class VariableSplitStorage implements VariableStorage, Disposable {
  private readonly _mappings: Record<
    string,
    Record<
      string,
      { storage: ReadOnlyVariableStorage; settings: StorageMappingSettings }
    >
  >;
  private readonly _settings: VariableSplitStorageSettings | undefined;

  constructor(
    mappings: VariableStorageMappings,
    settings?: VariableSplitStorageSettings
  ) {
    this._mappings = {};
    this._settings = settings;
    const defaultStorage = mappings.default;
    for (const scope of VariableServerScope.levels) {
      const defaultScopeTtl = mappings.ttl?.[scope] ?? undefined;

      const scopeMappings =
        mappings[scope] ?? (defaultStorage && { storage: defaultStorage });
      if (!scopeMappings) {
        continue;
      }

      if (scopeMappings.storage) {
        (this._mappings[scope] ??= {})[""] = {
          storage: scopeMappings.storage,
          settings: { ttl: scopeMappings.ttl ?? defaultScopeTtl },
        };
      }
      forEach2(scopeMappings.prefixes, ([prefix, config]) => {
        if (!config) return;
        (this._mappings[scope] ??= {})[prefix] = {
          storage: config.storage,
          settings: { ttl: config.ttl ?? defaultScopeTtl },
        };
      });
    }
  }

  private async _splitApply<
    T extends { scope: string; source?: string | null },
    R
  >(
    keys: T[],
    action: (
      source: SplitFields,
      target: ReadOnlyVariableStorage,
      keys: T[],
      settings: StorageMappingSettings
    ) => Promise<false | (R[] | undefined | void)>,
    {
      notFound,
      parallel = true,
    }: {
      notFound?: (key: {
        scope: string;
        source?: string | null;
      }) => R | undefined | void;
      parallel?: boolean;
    } = {}
  ): Promise<R[]> {
    const results: R[] = [];
    const splits = new Map<
      ReadOnlyVariableStorage,
      [
        source: SplitFields,
        keys: T[],
        sourceIndices: number[],
        settings: StorageMappingSettings
      ]
    >();
    let sourceIndex = 0;

    for (const key of keys) {
      const { scope, source } = key;

      let { storage, settings } = this._mappings[scope]?.[source ?? ""];

      if (!storage) {
        const errorResult = notFound?.(key);
        errorResult && (results[sourceIndex++] = errorResult);
        continue;
      }

      let storageKeys = splits.get(storage);
      !storageKeys &&
        splits.set(
          storage,
          (storageKeys = [{ source, scope }, [], [], settings])
        );
      storageKeys[1].push(key);
      storageKeys[2].push(sourceIndex);
      sourceIndex++;
    }

    const tasks: Promise<any>[] = [];
    for (const [storage, [source, keys, sourceIndices, settings]] of splits) {
      const task = (async () => {
        let i = 0;
        const actionResults = await action(source, storage, keys, settings);
        if (actionResults) {
          for (const result of actionResults) {
            results[sourceIndices[i++]] = result;
          }
        }
        return actionResults;
      })();
      if (parallel) {
        tasks.push(task);
      } else {
        if ((await task) === false) {
          break;
        }
      }
    }

    if (tasks.length) {
      await Promise.all(tasks);
    }

    return results;
  }

  async get<Getter extends ReadOnlyVariableGetter>(
    keys: Getter[]
  ): Promise<CopyTrace<VariableGetResult, Getter>[]> {
    if (!keys.length) return [];

    return this._splitApply(
      keys,
      async (_source, storage, getters, settings) => {
        try {
          const defaultTtl = settings.ttl;
          if (defaultTtl! > 0) {
            for (const getter of getters) {
              getter.ttl ??= defaultTtl;
            }
          }
          return (await storage.get(getters)).map((result, i) =>
            mergeTrace(result, getters[i])
          );
        } catch (error) {
          return getters.map((key) =>
            mergeTrace(
              {
                status: VariableResultStatus.Error,
                ...extractKey(key),
                error: formatError(error, this._settings?.includeStackTraces),
                transient: isTransientErrorObject(error),
              },
              key
            )
          );
        }
      },
      { notFound: unknownSource }
    );
  }

  set<Setter extends VariableValueSetter>(
    values: Setter[]
  ): Promise<CopyTrace<VariableSetResult, Setter>[]> {
    if (!values.length) return [] as any;

    return this._splitApply(
      values,
      async (_source, storage, setters, settings) => {
        if (isWritableStorage(storage)) {
          const defaultTtl = settings.ttl;
          if (defaultTtl! > 0) {
            for (const setter of setters) {
              setter.ttl ??= defaultTtl;
            }
          }

          try {
            return (await storage.set(setters)).map((setter, i) =>
              mergeTrace(setter, setters[i])
            );
          } catch (error) {
            return setters.map((setter) =>
              mergeTrace(
                {
                  status: VariableResultStatus.Error,
                  ...extractKey(setter),
                  error: formatError(error, this._settings?.includeStackTraces),
                  transient: isTransientErrorObject(error),
                },
                setter
              )
            );
          }
        } else {
          return setters.map((setter) =>
            mergeTrace(
              {
                status: VariableResultStatus.BadRequest,
                ...extractKey(setter),
              },
              setter
            )
          );
        }
      },
      { notFound: unknownSource }
    );
  }

  public splitSourceQueries<T extends VariableQuery | VariableStorageQuery>(
    queries: readonly T[]
  ): (T & SplitFields)[] {
    const splits: (T & SplitFields)[] = [];

    for (const query of queries) {
      for (const scope of filterKeys(
        query.scope ? [query.scope] : (query as VariableQuery)?.scopes,
        keys2(this._mappings)
      )) {
        for (const source of filterKeys(
          (query as VariableQuery)?.sources,
          keys2(this._mappings[scope] ?? [null])
        )) {
          splits.push({
            source,
            scope,
            ...query,
            sources: [source],
            scopes: [scope],
          });
        }
      }
    }
    return splits;
  }

  async purge(queries: VariableStorageQuery[]): Promise<number | undefined> {
    let purged: number | undefined = 0;
    await this._splitApply(
      this.splitSourceQueries(queries),
      async (_source, storage, queries) => {
        if (isWritableStorage(storage)) {
          const count = await storage.purge(queries);
          if (count == null) {
            purged = undefined;
          } else if (purged != null) {
            purged += count;
          }
        }
      },
      { parallel: false }
    );
    return purged;
  }

  async renew(queries: VariableStorageQuery[]): Promise<number | undefined> {
    let refreshed: number | undefined = 0;
    await this._splitApply(
      this.splitSourceQueries(queries),
      async (_source, storage, queries) => {
        if (isWritableStorage(storage)) {
          const count = await storage.renew(queries);
          if (count == null) {
            refreshed = undefined;
          } else if (refreshed != null) {
            refreshed += count;
          }
        }
      },
      { parallel: false }
    );
    return refreshed;
  }

  async query(
    queries: VariableStorageQuery[],
    { page = 100, cursor: splitCursor }: VariableQueryOptions = {}
  ): Promise<VariableQueryResult> {
    const sourceQueries = this.splitSourceQueries(queries);
    // Cursor: Current query, current cursor
    const match = splitCursor?.match(/^(\d+)(?::(.*))?$/);
    let cursorOffset = match ? +match[1] : 0;
    let cursor = match?.[2] || undefined;

    const variables: Variable[] = [];
    let nextCursor: string | undefined;
    let offset = 0;

    await this._splitApply(
      sourceQueries,
      async (source, storage, queries) => {
        if (offset++ < cursorOffset) {
          return;
        }

        do {
          const result = await storage.query(queries, {
            page,
            cursor: cursor,
          });
          cursor = result.cursor;

          variables.push(
            ...result.variables.map((variable) => mergeTrace(variable, source))
          );
          if ((page -= result.variables.length) <= 0) {
            nextCursor = cursor ? `${offset - 1}:${cursor}` : `${offset}`;
            // Stop
            return false;
          }
        } while (cursor);
      },
      { parallel: false }
    );

    return {
      variables,
      cursor: nextCursor,
    };
  }

  public async initialize(environment: TrackerEnvironment): Promise<void> {
    await forEachAwait2(this._mappings, ([, mappings]) =>
      forEachAwait2(mappings, ([, { storage }]) => {
        storage?.initialize?.(environment);
      })
    );
  }

  [Symbol.dispose](): void {
    Object.values(this._mappings).forEach((mappings) =>
      Object.values(mappings).forEach((storage) => storage[Symbol.dispose]?.())
    );
  }
}

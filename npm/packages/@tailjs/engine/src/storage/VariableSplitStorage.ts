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
  VariableSetResult,
  VariableValueErrorResult,
  VariableValueSetter,
} from "@tailjs/types";
import { forEach2, forEachAsync, formatError, keys2 } from "@tailjs/util";
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

export class VariableSplitStorage implements VariableStorage, Disposable {
  private readonly _mappings: Record<
    string,
    Record<string, ReadOnlyVariableStorage>
  >;
  private readonly _settings: VariableSplitStorageSettings | undefined;

  constructor(
    mappings: VariableStorageMappings,
    settings?: VariableSplitStorageSettings
  ) {
    this._mappings = {};
    this._settings = settings;
    forEach2(mappings, ([scope, defaultConfig]) => {
      if (!defaultConfig) return;
      (this._mappings[scope] ??= {})[""] = defaultConfig.storage;
      forEach2(defaultConfig.prefixes, ([prefix, config]) => {
        if (!config) return;
        (this._mappings[scope] ??= {})[prefix] = config.storage;
      });
    });
  }

  private async _splitApply<
    T extends { scope: string; source?: string | null },
    R
  >(
    keys: T[],
    action: (
      source: SplitFields,
      target: ReadOnlyVariableStorage,
      keys: T[]
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
      [source: SplitFields, keys: T[], sourceIndices: number[]]
    >();
    let sourceIndex = 0;

    for (const key of keys) {
      const { scope, source } = key;

      let storage = this._mappings[scope]?.[source ?? ""];

      if (!storage) {
        const errorResult = notFound?.(key);
        errorResult && (results[sourceIndex++] = errorResult);
        continue;
      }

      let storageKeys = splits.get(storage);
      !storageKeys &&
        splits.set(storage, (storageKeys = [{ source, scope }, [], []]));
      storageKeys[1].push(key);
      storageKeys[2].push(sourceIndex);
      sourceIndex++;
    }

    const tasks: Promise<any>[] = [];
    for (const [storage, [source, keys, sourceIndices]] of splits) {
      const task = (async () => {
        let i = 0;
        const actionResults = await action(source, storage, keys);
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
      async (_source, storage, keys) => {
        try {
          return (await storage.get(keys)).map((result, i) =>
            mergeTrace(result, keys[i])
          );
        } catch (error) {
          return keys.map((key) =>
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
      async (_source, storage, setters) => {
        if (isWritableStorage(storage)) {
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

  public splitSourceQueries<T extends VariableQuery>(
    queries: readonly T[]
  ): (VariableQuery & SplitFields)[] {
    const splits: (VariableQuery & SplitFields)[] = [];

    for (const query of queries) {
      for (const scope of filterKeys(
        query.scope ? [query.scope] : query.scopes,
        keys2(this._mappings)
      )) {
        for (const source of filterKeys(
          query.sources,
          keys2(this._mappings[scope] ?? [])
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

  async purge(queries: VariableStorageQuery[]): Promise<number> {
    let purged = 0;
    await this._splitApply(
      this.splitSourceQueries(queries),
      async (_source, storage, queries) => {
        if (isWritableStorage(storage)) {
          purged += await storage.purge(queries);
        }
      },
      { parallel: false }
    );
    return purged;
  }

  async refresh(queries: VariableStorageQuery[]): Promise<number> {
    let refreshed = 0;
    await this._splitApply(
      this.splitSourceQueries(queries),
      async (_source, storage, queries) => {
        if (isWritableStorage(storage)) {
          refreshed += await storage.refresh(queries);
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
    await forEachAsync(this._mappings, ([, mappings]) =>
      forEachAsync(mappings, ([, storage]) =>
        storage?.initialize?.(environment)
      )
    );
  }

  [Symbol.dispose](): void {
    Object.values(this._mappings).forEach((mappings) =>
      Object.values(mappings).forEach((storage) => storage[Symbol.dispose]?.())
    );
  }
}

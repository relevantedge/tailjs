import {
  copyKey,
  filterKeys,
  ReadOnlyVariableGetter,
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableQuery,
  VariableSetResult,
  VariableStatus,
  VariableValueSetter,
} from "@tailjs/types";
import {
  isWritableStorage,
  normalizeStorageMappings,
  ReadOnlyVariableStorage,
  TrackerEnvironment,
  VariableStorage,
  VariableStorageMappings,
  VariableStorageQuery,
} from "..";
import { forEachAsync } from "@tailjs/util";

export type WithTrace<T, Trace = undefined> = T & {
  [traceSymbol]?: Trace;
};
export type AddTrace<T, Trace> = Trace extends undefined
  ? T & { [traceSymbol]?: Trace }
  : T & { [traceSymbol]: Trace };

export type AddSourceTrace<Source, Trace> = Trace extends undefined
  ? Source & { [traceSymbol]?: undefined }
  : Source & { [traceSymbol]: [AddSourceTrace<Source, Trace>, Trace] };

const unknownSource = (
  key: VariableKey
): AddTrace<VariableErrorResult, any> => ({
  status: VariableStatus.Unsupported,
  ...copyKey(key as any as VariableKey),
  [traceSymbol]: key[traceSymbol],
  error: `The scope ${key.scope} has no source with the ID '${key.source}'.`,
});

type SplitFields = Pick<VariableKey, "source" | "scope">;

export const traceSymbol = Symbol();
export const addSourceTrace = <Item, Trace>(
  item: Item,
  trace: Trace
): AddSourceTrace<Item, Trace> => (
  (item[traceSymbol] = [item, trace]), item as any
);

export const addTrace = <Item, Trace>(
  item: Item,
  trace: Trace
): AddTrace<Item, Trace> => ((item[traceSymbol] = trace), item as any);

const mergeTrace = <Target extends {}, Trace>(
  target: Target,
  {
    source,
    scope,
    [traceSymbol]: trace,
  }: { [traceSymbol]?: Trace } & SplitFields
): AddTrace<Target & SplitFields, Trace> =>
  Object.assign(target, { source, scope, [traceSymbol]: trace }) as any;

export class VariableSplitStorage implements VariableStorage, Disposable {
  private readonly _mappings: Record<
    string,
    Record<string, ReadOnlyVariableStorage>
  >;

  constructor(mappings: VariableStorageMappings) {
    this._mappings = {};
    for (const { scope, source, storage } of normalizeStorageMappings(
      mappings
    )) {
      (this._mappings[scope] ??= {})[source] = storage;
    }
  }

  private async _splitApply<T extends { scope: string; source?: string }, R>(
    keys: T[],
    action: (
      source: SplitFields,
      target: ReadOnlyVariableStorage,
      keys: T[],
      error?: string | undefined
    ) => Promise<R[] | undefined | void>,
    notFound?: (key: T) => R | undefined | void
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

    const tasks: Promise<void>[] = [];
    splits.forEach(([source, keys, sourceIndices], storage) => {
      tasks.push(
        (async () => {
          let i = 0;
          try {
            for (const result of (await action(
              source,
              storage,
              keys,
              undefined
            )) ?? []) {
              results[sourceIndices[i++]] = result;
            }
          } catch (e) {
            await action(
              source,
              storage,
              keys,
              e?.message || (e ? "" + e : "(unspecified error)")
            );
          }
        })()
      );
    });

    await Promise.all(tasks);

    return results;
  }

  async get<Trace = undefined>(
    keys: WithTrace<ReadOnlyVariableGetter, Trace>[]
  ): Promise<AddTrace<VariableGetResult, Trace>[]> {
    if (!keys.length) return [];

    return this._splitApply(
      keys,
      async (_source, storage, keys, error) =>
        error
          ? keys.map((key) =>
              mergeTrace(
                {
                  status: VariableStatus.Error,
                  ...copyKey(key),
                  error: error,
                  transient: true,
                },
                key
              )
            )
          : (await storage.get(keys)).map((result, i) =>
              mergeTrace(result, keys[i])
            ),
      unknownSource as any
    );
  }

  set<Trace = undefined>(
    values: WithTrace<VariableValueSetter, Trace>[]
  ): Promise<AddTrace<VariableSetResult, Trace>[]> {
    if (!values.length) return [] as any;

    return this._splitApply(
      values,
      async (_source, storage, setters, error) =>
        isWritableStorage(storage)
          ? error
            ? setters.map((setter) =>
                mergeTrace(
                  {
                    status: VariableStatus.Error,
                    ...copyKey(setter),
                    error: error,
                    transient: true,
                  },
                  setter
                )
              )
            : (await storage.set(setters)).map((setter, i) =>
                mergeTrace(setter, setters[i])
              )
          : setters.map((setter) =>
              mergeTrace(
                {
                  status: VariableStatus.BadRequest,
                  ...copyKey(setter),
                },
                setter
              )
            ),
      unknownSource as any
    );
  }

  public splitSourceQueries<T extends VariableStorageQuery>(
    queries: T[]
  ): (VariableQuery & SplitFields)[] {
    const split: (T & SplitFields)[] = [];
    for (const query of queries) {
      for (const scope of filterKeys(
        query.scopes,
        Object.keys(this._mappings),
        (filter) => (query.scopes = filter)
      )) {
        split.push(
          ...filterKeys(
            query.sources,
            Object.keys(this._mappings[scope] ?? []),
            (filter) => (query.sources = filter)
          ).map((source) => ({ source, scope, ...query }))
        );
      }
    }
    return split;
  }
  async purge(queries: VariableStorageQuery[]): Promise<void> {
    await this._splitApply(
      this.splitSourceQueries(queries),
      async (_source, storage, queries) => {
        isWritableStorage(storage) && (await storage.purge(queries));
      }
    );
  }
  async query(queries: VariableStorageQuery[]): Promise<Variable[]> {
    return (
      await this._splitApply(
        this.splitSourceQueries(queries),
        async (source, storage, queries) => [
          (
            await storage.query(queries)
          ).map((result) => mergeTrace(result, source)),
        ]
      )
    ).flat();
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

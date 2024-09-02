import {
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableQuery,
  VariableScope,
  VariableSetResult,
  VariableStatus,
  VariableValueSetter,
} from "@tailjs/types";
import {
  copyKey,
  isWritableStorage,
  ReadOnlyVariableStorage,
  VariableStorage,
} from ".";

export type WithTrace<T, Trace = undefined> = T & {
  [traceSymbol]?: Trace;
};
export type AddTrace<T, Trace> = Trace extends undefined
  ? T & { [traceSymbol]?: Trace }
  : T & { [traceSymbol]: Trace };

export type AddSourceTrace<Source, Trace> = Trace extends undefined
  ? Source & { [traceSymbol]?: undefined }
  : Source & { [traceSymbol]: [AddSourceTrace<Source, Trace>, Trace] };

export type VariableStorageMappings = {
  [P in VariableScope]: Record<string, ReadOnlyVariableStorage>;
};

const unknownSource = (
  key: VariableKey
): AddTrace<VariableErrorResult, any> => ({
  status: VariableStatus.Unsupported,
  ...copyKey(key as any as VariableKey),
  [traceSymbol]: key[traceSymbol],
  error: `The scope ${key.scope} has no source with the ID '${key.source}'.`,
});

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

export const mergeTrace = <Item, Trace>(
  item: Item,
  trace: { [traceSymbol]?: Trace }
): AddTrace<Item, Trace> => ((item[traceSymbol] = trace), item as any);

export class VariableSplitStorage implements VariableStorage, Disposable {
  private readonly _mappings: VariableStorageMappings;

  constructor(mappings: VariableStorageMappings) {
    this._mappings = mappings;
  }

  private async _splitApply<
    T extends { scope: VariableScope; source?: string },
    R
  >(
    keys: T[],
    action: (
      target: ReadOnlyVariableStorage,
      keys: T[],
      error?: string | undefined
    ) => Promise<R[] | undefined | void>,
    notFound?: (key: T) => R | undefined | void
  ): Promise<R[]> {
    const results: R[] = [];
    const splits = new Map<
      ReadOnlyVariableStorage,
      [keys: T[], sourceIndices: number[]]
    >();
    let sourceIndex = 0;
    for (const key of keys) {
      const storage = this._mappings[key.scope]?.[key.source ?? ""];
      if (!storage) {
        const errorResult = notFound?.(key);
        errorResult && (results[sourceIndex++] = errorResult);
        continue;
      }

      let storageKeys = splits.get(storage);
      !storageKeys && splits.set(storage, (storageKeys = [[], []]));
      storageKeys[0].push(key);
      storageKeys[1].push(sourceIndex);
      sourceIndex++;
    }

    const tasks: Promise<void>[] = [];
    splits.forEach(([keys, sourceIndices], storage) => {
      tasks.push(
        (async () => {
          let i = 0;
          try {
            for (const result of (await action(storage, keys, undefined)) ??
              []) {
              results[sourceIndices[i++]] = result;
            }
          } catch (e) {
            await action(
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
    keys: WithTrace<VariableGetter, Trace>[]
  ): Promise<AddTrace<VariableGetResult, Trace>[]> {
    if (!keys.length) return [];

    return this._splitApply(
      keys,
      async (storage, keys, error) =>
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
      async (storage, setters, error) =>
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
                  status: VariableStatus.ReadOnly,
                  ...copyKey(setter),
                },
                setter
              )
            ),
      unknownSource as any
    );
  }

  private _splitSourceQueries(queries: VariableQuery[]) {
    const split: (VariableQuery & { source: string })[] = [];
    for (const query of queries) {
      let includeSources =
        query.includeSources ?? Object.keys(this._mappings[query.scope] ?? []);
      if (query.excludeSources) {
        const exclude = new Set(query.excludeSources);
        includeSources = includeSources.filter((key) => !exclude.has(key));
      }
      split.push(...includeSources.map((source) => ({ ...query, source })));
    }
    return split;
  }
  async purge(queries: VariableQuery[]): Promise<void> {
    await this._splitApply(
      this._splitSourceQueries(queries),
      async (storage, queries) => {
        isWritableStorage(storage) && (await storage.purge(queries));
      }
    );
  }
  async query(queries: VariableQuery[]): Promise<Variable[]> {
    return (
      await this._splitApply(
        this._splitSourceQueries(queries),
        async (storage, queries) => [await storage.query(queries)]
      )
    ).flat();
  }

  [Symbol.dispose](): void {
    Object.values(this._mappings).forEach((mappings) =>
      Object.values(mappings).forEach((storage) => storage[Symbol.dispose]?.())
    );
  }
}

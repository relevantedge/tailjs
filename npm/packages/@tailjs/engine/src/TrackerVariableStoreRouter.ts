import {
  TrackerScope,
  TrackerVariable,
  TrackerVariableFilter,
  TrackerVariableSetter,
} from "@tailjs/types";
import { filter, forEach, map, assign } from "@tailjs/util";
import {
  ReadOnlyTrackerStorage,
  Tracker,
  TrackerEnvironment,
  TrackerStorage,
} from ".";
import { TrackerVariables } from "./TrackerVariables";

const parseKey = (key: string): [source: string, key: string] => {
  const match = key.match(/^(?:([^:]*):)?(.*)$/);
  return [match![1] ?? "", match![2]];
};
const prefixKey = (source: string, key: string) =>
  source || key.includes(":") ? source + ":" + key : key;

export class VariableStoreRouter implements TrackerStorage {
  private readonly _writableStores: Record<string, TrackerStorage>;

  public constructor(
    public readonly stores: Record<string, ReadOnlyTrackerStorage>
  ) {
    this._writableStores = assign(
      {},
      filter(stores, ([, value]) => value["get"])
    );
  }

  public async set(
    tracker: Tracker,
    ...variables: TrackerVariableSetter[]
  ): Promise<(TrackerVariable | undefined)[]> {
    const targets: Record<string, [index: number, TrackerVariable][]> = {};

    forEach(variables, ({ key, ...rest }, index) => {
      const [target, targetKey] = parseKey(key);
      (targets[target] ??= []).push([
        index,
        { key: targetKey, ...(rest as any) },
      ]);
    });

    const results: TrackerVariable[] = [];

    await Promise.all(
      map(targets, async ([store, values]) => {
        const results = await this._writableStores[store]?.set(
          tracker,
          ...map(values, (value) => value[1])
        );
        if (results) {
          forEach(values, ([resultIndex], index) => {
            results[resultIndex] = results[index];
          });
        }
      })
    );

    return results;
  }

  public async purge(
    tracker: Tracker,
    ...variables: TrackerVariableFilter[]
  ): Promise<void> {
    await Promise.all(
      map(this._writableStores, ([, store]) =>
        store.purge(tracker, ...variables)
      )
    );
  }

  public async persist(tracker: Tracker): Promise<void> {
    await Promise.all(
      map(this._writableStores, ([, store]) => store.persist?.(tracker))
    );
  }

  public async initialize(environment: TrackerEnvironment): Promise<void> {
    await Promise.all(
      map(this._writableStores, ([, store]) => store.initialize?.(environment))
    );
  }

  public async get(
    tracker: Tracker,
    scope: TrackerScope,
    key: string
  ): Promise<TrackerVariable | undefined> {
    const [sourceId, localKey] = parseKey(key);
    const result = await this.stores[sourceId]?.get(tracker, scope, localKey);
    return result
      ? ((result.key = prefixKey(sourceId, result.key)), result)
      : undefined;
  }

  public async query(
    tracker: Tracker,
    ...filters: TrackerVariableFilter[]
  ): Promise<TrackerVariable[]> {
    const filterGroups: Record<string, TrackerVariableFilter[]> = {};
    forEach(filters, (filter) => {
      if (filter.keys) {
        const sources: Record<string, TrackerVariableFilter> = {};

        forEach(filter.keys, (key) => {
          const [sourceId, localKey] = parseKey(key);
          (sources[sourceId] ??= { ...filter, keys: [] }).keys!.push(localKey);
        });
        forEach(sources, ([id, filter]) =>
          (filterGroups[id] ??= []).push(filter)
        );
      } else {
        forEach(this.stores, ([id]) => (filterGroups[id] ??= []).push(filter));
      }
    });

    const results: TrackerVariable[] = [];
    await Promise.all(
      map(filterGroups, async ([id, filters]) => {
        results.push(
          ...(await this.stores[id].query(tracker, ...filters)).map(
            (result) => ((result.key = prefixKey(id, result.key)), result)
          )
        );
      })
    );

    return results;
  }
}

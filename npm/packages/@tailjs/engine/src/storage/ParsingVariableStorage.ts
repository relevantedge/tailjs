import {
  Variable,
  VariableFilter,
  VariableGetResults,
  VariableGetter,
  VariableGetters,
  VariableHeader,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultPromise,
  VariableScopeValue,
  VariableSetResults,
  VariableSetters,
  dataClassification,
  dataPurposes,
  isVariablePatchAction,
  toNumericVariableEnums,
  toVariableResultPromise,
  variableScope,
} from "@tailjs/types";
import { MaybePromise, map, obj, wrap } from "@tailjs/util";
import {
  TrackerEnvironment,
  VariableStorage,
  VariableStorageContext,
} from "..";

const parseFilter = (filter: VariableFilter): VariableFilter<true> => {
  filter.scopes = map(filter.scopes, variableScope);

  filter.classification &&
    (filter.classification = {
      min: dataClassification(filter.classification.min),
      max: dataClassification(filter.classification.max),
      levels: map(filter.classification.levels, dataClassification),
    });

  filter.purposes = dataPurposes(filter.purposes);
  return filter as any;
};

const parseQueryOptions = (
  options: VariableQueryOptions | undefined
): VariableQueryOptions<true> => {
  options?.ifNoneMatch &&
    (options.ifNoneMatch = toNumericVariableEnums(options.ifNoneMatch));
  return options as any;
};

const parseContext = (context: VariableStorageContext | undefined) => {
  context?.consent &&
    (context.consent = {
      level: dataClassification(context.consent.level),
      purposes: dataPurposes(context.consent.purposes),
    });
  return context;
};

/**
 * A wrapper around a {@link VariableStorage} that accepts string values for enums.
 */
export class ParsingVariableStorage<
  S extends VariableStorage = VariableStorage
> {
  public readonly storage: S;

  constructor(storage: S) {
    this.storage = storage;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<boolean>, number>>,
    context?: VariableStorageContext
  ): void {
    this.storage.configureScopeDurations(
      obj(durations, ([key, value]) => [variableScope(key), value]),
      parseContext(context)
    );
  }
  renew(
    scope: VariableScopeValue,
    scopeIds: string[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this.storage.renew(
      variableScope(scope),
      scopeIds,
      parseContext(context)
    );
  }
  purge(
    filters: VariableFilter<boolean>[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this.storage.purge(map(filters, parseFilter), parseContext(context));
  }
  initialize?(environment: TrackerEnvironment): MaybePromise<void> {
    return this.storage.initialize?.(environment);
  }

  get<K extends VariableGetters<false>>(
    keys: VariableGetters<false, K>,
    context?: VariableStorageContext | undefined
  ): VariableResultPromise<VariableGetResults<K>> {
    return toVariableResultPromise(async () => {
      for (const key of keys) {
        if (!key) {
          continue;
        }

        toNumericVariableEnums(key);
        (key as VariableGetter).init = wrap(key.init, async (original) =>
          toNumericVariableEnums(await original())
        );
      }

      return await this.storage.get(keys as any[], parseContext(context));
    }) as any;
  }

  set<K extends VariableSetters<false>>(
    setters: VariableSetters<false, K>,
    context?: VariableStorageContext
  ): VariableResultPromise<VariableSetResults<K>> {
    return toVariableResultPromise(async () => {
      for (const key of setters) {
        toNumericVariableEnums(key);
        if (isVariablePatchAction(key)) {
          key.patch = wrap(key.patch, async (original, current) =>
            toNumericVariableEnums(await original(current))
          );
        }
      }

      return await this.storage.set(setters as any, parseContext(context));
    }) as any;
  }

  head(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    const foo = this.set([{ key: "ok", scope: "device", value: 32 }]).result;
    return this.storage.head(
      map(filters, parseFilter),
      parseQueryOptions(options),
      parseContext(context)
    );
  }
  query(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
    return this.storage.query(
      map(filters, parseFilter),
      parseQueryOptions(options),
      parseContext(context)
    );
  }

  public toStorage(): VariableStorage {
    const storage: VariableStorage = {} as any;
    for (const method in [
      "head",
      "query",
      "configureScopeDurations",
      "renew",
      "purge",
    ] as (keyof VariableStorage)[]) {
      storage[method] = (...args: any) => this[method](...args);
    }

    storage["get"] = (...args: any) => (this.get as any)(...args).all;
    storage["set"] = (...args: any) => (this.set as any)(...args).all;
    return storage;
  }
}

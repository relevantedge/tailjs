import {
  Variable,
  VariableFilter,
  VariableGetResults,
  VariableHeader,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableScopeValue,
  VariableSetResults,
  addGetResultValidators,
  addSetResultValidators,
  isVariablePatchAction,
  toNumericVariable,
} from "@tailjs/types";
import { MaybePromise, invariant, isDefined, wrapFunction } from "@tailjs/util";
import {
  TrackerEnvironment,
  VariableGetParameter,
  VariableSetParameter,
  VariableStorage,
  VariableStorageContext,
} from "..";

export class ValidatingVariableStorage<S extends VariableStorage<true>>
  implements VariableStorage<false>
{
  public readonly storage: S;

  constructor(storage: S) {
    this.storage = storage;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext | undefined
  ): void {
    this.storage.configureScopeDurations(durations, context);
  }
  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this.storage.renew(scope, scopeIds, context);
  }
  purge(
    filters: VariableFilter<boolean>[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this.storage.purge(filters, context);
  }
  initialize?(environment: TrackerEnvironment): MaybePromise<void> {
    return this.storage.initialize?.(environment);
  }
  async get<K extends VariableGetParameter<false>>(
    keys: K | VariableGetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableGetResults<K, false>> {
    for (const key of keys) {
      if (!key) {
        continue;
      }
      toNumericVariable(key);
      key.initializer = wrapFunction(key.initializer, async (original) => {
        const result = toNumericVariable(await original());
        result &&
          invariant(
            isDefined(result?.classification) && isDefined(result?.purposes),
            "Classification is specified."
          );
        return result as any;
      });
    }

    return addGetResultValidators(
      await this.storage.get(keys as any, context)
    ) as any;
  }

  async set<K extends VariableSetParameter<false>>(
    setters: K | VariableSetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableSetResults<K, false>> {
    for (const key of setters) {
      toNumericVariable(key);
      if (isVariablePatchAction(key)) {
        key.patch = wrapFunction(key.patch, async (original, current) =>
          toNumericVariable(await original(current))
        );
      }
    }
    return addSetResultValidators(
      await this.storage.set(setters as any, context)
    ) as any;
  }

  head(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean> | undefined,
    context?: VariableStorageContext | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    return this.storage.head(filters, options, context);
  }
  query(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean> | undefined,
    context?: VariableStorageContext | undefined
  ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
    return this.storage.query(filters, options, context);
  }
}

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
  isVariablePatchAction,
  toNumericVariable,
  VariableSetParameter,
  VariableGetParameter,
  VariableGetter,
  handleResultErrors,
} from "@tailjs/types";
import { MaybePromise, invariant, isDefined, wrapFunction } from "@tailjs/util";
import {
  TrackerEnvironment,
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
    context?: VariableStorageContext<false>
  ): void {
    this.storage.configureScopeDurations(durations, context as any);
  }
  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext<false> | undefined
  ): MaybePromise<void> {
    return this.storage.renew(scope, scopeIds, context as any);
  }
  purge(
    filters: VariableFilter<boolean>[],
    context?: VariableStorageContext<false> | undefined
  ): MaybePromise<void> {
    return this.storage.purge(filters, context as any);
  }
  initialize?(environment: TrackerEnvironment): MaybePromise<void> {
    return this.storage.initialize?.(environment);
  }
  async get<
    K extends VariableGetParameter<false>,
    C extends VariableStorageContext<false>
  >(
    keys: K | VariableGetParameter<false>,
    context?: VariableStorageContext<false> | undefined
  ): Promise<VariableGetResults<K, C>> {
    for (const key of keys) {
      if (!key) {
        continue;
      }
      toNumericVariable(key);
      (key as VariableGetter).initializer = wrapFunction(
        key.initializer,
        async (original) => {
          const result = toNumericVariable(await original());
          result &&
            invariant(
              isDefined(result?.classification) && isDefined(result?.purposes),
              "Classification is specified."
            );
          return result as any;
        }
      );
    }

    return handleResultErrors(
      await this.storage.get(keys as any, context as any),
      context?.throw
    ) as any;
  }

  async set<
    K extends VariableSetParameter<false>,
    C extends VariableStorageContext<false>
  >(
    setters: K | VariableSetParameter<false>,
    context?: VariableStorageContext<false> | undefined
  ): Promise<VariableSetResults<K, C>> {
    for (const key of setters) {
      toNumericVariable(key);
      if (isVariablePatchAction(key)) {
        key.patch = wrapFunction(key.patch, async (original, current) =>
          toNumericVariable(await original(current))
        );
      }
    }

    return handleResultErrors(
      await this.storage.set(setters as any, context as any),
      context?.throw
    ) as any;
  }

  head(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean>,
    context?: VariableStorageContext<false>
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    return this.storage.head(filters, options, context as any);
  }
  query(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean>,
    context?: VariableStorageContext<false>
  ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
    return this.storage.query(filters, options, context as any);
  }
}

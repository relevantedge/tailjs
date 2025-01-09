import {
  TrackerEnvironment,
  VariableStorage,
  VariableStorageContext,
} from "@tailjs/engine";
import {
  ServerVariableScope,
  VariableSetters,
  VariableSetResults,
  VariableFilter,
  VariableGetters,
  VariableGetResults,
  VariableQueryOptions,
  VariableQueryResult,
  VariableHeader,
  Variable,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import { RavenDbSettings } from ".";

export class RavenDbVariableStorage implements VariableStorage {
  private readonly _settings: RavenDbSettings;

  constructor(settings: RavenDbSettings) {
    this._settings = settings;
  }

  renew(
    scope: ServerVariableScope,
    targetIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void> {
    throw new Error("Method not implemented.");
  }
  set<V extends VariableSetters<true>>(
    variables: VariableSetters<true, V>,
    context?: VariableStorageContext
  ): MaybePromise<VariableSetResults<V>> {
    throw new Error("Method not implemented.");
  }
  purge(
    filters: VariableFilter<true>[],
    context?: VariableStorageContext
  ): MaybePromise<boolean> {
    throw new Error("Method not implemented.");
  }
  initialize?(environment: TrackerEnvironment): MaybePromise<void> {
    throw new Error("Method not implemented.");
  }
  get<K extends VariableGetters<true>>(
    keys: VariableGetters<true, K>,
    context?: VariableStorageContext
  ): MaybePromise<VariableGetResults<K>> {
    throw new Error("Method not implemented.");
  }
  head(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    throw new Error("Method not implemented.");
  }
  query(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
    throw new Error("Method not implemented.");
  }
}

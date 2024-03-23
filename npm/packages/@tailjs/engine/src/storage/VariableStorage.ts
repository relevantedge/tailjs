import {
  isErrorResult,
  variableScope,
  type Variable,
  type VariableFilter,
  type VariableGetter,
  type VariableHeader,
  type VariablePatchResult,
  type VariableQueryOptions,
  type VariableQueryResult,
  type VariableScope,
  type VariableSetResult,
  type VariableSetter,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type { Tracker, TrackerEnvironment } from "..";

export class VariableSetError extends Error {
  constructor(result: VariableSetResult) {
    super(
      `The variable '${result.source.key}' in ${variableScope.name(
        result.source.scope
      )} scope could not be set${
        isErrorResult(result) ? `: ${result.error}` : ""
      }.`
    );
  }
}

export type VariableStorageContext = {
  tracker?: Tracker;
  // Reserved for future use so one endpoint can be shared between multiple projects (e.g. by an API key - TBD).
  tenant?: string;
};

export interface VariableGetResult<T = any> extends Variable<T> {
  /**
   * The initializer was used to create the variable.
   */
  initialized?: boolean;

  /**
   * The variable has not changed since the version requested.
   */
  unchanged?: boolean;

  value: T;
}

type MapVariableGetResult<Getter> = Getter extends VariableGetter<infer T>
  ? Getter extends {
      initializer: () => infer R;
    }
    ? Awaited<R> extends VariablePatchResult<infer T>
      ? VariableGetResult<T>
      : VariableGetResult<unknown extends T ? any | undefined : T | undefined>
    : VariableGetResult<unknown extends T ? any | undefined : undefined>
  : undefined;

export type VariableGetResults<K extends any[]> = K extends []
  ? []
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableGetResult<Item>, ...VariableGetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableGetResult<T>[]
  : never;

type MapVariableSetResult<Source> = Source extends VariableSetter<infer T>
  ? Source extends { value: undefined }
    ? undefined
    : VariableSetResult<T>
  : never;

export type VariableSetResults<K extends any[] = any[]> = K extends []
  ? []
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableSetResult<Item>, ...VariableSetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableSetResult<T>[]
  : never;

export interface ReadOnlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends (VariableGetter<any> | null | undefined)[]>(
    keys: K & (VariableGetter<any> | null | undefined)[], // K & and the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableGetResults<K>>;

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader>>;
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable>>;
}

export const isWritable = (
  storage: ReadOnlyVariableStorage
): storage is VariableStorage => (storage as any).set;

export interface VariableStorage<Scoped extends boolean = false>
  extends ReadOnlyVariableStorage {
  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>,
    context?: VariableStorageContext
  ): void;

  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void>;

  set<V extends (VariableSetter<any> | null | undefined)[]>(
    variables: V & (VariableSetter<any> | null | undefined)[], // V & and the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableSetResults<V>>;

  purge(
    filters: VariableFilter[],
    context?: VariableStorageContext
  ): MaybePromise<void>;
}

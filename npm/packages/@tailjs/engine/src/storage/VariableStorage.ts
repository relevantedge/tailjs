import {
  MatchTarget,
  VariableGetter,
  VariableHeader,
  VariableQueryOptions,
  VariableScope,
  VariableScopeNames,
  isErrorResult,
  type Variable,
  type VariableFilter,
  type VariableQueryResult,
  type VariableSetResult,
  type VariableSetter,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type { Tracker, TrackerEnvironment } from "..";

export class VariableSetError extends Error {
  constructor(result: VariableSetResult) {
    super(
      `The variable '${result.source.key}' in ${
        VariableScopeNames[result.source.scope]
      } scope could not be set${
        isErrorResult(result) ? `: ${result.error}` : ""
      }.`
    );
  }
}

type MapVariableGetResult<Getter> = Getter extends VariableGetter<
  infer T,
  infer S
>
  ? (Variable<unknown extends T ? any : T> & MatchTarget<S>) | undefined
  : undefined;

export type VariableGetResults<K extends any[]> = K extends []
  ? []
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableGetResult<Item>, ...VariableGetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableGetResult<T>[]
  : never;

export type VariableContext = {
  context?: {
    tracker?: Tracker;
  };
};

type MapVariableSetResult<Source> = [Source] extends [VariableSetter<infer T>]
  ? VariableSetResult<T, Source>
  : never;

export type VariableSetResults<K extends any[] = any[]> = K extends []
  ? []
  : K extends [infer Item, ...infer Rest]
  ? [MapVariableSetResult<Item>, ...VariableSetResults<Rest>]
  : K extends (infer T)[]
  ? MapVariableSetResult<T>[]
  : never;

export interface ReadOnlyVariableStorage<Scoped extends boolean = false> {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends (VariableGetter<any, Scoped> | null | undefined)[]>(
    ...keys: K
  ): MaybePromise<VariableGetResults<K>>;

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions
  ): MaybePromise<VariableQueryResult<VariableHeader>>;
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions
  ): MaybePromise<VariableQueryResult<Variable>>;
}

export const isWritable = (
  storage: ReadOnlyVariableStorage
): storage is VariableStorage => (storage as any).set;

export interface VariableStorage<Scoped extends boolean = false>
  extends ReadOnlyVariableStorage<Scoped> {
  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ): void;

  renew(scopes: VariableScope[], scopeIds: string[]): MaybePromise<void>;

  set<K extends (VariableSetter<any, Scoped> | null | undefined)[]>(
    ...variables: K
  ): MaybePromise<VariableSetResults<K>>;

  purge(filters: VariableFilter[], batch?: boolean): MaybePromise<void>;
}

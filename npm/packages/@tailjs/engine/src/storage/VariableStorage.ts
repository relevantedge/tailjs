import {
  UserConsent,
  VariableGetResults,
  VariableScopeValue,
  VariableSetResult,
  VariableSetResults,
  type Variable,
  type VariableFilter,
  type VariableGetter,
  type VariableHeader,
  type VariableQueryOptions,
  type VariableQueryResult,
  type VariableScope,
  type VariableSetter,
} from "@tailjs/types";
import { MaybePromise, Not, Nullish } from "@tailjs/util";
import type { Tracker, TrackerEnvironment } from "..";

// export class VariableSetError extends Error {
//   constructor(result: VariableSetResult) {
//     super(
//       `The variable '${result.source.key}' in ${variableScope.lookup(
//         result.source.scope
//       )} scope could not be set${
//         isErrorResult(result) ? `: ${result.error}` : ""
//       }.`
//     );
//   }
// }

export type VariableStorageContext = {
  tracker?: Tracker;

  /** This defaults to the tracker's consent (if any), but can be set independently,
   *  for example if the tracker needs to update date if its consent changes (or for testing).  */
  consent?: UserConsent;

  // Reserved for future use so one endpoint can be shared between multiple projects (e.g. by an API key - TBD).
  tenant?: string;
};

export type VariableGetParameter<Validated> = readonly (
  | VariableGetter<any, Validated>
  | Nullish
)[];

export interface ReadonlyVariableStorage<Validated = true> {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends VariableGetParameter<Validated>>(
    keys: K | VariableGetParameter<Validated>, // K `|` the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableGetResults<K, Validated>>;

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>>;

  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable<any>>>;
}

export const isWritable = <Validated>(
  storage: ReadonlyVariableStorage<Validated>
): storage is ReadonlyVariableStorage<Validated> & VariableStorage<Validated> =>
  !!(storage as any)?.set;

export type VariableSetParameter<Validated> = readonly (
  | VariableSetter<any, Validated>
  | Nullish
)[];

export interface VariableStorage<Validated = true>
  extends ReadonlyVariableStorage<Validated> {
  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext
  ): void;

  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void>;

  set<V extends VariableSetParameter<Validated>>(
    variables: V | VariableSetParameter<Validated>, // V & and the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableSetResults<V, Validated>>;

  purge(
    filters: VariableFilter[],
    context?: VariableStorageContext
  ): MaybePromise<void>;
}

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

export type VariableGetParameter<Validating> = readonly (
  | VariableGetter<any, Not<Validating>>
  | Nullish
)[];

export interface ReadonlyVariableStorage<Validating = false> {
  validates: Validating;

  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends VariableGetParameter<Validating>>(
    keys: K | VariableGetParameter<Validating>, // K `|` the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableGetResults<K, Validating>>;

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

export const isWritable = <Validatable>(
  storage: ReadonlyVariableStorage<Validatable>
): storage is ReadonlyVariableStorage<Validatable> &
  VariableStorage<Validatable> => !!(storage as any)?.set;

export type VariableSetParameter<Validating> = readonly (
  | VariableSetter<any, Not<Validating>>
  | Nullish
)[];

export interface VariableStorage<Validating = false>
  extends ReadonlyVariableStorage<Validating> {
  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext
  ): void;

  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void>;

  set<V extends VariableSetParameter<Validating>>(
    variables: V | VariableSetParameter<Validating>, // V & and the base type to enable intellisense.
    context?: VariableStorageContext
  ): MaybePromise<VariableSetResults<V, Validating>>;

  purge(
    filters: VariableFilter[],
    context?: VariableStorageContext
  ): MaybePromise<void>;
}

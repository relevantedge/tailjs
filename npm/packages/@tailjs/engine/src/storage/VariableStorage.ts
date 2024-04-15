import {
  VariableGetResults,
  UserConsent,
  VariableGetParameter,
  VariableScopeValue,
  VariableSetParameter,
  VariableSetResults,
  type Variable,
  type VariableFilter,
  type VariableGetter,
  type VariableHeader,
  type VariableQueryOptions,
  type VariableQueryResult,
  type VariableScope,
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

export type VariableStorageContext<
  Validated,
  Throw extends Validated extends true
    ? false
    : boolean = Validated extends true ? false : boolean
> = {
  tracker?: Tracker;

  /** This defaults to the tracker's consent (if any), but can be set independently,
   *  for example if the tracker needs to update date if its consent changes (or for testing).  */
  consent?: UserConsent;

  // Reserved for future use so one endpoint can be shared between multiple projects (e.g. by an API key - TBD).
  tenant?: string;

  /**
   * Throw on unexpected status codes instead of returning them.
   * This is only supported by non-validated storages.
   */
  throw?: Throw;
};

export interface ReadonlyVariableStorage<Validated = true> {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<
    K extends VariableGetParameter<Validated>,
    C extends VariableStorageContext<Validated>
  >(
    keys: K | VariableGetParameter<Validated>, // K `|` the base type to enable intellisense.
    context?: C
  ): MaybePromise<VariableGetResults<K, C>>;

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext<Validated>
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>>;

  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext<Validated>
  ): MaybePromise<VariableQueryResult<Variable<any, true>>>;
}

export const isWritable = <Validated>(
  storage: ReadonlyVariableStorage<Validated>
): storage is ReadonlyVariableStorage<Validated> & VariableStorage<Validated> =>
  !!(storage as any)?.set;

export interface VariableStorage<Validated = true>
  extends ReadonlyVariableStorage<Validated> {
  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext<Validated>
  ): void;

  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext<Validated>
  ): MaybePromise<void>;

  set<
    V extends VariableSetParameter<Validated>,
    C extends VariableStorageContext<Validated>
  >(
    variables: V | VariableSetParameter<Validated>, // V & and the base type to enable intellisense.
    context?: C
  ): MaybePromise<VariableSetResults<V, C>>;

  purge(
    filters: VariableFilter[],
    context?: VariableStorageContext<Validated>
  ): MaybePromise<void>;
}

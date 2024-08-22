import {
  DataClassificationValue,
  DataPurposeValue,
  VariableGetResults,
  VariableGetters,
  VariableSetResults,
  VariableSetters,
  type Variable,
  type VariableFilter,
  type VariableHeader,
  type VariableQueryOptions,
  type VariableQueryResult,
  type VariableScope,
} from "@tailjs/types";
import { MaybePromise } from "@tailjs/util";
import type { Tracker, TrackerEnvironment } from "..";

export type VariableContextScopeIds = {
  sessionId?: string;
  deviceId?: string;
  authenticatedUserId?: string;
};

export interface ParsableUserConsent {
  /**
   * The highest level of data classification the user has consented to be stored.
   */
  level: DataClassificationValue;

  /**
   * The purposes the user has consented their data to be used for.
   *
   * @privacy anonymous, necessary
   */
  purposes: DataPurposeValue;
}

export type VariableStorageContext = {
  /** The tracker operations must be validated against. If {@link consent} or {@link scopeIds} are not specified explicitly, these will be read from the tracker.   */
  tracker?: Tracker;

  /** The data is requested by the client. That removes the ServerOnly purpose so certain fields get censored, e.g. session ID and similar that should not be disclosed there. */
  client?: boolean;

  /** The current target IDs for session, device and user scope. */
  scopeIds?: VariableContextScopeIds;

  /** This defaults to the tracker's consent (if any), but can be set independently,
   *  for example if the tracker needs to update date if its consent changes (or for testing).  */
  consent?: ParsableUserConsent;

  // Reserved for future use so one endpoint can be shared between multiple projects (e.g. by an API key - TBD).
  tenant?: string;
};

export interface ReadonlyVariableStorage {
  initialize?(environment: TrackerEnvironment): MaybePromise<void>;

  get<K extends VariableGetters<true>>(
    keys: VariableGetters<true, K>,
    context?: VariableStorageContext
  ): MaybePromise<VariableGetResults<K>>;

  head(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>>;

  query(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable<any, true>>>;
}

export const isWritable = <T extends ReadonlyVariableStorage>(
  storage: T
): storage is T & VariableStorage => !!(storage as any)?.set;

export interface VariableStorage extends ReadonlyVariableStorage {
  renew(
    scope: VariableScope,
    targetIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void>;

  set<V extends VariableSetters<true>>(
    variables: VariableSetters<true, V>,
    context?: VariableStorageContext
  ): MaybePromise<VariableSetResults<V>>;

  purge(
    filters: VariableFilter<true>[],
    context?: VariableStorageContext
  ): MaybePromise<boolean>;
}

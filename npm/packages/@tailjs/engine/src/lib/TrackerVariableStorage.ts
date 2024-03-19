import {
  DataClassification,
  DataPurposes,
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableValidationBasis,
  isSuccessResult,
  isVariablePatch,
} from "@tailjs/types";
import { MaybePromise, isDefined, isFunction } from "@tailjs/util";
import {
  Tracker,
  VariableStorageContext,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
} from "..";

import { PartitionItem, extractKey, parseKey } from ".";

const trackerScopes = new Set([
  VariableScope.User,
  VariableScope.Device,
  VariableScope.Session,
]);
const nonTrackerScopes = new Set([VariableScope.Global, VariableScope.Entity]);

export class TrackerVariableStorage implements VariableStorage {
  private _storage: VariableStorage;

  constructor(storage: VariableStorage) {
    this._storage = storage;
  }

  public configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>,
    context?: VariableStorageContext
  ): void {
    this._storage.configureScopeDurations(durations, context);
  }

  public renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext
  ): MaybePromise<void> {
    if (context?.tracker && this._isRestrictedScope(scope)) {
      const scopeId = this._getScopeTargetId(scope, context.tracker);
      if (!scopeId) {
        return;
      }
      scopeIds = [scopeId];
    }
    return this._storage.renew(scope, scopeIds, context);
  }

  private _isRestrictedScope(scope: VariableScope) {
    return (
      scope === VariableScope.Session ||
      scope === VariableScope.Device ||
      scope === VariableScope.User
    );
  }

  private _getScopeTargetId(scope: VariableScope, tracker: Tracker) {
    return scope === VariableScope.Session
      ? tracker.session.id
      : scope === VariableScope.Device
      ? tracker.session.deviceId
      : scope === VariableScope.User
      ? tracker.session.userId
      : undefined;
  }

  private _getMaxConsentLevel(scope: VariableScope, tracker: Tracker) {
    // If a user is authenticated, it is assumed that there is consent for storing direct personal data,
    // (right? The user must have provided a user name somehow...).

    // This also means that a user may have consented to having their profile data such as name stored,
    // but still do not want to be tracked.
    return scope === VariableScope.User
      ? DataClassification.Direct
      : tracker.consent.level;
  }

  private _validate<T extends VariableValidationBasis>(
    variable: T | null | undefined,
    tracker: Tracker
  ) {
    if (!variable) return undefined;

    if (this._isRestrictedScope(variable.scope)) {
      const originalTargetId = variable.targetId;
      variable.targetId = this._getScopeTargetId(variable.scope, tracker);

      if (originalTargetId && variable.targetId !== originalTargetId) {
        throw new TypeError(
          `Target ID must either match the tracker or be unspecified.`
        );
      }

      if (!variable.targetId) {
        // There is not consented ID for the scope in the tracker, or an ID unrelated to the current tracker was used.
        return undefined;
      }

      if (isDefined(variable.classification)) {
        if (
          this._getMaxConsentLevel(variable.scope, tracker) <
            variable.classification ||
          (variable.purposes &&
            tracker.consent.purposes && // This check ignores Necessary (which is 0)
            !(tracker.consent.purposes & variable.purposes))
        ) {
          return undefined;
        }
      }
    }

    return variable;
  }

  public async set<K extends (VariableSetter<any> | null | undefined)[]>(
    variables: K,
    context?: VariableStorageContext
  ): Promise<VariableSetResults<K>> {
    const tracker = context?.tracker;

    if (!tracker) {
      return await this._storage.set(variables, context);
    }

    const validated = variables.map((variable) =>
      this._validate(variable, tracker)
    );

    validated.forEach(
      (setter) =>
        // Any attempt to change a device variable (even if it fails) must trigger the tracker to refresh all device variables and send them to the the client,
        // to avoid race conditions (requests may complete out of request order, hence send stale cookies otherwise).
        setter &&
        setter.scope === VariableScope.Device &&
        tracker._touchClientDeviceData()
    );

    const denied: PartitionItem<VariableSetResult>[] = [];
    validated.forEach((source, sourceIndex) => {
      if (!source) return;

      if (isVariablePatch(source) && isFunction(source.patch)) {
        const captured = source.patch;
        source.patch = (current) => {
          // If the patch returns something that does not match the current consent,
          // we need to 1) return undefined to avoid the storage to save anything, 2) patch the results with a "denied" status.
          const inner = captured(current);
          if (
            inner &&
            !this._validate({ ...extractKey(source), ...current }, tracker)
          ) {
            denied.push([
              sourceIndex,
              { status: VariableSetStatus.Denied, source },
            ]);
            return undefined;
          }
          return inner;
        };
      }
    });
    const results = (await this.set(validated, context)) as VariableSetResult[];
    denied.forEach(([sourceIndex, status]) => (results[sourceIndex] = status));
    for (const result of results) {
      isSuccessResult(result) &&
        (await tracker._maybeUpdate(result.source, result.current));
    }

    return results as VariableSetResults<K>;
  }

  private _validateFilters(filters: VariableFilter[], tracker: Tracker) {
    let validatedFilters: VariableFilter[] = [];

    const consent = tracker.consent;
    for (let filter of filters) {
      // For each scope that intersects the tracker scopes, add a separate filter restricted to the target ID
      // that matches the current tracker.
      const scopes = filter.scopes ?? VariableScopes;
      const safe = scopes.filter((scope) => nonTrackerScopes.has(scope));
      safe.length && validatedFilters.push({ ...filter, scopes: safe });
      validatedFilters.push(
        ...scopes
          .filter((scope) => trackerScopes.has(scope))
          .map((scope) => {
            const targetId = this._getScopeTargetId(scope, tracker);
            const consentLevel = this._getMaxConsentLevel(scope, tracker);
            return targetId
              ? {
                  ...(consent.purposes ||
                  consentLevel < DataClassification.Sensitive
                    ? {
                        ...filter,
                        // Remove purposes without consent (if purposes are undefined in consent, it means "I am good with all").
                        purposes: filter.purposes?.filter(
                          (purpose) => !purpose || purpose & consent.purposes
                        ),
                        classification: filter.classification && {
                          // Cap classification filter so no criteria exceeds the consent's level.

                          min:
                            filter.classification.min! > consentLevel
                              ? consentLevel
                              : filter.classification.min,
                          // If no explicit levels are set, limit the max value to the consent's level.
                          max:
                            filter.classification.max! > consentLevel ||
                            !filter.classification.levels
                              ? consentLevel
                              : filter.classification.max,
                          levels: filter.classification.levels?.filter(
                            (level) => level <= consentLevel
                          ),
                        },
                      }
                    : filter),
                  scopes: [scope],
                  targetIds: [targetId],
                }
              : undefined;
          })
          .filter(isDefined)
      );
    }
    return validatedFilters;
  }

  async purge(
    filters: VariableFilter[],
    context?: VariableStorageContext
  ): Promise<void> {
    if (!context?.tracker) {
      return this._storage.purge(filters, context);
    }

    await this._storage.purge(
      this._validateFilters(filters, context.tracker),
      context
    );
  }

  private _trackDeviceData(
    getter: VariableGetter<any> | undefined,
    tracker: Tracker
  ) {
    if (
      getter &&
      getter.scope === VariableScope.Device &&
      !parseKey(getter.key).prefix
    ) {
      if (!getter.initializer) {
        // Try read the value from the device if it is not cached.
        getter.initializer = () =>
          tracker._getClientDeviceVariables()?.variables?.[getter.key];
      }

      // Only load new if changed since persisted version.
      getter.version ??=
        tracker._getClientDeviceVariables()?.[getter.key]?.version;
    }
    return getter;
  }

  async get<K extends (VariableGetter<any> | null | undefined)[]>(
    keys: K,
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K>> {
    if (!context?.tracker) {
      return this._storage.get(keys, context);
    }
    const results = await this._storage.get(
      keys.map((key) =>
        this._trackDeviceData(
          this._validate(key, context.tracker!),
          context.tracker!
        )
      ),
      context
    );

    return results.map((result) =>
      this._validate(result, context.tracker!)
    ) as VariableGetResults<K>;
  }

  private _queryOrHead(
    method: "head" | "query",
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ) {
    // Queries always go straight to the storage (not looking at cached device variables).
    if (!context?.tracker) {
      return this._storage[method](filters, options, context);
    }

    return this._storage[method](
      this._validateFilters(filters, context.tracker),
      options,
      context
    ) as VariableQueryResult;
  }

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options, context);
  }
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ): MaybePromise<VariableQueryResult<Variable<any>>> {
    return this._queryOrHead(
      "query",
      filters,
      options,
      context
    ) as MaybePromise<VariableQueryResult<Variable<any>>>;
  }
}

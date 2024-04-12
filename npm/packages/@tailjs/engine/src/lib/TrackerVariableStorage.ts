import {
  DataClassification,
  Variable,
  VariableFilter,
  VariableGetResults,
  VariableGetter,
  VariableHeader,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableScope,
  VariableScopeValue,
  VariableSetResult,
  VariableSetResults,
  VariableValidationBasis,
  dataClassification,
  dataPurposes,
  isSuccessResult,
  isVariablePatch,
  parseKey,
  variableScope,
} from "@tailjs/types";
import { MaybePromise, Nullish, isDefined, isFunction } from "@tailjs/util";
import {
  Tracker,
  VariableGetParameter,
  VariableSetParameter,
  VariableStorage,
  VariableStorageContext,
} from "..";

import { PartitionItem, extractKey } from ".";

const trackerScopes = new Set([
  VariableScope.User,
  VariableScope.Device,
  VariableScope.Session,
]);
const nonTrackerScopes = new Set([VariableScope.Global, VariableScope.Entity]);

export class TrackerVariableStorage implements VariableStorage<true> {
  private _storage: VariableStorage<true>;

  constructor(storage: VariableStorage<true>) {
    this._storage = storage;
  }

  public configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
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

  private _validate<T extends VariableValidationBasis<boolean>>(
    variable: T | Nullish,
    tracker: Tracker
  ) {
    if (!variable) return undefined;

    const scope = variableScope.parse(variable.scope, false);
    if (this._isRestrictedScope(scope)) {
      const originalTargetId = variable.targetId;
      variable.targetId = this._getScopeTargetId(scope, tracker);

      if (originalTargetId && variable.targetId !== originalTargetId) {
        throw new TypeError(
          `Target ID must either match the tracker or be unspecified.`
        );
      }

      if (!variable.targetId) {
        // There is not consented ID for the scope in the tracker, or an ID unrelated to the current tracker was used.
        return undefined;
      }

      const classification = dataClassification.parse(
        variable.classification,
        false
      );
      if (isDefined(classification)) {
        if (
          this._getMaxConsentLevel(scope, tracker) < classification ||
          (variable.purposes &&
            tracker.consent.purposes && // This check ignores Necessary (which is 0)
            !(
              tracker.consent.purposes &
              dataPurposes.parse(variable.purposes, false)
            ))
        ) {
          return undefined;
        }
      }
    }

    return variable;
  }

  public async set<K extends VariableSetParameter<true>>(
    variables: K | VariableSetParameter<true>,
    context?: VariableStorageContext
  ): Promise<VariableSetResults<K, true>> {
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

    const denied: PartitionItem<VariableSetResult<any>>[] = [];
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
              { status: VariableResultStatus.Denied, source },
            ]);
            return undefined;
          }
          return inner;
        };
      }
    });
    const results = (await this._storage.set(
      validated,
      context
    )) as VariableSetResult<any>[];

    denied.forEach(([sourceIndex, status]) => (results[sourceIndex] = status));
    for (const result of results) {
      isSuccessResult(result) &&
        (await tracker._maybeUpdate(result.source, result.current));
    }

    return results as VariableSetResults<K, true>;
  }

  private _validateFilters(filters: VariableFilter[], tracker: Tracker) {
    let validatedFilters: VariableFilter[] = [];

    const consent = tracker.consent;
    for (let filter of filters) {
      // For each scope that intersects the tracker scopes, add a separate filter restricted to the target ID
      // that matches the current tracker.
      const scopes =
        filter.scopes?.map((item) => variableScope.parse(item)) ??
        variableScope.values;

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
                        purposes: filter.purposes
                          ? dataPurposes.parse(filter.purposes) &
                            consent.purposes
                          : undefined,

                        classification: filter.classification && {
                          // Cap classification filter so no criteria exceeds the consent's level.
                          min:
                            dataClassification.parse(
                              filter.classification.min
                            )! > consentLevel
                              ? consentLevel
                              : filter.classification.min,
                          // If no explicit levels are set, limit the max value to the consent's level.
                          max:
                            dataClassification.parse(
                              filter.classification.max
                            )! > consentLevel || !filter.classification.levels
                              ? consentLevel
                              : filter.classification.max,
                          levels: filter.classification.levels?.filter(
                            (level) =>
                              dataClassification.parse(level) <= consentLevel
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
    getter: VariableGetter<any, false> | undefined,
    tracker: Tracker
  ) {
    if (
      getter &&
      variableScope.tryParse(getter.scope) === VariableScope.Device &&
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

  async get<K extends VariableGetParameter<true>>(
    keys: K | VariableGetParameter<true>,
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K, true>> {
    if (!context?.tracker) {
      return this._storage.get(keys, context);
    }
    const results = await this._storage.get(
      keys.map((key) => {
        const ged = this._validate(key, context.tracker!);
        return this._trackDeviceData(ged, context.tracker!);
      }),
      context
    );

    return results.map((result) =>
      this._validate(result, context.tracker!)
    ) as VariableGetResults<K, true>;
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
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
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

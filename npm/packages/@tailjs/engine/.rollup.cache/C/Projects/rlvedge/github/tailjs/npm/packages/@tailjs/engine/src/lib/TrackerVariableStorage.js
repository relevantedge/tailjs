import { dataClassification, dataPurposes, isSuccessResult, isVariablePatch, toStrict, variableScope, } from "@tailjs/types";
import { isDefined, isFunction } from "@tailjs/util";
import { extractKey, parseKey } from ".";
const trackerScopes = new Set([
    3 /* VariableScope.User */,
    2 /* VariableScope.Device */,
    1 /* VariableScope.Session */,
]);
const nonTrackerScopes = new Set([0 /* VariableScope.Global */, 4 /* VariableScope.Entity */]);
export class TrackerVariableStorage {
    _storage;
    constructor(storage) {
        this._storage = storage;
    }
    configureScopeDurations(durations, context) {
        this._storage.configureScopeDurations(durations, context);
    }
    renew(scope, scopeIds, context) {
        if (context?.tracker && this._isRestrictedScope(scope)) {
            const scopeId = this._getScopeTargetId(scope, context.tracker);
            if (!scopeId) {
                return;
            }
            scopeIds = [scopeId];
        }
        return this._storage.renew(scope, scopeIds, context);
    }
    _isRestrictedScope(scope) {
        return (scope === 1 /* VariableScope.Session */ ||
            scope === 2 /* VariableScope.Device */ ||
            scope === 3 /* VariableScope.User */);
    }
    _getScopeTargetId(scope, tracker) {
        return scope === 1 /* VariableScope.Session */
            ? tracker.session.id
            : scope === 2 /* VariableScope.Device */
                ? tracker.session.deviceId
                : scope === 3 /* VariableScope.User */
                    ? tracker.session.userId
                    : undefined;
    }
    _getMaxConsentLevel(scope, tracker) {
        // If a user is authenticated, it is assumed that there is consent for storing direct personal data,
        // (right? The user must have provided a user name somehow...).
        // This also means that a user may have consented to having their profile data such as name stored,
        // but still do not want to be tracked.
        return scope === 3 /* VariableScope.User */
            ? 2 /* DataClassification.Direct */
            : tracker.consent.level;
    }
    _validate(variable, tracker) {
        if (!variable)
            return undefined;
        if (this._isRestrictedScope(variable.scope)) {
            const originalTargetId = variable.targetId;
            variable.targetId = this._getScopeTargetId(variable.scope, tracker);
            if (originalTargetId && variable.targetId !== originalTargetId) {
                throw new TypeError(`Target ID must either match the tracker or be unspecified.`);
            }
            if (!variable.targetId) {
                // There is not consented ID for the scope in the tracker, or an ID unrelated to the current tracker was used.
                return undefined;
            }
            if (isDefined(variable.classification)) {
                if (this._getMaxConsentLevel(variable.scope, tracker) <
                    variable.classification ||
                    (variable.purposes &&
                        tracker.consent.purposes && // This check ignores Necessary (which is 0)
                        !(tracker.consent.purposes & variable.purposes))) {
                    return undefined;
                }
            }
        }
        return variable;
    }
    async set(variables, context) {
        const tracker = context?.tracker;
        if (!tracker) {
            return await this._storage.set(variables, context);
        }
        const validated = variables.map((variable) => this._validate(toStrict(variable), tracker));
        validated.forEach((setter) => 
        // Any attempt to change a device variable (even if it fails) must trigger the tracker to refresh all device variables and send them to the the client,
        // to avoid race conditions (requests may complete out of request order, hence send stale cookies otherwise).
        setter &&
            setter.scope === 2 /* VariableScope.Device */ &&
            tracker._touchClientDeviceData());
        const denied = [];
        validated.forEach((source, sourceIndex) => {
            if (!source)
                return;
            if (isVariablePatch(source) && isFunction(source.patch)) {
                const captured = source.patch;
                source.patch = (current) => {
                    // If the patch returns something that does not match the current consent,
                    // we need to 1) return undefined to avoid the storage to save anything, 2) patch the results with a "denied" status.
                    const inner = captured(current);
                    if (inner &&
                        !this._validate({ ...extractKey(source), ...current }, tracker)) {
                        denied.push([
                            sourceIndex,
                            { status: 4 /* VariableSetStatus.Denied */, source },
                        ]);
                        return undefined;
                    }
                    return inner;
                };
            }
        });
        const results = (await this._storage.set(validated, context));
        denied.forEach(([sourceIndex, status]) => (results[sourceIndex] = status));
        for (const result of results) {
            isSuccessResult(result) &&
                (await tracker._maybeUpdate(result.source, result.current));
        }
        return results;
    }
    _validateFilters(filters, tracker) {
        let validatedFilters = [];
        const consent = tracker.consent;
        for (let filter of filters) {
            // For each scope that intersects the tracker scopes, add a separate filter restricted to the target ID
            // that matches the current tracker.
            const scopes = filter.scopes?.map((item) => variableScope(item)) ??
                variableScope.values;
            const safe = scopes.filter((scope) => nonTrackerScopes.has(scope));
            safe.length && validatedFilters.push({ ...filter, scopes: safe });
            validatedFilters.push(...scopes
                .filter((scope) => trackerScopes.has(scope))
                .map((scope) => {
                const targetId = this._getScopeTargetId(scope, tracker);
                const consentLevel = this._getMaxConsentLevel(scope, tracker);
                return targetId
                    ? {
                        ...(consent.purposes ||
                            consentLevel < 3 /* DataClassification.Sensitive */
                            ? {
                                ...filter,
                                // Remove purposes without consent (if purposes are undefined in consent, it means "I am good with all").
                                purposes: filter.purposes
                                    ? dataPurposes(filter.purposes) & consent.purposes
                                    : undefined,
                                classification: filter.classification && {
                                    // Cap classification filter so no criteria exceeds the consent's level.
                                    min: dataClassification(filter.classification.min) >
                                        consentLevel
                                        ? consentLevel
                                        : filter.classification.min,
                                    // If no explicit levels are set, limit the max value to the consent's level.
                                    max: dataClassification(filter.classification.max) >
                                        consentLevel || !filter.classification.levels
                                        ? consentLevel
                                        : filter.classification.max,
                                    levels: filter.classification.levels?.filter((level) => dataClassification(level) <= consentLevel),
                                },
                            }
                            : filter),
                        scopes: [scope],
                        targetIds: [targetId],
                    }
                    : undefined;
            })
                .filter(isDefined));
        }
        return validatedFilters;
    }
    async purge(filters, context) {
        if (!context?.tracker) {
            return this._storage.purge(filters, context);
        }
        await this._storage.purge(this._validateFilters(filters, context.tracker), context);
    }
    _trackDeviceData(getter, tracker) {
        if (getter &&
            variableScope.tryParse(getter.scope) === 2 /* VariableScope.Device */ &&
            !parseKey(getter.key).prefix) {
            if (!getter.initializer) {
                // Try read the value from the device if it is not cached.
                getter.initializer = () => tracker._getClientDeviceVariables()?.variables?.[getter.key];
            }
            // Only load new if changed since persisted version.
            getter.version ??=
                tracker._getClientDeviceVariables()?.[getter.key]?.version;
        }
        return getter;
    }
    async get(keys, context) {
        if (!context?.tracker) {
            return this._storage.get(keys, context);
        }
        const results = await this._storage.get(keys.map((key) => {
            const ged = this._validate(toStrict(key), context.tracker);
            return this._trackDeviceData(ged, context.tracker);
        }), context);
        return results.map((result) => this._validate(result, context.tracker));
    }
    _queryOrHead(method, filters, options, context) {
        // Queries always go straight to the storage (not looking at cached device variables).
        if (!context?.tracker) {
            return this._storage[method](filters, options, context);
        }
        return this._storage[method](this._validateFilters(filters, context.tracker), options, context);
    }
    head(filters, options, context) {
        return this._queryOrHead("head", filters, options, context);
    }
    query(filters, options, context) {
        return this._queryOrHead("query", filters, options, context);
    }
}
//# sourceMappingURL=TrackerVariableStorage.js.map
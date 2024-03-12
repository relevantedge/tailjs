import {
  DataClassification,
  Variable,
  VariableClassification,
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
  isVariablePatch,
} from "@tailjs/types";
import { MaybePromise, isDefined, isFunction, isUndefined } from "@tailjs/util";
import {
  InMemoryStorageBase,
  ScopeVariables,
  Tracker,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  isWritable,
} from "..";

import { PartitionItem, extractKey, hasPrefix } from ".";

const validateTargetId = (
  targetId: string | undefined,
  allowed: string | undefined
) => isDefined(allowed) && (isUndefined(targetId) || targetId === allowed);

const enum VariableTarget {
  Denied = -1,
  None = 0,
  Tracker = 1,
  External = 2,
}

type VariableValidationSource = VariableKey & Partial<VariableClassification>;

const trackerScopes = new Set([
  VariableScope.User,
  VariableScope.Device,
  VariableScope.Session,
]);
const nonTrackerScopes = new Set([VariableScope.Global, VariableScope.Entity]);

class TrackerVariableStorage implements VariableStorage {
  private _storage: VariableStorage;
  public readonly tracker: Tracker;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
    this._storage = tracker.env.storage;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ): void {
    this._storage.configureScopeDurations(durations);
  }

  renew(scopes: VariableScope[], scopeIds: string[]): MaybePromise<void> {
    return this._storage.renew(scopes, scopeIds);
  }

  private _isValidationScope(scope: VariableScope) {
    return (
      scope === VariableScope.Session ||
      scope === VariableScope.Device ||
      scope === VariableScope.User
    );
  }

  private _getScopeTargetId(scope: VariableScope) {
    return scope === VariableScope.Session
      ? this.tracker.sessionId
      : scope === VariableScope.Device
      ? this.tracker.deviceId
      : scope === VariableScope.User
      ? this.tracker.userId
      : undefined;
  }

  private _validate<T extends VariableValidationBasis>(
    variable: T | null | undefined
  ) {
    if (!variable) return undefined;

    if (this._isValidationScope(variable.scope)) {
      const originalTargetId = variable.targetId;
      variable.targetId = this._getScopeTargetId(variable.scope);

      if (
        !variable.targetId ||
        (originalTargetId && variable.targetId !== originalTargetId)
      ) {
        // There is not consented ID for the scope in the tracker, or an ID unrelated to the current tracker was used.
        return undefined;
      }

      if (isDefined(variable.classification)) {
        if (
          this.tracker.consent.level < variable.classification ||
          (variable.purposes &&
            this.tracker.consent.purposes &&
            !variable.purposes.some((purpose) =>
              this.tracker.consent.purposes!.has(purpose)
            ))
        ) {
          return undefined;
        }
      }
    }

    return variable;
  }

  async set<K extends (VariableSetter<any, false> | null | undefined)[]>(
    ...variables: K
  ): Promise<VariableSetResults<K>> {
    const validated = variables.map((variable) => this._validate(variable));

    const denied: PartitionItem<VariableSetResult>[] = [];
    validated.forEach((source, sourceIndex) => {
      if (!source) return;
      if (isVariablePatch(source) && isFunction(source.patch)) {
        const captured = source.patch;
        source.patch = (current) => {
          // If the patch returns something that does not match the current consent,
          // we need to 1) return undefined to avoid the storage to save anything, 2) patch the results with a "denied" status.
          const inner = captured(current);
          if (inner && !this._validate({ ...extractKey(source), ...current })) {
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
    const results = (await this._storage.set(
      ...validated
    )) as VariableSetResult[];
    denied.forEach(([sourceIndex, status]) => (results[sourceIndex] = status));

    return results as VariableSetResults<K>;
  }

  private _validateFilters(filters: VariableFilter[]) {
    let validatedFilters: VariableFilter[] = [];

    const consent = this.tracker.consent;
    for (let filter of filters) {
      const scopedFilter: VariableFilter =
        // Template for filters that queries any of the scopes related to consent.
        consent.purposes || consent.level < DataClassification.Sensitive
          ? {
              ...filter,
              // Remove purposes without consent (if purposes are undefined in consent, it means "I am good with all").
              purposes: filter.purposes?.filter(
                (purpose) => consent.purposes?.has(purpose) !== false
              ),
              classification: filter.classification && {
                // Cap classification filter so no criteria exceeds the consent's level.

                min:
                  filter.classification.min! > consent.level
                    ? consent.level
                    : filter.classification.min,
                // If no explicit levels are set, limit the max value to the consent's level.
                max:
                  filter.classification.max! > consent.level ||
                  !filter.classification.levels
                    ? consent.level
                    : filter.classification.max,
                levels: filter.classification.levels?.filter(
                  (level) => level <= consent.level
                ),
              },
            }
          : filter;

      // For each scope that intersects the tracker scopes, add a separate filter restricted to the target ID
      // that matches the current tracker.
      const scopes = filter.scopes ?? VariableScopes;
      const safe = scopes.filter((scope) => nonTrackerScopes.has(scope));
      safe.length && validatedFilters.push({ ...filter, scopes: safe });
      validatedFilters.push(
        ...scopes
          .map((scope) => {
            const targetId = this._getScopeTargetId(scope);
            return targetId
              ? {
                  ...scopedFilter,
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

  async purge(filters: VariableFilter[]): Promise<void> {
    if (isWritable(this._storage)) {
      await this._storage.purge(this._validateFilters(filters));
    }
  }

  async get<K extends (VariableGetter<any, false> | null | undefined)[]>(
    ...keys: K
  ): Promise<VariableGetResults<K>> {
    const results = await this._storage.get(
      ...keys.map((key) => this._validate(key))
    );
    return results.map((result) =>
      this._validate(result)
    ) as VariableGetResults<K>;
  }

  private _queryOrHead(
    method: "head" | "query",
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ) {
    return this._storage[method](
      this._validateFilters(filters),
      options
    ) as VariableQueryResult;
  }

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this._queryOrHead("head", filters, options);
  }
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<Variable<any>>> {
    return this._queryOrHead("query", filters, options);
  }
}

export class TrackerMemoryVariableStorage extends InMemoryStorageBase {
  private readonly _variables: ScopeVariables[];

  constructor(public readonly tracker: Tracker) {
    super();
    this._variables = [];

    [VariableScope.Session, VariableScope.Device].forEach(
      (scope) => (this._variables[scope] = [undefined, new Map()])
    );
  }

  protected _mapResultVariable(variable: Variable): Variable | undefined {
    const version = this._getNextVersion(variable);
    return isDefined(version)
      ? ((variable.version = version), variable)
      : undefined;
  }

  private _getTargetIdForScope(scope: VariableScope) {
    if (scope === VariableScope.Session) {
      return this.tracker.sessionId;
    } else if (scope === VariableScope.Device) {
      return this.tracker.deviceId;
    }
    return undefined;
  }

  private _isTrackerScope(scope: VariableScope) {
    return scope === VariableScope.Device || scope === VariableScope.Session;
  }

  protected _getNextVersion(variable: Variable): string | undefined {
    const { level, purposes } = this.tracker.consent;
    if (
      // The tracker don't want it!
      variable.classification > level ||
      (purposes &&
        variable.purposes &&
        !variable.purposes.some((variable) => purposes.has(variable)))
    ) {
      return undefined;
    }

    if (variable.scope === VariableScope.Session) {
      return this.tracker.session.version;
    } else if (variable.scope === VariableScope.Device) {
      return this.tracker.device?.version;
    }

    return undefined;
  }

  protected _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined
  ): [expires: number | undefined, Map<string, Variable<any>>] | undefined {
    if (isUndefined(targetId) || targetId != this._getTargetIdForScope(scope))
      return undefined;

    return this._variables[scope];
  }

  protected _resetScope(scope: VariableScope): void {
    const variables = this._variables[scope];
    if (variables) {
      variables[0] = undefined;
      variables[1].clear();
    }
  }

  protected _deleteTarget(scope: VariableScope, targetId: string): void {
    if (isDefined(targetId) && targetId === this._getTargetIdForScope(scope)) {
      this._resetScope(scope);
    }
  }
  protected _getTargetsInScope(
    scope: VariableScope
  ): Iterable<
    [string, [expires: number | undefined, Map<string, Variable<any>>]]
  > {
    const targetId = this._getTargetIdForScope(scope);
    return this._variables[scope] && targetId
      ? [[targetId, this._variables[scope]]]
      : [];
  }

  private _getVariableTarget(
    variable: undefined | null | VariableValidationSource
  ): VariableTarget {
    if (!variable) return VariableTarget.None;

    if (!this._isTrackerScope(variable.scope)) {
      // Not related to the tracker.
      return VariableTarget.External;
    }

    if (isDefined(variable.classification)) {
      const consent = this.tracker.consent;
      if (
        variable.classification > consent.level ||
        (variable.purposes &&
          consent.purposes &&
          !variable.purposes.some((purpose) => consent.purposes!.has(purpose)))
      ) {
        return VariableTarget.Denied;
      }
    }
    if (hasPrefix(variable.key)) {
      // Prefixed session and device variables are also routed to external storage.
      return VariableTarget.External;
    }

    const { scope, targetId } = variable;
    return (scope !== VariableScope.Device ||
      validateTargetId(targetId, this.tracker.deviceId)) &&
      (scope !== VariableScope.User ||
        validateTargetId(targetId, this.tracker.userId)) &&
      (scope !== VariableScope.Session ||
        validateTargetId(targetId, this.tracker.sessionId))
      ? VariableTarget.Tracker
      : VariableTarget.Denied;
  }

  private _filterKeys<
    K extends (VariableValidationSource | undefined | null)[]
  >(getters: K): K {
    const keys: K = [] as any;

    getters.forEach((item: VariableValidationSource) => {
      const target = this._getVariableTarget(item);
      if (!item || target !== VariableTarget.Tracker) return;
      keys.push(item);
    });

    return keys;
  }

  async get<K extends (VariableGetter<any, false> | null | undefined)[]>(
    ...getters: K
  ): Promise<VariableGetResults<K>> {
    return super.get(...this._filterKeys(getters));
  }

  async set<Setters extends (VariableSetter<any, false> | null | undefined)[]>(
    ...setters: Setters
  ): Promise<VariableSetResults<Setters>> {
    return super.set(...this._filterKeys(setters));
  }
}

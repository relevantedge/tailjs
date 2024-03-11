import {
  Variable,
  VariableClassification,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariablePatchResult,
  VariableQueryResult,
  VariableQuerySettings,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VersionedVariableKey,
  isVariablePatch,
} from "@tailjs/types";
import {
  Clock,
  MaybePromise,
  clock,
  concat,
  filter,
  forEach,
  isDefined,
  isUndefined,
  map,
  mapDistinct,
  now,
  project,
  some,
} from "@tailjs/util";
import {
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  applyPatchOffline,
  copy,
  variableId,
} from "..";

export type ScopeVariables = [
  expires: number | undefined,
  Map<string, Variable>
];

export const hasChanged = (
  getter: VersionedVariableKey,
  current: Variable | undefined
) => isUndefined(getter.version) || current?.version !== getter.version;

export const applyGetFilters = (
  getter: VariableGetter,
  variable: Variable | undefined
) =>
  !variable ||
  (isDefined(getter.purpose) &&
    variable.purposes?.includes(getter.purpose) === false)
    ? undefined
    : isDefined(getter.version) && variable?.version == getter.version
    ? variable
    : copy(variable);

export abstract class InMemoryStorageBase implements VariableStorage {
  private _ttl: Partial<Record<VariableScope, number>> | undefined;
  private _cleaner: Clock | undefined;

  /** For testing purposes to have the router apply the patches. @internal */
  public _testDisablePatch: boolean;

  constructor() {}

  /** If this method return `undefined`, the variable in question will not be updated. */
  protected abstract _getNextVersion(variable: Variable): string | undefined;

  protected abstract _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined,
    require: boolean
  ): ScopeVariables | undefined;

  protected abstract _resetScope(scope: VariableScope): void;

  protected abstract _deleteTarget(
    scope: VariableScope,
    targetId: string
  ): void;

  protected abstract _getTargetsInScope(
    scope: VariableScope
  ): Iterable<[string, ScopeVariables]>;

  protected _mapResultVariable(variable: Variable): Variable | undefined {
    return variable;
  }

  private _remove(variable: VariableKey, timestamp?: number) {
    const values = this._getScopeValues(variable.scope, variable.key, false);
    if (values?.[1].has(variable.key)) {
      values[0] = timestamp ?? now();
      values[1].delete(variable.key);
      return true;
    }
    return false;
  }

  private _update(variable: Variable, timestamp?: number) {
    let scopeValues = this._getScopeValues(variable.scope, variable.key, true)!;
    variable.version = this._getNextVersion(variable);

    if (!variable.version) {
      // Don't want it.
      return undefined;
    }

    const ttl = this._ttl?.[variable.scope];
    scopeValues[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
    scopeValues[1].set(variable.key, variable);

    return variable;
  }

  private _query(
    filters: VariableFilter[],
    settings?: VariableQuerySettings
  ): Variable[] {
    const results: Variable[] = [];
    const timestamp = now();

    const ifNoneMatch = settings?.ifNoneMatch
      ? new Map(
          settings.ifNoneMatch.map((variable) => [
            variableId(variable),
            variable.version,
          ])
        )
      : null;
    const ifModifiedSince = settings?.ifModifiedSince ?? 0;

    for (const queryFilter of filters) {
      const match = (variable: Variable | undefined): variable is Variable => {
        const { purposes, classification: classifications } = queryFilter;
        if (
          !variable ||
          purposes?.every(
            (purpose) => variable.purposes?.includes(purpose) === false
          ) ||
          (classifications &&
            (variable.classification < classifications.min! ||
              variable.classification > classifications.max! ||
              classifications.levels?.some(
                (level) => variable.classification === level
              ) === false))
        ) {
          return false;
        }

        let matchVersion: string | undefined;
        if (
          (ifModifiedSince && variable.modified! < ifModifiedSince!) ||
          (isDefined((matchVersion = ifNoneMatch?.get(variableId(variable)))) &&
            variable.version === matchVersion)
        ) {
          // Skip the variable because it is too old or unchanged based on the settings provided for the query.
          return false;
        }

        return true;
      };

      for (const scope of queryFilter.scopes ?? VariableScopes) {
        for (const [, scopeVars] of queryFilter.targetIds?.map(
          (targetId) =>
            [targetId, this._getScopeValues(scope, targetId, false)] as const
        ) ?? this._getTargetsInScope(scope)) {
          if (!scopeVars || scopeVars[0]! <= timestamp) continue;
          const vars = scopeVars[1];
          for (const key of queryFilter.keys ?? vars.keys()) {
            if (key.endsWith("*")) {
              const prefix = key.slice(0, -1);
              results.push(
                ...project(
                  filter(
                    vars,
                    ([key, value]) => key.startsWith(prefix) && match(value)
                  ),
                  ([, value]) => value
                )
              );
            } else {
              const value = vars.get(key);
              if (match(value)) {
                results.push(value);
              }
            }
          }
        }
      }
    }

    return map(results, (result) => this._mapResultVariable(result));
  }

  public clean() {
    const timestamp = now();
    forEach(this._ttl, ([scope, ttl]) => {
      if (isUndefined(ttl)) return;

      const variables = this._getTargetsInScope(scope);
      forEach(
        variables,
        ([targetId, variables]) =>
          variables[0]! <= timestamp - ttl &&
          this._deleteTarget(scope, targetId)
      );
    });
  }

  renew(scopes: VariableScope[], targetIds: string[]) {
    const timestamp = now();
    for (const scope of scopes) {
      const ttl = this._ttl?.[scope];
      if (!ttl) continue;

      for (const targetId of targetIds) {
        const vars = this._getScopeValues(scope, targetId, false);
        if (vars) {
          vars[0] = timestamp;
        }
      }
    }
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>
  ): MaybePromise<void> {
    this._ttl ??= {};
    for (const [scope, duration] of Object.entries(durations)) {
      duration! > 0 ? (this._ttl![scope] = duration) : delete this._ttl![scope];
    }

    let hasTtl = some(this._ttl, ([, ttl]) => ttl! > 0);
    if (this._cleaner || hasTtl) {
      (this._cleaner ??= clock({
        callback: () => this.clean(),
        frequency: 10000,
      })).toggle(hasTtl);
    }
  }

  async get<K extends (VariableGetter | null | undefined)[]>(
    ...keys: K
  ): Promise<VariableGetResults<K>> {
    const values = keys.map((getter) => ({
      value: getter
        ? applyGetFilters(
            getter,
            this._getScopeValues(getter.scope, getter.targetId, false)?.[1].get(
              getter.key
            )
          )
        : undefined,
      getter,
    }));

    for (const item of values) {
      if (item.getter?.initializer && !isDefined(item[0])) {
        const initialValue = await item[1].initializer();
        if (initialValue) {
          item.value = this._update({ ...item[1], ...initialValue });
        }
      }
    }

    return values.map(
      (item) => item.value && this._mapResultVariable(item.value)
    ) as VariableGetResults<K>;
  }

  head(
    filters: VariableFilter[],
    options?: VariableQuerySettings | undefined
  ): VariableQueryResult<VariableHeader> {
    return this.query(filters, options);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQuerySettings
  ): VariableQueryResult<Variable> {
    const results = this._query(filters, options);
    return {
      count: results.length,
      results: (options?.top ? results.slice(options.top) : results).map(
        (variable) => copy(variable)
      ),
    };
  }

  set<Setters extends (VariableSetter | null | undefined)[]>(
    ...variables: Setters
  ): VariableSetResults<Setters>;
  set(...variables: (VariableSetter | null | undefined)[]) {
    const timestamp = now();
    const results: (VariableSetResult | undefined)[] = [];
    for (const source of variables) {
      if (!source) {
        results.push(undefined);
        continue;
      }
      let {
        key,
        targetId,
        scope,
        classification,
        purposes,
        value,
        version: version,
      } = source as Variable;

      let scopeVars = this._getScopeValues(
        source.scope,
        source.targetId,
        false
      );
      if (scopeVars?.[0]! < timestamp) {
        scopeVars = undefined;
      }
      let current = scopeVars?.[1].get(key);

      if (isVariablePatch(source)) {
        if (this._testDisablePatch) {
          results.push({ status: VariableSetStatus.Unsupported, source });
          continue;
        }

        const patched = applyPatchOffline(current, source);

        if (!isDefined(patched)) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            current: copy(current),
          });
          continue;
        }
        classification = patched.classification;
        purposes = patched.purposes;
        value = patched.value;
      } else if (current?.version !== version) {
        results.push({
          status: VariableSetStatus.Conflict,
          source,
          current: copy(current),
        });
        continue;
      }

      if (isUndefined(value)) {
        results.push({
          status:
            current && this._remove(current)
              ? VariableSetStatus.Success
              : VariableSetStatus.Unchanged,
          source,
          current: undefined,
        });
        continue;
      }

      current = this._update(
        {
          key,
          value,
          classification,
          targetId,
          scope,
          purposes:
            current?.purposes && purposes
              ? mapDistinct(concat(current?.purposes, purposes))
              : current?.purposes ?? purposes,
        },
        timestamp
      );

      results.push(
        current
          ? {
              status: VariableSetStatus.Success,
              source,
              current,
            }
          : { status: VariableSetStatus.Denied, source }
      );
    }

    return results;
  }

  purge(filters: VariableFilter[], batch = false) {
    if (!batch && filters.some((filter) => !filter.targetIds)) {
      throw new Error(
        "The batch must be specified when not addressing individual IDs."
      );
    }

    const queryFilters: VariableFilter[] = [];
    for (const filter of filters) {
      if (filter.keys || filter.classification || filter.purposes) {
        // These filters address individual variables and they must be queired and removed individually.
        queryFilters.push(filter);
        continue;
      }

      for (const scope of filter.scopes ?? VariableScopes) {
        if (filter.targetIds) {
          for (const targetId of filter.targetIds) {
            this._deleteTarget(scope, targetId);
          }
        } else {
          this._resetScope(scope);
        }
      }
    }

    if (queryFilters.length) {
      for (const variable of this._query(filters)) {
        this._remove(variable);
      }
    }
  }
}

export class InMemoryStorage extends InMemoryStorageBase {
  private readonly _variables: Map<string, ScopeVariables>[] =
    VariableScopes.map(() => new Map());

  private _nextVersion = 0;

  constructor() {
    super();
  }

  protected _getNextVersion(key: VariableKey) {
    return "" + ++this._nextVersion;
  }

  protected _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined,
    require: boolean
  ) {
    let values = this._variables[scope].get(targetId ?? "");
    if (!values && require) {
      this._variables[scope].set(
        targetId ?? "",
        (values = [undefined, new Map()])
      );
    }
    return values;
  }

  protected _resetScope(scope: VariableScope): void {
    this._variables[scope].clear();
  }

  protected _deleteTarget(scope: VariableScope, targetId: string): void {
    this._variables[scope].delete(targetId);
  }

  protected _getTargetsInScope(
    scope: VariableScope
  ): Iterable<[string, ScopeVariables]> {
    return this._variables[scope];
  }
}

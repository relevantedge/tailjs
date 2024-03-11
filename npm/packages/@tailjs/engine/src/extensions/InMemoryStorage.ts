import {
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableQueryResult,
  VariableQuerySettings,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  isVariablePatch,
} from "@tailjs/types";
import {
  Clock,
  MaybePromise,
  clock,
  concat,
  filter,
  forEach,
  get,
  isDefined,
  isUndefined,
  mapDistinct,
  now,
  project,
  some,
} from "@tailjs/util";
import {
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  applyGetFilters,
  variableKey,
} from "..";

type ScopeVariables = [expires: number | undefined, Map<string, Variable>];

const clone = <T extends Variable | undefined>(variable: T): T => {
  return (
    variable && {
      ...variable,
      purposes: variable.purposes && [...variable.purposes],
    }
  );
};

export class InMemoryStorage implements VariableStorage {
  private readonly _variables: Map<string, ScopeVariables>[] =
    VariableScopes.map(() => new Map());

  private _nextVersion = 0;
  private _ttl: Partial<Record<VariableScope, number>> | undefined;
  private _cleaner: Clock | undefined;

  /** For testing purposes to have the router apply the patches. @internal */
  public _testDisablePatch: boolean;

  constructor() {}

  private _remove(variable: Variable) {
    return this._variables[variable.scope].delete(variable.key);
  }

  private _query(
    filters: VariableFilter[],
    settings?: VariableQuerySettings
  ): Variable[] {
    const results: Variable[] = [];
    const t0 = now();

    const ifNoneMatch = settings?.ifNoneMatch
      ? new Map(
          settings.ifNoneMatch.map((variable) => [
            variableKey(variable),
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
          (isDefined(
            (matchVersion = ifNoneMatch?.get(variableKey(variable)))
          ) &&
            variable.version === matchVersion)
        ) {
          // Skip the variable because it is too old or unchanged based on the settings provided for the query.
          return false;
        }

        return true;
      };

      for (const scope of queryFilter.scopes ?? VariableScopes) {
        const targets = this._variables[scope];
        for (const scopeVars of queryFilter.targetIds?.map((targetId) =>
          targets.get(targetId)
        ) ?? targets.values()) {
          if (!scopeVars || scopeVars[0]! <= t0) continue;
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
    return results;
  }

  public clean() {
    const t0 = now();
    forEach(this._ttl, ([scope, ttl]) => {
      if (isUndefined(ttl)) return;

      const variables = this._variables[scope];
      variables?.forEach(
        (variable, key) => variable[0]! <= t0 - ttl && variables.delete(key)
      );
    });
  }

  renew(scopes: VariableScope[], targetIds: string[]) {
    const t0 = now();
    for (const scope of scopes) {
      const ttl = this._ttl?.[scope];
      if (!ttl) continue;

      for (const targetId of targetIds) {
        const vars = this._variables[scope]?.get(targetId);
        if (vars) {
          vars[0] = t0;
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

  get<K extends (VariableGetter | null | undefined)[]>(
    ...keys: K
  ): VariableGetResults<K> {
    return keys.map((getter) =>
      getter
        ? clone(
            applyGetFilters(
              getter,
              this._variables[getter.scope]
                ?.get(getter.targetId ?? "")?.[1]
                .get(getter.key)
            )
          )
        : undefined
    ) as any;
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
        (variable) => clone(variable)
      ),
    };
  }

  set<Setters extends (VariableSetter | null | undefined)[]>(
    ...variables: Setters
  ): VariableSetResults<Setters>;
  set(...variables: (VariableSetter | null | undefined)[]) {
    const t0 = now();
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

      let scopeVars = this._variables[scope ?? 0].get(targetId ?? "");
      if (scopeVars?.[0]! < t0) {
        scopeVars = undefined;
      }
      let current = scopeVars?.[1].get(key);

      if (isVariablePatch(source)) {
        if (this._testDisablePatch) {
          results.push({ status: VariableSetStatus.Unsupported, source });
          continue;
        }

        const patched = source.patch(current);

        if (!isDefined(patched)) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            current: clone(current),
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
          current: clone(current),
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

      current = {
        key,
        value,
        classification,
        version: "" + ++this._nextVersion,
        targetId,
        scope,
        purposes: mapDistinct(concat(current?.purposes, purposes)),
      };

      let scopeValues = get(
        this._variables[scope],
        targetId ?? "",
        () => [0, new Map()] as const
      );

      const ttl = this._ttl?.[scope];
      scopeValues[0] = ttl ? t0 + ttl : undefined;
      scopeValues[1].set(current.key, current);

      results.push({
        status: VariableSetStatus.Success,
        source,
        current,
      });
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
        const targets = this._variables[scope];
        if (!targets) continue;

        if (filter.targetIds) {
          for (const targetId of filter.targetIds) {
            targets.delete(targetId);
          }
        } else {
          targets.clear();
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

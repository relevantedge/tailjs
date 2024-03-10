import {
  Variable,
  VariableFilter,
  VariableGetter,
  VariableQueryResult,
  VariableQuerySettings,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VersionedVariableKey,
  isVariablePatchAction,
  isVariableValuePatch,
} from "@tailjs/types";
import {
  MaybePromise,
  clock,
  concat,
  forEach,
  get,
  isDefined,
  isUndefined,
  mapDistinct,
  now,
} from "@tailjs/util";
import {
  VariableGetResults,
  VariableStorage,
  applyGetFilters,
  getPatchedValue,
  getVariableMapKey,
} from "..";

type ScopeVariables = [expires: number | undefined, Map<string, Variable>];

const clone = <T extends Variable | undefined>(variable: T): T => {
  return (
    variable && {
      ...variable,
      purposes: variable.purposes && [...variable.purposes],
      tags: variable.tags && [...variable.tags],
    }
  );
};

export class InMemoryStorage implements VariableStorage {
  private readonly _variables: Map<string, ScopeVariables>[] =
    VariableScopes.map(() => new Map());

  private _nextVersion = 0;
  private _ttl: Partial<Record<VariableScope, number>> | undefined;

  /** For testing purposes to have the router apply the patches. @internal */
  public _testDisablePatch: boolean;

  constructor(ttl?: Partial<Record<VariableScope, number>>) {
    this._ttl = ttl
      ? Object.fromEntries(Object.entries(ttl).filter(([, value]) => value > 0))
      : undefined;

    ttl &&
      clock(() => {
        const t0 = now();
        forEach(this._ttl, ([scope, ttl]) => {
          if (isUndefined(ttl)) return;

          const variables = this._variables[scope];
          variables?.forEach(
            (variable, key) => variable[0]! <= t0 - ttl && variables.delete(key)
          );
        });
      }, 10000);
  }

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
            getVariableMapKey(variable),
            variable.version,
          ])
        )
      : null;
    const ifModifiedSince = settings?.ifModifiedSince ?? 0;

    for (const filter of filters) {
      for (const scope of filter.scopes ?? VariableScopes) {
        const targets = this._variables[scope];
        for (const scopeVars of filter.targetIds?.map((targetId) =>
          targets.get(targetId)
        ) ?? targets.values()) {
          if (!scopeVars || scopeVars[0]! <= t0) continue;
          const vars = scopeVars[1];
          for (const key of filter.keys ?? vars.keys()) {
            const variable = vars.get(key);
            if (
              !variable ||
              filter.purposes?.every(
                (purpose) => variable.purposes?.includes(purpose) === false
              ) ||
              filter.tags?.some(
                (tags) =>
                  tags.every((tag) => variable.tags?.includes(tag) === true) ===
                  false
              ) ||
              filter.origins?.some((origin) => variable.origin === origin) ===
                false ||
              (filter.classifications &&
                (variable.classification <
                  (filter.classifications.min as any) ||
                  variable.classification >
                    (filter.classifications.max as any) ||
                  filter.classifications.levels?.some(
                    (level) => variable.classification === level
                  ) === false))
            ) {
              // The variable did not match the query filters.
              continue;
            }

            let matchVersion: string | undefined;
            if (
              (ifModifiedSince && variable.modified! < ifModifiedSince!) ||
              (isDefined(
                (matchVersion = ifNoneMatch?.get(getVariableMapKey(variable)))
              ) &&
                variable.version === matchVersion)
            ) {
              // Skip the variable because it is too old or unchanged based on the settings provided for the query.
              continue;
            }

            results.push(variable);
          }
        }
      }
    }
    return results;
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
  ): VariableQueryResult<VersionedVariableKey> {
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

  set(...variables: VariableSetter[]): VariableSetResult[];
  set(
    ...variables: (VariableSetter | null | undefined)[]
  ): (VariableSetResult | undefined)[];
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
        tags,
        value,
        version,
      } = source as Variable;

      let scopeVars = this._variables[scope ?? 0].get(targetId ?? "");
      if (scopeVars?.[0]! < t0) {
        scopeVars = undefined;
      }
      let current = scopeVars?.[1].get(key);
      let newValue: any;

      if (isVariableValuePatch(source) || isVariablePatchAction(source)) {
        if (this._testDisablePatch) {
          results.push({ status: VariableSetStatus.Unsupported, source });
          continue;
        }

        const patched = getPatchedValue(current, source);
        value = patched.patchedValue;
        newValue = patched.patchedValue;

        if (!patched.changed) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            version: current?.version,
            value: current?.value,
          });
          continue;
        }
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
          version: undefined,
          value: undefined,
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
        tags: tags && [...tags],
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
        version: current.version,
        value: newValue,
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
      if (
        filter.keys ||
        filter.prefixes ||
        filter.classifications ||
        filter.purposes ||
        filter.tags
      ) {
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

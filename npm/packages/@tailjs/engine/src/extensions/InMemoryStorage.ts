import {
  Variable,
  VariableFilter,
  VariablePatch,
  VariablePatchType,
  VariableQueryResult,
  VariableScope,
  VariableScopes,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import {
  clock,
  forEach,
  get,
  isDefined,
  isNumber,
  isUndefined,
  now,
  some,
} from "@tailjs/util";
import {
  VariableQueryParameters,
  VariableStorage,
  expandVariableFilters,
  getPatchedValue,
} from "..";

const DEFAULT_TARGET = { id: "", scope: 0 as any };

type ScopeVariables = [expires: number | undefined, Map<string, Variable>];

const clone = <T extends Variable | undefined>(variable: T): T => {
  return (
    variable && {
      ...variable,
      target: variable.target ? { ...variable.target } : undefined,
      purposes: variable.purposes && [...variable.purposes],
      tags: variable.tags && [...variable.tags],
    }
  );
};

export class InMemoryStorage implements VariableStorage {
  private readonly _variables: Map<string, ScopeVariables>[] =
    VariableScopes.map(() => new Map());

  private _nextVersion = 0;
  private readonly _ttl: Partial<Record<VariableScope, number>> | undefined;

  constructor(ttl?: Partial<Record<VariableScope, number>>) {
    this._ttl = ttl;
    if (some(ttl, ([, value]) => isDefined(value))) {
      clock(() => {
        const t0 = now();
        forEach(ttl, ([scope]) => {
          const variables = this._variables[scope];
          variables?.forEach(
            (variable, key) =>
              (variable[0] as any) <= t0 && variables.delete(key)
          );
        });
      }, 10000);
    }
  }

  private _remove(variable: Variable) {
    return this._variables[
      variable.target?.scope ?? DEFAULT_TARGET.scope
    ].delete(variable.key);
  }

  private _query(filters: VariableFilter[]): Variable[] {
    filters = expandVariableFilters(filters);

    const results: Variable[] = [];
    const t0 = now();
    for (const filter of filters) {
      for (const scope of filter.scopes ?? VariableScopes) {
        const targets = this._variables[scope];
        for (const scopeVars of filter.targetIds?.map((targetId) =>
          targets.get(targetId)
        ) ?? targets.values()) {
          if (!scopeVars || (scopeVars[0] as any) <= t0) continue;
          const vars = scopeVars[1];
          for (const key of filter.keys ?? vars.keys()) {
            const variable = vars.get(key);
            if (
              !variable ||
              filter.purposes?.every(
                (purpose) => variable.purposes?.includes(purpose) === false
              ) ||
              filter.tags?.every((tag) => variable.tags?.includes(tag)) ===
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

  get(key: string, target?: VariableTarget | null): Variable | undefined {
    if (!target?.id) {
      target = DEFAULT_TARGET;
    }
    return clone(this._variables[target.scope]?.get(target.id)?.[1].get(key));
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryParameters
  ): VariableQueryResult {
    const results = this._query(filters);
    return {
      count: results.length,
      results: (options?.top ? results.slice(options.top) : results).map(
        (variable) => clone(variable)
      ),
    };
  }

  set(variables: VariableSetter[]): VariableSetResult[] {
    const t0 = now();
    const results: VariableSetResult[] = [];
    for (const source of variables) {
      let {
        key,
        value,
        target,
        classification,
        purposes,
        tags,
        version,
        patch,
      } = source;

      if (!target?.id) {
        target = DEFAULT_TARGET;
      }

      let scopeVars = this._variables[target.scope].get(target.id);
      if ((scopeVars?.[1] as any) < t0) {
        scopeVars = undefined;
      }
      let current = scopeVars?.[1].get(key);

      if (patch) {
        const patched = getPatchedValue(current, source);
        if (!patched) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            value: current?.value,
          });
          continue;
        }
        value = patched[0];
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
        });
        continue;
      }

      current = {
        key,
        value,
        classification,
        version: "" + ++this._nextVersion,

        // Put last to keep V8 shape when cloning in get and query.
        target: target === DEFAULT_TARGET ? undefined : { ...target },
        purposes: purposes && [...purposes],
        tags: tags && [...tags],
      };

      let scopeValues = get(
        this._variables[target.scope],
        target.id,
        () => [0, new Map()] as const
      );
      const ttl = this._ttl?.[target.scope];
      scopeValues[0] = ttl ? t0 + ttl : undefined;
      scopeValues[1].set(current.key, current);

      results.push({
        status: VariableSetStatus.Success,
        value,
        source,
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

    filters = expandVariableFilters(filters);

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

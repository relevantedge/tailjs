import {
  DataClassification,
  DataPurpose,
  Variable,
  VariableFilter,
  VariablePatchType,
  VariableQueryResult,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import {
  MaybePromise,
  isDefined,
  isNumber,
  isUndefined,
  now,
} from "@tailjs/util";
import {
  TrackerEnvironment,
  VariableStorage,
  VariableQueryParameters,
} from "..";

const DEFAULT_TARGET = { id: "", scope: 0 as any };

type VariableSet = Map<string, Variable>[];

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
  private readonly _variables = new Map<string, VariableSet>();
  private readonly _volatile = new Set<Variable>();
  private _nextVersion = 0;

  private _remove(variable: Variable) {
    let target = variable.target;
    if (!target?.id) target = DEFAULT_TARGET;

    const scopes = this._variables.get(target.id);
    if (scopes) {
      const vars = scopes[target.scope];
      const has = isDefined(vars?.has(variable.key));
      if (has) {
        vars.delete(variable.key);
        if (variable.expires) {
          this._volatile.delete(variable);
        }
        if (!vars.size) {
          delete scopes[target.scope];
          if (!Object.keys(scopes).length) {
            this._variables.delete(target.id);
          }
        }
        return true;
      }
    }
    return false;
  }

  private _query(filters: VariableFilter[]): Set<Variable> {
    const resultSet = new Set<Variable>();

    for (const filter of filters) {
      const addVariables = (id: string) => {
        const values = this._variables.get(id);
        if (values) {
          for (const scope of filter.scopes ?? Object.keys(values)) {
            const scopeValues = values[+scope];
            if (!scopeValues) {
              continue;
            }

            for (const key of filter.keys ?? Object.keys(scopeValues)) {
              const variable = scopeValues.get(key);
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
              resultSet.add(variable);
            }
          }
        }
      };

      if (filter.targetIds) {
        filter.targetIds.forEach((key) => addVariables(key));
      } else {
        this._variables.forEach((_, key) => addVariables(key));
      }
    }

    return resultSet;
  }

  get(
    key: string,
    target?: VariableTarget | null,
    purpose?: DataPurpose,
    classification?: DataClassification
  ): Variable | undefined {
    if (!target?.id) {
      target = DEFAULT_TARGET;
    }
    const value = this._variables.get(target.id)?.[target.scope]?.get(key);
    return value &&
      (value.classification > (classification as any) ||
        (purpose && value.purposes?.includes(purpose) === false))
      ? undefined
      : clone(value);
  }

  query(
    filters: VariableFilter[],
    options?: VariableQueryParameters
  ): VariableQueryResult {
    const results = [...this._query(filters)];
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
        expires,
        ttl,
        version,
        patch,
      } = source;
      if (!target?.id) {
        target = DEFAULT_TARGET;
      }

      if ((ttl as any) <= 0 || (expires as any) <= t0) {
        value = undefined;
      } else if (ttl && !expires) {
        expires = t0 + ttl;
      }

      let current = this._variables.get(target.id)?.[target.scope]?.get(key);
      if ((current?.expires as any) <= t0) {
        this._remove(current!);
        current = undefined;
      }

      if (patch) {
        const currentValue = current?.value;
        const match = patch.match ?? value;
        if (patch.type === VariablePatchType.Add) {
          isDefined(value) && (value = (currentValue ?? 0) + value);
        } else if (
          isDefined(match) &&
          isNumber(currentValue) &&
          ((patch.type === VariablePatchType.IfGreater &&
            currentValue >= match) ||
            (patch.type === VariablePatchType.IfSmaller &&
              currentValue <= match) ||
            (patch.type === VariablePatchType.IfMatch &&
              currentValue !== match))
        ) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            value: currentValue,
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
        });
        continue;
      }

      if (current?.expires) {
        this._volatile.delete(current);
      }

      current = {
        key,
        value,
        classification,
        expires,
        ttl: expires ? expires - t0 : undefined,
        version: "" + ++this._nextVersion,

        // Put last to keep V8 shape when cloning in get and query.
        target: target === DEFAULT_TARGET ? undefined : { ...target },
        purposes: purposes && [...purposes],
        tags: tags && [...tags],
      };

      if (current.expires) {
        this._volatile.add(current);
      }

      let scopeValues = this._variables.get(target.id);
      !scopeValues && this._variables.set(target.id, (scopeValues = []));
      (scopeValues[target.scope] ??= new Map()).set(current.key, current);

      results.push({
        status: VariableSetStatus.Success,
        value,
        source,
      });
    }

    return results;
  }

  purge(filters: VariableFilter[]) {
    for (const variable of this._query(filters)) {
      this._remove(variable);
    }
  }
}

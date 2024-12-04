import {
  extractKey,
  filterKeys,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableSetResult,
  VariableValueSetter,
} from "@tailjs/types";
import {
  assign2,
  flatMap2,
  forEach,
  get2,
  group2,
  jsonClone,
  map2,
  MAX_SAFE_INTEGER,
  set2,
  skip2,
  toggle2,
} from "@tailjs/util";
import { VariableStorage, VariableStorageQuery } from "..";

const internalIdSymbol = Symbol();
type InMemoryVariable = Variable & {
  accessed: number;
  [internalIdSymbol]: number;
};

export class InMemoryStorage implements VariableStorage, Disposable {
  private _nextVersion: number = 1;
  private _disposed = false;
  private _nextInternalId = 1;

  private readonly _entities: {
    [Scope in string]: Map<
      string,
      [
        lastAccessed: number,
        internalId: number,
        variables: Map<string, InMemoryVariable>
      ]
    >;
  } = {};
  private readonly _ttl: number | undefined;

  constructor(ttl?: number) {
    this._ttl = ttl;

    this._purgeExpired();
  }

  private _purgeExpired() {
    if (!this._ttl || this._disposed) {
      return;
    }
    const now = Date.now();
    const expiredEntities: string[] = [];

    for (const key in this._entities) {
      this._entities[key].forEach(
        (value, key) => value[0] + this._ttl! < now && expiredEntities.push(key)
      );

      for (const key of expiredEntities) {
        this._entities[key].delete(key);
      }
    }

    setTimeout(() => this._purgeExpired, 10000);
  }

  private _getVariables(scope: string, entityId: string, now: number) {
    let variables = this._entities[scope]?.get(entityId);
    if (variables) {
      if (this._ttl && variables[0] + this._ttl < now) {
        // Expired but not yet cleaned by background thread.
        this._entities[scope].delete(entityId);
        variables = undefined;
      } else {
        variables[0] = Date.now();
      }
    }

    return variables;
  }

  private _hasExpired(
    variable: (Variable & { accessed: number }) | undefined,
    now: number
  ) {
    return variable?.ttl != null && variable.accessed + variable.ttl < now;
  }

  private _getVariable(key: VariableKey, now: number) {
    const [, , variables] =
      this._getVariables(key.scope, key.entityId!, now) ?? [];
    if (!variables) return undefined;

    let variable = variables.get(key.key);
    if (this._hasExpired(variable, now)) {
      // Expired.
      variables.delete(key.key);
      variable = undefined;
    }

    return variable;
  }

  async get(keys: VariableGetter[]): Promise<VariableGetResult[]> {
    this._checkDisposed();

    const results: VariableGetResult[] = [];
    const now = Date.now();

    for (const getter of keys) {
      const key = extractKey(getter);
      const variable = this._getVariable(getter, now);
      if (!variable) {
        results.push({
          status: VariableResultStatus.NotFound,
          ...key,
          value: null,
        });
        continue;
      }

      if (
        (getter.ifModifiedSince != null &&
          variable.modified <= getter.ifModifiedSince) ||
        (getter.ifNoneMatch != null && variable.version === getter.ifNoneMatch)
      ) {
        results.push({
          status: VariableResultStatus.NotModified,
          ...key,
          value: undefined,
        });
        continue;
      }

      results.push({
        status: VariableResultStatus.Success,
        ...variable,
        value: jsonClone(variable.value),
      });
    }
    return Promise.resolve(results);
  }

  set(values: VariableValueSetter[]): Promise<VariableSetResult[]> {
    this._checkDisposed();

    const results: VariableSetResult[] = [];
    const now = Date.now();

    for (const setter of values) {
      const key = extractKey(setter);
      let variable = this._getVariable(setter, now);
      if (!setter.force && variable?.version !== setter.version) {
        results.push({
          status: VariableResultStatus.Conflict,
          ...key,
          current: null,
        });
        continue;
      }

      if (!variable && setter.value == null) {
        results.push({
          status: VariableResultStatus.NotModified,
          ...key,
          value: null,
        });
        continue;
      }

      const [, , variables] = get2(
        (this._entities[key.scope] ??= new Map()),
        key.entityId,
        () => [now, this._nextInternalId++, new Map()]
      );

      if (setter.value === null) {
        variables.delete(setter.key);
        results.push({
          status: VariableResultStatus.Success,
          ...key,
          value: null,
        });
        if (!variables.size) {
          this._entities[key.scope].delete(key.entityId);
        }

        continue;
      }

      const created = !variable;
      variables.set(
        setter.key,
        (variable = {
          [internalIdSymbol]:
            variable?.[internalIdSymbol] ?? this._nextInternalId++,
          ...key,
          ttl: setter.ttl,
          created: variable?.created ?? now,
          modified: now,
          accessed: now,
          version: "" + this._nextVersion++,
          value: jsonClone(setter.value),
        })
      );

      results.push({
        ...variable,
        value: jsonClone(variable.value),
        status: created
          ? VariableResultStatus.Created
          : VariableResultStatus.Success,
      });
    }

    return Promise.resolve(results);
  }

  private _purgeOrQuery(
    queries: VariableStorageQuery[],
    action: "query",
    options?: VariableQueryOptions
  ): VariableQueryResult;
  private _purgeOrQuery(
    queries: VariableStorageQuery[],
    action: "purge" | "refresh"
  ): number;
  private _purgeOrQuery(
    queries: VariableStorageQuery[],
    action: "purge" | "refresh" | "query",
    { page = 100, cursor }: VariableQueryOptions = {}
  ) {
    if (action === "query" && page <= 0) return { variables: [] };

    this._checkDisposed();

    const variables: Variable[] = [];
    const now = Date.now();
    let affected = 0;

    let [cursorScopeIndex = 0, cursorEntityId = -1, cursorVariableIndex = 0] =
      map2(cursor?.split("."), (value) => +value || 0) ?? [];

    let scopeIndex = 0;
    const scopes = group2(queries, (query) => [
      this._entities[query.scope],
      [query, query.entityIds && set2(query.entityIds)],
    ]);
    for (const [entities, scopeQueries] of scopes) {
      if (scopeIndex++ < cursorScopeIndex) {
        continue;
      }

      let entityIds: Set<string> | undefined;
      for (const [query] of scopeQueries) {
        if (query.entityIds) {
          if (entityIds) {
            for (const entityId of entityIds) {
              entityIds.add(entityId);
            }
          } else {
            entityIds = new Set(query.entityIds);
          }
        } else {
          entityIds = undefined;
          break;
        }
      }

      for (const entityId of entityIds ?? entities.keys()) {
        const data = entities.get(entityId);
        if (!data) {
          continue;
        }
        const [, internalEntityId, entityVariables] = data;
        if (action === "query" && internalEntityId < cursorEntityId) {
          continue;
        }

        if (variables.length >= page) {
          return { variables, cursor: `${scopeIndex - 1}.${internalEntityId}` };
        }

        const matchedVariables = new Set<Variable>();
        for (const [query, queryEntityIds] of scopeQueries) {
          if (queryEntityIds?.has(entityId) === false) continue;

          for (const [variableKey, variable] of filterKeys(
            query.keys,
            entityVariables,
            ([key]) => key
          )) {
            if (
              variable &&
              (action === "purge" || !this._hasExpired(variable, now)) &&
              (!query.ifModifiedSince ||
                variable.modified > query.ifModifiedSince)
            ) {
              if (action === "purge") {
                if (entityVariables.delete(variableKey)) {
                  ++affected;
                }
              } else if (action === "refresh") {
                this._getVariable(variable, now);
                ++affected;
              } else {
                matchedVariables.add(variable);
              }
            }
          }
        }

        let variableIndex = 0;
        for (const variable of matchedVariables) {
          if (variableIndex++ < cursorVariableIndex) {
            continue;
          }
          if (variables.length >= page) {
            return {
              variables,
              cursor: `${scopeIndex - 1}.${internalEntityId}.${variableIndex}`,
            };
          }

          variables.push({
            ...variable,
            value: jsonClone(variable.value),
          });
        }
        cursorVariableIndex = 0;
      }
      cursorEntityId = -1;
    }

    // We have enumerated all variables, we are done - no cursor.
    return action === "query" ? { variables } : affected;
  }

  async purge(queries: VariableStorageQuery[]): Promise<number> {
    return this._purgeOrQuery(queries, "purge");
  }

  async refresh(queries: VariableStorageQuery[]): Promise<number> {
    return this._purgeOrQuery(queries, "refresh");
  }

  async query(
    queries: VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult> {
    return this._purgeOrQuery(queries, "query", options);
  }

  private _checkDisposed() {
    if (this._disposed) {
      throw new Error("This storage has been disposed.");
    }
  }

  [Symbol.dispose](): void {
    this._disposed = true;
  }
}

import {
  extractKey,
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
import { distinct2, get2, group2, jsonClone, map2 } from "@tailjs/util";
import { VariableStorage, VariableStorageQuery } from "..";

const internalIdSymbol = Symbol();
type InMemoryVariable = Variable & {
  [internalIdSymbol]: number;
};

export interface InMemoryStorageSettings {
  ttl?: number;
}

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

  constructor({ ttl }: InMemoryStorageSettings = {}) {
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

    setTimeout(() => this._purgeExpired, Math.min(this._ttl, 10000));
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

  private _getVariable(key: VariableKey, now: number) {
    const [, , variables] =
      this._getVariables(key.scope, key.entityId!, now) ?? [];
    if (!variables) return undefined;

    let variable = variables.get(key.key);
    if (variable?.expires != null) {
      if (variable.expires! < now) {
        // Expired.
        variables.delete(key.key);
        variable = undefined;
      } else {
        variable.expires = now + variable.ttl!;
      }
    }

    return variable;
  }

  async get(keys: readonly VariableGetter[]): Promise<VariableGetResult[]> {
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
        });
        continue;
      }

      const result = {
        status: VariableResultStatus.Success,
        ...variable,
        value: jsonClone(variable.value),
      } as VariableGetResult;
      delete result[internalIdSymbol];

      results.push(result);
    }
    return Promise.resolve(results);
  }

  set(values: readonly VariableValueSetter[]): Promise<VariableSetResult[]> {
    this._checkDisposed();

    const results: VariableSetResult[] = [];
    const now = Date.now();

    for (const setter of values) {
      const key = extractKey(setter);
      let variable = this._getVariable(setter, now);
      if (!variable && (setter.value == null || setter.version != null)) {
        results.push({
          status: VariableResultStatus.NotFound,
          ...key,
        });
        continue;
      }

      if (!setter.force && variable && variable.version !== setter.version) {
        results.push({
          status: VariableResultStatus.Conflict,
          ...variable,
        });
        continue;
      }

      const [, , variables] = get2(
        (this._entities[key.scope] ??= new Map()),
        key.entityId,
        () => [now, this._nextInternalId++, new Map()]
      );

      if (setter.value == null) {
        variables.delete(setter.key);
        results.push({
          status: VariableResultStatus.Success,
          ...key,
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
          created: variable?.created ?? now,
          modified: now,
          ttl: setter.ttl,
          expires: setter.ttl != null ? now + setter.ttl : undefined,
          version: "" + this._nextVersion++,
          value: jsonClone(setter.value),
        })
      );

      const result = {
        ...variable,
        value: jsonClone(variable.value),
        status: created
          ? VariableResultStatus.Created
          : VariableResultStatus.Success,
      } as VariableSetResult;
      delete result[internalIdSymbol];

      results.push(result);
    }

    return Promise.resolve(results);
  }

  private _purgeOrQuery(
    queries: readonly VariableStorageQuery[],
    action: "query",
    options?: VariableQueryOptions
  ): VariableQueryResult;
  private _purgeOrQuery(
    queries: readonly VariableStorageQuery[],
    action: "purge" | "refresh"
  ): number;
  private _purgeOrQuery(
    queries: readonly VariableStorageQuery[],
    action: "purge" | "refresh" | "query",
    { page = 100, cursor }: VariableQueryOptions = {}
  ) {
    if (action === "query" && page <= 0) return { variables: [] };

    this._checkDisposed();

    const variables: Variable[] = [];
    const now = Date.now();
    let affected = 0;

    let [cursorScopeIndex = 0, cursorEntityId = -1, cursorVariableId = -1] =
      map2(cursor?.split("."), (value) => +value || 0) ?? [];

    let scopeIndex = 0;
    const scopes = group2(queries, (query) => [
      this._entities[query.scope],
      [query, query.entityIds && distinct2(query.entityIds)],
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

          const keyFilter = distinct2(query.keys?.values);
          const keyFilterMatch = query.keys && !query.keys.exclude;

          for (const [variableKey, variable] of entityVariables) {
            if (keyFilter?.has(variableKey) !== keyFilterMatch) {
              continue;
            }

            if (
              variable &&
              (action === "purge" || !(variable.expires! < now)) &&
              (!query.ifModifiedSince ||
                variable.modified > query.ifModifiedSince)
            ) {
              if (action === "purge") {
                if (entityVariables.delete(variableKey)) {
                  ++affected;
                }
              } else if (action === "refresh") {
                if (variable.ttl != null) {
                  variable.expires = now + variable.ttl;
                  ++affected;
                }
              } else {
                if (
                  internalEntityId === cursorEntityId &&
                  variable[internalIdSymbol] < cursorVariableId
                ) {
                  continue;
                }
                matchedVariables.add(variable);
              }
            }
          }
        }

        for (const variable of matchedVariables) {
          if (variables.length >= page) {
            return {
              variables,
              cursor: `${scopeIndex - 1}.${internalEntityId}.${
                variable[internalIdSymbol]
              }`,
            };
          }

          variables.push({
            ...variable,
            value: jsonClone(variable.value),
          });
        }
      }
      cursorEntityId = -1;
    }

    // We have enumerated all variables, we are done - no cursor.
    return action === "query" ? { variables } : affected;
  }

  async purge(queries: readonly VariableStorageQuery[]): Promise<number> {
    return this._purgeOrQuery(queries, "purge");
  }

  async renew(queries: readonly VariableStorageQuery[]): Promise<number> {
    return this._purgeOrQuery(queries, "refresh");
  }

  async query(
    queries: readonly VariableStorageQuery[],
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

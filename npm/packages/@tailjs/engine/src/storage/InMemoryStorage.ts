import {
  copyKey,
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
import { get2, jsonClone, map2, MAX_SAFE_INTEGER } from "@tailjs/util";
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

  private _getVariable(key: VariableKey, now: number, set?: Map<string, any>) {
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
      const key = copyKey(getter);
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
      const key = copyKey(setter);
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
    purge = false,
    { page = 100, cursor }: VariableQueryOptions = {}
  ): VariableQueryResult {
    this._checkDisposed();

    const variables: Variable[] | undefined = [];
    const now = Date.now();

    const cursorParts = map2(cursor?.split(","), (value) => +value) ?? [
      0, 0, 0,
    ];

    let queryIndex = 0;
    for (const query of queries) {
      if (++queryIndex <= cursorParts[0]) {
        continue;
      }

      for (const entityId of query.entityIds ??
        this._entities[query.scope]?.keys() ??
        []) {
        const [, internalEntityId = 0, entityVariables] =
          this._entities[query.scope]?.get(entityId) ?? [];
        if (
          !entityVariables ||
          (!purge && internalEntityId <= cursorParts[1])
        ) {
          continue;
        }

        for (const key of filterKeys(
          query.keys,
          entityVariables.keys(),
          (compiled) => (query.keys = compiled)
        )) {
          if (purge) {
            entityVariables.delete(key);
            continue;
          }
          const variable = entityVariables.get(key);

          if (
            variable &&
            !this._hasExpired(variable, now) &&
            (!query.ifModifiedSince ||
              variable.modified > query.ifModifiedSince)
          ) {
            if (!purge) {
              if (variable[internalIdSymbol] <= cursorParts[1]) {
                continue;
              }
              if (!page--) {
                // We have more results, but have reached the page limit.
                // Return the collected variables and the cursor state to get the next page.
                return { cursor: cursorParts.join(","), variables };
              }
            }
            cursorParts[1] = variable[internalIdSymbol];
            variables!.push({ ...variable, value: jsonClone(variable.value) });
          }
        }
        if (purge && !entityVariables.size) {
          this._entities[query.scope]?.delete(entityId);
        }
        cursorParts[1] = internalEntityId!;
        cursorParts[2] = 0;
      }
      cursorParts[0] = queryIndex;
      cursorParts[1] = 0;
    }

    // We have enumerated all variables, we are done - no cursor.
    return { variables };
  }

  async purge(queries: VariableStorageQuery[]): Promise<void> {
    this._purgeOrQuery(queries, true);
  }

  async query(
    queries: VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult> {
    return this._purgeOrQuery(queries, false, options);
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

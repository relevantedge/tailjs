import {
  copyKey,
  filterKeys,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableResultStatus,
  VariableSetResult,
  VariableValueSetter,
} from "@tailjs/types";
import { jsonClone } from "@tailjs/util";
import { VariableStorage, VariableStorageQuery } from "..";

type InMemoryVariable = Variable & { accessed: number };

export class InMemoryStorage implements VariableStorage, Disposable {
  private _nextVersion: number = 1;
  private _disposed = false;

  private readonly _entities: {
    [Scope in string]: Map<
      string,
      [lastAccessed: number, variables: Map<string, InMemoryVariable>]
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
    const variables = this._getVariables(key.scope, key.entityId!, now);
    if (!variables) return undefined;

    let variable = variables[1].get(key.key);
    if (this._hasExpired(variable, now)) {
      // Expired.
      variables[1].delete(key.key);
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

      let variables = (this._entities[key.scope] ??= new Map()).get(
        key.entityId
      );
      if (!variables) {
        this._entities[key.scope].set(
          key.entityId,
          (variables = [now, new Map()])
        );
      }

      if (setter.value === null) {
        variables[1].delete(setter.key);
        results.push({
          status: VariableResultStatus.Success,
          ...key,
          value: null,
        });
        if (!variables[1].size) {
          this._entities[key.scope].delete(key.entityId);
        }

        continue;
      }

      const created = !variable;
      variables[1].set(
        setter.key,
        (variable = {
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

  private _purgeOrQuery(queries: VariableStorageQuery[], purge = false): any {
    this._checkDisposed();

    const results: Variable[] | undefined = purge ? undefined : [];
    const now = Date.now();

    for (const query of queries) {
      const variables = this._entities[query.scope]?.get(query.entityId!);
      if (!variables) {
        continue;
      }

      for (const key of filterKeys(
        query.keys,
        variables[1].keys(),
        (compiled) => (query.keys = compiled)
      )) {
        if (purge) {
          variables[1].delete(key);
          continue;
        }
        const variable = variables[1].get(key);

        if (variable && !this._hasExpired(variable, now)) {
          results!.push({ ...variable, value: jsonClone(variable.value) });
        }
      }
      if (!variables[1].size) {
        this._entities[query.scope]?.delete(query.entityId!);
      }
    }
    return Promise.resolve(results);
  }

  purge(queries: VariableStorageQuery[]): Promise<void> {
    return this._purgeOrQuery(queries, true);
  }

  query(queries: VariableStorageQuery[]): Promise<Variable[]> {
    return this._purgeOrQuery(queries, false);
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

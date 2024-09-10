import {
  copyKey,
  filterKeys,
  Variable,
  VariableQuery,
  VariableStatus,
} from "@tailjs/types";
import { jsonClone } from "@tailjs/util";
import {
  VariableStorage,
  VariableStorageGetResult,
  VariableStorageGetter,
  VariableStorageKey,
  VariableStorageSetResult,
  VariableStorageSetter,
  VariableStorageVariable,
} from ".";

export class InMemoryStorage implements VariableStorage, Disposable {
  private _nextVersion: number = 1;
  private _disposed = false;

  private readonly _entities: Map<
    string,
    [
      lastAccessed: number,
      variables: Map<string, VariableStorageVariable & { accessed: number }>
    ]
  > = new Map();
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

    this._entities.forEach(
      (value, key) => value[0] + this._ttl! < now && expiredEntities.push(key)
    );

    for (const key of expiredEntities) {
      this._entities.delete(key);
    }

    setTimeout(() => this._purgeExpired, 10000);
  }

  private _getVariables(entityId: string, now: number) {
    let variables = this._entities.get(entityId);
    if (variables) {
      if (this._ttl && variables[0] + this._ttl < now) {
        // Expired but not yet cleaned by background thread.
        this._entities.delete(entityId);
        variables = undefined;
      } else {
        variables[0] = Date.now();
      }
    }

    return variables;
  }

  private _hasExpired(
    variable: (VariableStorageVariable & { accessed: number }) | undefined,
    now: number
  ) {
    return variable?.ttl != null && variable.accessed + variable.ttl < now;
  }

  private _getVariable(
    key: VariableStorageKey,
    now: number,
    set?: Map<string, any>
  ) {
    const variables = this._getVariables(key.entityId!, now);
    if (!variables) return undefined;

    let variable = variables[1].get(key.key);
    if (this._hasExpired(variable, now)) {
      // Expired.
      variables[1].delete(key.key);
      variable = undefined;
    }

    return variable;
  }

  async get(
    keys: VariableStorageGetter[]
  ): Promise<VariableStorageGetResult[]> {
    this._checkDisposed();

    const results: VariableStorageGetResult[] = [];
    const now = Date.now();

    for (const getter of keys) {
      const key = copyKey(getter);
      const variable = this._getVariable(getter, now);
      if (!variable) {
        results.push({ status: VariableStatus.NotFound, ...key });
        continue;
      }

      if (
        (getter.ifModifiedSince != null &&
          variable.modified <= getter.ifModifiedSince) ||
        (getter.ifNoneMatch != null && variable.version === getter.ifNoneMatch)
      ) {
        results.push({ status: VariableStatus.NotModified, ...key });
        continue;
      }

      results.push({
        status: VariableStatus.Success,
        ...variable,
        value: jsonClone(variable.value),
      });
    }
    return Promise.resolve(results);
  }

  set(values: VariableStorageSetter[]): Promise<VariableStorageSetResult[]> {
    this._checkDisposed();

    const results: VariableStorageSetResult[] = [];
    const now = Date.now();

    for (const setter of values) {
      const key = copyKey(setter);
      let variable = this._getVariable(setter, now);
      if (!setter.force && variable?.version !== setter.version) {
        results.push({
          status: VariableStatus.Conflict,
          ...key,
          current: null,
        });
        continue;
      }

      if (!variable && setter.value == null) {
        results.push({ status: VariableStatus.NotModified, ...key });
        continue;
      }

      let variables = this._entities.get(key.entityId);
      if (!variables) {
        this._entities.set(key.entityId, (variables = [now, new Map()]));
      }

      if (setter.value == null) {
        variables[1].delete(setter.key);
        results.push({
          status: VariableStatus.Success,
          ...key,
          value: null,
        });
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
        status: created ? VariableStatus.Created : VariableStatus.Success,
      });
    }

    return Promise.resolve(results);
  }

  private _purgeOrQuery(queries: VariableQuery[], purge = false): any {
    this._checkDisposed();

    const results: VariableStorageVariable[] | undefined = purge
      ? undefined
      : [];
    const now = Date.now();

    for (const query of queries) {
      const variables = this._entities.get(query.entityId!);
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
        this._entities.delete(query.entityId!);
      }
    }
    return Promise.resolve(results);
  }

  purge(queries: VariableQuery[]): Promise<void> {
    return this._purgeOrQuery(queries, true);
  }

  query(queries: VariableQuery[]): Promise<Variable[]> {
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

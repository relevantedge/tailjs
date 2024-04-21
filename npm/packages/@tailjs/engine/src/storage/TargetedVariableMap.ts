import { VariableKey, VariableScopeValue } from "@tailjs/types";
import { isDefined, isIterable, isString, isUndefined } from "@tailjs/util";
import { VariableMap, mapKey } from "..";

export interface ReadOnlyTargetedVariableMap<T = any>
  extends Iterable<readonly [VariableKey, T]> {
  readonly size: number;

  get<
    K extends VariableKey<boolean> | undefined,
    R extends T | undefined = T | undefined
  >(
    key: K,
    init?: (key: VariableKey<true>) => R
  ): R;
  get(target: string): VariableMap<T>;

  has(targetId: string, scope?: VariableScopeValue): boolean;
  has(key: VariableKey<boolean> | undefined): boolean;

  targets<Keys extends boolean = false>(
    keys?: Keys
  ): Iterable<
    Keys extends true
      ? string[]
      : readonly [targetId: string, values: VariableMap]
  >;
}

export class TargetedVariableCollection<T = any>
  implements ReadOnlyTargetedVariableMap<T>
{
  private _scopes = new Map<string, VariableMap<T>>();

  private _size: number = 0;
  public get size() {
    return this._size;
  }

  private _updateSize = (delta: number) => {
    this._size += delta;
  };

  constructor(
    values?: Iterable<
      readonly [key: VariableKey<boolean>, value: T] | undefined
    >
  ) {
    if (values) {
      this.set(values);
    }
  }

  public get<
    K extends VariableKey<boolean> | undefined,
    R extends T | undefined = T | undefined
  >(key: K, init?: (key: VariableKey<true>) => R): R;
  public get(target: string): VariableMap<T>;
  public get(
    key: string | VariableKey<boolean> | undefined,
    init?: (key: VariableKey<true>) => any
  ) {
    if (isUndefined(key)) return undefined;

    if (isString(key)) {
      return this._scopes.get(key);
    }

    let targetId = key.targetId ?? "";
    let collection = this._scopes.get(targetId);
    if (init && !collection) {
      this._scopes.set(
        targetId,
        (collection = new VariableMap(this._updateSize))
      );
    }
    return collection?.get(
      key,
      init && ((scope, key) => init(mapKey(scope, key, targetId)))
    );
  }

  public has(targetId: string, scope?: VariableScopeValue): boolean;
  public has(key: VariableKey<boolean> | undefined): boolean;
  public has(
    source: string | VariableKey<boolean> | undefined,
    scope?: VariableScopeValue
  ) {
    if (isUndefined(source)) return undefined;
    if (isString(source)) {
      return isDefined(scope)
        ? this._scopes.get(source)?.has(scope) ?? false
        : this._scopes.has(source);
    }

    return this._scopes.get(source.targetId ?? "")?.has(source) ?? false;
  }

  public clear(): this {
    this._updateSize(-this._size);
    this._scopes.clear();
    return this;
  }

  public delete(targetId: string): boolean;
  public delete(key: VariableKey<boolean> | undefined): boolean;
  public delete(
    keys: Iterable<readonly [key: VariableKey<boolean>, value: T] | undefined>
  ): boolean;
  public delete(
    key: Iterable<any> | string | VariableKey<boolean> | undefined
  ) {
    if (isUndefined(key)) return false;
    if (isIterable(key)) {
      let deleted = false;
      for (const item of key) {
        isDefined(item) && (deleted = this.delete(item) || deleted);
      }
      return deleted;
    }

    if (isString(key)) {
      const scopes = this._scopes.get(key);
      if (!scopes) {
        return false;
      }
      this._updateSize(-scopes.size);
      this._scopes.delete(key);
      return true;
    }
    return this._scopes.get(key.targetId ?? "")?.delete(key) ?? false;
  }

  public set(
    values: Iterable<
      readonly [key: VariableKey<boolean>, value: T | undefined] | undefined
    >
  ): this;
  public set(key: VariableKey<boolean> | undefined, value: T | undefined): this;
  public set(
    key: Iterable<any> | VariableKey<boolean> | undefined,
    value?: T | undefined
  ): this {
    if (isUndefined(key)) return this;
    if (isIterable(key)) {
      for (const item of key) {
        item && this.set(item[0], item[1]);
      }
      return this;
    }

    if (isUndefined(value)) {
      this.delete(key);
      return this;
    }

    const targetId = key.targetId ?? "";
    let scopes = this._scopes.get(targetId);
    if (!this._scopes.has(targetId)) {
      this._scopes.set(targetId, (scopes = new VariableMap(this._updateSize)));
    }
    scopes?.set(key, value);
    return this;
  }

  public update<R extends T | undefined>(
    key: VariableKey<boolean> | undefined,
    update: (current: T | undefined) => R
  ): R extends undefined ? undefined : T {
    if (!key) return undefined as any;
    let newValue = update(this.get(key));
    this.set(key, newValue);

    return newValue as any;
  }

  public targets<Keys extends boolean = false>(
    keys?: Keys
  ): Iterable<
    Keys extends true
      ? string[]
      : readonly [targetId: string, values: VariableMap]
  > {
    return keys ? this._scopes.keys() : (this._scopes.entries() as any);
  }

  *[Symbol.iterator]() {
    for (const [targetId, scopes] of this._scopes) {
      for (const [[scope, key], value] of scopes) {
        yield [mapKey(scope, key, targetId), value] as const;
      }
    }
  }
}

import {
  VariableKey,
  VariableScope,
  VariableScopeValue,
  variableScope,
} from "@tailjs/types";
import {
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isObject,
  isUndefined,
} from "@tailjs/util";

type ScopeKey =
  | VariableKey<boolean>
  | readonly [scope: VariableScopeValue, key: string];

export const mapKey = (
  scope: VariableScope,
  key: string,
  targetId: string | undefined
) =>
  scope === VariableScope.Global ? { scope, key } : { scope, key, targetId };

export class VariableMap<T = any>
  implements Iterable<readonly [readonly [VariableScope, string], T]>
{
  private readonly _values = new Map<VariableScope, Map<string, T>>();
  private readonly _onSizeChanged: ((delta: number) => void) | undefined;

  constructor(keys?: Iterable<readonly [key: ScopeKey, value: T] | undefined>);
  /** @internal */
  constructor(onSizeChanged?: (delta: number) => void);
  constructor(arg?: Iterable<any> | ((delta: number) => void)) {
    if (isFunction(arg)) {
      this._onSizeChanged = arg;
    } else if (arg) {
      this.set(arg);
    }
  }

  private _size: number = 0;
  public get size() {
    return this._size;
  }

  private _updateSize(delta: number) {
    this._size += delta;
    this._onSizeChanged?.(delta);
  }

  public get<
    K extends VariableKey<boolean> | null | undefined,
    R extends T | undefined = T | undefined
  >(
    key: K,
    init?: (scope: VariableScope, key: string) => R
  ): K extends undefined | null ? undefined : R;
  public get<
    S extends VariableScopeValue | undefined | null,
    R extends T | undefined = T | undefined
  >(
    scope: S,
    key: string,
    init?: (scope: VariableScope, key: string) => R
  ): S extends undefined | null ? undefined : R;
  public get(
    scope: VariableScopeValue | null | undefined
  ): Iterable<readonly [string, T]> | undefined;

  public get(
    source: VariableScopeValue | VariableKey<boolean> | null | undefined,
    arg2?: string | ((scope: VariableScope, key: string) => any),
    init?: (scope: VariableScope, key: string) => any
  ) {
    if (source == null) return undefined;
    let scope: VariableScope, key: string;
    if (isObject(source, true)) {
      scope = variableScope.parse(source.scope, false);
      key = source.key;
      init = arg2 as any;
    } else {
      scope = variableScope.parse(source, false);
      key = arg2 as any;
    }

    let values = this._values.get(scope);
    if (isDefined(key)) {
      let value = values?.get(key);
      if (init && isUndefined(value)) {
        if (!values) {
          this._values.set(scope, (values = new Map()));
        }

        this._updateSize(1);
        values.set(key, (value = init(scope, key)));
      }
      return value;
    }

    return values as Iterable<readonly [string, T]>;
  }

  public has(
    scope: VariableScopeValue | null | undefined,
    key?: string
  ): boolean;
  public has(key: VariableKey<boolean> | null | undefined): boolean;
  public has(
    source: VariableKey<boolean> | VariableScopeValue | undefined | null,
    key?: string
  ) {
    if (source == null) return undefined;

    if (isObject(source, true)) {
      return (
        this._values
          .get(variableScope.parse(source.scope, false))
          ?.has(source.key) ?? false
      );
    }

    const scope = variableScope.parse(source, false);
    return isDefined(key)
      ? this._values.get(scope)?.has(key) ?? false
      : this._values.has(scope);
  }

  public clear(): this {
    this._updateSize(-this._size);
    this._values?.clear();
    return this;
  }

  public delete(scope: VariableScopeValue | null | undefined): boolean;
  public delete(
    scope: VariableScopeValue | null | undefined,
    key: string
  ): boolean;
  public delete(key: VariableKey<boolean> | null | undefined): boolean;
  public delete(values: Iterable<ScopeKey | null | undefined>): boolean;
  public delete(
    arg1:
      | VariableScopeValue
      | VariableKey<boolean>
      | Iterable<any>
      | null
      | undefined,
    arg2?: string
  ) {
    if (arg1 == null) return false;

    let scope: VariableScope, key: string | undefined;

    if (isObject(arg1, true)) {
      if (isIterable(arg1)) {
        let deleted = false;
        for (const key of arg1) {
          if (!key) continue;
          deleted =
            (isIterable(key)
              ? this.delete(key[0], key[1])
              : this.delete(key)) || deleted;
        }
        return deleted;
      }
      scope = variableScope.parse(arg1.scope, false);
      key = arg1.key;
    } else {
      scope = variableScope.parse(arg1, false);
      key = arg2;
    }

    const values = this._values.get(scope);
    if (!values) return false;

    if (isDefined(key)) {
      if (!values.has(key)) return false;
      this._updateSize(-1);

      values.delete(key);
      if (values.size) return true;
      // If no more keys, delete the scope.
    }

    this._updateSize(-values.size);
    this._values.delete(scope);
    return true;
  }

  public set(
    scope: VariableScopeValue | undefined | null,
    key: string,
    value: T | undefined
  ): this;
  public set(
    key: VariableKey<boolean> | undefined | null,
    value: T | undefined
  ): this;
  public set(
    values: Iterable<readonly [key: ScopeKey, value: T | undefined] | undefined>
  ): this;
  public set(
    arg1:
      | VariableScopeValue
      | VariableKey<boolean>
      | Iterable<any>
      | undefined
      | null,
    arg2?: string | T | undefined,
    arg3?: T | undefined
  ): this {
    if (arg1 == null) return this;

    let scope: VariableScope, key: string | undefined, value: any;

    if (isObject(arg1, true)) {
      if (isIterable(arg1)) {
        for (const item of arg1) {
          if (!item) continue;
          const [key, value] = item;
          isIterable(key)
            ? this.set(key[0], key[1], value)
            : this.set(key, value);
        }
        return this;
      }
      scope = variableScope.parse(arg1.scope, true);
      key = arg1.key;
      value = arg2;
    } else {
      scope = variableScope.parse(arg1, true);
      key = arg2 as string;
      value = arg3;
    }

    if (isUndefined(value)) {
      this.delete(scope, key);
      return this;
    }

    let values = this._values.get(scope);
    if (!values) {
      this._values.set(scope, (values = new Map()));
    }
    if (!values.has(key)) {
      this._updateSize(1);
    }
    values.set(key, value);
    return this;
  }

  public update<
    S extends VariableScopeValue | undefined | null,
    R extends T | undefined
  >(
    scope: S,
    key: string,
    update: (current: T | undefined) => R
  ): T extends undefined | null ? undefined : R;
  public update<
    K extends VariableKey<boolean> | undefined,
    R extends T | undefined
  >(
    key: K,
    update: (current: T | undefined) => R
  ): T extends undefined ? undefined : R;
  public update(
    arg1: VariableKey<boolean> | VariableScopeValue | undefined | null,
    arg2: string | ((current: T | undefined) => any),
    update?: (current: T | undefined) => any
  ): T | undefined {
    if (arg1 == null) return undefined;
    let scope: VariableScope, key: string;
    if (isObject(arg1, true)) {
      scope = variableScope.parse(arg1.scope);
      key = arg1.key;
      update = arg2 as any;
    } else {
      scope = variableScope.parse(arg1);
      key = arg2 as any;
    }

    let newValue = update!(this.get(scope, key));
    this.set(scope, key, newValue);

    return newValue as any;
  }

  public scopes<Keys extends boolean = false>(
    keys?: Keys
  ): Iterable<
    Keys extends true
      ? VariableScope[]
      : readonly [scope: VariableScope, values: Map<string, T>]
  > {
    return keys ? this._values.keys() : (this._values.entries() as any);
  }

  *[Symbol.iterator]() {
    for (const [scope, values] of this._values) {
      for (const [key, value] of values) {
        yield [[scope, key], value] as const;
      }
    }
  }
}

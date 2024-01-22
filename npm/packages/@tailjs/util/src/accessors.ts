import {
  KeyValuePairsToObject,
  NotFunction,
  flatForEach,
  forEach,
  hasMethod,
  isArray,
  isDefined,
  isFunction,
  isObject,
  isUndefined,
} from ".";

// #region Shared types
type MapLike<K = any, V = any> = {
  has?(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): any;
  delete(key: K): any;
};

type SetLike<K = any> = {
  has?(key: K): boolean;
  add(key: K): any;
  delete(key: K): any;
};

type PropertyContainer =
  | {
      [P in keyof any]: any;
    }
  | MapLike
  | SetLike;

type _KeyType<T extends PropertyContainer> = T extends MapLike<infer K, any>
  ? K
  : T extends SetLike<infer K>
  ? K
  : T extends any[]
  ? number
  : keyof any;

export type KeyType<T extends PropertyContainer> = T extends MapLike | SetLike
  ? _KeyType<T>
  : _KeyType<T> | keyof T;

export type ValueType<
  T extends PropertyContainer,
  K = KeyType<T>,
  IncludeDefault = false
> = T extends {
  [P in keyof any]: any;
}
  ?
      | (T extends MapLike<any, infer V>
          ? V
          : T extends SetLike
          ? boolean
          : K extends keyof T
          ? T[K]
          : any)
      | (IncludeDefault extends true
          ? T extends SetLike
            ? never
            : undefined
          : never)
  : never;

// #endregion

// #region get

export const get = <T extends PropertyContainer, K extends KeyType<T>>(
  target: T,
  key: K
): ValueType<T, K, true> => {
  return hasMethod(target, "get")
    ? target.get(key)
    : hasMethod(target, "has")
    ? target.has(key)
    : (target as any)[key];
};

// #endregion

// #region set and update

type UpdateFunction<C, R = C> = (current: C) => R | undefined;

type Updater<
  T extends PropertyContainer,
  K = KeyType<T>,
  SettersOnly = false
> = T extends MapLike | SetLike
  ?
      | ValueType<T>
      | (SettersOnly extends true
          ? never
          : UpdateFunction<ValueType<T> | undefined>)
  : SettersOnly extends true
  ? any
  : NotFunction | UpdateFunction<K extends keyof T ? T[K] : any, any>;

type UpdaterType<T, SettersOnly = false> = SettersOnly extends true
  ? T
  : T extends (...args: any) => infer T
  ? T
  : T;

type PropertiesToTuples<T, SettersOnly = false> = keyof T extends infer K
  ? K extends keyof T
    ? [K, UpdaterType<T[K], SettersOnly>]
    : never
  : never;

type MergeUpdates<
  Source,
  Updates,
  SettersOnly = false,
  Unwrapped = KeyValuePairsToObject<UnwrapBulkUpdates<Updates, SettersOnly>>
> = Source extends MapLike | SetLike
  ? Source
  : Source & Unwrapped extends {
      [P in infer K]: any;
    }
  ? {
      [P in K as P extends keyof Unwrapped
        ? Unwrapped[P] extends never | undefined | void
          ? never
          : P
        : P extends keyof Source
        ? P
        : never]: P extends keyof Unwrapped
        ? Unwrapped[P]
        : P extends keyof Source
        ? Source[P]
        : never;
    }
  : never;

type UnwrapBulkUpdates<T, SettersOnly = false> = T extends any[]
  ? T extends [[infer K, infer V]]
    ? [K, UpdaterType<V, SettersOnly>]
    : T extends [[infer K, infer V], ...infer Rest]
    ? [K, UpdaterType<V, SettersOnly>] | UnwrapBulkUpdates<Rest>
    : T extends Iterable<[infer K, infer V]>
    ? [K, UpdaterType<V, SettersOnly>]
    : never
  : PropertiesToTuples<T>;

type BulkUpdate<T extends PropertyContainer, SettersOnly = false> =
  | Iterable<
      KeyType<T> extends infer K ? [K, Updater<T, K, SettersOnly>] : never
    >
  | {
      [P in KeyType<T>]: Updater<T, P, SettersOnly>;
    };

type SetOrUpdateFunction<SettersOnly> = {
  <
    T extends PropertyContainer,
    K extends KeyType<T>,
    U extends Updater<T, K, SettersOnly>
  >(
    target: T,
    key: K,
    value: U
  ): boolean;
  <
    T extends PropertyContainer,
    Values extends {
      [P in KeyType<T>]: Updater<T, P, SettersOnly>;
    }
  >(
    target: T,
    values: Values
  ): MergeUpdates<T, Values, SettersOnly>;
  <T extends PropertyContainer, Values extends BulkUpdate<T>[]>(
    target: T,
    values: Values
  ): MergeUpdates<T, Values[number], SettersOnly>;
};

const createSetOrUpdateFunction =
  <B extends boolean>(settersOnly: B): SetOrUpdateFunction<B> =>
  (target: PropertyContainer, ...args: any[]) => {
    const setSingle = (key: any, value: any, diff: boolean) => {
      if (!settersOnly && isFunction(value)) {
        value = value(get(target, key));
      }

      if (isUndefined(value)) {
        return remove(target, key);
      }

      if (!diff || get(target, key) !== value) {
        hasMethod(target, "set")
          ? target.set(key, value)
          : hasMethod(target, "add")
          ? value
            ? target.add(key)
            : target.delete(key)
          : (target[key] = value);
        return diff ? true : target;
      }
      return diff ? false : target;
    };

    let [key, value] = args;

    if (args.length === 1) {
      flatForEach(isObject(key) ? [key] : key, ([key, value]) =>
        setSingle(key, value, true)
      );
      return target;
    }
    return setSingle(key, value, true);
  };

export const set = createSetOrUpdateFunction(true);
export const update = createSetOrUpdateFunction(false);

// #endregion

export const has = <T extends PropertyContainer>(target: T, key: KeyType<T>) =>
  hasMethod(target, "has")
    ? target.has(key)
    : isDefined((target as any).get?.(key) ?? (target as any)[key]);

export const remove: {
  <T extends PropertyContainer>(target: T, key: KeyType<T>): ValueType<T, true>;
  <T extends PropertyContainer>(target: T, ...keys: KeyType<T>[]): ValueType<
    T,
    true
  >[];
} = (target: PropertyContainer, ...keys: any[]) => {
  if (keys.length > 1) {
    return keys.map((key) => remove(target, key));
  }
  const key = keys[0];
  const oldValue = get(target, key);

  hasMethod(target, "delete")
    ? target.delete(key)
    : isArray(target)
    ? target.splice(key, 1)
    : delete target[key];

  return oldValue;
};

import {
  KeyValuePairsToObject,
  NotFunction,
  PrettifyIntersection,
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

type PropertyContainer<K extends any = any, V extends any = any> =
  | {
      [P in keyof K]: V;
    }
  | MapLike<K, V>
  | SetLike<K>;

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
  key: K,
  initializer?: Updater<T, K, false, true>
): ValueType<T, K, true> => {
  let value = hasMethod(target, "get")
    ? target.get(key)
    : hasMethod(target, "has")
    ? target.has(key)
    : (target as any)[key];
  if (!isDefined(value) && isDefined(initializer)) {
    isDefined(
      (value = isFunction(initializer) ? initializer() : initializer)
    ) && set(target, key, value);
  }
  return value;
};

// #endregion

// #region set and update

type UpdateFunction<C, R = C, Factory = false> = (
  ...args: Factory extends true ? [] : [current: C]
) => R | undefined;

type Updater<
  T extends PropertyContainer,
  K = KeyType<T>,
  SettersOnly = false,
  Factory = false
> = T extends MapLike | SetLike
  ?
      | ValueType<T>
      | (SettersOnly extends true
          ? never
          : UpdateFunction<
              ValueType<T> | undefined,
              ValueType<T> | undefined,
              Factory
            >)
  : SettersOnly extends true
  ? any
  : NotFunction | UpdateFunction<K extends keyof T ? T[K] : any, any, Factory>;

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

type UnwrapBulkUpdates<T, SettersOnly = false> = T extends (infer T)[]
  ? T extends [infer K, infer V]
    ? [K, UpdaterType<V, SettersOnly>]
    : PropertiesToTuples<T, SettersOnly>
  : PropertiesToTuples<T>;

type BulkUpdateObject<
  T extends PropertyContainer,
  SettersOnly = false,
  Factory = false
> = {
  [P in
    | KeyType<T>
    | (T extends MapLike | SetLike ? never : keyof T)]: P extends keyof T
    ? Updater<T, P, SettersOnly, Factory>
    : Updater<T, P, SettersOnly, Factory>;
};
type BulkUpdateKeyValue<
  T extends PropertyContainer,
  SettersOnly = false,
  Factory = false
> = [KeyType<T>, Updater<T, KeyType<T>, SettersOnly, Factory>];

type BulkUpdates<
  T extends PropertyContainer,
  SettersOnly = false,
  Factory = false
> =
  | BulkUpdateObject<T, SettersOnly, Factory>
  | Iterable<
      | BulkUpdateKeyValue<T, SettersOnly, Factory>
      | BulkUpdateObject<T, SettersOnly, Factory>
    >;

type SetOrUpdateFunction<SettersOnly> = {
  <
    T extends PropertyContainer,
    K extends KeyType<T>,
    U extends Updater<T, K, SettersOnly>
  >(
    target: T,
    key: K,
    value: U
  ): UpdaterType<U, SettersOnly>;
  <T extends PropertyContainer, Values extends BulkUpdates<T, SettersOnly>>(
    target: T,
    values: Values
  ): MergeUpdates<T, Values, SettersOnly>;
};

() => {
  update({ a: 32 }, { a: (current) => current + 2 });
};

const createSetOrUpdateFunction =
  <B extends boolean>(settersOnly: B): SetOrUpdateFunction<B> =>
  (target: PropertyContainer, ...args: any[]) => {
    let bulk: boolean;
    let [key, value] = args;
    const setSingle = ([key, value]: [any, any]) => {
      if (!settersOnly && isFunction(value)) {
        value = value(get(target, key));
      }

      if (isUndefined(value)) {
        return clear(target, key);
      }

      if (bulk || get(target, key) !== value) {
        hasMethod(target, "set")
          ? target.set(key, value)
          : hasMethod(target, "add")
          ? value
            ? target.add(key)
            : target.delete(key)
          : (target[key] = value);
      }

      return value;
    };

    if ((bulk = args.length === 1)) {
      // Fast path
      if (settersOnly) {
        if (isArray(key) && key.every((item) => isObject(item))) {
          key = Object.assign({}, ...key);
        }
        if (isObject(key)) {
          Object.assign(target, key);
          Object.entries(key).forEach(
            ([k, v]) => !isDefined(v) && delete target[k]
          );
          return target;
        }
      }
      if (isObject(key)) {
        forEach(key, setSingle);
      } else {
        forEach(key, (item) =>
          isObject(item) ? forEach(item, setSingle) : setSingle(item)
        );
      }
      return target;
    }
    return setSingle([key, value]);
  };

export const set = createSetOrUpdateFunction(true);
export const update = createSetOrUpdateFunction(false);

// #endregion

export const add = <T extends PropertyContainer<any, boolean>>(
  target: T,
  key: KeyType<T>
) => get(target, key) !== set(target, key, true as any);

export const has = <T extends PropertyContainer>(target: T, key: KeyType<T>) =>
  hasMethod(target, "has")
    ? target.has(key)
    : isDefined((target as any).get?.(key) ?? (target as any)[key]);

export const clear: {
  <T extends PropertyContainer>(target: T, key: KeyType<T>): ValueType<T, true>;
  <T extends PropertyContainer>(target: T, ...keys: KeyType<T>[]): ValueType<
    T,
    true
  >[];
} = (target: PropertyContainer, key: any, ...keys: any[]) => {
  if (keys.length) {
    return keys.map((key) => clear(target, key));
  }

  const current = get(target, key);
  hasMethod(target, "delete")
    ? target.delete(key)
    : isArray(target)
    ? target.splice(key, 1)
    : delete target[key];

  return current;
};

import {
  ConstToTuples,
  GeneralizeContstants,
  IsAny,
  NotFunction,
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

export type KeyType<T extends PropertyContainer | null | undefined> = T extends
  | null
  | undefined
  ? never
  : T extends MapLike<infer K, any>
  ? K
  : T extends SetLike<infer K>
  ? K
  : T extends any[]
  ? number
  : keyof T;

export type ValueType<
  T extends PropertyContainer | null | undefined,
  K,
  Default = never
> = IsAny<T> extends true
  ? any
  : T extends null | undefined
  ? never
  : T extends MapLike<any, infer V>
  ? V | Default
  : T extends SetLike
  ? boolean | Default
  : T extends (infer T)[]
  ? T | Default
  : K extends keyof T
  ? T[K] | Default
  : any;

// #endregion

// #region get

export const get = <
  T extends PropertyContainer | null | undefined,
  K extends KeyType<T>,
  R extends ValueType<T, K>
>(
  target: T,
  key: K | undefined,
  initializer?: () => R | Readonly<R>
): T extends null | undefined ? undefined : R => {
  if (!target || !isDefined(key)) return undefined as any;

  let value = hasMethod(target, "get")
    ? target.get(key)
    : hasMethod(target, "has")
    ? target.has(key)
    : (target as any)[key];
  if (!isDefined(value) && isDefined(initializer)) {
    isDefined(
      (value = isFunction(initializer) ? (initializer as any)() : initializer)
    ) && set(target, key, value);
  }
  return value;
};

// #endregion

// #region set and update

type UpdateFunction<
  T extends PropertyContainer,
  Key,
  Current,
  Factory
> = Factory extends false
  ? (
      current: Current,
      key: Key,
      target: T
    ) => GeneralizeContstants<ValueType<T, Key>> | undefined
  : (key: Key, target: T) => GeneralizeContstants<ValueType<T, Key>>;

type Updater<
  T extends PropertyContainer,
  Key,
  Current = ValueType<T, Key>,
  SettersOnly = false,
  Factory = false
> = SettersOnly extends true
  ? ValueType<T, Key, Factory extends true ? never : undefined>
  : IsAny<T> extends true
  ? NotFunction | UpdateFunction<any, any, any, Factory>
  :
      | (ValueType<T, Key> extends Function
          ? never
          : ValueType<T, Key, Factory extends true ? never : undefined>)
      | UpdateFunction<T, Key, Current, Factory>;

type UpdaterType<T, SettersOnly = false> = SettersOnly extends true
  ? T
  : T extends (...args: any) => infer T
  ? T
  : T;

type PropertiesToTuples<T, SettersOnly = false, K = keyof T> = K extends any
  ? [K, UpdaterType<T, SettersOnly>]
  : never;

type BulkUpdateObject<
  T extends PropertyContainer,
  SettersOnly = false,
  Factory = false
> = T extends MapLike | SetLike | any[]
  ? {
      [P in KeyType<T>]: Updater<T, P, ValueType<T, P>, SettersOnly, Factory>;
    }
  : { [P in keyof T & KeyType<T>]?: Updater<T, P, T[P], SettersOnly, Factory> };

type BulkUpdateKeyValue<
  T extends PropertyContainer,
  SettersOnly = false,
  Factory = false,
  K extends keyof T = keyof T
> = IsAny<T> extends true
  ? [any, Updater<T, any, any, SettersOnly, Factory>]
  : T extends MapLike | SetLike | any[]
  ? [
      KeyType<T>,
      Updater<T, KeyType<T>, ValueType<T, KeyType<T>>, SettersOnly, Factory>
    ]
  : K extends any
  ? [K, Updater<T, KeyType<T>, any, SettersOnly, Factory>]
  : never;

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
    T extends PropertyContainer | null | undefined,
    U extends Updater<
      T extends null | undefined ? never : T,
      K,
      ValueType<T, K>,
      SettersOnly
    >,
    K extends KeyType<T>
  >(
    target: T,
    key: K,
    value: U
  ): UpdaterType<U>;
  <T extends PropertyContainer | null | undefined>(
    target: T,
    values: BulkUpdates<T extends null | undefined ? never : T, SettersOnly>
  ): T;
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
        return remove(target, key);
      }

      if (bulk || get(target, key) !== value) {
        hasMethod(target, "set")
          ? target.set(key, value)
          : hasMethod(target, "add")
          ? value
            ? target.add(key)
            : target.delete(key)
          : (target![key] = value);
      }

      return value;
    };

    if (!target) return target;

    if ((bulk = args.length === 1)) {
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

export const remove: {
  <T extends PropertyContainer | null | undefined>(
    target: T,
    key: KeyType<T> | undefined
  ): T extends null | undefined ? T : ValueType<T, KeyType<T>, undefined>;
  <T extends PropertyContainer | null | undefined>(
    target: T,
    ...keys: (KeyType<T> | undefined)[]
  ): (T extends null | undefined ? T : ValueType<T, KeyType<T>, undefined>)[];
} = (target: PropertyContainer, key: any, ...keys: any[]) => {
  if (!target) return undefined;
  const current = get(target, key);
  isDefined(key) && hasMethod(target, "delete")
    ? target.delete(key)
    : isArray(target)
    ? target.splice(key, 1)
    : delete target[key];

  if (keys.length) {
    return keys.map((key) => remove(target, key));
  }

  return current;
};

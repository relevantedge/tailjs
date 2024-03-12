import {
  ConstToNormal,
  GeneralizeContstants,
  IsAny,
  Minus,
  NotFunction,
  count,
  forEach,
  hasMethod,
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isObject,
  isUndefined,
  some,
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
  K = KeyType<T>,
  Default = never
> = IsAny<T> extends true
  ? any
  : T extends null | undefined | void
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

type AcceptUnknownContainers<T extends PropertyContainer | null | undefined> =
  IsAny<T> extends true
    ? T
    : T extends null | undefined | void
    ? never
    : T extends MapLike
    ? MapLike<unknown, unknown> | T
    : T extends SetLike
    ? SetLike<unknown> | T
    : T extends (infer T)[]
    ? unknown[] | T
    : T;

// #endregion

// #region get

const updateSingle = (target: any, key: any, value: any) =>
  setSingle(target, key, isFunction(value) ? value(get(target, key)) : value);

const setSingle = (target: any, key: any, value: any) => {
  value === undefined
    ? target.delete
      ? target.delete(key)
      : delete target[key]
    : target.set
    ? target.set(key, value)
    : target.add
    ? value
      ? target.add(key)
      : target.delete(value)
    : (target[key] = value);

  return value;
};

export const get = <
  T extends PropertyContainer | null | undefined,
  K extends KeyType<T>,
  I extends () =>
    | AcceptUnknownContainers<ValueType<T>>
    | Readonly<ValueType<T>>
    | undefined
>(
  target: T,
  key: K | undefined,
  initializer?: I
): T extends null | undefined | void
  ? undefined
  : ValueType<
      T,
      K,
      unknown extends I
        ? undefined
        : I extends () => infer R
        ? undefined extends R
          ? undefined
          : never
        : never
    > => {
  if (!target) return undefined as any;

  let value = (target as any).get
    ? (target as any).get(key)
    : (target as any).has
    ? (target as any).has(key)
    : target[key as any];

  if (isUndefined(value) && initializer) {
    isDefined((value = initializer())) && setSingle(target, key, value);
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

const NO_ARG = Symbol();

const createSetOrUpdateFunction =
  <B extends boolean>(
    setter: (target: any, key: any, value: any) => any
  ): SetOrUpdateFunction<B> =>
  (target: PropertyContainer, key: any, value: any = NO_ARG) => {
    if (!target) return;
    if (value !== NO_ARG) {
      const currentValue = get(target, key);
      setter(target, key, value);
      return currentValue;
    }

    if (isIterable(key)) {
      forEach(key, (item) =>
        isObject(item)
          ? forEach(item, setSingle)
          : setter(target, item[0], item[1])
      );
    } else {
      forEach(key, setSingle);
    }
    return target;
  };

export const assign = createSetOrUpdateFunction(setSingle);
export const update = createSetOrUpdateFunction(updateSingle);

// #endregion

export const add = <T extends PropertyContainer<any, boolean>>(
  target: T,
  key: KeyType<T>
) => get(target, key) !== assign(target, key, true as any);

export const has = <T extends PropertyContainer>(target: T, key: KeyType<T>) =>
  hasMethod(target, "has")
    ? target.has(key)
    : isDefined((target as any).get?.(key) ?? (target as any)[key]);

type RemoveDeepArgs<
  T,
  Current extends any[] = [],
  Depth extends number = 20
> = T extends PropertyContainer
  ? Depth extends 0
    ? Current
    :
        | (Depth extends 20 ? never : Current)
        | RemoveDeepArgs<
            ValueType<T>,
            [...Current, KeyType<T>[] | KeyType<T>],
            Minus<Depth, 1>
          >
  : Current;

type RemoveDeepValue<
  T,
  Args extends any[],
  ArrayIt = false
> = T extends PropertyContainer
  ? ArrayIt extends true
    ? (ValueType<T> | undefined)[]
    : Args extends [KeyType<T>[]]
    ? (ValueType<T> | undefined)[]
    : Args extends [KeyType<T>]
    ? ValueType<T> | undefined
    : Args extends [infer R, ...infer Rest]
    ? RemoveDeepValue<ValueType<T>, Rest, R extends any[] ? true : ArrayIt>
    : never
  : never;

const clearSingle = (target: any, key: any) => {
  if (isUndefined(target ?? key)) return undefined;

  let current = get(target, key);

  if (hasMethod(target, "delete")) {
    target.delete(key);
  } else {
    delete target[key];
  }
  return current;
};

/**
 * Removes one or more values from a property container specified by the provided key or array of keys.
 *
 * If more than one level of key arguments are specified, values will be removed from the property container at the deepest level.
 * If a property container becomes empty along the path of keys, it will be removed from its parent.
 *
 */
export const clear = <
  T extends PropertyContainer | null | undefined,
  Args extends RemoveDeepArgs<T>
>(
  target: T,
  ...keys: Args
): RemoveDeepValue<T, Args> => {
  const removed: any[] = [];
  let array = false;

  const clearStep = (
    target: any,
    index: number,
    parent?: any,
    parentKey?: any
  ) => {
    if (!target) return;
    const targetKeys = keys[index];
    if (index === keys.length - 1) {
      if (isArray(targetKeys)) {
        array = true;
        targetKeys.forEach((key) => removed.push(clearSingle(target, key)));
      } else {
        removed.push(clearSingle(target, targetKeys));
      }
    } else {
      if (isArray(targetKeys)) {
        array = true;
        targetKeys.forEach((key) =>
          clearStep(get(target, key), index + 1, target, key)
        );
      } else {
        clearStep(get(target, targetKeys), index + 1, target, targetKeys);
      }
      if (!count(target) && parent) {
        remove(parent, parentKey);
      }
    }
  };
  clearStep(target, 0);
  return array ? removed : removed[0];
};

/**
 * Removes the specified keys from a  property container.
 *
 * The difference between {@link clear} and this function is that it does not consider nested property containers and that arrays will be spliced (as opposed to `clear` where the index will be set to `undefined`).
 */
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

  if (keys.length) {
    // Sort array keys descending as they would otherwise not match their offset as the array is spliced along the way.
    return (isArray(target) ? keys.sort((x, y) => y - x) : keys).map((key) =>
      remove(target, key)
    );
  }

  return isArray(target)
    ? key < target.length
      ? target.splice(key, 1)[0]
      : undefined
    : clearSingle(target, key);
};

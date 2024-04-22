import {
  And,
  Extends,
  GeneralizeConstants,
  If,
  IsAny,
  MaybePromise,
  Minus,
  NotFunction,
  PrettifyIntersection,
  Primitives,
  RecordType,
  UnionToIntersection,
  count,
  forEach,
  hasMethod,
  isArray,
  isAwaitable,
  isDefined,
  isFunction,
  isMap,
  isObject,
  isSet,
  isUndefined,
  map,
  obj,
  throwError,
} from ".";

type ReadonlyMapLike<K = any, V = any> = {
  has?(key: K): boolean;
  get(key: K): V | undefined;
};

// #region Shared types
type MapLike<K = any, V = any> = ReadonlyMapLike<K, V> & {
  set(key: K, value: V): any;
  delete(key: K): any;
};

type ReadonlySetLike<K = any> = {
  has(key: K): boolean;
};
type SetLike<K = any> = ReadonlySetLike<K> & {
  add(key: K): any;
  delete(key: K): any;
};

type ReadonlyPropertyContainer<K extends any = any, V extends any = any> =
  | {
      [P in keyof K]: V;
    }
  | ReadonlyMapLike<K, V>
  | ReadonlySetLike<K>;

type PropertyContainer<K extends any = any, V extends any = any> =
  | ReadonlyPropertyContainer<K, V>
  | MapLike<K, V>
  | SetLike<K>;

export type TupleIndices<T extends readonly any[]> = T extends readonly []
  ? never
  : number extends T["length"]
  ? number
  : T extends readonly [any, ...infer Rest]
  ? TupleIndices<Rest> | Rest["length"]
  : never;

export type KeyType<T extends ReadonlyPropertyContainer | null | undefined> =
  T extends Primitives
    ? never
    : T extends ReadonlyMapLike<infer K, any> | ReadonlySetLike<infer K>
    ? K
    : T extends readonly any[]
    ? TupleIndices<T>
    : keyof T;

export type ValueType<
  T extends ReadonlyPropertyContainer | null | undefined,
  K = KeyType<T>,
  Context extends undefined | "get" | "set" = undefined
> = IsAny<T> extends true
  ? any
  : T extends null | undefined | void
  ? never
  : K extends KeyType<T>
  ? T extends ReadonlyMapLike<K, infer V>
    ? V | If<Extends<Context, "get" | "set">, undefined>
    : T extends ReadonlySetLike<K>
    ? boolean
    : T[K] | If<And<Extends<T, RecordType>, Extends<Context, "set">>, undefined>
  : never;

type AcceptUnknownContainers<
  T extends ReadonlyPropertyContainer | null | undefined
> = IsAny<T> extends true
  ? T
  : T extends null | undefined | void
  ? never
  : T extends MapLike
  ? MapLike<unknown, unknown> | T
  : T extends SetLike
  ? SetLike<unknown> | T
  : T extends readonly any[]
  ? number extends T["length"]
    ? readonly unknown[] | [] | T
    : T
  : T;

// #endregion

// #region get

const updateSingle = (target: any, key: any, value: any) =>
  setSingle(target, key, isFunction(value) ? value(get(target, key)) : value);

const setSingle = (target: any, key: any, value: any) => {
  if (target.constructor === Object) {
    value === undefined ? delete target[key] : (target[key] = value);
    return value;
  }

  value === undefined
    ? target.delete
      ? target.delete(key)
      : delete target[key]
    : target.set
    ? target.set(key, value)
    : target.add
    ? value
      ? target.add(key)
      : target.delete(key)
    : (target[key] = value);

  return value;
};

export const setSingleIfNotDefined = (
  target: any,
  key: any,
  value: any,
  error: (
    key: string,
    currentValue: any,
    newValue: any,
    target: any
  ) => string | Error
) => {
  const currentValue = get(target, key);
  if (isDefined(currentValue)) {
    throwError(error(key, currentValue, value, target));
  }
  return setSingle(target, key, value);
};

export const get: {
  <
    T extends ReadonlyPropertyContainer | null | undefined,
    K extends KeyType<T>
  >(
    target: T,
    key: K
  ): ValueType<T, K, "get">;
  <
    T extends ReadonlyPropertyContainer | null | undefined,
    K extends KeyType<T>,
    R extends
      | ValueType<T, K>
      | (() => ValueType<T, K>)
      | undefined
      | (() => ValueType<T, K> | undefined)
  >(
    target: T,
    key: K,
    init: R
  ): ValueType<
    T,
    K,
    R extends ValueType<T, K> | (() => ValueType<T, K>) ? undefined : "get"
  >;
} = <
  T extends ReadonlyPropertyContainer | null | undefined,
  K extends KeyType<T>,
  R extends ValueType<T, K> | undefined = undefined
>(
  target: T,
  key: K | undefined,
  init?: Wrapped<R>
) => {
  if (!target) return undefined as any;

  let value = (target as any).get
    ? (target as any).get(key)
    : (target as any).has
    ? (target as any).has(key)
    : target[key as any];

  if (isUndefined(value) && isDefined(init)) {
    isDefined((value = isFunction(init) ? (init as any)() : init)) &&
      setSingle(target, key, value);
  }
  return value;
};

// #endregion

// #region set and update

type UpdateFunction<
  T extends ReadonlyPropertyContainer,
  Key,
  Current,
  Factory
> = Factory extends false
  ? (
      current: Current,
      key: Key,
      target: T
    ) => GeneralizeConstants<ValueType<T, Key>> | undefined
  : (key: Key, target: T) => GeneralizeConstants<ValueType<T, Key>>;

type Updater<
  T extends ReadonlyPropertyContainer,
  Key,
  Current = ValueType<T, Key>,
  SettersOnly = false,
  Factory = false
> = SettersOnly extends true
  ? ValueType<T, Key> | (Factory extends true ? never : undefined)
  : IsAny<T> extends true
  ? NotFunction | UpdateFunction<any, any, any, Factory>
  :
      | (ValueType<T, Key> extends Function
          ? never
          : ValueType<T, Key> | (Factory extends true ? never : undefined))
      | UpdateFunction<T, Key, Current, Factory>;

type UpdaterType<T, SettersOnly = false> = SettersOnly extends true
  ? T
  : T extends (...args: any) => infer T
  ? T
  : T;

type BulkUpdateObject<
  T extends ReadonlyPropertyContainer,
  SettersOnly = false,
  Factory = false
> = T extends MapLike | SetLike | any[]
  ? {
      [P in KeyType<T>]: Updater<T, P, ValueType<T, P>, SettersOnly, Factory>;
    }
  : { [P in keyof T & KeyType<T>]?: Updater<T, P, T[P], SettersOnly, Factory> };

type BulkUpdateKeyValue<
  T extends ReadonlyPropertyContainer,
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
  T extends ReadonlyPropertyContainer,
  SettersOnly = false,
  Factory = false
> =
  | BulkUpdateObject<T, SettersOnly, Factory>
  | Iterable<
      | BulkUpdateKeyValue<T, SettersOnly, Factory>
      | BulkUpdateObject<T, SettersOnly, Factory>
    >;

type SetErrorHandler<T extends ReadonlyPropertyContainer | null | undefined> = (
  key: KeyType<T>,
  currentValue: ValueType<T>,
  newValue: ValueType<T>,
  target: T
) => string | Error;

type SettableKeyType<T extends PropertyContainer> = T extends readonly any[]
  ? // `KeyType<T>` won't do.
    // If this `keyof` constraint is not set TypeScript will only constrain values for readonly tuple items to T[number] and not T[K].
    keyof T
  : T extends RecordType
  ? keyof any
  : KeyType<T>;

type SettableValueType<T extends PropertyContainer, K> = K extends KeyType<T>
  ?
      | ValueType<T, K>
      // `undefined` removes elements from maps and sets so also allowed.
      | (T extends MapLike | SetLike ? undefined : never)
  : T extends RecordType
  ? any
  : never;

type SettableValueFunctionType<T extends PropertyContainer, K, V> = (
  current: SettableValueType<T, K>
) => V;

type IsGeneralKey<T, S = keyof any> = S extends T ? true : false;

/** List of keys in T that has undefined values. If Template does not allow undefined values for a key it is excluded from the reuslts. */
type UndefinedKeys<
  T,
  Template = {},
  K extends keyof T = keyof T
> = K extends keyof T
  ? T[K] extends undefined
    ? K extends keyof Template
      ? undefined extends Template[K]
        ? K
        : never
      : K
    : never
  : never;

type SetSingleResultType<
  T extends PropertyContainer,
  K,
  V
> = T extends RecordType
  ? AssignRecord<T, { [P in K & keyof any]: V }>
  : K extends KeyType<T>
  ? V extends ValueType<T, K> | (T extends readonly any[] ? never : undefined)
    ? T
    : never
  : never;

type SettableKeyValueTuple<T extends PropertyContainer> =
  KeyType<T> extends keyof any
    ?
        | {
            [P in KeyType<T>]: readonly [P, SettableValueType<T, P>];
          }[KeyType<T>]
        | (T extends RecordType ? [keyof any, any] : never)
    : readonly [KeyType<T>, SettableValueType<T, KeyType<T>>];

type SettableKeyValueRecord<T extends PropertyContainer> =
  SettableKeyType<T> extends keyof any
    ? RecordType &
        ({
          [P in KeyType<T>]?: SettableValueType<T, P>;
        } & {
          [P in SettableKeyType<T>]?: P extends KeyType<T>
            ? ValueType<T, P>
            : SettableValueType<T, P>;
        })
    : never;

type SettableValueList<T extends PropertyContainer> = T extends Primitives
  ? never
  :
      | SettableKeyValueRecord<T>
      | readonly (SettableKeyValueRecord<T> | SettableKeyValueTuple<T>)[];

type AllKeys<T> = T extends infer T ? keyof T : never;
type AnyValue<T, K> = T extends infer T
  ? K extends keyof T
    ? T[K]
    : never
  : never;

type MergeObjects<T> = {
  [P in AllKeys<T>]: AnyValue<T, P>;
};

type KeyValueTupleToRecord<Item> = Item extends readonly [infer K, infer V]
  ? {
      [P in K & keyof any]: V;
    }
  : Item extends readonly (infer KV)[]
  ? { [P in KV & keyof any]: KV }
  : Item extends RecordType
  ? Item
  : never;

type AssignRecord<T, S> = {
  [P in Exclude<
    keyof T | keyof S,
    IsGeneralKey<keyof T | keyof S> extends true ? never : UndefinedKeys<S, T>
  >]: P extends keyof S
    ? IsGeneralKey<P> extends true
      ? AnyValue<S | T, P>
      : P extends keyof T
      ? S[P] extends T[P]
        ? GeneralizeConstants<S[P]> extends T[P]
          ? GeneralizeConstants<S[P]>
          : S[P]
        : never
      : GeneralizeConstants<S[P]>
    : P extends keyof T
    ? T[P]
    : never;
};

type SetResult<
  T extends PropertyContainer,
  V extends any
> = T extends RecordType
  ? PrettifyIntersection<
      AssignRecord<
        T,
        V extends RecordType
          ? V
          : MergeObjects<KeyValueTupleToRecord<V[keyof V]>>
      >
    >
  : T;

type SetOrUpdateFunction<
  SettersOnly,
  ErrorHandler = false,
  Readonly = false
> = {
  <
    T extends
      | If<Readonly, ReadonlyPropertyContainer, PropertyContainer>
      | null
      | undefined,
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
    value: U,
    ...args: ErrorHandler extends true ? [error: SetErrorHandler<T>] : []
  ): UpdaterType<U>;
  <
    T extends
      | If<Readonly, ReadonlyPropertyContainer, PropertyContainer>
      | null
      | undefined
  >(
    target: T,
    values: BulkUpdates<T extends null | undefined ? never : T, SettersOnly>,
    ...args: ErrorHandler extends true ? [error: SetErrorHandler<T>] : []
  ): T;
};

const createSetOrUpdateFunction =
  <SettersOnly, Error>(
    setter: (target: any, key: any, value: any, error?: any) => any
  ): SetOrUpdateFunction<SettersOnly, Error> =>
  (target: PropertyContainer, key: any, value?: any, error?: any) => {
    if (!target) return undefined;
    if (value) {
      return setter(target, key, value, error);
    }

    forEach(key, (item) =>
      isArray(item)
        ? setter(target, item[0], item[1])
        : forEach(item, ([key, value]) => setter(target, key, value))
    );

    return target;
  };

export const assign = createSetOrUpdateFunction<true, false>(setSingle);
export const update = createSetOrUpdateFunction<false, false>(updateSingle);
export const assignIfUndefined = createSetOrUpdateFunction<false, true>(
  setSingleIfNotDefined
);

export const swap = <T extends PropertyContainer, K extends KeyType<T>>(
  target: T,
  key: K,
  value: ValueType<T, K>
): ValueType<T, K, "get"> => {
  const current = get(target, key) as any;
  if (value !== current) setSingle(target, key, value);
  return current as any;
};

// #endregion

export const add = <T extends PropertyContainer<any, boolean>>(
  target: T,
  key: KeyType<T>
) =>
  target instanceof Set
    ? target.has(key)
      ? false
      : (target.add(key), true)
    : get(target, key) !== assign(target, key, true as any);

export const has = <T extends ReadonlyPropertyContainer>(
  target: T,
  key: KeyType<T>
) =>
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
  ): T extends null | undefined ? T : ValueType<T, KeyType<T>> | undefined;
  <T extends PropertyContainer | null | undefined>(
    target: T,
    ...keys: (KeyType<T> | undefined)[]
  ): (T extends null | undefined ? T : ValueType<T, KeyType<T>> | undefined)[];
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
      ? (target as any[]).splice(key, 1)[0]
      : undefined
    : clearSingle(target, key);
};

type EntryToObject<Item> = Item extends readonly [infer K & keyof any, infer V]
  ? {
      [P in K & keyof any]: V;
    }
  : never;

type EntriesToObject<Entries> = UnionToIntersection<
  InlinePropertyDescriptors<
    Entries extends null | undefined | boolean
      ? {}
      : Entries extends readonly [
          Partial<Readonly<PropertyDescriptor>>,
          ...infer Rest
        ]
      ? EntriesToObject<Rest[number]>
      : Entries extends readonly [infer Item, ...infer Rest]
      ? EntryToObject<Item> & EntriesToObject<Rest>
      : Entries extends readonly (infer Items)[]
      ? EntryToObject<Items>
      : Entries
  >
>;

type InlinePropertyDescriptors<T> = {
  [P in keyof T]: T[P] extends () => infer V | { value: infer V }
    ? V
    : T[P] extends { get(): infer V }
    ? V
    : T[P];
};

type PropertyList =
  | boolean
  | null
  | undefined
  | readonly [defaults: Partial<PropertyDescriptor>, ...items: PropertyList[]]
  | readonly (readonly [key: keyof any, value: any])[]
  | RecordType;

export const define: {
  <T, P extends readonly PropertyList[]>(
    target: T,
    ...properties: P
  ): (T extends Function ? T : {}) &
    PrettifyIntersection<T & EntriesToObject<P[number]>>;
} = (target: any, ...args: readonly any[]) => {
  const add = (arg: any, defaults?: any) => {
    if (!arg) return;
    let properties: readonly any[];
    if (isArray(arg)) {
      if (isObject(arg[0])) {
        // Tuple with the first item the defaults and the next the definitions with those defaults,
        // ([{enumerable: false, ...}, ...])
        (arg as any[]).splice(1).forEach((items) => add(items, arg[0]));
        return;
      }
      // ([[key1, value1], [key2, value2], ...])
      properties = arg;
    } else {
      // An object.
      properties = map(arg)!;
    }

    properties.forEach(([key, value]) =>
      Object.defineProperty(target, key, {
        configurable: false,
        enumerable: true,
        writable: false,
        ...defaults,
        ...(isObject(value) && ("get" in value || "value" in value)
          ? value
          : isFunction(value) && !value.length
          ? { get: value }
          : { value }),
      })
    );
  };

  args.forEach((arg) => add(arg));
  return target as any;
};

type PropertySelector<T> =
  | keyof T
  | {
      [P in keyof T]?: PropertySelector<T[P]> | [...keys: (keyof T[P])[]];
    };

type SinglePickResult<T, Selected> = Selected extends
  | (string & infer K)
  | (infer K)[]
  ? { [P in keyof T & K]: T[P] }
  : keyof Selected extends infer Keys
  ? {
      [P in Keys & keyof any & keyof Selected]: P extends keyof T
        ? Selected[P] extends true
          ? T[P]
          : SinglePickResult<T[P], Selected[P]>
        : never;
    }
  : never;

type PickResults<T, Selectors> = PrettifyIntersection<
  Selectors extends [infer Item, ...infer Rest]
    ? SinglePickResult<T, Item> & SinglePickResult<T, Rest>
    : never
>;

export const pick = <T, Selectors extends PropertySelector<T>[], U>(
  source: T | (null | (undefined & U)),
  ...args: Selectors
): U extends undefined ? undefined : PickResults<T, Selectors> => {
  if (source === undefined) return undefined as any;

  return Object.fromEntries(
    args.flatMap((arg) =>
      isObject(arg, true)
        ? isArray(arg)
          ? arg.map((args) =>
              isArray(args)
                ? args.length === 1
                  ? [args[0], source![args[0]]]
                  : pick(source![args[0]], ...(args[1] as any[]))
                : [args[0], source![args[1]]]
            )
          : Object.entries(args).map(([key, value]) => [
              key,
              value === true ? source![key] : pick(source![key], value),
            ])
        : ([[arg, source![arg]]] as any)
    )
  ) as any;
};

export type Wrapped<T> = T | (() => T);

export type Unwrap<T> = T extends () => any ? ReturnType<T> : T;

export const unwrap: {
  <T extends Wrapped<any>>(value: T): Unwrap<T>;
  <T>(value: Wrapped<T>): T;
} = (value: Wrapped<any>): any =>
  isFunction(value)
    ? unwrap(value())
    : isAwaitable(value)
    ? value.then((result) => unwrap(result))
    : value;

export const unlock = <T extends ReadonlyPropertyContainer>(
  readonly: T
): T extends ReadonlyMapLike<infer K, infer V>
  ? MapLike<K, V>
  : T extends ReadonlySetLike<infer T>
  ? SetLike<T>
  : T => readonly as any;

export const wrap = <T>(
  original: T,
  wrap: (
    original: T extends (...args: any) => any ? T : () => T,
    ...args: T extends (...args: infer Args) => any ? Args : []
  ) => T extends (...args: any) => infer R ? R : T
): T =>
  isUndefined(original)
    ? original
    : isFunction(original)
    ? (...args: any) => wrap(original as any, ...args)
    : (wrap as any)(() => original as any);

export const clone = <T>(value: T, depth: number | boolean = true): T =>
  isObject(value, true)
    ? isArray(value)
      ? depth
        ? value.map((value) => clone(value, depth === true || --(depth as any)))
        : [...value]
      : isSet(value)
      ? new Set<any>(
          depth
            ? (map as any)(value, (value: any) =>
                clone(value, depth === true || --(depth as any))
              )
            : value
        )
      : isMap(value)
      ? new Map<any, any>(
          depth
            ? (map as any)(value, (value: any) =>
                // Does not clone keys.
                [value[0], clone(value[1], depth === true || --(depth as any))]
              )
            : value
        )
      : depth
      ? obj(
          map(value as any, ([k, v]) => [
            k,
            clone(v, depth === true || --(depth as any)),
          ])!
        )
      : { ...value }
    : (value as any);

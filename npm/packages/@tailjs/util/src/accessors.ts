import {
  And,
  Extends,
  GeneralizeConstants,
  If,
  IsAny,
  IteratorItem,
  IteratorSourceOf,
  KeyValuePairsToObject,
  MaybeUndefined,
  MethodOverloads,
  Subtract,
  NotFunction,
  Nullish,
  PrettifyIntersection,
  Primitives,
  RecordType,
  UnionToIntersection,
  count,
  forEach,
  hasMethod,
  isArray,
  isFunction,
  isMap,
  isNumber,
  isObject,
  isPlainObject,
  isSet,
  map,
  obj,
  throwError,
} from ".";

type ReadonlyMapLike<K = any, V = any> = {
  has?(key: K): boolean;
  get(key: K): V | undefined;
};

type MapLike<K = any, V = any> = ReadonlyMapLike<K, V> & {
  set(key: K, value: V): any;
  delete(key: K): any;
  clear(): any;
};

type ReadonlySetLike<K = any> = {
  has(key: K): boolean;
};
type SetLike<K = any> = ReadonlySetLike<K> & {
  add(key: K): any;
  delete(key: K): any;
  clear(): any;
};

type ReadonlyPropertyContainer<K extends any = any, V extends any = any> =
  | RecordType
  | readonly any[]
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

export type KeyType<T extends ReadonlyPropertyContainer | Nullish> =
  T extends Primitives
    ? never
    : T extends ReadonlyMapLike<infer K, any> | ReadonlySetLike<infer K>
    ? K
    : T extends readonly any[]
    ? TupleIndices<T>
    : keyof T;

export type ValueType<
  T extends ReadonlyPropertyContainer | Nullish,
  K = KeyType<T>,
  Context extends undefined | "get" | "set" = undefined
> = IsAny<T> extends true
  ? any
  : T extends Nullish
  ? never
  : K extends KeyType<T>
  ? T extends ReadonlyMapLike<K, infer V>
    ? V | If<Extends<Context, "get" | "set">, undefined>
    : T extends ReadonlySetLike<K>
    ? boolean
    : T[K] | If<And<Extends<T, RecordType>, Extends<Context, "set">>, undefined>
  : never;

const set = (target: any, key: any, value: any) => {
  if (target.constructor === Object || isArray(target)) {
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
  if (currentValue != null) {
    throwError(error(key, currentValue, value, target));
  }
  return set(target, key, value);
};

export const tryAdd: {
  <T extends PropertyContainer, K extends KeyType<T>>(
    target: T,
    key: K,
    value: Wrapped<ValueType<T, K, "set">>,
    conflict?: (current: ValueType<T, K>) => void
  ): boolean;
} = (target, key, value, conflict) => {
  const current = get(target, key);
  if (current != null) {
    conflict?.(current as any);
    return false;
  }
  set(target, key, unwrap(value));
  return true;
};

export const get: {
  <T extends ReadonlyPropertyContainer | Nullish, K extends KeyType<T>>(
    target: T,
    key: K
  ): ValueType<T, K, "get">;
  <
    T extends ReadonlyPropertyContainer | Nullish,
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
  T extends ReadonlyPropertyContainer | Nullish,
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

  if (value === undefined && init != null) {
    (value = isFunction(init) ? (init as any)() : init) != null &&
      set(target, key, value);
  }
  return value;
};

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
  ? readonly [any, Updater<T, any, any, SettersOnly, Factory>]
  : T extends MapLike | SetLike | any[]
  ? readonly [
      KeyType<T>,
      Updater<T, KeyType<T>, ValueType<T, KeyType<T>>, SettersOnly, Factory>
    ]
  : K extends any
  ? readonly [K, Updater<T, KeyType<T>, any, SettersOnly, Factory>]
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
    >
  | readonly (readonly BulkUpdateKeyValue<T, SettersOnly, Factory>[])[];

type MergeResult_<Updates> = Updates extends Iterable<
  infer Item extends readonly [keyof any, any]
>
  ? KeyValuePairsToObject<Item>
  : Updates;

type MergeResult<T, Updates> = T extends RecordType
  ? PrettifyIntersection<
      T &
        UnionToIntersection<
          MergeResult_<
            Updates extends Iterable<infer Updates> ? Updates : Updates
          >
        >
    >
  : T &
      UnionToIntersection<
        MergeResult_<
          Updates extends Iterable<infer Updates> ? Updates : Updates
        >
      >;

type SetErrorHandler<T extends ReadonlyPropertyContainer | Nullish> = (
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

type IsGeneralKey<T, S = keyof any> = S extends T ? true : false;

/** List of keys in T that has undefined values. If Template does not allow undefined values for a key it is excluded from the results. */
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
      T extends Nullish ? never : T,
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
      | undefined,
    U
  >(
    target: T,
    values: BulkUpdates<T extends Nullish ? never : T, SettersOnly> & U,
    ...args: ErrorHandler extends true ? [error: SetErrorHandler<T>] : []
  ): T;
};

export const merge = <
  Target,
  Values extends readonly IteratorSourceOf<readonly [keyof any, any]>[]
>(
  target: Target,
  ...values: Values
): MaybeUndefined<Target, MergeResult<Target, Values>> => (
  forEach(values, (values) =>
    forEach(values, ([key, value]) => {
      if (value != null) {
        if (isPlainObject(target[key]) && isPlainObject(value)) {
          merge(target[key], value);
        } else {
          target[key] = value;
        }
      }
    })
  ),
  target as any
);

const createSetOrUpdateFunction =
  <SettersOnly, Error>(
    setter: (target: any, key: any, value: any, error?: any) => any
  ): SetOrUpdateFunction<SettersOnly, Error> =>
  (target: PropertyContainer, key: any, value?: any, error?: any) => {
    if (!target) return undefined;
    if (value != undefined) {
      return setter(target, key, value, error);
    }

    forEach(key, (item) =>
      isArray(item)
        ? setter(target, item[0], item[1])
        : forEach(item, ([key, value]) => setter(target, key, value))
    );

    return target;
  };

export const assign = createSetOrUpdateFunction<true, false>(set);
export const update: <
  T extends PropertyContainer | Nullish,
  K extends KeyType<T>
>(
  target: T,
  key: K,
  update: (current: ValueType<T, K> | undefined) => ValueType<T, K> | undefined
) => T = (target, key, update) => {
  let value: any;
  if (hasMethod(target, "set")) {
    (value = update(target.get(key))) === undefined
      ? target.delete(key)
      : target.set(key, value);
  } else if (hasMethod(target, "add")) {
    value = target.has(key);
    update(value) ? target.add(key) : target.delete(key);
  } else if (target) {
    value = (target as any)[key] = update((target as any)[key]);
    if (value === undefined && isPlainObject(target)) {
      delete target[key];
    }
  }

  return target;
};
export const assignIfUndefined = createSetOrUpdateFunction<false, true>(
  setSingleIfNotDefined
);

export const swap = <T extends PropertyContainer, K extends KeyType<T>>(
  target: T,
  key: K,
  value: ValueType<T, K>
): ValueType<T, K, "get"> => {
  const current = get(target, key) as any;
  if (value !== current) set(target, key, value);
  return current as any;
};

export const add = <T extends PropertyContainer<any, boolean>>(
  target: T,
  key: KeyType<T>
) =>
  target instanceof Set || target instanceof WeakSet
    ? !target.has(key) && (target.add(key), true)
    : !get(target, key) && (set(target, key, true), true);

export const has = <T extends ReadonlyPropertyContainer>(
  target: T,
  key: KeyType<T>
) =>
  hasMethod(target, "has")
    ? target.has(key)
    : ((target as any).get?.(key) ?? (target as any)[key]) != null;

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
            Subtract<Depth, 1>
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

type KeysArg<T extends PropertyContainer | Nullish> = T extends RecordType
  ? readonly (keyof T | undefined)[]
  : readonly (KeyType<T> | undefined)[];

const clearSingle = (target: any, key: any) => {
  if ((target ?? key) == null) return undefined;

  let current = get(target, key);

  if (hasMethod(target, "delete")) {
    target.delete(key);
  } else {
    delete target[key];
  }
  return current;
};

/**
 * Deletes the specified keys from the target and returns the target.
 */
export const del: {
  <T extends PropertyContainer | undefined, K extends KeysArg<T>>(
    target: T,
    ...keys: K
  ): T extends RecordType ? { [P in Exclude<keyof T, K[number]>]: T[P] } : T;
} = (target: any, ...keys: any) =>
  target &&
  (assign(target, map(keys, (key) => [key, undefined]) as any) as any);

/**
 * Removes one or more values from a property container specified by the provided key or array of keys.
 *
 * If more than one level of key arguments are specified, values will be removed from the property container at the deepest level.
 * If a property container becomes empty along the path of keys, it will be removed from its parent.
 *
 */
export const clear = <
  T extends PropertyContainer | Nullish,
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

/** Removes all entries from a set or map, and returns them. */
export const empty = <S extends SetLike | MapLike | undefined>(
  target: S
): MaybeUndefined<S, IteratorItem<S>[]> => {
  if (!target) return undefined as any;

  const entries = map(target);
  target.clear();
  return entries as any;
};

/**
 * Removes the specified key(s) from a property container and returns their value, or undefined if the container did not have the specified key.
 *
 * The difference between {@link clear} and this function is that it does not consider nested property containers and that arrays will be spliced (as opposed to `clear` where the index will be set to `undefined`).
 */
export const remove: {
  <T extends PropertyContainer | Nullish, K extends KeyType<T> | undefined>(
    target: T,
    key: K
  ): T extends Nullish ? T : ValueType<T, K, "get">;
  <T extends PropertyContainer | Nullish, K extends KeysArg<T>>(
    target: T,
    keys: K
  ): (T extends Nullish ? T : ValueType<T, K[number], "get">)[];
} = (target: PropertyContainer, keys: any) => {
  if (!target) return undefined;

  if (isArray(keys)) {
    // Sort array keys descending as they would otherwise not match their offset as the array is spliced along the way.
    return (
      isArray(target) && target.length > 1 ? keys.sort((x, y) => y - x) : keys
    ).map((key) => remove(target, key));
  }

  return isArray(target)
    ? keys < target.length
      ? (target as any[]).splice(keys, 1)[0]
      : undefined
    : clearSingle(target, keys);
};

type EntryToObject<Item> = Item extends readonly [infer K & keyof any, infer V]
  ? {
      [P in K & keyof any]: V;
    }
  : never;

type EntriesToObject<Entries> = UnionToIntersection<
  InlinePropertyDescriptors<
    Entries extends Nullish | boolean
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
      if (isPlainObject(arg[0])) {
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
        ...(isPlainObject(value) && ("get" in value || "value" in value)
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
      [P in keyof T]?: PropertySelector<T[P]>;
    }
  | readonly (keyof T)[];

type SinglePickResult<T, Selected> = Selected extends
  | (string & infer K)
  | (infer K)[]
  ? unknown extends K
    ? T
    : { [P in keyof T & K]: T[P] }
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
    ? unknown extends Item
      ? T
      : SinglePickResult<T, Item> & SinglePickResult<T, Rest>
    : never
>;

export const pick = <T, Selectors extends PropertySelector<T>[], U>(
  source: T | (null | (undefined & U)),
  ...args: Selectors
): U extends undefined ? undefined : PickResults<T, Selectors> => {
  if (source === undefined) return undefined as any;

  return Object.fromEntries(
    args
      .flatMap((arg) =>
        isObject(arg)
          ? isArray(arg)
            ? arg.map((args) =>
                isArray(args)
                  ? args.length === 1
                    ? [args[0], source![args[0]]]
                    : pick(source![args[0]], ...(args[1] as any[]))
                  : [args, source![args]]
              )
            : Object.entries(args).map(([key, value]) => [
                key,
                value === true ? source![key] : pick(source![key], value),
              ])
          : ([[arg, source![arg]]] as any)
      )
      .filter((arg) => arg[1] != null)
  ) as any;
};

export type Wrapped<T> = T | (() => T);

export type Unwrap<T> = T extends () => infer R ? R : T;

export const unwrap: {
  <T>(value: Wrapped<T>): T;
} = (value: Wrapped<any>): any => (isFunction(value) ? value() : value);

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
  original == null
    ? original
    : isFunction(original)
    ? (...args: any) => wrap(original as any, ...args)
    : (wrap as any)(() => original as any);

/** Creates a clone of an object (including arrays, sets and maps) at the specified depth. -1 means "any depth". */
export const clone = <T>(value: T, depth = -1): T =>
  isArray(value)
    ? depth
      ? value.map((value) => clone(value, depth - 1))
      : [...value]
    : isPlainObject(value)
    ? depth
      ? obj(value as any, ([k, v]) => [k, clone(v, depth - 1)])
      : { ...value }
    : isSet(value)
    ? new Set<any>(
        depth
          ? (map as any)(value, (value: any) => clone(value, depth - 1))
          : value
      )
    : isMap(value)
    ? new Map<any, any>(
        depth
          ? (map as any)(value, (value: any) =>
              // Does not clone keys.
              [value[0], clone(value[1], depth - 1)]
            )
          : value
      )
    : (value as any);

/**
 * Very much like `Array.push` except it accepts anything with a `push ` method  (including non-generic overloads),
 * and returns the target so chaining is easier. Suitable for tight minification.
 */
export const push = <T extends { push: (...args: any) => any } | Nullish>(
  target: T,
  ...items: MethodOverloads<T, "push">[0]
): T => target?.push(...(items as any))!;

/**
 * Very much like `Array.pop` except it accepts anything with a `pop` method.
 * (Included or the sake of generality since we have {@link push}). Suitable for tight minification.
 */
export const pop = <T extends { pop(): R } | undefined, R>(
  target: T
): MaybeUndefined<T, R> => target?.pop() as any;

/**
 * Very much like `Array.unshift` except it accepts anything with a `push ` method  (including non-generic overloads),
 * and returns the target so chaining is easier. Suitable for tight minification
 */
export const unshift = <T extends { unshift: (...args: any) => any } | Nullish>(
  target: T,
  ...items: MethodOverloads<T, "unshift">[0]
): T => target?.unshift(...(items as any))!;

/**
 * Very much like `Array.shift` except it accepts anything with a `shift` method.
 * (Included or the sake of generality since we have {@link unshift}). Suitable for tight minification. */
export const shift = <T extends { shift(): R } | undefined, R>(
  target: T
): MaybeUndefined<T, R> => target?.shift() as any;

/**
 * Calculates the difference between the current version of an object, and the changed values specified.
 * If an updated property is numeric, the delta will be the difference between the updated and current number.
 * If an updated property is the same as the current value, it will not be included in the diff result,
 * otherwise this algorithm is no more sophisticated than just returning the new value in the diff (e.g. nothing special about strings).
 *
 * @returns A tuple with the first element being the differences between the updates and the current version,
 *  and the second element a clone of the current value with the changes applied.
 *  The latter should be passed as the second argument, next time the diff is calculated.
 */
export const diff = <T>(
  updated: T,
  previous: T | undefined
): [delta: T, current: T] | undefined => {
  if (!updated) return undefined;
  if (!isPlainObject(previous)) return [updated, updated];

  const delta: any = {};
  let patchedValue: any;
  let previousValue: number | undefined;

  // If there are changes, this will be a clone of the previous value with the delta changes applied.
  let patched: any;

  if (isPlainObject(updated)) {
    forEach(updated, ([key, value]) => {
      if (value === previous[key]) {
        // No changes.
        return;
      }

      if (isPlainObject((patchedValue = value))) {
        // deltaValue will be undefined if there are no changed in the child object.
        if (!(value = diff(value, previous[key]))) {
          return;
        }
        [value, patchedValue] = value;
      } else if (isNumber(value) && isNumber(previousValue)) {
        value = (patchedValue = value) - previousValue;
      }

      delta[key] = value;
      (patched ??= clone(previous))[key] = patchedValue;
    });
    return patched ? [delta, patched] : undefined;
  }

  return undefined;
};

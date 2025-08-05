import {
  AssignSource,
  Falsish,
  forEach,
  isArray,
  iterable,
  IterationProjected,
  IterationProjection,
  IterationSource,
  MapSource,
  MaybeNullish,
  MaybePromiseLike,
  Nullish,
  ObjectSource,
  PromiseIfPromiseLike,
  SimpleObject,
  skip,
  stop,
} from ".";
import {
  EncourageTuples,
  findDeclaringScope,
  InputValueTypeOf,
  KeyTypeOf,
  KeyValueType,
  LookupType,
  MapFromEntries,
  MergeObjectSources,
  ObjectFromEntries,
  ObjectSourceToObject,
  RecordKeyOf,
  ValueTypeOf,
} from "./_internal";

const setSymbol = Symbol();
const getSymbol = Symbol();
const pushSymbol = Symbol();

let ensureAssignImplementations = <R>(
  target: any,
  error: any,
  retry: () => R
): R => {
  if (target == null || target?.[getSymbol]) {
    throw error;
  }
  let scope = findDeclaringScope(target);
  if (!scope) {
    throw error;
  }

  if (scope.Object.prototype[setSymbol]) throw error;

  for (const { prototype } of [scope.Map, scope.WeakMap]) {
    prototype[setSymbol] = function (key: any, value: any) {
      return value === void 0
        ? this.delete(key)
        : this.get(key) !== value && !!this.set(key, value);
    };
    prototype[getSymbol] = prototype.get;
  }

  for (const { prototype } of [scope.Set, scope.WeakSet]) {
    prototype[setSymbol] = function (key: any, value: any, add = false) {
      return value || (add && value === void 0)
        ? this.has(key)
          ? false
          : !!this.add(key)
        : this.delete(key);
    };
    prototype[getSymbol] = prototype.has;
    prototype[pushSymbol] = function (...keys: any[]) {
      for (const key of keys) key !== void 0 && this.add(key);
      return this;
    };
  }
  scope.Array.prototype[pushSymbol] = scope.Array.prototype.push;

  for (const { prototype } of [scope.Object, scope.Array]) {
    prototype[setSymbol] = function (key: any, value: any) {
      if (value === undefined) {
        if (this[key] !== undefined) {
          delete this[key];
          return true;
        }
        return false;
      }
      return (this[key] = value) !== value;
    };
    prototype[getSymbol] = function (key: any) {
      return this[key];
    };
  }

  return retry();
};

type GetResult<Source, K, Default> = unknown extends Default
  ? ValueTypeOf<Source, K>
  : undefined extends Default
  ? ValueTypeOf<Source, K>
  : ValueTypeOf<Source, K> & {};

export let get: {
  <
    Source,
    K extends KeyTypeOf<Source>,
    InitializeDefault extends () => MaybePromiseLike<
      InputValueTypeOf<Source, K>
    >
  >(
    source: Source,
    key: K,
    initialize: InitializeDefault
  ): unknown extends InitializeDefault
    ? ValueTypeOf<Source, K> // Assume `any` is not an async function.
    : InitializeDefault extends () => infer Default
    ? Default extends PromiseLike<infer Default>
      ? Promise<GetResult<Source, K, Default>>
      : GetResult<Source, K, Default>
    : never;
  <Source, K extends KeyTypeOf<Source>>(
    source: Source,
    key: K,
    initialize: InputValueTypeOf<Source, K> & {}
  ): ValueTypeOf<Source, K> & {};
  <Source, K extends KeyTypeOf<Source>>(
    source: Source,
    key: K,
    initialize?: InputValueTypeOf<Source, K>
  ): ValueTypeOf<Source, K>;
} = (source: any, key?: any, initialize?: any) => {
  try {
    if (source == null) return source;

    let value = source[getSymbol](key);
    if (
      value === void 0 &&
      (value = typeof initialize === "function" ? initialize() : initialize) !==
        void 0
    ) {
      if (value?.then)
        return value.then((value: any) =>
          value === void 0 ? value : source[setSymbol](key, value)
        );
      source[setSymbol](key, value);
    }
    return value;
  } catch (e) {
    return ensureAssignImplementations(source, e, () =>
      get(source, key, initialize)
    );
  }
};

export let add: {
  <Target, K extends KeyTypeOf<Target>>(
    target: (Set<K> | WeakSet<K & {}>) & Target,
    key: K,
    value?: InputValueTypeOf<Target>
  ): MaybeNullish<boolean, Target>;
  <Target, K extends KeyTypeOf<Target>>(
    target: Target,
    key: K,
    value: InputValueTypeOf<Target, K>
  ): MaybeNullish<boolean, Target>;
} = (target: any, key: any, value?: any) => {
  try {
    return target?.[setSymbol](key, value, true) === true;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      add(target, key, value)
    );
  }
};

export let trySet: {
  <
    Target,
    K extends KeyTypeOf<Target>,
    Value extends InputValueTypeOf<Target, K>
  >(
    target: Target,
    key: K,
    value: Value
  ): boolean;
} = (target: any, key: any, value: any) =>
  get(target, key) !== set(target, key, value);

export let set: {
  <
    Target,
    K extends KeyTypeOf<Target>,
    Value extends InputValueTypeOf<Target, K>
  >(
    target: Target,
    key: K,
    value: Value
  ): MaybeNullish<Value, Target>;
} = (target: any, key: any, value: any) => {
  try {
    target[setSymbol](key, value);
    return value;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      set(target, key, value)
    );
  }
};

/** Removes the value with the specified key, and returns it. */
export const remove: {
  <Target extends LookupType, K extends KeyTypeOf<Target>>(
    target: Target,
    key: K
  ): ValueTypeOf<Target, K> | undefined;
  <Target, K extends keyof Target>(target: Target, key: K):
    | Target[K]
    | undefined;
} = (target: any, key: any) => exchange(target, key, undefined);

export let exchange: {
  <
    Target extends LookupType,
    K extends KeyTypeOf<Target>,
    Value extends InputValueTypeOf<Target, K> | undefined
  >(
    target: Target,
    key: K,
    value: Value
  ): ValueTypeOf<Target, K> | undefined;
  <
    Target,
    K extends keyof Target,
    Value extends InputValueTypeOf<Target, K> | undefined
  >(
    target: Target,
    key: K,
    value: Value
  ): Target[K] | undefined;
} = (target: any, key: any, value: any) => {
  try {
    const previous = target[getSymbol](key);
    target[setSymbol](key, value);
    return previous;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      exchange(target, key, value)
    );
  }
};

export const update: {
  <Target, K, Value extends InputValueTypeOf<Target, K>, UpdateResult>(
    target: Target,
    key: KeyTypeOf<Target> & K,
    update: (
      current: ValueTypeOf<Target, K>
    ) => UpdateResult & MaybePromiseLike<EncourageTuples<Value | undefined>>
  ): PromiseIfPromiseLike<
    MaybeNullish<ValueTypeOf<Target, K>, Target>,
    UpdateResult
  >;
} = (target: any, key: any, update: any) => {
  let updated = update(get(target, key));
  return typeof updated?.then === "function"
    ? updated.then((value: any) => set(target, key, value))
    : set(target, key, updated);
};

export const clone: {
  <T extends SimpleObject | readonly any[]>(value: T, depth?: number): T;
} = (template, depth = -1) => {
  const ctor = template?.constructor;
  if (ctor === Object || ctor === Array) {
    const cloned: any = ctor();
    for (const p in template) {
      const propValue = template[p];
      cloned[p] =
        depth && (propValue?.constructor === Object || isArray(propValue))
          ? clone(propValue, depth - 1)
          : propValue;
    }
    return cloned;
  }
  return template;
};

export let push: {
  <Target, Item>(
    target: Target & (readonly Item[] | Nullish),
    ...values: (Item | undefined)[]
  ): Target;
  <Target, K>(
    target: Target & (Set<K> | WeakSet<K & {}>),
    ...values: (K | undefined)[]
  );
} = (target: any, ...items: any[]) => {
  try {
    return target == null ? target : (target[pushSymbol](...items), target);
  } catch (e) {
    return ensureAssignImplementations(target, e, () => push(target, ...items));
  }
};

export const dict: {
  <Source extends MapSource<K, V>, K, V>(source: Source): Source extends Nullish
    ? Source
    : ObjectSourceToObject<Source>;
  <
    Source extends IterationSource,
    Projected extends readonly [K, V] | Nullish,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never,
    K,
    V
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>
  ): Source extends Nullish
    ? Source
    : MapFromEntries<IterationProjected<Projected>>;
} = (source: any, projection?: any) => {
  const target = new Map();
  forEach(
    source,
    projection
      ? (item, index, seed) =>
          (item = projection(item, index, seed)) &&
          (typeof item !== "symbol" || (item !== skip && item !== stop))
            ? target.set(item[0], item[1])
            : item
      : (item) =>
          item && (typeof item !== "symbol" || (item !== skip && item !== stop))
            ? target.set(item[0], item[1])
            : item
  );
  return target;
};

export const obj: {
  <Source extends ObjectSource<K, V>, K extends keyof any, V>(
    source: Source
  ): Source extends Nullish ? Source : ObjectSourceToObject<Source>;
  <
    Source extends IterationSource,
    Projected extends KeyValueType<K, V> | Nullish,
    Accumulator extends Projected,
    Signal extends typeof skip | typeof stop | never,
    K extends keyof any,
    V
  >(
    source: Source,
    projection: IterationProjection<Source, Accumulator, Projected | Signal>
  ): Source extends Nullish
    ? Source
    : ObjectFromEntries<IterationProjected<Projected>>;
} = (source: any, projection?: any) => {
  const target = {};
  forEach(
    source,
    projection
      ? (item, index, seed) =>
          (item = projection(item, index, seed)) &&
          (typeof item !== "symbol" || (item !== skip && item !== stop))
            ? (target[item[0]] = item[1])
            : item
      : (item) =>
          item && (typeof item !== "symbol" || (item !== skip && item !== stop))
            ? (target[item[0]] = item[1])
            : item
  );
  return target;
};

const assignSingle = (target: any, source: any, clone = false) => {
  try {
    if (target.constructor === Object) {
      if (clone) {
        const originalTarget = target;
        // Clone target if any property differs.

        forEach(source!, (kv) => {
          if (
            !kv ||
            (kv[1] === undefined ? !(kv[0] in target) : target[kv[0]] === kv[1])
          ) {
            return;
          }

          if (originalTarget === target) {
            target = { ...originalTarget };
          }
          if (kv[1] === undefined) {
            delete target[kv[0]];
          } else {
            target[kv[0]] = kv[1];
          }
        });
      } else {
        forEach(
          source!,
          (kv) =>
            kv &&
            (kv[1] === undefined
              ? delete target[kv[0]]
              : (target[kv[0]] = kv[1]))
        );
      }
    } else {
      forEach(source, (kv) => kv && target[setSymbol](kv[0], kv[1]));
    }
    return target;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      assignSingle(target, source, clone)
    );
  }
};

export let assign: {
  <Target extends SimpleObject, Its extends readonly AssignSource<Target>[]>(
    target: Target,
    clone: boolean,
    ...sources: Its
  ): Target;
  <Target, Its extends readonly AssignSource<Target>[]>(
    target: Target,
    ...sources: Its
  ): Target;
} = (target: any, ...sources: any[]) => {
  if (!target || !sources.length) {
    return target;
  }
  if (typeof sources[0] === "boolean") {
    if (sources.length > 1) {
      const originalTarget = target;
      let clone = sources[0];
      sources.length > 2
        ? forEach(
            sources,
            (source, ix) =>
              ix > 0 &&
              (target = assignSingle(
                target,
                source,
                clone && target === originalTarget
              ))
          )
        : (target = assignSingle(target, sources[1], clone));
    }
  } else {
    sources.length > 1
      ? forEach(sources, (source) => assignSingle(target, source, true))
      : assignSingle(target, sources[0]);
  }

  return target;
};

export interface Merge2Settings<
  Deep extends boolean = boolean,
  Overwrite extends boolean = boolean,
  OverwriteNulls extends boolean = boolean
> {
  /**
   * Merge nested objects if both the target and source values are object.
   *
   * @default true
   */
  deep?: Deep;

  /**
   * Overwrite the value from the other object(s) if they already has a value.
   *
   * @default true
   */
  overwrite?: Overwrite;
  /**
   * Overwrite `null` as if it was `undefined` when merging with `overwrite: false`.
   * @default false
   */
  nulls?: boolean;
}
export const merge: {
  <
    Target,
    Source extends SimpleObject | Falsish | Iterable<ObjectSource>,
    Deep extends boolean = true,
    Overwrite extends boolean = true,
    OverwriteNulls extends boolean = false
  >(
    target: Target,
    sources: EncourageTuples<Source>,
    options?: Merge2Settings<Deep, Overwrite, OverwriteNulls>
  ): Target extends Nullish
    ? Target
    : MergeObjectSources<Target, Source, Deep, Overwrite, OverwriteNulls>;
} = (
  target: any,
  sources: any,
  options: { deep?: boolean; overwrite?: boolean; nulls?: boolean } = {}
) => {
  if (target == null) {
    return target;
  }

  const { deep = true, overwrite = true, nulls = false } = options;

  for (const source of iterable(sources)) {
    forEach(source, (kv) => {
      if (!kv) return;
      const [key, value] = kv;
      const current = target[key];
      if (nulls ? current == null : current === void 0) {
        target[key] = value;
        return;
      }

      if (
        deep &&
        value?.constructor === Object &&
        current?.constructor === Object
      ) {
        merge(current, value, options);
      } else if (overwrite) {
        target[key] = value;
      }
    });
  }
  return target;
};

export const pick: {
  <
    T extends object | Nullish,
    TK extends keyof (T & {}),
    K extends RecordKeyOf<T>
  >(
    target: T,
    // The `K | G` trick is because TypeScript will consider `["prop1", "prop2"]` as `string[]`
    //  without the `K extends keyof T` constraint (in which case it gets it right as ("prop1"|"prop2")[]).
    // `keyof T` is too restrictive since we also want to support intersection types.
    keys: Iterable<TK | K>
  ): T extends Nullish
    ? T
    : T extends infer T
    ? (TK | K) & keyof T extends infer K extends keyof T
      ? {
          [P in K]: T[P];
        }
      : never
    : never;
} = (target, keys) =>
  target == null
    ? target
    : (obj(keys, (key) =>
        // The first check is presumably faster than the `in` operator.
        target[key as any] !== void 0 || key in target
          ? [key, target[key as any]]
          : skip
      ) as any);

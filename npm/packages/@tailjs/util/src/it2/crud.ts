import {
  AssignSource,
  Falsish,
  forEach2,
  isArray,
  iterable2,
  IterationProjected,
  IterationProjection2,
  IterationSource,
  MapSource,
  MaybeNullish,
  MaybePromiseLike,
  Nullish,
  ObjectSource,
  PromiseIfPromiseLike,
  SimpleObject,
  skip2,
  stop2,
} from "..";
import {
  EncourageTuples,
  findDeclaringScope,
  InputValueTypeOf,
  KeyTypeOf,
  KeyValueType,
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
    prototype[pushSymbol] = function (keys: any[]) {
      for (const key of keys) key !== void 0 && this.add(key);
      return this;
    };
  }
  scope.Array.prototype[pushSymbol] = function (values: any[]) {
    this.push(...values);
    return this;
  };

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

export let get2: {
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
      get2(source, key, initialize)
    );
  }
};

export let add2: {
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
      add2(target, key, value)
    );
  }
};

export let set2: {
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
      set2(target, key, value)
    );
  }
};

export let exchange2: {
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
    const previous = target[getSymbol](key);
    target[setSymbol](key, value);
    return previous;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      exchange2(target, key, value)
    );
  }
};

export const update2: {
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
  let updated = update(get2(target, key));
  return typeof updated?.then === "function"
    ? updated.then((value: any) => set2(target, key, value))
    : set2(target, key, updated);
};

export const clone2: {
  <T extends SimpleObject | readonly any[]>(value: T, depth?: number): T;
} = (template, depth = -1) => {
  const ctor = template?.constructor;
  if (ctor === Object || ctor === Array) {
    const clone: any = ctor();
    for (const p in template) {
      const propValue = template[p];
      clone[p] =
        depth && (propValue?.constructor === Object || isArray(propValue))
          ? clone2(propValue, depth - 1)
          : propValue;
    }
    return clone;
  }
  return template;
};

export let push2: {
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
    return target == null ? target : target[pushSymbol](items);
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      push2(target, ...items)
    );
  }
};

export const dict2: {
  <Source extends MapSource<K, V>, K, V>(source: Source): Source extends Nullish
    ? Source
    : ObjectSourceToObject<Source>;
  <
    Source extends IterationSource,
    Projected extends readonly [K, V] | Nullish,
    Accumulator extends Projected,
    Signal extends typeof skip2 | typeof stop2 | never,
    K,
    V
  >(
    source: Source,
    projection: IterationProjection2<Source, Accumulator, Projected | Signal>
  ): Source extends Nullish
    ? Source
    : MapFromEntries<IterationProjected<Projected>>;
} = (source: any, projection?: any) => {
  const target = new Map();
  forEach2(
    source,
    projection
      ? (item, index, seed) =>
          (item = projection(item, index, seed)) &&
          (typeof item !== "symbol" || (item !== skip2 && item !== stop2))
            ? target.set(item[0], item[1])
            : item
      : (item) =>
          item &&
          (typeof item !== "symbol" || (item !== skip2 && item !== stop2))
            ? target.set(item[0], item[1])
            : item
  );
  return target;
};

export const obj2: {
  <Source extends ObjectSource<K, V>, K extends keyof any, V>(
    source: Source
  ): Source extends Nullish ? Source : ObjectSourceToObject<Source>;
  <
    Source extends IterationSource,
    Projected extends KeyValueType<K, V> | Nullish,
    Accumulator extends Projected,
    Signal extends typeof skip2 | typeof stop2 | never,
    K extends keyof any,
    V
  >(
    source: Source,
    projection: IterationProjection2<Source, Accumulator, Projected | Signal>
  ): Source extends Nullish
    ? Source
    : ObjectFromEntries<IterationProjected<Projected>>;
} = (source: any, projection?: any) => {
  const target = {};
  forEach2(
    source,
    projection
      ? (item, index, seed) =>
          (item = projection(item, index, seed)) &&
          (typeof item !== "symbol" || (item !== skip2 && item !== stop2))
            ? (target[item[0]] = item[1])
            : item
      : (item) =>
          item &&
          (typeof item !== "symbol" || (item !== skip2 && item !== stop2))
            ? (target[item[0]] = item[1])
            : item
  );
  return target;
};

export let assign2: {
  <Target, Its extends readonly AssignSource<Target>[]>(
    target: Target,
    ...sources: Its
  ): Target;
} = (target, ...sources) => {
  try {
    if (target?.constructor === Object) {
      forEach2(sources, (source) =>
        forEach2(source!, (kv) => kv && (target[kv[0]] = kv[1]))
      );
    } else {
      forEach2(sources, (source) =>
        forEach2(source, (kv) => kv && target[setSymbol](kv[0], kv[1]))
      );
    }
    return target;
  } catch (e) {
    return ensureAssignImplementations(target, e, () =>
      assign2(target, ...sources)
    );
  }
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
   * Don't merge the value from the other object(s) if the target already has a value.
   */
  overwrite?: Overwrite;
  /**
   * Overwrite `null` as if it was `undefined` when merging with `overwrite: false`.
   * @default false
   */
  nulls?: boolean;
}
export const merge2: {
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

  for (const source of iterable2(sources)) {
    forEach2(source, (kv) => {
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
        merge2(current, value, options);
      } else if (overwrite) {
        target[key] = value;
      }
    });
  }
  return target;
};

export const pick2: {
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
    : (obj2(keys, (key) =>
        // The first check is presumably faster than the `in` operator.
        target[key as any] !== void 0 || key in target
          ? [key, target[key as any]]
          : skip2
      ) as any);

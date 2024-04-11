import { isDefined, isUndefined } from ".";

type OptionalKey<K extends readonly [any, any]> = readonly [
  level1: K[0] | undefined,
  level2: K[1] | undefined
];
type Key<K extends readonly [any, any]> = readonly [level1: K[0], level2: K[1]];

export class TupleMap<
  K extends readonly [any, any] = readonly [any, any],
  V = any
> extends Map<K, V> {
  private readonly _instances = new Map<K[0], Map<K[1], K>>();

  private _tupleInstance(key: K) {
    let map = this._instances.get(key[0]);
    !map && this._instances.set(key[0], (map = new Map()));
    return map.get(key[1]) ?? (map.set(key[1], (key = [...key])), key);
  }

  clear() {
    super.clear();
    this._instances.clear();
  }

  delete(key: K): boolean {
    if (super.delete(this._tupleInstance(key))) {
      this._instances.get(key[0])!.delete(key[1]);
      return true;
    }
    return false;
  }

  get(key: K) {
    return super.get(this._tupleInstance(key));
  }

  set(key: K, value: V): this {
    if (isUndefined(value)) {
      this.delete(key);
      return this;
    }

    super.set(this._tupleInstance(key), value);
    return this;
  }
}

export class DoubleMap<
  K extends readonly [any, any] = readonly [any, any],
  V = any
> implements Map<K, V>
{
  private readonly _map: Map<K[0], Map<K[1], V>> = new Map();
  private readonly _reverse: Map<K[1], Set<K[0]>> | undefined;

  private _size = 0;

  constructor(optimizeReverseLookup = false) {
    if (optimizeReverseLookup) {
      this._reverse = new Map();
    }
  }

  public clear() {
    if (!this._size) {
      return false;
    }
    this._size = 0;
    this._reverse?.clear();
    this._map.clear();
    return true;
  }

  private _cleanDelete(key: Key<K>, map = this._map.get(key[0])) {
    if (!map) return false;

    if (map.delete(key[1])) {
      if (!map.size) this._map.delete(key[0]);
      this._reverse?.delete(key[0]);
      --this._size;
      return true;
    }
    return false;
  }

  /**
   * @returns true if an element in the TupleMap existed and has been removed, or false if the element does not exist.
   */
  public delete(key: OptionalKey<K>): boolean {
    if (isDefined(key[0])) {
      if (isDefined(key[1])) {
        return this._cleanDelete(key);
      }
      if (!this._reverse) {
        this._size -= this._map.get(key[0])?.size ?? 0;
        return this._map.delete(key[0]);
      }
    } else if (isUndefined(key[1])) {
      return this.clear();
    }

    let deleted = false;
    for (const [target] of this.iterate(key)) {
      deleted = this._cleanDelete(target) || deleted;
    }

    return deleted;
  }
  /**
   * Executes a provided function once per each key/value pair in the TupleMap, unlike a normal Map, not in strict insertion order.
   * The insert order by key at a higher levels is guaranteed (this class is effectively just a nested map).
   */
  public forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void) {
    this._map.forEach((map, key1) =>
      map.forEach((value, key2) => callbackfn(value, [key1, key2] as any, this))
    );
  }

  /**
   * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
   * @returns Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
   */
  get(key: Key<K>) {
    return this._map.get(key[0])?.get(key[1]);
  }

  getMap(key: K[0]): ReadonlyMap<K[1], V> | undefined {
    return this._map.get(key);
  }

  /**
   * @returns boolean indicating whether an element with the specified key exists or not.
   */
  has(key: Key<K>) {
    return this._map.get(key[0])?.has(key[1]) ?? false;
  }
  /**
   * Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated.
   * If the value is undefined, the key will get deleted.
   */
  set(key: K, value: V | undefined): this {
    let map = this._map.get(key[0]);
    if (value === undefined) {
      this._cleanDelete(key, map);
    } else {
      if (!map) {
        this._map.set(key[0], (map = new Map()));
      }
      if (!map.has(key[1])) {
        if (this._reverse) {
          let set = this._reverse.get(key[1]);
          if (!set) {
            this._reverse.set(key[1], (set = new Set()));
          }
          set.add(key[0]);
        }
        ++this._size;
      }
      map.set(key[1], value);
    }
    return this;
  }
  /**
   * @returns the number of elements in the Map.
   */
  public get size() {
    return this._size;
  }

  public *iterate(filter?: OptionalKey<K>): Iterable<readonly [Key<K>, V]> {
    if (!filter || (isUndefined(filter[0]) && isUndefined(filter[1]))) {
      yield* this;
    } else {
      const [key1Filter, key2Filter] = filter;
      if (isDefined(key1Filter)) {
        const map = this._map.get(filter[0]);
        if (!map) {
          return;
        }
        if (isDefined(key2Filter)) {
          const value = map.get(key2Filter);
          if (value) {
            yield [filter, value];
          }
          return;
        }
        for (const [key2, value] of map) {
          yield [[key1Filter, key2], value];
        }
        return;
      }
      if (this._reverse) {
        for (const key1 of this._reverse.get(filter[1])!) {
          yield [[key1, key2Filter], this._map.get(key1)!.get(filter[1])!];
        }
        return;
      }
      for (const [key1, map] of this._map) {
        for (const [key2, value] of map) {
          if (key2 === key2Filter) {
            yield [[key1, key2], value];
          }
        }
      }
    }
  }

  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }

  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  get [Symbol.toStringTag]() {
    return `Map`;
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    for (const [key1, values] of this._map) {
      for (const [key2, value] of values) {
        yield [[key1, key2] as any, value];
      }
    }
  }
}

import { Expand } from ".";
import { Encodable, EncodableObject } from "@tailjs/util/transport";

export function any<T>(
  value: T
): value is T extends null | undefined ? never : T {
  if (typeof value !== "object") {
    return Array.isArray(value) ? value.length > 0 : value != null;
  }

  for (const _ in value) {
    return true;
  }
  return false;
}

export function stringVal(
  value: string | string[] | undefined | null,
  sep = ";"
) {
  return value == null ? value : Array.isArray(value) ? value.join(sep) : value;
}

function* countYields<T>(items: Iterable<T>) {
  let n = 0;
  for (const item of items) {
    yield item;
    ++n;
  }
  return n;
}

function* iterateObject<K extends keyof any, V, T extends Record<K, V>, R>(
  source: T,
  projection: (src: T, key: K) => R
): Iterable<R> {
  let i = 0;
  for (const p in source) {
    yield projection(source, p as any);
    ++i;
  }
  return i;
}

type CleanPartitions<T> = {
  [P in keyof T]: T[P] extends infer T & never[] ? T : T;
};

export function keys<K extends keyof any, V>(
  source: Record<K, V>
): Iterable<K> {
  return iterateObject(source, (src, key) => key) as any;
}

export function values<K extends keyof any, V>(
  source: Record<K, V>
): Iterable<V> {
  return iterateObject(source, (src, key) => src[key]);
}

export function entries<K extends keyof any, V>(
  source?: Record<K, V>
): Iterable<[K, V]> {
  return source == null
    ? []
    : (iterateObject(source, (src, key) => [key, src[key]]) as any);
}

export const isIterable = (value: any): value is Iterable<any> =>
  value[Symbol.iterator] !== void 0;

export type GroupFunction = {
  <K, V>(
    ...values: (Iterable<[K, Iterable<V | undefined>]> | undefined)[]
  ): Map<K, V[]>;
  <K, V>(...values: (Iterable<[K, V]> | undefined)[]): Map<K, V[]>;
};
export const group = (<K, V>(...values: Iterable<[K, V]>[]): Map<K, any> => {
  const groups = new Map<K, V[]>();
  for (const src of values) {
    if (src === undefined) continue;

    for (const [key, value] of src) {
      let current = groups.get(key);
      if (current === undefined) {
        groups.set(key, (current = []));
      }
      if (isIterable(value)) {
        current.push(...value);
      } else {
        current.push(value);
      }
    }
  }
  return groups;
}) as GroupFunction;

type FlatItem<T> = T extends (infer T)[] ? T : T;

type ReturnType<RT extends number, Flat extends boolean, T> = Flat extends true
  ? ReturnType<RT, false, FlatItem<T>>
  : RT extends 0
  ? T[]
  : RT extends 1
  ? Iterable<T> & { flat(): T extends (infer T)[] ? T : T }
  : void;

export type MapFunction<RT extends 0 | 1 | 2, Flat extends boolean = false> = {
  <T, P = T>(
    values: Iterable<T> | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
  <T extends string | number | boolean, P = T>(
    values: Iterable<T> | T | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
  <K extends keyof any, V, P = [K, V]>(
    values: Iterable<[K, V]> | Record<K, V> | null | undefined,
    projection?: ((value: [K, V], index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
  <T, P = T>(
    values: Iterable<T> | T | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
};

export const flat: MapFunction<0, true> & { it: MapFunction<1, true> } =
  Object.assign((...args: any[]) => [...(flat.it as any)(...args)], {
    *it(...args: any) {
      for (const item in (map as any).it(...args)) {
        if (Array.isArray(item)) {
          yield* item;
        } else {
          yield item;
        }
      }
    },
  }) as any;

export const map: MapFunction<0> & {
  it: MapFunction<1>;
} = Object.assign((...args: any[]) => [...(map.it as any)(...args)], {
  *it(values: Iterable<any>, projection?: (value: any, index: number) => any) {
    if (!values) return 0;
    const length = values["length"] ?? values["count"] ?? values["Count"];
    if (typeof length === "number") {
      const newValues: any[] = [];
      for (let i = 0; i < length; i++) {
        newValues[i] = values[i];
      }
      values = newValues;
    }

    const iterable = (
      values[Symbol.iterator]
        ? values
        : typeof values === "object"
        ? Object.entries(values)
        : [values]
    ) as Iterable<any>;

    if (!projection) {
      return yield* countYields<any>(iterable);
    }

    let i = 0;
    let n = 0;

    for (const value of iterable) {
      const projected = projection(value, i++);
      if (projected === void 0) continue;
      if (Array.isArray(projected["flat"])) {
        for (const value of projected["flat"]) {
          yield value;
        }
      }

      yield projected;
      ++n;
    }
    return n;
  },
}) as any;

export const filter = merge(
  <T>(
    values: Iterable<T> | null | undefined,
    evaluate: ((value: T, index: number) => boolean) | null | undefined
  ) => [...filter.it(values, evaluate)],
  {
    *it<T>(
      values: Iterable<T> | null | undefined,
      evaluate: ((value: T, index: number) => boolean) | null | undefined
    ) {
      if (!values) {
        return 0;
      }
      if (!evaluate) {
        return yield* countYields(values);
      }

      let i = 0;
      let n = 0;
      for (const value of values) {
        if (evaluate(value, i++)) {
          ++n;
          yield value;
        }
      }
      return n;
    },
  }
);

export const forEach: MapFunction<2> = (values: any, action: any) => {
  let i = 0;
  for (const v of map.it(values)) {
    action(v, i++);
  }
};

type Join<T extends any[]> = T extends [infer T]
  ? T
  : T extends [...infer Tail, infer T]
  ? T & Join<Tail>
  : never;

export function merge<T extends any[]>(...args: T): Expand<Join<T>> {
  let target = args[0];
  for (const source of args.slice(1)) {
    for (const [key, value] of Object.entries(source)) {
      if (value === void 0) {
        // delete target[key];
      } else if (typeof target[key] === "object" && typeof value === "object") {
        if (Object.getPrototypeOf(value) === Object.prototype) {
          merge(target[key], value);
        } else {
          target[key] = value;
        }
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}

export const params = (
  value: string | string[] | null | undefined,
  decode = true
): [string, string][] => {
  if (!value) return [];

  return Array.isArray(value) ? value.map(split) : [split(value)];

  function split(value: string) {
    const parts = value
      .split("=")
      .map((v) => (decode ? decodeURIComponent(v.trim()) : v.trim()));
    parts[1] ??= "";
    return parts as [string, string];
  }
};

export const unparam = (
  value: Record<string, string | null | undefined> | null | undefined,
  encode = true
) => {
  if (!value) return "";
  return map(value, ([key, value]) =>
    value
      ? `${encode ? encodeURIComponent(key) : key}=${
          encode ? encodeURIComponent(value) : value
        }`
      : key
  ).join("; ");
};

export const tryParse = <T>(
  value: string | undefined,
  update: (value: T | null) => T
) => (value ? update(JSON.parse(value)) : update(null));

export const expandPaths = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = key.split(".");
    let target = result;
    for (let i = 0; i < path.length; i++) {
      if (i < path.length - 1) {
        target = target[path[i]] ??= {};
      } else {
        target[path[i]] = value;
      }
    }
  }
  return result;
};

export const replace = <T extends string | null>(
  s: T,
  replacements: [from: string, to: string][],
  encode: boolean
): T extends null ? T : string =>
  s == null
    ? (null as any)
    : replacements.reduce(
        (s, [from, to]) => s.replaceAll(encode ? from : to, encode ? to : from),
        s
      );

export const formatError = (error: any) =>
  error == null
    ? "(Unspecified error)"
    : [error?.message ?? error, error?.stack].filter((s) => s).join("\n\n");

export const clone = <T extends Encodable>(value: T): T =>
  value == null
    ? value
    : Array.isArray(value)
    ? value.map(clone)
    : typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value).map(([key, value]) => [key, clone(value)])
      )
    : (value as any);

export const equals = (lhs: Encodable, rhs: Encodable) =>
  lhs === rhs ||
  (Array.isArray(lhs) || Array.isArray(rhs)
    ? Array.isArray(lhs) &&
      Array.isArray(rhs) &&
      lhs.length === rhs.length &&
      lhs.every((value, index) => equals(value, rhs[index]))
    : typeof lhs === "object" && typeof rhs === "object"
    ? objectsEqual(lhs, rhs)
    : false);

export const objectsEqual = (
  lhs: EncodableObject | null,
  rhs: EncodableObject | null
) => {
  if (lhs === rhs || lhs == null || rhs == null) return lhs === rhs;
  const leftEntries = Object.entries(lhs);
  const rightEntries = Object.entries(rhs);
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value], index) =>
        rightEntries[index][0] === key && equals(value, rightEntries[index][1])
    )
  );
};

export interface Timer {
  start(): this;
  stop(): this;
  reset(): this;

  print(milestone?: string): this;
}

export const timer = (name: string): Timer => {
  let elapsed = 0;

  let t0: number | null = null;

  const timer = {
    start() {
      t0 ??= Date.now();
      return timer;
    },
    stop() {
      t0 != null && ((elapsed += Date.now() - t0), (t0 = null));
      return timer;
    },
    reset() {
      elapsed = 0;
      t0 !== null && (t0 = Date.now());
      return this;
    },
    print(milestone?: string) {
      t0 !== null && ((elapsed += Date.now() - t0), (t0 = Date.now()));
      console.log(
        `${name}${milestone ? ` (${milestone})` : ""}: ${elapsed} ms.`
      );
      return timer;
    },
  };
  return timer;
};

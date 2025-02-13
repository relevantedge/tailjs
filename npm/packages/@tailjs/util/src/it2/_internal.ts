import {
  Falsish,
  IteratorItem2,
  MaybeNullishOrFalse,
  Nullish,
  SimpleObject,
  UnionToIntersection,
} from "..";

/** Encourages TypeScript to treat a return value as a tuple (for some reason also, if the tuple has more than one element). */
export type AnyTuple =
  | readonly [any]
  | readonly [any][]
  | readonly [any][][]
  | readonly [any][][][]
  | readonly [any][][][][];

export type EncourageTuples<T> = T | (T & AnyTuple);

export type AllowAdditionalElements<T extends readonly any[]> =
  number extends T["length"] ? T : [...T, ...any];

export type KeyValueType<K = keyof any, V = any> = readonly [K, V];
export type KeyValueTypeLike<K = keyof any, V = any> = readonly [K, V, ...any];

export type UnknownIsOkay<R, V> = R extends undefined
  ? R
  : unknown extends V
  ? any
  : R extends V
  ? R
  : V & R extends never[]
  ? R
  : never;

export type NeverIsAny<T> = T extends never[]
  ? any[]
  : unknown extends T
  ? any
  : [T] extends [never]
  ? any
  : T;

export type NotMapOrSet<T> = T extends
  | ReadonlyMap<any, any>
  | WeakMap<any, any>
  | ReadonlySet<any>
  | WeakSet<any>
  ? never
  : T;

export type RecordKeyOf<T> = T extends infer T ? keyof T : never;

export type Selector<T = any> =
  | RecordKeyOf<T>
  | ((item: T, ...args: any) => any)
  | Nullish;

export type EntriesOf<T> = { [P in keyof T]-?: [P, T[P]] }[keyof T];

type StringOrNumber<Z> =
  | Z
  | (Z extends `${infer N extends number}` ? N : never);

export type KeyTypeOf<T> = unknown extends T
  ? any
  : T extends Nullish
  ? never
  : T extends Map<infer K, any>
  ? K
  : T extends WeakMap<infer K, any>
  ? K
  : T extends Set<infer K>
  ? K
  : T extends WeakSet<infer K>
  ? K
  : T extends readonly any[]
  ? StringOrNumber<keyof T & `${number}`>
  : keyof T;

export type InputValueTypeOf<T, K = KeyTypeOf<T>> = unknown extends T
  ? any
  : T extends Set<any>
  ? unknown
  : ValueTypeOf<T, K>;

export type ValueTypeOf<T, K = KeyTypeOf<T>> = unknown extends T
  ? any
  : T extends Map<infer MapKey, infer V>
  ? K extends MapKey
    ? V | undefined
    : never
  : T extends WeakMap<infer MapKey, infer V>
  ? K extends MapKey
    ? V | undefined
    : never
  : T extends Set<any> | WeakSet<any>
  ? boolean
  : T extends Nullish
  ? never
  : unknown extends K
  ? T[KeyTypeOf<T> & keyof T]
  : K extends KeyTypeOf<T>
  ? T[K & keyof T]
  : never;

export type EntryTypeOf<Source> = unknown extends Source
  ? readonly [any, any]
  : KeyTypeOf<Source> extends infer K
  ? readonly [K, ValueTypeOf<Source, K>]
  : never;

export type ObjectFromEntries<Entries extends KeyValueTypeLike | Nullish> =
  UnionToIntersection<
    Entries extends readonly [infer Key extends keyof any, infer Value, ...any]
      ? { [P in Key]: Value }
      : {}
  > extends infer T
    ? { [P in keyof T]: T[P] }
    : never;

export type ObjectSourceToObject<Source> = Source extends Falsish
  ? {}
  : Source extends Iterable<Falsish | infer Kv extends KeyValueTypeLike>
  ? ObjectFromEntries<Kv>
  : Source;

export type IterationResultArray<It> = MaybeNullishOrFalse<
  [IteratorItem2<It>] extends [never] ? undefined : IteratorItem2<It>[],
  It
>;

export type DefaultAssignValue<
  T,
  K extends KeyTypeOf<T> = KeyTypeOf<T>
> = T extends Set<any> | WeakSet<any>
  ? true
  : undefined extends ValueTypeOf<T, K>
  ? undefined
  : never;

/** Converts generic types with `any` parameters to their specific types. E.g. Map<any,any> to Map<string,number>.  */
export type ToSpecificGenericType<Value, SpecificType> =
  SpecificType extends infer SpecificType
    ? Value extends SpecificType
      ? SpecificType
      : never
    : never;

/** Wraps the value in a promise if the function is async.  */
export type PromiseIfAsync<Value, F> = F extends (...args: any) => infer R
  ? unknown extends R
    ? any
    : R extends PromiseLike<any>
    ? Promise<Value>
    : Value
  : never;

// #region region_simple_objects

type SpecificKeys<K extends keyof any> = K extends keyof any
  ? string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K
  : never;

type GenericKeys<K extends keyof any> = K extends keyof any
  ? string extends K
    ? K
    : number extends K
    ? K
    : symbol extends K
    ? K
    : never
  : never;

type OptionalKeys<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]?: T[K] } extends Pick<T, K>
    ? K
    : never
  : never;

type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

type _DispatchMergeRecords<T1, T2, MergeRecords, Overwrite, OverwriteNulls> =
  T1 extends Falsish
    ? T1
    : T2 extends Falsish
    ? T2
    : _MergeRecords2<T1, T2, MergeRecords, Overwrite, OverwriteNulls>;

type _MergeRecordsIfRecords<
  T1P,
  T2P,
  Deep,
  Overwrite,
  OverwriteNulls,
  Default
> = Deep extends true
  ? T1P extends SimpleObject
    ? T2P extends SimpleObject
      ? _DispatchMergeRecords<T1P, T2P, true, Overwrite, OverwriteNulls>
      : Default
    : Default
  : Default;

type _OverwriteNull<V1, V2, Toggle> = Toggle extends true
  ? V1 extends null
    ? V2
    : V1
  : V1;
type _MergeRecords2<
  T1,
  T2,
  Deep,
  Overwrite,
  OverwriteNulls,
  O1 extends keyof T1 = OptionalKeys<T1>,
  O2 extends keyof T2 = OptionalKeys<T2>,
  R1 extends keyof T1 = RequiredKeys<T1>,
  R2 extends keyof T2 = RequiredKeys<T2>
> = Pick<T1, Exclude<keyof T1, SpecificKeys<keyof T2>>> &
  Pick<T2, Exclude<keyof T2, SpecificKeys<keyof T1>>> & {
    // Resulting property may be optional only if both optional in T1 and T2
    [P in O1 & O2]?:
      | _OverwriteNull<T1[P], T2[P], OverwriteNulls>
      | T2[P]
      | _MergeRecordsIfRecords<
          T1[P],
          T2[P],
          Deep,
          Overwrite,
          OverwriteNulls,
          never
        >;
  } & {
    // Can only be T1 if overwrite=false
    [P in O1 & R2]:
      | T2[P]
      | _MergeRecordsIfRecords<
          T1[P],
          T2[P],
          Deep,
          Overwrite,
          OverwriteNulls,
          Overwrite extends false
            ? Exclude<
                _OverwriteNull<T1[P], T2[P], OverwriteNulls>,
                SimpleObject | undefined
              >
            : never
        >;
  } & {
    // Will never be T2 if overwrite=false
    [P in R1 & O2]:
      | _OverwriteNull<T1[P], T2[P], OverwriteNulls>
      | _MergeRecordsIfRecords<
          T1[P],
          T2[P],
          Deep,
          Overwrite,
          OverwriteNulls,
          Overwrite extends false ? never : Exclude<T2[P], SimpleObject>
        >;
  } & {
    // Overwrite decides whether the value is T1 or T2
    [P in R1 & R2]: _MergeRecordsIfRecords<
      T1[P],
      T2[P],
      Deep,
      Overwrite,
      OverwriteNulls,
      Exclude<
        Overwrite extends false
          ?
              | _OverwriteNull<T1[P], T2[P], OverwriteNulls>
              | T2[GenericKeys<R1> & keyof T2]
          :
              | _OverwriteNull<
                  T1[GenericKeys<R2> & keyof T1],
                  T2[P],
                  OverwriteNulls
                >
              | T2[P],
        SimpleObject
      >
    >;
  } extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

export type MergeObjectSources<
  Target,
  Sources,
  Deep,
  Overwrite,
  OverwriteNulls
> = (
  Sources extends readonly [infer T, ...infer Rest]
    ? T extends infer T
      ? MergeObjectSources<
          _DispatchMergeRecords<
            Target,
            ObjectSourceToObject<T>,
            Deep,
            Overwrite,
            OverwriteNulls
          >,
          Rest,
          Deep,
          Overwrite,
          OverwriteNulls
        >
      : never
    : Sources extends Falsish | readonly []
    ? Target
    : _DispatchMergeRecords<
        Target,
        ObjectSourceToObject<Sources>,
        Deep,
        Overwrite,
        OverwriteNulls
      >
) extends infer T
  ? { [P in keyof T]: T[P] }
  : never;

// #endregion

const getRootPrototype = (value: any) => {
  let proto = value;
  while (proto) {
    proto = Object.getPrototypeOf((value = proto));
  }
  return value;
};
const findPrototypeFrame = (
  frameWindow: Window | null,
  matchPrototype: any
) => {
  if (!frameWindow || getRootPrototype(frameWindow) === matchPrototype) {
    return frameWindow;
  }
  for (const frame of frameWindow.document.getElementsByTagName("iframe")) {
    try {
      if (
        (frameWindow = findPrototypeFrame(frame.contentWindow, matchPrototype))
      ) {
        return frameWindow;
      }
    } catch (e) {
      // Cross domain issue.
    }
  }
};

/**
 * When in iframes, we need to copy the prototype methods from the global scope's prototypes since,
 * e.g., `Object` in an iframe is different from `Object` in the top frame.
 */
export const findDeclaringScope = (target: any) =>
  target == null
    ? target
    : globalThis.window
    ? findPrototypeFrame(window, getRootPrototype(target))
    : globalThis;

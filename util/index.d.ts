/** Encourages TypeScript to treat a return value as a tuple (for some reason also, if the tuple has more than one element). */
type AnyTuple = readonly [any] | readonly [any][] | readonly [any][][] | readonly [any][][][] | readonly [any][][][][];
type EncourageTuples<T> = T | (T & AnyTuple);
type AllowAdditionalElements<T extends readonly any[]> = number extends T["length"] ? T : [...T, ...any];
type KeyValueType<K = keyof any, V = any> = readonly [K, V];
type KeyValueTypeLike<K = keyof any, V = any> = readonly [K, V, ...any];
type RecordKeyOf<T> = T extends infer T ? keyof T : never;
type Selector<T = any> = RecordKeyOf<T> | ((item: T, ...args: any) => any) | Nullish;
type EntriesOf<T> = {
    [P in keyof T]-?: [P, T[P]];
}[keyof T];
/** This is sometimes needed in conjunction with KeyTypeOf, since the `infer K` tests confuses TypeScript so it gets K to be any key
 *  of a record when later used in ValueTypeOf.
 *
 * Example:
 * `const x = {a: true, b: 37}; exchange(x, "a", undefined);`
 * If `exchange` didn't have two overloads (one where Target is constrained to LookupType) and one using keyof T, the return value
 * would here be `boolean | number`.
 */
type LookupType = Map<any, any> | ReadonlyMap<any, any> | WeakMap<any, any> | ReadonlySet<any> | Set<any> | WeakSet<any>;
type KeyTypeOf<T> = unknown extends T ? any : T extends Nullish ? never : T extends Map<infer K, any> ? K : T extends WeakMap<infer K, any> ? K : T extends Set<infer K> ? K : T extends WeakSet<infer K> ? K : keyof T;
type InputValueTypeOf<T, K = KeyTypeOf<T>> = unknown extends T ? any : T extends Set<any> ? unknown : ValueTypeOf<T, K>;
type ValueTypeOf<T, K = KeyTypeOf<T>> = unknown extends T ? any : T extends Map<infer MapKey, infer V> ? K extends MapKey ? V | undefined : never : T extends WeakMap<infer MapKey, infer V> ? K extends MapKey ? V | undefined : never : T extends Set<any> | WeakSet<any> ? boolean : T extends Nullish ? never : unknown extends K ? T[KeyTypeOf<T> & keyof T] : K extends KeyTypeOf<T> ? T[K & keyof T] : never;
type EntryTypeOf<Source> = unknown extends Source ? readonly [any, any] : KeyTypeOf<Source> extends infer K ? readonly [K, ValueTypeOf<Source, K>] : never;
type ObjectFromEntries<Entries extends KeyValueTypeLike<any, any> | Nullish> = UnionToIntersection<Entries extends readonly [infer Key extends keyof any, infer Value, ...any] ? {
    [P in Key]: Value;
} : {}> extends infer T ? {
    [P in keyof T]: T[P];
} : never;
type MapFromEntries<Entries extends readonly [any, any] | Nullish> = [
    Entries extends readonly [infer Key, infer Value] ? [Key, Value] : [never, never]
] extends [[infer Key, infer Value]] ? Map<Key, Value> : never;
type ObjectSourceToObject<Source> = Source extends Falsish ? {} : Source extends Iterable<Falsish | infer Kv extends KeyValueTypeLike> ? ObjectFromEntries<Kv> : Source;
type IterationResultArray<It> = MaybeNullishOrFalse<[
    IteratorItem<It>
] extends [never] ? undefined : IteratorItem<It>[], It>;
type SpecificKeys<K extends keyof any> = K extends keyof any ? string extends K ? never : number extends K ? never : symbol extends K ? never : K : never;
type GenericKeys<K extends keyof any> = K extends keyof any ? string extends K ? K : number extends K ? K : symbol extends K ? K : never : never;
type OptionalKeys<T, K extends keyof T = keyof T> = K extends keyof T ? {
    [P in K]?: T[K];
} extends Pick<T, K> ? K : never : never;
type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;
type _DispatchMergeRecords<T1, T2, MergeRecords, Overwrite, OverwriteNulls> = T1 extends Falsish ? T2 : T2 extends Falsish ? T1 : _MergeRecords<T1, T2, MergeRecords, Overwrite, OverwriteNulls>;
type _MergeRecordsIfRecords<T1P, T2P, Deep, Overwrite, OverwriteNulls, Default> = Deep extends true ? T1P extends SimpleObject ? T2P extends SimpleObject ? _DispatchMergeRecords<T1P, T2P, true, Overwrite, OverwriteNulls> : Default : Default : Default;
type _OverwriteNull<V1, V2, Toggle> = Toggle extends true ? V1 extends null ? V2 : V1 : V1;
type _MergeRecords<T1, T2, Deep, Overwrite, OverwriteNulls, O1 extends keyof T1 = OptionalKeys<T1>, O2 extends keyof T2 = OptionalKeys<T2>, R1 extends keyof T1 = RequiredKeys<T1>, R2 extends keyof T2 = RequiredKeys<T2>> = Pick<T1, Exclude<keyof T1, SpecificKeys<keyof T2>>> & Pick<T2, Exclude<keyof T2, SpecificKeys<keyof T1>>> & {
    [P in O1 & O2]?: _OverwriteNull<T1[P], T2[P], OverwriteNulls> | T2[P] | _MergeRecordsIfRecords<T1[P], T2[P], Deep, Overwrite, OverwriteNulls, never>;
} & {
    [P in O1 & R2]: T2[P] | _MergeRecordsIfRecords<T1[P], T2[P], Deep, Overwrite, OverwriteNulls, Overwrite extends false ? Exclude<_OverwriteNull<T1[P], T2[P], OverwriteNulls>, SimpleObject | undefined> : never>;
} & {
    [P in R1 & O2]: _OverwriteNull<T1[P], T2[P], OverwriteNulls> | _MergeRecordsIfRecords<T1[P], T2[P], Deep, Overwrite, OverwriteNulls, Overwrite extends false ? never : Exclude<T2[P], SimpleObject>>;
} & {
    [P in R1 & R2]: _MergeRecordsIfRecords<T1[P], T2[P], Deep, Overwrite, OverwriteNulls, Exclude<Overwrite extends false ? _OverwriteNull<T1[P], T2[P], OverwriteNulls> | T2[GenericKeys<R1> & keyof T2] : _OverwriteNull<T1[GenericKeys<R2> & keyof T1], T2[P], OverwriteNulls> | T2[P], SimpleObject>>;
} extends infer T ? {
    [P in keyof T]: T[P];
} : never;
type MergeObjectSources<Target, Sources, Deep, Overwrite, OverwriteNulls> = (Sources extends readonly [infer T, ...infer Rest] ? T extends infer T ? MergeObjectSources<_DispatchMergeRecords<Target, ObjectSourceToObject<T>, Deep, Overwrite, OverwriteNulls>, Rest, Deep, Overwrite, OverwriteNulls> : never : Sources extends Falsish | readonly [] ? Target : _DispatchMergeRecords<Target, ObjectSourceToObject<Sources>, Deep, Overwrite, OverwriteNulls>) extends infer T ? {
    [P in keyof T]: T[P];
} : never;

type IterationProjection<It, Accumulator, Projected, Context = It> = (item: IteratorItem<It>, index: number, accumulator: unknown extends Accumulator ? any : Accumulator, context: Context) => Projected | typeof skip | typeof stop | AnyTuple;
type AsyncIterationSource = MaybePromiseLike<IterationSource | AsyncIterable<any> | Iterable<PromiseLike<any>>>;
type AsyncIterationSourceOf<T> = MaybePromiseLike<IterationSourceOf<T> | AsyncIterable<MaybePromiseLike<T>> | Iterable<PromiseLike<T>>>;
type AsyncIterationItem<It> = It extends PromiseLike<infer T> ? AsyncIterationItem<T> : It extends AsyncIterable<MaybePromiseLike<infer T>> | Iterable<MaybePromiseLike<infer T>> ? T : It extends AsyncIterable<infer T> ? T : IteratorItem<It>;
type AsyncIterationProjection<It, S, R, Context = It> = IterationProjection<Iterable<AsyncIterationItem<It>>, S, MaybePromiseLike<R>, Context>;
type IterationFilterCallback<It> = (item: IteratorItem<It>, index: number, previous: IteratorItem<It> | undefined, context: It) => any;
type IterationTypeGuardCallback<It, R> = (item: IteratorItem<It>, index: number, previous: IteratorItem<It> | undefined, context: It) => item is R & IteratorItem<It>;
type IteratorItem<T> = unknown extends T ? any : T extends Exclude<Falsish, number> ? never : T extends Iterable<infer T> ? T : T extends number ? number : T extends (current?: any) => infer Projected ? Projected : T extends object ? EntriesOf<T> : never;
type IterationSource = (object & Record<any, any>) | Iterable<any> | number | ((current: any) => any) | NullishOrFalse;
type IterationSourceOf<T> = unknown extends T ? IterationSource : [T] extends [never] ? IterationSource : (T extends KeyValueType<infer K extends keyof any, infer V> ? {
    [P in K]: V;
} : never) | (T extends number ? number : never) | ((current: T) => T | undefined) | Iterable<T> | Iterator<T> | Falsish;
type IterationProjected<R, ExcludeTypes = never> = R extends typeof skip | typeof stop ? never : Exclude<R, ExcludeTypes>;
type AsyncItProjection<R> = IterationProjected<UnwrapPromiseLike<R>>;
type AsyncIteratorFactory<T = any, V = any> = (target: T) => MaybePromiseLike<IteratorResult<V>>;
type Sortable = string | boolean | number | Nullish;

declare const stopSymbol: unique symbol;
declare const skip: unique symbol;
declare const stop: (<T = any>(value: T) => T) & typeof stopSymbol;
type ForEachFunction = (target: any, projection: IterationProjection<any, any, any> | undefined, mapped: any[] | undefined, seed: any, context: any) => any;
declare function range(length?: number): Generator<number, void, unknown>;
declare function traverse(next?: <T>(current: T | undefined) => T | Nullish): Generator<any, void, unknown>;
declare const forEach: {
    <Source extends IterationSource>(source: Source): MaybeNullishOrFalse<IteratorItem<Source> | undefined, Source>;
    <Source extends IterationSource, Projected, Signal extends typeof skip | typeof stop | never, Accumulator extends Projected | undefined = undefined, Context = Source>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal, Context> | Nullish, seed?: Accumulator, context?: Context): MaybeNullishOrFalse<IterationProjected<Projected> | Accumulator, Source>;
};
declare let map: {
    <Source extends IterationSource, Projected, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never, // Otherwise Projected may be `symbol`
    Target = undefined, Context = Source>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>, target?: Target & IterationProjected<Projected>[], seed?: Accumulator, context?: Context): MaybeNullishOrFalse<IterationProjected<Projected>[] extends Target ? Target : IterationProjected<Projected>[], Source>;
    <Source extends IterationSourceOf<T>, T, Target = never[]>(source: Source, projection?: undefined | null, target?: Target & T[], seed?: any, context?: any): Target extends never[] ? IterationResultArray<Source> : Target;
};
declare const batch: <T, Arg>(source: Arg & Iterable<T>, batchSize: number) => MaybeNullish<T[][], Arg>;
type FilterTruish<T extends readonly any[]> = T extends readonly [
    infer T,
    ...infer Rest
] ? T extends Falsish ? FilterTruish<Rest> : [T, ...FilterTruish<Rest>] : T extends readonly [] ? [] : T extends readonly (infer T)[] ? Exclude<T, Falsish>[] : never;
/** Creates an array with the parameters that are not false'ish */
declare const truish: {
    <Values extends TupleOrArray<{} | Falsish>>(values: Values): FilterTruish<Values>;
    <Values extends readonly ({} | Falsish)[]>(...values: Values): FilterTruish<Values>;
};
declare let filter: {
    <Source extends IterationSource, Strict extends boolean = true>(target: Source, 
    /**
     * Whether to filter out only `null` and `undefined` or all false'ish values (`null`, `undefined`, `false`, `""` and `0`).
     * If the latter behavior is preferred, you can also use {@link truish}.
     *
     * @default true
     */
    strict?: Strict): MaybeNullishOrFalse<Exclude<IteratorItem<Source>, typeof skip | typeof stop | (Strict extends true ? Nullish : Falsish)>[], Source>;
    <Source extends IterationSource, R extends Exclude<IteratorItem<Source>, typeof skip | typeof stop | Falsish>>(target: Source, filter: IterationTypeGuardCallback<Source, R>, invert?: boolean): MaybeNullishOrFalse<R[], Source>;
    <Source extends IterationSource>(target: Source, filter: IterationFilterCallback<Source>, invert?: boolean): IterationResultArray<Source>;
    <Source extends IterationSource>(target: Source, filter: {
        has(item: Exclude<IteratorItem<Source>, Nullish>): any;
    }, invert?: boolean): MaybeNullishOrFalse<IteratorItem<Exclude<Source, NullishOrFalse>>[], Source>;
};
declare const take: {
    <Source extends IterationSource>(source: Source, count: number, projection?: undefined): IterationResultArray<Source>;
    <Source extends IterationSource, Projected, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never>(source: Source, count: number, projection: IterationProjection<Source, Accumulator, Projected | Signal>): MaybeNullishOrFalse<IterationProjected<Projected>[], Source>;
};
declare const first: {
    <Source extends IterationSource, R>(source: Source, predicate: IterationTypeGuardCallback<Source, R>): R | undefined;
    <Source extends IterationSource>(source: Source, predicate?: IterationFilterCallback<Source>): IteratorItem<Source> | undefined;
};
declare const last: {
    <Source extends IterationSource, R>(source: Source, predicate: IterationTypeGuardCallback<Source, R>): R | undefined;
    <Source extends IterationSource>(source: Source, predicate?: IterationFilterCallback<Source>): IteratorItem<Source> | undefined;
};
declare const count: <Source extends IterationSource>(source: Source, predicate?: IterationFilterCallback<Source>) => number;
type Ones<N extends number, A extends number[] = []> = A["length"] extends N ? A : Ones<N, [...A, 1]>;
type Dec<A extends number> = A extends 0 ? -1 : `${A}` extends `-${infer _}` ? -1 : Ones<A> extends [any, ...infer Rest] ? Rest["length"] : never;
type Flat<T, Depth extends number> = Depth extends 0 ? T : T extends string ? T : T extends Iterable<infer T> ? Flat<T, Dec<Depth>> : T;
declare const flatMap: {
    <Source extends IterationSource, Projected, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never, // Otherwise R may be `symbol`
    Target = undefined, Context = Source, Depth extends number = -1>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>, depth?: Depth, target?: Target & Flat<IterationProjected<Projected>, Depth>[], seed?: Accumulator, context?: Context): MaybeNullishOrFalse<Flat<IterationProjected<Projected>, Depth>[] extends Target ? Target : Flat<IterationProjected<Projected>, Depth>[], Source>;
    <Source extends IterationSource, Depth extends number = -1>(source: Source, projection?: Nullish, depth?: Depth, target?: any[], seed?: any, context?: any): Source extends Nullish ? Source : Flat<IteratorItem<Source>, Depth>[];
};
type Group2Result<Source, AsMap, Many = true> = AsMap extends true ? Source extends Iterable<infer T extends KeyValueType<any>> ? Map<Exclude<T[0], undefined>, ToggleArray<T[1], Many>> : Source extends {
    [P in infer Key]: infer Value;
} ? Map<Key, ToggleArray<Value, Many>> : never : Source extends Iterable<infer T extends KeyValueType> ? {
    [P in Exclude<T[0], undefined>]: ToggleArray<T[1], Many>;
} : Source extends {
    [P in infer Key]: infer Value;
} ? {
    [P in Key]: ToggleArray<Value, Many>;
} : never;
declare const group: {
    <Source extends ObjectSource<any> | NullishOrFalse, AsMap extends boolean = true>(source: Source, map?: AsMap): MaybeNullishOrFalse<Group2Result<ObjectSourceToObject<Source>, AsMap>, Source>;
    <Source extends Iterable<KeyValueType<any>> | NullishOrFalse>(source: Source, map?: true): MaybeNullishOrFalse<Group2Result<ObjectSourceToObject<Source>, true>, Source>;
    <Source extends IterationSource, Projected extends KeyValueType<keyof any> | Falsish, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never, AsMap extends boolean = true>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>, map?: AsMap): MaybeNullishOrFalse<Group2Result<IterationProjected<Projected, Falsish>[], AsMap>, Source>;
    <Source extends IterationSource, Projected extends KeyValueType<any> | Falsish, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>, map?: true): MaybeNullishOrFalse<Group2Result<IterationProjected<Projected, Falsish>[], true>, Source>;
};
declare let forEachAwait: {
    <Source extends AsyncIterationSource | Nullish>(source: Source): Promise<MaybeNullish<AsyncIterationItem<Source>, Source> | undefined>;
    <Source extends AsyncIterationSource | Nullish, Projected, Accumulated extends UnwrapPromiseLike<Projected>, Signal extends typeof skip | typeof stop | never, Context = Source>(source: Source, projection: AsyncIterationProjection<Source, Accumulated, EncourageTuples<Projected> | Signal, Context> | Nullish, seed?: Accumulated, context?: Context): Promise<MaybeNullish<AsyncItProjection<Projected>, Source> | undefined>;
};
declare let mapAwait: {
    <Source extends IterationSource, Projected, Accumulator extends UnwrapPromiseLike<Projected>, Signal extends typeof skip | typeof stop | never, // Otherwise R may be `symbol`
    Target = undefined, Context = Source>(source: Source, projection: AsyncIterationProjection<Source, Accumulator, Projected | Signal>, target?: Target & AsyncItProjection<Projected>[], seed?: Accumulator, context?: Context): Promise<MaybeNullishOrFalse<AsyncItProjection<Projected>[] extends Target ? Target : AsyncItProjection<Projected>[], Source>>;
    <Source extends AsyncIterationSourceOf<T>, T, Target = never[]>(source: Source, projection?: undefined | null, target?: Target & T[], seed?: any, context?: any): Promise<Target extends never[] ? IterationResultArray<Iterable<AsyncIterationItem<Source>>> : Target>;
};
declare const collect: <T, Nulls>(source: T | Iterable<T> | Nulls, generator: (item: T) => Iterable<T> | T | typeof skip | typeof stop, includeSelf?: boolean, collected?: Set<T>) => MaybeNullish<Set<T>, Nulls>;
declare const distinct: <T>(source: T) => unknown extends T ? any : T extends Nullish ? T : T extends Set<any> ? T : T extends Iterable<infer T_1> ? Set<T_1> : Set<T>;
declare const iterable: <T>(source: T) => T extends undefined ? [] : T extends Iterable<any> ? T : [T];
declare const array: <T>(source: T) => unknown extends T ? any[] : T extends Nullish ? T : T extends readonly any[] ? T : T extends Iterable<infer Item> ? Item[] : [T];
declare const some: {
    <Source extends IterationSource>(source: Source, predicate?: IterationFilterCallback<Source>): boolean;
};
declare const all: {
    <Source extends IterationSource>(source: Source, predicate?: IterationFilterCallback<Source>): boolean;
};
type ConcatResult<T extends readonly any[]> = [Nullish | T[number]] extends [
    Nullish
] ? undefined : {
    [P in keyof T]: T[P] extends infer T ? unknown extends T ? any : T extends Iterable<infer T> ? T : T extends Nullish ? never : T : never;
}[number][];
declare const concat: {
    <T extends readonly any[]>(args: T): ConcatResult<T>;
    <T extends readonly any[]>(...args: T): ConcatResult<T>;
};
declare const sort: {
    <T extends Sortable, Source>(items: Source & (Iterable<T> | Nullish), descending?: boolean): Source extends Nullish ? T : IteratorItem<T>[];
    <T, Source>(items: Source & (Iterable<T> | undefined), selector: MaybeArray<(item: T) => Sortable>, descending?: boolean): Source extends Nullish ? T : T[];
};
declare const topoSort: <Source, T>(items: (Iterable<T> | Nullish) & Source, dependencies: (item: T) => Iterable<T> | Nullish, format?: Selector<T>) => MaybeNullish<T[], Source>;
type ReduceFunction<Default = undefined, By = false> = {
    <T extends number>(source: readonly [T, ...T[]]): T;
    <Source>(source: Source & Iterable<number | undefined>): Source extends Nullish ? Source : IteratorItem<Source> | Default;
    <Source extends IterationSource, Projected extends number | undefined, Signal extends typeof skip | typeof stop | never, Accumulator extends Projected = any, Item extends boolean = false>(...args: [
        source: Source,
        projection: IterationProjection<Source, Accumulator, Projected | Signal>,
        ...(true extends By ? [returnItem?: Item] : [])
    ]): Source extends Nullish ? Source : Item extends true ? IteratorItem<Source> : number | Default;
};
declare const min: ReduceFunction<undefined, true>;
declare const max: ReduceFunction<undefined, true>;
declare const sum: ReduceFunction<number>;
declare const avg: ReduceFunction<number>;
declare const keys: {
    (o: object): string[];
    (o: {}): string[];
};
declare const hasKeys: (obj: any) => boolean;
declare const keyCount: (obj: any, some?: boolean) => number;

type MapSource<K = any, V = any> = (K extends keyof any ? {
    [P in K]: V;
} & {
    [Symbol.iterator]?: undefined;
} : never) | Iterable<readonly [any, any] | Falsish> | Falsish;
type ObjectSource<K extends keyof any = keyof any, V = any> = ({
    [P in K]: V;
} & {
    [Symbol.iterator]?: undefined;
}) | Iterable<KeyValueTypeLike<K, V> | Falsish> | Falsish;
type AssignSource<Source> = Source extends Nullish ? never : ({
    [P in keyof any & KeyTypeOf<Source>]?: ValueTypeOf<Source, P>;
} & {
    [Symbol.iterator]?: undefined;
}) | Iterable<AllowAdditionalElements<EntryTypeOf<Source>> | Falsish> | Falsish;

type GetResult<Source, K, Default> = unknown extends Default ? ValueTypeOf<Source, K> : undefined extends Default ? ValueTypeOf<Source, K> : ValueTypeOf<Source, K> & {};
declare let get: {
    <Source, K extends KeyTypeOf<Source>, InitializeDefault extends () => MaybePromiseLike<InputValueTypeOf<Source, K>>>(source: Source, key: K, initialize: InitializeDefault): unknown extends InitializeDefault ? ValueTypeOf<Source, K> : InitializeDefault extends () => infer Default ? Default extends PromiseLike<infer Default> ? Promise<GetResult<Source, K, Default>> : GetResult<Source, K, Default> : never;
    <Source, K extends KeyTypeOf<Source>>(source: Source, key: K, initialize: InputValueTypeOf<Source, K> & {}): ValueTypeOf<Source, K> & {};
    <Source, K extends KeyTypeOf<Source>>(source: Source, key: K, initialize?: InputValueTypeOf<Source, K>): ValueTypeOf<Source, K>;
};
declare let add: {
    <Target, K extends KeyTypeOf<Target>>(target: (Set<K> | WeakSet<K & {}>) & Target, key: K, value?: InputValueTypeOf<Target>): MaybeNullish<boolean, Target>;
    <Target, K extends KeyTypeOf<Target>>(target: Target, key: K, value: InputValueTypeOf<Target, K>): MaybeNullish<boolean, Target>;
};
declare let trySet: {
    <Target, K extends KeyTypeOf<Target>, Value extends InputValueTypeOf<Target, K>>(target: Target, key: K, value: Value): boolean;
};
declare let set: {
    <Target, K extends KeyTypeOf<Target>, Value extends InputValueTypeOf<Target, K>>(target: Target, key: K, value: Value): MaybeNullish<Value, Target>;
};
/** Removes the value with the specified key, and returns it. */
declare const remove: {
    <Target extends LookupType, K extends KeyTypeOf<Target>>(target: Target, key: K): ValueTypeOf<Target, K> | undefined;
    <Target, K extends keyof Target>(target: Target, key: K): Target[K] | undefined;
};
declare let exchange: {
    <Target extends LookupType, K extends KeyTypeOf<Target>, Value extends InputValueTypeOf<Target, K> | undefined>(target: Target, key: K, value: Value): ValueTypeOf<Target, K> | undefined;
    <Target, K extends keyof Target, Value extends InputValueTypeOf<Target, K> | undefined>(target: Target, key: K, value: Value): Target[K] | undefined;
};
declare const update: {
    <Target, K, Value extends InputValueTypeOf<Target, K>, UpdateResult>(target: Target, key: KeyTypeOf<Target> & K, update: (current: ValueTypeOf<Target, K>) => UpdateResult & MaybePromiseLike<EncourageTuples<Value | undefined>>): PromiseIfPromiseLike<MaybeNullish<ValueTypeOf<Target, K>, Target>, UpdateResult>;
};
declare const clone: {
    <T extends SimpleObject | readonly any[]>(value: T, depth?: number): T;
};
declare let push: {
    <Target, Item>(target: Target & (readonly Item[] | Nullish), ...values: (Item | undefined)[]): Target;
    <Target, K>(target: Target & (Set<K> | WeakSet<K & {}>), ...values: (K | undefined)[]): any;
};
declare const dict: {
    <Source extends MapSource<K, V>, K, V>(source: Source): Source extends Nullish ? Source : ObjectSourceToObject<Source>;
    <Source extends IterationSource, Projected extends readonly [K, V] | Nullish, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never, K, V>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>): Source extends Nullish ? Source : MapFromEntries<IterationProjected<Projected>>;
};
declare const obj: {
    <Source extends ObjectSource<K, V>, K extends keyof any, V>(source: Source): Source extends Nullish ? Source : ObjectSourceToObject<Source>;
    <Source extends IterationSource, Projected extends KeyValueType<K, V> | Nullish, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never, K extends keyof any, V>(source: Source, projection: IterationProjection<Source, Accumulator, Projected | Signal>): Source extends Nullish ? Source : ObjectFromEntries<IterationProjected<Projected>>;
};
declare let assign: {
    <Target extends SimpleObject, Its extends readonly AssignSource<Target>[]>(target: Target, clone: boolean, ...sources: Its): Target;
    <Target, Its extends readonly AssignSource<Target>[]>(target: Target, ...sources: Its): Target;
};
interface Merge2Settings<Deep extends boolean = boolean, Overwrite extends boolean = boolean, OverwriteNulls extends boolean = boolean> {
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
declare const merge: {
    <Target, Source extends SimpleObject | Falsish | Iterable<ObjectSource>, Deep extends boolean = true, Overwrite extends boolean = true, OverwriteNulls extends boolean = false>(target: Target, sources: EncourageTuples<Source>, options?: Merge2Settings<Deep, Overwrite, OverwriteNulls>): Target extends Nullish ? Target : MergeObjectSources<Target, Source, Deep, Overwrite, OverwriteNulls>;
};
declare const pick: {
    <T extends object | Nullish, TK extends keyof (T & {}), K extends RecordKeyOf<T>>(target: T, keys: Iterable<TK | K>): T extends Nullish ? T : T extends infer T ? (TK | K) & keyof T extends infer K extends keyof T ? {
        [P in K]: T[P];
    } : never : never;
};

type Wrapped<T> = T | (() => T);
type Unwrap<T> = T extends () => infer R ? R : T;
declare const unwrap: {
    <T>(value: Wrapped<T>): T;
};
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
declare const diff: <T>(updated: T, previous: T | undefined) => [delta: T, current: T] | undefined;
type Interval<T> = [start: T, end: T];
type Intervals<T = number> = ReadonlyArray<[start: T, end: T]> & {
    /**
     * Updates the intervals to include the specified start and end,
     * and returns the updated total width.
     *
     */
    push: (start: T, end: T) => number;
    /** The total width of the intervals. */
    width: number;
};
declare const createIntervals: <T = number>(cmp?: (x: T, y: T) => number, width?: (interval: Interval<T>) => number) => Intervals<T>;

type CreateArray<Len, Ele = 1, Arr extends Ele[] = []> = Arr["length"] extends Len ? Arr : CreateArray<Len, Ele, [Ele, ...Arr]>;
type Add<A extends number, B extends number> = [
    ...CreateArray<A, 1>,
    ...CreateArray<B, 1>
]["length"] & number;
type Negate<N extends number> = N extends 0 ? 0 : `${N}` extends `-${infer S extends number}` ? S : `-${N}` extends `${infer S extends number}` ? S : never;
type Subtract<A extends number, B extends number> = CreateArray<A, 1> extends [...CreateArray<B, 1>, ...infer R] ? R["length"] & number : never;

type IsNever<T> = [T] extends [never] ? true : false;
type IsTruish<T, UnknownIsTrue = true> = T extends Nullish | false ? false : unknown extends T ? UnknownIsTrue : true;
type IsFalsish<T, UnknownIsTrue = true> = T extends Nullish | false ? true : unknown extends T ? Not<UnknownIsTrue> : false;
type Not<B> = If<B, false, true>;
type And<P1, P2 = true> = [P1 | P2] extends [true] ? true : false;
type Or<P1, P2 = false> = true extends P1 | P2 ? true : false;
/** Returns whether any type in a union may be an empty array. */
type CanBeEmpty<T> = ArraysAsEmpty<T, true> extends infer Array ? Array extends readonly [] ? true : false : false;
/** Returns undefined if the type includes an array that may be empty. */
type UndefinedIfEmpty<T> = true extends CanBeEmpty<T> ? undefined : never;
/**
 * Since arrays may have length zero, this utility function either turns them into empty tuples or includes an empty tuple with them.
 * Actual tuples are preserved.
 */
type ArraysAsEmpty<T, IncludeOriginal = false> = T extends readonly any[] ? T extends [any, ...any] ? T : [] | (T extends never[] ? [] : IncludeOriginal extends true ? T : never) : T;
/**
 * Test whether all types in a union are defined. When passed a tuple, it tests whether all elements are strictly defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are not.
 */
type All<P, UnknownIsValue extends boolean = true> = (P extends readonly [] ? false : P extends readonly [infer Item, ...infer Rest] ? And<HasValue<Item, UnknownIsValue>, Rest extends [] ? true : All<Rest, true>> : P extends readonly (infer Item)[] ? And<HasValue<Item, UnknownIsValue>> : And<HasValue<P, UnknownIsValue>>) extends true ? true : false;
/**
 * Tests whether at least one type in a union is defined. When passed a tuple, it tests whether at least one element may be defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are not.
 */
type Any<P, UnknownIsValue extends boolean = true> = false extends (P extends readonly [] ? false : P extends readonly [infer Item, ...infer Rest] ? Or<HasValue<Item, UnknownIsValue>, Rest extends [] ? false : Any<Rest, true>> : P extends readonly (infer Item)[] ? Or<HasValue<Item, UnknownIsValue>> : Or<HasValue<P, UnknownIsValue>>) ? false : true;
/**
 * Tests whether all types in a union are defined. When passed a tuple, it tests whether at least one element is strictly defined.
 *
 * Empty tuples are not considered defined, but arrays are.
 * It is not taking into account that arrays may be empty, if needed use {@link ArraysAsEmpty}.
 *
 * It is configurable whether unknown values are considered undefined or not. By default they are.
 */
type AnyAll<P, UnknownIsValue extends boolean = true> = false extends (P extends readonly [] ? false : P extends readonly [infer Item, ...infer Rest] ? Or<And<HasValue<Item, UnknownIsValue>>, Rest extends [] ? false : AnyAll<Rest, true>> : P extends readonly (infer Item)[] ? And<HasValue<Item, UnknownIsValue>> : And<HasValue<P, UnknownIsValue>>) ? false : true;
/** Simplifies Boolean checks (instead of having to write B extends bla, bla...).  */
type IfNot<B, True = undefined, False = never> = If<B, False, True>;
/** Simplifies Boolean checks (instead of having to write B extends bla, bla...).  */
type If<B, True, False = never> = B extends Nullish | false ? False : True;
/** Type 1 extends type 2 */
type Extends<T1, T2> = T1 extends T2 ? true : false;
/** Any of the union in a type extends a another type. */
type ExtendsAny<T1, T2> = true extends Extends<T1, T2> ? true : false;
type FunctionComparisonEqualsWrapped<T> = T extends (T extends {} ? infer R & {} : infer R) ? {
    [P in keyof R]: R[P];
} : never;
type FunctionComparisonEquals<A, B> = (<T>() => T extends FunctionComparisonEqualsWrapped<A> ? 1 : 2) extends <T>() => T extends FunctionComparisonEqualsWrapped<B> ? 1 : 2 ? true : false;
/**
 * Tests if a type or any type in a union are not null'ish.
 */
type IsNullish<T, UnknownIsValue extends boolean = boolean> = T extends Nullish ? true : unknown extends T ? Not<UnknownIsValue> : false;
/**
 * Tests if a type or any type in a union are not null'ish.
 */
type HasValue<T, UnknownIsValue extends boolean = true> = T extends Nullish ? false : unknown extends T ? UnknownIsValue : true;
/**
 * Tests if a type is `any`.
 */
type IsAny<T> = FunctionComparisonEquals<T, any>;
/**
 * Tests if a type is `unknown`.
 */
type IsUnknown<T> = Extends<unknown, T>;
/**
 * Tests if a type is not `unknown`.
 */
type IsKnown<T> = Not<Extends<unknown, T>>;
/**
 * Tests if a type is `unknown`.
 */
type IsStrictlyUnknown<T, Else = never> = If<IsAny<T>, false, Extends<unknown, T>> | Else;
/**
 * Tests if a type extends the specified type unless it is `unknown` or `any`.
 */
type Is<T, Test> = If<IsUnknown<Test>, IsUnknown<T>, If<Extends<T, Test>, Not<IsUnknown<T>>, false>>;
/**
 * Treats `unknown` as `any`.
 */
type UnknownIsAny<T> = unknown extends T ? any : T;
/** Converts `null`, `undefined` and `void` to another type (default `undefined`). */
type ValueOrDefault<T, R, D = undefined> = T extends NonNullable<T> ? R : T extends null | undefined | void ? D : R;
/**
 * Removes null'ish values from a union.
 */
type OmitNullish<T, Default = never> = T extends Nullish ? Default : T;
/** All keys of any type in a union */
type AllKeys<Ts> = Ts extends infer T ? unknown extends T ? keyof any : keyof T : never;
/**
 * Makes sure that each type in an intersection cannot have any property from another type unless the value is undefined.
 *
 * For example `{x: number}|{y:number}|{x:number,y:string}` becomes `{x:number, y?:undefined} | {y:number, x?:undefined} | {x:number, y:string}`.
 */
type StrictUnion<Options, AllKeys extends keyof any = Options extends infer Option ? keyof Option : never> = Pretty<Options extends infer Option ? Option & {
    [P in Exclude<AllKeys, keyof Option>]?: undefined;
} : never>;
/**
 * Version of Omit that restricts the keys to those actually keys of the type for safety during refactoring.
 */
type OmitKeys<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/**
 * Removes the specified keys from each type in a union.
 */
type OmitUnion<T, K extends AllKeys<T>> = T extends infer T ? Omit<T, K> : never;
/**
 * Denies any property of T that is not in Template.
 * Can be used to require the return value of a function to strictly match a template.
 */
type DenyExtraProperties<T, Template> = unknown extends Template ? T : unknown extends T ? Template : Template extends infer Template ? Template & {
    [P in keyof T]?: P extends keyof Template ? unknown : undefined;
} : never;
/**
 * Picks the specified keys from each type in a union.
 */
type PickUnion<T, K extends keyof any> = T extends infer T ? Pick<T, K & keyof T> extends infer T ? {
    [P in keyof T]: T[P];
} : never : never;
/**
 * The defined part of a type, excluding undefined and void (which is also undefined).
 * `null` is considered defined. Use {@link OmitNullish} if `null` should also not be removed.
 */
type Defined<T> = T extends Nullish ? never : T;
/**
 * Can be used to collect null values from a function parameter.
 */
type Nullable<T, Collector = T> = T | (Nullish & Collector);
/**
 * Converts null'ish values to `undefined`.
 */
type StrictUndefined<T> = T extends Nullish ? undefined : T;
/**
 * Returns a type if the another type is not undefined or false.
 *
 * Can be used in constructs like `<T extends string | undefined>(value: T): MaybeUndefined<T,number>`
 * that will return `number` if `value` is `string`, `number | undefined` if `value` is `string|undefined`,
 * and `undefined` if `value` is `undefined`.
 *
 */
type MaybeUndefined<T, Defined = OmitNullish<T>, Nulls = Nullish | void> = unknown extends T ? Defined | undefined : T extends Nulls ? undefined : Defined;
type ToggleRequired<T, Toggle> = OmitNullish<T> | (Toggle extends true ? undefined : never);
/**
 * Only returns the type if it is not `any`.
 */
type ExcludeAny<T> = FunctionComparisonEquals<T, any> extends true ? never : T;
/**
 * Goes with {@link Nulls} to simplify the expression.
 */
type ArgNulls<T, Arg> = (T | Nullish) & Arg;
/** Used to identify the properties that contains a value type that should be transferred to another type.  */
declare const valueTypeMarker: unique symbol;
type PrimitiveType = void | null | undefined | string | number | boolean | bigint | Symbol | Date;
/** Extracts the generic type using a template that marks the properties/functions where it is used with the {@link valueTypeMarker} symbol.  */
type ExtractGenericType<Source, Template> = Template extends typeof valueTypeMarker ? Source : Source extends PrimitiveType ? never : Source extends (...args: any) => infer SourceReturn ? Template extends (...args: any) => infer TargetReturn ? ExtractGenericType<SourceReturn, TargetReturn> : never : {
    [P in keyof Source]: P extends keyof Template ? ExtractGenericType<Source[P], Template[P]> : never;
}[keyof Source];
/** Merges the generic type into a template using the {@link valueTypeMarker} symbol for the properties where it should be used.  */
type MergeGenericType<Template, GenericType> = Template extends typeof valueTypeMarker ? GenericType : Template extends PrimitiveType ? Template : {
    [P in keyof Template]: MergeGenericType<Template[P], GenericType>;
};
/** Looks if the specified type matches a template in set of tuples containing a source and target template to identify and project a generic type value. */
type ProjectGenericTypeValue<T, Mappings extends readonly [any, any]> = unknown extends T ? unknown : T extends Nullish ? undefined : IfNever<Mappings extends [infer SourceTemplate, infer TargetTemplate] ? SourceTemplate extends infer SourceTemplate ? T extends MergeGenericType<SourceTemplate, any> ? MergeGenericType<TargetTemplate, ExtractGenericType<T, SourceTemplate>> : never : never : never, undefined>;

/**
 * A record that may have the specified keys and values.
 */
type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;
type ReadonlyRecord<K extends keyof any = keyof any, V = any> = {
    readonly [P in K]: V;
};
type PartialDefined<T> = Partial<Exclude<T, undefined | void>>;
type Freeze<T> = T extends SimpleObject | readonly any[] ? {
    readonly [P in keyof T]: Freeze<T[P]>;
} : T;
/** Makes all properties and properties on nested objects required. */
type AllPartial<T> = T extends null | undefined ? T : T extends (...args: any) => any ? T : {
    [P in keyof T]?: AllPartial<T[P]>;
};
/** Makes all properties and properties on nested objects required. */
type AllRequired<T, Nulls = never> = T extends undefined | Nulls ? never : T extends null ? null : T extends (...args: any) => any ? T : {
    [P in keyof T]-?: Exclude<T extends SimpleObject ? AllRequired<T[P], Nulls> : T[P], undefined>;
};
type UnionPropertyValue<T, Keys extends keyof any> = T extends infer T ? Keys extends infer K ? K extends keyof T ? T[K] : never : never : never;
/** Removes record without properties from a union. */
type RequireProperties<T> = {} extends T ? never : T;
/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
type MaybePick<T, Keys extends AllKeys<T> | (keyof any & {})> = PrettifyIntersection<T extends infer T ? Pick<T, Extract<keyof T, Keys>> : never>;
/**
 * Omits one or more keys from a type if they exist. This also works for unions.
 */
type MaybeOmit<T, Keys extends AllKeys<T> | (keyof any & {})> = PrettifyIntersection<T extends infer T ? Pick<T, Exclude<keyof T, Keys>> : never>;
/**
 * Replaces one or more properties the types in a union with a different value, optionally given a filter the types must extend.
 */
type ReplaceProperties<T, Values extends Record<keyof any, any>, Filter = any> = T extends infer T ? T extends Filter ? {
    [P in keyof T]: P extends keyof Values ? Values[P] : T[P];
} : T : never;
/**
 * Makes the specified properties required.
 */
type PickRequired<T, K extends AllKeys<T>> = T extends infer T ? PrettifyIntersection<MaybeOmit<T, K> & Required<MaybePick<T, K>>> : never;
/**
 * Makes the specified properties partial.
 */
type PickPartial<T, K extends AllKeys<T> | (string & {})> = T extends infer T ? PrettifyIntersection<MaybeOmit<T, K> & Partial<MaybePick<T, K>>> : never;
/**
 * Makes all other properties than the specified partial.
 */
type PartialExcept<T, K extends AllKeys<T>> = T extends infer T ? PrettifyIntersection<Required<MaybePick<T, K>> & Partial<MaybeOmit<T, K>>> : never;
/**
 *  TypeScript may be very literal when it infers types. The type fo a function parameter with the value `10` may be inferred as `10` and not `number`.
 *  This is an issue in e.g. {@link reduce}.
 */
type GeneralizeConstants<T> = T extends number ? number : T extends string ? string : T extends boolean ? boolean : T extends (...args: infer A) => infer R ? (...args: GeneralizeConstants<A>) => GeneralizeConstants<R> : unknown extends T ? UnknownIsAny<T> : {
    [P in keyof T]: GeneralizeConstants<T[P]>;
};
/**
 * The eclectic type found everywhere on the Internet.
 * It converts a union like `{a:1}|{b:2}` to the intersection `{a:1, b:2}`
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
/**
 * Makes a intersection of objects like `{a:1}&{b:2}` appear as `{a:1,b:2}` in intellisense.
 */
type PrettifyIntersection<T, Deep extends boolean = false> = T extends infer T ? {
    [P in keyof T]: Deep extends true ? PrettifyIntersection<T[P]> : T[P];
} : never;
type KeyValueSource = Nullish | readonly (readonly [keyof any, any])[] | SimpleObject<keyof any, any> | Map<keyof any, any>;
type Gather<T, Group extends boolean> = [T] extends [never] ? never : {
    [P in AllKeys<T>]: Group extends true ? Property<T, P>[] : Property<T, P>;
};
/**
 * Decomposes they key/value pairs of one or more types into an object.
 */
type KeyValueSourcesToObject<T extends KeyValueSource, Group extends boolean = false> = Gather<KeyValuePairsToObject<T extends Iterable<infer Item> ? Item extends readonly [keyof any, any] ? Item : never : {
    [P in keyof T]: readonly [P, T[P]];
}[keyof T]>, Group>;
/**
 * Makes an array of key/value pairs to an object with the corresponding properties.
 */
type KeyValuePairsToObject<T extends readonly [keyof any, any], Group extends boolean = false> = Gather<T extends readonly [infer K extends keyof any, infer V] ? {
    [P in K]: V;
} : never, Group>;
type TupleEntries<T, Index extends number = 0> = T extends readonly [] ? never : T extends readonly [infer Item, ...infer Rest] ? readonly [[Index, Item], ...TupleEntries<Rest, Add<Index, 1>>] : T extends Iterable<infer T> ? readonly (readonly [number, T])[] : never;
type Entries<T> = T extends infer T ? T extends Nullish ? undefined : T extends Primitives ? never : T extends Iterable<any> ? T extends ReadonlyMap<infer K, infer V> ? readonly (readonly [K, V])[] : T extends ReadonlySet<infer T> ? readonly (readonly [T, true])[] : TupleEntries<T> : UnionToTuple<{
    [P in keyof T]: [P, T[P]];
} extends infer T ? T[keyof T] : never, true> extends infer T ? T extends readonly [never] ? [] : T : never : never;
type ExpandOnProperty<T, K extends keyof any> = T extends {
    [P in K]: infer Values;
} ? Values extends infer Value ? {
    [P in keyof T]: P extends K ? Value : T[P];
} : never : never;

type Empty = readonly [];
type IsTuple<T> = T extends [] | [any, ...any] ? true : false;
type ItemOrSelf<T> = T extends readonly any[] ? T[number] : T;
/** A simpler version of {@link MaybeArray} that does not use type inference to simplify function signatures. */
type ArrayOrSelf<T, Readonly extends boolean = true> = T | (Readonly extends true ? readonly T[] : T[]);
type ToggleArray<T, Toggle = boolean, ReadOnly = false> = Toggle extends true ? (ReadOnly extends true ? readonly T[] : T[]) : T;
type MaybeArray<T, Readonly extends boolean | readonly any[] = T extends readonly any[] ? T : false, AlwaysArray = false> = IsAny<T> extends true ? any : [T] extends [readonly any[]] ? IfNot<AlwaysArray, T[0]> | ToggleReadonly<T, Readonly> : IfNot<AlwaysArray, T> | (Readonly extends false ? T[] : readonly T[]);
/**
 * An extension to T[] and Iterable<T> that also correctly captures weird things like NodeListOf<T>
 */
type IterableOrArrayLike<T> = Iterable<T> | {
    [item: number]: T;
    length: number;
} | {
    [index: number]: T;
    item(index: number): T | Nullish;
};
/**
 * Shorthand for a type that is inferred from a parameter and can either be the item in an iterable, or just the type itself.
 */
type IterableOrSelf<T> = IterableOrArrayLike<T> | T;
type ToggleReadonly<T extends readonly any[], Test> = Test extends any[] | false ? [...T] : Test extends readonly any[] | true ? readonly [...T] : never;
type Head<T> = T extends readonly [infer Head, ...any] ? Head : T extends readonly (infer Head)[] ? Head : never;
type Tail<T> = T extends [any, ...infer Rest] ? Rest : T extends readonly [any, ...infer Rest] ? readonly [...Rest] : never;
type Last<T extends readonly any[]> = T extends readonly [
    ...any,
    infer Last
] ? Last : T extends readonly (infer Head)[] ? Head : never;
type Leading<T extends readonly any[], Readonly extends readonly any[] | boolean = T> = T extends readonly [] ? never : T extends readonly [...infer Tail, any] ? ToggleReadonly<Tail, Readonly> : T extends readonly any[] ? ToggleReadonly<T, Readonly> : never;
type Prefixes<T extends readonly any[]> = T extends Empty ? never : T | Prefixes<Leading<T>>;
type TakeFirst<T extends readonly any[], N extends number = 1> = T["length"] extends N ? T : TakeFirst<Leading<T>, N>;
type TakeLast<T extends readonly any[], N extends number = 1> = T["length"] extends N ? T : TakeLast<Tail<T>, N>;
type UnionToTuple<T, Readonly extends boolean = false> = PickOne<T> extends infer U ? Exclude<T, U> extends never ? ToggleReadonly<[T], Readonly> : ToggleReadonly<[...UnionToTuple<Exclude<T, U>, Readonly>, U], Readonly> : never;
type Contra<T> = T extends any ? (arg: T) => void : never;
type InferContra<T> = [T] extends [(arg: infer I) => void] ? I : never;
type PickOne<T> = InferContra<InferContra<Contra<Contra<T>>>>;
/**
 * Utility type to allow `as const` to be used on tuples returned from functions without actually making them `readonly` (which is annoying).
 * Normally TypeScript considers the return value of a function like `x=>[10,"four"]` to be `(string|number)[]` (which is also annoying).
 */
type ConstToNormal<T> = T extends readonly [...any[]] ? {
    -readonly [P in keyof T]: ConstToNormal<T[P]>;
} : T extends void ? undefined : T;
/** By adding a single item readonly tuple TypeScript starts interpreting arrays as tuples in function calls. */
type TupleOrArray<Item> = readonly Item[] | readonly [Item];
type VariableTuple<Item, Template extends readonly any[] = any[], MaxLength extends number = number extends Template["length"] ? 1 : Template["length"]> = MaxLength extends 0 ? readonly [] : readonly [Item, ...VariableTuple<Item, Template, Subtract<MaxLength, 1>>];
type Navigate<T, K extends keyof any> = K extends "" ? T : K extends keyof T ? T[K] : never;
type HasUnknown<T extends readonly any[]> = true extends (T extends readonly [] ? false : T extends [infer Item, ...infer Rest] ? IsStrictlyUnknown<Item, HasUnknown<Rest>> : T extends readonly (infer Item)[] ? IsStrictlyUnknown<Item> : IsStrictlyUnknown<T>) ? true : false;
type MatchOverload<A extends readonly [any, any], MatchArgs = any> = A extends [
    infer Args,
    infer R
] ? Args extends readonly any[] ? IfNot<HasUnknown<Args | [R]>, Args extends MatchArgs ? A : Args extends (MatchArgs extends readonly (infer Item)[] ? readonly Item[] : never) ? A : never> : never : never;
/** Returns tuples with arguments and return values for all non-generic overloads of a function, optionally matching a signature. */
type Overloads<F, MatchArgs = any> = unknown extends F ? [any, any] : MatchOverload<F extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
    (...args: infer P3): infer R3;
    (...args: infer P4): infer R4;
    (...args: infer P5): infer R5;
    (...args: infer P6): infer R6;
} ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4] | [P5, R5] | [P6, R6] : F extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
    (...args: infer P3): infer R3;
    (...args: infer P4): infer R4;
    (...args: infer P5): infer R5;
} ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4] | [P5, R5] : F extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
    (...args: infer P3): infer R3;
    (...args: infer P4): infer R4;
} ? [P1, R1] | [P2, R2] | [P3, R3] | [P4, R4] : F extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
    (...args: infer P3): infer R3;
} ? [P1, R1] | [P2, R2] | [P3, R3] : F extends {
    (...args: infer P1): infer R1;
    (...args: infer P2): infer R2;
} ? [P1, R1] | [P2, R2] : F extends (...args: infer P) => infer R ? [P, R] : never, MatchArgs>;
/** Returns the non-generic overloads of a function, optionally matching a signature. */
type PickOverloads<T, MatchArgs = any> = Overloads<T, MatchArgs> extends [infer Args, infer R] ? Args extends readonly any[] ? (...args: Args) => R : never : never;
/** Returns the non-generic overloads of a type's method, optionally matching a signature. */
type MethodOverloads<T, Name extends AllKeys<T> | (string & {}) = AllKeys<T>, MatchArgs = any> = Overloads<Navigate<T, Name>, MatchArgs>;
/** Returns tuples with arguments and return values for all non-generic overloads of a type's method, optionally matching a signature. */
type PickMethodOverload<T, Name extends AllKeys<T> | (string & {}) = AllKeys<T>, MatchArgs = any> = PickOverloads<Navigate<T, Name>, MatchArgs>;

type ErrorGenerator = string | Error | (() => string | Error);
declare const throwError: (error: ErrorGenerator, transform?: (string: string) => Error) => never;
declare const throwTypeError: (message: string) => never;
type CombineTypeTests<T> = T extends [] ? {} : T extends [infer F, ...infer Rest] ? F extends (value: any) => value is infer R ? (IsAny<R> extends true ? T : R) & CombineTypeTests<Rest> : never : never;
declare const validate: <T, Validator extends ((candidate: T) => candidate is any) | ((candidate: T) => R) | [validate: (candidate: T) => any, ...typeTests: ((candidate: T) => candidate is any)[]] | (R & NotFunction), R>(value: T, validate: Validator | R, validationError?: ErrorGenerator, undefinedError?: ErrorGenerator) => Defined<If<IsAny<Validator>, T, Validator extends readonly [any, ...infer TypeTests] ? CombineTypeTests<TypeTests> : Validator extends ((value: any) => infer R_1) | infer R_1 ? R_1 extends Falsish ? never : Validator extends (value: any) => value is infer R_2 ? Defined<R_2> : T : never>>;
declare class InvariantViolatedError extends Error {
    constructor(invariant?: string);
}
declare const structuralEquals: (value1: any, value2: any, depth?: number) => boolean;
/** Tests whether a value equals at least one of some other values.  */
declare const equalsAny: <T extends readonly any[]>(target: any, ...values: T) => target is T[number];
/**
 * States an invariant.
 */
declare const invariant: <T>(test: Wrapped<T | false>, description?: string) => Defined<T>;
declare const required: <T>(value: T, error?: ErrorGenerator) => OmitNullish<T>;
declare const tryCatch: <T, E = true>(expression: () => T, errorHandler?: E | (boolean | ((error?: any) => any) | Nullish), always?: () => void) => T | (E extends Nullish | true ? never : E extends false ? undefined : E extends (...args: any) => infer R ? R extends Error ? never : R extends void ? undefined : R : E);
type ErrorHandler = Nullish | boolean | ((error: any) => any);
type DeferredProperties<T> = {
    resolved?: Awaited<T>;
};
type NotDeferred = {
    resolved?: undefined;
};
type Deferred<T> = (() => T) & DeferredProperties<T>;
type DeferredAsync<T> = Deferred<MaybePromiseLike<T>>;
type MaybeDeferred<T> = (T & NotDeferred) | Deferred<T>;
type MaybeDeferredAsync<T> = ((T | PromiseLike<T>) & NotDeferred) | DeferredAsync<T>;
declare const resolveDeferred: {
    <T>(value: Deferred<T>): T;
    <T>(value: T): T;
};
/** A value that is initialized lazily on-demand. */
declare const deferred: <T>(expression: Wrapped<T>) => T extends PromiseLike<infer T_1> ? DeferredAsync<T_1> : Deferred<T>;
declare const asDeferred: <T extends unknown>(deferredOrResolved: T) => T extends Deferred<any> ? T : Deferred<T>;
declare class DeferredPromise<T> extends Promise<T> {
    private readonly _action;
    private _result;
    get initialized(): boolean;
    constructor(action: () => Promise<T>);
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null | undefined): Promise<T>;
}
type MaybeDeferredPromise<T> = (T & {
    initialized?: boolean;
}) | DeferredPromise<T>;
/**
 * A promise that is initialized lazily on-demand.
 * For promises this is more convenient than {@link deferred}, since it just returns a promise instead of a function.
 */
declare const deferredPromise: <T>(expression: Wrapped<MaybePromiseLike<T>>) => DeferredPromise<T>;
declare const formatError: (error: any, includeStackTrace?: boolean) => string;
declare const tryCatchAsync: <T, C, E extends boolean | ((error: any) => MaybePromiseLike<C>), T1 = T>(expression: Wrapped<MaybePromiseLike<T>>, errorHandler?: E, always?: () => MaybePromiseLike<any>) => Promise<T1 | (E extends true ? never : C)>;
interface RetrySettings<ErrorResult = never> {
    retries?: number;
    retryDelay?: number | ((retry: number) => number);
    errorFilter?: (error: any, retry: number) => "throw" | "reset" | "none" | void;
    errorHandler?: (error: any, retry: number) => MaybePromiseLike<ErrorResult>;
}
declare const withRetry: <T, ErrorResult = never>(action: (retry: number, previousError: any) => MaybePromiseLike<T>, { retries, retryDelay, errorFilter, errorHandler, }?: RetrySettings<ErrorResult>) => Promise<T | ErrorResult>;

/**
 * The ECMAScript primitive types.
 */
type Primitives = null | undefined | void | boolean | number | bigint | string | symbol | Date;
type NonAsync = Primitives | Iterable<any> | ((...args: any[]) => any) | SimpleObject;
/**
 * Common function type used for projection of [key,value] entries.
 */
type KeyValueProjection<K, V, R> = (entry: [key: K, value: V], index: number) => R;
type NotIterable = {
    [Symbol.iterator]?: never;
};
type AnyRecordType = {
    [P in keyof any]?: any;
};
/**
 * Anything but a promise.
 */
type NotPromise = {
    then?: never;
};
/**
 * Anything but a function.
 */
type NotFunction = bigint | boolean | null | number | string | symbol | undefined | {
    [key: string | number | symbol]: any;
    [Symbol.hasInstance]?: never;
};
/** Shorter than writing all this out, and slightly easier to read. */
type Nullish = null | undefined;
type CaptureNullish<Parameter, Nulls> = (Parameter | Nullish) & Nulls;
type MaybeNullish<ReturnType, Nulls = ReturnType> = Nulls extends Nullish ? Nulls : ReturnType;
type PromiseIfPromiseLike<Value, ParameterValue = Value> = ParameterValue extends PromiseLike<any> ? Promise<UnwrapPromiseLike<Value>> : Value;
declare const isTruish: <T>(value: T) => value is Exclude<T, Falsish>;
declare const isTrue: (value: any) => value is true;
declare const isNotTrue: <T>(value: T) => value is Exclude<T, true>;
type Falsish = void | null | undefined | 0 | "" | false;
type CaptureFalsish<Parameter, Nulls> = (Parameter | Falsish) & Nulls;
type MaybeFalsish<ReturnType, Value = ReturnType> = ReturnType extends Falsish ? ReturnType extends Nullish ? ReturnType : undefined : Value;
type NullishOrFalse = void | null | undefined | false;
type CaptureNullishOrFalse<Parameter, Nulls> = (Parameter | NullishOrFalse) & Nulls;
type MaybeNullishOrFalse<ReturnType, Parameter = ReturnType> = Parameter extends NullishOrFalse ? Parameter extends Nullish ? Parameter : undefined : ReturnType;
/** A record type that is neither iterable or a function. */
type SimpleObject<K extends keyof any = keyof any, V = any> = object & {
    readonly [P in K]?: V;
} & {
    [Symbol.iterator]?: never;
    [Symbol.asyncIterator]?: never;
    [Symbol.hasInstance]?: never;
    then?(onfulfilled?: ((value: any) => any) | undefined | null, onrejected?: ((reason: any) => any) | undefined | null): never;
};
type UnwrapPromiseLike<T> = T extends PromiseLike<infer T> ? UnwrapPromiseLike<T> : T;
type MaybePromiseLike<T> = T | PromiseLike<T>;
type MaybePromise<T> = T | Promise<T>;
/**
 * Shorthand for a value that is optionally awaitable.
 */
type TogglePromise<T, Toggle = boolean> = Toggle extends true | PromiseLike<any> ? T extends PromiseLike<any> ? T : PromiseLike<T> : T extends PromiseLike<infer T> ? UnwrapPromiseLike<T> : T;
/**
 * Trick for having a function that returns a non-null value, if a formal parameter always has a non-null value,
 * similar to .NET's [NotNullIfNotNull].
 *
 * If the actual parameter can have a null or undefined value the return value will include these options.
 *
 * `function example<T,A>(arg: (T|null|undefined)&A): string | Null<A> {...}`
 * `example(80)` returns `string`
 *  `const x: number|null; example(x)` returns `string|null`.
 *
 * There can also be a "null" default (so all Null'ish values maps to one value). If the function above returned `string | Null<T,undefined>`, then
 * `example(x)` returns `string|undefined`.
 *
 * @obsolete
 */
type Nulls<T, NullLevels = null | undefined> = T extends null | undefined | void ? T extends NullLevels | void ? T & NullLevels : NullLevels : never;
/** If any type in a union has a value for the given property that cannot be null'ish.*/
type HasRequiredProperty<T, P> = true extends (T extends infer T ? true extends Extends<Nullish, keyof T extends P ? T[P & keyof T] : P extends keyof T ? T[P] : never> ? false : true : never) ? true : false;
type IfNever<T, Default> = [T] extends [never] ? Default : T;
type IfNotNever<Test, Value, Default = never> = [Test] extends [never] ? Default : Value;
type Filter<T, FilterTypes, Default = never> = IfNever<T extends infer T ? (T extends FilterTypes ? T : never) : never, Default>;
/** Returns the type of a property for each type in a union when the type has the given property. */
type Property<T, P> = T extends infer T ? keyof T extends P ? T[P & keyof T] : P extends keyof T ? T[P] : never : never;
/**
 * Creates a new type where with all the properties from any of the specified types.
 * This can make life easier for code working with polymorphic types.
 */
type CommonTypeTemplate<Ts> = {
    [P in AllKeys<Ts>]?: Ts extends infer T ? P extends keyof T ? T[P] : never : never;
};
/**
 * Maps all null'ish types to `undefined`.
 */
type Undefined<T> = T extends Nullish | void ? undefined : T;
type ExpandTypes<Ts, Common = CommonTypeTemplate<Ts>> = Ts extends infer T ? {
    [P in keyof Common]: P extends keyof T ? T[P] : Common[P];
} : never;
/** Merges properties in a union which makes it look prettier in Intellisense. */
type Pretty<T> = T extends infer T ? {
    [P in keyof T]: T[P];
} : never;
/**
 * Use for function parameters where you want an array to be interpreted as as tuple with a finite number of elements.
 *
 * By suggesting a parameter may be a one-tuple, TypeScript will treat the argument as a tuple,
 * also if there are more than one element.
 */
type TupleParameter<T> = readonly T[] | readonly [T];
/** Minify friendly version of `false`. */
declare const undefined$1: undefined;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
declare const MAX_SAFE_INTEGER: number;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
declare const MIN_SAFE_INTEGER: number;
/** Minify friendly version of `false`. */
declare const F = false;
/** Minify friendly version of `true`. */
declare const T$1 = true;
/** Minify friendly version of `null`. */
declare const nil: null;
type NoOpFunction = (...args: any) => void;
/** A function that does nothing. */
declare const NOOP: NoOpFunction;
type IdentityFunction = <T>(item: T, ...args: any) => T;
/** The identity function (x)=>x. */
declare const IDENTITY: IdentityFunction;
type NullFilterFunction = <T>(item: T | Nullish) => boolean;
/** A function that filters out values != null. */
declare const FILTER_NULLISH: NullFilterFunction;
declare const NULL = 0;
declare const UNDEFINED = 1;
declare const BOOLEAN = 2;
declare const NUMBER = 3;
declare const BIGINT = 4;
declare const STRING = 5;
declare const ARRAY = 6;
declare const OBJECT = 7;
declare const DATE = 8;
declare const SYMBOL = 9;
declare const FUNCTION = 10;
declare const ITERABLE = 11;
declare const MAP = 12;
declare const SET = 13;
declare const PROMISE = 14;
type TypeTester<T> = (value: any) => value is T;
type TypeConverter<T> = <V, P extends boolean = true>(value: V, parse?: P) => T extends Nullish ? undefined : V extends T ? V : (true extends P ? T : never) | undefined;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
declare const symbolIterator: symbol;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
declare const symbolAsyncIterator: symbol;
declare const createTypeConverter: <T>(typeTester: TypeTester<T>, parser?: (value: any) => T | undefined) => TypeConverter<T>;
declare const ifDefined: <T, P, R>(value: T, resultOrProperty: ((AllKeys<T> & (keyof any & {})) | ((value: Exclude<T, Nullish>) => R)) & P) => MaybeUndefined<T, P extends keyof any ? Exclude<T, Nullish> : R>;
declare const isNullish: (value: any) => value is undefined | void | null;
declare const isBoolean: (value: any) => value is boolean;
declare const parseBoolean: TypeConverter<boolean>;
type FalsishToUndefined<T, Undefined = undefined> = T extends readonly any[] ? {
    [P in keyof T]: FalsishToUndefined<T[P]>;
} : T extends Falsish ? Undefined : T;
declare const isFalsish: (value: any) => value is Falsish;
declare const isFalse: (value: any) => value is false;
declare const isNotFalse: <T>(value: T) => value is Exclude<T, false>;
declare const isInteger: (value: any) => value is number;
declare const isNumber: (value: any) => value is number;
declare const isFinite: (value: any) => value is number;
declare const parseNumber: TypeConverter<any>;
declare const isBigInt: (value: any) => value is bigint;
declare const parseBigInt: TypeConverter<bigint>;
declare const isString: (value: any) => value is string;
declare const toString: TypeConverter<any>;
declare const isArray: <T>(value: readonly any[] | T) => value is T extends any[] ? any[] : unknown extends T ? any[] : readonly any[];
declare const isError: (value: any) => value is Error;
declare const isObject: (value: any) => value is object & Record<any, any>;
declare const isPlainObject: (value: any) => value is SimpleObject<keyof any, any>;
declare const hasProperty: <P extends keyof any>(value: any, property: P) => value is { [Prop in P]: any; };
declare const hasMethods: <Names extends readonly (keyof any)[]>(value: any, ...names: Names) => value is { [P in Names[number]]: (...args: any) => any; };
declare const hasMethod: <Name extends keyof any>(value: any, name: Name) => value is { [P in Name]: (...args: any) => any; };
declare const isDate: (value: any) => value is Date;
declare const parseDate: TypeConverter<any>;
declare const isSymbol: (value: any) => value is symbol;
declare const isFunction: (value: any) => value is (...args: any) => any;
declare const isPromiseLike: (value: any) => value is PromiseLike<any>;
declare const isIterable: (value: any, acceptStrings?: boolean) => value is Iterable<any>;
declare const isAsyncIterable: (value: any) => value is AsyncIterable<any>;
declare const toIterable: <T>(value: T | Iterable<T>) => Iterable<T>;
declare const asMap: <T extends Iterable<readonly [any, any]> | Nullish>(values: T) => T extends Iterable<readonly [infer Key, infer Value]> ? Map<Key, Value> : undefined;
declare const isMap: (value: any) => value is Map<any, any>;
declare const asSet: <T extends Iterable<any> | Nullish>(values: T) => T extends Iterable<infer T> ? Set<T> : undefined;
declare const isSet: (value: any) => value is Set<any>;
declare const isAwaitable: (value: any) => value is Promise<any>;
/**
 * If the value is a promise, it will be awaited.
 */
declare const awaitIfAwaitable: <T, R>(value: T, action: (value: T extends PromiseLike<infer T_1> ? T_1 : T) => R) => TogglePromise<R, T>;
declare const typeCode: (value: any, typeName?: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function") => any;
/**
 * Round a number of to the specified number of decimals.
 */
declare const round: <T extends number | Nullish>(number: T, decimals?: number | boolean) => MaybeUndefined<T, number>;
declare const isJsonString: (value: any) => boolean;
type Mutable<T> = T extends Map<any, any> | WeakMap<any, any> | Set<any> | WeakSet<any> ? T : T extends ReadonlyMap<infer K, infer V> ? Map<K, V> : T extends ReadonlySet<infer K> ? Set<K> : T extends Primitives ? T : {
    -readonly [P in keyof T]: Mutable<T[P]>;
};
/** For when an object that contains internal state that needs to be changed is exposed as read-only public property. */
declare const mutate: <T>(target: T) => Mutable<T>;

/**
 * All possible values that can be represented with JSON.
 */
type Json<T = unknown> = unknown extends T ? Nullish | string | number | boolean | JsonArray | JsonTuple | JsonObject : Omit<{
    [P in keyof T]: JsonOnly<T[P]>;
}, symbol>;
type JsonArray = Json[];
type JsonTuple = {
    [TupleIndex in number]?: Json;
};
type JsonObject = {
    [props: string | number]: Json;
} & {
    [symbols: symbol]: never;
};
type JsonOnly<T> = T extends Json ? T : never;
type ToJsonable<T> = {
    toJSON(): T;
};
/**
 * Clones a value by its JSON representation.
 */
declare const jsonClone: <T>(value: T) => T;
/**
 * Checks if the JSON representation of two objects are equal.
 *
 * Be aware that, give or take performance overhead, this also requires that properties
 * for objects are in the same order.
 */
declare const jsonEquals: (comparand: any, value: any) => boolean;
declare const isJsonObject: (value: any) => value is JsonObject;

declare const MILLISECOND = 1;
declare const SECOND: number;
declare const MINUTE: number;
declare const HOUR: number;
declare const DAY: number;
declare const FOREVER: number;
declare let now: (round?: boolean) => number;
type Timer = {
    (toggle?: boolean, reset?: boolean): number;
};
declare const reset: unique symbol;
declare const createTimer: (started?: boolean, timeReference?: () => number) => Timer;
declare const formatTimestamp: <T extends number | Date | Nullish>(value: T, formatOptions?: Intl.DateTimeFormatOptions, locale?: string | string[]) => T extends Nullish ? T : string;
declare const formatDuration: <T extends number | Nullish>(ms: number) => T extends Nullish ? T : string;
/**
 * The callback invoked when a {@link Clock} ticks.
 * If it returns `false` the clock will stop. Any other return value has no effect.
 */
type ClockCallback = (elapsed: number, delta: number) => MaybePromiseLike<any>;
interface Clock {
    readonly active: boolean;
    readonly busy: boolean;
    restart(frequency?: number, callback?: ClockCallback): Clock;
    toggle(start: boolean, trigger?: boolean): Clock;
    trigger(skipQueue?: boolean): Promise<boolean>;
}
interface ClockSettings {
    frequency?: number;
    queue?: boolean;
    paused?: boolean;
    trigger?: boolean;
    once?: boolean;
    callback?: ClockCallback;
    raf?: boolean;
}
/** Light-weight version of {@link clock}. The trigger and cancel overloads returns true to enable chaining like `timeout(false)&&...` */
declare const createTimeout: (defaultTimeout?: number) => {
    (callback: (elapsed: number) => void, timeout?: number): void;
    (cancel: false): true;
    (trigger: true): true;
    (): boolean;
};
type WaitForOptions<T> = {
    pollInterval?: number;
    timeout?: number;
    then?: (item: T, delay: number) => void;
};
declare const waitFor: {
    <T extends {}>(selector: () => T | null | undefined, then: (item: T) => void, options?: WaitForOptions<T>): T | Promise<T>;
    <T extends {}>(selector: () => T | null | undefined, options?: WaitForOptions<T>): T | Promise<T>;
};
declare const clock: {
    (callback: ClockCallback, frequency: number): Clock;
    (settings: ClockSettings): Clock;
};

declare class ResettablePromise<T = void, E = any> implements PromiseLike<T> {
    private _promise;
    constructor();
    get value(): (T extends void ? true : T) | undefined;
    get error(): any;
    get pending(): boolean;
    resolve(value: T, ifPending?: boolean): this;
    reject(value?: E, ifPending?: boolean): this;
    reset(): this;
    signal(value: T): this;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
}
declare class OpenPromise<T = void, E = any> implements PromiseLike<T> {
    private readonly _promise;
    readonly resolve: (value: T, ifPending?: boolean) => this;
    readonly reject: (reason: E | undefined, ifPending?: boolean) => this;
    readonly value: (T extends void ? true : T) | undefined;
    readonly error: E | true;
    pending: boolean;
    constructor();
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2>;
}
interface Lock {
    /**
     * Wait until the lock is available. If a timeout is not specified or negative, the calling thread will wait indefinitely.
     * If a owner ID is specified the lock will be reentrant for that ID.
     */
    <Ms extends number | undefined = undefined>(timeout?: Ms, ownerId?: string): Promise<(() => void) | If<Ms, undefined>>;
    /**
     * Performs the specified action when the lock becomes available.
     * If a timeout is not specified or negative, the calling thread will wait indefinitely.
     * If a owner ID is specified the lock will be reentrant for that ID.
     */
    <T, Ms extends number | undefined = undefined>(action: () => MaybePromiseLike<T>, timeout?: Ms, ownerId?: string): Promise<T | If<Ms, undefined>>;
}
type LockState = [owner: string | boolean, expires?: number];
declare const createLock: (timeout?: number) => Lock;
declare const defer: (f: VoidFunction, ms?: number) => number | void;
declare const delay: <Delay extends number | Nullish, T extends unknown = void>(ms: Delay, value?: T) => MaybeUndefined<Delay, TogglePromise<Unwrap<T>, true>>;
declare const promise: {
    <T = void>(resettable?: false): OpenPromise<T>;
    <T = void>(resettable: true): ResettablePromise<T>;
};
type UnwrapPromiseArg<T> = T extends () => infer T ? Awaited<T> : Awaited<T>;
type UnwrapPromiseArgs<T extends any[]> = T extends readonly [infer Arg] ? [UnwrapPromiseArg<Arg>] : T extends readonly [infer Arg, ...infer Rest] ? [UnwrapPromiseArg<Arg>, ...UnwrapPromiseArgs<Rest>] : [];
type AsyncValue<T> = undefined | T | PromiseLike<T> | (() => T) | (() => PromiseLike<T>);
declare const waitAll: <Args extends AsyncValue<any>[]>(...args: Args) => Promise<UnwrapPromiseArgs<Args>>;
declare const race: <Args extends AsyncValue<any>[]>(...args: Args) => Promise<UnwrapPromiseArgs<Args>[number]>;

type Rebinder = () => boolean;
type Unbinder = () => boolean;
type Binders = [unbind: Unbinder, rebind: Rebinder];
type SourceListener<Args extends readonly any[]> = (...args: Args) => void;
type Listener<Args extends readonly any[]> = (...args: [...args: Args, unbind: Unbinder]) => void;
declare const createEventBinders: <Args extends any[]>(listener: Listener<Args>, attach: (listener: SourceListener<Args>) => void, detach: (listener: SourceListener<Args>) => void) => Binders;
declare const joinEventBinders: (...binders: (Binders | undefined)[]) => Binders;
type EventHandler<Args extends readonly any[]> = (...payload: Args) => void;
declare const createEvent: <Args extends readonly any[]>() => [listen: (listener: Listener<Args>, triggerCurrent?: boolean) => Binders, dispatch: (...payload: Args) => void];
type ChainedEventHandler<Args extends any[], T> = (...args: [
    ...args: Args,
    next: {
        (): T;
        (...args: Args): T;
    },
    unbind: Unbinder
]) => T;
declare const createChainedEvent: <T = void, Args extends any[] = []>() => [register: (handler: ChainedEventHandler<Args, T>, priority?: number) => Binders, invoke: (...args: Args) => T | undefined];

declare const priorityQueue: <T>() => {
    size: () => number;
    push: (value: T, priority: number) => false | void;
    pop: () => [value: T, priority: number];
    expand: () => [value: T, priority: number][];
};

declare const changeCase: <S extends string | null | undefined>(s: S, upper: boolean) => S;
declare const changeIdentifierCaseStyle: (identifier: string, type: "camel" | "pascal" | "kebab" | "snake") => string;
/**
 * Pluralizes a noun using standard English rules.
 * It is not very smart, so if the plural form is not just adding an "s" in the end unless the singular form already ends with "s",
 * it must be specified manually.
 *
 * @param singular - The singular form of the noun
 * @param n - The number of items that decides if the noun should be pluralized. If given an array the number will be postfixed.
 * @param plural - The plural form if it is different from adding an "s" to the singular form.
 * @returns The noun, pluralized if needed.
 */
declare const pluralize: <T extends string | Nullish, N extends number | Nullish, Plural extends string = string>(singular: T, n: N | [count: N], plural?: Plural) => T extends Nullish ? undefined : N extends Nullish ? undefined : string;
/** Enables or disables ANSI formatting in console output. */
declare const toggleAnsi: (toggle?: boolean) => boolean;
/**
 * Can colorize text using ANSI escape sequences.
 * See e.g. https://developer.chrome.com/docs/devtools/console/format-style for options.
 */
declare const ansi: <Buffer extends string[] | undefined = undefined>(value: string | string[], ps: string | number, buffer?: Buffer) => Buffer extends undefined ? string : string[];
type UppercaseLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";
/**
 * This is intended for prettifying enum names (like ServerWrite becomes 'server-write'), alas it does currently not work with
 * ts-json-schema-generator. Kept in the hope this will be supported one day.
 */
type SnakeCase<S extends string | Nullish, First = true> = S extends Nullish ? undefined : S extends `${infer P}${infer Rest}` ? [P, First] extends [UppercaseLetter, false] ? `-${Lowercase<P>}${SnakeCase<Rest, false>}` : `${Lowercase<P>}${SnakeCase<Rest, false>}` : S extends string ? Lowercase<S> : undefined;
declare const snakeCase: <S extends string | Nullish>(s: S) => MaybeUndefined<S, SnakeCase<S>>;
declare const quote: <T>(item: T, quoteChar?: string) => MaybeUndefined<T, T extends Iterable<any> ? string[] : string>;
declare const ellipsis: <T extends string | Nullish>(text: T, maxLength: number, debug?: boolean) => T;
/** Word statistics for a text. */
type TextStats = {
    /** The source text. */
    text: string;
    /** The number of characters in the text. */
    length: number;
    /** The number of word characters (a letter or number followed by any number of letters, numbers or apostrophes) in the text. */
    characters: number;
    /** The number of words in the text. A word is defined as a group of consecutive word characters. */
    words: number;
    /**
     * The number of sentences in the text.
     * A sentence is defined as any group of characters where at least one of them is a word character
     * terminated by `.`, `!`, `?` or the end of the text.
     */
    sentences: number;
    /**
     * The LIX index for the text. The measure gives an indication of how difficult it is to read.
     * (https://en.wikipedia.org/wiki/Lix_(readability_test))
     */
    lix: number;
    /**
     * The estimated time it will take for an average user to read all the text.
     * The duration is in milliseconds since that is the time precision for ECMAScript timestamps.
     *
     * The estimate is assuming "Silent reading time" which seems to be 238 words per minute according
     * to [Marc Brysbaert's research] (https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786?via%3Dihub)
     *
     */
    readTime: number;
    /**
     * The character indices in the source text that demarcates specific fractions of the total numbers of word characters.
     *
     * Defaults to 0 %, 25 %, 50 %, 75 % and 100 % of the total number of letters respectively.
     * The index is for the character after the last letter that that does not exceed the boundary.
     * For example, the 25 % boundary of "abcd" is 1 (between a and b).
     */
    boundaries: {
        offset: number;
        wordsBefore: number;
        readTime: number;
    }[];
};
declare const getTextStats: (text: string, boundaryLimits?: number[]) => TextStats;
declare const join: {
    /** Joins the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
    <Source>(source: Source, separator?: string): Source extends Nullish ? Source : string;
    /** Joins the projection of the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
    <Source extends IterationSource, Projected, Signal extends typeof skip | typeof stop | never, Accumulator extends Projected = any>(source: Source, projection?: IterationProjection<Source, Accumulator, Projected | Signal>, separator?: string): Source extends Nullish ? Source : string;
};
declare const indent: <T extends string | Nullish>(text: T, indent?: string) => T extends Nullish ? T : string;
declare const stringify: <T>(value: T) => T extends undefined ? T : string;
declare const parseJson: <Value = any>(value: any, undefinedIfInvalid?: boolean) => Value extends Nullish | "" ? undefined : Value;
/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */
declare const itemize: {
    <Source extends IterationSource>(values: Source, conjunction?: null | string | [comma: string | Nullish, conjunction: string | Nullish], result?: (enumerated: string, n: number) => string): Source extends Nullish ? Source : string;
    <Source extends IterationSource, Projected, Accumulator extends Projected, Signal extends typeof skip | typeof stop | never>(values: Source, format: IterationProjection<Source, Accumulator, Projected | Signal>, conjunction?: string | [comma: string | Nullish, conjunction: string | Nullish], result?: (enumerated: string, n: number) => string): Source extends Nullish ? Source : string;
};

type EnumParser<Values> = _EnumParser<FilterEnumValues<Values>>;
declare const createEnumParser: <Values>(name: string, values: Values) => EnumParser<Values>;
type FilterEnumValues<T> = Pick<T, {
    [P in keyof T]: [T[P]] extends [P] ? T[P] : never;
}[keyof T]>;
type _EnumParser<Values, Keys extends string = keyof Values & string> = Values & {
    parse<T extends Keys | (string & {}) | number | Nullish, Validate extends boolean = true>(value: T, validate?: Validate): T extends Nullish ? undefined : Keys | (Validate extends true ? never : undefined);
    readonly levels: Keys[];
    readonly ranks: {
        [P in Keys]: number;
    };
    compare(lhs: Keys, rhs: Keys): number;
};

type QueryStringDelimiterValue = boolean | string | readonly string[] | readonly [];
type ParsedUri<QueryStringDelimiters extends QueryStringDelimiterValue = QueryStringDelimiterValue> = {
    /** The original URI that was parsed. */
    source: string;
    /** The name of the scheme excluding colon and slashes. */
    scheme?: string;
    /**
     * Whether the scheme includes two slashes or not (in which case it is a urn).
     * Slashes are only included when formatting the URI if this value is explicity `false`,
     * or {@link scheme} has a value and it is not explicitly `true`.
     *
     * @default false
     */
    urn?: boolean;
    /**
     * User name, password, host and port as much as any of these are part of the URI.
     * When formatting a parsed URI, this is not used, but rather the individual parts.
     */
    authority?: string;
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    path?: string;
    query?: QueryStringDelimiters extends false ? string : ParsedQueryString<Exclude<QueryStringDelimiters, null>>;
    fragment?: string;
};
declare const parameterListSymbol: unique symbol;
type ParsedQueryString<Delimiters extends QueryStringDelimiterValue> = Record<string, Delimiters extends Nullish | readonly [] | false ? string : string | string[]> & {
    [parameterListSymbol]?: [
        string,
        Delimiters extends Nullish | readonly [] | false ? string : string | string[]
    ];
};
declare const uriEncode: (value: any) => string | undefined;
declare const parseKeyValue: <Delimiters extends QueryStringDelimiterValue = ["|", ";", ","]>(value: string | Nullish, { delimiters, decode, lowerCase, }?: QueryStringParseOptions<Delimiters>) => readonly [key: string, value: string | undefined, values: string[]] | undefined;
/**
 * Parses an URI according to https://www.rfc-editor.org/rfc/rfc3986#section-2.1.
 * The parser is not pedantic about the allowed characters in each group
 *
 * @param uri The URI to parse
 * @param query Whether to parse the query into a record with each parameter and its value(s) or just the string.
 *  If an array is provided these are the characters that are used to split query string values. If this is empty, arrays are not parsed.
 * @returns A record with the different parts of the URI.
 */
declare const parseUri: <Uri extends string | Nullish, Delimiter extends QueryStringDelimiterValue = true, RequireAuthority extends boolean = false>(uri: Uri, { delimiters, requireAuthority, ...options }?: QueryStringParseOptions<Delimiter> & {
    requireAuthority?: RequireAuthority;
}) => PrettifyIntersection<RequireAuthority extends true ? PickRequired<ParsedUri<Delimiter>, "scheme" | "host" | "urn" | "path"> : ParsedUri<Delimiter>, true> | (Uri extends Nullish ? undefined : never);
type QueryStringParseOptions<Delimiters extends QueryStringDelimiterValue = [","]> = {
    /** Setting this to false disables parsing of query string parameters, and instead gives the raw query string in the URI parse result. */
    delimiters?: Delimiters;
    decode?: boolean;
    lowerCase?: boolean;
};
declare const parseHttpHeader: <V extends string | Nullish, Delimiter extends QueryStringDelimiterValue = ",">(query: V, options?: QueryStringParseOptions<Delimiter>) => PrettifyIntersection<ParsedQueryString<Delimiter>>;
declare const parseQueryString: <V extends string | Nullish, Delimiters extends QueryStringDelimiterValue = true>(query: V, options?: QueryStringParseOptions<Delimiters>) => PrettifyIntersection<ParsedQueryString<Delimiters>>;
declare const parseParameters: <V extends string | Nullish, Delimiters extends QueryStringDelimiterValue = true>(query: V, separator: string, { delimiters, ...options }?: QueryStringParseOptions<Delimiters>) => PrettifyIntersection<ParsedQueryString<Delimiters>>;
declare const toQueryString: <P extends Iterable<readonly [string, any]> | SimpleObject<string, any> | undefined>(parameters: P, delimiter?: string) => MaybeUndefined<P, string>;
declare const appendQueryString: <Uri extends string | undefined>(baseUri: Uri, parameters: Record<string, any> | Iterable<readonly [key: string, value: any]> | undefined) => MaybeUndefined<Uri, string>;
declare const mergeQueryString: <Uri extends string | undefined>(currentUri: Uri, parameters: Record<string, any> | Iterable<readonly [key: string, value: any]> | undefined) => MaybeUndefined<Uri, string>;
declare const formatUri: <Uri extends Omit<ParsedUri, "source">>(uri: Uri) => MaybeUndefined<Uri, string>;

/**
 * Common definition of expressions that are used for string matching.
 *
 * If not already a regular expression, a string that starts with `/` and optionally ends with `/` is parsed as regular expressions with flags `gu` applied (global and Unicode).
 * This enables defining regular expression in text based configuration files that do not have native regular expressions.
 *
 * For convenience an asterisk (`*`) can be used to match any number of characters in strings, and  `,` and white-space ` ` are interpreted as list separators.
 * `\` is used as the escape character so the string `\/escaped\*,and\ this` will only match the strings, literally, `\/escaped\*` and `and this`.
 * This also means that intentional backslashes, commas and spaces must be escaped as `\\`, `\,` and `\ ` respectively.
 *
 * Arrays of strings and/or regular expressions are evaluated as unions (_string 1_ "or" _string 2_ "or" ...).
 *
 * The special values `null`, `undefined`, the empty string,  and `false` are interpreted as "never", and `true` is "always".
 *
 * Regarding separators, they may be different in specific contexts. If so, it will be mentioned there.
 */
type ParsableRegExp = IterableOrSelf<null | undefined | boolean | string | RegExp> | Iterable<ParsableRegExp>;
declare const testRegex: <Nulls>(s: Nullable<string, Nulls>, match: Nullable<RegExp, Nulls>) => boolean | undefined;
declare const matches: <R, Nulls>(s: Nullable<string, Nulls>, regex: RegExp | Nullish, projection: (...args: string[]) => R | typeof skip | typeof stop | Nullish) => MaybeUndefined<Nulls, ConstToNormal<R>[]>;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */
declare const match: {
    <R, Nulls, Collect extends boolean = false>(s: Nullable<string, Nulls>, regex: RegExp | Nullish, projection: (...groups: (string | undefined)[]) => R | typeof skip | typeof stop | Nullish, map?: Collect): MaybeUndefined<Nulls, If<Collect, ConstToNormal<R>[], R | undefined>>;
    (s: string | Nullish, match: RegExp | Nullish): RegExpMatchArray | undefined;
};
/**
 * Replaces reserved characters to get a regular expression that matches the string.
 */
declare const escapeRegEx: <T extends string | Nullish>(input: T) => MaybeUndefined<T, string>;
declare const isRegEx: (value: any) => value is RegExp;
/**
 * Tests or parses a regular expression accepting the {@link ParsableRegExp} format.
 *
 * Strings are cached, so there is no need to do additional caching outside this function (as far as the caching would only concern strings).
 */
declare const parseRegex: <T>(input: T, separators?: readonly string[]) => T extends ParsableRegExp ? RegExp : undefined;
/**
 * Better minifyable version of `String`'s `split` method that allows a null'ish parameter.
 */
declare const split: <T extends string | Nullish>(s: T, separator: RegExp | string, trim?: boolean) => MaybeUndefined<T, string[]>;
/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */
declare const replace: <T extends string | Nullish>(s: T, match: RegExp, replaceValue: string | ((...args: string[]) => string)) => T;
/**
 * Constructs a regex where whitespace is ignored in the pattern (like .NET's RegexOptions.IgnorePatternWhitespace)
 *
 * e.g. `
  \\b    # word boundary
  (\\w+) # one or more word chars
  \\s*   # optional whitespace
  =      # equals sign
  \\s*   # optional whitespace
  (\\d+) # one or more digits
`
 */
declare const regex: (pattern: string, flags?: string) => RegExp;

export { ARRAY, type Add, type All, type AllKeys, type AllPartial, type AllRequired, type And, type Any, type AnyAll, type AnyRecordType, type ArgNulls, type ArrayOrSelf, type ArraysAsEmpty, type AssignSource, type AsyncItProjection, type AsyncIterationItem, type AsyncIterationProjection, type AsyncIterationSource, type AsyncIterationSourceOf, type AsyncIteratorFactory, type AsyncValue, BIGINT, BOOLEAN, type Binders, type CanBeEmpty, type CaptureFalsish, type CaptureNullish, type CaptureNullishOrFalse, type ChainedEventHandler, type Clock, type ClockCallback, type ClockSettings, type CommonTypeTemplate, type ConstToNormal, DATE, DAY, type Deferred, type DeferredAsync, type Defined, type DenyExtraProperties, type Empty, type Entries, type EnumParser, type ErrorGenerator, type ErrorHandler, type EventHandler, type ExcludeAny, type ExpandOnProperty, type ExpandTypes, type Extends, type ExtendsAny, type ExtractGenericType, F, FILTER_NULLISH, FOREVER, FUNCTION, type Falsish, type FalsishToUndefined, type Filter, type ForEachFunction, type Freeze, type FunctionComparisonEquals, type GeneralizeConstants, HOUR, type HasRequiredProperty, type HasValue, type Head, IDENTITY, ITERABLE, type IdentityFunction, type If, type IfNever, type IfNot, type IfNotNever, type Interval, type Intervals, InvariantViolatedError, type Is, type IsAny, type IsFalsish, type IsKnown, type IsNever, type IsNullish, type IsStrictlyUnknown, type IsTruish, type IsTuple, type IsUnknown, type ItemOrSelf, type IterableOrArrayLike, type IterableOrSelf, type IterationFilterCallback, type IterationProjected, type IterationProjection, type IterationSource, type IterationSourceOf, type IterationTypeGuardCallback, type IteratorItem, type Json, type JsonArray, type JsonObject, type JsonTuple, type KeyValuePairsToObject, type KeyValueProjection, type KeyValueSource, type KeyValueSourcesToObject, type Last, type Leading, type Listener, type Lock, type LockState, MAP, MAX_SAFE_INTEGER, MILLISECOND, MINUTE, MIN_SAFE_INTEGER, type MapSource, type MaybeArray, type MaybeDeferred, type MaybeDeferredAsync, type MaybeDeferredPromise, type MaybeFalsish, type MaybeNullish, type MaybeNullishOrFalse, type MaybeOmit, type MaybePick, type MaybePromise, type MaybePromiseLike, type MaybeUndefined, type Merge2Settings, type MergeGenericType, type MethodOverloads, type Mutable, NOOP, NULL, NUMBER, type Negate, type NoOpFunction, type NonAsync, type Not, type NotFunction, type NotIterable, type NotPromise, type NullFilterFunction, type Nullable, type Nullish, type NullishOrFalse, type Nulls, OBJECT, type ObjectSource, type OmitKeys, type OmitNullish, type OmitUnion, OpenPromise, type Or, type Overloads, PROMISE, type ParsableRegExp, type ParsedQueryString, type ParsedUri, type PartialDefined, type PartialExcept, type PartialRecord, type PickMethodOverload, type PickOverloads, type PickPartial, type PickRequired, type PickUnion, type Prefixes, type PrettifyIntersection, type Pretty, type Primitives, type ProjectGenericTypeValue, type PromiseIfPromiseLike, type Property, type QueryStringParseOptions, type ReadonlyRecord, type Rebinder, type ReplaceProperties, type RequireProperties, ResettablePromise, type RetrySettings, SECOND, SET, STRING, SYMBOL, type SimpleObject, type SnakeCase, type Sortable, type SourceListener, type StrictUndefined, type StrictUnion, type Subtract, T$1 as T, type Tail, type TakeFirst, type TakeLast, type TextStats, type Timer, type ToJsonable, type ToggleArray, type TogglePromise, type ToggleReadonly, type ToggleRequired, type TupleOrArray, type TupleParameter, type TypeConverter, type TypeTester, UNDEFINED, type Unbinder, type Undefined, type UndefinedIfEmpty, type UnionPropertyValue, type UnionToIntersection, type UnionToTuple, type UnknownIsAny, type Unwrap, type UnwrapPromiseLike, type ValueOrDefault, type VariableTuple, type WaitForOptions, type Wrapped, add, all, ansi, appendQueryString, array, asDeferred, asMap, asSet, assign, avg, awaitIfAwaitable, batch, changeCase, changeIdentifierCaseStyle, clock, clone, collect, concat, count, createChainedEvent, createEnumParser, createEvent, createEventBinders, createIntervals, createLock, createTimeout, createTimer, createTypeConverter, defer, deferred, deferredPromise, delay, dict, diff, distinct, ellipsis, equalsAny, escapeRegEx, exchange, filter, first, flatMap, forEach, forEachAwait, formatDuration, formatError, formatTimestamp, formatUri, get, getTextStats, group, hasKeys, hasMethod, hasMethods, hasProperty, ifDefined, indent, invariant, isArray, isAsyncIterable, isAwaitable, isBigInt, isBoolean, isDate, isError, isFalse, isFalsish, isFinite, isFunction, isInteger, isIterable, isJsonObject, isJsonString, isMap, isNotFalse, isNotTrue, isNullish, isNumber, isObject, isPlainObject, isPromiseLike, isRegEx, isSet, isString, isSymbol, isTrue, isTruish, itemize, iterable, join, joinEventBinders, jsonClone, jsonEquals, keyCount, keys, last, map, mapAwait, match, matches, max, merge, mergeQueryString, min, mutate, nil, now, obj, parameterListSymbol, parseBigInt, parseBoolean, parseDate, parseHttpHeader, parseJson, parseKeyValue, parseNumber, parseParameters, parseQueryString, parseRegex, parseUri, pick, pluralize, priorityQueue, promise, push, quote, race, range, regex, remove, replace, required, reset, resolveDeferred, round, set, skip, snakeCase, some, sort, split, stop, stringify, structuralEquals, sum, symbolAsyncIterator, symbolIterator, take, testRegex, throwError, throwTypeError, toIterable, toQueryString, toString, toggleAnsi, topoSort, traverse, truish, tryCatch, tryCatchAsync, trySet, typeCode, undefined$1 as undefined, unwrap, update, uriEncode, validate, valueTypeMarker, waitAll, waitFor, withRetry };

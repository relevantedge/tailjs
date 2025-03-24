import { skip2, stop2 } from ".";

import {
  Falsish,
  MaybePromiseLike,
  Nullish,
  NullishOrFalse,
  UnwrapPromiseLike,
} from "..";
import { AnyTuple, EntriesOf, KeyValueType as Kv2 } from "./_internal";

export type IterationProjection2<It, Accumulator, Projected, Context = It> = (
  item: IteratorItem2<It>,
  index: number,
  accumulator: unknown extends Accumulator ? any : Accumulator,
  context: Context
) =>
  | Projected
  | typeof skip2
  | typeof stop2
  // Encourage TypeScript to interpret return values as tuples rather than arrays,
  // e.g. `[1,2,[3,4]]` becomes `[number,number,[number,number]]` instead of `(number|number[])[]`).
  | AnyTuple;

export type AsyncIterationSource = MaybePromiseLike<
  IterationSource | AsyncIterable<any> | Iterable<PromiseLike<any>>
>;
export type AsyncIterationSourceOf<T> = MaybePromiseLike<
  | IterationSourceOf<T>
  | AsyncIterable<MaybePromiseLike<T>>
  | Iterable<PromiseLike<T>>
>;
export type AsyncIterationItem<It> = It extends PromiseLike<infer T>
  ? AsyncIterationItem<T>
  : It extends
      | AsyncIterable<MaybePromiseLike<infer T>>
      | Iterable<MaybePromiseLike<infer T>>
  ? T
  : It extends AsyncIterable<infer T>
  ? T
  : IteratorItem2<It>;

export type AsyncIterationProjection2<
  It,
  S,
  R,
  Context = It
> = IterationProjection2<
  Iterable<AsyncIterationItem<It>>,
  S,
  MaybePromiseLike<R>,
  Context
>;
export type IterationFilterCallback2<It> = (
  item: IteratorItem2<It>,
  index: number,
  previous: IteratorItem2<It> | undefined,
  context: It
) => any;

export type IterationTypeGuardCallback2<It, R> = (
  item: IteratorItem2<It>,
  index: number,
  previous: IteratorItem2<It> | undefined,
  context: It
) => item is R & IteratorItem2<It>;

export type IteratorItem2<T> = unknown extends T
  ? any
  : T extends Exclude<Falsish, number>
  ? never
  : T extends Iterable<infer T>
  ? T
  : T extends number
  ? number
  : T extends (current?: any) => infer Projected
  ? Projected
  : T extends object
  ? EntriesOf<T>
  : never;

export type IterationSource =
  | (object & Record<any, any>)
  | Iterable<any>
  | number
  | ((current: any) => any)
  | NullishOrFalse; // Also `false` to support constructs like `something > 0 && array`

export type IterationSourceOf<T> = unknown extends T
  ? IterationSource
  : [T] extends [never]
  ? IterationSource
  :
      | (T extends Kv2<infer K extends keyof any, infer V>
          ? { [P in K]: V }
          : never)
      | (T extends number ? number : never)
      | ((current: T) => T | undefined)
      | Iterable<T>
      | Iterator<T>
      | Falsish;

export type IterationProjected<R, ExcludeTypes = never> = R extends
  | typeof skip2
  | typeof stop2
  ? never
  : Exclude<R, ExcludeTypes>;

export type AsyncItProjection<R> = IterationProjected<UnwrapPromiseLike<R>>;

export type AsyncIteratorFactory<T = any, V = any> = (
  target: T
) => MaybePromiseLike<IteratorResult<V>>;

export type Sortable = string | boolean | number | Nullish;

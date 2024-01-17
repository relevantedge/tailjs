import {
  hasValue,
  identity,
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from ".";

export const UTF16MAX = 0xffff;

export const fromCodePoints = String.fromCodePoint;

export const toCharCodes = (s: string) =>
  [...new Array(s.length)].map((_, i) => s.charCodeAt(i));
export const codePoint = (string: string, index: number = 0) =>
  string.codePointAt(index)!;

export type IteratorSource<T, Start = undefined> =
  | (Start extends number | undefined
      ? null | undefined | number | Iterable<T> | Record<keyof any, any>
      : never)
  | FunctionIteratorStep<Start extends undefined ? T : Start>;

export type IteratorItem<S extends IteratorSource<any>> = S extends number
  ? number
  : S extends string
  ? [char: string, code: number]
  : S extends Record<infer K, infer V> & { [Symbol.iterator]?: never }
  ? S extends (...args: any) => infer T | undefined
    ? T
    : [K, V]
  : S extends IteratorSource<infer T, any>
  ? T
  : never;

export type IteratorAction<S extends IteratorSource<any>, R> = (
  value: IteratorItem<S>,
  index: number,
  control: IteratorControl<IteratorItem<S>, R>
) => R | undefined | void;

export type DefaultReturnForSource<S extends IteratorSource<any>> =
  S extends number ? number : S extends IteratorSource<infer T> ? T : never;

export type StartEndArgs<S extends IteratorSource<any, Start>, Start> = [
  start?: Start,
  end?: S extends any[] ? number | undefined : never
];

export type FunctionIteratorStep<T> = (current: T | undefined) => T | undefined;

export interface IteratorControl<T, R = undefined> {
  readonly remaining?: number;
  readonly n?: number;
  previous: T | undefined;
  peek(delta?: number): T | undefined;
  skip(count?: number): undefined;
  next(count?: number): T | undefined;
  append(value: R): void;
  end(returnValue?: R): R | undefined;
}

function* createRangeIterator(n: number, offset: number) {
  while (n--) yield offset++;
}

function* createStringIterator(input: string, start: number, end: number) {
  for (; start < end; start++) {
    const codePoint = input.codePointAt(start)!;
    let p = input[start];
    if (codePoint > UTF16MAX) {
      ++start;
      p = String.fromCodePoint(codePoint);
    }
    yield [p, codePoint];
  }
}

// Kept to reduce the size of the encoder parts of this library since it doesn't need the full blown iterators.
// (Instead of it using map("...",...), that is).
export const mapString = <R>(
  input: string,
  map: ([char, code]: [string, number], index: number) => R
) => [...createStringIterator(input, 0, input.length)].map(map);

function* createArrayIterator<T>(
  source: {
    [index: number]: T;
    length: number;
  },
  start: number,
  end: number
) {
  for (; start < end; start++) {
    yield source[start];
  }
}

function* createFunctionIterator<T, Start extends T | undefined>(
  advance: FunctionIteratorStep<T>,
  start?: Start | T
) {
  if (isDefined(start)) yield start;

  while (isDefined((start = advance(start)))) {
    yield start;
  }
}

export function* project<
  S extends IteratorSource<any, Start>,
  R = IteratorItem<S>,
  Start = any
>(
  source: S,
  action: IteratorAction<S, R>,
  ...[start, end]: StartEndArgs<S, Start>
) {
  let n: number | undefined = isNumber(source)
    ? source
    : (source as any)?.length;

  if (source == null || n === 0) {
    return null;
  }

  let actionResult: any;
  let value: any = undefined;
  let done = false;
  let i = -1;
  let iteratorItem: IteratorResult<IteratorItem<S>>;
  let iterationLimit: number;
  const moveNext = (peeking = false) => {
    if (done) return false;
    ++i;
    if (!peeking || !peeked.length) {
      iteratorItem = it.next();
      value = iteratorItem.value;
    } else {
      value = peeked.shift();
    }
    (control as any).previous = value;
    return !(done = iteratorItem.done!);
  };
  const peeked: IteratorItem<S>[] = [];
  const appended: R[] = [];
  const skip = (count: number, peek: boolean) => {
    while (count-- && moveNext()) {
      if (peek) {
        peeked.push(value);
      }
    }
  };
  const control: IteratorControl<IteratorItem<S>, R> = {
    n,
    get remaining() {
      return (n as any) - i;
    },
    previous: undefined,
    peek: (delta = 1) => {
      if (delta < peeked.length) return peeked[delta];
      skip(delta, true);
      return value;
    },
    skip: (count = 1) => skip(count, false) as any,
    next: (count = 1) => (control.skip(count), value),
    append: (value: R) => {
      appended.push(value);
    },
    end: (returnValue) => ((done = true), returnValue),
  };

  iterationLimit = Number.MAX_SAFE_INTEGER;
  if (!isFunction(source)) {
    i = ((start as any) ??= 0) - 1;

    if (isUndefined(n)) {
      while ((start as any)--) moveNext();
    } else if (!isNumber(n) && (start as any) < 0) {
      start = (n + start) as any;
    }

    if ((isUndefined(end) || isNumber(end)) && (end ??= n as any) != null) {
      if ((end as any) < 0) (end as any) = isDefined(n) ? n + (end as any) : 0;
      iterationLimit = (end as any) - (start as any);
    }
  }

  const it = (
    isFunction(source)
      ? createFunctionIterator(source, start)
      : isUndefined(start) || isNumber(start)
      ? isIterable(source)
        ? isArray(source)
          ? createArrayIterator(source, start!, end as any)
          : source
        : isNumber(source)
        ? createRangeIterator(source, start!)
        : isString(source)
        ? createStringIterator(source, start!, end as any)
        : isObject(source)
        ? createArrayIterator(Object.entries(source), start!, end as any)
        : createRangeIterator(source, start as any)
      : []
  )[Symbol.iterator]();

  while (moveNext() && iterationLimit--) {
    actionResult = action(value, i, control);
    if (isDefined(actionResult)) {
      yield actionResult;
    }

    while (appended.length) {
      yield appended.shift();
    }
  }
}

export const map = <
  S extends IteratorSource<any, Start>,
  R = IteratorItem<S>,
  Start = any
>(
  source: S,
  projection?: IteratorAction<S, R>,
  ...rest: StartEndArgs<S, Start>
): R[] =>
  (!hasValue(source)
    ? []
    : !projection && isArray(source)
    ? source
    : [...project(source, projection ?? (identity as any), ...rest)]) as any;

export const forEach = <
  S extends IteratorSource<any, Start>,
  R = IteratorItem<S>,
  Start = any
>(
  source: S,
  action: IteratorAction<S, R>,
  ...rest: StartEndArgs<S, Start>
): R | undefined => {
  let returnValue: R | undefined = undefined;
  for (const value of project(source, action as any, ...rest)) {
    returnValue = value;
  }
  return returnValue;
};

export const reduce = <
  S extends IteratorSource<any, Start>,
  R = IteratorItem<S>,
  Start = any
>(
  source: S,
  reducer: (
    ...args: [accumulator: R, ...rest: Parameters<IteratorAction<S, R>>]
  ) => R,
  seed: R,
  ...rest: StartEndArgs<S, Start>
): R =>
  forEach(
    source,
    (value, index, control) =>
      (seed = (reducer(seed, value, index, control) as any) ?? seed),
    ...rest
  ) ?? seed;

export type Filter<S extends IteratorSource<any>> = (
  value: IteratorItem<S>,
  index: number
) => any;

// Using different internal name to avoid parameter name clashes.
const projectFiltered = <S extends IteratorSource<any, Start>, Start = any>(
  source: S,
  filter: Filter<S>,
  ...rest: StartEndArgs<S, Start>
): S extends any[] ? S : Iterable<IteratorItem<S>> =>
  (isArray(source) ? (map as any) : project)(
    source,
    (value: any, index: number) => (filter(value, index) ? value : undefined),
    ...rest
  ) as any;
export { projectFiltered as filter };

export const mapFiltered = <S extends IteratorSource<any, Start>, Start = any>(
  source: S,
  filter: Filter<S>,
  ...rest: StartEndArgs<S, Start>
) => map(projectFiltered(source, filter, ...rest));

export const count = <S extends IteratorSource<any, Start>, Start = any>(
  source: S,
  filter?: Filter<S>,
  ...rest: StartEndArgs<S, Start>
) =>
  filter
    ? count(projectFiltered(source, filter, ...rest))
    : (source as any).length ??
      (source as any).size ??
      reduce(source, (n) => n + 1, 0);

export const sum = <S extends IteratorSource<any, Start>, Start = any>(
  source: S,
  selector: IteratorAction<S, number>,
  ...rest: StartEndArgs<S, Start>
) =>
  reduce(
    source,
    (sum, value, index, control) =>
      sum + (selector(value, index, control) ?? 0),
    0,
    ...rest
  );

export const any = <S extends IteratorSource<any, Start>, Start = any>(
  source: S,
  filter?: Filter<S>,
  ...rest: StartEndArgs<S, Start>
) =>
  filter
    ? any(projectFiltered(source, filter, ...rest))
    : !!forEach(source, () => true);

export const use = <R>(declarations: (...args: any) => R): R => declarations();

import {
  IterableOrArrayLike,
  MaybeArray,
  MaybeUndefined,
  ifDefined,
  isArray,
  isIterable,
  last,
  map,
} from "..";

export const pluralize = <T>(
  noun: T,
  count: number
): MaybeUndefined<T, string> =>
  ifDefined(noun, () => noun + (count !== 1 ? "s" : ""));

export const conjunct = <T>(
  values: T,
  conjunction = "and"
): MaybeUndefined<T, string> =>
  ifDefined(
    values,
    (values: any) => (
      (values = isIterable(values)
        ? map(values, (value) => value + "")
        : [values + ""]),
      values.length === 0
        ? ""
        : values.length === 1
        ? values[0]
        : `${values.slice(0, -1).join(", ")} ${conjunction} ${last(values)}`
    )
  );

export const quote = <T>(
  item: T
): MaybeUndefined<
  T,
  T extends string
    ? string
    : T extends IterableOrArrayLike<any>
    ? string[]
    : string
> =>
  ifDefined(item, (item) =>
    isIterable(item) ? map(item, (item) => "'" + item + "'") : "'" + item + "'"
  ) as any;

export const capitalize = <T extends string | undefined>(
  sentence: T
): MaybeUndefined<T, string> =>
  ifDefined(sentence, (sentence) =>
    sentence.length > 0
      ? sentence.slice(0, 1).toUpperCase() + sentence.slice(1)
      : ""
  );

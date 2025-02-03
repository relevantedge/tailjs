import {
  filter2,
  forEach2,
  isArray,
  isIterable,
  IterationProjection2,
  IterationSource,
  map2,
  Nullish,
  replace,
  skip2,
  stop2,
} from "..";

const isEmptyString = (s: any) =>
  s == null || typeof s === "boolean" || s.toString() === "";

export const join2: {
  /** Joins the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
  <Source>(source: Source, separator?: string): Source extends Nullish
    ? Source
    : string;
  /** Joins the projection of the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
  <
    Source extends IterationSource,
    Projected,
    Signal extends typeof skip2 | typeof stop2 | never,
    Accumulator extends Projected = any
  >(
    source: Source,
    projection?: IterationProjection2<Source, Accumulator, Projected | Signal>,
    separator?: string
  ): Source extends Nullish ? Source : string;
} = (source: any, arg1: any, arg2?: any) =>
  source == null
    ? source
    : !isIterable(source)
    ? isEmptyString(source)
      ? ""
      : source.toString()
    : filter2(
        typeof arg1 === "function"
          ? map2(source, arg1)
          : ((arg2 = arg1), source),
        isEmptyString,
        true
      ).join(arg2 ?? "");

export const indent2 = <T extends string | Nullish>(
  text: T,
  indent = "  "
): T extends Nullish ? T : string => {
  if (text == null) return text as any;
  let i = 0;
  let baseIndent = 0;
  return replace(text, /( *)([^\r\n]*)(\r?\n?)/g, (_, lineIndent, text, br) => {
    if (!text) {
      return br;
    }
    if (!i++) {
      baseIndent = lineIndent.length;
    }
    return `${indent}${
      lineIndent.length >= baseIndent ? lineIndent.slice(baseIndent) : ""
    }${text}${br}`;
  }) as any;
};

export const toJSON2 = JSON.stringify;
export const fromJSON2 = <Value extends string | Nullish>(
  value: Value
): Value extends Nullish ? Value : string =>
  value == null ? value : JSON.parse(value);

/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */
export const itemize2: {
  <Source extends IterationSource>(
    values: Source,
    conjunction?:
      | null
      | string
      | [comma: string | Nullish, conjunction: string | Nullish],
    result?: (enumerated: string, n: number) => string
  ): Source extends Nullish ? Source : string;
  <
    Source extends IterationSource,
    Projected,
    Accumulator extends Projected,
    Signal extends typeof skip2 | typeof stop2 | never
  >(
    values: Source,
    format: IterationProjection2<Source, Accumulator, Projected | Signal>,
    conjunction?:
      | string
      | [comma: string | Nullish, conjunction: string | Nullish],
    result?: (enumerated: string, n: number) => string
  ): Source extends Nullish ? Source : string;
} = (values: any, separators?: any, result?: any, rest?: any) => {
  if (!values && values !== 0) return values == null ? values : undefined;

  if (typeof separators === "function") {
    return itemize2(map2(values, separators), result, rest);
  }

  const first: string[] = [];
  const last = forEach2(values, (item, _, prev) =>
    isEmptyString(item) ? skip2 : (prev && first.push(prev), item.toString())
  );

  let [separator, conjunction] = isArray(separators)
    ? separators
    : [, separators];

  separator ??= ",";
  conjunction =
    (conjunction ??= "and")[0] === separator
      ? // The conjunction starts with the separator for "1, 2, or 3".
        conjunction + " "
      : " " +
        // Don't add two spaces if the conjunction is the empty string.
        (conjunction ? conjunction + " " : "");

  const enumerated = first.length
    ? `${first.join(separator + " ")}${conjunction}${last}`
    : last ?? "";

  return result
    ? result(enumerated, first.length + +(last != null))
    : (enumerated as any);
};

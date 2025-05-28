import { TrackingBoundaryData } from "@tailjs/types";
import {
  IterationProjection,
  IterationSource,
  MINUTE,
  MaybeUndefined,
  Nullish,
  filter,
  forEach,
  isArray,
  map,
  replace,
  round,
  skip,
  stop,
  symbolIterator,
  tryCatch,
  undefined,
} from ".";

export const changeCase = <S extends string | null | undefined>(
  s: S,
  upper: boolean
): S => (s == null ? s : upper ? s.toUpperCase() : s.toLowerCase()) as S;

export const changeIdentifierCaseStyle = (
  identifier: string,
  type: "camel" | "pascal" | "kebab" | "snake"
) =>
  identifier.replace(
    /([_-]*)(\$*(?:[A-Z]+|[a-z]))([a-z0-9]*)/g,
    (_, underscores, initial, rest, index) =>
      (underscores && (!index || type === "kebab" || type === "snake")
        ? underscores.replace(/./g, type === "snake" ? "-" : "_")
        : "") +
      ((index && (type === "kebab" || type === "snake") && !underscores
        ? type === "snake"
          ? "-"
          : "_"
        : "") +
        changeCase(initial, type === "pascal" || (type === "camel" && index)) +
        changeCase(
          type === "kebab" || type === "snake"
            ? rest.replace(
                /(?<=\D)\d|(?<=\d)\D/g,
                type === "kebab" ? "_$&" : "-$&"
              )
            : rest,
          false
        ))
  );

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
export const pluralize = <
  T extends string | Nullish,
  N extends number | Nullish,
  Plural extends string = string
>(
  singular: T,
  n: N | [count: N],
  plural?: Plural
): T extends Nullish ? undefined : N extends Nullish ? undefined : string =>
  singular == null
    ? (undefined as any)
    : isArray(n)
    ? (n = n[0]) == null
      ? undefined
      : n + " " + pluralize(singular, n, plural)
    : n == null
    ? undefined!
    : n === 1
    ? singular
    : plural ?? (singular === "is" ? "are" : singular + "s");

let ansiSupported = true;

/** Enables or disables ANSI formatting in console output. */
export const toggleAnsi = (toggle = true) => (ansiSupported = toggle);

/**
 * Can colorize text using ANSI escape sequences.
 * See e.g. https://developer.chrome.com/docs/devtools/console/format-style for options.
 */
export const ansi = <Buffer extends string[] | undefined = undefined>(
  value: string | string[],
  ps: string | number,
  buffer?: Buffer
): Buffer extends undefined ? string : string[] =>
  buffer
    ? (ansiSupported && buffer.push("\x1B[", ps + "", "m"),
      isArray(value) ? buffer.push(...value) : buffer.push(value),
      ansiSupported && buffer.push("\x1B[m"),
      buffer)
    : (ansi(value, ps, []).join("") as any);

type UppercaseLetter =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "W"
  | "X"
  | "Y"
  | "Z";

/**
 * This is intended for prettifying enum names (like ServerWrite becomes 'server-write'), alas it does currently not work with
 * ts-json-schema-generator. Kept in the hope this will be supported one day.
 */
export type SnakeCase<
  S extends string | Nullish,
  First = true
> = S extends Nullish
  ? undefined
  : S extends `${infer P}${infer Rest}`
  ? [P, First] extends [UppercaseLetter, false]
    ? `-${Lowercase<P>}${SnakeCase<Rest, false>}`
    : `${Lowercase<P>}${SnakeCase<Rest, false>}`
  : S extends string
  ? Lowercase<S>
  : undefined;

export const snakeCase = <S extends string | Nullish>(
  s: S
): MaybeUndefined<S, SnakeCase<S>> =>
  replace(s, /(.)?([A-Z])/g, (_, prev, p) =>
    ((prev ? prev + "-" : "") + p).toLowerCase()
  ) as any;

export const quote = <T>(
  item: T,
  quoteChar = "'"
): MaybeUndefined<T, T extends Iterable<any> ? string[] : string> =>
  item == null
    ? (undefined as any)
    : item[symbolIterator]
    ? map(item, (item) => quote(item, quoteChar))
    : quoteChar + item + quoteChar;

export const ellipsis = <T extends string | Nullish>(
  text: T,
  maxLength: number,
  debug = false
): T =>
  text &&
  ((text.length > maxLength
    ? debug
      ? `${text.slice(0, maxLength)}... [and ${text.length - maxLength} more]`
      : text.slice(0, maxLength - 1) + "…"
    : text) as any);

/** Word statistics for a text. */
export type TextStats = {
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
  boundaries: { offset: number; wordsBefore: number; readTime: number }[];
};

export const getTextStats = (
  text: string,
  boundaryLimits = [0, 0.25, 0.5, 0.75, 1]
): TextStats => {
  let charMatcher = /[\p{L}\p{N}][\p{L}\p{N}'’]*|([.!?]+)/gu;
  let match: RegExpMatchArray | null;
  let chars = 0;
  let words = 0;
  let longWords = 0;
  let sentences = 0;

  let hasWord = false;
  while ((match = charMatcher.exec(text))) {
    if (match[1]) {
      hasWord && ++sentences;
      hasWord = false;
    } else {
      hasWord = true;
      chars += match[0].length;
      match[0].length > 6 && ++longWords;
      ++words;
    }
  }
  hasWord && ++sentences;
  charMatcher = /[\p{L}\p{N}]|([^\p{L}\p{N}]+)/gu;

  const limits = boundaryLimits.map((boundary) => (boundary * chars) | 0);
  const boundaries: TextStats["boundaries"] = [];

  let index = 0;
  let prevIndex: number | undefined;
  let wordsBefore = 0;
  let inSentence = false;

  do {
    match = charMatcher.exec(text)!;
    if (match?.[1]) {
      // Word delimiter
      inSentence && ++wordsBefore;
    } else {
      index = match?.index!;
      let wasBoundary = false;
      for (let i = 0; i < limits.length; i++) {
        if (!limits[i]--) {
          boundaries[i] = {
            offset: prevIndex ?? index,
            wordsBefore,
            readTime: round(MINUTE * (wordsBefore / 238)),
          };
          wasBoundary = true;
        }
      }
      (inSentence = !wasBoundary) || (wordsBefore = 0);
      prevIndex = index + 1;
    }
  } while (match);

  return {
    text,
    length: text.length,
    characters: chars,
    words,
    sentences,
    lix: round(words / sentences + (100 * longWords) / words),
    readTime: round(MINUTE * (words / 238)),
    boundaries,
  };
};

const isEmptyString = (s: any) =>
  s == null || typeof s === "boolean" || s.toString() === "";

export const join: {
  /** Joins the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
  <Source>(source: Source, separator?: string): Source extends Nullish
    ? Source
    : string;
  /** Joins the projection of the specified values with the specified separator (default ""). `null`, `undefined`, empty strings and booleans are omitted. */
  <
    Source extends IterationSource,
    Projected,
    Signal extends typeof skip | typeof stop | never,
    Accumulator extends Projected = any
  >(
    source: Source,
    projection?: IterationProjection<Source, Accumulator, Projected | Signal>,
    separator?: string
  ): Source extends Nullish ? Source : string;
} = (source: any, arg1: any, arg2?: any) =>
  source == null
    ? source
    : typeof source === "string"
    ? source
    : source[symbolIterator]
    ? filter(
        typeof arg1 === "function"
          ? map(source, arg1)
          : ((arg2 = arg1), source),
        isEmptyString,
        true
      ).join(arg2 ?? "")
    : typeof source === "boolean"
    ? ""
    : source.toString();

export const indent = <T extends string | Nullish>(
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

export const stringify: <T>(value: T) => T extends undefined ? T : string =
  JSON.stringify;

export const parseJson = <Value = any>(
  value: any,
  undefinedIfInvalid = false
): Value extends Nullish | "" ? undefined : Value =>
  value == null || value === ""
    ? undefined
    : typeof value === "object"
    ? value
    : undefinedIfInvalid
    ? tryCatch(
        () => JSON.parse(value + "") as TrackingBoundaryData,
        () => {}
      )
    : JSON.parse(value + "");

/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */
export const itemize: {
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
    Signal extends typeof skip | typeof stop | never
  >(
    values: Source,
    format: IterationProjection<Source, Accumulator, Projected | Signal>,
    conjunction?:
      | string
      | [comma: string | Nullish, conjunction: string | Nullish],
    result?: (enumerated: string, n: number) => string
  ): Source extends Nullish ? Source : string;
} = (values: any, separators?: any, result?: any, rest?: any) => {
  if (!values && values !== 0) return values == null ? values : undefined;

  if (typeof separators === "function") {
    return itemize(map(values, separators), result, rest);
  }

  const first: string[] = [];
  const last = forEach(values, (item, _, prev) =>
    isEmptyString(item) ? skip : (prev && first.push(prev), item.toString())
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

import {
  IDENTITY,
  IteratorAction,
  IteratorSource,
  MINUTE,
  MaybeUndefined,
  Nullish,
  array,
  filter,
  forEach,
  isArray,
  isBoolean,
  isFunction,
  isIterable,
  isNumber,
  isObject,
  isString,
  map,
  push,
  replace,
  round,
  symbolIterator,
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

export type EnumerationSeparators = string | [last: string, other?: string];

/**
 * Creates a string enumerating a list of value given a separator, optionally using a different separator between the last two items.
 *
 * @param values - The list of items to enumerator.
 * @param separator - The separator to use (defaults to ", "). If given a tuple, the first item is the last separator without spaces.
 * The second item may optionally specify another separator than the default (", ").
 *
 *
 * Useful for enumerations like "item1, item2 and item 3" (`separate(["item1", "item2", "item3"], ["and"])`).
 */
export const enumerate = <T extends Iterable<any> | Nullish>(
  values: T,
  separator: EnumerationSeparators = ["and", ", "]
): MaybeUndefined<T, string> => {
  if (!values) return undefined as any;

  const filtered = array(values).filter(IDENTITY);
  return (
    filtered.length === 0
      ? ""
      : filtered.length === 1
      ? filtered[0] + ""
      : isArray(separator)
      ? [
          filtered.slice(0, -1).join(separator[1] ?? ", "),
          " ",
          separator[0],
          " ",
          filtered[filtered.length - 1],
        ].join("")
      : filtered.join(separator ?? ", ")
  ) as any;
};

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
    ? (ansiSupported && push(buffer, "\x1B[", ps, "m"),
      isArray(value) ? push(buffer, ...value) : push(buffer, value),
      ansiSupported && push(buffer, "\x1B[m"),
      buffer)
    : (ansi(value, ps, []).join("") as any);

const indent = (buffer: string[], n: number, ...values: string[]) => (
  push(buffer, "  ".repeat(n), ...values), buffer
);
const br = (buffer: string[], indents = 0) => (
  indents > 0 && indent(buffer, indents), push(buffer, "\n"), buffer
);

const prettyPrint = (
  value: any,
  buffer: string[] = [],
  indents = 0,
  terminator = ""
) => {
  const wrap = (
    start: string,
    end: string,
    content: (buffer: string[]) => void
  ) => {
    ansi(start, 90, buffer);
    const subBuffer: string[] = [];
    content(subBuffer);
    subBuffer.length &&
      (br(buffer, indents), push(buffer, ...subBuffer)) &&
      indent(buffer, indents);

    ansi(end, 90, buffer);
  };

  if (value == null) {
    ansi(value === undefined ? "(undefined)" : "(null)", "37;2", buffer);
  } else if (isIterable(value)) {
    wrap("[", "]", (buffer) =>
      forEach(
        value,
        (value) => (
          indent(buffer, indents),
          prettyPrint(value, buffer, indents + 1, ",\n")
        )
      )
    );
  } else if (isObject(value)) {
    wrap("{", "}", (buffer) =>
      forEach(
        value,
        ([key, value]) => (
          indent(buffer, indents + 1),
          ansi(["" + (key as any), ":"], "90;3", buffer),
          push(buffer, " "),
          prettyPrint(value, buffer, indents + 1, ",\n")
        )
      )
    );
  } else if (isString(value)) {
    ansi(value, 36, buffer);
  } else if (isNumber(value) || isBoolean(value)) {
    ansi("" + value, 33, buffer);
  } else {
    push(buffer, value);
  }
  terminator && push(buffer, terminator);
  return buffer;
};

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
  maxLength: number
): T =>
  text && ((text.length > maxLength ? text.slice(0, -1) + "…" : text) as any);

export const join: {
  /**
   *  Joins the specified items with a separator (default is "").
   *  If the source is a string it will be returned as is.
   *
   *  The value `false` will be omitted to help syntax like `[condition && "yes"]`.   .
   */
  <S extends IteratorSource | string>(
    source: S,
    separator?: string | readonly [string, string]
  ): MaybeUndefined<S, string>;

  /**
   * Joins the projection of the specified items with a separator (default is "").
   * If the source is a string it will be considered an array with the string as its single element.
   */
  <S extends IteratorSource | string>(
    source: S,
    projection: IteratorAction<S extends string ? [string] : S>,
    separator?: EnumerationSeparators
  ): MaybeUndefined<S, string>;
} = (source: any, projection: any, sep?: any) =>
  source == null
    ? undefined
    : isFunction(projection)
    ? enumerate(
        map(isString(source) ? [source] : source, projection),
        sep ?? ""
      )
    : isString(source)
    ? source
    : enumerate(
        map(source, (item) => (item === false ? undefined : item)),
        projection ?? ""
      );

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

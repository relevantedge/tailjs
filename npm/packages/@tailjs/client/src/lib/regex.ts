import type {
  ConstToNormal,
  IterableOrSelf,
  Nullish,
  Nulls,
} from "@tailjs/util";
import {
  REGEX,
  TestOrConvertFunction,
  array,
  bool,
  filter,
  map,
  str,
  testOrConvertFunction,
  undefined,
  distinct,
  size,
  nil,
  push,
} from ".";

/**
 * Common definition of expresions that are used for string matching.
 *
 * If not already a regular expression, a string that starst with `/` and optionally ends with `/` is parsed as regular expressions with flags `gu` applied (global and Unicode).
 * This enables defining regular expression in text based configuration files that do not have native regular expressions.
 *
 * For convenience an asterisk (`*`) can be used to match any number of characters in strings, and  `,` and white-space ` ` are intepreted as list separators.
 * `\` is used as the escape character so the string `\/escaped\*,and\ this` will only match the strings, literally, `\/escaped\*` and `and this`.
 * This also means that intentional backslashes, commas and spaces must be escaped as `\\`, `\,` and `\ ` respectively.
 *
 * Arrays of strings and/or regular expressions are evaluated as unions (_string 1_ "or" _string 2_ "or" ...).
 *
 * The special values `null`, `undefined`, the empty string,  and `false` are interpreted as "never", and `true` is "always".
 *
 * Regarding separators, they may be different in specific contexts. If so, it will be mentioned there.
 */
export type ParsableRegExp =
  | IterableOrSelf<null | undefined | boolean | string | RegExp>
  | Iterable<ParsableRegExp>;

/**
 * `Regex.test` optimized for minifying.
 */
export const test = (s: string | Nullish, match: RegExp | Nullish) =>
  !!(s && match) && match.test(s);

let matchSelected: any;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */
export const match: {
  <R>(
    s: string | Nullish,
    match: RegExp | Nullish,
    selector: (...args: string[]) => R | Nullish,
    defaultValue: R[]
  ): ConstToNormal<R>[];
  <R>(
    s: string | Nullish,
    match: RegExp | Nullish,
    selector: (...args: string[]) => R,
    defaultValue?: R
  ): ConstToNormal<R> | undefined;
  (s: string | Nullish, match: RegExp | Nullish): RegExpMatchArray | null;
} = <R>(
  s: string,
  regex: RegExp,
  selector?: (...args: string[]) => R,
  defaultValue?: R
) =>
  s &&
  regex &&
  (selector
    ? (array(defaultValue)
        ? match(
            s,
            regex,
            (...args) =>
              (matchSelected = selector(...args)) != nil &&
              push(defaultValue as any, matchSelected)
          )
        : s.replace(
            regex,
            (...args) => ((defaultValue = selector(...args)), "")
          ),
      defaultValue)
    : s.match(regex));

/**
 * Replaces reserved characters to get a regular expression that matches the string.
 */
export const escapeRegEx = (input: string) =>
  input.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&");

const REGEX_NEVER = /\z./g;
const unionOrNever = (parts: (string | Nullish)[], joined?: string) =>
  (joined = join(distinct(filter(parts, size)), "|"))
    ? new RegExp(joined, "gu")
    : REGEX_NEVER;

const stringRuleCache: { [pattern: string]: RegExp } = {};
/**
 * Tests or parses a regular expression accepting the {@link ParsableRegExp} format.
 *
 * Strings are cached, so there is no need to do additional caching outside this function (as far as the caching would only concern strings).
 */
export const regex: TestOrConvertFunction<
  RegExp,
  ParsableRegExp,
  [separators?: string[]]
> = testOrConvertFunction(
  REGEX,
  (input: string | boolean | any[] | Nullish, separators = [",", " "]) =>
    regex(input)
      ? input
      : array(input) // Parse individual specifiers, and join them into one long regex. An empty array is interpreted as "never".
      ? unionOrNever(
          map(input, (part) => regex(part, false, separators)?.source)
        )
      : bool(input)
      ? input // `true` is "always", `false` is "never"
        ? /./g
        : REGEX_NEVER // Matches nothing. End of string followed by something is never the case.
      : str(input)
      ? (stringRuleCache[input] ??= match(
          input || "",
          /^(?:\/(.+?)\/?|(.*))$/gu,
          (_, regex, text) =>
            regex
              ? new RegExp(regex, "gu")
              : unionOrNever(
                  map(
                    split(
                      text,
                      new RegExp(
                        `?<!(?<!\\)\\)[${join(map(separators, escapeRegEx))}]/`
                      )
                    ),
                    (text) =>
                      text &&
                      `^${join(
                        map(
                          // Split on non-escaped asterisk (Characterized by a leading backslash that is not itself an escaped backslash).
                          split(text, /(?<!(?<!\\)\\)\*/),
                          (part) =>
                            escapeRegEx(
                              // Remove backslashes used for escaping.
                              replace(part, /\\(.)/g, "$1")
                            )
                        ),
                        // Join the parts separated by non-escaped asterisks with the regex wildcard equivalent.
                        ".*"
                      )}$`
                  )
                )
        )!)
      : undefined
);

/**
 * Better minifyable version of `String`'s `split` method that allows a null'ish parameter.
 */
export const split = <T extends string | Nullish>(
  s: T,
  separator: RegExp | string
): T extends string ? string[] : string[] | Nulls<T> =>
  s?.split(separator) ?? (s as any);

/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */
export const replace = <T extends string | Nullish>(
  s: T,
  match: RegExp,
  replaceValue: string | ((...args: string[]) => string)
): T => s?.replace(match, replaceValue as any) ?? (s as any);

/**
 *  Better minifyable version of `String`'s `join` method that allows a null'ish parameter and removes empty.
 */
export const join = <T extends (string | Nullish)[] | Nullish>(
  s: T,
  separator = ""
): string | Nulls<T> => (s?.join(separator) ?? s) as any;

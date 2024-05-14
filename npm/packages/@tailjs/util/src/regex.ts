import {
  If,
  MaybeUndefined,
  Nullable,
  distinct,
  filter,
  isArray,
  isBoolean,
  isString,
  join,
  map,
  nil,
  undefined,
  type ConstToNormal,
  type IterableOrSelf,
  type Nullish,
} from ".";

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
export type ParsableRegExp =
  | IterableOrSelf<null | undefined | boolean | string | RegExp>
  | Iterable<ParsableRegExp>;

export const testRegex = <Nulls>(
  s: Nullable<string, Nulls>,
  match: Nullable<RegExp, Nulls>
) => (!match || s == null ? undefined : match.test(s));

export const matches = <R, Nulls>(
  s: Nullable<string, Nulls>,
  regex: RegExp | Nullish,
  selector: (...args: string[]) => R | Nullish
): MaybeUndefined<Nulls, ConstToNormal<R>[]> => match(s, regex, selector, true);

let matchProjection: any;
let collected: any[];

/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */
export const match: {
  <R, Nulls, Collect extends boolean = false>(
    s: Nullable<string, Nulls>,
    regex: RegExp | Nullish,
    selector: (...args: string[]) => R | Nullish,
    collect?: Collect
  ): MaybeUndefined<Nulls, If<Collect, ConstToNormal<R>[], R | undefined>>;
  (s: string | Nullish, match: RegExp | Nullish): RegExpMatchArray | null;
} = <R>(
  s: string,
  regex: RegExp,
  selector?: (...args: string[]) => R,
  collect = false
) =>
  (s ?? regex) == nil
    ? undefined
    : selector
    ? ((matchProjection = undefined),
      collect
        ? ((collected = []),
          match(
            s,
            regex,
            (...args) =>
              (matchProjection = selector(...args)) != null &&
              collected.push(matchProjection)
          ))
        : s.replace(
            // Replace seems to be a compact way to get the details of each match
            regex,
            (...args) => (matchProjection = selector(...args)) as any
          ),
      matchProjection)
    : s.match(regex);

/**
 * Replaces reserved characters to get a regular expression that matches the string.
 */
export const escapeRegEx = <T extends string | Nullish>(
  input: T
): MaybeUndefined<T, string> =>
  input?.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&") as any;

const REGEX_NEVER = /\z./g;
const unionOrNever = (parts: (string | Nullish)[], joined?: string) =>
  (joined = join(distinct(filter(parts, (part) => part?.length)), "|"))
    ? new RegExp(joined, "gu")
    : REGEX_NEVER;

const stringRuleCache: { [pattern: string]: RegExp } = {};
export const isRegEx = (value: any): value is RegExp => value instanceof RegExp;

/**
 * Tests or parses a regular expression accepting the {@link ParsableRegExp} format.
 *
 * Strings are cached, so there is no need to do additional caching outside this function (as far as the caching would only concern strings).
 */
export const parseRegex = <T>(
  input: T,
  separators: readonly string[] = [",", " "]
): T extends ParsableRegExp ? RegExp : undefined =>
  isRegEx(input)
    ? input
    : isArray(input) // Parse individual specifiers, and join them into one long regex. An empty array is interpreted as "never".
    ? unionOrNever(map(input, (part) => parseRegex(part, separators)?.source)!)
    : isBoolean(input)
    ? input // `true` is "always", `false` is "never"
      ? /./g
      : REGEX_NEVER // Matches nothing. End of string followed by something is never the case.
    : isString(input)
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
                      `?<!(?<!\\)\\)[${join(separators, escapeRegEx, ",")}]/`
                    )
                  ),
                  (text) =>
                    text &&
                    `^${join(
                      // Split on non-escaped asterisk (Characterized by a leading backslash that is not itself an escaped backslash).
                      split(text, /(?<!(?<!\\)\\)\*/),
                      (part) =>
                        escapeRegEx(
                          // Remove backslashes used for escaping.
                          replace(part, /\\(.)/g, "$1")
                        ),
                      // Join the parts separated by non-escaped asterisks with the regex wildcard equivalent.
                      ".*"
                    )}$`
                )
              )
      )!)
    : (undefined as any);

/**
 * Better minifyable version of `String`'s `split` method that allows a null'ish parameter.
 */
export const split = <T extends string | Nullish>(
  s: T,
  separator: RegExp | string
): MaybeUndefined<T, string[]> => s?.split(separator) ?? (s as any);

/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */
export const replace = <T extends string | Nullish>(
  s: T,
  match: RegExp,
  replaceValue: string | ((...args: string[]) => string)
): T => s?.replace(match, replaceValue as any) ?? (s as any);

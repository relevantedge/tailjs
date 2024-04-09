import { REGEX, array, bool, filter, map, str, testOrConvertFunction, undefined, distinct, size, nil, push, } from ".";
/**
 * `Regex.test` optimized for minifying.
 */
export const test = (s, match) => !!(s && match) && match.test(s);
let matchSelected;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */
export const match = (s, regex, selector, defaultValue) => s &&
    regex &&
    (selector
        ? (array(defaultValue)
            ? match(s, regex, (...args) => (matchSelected = selector(...args)) != nil &&
                push(defaultValue, matchSelected))
            : s.replace(regex, (...args) => ((defaultValue = selector(...args)), "")),
            defaultValue)
        : s.match(regex));
/**
 * Replaces reserved characters to get a regular expression that matches the string.
 */
export const escapeRegEx = (input) => input.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&");
const REGEX_NEVER = /\z./g;
const unionOrNever = (parts, joined) => (joined = join(distinct(filter(parts, size)), "|"))
    ? new RegExp(joined, "gu")
    : REGEX_NEVER;
const stringRuleCache = {};
/**
 * Tests or parses a regular expression accepting the {@link ParsableRegExp} format.
 *
 * Strings are cached, so there is no need to do additional caching outside this function (as far as the caching would only concern strings).
 */
export const regex = testOrConvertFunction(REGEX, (input, separators = [",", " "]) => regex(input)
    ? input
    : array(input) // Parse individual specifiers, and join them into one long regex. An empty array is interpreted as "never".
        ? unionOrNever(map(input, (part) => regex(part, false, separators)?.source))
        : bool(input)
            ? input // `true` is "always", `false` is "never"
                ? /./g
                : REGEX_NEVER // Matches nothing. End of string followed by something is never the case.
            : str(input)
                ? (stringRuleCache[input] ??= match(input || "", /^(?:\/(.+?)\/?|(.*))$/gu, (_, regex, text) => regex
                    ? new RegExp(regex, "gu")
                    : unionOrNever(map(split(text, new RegExp(`?<!(?<!\\)\\)[${join(map(separators, escapeRegEx))}]/`)), (text) => text &&
                        `^${join(map(
                        // Split on non-escaped asterisk (Characterized by a leading backslash that is not itself an escaped backslash).
                        split(text, /(?<!(?<!\\)\\)\*/), (part) => escapeRegEx(
                        // Remove backslashes used for escaping.
                        replace(part, /\\(.)/g, "$1"))), 
                        // Join the parts separated by non-escaped asterisks with the regex wildcard equivalent.
                        ".*")}$`))))
                : undefined);
/**
 * Better minifyable version of `String`'s `split` method that allows a null'ish parameter.
 */
export const split = (s, separator) => s?.split(separator) ?? s;
/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */
export const replace = (s, match, replaceValue) => s?.replace(match, replaceValue) ?? s;
/**
 *  Better minifyable version of `String`'s `join` method that allows a null'ish parameter and removes empty.
 */
export const join = (s, separator = "") => (s?.join(separator) ?? s);
//# sourceMappingURL=regex.js.map
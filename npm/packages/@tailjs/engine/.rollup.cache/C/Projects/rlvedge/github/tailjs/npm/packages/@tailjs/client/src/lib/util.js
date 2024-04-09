// General utility functions.
import { F, bool, filter, keys, match, nil, push, size, str, undefined, } from ".";
/**
 * Raises an error in the UI based on configuration and build settings.
 */
export const err = (code, args, error) => console.error(...filter([code ?? error?.message ?? error ?? "error", args, error]));
/**
 * Applies a function to a value if it is not its types default value.
 * An object without properties and an empty array are considered the "default" for those types.
 */
export const ifNotDefault = (value, action) => (typeof value === "object" && size(keys(value))) || value
    ? action
        ? action(value)
        : value
    : undefined;
/**
 * Round a number of to the specified number of decimals.
 */
export const round = (x, decimals = 0) => (bool(decimals) ? --decimals : decimals) < 0
    ? x
    : ((decimals = Math.pow(10, decimals)),
        Math.round(x * decimals) / decimals);
/**
 * `decodeURIComponent` for efficient minifying.
 */
export const decode = (value) => value == nil ? nil : decodeURIComponent(value);
/**
 * `encodeURIComponent` for efficient minifying.
 */
export const encode = (value) => value == nil ? nil : encodeURIComponent(value);
let parameters = {};
/**
 * Parses key/value pairs encoded as a URI query string (blah=foo&bar=gz%25nk).
 *
 * It supports that the same key can be specified multiple times.
 */
export const parseParameters = (query) => query == nil
    ? query
    : ((parameters = {}),
        match(query, /([^&=]+)(?:=([^&]+))?/g, (all, name, value) => push((parameters[lowerCase(decode(name))] ??= []), decode(str(value, F)))),
        parameters);
/**
 * Convenient way to compare a value against multiple others.
 */
export const equals = (value, ...values) => values.some(value == nil ? (test) => test == nil : (test) => value === test);
/**
 *  Better minifyable version of `String`'s `toLowerCase` method that allows a null'ish parameter.
 */
export const lowerCase = (s) => s?.toLowerCase() ?? s;
/**
 * `JSON.stringify` with default settings for pretty-printing any value.
 */
export const prettify = (value) => stringify(value, nil, 2) ?? "";
/**
 * `JSON.stringify` method for efficient minifying that also ignores null'ish values.
 */
export const stringify = (value, replacer, space) => value == nil ? nil : JSON.stringify(value, replacer, space);
/**
 * `JSON.parse` method for efficient minifying that also gracefully handles null values.
 */
export const parse = (value) => value == nil ? nil : JSON.parse(value);
/**
 * Fast way to join two optional strings with a space.
 * If they are both nullish, nullish will be returned (unless `defaultValue`).
 */
export const concat2 = (value1, value2, defaultValue = nil) => value1 && value2 ? value1 + " " + value2 : (value1 || value2) ?? defaultValue;
//# sourceMappingURL=util.js.map
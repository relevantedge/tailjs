import { F, T, nil } from ".";
/**
 * Converts various types' common representation of `true` and `false` to actual `true` and `false`.
 */
export const parseBoolean = (value) => bool(value)
    ? value
    : value === 0
        ? F
        : value === 1
            ? T
            : value === "false"
                ? F
                : value === "true"
                    ? T
                    : undefined;
/** Constants for type testing. */
export const STRING = 0, BOOLEAN = 1, NUMBER = 2, FUNCTION = 3, OBJECT = 4, ARRAY = 5, REGEX = 6;
/**
 * When checking the string from `typeof blah`, no more than this is required for type tests.
 */
const typePrefixes = ["s", "b", "n", "f", "o"];
/**
 * Tests whether a given value is of the desired type.
 */
export const is = (type, value) => type === ARRAY
    ? Array.isArray(value)
    : (value != nil && typePrefixes[type] === (typeof value)[0]) ||
        (type === REGEX && value.exec);
/**
 * Factory creating {@link TestOrConvertFunction}s.
 */
export const testOrConvertFunction = (type, convert) => (value, parse, ...args) => parse === undefined
    ? is(type, value)
    : is(type, value)
        ? value
        : !parse
            ? undefined
            : convert?.(value, parse, ...args);
/**
 * Tests or parses Boolean values.
 */
export const bool = testOrConvertFunction(BOOLEAN, (value) => value !== "0" && value !== "false" && value !== "no" && !!value);
/**
 * Tests or parses numerical values.
 */
export const num = testOrConvertFunction(NUMBER, (value) => ((value = parseFloat(value)), isNaN(value) ? undefined : value));
/**
 * Tests if a value is a string, and if not, makes one by calling the value's `toString()` method.
 */
export const str = testOrConvertFunction(STRING, (value) => value?.toString());
/**
 * Tests if a value can be invoked as a function.
 */
export const fun = testOrConvertFunction(FUNCTION, (_) => undefined);
/**
 * Tests if a value is strictly an object (object but not array).
 */
export const obj = testOrConvertFunction(OBJECT);
/**
 * Tests if a value is an ECMAScript array (not TypedArray, those are too fancy).
 */
export const array = (() => 
// Needs wrapped in function, otherwise the multi-line type screws syntax highlighting.
testOrConvertFunction(ARRAY, (value) => (iterable(value) ? [...value] : undefined)))();
/**
 * Tests if a value is an iterable collection of values (Iterable but not string).
 */
export const iterable = (value) => value && !str(value) && !!value[Symbol.iterator];
//# sourceMappingURL=type-test.js.map
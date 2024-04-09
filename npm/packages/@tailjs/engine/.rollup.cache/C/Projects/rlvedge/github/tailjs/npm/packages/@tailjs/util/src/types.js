import { map, obj, unwrap } from ".";
const internal = Symbol();
export const NULL = 0;
export const UNDEFINED = 1;
export const BOOLEAN = 2;
export const NUMBER = 3;
export const BIGINT = 4;
export const STRING = 5;
export const ARRAY = 6;
export const OBJECT = 7;
export const DATE = 8;
export const SYMBOL = 9;
export const FUNCTION = 10;
export const ITERABLE = 11;
export const MAP = 12;
export const SET = 13;
export const PROMISE = 14;
const T1 = {
    ["n"]: NUMBER,
    ["f"]: FUNCTION,
};
const T2 = {
    ["o"]: BOOLEAN,
    ["i"]: BIGINT,
    ["t"]: STRING,
    ["y"]: SYMBOL,
};
export const undefined = void 0;
export const nil = null;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */
export const symbolIterator = Symbol.iterator;
/** Fast way to check for precence of function argument. */
export const NO_ARG = Symbol();
const createConverter = (typeTester, parser) => (value, parse = true) => typeTester(value)
    ? value
    : parser && parse && isDefined((value = parser(value)))
        ? value
        : undefined;
export const tryCatch = (expression, errorHandler = true, clean) => {
    try {
        return expression();
    }
    catch (e) {
        if (!isBoolean(errorHandler)) {
            return errorHandler?.(e);
        }
        if (errorHandler) {
            throw e;
        }
        console.error(e);
        return undefined;
    }
    finally {
        clean?.();
    }
};
export const tryCatchAsync = async (expression, errorHandler = true, clean, retries = 1) => {
    while (retries--) {
        try {
            return await expression();
        }
        catch (e) {
            if (!isBoolean(errorHandler)) {
                (await errorHandler(e, !retries));
            }
            else if (errorHandler && !retries) {
                throw e;
            }
            else {
                console.error(e);
            }
        }
        finally {
            clean?.();
        }
    }
    return undefined;
};
export const as = (value, converter, defaultValue, ...args) => ((value = converter(value, ...args)) ?? defaultValue);
export const cast = (value, typeTest, ...args) => typeTest(value, ...args) ? value : undefined;
export const isNull = (value) => value === nil;
export const isUndefined = (value) => value === undefined;
export const isDefined = (value) => value !== undefined;
export const isNullish = (value) => value == nil;
export const hasValue = (value) => value != nil;
export const isBoolean = (value) => typeof value === "boolean";
export const parseBoolean = createConverter(isBoolean, (value) => !!value);
export const isTruish = (value) => !!value;
export const isFalsish = (value) => !value;
export const isInteger = Number.isSafeInteger;
export const isNumber = (value) => typeof value === "number";
export const parseNumber = createConverter(isNumber, (value) => parseFloat(value));
export const isBigInt = (value) => typeof value === "bigint";
export const parseBigInt = createConverter(isBigInt, (value) => tryCatch(() => BigInt(value)));
export const isString = (value) => typeof value === "string";
export const toString = createConverter(isString, (value) => hasValue(value) ? "" + value : value);
export const isArray = Array.isArray;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */
export const toArray = (value, clone = false) => isUndefined(value)
    ? undefined
    : !clone && isArray(value)
        ? value
        : isIterable(value)
            ? [...value]
            : [value];
export const isObject = (value, acceptIterables = false) => value != null &&
    typeof value === "object" &&
    (acceptIterables || !value[symbolIterator]);
export const hasMethod = (value, name) => typeof value?.[name] === "function";
export const isDate = (value) => value instanceof Date;
export const parseDate = createConverter(isDate, (value) => isNaN((value = Date.parse(value))) ? undefined : value);
export const isSymbol = (value) => typeof value === "symbol";
export const isFunction = (value) => typeof value === "function";
export const isIterable = (value, acceptStrings = false) => value?.[symbolIterator] && (typeof value === "object" || acceptStrings);
export const toIterable = (value) => isIterable(value) ? value : [value];
export const isMap = (value) => value instanceof Map;
export const isSet = (value) => value instanceof Set;
export const isAwaitable = (value) => !!value?.then;
export const typeCode = (value, typeName = typeof value) => value == nil
    ? value === nil
        ? NULL
        : UNDEFINED
    : T1[typeName[0]] ??
        T2[typeName[1]] ??
        (Array.isArray(value) ? ARRAY : value instanceof Date ? DATE : OBJECT);
export const identity = (value) => value;
export const clone = (value, depth = true) => isObject(value, true)
    ? isArray(value)
        ? depth
            ? value.map((value) => clone(value, depth === true || --depth))
            : [...value]
        : isSet(value)
            ? new Set(depth
                ? map(value, (value) => clone(value, depth === true || --depth))
                : value)
            : isMap(value)
                ? new Map(depth
                    ? map(value, (value) => 
                    // Does not clone keys.
                    [value[0], clone(value[1], depth === true || --depth)])
                    : value)
                : depth
                    ? obj(map(value, ([k, v]) => [
                        k,
                        clone(v, depth === true || --depth),
                    ]))
                    : { ...value }
    : value;
/**
 * Evaluates a function that can be used to capture values using parameter default values.
 *
 * For example `(previous=current)=>(current+=2, previous)
 */
export const capture = (capture) => capture();
export const throwError = (error, transform = (message) => new TypeError(message)) => {
    throw isString((error = unwrap(error))) ? transform(error) : error;
};
export const validate = (value, validate, validationError, undefinedError) => (isArray(validate)
    ? validate.every((test) => test(value))
    : isFunction(validate)
        ? validate(value)
        : validate)
    ? value
    : required(value, undefinedError ?? validationError) &&
        throwError(validationError ?? "Validation failed.");
export class InvariantViolatedError extends Error {
    constructor(invariant) {
        super(invariant ? "INV: " + invariant : "An invariant was violated.");
    }
}
/**
 * States an invariant.
 */
export const invariant = (test, description) => {
    const valid = unwrap(test);
    return isDefined(valid) && valid !== false
        ? valid
        : throwError(new InvariantViolatedError(description));
};
export const required = (value, error) => isDefined(value)
    ? value
    : throwError(error ?? "A required value is missing", (text) => new TypeError(text.replace("...", " is required.")));
//# sourceMappingURL=types.js.map
// Utility functions for arrays and iterables.
import { isObject, } from "@tailjs/util";
import { F, T, array, bool, fun, hashSet, iterable, nil, num, obj } from ".";
/**
 * Array's `sort` function that offers a single function that is applied on each element instead of having to do it twice (`[...].sort(x,y)=>f(x)-f(y)`).
 * Default is to use the value directly.
 */
export const sort = (items, sortKey = (item) => item) => (items?.sort((lhs, rhs) => sortKey(lhs) - sortKey(rhs)), items);
/**
 * Array's `splice` method for efficient minifying.
 */
export const splice = (value, start, deleteCount, ...values) => value &&
    (deleteCount != nil
        ? value.splice(start, deleteCount, ...values)
        : value.splice(start));
/**
 * Array's `unshift` method for efficient minifying that also returns the array itself for fluent convenience.
 */
export const unshift = (target, ...values) => (target?.unshift(...values), target);
/**
 * Array's `shift` method for efficient minifying.
 */
export const shift = (array) => array?.shift();
/**
 * Array's `push` method for efficient minifying that also returns the array itself for fluent convenience.
 */
export const push = (target, ...values) => (target?.push(...values), target);
/**
 * Array's `pop` method for efficient minifying.
 */
export const pop = (array) => array?.pop();
/**
 * Like Array's `concat` but supports iterables.
 */
export const concat = (...sources) => size((sources = filter(sources))) < 2
    ? map(sources[0])
    : [].concat(...map(sources, map));
/**
 * Gives the distinct elements of the specified values. If a value is iterable it is expanded.
 */
export const distinct = (...values) => map(hashSet(filter(concat(...values))));
/**
 * Constructs a range (or empty array) with the given attributes.
 */
export const range = (arg0, arg1) => arg1 === T
    ? [...Array(arg0)]
    : num(arg1)
        ? range(arg1 - arg0, (n) => arg0 + n)
        : (fun(arg1) || (arg1 = ((n) => n)),
            map(range(arg0, T), (_, i) => arg1(i)));
/**
 * The length of an array and strings, size of sets and maps and the number of keys in an object.
 *
 * If the value is a primitive type (not string) the size is defined as 0.
 */
export const size = (item) => item == nil
    ? 0
    : item["length"] ?? item["size"] ?? (obj(item) ? keys(item).length : 0);
/**
 * An extended version of Object.entries that also supports maps, sets and arrays.
 */
export const entries = (mapOrRecord, project) => !mapOrRecord
    ? []
    : array(mapOrRecord)
        ? map(mapOrRecord, (value, index) => project ? project(index, value) : [index, value])
        : map(mapOrRecord.entries?.() ?? Object.entries(mapOrRecord), project);
/**
 * An extended version of Object.keys that also supports maps and sets.
 */
export const keys = (mapOrRecord, project) => !mapOrRecord
    ? []
    : map(mapOrRecord.keys?.() ?? Object.keys(mapOrRecord), project);
/**
 * An extended version of Object.values that also supports arrays and sets.
 */
export const values = (mapOrRecord, project) => !mapOrRecord
    ? []
    : map(mapOrRecord.values?.() ?? Object.values(mapOrRecord), project);
/**
 * Generalized version of Array's `forEach` method that enables breaking and a return value.
 * Non iterables are intepreted as an array with themselves as the only item.
 *
 * If the `breakSignal` is called, iteration will stop.
 * For convenience the break function can be called with a value that will then be passed through to combine breaking and returning a value.
 * This does not change the return value by itself.
 *
 * `const hasPositive = forEach(numbers, (x,_,stop)=>x > 0 && stop(true))`
 *
 * @returns The last returned value from the action.
 */
export const forEach = (items, action, initialValue) => {
    if (item == nil || !size(iterable(items) ? items : (items = [items])))
        return initialValue;
    const breakSignal = (...args) => ((index = 0), size(args) ? args[0] : initialValue);
    let index = 0;
    for (const item of items)
        if (((initialValue = action(item, index++, breakSignal, initialValue)),
            !index) // Index is set to zero from the breakSignal
        )
            break;
    return initialValue;
};
/**
 * Generalized version of Array's `map` method that also supports iterables and node lists.
 *
 * If called without a projection, it converts whatever is passed to it to an array.
 * When the value is already an array, the `clone` parameter decides whether the array itself or a clone should be returned.
 */
export const map = (value, cloneOrProject) => value == nil
    ? []
    : fun(cloneOrProject)
        ? map(value, F).map((value, index) => cloneOrProject(value, index))
        : array(value) && !cloneOrProject
            ? value
            : (iterable(value) && [...value]) || [value];
/**
 * A generalized version of Array's `flatMap` that also supports iterables and node lists.
 */
export const flatMap = (value, projection = (item) => item) => value == nil
    ? []
    : filter(map(value, F)).flatMap((item, index) => projection(item, index));
/**
 * A convenience method for returning the n'th item from an iterable or the n'th character from a string.
 *
 * If the source is not alrady an array (or indexable by an item method), it will be converted to one first.
 * The latter feature should be used with caution since it adds a terrible performance overhead if used from within a loop.
 */
export const item = (source, index = 0) => source == nil
    ? undefined
    : (source.length == null && (source = map(source)),
        source.item,
        source[index < 0 ? source.length + index : index]);
/**
 * A generalized version of Array's `filter` that works on all the types supported by {@link map}.
 *
 * In addition it allows an empty result to be returned as `null`
 */
export const filter = (value, predicate, emptyIsNull = bool(predicate) || F) => ((value = map(value).filter((item, index) => (fun(predicate, true) ?? ((item) => item != nil))(item, index))),
    emptyIsNull && !size(value) ? nil : value);
/**
 * A convenience method to test whether an iterable has any element matching the predicate specified.
 *
 * If the parameter is not iterable is in interpreted as an array with itself as the only element.
 */
export const any = (value, predicate = (item) => item != nil && item !== F) => {
    return (value != nil &&
        (iterable(value) || isObject(value)) &&
        (!predicate
            ? !!size(value)
            : forEach(value, (item, i, stop) => predicate(item, i) && stop(T), F)));
};
/**
 * Array's `reduce` method that also works for iterables.
 */
export const reduce = (items, reducer, initialValue) => map(items).reduce((previous, current) => reducer(previous, current), initialValue);
/**
 * Takes the sum of the items in an iterable.
 */
export const sum = (items, selector) => items &&
    reduce(items, (sum, item) => (selector?.(item) ?? item) + sum, 0);
/**
 * Returns the highest value in a series of numbers.
 */
export const max = (...values) => Math.max(...values);
//# sourceMappingURL=iteration.js.map
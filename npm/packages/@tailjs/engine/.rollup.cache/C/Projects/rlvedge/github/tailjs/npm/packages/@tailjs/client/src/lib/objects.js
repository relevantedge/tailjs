// Utility functions for testing and manipulating values, sets and objects.
import { F, T, array, assign, entries, filter, forEach, fromEntries, fun, keys, nil, obj, } from ".";
/**
 * Better minifyable way to instantiate a Set.
 */
export const hashSet = (values) => new Set(values);
/**
 * Better minifyable way to instantiate a Map.
 */
export const hashMap = (entries) => new Map(entries);
/**
 * Better minifyable way to instantiate a WeakMap.
 */
export const weakMap = (entries) => new WeakMap(entries);
/**
 *  General function to "clear" objects, arrays, sets and maps.
 */
export const clear = (clearable, ...args) => (clearable != nil &&
    (clearable.clear
        ? clearable.clear(...args)
        : array(clearable)
            ? (clearable.length = 0)
            : keys(clearable, (key) => del(clearable, key))),
    clearable);
/**
 * Test whether a set has a specified key, and if not, sets it and returns `true`. `false` otherwise.
 *
 * This is useful for recursive iteration where the same element must not be visited more than once (because infinite recursion sucks).
 */
export const mark = (set, value) => (set.has(value) ? F : (set.add(value), T));
/**
 * A generalized function to get values from maps, test existence in sets and get properties on objects.
 */
export const get = (target, key) => target.get?.(key) ?? target?.has(key) ?? target?.[key];
/**
 * A generalized function to remove items from sets and maps, and delete properties from objects.
 * When only a single key/property is specified the deleted value is returned (`undefined` if not present).
 *
 * Multiple keys can be specified as once in which case the target will just be returned (like fluent API or whatever).
 */
export const del = (target, key) => !target
    ? undefined
    : array(key)
        ? (forEach(key, (key) => target.delete?.(key) ?? delete target[key]),
            target)
        : (currentValue = target.has?.(key)) != null
            ? !currentValue
                ? undefined
                : ((currentValue = target.get?.(key)),
                    target.delete(key),
                    currentValue ?? T)
            : ((currentValue = target[key]), delete target[key], currentValue);
/**
 * Sets the value for the specified key in a map, toggles the item in a set, or sets the property on an object.
 *
 * The value `undefined` deletes the key/property from maps and objects.
 * For sets `undefined` corresponds to the default value `true`, so here it has the opposite effect.
 */
let currentValue;
export const set = (target, key, value = undefined) => !!target.add // It's a set
    ? ((currentValue = target.has(key)),
        currentValue === (value ??= T) // Toggle? (Default is `true` which we set here).
            ? F
            : (value ? target.add(key) : del(target, key), T))
    : ((currentValue = target.get?.(key) ?? target[key]), // Get item from map / read property from object.
        fun(value) && (value = value(currentValue)), // Apply optional projection on current value.
        value === currentValue
            ? F // No change
            : (value === undefined // `undefined` means "delete".
                ? del(target, key)
                : target.set?.(key, value) ?? (target[key] = value),
                // Return that the value was changed.
                T));
/**
 * Gets the current item for a key in a map, or a property on an object.
 * If no value is present, it is initialized with the `defaultValue` and then returned.
 */
export const getOrSet = (map, key, defaultValue) => map.has?.(key)
    ? map.get?.(key)
    : ((currentValue = defaultValue(key)),
        map.set?.(key, currentValue)
            ? currentValue
            : (map[key] ??= defaultValue(key)));
/**
 * Convenient way to use the values from a tuple.
 * If the tuple is null or undefined, that will be returned instead of applying the function.
 */
export const decompose = (tuple, apply) => tuple && apply(...tuple);
/**
 * Creates a new object by projecting or excluding the properties of an existing one.
 */
export const transpose = (source, projection, additionalEntries) => additionalEntries
    ? assign(transpose(source, projection), additionalEntries)
    : projection
        ? fromEntries(filter(entries(source, projection)))
        : source;
/** Removes null'ish properties from an object */
export const clean = (o) => {
    const inner = (o) => forEach(entries(o), ([key, value], F) => value == nil || (obj(value) && !inner(value)) ? (del(o, key), F) : T);
    inner(o);
    return o;
};
//# sourceMappingURL=objects.js.map
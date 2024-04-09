import { NO_ARG, count, forEach, hasMethod, isArray, isAwaitable, isDefined, isFunction, isObject, isUndefined, map, throwError, } from ".";
// #endregion
// #region get
const updateSingle = (target, key, value) => setSingle(target, key, isFunction(value) ? value(get(target, key)) : value);
const setSingle = (target, key, value) => {
    value === undefined
        ? target.delete
            ? target.delete(key)
            : delete target[key]
        : target.set
            ? target.set(key, value)
            : target.add
                ? value
                    ? target.add(key)
                    : target.delete(key)
                : (target[key] = value);
    return value;
};
export const setSingleIfNotDefined = (target, key, value, error) => {
    const currentValue = get(target, key);
    if (isDefined(currentValue)) {
        throwError(error(key, currentValue, value, target));
    }
    return setSingle(target, key, value);
};
export const get = (target, key, initializer) => {
    if (!target)
        return undefined;
    let value = target.get
        ? target.get(key)
        : target.has
            ? target.has(key)
            : target[key];
    if (isUndefined(value) && isDefined(initializer)) {
        isDefined((value = isFunction(initializer) ? initializer() : initializer)) && setSingle(target, key, value);
    }
    return value;
};
const createSetOrUpdateFunction = (setter) => (target, key, value = NO_ARG, error) => {
    if (!target)
        return undefined;
    if (value !== NO_ARG) {
        return setter(target, key, value, error);
    }
    forEach(key, (item) => isArray(item)
        ? setter(target, item[0], item[1])
        : forEach(item, ([key, value]) => setter(target, key, value)));
    return target;
};
export const assign = createSetOrUpdateFunction(setSingle);
export const update = createSetOrUpdateFunction(updateSingle);
export const assignIfUndefined = createSetOrUpdateFunction(setSingleIfNotDefined);
export const swap = (target, key, value) => {
    const current = get(target, key);
    if (value !== current)
        setSingle(target, key, value);
    return current;
};
// #endregion
export const add = (target, key) => target instanceof Set
    ? target.has(key)
        ? false
        : (target.add(key), true)
    : get(target, key) !== assign(target, key, true);
export const has = (target, key) => hasMethod(target, "has")
    ? target.has(key)
    : isDefined(target.get?.(key) ?? target[key]);
const clearSingle = (target, key) => {
    if (isUndefined(target ?? key))
        return undefined;
    let current = get(target, key);
    if (hasMethod(target, "delete")) {
        target.delete(key);
    }
    else {
        delete target[key];
    }
    return current;
};
/**
 * Removes one or more values from a property container specified by the provided key or array of keys.
 *
 * If more than one level of key arguments are specified, values will be removed from the property container at the deepest level.
 * If a property container becomes empty along the path of keys, it will be removed from its parent.
 *
 */
export const clear = (target, ...keys) => {
    const removed = [];
    let array = false;
    const clearStep = (target, index, parent, parentKey) => {
        if (!target)
            return;
        const targetKeys = keys[index];
        if (index === keys.length - 1) {
            if (isArray(targetKeys)) {
                array = true;
                targetKeys.forEach((key) => removed.push(clearSingle(target, key)));
            }
            else {
                removed.push(clearSingle(target, targetKeys));
            }
        }
        else {
            if (isArray(targetKeys)) {
                array = true;
                targetKeys.forEach((key) => clearStep(get(target, key), index + 1, target, key));
            }
            else {
                clearStep(get(target, targetKeys), index + 1, target, targetKeys);
            }
            if (!count(target) && parent) {
                remove(parent, parentKey);
            }
        }
    };
    clearStep(target, 0);
    return array ? removed : removed[0];
};
/**
 * Removes the specified keys from a  property container.
 *
 * The difference between {@link clear} and this function is that it does not consider nested property containers and that arrays will be spliced (as opposed to `clear` where the index will be set to `undefined`).
 */
export const remove = (target, key, ...keys) => {
    if (!target)
        return undefined;
    if (keys.length) {
        // Sort array keys descending as they would otherwise not match their offset as the array is spliced along the way.
        return (isArray(target) ? keys.sort((x, y) => y - x) : keys).map((key) => remove(target, key));
    }
    return isArray(target)
        ? key < target.length
            ? target.splice(key, 1)[0]
            : undefined
        : clearSingle(target, key);
};
export const define = (target, ...args) => {
    const add = (arg, defaults) => {
        if (!arg)
            return;
        let properties;
        if (isArray(arg)) {
            if (isObject(arg[0])) {
                // Tuple with the first item the defaults and the next the definitions with those defaults,
                // ([{enumerable: false, ...}, ...])
                arg.splice(1).forEach((items) => add(items, arg[0]));
                return;
            }
            // ([[key1, value1], [key2, value2], ...])
            properties = arg;
        }
        else {
            // An object.
            properties = map(arg);
        }
        properties.forEach(([key, value]) => Object.defineProperty(target, key, {
            configurable: false,
            enumerable: true,
            writable: false,
            ...defaults,
            ...(isObject(value) && ("get" in value || "value" in value)
                ? value
                : { value }),
        }));
    };
    args.forEach((arg) => add(arg));
    return target;
};
export const pick = (source, ...args) => {
    if (source === undefined)
        return undefined;
    return Object.fromEntries(args.flatMap((arg) => isObject(arg, true)
        ? isArray(arg)
            ? arg.map((args) => isArray(args)
                ? args.length === 1
                    ? [args[0], source[args[0]]]
                    : pick(source[args[0]], ...args[1])
                : [args[0], source[args[1]]])
            : Object.entries(args).map(([key, value]) => [
                key,
                value === true ? source[key] : pick(source[key], value),
            ])
        : [[arg, source[arg]]]));
};
export const unwrap = (value) => isFunction(value)
    ? unwrap(value())
    : isAwaitable(value)
        ? value.then((result) => unwrap(result))
        : value;
export const unlock = (readonly) => readonly;
//# sourceMappingURL=accessors.js.map
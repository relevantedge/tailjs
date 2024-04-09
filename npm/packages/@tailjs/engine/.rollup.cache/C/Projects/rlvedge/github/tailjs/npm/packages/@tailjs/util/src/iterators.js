import { add, get, hasMethod, isArray, isDefined, isFalsish, isFunction, isObject, isSet, isTruish, MAX_SAFE_INTEGER, symbolIterator, toArray, undefined, } from ".";
export const UTF16MAX = 0xffff;
let stopInvoked = false;
export const stop = (yieldValue) => ((stopInvoked = true), yieldValue);
export const toCharCodes = (s) => [...new Array(s.length)].map((_, i) => s.charCodeAt(i));
export const codePoint = (string, index = 0) => string.codePointAt(index);
function* createFilteringIterator(source, action) {
    if (!source)
        return;
    let i = 0;
    for (let item of source) {
        action && (item = action(item, i++));
        if (item !== undefined) {
            yield item;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createObjectIterator(source, action) {
    let i = 0;
    for (const key in source) {
        let value = [key, source[key]];
        action && (value = action(value, i++));
        if (value !== undefined) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset = 0) {
    while (length--)
        yield offset++;
}
export function* createStringIterator(input, start, end) {
    while (start < end) {
        const codePoint = input.codePointAt(start);
        let p = input[start++];
        if (codePoint > UTF16MAX) {
            start++;
            p = String.fromCodePoint(codePoint);
        }
        yield [p, codePoint];
    }
}
export function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (isDefined(start))
        yield start;
    while (maxIterations-- && isDefined((start = step(start)))) {
        yield start;
    }
}
const sliceAction = (action, start, end) => (start ?? end) !== undefined
    ? ((start ??= 0),
        (end ??= MAX_SAFE_INTEGER),
        (value, index) => start--
            ? undefined
            : end--
                ? action
                    ? action(value, index)
                    : value
                : end)
    : action;
const createIterator = (source, action, start, end) => source == null
    ? []
    : source[symbolIterator]
        ? createFilteringIterator(source, start === undefined ? action : sliceAction(action, start, end))
        : typeof source === "object"
            ? createObjectIterator(source, sliceAction(action, start, end))
            : createIterator(isFunction(source)
                ? createNavigatingIterator(source, start, end)
                : createRangeIterator(source, start), action);
const mapToArray = (projected, map) => map && !isArray(projected) ? [...projected] : projected;
export const project = ((source, projection, start, end) => projection != null && !isFunction(projection)
    ? // The second argument is the value of `start`.
        createIterator(source, undefined, projection, start)
    : createIterator(source, projection, start, end));
export const flatProject = function (source, projection, depth = 1, expandObjects = false, start, end) {
    return createIterator(flatten(createIterator(source, undefined, start, end), depth + 1, expandObjects, false), projection);
    function* flatten(value, depth, expandObjects, nested) {
        if (value != null) {
            if (value?.[symbolIterator] ||
                (expandObjects && value && typeof value === "object")) {
                for (const item of nested ? createIterator(value) : value) {
                    if (depth > 1 || depth <= 0) {
                        yield* flatten(item, depth - 1, expandObjects, true);
                    }
                    else {
                        yield item;
                    }
                }
            }
            else {
                yield value;
            }
        }
    }
};
export const map = (source, projection, start = undefined, end) => {
    if (start === undefined && isArray(source)) {
        let i = 0;
        const mapped = [];
        for (let j = 0, n = source.length; j < n && !stopInvoked; j++) {
            let value = source[j];
            if (projection && value !== undefined) {
                value = projection(value, i++);
            }
            if (value !== undefined) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source !== undefined
        ? toArray(project(source, projection, start, end))
        : undefined;
};
export const zip = (lhs, rhs) => {
    const it2 = createIterator(rhs)[Symbol.iterator]();
    return createIterator(lhs, (lhs) => [lhs, it2.next()?.value]);
};
export const distinct = (source, projection, start, end) => isDefined(source)
    ? new Set([...project(source, projection, start, end)])
    : undefined;
export const single = (source, projection, start, end) => !source
    ? undefined
    : (source = mapDistinct(source, projection, start, end)).length > 1
        ? undefined
        : source[0];
export const mapDistinct = (source, projection, start, end) => isDefined(source)
    ? [...distinct(source, projection, start, end)]
    : source;
export function* concatIterators(...iterators) {
    for (const iterator of iterators) {
        if (!iterator)
            continue;
        yield* createIterator(iterator);
    }
}
export const concat = (...iterators) => iterators.reduce((r, it) => (it ? (r ?? []).concat(toArray(it)) : r), undefined);
export const intersection = (a, b, mapToArray) => {
    if (!a || !b)
        return [];
    isSet(b) && ([b, a] = [a, b]);
    const lookup = isSet(a) ? a : new Set(a);
    return filter(b, (value) => lookup.has(value), mapToArray);
};
export const intersects = (a, b) => !!count(intersection(a, b));
export const flatMap = (source, action = (item) => item, depth = 1, expandObjects = false, ...rest) => map(flatProject(source, action, depth, expandObjects, ...rest));
const traverseInternal = (root, selector, include, results, seen) => {
    if (isArray(root)) {
        forEachInternal(root, (item) => traverseInternal(item, selector, include, results, seen));
        return results;
    }
    if (!root || !add(seen, root)) {
        return undefined;
    }
    include && results.push(root);
    forEachInternal(selector(root), (item) => traverseInternal(item, selector, true, results, seen));
    return results;
};
export const join = (...items) => items.flatMap((item) => toArray(item) ?? []).filter(isDefined);
export const expand = (root, selector, includeSelf = true) => traverseInternal(root, selector, includeSelf, [], new Set());
const forEachArray = (source, action) => {
    let returnValue;
    let i = 0;
    for (let j = 0, n = source.length; j < n; j++) {
        if (source[j] !== undefined &&
            ((returnValue = action(source[j], i++) ?? returnValue), stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachItereable = (source, action) => {
    let returnValue;
    let i = 0;
    for (let value of source) {
        if (value !== undefined &&
            ((returnValue = action(value, i++) ?? returnValue), stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachObject = (source, action) => {
    let returnValue;
    let i = 0;
    for (let key in source) {
        if (((returnValue = action([key, source[key]], i++) ?? returnValue),
            stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachInternal = (source, action, start = undefined, end) => {
    if (source == null)
        return;
    let returnValue;
    if (start === undefined) {
        if (isArray(source))
            return forEachArray(source, action);
        if (source[symbolIterator])
            return forEachItereable(source, action);
        if (typeof source === "object")
            return forEachObject(source, action);
    }
    for (const value of createIterator(source, action, start, end)) {
        returnValue = value ?? returnValue;
    }
    return returnValue;
};
export const forEach = forEachInternal;
export const flatForEach = (source, action, depth = 1, expandObjects = false, ...rest) => forEachInternal(flatProject(source, undefined, depth, expandObjects, ...rest), action);
export const obj = ((source, selector, ...rest) => Object.fromEntries(map(source, selector, ...rest)));
export const groupReduce = (source, keySelector, reducer, seed, start, end) => {
    const groups = new Map();
    const seedFactory = () => (isFunction(seed) ? seed() : seed);
    const action = (item, index) => {
        const key = keySelector(item, index);
        let acc = groups.get(key) ?? seedFactory();
        const value = reducer(acc, item, index);
        if (isDefined(value)) {
            groups.set(key, value);
        }
    };
    forEachInternal(source, action, start, end);
    return groups;
};
export const group = (source, keySelector, valueSelector = (item) => item, start, end) => {
    if (source == null)
        return undefined;
    const groups = new Map();
    forEachInternal(source, (item, index) => {
        const key = keySelector(item, index);
        const value = valueSelector(item, index);
        get(groups, key, () => []).push(value);
    }, start, end);
    return groups;
};
export const reduce = (source, reducer, seed, start, end) => {
    const seedFactory = () => (isFunction(seed) ? seed() : seed);
    return (forEachInternal(source, (value, index) => (seed =
        reducer(seed, value, index) ??
            seedFactory()), start, end) ?? seedFactory());
};
export const filter = (source, predicate = (item) => item != null, map = isArray(source), start, end) => mapToArray(createIterator(source, (item, index) => (predicate(item, index) ? item : undefined), start, end), map);
let filterInternal = filter;
export const count = (source, filter, start, end) => {
    if (!source)
        return undefined;
    let n;
    if (filter) {
        source = filterInternal(source, filter, false, start, end);
    }
    else {
        if (isDefined((n = source["length"] ?? source["size"]))) {
            return n;
        }
        if (!source[symbolIterator]) {
            return Object.keys(source).length;
        }
    }
    n = 0;
    return forEachInternal(source, () => ++n);
};
export const sum = (source, selector = (item) => item, start, end) => reduce(source, (sum, value, index) => sum + (selector(value, index) ?? 0), 0, start, end);
export const values = (source, start, end) => map(source, isObject(source) ? (item) => item[1] : (item) => item, start, end);
export const keys = (source, start, end) => map(source, isObject(source) ? (item) => item[0] : (_item, i) => i, start, end);
export const first = (source, predicate, start, end) => !source || isArray(source)
    ? source?.[0]
    : forEachInternal(source, (value, i) => !predicate || predicate(value, i) ? stop(value) : undefined, start, end);
export const last = (source, predicate, start, end) => !source
    ? undefined
    : isArray(source)
        ? source[source.length - 1]
        : forEachInternal(source, (item, i) => (!predicate || predicate(item, i) ? item : undefined), start, end);
export const find = (source, predicate, ...rest) => !source
    ? undefined
    : source.find
        ? source.find(predicate)
        : first(filterInternal(source, predicate, false, ...rest));
export const some = (source, predicate, start, rangeEnd) => source === undefined
    ? undefined
    : hasMethod(source, "some")
        ? source.some(predicate ?? isTruish)
        : forEachInternal(source, predicate
            ? (item, index) => (predicate(item, index) ? stop(true) : false)
            : () => stop(true), start, rangeEnd) ?? false;
export const every = (source, predicate, ...rest) => !source
    ? undefined
    : !some(source, predicate ? (item, index) => !predicate(item, index) : isFalsish, ...rest);
export const binarySearch = (arr, find, compare = ((x, y) => x - y)) => {
    let m = 0;
    let n = arr.length - 1;
    let cmp;
    let k;
    while (m <= n) {
        k = (n + m) >> 1;
        cmp = compare(find, arr[k]);
        if (cmp > 0) {
            m = k + 1;
        }
        else if (cmp < 0) {
            n = k - 1;
        }
        else {
            return k;
        }
    }
    return ~m;
};
//# sourceMappingURL=iterators.js.map
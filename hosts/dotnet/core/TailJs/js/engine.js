import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, DataPurposeFlags, VariableScope, isPassiveEvent, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, isSuccessResult, extractKey, variableScope, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, httpDecode } from '@tailjs/transport';

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const required = (value, error)=>value != null ? value : throwError(error ?? "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
const tryCatch = (expression, errorHandler = true, always)=>{
    try {
        return expression();
    } catch (e) {
        return isFunction(errorHandler) ? isError(e = errorHandler(e)) ? throwError(e) : e : isBoolean(errorHandler) ? console.error(errorHandler ? throwError(e) : e) : errorHandler;
    } finally{
        always?.();
    }
};
/** A value that is initialized lazily on-demand. */ const deferred = (expression)=>{
    let result;
    const getter = ()=>{
        if (getter.initialized || result) {
            // Result may either be the resolved value or a pending promise for the resolved value.
            return result;
        }
        result = unwrap(expression);
        if (result.then) {
            return result = result.then((resolvedValue)=>{
                getter.initialized = true;
                return getter.resolved = result = resolvedValue;
            });
        }
        getter.initialized = true;
        return getter.resolved = result;
    };
    return getter;
};
const tryCatchAsync = async (expression, errorHandler = true, always)=>{
    try {
        const result = await unwrap(expression);
        return isArray(errorHandler) ? errorHandler[0]?.(result) : result;
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            if (isArray(errorHandler)) {
                if (!errorHandler[1]) throw e;
                return errorHandler[1](e);
            }
            const error = await errorHandler?.(e);
            if (error instanceof Error) throw error;
            return error;
        } else if (errorHandler) {
            throw e;
        } else {
            // `false` means "ignore".
            console.error(e);
        }
    } finally{
        await always?.();
    }
    return undefined;
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
/** Minify friendly version of `null`. */ const nil = null;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : value?.[resultOrProperty] !== undefined$1 ? value : undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isTruish = (value)=>!!value;
const truish = (value, keepUndefined)=>isArray(value) ? keepUndefined ? value.map((item)=>!!item ? item : undefined$1) : value.filter((item)=>!!item) : !!value ? value : undefined$1;
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isError = (value)=>value instanceof Error;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const array = (value, clone = false)=>value == null ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : [
        value
    ];
const isObject = (value)=>value !== null && typeof value === "object";
const objectPrototype = Object.prototype;
const getPrototypeOf = Object.getPrototypeOf;
const isPlainObject = (value)=>value != null && getPrototypeOf(value) === objectPrototype;
const isFunction = (value)=>typeof value === "function";
const isIterable = (value, acceptStrings = false)=>!!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));
let stopInvoked = false;
const stop = (yieldValue)=>(stopInvoked = true, yieldValue);
const wrapProjection = (projection)=>projection == null ? undefined$1 : isFunction(projection) ? projection : (item)=>item[projection];
function* createFilteringIterator(source, projection) {
    if (source == null) return;
    if (projection) {
        projection = wrapProjection(projection);
        let i = 0;
        for (let item of source){
            if ((item = projection(item, i++)) != null) {
                yield item;
            }
            if (stopInvoked) {
                stopInvoked = false;
                break;
            }
        }
    } else {
        for (let item of source){
            if (item != null) yield item;
        }
    }
}
function* createObjectIterator(source, action) {
    action = wrapProjection(action);
    let i = 0;
    for(const key in source){
        let value = [
            key,
            source[key]
        ];
        action && (value = action(value, i++));
        if (value != null) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset) {
    if (length < 0) {
        offset ??= -length - 1;
        while(length++)yield offset--;
    } else {
        offset ??= 0;
        while(length--)yield offset++;
    }
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (start != null) yield start;
    while(maxIterations-- && (start = step(start)) != null){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start ?? end) !== undefined$1 ? (action = wrapProjection(action), start ??= 0, end ??= MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
/** Faster way to exclude null'ish elements from an array than using {@link filter} or {@link map} */ const filterArray = (array)=>array?.filter(FILTER_NULLISH);
const createIterator = (source, projection, start, end)=>source == null ? [] : !projection && isArray(source) ? filterArray(source) : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : isObject(source) ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        start = start < 0 ? source.length + start : start ?? 0;
        end = end < 0 ? source.length + end : end ?? source.length;
        for(; start < end && !stopInvoked; start++){
            let value = source[start];
            if ((projection ? value = projection(value, i++) : value) != null) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source != null ? array(project(source, projection, start, end)) : undefined$1;
};
const mapAsync = async (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    const mapped = [];
    await forEachAsync(source, async (item)=>(item = await projection(item)) != null && mapped.push(item));
    return mapped;
};
const concat = (...items)=>{
    let merged;
    forEach(items.length === 1 ? items[0] : items, (item)=>item != null && (merged ??= []).push(...array(item)));
    return merged;
};
const forEachArray = (source, action, start, end)=>{
    let returnValue;
    let i = 0;
    start = start < 0 ? source.length + start : start ?? 0;
    end = end < 0 ? source.length + end : end ?? source.length;
    for(; start < end; start++){
        if (source[start] != null && (returnValue = action(source[start], i++) ?? returnValue, stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachIterable = (source, action)=>{
    let returnValue;
    let i = 0;
    for (let value of source){
        if (value != null && (returnValue = action(value, i++) ?? returnValue, stopInvoked)) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachObject = (source, action)=>{
    let returnValue;
    let i = 0;
    for(let key in source){
        if (returnValue = action([
            key,
            source[key]
        ], i++) ?? returnValue, stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const forEachInternal = (source, action, start, end)=>{
    if (source == null) return;
    if (isArray(source)) return forEachArray(source, action, start, end);
    if (start === undefined$1) {
        if (source[symbolIterator]) return forEachIterable(source, action);
        if (typeof source === "object") return forEachObject(source, action);
    }
    let returnValue;
    for (const value of createIterator(source, action, start, end)){
        value != null && (returnValue = value);
    }
    return returnValue;
};
const forEach = forEachInternal;
const forEachAsync = async (source, action, start, end)=>{
    if (source == null) return undefined$1;
    let returnValue;
    for (let item of project(source, action, start, end)){
        (item = await item) != null && (returnValue = item);
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
    return returnValue;
};
const fromEntries = Object.fromEntries;
/**
 * Like Object.fromEntries, but accepts any iterable source and a projection instead of just key/value pairs.
 * Properties with undefined values are not included in the resulting object.
 */ const obj = (source, selector, merge)=>{
    if (source == null) return undefined$1;
    if (isBoolean(selector) || merge) {
        let result = {};
        forEach(source, merge ? (item, i)=>(item = selector(item, i)) != null && (item[1] = merge(result[item[0]], item[1])) != null && (result[item[0]] = item[1]) : (source)=>forEach(source, selector ? (item)=>item?.[1] != null && ((result[item[0]] ??= []).push(item[1]), result) : (item)=>item?.[1] != null && (result[item[0]] = item[1], result)));
        return result;
    }
    return fromEntries(map(source, selector ? (item, index)=>ifDefined(selector(item, index), 1) : (item)=>ifDefined(item, 1)));
};
const mapFirst = (source, projection, start, end)=>source == null ? undefined$1 : (projection = wrapProjection(projection), forEachInternal(source, (value, i)=>!projection || (value = projection(value, i)) ? stop(value) : undefined$1, start, end));
const rank = (source)=>createIterator(source, (item, i)=>[
            item,
            i
        ]);
const some = (source, predicate, start, end)=>source == null ? undefined$1 : isPlainObject(source) && !predicate ? Object.keys(source).length > 0 : source.some?.(predicate ?? isTruish) ?? forEachInternal(source, predicate ? (item, index)=>predicate(item, index) ? stop(true) : false : ()=>stop(true), start, end) ?? false;
// #endregion
// #region get
const updateSingle = (target, key, value)=>setSingle(target, key, isFunction(value) ? value(get(target, key)) : value);
const setSingle = (target, key, value)=>{
    if (target.constructor === Object || isArray(target)) {
        value === undefined ? delete target[key] : target[key] = value;
        return value;
    }
    value === undefined ? target.delete ? target.delete(key) : delete target[key] : target.set ? target.set(key, value) : target.add ? value ? target.add(key) : target.delete(key) : target[key] = value;
    return value;
};
const get = (target, key, init)=>{
    if (!target) return undefined;
    if (target.constructor === Object && init == null) return target[key];
    let value = target.get ? target.get(key) : target.has ? target.has(key) : target[key];
    if (value === undefined && init != null) {
        (value = isFunction(init) ? init() : init) != null && setSingle(target, key, value);
    }
    return value;
};
const merge = (target, ...values)=>(forEach(values, (values)=>forEach(values, ([key, value])=>{
            if (value != null) {
                if (isPlainObject(target[key]) && isPlainObject(value)) {
                    merge(target[key], value);
                } else {
                    target[key] = value;
                }
            }
        })), target);
const createSetOrUpdateFunction = (setter)=>(target, key, value, error)=>{
        if (!target) return undefined;
        if (value != undefined) {
            return setter(target, key, value, error);
        }
        forEach(key, (item)=>isArray(item) ? setter(target, item[0], item[1]) : forEach(item, ([key, value])=>setter(target, key, value)));
        return target;
    };
const update = createSetOrUpdateFunction(updateSingle);
const unwrap = (value)=>isFunction(value) ? value() : value;
const wrap = (original, wrap)=>original == null ? original : isFunction(original) ? (...args)=>wrap(original, ...args) : wrap(()=>original);
const MILLISECOND = 1;
const SECOND = MILLISECOND * 1000;
const MINUTE = SECOND * 60;
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
class ResettablePromise {
    _promise;
    constructor(){
        this.reset();
    }
    get value() {
        return this._promise.value;
    }
    get error() {
        return this._promise.error;
    }
    get pending() {
        return this._promise.pending;
    }
    resolve(value, ifPending = false) {
        this._promise.resolve(value, ifPending);
        return this;
    }
    reject(value, ifPending = false) {
        this._promise.reject(value, ifPending);
        return this;
    }
    reset() {
        this._promise = new OpenPromise();
        return this;
    }
    signal(value) {
        this.resolve(value);
        this.reset();
        return this;
    }
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
}
class OpenPromise {
    _promise;
    resolve;
    reject;
    value;
    error;
    pending = true;
    constructor(){
        let captured;
        this._promise = new Promise((...args)=>{
            captured = args.map((inner, i)=>(value, ifPending)=>{
                    if (!this.pending) {
                        if (ifPending) return this;
                        throw new TypeError("Promise already resolved/rejected.");
                    }
                    this.pending = false;
                    this[i ? "error" : "value"] = value === undefined$1 || value;
                    inner(value);
                    return this;
                });
        });
        [this.resolve, this.reject] = captured;
    }
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
}
const createLock = (timeout)=>{
    const semaphore = promise(true);
    let state;
    const wait = async (arg1, arg2, arg3)=>{
        if (isFunction(arg1)) {
            const release = await wait(arg2, arg3);
            return release ? await tryCatchAsync(arg1, true, release) : undefined$1;
        }
        const ownerId = arg2;
        let ms = arg1;
        let renewInterval = 0;
        while(state && ownerId !== state[0] && (state[1] ?? 0) < now()){
            if (await (ms >= 0 ? race(delay(ms), semaphore) : semaphore) === undefined$1) {
                return undefined$1;
            }
        // If the above did not return undefined we got the semaphore.
        }
        const release = ()=>{
            clearTimeout(renewInterval);
            state = undefined$1;
            semaphore.signal(false);
        };
        const renew = ()=>{
            state = [
                ownerId ?? true,
                timeout ? now() - timeout : undefined$1
            ];
            timeout && (renewInterval = setTimeout(()=>state && renew(), timeout / 2));
        };
        renew();
        return release;
    };
    return wait;
};
const delay = (ms, value)=>ms == null || isFinite(ms) ? !ms || ms <= 0 ? unwrap(value) : new Promise((resolve)=>setTimeout(async ()=>resolve(await unwrap(value)), ms)) : throwError(`Invalid delay ${ms}.`);
const promise = (resettable)=>resettable ? new ResettablePromise() : new OpenPromise();
const waitAll = (...args)=>Promise.all(args.map((arg)=>isFunction(arg) ? arg() : arg));
const race = (...args)=>Promise.race(args.map((arg)=>isFunction(arg) ? arg() : arg));
/**
 * Creates a string enumerating a list of value given a separator, optionally using a different separator between the last two items.
 *
 * @param values - The list of items to enumerator.
 * @param separator - The separator to use (defaults to ", "). If given a tuple, the first item is the last separator without spaces.
 * The second item may optionally specify another separator than the default (", ").
 *
 *
 * Useful for enumerations like "item1, item2 and item 3" (`separate(["item1", "item2", "item3"], ["and"])`).
 */ const enumerate = (values, separator = [
    "and",
    ", "
])=>!values ? undefined$1 : (values = map(values)).length === 1 ? values[0] : isArray(separator) ? [
        values.slice(0, -1).join(separator[1] ?? ", "),
        " ",
        separator[0],
        " ",
        values[values.length - 1]
    ].join("") : values.join(separator ?? ", ");
const join = (source, projection, sep)=>source == null ? undefined$1 : isFunction(projection) ? enumerate(map(isString(source) ? [
        source
    ] : source, projection), sep ?? "") : isString(source) ? source : enumerate(map(source, (item)=>item === false ? undefined$1 : item), projection ?? "");
class TupleMap extends Map {
    _instances = new Map();
    _tupleInstance(key) {
        let map = this._instances.get(key[0]);
        !map && this._instances.set(key[0], map = new Map());
        return map.get(key[1]) ?? (map.set(key[1], key = [
            ...key
        ]), key);
    }
    clear() {
        super.clear();
        this._instances.clear();
    }
    delete(key) {
        if (super.delete(this._tupleInstance(key))) {
            this._instances.get(key[0]).delete(key[1]);
            return true;
        }
        return false;
    }
    get(key) {
        return super.get(this._tupleInstance(key));
    }
    set(key, value) {
        if (value === undefined) {
            this.delete(key);
            return this;
        }
        super.set(this._tupleInstance(key), value);
        return this;
    }
}
class DoubleMap {
    _map = new Map();
    _reverse;
    _size = 0;
    constructor(optimizeReverseLookup = false){
        if (optimizeReverseLookup) {
            this._reverse = new Map();
        }
    }
    clear() {
        if (!this._size) {
            return false;
        }
        this._size = 0;
        this._reverse?.clear();
        this._map.clear();
        return true;
    }
    _cleanDelete(key, map = this._map.get(key[0])) {
        if (!map) return false;
        if (map.delete(key[1])) {
            if (!map.size) this._map.delete(key[0]);
            this._reverse?.delete(key[0]);
            --this._size;
            return true;
        }
        return false;
    }
    /**
   * @returns true if an element in the TupleMap existed and has been removed, or false if the element does not exist.
   */ delete(key) {
        if (key[0] != null) {
            if (key[1] != null) {
                return this._cleanDelete(key);
            }
            if (!this._reverse) {
                this._size -= this._map.get(key[0])?.size ?? 0;
                return this._map.delete(key[0]);
            }
        } else if (key[1] === undefined) {
            return this.clear();
        }
        let deleted = false;
        for (const [target] of this.iterate(key)){
            deleted = this._cleanDelete(target) || deleted;
        }
        return deleted;
    }
    /**
   * Executes a provided function once per each key/value pair in the TupleMap, unlike a normal Map, not in strict insertion order.
   * The insert order by key at a higher levels is guaranteed (this class is effectively just a nested map).
   */ forEach(callbackfn) {
        this._map.forEach((map, key1)=>map.forEach((value, key2)=>callbackfn(value, [
                    key1,
                    key2
                ], this)));
    }
    /**
   * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
   * @returns Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
   */ get(key) {
        return this._map.get(key[0])?.get(key[1]);
    }
    getMap(key) {
        return this._map.get(key);
    }
    /**
   * @returns boolean indicating whether an element with the specified key exists or not.
   */ has(key) {
        return this._map.get(key[0])?.has(key[1]) ?? false;
    }
    /**
   * Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated.
   * If the value is undefined, the key will get deleted.
   */ set(key, value) {
        let map = this._map.get(key[0]);
        if (value === undefined) {
            this._cleanDelete(key, map);
        } else {
            if (!map) {
                this._map.set(key[0], map = new Map());
            }
            if (!map.has(key[1])) {
                if (this._reverse) {
                    let set = this._reverse.get(key[1]);
                    if (!set) {
                        this._reverse.set(key[1], set = new Set());
                    }
                    set.add(key[0]);
                }
                ++this._size;
            }
            map.set(key[1], value);
        }
        return this;
    }
    /**
   * @returns the number of elements in the Map.
   */ get size() {
        return this._size;
    }
    *iterate(filter) {
        if (!filter || (filter[0] ?? filter[1]) === undefined) {
            yield* this;
        } else {
            const [key1Filter, key2Filter] = filter;
            if (key1Filter != null) {
                const map = this._map.get(filter[0]);
                if (!map) {
                    return;
                }
                if (key2Filter != null) {
                    const value = map.get(key2Filter);
                    if (value) {
                        yield [
                            filter,
                            value
                        ];
                    }
                    return;
                }
                for (const [key2, value] of map){
                    yield [
                        [
                            key1Filter,
                            key2
                        ],
                        value
                    ];
                }
                return;
            }
            if (this._reverse) {
                for (const key1 of this._reverse.get(filter[1])){
                    yield [
                        [
                            key1,
                            key2Filter
                        ],
                        this._map.get(key1).get(filter[1])
                    ];
                }
                return;
            }
            for (const [key1, map] of this._map){
                for (const [key2, value] of map){
                    if (key2 === key2Filter) {
                        yield [
                            [
                                key1,
                                key2
                            ],
                            value
                        ];
                    }
                }
            }
        }
    }
    *values() {
        for (const [, value] of this){
            yield value;
        }
    }
    *keys() {
        for (const [key] of this){
            yield key;
        }
    }
    entries() {
        return this[Symbol.iterator]();
    }
    get [Symbol.toStringTag]() {
        return `Map`;
    }
    *[Symbol.iterator]() {
        for (const [key1, values] of this._map){
            for (const [key2, value] of values){
                yield [
                    [
                        key1,
                        key2
                    ],
                    value
                ];
            }
        }
    }
}
const parameterList = Symbol();
const parseKeyValue = (value, arrayDelimiters = [
    "|",
    ";",
    ","
], decode = true)=>{
    if (!value) return undefined$1;
    const parts = value.split("=").map((v)=>decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim());
    parts[1] ??= "";
    parts[2] = parts[1] && arrayDelimiters?.length && mapFirst(arrayDelimiters, (delim, _, split = parts[1].split(delim))=>split.length > 1 ? split : undefined$1) || (parts[1] ? [
        parts[1]
    ] : []);
    return parts;
};
// // Browsers accepts `//` as "whatever the protocol is" is links.
// // A scheme can only be letters, digits, `+`, `-` and `.`.
// // The slashes are captured so we can put the parsed URI correctly back together.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1
// Scheme (group 1 and 2) = `//` or `name:` or `name://` = (?:(?:([\w+.-]+):)?(\/\/)?)
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.1
// User Information (groups 4 and 5) = `user@` or `user:password@` = (?:([^:@]+)(?:\:([^@]*))?@)
// // If an IPv6 address is used with a port it is wrapped in square brackets.
// // Otherwise a host is anything until port, path or query string.
// // Se also https://serverfault.com/questions/205793/how-can-one-distinguish-the-host-and-the-port-in-an-ipv6-url about the brackets.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
// Host (group 6 or 7) = `[ IPv6 or IPvFuture ]:port` or IPv6 or `IPv4:port` or `domain:port`  = (?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))
// //Port is included in the optional host group to separate `about:blank` like schemes from `localhost:1337` like hosts
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.3
// Port (group 8) = (?::(\d*))?
// Authority (group 3) = User Information + Host + Port
// // Anything until an optional query or fragment
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.3
// Path and  (group 9) = (\/[^#?]*)
// // Anything following a `?` until an optional fragment.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.4
// Query (group 10) = (?:\?([^#]*))
// // Anything following a pound sign until end.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
// Fragment (group 11) = (?:#.*)
// Everything put together
// ^(?:(?:([\w+.-]+):)?(?:\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$
/**
 * Parses an URI according to https://www.rfc-editor.org/rfc/rfc3986#section-2.1.
 * The parser is not pedantic about the allowed characters in each group
 *
 * @param uri The URI to parse
 * @param query Whether to parse the query into a record with each parameter and its value(s) or just the string.
 *  If an array is provided these are the characters that are used to split query string values. If this is empty, arrays are not parsed.
 * @returns A record with the different parts of the URI.
 */ const parseUri = (uri, query = true, requireAuthority)=>uri == nil ? undefined$1 : match(uri, /^(?:(?:([\w+.-]+):)?(\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/g, (source, scheme, slashes, authority, user, password, bracketHost, host, port, path, queryString, fragment)=>{
        const parsed = {
            source,
            scheme,
            urn: scheme ? !slashes : slashes ? false : undefined$1,
            authority,
            user,
            password,
            host: bracketHost ?? host,
            port: port != null ? parseInt(port) : undefined$1,
            path,
            query: query === false ? queryString : parseQueryString(queryString, query),
            fragment
        };
        parsed.path = parsed.path || (parsed.authority ? parsed.urn ? "" : "/" : undefined$1);
        return parsed;
    });
const parseHttpHeader = (query, arrayDelimiters = [
    ","
], decode = true)=>parseParameters(query, "; ", arrayDelimiters, decode);
const parseQueryString = (query, arrayDelimiters, decode = true)=>parseParameters(query, "&", arrayDelimiters, decode);
const parseParameters = (query, separator, arrayDelimiters, decode = true)=>{
    const list = [];
    const results = query == nil ? undefined$1 : obj(query?.match(/(?:^.*?\?|^)([^#]*)/)?.[1]?.split(separator), (part, _, [key, value, values] = parseKeyValue(part, arrayDelimiters === false ? [] : arrayDelimiters === true ? undefined$1 : arrayDelimiters, decode) ?? [], kv)=>(kv = (key = key?.replace(/\[\]$/, "")) != null ? arrayDelimiters !== false ? [
            key,
            values.length > 1 ? values : value
        ] : [
            key,
            value
        ] : undefined$1, list.push(kv), kv), (current, value)=>current ? arrayDelimiters !== false ? concat(current, value) : (current ? current + "," : "") + value : value);
    results && (results[parameterList] = list);
    return results;
};
let matchProjection;
let collected;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */ const match = (s, regex, selector, collect = false)=>(s ?? regex) == nil ? undefined$1 : selector ? (matchProjection = undefined$1, collect ? (collected = [], match(s, regex, (...args)=>(matchProjection = selector(...args)) != null && collected.push(matchProjection))) : s.replace(regex, (...args)=>matchProjection = selector(...args)), matchProjection) : s.match(regex);

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";

class TrackerCoreEvents {
    id = "core_events";
    async patch(events, next, tracker) {
        if (!tracker.session) {
            // Do nothing if there is no session. We do not want to start sessions on passive requests (only timing events).
            return [];
        }
        events = await next(events);
        if (!tracker.sessionId) {
            return events;
        }
        let timestamp = now();
        events.forEach((ev)=>ev.timestamp < timestamp && (timestamp = ev.timestamp));
        // Apply updates via patches. This enables multiple requests for the same session to execute concurrently.
        let sessionPatches = [];
        let devicePatches = [];
        const flushUpdates = async ()=>{
            [
                sessionPatches,
                devicePatches
            ].forEach((patches)=>patches.unshift((info)=>info.lastSeen < timestamp && (info.isNew = false, info.lastSeen = timestamp)));
            await tracker.set([
                {
                    ...tracker._session,
                    patch: (current)=>{
                        if (!current) return;
                        sessionPatches.forEach((patch)=>patch(current.value));
                        return current;
                    }
                },
                tracker.device ? {
                    ...tracker._device,
                    patch: (current)=>{
                        if (!current) return;
                        devicePatches.forEach((patch)=>patch(current.value));
                        return current;
                    }
                } : undefined
            ]);
            sessionPatches = [];
            devicePatches = [];
        };
        const updatedEvents = [];
        for (let event of events){
            if (isConsentEvent(event)) {
                await tracker.updateConsent(dataClassification.tryParse(event.consent.level), dataPurposes.tryParse(event.consent.purposes));
            } else if (isResetEvent(event)) {
                if (tracker.session.userId) {
                    // Fake a sign out event if the user is currently authenticated.
                    events.push(event);
                    event = {
                        type: "sign_out",
                        userId: tracker.authenticatedUserId,
                        timestamp: event.timestamp
                    };
                } else {
                    // Start new session
                    await flushUpdates();
                    await tracker.reset(true, event.includeDevice, event.includeConsent, event.timestamp);
                }
            }
            const session = {
                sessionId: tracker.sessionId,
                deviceSessionId: tracker.deviceSessionId,
                deviceId: tracker.deviceId,
                userId: tracker.authenticatedUserId,
                consent: {
                    level: dataClassification.lookup(tracker.consent.level),
                    purposes: dataPurposes.lookup(tracker.consent.purposes)
                },
                expiredDeviceSessionId: tracker._expiredDeviceSessionId,
                clientIp: tracker.clientIp ?? undefined
            };
            updatedEvents.push(event);
            if (tracker.session.isNew) {
                let isStillNew = true;
                await tracker.set([
                    {
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        patch: (current)=>{
                            // Make sure we only post the "session_started" event once.
                            if (current?.value?.isNew === true) {
                                return {
                                    value: {
                                        ...current.value,
                                        isNew: false
                                    }
                                };
                            }
                            isStillNew = false;
                            return undefined;
                        }
                    }
                ]);
                if (isStillNew) {
                    updatedEvents.push({
                        type: "session_started",
                        url: tracker.url,
                        sessionNumber: tracker.device?.sessions ?? 1,
                        timeSinceLastSession: tracker.session.previousSession ? tracker.session.firstSeen - tracker.session.previousSession : undefined,
                        session,
                        tags: tracker.env.tags,
                        timestamp
                    });
                }
            }
            event.session = session;
            if (isUserAgentEvent(event)) {
                sessionPatches.push((data)=>data.hasUserAgent = true);
            } else if (isViewEvent(event)) {
                sessionPatches.push((data)=>++data.views, (data)=>event.tabNumber > (data.tabs ??= 0) && (data.tabs = event.tabNumber));
                devicePatches.push((data)=>++data.views);
            } else if (isSignInEvent(event)) {
                const changed = tracker.authenticatedUserId && tracker.authenticatedUserId != event.userId;
                if (changed && await tracker._requestHandler._validateLoginEvent(event.userId, event.evidence)) {
                    event.session.userId = event.userId;
                    sessionPatches.push((data)=>data.userId = event.userId);
                }
            } else if (isSignOutEvent(event)) {
                sessionPatches.push((data)=>data.userId = undefined);
            } else if (isConsentEvent(event)) {
                await tracker.updateConsent(event.consent.level, event.consent.purposes);
            }
        }
        await flushUpdates();
        return updatedEvents;
    }
}

class EventLogger {
    configuration;
    id;
    constructor(configuration){
        this.configuration = configuration;
        this.id = "event-logger";
    }
    async post(events, tracker) {
        for (const ev of events){
            tracker.env.log(this, {
                group: this.configuration.group,
                level: "info",
                source: this.id,
                message: JSON.stringify(ev, null, 2)
            });
        }
    }
}

const Timestamps = {
    id: "core-validation",
    async patch (events, next, tracker) {
        const now = Date.now();
        return await mapAsync(await next(await mapAsync(events, async (event)=>{
            if (!tracker.sessionId) return;
            event.id = await tracker.env.nextId();
            if (event.timestamp) {
                if (event.timestamp > 0) {
                    return {
                        error: "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
                        source: event
                    };
                }
                event.timestamp = now + event.timestamp;
            } else {
                event.timestamp = now;
            }
            return event;
        })), async (ev)=>{
            if (isTrackedEvent(ev)) {
                ev.timestamp ??= now;
                ev.id ??= await tracker.env.nextId();
                return ev;
            }
        });
    }
};

function fillPriceDefaults(data, content) {
    if (!content) return data;
    data.price ??= content.commerce?.price;
    data.unit ??= content.commerce?.unit;
    data.currency ??= content.commerce?.unit;
    return data;
}
function normalizeCartEventData(data) {
    if (!data) return undefined;
    fillPriceDefaults(data, data.item);
    if (data.units != null && (data.action == null || data.action === "add" || data.action === "remove")) {
        if (data.units === 0) return undefined;
        data.action = data.units > 0 ? "add" : "remove";
    }
    return data;
}
function sum(lines, selector) {
    let selected;
    return !lines ? undefined : lines.reduce((sum, item)=>(selected = selector(item)) != null ? (sum ?? 0) + selected : sum, undefined);
}
function normalizeOrder(order) {
    if (!order) return order;
    if (Array.isArray(order.items)) {
        order.items = order.items.map(normalizeOrderLine);
        if (order.total == null) {
            order.total = sum(order.items, (line)=>line.total);
        }
        if (order.vat == null) {
            order.vat = sum(order.items, (line)=>line.vat);
        }
    }
    return order;
}
function normalizeOrderLine(line) {
    if (!line) return line;
    fillPriceDefaults(line, line.item);
    if (line.total == null && line.price != null && line.units != null) {
        line.total = line.price * line.units;
    }
    if (line.price == null && line.total != null && line.units != null) {
        line.price = line.units !== 0 ? line.total / line.units : 0;
    }
    return line;
}
class CommerceExtension {
    id = "commerce";
    patch(events, next) {
        return next(events.map((event)=>isOrderEvent(event) ? normalizeOrder(event) : isCartEvent(event) ? normalizeCartEventData(event) : event));
    }
}

function bootstrap({ host, endpoint, schemas, cookies, extensions, allowUnknownEventTypes, encryptionKeys, debugScript, environmentTags, defaultConsent }) {
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        allowUnknownEventTypes,
        extensions: map(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension) ?? [],
        encryptionKeys,
        debugScript,
        environmentTags,
        defaultConsent
    });
}

function getErrorMessage(validationResult) {
    return !validationResult["type"] ? validationResult["error"] : null;
}
const isValidationError = (item)=>item && item["type"] == null && item["error"] != null;

var defaultSchema = {
    "$id": "urn:tailjs:core",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "definitions": {
        "ScopeInfo": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string"
                },
                "firstSeen": {
                    "$ref": "urn:tailjs:core#/definitions/Timestamp"
                },
                "lastSeen": {
                    "$ref": "urn:tailjs:core#/definitions/Timestamp"
                },
                "views": {
                    "type": "number"
                },
                "isNew": {
                    "type": "boolean"
                }
            },
            "required": [
                "id",
                "firstSeen",
                "lastSeen",
                "views"
            ],
            "x-privacy-class": "anonymous",
            "x-privacy-purposes": [
                "necessary",
                "server_write"
            ]
        },
        "Timestamp": {
            "type": "number",
            "description": "Unix timestamp in milliseconds."
        },
        "SessionInfo": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ScopeInfo"
                },
                {
                    "type": "object",
                    "properties": {
                        "id": {
                            "type": "string",
                            "x-privacy-purposes": [
                                "none",
                                "server"
                            ]
                        },
                        "deviceSessionId": {
                            "type": "string"
                        },
                        "deviceId": {
                            "type": "string"
                        },
                        "userId": {
                            "type": "string"
                        },
                        "previousSession": {
                            "$ref": "urn:tailjs:core#/definitions/Timestamp"
                        },
                        "hasUserAgent": {
                            "type": "boolean"
                        },
                        "tabs": {
                            "type": "number",
                            "description": "The total number of tabs opened during the session."
                        }
                    },
                    "required": [
                        "id"
                    ]
                }
            ]
        },
        "DeviceInfo": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ScopeInfo"
                },
                {
                    "type": "object",
                    "properties": {
                        "sessions": {
                            "type": "number"
                        }
                    },
                    "required": [
                        "sessions"
                    ]
                }
            ]
        },
        "SessionVariables": {
            "type": "object",
            "properties": {
                "@info": {
                    "$ref": "urn:tailjs:core#/definitions/SessionInfo",
                    "x-privacy-class": "anonymous",
                    "x-privacy-purpose": "necessary"
                },
                "@consent": {
                    "$ref": "urn:tailjs:core#/definitions/UserConsent",
                    "x-privacy-class": "anonymous",
                    "x-privacy-purpose": "necessary"
                },
                "@session_reference": {
                    "type": "string",
                    "x-privacy-class": "anonymous",
                    "x-privacy-purpose": "necessary"
                }
            }
        },
        "UserConsent": {
            "type": "object",
            "properties": {
                "level": {
                    "type": "string",
                    "enum": [
                        "anonymous",
                        "indirect",
                        "direct",
                        "sensitive"
                    ],
                    "description": "The highest level of data classification the user has consented to be stored."
                },
                "purposes": {
                    "anyOf": [
                        {
                            "type": "string",
                            "enum": [
                                "none",
                                "necessary",
                                "functionality",
                                "performance",
                                "targeting",
                                "security",
                                "infrastructure",
                                "any_anonymous",
                                "any",
                                "server",
                                "server_write"
                            ]
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": [
                                    "none",
                                    "necessary",
                                    "functionality",
                                    "performance",
                                    "targeting",
                                    "security",
                                    "infrastructure",
                                    "any_anonymous",
                                    "any",
                                    "server",
                                    "server_write"
                                ]
                            }
                        }
                    ],
                    "description": "The purposes the user has consented their data to be used for.",
                    "x-privacy-class": "anonymous"
                }
            },
            "required": [
                "level",
                "purposes"
            ],
            "description": "A user's consent choices."
        },
        "DeviceVariables": {
            "type": "object",
            "properties": {
                "@info": {
                    "$ref": "urn:tailjs:core#/definitions/DeviceInfo",
                    "x-privacy-class": "indirect",
                    "x-privacy-purpose": "necessary"
                }
            }
        },
        "TrackedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "schema": {
                            "type": "string",
                            "description": "The ID of the schema the event comes from. It is suggested that the schema ID includes a SemVer version number in the end. (e.g. urn:tailjs:0.9.0 or https://www.blah.ge/schema/3.21.0)"
                        },
                        "id": {
                            "$ref": "urn:tailjs:core#/definitions/Uuid",
                            "description": "This is assigned by the server. Only use  {@link  clientId }  client-side."
                        },
                        "clientId": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "This is set by the client and used to when events reference each other."
                        },
                        "metadata": {
                            "$ref": "urn:tailjs:core#/definitions/EventMetadata",
                            "description": "These properties are used to track the state of the event as it gets collected, and is not persisted."
                        },
                        "patchTargetId": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "If set, it means this event contains updates to an existing event with this  {@link  clientId } , and should not be considered a separate event. It must have the target event's  {@link  TrackedEvent.type }  postfixed with \"_patch\" (for example \"view_patch\").\n\nNumbers in patches are considered incremental which means the patch will include the amount to add to an existing number (or zero if it does not yet have a value). All other values are just overwritten with the patch values.\n\nPlease pay attention to this property when doing analytics lest you may over count otherwise.\n\nPatches are always considered passive, cf.  {@link  EventMetadata.passive } ."
                        },
                        "relatedEventId": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "The client ID of the event that caused this event to be triggered or got triggered in the same context. For example, a  {@link  NavigationEvent  }  may trigger a  {@link  ViewEvent } , or a  {@link  CartUpdatedEvent }  may be triggered with a  {@link  ComponentClickEvent } ."
                        },
                        "session": {
                            "$ref": "urn:tailjs:core#/definitions/Session",
                            "description": "The session associated with the event."
                        },
                        "view": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "When applicable, the view where the event happened (related by  {@link  ViewEvent } )."
                        },
                        "timestamp": {
                            "$ref": "urn:tailjs:core#/definitions/Timestamp",
                            "description": "This timestamp will always have a value before it reaches a backend. If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).",
                            "default": "now"
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The base type for all events that are tracked.\n\nThe naming convention is:\n- If the event represents something that can also be considered an entity like \"a page view\", \"a user location\" etc. the name should be a (deverbal) noun.\n- If the event only indicates something that happened, like \"session started\", \"view ended\" etc. the name should be a verb in the past tense.",
            "$id": "urn:tailjs:core:event",
            "x-privacy-class": "anonymous",
            "x-privacy-purpose": "necessary",
            "x-privacy-censor": "ignore"
        },
        "Tagged": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "$ref": "urn:tailjs:core#/definitions/Tag"
                    },
                    "description": "Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.\n\nExamples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,  `ext1:video:play` and `area=investors+9, area=consumers+2`\n\nAs in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).\n\nIt is possible to specify \"how much\" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the \"investors\" audience will ultimately be higher than the score for \"consumers\".\n\nTags are separated by comma (`,`).\n\nThe following rules apply:\n- There should not be quotes around tag values. If there are they will get interpreted as part of the value.\n- Tag names will get \"cleaned\" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.\n- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.\n- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\\,`), however using commas or similar characters   to store a list of values in the same tag is discouraged as each value should rather have its own tag.\n\nBAD: `selected=1\\,2\\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`\n\nBAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`\n\nBAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`\n\nTags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.\n\nTags are associated with HTML elements either via the `track-tags` attribute, or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.\n\nSince stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources."
                }
            },
            "description": "Types extending this interface allow custom values that are not explicitly defined in their schema.\n\nSee  {@link  tags }  for details."
        },
        "Tag": {
            "type": "object",
            "properties": {
                "tag": {
                    "type": "string",
                    "description": "The name of the tag including namespace."
                },
                "value": {
                    "type": "string",
                    "description": "The value of the tag."
                },
                "score": {
                    "$ref": "urn:tailjs:core#/definitions/Float",
                    "description": "How strongly the tags relates to the target.",
                    "default": 1
                }
            },
            "required": [
                "tag"
            ]
        },
        "Float": {
            "type": "number"
        },
        "Uuid": {
            "type": "string",
            "description": "An identifier that is globally unique. This does not need to be a \"conventional\" UUID like 853082a0-cc24-4185-aa30-9caacac02932'. It is any string that is guaranteed to be globally unique, and may be longer than 128 bits."
        },
        "LocalID": {
            "type": "string",
            "description": "An identifier that is locally unique to some scope."
        },
        "EventMetadata": {
            "type": "object",
            "properties": {
                "passive": {
                    "type": "boolean",
                    "description": "Hint to the request handler that new sessions should not be started if all posted events are passive."
                },
                "queued": {
                    "type": "boolean",
                    "description": "Hint that the event has been queued."
                },
                "posted": {
                    "type": "boolean",
                    "description": "Hint to client code, that the event has been posted to the server."
                }
            },
            "description": "These properties are used to track the state of events as they get collected, and not stored."
        },
        "Session": {
            "type": "object",
            "properties": {
                "sessionId": {
                    "$ref": "urn:tailjs:core#/definitions/Uuid",
                    "description": "The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards). Sessions are reset when an authenticated user logs out (triggered by the  {@link  SignOutEvent } ).\n\nAggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.\n\nIt is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting."
                },
                "deviceId": {
                    "$ref": "urn:tailjs:core#/definitions/Uuid",
                    "description": "The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.\n\nAggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.\n\nIt is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting."
                },
                "deviceSessionId": {
                    "$ref": "urn:tailjs:core#/definitions/Uuid",
                    "description": "The unique ID of the user's device session ID. A device session ends when the user has closed all tabs and windows, and starts whenever the user visits the site again. This means that device sessions can both be significantly shorter and longer that \"normal\" sessions in that it restarts whenever the user navigates completely away from the site and comes back (e.g. while evaluating search results), but it will also survive the user putting their computer to sleep or leaving their browser app in the background for a long time on their phone.\n\nAggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.\n\nIt is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting."
                },
                "userId": {
                    "type": "string",
                    "description": "The current user owning the session.",
                    "x-privacy-class": "direct"
                },
                "consent": {
                    "$ref": "urn:tailjs:core#/definitions/UserConsent",
                    "description": "The user's consent choices.  {@link  DataClassification.Anonymous }  means the session is cookie-less."
                },
                "clientIp": {
                    "type": "string",
                    "description": "The IP address of the device where the session is active.",
                    "x-privacy-class": "indirect",
                    "x-privacy-purpose": "infrastructure"
                },
                "expiredDeviceSessionId": {
                    "type": "string",
                    "description": "This value indicates that an old device session \"woke up\" with an old device session ID and took over a new one. This allows post-processing to decide what to do when the same tab participates in two sessions (which goes against the definition of a device session)."
                }
            },
            "required": [
                "sessionId"
            ],
            "description": "Identifiers related to a user's session, login and device. Based on the user's consent some of these fields may be unavailable.",
            "x-privacy-class": "anonymous",
            "x-privacy-purpose": "necessary"
        },
        "isTrackedEvent": {
            "$comment": "(ev: any) => ev is TrackedEvent",
            "type": "object",
            "properties": {
                "namedArgs": {
                    "type": "object",
                    "properties": {
                        "ev": {}
                    },
                    "required": [
                        "ev"
                    ],
                    "additionalProperties": false
                }
            }
        },
        "isPassiveEvent": {
            "$comment": "(\n  value: any) => value is {\n  metadata: EventMetadata & {\n    passive: true;\n  };\n}",
            "type": "object",
            "properties": {
                "namedArgs": {
                    "type": "object",
                    "properties": {
                        "value": {}
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                }
            }
        },
        "UserInteractionEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "components": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/ActivatedComponent"
                            },
                            "description": "Relevant components and content in the scope of the activated element."
                        },
                        "timeOffset": {
                            "$ref": "urn:tailjs:core#/definitions/ViewTimingData",
                            "description": "The time the event happened relative to the view were it was generated."
                        },
                        "pos": {
                            "$ref": "urn:tailjs:core#/definitions/ScreenPosition",
                            "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled)."
                        },
                        "viewport": {
                            "$ref": "urn:tailjs:core#/definitions/Viewport",
                            "description": "The viewport of the user's browser when the event happened."
                        },
                        "area": {
                            "type": "string",
                            "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash."
                        },
                        "element": {
                            "$ref": "urn:tailjs:core#/definitions/ElementInfo",
                            "description": "Information about the activated element, if any."
                        }
                    }
                }
            ]
        },
        "ActivatedComponent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Component"
                },
                {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/ActivatedContent"
                            },
                            "description": "The activated content in the component."
                        },
                        "rect": {
                            "$ref": "urn:tailjs:core#/definitions/Rectangle",
                            "description": "The size and position of the component when it was activated relative to the document top (not viewport)."
                        },
                        "area": {
                            "type": "string",
                            "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash."
                        }
                    }
                }
            ],
            "description": "The component definition related to a user activation."
        },
        "Component": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Personalizable"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "typeName": {
                            "type": "string",
                            "description": "An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial."
                        },
                        "dataSource": {
                            "$ref": "urn:tailjs:core#/definitions/ExternalReference",
                            "description": "Optional references to the content that was used to render the component."
                        },
                        "instanceId": {
                            "type": "string",
                            "description": "An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree."
                        },
                        "instanceNumber": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom)."
                        },
                        "inferred": {
                            "type": "boolean",
                            "description": "A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).",
                            "default": false
                        }
                    }
                }
            ]
        },
        "ExternalReference": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The ID as defined by some external source, e.g. CMS.\n\nThe property is required but an empty string is permitted. The library itself uses the empty string to indicate an \"empty\" root component if a page has content that is not wrapped in a component."
                },
                "version": {
                    "type": "string",
                    "description": "Optionally, the version of the item in case the external source supports versioning."
                },
                "language": {
                    "type": "string",
                    "description": "Optionally, the language of the item in case the external source supports localization."
                },
                "source": {
                    "type": "string",
                    "description": "Optionally, the ID of the external system referenced."
                },
                "referenceType": {
                    "type": "string",
                    "description": "Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. \"parent\" or \"pointer\"."
                },
                "isExternal": {
                    "type": "boolean",
                    "description": "Flag to indicate that this data comes from an external system that you do not control."
                },
                "name": {
                    "type": "string",
                    "description": "Optionally, the name of the item at the time an event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space."
                },
                "itemType": {
                    "type": "string",
                    "description": "Optionally, the type of item referenced. In CMS context this corresponds to \"template\". Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space."
                },
                "path": {
                    "type": "string",
                    "description": "Optionally, the path of the item at the time the event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space."
                }
            },
            "required": [
                "id"
            ],
            "description": "Represent a reference to externally defined data.\n\nHave in mind that the reference does not need to point to an external system or database. It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.\n\nThe tailjs model generally prefers using external references rather than simple strings for most properties since that gives you the option to collect structured data that integrates well in, say, BI scenarios.\n\nThe tenent is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change. Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources. The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.\n\nAgain, if you only have some hard-coded value, you can just make an external reference and use its  {@link  id }  property for the value. Hopefully, you will find that a little bit annoying every time you do it and make you start thinking about that you might in fact reference some external information that has an immutable ID."
        },
        "Personalizable": {
            "type": "object",
            "properties": {
                "personalization": {
                    "type": "array",
                    "items": {
                        "$ref": "urn:tailjs:core#/definitions/Personalization"
                    }
                }
            }
        },
        "Personalization": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "source": {
                            "$ref": "urn:tailjs:core#/definitions/ExternalReference",
                            "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.source }  corresponding to the test, but have different  {@link  Personalization.variable  } s."
                        },
                        "variables": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/PersonalizationVariable"
                            },
                            "description": "Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms."
                        },
                        "variants": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/PersonalizationVariant"
                            },
                            "description": "The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.\n\nTo represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources."
                        }
                    }
                }
            ],
            "description": "The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more."
        },
        "PersonalizationVariable": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "value": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "value"
                    ]
                }
            ],
            "description": "A reference to a variable and its value in personalization."
        },
        "PersonalizationVariant": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "sources": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/PersonalizationSource"
                            },
                            "description": "The aspects of the component or page the variant changed. There can mutilple sources, e.g. a variant may both change the size of a component and change the content at the same time."
                        },
                        "default": {
                            "type": "boolean",
                            "description": "If the reference is the default variant.",
                            "default": false
                        },
                        "eligible": {
                            "type": "boolean",
                            "description": "If the variant could have been picked."
                        },
                        "selected": {
                            "type": "boolean",
                            "description": "If the variant was chosen."
                        }
                    }
                }
            ],
            "description": "A reference to the data/content item related to a variant in personalization."
        },
        "PersonalizationSource": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "relatedVariable": {
                            "type": "string",
                            "description": "In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component."
                        },
                        "personalizationType": {
                            "type": "string",
                            "description": "The kind of personalization that relates to this item."
                        }
                    }
                }
            ],
            "description": "A specific aspect changed for a page or component for personalization as part of a  {@link  PersonalizationVariant } ."
        },
        "Integer": {
            "type": "number"
        },
        "ActivatedContent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Content"
                },
                {
                    "type": "object",
                    "properties": {
                        "rect": {
                            "$ref": "urn:tailjs:core#/definitions/Rectangle",
                            "description": "The current size and position of the element representing the content relative to the document top (not viewport)."
                        }
                    }
                }
            ],
            "description": "The content definition related to a user activation."
        },
        "Content": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "commerce": {
                            "$ref": "urn:tailjs:core#/definitions/CommerceData"
                        }
                    }
                }
            ],
            "description": "Represents a content item that can be rendered or modified via a  {@link  Component } \n\nIf the content is personalized please add the criteria"
        },
        "CommerceData": {
            "type": "object",
            "properties": {
                "price": {
                    "$ref": "urn:tailjs:core#/definitions/Decimal",
                    "description": "The unit price."
                },
                "unit": {
                    "type": "string",
                    "description": "The unit the item is sold by."
                },
                "currency": {
                    "type": "string",
                    "description": "The currency of the price. This field does not have a default value; if unspecified it must be assumed from context."
                },
                "variation": {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference",
                    "description": "The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple)."
                },
                "stock": {
                    "$ref": "urn:tailjs:core#/definitions/Float",
                    "description": "The current number of units in stock.\n\nUse fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many)."
                }
            }
        },
        "Decimal": {
            "type": "number"
        },
        "Rectangle": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Position"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Size"
                },
                {
                    "type": "object"
                }
            ]
        },
        "Position": {
            "type": "object",
            "properties": {
                "x": {
                    "$ref": "urn:tailjs:core#/definitions/Float"
                },
                "y": {
                    "$ref": "urn:tailjs:core#/definitions/Float"
                }
            },
            "required": [
                "x",
                "y"
            ],
            "description": "Represents a position where the units are (CSS pixels)[#DevicePixelRatio]."
        },
        "Size": {
            "type": "object",
            "properties": {
                "width": {
                    "$ref": "urn:tailjs:core#/definitions/Float"
                },
                "height": {
                    "$ref": "urn:tailjs:core#/definitions/Float"
                }
            },
            "required": [
                "width",
                "height"
            ]
        },
        "ViewTimingData": {
            "type": "object",
            "properties": {
                "active": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar. Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds."
                },
                "visible": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "The time the view/tab has been visible."
                },
                "total": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "The time elapsed since the view/tab was opened."
                },
                "activations": {
                    "$ref": "urn:tailjs:core#/definitions/Integer",
                    "description": "The number of times the user toggled away from the view/tab and back."
                }
            }
        },
        "Duration": {
            "type": "number",
            "description": "Duration in milliseconds."
        },
        "ScreenPosition": {
            "type": "object",
            "properties": {
                "xpx": {
                    "$ref": "urn:tailjs:core#/definitions/Integer"
                },
                "ypx": {
                    "$ref": "urn:tailjs:core#/definitions/Integer"
                },
                "x": {
                    "$ref": "urn:tailjs:core#/definitions/Percentage"
                },
                "y": {
                    "$ref": "urn:tailjs:core#/definitions/Percentage"
                },
                "pageFolds": {
                    "$ref": "urn:tailjs:core#/definitions/Float",
                    "description": "The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling)."
                }
            },
            "required": [
                "x",
                "y"
            ],
            "description": "Represents a position where the units are percentages relative to an element or page."
        },
        "Percentage": {
            "type": "number"
        },
        "Viewport": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Rectangle"
                },
                {
                    "type": "object",
                    "properties": {
                        "totalWidth": {
                            "$ref": "urn:tailjs:core#/definitions/Float"
                        },
                        "totalHeight": {
                            "$ref": "urn:tailjs:core#/definitions/Float"
                        }
                    },
                    "required": [
                        "totalWidth",
                        "totalHeight"
                    ]
                }
            ]
        },
        "ElementInfo": {
            "type": "object",
            "properties": {
                "tagName": {
                    "type": "string",
                    "description": "The tag name of the activated element."
                },
                "text": {
                    "type": "string",
                    "description": "The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image)"
                },
                "href": {
                    "type": "string",
                    "description": "The target of the link, if any."
                },
                "rect": {
                    "$ref": "urn:tailjs:core#/definitions/Rectangle"
                }
            },
            "description": "Basic information about an HTML element."
        },
        "FormEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "form",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "name": {
                            "type": "string",
                            "description": "The name of the form that was submitted."
                        },
                        "completed": {
                            "type": "boolean",
                            "description": "Indicates whether the form was completed (that is, submitted). If this is false it means that the form was abandoned.",
                            "default": false
                        },
                        "activeTime": {
                            "$ref": "urn:tailjs:core#/definitions/Duration",
                            "description": "The duration the user was actively filling the form."
                        },
                        "totalTime": {
                            "$ref": "urn:tailjs:core#/definitions/Duration",
                            "description": "The total duration from the user started filling out the form until completion or abandonment."
                        },
                        "fields": {
                            "type": "object",
                            "additionalProperties": {
                                "$ref": "urn:tailjs:core#/definitions/FormField"
                            },
                            "description": "All fields in the form (as detected)."
                        },
                        "ref": {
                            "type": "string",
                            "description": "A correlation ID. If a hidden input element has the name \"_tailref\", the HTML attribute \"track-ref\" or css variable \"--track-ref: 1\" its value will be used. If all of the above is difficult to inject in the way the form is embedded, the form element or any of its ancestors may alternatively have the HTML attribute \"track-ref\" with the name of the hidden input field that contains the reference.\n\nIf no initial value a unique one will be assigned. Make sure to store the value in receiving end."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ]
        },
        "FormField": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string"
                },
                "name": {
                    "type": "string",
                    "description": "The name of the form field."
                },
                "label": {
                    "type": "string",
                    "description": "The label of the form field."
                },
                "type": {
                    "type": "string",
                    "description": "The type of the input field."
                },
                "filled": {
                    "type": "boolean",
                    "description": "If a user provided a value for the form field.\n\nFor checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them)."
                },
                "corrections": {
                    "$ref": "urn:tailjs:core#/definitions/Integer",
                    "description": "The number of times the field was changed after initially being filled."
                },
                "activeTime": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "How long the user was active in the field (field had focus on active tab)."
                },
                "totalTime": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "How long the user was in the field (including if the user left the tab and came back)."
                },
                "value": {
                    "type": "string",
                    "description": "The value of the form field. Be careful with this one, if you have connected a backend where you don't control the data. This value will not be populated unless the user has consented."
                },
                "fillOrder": {
                    "$ref": "urn:tailjs:core#/definitions/Integer",
                    "description": "This field's number in the order the form was filled. A field is \"filled\" the first time the user types something in it.\n\nIf a checkbox or pre-filled drop down is left unchanged it will not get assigned a number."
                },
                "lastField": {
                    "type": "boolean",
                    "description": "The field was the last one to be filled before the form was either submitted or abandoned."
                }
            },
            "required": [
                "name"
            ],
            "description": "A form field value in a  {@link  FormEvent } ."
        },
        "ComponentClickEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "component_click",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The event is triggered when a component is clicked.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS."
        },
        "ComponentClickIntentEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "component_click_intent",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "clicks": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/Position"
                            }
                        },
                        "clickables": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/ElementInfo"
                            }
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The event is triggered when a user probably wanted to click a component but nothing happened.\n\nUsed for UX purposes where it may indicate that navigation is not obvious to the users. This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS."
        },
        "ComponentViewEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "component_view",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking."
        },
        "NavigationEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "navigation",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "clientId": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "The ID of the navigation event. This will be added as  {@link  TrackedEvent.relatedEventId }  to view event that followed after the navigation."
                        },
                        "href": {
                            "type": "string",
                            "description": "The destination URL of the navigation"
                        },
                        "exit": {
                            "type": "boolean",
                            "description": "Indicates that the user went away from the site to an external URL."
                        },
                        "anchor": {
                            "type": "string",
                            "description": "The anchor specified in the href if any."
                        },
                        "external": {
                            "type": "boolean",
                            "description": "Indicates that the navigation is to an external domain"
                        },
                        "domain": {
                            "$ref": "urn:tailjs:core#/definitions/Domain",
                            "description": "The domain of the destination"
                        },
                        "self": {
                            "type": "boolean",
                            "description": "Whether the navigation happened in the current view or a new tab/window was opened."
                        }
                    },
                    "required": [
                        "type",
                        "clientId",
                        "href",
                        "self"
                    ]
                }
            ]
        },
        "Domain": {
            "type": "object",
            "properties": {
                "scheme": {
                    "type": "string"
                },
                "host": {
                    "type": "string"
                }
            },
            "required": [
                "scheme",
                "host"
            ],
            "description": "Represents a domain name, e.g. https://www.foo.co.uk"
        },
        "ScrollEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "scroll",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "offset": {
                            "$ref": "urn:tailjs:core#/definitions/ScreenPosition",
                            "description": "The offset relative to the page size (100 % is bottom, 0 % is top)"
                        },
                        "scrollType": {
                            "type": "string",
                            "enum": [
                                "fold",
                                "article-end",
                                "page-middle",
                                "page-end",
                                "read",
                                "offset"
                            ],
                            "description": "The type of scrolling."
                        }
                    },
                    "required": [
                        "type",
                        "offset"
                    ]
                }
            ]
        },
        "SearchEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "search",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "query": {
                            "type": "string",
                            "description": "The free-text query used for the search."
                        },
                        "filters": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/SearchFilter"
                            },
                            "description": "Any filters that were applied to the search in addition to the query. Filters are assumed combined using \"and\" semantics unless they are for the same field in which case it means that the field must match at least one of the values.\n\nFor example \"age>=10 AND age<=20 AND (type=horse OR type=cat)\""
                        },
                        "hits": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The number of results that matched the query."
                        },
                        "topHits": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/SearchResult"
                            },
                            "description": "If some or all of the results are relevant for analytics or AI, they can be included here."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ]
        },
        "SearchFilter": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "group": {
                            "type": "number",
                            "description": "If the filter consisted of multiple groups of filters where one of them should match this can be used to separate the groups.\n\nFor example (age>=10 AND age<=20 AND type=horse) OR (age<5 AND type=cat)."
                        },
                        "value": {
                            "type": [
                                "string",
                                "number",
                                "boolean"
                            ],
                            "description": "The value the field must match. Use UNIX ms timestamps for dates and durations. If the value is the ID of a defined entity use  {@link  reference }  instead."
                        },
                        "reference": {
                            "$ref": "urn:tailjs:core#/definitions/ExternalReference",
                            "description": "If the value is a defined entity such as a product category use this instead of  {@link  value } ."
                        },
                        "comparison": {
                            "type": "string",
                            "enum": [
                                "<",
                                "<=",
                                "=",
                                "!=",
                                ">=",
                                ">"
                            ],
                            "description": "How the field compares against the value.",
                            "default": "eq"
                        }
                    }
                }
            ],
            "description": "A filter that applies to a field in a search query."
        },
        "SearchResult": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "rank": {
                            "$ref": "urn:tailjs:core#/definitions/Integer"
                        }
                    },
                    "required": [
                        "rank"
                    ]
                }
            ]
        },
        "SearchFieldReferenceFilter": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "references": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                            },
                            "description": "A list of entities where the field must match at least one of them (or none depending on the comparison)."
                        },
                        "comparison": {
                            "type": "string",
                            "enum": [
                                "eq",
                                "neq"
                            ]
                        }
                    }
                }
            ],
            "description": "A search filter that applies to a single field that must match a defined entity (e.g. \"manufacturer\")."
        },
        "SessionStartedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "session_started",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "url": {
                            "type": "string"
                        },
                        "sessionNumber": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The total number of sessions from the given device (regardless of username)."
                        },
                        "timeSinceLastSession": {
                            "$ref": "urn:tailjs:core#/definitions/Duration",
                            "description": "The time since the last session from this device."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "x-privacy-class": "anonymous"
        },
        "UserAgentLanguage": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "description": "The full language tag as specified by (RFC 5646/BCP 47)[https://datatracker.ietf.org/doc/html/rfc5646]"
                },
                "language": {
                    "type": "string",
                    "description": "The language name (ISO 639)."
                },
                "region": {
                    "type": "string",
                    "description": "Dialect (ISO 3166 region)."
                },
                "primary": {
                    "type": "boolean",
                    "description": "If it is the users primary preference."
                },
                "preference": {
                    "$ref": "urn:tailjs:core#/definitions/Integer",
                    "description": "The user's preference of the language (1 is highest)."
                }
            },
            "required": [
                "id",
                "language",
                "primary",
                "preference"
            ]
        },
        "UserAgentEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/SessionScoped"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "user_agent",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "hasTouch": {
                            "type": "boolean",
                            "description": "Has touch"
                        },
                        "deviceType": {
                            "type": "string",
                            "enum": [
                                "mobile",
                                "tablet",
                                "desktop"
                            ],
                            "description": "The device type (inferred from screen size). The assumption is:   - anything width a logical device pixel width less than 480 is a phone,   - anything with a logical device pixel width less than or equal to 1024 (iPad Pro12.9\") is a tablet,   - the rest are desktops.\n\nDevice width is the physical width of the device regardless of its orientation."
                        },
                        "userAgent": {
                            "type": "string",
                            "description": "User agent string"
                        },
                        "languages": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/UserAgentLanguage"
                            },
                            "description": "The user's language preferences as configured in the user's device."
                        },
                        "timezone": {
                            "type": "object",
                            "properties": {
                                "iana": {
                                    "type": "string"
                                },
                                "offset": {
                                    "$ref": "urn:tailjs:core#/definitions/Float",
                                    "description": "The offset from GMT in hours."
                                }
                            },
                            "required": [
                                "iana",
                                "offset"
                            ]
                        },
                        "screen": {
                            "type": "object",
                            "properties": {
                                "dpr": {
                                    "$ref": "urn:tailjs:core#/definitions/Float",
                                    "description": "Device pixel ratio (i.e. how many physical pixels per logical CSS pixel)"
                                },
                                "width": {
                                    "$ref": "urn:tailjs:core#/definitions/Float",
                                    "description": "Device width."
                                },
                                "height": {
                                    "$ref": "urn:tailjs:core#/definitions/Float",
                                    "description": "Device height."
                                },
                                "landscape": {
                                    "type": "boolean",
                                    "description": "The device was held in landscape mode.",
                                    "default": false
                                }
                            },
                            "required": [
                                "dpr",
                                "width",
                                "height"
                            ],
                            "description": "Screen"
                        }
                    },
                    "required": [
                        "type",
                        "userAgent",
                        "timezone"
                    ]
                }
            ]
        },
        "SessionScoped": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Scoped"
                },
                {
                    "type": "object"
                }
            ],
            "description": "Events implementing this interface indicate that they contain information that relates to the entire session and not just the page view where they happened."
        },
        "Scoped": {
            "type": "object",
            "description": "Base interface for other marker interfaces that specifies that an event is scoped to something else than page views."
        },
        "ClickIds": {
            "type": "object",
            "properties": {
                "google": {
                    "type": "string"
                },
                "googleDoubleClick": {
                    "type": "string"
                },
                "facebook": {
                    "type": "string"
                },
                "microsoft": {
                    "type": "string"
                },
                "googleAnalytics": {
                    "type": "string"
                }
            }
        },
        "ViewEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "view",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "clientId": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "This is set by the client and used to when events reference each other."
                        },
                        "definition": {
                            "$ref": "urn:tailjs:core#/definitions/View",
                            "description": "The primary content used to generate the view including the personalization that led to the decision, if any. If views are loaded asynchronously in a way where they are not available immediately after a user navigates to a URL on the website, the view definition may follow from a separate patch event."
                        },
                        "tab": {
                            "$ref": "urn:tailjs:core#/definitions/LocalID",
                            "description": "The tab where the view was shown."
                        },
                        "href": {
                            "type": "string",
                            "description": "The fully qualified URL as shown in the address line of the browser excluding the domain."
                        },
                        "hash": {
                            "type": "string",
                            "description": "The hash part of the URL (/about-us#address)."
                        },
                        "path": {
                            "type": "string",
                            "description": "The path portion of the URL."
                        },
                        "duration": {
                            "$ref": "urn:tailjs:core#/definitions/ViewTimingData",
                            "description": "For how long the view was active. This is set via patches"
                        },
                        "utm": {
                            "type": "object",
                            "properties": {
                                "source": {
                                    "type": "string"
                                },
                                "medium": {
                                    "type": "string"
                                },
                                "campaign": {
                                    "type": "string"
                                },
                                "term": {
                                    "type": "string"
                                },
                                "content": {
                                    "type": "string"
                                }
                            },
                            "description": "Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters]."
                        },
                        "queryString": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },
                            "description": "The query string parameters in the URL, e.g. utm_campaign. Each parameter can have multiple values, for example If the parameter is specified more than once. If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order). A parameter without a value will get recorded as an empty string."
                        },
                        "domain": {
                            "$ref": "urn:tailjs:core#/definitions/Domain",
                            "description": "The domain part of the href, if any."
                        },
                        "landingPage": {
                            "type": "boolean",
                            "description": "Indicates that this was the first view in the first tab the user opened. Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.",
                            "default": false
                        },
                        "firstTab": {
                            "type": "boolean",
                            "description": "Indicates that no other tabs were open when the view happened. This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity. By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.",
                            "default": false
                        },
                        "tabNumber": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The tab number in the current session."
                        },
                        "tabViewNumber": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The view number in the current tab. This is kept as a convenience, yet technically redundant since it follows from timestamps and context.",
                            "default": 1
                        },
                        "redirects": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "Number of redirects that happened during navigation to this view."
                        },
                        "navigationType": {
                            "type": "string",
                            "enum": [
                                "navigate",
                                "back-forward",
                                "prerender",
                                "reload"
                            ],
                            "description": "Navigation type."
                        },
                        "mode": {
                            "type": "string",
                            "enum": [
                                "manual",
                                "automatic"
                            ],
                            "description": "Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.",
                            "default": "automatic"
                        },
                        "externalReferrer": {
                            "type": "object",
                            "properties": {
                                "href": {
                                    "type": "string"
                                },
                                "domain": {
                                    "$ref": "urn:tailjs:core#/definitions/Domain"
                                }
                            },
                            "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field."
                        },
                        "viewport": {
                            "$ref": "urn:tailjs:core#/definitions/Viewport",
                            "description": "The size of the user's viewport (e.g. browser window) and how much it was scrolled when the page was opened."
                        },
                        "viewType": {
                            "type": "string",
                            "description": "The type of view, e.g. \"page\" or \"screen\".",
                            "default": "page"
                        }
                    },
                    "required": [
                        "type",
                        "clientId",
                        "href"
                    ]
                }
            ],
            "description": "This event is sent a user navigates between views. (page, screen or similar).\n\nThis event does not"
        },
        "View": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Content"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Personalizable"
                },
                {
                    "type": "object",
                    "properties": {
                        "preview": {
                            "type": "boolean",
                            "description": "The page was shown in preview/staging mode."
                        }
                    }
                }
            ]
        },
        "SessionLocationEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/SessionScoped"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "session_location",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "accuracy": {
                            "$ref": "urn:tailjs:core#/definitions/Float",
                            "description": "This number is like the precise definition of what the bars indicating signal strength on mobile phones represents. Nobody knows. Yet, for this number lower is better."
                        },
                        "continent": {
                            "$ref": "urn:tailjs:core#/definitions/GeoEntity",
                            "x-privacy-class": "anonymous",
                            "x-privacy-purpose": "infrastructure"
                        },
                        "country": {
                            "$ref": "urn:tailjs:core#/definitions/GeoEntity",
                            "x-privacy-class": "anonymous",
                            "x-privacy-purpose": "infrastructure"
                        },
                        "subdivision": {
                            "$ref": "urn:tailjs:core#/definitions/GeoEntity"
                        },
                        "zip": {
                            "type": "string"
                        },
                        "city": {
                            "$ref": "urn:tailjs:core#/definitions/GeoEntity"
                        },
                        "lat": {
                            "$ref": "urn:tailjs:core#/definitions/Float"
                        },
                        "lng": {
                            "$ref": "urn:tailjs:core#/definitions/Float"
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "This event is triggered whenever the user's location changes.",
            "x-privacy-class": "indirect",
            "x-privacy-purpose": "performance"
        },
        "GeoEntity": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string"
                },
                "geonames": {
                    "$ref": "urn:tailjs:core#/definitions/Integer"
                },
                "iso": {
                    "type": "string"
                },
                "confidence": {
                    "$ref": "urn:tailjs:core#/definitions/Float"
                }
            },
            "required": [
                "name"
            ]
        },
        "AnchorNavigationEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "anchor_navigation",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "anchor": {
                            "type": "string",
                            "description": "The name of the anchor."
                        }
                    },
                    "required": [
                        "type",
                        "anchor"
                    ]
                }
            ],
            "description": "The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3)"
        },
        "ConsentEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "consent",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "consent": {
                            "$ref": "urn:tailjs:core#/definitions/UserConsent"
                        }
                    },
                    "required": [
                        "type",
                        "consent"
                    ]
                }
            ],
            "description": "The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.\n\nThis event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device. In the same way, such information is cleared if the user opts out.\n\nBackends are expected to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.\n\nThe user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with  {@link  nonEssentialTracking  }  `false` revokes the consent if already given. The event should ideally be sent from a cookie disclaimer.\n\nGranular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events. This event only ensures that non-essential tracking information is not stored at the user unless consent is given.\n\nAlso, \"consent\" and \"event\" rhymes."
        },
        "CommerceEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object"
                }
            ]
        },
        "CartAction": {
            "type": "string",
            "enum": [
                "add",
                "remove",
                "update",
                "clear"
            ]
        },
        "CartUpdatedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/CommerceEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/CartEventData"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "cart_updated",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "Indicates that a shopping cart was updated."
        },
        "CartEventData": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/OrderQuantity"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalUse"
                },
                {
                    "type": "object",
                    "properties": {
                        "action": {
                            "$ref": "urn:tailjs:core#/definitions/CartAction",
                            "description": "The way the cart was modified.",
                            "default": "add"
                        }
                    }
                }
            ]
        },
        "OrderQuantity": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/CommerceData"
                },
                {
                    "type": "object",
                    "properties": {
                        "units": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The number of units.",
                            "default": 1
                        },
                        "item": {
                            "$ref": "urn:tailjs:core#/definitions/ExternalReference",
                            "description": "The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  {@link  UserInteractionEvent }  context."
                        }
                    }
                }
            ],
            "description": "Base information for the amount of an item added to an  {@link  Order }  or cart that is shared between  {@link  CartUpdatedEvent }  and  {@link  OrderLine } ."
        },
        "ExternalUse": {
            "type": "object",
            "description": "Types and interfaces extending this marker interface directly must have a concrete type that can be instantiated in code-generation scenarios because they are referenced directly outside of the types package."
        },
        "OrderEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/CommerceEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Order"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "order",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "An order submitted by a user."
        },
        "Order": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "internalId": {
                            "type": "string",
                            "description": "A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems."
                        },
                        "orderId": {
                            "type": "string",
                            "description": "The order ID as shown to the user."
                        },
                        "items": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/OrderLine"
                            },
                            "description": "Optionally, all the items in the order at the time the order was made."
                        },
                        "discount": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The total discount given for this order including the sum of individual order line discounts"
                        },
                        "delivery": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The delivery cost, if any, and it is not included as an order line."
                        },
                        "vat": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The VAT included in the total."
                        },
                        "total": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The total of the order including VAT, delivery, discounts and any other costs added."
                        },
                        "paymentMethod": {
                            "type": "string",
                            "description": "The payment method selected for the order."
                        },
                        "currency": {
                            "type": "string",
                            "description": "The currency used for the order.\n\nThe order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual)."
                        }
                    },
                    "required": [
                        "orderId"
                    ]
                }
            ],
            "description": "Represents an order for tracking purposes."
        },
        "OrderLine": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/OrderQuantity"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Tagged"
                },
                {
                    "type": "object",
                    "properties": {
                        "lineId": {
                            "type": "string",
                            "description": "An optional identifier that makes it possible to reference this order line directly."
                        },
                        "vat": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The VAT included in the total."
                        },
                        "total": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The total for this order line including VAT"
                        }
                    }
                }
            ]
        },
        "CartAbandonedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/CommerceEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/Order"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "cart_abandoned",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "lastCartEvent": {
                            "$ref": "urn:tailjs:core#/definitions/Timestamp",
                            "description": "The timestamp for the last time the shopping cart was modified by the user before abandonment."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The shopping cart was abandoned. Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented."
        },
        "OrderStatusEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "order": {
                            "type": "string",
                            "description": "A reference to the order that changed status."
                        }
                    },
                    "required": [
                        "order"
                    ]
                }
            ],
            "description": "Base event for events that related to an order changing status."
        },
        "OrderConfirmedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "order_confirmed",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "An order was accepted.\n\nThis may be useful to track if some backend system needs to validate if the order submitted by the user is possible, or just for monitoring whether your site is healthy and actually processes the orders that come in.\n\nThis event should also imply that the user got a confirmation."
        },
        "OrderCancelledEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "order_cancelled",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "cancelledByUser": {
                            "type": "boolean",
                            "description": "Indicates if the user cancelled the order or it happended during a background process.",
                            "default": "false;"
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "An order was cancelled."
        },
        "OrderCompletedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "order_completed",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "An order was cancelled."
        },
        "PaymentEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/CommerceEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "orderReference": {
                            "type": "string",
                            "description": "The reference to order for which payment was made, either  {@link  Order.orderId }  or  {@link  Order.internalId } ."
                        },
                        "amount": {
                            "$ref": "urn:tailjs:core#/definitions/Decimal",
                            "description": "The amount paid."
                        },
                        "paymentMethod": {
                            "type": "string",
                            "description": "A domain specific value for the payment method."
                        },
                        "currency": {
                            "type": "string",
                            "description": "The currency of the payment."
                        }
                    },
                    "required": [
                        "orderReference",
                        "amount"
                    ]
                }
            ],
            "description": "Events related to order payments."
        },
        "PaymentAcceptedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/PaymentEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "payment_accepted",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "finalPayment": {
                            "type": "boolean",
                            "description": "The payment was the final payment, hence completed the order.",
                            "default": "true;"
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The payment for an order was accepted."
        },
        "PaymentRejectedEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/PaymentEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "payment_rejected",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "A payment for the order was rejected."
        },
        "AuthenticationEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object"
                }
            ],
            "description": "Events related to users signing in, out etc.."
        },
        "SignInEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/AuthenticationEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "sign_in",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "userId": {
                            "type": "string",
                            "description": "The user that signed in."
                        },
                        "evidence": {
                            "type": "string",
                            "description": "Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked by abusing the API."
                        }
                    },
                    "required": [
                        "type",
                        "userId",
                        "evidence"
                    ]
                }
            ],
            "description": "A user signed in."
        },
        "SignOutEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/AuthenticationEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "sign_out",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "userId": {
                            "type": "string",
                            "description": "The user that signed out."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "A user actively signed out. (Session expiry doesn't count)."
        },
        "SystemEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "type": "object"
                }
            ],
            "description": "Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics."
        },
        "ImpressionEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/UserInteractionEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "impression",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "impressions": {
                            "$ref": "urn:tailjs:core#/definitions/Integer",
                            "description": "The number of times the component was sufficiently visible  to count as an impression. This counter will increment if the component leaves the user's viewport and then comes back."
                        },
                        "duration": {
                            "$ref": "urn:tailjs:core#/definitions/ViewTimingData",
                            "description": "For how long the component was visible. This counter starts after an impression has been detected."
                        },
                        "regions": {
                            "type": "object",
                            "properties": {
                                "top": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails",
                                    "description": "The top 25 % of the component."
                                },
                                "middle": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails",
                                    "description": "The middle 25 - 75 % of the component."
                                },
                                "bottom": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails",
                                    "description": "The bottom 25 % of the component."
                                }
                            },
                            "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height."
                        },
                        "text": {
                            "type": "object",
                            "properties": {
                                "characters": {
                                    "$ref": "urn:tailjs:core#/definitions/Integer",
                                    "description": "The number of characters in the text (including punctuation)."
                                },
                                "words": {
                                    "$ref": "urn:tailjs:core#/definitions/Integer",
                                    "description": "The number of words in the text."
                                },
                                "sentences": {
                                    "$ref": "urn:tailjs:core#/definitions/Integer",
                                    "description": "The number of sentences."
                                },
                                "readingTime": {
                                    "$ref": "urn:tailjs:core#/definitions/Duration",
                                    "description": "The estimated average duration it will take for a user to read all the text.\n\nThe estimate is assuming \"Silent reading time\" which seems to be 238 words per minute according to [Marc Brysbaert's research] (https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786?via%3Dihub)"
                                }
                            },
                            "description": "The length and number of words in the component's text. This combined with the active time can give an indication of how much the user read if at all."
                        },
                        "seen": {
                            "$ref": "urn:tailjs:core#/definitions/Percentage",
                            "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } ."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The event is triggered when more than 75 % of the component's has been visible for at least 1 second, or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.\n\n\nThis only gets tracked for components that have impression tracking configured,  either via  {@link  TrackingSettings.impressions } , \"track-impressions\" in the containing DOM or \"--track-impressions\" via CSS.\n\nNote that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via  {@link  TrackingSettings.impressions } ."
        },
        "ViewDetails": {
            "type": "object",
            "properties": {
                "seen": {
                    "type": "boolean"
                },
                "duration": {
                    "$ref": "urn:tailjs:core#/definitions/Duration"
                },
                "impressions": {
                    "$ref": "urn:tailjs:core#/definitions/Integer"
                }
            }
        },
        "ResetEvent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/TrackedEvent"
                },
                {
                    "$ref": "urn:tailjs:core#/definitions/SystemEvent"
                },
                {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "const": "reset",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
                        },
                        "includeDevice": {
                            "type": "boolean",
                            "description": "Whether only the session or also the device should be reset.",
                            "default": true
                        },
                        "includeConsent": {
                            "type": "boolean",
                            "description": "Whether to also reset the consent."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "An event that can be used to reset the current session and optionally also device. Intended for debugging and not relayed to backends."
        },
        "ConfiguredComponent": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/Component"
                },
                {
                    "type": "object",
                    "properties": {
                        "track": {
                            "$ref": "urn:tailjs:core#/definitions/TrackingSettings",
                            "description": "Settings for how the component will be tracked.\n\nThese settings are not tracked, that is, this property is stripped from the data sent to the server."
                        }
                    }
                }
            ]
        },
        "TrackingSettings": {
            "type": "object",
            "properties": {
                "promote": {
                    "type": "boolean",
                    "description": "Always include in  {@link  UserInteractionEvent.components } , also if it is a parent component. By default only the closest component will be included.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-promote`. CSS: `--track-promote: 1/yes/true`.",
                    "default": false
                },
                "secondary": {
                    "type": "boolean",
                    "description": "The component will only be tracked with the closest non-secondary component as if the latter had the  {@link  promote }  flag.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-secondary`. \\ CSS: `--track-secondary: 1/yes/true`.",
                    "default": false
                },
                "region": {
                    "type": "boolean",
                    "description": "Track the visible region occupied by the component or content.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-region`. \\ CSS: `--track-region: 1/yes/true`.",
                    "default": false
                },
                "clicks": {
                    "type": "boolean",
                    "description": "Track clicks. Note that clicks are always tracked if they cause navigation.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-clicks`. CSS: `--track-clicks: 1/yes/true`.",
                    "default": "true unless in a `<nav>` tag"
                },
                "impressions": {
                    "type": "boolean",
                    "description": "Track impressions, that is, when the component becomes visible in the user's browser for the first time. This goes well with  {@link  region } .\n\nNot inherited by child components.\n\nHTML attribute: `track-impressions`. CSS: `--track-impressions: 1/yes/true`.",
                    "default": false
                }
            }
        }
    },
    "x-privacy-class": "anonymous",
    "x-privacy-purpose": "necessary"
};

const scripts$1 = {
    main: {
        text: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,A,I,E,T,x,N,O,C,j,M,_=\"@info\",U=\"@consent\",$=\"_tail:\",F=$+\"state\",q=$+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>K(t,[e,r])},K=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:L,en=(e,t)=>eS(t)?e!==L?t(e):L:e?.[t]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?L:!t&&ev(e)?e:eA(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,ey=Object.prototype,em=Object.getPrototypeOf,eb=e=>null!=e&&em(e)===ey,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eA=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eI=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==L?(e=eO(e),t??=0,r??=H,(n,a)=>t--?L:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),eM=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===L?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):eM(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),e_=(e,t)=>t&&!ev(e)?[...e]:e,eU=(e,t,r,n)=>eM(e,t,r,n),e$=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?eM(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(eM(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,t,r,n)):L},eq=(e,t,r,n)=>null!=e?new Set([...eU(e,t,r,n)]):L,eP=(e,t,r=1,n=!1,a,i)=>eh(e$(e,t,r,n,a,i)),eR=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?L:eA(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===L){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of eM(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eK=async(e,t,r,n)=>{var a;if(null==e)return L;for(var i of eU(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,t,r)=>{if(null==e)return L;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>e_(eM(e,(e,r)=>t(e,r)?e:L,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return L;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?L:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,L,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eA(e)?eF(e,eI(e)?e=>e:eE(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):L,e1=(e,t,r,n)=>null==e?L:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):L,r,n)),e2=(e,t,r,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:L,r,n),e4=(e,t,r,n)=>null==e?L:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e3=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e5=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e3(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e3),te=e9((e,t,r)=>e3(e,t,eS(r)?r(e5(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e5(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e5(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e5(e,t),i+1,e,t))):a(e5(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eL(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eE(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eI(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(y.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await K(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),y.busy=!1,!0},p=()=>u=(l?requestAnimationFrame:setTimeout)(h,t<0?-t:t),h=()=>{y.active&&v(),y.active&&p()},g=(e,t=!e)=>(f(e,t),(l?cancelAnimationFrame:clearTimeout)(u),y.active=!!(u=e?p():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(g(!0),y.trigger(),y):g(!0):g(!1):y,trigger:async e=>await v(e)&&(g(y.active),!0)};return y.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ty,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class ty{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var tm=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new ty,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tA=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tI=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):L,tE=(e,t=\"'\")=>null==e?L:t+e+t,tT=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tx=(e,t,r)=>null==e?L:eS(t)?tI(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tI(eF(e,e=>!1===e?L:e),t??\"\"),tN=e=>(e=Math.log2(e))===(0|e),tO=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):L,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,L):(e??0)|r,(p=!1,L)):v(e),(e,t)=>null==(e=h(e,!1))?L:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tN(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],y=(e,t)=>null==e?L:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&tN(e));return ti(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tI(eF(eh(e),e=>tE(e)),[t])}`},t&&{pure:m,map:(e,t)=>(e=y(e),m.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tC=(...e)=>{var t=e0(eL(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=L;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tj=Symbol(),tM=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:L)||(n[1]?[n[1]]:[]),n},t_=(e,t=!0,r)=>null==e?L:tP(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===t?f:tU(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),tU=(e,t,r=!0)=>t$(e,\"&\",t,r),t$=(e,t,r,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tM(e,!1===r?[]:!0===r?L:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tj]=a),i},tF=(e,t)=>t&&null!=e?t.test(e):L,tq=(e,t,r)=>tP(e,t,r,!0),tP=(r,n,a,i=!1)=>(r??n)==null?L:a?(e=L,i?(t=[],tP(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tR=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tz=/\\z./g,tD=(e,t)=>(t=tx(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tz,tW={},tB=e=>e instanceof RegExp,tJ=(e,t=[\",\",\" \"])=>tB(e)?e:ev(e)?tD(eF(e,e=>tJ(e,t)?.source)):ea(e)?e?/./g:tz:ef(e)?tW[e]??=tP(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tD(eF(tV(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tx(t,tR)}]`)),e=>e&&`^${tx(tV(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tR(tK(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,tV=(e,t)=>e?.split(t)??e,tK=(e,t,r)=>e?.replace(t,r)??e,tG=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):void 0,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tL=5e3,tH=()=>()=>P(\"Not initialized.\"),tX=window,tY=document,tZ=tY.body,tQ=(e,t)=>!!e?.matches(t),t0=H,t1=(e,t,r=(e,t)=>t>=t0)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t2=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>na(e),Z);case\"e\":return W(()=>no?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t2(e,t[0])):void 0}},t4=(e,t,r)=>t2(e?.getAttribute(t),r),t6=(e,t,r)=>t1(e,(e,n)=>n(t4(e,t,r))),t3=(e,t)=>t4(e,t)?.trim()?.toLowerCase(),t5=e=>e?.getAttributeNames(),t8=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,t9=e=>null!=e?e.tagName:null,t7=()=>({x:(r=re(X)).x/(tZ.offsetWidth-window.innerWidth)||0,y:r.y/(tZ.offsetHeight-window.innerHeight)||0}),re=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),rt=(e,t)=>tK(e,/#.*$/,\"\")===tK(t,/#.*$/,\"\"),rr=(e,t,r=Y)=>(n=rn(e,t))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/tZ.offsetWidth,4),y:eT(n.y/tZ.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),rn=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ra(e),{x:a,y:i}):void 0,ra=e=>e?(o=e.getBoundingClientRect(),r=re(X),{x:eT(o.left+r.x),y:eT(o.top+r.y),width:eT(o.width),height:eT(o.height)}):void 0,ri=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),ro=e=>{var{host:t,scheme:r,port:n}=t_(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rs=()=>({...r=re(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:tZ.offsetWidth,totalHeight:tZ.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var rl=tO(s,!1,\"data classification\"),ru=(e,t)=>rl.parse(e?.classification??e?.level)===rl.parse(t?.classification??t?.level)&&rf.parse(e?.purposes??e?.purposes)===rf.parse(t?.purposes??t?.purposes),rc=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rl.parse(e.classification??e.level??t?.classification??0),purposes:rf.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var rf=tO(l,!0,\"data purpose\",2111),rd=tO(l,!1,\"data purpose\",0),rv=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rp=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rh=tO(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rg=e=>`'${e.key}' in ${rh.format(e.scope)} scope`,ry={scope:rh,purpose:rd,purposes:rf,classification:rl};tC(ry),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tO(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tO(d,!1,\"variable set status\");var rm=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rS)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rw)),values:o(e=>eF(e,e=>rw(e)?.value)),push:()=>(i=e=>(r?.(eF(rb(e))),e),s),value:o(e=>rw(e[0])?.value),variable:o(e=>rw(e[0])),result:o(e=>e[0])};return s},rb=e=>e?.map(e=>e?.status<400?e:L),rw=e=>rk(e)?e.current??e:L,rk=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rS=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rg(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rA=e=>rS(e,L,!0),rI=e=>e&&\"string\"==typeof e.type,rE=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rT=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rx=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rN=(e,t=\"\",r=new Map)=>{if(e)return eA(e)?eV(e,e=>rN(e,t,r)):ef(e)?tP(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rT(n)+\"::\":\"\")+t+rT(a),value:rT(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rx(r,u)}):rx(r,e),r},rO=new WeakMap,rC=e=>rO.get(e),rj=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rM=(e,t,r,n,a,i)=>t?.[1]&&eV(t5(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tF(o,t)&&(i=void 0,!r||tQ(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rN(a,tK(n,/\\-/g,\":\"),r),i)),r_=()=>{},rU=(e,t)=>{if(h===(h=rD.tags))return r_(e,t);var r=e=>e?tB(e)?[[e]]:eA(e)?eP(e,r):[eb(e)?[tJ(e.match),e.selector,e.prefix]:[tJ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(r_=(e,t)=>rM(e,n,t))(e,t)},r$=(e,t)=>tx(eR(t8(e,rj(t,Y)),t8(e,rj(\"base-\"+t,Y))),\" \"),rF={},rq=(e,t,r=r$(e,\"attributes\"))=>{r&&rM(e,rF[r]??=[{},tq(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tJ(r||n),,t])],t),rN(r$(e,\"tags\"),void 0,t)},rP=(e,t,r=X,n)=>(r?t1(e,(e,r)=>r(rP(e,t,X)),eS(r)?r:void 0):tx(eR(t4(e,rj(t)),t8(e,rj(t,Y))),\" \"))??(n&&(g=rC(e))&&n(g))??null,rR=(e,t,r=X,n)=>\"\"===(y=rP(e,t,r,n))||(null==y?y:ei(y)),rz=(e,t,r,n)=>e?(rq(e,n??=new Map),t1(e,e=>{rU(e,n),rN(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rD={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rW=[],rB=[],rJ=(e,t=0)=>e.charCodeAt(t),rV=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rW[rB[t]=e.charCodeAt(0)]=t);var rK=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rB[(16515072&t)>>18],rB[(258048&t)>>12],rB[(4032&t)>>6],rB[63&t]);return a.length+=n-r,rV(a)},rG=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rW[rJ(e,r++)]<<2|(t=rW[rJ(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rW[rJ(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rW[rJ(e,r++)]));return i},rL={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rH=(e=256)=>e*Math.random()|0,rX=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rH()));for(r=0,i[n++]=g(f^16*rH(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rH();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rL[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},rY={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rY);var{deserialize:rZ,serialize:rQ}=(C=rY.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r0=\"$ref\",r1=(e,t,r)=>ek(e)?L:r?t!==L:null===t||t,r2=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r1(t,n,r)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r0]||(e[r0]=o,l(()=>delete e[r0])),{[r0]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eA(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?rQ(u(e)??null):W(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},r4=e=>{var t,r,n=e=>eg(e)?e[r0]&&(r=(t??=[])[e[r0]])?r:(e[r0]&&(t[e[r0]]=e,delete e[r0]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>rZ(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},r6=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r2(e,!1,r))):r2(e,!0,r),n);if(t)return[e=>r2(e,!1,r),e=>null==e?L:W(()=>r4(e),L),(e,t)=>n(e,t)];var[a,i,o]=rX(e);return[(e,t)=>(t?Q:rK)(a(r2(e,!0,r))),e=>null!=e?r4(i(e instanceof Uint8Array?e:rG(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(m??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r6(),r6(null,{json:!0,prettify:!0});var r3=tV(\"\"+tY.currentScript.src,\"#\"),r5=tV(\"\"+(r3[1]||\"\"),\";\"),r8=r3[0],r9=r5[1]||t_(r8,!1)?.host,r7=e=>!!(r9&&t_(e,!1)?.host?.endsWith(r9)===Y),ne=(...e)=>tK(tx(e),/(^(?=\\?))|(^\\.(?=\\/))/,r8.split(\"?\")[0]),nt=ne(\"?\",\"var\"),nr=ne(\"?\",\"mnt\");ne(\"?\",\"usr\");var[nn,na]=r6(),[ni,no]=[tH,tH],[ns,nl]=tA(),nu=e=>{no===tH&&([ni,no]=r6(e),nl(ni,no))},nc=e=>t=>nf(e,t),nf=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nd,nv]=tA(),[np,nh]=tA(),ng=e=>nm!==(nm=e)&&nv(nm=!1,nk(!0,!0)),ny=e=>nb!==(nb=!!e&&\"visible\"===document.visibilityState)&&nh(nb,!e,nw(!0,!0));nd(ny);var nm=!0,nb=!1,nw=tv(!1),nk=tv(!1);ri(window,[\"pagehide\",\"freeze\"],()=>ng(!1)),ri(window,[\"pageshow\",\"resume\"],()=>ng(!0)),ri(document,\"visibilitychange\",()=>(ny(!0),nb&&ng(!0))),nv(nm,nk(!0,!0));var nS=!1,nA=tv(!1),[nI,nE]=tA(),nT=th({callback:()=>nS&&nE(nS=!1,nA(!1)),frequency:2e4,once:!0,paused:!0}),nx=()=>!nS&&(nE(nS=!0,nA(!0)),nT.restart());ri(window,\"focus\",nx),ri(window,\"blur\",()=>nT.trigger()),ri(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nx),nx(),(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nN=tO(b,!1,\"local variable scope\"),nO=e=>nN.tryParse(e)??rh(e),nC=e=>!!nN.tryParse(e?.scope),nj=tC({scope:nN},ry),nM=e=>null==e?void 0:ef(e)?e:e.source?nM(e.source):`${nO(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,n_=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nU=0,n$=void 0,nF=()=>(n$??tH())+\"_\"+nq(),nq=()=>(td(!0)-(parseInt(n$.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nU).toString(36),nP=e=>crypto.getRandomValues(e),nR=()=>tK(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nP(new Uint8Array(1))[0]&15>>e/4).toString(16)),nz={},nD={id:n$,heartbeat:td()},nW={knownTabs:{[n$]:nD},variables:{}},[nB,nJ]=tA(),[nV,nK]=tA(),nG=tH,nL=e=>nz[nM(e)],nH=(...e)=>nY(e.map(e=>(e.cache=[td(),3e3],nj(e)))),nX=e=>eF(e,e=>e&&[e,nz[nM(e)]]),nY=e=>{var t=eF(e,e=>e&&[nM(e),e]);if(t?.length){var r=nX(e);e7(nz,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nW.variables,n),nG({type:\"patch\",payload:eL(n)})),nK(r,nz,!0)}};ns((e,t)=>{nd(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),n$=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nz=eL(eR(eX(nz,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nM(e),e])))}else sessionStorage.setItem(F,e([n$,eF(nz,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nG=(t,r)=>{e&&(localStorage.setItem(F,e([n$,t,r])),localStorage.removeItem(F))},ri(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===n$)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||nG({type:\"set\",payload:nW},a);else if(\"set\"===i&&r.active)e7(nW,o),e7(nz,o.variables),r.trigger();else if(\"patch\"===i){var s=nX(eF(o,1));e7(nW.variables,o),e7(nz,o),nK(s,nz,!1)}else\"tab\"===i&&(e7(nW.knownTabs,a,o),o&&nJ(\"tab\",o,!1))}}});var r=th(()=>nJ(\"ready\",nW,!0),-25),n=th({callback(){var e=td()-1e4;eV(nW?.knownTabs,([t,r])=>r[0]<e&&tn(nW.knownTabs,t)),nD.heartbeat=td(),nG({type:\"tab\",payload:nD})},frequency:5e3,paused:!0}),a=e=>{nG({type:\"tab\",payload:e?nD:void 0}),e?(r.restart(),nG({type:\"query\"})):r.toggle(!1),n.toggle(e)};nd(e=>a(e),!0)},!0);var[nZ,nQ]=tA(),[n0,n1]=tA(),n2=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?no:na)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?ni:nn)([n$,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===n$))return t>0&&(i=setInterval(()=>o(),t/2)),await K(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ri(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})($+\"rq\"),n4=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),nQ(e,a,r,e=>(o=a===L,a=e)),!o&&(i=n?ni(a,!0):JSON.stringify(a)))};if(!r)return await n2(()=>eK(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?no:JSON.parse)?.(o):L;return null!=l&&n1(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},n6=[\"scope\",\"key\",\"targetId\",\"version\"],n3=[...n6,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n5=[...n6,\"init\",\"purpose\",\"refresh\"],n8=[...n3,\"value\",\"force\",\"patch\"],n9=new Map,n7=(e,t)=>{var r=th(async()=>{var e=eF(n9,([e,t])=>({...n_(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e5(n9,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nM(e),i=ta(n9,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nd((e,t)=>r.toggle(e,e&&t>=3e3),!0),nV(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rm(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await n4(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nM(e);n(r,e.result);var a=nL(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nC(e))return[to(e,n5),t];else if(eb(e.init)){var u={...nj(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rf.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&nY(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rm(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nM(e),n=nL(r);if(o(r,e.cache),nC(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nN(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,n8),t]}}),f=u.length?D((await n4(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nY(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,n3),cache:[t,t+(ta(i,nM(e))??3e3)]});return n0(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rw(e)),eF(e.set,e=>rw(e)));r?.length&&nY(eB(r,c,t))}}),u},ae=(e,t,r=tL)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),n4(e,{events:r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rv(tl(e),!0),{timestamp:e.timestamp-td()}))),variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),np((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},at=Symbol(),ar=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[at]?.(e)),{threshold:eF(100,e=>e/100)});return(e,r)=>{var n,a;if(r&&(n=eX(r?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))){if(!eY(n))return;tG(),tp(rD.impressionThreshold),aw(),e[at]=({isIntersecting:t,boundingClientRect:r,intersectionRect:n})=>{a||(e.style.border=\"1px solid blue\",e.style.position=\"relative\",(a=document.createElement(\"div\")).style.cssText=\"position:absolute;top:0;left:0;width:200px;height:100px;background-color:blue\",e.appendChild(a)),a.innerText=n.top+\"\"},t.observe(e)}}},an=()=>{var e=tX?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tX.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tX.devicePixelRatio,width:t,height:r,landscape:a}}},aa=e=>tu(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>G({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...an()})),ai=(e,t=\"A\"===t9(e)&&t4(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ao=(e,t=t9(e),r=rR(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t3(e,\"type\"),\"button\",\"submit\")||r===Y),as=(e,t=!1)=>({tagName:e.tagName,text:tT(t4(e,\"title\")?.trim()||t4(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ra(e):void 0}),al=(e,t,r=!1)=>{var n;return t1(e??t,e=>\"IMG\"===t9(e)||e===t?(n={element:as(e,r)},X):Y),n},au=e=>{if(w)return w;ef(e)&&([t,e]=na(e),e=r6(t)[1](e)),e7(rD,e),nu(ta(rD,\"encryptionKey\"));var t,r=ta(rD,\"key\"),n=tX[rD.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rD.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nc(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nF(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=n7(nt,l),c=ae(nt,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tX,rD.name,{value:w=Object.freeze({id:\"tracker_\"+nF(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):na(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?na(e):e),e=>{if(!e)return X;if(az(e))rD.tags=e7({},rD.tags,e.tagAttributes);else if(aD(e))return rD.disabled=e.disable,X;else if(aJ(e))return n=Y,X;else if(aX(e))return e(w),X;return p||aK(e)||aB(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aB(e)?-100:aK(e)?-50:aH(e)?-10:rI(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rI(t))c.post(t);else if(aV(t))u.get(...eh(t.get));else if(aH(t))u.set(...eh(t.set));else if(aK(t))tu(i,t.listener);else if(aB(t))(e=W(()=>t.extension.setup(w),e=>nf(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(aX(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nf(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nf(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),nB(async(e,t,r,a)=>{if(\"ready\"===e){var i=rA((await u.get({scope:\"session\",key:_,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(aa(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aF,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ac=()=>k?.clientId,af={scope:\"shared\",key:\"referrer\"},ad=(e,t)=>{w.variables.set({...af,value:[ac(),e]}),t&&w.variables.get({scope:af.scope,key:af.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},av=tv(),ap=tv(),ah=tv(),ag=1,ay=()=>ap(),[am,ab]=tA(),aw=e=>{var t=tv(e,av),r=tv(e,ap),n=tv(e,ah),a=tv(e,()=>ag);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),interactiveTime:n(e,i),activations:a(e,i)})},ak=aw(),aS=()=>ak(),[aA,aI]=tA(),aE=(e,t)=>(t&&eV(ax,t=>e(t,()=>!1)),aA(e)),aT=new WeakSet,ax=document.getElementsByTagName(\"iframe\"),aN=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aO(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aC=e=>rz(e,void 0,e=>eF(eh(e5(rO,e)?.tags))),aj=e=>e?.component||e?.content,aM=e=>rz(e,t=>t!==e&&!!aj(e5(rO,t)),e=>(A=e5(rO,e),(A=e5(rO,e))&&eP(eR(A.component,A.content,A),\"tags\"))),a_=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eF(I,e=>({...e,rect:void 0}))},aU=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t1(e,e=>{var a=e5(rO,e);if(a){if(aj(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ra(e)||void 0;var u=aM(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),a_({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rP(e,\"area\");c&&tc(s,...eF(c))}}),o.length&&tu(s,a_({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tx(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tx(a,\"/\")}:void 0},a$=Symbol();M={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tY.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=M[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aF=[{id:\"context\",setup(e){th(()=>eV(ax,e=>tt(aT,e)&&aI(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=nL({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nL({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nH({scope:\"tab\",key:\"tabIndex\",value:n=nL({scope:\"shared\",key:\"tabIndex\"})?.value??nL({scope:\"session\",key:_})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rt(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=t_(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nF(),tab:n$,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rs(),duration:ak(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),nH({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tU(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tK(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nL(af)?.value;c&&r7(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...af,value:void 0}))}var c=document.referrer||null;c&&!r7(c)&&(k.externalReferrer={href:c,domain:ro(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aS()})),ab(k)}};return nI(e=>ah(e)),np(e=>{e?(ap(Y),++ag):(ap(X),ah(X))}),ri(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aR(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rE(e)||rp(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ar(),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rO,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e5(rO,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>aW(e)?(n(e),Y):aL(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=t4(a,e);){tt(n,a);var o=tV(t4(a,e),\"|\");t4(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ri(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t1(n.target,e=>{ao(e)&&(o??=e),u=u||\"NAV\"===t9(e);var t=rC(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>ao(t)&&((l??=[]).length>3?eN():l.push({...as(t,!0),component:t1(t,(e,t,r,n=rC(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rR(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rR(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aU(s,!1,f),v=aC(s);a??=!u;var p={...(i??=Y)?{pos:rr(o,n),viewport:rs()}:null,...al(n.target,s),...d,timeOffset:aS(),...v};if(!o){f&&te(t,s,r=>{var a=rn(s,n);if(r)tu(r,a);else{var i=G({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e5(t,s)}),!0,s)}return r});return}if(ai(o)){var h=o.hostname!==location.hostname,{host:g,scheme:y,source:m}=t_(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,G({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=G({clientId:nF(),type:\"navigation\",href:h?o.href:m,external:h,domain:{host:g,scheme:y},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=r7(w);if(k){ad(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rD.captureContextMenu)return;o.href=nr+\"=\"+S+encodeURIComponent(w),ri(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ri(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t4(o,\"target\")!==window.name?(ad(b.clientId),b.self=X,tu(e,b)):rt(location.href,o.href)||(b.exit=b.external,ad(b.clientId)));return}var A=(t1(n.target,(e,t)=>!!(c??=aN(rC(e)?.cart??rP(e,\"cart\")))&&!c.item&&(c.item=e2(rC(e)?.content))&&t(c)),aO(c));(A||a)&&tu(e,A?G({type:\"cart_updated\",...p,...A}):G({type:\"component_click\",...p}))}})};r(document),aE(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=re(Y);am(()=>tm(()=>(t={},r=re(Y)),250)),ri(window,\"scroll\",()=>{var n=re(),a=t7();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aP(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aO(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return aG(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t6(i,rj(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ra(i).width,u=e5(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t6(i,rj(\"form-name\"))||t4(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aS()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ri(i,\"submit\",()=>{a=aU(i),t[3]=3,u(()=>{i.isConnected&&ra(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e5(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rR(e,\"ref\"))&&(e.value||(e.value=nR()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tK(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[a$]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=ay())),u=-(l-(l=td(Y))),c=t[a$];(t[a$]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ri(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=ay()):o()));u(document),aE(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:U,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||ru(n,r=rc(r)))return[!1,n];var a={level:rl.lookup(r.classification),purposes:rf.lookup(r.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(aY(e)){var a=e.consent.get;a&&t(a);var i=rc(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tY.hasFocus()){var e=o.poll();if(e){var t=rc({...s,...e});t&&!ru(s,t)&&(await r(t),s=t)}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aq=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aP=aq(\"cart\"),aR=aq(\"username\"),az=aq(\"tagAttributes\"),aD=aq(\"disable\"),aW=aq(\"boundary\"),aB=aq(\"extension\"),aJ=aq(Y,\"flush\"),aV=aq(\"get\"),aK=aq(\"listener\"),aG=aq(\"order\"),aL=aq(\"scan\"),aH=aq(\"set\"),aX=e=>\"function\"==typeof e,aY=aq(\"consent\");Object.defineProperty(tX,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(au)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqW9-XrbRtI3-v93FRLGowHMFkVSiyXQMF7HS-JEXmLZiT00bUNkU4JFAQoAagnJeb6rORd2ruTUr6obCyVn8j5nJhaB7kav1dW1t-t6waO5M8v1Wl5k8ahw-pdRtqZVoTKVqEjFKlW5mqqZGqmJGqtLdaFO1Ym6UefqWF2pM3WkHqsX6pl6p67VK_VaPVHf1Ev1JXD-J04mqaPe09MoTXKdFI66Fzhfiiie-o56HtxrOXkRFdpRf-D5YpafOupN4FLrgQ4ePcuyNHO1hx4Wp1l6taYnrg6KHGlhQX99vVRvubzKgs0uCsYoEgTFYuHqMCy8IEhm06mX6WKWJeudPvJP6NONDfop8NOe6uSkOMVH5tGbYw6SoNOfUAfwHK3FyZr2uPZBNFynsvSzsbH-lt8V3lRGPbANdfutVrKUF6opCF4ff9Ojon2mb3Jq1jS0tKWX6k8ZRrvdzmgYZgiZKfeos7GRtfP0XLtF8OhPlPQ89ZQ_odIY4XqgQ-2_cYswdB6vZfqPWZzp8dplNJ3ptThfO4_zPE5OHEUT--7mQpvJbWf6YhqNtOtQy45yUNR-3HY8auV3WY_1jsp4IbKbuRmWdr3lKCpGpzSdZdoRjS7UF1gnXqY3vEy-jpAOMEinuq258cJken6xnMRJNJ1S1WGbal2qHwAAvAxYWgBp1o6TuIijafynHi8WRVj4NBkCDO3iVCchvfEDtf3IbRTn3tNQqfFLeiPo8jz_r4t4fTOibKl-rjoTzGvf-PQNGvR_c9FDt1itUHrnLW1dxVL9VqvrB8o1WTTHmN5f3EIN6HHoLdUvQZTfJKNbsy-wGV1FcbHGDdja9SXmuBh0hjSJiecn1eoAbrEC_FR4Zjf1m-uhvaWe5poLX9rC68WgOyw_sOOgNBTnrWG7Qo1SX-gTbBba18lIp5M1hjPzfWS_j5blgsvHdtl_xOxodRhcpvF4raN-Cl7Nzo911n75-MOXo8fPn3158erdsx-fvVUfgvWu-oiJ-TeDx3ypfpWPtcav2RNKF8HRzflxOm3Hhc6iIs2UzuzGcQnHURXYcG7mhZlfbGwk9B9_m9kHNyNYzjzkHyqd2I8NqBMuOBRkdOjrsD0ohpyiUTZCT5zjlOY4Shza0rTxaE6oV3GgacIj7MYOdXNjw-0GgV4snElES-BQFUhzimym6TvkHGIz6hQ1rq9TDTmPlvI-Kj3lZ_rog9IzO2VxfhRN9Iuk0CeaBj3iviSc1-jKhDOA_Qk91DPG3McJ-kgDK9IjLuKiG5fB4yyLbqgN_lX6gntwa-GVPjXoo2vwFI0lPPTXaaIJxjTNn68f43dA-EcP_YEeKn1SLSCmwUkZdzb6dmMR6kWWFinSlT63aSe6eGOTX1P_j2sAQe2eU3uYU-r2lV1MZzJLRkWc1leJF1PpM5kfBqJGH444444PlX5cG_X6uouqdDHEit4aC6EyzOiLWxP4MrpQ-tmt5CNdKP2ujvrNlHZxZtB8voyK03aWzpKxq-8TiuT3i_TK7RJCoiOrg9OLsGeHAGqL6rrGTtKv0JCLl47S1J_Xds6kdgJ2Xiw6fgpeoyfm2GW8F4aZx1BPqFe_ppKKkgLCWfT3J-USHUHFis1Nqiijv3RScZqf-Bnhf6W_BQJjk3haAObQgZemAZXUhjkY1kHnGx8fmNnQrsJ9nhcgLrPeBuPNC3SMsDpQVlY72ZM1LIJXfuAmtNkTlbVaHhEH7k2sp-O1hPpz7c15qvrHmY7Olowq11ZqkSqS2nfLJTB7wDjC109cGRD1GjTIaq-_30ehPgTdDhKlB8lwCFRLc-FG1OFIOqykA1HZgeiOjqNH9Z68dGVxG52hPn8H83pzdEsaKsqGcF5ubpYYk0aCA6TvmVyeBWrOrzVC8CErpR92vAnTA2GwqTe7fd1qlV9ubvbLmWag6mtKsrmtFtdM8EYD_WI3BaBcQMRgFRrw-zo4YczmRel7loDs4jDoguYFUJc9JTrHEMM1uJKeF4C9xSIxxKRnFywGOEQhNVMQceN1aW9kIXf5vnZjEIpUHZ07vgwjliHauVp6rukgukIry6W71NXn9UFwBwRiFI_WAkhHxcFgyNCTBdnDTmhJ3Fbm047s0DCTemriJ2H51s8eJpi-6z4gimukM2eQDfs0_SmBWqoiyvBT2vCYio2NuA3C3U09S-4KRolL6tdSp0SJvC_7T8flUuk_Vjc5Cib6CljO5cWrvhh6OFLf3LlaqPueW-NagFKJM0ANnqW3SjrpNxy2gR1xqIliAojUzggGtcHQk6GhllOm5BRRcPrPxirwnNOMd_5_TDjPdYWzaLbNvsajiikzDCPs5OZWLqkppUtegPsDsqbOvDRRHNBDxkgj4Zqz79ZMtK_-_S9rZsRENaO-AXWR-KBhvdrv1fpDg92pnTNMDOjnLq8HTYAUoV1kH5X--fb891cQvuwHu95_luX73FXCxoaVo-1blnrK40SJ24d0Weh3LrRsbPQaNjEnQMzLF3s1eldpovx_VrpG1d85ApoG29hhv9lMbfNUx1VsyO_YM21-b9YBJT9aCmmSpefPEqLndK70YXWUz-_qhWUeiB-1nPF8WdtMhIDp4Ocz3nSKmT9K8MoDQRPHENCxMcBmI_IBTAV6bBICTvBBBaA-ImOYHqBEi2VcW7S-MfkrHCu3i9crxoxRsRI__egygBWh4bqIZSzkGOlKVWDHumDclP4pqNCKXayYOQ46NcEzuJ6flZPxMxWm_7CszDQoPIdh7Hr8PT9RpR9KGYdlU7KAQda0or_ICWD6J51jlgL56Kj-GPw9EGLqh6iyD1ycECZvA8vnmdWJKmRIeCkn9rXcPFzremOn1EUZekWUwcePTAP1q9XCmDs04n8Hsn-bNKseYbczgXoeXdsSvv7JjB3DDcBshsxxMgVRwxeLBVUQERhFtPoRofBDVQx6kMZsE1joXyu4FoRyzLiF3qgyXmfOVbrDTBUvAJ3kNQz0wn7g62fmkbjzdTouDE4cEP08tNScmRct-4o5QqW7d5Gxh351cv9crfM6S60CWW5q7ZXUwTte6d7dNXG3aSYm3MGBXchNDHGl7hocCemz850qj3km1ovwzqV-1PE1C6OIaadzUqe0xtxUuaHW16Upms1XLugc3i_8yI2FIViOvXIX4IwGk5SnWeFWQO9tMt_N_Mh2jd_QbQguiDceETtfytZoDpjmE9FBAJJrrKe60Gua-Dgff4LMr-XqtuSXD6DWGp-0c12E_BckIK1zOxqPQ3xJvyhd_1IaYIDabWJUcybd2WvBkNSd8oihavqCZTU42ZD_SmOnUR7yX9ueRTzlqO6QXlA9FabCkmxz5xJgRNqZ-7Wd6RL2LWhJHvGvS9CdDTGGskoXoEHtoppjVKr3-Z0nh8fvLc2CHTBDWcOcjIka_SVkHVbEtY_Waf6o9UuuGjmEw-kPnw3IdAdUdsjyGnMSgvSnUTwI9IGrt-lN46na-DJYOwN6V2SnPsCqKEpRzgqDTaBUT_mdjlFKDdft3GMiDAgwGW-qhbjigeBZAvSiFDNh6CKNluNJTlFC-fJZeXpc0asjAOV434NKldGqFUlt1Uxtg6GhiJHFYvsK_FBiSpg0Jq6xJuje7IY011MvdCEGU9M2ERzPotEppMyZHLFFJjOGOaulTCFA_e63kZ1ool1po_P3vkmc2kR6WNcfGdOkGxtF5KLHxDCXRBMVpmlMQiKiCQxo0FF9QiuajMWerkXfFkl1w6LEJ8wUbkLQ7NFBc4EuFpGBBEEaxcOKHWjnF9N4BAjremANBFh9MxPUj_j25LvFykFceE05Km0XSGbppbD1d71yzmircO1cwkzAko4-kTLQ8fwccoGoLF9uTYOgx3oSJ_pNll7orLhhEJwTtpnEJ7MsOp5qH_g2mZ1r89ZRV1lc2BwaSoI_vKUhpCKE4xBlny0WDisQ-AXyT95HdDJYxUQ4p6J-tvTnXI6elvUlLFYGCNRA85fW54_mxmKDim65Taa69DaNipe0esAQJ4whGE9kdkkFELo1-A4HmFGiNvEzHPpF6ppnbp7xCo5w2lb0tHJ-G1gpp3qAbS0HBw4HqQuYD5UQXgKvRtWUQqySuGNal4YtElsRpLmQexVTOQFZc2XgkMAPrYL5mSITOiXfijGOTZFDnOuiJ2CKhIpmXJS6MkfZpSFYLCtdVCxVVSuEZy9sKUxsVYqJZ1TL5LOpWXOfZ7XFoyPbMsi014tRM2uW5KfxpLC5k-buZeUCdoUlNWkcWk4-w8ODy5CdU-PlfjNDT4emppSVcUSFmV2WBanRXLhpUFC-4lxbQ3-Q0rQFqewsoh9TII2RmwDw04A_3wSjSB8FqXIj4jdoHqiXSAB8qygcxCqyeAHYeBw4s0T24NhZt1wj7UUC_3McIhCMfuRZYWKXiABiAYux-4GWoVasXcTn-nUWn8RJq56cpFcEME-jgh9VcQkWC_olZkSoHq_On7f0_YIYDqLErXIpJg4jZX0H0XdRK9hMWiznBFZWKTOOhGmpTuYiJYcAm0Z2gZY6XqWLo_pdrI1u7F3aFpFVfa5n_dFUR9k7Gks6K5jIjYhMDyF3iCEHmfo691zW-RDw0R72M6Pw8amHEQ2LKC77OUaYEOUIURi-3oz9uKZSS6iTRsfQqdCx7LL5BKpMnYxu_EKNoun0OBqd-dgcak7phK_46LqIZrke-xEOT9r6Jyc682O8pDT3foqn8uPcKpuyaOJPl0HWL4KsXbZDzA5D8Iy4oFFQXIHitUpFWpJJUFy668TBjYMJvV6KLGBNy1SuzxaLdSLgRu0LnYzj5MQI63WlVKZSN-3jWX6DfptMCAn65Td9T-QBo5KqWCxG6IIGTLiS-QvPau6iE5vjlsvdoSWnkSJjXaMTZbehLFnvEvvwMOgsFtgvJy7EkbYnXerJUl3wzBB2mIY8G3nxOInPI4hQn2fRufarNfXcU1VgKQs6kNWpTOlNOxoV8SU1femibvt2AY75xOhTmFGYCGlBDY2wO6Yr7dSBz3NnVV3B-ro7ow1ANfoE7jf0XzCXLJyCGAx-adxFlBW-4UPAqRHppnJC_GGuTlyeeZCP6ckJnZ-WhKS1sA2FmpC0e8Lszk3bgBQG5fmc6PP8-TcltJVgIMsjlAxVYCtkKrMEeaqSmyZIok2xpN0W5flacTL_ckHnZZyLXtcwGi4RHKdxbiFgSee1GAW4pc6e8-23bc7kYqIV_k4xzuRiBvC-V9BkLy04Gb3Y3YVrhWiCKYs-w6H8376yZcqPeLB3lg5w2hU3UjCPT5JoWrNfsHMlvZDqyt3Dn4iFAVQXd_alzF4uzbrcVOtiKu5Lh_s81X2eyb6ZJtrXK6vH5jj920N4I8-uawkpTWQPEyyVbtvg6HX-2rQgSgyv1vm-aOcrqxDH1L0WTTMdjW_WrFnElnScTUOW9eGXve_yJA2K0OFhOb4hIOnohNh1sSA6yc3MVBKvqAb1GbfTjUaGgf5fzDWfTufVOVA86oS1QwSF_Ks4GadXbcb8L-NRlhZRfsaLfLyiTl0s4vw5bDkAA8T2ET9IuC8smO-uTz6RorVWRLIL2Z9bmmewcpfO2Tfu1xcJzQWdcsTMRTdr9-Z62f5KjV-J8pPB8sS30HlWKi_eWCiHmU5JHdboSOCio5rEQYQHwglaaowf-AhlbJsQtgLf1gWeod4yglFpI6-DvMLkWdyT0jYg6icFO_ZYELexFwsMrWlKDty6aDIojiAMpXVhthnyATwbBleXPM8aVGkbGxmPXUVgh1S0VK7RE9DAic6tMxVasjwPHXoh6z9womTsKEetOSwqYJYAmunnbCvU0PowyzAglo85so4iSrf9LY0Tl6WOIerwlLPmMGvGDw0R21AKOw6kM_Kd-cg_VMUz6Y_zL6chXitaulWootThaxYnGLaV5U1VZ1rO__t__x_HB5BeV0vc0MvD5ucFS7RZBDhgfSdhQjquuF8To7mXMph4NhXgr1lRT6VUYfT_Yi0wTU96bHhH89ZZoNTru3RekDHcoVFwbwlCLU8Ewr3gNZkIsz7C_jBslsmi6S3Sw_RKZ0-iHEQTpXpqGqxUmntqZtMYxXDSKMjbUUJk2IywyHhGs2jneFFAmEAEWAgGKVdUyh-pJE2031n6OVFk_30gk9WusvQXdJxVJMwYXxQEwaEwf2NaDghc_buMcmRhDs0STVAUf5vjp7RL9yLKcnyFnZMBti6wvwen6mRIIxqYQTZscrjy2ixUcENs_QW1Ky-Ewi7BPBIl7l6AqjyEYIfoWI9QtcvNHBL6YuVEA0kSrNAOhF7aA0yDtsdoN0ZDqikKTly98R_6N_K4SMmQx2AQiXmKqZVgWgGGzChsOzboT_GqDhgMMQDVUkZzh_7Wd7CY2CpDf3BZaXOpGVYGhlgK_3BIRN8t25naiNKAxULhG7c6D7_em_989PpVW2yk4skNlN2wlEzSYi1aE6x-b54thbIirA5O-bwxPB7EerJYuMmGmB_xKGuor4iB0LBuavCXwpvuUs0ZIJiCvHnDj6fKQKk_VbIf_JmapunZ7MI_UTJT_tRMmWLOsoAO5ARrSDuDtvxzSRScRWc3zKJomziCPU1BL0TamtPK_K90_sqw780Ndjm1qP0ZC3sgKV5-XcLsaH4xy7R_rmhJLclMlfJoz29DgTZyujAs544NKWEXWTxZ0esHuuOySITJ8kwQmdj4usZSqBKciZwOBjRBBhjzi9tCNTlB6fg87FcydJF6s-VAVkEeRN4Efm1eDxhdZlV1MfPc61EpiY-CtPb1ZjeMq-_itl1KeuOeo-4Ig2YKomaOWnwzJo1Aji_tmbegE6-PU88Z0hywUaOIWCpdoNUqQP5YuE7geJaagKpklI71-7cvnqTnF7SRgGvAupwT_2eNhB9Pp67TgpUwn3cmtzy6-cQMHEclg94wwCuBeGhGSxu7C52CGG8g03SD7buzSmqb-YcedglqG-AvbWcoeWncXxqmyLUD9Q2lb312Qx__DT5dtdqbw5bnEyL6tPVpywvpgXM--_9D6fT4CS__M7xP4Pw_lEkJA0r4NKTcT8OFO-hsHvjD1mLweas1bIUeF_HdT2N8wLUOPv8jpM_505A-_QfXRW__cNt4urd1UmowV23oLYRdBvM8nWUjTcgiH51q4l0zRTPpZ-F64kMScKiiWXGaZnFx40dqlkMwoS6Iq7hKs7GfqtM0L_w8DKfqIiWOVcBsFpanxYyPCjrR6agjsje7sVaCE794705AJUyy6OScVtsfl_zlZRufBPJDS3HZLnsRXrapBFEMvrPl0EKpSyLhC2tbJVBXwBDH2XBEuVrcKykHA5TGim1IpGiNjjmE_u-c7ZW3aBo_t--Hn8LFZ8_MLS0i1PuhAZpCDiMmRVVOZ-BLPopYOgsbQZHTHvqibKS2psA306A0mojD0vJ969Pg0_DeliIyiM5usdWievMKJHM_JSAE1UvTGYnIc-pBgWGpC_udfiusBg1GY6P4VGkLUg47t7AMiQfFN2xtFRNMP68ZrVkDqKJd6FxMilXxR0X2MZxjKlm99CZwraCU7UxdIvgS4-9AQ48gczxUcegWmGz6FqXdmsUNn42RIaBpqxqbClH12NmRT3iQUlYYGj8zi5VQT94a881yRgefPt_79Kl9vxW6Hk3ufLkY0n5wPn26twFa889g69OfbUopSrMlmPJfu_oPlw0VpDrjjEH09wJL81afPLumM0E5JzPCP8Wfqvg9mNMU_nDLRlaKquJnixwVIy0-W34wVscibn9aEsUFa7A9KKGxJ3GER1w03KKuUnOGTCt-ZzotwGIsFoTtGPF82nLbhCg-bYULRgC0_2cGAQC92c5ntvPcbvEbTa_J-eqGD9fx7xP9z-M_AzpWr6GPfUsH31ePD1aiGr5-lnRIwreqrzz8d39Ljt-3bvELsj99ctsepv5e18FEtu8T437vK5aYQOu3kgOp9lUYUtIvNcuJalmRwNk_AnDsp5uF0eHT9twEKVbXSJZCyAc09DnDF9tRloZNxHMOKGVIjASLtLnFrH0VjwkDZSvkK7FNkB10PCN6J66g058-tIdHf2otFmd0KE_ZQLZDHGIKHcaMVWumO7mbWSXcVHXomPakbIDCHRSGymZeft8x3zORi6cgZda0rJuKw0eHc7vIhV3Suku9aAFpUeGHUmfZAWMoRg0TUVD1ZnNTlI7LZVkS8vlsYAc5hHpjqXiCiHMBPXQY7OptVfzE7Dj-vXGdV0SZ1pxR2th2HwKRgKjiYzBORzOgfVX8Oyg-to_TMdGSv9pFXV-3yJj1YKroBD-pwpqylBjrUVAwRi_tlJUYn37o0-cJkRMgoQkTd6ExhEEYrQ_hGTFK4V1fGVwSXUJfFoRFP1pESKjlI7H_xAXDs4HqiPulQWpfjg5m60FE0VCeTTVGBHVy2E6vEp09NYOkz-14QVgFq_lQn0azafFbrK9CYgCjc20rW9bUDD3Dzv_p1CzluPcOnkqnDX4g1HAMypnQZX4VA1MW3nxEHN16x8cP1eIb7YzjtIjeFWoqbDJ_ff6iK19kjvwe2y8d4xqiY3jecF5i89aYCHg-TaOizPxWZv7OCgBmaoQCJTL836bU6UqpJKrn6tXclP1-kG9m0W_o5aWPoVXvyFgNAaoqAlQHUtBOg9W590qteE3dtlM7EnugG0508bigL49nbC7BdMderVC3MstL3GLHZEButl0C845B_3eugyp2zRlXb-oVAUqOzH1bC-WCfqa88VFxM8W8Gm8UVsz_xoJ3WFICYFRxUDMBJCaliE5QpS-ZD2Q_z6-hFMs0dIXt6y23-Hc7nUxyXfwOFLBphJpxQvDMKVR5R93Q-XxTK_uTjk9Oi0ZhSUJpIuEy9plCW_qdm4-ydDr9ACuem-r9I72jZGk0IyfMP9r3hXYCrMN9rUpRWWYxxkfe7EEm4lraoj9SWxfXftK-Vjf8e6O4bUrYao5Q7ZhuUJmtlQEh7yI60c_T6TgnshlFbo_RQg51qHTeIr7kIo0T4jqBo5hPQUUfxUAnpIkoOOEDtS1PH5e-DjFDESXFyyDjbVG-l2dSFgmkQJKAtf8BnjhxcvJkGhNCeQtFBZhUXlAlE54Sbp8Urax9bYaaEvRd0PuNZxA9p_Gjp05lUJwkz16t9bgitwndXBTgulnHmees56JpEJ3WKSP2I2NxZe2-IJ59dkkdPYzzQtMUWjurZqlMn6eX-s6CKJpaJ8c5cyhFxd4In7IMii8iOzIEginXcom38J1WArq5_Ii2fJabzQBiFXP30c7MLfi383MbDlSRFtGUC_krMMY5BlpWYGzp9d1nQU58UE7UpucNnrUfJ2lyc57O8oAoAad8c9QzynxBq53RKgdEBzj2RbKeSgYxx87TWvKRTvKYFZTblFO-iSd2Ng2K124O1awzjopojbVK8SQescoTu2xmgTqbWmwetpvFiGwDPX2pp9inZbnidrnCltvYyCZVdRez7CLNdc4V2Reua1LVVRWqvVAHR6sSN4PdYf670gERCuvqayLV2aJFca8smJts-9qsw6_m4fY0yOi4h6t5xFTZZv1q7PWh2-fGAIn9br_SI53nUXbjLfvuu2BK0DIVaHnXfpUmmgEFD456hyRbnIGkfJPM58bxiCi34oaBpZEihd5U1iHBDhWpvUuBd1FGyAc6uX3KLt8k80iPZmDng-4eQ5y8Sd6LhAgg0T8S7gi2ewzG9TQp9zi5-VJthJ0D3gm1pLJUsLctebbt7FJnQa-zs89t462e8-V36gsNqnOwV-ZLmtkQE2yIKfHAZkOYdXBUr9vtErSNTX53NR_Gx5clw8mmAO1zXUQoxbqu0DV2ljM6HAirjVX5zkrDsVpRCMysXHuxsBaaVY3-7SQcqdmFceHFiUN0oSzNi3HfvQ5GBDcjgZvr9o_T9DiaMuTIo6OuKflZUvDKUbI8SvIRgRCBCMOLeZaMp_qSOAtGLfIoye9zWgRADh7MzJ5i5kY8c_QeQ9q8lo-IdHG8fl5hPVWDd_mQHXa__uveXMNUfPkvuAXdm2enbZEz0ybiarylVPdVEeTP-dHPTsvNnI3r--_2pl72iycubTHlvgomNFMTmalX7cfjsWDi8dhRryjhZZzwBNGvSYiueWboVxJeTF5i8nlazLPNwDaVzB3OLN8dRdMzaU4PL-EaDL4IE7uvgzH1ayz9et0-mo0wTQTr6J15c9RrynqS6YgAjLLQT_MmWe-T0WmUnFDmdocXyL5L9lOdxJS305EVxYtkEMv3HLQGZe0wtpFXyXyro_HrZHpDmbuUaV9NZ9JkQuxngU2H3phX2518doFjmxrd5d7WUqSIUWzT5x1GFvwmWaxAoe-Qwc88ieMVGNPFGgKBENIwzq_nq-ps4ixBhsfi4s8GpEQHHIGJqdTuRGHGrtW9R2x1TMcJ5OmKzm6O1JAysyEBI1Q0nZoEFq14yky0SbSSqLb07eF2B_oF2-vclIL4KLviDNa6VKmQq19BZCQKSg_HS37KvhAuD4RN4KhodizOhdSD3NQj1eBzMD-2hrLxZjbo9xycl7SNpFKYmxPxdGx4F8trhXZEtGBQQNL3bISQnYmyhI4DMNSheIqc1XzZi7D6mKbDb1RFjKh9JcKAoFBlR7fXkZ1TaQVLdZErtomiBa_Xtp5tbFAtzBZKOnXIjYKvhFpOUJYFddRLwiujdAZ_67RYO4ZOauUzZ4Kd0Hb8r0BR8t1iQVC5Xi9EYEjEJyxenCVVM4JZINd1UK_rK1x710Zmj7TX3p0Sir--YLOYNTqrgHnX_lW1Q2sniYQWx7H08VywBn1pprr5oZ3_6sv2V582fGMmxAIrDB1UA_aS0eTaVZSvjRkr0HBpGr__jYSGGada9JgYEWHrtSLljjHxHaGK3cZMwtUQIWKi8VpKCIQa2W02wvOTrM2SclK4UR8GL8Zq7Kvv2EJnSXqVoLo8TdrO8uvyqzI-bDBDDduDdEgsKkvXE-tSaByO6ThFTIxSsm6Vcm_c2FhlfCLy2Br4p37KcjjaDo8Z1o9c-IuxR5LEXtjYuB0Eo82RJbJngWtVjgXzjgUzjeIF5Zo4HCbZ81znMtZXoMzfmYq3Prv_HDzefN7ZPBjOe8vF4PM_hx5xySexlfRTmVqBWsadijmol7PrmubAXXcvhN10LxEFJzppucYugu07PKjULnAKZ5TQ9R5SbvnCXhOwcLtks5FXRszlQE8nluG3XC7ER-43g-ReWYGKFZG_EdE0lGyfcv8_0MX5brg-WPODIdRkSP4PFGuQnOf3B5RMP_TiQE_nDD47w_uLtnefCziLe97iX8j41-Dzv_5Ty_kXcpCxdl90f4PPaqP_D9RNI77veVQpK-XW7v-Hinwao9inNtR4Rqc3-JTjC-oLVSUqu5rCzmKtGR0e0YlPzGn2jk6TluP7RrPTooTIomx6jsMwDcOc0O90Y6ML9FITw4Gncmcy7830rS7A8Jp48Rl4eX4CqUjA-prXAB5IiAeSPWHYfc0rjRLfZLE-SBgOZ3OzyKLR2SZ1zzx4LQKVl0HDN55BmNWz4Oh3UVGKuB6dIW23MIR-7IOipUwC5EPCzapxlQwlkMdzGNWLMNwwYOvZYlH8Kn6L7PRH7FTKxy9BZiSQWUnoUoCjjl3ezQQ9dFT_4iZq69MmVBW-wwI8uPBnX0pz6_d17wEE66I_2VNAel5K1bMv4k9lbMBx0om6ZzDQw6H1LX_D3fQH4k0xgN5HZN10ANM2mOoRBwlqX2R6El8PfS7hsRpaJcGAOjMYsM6HZ_jTJsE7dQLQdG9Bb1D_bLF_SebqX91Tjz7tu1kZnCJ7yUBGxIlxJ8rulRv52tVv3WIfHfzmFuojJJTmzTmOcr3ptDiVTdJoep5D_5VZDWGQseY1svNM1BTmi05RbjN7PsjYexo6sz8IwniHfjpqeZ98u1E-uZJA2wp7VPm0dT3emuufju5_8s0esYZgmBpa-cRTMNwYCvpwpRuYFOqjARAeaBm74QN_TeSPlcxmbDSZiX7zA0ghcdgzDL7nm6nZMVNTm5jahHhh6CL4ykmQPQFFtbGRuCdIZYFq9rbZPAuc3Zsge1P51cPwgE-fm_DGJwi9ARA24j3o0M3-wArSTFrsqHgYEHll71nMzLMgcnEz_gSKGk8l7FwdAp3k7NWTWOM1b7j0iW3wsaBPg3kCObCDSHmOyrOR72x9KdrfiHkYxzkIwDGMgsCksgwuZxEfvT0vHR56elsZO3xjnupDS0R52c0FKIVf9I0Ims_sQ3QRl4ljfTw7QRvxOe0DZiffndLDaTod-12qyMgWiVco9HXxUicz9MGoAB7Dap3pkXfYI3Sm-k40K1Ii_jHwudUUDJhD3wSzIE8YtjOEwO93UInZD_z358qul4ij0yh7QifiY7YCyDiemkSmYtO9JyZbzus-5th5_MOTp8-e__jTi59_OXz56vWbX98evXv_2-8fPv47Oh5RX05O429n0_Mkvfgjy4vZ5dX1zZ-dbm97Z3fvwf7B5hdnWBn1mE38-yD7AQY6jf50vGFg0c8vLAK1mjFAHcKAWJs1BQOIfvIo63sF4n20WsOHD7t7C_u4b56stQE15nb3dru7nQe9jcJ79Ki7j9kZuL3d_c7OviT1JIkIRSmzx-972xu0N0unShuDJEg2M5o9wsE02T_e2dmOquICwFiDoP19nBT7Yl64fd-NtnYWHa_lRq3tjW3vn9teP8KI4kFCXQ8wR9CpI7YJDam3cItmGnVxR9EXbBLBn7jdXer5w4c7d5XtrZTd5qJ7i2a5ih6kcR0G8-2eP-h19_a623u9vW6iunsPHjzY6x7QWba34w8616PjSe9gpHf2d3q93nZvl4p0Dg52u9293n6v26Vy3d4-Cu6N9nq9Bz3deXB83Onu9PZ6x1Tgwe5e72B3tLs_TlTnutu5_b_u9nECshORJILe7h6g-L4E6YqScXrueouOyj7UAx5aIiToJMS5sp47UTPshRG9TejfmP5d0r8LG-mHEvrjh6XVRP-yFVwMxisAOkaQKIbP04AQGU4HqpW2yMWQau3t7m64o-AS7kmb3aVvjl4W7rg2uxVszgbjgKrqev-cWaV0y51xY3VTtYEOLVSdsjtad2_ThebBGna0drx_dvduQ9YO0VVEVCHQTPJwu2_W-8TNfoKTkgmz01Fl-uRzd-8-ZXb3PPquXxAM1vJkI5nv-hGCR1kApfoqaJGAEM0-IwhXRl04ccta4MpdjWFzh4Y0-Vzl04AWC-qI95DQldUdN4fXka4krCpfySvQ_cR2v17xakcZI-7t3B2zBa_cSB5I4E0C9UJhRINUTWnkh4N8aEZXxiFKgx_ikxdJ0Y5y9OiVmys3_SxpjTF696dlf9jSqgjFutk1hW3ksBevmpHDWuk_V0qsxBbb_N6Xnp9WAQi397wlNtTHYE48ZprR8TdfLvvgw-ask57b2F1rRRkODkbF7XM6dOKLKXFk66u20iZEpXGAsa4aUXbCFgIs4fPXnlmWlnhX_hDccq4zsbJYs9ULa523rTSLw5isrDQhFY-jRq32rQwiRru_n9aWh_ZuTmtADLGEC6uH_oza-ew4EvAiyrlfTkDOTPPc2NrY-L19a5JgwxuxZULNh9Wfud2DnicRhETxb6NYUpYOuwe7fvdgp1HAhJb0XePOWHOh2dj4jvm7OO0-CjrENDwMur0HHizoZXwSGY4yHgWb272VjEfyBeEkb-QOep0dGAnXsgmB9fbLSrnI_koRqWFvd3fb1LGr9KNHj_Zv1bTde7AndeHJ1HZwZ2Gpc6d3sHOw94DOBSm7x2V7O_zT3ftOM73uzoOd_e29HWmrfJUGu52_UYmZxv2dnb0HOzudB9sPOge7u0QKetZSeqvs2x5O939Wr31upasKaaWQVgpupaCjl1MjSY04NRp6xouaet-53l8597gvnesHk-b_Qnfm9qCogajA82mJQ9MyrZjq1P8_9HyevweK1vmv_tmOsHk977SnRE3CnMcVGQbvuR9mkwlB3T4Hg4LAg9nvvR2XI15Srzrbnhq5Kxs1gwU2YK8G6kZO5NOpC5_xBvHE5skV3SSnWNZPJMJb4zhOvEeAznlRBesqI6vddTrYSu8Tq9_1dzyw7YQjYHnK6IEXOW8e-SkfWflD4Jt5PIhwruRwMSziZKaXnAddnGfziG5c0N4vQ0TljwiCDnY3NvKHu3vbvQ5v2VYrfRRkTZz5_t3zzf01YjCoYX8tpt_zC1aA5TMqcBIV0JbEmUGK07u6OZUmFovpo90H2zvbf9VArmkQ41rlqC0i7Jytda6d1rQ6L0AXOGsRDOLG-nrNaaX0SgwRgqplEPhDvcWIYK_lut1Ob3sjJ8qyC9KW3xCypJyd7v6it9OpJ_Q29rYXNL8Cg_WMRa-3069NrC1okog0z_ndeoCEsR_XMXkkoGe1jERUbHdDQs17ndbY88eM_2T3PFDjIacwPpO0fTXmfTo2-6h7wAm0jceyjctshTAIdQA3AfCMYwzRinIe-A0rW8QjCN0qnDVLecBsut4WsYhsUsmSYUp-GU-nsSwZ8bp03jHOLx5W-Eew3A5v6TtxUA3T2a-7D7oPDvb3Dgjj2Zg6Xb13_44WBbsJwshQe49_qD387KmMGBR66CyKOob8Tj8kTPZ_ba97cEA4rWpS2qKKMq4oGwIHwnkVa-zfct6aspy3PuEVKlgJUMQZT6bR-YUec37ouqcBRMI10DGw0qVxnRJEnNZgpXvwQJ1yp04FVroH-5xAfT6VPpfZBCsX3krHXnynX5Te3fteh-_OoU-2e9_75O4cRuN_kbW3I3PCE1qD1yqOZSZxLKs4NByBs2i1miUKOlt3sRV6-y0Edq3vNgKoEj54t_W2vwc-StswihxXtWwVoqscBs45VJbL-qljBSZw6Ik22EOuHQuNCvu1t2KhzRardwSk_l7ZMHe_l-VKzAH_-yXYK5g35N-hnKElw9Pav5yWpTpbzr_WRlFilHYlGc3O5cuSgp3a-FUV19UvF2Jn5_ZCdFYXovtdfFKuLsEC2MbM0NiIv192YGaC1VjRycOYWN_aed-7H1X9ory-V9wPekYIfZu_y1jVEoEhzpbRIB7C8LnVqtob3W6vZJm_32w5N_-b1vlFs1t4q5zdqidl6LBCZX1Q6fAlaZCQWYOE9BDW8D825Hh0nBOdoL1aeXDU_yGSrMzXXv1z4JbB3fTndxBoDU4kOlctSC2orTouqNGAbAW-SlxBiGzOvfVadPYywE25CP87TnHt-IaIEz7R11xhGtOs1rAHHnKsS_AH18h-e3-rOdlZtSaalUFXq88vihtT63ePk7vn4zZjyk4dScWVeiYoXARHQMYGWRBVYpWs4kQjt9zGLN3o185xZtIsEWQymH9DFpGBJmvmFmDrPFtiZ0dK7B7YEiOU2NkpS-yZ6g-6tsQEJfY6XIJIGrbQr0tNOHmbk--ceJ5qUKBEZY66a8awwFS3U6tOovUQo1xP60jaXr3ZqbtJvI-p4cGtnJ7J2b-Vs2NyDuo546q2Hivmmzk9k9O9lbNjchpTkrs2ebuZvG-S6yNeS13b8G4z2ba610y2dT9oJtu6GyOOy7oPmsmm7m6nmWzq7nabyabubq85flN3d7uZbOveaSbbunebybbuvZW690x6Y5iT2jp192_l2JYPbuWYxnuN8Y5q3_S6t3LsN41Rz-rfbN_KKTcR8TC8iSBrsXt0s7e7Z8LG2DtkWGPkOuf5yUU0OhNs5DvgrO_aQWJ8AmIAVECNN3MTjnrB5BZhtpcwMzzRb1DlcZxE2c0aG3W6gn_ogzKquuNZtEtMH-FdZu3A43WAFKn3sNUhfFj67VdYExRHiahieOrUKAM6KmnfFpuba486ffDwVp5mEVnWAv7aiCHA2ICDZ7YZsHgPEcWEKczuQ_KvqKT9xnpzl82mK82WLf6Nb-GkNa-O_FL4odvHfN6phKYJw33Nhu1VzFE3aQWFEvAOM7Axhpgm5hMhqhgwaxksLEGGcamoUWkwAJkXENgRAZBCbNIXQYauONqEOlL5wnLbUYPQwgnOQj94afENEtWMzJe4-kGmZECnybBx0DTop7-qhs6vspra2XW7nsn3h5Q0huCuht6hUQWOI4oKKtDPHiX9FZiBfFSEP_J00N3YiB_SVpPwTN8RrogtUEO40ttkMM5F7wtRRhy4292NmHVje9sb0uDSss4xsb7b3NaOiHKSVvfvt7Z9V2vdXW6t21u4ZXvfb337QFrfN633_n7rO3e1_kAa3282_l878xctWqs0JnykRQSEY7FS_BdiJUZdHkRqsZUrR63gLt10XIkyqGi3292B6Xq8KUIo9b2viPbtLCCNo5bvKsDCqnghYrr-fxsmEzHsBHX3yPT1SOtxvoavunuw0RudVmG_IrCnKuLLEOyOGd-182TXgTSgXTGt6SwII7OXvtUX7NRpbEMqsn3rQ4IWyGa8FocjhaK8fO1BWS5verBd4kaDBWlK9Pb9gtdk_1b1WVl9r1n9TqP6qrHtIbgQD2E3AUzbQ-9-xb2gwE6zr7vNvu7V-_rgO31tZVtdvcc9ZiLle13-2zOSbAb7fZlNJn_-stU7SV4-cM15SziNTs5xZI9wnJwenYj-nPmeTKGwHy0lIlsSzEtWxC9UjTGhkkaQi2R-yAi_w0RVVHpBYjy4BsaRyxAWP-dwkVwsLKHhDIOEeoBeZB8Z2uaNZv6tai-_LgP3SZB9tI14GxtP2l--6PxlOp5BLbh6qRjifb--Sqz_ZhtxQN0nCNLN8hjHC59Y52H_ico6gXMv0xNHZd2aBz1bVR_6WQhHZBtsCNc7Ur4J6m8tYn4TG_KMw5LSShXx5AZBSrvL1bBbEsOdw9KAl0dslQT--TMEkzlkY3hqDSFXo3UOvGci4XBUmUY88SnrTDkDlvIRgm1B4x81btpAuC3dUDZTlUdy9cBZLUDvoTCvJ_WYvcx5EnqBv_HGBiJlstu2JLhlaF6WtFQ3ubgponSIoWNV1yDrDMGu4jdITefL4WRsDT_Hr5_WogeXYhNC1jDSLE23rASE7bJauGMJAiAQSECf62wyeJew1bLN6-b6hTsvSqhiitsAzl49EBEbvbHkMczFJpFFT-yBemtgw5qpsy6t-8UHmyi0X10OPcaWbp5fc--uYlbB3DkJewh9ekcuPi8LQPbHhaKwGWyP70TJdpq2KmxpeSLQRRPPtwvZC5QGnDSEKZ9rcwuTGGjVWDh1R9y41dBM2TqHLEPQ4DJIklwR4Ze3UyYmEl7Dvd23btYyN9m_2fUA-6R5CWaJ9c6F86Bzb6TjS0glwcscctxsmgNzecV8WYsBr9X8W54mPvR5bAC6rGhC437ON54gri_uagjFj0N6uyp-eV6q--ByC-ObFds3xK4K717pO1c467HLLTu--_KCQErmVqSijMJNk1OWVI1LAM3U7TCoVOHg-Jcjdw8YO9GKfKjO-UEZ4SX81c9-ocPCrRr3vNq1WyHVHH9PREVzlf0owWl4fzQbXwrWsXJ1GL9jJeDTyQiFZhwuBMDsglTNaN1zgKlcZ2cWD7hWNVNquBj-0wTVrWRY3mYlZrz9bA8GQ3t_9aHQQttB8RviIBQfraPH0SiLL4p2no2U8w_Y9e6aIm62Tcc7osx4CO5FOfsBJeFOjIMg2-W84oub7YMnC9twolbZA_EvdDMitK2bteSFtLXG-e9xcUqZcN79SKuvy2hqcN-_xtpuuZ_dMPgUet7C_fypjectz9ui1m3khtDxOABKgrCfeGVvLupgkpUJ5wmdj337NsuN5neQEBcYEYxgvgZJrBICmEHxkyp-GtJ7rpLpMCge48YkOXESBE0rfqLdbkvTp7gqaeryO1BSwreb0j5JTHDoZHIrSFxbotF7q7feTuQaqbAs4GuONGUQAO5TTsSHZS0d8YqNHVW04zGiQnMbS-r3WCWXpt-D5EIlp3YQcpnpOQdVPQ-w-ZNLPNH-Ss7KYNLJDRc75mLHwTpCcDuXcR4fT_kCWBu_pM1pMRyBj3B1Nqo7pS_UOuGXK1tdPxm7yY3AG5rqKNRJDV5xAHI65pIz89TPYteEhRk4iHNwGo81rdck0_pP7QwZkyQcsJrAb6VsfppeUVl4n53Xy3akbBlkxql6LS52jqDe5IZjZCfHNAr5jF4wO7WpkUEccfcf2-4PkhcqeWan-F1AED0vY7RzL46oymeu_U66P6lZR-9IdPcq_Ds2qEqu2eFgHZ-75vsOf8-L9K5tgoOzxKCcDGdCA80d-ro-Rc7xdJbJQOnDMgp4Y2Yk8M7AIbqBPkloLk1UiuYbgi3QmwTioHlGQ8k14rl_C46JCjkWj9NvbUh9gk14huLJUd8o7V10HGz22An8WFKO6BjRsPGEVyo_iwNw8goOwMfsnDlNaT7XVt2AVSL3wr6qohWC6siYQEyeCOZp5IbG9Vcl34LiiWu8fpNXdITeUOLL-jWzNiyAiVhbetAlL0tvPw8ufMnryqP4U8d6HctTYdyp4fa0_KqSL0HdQMGgr08dp4w8IR1qcXxfmMKzv4utxcd9YkvCL-9hEX3PurskzyUcRXKPcACsUlvOF6eV_AFg_EOyijFgZrOK3Jrcq-L6Eg-5vYfQK7i6vGbWyNW4rVbyvpmukjcYBpvupyCJ37LlsHALPPVv5SaIX1zHmiBv4mFzB3_27av9n6O2Bp3uPoKygdJ39f2g631O3qzaPtGmoWnZ6O4-eqS3dryGhIAa_RPuJ8nTYB6P_eSeOtW0M451VPi4kYJyfg_mLEkhwMv9-SC5N_STp8uaB-18CdT5g0p-LlHnbyr5xe7rHwntq-SQQeTPAaDAI9j_qcTsyccqHjYsq4hS1HSUUONqW29T0W9MMFBNbF1tnXIJtQ4IW9oacYx9rENJrRiXYCM7kEjhCi-eMJmjH7jJn9btKMFNe4Uy8dAESB8dYw8SUi5DYbr45vd2ORF8GdePrvDQzoU4m19EN9M0GiM0YsJBQJNfEMLvT74LYNlPcuuMMCdsnwlrVl7QWLi5eG0cFWlGmBpA86LQ5-5zwlwrWRLMxeQCyhP2lCTQZhhuQmjt_pJu72CvacjeLEu09_iIsWVPOR2HAQZxHt8iyB-No4zsKtNEp9wxIzBcdOsm7KHGd9GUi-AZM7-V_ud2aEoTiXCPv75V-7qtPbRRQzy-lYfPnx8Dw47N4YXMqO97lTMfgnC5tTKNCQRzUJ0BuRRxlOGdGVXRSJ-XCwU3oTbtO97Mllp11xFDdbHgSKrEKdyTy32JvhYYiUvoSJfEMPKlpRzgE7RC7GXm3giqoIQqeDeXXyW_L4nRL4WQnIkvNzbspx6DqEpp4hm-0wpa6QSrjrOqDgFbbt8YImJ_wFew68kuqUN8VTEDds6A3ZUFdoro2HTH7JQSjagIH6R0uP_scjGVcnzp5dKS16AF-MylAnx7AZ3Lv_Myb_Z24VVQpxXs_QoBkMZmV-_09W_UXlhrsGI9IXhDqKik2SM4oyVP2yX247pq25l7WU78U4TsqwgR-GTVCZBISN67P6aT8GkVzAqeaBU9UmtQAGHJYTztTSEg-ewLnZogEDXf0yZXi7AxDxPn_1bJryUyppOua5FxLwC-mRfGmawIupU7mQis6EDlANRJ0O0sa5xxJCdiFiapn0Rec39ZvARzg5gOWbmD4M4tqBXqiP0k8WQr0jy3ippvhASCyOC6ayK95mHXT2yIwv4Uzh_Goxe6I_hy4NIdhGZ8yLco4Q4o-KogABzCPMrWs1pPE-IR_QFVdhmJkAZfFFs9yM7M7TqZlZ_M-TKasnT8fcSB4GoMwHxtEE3-hPicO_AI8ThzljNJkMGiRB3mmh-5sofqMjdQnLnFsYuITJ4awd7QWwq1lW9svHF1y2lGTohGf8zizJhgee69lpP9AcS9U7u1eE5APkJAloDjkgsAILhvY83ZfYkK5EFmkvLAXFZAGC-CtMteFcGseQ6CW9bMXHuU871UhG2SX1nTwPdHuGkQ4SIRbBSIqVJekYTAguqEwdqK0IMDaLNwoLxgUyYm6YnY8xe3q-T6ncIEzM6rK8nW9CvXohX5bKLhN0H74FwXp-nYSJWi0Hnz-uid4zs_PnvnKCZEEI9-k58ogaaUqP04mua-Eyej6Qw81jmk3s4ozYh1IOwx1hlRRA57VCbFJszt4Matr4uti2kUJ85SgVtArDm-xtoEXHiEsCu2v-KNQ72uXTdCQHFBHK9GBAYZBKEFqpVAAYHqS_nXVZQl7te34jMKlTluKFmbRPFUI9bDWlQUMCVCsPdWd7m1jctLDJAdu263VXj3ex3LsKVYkyYxaduOarb4uICs0SXauakls0IiAghlVGI82pRu6vmH_cbN8lM6DLqIx0zDnoJQ6ucu312SRJfxSUQbhzBIMv6BoRZiOOrWD9P02N6GHg5i9u22GLc24XAIfuM68ukaajHzQfsDBO5eMHCEM1Jg4Rx4PQvjAIGIBO8Au7bNTnbJnnJGNtKPQ6sfTzh4j7MS0o3YPhMGyTFu1IpPspQD9tgLdVSyW9YKP5vqMy4-gbMuSu1LqW37IbjVDFGgzIFNRQ6sOFwlD5q3veOwLMPrmKMS5NWBKi_B4Jh8yReORiBRaNBeMcRC6JLilVWesTjfyEy2cV1rUgtioX8w4QV30YDcIG0ulfHMbaueWrkD1Nj7RYEQiXFQRPg44i0Sh3KXNRetArZJrA77Ru2uhoLj_GbSxsZbVMFTqIoyoo-5U5CIhpjafjRnnBiDpFOIdS8BjbMAcwNndL6vC7QKzl_rSlwey0qzXTzPC5Olv7n2QvRyts2tpbLJ4nLd0jIc8wPqiVbi9VdYjrqDe9ZmAV_WaSOAZ-e1lSX0OIBehVjvjCMKMe6V23cRndjcV-qZocdQAP6igV77BtvDOTUHbGRWNCtdpg1NObPAbP9kx1wNvr7ucvG8Glt9RWU9-wkCYbQFrkrji0Nicwi0APQbGymXYDwrBeD_YteWT3g6_P5D-MCN6iH7KMXcQNk2e4VglFkOIQSKGc3jAKAdKcGz_tjG81o2fBHWkyeVrmuAW0FpZ-LWmsov69iV3nqW-OAtA-a0qtuEAGOBIhdemrsnZgJr0JvM3KkauTMsA3dvxnfjLI1BQ9ljXdUq8cGUROBxXqVsrQUrVehxnVY2aZf3fri5xwPDDa7ltp3XeHUADy8Y6MUxh5IzgeYgJwnbK0lUTVjR-6zIQyT-8rYTdBedfe7OVHUREsFCPiiGuPYBXFbZEWL14YXTvBFmqRjeJKQVjxGRvv43MJ78DRhPDGevzKUFDM51QL8Nt4TWBEpxP2kNQJXASi12tMQAtMc3nTWHLHfjVJixGWO1MuCa9SklGJKgM-bCvtVoefVwfWVQvVrcPmXlcKUkjYVfIkkrfY2hXZsbYErCcgPUwLW8wMKoMvzZUkJe0PpGAqzL2mkd2BEz1jUnJOFjwVMcAcwmJmW-4utbEOkLcnGbittleLPtY7PhXtZJYP3Rw6duHd_UoRjgMSsjoXGotL8HzHVYhg0ddpMgJloTvwLsqA6zCPn4mztRtUOVbzAPZri83Qo1cWu8QXISNCTG9TR6yTdE3AbxpZKAqoG5-JVPYJkLODAy8UlMa9Fy6TCMFUOkF4Y4V-hULomnjuvWJkYvm5Bs2Fg6u96KLpL2bxnRjiU0zJhVSVRxWB86neaZGuGwwtoQWETaxl8pDiu96GBofKNtiKO7DrUygmZoAnHi3vnCUGwSpKvlfCnlZrWomj5CwCLwMtbQp_11xDO-phE2hbeWVIgA-XlgGUi-FjaynYytseQdCCS-C4EI0GmJzIIsK6NcwSwxQsrShqPp3Dc8BY_Sn0v4UYgElpyZXbq4jFnoAubBaVeeX_hyYzA_b7LQ1WtEKIz-DmiXDF0C0cS05PTmkynCFTJJw2m4IbdTqz22DB9fbx_U73_C8rSji4vpDceneXZdIKoxnT0cM7sap0y-jLN27NjIYkZQp9ajyvKcNdOxZ3i6eUViEsaRW8zLC9QrgWsxkpupE3vRAtQ5q9RpLlrpuAqemIHjN_KkqQseQeaERTVQnV_UbD-ZmsCZUsaELRaL7FF3F0yRvbfgOW3IiuAp0UHh1m9AdOPqZkQV1W5JVBmiUVcNpFYgvbExhVy1NjyIyWq9BRwxVPlTDhT0BpvELzs_dVPRmzYGqE8Q2zvjJeQPZPPYy366KrGSPnqeSaiuHIKAWlgCNq9h2MXxLa-ujVoRtuOc-N2EXWX4lmFvZkSK5jiNbKSzQYzAFcXELThKGl9FMhA72o2N9bdEGWUl115rdopbyFLxccqtzn5g1DiUwIQ576wZkeUqKqqrtaKsphQATmIxTq7Z1vH1cc6RiUsKnQOFCvc3iIoh43Fs1TJoEi19t9Phclv04JWY2IS_svExmbeXCzE-IIjUyIb9M00goBLNWxmWCZHJy2TxP6XzHZglTojFzvQY12cgRpZA6Ec4Fxq-pfgRoqsLN3vaviPOE9h7ytcYT-DO47yagOTEL9Txrcj2fqbi2iRxUsIoIuJe5rgToX2cZmOdBU734notT9klgBlTm0_wGTMbRmzsNOJQ6Iq4kVJnKjy0uaHDdcbxJXHj5ttRnr8jBj5wbCV-dExtzArdL9ILv9NHpH36keDxvU7n4rpvAsZ3-QVS4ZMMI9scpVOimm3fCJsR___kNJ6OIVWifcmh5bm1hOP1Ow4R0O1UIAMCPQBUUrskNSg-QB2aaZ3061ezzZdstyh9KmwA-0ylGSZWCLpkGWg6KYuHGU7IsB0lxDOGYfGhXSuF68cNUG0eQBYULxbyi7OKBdkBIRywZXM5BiBl8ouHO_ud0DlPj-OpduBO2e30dkIIn6ccE3Ws8zMaoaOk8_58fJH51LTU8Sa-1tO36IC6NYRplIzzUUSNRDwdLN8uYOlfiqtxrdmX6ITG4KjTKH-XzggzVbKb8-iak95AFZ4_6vA1aI9RvFaoTFMIvemfheWpjx6czGCrgB1YfVEm2yvpSuXwJofNo-7FtGnLz3055wklQvQJ1dRFFp_TTvNZ5gZDH9ptMEv3IR4DG0En85-4X3QeR0nk0-aZtmFxCw95w3KVd8OPX3NMtpxS8Nm_6TMllxD4paGuZ93rUak4ckDLChY14ZNfRbEJ3fmYb545YFMzjpnnnMIs1RM5i_MPODgS1izarDwQiyDnW3QZ5WyJhAiMUWpozAOW7AQZbjZzjmdFgUsHjCXeB4KqP3Ej12NHOT-8f_fu9SvHWyycF6_evH_HfdjYoPxtjgcoMbJtFcrJZ8fncYHymZgiRXkt0rA7t7ehlPeiKIjm_OKdhAF0irggaC1vbKHjlpMjNsstE3W1TW2iAvpVmBGqGz9hpbbEqUdIqwj5eo9K2RJNyzvuuiWyLnnZrstXxBNoOy9e_lhOPrXOsibC5XMt6MqPxNRzqT54_ke-1jAqDWuv7AF21TcX5Lp8xWwgV_BoGD4VHsGekOAPCG_DJjGZgdCnZ6cR3c8xUiKmuCUfMkpWgX0YEMpHsL2hPUVhyEoHw_yN-xUepScccb6y_4C8AP5YfM7obM25Nzc1LB0wqdBgcSFExC2YdTX-B1GCaEninJpODLm9RqfaOVBD-2tJrdXuBeQA0UKx1WSRH_sxzkTiaIJHYoroJriLrS2XW89N3_wrNUsIuADLx5qtgbLggyHYRhgkzX6ONqbB_Ds06rxiG2As_BzHYEVq4_Y3MEeX1CUhDz6UprnPie11B-YeURcUYBv27RliZYAmIID4wJcNEMTj7sTS6AV2ESVr4JuLLiEoI2KAbyAP-ObeddwuTIuEQNEItN-8hJYWmGZ0ScRY8sAlbDjFlciRNo8TMS2W2HEf1EXVbWN5K-GfrLW7W3xQZpGVkTZcVbckwzyMcaRj5h0WMDxRwveMapzCjCOfi-BXtODWkKL28qgLvbe2LJa2LBYchjuwBNA1FqssYM2QuVBfB_Zewq3Pg_lguNWwAs48OjLor_FN-NA3jMsHl4PCanMvdcjbzRdOpnmHKn8S_ckCPwk-G9A25Jid_KYYWZWRbvNKTBg9rVnEU2kbx5NGZR7Vh6rwz7XCSfCxnvWhbllPKEOVi3ixWES_MNqJOOrtR9_NS-v9D14l10PE1rmJArgnA5cvYCTkcx3h5i49_WQS_ewFng46vtjTrruTjY2JZTYuw3Gr60-stXIH2_YU9KaJS0hwd9ofP7QF-mMbqugkmAzGw_4JbC4ajHERhifCGMs-L--Y5_IsVHMMBnHAtQCaqYuF54345g63qE38b0ivNA-nxJnSs1cr8ZOUyGsl8maJX1CCRZZFe2ouPKpl_-ByON_AmOO3tcUlqGd2gVXSbJtaz4rHSkuIZJaVDWCcHMstqyFzCqpWGlFD9hi12MuQ6xCBzlEjdcbpg3V5hBkMoq3DcxVUzkWWQob3RKaPcBLufPzgSZwRBPOduI6J-LFZzbFyDtNojGDuJZr0HaKBS0Fab0gDgqzHjPQKWiliBZJouqnl4ge-wdngIOJyzVJVXHXCqpGl-vIlzt8ZXP6RcOTqXdhXNEf2JmxC6T-4lW46E6kNzFHE9gMeVNb1MntspYICDcb0z8ntdSmQgH5RRh8AHljdWeR9rYgRt_20ZEs5T4Sx_emqkCWIV1OIGSZi972lW4k9iiLASTMZR4Dia9nzupzjCvdERC7rAa6MFD16zvrxeblAEOl5LPRQLPW0Y-Hg9DwQZ8pr6pj45SyFWYpJ1BXRJSNmXeq0dDQJyhkRu1Gph2nfTGfEAEXjUkF3VYlMeW-xNmViGhtEI5wV4MDpQKsXrS1NNBHhNLdCL_RjlYxy9y3frWri3NN8-Il9gSbHXLIO2pj6dQnbYZq1C_N7an5Pgq6KbnioBMueGkTnKjo2Vi_RVU0GQOWJBbsENSyPF0xL8eMpNJP8yBWd1Jj7WKhZ3DAG6t03EVeMcTcnZSYICzaMmF9xsnytojKacu5HnMQDOguYPY-OpO9n3PfHKnph-_6sulyXRWrRNWtXcQs36Aoco9FjJiWjd6UI9kgXKrqumG1aDcNp5z_cvBNCnBAEX5IJNuEV-4qVLmEuyJSP8Fjgncd-oE40HjtyZHvgB0Ck46YeR8xf4BxwAczPmnANN4JwHrEAgUDYN55F1mivFlDktQmUoxsKlVkSFzk305ZKFCOcZpPmclf2r-QPSk2u-cimPyK-GF_69stl6YMlBKsE5MegjFDJGJrSobvrZq8VjBYkSD1N1jdzEUsp0-ErU0Zi8aGil2VduGVCrhNdX4--maoK8ZZxHwe2alV7Rtz9NxACPq6JjB6XlT_2bEh2dORLdQ-ivV-N-R57n5p85LsvEKVPXlD_c_eFIJnVL5agqaP35jKClftecMfv0FLcnTrTpHRpImaH0ZcAC_j7DXIW6zb_AVMaVUPjqcACTokmxg0YiHoxxU0Wq6KwdQbIMp3Ov_O0wAGaBLgyW-9AY14TrQmPz1cTRExNyRCN2i1ivXRkZ4VFy6lFweVsr0wSy6VnLJyPKyWJS5_m5lPugjsN9L_dqbpDnNf1e1g2U6ldn7RRvVpfl_sXMd9C5BLx3yY8HREb8ob3HT07Xn_E3bZtj0RFk9ZPmJwbA3Xv2DbKRnGsEDrJefXMjR8z4y6qOMQatwku6ZpIFmcLlw-P2O2SC4DviYlIDeflauZ-rPCNX36xtJClonulTLb_MpgnVoXpd2tCl9zvsdabaLN4lPs76jzKzvjGO38ftyWzCzHC6QtBPDd6cJ-PSxApItr253yePUnTs1gfp7CYTafTykr0I60wsiyTIQWfSGWBO_jcr-6q79eVad2SQaxdk-4Oos0_cTmKW2QzvZhERL6ZGxbksgHXQQZQKbQCxSJ4yVc40PmMO13UXO5ELB51CT46lZ63WPL_jMHE82DACzmSUP2OEpqUumY0G3I0QC5XuNE7BSQdveBzoau3vcrUV-m7T-k6RSGPq2e0OR_OcKeTOaEXi7NQ-E0W04ZFYHN896yWQQydKLjPakpAUY9hswuz2S5VGu4Z-1Kbj2kmPCaUrHElGMXksOw4W9eW_X6BOA7O0t62RfMsevzbpelppbC5j5qWKfnprz4w1E-j3gYpdbvqMKyXbdCqVRmC7eOcelwjWe-s1bYPEaW1p8HxGPOlL1aNlRXwPowQsCEVgwKWkxEuFNvuuVH7p_aO1lzxBa5Tvti18U2LEAiMi88CI-4VCKlUmCxJsRSmzxIE6i37k0BCl0Kfe-qXdeKNJRJEJteS8WYxtRqn51GcgOBtdg4VSyBqTADe4BBgUjJKQd_4htoM1zqPZ3Knlk-0lb3nBrYvHbMfz9qTOMsL-Fd99GwqfjLOhOib8M-b6ESzo-VPfwl2ZmFarWxpLTyK982plAhuz92BI9MPI0I9jmfnIJxoKqP4BHJV-IshRdA1vPIMFXjWnhXwd50vPeIicQPwbPCVkr5AlPR1KCbPuLb-rG3k5NAG4Qr3I0IJF9UNo0wJ1N6ZSBSnbaIR6QPXqSpwRIxyRmhP7sKFgZZ9fpLO6LS81R6ulpart7Y-fcGdQJsIM6GOrP-VrZ5R463u0hCrAoaCGGHDRZNyu9IJmD2o3PAsA-PxymFVghFPh0K_pzB1YSEhcXIj45jyV8xNRRRJ27fakQvA0Yt16sZImrVH0VtTKJjzDhhZeM5SKknT0ECPsJi0lGcdG7pnXpXwXU3umfhhzitQPzKqhGOqYFkqcpMX7C5wyqdCwiz_XIcuMUwE2a0W8Ts-Xj6Ar8JF5cuGI-RFeoGz2Xp9HgUOtGybBD5XUUYoKnY9MSkZODidmUznI9IZqor9Oo1hBH8z0K3AYd9XZ9gv04aVu68xPHBNHsjkoxpAoDWQO_Sj5k1hiE9kd_TWLYxMBgIYKJaAbkKDvabpCe4Utcl-VWLpV0XSWUH4W9HcWNkvjtt1Ov-yZ0xSZhf8A3MnwNpZyWKLBMSc15Y4qh3ZMhVRJqY5t1wnLXlovvTBhtRpZkvDmXQh7OVSHk5iTmUJq9w5a3dBZonhBGtxaRwg0tnox2W-KCbYCG-1yrayFReS3NkFU0gI5qTqDdOB0HAyDanlwfSRv2FBayJ9VaMIF4q38cOF8aCYfKZUIaORzE9L33Ka3O2kLW8cHQIKOzAklpuyoD-vryA0_dVYmAAuItZFoXq2CV-BKOya30EhuwmksB89PzrkV4J2t2Y_uF7GXxj2bZwyJaHsiSO327DEI-zic2TuKntMFOrXAZD48GsVMiOysutdF0RYGQIl5giezCwXO0RsEzdDlGDBhYzpfvGba7KUsyB2QV6Yj64iqeXEyuUPLdPQz61Qdxqkg5yJX8ch1mtqbV4Jh4NDCze7fukTq8fu1IOnLtxh8cnsIYKSlXcUzRqB6nG05mwdI_kB0cFx_ip65c5wf-LngfNpMB9uyc2J02rEIwRjW-lqkd3Mp0FNNzBqcb9NwOXliIlJWvLlTGKUDmYIXTIN8GDsb6e0Wekha7Bwc9oV_kdOUuUWipbWZHtCDFlCiN7IVI7i4ynRCH3n9x_eYnoiq-skEhwdoyKv0jHzDJA-WOsDIswmwGEZgnC181GUtMtb35RJqMAUIT4AeR9K1FI7nVdRS-O2QfbdIUSeqYFDGIpAXFk2gno_o7dodi0ZgNZGhCI1VTNRsRCnnxjTGEbnUSq6zZQOao4rNFssnFePfyv1pkapxpe4QdhWwyX99aQtGmQ6wCtWen0KSRN2562d4UTKaq0hVolSwe_u1IQ3MsqnbXjNeL7lD3Ga5y4Hua4htgJhluxlcNK_Wt_grgB5Y8JkFEQ4LANjth_9y3m8tHj0K-p0njpC7x8bAghJxWV2REjqHWP-2cyF8p2lCbYqkVqsVmVkGd-pyko6CJLQt9SQSmoCQQpcqyI1DqL3xOmvd9UEapboiZt7fQxgfcardMG27Mzbf_RCWJj5WeamgLgGMb2UqC2Y1mkFDTnLp8fMDYhFAxMgSLwUry3q04TmFELLXGWltChL4DEqflAe78Gopv2Ig9K4pFycLzxvX2IhitHChZKp9AnXRkN5EXXldAn_gv9GO8WGdjK1EJ7FgJYcOykvrZ6z0s4LKCyKcfml0b2lHJQFtAPwZEnpmzQ1Z67lxLJYN9bW-pyZrJRZAvi-sj6MPwtWqtnYSEt-qZ5n05Cf6ygbndZzJYVFcM4_sCdT5q6shFTeGj2O4D3B_E-5N5smPsQknKbZlzrakSRfauPlWHoNU4BjLOIKX8iV1WthAvk0lMnwz5Ulof3TkglcmcUlIbzphDD0XR3gU6uO4HhMfKsvr9lVYKb9LCCy_YrLn3mE8t3jSknCKkAM_7g5oKMATPWKv7yVBTltBzIdhErNTYgFJfGE18_EcC972r5952JtUahbQZK1nMBpHbUktl7j0uAr706_dOP4Xhi_9D9A-pY-pRsbtROySvaAOthN8AWsNo_Mch8jbpInAU6yRlATeppdOHeFgWlEOClZ1Tk8Ac2YrpZ2Ly0teD0Mukbga1OIn2qPimz6i77BIwfyMc_RVJ6IiEmtf54Dk0gjFGTq3m0soaeOcRHsJPig7EL6WdFkxk33QMQfE-cWF8FxycCpZm1NMHgcNA5EM-L1dXdEOJRoGXuqMEErUls8O6wqXh-140Kf0-jlIdC98gNDP8PkCyJdFb3GT999vFhEnlmix2GFGanSL0IAjw0-pD-Pl57_PeTp2G0KNWE_K7lnqJpYCWz78NRk0BHt3kpkHTFTISaczSoFAmuKINPEWfajc1Goy49bz_NUb7fjNWHa1OdW3gVUlBVzD8TbO2nfPAqy9o3VKhAlvF4QxTwdb2zYvFavwwF_OTn4KKSegxeIXNcLiXy0eR6Px1MCWRBq9GF7lwPbNfPKr-up9Up0Mq5qODioVcE5ze-RVHrXWnqzCu9gJ5N_2ayzNCEE-dlviPcpyxNlr7CaADBZB5-J2CYX48oVetEb17qwEVHGEGoA2-jtOJwr134njBmdnilMgOZmAQEpR_KTr-C2pe74FLx0GXj2R1gsuPVm2J6YobNo8_PS0rueGSAkVfmdtK7QuQy9cvdzaYspQRtXU4elyYPxATV3zSvHo06f6tHZcXrNyk8-N0IE7aNEPQ6dG5078Ap3SqctYvAqopmQGbrJJu3Wrr7Yo2XG7c9ivkl0MpNuXzjI6JQVv3Hdhp51VrHXZjtcuKmBKImrHVFUd7pT42b60KqjRJxh20Oa3MbriWVlDKEbXhcLanFcylpr6uqOqpTcHTWJ9XQsNzM2BVPJ3xFMJYa4YvOFFfJw6VlPTx4Xh19AbN6gx94XNlz0OOCg9pSzWKxPXc9Td6gLEiU-njX1_Jiwy2Yx2GHTBPo66MKerrioBRuPMR3GflUmNwKdHJsPttVMzJa-vzaPcJcKyvaorId7dghUH-x22CYwGCTEYMSqo7gzqltz26IVRbgKIn4XCyCBOxgetr5VR88Onz15p949-_Du8dtnjx2v7q64rvncI3g6JaykkwpgvfmtJHbLMzRkvlhYfgMAKR57os-xT0HyFpM9Iy4I8s7AbpT6IQj9OhO5UcDlBFgGCe4nZ7trBrFEgDJR0-gYei5IhfkxlwBFNdPe0NS39Rm3lbfvh7i1_NP9kP7egwD5Xtfxvg-rNT-yMHRM_G9HDaJ7Q9hm0GlX72UklrNBpGYc44l9TXBVm6J1myFcGDupi7l9wgHS2MstY8kxa84KWFBHGxsDtiqPOKoQMAB4JImAMi_RwIAj_apoGECTvunm9F8Q3TClNaP36SbEEgAUXKBDAE-97rv8E2QwdyVaZyQnWjydvgZ-BKUx2B22WkoSAZyUP0qzTDw3aGs1XqFzRHRcW5xOpkigl5lumRh2bJJQObRMefEcqQGbQPOMQcTWrtagFaT0Xi5DK5gpvZKtm9kyQculvRNZQhITfNKGpPmWMHwQz8oTpLBEPAmlOazs_IXyomPXtc9szy7efKqspcLhdn6VmXc_5YuIZ3-HAprdQQFJBC8r5WXd8W0Rr41JIhZr31O93jJMY8VrsTSWaDReqWg1PpgJ3CFk0TrRzxm854i2GuE8trJIuHgNjZrQKJuzaXuapmfU1WwlRIJXKaDZr9wUsomVV50dUf1QqNGcZj6shj6C55r4H1J3VvzRB3fPw5L9gQdw4uTofbg7wohzVygbc9XWR3bLtvdVmKYx0X3ctmbDHMSYniobNqJ9xKgqfczjtg0sJUbpJrYJbWTPc0vSraygaXvAfLw5-BEGha3dZkEymAIrImpVFTaK-Hqi8p7b9zDs6u0l23qX7u4QvH0Ec_sc8Ox61oZBPpWFL6GNxoVzUCxC6LCBd0gGKxCWldlhFNgBBcevmJWRp1a6okY1iwFLs5XEG0SQS0J4f1RBZ42YTMy-23AfwE6yV6yWd9jBko_wpx6uW29x2nRvgugP17BHKnrLb1Yfg5Q_OaVhkY3kp5xszK6R8DsnWHEtUn7glNKWEkk_I-kj4QcYqyLhNy7D7KSKfuEXaxuMlB85RWhTej3kV4hm8faTvMm3HJ3wjnv76FT5KCM0m8Lrf9dQ3xHrlm95W4LBzGtWsrcsaBk3sELDjWbMCAA8_8_W1j_WRMhE9OEFTf_7t4cB327RPo8T1E207__5_wAmpcPOM9IAAA",
        br: "GzLSUVT1xpQoKmW7aERyUgse0FtxYwweULMnkdlIcWeMJjeH7IcjLNVF44wMS5gYejX6-JoWxTXay4mwENz6OShB--l0Jz1nYNvIn-Tk9ftcZvkmkVTjh3-ZAh9h4VL7OG6NnhaJlsyaAW3TsgYPbJAFW4CmZqq6TdLhjZdlO50kkFbnyqPT--TQ_-_NWV-_UfVWlUyIBPS20MvqLDu0IOEhX-OKxSvPrSvAo8P45dfSr99IS9pPGRBqfJyqznHcA6yn1m0K2xEu0TgVT8cQpfqvVWsqUNjP_WncHQShdIj9E5RpZ0mm6UgeFGuhSteE2WY5qu8ZQmrsE_HiIYFARG3P__51-__6fd5hMmdflrH0yLrbgtQmmMn4AgRBMdAtk-P71szT2S6pkNazwF8lPqH9XHKySncWNK-KFm3qYkrvBcmFe3ID9mFtRpWqnHHfTdWcVr_SQFcCpMqXuqVumb7SJmTzTif6QOiT7vupraqlmoe8szzpK9twsalD8l23NWH4v1ItfewGg2ZDiCfv1Sf7pjBO4XD25cT-_1fVoKq7MexqAMvuBvCEQD4BpLhDMLxRmKlucOY1SO0zwJH9IGkDJSdqoySnrLghZZ-drzOO6bQ-2_g_FejyNRPhzoI4ZsdYvoFaywsGS_XqGrHTEPX9-oJttIwtynxFGIuCK1-TMav74rWmhh4gkEFddhum_036kvS4_saAAWPAQghJJt1PBKTGRzhu_KxuQ72NVDnwVw4QCIcho6BixIQBKyxxjS3WuMQOV7jADTZ42SP5S36TV73Fkz6VX_oBj_u-xnvHeNeRry3e2wO8D-7HNa4trBsN8ru3h4jc3Cn8F65K7lY-kwBRyEcwLoBg-VdZ09CdZpgA9A0gdDOQgPWFBAjkjNH4yBOAgCcOqJg06K5peIviMbTz4nkCvAEyk75BMpPGAGjIVkktFp3JRdJv_-V4BunhuG_BtJ2wNVP4uUz6clIeMjrbwP5gaFb52k5AiHAoPJ4l8acWSfk_Ul62t7dHRobX63YXdw_qx46jKfL_rz3BX10JGlN593kVVe8ZUon30z7c6Xu2T21NQdZOxmBx5XjXzPf2goRjAtQXGHz7_nqGQta0HqZjFmFSGpsoX9tG0nUpK3ya-jHyEG5jbgAPTYenCh0JWdW-yRU1x5Tpz0qAogDxFsly265BnF2NbmpelELA3jkUHYIrRZQPlyZIATv0Cn8AlTlFiGrCuPfR-jdCo-ztbIVOT-gbYtpHFWFYIeFZOvxN_QXoSgMsPvEVQp_2BaT_6LayJUD6KVsOg534lf-F_Z3Mb7Pn6BIuIdJdlAKulSUWtcOtTEKIq4cGs_vVxvwuG7HeoByaADqzFmh-dsp8O5FWd7tbIWcwZq1qVuj0w0Vf-KO5YmHG1279092tbD6-91935tp7PeDWa3FsYJ4wJ_pXep17TT9fQmRiF21ga9fEdtc8b30oYxcEa-N5aCGcoWS3Xw2ld08ONYfa-_ZxnEiXwPPioogBMHVvH1R8ckinLSY09wpKpdaXITZ3erBZdI0vW2pIvL8oADOTNRAKyHetikPoFiTxeEWSeqrlKsQ-1bau_TYgFlDPmIICGxNf0SrFfN06sLK_Y1uQN-d-ZVdQGgtG-FAMSD-pyUYKkT9QjfEsTCqrHiIUQEXv7UAZ6rxZjgVLLLKFXxNMXYjHvsq2D_jtbMwh3QPS1cP98t3Hvb09BNEjEG9CJFa4MaKm8fN_nKqIfnXBZ_niZRTfva--3QmGMOGpq5-A8HXxR_AlUP9BgDV6ovtEfPAIFSl9b7W30XgSuKc8mgLARdiupJpNT5S4cXXnIhNv-PGxFTxteu7LU34Hd5OtJ3gBvuAs23gQVHr4C7Hs5tvFCZ0oh0JpdT9B81rArQHfFpioKeTyY5XriKib9BCiLbCWyLucvMfQi76vpdJF8x8OUOqACH9xNZEq9V2jw6TxfriSbycPV6Kqz7cL9ygB4N30jBKUAEDCq3YyCid1bDxTH_UeQoC7fpeEvNEQnReTOfN6wSHkXKWxeUb3l_l_ZSIafVHkdONgekjMhN3MN9XMRXzzwS7lSVsw5cgwCxK95bVtf2YBSD_R9vAIUZrIQ9KYbx9PykDI5Z5aHfA9GJW4MxyC0Y0h7YrEobaLIY9YpbCxqju3388L9L6BHKhRZ4ccYmb1cOU1XyuKUbmmGtAvdJmPjspM0moi0wIu6M0jZnrIjvTQ2jmlx9xGxZp3wLyGTg_QN4sS8WoYoOmjuvcslwHoqlR1rRbURGprkwPdHF5myCKwrb3nTUJs6ta0g_7VTm8JpY_QZFaJD2qqVSQhuW8Vpmg3b6jJyeJ6OpqCIMXNZHJ-JUlBEtGJZbrFVQyRIwSRIK1RUsyVpC8xs55p0CbSMm2kuU8l7R5VCp26Zal5riXNghlnYfBdaBVCff-F4jOoUXqimwIjW1Fkyq6ThI4jqUqRlJe8ip-LRIa6NAW6NFyPWCyxIopXjlp08nQKAjRaFce4dNGQGMCfTWH5GkRLguJLziVypaCHv-RUt5z6rZqYcQLVLa5nkAeQoJPfSUBZ8Ys48d3xn6v0hPzm-oXfzLZhdd78RF0ma854FhlVKMYDHKdxYgCTdnPkIhQdh3Lo96_bvP_Pz8wxwIx6w4AoP0Bv7yn_MORJx5qpe51DJsluUK1KrF5ClGSw063TJ5vgMi_9toG66JHpC0xY3BeyWGtAoBa_U8_DaeymR2FRwB73G0fJec8SPaVUZPbbo8I21nJ8sXVlmoMZsrycgpez9Lstztvm57MkmCVg11RdE1R4Ci8DMeEDiPrpfXQ82u8M6lEAFYCZcYtAL6wz0_MH8LtsZtyH3-bwDWrwx6nWCpBhhtKcwCG4p_FRPWWc2BJCS3aTNHDgWgPdR7XyINcTG3m11hhaDe3ALcRA2wIpCgpXgb0mmTQGsLjaTQoyxC7pCNHiwEFivdvlaBIM_ALAU_3UUEWTast6CtfXKMBwpDcYVmAdqSEcezBYgH2SldL_CBt-p7GeUKScOcRAdL-SuAER5OHGWlLTGUcDhiBihbOCZaC7WNx6QRveQRZfGGGSWr8KL2vFgQL9xHjJAafsC6pkEabP-K4lriOYzDT9W3XygEXl76fyDxLR1G1yKq0hINrlOMoaa0TiWBqUNYzN5IX8YqOah6fVjRegKRl-8eRFQJDRMd6wGWANxKyZk3E49SJ6c7Wx2ZkscfuxGHetwSGrfwvEKTRE_RWn68T3hSkzMrPgC10iuG-JOH9SQ25cPJiKm2aktOEpcDlW9nTBXbqrSF_dcN-dSWvkOqAQtIodBl2GHaVLS4A4HRXocSkyFL8r12ZIfkfE2TvWFnvDVe3C_Fo4et5H0wfLDTA90bYLX0EsTDbzaoTqvooVyNjSzXpujaJbkujeAftsXLmuy9Ai1Zo6QaXa4cKrsrg0GHPykjWDWRj27lZPK2U0q9wSddhah72757_c-QjKBs1gjDi9FYpFnSEo3SvuT3FtnacX9BBEXl4Te4EBHQJsExiibwAlh4C1XpdVJA_KkkJTN4NK03uiN0rjvDpVVa0mA4PnEZT7B9za89uU8QF_u7EnHC3WFNOyooybXSk34CwqWhMiYARzLoS4mD8Ngo311koGDLLHRy-FSxY7TMUF_gMzmBpgKs9Ad6cKuVqDDYlad0Hk04z09ETplMemIoLYX25QqvMiNPPa0qaKJccglutZVgybcepeqCDW-m1Hup-Dmie7P6GMQ_cYpcMZCkd3tQiHD7Qt8hZmQ625Bq9mqTWeX8T2_mtmL5vTTBhebJgecSVudOBt1pwcshBYV8ns4mZmgBa6dk8VLksVMnUcMvXpw4Uz8qxFyXxKQdbh2pDcXIUHNMt7qA3kOEYsMyTgtyPbt_UQuuvXYl9ecOMXSTUTwF6kYDwumUsF44HZWQfw1Ue1A98s4BfWYkxoT6_pMw2PNkoOSbU2wjyZk6YTo_glwVENh-fbeGtuGq8-l9-gLpXowiuyYluBHOkLaNYwUXWrfRTp53jGxOOJCFCAc6Qa7VqV0BlWnOU9pY35zcmGUow7icizBGHVgodcnMwjmLnLgFQ1gHY4rvn62MJLFN7IV_hdrKQMedbxwI1c1WJxwxihBdYRBfQtQa86xSDLiuFMXwS7ndhrgkfoCx55PwA033NYrA4mskSCB12B6tCsLU2m9ZsUgOZKTadeMV3Uqj076mCfV3CsQkxleMNqGysAsQdu84C8QEBHzp-uTVrEcNpTUpOGfBISKNYE5hr3mEADaPxmvwp453cCrK46SH5QQh9lpKf41Fj-XpgMKyzKxjJ4utleAoh-bBwPIw2yHnM85_XItwpBU-UEuQoCS2uTk3RwHIWuUXjhUM4o-gIGbbKuh2KEIjOFtjtFCEJeDxadwg_QJkRTqT6HhELQ8c2ajhnmG8AjT4wthkVF7k8tR1PZ2nUAS8yQwPvktT62W2iM4xCkcEl2dCaZoXTX6b44IcWvh1b7RHsj6JiwMXLZPkZqo9_lof41kzQmBdODmdMun2QhRad0nbU0nG4SYSiNRyvFEWxJ0t5A8q1cuuYnFwLhSVL6DEv-tdpMu2we-i1sAAXdb0MIkz45hJxpQ-eKDRdqjoneDCXIgvbakWwQldd2POW9aQqzaMP-1dHLajXLPekZhFdDMqeV5hvkWhFuUytkEI35xtJi9RVsw5vQKq0CZfeum8wb4Aa6yvIsLPCrwuneDHc62ma3orluxU4KF58yMXGgf0m9XLH4SSG5ou_RTOKSS5O8JjDJRXTerrkkHppDN-5W9c867HOiWHaUa3buxa4f_E4E2PFY-tZcWKQ-gdIgWcSJ30wGV5KMBOqfmA3-NB5pPXyWhpcCaCLCzmDSf8LrH4AGBL7dMt-n2_PMpoNpGPrG5rjcxs7KX6RRsQet-219gezAm4JrpGuXyxpKznXmSVxHq7ubsqBrJPTGJLdYr2vppU7F1qCs3q8S46jTO5DlVooBJ7hM9v3JFgImir42KVrK2Zp9wZoQAmSrZnSjaVlb5IMXUVQMlaZyxqWJ_QSI2eCtwcX1oMKxNU7VFNTgAcZWEq7K2IG_WVzacZxgBUoikmbquDSWoqQp2H6OIedPoJmQD6LKOnq7eo-9yReNjRjpQAIxLmjlj1G8IxiE3h5puHmVfyIpaYa38wf_4R_GfNv6YCT-xFKkG9uOAZMwEHd702WIPCaTRCdeWYAHm5BW44X6ISZQ0h7Ak_AJPfL4I2OEMjgfyD-CpJyZNof9MMvdwtOqiG5VxKZXRNXFLJQUREjOLrfBcJ-tVxCFqRh08cHUb3tSuKANzBVSZOQlAG6hoTeQIV6wn41bYn4Pq5sLwkOGMgpECBRHVGspjUErUwiRerSu143_3gHD6LyKxD7W6ZkcelutmnxiDZX7rAv27f_uotBBQi_AUVj646G0ADqGCa2GhlOdS_8Xx82Tl9fRA9KDJq6Z71PYBpJIgEmSXcKsfB9SuJknNHQrhBDPOP-qxZghuv42H8-wN-dJfSlAkTUrb8qhpQ8FBnMPZpBMSIimLHlQUO1eB4gP3hrkEhmuYDWKJW73_UEF0UFZE9NYITNu2V8oM-LlzynFJPuM0iSz7rmTEPVM3mTUY8vYPdmjt6EIik1nDVnnjdwqxA1Qp8UO9fAHsCbRimaNuoKrC2hoWLjr7gA85RZ54FY1lHFFBrlH3QXYLAgIDakLIWh-qNmgR8zYWrflQ8aEm2HPoxR7ehhm1DzDlXQ3mzsMrATigFn2vByL6slPF8br1MW2VWlNG6THP7k6BHyO7-qhJ7XE_6WAqO9kTuvmLWkr9mqridoTn_skUsVvuKesHh1Efm3iZUMsirKsMACEGOgbF_s7oPKPqL3_7VLvcqZ-ht3YXMvsDBXtIhDeC0KPoewdSppaYvf4BShGmfZcCUda3Kni9I7VFr3eaeDKtXhwcnEvwcRHPLcSQyuESW0kzVco_4PqAF-0XtuKimVghlbeFT3AIMtxZYLalRnL5lDXBmDz0EfQ6brrBOZQ4niLZJLPyeG3jDhw8OobAxdtQiR_yW0eP7tf4zJormNA07gcdMCICZN31lvir1W9DV8YkReGkNCxZShcJCJUCs6OrTZrQkGRLiiPE3j0NBsGfA3yPYT4_Tg3AR3GfwbOO0BKyESjXOZG4m9nQWQvgqfMQf_lXgQ4wZjV_sEjsquvVg3S4QZeSFDILtcc0V8DCikIQEBPjjm_xMMdfsYMVa9QIOyiUSdG54v5lOSEk4rq3aDwBrQkm60HHDg0p9O0U-x4_fNEAFdBLGD91BKHOxAkDKlZ_AWaFWqQdudv34HT4nJmCpQi9fButbwGpyY6Ik9EOgFivHw86CViq6xjtLlyjyH2gfyjQfnfHhf7Jzuo3Aq69bL8oIwHKkEZcUDffvosLN07t6kPuhOwEsafFu_QA_EZY6-AfPW_cmje7oLXK1yFB7E5LmCId7niBE_76qoq8YdgyhsapHrU7W-gHIOKF0NZmBHO1wNaSFQbrK8OQDS_62ZGQqhjjdWizqp-2vrRWc83ogdmjT4BWY9pcgAuQStVbndXp6k3PjZONogO2NzRrM5uctIWcAztT5rQqZ6CpJb1Dms8iaSq9V5xdFl8bA4ryVDkP1MfyDQLfJ4cfZYoQF0CoPDG5w_FGXGWmCO9SgIovOZ-0yCkS4MIClF9Y615ao0k7u9n29SZyTTE6xPSE4SaBAnIK4Txzm09t_3dW-R02CjH357siP4M3apXOHK6Uj21AfBojx8f_fgk-9N_0_nhbkmROk7X23XqqWPvwrtHP7mTytOnOVt7legfpr7RHt_3djeW9Hx3om_Ph3a2-LxvPWhJZM1v4ukzQ2jzHNu-kt2VcVuKVwAu0UfYW4sW60N4B-PoOZcl1-z3zWMI3MWRH52Y1q1SQ_Oa5tC3veXuzzVMi0Ezbvx7UHA74rtV5RVuujyxWvVcaww1PfeF8acOGA_BkYL3eO6pixUkngGhoUurUJKuMdd-fePomMInC-6Nq_qILpKGm1EX8dqi8FXEeR9pTwEISRSBor442pYj2fadmZmMkIc9HTJTfPSc_S7fl634PsWvc8nMFYxxQgk3qT56o6C5xhzDpwwnqMpa-O1UODbHM8cypzoSODEy6iCMD7YdT3eP1stATA_c7JnIqGzZO3slCMm3HYtat-fSKI61or-a1drael9EqZnlWhqIF_P0PDLXlZGv9-x9TbNVOeAaB0G5NgpHQZDkMCkgcxurpGKyGozFCGu6UqjSxjy8f_ftNAX4qVkh1rMS_M-laVE_um1rm5kscArqHhFDZMwWo6dGTTmYYD0X1WrFmLE6Z39a-8V2m-8PgnQ53R135-72gHC-XVBk9WtPtm_dRwcIugRwfutbrwBWICspDbqMYUweOiP6_2oIYb8jQr-iZ_udesDJEnldVCogbaEWgd4fKgWu-qlm6RwvlBLpOV_2mEBIfpau86ODp19RTdvzImuCtBOPVPi86ekaew8khVq8EHDM2_2BIo4HYIbk9op6OPZ2z_Hjk-ZncbtUevugl49nfUNQKzleJaKm7dDT_T7ZK_gMkzIt-oM1ZXdvoTLJHB5hL0V_dI2PyDw9vx85Hz1NsJfV4zws8tbTuvhlvksnLWxEEjsvjK8cGkRghbwWx1JaSdER2buCmHkMsZQC3HQchRVNAmu3Nrrq9slp28lE2LPXtBmKLbrfNzsy-ZipQOZSjlrsTTR_BMl22_9qih5DTr7j1WG9Giri1o9oWQR62ZZCa3elw46ZFgVdWJNtexXtt7ryszuKQmd3axrQH9MFl1Mgn-40PcHAYteQmjnRR-HhSvFYzaSGPvoK_YD2r9okpJH0XdK2SFVxcx9UBSk1Lqnx94Q3Hx1KD_psaqo_9HhRNHBSmrt60QdXhx2KQDOI4eAFMurCNqtj31VwFk7Z3P81TzSRoqEDgNrMG_QqwvE46hEwaA21AXh000xmgJxvgC7v5hRk-kFFKQz_BBVPoh0yGCs3wvEWlIrCGWvam7e1j43UBJWy0msM5wMUq_MaZhCudiQNmws3GOen3FV-cwvzqWqYPq3FP3_kKxECGdfEwA14heLhjM2fBrgwCq8JyTFOL5oXe2_T_3_CfqeolqpIVDv0BqCqpqbZ2vB3_41pj4aH9OkMkLp_9j0e4HH1ybsr43LoF_VWCYANG6RdAcR_H4_209j7kOKoa23h8hOLyWHVzZM_fVXxUHiZEHqYhCuJWVRwM1WdasZNlVv-vFq0Tod0KhS1RPbIXxLmTqB5nfdG5ztXQZ0xNH6eh_S0SNRFPZd2Do-9DgT-tU3O4WepUtWM8gQQU1w5j0NiEU0JTPNc0Y05gq_pKtxb6yqBe5WnP4X51oukRTgON7dH0MsE0OFB493sxZxEN9z6JPn0wp1Hd0dPA3HTC22Gt_WFjEzcS9BhiOg1vhXibpv9Haj9bXiplkmu8n35aaEB6OGqy3WpoUqGj2mx-Q_GTF8w3y4v1d1b7H7XO7jvgDschVLLoVdg98xOBAreYKTrKU8-Y9UrlWxAOIl78KsUB8DTyR2EcgrbKmBZ-P1LhGrNt5421r51t9b9vgIaS0WDW9k2yxriU9RLIUNuCVEwXHgCgaRu95cIsfHDOUQkE9U10mW5Gvdm2t3bBTcuaHEwa4eFPW3H1ZAd5kyv9JZnH-RmIrfXxyQD5INddCOseqXXgkJJ2TVrUWC_socTc6xVmpIdVWLwCzz5i4GO6qqVUlITh7VVWrb5q9DOZWNGe2oarlFD2mRnYXDFptxkiBfs7e35J7GTnQd4HA3gBSXDp5FwB-UzWru2LMdkvXw2EzX-ZqvEUdnv4PJbLlRh1VK2aLJA_iYIi-1w9HkbjBvQh5u922v5R3chd2Le1rcwodHYN-XcvI6Khhn4NmTI_FhE7jJ2ZZvX6HtodtpyoqoAPpRV8XkMzdq-mfrESz5wfdSJAf5wh0focLuoHGHdWA1_H0ZZkSDEcA4-hF2pWhRixrM6c8KNMvzJaVoMuNIVY5lpXy8w6Jxuf-rKr7SRwq76ypXvcTvOGl95mjjGHBO8GuJKMLPAQkS-MuarYEYRJuQgzYISM0zalBya7BPmbcNNM_oitT-gX664cwsT-uLSP55nw8Uv9JHBIjKw9UhkmNPnvvt2WBcGvTFvprFwmdjWx55MSU-Rpq3pGzkySdmqtYiVtm1oxk-Y80JRmFjjTGH74g7kfu8dcuzmqLzaQu4bnUgO0M1XUSxdYn9XWUFrKadTKqj7Ssyo43CvSjoF_Am3XR7ddQ6-7hLGZwmRSxMou7Cl3XO751URb7lIHEPecW8nnRBfaXGBvKWWf2tjHTMPLdILUx4F8wxbJktSLgWrF1okKxAhg7kHFljqFqbWYDHnfIOq8ExQa82XlzxPK-Og3e6rW9dmkIt3pyezOkYOu9M_TC0N16uQ08u-v5f8sb7YUE4L9BjHZXBAwf7QU9Uj_GHjE5eJY5VavSfjvqrenHiBfALG1ZcnktPZiz5uU8fp9KKLO_k8mDRsmVtCUSUHUxvC7AZI1bFKItyNwD78oYTxqR3a9LL8NFe1JbI1vTOTBfIpzVRxsczu7EKXcrdlDRLZumIhzMjJ8ezp9Qo2FH0yIMu49pGkIG0bq3Ij-gC5QSD4x5n24C_0zSUOWWZPfuFREuxOtG3G2DQlZ9S5DYHbIhP2gZ0o2jYtcRkT8ijLpEZRHun3UKba8bNL21kAiqt8DVCcNElrN2SMrveTxTma_vcv0CCBmdS4YGXX1LdaDMir3Bh0xOaNoYKNZ2LTh8BGuW78jt89kB7Bmoa5tHOaX5YjzfGN1p_rPUB6fo0YJ8sEY4sbg2RwjlyRyhFrCK_6hVf0AhpA7FdEIMtJiMxd6AONBUJ3uVo5hEpFe8vXrbIOoRMyjiRECLePDhPGUsZ1o0XyH-PZ9--qmiTD5l31dqPAkBMvQbb3JQ5QbVjYZbQYgdITnvbxoaE7dEdf53Z3dupF49_FzDcAWXeVE5VknzinyVpVRRW65oOW87frjH5Xag7X9FGkCBo2ecngF_w7Ysqnw3v9_07SmfMRYrx3c5-FVXbZojI9kV2AvMFZcmeszF7Mz-vk548O9YkKo8JadRLjVMOftPL5WDPM56HufgqzlZA8wM4dC1wQNyjw5ohRiopRQkLBPCK_46CfS2mUi7lFYsCB3ts6XGxNrx4Fh4wzMZ1M6QOBnZvlZeyRvZXTNfcl4HQMu6_DCtmg48Ckd9rArvOOudqPZMqMxnn7Q-Qfn7yCi2ulvM_vVltjgU1PWDTs6gBGGNJdOCl8Mup2lHtBQKskIWXLw3hxsJcmU4LuVR1kx_OvYL3HJ_ko-_znfJjHfp3ju_cLV4v1YYbtd3Tmm2k5uHPumhIAv3sP2miwbXI2cU1HJpRT0EYgjYekW01tT7flWk4YT6MMFFsDqyPpiFdDdXVISOrw7GEXNE7O61V0Xq2gc4IT6pNzDPrVorP3_59bfhN_DOM99Rd0K8eUdMctnP-O3QkdIAj4mpP0x9WV53T1uiaMi3TesrQ-G731363wGVzkvfUdn7Pm8tPHH_n_BsBVQqfu5oF3G7rwIMxijr3Urxf1p-e15ry9-CJ125l3XnN9OhO7wr1G197BZYn6Te9OMQ36Vm07-X9jVjmpnCXr6BCrVaDioF0VYkr7DLvglrPi6d8gJkli6TSItLK-H2AUEvAEeTof9Vbf2-DKfd9hbmbFEcdsxXesk0UNC9fnRcGq4-MxG2MXLbTq5YVnUSGj2j7gpQRdKmXmYgKnG0ccG3sfokC7LucoEEKcNcL6mp64NVH1NPCv31VOArnTtjSWzmERcYkl-ua9hkFlHI-2q-6Ke2tgKWZBvpJcD3VHEBxfEwgCy54hjsCsa766IzCCjnvU5XNy7BGM8eV2o48SPYbW0PdD-O6ExURutrsgmBxOvQpXSrqiT9dZ5zv7vt8HU7l5vko9IpCj5j92BLqA1O0Yk3vToMlaGKNGMqjQWzWj1SQMKaowZX3f_v0RW-gagO8QToImMvB7i7OY2iBZWheZM3l4L6Gm9b4aSq9J0iymQ-E2mdu5h2Er2lqBpXTT6S_X9PxRYQlPYajTWU778M3ZkiieDwQu-d4-KieCGAyS53ZMvIn_UcCoQlyiAgmTEGYS2ljBv8HK1GnJsbM2X7EZNqxjPmiPNfLLRPLMnJt3M1G6dIETT_doj2AEemAubRCpugdbUUCkc0w7hoxbhTUlHYGe8rX-52GGnSB5PnRXBVd7sapSQyo3RSK9ZdcaUwLhO5EGtrck-gDrwM0JhCN7fCdgOyWNjPmO2KlR1j6zN59RiGHdkHW91XDz2twPG3Jyb6KG2VAlTb7mkKkiJJD2dH8f9Or3JKpSe4ocPgrDAVpIXp47ZLO_WWjYsrZA5pIQjsFOcP7TM4G5x-l0-6D4RaaHGEgohXiwbgB5n3IdYRIuqDTQoCedcuO92anWvpUuswYDLcGm35pGpny2nsmHR7kSba9eXTUUQH6pvh-x_chTjbhTIfme99AJHbNlTee_CeH-g8fsUy5fKJbKlWqt3mi22p1u77k_eAkvtpXf7X_W__xqLtru8G_o4_H36XL4k0pWoOaR1dfnakXYwwty82TnBpFOOk6LlopVQZMvld4xyHmWFXRrwdI6SD8D9--Yfo2z6PCYLjDWotddOcXBJyYbe8RwcU4Mhfu4vtFiHXmx1X0aiWd1pxavq1_o0AIpzYR_60Udu04eY6jkboQn7AyRVjnHL3_PN-1IDD9Bt0Ho7yxLCkFvD0fNOkXbqoWnPLq0dIJ-dedVNOMKtEDNT8B9flbVWoLbmwD6UOiP6Y82Ue463qw3Eyb8MzKRR3aH_Z4kQjQQckMXmRnSt4Bf2H5vn0fbnvpPdFgGQOE3dNztIoGCSIs61O3_ics_l0Di5Pw9tGII_L6GpAfa_1zU33jZPp_wf5qiv2PQ86nvSWzkQXZ1N-DBedW_nXLK9JADIqeavaGancOCnMpDcUCsfn7GX_vVP3L7ccCVIyZe_byx82utxxwzaTvqYK6tg_Hq4TWYrJh8esvClZH7gJ29gktb4Xs4_CKCxxcnH0brasrRICpTcx5i61FhuqbI1er3vJqz7nkQQzOMK4C-_VqMemqGyF19_qI6gdlMZ0zu2Oen7UX2SMAWW1Kadif6KccmWOiCag9G-Xf8oMLEXpbOrVtlUvDTyDHEFCIj3sCIa4skd-zFp7F8vx1bV3euAP3UDWzUHdZfDEK6tOR_1ia6NjpOG7D5Ujdh9t30PDuyWCueR2N8W8AIAwqLMd_sNrYrt-pOfeZYTI72WrZQ8CK6WbG72f-Pvl3bT6zWf6My5ql5ejsbGAxxQmqrUFcpnD1YgXMP-zGKtYbmxtVg_mLnlK09gVCYEDZdUC1UtTP7Mwvenf_VGPce8bQVbG9LyhIOCIv5uXpd9FM6oZdmbCqJ6JfjsTgLfpghJK4uVBza2crQYk6KJ6UFFwVAJ-w9EnhIa-bebiGKOEdlxk8wEitmQT7vojU6mB_hRjGxDHMAs2pv17-LkMWWZkJMBLtYxuhtOA9fL5IlCBZHanYxpnlp3STYIC5C1PnPOFmC9YO8Oq_2HdscMfaSSUTOl-YwmvNp35PA4-75sOxmx3tOl4ikP-FtBFuZrj-b28pB-VpQLz0FupF7YptcnKzaClEeo7OjFfliNZ6-Wn4Rd3dKEQgz_IMl9r17r0D-nu3R1pFoz6dCT-zh-YwjqDNJLK00LDxhRIH-fIU9Ykn5mZRZpBmnJrc7TiVq6VIfPxlH-FxjpI6QXihTp3VKE6XZTIep0AoFNXzYgovY5-tDH8XnCvb56t9_Pp1rTEIixJUwEJDsx9CvQtS0n_E3hDR8l3OS-zePDJLY-6ZgjAzT9ifFiAosm_aZPiZ0BGBc36kJHjd2z_XydzcJsRIHKazXF6BCOLszXNHvEDEaZAMAikiUxUGCHckSic7lLX1IjkZ4Dh2ZKcMu7tWu4QjBPb7FHLrKuyewngDqU6wicEdbJRWOyoetoKQ6pzlLORxbKiWyMld39tAf59Nlq_viwgabqA9cfMHRPt6XVIeCyeIGFovsJvUmqXvv3Z3IQe4bkTLpM10CSRPA9Z1VjLsOUXWHYH5_19_BF1JN7yRDTQQgpJus2uc_y3DMQNigVc1aFJ6yUKUZYpztUcHSmFgrgw8dFwBk6ChIF8ikHxMDmELXGdci498zMBpdiMqHKcs59c-AHf7ilRnPIXqUVz4K5DJ3DLk2d0P28wE1fbB06eTjJBh8iQjLOpBKUDNnLKa4KezbKiiraIuGVlNRno7CicXhnMkZEzw2OCa55NVjwnCgtAWeBNUfAboipgcbnH3R9HgqWWX4BCv_6_w_MDEBPTDte633RzTVQVOkrFgProfM2o77cDdMya5oKeOr84vhGVuoVMNRpSElBIWHzxjbQxanpAuak6OlteS24lKojzHMddg9Ee_k2bRMiSV9XImi7uedwwCuiwzCiW5WB0_w1y37vzbh1ZGXbrrXgIOhhUX2EfnlddgxDzNrMrcSLmiLhlbRy_RBOLG41xGR2_njVdidD0akxXf2aj8Bh21dsCrf7uczGqNENfKsyctyWgQvGuLCeRHVwdVavXuJ_nGC3666KIJK3CuAqTN6XtAsFBO4uyNvVREyoK-eShEBq4xAPfJwpAkM6olDS0Cjm-FUoGEzlbzYzTCl3pb7t-j6LNYhMHerbbqCNyqUjxV6hp4yXOrc-0BpzJY4jdcFZgtQmgaYlyoUaw0cghHwsNgZP47ZUfl-ibGHtdmmo0c42xIjEoUJWNuzn4MXSZmO-Q3aQtzAft1hfgeVoP9BbTzF7pZ_XgDNpF7lVIyZdQjzGDu-8dsMWjh7_GKABs4pYosUNmJj9xwtISOkvtdHACOPlE0Uotp_tuO_rV0XWCwY6ywQqTlMxhheQP2y-_3-2lYlauYV4tDFGeFQ4ypdH5hwIHQ3ZwNYdYDHvvzEoZ0zuRFp9Hi2Fluz7aBa5brQcBzNIXBp2pHV6F-h5QhF_XEIkkqXEUyWh9Bfi6JsmM_bO6RsI00GNE6V4C6Nn3L67pAti_lcEgtyy0lrtBpQlBHDkYvHcmqosdU8tcQ2nK0V0-9ogjbtfHL1TLNnexd2zzF7ZvCzWwr904MBrLnsCZeKOSGrgg5OfEpukJ-1Yp9HeEdcwLw83MITfhty8-lyWEAl11nhRF-a5rQF6YKnrkUfvxPzBaQFnrAoeBOKjizIQOEgEfCchf9UJlFbqUX4Ai8EHSGIQNbiQmYiuYkq-nGjrPf7ql3KFqQ7u4TAnd0FJKVYj0BTs16KguQQLIEh88tVs40H65hMjkwyG_GX6uJnLzYvmUi3P0EAlqIUS5YCBDEk8N4-m8LI-SLCsmfwLJbE_bKtPfCX8MoeiLkcVge_wyJy1btOvh-J7iwdWzH-kvuDTqUflXMMdRRXO0ENlAkdBDMw5jlFu9WMdZiDM138VJkF1DosGonV1prUEkj3JWnlEN8rRnkD-1-bouuJOvLQtFMOWoT6WNcvFFo3jQCJeXhxzOsuXXW4yaQ7tMF3dB2MWpVZPFiVpgwDqKP7drKpwsxpWj6rMToypiC1NUpipki7DaCWRTobrGC0apdGuoY_NcsbsEVHccX-2GyrkSqLf_5F3K7OQUw52KRgqO179Zz7R-P4NfDzHPvNGh43Y8fIfqeopisKtyiidxTp7zHfAI6UEEC0dHrLeJ8SwQzPZUSw_NiV13TNyly1dhhU2AMnI_WPJY2OQCkrYngvmECfafwLpPx6TPcM9CXEgtdtxuCZ2jP1Q7Q5pnfb6xH1WCO0zVAFZRoCP_TSioGKWrqfiaqvAHVTOW75klda-6e9BC-R8-MoYr8xPXVr_oRidt3HvDBylwpSR4SwCtM_qu7NipsKnygSePDW0URFNrEsszU1huokIxUiBa4NYRpVe-4aSx-VPAAP9tFs6LeAWhlH6vM-g7yHszm4CDSu0H8sDT8zTwrZ-BwMm9zu2uDs6kc-x6w9PHXT_bJzF8QhOQqONB4gfEJLZC1RBm4YjWDQggFHO_j4HqU-ork_bZ_2ns-I9RMgbo9zqix7V7sjRREE2n7IA8FeOujStNJJu8FM2WEcjp59FJOY2z4BscKKms0UFiGaIxMqNE7ANSJzyQoXNtBWqM4Vetl0FJe7_PJy4CJ48TdMsjZ6NFtLo6mlxERzkOOGr4IafanBI5qr0S_a4OtMnumT8XqtGzXZ90pIsBjy_K6_PbVjOGES_uu_NIgf7dA_Gcv_XP2lPDZe69GO5MkoeqSs7n47qSYni-NVgSd_Ap669edRyERHrsia9OFrH2O9G9TnTsV6i1Yl1jRfsEY7QXBQ-sW4xCKNix9UNIdgIXMG-cRZJs1TXI39pmjZr4ImipQbLyZtoyNOLKyGBAa3LX7A_khLnZhs9M24AOBsBWOOOw7pwdBtMqya5Bi7-QzJFJ3CUYkdDf_6fR4_Tsfjcps2gDaJHLwcnEejcBDmIABU2KPI5FscC4K0WTKVs_R0-ZOq0Hiu91u5zaaz14hgGCwsQTSVhSyqIWFGZJOwj6Ge6RJl_MBRqNkblw_InS-EreOwu7v2JglI1G4hh1UW36q_C2BR14210AV6IX4B_4cO93itDPdQLsoePKdXAROSgoE7ASUMcSFK6mK8adC7F114-r6wCXbezvKOG8CeSW8HbMssNRglucaVxMeX59zw0kPc_RhqTenT3l5AWgwXQZii5mNacvDT-giCpNJZISApBViUeuGUNJTzTC2GImP1Eh3YTiSE7ki8BsprcHUsB8U4EwVTynX5NUVkApws-rd3AUK6twfvZc3TYbcBuTYZ2IVJRiqJE_cI2fWwggBZ8hXOcwuWcPgYuXerZQ11IGjWhxRIcHn57fSnyXKKmQiUCMWe_5L6ORlN1XXqMV-caW9mRUBlzSNw68FDEEziuE6qVLRDwwgq7lasbIsDXGVVEmnHdiDUt8OamvUxjqHeNLg8aAEwxCQDHK-8pPacL28EDzXP9B4vhIoNBnvQlNPcqa63Es4iywtna8CzvUtOM002FLata-1MLkbrRrv47toreN0uk_2s0hPh1RjDE-DNhQQ5_JPu1NFBgTynPToNKNEjjmowhP8T-gbER3iHH-tPSZx4t83L1nrxdslr7g2WQyYoXd-aRkY4oqtI70PrhYs4Hv7z3OMmYD55rcfiIabZHGDNrMVDqwpV4bGtjTVf5_dI-lFnTvNcA5ILYQ1cfR6iVfiFaunpPurs5PcMovf2CaM4fGogdkySb92JKKlSdyTDrNxzJQAylVWrTAM_34_TlZvHTgzhnJH2Phbfx90BrOXM1HWBpuqTserzPk2Ctl9aDUz_YCit_cfp1DAaWmDD7cVpO8k1HibG6cujXn_gpTV96VAanf1aV30M_8lzEJxV1DBQ9cWE3OKyfyx1KmdgDRP0gdcBnJfILQy7tfd_PI3aJHj_5nxPvIEkcYvYKQN-_-nCIz4i4UazkIL_ouI__1b0YUKrakwh8402RLU3Yfoektkqzj5t6ehTzHzaMSab2hdqT1iXNiG_opB2Dzm8Gyzg-5tS6N_fcvLCw61QaEeVO4NB-BhS4qlw5iXOP4yyNnB6LZQuuQ4n8HTqEPOdbh9-RcP5mJQNnCkyTIDhgtNo7lbUCOz2_o1k_MB54rgYdSo_nKh-YLPRobC0QH7A3_jquDB74yT0QeeVMbdtpmUaBPx0r01doBYJmUOBQ102bKnGsRA-tHQgMfTH2iftItC8OlxW3s0fGfk7J7tveYOsVxXWAIJrrRhFV29VliUP4xvx-qjiyvMy8piWPA2phqFPB6ZXS3-FVwzuh_XzchyiWKTkgxEwSA6PY164Tx9J5e9npt61RE99JJ4zDzdTIkaZetslrmPaVkj6yjrQON_krrm3jniKt293Aw8u9itjgLSRvHoHeDC0rl2kNzYFyfdlBxbTGYdQiwGTP2lJtbgfyJCDkx8U7vgPjPjX2qOPxrb_GLP9K4JcIv7WAS9aA0JFiar-d555_J-tR3eAJfgmof9av9Oz9jxWTy3XURnixpdRNUZK_dmOTQHlLp-kzr2nduHZNYo2mO-qT-vhUMnqzZb783qhXskmwe8yJ6zK0Au1-8j7AU9sXTBFA4HVCBz3YB_In-w7IIDed2DultWhEfAVDmX5QU4xnZKrRARg0k7aHlcK6pzEFf479MjyTh-BJxpl1GDxphw2uDo7TIn1qs8jMQLxLXZpR6twnkBNt-EwMZxfASq4JOhlCP-VpiCz-gajoto-BptnQkhj2Y02CezPTx-y9O8Y_QV-D9WaM3Rhv5DTlY6W1F3ycVYuNWWYXKF7z4uYPcN962YbVlPx3NtnuHVkGuD12GyBfrIJ7q6UVC0D5pVYH4scPkoNEtPYER6kflnb4NfN6ytM7ykfskOYnVecDixCyTy6KZnNIyRuCw6h-ttWANgW0ehucCKOkccBNvs3nu1nrK6WDHizs-Y1E7FHpwLNIdYADR_V4PRHTkWsqfSaLA35pJRzSLfY0XRNFU54aEMDRtlkR4yMnrMm-ijeD_jz0hCR4ADXrjh0U5xN2y1iHs-VHDvB8pAm_KGsi9-MGBHLCIwXvFIHaq43PcfMPVVd3skt2sONZ6K0iKokEFuprzjUSjgNLKvWyQSxY_q0qQKO8LSMYv15V1_34WZAhxe4jAXJiuPJXvM-3NDDn2-BGs1PQL69Azhkcay2StCzowa0zSzSFFP2BXXgCAmM4LisFBCirDLajgcPQqfB0GoRCsIk6UApM6wkBKWFENjHDSJIAoltkF-T-lBRIADdeik1K2TrePYkOpUauZ4GlE2IwyshrUJGTKgPOgdV69gyGvF3A22hHnIZm7nUEJJ4JodgcDEMAH-smRVjcTw4RlpsfAQxg1gkKri9dlfK5nHBASCFkY3q1c2UNxS8Iy94VPAR5UD1maSZVA2y4seC8MTm0VRFBHMbrLVJRxughB2fOJTh4zTZzzFXHmVIJkbRQb_GZL8KWl1iS-qNGA36Vn04uSG2B_xjUiisjw80RFUxcRBXJmXqWHZ9h34E6cg9gelZTmRYaykfDzGsKu_8ueRid9bgBPZ7iTOB5ekLDWF6WmDPjMuVAgseqTkaKKFxJJpbnDzsN0CRMNN-40r0Zm-DIrzyQQsbgU81imBz2it9qm0GI1rLQny0TQBB4PddSYkT-inqs12mowgeT0yzF89G8l5HjaqFVtWrSKuKEPNfYwhFO24aJ8VVhqe9DoAR5EmvsiUHvOPaV76Nddn0GmaZSDqBrOvDdhF6Un-WTq9z0PlEZRMPK8MIS3XzlLqCdBZXdba51yPTBblgvcLjTCNyJrSGyBGuOyJwYaANCej6vBUpXyUCB7bhJgwtzif-BKSUuJ88V-dMbR6HeoTSXLe3X_9n-rtpiNg9Ta42arRdtFCxWjz8vNHjXyQR0Vp05ARqRQ5ebRiovN-Ze45FYrFJl__sTx1qJ4wiaoySUKtpMRM0nIHZu6C_O_4AiNrJn9_dBvtPj3l8N9Wg6USHQcHJj4TVQQcoShOdB8xD-9IaWkfSZpwT8caDk7KJOOoN_czxvrXLhik4qhiUeIdLFlu3iuE0wdhQauXRTHVMe0ioDvh86ALG2hir4iqo1Qy4nL72z1bWhnMHUx600Zl_gxJviF8NtRcHVCr93BhFqdT9poIwiC_fkr8CnGggzEDBzigB6qU9rSaUPuFNAEy3YjKyKOsDi0F5EQhJkWaCZTyWuLoXygGlqDoMAYrNTA89UFZMwqzyrNG5wbQNy4kw2TshjnnoJsN4JaGfASuesmiBVxUAOPRlZPJRL8ZZc2XJmRp_4I0i0qFmDFmShOBnx-I4HQOgjce0QdC00kMoukhx9XpNVtBKed_55bp-vSIDGPnnW6u6vzWJEwV2ci7go9vn3g1iA-GgJGlY0FD_wndH0hqvUQc2n2vKs_zy3MEiwxj7FGqZ-KZoB462tYlU9Ybn7Nx4ClilVLcvvVfpvr66IeDmLUGAEVXgL2T8OKGTK6xr6aNRKfsXMgIcALe8K5hhP2TKpFB6bnmZT0gkgIE1-w4ZffYODXVtRZc8vYan8QgTTXvs73r4UgsAfhGZuCYYIsY-AyBYbOx34T9nClYUllYoT5WlP-U36Du5zQ4jBjMJRlFOkYnJfDVifQiMYZgrXHg64c3n3lTsroalT3LZHzGqbNxSJhTd3NxexwyEOw1gRlJZiDGbA1zJXpqN903QYX7szKs64QpOUYZ7PceUa6hx3l99BZcuW1oiMkEb1PI7ZKkwOs1zxNYKt_NXjLHm8x-sT_vzHEaZ_YhpUN4t6znVYVOZ1DW_mPyjiQ8gP4THzwjaG6JNvW73BGuC6RofV1qeKHXXRRbJ5JiXYtknGOuZvPt8wcUJbBoiwOgixhtDD5vXM1TVtRCYWVYIsWDdGYlOlu1FWztYhk3pguHbVo8kxBwrNmA1pBwRFiV1owWzXbLqpIZwK7MFrnC9ORNXPIcexj6lzknlZLuqKSsxdmmPS4ZOXa0qpURR5bQvDxyZe8jyrWUH0WOFAytKMQ_auQB3jtjsmIEVHTEOmc--7J2KxZzNdcpUlRqb_ChM6WGdEQB6q15QGgqRkSsjuhxbRkYSgUweExNnD9jcTCH0JKXVHwllWHC102h8RL2MSt380_AAMUCjWTY5WS3iwVL1St8olKhhY3M08MAmuGh6jhnnitNrBLURo65aGte4szRnzVDx1KzAfmzHM4I-ePgcqZKnTitbGzokrsRU-YEl28BK5JiZMp4L7ixgzfGUWbVLnFUKXZPF9Vp8S7XOLEgRLaDSwQr30LzBXnWe3uMq3GWVIV6H4VL4Zlv2Fo26LW5Jx9beunk1P_Y_39B8Xu02Q_Byo49E3A9RBhTsIpz3FuRRYzx3n2OQbaUdQBfz0MO5izFkXcNmoj6n3ulylnZd9cCKie0gyVwIUc-9t3_-CPBd2MKVWiCESv7bRVSCkq1-hlPq_Gb6s3QhdM0Bir6k_ySIAo4rgi_sWku8_7sfDaOpA9Ipn4EeUSWMuZGCOIIsHXFEW74m0lID8U5fTZ7pFW7V3MRJi8QYyyHmrEhHPERd9Eu6AdFvpiynV_PVIgx3I35RAaI1sXONYftg2Z3YdTmtVNKQDzLC_FvDbOTFJFt1zXmjGD5KGj6Iv0yqQyz9xu0s6jP6hm81gQwxiRSIAiB9VMXrnYygELQ9yn77rOzXfnt3mbfAEIFzLF3F6Z7QtuK1RmzdMYD1EqJymJZm7BQZSwFKh8esA6q1tO2qLofiKhgnOT3upNfiUVJCbTwO8MiEzbKo0JtQpU5QDQWDjMdybpJngDu5sBKKn0Ht8hFyvPMh-IqnihKYtzHA2y5_V8qT1BLMDl5P0MRvIoltOtBozptEuOF2r8IFd_v9SuSEQmPl1YSymOLpqGYqEG6egoq6aJxyN_yJKeNn6fkWGU0jugeqsY_g5nRg4O9cZ4B2a3zSFXXryr7l23k6nNiX1HpTncEA1ThZ_NKKsy2boLGXxxCV8uxfiTSpv51aDclUo7E1nxPv356Im6FCPNvTr-7cq3iVhTiNElMM_V102wRGzxCZqtnifeOdWH-4rDoR-37mw4dawJj440RmQmbHrbJp5s6HApio6PXKHP4UcbLQHEh-r46fDAS0aviisllMc92As3ReLoOqfzjBE0rAv0KV7M0AreRkP7_UypIEcdyr-w7Ae--48WF9cqct12F_vgUlxd-AcihoTKc52VjcUY8-06H4lDLt0dWNHvlLog0dlEJjLWHFxdKJDuIgix_BZ_RsluCF0mM96VTn5FbH_kRrEO-Ww6RNA4osAo_OMOPTH2jOYVvqX21s8l8P-VHyrNlVSkqnMX0FNdJBHf5QVOjvvGagtsrkMQ3miJFSpKaKj_41bca-M7hP8VI35GbIN0-GM3B1wbXE8Syq76SDzQ4PUQXlw9nIOl0tbuRTV9JaN9JLD1_dTTDPbfA_I4T71PD_WatWTo9PPn0gQnI08mx14pMtvAkNquzBOm4nRxq1DbfhSpklogjZKFJmsDpRh83Ck1wVUlvC060uKOfxntOiyi_SKliaKpHCfZhScCyQFde1pD0EpMOlYnMA9jmBRXu2dwJUKunFB89f53cAxAAWVxTO_pd74xq5Zzc9TpBgNaxGXOvfHMT0zS0dBJVbC6GGsNWyXSLRvw270F7GbNHcQeHycODw5xGmCCKObghPid1g3f7O7Jg9AHYkRWLWM104nnH-63OawPgEKBTF4dMaXQuPZl9Gpwd6twv1QtkYhKBsOSbheRUQ1Mef377SOcQmZAMyJtHZenZEZcvHxeUMJ5MjNov7ONyC2zLm-K3qDaZ4prPhUtuYgTY52tAmaQ3nLRnZ4dTc0XQAguH9OZLgtgPDd8drFup6P79tRA5D7GWJqqjHn3Fu-8rDBc0G5JetYkkimm4S1uaBq4XBLsAJOwyandZY4iFY7w0y3N_TPhFE--luoiE_T-lEvcK3MooDW7SoVj1jjH-cnUXUt6FKSE397mhPMA7lG7omEjGsJ72Q9kAFY-dY2yc_tBaqE3SpQkiEQ99pg2Bx3_ftazNrFs8X5WeCIhxxUmR0aFXfBEledz_O_dktJbDNTgjK-IRy3hovVt9q4JXIcbH8XxEi5KjiahvsFxAY0G40uWK-0yQQPDROO8RAFY5Y9lqcVXBenhWTxRE5XuHw0gXOYn14fxXmRtyRvW3iU7nqURPn26W_ZqwU_KvHSWg8MOC9vaZcbjytBYRCsVl5sXjXpgoWP53F9kNZ2_g6iZVDzxscG6_1WZptFUAgbdFdWQscvAkfwRWPbpeZ1bu_ZFd0yiWX_jKol3QX6caxpenD2FvkzOM6hFjzQi3SIiU5up9FSHgrvWMUSnzZszN6H6IptJxnV9OFw-tRqlVmeGFXz1HTqA8_hYekgDEu7TPXhNPvBHtKgT41Zd3LY4HkcsSXVXrNq5N20lrIY40TK8SlUuA_zRgU-hfu5qbx5Odhj0AKAxzXSVMvT54HJqZMq3ZZ7mP4Z3iNAEPf2gSB60cuS-cQ4QQ6jGk4nwhiyLTuft7kMb6HbW39BkE9TjdTBwG32Mt6KHGHdpfZslbePbIxfX993Hyqz694slAetqm-jKOY9Ae06hLqBjH6j8UGyPDL_XaP2BfF6RG9MO9-iAXV75d9AtQO3l1nh79mKLf4zwVRNCFk9yxGRMueNppa0liH_TnhdEeHhXklbYWHAaVo9qGK64hvUAkVlMuESY8tVzFuYid1FRYcaAfmk28PQMn044ZJEVTGnDAxbpJFveGN1UZGKXi6YRNLFaIdJb_4yUo7laVxJ13uBm0KV4UeFW8S4NreRkiiFW7JdJ7aPbFN8gX4AAMn5B2NftQtyds65Da5yaRwA-jNYYLWAT628uy9-R5JWz6emfa92UD72dw7vV4i2dun2JDyZcS-8ACwjoXOnuWitZxxazpt6Fn-rYFvZ11mKWMwCeyM6woj8EbjaZpqnqLVtOOHLmO5k_aPNurlH9a-3Hb8pz6s-9li7knALqLVtH33sGqjeCJVdNPugYelDhp2y8dTYt8N7m2ouUszYJig6Y4ghoWhAqZWcWPpw7GgG2M5rgjB2tZbA5h2DCEibqZZKdSGc9iO6PN2YzZm-nUJwj2TqYhfV64q3amCarliUK7rkRTbrGAVq9XbhTvHivAVuV28uIu1Z6OU47AIaCWm_LBhFEkoiAwbetYFrAukM6qvo-m6KPA6KDaFaePaEKv61xZ5FynaCWF6_3A1YqZejsz7vMsRM0EyEy2OgqjK0b18xPQEGBlDXUIuY43aPuyDrXhS418mvkAYcY6_YpG9VpDkSq8rkCBL5kuA8sqg7qHUcCoDbku2KQhk4R5atXeYDJ2X_WTN2eZhcsBOXDlNPJhw_kucOoQOU_NMKeyYerlPnalOooqek9Fr1M6HNMV2IOcCxLreVOub9i1lEL3slWpY2GQmlHRHakLQ53JHSRHl05Wi8XsqI-WFESi9iG1_15HHYh8NlyBimyCDEdOcAN1oYJsPrmj0_ibDcouoQ9Rnqjt00wyVo4ysASKE71M4ImBt6dlSdQ8yqR_ebsioks0ahAtmH8G_YQg3I6sRsqPvTWJOPDdPX32QsV5J737mroaWwssu1cf2qbTPd4iXfb3uc5Ltq4ec5fraV-UwYmCpz_ScZn3hFZ3V4SX0ttb5mEbaEXc3XSS1KhaUojBsC615Q4Mcuw89PGDUv3ssr36odqj5Q9ZPiUrvorfDtwJS-qLWRz-qf0pSFtjdUAJVapaJk_pZjIMuEFgfOstF3KJ_98F2a_Uq-x9GNBHnrDuTTRmkEi6F6LHeDTo8WFizb2GdVtR6Kv7s7_ZBdNjZFUfqNFRBi9nHaXaMsE7KoX_tG_2lTlpY3RltJzVurqHZ26hsOgKpiwwKPE1kqOjWmKsfwXzTKtTYPpNIfEhVK5GfjOHmik-uXDmJCynvOGgNXMr6QIIN3FXn3QorMQiI_M4Gpwb_aifuB8KrhjuYPzNUt2_7Pos4VNKcRQgmV1nwC-_KCvp2BOLlE4xaJrf49OMv111htrhVHQU1CndNrxenkQiM9YYoX55LBD5F6Z1DmUqxCOsUbtRTWDq36LAg_AUTxEpMrsPeCl54be36p6204xxB8JyYUUMigAkMCmCmNvkTHXAaN0gudyGAttoH3ohe2mvLpNrMoBmMsaqU2MBDZQ6Y3tGg1jO8D84bEGj6c_HB0C2Vxx7eTU7i4tbO0YddUCODeusVwyn9dw0xCqZ8QlmEwPXmxp22Y14_1X7HBUGTKSb__LK9WC9m2Fc7sucD2GAzZ2goxn3_l8ykkxZCA6YZAoo4cNu5YKURBE9cQqXUNi5VlG70Jsv4xDFnhxl7mZ590GJAXr-9NIuc5ZfuCh4EVo_ZUZ5wUh0xKEIOha5ikzIDR8GRfjUUjzdiFO892DPaFklSdvOUsOnHv3Mp2lnduaKBYwJGFH52WCQEHGJSDMMdguaHI--DQ229FPhDnp7nQn1hYhVZdyhl0jXiBDZiuL3e3HAD0cpGdvfa3QmTQ2yUedNeHDLgXEp6vvHo_wEUtsRJfDBMbxwG1rGjs46HczBkclgcdL2mEKOXxp42L5uzzrbZJLISr9cD2wuHyQkaNsGYUtt9S6Rr_OhldVTzXDDklxEfeLAPBJlHZAoMMcrk4R7OCJGzVOTXLYSXiQF1LkGV47kaDKfqwNcqp65Gprj1umOk1GCA43_hkPvw5mXi_QmQcGoZAvmtdNLMJiwIHbMFgGT-UnL8mtoaSQ6fJBBRrC21KZKCm6li4HZkoFgwDxnDUj-nTpp7eAHUIuIJZZNXRYA6Ev4o0zZ6xz_HM9eQkV5WfO4tHg3hkD7pi2JEsGDZFY50dQHjSevhpxZ_-H3ZIQxR3YUV8FsJCO0w-Bg_8bs8RWuToq6ba0IcIrYKygAtKp79h6724hh6SVrrBboEEhoc6cKzcpWNU5-BdLhBrojDKkYxctCP8LvgwTByVlU6zNKrSZy9Eg7z8T7KKwPVXILzsSIfGa_YZnjmudYLtSsO4RxGXtr0c6zZ1UqHtg4Z-X7iPaxJ_Q63GkisaHBT21yZvGYKYne2dkdOfgWASRkG_5Tu9XjMokH7dMWm0dBtxhilSyQ5YJQYTBnGZEJO0fA5s_qwXQNDuJubWoJ58-Z4wiRyFteP4Xycz26lJ-bGrb7iwEjRBWW6R0f2D-ghHXfGdNnQnju8-4tPaeRPAapacoHR4B4fJbMNsxnXN9u40hPjEopRxSzZ9uYVm-vRJV6l-fF10Sju9sjw9bf1R6D1d04mNKkQn3fz3EccfOWyHotpoeFslG0u-c0VQzOrxqznPv-4ejGP0NmXtMRBHL_TzxmIPkx8hG9TAuYkYtlQ7i4tIcdSbW3qPEPdLB2d4OQxWKWHtujfbBWVylto83ni8c2913fKwHUS5LZf0uuTpGjac6M3mhDNYS-8cgglNLt01EOJnmtpHT-9COPIpIZ3QK3_NLRGijYiHdH1BoyuzcotJzV2QngczfjBkIWuQ2YclEI0jk2iy4M4qrrNy2gqXeqUrpf35AkSgmxAoJ3FX0zPoQvogF8KZu8Ic5F5IZvBF-ECj9gQP28ClwKskCkwvGrdhCVbVwMBtdJZr_tIlboROlz2lNrSs2P7PirpVGa_C-UaBS4AtZucWyBpc_McEVQxVcsWAVE1IBAC3-71yK2PcJJj5ZBFECqYy07SYlSVfpWUw7z1gFQzCUzEDlLrtAvXR8AYQgm3SM51SlYLDKjL8pc5Wir8NJOZTwEu4gnpGTTlsWAqKTq5Aa_1ohlKvObEmAXgh-q8NraEuSt6MfiXzSx_R2-trr5VaRbE0vA7ebeTedVI6NRmMu2FObihMwlI3clUcUdK31k0YGphcSwpmZixxm9q_BjlM4PMh069YGhd9ZCxqz7iLhm3kAPIix2Z0TYkD02fqJkYrjVB6noFMLqia8A5MyUD6_OtsetJJDA505UcbhcETfvNuqGk79vQrrhZZ-tGDhvjAorDnIFJsMPFRgUvbVhnjZkXKvjDfZT4PBDCjjyFk-altMufIDvkLvIdQ1H7OzJdp9Fi-sv1ZA-e-EbGprPB795-2fffIYwrHU3oKCmsoOIj8ZLQJloBvlxom3vSJMIaImMTWLrk8UCsYNJcTkRzdeWQSW5X5dKWJ3_KYrW73w9IX256s9GbO2xD8_LcLSIzH_YZ2vy-aOeUMXorxFSBGEQIfxi7scleuDmlbrk78yLBbYOcRVEyBxaY6cWqzRtxO4iPGVnBOkodFIXWNfMY7qTVOLIwoJYwt_CrqLs4CDezkDiXTCMxOV1JQNPg8hQzg6DVH26s8Wj0SXZT5ciVS_TYW09fLpYBePBLOpqICpRcopKnRaZoQUN3E_wTrYrSI4Vr9u7GosJAIsTSJhsKqfU71fxIqn12qtPDoWJ_Ne4PsSUSfpZiDwQ4x8658AruCo92d_-auTs5oGHZ6AC22FQJ2cfpjZj-olVoBdyTwWAdgY1xP_KzE9lujpmmlYPHn6-XZS98MG3SHk1oXL2Vv543YSt-hLEYYcthTr6_RALQYyTtFGSE0qrXNIrfoXFP0t6gTEZf0GrZqbSNmUKzT7cGHxyKuZRlbtZ3hyxdMYTB-Yz167EVdKLw52IdlByKGp7sgk9sTwvms3P9MklHUDivJfCh5S77E8zrccPT6BgM7xKsawmX_yzoMYlxY6ZNaUX2wMaBMnnzByRwhNPtThqAxCo7ff4r7-XiEPUUoV3QwK1RJ-AcUd2owo_gotHyS7IEaCLhDE9vbcq1kXbs_B36mY4e-63CLOrCxDIRMCFghba7Cr76jpWFkDWJ0uBhojlJ5HWhrrQyGjm2dHTzGN9qdlm7rSotbBnPNYSkM2Ygp37QbrkYX5wJIsIXJRFuG7JgAP68uq2NwBCnb9K19QXY_p5OD69Mwi4D5Rkvb7G_ncY4ybX5h5l-B22gqRv1JcPxxgyZhpUSWBqs7OWVWuucjM02909rcRdwb69FiQCTu345hIBvweogMlpGaNRu6FYbF0xqjQenVwQDGj1Egevib1LFx9-iyVhEOSTqOitdfkruItPuzYcxDs1jcGSySrzNQZkSrVmfDl_qM22RUJoKcJ6eWaUPhKHT11iMbinD9C096FJprzGbuS1jascz34KYYVx0eyZFJnmvJ34Gj_YSy4_v3ZcUP7A1x_yFDlzbzK_mWLKakzhhxv32ltoFeaakYqosuOaqNewNNt5E2t5zvD0FmQPVieQ-UQMt1GKjYY-ZRtf9NH7t0EhZHhicM53YQilZW1QFasnt94uFBW1E4Qz1EJXtBwmcOMN4iJGZZQ040GOua3zYbWZc4B13cVSLZ01zDsAAbazzP89lWFpoX7lhM4iFVd0OZgT9jo2FsUrbSi0HY8ObEsdQS1huM5gpn9goI4PGVJPsh7EfFtI6YfhLHxc7B5wcBZRIlSnlIjtGvLqCPktzYsUHKFpaWuiOcTBoszRo_Rn0tZjQZJYlx5tG9PnwyazHeRp7pr2OIoz4zZ6goGNdGjblnXVGZ38KviREtZbd_TqYOI1_1WQ5ynj0LJNHGPnsCjQC1RTv2XdwkDYCZUQ7DPPygq5C1uGccJ5rlrgXyCYhrUGPcCg-jZF1FH7GgUHAMiJN2EKfmsX5C-j_ssakn0OfFtE0skQ2m0K7mTrrZ0I303jRADzXKBQ8JLYsJK5xVgcyJ5HhxKoHuGaHxpn7P0_cJxGm09ZupckCBXwTnmTQH2Bbnh38gRUKUrx1J6o_1oyTPoVKw7JM9qj_xOxMJ7wPFg57_JlIgQYNXHzW19gmhuDq40gkCtpGh1uiCmlaqjqnujtU6JVvilQpUM7DojRxn8qKzqgMVAMcbhMAHKAhV3Noqy4bjioj0m-hVEe2Oh6kp9Vij2AaMX4GWsO2AgTrIFMt3icDplO_aapssJrKMtJrMJx65ihb-Jx6EPSU8FkoxScNBKvwVejFYR9FYKrM6YPhUsgjfIpGUxVAz8LHdIHWP7f-yaRoG7jlBeP8qMT6bqBwST5scoYw-ZlSNpuKFusH7NS4MWM7zmR6SZJ-fTVZBGzKclqfP1Qo4YJPHQLAv_Iv"
    },
    debug: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,A,I,E,T,x,N,O,C,$,j,M=\"@info\",_=\"@consent\",U=\"_tail:\",F=U+\"state\",q=U+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),V=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},W=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},B=e=>{var t={initialized:!0,then:J(()=>(t.initialized=!0,ts(e)))};return t},J=e=>{var t=W(e);return(e,r)=>K(t,[e,r])},K=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:L,en=(e,t)=>eS(t)?e!==L?t(e):L:e?.[t]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?L:!t&&ev(e)?e:eA(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,ey=Object.prototype,em=Object.getPrototypeOf,eb=e=>null!=e&&em(e)===ey,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eA=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eI=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==L?(e=eO(e),t??=0,r??=H,(n,a)=>t--?L:r--?e?e(n,a):n:r):e,e$=e=>e?.filter(ee),ej=(e,t,r,n)=>null==e?[]:!t&&ev(e)?e$(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===L?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):ej(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),eM=(e,t)=>t&&!ev(e)?[...e]:e,e_=(e,t,r,n)=>ej(e,t,r,n),eU=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?ej(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(ej(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(e_(e,t,r,n)):L},eq=(e,t,r,n)=>null!=e?new Set([...e_(e,t,r,n)]):L,eP=(e,t,r=1,n=!1,a,i)=>eh(eU(e,t,r,n,a,i)),eR=(...e)=>{var t;return eJ(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eV=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eW=(e,t,...r)=>null==e?L:eA(e)?eF(e,e=>t(e,...r)):t(e,...r),eB=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===L){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eV(e,t)}for(var i of ej(e,t,r,n))null!=i&&(a=i);return a}},eJ=eB,eK=async(e,t,r,n)=>{var a;if(null==e)return L;for(var i of e_(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,t,r)=>{if(null==e)return L;if(ea(t)||r){var n={};return eJ(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eJ(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eB(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>eM(ej(e,(e,r)=>t(e,r)?e:L,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return L;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eB(e,()=>++a)??0},eZ=(e,...t)=>null==e?L:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,L,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eA(e)?eF(e,eI(e)?e=>e:eE(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):L,e1=(e,t,r,n)=>null==e?L:(t=eO(t),eB(e,(e,r)=>!t||(e=t(e,r))?eN(e):L,r,n)),e2=(e,t,r,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eB(e,(e,r)=>!t||t(e,r)?e:L,r,n),e4=(e,t,r,n)=>null==e?L:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eB(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e3=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e5=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e3(e,t,n),n}},e8=(e,...t)=>(eJ(t,t=>eJ(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eJ(r,r=>ev(r)?e(t,r[0],r[1]):eJ(r,([r,n])=>e(t,r,n))),t)},e7=e9(e3),te=e9((e,t,r)=>e3(e,t,eS(r)?r(e5(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e5(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e5(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e5(e,t),i+1,e,t))):a(e5(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eL(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eE(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eI(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eJ(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(y.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await K(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),y.busy=!1,!0},p=()=>u=(l?requestAnimationFrame:setTimeout)(h,t<0?-t:t),h=()=>{y.active&&v(),y.active&&p()},g=(e,t=!e)=>(f(e,t),(l?cancelAnimationFrame:clearTimeout)(u),y.active=!!(u=e?p():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(g(!0),y.trigger(),y):g(!0):g(!1):y,trigger:async e=>await v(e)&&(g(y.active),!0)};return y.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ty,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class ty{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var tm=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new ty,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tA=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tI=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):L,tE=(e,t,r)=>null==e?L:ev(t)?null==(t=t[0])?L:t+\" \"+tE(e,t,r):null==t?L:1===t?e:r??e+\"s\",tT=(e,t,r)=>r?(tu(r,\"\\x1b[\",t,\"m\"),ev(e)?tu(r,...e):tu(r,e),tu(r,\"\\x1b[m\"),r):tT(e,t,[]).join(\"\"),tx=(e,t=\"'\")=>null==e?L:t+e+t,tN=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tO=(e,t,r)=>null==e?L:eS(t)?tI(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tI(eF(e,e=>!1===e?L:e),t??\"\"),tC=e=>(e=Math.log2(e))===(0|e),t$=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):L,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,L):(e??0)|r,(p=!1,L)):v(e),(e,t)=>null==(e=h(e,!1))?L:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tC(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],y=(e,t)=>null==e?L:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&tC(e));return ti(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tI(eF(eh(e),e=>tx(e)),[t])}`},t&&{pure:m,map:(e,t)=>(e=y(e),m.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tj=(...e)=>{var t=e0(eL(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=L;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tM=Symbol(),t_=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:L)||(n[1]?[n[1]]:[]),n},tU=(e,t=!0,r)=>null==e?L:tz(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===t?f:tF(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),tF=(e,t,r=!0)=>tq(e,\"&\",t,r),tq=(e,t,r,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=t_(e,!1===r?[]:!0===r?L:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tM]=a),i},tP=(e,t)=>t&&null!=e?t.test(e):L,tR=(e,t,r)=>tz(e,t,r,!0),tz=(r,n,a,i=!1)=>(r??n)==null?L:a?(e=L,i?(t=[],tz(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tD=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tV=/\\z./g,tW=(e,t)=>(t=tO(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tV,tB={},tJ=e=>e instanceof RegExp,tK=(e,t=[\",\",\" \"])=>tJ(e)?e:ev(e)?tW(eF(e,e=>tK(e,t)?.source)):ea(e)?e?/./g:tV:ef(e)?tB[e]??=tz(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tW(eF(tG(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tO(t,tD)}]`)),e=>e&&`^${tO(tG(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tD(tL(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,tG=(e,t)=>e?.split(t)??e,tL=(e,t,r)=>e?.replace(t,r)??e,tH=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):void 0,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tX=5e3,tY=()=>()=>P(\"Not initialized.\"),tZ=window,tQ=document,t0=tQ.body,t1=(e,t)=>!!e?.matches(t),t2=H,t4=(e,t,r=(e,t)=>t>=t2)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t6=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return V(()=>JSON.parse(e),Z);case\"h\":return V(()=>nd(e),Z);case\"e\":return V(()=>np?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t6(e,t[0])):void 0}},t3=(e,t,r)=>t6(e?.getAttribute(t),r),t5=(e,t,r)=>t4(e,(e,n)=>n(t3(e,t,r))),t8=(e,t)=>t3(e,t)?.trim()?.toLowerCase(),t9=e=>e?.getAttributeNames(),t7=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,re=e=>null!=e?e.tagName:null,rt=()=>({x:(r=rr(X)).x/(t0.offsetWidth-window.innerWidth)||0,y:r.y/(t0.offsetHeight-window.innerHeight)||0}),rr=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),rn=(e,t)=>tL(e,/#.*$/,\"\")===tL(t,/#.*$/,\"\"),ra=(e,t,r=Y)=>(n=ri(e,t))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/t0.offsetWidth,4),y:eT(n.y/t0.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),ri=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ro(e),{x:a,y:i}):void 0,ro=e=>e?(o=e.getBoundingClientRect(),r=rr(X),{x:eT(o.left+r.x),y:eT(o.top+r.y),width:eT(o.width),height:eT(o.height)}):void 0,rs=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eJ(t,t=>e.addEventListener(t,r,n)),r=>eJ(t,t=>e.removeEventListener(t,r,n)))),rl=e=>{var{host:t,scheme:r,port:n}=tU(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},ru=()=>({...r=rr(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:t0.offsetWidth,totalHeight:t0.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var rc=t$(s,!1,\"data classification\"),rf=(e,t)=>rc.parse(e?.classification??e?.level)===rc.parse(t?.classification??t?.level)&&rv.parse(e?.purposes??e?.purposes)===rv.parse(t?.purposes??t?.purposes),rd=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rc.parse(e.classification??e.level??t?.classification??0),purposes:rv.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var rv=t$(l,!0,\"data purpose\",2111),rp=t$(l,!1,\"data purpose\",0),rh=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rg=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var ry=t$(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rm=e=>`'${e.key}' in ${ry.format(e.scope)} scope`,rb={scope:ry,purpose:rp,purposes:rv,classification:rc};tj(rb);var rw=e=>e?.filter(ee).sort((e,t)=>e.scope===t.scope?e.key.localeCompare(t.key,\"en\"):e.scope-t.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",t$(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",t$(d,!1,\"variable set status\");var rk=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rE)=>B(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rA)),values:o(e=>eF(e,e=>rA(e)?.value)),push:()=>(i=e=>(r?.(eF(rS(e))),e),s),value:o(e=>rA(e[0])?.value),variable:o(e=>rA(e[0])),result:o(e=>e[0])};return s},rS=e=>e?.map(e=>e?.status<400?e:L),rA=e=>rI(e)?e.current??e:L,rI=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rE=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rm(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rT=e=>rE(e,L,!0),rx=e=>e&&\"string\"==typeof e.type,rN=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rO=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rC=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),r$=(e,t=\"\",r=new Map)=>{if(e)return eA(e)?eJ(e,e=>r$(e,t,r)):ef(e)?tz(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rO(n)+\"::\":\"\")+t+rO(a),value:rO(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rC(r,u)}):rC(r,e),r},rj=new WeakMap,rM=e=>rj.get(e),r_=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rU=(e,t,r,n,a,i)=>t?.[1]&&eJ(t9(e),o=>t[0][o]??=(i=X,ef(n=eJ(t[1],([t,r,n],a)=>tP(o,t)&&(i=void 0,!r||t1(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&r$(a,tL(n,/\\-/g,\":\"),r),i)),rF=()=>{},rq=(e,t)=>{if(h===(h=rB.tags))return rF(e,t);var r=e=>e?tJ(e)?[[e]]:eA(e)?eP(e,r):[eb(e)?[tK(e.match),e.selector,e.prefix]:[tK(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rF=(e,t)=>rU(e,n,t))(e,t)},rP=(e,t)=>tO(eR(t7(e,r_(t,Y)),t7(e,r_(\"base-\"+t,Y))),\" \"),rR={},rz=(e,t,r=rP(e,\"attributes\"))=>{r&&rU(e,rR[r]??=[{},tR(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tK(r||n),,t])],t),r$(rP(e,\"tags\"),void 0,t)},rD=(e,t,r=X,n)=>(r?t4(e,(e,r)=>r(rD(e,t,X)),eS(r)?r:void 0):tO(eR(t3(e,r_(t)),t7(e,r_(t,Y))),\" \"))??(n&&(g=rM(e))&&n(g))??null,rV=(e,t,r=X,n)=>\"\"===(y=rD(e,t,r,n))||(null==y?y:ei(y)),rW=(e,t,r,n)=>e?(rz(e,n??=new Map),t4(e,e=>{rq(e,n),r$(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rB={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rJ=[],rK=[],rG=(e,t=0)=>e.charCodeAt(t),rL=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rJ[rK[t]=e.charCodeAt(0)]=t);var rH=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rK[(16515072&t)>>18],rK[(258048&t)>>12],rK[(4032&t)>>6],rK[63&t]);return a.length+=n-r,rL(a)},rX=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rJ[rG(e,r++)]<<2|(t=rJ[rG(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rJ[rG(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rJ[rG(e,r++)]));return i},rY={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rZ=(e=256)=>e*Math.random()|0,rQ=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rZ()));for(r=0,i[n++]=g(f^16*rZ(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rZ();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rY[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},r0={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(r0);var{deserialize:r1,serialize:r2}=(C=r0.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r4=\"$ref\",r6=(e,t,r)=>ek(e)?L:r?t!==L:null===t||t,r3=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r6(t,n,r)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r4]||(e[r4]=o,l(()=>delete e[r4])),{[r4]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eA(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return V(()=>t?r2(u(e)??null):V(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},r5=e=>{var t,r,n=e=>eg(e)?e[r4]&&(r=(t??=[])[e[r4]])?r:(e[r4]&&(t[e[r4]]=e,delete e[r4]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?V(()=>r1(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},r8=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?V(()=>JSON.stringify(e),()=>JSON.stringify(r3(e,!1,r))):r3(e,!0,r),n);if(t)return[e=>r3(e,!1,r),e=>null==e?L:V(()=>r5(e),L),(e,t)=>n(e,t)];var[a,i,o]=rQ(e);return[(e,t)=>(t?Q:rH)(a(r3(e,!0,r))),e=>null!=e?r5(i(e instanceof Uint8Array?e:rX(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(m??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r8();var[r9,r7]=r8(null,{json:!0,prettify:!0}),ne=tG(\"\"+tQ.currentScript.src,\"#\"),nt=tG(\"\"+(ne[1]||\"\"),\";\"),nr=ne[0],nn=nt[1]||tU(nr,!1)?.host,na=e=>!!(nn&&tU(e,!1)?.host?.endsWith(nn)===Y),ni=(...e)=>tL(tO(e),/(^(?=\\?))|(^\\.(?=\\/))/,nr.split(\"?\")[0]),no=ni(\"?\",\"var\"),ns=ni(\"?\",\"mnt\");ni(\"?\",\"usr\");var nl=Symbol(),nu=Symbol(),nc=(e,t,r=Y,n=X)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tT(\"tail.js: \",\"90;3\"))+t);var a=e?.[nu];a&&(e=e[nl]),null!=e&&console.log(eg(e)?tT(r9(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,t,r])=>nc(e,t,r,!0)),t&&console.groupEnd()},[nf,nd]=r8(),[nv,np]=[tY,tY],[nh,ng]=tA(),ny=e=>{np===tY&&([nv,np]=r8(e),ng(nv,np))},nm=e=>t=>nb(e,t),nb=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nw,nk]=tA(),[nS,nA]=tA(),nI=e=>nT!==(nT=e)&&nk(nT=!1,nO(!0,!0)),nE=e=>nx!==(nx=!!e&&\"visible\"===document.visibilityState)&&nA(nx,!e,nN(!0,!0));nw(nE);var nT=!0,nx=!1,nN=tv(!1),nO=tv(!1);rs(window,[\"pagehide\",\"freeze\"],()=>nI(!1)),rs(window,[\"pageshow\",\"resume\"],()=>nI(!0)),rs(document,\"visibilitychange\",()=>(nE(!0),nx&&nI(!0))),nk(nT,nO(!0,!0));var nC=!1,n$=tv(!1),[nj,nM]=tA(),n_=th({callback:()=>nC&&nM(nC=!1,n$(!1)),frequency:2e4,once:!0,paused:!0}),nU=()=>!nC&&(nM(nC=!0,n$(!0)),n_.restart());rs(window,\"focus\",nU),rs(window,\"blur\",()=>n_.trigger()),rs(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nU),nU(),($=b||(b={}))[$.View=-3]=\"View\",$[$.Tab=-2]=\"Tab\",$[$.Shared=-1]=\"Shared\";var nF=t$(b,!1,\"local variable scope\"),nq=e=>nF.tryParse(e)??ry(e),nP=e=>nF.format(e)??ry.format(e),nR=e=>!!nF.tryParse(e?.scope),nz=tj({scope:nF},rb),nD=e=>null==e?void 0:ef(e)?e:e.source?nD(e.source):`${nq(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nV=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nW=0,nB=void 0,nJ=()=>(nB??tY())+\"_\"+nK(),nK=()=>(td(!0)-(parseInt(nB.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nW).toString(36),nG=e=>crypto.getRandomValues(e),nL=()=>tL(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nG(new Uint8Array(1))[0]&15>>e/4).toString(16)),nH={},nX={id:nB,heartbeat:td()},nY={knownTabs:{[nB]:nX},variables:{}},[nZ,nQ]=tA(),[n0,n1]=tA(),n2=tY,n4=e=>nH[nD(e)],n6=(...e)=>n5(e.map(e=>(e.cache=[td(),3e3],nz(e)))),n3=e=>eF(e,e=>e&&[e,nH[nD(e)]]),n5=e=>{var t=eF(e,e=>e&&[nD(e),e]);if(t?.length){var r=n3(e);e7(nH,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nY.variables,n),n2({type:\"patch\",payload:eL(n)})),n1(r,nH,!0)}};nh((e,t)=>{nw(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nB=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nH=eL(eR(eX(nH,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nD(e),e])))}else sessionStorage.setItem(F,e([nB,eF(nH,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n2=(t,r)=>{e&&(localStorage.setItem(F,e([nB,t,r])),localStorage.removeItem(F))},rs(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nB)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||n2({type:\"set\",payload:nY},a);else if(\"set\"===i&&r.active)e7(nY,o),e7(nH,o.variables),r.trigger();else if(\"patch\"===i){var s=n3(eF(o,1));e7(nY.variables,o),e7(nH,o),n1(s,nH,!1)}else\"tab\"===i&&(e7(nY.knownTabs,a,o),o&&nQ(\"tab\",o,!1))}}});var r=th(()=>nQ(\"ready\",nY,!0),-25),n=th({callback(){var e=td()-1e4;eJ(nY?.knownTabs,([t,r])=>r[0]<e&&tn(nY.knownTabs,t)),nX.heartbeat=td(),n2({type:\"tab\",payload:nX})},frequency:5e3,paused:!0}),a=e=>{n2({type:\"tab\",payload:e?nX:void 0}),e?(r.restart(),n2({type:\"query\"})):r.toggle(!1),n.toggle(e)};nw(e=>a(e),!0)},!0);var[n8,n9]=tA(),[n7,ae]=tA(),at=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?np:nd)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?nv:nf)([nB,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nB))return t>0&&(i=setInterval(()=>o(),t/2)),await K(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=rs(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})(U+\"rq\"),ar=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n9(e,a,r,e=>(o=a===L,a=e)),!o&&(i=n?nv(a,!0):JSON.stringify(a)))};if(!r)return await at(()=>eK(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?np:JSON.parse)?.(o):L;return null!=l&&ae(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},an=[\"scope\",\"key\",\"targetId\",\"version\"],aa=[...an,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ai=[...an,\"init\",\"purpose\",\"refresh\"],ao=[...aa,\"value\",\"force\",\"patch\"],as=new Map,al=(e,t)=>{var r=th(async()=>{var e=eF(as,([e,t])=>({...nV(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eW(t,t=>e5(as,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nD(e),i=ta(as,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eJ(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nw((e,t)=>r.toggle(e,e&&t>=3e3),!0),n0(e=>eJ(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rk(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await ar(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nD(e);n(r,e.result);var a=n4(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nR(e))return[to(e,ai),t];else if(eb(e.init)){var u={...nz(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rv.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&n5(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rk(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nD(e),n=n4(r);if(o(r,e.cache),nR(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nF(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,ao),t]}}),f=u.length?D((await ar(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n5(a),eJ(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,aa),cache:[t,t+(ta(i,nD(e))??3e3)]});return n7(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rA(e)),eF(e.set,e=>rA(e)));r?.length&&n5(eW(r,c,t))}}),u},au=(e,t,r=tX)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),nc({[nu]:eF(r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rh(tl(e),!0),{timestamp:e.timestamp-td()}))),e=>[e,e.type,X])},\"Posting \"+tI([tE(\"new event\",[eY(r,e=>!rg(e))||void 0]),tE(\"event patch\",[eY(r,e=>rg(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ar(e,{events:r,variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eJ(e,e=>nc(e,e.type)),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nS((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},ac=Symbol(),af=e=>{var t=new IntersectionObserver(e=>eJ(e,e=>e.target[ac]?.(e)),{threshold:eF(100,e=>e/100)});return(e,r)=>{var n,a;if(r&&(n=eX(r?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))){if(!eY(n))return;tH(),tp(rB.impressionThreshold),aC(),e[ac]=({isIntersecting:t,boundingClientRect:r,intersectionRect:n})=>{a||(e.style.border=\"1px solid blue\",e.style.position=\"relative\",(a=document.createElement(\"div\")).style.cssText=\"position:absolute;top:0;left:0;width:200px;height:100px;background-color:blue\",e.appendChild(a)),a.innerText=n.top+\"\"},t.observe(e)}}},ad=()=>{n0((e,t,r)=>{var n=eR(rw(eF(e,1))?.map(e=>[e,`${e.key} (${nP(e.scope)}, ${e.scope<0?\"client-side memory only\":rv.format(e.purposes)})`,X]),[[{[nu]:rw(eF(t,1))?.map(e=>[e,`${e.key} (${nP(e.scope)}, ${e.scope<0?\"client-side memory only\":rv.format(e.purposes)})`,X])},\"All variables\",Y]]);nc({[nu]:n},tT(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(t)} in total).`,\"2;3\"))})},av=()=>{var e=tZ?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tZ.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tZ.devicePixelRatio,width:t,height:r,landscape:a}}},ap=e=>tu(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>G({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...av()})),ah=(e,t=\"A\"===re(e)&&t3(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ag=(e,t=re(e),r=rV(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t8(e,\"type\"),\"button\",\"submit\")||r===Y),ay=(e,t=!1)=>({tagName:e.tagName,text:tN(t3(e,\"title\")?.trim()||t3(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ro(e):void 0}),am=(e,t,r=!1)=>{var n;return t4(e??t,e=>\"IMG\"===re(e)||e===t?(n={element:ay(e,r)},X):Y),n},ab=e=>{if(w)return w;ef(e)&&([t,e]=nd(e),e=r8(t)[1](e)),e7(rB,e),ny(ta(rB,\"encryptionKey\"));var t,r=ta(rB,\"key\"),n=tZ[rB.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rB.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>V(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nm(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nJ(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=al(no,l),c=au(no,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tZ,rB.name,{value:w=Object.freeze({id:\"tracker_\"+nJ(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):nd(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?nd(e):e),e=>{if(!e)return X;if(aX(e))rB.tags=e7({},rB.tags,e.tagAttributes);else if(aY(e))return rB.disabled=e.disable,X;else if(a0(e))return n=Y,X;else if(a5(e))return e(w),X;return p||a2(e)||aQ(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aQ(e)?-100:a2(e)?-50:a3(e)?-10:rx(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),V(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rx(t))c.post(t);else if(a1(t))u.get(...eh(t.get));else if(a3(t))u.set(...eh(t.set));else if(a2(t))tu(i,t.listener);else if(aQ(t))(e=V(()=>t.extension.setup(w),e=>nb(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(a5(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nb(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nb(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),ad(),nZ(async(e,t,r,a)=>{if(\"ready\"===e){var i=rT((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:_,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ap(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aK,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},aw=()=>k?.clientId,ak={scope:\"shared\",key:\"referrer\"},aS=(e,t)=>{w.variables.set({...ak,value:[aw(),e]}),t&&w.variables.get({scope:ak.scope,key:ak.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},aA=tv(),aI=tv(),aE=tv(),aT=1,ax=()=>aI(),[aN,aO]=tA(),aC=e=>{var t=tv(e,aA),r=tv(e,aI),n=tv(e,aE),a=tv(e,()=>aT);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),interactiveTime:n(e,i),activations:a(e,i)})},a$=aC(),aj=()=>a$(),[aM,a_]=tA(),aU=(e,t)=>(t&&eJ(aq,t=>e(t,()=>!1)),aM(e)),aF=new WeakSet,aq=document.getElementsByTagName(\"iframe\"),aP=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aR(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var az=e=>rW(e,void 0,e=>eF(eh(e5(rj,e)?.tags))),aD=e=>e?.component||e?.content,aV=e=>rW(e,t=>t!==e&&!!aD(e5(rj,t)),e=>(A=e5(rj,e),(A=e5(rj,e))&&eP(eR(A.component,A.content,A),\"tags\"))),aW=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eF(I,e=>({...e,rect:void 0}))},aB=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t4(e,e=>{var a=e5(rj,e);if(a){if(aD(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ro(e)||void 0;var u=aV(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aW({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rD(e,\"area\");c&&tc(s,...eF(c))}}),o.length&&tu(s,aW({id:\"\",rect:n,content:o})),eJ(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tO(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tO(a,\"/\")}:void 0},aJ=Symbol();j={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tQ.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=j[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aK=[{id:\"context\",setup(e){th(()=>eJ(aq,e=>tt(aF,e)&&a_(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=n4({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n4({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n6({scope:\"tab\",key:\"tabIndex\",value:n=n4({scope:\"shared\",key:\"tabIndex\"})?.value??n4({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rn(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tU(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nJ(),tab:nB,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:ru(),duration:a$(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),n6({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tF(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tL(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n4(ak)?.value;c&&na(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ak,value:void 0}))}var c=document.referrer||null;c&&!na(c)&&(k.externalReferrer={href:c,domain:rl(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aj()})),aO(k)}};return nj(e=>aE(e)),nS(e=>{e?(aI(Y),++aT):(aI(X),aE(X))}),rs(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aH(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rN(e)||rg(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=af(),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rj,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e5(rj,e))};return{decorate(e){eJ(e.components,e=>ta(e,\"track\"))},processCommand:e=>aZ(e)?(n(e),Y):a6(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=t3(a,e);){tt(n,a);var o=tG(t3(a,e),\"|\");t3(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{rs(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t4(n.target,e=>{ag(e)&&(o??=e),u=u||\"NAV\"===re(e);var t=rM(e),r=t?.component;!n.button&&r?.length&&!l&&(eJ(e.querySelectorAll(\"a,button\"),t=>ag(t)&&((l??=[]).length>3?eN():l.push({...ay(t,!0),component:t4(t,(e,t,r,n=rM(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rV(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rV(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aB(s,!1,f),v=az(s);a??=!u;var p={...(i??=Y)?{pos:ra(o,n),viewport:ru()}:null,...am(n.target,s),...d,timeOffset:aj(),...v};if(!o){f&&te(t,s,r=>{var a=ri(s,n);if(r)tu(r,a);else{var i=G({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e5(t,s)}),!0,s)}return r});return}if(ah(o)){var h=o.hostname!==location.hostname,{host:g,scheme:y,source:m}=tU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,G({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=G({clientId:nJ(),type:\"navigation\",href:h?o.href:m,external:h,domain:{host:g,scheme:y},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=na(w);if(k){aS(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rB.captureContextMenu)return;o.href=ns+\"=\"+S+encodeURIComponent(w),rs(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),rs(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t3(o,\"target\")!==window.name?(aS(b.clientId),b.self=X,tu(e,b)):rn(location.href,o.href)||(b.exit=b.external,aS(b.clientId)));return}var A=(t4(n.target,(e,t)=>!!(c??=aP(rM(e)?.cart??rD(e,\"cart\")))&&!c.item&&(c.item=e2(rM(e)?.content))&&t(c)),aR(c));(A||a)&&tu(e,A?G({type:\"cart_updated\",...p,...A}):G({type:\"component_click\",...p}))}})};r(document),aU(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=rr(Y);aN(()=>tm(()=>(t={},r=rr(Y)),250)),rs(window,\"scroll\",()=>{var n=rr(),a=rt();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aL(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aR(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return a4(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t5(i,r_(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ro(i).width,u=e5(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t5(i,r_(\"form-name\"))||t3(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aj()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return rs(i,\"submit\",()=>{a=aB(i),t[3]=3,u(()=>{i.isConnected&&ro(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e5(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rV(e,\"ref\"))&&(e.value||(e.value=nL()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tL(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aJ]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=ax())),u=-(l-(l=td(Y))),c=t[aJ];(t[aJ]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eJ(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&rs(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=ax()):o()));u(document),aU(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:_,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rf(n,r=rd(r)))return[!1,n];var a={level:rc.lookup(r.classification),purposes:rv.lookup(r.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:_}]}}),[!0,a]}},n={};return{processCommand(e){if(a8(e)){var a=e.consent.get;a&&t(a);var i=rd(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tQ.hasFocus()){var e=o.poll();if(e){var t=rd({...s,...e});if(t&&!rf(s,t)){var[n,a]=await r(t);n&&nc(a,\"Consent was updated from \"+l),s=t}}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aG=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aL=aG(\"cart\"),aH=aG(\"username\"),aX=aG(\"tagAttributes\"),aY=aG(\"disable\"),aZ=aG(\"boundary\"),aQ=aG(\"extension\"),a0=aG(Y,\"flush\"),a1=aG(\"get\"),a2=aG(\"listener\"),a4=aG(\"order\"),a6=aG(\"scan\"),a3=aG(\"set\"),a5=e=>\"function\"==typeof e,a8=aG(\"consent\");Object.defineProperty(tZ,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(ab)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
};

/**
 * A crypto provider based on linear feedback XOR, entropy and padding.
 */ class DefaultCryptoProvider {
    _currentCipherId;
    _ciphers;
    constructor(keys){
        if (!keys?.length) {
            this._currentCipherId = "";
            this._ciphers = {
                "": defaultTransport
            };
            return;
        }
        this._ciphers = Object.fromEntries(keys.map((key)=>[
                hash(key, 32),
                createTransport(key)
            ]));
        this._currentCipherId = hash(keys[0], 32);
    }
    hash(value, numericOrBits) {
        return this._ciphers[this._currentCipherId][2](value, numericOrBits);
    }
    decrypt(cipher) {
        let cipherId = "";
        cipher = cipher.replace(/^(.*?)!/, (_, m1)=>(cipherId = m1, ""));
        return (this._ciphers[cipherId] ?? this._ciphers[this._currentCipherId])[1](cipher);
    }
    encrypt(source) {
        return `${this._currentCipherId}!${this._ciphers[this._currentCipherId][0](source)}`;
    }
}

/**
 * A key that can be used to look up {@link Variable}s in Maps and Sets.
 */ const variableId = (variable)=>variable ? variable.targetId ? variable.scope + variable.targetId + variable.key : variable.scope + variable.key : undefined;
const copy = (variable, overrides)=>{
    return variable && {
        ...variable,
        ...variable.tags ? [
            ...variable.tags
        ] : {},
        ...overrides
    };
};
const patchSelector = (value, selector, update)=>{
    if (!selector) return update(value);
    let patchTarget;
    ("." + selector).split(".").forEach((segment, i, path)=>{
        let current = i ? patchTarget[segment] : value;
        if (current != null && !isPlainObject(current)) throw new TypeError(`Invalid patch operation. The selector does not address a property on an object.`);
        if (i === path.length - 1) {
            const updated = patchTarget[segment] = update(patchTarget[segment]);
            patchTarget[segment] = updated;
            if (update === undefined) {
                delete patchTarget[segment];
            }
        } else {
            if (!current) {
                patchTarget = i ? current = patchTarget[selector] ??= {} : value ??= {};
            }
        }
    });
    return value;
};
const requireNumberOrUndefined = (value)=>value === undefined || typeof value === "number" ? value : throwError("The current value must be undefined or a number.");
const applyPatch = async (current, setter)=>{
    if (isVariablePatchAction(setter)) {
        const patched = toNumericVariableEnums(await setter.patch(toNumericVariableEnums(current)));
        if (patched) {
            patched.classification ??= dataClassification.parse(current?.classification);
            patched.purposes ??= dataPurposes.parse(current?.purposes);
            !("tags" in patched) && (patched.tags = current?.tags);
        }
        return patched ?? undefined;
    }
    const classification = {
        classification: dataClassification.parse(setter.classification, false),
        purposes: dataPurposes(setter.purposes ?? current?.purposes)
    };
    const value = current?.value;
    setter.patch = patchType.parse(setter.patch);
    switch(setter.patch){
        case VariablePatchType.Add:
            return {
                ...classification,
                value: patchSelector(requireNumberOrUndefined(value), setter.selector, (value)=>(value ?? setter.seed ?? 0) + setter.value)
            };
        case VariablePatchType.Min:
        case VariablePatchType.Max:
            return {
                ...classification,
                value: patchSelector(value, setter.selector, (value)=>requireNumberOrUndefined(value) ? Math[setter.patch === VariablePatchType.Min ? "min" : "max"](value, setter.value) : setter.value)
            };
        case VariablePatchType.IfMatch:
        case VariablePatchType.IfNoneMatch:
            if (current?.value === setter.match === (setter.patch === VariablePatchType.IfNoneMatch)) {
                return undefined;
            }
            return {
                ...classification,
                value: patchSelector(value, setter.selector, ()=>setter.value)
            };
    }
};
const withSourceIndex = (items)=>items.map((item, sourceIndex)=>[
            sourceIndex,
            item
        ]);
const partitionItems = (items)=>items.map((item)=>item[1]);
const mergeKeys = async (results, partitionMappings, partitionResults)=>partitionMappings?.length ? (await partitionResults(partitionMappings.map((item)=>item?.[1]))).forEach((result, i)=>result && (results[partitionMappings[i][0]] = result)) : undefined;

const generateClientBootstrapScript = (config, encrypt)=>{
    // Add a layer of "security by obfuscation" - just in case.
    const tempKey = "" + Math.random();
    const clientConfig = {
        ...config,
        dataTags: undefined
    };
    return `((s=document.createElement("script"))=>{s.addEventListener("load",()=>window[${JSON.stringify(INITIALIZE_TRACKER_FUNCTION)}](init=>init(${JSON.stringify(encrypt ? httpEncode([
        tempKey,
        createTransport(tempKey)[0](clientConfig, true)
    ]) : clientConfig)})),true);s.src=${JSON.stringify(config.src)};document.head.appendChild(s)})();`;
};
const generateClientExternalNavigationScript = (requestId, url)=>{
    // TODO: Update if we decide to change the client to use BroadcastChannel (that would be, if Chrome fixes the bf_cache issues
    // where BroadcastChannel makes the page unsalvageable)
    return `<html><head><script>try{localStorage.setItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)},${JSON.stringify(JSON.stringify({
        requestId
    }))});localStorage.removeItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)});}catch(e){console.error(e);}location.replace(${JSON.stringify(url)});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};

const scripts = {
    main: {
        text: scripts$1.main.text,
        gzip: from64u(scripts$1.main.gzip),
        br: from64u(scripts$1.main.br)
    },
    debug: scripts$1.debug
};
const MAX_CACHE_HEADERS = {
    "cache-control": "private, max-age=2147483648"
}; // As long as possible (https://datatracker.ietf.org/doc/html/rfc9111#section-1.2.2).
let SCRIPT_CACHE_HEADERS = {
    "cache-control": "private, max-age=604800"
}; // A week
class RequestHandler {
    _cookies;
    _endpoint;
    _extensionFactories;
    _lock = createLock();
    _schema;
    _trackerName;
    _extensions;
    _initialized = false;
    _script;
    /** @internal */ _cookieNames;
    environment;
    _clientConfig;
    /** @internal */ _clientIdGenerator;
    _config;
    _defaultConsent;
    constructor(config){
        let { trackerName, endpoint, extensions, cookies, client, clientIdGenerator, defaultConsent } = config = merge({}, DEFAULT, config);
        this._config = config;
        this._trackerName = trackerName;
        this._endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
        this._defaultConsent = {
            level: dataClassification(defaultConsent.level),
            purposes: dataPurposes(defaultConsent.purposes)
        };
        this._extensionFactories = map(extensions);
        this._cookies = new CookieMonster(cookies);
        this._clientIdGenerator = clientIdGenerator ?? new DefaultClientIdGenerator();
        this._cookieNames = {
            consent: cookies.namePrefix + ".consent",
            session: cookies.namePrefix + ".session",
            device: cookies.namePrefix + ".device",
            deviceByPurpose: obj(dataPurposes.pure.map(([name, flag])=>[
                    flag,
                    cookies.namePrefix + (flag === DataPurposeFlags.Necessary ? "" : "," + dataPurposes.format(name))
                ]))
        };
        this._clientConfig = {
            ...client,
            src: this._endpoint
        };
    }
    async applyExtensions(tracker, context) {
        for (const extension of this._extensions){
            // Call the apply method in post context to let extension do whatever they need before events are processed (e.g. initialize session).
            try {
                await extension.apply?.(tracker, context);
            } catch (e) {
                this._logExtensionError(extension, "apply", e);
            }
        }
    }
    /** @internal */ async _validateLoginEvent(userId, evidence) {
        //TODO
        return true;
    }
    getClientCookies(tracker) {
        return this._cookies.mapResponseCookies(tracker.cookies);
    }
    getClientScripts(tracker, { initialCommands, nonce } = {}) {
        return this._getClientScripts(tracker, true, initialCommands, nonce);
    }
    async initialize() {
        if (this._initialized) return;
        await this._lock(async ()=>{
            if (this._initialized) return;
            let { host, crypto, environmentTags, encryptionKeys, schemas, storage } = this._config;
            schemas ??= [];
            if (!schemas.find((schema)=>isPlainObject(schema) && schema.$id === "urn:tailjs:core")) {
                schemas.unshift(defaultSchema);
            }
            for (const [schema, i] of rank(schemas)){
                if (isString(schema)) {
                    schemas[i] = JSON.parse(required(await host.readText(schema), ()=>`The schema path '${schema}' does not exists`));
                }
            }
            if (!storage) {
                storage = {
                    default: {
                        storage: new InMemoryStorage({
                            [VariableScope.Session]: (this._config.sessionTimeout ?? 30) * MINUTE
                        }),
                        schema: "*"
                    }
                };
            }
            this._schema = SchemaManager.create(schemas);
            this.environment = new TrackerEnvironment(host, crypto ?? new DefaultCryptoProvider(encryptionKeys), new ParsingVariableStorage(new VariableStorageCoordinator({
                schema: this._schema,
                mappings: storage
            })), environmentTags);
            if (this._config.debugScript) {
                if (typeof this._config.debugScript === "string") {
                    this._script = await this.environment.readText(this._config.debugScript, async (_, newText)=>{
                        const updated = await newText();
                        if (updated) {
                            this._script = updated;
                        }
                        return true;
                    }) ?? undefined;
                } else {
                    this._script = scripts.debug;
                }
            }
            await this.environment.storage.initialize?.(this.environment);
            this._extensions = [
                Timestamps,
                new TrackerCoreEvents(),
                new CommerceExtension(),
                ...await Promise.all(this._extensionFactories.map(async (factory)=>{
                    let extension = null;
                    try {
                        extension = await factory();
                        if (extension?.initialize) {
                            await extension.initialize?.(this.environment);
                            this.environment.log(extension, `The extension ${extension.id} was initialized.`);
                        }
                        return extension;
                    } catch (e) {
                        this._logExtensionError(extension, extension ? "update" : "factory", e);
                        return null;
                    }
                }))
            ].filter((item)=>item != null);
            this._initialized = true;
        });
    }
    async post(tracker, eventBatch, options) {
        const context = {
            passive: !!options?.passive
        };
        let events = eventBatch;
        await this.initialize();
        const validateEvents = (events)=>map(events, (ev)=>isValidationError(ev) ? ev : this._config.allowUnknownEventTypes && !this._schema.getType(ev.type) && ev || this._schema.patch(ev.type, ev, tracker.consent));
        let parsed = validateEvents(eventBatch);
        const sourceIndices = new Map();
        parsed.forEach((item, i)=>{
            sourceIndices.set(item, i);
        });
        await tracker._applyExtensions(options);
        const validationErrors = [];
        function collectValidationErrors(parsed) {
            const events = [];
            for (const item of parsed){
                if (isValidationError(item)) {
                    validationErrors.push({
                        // The key for the source index of a validation error may be the error itself during the initial validation.
                        sourceIndex: sourceIndices.get(item.source) ?? sourceIndices.get(item),
                        source: item.source,
                        error: item.error
                    });
                } else {
                    events.push(item);
                }
            }
            return events;
        }
        const patchExtensions = this._extensions.filter((ext)=>ext.patch);
        const callPatch = async (index, results)=>{
            const extension = patchExtensions[index];
            const events = collectValidationErrors(validateEvents(results));
            if (!extension) return events;
            try {
                return collectValidationErrors(validateEvents(await extension.patch(events, async (events)=>{
                    return await callPatch(index + 1, events);
                }, tracker, context)));
            } catch (e) {
                this._logExtensionError(extension, "update", e);
                return events;
            }
        };
        eventBatch = await callPatch(0, parsed);
        const extensionErrors = {};
        if (options.routeToClient) {
            // TODO: Find a way to push these. They are for external client-side trackers.
            tracker._clientEvents.push(...events);
        } else {
            //console.log("Posted", eventBatch);
            await Promise.all(this._extensions.map(async (extension)=>{
                try {
                    await extension.post?.(eventBatch, tracker, context) ?? Promise.resolve();
                } catch (e) {
                    extensionErrors[extension.id] = e instanceof Error ? e : new Error(e?.toString());
                }
            }));
        }
        if (validationErrors.length || some(extensionErrors)) {
            throw new PostError(validationErrors, extensionErrors);
        }
        return {};
    }
    async processRequest(request) {
        if (!request.url) return null;
        let { method, url, headers: sourceHeaders, payload: getRequestPayload, clientIp } = request;
        await this.initialize();
        const { host, path, query } = parseUri(url);
        if (host == null || path == null) {
            return null;
        }
        const headers = Object.fromEntries(Object.entries(sourceHeaders).filter(([, v])=>!!v).map(([k, v])=>[
                k.toLowerCase(),
                Array.isArray(v) ? v.join(",") : v
            ]));
        let trackerInitializationOptions;
        let trackerSettings = deferred(async ()=>{
            clientIp ??= headers["x-forwarded-for"]?.[0] ?? obj(parseQueryString(headers["forwarded"]))?.["for"] ?? undefined;
            let clientEncryptionKey;
            if (this._config.clientEncryptionKeySeed) {
                clientEncryptionKey = await this._clientIdGenerator.generateClientId(this.environment, request, true, this._config.clientEncryptionKeySeed);
            }
            return {
                headers,
                host,
                path,
                url,
                queryString: Object.fromEntries(Object.entries(query ?? {}).map(([key, value])=>[
                        key,
                        !value ? [] : Array.isArray(value) ? value.map((value)=>value || "") : [
                            value
                        ]
                    ])),
                clientIp,
                clientId: await this._clientIdGenerator.generateClientId(this.environment, request, false, this._config.clientEncryptionKeySeed ?? ""),
                requestHandler: this,
                defaultConsent: this._defaultConsent,
                cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
                clientEncryptionKey,
                transport: createTransport(clientEncryptionKey)
            };
        });
        /**
     * Set trackerInit before calling this or this first time, if something is needed.
     *
     * The reason it is async is if a consuming API wants to use the tracker in its own code.
     * The overhead of initializing the tracker should not be included if it doesn't, and no request was handled from the URL.
     */ const resolveTracker = deferred(async ()=>new Tracker(await trackerSettings())._ensureInitialized(trackerInitializationOptions));
        // This property can be read from external hosts to get the request handler both from an actual tracker and this handle.
        resolveTracker._requestHandler = this;
        const result = async (response, { /** Don't write any cookies, changed or not.
         * In situations where we redirect or what we are doing might be interpreted as "link decoration"
         * we don't want the browser to suddenly restrict the age of the user's cookies.
         */ sendCookies = true, /** Send the response as JSON */ json = false } = {})=>{
            if (response) {
                response.headers ??= {};
                if (resolveTracker.resolved) {
                    const resolvedTracker = await resolveTracker();
                    if (sendCookies) {
                        await resolvedTracker._persist(true);
                        response.cookies = this.getClientCookies(resolvedTracker);
                    } else {
                        await resolvedTracker._persist(false);
                    }
                }
                if (isPlainObject(response.body)) {
                    response.body = response.headers?.["content-type"] === "application/json" || json ? JSON.stringify(response.body) : (await trackerSettings()).transport[0](response.body, true);
                }
                if (isString(response.body) && !response.headers?.["content-type"]) {
                    // This is probably a lie, but we pretend everything is text to avoid preflight.
                    (response.headers ??= {})["content-type"] = "text/plain";
                }
            }
            return {
                tracker: resolveTracker,
                response: response
            };
        };
        try {
            let requestPath = path;
            if (requestPath.startsWith(this._endpoint)) {
                requestPath = requestPath.substring(this._endpoint.length);
                let queryValue;
                switch(method.toUpperCase()){
                    case "GET":
                        {
                            if ((queryValue = join(query?.[INIT_SCRIPT_QUERY])) != null) {
                                // This is set by most modern browsers.
                                // It prevents external scripts to try to get a hold of the storage key via XHR.
                                const secDest = headers["sec-fetch-dest"];
                                if (secDest && secDest !== "script") {
                                    // Crime! Deny in a non-helpful way.
                                    return result({
                                        status: 400,
                                        headers: {
                                            ...SCRIPT_CACHE_HEADERS,
                                            vary: "sec-fetch-dest"
                                        }
                                    });
                                }
                                const { clientEncryptionKey } = await trackerSettings();
                                return result({
                                    status: 200,
                                    body: generateClientBootstrapScript({
                                        ...this._clientConfig,
                                        encryptionKey: clientEncryptionKey
                                    }, true),
                                    headers: {
                                        "content-type": "application/javascript",
                                        ...SCRIPT_CACHE_HEADERS,
                                        vary: "sec-fetch-dest"
                                    }
                                });
                            }
                            if ((queryValue = join(query?.[CLIENT_SCRIPT_QUERY])) != null) {
                                return result({
                                    status: 200,
                                    body: await this._getClientScripts(resolveTracker, false),
                                    cacheKey: "external-script",
                                    headers: {
                                        "content-type": "application/javascript",
                                        ...SCRIPT_CACHE_HEADERS
                                    }
                                });
                            }
                            if ((queryValue = join(query?.[CONTEXT_NAV_QUERY])) != null) {
                                // The user navigated via the context menu in their browser.
                                // If the user has an active session we respond with a small script, that will push the request ID
                                // that caused the navigation to the other browser tabs.
                                // If there is no session it means the user might have shared the link with someone else,
                                // and we must not set any cookies or do anything but redirect since it does not count as a visit to the site.
                                trackerInitializationOptions = {
                                    passive: true
                                };
                                const [, requestId, targetUri] = match(join(queryValue), /^([0-9]*)(.+)$/) ?? [];
                                if (!targetUri) return result({
                                    status: 400
                                });
                                if (!requestId || // We need to initialize the tracker to see if it has a session.
                                !(await resolveTracker())?.sessionId) {
                                    return result({
                                        status: 301,
                                        headers: {
                                            location: targetUri,
                                            ...MAX_CACHE_HEADERS
                                        }
                                    }, {
                                        sendCookies: false
                                    });
                                }
                                return result({
                                    status: 200,
                                    body: generateClientExternalNavigationScript(requestId, targetUri),
                                    headers: {
                                        "content-type": "text/html",
                                        ...SCRIPT_CACHE_HEADERS,
                                        vary: "sec-fetch-dest"
                                    }
                                });
                            }
                            if ((queryValue = join(query?.[SCHEMA_QUERY])) != null) {
                                return result({
                                    status: 200,
                                    body: this._schema.schema.definition,
                                    headers: {
                                        "content-type": "application/json"
                                    },
                                    cacheKey: "types"
                                });
                            }
                            // Default for GET is to send script.
                            const scriptHeaders = {
                                "content-type": "application/javascript",
                                ...SCRIPT_CACHE_HEADERS
                            };
                            // Check if we are using a debugging script.
                            let script = this._script;
                            if (!script) {
                                const accept = headers["accept-encoding"]?.split(",").map((value)=>value.toLowerCase().trim()) ?? [];
                                if (accept.includes("br")) {
                                    script = scripts.main.br;
                                    scriptHeaders["content-encoding"] = "br";
                                } else if (accept.includes("gzip")) {
                                    script = scripts.main.gzip;
                                    scriptHeaders["content-encoding"] = "gzip";
                                } else {
                                    script = scripts.main.text;
                                }
                            }
                            return result({
                                status: 200,
                                body: script,
                                cacheKey: "script",
                                headers: scriptHeaders
                            });
                        }
                    case "POST":
                        {
                            if ((queryValue = join(query?.[EVENT_HUB_QUERY])) != null) {
                                const payload = await getRequestPayload?.();
                                if (payload == null || payload.length === 0) {
                                    return result({
                                        status: 400,
                                        body: "No data."
                                    });
                                }
                                try {
                                    let postRequest;
                                    let json = false;
                                    if (headers["content-type"] === "application/json") {
                                        if (headers["sec-fetch-dest"] && !this._config.allowBrowserJson) {
                                            // Crime! Deny in a non-helpful way.
                                            return result({
                                                status: 400,
                                                headers: {
                                                    ...SCRIPT_CACHE_HEADERS,
                                                    vary: "sec-fetch-dest"
                                                }
                                            });
                                        }
                                        json = true;
                                        postRequest = JSON.parse(decodeUtf8(payload));
                                    } else {
                                        const { transport: cipher } = await trackerSettings();
                                        postRequest = cipher[1](payload);
                                    }
                                    if (!postRequest.events && !postRequest.variables) {
                                        return result({
                                            status: 400
                                        });
                                    }
                                    trackerInitializationOptions = {
                                        deviceId: postRequest.deviceId,
                                        deviceSessionId: postRequest.deviceId
                                    };
                                    const resolvedTracker = await resolveTracker();
                                    const response = {};
                                    if (postRequest.events) {
                                        // This returns a response that may have changed variables in it.
                                        // A mechanism for pushing changes without using cookies is still under development,
                                        // so this does nothing for the client atm.
                                        await resolvedTracker.post(postRequest.events, {
                                            passive: postRequest.events.every(isPassiveEvent),
                                            deviceSessionId: postRequest.deviceSessionId,
                                            deviceId: postRequest.deviceId
                                        });
                                    }
                                    if (postRequest.variables) {
                                        if (postRequest.variables.get) {
                                            (response.variables ??= {}).get = await resolvedTracker.get(postRequest.variables.get, {
                                                client: true
                                            }).all;
                                        }
                                        if (postRequest.variables.set) {
                                            (response.variables ??= {}).set = await resolvedTracker.set(postRequest.variables.set, {
                                                client: true
                                            }).all;
                                        }
                                    }
                                    return result(response.variables ? {
                                        status: 200,
                                        body: response
                                    } : {
                                        status: 204
                                    }, {
                                        json
                                    });
                                } catch (error) {
                                    this.environment.log({
                                        group: "system/request-handler",
                                        source: "post"
                                    }, error);
                                    if (error instanceof PostError) {
                                        return result({
                                            status: Object.keys(error.extensions).length ? 500 : 400,
                                            body: error.message,
                                            error
                                        });
                                    }
                                    throw error;
                                }
                            }
                        }
                }
                return result({
                    status: 400,
                    body: "Bad request."
                });
            }
        } catch (ex) {
            console.error("Unexpected error while processing request.", ex);
            return result({
                status: 500,
                body: ex.toString()
            });
        }
        return {
            tracker: resolveTracker,
            response: null
        };
    }
    async _getClientScripts(tracker, html, initialCommands, nonce) {
        if (!this._initialized) {
            return undefined;
        }
        const trackerScript = [];
        const wrapTryCatch = (s)=>`try{${s}}catch(e){console.error(e);}`;
        const trackerRef = this._trackerName;
        if (html) {
            trackerScript.push(`window.${trackerRef}||(${trackerRef}=[]);`);
        }
        const inlineScripts = [
            trackerScript.join("")
        ];
        const otherScripts = [];
        await forEachAsync(this._extensions.map(async (extension)=>extension.getClientScripts && extension.getClientScripts(tracker)), async (scripts)=>forEach(array(await scripts), (script)=>{
                if ("inline" in script) {
                    // Prevent errors from preempting other scripts.
                    script.inline = wrapTryCatch(script.inline);
                    if (script.allowReorder !== false) {
                        inlineScripts.push(script.inline);
                        return;
                    }
                }
            }));
        if (html) {
            const keyPrefix = this._clientConfig.key ? JSON.stringify(this._clientConfig.key) + "," : "";
            if (tracker.resolved) {
                const pendingEvents = tracker.resolved.clientEvents;
                pendingEvents.length && inlineScripts.push(`${trackerRef}.push(${keyPrefix}${pendingEvents.map((event)=>typeof event === "string" ? event : JSON.stringify(event)).join(", ")});`);
            }
            if (initialCommands) {
                inlineScripts.push(`${trackerRef}.push(${keyPrefix}${isString(initialCommands) ? JSON.stringify(initialCommands) : httpEncode(initialCommands)});`);
            }
            otherScripts.push({
                src: `${this._endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName ? `#${this._trackerName}` : ""}`,
                defer: true
            });
        }
        const js = [
            {
                inline: inlineScripts.join("")
            },
            ...otherScripts
        ].map((script, i)=>{
            if ("inline" in script) {
                return html ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${script.inline}</script>` : script.inline;
            } else {
                return html ? `<script src='${script.src}?init'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
                    src: script.src,
                    async: script.defer
                })}))}catch(e){console.error(e);}`;
            }
        }).join("");
        return js;
    }
    _logExtensionError(extension, method, error) {
        this.environment.log(extension, {
            level: "error",
            message: `An error occurred when invoking the method '${method}' on an extension.`,
            group: "extensions",
            error
        });
    }
}

const createInitialScopeData = (id, timestamp, additionalData)=>({
        id,
        firstSeen: timestamp,
        lastSeen: timestamp,
        views: 0,
        isNew: true,
        ...additionalData
    });
class Tracker {
    /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */ _eventQueue = [];
    _extensionState = 0;
    _initialized;
    _requestId;
    _clientId;
    /** @internal  */ _clientEvents = [];
    /** @internal */ _requestHandler;
    clientIp;
    cookies;
    disabled;
    env;
    headers;
    queryString;
    referrer;
    requestItems;
    /** Transient variables that can be used by extensions whilst processing a request. */ transient;
    /** Variables that have been added or updated during the request (cf. {@link TrackerStorageContext.push}). */ _changedVariables = [];
    _clientCipher;
    _defaultConsent;
    host;
    path;
    url;
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, clientId, defaultConsent }){
        this.disabled = disabled;
        this._requestHandler = requestHandler;
        this.env = requestHandler.environment;
        this.host = host;
        this.path = path;
        this.url = url;
        this._defaultConsent = defaultConsent;
        this.queryString = queryString ?? {};
        this.headers = headers ?? {};
        this.cookies = cookies ?? {};
        this.transient = {};
        this.requestItems = new Map();
        this.clientIp = clientIp;
        this.referrer = this.headers["referer"] ?? null;
        // Defaults to unencrypted transport if nothing is specified.
        this._clientCipher = cipher ?? defaultTransport;
        this._clientId = clientId;
    }
    get clientEvents() {
        return this._clientEvents;
    }
    /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
   *
   * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
   * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
   *
   */ _sessionReferenceId;
    /** @internal */ _session;
    /** @internal */ _device;
    /**
   * See {@link Session.expiredDeviceSessionId}.
   * @internal
   */ _expiredDeviceSessionId;
    /**
   * Device variables are only persisted in the device.
   * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
   */ _clientDeviceCache;
    _consent = {
        level: DataClassification.Anonymous,
        purposes: DataPurposeFlags.Necessary
    };
    get consent() {
        return this._consent;
    }
    get requestId() {
        return `${this._requestId}`;
    }
    get initialized() {
        return this._initialized;
    }
    get session() {
        return this._session?.value;
    }
    get sessionId() {
        return this.session?.id;
    }
    get deviceSessionId() {
        return this._session?.value?.deviceSessionId;
    }
    get device() {
        return this._device?.value;
    }
    get deviceId() {
        return this._session?.value?.deviceId;
    }
    get authenticatedUserId() {
        return this._session?.value?.userId;
    }
    httpClientEncrypt(value) {
        return this._clientCipher[0](value);
    }
    httpClientDecrypt(encoded) {
        return this._clientCipher[1](encoded);
    }
    /** @internal */ async _applyExtensions(options) {
        await this._ensureInitialized(options);
        if (this._extensionState === 0) {
            this._extensionState = 1;
            try {
                await this._requestHandler.applyExtensions(this, {
                    passive: !!options.passive
                });
            } finally{
                this._extensionState = 2;
                if (this._eventQueue.length) {
                    for (const [events, options] of this._eventQueue.splice(0)){
                        await this.post(events, options);
                    }
                }
            }
        }
    }
    async forwardRequest(request) {
        const finalRequest = {
            url: request.url,
            binary: request.binary,
            method: request.method,
            headers: {
                ...this.headers
            }
        };
        if (request.headers) {
            Object.assign(finalRequest.headers, request.headers);
        }
        // Merge the requests cookies, and whatever cookies might have been added to the forwarded request.
        // The latter overwrites cookies with the same name if they were also sent by the client.
        const cookies = map(new Map(concat(map(this.cookies, ([name, cookie])=>[
                name,
                cookie.value
            ]), map(CookieMonster.parseCookieHeader(finalRequest.headers["cookies"])?.[requestCookies], ([name, cookie])=>[
                name,
                cookie.value
            ]))), ([...args])=>args.map((value)=>encodeURIComponent(value ?? "")).join("=")).join("; ");
        if (cookies.length) {
            finalRequest.headers["cookie"] = cookies;
        }
        const response = await this._requestHandler.environment.request(finalRequest);
        return response;
    }
    async post(events, options = {}) {
        if (this._extensionState === 1) {
            this._eventQueue.push([
                events,
                options
            ]);
            return {};
        }
        const result = await this._requestHandler.post(this, events, options);
        if (this._changedVariables.length) {
            ((result.variables ??= {}).get ??= []).push(...this._changedVariables);
        }
        return result;
    }
    // #region DeviceData
    _getClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = this._clientDeviceCache = {};
            let timestamp;
            dataPurposes.pure.map(([purpose, flag])=>{
                // Device variables are stored with a cookie for each purpose.
                forEach(this.httpClientDecrypt(this.cookies[this._requestHandler._cookieNames.deviceByPurpose[purpose]]?.value), (value)=>{
                    update(deviceCache.variables ??= {}, purpose, (current)=>{
                        current ??= {
                            scope: VariableScope.Device,
                            key: value[0],
                            classification: value[1],
                            version: value[2],
                            value: value[3],
                            purposes: value[4],
                            created: timestamp ??= now(),
                            modified: timestamp ??= now(),
                            accessed: timestamp ??= now()
                        };
                        current.purposes |= flag;
                        return current;
                    });
                });
            });
            return this._clientDeviceCache.variables;
        }
    }
    /**
   * Used by the {@link TrackerVariableStorage} to maintain device data stored in the device and only briefly cached on the server.
   * @internal
   */ _touchClientDeviceData() {
        if (this._clientDeviceCache) {
            this._clientDeviceCache.touched = true;
        }
    }
    // #endregion
    /**
   *
   * Initializes the tracker with session and device data.
   * The deviceId ans deviceSessionId parameters are only used if no session already exists.
   * After that they will stick. This means if a device starts a new server session, its device session will remain.
   * Similarly, if an old frozen tab suddenly wakes up it will get the new device session.
   * (so yes, they can hypothetically be split across the same tab even though that goes against the definition).
   *
   * @internal */ async _ensureInitialized({ deviceId, deviceSessionId, passive } = {}) {
        if (this._initialized === (this._initialized = true)) {
            return this;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        const consentData = (this.cookies[this._requestHandler._cookieNames.consent]?.value ?? `${this._defaultConsent.purposes}@${this._defaultConsent.level}`).split("@");
        this._consent = {
            level: dataClassification.tryParse(consentData[1]) ?? this._defaultConsent.level,
            purposes: dataPurposes.tryParse(consentData[0]?.split(",")) ?? this._defaultConsent.purposes
        };
        await this._ensureSession(timestamp, {
            deviceId,
            deviceSessionId,
            passive
        });
        return this;
    }
    async reset(session, device = false, consent = false, referenceTimestamp, deviceId, deviceSessionId) {
        if (consent) {
            await this.updateConsent(DataClassification.Anonymous, DataPurposeFlags.Necessary);
        }
        if (this._session) {
            await this._ensureSession(referenceTimestamp ?? now(), {
                deviceId,
                deviceSessionId,
                resetSession: session,
                resetDevice: device
            });
        }
    }
    async updateConsent(level, purposes) {
        if (!this._session) return;
        level = dataClassification.parse(level) ?? this.consent.level;
        purposes = dataPurposes.parse(purposes) ?? this.consent.purposes;
        if (level < this.consent.level || ~purposes & this.consent.purposes) {
            // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
            await this.purge({
                session: true,
                device: true,
                filter: {
                    purposes: ~(purposes | DataPurposeFlags.Any_Anonymous),
                    classification: {
                        min: level + 1
                    }
                }
            });
        }
        let previousLevel = this._consent.level;
        this._consent = {
            level,
            purposes
        };
        if (level <= DataClassification.Anonymous !== previousLevel <= DataClassification.Anonymous) {
            // We switched from cookie-less to cookies or vice versa.
            // Refresh scope infos and anonymous session pointer.
            await this._ensureSession(now(), {
                refreshState: true
            });
            console.log("Updated consent ", this._consent);
        }
    }
    async _ensureSession(timestamp, { deviceId, deviceSessionId = this.deviceSessionId, passive = false, resetSession = false, resetDevice = false, refreshState = false } = {}) {
        if ((resetSession || resetDevice) && this._sessionReferenceId) {
            // Purge old data. No point in storing this since it will no longer be used.
            await this.purge({
                session: resetSession,
                device: resetDevice
            });
        } else if (this._session?.value && !refreshState) {
            return;
        }
        // In case we refresh, we might already have a session ID.
        let sessionId = this.sessionId;
        if (this._consent.level > DataClassification.Anonymous) {
            if (sessionId && this._sessionReferenceId !== sessionId && !passive) {
                // We switched from cookie-less to cookies. Purge reference.
                await this.env.storage.set([
                    {
                        scope: VariableScope.Session,
                        key: SESSION_REFERENCE_KEY,
                        targetId: this._sessionReferenceId,
                        value: undefined,
                        force: true
                    }
                ]);
            }
            // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
            // This means clients must make sure the initial request to endpoint completes before more are sent (or at least do a fair effort).
            this._sessionReferenceId = sessionId = (resetSession ? undefined : this.httpClientDecrypt(this.cookies[this._requestHandler._cookieNames.session]?.value)?.id) ?? (passive ? undefined : sessionId ?? await this.env.nextId("session"));
            this.cookies[this._requestHandler._cookieNames.session] = {
                httpOnly: true,
                sameSitePolicy: "None",
                essential: true,
                value: this.httpClientEncrypt({
                    id: this._sessionReferenceId
                })
            };
        } else if (this._clientId) {
            if (sessionId && this._sessionReferenceId === sessionId && !passive) {
                // We switched from cookies to cookie-less. Remove deviceId and device info.
                await this.env.storage.set(truish([
                    {
                        scope: VariableScope.Session,
                        key: SCOPE_INFO_KEY,
                        targetId: sessionId,
                        patch: (current)=>({
                                value: {
                                    ...current?.value,
                                    deviceId: undefined
                                }
                            })
                    },
                    this.deviceId && {
                        scope: VariableScope.Device,
                        key: SCOPE_INFO_KEY,
                        targetId: this.deviceId,
                        value: undefined
                    }
                ]));
                this._device = undefined;
            }
            this._sessionReferenceId = this._clientId;
            sessionId = (await this.env.storage.get([
                {
                    scope: VariableScope.Session,
                    key: SESSION_REFERENCE_KEY,
                    targetId: this._sessionReferenceId,
                    init: async ()=>passive ? undefined : {
                            tags: [
                                "anonymous"
                            ],
                            value: sessionId ?? await this.env.nextId()
                        }
                }
            ]).result).value;
        } else {
            // We do not have any information available for assigning a session ID.
            this._session = this._device = undefined;
            return;
        }
        if (sessionId == null) {
            return;
        }
        this._session = // We bypass the TrackerVariableStorage here and use the environment directly.
        // The session ID we currently have is provisional,
        // and will not become the tracker's actual session ID before the info variable has been set.
        requireFound(restrictTargets(await this.env.storage.get([
            {
                scope: VariableScope.Session,
                key: SCOPE_INFO_KEY,
                targetId: sessionId,
                init: async ()=>{
                    if (passive) return undefined;
                    let cachedDeviceData;
                    if (this.consent.level > DataClassification.Anonymous) {
                        cachedDeviceData = resetDevice ? undefined : this._getClientDeviceVariables()?.[SCOPE_INFO_KEY]?.value;
                    }
                    return {
                        ...Necessary,
                        value: createInitialScopeData(sessionId, timestamp, {
                            deviceId: this._consent.level > DataClassification.Anonymous ? deviceId ?? (resetDevice ? undefined : cachedDeviceData?.id) ?? await this.env.nextId("device") : undefined,
                            deviceSessionId: deviceSessionId ?? await this.env.nextId("device-session"),
                            previousSession: cachedDeviceData?.lastSeen,
                            hasUserAgent: false
                        })
                    };
                }
            }
        ]).result));
        if (this._session.value) {
            let device = this._consent.level > DataClassification.Anonymous && deviceId ? await this.env.storage.get([
                {
                    scope: VariableScope.Device,
                    key: SCOPE_INFO_KEY,
                    targetId: this.deviceId,
                    init: async ()=>({
                            classification: this.consent.level,
                            value: createInitialScopeData(this._session.value.deviceId, timestamp, {
                                sessions: 1
                            })
                        })
                }
            ]).result : undefined;
            this._device = device;
            if (device?.value && device.status !== VariableResultStatus.Created && this.session?.isNew) {
                // A new session started on an existing device.
                this._device = await this.env.storage.set([
                    {
                        scope: VariableScope.Device,
                        key: SCOPE_INFO_KEY,
                        targetId: this.deviceId,
                        patch: (device)=>device && {
                                ...device,
                                value: {
                                    ...device.value,
                                    sessions: device.value.sessions + 1,
                                    lastSeen: this.session.lastSeen
                                }
                            }
                    }
                ]).variable;
            }
            if (deviceSessionId != null && this.deviceSessionId != null && deviceSessionId !== this.deviceSessionId) {
                this._expiredDeviceSessionId = deviceSessionId;
            }
        }
    }
    /**
   *  Must be called last by the request handler just before a response is sent.
   *  The tracker must not be used afterwards.
   *  @internal
   * */ async _persist(sendCookies = false) {
        if (sendCookies) {
            this.cookies[this._requestHandler._cookieNames.consent] = {
                httpOnly: true,
                maxAge: Number.MAX_SAFE_INTEGER,
                essential: true,
                sameSitePolicy: "None",
                value: this.consent.level > DataClassification.Anonymous ? this.consent.purposes + "@" + this.consent.level : null
            };
            const splits = {};
            if (this._clientDeviceCache?.touched) {
                // We have updated device data and need to refresh to get whatever other processes may have written (if any).
                const deviceValues = (await this.query([
                    {
                        scopes: [
                            VariableScope.Device
                        ],
                        keys: [
                            ":*"
                        ]
                    }
                ], {
                    top: 1000,
                    ifNoneMatch: map(this._clientDeviceCache?.variables, ([, variable])=>variable)
                })).results;
                forEach(deviceValues, (variable)=>{
                    dataPurposes.map(variable.purposes, ([, purpose])=>(splits[purpose] ??= []).push([
                            variable.key,
                            variable.classification,
                            variable.version,
                            variable.value,
                            variable.purposes
                        ]));
                });
            }
            if (this.consent.level === DataClassification.Anonymous) {
                // Clear session cookie if we have one.
                this.cookies[this._requestHandler._cookieNames.session] = {};
            }
            dataPurposes.pure.map(([purpose, flag])=>{
                const remove = this.consent.level === DataClassification.Anonymous || !splits[purpose];
                const cookieName = this._requestHandler._cookieNames.deviceByPurpose[flag];
                if (remove) {
                    this.cookies[cookieName] = {};
                } else if (splits[purpose]) {
                    if (this.consent.level <= DataClassification.Anonymous) {
                        // Purge all device cookies if there is no consent, and the client still have some.
                        this.cookies[cookieName] = {};
                    }
                    if (!this._clientDeviceCache?.touched) {
                        // Device data has not been touched. Don't send the cookies.
                        delete this.cookies[cookieName];
                    } else {
                        this.cookies[cookieName] = {
                            httpOnly: true,
                            maxAge: Number.MAX_SAFE_INTEGER,
                            sameSitePolicy: "None",
                            essential: flag === DataPurposeFlags.Necessary,
                            value: this.httpClientEncrypt(splits[purpose])
                        };
                    }
                }
            });
        } else {
            this.cookies = {};
        }
    }
    // #region Storage
    _getStorageContext(source) {
        return {
            ...source,
            tracker: this
        };
    }
    async renew() {
        for (const scope of [
            VariableScope.Device,
            VariableScope.Session
        ]){
            await this.env.storage.renew(scope, /* TrackerVariableStorage will fill this out */ [
                "(auto)"
            ], this._getStorageContext());
        }
    }
    get(keys, context) {
        return toVariableResultPromise(async ()=>restrictTargets(await this.env.storage.get(keys, this._getStorageContext(context)).all), undefined, (results)=>results.forEach((result)=>result?.status <= VariableResultStatus.Created && this._changedVariables.push(result)));
    }
    head(filters, options, context) {
        return this.env.storage.head(filters, options, this._getStorageContext(context));
    }
    query(filters, options, context) {
        return this.env.storage.query(filters, options, this._getStorageContext(context));
    }
    set(variables, context) {
        return toVariableResultPromise(async ()=>{
            const results = restrictTargets(await this.env.storage.set(variables, this._getStorageContext(context)).all);
            for (const result of results){
                if (isSuccessResult(result)) {
                    if (result.source.key === SCOPE_INFO_KEY) {
                        result.source.scope === VariableScope.Session && (this._session = result.current);
                        result.source.scope === VariableScope.Device && (this._device = result.current);
                    }
                }
            }
            return results;
        }, undefined, (results)=>forEach(results, (result)=>{
                return result.status !== VariableResultStatus.Unchanged && this._changedVariables.push({
                    ...result.current ?? extractKey(result.source),
                    status: result.status
                });
            }));
    }
    async purge({ session = false, device = false, user = false, keys = [
        "*"
    ], filter: classification = undefined }) {
        if (!this.sessionId) return;
        const filters = truish([
            session && {
                keys,
                scopes: [
                    VariableScope.Session
                ],
                targetIds: map([
                    this._sessionReferenceId
                ]),
                ...classification
            },
            device && this.deviceId && {
                keys,
                scopes: [
                    VariableScope.Device
                ],
                targetIds: map([
                    this.deviceId
                ]),
                ...classification
            },
            user && this.authenticatedUserId && {
                keys,
                scopes: [
                    VariableScope.User
                ],
                targetIds: map([
                    this.authenticatedUserId
                ]),
                ...classification
            }
        ]);
        filters.length && await this.env.storage.purge(filters);
    }
}

const isTracker = "__isTracker";
const trackerConfig = {
    name: "tail",
    src: "/_t.js",
    disabled: false,
    postEvents: true,
    postFrequency: 2000,
    requestTimeout: 5000,
    encryptionKey: null,
    key: null,
    apiKey: null,
    /**
   * Log events to the browser's developer console.
   */ debug: false,
    impressionThreshold: 1000,
    captureContextMenu: true,
    defaultActivationTracking: "auto",
    tags: {
        default: [
            "data-id",
            "data-name"
        ]
    }
};
const externalConfig = trackerConfig;
const initialName = trackerConfig.name;
let tail = globalThis[initialName] ??= [];
let initialized = false;
tail.push((tracker)=>tail = tracker);
// Give consumer a short chance to call configureTracker, before wiring.
// Do it explicitly with Promise instead of async to avoid, say, babel to miss the point.
Promise.resolve(0).then(()=>ensureTracker());
async function ensureTracker() {
    if (typeof window === "undefined" || tail[isTracker] || externalConfig.external || initialized === (initialized = true)) {
        return;
    }
    initialized = true;
    //tail.push({ config: trackerConfig });
    const injectScript = ()=>{
        const src = [
            trackerConfig.src
        ];
        src.push("?", "lxdfrbnp");
        {
            src.push("#", trackerConfig.name);
        }
        return document.head.appendChild(Object.assign(document.createElement("script"), {
            id: "tailjs",
            src: src.join(""),
            async: true
        }));
    };
    document.readyState !== "loading" ? injectScript() : document.addEventListener("readystatechange", ()=>document.readyState !== "loading" && injectScript());
}
const DEFAULT_CLIENT_CONFIG = {
    ...trackerConfig
};

const DEFAULT = {
    trackerName: "tail",
    cookies: {
        namePrefix: ".tail",
        secure: true
    },
    allowUnknownEventTypes: true,
    debugScript: false,
    sessionTimeout: 30,
    deviceSessionTimeout: 10,
    client: DEFAULT_CLIENT_CONFIG,
    clientEncryptionKeySeed: "tailjs",
    cookiePerPurpose: false,
    allowBrowserJson: false,
    defaultConsent: {
        level: "anonymous",
        purposes: "necessary"
    }
};

const getCookieChunkName = (key, chunk)=>chunk === 0 ? key : `${key}-${chunk}`;
const requestCookieHeader = Symbol("request cookie header");
const requestCookies = Symbol("request cookies");
class CookieMonster {
    _secure;
    constructor(config){
        this._secure = config.secure !== false;
    }
    mapResponseCookies(cookies) {
        const responseCookies = [];
        forEach(cookies, ([key, cookie])=>{
            // These are the chunks
            if (typeof key !== "string") return;
            const requestCookie = cookies[requestCookies]?.[key];
            // These cookies should not be sent back, since nothing have updated them and we don't want to mess with Max-Age etc..
            if (requestCookie && requestCookie?.value === cookie.value) return;
            responseCookies.push(...this._mapClientResponseCookies(key, cookie, requestCookie?.chunks));
        });
        return responseCookies;
    }
    static parseCookieHeader(value) {
        const cookies = {
            [requestCookies]: {}
        };
        cookies[requestCookieHeader] = value ?? undefined;
        if (!value) return cookies;
        const sourceCookies = Object.fromEntries(value.split(";").map((part)=>part.trim()).flatMap((part)=>{
            try {
                const parts = part.split("=").map(decodeURIComponent);
                return parts[1] ? [
                    parts
                ] : [];
            } catch (e) {
                console.error(e);
                return [];
            }
        }));
        for(const key in sourceCookies){
            const chunks = [];
            for(let i = 0;; i++){
                const chunkKey = getCookieChunkName(key, i);
                const chunkValue = sourceCookies[chunkKey];
                if (chunkValue === undefined) {
                    break;
                }
                chunks.push(chunkValue);
            }
            const value = chunks.join("");
            cookies[key] = {
                fromRequest: true,
                value: value,
                _originalValue: value
            };
            cookies[requestCookies][key] = {
                ...cookies[key],
                chunks: chunks.length
            };
        }
        return cookies;
    }
    mapResponseCookie(name, cookie) {
        return {
            name: name,
            value: cookie.value,
            maxAge: cookie.maxAge,
            httpOnly: cookie.httpOnly ?? true,
            sameSitePolicy: cookie.sameSitePolicy === "None" && !this._secure ? "Lax" : cookie.sameSitePolicy ?? "Lax",
            essential: cookie.essential ?? false,
            secure: this._secure,
            headerString: this._getHeaderValue(name, cookie)[0]
        };
    }
    _getHeaderValue(name, cookie) {
        const clear = cookie.value == null || cookie.maxAge <= 0;
        const parts = [
            "Path=/"
        ];
        if (this._secure) {
            parts.push("Secure");
        }
        if (cookie.httpOnly) {
            parts.push("HttpOnly");
        }
        if (cookie.maxAge != null || clear) {
            parts.push(`Max-Age=${clear ? 0 : Math.min(34560000, cookie.maxAge)}`);
        }
        parts.push(`SameSite=${cookie.sameSitePolicy === "None" && !this._secure ? "Lax" : cookie.sameSitePolicy ?? "Lax"}`);
        let attributeLength = parts.join().length;
        if (attributeLength > 0) {
            attributeLength += 2; // + 2 because additional `; ` between key/value and attributes.
        }
        const cutoff = 4093 - attributeLength;
        const encodedName = encodeURIComponent(name);
        const value = cookie.value ?? "";
        let encodedValue = encodeURIComponent(value);
        // Find maximum unencoded cookie value length
        const maxValueLength = cutoff - encodedName.length - 1; // -1 because `=`.
        let overflow = ""; // The part of the value that did not fit in the cookie.
        if (encodedValue.length > maxValueLength) {
            let sourceChars = 0;
            let encodedChars = 0;
            for(const char in encodedValue.match(/[^%]|%../g)){
                if (encodedChars + char.length >= maxValueLength) {
                    break;
                }
                ++sourceChars;
                encodedChars += char.length;
            }
            if (sourceChars === 0) {
                throw new Error(`Invalid cookie name: The length of the encoded cookie name (without value) together with the cookie's attributes will make the header value exceed ${cutoff} bytes.`);
            }
            overflow = value.substring(sourceChars);
            encodedValue = encodedValue.substring(0, encodedChars - 1);
        }
        const keyValue = `${encodedName}=${encodedValue}`;
        parts.unshift(keyValue.substring(0, cutoff));
        return [
            parts.join("; "),
            overflow
        ];
    }
    _mapClientResponseCookies(name, cookie, requestChunks = -1) {
        const responseCookies = [];
        for(let i = 0;; i++){
            const [headerString, overflow] = cookie.value ? this._getHeaderValue(name, cookie) : [
                "",
                ""
            ];
            if (!headerString) {
                // Clear previous chunk.
                cookie = {
                    ...cookie,
                    maxAge: 0,
                    value: ""
                };
            }
            if (i <= requestChunks || cookie.value) {
                const chunkCookieName = getCookieChunkName(name, i);
                responseCookies.push(this.mapResponseCookie(chunkCookieName, cookie));
            }
            cookie = {
                ...cookie,
                value: overflow
            };
            if (!overflow && i >= requestChunks) {
                break;
            }
        }
        return responseCookies;
    }
}

class PostError extends Error {
    validation;
    extensions;
    constructor(validation, extensions){
        super([
            ...validation.map((item)=>`The event ${JSON.stringify(item.source)} (${item.sourceIndex ? `source index #${item.sourceIndex}` : "no source index"}) is invalid: ${item.error}`),
            ...map(extensions, (item)=>`'${item[0]}' failed: ${item[1]}`)
        ].join("\n"));
        this.validation = validation;
        this.extensions = extensions;
    }
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var shortUniqueId = {exports: {}};

(function (module) {
	var ShortUniqueId = (() => {
	  var __defProp = Object.defineProperty;
	  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	  var __getOwnPropNames = Object.getOwnPropertyNames;
	  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
	  var __hasOwnProp = Object.prototype.hasOwnProperty;
	  var __propIsEnum = Object.prototype.propertyIsEnumerable;
	  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
	  var __spreadValues = (a, b) => {
	    for (var prop in b || (b = {}))
	      if (__hasOwnProp.call(b, prop))
	        __defNormalProp(a, prop, b[prop]);
	    if (__getOwnPropSymbols)
	      for (var prop of __getOwnPropSymbols(b)) {
	        if (__propIsEnum.call(b, prop))
	          __defNormalProp(a, prop, b[prop]);
	      }
	    return a;
	  };
	  var __export = (target, all) => {
	    for (var name in all)
	      __defProp(target, name, { get: all[name], enumerable: true });
	  };
	  var __copyProps = (to, from, except, desc) => {
	    if (from && typeof from === "object" || typeof from === "function") {
	      for (let key of __getOwnPropNames(from))
	        if (!__hasOwnProp.call(to, key) && key !== except)
	          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
	    }
	    return to;
	  };
	  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	  var __publicField = (obj, key, value) => {
	    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
	    return value;
	  };

	  // src/index.ts
	  var src_exports = {};
	  __export(src_exports, {
	    DEFAULT_OPTIONS: () => DEFAULT_OPTIONS,
	    DEFAULT_UUID_LENGTH: () => DEFAULT_UUID_LENGTH,
	    default: () => ShortUniqueId
	  });

	  // package.json
	  var version = "5.2.0";

	  // src/index.ts
	  var DEFAULT_UUID_LENGTH = 6;
	  var DEFAULT_OPTIONS = {
	    dictionary: "alphanum",
	    shuffle: true,
	    debug: false,
	    length: DEFAULT_UUID_LENGTH,
	    counter: 0
	  };
	  var _ShortUniqueId = class _ShortUniqueId {
	    constructor(argOptions = {}) {
	      __publicField(this, "counter");
	      __publicField(this, "debug");
	      __publicField(this, "dict");
	      __publicField(this, "version");
	      __publicField(this, "dictIndex", 0);
	      __publicField(this, "dictRange", []);
	      __publicField(this, "lowerBound", 0);
	      __publicField(this, "upperBound", 0);
	      __publicField(this, "dictLength", 0);
	      __publicField(this, "uuidLength");
	      __publicField(this, "_digit_first_ascii", 48);
	      __publicField(this, "_digit_last_ascii", 58);
	      __publicField(this, "_alpha_lower_first_ascii", 97);
	      __publicField(this, "_alpha_lower_last_ascii", 123);
	      __publicField(this, "_hex_last_ascii", 103);
	      __publicField(this, "_alpha_upper_first_ascii", 65);
	      __publicField(this, "_alpha_upper_last_ascii", 91);
	      __publicField(this, "_number_dict_ranges", {
	        digits: [this._digit_first_ascii, this._digit_last_ascii]
	      });
	      __publicField(this, "_alpha_dict_ranges", {
	        lowerCase: [this._alpha_lower_first_ascii, this._alpha_lower_last_ascii],
	        upperCase: [this._alpha_upper_first_ascii, this._alpha_upper_last_ascii]
	      });
	      __publicField(this, "_alpha_lower_dict_ranges", {
	        lowerCase: [this._alpha_lower_first_ascii, this._alpha_lower_last_ascii]
	      });
	      __publicField(this, "_alpha_upper_dict_ranges", {
	        upperCase: [this._alpha_upper_first_ascii, this._alpha_upper_last_ascii]
	      });
	      __publicField(this, "_alphanum_dict_ranges", {
	        digits: [this._digit_first_ascii, this._digit_last_ascii],
	        lowerCase: [this._alpha_lower_first_ascii, this._alpha_lower_last_ascii],
	        upperCase: [this._alpha_upper_first_ascii, this._alpha_upper_last_ascii]
	      });
	      __publicField(this, "_alphanum_lower_dict_ranges", {
	        digits: [this._digit_first_ascii, this._digit_last_ascii],
	        lowerCase: [this._alpha_lower_first_ascii, this._alpha_lower_last_ascii]
	      });
	      __publicField(this, "_alphanum_upper_dict_ranges", {
	        digits: [this._digit_first_ascii, this._digit_last_ascii],
	        upperCase: [this._alpha_upper_first_ascii, this._alpha_upper_last_ascii]
	      });
	      __publicField(this, "_hex_dict_ranges", {
	        decDigits: [this._digit_first_ascii, this._digit_last_ascii],
	        alphaDigits: [this._alpha_lower_first_ascii, this._hex_last_ascii]
	      });
	      __publicField(this, "_dict_ranges", {
	        _number_dict_ranges: this._number_dict_ranges,
	        _alpha_dict_ranges: this._alpha_dict_ranges,
	        _alpha_lower_dict_ranges: this._alpha_lower_dict_ranges,
	        _alpha_upper_dict_ranges: this._alpha_upper_dict_ranges,
	        _alphanum_dict_ranges: this._alphanum_dict_ranges,
	        _alphanum_lower_dict_ranges: this._alphanum_lower_dict_ranges,
	        _alphanum_upper_dict_ranges: this._alphanum_upper_dict_ranges,
	        _hex_dict_ranges: this._hex_dict_ranges
	      });
	      /* tslint:disable consistent-return */
	      __publicField(this, "log", (...args) => {
	        const finalArgs = [...args];
	        finalArgs[0] = `[short-unique-id] ${args[0]}`;
	        if (this.debug === true) {
	          if (typeof console !== "undefined" && console !== null) {
	            return console.log(...finalArgs);
	          }
	        }
	      });
	      /* tslint:enable consistent-return */
	      __publicField(this, "_normalizeDictionary", (dictionary, shuffle) => {
	        let finalDict;
	        if (dictionary && Array.isArray(dictionary) && dictionary.length > 1) {
	          finalDict = dictionary;
	        } else {
	          finalDict = [];
	          let i;
	          this.dictIndex = i = 0;
	          const rangesName = `_${dictionary}_dict_ranges`;
	          const ranges = this._dict_ranges[rangesName];
	          Object.keys(ranges).forEach((rangeType) => {
	            const rangeTypeKey = rangeType;
	            this.dictRange = ranges[rangeTypeKey];
	            this.lowerBound = this.dictRange[0];
	            this.upperBound = this.dictRange[1];
	            for (this.dictIndex = i = this.lowerBound; this.lowerBound <= this.upperBound ? i < this.upperBound : i > this.upperBound; this.dictIndex = this.lowerBound <= this.upperBound ? i += 1 : i -= 1) {
	              finalDict.push(String.fromCharCode(this.dictIndex));
	            }
	          });
	        }
	        if (shuffle) {
	          const PROBABILITY = 0.5;
	          finalDict = finalDict.sort(() => Math.random() - PROBABILITY);
	        }
	        return finalDict;
	      });
	      /** Change the dictionary after initialization. */
	      __publicField(this, "setDictionary", (dictionary, shuffle) => {
	        this.dict = this._normalizeDictionary(dictionary, shuffle);
	        this.dictLength = this.dict.length;
	        this.setCounter(0);
	      });
	      __publicField(this, "seq", () => {
	        return this.sequentialUUID();
	      });
	      /**
	       * Generates UUID based on internal counter that's incremented after each ID generation.
	       * @alias `const uid = new ShortUniqueId(); uid.seq();`
	       */
	      __publicField(this, "sequentialUUID", () => {
	        let counterDiv;
	        let counterRem;
	        let id = "";
	        counterDiv = this.counter;
	        do {
	          counterRem = counterDiv % this.dictLength;
	          counterDiv = Math.trunc(counterDiv / this.dictLength);
	          id += this.dict[counterRem];
	        } while (counterDiv !== 0);
	        this.counter += 1;
	        return id;
	      });
	      __publicField(this, "rnd", (uuidLength = this.uuidLength || DEFAULT_UUID_LENGTH) => {
	        return this.randomUUID(uuidLength);
	      });
	      /**
	       * Generates UUID by creating each part randomly.
	       * @alias `const uid = new ShortUniqueId(); uid.rnd(uuidLength: number);`
	       */
	      __publicField(this, "randomUUID", (uuidLength = this.uuidLength || DEFAULT_UUID_LENGTH) => {
	        let id;
	        let randomPartIdx;
	        let j;
	        if (uuidLength === null || typeof uuidLength === "undefined" || uuidLength < 1) {
	          throw new Error("Invalid UUID Length Provided");
	        }
	        id = "";
	        for (j = 0; j < uuidLength; j += 1) {
	          randomPartIdx = parseInt(
	            (Math.random() * this.dictLength).toFixed(0),
	            10
	          ) % this.dictLength;
	          id += this.dict[randomPartIdx];
	        }
	        return id;
	      });
	      __publicField(this, "fmt", (format, date) => {
	        return this.formattedUUID(format, date);
	      });
	      /**
	       * Generates custom UUID with the provided format string.
	       * @alias `const uid = new ShortUniqueId(); uid.fmt(format: string);`
	       */
	      __publicField(this, "formattedUUID", (format, date) => {
	        const fnMap = {
	          "$r": this.randomUUID,
	          "$s": this.sequentialUUID,
	          "$t": this.stamp
	        };
	        const result = format.replace(
	          /\$[rs]\d{0,}|\$t0|\$t[1-9]\d{1,}/g,
	          (m) => {
	            const fn = m.slice(0, 2);
	            const len = parseInt(m.slice(2), 10);
	            if (fn === "$s") {
	              return fnMap[fn]().padStart(len, "0");
	            }
	            if (fn === "$t" && date) {
	              return fnMap[fn](len, date);
	            }
	            return fnMap[fn](len);
	          }
	        );
	        return result;
	      });
	      /**
	       * Calculates total number of possible UUIDs.
	       *
	       * Given that:
	       *
	       * - `H` is the total number of possible UUIDs
	       * - `n` is the number of unique characters in the dictionary
	       * - `l` is the UUID length
	       *
	       * Then `H` is defined as `n` to the power of `l`:
	       *
	       * <div style="background: white; padding: 5px; border-radius: 5px; overflow: hidden;">
	       *  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOwAAABHCAYAAAAECKs5AAALxUlEQVR4Ae2dd+wFRRHHv1YsGHtXVLBjV9T4jw3FAoIFu2JH7ARFjSVqUCFo7CIIKKioMUrsMdagwdiNvTcs2LCLXe8Tb8lm2L3f/d7evtt7v5nkZe/u3e7OfW/2dmd3ZlZycgQcgVYQ2EXSzSXdX9Khko6QdKykd0k6TdIprTDqfDgCjoB0pKT/Dvy+6yA5Ao5AOwjcpGPleZKO7nvTv5rG+/p2WHVOHAFHwCLwEdNgH2Rv8HNHwBFoA4HzSvqtabBXboM158IRcAQsAjc2jfU79gY/dwQcgXYQeLJpsMe1w5pz4gg4AhYBlnLiGWPXXy1Cfu4INILAeST92jRY118beTnOhiNgEXD91SLi545Awwi4/trwy3HWHAGLgOuvFhE/dwQaRcD110ZfjLPlCKQQcP01hYpfcwQaRWAt+ut9JR0m6TGSHi7pQEn7S9p7xG+//v6D+vy4FZF/DOGKdLikg/u85OM3pt59+nsf2Od9gqRDJF1iTMV+jyNQCYHq+uttzHpRvNhbcjym4di1qpL6Qt4HV3oRXqwjsBUCa9Ff95T06c7p9ltd7/pjSWdJOnubjfgffb4fSMJmEqfdrYiHe6+kr0j6fm8o/cdt1ksjhd8z+jI+JskXqLdC3v+vhcBs+uv5Jd1U0ukDDeizku4iadeJn/7qkl42UC8eEI+WdKWJ6/XiHIFSBJ5i5Hbt9sPPNwyEYedvukZ18dKnG8h/i0y91H/XgXz+lyMwJwKnGrldu/3wWw0DocHW/nIwkRTqitMzJeFn6OQItIYAcklHFsvrVdfN5A8NA4EZZpBr0isz9Z5Qs1Iv2xEoQIDwMKF9kK7d/3U3w0Bg5t+SLlnwYGOyMhEV6otTnwEeg57fMwcCs+uvrMfGjSUcf6EyGpeWxEch1BenfEScHIEWEZhdf31jptG8tDJa98nU6yEiKwPvxa+MQBP6648yDeceKz/WuIyvztTrISLH4ed3rR+B2fXXa2QazTr0169l6l77FPn637vXuFAEZtdfH5FpNLX118tJ+k+mbrdgWqg07wC2Z9dfT8o0mtr6K04I8SRTOF77FPkOEDJ/xGkQSOmvV0kUfU1JF0xcn+TSXPrrazMNtrahxiSgeSE7EgFrP5yaHKWxMnJ8VA2Eds80mnXor9/M1O36a4037WVOgYD1f01Njj61l+u9pqjQlvHITKNx/dUi5eeOgHSyaS8PSYDyyd5s8XyJ/4ovWQaCHllbf2VPzVBXnLr+WvxKvYCKCHzYyO0NTV2XlfSvzrusmlqHT2zcYMJx7fXX12XqrfagBlg/dQRWQcA6yFzRFPKMXq5vba5PcrpHptGsQ3/9dqZuPHecdjYCLOnREEo9tZilpayrTejHbU14bxC9qot14Y9+0YU8+lR0bdJDZrFCjxqntfVXXkZcX3zs66+TvuLFFIZMMLr6UyQbhBRiUoeJ0TF0YUkP7TdX/llUTpCvX0p6W6GP9QUk0T5Cmax08GHBJv6Dkv4uCf/uKvSmqOLAAGlt/TXn/0qv67TzELhWF1WEBsbI7u1d+pw+DTL5Z0n3G4CFnpShKA2SPOyE/v7Oy+wVkp7V5WOX9I8aWT+t78UHis3+hcHPh6Lyftc3VD422BZUo7n0V76a4WXE6ZjYUNXA8IJnQeCiXa9IbLC/SLqd4eDISE7+KelO5n9OmfQJ7plf7xv2RRL3cQlHE8oJMof8Xz5z75jLt+ommJ7dxzQjZehdjVjcDYzH6Tr0Vxab4zrDseuv1V53swW/uJeFhyU4vI6RE4L37RLdd3dJBPJjGPpESWOWUWz8sA9E5TV9SGCz0FDitLb+SjC1uL742PXXpkVmcuZYAvmbpC9KIqqmpQslZOWe/U00Vhoqw+DtzMgySRTLHMf0lM3TmxOMw/znurCnT6/4y/nduv7avMhMzuAzexnMmfAxwWOdQ5iYotGh1xJR80bb5IoIoayTxo229pzNNllM3/5Tw3T8AHMcL0l/JZLju7vZxs9I+vyCf8xqPi4tHtWv0qMSQ+z3ktBjU4RRvZVFRoAY1zDBs+ps7M9NucTpbpqYlbNAcE6A8NoCaL9ugY8l6a+5NeTwLEtK6cEuNYO03rKXwZQtbmCHSaYclizfrEo/MeXi/NI05fTXj1fmesj/dUmBwnNWWjnhavn6l8xETmUROKf4MNl0wDlXzn3wNNOwAo6ocyXEsk8oixRjh6bpLYbhwDzrVTUpZz/MtiFLoyv0+hMbfC3xdzNJxNFNTfas4118uR/RDQWof2dCTtFbL1PAYGrS86sF5a0la05/tetgUzNzTOIF8LGgx3LaOQiwcRrLh+yNNERW10RWHj+UYcR/d07IIEYWzdK1EwwDBNPrmHbVpG9k6n5AzUq97OYQ2LeXgycNcMaeS2HkF1KGrqVRHDBwCOWFlOF5s8SesIHROP1EZY43RX+tDNOOKB7rJGbZradL/PAp81VcQUuJXj2We47vXVpozfynJBiGaTbCqknYglqgOF+i/loTJy/7/wgcn5AXggWWECaLjCRjOWTVYo5Z8tHPkfJi4AHuMLqE1W7MxW9y/XU1PDc9F/bFccPieKzXTg6blP7KWnqzZG0zAyCYeOUMpqd6GAyzQ31xysyxkyMQI4ARfSwjHLN2WkpHJco9orTQmvkPTjAMGLga1STXX2uiu3llp+KMTaG/Bq+e+GNw25bhs+EtAuMvqMx0Lv4wUROdHAGLQMpOoFR/TY0u8WMtnXW2vE96ntNf7zhpLecu7DWZnp11WSdHIEYAQw6Wb0JnEtJS/RVH9lBWSN8QV9za8XUTDMM4+mvO+HqqZ3D9dSokN7+cPRNyOoX+igtfaKghvVvLcD42wTCMVwsY1YOBz6N1kQqALcl+uOV3u0m84Yge5COkbCVTQmz2ZmWw+eEwwacCAHFae5bswEy9S9ZfcUnDNeyshf8w/WO7z5YoZT9cqr8Gv9tY7pseDvNCcvprKk7OlC8wt//rkvXX72U+QrFALOm4JK7RlLKC/vqrBLal+mtqS9N9tmB81wnCrG5RRf7v6yVAQKAISEUs1ZqUAou6h6Lg1eRnirLZO4Uh1ZIaZYpX3MywfCuN/zsFppRx/QSmZxQWbjdfBgcmtYg8kSPiRvHheHnuhtrXD0kAAeOnV67Y9dfKAG9Y8Sk5ZYmnhF6SkH0CsQ0RcaNoH2zcPAsR6zX1hX1RZW4IK5mqF68dJ0fAIpCyE8DYZ1Vi5JByJcV/eYjCOnAc1X/o/kn/Qy84M9NwthrHlzLyqky92BU7OQIWgdQ8C8uRq9LtE/K31WQnkRr/0MUwRpWbhVJ6Ab3eOvRXPPlTPeyS9ddZXuIOqDQVJ5uOpiQiRqrDYFeBISJWFDLLPMUsxBJEqtHUjhTHXiNEFbB1sx5GeBUnRyBG4KCErLwjvmGFY/ZptfJHAIchIswvPSxRMWahUxNM8xB4LtSke2Xqdf21JurLLZt4w7ZxlYaDIcBcXCbrzkNEQDjuZ4uQWQiXOQIux0yH49phWbBOCXXFKRMLTo6ARSBlvorBfgnFG1Yhg2zGnCPMc9lCBj16KDBcLv8k14/ONBqY32+SGtKF7G02HYob7FAc2nRpfnXTESDigzUdnMJ+GH01lj1WS3J0Yn9v2Aokd1/xdeLj0EAwAWSzWQJbEVTKDgdixjnmS4IXDTouijb58cgnyPgY2q3b1oP9TcjHJBK2yiwTvS+xFUJcN84G9LKHScLvkfyUw/4orSzgj3l+v2c6BEJQtlhOaEClxM4BcUgYdFpLTGoFx3bWbKsS0dPtlyl+6FWOecAxM3OpKfhV6ovz1F5mqvoyvPCVEXih6QmRial2gjg0KhvZjvfiwQoqDJtPGCn3Kz8kGffq99XkATGVwxidLfm288MEi3xhC433jOCInpD9TaiXfT3JzxBmO/XS4Ml3dl8O5+69MwL8DbzFeuigS05pMstoLvS0jPBwtQsGFcgvm7/56G4DBcsfqQ4CRH1gZhZXT4xqajgjEOf4uf3O7AReo2M6fItQq8VP+z8Ye9m2pZEsNQAAAABJRU5ErkJggg==" />
	       * </div>
	       *
	       * This function returns `H`.
	       */
	      __publicField(this, "availableUUIDs", (uuidLength = this.uuidLength) => {
	        return parseFloat(
	          Math.pow([...new Set(this.dict)].length, uuidLength).toFixed(0)
	        );
	      });
	      /**
	       * Calculates approximate number of hashes before first collision.
	       *
	       * Given that:
	       *
	       * - `H` is the total number of possible UUIDs, or in terms of this library,
	       * the result of running `availableUUIDs()`
	       * - the expected number of values we have to choose before finding the
	       * first collision can be expressed as the quantity `Q(H)`
	       *
	       * Then `Q(H)` can be approximated as the square root of the product of half
	       * of pi times `H`:
	       *
	       * <div style="background: white; padding: 5px; border-radius: 5px; overflow: hidden;">
	       *  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM0AAABNCAYAAAAFDOCxAAAP5klEQVR4Ae2dBdD0SBGGX/xwdyjc3eHgkMLdpaCAw71wOeDQQwp3KdwKd3fncLfD3d0d9vlr+mdu/tmkJ8nut5uvuyq1m2Qy0hlpeXsiBQUHVsOBk0n6vKRDZ3ishmOR667nwC0l/WHBhYfM8Nj1LzcYsBoOPF/Sm1aTdeQaHJgnB74h6b7zbFq0KjgwPQdOKum/kvafPuvIMTgwTw5cV9LfJB1tns2LVgUHpufAEyV9cPpsI8fgwHw58ClJh8y3edGy4MC0HDimpH9KuvK02UZuwYH5cuBykv4t6XjzbWK0LDgwLQdwZn5u2iwjt+DAvDnwHklPnXcTo3XBgek4cGRJf5R0Q2eWR5F0Wkmndx4ncOYbyYIDW8OBCyWn5ql6asxgeYykP6f0OEI9x38knb0n77gdHNgqDtxD0nd6anxESW+W9DtJr5f07HT8OPvPtS8tBsirimv3kcSACwoOzIYDr12IWS/uac2DJL1B0omydGeR9NLsnL9vl4T5Oig4MGsO/FTSbTtaeA5JH5B01CLNQZIIJTBiNfq4ncRvcGCuHDhz0ku6dI4DJAHmLOmTkk6XXTynpLdm5/E3ODBLDtxK0q8lsUq00Gkkfbt44DaSnltci9PgwOw4QNAZukorHSzpecVDz5QE6DMoODBrDhB0du/GFrIqfVfSTYrn3ifpycW1OA0OzIoDFnR20cZWXTHpQaconjtsoeO8qLgWp8GBWXHgepL+UrGK9TUSszL+mJKwwkU8TsmVOJ8VB9A/3t/YorNJwsP/uMpzODoxKhypci8uJQ4cYxEee78d5gYixh12uA7bWjxBZw9rrDxef6AzhBKU9IV072LljW0+P+ECCnEBSTQKsF2rmTFv+7EkvXsJ8/J06/iPJecJ6yhoRmXw/gg6Qz/x0nGTOPezRYQnIM+SXpkGzcPLG9t2fsq0GuCpBTsE4I7YCfBB4I2essAJnbyxUQy2N/Z4kfMsr5A69aMl1Y5H5IkXDjIAhIgOtbRcY4DsVzwDnAMMVZCPA5eX9K8FnxkIXjp18s3cZckDrD5Y1ch7DLHBB+Lfsvd//yLzy/T0L/r8EYpnqqfgf0j8K0n3WvxHlCoJ6wdxFOyoeLXyZsc5g+4tHffLW3ibby6JxgJBZ3kHKUs+t6gwGdj5TRezGkA/5GTS84IfKwln3NUrqyQvnxcGA4P6OQDvP9OfbEdSnF/SgYv3/uC0GvL+f5P6D/3okkWtwMDdLC0Ov039hV11WPHoX1cq0ldPMSHSgWAKHbCLmLGBQ9ApL9uVMN1DEaTj9+Vby4oVCpQsTPA6wbDSkP51tQyLa/gNvhlbEBVcqZ8yWW66T4WJnn7J+y9Xl3qrJERH0qN7uekqaRb/qKRjO5+yeApMhn0IVZj9DGe+ZbLzpAbRqKuWNyvnBC8Rt076O1bul5cYlF/ZAONEWa9NO7egs+tvWsWK+iDu8e45Llzcq52eKUvvbhtiyz+S3NkaLffZVODdarVJ1zAi0ABWmyF01/Q8s4dnA4drZUzwlom8jbiJohtU5wAdkPdYOifrqXfuKuIV9eR91gwPZc3AvpEek3gNYFqmF3Idog8dstXDS2Ys1RT44X1y/v8FlO0x0G9ELMpAHPTQk1L6n3sVuYVhg8mCiSOHrHvK2k1pMJh8awsaTF+kv3iR0y9L6WuO132ayzaiiCUUMBTGcM/0PB2uNqoR9VCuHrBP6b4LWC9+mcrAQOEhs/u/wpM4S4NXGvF0KiLqkEkJM32NN55yaoYYz3OrSEPQ2QtXkfGEecIv+ht9GoOQh36U0rs2CGHmIPO/F/ENnoIszZ1THuTDh31Kuma675Ety2c5H6PPtDovH5iW6BPXKtJwDYscJvnfZ7z5U4pyZBC10JSDuKXcMi2TFyv3rcsbG3beqs/wPui7HMCDOgndAOgCicfMHmxHaoXmgUVWOLBvVqGhm2OjK5G/V5+5TlYfrz5jdcXESFnoREMJMe/LKR8scjjuWP6/mK4xQT3KYTihfHxlmM43gaxznXUTKtNRB+uPXn3mdum9oM+cpCPfPbesM9JJWry7Zb7EVdigqVnQ0GXoREOJzRjI36vPMMOTvkWfsbqxUvIsfp2h9JLU0TGulI4xVs13pTJ+IOkGHYXwLHkx6DaB8HMhJpdt2oS65XX4SOKvV595eUrv0mcscxgxVN6msnRmOhrO0JJgMEYGEAVDCFOwrYZfL3YqsV1Nyl9zarbqM9SP+v41oRaG1Be4EfI0g6OLWA2/l/j23uTnoq1G50tKLHAVLI+bQEyOHp/XTtYVfYaVnP7I9z/LvlE7x/lJ+qf1VRz4i/kxXt2XuOM+lUT0olBWhJIs7uI55Q3n+XlT3uSPvoENveuwpZb0rfqMVQnrEIaEIXSphKvzPAvvECVMaUWcYEW2SQK+4pXeFELUxOizyQQMh3fPgQuhq69wjyA6S9+rzwB9scReC0ONWabkk1etk9rmC16rV1nG3VM96UA10a9Mf+2sXUNl708n0a7M23POBhGt6O0zLJzJj09WTGJUWCnRgZgwpiZ0pCFkk99Fhjy8xmfAItIXmXjylXtZFdhJh/QufQYvuQ2aMfoMe16RD/CYGoAPLBD3W2Hk1khi0Hnea0Ea4p+xsuwXsZX2zI3OPUI/YhYG81duxdTFIyYtVv4pDu8EQj+hv9SknlpdzT+DkaaXzLdCAd4KlZliaWBmJA+U7xrhLOU+IL9WYqZAT+L5Es28LC/kWNKj3A0lgqvQa8YS1ibQtiik6HQYFy44IFNW27EELw9doMt/MjAj8H7oXi3E/s7gGKc4bu8oONdnutApeVbmn1nWf/O0e2RlOhcH4sEQYvXgeTo2CnCNmN1Ig4m1lVCGrY6ECPRRjjfzMHlZfnQujCNjCFnZAIPWBvvls+E4Oz2EcxQg4Vgyfxx16Nt3uVYWIutDazc26Bp9xHhM3+mjHG9GSEEvobBaARfvTb1vApDKOOvIA8j1MsJvQ5ohqFjTZ7AgeQCkOd5sqD5DOzAC9O1PvKy9XAdqTpsxLQMuRR9gS9ZLp729aA8rNPD1o3dllHZt+URPmr7bvCvaY+/b1UGyTC3obGysS5blSv4+MrURa60nbDrHm/X6Z6gxjkbr9MSflMRMyGwNZL50SmKWZYMEXkIfapmZkhl3iK+BYDXK+FhZuSXniBCkB3E9xpfAzI5eM4R4WSjyXeIoxgJEQOpKZ8aYUiMcrXSAO9VuNlzD9J5Pkq1GGQaLd+JqqNbkSekn8JR+4yHwkKR36TOWITgbHkJcyAmH27MWQWaXWMy6WKNKczGyOc+BQ/Ls6P79BkXe6oEMbvZzr2jH17io1xh9BkUXU3zZZqtX3y+GD0zWnpnuRmmAUWcca8yUKM1sGG6AQwaXh8fL6nXjxcAz+d78V627vjABsCfAJhOrobk+vFG4OJfhvUufscYD70Z2pzCTsRElyu1BMRqwkTWzN6BLCsLR5XWIMigxAbaQWd0oyxM9d/zM70THG0rnSu0bqnwT/VnuHtlVF8ROZn5WFNpqBzM78COU2zFE3jaADVmBhOF9d5RNHBRWyU0m208N/nmcwWfMeN0qru6JuMSUiPLLaGWVKYO8gIPge8D8CwARmb2FCJmmMezh6yWsTtaBGMh9xECx9ATGDSVEVfLxKJK1MtBRUDBbiecAGhKWgNPN0+bWMniHxiOvxZTBhfm9uWO1Vm5keiYq2oaU4JkQcJQbL4ZEEu8xg+KJ/mqyctHJjVDkn55s9GxKUaKYbRaz9LVfzKxUsNyKtExLQ9ilxsCO1iiWUcSVMmwVXxOiBulhlqVHJ8FeP2R2RCzDLDtGJyrbtSnnrILGI+9qbEFnrRuorKPNbKBBf2F7XGsXv+iJH6pE7NJ/uP61Ij1mZ3TYZusgnR/9BbQzChWWH5R99AN0F4CDNcIC5GEoMTvL8rB8GaDMgIiK+YFJnCW3jBbEu40Yl6e1/1yvIa6trGW/4MGYJOZIiIJmBke89hD6AZ1yFUSfo+94LKO18lnRwfjZO7dfRC/6S2kRQ9JBgrB0+S/ph5jia/Xacw2dpmZNwjfjdXiRB3L7WBl9aSUnuIHpnZkKvWauZJuNMIl5CICmd4B58iMNHRcLF1ZO6oF6gLEI6+dQmI+37LWlwxuPYprP9Cje6EHAxT2E4xFrWKs+5Ml7qjQvaJgEpipz3fkgfjIxgLXq22sBEZXwiinDvxHRscTlvkEwhYhOrIJso+Qx/Kybb83lmYkZnYfGAS4EBYCu0eecywsjwhP9wwOky59bx3+WbqAzQ6NL11HHKcog6tLkfwwPXWRBZ4BupyBEILYGq2EUyd/iu3D8giTZasoZbQxn5Wn1EGPVABu2SXB3ezEA91zx4fbAlv6aSZ332LdnA1LELyY0irytZ0NGJlO+kEbd3rGl/N1bbUQrZE4bMPhcemMP9j59+D/AWwDw5aLe4VOs/wyTOo5RT+jB+ms3bYl0TNu3oHRqlyUhrr6mvDjw/DgJgYKU0mXiNVQHotoyPOPAKqz/MRqN/4A4HPSZMYQfCFNxi2g3pryuZ7HAoBy3+JC68tuGewbhQV/pIoLOhjp5y3yBDtmk2zVYgQxZuk2P3SnbuPJzZvcSebDyQosCmAgQAzBR7ibKHcfLZn2cq3TeIaEMNV7aSkOeXe89D1nZv5bRbr8G8ncniZVuN4hkJY/z6FZiXmqE+N0Kt6nlk19jZyCwcF0SBtAhBhbWvbHbaOVlx//gwCgO4FA0EWjZt3lAU+BtXyflhgDwbkHBgY3iwA/TwFkWdkHQGWiPdZKBLrHMjsEPrrPOUdYu4gA7ELHa4Jsq4/4t6Mzz+ZSpWGbuCOrEZvdBwYGN44Ahz+mkpbJvQWcMnnWRhZx494JYV72inODAXg4ckOk1ZWQoaN+xIdZ7C3L8QSzDL4NzeY7ocgcLIsk2cADgLLoDKw3bcOUECBcn5DoI/w14M6JWg4IDG88BCw8/LKupBZ1hll41gWgGabJug8Oq2xX5z5gD7APBSoNPxCArAFZdu02O5AuoEja0WPZpRxAaY5EnI6sYjwcH9uUAwFkGDYfB8Qk6Y6P5VRLWOnxAywYMZaPfDAkbX2W9I+/ggPjcvA0aE5EIOuuCuYxlGw5MtvPqi6vCf+SJ9R9bn3g+ONDEASxVKOEMHGD7FnR2YFMubYlZQYjPIramdiAeEqhG3FVQcGAjOQBchUFDuAdhG/xfFYD1oGxlsxVu2e+mfwdnI19mVGo9HLBP7dF5QT8Tt78KQhTEwLBskJTXvRtErqKukWdwoJMD18g6Mns4jPnAV1dB6CdYw7zHfl2Zxb3gwE5ygG2O8lk+cF87+Tai7K3hAOHnNnDYLy4oOBAc6OEAXxVg0LD9bJh5e5gVt4MDcMC+A/TOYEdwIDjg4wCx+Kw0B/uSR6rgQHCAmH02GCGGP6jCgf8BynL2Ji/GeXEAAAAASUVORK5CYII=" />
	       * </div>
	       *
	       * This function returns `Q(H)`.
	       * 
	       * (see [Poisson distribution](https://en.wikipedia.org/wiki/Poisson_distribution))
	       */
	      __publicField(this, "approxMaxBeforeCollision", (rounds = this.availableUUIDs(this.uuidLength)) => {
	        return parseFloat(
	          Math.sqrt(Math.PI / 2 * rounds).toFixed(20)
	        );
	      });
	      /**
	       * Calculates probability of generating duplicate UUIDs (a collision) in a
	       * given number of UUID generation rounds.
	       *
	       * Given that:
	       *
	       * - `r` is the maximum number of times that `randomUUID()` will be called,
	       * or better said the number of _rounds_
	       * - `H` is the total number of possible UUIDs, or in terms of this library,
	       * the result of running `availableUUIDs()`
	       *
	       * Then the probability of collision `p(r; H)` can be approximated as the result
	       * of dividing the square root of the product of half of pi times `r` by `H`:
	       *
	       * <div style="background: white; padding: 5px; border-radius: 5px; overflow: hidden;">
	       *  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANIAAABJCAYAAABIOHjCAAAO+klEQVR4Ae2dBfDsxg3GvzIzY8qMaVJMGVNmZpjSlJnbtCmkkDIzTxlSxpSbMjOnzMxwv9fVG42f9yz7zgd/SzOe89mL8pK0n7RSUnJgOzlwA0mflfSODbm2k4tZ6klz4JiSfiHpvZIO3pBr0h8kK7+dHLi7pF9KOtZ2Fj9LnRxYPweOIukHku6//qJkCZID28uB20n6naTjV6pwZEnXk3SApMfOue5WiZ+PkwM7ngNHkvRNSY+s1PQYRW76i6TvSPqNpMPL/c8lcfGc612VNPJxcmDHc+Amkv4s6SSVmr5I0j0lHbW8f52kE5X7+0m6dCVePk4OTIYDR5D0JUlPqtT4uJJu6d6x9PuY+/9GSad2//M2OTBJDlxzpmD4m6RTBWt/a0kHubA/Si2f40beTpYDh0l6do/aHyrpiiU8mr5/SzpFj/gZNDmw4zhwBUn/knTmYM32KbOX7TOxpPuvpL2D8TNYcmBHcoDZ5WU9avZqSe9z4U9XOtJd3LO8TQ5MigMXlvQfSecK1hoZ6p+S/D4RavM/SfpIMA063gskvVnSY2bX0Uq8E8w0go+ezYyvkPSSskdl74JJZ7DkwHo48HZJb+iR9XnLbNRUkT9E0qMC6bChSwciPvtSdMAnSzqDpEMknbukcaOC9yPdpOTARnPgfGU22neFpbzKDMd3Z5ffr8rG7nucsgJVPB0MuetxLmzeJgc2kgNsqK4agYAsdsLCDZZydBauyzY4dGBZ/lnYxuv8mxzYDA6craisL7HC4jDTvMXlh/qcTvRh9yxvkwNbxQGE+Y/3KPENi4IBJUP0AgDriY50evcATB8dKeUgx5S83R4OnFbSPyTt36PIr5H01Z7XhzrS/2jpSBfvCJevkwOjceA8ks46MPVnFjNyZoh10XFKZwZJnirudX2Fied706LVes4APpxcEo33ugPiLjPKlcts9P5lJpppJQciHDh6wcN9vTRCTB76arWeIOlrM8O8I0YyHDEMau2Uj0ZkcCbdzoETS3q3JEZyUAigEWiI920P3voU26E/SrpF69vVPkTRQfn3W222mdvUOYA8czLHBLBuNMTvzyxagehE6BGzTvQ9SaC1FyWMAN9U1Nmfk/TWGUTocsFE8VKEsoMZNeWjINMy2DgcuEbpSHSmaweywDAP0/A7BsJ2BXngrBPcZwYJAu4D0ZGfXsoTcZpyqRIWNENScmCtHEDGwTcCHekDgZLQwH9W8G2B4NUgZywOI60TWUD+4+8Bc4yz28PKL+bqlLvPsrSSVD5ODizOgXuVBkmjBExaI5QUP5lp+u5dC9DjOebm5MeGbpOeFuwgGABiYbtxy7oLFgRts2I7/T9CMx9kqoTfBJQHNOznzWECdkK/lsTezaJ0seKuC3mrSaaJe3DzxTb8x57kk5IAAE6NEMBfPlv733VqFXf1fVbpSOwNmUcf93qXYgGFxMP8w5HuAcDSqbG43So6TVknn2mDS/02SWh1Pt1yfVESbpw8vVjSF1rCEv/zMwcbj/eBy/LgU5Ku1Hg+lb/ncKrwJi/hwW3K5i3q8zEJOyL8NmDct07ERO86Imyii9/00fjYxWjrDmW0YsR6aRFI+bjNjUFUo3sVb56E5UK1yoc6aUXVC1wGp++n7M3FnREB7Rd8wtWwVwKgTfvGCmx68HNHB/qusynaGs7evmhJPOM2ufCgh61jYA3ZRaYiJc5FuwIXGYFl3hTp6o6313EMgOd/XcEAg3z25W30a4fQiGUhmKttIVvLM2pG6OGlcSBMRzYQ8QOAL4EpIomZ1b9d+PXBwlyWV5xvxP7OmIQpBObq7FNtHbGcQwuDWnNbCHwXswtubyNEgyA8B11FiQ/KMnCKZHsz8AxVOLMU6AEGmLEImQwnJn5VhImGnxXHynvhdBlpWPcOQf4unPnABJBtDBvm3d7WkmOAYElCo2gToGvxblw2BKPeQmvpbONzZoTfF549XxK2PtFBa0h9GcwxB28qFtiS4DtsPF2gMAuIyLaQl48iIyTO2OlEXBfqUUmUF2iOIjCVSLJg28CUsQN/s6I0icTzYUjDW4X6d8u+f0bhGegC+IA5+RiEfP7jMpgzoNuFGy1cF59/jEybaeKCqDZishfEu2Yv92k8qIzux/MP59wzG5Bnk9C0MA2vYncZV7h0iqh8xGYf4aPyka8bKnLvvNC/i96j7cK/Gr6wrUPzy6zKXsk5owkVbNsyEAWRLM/iZn4sWscg/CzQST1f/D3v2trbUstCIfDa/9zi+Z+KQ/wyDTOi0Lsx6cVtURuBqwJj1UUIoEzx2J+wX2N28XQgBES8uTA1v2rG/Ie2JMaoQl5oZCLCfksSux+Z/Ux0qYGJMh8HmacvkQeoYjt6pG98wlNn8mfvChgOB2sB9sTrDp0L2QO+RpACOPu4+ZBCDIxDR6cxjzUrMICjda1dkRXHwKr9Pxq9FHsSmwEYnVnH4oaIKdEjE2B8TQPF2Z7eE0utUDiooAFAwGhoGMDcX+tcH7GRyxTNO2YnT68vz3mHDcxQAldFGlwR+Qg+2UzQRz6y8jH6k9fQhoSqnaURS7o2ArSJQoM84B3haisINkOR9bz5Q1uay3xGva+2zAQ3LS2OW2edbcTmFUsFpuDmiM9o+ndJTecReKfkAzJzdRHeLO0D22YondCbGIPBIj00gGycejItEMcgNjuZD9d17+UjGp6d6Fb7/WEpE+XqIx9ZOeAzcYdqjgBe1s4Isjz4vapTOX9idnLdbWceS82PwrUkvbOUo2229+nkfU8OMBOYXEOjZdRjtEKGaSMaHVO0xSGMKRpsmdYWj2eMSvhUNnpq+ags4zyRNp2sJpSCJmi6pvXxI/cmHwGxZ9btuoAA0RH+0FCrRvIiDPtIxGcgGELMNgAzI4R2kY4Czo08/cX35YzVJnIjkm6GmcMBv+sOqA+m17xcMpOY+tc7N79kiXePOfnwis7hG8NhJd5FOuKN8RpVPXVFLoyQ7R8NkY9In0GE/CJ+qNvKwwzaV1jGbwIyFIMGy3Q2k2uDU1ue+WwgB9AI8bEfUImPIMd7Lq86RQHBsztV4rU9RiBG3hqiAWtLr88zLx/VZA6fnt8/Gmr0RQOGRwf7hBe8by57F0wuHB3n8oB+86qwjLM3+di1GeL65T0dwKMXWJcTzzshr2Sx+7HF6YMQ2B15wRs25igvF0j1LvL7R9hYDSGsM8kPrdoihM84ZheWmKTHQMQsyRGRfQjBn32XIYTi5Cl57eLBHvxjdEN9Om+GMLnCcFOWiDU0VLJRemJpCLXZL5rOkHAs52iE3wpGNnzdUPmIbGxpt4j9zeXdaQhg2PC9xkHFyD3UB7R1dOlGh/ZnCQVZkcG6OGCOw+fJR6jG+WDNJRwYKp7T4KIEcJE4tdkvms6QcCgYyHue9aZP1+QjljJDKSpH1tIHHfFbSZSlOStipmEbtWhVUSbMW/ZxJCTg4iHax1r58nnhANo0GldthjCt009bhF7wVH0aJlo5RtF5s99YH8bLRxGUOvtrpmAZKh9RFw6ogkd9l2DGB7zjYHHc3JKw9/xy1iqdnXwOLxuufgmOsgjQKCr+PGnBc26J9+YYr3kejGXB7jkfyDZT7bn9shdUm80sjP0uKh+x+TgUHo9ygXpwRfahvP1Rcyaw+kR+6YTkGV16NdOE/36vrfne/wfvyH4g+bEcxbiNZZ9tcuNDLlJ3n2beBzhgGjQYj4q6SaYWn2dDwkiIR5gImTOKISM8KnbKyTJz3vKlVg7gScSPwJlIA5nGGqSH5dfSrz3H+pbT3ubNKLW4PMc7Tg0L2RYPVTkyKzAsk6Gw1kVr2NedcFv6+ayFA/gVoLEwK6FFw6zaiFEYB36oPA2RYO/8r424LJ26yI7NGDLCgwmkrFzRZRIdgMaDUgQ5g7jIaGjS2nBpLOeQO5DfDNGAow78EOAhZwhhqbmITdIiG6ggUvwG+pDyZ5wABxBOaVwoC0Ap4PIVlAKjKJ2LpVgXce4naUTkDhonWqchIzyYMzrBZ2YQosix78xabL6iYGg6OgG0yszkvcswWIDURqPXDA9ol/B97Vo4aQHY1TK8iXZ9h3y/Rg6AyaITMGJDwPVBfvf18ELjfmVJY94P6fpZb17Y2jsQEkP3QWppjvX8VgXwWoNdjZXvtqfLDA5iHqUUqyK7kMe5mlpilu0sn4ljYfklLFrKCBZ0MM9MPkJtumjjRr4C3zV0+dOnEgBtayYdfdJZRdhDZ6bVuPNKGsYBzpNloOc6KLCSYdPawr+wAR4YVoJALDtYqYnoDkTdIwgCLhqhPgiHPRIJPmAPqM3xYDD6yoKBSUTYZ+mbNIwDtnVA54jYFRlAgPAr2yszDdpQMGWTNZxAgJq1L8Cymc68/8x4TOPbQNhPcaRj0nAOYFRKp0ClHyGzZF4EiRLJZ3cYtFPmRWeZvhZY245p7wJUaYjGb3fFV3RzmbIx6o0jV5T1jsrGkPos0yJklsyLIFEi+ewKgzbOgI/0dmyMmEkwBFuUaDhfmVnM7r1oQi3xWSotgldrSXKUR8yaDFIrW1qMUov1J+qRKJET/VgJmSUzaJDRqalYQBVNB1hkv8IXmh18fF+D65oasekKIruGApkaPxapr0fq4zK6i0DmMDFw7dsVeFveA+U5YFsKu8RyolHcf4npTTkpQ+pH5SMc6NCJViYfTfnjZN23hwOG1I/KR+AK6UiHbE8Vs6TJgXE5ALbQlmlsqXT51UCeYj+UOCuRj8atfqaeHFgOBzxSH2hW1wUo1zrejpGPlsPKTGXKHDCHmGAiI4Q8TkfC1zgwt6TkQHKgAIfpGOwbRsj2j1I+inArw0yCA5ix2DINiFAXeU9Pq/Jp3lWmfJ8cWDsHMMexjhQxaARFYuH3WXvpswDJgQ3hgFkyAw+KkOHrcGWd8lGEYxlmEhywIzOjnnAxVWFGWsQKeRKMzUpOhwPAymyZ1tcTbspH02knWdMODgCxso7U1xNuykcdzM3X0+EA1sR0JDZgI2T7R+DrUj6KcCzD7FgO4KEJb7T44cDnAh0Ja2t8+eGfo+kFCesCvANzWB3+GAjPeVqc2rHfAH8jO5axWbHpcAADUw6g43C7touTIM0xj3GFM7XawvKM8ByqNjr9D+9YuR11hSRCAAAAAElFTkSuQmCC" />
	       * </div>
	       *
	       * This function returns `p(r; H)`.
	       * 
	       * (see [Poisson distribution](https://en.wikipedia.org/wiki/Poisson_distribution))
	       *
	       * (Useful if you are wondering _"If I use this lib and expect to perform at most
	       * `r` rounds of UUID generations, what is the probability that I will hit a duplicate UUID?"_.)
	       */
	      __publicField(this, "collisionProbability", (rounds = this.availableUUIDs(this.uuidLength), uuidLength = this.uuidLength) => {
	        return parseFloat(
	          (this.approxMaxBeforeCollision(rounds) / this.availableUUIDs(uuidLength)).toFixed(20)
	        );
	      });
	      /**
	       * Calculate a "uniqueness" score (from 0 to 1) of UUIDs based on size of
	       * dictionary and chosen UUID length.
	       *
	       * Given that:
	       *
	       * - `H` is the total number of possible UUIDs, or in terms of this library,
	       * the result of running `availableUUIDs()`
	       * - `Q(H)` is the approximate number of hashes before first collision,
	       * or in terms of this library, the result of running `approxMaxBeforeCollision()`
	       *
	       * Then `uniqueness` can be expressed as the additive inverse of the probability of
	       * generating a "word" I had previously generated (a duplicate) at any given iteration
	       * up to the the total number of possible UUIDs expressed as the quotiend of `Q(H)` and `H`:
	       *
	       * <div style="background: white; padding: 5px; border-radius: 5px; overflow: hidden;">
	       *  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIcAAABDCAYAAAC2nhaoAAAJK0lEQVR4Ae2dB+w9RRHHvyCgYgUVxViCBQIRFRQEFVEERVGKggYwJiAkxCgqECkRJQqiCQjSYsEYCyrFggRDSywUpSN/ihXQINUCCigK4vvEmWS5XJm99/+/37t3O8nl3tudLTc7tzM7M7snFZgVBVaSdLikrWfVYEM7x0vaqCGvJAco8BhJW0raV9IRkg6V9B5JawfKNqGcKOljTZkzTH+apEslvXKGbS5EU8+T9FlJv5Z0jKQ3S3qZpNdJ+rikuySdIekFmU/7YUnfC5Z5iqRf2XWFpPT6paTfS9oqqeuxkq6zPqe4/L7G8LdP8Pm5nqTfSHpWJb38raHAKpL2l3SPzRRPrcEh6en21v3FGKYB7VHJm0q6U9IzH5Xa/udxkp4vCRHwiF0flLSWpNVrisIgMPZnEvyDbPCfUINP0n6T2fHHkhB3BRoosOZED7hI0t8kvb4BJ01mkP8sCQZZJ82o+b2yMdMBNXmRpBNssP8YQZZ0pOHTN0RjG6xqs8pubUhjznuOpOsl3SeJNzwK6A680V2iYg8TRXVve6StZdbO1yLIki4x/O8H8feR9CdJTwzijwbtyZJuNGK+K/OpX2zl/ivphS1l0RGObslvy3rGRM+hfphwzzZEy2OA/234Hwrgg0KZv0uCSQoYBZCzvF0Q/ts9qEJ5xBDl399QHqWR/I0b8ruSd7by1BFRgLdN8FGio/AtSZdFkceAx5sC0XnTIoSvowkrGur4Yl3mRBn8wuSNvGMKhS9X33BlFH0DXScK77XneEm0wCLjPckGjYHF9tAXbjGiNukd5PeZlbw/LE/pY1Tf+EVHf7ze6p1VDu2w3B49YK+AGFzr96QGYuVfVsdpNXW4TsJysg/k6hswfK6+kfbrbkmnpwlj/M2g3myDirLYFzAeOYMx/VdhR8t/ezUj+H+XpP6I2Htrgp+jb3h3fjZReqPLZS+zcHdMxj6omMT7wnZJPXUK6cGW39eH4foGff1r4Lrf2sP+kqNv+POfMnERPCxpNU8Y4/0TyaC+cQoCYGJ3JqsTTT64fX0x2F6o/8vBPv7c8L8bxK+iHWXl25bl1TIL9x+5CtF5S/Bh9AV8H9SDnQRRVQWUSPKxpeQCJnK3b+Ds64LUvoGjsA8cZv19RZ/Ci1LmJ0aE26d4IEQFA8/1gYZ6cM6Rj88jFzDIef2sJLoA56Djv7QLuSH/QKsDB+NoAUcThLx2Cgp83eq4tcXs7DMUDrRcYHlNH/G+RuDThp9r30jrPsTq2DxNHNtvlp0QHhtCH3hRsmTctaUCFytrtOA0Zbm+8ZUmhEq6+1P66htU90mjy6gNYT59YvrOBXSLC4yI32nQNbzOzxkebvccSPUNLJddgEPvQWsLl35fONbqiIixvm3MfTneDFf2mAVSwP3O6gBfA6uNqqcS/YJZ5ypJTTESXh8DBe5rPCF4f7eVo2yEsd6U4G8YbKMODTH4z4Cbv67sQqWdZQRlKnV4tkV4uRhY14J+PH+nSYjfQ5Iut4AfT2+6v8XaaBM9dWVPsnIY6iJACCOM1Ne+4W0QNjiNUdDrGfydNxJicrkdAjHw3MqTYRgC9ra3CpkeXZoSQMRymeCbHPAlctSfcrExR5N/J9I2RjPiWaJtRuocNM6rzPl2tYXXsQKpAlPtDwyPoJ1c4E08t6MQAwNTYvJ2fYiZgLZfXeMxBh/xt9kkEg3R5SLybBNhGLHq7C5t3djAGKxEhCVUYtZAxyBo+HcWYU5MxPtscJDBvPl1UVwMXBfgQses3bacfblFb50/Gdy6i5UISqoD4o60OlzSyIvoKl4fd5gMkUl8bBbAqZicI5pzVsVzhIxyCVPsZUYtjFAMAnK4znGGIktkehdQB282+sc8wzmTgKQf5nSQ6OvdTQFjmkuVt5x6hoz7W5tN0mcgSv1HkjZJE1t+Y3Rj2TuvQAwts8Y2kQ5+1aKqb7LlnAeQjJE5UFj/kCiqyHpWOtAkCq81ZZbV0DwC1tUro3oKQSOp29Z9BGNkDhiDWZM3C18MvxETuf6Hb9r+k3ljDgKK7jXltlffxswc7kOBKfz6aA8qovjih0H5nCfg+dg01RvGzBwMKkvE2ybbD4mU2qE3FaUtbFtjl2V1iiayir7DnimVElkVgDxm5sgmVkcBFHwMaawAlxLYKnFhn6VrtdOFOaoUme4/sRfs3l9KQDQ27QXO6ldhjixyjQu5MMe4xjvraQtzZJFrXMiFOcY13llPu7yYAxc2fgo260x79dm0w7KU5Vu54jTo3AC+vJgDZxZb7iIbdLpwzsti7/8jsyPsH+XKogGBR62wvJijtZGSOUwKFOYY5rjNpNeFOWZC5mE2UphjmOM2k17jC8Aj+amZtFYaGQwFCFQlEATm+MZgel06usIowK5uIp8JVuUwD49j4H7DJCKaZSRbCt+wwnpQKp5bCnBcEedxshW/6SIsfl7D3uaRsNCUs8GIdOdwufT60uToqVMr9GSrArvuTq7gejlezshpP/NIi9KnCgXY2sCxk8zKHpNLuCG71d422X9LnCmByw5sZWBmJv7Dj4xg5uY8U6zMBA5NFaTjDZX7fFHgTBPVbHuIAPGnLtIj+AVnoBRAwceFwGAza0TAj7M8LoJccIZLARyGMAYXu+O7AL3C8d/ZhVzyh00BziNnsP8z0R/YAtIFbMsEH/0k3RLZVa7kD5ACftY6O+MjgG0J5pjmiKpIOwVniSlAxDk76BjsqL7hm6qKvrHEg7eim2dDE4zBFdE32Kzt+EXfWNGjs8T1c+g8gx3VNzgwBnz0jeyjEZb4WUvzmRRwfeOBlrM10jM3XKQUfSOT0ENDR9/gjFBmAs4YbXJLpOmOX/SNoY12Zn/TE48jDkuObnJ9g4DoAgtMgY/YYPN9lscHnjO1bxR9I0CwIaO4P+WnwYfwox/K0Y9Bgg0VDX2DrRaIiegBOK6Mfn6oD136HaMAG4Ncf4h83yX1pxR9I0bjwWLxSXCYg/PJ646srD4Y348Fv9g3qpRZwP8c4chgc1hKBPxrC0XfiFBrwDh8S94/THx48DlK/EaQUENGQxF1EzgzB19cIK0JCBNMv9DEBwRhrgILRAE+icFXqLmqG8I5fH5Z5Vn5ymQVz/+Dz0G5q1bKzOzv/wAvzKhnhyEMfQAAAABJRU5ErkJggg==" />
	       * </div>
	       *
	       * (Useful if you need a value to rate the "quality" of the combination of given dictionary
	       * and UUID length. The closer to 1, higher the uniqueness and thus better the quality.)
	       */
	      __publicField(this, "uniqueness", (rounds = this.availableUUIDs(this.uuidLength)) => {
	        const score = parseFloat(
	          (1 - this.approxMaxBeforeCollision(rounds) / rounds).toFixed(20)
	        );
	        return score > 1 ? 1 : score < 0 ? 0 : score;
	      });
	      /**
	       * Return the version of this module.
	       */
	      __publicField(this, "getVersion", () => {
	        return this.version;
	      });
	      /**
	       * Generates a UUID with a timestamp that can be extracted using `uid.parseStamp(stampString);`.
	       * 
	       * ```js
	       *  const uidWithTimestamp = uid.stamp(32);
	       *  console.log(uidWithTimestamp);
	       *  // GDa608f973aRCHLXQYPTbKDbjDeVsSb3
	       * 
	       *  console.log(uid.parseStamp(uidWithTimestamp));
	       *  // 2021-05-03T06:24:58.000Z
	       *  ```
	       */
	      __publicField(this, "stamp", (finalLength, date) => {
	        const hexStamp = Math.floor(+(date || /* @__PURE__ */ new Date()) / 1e3).toString(16);
	        if (typeof finalLength === "number" && finalLength === 0) {
	          return hexStamp;
	        }
	        if (typeof finalLength !== "number" || finalLength < 10) {
	          throw new Error(
	            [
	              "Param finalLength must be a number greater than or equal to 10,",
	              "or 0 if you want the raw hexadecimal timestamp"
	            ].join("\n")
	          );
	        }
	        const idLength = finalLength - 9;
	        const rndIdx = Math.round(Math.random() * (idLength > 15 ? 15 : idLength));
	        const id = this.randomUUID(idLength);
	        return `${id.substring(0, rndIdx)}${hexStamp}${id.substring(rndIdx)}${rndIdx.toString(16)}`;
	      });
	      /**
	       * Extracts the date embeded in a UUID generated using the `uid.stamp(finalLength);` method.
	       * 
	       * ```js
	       *  const uidWithTimestamp = uid.stamp(32);
	       *  console.log(uidWithTimestamp);
	       *  // GDa608f973aRCHLXQYPTbKDbjDeVsSb3
	       * 
	       *  console.log(uid.parseStamp(uidWithTimestamp));
	       *  // 2021-05-03T06:24:58.000Z
	       *  ```
	       */
	      __publicField(this, "parseStamp", (suid, format) => {
	        if (format && !/t0|t[1-9]\d{1,}/.test(format)) {
	          throw new Error("Cannot extract date from a formated UUID with no timestamp in the format");
	        }
	        const stamp = format ? format.replace(
	          /\$[rs]\d{0,}|\$t0|\$t[1-9]\d{1,}/g,
	          (m) => {
	            const fnMap = {
	              "$r": (len2) => [...Array(len2)].map(() => "r").join(""),
	              "$s": (len2) => [...Array(len2)].map(() => "s").join(""),
	              "$t": (len2) => [...Array(len2)].map(() => "t").join("")
	            };
	            const fn = m.slice(0, 2);
	            const len = parseInt(m.slice(2), 10);
	            return fnMap[fn](len);
	          }
	        ).replace(
	          /^(.*?)(t{8,})(.*)$/g,
	          (_m, p1, p2) => {
	            return suid.substring(p1.length, p1.length + p2.length);
	          }
	        ) : suid;
	        if (stamp.length === 8) {
	          return new Date(parseInt(stamp, 16) * 1e3);
	        }
	        if (stamp.length < 10) {
	          throw new Error("Stamp length invalid");
	        }
	        const rndIdx = parseInt(stamp.substring(stamp.length - 1), 16);
	        return new Date(parseInt(stamp.substring(rndIdx, rndIdx + 8), 16) * 1e3);
	      });
	      /**
	       * Set the counter to a specific value.
	       */
	      __publicField(this, "setCounter", (counter) => {
	        this.counter = counter;
	      });
	      /**
	       * Validate given UID contains only characters from the instanced dictionary or optionally provided dictionary.
	       */
	      __publicField(this, "validate", (uid, dictionary) => {
	        const finalDictionary = dictionary ? this._normalizeDictionary(dictionary) : this.dict;
	        return uid.split("").every((c) => finalDictionary.includes(c));
	      });
	      const options = __spreadValues(__spreadValues({}, DEFAULT_OPTIONS), argOptions);
	      this.counter = 0;
	      this.debug = false;
	      this.dict = [];
	      this.version = version;
	      const {
	        dictionary,
	        shuffle,
	        length,
	        counter
	      } = options;
	      this.uuidLength = length;
	      this.setDictionary(dictionary, shuffle);
	      this.setCounter(counter);
	      this.debug = options.debug;
	      this.log(this.dict);
	      this.log(
	        `Generator instantiated with Dictionary Size ${this.dictLength} and counter set to ${this.counter}`
	      );
	      this.log = this.log.bind(this);
	      this.setDictionary = this.setDictionary.bind(this);
	      this.setCounter = this.setCounter.bind(this);
	      this.seq = this.seq.bind(this);
	      this.sequentialUUID = this.sequentialUUID.bind(this);
	      this.rnd = this.rnd.bind(this);
	      this.randomUUID = this.randomUUID.bind(this);
	      this.fmt = this.fmt.bind(this);
	      this.formattedUUID = this.formattedUUID.bind(this);
	      this.availableUUIDs = this.availableUUIDs.bind(this);
	      this.approxMaxBeforeCollision = this.approxMaxBeforeCollision.bind(this);
	      this.collisionProbability = this.collisionProbability.bind(this);
	      this.uniqueness = this.uniqueness.bind(this);
	      this.getVersion = this.getVersion.bind(this);
	      this.stamp = this.stamp.bind(this);
	      this.parseStamp = this.parseStamp.bind(this);
	      return this;
	    }
	  };
	  /** @hidden */
	  __publicField(_ShortUniqueId, "default", _ShortUniqueId);
	  var ShortUniqueId = _ShortUniqueId;
	  return __toCommonJS(src_exports);
	})();
	
	(module.exports=ShortUniqueId.default),'undefined'!=typeof window&&(ShortUniqueId=ShortUniqueId.default); 
} (shortUniqueId));

var shortUniqueIdExports = shortUniqueId.exports;
var ShortUniqueId = /*@__PURE__*/getDefaultExportFromCjs(shortUniqueIdExports);

const SAME_SITE = {
    strict: "Strict",
    lax: "Lax",
    none: "None"
};
const uuid = new ShortUniqueId();
const getDefaultLogSourceName = (source)=>{
    if (!source) return undefined;
    if (!isObject(source)) return "" + source;
    let constructorName = source.constructor?.name;
    let name = source.logId ?? source.id;
    if (name) {
        return (constructorName && constructorName !== "Object" ? constructorName + ":" : "") + name;
    }
    return constructorName ?? "" + source;
};
class TrackerEnvironment {
    _crypto;
    _host;
    _logGroups = new Map();
    tags;
    cookieVersion;
    storage;
    constructor(host, crypto, storage, tags, cookieVersion = "C"){
        this._host = host;
        this._crypto = crypto;
        this.tags = tags;
        this.cookieVersion = cookieVersion;
        this.storage = storage;
    }
    /** @internal */ _setLogInfo(...sources) {
        sources.forEach((source)=>this._logGroups.set(source, {
                group: source.group,
                name: source.name ?? getDefaultLogSourceName(source)
            }));
    }
    httpEncrypt(value) {
        return this._crypto.encrypt(value);
    }
    httpEncode(value) {
        return httpEncode(value);
    }
    httpDecode(encoded) {
        return encoded == null ? undefined : httpDecode(encoded);
    }
    httpDecrypt(encoded) {
        if (encoded == null) return undefined;
        return this._crypto.decrypt(encoded);
    }
    hash(value, numericOrBits, secure = false) {
        return value == null ? value : secure ? this._crypto.hash(value, numericOrBits) : hash(value, numericOrBits);
    }
    log(source, arg, level, error) {
        // This is what you get if you try to log nothing (null or undefined); Nothing.
        if (!arg) return;
        const message = !isObject(arg) || arg instanceof Error ? {
            message: arg instanceof Error ? "An error ocurred" : arg,
            level: level ?? (error ? "error" : "info"),
            error
        } : arg;
        const { group, name = getDefaultLogSourceName(source) } = this._logGroups.get(source) ?? {};
        message.group ??= group;
        message.source ??= name;
        this._host.log(message);
    }
    async nextId(scope) {
        return uuid.rnd();
    }
    readText(path, changeHandler) {
        return this._host.readText(path, changeHandler);
    }
    read(path, changeHandler) {
        return this._host.read(path, changeHandler);
    }
    async request(request) {
        request.method ??= request.body ? "POST" : "GET";
        request.headers ??= {};
        delete request.headers["host"];
        delete request.headers["accept-encoding"];
        const response = await this._host.request({
            url: request.url,
            binary: request.binary,
            method: request.method,
            body: request.body,
            headers: request.headers ?? {},
            x509: request.x509
        });
        const responseHeaders = Object.fromEntries(Object.entries(response.headers).map(([name, value])=>[
                name.toLowerCase(),
                value
            ]));
        const cookies = {};
        for (const cookie of response.cookies){
            const ps = parseHttpHeader(cookie, false);
            const [name, value] = ps[parameterList][0] ?? [];
            if (!name) continue;
            cookies[name] = {
                value,
                httpOnly: "httponly" in ps,
                sameSitePolicy: SAME_SITE[ps["samesite"]] ?? "Lax",
                maxAge: ps["max-age"] ? parseInt(ps["max-age"]) : undefined
            };
        }
        responseHeaders["content-type"] ??= "text/plain";
        return {
            request,
            status: response.status,
            headers: responseHeaders,
            cookies,
            body: response.body
        };
    }
    // #region LogShortcuts
    trace(source, message) {
        this.log(source, message, "trace");
    }
    debug(source, message) {
        this.log(source, message, "debug");
    }
    warn(source, message, error) {
        this.log(source, message, "warn", error);
    }
    error(source, message, error) {
        this.log(source, isString(message) ? message : (error = message)?.message, "error", error);
    }
}

class DefaultClientIdGenerator {
    _headers;
    constructor({ headers = [
        "accept-encoding",
        "accept-language",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
        "user-agent"
    ] } = {}){
        this._headers = headers;
    }
    async generateClientId(environment, request, stationary, entropy) {
        let clientString = [
            stationary ? "" : request.clientIp,
            entropy,
            ...this._headers.map((header)=>request.headers[header] + ""),
            entropy
        ].join("&");
        return environment.hash(clientString, 128);
    }
}

const hasChanged = (getter, current)=>getter.version == null || current?.version !== getter.version;
class InMemoryStorageBase {
    _ttl;
    /** For testing purposes to have the router apply the patches. @internal */ _testDisablePatch;
    constructor(scopeDurations, cleanFrequency = 10000){
        this._ttl ??= scopeDurations;
        if (some(this._ttl, ([, ttl])=>ttl > 0)) {
            setInterval(()=>this.clean(), cleanFrequency);
        }
    }
    _remove(variable, timestamp) {
        const values = this._getScopeVariables(variable.scope, variable.targetId, false);
        if (values?.[1].has(variable.key)) {
            const ttl = this._ttl?.[variable.scope];
            values[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
            values[1].delete(variable.key);
            return true;
        }
        return false;
    }
    _update(variable, timestamp) {
        let scopeValues = this._getScopeVariables(variable.scope, variable.targetId, true);
        scopeValues[0] = variable.ttl ? (timestamp ?? now()) + variable.ttl : undefined;
        scopeValues[1].set(variable.key, variable);
        return variable;
    }
    _validateKey(key) {
        if (key && key.scope !== VariableScope.Global && !key.targetId) {
            throw new TypeError(`Target ID is required for non-global scopes.`);
        }
        return key;
    }
    _query(filters, settings) {
        const results = new Set();
        const timestamp = now();
        const ifNoneMatch = settings?.ifNoneMatch ? new Map(settings.ifNoneMatch.map((variable)=>[
                variableId(variable),
                variable.version
            ])) : null;
        const ifModifiedSince = settings?.ifModifiedSince ?? 0;
        for (const queryFilter of filters){
            const match = (variable)=>{
                const { purposes, classification, tags } = queryFilter;
                if (!variable || variable.purposes && purposes && !(variable.purposes & purposes) || classification && (variable.classification < classification.min || variable.classification > classification.max || classification.levels?.some((level)=>variable.classification === level) === false) || tags && (!variable.tags || !tags.some((tags)=>tags.every((tag)=>variable.tags.includes(tag))))) {
                    return false;
                }
                let matchVersion;
                if (ifModifiedSince && variable.modified < ifModifiedSince || (matchVersion = ifNoneMatch?.get(variableId(variable))) != null && variable.version === matchVersion) {
                    // Skip the variable because it is too old or unchanged based on the settings provided for the query.
                    return false;
                }
                return true;
            };
            for (const scope of queryFilter.scopes ?? variableScope.values){
                for (const [, scopeVars] of queryFilter.targetIds?.map((targetId)=>[
                        targetId,
                        this._getScopeVariables(scope, targetId, false)
                    ]) ?? this._getTargetsInScope(scope)){
                    if (!scopeVars || scopeVars[0] <= timestamp) continue;
                    const vars = scopeVars[1];
                    let nots = undefined;
                    const mappedKeys = queryFilter.keys?.map((key)=>{
                        // Find keys that starts with `!` to exclude them from the results.
                        const parsed = parseKey(key);
                        if (parsed.not) {
                            (nots ??= new Set()).add(parsed.sourceKey);
                        }
                        return parsed.key;
                    }) ?? vars.keys();
                    for (const key of mappedKeys.includes("*") ? vars.keys() : mappedKeys){
                        if (nots?.has(key)) continue;
                        const value = vars.get(key);
                        if (match(value)) {
                            results.add(value);
                        }
                    }
                }
            }
        }
        return [
            ...results
        ];
    }
    clean() {
        const timestamp = now();
        forEach(this._ttl, ([scope, ttl])=>{
            if (ttl == null) return;
            const variables = this._getTargetsInScope(scope);
            forEach(variables, ([targetId, variables])=>variables[0] <= timestamp - ttl && this._deleteTarget(scope, targetId));
        });
    }
    renew(scope, targetIds, context) {
        const timestamp = now();
        const ttl = this._ttl?.[scope];
        if (!ttl) return;
        for (const targetId of targetIds){
            const vars = this._getScopeVariables(scope, targetId, false);
            if (vars) {
                vars[0] = timestamp;
            }
        }
    }
    async get(getters, context) {
        const variables = getters.map((getter)=>({
                current: getter && this._getScopeVariables(getter.scope, getter.targetId, false)?.[1].get(getter.key),
                getter
            }));
        const results = [];
        let timestamp;
        for (const [item, i] of rank(variables)){
            if (!item.getter) continue;
            if (!item.current) {
                if (item.getter?.init) {
                    const initialValue = await unwrap(item.getter.init);
                    if (initialValue?.value) {
                        // Check if the variable has been created by someone else while the initializer was running.
                        results[i] = copy(this._update({
                            ...extractKey(item.getter),
                            ...initialValue,
                            created: timestamp ??= now(),
                            modified: timestamp,
                            accessed: timestamp,
                            version: this._getNextVersion(undefined)
                        }), {
                            status: VariableResultStatus.Created
                        });
                        continue;
                    }
                }
                results[i] = {
                    ...extractKey(item.getter),
                    status: VariableResultStatus.NotFound
                };
                continue;
            }
            if (!(item.current.purposes & ((item.getter.purpose ?? 0) | DataPurposeFlags.Any_Anonymous))) {
                results[i] = {
                    ...extractKey(item.getter),
                    status: VariableResultStatus.Denied,
                    error: `${formatKey(item.getter)} is not stored for ${dataPurposes.logFormat(item.getter.purpose ?? DataPurposeFlags.Necessary)}`
                };
                continue;
            }
            results[i] = copy(item.current, {
                status: item.getter?.version && item.getter?.version === item.current?.version ? VariableResultStatus.Unchanged : VariableResultStatus.Success,
                accessed: now()
            });
        }
        return results;
    }
    head(filters, options, context) {
        return this.query(filters, options);
    }
    query(filters, options, context) {
        const results = this._query(filters, options);
        return {
            count: options?.count ? results.length : undefined,
            // This current implementation does not bother with cursors. If one is requested we just return all results. Boom.
            results: (options?.top && !options?.cursor?.include ? results.slice(options.top) : results).map((variable)=>copy(variable))
        };
    }
    async set(variables, context) {
        const timestamp = now();
        const results = [];
        for (const source of variables){
            this._validateKey(source);
            if (!source) {
                results.push(undefined);
                continue;
            }
            let { key, targetId, scope, classification, purposes, value, version, tags } = source;
            let scopeVars = this._getScopeVariables(source.scope, source.targetId, false);
            if (scopeVars?.[0] < timestamp) {
                scopeVars = undefined;
            }
            let current = scopeVars?.[1].get(key);
            if (source.patch != null) {
                if (this._testDisablePatch) {
                    results.push({
                        status: VariableResultStatus.Unsupported,
                        source
                    });
                    continue;
                }
                const patched = await applyPatch(current, source);
                if (patched == null) {
                    results.push({
                        status: VariableResultStatus.Unchanged,
                        source,
                        current: copy(current)
                    });
                    continue;
                }
                classification = patched.classification ?? classification;
                purposes = patched.purposes ?? purposes;
                value = patched.value;
            } else if (!source.force && current?.version !== version) {
                results.push({
                    status: VariableResultStatus.Conflict,
                    source,
                    current: copy(current)
                });
                continue;
            }
            if (value == null) {
                results.push({
                    status: current && this._remove(current) ? VariableResultStatus.Success : VariableResultStatus.Unchanged,
                    source,
                    current: undefined
                });
                continue;
            }
            const previous = current;
            const nextValue = {
                key,
                value,
                classification,
                targetId,
                scope,
                created: current?.created ?? now(),
                modified: now(),
                accessed: now(),
                version: this._getNextVersion(current),
                purposes: current?.purposes != null || purposes ? (current?.purposes ?? 0) | (purposes ?? 0) : DataPurposeFlags.Necessary,
                tags: tags && [
                    ...tags
                ]
            };
            current = this._update(nextValue, timestamp);
            results.push(current ? {
                status: previous ? VariableResultStatus.Success : VariableResultStatus.Created,
                source,
                current
            } : {
                status: VariableResultStatus.Denied,
                source
            });
        }
        return results;
    }
    purge(filters, context) {
        let any = false;
        for (const variable of this._query(filters)){
            any = this._remove(variable) || any;
        }
        return any;
    }
}
class InMemoryStorage extends InMemoryStorageBase {
    _variables = variableScope.values.map(()=>new Map());
    constructor(scopeDurations, cleanFrequency = 10000){
        super(scopeDurations, cleanFrequency);
    }
    _getNextVersion(key) {
        return key?.version ? "" + (parseInt(key.version) + 1) : "1";
    }
    _getScopeVariables(scope, targetId, require) {
        let values = this._variables[scope]?.get(targetId ?? "");
        if (!values && require) {
            (this._variables[scope] ??= new Map()).set(targetId ?? "", values = [
                undefined,
                new Map()
            ]);
        }
        return values;
    }
    _resetScope(scope) {
        this._variables[scope]?.clear();
    }
    _deleteTarget(scope, targetId) {
        this._variables[scope]?.delete(targetId);
    }
    _getTargetsInScope(scope) {
        try {
            return this._variables[scope] ?? [];
        } catch (e) {
            console.log("Nope", scope);
            return [];
        }
    }
}

const parseFilter = (filter)=>{
    filter.scopes = map(filter.scopes, variableScope);
    filter.classification && (filter.classification = {
        min: dataClassification(filter.classification.min),
        max: dataClassification(filter.classification.max),
        levels: map(filter.classification.levels, dataClassification)
    });
    filter.purposes = dataPurposes(filter.purposes);
    return filter;
};
const parseQueryOptions = (options)=>{
    options?.ifNoneMatch && (options.ifNoneMatch = toNumericVariableEnums(options.ifNoneMatch));
    return options;
};
const parseContext = (context)=>{
    context?.consent && (context.consent = {
        level: dataClassification(context.consent.level),
        purposes: dataPurposes(context.consent.purposes)
    });
    return context;
};
/**
 * A wrapper around a {@link VariableStorage} that accepts string values for enums.
 */ class ParsingVariableStorage {
    storage;
    constructor(storage){
        this.storage = storage;
    }
    renew(scope, scopeIds, context) {
        return this.storage.renew(variableScope(scope), scopeIds, parseContext(context));
    }
    purge(filters, context) {
        return this.storage.purge(map(filters, parseFilter), parseContext(context));
    }
    initialize(environment) {
        return this.storage.initialize?.(environment);
    }
    get(keys, context) {
        return toVariableResultPromise(async ()=>{
            for (const key of keys){
                if (!key) continue;
                toNumericVariableEnums(key);
                key.init = wrap(key.init, async (original)=>toNumericVariableEnums(await original()));
            }
            return await this.storage.get(keys, parseContext(context));
        });
    }
    set(setters, context) {
        return toVariableResultPromise(async ()=>{
            for (const key of setters){
                if (!key) continue;
                toNumericVariableEnums(key);
                // TODO: Why exceptions swallowed here?
                if (isVariablePatchAction(key)) {
                    key.patch = wrap(key.patch, async (original, current)=>toNumericVariableEnums(await original(current)));
                }
            }
            return await this.storage.set(setters, parseContext(context));
        });
    }
    head(filters, options, context) {
        this.set([
            {
                key: "ok",
                scope: "device",
                value: 32
            }
        ]).result;
        return this.storage.head(map(filters, parseFilter), parseQueryOptions(options), parseContext(context));
    }
    query(filters, options, context) {
        return this.storage.query(map(filters, parseFilter), parseQueryOptions(options), parseContext(context));
    }
    toStorage() {
        const storage = {};
        for(const method in [
            "head",
            "query",
            "configureScopeDurations",
            "renew",
            "purge"
        ]){
            storage[method] = (...args)=>this[method](...args);
        }
        storage["get"] = (...args)=>this.get(...args).all;
        storage["set"] = (...args)=>this.set(...args).all;
        return storage;
    }
}

class TargetedVariableCollection {
    _scopes = new Map();
    _size = 0;
    get size() {
        return this._size;
    }
    _updateSize = (delta)=>{
        this._size += delta;
    };
    constructor(values){
        if (values) {
            this.set(values);
        }
    }
    get(key, init) {
        if (key == null) return undefined;
        if (isString(key)) {
            return this._scopes.get(key);
        }
        let targetId = key.targetId ?? "";
        let collection = this._scopes.get(targetId);
        if (init && !collection) {
            this._scopes.set(targetId, collection = new VariableMap(this._updateSize));
        }
        return collection?.get(key, init && ((scope, key)=>init(mapKey(scope, key, targetId))));
    }
    has(source, scope) {
        if (source == null) return undefined;
        if (isString(source)) {
            return scope != null ? this._scopes.get(source)?.has(scope) ?? false : this._scopes.has(source);
        }
        return this._scopes.get(source.targetId ?? "")?.has(source) ?? false;
    }
    clear() {
        this._updateSize(-this._size);
        this._scopes.clear();
        return this;
    }
    delete(key) {
        if (key == null) return false;
        if (isIterable(key)) {
            let deleted = false;
            for (const item of key){
                item != null && (deleted = this.delete(item) || deleted);
            }
            return deleted;
        }
        if (isString(key)) {
            const scopes = this._scopes.get(key);
            if (!scopes) {
                return false;
            }
            this._updateSize(-scopes.size);
            this._scopes.delete(key);
            return true;
        }
        return this._scopes.get(key.targetId ?? "")?.delete(key) ?? false;
    }
    set(key, value) {
        if (key == null) return this;
        if (isIterable(key)) {
            for (const item of key){
                item && this.set(item[0], item[1]);
            }
            return this;
        }
        if (value == null) {
            this.delete(key);
            return this;
        }
        const targetId = key.targetId ?? "";
        let scopes = this._scopes.get(targetId);
        if (!this._scopes.has(targetId)) {
            this._scopes.set(targetId, scopes = new VariableMap(this._updateSize));
        }
        scopes?.set(key, value);
        return this;
    }
    update(key, update) {
        if (!key) return undefined;
        let newValue = update(this.get(key));
        this.set(key, newValue);
        return newValue;
    }
    targets(keys) {
        return keys ? this._scopes.keys() : this._scopes.entries();
    }
    *[Symbol.iterator]() {
        for (const [targetId, scopes] of this._scopes){
            for (const [[scope, key], value] of scopes){
                yield [
                    mapKey(scope, key, targetId),
                    value
                ];
            }
        }
    }
}

const mapKey = (scope, key, targetId)=>scope === VariableScope.Global ? {
        scope,
        key
    } : {
        scope,
        key,
        targetId
    };
class VariableMap {
    _values = new Map();
    _onSizeChanged;
    constructor(arg){
        if (isFunction(arg)) {
            this._onSizeChanged = arg;
        } else if (arg) {
            this.set(arg);
        }
    }
    _size = 0;
    get size() {
        return this._size;
    }
    _updateSize(delta) {
        this._size += delta;
        this._onSizeChanged?.(delta);
    }
    get(source, arg2, init) {
        if (source == null) return undefined;
        let scope, key;
        if (isObject(source)) {
            scope = variableScope.parse(source.scope, false);
            key = source.key;
            init = arg2;
        } else {
            scope = variableScope.parse(source, false);
            key = arg2;
        }
        let values = this._values.get(scope);
        if (key != null) {
            let value = values?.get(key);
            if (init && value === undefined) {
                if (!values) {
                    this._values.set(scope, values = new Map());
                }
                this._updateSize(1);
                values.set(key, value = init(scope, key));
            }
            return value;
        }
        return values;
    }
    has(source, key) {
        if (source == null) return undefined;
        if (isObject(source)) {
            return this._values.get(variableScope.parse(source.scope, false))?.has(source.key) ?? false;
        }
        const scope = variableScope.parse(source, false);
        return key != null ? this._values.get(scope)?.has(key) ?? false : this._values.has(scope);
    }
    clear() {
        this._updateSize(-this._size);
        this._values?.clear();
        return this;
    }
    delete(arg1, arg2) {
        if (arg1 == null) return false;
        let scope, key;
        if (isObject(arg1)) {
            if (isIterable(arg1)) {
                let deleted = false;
                for (const key of arg1){
                    if (!key) continue;
                    deleted = (isIterable(key) ? this.delete(key[0], key[1]) : this.delete(key)) || deleted;
                }
                return deleted;
            }
            scope = variableScope.parse(arg1.scope, false);
            key = arg1.key;
        } else {
            scope = variableScope.parse(arg1, false);
            key = arg2;
        }
        const values = this._values.get(scope);
        if (!values) return false;
        if (key != null) {
            if (!values.has(key)) return false;
            this._updateSize(-1);
            values.delete(key);
            if (values.size) return true;
        // If no more keys, delete the scope.
        }
        this._updateSize(-values.size);
        this._values.delete(scope);
        return true;
    }
    set(arg1, arg2, arg3) {
        if (arg1 == null) return this;
        let scope, key, value;
        if (isObject(arg1)) {
            if (isIterable(arg1)) {
                for (const item of arg1){
                    if (!item) continue;
                    const [key, value] = item;
                    isIterable(key) ? this.set(key[0], key[1], value) : this.set(key, value);
                }
                return this;
            }
            scope = variableScope.parse(arg1.scope, true);
            key = arg1.key;
            value = arg2;
        } else {
            scope = variableScope.parse(arg1, true);
            key = arg2;
            value = arg3;
        }
        if (value === undefined) {
            this.delete(scope, key);
            return this;
        }
        let values = this._values.get(scope);
        if (!values) {
            this._values.set(scope, values = new Map());
        }
        if (!values.has(key)) {
            this._updateSize(1);
        }
        values.set(key, value);
        return this;
    }
    update(arg1, arg2, update) {
        if (arg1 == null) return undefined;
        let scope, key;
        if (isObject(arg1)) {
            scope = variableScope.parse(arg1.scope);
            key = arg1.key;
            update = arg2;
        } else {
            scope = variableScope.parse(arg1);
            key = arg2;
        }
        let newValue = update(this.get(scope, key));
        this.set(scope, key, newValue);
        return newValue;
    }
    scopes(keys) {
        return keys ? this._values.keys() : this._values.entries();
    }
    *[Symbol.iterator]() {
        for (const [scope, values] of this._values){
            for (const [key, value] of values){
                yield [
                    [
                        scope,
                        key
                    ],
                    value
                ];
            }
        }
    }
}

class VariableSplitStorage {
    _mappings = new DoubleMap();
    _cachedStorages = null;
    _errorWrappers = new Map();
    _patchers;
    constructor(mappings, patchers){
        this._patchers = patchers;
        forEach(unwrap(mappings), ([scope, mappings])=>forEach(mappings, ([prefix, { storage }])=>(this._errorWrappers.set(storage, new SplitStorageErrorWrapperImpl(storage)), this._mappings.set([
                    1 * scope,
                    prefix
                ], storage))));
    }
    _keepPrefix(storage) {
        return storage instanceof VariableSplitStorage;
    }
    _mapKey(source) {
        if (!source) return undefined;
        const parsed = parseKey(source.key);
        let storage = this._mappings.get([
            +source.scope,
            parsed.prefix
        ]);
        if (!storage) {
            return undefined;
        }
        return {
            ...parsed,
            storage,
            source
        };
    }
    get _storageScopes() {
        if (!this._cachedStorages) {
            this._cachedStorages = new Map();
            this._mappings.forEach((storage, [scope])=>get(this._cachedStorages, storage, ()=>new Set()).add(scope));
        }
        return this._cachedStorages;
    }
    async renew(scope, scopeIds, context) {
        await waitAll(...map(this._storageScopes, ([storage, mappedScopes])=>isWritable(storage) && mappedScopes.has(scope) && storage.renew(scope, scopeIds, context)));
    }
    _splitKeys(keys) {
        const partitions = new Map();
        keys.forEach((sourceKey, sourceIndex)=>{
            if (!sourceKey) return;
            const mappedKey = this._mapKey(sourceKey);
            if (!mappedKey) {
                throw new Error(`No storage is mapped for the key ${formatKey(sourceKey)}.`);
            }
            const { storage, key } = mappedKey;
            const keepPrefix = this._keepPrefix(storage);
            get(partitions, storage, ()=>[]).push([
                sourceIndex,
                !keepPrefix && key !== sourceKey.key ? {
                    ...sourceKey,
                    key: key
                } : sourceKey
            ]);
        });
        return partitions;
    }
    _splitFilters(filters) {
        const partitions = new Map();
        for (const filter of filters){
            const keySplits = new Map();
            const addKey = (storage, key)=>storage && get(keySplits, storage, ()=>new Set()).add(this._keepPrefix(storage) ? key.sourceKey : key.key);
            const scopes = filter.scopes ?? variableScope.values;
            for (const scope of scopes){
                const scopePrefixes = this._mappings.getMap(scope);
                if (!scopePrefixes) continue;
                for (const key of filter.keys){
                    const parsed = parseKey(key);
                    if (key === "*" || parsed.prefix === "*") {
                        scopePrefixes.forEach((storage)=>addKey(storage, parsed));
                    } else {
                        addKey(scopePrefixes.get(parsed.prefix), parsed);
                    }
                }
            }
            for (const [storage, keys] of keySplits){
                const storageScopes = this._storageScopes.get(storage);
                if (!storageScopes) continue;
                get(partitions, storage, ()=>[]).push({
                    ...filter,
                    keys: [
                        ...keys
                    ],
                    scopes: filter.scopes ? filter.scopes.filter((scope)=>storageScopes.has(scope)) : [
                        ...storageScopes
                    ]
                });
            }
        }
        return [
            ...partitions
        ];
    }
    async get(keys, context) {
        // Make sure none of the underlying storages makes us throw exceptions. A validated variable storage does not do that.
        context = {
            ...context,
            throw: false
        };
        const results = [];
        await waitAll(...map(this._splitKeys(keys), ([storage, split])=>mergeKeys(results, split, async (variables)=>await this._patchers?.get?.(this._errorWrappers.get(storage), variables, await storage.get(variables, context), context) ?? variables)));
        return results;
    }
    async _queryOrHead(method, filters, options, context) {
        const partitions = this._splitFilters(filters);
        const results = {
            count: options?.count ? 0 : undefined,
            results: []
        };
        if (!partitions.length) {
            return results;
        }
        if (partitions.length === 1) {
            return await partitions[0][0][method](partitions[0][1], options);
        }
        const includeCursor = options?.cursor?.include || !!options?.cursor?.previous;
        let cursor = options?.cursor?.previous ? JSON.parse(options.cursor.previous) : undefined;
        let top = options?.top ?? 100;
        let anyCursor = false;
        for(let i = 0; // Keep going as long as we need the total count, or have not sufficient results to meet top (or done).
        // If one of the storages returns an undefined count even though requested, we will also blank out the count in the combined results
        // and stop reading from additional storages since total count is no longer needed.
        i < partitions.length && (top > 0 || results.count != null); i++){
            const [storage, query] = partitions[0];
            const storageState = cursor?.[i];
            let count;
            if (storageState && (storageState[1] == null || !top)) {
                // We have persisted the total count from the storage in the combined cursor.
                // If the cursor is empty it means that we have exhausted the storage.
                // If there is a cursor but `top` is zero (we don't need more results), we use the count cached from the initial query.
                count = storageState[0];
            } else {
                const { count: storageCount, results: storageResults, cursor: storageCursor } = await storage[method](query, {
                    ...options,
                    top,
                    cursor: {
                        include: includeCursor,
                        previous: storageState?.[1]
                    }
                }, context);
                count = storageCount;
                if (includeCursor) {
                    anyCursor ||= !!storageCursor;
                    (cursor ??= [])[i] = [
                        count,
                        storageCursor
                    ];
                } else if (storageResults.length > top) {
                    // No cursor needed. Cut off results to avoid returning excessive amounts of data to the client.
                    storageResults.length = top;
                }
                results.results.push(...storageResults); // This is actually only the header for head requests.
                top = Math.max(0, top - storageResults.length);
            }
            results.count != null && (results.count = count != null ? results.count + 1 : undefined);
        }
        if (anyCursor) {
            // Only if any of the storages returned a cursor for further results, we do this.
            // Otherwise, we return an undefined cursor to indicate that we are done.
            results.cursor = JSON.stringify(cursor);
        }
        return results;
    }
    head(filters, options, context) {
        return this._queryOrHead("head", filters, options, context);
    }
    query(filters, options, context) {
        return this._queryOrHead("query", filters, options, context);
    }
    async set(variables, context) {
        // Make sure none of the underlying storages makes us throw exceptions. A validated variable storage does not do that.
        context = {
            ...context,
            throw: false
        };
        const results = [];
        await waitAll(...map(this._splitKeys(variables), ([storage, split])=>isWritable(storage) && mergeKeys(results, split, async (variables)=>await this._patchers?.set?.(this._errorWrappers.get(storage), variables, await storage.set(variables, context), context) ?? variables)));
        return results;
    }
    async purge(filters, context) {
        const partitions = this._splitFilters(filters);
        if (!partitions.length) {
            return false;
        }
        let any = false;
        await waitAll(...partitions.map(async ([storage, filters])=>isWritable(storage) && (any = await storage.purge(filters, context) || any)));
        return any;
    }
}
class SplitStorageErrorWrapperImpl {
    _storage;
    writable;
    constructor(storage){
        this._storage = storage;
        this.writable = isWritable(storage);
    }
    async get(keys, context) {
        try {
            return await this._storage.get(keys, context);
        } catch (error) {
            return keys.map((key)=>key && {
                    status: VariableResultStatus.Error,
                    error
                });
        }
    }
    async set(variables, context) {
        if (!this.writable) throw new TypeError("Storage is not writable.");
        try {
            return await this._storage.set(variables, context);
        } catch (error) {
            return variables.map((source)=>source && {
                    status: VariableResultStatus.Error,
                    error,
                    source
                });
        }
    }
}

const isWritable = (storage)=>!!storage?.set;

class VariableStorageCoordinator {
    _settings;
    _variables = new TupleMap();
    _storage;
    constructor({ mappings, schema, retries = 3, transientRetryDelay = 50, errorRetryDelay = 250 }){
        const normalizeMappings = (mappings)=>mappings?.storage ? {
                "": mappings
            } : mappings;
        const defaultMapping = mappings.default && normalizeMappings(mappings.default);
        const normalizedMappings = {};
        forEach(mappings, ([scope, mappings])=>scope !== "default" && mappings && (normalizedMappings[variableScope(scope)] = normalizeMappings(mappings)));
        defaultMapping && forEach(variableScope.values, (scope)=>!normalizedMappings[scope] && (normalizedMappings[scope] = defaultMapping));
        this._storage = new VariableSplitStorage(normalizedMappings, {
            get: (storage, getters, results, context)=>this._patchGetResults(storage, getters, results, context),
            set: (storage, setters, results, context)=>this._patchSetResults(storage, setters, results, context)
        });
        this._settings = {
            mappings,
            retries,
            transientRetryDelay,
            errorRetryDelay
        };
        forEach(variableScope.values, (scope)=>forEach(normalizedMappings[scope], ([prefix, mapping])=>this._variables.set([
                    scope,
                    prefix
                ], {
                    variables: ifDefined(mapping.schema, (schemas)=>schema.compileVariableSet(schemas)),
                    classification: mapping.classification
                })));
    }
    async _setWithRetry(setters, targetStorage, context, patch) {
        const finalResults = [];
        let pending = withSourceIndex(setters.map((source, i)=>{
            const scopeError = this._applyScopeId(source, context);
            if (scopeError) {
                finalResults[i] = {
                    status: VariableResultStatus.Denied,
                    error: scopeError,
                    source: source
                };
                return undefined;
            }
            return source;
        }));
        const retries = this._settings.retries;
        for(let i = 0; pending.length && i <= retries; i++){
            const current = pending;
            let retryDelay = this._settings.transientRetryDelay;
            pending = [];
            try {
                const results = await targetStorage.set(partitionItems(current), context);
                await waitAll(...results.map(async (result, j)=>{
                    finalResults[j] = result;
                    if (result.status === VariableResultStatus.Error && result.transient) {
                        pending.push(current[j]);
                    } else if (result.status === VariableResultStatus.Conflict && patch) {
                        const patched = await patch(j, result);
                        patched && pending.push([
                            j,
                            patched
                        ]);
                    }
                }));
            } catch (e) {
                retryDelay = this._settings.errorRetryDelay;
                current.map(([index, source])=>source && (finalResults[index] = {
                        status: VariableResultStatus.Error,
                        error: `Operation did not complete after ${retries} attempts. ${e}`,
                        source: source
                    }));
                pending = current;
            }
            if (pending.length) {
                await delay((0.8 + 0.2 * Math.random()) * retryDelay * (i + 1));
            }
        }
        // Map original sources (lest something was patched).
        finalResults.forEach((result, i)=>{
            if (context?.tracker && result?.status <= 201 && result?.current?.scope === VariableScope.Device) {
                context.tracker._touchClientDeviceData();
            }
            return result && (result.source = setters[i]);
        });
        return finalResults;
    }
    async _patchGetResults(storage, getters, results, context) {
        const initializerSetters = [];
        for(let i = 0; i < getters.length; i++){
            if (!getters[i]) continue;
            const getter = getters[i];
            if (!getter.init || results[i]?.status !== VariableResultStatus.NotFound) {
                continue;
            }
            if (!storage.writable) {
                throw new Error(`A getter with an initializer was specified for a non-writable storage.`);
            }
            const initialValue = await unwrap(getter.init);
            if (initialValue == null) {
                continue;
            }
            initializerSetters.push({
                ...getter,
                ...initialValue
            });
        }
        if (storage.writable && initializerSetters.length > 0) {
            await this._setWithRetry(initializerSetters, storage, context);
        }
        return results;
    }
    async _patchSetResults(storage, setters, results, context) {
        const patches = [];
        let setter;
        results.forEach((result, i)=>result?.status === VariableResultStatus.Unsupported && (setter = setters[i]).patch != null && patches.push([
                i,
                setter
            ]));
        if (patches.length) {
            const patch = async (patchIndex, result)=>{
                const [sourceIndex, patch] = patches[patchIndex];
                if (!setters[sourceIndex]) return undefined;
                if (result?.status === VariableResultStatus.Error) {
                    results[sourceIndex] = {
                        status: VariableResultStatus.Error,
                        error: result.error,
                        source: setters[sourceIndex]
                    };
                    return undefined;
                }
                const current = getResultVariable(result);
                const patched = await applyPatch(current, patch);
                if (!patched) {
                    results[sourceIndex] = {
                        status: VariableResultStatus.Unchanged,
                        current,
                        source: setters[sourceIndex]
                    };
                }
                return patched ? {
                    ...setters[sourceIndex],
                    ...current,
                    patch: undefined,
                    ...patched
                } : undefined;
            };
            const patchSetters = [];
            const currentValues = await storage.get(partitionItems(patches), context);
            for(let i = 0; i < patches.length; i++){
                const patched = await patch(i, currentValues[i]);
                if (patched) {
                    patchSetters.push([
                        i,
                        patched
                    ]);
                }
            }
            if (patchSetters.length > 0) {
                (await this._setWithRetry(partitionItems(patchSetters), storage, context, (sourceIndex, result)=>result.status === VariableResultStatus.Conflict ? patch(patchSetters[sourceIndex][0], result) : undefined)).forEach((result, i)=>{
                    // Map setter to patch to source.
                    const sourceIndex = patches[patchSetters[i][0]][0];
                    result && (result.source = setters[sourceIndex]);
                    results[sourceIndex] = result;
                });
            }
        }
        return results;
    }
    _patchAndCensor(mapping, key, value, consent, write) {
        if (key == null || value == null) return undefined;
        const localKey = stripPrefix(key);
        if (mapping.variables?.has(localKey)) {
            return mapping.variables.patch(localKey, value, consent, false, write);
        }
        return !consent || validateConsent(localKey, consent, mapping.classification) ? value : undefined;
    }
    _getMapping({ scope, key }) {
        const prefix = parseKey(key).prefix;
        return required(this._variables.get([
            scope,
            prefix
        ]), ()=>`No storage provider is mapped to the prefix '${prefix}' in ${variableScope.format(scope)}`);
    }
    _validate(mapping, target, key, value) {
        if (!target) return target;
        const definition = mapping.variables?.get(stripPrefix(key));
        if (definition) {
            target.classification = definition.classification;
            target.purposes = definition.purposes;
        } else {
            target.classification ??= key?.classification ?? mapping.classification?.classification;
            target.purposes ??= key?.purposes ?? key?.purpose /* getters */  ?? mapping.classification?.purposes;
        }
        required(target.classification, ()=>`The variable ${formatKey(key)} must have an explicit classification since it is not defined in a schema, and its storage does not have a default classification.`);
        required(target.purposes, ()=>`The variable ${formatKey(key)} must have explicit purposes since it is not defined in a schema, and its storage does not have a default classification.`);
        value != null && definition?.validate(value);
        return target;
    }
    _applyScopeId(key, context) {
        if (key) {
            const scope = variableScope(key.scope);
            const scopeIds = context?.tracker ?? context?.scopeIds;
            if (scopeIds) {
                const validateScope = (expectedTarget, actualTarget)=>{
                    if (!actualTarget) {
                        return scope === VariableScope.Session ? "The tracker does not have an associated session." : scope === VariableScope.Device ? "The tracker does not have associated device data, most likely due to the lack of consent." : "The tracker does not have an authenticated user associated.";
                    }
                    if (expectedTarget !== actualTarget) {
                        return `If a target ID is explicitly specified for the ${variableScope.format(scope)} scope it must match the tracker. (Specifying the target ID for this scope is optional.)`;
                    }
                    return undefined;
                };
                const error = scope === VariableScope.Session ? validateScope(scopeIds.sessionId, key.targetId ??= scopeIds.sessionId) : scope === VariableScope.Device ? validateScope(scopeIds.deviceId, key.targetId ??= scopeIds.deviceId) : scope === VariableScope.User ? validateScope(scopeIds.userId, key.targetId ??= scopeIds.userId) : undefined;
                return error;
            } else if (scope !== VariableScope.Global && !key.targetId) {
                return `Target ID is required for non-global scopes when variables are not managed through the tracker.`;
            }
        }
        return undefined;
    }
    _censorValidate(mapping, target, key, index, variables, censored, consent, context, write) {
        let error = this._applyScopeId(key, context);
        if (error) {
            censored.push([
                index,
                {
                    source: key,
                    status: VariableResultStatus.Denied,
                    error
                }
            ]);
            return false;
        }
        if (target.value == null) {
            return true;
        }
        if (tryCatch(()=>(this._validate(mapping, target, key, target.value), true), (error)=>(variables[index] = undefined, censored.push([
                index,
                {
                    source: key,
                    status: VariableResultStatus.Invalid,
                    error
                }
            ]), false))) {
            const wasDefined = target.value != null;
            target.value = this._patchAndCensor(mapping, {
                ...key,
                ...target
            }, target.value, consent, write);
            if (wasDefined && target.value == null) {
                variables[index] = undefined;
                censored.push([
                    index,
                    {
                        source: key,
                        status: VariableResultStatus.Denied
                    }
                ]);
            } else {
                return true;
            }
        }
        return false;
    }
    _getContextConsent = (context)=>{
        let consent = context?.tracker?.consent;
        if (!consent && (consent = context?.consent)) {
            consent = {
                level: dataClassification(consent.level),
                purposes: dataPurposes(consent.purposes)
            };
        }
        if (!consent) return consent;
        consent = {
            ...consent
        };
        if (!context?.client) {
            consent.purposes |= DataPurposeFlags.Server;
        }
        return consent;
    };
    async get(keys, context) {
        const censored = [];
        const consent = this._getContextConsent(context);
        let timestamp;
        keys = keys.map((getter, index)=>{
            if (!getter) return undefined;
            const error = this._applyScopeId(getter, context);
            if (error) {
                censored.push([
                    index,
                    {
                        source: getter,
                        status: VariableResultStatus.Denied,
                        error
                    }
                ]);
                return undefined;
            }
            if (getter.key === CONSENT_INFO_KEY) {
                // TODO: Generalize and refactor so it is not hard-coded here.
                censored.push([
                    index,
                    getter.scope !== VariableScope.Session || !consent ? {
                        source: getter,
                        status: VariableResultStatus.NotFound,
                        error: `The reserved variable ${CONSENT_INFO_KEY} is only available in session scope, and only if requested from tracking context.`
                    } : {
                        source: getter,
                        status: VariableResultStatus.Success,
                        current: {
                            key: CONSENT_INFO_KEY,
                            scope: VariableScope.Session,
                            classification: DataClassification.Anonymous,
                            purposes: DataPurposeFlags.Necessary,
                            created: timestamp ??= now(),
                            modified: timestamp,
                            accessed: timestamp,
                            version: "",
                            value: {
                                level: dataClassification.lookup(consent.level),
                                purposes: dataPurposes.lookup(consent.purposes)
                            }
                        }
                    }
                ]);
                return undefined;
            }
            if (getter.init) {
                const mapping = this._getMapping(getter);
                getter.init = wrap(getter.init, async (original)=>{
                    const result = await original();
                    return result?.value != null && this._censorValidate(mapping, result, getter, index, keys, censored, consent, context, true) ? result : undefined;
                });
            }
            return getter;
        });
        let expired;
        const results = (await this._storage.get(keys, context)).map((variable)=>{
            if (isSuccessResult(variable, true) && variable.accessed + variable.ttl < (timestamp ??= now())) {
                (expired ??= []).push(variable);
                return {
                    ...extractKey(variable),
                    status: VariableResultStatus.NotFound
                };
            }
            return variable;
        });
        if (expired?.length) {
            // Delete expired variables on read.
            await this._storage.set(expired.map((variable)=>({
                    ...variable,
                    value: undefined
                })), context);
        }
        for (const [i, result] of censored){
            results[i] = {
                ...extractKey(result.source, result.current ?? result.source),
                value: result.current?.value,
                status: result.status,
                error: result.error
            };
        }
        for (const result of results){
            if (!isSuccessResult(result, true) || !result?.value) continue;
            const mapping = this._getMapping(result);
            if (mapping) {
                if ((result.value = this._patchAndCensor(mapping, result, result.value, consent, false)) == null) {
                    result.status = VariableResultStatus.Denied;
                }
            }
        }
        return results;
    }
    async set(variables, context) {
        const censored = [];
        const consent = this._getContextConsent(context);
        // Censor the values (including patch actions) when the context has a tracker.
        variables.forEach((setter, i)=>{
            if (!setter) return;
            if (setter.key === CONSENT_INFO_KEY) {
                censored.push([
                    i,
                    {
                        source: setter,
                        status: VariableResultStatus.Denied,
                        error: "Consent can not be set directly. Use ConsentEvents or the tracker's API."
                    }
                ]);
                return undefined;
            }
            const mapping = this._getMapping(setter);
            if (isVariablePatchAction(setter)) {
                setter.patch = wrap(setter.patch, async (original, current)=>{
                    const patched = await original(current);
                    return patched == null || this._censorValidate(mapping, patched, setter, i, variables, censored, consent, context, true) ? patched : undefined;
                });
            } else {
                this._censorValidate(mapping, setter, setter, i, variables, censored, consent, context, true);
            }
        });
        const results = await this._setWithRetry(variables, this._storage, context);
        for (const [i, result] of censored){
            results[i] = result;
        }
        return results;
    }
    renew(scope, scopeIds, context) {
        return this._storage.renew(scope, scopeIds, context);
    }
    purge(filters, context) {
        return this._storage.purge(filters, context);
    }
    head(filters, options, context) {
        return this._storage.head(filters, options, context);
    }
    async query(filters, options, context) {
        const results = await this._storage.query(filters, options, context);
        const consent = this._getContextConsent(context);
        results.results = results.results.map((result)=>({
                ...result,
                value: this._patchAndCensor(this._getMapping(result), result, result.value, consent, false)
            }));
        return results;
    }
}

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, InMemoryStorageBase, MAX_CACHE_HEADERS, ParsingVariableStorage, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, TargetedVariableCollection, Tracker, TrackerEnvironment, VariableMap, VariableSplitStorage, VariableStorageCoordinator, bootstrap, getErrorMessage, hasChanged, isValidationError, isWritable, mapKey, requestCookieHeader, requestCookies };

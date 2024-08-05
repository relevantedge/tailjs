import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, DataPurposeFlags, VariableScope, isPassiveEvent, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY$1 = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY$1 = "rev=" + "lzgtkuuv";
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";

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
const isJsonObject = (value)=>isPlainObject(value);
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
                const resetEvent = event;
                if (tracker.session.userId) {
                    // Fake a sign out event if the user is currently authenticated.
                    events.push(event);
                    event = {
                        type: "sign_out",
                        userId: tracker.authenticatedUserId,
                        timestamp: event.timestamp
                    };
                }
                // Start new session
                await flushUpdates();
                await tracker.reset(true, resetEvent.includeDevice, resetEvent.includeConsent, resetEvent.timestamp);
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
            const data = this.configuration.minimal ? {
                timestamp: ev.timestamp,
                type: ev.type
            } : ev;
            if (this.configuration.console) {
                console.log(data);
            } else {
                tracker.env.log(this, {
                    group: this.configuration.group,
                    level: "info",
                    source: this.id,
                    message: JSON.stringify(data, null, 2)
                });
            }
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
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
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
                                "type": "number",
                                "description": "How strongly the tags relates to the target.",
                                "default": 1
                            }
                        },
                        "required": [
                            "tag"
                        ]
                    },
                    "description": "Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.\n\nExamples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,  `ext1:video:play` and `area=investors+9, area=consumers+2`\n\nAs in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).\n\nIt is possible to specify \"how much\" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the \"investors\" audience will ultimately be higher than the score for \"consumers\".\n\nTags are separated by comma (`,`).\n\nThe following rules apply:\n- There should not be quotes around tag values. If there are they will get interpreted as part of the value.\n- Tag names will get \"cleaned\" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.\n- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.\n- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\\,`), however using commas or similar characters   to store a list of values in the same tag is discouraged as each value should rather have its own tag.\n\nBAD: `selected=1\\,2\\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`\n\nBAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`\n\nBAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`\n\nTags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.\n\nTags are associated with HTML elements either via the `track-tags` attribute, or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.\n\nSince stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources."
                },
                "personalization": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tags": {
                                "type": "array",
                                "items": {
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
                                            "type": "number",
                                            "description": "How strongly the tags relates to the target.",
                                            "default": 1
                                        }
                                    },
                                    "required": [
                                        "tag"
                                    ]
                                },
                                "description": "Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.\n\nExamples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,  `ext1:video:play` and `area=investors+9, area=consumers+2`\n\nAs in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).\n\nIt is possible to specify \"how much\" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the \"investors\" audience will ultimately be higher than the score for \"consumers\".\n\nTags are separated by comma (`,`).\n\nThe following rules apply:\n- There should not be quotes around tag values. If there are they will get interpreted as part of the value.\n- Tag names will get \"cleaned\" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.\n- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.\n- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\\,`), however using commas or similar characters   to store a list of values in the same tag is discouraged as each value should rather have its own tag.\n\nBAD: `selected=1\\,2\\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`\n\nBAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`\n\nBAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`\n\nTags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.\n\nTags are associated with HTML elements either via the `track-tags` attribute, or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.\n\nSince stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources."
                            },
                            "source": {
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
                                "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.source }  corresponding to the test, but have different  {@link  Personalization.variable  } s."
                            },
                            "variables": {
                                "type": "array",
                                "items": {
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
                                        },
                                        "value": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "id",
                                        "value"
                                    ],
                                    "description": "A reference to a variable and its value in personalization."
                                },
                                "description": "Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms."
                            },
                            "variants": {
                                "type": "array",
                                "items": {
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
                                        },
                                        "sources": {
                                            "type": "array",
                                            "items": {
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
                                                    },
                                                    "relatedVariable": {
                                                        "type": "string",
                                                        "description": "In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component."
                                                    },
                                                    "personalizationType": {
                                                        "type": "string",
                                                        "description": "The kind of personalization that relates to this item."
                                                    }
                                                },
                                                "required": [
                                                    "id"
                                                ],
                                                "description": "A specific aspect changed for a page or component for personalization as part of a  {@link  PersonalizationVariant } ."
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
                                    },
                                    "required": [
                                        "id"
                                    ],
                                    "description": "A reference to the data/content item related to a variant in personalization."
                                },
                                "description": "The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.\n\nTo represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources."
                            }
                        },
                        "description": "The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more."
                    }
                },
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
                },
                "typeName": {
                    "type": "string",
                    "description": "An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial."
                },
                "dataSource": {
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
                    "description": "Optional references to the content that was used to render the component."
                },
                "instanceId": {
                    "type": "string",
                    "description": "An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree."
                },
                "instanceNumber": {
                    "type": "number",
                    "description": "If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom)."
                },
                "inferred": {
                    "type": "boolean",
                    "description": "A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).",
                    "default": false
                },
                "content": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tags": {
                                "type": "array",
                                "items": {
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
                                            "type": "number",
                                            "description": "How strongly the tags relates to the target.",
                                            "default": 1
                                        }
                                    },
                                    "required": [
                                        "tag"
                                    ]
                                },
                                "description": "Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.\n\nExamples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,  `ext1:video:play` and `area=investors+9, area=consumers+2`\n\nAs in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).\n\nIt is possible to specify \"how much\" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the \"investors\" audience will ultimately be higher than the score for \"consumers\".\n\nTags are separated by comma (`,`).\n\nThe following rules apply:\n- There should not be quotes around tag values. If there are they will get interpreted as part of the value.\n- Tag names will get \"cleaned\" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.\n- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.\n- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\\,`), however using commas or similar characters   to store a list of values in the same tag is discouraged as each value should rather have its own tag.\n\nBAD: `selected=1\\,2\\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`\n\nBAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`\n\nBAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`\n\nTags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.\n\nTags are associated with HTML elements either via the `track-tags` attribute, or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.\n\nSince stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources."
                            },
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
                            },
                            "commerce": {
                                "type": "object",
                                "properties": {
                                    "price": {
                                        "type": "number",
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
                                        "description": "The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple)."
                                    },
                                    "stock": {
                                        "type": "number",
                                        "description": "The current number of units in stock.\n\nUse fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many)."
                                    }
                                }
                            },
                            "rect": {
                                "type": "object",
                                "properties": {
                                    "width": {
                                        "type": "number"
                                    },
                                    "height": {
                                        "type": "number"
                                    },
                                    "x": {
                                        "type": "number"
                                    },
                                    "y": {
                                        "type": "number"
                                    }
                                },
                                "required": [
                                    "height",
                                    "width",
                                    "x",
                                    "y"
                                ],
                                "description": "The current size and position of the element representing the content relative to the document top (not viewport)."
                            }
                        },
                        "required": [
                            "id"
                        ],
                        "description": "The content definition related to a user activation."
                    },
                    "description": "The activated content in the component."
                },
                "rect": {
                    "type": "object",
                    "properties": {
                        "width": {
                            "type": "number"
                        },
                        "height": {
                            "type": "number"
                        },
                        "x": {
                            "type": "number"
                        },
                        "y": {
                            "type": "number"
                        }
                    },
                    "required": [
                        "height",
                        "width",
                        "x",
                        "y"
                    ],
                    "description": "The size and position of the component when it was activated relative to the document top (not viewport)."
                },
                "area": {
                    "type": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash."
                }
            },
            "required": [
                "id"
            ],
            "description": "The component definition related to a user activation."
        },
        "ViewTimingData": {
            "type": "object",
            "properties": {
                "activeTime": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar. Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds."
                },
                "visibleTime": {
                    "$ref": "urn:tailjs:core#/definitions/Duration",
                    "description": "The time the view/tab has been visible."
                },
                "totalTime": {
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
        "Integer": {
            "type": "number"
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
                    "description": "The value of the form field. Be careful with this one.\n\nThe default is only to track whether checkboxes are selected. Otherwise, field values are tracked if the boolean tracking variable `--track-form-values` is set in the input field's scope."
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
        "ImpressionTextStats": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The source text."
                },
                "length": {
                    "type": "number",
                    "description": "The number of characters in the text."
                },
                "characters": {
                    "type": "number",
                    "description": "The number of word characters (a letter or number followed by any number of letters, numbers or apostrophes) in the text."
                },
                "words": {
                    "type": "number",
                    "description": "The number of words in the text. A word is defined as a group of consecutive word characters."
                },
                "sentences": {
                    "type": "number",
                    "description": "The number of sentences in the text. A sentence is defined as any group of characters where at least one of them is a word character terminated by `.`, `!`, `?` or the end of the text."
                },
                "lix": {
                    "type": "number",
                    "description": "The LIX index for the text. The measure gives an indication of how difficult it is to read. (https://en.wikipedia.org/wiki/Lix_(readability_test))"
                },
                "readTime": {
                    "type": "number",
                    "description": "The estimated time it will take for an average user to read all the text. The duration is in milliseconds since that is the time precision for ECMAScript timestamps.\n\nThe estimate is assuming \"Silent reading time\" which seems to be 238 words per minute according to [Marc Brysbaert's research] (https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786?via%3Dihub)"
                }
            },
            "required": [
                "characters",
                "length",
                "lix",
                "readTime",
                "sentences",
                "text",
                "words"
            ]
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
                                    "$ref": "urn:tailjs:core#/definitions/ImpressionRegionStats",
                                    "description": "The top 25 % of the component."
                                },
                                "middle": {
                                    "$ref": "urn:tailjs:core#/definitions/ImpressionRegionStats",
                                    "description": "The middle 25 - 75 % of the component."
                                },
                                "bottom": {
                                    "$ref": "urn:tailjs:core#/definitions/ImpressionRegionStats",
                                    "description": "The bottom 25 % of the component."
                                }
                            },
                            "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height."
                        },
                        "text": {
                            "$ref": "urn:tailjs:core#/definitions/ImpressionTextStats",
                            "description": "The length and number of words in the component's text. This combined with the active time can give an indication of how much the user read if at all."
                        },
                        "seen": {
                            "$ref": "urn:tailjs:core#/definitions/Percentage",
                            "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } ."
                        },
                        "read": {
                            "$ref": "urn:tailjs:core#/definitions/Percentage",
                            "description": "The percentage of the text the user can reasonably be assumed to have read  based on the number of words and duration of the impression."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The event is triggered when more than 75 % of the component's has been visible for at least 1 second, or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.\n\n\nThis only gets tracked for components that have impression tracking configured,  either via  {@link  TrackingSettings.impressions } , \"track-impressions\" in the containing DOM or \"--track-impressions\" via CSS.\n\nNote that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via  {@link  TrackingSettings.impressions } ."
        },
        "ImpressionRegionStats": {
            "type": "object",
            "properties": {
                "duration": {
                    "$ref": "urn:tailjs:core#/definitions/Duration"
                },
                "impressions": {
                    "$ref": "urn:tailjs:core#/definitions/Integer"
                },
                "seen": {
                    "$ref": "urn:tailjs:core#/definitions/Percentage"
                },
                "read": {
                    "$ref": "urn:tailjs:core#/definitions/Percentage",
                    "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } ."
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
                            "default": false
                        },
                        "includeConsent": {
                            "type": "boolean",
                            "description": "Whether to also reset the consent.",
                            "default": false
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
        text: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,I,A,E,x,N,O,C,j,_,M=\"@info\",U=\"@consent\",$=\"_tail:\",F=$+\"state\",q=$+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eI=e=>e instanceof Map,eA=e=>e instanceof Set,eE=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),e_=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):e_(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),eM=(e,t)=>t&&!ev(e)?[...e]:e,eU=(e,t,r,n)=>e_(e,t,r,n),e$=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?e_(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(e_(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...eU(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(e$(e,t,r,n,a,i)),eR=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of e_(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of eU(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>eM(e_(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eI(e)?e=>e:eA(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eA(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eI(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tI=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tA=(e,t=\"'\")=>null==e?G:t+e+t,tE=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tx=(e,t,r)=>null==e?G:eS(t)?tI(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tI(eF(e,e=>!1===e?G:e),t??\"\"),tN=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eE(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eE(o/l+100*s/o),readTime:eE(o/238*6e4),boundaries:f}},tO=e=>(e=Math.log2(e))===(0|e),tC=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tO(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tO(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tI(eF(eh(e),e=>tA(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tj=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},t_=Symbol(),tM=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tU=(e,t=!0,r)=>null==e?G:tR(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:t$(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),t$=(e,t,r=!0)=>tF(e,\"&\",t,r),tF=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tM(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[t_]=a),i},tq=(e,t)=>t&&null!=e?t.test(e):G,tP=(e,t,r)=>tR(e,t,r,!0),tR=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tR(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tz=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tD=/\\z./g,tW=(e,t)=>(t=tx(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tD,tB={},tJ=e=>e instanceof RegExp,tV=(e,t=[\",\",\" \"])=>tJ(e)?e:ev(e)?tW(eF(e,e=>tV(e,t)?.source)):ea(e)?e?/./g:tD:ef(e)?tB[e]??=tR(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tW(eF(tL(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tx(t,tz)}]`)),e=>e&&`^${tx(tL(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tz(tK(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tL=(e,t)=>e?.split(t)??e,tK=(e,t,r)=>e?.replace(t,r)??e,tG=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tH=5e3,tX=()=>()=>P(\"Not initialized.\"),tY=window,tZ=document,tQ=tZ.body,t0=(e,t)=>!!e?.matches(t),t1=H,t2=(e,t,r=(e,t)=>t>=t1)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==tZ&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t4=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>ni(e),Z);case\"e\":return W(()=>ns?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t4(e,t[0])):void 0}},t6=(e,t,r)=>t4(e?.getAttribute(t),r),t5=(e,t,r)=>t2(e,(e,n)=>n(t6(e,t,r))),t3=(e,t)=>t6(e,t)?.trim()?.toLowerCase(),t8=e=>e?.getAttributeNames(),t9=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,t7=e=>null!=e?e.tagName:null,re=()=>({x:(r=rt(X)).x/(tQ.offsetWidth-window.innerWidth)||0,y:r.y/(tQ.offsetHeight-window.innerHeight)||0}),rt=e=>({x:eE(scrollX,e),y:eE(scrollY,e)}),rr=(e,t)=>tK(e,/#.*$/,\"\")===tK(t,/#.*$/,\"\"),rn=(e,t,r=Y)=>(n=ra(e,t))&&K({xpx:n.x,ypx:n.y,x:eE(n.x/tQ.offsetWidth,4),y:eE(n.y/tQ.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),ra=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ri(e),{x:a,y:i}):void 0,ri=e=>e?(o=e.getBoundingClientRect(),r=rt(X),{x:eE(o.left+r.x),y:eE(o.top+r.y),width:eE(o.width),height:eE(o.height)}):void 0,ro=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),rs=e=>{var{host:t,scheme:r,port:n}=tU(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rl=()=>({...r=rt(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:tQ.offsetWidth,totalHeight:tQ.offsetHeight});(A=s||(s={}))[A.Anonymous=0]=\"Anonymous\",A[A.Indirect=1]=\"Indirect\",A[A.Direct=2]=\"Direct\",A[A.Sensitive=3]=\"Sensitive\";var ru=tC(s,!1,\"data classification\"),rc=(e,t)=>ru.parse(e?.classification??e?.level)===ru.parse(t?.classification??t?.level)&&rd.parse(e?.purposes??e?.purposes)===rd.parse(t?.purposes??t?.purposes),rf=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:ru.parse(e.classification??e.level??t?.classification??0),purposes:rd.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(E=l||(l={}))[E.None=0]=\"None\",E[E.Necessary=1]=\"Necessary\",E[E.Functionality=2]=\"Functionality\",E[E.Performance=4]=\"Performance\",E[E.Targeting=8]=\"Targeting\",E[E.Security=16]=\"Security\",E[E.Infrastructure=32]=\"Infrastructure\",E[E.Any_Anonymous=49]=\"Any_Anonymous\",E[E.Any=63]=\"Any\",E[E.Server=2048]=\"Server\",E[E.Server_Write=4096]=\"Server_Write\";var rd=tC(l,!0,\"data purpose\",2111),rv=tC(l,!1,\"data purpose\",0),rp=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rh=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rg=tC(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rm=e=>`'${e.key}' in ${rg.format(e.scope)} scope`,ry={scope:rg,purpose:rv,purposes:rd,classification:ru};tj(ry),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tC(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tC(d,!1,\"variable set status\");var rb=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rT)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rk)),values:o(e=>eF(e,e=>rk(e)?.value)),push:()=>(i=e=>(r?.(eF(rw(e))),e),s),value:o(e=>rk(e[0])?.value),variable:o(e=>rk(e[0])),result:o(e=>e[0])};return s},rw=e=>e?.map(e=>e?.status<400?e:G),rk=e=>rS(e)?e.current??e:G,rS=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rT=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rm(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rI=e=>rT(e,G,!0),rA=e=>e&&\"string\"==typeof e.type,rE=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rx=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rN=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rO=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eV(e,e=>rO(e,t,r)):ef(e)?tR(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rx(n)+\"::\":\"\")+t+rx(a),value:rx(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rN(r,u)}):rN(r,e),r},rC=new WeakMap,rj=e=>rC.get(e),r_=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rM=(e,t,r,n,a,i)=>t?.[1]&&eV(t8(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tq(o,t)&&(i=void 0,!r||t0(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rO(a,tK(n,/\\-/g,\":\"),r),i)),rU=()=>{},r$=(e,t)=>{if(h===(h=rW.tags))return rU(e,t);var r=e=>e?tJ(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tV(e.match),e.selector,e.prefix]:[tV(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rU=(e,t)=>rM(e,n,t))(e,t)},rF=(e,t)=>tx(eR(t9(e,r_(t,Y)),t9(e,r_(\"base-\"+t,Y))),\" \"),rq={},rP=(e,t,r=rF(e,\"attributes\"))=>{r&&rM(e,rq[r]??=[{},tP(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tV(r||n),,t])],t),rO(rF(e,\"tags\"),void 0,t)},rR=(e,t,r=X,n)=>(r?t2(e,(e,r)=>r(rR(e,t,X)),eS(r)?r:void 0):tx(eR(t6(e,r_(t)),t9(e,r_(t,Y))),\" \"))??(n&&(g=rj(e))&&n(g))??null,rz=(e,t,r=X,n)=>\"\"===(m=rR(e,t,r,n))||(null==m?m:ei(m)),rD=(e,t,r,n)=>e?(rP(e,n??=new Map),t2(e,e=>{r$(e,n),rO(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rW={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rB=[],rJ=[],rV=(e,t=0)=>e.charCodeAt(t),rL=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rB[rJ[t]=e.charCodeAt(0)]=t);var rK=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rJ[(16515072&t)>>18],rJ[(258048&t)>>12],rJ[(4032&t)>>6],rJ[63&t]);return a.length+=n-r,rL(a)},rG=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rB[rV(e,r++)]<<2|(t=rB[rV(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rB[rV(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rB[rV(e,r++)]));return i},rH={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rX=(e=256)=>e*Math.random()|0,rY=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rX()));for(r=0,i[n++]=g(f^16*rX(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rX();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rH[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},rZ={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rZ);var{deserialize:rQ,serialize:r0}=(C=rZ.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r1=\"$ref\",r2=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r4=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r2(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r1]||(e[r1]=o,l(()=>delete e[r1])),{[r1]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r0(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r6=e=>{var t,r,n=e=>eg(e)?e[r1]&&(r=(t??=[])[e[r1]])?r:(e[r1]&&(t[e[r1]]=e,delete e[r1]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>rQ(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},r5=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r4(e,!1,r))):r4(e,!0,r),n);if(t)return[e=>r4(e,!1,r),e=>null==e?G:W(()=>r6(e),G),(e,t)=>n(e,t)];var[a,i,o]=rY(e);return[(e,t)=>(t?Q:rK)(a(r4(e,!0,r))),e=>null!=e?r6(i(e instanceof Uint8Array?e:rG(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r5(),r5(null,{json:!0,prettify:!0});var r3=tL(\"\"+tZ.currentScript.src,\"#\"),r8=tL(\"\"+(r3[1]||\"\"),\";\"),r9=r3[0],r7=r8[1]||tU(r9,!1)?.host,ne=e=>!!(r7&&tU(e,!1)?.host?.endsWith(r7)===Y),nt=(...e)=>tK(tx(e),/(^(?=\\?))|(^\\.(?=\\/))/,r9.split(\"?\")[0]),nr=nt(\"?\",\"var\"),nn=nt(\"?\",\"mnt\");nt(\"?\",\"usr\");var[na,ni]=r5(),[no,ns]=[tX,tX],[nl,nu]=tT(),nc=e=>{ns===tX&&([no,ns]=r5(e),nu(no,ns))},nf=e=>t=>nd(e,t),nd=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nv,np]=tT(),[nh,ng]=tT(),nm=e=>nb!==(nb=e)&&np(nb=!1,nS(!0,!0)),ny=e=>nw!==(nw=!!e&&\"visible\"===document.visibilityState)&&ng(nw,!e,nk(!0,!0));nv(ny);var nb=!0,nw=!1,nk=tv(!1),nS=tv(!1);ro(window,[\"pagehide\",\"freeze\"],()=>nm(!1)),ro(window,[\"pageshow\",\"resume\"],()=>nm(!0)),ro(document,\"visibilitychange\",()=>(ny(!0),nw&&nm(!0))),np(nb,nS(!0,!0));var nT=!1,nI=tv(!1),[nA,nE]=tT(),nx=th({callback:()=>nT&&nE(nT=!1,nI(!1)),frequency:2e4,once:!0,paused:!0}),nN=()=>!nT&&(nE(nT=!0,nI(!0)),nx.restart());ro(window,[\"focus\",\"scroll\"],nN),ro(window,\"blur\",()=>nx.trigger()),ro(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nN),nN();var nO=()=>nI();(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nC=tC(b,!1,\"local variable scope\"),nj=e=>nC.tryParse(e)??rg(e),n_=e=>!!nC.tryParse(e?.scope),nM=tj({scope:nC},ry),nU=e=>null==e?void 0:ef(e)?e:e.source?nU(e.source):`${nj(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,n$=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nF=0,nq=void 0,nP=()=>(nq??tX())+\"_\"+nR(),nR=()=>(td(!0)-(parseInt(nq.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nF).toString(36),nz=e=>crypto.getRandomValues(e),nD=()=>tK(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nz(new Uint8Array(1))[0]&15>>e/4).toString(16)),nW={},nB={id:nq,heartbeat:td()},nJ={knownTabs:{[nq]:nB},variables:{}},[nV,nL]=tT(),[nK,nG]=tT(),nH=tX,nX=e=>nW[nU(e)],nY=(...e)=>nQ(e.map(e=>(e.cache=[td(),3e3],nM(e)))),nZ=e=>eF(e,e=>e&&[e,nW[nU(e)]]),nQ=e=>{var t=eF(e,e=>e&&[nU(e),e]);if(t?.length){var r=nZ(e);e7(nW,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nJ.variables,n),nH({type:\"patch\",payload:eG(n)})),nG(r,nW,!0)}};nl((e,t)=>{nv(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nq=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nW=eG(eR(eX(nW,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nU(e),e])))}else sessionStorage.setItem(F,e([nq,eF(nW,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nH=(t,r)=>{e&&(localStorage.setItem(F,e([nq,t,r])),localStorage.removeItem(F))},ro(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nq)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||nH({type:\"set\",payload:nJ},a);else if(\"set\"===i&&r.active)e7(nJ,o),e7(nW,o.variables),r.trigger();else if(\"patch\"===i){var s=nZ(eF(o,1));e7(nJ.variables,o),e7(nW,o),nG(s,nW,!1)}else\"tab\"===i&&(e7(nJ.knownTabs,a,o),o&&nL(\"tab\",o,!1))}}});var r=th(()=>nL(\"ready\",nJ,!0),-25),n=th({callback(){var e=td()-1e4;eV(nJ?.knownTabs,([t,r])=>r[0]<e&&tn(nJ.knownTabs,t)),nB.heartbeat=td(),nH({type:\"tab\",payload:nB})},frequency:5e3,paused:!0}),a=e=>{nH({type:\"tab\",payload:e?nB:void 0}),e?(r.restart(),nH({type:\"query\"})):r.toggle(!1),n.toggle(e)};nv(e=>a(e),!0)},!0);var[n0,n1]=tT(),[n2,n4]=tT(),n6=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?ns:ni)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?no:na)([nq,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nq))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ro(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})($+\"rq\"),n5=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n1(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?no(a,!0):JSON.stringify(a)))};if(!r)return await n6(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?ns:JSON.parse)?.(o):G;return null!=l&&n4(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},n3=[\"scope\",\"key\",\"targetId\",\"version\"],n8=[...n3,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n9=[...n3,\"init\",\"purpose\",\"refresh\"],n7=[...n8,\"value\",\"force\",\"patch\"],ae=new Map,at=(e,t)=>{var r=th(async()=>{var e=eF(ae,([e,t])=>({...n$(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(ae,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nU(e),i=ta(ae,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nv((e,t)=>r.toggle(e,e&&t>=3e3),!0),nK(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await n5(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nU(e);n(r,e.result);var a=nX(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!n_(e))return[to(e,n9),t];else if(eb(e.init)){var u={...nM(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rd.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&nQ(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nU(e),n=nX(r);if(o(r,e.cache),n_(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nC(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,n7),t]}}),f=u.length?D((await n5(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nQ(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,n8),cache:[t,t+(ta(i,nU(e))??3e3)]});return n2(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rk(e)),eF(e.set,e=>rk(e)));r?.length&&nQ(eB(r,c,t))}}),u},ar=(e,t,r=tH)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),n5(e,{events:r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rp(tl(e),!0),{timestamp:e.timestamp-td()}))),variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nh((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},an=Symbol(),aa=[.75,.33],ai=[.25,.33],ao=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[an]?.(e))),r=new Set;th({callback:()=>eV(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=tZ.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nO),!1,!1,0,0,0,tG()];a[4]=t,a[5]=r,a[6]=n},y=[tG(),tG()],b=aT(!1),w=tv(!1,nO),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],I=S[1]-S[3],A=T/t.height||0,E=I/t.width||0,x=v?ai:aa,N=(T>x[0]*o||A>x[0])&&(I>x[0]*r||E>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rW.impressionThreshold-250)&&(++h,b(v),u||e(u=eX(eF(s,e=>(e.track?.impressions||rz(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:rn(i),viewport:rl(),timeOffset:aA(),impressions:h,...aq(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=tN(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var j,_=tZ.createTreeWalker(i,NodeFilter.SHOW_TEXT),M=0,U=0;for(l??=[];U<f.length&&(j=_.nextNode());){var $=j.textContent?.length??0;for(M+=$;M>=f[U]?.offset;)if(a[U%2?\"setEnd\":\"setStart\"](j,f[U].offset-M+$),U++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;U<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+I)/D),l&&eV(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[an]=({isIntersecting:e})=>{e7(r,S,e),e||(eV(c,e=>e()),S())},t.observe(i)}}},as=()=>{var e=tY?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tY.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tY.devicePixelRatio,width:t,height:r,landscape:a}}},al=e=>e(K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...as()})),au=(e,t=\"A\"===t7(e)&&t6(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ac=(e,t=t7(e),r=rz(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t3(e,\"type\"),\"button\",\"submit\")||r===Y),af=(e,t=!1)=>({tagName:e.tagName,text:tE(t6(e,\"title\")?.trim()||t6(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ri(e):void 0}),ad=(e,t,r=!1)=>{var n;return t2(e??t,e=>\"IMG\"===t7(e)||e===t?(n={element:af(e,r)},X):Y),n},av=e=>{if(w)return w;ef(e)&&([t,e]=ni(e),e=r5(t)[1](e)),e7(rW,e),nc(ta(rW,\"encryptionKey\"));var t,r=ta(rW,\"key\"),n=tY[rW.name]?._??[];if(!ev(n)){P(`The global variable for the tracker \"${rW.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nf(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nP(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=at(nr,l),c=ar(nr,l),f=null,d=0,v=X,p=X;return w=(...e)=>{if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):ni(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?ni(e):e),e=>{if(!e)return X;if(aB(e))rW.tags=e7({},rW.tags,e.tagAttributes);else if(aJ(e))return rW.disabled=e.disable,X;else if(aK(e))return n=Y,X;else if(aQ(e))return e(w),X;return p||aH(e)||aL(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aL(e)?-100:aH(e)?-50:aZ(e)?-10:rA(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rA(t))c.post(t);else if(aG(t))u.get(...eh(t.get));else if(aZ(t))u.set(...eh(t.set));else if(aH(t))tu(i,t.listener);else if(aL(t))(e=W(()=>t.extension.setup(w),e=>nd(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(aQ(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nd(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nd(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tY,rW.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+nP(),events:c,variables:u,__isTracker:Y})),configurable:!1,writable:!1}),nV(async(e,t,r,a)=>{if(\"ready\"===e){var i=rI((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(al(w),i.hasUserAgent=!0),p=!0,s.length&&w(s),a(),w(...eF(aR,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ap=()=>k?.clientId,ah={scope:\"shared\",key:\"referrer\"},ag=(e,t)=>{w.variables.set({...ah,value:[ap(),e]}),t&&w.variables.get({scope:ah.scope,key:ah.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},am=tv(),ay=tv(),ab=1,aw=()=>ay(),[ak,aS]=tT(),aT=e=>{var t=tv(e,am),r=tv(e,ay),n=tv(e,nO),a=tv(e,()=>ab);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aI=aT(),aA=()=>aI(),[aE,ax]=tT(),aN=(e,t)=>(t&&eV(aC,t=>e(t,()=>!1)),aE(e)),aO=new WeakSet,aC=document.getElementsByTagName(\"iframe\"),aj=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function a_(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aM=e=>rD(e,void 0,e=>eF(eh(e3(rC,e)?.tags))),aU=e=>e?.component||e?.content,a$=e=>rD(e,t=>t!==e&&!!aU(e3(rC,t)),e=>(T=e3(rC,e),(T=e3(rC,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aF=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eF(I,e=>({...e,rect:void 0}))},aq=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t2(e,e=>{var a=e3(rC,e);if(a){if(aU(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ri(e)||void 0;var u=a$(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aF({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rR(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aF({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tx(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tx(a,\"/\")}:void 0},aP=Symbol();_={necessary:1,preferences:2,statistics:4,marketing:8},window.tail({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tZ.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=_[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aR=[{id:\"context\",setup(e){th(()=>eV(aC,e=>tt(aO,e)&&ax(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=nX({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nX({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nY({scope:\"tab\",key:\"tabIndex\",value:n=nX({scope:\"shared\",key:\"tabIndex\"})?.value??nX({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rr(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tU(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nP(),tab:nq,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rl(),duration:aI(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),nY({scope:\"tab\",key:\"viewIndex\",value:++r});var u=t$(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tK(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nX(ah)?.value;c&&ne(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ah,value:void 0}))}var c=document.referrer||null;c&&!ne(c)&&(k.externalReferrer={href:c,domain:rs(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aA()})),aS(k)}};return nh(e=>{e?(ay(Y),++ab):ay(X)}),ro(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aW(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rE(e)||rh(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ao(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rC,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(rC,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>aV(e)?(n(e),Y):aY(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t6(a,e);){tt(n,a);var o=tL(t6(a,e),\"|\");t6(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ro(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t2(n.target,e=>{ac(e)&&(o??=e),u=u||\"NAV\"===t7(e);var t=rj(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>ac(t)&&((l??=[]).length>3?eN():l.push({...af(t,!0),component:t2(t,(e,t,r,n=rj(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rz(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rz(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aq(s,!1,f),v=aM(s);a??=!u;var p={...(i??=Y)?{pos:rn(o,n),viewport:rl()}:null,...ad(n.target,s),...d,timeOffset:aA(),...v};if(!o){f&&te(t,s,r=>{var a=ra(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(au(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&e(K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nP(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=ne(w);if(k){ag(b.clientId,()=>e(b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rW.captureContextMenu)return;o.href=nn+\"=\"+S+encodeURIComponent(w),ro(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&e(b),r())),ro(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t6(o,\"target\")!==window.name?(ag(b.clientId),b.self=X,e(b)):rr(location.href,o.href)||(b.exit=b.external,ag(b.clientId)));return}var T=(t2(n.target,(e,t)=>!!(c??=aj(rj(e)?.cart??rR(e,\"cart\")))&&!c.item&&(c.item=e2(rj(e)?.content))&&t(c)),a_(c));(T||a)&&e(T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),aN(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=rt(Y);ak(()=>ty(()=>(t={},r=rt(Y)),250)),ro(window,\"scroll\",()=>{var n=rt(),a=re();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&e(o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aD(t)){var r=t.cart;return\"clear\"===r?e({type:\"cart_updated\",action:\"clear\"}):(r=a_(r))&&e({...r,type:\"cart_updated\"}),Y}return aX(t)?(e({type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=(e,t=!1)=>{var r=!t||t5(e,r_(\"form-value\"));t&&(r=r?ei(r):\"checkbox\"===e.type);var n=e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value;return t&&n&&(n=tE(n,200)),r?n:void 0},n=n=>{var a,i=n.form;if(i){var s=t5(i,r_(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ri(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t5(i,r_(\"form-name\"))||t6(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aA()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ro(i,\"submit\",()=>{a=aq(i),t[3]=3,u(()=>{i.isConnected&&ri(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rz(e,\"ref\"))&&(e.value||(e.value=nD()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tK(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aP]:r(e),value:r(e,!0)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=aw())),u=-(l-(l=td(Y))),c=t[aP];(t[aP]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.value=r(n,!0),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ro(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=aw()):o()));u(document),aN(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:U,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rc(n,r=rf(r)))return[!1,n];var a={level:ru.lookup(r.classification),purposes:rd.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(a0(e)){var a=e.consent.get;a&&t(a);var i=rf(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tZ.hasFocus()){var e=o.poll();if(e){var t=rf({...s,...e});t&&!rc(s,t)&&(await r(t),s=t)}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],az=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aD=az(\"cart\"),aW=az(\"username\"),aB=az(\"tagAttributes\"),aJ=az(\"disable\"),aV=az(\"boundary\"),aL=az(\"extension\"),aK=az(Y,\"flush\"),aG=az(\"get\"),aH=az(\"listener\"),aX=az(\"order\"),aY=az(\"scan\"),aZ=az(\"set\"),aQ=e=>\"function\"==typeof e,a0=az(\"consent\");Object.defineProperty(tY,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(av)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqS9i3rTSNY2eiuxhklLuOLYzoFERugDGmi6m0OT0EAbA4pdTkQcKUhyDtie57-NfQP7wv4r2etdq0qSndDT37NnmliqKtVx1ap1Ltf1ggczZ5rrtbzI4mHh9C6ibE2rQmUqUZGKVapyNVFTNVRjNVIX6lydqGN1pq7VkbpUp-pAHarn6qF6oq7US_VKPVZf1Wf1InD-J07GqaPe0tMwTXKdFI66Ezifiyie-I56GtxpOnkRFdpR3_B8Ps1PHPU6cKn1QAcPnmRZmrnaQw-Lkyy9XNNjVwdFjrSwoL--Xqg3XF5lwUYHBWMUCYJiPnd1GBZeECTTycTLdDHNkka7h_xj-nR9nX4K_LQmOjkuTvCRefRmmIMkaPfG1AE8R2txsqY9rr0fDRpUln7W1xtv-F3hTWXUA9tQp9dsJgt5oZqC4NXRVz0sWqf6OqdmTUMLW3qhvsswWq1WRsMwQ8hMuQft9fWsladn2i2CB99R0vPUz_wJlcYIG4EOtf_aLcLQebiW6W_TONOjtYtoMtVrcb52Fud5nBw7iib28Ppcm8ltZfp8Eg2161DLjnJQ1H7ccjxq5Z2sR6OtMl6I7HpmhqVdbzGMiuEJTWeZdkCjC_U51omX6TUvk68jpAMM0oluaW68MJmeXyzGcRJNJlR12KJaF-oRAICXAUsLIM1acRIXcTSJv-vRfF6EhU-TIcDQKk50EtIbP1DbD9yl4tx7Gio1fkFvBF2e5_99Ea9nRpQt1K9VZ4JZ7RufvkGD_p8ueugWqxVK77yFratYqD9rdT2iXJNFc4zp_d0tVJ8eB95C_R5E-XUyvDH7ApvRZRQXa9yArV1fYI6LfntAk5h4flKtDuAWK8BPhWd2U295PbS30JNcc-ELW7hR9DuD8gM7DkpDcd4ativUKPWFPsFmoX2dDHU6XmM4M99H9vtoUS64fGyX_TfMjlbPgos0Hq211S_By-nZkc5aLx6-_3zw8OmTz89fHj559uSNeh80OuoDJuYvBo_ZQv0hH2uNX7MnlC6Cg-uzo3TSigudRUWaKZ3ZjeMSjqMqsOHczAszv1hfT-g__jazD25GsJx5yH-mdGI_NqBOuOCZIKNnvg5b_WLAKRplI_TEOUppjqPEoS1NG4_mhHoVB5omPMJubFM319fdThDo-dwZR7QEDlWBNKfIppq-Q84zbEadosZGg2rIebSU90HpCT_TR--Vntopi_ODaKyfJ4U-1jToIfcl4bylrow5A9if0EM9Y8R9HKOPNLAiPeAiLrpxETzMsuia2uBfpc-5BzcWXukTgz46Bk_RWMJnfoMmmmBM0_z5-hC_fcI_euD39UDp42oBMQ1OyrhzqW9nFqGeZ2mRIl3pa5t2rIvXNvkV9f-oBhDU7jW1hzk9U_rSLqYznibDIk7rq8SLqfSpzA8D0VIfDjjjlg-VPqyNutFwUZUuBljRG2MhVIYZfX5jAl9E50o_vJF8oAuln9RRv5nSDs4Mms8XUXHSytJpMnL1XUKR_H6eXrodQkh0ZLVxehH2bBNAbVJdV9hJ-iUacvHSVpr688rOmdROwM6LRcdPwWv02By7jPfCMPMY6gn16ldUUlFSQDiL_v6iXKIjqFixsUEVZfSXTipO8xM_I_yv9NdAYGwcTwrAHDrw2TSgktow-4M66Hzl4wMzG9pVuMvzAsRl1ttgvFmBjhFWB8rKaid7soZF8MoP3IQ2e6KyZtMj4sC9jvVktJZQf668GU9V7yjT0emCUeXaSi1SRVL7brEAZg8YR_j6sSsDol6DBlnt9Y_7KNSHoNt-onQ_GQyAamku3Ig6HEmHlXQgKjsQ3dJx9Kjek8-uLO5SZ6jPP8C83gzdkoaKsiGclxsbJcakkeAA6Xkml2eBmvNrjRB8yErp-21vzPRAGGzojU5PN5vllxsbvXKmGah6mpJsbrPJNRO80UBf2E0BKBcQMViFBvy2Dk4Ys3lR-o4lIDs4DDqgeQHUZU-JzjHEcA2upOcFYG8-Twwx6dkFiwEOUUjNFETceB3aG1nIXb6r3RiEIlVH544vw4hliHauFp5rOoiu0Mpy6Q519Wl9ENwBgRjFo7UA0lZx0B8w9GRBdr8dWhK3mfm0I9s0zKSemvhJWL71svsJpu-qB4jiGunM6WeDHk1_SqCWqogy_JQ2PKZifT1ugXB3U8-Su4JR4pL6tdQpUSJvy_7TcblQ-tvqJkfBRF8Cy7m8eNUXAw9H6utbVwt133FrXAtQKnEGqMGz9FZJJ_2JwzawIw41UUwAkdoZwaDWH3gyNNRywpScIgpOf19aBZ5zmvH2_48J57mucBbNttnXeFQxZYZhhJ28vJVLakrpkhfg_oCsqTMvyygO6CFjpJFwzdkPaybaV7_725oZMVHNqK9PXSQ-aFCv9ke1Plpid2rnDBMD-qnL60ETIEVoF9lHpX-9Of-9FYQv-8Gu9_eyfI-7StjYsHK0fctSP_M4UeLmIV0WeseFFksbvYZNzAkQ8_LFXo3eVZoo_1-VrlH1t46ApsE29qy33Ext81THVWzI79gzbf5o1gElv1kKaZylZ08Soud0rvSz6iif3dYLyzwQP2o549mitpkIAdPBz2e86RQzf5TglQeCJo4hoGOjj81G5AOYCvTYJASc4IMKQH1ExjA9QIkWy7i2aH1j8lc4Vm4Wr1eMGaNiJX76zWUAK0LDdRHLWMgx0pGqwI51wLgp_UtQoRW7WDFzHHRqgmdwPT8rJ-NXKkz_YVmZaVB4DsPY9fh7fqJK35cyDsumZAGDrGlFv5ATwPRPOscsBfLRUf0h-GcgxNQPUWXvuTghTN4Gls8zqxNVyJDwUk7sa7l5uNbG0k6pizL0iiiDjx-ZBupXs4kxt2nEfwWyf5dpVj3EbmcC9Sy6siV8_YsZO4YbgNkMmeNkCqKGL-ZzqiAiMIpo9SNC4c9U0e9CGrNFYKH_qOBaEMoR4xZ6o8p4nTlX6TYzVbwAdJLXMNBz-4GvH5pH4s4bdFwYnNgn-nlgqTkzL1r2FXOESnduI2Of-dXJ_Wu1zg2WWgWy3NTaS6mDd7zS3dtr4m7TTIy5g327kBsY4krdNTgS0mf7B1Ue8Uw0ivDWpX7Q9jULo4hpp3NSp7TG3FS5oRoNaYpm86ULOof3Cz9yY2EIlmO33AU4o8Ek5WlWuBXQexvMdzM_slPjN3QLggvijYfEzpeyNZoDpvlEdBCA5BrpiS70miY-zsefIPNrubol-eUDqLWlT1q5LkL-CxKQ1rkVjUYhvqRflK5_KQ0wQG0tY1RzJt3aa8GQ1J3yiKFqeoJlNTjZkP9KYydRHvJf255FPOWobpFeUD0VpsKS7HDnEmBE2pl7tZ3pEvYtaEke8K9L0J0NMIayShegQe2imiNUqvf4nSeHx-8tzILtM0NZw5yMiZb6S8g6rIhrH63T_FHrF1w1cgiH0x8-G5Dp9qnsgOU15iQE6U-juBfofVfv0JvGU7XxZbB2BvSWyE59gFVRlKKcFQabQKme8o6OUUoNG3buMREGBJiMN9VCXHFP8CwBelGKmTB0kUbL8SSnKKF8-aw8PS7p1RGAcrwfQaXKaNWKpLZqprb-wFDEyGKxfQV-KDEhTBoT11gTdG90QprriRe6EIOpSYsIjifR8ARS5kyO2CKTGcOc1VImEKD-8NvITjTRrrTR-XvfJE5sIj009AfGNOn6ehG56DExzCXRRIVpGpOQiGgCAxp0VJ_QiiZjsadr0bdFUp2wKPEJM4UbEDR7dNCco4tFZCBBkEZxv2IHWvn5JB4CwjoeWAMBVt_MBPUjvjn5brFyEBfeshyVtgsks_RS2Po7XjlntFW4di5hJmBBR59IGeh4fgq5QFSWL7emQdAjPY4T_TpLz3VWXDMIzgjbjOPjaRYdTbQPfJtMz7R5a6vLLC5sDg0lwR_e0hBSEcJxiLLP5nOHFQj8Avkn7yM6GaxiIpxRUT9b-DMuR0-L-hIWKwMEaqD5S-vzR3NjsUFFt9wkU116m0TFC1o9YIhjxhCMJzK7pAIInRp8h33MKFGb-BkM_CJ1zTM3z3gFRzhtK3paOb8NrJRT3ce2loMDh4PUBcyHSggvgVejakohVkncMa1LwxaJrQjSXMi9iomcgKy5MnBI4IdWwfxMkAmdkm_FGEemyDOc66InYIqEimZclLoyQ9mFIVgsK11ULFVVK4Rnz20pTGxViolnVMvks6lZc5-ntcWjI9syyLTXi-Fy1jTJT-JxYXPHy7uXlQvYFZbUpHFoOfkMDw8uQ3ZOjZf70ww9HZiaUlbGERVmdlkWpEZz4aZBQfmKc20NvX5K0xaksrOIfkyBNIZuAsBPA_58A4wifRSkyo2I36B5oF4iAfCtorAfq8jiBWDjUeBME9mDI6dhuUbaiwT-ZzhEIBj9wLPCxC4RAcQCFiP3PS1DrViriM_0qyw-jpNmPTlJLwlgfo4KflTFBVgs6JeYEaF6vDp_3tR3C2I4iBK3yqWYOIyU9R1E30XNYCNpspwTWFmlzDgSpqU6mYuUHAJsGtk5Wmp7lS6O6nexNnpp79K2iKzqs5H1hhMdZYc0lnRaMJEbEZkeQu4QQw4y8XXuuazzIeCjPexnRuHjUw8jGhZRXPZzjDAhyhGiMHy9EftxTaWWUCeNjqFdoWPZZbMxVJk6GV77hRpGk8lRNDz1sTnUjNIJX_HRdR5Ncz3yIxyetPWPj3Xmx3hJae79FE_lx7lVNmXR2J8sgqxXBFmrbIeYHYbgKXFBw6C4BMVrlYq0JOOguHAbxMGNgjG9XogsYE3LVDam83mDCLhh61wnozg5NsJ6XSmVqdRZ62iaX6PfJhNCgl75Tc8TecCwpCrm8yG6oAETrmT-zrOau-jExqjpcndoyWmkyGhodKLsNpQljQ6xD_eD9nyO_XLsQhxpe9KhnizUOc_MdHXpJiHPTV48TOKzCALVp1l0pt0Tzz-h1gusaEHnsjqRmT1rRcMivqAeXLhowr6dg3E-NmoV5hfGQmEswdq0-iRoNNwpgTt96BNwn9F_wUyycOah6_ilURZRVviG6wBfRoSaygnNh7k6dnmeQSymx8d0WlqCkWbeNhRqQsnuMTM3Zy0DQOi753Oiz7Pln5WwVS66LIbQLVSBrZBpyhLAqUpumuCGtsCC9laU52vF8ezzOZ2OcS5aXMNWuERenMS5Xe8Fnc5iAuCWGnrOt9-2OJOLiQ74B8U4k4sZMPtRQZO9sMBjtGC3F64VogmmLPoMR_B_-8qWKT_iwd5aOsDZVpxJwTw-TqJJzVrBzpX0Qqor9wp_IvYEUFTc2pcye7Ew63JWrYupuCcd7vFU93gme2aaaBevrB4b3_RuDuG1PLuuJZs0ETlMnlSabIORG_y1aUFUFl6t8z3RxVc2II6pey2aZDoaXa9ZI4hN6Tgbgizqwy973-FJ6hehw8NyfEMu0kEJIet8TlSRm5mpJM5Q9eszbqcbjQwC_b-Yaz6LriusXzxohzW8g0L-ZZyM0ssW4_kX8TBLiyg_5UU-WlGezudx_hSWG4ABYvKI-yNMFxbMZdcnnwjPWisix4Wkzy2NMViVS6fqa_fL84Tmgs40Yt2i67U7M71ofaHGL0XVyWB57FvoPC1VFa8tlMMop6QFa1QjcNFBTb4gogLh-yztxQ98YDJSTQhbgUvrAM9QbxnBqHQpr428wuRZ3JPSNiBaJwXzdSj42ViHBYayNCX7bl0QGRQHEH3SujCTDGkAng07q0sOZw2Ks_X1jMeuIjA_Kloo12gFaOBE1dZZCC1ZnocOPZf17ztRMnKUo9YcFgwwAwA99FO2DFrS8TCD0CcGj_mvtiK6tvU1jROXZYwh6vCUs-YwI8YPSwK1gRR2HMhi5Dvzkf9MFQ-lP85PzpIwrWjqZqGKUmOvWXhgmFSWLlWdaTr_9__8v44PIL2qlnhJCw8Ln-csv2aBX5-1m4QJ6bjifo2Nnl7KYOLZMIC_ZrU8lVLFSzN3bdXq7qgW_XdvR3WYpLY6BxG-bvY_ns9-X9Cfl4tB7fmn__t__p_B3bnbbzXCQdPbPJ5CBUYw1aajs60m9G8KFQSRcy19xXLengdBTuhO19ebzQlnez4d0SDtmgFYfDMrqvb8YBelc9Vspl7PfLnSK-rEp9ord4aJsKFBkQCcu_G8DfqrPyDaq02UF5F96N8oXWOVUNlLmkjoEbxztHUhgvIREQMtQif6qtTInGDHHROFfXx_aBV5x82mN-wfDzY25nN3TA_BLB2PCWNA3TdSl2k2yh9pqkH7FwqoFpjE10_ci83u1t7dXb1NJM4JtmLPpc6deFTNBQjzJBg1O4vLk3gCbGo2z6zQVwWtvTTuW5BSw5OIcAdxoLkfS5t-qmB8SfSpzv2JmsRXaDTdnDQ77fbdfDP1lnqTlr1RR7AiicAN-2PwOa_ESERMSibpcZetM2m7tecArse3KUYhiLpF7eTekJZbxhncXcFbeSwSnSHQquHFTRbtyiL9Pb3U2eMoB2VNqR5B3UqluUdgZtL4ZOKkYZC3ooRo9SkdPqMpbT67NeeFYigpQnDRuaJS_lAlaaL99sLPCXT--0DGq11lFQGIfattmvIxUxDiC0VCMKJdDKm8f5vlluznZ2Znj1EUf5fHT2kX7nmU5fiKoRgoCRCu-ieKILEI-2aQS4ZbXHltFip0k83n59SuvNAGuYCEgdg1QGZbPYP0j5gdj054l5t5Rqcea7CWzlaCFULcMF7wgArBAGK068MB1RQFx65e_w_9G3pcpJTaxJAiEIcdUyvBpAIMmVEYAK3Tn-JVHTAYYoDhSkHeLUp-38FiAsMO_P5FpfKnZlhjHGIp_GcD4hVuGFjVRpQGLDsMX7sVGfXlzuzXg1cvW2JIF4-vYREBc9okLdaiNSEG7syyhRDkRAxAnHK9NDweRCOhfZ-si40aj7J2YhYx0NkZJrr_txK-zkLNGCCY8bh-zY8nykApoQHZD_5UTdL0dHruH1tMMrGYhMUPBRRlx1hD2hm05Z9Kohx1RPLBdo62iSOHrinohUhbc5qZ_4XINhn2nZk5lE4sRfCQJYJQJyy-LGCbNjufEnK8VrSkltOiSnm01zehQBthbhiWc8fWtjCeLb6uGH8Euu2y3Iy5uUwQmRiCu8acrJKuijAXVlZBBhjzi5uSVyG86DB61qsULaIaYfOSrII86EVwpPF6wDI3q6qLWTDTiEp1TRSkta83OmFcfRe37FLSG_ccdUcYNBOeNZvl4rOxewVyfGFJpTkRSj0QS86A5oAtX0UOVymMreoJQurCdQLHs4co9GnDdKTfvnn-OD07p40EXAOO98z1PGtJ_nAycZ0mTMmZTDK5JcXHhFbgOCrpdwcBXgnEQzNa2tgdKJ7EwgeZphvsBJBVov3Mf4bTkWvr4y9tZ1gC0LjfLtmr1-iwN5S--ckNffzX_3jZbG0QseATIvq4-XHTC-mBcz75_0Pp9PgRL_8zuEvg_D-USQl9kBoDyv0IqqO9se8PmvP-p83moBl6XMR3P47wAdfa__SvkD7nT0P69F9cF739y23h6c7mcanmXnW0sBB2EczydJoN6WhW-fBE0xmdKZpJPwsbiQ9x0TMVTYuTNIuLaz9S0xzSK3VOzCgOfzr7T9K88PMwnKjzNCt8AbNpWJ4WUz4q6ESno464pezampKO_eKOOwZxOc6i4zNabX9UiiUuWvgkkB8QKq2yF-FFi0oQoek7mw4tlLogzq8ozewY6goQp866Ixr4ojJsM0BpTB0HRFXWyN9nUBKfsVH7Jk3jp9bd8GM4_-SZuaVFBO0WGqAp5DBiDkbldAa-4KOIRfgwJBVh_jNfNNLU1gT4ZhKUljVxWLpHbH7sfxzc2VREPdPZLQZ9VG9egSSRWQSEYJZoOiORi088aLksdWG_02-EQ6XBaGwUnyptQgZm5xbmQ3G_-IytrWKC6W81y0ZrJVe0Cp2L3bkqXlfcAsM5ppJ1kG8C10rT2RjZJT4hMU4xNPQIgulnKg7dApNN36K0WzPL4rMxMnwXbVVjeCP6QDs78gkPUsoKH-xnZrES6sl3Y-Nbzmj_46c7Hz-27jZD16PJnS3mA9oPzsePd9bBovwcbH783qKUorRAg7_Hlau_uWzNItUZjx1i2-ZYmjf6-MkVnQnKOZ4S_il-VsWjYEZT-OsNQ2opqoo_LXJUjLT4bPnVmKaLTuZdyUsVbJ3kwVIBexJHeMRFw03qKjVnyLTiEdNpARZjPidsx4jn46bbIkTxcTOcMwK4A7bJWMYCvZrOZ7bz3G7xO02vyfnihvcb-PeR_ufxnz4dq1dQ2n-ng--LxwcrUQ1fPkn670B61Vce_ru7Kcfvd7f4DdkfP7otD1N_p-NgIlt3HW9x5wuWmEDr95JxrfZVGFLSbzXzmmpZkcDZsCorP90ojKEHbc8NkGJ1tXUpqb5HQ58xfLGxbWn9Rmxln1IGxEiw3oNbzFqX8YgwULZCvhK3DZFTG9DHJcCM9ib37enRm1i71imdyhM2o24_0G4KTdeUFbCmP7mbWVXtRBFv63lSNkDhNgpDsTcrv2-b75nKxVOQskijrJuKw5OLczvIhfVaw6VeNIG1qPB9qbPsgDEnpIaJKqh6s7EhqunFoiwJLU7Wt4McQAm2UDx-Yl1AEP0S7OgtVbxnMQ7-vXadl0Sa1lyWWth3HwKRnKnir2CUDqfA-6r4Iyj-ah2lo2tVtO2qNhoWG7O2VBWd4BdVWDOlEmU9CIpOXbAAmgkmyu979HlC9ARoaELFHeiVYTZI60OIRkyXeNtXZrlEmNCXBaHRDxYTEm754KloowPzi_dUR9wrzZZ7cnawOAhUFA3lyURjRDA6CFvpZaKzn80goUf8CzRVsJoD9Xo0nRR_xvoyJN4vOtO2mkVNDbVtBEDfnZolJffbwVPp1MMPhBWOQDQTpswvYyDJwpsNiZlrtH38UC2-0d45TpNIXSGkwmW-r8dfdOSLzJHfI_ulY1yHdAzxC-clNm-Nz_-nkzQqysyvZeY71t0wPyPEJ1Hgf5lSJyulkrieq1dzc_YLQ76ZRX_JbkP6GFr1n4zV0J6qoj11IAXtNFibjO3SaqKmjt2tnYbbIBmOdfGwoC-PpmxOwyRHzaCs6FZmm4lb7JoMSFq3SjDeNZj_1nVQxZ453upNvSRAyZG5b2uhXJDOlDc6KK4nmFfjrcSGG3-yqgaWtgAYVdyrmYgSf1JEx6iSSTiVadnJsysoTbMCuuTW1aZb_NESqdM7bP4NIwaPE4JnTqHK2-qakON1rewvOj4-KZYKSxJKE_WWMfZGW_qJmw-zdDJ5Dyuv6-r9A72jZLXx-XD5V-uukE2A9d_oeKhSVJZYXPGBt3mQGaOc9fXfqK3zKz9pXalr_r1W3DYlbC6PUG2bblCZzZUBIe88OtZP08koJ4oZRW6O0UIOdai0MCKW5DyNE2I4gZ2YRUFFH8SAK6SJKDjhPbUtTx8Wvg4xQxElxYsg421Rvlv4VFkskAIhAtb-EWRscXL8eBITQnkD1Rb4U15QJROeElYfF82sdWWGmhL0ndP7tWdQPKfxo6dOZFCcJM9erfW0orQJ3ZwXYLhZB57nrBmlaRAt6Amj9ANjkWftAiHQf3JBHf09zgtNU2jt8JZLZfosvdC3FkTR3DrBzpg5KSrORliURVC8FbGRFXZKuaZLbIXvNBOQzOVHtOWzidkMoFMxdx_szNyAfzs_N-FAFWkRTbiQvwJjnGOgZQXGFl7PfRjkxALlRGh6Xv9h62GSJtdn6TQPiAZwyjdHPaTM57TaGa1yQBSAY18k62fJIL7Y-bmWfKCTPGaV9hbllG_iqZ9Ng-Kxm0N174yiIlpjPWQ8joesbMcuG1qgzqYWm4et5WJEsYGUvtAT7NOyXHGzXGHLra9no6q682l2nuY654rsC9c1quqqCtVeqIPjVWGbwe4QyK90QOTBuvqaqHS2eFLcKwvmJtu-LtfhV_NwcxpkdNzD1Tzip2yzfjX2-tDt89IAifNuvdRDnedRdu0teu6TYELQMhFoedJ6mSaaAQUPjnqCJFucgaR8k8ynxjGNaLbimoFlKUUKva6sh4JtKlJ7lwKHUUbIB1rcPcou3yTzQA-n4OSDzi5DnLxJ3vOECCDRWBPuCLa6DMb1NCn3MLn-XG2E7X3eCbWkslSwuyV5tu3sQmdBt729x23jrZ7z-R31hQbV3t8t8yXNbIgRNsSE2F-zIcw6OKrb6XQI2i5Mfmc1H8bp5yWvycYjrTNdRCjF2tHQNXa4BD-Ej_RIle-sZh6pFV3A1Iq053NrwVvV6N9MwpGanRgXb5w4RBfK0jwf9dyrYEhwMxS4uWo9m6RH0YQhRx4ddUXJT5KCV46S5VGSDwiECEQYXsyzZPysL4inYNQij5L8NqdFAOTgwczsMWZuyDNH7zEEzWv5kEgXx-vlFdZTNXiXD88wpC8_3ZlpuBIsfoLb2J1ZdtwSETNtIq7GW0h1XxRB_owf_ey43MzZRX3_3dzUi17x1aUtptyXwRgqOJmpl62Ho5Fg4tHIUS8p4UWc8ATRr0mIrnhm6FcSno9fYPJ5WsyzzcA2lcxtzizfHUXTM16eHl7CNRgEEiZ2XwUj6tdI-vWqdTAdYpoI1tE78-aoV5T1ONMRARhloZ_mTbLeJsOTKDmmzK02L5B9l-yfdRJT3nZbVhQvkkHM3lPQGpS1zdhGXiXzjY5Gr5LJNWXuUKZ9NZ1JkzExngU2HXpjXm138uk5jm1qdId7W0uRIsYUgj5vM7LgN8li3Ql9hwx-5kkcrcCYLtYQKIaQhnGOPlo1gCCeEmS40FaKiRyiAw7BxFSGGkRhxq611ojYKp2OE4jSFZ3dHMkjZWZDAoqoaDIxCSxV8ZSZaJNohVAt6dv9rTZUC7bXuSkFyVF2yhmscKlSIVKHRUooukkPx0t-wr4yLg-ETSSpaHYpzqfUg9zUI9XgczA_toay8eVs6HdzcF7SNpJKOW5OxJOxSSl5rdCOiBYMukf6noMgZGKF0qLjAKx0KJ5EB7VYB0VYfUzT4S9VRYyofSXCgKBQZYc315Gdl2kFS02RK7arYjdRr62Rra9TLcwWSjp1yI2CL4RazlCWZXTUS8Irw3QKf_y0WDuCOmrlM2eMndBy_C9AUfLdfE5Q2agXIjAk4hOqcmdB1QxhNsp17dfr-gLX77Wh2SOttcMTQvFX52xItUZnFTDv2k9VO7R2kkhocRRLH88Ea9CXZqqXP7TzX33Z-uLThl-aCbHZC0MH1YC9ZDS5dhnlayPGCjRcmsYffyOhg0apFhUmRkTYeq1IuWNMfEeoYmdpJuGKihBC0WgtJQRCjewsN8Lzk6xNk3JSuFEfJlLGzvCL79hCp0l6maC6PE1azuLL4osyPo4wUw5b_XRALCoL1hPrcmoc0uk4RcyUUqhu9XGv3djY8Xwk8tg6gKR-yhI42g4ciiM7dOFPyB5rEoRjff1mkJQWRx7JngSu1TYWzDsWzDSKl5xr4rSYZM9znYtYX4IyvzIVb35y_91_uPG0vbE_mHUX8_6nfw884pKPYyvkpzK1ArWMW3Vy0CxnL2tKA7fhngu76V4gSlJ03HSNSQRbBHnQpp3jFM4ooePdp9zyhb1qYBN5wYZGr4yYy4GKTjwHbrjkiA_lnwbJvbICFSsdfyNSaejXPub-f6CG892w0V_zgwE0ZEj-D3RqEJrnd_uUTD_04kBF5_Q_OYO785Z3lws48zve_Cdk_NT_9NN_ajk_IQcZa3dF7df_pNZ7_0LdNOK7nkeVsj5u7e5_qMjHEYp9bEGDZ9R5_Y85vqC-UFWiravp6izWmtLhER37xJxmV3SaNB3fN0qdJiVEFmXTcxyGaRjmhH4n6-sdoJeaGA48lTuVeV9O3-wADF8SLz4FL89PIBUJWB_zGsBDDfFiMo6kkj3mlUYJiaISvJcwLc7GRpFFw9MN6p558JoEKi-CpdgJDMKsmQVHv4eKUsR9aQ9ou4UhVGPvFS1lEiAfsm3WiqtkIIFevsHpQsTghgFrZPN50Ra_VnYKJXYq5eOXIDMSyKwkdCnAUccu72aCHjqqf3MTtflxA1oK32EBHkI8ZG9Lc_w7de8SBHOjP9k7QHpeytOzt-JvZ3wEcNKJpqff14OBjT3wmrvp98Xbpg-Vj0i56QCmbTDRQw4i1TrP9Di-GvhcwmMNtEqCPnWm32d1D8_wxw2Cd-oEoOnOnN6g-dlk_6PM1X-4Jx592nOztyWT_oKBjIgT426WPS038pWr37jFPjr42S3UB0gozZtzFOV6w2lyKhsx0vR8g-orK0NmZKx0jew8EzWF-aJTlNvMvvUz9q6Huuw1QRjv0I8HTe-jbzfKR1cSPDa6y5VPW9fjrdn4eHD3o2_2iLUBw9TQyieegs3GQNCHK93ApFAfDYDwQMtQfu_5ayJ_rGQ2YzPbTFSb70EKiUOnYfA930zNrpma2sTUJsQLQxfBeY6DDKGDEJ3APUaqCFS_LzfPAmf3LMjeVHEXYHPAp89ZeOYThJ4BCH9eCi0TuhkgiAC8xI6KhwGRV3aHxcw8CyIXN-NPoKLxVMLO9yHQSc5eX4m1W_MGC5_YBh8L-i6YJZADO4ik6Kg8G_rO5uei9ZWYh1GcgwAcwR4ITCrL4HIW8dHb09Ihpqu3lPHMMAbNPvRDlJddn4NS-E1fi6D51D5E53GZGJ8R-DMXeXhCDyfpZOR36HsjUiQWAeaJL3QyRdNG8v8Q7g1Mhhxia9BR6jvRtEiJ5sd4Z1ZB0GfGfAM8gjxhtM4Acr5HIA6zX_nvn5UBONFEJ1H2mA7Ch6z3z37H9paAZWys99hkyzHdw9Q6Dx89_vnJ02e_PP_1t99fvHz1-o83B4dv_3z3_sNf0dGQ-nJ8En89nZwl6fm3LC-mF5dX19_bne7W9s7uvb39jc_OoDLjMXv3UT_7FSY5S_1pe4PAYh0OcFeqwgBsiA5TGm_C5KGXPMh6XoEwMM3m4P79zu7cPu6ZJ2tfQI25nd2dzk77Xne98B486Oxhdvpud2evvb0nSV1JIvpQyuzy--7WOm3J0tfWhqYJko2MZo9QL032s1s721ZVuAiYZxCQv42TYk8MCrfuutHm9rztNd2oubW-5f17y-tFGFHcT6jrAeaIY4Y0mx4NqTt3i-U06uK2oi_YCII_cTs71PP797dvK9tdKbvFRXfny-UqMpDG9Usw2-r6_W5nd7eztdvd7SSqs3vv3r3dzj4dYbvbfr99NTwad_eHentvu9vtbnV3qEh7f3-n09nt7nU7HSrX6e6h4O5wt9u919Xte0dH7c52d7d7RAXu7ex293eGO3ujRLWvOu2b_-tsHSWgNhELJOju7AKK70rstigZpWeuN2-r7EM9DqalPYJ2Yq2sEzXFXhjS25j-VbbNJgAUJfRG90s7id5FMzjvj1YAdITYYT0xayb8hUOBaqUtcj6gWrs7O-vuMLiA19pGZ-GbE5eD9Lk2uxlsTPujgKrqeP-eWi10051yY3XjtL4OLVSdsJdiZ3fDhcLBmnI0t71_d3ZvQtY2kVORx_GHkvtbPbPex272Hr5rJvpSW5Xp40-d3buU2dn16LteQTBYy5ONZL7rRYgpZgGU6qugReKELPcZsdky6sKxW9YCD_9qDBvbNKTxpyqfBjSfU0e8-4SurMp4eXht6UrCuvGVvALdT2z36xWvdpQx4u727aF88MqN5IHEYyVQLxRG1E_VhEb-Sz8fmNGV4anS4FF8_DwpWlGOHr10c-WmnyRtaYze3UnZH7atKkKxZ3ZNYRtQ7vnL5YByzfTfKyVWQs5t_OhLz0-ruJRbu94CG-qvYEasZZrRqTdbLHpgv2asip7ZkG5rRRklEGbErTM6dOLzCTFijVXraBO51HhKWZ-eKDtmwwAW7PlrTywnSywrfwgmOdeZmFWs2eqFo85bVojFDhYrK01IxeNgYqt9K2PL0e7vpbXlob2b0xoQHyxR5OoRYaNWPj2KBLyIYO6VE5Azrzwz1jU2rHPPWiLYqFdskFBzbfanbme_60lgKdH32-CmlKXDzv6O39nfXipgIo76rvFyrflara__wOBdfLkfBG3iFe4Hne49DzbzMj4JGEgZD4KNre5KxgP5gnCSN3T73fY2zIJr2YTAuntlpVxkb6WI1LC7s7Nl6thR-sGDB3s3atrq3tuVuvBkatu_tbDUud3d397fvUfngpTd5bLdbf7p7P6gmW5n-9723tbutrRVvkqDnfY_qMRM49729u697e32va177f2dHaIAPWsbvVn2bRen-7-r1x630lGFtFJIKwW3UtDRy6mRpEacGg0841xPvW9f7a2ce9yX9tW98fL_QnfqdqGfgYTA82mJQ9MyrZhq1_8_8Hyev3uK1vnv_tmOsEE977SfiZqEFY8rogvec4-m4zFB3R7HCIOcg7nu3W2XA6FSr9pbnhq6Kxs1g801YK8G6kY85NOpi1ACS8QTGyRXdJOcYlkvkcB_S8dx4j0AdM6KKoZbGXDvttPBVnqXOPyOv-2BWyccAVtTRg-8yPnykZ_ykZXfB76Zxf0I50oOX9QiTqZ6wXlQwXk2j-jGOe39MnJY_oAgaH9nfT2_v7O71W3zlm020wdBtowz3x4-3dhbI76CGvbXYvo9O2e9Vz6lAsdRASVJnBmkOLmtmxNpYj6fPNi5t7W99XcN5JoGMapVXvpDrbWvnOakOi9AFzhrESzgRvpqzWmm9Ep8EGLtZZDzQ6vFiGC36bqddndrPSfKsgPSlt8Qyaacnc7evLvdrid013e35jS_AoP1jHm3u92rTawtaJKINM_53fp8hLEf1zF5JKBnlYtEVGx1QkLNu-3myPNHjP9k99xTowGnMD6TtD014n06Mvuos88JtI1Hso3LbIXoGHUAN3ERjSsM0YpyHvhLdrUIUxG6VZRzFu6Ax3S9TWIR2YaSBcKU_CKeTGJZMmJx6bxjnF_cr_CPYLlt3tK34qAaprNfd-517u3v7e4TxrOhljp69-4tLQp2E4SRofYu_1B7-NlVGTEo9NCeF3UM-YN-SPT0_9peZ3-fcFrVpLRFFWVcUTYADoSXM9bYv-GuNWHxbn3CK1SwEreKMx5PorNzPeL80HVPAkiCa6BjYKVD4zohiDipwUpn_5464U6dCKx09vc4gfp8In0uswlWzr2Vjj3_Qb8ovbP7ow7fnkOfbHV_9MntOYzG_yZrd1vmhCe0Bq9VeNNMwptW4Yk4MGvRbC6XKOhs3cFW6O41Ee-3vtsIoEr44N3W3foR-Chto2tyuN2yVUiscpg059BULuqnjhWYwIUnWmefuFYsNCrM1t6ITTYbqt4Sp_xHZcPc_VGWK8Ep_B-XYPdx3pD_hHKGcgxPaz85TUt1Np2f1oZRYnR1JRnNUQgWJQU7sWHNKq6rVy7E9vbNhWivLkTnh_ikXF2CBbCNmaGxcS1D2YGpiWFkRSf3Y2J9a-d9925U9Yvyel5xN-ga2fNN_i5jDUsEhjhbRP14AEvnZrNqb3izvZJl_nGz5dz8b1rnF83xA5rl7FY9KSPKFSrrgUqH98gSCZktkZAeol3-x0aij45yohO0VysPjvo_RJKV-dqrfw7c0r-d_vwBAq3BiQRtq8UuBrVVxwU1GpCNv1eJK8iOzbnXqAXtL-MelYvwv-MU146uiTjhE33NFaYxzWoNe-AhR7oEf3CN7Kn3j5qTnVVrYrkyqGj12XlxbWr94XFy-3zcZEzZjSOpuFLPxAqM4PrH2CALokqsklWcaOSW25ilG73aOc5MmiWCTAbzb8giMtBkTd0CbJ1nS2xvS4mdfVtiiBLb22WJXVP9fseWGKPEbptLEEnDhvl1qQknb3HyrRPPUw0KlKjMYWfN2BOY6rZr1UkQJ2KU62ltSdutNztxN4j3MTXcu5HTNTl7N3K2Tc5-PWdU1dZlffxyTtfkdG7kbJucpSnJXZu8tZy8Z5LrI15LXdvwznKybXV3OdnWfW852da9NOK4rHt_OdnU3WkvJ5u6O53lZFN3p7s8flN3Z2s52da9vZxs695ZTrZ1767UvWvSl4Y5rq1TZ-9Gjm15_0aOaby7NN5h7Ztu50aO_WZp1NP6N1s3cspNRDwMbyLIWuwe3eju7Jr4QvZqoZE-mh67zll-fB4NTwUb-Q4469t2kNicgBgAFVDjzdyEw6MwuUWY7QWsC4_1a1R5FCdRdr3Gtpyu4B_6oAy273gW7RLTR3iXWTvweG0gReo9THQIH5ae-hXWBMVRIqoYDjo1yoCOStq3xcbG2oN2Dzy8ladZRJY1gb_WYwgw1uHSmW0ELN5DoDlhCrO7kPwrKmm_sf7bZbPpSrNli__gW3hlzaojvxR-6NYRn3cqoWnCcF-xPXsVitZNmkGhBLzDDGyMIaaJ-UTUFgbMWgYLS5BhPClqVBrsPmYFBHZEAKQQm_REkKErjjahjlTer9x2tERo4QRnoR-cs_hikWpGZgvcCCJT0qfTZLB00CzRT39XDZ1fZTW1s-tmPeMfDylZGoK7GqOJRhU4jigqqEAve5D0VmAG8lER_sjTfmd9Pb5PW03ieP1AuCImQEvCle4Gg3Eu6l6IMuLA3eqsx6wb291alwYXlnWOifXd4ra2RZSTNDv_vLWt21rr7HBrne7cLdv7cetb-9L6nmm9-89b376t9XvS-N5y4_-1M3_TojVGY8JHWkTkQBYrxX8jVmLU5UGkFlu5ctQMbtNNx5Uog4p2Op1tWKzHGyKEUj_6imjf9hzSOGr5tgIsrIrnIqbr_bdhMhHDvk-3j0xfDbUe5Wv4qrML07zhSRUfLgJ7qiK-I8PumNFtO092HUgD2hWTms6CMDL75Vt9wXadxjakIpu13idogWzGa3KUWijKy9culOXypvtbJW40WJCmRG_dLXhN9m5Un5XVd5er316qvmpsawAuxEM0VgDT1sC7W3EvKLC93Ned5b7u1vt67wd9bWabHb3LPWYi5Udd_sczkmwEez2ZTSZ__rbVW0lePnDNeUs4jU7OUWSPcJycHp2I_oz5nkyhsB8tJHRfEsxKVsQvVI0xoZJGkItkfsgIv8MyVVR6QWIct_rGf8sQFr_m8Iyczy2h4QyChHqAXmR_MbTNlpr5Q9Ve2ovAfRxkf9lGvPX1x63Pn3X-Ih1NoRZcvWsOYeBfXSbWbbOF8LDuY8RuZ3mM44WPrc-w_1hlncC5k-mxo7JuzWeeTb-f-VkIz2MbXgi3flK-uZjBWsT8KabjGUerpZUq4vE1Ytd2FquBtiS0PweiAS_fRSgbeORPET7mGdvAU2uIxBs1OEKjiX3DcWSWwsxPWGfKGTCQjxBeCxr_aOkCFgTY0kvKZqryQG6kOK3FbX4mzOtxPZQzc56EXuBmvL6OkKrspy0JbhmxmSUt1QU_boq4HGLfWNXVzzoDsKv4DVLT-XI4GZzq1Qy_floLKl2KTQhZwzaztNiyEhA2x2ri6i0IgEAgAX022FLwNmGrZZsb5laOW-_PqELN27jeXj30ENu6seQxzMUUkUVP7Hh6Y2CDmoWzLo36xfWaKLS2y8HG2MDN82te3VWUKlg5J2EXMXJvycXnZQHI_rhQFC5HZeSrcrLdZVsVNrA8FujKYEzqIky-QE-fkwaw4HNtbmESA62WFk7dEiluNRhT1uAgZYglXYZFkptD_PLS0sSETFzyavetd7XMTfYHexxgnyzfjVpivTPhPOjcG-r4AlJJ8DLPOJw6zYF4lcPBp7oaQKvZ1zxNfOjz2O5zUdGExuucQw8i3DOu8AjFfUN6uyp-eVqq--BpC-ObFds3RKsKb1_pW1c422ZPW_Z39-UFoZPMZVlFGZydJqcsqZbuhjRTt8ugUgWA418O6N5n7EQr8qE65_tlTJfwDz_7jQ4Lt2rc82q3sYVUc_wjERXNVfZMwtHw_lhufCFYx8rVYfOOlYArJyMUmnF4DgCzC1I1o3WvAaZyy6FZPOBatZxSw8VwmyaobiaD8pIzsd7tZTswGNr5uw-FFtoKit8R_qD4y_p3HAyz-Lxo5dlQOf-COe-eKeJmW32gOzhBOz3k7AeUhKtS7gXZHucVb91sHzxZ2ILvtEq0uBW62T1i2413teSFtLVG-bu4OKFM-Ox-oNUvyvhp8Nq_wtpuup_cMPgYet7c_fSxhedNz9uk1m3AhtDxOOJJQluRX9mJizqYJGXCWULnY8--TXOj-e0nkUpighHMVz9JVZIPgn7xXhXvB_Q-Ucl0EBSHuEiLb7KdJXAiKt7Tbrel6VPcoEVHHd6BkhK-25b2SSI0qEpGN8LCteSSAm_1MuSx3C4WlgV8zbGlDALANduJuK6spUNesZGjilY8QvhwbmNB_b5Qybnpdz85UcmxHQS7RCZHHH33KMDmT87xRPsrOSijjifXXOySi10GDURmdy7iPD6a8L3ANkBLi9Ni-P8e4EZ1VHdMX6gG4ZdTW10vuXCTa4E3NNVWqJMaPOW49HTMJQfmqZelrokD03cQ3uAkHmlar3Gm9XftDBiTJGcoSuC3UjY_SS-pLJzOzupl21K2jCrjVL0WzzpHUG9yzcHUk0sahXxGL5id2tTIIA65-89t9_vJQ5U8sVN8FRBEz8rQ_dyLQ6ryiWu_k-6Pa0bR2xL0v7oVABtUJS_Zz6CBz13zfZu_50W6apko8iwxqE3GmEaa00xIhAyaieRlfbaco8k0kzFTHWXk-KVJkqA7fYdICPokocpMXIrlN4RbWG0oISJKpumVhHp-Tu_u1-CICJQj8UH92oJAKNiAryieHPWV0g6jo2Cjy27hR5JyQCeMhvkn_FT5WVyCk8dwCT5id81JSlO9tuoYrBJ2SUkeV6ELQZBkx7xXPwtSWsoNjTOwSl4ExVfX-AEnj-l0vabEt_WLiW2gABP1uPSpS96W_n8enPqSr5WP8ce29UOWp8I4WMMRavFFJXeCuu2CwWwf204Zi0I61OQY0TCOZw8YW4uPG-gWhHqewlj6m3WASV5LgIrkG6EHGKw2nc9OM3kDOH0jWcUI4LRRhXFNvlWxoYm93NpFMBZcdl-zeORq3GYzebqcrhKOt8bG_Cmo5TdsVCyMBE_9z3J3yG-uY62TN_CwsY0_e_bV_s9Rm_12Zw8R2sAEuPpu0PE-Jd9XzaJoP9G0rHd2HjzQm9vekvCAGn0Hh5TkUTCLR37yTZ1o2jRHOip83GFCOb8GMxayEODl_qyffBv4yaNFzad2tgBW_VMlv5dY9TeVPLNb_hc6EVTynkHkXR9Q4NFe-FAi_eSPKqY6jK6IiNR0ylDjaktvUdEXTEtQTX8FNTddwrp9QqS2Rpxwf9ShpFaMS7D9HaincIVNT_5ic8V7bvLOOiIluJuxUCY4mgDpgyPsQcLXZVxMF9_82iongq9v-8UV9to5F_fz8-h6kkYjxElMOCJo8gzx_N7xfRKLXjKxfgozOggy4drKKz0LNxeHjoMizQiJA2ieF_rMfUpIbSVLwruYXEB5wr6TBNoMw8sQWrvxptPd3122cV8uS2T56IARaVc5bYcBBkEf3yDiH42jDPMq00QH4BEjMFyN7Cbss8a3F5WL4BkLwJX-53ZoShP18I2_vlF7w9Ye2jgiHt_jxEfTL4Hh1GbwS2bU96PKmUVB7NxamaUJBN9QnQm5FHGUYasZVdFIn5YLBcehFu073syWkHUbCKg6n3NYVWIivsl10ER6C4zEJXSkC-Il-ZpbjvYJMiL2MnP3CFVQQhX8ncuvkl8XKqrkk5yJL9fX7aceg6hKaeIZvtMKWulEq463qg4BW27f2Chifzx1U1y-2luF-KpiBuycAbsjC-wU0ZHpjtkpJRpRET5I6dwn2hnFVMrBphcLS3mDTODzkQrwDRgOISJe5o3uDhwO6mSEvaMjANLY6Ojtnv6T2gtrDVZcKWRyCB6VLPcI7mnJo1aJ_biu2nbmXpYT_wjh-yoaBV5addokEmr49o_pJHxUhbeCb1pFqtQaFEBYcExPe9sMqEH7QqcmaEfNN_vJ9TRs58N0Ox1unRIZd1WybZHxbgB8MyuMe1kRdCoHM5Fl0YHK0aiToNNe1JjmSE7ELEwoL_aW95fFS7BEkDsH-J6h27agVqgj9ZPIk61I89wsam4TEhoigzOvCfuahx0_seEKexP4hRgfX6iV4OaBa5oQpvE-37uFW8PgxoKQcAj5KFvPKkRNuEf0B1TaRSTyG3xRbHYhVjP3MWVWtDLj-4zK0vGPEQfCrdl7Di4x-WNigW7BI8T-zFgEJWEHixJ1mIuh5JInqsvcYnLqFkcuYjR5aghTRG8h1Fa-vv7a1U1nOZZCNPw2jTNjneW5d5pO9g2Ie6d2z_WMgHyIEC0BBykXAECk36U1Z88mKpAHmUnKA3PhBWG8CIIwe90Ic-05aHFZM3NRVs43mRG2STqshOA7SNw0iHAZDTYKJFgpr0hCYEF1wpZtRR7C0bRZblBeySoTk-yKRPR3t6PkCqfCRM_Oq0vs1rQlujNzMfdYw6WC9sGZLk7SkRE4RaHz-tXBoeM7z54cOooJEQSn3-AnSqApJeo_jia578TJcDIF-3UGgbgzTDNiKgh7jHDJw8xhZ8uk2IAlHhy79VWxeT6J4sRZKHAPiD7HF5-bEAwPEIjF9lccdajXtStrCCjOiRnWiMkggyC0QLUSKCBqfSkau4yyxP3yRrxIoU3HLTdr4yieaER_WIuKAlZGiPze7Cw2t3ABjgGyI9ftNAvvbrdtebkUa7JMTNq2o5qZPq6sW-oS7dzUklkhEQGEMioJH21KN_X8Z72aLU8jmNBhsI3gzDTsCQilXu7y_TdJdBEfR7RxCIMko0cMtZDQUbceTdIj165dP2Zvb4txaxMOF-HXriOfrqEWMx-0P0DgbgV9RzgjBZbOgR-0MA6QlUg4D7Bve-x_l2wpZ2hj_zi0-vGYw_k4K0HeiA00gZEc41it-CRLOYSPvZRJJftlrXDBqT7j4mP48aLUPSm1Zz8krj_NEBfKHNgDFWkrKVdReYnurDxMy4A75qikIz2SWxs5cj9H6UvucHwCiUuD9ooBFkKXFK-s8pQl_UacQiQ6juMqrIV-ZAIObqEBuXPcXEzkmft5PbVya6wxBYwCIRLjoIjwccRbJA7l9nMuWoVwk-gd9o3aXQ0Ox_nLSevrb1AFT6Eqyhg_5hZKIhpiavvBjHFiDJJOIfC9RDfOAswN3NP5zjfQKjh_rZdxeSwrzSbzPC9Mlv7G8nh7RybPtgmpKZssLtctLWMz36OeaCUOgYXlqNu4km8a8PWuNhx4dlRbWUKPdNzxveMZxxhi3Cv3NSNSsbnh1jNDj6Eb_E0DvfYMtoffag7YyKzUVrpMG5pypoHZ_smOuUy-0XC5eF6Nrb6isp69BKExWgJXpV3Ge1ybo1sA-vX1lEswnpUCcI2xa8snPB1-_yF84Eb1IH6UYu4sbZm9QjDKLIcQAsWU5rEP0I6U4Fl_ZCN8LZbcFBrJ50oN1sc9srQzcYVN5bJ15EpvPUt88JYBc1rVbYKCsayRCy_MRRRTgTWoVKbuRA3dKZaBuzfli3IWxtah7LGuapWIYUpi8jgvUzbkggErVLxOMxu1yktA3NzjgeHO33Lbzmq8OoCHFwz04oiDy5nQc5CThK2VJKomrOh91vEhLH959Qm6i84-daequkyLYCHvFwPcAQEuq-wIsfpw0Fm-HmahGN4kyBWPEbG__jcwnvwDGE8MZ6_MDQYMznVAvwm3hNYESnGjbQ1AlcBKLZq0RAW0xzedNb-z3I1TYeFm7NjKEGzW3ZRgSMLQmEsfV-Pn1QP4lWH2apH8lJXDlZI0Fn6JJK10Q4bibWaAKQnLDVAD1_I2C6Pl8KcLCYJB6xsJsC5qp3VgR8xY15yQhI8FT3FMMJuYlPmK73JB7C-IzG0qrprhzXYPmw03-Y4D66oe_uzW8U0digEe0zI2GgdP-2fAXIdlmNdhNwliojXxK8CO6jCLIJB_umNVO1T5zvtg2geCMELNIFOZQXISRiTGXTV6wddF3ATxhZIYsIG5KphPYJmLPc8Qn8S0Fk2XDsNYMUR6YYhzhU7lknjqum5tYvRiGZING0tn1xtRU9L-LWPcsYSGGbMqiSoO60On0zxTQxxWWBsCiyizEVmKXyqVaX9g3KZt0KPbDrUypmZoQnOGeo9oBaHYJGxX0_lcys1qcTZ9BIVFKGasoU_764BnfE0jkApvLakQwfLzwDKQfJFwZDsZWzvKWxBIfBsCEaDTEqsFWVZGuYJZYgSZpQ1H07lneAoepT-TgKQQCSw4Mzt3cX230AXMg9OuPDv35Y5pft5goau3FLMw-iegXTJ0CUQTk5LTm40nCGDIJA2n4U7ldq322DJ8OGV1UL8MCsvTis7PJ9ccsebJVYE4x3T2cBTtapwy-TLO2rFjY40ZQZ1qRJVROiutY8_wdLOKxCSMI_feWxBfVALXYih3mSf20gVoelap01wU1nEVTjEDx2_kSRMXPILMCYtqoFU_qZmFMjWBM6WMElvM59mDzg6YInuHwVPakBXBU6KDwq3founG1e2aKqrdtKkyxKeuGkitQHp9fQK5am14EJPVegs4YqjyJxw66DU2iV92fuKmolJdGqA-RrTvjJeQP5DNY2_-6ajESvroeSrBu3IIAmoRC9jyhmEXx7e8ujagRdiKc-J3E_ai4XupvakRKZrjNLKxz_oxYloUY7fguGl8L0lfTGzX1xtviDLKSq691uwEV5Kl4v6UW3V-36hxKIEJc95ZUyLLVZRU92xFdN7jIs3W1hbhKDr3-XJNfklr6gJgKxbw5JoNJF8d5RzFuKTdOaio8IX9KBkwhucI6_bS1Rt6TfpMUL67rM_cafNF5aWVQRlwn4Mm3c_CzNcPihD3SEa44UOYzTfQxZbwZa4ow_RDdpJDX0Ec99CGGzTdRUQnWp0yLhQiopfJ4gBLVATwV5wQI5_pES7s-MDx4D4QKWkAo7oBS10E79U5_TsJ2rhq09zJt3S9ZOBOrEGRhC4bTSXOpd-uhajK_TYRqlARq-QV33JO_0kwgeKZ6w16UR9CSxX1dwZ0skb9XVgPquugj2wpo46C6JClopdBVdVpsNFRB9XNuEUQ_01M_5ux6NPgljD0B0E_IWRYpOcs6qbHjNMzeTlKiyI9s1m4GYByBuowOOh3BxsHOFye03MHzwR6D4PDzcJcBICrH54Ez-mdg-Pj9Sq4CKPYjyL1MnAPH1zR53fT-fwhP-G8ei5p2Xz-RNKwg85p6V6ur1-658FLPmEuYKFwEZwjzXuAyHu3RAjbIHhElc3miTpyL2gH0dGIONvvXWYTRCl3GyRl3wkKnVqSoz78CO7M9REim6nSHWAxH-BMvY31Jd80kPH1eHQgigeEHz1EEOEa4JzwTZTfqPUPdFTKvRzYi9Pq5ile-FfBEUxIAmZO-AoEOcxbP0SJhdg6zDI9AV3M-ThuS-pDlbD8aqVLqBNPE2K3CEr8CSIz0rKfxaPRRNNrh18FUOi1O-DAprnWiX-s-N7YEV_56r8yuhu456-vjyBxqCdtjlr2Zlh1zKQCDJAtNNGSn3qz08C-M4Z5HMQsmDNCSQDLrH6NLOZztAiKl-5jKNyVvYJY7h9WEwiopboHQYdy7qYywV_V5wpBHWZav4smp4QzY_UyHemnfDdk6-CXV-8-Hz55f-ipF4Qw3hpfbsERvbf3x5U-9WvwuZVQP_E1zDaklTvB13rvS7liKBW9aAZ3ei8eBOP-W8LKcguE-P703_67yxGCnyQjh1VnrMd0Bu5XhdKm8MaL5h1PvW02_93lBnn5ntqV-raQ0-tW9PE6YJRAo9gKz9y2errxWn2jf2Noje0qeb575nYUA8T2gMuMafmrfHXmdmufbtWyIGVi8-w3gaCV--1wQ54Im36X5iUNvW6rnwODR-5WEMDRFa_5skvYB39X35uH3t1r9JET3qg3zefe5s-00ky0TZQuJYcG6dWbgLG8ggE9xHgV8nuQhqlfYsJaoTigHkQbRIVBtETd6OUtu40C6Nex-1lJSENng2P6DWIPlz2jeB2PqLyFHRPAKN-E2yMKf5MN-DekuZxnjzpWtbIJg37zKULELBDog-g1dxbn1aGfHBv2ie88O4AJqcZ5-ac7LI_xAxeMW9FKhTygnjO9kdfuYQ-KD7CWod2Q9OrXeM4WbPEuN6AU9saTTKUZAEqQSrII-NC_n4GBClt05k9wccWHVq0UAN9QARv7UBXE87n8Ao-znjMgehRSu5lwCVBC-MX97b126JylR_FEO3DE77S72yF0kxMOoj3S-SmtsKOk8_5sdJ751LTU8Tq-0pM36IC6MYRJlIzyYUSNRDwdbJSu3RLh4_7Lz9ExDcBRJ1F-mE6Jaq3k-mfRFSe9htlUTmCC8g9RvFaoTOODwj8NK5xMzR9PYeIGwVb1RZls7y4tDYc2OMgqdS8e4bJuU84XHpDxuI9r0dV5Fp8RfeSzPgb2oUQjwZvJh-rEk0PqOy6insVREvkESpMWHDWwdY04zrPavNErjuCZUwo--4s-U_Ymcuvf4dmoLKhUTj9Y4OC0y5krVNHUBHp-yPeU3WMLZY6w6pzAm8ETGbzzL_jFE0VdtFixLIakztfoIsrZgBXxeiMrf7jHUv-AznOq5mhK-zfhijK5vM39jqsbHzrKefT28PDVS4eOXOf5y9dvD7kP6-uUv8XRY-VGBVuFcvLp0VlcoHwmFqzRuBaX3p3Zu7PKW7TkHCyeSNBYp4gLAtXyfi86hjg5Ym-OMlELoXZIn9pE1SFuTWFGqG78hJVJCziiITUS8mVQlSKecEbJEpWCjVLO2cXV2kxWO89fPCsnn1pnPYSbBDMt18_50Zg9BBbqved_4Ptvowvrj3FpmZvLnrlJ3eW7yAO5sE3DXrbwgBNZPEOI6B3wEHHyRYRnZykWrGM0CCyNkXzor9g84kOf6D3EaKVD8bNlsuACQRhw9tr9glgEx3xFSWUeCHEyPHmZftPZmnNnZipZOJBhwsCBCyGEesGSTeO5FiWIsydhDdKxkcasETtyBtTQ-lIy87U7ZPlGAWHoa6qqD70YtGdMY3ggRuxuAkaixVeYqpnpm3-ppgnBF8D5SDO_lQXvDT8_xiBpAXK0MQlmPxBhzCqpEtxMXrsQJpSSGNwUCtnZBXVJ2Ij3pVPHUzeCZZLcOe1CQNCCZ1SGKEtgDAkm3vPtNAEoVFVqcDTM5krJkW8uRYYehfjXhhZoIqq-gZvoaZFwswBuZlm-sJzWmGZ0Qbw6IZgkw3W2wyDKzONYnFIk6igza7bbl5WdNdswWTO42suDDqyWtBWQaSsgK_jgVnAFqgRkZQHrXyKnuw7sFbObn_qz_mBzyb0j83yCddoewvq-7xmxE7Ebrw2bLT4WvDtFDrV8HTZ_Ej1idY0EEw9oo3AMZn5TjE7KyOV5peSJfq25OlFpG5eZRmUe1fuq8G-1wknwoZ71R91lija1Kuf4fD6PfmHEEP2OYXzwiQ6xblnvvUorgwjcMxPedVcGLl_AxNPnOsKNHXr6yyT6Ga5mD_fbvjhKNNzx-vrYioouwlGz41tamphoWmnig8RNfcSRaE96o5LY7o1sDLpjIpxHg94xLOaWxJpFGB6LWFO2oVA3BLBcnlUijtngDmROADbqYuF5Q76JyS1qE_8M6ZXe-ISoRnr2aiX-khJ5rUS-XOIXlGCFExHA5gK7WvbvLodnD4yfVUvbrY56pudYJc1OB_WseKS0hLxnTUcfXiexXJgd0jooGm9VGuGgdnnn23vt6xCBzlEjdbHXe-vLDiNG3J4BtgR0yHmWQgPzWKaPUAau733vSQApBGcfuY4J5bRRzbFyfk-jES7nKLGY76ioUoMQUxGPwDOYkV7CpoDI2ySabGi5yAejXRgUkayvm6WqZKIJK7YX1r9Lgoxan0q3-KDMgaCM4sqUExcE17xBh3WcUPMgsByDsWFazShWBOrDmgh6qj5_jvNDg9k_gNDBzSbxMdHvuDin0VGXtCbmGbb_f7qVJVMmMn4YL4qlIFxxrQ9_9tzqkAT6jKG4k1sBBPRlL5TRHkMop24t8rZWxChnflmwXbUnqrveZFUkH8SrKSqGk-pbS8kScxFNAJfLyTgRCG1TO3nJGl-6OduzqUtXtK3RG5bMzEpQAO_isXBcsXbMjoKvNeEhOBOGHsfcfMHS-oWYzl4SjXLOPEydro5OgnIuxL9A6mE6ONOZQ18dl4Ycl5VqjXcxa91PTGN9AlEY_y44UFG9aG1RohNRYnIr9EI_1hhFLkznC7nNDSk0GX5iX6DxD_gmXxDMdDRGZxAI0pRdm9-joKOiSx5idA3DvOhURQfGKjI6rEmCqTzxYGegiOXxmukpPEK6GMkjV3RUimM139BBFC3upAQF75tgXcYviJMySapEOX5SS2HeLvcjTuIxPId0k3IfSrefc7efqOjKdvtldQk7M-7RYxZzGTEW-9FET5iSjF6V2rkDXajoceWlRAtgLk7OH10fCh1O2IdvVAaXwK4ilSOxCxLlA_zceJtx9AAnGo0coQc8sAOg0XGtmyOWkXApO8exwkZSGs5n4SxiMTtBrW_8Ua09dy0M1WcTXk0v6dqnSVzk3ExLKlGMzZabNHeAs1c-f1Aa-ZiPbPoD4onxpW-_XJSeu0KsvuDbW36mQRl9g_FBoBN9y80eK9izyY0mNFlvza1dpSCe79caiuRKRXfKunAlkdw93WhEb01VhfhYugSOpmpVe4ZQ_jX0Q4c1Of9hWfmhZ-_vQEeq-0nKyziZ7bGXb8pHvvscsV3lBfU_dZ8LXln9YgF6Ovpmbq5ZuRwMd8EPLLXdrvNMpSQpKofRk7A8-PsWhp022Mp7TGlUDY2nAgs4IXoY1yUhVhIEVDf0Fw0GyDKdDteztMDpnARuFoZ6G8ZUNbm0sPh8j03MpJoM0VhkRDCC60V2VljrmBoblzJ1dZJYZTllvW1c6c9d-jQ3n3IX3Emg_4J87aYOpuN3sWymUrs-6VL1qtGQy3ox30JBE-HfItQcEQvyhvcdPTteb8jdtm3TxA490eCndUVrzg3ijHZsO2XDOE0IpbACYGauiJqaQAOKg3Nyu-CSrogmcjZxT_2QHfa5APiemKjgcFauaO7HCt_45RcLC10qel2q7Hqfg1liLVz8Tk3ukvtdNooi4i8e5v62OouyU74i1d9bKKO1wf0r7sxYSPl8QIIAEgm_P-MT7HGansb6KIUvRTqZVP4Df9ECI8syMFLwsVQWuP1PvcFdb9PjA6dXN7PolLwh4Isjb7qbbj_a-I6LtNwim-r5OCLS0NzGIwoz10EGMCn0xcU8-MzX_dCJjPu_1Ezuzy0edAg82pUFULHg_xlTujdBn9dwKPe7OEroXeqa0XnLyQCn28KNXing6OiKj4WO3vIqJxClbz-X6zSEPK6eyuZ4OMX9f-ZMns9PQyEfYxZaFoHN8d3TWgYxi2L6dFozDxHDCex1o7Epld3uKQfgMB_TTHhMF1mzezChyfuy4-x3Ufb7OYL_OAt7MyPNs1h43SxNTyuFezJCWqbkw999YOidpXqXiKebVYdhvewSXVqVIbA-yqnHNfL01lpt-xBQWktLvhuILwizBg5ZBpf1CFF-UjE1YykZoULx-pkZg7DU3uedK77se8KXgC990yTcAbeT08AIewVCKuMWFqJYmtJnFoB6y56GkM-lsPQ58cs68cYMBpHEtWS8WUStRulZFCcgcZc7h4rl9gJMAN7gKmZSMkpZ1jGWujwireydaLCKbJv9eNoax1lewPP2g2dT8ZNxJqTehHpeR8eavfM__C3YmYVpNrOFtf0r7ixPpYT9fOr2HZl-mJfrUTw9A91EUxkRUwVbcp1ximBquHIbIvC0NS3OCP_OFlC947b4af8LJX2GFOnLQJxhPNWggkZKDkUwLVpwQCjhvLqNmgmB2jvTiBLpg0hE-sB1qgocEdGcEtqTe9NhumufH6dTOixvtFf85pprGjc_fsb9cRuITaQOrGeurZ5R443u0hCrAoaAGGLDRSfldqUDMNGVw7ZlWTxeOaxKMOTpUOh3XdnL6XBZ_Dt2pqKJpO0b7YhSGr1oUDeG0qw9it6YQsGMd8DQwnOWU0mahiX0CFt6S3jWsaF76qn_rtA-NQrtCtQfGkXCAVWwKE18Eg4aM9OhS9wRAXOzScyNT88QWdU9Ic_Tc5zANirAQeDA3mWDIOUyyggbxa4ndoV9B1IvJsj5NHQGquKxTmJ4Ql33dTNwODaCM-iVaYNKTGmsz1yTB4L4oLb2aA1EDf2o2bJMxScCO3rn8o2HxBCx-ghoJTRYapIe455pm-xXJRZ-VSSdFoSnFU2IFe_iWG3QOZc9YcoxO-EfGLwCpk5L5lmkKOZctvRP7WiWeYhSUb3c9J63ZKD51Ae7UaeNLZ1m0oWAlyvbOIk5kgUcM6ym_9oX2zlWcdJAQIyz3afL_E9MQBDeaJXdJSpuI7m1C6aQEMZJ1Rum9aDFZDpRy4PpI3_D0tpE-qqGEeFl-pp-uDAeFJPJlCrkMpL5aeFbjpK7nbTkjWMHQS8HxsNyTRbGZ_UlhElXNRYmcouIVU6ont2CVuAJ8lncKRm6CdbsA-2OD_xKsO7WTMgbZXSeQc9GsVRJaSVmQ81ahMFengfmAsuHRIp-6QNbD75UAZUiKwDfckFtlQGyYo7vzExxAbGkhsEEkXgoZLy3it9dk6WcObEF8sL8chVnMyeWLb9vGYNebiXDkyDt50zlOg6xWBPr9kDIGpxYuNHxy7AIeuROPLYd2ZIQutP7CFlZ3mA3XbrGBGdozgaSkh8QwRvnL6OX7hSX6n7qOx_7s8GmXKc7qUY8RKjOla4W2fVsEtQUDMMm99uE418MmWqkJV9MJYJ1f4rAVpMAD8YFY0K7lR6yJVZtRrvC_8BJqtxC0cJ67YyJ8YKtipGdHMRHEyIGes67R28wPZFVaRKtjY5REVi1hMZZ9PFJPBlJbPcxMFiGEI2tfBglrfIqUGUSKjBFAChA3vsSt9SO4VXcsnQFLbtvZnBi6DuEogjEleUXqPdTeoumV5IBaF2KXwfrP9HTEEefGBtIRuaRRMhyUzqROercdD53Xj78s1SPGsUZ3-wJeVoNl_QaSUsUxcSGVyxzYwKEjd15Y2c4kbLKaYhPqHHG7tba0GqwtuA46fkT0brwsY3wsBBzVoitQBA-a7ko_av1DR5rECUmTC9BVMOyLmbv0b-cx0uLR7-iNeepu2EAJ6m44ZQoRr1tzEGXc6FjZ6mBrUqkE6tVGZnFD6qyEg2CJPTNmGcN1RgCE3jXRmoURN-Im2901Bi6muiFm3s9DKAx5VU6Z3cm5t8_eOHM2OWlgLglqnkhMb0wraMKGnIWPY9umO1R4oU47lKfxjSnEE7mKiulQlmEoAHiCuvxHoxqKpQ4KG1IysX5zPP2ORbqFy2cK5lKn3BtNJAXUSxMFnAx-29EUmyIJFML4VkMaMGR9fLS8SUrnS6AwqIpbkQ2CryUQ3aBeACeLEl6k6ZmzJ4cW17qzLrbXDM3lTLtj_AHrFTjz4KVatbX05IxqufZNOTnOsqGJ_VcSWFRm_Mv7MmU2SgrCZW3pR5HcKBjRqfcmzUzHmIFTtLscx3nSJIvVfFaLLwlXf8RVnCF--PK6rUwGXwSykz4ROYZQtk_KVm9lSmE4eRkTOj5tg7wkVXHbjwgvuedF-wyMHN-SkgSKjsqf-rNomP3qFJ-sODEPVoezUEAvnklWIoV9zgtB2IbhNDOTXwdJXHmG6fipZi9a928i7e2HNSnIEmaTuA0D5oSc3XpDvlL79agJCbqSWGCknyDKKkMKLC-Xjsbq2QPSIN9xJ_DZP8AC32EYHqehLrKlsJb0dP03LktNthSrKuSFZ3BONIM6HJht9DCQtX9oGPkuTaF-KXWsMgmv-lrPHJ0N_McTeSJaJfUemY7MFM38j6m6t2lxfPUES4FH-NGdCyhn2XLnLbpGyj3I2LL4iI4KrkztVzVMgAcBkuHoBluo-EOCW9GX117kjARKxJZPDusY24MW3Ghz2jo8hDobvmBoZlhzQVZrYo-46fnHs7nEQTz7mFYoUKq8bNQvCODAOnP4cLzf4QtHbs1ofLrZSVfDB0Sq45tB342GXQmuzcSWbPMZIcJabZKcsAGI8gKYiB70amo4a_FhKee5ymYnC-DsqnPrTzKOBoKnQ9aInwkresHQda6tuoCIn0bBZHIE9hHm7xmt83x3zk5-CC0nYMXCFMbhQTC2xCLbGcAyow-bO1wnNPlvPLremq9Ep2Mqhr292tVcM7y90gqIypYArNcq3Iy-ZdtNUvTQNCbvUpmr-nQEa2tcJYALVkEn0nWZZ7FletUo59d67NMJBjDpgFpo43j0N76dugyajpTkkDMzQKCTQ7pqpm6ytQt34FpLsOPv4d5g1s2kGYjnTFEFi1-Xlii1jPjgtwpv5WgFWK2siE0o2ogQvOO3C3PX29IlASavIJj3NL4YHREvTzRw9Oj9Iq1l3Im2IhfQBnswmQsNSUS8GrqoDS3MNEDWl8JA7qECW-tPUQkWErUo1Bk_TQ6qAEc6_JbassIjtmVuXhCHByH4FBZmJQKEmIhK7Kc8CZGyX5T1nmLxh_z-MUOlChxJg4_c5DrCauQ47qjFmu_Yk-sxeELDbInrrZgYXybMOWJFe6iVUeJxMS2x_PNt8F7YqIZQ36H1_mcWhyVYtua4rutKk15W41jPRnJzcDLMq7kn8i4EkO-se3DCgG68Gw4AR4Xx_hBbPigyy5-9rqCUcCXqlDOfN6YuJ6nbtE8JEoCCdR0_CNCZxtFf5vtGmC13oFVXnFeu-wixXQYQ1iZ3AiUeGw-2FJTsa768do8wF1eKNulsh7ueaN9co9QKBoN-gmxMDG8ptAZ1an5BtOKIiYSkdfzObDOLSwVm_Gqgye_P3l8qOCk8fDNk4eOV_eJb2g-YgmeTggN6qS2c2Y3ktj321Cp4iLEHA0AUtzCRTVkn4LkZ0z2FFb-oBXsnqofudiZTEZHAZcTYOkn8C1jA24GsUSAMlGT6AgqMwiY-TGXKHg1G-HQ1Lf56WN-123dDT36_Xg3pL93IIu-03G8H8NqzVk5DB1z_4Sj-tHrAQw8PCMhztgLlQ7bep8jMcgNIjXlsILs3oiLQxWt4hQRKjkuipjwJxyTkx2rMxZJs0qugGF2tL7eZ2P1iAPZAR-AJ5OgW7MSKfQ57ryKBgE09BtuTv8F0SWTeFN6n2xADAKwgcEVgT-NoefyT5DBhJaIrKEcqPFk8gqoGlROf2fQbCpJBKhS_jDNMvGbpI229AplJmK12-J0MEYCy8zky8SwL61EZ6NFy4unSA3YsppnDCI9AzDUL2bli5pHVDNIFZxTzCI1g6nSK9l6OVsmbAEL4TZMFiRgPkFvBidTEyMW8mF5ghiYCDkheQeVO4FQgUQFuPaZzebFoVyVtVSHgZ1vZdbBT7EYvek_IcimtxBkEkTSiplZSX1TxmzDYokZ3I90vDes3VjDWyyMeRuNVypaDVFpYkcJldYgQj4b0hLRiYsyZUAVuGYOjD7SaLWzaWuSpqfU1WwlSo9Xabo5tIkpZBMrx247ovqRUSOBzXxYU4AIztPiAk_dWQmJ0r99HhYckqKPOAIcQBY3Gxlx8gqtZS6CbHNkEHubkmkaE93DXaA20k6M6amyYejagwdUGeYkbllXYjF8N-G1aGN7nltSkmUFy0YOLEcoXXeJ2YUh3TRI-hPgTPgpV97IaQsGEE_texh29NaC7cnLiCsQ_P0F_vop4Nn1rLGEfCoLX0IbjQunpFieLJj8amSwRGFZnR1GgR1QcAilaRn8cKUralgzTbC0ZElUQgS6IAT4vQqJbsR0YrvegosCdpK9ALy8YRVGgoRPNVzNbGSC6Ocg-u4aVk1F7_jNKoSQ8ohTlszKkfwrJxvbcST8yQlWXIyU3zmlNNNE0m9I-kD4ARa3SHjGZZivVdEv_GINnP-_gUQiwCKQZjOQGwnmgoaGQbwoCA-iF3wALpZbZYG1jAHEh9BMoWmNc4GvEngFjV5WsR7kPLJqpKW3GMtywWUDeEJFI7EM3DUBJU8ufX1lBcggF7D1WAAM_tAgH1vw3Ut6uZl5ILOBjWguAMPdlF_o2gAA",
        br: "G-fasxE26A4kI-TvNaKols2jiKpapACqpwJ6wPZyhJ5CLZFSlf3gVmtot_mkmGHvaDtIm3i5E3n40xXHsBSlyeEz1VxQ9mV6cwjp_9HsmP9M8GlLWDq1COxINlmCtI_fZvxm6ulG_binZjgCT7QmFUQun7HNERr7JNeP2mt538tJtLXMK1OAlPyLKfV-Pn-EZWRaMgkGpWmNrRHkcDusVmnt9T5gXZJbvhQ8oybF-i-YWUKKY_-9uvqv31FvUm9gZGY2Rm8KE2CFGS5y2b5rcZtTXcL46fD88jPX1y8S1Lu3DKtTE7KqL_vrUhzSlN1w46B1yU2cLjZz-nrXI-esbc62305FcAqclCigQIHhecvPX6stjpBTJ32SOPOUp-EWRYnZ_vdNSWmQ4Z83Mp6vfc1M09ebeiGdcumLlPqv4jCNtnGxXKAJbl05E7NMtWrldCOQoAdYhAP-7dzUCrFkrXDallqvb9YPn0gbJAjrLVz7tfrKNRJwwowPZ4S8_ez919l__b5dRdad9cQp3WFy0ivNspABE0ihtJTnm4CZpv9XmqZ968YEakOIp_XVJ_tGUU7pcPblNP3_ryqiqruh6WoAnu4GZok0j5gkARO8Q1Kqboz0GhjuMzCi_SDKYTaT2j2Q2kvIDIobFR3D2fkqOqbT2oi55clPMGl9_41YZ5bwzpFWEnhcpKHr2bNDeX_LhG30GK7q6qNuzkBAROFqvw21_yb7kmxp_2K6MVUISSZ7TwfITY90nrhFnfr2IZiKgb92oEgGjc7CypETB0avYQknCGALG_DgCnM4gwMttVVSSjldQMlQRjZMoGaT3PUPg7Fjk7wHeE_tK7LJYdZ2wiDvpWDALZxCCFcldz3rcm4TUDLpFowLACj_Oqvrh-cFOoA4AUB3BwS8fzcBReqZ0PTwDiCARRCmjgafdR1teTj7PqrVO8ArgBn2CmGG9QGQkC0SW3RCuZKk3_7z_gIo4VRi6bScsDkj_RYmPWzIRaGwbVLfmbpnvlYIICJsCo9XCP6cIkn_V5W3nJQyWDW8Ebe7WWaMbcfRkPT_x1Xgd20haFrLR4-amcV_Fpnm99U-vNP37D61NYSUOxmCxZXjXTErJXPaJkB9icCXb-9VqrKm8WU6pgOXs7GJ8N4nCN2GtMLdzC9RjGwdEwO4aTo8RWgj5Fn7GldaYc70GyZAUgB5i-K57a5BnNtM4eZxK4aAe-dQtAguFFE-XJJgDdimV_giNEoZiGiicR-h92eAxtXT2QKFnpYXpc3rhCIIK2R-lo5_UX9TUJQGUHz6L0Xs076U9NcmtrIpQPwpmw6DhfgV_4X5zTzpRi8MRFCIeBepgEtloUWN2KVJCIh6SDA_32w8WYxErDQIhyQAzrwFVvZOmW9GWj0cboWc5TFvVfNEp29O-sIvjZXLpvG1On9sd7ey8dvX1cadufYaG9y6l2ctiefIif5tcly4Z_9aQa7WLlrEVK-J7VEznzpfh8Ezxo3n2RYylCpNV0f0EStAD5Dej4VTQlEC-85S9DNg7N760_BRIJ2xDFiZlYZKiy8zaG52tx8Mnat706B4_5ZA9NTGQMaQLlOzAFw0WBH5iiT11MJV6vtUW9t7BIhBrmdNyYiJmqxoFvGxbP2xJn-GtsAn3q_sCkpjRgse6gPSO9VZSV3k91dtOAudymqbCAVA0XPdUIbaJ-djxhCKbOLXGF0R4omssvVJj6LxADYH0C3G8_lHn09KsTR6pOKViIQKN_eoafj8T6Eqer864ye8s83Dd2-b3x4YzTxh17UfAHjtfDK-COrfdbBGSfSciHccISOln62nfSSeJp5rHk2J2UWYVlTNrk9UhGN19AUSH_Fv9YlxsOrV_zjxT2A30XpaGsAJLtu4EVRW8Y9S2LVvB89YLKwAqU5xn6bHHfDsxLcmEbdq0vJt1atA3KmVEOKJYE1Jdzp5R10vyr6m6QDn_9ERsjsAyrRlado-2QYNTffFvR4FF_dqZuE3ioiJAPGmfEYKSgAA4TUKGWdUdWJesY9660IAu36nhLxNiMKL0ZxJveAQcK7U2Dx797fEf6UjEv2WJEQXZDjtmMFjz3XNIiC-6UCXqkpbMOfIMCsnOuU9bX9mASk50YpxhEppQg9JQ75_OEkDIZG7twaRRDpq5c4KQBOdAe0KxLF2gAGPUKWgsRqjn94uiJS-AQ7QqLBjhD6zuriXmu-WzKlccwwoF4rMR0FlZWo1UOrIF_jmHs9sUSrCKbVzSk-wjYy1WAHzGDqcct8JBXHTMIDTx20uWT4ExAtLVddGwAI7t9DQaDSHtxgdAtraNTiF2OStWQL_1c7oCqUP0aSzxFOaWYNCCC9TQxjYjVtzrixuNdhUoiquV5PjK0kKkAhOLMMUlwnitCIIBHGNssacSfqyrrrioB1UlLqu5t5KMmKaVkO-ZqXHYSGNgqVAYfBdcBXm-sRFljCtrewgukIjm1EwaddJjHUkVSlQeUmq-B4kNNSVLvBSh6sRyxSjSvHIUc-fJZ0CAY1UxdEeWtxTDPKfX8DwHsSjSi4-dC6hKwVlyEte66a1pGMTs59AdovriupBTlDIZwMoL34BJ7w7_Rcq7xDfnL_wi7VtWFzU36jr0poz9kKjqojxAME0SQ5g0mKORISi4FCR-w9s2PyBV17ufcgz6o0DovzIen-7_OGQJ93XzDzrU9Ak2R2iVYnFhxCXNBi1K_SpTXCal37TQFyUyPQJTVg8F44x1oCOWvzMVIazsZsShfUC9nzUNEPnPUeU1S4Zmv3-amErS3nIsijq2IvZZXmugpcd5e4L87b5V1oSzBKwa6quMc5wCoeBkPABRP2MMToe7w8N6l4gjaA146ZADKwzY78nWYwWLpIGFwy_IQb_mmnNgDTPUKYTOASXND6jpxonpoSuJTtJOnPA2jKGjGpeAaclsZFXc-1Di6GL7Jb6gO2CFOcMV6EdE5eMASxuDpeDCLEvdQvS4sBBcrnbdXU5D_yEjGeqqaGKptiWlRSuN70Ag5FOMKzAONKGcMe1wQTsE1ZZ9T1s5I3GeoKRciYQA7X7lSQaEOY83LSW1HTGiYBdEKHCmcFlqnexdquObXiEt_hCC5XU-k32EisOnNefEC814JT9jCpahCkzvmNFWAuGGcveaksMLlVyOlTyZCAeeJuESrMJgLucjrTGGJFYpgZpDRMzpJB_kagW42Bx-xVs6gi5uHEVkWp0DDdsBlgDfdbcyiSj9qL35mxjsz15Ee3HYtztNh9M_1EgVnND0N92hnX8hJgyrWZW_oKXKN9fjljfqSY2Lp7cyE0zUjqwC2zpK1dtQF2Lq8iObnruzrBb6DrAELSIBQZdhx2lzZYA_XRUYNulyGD8Lh7dsfptiI03jC3uDVd18PNr4RR6H00frDUgzGjbRaI0zky3iGOEFh3FAmhs6WSrUc2DPSdRvAP2Wbuxw85DilRqKgSZasSaVGX90mDISUrWFNHCsHS3Slppo1llz1GBzV022mf-w4WPqNmgGYyxkLRCsqgNAGVIxaMptlvnmQVliJKe72l7kWk9RLYNoomyISvZzFjbdlhF4qCMJJraGVSa0hOlURrmzam5WTQZELyGpJy_4NrVpBuyf8CfbtuTARZLimpZEe1aW7YdYIMqXxIkYBXmWAixNn8aBBPrqYYMGGRPThEKlyx2mIpN-AdkMDZAVZ5l3Z0abGsJViRqXARVn2akZydSpzwlFT2I_eUmprogA2deWfpUfcqxHMt1pRXDapy6FyyIsT7jKCaeVp_sflqpdJtjRGcoVcdoM_CbD7Ql6dbNhhpjDY5mqDVeWLTp_Ruy1_RQzMOLFbMjLsSN1aRNzyGAZ4C6SmoX1zIHdhg2Ylb4kFQZUieBqU-fIpxVz9qUXKYUZC32hvB0kZ3ALO8ZN5DgGPPSkIDfjmzfg4O4uH4t9ukFNj5Cqh4BDhN1xpPCXCo0HpiddQBfZVQX4M0CfmIshoTWfBNnGu5tslMI1dKI5smENBmj-CXBkQ2H59t4a-w7JzKX36AuhejqFVmxtVAd2c9gs4aJqusd82B-6i9YRDYiQADOkWo8xaqkgbDiJl8V-phPTjaUZBylSt4LCK8GOCRyMolg6i4DVNUAusNxja_rE6RE4ZVkhT_ISsyQFx4P7IxVLc5uGyM0wDKCgLIl6BWnmGZZfTjjF4FuJ_aaziNMlB9JP8hosWezWB1MZAkFD4oC1qFZW5pM63c5QH0wNVmvGC9qs5IddbB_RHC8QkxleM1o288Atj1gWwTlBQI4cv6wvH0ghtOelJp0zhtA4CImINd4RgUassYv9qMAd35GwOpqg-Q7HfQJWvpt3xrL3wqdYXWLsmkZXN1slSB6PzaOh5EGtR5zPOeVq28Vyk0Vg1wFaUtrUQsKOMUiahQPPJezir6QaVta193RQsGM0A6nCLOQj4NFp_BJ2sLWTBs_IBAIPL5Ts9lpsgEk8lRbBxO5P40cTWNr1xIqmCGF98VrfO4foDbOIKLCXbKjW5IZSladGYNn5PjuJot9rLkKbEw4GPmQvY08Rn-UJ_bPXdaUDUx3uoZd_mQKZbaE7VkPGaLLhLEEoCljC82YsTaQfCuHpfm5hEA8SqHPsLVfq821D4nS2HUbQEX3TyCDoS8B6KWu24dgQoVWmOndEUEJ2je3VMvLeG23e95dU3WYw9H9GrtZzQpPdgYBaki1tNL2gFwr4mNqhQaiOT9YWuy-gtvsIbRK60DZf9dNegA8QFdZTiIDvxqcHpvZQUbfYleKqKzYauXiPZOyg_il9XLD4jNCdiPO0SxwrZXL3skxyQU6b9S8LSL1AMfRremfTdjnzLDsKHtuouvZeIGdIuDEY-nTdGGR5wRKg2YRF3G8MbiSbBtB_YrZ4HcHSPO9k5AgBTBEhJXBZK8C9CehAUnO8NLn-Yw2s-ONawShsSVOb7Ez8l_kK_9qngjN9_t2OenJzwM3DMOeHWLnsqLqlhAL7rDr3my5oCvEeOOyIdaplm5NK7YLy0bLSPNbbkr21TVFmGR26XJ0lLO0-h77PQDfFs38IdKykcdTF8lMA6vCdOTW4ToBPTRo7Ef2Nl5YjzVzY2wAgDERwK8RK-CctS7d8JcgPBGEdJc6ti5T1CsFky8wVPxpNDX9oA9ZW6_XV542-WJoESMffj-M5s38IQ__9gVhpcc4PL3KvjEq2YH384yv-MxYbV9fLIo_MxBZwvaTwIwYwNXefKdD7lNKiifeWYUHp5Dav4X6jEwuSJPA0YAEDwJ_lIx8Ci6EgkdEKWfS5rhPlrlbAK0KdKsCm16BqotpWlEQHXAO2K2G--dyBa3qFENUFkxrtgdRgjmwUshskUcF3MIeb_iBeCl_diklBnvY5Ht0BhlKFIgaqDWimqUsV61sQmXUo020bj8nTzii8zISe6zTiQr61aqafWN_lPuR_Ef2vaXLHozohSsUynq84ixwFENCq2bi1FTS_0c7-aQtbXAAeuSKcKXPcw8TCEGAaUpLwqZ8G3K4uSMmuh4CxJ_l6nPyKENf-hu83uGf7kl9mTuRNSuvwqGld3MFKw-2F5nQB03N8VKgnuYYAB987Mf1L1zAThMFa_f9T4PEA1kT05mQmbSsL6zmxOXPnuKyvbMMwKxnXiSgnmmXLPZE2U5GropPoMKJA2ULuMyGtFWgDDCexQF8_QPaAGhd87aWgcsLFBxGuOvqAIByL3jgejXV_caY-JGZHMBBQCSQOjsJ7Dw0SNAlts9at_O9NZvXDOcZpc1nFdPCDMZwIT2p5o4E68lQIC07rcVSHcD04OGVmVDbrdBCp6z2G2sA4HtyN4Be1MX8aROA-iZz2hJvSYeLOWzVMXLiqU-QprDhmrKL4wHy42ndcsCsMWZN3eLv7p0nf3nlk0_zn6-8UKu53YEmYO_-orw4_f9rBtO_51j-tu__VBsn9CeRrS70fJyxK1u2Xe1RTmaIPqpF-J7rjWreMN2PKUCSdFGWiDbsrvSwDfMZZvK8HGw-ptg68p1kQE2dCdmRE_3lGwGEitjyILahp_VvLSpuVFeulb1T9hbGK64HC-8AUi1tCQH_fHbfTJY31wq756XCKiN3rW7nVrluS4Mx7wm24UTfJdv0MZ0mbJKwdV9NMPnphq6Z9F8xDO4obkGa_BEKTnC3dPtDHf6xWkp3Sitqe6v0iHPCnTKGTkPJzczhswHJ6-O5DkEAfGGrHD_Ia9fLrUuhP2zvKCPH3sv-lsvSeSiLHMalAyA6VnI-6my5GeugY0hY4FZyahwc_2I3owHSnQ5qlxIHNBl1kMb0mTPmYvAMI7yCkJ9xgBYK43GxevIKV1eZ13w4HJVxu8LpE7Uder_ZoHVk_YvVc3Q_XXw0z7hwckpAG0kvjlT-J5WBMeiddBmV68oMbcAVZgJQ-LnFSc26mrUQwNssQeM0QTozf2B4b8UA1lPrlofocC4DBw5efeN8ioGTQSwBl9_Efsdt2mhzRdPOW1iAgQlT5GyNIk5mccC1hLpxpEDnzidZuSRamK44PUPttSasWOn-9ZRAZ2-jWYM4hEEg1PgJguOUDtNfh-AzIIVoYuZG-kzCZ6rT8LiFLpmDdnLvOZxgIty9wgGlnG9ZDTL0B3EiKEjZK47o7wirJVqNZSfHQn-I4Y2TlVmr1SKjHFwNVSq6Wl5vt56c6XrbwwUF6VLLNukEXrpsQafpt8Pk1a-IAI9VLGDr1BeBCPzUsKZmr_kPXj1A-psD7Gf5mut0ZgocfOjLd4t6R05FUUBtIpKJfuid80m20mR-pH8rYx-kPzioDa1xcPxkBXV3wTDer93V_YvpeFnkgB5-5iJdfHwVuq7qTsA6Jr-rFcA01fPGXin5NqsA19uZd3LkTXYabcUFqvEBR07wbEK3aoo_9Lh9RINUbw4g22TLwBmIoRRm5AzuwaVMaBtsQhc8rT6PFk4gNPtKypczqx-rsYWZR9DFZD7wG7s1pMklCASzVD45U51qk01sWnIQs_S5Nq32iJwUAoVh_kkDlpeU33JZDd_XDWR1oy4Vpy6Lr52pkkqrYYNpNGbmJ74xJX3qSMGmBpccWP75h9Jmk5bYkH6VjDd5z_vdiJTslw0RQ2h9qGzt1cFwJKejBbXnOFiNt8ZwKxB7EoxAoNAFAXLb9H7k42UPiTnK8tytjuhXGF69-KybutjeR4CP7_Cl_HmG_cVzWNLqQpE7LvJtTp061i5dylfdSeXFccF7H4j-HvVAu1zcVgr5jeZx1-7x37G6TPBteaItRWt80l40iTDnBbZ1Y6uH5LYt3gC4j17DyXe0zI_1HXxhC85lyZ36P3AyBP8Plt-cnMa90FIfN32AT3149682Th0vzkeIHxQ-2PxuNe34-PaJ1arX1mOo6dSXhUcZeKEZ7k76GK9jLXBDwZvJWJa1tzrKKJmrZ0FZKUWQLNl3keob2mwk5UaWeOdRrnbEeXJXUJMUGyt8Ts5tFIW7Ox5Z6SIjtGHPLldVfPyee5nd2q2d7gi_zpYZVzDGCQVuUj16-9PGG4D1U-FMqlZL4VFYpR-jXDmiaRnlXTM22yV1brwtL6rPc06G6JFT35HZWdlydYxLGgOmViy1ufGVEY69or-m1fYYelu00hrLlSQZuoTYGCi9r4wSNZr3FXWvRt6N3FPO9YtqKYw_uGccRHMfF8kOaT0yFiOH5PVC0_6CMU9sj8KM0EfdKNVVCe74IEz0j24LbTHHoXIKNkGBIUpmBxafxsLlIMFWA-p38GtidcH_rO6W2212m1jk60V1PJzV85Fpu13GhtSx5tu30eMj5YUGl_mwvvUIHi2UJdGgS5gm8tDN5v-fhpiOM0PomHWo1wd16UxN0eussoC0mQaSer_sFLh9sFqBBaVQTtCzdrlKBLLo59iXWX6Mdayq6XC4l0qQVhHGCJ-7XuQ4SSyF2k5CwHFv9gwijldgjlT2uq4RXNu9wpevm7_F7VT08ZTX16_6hqhfyvFGoKYV4P5unbwWfEZKSXt9m8fs7r_QVZQFPMIJoT9aru-QeWZ2ayg_vyfYy7rmPCza1ku69a_4Lk1aCMQo9plIvr7olLxv5KM6ljJdi9nq1S2QM4-hw63wgDvFooomqdX2gaW6YwvGjQoV9iZr6I6wI2LBgLRTxxKHavaI5a9OimR0pe52X62uWLvkBB7vD-vV0Vy7dWRnAfFl2xc6e1E68pjrUNOFJdnCq5i_tSh_tcQoLOxFTwMmYyi5nAL55UoTCOZSeAVU1yKIwsW9ebqaGRssORUmFe2v2gJSHHyHpGP7JNW5bq9GqqrkpiU3_UdJ33ySSCe4CLC-mqpNUO-w6rp00V09KOsyhNdZy0e2MqUSGUdMd6oVf1KoStzkZfte4wpwIQyiKTemCpM1HantR8A4tqwdUIx3zHAHZn0DNffRQkYX_zSU0vCrODxHWxQYa1pO6y7qMrbOGEjIPCNDNp8XEA-USaLO2ViBw4-U9RiEdNlaycE8UGWlQOdO5XMoana9Nrz927QSYZd5S0zsgQ8oGc7a_20AwSzNBoRjHmcU1fhqmf__DfedolpiaEyN6H0_VW3NirXhY_9b256ZPtRnPQBVf_4dCYBuftINdbgd-1m9HL_BPg2aXQfgv_cT_Tjx3jNxwrU2seWVxeSw4G5QOH0bAqT9Ze3P4zhcZZhFBbdT1TrmhDkkm9-sEa31IVsqRy00O_IbBnOrqJvtd6dNzQ1Qa0mZfi4A_VgkaruKS3uHtPnBgL_jknM4FzPVrDhQANjiyBs4ZRqxbSHRvJq1Zc7wbETKjs4qMRAyz83PYr6PWyqmOIOnD0vUwwLhIVMBN303F1kOVV8knVE9xoyO5mmidvpGyvC5NZFTNf8SnGAKcfAb98wMNft3MC0yP1UwyfVys-m01AD0eNVlv7xQJavHisz-q5lxnfl--CIR3fP4WB_pvwOOWNrLMj8NiqMbtbRToA8zofd8MgzNKDRjA_aTUg_-lrId8GzxD6GEwm4KOBb-HrWemtt9LMXab3zc6v4-ByyWigY33bfIGuKHp9FE9lJLyILjhwwmkrY_ipCx_Qe3D8geVNdIl0Va-0YyovsbKi5pcHLriMU8qeNmSE6Dpw_6zFMIcoPWttfnrANKECPK4qRejoRCoaQE5lsUuIHZ0805Ll7aJKM6MvgdXv3JRFh17aDk1LuhbkrTN76013mzmJndGzIsS0p6s1lYXPcpPzLE605K8c9jJzsP8DgakBYUT69HgyMknZEuSzFZLy9kprZf-3URrOoPcP16zXRjU_Nog8qS8WtBWCrkChZ1dK5AH272bm_kP7oLviSLurmECs3WvyZnyiNUNmKi65HBE6aDbCXsyjYr0Q-xYrRp1ewEASCvis870LwfmTHaTnLCBuNWFfCHG7ydjveLyg7AjZXwt6GVFQiCCefgQtgN60kxZDypMyNcKcOdnMTFgCtdMZSZ-vWKXudk_1NXfqWdFHrV84j_y40oa_u9vyyCY4oJvl-zs8HEAhuR8XtlbgUTilAhA2kSpZhg0qpk0CSvsahb3VSjLxILBUZyi3uPUKEvzh3mNTp-5Bf6yCAhGuhmIDLU6fNIqlx2mUFvfXEzlYXJRHc-6JMqybHS0I3FA0cqKV21Y8HT0q2lwyfUeaYotK1xrrJjcRPj6YsqybmZE0qxm6VhfxMRSLrlIg-1SRwhLRtxceV0yg1117AaDTUf1vB4gD-BtctTmM7B1QNC-RwB2VVrXxcu6fDc6POmaO91UgSHtOPeL0oivtLmkvGeWvu-hDYkHtqkFyZcDKYZtk2aJHwMFi-0SVrAYghTD2yw2C28WoMlnDISiko0Ra0lX57TPFmWn7vVfftiuWE6QXe-X3gfLuy-_uFyaUROhZRO9t3f4o_2zWXha4ae4DwPDsjY156r3sAfsv29rYbhKLZWf39KxebNiZeMv4Nx7acSSc7FFPXtLnacixR1qeffhFHDtrkmZFUyMLMl1B6BUUfYRBEeRiAvf3eD7R_-1GfX5T_WothEurG8M5Ul4x80E9XGUlvZhS7lTiEdE-nmEgqhRkZOZdfSzmBrCT4pkGasPgknKa1bVrkSfQBfKWAM5Qw7uBJ9c45UltrNLzxIghyO1u0Qm6pkjNAhwHNbSIV94PiJ1m1N3MaIPME6qXngV_tdlKhGNpEgnAlNceVXxYZOg4rnjoyBrLFRQrPD2Fg0OlQpz8YFsKqr63opDtKVqEib7aNTVNTxjGz6EIAoNwrfqddPFnkF6SJm0j7VfNcc685vZH_hWgXQy2tEuJgqGFrcGUSTdOQhvyagtgGrW3hFJ-p8mXTjXQQgy0iIxH_oA5UFLLddvcRLEf0t3_bKegrjjyeRFd7dDROFrTika2cT5Z_oHRzdzSxKhjfnqmtSChQp8SGYz8cSJzAvWzRa1GnBgjuRdvHukQ_wt8U717u5tbg1_Vle-QnA6S6z6pDkNRc0WVZVFrFsMUk5f7vKFH9f5JPBnjEPJpIEVl4SgAb3btfy1fRv_7-TuOZ0phht5txbfpVt0ajM97wtkHY8i-4My-zF_LxKdi9PFwsKw9vbtGpCVwKktHCqUDIsZqnuByiYrARnCnZuYWCCqIWBM7eLUhacEyIK1pn54ZO8v0gc5frURNHjQB7tHW425zdJBhnlajrZ1pOJXRhlbgdjrxeilbKknBNw3fdpp2xSemAYmDYA63xMrvZLcVye5W3_dxJIPMQFCtdMeZHerWfNJSA94YECVgcQSpHRxgbzRDHiKPeMgFpJDEe2idFqYS8NoiTZvNrIb8d_F_kd3li-_vxkOf17HKd5lpfvNh6W-bEH6Hd05pupOXhc7ooIkLcDBy00uO1yNnAnAhPKCdEiECtIMqKmbk_H5kpW13zZSkGxN2AdkY28O1BX2zA1eyB7Wg7No_TKBZ13l9E5ihINxzkOQ2rRGP__57qftF9G5SPBT-hajis7Erc0_psvJ3SAIOFrQdJvqocpo4fXnjQt6Xylab01_ur_t8JbcJGP7Dt9wRv8ZvGa-98DeCD0rps5-X_B6B34WcxibzekF_UXo62F3rpMSxqxM--85Houk7qyo7Rh4xuBi5FPBnaKIehbse3k_4NuOpiOyDoGWC-fFKA46FeFmOI-Qy94XifFM29BTkhiaw8gvTw6DjhLDWjGvJRvejs62mCKKKmEmki1xDlN6dK10yxp4-p0ceSN0k_AZIyjs9Crl9uORUUKanvSa0m7VXFNooOQGUcc2_YuRKl2XRuhUKBw1gnra3wRYRlKTxND-8N0AKRO29JQOodFwCXm6Gv7Oxh1heDjbTpS8diSSEIH8gUlf2hhhsmpnYAgiMoZBPFfveAsehe_VO_RaM9G2SMd9Afs-z4iejS1YdiHIN0JiYX-bA2esXigugpTCqPQZxqq84N9P-SDsdzY7qkHBFLU4usTAqM_6nkO0jfxDg_YgTFqy5eOurpJaDWBKWcVnmrftn9_w0doByAbFM9BFZnoAcZpTnQQkbGLHGn0CLIZKgZeDaHocOpIzAD-NjgqeYRhL1q6B3PpjosfL_SNZJbwAoqaznzax09WFyJ7noy45GEr-UTggUH03IhF9PBdpYwixEVQIGISg4mEdlaQ80smY7ySQ2dtvm1zfLTO-KRO1skvE9Ezt2nezUh59nSLCICt4g0Ac9y7LegWqDriNwgIdI7lRj7jXmFJSTXQrV_ZRYweboA8Ji8TGZmKlsO0hFTuikR8ywVtjAls34k4sKMpGBPwA2v6FkE488vvuGt78siYH4iDGlW0r_zO80ohaztjHT9Iyl969N_EuPg7USN2VEnSswVkpgoOtatyuhpd_RGpWcoYkcNH_nJqLSRfuntgs7_fWLZhq2FQmVz86dFgSXrai9UIrMjEUwPGteA9g_7L96c4YFOE868NJInPp9xnbzaqpe-cy7SfQFuwx9c3I1Meal3Jy0e5MhJ4sEaoj8DWVr8fgPzyOosT0TJE2PM-NEJVtazR-7chv__66Pjk9Oz84vLq-ub27v7h8en5pVyp1urZ7qFxh-Nj-5__dk_9cPqfH8P5zfPL5e3PqlaYR87q059moPLw_Nu4UvIdtJx0mDqamkue6S_VhsMgwVlaYKoFSxsSfR4lv5b83WnhWPyq15hr0-uuHMfg6fGdEjBDQyaGMHOvrqSxhaLE6z6LxIqZU8fXTWdDWgNpLvx7L3yZWLyHwC6-GeApzSHQyhP62g8v0iEVPk1zgLBjl6aAEGYYWhkqYa-W3iylS8cTNA6cu6jah6EFon6amYdcVRtauN0FMIZQf4f2RPvKXCfdejObgn9OZvEt7QbbljRTLZF6Xi5yzpna519yvm31y37XUz8kWw7AEOflQrpDNVFQtQhRtzvdA_pEmHjS836n1ZG4F_27zEh0PGzqsSy7F5T_NNTuS4vz1tcqyRRJfv5iJM26-V8z3ycZKapoQLT2z7fiuZ3a_tIesXoTv5kRgXLA9T3WdPHzkV3dhT8tMZG2YizUtXnUdLFWDSZnk-cWNPWmiAF731DRK_yYa10k1OfDyNcJv5qWaIiBtJp8bP4KmK4pBLX6Nl1MWY95hFIw5glA3j4dFZZWmKmrzx4lAmkQtUs1-zE_4wBeQ5F7bHGJ9U73G8yDYAmTai8tkl_LB2Um9nLkKkyrRDq-RoohWiEZ4Qb6bLu4mv0Alybyy_3YvbIngH5jBnbqJusJk1i9JvezdtHVwXFswO5L2YX5j6bj2YHFUvECnJPzASX0KKymydp1von26mbbUWMz3ypr20NBoupaxa93hzcha_sWqq0fUdWOG_X0fi5zHMKE-FWhXMRp9sACJyr3Y5TUcowrU4PJzp3XyvYU55E2ZcMk9UxVe6D9CSfvzv97gaNHpI4FNeSSUAoEVGJ-CmcXbdszDGlGvZTQfDn4inNmgIVj4lJkxaGfWYaOclIdo1ZwDhF0HudjiZnOmUe7iSgiKJYZPkFfrjgK8uMh6omF-obUFyZKcg5gFu2t-mMXktgKZ5ZIsKtlDMOGk3b2CjaCoHyl_l2M1X_aMgEbRFyKxvwZgVPQvjNdHJfHhu2GGNXRJCClS3O-1YUMLdI7Hp6vm9J6tKl6xKQfSPsIurJef7b0ykClLSiXboGeYUvinJqRDa8Q5TAZO1GRK5bz7NWKi2SmUQpAONM92GLfB7cFcvdci_bOiXZ8JvW-P7yQvfTqbFKfXpbun1AiT3-xKg6xqHw-5Z7TXaZN6Qg8GcKPLu2ET2YNn1spqd2n1yvLrMxIIjKd2TATmqGx-w97cBH90lV9FJ4Po1_On__zbF7ABFIl9UjknKr-7TvUtROs_xtfcY7DT3kyRXzzwCBSvW-5c2RYzUHJSpRh2Wrg9CWGjtgG1y-k5x07vySG-rlNIDHSHpn16kx2IiV3BiL6LAHRMBoaUISULCoJVpMlXIL4X7pKjgozhY79Ezpu3KkDQw3BHb7OHOQibpaocgLwTbGIwANt1ZQ_aqy2glrLnMa_vIS6pVILhXv1Xx-G4Xy67M48XtigHvbkNY8CHaOtdZMGIY1HsFiMaS436SwAvIvze8hdchpKnwAVMCABZgCsYDxwCKo7ePOFXU9DHk1zuxNrPeGBYHqzqV-ay1BnYNug2XzWAk-dpWYaIcbwAOVujSm1MPjaeQRAgY3Keo1C8TE1UDF0lb1a5PJ7Foazhah0mNJcUP8M-O4fX5nyAqJHfeXzPj7E5tlL86OBnRMcn1JVb_T3BEw5Rs6xDKQc1JgcmyruCvu2CvIq6qKi1ZSVZ6MwYml4TOSMNiKbDpP4dLFOGJ5xa4FURfUFNF0RwIP9zD5QO_hk8CjDn9DyPywLBeMesQpqaKXcH5NaBs2Q8mw9uBwySzvuwqPh1NmVreXklj4SPrmDr1TCUaEh2QeFhy_b87sdM9drGtO7S0rJfYWl0O-jn1uwmxHv5Ngsz7DFfeoh7Md59Dxl6yIDUqSbxcEDPD1p9v8fwr9Tima6LwCOhgaL5CPSy3uwk49zR1K3JlxQFxWtopfZozBi6bATAzf6zVXoXQhmoMV3trWfgMG-LliU7_fzZc4pUo00a5I4nWVBooiIs15EYmGqV157jN9T--2yo3CWHPc2gGVOLgiWhGIl3t1Cclf4DFCrW6lgqqKQvebhQBOYxhOHoW00ut5OBdQ1U_aPgxSt8n2Z_2W9qNAOIRE926cpeKNMeV9bzzBAhlud2bN8aXkuJ809H3XRlCZKBKXeirUG3oIR7WFxMH4c9xPKD0iNI6xVdx09trMtNgJRmIDjAfu59DoHUp2_TIcQNtDfsqvvo6fW_6A-nkJzlOVfZtAU_pZ42oweTn7ewcB3fp9eC2P3XwhQwTlFLBHDRmjsDQdLyN2W-mGdzcjbcwdFK_2nRv8ZrTninclgZ4mk5jhOAE5A-XJwf7z2VYiaaYUIt3H6SNS5SpcHZjsQRpmzG1h1YN2Xnwj3c9pHIo7uz95i87_rnyBssNt2HMfL2HNJ_cjqOn9NskTUWO-7l5S7DG-yHIRhWuRwxFzeX5WyjzgZ0DlVhF0aP8kub-OwO5c_r1Rztzf2Rg_msnIE4XirdXncUUusNdKM-nCG74nh9n2eIF27lkyN3CfR5n7qPkqZtJr9ICVs1vz9hBfISaxl2u3Ij6M7ZKvW6Zc9XuAUJE4GfXuGbx-hbutAhoXcZYWMrnyfuiBdsNRv0cXfJHIBaYUl7CvehKEjX49AESCRsDwz96ncTO3kHpULrFB0hHUEsmUXcjdSuFFlkzea7_2x6tfSBelOLhuQcn8BSc3sEWj6bpcsI80JHrUh00snKUXSGErYC7k1XKT6RvPbtwM3NSqRPo3LZKJyEUHJqEEALQGzf6ahkEhxMPbErgGD9p5dWwLf8zR1gftpqan86ouGoncpl0NDkWqkLhiPUsR3UVtThTO0OsT11Rlitg4CDhSc9si0mqnsqnKmi58Ls4CjDItGVrHVk4cWePqSZDnEj4JR3kL_a8xhT5SRx-ZRo9fC1_tqv1DJbhoAEqft6zqvu4xI27tMImUb5Gi3QAkvSuLBRe7KsAZ1dKmZcgsmTlPzFc6pZky11HpE5D8B2m0D8QgebLCC0atdKYrwf2aWt8YW1eIquWMnW4xY6Tz-L-l2-RKgWmWTakPt36lXbn-Z9dfAz_Psd2u47MbIlk5TUVw3d_4WWfRwhfmxpBuAkRIAiLbObB1trgRXPJ8CYPmxo9N0Sspc4nqYRbgKRkceH0ucDU8pKaJ_r9uHvdzllyjw9Q7NyzBWEAte9xmCl1vP1Q8R3aF1z6_H130O0D59FQhp2Pihl2YILKClH2Cm4itg31UOW37IJ-HHp73cXiLjp1DVvzG9mWz-hJK7mXuyIHIPlRSGCGAV5v-gug-q7Cp8IqfowXtH61fZSLHObGpMiVrGGjhNXJlIMqn0PDDmPsp50Dw4ouBh3AJKZZybz8cM8radzZuLgNoK48fS4TOLFJCNr8K0ye2uy2kx5SNfethVfDIHOS6jOy-O8Qlwe-cewif0RHpJYjBDaYxjDwYMjbDhPcHmdu4Hct4XvINPLtQPgLjdz7GyVibf7TGKTaD9-zyw2UuVLq02nqSOqbJqHGrPPooh5r5PQFpYF_OZPEREd2RKxM4JmEZgLmnhxjb6CrMlZC-rT95yyy8va1wEX4yzI2tTZLVeM5p7Skg06ylu-OrV-AMr3GO5N_m2Rf3rbJrx7dPkpU2kpz8sBr85JAVf__a5n7oJz81A_VsTV9o2_dun7X-pfCtXPCxHfjBydd48on93j4Lm7NM4XHUri3By3aw_Tz4m9HFFirUfOHYhtIeLxBiVxLbIKhGj-U1rilWIQaK_dYFY0rTEn4YWgOYz55tAtGTSpObVOG6Kmv0ONMhpcLIYE5Y2nJRZDcYc7hNXCvs9zYxkurFX5QKAlhVMNW4HsD9ztUmx6rJhHOYzGJa0i2bDcTTc60-40s7g43JbdoB2iQy8FZzHoxCW5k0AKLDH4VhbHAqCKFkyYb_1UvxORWgc2fNe7rPr7DWcOQbz0BBdZcGibAjkh2wS9DG0K3RE2X7g5NPsncunWM4ncdLTr7u7jWVEICG5hRRaGZSqENP50wm7HR2aQCfEL8D_0OAhN6PMiOxyDuEmvgqoEHMUPAjIeIrz1lJX5R2DPuLWhKfvBzfjwRsttbgBBJn09odQmeUGaSQ36JD4-PKCbGJ6ZrsfM6wpflrbAxAXw4U_qij5mPAk_GxPgsSxdBYEkHJmeVU9c0oqynkBH0OJ3n5pGLCDMAfdFtcVZOPh2hQOCnEmCKZ6inHESFIEnCz8t08BQna0Bx9lzfXZtoG0TQp2ZQyzSiLQPiY1PSx_SBZ9hc3ckggcPkai7qosoS5JW9SACiTounwm-zV4RcVcAEr4Ykcf1diEg6m61mKeZWc6mlkBUFnyCNh68IR4kjidkwoVHWD2QIVRwcr2OMAxqRKnQ3YAobwdVtUsj3Hq9I7B9Z2eNoYYw4hTlRuoPe-NG7WHGmvmNQmEitfneNBK5Nysjh843WSS28Ya5NpS5PVkQ6ZCt7njWGOX0txybH93_QXc6ZfJfrLxCUc-tfA0uTVAkMM_ac8oHuQKdOzebEDBmNJQg5n7T-sbWBU-xiW-1B-WOHG5zbatvPPM3CHaYFmketKMsboSTuQqmp9j_aUnQD8c_vPq88RjOnlPZBw9iLMFwBpYk7tXVVnValkf1qyfz8hGq6xZ0LxagSQGbaD1RUCr8AvF0kuj09ql7-3Qixtt0nD4jFGMzAyR3Q6HsVI3JEOt3EshAKy2VZGxgp8Gypkq8rZVpz9npX270okpCLsDWFt_syMFT3-cU-B9zVwRULC12ehSi_K4pqvRmXN01oY6u8dWc6XakEiLcVb7KO4hOGlt3nzm2GreeX-hExalOfDOkursqXJo01t6mVpb7RL5oAUTmIzEAZyuynVk68i5t86M0iT46Bk_lLoBg_nvZmeS-H1nJQ_4GLMbLU4L_otA13_ronMMq5qKIfONdkS2d-HlVIJotlLzuV0X1RaP5PsxJDvacUA52KVdyK8Ro10n_C84A2AmbYiUuiC3bh6_FSQdqPIloyR_CFTkIUd-ZxKVDMcmSMWYZCdgQ1GUu1CPT0cUEd7pmsxZXc7YpSyjTZGhAiQXMj2rkUJUaUP9KZaws7iN14_g83mo0l7agEDfmy8KW0tGG_-5Z0_u3f5xEvqgMxFZWLZO2zQt-KWUmblHuSMyJwdr0bQU6yMnX4iNEh1t8qs7KZjSJjybELxdqmmwMRd4QXbbrEdIUkcdsQBB-VjMq6v3DrYlTewbI3ueceWhnItMW54mWcNkqEuej4FemzIGKcS6Je9qLxYoKebEIII8zoLhLn0jOZg0ehfldSWFHwnVNXk_q9DqoQ9isAkT1ASJmtqLh-WpMpFydfQGfejuD_r9SJBlAmI9klMPw4WgvJ4W0VxDhH45tJjpHFWoM4HRn2QVBbz_GUM5mFYeFNa9bSXx03vOb1O-nFJp-7td6Qvw1b-ms6EbapSFt7zIMeivmS-W7koQABD-iDAq2h-MQ-3elhjxLq992Ls6iNrIaVxqB7SAOKAvUuY-RlXE4TyvNpgfSlarfOzaupo_6z9XVjmqySSolClhE8OoFfxj7w901XXBoh4EWgPwP-iT1TTjBgBg1HWq7q41wAy6CrVc_iGlmEbJVCLSFtQo66prr6MsdrYQlclIVrSrEAmkUUINNt_mw2WqQRtT0l71MouMgGOPXXSxVTqzpIa32WUpQX8XOEMgwTgDGRVuKpk1PjBPqhVzsOcm2HqW6eSPYH-w_JCkP2twT_gBqjYn8cJ-IaUrnz-pu6bjrFRqcr35MIs_dOK5Z5hvPl1mzeJNr56aVneJBgg_Nh6BarQJUq8UVU0FjguxPhKniHlrEJnGgfDAAszaB7_u3vuF6ze6kO3DfFSxNtUIeTnppiY2T-C7TQRg8bcvD7CbotHc4EicIOsFtl48nl1rLK5WFPhwsBatEHHkzxmaN2YDNkRVgzMeORWxj-g1KY3ppOQppFv8aG5TpVNk2taAGRv_kbEpUtbUmIf7JXE5azBKMIC2KwFuipJpiwtM47mSYqdIVnHCHUq6-M3wFDGPfE6nKFxATfWm45i4Z6orB7lp9mzvmMgtoigJ2Cz1lQD9GkYDi9U6ma3vWOz2YsAQnshTbFwe6qu-d_uVjKYE59MhVXC82EdZbUEZcWk9NXqmAJd7GATwfqh2CxiHWQloq5mlKaTsC8rAMbKdgjO1Uu0TZYXRfhy4EzYMElcdGNlcSXtKiWE9IchxhlqEXCECsv3YgvSGBURZgdru1nJppUC2VufXo01L_9fTFLMpaXwleFbInCL1paFx-eg4W0ZzAIudP6RHeWxumwDwHUALg7NhALpjDawMs-OlbeSLT50g8hAdspL0a3dtEhEWnBtSGNk8X91cfkNWTfItiBVcRM5hfS5rLheDLPsxLzyRfDSFV8HUBrZ2aOk2yJPJJ3hl-Dix-vP0wqMMJGJkNvVpZvtN2soSW1JvRHrQ9-LDyQ1GT-Ae42RivT9ZE9XU4QA3LmfsWHr1AL8UhJmeApPMnTC0eimvT9mPCu_8Bq9rd5b5BY57SRKBFekLzW56SRIvlMtVTC_uaYVGIjTFRMsUJo_HDaAnTLXftIaxMhCh2F55yqIm4KMmAzaHo9Ln1gcwfLYsmEjLALADfxxKipwwNqGirWssZOPkiYJ258oJ7z4a3iFlVW9yOTxCzn-_IxTsuFleRlmZnig9aIwggXqVbjngTceucX1o626UtC5J0iWH3ZoeBn40SlzTHmVOUsKodKlqZZp8qfKTMAvSdX_V7lOvRzIMckOMhYeZJutM2S3Y1nBpI4EuA-1IwMjl3cj5tiPAY9sOme9xtVQswOnG_ezZXWeCFjnUPRRKPt95mib6R1MT7eLieLi99OcuWuQAL-5_3lD1L5KJYHUctTS1IssoNgwo32enXlgQyyqPwAu_DNDXMULcYkRCra5jBmXigfXeoL9U_wAM2sY33bDH8dOzz_imEjQd6TBNOPmlJOsgNRbFic4SUKK15pp6R9JunRPxzoOTsqVbWh3GtmcAd9aUHuj_-Ense9jMIvRWMZ1YGptcrazN1EDGhxgzgcvHdmAajmEVraAcPGBydsvftqxNZ5vmWWl3hpZDy5fZppPvRYVKuZ8rIzueuuXMFYMo9a30BYI2DfgZeHowSmj10pFWE7SfQCrQTLdokrYo2yHRQbnmCfEdZ8yJPOLRexhyjqWgOgw1FBsuZg4oyyahGwd0NG6QccN8IlQOj0FDD81kKEcxfnMGo7HM2uBFBTQc-pwuPcrF2K0UlpzC8ZNvMsgA3RkdSbbg5-eino5BoM1j3GDTtHIFNvoixtXNJstoJT92frluXbfgBCcF-t6r7u9CcBKLV04SfHxrHt2gbVo4yHscNjSUv_DdlorOa7SA3eeyFa196e5hgWGkfgq1TH5TsANH3dokKXrDDRzceEq0Uqr7lz6qdN9aw5GI0pbAzYiq4C8k_DjGwRSWtfSxXGXHFxICVIC7Pldm2g-pMr6lXpRfFmOIRGOgZ5_B2SfvcGFZW5E1la_hearCVNMbQ2EfWGoAMHYoE9cETYTYpwYIZhv7RrjPyYQVmSUL5bnS96f0BsMqN5hh5OAmYBDlFJiYzFcj1McZUQ1zmS7PyfTjzRbvdzOJ0c4YgcSo2LmVTMi6ua2_jgkIDxq0GUnIJUZ-DmAlh1lRPjJDb_PjOF_VKolwCjLc66eYUg11zvtrovS6GD0tEZigP5TyI5xFjE7THBG6wv38uBHWdP6Djdl4TdAosR83DU67ZSOlOmwqkbqmF5OiNFEG5FV4_CeSvI-oU2_7Iy6bIMPGp5yWJ_FpdpFEMmnopYj4CVJ7JjU_n2FxApqGADC6iKnIMPjm9QRVDcsEZpIVHC3YSEcikyeE0dIMlmBT0oP4utdjMchlxQpYQ6QSoVFyM5qxPiqbVltKtzKZ4QpbOzNxo-vWw8R3pcxJpWS7qikpMQJq90uCTl2tK8k5igqnI1miSNxDlm4tuxRlbFixIt_7oF2z_OeAzbYGWdARKZFFT2Sf1Dx6MtcpHVjqbPJamOLD2qYG6PV6USGVwZkqI7rWLWMj8UOmV9FGziHwqZl8WJWyx6FKyMOCzp1G5dvVD6HSdv_54BDkQIFMnLw2pspS5fmwKeSoYSN8NLBiE3Q1PUuec93aNtRqI9JdtSTvYGdpWpuh4Ml8gePYij9LkiAQn1VXctSxsrWjQ7xLTCExWLQNLETu0CnhuaDXAtocTplVusRumukaJLZt8T3VMhMlRbCASgPrHEIfHfaq84IwVxFtqxTwOgzdwg_akrfo1O0KTzr29rbMm4_z-PiG6otij-mD550-EopgSAyh4BDhSskg1Rrj2R6dAPaVDgBdzKqH0xtjwLplmwUxnQauy45-XfWAxcRn4H0v2O7n3vVf2wL8znjhw3VgC5Xct6soBCV7_Qym1P7V9at4IXDNJYTRRQ2lFgXUK4JS7LlexNh7eRWp_JEUYt4bPaJImKDjpDlG57A5pm1fEempnniHrwbNOIetmrs4bUGIMR9iyopk5EM8e4GS7ED0qyvbaWu-cqfhYcQvykBkE8fdGLQPtt2JgJdjpRqHfP4Rpt8aupLXRtlmWFknpxKAvKkv5V8u19mXfqN_9ux655g2diBHTpDoOqPZovBmn2Qkgdf2KPv9s9yvQ_pumbZAERvnmLuK0zOl9XltNSzTykzz7id3PlxpPWD-dm4wZIAlFgJ5mMRv7HQrS779Do_Z0FSztH5VysPhFIxXs8Y20eoMR7gxTf0qzMoFpoEgum_nJ11LtBFjbzePQRP2AVbUeNYBIo214SyHAOAnu6usimILp0NBRoJnObv4OEAVXWgJgeSgDHtu3j84711DU0OBGVZDTfRpceNOJRKeKfi-Z4udmwM8FpN1tC5SEZEvS5ZH36QZlwanKTI1THxaMkihs5T8755DAdTKLAFcnoTb2tiR5Xro6RV7I2RuVXO0Z8jo2Bmdu7eD7-m2DO0An6_T9R9Aj_6BfJGi72m5JC5k_hvsw01FPTf6JpH1-G80rg7Xawy1_eOCMbUqmGIpL6hl6yn_tDNlBgDsH5Zy_hxDAvnw8YQXvEssPZllrIx2_v4Xq6NfRGoL6iy3pG5FMzksS697ijVUQ3DmJ_y9limewAY_4e2_QCX1vUFUwuL09iuo5ZkIsYU5v9E8FrFyk1BFV4EG5gampitGN2Qy5V-WcZD2iIUE1famNWlKMilJugIXNFtGWRcqRZoFcbnMDkCJR225UW4fIXPAzptjk6COo3t0iwzs0UgUdlDkIXC0xH77KxZDAa4FTORAMAMtkGOHEqfnUUawwF3Yuqb7jvvBP4lr6nHoSfZAB5pBSiyOFSjoWkFsvQHesWrJ9rUsxvgNTNGPYiyhDinlen7yxR12jTdaEpWdp6h7RA0d7XBQDUuZOIMWOMcAk5Bghh5ZyUKc9sZnOyj8H3T3gQ0xvXXkPsLJpU3T2XAcRPKUDZNCqvGTd-50LrrOI_N8Nej_2RiwsqGysc6h26GaV3bmc1M5caR06vOYamTjq0UTAhdqUIT0P-gV9h4I2KKrjt38Q-j1v5Zemz_aRU4QNP9nAdQrUAnuftw3JjbwJHQbAzbYYNefn_4YC5o6ERp6iofQzx-tjy58tlkRousuFp6g6FTrn1ybn-4VflfWJo4j1U_BPY4mCutP5c0cT0f1OFk_3pTpKNq6iaIFxTOgrZZIb0EAddxwtpWlsiR3mwqQwmLraOqBI3zXB7iJPziCc3i9r2rGBXf8N77DseFWGHlneLTzBhDmpUj0R9BUAG5sPtkhVkgZfF6umwDL4thbrLKkG7VGWQmF8YASIPYAmPvx1PAYJZ8IpslKqizp4RrV3Fn1PtyBHtLwTC9nH1WNwSl155OVlz8Y1iMihxOgHr-kyeyTir_cH7tQyPes5x8BUWculzFU5fqfIjkI-2Ps1Y42x_hEoasJa_aZPRoqWHm-9PrAJN70xfVknFyz8Dh8q_gbJdK7z86-cuesei0zWbUqR8be9x4tP4G5iMcYbTTWGbdKyJ079xRg5cO3qvT0j_I7rz6eA8nP5fuUv8cnVUdImy2LnusOnCPzeuhFtd4GnqEK_lnLZO8GiDkpxwUrVxYl-kPjTBT6xfOv2p0q8m3u8OxNcgLbj2-yF2U6adrlzaJUnqZB8YmVxZTsrVwWays-hVPYElqcf6lnb1FK82vw54L1UoITKNUMK8ud3FqwP_geHJPJcQnIYfjEpaKC9SN_itmzvpafSuiy725SVDOQXCmLsMikH3VQsGr_4TE38oGyr5PDVAPGyFnjObXga9lmxJ6D95twqS0sZaSyKtP5PLvA4eN8k4WB08nXmomQSfPp3KadS7Vu5FJXKn5vJOUmvrobA7eT5Cy13m-U_h_w1eQZ-U9ZIDB8cjRyzTpxVRDOhCbBOMGOO7BYx61Dm75SZv5ZgpMW1YWJTrBbeMrMgsdXeIbWg-qPcHetsVb8qZy_9LhYhIyVSBA9TIlL-OJk_hBENnoABuOXra3dIgHcELDO1VXAtGndufv8w9kBgBDA5rox1P8OgJ6XdQAS6RlxjuG1-ZyM8gGOLh12IWWZ1gIxbdsKxQYEaR4RvcKijUYLyraHEz1Yz4wiQMDRDI1hIYpEo1ayshRR7aqXlx0tnAZxdoDjz3L1x4_rDsdXVKMoDp8n8Vp63Rwan-8EeRYCy7LZa0Hd09rDEzUhoAB_whxLVx16wUeWcRXIFtwnKtXbn2vOkCKyRyWSHZE0W-Ycvk05cOovnTpcapumPr3s7GiDtPrzyxnVwRi5A7IEU02O3iMLjXFg-G57pzIvy5_eYPzMccZ3WrWCgRqL5aBc57DRgOklkFqpJUdxpuGFHrmSH-wKrBPCZCmqJ4pIyQf3kUPLof6eaflz3eeX7GqXTmpTxJhHOKiNN93NxBSiPGpPIujeAe2OkqOYsZZSCDYvmEu-Acnm8VrJfiZkwhCfY4IGreoHT-CrvpjnfvU8xcNmuwdi4ll5qqAnq2rd45XmWWAO_bCAYImN1rbZIQAIim9X28L8oErAeGicZpAx0DNml9fiooLTZq6obY7xmYXjrx4UKtrHP2zCHWA8v89tEcs5nNC-3uz_RlunZh05I-FAxEAvrZ1sc-fJFqB5xpudbxbv-UzdkpfyoPVo2TrQ2QY3AV6Di3bc2Uko0Z4OuMtZ6_8DDqKzO9zobHfd4HZSToduz1arZJ3WLdZcGrRpafbNxMsiaQbaoWERL2XyplFIcP08gMB33JjGociXZ3rG2HHUhbbzZGq2fnw9QbXO2aieq-eka9z5n8J1UqAQl_aV6sLl9oIjpTDxIKW96m0GUjmOdlR6raPXZ7QqizBo43SF2FSK0as8qQIDOOkOoC9_ms8OiIzAQYMk8_Psed9iwjNrW1j4hv9ARAoItNfaSOSccmk8h0wnzGMsu_1yYhsKgY7FtrVNZO5t_cAkDq-bCoSCe-xlMZFEgMNlwkV1-G7HeSjHVE01rhQ8HrxiZmkaggcVvto5EQ5sZHmp1Ab0avueAdXzAxh6-8RXL9fJT6X7w54nKEqBKR7VFROjDKn9hDhjDFuw0wCbx380LtBiLnDsdS-t6yOOmenfHEEmqOnBGjv-ORugiX9MZtfQ8N2hxQiWP1RnVYuXd9l4zlndKWgfaTOthbWCUqqHUu0e3-i9q9Bc9uBGXGN7ZAagIjlA_8VFciwcIeN7Ai1m-nHTcksqw0wQezfRZ1sHr8kLlGpb162rLpHUw-yVnwb9SmqvyBy5w_AaXBVG3r2uh1Fvw8MP0FpLpvHUgYmtm23AByg4IUdI8Vup1bwNcWObXVyOUMBRfyadA7SVrZSfQMF21n4e39nUV9vX7Wa3H2R7e2d7wowcs2doMNix0P4kuWn9zARCGF27oGP5prS4tusy86VEwT0YwS42NwiVZ4ngHPo4PnQdMrW0f7Qf8YW2ELoHQZ-5sE7mvwVHGV3Uedd2BOpioCycS9OwE-Bh6W6EbtePTtiOZirtQ2ZuWk7LGG26iDGZGKU5toqbsxpSENg-1O3GYKsWuhKo2jb5fB4MLXGlNp0Qf0Tf9htTLhPWT-B0m6So_IakdunxdpTxGb1yI4ck62Z5q7BW7xruAtGHWeR68WbptuejlLN3qcEqb-Kgsx0DrCEciA2UnbMGHjHQuZrEaJNh8iswHnlsMdGel9kW3GtJuvOfbqe0vHy4mmdZL8-a83m3I2Y0k6Ye8cyLKj-7l5-BaoaBMXiUcIac1PVhH8zihrQ_eXMF_IhP8VMosm0FSar0RtxrshiEBSyvrMU9lPtNAppUsl3BFhxRzlt5gYHgiqxGa852D6MDDuL6ZRHJhbgAIFX2GIaKEqXQY7Jq3zpRQ0JTW4fDpqmbD3GK3UBOO45hZexsCwSqxQyOPHoFz0XoZEaUDEPFtzaFPoZeZPlspWB8XmWU1TFyHCaSOD105LA4RsPFi9gmMezFOKdW9JMOapGNXT3FeASYtncY6hDAf0qv4YBR_KEy2Cqrp1hP-8Yv4bn2ID6oehQZmyhvRmxASaAT_Aa1b8BvGFOeSbXght6XRC8itz0fBoHTXknufqawZe1-2G6lvmr9uTnIL2AvR0Y59Vk7qD71aTOofZSO3AAPljJmLKmKzKJ1E5Rfy1yLkaTl3f0QjBKa8zkECNBGbd6JIcPuhw5eotJfPhFrYqiiWvhjyk9J1NBlb4ufmGn1tRqf3SRKMnHkYXdDoGTpKSYu2m-WP7oi10TozEN3l_ZeusStOYr8fxg6Xfyo9Tiy5QdVtnkheGzcm2oHCz37FHbH5bRevn-OLlZDCbkORN2cbkfQZnbNzKoI66KcxteRKc5sAeTq1qU7Le3-Gmq8jfMeRYSQJ6oxRm3EgPdC_RjnmxYBxo64TEJDql4N_HTI9ld8ogbLSVhIENhBNnAr6wNR-fBQXXCvWWJtHnI7uwE1-FdbNT-wbWqYg7W4Q9E99--yCEMllCRC7X3lTMI4kkMwxtPWP3ShSWL1Jp2x_nIRR-aLW6UWUSMj8LS9OMlm6oneC-DLU4kApSi583alkm5ApGw_2xBhdG4RdUS4CyrYyZjeZaMWqPDC2vXPZGrkHEBwnDgYQCSACkwXY6oWs8YZxXheYhdwnWbSeF2eVPvVuIPZt5WCDjxUYYDJMA8iwsP74LQBnqY_O-9Mw-P_HcKF6CTSn61T9OkQ1IzpVBkqpuWB6JpC7lX54vQIsRx-u_tomj5Zbf2BK9JmXUzJ1dvp0-7GBv_2fELMJdhwv_54KOzD0c_MkG8PGwOmGrYTkdqHs8HSGJIjrgHT1PYRxZ1fHtW28UnozvYz5hVwvkDYDfny7c1ppvT_mZ3LvcDiMTvIU1abIdaIePUgr1g3z0AlONbzSdu826Lo6MGR0XoSJSedGQO-qGctzhddGrNdRP5n-0UD0xCSYmru4DWvjrwfDGrtucAf0vQiJ-oHJxaRdVIxky4RP0bs4aD23N5I7t7BYML0E_aCQcbRRV3_BEb7wTm-My1NihzAVqnZkMlpcBIRnxyP_mkDzouXLnVrS3cZt9Drxcf3Uo04ZYb9LCYLf1-JsA0_OlkdVT2XgioZBpoH_YCRTsTxRx-jTB4e4gxX2SaS3iqigWqnISQoWjxbUuHyXvhq5cTU2By31eEcTMqzwUG8ULX2NWdFjJPWox7dhyGRrkoXHWiCpFDdLNpA5i_FRdgGwy_ZM-hZs11Yl9LlSLWPsQQQeqSgiG0bKcPWJqWh0f7oIrjr7iNX5Q1yxP1Urg_08D_1F2E-W485ux3OEQxhkD7pi0JE7b1yWFvRtQ0MJ9nDT83x8HuTQ-aDRAQW8FtxU9lh8DF-4nd5jl4lBV33SIXoB-0GyoE9J57Oh66HcQLlKK2NDAFECWCFU4Oy0pQNp7AHneGQLOKwmlKMU6AQ8rug0DO2qnKgZonnJk55DWd6ej8ysQRRjYKrucQeG29ElTxzXNuaGC7HcA6bYSAJmuwHaj40NchmcCW8hjaJY-NWBUmLBq3NnVW51lKBDs_X7qglqS1dkpDEv5z6cGpIs0JHbC8h4VazjRH4I-4TMrrBVCJbKbjYDV-zMgm7NjeQm7mmZvTJN_VHTGC-u3VO23lePbPUzY17_WEHDSa4IIH_-KhBBj2EYWck-Q2R-8OHf1GxjpIphXdLbbBpGKdGZNowu2t9s7UbOVcuMRtVzM_ciTdq-CoMftL4sd110j7eM_36p8e_Btqw5nSM5bwj8nZxHIm-u1yVYjE9aPzLdZ-xA3VZ0UyqMRmpzz8rX8yqOPuSZkOLUzj7OQDZp9US8e0zwEKGrJnq2YsmpFgqq00ZmGispq1VBB4kFuiuUcn65iymzeCk6yLyN1-Xh0jZ4FkYb0VdnuVJUjT9CVUcj4F2vprOAzCHZueOeqo5QC0t4WdbHOOQj2Kd8aHbLXKMIy9UdesO2CCYhduKViHGqBRGM3x7qel7AHfRZkJwjS1CzYYwqrrPa2imI-cUr9lIcKQDXE4tfiRbB03AOPsK6M4RhCLzQjqDL8IE9rshfN7SLgq4AZrADNstC9dqI7E01EbQze4NKupO6PT2SAW3ii7sw7cLfcPNu1hhvLpJ1wuiNtdOEUGF6qgT1D38dd9N3v3AA45NAM9RUCUhQ53IUOUAV8iHeRtGqbrwSMQBUru4C3drCxh8CS8ZnVuEqpYq0ODCxzh6akNpzplLAdbCCfEZNPWxIDksBrIBfvWGGUq800K2CxoQ1aj1qoS6y8KS-Nv-lH8z5UYdv1Vp_8fcyDs5N0qdWo5x6ByZ-kIdzNDph6TupKpodKTvJiuwdKU4NJRUzFDjN_VyjPxpovLQyZoM7codUnbFOTwek57xfnl9FDN6gOSg6RJ1BsOdxUZdjmwsV2TXPM6MxsD7DK0ceB4IjMt0CYc7BV7TQbMOFO99e3mOg53dexz2ius2HCaLi6zueo-Cf7TvnEUwRZyxB9zHDZ02SrLwo-Ha8Axd7weoZPx4-SGhcP09qfeTrEPy--XcUB74AMIkjPKJt1-O_AtAogJjMepHUyuhXrgNQ7enC3yescOr0mU8GiKJK9h6yPPJ0AdL07sS3dH1Qy67U5Vbn438OWXVXn8-wnS56rWm6NEw9d2X7n4TKbyxz9A-7h3fRJmd3TFMDVMbW_bDPIAN8jpKI7FOHsaLBMe9bRY-SYS3YEk4q3rcQxvBzmUkAutZqiIUgjctcniS9obahDVkCSoLv8qMMwfpeLkyF5JZJmqrlkQLGkzucTcArfGwt7bPzlhwgCrPel5EV73dIidjuocHH9UfSZSYZBJFQS4yRN8YxpHgn-hGeB9pfvgYw2lUiKYHkTXLbnbU-oPC3iTV3ofi1c_DoaIfINp5KjkLN3PtrDI3ROZNIgdFnXtHx70W0RFH81c2QuB1uiaGfhDe5mboUivU0r6TSWGLARsnhuenp7vfGDMWy8Hze_ay9IULpk7aoSnrN2_lR1_chK74EcqCqgJvZPLjJSKAHiO-pkAPlFakGnD72Fw5jHQoKHnRF_RRRpV-MJN5-mV2zKgBYPpkyZqNyJEMzftIYWyojpnWiUDAboOsq2vi_RxAu9hxFiTI3ao82NwTPOMdTJXao21_bth63PAEewY3aqlBa-ARsj1DYdrdDf7y6IJKYTUQ8UXdFj-DWQ9EpJPvTxoAhuITcbgsAQJbk6gBZ-qUKpQLRkGAyS7xwJx8KFt7rk1dC-_34oxSvHBDjJglAbqsx80TBMlwrEjrgyTjoaZ5JI_2FH4EqaYmN-BxQLig4Rn9WblTchXHaOinyVo4AlZ2yGSmJzV9pp2tbMki2v0A8ILP2gg1QT9FnDswfGBRbTkqOb6yRt4G3ZqD324nwRHbxlMgIu7AGXCuH3TMBQA4MhuhXmY9hqSNdH6APnzQNuJbLCppVzcboPt5nZHOXcbRBx3sUJihv5HaOOfRk6cj3Q7aiJk3ziHDi-UBHBmWIlhaa9xzS81NJ6ezz-PT3Cyd5u2N30Imqsvph69CiVINks7OAI27mB_cwhqmsy0Izih5BnSrCJXX5Z_KjM8_kZcJCtRILApS7nRqTGbuGX0o4_xv1lKlaUIWKFGiNhse4lt96sfISOkG4FNPtdLVbhhyNWaTWUowQRnzyxCJG5OZ2xOmDj4hPwhkxk13pIRn4gl76mbw-IWgDKdObuouPvnMHfdvSF23z_RqTliuWc3reH1ve7uvgg6yZYQOUiOnwq3M80bVGo8Nm-Io7Vg6vTWlmbRRCI0_cQcpCEOTCKxM7Px-mt4CzAjrgdE4k8kw5JLQRcHwR1OCYtDSNrPoGesiq9oXMjjpGcdFjko6PeAg7oeu7cNuCxdoaLknlWrc67oTFY-stkl5yWW6paFdY4YtcxqWkSNUCQY0ly-ClZYWLT1jR58ix5CdXG7LrCo_0VGKXY2x1iJU6oCwkSCF5qyopaQtGB4o-rjYNWHkBKBIG59TNloiF9kZA4BOLMCIaWtpOIfGmr25MaWAWoKdGIvblrQfNKncp0tmhcDj3PNY6Cis8j_oqVF2R28xmbFfNuqd_SlIYxEqXPY472CMN_6VyBP5ZaZjmWQqyWVXLTUQlXTPaCFIhTlBVAWmZ3rpmCQb2U44yyQdPQyk1JMW60oYFJ_G5G7yP6PaEE0rESdso0_M4_wFSIVZZFHOo4-L6P_IHNpoqnYzT7Qjs701izcsA682GXkPkS0LfqCc2o70KDKMWPUSqh6A1In_02rDEvI77e1uOgeU1qRwJAPRAWEJYvqu1oJM153kyVhuTrMLOcxlWaFa_xO1s63KajoOR_zlyIHqfWx8qvrYLoaQ9UlkXAgdncqYsE-Ub4IFaWCjILyO74pULlAko1SaCCBmBWecB_QE3p4UDUsAg27m0H4HjDiojvDXhaQ32TLikPBwnRnpRLTkLLRjbb9oUzvITIUPCoHqzGEatRy0Zi4Z_jgozpQ5yBg-Z64FqiZ8Fq7icxPWLXwVzuJ0zAMwc86RnOFSqGLTGZVmagAeho_ZOtk_v4czYNK2bJZnjAujIvmqhEXTyv6bZDTJ8jP6bTZqLpYPOKjyyJzNKZM1sUl2dq6vcAVbZ6Xmzz9ci_8SX-8MaEjLdwA"
    },
    debug: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,E,I,A,x,N,O,C,j,$,_=\"@info\",M=\"@consent\",U=\"_tail:\",F=U+\"state\",q=U+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},V=e=>{var t={initialized:!0,then:J(()=>(t.initialized=!0,ts(e)))};return t},J=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eE=e=>e instanceof Map,eI=e=>e instanceof Set,eA=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),e$=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):e$(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),e_=(e,t)=>t&&!ev(e)?[...e]:e,eM=(e,t,r,n)=>e$(e,t,r,n),eU=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?e$(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(e$(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eM(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...eM(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(eU(e,t,r,n,a,i)),eR=(...e)=>{var t;return eJ(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eV=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of e$(e,t,r,n))null!=i&&(a=i);return a}},eJ=eV,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of eM(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eJ(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eJ(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eV(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>e_(e$(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eV(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eE(e)?e=>e:eI(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eV(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eV(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eV(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eJ(t,t=>eJ(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eJ(r,r=>ev(r)?e(t,r[0],r[1]):eJ(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eI(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eE(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eJ(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tE=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tI=(e,t,r)=>null==e?G:ev(t)?null==(t=t[0])?G:t+\" \"+tI(e,t,r):null==t?G:1===t?e:r??e+\"s\",tA=!0,tx=(e,t,r)=>r?(tA&&tu(r,\"\\x1b[\",t,\"m\"),ev(e)?tu(r,...e):tu(r,e),tA&&tu(r,\"\\x1b[m\"),r):tx(e,t,[]).join(\"\"),tN=(e,t=\"'\")=>null==e?G:t+e+t,tO=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tC=(e,t,r)=>null==e?G:eS(t)?tE(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tE(eF(e,e=>!1===e?G:e),t??\"\"),tj=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eA(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eA(o/l+100*s/o),readTime:eA(o/238*6e4),boundaries:f}},t$=e=>(e=Math.log2(e))===(0|e),t_=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&t$(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&t$(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tE(eF(eh(e),e=>tN(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tM=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tU=Symbol(),tF=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tq=(e,t=!0,r)=>null==e?G:tW(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:tP(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),tP=(e,t,r=!0)=>tR(e,\"&\",t,r),tR=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tF(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tU]=a),i},tz=(e,t)=>t&&null!=e?t.test(e):G,tD=(e,t,r)=>tW(e,t,r,!0),tW=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tW(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tB=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tV=/\\z./g,tJ=(e,t)=>(t=tC(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tV,tL={},tK=e=>e instanceof RegExp,tG=(e,t=[\",\",\" \"])=>tK(e)?e:ev(e)?tJ(eF(e,e=>tG(e,t)?.source)):ea(e)?e?/./g:tV:ef(e)?tL[e]??=tW(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tJ(eF(tH(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tC(t,tB)}]`)),e=>e&&`^${tC(tH(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tB(tX(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tH=(e,t)=>e?.split(t)??e,tX=(e,t,r)=>e?.replace(t,r)??e,tY=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tZ=5e3,tQ=()=>()=>P(\"Not initialized.\"),t0=window,t1=document,t2=t1.body,t4=(e,t)=>!!e?.matches(t);((e=!0)=>tA=e)(!!t0.chrome);var t6=H,t5=(e,t,r=(e,t)=>t>=t6)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==t1&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t3=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>np(e),Z);case\"e\":return W(()=>ng?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t3(e,t[0])):void 0}},t8=(e,t,r)=>t3(e?.getAttribute(t),r),t9=(e,t,r)=>t5(e,(e,n)=>n(t8(e,t,r))),t7=(e,t)=>t8(e,t)?.trim()?.toLowerCase(),re=e=>e?.getAttributeNames(),rt=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,rr=e=>null!=e?e.tagName:null,rn=()=>({x:(r=ra(X)).x/(t2.offsetWidth-window.innerWidth)||0,y:r.y/(t2.offsetHeight-window.innerHeight)||0}),ra=e=>({x:eA(scrollX,e),y:eA(scrollY,e)}),ri=(e,t)=>tX(e,/#.*$/,\"\")===tX(t,/#.*$/,\"\"),ro=(e,t,r=Y)=>(n=rs(e,t))&&K({xpx:n.x,ypx:n.y,x:eA(n.x/t2.offsetWidth,4),y:eA(n.y/t2.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),rs=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=rl(e),{x:a,y:i}):void 0,rl=e=>e?(o=e.getBoundingClientRect(),r=ra(X),{x:eA(o.left+r.x),y:eA(o.top+r.y),width:eA(o.width),height:eA(o.height)}):void 0,ru=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eJ(t,t=>e.addEventListener(t,r,n)),r=>eJ(t,t=>e.removeEventListener(t,r,n)))),rc=e=>{var{host:t,scheme:r,port:n}=tq(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rf=()=>({...r=ra(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:t2.offsetWidth,totalHeight:t2.offsetHeight});(I=s||(s={}))[I.Anonymous=0]=\"Anonymous\",I[I.Indirect=1]=\"Indirect\",I[I.Direct=2]=\"Direct\",I[I.Sensitive=3]=\"Sensitive\";var rd=t_(s,!1,\"data classification\"),rv=(e,t)=>rd.parse(e?.classification??e?.level)===rd.parse(t?.classification??t?.level)&&rh.parse(e?.purposes??e?.purposes)===rh.parse(t?.purposes??t?.purposes),rp=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rd.parse(e.classification??e.level??t?.classification??0),purposes:rh.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(A=l||(l={}))[A.None=0]=\"None\",A[A.Necessary=1]=\"Necessary\",A[A.Functionality=2]=\"Functionality\",A[A.Performance=4]=\"Performance\",A[A.Targeting=8]=\"Targeting\",A[A.Security=16]=\"Security\",A[A.Infrastructure=32]=\"Infrastructure\",A[A.Any_Anonymous=49]=\"Any_Anonymous\",A[A.Any=63]=\"Any\",A[A.Server=2048]=\"Server\",A[A.Server_Write=4096]=\"Server_Write\";var rh=t_(l,!0,\"data purpose\",2111),rg=t_(l,!1,\"data purpose\",0),rm=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),ry=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rb=t_(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rw=e=>`'${e.key}' in ${rb.format(e.scope)} scope`,rk={scope:rb,purpose:rg,purposes:rh,classification:rd};tM(rk);var rS=e=>e?.filter(ee).sort((e,t)=>e.scope===t.scope?e.key.localeCompare(t.key,\"en\"):e.scope-t.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",t_(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",t_(d,!1,\"variable set status\");var rT=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rx)=>V(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rI)),values:o(e=>eF(e,e=>rI(e)?.value)),push:()=>(i=e=>(r?.(eF(rE(e))),e),s),value:o(e=>rI(e[0])?.value),variable:o(e=>rI(e[0])),result:o(e=>e[0])};return s},rE=e=>e?.map(e=>e?.status<400?e:G),rI=e=>rA(e)?e.current??e:G,rA=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rx=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rw(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rN=e=>rx(e,G,!0),rO=e=>e&&\"string\"==typeof e.type,rC=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rj=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,r$=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),r_=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eJ(e,e=>r_(e,t,r)):ef(e)?tW(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rj(n)+\"::\":\"\")+t+rj(a),value:rj(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),r$(r,u)}):r$(r,e),r},rM=new WeakMap,rU=e=>rM.get(e),rF=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rq=(e,t,r,n,a,i)=>t?.[1]&&eJ(re(e),o=>t[0][o]??=(i=X,ef(n=eJ(t[1],([t,r,n],a)=>tz(o,t)&&(i=void 0,!r||t4(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&r_(a,tX(n,/\\-/g,\":\"),r),i)),rP=()=>{},rR=(e,t)=>{if(h===(h=rL.tags))return rP(e,t);var r=e=>e?tK(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tG(e.match),e.selector,e.prefix]:[tG(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rP=(e,t)=>rq(e,n,t))(e,t)},rz=(e,t)=>tC(eR(rt(e,rF(t,Y)),rt(e,rF(\"base-\"+t,Y))),\" \"),rD={},rW=(e,t,r=rz(e,\"attributes\"))=>{r&&rq(e,rD[r]??=[{},tD(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tG(r||n),,t])],t),r_(rz(e,\"tags\"),void 0,t)},rB=(e,t,r=X,n)=>(r?t5(e,(e,r)=>r(rB(e,t,X)),eS(r)?r:void 0):tC(eR(t8(e,rF(t)),rt(e,rF(t,Y))),\" \"))??(n&&(g=rU(e))&&n(g))??null,rV=(e,t,r=X,n)=>\"\"===(m=rB(e,t,r,n))||(null==m?m:ei(m)),rJ=(e,t,r,n)=>e?(rW(e,n??=new Map),t5(e,e=>{rR(e,n),r_(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rL={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rK=[],rG=[],rH=(e,t=0)=>e.charCodeAt(t),rX=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rK[rG[t]=e.charCodeAt(0)]=t);var rY=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rG[(16515072&t)>>18],rG[(258048&t)>>12],rG[(4032&t)>>6],rG[63&t]);return a.length+=n-r,rX(a)},rZ=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rK[rH(e,r++)]<<2|(t=rK[rH(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rK[rH(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rK[rH(e,r++)]));return i},rQ={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},r0=(e=256)=>e*Math.random()|0,r1=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(r0()));for(r=0,i[n++]=g(f^16*r0(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=r0();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rQ[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},r2={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(r2);var{deserialize:r4,serialize:r6}=(C=r2.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r5=\"$ref\",r3=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r8=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r3(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r5]||(e[r5]=o,l(()=>delete e[r5])),{[r5]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r6(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r9=e=>{var t,r,n=e=>eg(e)?e[r5]&&(r=(t??=[])[e[r5]])?r:(e[r5]&&(t[e[r5]]=e,delete e[r5]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>r4(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},r7=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r8(e,!1,r))):r8(e,!0,r),n);if(t)return[e=>r8(e,!1,r),e=>null==e?G:W(()=>r9(e),G),(e,t)=>n(e,t)];var[a,i,o]=r1(e);return[(e,t)=>(t?Q:rY)(a(r8(e,!0,r))),e=>null!=e?r9(i(e instanceof Uint8Array?e:rZ(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r7();var[ne,nt]=r7(null,{json:!0,prettify:!0}),nr=tH(\"\"+t1.currentScript.src,\"#\"),nn=tH(\"\"+(nr[1]||\"\"),\";\"),na=nr[0],ni=nn[1]||tq(na,!1)?.host,no=e=>!!(ni&&tq(e,!1)?.host?.endsWith(ni)===Y),ns=(...e)=>tX(tC(e),/(^(?=\\?))|(^\\.(?=\\/))/,na.split(\"?\")[0]),nl=ns(\"?\",\"var\"),nu=ns(\"?\",\"mnt\");ns(\"?\",\"usr\");var nc=Symbol(),nf=Symbol(),nd=(e,t,r=Y,n=X)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tx(\"tail.js: \",\"90;3\"))+t);var a=e?.[nf];a&&(e=e[nc]),null!=e&&console.log(eg(e)?tx(ne(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,t,r])=>nd(e,t,r,!0)),t&&console.groupEnd()},[nv,np]=r7(),[nh,ng]=[tQ,tQ],[nm,ny]=tT(),nb=e=>{ng===tQ&&([nh,ng]=r7(e),ny(nh,ng))},nw=e=>t=>nk(e,t),nk=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nS,nT]=tT(),[nE,nI]=tT(),nA=e=>nN!==(nN=e)&&nT(nN=!1,nj(!0,!0)),nx=e=>nO!==(nO=!!e&&\"visible\"===document.visibilityState)&&nI(nO,!e,nC(!0,!0));nS(nx);var nN=!0,nO=!1,nC=tv(!1),nj=tv(!1);ru(window,[\"pagehide\",\"freeze\"],()=>nA(!1)),ru(window,[\"pageshow\",\"resume\"],()=>nA(!0)),ru(document,\"visibilitychange\",()=>(nx(!0),nO&&nA(!0))),nT(nN,nj(!0,!0));var n$=!1,n_=tv(!1),[nM,nU]=tT(),nF=th({callback:()=>n$&&nU(n$=!1,n_(!1)),frequency:2e4,once:!0,paused:!0}),nq=()=>!n$&&(nU(n$=!0,n_(!0)),nF.restart());ru(window,[\"focus\",\"scroll\"],nq),ru(window,\"blur\",()=>nF.trigger()),ru(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nq),nq();var nP=()=>n_();(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nR=t_(b,!1,\"local variable scope\"),nz=e=>nR.tryParse(e)??rb(e),nD=e=>nR.format(e)??rb.format(e),nW=e=>!!nR.tryParse(e?.scope),nB=tM({scope:nR},rk),nV=e=>null==e?void 0:ef(e)?e:e.source?nV(e.source):`${nz(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nJ=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nL=0,nK=void 0,nG=()=>(nK??tQ())+\"_\"+nH(),nH=()=>(td(!0)-(parseInt(nK.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nL).toString(36),nX=e=>crypto.getRandomValues(e),nY=()=>tX(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nX(new Uint8Array(1))[0]&15>>e/4).toString(16)),nZ={},nQ={id:nK,heartbeat:td()},n0={knownTabs:{[nK]:nQ},variables:{}},[n1,n2]=tT(),[n4,n6]=tT(),n5=tQ,n3=e=>nZ[nV(e)],n8=(...e)=>n7(e.map(e=>(e.cache=[td(),3e3],nB(e)))),n9=e=>eF(e,e=>e&&[e,nZ[nV(e)]]),n7=e=>{var t=eF(e,e=>e&&[nV(e),e]);if(t?.length){var r=n9(e);e7(nZ,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(n0.variables,n),n5({type:\"patch\",payload:eG(n)})),n6(r,nZ,!0)}};nm((e,t)=>{nS(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nK=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nZ=eG(eR(eX(nZ,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nV(e),e])))}else sessionStorage.setItem(F,e([nK,eF(nZ,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n5=(t,r)=>{e&&(localStorage.setItem(F,e([nK,t,r])),localStorage.removeItem(F))},ru(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nK)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||n5({type:\"set\",payload:n0},a);else if(\"set\"===i&&r.active)e7(n0,o),e7(nZ,o.variables),r.trigger();else if(\"patch\"===i){var s=n9(eF(o,1));e7(n0.variables,o),e7(nZ,o),n6(s,nZ,!1)}else\"tab\"===i&&(e7(n0.knownTabs,a,o),o&&n2(\"tab\",o,!1))}}});var r=th(()=>n2(\"ready\",n0,!0),-25),n=th({callback(){var e=td()-1e4;eJ(n0?.knownTabs,([t,r])=>r[0]<e&&tn(n0.knownTabs,t)),nQ.heartbeat=td(),n5({type:\"tab\",payload:nQ})},frequency:5e3,paused:!0}),a=e=>{n5({type:\"tab\",payload:e?nQ:void 0}),e?(r.restart(),n5({type:\"query\"})):r.toggle(!1),n.toggle(e)};nS(e=>a(e),!0)},!0);var[ae,at]=tT(),[ar,an]=tT(),aa=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?ng:np)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?nh:nv)([nK,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nK))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ru(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})(U+\"rq\"),ai=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),at(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?nh(a,!0):JSON.stringify(a)))};if(!r)return await aa(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?ng:JSON.parse)?.(o):G;return null!=l&&an(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},ao=[\"scope\",\"key\",\"targetId\",\"version\"],as=[...ao,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],al=[...ao,\"init\",\"purpose\",\"refresh\"],au=[...as,\"value\",\"force\",\"patch\"],ac=new Map,af=(e,t)=>{var r=th(async()=>{var e=eF(ac,([e,t])=>({...nJ(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(ac,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nV(e),i=ta(ac,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eJ(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nS((e,t)=>r.toggle(e,e&&t>=3e3),!0),n4(e=>eJ(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await ai(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nV(e);n(r,e.result);var a=n3(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nW(e))return[to(e,al),t];else if(eb(e.init)){var u={...nB(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rh.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&n7(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nV(e),n=n3(r);if(o(r,e.cache),nW(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nR(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,au),t]}}),f=u.length?D((await ai(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n7(a),eJ(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,as),cache:[t,t+(ta(i,nV(e))??3e3)]});return ar(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rI(e)),eF(e.set,e=>rI(e)));r?.length&&n7(eB(r,c,t))}}),u},ad=(e,t,r=tZ)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),nd({[nf]:eF(r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rm(tl(e),!0),{timestamp:e.timestamp-td()}))),e=>[e,e.type,X])},\"Posting \"+tE([tI(\"new event\",[eY(r,e=>!ry(e))||void 0]),tI(\"event patch\",[eY(r,e=>ry(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ai(e,{events:r,variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eJ(e,e=>nd(e,e.type)),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nE((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},av=Symbol(),ap=[.75,.33],ah=[.25,.33],ag=e=>{var t=new IntersectionObserver(e=>eJ(e,e=>e.target[av]?.(e))),r=new Set;th({callback:()=>eJ(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=t1.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nP),!1,!1,0,0,0,tY()];a[4]=t,a[5]=r,a[6]=n},y=[tY(),tY()],b=aM(!1),w=tv(!1,nP),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],E=S[1]-S[3],I=T/t.height||0,A=E/t.width||0,x=v?ah:ap,N=(T>x[0]*o||I>x[0])&&(E>x[0]*r||A>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rL.impressionThreshold-250)&&(++h,b(v),u||e(u=eX(eF(s,e=>(e.track?.impressions||rV(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:ro(i),viewport:rf(),timeOffset:aF(),impressions:h,...aG(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=tj(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var j,$=t1.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,M=0;for(l??=[];M<f.length&&(j=$.nextNode());){var U=j.textContent?.length??0;for(_+=U;_>=f[M]?.offset;)if(a[M%2?\"setEnd\":\"setStart\"](j,f[M].offset-_+U),M++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;M<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+E)/D),l&&eJ(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[av]=({isIntersecting:e})=>{e7(r,S,e),e||(eJ(c,e=>e()),S())},t.observe(i)}}},am=()=>{n4((e,t,r)=>{var n=eR(rS(eF(e,1))?.map(e=>[e,`${e.key} (${nD(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X]),[[{[nf]:rS(eF(t,1))?.map(e=>[e,`${e.key} (${nD(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X])},\"All variables\",Y]]);nd({[nf]:n},tx(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(t)} in total).`,\"2;3\"))})},ay=()=>{var e=t0?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??t0.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:t0.devicePixelRatio,width:t,height:r,landscape:a}}},ab=e=>e(K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...ay()})),aw=(e,t=\"A\"===rr(e)&&t8(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ak=(e,t=rr(e),r=rV(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t7(e,\"type\"),\"button\",\"submit\")||r===Y),aS=(e,t=!1)=>({tagName:e.tagName,text:tO(t8(e,\"title\")?.trim()||t8(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?rl(e):void 0}),aT=(e,t,r=!1)=>{var n;return t5(e??t,e=>\"IMG\"===rr(e)||e===t?(n={element:aS(e,r)},X):Y),n},aE=e=>{if(w)return w;ef(e)&&([t,e]=np(e),e=r7(t)[1](e)),e7(rL,e),nb(ta(rL,\"encryptionKey\"));var t,r=ta(rL,\"key\"),n=t0[rL.name]?._??[];if(!ev(n)){P(`The global variable for the tracker \"${rL.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nw(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nG(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=af(nl,l),c=ad(nl,l),f=null,d=0,v=X,p=X;return w=(...e)=>{if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):np(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?np(e):e),e=>{if(!e)return X;if(a0(e))rL.tags=e7({},rL.tags,e.tagAttributes);else if(a1(e))return rL.disabled=e.disable,X;else if(a6(e))return n=Y,X;else if(ie(e))return e(w),X;return p||a3(e)||a4(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>a4(e)?-100:a3(e)?-50:a7(e)?-10:rO(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rO(t))c.post(t);else if(a5(t))u.get(...eh(t.get));else if(a7(t))u.set(...eh(t.set));else if(a3(t))tu(i,t.listener);else if(a4(t))(e=W(()=>t.extension.setup(w),e=>nk(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(ie(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nk(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nk(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(t0,rL.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+nG(),events:c,variables:u,__isTracker:Y})),configurable:!1,writable:!1}),am(),n1(async(e,t,r,a)=>{if(\"ready\"===e){var i=rN((await u.get({scope:\"session\",key:_,refresh:!0},{scope:\"session\",key:M,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ab(w),i.hasUserAgent=!0),p=!0,s.length&&w(s),a(),w(...eF(aX,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},aI=()=>k?.clientId,aA={scope:\"shared\",key:\"referrer\"},ax=(e,t)=>{w.variables.set({...aA,value:[aI(),e]}),t&&w.variables.get({scope:aA.scope,key:aA.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},aN=tv(),aO=tv(),aC=1,aj=()=>aO(),[a$,a_]=tT(),aM=e=>{var t=tv(e,aN),r=tv(e,aO),n=tv(e,nP),a=tv(e,()=>aC);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aU=aM(),aF=()=>aU(),[aq,aP]=tT(),aR=(e,t)=>(t&&eJ(aD,t=>e(t,()=>!1)),aq(e)),az=new WeakSet,aD=document.getElementsByTagName(\"iframe\"),aW=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aB(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aV=e=>rJ(e,void 0,e=>eF(eh(e3(rM,e)?.tags))),aJ=e=>e?.component||e?.content,aL=e=>rJ(e,t=>t!==e&&!!aJ(e3(rM,t)),e=>(T=e3(rM,e),(T=e3(rM,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aK=(e,t)=>t?e:{...e,rect:void 0,content:(E=e.content)&&eF(E,e=>({...e,rect:void 0}))},aG=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t5(e,e=>{var a=e3(rM,e);if(a){if(aJ(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&rl(e)||void 0;var u=aL(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aK({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rB(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aK({id:\"\",rect:n,content:o})),eJ(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tC(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tC(a,\"/\")}:void 0},aH=Symbol();$={necessary:1,preferences:2,statistics:4,marketing:8},window.tail({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=t1.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=$[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aX=[{id:\"context\",setup(e){th(()=>eJ(aD,e=>tt(az,e)&&aP(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=n3({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n3({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n8({scope:\"tab\",key:\"tabIndex\",value:n=n3({scope:\"shared\",key:\"tabIndex\"})?.value??n3({scope:\"session\",key:_})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!ri(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tq(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nG(),tab:nK,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rf(),duration:aU(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),n8({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tP(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tX(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n3(aA)?.value;c&&no(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...aA,value:void 0}))}var c=document.referrer||null;c&&!no(c)&&(k.externalReferrer={href:c,domain:rc(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aF()})),a_(k)}};return nE(e=>{e?(aO(Y),++aC):aO(X)}),ru(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aQ(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rC(e)||ry(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ag(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rM,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(rM,e))};return{decorate(e){eJ(e.components,e=>ta(e,\"track\"))},processCommand:e=>a2(e)?(n(e),Y):a9(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t8(a,e);){tt(n,a);var o=tH(t8(a,e),\"|\");t8(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ru(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t5(n.target,e=>{ak(e)&&(o??=e),u=u||\"NAV\"===rr(e);var t=rU(e),r=t?.component;!n.button&&r?.length&&!l&&(eJ(e.querySelectorAll(\"a,button\"),t=>ak(t)&&((l??=[]).length>3?eN():l.push({...aS(t,!0),component:t5(t,(e,t,r,n=rU(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rV(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rV(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aG(s,!1,f),v=aV(s);a??=!u;var p={...(i??=Y)?{pos:ro(o,n),viewport:rf()}:null,...aT(n.target,s),...d,timeOffset:aF(),...v};if(!o){f&&te(t,s,r=>{var a=rs(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(aw(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tq(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&e(K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nG(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=no(w);if(k){ax(b.clientId,()=>e(b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rL.captureContextMenu)return;o.href=nu+\"=\"+S+encodeURIComponent(w),ru(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&e(b),r())),ru(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t8(o,\"target\")!==window.name?(ax(b.clientId),b.self=X,e(b)):ri(location.href,o.href)||(b.exit=b.external,ax(b.clientId)));return}var T=(t5(n.target,(e,t)=>!!(c??=aW(rU(e)?.cart??rB(e,\"cart\")))&&!c.item&&(c.item=e2(rU(e)?.content))&&t(c)),aB(c));(T||a)&&e(T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),aR(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=ra(Y);a$(()=>ty(()=>(t={},r=ra(Y)),250)),ru(window,\"scroll\",()=>{var n=ra(),a=rn();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&e(o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aZ(t)){var r=t.cart;return\"clear\"===r?e({type:\"cart_updated\",action:\"clear\"}):(r=aB(r))&&e({...r,type:\"cart_updated\"}),Y}return a8(t)?(e({type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=(e,t=!1)=>{var r=!t||t9(e,rF(\"form-value\"));t&&(r=r?ei(r):\"checkbox\"===e.type);var n=e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value;return t&&n&&(n=tO(n,200)),r?n:void 0},n=n=>{var a,i=n.form;if(i){var s=t9(i,rF(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&rl(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t9(i,rF(\"form-name\"))||t8(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aF()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ru(i,\"submit\",()=>{a=aG(i),t[3]=3,u(()=>{i.isConnected&&rl(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rV(e,\"ref\"))&&(e.value||(e.value=nY()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tX(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aH]:r(e),value:r(e,!0)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=aj())),u=-(l-(l=td(Y))),c=t[aH];(t[aH]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eJ(e.fields,([e,r])=>r.lastField=e===t.name)),t.value=r(n,!0),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ru(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=aj()):o()));u(document),aR(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:M,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rv(n,r=rp(r)))return[!1,n];var a={level:rd.lookup(r.classification),purposes:rh.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:M}]}}),[!0,a]}},n={};return{processCommand(e){if(it(e)){var a=e.consent.get;a&&t(a);var i=rp(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(t1.hasFocus()){var e=o.poll();if(e){var t=rp({...s,...e});if(t&&!rv(s,t)){var[n,a]=await r(t);n&&nd(a,\"Consent was updated from \"+l),s=t}}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aY=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aZ=aY(\"cart\"),aQ=aY(\"username\"),a0=aY(\"tagAttributes\"),a1=aY(\"disable\"),a2=aY(\"boundary\"),a4=aY(\"extension\"),a6=aY(Y,\"flush\"),a5=aY(\"get\"),a3=aY(\"listener\"),a8=aY(\"order\"),a9=aY(\"scan\"),a7=aY(\"set\"),ie=e=>\"function\"==typeof e,it=aY(\"consent\");Object.defineProperty(t0,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(aE)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
    return `((d=document,s=d.createElement("script"))=>{s.addEventListener("load",()=>window[${JSON.stringify(INITIALIZE_TRACKER_FUNCTION)}](init=>init(${JSON.stringify(encrypt ? httpEncode([
        tempKey,
        createTransport(tempKey)[0](clientConfig, true)
    ]) : clientConfig)})),true);s.src=${JSON.stringify(config.src + (config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY$1)};d.head.appendChild(s)})();`;
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
        let { method, url, headers: sourceHeaders, body, clientIp } = request;
        await this.initialize();
        const { host, path, query } = parseUri(url);
        if (host == null && path == null) {
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
            if (requestPath === this._endpoint) {
                requestPath = requestPath.substring(this._endpoint.length);
                let queryValue;
                switch(method.toUpperCase()){
                    case "GET":
                        {
                            if ((queryValue = join(query?.[INIT_SCRIPT_QUERY$1])) != null) {
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
                                body = await unwrap(body);
                                if (body == null || !isJsonObject(body) && body.length === 0) {
                                    return result({
                                        status: 400,
                                        body: "No data."
                                    });
                                }
                                try {
                                    let postRequest;
                                    let json = false;
                                    if (headers["content-type"] === "application/json" || isJsonObject(body)) {
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
                                        postRequest = isJsonObject(body) ? body : JSON.parse(decodeUtf8(body));
                                    } else {
                                        const { transport: cipher } = await trackerSettings();
                                        postRequest = cipher[1](body);
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
            trackerScript.push(`window.${trackerRef}??=c=>(${trackerRef}._??=[]).push(c);`);
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
                pendingEvents.length && inlineScripts.push(`${trackerRef}(${keyPrefix}${pendingEvents.map((event)=>typeof event === "string" ? event : JSON.stringify(event)).join(", ")});`);
            }
            if (initialCommands) {
                inlineScripts.push(`${trackerRef}(${keyPrefix}${isString(initialCommands) ? JSON.stringify(initialCommands) : httpEncode(initialCommands)});`);
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
                return html ? `<script src='${script.src}?${INIT_SCRIPT_QUERY$1}&${BUILD_REVISION_QUERY$1}'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
    async _loadCachedDeviceVariables() {
        // Loads device variables into cache.
        const variables = this._getClientDeviceVariables();
        if (variables) {
            if (this._clientDeviceCache?.loaded) {
                return;
            }
            this._clientDeviceCache.loaded = true;
            await this.set(map(variables, ([, value])=>value));
        }
    }
    _getClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = this._clientDeviceCache = {};
            let timestamp;
            dataPurposes.pure.map(([, flag])=>{
                // Device variables are stored with a cookie for each purpose.
                this._requestHandler._cookieNames.deviceByPurpose[flag];
                forEach(this.httpClientDecrypt(this.cookies[this._requestHandler._cookieNames.deviceByPurpose[flag]]?.value), (value)=>{
                    update(deviceCache.variables ??= {}, value[0], (current)=>{
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
        let cachedDeviceData;
        const getDeviceId = async ()=>this._consent.level > DataClassification.Anonymous ? deviceId ?? (resetDevice ? undefined : cachedDeviceData?.id) ?? await this.env.nextId("device") : undefined;
        if (this._consent.level > DataClassification.Anonymous) {
            cachedDeviceData = resetDevice ? undefined : this._getClientDeviceVariables()?.[SCOPE_INFO_KEY]?.value;
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
                await this.env.storage.set([
                    {
                        scope: VariableScope.Session,
                        key: SCOPE_INFO_KEY,
                        targetId: sessionId,
                        patch: async (current)=>({
                                value: {
                                    ...current?.value,
                                    deviceId: await getDeviceId()
                                }
                            })
                    }
                ]);
            }
            // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
            // This means clients must make sure the initial request to endpoint completes before more are sent (or at least do a fair effort).
            // Additionally, empty sessions should be filtered by analytics using the collected events.
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
                        force: true,
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
                    return {
                        ...Necessary,
                        value: createInitialScopeData(sessionId, timestamp, {
                            deviceId: await getDeviceId(),
                            deviceSessionId: deviceSessionId ?? await this.env.nextId("device-session"),
                            previousSession: cachedDeviceData?.lastSeen,
                            hasUserAgent: false
                        })
                    };
                }
            }
        ]).result));
        if (this._session.value) {
            let device = this._consent.level > DataClassification.Anonymous && this.deviceId ? await this.env.storage.get([
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
                    top: 1000
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
            if (this.consent.level <= DataClassification.Anonymous || this._clientDeviceCache?.touched) {
                dataPurposes.pure.map(([, purpose])=>{
                    const remove = this.consent.level <= DataClassification.Anonymous || !splits[purpose];
                    const cookieName = this._requestHandler._cookieNames.deviceByPurpose[purpose];
                    if (remove) {
                        this.cookies[cookieName] = {};
                    } else if (splits[purpose]) {
                        this.cookies[cookieName] = {
                            httpOnly: true,
                            maxAge: Number.MAX_SAFE_INTEGER,
                            sameSitePolicy: "None",
                            essential: purpose === DataPurposeFlags.Necessary,
                            value: this.httpClientEncrypt(splits[purpose])
                        };
                    }
                });
            }
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
        return toVariableResultPromise(async ()=>{
            if (keys.some((key)=>variableScope(key?.scope) === VariableScope.Device)) {
                await this._loadCachedDeviceVariables();
            }
            return restrictTargets(await this.env.storage.get(keys, this._getStorageContext(context)).all);
        }, undefined, (results)=>results.forEach((result)=>result?.status <= VariableResultStatus.Created && this._changedVariables.push(result)));
    }
    async head(filters, options, context) {
        await this._loadCachedDeviceVariables();
        return this.env.storage.head(filters, options, this._getStorageContext(context));
    }
    async query(filters, options, context) {
        await this._loadCachedDeviceVariables();
        return this.env.storage.query(filters, options, this._getStorageContext(context));
    }
    set(variables, context) {
        return toVariableResultPromise(async ()=>{
            if (variables.some((key)=>variableScope(key?.scope) === VariableScope.Device)) {
                await this._loadCachedDeviceVariables();
            }
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
   */ impressionThreshold: 1000,
    captureContextMenu: true,
    defaultActivationTracking: "auto",
    tags: {
        default: [
            "data-id",
            "data-name"
        ]
    }
};
const INIT_SCRIPT_QUERY = "init";
const BUILD_REVISION_QUERY = "rev=" + "lzgtkyf6";
const externalConfig = trackerConfig;
const initialName = trackerConfig.name;
let tail = globalThis[initialName] ??= (c)=>(tail._ ??= []).push(c);
let initialized = false;
tail((tracker)=>tail = tracker);
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
        src.push("?", INIT_SCRIPT_QUERY, "&", BUILD_REVISION_QUERY);
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
            if (i < requestChunks || cookie.value) {
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
            results: (options?.top && !options?.cursor?.include ? results.slice(0, options.top) : results).map((variable)=>copy(variable))
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
        for (const method of [
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
            return await partitions[0][0][method]?.(partitions[0][1], options);
        }
        const includeCursor = options?.cursor?.include || !!options?.cursor?.previous;
        let cursor = options?.cursor?.previous ? JSON.parse(options.cursor.previous) : undefined;
        let top = options?.top ?? 100;
        let anyCursor = false;
        for(let i = 0; // Keep going as long as we need the total count, or have not sufficient results to meet top (or done).
        // If one of the storages returns an undefined count even though requested, we will also blank out the count in the combined results
        // and stop reading from additional storages since total count is no longer needed.
        i < partitions.length && (top > 0 || results.count != null); i++){
            const [storage, query] = partitions[i];
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
                const error = scope === VariableScope.Session ? validateScope(scopeIds.sessionId, key.targetId ??= scopeIds.sessionId) : scope === VariableScope.Device ? validateScope(scopeIds.deviceId, key.targetId ??= scopeIds.deviceId) : scope === VariableScope.User ? validateScope(scopeIds.authenticatedUserId, key.targetId ??= scopeIds.authenticatedUserId) : undefined;
                return error;
            } else if (scope !== VariableScope.Global && !key.targetId) {
                return `Target ID is required for non-global scopes when variables are not managed through the tracker.`;
            }
        }
        return undefined;
    }
    _restrictFilters(filters, context) {
        const scopeIds = context?.tracker ?? context?.scopeIds;
        if (!scopeIds) {
            return filters;
        }
        const scopeTargetedFilters = [];
        for (const filter of filters){
            for (let scope of filter.scopes ?? variableScope.values){
                scope = variableScope(scope);
                let scopeTargetId = scope === VariableScope.User ? scopeIds.authenticatedUserId : scope === VariableScope.Device ? scopeIds.deviceId : scope === VariableScope.Session ? scopeIds.sessionId : true;
                if (!scopeTargetId) {
                    continue;
                }
                scopeTargetedFilters.push({
                    ...filter,
                    scopes: [
                        scope
                    ],
                    targetIds: scopeTargetId === true ? filter.targetIds : [
                        scopeTargetId
                    ]
                });
            }
        }
        return scopeTargetedFilters;
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
        return this._storage.purge(this._restrictFilters(filters, context), context);
    }
    head(filters, options, context) {
        return this._storage.head(this._restrictFilters(filters, context), options, context);
    }
    async query(filters, options, context) {
        const results = await this._storage.query(this._restrictFilters(filters, context), options, context);
        const consent = this._getContextConsent(context);
        results.results = results.results.map((result)=>({
                ...result,
                value: this._patchAndCensor(this._getMapping(result), result, result.value, consent, false)
            }));
        return results;
    }
}

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, InMemoryStorageBase, MAX_CACHE_HEADERS, ParsingVariableStorage, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, TargetedVariableCollection, Tracker, TrackerEnvironment, VariableMap, VariableSplitStorage, VariableStorageCoordinator, bootstrap, getErrorMessage, hasChanged, isValidationError, isWritable, mapKey, requestCookieHeader, requestCookies };

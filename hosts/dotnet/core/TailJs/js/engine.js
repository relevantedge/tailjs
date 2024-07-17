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
        text: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,I,A,E,T,x,N,O,C,j,M,_=\"@info\",U=\"@consent\",$=\"_tail:\",F=$+\"state\",q=$+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},z=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!z(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},R=(e,t,...r)=>e===t||r.length>0&&r.some(t=>R(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>K(t,[e,r])},K=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:L,en=(e,t)=>eS(t)?e!==L?t(e):L:e?.[t]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?L:!t&&ev(e)?e:eI(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,ey=Object.prototype,em=Object.getPrototypeOf,eb=e=>null!=e&&em(e)===ey,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eI=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eA=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==L?(e=eO(e),t??=0,r??=H,(n,a)=>t--?L:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),eM=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===L?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):eM(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),e_=(e,t)=>t&&!ev(e)?[...e]:e,eU=(e,t,r,n)=>eM(e,t,r,n),e$=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?eM(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(eM(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,t,r,n)):L},eq=(e,t,r,n)=>null!=e?new Set([...eU(e,t,r,n)]):L,eP=(e,t,r=1,n=!1,a,i)=>eh(e$(e,t,r,n,a,i)),ez=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},eR=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?L:eI(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return eR(e,t,r,n);if(r===L){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of eM(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eK=async(e,t,r,n)=>{var a;if(null==e)return L;for(var i of eU(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,t,r)=>{if(null==e)return L;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>e_(eM(e,(e,r)=>t(e,r)?e:L,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return L;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?L:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,L,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eI(e)?eF(e,eA(e)?e=>e:eE(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):L,e1=(e,t,r,n)=>null==e?L:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):L,r,n)),e2=(e,t,r,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:L,r,n),e4=(e,t,r,n)=>null==e?L:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e3=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e5=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e3(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e3),te=e9((e,t,r)=>e3(e,t,eS(r)?r(e5(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e5(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e5(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e5(e,t),i+1,e,t))):a(e5(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eL(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eE(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eA(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(y.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await K(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),y.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{y.active&&v(),y.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),y.active=!!(u=e?p():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(g(!0),y.trigger(),y):g(!0):g(!1):y,trigger:async e=>await v(e)&&(g(y.active),!0)};return y.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ty,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class ty{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var tm=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new ty,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tI=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tA=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):L,tE=(e,t=\"'\")=>null==e?L:t+e+t,tT=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tx=(e,t,r)=>null==e?L:eS(t)?tA(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tA(eF(e,e=>!1===e?L:e),t??\"\"),tN=e=>(e=Math.log2(e))===(0|e),tO=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):L,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,L):(e??0)|r,(p=!1,L)):v(e),(e,t)=>null==(e=h(e,!1))?L:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tN(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],y=(e,t)=>null==e?L:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&tN(e));return ti(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tA(eF(eh(e),e=>tE(e)),[t])}`},t&&{pure:m,map:(e,t)=>(e=y(e),m.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tC=(...e)=>{var t=e0(eL(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=L;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tj=Symbol(),tM=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:L)||(n[1]?[n[1]]:[]),n},t_=(e,t=!0,r)=>null==e?L:tP(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===t?f:tU(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),tU=(e,t,r=!0)=>t$(e,\"&\",t,r),t$=(e,t,r,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tM(e,!1===r?[]:!0===r?L:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,t)=>e?!1!==r?ez(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tj]=a),i},tF=(e,t)=>t&&null!=e?t.test(e):L,tq=(e,t,r)=>tP(e,t,r,!0),tP=(r,n,a,i=!1)=>(r??n)==null?L:a?(e=L,i?(t=[],tP(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tz=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tR=/\\z./g,tD=(e,t)=>(t=tx(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tR,tW={},tB=e=>e instanceof RegExp,tJ=(e,t=[\",\",\" \"])=>tB(e)?e:ev(e)?tD(eF(e,e=>tJ(e,t)?.source)):ea(e)?e?/./g:tR:ef(e)?tW[e]??=tP(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tD(eF(tV(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tx(t,tz)}]`)),e=>e&&`^${tx(tV(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tz(tK(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,tV=(e,t)=>e?.split(t)??e,tK=(e,t,r)=>e?.replace(t,r)??e,tG=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tL=5e3,tH=()=>()=>P(\"Not initialized.\"),tX=window,tY=document,tZ=tY.body,tQ=(e,t)=>!!e?.matches(t),t0=H,t1=(e,t,r=(e,t)=>t>=t0)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t2=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>na(e),Z);case\"e\":return W(()=>no?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t2(e,t[0])):void 0}},t4=(e,t,r)=>t2(e?.getAttribute(t),r),t6=(e,t,r)=>t1(e,(e,n)=>n(t4(e,t,r))),t3=(e,t)=>t4(e,t)?.trim()?.toLowerCase(),t5=e=>e?.getAttributeNames(),t8=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,t9=e=>null!=e?e.tagName:null,t7=()=>({x:(r=re(X)).x/(tZ.offsetWidth-window.innerWidth)||0,y:r.y/(tZ.offsetHeight-window.innerHeight)||0}),re=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),rt=(e,t)=>tK(e,/#.*$/,\"\")===tK(t,/#.*$/,\"\"),rr=(e,t,r=Y)=>(n=rn(e,t))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/tZ.offsetWidth,4),y:eT(n.y/tZ.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),rn=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ra(e),{x:a,y:i}):void 0,ra=e=>e?(o=e.getBoundingClientRect(),r=re(X),{x:eT(o.left+r.x),y:eT(o.top+r.y),width:eT(o.width),height:eT(o.height)}):void 0,ri=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),ro=e=>{var{host:t,scheme:r,port:n}=t_(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rs=()=>({...r=re(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:tZ.offsetWidth,totalHeight:tZ.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var rl=tO(s,!1,\"data classification\"),ru=(e,t)=>rl.parse(e?.classification??e?.level)===rl.parse(t?.classification??t?.level)&&rf.parse(e?.purposes??e?.purposes)===rf.parse(t?.purposes??t?.purposes),rc=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rl.parse(e.classification??e.level??t?.classification??0),purposes:rf.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var rf=tO(l,!0,\"data purpose\",2111),rd=tO(l,!1,\"data purpose\",0),rv=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rp=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rh=tO(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rg=e=>`'${e.key}' in ${rh.format(e.scope)} scope`,ry={scope:rh,purpose:rd,purposes:rf,classification:rl};tC(ry),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tO(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tO(d,!1,\"variable set status\");var rm=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rS)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rw)),values:o(e=>eF(e,e=>rw(e)?.value)),push:()=>(i=e=>(r?.(eF(rb(e))),e),s),value:o(e=>rw(e[0])?.value),variable:o(e=>rw(e[0])),result:o(e=>e[0])};return s},rb=e=>e?.map(e=>e?.status<400?e:L),rw=e=>rk(e)?e.current??e:L,rk=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rS=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rg(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rI=e=>rS(e,L,!0),rA=e=>e&&\"string\"==typeof e.type,rE=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rT=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rx=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rN=(e,t=\"\",r=new Map)=>{if(e)return eI(e)?eV(e,e=>rN(e,t,r)):ef(e)?tP(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rT(n)+\"::\":\"\")+t+rT(a),value:rT(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rx(r,u)}):rx(r,e),r},rO=new WeakMap,rC=e=>rO.get(e),rj=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rM=(e,t,r,n,a,i)=>t?.[1]&&eV(t5(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tF(o,t)&&(i=void 0,!r||tQ(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rN(a,tK(n,/\\-/g,\":\"),r),i)),r_=()=>{},rU=(e,t)=>{if(h===(h=rD.tags))return r_(e,t);var r=e=>e?tB(e)?[[e]]:eI(e)?eP(e,r):[eb(e)?[tJ(e.match),e.selector,e.prefix]:[tJ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(r_=(e,t)=>rM(e,n,t))(e,t)},r$=(e,t)=>tx(ez(t8(e,rj(t,Y)),t8(e,rj(\"base-\"+t,Y))),\" \"),rF={},rq=(e,t,r=r$(e,\"attributes\"))=>{r&&rM(e,rF[r]??=[{},tq(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tJ(r||n),,t])],t),rN(r$(e,\"tags\"),void 0,t)},rP=(e,t,r=X,n)=>(r?t1(e,(e,r)=>r(rP(e,t,X)),eS(r)?r:void 0):tx(ez(t4(e,rj(t)),t8(e,rj(t,Y))),\" \"))??(n&&(g=rC(e))&&n(g))??null,rz=(e,t,r=X,n)=>\"\"===(y=rP(e,t,r,n))||(null==y?y:ei(y)),rR=(e,t,r,n)=>e?(rq(e,n??=new Map),t1(e,e=>{rU(e,n),rN(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rD={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rW=[],rB=[],rJ=(e,t=0)=>e.charCodeAt(t),rV=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rW[rB[t]=e.charCodeAt(0)]=t);var rK=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rB[(16515072&t)>>18],rB[(258048&t)>>12],rB[(4032&t)>>6],rB[63&t]);return a.length+=n-r,rV(a)},rG=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rW[rJ(e,r++)]<<2|(t=rW[rJ(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rW[rJ(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rW[rJ(e,r++)]));return i},rL={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rH=(e=256)=>e*Math.random()|0,rX=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rH()));for(r=0,i[n++]=g(f^16*rH(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rH();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rL[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},rY={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rY);var{deserialize:rZ,serialize:rQ}=(C=rY.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r0=\"$ref\",r1=(e,t,r)=>ek(e)?L:r?t!==L:null===t||t,r2=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r1(t,n,r)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r0]||(e[r0]=o,l(()=>delete e[r0])),{[r0]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eI(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?rQ(u(e)??null):W(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},r4=e=>{var t,r,n=e=>eg(e)?e[r0]&&(r=(t??=[])[e[r0]])?r:(e[r0]&&(t[e[r0]]=e,delete e[r0]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>rZ(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},r6=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r2(e,!1,r))):r2(e,!0,r),n);if(t)return[e=>r2(e,!1,r),e=>null==e?L:W(()=>r4(e),L),(e,t)=>n(e,t)];var[a,i,o]=rX(e);return[(e,t)=>(t?Q:rK)(a(r2(e,!0,r))),e=>null!=e?r4(i(e instanceof Uint8Array?e:rG(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(m??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r6(),r6(null,{json:!0,prettify:!0});var r3=tV(\"\"+tY.currentScript.src,\"#\"),r5=tV(\"\"+(r3[1]||\"\"),\";\"),r8=r3[0],r9=r5[1]||t_(r8,!1)?.host,r7=e=>!!(r9&&t_(e,!1)?.host?.endsWith(r9)===Y),ne=(...e)=>tK(tx(e),/(^(?=\\?))|(^\\.(?=\\/))/,r8.split(\"?\")[0]),nt=ne(\"?\",\"var\"),nr=ne(\"?\",\"mnt\");ne(\"?\",\"usr\");var[nn,na]=r6(),[ni,no]=[tH,tH],[ns,nl]=tI(),nu=e=>{no===tH&&([ni,no]=r6(e),nl(ni,no))},nc=e=>t=>nf(e,t),nf=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nd,nv]=tI(),[np,nh]=tI(),ng=e=>nm!==(nm=e)&&nv(nm=!1,nk(!0,!0)),ny=e=>nb!==(nb=!!e&&\"visible\"===document.visibilityState)&&nh(nb,!e,nw(!0,!0));nd(ny);var nm=!0,nb=!1,nw=tv(!1),nk=tv(!1);ri(window,[\"pagehide\",\"freeze\"],()=>ng(!1)),ri(window,[\"pageshow\",\"resume\"],()=>ng(!0)),ri(document,\"visibilitychange\",()=>(ny(!0),nb&&ng(!0))),nv(nm,nk(!0,!0));var nS=!1,nI=tv(!1),[nA,nE]=tI(),nT=th({callback:()=>nS&&nE(nS=!1,nI(!1)),frequency:2e4,once:!0,paused:!0}),nx=()=>!nS&&(nE(nS=!0,nI(!0)),nT.restart());ri(window,[\"focus\",\"scroll\"],nx),ri(window,\"blur\",()=>nT.trigger()),ri(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nx),nx();var nN=()=>nI();(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nO=tO(b,!1,\"local variable scope\"),nC=e=>nO.tryParse(e)??rh(e),nj=e=>!!nO.tryParse(e?.scope),nM=tC({scope:nO},ry),n_=e=>null==e?void 0:ef(e)?e:e.source?n_(e.source):`${nC(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nU=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},n$=0,nF=void 0,nq=()=>(nF??tH())+\"_\"+nP(),nP=()=>(td(!0)-(parseInt(nF.slice(0,-2),36)||0)).toString(36)+\"_\"+(++n$).toString(36),nz=e=>crypto.getRandomValues(e),nR=()=>tK(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nz(new Uint8Array(1))[0]&15>>e/4).toString(16)),nD={},nW={id:nF,heartbeat:td()},nB={knownTabs:{[nF]:nW},variables:{}},[nJ,nV]=tI(),[nK,nG]=tI(),nL=tH,nH=e=>nD[n_(e)],nX=(...e)=>nZ(e.map(e=>(e.cache=[td(),3e3],nM(e)))),nY=e=>eF(e,e=>e&&[e,nD[n_(e)]]),nZ=e=>{var t=eF(e,e=>e&&[n_(e),e]);if(t?.length){var r=nY(e);e7(nD,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nB.variables,n),nL({type:\"patch\",payload:eL(n)})),nG(r,nD,!0)}};ns((e,t)=>{nd(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nF=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nD=eL(ez(eX(nD,([,e])=>e.scope===b.View),eF(n?.[1],e=>[n_(e),e])))}else sessionStorage.setItem(F,e([nF,eF(nD,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nL=(t,r)=>{e&&(localStorage.setItem(F,e([nF,t,r])),localStorage.removeItem(F))},ri(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nF)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||nL({type:\"set\",payload:nB},a);else if(\"set\"===i&&r.active)e7(nB,o),e7(nD,o.variables),r.trigger();else if(\"patch\"===i){var s=nY(eF(o,1));e7(nB.variables,o),e7(nD,o),nG(s,nD,!1)}else\"tab\"===i&&(e7(nB.knownTabs,a,o),o&&nV(\"tab\",o,!1))}}});var r=th(()=>nV(\"ready\",nB,!0),-25),n=th({callback(){var e=td()-1e4;eV(nB?.knownTabs,([t,r])=>r[0]<e&&tn(nB.knownTabs,t)),nW.heartbeat=td(),nL({type:\"tab\",payload:nW})},frequency:5e3,paused:!0}),a=e=>{nL({type:\"tab\",payload:e?nW:void 0}),e?(r.restart(),nL({type:\"query\"})):r.toggle(!1),n.toggle(e)};nd(e=>a(e),!0)},!0);var[nQ,n0]=tI(),[n1,n2]=tI(),n4=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?no:na)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?ni:nn)([nF,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nF))return t>0&&(i=setInterval(()=>o(),t/2)),await K(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ri(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})($+\"rq\"),n6=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n0(e,a,r,e=>(o=a===L,a=e)),!o&&(i=n?ni(a,!0):JSON.stringify(a)))};if(!r)return await n4(()=>eK(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?no:JSON.parse)?.(o):L;return null!=l&&n2(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},n3=[\"scope\",\"key\",\"targetId\",\"version\"],n5=[...n3,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n8=[...n3,\"init\",\"purpose\",\"refresh\"],n9=[...n5,\"value\",\"force\",\"patch\"],n7=new Map,ae=(e,t)=>{var r=th(async()=>{var e=eF(n7,([e,t])=>({...nU(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e5(n7,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=n_(e),i=ta(n7,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&z(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nd((e,t)=>r.toggle(e,e&&t>=3e3),!0),nK(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rm(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await n6(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=n_(e);n(r,e.result);var a=nH(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nj(e))return[to(e,n8),t];else if(eb(e.init)){var u={...nM(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rf.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&nZ(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rm(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=n_(e),n=nH(r);if(o(r,e.cache),nj(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nO(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,n9),t]}}),f=u.length?D((await n6(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nZ(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,n5),cache:[t,t+(ta(i,n_(e))??3e3)]});return n1(({variables:e})=>{if(e){var t=td(),r=ez(eF(e.get,e=>rw(e)),eF(e.set,e=>rw(e)));r?.length&&nZ(eB(r,c,t))}}),u},at=(e,t,r=tL)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),n6(e,{events:r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rv(tl(e),!0),{timestamp:e.timestamp-td()}))),variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),np((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(ez(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!z(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},ar=Symbol(),an=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[ar]?.(e))),r=new Set;th({callback:()=>eV(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e;return(a,i)=>{if(i&&(o=eX(i?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(o)){var o,s,l,u,c=X,f=X,d=0,v=0,p=[tG(),tG()],h=aw(!1),g=tv(!1,nN),y=()=>{var t=a.getBoundingClientRect(),r=window.innerWidth,i=window.innerHeight,y=[n(t.top,i),n(t.right,r),n(t.bottom,i),n(t.left,r)],m=y[2]-y[0],b=y[1]-y[3],w=m/t.height||0,k=b/t.width||0,S=c?[.25,.33]:[.33,.75],I=(m>S[0]*i||w>S[0])&&(b>S[0]*r||k>S[0]);if(f!==I&&g(f=I,!0),c!==(c=f&&g()>=rD.impressionThreshold-250)){if(++d,h(c),!l){var A,E=a.innerText;E?.trim()?.length&&(A={characters:E.match(/\\S/gu)?.length,words:E.match(/\\b\\w+\\b/gu)?.length,sentences:E.match(/\\w.*?[.!?]+(\\s|$)/gu)?.length}).words&&(A.readingTime=6e4*(A.words/238)),tu(e,l=eX(eF(o,e=>(e.track?.impressions||rz(a,\"impressions\",Y,e=>e.track?.impressions))&&G({type:\"impression\",pos:rr(a),viewport:rs(),timeOffset:aS(),impressions:d,text:A,...aU(a,Y)})||null)))}l?.length&&(u=eF(l,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:h(),impressions:d,regions:s&&{top:s[0][0],middle:s[1][0],bottom:s[2][0]},seen:v}))))}var T=t.left<0?-t.left:0,x=t.top<0?-t.top:0,N=t.width*t.height;if(c&&(v=p[0].push(x,x+m)*p[1].push(T,T+b)/N),t.height>1.25*i||s){var O=x/t.height,C=(x+m)/t.height;eV(s??=eF(3,()=>[{seen:!1,duration:0,impressions:0},tv(!1,nN),!1,!1]),(e,t)=>{var r=c&&(0===t?O<=.25:1===t?O<=.75&&C>=.25:C>=.75);e[2]!==r&&e[1](e[2]=r),e[3]!==e[2]&&(e[3]=e[2]&&e[1]()>rD.impressionThreshold-250)&&(e[0].seen=!0,++e[0].impressions),e[3]&&(e[0].duration+=e[1](!0,!0))})}};a[ar]=({isIntersecting:e})=>{e7(r,y,e),e||(eV(u,e=>e()),y())},t.observe(a)}}},aa=()=>{var e=tX?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tX.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tX.devicePixelRatio,width:t,height:r,landscape:a}}},ai=e=>tu(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>G({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...aa()})),ao=(e,t=\"A\"===t9(e)&&t4(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),as=(e,t=t9(e),r=rz(e,\"button\"))=>r!==X&&(R(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&R(t3(e,\"type\"),\"button\",\"submit\")||r===Y),al=(e,t=!1)=>({tagName:e.tagName,text:tT(t4(e,\"title\")?.trim()||t4(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ra(e):void 0}),au=(e,t,r=!1)=>{var n;return t1(e??t,e=>\"IMG\"===t9(e)||e===t?(n={element:al(e,r)},X):Y),n},ac=e=>{if(w)return w;ef(e)&&([t,e]=na(e),e=r6(t)[1](e)),e7(rD,e),nu(ta(rD,\"encryptionKey\"));var t,r=ta(rD,\"key\"),n=tX[rD.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rD.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nc(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nq(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=ae(nt,l),c=at(nt,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tX,rD.name,{value:w=Object.freeze({id:\"tracker_\"+nq(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):na(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?na(e):e),e=>{if(!e)return X;if(aR(e))rD.tags=e7({},rD.tags,e.tagAttributes);else if(aD(e))return rD.disabled=e.disable,X;else if(aJ(e))return n=Y,X;else if(aX(e))return e(w),X;return p||aK(e)||aB(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aB(e)?-100:aK(e)?-50:aH(e)?-10:rA(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rA(t))c.post(t);else if(aV(t))u.get(...eh(t.get));else if(aH(t))u.set(...eh(t.set));else if(aK(t))tu(i,t.listener);else if(aB(t))(e=W(()=>t.extension.setup(w),e=>nf(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(aX(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nf(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nf(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),nJ(async(e,t,r,a)=>{if(\"ready\"===e){var i=rI((await u.get({scope:\"session\",key:_,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ai(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aF,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},af=()=>k?.clientId,ad={scope:\"shared\",key:\"referrer\"},av=(e,t)=>{w.variables.set({...ad,value:[af(),e]}),t&&w.variables.get({scope:ad.scope,key:ad.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},ap=tv(),ah=tv(),ag=1,ay=()=>ah(),[am,ab]=tI(),aw=e=>{var t=tv(e,ap),r=tv(e,ah),n=tv(e,nN),a=tv(e,()=>ag);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),interactiveTime:n(e,i),activations:a(e,i)})},ak=aw(),aS=()=>ak(),[aI,aA]=tI(),aE=(e,t)=>(t&&eV(ax,t=>e(t,()=>!1)),aI(e)),aT=new WeakSet,ax=document.getElementsByTagName(\"iframe\"),aN=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&R(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aO(e){if(e){if(null!=e.units&&R(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aC=e=>rR(e,void 0,e=>eF(eh(e5(rO,e)?.tags))),aj=e=>e?.component||e?.content,aM=e=>rR(e,t=>t!==e&&!!aj(e5(rO,t)),e=>(I=e5(rO,e),(I=e5(rO,e))&&eP(ez(I.component,I.content,I),\"tags\"))),a_=(e,t)=>t?e:{...e,rect:void 0,content:(A=e.content)&&eF(A,e=>({...e,rect:void 0}))},aU=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t1(e,e=>{var a=e5(rO,e);if(a){if(aj(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ra(e)||void 0;var u=aM(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),a_({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rP(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,a_({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tx(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tx(a,\"/\")}:void 0},a$=Symbol();M={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tY.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=M[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aF=[{id:\"context\",setup(e){th(()=>eV(ax,e=>tt(aT,e)&&aA(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=nH({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nH({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nX({scope:\"tab\",key:\"tabIndex\",value:n=nH({scope:\"shared\",key:\"tabIndex\"})?.value??nH({scope:\"session\",key:_})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rt(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=t_(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nq(),tab:nF,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rs(),duration:ak(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),nX({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tU(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tK(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nH(ad)?.value;c&&r7(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ad,value:void 0}))}var c=document.referrer||null;c&&!r7(c)&&(k.externalReferrer={href:c,domain:ro(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aS()})),ab(k)}};return np(e=>{e?(ah(Y),++ag):ah(X)}),ri(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>az(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rE(e)||rp(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=an(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rO,e,e=>r(\"add\"in n?{...e,component:ez(e?.component,n.component),content:ez(e?.content,n.content),area:n?.area??e?.area,tags:ez(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e5(rO,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>aW(e)?(n(e),Y):aL(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=t4(a,e);){tt(n,a);var o=tV(t4(a,e),\"|\");t4(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ri(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t1(n.target,e=>{as(e)&&(o??=e),u=u||\"NAV\"===t9(e);var t=rC(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>as(t)&&((l??=[]).length>3?eN():l.push({...al(t,!0),component:t1(t,(e,t,r,n=rC(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rz(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rz(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aU(s,!1,f),v=aC(s);a??=!u;var p={...(i??=Y)?{pos:rr(o,n),viewport:rs()}:null,...au(n.target,s),...d,timeOffset:aS(),...v};if(!o){f&&te(t,s,r=>{var a=rn(s,n);if(r)tu(r,a);else{var i=G({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e5(t,s)}),!0,s)}return r});return}if(ao(o)){var h=o.hostname!==location.hostname,{host:g,scheme:y,source:m}=t_(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,G({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=G({clientId:nq(),type:\"navigation\",href:h?o.href:m,external:h,domain:{host:g,scheme:y},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=r7(w);if(k){av(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rD.captureContextMenu)return;o.href=nr+\"=\"+S+encodeURIComponent(w),ri(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ri(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t4(o,\"target\")!==window.name?(av(b.clientId),b.self=X,tu(e,b)):rt(location.href,o.href)||(b.exit=b.external,av(b.clientId)));return}var I=(t1(n.target,(e,t)=>!!(c??=aN(rC(e)?.cart??rP(e,\"cart\")))&&!c.item&&(c.item=e2(rC(e)?.content))&&t(c)),aO(c));(I||a)&&tu(e,I?G({type:\"cart_updated\",...p,...I}):G({type:\"component_click\",...p}))}})};r(document),aE(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=re(Y);am(()=>tm(()=>(t={},r=re(Y)),250)),ri(window,\"scroll\",()=>{var n=re(),a=t7();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aP(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aO(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return aG(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t6(i,rj(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ra(i).width,u=e5(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t6(i,rj(\"form-name\"))||t4(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aS()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ri(i,\"submit\",()=>{a=aU(i),t[3]=3,u(()=>{i.isConnected&&ra(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e5(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rz(e,\"ref\"))&&(e.value||(e.value=nR()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tK(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[a$]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=ay())),u=-(l-(l=td(Y))),c=t[a$];(t[a$]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ri(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=ay()):o()));u(document),aE(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:U,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||ru(n,r=rc(r)))return[!1,n];var a={level:rl.lookup(r.classification),purposes:rf.lookup(r.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(aY(e)){var a=e.consent.get;a&&t(a);var i=rc(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tY.hasFocus()){var e=o.poll();if(e){var t=rc({...s,...e});t&&!ru(s,t)&&(await r(t),s=t)}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aq=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aP=aq(\"cart\"),az=aq(\"username\"),aR=aq(\"tagAttributes\"),aD=aq(\"disable\"),aW=aq(\"boundary\"),aB=aq(\"extension\"),aJ=aq(Y,\"flush\"),aV=aq(\"get\"),aK=aq(\"listener\"),aG=aq(\"order\"),aL=aq(\"scan\"),aH=aq(\"set\"),aX=e=>\"function\"==typeof e,aY=aq(\"consent\");Object.defineProperty(tX,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(ac)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqW9-XrbONI3-v93FTYn4yEjWJbkJTYVhm_W7nRnmzjpTlpWElqCbCYy6SYpL5E0z3c158LOlZz6VQFcZKen3-fMdCwSALEWCrXDdb3gwdyZ5XotL7J4VDj9iyhb06pQmUpUpGKVqlxN1UyN1ESN1YU6V6fqRF2rM3WsLtU3daieq4fqqXqnrtQr9Vo9Vl_VS_U5cP4nTiapo97T0yhNcp0UjroTOJ-LKJ76jnoW3Gk5eREV2lF_4vl8lp866k3gUuuBDh48zbI0c7WHHhanWXq5pieuDoocaWFBf329VN-5vMqCzS4KxigSBMVi4eowLLwgSGbTqZfpYpYl650-8k_o040N-inw057q5KQ4xUfm0ZtjDpKg059QB_AcrcXJmva49kE0XKey9LOxsf6d3xXeVEY9sA11-61WspQXqikIXh9_1aOi_U1f59SsaWhpSy_VWxlGu93OaBhmCJkp96CzsZG18_RMu0Xw4C1Kep56wp9QaYxwPdCh9t-4RRg6D9cy_ecszvR47SKazvRanK-dxXkeJyeOool9d32uzeS2M30-jUbadahlRzkoaj9uOx618rusx3pHZbwQ2fXcDEu73nIUFaNTms4y7ZBGF-pzrBMv0xteJl9HSAcYpFPd1tx4YTI9v1hO4iSaTqnqsE21LtUjAAAvA5YWQJq14yQu4mgaf9fjxaIIC58mQ4ChXZzqJKQ3fqC2H7iN4tx7Gio1fkFvBF2e5_91Ea9vRpQt1S9VZ4J57RufvkGD_m8ueugWqxVK77ylratYqt9qdT2iXJNFc4zp_dUt1IAeh95S_RpE-XUyujH7ApvRZRQXa9yArV1fYI6LQWdIk5h4flKtDuAWK8BPhWd2U7-5Htpb6mmuufCFLbxeDLrD8gM7DkpDcd4ativUKPWFPsFmoX2djHQ6WWM4M99H9vtoWS64fGyX_SfMjlYvgos0Hq911M_Bq9nZsc7aLx9--Hz48NnTz89fvXv609O36kOw3lUfMTF_MHjMl-rf8rHW-DV7QukiOLw-O06n7bjQWVSkmdKZ3Tgu4TiqAhvOzbww84uNjYT-428z--BmBMuZh_wXSif2YwPqhAteCDJ64euwPSiGnKJRNkJPnOOU5jhKHNrStPFoTqhXcaBpwiPsxg51c2PD7QaBXiycSURL4FAVSHOKbKbpO-S8wGbUKWpcX6cach4t5X1UesrP9NEHpWd2yuL8MJro50mhTzQNesR9STiv0ZUJZwD7E3qoZ4y5jxP0kQZWpIdcxEU3LoKHWRZdUxv8q_Q59-DGwit9atBH1-ApGkv4wl-niSYY0zR_vn6O3wHhHz30B3qo9Em1gJgGJ2Xc2ejbtUWo51lapEhX-symnejijU1-Tf0_rgEEtXtG7WFOqduXdjGdySwZFXFaXyVeTKW_yfwwEDX6cMgZt3yo9PPaqNfXXVSliyFW9MZYCJVhRh_emMCX0bnST28kH-pC6Xd11G-mtIszg-bzZVSctrN0loxdfZdQJL-fp5dulxASHVkdnF6EPTsEUFtU1xV2kn6Fhly8dJSm_ry2cya1E7DzYtHxU_AaPTbHLuO9MMw8hnpCvfo1lVSUFBDOor8_K5foCCpWbG5SRRn9pZOK0_zEzwj_K_01EBibxNMCMIcOvDQNqKQ2zMGwDjpf-fjAzIZ2Fe7yvABxmfU2GG9eoGOE1YGystrJnqxhEbzyAzehzZ6orNXyiDhwr2M9Ha8l1J8rb85T1T_OdPRtyahybaUWqSKpfbdcArMHjCN8_diVAVGvQYOs9vrHfRTqQ9DtIFF6kAyHQLU0F25EHY6kw0o6EJUdiG7pOHpU78lLVxa30Rnq8w8wrzdHt6ShomwI5-XmZokxaSQ4QPqeyeVZoOb8WiMEH7JS-n7HmzA9EAaberPb161W-eXmZr-caQaqvqYkm9tqcc0EbzTQz3ZTAMoFRAxWoQG_r4MTxmxelL5jCcguDoMuaF4AddlTonMMMVyDK-l5AdhbLBJDTHp2wWKAQxRSMwURN16X9kYWcpfvajcGoUjV0bnjyzBiGaKdq6Xnmg6iK7SyXLpLXX1WHwR3QCBG8WgtgHRUHAyGDD1ZkN3vhJbEbWU-7cgODTOppyZ-EpZv_ex-gum76gOiuEY6cwbZsE_TnxKopSqiDD-lDY-p2NiI2yDc3dSz5K5glLikfi11SpTI-7L_dFwulf5zdZOjYKIvgeVcXrzqi6GHI_XNrauFuu-4Na4FKJU4A9TgWXqrpJN-w2Eb2BGHmigmgEjtjGBQGww9GRpqOWVKThEFp982VoHnnGa88_9jwnmuK5xFs232NR5VTJlhGGEnN7dySU0pXfIC3B-QNXXmpYnigB4yRhoJ15z9sGaiffXvf1kzIyaqGfUNqIvEBw3r1f6o1kcNdqd2zjAxoJ-5vB40AVKEdpF9VPqXm_PfX0H4sh_ser8ty_e5q4SNDStH27cs9YTHiRI3D-my0O9caNnY6DVsYk6AmJcv9mr0rtJE-f-idI2qv3UENA22sRf9ZjO1zVMdV7Ehv2PPtPmjWQeU_GQppEmWnj1NiJ7TudIvqqN8flsvLPNA_KjljOfL2mYiBEwHP5_xplPM_FGCVx4ImjiGgI6NATYbkQ9gKtBjkxBwgg8qAPURGcP0ACVaLOPaovWNyV_hWLlZvF4xZoyKlfjpJ5cBrAgN10UsYyHHSFeqAjvWBeOm9M9BhVbsYsXMcdCpCZ7B9fysnIxfqDD9h2VlpkHhOQxj1-Pv-Ykq_VDKOCybkgUMsqYV_VlOANM_6RyzFMhHR_XH4O-BEFM_RJV94OKEMHkbWD7PrE5UIUPCSzmxr-Xm4VrXGzulLsrQK6IMPn5kGqhfrRbG3KER_xHI_m3SrHqE3c4E6ll0ZUv4-mczdgw3ALMZMsfJFEQNXywWVEFEYBTR6keEwl-oYtCDNGabwEL_u4JrQSjHjFvojSrjdeZcpTvMVPEC0Elew0AP7Qe-fmoeiTtfp-PC4MQB0c9DS82ZedGyr5gjVLp7Gxn7wq9O7l-qdV5nqVUgy02tvZI6eMcr3bu9Ju42zcSEOziwC7mJIa7UXYMjIX12flDlMc_EehHeutQPOr5mYRQx7XRO6pTWmJsqN9T6ujRFs_nKBZ3D-4UfubEwBMuxV-4CnNFgkvI0K9wK6L1N5ruZH9mu8Ru6DcEF8cYjYudL2RrNAdN8IjoIQHKN9VQXek0TH-fjT5D5tVzdlvzyAdRa45N2rouQ_4IEpHVuR-NxiC_pF6XrX0oDDFC7TYxqzqRbey0YkrpTHjFUTV-wrAYnG_Jfaew0ykP-a9uziKcc1S3SC6qnwlRYkm3uXAKMSDtzv7YzXcK-BS3JA_51CbqzIcZQVukCNKhdVHOMSvU-v_Pk8Pi9pVmwA2Yoa5iTMVGjv4Ssw4q49tE6zR-1fsFVI4dwOP3hswGZ7oDKDlleY05CkP40inuBPnD1Nr1pPFUbXwZrZ0DviuzUB1gVRSnKWWGwCZTqKb_TMUqp4bqde0yEAQEm4021EFfcEzxLgF6UYiYMXaTRcjzJKUooXz4rT49LenUEoBzvR1CpMlq1IqmtmqltMDQUMbJYbF-BH0pMCZPGxDXWBN2b3ZDmeuqFLsRgatomguNpNDqFlDmTI7bIZMYwZ7WUKQSoP_w2shNNtCttdP7eN4lTm0gP6_ojY5p0Y6OIXPSYGOaSaKLCNI1JSEQ0gQENOqpPaEWTsdjTtejbIqluWJT4hJnCTQiaPTpoztHFIjKQIEijuF-xA-38fBqPAGFdD6yBAKtvZoL6Ed-cfLdYOYgLrylHpe0CySy9FLb-rlfOGW0Vrp1LmAlY0tEnUgY6np9BLhCV5cutaRD0WE_iRL_J0nOdFdcMgnPCNpP4ZJZFx1PtA98mszNt3jrqMosLm0NDSfCHtzSEVIRwHKLss8XCYQUCv0D-yfuITgarmAjnVNTPlv6cy9HTsr6ExcoAgRpo_tL6_NHcWGxQ0S03yVSX3qZR8ZJWDxjihDEE44nMLqkAQrcG3-EAM0rUJn6GQ79IXfPMzTNewRFO24qeVs5vAyvlVA-wreXgwOEgdQHzoRLCS-DVqJpSiFUSd0zr0rBFYiuCNBdyr2IqJyBrrgwcEvihVTA_U2RCp-RbMcaxKfIC57roCZgioaIZF6WuzFF2aQgWy0oXFUtV1Qrh2UNbChNblWLiGdUy-Wxq1tznWW3x6Mi2DDLt9WLUzJol-Wk8KWzupLl7WbmAXWFJTRqHlpPP8PDgMmTn1Hi538zQ06GpKWVlHFFhZpdlQWo0F24aFJSvONfW0B-kNG1BKjuL6McUSGPkJgD8NODPN8Eo0kdBqtyI-A2aB-olEgDfKgoHsYosXgA2HgfOLJE9OHbWLddIe5HA_wyHCASjH3lWmNglIoBYwGLsfqBlqBVrF_GZfp3FJ3HSqicn6SUBzJOo4EdVXIDFgn6JGRGqx6vz5y19tyCGgyhxq1yKicNIWd9B9F3UCjaTFss5gZVVyowjYVqqk7lIySHAppGdo6WOV-niqH4Xa6Mbe5e2RWRVn-tZfzTVUfaOxpLOCiZyIyLTQ8gdYshBpr7OPZd1PgR8tIf9zCh8fOphRMMiist-jhEmRDlCFIavN2M_rqnUEuqk0TF0KnQsu2w-gSpTJ6Nrv1CjaDo9jkbffGwONad0wld8dJ1Hs1yP_QiHJ239kxOd-TFeUpp7P8VT-XFulU1ZNPGnyyDrF0HWLtshZocheEZc0CgoLkHxWqUiLckkKC7cdeLgxsGEXi9EFrCmZSrXZ4vFOhFwo_a5TsZxcmKE9bpSKlOp6_bxLL9Gv00mhAT98pu-J_KAUUlVLBYjdEEDJlzJ_JVnNXfRic1xy-Xu0JLTSJGxrtGJsttQlqx3iX24H3QWC-yXExfiSNuTLvVkqc55ZmarSzcNeW7y4mESn0UQqD7LojPtnnr-KbVeYEULOpfVqczsdTsaFfEF9eDCRRP27RyM84lRqzC_MBEKowFrs-qTYH3dnRG404c-Afc1_RfMJQtnHrqOXxplEWWFb7gO8GVEqKmc0HyYqxOX5xnEYnpyQqelJRhp5m1DoSaU7J4wc3PdNgCEvns-J_o8W_51CVvlostiCN1CFdgKmaYsAZyq5KYJbmgLLGlvRXm-VpzMP5_T6RjnosU1bIVL5MVpnNv1XtLpLCYAbqmh53z7bZszuZjogH9QjDO5mAGzHxU02UsLPEYLdnvhWiGaYMqiz3AE_7evbJnyIx7sraUDnG3FtRTM45MkmtasFexcSS-kunKv8CdiTwBFxa19KbOXS7Mu19W6mIr70uE-T3WfZ7Jvpol28crqsfFN_-YQ3siz61qySRORw-RJpck2GHmdvzYtiMrCq3W-L7r4ygbEMXWvRdNMR-PrNWsEsSUdZ0OQZX34Ze-7PEmDInR4WI5vyEU6KCFkXSyIKnIzM5XEGapBfcbtdKORYaD_F3PNZ9FZhfWLB52whndQyL-Mk3F62WY8_zIeZWkR5d94kY9XlKeLRZw_g-UGYICYPOL-CNOFBXPZ9cknwrPWishxIelzS2MMVuXSqfrG_fI8obmgM41Yt-h67c5cL9tfqPFLUXUyWJ74Fjq_laqKNxbKYZRT0oI1qhG46LAmXxBRgfB9lvbiBz4wGakmhK3ApXWBZ6i3jGBU2sjrIK8weRb3pLQNiNZJwXw9F_xsrMMCQ1makgO3LogMikOIPmldmEmGNADPhp3VJYezBsXZxkbGY1cRmB8VLZVrtAI0cKJq6yyElizPQ4ceyvoPnCgZO8pRaw4LBpgBgB76GVsGNXQ8zCAMiMFj_qujiK5tf03jxGUZY4g6POWsOcyI8UNDoDaUwo4DWYx8Zz7yX6jiqfTH-ZfTEKYVLd0qVFFq7DULDwyTytKlqjMt5__9v_-P4wNIr6olbmjhYeHzkOXXLPAbsHaTMCEdV9yvidHTSxlMPBsG8NeslqdSqjDafrENmKYnPTazo3nrLFDq9W0aLkgUbtEfuDfEnpYDAple8JpMhDUfYX8Ypspk0fQW6Yv0UmePoxwkEqV6ahqsVJp7ambTGMVw0ijI21FCRNeMsMh4RrNo53hRQHRA5FYIdihXVMofqSRNtN9Z-jnRX_99IJPVrrKsF1SbVRvMGF8UBMGhsHpjWg6IV_3bTHBkYV6YJZqgKP42x09pF-55lOX4CjsnA2ydY38PTtXJkEY0MINsWOBw5bVZqOCGmPhzaldeCIVdgFUkuts9Bw35AmIcolo9QtUuN_OC0BerIhpIkmCFdiC00B5gGpQ8RrsxGlJNUXDi6o3_0L-Rx0VK9jsGO0isUkytBNMKMGRGYcmxQX-KV3XAYIgBqJYSmVu0tb6DxcRWGfqDi0p3S82w6i_EUvgvhkT03bCUqY0oDVgIFL5xq_Pwy535L4evX7XFIiqeXEO1DbvIJC3WojXB6nfm2VIoK8Lq4IvPGsPjQawni4WbbIixEY-yhvqKGAgN66YGfymq6S7VnAGCKcjrN_x4qgyU-lMl-8GfqWmafpud-ydKZsqfmilTzEcW0HicYA1pZ9CWfyaJgrPo7IYRFG0TR7CnKeiFSFtzWpn_hc5fGfaducEupxa1P2XRDuTCyy9LGBnNz2eZ9s8ULaklmalSHu3ZTSjQRioXhuXcsdkkrCCLxyta_EB3XBaAMFmeCSITi17X2AVVYjKRysFcJsgAY35xU4QmJygdny_6lcRcZNxsJ5BVkAcBN4Ffm9cDJpZZVV3MHPZ6VMrdoyCtfb3ZDePqu7htl5LeuOeoO8KgmYKoGZ8WX40BI5DjS3vmLejE6-PUc4Y0B2zCKAKVSvNndQiQNhauEziepSagGBmlY_3-7fPH6dk5bSTgGrAuZ8TtWZPgh9Op67RgE8znncktj24-MQPHUcmgNwzwSiAemtHSxu5CgyCmGsg03WBr7qyS0Wb-Cw-7BLUN8Je2M1S6NO7PDcPj2oH6htK3Prmhj_8GR5et9uaw5fmEiI62jra8kB4455P_P5ROj0d4-Z_hXQLn_6FMShhQwtGQco-GC3fQ2Tzwh63F4NNWa9gKPS7iu0djfMC1Dj79I6TP-dOQPv0H10Vv_3DbeLqzdVLqK1ct5i2EXQTzPJ1lI03IIh-d6jPtZ4pm0s_C9cQH3_9CRbPiNM3i4tqP1CyHGEKdE1dxmWZjP1WnaV74eRhO1XlKHKuA2SwsT4sZHxV0otNRR2Rvdm1tAid-8d6dgEqYZNHJGa22Py75y4s2Pgnkh5biol32IrxoUwmiGHxny6GFUhdEwhfWkkqgroDZjbPhiCq1uFNSDgYojc3akEjRGh3zAtq-M7ZO3qJp_NS-Gx6Fi0-emVtaRCjzQwM0hRxGTIqqnM7Al3wUsSwWFoEilX3hi2qR2poC30yD0kQiDks7962jwdHwzpYiMojObrHMonrzCiRzPyUgBNVL0xmJgHPqQV1hqQv7nf4urAYNRmOj-FRpC8IMO7ewA4kHxVdsbRUTTD-rmahZc6eiXehcDIhV8WdF9jGcYypZmfQmcK1YlK1KXSL4EuPdQEOPIGF8oeLQLTDZ9C1KuzX7Gj4bI0NA01Y1FhSi2LGzI5_wIKWsMDR-ZhYroZ58N8aa5YwOjj7dOTpq322FrkeTO18uhrQfnKOjOxugNd8GW0ff25RSlEZKMNy_cvWfLpslSHXG9YLo7wWW5q0-eXpFZ4JyTmaEf4q3qvg9mNMUPrphEStFVfGLRY6KkRafLY-MjbEI15-URHHB-moPKmfsSRzhERcNt6ir1Jwh04rfmU4LsBiLBWE7RjxHW26bEMXRVrhgBED7f2YQANCb7XxmO8_tFr_R9JqcL254fx3_juh_Hv8Z0LF6Be3rdzr4vnh8sBLV8OWTpEPuvVV95eG_u1ty_H53i1-RfXTktj1M_Z2ug4ls3yXG_c4XLDGB1m8lB1LtqzCkpF9rdhLVsiKBs38C4NhPNwujsaftuQlSrK5_LEWO92joc4YvtposzZiI5xxQypAYCRZgc4tZ-zIeEwbKVshXYpsgO-gA-rgEsQWd_vS-PT36U2ugOKNTecr2sB1iEVOoLGasSTP9yd3M6tymqkPntCdlAxTuoDA0NPPy-475nqlcPAUp86Zl3VQcLjmc20UuzJDWXepFC1iLCt-XOssOGLswapiogqo3m5uiY1wuy5IQx2cDO8ghtBlLxeMn1gUE0YtgV2-r4mfmx_Hvjeu8ItK05nvSxr77EIgIRBUfg3E6mgHvq-KPoPjYPk7HREz-267q-rrFxqz2UkUn-FkV1nKlRFkPgoJRemmWrMTW9EOfPk-IngANTai4CwUh7L9ofQjRiA0Kb_vKvpIIE_qyIDT60WJCwi0fif8nNhiODFRH3C_tT_tydjBfDyqKhvJ0qjEiaI_DdnqZ6OyJGSR9bscLyipYzYe2NJpNi99ifRkSBxidaVvZsqZV6Bl-_rtTM4zj3jt4Kn00-IFwwzFIZ8KX-WUMVFl48xGxdOsdHz9Ui2-UMY7TIoJXyKmwyf31-YuufJE58ntsv3SMJ4iO4WjDeYnNW2Mq4Nk0jYoy82uZ-TuL4pmrERKU6PA_TKnTlVJJVM_Vq7kpu_kg38yi31DDSx9Dq82RsRoKVFUUqA6koJ0Gq2LvlUrwmnZtp3Ym9kA4nOjiYUFfHs_YOoIJj71aoW5lhZe4xY7JgOBsuwTmHYP_b10HVeyaQ67e1CsClByZ-7YWygUBTXnjw-J6ink1ziesh_-NJe8wnATAqOKgZvFHXEoRnaBKXzLvyX6eX0EHlmmoBttXW27xRzudTHJd_A4UsGmkmnFC8MwpVHlHXROKvK6V_VnHJ6dFo7AkoTTRcBm7SKEt_c7NR1k6nX6A0c519f6R3lGytJGRI-Yf7btCPAHW4a1WpagssxjjI2_2IBN5LW3Rn6it8ys_aV-pa_69Vtw2JWw1R6h2TDeozNbKgJB3Hp3oZ-l0nBPdjCI3x2ghhzpU-moRY3KexgmxncBRzKigoo9ijxPSRBSc8IHalqePS1-HmKGIkuJlkPG2KN8tfKosEkiBKAFr_wiON3Fy8ngaE0J5C00FuFReUCUTnhJunxStrH1lhpoS9J3T-7VnED2n8aOnTmVQnCTPXq31uKK3Cd2cF2C7WaWZ56zoomkQpdYpI_ZDY2Blzbwgn316QR19EeeFpim0ZlXNUpk-Sy_0rQVRNLU-jXNmUYqKvxFGZRkUn0V4ZCgEU67lEnPhO60EhHP5EW35LDebAdQq5u6jnZkb8G_n5yYcqCItoikX8ldgjHMMtKzA2NLru0-DnBihnMhNzxs8bT9M0uT6LJ3lAVECTvnmqKeU-ZxWO6NVDogOcOyLZD2RDOKOnSe15EOd5DFrKLcpp3wTx-tsGhSv3RyaWGccFdEaq5XiSTxi3Sl22cwCdTa12DxsN4sR3QaC-kJPsU_LcsXNcoUtt7GRTarqzmfZeZrrnCuyL1zXpKqrKlR7oQ6OVkVuBrvD2nelAyIV1tXXRKuzAYviXlkwN9n2tVmHX83DzWmQ0XEPV_OIq7LN-tXY60O3z40BEv_dfqVHOs-j7Npb9t13wZSgZSrQ8q79Kk00AwoeHPUOSbY4A0n5JpnPjJ8RUW7FNQNLI0UKvamMQYIdKlJ7lwLvooyQD5Ry-5RdvknmoR7NwM8H3T2GOHmTvOcJEUCigCTcEWz3GIzraVLuYXL9udoIOwe8E2pJZalgb1vybNvZhc6CXmdnn9vGWz3n8-_UFxpU52CvzJc0syEm2BBTYoLNhjDr4Khet9slaBub_O5qPmyNL0qOk20B2me6iFCKlV2ha8wqZ3Q4EFYbq_KdtYZjtaIRmFnB9mJhDTKrGv2bSThSs3PjsYsTh-hCWZrn4757FYwIbkYCN1ftn6bpcTRlyJFHR11R8tOk4JWjZHmU5EMCIQIRhhfzLBlP9AVxFoxa5FGS3-e0CIAcPJiZPcXMjXjm6D2GuHktHxHp4nj9vMJ6qgbv8iH753751525hmX48l_wArozz07bImimTcTVeEup7osiyJ_zo5-dlps5G9f3381NvewXj13aYsp9FUxopiYyU6_aD8djwcTjsaNeUcLLOOEJol-TEF3xzNCvJDyfvMTk87SYZ5uBbSqZO5xZvjuKpmfSnB5ewjXYdxEmdl8HY-rXWPr1un04G2GaCNbRO_PmqNeU9TjTEQEYZaGf5k2y3iej0yg5ocztDi-QfZfsJzqJKW-nIyuKF8kglu8ZaA3K2mFsI6-S-VZH49fJ9JoydynTvprOpMmE2M8Cmw69Ma-2O_nsHMc2NbrLva2lSBGj2abPO4ws-E2yWINC3yGDn3kSxyswpos1xP0gpGF8Xc9W9dnEWYIMj8Wjn-1FiQ44BBNT6d2Jwoxdq3yP2MiYjhMI1BWd3RyYIWVmQ-JDqGg6NQksW_GUmWiTaEVRbenb_e0OFAy217kpBflRdskZrHapUiFYv4TMSDSUHo6X_JRdH1weCFu8UdHsWHwJqQe5qUeqwedgfmwNZePNbNDvOTgvaRtJpTQ3J-Lp2PAultcK7YhowaCBpO_ZCiH7JtoSOg7AUIfiGPKt5rpehNXHNB1-oypiRO0rEQYEhSo7vLmO7ItKK1jqi1wxRRQ1eL229Wxjg2phtlDSqUNuFHwh1HKCsiypo14SXhmlM7hXp8XaMZRSK585E-yEtuN_AYqS7xYLgsr1eiECQyI-YfLiLKmaEawAua6Del1f4Mm7NjJ7pL327pRQ_NU528Ws0VkFzLv2r6odWjtJJLQ4jqWPZ4I16Esz1c0P7fxXX7a_-LThGzMhJlhh6KAasJeMJtcuo3xtzFiBhkvT-ONvJBLMONWiyMSICFuvFSl3jInvCFXsNmYSnoWICBON11JCINTIbrMRnp9kbZaUk8KN-rB4MWZjX3zHFvqWpJcJqsvTpO0svyy_KOOyBqvTsD1Ih8Sisng9sR6Exr-YjlOEwChF61Yr98aNjVnGEZHH1p4_9VOWw9F2eM6wfujCPYwdkCTUwsbGzZgXbQ4kkT0NXKtzLJh3LJhpFKcn14TdMMme5zoXsb4EZf7OVLz1yf3n4OHms87mwXDeWy4Gn_459IhLPomtqJ_K1ArUMm7VzEG_nF3VVAfuunsu7KZ7gaA30UnLNYYRbODhQad2jlM4o4Sud59yyxd2koCJ2wXbjbwyYi4HijoxBL_hYSEucb8ZJPfKClSsjPyNyKahZTvK_f9AGee74fpgzQ-G0JMh-T_QrEF0nt8dUDL90IsDRZ0z-OQM7y7a3l0u4CzueIt_IeNfg0__-k8t51_IQcbaXVH-DT6pjf4_UDeN-K7nUaWslVu7-x8qcjRGsaM29HhGqTc4yvEF9YWqEp1dTWNnsdaMDo_oxCfmNHtHp0nL8X2j2mlRQmRRNj3HYZiGYU7od7qx0QV6qYnhwFO5M5n3ZvpWF2B4Rbz4DLw8P4FUJGB9zWsAhyOE_8geM-y-5pVGia-yWB8k6oazuVlk0ejbJnXPPHgtApWXQcMVnkGY9bPg6HdRUYowHp0hbbcwhILsg6KlTALkQ8LNunGVDCVuxzPY0Isw3DBg69liUfxb3BTZx4_YqZSPX4LMSCCzktClAEcdu7ybCXroqP7VTdTW0SZ0Fb7DAjx47GefS-vq93VnAcTmoj_ZE0B6XkrVs8_iPmVMvnHSib5nMNDDoXUlf8Pd9AfiPDGA4kdk3XQA0zaY6hHHBGqfZ3oSXw19LuGxHlolwYA6Mxiw0odn-GiT4J06AWi6s6A36H-22J0kc_W_3VOPPu27WRmLInvJQEbEifEeyu6UG_nK1d_dYh8d_OoW6iMklObNOY5yvem0OJVt0mh6nkEBllkVYZCx6jWy80zUFOaLTlFuM3s2yNhZGkqzPwnCeIceHba8I99ulCNXEmhbYY8qn7aux1tz_ejw7pFv9oi1BMPU0MonnoLlxlDQhyvdwKRQHw2A8EDLUA0f-Gsif6xkNmOryUwUnB9ACol_nmHwPd9MzY6ZmtrE1CbEC0MXsVZOguwxKKqNjcQ9QSoLVLPvzeZZ4OxeB9mbyo0elgd8-lyH1z5B6DWAsBHeQYdu9idWkGbSYkfFw4DIK3vPYmaeBZGLm_EnUNR4KmFf6hDoJGcnnsRar3nDpU9sg48FfRLME8iBHQTGc1SejXxn63PR_krMwzjOQQCOYRUEJpVlcDmL-OjtWenf0NPbyhjaG_tUH1oiysuuz0Ep_KqvRdD8zT5E53GZONbHsxO0EZ_RPmB28t0pPZym07HfpYqMbJF4hUJfFS91MkMfjArgIczWmR55hz1CZ6rvRLMiJeIfA59bTcGAOfRNMAvyhGE7Qwj8fgeVmD3iv79Uhr1EHJ1G2WM6ER-yGUDG4dMkEBXb7j022XJe9zHHzsNHj588ffbTz89_-fXFy1ev3_z77eG797_9_uHjH9HxiPpychp__TY9S9LzP7O8mF1cXl1_73R72zu7e_f2DzY_O8PKqsds4t8H2SNY6DT60_GGgUU_v7II1GrGAHWI-mGN1hQsIPrJg6zvFQjv0WoN79_v7i3s4755suYG1Jjb3dvt7nbu9TYK78GD7j5mZ-D2dvc7O_uS1JMkIhSlzB6_721v0N4sfShtyJEg2cxo9ggH02T_dGtnO6oKAwBrDYL293FS7It94fZdN9raWXS8lhu1tje2vX9ue_0II4oHCXU9wBxBqY5QJjSk3sItmmnUxR1FX7BNBH_idnep5_fv79xWtrdSdpuL7i2a5Sp6kMb1Iphv9_xBr7u3193e6-11E9Xdu3fv3l73gM6yvR1_0LkaHU96ByO9s7_T6_W2e7tUpHNwsNvt7vX2e90ulev29lFwb7TX693r6c694-NOd6e31zumAvd293oHu6Pd_XGiOlfdzs3_dbePE5CdCBwR9Hb3AMV3JSZXlIzTM9dbdFT2oR7f0BIhQSchzrUDPXeiZtgLI3qb0L8x_bugf-c2sA8l9Mf3S7OJ_kUrOB-MVwB0jJhQDJ-nASEynA5UK22R8yHV2tvd3XBHwQW8kTa7S98cvSzccW12K9icDcYBVdX1_jmzSumWO-PG6rZqAx1aqDpl77Pu3qYLzYO17GjteP_s7t2ErB2iq4ioQlyZ5P5236z3iZv9DJ8kE1Wno8r0yafu3l3K7O559F2_IBis5clGMt_1I8SKsgBK9VXQIvEfmn1GzK2MunDilrXAc7saw-YODWnyqcqnAS0W1BHvPqErqztuDq8jXUlYVb6SV6D7ie1-veLVjjJG3Nu5PUQLXrmRPJA4mwTqhcKIBqma0shfDPKhGV0ZdigNHsUnz5OiHeXo0Ss3V276SdIaY_TuTsv-sKlVEYp5s2sK20Bhz181A4W10n-ulFgJJbb5oy89P63iDW7veUtsqI_BnHjMNKPjb75c9sGHzVknPbehutaKMvobrIrbZ3ToxOdT4sjWV42lTURK4wFjfTWi7IQtBFjC5689tSwt8a78IbjlXGdiZbFmqxfWOm9baRZHLVlZaUIqHgeJWu1bGTOMdn8_rS0P7d2c1oAYYokOVo_0GbXz2XEk4EWUc7-cgJyZ5rkxtrHhevvWJMFGM2LLhJrLqj9zuwc9TwIGieLfBq2kLB12D3b97sFOo4CJJOm7xnux5kOzsfED-3fx0X0QdIhpuB90e_c8mNDL-CQQHGU8CDa3eysZD-QLwkneyB30OjuwEq5lEwLr7ZeVcpH9lSJSw97u7rapY1fpBw8e7N-oabt3b0_qwpOp7eDWwlLnTu9g52DvHp0LUnaPy_Z2-Ke794Nmet2dezv723s70lb5Kg12O3-jEjON-zs7e_d2djr3tu91DnZ3iRT0rKn0Vtm3PZzu_6xe-9xKVxXSSiGtFNxKQUcvp0aSGnFqNPSM0zT1vnO1v3LucV86V_cmzf-F7sztQVEDUYHn0xKHpmVaMdWp_3_o-Tx_9xSt81_9sx1h-3reaU-ImoQ5jysyDN5zj2aTCUHdPsd-gsCD2e-9HZcDXFKvOtueGrkrGzWDCTZgrwbqRk7k06kLF_EG8cT2yRXdJKdY1k8koFvjOE68B4DOeVHF5ioDqd12OthK7xKr3_V3PLDthCNgesrogRc5bx75KR9Z-X3gm3k8iHCu5PAxLOJkppecB12cZ_OIblzQ3i8jQuUPCIIOdjc28vu7e9u9Dm_ZVit9EGRNnPn-3bPN_TViMKhhfy2m37NzVoDlMypwEhXQlsSZQYrT27o5lSYWi-mD3XvbO9t_1UCuaRDjWuWoLSLsnK11rpzWtDovQBc4axEM4sb6as1ppfRKDBFiqGUQ-EO9xYhgr-W63U5veyMnyrIL0pbfEKGknJ3u_qK306kn9Db2thc0vwKD9YxFr7fTr02sLWiSiDTP-d26gISxH9cxeSSgZ7WMRFRsd0NCzXud1tjzx4z_ZPfcU-MhpzA-k7R9NeZ9Ojb7qHvACbSNx7KNy2yFqAd1ADfx7oxnDNGKch74DTNbhB8I3Sp6NUt5wGy63haxiGxSyZJhSn4ZT6exLBnxunTeMc4v7lf4R7DcDm_pW3FQDdPZr7v3uvcO9vcOCOPZEDpdvXf3lhYFuwnCyFB7j3-oPfzsqYwYFHroLIo6hvxBPyQq9n9tr3twQDitalLaoooyrigbAgfCexVr7N_w3pqynLc-4RUqWIlHxBmPp9HZuR5zfui6pwFEwjXQMbDSpXGdEkSc1mCle3BPnXKnTgVWugf7nEB9PpU-l9kEK-feSsee_6BflN7d-1GHb8-hT7Z7P_rk9hxG43-Rtbcjc8ITWoPXKmxlJmErq7AzHHCzaLWaJQo6W3exFXr7LcRxre82AqgSPni39bZ_BD5K26iJHEa1bBWiqxwWzjlUlsv6qWMFJvDoiTbYRa4dC40K-7W3YqLNFqu3xJ_-Udkwd3-U5UrQAf_HJdgtmDfk36GcoSXD09q_nJalOlvOv9ZGUWKUdiUZzd7ly5KCndpwVRXX1S8XYmfn5kJ0Vhei-0N8Uq4uwQLYxszQ2Ai3X3ZgZmLTWNHJ_ZhY39p537sbVf2ivL5X3A16Rgh9k7_LWNUSgSHOltEgHsLwudWq2hvdbK9kmX_cbDk3_5vW-UWzX3irnN2qJ2WksEJlfVDpcCZpkJBZg4T0EMXwPzbCeHScE52gvVp5cNT_IZKszNde_XPglsHt9OcPEGgNTiQYVy0mLaitOi6o0YBsBb5KXEGIbM699Vow9jKeTbkI_ztOce34mogTPtHXXGEa06zWsAcecqxL8AfXyI57f6s52Vm1JpqVQVerz86La1PrD4-T2-fjJmPKXh1JxZV6JgZcBE9AxgZZEFVilaziRCO33MYs3ejXznFm0iwRZDKYf0MWkYEma-YWYOs8W2JnR0rsHtgSI5TY2SlL7JnqD7q2xAQl9jpcgkgattCvS004eZuTb514nmpQoERljrprxrDAVLdTq06C8xCjXE_rSNpevdmpu0m8j6nh3o2cnsnZv5GzY3IO6jnjqrYeK-abOT2T072Rs2NyGlOSuzZ5u5m8b5LrI15LXdvwbjPZtrrXTLZ132sm27obI47Lug-ayabubqeZbOrudpvJpu5urzl-U3d3u5ls695pJtu6d5vJtu69lbr3THpjmJPaOnX3b-TYlg9u5JjGe43xjmrf9Lo3cuw3jVHP6t9s38gpNxHxMLyJIGuxe3Szt7tn4sbYK2NYY-Q6Z_nJeTT6JtjId8BZ37aDxPgExACogBpv5iYc9oLJLcJsL2FmeKLfoMrjOImy6zU26nQF_9AHZRB1x7Nol5g-wrvM2oHH6wApUu9hq0P4sHTcr7AmKI4SUcXw1KlRBnRU0r4tNjfXHnT64OGtPM0isqwF_LURQ4CxAQ_PbDNg8R4CiAlTmN2F5F9RSfuNdecum01Xmi1b_BvfwklrXh35pfBDt4_5vFMJTROG-5oN26sQo27SCgol4B1mYGMMMU3MJ2JUMWDWMlhYggzjUlGj0mAAMi8gsCMCIIXYpC-CDF1xtAl1pHKG5bajBqGFE5yFfvDS4gsjqhmZL3HTg0zJgE6TYeOgadBPf1UNnV9lNbWz62Y9kx8PKWkMwV2NvUOjChxHFBVUoJ89SPorMAP5qAh_5Omgu7ER36etJvGZfiBcEVughnClt8lgnIveF6KMOHC3uxsx68b2tjekwaVlnWNifbe5rR0R5SSt7t9vbfu21rq73Fq3t3DL9n7c-vaBtL5vWu_9_dZ3bmv9njS-32z8v3bmL1q0VmlM-EiLiAjHYqX4L8RKjLo8iNRiK1eOWsFtuum4EmVQ0W63uwPT9XhThFDqR18R7dtZQBpHLd9WgIVV8ULEdP3_NkwmYtgJ6vaR6auR1uN8DV9192CjNzqt4n5FYE9VxHcf2B0zvm3nya4DaUC7YlrTWRBGZjd9qy_YqdPYhlRk-9b7BC2QzXgtjj4KRXn52oOyXN70YLvEjQYL0pTo7bsFr8n-jeqzsvpes_qdRvVVY9tDcCEeomwCmLaH3t2Ke0GBnWZfd5t93av39d4P-trKtrp6j3vMRMqPuvy3ZyTZDPb7MptM_vxlq7eSvHzgmvOWcBqdnOPIHuE4OT06Ef058z2ZQmE_WkpItiSYl6yIX6gaY0IljSAXyfyQEX6Hiaqo9ILEeHANjCOXISx-yeEiuVhYQsMZBgn1AL3IPjK0zRvN_KFqL_9eBu7jIPtoG_E2Nh63P3_W-ct0PINacPUOMYT3fn2ZWP_NNsJ-uo8Rk5vlMY4XPrbOw_5jlXUC506mJ47KujUXeraqfuFnIRyRbbQh3OZI-SaGv7WI-U1syDOOQkorVcSTa8Qk7S5X425JyHaOSwNeHsFVEjjozxBN5gUbw1NriLAarXPkPRMKh8PKNMKHT1lnyhmwlI8QbQsa_6hxsQbibemGspmqPJSbBr7V4vG-EOb1pB6ilzlPQi_wN97YQKhMdtuWBLeMxMuSluriFjdFmA4xdKzqGmSdIdhV_Aap6Xw5nIyt4ef49dNasOBSbELIGkaapemWlYCwXVYLVypBAAQCCehznU0GbxO2WrZ53dy2cOu9CFUIcRuv2atHImKjN5Y8hrnYJLLoiT1QbwxsWDN11qV1v_hgE4X2b5djj7Glm-fX3LuroFUwd07CHmKf3pKLz8sCkP1xoShsRtvjK1CynaatCltangh00cTzZUL2vqQBJw1hyufa3MIkBlo1Fk7dEjhuNTZTts4xyxAjuIySJDdC-OVllIkJhddwb_etm7XMTfYHux5gnzTvvCyx3plwHnTujXR8AakkeJkXHCab5sDcVTFf1kK-azX_mqeJD30eG4AuK5rQuJ_zBScI44urGULx45DeropfnpXqPrjcwvhmxfYNwavC21f61hXOeuxyy47vvrwgkpK5BKkog27T5JQlVePOPzN1OwwqVTw4_uVA3QPGTrQiH6pzflCGeAn_7We_0mHhVo17Xu2WrZBqjn8koqK5yn6S6DS8P5qNLwXrWLk6jN-xEvDpZIRCMw4XAmB2QapmtO4ZwFRurzOLB1yrmik1XAz_aYLqVjIsL68SM95-tgeDob2_-lBooe2g-A1xEIqP1tHjcJTF50U7z0bK-QfsendNETfbpuMdYWY8RPeinP2AknAFxkGQ7XJe8dnN9sGThW04UavsnvgXuhkR2tbNWvJC2lrj_Pe4OKVMOO9-pNXXZTg1uO9fYW233E9uGByFnrdwPx218bzleVvUuo3cEDoeB0BJEPcTr-zNRR1MsjLhLKHzsW_fZrnR_A4S4gIjghHM1yCJVUIAMyh-VsXPQ3rPVTIdBsVzXJAkJ06CqGnFz7TbbWn6FDcjTV1-B0pK-DJT2ieJCQKdTG5EiWtL8Hlv9ZLbidwaFZYFfM2hpgwCwPXJifiwrKUjXrGxo4p2PEZYaG5jSf0eq-TC9HuQnKvk1A5C7i4946iqZwE2f3KBJ9pfybcymnRyzcWOudhxsI6I285FnMfHU77v1cYvaXNaDEfgQ9yUjepO6Qu1Tvjl0lbXT8Zuci3whqY6CnVSg5ccb5yOueSbeepnsWvCwgwcxDk4jcea1muSaf1dO0PGJAlHrCbwWymbn6aXVBbeZ2f1sh0pWwaZcapei4udI6g3ueYg2ckxjUI-oxfMTm1qZBCH3P3ntvuD5KFKntopfhcQRM_LkOzci0Oq8qlrv5PuT2rW0TsSzL2K9o4NqpIrdjhYx-eu-b7D3_MivWub6OAsMahNxoRGmtNMSKgMmonkqj5bzvF0lsmYqY4yInhjkiQGz8AhEoI-SagyE6Ci-Ya4C6sNJVeumaZXEsKXZqXvfg2OiUA5FmfUr20IhIJNOI3iyVFfKe1ddBxs9tg__FhSDumE0TD_hMMqP4tvcPIavsHH7Lc5TWmq11Y9hFXCvinJ6yqSIQiSjGnH5KsgpUZuaLyCVfIyKB67xiE4eU2n6zUlfq5fOGsjBphotqVzXfK5dAT04N2XPK6cjY861iFZngrjaQ2PqOUXlbwP6rYLBrMddZwyKIV0qMWxf2Elz64wthYfN4stCfXcgbH0M-sJk_wpkSqSZ4QeYLDacj47reQN4PSNZBVjgNNmFdU1eVbF_CX2cnsPUVlwiXnN4pGrcVut5E4zXSUcfo2t-lNQy2_ZqFgYCZ76t3InxK-uY62TN_GwuYM_-_bV_s9RW4NOdx8B28AEuPpu0PU-Jd9XzaJoP9G0bHR3HzzQWzteQ3hAjT6BZ0ryezCPx37yTJ1q2jTHOip83E1BOY-COQtZCPByfz5Ing395Pdlzbl2vgRW_UUlv5VY9VeV_GS3_As6EVTyM4PIkwGgwKO98KFE-skfVaxsGF0REanplKHG1bbepqIvmZagmj4GNX9dwroDQqS2Rpxwf9ShpFaMS7D9HaincIVNTz6yueI9N3liPZIS3LlXKBMrTYD0wTH2IOHrMkymi28etcuJ4Gu5XrjCXjvn4od-Hl1P02iMsIkJBwhNfkJ4vyd8T8Cyn-TWT2FOB0EmXFt5VWPh5uLQcVikGSFxAM3zQp-5zwiprWRJnBeTCyhP2ImSQJthuAmhtZtMur2DvaaNe7MskeXjQ0akPeV0HAYYxID8jgCANI4y6qtMEx2Ax4zAcOWtm7DzGt9KUy6CZywAV_qf26EpTdTDM_76Ru3rtvbQBhTx-H4ePppeBIZTm8NBmVHfjypnFgWhdGtlGhMIvqE6E3Ip4ijDVjOqopE-KxcKHkRt2ne8mS0h664jvupiwVFWiYl4Jtf8EuktMBKX0JEuiZfk60s5-CfIiNjLzJ0SVEEJVXB8Lr9KHi1VVMknORNfbmzYTz0GUZXSxDN8pxW00olWHW9VHQK23L6xUcT-gBth15NdUof4qmIG7JwBuysL7BTRsemO2SklGlERPkjp3CfaGcVUyrGnl0tLeYNM4PORCvDNBg4hIl7mzd4uHA7qZIS9eyEA0tjs6p2-_o3aC2sNVlwpZHKIIpU0ewQ_teT3don9uK7aduZelhP_O6L5VTQK3LXqtEkk1PDtH9NJ-HsV5wpOahWpUmtQAGHJIT7tLSKgBu0LnZqgHTXf2CbXjrCdD9Pt_1ZJp0TGRFX1LDLeCYBv5oXxMyuCbuVpJrIsOlA5OHUSdDvLGtMcyYmYhUnqJ5HX3F8WL8ESIaZDVu4nuHULaoU6Yj9JPNmKNM-touY2ITEiMnj1miiwedj1Exu9sD-FX4hx9oVaCW4euH4HURvv831KuA0KbiyIDYcIkLL1rELURH9Ef0ClXUQiv8EXxVYPYjVzz05mRStzvqemLB3_GHEg7hoDMF8gRJM_IRboFjxC7M-cRVASf7AoUYe58Ecu76G6zO0U39zi2EWwJk-NYIroLYXayjc23ri65TSDKkSjP2dxZqyzPPdOy8n-BOLeq91fPCcgHyFWS8AxywUAEPi3sebs2UQF8iAzSXlgLjIgjBdBEGavkWCuPQctLmtmLkDK-YYqwjZJh5UQfLeEmwYRLhnBRoEEK-UVSQgsqE7Ysq3IQzi4NssNyqs2ZWKSHZGI_up2lVzNU5hg2nl1OdmafuVatCKfTTRcKmgfnOniNB0bgVMUOm9eH75zfOenp-8cxYQIYtVv8hMl0JQS9R9H09x34mQ0nYH9OoNA3BmlGTEVhD3GOiOKyGFny6TYhCUePLz1VbF1Po3ixFkqcA8IQ8cXWptYDA8QkcX2Vxx1qNe1q0gIKM6JGdYIziCDILRAtRIoIIh9KRq7jLLE_fJW3EmhTcftJWuTKJ5qhIFYi4oCVkYIBN_qLre2cbGJAbJj1-22Cu9ur2N5uRRr0iQmbdtRzUwfV5E1ukQ7N7VkVkhEAKGMSsJHm9JNPf9Fv3HH_JQOgx5iNdOwpyCU-rnL95ok0UV8EtHGIQySjB8x1EJCR916NE2P7b3o4SBmt2-LcWsTDl_hN64jn66hFjMftD9A4G4HA0c4IwWWzoFDtDAOkJVIXA-wb7vsf5dsK2dkgwA5tPrxhOP6OCvR3ogNNBGSHONhrfgkSzmWj71sRyX7Za1wwak-4-IT-PGi1IGU2rUfEtefZggQZQ5sKnLPSspVpJv3vuOwLCPvmKMS5NU9VV6QweH6kvccqEAC1KC9YoiF0CXFK6s8Y0m_Eads4-LWpBbfQj8ykQd30YDcJW0unPHMvaueWrkN1JgCRoEQiXFQRPg44i0Sh3KrNRetYrlJGA_7Ru2uRonj_GbSxsZ3VMFTqIoy2I-5XZCIhpjafjBnnBiDpFOIgy_BjrMAcwM_db7LC7QKzl_rZVwey0qzyTzPC5Olv7r2avRyts39pbLJ4nLd0jJU8z3qiVbiEFhYjrqDq9ZmAV_baaODZ2e1lSX0OIDKhVjvjIMNMe6Ve3gRuNjcXOqZocfQDf6qgV77BtvDbzUHbGRWaitdpg1NObPAbP9kz1wSvr7ucvG8Glt9RWU9-wliZLQFrkq7jJ-JzSHQAtBvbKRcgvGsFIBrjF1bPuHp8PsP4QM3qkfzoxRzF2Xb7BWCUWY5hBAoZjSPA4B2pATP-mMb6mvZcFNYT75WarAB7gelnYkbbSqXrWNXeutZ4oO3DJjTqm4THYxljVx4ae6lmAmsQaUyc6dq5M6wDNy9Gd-bszS2DmWPdVWrhA5TEpzHeZWyIRcMWKHidVrZpF3eCeLmHg8Md7mW23Ze49UBPLxgoBfHHGXOxKCDnCRsryRRNWFF77OOD1H6y5tQ0F109pk7U9UlSQQL-aAY4koIcFllR4jVh4NO87aYpWJ4k2hXPEYEAfvfwHjyN2A8MZy9MhcaMDjXAf0m3BJaEyjFTaU1AFUCK7Ww0hIe0B7fdNa8YLkbp8LCzdixlbHYrLspwZDEozGX-a0G0qtH8ivj7dVC-ikrhyslaSz8Ekla6YYMxdvcAFMSlhugBq7l5RZGy-HPlhINg9Y3EmBd1k7rwI6Ysa45IQkfC57i4GA2MSnzFV_tgiBgEJnbVNw8w5vtAJsNN7ROAuuqHj5x6_imDsUAj1kZJI2jqP09YK7DMszrsJsEMdGa-BVgR3WYRTTI39yJqh2qfJd5MMM17laoifvjDZKTeCIxrq7RS7494iaIL5XEWg3MFbB8AstcEIMrxCcxrUXLpcMwVgyRXhjiXKFTuSSeuq5bmxi9bEKyYWPp7Pouakrav2WwO5bQMGNWJVHFYX3odJpnaoTDCmtDYBEVNjRL8aJSmQ6Gxm3aRj-67VArg2uGJkYnbqAvDMUm8btazudSblYLuOkjOixiMmMNfdpfhzzjaxoRVXhrSYWInZ8HloHkC2Ij28nY2lHegkDi2xCIAJ2WoC3IsjLKFcwSI9osbTiazn3DU_Ao_blEJoVIYMmZ2YWLa5mFLmAenHbl2bkvdwfz8yYLXb1G8MLo74B2ydAlEE1MS05vPpkikiGTNJyGu3I7tdpjy_DxRfdB_W4oLE87Oj-fXnPomqdXBQIe09nD4bSrccrkyzhrx44NOmYEdWo9qozSWWkde4anm1ckJmEcuc-8vEq9ErgWI7mjOrF3MEDTs0qd5qKwjqu4ihk4fiNPmrrgEWROWFQDrfp5zSyUqQmcKWW42GKxyB50d8EU2SsNntGGrAieEh0Ubv12RDeubk1UUe0GRZUhUHXVQGoF0hsbU8hVa8ODmKzWW8ARQ5U_5RhCb7BJ_LLzUzcVlWpjgPoEYb8zXkL-QDaPvQioqxIr6aPnmUTxyiEIqEUsYMsbhl0c3_Lq2oAWYTvOid9N2IuG7xv2ZkakaI7TyAZBG8SIaVFM3IIDqPE1JQMxsd3YWP9OlFFWcu21Zqe4oSwV96fcqvMHRo1DCUyY886aEVmuoqy6ditKakoB4CQW4-SazSBfH-cctLik0DmGqHB_gygbMh7ngOr2yswb2kv6TBC729Ra7nb4munSliCxaJNDI93PwszXD4qwKG1hXAn3Npe5QEj6D2B9RjaUoOkbgjTRhJehnhDtvEwWn1YiDICS4oR480yPcSXHR4719hHh3ASG7S1XwQc6cD_UY9QUP0EQRn-G6jSILlnoeCLKXJW8wk3MbqWpj_4ibP7NcO9xcEuk9-tgkBCaKdJzrC4eM07P5OU4LYr0zGYh-D7lDNVZcD3oDTevgbaP6bmL5-2hugzOtgoTax-3K3wLjumd48_j9TAYhYN2b1e1t7eHxOJub6v2vd2heh64Zw8OqbK78WJxyU84F44lLVssvkkaIHVC8_kc92hPgueMyUewBBgFE6R5DxDq7pZIXJsEEZ5xyB-rUxe3LU5lMR6qpzSRPCfv9FXRf1rdbFGqmh4G89JpPvef2vu3jg63TmZlOYXLxuq5x0eXraPjRhHwDbDIrhe7bN-lWVkPhy33KOfoitUHS6_NtaIPbcgvaKHhOB7s6Z27lMSZW73tfeFnNCwSP4jCQPR5t0Fs9p2g3aklOerjj-DbXEEhYp0q3QEC9DO-ERcxPPm2goyv-KDeifOEHx0iEHFVlz9WEAz5D_lqy_fUiY902MoVHxAxTmszztzBVO5QECKg_UNUWoiNxDzTU9DTnI9juqRa1HgmQV_54vRmj1ArnmiK57QL_BzBHQmsz-LxeKrptcuvshHotTfk2Ki51ol_gQPXYwPed4FsD76UnZ_8jroKeGdJGirvqFeB2Q937T4BUI9oxBfBOV-QCCPSK3XVOvPunkP9yQnv1LvWsbdFCMB-9qBLGwn7JRcwfh1clVtPPQ5cVFAmQLhCDDvmdJsnazDnARBSKaem05iYDvGxJdLBPfW4p6kp1kKnRVb6-n5AnfG75cu93Y2Nxw84ET_3duk8oplD_A1ChDQqNr8OYDZHaIP9yHtDtlLcHppnLuU9-IvtzOVpxjASEFWtFr_WgZert-XsSOEeRHUbqxkc6_0Ix03gzuO8Op-SE0PP851c17Bp1MD2vxGvbU-caxecRNFO5SRDjDgcgFHtwueg-ADzjYw62a9fMzlfsgm23M1R2Ls4MpVmgFlZkmQZaKLsi_sZKPqwHSUnU1yp8KFdKxWGHXuGbR5gPQgm5BczxIq3gAgkiJHmQrZCKu4X93f2O6Fzlh7HU-3AM7zb6e2EUJZNObzzWOffCGYdJZ335-PzzKempY438ZWevkUH1I0hTKNknI8iaiTi6eAQ3oydSkyCKxo_Ryc0BkedRvm7dEaUVCVrPouuOOkNTHnyBx2-0vEhitcKlWmMgfxvYbXfqQcnM5hdQdhSfVEm2-s1S2OWTY4ASt2LidspP_eFL2EMQc_doTqnk4EOeJ_hHjaLdMgDn_sQ53uC_b7jruR5HCWRT9A0bcN5ADjbiIg8q2Eav-bwkoQ0mQH5gz5Tcp-KX_oceDZSCCoVtAqrEODPiDkVFaUmCvFDvkTrgK1mOfyncwoLe0_kws4_4KtNVF7RZmWnGDc6X6OLKGejSgSTjXLDEx-wJDrIcEujczwj1JdwRZncL-a-xe2CDx3lPHr_7t3rVw4hcef5qzfv33EfNjYof5tDm0q4f1uFcvLZ8VlcoHwmVpXRtBY03Z3bi53KK57kxCjeSURTp4gLgtby8iliDzg5Yg-DMlFXx7lNVF3iIBRmhOrGT1iZWYBKH1EjId9UVCmHo1l5X2e3ZLZL2VsXtz8zXeg8f_lTOfnUOqNBNwnmWu5G86MpW60v1QfP_8hXtEYj6yNwaQnuy7657Nvl67IDuU1Mw4az8Bhleqzuz54AFSUzCCbo2WkEKnWMVJslBJIPnQqr7D8MCJkibujQUv2wyU-ILHrjfoFz_AlfnlHZq0G-CddSpgp0tubcmZsalg6EatC4cyEE9y5Y1GZcqaIEgd_Ezz6dGPHAGhHTZ0AN7S8ld1m745Rj3QuHWTtkPvZjJsVpAA_EqtpNcK9km6_YJDZe-uZfqllCwAVYPtbMGmTBB8NgjjBImv0cbUyD-Q946nkl5oDfw58uuNtSNICbLCHMuaAuCfX9ofQyeEakjDswdyK74FjbcNXJEPYHPAwBxAe-NyUAwaNKlYKGHVcpyvDNpb0Q7NMxua4FlIj8XcdN6bRIiHmPO0OaF2rTAtOMLol5jLRL2HCK690J0cjjRLwkhMX4QCxG2W3jRCCR7Kzjjlt8UGaRlZGOXlY3vsPSlXGkY-YdFns8USKnGdUkGzO-xEEUVWK1Yw2_ai8PurDT0VYkpK1ICLEPOrBc0jWRUFnAelRwob4O7B2rW58G88Fwq-HQkHl0ZNBf42b1oW8ELUQlvzEsp3gV8N4XyUvzPmj-JHrLCgqJox3QNuTww_ymGFmVQbvzSq0RPak591BpG5KYRmUe1Yeq8C-1wknwsZ71oe4kRChDlYt4vlhEvzLaiTiA90ffzUtHpA9epYdA8Om5CWi6JwOXL2DU6HMd4eYuPf1sEv3sIZ4OOr64Bqy7xGJNrHDkIhy3uv7E8jUdbNtT2mVzE2KV4O60P75vC_THNuraSTAZjIf9E9iINQR5RRieiCBP9rmQT7QjuDwrARyDQRxIWQDN1MXC80Z8CZFb1Cb-N6RXmtJTYl7p2auV-FlK5LUSebPEryjBKhYi6M3dbbXsRy5HJg-MZ1FbW1yCembnWCXNZvb1rHistER7Z9n-AH4WsdwYHdI6KBpvVRoBkPYYtdiL3esQgc5RI3VBzwfrvQ2zPVwcASd8UDnnWQqdw2OZPsJJuL_2gychkxCXfOI6JnjRZjXHynmRRmPcS1GiSd9RUSX47xG1PYZs2oz0Elp0op-TaLqp5Q4bvo3e4KBkY8MsVSUFTFiVu1SfP8f5O4PLPxKOxCUb8QlR7LjDhfiPS5oj8wzrc3uXjYQbj4zkxtiqwRnUepFnz60WQ6DBmCo7ueVjobH5rIz-EgIjdWuR97UiRj3w85Itez1RHvWnq0LhIF5NUTHcJN9bupW4iSgGnDSTcQQQnqZ28rpc9hJX3kQu8_mXRusXPWM2f14uEFgWj4W0irU0dix8zwYPxJnymjrmKgaWGi_FhPOS6JIJsy51WjoaB-WMiJ271MO0b6Yzh74qLwubX1YqHt5brP0dm8YG0QRnBSSGdKDVi9aWJhqLMo1boRf6sUYRco833xNtruyg-fAT-wLNc8BXy4JIphMxOofkjGbt1PyeBF0ViQgt4iC_0ZmKjo11XnRZk1VSeWK9zkEFy-Mp01B4BEccySNXdFLGiNAsQyQqFpckgmr3TdAo45_CSZmJI4WNImainCxfq6gMCJ_7ESfxQL5BFki5h9L3b9z35yp6aPv-tLognEX_0RXLToxshJ06oudMQkbvSlXRoS5UdFW5zNAqmOt880fX74QAJ8TA9_yCPXjF7q6lV6sL8uQjnK54x7EruxONx44c1R74ABDnuGzMETM9-DedA-OzxY6GJ1Q4j1gaTKDrG-dIa1xci4n02sT60g3F7yyJi5ybaUslihFNs0lzPzW7iPMHpcWJ-cimPyB-GF_69stl6UYqhKrcKYJBGeG3MYinw3bXzV4rGFfJPRs0WV_NXVKlCJlvfRqJZZqKXpZ14aIcuRF5fT36aqoqxOHPfR7YqlXtGeLkN1BWPK9JqJ-XlT_37K0S6Mjn6ipXe0Uk8zv2Skj5yHcfItCovKD-Z-5DQS6rXyxBS0fvzX0qK1dW4Z7yoaW0O3VmSenSlNUOoy8xYvD3K6wMbeSPD5jSqBoaTwUWcEq0MC7xgaRpist4ViXv6wyQZTqde2dpgYMzCdwsDPUOLHtqkk7h7fl2lYipKBmiMQ-IYF7Sj-yssAostai3nO2VSWL92YyViHFNoEmf5uZT7oI7DfQf7lTdoj3o-j0sm6nUrk_aqF6tr8sVsphvIW6J6G8Tfo6I_XjD-46eHa8_4m7btjVk36JOTuunS84NgrJ3bDtlwzhSIEDkFTQXF82M17viSJHcLjikK0iWt3CH-oi9x7kAeJ6YCNRwXq5o7scK3_jlF0sLXSq6U-qP-i-DeWLNLfxuTeCS-z220CG6LB7l_o46i7JvfHGnv49L31nRgVtBhBieG5sdn49KECgiO_bnfJY9TtNvsT5OYd2fTqeVRftHWmVkWQZDCj6WygJ38Kk_vOtteXz09OuK_27JHALIOBaku-UOos3vuOPJLbKZXkwiIt3MRTFyZ4rrIAPoFBrMYhG85Jto6GzG1VRqLle7Fg-6BCOdyialWPL_jHHXs2DACzmSG0ccJfQodc1oYeV4gEyucKN3Cog6eshnQ1dve5VbgtK3n9B1akIeV89nc0Z8w9V05nReLL6FwmvGLLUsApvju99qGcTMiTHOt5rBgqjyseGNLqBUv7rfOCSE-ZhmwmMiyRqCg0lMfi47zp4AZb-fIxyNs7SXBtI8i83RzdL0tFK4LyOkZUo-_NUHhvJp1Nsgo25WHYb1sg06tSpDsH2cU49r5Oqttdr2IZ60tn84ImO-u8qq3LMCTtQR4s6kYvzEMjLCh-KHMjcmSqm9ajpXfA_1lO-nbnzTIgQCR4hvgRH1CoRU5hYsRbHUpc_SA-ot-75BOpfC9uTUL-vEG0sjiESuJePNYms1Ts-iOAGx2-wcKpZ4-pgAvMF5yaRklNJUXZWqEKKv7HVdsNPrmP34rT2Js7yAL-hHz6biJ-NMiL0J_7yJTjT7i3_4S7AzC9NqZUtrjVa8b06lBKJ85g4cmX4YPOtxPDsD8URTGcUnkKnC1xUpgq7hXGwowW_tWQG3_fnSIw4SF5nPBl8o6TPESF-G4p7hqXUqaGTk0LHQogWHhBLOq4uSmRqovTOhKLEniE6kD1ynqsAREco3QntypTeMSe3z43RGJ-aN9opfXXOD4NbRZ1xttoloOerQ-ora6hk13uguDbEqYKiIETZcNC63K52C2b3KhdgyLx6vHFYlGPF0KPS7rkbkdDjR_RVjUxFG0vaNdkTJiV6sUzdG0qw9it6aQsGcd8DIwnOWUkmahgZ6hHW3pT7r2ND95qn_rir9ZlSlFagfGjXCMVWwLI1OEubw5zp0iU8iYG61iM3x6Rkipbpv3nl6jmPY-qkfBg5sMzYJUi6jjLBR7Hpi6TZwcBAzVc6noTNUFbd1GsM353qgW4HD3vrOsF-mDasABcYeyjV5oIoPa2uP1kDZ0I-aN2UePlHZ0Xe3MKIXyFmgPwJmCQ2imqYnuAXZJvtViaVfFUlnBaFqRXNiRbw4WdfpqMueMgWZnfMPrDABVt9KTloEHeZotnRQ7XQ2Nh2J6F5uunRbctB86oPtqNPIll4z6ULIyz1inMScyRLeAvNj2IyApBKDLlZz0kBAlLMxost8UExwEN5olW34K64jubULppAQyEnVG6b5oMlkelHLg-kjf8MC1UT6qkYRoWb6mn64MB4Uk8uUKmQzkvlp6VvOkrudtOWNA9pAMQcGxHJPFszn9SWEBVI1FiZ2i4h1TqiefVVWQAoi1N9BDbu8Zh9pg7zgVwJ3t2bXvF6GjBn2bWhFlZRGTTb-qcUZ7Hp4aK5XfEjU6JcBEPbwSxXlJ7Iy6l0XBFcZtSnmoMPMHBc7RFgT90JUX8GFjEtR8ZtrspSzIPZAXphvroI_5sS65fctg9DPrfB2GqSDnAldxyFWa2pt8QlfgyMLN7t-6auvx-7UQwQBuOnjk9l9xFEsr1WbNe7WwDGas9We5AdE88b5q-iVO8OVr58GztFgPtySy16n1YhHiB-50tUiu55Pg5oOYNTifpsY8csRE4605MuZhFUezGAkMA3wYPwCprRb6SFrsGxz2hX-R05S5RaKltaVZEIMWEJI3chQDuPjKdEDfef3R28xPZHVaRK5jY5RkVfpmPkDSBsen8bTsQQcnwCJZYgb2M5HUdIuL6pUJqECU0QlAuR9KHFL7SRexS2NC1LZp5AweaYGDqEoAnFlWQbq_YzeotmVZABaG0HVYL0mqhTi7BNjssf4PMpFh5nC2gT-MrPFwnn18LdSP2qUZ3zvJIRrNVzSX0_aoimmw7pindenkCxhd97YGU6krHYaYpQoFwTvTk1ENqNk2oY3n-dbXhAnN8KwsvVYidgKRIaz91dK_2p9gxsV5IoJk0wQ2bDMi9l89I-ta3CO0q-ozXnqbphWSSru34QlzI6xXmzmQsnO0gNblUgpVqsysosfVGUlGwRJ6FtqyCI1geAELp-RGgfRe-Lq17tqAnVK9NjNvT4GsD7jVTpnHxvm4z964dxYfKWAuAbhvJRAU5jWWQUNOcuhxzcMwijxQrxJqU8TmlMIKXOVldKhLIEnu_hnerwHo5qWIw5KI5JycT7zvH2OhQBGC-dKptInXBsN5UXUktMl_J7-G50UGzrJ1EJ4FgNacri3vPTGyEpPAKCwKC0NPE-DlONIgXgAniypepOm5syhnFh26tr6gJwxQ5Uy-Q-ffNZ78WfBSjUbG2nJG9XzbBrycx1lo9N6rqSwyM35B_ZkypyUlYjKW6PHEby6mNcp92bTlIcYgtM0-1xHO5LkS228HEuvofI_xiKu8IBcWb0WJoZPQ5kM_0xZctk_LRm-lVmEWd50Qhj6tg7wqVVHcDwmvoic1-wyMNP-LSAS_ZLLf_Pm0YV7XClDWNWH4R83B3QYgIFeieNh5T5O24H8BtGdcxP6RUkI9PVv4kCXPWnfvCa2tijUrSDJWk7gtA5bEg60cc_5pXdrvAwTkKMw8TL-BO1b-rpvbNROyCrZA-pg9-XnsCY_NMt9jFBvngRiyhrBl-hpdu7cFrmqEYmpZEvnsE82Y7pc2r20tOB1P-gaAa9NId6pPSqy6a_6Go8ce8w8R1N5IiImtX7DDiyujQCQyXu3sYSeOsbd1TC7tgvpZ0WT8TbdAxV_TFxaXATHJbOmmrU1weB50DgQzYjX190R4VCiZeypwgStSGnx7LBKeH3Ujgt9RqOXh0D3yg8M_QzTLshvVfQaP333-WIReWaJnocVZqRKPwsBPDb4kP48X3r-j5CnY7cp1IH9rOSUoVpiZa_twxOTQUe0eyORdcFMhZiwW6sUCKwmgkwTS9mPzkRxLj9uPc9TbK7dgGlTn1t5PVFRVsTdkygUSfv6QZC1r60WgSjh9YIo5ul4Y8PmtXodjlHOycFHIfUcvEC8ul5IsLZNsf11hiDU6MP2LsfibOaVX9dT65XoZFzVcHBQq4Jzmt8jqfT6t_RmuVblZPIvm2-WpoIgP_sNUT5leaLUFV4TACbr4DMR2-RiXLn1M3rjWtdaIsoYQg1gGz0dR6Dm2m-FMaPDM4UJ0NwsICDl4KPyFdxJ1S2fgpkuY2X_BMsEt95Mmo11xtBZtPl5aeldzwwQUqn8VlpX6FyGXrmuvrS5lDizq6nD0rTB-Ka3vxIGcwmTedTpUz36dpxesbKTz40QcUYpUY9D51rnDqJVOKUzKTF4FdFMyAzdZFcb6-9T7NEy48J6MdMkOplJt88cF3nKit647tvDOqrYE_NxuM-CKImrHVEYRxmMOrHSV7TqKJFn2PaQJheIe2JBGUPAhtfFglocl3LVmnq6oyqldkdNYj0dy2WyTSFU8neEUIkhrthMYYU8XHrWA53HxWFhEE486LFXmI1wPw74Hg7KWSzWp67nqVtUA4kS3_OaOn5M2GWzGOywCQKMzbuwmyvOa_cjxJgOY6cqkxuBTo7NB9tqJuZJP16bB7j-CWV7VNbD1WAEqvcIo6HRYJAQgxGrjuLOqG7NnZRWFGF0iPhdLIAEbmF42MpWHT598fTxO_Xu6Yd3D98-feh4dTfqdc3nHsHTKWElnVQA681vJLG7sKEhxTWE-Q0ApHgSi-7GPgXJW0z2DPb0OMDtRqkfgtCnM5EbBVxOgGWQDCGKhn01g1giQJmoaXQMnRYkwPyYS-C0mglvaOrb-nSU33Xbd0OPfo_uhvT3DoTFd7qO92NYrfm3hqFjrixw1CC6M4QtBp129V5GYiEbRGrGsefYBw63SypatxnCGHLwDDGrTzhwI3vfZiwlZi1ZAUvpaGNjwNbjEUc7AwYAjySRmeYlGhhwcHIVDQNozjfdnP4LomumtGb0Pt2EWAKAgju_COCp132Xf4IMZq1E64zkRIun09fAj6A0BrvDVktJIoCT8kdplonbHW2txiv0iwjobYvTyRQJ9DLTLRPDDpcSwouWKS-eITVgU2eeMYjY2tUatIJUweXFLEMrmCm9kq2b2TJBy6W9xl2iqBN80obUNnAo5LPyBDEsEU9CaQ4re36hvOjYde0z262Ll7Eqa6lwuJ1fZebdT_nu9NnfoYBmt1BAElnQinlZT3xTxmtjJYll2o_UrDcM0FjJWiyNxRmNVypajVtoAgoJWbRO9HMGr16irUY4j60sEr49Q6MSNIrlbNqepuk36mq2ErrFq5TNHO_CFLKJlbevHVH9UKjRnGY-rDY-gket-EVTd1biZAxun4clxykYwLmco4riuhsjzl2hbMztgB85XIS9Ysc0jYnu44JIG34lxvRU2bAF7cMTtIx9Ebet56kYn5uYS7SRPc8tSbeygqadAfPx5uBHeCa2apsFyWAKrAi31sp5lfh6ovKe2fcw7OrtJdt0l2E4IHj7COb2GeDZ9ay9gnwqC19CG40L56BYgNBhAy-QDBYfLCuzwyiwAwqOqzMrI-KtdEWNatYBlmYriTeIIJeE8P6s4mQbMZmYd7fhJoCdZG-FLq_dhMUe4U8NTzDrrh69CaI_XcMeqeg7v1mFDFLeckrD8hrJTzjZmFcj4XdOsOJapDzilNJmEkm_IOkj4QcYpSLhNy7D7KSKfuUXawOMlJ84RWhTen3BrxDN4u1neZNvPwCN3XLVKJ0qH2WEZlN4_R8a5DtiyfI1b0uQqnnNGvaGpSzjBlZouNGIGQGA5__Z2vrHmgiZiD48p-l___ZFwBfytM_iBHUT7ft__j-3RZp-1dYAAA",
        br: "G9TWIwPBxgEAoPrJyGhEDBsH4AdWY0A9FWhjhEcPqrWJxRqpHpo6uTXqw5qRukzelsRmE_zxh3kbTOtoJNHSJ_0o7hsmfbkh-MvsKbLkeElR7MnPfy1-lhoxxj5CY5_kcv2opX73uZykjkJeqQuIM3uhouMsy4awgqyWov8xeKA1tmKYw-0wBWjq__fmrK_fqHqryuJImN6W7M20s_QOLUjzMNe4YvHKc-sK49Fh4PlX7bWqNRUo3OH96bh7MITSaTeXIyjTzlPQ3Eg-3_w0_fom7VlDV0Gdkg5uWnEru0M3ng6yd07BOtCTG5VYVktfX9_oVGrDtj3rALUq9OS3ATthw6SDW8rgvNgXGsTDSpdWtci7zuIsjzTmJKCqrvTXJi45__vX7f_r9-k4mbMuy1h6ZLmt2DqieRknkCAoBqmWydlU02m1NcjQV4KkZaUwbcvtmVzxIuTnnUL6QNBJ9629GqJBO5Et30hP3f-uE1yaDxqnbP7_UvWrlwUw6IeQV93bXnXvRNod0sws1rNZsW54z3ivqvBZrwA0qwrkCIE8AkjxG2A4VrBfFeh_CpD-GZDWzIHlDpQ6Ue5eSP6bDlHJHWJYT97aE9Pqz3p0DjE6RJ3790Nb9ofa_3cyL2Wm_43pphmEkGRy9zFsfXXf0zZEREQUqmv3mwFSy0c4jPykjrv9eTA1Bv6VA0XSacwsrBw4cskVL3nDLde84p7XvOCOG_7OR3zCF_yDb_mG3_IZf-Br_lfi_anYtsY_Fe9LgPdL-7HEFdJ9LYFf6s3jGLiVU_4vkJJ7mO-UQEmVVzAuBEL5r7I6XXs1QRsQRgDocEDA-z8RKFKnCS0fuQ1IBKUIRqCJTeqatjwcuma6V3MbeAMwd_oGYe70GAAWeZOyxaaLa5IM23-5mAA-XIgtmbYbtucufFZT3i_J-Q7P9vX64Nh85uu4RBIRlsLjnUIw2kjD33blo7PZjLwbvpvt5Y-f8LXjaEn5H48-8LluhC3v5ZOnoZbRO8gYT5t9KPQ9y9TWEsq5kyNYEse7ZzKbBQ5rAjQUCPz743MKTDY1PIJjNuFSFjapPngPoetXWuF17n4cIdXjagCXpsOXgS5CPms_4IbmMWX6NBNgUkDyVsgKm2gQ124GwSqKyhAgnUPFIbhRQfl4sYJ7wEuv8FOwUUhBGJOF-xS9_wnQtJq9koCnF-UvxLSXFYWwTrrn6Py_1n8CvDJAFF_8HmKfDiWkv2i1lZ8ClD9VbcOgJ0GN__L0SYhb72fREZ5CmHcxFXCrJpSoCdtpEgFVPVhYnO42iDu3xL6BOliB4CzaqvlVqoEN0pp2y4Wc3Vi0hvlEp1-R9OVXrZULbfF1Wn9WcStbr0_HqzDX_rvg1oM81pB4EjnxP0qPlWv-1y3kquWiQ4yVEtsTkzz2XRXajjEsPM8upCtw9ujVEd0jBbAA9gPPAd4uEAUJHDcXjAIBi3tnJuS2QrpiITDvlaxVCa9Sah73bN1va181ponh_UcC0VUdAilD-TGFBqBuFS0VL0jSTLJeh75Pt62DtwlEH-tVU1BipKor2iOjt-zMOEMwYVuYR9GvfAGlCaNFD_UB2YNub6Qu8uvrjM5yu77aLkIBUsxUd5ShyaPTCeOLivzKbzI6KsRPuqqkv-graRBApwC6Rjg9_eQym82QRI9EvFUiscKLPWqWvuBXqcreb53xuX7zKg_vXnffbhlNnHDo6ScAvm7-Mr4rNHjWwVo50X0qPniEgpS9d-6PkHiWOC15PAVCF2Nc1mp-eeJS4OrkPSa-5tfVlnG06T2_ewUPtNtsvZhWESwI2cadoNLHP5PWPXjbv0InKkDgBPubrKgFPID40ZCIK1Xl8uXwfSCuVXOIcF9hbSnv9eQfdL2o-9pGh-Q_1yC9BiD8RxMmjfIHR6eh5X1-6m8L56deLY-PCo-IAPGuckYGSggQ4V9mMk0v6rGDM_HR710IcDfoNaHmCVF5cZ2z1gsPEefJjC2yd_-o_1faMtEfiVxwTla2F8wd7bu-3kwc4ocOdulqtIVjjgzzMNFL0dIOZxaQ0hOdCAcolCHskCzlR6eTLBBSuZcXJ2JPRi3cVQHIBGdEexJxrl7HiEeqMtQ4l5PvX2-K1L4hDtIos3OAPrMxP2nNz0jqVKsJAvKFLIuRUU1cWy1UW-AFuXneqc73isp2avdUv-M2CtZqBSwgTGUb-0EoiNeGAZI-rVPNchuIR5FqrJcrmmJua0uJ3hw-asyQ1DY34AxiW7bmAfLXPA9mUAZUmsoi8Uua5SWEEJ5SiBvZrXm6bCzupbNhRFG8XEzBrzQpRCI5iaykuCtB1AqCRJDUaEsshGSImVXOJOgA5dV2N3PfjB0RjUyXbdm6itzWtDJWnYXhTyZViPUXLtKYSY2ya8EVGtmOgsm6TiNMI6l6gclLWiXIq6SFutUBHstwP2IxikGhBHB8lV9pOo0KtFJVxnhlxk2NAf7FOVw_gPhTwhLA5pK2UliHvhSlbruMWzGx-wkUt6ScUTzABJn8WADlxR3hxHfX_3HxAfkt5As_uW3D4qr5jXtfW3POUVpUNTEeYJqOkwOYrJojFaGpOLRjf3pe4tN_ekcuAGfcGwdExYH6aIfi_pAn29fMnZoa6iTdHcAaxOIriLM6mLSt9KlNiDqv3qUBWNTI9AFNWN6XDxFqREctv-eexrOx2xqFe4HSdNo0web9UUVd9Yxh2Y8uRUk55fFFlpXdHOwuy88meC0j3yNxvmTBsZUEswR8SdVNxgVP4WkkJWIAsX4efHQ83e4a1AtAmoHWjNsEYeU6c3e8LO68ufO4wYXDL4AQn3OtHVDGGclsApcQmiYg8EzjxJTQteQnySIHrm2g66j2MVDLiUde7bWAFiM7dGsF0A5BihOBq9Oe0ywaAzjcdZeCDCmdmYiqxYGD4nKv95NLOPADEM81MkMVQ4kt5xStr70A00gvMKxAGGVDeOrn0RU4JKzSxlvUpFca60lBKphCDKl_V5JoQIR5vGktmemM5YBdELHCXeFyXO4Ku_OCbXiCWny5hUbq-nV6DZUETspPjFcacKp-QhcrwtYZX7FS2oJh7urOamcRuGDFB67iuSNuZZuUSrsJQLpcx7pGiFgs1gZZDcfmTgsFe4maEY4W91_Bhj304qWriMSiY97wDLAB-qyFpeP00sveW4hNid0JpdqPw6TrFR5q9d8FsYwNSf_4edB2EFemiouZh1_KEuH9rojVg25y49YBVt00I2UMh9B5X9nXPvU-u7rs2Qv3vbnTK9g6IBC0iBmGvR92VNdbAvTTcYHtlyJL8Hu4g2PxuxArrwgt_xquRtvNr0WD7D6aPthuIm5O2x5iJXFitnkEEWX4LBfAYssm64c1D-6UQvYuOGTZxg07DSkyqSkTFKoJa1qV-6XRlJOWbKp4C8PcvapplY5mtTtFGbbXae_uxbdQPrJko2YwplzaCqtFrxCoXCueTrHZOq8sqEOU8umB2ItMyiHRtghN5A2oVBOx0c11dcmDGrLS9Nag0taeqI2yNO9OYZZgKih4L0k1fcCt_bh12T_gdy_2pJPFSdEsq2A8aEN1C1ghlS_JKuACCy5EWJs_DYOJzVjXjBhkHx-0Fs5Z7DJ1t-I_MIPFAE15Rt2bRHRjCTakapgFFZ9mpOcnMqd8JZU9SOnbC0J1UwbJvLf0qYqaY4y1cmYVw2acupciiFA_6iDEOal5svs3Ffc9pxjQyRWYQ7jqd7sPtCPlrZuNNOQaPNtrneHmIqYPPjB721zpxOHHhvkBF5JGn7XNwBwAKahukNbFg8yBLXQbkSjclipl6nFg6jMgFc7Fc_Jq6ZSynPnBEO6v00sya3sqDaQ4plAdEojrkR069xC7y9fiDz-48X2k6lbASaTO-LgwlwqNB2ZnXSBQHo0OfHOAHwjFTOiMH4SZhheatAahWhrZPFlJkzNKnBMcxXB8uo631rr2onPFFerSGsO8ICveCsVRfgKbNUxUPWyXB_NzMWGp6ESAFThHanAPVQ_OsMoi7wt9TC9uNpbVOEmFfAEQXvV5SNXJGsG2XUaYqiH0B8e1XldbaInyG-mKwKuVhKGYZDx0B1w14uS-MUJ9LCMJqFvCXjCVJMvrw1leJLvd2G86DxMLH2s_QLTaczhsDCaypIEHWYHo0KwtTaYNuxSgekJN3iuWRWOZs6sO9x6Aa3ViKsNvgu2_ABh70LYKyssEctT07nmjRQ6nfRk1WcyXgMAeJDDXukcDGlDjJ39r0F2cVGBjtUHy5wV6mZYZC2-seC23x9UtqqZlCHOzU4Do_XgcDyMNaj32eM6vF98phE0Xh1wdSUvrUDMyuEBF0Gg-CSxXZX0hkza3rmejhYK5C0vuFiEKdTdYdAt_kTYzmlHQg8BKkPGDmh1kmm4AjTyTaXSRB9PI0Xa29pxBI2fI4H3jGh6acyjDMRGg8CfZ0TXJjNlNV3r_CimeV1ocYk2V4GPCwchte4Y0Rn_Csf4rlzSxg-nzWbNU_mYKpXZWiVOrmAsuEcYSgEwMIzRh7raGUm7VV24B5xCKz4rqZ1zbr9MW6m3TlW-HDaCh-zeQwtBrAMrVds-eYESF5jHRzRFBKdqPRKoW5bwuxcturmFmiOH0NEXZrea4Lz-DJDWiWlq13SDXunibWqGBGE43lha7r3Cb3oRWZR0oe9dDySvgBrqq8iIRBNXh9PpMtzL45tuSh3kljizFl41iLoVvq1c4Fn9LSK6EKZoKL7VxyRsFJnlg56OafalgAdbh1vXPE_YFdSy7yoF9eDHpj7QTAE48Vr9NF2VpTqC6tCySUuudwZUmI4D-hbPhH46Q9qOripEUwhARNoaTPkrSfxGaSEiHUP2eD7WZA29ckyA1pZSEW-5M_Ff11X6zSIT2abO_iPPAHcNw2RqxdknV6h5Egmvuevs9F3SPCO9dco3zrpleuVZKGpWVlZGVt8KY7OfWEGiU2o1L0VLuNmpH7PeA_JIY5jeRlkcev3SR1AhWuXHHK8frFBihIcZ-m-tMSGYDLq3MoIEAFiKg3yA2wCknVffyJSueKoRsl3W6ckjRrpRCvsJQ9hfRVOaDMWRdvd38G2lTzIYWCdIR98N13s4f8_BvX5BeeoQR6XXyhaDkBz7KPT7iPYvakT4ZJBgFiDxhR0lgA4Zwsz_-0SEvKiXByTcu8OgUSvu3SL_AFIJ0AvAsKaEnwT9KRjEFN0PRI0FqmXVz3i8j9zKidcZunXHTz1h1Kw1cgxiAc53tYnjvluuIplMCwViwvdk-VAli4FzIbVFEAbzMH2_FgfgBP59LiWmPNukRg0HGkgWyBDoxql3IWtFqJkxGM9pE6_5BTjiy8y4Se67TC2X0PVU2_cL-qPCp-U_tO4-77kFAP0KhUNfjBWdBoBhWtG4mzkwl_b-YRk_2vg8eQA9aSqvf814jCFEBs1TOCZvyW5CizT1joochQLzD-Z9FRBnG0j_i4wP-_nyhvt2dKJr1N5HQ6oe7gvOD_UUm7UHbcjwL1P0cA_BDjP2E_YUL2GmiYu3dZkIIDnRNQmdK5rhle5kXJPTPZcUl-8wyAHNORZbAerYuGfpYEScj-8I9aHDiQNkAy2JI2wDyAOdZEsDLH9IGQDuaN3oG7i6QcxjhrZtDIMrbk4GHlVAVG2Pge2FyAAcBMUHm7HHg56FBginYP2u9lo8Sdq8ZzjOqHk-fDJMwGMOF7KSaNxLsBEOBtPyyHQvWEU0vj3fMhNphVbJSlNf-0hqA8HV8N4KeuMT_awRQP9Wc54l3ZLA3h63bTk58GRKkkTbcUtMIDpifTGnFgKgRsqY8_hQfMDT0d_eArj6m9ni8zvUEM80qXE-Ds9ypTzkKAlO9LCQMLe1IGFjJzceviFlUacudcBDiboXjB3Zb9Pa4pXahFUfHffgHlwTgc7sstiaXsiHRaqXyf1BZ0vuNlzai8rIwYyty5XwvWG7CdaAnOmMbAdyGe62rGMkU63UlDIcqx19Uk9qAw6kcHrh4470LDm0BUr7Uto1f2695lTTYQUGzUTiYgcUJW3b2eql3ltGKPxxR7x0p0GmrwFxQRBgZp3NtKRnCHZFVlBcIevu2mgTkGqx5KPEvEFwkdDK9cQj-E6QBJofgKg8JfzRLIkcR2goHHdSuAtzgGK4e4QnFNUhUozy2YRQqFJrLPUf0N4T7Cd1_qlfHir9C6T5axi5Vv0ipSEWrT4zPb7YrIKeoqHi_Pbq3ITaS980Dnk1oRWfod6jj_c8XBHhdxDL2TlaKPAg4wpLa6i9UV6lB3d28_XRNO4WTUKAVaY7vFmtrSmoqA9tELCMDircPl3JFbtVkYJvH_x_EISj_6KD_O0N_92QD6a2wHR63n1XF0WhQBg7p66-cBOvROTq-6G7AGiboqHeYb_hdY6-EfP-fCtC2k87LNa_TS7M5KVCJr3MtCX7OzDWM_MPQydc0SHXgyd8nXQQuSDRSmXFUr0-xQbLb4Jk5CJn5cTd3AqFpNO5F3dW4nc2a8zw3xgosOn1BHD3WyRk4gih1HmU3pjr3nphmDHK6tfA5rclhddIayAzxpxVMoWcCUGt6D2K8hKQu-73K4Cr7PBhKqcD2n-39Yz-C2CuOAVkU4ByBEPCNzx9O93-zwh7RqyfCggdO6xooDPa4YQgI2X1jr3m5RsMeH3hb1Z2jYCXeG8EvQexJEIBIoYjuwjZPO9xFC84BGFVx6o2O6M_QvXoNPs52qpffAHx8hh_l12-xP72qeFwuFKnjNF2m1Klj69p7-cndVJ0-r9jghej3qa8sFT__shwLvSlP9G3_bztbhvmW1BpHYK1v4ukmEWJeYTu3XHlJXnKVWwAe448wW4pn6a68o6PmhZSlr9r-E48R-A-N_LXJcdgIbdVETRPglbfT_T3GcbOTzJv6HhbeavheNda8ofIkao299Rh6fBlKwy9Z8twPIi7wdT5EeqQVBa_vYEMuvftIJck8PfmdgzAlJWvuV6j6VV0zElIjC7zxqGgqkrxfbZ8zMESGRUJ9i9haEbd26sysaoQ27NsZZCqP32vfJ3O3dMMZ8de9VSIVLDiRIE26Z2-cNPjHsXzaowL13aXoVbgXX6c4c0DLZVCYxNRkZ7n4pZbFafki5WCIPj1JeGYyq1j2-6gkYfl2YqFNcm4NcOgVgzWtyb-1b4mosrHcS4KhJUReHZX6yjjWe_O-p9mrWpiaCHny6jw3GoakCIoCMO9mkRxKzg2LGEWW7hQam3M4_MLuVZgZdNtsJpWzEjwIa1r2j15d22GOQuE0nDuSQ5SsFBieBjW1YIX1HepvFGNzdcX-rs5my2Uytw7peloed2f5sGNYLmeRIXWn58vfYbqjApUgeN_5MQOEJhBKqoMeYRiqh67__P9qiGE3MYTuWE_a7tR-VCyBr7POFGSJaURg9v1OQTh6GoeYCi-fpehJu-wTgRT8GttN0l2kO1PNhKej0grplDJG-XzhaYqZdRQaNygB1_zJPag4UYAFUt47qsO5tXeOHxfN78pyaXr_Ja8f3-gHov4ox3uCNZ0AP8-2qbris1IqOpp5Ctnb_6BzkBU8xozYH89OOmZemcwN5YufhHg5dSHDsm29tbvgXO6yVQsrEaR0LJPvzBelMAp1Z45lfJBy2rG_AXKSMYyclKFMF1hU0DSxTmJjrt7YFW2T3IR9zFopR9gioA7yIK5DtQdZSUWQYr_J4yEmttduqytuCzWSJ_rD9Qr63fYObFkAvGrHclvqqgeOhRYtXVhSbX0D8Ttd7fUjRLkrdQMNGA8VzeUWqK822kRwbNg9ULNmURTNT37GRiY0TMnXGRd0uGwzSHnwFZI2SHWRI_SL65x1opRaLqnlvyG8aRUJKOcB0KapGjONN1nPugbNPb0onoXBjlg4MoiyIWpkHPo6qBb1Dxb2ijDZ2ncaUk0maeTEN20NGUxocCSbHoukQULjgCt6YO7gwKJv4Vg-yaXMwkzIWBv-HAZPSJvvYJxhI0zbOKjYOuO-vX1qfTwxE0aQtYkULuYjNqaxz9C6migzvPRtMK1PO6G-hYPFHFmYX27G37MNLLkHKm7JeRrwCfXDVevZJgIw6a4F4ZiWF0_37Ltj_j8b7rtFTatoUk3oPUBdbc13Z8PnwUfbvpkNMqRdAFV_8Yb0HHef1G0Vbud-0X-D47Fng2Z3APjPfbmfjt1SE8uuzb7zB8fkuAzFUzgDG9Gh_eVW6HkcrTLMUSHsNLQ8EG6PsBVXj4vO8pitfKIRGh_FdYOFJUy87s1pVfMSqJUMTb83gZ4WqVo70GW9Q1LrYCDYdMk9gimV3iwgTwjYEmPxOAMWkSch07yHtWVP2GuFSnfOemLA2yjTv43pNoqU5zgm7m8XTC_rPYc04r34w14zN1R9g3QemPuI4d48zbvN3kgZvvYGMlf1L8UDZoTe4xsD7tVK38F0MN5fOsykN87uN6DWmgh6vtblsNbQY4FP5IX9X4q5-x3T7de1eHjL_XOzp_8uOGFhLw0fBgW0F_Zyp-ALJrZe9qQdNr3QjI3YT8o9-FctdsC3tRyEego7K-BY9H3ahmovt5EUm994v9X7PgYslioGt7NvXjTkr8ijqUxzS2QFZQv5BaT7ZicRhPowWlFLJqpnpKsifHvLjvD2hopr6l-as8fKntRxMyJnNdMnfRUpBIVum9tvU5ABw4NpbLipHwNbUClpYbMOJapX_uxhgVqVNclEJEZ_wCPoz2vUN92Uqvo43Flp-4bXVrtoHLPZyyvm1iRYazxLizs-5ahAvH82mwUnsZNfBkQcjcgLmmdLo8EJks9Il3NM3tvvZaTGF9qVoqp2B9cXIQ-FXWVvUWXN-EIQyWL2-aomEwr06ZF7aVl8dJdsJlb1YksVmnz9QPYU16hsEgOZhhwWH5vIScaub70a_QRzo21HNXnvoazKr6fQIk7NnbedFPPUpx0V8FcYXKLzcUvZArtxDf8WtPICQZDhAlyIuiKxaIZMZHU2IpRy3ClIXIy40hVDmau_ztDrgux_5iqutJNSr7EN2Xk8irLGP3RbioYcE_6RcCfBzAIbsfEPZWEFM4pUIQNZipOYYbKqZNCmlrCqK7fV6Juk_ICBucrXj1Shb8Hs472airjQZw5FyFAvApGjTl-nYHFcFQazWm62sjSZ6peTPqmSWCItXWoOHKlkdPWKo0pHV1rCJ9VFoSi3nWGBOS0eYzwYhgEyM7NsqrSrOu11Ij5Az6_zUJnEAa-aGWqlGs-gYN1vWI1GDk_a8KhAMAK3a4NMF-DqdUL5GgH5pdrKLm8peR71fJPFW61L0TLveLdrTIgP2lwz3lLbL4qwD5mHNumNZUXBPMPbpEmypGD1QpukBRxjMPfABsduueMsnSQI3aDkOzPUWvMVOc-TZZyj23t_a9aAHd4bX01yAR32Ov8OtQxCpyJKJ4d-7vBX2-aGsFOgjzErgyMK9i8_Vh2Av2R8o5tStIqt_psEZpt3N14zvgETu_dIcju_meo2dtxOb0a22fFg1PC20ISiSgbmVlLtNRh1jVUUYTICtfBnG4xvdWXzl7W3oWQtsS71wSprxrc0S97iaGngC11qtaAEEuuFQiHVyMgF4n2_wpWCTwqkmbhWjIGMrqwKJfoENkHA58edpSze6EcwGHK0tIiLCJKkbmL0ixDbqmSMRrfB85JIhT9xFMXoF5q4jRG5zGVa88B-9KsoU038HNN2FzTFdb6GLEZalN93ZKyx90vFNbkB-D-kUYC5U-fAqqaOb6Q4KK-4V-iy9WpFTR3fyKZPCY7ywvBdWMylV1KiYZOlmuG35lR9eCf7K70PoJ89YsK1McHQ4s4g1psr10RqxBrCr27hFZ2ADhD_yQDkGYmQlgt9orKE6G5XL5utUtnfCmyvnEMYhUxIYiJE28eICVOQ8dzkkOLH9PXTu6VFybg51zikFKrkxFcg79MS56NuWDRmtBnBMhSedfHZwQOsNLvQe7zLKJoA_np2wzcAWneXo0dSS1zR5FnVTWKuVSPl4v0-g_4uJYMDfR5MBIGa_KTnC-4tWdTpbN7gv3NyFmSDmNRu4cqvmnON-viKVQGSAufozrHMb_bXfZKfcqgpKIyGtetoQkegn6ys-VgzrCam7mkKs5VkNMCnigUmiPgTOLMkV5sclBBRsGzIr27kcymOCgVxSPQ4lHt7h5vt8b0Eg0yImM6d9BnDrswaxyHZh7lgXpSEcwCxBzaLkOcYh4bhaQu8Lkbmmu9KRs3YWDazOP1JGxVYXDvlaX537g0X4PSUewJeHUH3QoUbl5hHQuOOai8IqJVG8FR4mPQGv7WIEkSt6iIfHP9TpGf4JH6yf_LY_9uPgziL97cTLrN01wX3uzr73dYcPTp3TwTIn-GDDhpsu5wt3AjAhJo15AhE8lCMq-nt2bXcy_EEX0UpaPYGrCPuiH8F6uoappDB82dZ0LQ4v17R-VcFXWCc0KCcazCwFvfR_38f-k38cVrcE72AruWaduNxa_2_g-6GLhAGfK9Ihk15GRK6PAbCMKPzjqbz2fSd_93Kn8FF3bPv-oq1-NPsI_e_BnAhzGY388z_DWN44Gclif3Ngb24P-1trXhnGWY0bmffRc31O2lqSncS3cYDHIuRb4Z3KhUwsGrbzf83ZmNr7JF1CHCipAKKg35VhDHuc_TCh5OseOUPyBFJbFWAtry8TgecdAQkQN7GA7NdpzaY8t4TzBsobyQtjsmMdeMmYeP-tHjyUqfDYzbGMVro1as1x-KiDGr7Ra8l6U4paxBtuMy44sTYuxAn2nW7hkIBxLkTNtR0pcItrJ7m-Q27sQXkzpJloXQui4BLLNEP7q5g1Dmcj5fxeMXrSyAJM5CvGNZjjxMGLqwlEoR-eEI4ErJuZGWOmhF03KMxn0tFj2RMJy_dDBHRo6kNgz8E705JrNvmatultBgcOkxpjEVfqatMd_b9wA_Gcms5UQ8I5KjVjwcExoD0w5SS1-8cbrEGY9RIehRmu8xoTYEZRHXOab9l__lV_6BNgHyHeAKqqEDeLYmb1UG8tB6yptEjhgmNfPjVknENZwIkDOBvi7WCKQx70dEALKUHTj8u9EYKS3QKRUNnOR3iN2cLUTyfmXLpZSnlRGKDQfQ8iqUa-FAJowrxEBSImNRgJqGdleQanIFGLQV0tsSPb443zrGYo8ed_BoRPQur9t2OlB7dwbGn-_IDYMJ56K50EKh6Av-CgEDnhPbyGfcKa0o6Ar3pT_Y3Qhd7IEk89FYzDlKxYawhtbuiEN_qURtjAtt3Mg5K3hb0-dShWyIIJ_IEDQbbZWlkTHdEosaH2hby5ncVQrqvjXV4LiFdhfCPkXEtb-LmhB1VEtxrBZm7KxmO9uXgOudr0OOoKhkpcvm4O162FtKXfg9sDjYbG_a110BakuCPRT1w9dOvBJYap9td5wxfZLHDgCEphIOHAdQp6jq2SQRf0lCCWHTanfcno0b6XrqKOwy0Bbv-cDMy5ZOWM7n_rHCG3GvWUOoEYFdqTgHtRxJqRIwKleP3_Icg1Geryud_E8zpF0wo40IqbazzIaZcautjrv_ifOO3u1_7P_6sL5r28j9dHw7_vbo-_lZNdxXmkdVzeezKyB7RkFtfC3kQpZOladPQWFXQ7EtN7xhInmNk4FrI5iH9XeS8y9JLuRC7vW_vMfeiPx1EyMFvTh4UgBkaUlhK-Tb0dzfssdHi_TSP1IvB6XLYHW1paSkt0H9rG3IszC8gGilPCZ4xTETrLPHb33IO_4ox_E26E1Dqt6EFyLrl6KWjSqVaexbZ1concKy7V2UYd7AbdP1FbNvMVc2oh-MXAMZS0j-lX27U7nB83C-2TfjPyMjySheH663VTLVE6n3XZVWlzv2eR7_emqd5vb03f9m3AzDEfdfJTKgmGqotRvTx_xPj3xEo3Ez9Od1VR-LPBK1ITPy97n-Z2yeUHy21P9n0fPPP1FhtJLUP1_lFbt51GJZvl3EoDJHL1dx3VQ2vC2psD5UZcZZVjv-l1-Dlwn1ccOeIC3bvry27seGliELaiXY7HNpnZde9hk2bye9sW_KiNmLBrK_EUff4Ft0vTvAE3yC_gg37VkSFaJFethzbpYV2yMSrrRfsJOt1zxhIinkB0Jcvh6ynl5jSNeTPaokuW6abF-6o8yueIc8wACV2pMrbLi5nmCfBGibVns0077I3akz8sPWO4r2QAk5LYugyIHLohsvdOiQLdzwD07G0Lcfh2F8AljMYKNRj9l9MogVD-POK6Bly3Dai-EqLsNjYyPOJRa14E6MvRaYFlNCjqCqtzd7oV-W9etxt4aFUeVXUcg8l6aEHFf2Sn5-7JtaHau8bVI7lTD27nxs4rWFCdKtIHYqzDwuCWNi3cuQ2lnLb1GhyYje0tz2DFZqDLZeUhar5XZcXErw3_YsKqUckbCWV26pSgAPMYnFqXrfs-0uEaaZKSVi_Ao4lKO7DgiAJ6aASaiaWocecVi-YFoLyP52f91SgGay5qd1GNBGKyg2fpBtWKYJiSaIBux3-wZ1iohDmAnbV3qmHU5XFtjhRFgml6hgj3AiSvX6GliApGumbi7WqS3sacEBEg2jwnwlXgvbn2c2744rjhpiaZBrA-dKeR3MzUY8Dj8nzK3KuZvW8CIiif4H3Ef65rlpc_2G57h10bgvqpTdBn3BrxZlLI5d0j2iHydhyTa44o28PJ26R55tRCkBU6R5s8c_1xwK5e63H-GRhHJ9LM_rTmxnSq6utenlbun9SiTz9J1VxiKPyd9PuWe5SVjIRuDlCl66m4btHMinfVtKHTx9Q1nmd01TZdOZpjtpUUvgPe3AL8zQd-ig8dzBPN___53fioMGqkguYyHhhPvl-F6LZfCXfsTj8ERfbiB8RGMSxD1SeGFWt0p8SJSqwvMozQ14wEY1x47ULnvzDH4lc_vgarBg5o7DeX4gC35zdGVb0YwREhaLQgCIcZXmQ4CNZKpkTdcsekuNMeQ6dOpQ-l3DqunSEEA4_ZA7q8OoJ1hOtaQhSRVBCOzXjjy6HrbAu6pzWkQo6ttRrRrlc_9OH8biALofzvGwcUIX6xWv-98DE6uviOg1CGq9huy25Sr1J0t37D-dtUHjLQSZ7YkvAWAKIvHPFeN01qN7qzU_u_rvmfy9zuxPLNOmBZGZyxjx1y3rMcLC_dJMaeKWsdbZATMge5SlNqLUy-OXzDIACW5UW71Fo-ZxZiWPoPkNv6_J3FdZoG9H5MKO5ov4H4EdQrqy8gphVH2IayG0uSa7NPcp-AbWafqlFcPqpAVPOkSTWgVSCWsWxVMVd4R-noayiLio6Q0V5PkojDsdLJmeadzw7Jg3sjgnjgWoLJAgaH6HpipAe7HAOwfCLN4dWGX0IreD1cj8wV4A-hs9e6_0pXdRBc6S9WI-uh-zaTrjwJCyt6RxtJ6PzfeFtPPlKNRxVGkp80Hj69sGfVVgW7-2c1dZa8khhKceL9HMPzjDigxyblzlxZIgLlMZ0niwzuG6xgiPdrg5eYvirOfxtpe-XPprpOYCzgoVl9pH55bM4yeeFM6k7BRfURUWn6W3-LI04POmFAjf561Xq3cxJBlr-5Fv7dvwVR7pgVX7Ur7f_wylSrTxrk66cF0l6hohu3kLt1tSgLgLGp9Z-u-usJFriPg6wLuhNwbJQQqa7l0mpSp8BfPVmKoS4IhPFkUcATWBWT0JR32j0cjsVcNhsmS6uRzSoj2T-u-QqtCMwMasjmoJ3KpQvtvUMI2W4tXlxZWzLc8N2d_hjy6Y0zTCvRivWWUULRraHZWJ8G-7LytNSK4WNmq6jz3a2I1Ygyg0o2fPv2UWySMf8DXuisIH-nmN4zYNt_Y_q42kZbvnPI2JSGasilcqc7dbPp5jFzh_Ra2nsixcCVHBPhbaMYSs0pUWAJVTWUj_pEzQjl8oBClD9T2X8R7V1j-2Wyc4aKZrz5BiTE1C_XP82vY5Uidp5hQhyCbo31LnK1gd2OxCGm_MbWOtEPPYVJ4LsgqaNjKMvZm-xPTkdgxC5HnQcp0vnuaJ-ZCP6R3oIRGXzxXtJpcvyJs9BGK9FzjXs8tEOKUeIkxGdUy2wS-u3lv4GZGsYvrZECbeC9EYbhKKMEI5CPZZTR42t-aqJfbiS1t1-4gbt2gVk6h3u74opz-92f0fKu0bLy9tSoFlz24cICjkhrbKNjnyKbmCXtWOe5pMH5AJ28nyPpvg-Furz5ryESq67R0ZXJpfugl2-F_ySKUQXb21FLgt2eV3wS1CveF_GFqYl_sECXCYW7DK54JeWdH9Jn0tLZjGdoHJZ8MvowrQEH4zApSYvS_xcXBLn4nLp521JFZe0Ollbd8EuP3z5FhA1XxbssirtLcGSNtkusiC918KxDSkuOxrbSNoxzDYGFx--1V30Oy5ZVCN9GRKYiUsRQcmoQQAtAbt_ZiCTvnAxfsHOgPH2wGmfKznyqvSgDnKLJCH1ekdV79o-7waKyqJMxXjaRrwToTRTOUOrQ17fk6B26yBkosxzmcb7i6xjODjTJUiVWSi2DotX4mprIEU9SPytyHKEbxWjmkP_myzWnqwjz42TitfS1xdrv1zJbhYAknBycczrsVtOdplEhbbIjO5BtkE5i4dOujLcoI4fDdOpwsxpa77jH85js5mW2oAy6UaBdvtAtUAGGxyyerVbmd36PzcpWmOLjuKa3SlxSa1Y2fzzr_Lt7oIw-MEm04Y6ulPvur23j18jv25w2a3xvBsTI_2diprpjL8VEb1axrzJ8g3ASAkARFtXjq4-LSxc8UYygOVbj97YS1YWkrTDpMI-OF1pfCwdbXlKWRH9e_892Dtc_ilZfDylezvGFmLD44gheIfNQn8j2af03s11Sb_YAB3RV4mZho0femuHSgJo6Wkmqr5CYlcFbPkVP9gwPu2n9hIZv4Cq_p_Qz7HNb1dyL88H2RC5V0paDBHAKkoDqO5LqrsKX8gBePTe0bpEtjj2E5sGU1KSKQMHgXvTN7Oxas_rxtJHJQ-aB6ckXcctoFbGqfpizKDo29miuQg4rjB-rBw-s0oLVMJ3Y5asN103uHD1o1hS1j7e3EnTZfLkxTlZBktdeAhf0BMZJFXBLaUpTj0YMDTBh3eZ6yXj07kZspLibQz1SyBuX-RY2c5xmI4YxSbQ0X0e2eylgy6tIp36E2KqfBiHo-cQxRBT3yckLeyI-UzeELI7MiNi5wRMIzCXtHBjH32FJSovDXpNbRaXV3z7SeMifNFPk2wOimqDZjTzlJAYPue48Ruvpl9Y4Xm3Y6Nn6s_fV9Pc_Zy8r3QkFftJEfiIIYnv9bdXzRxOWHP_9WccuI126T8n2_-58oy5qHHm-dbIpWn0iFnduy20Yosl4KpAgj8ll80KrBgS7N0IKZE-d-hD2G-P4nNS0N4iq0Sb5g-tyZcgOom-d45YUMvFZ0JqADKfBT18Ii2TJSGuh3FT1Bw2oEEOcseLMdfowlGF1WK44N1zGyh9ZJlMzDb6plwGkLaCOcfdADozdZsUGy4ZxmE-ixFFt2gyZEfLveGYi-V5oOe1Nu8A7RIZ-Bg4TUchGCyaAFBhTyOjbwkoCOJmKctW6W34g6rQZJqne3nErrPfcFwYzRtBdpUl66kxUCMqkaCPkf3AS1TxE2eh5u9cMUF3fjl8nYfd223cIgIJ2y2i0MohXIUoz1-O22wtNIFOyD-A_6HBEz4YxT1kg3ICV_FVQIWYXmAiIEMhwTNJX5UPDLpH0YSvn5c3ZeJNlnjcCPpMZpuhW-aYRSnJc7IkAb59J4eXneIexFRrip_O9gLExXjheylrPhaKQ5zFRxg4lq4hAkjJr6LaCqeiopoWZjGS6KhXaaDkhELotbhpIHsGz-ZyUIhzQTDV2pBfi6WMgJOH__YjgJCl9uhUNlyedhuStkmhxMwIqSrC21PKpsfl-8fRV14tLGjC4XMk1q2LGupM0rwBVCBJ5uVHs_fCcyrmAlDFl9L0-zVWkcFUPZcRj4szpWZeAHTWPBK2Hh4TwiTO66RKxQSYRlBHWLHyHoe4zqrEwY4TEOrbcVXt-hjnUB8YXB9Y0hhiRgAXKtdRe8PrN2oPtVYUdVoIdTxP9qAVpnlcHZ5zuBVJrhkbIK4UnZOaaZEh021vqq-wwWhvqa_99PBq3OyXqX4S6SlzY47hReJWBEEB_yl3puggL57bXkhNZCQ9J6kGU_h_Uz8AfEzv6Ud53i846f3zs23nfPPhhJvUGxyHRFB6PlbLlXBGV8V8zg3XLopwxO97DqMO88lnvGBPMc5WAKfr9J9ddMI6Kbczcnp7cIqkH3VWNO9RkTQC2UDrq4BW4w-qpbd5q7sr3whBn-xtSnH4SkBMTIxuvTbnqGo3pEKt1s8qAWChrAvZGcTpfVypwpw5gv5clfaesU_D7gLO10LHc_6l-pOy6ns_VUObbu2GRP-gKG381-hcM25qoLrtx1U6KTQaJtbZyqMYf-Ck0_lIkxtd_N5TPYP_5jnwzmHd9FR_0xx3Us0_trqVXZCGCftA6wBOQ-Qhhu3Q-9_ejNokvL0ZPxFvwDjcMXyGgF93nkXApzjcaNFR8L-4-O9_O3ozglWDMWS_046o-114h59CNDt7i0eHHhQdTGTZMSQH7iPYEezSLhRXGNLeIUF3i-L7cMOB_vOjJid8upWZEqr2kFAIPwEp8pDTuruIXIbbjvlPjKlwYi0URYUHquDZiCI6PL0-_Jkfz8SkZiBSkaMCtBdyPWv6D6LKXKk_lVPsqvhBl6XoYkKq-nDK-qGeThyFrTXjB_w7_6gurLR0E_qkM8xY2aVE255xXV3PD567QHkScmcJG31-inMT1AyxUaK9_Rj5e8WUNRGaW4fLzqXiAJOCV2RvGX2NpL-GUg2QFG3lBLv1q1fbVjTDb8oPJhzX3vCkZN7yNdsaZkWdGd-f-GNTxqKMuL7k7ujFgVIPJscgpjxOhxEu_Wqi-MAz9blgeu0z9YFm71bNEUirj1ziKlq7QdJvtENlWapwR9l1ymt0f3tLOC-UWY4BrEdy6lXowbHN6RmdBBti9qu2xUznHkKdCYz-9E6pgg8ChnLY9yflO8EDJfE92Pm4tMOFaNu_XSiXiH-R8Nb-UKOc7k1fW59T3l6vC3cAQPgrQj_Udqc_acuZeI3XedWFta-CKENKfV8boAXEvHyDMvVeK8Ofxgm24XRXszpn5-rO-eLx8IXihP0km4SHRU7YxdAbFf_U7YVetilYrIFQSwAuOL_O5W_0EgCgP-uc3UNrgAK6Cke54ktOsY2SqVQkLahJ1lU39oyyuLkBP5yV5Hi3AZFeGmXUMP9YDjeoOqlMRfYa-0lkhOx77KGLrcMZA7Xcpscl4vxT4AKOBP0YpB9yw8isPsKEqY5nYM9NsmuswcmVwP8Q9SFL_5jBX-AlUbUFrRf-g5yubSKl6X0-zsulNjeTO3TjUvDcc8y377fpZlGe-wcMd7tMA3QgW39AI9ok5VeKqraKXFZiQyRq8AlsEJlWQvhgAebtQ1B3b4jheq-5kO_D4rTucs4R8ugxDWc2n-C7bQSg6u9IHmA3xaC50ZF4jDwu8Drg-HatsbraUpHfEmvVnEg8vyrQojEbUkNjNTwPz9yKxGr0SAtjPqnmHNIrfjSzqcOpD-1rIhM2vhJTg3LWTJ-H-xnfHzUYJRhA2_UAN03ZtMMF5vFCybEzJA9x0h3KuvjDeIpYRmAq4Z06UHO97Thm7rnqpURumz1dOyZLi6xKQjZLQyWA1WE0tFhdJ7P1nQidXgwYwhM0SvT9pL7vo2WG3pQQ_BeUKo43epeuhxnq8H3nqdUzBbjcqyAAilAdFtCfkhqwpHaRppDyN9SBU2Q7BadsZdon2iqjozjwedi0aF1twozNlaynlBl2EoKcRKhFKBRiINuPHSh_wAKiokBtd-e2ulghO0uLy_GqUv_X11yzGSk9CJ4VMSdQfdaVFB1nx2gy4Gu46ounVMYWrgyALc88CkYXwxB0x-k6BRbHsxnSgqkTRCdik6ykBNvbWTcPC84NKQ884ddUV96QBY_ag1jBReQINeSS5lI1yMWPvfBFAdIWSgRzG9g6oIUZyGsnIHhl_Dhh9hvMlUcNyMTIROjLTParpNUlJSm9Ew3CANWHm1sMfMA95lDhfPxiTVQj4BKuXMrYcfT-Ae4DlUZYgSUuJwytQcrHx7EbVN7FdR7G3iTLCaR7NWUCx7MXmt301pB8V65VMTN4vnk0EqEpJqanMPmUbgA9YdVh0w764kCEZnvllyyqErnNJgU2c6oMmV11YfhseTCRjgFgB4EnJUVO5KtQ0c45OrLn8UVQe3PnhI91XKFqIatmlctXEXH6dxlCwU6qteVxVeEFsIPGCNKr1_GWCz526De-Cfuq7iWsN5FyKVn3hvN-1xslaen2MgXpT3S8BLEqTL7U6cl1hel6rprsc69Pegwqp8oiwkyTdWbyCuxIhBSJQKCBdiRk6PJhpHy_IMBj-3Zp1-B8CVCAg4n3xat2zgL0uNTzVOnxcHH-Mv2T1ETsfgqXpfpztywygJfwv2io-rdIRLA2HTQ3tWJnXm1YUL4fm_pZLIhFxmf-974NYMsYIK4wIKFW12LuSNYZWMcL-hfIH4JBu_S0btdIP3OQp35TDZqNdJgvnN5HsA7SQFGcmCQAJTorWkLvSNmtcyPReXBTXpKj_tDXdCrw5gqHc0JAQRDnHTbzKL7VDScMxrOstUcz3dLzIYY74PK5TZiGY1lFKyjfDJic3wrWLBvDWYRpD9poLNiAlm-w5bPw5QGVSr9QRjYrqW8wkwxBsm_LHwEiNeBnqCQxqmj1UkrrEdpPIBVopjtk07io6T71QbXmCfGTZqYzPvFePQk5glJQXYYaiq0spA5oKyZRNs7WaNyi54blRKqcHIGYHprJUd6J8NmBSk-NtSGqCmg4DGVm5aNeTLJ5ZSkIHv_imxQygDljRpIt-MVMHqcTEGjzGDfYNK2fgz26jHH9wSYXtGpOu6Bc964byAQnBQboVQ-3JjiKdaegED69faZuGJsWDvKUhg0D9S_8dKW88xp3YPeFzDzbL_0eFhim-VOuNfKHgh066DZHUdUbrSNxkymQlWrdv2yq0n1vdUcizFsSNyM-Af8g4ycRZlNY19LnRpWmL2QEOAAe-p8xk_2SKvOj9MPyshpBJBsDA_sEmX32jox1bV0uyX2Nj1MVZhp7Hwp7bqE-QN8kmbymaCLEATVAsNiULqX7gl5YhVmyUBsruX_KbzCs8ogJBi7dCAyiGgOTkPmwQn0OTEvMYwI93fCmvbcou7vBejvhC5KgYue2MqHoFlp_HTMQJhq0GUl4IaZDB7CSk8yVT43Q2_w4ztdwpBhOQYZ7WsOYa0TnfLjGSq6d97RkYEJ7qeUnZI4xJs1zRPEK9_MHjbDm82-oz_t7nUaZfck4Ku_W9JzqsplM6plfbNLSRCJQHMKTdwhyHKLO-r7Z4bJJemxiymltFP9dD1kkl5hehpqfpLlnk_ULGBYnoWkIAKOLnIoMg29-y1ANt0JgZ1nJ4IJHOlIZPUWMjiawDJuRCiPQvZ6KQDcrURFriFQiNapmxjDWvWTXUUK41cgCV946mIkr7VsPx16izsnk5FLVY1ZiSmpflAyduTpVcYmiyulUEigy95jlW8fOoo4VD6zIzzxse1buArDZVScrOqIpsppj2Q-rHnM2Nym9VepsiqMwxYezRg3Qh_WiKqYUmbkypvfHlqmR-CGzS4iRcwJ8biYf-lL6N1QJZVgSvDOovKTeRqXt_u8G-yCXFMjE0Wtj8iwNXAybQokaNwpIIw9sksCm7-h07rjchFptRMOradsKdpYluhkJXqQVSMdOvEOQDA9fLVVy1G01a0eHWJnYwj9wtI2sRJ4yU8bzQLgFtAWcMq92SbKx0LVIbNoSe2pkok6KYAGdBnY4hXod9obTQh83EG7rGPA6DgHDL9myt-zUHXJPOvT29kyr3qH_9Y7qq2KP7YOfO33E7H5M_KEgiXAFXJB8jfUqfh4D9pUSgC72oUcQHmNg3YZNRUyngetaRr-uccBiigl4mkt26oWb_vtaQOB8GO7UAluo5H6JZSWo2OtnmFL3N9efxQuBa84Q-hdqKLUo4LgiScYOopTvPOWO0dwB8VTMjR5ZJRyD45A4RZlz4pS2fU-kp3riz98tmrstbNXexVkLQozlEHNWLAOfolT6VdmB-DdXtrPWAuUJw2TEbypAZBPH3RjaB9veSMnLbVWOQzH_CPNvE7OSH6Ns183zSER85Dl8Fv9yqc6-DCohtLjPHDZ-WBty5AiJFgW09FEorx9mIIHXpUH1--fkoA7pe0XeAkVsnGPpqozPjDZkvTVlxcAA1ksIymF5zfhkGatdKx2e8wBUu7BhWZdDokm2mXkjmGh1jhPcyKXJYjUt8QkCrzoVW3xClTYi7OxW-DDUtWCSDMjSfFcbyLbGNRQ-JGZWcOtEAxTPpZaUHQ2qpd9ZLra-6_yGJpGRmDt9RsnHktPVfTTwSgOdmp6OkXwyNFyrfgMevasB3RfSr8i9KEXqjVbS-SNIvr9UFrX3gb2KO1HShxSGTU09jz8k5Jv4i4d8e33A8Fqf4gO_-1R1Vy7ycufMd3b6Z6Ho7QOHhe2NLheKJD8o_UK_69oOZgeZs_nk0Ue_Jc6-zO6R6Hrnn0Xrl6nUhy04NngX6o7PX0Nu7a1mQv7kpZ2s9GdtXlmCLVpq8xGm1-TuRlHj2onnLEzKv_qKa7eEzTZBtp_4QjVeQM7_qewFdws53DTzRG0FoIMXPLh2nz9KP07MKmY4ljHxjy7__10JssaEdHUZo_9FH8L7fZk1_YuFTnflemEpGbl3GcLBr1cOTB6_qF9eD-cwGuik83Tp08TgkHlh0AAy7Q2U2z39D8ag_F0ynuRxYkNBDQXbmjKV4EHhEAbXuLrHEZLHU5pAcU-xeyTdi-WSKymtn7C33P8I4wklm4-zBPlbrGMPwRv4KNCS6x2tOo1Etgcsgh6YgZbLOXX4ctI16yevQwUuw9YDa4Cm_qXUuPWsTdLoudBcR4XBbeWDMF1T6u0bD8hzZv7QIoKM2WmrLy1vVbpAHTfc23lDZSKYlxXI2I9YBqAbvYtbRyT9wlveVr7jAi50T_iD_7DneLhLWu3lT2eQy4y3y8obb9vH4tfiZ0qcyBGpCACWuBrjVc8jzFynnZhqUvSMt_eZNqx43PBVmuQI2oKAE7z0BW-r358dZOsUhr7Mn_g511gJQSlExbkemEQ8wMCuKm-DzSHiuRZc4rmjK93J5M2m10Ua7ECsJTX37U3z4FjJ3hPyQpgVe2tsuM-YM3BoD6sdcs40mvLoGFVrdm165Ms1sCcgavyNOsajjtk7ESX4X32uMRwEp1MF96VouJcQaCxjNfm2mzsWrTEQP45pcnG0v4Lum9KEKpll5lbsau-IRmKy4SiwQvjomzRJp1LPIZZw8C1phaAkb2q6whJr71X18KK9LXOcC6nvBYlU-4CZrkk88_rLee7ANTJdfnWiRvMXT4UD__285O8GyFOo-pXx1hYlSMYbayhZm_QPI9-tTku37TrtzxSjIPDm5Dq9VqYTNN3IHykBpG1QfmEtNCMbK_NyHbdnUIMtqSVYbPr6Hoc4PsKvgYlRhRMoQQnXEm7udPyPSwfzfoHLzQ0gfY8aENaq-xebctpUclSEOnleydfbDCaqJnH5WNJKFwWrpR8Rl9pzpJzd5DBVrQlS1qFxiuRrzfqUiMPT2XDpLcxZJAGqwrkDe8CGk3grCh5mAta1iBAci-E8it2uRzdyqSflfzeSqBEf3sZj7BH0G8RwOmv4_7atNuchvmz-YROfXI1asU4k_6UzkUEIR7DjOWbltPUIp9fLxNxJsnmio0aqB-wWnp6vZEAVnQetl1W9cC_oIV1cBuwkGCuxIHyaEc3ujcn8PIhspAAGiDdsok112eGW8Lf-EmBsG24-e355nAAQAtjcMXO1f3M8vyvrASTSY4oT0r3WmidQ28FRs9vG26Jy64A4ig1Dvg6h2tQY8ndYQmsCpdvjgVipbyDbEHA0Q-MqOGzfaxQ8TNY9gVv-iJd_tYPjHc4f_1rgNLF0ExVx-IJsN8OsuTI9PpMYWEpGytOpwqoh_oZnhEG9VPHKHFbPe5iSzynTu8-XECYZs9wc79CVMatbxWN0D8BsjVP4dmXHsZDREt-am4ZOpmrtaIu0-vNdGdT61YUD1PGjOooNkAQPuDD8dL3ROFEoGN73owZj7Pki6yiBpLUqB9r3Y1pNZHgLpUZP1WGFWXjBGZ4UhhIDUf8oaHYa8FIhYLQZeYec6F8x1f6dbvJjcr5IR9UcPuYBLlXHm3o1ks_djNIgg34EIWiaanBC-wwhre1kmrBdsZ70Q9wD1h5GFsFqikvoRmOkFGg0gMQNvKxCmD_h6gQKFlrE-yT9ByGVhsSsCjTo1MDb0_d9Wab-7GFSQ4ndFMRUq9qQAVuchnODV5pZgOX_joDgCY3WQrsrg0xLe7_qBqY7VULGU-uEaayhjSk7vFYmFYIscV11c4qPLZx_9jLXqH1-YxduBxOyvy1Vz6seXYl4b40S62SkU8eUMN9hYENnLV3febIFiI2J2flm5QubO3HS27jX-UbWAosu0SrABkCy_8YuK91WHoTcFt2dNeAgs7qfK73dvqwaclNBee2yK23iy6Re4YllgXmO5t8c-xsyM6AdGgjwQy3SNgo5eph7EPjEiGgainxV17NGS-MOtF0kU_Mn59dlqnPO41ieXl2rad_9lvfTAoW4uq-5FS4cFqSUBqp9RrufMwZyOcL3671WBOtHdUwSQRsXS8S6Uo7X2CEoN16-ux2wJxhmcAPqHjCPIBnjfH0Fq1gMYOOch200ENkkoE3ebCMQMCrE8RwxnPqLtYDwM4EN-N878Pucwad5b9d3DIK9erFoG7jHftZDqQdILhsSqH04d3_676tp9Kk-v-PJiLz9bcGLXMWsn0EeOCkoFeOrbTYRnUl-2k8Rx84F_rQfVgwRR23MvydjmAS3u77Gzv-ThwiSn0fmd9AA0onZABg-USdVhzfWaX82S71BZN28ktXCw4BWzISxCptNdqyIVdptGvlLrMYcKWUiQbdFYcA4R2rE_kArmX69sJyL2pAT5NhLNM6vufNaWynTnl63TF0iqWr5IU6z3K2UDMOmjt0wD1w1RoD9zMPB3tpIAmroyDaeSZ7EsmQDPkHBDQViRBCl4vI3BIID7sylcAUYfWahEaB97KT6gp51k9Z5vv2miQZG0x8I_e7YJ1sTQ2_KvuGVYMdB94vkptOZc-wVe3ZBx4pv0qiWsikTo0RYtnomHMVzVFB5nrZguqg17_hpqlDelP1HO_OxD63f3n345z6c08W9whGTcAT_G_uBnzB8BCd2tOwUeFp9GC469NGL7WfazBEEc6Y1e0zR5N-QM1tRZFxn9GKpw-ns-2OVbQw2Z9sPAap2DV0-KYPW0dEYzro9prf9xuzLEsFJBGObLlJwLQ5advAXBQlGr7zQIcW6ed5qrK23q9wl1glbFHpJ_rjbXoxqTiWlxirxFYEdo0BCAeRRm2vWwGsGOq-NdTTpPCUYGTk_sfzAG2yX7nWkvHNF7oZQ3z89TfpbL0dyvuh2zNy1YGb-cORFg4_utSPgPWFgLAEvBZtI6vPwJ1u8JPGJ1BXwI6nhSSjybYVJrvQfearksa0KWR7c2h7jDlONMFu1XcHGFZFx23qHgfqHakRrwXYPowMScWdbKkDAiFfYBoC-62mmlHosEPObJ6qLaNRVZGgn9e8hTrH_JwiZMYrAwXoJoFrM4DCYX6pfqZMbUcoNVcY2ixmo6ZbPVwrGT6gM0hcMHEGIux0kHTks02i8eJHYBDayGOfUwI2XqitYFg_ydxW224a6DPpCVYB_05DyWDnCqOoptu4D45f03HhG4XVNRWZe5E9mvmupRYLfoPar4AfGkEZSLWRDX53EXKqwLLp_mGmvKvcgc9iGNjeGtFVfa3sBAIod0OVULwd8aQAah1yb_-ZX4WAHcAZh6cwZb6cukxDPBD82Mh3PSKbr3roNRlmwJVY7zD5FbdHJIMPeQwfPKPXvv5O7YawO_gcp-2dEPuhRb_P_-DwNRQ0PfhBal5jF8N0SXVdZtknKuMONxjAEb4ic2Lse0s7T3u3W7kX-fxjBK6lpSUxe6ExtmxSCxyOxdIhwMLCPYQ9cWZu693u6u85JFqfr4iidbVHQZv4xmo8TznUt-PepQde21GrrrqQ7K3FzjdTfp3mDtEDD-Y0I4wFyCHalforTzYjAYqdcImEhDTsJ_GxI11d8SfhqSVhI5NBRNnAr7xORyzCpbtoalrj1Q27nN6VG_xlH8yPbqpY5WPU3FBLy6C7LMNQrPYtQe1xn_lVi2D308UTq2ytNsnG36TxMf0IGj8XiVbE69MCjOmsvsc1MhjAbgXtFLpGwFC130cLUAkHYo3QtXoPQeUUWD-kuqCBEYnad9lrwJmpsz3-QTxOnAILjRFMfIgFUYAITqzrMG76SwyGpfcB1mtvht2VSb9b9DeaD1kfSgafaDbC05CCMOHyMzhvgafZr88Gxe4y0E_AYnUSMslNDH5KgaQxC-dcNC5HQM4S8UxXLYCPlRmhtwnE8df-32-64ImnawRif78cXq3WDf_9iisYZbGiz0nEojcLpRzR3krRhi8BWw8Yi0p9wb7A0heCIZ8AozU1Iwco3etVtfLmr8_1McA4sJJDGQr16_0gcKWu_a1IIL7B6zA_yjKMY4paEWha6umVlBo6EU74xjVh0YDSlHqSM0XWUPOPKGUpEPae7UXRu7MYR-Z_vFw10QkgqYXhLr8XhyP9g0GgrBcEyT6-yr355YhW5DipmsjXiDxAbOFy6sLGyu38_lDDbxEYEQe29_P_DB8ysgxPywXF9o7AOjinnbKeX_Uth1Mnx-HeN-Bl-vKimHbNL2G5-L6i6H46IM2bY42Kp24cKVCJ-dLIxqnohIVLAOFE-9ENGPpHpjz7GmTw9wQnucY1I-cMfBH5JQI0hQe3iu8oK1xIiUKsgpqbGuPXbQzApc4UA88LR9bnNdSk_AhDOfUWErFW97k0TsIMOz7ItZP8xXodXjL_kT-vm5ru0rqTrkWknUyUg9EhBEy8xUoate1HqomlNZKKjIHVpH786b5gjQqJ2faFX_7mYuPmMePzy62T2YEiD9EXfFCJq99Xc2oyebmA4yR5-GfanX5tcpl0QD8EC_mhuMrsMPscv_KmN0bukoJurUIWI2hwGyoE9KJHVx26S8RjqUdrsGdJOErgb56vkZasShp4AdEq3_gmFXSglqAGvTdwl2Zipsyp0Zp4sYPL8unD6of-RxSKIExSel0p7aryn9OOb40bXREU5h3sY7f2hWIURqOnQ2CBPK0pRhzaJDONVBUWLFgHIg1Vca7UAcBdrb9Ac18Yuye8RbPHxL8Q4KnTKpmRSWD0iw4DeR8Nz2q7hWKWlKFmrje_5a0TtOmFNmHmgMsyjN9UbjGANu7eEZZnOHhi-Foa9vuNS0QQXxH2fHjQOYJaVsDOdeEu-9-juX6SV43hMQNJKGzw34MKAzDbObtvQZNlGTpSrLEZ189NJDq5UQ8-v4Sitj_uLWrTA54evD-5mm0gd15yNUE9yoOhW4pCIjqtNRZbQg1u-UTUJs0qPFe2smpCe-4Lj-sU-GudfskxScV7hMLsg-7A0G4HdBlg1jW1DNbnWhBxL1bUtpxENp3S1BEfbwzo9stE4ZrsYhRza4X2p-Oa0jZHyAFrkB1VdEfVJmjX26g1OR8CF7odtACqh-aVjPVQcoVZW8vOjWhyosvFA094v97xCiv4gHb1ND7T57cqtINGbInoY7fDBVKpeADhvNiHYpiTCF4Yw6rrP22jGoXOK13z0KtIBHpwOvy9dBU3AQPsWYXaOIBW5F9IZfZEmsP8N4fPnplHIFfAEpn3uqbxUfRSaQq-kauwdoKLuhAn7lAq3ii7sy3dH6g3r61aF_vCS2BREbWGSI8IK1UmXSGH4593MKH3ujGMVADkKGiSEaNMLVKGjNcph0UY6GlmIJDKB9CruotXnRjD4Em0ZnXuEKpYo0NDkD3Dw1LbSQmaXQqyFE-IzbPi5pIMrB7MBjvXBPkqy1kxLChoQjWl0rKS6x6J8BFddqmA_D0Rf_-jSBUi4SR_k3CR1aiPC3D-y9aU6mKFzncjcSVXTgMnQragic29KQEVJxQ41_lBHxyqfOeg8dHIYY6uqh5Q9cRGT5Lhn2F9dJGROP5AczLiEDeJobRGyLtdsMtdl3UjOjcnQ-4qQXPckEBid2UoO9wu8pnRzdhT1Qxv5BnZ2Dm9w2BQXzTjMGRgFEy52KvxdO9F5tDzkSULAfdrQmWqkHb8aV42u0Qd_icOEVaxIGAravyO1oW0a7SN7OhovvQPNDCbK4e-XU_8GoPnu0xGOklILKj7iiAv9nx2RRxH2uS9dwq8xEmCCrVc8XBrqVVlqTLJrunPIJfer_sGXp2DMYs3F9wnIK1QfNMjC5birX_r9JtIf46_IevdNrKLMHd40TILtjE38cUvGFnkR5pR1HTgxbxEcd745iIooQ8FaVDb0ssM2gV3MyQrOUeagKAVFWqXlk9YrHFm4UUuQWvjTZlg4DOt1klxJ5ilVXbYkW9Ng8jK4JdCun-6v8ahURTLVj6xcosP-aoGFsQzAk-_XkScqUDKJYuhWmLK3DMNL8J_sVVQfyYh0sjuNGtESYdJb-a2QZrtTMpm02ufgOT0dK_oGUbbtfC3drMYRBzCOg3HRBqi-vDDc7zQP9zhaw6qRW26z3kTQTyqz6JSjVqRjc08FhT0GbECwLYhPtb015q5aDs8-t5enL12wdbIOzWSxea99vdykrvyVynLmv2hzivSSEUDPEYVTogsqq16z4HyXxpSk1KBMRt_Qa5lUOscscvHb7YYnrWMu5czNY3VIhRp9GJ3PeByPLZhEJNnNaxA5FIXSuQ6_sEMt6WWv9NuETl7hmbfgp1G4HYxtXp8bnujL6PYutXUdFSzrJd4l0ZrN1amW6A08P51FZDjDgSKcEHzaRABWNZev0OfruXbMexOh6ZsJpdOuhnMsC4MKv5K6TxvryEzrCVUzOg-9TbVSMg6DvWM_z-_BcapahlRfZlTDZDYzipkr9zxwCCz4bIwwDeEnqhMTcQ8sSiejkmtbU5gz2Ko9RO210v_wNp4NDTGUzQFEfYN9wQH8kNtE9LMksMS4SBoGSIqbtpwZJk8wp6cXq4juT-g8hK1LODygPeMVLfSPUoYTukN86Ol22BLu3DS-eCRsdJFxVSmClbWV_WypfcHR6Rwxfdr5427mS8s4Ec3knl9mweOHqDjJzJYBmrabUtrBGkbB68PzUBGM6PQQpq3HfzUvAf-1rBxDkEOqoVP_FosGIDPtyXQo45RhbkfS9BAHlClRm8dvxNaQ2h0Scp4BfNNXreyBMHK5mrDJLGWYocKT3guONWYzzzKmcb42NwgFxk2vJ55mo_H6dDN8_FLIgguz-_0ifubQXAvWcrsdMb_ac1ybjnFJn4ftbe4oSMspE1Jt3rXKVpkaPA9OWeq53hmTTAIahFqfmoPkfInJIcUsc_owLX8IUDDIQ6NxluMv4pK1ZVWgCwLlf1Ra0iYWnVKdt6r6iwSOOqVh3gZllgFwKYTc1Pi019w52jve-qiWdOv6LKWhtbEn_tyX4xMN4zdmeI3DsKqboEowxrixJFjp6MiWg7HjTZFjCU6ttjUWVU90tKI7Y6wpcsNKhzUbM4Z_9HmrPWFkGVAk1cdk5e4a0RDc9C5APBRgtLS11h7C4NZmdeD0c-trM0J124rCTTONA7pk1-Mijn3j3kThn_4lj62gp9pv2PAHDzznf0l6SYSdlj_UOhoJTXw35TnK-HQsl3YhueypaQTidL6uT-CkvAWC0gbM7_GTYUEeXE7ZS6ThPAkk35IV-kkalF_WjF_yP-fAINsyMk54Y0jM4_QNeH55tDJuoI-L2I8ska2GaTf7rBpyWzfz-OAz8B6TkvcQ2SpjEilIsKgcRZYRp56hmgPQvwh-XlpUQkCnvT1MlwGl-SYdycE1wL48H_yBRBNitvVGWTzUjLPoQOhqVZajNXiidrVjus5HXKb4O5BCPXdw8XWp412MIOvHkdARjLcOt4QF0vJUDUT1JqjUQ-yKUinQoK1THani5QVnmpcYAqLdJhtwAIbczaENxmwEqIxQvKUcMPkSxJBoaWGP2WBiyvoeu9E6QAvWReb-xKAMqM7dZbGvQWvukFGsQXHuSYBs4WtuX-JNwlf5LDnhgJgK3-V6EnZ5AObOBR4wXMrH2D5FpbkLAM_C5_wJ2b-xxunuGHs2KwrGzVGR8r2AzZJ-GCWEqooTRmw-tizWDzio8dqctSiTBXBJ04cby9nAiyrU_vzhQkx5xOJGQPtX_QU"
    },
    debug: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,I,A,E,T,x,N,O,C,$,j,M=\"@info\",_=\"@consent\",U=\"_tail:\",F=U+\"state\",q=U+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},z=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!z(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},R=(e,t,...r)=>e===t||r.length>0&&r.some(t=>R(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},V=e=>{var t={initialized:!0,then:J(()=>(t.initialized=!0,ts(e)))};return t},J=e=>{var t=B(e);return(e,r)=>K(t,[e,r])},K=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:L,en=(e,t)=>eS(t)?e!==L?t(e):L:e?.[t]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?L:!t&&ev(e)?e:eI(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eI=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eA=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==L?(e=eO(e),t??=0,r??=H,(n,a)=>t--?L:r--?e?e(n,a):n:r):e,e$=e=>e?.filter(ee),ej=(e,t,r,n)=>null==e?[]:!t&&ev(e)?e$(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===L?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):ej(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),eM=(e,t)=>t&&!ev(e)?[...e]:e,e_=(e,t,r,n)=>ej(e,t,r,n),eU=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?ej(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(ej(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(e_(e,t,r,n)):L},eq=(e,t,r,n)=>null!=e?new Set([...e_(e,t,r,n)]):L,eP=(e,t,r=1,n=!1,a,i)=>eh(eU(e,t,r,n,a,i)),ez=(...e)=>{var t;return eJ(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},eR=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?L:eI(e)?eF(e,e=>t(e,...r)):t(e,...r),eV=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return eR(e,t,r,n);if(r===L){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of ej(e,t,r,n))null!=i&&(a=i);return a}},eJ=eV,eK=async(e,t,r,n)=>{var a;if(null==e)return L;for(var i of e_(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,t,r)=>{if(null==e)return L;if(ea(t)||r){var n={};return eJ(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eJ(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eV(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>eM(ej(e,(e,r)=>t(e,r)?e:L,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return L;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eV(e,()=>++a)??0},eZ=(e,...t)=>null==e?L:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,L,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eI(e)?eF(e,eA(e)?e=>e:eE(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):L,e1=(e,t,r,n)=>null==e?L:(t=eO(t),eV(e,(e,r)=>!t||(e=t(e,r))?eN(e):L,r,n)),e2=(e,t,r,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eV(e,(e,r)=>!t||t(e,r)?e:L,r,n),e4=(e,t,r,n)=>null==e?L:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eV(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e3=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e5=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e3(e,t,n),n}},e8=(e,...t)=>(eJ(t,t=>eJ(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eJ(r,r=>ev(r)?e(t,r[0],r[1]):eJ(r,([r,n])=>e(t,r,n))),t)},e7=e9(e3),te=e9((e,t,r)=>e3(e,t,eS(r)?r(e5(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e5(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e5(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e5(e,t),i+1,e,t))):a(e5(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eL(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eE(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eA(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eJ(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await K(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tI=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tA=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):L,tE=(e,t,r)=>null==e?L:ev(t)?null==(t=t[0])?L:t+\" \"+tE(e,t,r):null==t?L:1===t?e:r??e+\"s\",tT=(e,t,r)=>r?(tu(r,\"\\x1b[\",t,\"m\"),ev(e)?tu(r,...e):tu(r,e),tu(r,\"\\x1b[m\"),r):tT(e,t,[]).join(\"\"),tx=(e,t=\"'\")=>null==e?L:t+e+t,tN=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tO=(e,t,r)=>null==e?L:eS(t)?tA(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tA(eF(e,e=>!1===e?L:e),t??\"\"),tC=e=>(e=Math.log2(e))===(0|e),t$=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):L,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,L):(e??0)|r,(p=!1,L)):v(e),(e,t)=>null==(e=h(e,!1))?L:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tC(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],m=(e,t)=>null==e?L:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tC(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tA(eF(eh(e),e=>tx(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tj=(...e)=>{var t=e0(eL(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=L;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tM=Symbol(),t_=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:L)||(n[1]?[n[1]]:[]),n},tU=(e,t=!0,r)=>null==e?L:tR(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===t?f:tF(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),tF=(e,t,r=!0)=>tq(e,\"&\",t,r),tq=(e,t,r,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=t_(e,!1===r?[]:!0===r?L:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,t)=>e?!1!==r?ez(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tM]=a),i},tP=(e,t)=>t&&null!=e?t.test(e):L,tz=(e,t,r)=>tR(e,t,r,!0),tR=(r,n,a,i=!1)=>(r??n)==null?L:a?(e=L,i?(t=[],tR(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tD=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tW=/\\z./g,tB=(e,t)=>(t=tO(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tW,tV={},tJ=e=>e instanceof RegExp,tK=(e,t=[\",\",\" \"])=>tJ(e)?e:ev(e)?tB(eF(e,e=>tK(e,t)?.source)):ea(e)?e?/./g:tW:ef(e)?tV[e]??=tR(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tB(eF(tG(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tO(t,tD)}]`)),e=>e&&`^${tO(tG(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tD(tL(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,tG=(e,t)=>e?.split(t)??e,tL=(e,t,r)=>e?.replace(t,r)??e,tH=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tX=5e3,tY=()=>()=>P(\"Not initialized.\"),tZ=window,tQ=document,t0=tQ.body,t1=(e,t)=>!!e?.matches(t),t2=H,t4=(e,t,r=(e,t)=>t>=t2)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t6=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>nd(e),Z);case\"e\":return W(()=>np?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t6(e,t[0])):void 0}},t3=(e,t,r)=>t6(e?.getAttribute(t),r),t5=(e,t,r)=>t4(e,(e,n)=>n(t3(e,t,r))),t8=(e,t)=>t3(e,t)?.trim()?.toLowerCase(),t9=e=>e?.getAttributeNames(),t7=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,re=e=>null!=e?e.tagName:null,rt=()=>({x:(r=rr(X)).x/(t0.offsetWidth-window.innerWidth)||0,y:r.y/(t0.offsetHeight-window.innerHeight)||0}),rr=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),rn=(e,t)=>tL(e,/#.*$/,\"\")===tL(t,/#.*$/,\"\"),ra=(e,t,r=Y)=>(n=ri(e,t))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/t0.offsetWidth,4),y:eT(n.y/t0.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),ri=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ro(e),{x:a,y:i}):void 0,ro=e=>e?(o=e.getBoundingClientRect(),r=rr(X),{x:eT(o.left+r.x),y:eT(o.top+r.y),width:eT(o.width),height:eT(o.height)}):void 0,rs=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eJ(t,t=>e.addEventListener(t,r,n)),r=>eJ(t,t=>e.removeEventListener(t,r,n)))),rl=e=>{var{host:t,scheme:r,port:n}=tU(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},ru=()=>({...r=rr(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:t0.offsetWidth,totalHeight:t0.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var rc=t$(s,!1,\"data classification\"),rf=(e,t)=>rc.parse(e?.classification??e?.level)===rc.parse(t?.classification??t?.level)&&rv.parse(e?.purposes??e?.purposes)===rv.parse(t?.purposes??t?.purposes),rd=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rc.parse(e.classification??e.level??t?.classification??0),purposes:rv.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var rv=t$(l,!0,\"data purpose\",2111),rp=t$(l,!1,\"data purpose\",0),rh=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rg=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rm=t$(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var ry=e=>`'${e.key}' in ${rm.format(e.scope)} scope`,rb={scope:rm,purpose:rp,purposes:rv,classification:rc};tj(rb);var rw=e=>e?.filter(ee).sort((e,t)=>e.scope===t.scope?e.key.localeCompare(t.key,\"en\"):e.scope-t.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",t$(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",t$(d,!1,\"variable set status\");var rk=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rE)=>V(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rI)),values:o(e=>eF(e,e=>rI(e)?.value)),push:()=>(i=e=>(r?.(eF(rS(e))),e),s),value:o(e=>rI(e[0])?.value),variable:o(e=>rI(e[0])),result:o(e=>e[0])};return s},rS=e=>e?.map(e=>e?.status<400?e:L),rI=e=>rA(e)?e.current??e:L,rA=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rE=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${ry(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rT=e=>rE(e,L,!0),rx=e=>e&&\"string\"==typeof e.type,rN=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rO=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rC=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),r$=(e,t=\"\",r=new Map)=>{if(e)return eI(e)?eJ(e,e=>r$(e,t,r)):ef(e)?tR(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rO(n)+\"::\":\"\")+t+rO(a),value:rO(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rC(r,u)}):rC(r,e),r},rj=new WeakMap,rM=e=>rj.get(e),r_=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rU=(e,t,r,n,a,i)=>t?.[1]&&eJ(t9(e),o=>t[0][o]??=(i=X,ef(n=eJ(t[1],([t,r,n],a)=>tP(o,t)&&(i=void 0,!r||t1(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&r$(a,tL(n,/\\-/g,\":\"),r),i)),rF=()=>{},rq=(e,t)=>{if(h===(h=rV.tags))return rF(e,t);var r=e=>e?tJ(e)?[[e]]:eI(e)?eP(e,r):[eb(e)?[tK(e.match),e.selector,e.prefix]:[tK(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rF=(e,t)=>rU(e,n,t))(e,t)},rP=(e,t)=>tO(ez(t7(e,r_(t,Y)),t7(e,r_(\"base-\"+t,Y))),\" \"),rz={},rR=(e,t,r=rP(e,\"attributes\"))=>{r&&rU(e,rz[r]??=[{},tz(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tK(r||n),,t])],t),r$(rP(e,\"tags\"),void 0,t)},rD=(e,t,r=X,n)=>(r?t4(e,(e,r)=>r(rD(e,t,X)),eS(r)?r:void 0):tO(ez(t3(e,r_(t)),t7(e,r_(t,Y))),\" \"))??(n&&(g=rM(e))&&n(g))??null,rW=(e,t,r=X,n)=>\"\"===(m=rD(e,t,r,n))||(null==m?m:ei(m)),rB=(e,t,r,n)=>e?(rR(e,n??=new Map),t4(e,e=>{rq(e,n),r$(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rV={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rJ=[],rK=[],rG=(e,t=0)=>e.charCodeAt(t),rL=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rJ[rK[t]=e.charCodeAt(0)]=t);var rH=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rK[(16515072&t)>>18],rK[(258048&t)>>12],rK[(4032&t)>>6],rK[63&t]);return a.length+=n-r,rL(a)},rX=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rJ[rG(e,r++)]<<2|(t=rJ[rG(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rJ[rG(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rJ[rG(e,r++)]));return i},rY={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rZ=(e=256)=>e*Math.random()|0,rQ=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rZ()));for(r=0,i[n++]=g(f^16*rZ(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rZ();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rY[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},r0={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(r0);var{deserialize:r1,serialize:r2}=(C=r0.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r4=\"$ref\",r6=(e,t,r)=>ek(e)?L:r?t!==L:null===t||t,r3=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r6(t,n,r)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r4]||(e[r4]=o,l(()=>delete e[r4])),{[r4]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eI(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r2(u(e)??null):W(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},r5=e=>{var t,r,n=e=>eg(e)?e[r4]&&(r=(t??=[])[e[r4]])?r:(e[r4]&&(t[e[r4]]=e,delete e[r4]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>r1(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},r8=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r3(e,!1,r))):r3(e,!0,r),n);if(t)return[e=>r3(e,!1,r),e=>null==e?L:W(()=>r5(e),L),(e,t)=>n(e,t)];var[a,i,o]=rQ(e);return[(e,t)=>(t?Q:rH)(a(r3(e,!0,r))),e=>null!=e?r5(i(e instanceof Uint8Array?e:rX(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r8();var[r9,r7]=r8(null,{json:!0,prettify:!0}),ne=tG(\"\"+tQ.currentScript.src,\"#\"),nt=tG(\"\"+(ne[1]||\"\"),\";\"),nr=ne[0],nn=nt[1]||tU(nr,!1)?.host,na=e=>!!(nn&&tU(e,!1)?.host?.endsWith(nn)===Y),ni=(...e)=>tL(tO(e),/(^(?=\\?))|(^\\.(?=\\/))/,nr.split(\"?\")[0]),no=ni(\"?\",\"var\"),ns=ni(\"?\",\"mnt\");ni(\"?\",\"usr\");var nl=Symbol(),nu=Symbol(),nc=(e,t,r=Y,n=X)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tT(\"tail.js: \",\"90;3\"))+t);var a=e?.[nu];a&&(e=e[nl]),null!=e&&console.log(eg(e)?tT(r9(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,t,r])=>nc(e,t,r,!0)),t&&console.groupEnd()},[nf,nd]=r8(),[nv,np]=[tY,tY],[nh,ng]=tI(),nm=e=>{np===tY&&([nv,np]=r8(e),ng(nv,np))},ny=e=>t=>nb(e,t),nb=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nw,nk]=tI(),[nS,nI]=tI(),nA=e=>nT!==(nT=e)&&nk(nT=!1,nO(!0,!0)),nE=e=>nx!==(nx=!!e&&\"visible\"===document.visibilityState)&&nI(nx,!e,nN(!0,!0));nw(nE);var nT=!0,nx=!1,nN=tv(!1),nO=tv(!1);rs(window,[\"pagehide\",\"freeze\"],()=>nA(!1)),rs(window,[\"pageshow\",\"resume\"],()=>nA(!0)),rs(document,\"visibilitychange\",()=>(nE(!0),nx&&nA(!0))),nk(nT,nO(!0,!0));var nC=!1,n$=tv(!1),[nj,nM]=tI(),n_=th({callback:()=>nC&&nM(nC=!1,n$(!1)),frequency:2e4,once:!0,paused:!0}),nU=()=>!nC&&(nM(nC=!0,n$(!0)),n_.restart());rs(window,[\"focus\",\"scroll\"],nU),rs(window,\"blur\",()=>n_.trigger()),rs(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nU),nU();var nF=()=>n$();($=b||(b={}))[$.View=-3]=\"View\",$[$.Tab=-2]=\"Tab\",$[$.Shared=-1]=\"Shared\";var nq=t$(b,!1,\"local variable scope\"),nP=e=>nq.tryParse(e)??rm(e),nz=e=>nq.format(e)??rm.format(e),nR=e=>!!nq.tryParse(e?.scope),nD=tj({scope:nq},rb),nW=e=>null==e?void 0:ef(e)?e:e.source?nW(e.source):`${nP(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nB=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nV=0,nJ=void 0,nK=()=>(nJ??tY())+\"_\"+nG(),nG=()=>(td(!0)-(parseInt(nJ.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nV).toString(36),nL=e=>crypto.getRandomValues(e),nH=()=>tL(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nL(new Uint8Array(1))[0]&15>>e/4).toString(16)),nX={},nY={id:nJ,heartbeat:td()},nZ={knownTabs:{[nJ]:nY},variables:{}},[nQ,n0]=tI(),[n1,n2]=tI(),n4=tY,n6=e=>nX[nW(e)],n3=(...e)=>n8(e.map(e=>(e.cache=[td(),3e3],nD(e)))),n5=e=>eF(e,e=>e&&[e,nX[nW(e)]]),n8=e=>{var t=eF(e,e=>e&&[nW(e),e]);if(t?.length){var r=n5(e);e7(nX,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nZ.variables,n),n4({type:\"patch\",payload:eL(n)})),n2(r,nX,!0)}};nh((e,t)=>{nw(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nJ=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nX=eL(ez(eX(nX,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nW(e),e])))}else sessionStorage.setItem(F,e([nJ,eF(nX,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n4=(t,r)=>{e&&(localStorage.setItem(F,e([nJ,t,r])),localStorage.removeItem(F))},rs(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nJ)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||n4({type:\"set\",payload:nZ},a);else if(\"set\"===i&&r.active)e7(nZ,o),e7(nX,o.variables),r.trigger();else if(\"patch\"===i){var s=n5(eF(o,1));e7(nZ.variables,o),e7(nX,o),n2(s,nX,!1)}else\"tab\"===i&&(e7(nZ.knownTabs,a,o),o&&n0(\"tab\",o,!1))}}});var r=th(()=>n0(\"ready\",nZ,!0),-25),n=th({callback(){var e=td()-1e4;eJ(nZ?.knownTabs,([t,r])=>r[0]<e&&tn(nZ.knownTabs,t)),nY.heartbeat=td(),n4({type:\"tab\",payload:nY})},frequency:5e3,paused:!0}),a=e=>{n4({type:\"tab\",payload:e?nY:void 0}),e?(r.restart(),n4({type:\"query\"})):r.toggle(!1),n.toggle(e)};nw(e=>a(e),!0)},!0);var[n9,n7]=tI(),[ae,at]=tI(),ar=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?np:nd)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?nv:nf)([nJ,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nJ))return t>0&&(i=setInterval(()=>o(),t/2)),await K(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=rs(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})(U+\"rq\"),an=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n7(e,a,r,e=>(o=a===L,a=e)),!o&&(i=n?nv(a,!0):JSON.stringify(a)))};if(!r)return await ar(()=>eK(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?np:JSON.parse)?.(o):L;return null!=l&&at(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},aa=[\"scope\",\"key\",\"targetId\",\"version\"],ai=[...aa,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ao=[...aa,\"init\",\"purpose\",\"refresh\"],as=[...ai,\"value\",\"force\",\"patch\"],al=new Map,au=(e,t)=>{var r=th(async()=>{var e=eF(al,([e,t])=>({...nB(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e5(al,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nW(e),i=ta(al,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&z(e?.value,t?.value))return;eJ(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nw((e,t)=>r.toggle(e,e&&t>=3e3),!0),n1(e=>eJ(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rk(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await an(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nW(e);n(r,e.result);var a=n6(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nR(e))return[to(e,ao),t];else if(eb(e.init)){var u={...nD(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rv.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&n8(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rk(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nW(e),n=n6(r);if(o(r,e.cache),nR(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nq(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,as),t]}}),f=u.length?D((await an(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n8(a),eJ(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,ai),cache:[t,t+(ta(i,nW(e))??3e3)]});return ae(({variables:e})=>{if(e){var t=td(),r=ez(eF(e.get,e=>rI(e)),eF(e.set,e=>rI(e)));r?.length&&n8(eB(r,c,t))}}),u},ac=(e,t,r=tX)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),nc({[nu]:eF(r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rh(tl(e),!0),{timestamp:e.timestamp-td()}))),e=>[e,e.type,X])},\"Posting \"+tA([tE(\"new event\",[eY(r,e=>!rg(e))||void 0]),tE(\"event patch\",[eY(r,e=>rg(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),an(e,{events:r,variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eJ(e,e=>nc(e,e.type)),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nS((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(ez(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!z(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},af=Symbol(),ad=e=>{var t=new IntersectionObserver(e=>eJ(e,e=>e.target[af]?.(e))),r=new Set;th({callback:()=>eJ(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e;return(a,i)=>{if(i&&(o=eX(i?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(o)){var o,s,l,u,c=X,f=X,d=0,v=0,p=[tH(),tH()],h=aC(!1),g=tv(!1,nF),m=()=>{var t=a.getBoundingClientRect(),r=window.innerWidth,i=window.innerHeight,m=[n(t.top,i),n(t.right,r),n(t.bottom,i),n(t.left,r)],y=m[2]-m[0],b=m[1]-m[3],w=y/t.height||0,k=b/t.width||0,S=c?[.25,.33]:[.33,.75],I=(y>S[0]*i||w>S[0])&&(b>S[0]*r||k>S[0]);if(f!==I&&g(f=I,!0),c!==(c=f&&g()>=rV.impressionThreshold-250)){if(++d,h(c),!l){var A,E=a.innerText;E?.trim()?.length&&(A={characters:E.match(/\\S/gu)?.length,words:E.match(/\\b\\w+\\b/gu)?.length,sentences:E.match(/\\w.*?[.!?]+(\\s|$)/gu)?.length}).words&&(A.readingTime=6e4*(A.words/238)),tu(e,l=eX(eF(o,e=>(e.track?.impressions||rW(a,\"impressions\",Y,e=>e.track?.impressions))&&G({type:\"impression\",pos:ra(a),viewport:ru(),timeOffset:aj(),impressions:d,text:A,...aV(a,Y)})||null)))}l?.length&&(u=eF(l,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:h(),impressions:d,regions:s&&{top:s[0][0],middle:s[1][0],bottom:s[2][0]},seen:v}))))}var T=t.left<0?-t.left:0,x=t.top<0?-t.top:0,N=t.width*t.height;if(c&&(v=p[0].push(x,x+y)*p[1].push(T,T+b)/N),t.height>1.25*i||s){var O=x/t.height,C=(x+y)/t.height;eJ(s??=eF(3,()=>[{seen:!1,duration:0,impressions:0},tv(!1,nF),!1,!1]),(e,t)=>{var r=c&&(0===t?O<=.25:1===t?O<=.75&&C>=.25:C>=.75);e[2]!==r&&e[1](e[2]=r),e[3]!==e[2]&&(e[3]=e[2]&&e[1]()>rV.impressionThreshold-250)&&(e[0].seen=!0,++e[0].impressions),e[3]&&(e[0].duration+=e[1](!0,!0))})}};a[af]=({isIntersecting:e})=>{e7(r,m,e),e||(eJ(u,e=>e()),m())},t.observe(a)}}},av=()=>{n1((e,t,r)=>{var n=ez(rw(eF(e,1))?.map(e=>[e,`${e.key} (${nz(e.scope)}, ${e.scope<0?\"client-side memory only\":rv.format(e.purposes)})`,X]),[[{[nu]:rw(eF(t,1))?.map(e=>[e,`${e.key} (${nz(e.scope)}, ${e.scope<0?\"client-side memory only\":rv.format(e.purposes)})`,X])},\"All variables\",Y]]);nc({[nu]:n},tT(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(t)} in total).`,\"2;3\"))})},ap=()=>{var e=tZ?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tZ.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tZ.devicePixelRatio,width:t,height:r,landscape:a}}},ah=e=>tu(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>G({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...ap()})),ag=(e,t=\"A\"===re(e)&&t3(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),am=(e,t=re(e),r=rW(e,\"button\"))=>r!==X&&(R(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&R(t8(e,\"type\"),\"button\",\"submit\")||r===Y),ay=(e,t=!1)=>({tagName:e.tagName,text:tN(t3(e,\"title\")?.trim()||t3(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ro(e):void 0}),ab=(e,t,r=!1)=>{var n;return t4(e??t,e=>\"IMG\"===re(e)||e===t?(n={element:ay(e,r)},X):Y),n},aw=e=>{if(w)return w;ef(e)&&([t,e]=nd(e),e=r8(t)[1](e)),e7(rV,e),nm(ta(rV,\"encryptionKey\"));var t,r=ta(rV,\"key\"),n=tZ[rV.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rV.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),ny(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nK(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=au(no,l),c=ac(no,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tZ,rV.name,{value:w=Object.freeze({id:\"tracker_\"+nK(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):nd(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?nd(e):e),e=>{if(!e)return X;if(aX(e))rV.tags=e7({},rV.tags,e.tagAttributes);else if(aY(e))return rV.disabled=e.disable,X;else if(a0(e))return n=Y,X;else if(a5(e))return e(w),X;return p||a2(e)||aQ(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aQ(e)?-100:a2(e)?-50:a3(e)?-10:rx(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rx(t))c.post(t);else if(a1(t))u.get(...eh(t.get));else if(a3(t))u.set(...eh(t.set));else if(a2(t))tu(i,t.listener);else if(aQ(t))(e=W(()=>t.extension.setup(w),e=>nb(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(a5(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nb(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nb(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),av(),nQ(async(e,t,r,a)=>{if(\"ready\"===e){var i=rT((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:_,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ah(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aK,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ak=()=>k?.clientId,aS={scope:\"shared\",key:\"referrer\"},aI=(e,t)=>{w.variables.set({...aS,value:[ak(),e]}),t&&w.variables.get({scope:aS.scope,key:aS.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},aA=tv(),aE=tv(),aT=1,ax=()=>aE(),[aN,aO]=tI(),aC=e=>{var t=tv(e,aA),r=tv(e,aE),n=tv(e,nF),a=tv(e,()=>aT);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),interactiveTime:n(e,i),activations:a(e,i)})},a$=aC(),aj=()=>a$(),[aM,a_]=tI(),aU=(e,t)=>(t&&eJ(aq,t=>e(t,()=>!1)),aM(e)),aF=new WeakSet,aq=document.getElementsByTagName(\"iframe\"),aP=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&R(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function az(e){if(e){if(null!=e.units&&R(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aR=e=>rB(e,void 0,e=>eF(eh(e5(rj,e)?.tags))),aD=e=>e?.component||e?.content,aW=e=>rB(e,t=>t!==e&&!!aD(e5(rj,t)),e=>(I=e5(rj,e),(I=e5(rj,e))&&eP(ez(I.component,I.content,I),\"tags\"))),aB=(e,t)=>t?e:{...e,rect:void 0,content:(A=e.content)&&eF(A,e=>({...e,rect:void 0}))},aV=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t4(e,e=>{var a=e5(rj,e);if(a){if(aD(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ro(e)||void 0;var u=aW(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aB({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rD(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aB({id:\"\",rect:n,content:o})),eJ(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tO(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tO(a,\"/\")}:void 0},aJ=Symbol();j={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tQ.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=j[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aK=[{id:\"context\",setup(e){th(()=>eJ(aq,e=>tt(aF,e)&&a_(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=n6({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n6({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n3({scope:\"tab\",key:\"tabIndex\",value:n=n6({scope:\"shared\",key:\"tabIndex\"})?.value??n6({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rn(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tU(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nK(),tab:nJ,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:ru(),duration:a$(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),n3({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tF(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tL(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n6(aS)?.value;c&&na(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...aS,value:void 0}))}var c=document.referrer||null;c&&!na(c)&&(k.externalReferrer={href:c,domain:rl(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aj()})),aO(k)}};return nS(e=>{e?(aE(Y),++aT):aE(X)}),rs(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aH(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rN(e)||rg(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ad(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rj,e,e=>r(\"add\"in n?{...e,component:ez(e?.component,n.component),content:ez(e?.content,n.content),area:n?.area??e?.area,tags:ez(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e5(rj,e))};return{decorate(e){eJ(e.components,e=>ta(e,\"track\"))},processCommand:e=>aZ(e)?(n(e),Y):a6(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=t3(a,e);){tt(n,a);var o=tG(t3(a,e),\"|\");t3(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{rs(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t4(n.target,e=>{am(e)&&(o??=e),u=u||\"NAV\"===re(e);var t=rM(e),r=t?.component;!n.button&&r?.length&&!l&&(eJ(e.querySelectorAll(\"a,button\"),t=>am(t)&&((l??=[]).length>3?eN():l.push({...ay(t,!0),component:t4(t,(e,t,r,n=rM(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rW(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rW(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aV(s,!1,f),v=aR(s);a??=!u;var p={...(i??=Y)?{pos:ra(o,n),viewport:ru()}:null,...ab(n.target,s),...d,timeOffset:aj(),...v};if(!o){f&&te(t,s,r=>{var a=ri(s,n);if(r)tu(r,a);else{var i=G({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e5(t,s)}),!0,s)}return r});return}if(ag(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,G({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=G({clientId:nK(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=na(w);if(k){aI(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rV.captureContextMenu)return;o.href=ns+\"=\"+S+encodeURIComponent(w),rs(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),rs(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t3(o,\"target\")!==window.name?(aI(b.clientId),b.self=X,tu(e,b)):rn(location.href,o.href)||(b.exit=b.external,aI(b.clientId)));return}var I=(t4(n.target,(e,t)=>!!(c??=aP(rM(e)?.cart??rD(e,\"cart\")))&&!c.item&&(c.item=e2(rM(e)?.content))&&t(c)),az(c));(I||a)&&tu(e,I?G({type:\"cart_updated\",...p,...I}):G({type:\"component_click\",...p}))}})};r(document),aU(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=rr(Y);aN(()=>ty(()=>(t={},r=rr(Y)),250)),rs(window,\"scroll\",()=>{var n=rr(),a=rt();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aL(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=az(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return a4(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t5(i,r_(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ro(i).width,u=e5(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t5(i,r_(\"form-name\"))||t3(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aj()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return rs(i,\"submit\",()=>{a=aV(i),t[3]=3,u(()=>{i.isConnected&&ro(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e5(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rW(e,\"ref\"))&&(e.value||(e.value=nH()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tL(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aJ]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=ax())),u=-(l-(l=td(Y))),c=t[aJ];(t[aJ]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eJ(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&rs(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=ax()):o()));u(document),aU(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:_,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rf(n,r=rd(r)))return[!1,n];var a={level:rc.lookup(r.classification),purposes:rv.lookup(r.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:_}]}}),[!0,a]}},n={};return{processCommand(e){if(a8(e)){var a=e.consent.get;a&&t(a);var i=rd(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tQ.hasFocus()){var e=o.poll();if(e){var t=rd({...s,...e});if(t&&!rf(s,t)){var[n,a]=await r(t);n&&nc(a,\"Consent was updated from \"+l),s=t}}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aG=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aL=aG(\"cart\"),aH=aG(\"username\"),aX=aG(\"tagAttributes\"),aY=aG(\"disable\"),aZ=aG(\"boundary\"),aQ=aG(\"extension\"),a0=aG(Y,\"flush\"),a1=aG(\"get\"),a2=aG(\"listener\"),a4=aG(\"order\"),a6=aG(\"scan\"),a3=aG(\"set\"),a5=e=>\"function\"==typeof e,a8=aG(\"consent\");Object.defineProperty(tZ,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(aw)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
        src.push("?", "lxee68me");
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

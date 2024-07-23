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
        text: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,I,A,E,x,N,O,C,j,M,_=\"@info\",U=\"@consent\",$=\"_tail:\",F=$+\"state\",q=$+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eI=e=>e instanceof Map,eA=e=>e instanceof Set,eE=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),eM=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):eM(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),e_=(e,t)=>t&&!ev(e)?[...e]:e,eU=(e,t,r,n)=>eM(e,t,r,n),e$=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?eM(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(eM(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...eU(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(e$(e,t,r,n,a,i)),eR=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of eM(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of eU(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>e_(eM(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eI(e)?e=>e:eA(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eA(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eI(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tI=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tA=(e,t=\"'\")=>null==e?G:t+e+t,tE=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tx=(e,t,r)=>null==e?G:eS(t)?tI(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tI(eF(e,e=>!1===e?G:e),t??\"\"),tN=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eE(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eE(o/l+100*s/o),readTime:eE(o/238*6e4),boundaries:f}},tO=e=>(e=Math.log2(e))===(0|e),tC=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tO(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tO(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tI(eF(eh(e),e=>tA(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tj=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tM=Symbol(),t_=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tU=(e,t=!0,r)=>null==e?G:tR(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:t$(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),t$=(e,t,r=!0)=>tF(e,\"&\",t,r),tF=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=t_(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tM]=a),i},tq=(e,t)=>t&&null!=e?t.test(e):G,tP=(e,t,r)=>tR(e,t,r,!0),tR=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tR(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tz=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tD=/\\z./g,tW=(e,t)=>(t=tx(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tD,tB={},tJ=e=>e instanceof RegExp,tV=(e,t=[\",\",\" \"])=>tJ(e)?e:ev(e)?tW(eF(e,e=>tV(e,t)?.source)):ea(e)?e?/./g:tD:ef(e)?tB[e]??=tR(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tW(eF(tL(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tx(t,tz)}]`)),e=>e&&`^${tx(tL(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tz(tK(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tL=(e,t)=>e?.split(t)??e,tK=(e,t,r)=>e?.replace(t,r)??e,tG=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tH=5e3,tX=()=>()=>P(\"Not initialized.\"),tY=window,tZ=document,tQ=tZ.body,t0=(e,t)=>!!e?.matches(t),t1=H,t2=(e,t,r=(e,t)=>t>=t1)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==tZ&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t4=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>no(e),Z);case\"e\":return W(()=>nl?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t4(e,t[0])):void 0}},t6=(e,t,r)=>t4(e?.getAttribute(t),r),t5=(e,t,r)=>t2(e,(e,n)=>n(t6(e,t,r))),t3=(e,t)=>t6(e,t)?.trim()?.toLowerCase(),t8=e=>e?.getAttributeNames(),t9=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,t7=e=>null!=e?e.tagName:null,re=()=>({x:(r=rt(X)).x/(tQ.offsetWidth-window.innerWidth)||0,y:r.y/(tQ.offsetHeight-window.innerHeight)||0}),rt=e=>({x:eE(scrollX,e),y:eE(scrollY,e)}),rr=(e,t)=>tK(e,/#.*$/,\"\")===tK(t,/#.*$/,\"\"),rn=(e,t,r=Y)=>(n=ra(e,t))&&K({xpx:n.x,ypx:n.y,x:eE(n.x/tQ.offsetWidth,4),y:eE(n.y/tQ.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),ra=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ri(e),{x:a,y:i}):void 0,ri=e=>e?(o=e.getBoundingClientRect(),r=rt(X),{x:eE(o.left+r.x),y:eE(o.top+r.y),width:eE(o.width),height:eE(o.height)}):void 0,ro=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),rs=e=>{var{host:t,scheme:r,port:n}=tU(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rl=()=>({...r=rt(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:tQ.offsetWidth,totalHeight:tQ.offsetHeight});(A=s||(s={}))[A.Anonymous=0]=\"Anonymous\",A[A.Indirect=1]=\"Indirect\",A[A.Direct=2]=\"Direct\",A[A.Sensitive=3]=\"Sensitive\";var ru=tC(s,!1,\"data classification\"),rc=(e,t)=>ru.parse(e?.classification??e?.level)===ru.parse(t?.classification??t?.level)&&rd.parse(e?.purposes??e?.purposes)===rd.parse(t?.purposes??t?.purposes),rf=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:ru.parse(e.classification??e.level??t?.classification??0),purposes:rd.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(E=l||(l={}))[E.None=0]=\"None\",E[E.Necessary=1]=\"Necessary\",E[E.Functionality=2]=\"Functionality\",E[E.Performance=4]=\"Performance\",E[E.Targeting=8]=\"Targeting\",E[E.Security=16]=\"Security\",E[E.Infrastructure=32]=\"Infrastructure\",E[E.Any_Anonymous=49]=\"Any_Anonymous\",E[E.Any=63]=\"Any\",E[E.Server=2048]=\"Server\",E[E.Server_Write=4096]=\"Server_Write\";var rd=tC(l,!0,\"data purpose\",2111),rv=tC(l,!1,\"data purpose\",0),rp=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rh=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rg=tC(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rm=e=>`'${e.key}' in ${rg.format(e.scope)} scope`,ry={scope:rg,purpose:rv,purposes:rd,classification:ru};tj(ry),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tC(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tC(d,!1,\"variable set status\");var rb=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rT)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rk)),values:o(e=>eF(e,e=>rk(e)?.value)),push:()=>(i=e=>(r?.(eF(rw(e))),e),s),value:o(e=>rk(e[0])?.value),variable:o(e=>rk(e[0])),result:o(e=>e[0])};return s},rw=e=>e?.map(e=>e?.status<400?e:G),rk=e=>rS(e)?e.current??e:G,rS=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rT=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rm(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rI=e=>rT(e,G,!0),rA=e=>e&&\"string\"==typeof e.type,rE=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rx=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rN=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rO=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eV(e,e=>rO(e,t,r)):ef(e)?tR(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rx(n)+\"::\":\"\")+t+rx(a),value:rx(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rN(r,u)}):rN(r,e),r},rC=new WeakMap,rj=e=>rC.get(e),rM=(e,t=X)=>(t?\"--track-\":\"track-\")+e,r_=(e,t,r,n,a,i)=>t?.[1]&&eV(t8(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tq(o,t)&&(i=void 0,!r||t0(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rO(a,tK(n,/\\-/g,\":\"),r),i)),rU=()=>{},r$=(e,t)=>{if(h===(h=rW.tags))return rU(e,t);var r=e=>e?tJ(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tV(e.match),e.selector,e.prefix]:[tV(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rU=(e,t)=>r_(e,n,t))(e,t)},rF=(e,t)=>tx(eR(t9(e,rM(t,Y)),t9(e,rM(\"base-\"+t,Y))),\" \"),rq={},rP=(e,t,r=rF(e,\"attributes\"))=>{r&&r_(e,rq[r]??=[{},tP(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tV(r||n),,t])],t),rO(rF(e,\"tags\"),void 0,t)},rR=(e,t,r=X,n)=>(r?t2(e,(e,r)=>r(rR(e,t,X)),eS(r)?r:void 0):tx(eR(t6(e,rM(t)),t9(e,rM(t,Y))),\" \"))??(n&&(g=rj(e))&&n(g))??null,rz=(e,t,r=X,n)=>\"\"===(m=rR(e,t,r,n))||(null==m?m:ei(m)),rD=(e,t,r,n)=>e?(rP(e,n??=new Map),t2(e,e=>{r$(e,n),rO(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rW={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rB={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rB);var rJ=(C=rB.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,rV=[],rL=[],rK=(e,t=0)=>e.charCodeAt(t),rG=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rV[rL[t]=e.charCodeAt(0)]=t);var rH=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rL[(16515072&t)>>18],rL[(258048&t)>>12],rL[(4032&t)>>6],rL[63&t]);return a.length+=n-r,rG(a)},rX=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rV[rK(e,r++)]<<2|(t=rV[rK(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rV[rK(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rV[rK(e,r++)]));return i},rY={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rZ=(e=256)=>e*Math.random()|0,rQ=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rZ()));for(r=0,i[n++]=g(f^16*rZ(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rZ();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rY[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},{deserialize:r0,serialize:r1}=rJ,r2=\"$ref\",r4=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r6=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r4(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r2]||(e[r2]=o,l(()=>delete e[r2])),{[r2]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r1(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r5=e=>{var t,r,n=e=>eg(e)?e[r2]&&(r=(t??=[])[e[r2]])?r:(e[r2]&&(t[e[r2]]=e,delete e[r2]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>r0(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},r3=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r6(e,!1,r))):r6(e,!0,r),n);if(t)return[e=>r6(e,!1,r),e=>null==e?G:W(()=>r5(e),G),(e,t)=>n(e,t)];var[a,i,o]=rQ(e);return[(e,t)=>(t?Q:rH)(a(r6(e,!0,r))),e=>null!=e?r5(i(e instanceof Uint8Array?e:rX(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r3(),r3(null,{json:!0,prettify:!0});var r8=tL(\"\"+tZ.currentScript.src,\"#\"),r9=tL(\"\"+(r8[1]||\"\"),\";\"),r7=r8[0],ne=r9[1]||tU(r7,!1)?.host,nt=e=>!!(ne&&tU(e,!1)?.host?.endsWith(ne)===Y),nr=(...e)=>tK(tx(e),/(^(?=\\?))|(^\\.(?=\\/))/,r7.split(\"?\")[0]),nn=nr(\"?\",\"var\"),na=nr(\"?\",\"mnt\");nr(\"?\",\"usr\");var[ni,no]=r3(),[ns,nl]=[tX,tX],[nu,nc]=tT(),nf=e=>{nl===tX&&([ns,nl]=r3(e),nc(ns,nl))},nd=e=>t=>nv(e,t),nv=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[np,nh]=tT(),[ng,nm]=tT(),ny=e=>nw!==(nw=e)&&nh(nw=!1,nT(!0,!0)),nb=e=>nk!==(nk=!!e&&\"visible\"===document.visibilityState)&&nm(nk,!e,nS(!0,!0));np(nb);var nw=!0,nk=!1,nS=tv(!1),nT=tv(!1);ro(window,[\"pagehide\",\"freeze\"],()=>ny(!1)),ro(window,[\"pageshow\",\"resume\"],()=>ny(!0)),ro(document,\"visibilitychange\",()=>(nb(!0),nk&&ny(!0))),nh(nw,nT(!0,!0));var nI=!1,nA=tv(!1),[nE,nx]=tT(),nN=th({callback:()=>nI&&nx(nI=!1,nA(!1)),frequency:2e4,once:!0,paused:!0}),nO=()=>!nI&&(nx(nI=!0,nA(!0)),nN.restart());ro(window,[\"focus\",\"scroll\"],nO),ro(window,\"blur\",()=>nN.trigger()),ro(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nO),nO();var nC=()=>nA();(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nj=tC(b,!1,\"local variable scope\"),nM=e=>nj.tryParse(e)??rg(e),n_=e=>!!nj.tryParse(e?.scope),nU=tj({scope:nj},ry),n$=e=>null==e?void 0:ef(e)?e:e.source?n$(e.source):`${nM(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nF=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nq=0,nP=void 0,nR=()=>(nP??tX())+\"_\"+nz(),nz=()=>(td(!0)-(parseInt(nP.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nq).toString(36),nD=e=>crypto.getRandomValues(e),nW=()=>tK(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nD(new Uint8Array(1))[0]&15>>e/4).toString(16)),nB={},nJ={id:nP,heartbeat:td()},nV={knownTabs:{[nP]:nJ},variables:{}},[nL,nK]=tT(),[nG,nH]=tT(),nX=tX,nY=e=>nB[n$(e)],nZ=(...e)=>n0(e.map(e=>(e.cache=[td(),3e3],nU(e)))),nQ=e=>eF(e,e=>e&&[e,nB[n$(e)]]),n0=e=>{var t=eF(e,e=>e&&[n$(e),e]);if(t?.length){var r=nQ(e);e7(nB,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nV.variables,n),nX({type:\"patch\",payload:eG(n)})),nH(r,nB,!0)}};nu((e,t)=>{np(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nP=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nB=eG(eR(eX(nB,([,e])=>e.scope===b.View),eF(n?.[1],e=>[n$(e),e])))}else sessionStorage.setItem(F,e([nP,eF(nB,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nX=(t,r)=>{e&&(localStorage.setItem(F,e([nP,t,r])),localStorage.removeItem(F))},ro(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nP)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||nX({type:\"set\",payload:nV},a);else if(\"set\"===i&&r.active)e7(nV,o),e7(nB,o.variables),r.trigger();else if(\"patch\"===i){var s=nQ(eF(o,1));e7(nV.variables,o),e7(nB,o),nH(s,nB,!1)}else\"tab\"===i&&(e7(nV.knownTabs,a,o),o&&nK(\"tab\",o,!1))}}});var r=th(()=>nK(\"ready\",nV,!0),-25),n=th({callback(){var e=td()-1e4;eV(nV?.knownTabs,([t,r])=>r[0]<e&&tn(nV.knownTabs,t)),nJ.heartbeat=td(),nX({type:\"tab\",payload:nJ})},frequency:5e3,paused:!0}),a=e=>{nX({type:\"tab\",payload:e?nJ:void 0}),e?(r.restart(),nX({type:\"query\"})):r.toggle(!1),n.toggle(e)};np(e=>a(e),!0)},!0);var[n1,n2]=tT(),[n4,n6]=tT(),n5=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?nl:no)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?ns:ni)([nP,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nP))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ro(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})($+\"rq\"),n3=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n2(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?ns(a,!0):JSON.stringify(a)))};if(!r)return await n5(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?nl:JSON.parse)?.(o):G;return null!=l&&n6(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},n8=[\"scope\",\"key\",\"targetId\",\"version\"],n9=[...n8,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n7=[...n8,\"init\",\"purpose\",\"refresh\"],ae=[...n9,\"value\",\"force\",\"patch\"],at=new Map,ar=(e,t)=>{var r=th(async()=>{var e=eF(at,([e,t])=>({...nF(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(at,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=n$(e),i=ta(at,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};np((e,t)=>r.toggle(e,e&&t>=3e3),!0),nG(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await n3(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=n$(e);n(r,e.result);var a=nY(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!n_(e))return[to(e,n7),t];else if(eb(e.init)){var u={...nU(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rd.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&n0(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=n$(e),n=nY(r);if(o(r,e.cache),n_(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nj(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,ae),t]}}),f=u.length?D((await n3(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n0(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,n9),cache:[t,t+(ta(i,n$(e))??3e3)]});return n4(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rk(e)),eF(e.set,e=>rk(e)));r?.length&&n0(eB(r,c,t))}}),u},an=(e,t,r=tH)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),n3(e,{events:r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rp(tl(e),!0),{timestamp:e.timestamp-td()}))),variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),ng((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},aa=Symbol(),ai=[.75,.33],ao=[.25,.33],as=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[aa]?.(e))),r=new Set;th({callback:()=>eV(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=tZ.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nC),!1,!1,0,0,0,tG()];a[4]=t,a[5]=r,a[6]=n},y=[tG(),tG()],b=aI(!1),w=tv(!1,nC),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],I=S[1]-S[3],A=T/t.height||0,E=I/t.width||0,x=v?ao:ai,N=(T>x[0]*o||A>x[0])&&(I>x[0]*r||E>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rW.impressionThreshold-250)&&(++h,b(v),u||tu(e,u=eX(eF(s,e=>(e.track?.impressions||rz(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:rn(i),viewport:rl(),timeOffset:aE(),impressions:h,...aP(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=tN(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var j,M=tZ.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,U=0;for(l??=[];U<f.length&&(j=M.nextNode());){var $=j.textContent?.length??0;for(_+=$;_>=f[U]?.offset;)if(a[U%2?\"setEnd\":\"setStart\"](j,f[U].offset-_+$),U++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;U<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+I)/D),l&&eV(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[aa]=({isIntersecting:e})=>{e7(r,S,e),e||(eV(c,e=>e()),S())},t.observe(i)}}},al=()=>{var e=tY?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tY.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tY.devicePixelRatio,width:t,height:r,landscape:a}}},au=e=>tu(e,K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...al()})),ac=(e,t=\"A\"===t7(e)&&t6(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),af=(e,t=t7(e),r=rz(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t3(e,\"type\"),\"button\",\"submit\")||r===Y),ad=(e,t=!1)=>({tagName:e.tagName,text:tE(t6(e,\"title\")?.trim()||t6(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ri(e):void 0}),av=(e,t,r=!1)=>{var n;return t2(e??t,e=>\"IMG\"===t7(e)||e===t?(n={element:ad(e,r)},X):Y),n},ap=e=>{if(console.log(\"Jah mahrnz\"),w)return w;ef(e)&&([t,e]=no(e),e=r3(t)[1](e)),e7(rW,e),nf(ta(rW,\"encryptionKey\"));var t,r=ta(rW,\"key\"),n=tY[rW.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rW.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nd(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nR(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=ar(nn,l),c=an(nn,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tY,rW.name,{value:w=Object.freeze({id:\"tracker_\"+nR(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):no(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?no(e):e),e=>{if(!e)return X;if(aJ(e))rW.tags=e7({},rW.tags,e.tagAttributes);else if(aV(e))return rW.disabled=e.disable,X;else if(aG(e))return n=Y,X;else if(a0(e))return e(w),X;return p||aX(e)||aK(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aK(e)?-100:aX(e)?-50:aQ(e)?-10:rA(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rA(t))c.post(t);else if(aH(t))u.get(...eh(t.get));else if(aQ(t))u.set(...eh(t.set));else if(aX(t))tu(i,t.listener);else if(aK(t))(e=W(()=>t.extension.setup(w),e=>nv(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(a0(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nv(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nv(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),nL(async(e,t,r,a)=>{if(\"ready\"===e){var i=rI((await u.get({scope:\"session\",key:_,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(au(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(az,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ah=()=>k?.clientId,ag={scope:\"shared\",key:\"referrer\"},am=(e,t)=>{w.variables.set({...ag,value:[ah(),e]}),t&&w.variables.get({scope:ag.scope,key:ag.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},ay=tv(),ab=tv(),aw=1,ak=()=>ab(),[aS,aT]=tT(),aI=e=>{var t=tv(e,ay),r=tv(e,ab),n=tv(e,nC),a=tv(e,()=>aw);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aA=aI(),aE=()=>aA(),[ax,aN]=tT(),aO=(e,t)=>(t&&eV(aj,t=>e(t,()=>!1)),ax(e)),aC=new WeakSet,aj=document.getElementsByTagName(\"iframe\"),aM=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function a_(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aU=e=>rD(e,void 0,e=>eF(eh(e3(rC,e)?.tags))),a$=e=>e?.component||e?.content,aF=e=>rD(e,t=>t!==e&&!!a$(e3(rC,t)),e=>(T=e3(rC,e),(T=e3(rC,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aq=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eF(I,e=>({...e,rect:void 0}))},aP=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t2(e,e=>{var a=e3(rC,e);if(a){if(a$(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ri(e)||void 0;var u=aF(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aq({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rR(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aq({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tx(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tx(a,\"/\")}:void 0},aR=Symbol();M={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tZ.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=M[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var az=[{id:\"context\",setup(e){th(()=>eV(aj,e=>tt(aC,e)&&aN(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=nY({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nY({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nZ({scope:\"tab\",key:\"tabIndex\",value:n=nY({scope:\"shared\",key:\"tabIndex\"})?.value??nY({scope:\"session\",key:_})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rr(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tU(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nR(),tab:nP,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rl(),duration:aA(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),nZ({scope:\"tab\",key:\"viewIndex\",value:++r});var u=t$(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tK(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nY(ag)?.value;c&&nt(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ag,value:void 0}))}var c=document.referrer||null;c&&!nt(c)&&(k.externalReferrer={href:c,domain:rs(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aE()})),aT(k)}};return ng(e=>{e?(ab(Y),++aw):ab(X)}),ro(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aB(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rE(e)||rh(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=as(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rC,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(rC,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>aL(e)?(n(e),Y):aZ(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t6(a,e);){tt(n,a);var o=tL(t6(a,e),\"|\");t6(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ro(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t2(n.target,e=>{af(e)&&(o??=e),u=u||\"NAV\"===t7(e);var t=rj(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>af(t)&&((l??=[]).length>3?eN():l.push({...ad(t,!0),component:t2(t,(e,t,r,n=rj(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rz(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rz(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aP(s,!1,f),v=aU(s);a??=!u;var p={...(i??=Y)?{pos:rn(o,n),viewport:rl()}:null,...av(n.target,s),...d,timeOffset:aE(),...v};if(!o){f&&te(t,s,r=>{var a=ra(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(ac(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nR(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=nt(w);if(k){am(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rW.captureContextMenu)return;o.href=na+\"=\"+S+encodeURIComponent(w),ro(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ro(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t6(o,\"target\")!==window.name?(am(b.clientId),b.self=X,tu(e,b)):rr(location.href,o.href)||(b.exit=b.external,am(b.clientId)));return}var T=(t2(n.target,(e,t)=>!!(c??=aM(rj(e)?.cart??rR(e,\"cart\")))&&!c.item&&(c.item=e2(rj(e)?.content))&&t(c)),a_(c));(T||a)&&tu(e,T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),aO(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=rt(Y);aS(()=>ty(()=>(t={},r=rt(Y)),250)),ro(window,\"scroll\",()=>{var n=rt(),a=re();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aW(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=a_(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return aY(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t5(i,rM(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ri(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t5(i,rM(\"form-name\"))||t6(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aE()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ro(i,\"submit\",()=>{a=aP(i),t[3]=3,u(()=>{i.isConnected&&ri(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rz(e,\"ref\"))&&(e.value||(e.value=nW()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tK(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aR]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=ak())),u=-(l-(l=td(Y))),c=t[aR];(t[aR]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ro(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=ak()):o()));u(document),aO(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:U,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rc(n,r=rf(r)))return[!1,n];var a={level:ru.lookup(r.classification),purposes:rd.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(a1(e)){var a=e.consent.get;a&&t(a);var i=rf(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tZ.hasFocus()){var e=o.poll();if(e){var t=rf({...s,...e});t&&!rc(s,t)&&(await r(t),s=t)}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aD=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aW=aD(\"cart\"),aB=aD(\"username\"),aJ=aD(\"tagAttributes\"),aV=aD(\"disable\"),aL=aD(\"boundary\"),aK=aD(\"extension\"),aG=aD(Y,\"flush\"),aH=aD(\"get\"),aX=aD(\"listener\"),aY=aD(\"order\"),aZ=aD(\"scan\"),aQ=aD(\"set\"),a0=e=>\"function\"==typeof e,a1=aD(\"consent\");Object.defineProperty(tY,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(ap)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqS9iXrbRtI2eisSxqMAZositVkCDeGzHdtxEi-x5MQOTdsQ2ZRgUYACgFpMcp7_Ns4NnAv7r-TUW9WNhZIz-Z4zE4tAd6PX6urausp1veBg5kxzvZIXWTwsnN5llK1oVahMJSpSsUpVriZqqoZqrEbqUl2oU3WiztWNOlZX6kwdqiP1Qj1ST9W1eqVeqyfqq3qpPgfO_8TJOHXUO3oapkmuk8JR9wLncxHFE99Rz4J7LScvokI76i88X0zzU0e9CVxqPdDBwdMsSzNXe-hhcZqlVyt67OqgyJEWFvTX1wv1lsurLFjvomCMIkFQzOeuDsPCC4JkOpl4mS6mWbLa6SH_hD5dW6OfAj_tiU5OilN8ZB69GeYgCTq9MXUAz9FKnKxoj2vvR4NVKks_a2urb_ld4U1l1APbULfXaiULeaGaguD18Vc9LNpn-ianZk1DC1t6ob7JMNrtdkbDMEPITLmDztpa1s7Tc-0WwcE3lPQ89SN_QqUxwtVAh9p_4xZh6DxayfRf0zjTo5XLaDLVK3G-ch7neZycOIom9ujmQpvJbWf6YhINtetQy45yUNR-3HY8auUPWY_Vjsp4IbKbmRmWdr3FMCqGpzSdZdohjS7UF1gnXqY3vEy-jpAOMEgnuq258cJken6xGMdJNJlQ1WGbal2oxwAAXgYsLYA0a8dJXMTRJP6mR_N5ERY-TYYAQ7s41UlIb_xAbR-4jeLcexoqNX5JbwRdnuf_fRGvZ0aULdTPVWeCWe0bn75Bg_7vLnroFssVSu-8ha2rWKjfa3U9plyTRXOM6f3VLVSfHgfeQv0aRPlNMrw1-wKb0VUUFyvcgK1dX2KOi35nQJOYeH5SrQ7gFivAT4VndlOvuR7aW-hJrrnwpS28WvS7g_IDOw5KQ3HeGrYr1Cj1hT7BZqF9nQx1Ol5hODPfR_b7aFEuuHxsl_0XzI5Wz4PLNB6tdNRPwavp-bHO2i8fvf98-OjZ088vXh09ff70rXofrHbVB0zMnwwes4X6TT7WGr9mTyhdBIc358fppB0XOouKNFM6sxvHJRxHVWDDuZkXZn6xtpbQf_xtZh_cjGA585D_XOnEfmxAnXDBc0FGz30dtvvFgFM0ykboiXOc0hxHiUNbmjYezQn1Kg40TXiE3dihbq6tud0g0PO5M45oCRyqAmlOkU01fYec59iMOkWNq6tUQ86jpbwPSk_4mT56r_TUTlmcH0Zj_SIp9ImmQQ-5LwnnNboy5gxgf0IP9YwR93GMPtLAivSQi7joxmXwKMuiG2qDf5W-4B7cWnilTw366Bo8RWMJn_urNNEEY5rmz9dH-O0T_tEDv68HSp9UC4hpcFLGnY2-nVuEepGlRYp0pW9s2oku3tjk19T_4xpAULs31B7m9FzpK7uYzniaDIs4ra8SL6bSZzI_DESNPhxyxh0fKn1UG_XqqouqdDHAit4aC6EyzOiLWxP4MrpQ-tGt5ENdKP20jvrNlHZxZtB8voyK03aWTpORq-8TiuT3i_TK7RJCoiOrg9OLsGeHAGqD6rrGTtKv0JCLl47S1J_Xds6kdgJ2Xiw6fgpeoyfm2GW8F4aZx1BPqFe_ppKKkgLCWfT3J-USHUHFivV1qiijv3RScZqf-Bnhf6W_BgJj43hSAObQgZemAZXUhtkf1EHnKx8fmNnQrsJ9nhcgLrPeBuPNCnSMsDpQVlY72ZMVLIJXfuAmtNkTlbVaHhEH7k2sJ6OVhPpz7c14qnrHmY7OFowqV5ZqkSqS2neLBTB7wDjC109cGRD1GjTIcq-_30ehPgTd9hOl-8lgAFRLc-FG1OFIOqykA1HZgeiOjqNH9Z68dGVxG52hPn8H83ozdEsaKsqGcF6ur5cYk0aCA6TnmVyeBWrOrzVC8CErpR92vDHTA2Gwrte7Pd1qlV-ur_fKmWag6mlKsrmtFtdM8EYD_Ww3BaBcQMRgFRrwuzo4YczmRel7loDs4jDoguYFUJc9JTrHEMM1uJKeF4C9-TwxxKRnFywGOEQhNVMQceN1aW9kIXf5vnZjEIpUHZ07vgwjliHauVp4rukgukIry6W71NVn9UFwBwRiFI_WAkhHxUF_wNCTBdnDTmhJ3Fbm047s0DCTemriJ2H51sseJpi-6x4gimukM6efDXo0_SmBWqoiyvBT2vCYirW1uA3C3U09S-4KRolL6tdSp0SJvCv7T8flQum_ljc5Cib6CljO5cWrvhh4OFLf3LlaqPueW-NagFKJM0ANnqW3Sjrpdxy2gR1xqIliAojUzggGtf7Ak6GhllOm5BRRcPpbYxV4zmnGO_8_JpznusJZNNtmX-NRxZQZhhF2cnMrl9SU0iUvwP0BWVNnXpooDughY6SRcM3Zd2sm2lf_8bc1M2KimlFfn7pIfNCgXu33an3cYHdq5wwTA_qZy-tBEyBFaBfZR6V_vj3_vSWEL_vBrve3snyPu0rY2LBytH3LUj_yOFHi9iFdFvqDCy0aG72GTcwJEPPyxV6N3lWaKP-fla5R9XeOgKbBNva812ymtnmq4yo25HfsmTa_N-uAkl8shTTO0vOnCdFzOlf6eXWUz-7qhWUeiB-1nPFsUdtMhIDp4Ocz3nSKmT9K8MoDQRPHENCx0cdmI_IBTAV6bBICTvBBBaA-ImOYHqBEi2VcW7S-MfkrHCu3i9crxoxRsRI__eIygBWh4bqIZSzkGOlKVWDHumDclP4pqNCKXayYOQ46NcEzuJ6flZPxMxWm_7CszDQoPIdh7Hr8PT9Rpe9LGYdlU7KAQda0oj_LCWD6J51jlgL56Kj-EPwzEGLqh6iy91ycECZvA8vnmdWJKmRIeCkn9rXcPFzramOn1EUZekmUwcePTAP1q9XCmDs04j8D2b9NmlUPsduZQD2Prm0JX_9kxo7hBmA2Q-Y4mYKo4Yv5nCqICIwiWv2IUPhzVfQ3IY3ZIrDQv1VwLQjlmHELvVFlvM6cq3SHmSpeADrJaxjohf3A14_MI3Hnq3RcGJzYJ_p5YKk5My9a9hVzhEp37yJjn_vVyf1ztc6rLLUKZLmptVdSB-94pTfvrom7TTMx5g727UKuY4hLddfgSEif7e9UecwzsVqEdy71QcfXLIwipp3OSZ3SGnNT5YZaXZWmaDZfuaBzeL_wIzcWhmA5dstdgDMaTFKeZoVbAb23znw38yM7NX5DtyG4IN54SOx8KVujOWCaT0QHAUiukZ7oQq9o4uN8_Akyv5ar25JfPoBaa3zSznUR8l-QgLTO7Wg0CvEl_aJ0_UtpgAFqq4lRzZl0Z68FQ1J3yiOGqukJltXgZEP-K42dRnnIf217FvGUo7pDekH1VJgKS7LDnUuAEWln7tV2pkvYt6AlOeBfl6A7G2AMZZUuQIPaRTXHqFTv8TtPDo_fW5gF22eGsoY5GRM1-kvIOqyIax-t0_xR65dcNXIIh9MfPhuQ6fap7IDlNeYkBOlPo3gQ6H1X79CbxlO18WWwdgb0lshOfYBVUZSinCUGm0CpnvIHHaOUGq7aucdEGBBgMt5UC3HFA8GzBOhFKWbC0EUaLceTnKKE8uWz8vS4oldHAMrxvgeVKqNVK5Laqpna-gNDESOLxfYV-KHEhDBpTFxjTdC93g1pride6EIMpiZtIjieRsNTSJkzOWKLTGYMc1ZLmUCA-t1vIzvRRLvSRufvfZM4sYn0sKo_MKZJ19aKyEWPiWEuiSYqTNOYhEREExjQoKP6hFY0GYs9XYu-LZLqhkWJT5gpXIeg2aOD5gJdLCIDCYI0iocVO9DOLybxEBDW9cAaCLD6ZiaoH_HtyXeLpYO48JpyVNoukMzSS2Hr73rlnNFW4dq5hJmABR19ImWg4_kZ5AJRWb7cmgZBj_Q4TvSbLL3QWXHDIDgjbDOOT6ZZdDzRPvBtMj3X5q2jrrK4sDk0lAR_eEtDSEUIxyHKPpvPHVYg8Avkn7yP6GSwiolwRkX9bOHPuBw9LepLWCwNEKiB5i-tzx_NjcUGFd1ym0x16W0SFS9p9YAhThhDMJ7I7JIKIHRr8B32MaNEbeJnMPCL1DXP3DzjFRzhtK3oaen8NrBSTnUf21oODhwOUhcwHyohvARejaophVglcce0Lg1bJLYiSHMh9yomcgKy5srAIYEfWgXzM0EmdEq-FWMcmyLPca6LnoApEiqacVHqygxlF4Zgsax0UbFUVa0Qnr2wpTCxVSkmnlEtk8-mZs19ntYWj45syyDTXi-Gzaxpkp_G48Lmjpu7l5UL2BWW1KRxaDn5DA8PLkN2To2X-90MPR2YmlJWxhEVZnZZFqRGc-GmQUH5inNtDb1-StMWpLKziH5MgTSGbgLATwP-fB2MIn0UpMqNiN-geaBeIgHwraKwH6vI4gVg41HgTBPZgyNn1XKNtBcJ_M9xiEAw-oFnhYldIgKIBSxG7ntahlqxdhGf69dZfBInrXpykl4RwPwYFfyoikuwWNAvMSNC9Xh1_ryl7xfEcBAlbpVLMXEYKes7iL6LWsF60mI5J7CySplxJExLdTIXKTkE2DSyC7TU8SpdHNXvYm10Y-_Stois6nM16w0nOsqOaCzptGAiNyIyPYTcIYYcZOLr3HNZ50PAR3vYz4zCx6ceRjQsorjs5xhhQpQjRGH4ej3245pKLaFOGh1Dp0LHsstmY6gydTK88Qs1jCaT42h45mNzqBmlE77io-simuZ65Ec4PGnrn5zozI_xktLc-ymeyo9zq2zKorE_WQRZrwiydtkOMTsMwVPigoZBcQWK1yoVaUnGQXHprhIHNwrG9HopsoAVLVO5Op3PV4mAG7YvdDKKkxMjrNeVUplKnbePp_kN-m0yISTold_0PJEHDEuqYj4fogsaMOFK5q88q7mLTqyPWi53h5acRoqMVY1OlN2GsmS1S-zDw6Azn2O_nLgQR9qedKknC3XBMzNdXrpJyHOTF4-S-DyCQPVZFp1r99TzT6n1Aita0LmsTmVmz9vRsIgvqQeXLpqwbxdgnE-MWoX5hbFQGA1Ym1afBKur7pTAnT70CbjP6b9gJlk489B1_NIoiygrfMN1gC8jQk3lhObDXJ24PM8gFtOTEzotLcFIM28bCjWhZPeEmZvztgEg9N3zOdHn2fLPS9gqF10WQ-gWqsBWyDRlCeBUJTdNcENbYEF7K8rzleJk9vmCTsc4Fy2uYStcIi9O49yu94JOZzEBcEsNPefbb9ucycVEB_ydYpzJxQyYfa-gyV5Y4DFasLsL1wrRBFMWfYYj-L99ZcuUH_Fg7ywd4GwrzqVgHp8k0aRmrWDnSnoh1ZV7hT8RewIoKu7sS5m9WJh1Oa_WxVTckw73eKp7PJM9M020i5dWj41vereH8EaeXdeSTZqIHCZPKk22wcir_LVpQVQWXq3zPdHFVzYgjql7JZpkOhrdrFgjiA3pOBuCLOrDL3vf5UnqF6HDw3J8Qy7SQQkh63xOVJGbmakkzlD16zNupxuNDAL9v5hrPotuKqxfHHTCGt5BIf8qTkbpVZvx_Mt4mKVFlJ_xIh8vKU_n8zh_BssNwAAxecT9EaYLC-ay65NPhGetFZHjQtLnlsYYrMqlU_WN--VFQnNBZxqxbtHNyr2ZXrS_UONXoupksDzxLXSelaqKNxbKYZRT0oI1qhG46LAmXxBRgfB9lvbiBz4wGakmhK3ApXWBZ6i3jGBU2sjrIK8weRb3pLQNiNZJwXwdCX421mGBoSxNyb5bF0QGxSFEn7QuzCRDGoBnw87qksNZgeJsbS3jsasIzI-KFso1WgEaOFG1dRZCS5bnoUMvZP37TpSMHOWoFYcFA8wAQA_9jC2DGjoeZhD6xOAx_9VRRNe2v6Zx4rKMMUQdnnJWHGbE-KEhUBtIYceBLEa-Mx_5z1XxSPrj_OA0hGlFS7cKVZQae83CA8OksnSp6kzL-b__5_91fADpdbXEDS08LHxesPyaBX591m4SJqTjivs1Nnp6KYOJZ8MA_prV8lRKFa_M3HVUe3NHtem_BzuqyyS11TmI8HWj__Fi9uuC_rxaDGrPP_zf__P_DO7P3X57NRy0vI2TKVRgBFMdOjo7akL_plBBEDnX1tcs5-15EOSE7nRtrdWacLbn0xEN0q4VgMU3s6Jqzwe7KJ2rViv1eubLpV5RJz7VXrkzTIQNDYoE4NyP5x3QX_0B0V4doryI7EP_RukKq4TKXtJEQo_gXaCtSxGUj4gYaBM60delRuYUO-6EKOyTh0OryDtptbxh_2Swvj6fu2N6CGbpeEwYA-q-kbpKs1H-WFMN2r9UQLXAJL5-6l5ubG7t3d_V20TinGIr9lzq3KlH1VyCME-CUau7uDqNJ8CmZvPMCn1d0NpL474FKTU8jQh3EAea-7G06acKxpdEn-rcn6hJfI1G041Jq9vp3M83Uq_Rm7TsjTqGFUkEbtgfg895LUYiYlIySU822TqTtltnDuB6cpdiFIKoO9RO7i1puWWcwd0VvJXHItEZAq0aXtxk0a4s0l_TK509iXJQ1pTqEdQtVZp7BGYmjU8mThoGeTtKiFaf0uEzmtLms1tzXiiGkiIEF50rKuUPVZIm2u8s_JxA578PZLzcVVYRgNi32qYpHzMFIb5QJAQj2sWQyvt3WW7Jfn5udvYYRfG3OX5Ku3QvoizHVwzFQEmAcNU_VQSJRdg3g2wYbnHltVmo0E02n19Qu_JCG-QSEgZi1wCZHfUc0j9idjw64V1u5jmdeqzBapytBCuEuGG84AEVggHEaNeGA6opCk5cvfYf-jf0uEgptYkhRSAOO6ZWgkkFGDKjMABaoz_F6zpgMMQAw5WCvDuU_L6DxQSGHfj9y0rlT82wxjjEUvjPB8Qr3DKwqo0oDVh2GL5xKzLqy73Zz4evX7XFkC4e38AiAua0SVqsRCtCDNybZQshyIkYgDjlpjE8HsRqQvs-WRMbNR5l7cQsYqCzc0x0_28lfN2FmjFAMONx84YfT5WBUkIDsh_8qZqk6dn0wj-xmGRiMQmLHwooyk6whrQzaMs_k0Q56ojkg-0cbRNHDl1T0AuRtuK0Mv8LkW0y7HszcyidWorgEUsEoU5YfFnANm12MSXkeKNoSS2nRZXyaG9uQ4E2wtwwLOeOrW1hPFt8XTL-CHTHZbkZc3OZIDIxBHeNOVklXRVhLqysggww5he3Ja9CeNFh9LxXKVpENcLmJVkFedCL4Ejj9YBlblZVF7NgZjUq1TVRkNa-Xu-GcfVd3LZLSW_cc9QdYdBMeNZslouXxu4VyPGzJZXmRCj1QCw5A5oDtnwVOVylMLaqJwipC9cJHM8eotCnDdORfvf2xZP0_II2EnANON5z1_OsJfmjycR1WjAlZzLJ5JYUHxNageOopL85CPBKIB6a0dLG7kLxJBY-yDTd4EsAWSXaz_znOB25tj7-0naGJQCN-13DXr1Gh72l9I1Pbujjv_7Hq1Z7nYgFnxDRx42PG15ID5zzyf8fSqfHj3j5n8F9Auf_oUxK6IPUGFDuR1AdnfV9f9Ca9z9ttAat0OMivvtxhA-41v6nf4X0OX8a0qf_4rro7V9uG0_3Nk5KNffyRQsLYZfBLE-n2ZCOZpUPTzWd0ZmimfSzcDXxIS56rqJpcZpmcXHjR2qaQ3qlLogZxeFPZ_9pmhd-HoYTdZFmhS9gNg3L02LKRwWd6HTUEbeU3VhT0rFf3HPHIC7HWXRyTqvtj0qxxGUbnwTyA0KlXfYivGxTCSI0fWfDoYVSl8T5FaWZHUNdAeLUWXNEA19Uhm0GKI2p44Coyhr5-xxK4nM2at-gafzUvh9-DOefPDO3tIig3UIDNIUcRszBqJzOwM98FLEIH4akIsx_7otGmtqaAN9MgtKyJg7L6xEbH_sfB_c2FFHPdHaLQR_Vm1cgSWQWASGYJZrOSOTiEw9aLktd2O_0W-FQaTAaG8WnSluQgdm5hflQ3C9eYmurmGD6r5plo7WSK9qFzsXuXBVvKm6B4RxTyTrIt4FrpelsjOwSn5CYSzE09AiC6ecqDt0Ck03forRbM8viszEyfBdtVWN4I_pAOzvyCQ9Sygof7GdmsRLqyTdj41vOaP_jp3sfP7bvt0LXo8mdLeYD2g_Ox4_31sCi_BhsfPzWppSitEDDfY9rV__lsjWLVGdu7BDbNsfSvNUnT6_pTFDOyZTwT_GjKh4HM5rCn28ZUktRVfxukaNipMVny8_GNF10Mn-UvFTB1kkeLBWwJ3GER1w03KCuUnOGTCseM50WYDHmc8J2jHg-brhtQhQfN8I5I4B7YJuMZSzQq-l8ZjvP7Ra_0vSanC9u-HAV_z7S_zz-06dj9RpK-2908H3x-GAlquHLJ0n_FUiv-srDf_c35Pj95ha_IPvjR7ftYervdR1MZPu-4y3ufcESE2j9WjKu1b4KQ0r6pWZeUy0rEjgbVmXlp-uFMfSg7bkOUqyuti4l1Q9o6DOGLza2La3fiK3sU8qAGAnWe3CLWfsqHhEGypbIV-K2IXLqAPq4BJjR3uShPT16E2vXOqVTecJm1J0D7abQdE1ZAWv6k7uZVdVOFPG2nidlAxTuoDAUe7Py-475nqlcPAUpizTKuqk4bnJxbhe5sF5bdakXLWAtKvxQ6iw7YMwJqWGiCqrerK-LanqxKEtCi5P17SAHUIItFI-fWBcQRD8FO3pLFe9ZjIN_b1znFZGmtStLbey7D4FIzlTxZzBKh1PgfVX8FhR_to_T0Y0qOnZVV1ctNmZtqSq6wU-qsGZKJco6CIpuXbAAmgkmyu979HlC9ARoaELFXeiVYTZI60OIRkyXeNtXZrlEmNCXBaHRDxYTEm754KlovQvzi_dUR9wrzZZ7cnawOAhUFA3l6URjRDA6CNvpVaKzH80goUf8EzRVsJwD9Xo0nRS_x_oqJN4vOte2mkVNDbVtBEDfnJolJffbwVN5qYcfCCscg2gmTJlfxUCShTcbEjO32vHxQ7X4RnvnOC0idYWQCpt8X4-_6MoXmSO_x_ZLx1wd0jHEL5yX2LwVPv-fTdKoKDO_lpl_sO6G-RkhPokC_9OUOl0qlaT1XL2cO-F7Ycg3s-g37Dakj6FV_8lYDe2pKtpTB1LQToO1ydgurSZq6tjd2mm4DZLhRBePCvryeMrmNExy1AzKis3KbDNxi12TAUnrVgnGuwbz37kOqtgzx1u9qVcEKDky920tlAvSmfJGh8XNBPNqbiux4cbvrKqBpS0ARhUPaiaixJ8U0QmqZBJOZVp28uwaStOsgC65fb3hFr-1Rer0Bzb_uhGDxwnBM6dQ5R11Q8jxplb2Jx2fnBaNwpKE0kS9ZYy90ZZ-6ubDLJ1M3sPK66Z6_0DvKFltfD5c_tW-L2QTYP0XOh6qFJUlFld84G0eZMYoZ23tF2rr4tpP2tfqhn9vFLdNCRvNEapt0w0qs7E0IORdRCf6WToZ5UQxo8jtMVrIoQ6VFkbEklykcUIMJ7ATsyio6IMYcIU0EQUnvKe25enDwtchZiiipHgRZNh0qny38KmyWCAFQgSs_WPI2OLk5MkkJoTyFqot8Ke8oEomPCWsPi5aWfvaDDUl6Lug9xvPoHhO40dPncqgOEmevVrraUVpE7q5KMBwsw48z1kzStMgWtBTRumHxiLP2gVCoP_0kjr6a5wXmqbQ2uE1S2X6PL3UdxZE0dxegp0xc1JUnI2wKIugeCdiIyvslHItl9gK32klIJnLj2jLZxOzGUCnYu4-2Jm5Bf92fm7DgSrSIppwIX8JxjjHQMsSjC28nvsoyIkFyonQ9Lz-o_ajJE1uztNpHhAN4JRvjnpEmS9otTNa5YAoAMe-SNaPkkF8sfNjLflQJ3nMKu0tyinf5KZ-Ng2KJ24O1b0ziopohfWQ8TgesrIdu2xogTqbWmwetpvFiGIDKX2pJ9inZbnidrnClltby0ZVdRfT7CLNdc4V2Reua1TVVRWqvVAHx8vCNoPdIZBf6oDIg3X1NVHpbPGkuFcWzE22fW3W4VfzcHsaZHTcw-U84qdss3419vrQ7XNjgMR5t1_poc7zKLvxFj33aTAhaJkItDxtv0oTzYCCB0c9RZItzkBSvknmM3MxjWi24oaBpZEihd5U1kPBNhWpvUuBoygj5AMt7h5ll2-SeaiHU3DyQXeXIU7eJO9FQgSQaKwJdwRbmwzG9TQp9yi5-VxthO193gm1pLJUsLslebbt7FJnwWZne4_bxls95_Mf1BcaVGd_t8yXNLMhRtgQE2J_zYYw6-CozW63S9B2afK7y_kwTr8oeU02Hmmf6yJCKdaOhq6xwyX4IXykR6p8ZzXzSC3pAqZWpD2fWwveqkb_dhKO1OzUXPHGiUN0oSzNi1HPvQ6GBDdDgZvr9vNJehxNGHLk0VHXlPw0KXjlKFkeJfmQQIhAhOHFPEvGj_qSeApGLfIoye9yWgRADh7MzJ5g5oY8c_QeQ9C8kg-JdHG8Xl5hPVWDd_nwHEP68sO9mcZVgsUPuDZ2b5adtEXETJuIq_EWUt0XRZA_40c_Oyk3c3ZZ33-3N_WiV3x1aYsp91UwhgpOZupV-9FoJJh4NHLUK0p4GSc8QfRrEqJrnhn6lYQX45eYfJ4W82wzsE0lc5szy3dH0fSMm9PDS7gCg0DCxO7rYET9Gkm_XrcPp0NME8E6emfeHPWasp5kOiIAoyz007xJ1rtkeBolJ5S51eEFsu-S_aNOYsrb7siK4kUyiNl7BlqDsrYZ28irZL7V0eh1MrmhzB3KtK-mM2kyJsazwKZDb8yr7U4-vcCxTY3ucG9rKVLEmELQ5x1GFvwmWaw7oe-Qwc88iaMlGNPFChzFENIwl6OPlw0giKcEGS60lWIih-iAIzAxlaEGUZixa601IrZKp-MEonRFZzd78kiZ2RCHIiqaTEwCS1U8ZSbaJFohVFv69nCrA9WC7XVuSkFylJ1xBitcqlSI1GGREopu0sPxkp_yXRmXB8ImklQ0u5LLp9SD3NQj1eBzMD-2hrLxZjb0uzk4L2kbSaUcNyfiydiklLxWaEdECwbdI33PThAysUJp03EAVjqUm0SHNV8HRVh9TNPhN6oiRtS-EmFAUKiyo9vryJeXaQVLTZErtqtiN1GvbTVbW6NamC2UdOqQGwVfCLWcoyzL6KiXhFeG6RT38dNi5RjqqKXPnDF2QtvxvwBFyXfzOUHlar0QgSERn1CVOwuqZgizUa5rv17XF1z9XhmaPdJeOTolFH99wYZUK3RWAfOu_FC1Q2sniYQWR7H08VywBn1pprr5oZ3_6sv2F582fGMmxGYvDB1UA_aS0eTKVZSvjBgr0HBpGr__jbgOGqVaVJgYEWHrlSLljjHxHaGKncZM4ioqXAhFo5WUEAg1stNshOcnWZkm5aRwoz5MpIyd4RffsYXOkvQqQXV5mrSdxZfFF2XuOMJMOWz30wGxqCxYT-yVU3MhnY5T-EwphepWH_fGjY0dz0cij-0FkNRPWQJH24FdcWRHLu4T8o01ccKxtnbbSUqbPY9kTwPXahsL5h0LZhrllpxr_LSYZM9znctYX4EyvzYVb3xy_91_tP6ss74_mG0u5v1P_x54xCWfxFbIT2VqBWoZd-rkoFnOXtWUBu6qeyHspnsJL0nRScs1JhFsEeRBm3aBUzijhK73kHLLF75VA5vISzY0em3EXA5UdHJz4NaVHLlD-btBcq-tQMVKx9-KVBr6tY-5_x-o4Xw3XO2v-MEAGjIk_wc6NQjN8_t9SqYfenGgonP6n5zB_Xnbu88FnPk9b_4DMn7of_rhP7WcH5CDjJX7ovbrf1JrvX-hbhrxfc-jSlkft3L_P1Tk4wjFPrahwTPqvP7HHF9QX6gq0dbVdHUWa03p8IhOfGJOs2s6TVqO7xulTosSIouy6TkOwzQMc0K_k7W1LtBLTQwHnsqdyrw30ze6AMNXxItPwcvzE0hFAtYnvAa4oQZ_MRl7Usme8EqjhHhRCd6LmxZnfb3IouHZOnXPPHgtApXPQcN3AoMwa2bB0e-hohR-XzoD2m5hCNXYe0VLmQTIh2ybteIqGYijl79w6ULE4IYBW83m86Ij91r5UiixUykfvwSZkUBmJaFLAY46dnk3E_TQUf2Lm6iNj-vQUvgOC_Dg4iF7V5rj36vfLoEzN_qT_QFIz0t5evZO7tuZOwI46UTT0-_rwcD6HnjD3fT7ctumD5WPSLnpAKZtMNFDdiLVvsj0OL4e-FzCYw20SoI-dabfZ3UPz_DHdYJ36gSg6d6c3qD52eD7R5mrf3NPPfq052bvSib9MwMZESfmuln2rNzI165-6xb76OBLt1AfIKE0b85xlOt1p8WpbMRI0_MXVF9Z6TIjY6VrZOeZqCnMF52i3Gb2Vz_j2_VQl70hCOMd-vGw5X307Ub56EqCx0Z3ufJp63q8NVc_Ht7_6Js9Ym3AMDW08omnYLMxEPThSjcwKdRHAyA80NKV33v-msgfK5nN2Mw2E9Xme5BCcqHTMPieb6Zm10xNbWJqE-KFoQvnPCdBBtdB8E7gniBVBKrfms2zwNk9D7K3ld8F2Bzw6XMenvsEoecAwh8brmVCNwMEEYCX2FHxMCDyyu6xmJlnQeTiZvwJVDSeSvjyfQh0kvOtr8TarXmDhU9sg48F_SOYJZADO_Ck6Kg8G_rOxuei_ZWYh1GcgwAcwR4ITCrL4HIW8dHbs_JCzKbeUuZmhjFo9qEforzs5gKUwi_6RgTNZ_YhuojLxJE-np6gjfic9gGzk0en9HCaTkZ-lyoyskXiFWCn-FInU_TBqAAe4Z4D0yNH2CN0pvpONC1SIv4x8JnVFPSZQ18HsyBPGLYzgMDvcTAjAoKYDCq-WPRwyM5Y4TCzjntWitIXFIzF2udUY3wxoeN2ddkGzvinM_bw1nKbGG9W_zD75q88tfQKESb8IUghYo5FebZiqxe6KW9bVoXNaAEJ7-Kk2JMWu5t7HruMWe5b6UEopcy0vJPaS1stLydinqgd8RVU9_sXtfPpccQV45ZUr5yAnCmimdGhWuedPatvsr5NWO1Uu8DmT93u_qYn7kNEq2Nd2FGWDrv7O353f7tRwPiV811zl6lmUb-29h2zRrmxdxB06ER4GHQ3H3iwjJTxiVsoyjgI1rc2lzIO5IvNnR1v6PY3iZHQg3p2sE4TXFbKRfaWikgNuzs7W6aOHaUPDg72btW0tflgV-rCk6lt_87CUuf25v72_u6DzX1T8S6X3dzmn-7ud5rZ7G4_2N7b2t2WtspXabDb-QeVmGnc297efbC93Xmw9aCzv7ND-9yzFnAbZd92wS__u3rtcStdVUgrhbRScCuFiiQ1ktSIU6OBZ65QUu8713ud5v-4L53rB-Pm_0J36m5CCgc6kMjBh53QtEwrpjr1_w88n-fvgaJ1_rt_tiNsNsk77UdCFdDVukKg8p57PB2PCer22BMMqFmmrXa3XXZ3R73qbBF_7y5t1AyWdYC9GqgbJsB3RwEujOqaalvMzkqjU_aVlDzMeom4dyLO7TTKnhC5_qggOvEA0DkrKk89pVsl1o8vdcVWep_ouK6_7YEmIxwBiyJGD7zIedBoI2WLhfwh8M0s7ket1iDIceOoiJOpXnAeBK2ezTs42J3T3i_9w-QHBEH7O2tr-cOd3a3NDm_ZVis9CLImznx39Gx9b4VOD2rYX4np9_yCpZs58arpSVRAFBZnBilO7urmRJqYzycHOw-2trf-roGcmJ5kVKu8tHpf6Vw7rUnlrbK7S_T4SgQ7h5G-XnFaKb3SaQePShmkOZBdMiLYbblut7O5tZZ7Dx8Swd2SN_grKGenuzff3O7UEzbXdrfmNL8Cg_WM-ebmdq82sbagSdqlhvjdWvaGsR_XMXkkoGdFyB5hoG5IqHm30xp5_ojxn-yeB2o04BTGZ5K2p0a8T0dmH3X3OYG28Ui2cZmtcAe6DuDG-5UxeA50KOeB37CewmXk0K182TIJD0rCJW5Fb7GlDLP9lPwynkxiWTIiZOi8Y5xfPKzwj2C5bd7Sd-KgGqazX3cfdB_s7-3uE8azDjW6evf-HS0KdhOEkaH2Tf6h9vCzq7KHDzfpoTMv6hjyO_0QH7n_tb3u_j7htKpJaYsqyriibAAciLtsWGP_llH-hJn4-oRXqGDJOwlnPJlE5xd6xPmhS7wP-P0a6BhY6dK4TgkiTmuw0t1_oE65U6cCK939PU6gPp9Kn8tsgpULb6ljL77TL0rv7n6vw3fn0Cdbm9_75O4cRuN_k7W7LXPCE1qD18qJXSZO7ConFOx-r2i1miUKOlt3sBU291rw6ljfbQRQJXzwbtvc-h74KG19qLFTxbJV8CU5DNdyyKMX9VPHUsMw1I7W-OZDOxYaFcYJb8Xyjs2R7vBG-72yYe5-L8uVK8j-90vwJUHekP-EcoYIFE8rPxB_aqjOlvPDyjBKjES2JKP5rumipGAn1nlNUR6qvXIhtrdvL0RneSG638Un5eoSLBQHGftgzNnjold1YGo8VUSm9Ydxq-vVzvvN-1HVL8rrecX9YNNIGJZOcBj4shwtgnOGbBH14wHs2Vqtqr3h7fZ06ZX-u82Wc_O_aZ1fNN8SbZWzW_Wk9BtEnG0PVDpshBskZNYgIT34NPuP9TccHedEJ2ivVh4mIv8hkqzM1179c-CW_t3053cQaA1OxDVPzUMlqK06LqjRgGzit0xcQUJgzr3Vmmvm0rtFuQj_O05x5fiGiBM-0VdcYRrTrNawBx5ypEvwB9fI9zH-UXOys2pNNCuDIF6fXxQ3ptbvHid3z8dtxpSNdZOKK_WMR6gIFzwYG2QBPZe3UCpONHLLbdwnYlh8F5tznJk0SwSZDObfkEVkoMmaugXYOs-W2N6WEjv7tsQQJba3yxK7pvr9ri0xRondDpcgkobNL2teaiV5i5PvnHiealCgRGUOuytGa2Sq265VJ646iFGup3Ukbbfe7MRdJ97H1PDgVs6mydm7lbNtcvbrOaOqtk3WujRzNk1O91bOtslpTEnu2uStZvKeSa6PeCV1bcM7zWTb6m4z2db9oJls626MOC7r3m8mm7q7nWayqbvbbSaburubzfGburtbzWRb93Yz2da900y2de8u1b1r0hvDHNfWqbt3K8e2vH8rxzS-2RjvsPbNZvdWjv2mMepp_ZutWznlJiIehjcRZC12j65v7uwaLxI2gASLA13nPD-5iIZngo18B5z1XTtINIsgBkAF1HgzN-FL8ExuEWZ7CRuSE_0GVR7HSZTdrLDFjiv4hz4oXSo7nkW7xPQR3mXWDjxeB0iReg9FLOHD8j5mhTVBcZSIKoYZdo0yoKOS9m2xvr5y0OmBh7fyNIvIshbw11oMAcYaLu5k6wGL9-BOSJjCjM7kHTq3WuU39pZe2Wy61GzZ4j_4Frb3s-rIL4Ufun3M551KaJow3NdstVg5HHSTVlAoAe8wAxtjiGliPnE3nwGzlsHCEmQYe9kalQbt3qyAwI4IgBRik54IMnTF0SbUkeqOE7cdNQgtnOAs9IMJPruPr2ZktoDfd5mSPp0mg8ZB06Cf_q4aOr_Kampn1-16xt8fUtIYgrvsiYNGFTiOOAOnAr3sIOktwQzkoyL8kaf97tpa_JC2mnhr-Y5wRRS9DeHK5jqDcS5CfYgy4sDd6q7F3sOHu_PdrTVpcGFZ55hY3y1ua1tEOUmr-89b27qrte4Ot9bdnLtle99vfWtfWt8zrW_-89a372r9gTS-12z8v3bmb1q0JgdM-EiL8A_FYqX4b8RKjLo8iNRiK1eOWoGUZncBT4y8y40rUQYV7Xa727BLjNdFCKW-9xXRvp05pHHU8l0FWFgVz0VM1_tvw2Qihi3c7x6Zvh5qPcpX8FV3FwYYw9PKC1AE9lRF7And7pjRXTtPdh1IA9oVk5rOgjAy3760-oLtOo1tSEU2XnpI0ALZjNdiX4S0uLvl6ya97smb7m-VuNFgQZoSvXW_4DXZu1V9Vla_2ax-u1F91djWAFyIB597AKatgXe_4l5QYLvZ151mX3frfX3wnb62so2u3uUeM5HyvS7_4xlJ1oO9nswmkz9_2-qdJC8fuOa8JZxGJ-coskc4Tk6PTkR_xnxPplDYjxbioCkJZiUr4heqxphQSSPIRTI_ZITfYX8kKr0gMeb5fWOlbwiLn3Pcf5nPLaHhDIKEeoBeZI8NtP0cuE-C7LGtyltbe9L-_FnnL9PRFMq_5bhBcOn7-iqxV3DacPXnPoEfXpa6OF74xN7_8p-o7HdYp2W_8t9fKg9UDXk21NzPYV9w1z5lO6EedLvOo8dPfnz67PlPL37-5deXr16_-e3t4dG73_94_-HP6HhIbZ6cxl_PJudJevFXlhfTy6vrm2-d7ubW9s7ug7399c_OoPIjYIwHfu9nv8InQKM_HTourdnDT0FDYaFA4ySVxiJiFu8g63lg1TLCmICvuX3cM0_2gjM1Rghjp7vTebC5VngQkGN2-u7mzl5ne0-SNiVpu7MlZXb5nVAypDClDtMQckGyntHsEVQtVPb-zs6CKCs7fEtPsnXfjTa259gPUWtrbcv795bXizCimE-AAHOEq0mQ92Azzel8b6RRF6HsyvgWNn-CU66gg2T7rrKbS2W3uOjuvFmuskOjcX0IZlubfp-4hd3u1u7mbjdR3d0HDx7sdveTgdrd9vvEXx6PN_eHentvm0j3rc0dKtLZ39_pdnc394izoXJEZqLg7nB3c_PBpu48OD7udLc3dzePqcCDnd3N_Z3hzt4oUZ3rbuf2_7pbxwnM3eCaH0QmoPi-BI-KaNOdu968o7Lf6oH4rPFT0Emsm6dETbEXhvQ2pn-VcyUTgYYSeqOH5UXt3mUruOiPlgB0hOBFPfGrpEPW4lOttEUuBlQrnRVr7jC4hNvM9e7CNyY_HCXMtdmtYH3aHwVUVdf799Reg225U26s7h2jr0MLVafsJrW7u-66lYDRa217_-7u3oasbeJXIs8o9bZ6Zr1P3OxPOM804V-gHDLp40_d3fuUiRM18ljGWMuTjWS-60UIamQB9E-3Bi0SqKDZZ3AIGXXhxC1rgYvxagzr2zSk8acqnwY0n1NHvIeErmqnQG14HelKcpfysUD3E9v9esXLHWWMuLt9dywRFrKgkTyQgJAE6oXCiPqpmtDIP_TzgRldZfsQPI5PXiRFO8rRo1durtz0k6Q1xujdn5T9YecORSiWB64pbCNavXjVjGjVSv-9VGIp5tX69770_LSinLboDKUNNWucdB1Ve-kuguxnlW0Gzr1Mjx2Vbdfu0LMp-HM_C3ET2bobQhRQyjc3Wq1hzO9iSp6x91oacBGPb-DLtrtYdrwlrv7ZMQ2kvttwbYMb-lO4k3nONvHUGjzzRqvssdH4wmG_Mg238xO2ruEMGMxHcLeFDRg1ArLA4ZZurD1VeSgRKs5qfpyfi5jzpO7amWWUNJ24dry2BherfG9bEtzSgzPL5KuAP24KPx1i71jV1c82BxBs4jdITefL4VAiDWGGXz-tOZkuTxoi62GrWVpwWVk5m2e1EIoLqgKw0iC0V9ly8C61nBWwrpooHXfG06hcz1s_317dFRHbvrGOKszFNJGVFHwR9dbABjWLZ10a-ctVbOLluy47H2ODN8-v3fKuvFbB6jkJN-Ez945cfF4WgJaIC0Vh00sjh87JdppHBxtcngh00cRzECobZ6vPSQNY9Lk2tzCJgVaNhVN3eI5bds6UrbLTMviWLt0kSSQRvwximhgXio1b7r69bS1zk3X4BgL2STNWakkfn4uMijikoY4vob-C1Os5u1enOZD747jwU4UK0Gr2NU8TH5YfbAe6qKQH5hY6uyKE-2eE9AjlOof0dllQ_6w0DMHNW5yFS6QovFeFd6_0nSuc7fLNW77_7ssLXCmZ4FlF6aydJqcsqRqxIs3U7TCoVA7h-JcdvPcZO9GK_FZxhP3Sx0v4m5_9RGyFWzXuebXobCHVHH9PmUFzlb0X9zS8P5qNLwTrWA0sbOCxErjayQiFZhw3CcAdCFI1o3VvAKYS9dAsHnCtaqbUcDGuURNUt4jAsrIlsebtZVs4v7f-7kMh1PeC4le4Qyj-tPc9DodZfFG082yonH_BvHffFHGzPWIE4WfGg3svynkQUFJnoBIdZPucV7xzsweQ3oVt3KVWSSHXDN0Et9vNbWvJC2lrjfI_4uKUMnGH9wOtflb6U8Mt_mus7Yb7yQ2Dj6Hnzd1PH9t43vC8DWrdOnAIHY89oCRJkGR45Utd1MEkKhPOE-KxevZtmhsboX4SqwQwgvnqJ7lKiD7oF-9V8X5A71OVDImpOUJgLQ5gO0v4tHxPu92Wpk8RUWvo8jtQUjJCUdonyaX4j04ub7mJa0vQAm85OPJYoo2FZQFfs68pgwAQdjuRqywr6ZBXbOSooh2P4E6c21hQvy9Ucmr63U9OVHJuB3HDrh6u2BvvVYDNn5ziifZXclR6IU8klO0ZFzsLVuGp3bmM8_h4wnGCrcOWNqfFuA98iAjrqO6cvlCrhF8ObXW95MJNjgXe0BQxV2fc4CH7qadjLjkyT70sdY1fmL4Ddwen8UjTeo0zrb9pZ8CYJLlBUQK_pbL5aXpFZXEJ7bxetiNlSy8zTtVruWnnCOpNjtm5enJGo5DP6AWzU5saGcQL7v4j2_1-8lQl13aKXwUE0bPSlT_34gVVee3a76T745qR9LYEAaiiBGCDquQ13ztYxeeu-b7D3_MivWobr_IsW65NxphGmtNMiMcMmonkdX22nOPJNJMxUx2lJ_nGJIkTnr5DJAR9klBlxk9F8w3uF5YbSl67ZpqeiOvnR_Tufg2OiUA5ljupX9tQHQTruDuKJ0d9pbSj6DhY3-Rr4seSckgnjAY3hnur_CxXhJOvuCJ8zNc3JylN9cryRWGVvGQQ_lq5MgRBkp3wXv0sSKmRG5rLwSp5FxRfXXMvOPlKp-sNJd6rByq2jgOMF-Tyjl1yr7wP6OGSX_KyunP8sWPvJctTYS5c42LU4otKngV1KzeD2T52nNI3hXSoxT6jYSzPN2JsLT4i0i0I9fwF2cUbeyEmeSsOK5I3hB7e0xq3nM9OK_kGOP0mWcUI4LReuXVN3lS-ojc9RezGfE7w1mBAuBq31Ur-aqar5EcMg437U1DLb5nHF0aCp_4PiSXyi-tYYcE6Hta38WfPvtr_OWqj3-nuwWMbmABX3w-63qfkx2UDWtpPNC1r3Z2DA72x7TXEzNQo-2ZLfg5m8chP3qhTTZvmWEeFj5gmlPN7MGNxPAFe7s_6yZuBn_y8qN2xnS2AVX9VyS8lViXq9Ce75d_TiaCSDwwij_uAAo_2wp8l0k86lY91mOcSEanplKHG1ZbeoqLvmJagmiS4vLm2S1i3T4jU1ogTrlOHkloxLsGW2qCewiWBbsIUkH7gJo_txaQEsRoLZZylCZAeHGMPEr4u_WS6-Ob3djkRHM7tvSuCWOdCrqNfRDeTNBrBb2LCHkKTn-Df7zHHl1j0kqkVG84SjqoErq0M8Vm4udzrOCzSjJA4gOZFoc_dZ4TUlrLE3YvJBZQnfJeSQJthuAmhtQg43c393abIqVmWyPLRISPSTeV0HAYYOIF8Cw-ANI7S7atMEx2Ax4zAECrZTfgOG0czKhfBM7biS_3P7dCUJurhDX99q_ZVW3to_Yp4HNeJj6b3geHUZrinzKjve5UziwJfurUyjQkE31CdCbkUcZRhqxlV0UiflQuFi0Rt2ne8mS0h667Cwep8zm5WiYl4I-GhifQWGIlL6EgXxEty2Fv2_gkyIvYyE4uEKiihCvefy6-S3xcqqjRZnIkv19bspx6DqEpp4hm-0wpa6USrjreqDgFbbt9Ys2N_PHNTBGPtLUN8VTEDds6A3ZUFdoro2HTH7JQSjagIH6R07hOqQzGVsvPpxcJS3iAT-HykAhwRwyFExMu8vrkD-V-djLAxOwIgjfWu3u7p36m9sNZgxZVCewNyO2n2CNfVkp_bJfbjumrbmXtZTvzPcOdX0Si4tVWnTSKhhu_-mE7Cnyt3V7irVpEqtQYFEBbs49NGnwE1aF_o1ATtqDnSn4SrYYtQptuJkNoskfG2SnYtMt4JgG9mhbluVgTd6sKZyLLoQGXv1EnQ7SxqTHMkJ2IWJhM_Sb3m_rJ4CUJeiUHAcYfu2oJaoQ6qP_ZkK9I8t4qaFFNcRWS43GvcwOZh10-s-8LeBGJac-cXBgiQuiJsE9w2PuQ4XIgiBqkyXMTBBaRsPWs6Y9w_oj-g0i4jkd_gi2JjE2I1E58ps6KVGcc3KkvH30cccL9m4x5cYfLHxALdgUeI_ZmxCErcEBYl6jCBoiToE9VlopqcucWxC59NnhrCaN1bCLWVr629cXXLafpWiIZ_TePM2PF67r2Wk_0FxL1Vi3s9IyAfwmVLwE7LBQDg-bex5qxooAJ5kJmkPDABMAjjRRCE2fAjzLXnoMVlzUzgrJwjmxG2STZZXc0xSdw0iBCcBhsFEqyUVyQhsKA6YfW8JA9h79osNyhDtMrEJDsiEf3V7SoJ6VQYb9p5FdRuRb9yLVqRz8Yal-9oH5zr4jQdGYFTFDpvXh8eOb7z_OmRo5gQgbP6dX6iBJpSov7jaJL7TpwMJ1OwX-dQnTrDNCOmgrDHCEEfZg7fuUyKddhs46K3vi42LiZRnDgLBe4B3ug4ELpxyXAAxyy2vyI3p17XQtgQUFwQM6zho0EGQWiBaiVQgBf7UjR2FWWJ--Wt3CqF3RWi3qyMo3ii4Q1iJSoK2KPCE3yru9jYQkAcA2THrtttFd79zY7l5VKsSZOYtG1HtQtdCGHX6BLt3NSSWSERAYQyKgkfbUo39fznvZpCYjWY0GGwC2fNNOwJCKVe7nI8nCS6jE8i2jiEQZLRY4ZaSOioW48n6bFr164f8-1vi3FrE44rw29cRz5dQS1mPmh_gMDdC_qOcEYKLJ2De9HCOEBWIu49wL7tszos2VPO0PoCcmj14zG793GWnL4RG2gcJTnmorXikyxllz42SJNKHpS14rJm9RkXH-M6L5WKtJTatx8S159m8BNlDmwqUlhJuYqqqLflYVo64DFHJR3pUaHKCBnstS95xv4KxE8N2isGWAhdUryyylOW9BtxCpHoOI4rNxf6sXFAuIUGJAa5CVTkmXi9nlqKImuMxqNAiMQ4KCJ8HPEWiUOJhs5FK5du4s3DvlG7y87iOL-ZtLb2FlXwFKqi9PljolIS0RBT2wczxokxSDoFR_ji7TgLMDe4rs4x4ECr4Py1Sv_yWFaaL1fxvDBZ-pzl8TZmJs-2cbEpmywu1y0tfTU_oJ5oJfq5wnLUHYTomwYc7tW6B8-OaytL6JGOO45DnrHPIca9Er8ZnotNxFvPDD2GFckvGui1Z7A91Mg5YCOzUlvpMm1oypkGZvsnWya4_Oqqy8Xzamz1FZX17CVwldEWuCot-D4gjI5uA-jX1lIuwXhWCuASpV1bPuHp8PsP4QM3qjv1oxQTw7Rt9grBKLMcQggUU5rHPkA7UoJn_ZH1-LVoXGhbTT5XarA-4srSzkRIm-py77ErvfUs8cFbBsxpVbdxEsayRi68MIEppgJrUKlM3YkaulMsA3dvyoFzFsYqruyxrmoVD2JKfPQ4r1I2-cVVBxgDOa1s1C6Dgri5xwNDDOBy285qvDqAhxcM9OKInc0ZV3SQk4TtpSSqJqzofdbxwU1_GQoF3UVnn7lTVQXXIljI-8UAMSHAZZUdIVYfVzmb4WIWiuFNnF7xGOEL7H8D48k_gPHEcPbKRDRgcK4D-m24JbQmUIoItzUAVQIrNe_S4iXQHt901vzKcjdOhS20sXguXbJZxwQEQ-KWxgSBXPanV3foV7rdq3n2U1YOV0rSWPglkrTSKgCKt5kBpiQsN0ANXMvoFkbL4U8X4hSD1jcSYF3UTuvAjpixrjkhCR8LnmIfYTYxKfMVx3aBLzCIzG0qQs9gs0UIGzRAZN9xYC1Hwh_dOr6pQzHAY1r6SmNnav8MmOuwDENs7CZBTLQmfgXYUR1m4RTyd3esaodqH552gmkfCMIINYNMZQbJiVuRGLFr9ILDR9wG8YUSn7CBCR3MJ7Agnn3PEJ_EtBYtlw7DWDFEemGIc4VO5ZJ42nbd2sToRROSDRtLZ9dbUVPS_i193rGEhhmzKokqDutDp9M8U0McVlgbAouo9Bdd_FSpTPsD42DDOkG661ArfWyGxlVnqPeIVhCKTdx4tZzPpdys5nfTh5NYuGbGGvq0vw55xlc0HKvw1pIK4Tw_DywDyYGFI9vJ2Frc34FA4rsQiACdFt8tyLIyyiXMEsPpLG04ms49w1PwKP2ZOCiFSGDBmdmFi3DeQhcwD0678vzCl5jT_LzOQlev4cMw-iegXTJ0CUQTk5LTm40ncGjIJA2nIcZyp1Z7bBk-nLI6qAeHwvK0o4uLyQ17sHl6XcDvMZ097FW7GqdMvoyzduxY32NGUKdWo-r6EiutY8_wdLOKxCSMk4iqzqzXohK4FkOJbZ7YIAzQ9CxTp7korOPKvWIGjt_IkyYueASZExbVQKt-UrtAwNQEzpTSa2wxn2cH3R0wRTamwTPakBXBU6KDwq1H1XTjKtqmimqRN1UGf9VVA6kVSK-tTSBXrQ0PYrJabwFHDFX-hF0JvcEm8cvOT9xUVKqNAeoTeP_OeAn5A9k8NhJQVyVW0kfPU3HmlUMQUPNtw5Y3DLs4vuXVtfZlYTvOid9N-L4lx6n2pkakaI7TyPpC68cwMSvGbsF-1DhOSV8uY6ytrb4lyigrufZasxOEKEvlomxu1fl9o8ahBCbMeWdNiSxXUVTF3YroqEdgzfbWFuGolF427UteUxcAW7GAJ9dsSv_6OGevxiXtzk5GhS_sR9GAMTx7XLdBWG_pNekzQfluU5-50-HA5aWVQYlQ2Yb5YRZmvj4oQsSVjBDxQ5jNt9DFlvBlQpZh-iE7yaGvII57aN0Pmu7CsROtTukeCh7Sy2RxlUBUBPBXnBAjn-kRAnh8YP9wH4iUNIBRRcRSl8F7dUH_ToMOQm-aGH2NcJOBO7EGReLKbDQVv5d-p-apKvc7RKhCRaySJxz1nP4TtzPFc9cb9KL-9gAXefo7AzpZo_4u7MzVTdBHtpRRx0H0gqWiV0FV1Vmw3lWHVaTcIoj_xsf_bd_0aXCHW_rDoJ8QMizSCxZ102PG6Zm8HKdFkZ7bLEQKoJyBOgoO-5uD9UMcLi_ouYtnAr1HwdFGYQIDIBTE0-AFvbOzfLxeB5dhlPpRrF4F7tHBNX1-P53PH_ETzqsXkpbN508lDTvogpbu1dralXsRvOIT5hIWCpfBBdK8A3jiu8NR2DrBI6pstU7VsXtJO4gwHi6CTQFTzCmIXu4uYMq-ESA6tSRHffge6JmIEiKeqdIdIDIfEE0djvUVBx_IOGIenYlyXc6PnsKvcA12Tjk45Rtq_QOdlhKqA9txWgWj4rV_HRzDiiRg_oSjIsh53v4uVizE3GGW6QlIY87HiVsSIKoE59dLXUKdeJoQx0WA4k_grJFW_jwejSaaXrv8KrBCr5sD9nWaa534J4pDyY44Cqz_2qhv4MtlbW0EoUM9aWPUtsFi1QlTC7itYgGKVv3Mm50F9p2RzJMgZtmckUsCXmb1yLKYz9EiKF65T6BzVzYqsYQkVhPIqKW6g6BLOfdTmeCv6mWFo44yrf-IJmeENgl005F-xuEi24c_vf7j89HT90ee-kw4451x_CFoovfu4bhSqX4NXrYT6ie-huWGtHIv-FrvfSlaDKWiz63gXu_zQTDuvyPELIEh5KJo_92_N9lp8NNk5LD2jFWZzsD9qlDaFF7_3LrnqXet1r83uUFevmd2pf5ayAF2JwZ5EzBWoFFsheduRz1bf6P-on9jKI7tKnm-e-52FQPE9oDLjGn5q3x17m7WPt2qZUHQxHd53gaCWR52wnV5IoT6TZqXNPS6o34MDCq5X0EAO1y84fiXMBH-pr61jrz7N-gjJ7xVb1svvI0faaWZbpsoXQoPDd6rN4GbVQq3rSDJq_DfQRqmfokMa4XigHoQrRMhBukSdaOXt-02CqBix-5nPSENnW2O6TeIPcR_RvE6HlF5GzsmwA0ucwGGiPwNvu21Ls3lPHvUsaqVDdz-Mp_Cn9gCXqGiQeDO4rw695MTw0FxGLRDWJFqHJm_u8PyJD90wbsV7VQoBOo5kxyTWmj2oPgAgxnaDUmvHtlztsBenElQlMIGQclUmgGgBKkki4DP_YcZeKiwTcf-BLEsPrRrpQD4hhBY34e2IJ7P5ReonFWdAZGkENzNhFGAHsIvHm7vdULnPD2OJ9qB15ZuZ3M7hHpywn61Rzo_oxV2lHTen40uMp-aljrexNd68hYdULeGMImSUT6MqJGIp4Mt0PkcKXE-omJ-jk5oDI46jfKjdEq0ayXdP4-uOekNjKdyghSUf4TitUJlGp8V_llYoWXqwckUhm4Qb1VflMk2omlpPrTOrlepe_EIIbxNOV84QUblPoKlq4ssPicqyWetDKxEiVLC7VcfChRPzqlvCE89i6Mk8gmaJm1c7MPuNUI5z-r0Rq_Zr2dOKfjsT_pM2fjk9j6gZ714oVI5AGGHgwNvwryhiozkwHnE0csesJ0y-111TnGnwRNJvPMv-FEhurpos3pZzEmdr9FllLMZK7z4RmMjhXjAsv-AjnSq5nhKWzjhijIJ6eZ-Q0DHR45yHr87Onr9yqFT13nx6s27I-7D2hrlb7FPWYmzYKtQTj49Po8LlM_EjpW2ZuWt3p3ZiFplbC05Coun4krWKeKCoLWM-kUnESdHfC-wTNRCrh3RpzZRdYlnU5gRqhs_YWXYAr5oSI2EHCKqUsdHl2WI1G4p3iilnZsIuM3EtfPi5fNy8ql11ka4STDTEpTOj0Z8T2Ch3nv-B46KG13YWxlWVzdJT1zn5-h05Tw6zZJvNGtXlvm56pnI6y7HLg8kwJuGPW3hAWGy-Iaw1B9AUskYQiJ6dhq-Yx2jYWBpjeRDv8XmEx_6RA_ClevAcmC4H0G4cfbG_QKXNiccz6SyHYSsGQ4hmLLT2Ypzb2ZqWDgQcML6gQvB33rBYk9zATpK4K5VvOOkYyOqWSFe5RxIo_2l5PRrAWc5_IBw-zU91odeDKo0pgEciIW7m4DLaHO8UzUzffOv1DQhsAOUH2tmxrLgvWH2RxgkrUuONibB7DvyjVklcsIdlLcuJA2lmAZhRSFYu6QuCY_xvrzx8cyNYLYkAapdSA_auGCbwVkfuEYClfccyiYA7apK9Y6GTV0pVvJNBGUoWYi5XdUCZETyryJsPS0SwhAgjEszujktMM3ogsj3KHOTBLFvh0GUmMex3FiRG4LMydlumwsd4n_WXsR1iw_KLLIykuqrwJQUq2PGno6Zd1hP8kSJzGxYkzJNOa6GKA3Fgsoa4dVeDrqwmdJWPKeteK5gmkHhIlIlnisL2NstQljowAa83fjUn_UHG43LJZnnJ_AjYS5Hv-8ZoRdxOm8Mky83PFL2_edZg68qODd_Ev3MyiJxbR7QNmSP0PymGI2VftTzSsUU_V67aEWlrZdoGpV5VO-rws9rhZPgQz2rU7-w5V55qlzEi_k8es8IKfoFw_jgEwlkL4W99yqdEPyBz8xdz10ZuHwBA1Of6wjXd-jpN5PoZwgUH-53fLmmseqO19bGVlB1GY5aXd-S8cTC0zoTCybuVEZ8LfW0Nyrp_N7I-ko9IZp9NOidwF6vIVQtwvBEhKqyz4Wwoh3B5Vkh4xgM4kDiBWimLhaeN-S4UG5Rm_ifkF5prU-JYKVnr1biNymR10rkzRLvUYLVXUR7m3B6texfXHYWH5hbXm1tcQnqmV5glTRfeahnxSOlxQE_61n6uPMSS_jukNZB0Xir0nBbuMuoxejNvDpEoHPUSF3o9t76XIEJJWJ5gCMC_XORpdD_PJHpI5yEYMLvPXF0CFfxl65jXA6uV3OsnF_TaIRQISWa9B0VVUoY4mfiEdgVM9IrWDQQZZ1Ek3UtYYUw2oXBQcnamlmqSiKbsFp9oT5_jvMjg8s_EI5E3JP4hEh5hNVZ7aormiPzjJsAv7qVXVMmEn-YMordIFw4WN8v2QurURJoMGbjTm5lEdCefVZGlwwRnbqzyLtaEaOq-WnBVtaeKPJ6k2UBfRAvp6gYbg_eWYqW-IxoCjhpJuMIIDxN7eR1GfkVohBFLuuQr4wGNvrGoppZuUBgZjwWmCvWmNmxcOgTHogz4TV1THQMluAvxJz2iiiWU2Zq6lR2dBKUMyJ3DqQepooznTn01Xlp3HFVqdt4b7Em_sQ01o9w6VhDeksHWr1obWmiE1FscisRowRroCJB1Tlot4miQvPhJ_YFVgABR_sF-UwnYnQDISHN2rH5vQq6KjrjIUbHMNaLDlV0ZCwloxc16XCBq0rRDehjeTxmGgqPkDhG8sgVXZUiWs1RPIi-RdxK0PO-cfVo7gpxUiZJlWzHT2opzOzlfsRJPIZHkHhS7lPp9iPu9rWKXtluv64CtTMnH31luZeRa_HdmuiaqceoCltyqAsVfa1uLtECmODK-eObI6HKCSdw1GXwDHx9pLpc7IIy-YC7b7zZ2PeME41GjpzSHpgDUOwI_eaItSSumV0A2bPhlMaFtHAWseidoNY3d1StjXfNieFn45xTN_Tv0yQucm6mLZUoxjHNJk2ccPbpwh-Uhj_mI5t-QEwyvvTtl4vyNq_QqO84wsuPNCijgzD3Euic3XKzJwo2bhL1hCbrnonsVQrnOQbXUERZKnpW1oWwRRKfenU1umeqKuTepXsU2KpV7RmC-jfQGR3VZP9HZeVHno3xgY78VQXWtQE7mQmyATrlI999AccQ8oL6n7kvBK8sf7EAGR29MdFtlgKIIV78wBLZnToHVYqWonIYPXHqhr_3YOxpXXW9x5RG1dB4KrCAEyKDEVIJnvYgsbql01hlgCzT6cg7TwucmUngZmGot2FgVRNUC8PPsW5iJqBkiMZKI4JhXC-ys8KayNRi3XK2lyaJ1ZhT1uXGlU7dpU9z8yl3wZ0E-k8I3G7rZbr-JpbNVGrXJ21Ur1ZXJaAv5lvoWqL324SaI-I83vK-o2fH6w2527ZtmtihJ1r9tH6w5NwgiHrHtlM2jNOEUAprBGYmjNTUOB9Q7NqZ2wVzdE2UirOBWPZDvsTPBcDuxESbhrNyRXM_VvjGL79YWOhS0dtSjdd7GcwSa_Xid2tSmNzfZEMpIsniYe5vq_MoO-Mwqv7eQhlNDmK0CB08M6ZTPp-SoE1E7u_P-Bh7kqZnsT5OcckinUyqiwV_0iojy_IWUvCJVBa4_U-9wX1vw-NTp1e3v-iWfCGAjJ03uxtuP1r_hohbbpFN9XwcEdVmwvaIJs11kAF0CkVyMQ9eclwgOpYRKEzNJNBucdAlGOlUpkHFgv9nbOy-BX1eyKHEf3GUkKLUNaMMl-MBgrrCjbAP19aiV3w2dPWWV90OUfruw7lOSMjj8tFszogzBAo0B_N8fhYKmxmzKLMIbI7vntUyiI8Tm6izmt2IWFRgwxs9TqkFd8_YM4f5mGbCY_rI2uODP0w-lB3nCxllv1_Af5yzsCEcaZ7F9Ot2aXpaKtyTEdIyJX_-3QeG6GnU26CgblcdhvWyDRK1KkOwfZxTj2uU6p212vYhs7QmmDgiY44kZi0fsgx32SM4ikvFBo0FZ4QP5TrQzFiKpTbwd644KviEo4U3vmkRAsF9lLPAyH8FQiqrFxagWMLSZ8EB9ZavIEJkl8IE6NQv68QbCyKIOq4l481iazVKz6M4AZ3b7BwqFvcxmAC84Q6ZSckopal5LDV8RF_Z4Gkwl-yY_XjWHsdZXuBK7gfPpuIn40zIwgn_vIlONF_b__Nvwc4sTKuVLaxRYHGvOZXiOfqZ23dk-mF3rkfx9BzEE01lFJ9A0Iorx0gRdI073oYSPGtPi3NCwrMFdPIIKz_tf6Gkz5AgfRnILRlPrVJBIziHhpgWLTgklHBRha1maqD2zoSiuAAhOpE-cJ2qAkekJ2eE9iTAOmx67fOTdEon5q32il9cE89x4-NnBJpbh3s7dWiv7NrqGTXe6i4NsSpgqIghNlx0Um5XOgWTorrJbfkWj1cOqxIMeToU-l1XAXM67jL-HU9TEUbS9q12RFWNXqxSN4bSrD2K3ppCwYx3wNDCc5ZTSZqGBnqEkb2lPuvY0D3z1H9Xc58ZNXcF6k-NbuGIKliUtj_JCXuH1KFLLBIBc6tFHI5Pz5Am1a9IXqQXOIatu4DDwIEhzDpBylWUETaKXU8MDvsODmKmyvk0dAaqYrROY1yRuunrVuCw0wRn0CvTBpWfCGOW5po8UMWHtbVHa6Bs6EfNmuIOn6js6LFbGKkLRCxQKgGzhAZRTdITxKS2yX5VYuFXRdJpQaha0ZxY6S5O1lU66rKnTEFmp_wDY1iA1VnJRIuMwxzNlg6qnc4yFVEuCpnbN-stOWg-9cF21GlkS6-ZdCHkJaobJzFnssClDWsCcOOLXR3rPmkgIMrZJtRlPigmOAhvtcpXKSquI7mzC6aQEMhJ1Rum-aDeZHpRy4PpI3_DstRE-qqGEaFm-pp-uDAeFJPLlCpkM5L5aeFbzpK7nbTljf0KQVsHBsRyTxbMZ_UlhLlXNRYmdouIFVGonq8MLYEUpKe_ghp2E6zZB9ogf_IrgbtbMy9fLT33DHrWF7JKSgsy67Dc4gy-AXpogl0-Imr0Sx8Ie_ClcrYUWfH0lguCq3SeFbMLSWaOCwgNNSwpiMpDIXOzq_jVNVnKmRN7IC_MN1femnNi3fKHlkHo5VZuOwnSfs6EruMQqzWxVyIIX4MjC9e7fukyQY_cicdGJVviiH36EI6PS2eT00YwLByjORtPSn5ANG-cvyK6dIoAvJ_6zsf-bLAhoXcn1YiHcPi81NUiu5lNgpr4f9jifpugLoshE4605IupxEHoT-H0ahLgwVzPmNBupYeswbLNaFf4HzhJlVsoWtgbPWNiwGDEYmQoh_HxhOiBnvPH47eYnsgqOoncRseoCMxdQnOR9MlpPBlJhJAxkFgGR7_tfBgl7TJsqDIJFZjCORQg732JW2on8TJuaYSr5audGS449B1CUQTiyrIM1PspvUXTa8kAtDZ828EyULQoxNknxj6S8Xlk1JcpHcrskW46nzuvHv1eKk2N3oyjgEKuVsMlvdWkLepjYscr1nl1AskSduetneFEyqqsIUaJxoLgrSWi1S9t4VKl51teECf3yOVAOjXERiMpygCq0r9a33CbDSLFhEkmiGxY5sVsPvqX83hp8ehXdOk8dbcs4yQV0VCJaNTbxlS0mQvNO0sPbFUipViuysguvlOVlWwQJKFvxm5rqMYQnODmbaRGQfSGuPrVrhpDkxK9c3OvhwGsTnmVLviqE_PxH7xwZgz2UkBcg3BeiL8vTOtlBQ05i6BHt-z5KPFSLvVSn8Y0pxBS5iorpUNZBIcCck3W4z0Y1RQccVBalpSL85nn7XMsBDBauFAylT7h2mggL6KRnCxw_ey_0UmxoZNMLYRnMaAFe93Ly0sxWXkhAygsQjA3q15L2Z0XiAfgyZKqN2lqxhzKiWWnzu1VnBtmqFIm_-EagVVe_FmwVM3aWlryRvU8m4b8XEfZ8LSeKykscnP-hT2ZMidlJaLy1uhxhMt1zOuUe7Np30MMwWmafa6jHUnypTZejoXX0PYfYxGXeECurF4LE8OnoUyGT8SeIZf905LhW5pFGFVOxoSh7-oAn1p1BMdj4rDwvGZXgZn2syBhnRqVP_Nm0bl7XOlBWMuH4R83B3QYgIFecqdi5T5O24H8BuEYcuOBR0nMktUzuceY_dG-HbS3tijUrSCJWk7gtA5b4r-7EXX-yrvTbYnxi1IYtyV_gfYtXQ6srdVOyCrZA-rgW-QvYNR_aJb7GB73PPGHlTV8YNHT9MK5y4FYwyFWyZbOYD5pxnS1sHtpYcHrYdA1Al6bQrxTe1hkk1_0DR7ZBZx5jibyRERMaq9vO7BlNwJAJu_dxhJ66hiRxMfBe2UX0s-yJuNtugcq_pi4tLgIjktmTTVra4LBUdA4EM2IV1fdIeHQ6KVrTxUmaEVKi2eHtcGrw3Zc6HMavTwEerP8wNDPsPeC_FZFn_HTc4_m88gzS3QUVpiRKv0sBPDI4EP6c7Tw_O8hT8duU2gCe1nJKUO1xHpe24cfTQYd0e6tRFYDMxVivJ8tUyAwmAiygljKXnQoOvMbMeip53kK1ulNmDb1udXlM3acQseFFmcgSfvmIMjaN1aLQJTwakEU8wR21CavtdnhoCKcHHwQUs_BC8Srq4X4zFsXy21nAEKNPmzvsEvUZl75dT21XolORlUN-_u1Kjin-T2SSucLlt4s16qcTP5lm87SfhDkZ68hyqcsT_S5wmsCwGQdfCZim1yMK2G6oz9ce8OZiDKGUAPYRk_HISO49jthzOjwTGECNDcLCEjZB6x8hVu96o5PwUyXwS0-wCjBrTeTZiOdMXQWbX5eWHrXMwOEVCq_k9YVOpehN2eqsTTEFHe_y6mD0qrBuAhofyUM5hIm86jTp3p4dpxes7KTz40Q7l4pUY9C50bnDpyGOOWdXmLwKqKZkBm6yTee7LWrYoeWOXsJgwXYbhKdzKTbZ3ZPLXbFcf2KFeuoYk-MvHFPA0RJXO2IwtxKwqgTK31Fq44SeYZtD2kSzt0Ts8oYAja8zufU4qiUq9bU0x1V6bM7ahzryUiivzeFUMk_EUIlhrhiC4Ul8nDhWUcAPC72zoP4H8EmX86zIWlGAQfOopz5fHXiep66QzWQKHEBUNPEjwi7rBf9bbY-gLF5FyZzxUUtoFGK6TDGqzK5Eejk2HywpaZimfT9tTlAvEaU3aSyHmJ5Eqg-IIyGRoN-QgxGjPtO6Izq1m710orCmxERv_M5kMAdDA-b3qrDp78-fXKkcLfi0dunjxyvfpt9VfO5R_B0SlhJJxXAerNbSXxr29CQcrOH-Q0ApFzoFt2NfQqSPzDZUxjn4wC3G6V-CEKfzkRuFHA5AZZ-glthbHTNIJYIUCZqEh1DpwUJMD_m4r-uZtcbmvo2Pn3M77vt-6FHvx_vh_T3HoTF97qO931YrV0zDkPHxBhyVD96O4AZBp129V5GYhwbRGrKLgD5KiLCQStatym8SbIPE7G1T9h_Jl-CzlhKzFqyAubT0dpan03KI3Y6BwwAHkkcZM1KNNBnH_EqGgTQnK-7Of0XRGdMaU3pfbIOsQQABUE6CeCp1z2Xf4IMFq1E6wzlRIsnk9fAj6A0-juDVktJIoCT8odplskdR9pajVfoF-FX3RankykS6GWmWyaG772KJzVaprx4htSA7Z95xiBiq11VagWpwq0RswytYKr0UrZuZssELRY2uIU4syf4zHAB1PhvhXxWniCGJeJJKM1BZeQvlBcdu659ZmN2ueytyloqHG7nV5l591OOKDH9JxTQ9A4KSBw8WjEv64nvkPEal1VilPY9Nest2zNWshYLY2xG45WKlt1HGr9OQhatEv2cDQkXEm2FMqWzE1ybHBiVoFEsZ9P2JE3PqKvZkgcdr1I2s9sRU8gmVpeu7Yjqh0KN5jTzYbXxES42y_V06s6Su5L-3fOwYHcRfdzxZ-euiE9nxLlLlI0J59tlrx02Jp5pGhPdQ0Rn6wUnxvRU2TAD7eFqUumCJG7ba75id25cX9FG9jy3JN3KCpp2BszHl9dqidOEQds0SPoTYEXcIa5uChNfT1TeM_sehl29tWBz7tIbCgRvf4K5fQZ4dj1rryCfysKX0EbjwjkoFiB02OBqSAaLEJaV2WEU2AEFuzealo4Jl7qihjXrAEuzlcQbRJALQng_Vu7KjZhMLLvbuCGAneQIF1zFyYaxHuFPjTtg1mtA9EcQ_ega9khFj_nNKmSQ8jOnNIyukfw7JxvLaiT8yglWXIuUXzilNJdE0nMkfSD8AHtUJPzEZZidVNF7frHmv0j5wClCm9Lrn_wK0SzefpM3-Zad094RG5xOlf9vhhAfQjOFpjXOtfhKkJUsWcV6kLPCqpEWwmIskgWXDeAJDY3EAnBHAJQ8ufT1lRUgg0zA9mEBMPhDg3xswTfo6eVm5oHMBrZ9uQDPwMMclNoAAA",
        br: "G5PaUdRM0muxEVFVCxVAb8UdYrnCNkeKzEY120M6uEO3yQ5eYqkajTtCSYm_hPw0jtYYODzLwkMjoZMbmren2raP0NgnuX5fS_OeywnVTJhfpmCWY-FSz7Lssp6CREsmg0FpWrEZixxuh2jqyGkOQyVTU5nyQeSifKbJY5aNS8BMUzNt2TUP2mjvL4C2pSvD4HEAoPrY7_1y9l-_ac0mhRenG5h1JcsOzMA0JBT2tV1YLnlKtw1OH55vfql-_Za0ijx2JYpQjpNFb0_-etwr29mxEUU5uB4KTma6aOCp0r51uiKMpl73-wbWZ5FTwd6Mu_do4zeEwP_ZEForpVmmWrVyuhHIowdYZL6dm1rKdPm1wpn4X5NU-kyYhc8Kczwi_NllReByNBBSaAtV8f__dXv6-n2-5WTd_djG0qPbY8WOSBPMyjBBQlGkNMskfvma-_qWaEs5Iqf0t5TS7BFNl-yBU2TYexeG0aaqTatfgx50JUhGkZ3o69SHRd9gE7KYQvlA6Ev7P1MrT1k3aGbdeRtJqSIpI7l7Mj6IlUTs_39VDaq6G8uubkDsboAaACTfgu4GIDnaMXvVDe69Brj3BHJHetjZe3o8z5HlzMmcseP2vJEzmTLlu7IukpJMuXQNsdMhau3WLyThH6JquyV9J7Z1ECAEgjx3G2r_TfYl2dL-xXTTDEJIMtn7ciClHuEw80mdh2YTqWPgrxxIOo1CZWFl5sAp55xxyw2XXHDNHa95yxWPPfGp_Cp_yh1f-Vp-94Yv_VDj_eNw25OnFu_fArzP7Kc1rixuWg3yV14eInDzp_QfXJTczXyTAlIm3YNxAQDlX2X2Qn-ZoAOIMwAMc0Ag810KSLpmjNRDO4AApg6YGBJ10ba8JfEQulnp2gG6AGbSLoiZdAyAjGyR2GLFlDpJeuWPDhOghjOhRNN2wtZM4dd10qdNfY1R2Q7ue0PLmK9tAogIu8Lj2YQ_5UjTj015-WQycdYMr6ftzJ9_qO87jial_39eA_6RC0FqK-88q2YavGk0iQ_UPrzR9-w2tTWFlDsZgsWF451YTCZBwj4B6gkM_vP6BoVCr3M6TseswKXqbGJ9dxkxdEwrPEz8HAeItzExgLumw2OCZQQz1r7BtVuOqcrfmABJAeQtixW2mwZxaX10MwsiGQJunUPZIbhQRvlgy4ItYLte4SNQG2UgkonOfcQznwE0qpbPVqj0If27xbTnJEFYpcqzOPPvxv2GqjSA4of-3Mg-7YkoX6TYyqcA8acsOgxW4nf8l5a3s7D1yNEQRiHiXaQCLkVEjxpyRJMQEPWQYXq51VjYOROrDdZDFgBnWgLLR6fMFyet7rfXQs7KmJaaZESnL0760vPmyqPU-NqtT_LmVjZfflFv3phrr7nDrbt5loF5jpz435Tn-c_k21UkZv2iTcztktjuWOjchyr2QTDtPGc3pymU7Narc4we0KPmUX7f386IixI4rhyJYQGM3dsrFU8E0gVHAcs9o7VS08sYmtt9uB71ra86Sije3xGIvtkUiAXS51LNI3QDlnq8IEk91fUqjH0qt3afA2JU6kVTUGJmJitagxgsWytW7y_QFugs-pVdQGkieIOHxoDsQXU20hD5_VUbzlKnutouQgFQ9NJ2lKHW2elEMIYin_h1QU-EeCyrbPu059GYR7oEMDRA5fSdx8lkgih6RKJLREKFG0fULHz-p1AVo19D8LN-ZZHE969b7z6CVplw6OgPALyufAq-COp_OMAaNdFjKj5whIyUfbTKe8g8TlRaHk8BxcWYL6ma3544dcPq8FskXvfL7SI42_S84139K9hNtD7EA-CCkG3cCSpr-Adq3Y03o0t0Ij0KpaT9Mi1oAU9GfFtgohCTti-rXAPiKVZDiDLBWpTudPIuhl6UfS2TDs5_OCB7Agh_ZzXRTepTo1GQuq9t5Dx8bSNqerxVWOAIEO_GZ6SgBAAQ3mMlo7SmHhgv2Ue9DyGAXX9QQp5kROHFaM6kXnAQOJdqbNFH95fbn9IRmb4jMdEZPTckZsKu79s6MYhvPtClutIWTGUZ5pVEL8Wat7eqgS450Q5woVGa0EOykO8dTtJASOSen40ILVp64y7yCCI6AdoViFNlHwEeocpAYz0OL79eFl36BjhAo8pOEcbM2tpGar6OMseopxRQL1RZjIoiJWo1cdyiXOCbR8x0jTtyQ27nVJ5jGxlroQPmKXRuKH03JESzYwCnj-pSsrwdiCpL1dbHFfPs1GpTHa07vFyoENDWv_BOITZ5a5LAf_XTm0LpQzSpLPEZxfQREcSnpcIN7OaJOlUWt9PYFERTXG0mx1daNCARnETP5biKIfINQSCIa5Qt5kzSk6jKlxy0y-XH7VRzn0nWAzcpNNUtqy0wW9Ms_dhQGHyXXIWlfuoiCz3qkTaLrlDIVhRM2nWa0tGSqhaovCRVfF0lNNTVHlBtw7WIoxKTRvHEcUsuJZ0CAY1c5WU8uShSDMqfXsX1XYhSpBQfOpfQlYIaeclb3XIatmxijhPIbkm-pHlQElTygQAyE7-AE94d__lKB8Q35y_8ZH0bFhfUJx4y9eaco9CoImEPMJgOOg2YrJgjEaFccCgr_YF12x_4y306hDLjXmgQFZei93Yonps82bFmoqLzaJLuDslqxOKTiDsaDDsS-tQnOM0rv3kgLUpk-oAuLB5Ll5iqz0AtvideBquzmxKFjQL2eFQ0Que9RNRidwXNfm-tsI3lPOToWdWpqjlkeaqCR4p694R5W_x7LQlmCdglVdcF1ziFp76QcAOicXq3jkfbfYd6M9ANoHTjlkBc2WCm43lh53RnYYcLFr8gBf-cyFZAWmZI0wkcgksaH8kznRNzwtCSnyVbOGBtCU1Gte4hXxOzvFrrEFwM7YpbHALtHChxw3BVynOqEhvA8q3uUjhC7DsdQVo0HCSXO0OOLpWBH1DwRD1jqmgX27KawrU5CjAY6QXMCkwj7Qj33-hPwB5ildXfwoZfydYTjFQQgRiI3q4k3oGo5MGmt2SmM-YCDkGECmcF16Hd5eLWK_bhIezxpTdUUhvr-CpVErhpPyFeyuCU44RqWoQpM_7HUtc3CGaaTlabAvBIhvuW4YERz7xNQqXVAsBdjiOtMUUiNgwrJMKBmaSQf5upHuBscecNbIpDLm7eSEQaHcMNmwHWwJg1tXmQ1noxenO2sV1NM1euSO4MVSgH878LiK3SEPRXnq4dPySmzJuZV77gJSr3bRE7B9XCxpWDGblpRkoHDoHLY-WajnhIdVXasxseOzNpga4DDEGLWGEwxOyo7PUEGKfjBtsvRQbjd_Bgzpu_DLH7iqnFreGq9WF-LTy63kfTB-sJuDltOwgZxYnx9CBFqP6zWACNLZttza9JdKckqnfAHmnXrttpyJHJTZUgUw3ZlqpsXOoPOUnJusF7GNbudkkrzZpV7hRV2FrGg3vk31z4iJb1m8EYMUkrJIvaBVCaVDxa4qB3XthQQ1J6uiv2pEftEMU2gRbqhqJkq2CtB-uqOg4iFNHUoVFpSk-URlmYt6ZaTZPJgOD5TpfLf7h1LWytjw_43Ym908BiWVEtK2PcaD92CLtNJkuCBKzBHAshtudPg_DMem5r-hjZB4--Fs5Z7DBVF_APyGBsgKo8K7ozVdj-EmxI5bQKaj7NSE9OpE55yipGEPvLDUx1WQRnnqxnJYeUYyVG-VIrhs04dS9YEFO93yyGGnWd7P6ycp66RMaAKRRmfz4Kuw-0Tek2zIacYg2ezbVWvryI-f07stfVHLMMLzZMZlxIGm1Im67ZI4sBdY3SLm4kDmyhWQ9Y4e1Kxkg9CEx9-hDhrHnWvGIypURrrTuIx3W8BzPaY24gwTFixyYBvx7Zno0H2V2-FvvwAhvvpGSfAIcJB-ODxFwqdB6YnXUAn3XUOuDNAn5gKoaE9nQXZxreXGR5RJc8onsyIU3OKH5OcGTDwfE63prr1qvM5VeoS2t04QVZsa3QHGknsFvDRNXNdkmk74aJpx6dCLAC50g1yqmqoSOsvMjX1LMYX5xsoMg4jI28BIhMjnDIyckkgqm79FFVA_AGxzXfbBdIiVKXZIXfyUrMUGQeD9yIVS1O7liW4AjLCALKlqBnmnKU5Y3hjF8Eup3YawaPMGR5JP2goIXeh-W1hYksoeBBVcA6NGtLk2m9LgXIAVOT94rxojat2VEH-yCBY1ViKsNrJdt5DYw9YFsA5SUHcOT4bmX2mTCnPSo12ZI3gcBtSkCu8YgKNBSNn-xbAe7igoC11YzkBwl6jjc9DL2x_LXUGeSwKJuewdXN9gLE6MfseLA0qPeY9pxXa75VqDRVHHJVRD2t7ZpQwRkUUaP4xEu5qOwLPcqpd52NNxTMFNrmFGER8sFYdAo_TU6MYlI5AMFK4PHdio1KkQ0gkcfaFl3k_mQ5ms7WjgM0YIYU3qfP6aHbgG2cQSSFm2RH1yQzkG260EaXSPHHXRd7hEsT-JjQGHm7vY1ko9_hpv4zlxQlB9ODqmmXP5vmMptyddZyMNElQlg8gijBCI2YaWug860c1-anGgLyWQp9Bq3_WjlV3m4W-lHYACq6fwYxBGPyCHrcTh0oZtzcckyM5hzhErQvi65SlPPajue9uqZQYQlHN8dA3WqWefQzCFBDV0-rLHfItUrep1boIJrjnaXF4SvYxHehVcoAyrzrgeoKuIOusryIAvzqcHpqj7eas_Qjyv26EieFi88blDgVv7Re7lj8ipCci0s0E5xp4ZJbBSa5QOetmrvUQ_Po2t-4_tmEfcEcy46ya-1fL4YRdkqAE4-V7_OFZZoTqEw1iyT1653BlSZjAvUCs8HPDpDWo5scQArARISNwaT_BeifhgQCv27HP6bX-8yug2sYQmNzkm6wM_Rf5It-tEiE1oOruYjzwB3DcN4SsXRJUnWbBYRL7LrrPRd0QkofXXKNdVsvF64VW8M21zKy_FYYsn1iCwGDzG5dipZytlY74rgH4NuqPbmLtMzy-MyNMhNjlZucuHC4ToERGmT7kb-NV9bl1MyQGgBgTCRRq4wNeMriypq_BOGJIKS7NLBwhaJeKZh8nqHqH0IzUQ_GkC2ze_0h0qZYmhYJ0hH3w2jeqm-S-GdfEF56TMPzq-ILk5IfeC-P-B8fGavt6ZMl8ScGIk_YXjKYCQO42ZtudMijyknpxBtrcP8c0sa3kJ-JKQTpEOBZQEJPHH-UjWIKLoeERySJqmgz45MV7pZAqxLdqsSmV6LqShYKBTEAZ5-jZrhvlquIqlMCUVkwvdkeRAmWwGoht0URDXBLf7wRB-KF8tm5lBjsYX37iMEgA4UC0QLFiGotaLFpEYXKqJecaN15eieco_MqCnus0wtV9Eu1TPvC8ajwI_mP7CfPU_ZgQi9CoVDW4wVnQaAYElq1Mmemkv43jrOnR26iBzCCpq7HP6ZpMxBBgHGX1oRd-S6kcHPPmOlmCBBv2tXLLqIMY-lv8emC7PEqyS93J7JmtascWvlwV7D6YH-RMX0wqzkeB7I8xwD44LYf179wAQdNFKyd15UKSQeyJnEnQuagZXupTJHLn_OKS_bKYoBZFV4loJ5plyz1gUWcjFwTy1zhREPZAi4zk7YG1AHOs8Sj3v6AYgBtKJnRM3B1g5xmhLtuDgAo95YHbpZDNazJIA9ocgCNgEBgNj0RwM9DRoIesX_WOi0fMXavGc4zSilnDYaEjDFcyE6quUuGjUAcyMte1uNInsH0xHiLJtTOZU5zRnrtN1ePgK-DuwH0tK7xf1MA5DeZs554i9pu57BVx8mJLz2EbgIbbok0SAfITyYeJWDRmLIuC_g7u-Vkv3Lyan1d2anV3O9AE7Bnr40Xt_9_UcH4q1qWv-Q3_8u7o580cnFNT4eFqBLLZVc7y8EN0eMqPr7neuOeNkz3YvBoGN4nWUTEsFOouWrmM8wUZTmY_zrH9hP3hhk9dy5kR070718JIFTElqZiH2r-O6ZFB7thvnSmxK0SNzCeOBsl2gGkWvclBPzz0f04Wd6aye2WlwqvjFz2ut0Lpb44njrzPsUiN6SvwkX0sHHHPAmzxWqCy0_fMDST_iqGwZbiFqTJn6DiynZ9dz37oxVauVQo6HGj8AanY6sETcc5zt3M4XsHktf35zoEAfCVrQpyJ69drbehhfGw3YNm5v7V8RmX9fc5lvbT-gyITpWC9zpbzm0dDAwJG8JKevJodw80xA9B2lchL_wSNBm1n2z63BlzYTyDhVci8jMaaCFhj4vNB28IdZVpyzvCrIKXKxw-UNuht9tNtfRlODq582-ni4_umaRGTglolvRCpfLfqE5po85rm1E5a8zAHFzhJgCFn3uc1GKoWTePus0SNI9DRDPz-0b0VgJgO_Vu-To5nMrBgYPXPrqYYuBkEEvA5bdhv-QiStrY0GzwFlZgYMIUOds99VvTYMWNxHXhnASDOz9N4RERYVJwdq61WRNerOz4eiOBfjuwYSAOwQiEFn8K7zpiQPTLwfsMSCGZmLmROpPw_iQKDSJ0xhx0kPvI4QQH7Ok_PKGU87Wofo7-IAgEBSl74hL9lvBaotdYDnLM-5MsroOszFYlRYaQkZ-bKhVfrZbrradguu5mO6KgQmrZLp3Ac5fN67Rn-2Hy2leJAHdNLGH71FKHeXFq2FJz1AzYF2m_6T85wH6Wr8XpyBRofOjx_aJeklNRFFCfiHVgHPrKYa8LaTKd6c_K2APpNw5qQzuPdk830HAX9NPj-ofVcKSBlyUOGOsvTIL24Mp6vulOwAYmv6cV_L7OANgzol7-lx4tm0XwuuM63ltbSYNavM-OEzyd0K2Z4A8jbq9roeR7AMgO2QZcgxjqwoyCwT2ElAltg03oQqTVB53uCIKzr0z5clbtSXe2MPcIhphMO37hsIY0OQZDeJFKJ2dq0-SySURTCWKWvnDMq9UnJ62ByrD8tADPSyZuOeJj7OsmkmyqS-Wjy_Jzd1jqCsVsMJ3GzP3Ed6akzwMp-NTgnANLX163u01aYkf6VRPR5F0PzhYhOy4RIoXQ-lDZOr9GEgv3nauWZzJr8faUdBM5kmACAoXOCFDYpvfjHhyNkFiiHE893SX6S7RMVmPWs7rY-SXg40v8_OzXV9hffMrlRxfXFGngYrvfppEGti6-f_aLO6m8eJ637ktifJPGSntc2F8o5DvN403b42lcXh2-aztoScma38WLm0xY8jzbPpOLS3ZbymcAHuNPMFmKV9tDe_uf2YJzWbpV-wNOhuDfwfILO4dpp26hBU3z6Ny7d_884bASVHkP8YPCO5vfqSbvef_2idVqKxsx1PDSE8dznfJMMzyc9CleB1zFnIRXk7Gks8zrKP1srp0EZaXiQ3La5Y7q87pIGm5HPcJthgy1I86Tu4KahjR64QsMbqMkPNzxyKUqMkIf9ux8VeXHz6Xv80PZi18m_DqXzFzBGCckuEn16O2Nkk2A7VMeTKrKUngeXumnGC_NSG1Z0TUjo51T59b78eLi4-06EDNCUN-RUVnZcu0UlCgMpnYcKXPjqxnmUdFf82otrb0rotTOcpIG4qsFzkCpY2Uc8rF7n6hmchLdyCPlXDurloL9wSPjIJlbWiQ_pFViLEYByRvNTdoZYz61Ow8xQE9UA5UvS_DAjTAxPrplbZuZrHEKPkGBIcpmk6UnWzgKJ9iaQf4avyZW5-0v6nK13-eHgyDdLi6O-_Pi6cBwtl9RZHmZtf1__uMDGYUG5_mwvvUEES1UJNGgwxiO5KGrzf9vDTLsFkTwsniedi_vgqkpeUNYE5C2kCGp97tBgfsHay88KKVaipH75RoTiJNfYtv8-BDwUlXTdn6UlSDt1CMJnze92GKyJynU4kLAMW_xCCKON2DKqe4NPjBu7Vzh5xfN7_J-qfT-GW-fLvwGyV-u5SWBmrZHry63yQfBZ-SU6ai_2qbs7L_gfZJ5PMYkoT--yRsyLyweRq6PXyXYy3rgPCz61t1D_Hu-y5IWVmIS-1pk31gzUtE38kEdy7iuxWz12j7nyGMYcCsi4M6wKKNpZPV9YK1u34Nxw1yFvc2aM-ewRaQCg3Sl52M31eyM9a8N8jCHUnfa7-qKt0sO4PHxsFGdu2u3Z7YsIL3MY6m1u8pRxlSLmi4syVxfw_KtLnr7nKLU2V1XAw9zTnI5BfLzjSYQLKTwBHTVJIjCtY17ulaVGjw5VQ8b2rvMCZQ4-B_SNil5k63li_VISm0p9e8tvH2vWU5wEWB9ddmYoL4ifM3SRXf4HL7KEN4QbqRsdQo1Mo6Y7pabeSpRlbjJq_aT5CZwITSiKTf7DpM1Hantx0A3tqwdUIx3zWQOLPoGau6dTEYVVyqG2vATVHiOssZgrH4pHI9Ql7F1xkBC5hkZsvm8gHigTBJ1zsYKHL5evi4ESJetlRzMA1VOCnTuVLGGoiZ36vH336aVCLuMW2JiD3xAzXDR-m8CBLM0myCOeZzxrMRXm_7_N9x3iuqZojE1ZPT9VLc1ydaGj_0vbXs0fahH-wC6_vQrEgDdenr2Vbyd-l79M36DfRo0uwHAf-9zfXvgdWRizrU-cPmVxeSg4m5QOH0bAqT9Ze3PGRKuMsyigtupcQdzwhySLe4dEa2dAVsqR000O4q7BgtbqJvLr457mpsgt7My_VwGRlqk8uAQl_UOafODAf_QJedwLmaqXnGgALDFkTdwyjRi20KmOS7cj83wbPqMd84qNRB6Upq_ivEuiC6f4wwe79bB5wXCQ6YCbv5uLrIcqj5NPr1wF7i_M08TtbM3UobP7Yk-N_MvxZUpxMH36pkZavYPMC0KPx1g0rP8sOm0mAA6kw19WF-ooagn8tj-85jpJuPd-ErNv-Pusd7Rfwccsr6XkRwGxdENW98p0IeZ0Oc9_X6oB3Uz1mc_KffgbyXeAc8W_xBqKOymgGPhj0frqbXcBVSsf6_dVufHHbBYKgvc0Sy9n_XFD8-jqd7PLSEKjh8ymEibbidChvw4vBUlE9U10mWR1r6Zdf_uhoqLHO3N2mE1T-q4GbLT4OmDPoscgsKote2156y13hQSZXFSL0dCoVJSAvMtF7iB-dPNOS5e1iSjOtL_HV792URYdd1BqbB3w7oprSxZba_zZjEze34OZlFD1prNwuJGVvqgQLxwMpn457GTXwZ4HPXJC0qm16PBIZrPSJflmLyXb2Six19tmTqq2j3cfi2YbmxZckaVRfJXQXjbkStYsM64An24l3d7vfj4LviSLNjGFio0W_-GvjBeqGyYga5HDk-YFfS3jF3dFjX6IZaNtpyonSDAKidwux9O25GZettJTthg1IkC_nCDszjTrqh3AG6shr8Lb3mBIJhwAS6EQ7GeFEPGszozwpVy3CloXPS50hVDmavfKNDrgu5_5sqvtJNCr_be5_9yK64e_7Sz1JFzTPBnwc4GMwtsxOSfytwKZhShQgayJEoxw2RVyaBJXmPBNt1Uoy8SCwVGcsu7t1ChL84d5vnW3fxCHzkkRAPbCESOOn0eOevGVWHQm-1mKguTqW1f-qRKcqw0bV2fwJFKRletWPC0bVMtfEKdF4pS28pThaXFbcj98zyhL83MyVst9HF_ExFIOnmdxMokjpBGBlxcOZxyQ8PXokZDzYfVMh7gD2Dt6OimC3B1n1C-REDvmbWvSxtKnlu9eJfxTkepY5p33LtFScRX2lwk76j1P7vYxMxDm_TChIvBPMO2SZOEj8HqhTZJC1gMYe6BDRa7pa41tZhTRkJRicboteYrSp4ny_Jztzov924umE7Qmd4kzRAu7Hb_cLk0fKdCLid7_lr7j7XNJfVugT7gyzLYp2DfeOp8h_-w8VUuhuEottZePZ7V9ZsTL5KvwOTxuxxJTmcv-v4zdpxOL_p2y78Jo4Ztc00oqmRgYlOoXQfJC_MowmQE8vJnE8bXdmyTs-h1IYpNbOt6ZyqL5GuaiWpjmX2yC12iakc6JrYNhUKokZEzl2tuVrCp4JMCaSaF98pJStumVa5EH8BXChhDOdOu_IW-OUcqy-zGLzxIghyOtq0Qm6pkjNAhwHNbpMI-cPxE25YmbmNEzjFLaxL51T6LMtXQFhKEs6AprvSq2NBpurzSkTGQNTabaXQYG9-mkICZ1BmwqrHnOy0O0hWPCssig1ZRUcczsulDAKJcP3y7Tw8kYMi9waSd1_6hOdIe3sj-fF8DMPJrzLiYKhha3BlEk3TkoX9NQF0GrG7hFZ1ohK3fRQDyjIRI_Ic-UFnAcpdrpuOliP6Wb3tlHcL442lkpQ93w0RhKw7putlExTK9g6O7qUXJYDhXe10pMOTEJ6FX0hInMC9ZNFq0EsGCO5F18ezQPXqgj3O92zsNoujnavFPAE53lRNFkdec1-RZVVHEsoWg5fztGkd_KBWDXUMSKYIEVl4xgEb3ZjX5avq3_-ckrjmdKUabufCFX5HLGtXpDW8LpB3PojvHMnsxP69RXD071BUUhre35STGngRIWeFUoWZYKELdAxRmK8GZgp1bGJggamHgzKxaiYJzQkTBOjP_8kG_lOKoMKQmih4H-mDvcLM1vTwLBhnlajrZ1tOBnZ_ROg7G3sxEy32JOB247tdpp2xSeiAYmDYA63xMrv5zU1yepbP2dxJIMgcFCtcq_Ta_WxXNI0B66mcBrPYhlCL9jU3xq8iIo9wLAmqlKSnZJkarhb00mRZk81pG_3b897G9xGf51_yn5-Opj_08x_dfFi6r7aEP6Hd05pup2X9c7kQE6IWBgzYabLqcTWxFYEKUAS0CsYIkI2pqczo2JzlhfB6poNgbsI7IRt4TqGuZxDV7IH9aDs2j9GoVnfdU0DmKEg3HOQZDavEp-P_PTb-LP4fxgeYbDC3HlIzELZ7-jd0JHSAI-JqX9MblxXO6vHaF4yqd9zStL0bv_XcrfQEX-cC-4_PWXH_-_BP3vwdwSeg0zJz-vGH0Dvws59hLQ3pxf3GyNe_tq6_SiJ155zXX1zKoMd5pNOvfMFyjfjewU86BvlTbTv6fqCazyQnVs0esUgGKg35ViCHuc_SCJ86KFxY4BxSxdR6gZ_pFOuAsNaAZc4-_6-0itcEUUVIJ1ZNqSWK-oUu3nEcNG9fmq9KblX4CZmMcnYVevTxwrFzwv4yw9a1EQ6qoetGByWoYdjb2pNMiBan7BIXETFBaTj1NT902oPQ0MbTXTGZA7rQlC6VzWARcYom-cX8i5D3j4_1mpOKpNbAOFehVlPyB1RkmZ5YCgsBfziBIwNSVz6JnzQg67tFoz-bYI1roD9jFHkf0aGnDsA9BulMWC_3Z7oNg8UD1MkwpjEJfqCmP9_b9kA_GcvNsk0ZAIEctfOoIjP6opzlIX8Adni3BsvTo1Y66ama0hEBxpfS89l379-ct4SHQH5Hn4I8M9ACTPGY6iMjYgT6x6BFkM5QPvBpC0eHUkcQ98rfpk4WnMOxFm0VeSndd_HZN754VlvACijqd5bSH311eE8XzdODSy_5ZORF4YBA9t_LUG_wfI5YqxBUUiJiUMJPQzgpyfmmvjVdy6Kztr9ycl6wzPqmTdfIjInqm9sy7GSkdhsDQ7T-r_B0AMzW3AEOAqkN-g4BA50TW8hn3CmtKOgI983P7EKCPNdAvycvEBs9FS2ZSQyp3RSK-5ao2xgS270Qc2NYitAn4gVsiCGd--Ya7dl5aKsZ7IlHjl7SV3_m6QoyblqzTjYbbV-bfzMjF34kbZkeVJD2bRyaK4FC7pvvL19UfkJqljhE5fBzGfWshfbX_Ajb7q40lGTcaSHwU_DHITS58_kpgbXqWu-ULvsjkVAMOthAONgwgH8x1wDYJZ2QbaJCjT7nz3mhUa99Ll3mHgbZg1y-lpUo_T3tasTvjffUYw0TQUtC8rJAeFCCM8RN1umJKAQ-O0agjZC7eSeH0t2F5gLisQIkME8vQHEprEgbQOB1wSrSxIvB8NswN66dHjnva-tpCFJGNyQ2foCJUngSVaV7qeTdFV-ZHuMVD9IIytP-KtHooihzfsjMhRoJdLGHjqJyApx_HnFg7hoaezEls22MWbBAJERrZYWTsQPtB7ubVfsY2Q4y2XBQwn8nEqr-cQY3aiMnzOdnNjppTh0j6E95H0JXp-tO5bTxct_X0nDvdSO_YJhcj8NlAlMNkbK4iV6zG01fLr-DuRikAYYZ7sMW-928L5O6lAW0diXZ8IvS0PbycqfDqYieWVhrmn1AiT3-hwg6xqPzZMov6OxunJrc7LkpYcJU2fCfEJOO-ktp8epFMndQJTZWiM0kT1KKC6j_swdvbl-L_UHjegX3Jf5ev5TnM4kSIgzAQONmfvl-FqGk_kxuEOPxV53Tu3zwwiDrpm3QhksZrNYgSlju25is9LNASalp9p-2rpLFrkncf3CyOlXiSwnptASqEszvrCLz_gGgwGfDwNqGeCcRTpJe0npNEI_EU8AhBG5hvd73kdYbn0JGxUuvhTtEYeV5wuMM3WYJ2eA4E1hOAVYRVBCa0VTL-qAlrISipzrnDOGXS1WcrkY6x-qcPwFafLue6zy9s0Ij59MXnHO2jLukqFEwa17FaTW5Sb5Ks596VFPeFAz-J7GnuAJl5IPnMKsZ9H4LqPnjz4V1_H3wu1fRODJSEB4K1wTH78vH6QLHyAgzSKimRc8JiNUwQI2uN0lUmxFIZfPY4AiBDR0G6RSb9GHsAY-gaU7Wc8e9FGI0uROXDjOa8-qfANn_-ypTnET3KK8fufTuXgtbmRwkV01g-o0mdl5-zYPAxIsQ6kEpQM2csqrgr7NsqKKuoi4pWU1GejMKIxcEpkzMKWAzpOe24OyYMBgwqmJBcew70bLEZj62JHjAtXhRbJvwOLf_D4h8wGuFrYAa11vsjmuqgCVJWrPvXQ2Ztx124E6ZkV7SUEdV4Z3iJg69Uw1GlIcUHhYf3TtlZ81PSrZvjk0tryT2FpVQfpZ_bsHsi3smxSZkQS3o4iKKm8_CAmH-FB-FIN6uDx_n7V7P3b354vHA003kOMFqfX2QfkV9ejx1znBpJ3Uq4oC4qWkUvk6MwYvGwCwI3_M1V6F0ORqDFd761H4PHni5Yle_1897GKFKNPGsSspsUQYiCSPBdQXVlqltPO_Sfc_vtqqMiaIl7JTB1Si8LmoUSMu5uJqwofIa-yTMpImCRDNQjD28RA7J2QoO60ehqOxUQFEwJD_YzFGn3ZP5tel5EOwQmbbNHU_BGhfLRtp4BDIpbK4unMWt5LmXVLW65oilN800rtRVrPfAWjGgPi8T4Uczm5AckRgpfYnZT_47ezrbECERpBrrW7Of4bVKkY_6SO1DYQH_bZn4nOtf6zz2KA5IvwtL-cQSSSb3KqRhTdeXn_Zz4zu_Ra2HsLRcCVHBOGVvEsBGayhD9sXhsqR_2E5qRs2UXBVD7T3P4_cp1gdWKYWeRKJoZcoDhBNQv-_fptadK1MwrRJ6HU8GgzlW2PjDbgTCWkN_AagA89hUn8sycwoWIo7dkb7GVHEcVKdWFjuPoFDyXph9Zi_413QamuffovaTSZXqTdRBJ_yMfC-by3g4pe4iTPp1TRNgt5J8ofUPbIzGfq2Ikt4L0RmuEonxCzrr6HI_l1FFj1jzVxD6crVXT73iGdu18MnWf2XO8S6fnmt0X_JyW0nBPMDRrEAXTpFRLWiXtH_kU3cA8Z8O-POHVyBFzcqaFT_BtwNUn7YyASm55gxNdGZ66U27umgqzuhBdvLJjvky5uWUqzEK14G0OnWpn2Ysn4Bw-5eaIqTA7hfuz6lSa1dPpEOHLVJhDptpZeHEEzlZxmWWn4iw_FecKL26zsjik1eFSulNu7maXHwaWp8uUm1OEvVmYNQ_XiyhIz3cwbEPyy4bmzoOSBGcigSDBDlQXP2eeOVQjvQ-HIAyWIoKSUYMAWgJm_0xDngjvYOzp-wI2vF3HJpP84lznAo-7SnXwa6wqrnoXUz4PFJxD2orxqHP_KlBlpnKGVoe4Pi9BzdZBMIlOx3nabBaqzRyc6eKnyiwQrcPikVhtdaVBDdJ8SbLsYsfwUjnpnMcUtSfqyFPTsMlr4eujtV8qZDcLAEl4dH3M66xNebTLJDiwQXRwG2TtlFk86KQrwxrU8bWd8_Mxc5qa9zXGAO-ZllqX0jFWoN12UJtE0Ne3SfRqVzNN_Z9YFKWxRUdxxe7YbKsRKyt__kW-XZ1JTDnYZNpQe3fquf1n4_jV9_MxDrs1mHdjaKTGUVbTFflbFtEvF93fY74BGCkBgGjrwpZRp-Rgio8lA1h-5Oi1O2VlLlf3ZycmAy8jId02q9HhKWVF9O-F09D7jH-RFF_v19-LvopY8LrHENynPVU_QO5-g3t9nVmPOkB79FWgHWDjh15akURBSw8wUfUVoO4qhy2nV9rZQJIB3muYVwSpvUTGz6CIvRN6amz-mGJ23Kd4QeSeLEgNEcAqTP-gurcq7ip8Ij_Q_ntHq5TY5FgWNjWG3BQjFfTET4Ywhaw9942lj0oeNA-OkOxh3AJqZZyByccMiqGdzZuLiMDUTLfO4DMLpJCNz8Wwndtelzj7-pEvMOkaXvSg6TK89eKUzIHZxj2ET-iJdBPVwA-lEUz0YMDQkBDeOa5mNQ_kukelxUuE-nEQt7dwrKznpmu3GMUm0N597tvspYMurSmbJFV2GIejZw-EAB1j3ydwWthQyaooxYvuyJiSnRMwjcBc0sKNHZ51mC4UeGQVRd9dfHlF4yJ4-TsHpn70qNZNS9aMFpLIz3Pc7rvI7-nnzl3MM33_2LzSmSTch6XEOwjJ-jbe_XfTcGCd7Ru_GzgMLjO-f9y-mf6u15Iv9YdHhXsqVFmY9odG6NcxaVklXCHZx3f_LwgPHl5cXuWvb27v7h8eC0_F51K5Uq291Buv8XFT--3uvPn7V3vR9ft_whAP_15ejb8bsgI1j6w-fa2WtAQYAkHzaMgGXYBsmDYsFdMoOvg8gxbOGrMzfyrp5jX9O6bumiWYx_y16bVXPsn508nGAAwX58RQAMmDG2psc15sdZ9EGljNqfnr8UaHlnFM1pj7F-5yI_RlhEo5CfCYnRTo_LGSbn8AasMqEzci9cNT31OkvVp8ytmlxRNMT3I-0hSoKyxQ9dM4MOAFwAKyhkc6W_cN5ueaVv56sFlvJi7a_1Mmymmax7l3EiEaCNlnF5kZ0vsNGzv39uXpOLh-uoQyAArfZ8fdLhIoiOw3RNS5ty_xFEDiwvn4aMUQeCxIeqD9yet5X7cvwv9pij7uKG_Nswg3NCWRSsryhrzq307ZZcbHEaAaZndST-V9nOk_84RYg0lgiXGhccCNLSbuPq_vZqvdJcdM2o66MtfWaNyN5AezFZPmvnDof9x-wMm-g9E2-D-g_SCnMF-MfA7tNnOOBlGR-rOPrc8K8zVDIaPRc5eznnIUQzKME4C-vS9GA_UxcteOcFQlDOxFfkvzHWeRM6alCZlU6PUO5xgHOTuqagKc0dSnwsTsrt5Qs8mk4KaRY4hZQU64oZdwjiS_ncWlA-l-P87dhBPAcG4Gduo26y8GIXWW3M_bRdcGZ988ACl1F6bfTcfzA4u14mU0xk8ElNCjsBhTyE5jPpQg9-pWfWGO0hujRnto4j_cQPe_O7-4YiGzUG1_qzKW_6pn93OJy_swIYGHkIZ94MEC52r1I_yhsHSd_2OqP9-rx7Rme4worSfr4OpayvFoN7pRCv-Jm3f6XflW4s2ebEnfmUeP6OAXnYebrVSQHCJOoG2j75n1x8nIhE6unILtw6c-xmY7qs1hSXyLrBJxmm9bke8gjY5x5wxxRGqzlYriEcRnzkeBaMtkSc-rjGGDmhdUoMBcCAeFKcvVcJClfzt1LXOpsD-yzEnGG-0ql9CEz9HU42WPdGXuNinWXDKMCCEGA5PlotFwHg33ekPfmqfjcZTTDtAukYFXgONoFELT_GgDTftRKBYXh5cjipbM2HHdg5-psZ3MtLKXewSyeg2njv48NUR2FyzLBkCOyHYapwrthJ4o4wdORs3fuWKE9XwaJzsdu7Nb3xSBhPQWcmjlUK5CzOf3xWwXLTSBTohfGClCg4fcjVIjss85xHcPH6BCzFIwEZARFee1pW7KuxZGD6IJj99PTGPiDZd6XB8CTXpbIVxmVYNUkut0SXx8eUZGMTvT3Y8Z1xQ_7W0D4mKw8UsVbWQmTAk_-5NWEIAimkQ80BzymlrhlK4oxwV9DCn6-xU3YBthErpvXFiQrYdrUzooxLnA-lpecyim9HiY1xz9VUDQUrt_Krd8D3gFgW1SsAtjoFUhwfYRqelB-UWy6CvtFo6IwuFjJPKuFjXUsSj92ZFZ0Hl5f_ZL-E1r4gJQwRd79i71XTqg0XEaeL04U2rmBUBVzSNGYYObwJvE6Z1UqWiPZhNU6VesbI8D7LIqcT5kCQj17aCqZn2MU6l3Ldz2WtRtZgwkPszdtyV92zI11psH4QNJhKq9zvmglcm5XZ1uJNyIrB8a64IfjM60ZppsKHUX9gNf0FpLzA-_O1bl-xA8OU4-PhWbTzV8CJakJCjgn3RnGA_PM9pTWsIJDGhTm-Xw5d7jNwAf4z1-rl8lceL9Pm9b25Wnte8TcbAcUkHp2NDqVAkndpXpeyp-3sUw-v3teYdZwHzycuuLYZzNA9bMGpydWS_W57YW1lsvK5LWqWuUHTHb9YVgA60vAFqFX6iW7rH22i59XSbJlbUlqTh8BimGJgbJbofjWGUYkqEWjVwJAOtt1clcwU8L5ULpa9uJ0Z-Lyt7GYr2wO4DV9T93pPSjX78o8j7_yyxova2twLQKJXJtLaMTH_GHBWrtXlzdlVqCaItxlvso_iE4aX2-7EManS5v6zaGtfIceGcV9eGpKtOqtziyytZy9xFowwR9IHkAp69yE8N26v1vT0ttErz-GD8Ub8Bw_rvYmSV-38nCAz4i4UaL1YL_4matfxvaR0pWNcaQ-UY7Im934T47g2i2rqa_zymEPYzk_DEku24Xat-wS7tQnCNKu4ERgOAUgIW0qT3FBTndPNxKhRIqKnTK8ocgRR5y6HcWLcLLsw7YU4zJcEI2FEWFAjX5bEQRIZ5OH34l4xm8RAZaFTkqQIIh17O6PYkqfRF_ymfYRfFG89RxPS9V3ix1QGCz-aOwtUje4D9zcj-avXMS-qAzE5nfNtO2S67L92nCE9coh0TuZOFEe8zGlXdyhtgo0b1bXt1mxZQ14dkE4Z1aNXzH3OB52V2T18naajXiAYISsphn12ir2JY80W_EHucdR-_K3GS25XHSNUyOOja9rC3flDFIIzbOynb0YoGSe3NkEGEeZ8Vwlz6fMtx3lTaxRCt-pFZK9v6qiqtYXeIaVzFrv0jar_YC26eGB9Kujt6gF93ZwYObQMsB0Akhp34Z7A1tohdrl7uCCP6ybzHTOatQZwKjP32JVPB-ABgEBz8oPfCeKImf_76bj8f2fPx0IKQt4l_t8I92Cdtd4ijwgWeu37fr-gOAmhM0-myW9TZtqxVL6AZYOtEzbCOxVg1B8iAe6NPUsbfiDLu759kG433Naj2cureup29662G9rJFNgvORE7awaK8V_8jrBp113bDIB4HlAPwnerD81KoAQHvO1N1zVo9G0FU4yhU3copplEylImpBDTOgrqqtoE3ss_PJSZYt15EE0yijBvMvy-ESd6OVKWGvVuuREYjtsQsYq8KZJjXdxOPSgv4-cM1QoN1w2nk1BVXdFpg31bYxvOcm2HxGdPJIsD9gfsjSH9Sfv8Bf0LWJ5Av7hZyu6nxKPSQf5-VSkwvOO-j-2w12yjHfetzE9WJOr-0z3NkyDRCCbJagHm2C9CtFVcuAeSXWwyLP5rFBZBoJ4YEvnrcPft29HuF6K7qQ78P0rOp06hHydtJNyWyejAS24BGqvz15gN0Ujeb6R-IB6rjA1o_Hs2uN1dWqAY8Ta8EykVhyWaB5Y7aJpoXdYHjkVCS12F7ThTCfVDSHdEq2ZLWpwikz7UhgxMaPZOToOWtsSOL9mNVuZTQLDKDtqkc3xdm0XQXm8ULJsWOsH-KEO5R18ZthtGMZ-aDyCjvQc73pOGbuiepyIrdoj9eOidIiqpJAxFJP8ajdMxpYrDaoan0nYq8XA4bwxJ4SrZbU13y0q9CaEpxvh1TF8XQfeIUnaqy2emr0TGEEB5rcQ4ahOpdAu-s1oG1mkaaQsi-oA0eodgrO3Mq0T5RURntx4EHYNEhercDgzZWsp5QZNgrCOdBQi5ArrAHVreJ07_iiVBSo7W5tVrYqZGtnei_ejfR_PU45G6O6V4JnhZ5QqD5u6pQdZ0toTuB1tIHaiMvY1CIF4EOAFvoXwwB0x5pZfSyOx9tIV4NkErmIFWclKdjO0jgsLAiqLWU271cXV96QdZO8G4wDF5GTWI9LikvVICt-zAuPJCBNYVYwt4GtXVzfAXk0-Q5eGTxOtP4xauURAZkYmU-9j8l-HmVdYlPyjUgR-lZ9OLnB-AncY5xNrI9P10I1MTiFc5cqdiy7tkc_N-QifQUmqTvh8nbTPh1imFTexW3e1-4oAwyke4UzgWXZCw023B3Yc-WoignGIy1HoSMI8dVcwuQh3QB6wlR7RUtoW0PWytsrn7GoCHiiyIDNnCo91doMgvmcBxNpCwB24PekpMgJbRcq2n7Qka2TR4raKydHvDdQULWQVT1P5PIIOf49j1Cwk2JxWWVleOL0oDGCBOtVvuWAt5362nexqdpBwzolSZcgdnvYjMJASmCzPOgYpIZR-dLVyjAHU90-KbOgXAfYUDNm6Iwsw-Y8N6Uvgp2PaQEbGy59JNBpoB0J3Hf5XKR6SQR4bMdtHDpcLR0LcL5xP3i215ngRQ71COY4n-7__S_T34ktxO7XcNmpP3fFogrw4v4XZVLXFRIRrBWzpqZW7GDVhgHl-8A8ciyIoy6fwH_emUdtT4YoyCjo1bWYCZLUgAA49JfrH4BB2_zt7NdIPz3qDHCqQbORDtOG059bsA5SZFGc6CIAJdoHyaF3JO3WORHvPDgpW8ql1qIdDolt2kGFDT0gP5wG2mEGwm9Vw4mmscnWyqOZ6sn6EKMmcPnUPkzYNKyiFZSLx1HeJ4l_aFkbzj5NedBGY_4cWj4iwvlWHFCp9HNlZM_TkLlwySDKfauWB1o14GfAKDEqaPVSSqsB2k8gFWimW80kdRHpORFCue0J8SFnzIo85tl7GHKSpaA6DDUUmyrGDigpJqEaR3Q0bpB1w3IiVA5PiaYemslR3kjp1wZiPZFwg1cV0HDoUar0qBcTtVxZcorHn36TQfeoOaGiqBb89FgcpxMQE6wwbrBpWr3GVl_EuLrbZAWtomnnl-v2dZ8SHKPzrVfd2wbhIJavnET46NZK3SA2LRzkRQ4bGupf-F7W5Z3XuAO7z2UtCl7tVSwGhpH-KdXI-U3BDsy69UFS9YbbEjeZAqxU6v5lU5Xu27s5J_y8JbD44gb_hYyfpDSbwrqWPpaqLH0hI8AB8JzPBTPkh1QZH1PPLy8LKYlEY6BrX0DZZ-9QWNdWdUb1a3Ca1DbWtOZQ2MMXHAG0_SYT1xQthNjnBggWG7sq3Odkw8rCkoVo6vT-Kb_BsMotFsicugEYRDkEJqHq1Qj1DBAVMVfo9JwOX2-xmL9bQXu7YAySoGLnVqug6BaW_jpmIEw0aDOS0EuMHB3ASg6zrHxkgtHmx3G-mhOS4RRkuDfyhlxDnfPeGjK6de5picAEbaOWH6IsY3SZ54jwFe7ne4yx5vM31ibt-UahzD5j6J93Iy2nOmwmk7rmF5PCNFEK5Ifw5I0g_yPqNJpuh_UsyLJx4gTRIL7NLrJILk29DFE_QXrPpO7nCyxOQNMQAEYXgRkAg29ey1A1s0JgZlnB4YKNdKQ6ZIQx2lxAMmxGmhDf9nokJfJZiQHWEP1QaFSqmUTgH7a2nNQQPkO2wN0jye4qnGvVejjwQ6tzMjnZrmrISoyg2lskQ2euVpVSoqhyOlIEjsw9IPnWkuOomfPAinzwg1yJAMABm8vm9IqOSIssaCj7FS1Dzea6pAtLnU1-FKbKxzqkBujNepI5MIYyV8YMObaMLIVJOL4jRs4hyHIz-bCmy0pDlVCGBd07jcqz6tvR3Xb_G8A555QEVThkCs3oGm-GTaFEDQohpL4HNkFn03PkOjecHmCrjUh51bO4gp1laW-Giif3BdKxHW9akCgQn2VXctRpkbWjQ7xMTKExWLT1rUTuVynjuaDfAtocTplXuyRqUuiaLA5s8T3VOhIpRbCAKgMbPgYHHfaa4wIx1-BvqxzwOggdw7dasrfo1J1jGWXu7W0b54PDcP6G6gsqt-mDp50-EpJgQAyiIIlw5WSQio3x7I8eAPaVEoAu5qGH0x9jwLolm2kKEw1cR4p-Xe2AxdQW4IUv2PAXXvVf8Ab4xojhHbXAFiq5bxdRCUrv9TOY0vKPrr-MFwLXXNOhdSEuhGo4HQjKsZda6v3k0yod_JE0YlEbPaJKOEDHWXMEynFzRNk-ET2je-LNX02e6T1s1dzFcQtCjOUQc1asmQ_xbAYqugPxj65sZ635yqGGyYhfVIDIJo67MWgfbLsDQS-nVUoc8pmqmH_rqEp-xDFbtayzUwtAXtXH8S-X-jx9v9BD--p6ZY6SHdA5B-gYMk7IQGHOfoVMB17bWfb7Z6lfh_TdRd4CRWycY-kqD_eYEvPeakrfMnPNsycHl5URML1fmA0ZYI2FQB4mARw7_cpKaL_DYzY01VpIvKzlITkFI9a8sU20OuFD3JimrmJeLjANRKUqk8VPd-zWA5zsZgEowj7AAzWehYDIY8i2jJIA4CfnVlldsYXUoSAjAbSCW4wcoJIutISAclCHfW063PoQfM1TxQAzaUPN9Fnx486od_N-_VKJi33WLCcbkoxUROTM0tkiNGlGWwanpW06TJzQLjifO1u1__34vJaWLuGhkwytL223vuqqmTtlI2RuzWuVW8joyK2ce_OVZszjlJTAj3Wk89-HPv3jFZGm7zrObI5k_5tS4KZyPde_SYQ9_hvnZHu9weJJfrjt--G3A0z5aV7qrIONX-3jkzEHAHYQi3_aMwwJ5sPHp7zThU0jlb68Sjl5-99_sXaZU_92C45Z7lN1q0_8iHXpTTcrFa9n-uQ2en2UKW_Bpmz151-Q3lLj60csLMl3FdTyFe4Nb3jttnBI3RYAB1ldb4HG5vpmqBP7L5RB-W0iz7MfcZWgA75pTVJlJjVXV-EaZ0svvXBcpClzV6tcSflHLRlU7ixSnlPsOrYYHAb46Ba_zhyTRKmPIhk4WnW_vdWMIcnIgEkhCGagEXKKFcnSw14HC9yFrRtmjxaO9prD1qlP4gg60ERH-cVppf2gXFRsvSA7WTXjBBvp6yEcoOcSp3QDeMgoN27f-Axj12WBYt4Tz1SPmFWc4lhJDSua5PeM8DkGm4Q8MzByl4U47Z5lyYLfx9194UxMbyvm1J1cnGfHhvscyWM3fFlPNT__eH-GFx0foDyFDfo_OwYsdqhsLn3oTvihJp4S_6Cq4kg_PZ0Pq8Y3erWOQuBCHQlg_xM-rSd7IMCLrjh2-w9Dvfz8w9e5CE-XgzkETRadB_WfIBzceXLVFBt4XrrNpd3QBrv-3PxqWCVPs6Ghp5iE_l-p9a79l2WpRfSbrBk-RXl6ejA_uJZ_Pfzsf-_Vedg5pXo54tp1zBTWofrLzMz9o67dvvWZBxE1n0e_S-2CEhvQVltbfgwCqOOGc1l_UHVSOMkFSHSx_T9sjSb8ph_5Mfc7F3Cqu9k7311f8tMPmNtupcz7w8OdNzC7Sjrj6giK6sDN-XubA4WMwa9LdeHRtNZPnlllYete_aKE8nlADZCoR9O8kqniMQpDEQyDlUxd0iXVr4m36n29A11OwRO8nHxQNQbHrDqfrNvRV7YeMzWiAIfyYymjzo79UbfrRSErtK5jAXHYXKqZHs31cRMmhP199mpFs2N0YADWlI31yT4aKLl73nN9z4Tg9MkIZdS5jOGJZXnsbx47tQftXCe33ok1usmaE9Eyzn_0VAMYU3-M0UbDnUlmB965Y2cBFkN8O48PH824IHkOJH8U-VPOIUrV0tZmK6XnugOX6DgbB2Wjw4EnrYJ_6TL5uwGST8phDcuVRAlioeOxRNT7wBlTrU4gueUyHs7ppKAQ_mQdXynTqdQuzZ8pq6dpUHzi8WJMV1Y1ixUXH0OeLaHFuZoKFKIgjx_BnxruSwVOoKwzrDp3cqtjfwY-ODJT4MKQwyCKy7EKVpX8M4wad5U-7WJb_HHX2poB5ipJsEUmE6mDglX7pyc8yvtKxE4O00EwQaqDXjxA8tUT6EEcH1C41D6uMtJeleEsn12g8Um8EUWE08FWoIlQSovhjKedrjo3cqmjy39vJPsmvrobW7fT4Cy2H5Dh_xdfLU6Pf-ACQcInRyO3rROvBeFMaBCXE-y4HZd1VNoU66tt5Kol-GvR4TDlld3CE2kWnL_C07WeUA3i3dUmW_lzOX_pspNgrMQK_2FGiMKnpyebqLTeBzAkvyRL6xwJEIeAeK5tgUkDe-XDF2-uEwBCAJsbBlP76wD6mqQN0FGeEedomTKemSHG676mPNohvLyPyTo-D91vwlt4p2-PcOioRFsgJm_bId9GSP-I6Bcv95dCswPG24OBfqxHowywS2iGxrgQhaLZGP6ydFHesheGcyQuNnC8aVe_f7tIcXz5Ncrk8EkVr4fe4sro9KHUz0K6WTYJOqg6kq14VicEMeDPrmPlqrcvmM4yFgT5Uv7EQ9eW6brSpFjuQbOeRpCj2Yhj-Lb0lsNwndXhUt_Ud_hle0eblNWftyWrwTgKB9jp_TqptSQJqnFg-F52q2F6r9-_weCaY4xJtYpShBor66B8z7GZQP8SUO3XikM848gELblaTOwCfBbCoBmty1MPwUb-kZ3LodkbDudf6yoZi6tUDipT2FAynKoMN935rBWaJWj3Iuh7EGSozkYltCfQ6uhWpgnzGGtQL8Q9YFDaJQY3K04hTbWBktzRYB5rxmUVgvmneFO-guim8QLKfipkwhCf4YIGre47h-JrXo5jf_k0wcT25REcE6SjvgO-rLpVxCuirmKRU_Gex6AbrUmhWu5B3nyn2b7xXpVA8NA46SFjmGlEatdyUsEpRVfNNkfkzMLM6yeYBu2ZG1twtzAhm5vUp9kXTmjfb41_ItaJYUfOKPghMcBPeynb23myBUimSUh9s_zQJp4tvsfP2k8VLeBuE3OPXgOrdm3tJsfRlA-kLbobS8AxA3UX5_p9NGvrOymnl3reQotwFvUFzl4WsGpx8nDgnyb3BtqhQRkv1CItksjRvX6G4CveUKNg5MsbPWPkOu6B20U2Nfk8s85RrTobU3T5DHmN-vBTuk8bFOLKvm5euPhfkFIK0x4y2mvaFiCX41hLteeqfr1fJywRtPHQErGnFGNnZghKG0_c3S3gze_prgAaJfDzIDkBPXsWupgoz9plhsLh3xA7BHLx9SUC2cFCHs8hw-n7GIuAvxREBmKgT7ND20zV3jZuGYTzdXPxVHCPvaqHUvMouUyorLasx7PDD1fH2ef6_B2eFwpaYApP5SjG7YFMf0LYMYY7uJKA0X856rciHgPHZffCqj_iCJr-sB5PJhjq_hqbecqGa5InxVwbGsw7tMxA-kNtVLVkaRkPZ6TVOTpkkVeyWngYUMr8MFDh5MktK5KbcptGYRP5FSahIpGgQyMxoI2jZnx_oP1MP25YkkllyAmK7xZKbfs2U2QCyrS0G9I1l0gyYvbKT5XeqRSyO4wct0NucFUYjfe6Hnb30kMSEFyLpvFM8iTSLTbwQ0m1wJFU_CjZmrchc-xwk0thCogJwCR4gJazVfIHULiclNbjB7_s0fJxu929hWQv5ZIKtuSI3EKIwY6F5R_WN63WhCHU0ZULOlb8kijXVt1G3pUo3Acj98jmC6HypCN8hz5mmq5iUZPyj_bjFWcpt-5V0CfOrO_pQuGJWTv25rW8w74YbAvn1zTlG3hosC553addRfgclz3I1U1LbpmgTCExJhijxMfW4MYCh_RndsaqXRO2ZKFjgarLhpDMjaFlsNSGk-aPGct-Y85lAv0JPG-TkKHflOYuOwaPckCjV67vkBTdPG8V1hrtwF0g_zCLXC-ZP0_b01GpGb3UTpXVOFjZLoF9hAOxwbNLtvlFAYPzSYIyQaa4AuiRDxcT_3lJJO9em9KdR_VyCNPqh8u5l412ks4X3Y6ZqfEyVnLiRU1O7tEJ6GcYGEOKAc60kzpC7INZ3NT41MwV8CPJexqKfFtBkSu9IoebPCZiAcsra2gPpF6UAC9VZFewXUV0V1dXISDXJevRWpDdw-iARNw4Sz2YoBcAtcof11CzTCn0mDzbz5zpJnET3aHAaur0Q5xip5BTHmWYGrtLHtAlZnA00is1r9DJjShphtQwnlvQcfUyyicrBeNDaln2KnNsJubYTzpyWKTRYPEisQlMfTHOqW37aacqvkx9dfReAobtXUSfeuQ_5ddwipH9gXJwkdVTbNj75JfwXGcgQ6iaioyVlLcgQKAk7wx-g9rn4TeE4XZk-QY19N0p1NQLy3NmECjtVfTuVw5bUkpDeav9Zbbn76DYQWKODLrPZ_agdsin1qD-TTqaA3xamHD1DH2qqqMM3gT71zoeykgk8866j6Qo53xyAYK5UZv3L8iw-8jBYyb9--fyTwx0HAy_y_4Z0Rs66GXtP65bPZHTgz_KnEyse9jdkDxZ1myTpPUVbyBdIABF6Mhs9xyefDo5bq1Bmf2H4dklv5YTk61TqLI5CsFjA-J0iLDQ3OeQstiaaSr8HO2Wb6J07YsDdLYxQZv5h2d2nLBOo9C_jhz9na2UXMOZdMc1rq6h-duorHBHCKuiltJYjhgJn68f4XjTSljZEZcoMEitNgI_HuP1FZ_RwagIC0kM288GbuV9II4fJtVlt1dLrOFDbue3ovr_aifm-zZTDXOwaHco4-feXRZhqOY4i1BTXCk3MY79EPTpfPa3nygSbb3Fpx9_uSwk08Wt4o2ozDE8ay_JIs1JiVaCAVMuEWAUpXfeuFQKPNjGeK1WBNu5RSYS4S6oIDBifBkPWvDCa2zXv6epoWMAwXEiIQORACowj4ypWp43-ihG-VI54zpNsfHaMqlWy3YH03KrAzrwULkBJuw8yBIP7_3zBnia_VzZG3qGGHgIV6OTqEe38_qQBHUynFND1bCOEB1DTIIqX8UeIb_D73blD_MLJ7Xdc0OU1sMQXt3NL1arBdnLxUyZY9hgtVB5KBXE0Q_MJAgftghMNWwsIhkQ5wJLIwiOuARBqa98l4t-aTDbxmerO9_PhPeQwUAqDnn19rI8ckXHmRTcC6we84M85qQaYi0JOS10VemWGTgSjrT5bG7ed1GcepAy2o6i5LQrZxgY9azusaJfYzaOyP98v2i4GkJSDsOdes0PR95Hg9paKfCneXrBZ-onFlaRDZIxk60R302s4FD31MrI7t7V-MJ4xUqCyMS6OOB_CoO0cI57w_TFkQNEKTNNMt2P9rLkk-PxcUZkGC9fE9e26hLSodfLme-FI-IYLXa2mND8PQvkavzkZG3p6oWIVgRDTfOgHwjyiUh_9DGu4uEhjiCPS5TS-zlCXhKQA0tQu3iussKlwPDVKqipkSlua_0hUsm-wSG8cHR9ePMu9X4FCCd6IZC1KqcdaYJz0OFZtIXMX4qOsMwGZfJn17Pmu7AuteuRaSdTJcD1SEExZzdShq0tLk1oAPGouGvL4lclDXPEC1WuL_TLfzdMzHy2SgW7HS4WDGGQPumLQkTtvsiszejqBoaT7OGnFnv4vdlpHKKaDxbwW0mT2WHwMX7idzRF75KCrpuvQrSFzgXSgT0ontUHrpPxAGpRWh8EwooSpBunDeVlKxvnPwAGzCFbJCGvSgny0Av5XVDvGbnsMqPmifImTo8NZ4F6nxheglhHwdVYaY8sLwSXPHFc67bILqdwDpt9IAk47AV6Ojg3yGZ3pXygTaLbuF1B0qJBsXl3Ver1uMBup2snawprY5ekKfHPpkWciXk06IhtOKTharWRgVjiHhBjD4Zj4seC4OTgiiFW2I55g9zMDS1Bnb3dPhrAqHf7GM7G8fKJ_W4h7_U7nCpScEFa_9GsIQA9zYWdMXYxxPMP7__FCyEOhwgaLbXBpmicyahqg95t6xmlXeu5coXFqCrZrJ5kroLIwuAozU_HsZUM8pHh2-9LfxMog53jKU3nKFF0C-lIXELkoiJLPAPFf6nqCtahriiaWTVhLff5Z_WLeTTOv2RZ1uL0zl4fwdmHlRXx7TbAooesG6rFlSbkWKquTXmZaCRlmVsMRxLrdE-GMFvFpFKlO3eVenz7RW3glI2dhf5e1RVZn6Rl0558xdGUUNLXwnuPUELzS0cjVBy2llbykx2OjcjHmLb_YmpBiv4gHb11G8x0zMptlVvIRJXCaIYPZrR1PDJnzSYE29gitG0Io6r7vI5iMp5O8ZqPHUc6wBHV8nemO9wEjL6vguocQSpyL6TT_yJMYP8bwudNTaOAc-AJzL7dNnGmUhRhQ82F4uxUVfSd0OEupYKNogv78ssDY0Hau1KhvbpF8wuitrDMEUGF6rAZTh_-utuJvQ-fccw9sgQFNTqEaMVjVJnBFcphUQY5airsEpFAahV34erYCAZfwg2jc5u6skQKNCr5buaM3laaUuZSgO1wQnwGTXksCNeLcWyAY734DSVZaiLpBQ2I2qx2rIS6K4KV-Isulb-ejqN236p0ARJp-J2cG2ZOLaU0949MfaEOZuhURTJ3UlU8VtJzIxow9aY4VJRUzFDjN3V0jPKZg-ND53YysKp6SNlVFzFJDmaM-MvrhMzpB5KDGZewQRwuLUIaumOTuarLRnJuTAaZT-jKvueBwOjMVnK4X-A1pZt1S1Hfs1Kd49bOSSsc8onrsZAoJhSnIdc7FRynE51HUkWc4wfcR4lPNCXt-M2QavgOffDHeemMe3nCUND-hqzGWbSY_XY9m5THvwXpEkYbxdsvR_56BLIDoykdJYUWVHzEnxj6PxvAh5n2eU13Cb8GnA4WbD3pYU9ExLJEsUTXdOOgS-5X9V9Wnvwpi9VPf-yAvFz1Rkdv_nQe2lf7r00kA8c-QxncV2xPmcK9QkwVnRub-INIxiZ77eeUhvUm5hXCp51vFkTJBLpgKTlrNu-wDREXc7KCdZI5KAqBnRYwvdPy6MjCGrUEqYVfRSPCQbhe5sz5ZBKp2ZYl0ZoGk9CDbKI0H-7s8eT0CclUPRnlEh32VuujjGUAHrxLJ0VUoGQSpUguM0VvGYaX4J_oVXiPNd9xSt1pRExLhFFAy2-F1Nu9cuKkXcrj5urn4UDTDxBDPZOvhZuFOAHNdWl7U09AfOfN_d1Jur_D0RqWjfx4K22dkn6Q27HIdaEV2tDck0FhG4GN0c3z8zPlby4zTZaD21_ay9MXLpg6WYfGdFi_Rd-2m9AVP0JZEGDgbU6eXiIC6DHidQocQinVaxac79CYkpQalMnoC3otw1rnmElMfa-8MNoBmEtZ5mZjdcg2An3on8_YOB6zoAuJgleacORQFBFoH35ih1owuLhGAzHgFS6cDSKFKX_bn9q8Hjc8T5_-7V1q61rGBQgQyJhE8jdXp7LEbGBkApjAEsckcITz-U8TAFhFTp9g06dycUwGitCNaF7vqKnhHKv6QYUfQWSpxV0qQgDhb4an9zblSskVt3jgu2lWOE4VKaQr04MaJuPKKCWy2HPfILDgsyZhGtxPVCeW7i6olZaikmOrR1_bsFVziNptZTFi23gyQ8QBPgcQ9UabZYL8RG4TEb4oinDfkEIP8ADRuT5BT5wfUsc2BqD7IZ0e3ruEwwPKMl5RQn8rtnHOg4WHLreD7NDmRjlmarQ0giKwUgRLaSt7aqm1wcHp7DF9WvPnCfP2-neQiOpS-XUVCqlsdCpbBmjUbmZvG9uG8yYITq8I-nR6CP3W5R-9jM8_dpcDCHJI1Td2HXzND0SmPZwPZZy5zdqRNLvHAmVK1GbjN3yrx-qLhLxtAN_0TCt7IAxNriYiMksZJljYzDBEvMZs5raMqY1PrQ9CgXHTHWjYmbi9nriZebIGz_qHyUNJ8em9Oeav5KfbY341pxrXncQVue61l9IMJ6mVCakS75rLLEwNNh1RSuo53h6iKjomhG-fVgcJBkOR-KpMZPxeUu8ejWjlgdA4k6cwlJK1RVWgFnTiv1NKlCOLZqhrqCofSOCgGfIasjJLFzgVQ657fNhJd4b2jnt0VEv6bXuS4bGTOoEuvQ5rDe1rM2yJ0rCqG2JKMMa4dGVYadug5GDseFPkGHKPy22JVOVTHWU40Bhrkt0w0mExqxOGv_RxpRVhZA5QJI1OJccskXJc6SOAhivAaGlrsT_EwVqblQXRn7W-VlKa3LbkcNOEb58umfU4j2PPuNdRuEq81UMr6P7ulmzKOxt4zv8UZKsIMS1_qLU__hn_qjPjKOO5Y7kkJMlll00jEGv0vP4Go8vNCYInMHXSi4YF2eBy6otCKtHD4FR0siJYCYPi05h4Tf7nHBhEW0bECdvoUclw_AIUvzySJY-hj4t4WqpENptCuZknxZHbupnEizfheSIj7yGyZcnVmVPCkRpFhhGrHuOuHpEh8b9bGVjCPae9PdedAlrzTTiSg2uAfXkxtVZrQmrrDKphrhnH2YPM5LKsJq3_VO1iJ7z8jdMUvw8p4GsHF59WPraLIWT9IBI6gvbO4ZawQOKMPj2k3d9QZUXhuyJZChRJHFUG4oR5wRmVKYYAb7eJBhyAIbdqUS7HbDiojLC7hVQ2-fLckKBvKz2iiaDIRSgvKZdasA4ycc4HZUB14i6LeA1aEzXCrkazEw8cZAuqE_cCZRI-S9fJuQEnFb5KN0nYJQGYqHMUYLiUGtg-RaWJVwDPwsfkM9l_bBtnq6Rl0ywvGJdHx8d3AzZLejMr6IUVR2TYfERZrB9wUOP6nIy5ivWrSdvt2WpUsDVRan15PYiLHl-bDGj_yj8A"
    },
    debug: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,E,I,A,x,N,O,C,$,j,M=\"@info\",_=\"@consent\",U=\"_tail:\",F=U+\"state\",q=U+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eE=e=>e instanceof Map,eI=e=>e instanceof Set,eA=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,e$=e=>e?.filter(ee),ej=(e,t,r,n)=>null==e?[]:!t&&ev(e)?e$(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):ej(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),eM=(e,t)=>t&&!ev(e)?[...e]:e,e_=(e,t,r,n)=>ej(e,t,r,n),eU=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?ej(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(ej(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(e_(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...e_(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(eU(e,t,r,n,a,i)),eR=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of ej(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of e_(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>eM(ej(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eE(e)?e=>e:eI(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eI(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eE(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tE=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tI=(e,t,r)=>null==e?G:ev(t)?null==(t=t[0])?G:t+\" \"+tI(e,t,r):null==t?G:1===t?e:r??e+\"s\",tA=!0,tx=(e,t,r)=>r?(tA&&tu(r,\"\\x1b[\",t,\"m\"),ev(e)?tu(r,...e):tu(r,e),tA&&tu(r,\"\\x1b[m\"),r):tx(e,t,[]).join(\"\"),tN=(e,t=\"'\")=>null==e?G:t+e+t,tO=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tC=(e,t,r)=>null==e?G:eS(t)?tE(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tE(eF(e,e=>!1===e?G:e),t??\"\"),t$=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eA(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eA(o/l+100*s/o),readTime:eA(o/238*6e4),boundaries:f}},tj=e=>(e=Math.log2(e))===(0|e),tM=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tj(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tj(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tE(eF(eh(e),e=>tN(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},t_=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tU=Symbol(),tF=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tq=(e,t=!0,r)=>null==e?G:tW(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:tP(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),tP=(e,t,r=!0)=>tR(e,\"&\",t,r),tR=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tF(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tU]=a),i},tz=(e,t)=>t&&null!=e?t.test(e):G,tD=(e,t,r)=>tW(e,t,r,!0),tW=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tW(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tB=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tJ=/\\z./g,tV=(e,t)=>(t=tC(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tJ,tL={},tK=e=>e instanceof RegExp,tG=(e,t=[\",\",\" \"])=>tK(e)?e:ev(e)?tV(eF(e,e=>tG(e,t)?.source)):ea(e)?e?/./g:tJ:ef(e)?tL[e]??=tW(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tV(eF(tH(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tC(t,tB)}]`)),e=>e&&`^${tC(tH(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tB(tX(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tH=(e,t)=>e?.split(t)??e,tX=(e,t,r)=>e?.replace(t,r)??e,tY=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tZ=5e3,tQ=()=>()=>P(\"Not initialized.\"),t0=window,t1=document,t2=t1.body,t4=(e,t)=>!!e?.matches(t);((e=!0)=>tA=e)(!!t0.chrome);var t6=H,t5=(e,t,r=(e,t)=>t>=t6)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==t1&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t3=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>nh(e),Z);case\"e\":return W(()=>nm?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t3(e,t[0])):void 0}},t8=(e,t,r)=>t3(e?.getAttribute(t),r),t9=(e,t,r)=>t5(e,(e,n)=>n(t8(e,t,r))),t7=(e,t)=>t8(e,t)?.trim()?.toLowerCase(),re=e=>e?.getAttributeNames(),rt=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,rr=e=>null!=e?e.tagName:null,rn=()=>({x:(r=ra(X)).x/(t2.offsetWidth-window.innerWidth)||0,y:r.y/(t2.offsetHeight-window.innerHeight)||0}),ra=e=>({x:eA(scrollX,e),y:eA(scrollY,e)}),ri=(e,t)=>tX(e,/#.*$/,\"\")===tX(t,/#.*$/,\"\"),ro=(e,t,r=Y)=>(n=rs(e,t))&&K({xpx:n.x,ypx:n.y,x:eA(n.x/t2.offsetWidth,4),y:eA(n.y/t2.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),rs=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=rl(e),{x:a,y:i}):void 0,rl=e=>e?(o=e.getBoundingClientRect(),r=ra(X),{x:eA(o.left+r.x),y:eA(o.top+r.y),width:eA(o.width),height:eA(o.height)}):void 0,ru=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),rc=e=>{var{host:t,scheme:r,port:n}=tq(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rf=()=>({...r=ra(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:t2.offsetWidth,totalHeight:t2.offsetHeight});(I=s||(s={}))[I.Anonymous=0]=\"Anonymous\",I[I.Indirect=1]=\"Indirect\",I[I.Direct=2]=\"Direct\",I[I.Sensitive=3]=\"Sensitive\";var rd=tM(s,!1,\"data classification\"),rv=(e,t)=>rd.parse(e?.classification??e?.level)===rd.parse(t?.classification??t?.level)&&rh.parse(e?.purposes??e?.purposes)===rh.parse(t?.purposes??t?.purposes),rp=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rd.parse(e.classification??e.level??t?.classification??0),purposes:rh.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(A=l||(l={}))[A.None=0]=\"None\",A[A.Necessary=1]=\"Necessary\",A[A.Functionality=2]=\"Functionality\",A[A.Performance=4]=\"Performance\",A[A.Targeting=8]=\"Targeting\",A[A.Security=16]=\"Security\",A[A.Infrastructure=32]=\"Infrastructure\",A[A.Any_Anonymous=49]=\"Any_Anonymous\",A[A.Any=63]=\"Any\",A[A.Server=2048]=\"Server\",A[A.Server_Write=4096]=\"Server_Write\";var rh=tM(l,!0,\"data purpose\",2111),rg=tM(l,!1,\"data purpose\",0),rm=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),ry=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rb=tM(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rw=e=>`'${e.key}' in ${rb.format(e.scope)} scope`,rk={scope:rb,purpose:rg,purposes:rh,classification:rd};t_(rk);var rS=e=>e?.filter(ee).sort((e,t)=>e.scope===t.scope?e.key.localeCompare(t.key,\"en\"):e.scope-t.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tM(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tM(d,!1,\"variable set status\");var rT=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rx)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rI)),values:o(e=>eF(e,e=>rI(e)?.value)),push:()=>(i=e=>(r?.(eF(rE(e))),e),s),value:o(e=>rI(e[0])?.value),variable:o(e=>rI(e[0])),result:o(e=>e[0])};return s},rE=e=>e?.map(e=>e?.status<400?e:G),rI=e=>rA(e)?e.current??e:G,rA=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rx=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rw(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rN=e=>rx(e,G,!0),rO=e=>e&&\"string\"==typeof e.type,rC=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),r$=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rj=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rM=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eV(e,e=>rM(e,t,r)):ef(e)?tW(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?r$(n)+\"::\":\"\")+t+r$(a),value:r$(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rj(r,u)}):rj(r,e),r},r_=new WeakMap,rU=e=>r_.get(e),rF=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rq=(e,t,r,n,a,i)=>t?.[1]&&eV(re(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tz(o,t)&&(i=void 0,!r||t4(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rM(a,tX(n,/\\-/g,\":\"),r),i)),rP=()=>{},rR=(e,t)=>{if(h===(h=rL.tags))return rP(e,t);var r=e=>e?tK(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tG(e.match),e.selector,e.prefix]:[tG(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rP=(e,t)=>rq(e,n,t))(e,t)},rz=(e,t)=>tC(eR(rt(e,rF(t,Y)),rt(e,rF(\"base-\"+t,Y))),\" \"),rD={},rW=(e,t,r=rz(e,\"attributes\"))=>{r&&rq(e,rD[r]??=[{},tD(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tG(r||n),,t])],t),rM(rz(e,\"tags\"),void 0,t)},rB=(e,t,r=X,n)=>(r?t5(e,(e,r)=>r(rB(e,t,X)),eS(r)?r:void 0):tC(eR(t8(e,rF(t)),rt(e,rF(t,Y))),\" \"))??(n&&(g=rU(e))&&n(g))??null,rJ=(e,t,r=X,n)=>\"\"===(m=rB(e,t,r,n))||(null==m?m:ei(m)),rV=(e,t,r,n)=>e?(rW(e,n??=new Map),t5(e,e=>{rR(e,n),rM(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rL={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rK={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rK);var rG=(C=rK.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,rH=[],rX=[],rY=(e,t=0)=>e.charCodeAt(t),rZ=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rH[rX[t]=e.charCodeAt(0)]=t);var rQ=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rX[(16515072&t)>>18],rX[(258048&t)>>12],rX[(4032&t)>>6],rX[63&t]);return a.length+=n-r,rZ(a)},r0=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rH[rY(e,r++)]<<2|(t=rH[rY(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rH[rY(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rH[rY(e,r++)]));return i},r1={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},r2=(e=256)=>e*Math.random()|0,r4=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(r2()));for(r=0,i[n++]=g(f^16*r2(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=r2();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=r1[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},{deserialize:r6,serialize:r5}=rG,r3=\"$ref\",r8=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r9=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r8(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r3]||(e[r3]=o,l(()=>delete e[r3])),{[r3]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r5(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r7=e=>{var t,r,n=e=>eg(e)?e[r3]&&(r=(t??=[])[e[r3]])?r:(e[r3]&&(t[e[r3]]=e,delete e[r3]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>r6(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},ne=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r9(e,!1,r))):r9(e,!0,r),n);if(t)return[e=>r9(e,!1,r),e=>null==e?G:W(()=>r7(e),G),(e,t)=>n(e,t)];var[a,i,o]=r4(e);return[(e,t)=>(t?Q:rQ)(a(r9(e,!0,r))),e=>null!=e?r7(i(e instanceof Uint8Array?e:r0(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};ne();var[nt,nr]=ne(null,{json:!0,prettify:!0}),nn=tH(\"\"+t1.currentScript.src,\"#\"),na=tH(\"\"+(nn[1]||\"\"),\";\"),ni=nn[0],no=na[1]||tq(ni,!1)?.host,ns=e=>!!(no&&tq(e,!1)?.host?.endsWith(no)===Y),nl=(...e)=>tX(tC(e),/(^(?=\\?))|(^\\.(?=\\/))/,ni.split(\"?\")[0]),nu=nl(\"?\",\"var\"),nc=nl(\"?\",\"mnt\");nl(\"?\",\"usr\");var nf=Symbol(),nd=Symbol(),nv=(e,t,r=Y,n=X)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tx(\"tail.js: \",\"90;3\"))+t);var a=e?.[nd];a&&(e=e[nf]),null!=e&&console.log(eg(e)?tx(nt(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,t,r])=>nv(e,t,r,!0)),t&&console.groupEnd()},[np,nh]=ne(),[ng,nm]=[tQ,tQ],[ny,nb]=tT(),nw=e=>{nm===tQ&&([ng,nm]=ne(e),nb(ng,nm))},nk=e=>t=>nS(e,t),nS=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nT,nE]=tT(),[nI,nA]=tT(),nx=e=>nO!==(nO=e)&&nE(nO=!1,nj(!0,!0)),nN=e=>nC!==(nC=!!e&&\"visible\"===document.visibilityState)&&nA(nC,!e,n$(!0,!0));nT(nN);var nO=!0,nC=!1,n$=tv(!1),nj=tv(!1);ru(window,[\"pagehide\",\"freeze\"],()=>nx(!1)),ru(window,[\"pageshow\",\"resume\"],()=>nx(!0)),ru(document,\"visibilitychange\",()=>(nN(!0),nC&&nx(!0))),nE(nO,nj(!0,!0));var nM=!1,n_=tv(!1),[nU,nF]=tT(),nq=th({callback:()=>nM&&nF(nM=!1,n_(!1)),frequency:2e4,once:!0,paused:!0}),nP=()=>!nM&&(nF(nM=!0,n_(!0)),nq.restart());ru(window,[\"focus\",\"scroll\"],nP),ru(window,\"blur\",()=>nq.trigger()),ru(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nP),nP();var nR=()=>n_();($=b||(b={}))[$.View=-3]=\"View\",$[$.Tab=-2]=\"Tab\",$[$.Shared=-1]=\"Shared\";var nz=tM(b,!1,\"local variable scope\"),nD=e=>nz.tryParse(e)??rb(e),nW=e=>nz.format(e)??rb.format(e),nB=e=>!!nz.tryParse(e?.scope),nJ=t_({scope:nz},rk),nV=e=>null==e?void 0:ef(e)?e:e.source?nV(e.source):`${nD(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nL=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nK=0,nG=void 0,nH=()=>(nG??tQ())+\"_\"+nX(),nX=()=>(td(!0)-(parseInt(nG.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nK).toString(36),nY=e=>crypto.getRandomValues(e),nZ=()=>tX(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nY(new Uint8Array(1))[0]&15>>e/4).toString(16)),nQ={},n0={id:nG,heartbeat:td()},n1={knownTabs:{[nG]:n0},variables:{}},[n2,n4]=tT(),[n6,n5]=tT(),n3=tQ,n8=e=>nQ[nV(e)],n9=(...e)=>ae(e.map(e=>(e.cache=[td(),3e3],nJ(e)))),n7=e=>eF(e,e=>e&&[e,nQ[nV(e)]]),ae=e=>{var t=eF(e,e=>e&&[nV(e),e]);if(t?.length){var r=n7(e);e7(nQ,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(n1.variables,n),n3({type:\"patch\",payload:eG(n)})),n5(r,nQ,!0)}};ny((e,t)=>{nT(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nG=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nQ=eG(eR(eX(nQ,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nV(e),e])))}else sessionStorage.setItem(F,e([nG,eF(nQ,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n3=(t,r)=>{e&&(localStorage.setItem(F,e([nG,t,r])),localStorage.removeItem(F))},ru(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nG)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||n3({type:\"set\",payload:n1},a);else if(\"set\"===i&&r.active)e7(n1,o),e7(nQ,o.variables),r.trigger();else if(\"patch\"===i){var s=n7(eF(o,1));e7(n1.variables,o),e7(nQ,o),n5(s,nQ,!1)}else\"tab\"===i&&(e7(n1.knownTabs,a,o),o&&n4(\"tab\",o,!1))}}});var r=th(()=>n4(\"ready\",n1,!0),-25),n=th({callback(){var e=td()-1e4;eV(n1?.knownTabs,([t,r])=>r[0]<e&&tn(n1.knownTabs,t)),n0.heartbeat=td(),n3({type:\"tab\",payload:n0})},frequency:5e3,paused:!0}),a=e=>{n3({type:\"tab\",payload:e?n0:void 0}),e?(r.restart(),n3({type:\"query\"})):r.toggle(!1),n.toggle(e)};nT(e=>a(e),!0)},!0);var[at,ar]=tT(),[an,aa]=tT(),ai=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?nm:nh)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?ng:np)([nG,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nG))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ru(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})(U+\"rq\"),ao=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),ar(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?ng(a,!0):JSON.stringify(a)))};if(!r)return await ai(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?nm:JSON.parse)?.(o):G;return null!=l&&aa(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},as=[\"scope\",\"key\",\"targetId\",\"version\"],al=[...as,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],au=[...as,\"init\",\"purpose\",\"refresh\"],ac=[...al,\"value\",\"force\",\"patch\"],af=new Map,ad=(e,t)=>{var r=th(async()=>{var e=eF(af,([e,t])=>({...nL(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(af,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nV(e),i=ta(af,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nT((e,t)=>r.toggle(e,e&&t>=3e3),!0),n6(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await ao(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nV(e);n(r,e.result);var a=n8(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nB(e))return[to(e,au),t];else if(eb(e.init)){var u={...nJ(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rh.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&ae(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nV(e),n=n8(r);if(o(r,e.cache),nB(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nz(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,ac),t]}}),f=u.length?D((await ao(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&ae(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,al),cache:[t,t+(ta(i,nV(e))??3e3)]});return an(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rI(e)),eF(e.set,e=>rI(e)));r?.length&&ae(eB(r,c,t))}}),u},av=(e,t,r=tZ)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),nv({[nd]:eF(r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rm(tl(e),!0),{timestamp:e.timestamp-td()}))),e=>[e,e.type,X])},\"Posting \"+tE([tI(\"new event\",[eY(r,e=>!ry(e))||void 0]),tI(\"event patch\",[eY(r,e=>ry(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ao(e,{events:r,variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>nv(e,e.type)),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nI((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},ap=Symbol(),ah=[.75,.33],ag=[.25,.33],am=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[ap]?.(e))),r=new Set;th({callback:()=>eV(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=t1.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nR),!1,!1,0,0,0,tY()];a[4]=t,a[5]=r,a[6]=n},y=[tY(),tY()],b=aU(!1),w=tv(!1,nR),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],E=S[1]-S[3],I=T/t.height||0,A=E/t.width||0,x=v?ag:ah,N=(T>x[0]*o||I>x[0])&&(E>x[0]*r||A>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rL.impressionThreshold-250)&&(++h,b(v),u||tu(e,u=eX(eF(s,e=>(e.track?.impressions||rJ(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:ro(i),viewport:rf(),timeOffset:aq(),impressions:h,...aH(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=t$(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var $,j=t1.createTreeWalker(i,NodeFilter.SHOW_TEXT),M=0,_=0;for(l??=[];_<f.length&&($=j.nextNode());){var U=$.textContent?.length??0;for(M+=U;M>=f[_]?.offset;)if(a[_%2?\"setEnd\":\"setStart\"]($,f[_].offset-M+U),_++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;_<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+E)/D),l&&eV(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[ap]=({isIntersecting:e})=>{e7(r,S,e),e||(eV(c,e=>e()),S())},t.observe(i)}}},ay=()=>{n6((e,t,r)=>{var n=eR(rS(eF(e,1))?.map(e=>[e,`${e.key} (${nW(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X]),[[{[nd]:rS(eF(t,1))?.map(e=>[e,`${e.key} (${nW(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X])},\"All variables\",Y]]);nv({[nd]:n},tx(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(t)} in total).`,\"2;3\"))})},ab=()=>{var e=t0?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??t0.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:t0.devicePixelRatio,width:t,height:r,landscape:a}}},aw=e=>tu(e,K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...ab()})),ak=(e,t=\"A\"===rr(e)&&t8(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),aS=(e,t=rr(e),r=rJ(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t7(e,\"type\"),\"button\",\"submit\")||r===Y),aT=(e,t=!1)=>({tagName:e.tagName,text:tO(t8(e,\"title\")?.trim()||t8(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?rl(e):void 0}),aE=(e,t,r=!1)=>{var n;return t5(e??t,e=>\"IMG\"===rr(e)||e===t?(n={element:aT(e,r)},X):Y),n},aI=e=>{if(console.log(\"Jah mahrnz\"),w)return w;ef(e)&&([t,e]=nh(e),e=ne(t)[1](e)),e7(rL,e),nw(ta(rL,\"encryptionKey\"));var t,r=ta(rL,\"key\"),n=t0[rL.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rL.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nk(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nH(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=ad(nu,l),c=av(nu,l),f=null,d=0,v=X,p=X;return Object.defineProperty(t0,rL.name,{value:w=Object.freeze({id:\"tracker_\"+nH(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):nh(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?nh(e):e),e=>{if(!e)return X;if(a1(e))rL.tags=e7({},rL.tags,e.tagAttributes);else if(a2(e))return rL.disabled=e.disable,X;else if(a5(e))return n=Y,X;else if(it(e))return e(w),X;return p||a8(e)||a6(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>a6(e)?-100:a8(e)?-50:ie(e)?-10:rO(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rO(t))c.post(t);else if(a3(t))u.get(...eh(t.get));else if(ie(t))u.set(...eh(t.set));else if(a8(t))tu(i,t.listener);else if(a6(t))(e=W(()=>t.extension.setup(w),e=>nS(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(it(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nS(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nS(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),ay(),n2(async(e,t,r,a)=>{if(\"ready\"===e){var i=rN((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:_,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(aw(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aY,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},aA=()=>k?.clientId,ax={scope:\"shared\",key:\"referrer\"},aN=(e,t)=>{w.variables.set({...ax,value:[aA(),e]}),t&&w.variables.get({scope:ax.scope,key:ax.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},aO=tv(),aC=tv(),a$=1,aj=()=>aC(),[aM,a_]=tT(),aU=e=>{var t=tv(e,aO),r=tv(e,aC),n=tv(e,nR),a=tv(e,()=>a$);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aF=aU(),aq=()=>aF(),[aP,aR]=tT(),az=(e,t)=>(t&&eV(aW,t=>e(t,()=>!1)),aP(e)),aD=new WeakSet,aW=document.getElementsByTagName(\"iframe\"),aB=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aJ(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aV=e=>rV(e,void 0,e=>eF(eh(e3(r_,e)?.tags))),aL=e=>e?.component||e?.content,aK=e=>rV(e,t=>t!==e&&!!aL(e3(r_,t)),e=>(T=e3(r_,e),(T=e3(r_,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aG=(e,t)=>t?e:{...e,rect:void 0,content:(E=e.content)&&eF(E,e=>({...e,rect:void 0}))},aH=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t5(e,e=>{var a=e3(r_,e);if(a){if(aL(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&rl(e)||void 0;var u=aK(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aG({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rB(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aG({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tC(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tC(a,\"/\")}:void 0},aX=Symbol();j={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=t1.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=j[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aY=[{id:\"context\",setup(e){th(()=>eV(aW,e=>tt(aD,e)&&aR(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=n8({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n8({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n9({scope:\"tab\",key:\"tabIndex\",value:n=n8({scope:\"shared\",key:\"tabIndex\"})?.value??n8({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!ri(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tq(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nH(),tab:nG,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rf(),duration:aF(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),n9({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tP(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tX(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n8(ax)?.value;c&&ns(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ax,value:void 0}))}var c=document.referrer||null;c&&!ns(c)&&(k.externalReferrer={href:c,domain:rc(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aq()})),a_(k)}};return nI(e=>{e?(aC(Y),++a$):aC(X)}),ru(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>a0(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rC(e)||ry(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=am(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(r_,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(r_,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>a4(e)?(n(e),Y):a7(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t8(a,e);){tt(n,a);var o=tH(t8(a,e),\"|\");t8(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ru(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t5(n.target,e=>{aS(e)&&(o??=e),u=u||\"NAV\"===rr(e);var t=rU(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>aS(t)&&((l??=[]).length>3?eN():l.push({...aT(t,!0),component:t5(t,(e,t,r,n=rU(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rJ(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rJ(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aH(s,!1,f),v=aV(s);a??=!u;var p={...(i??=Y)?{pos:ro(o,n),viewport:rf()}:null,...aE(n.target,s),...d,timeOffset:aq(),...v};if(!o){f&&te(t,s,r=>{var a=rs(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(ak(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tq(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nH(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=ns(w);if(k){aN(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rL.captureContextMenu)return;o.href=nc+\"=\"+S+encodeURIComponent(w),ru(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ru(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t8(o,\"target\")!==window.name?(aN(b.clientId),b.self=X,tu(e,b)):ri(location.href,o.href)||(b.exit=b.external,aN(b.clientId)));return}var T=(t5(n.target,(e,t)=>!!(c??=aB(rU(e)?.cart??rB(e,\"cart\")))&&!c.item&&(c.item=e2(rU(e)?.content))&&t(c)),aJ(c));(T||a)&&tu(e,T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),az(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=ra(Y);aM(()=>ty(()=>(t={},r=ra(Y)),250)),ru(window,\"scroll\",()=>{var n=ra(),a=rn();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aQ(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aJ(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return a9(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t9(i,rF(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&rl(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t9(i,rF(\"form-name\"))||t8(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aq()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ru(i,\"submit\",()=>{a=aH(i),t[3]=3,u(()=>{i.isConnected&&rl(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rJ(e,\"ref\"))&&(e.value||(e.value=nZ()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tX(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aX]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=aj())),u=-(l-(l=td(Y))),c=t[aX];(t[aX]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ru(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=aj()):o()));u(document),az(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:_,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rv(n,r=rp(r)))return[!1,n];var a={level:rd.lookup(r.classification),purposes:rh.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:_}]}}),[!0,a]}},n={};return{processCommand(e){if(ir(e)){var a=e.consent.get;a&&t(a);var i=rp(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(t1.hasFocus()){var e=o.poll();if(e){var t=rp({...s,...e});if(t&&!rv(s,t)){var[n,a]=await r(t);n&&nv(a,\"Consent was updated from \"+l),s=t}}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aZ=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aQ=aZ(\"cart\"),a0=aZ(\"username\"),a1=aZ(\"tagAttributes\"),a2=aZ(\"disable\"),a4=aZ(\"boundary\"),a6=aZ(\"extension\"),a5=aZ(Y,\"flush\"),a3=aZ(\"get\"),a8=aZ(\"listener\"),a9=aZ(\"order\"),a7=aZ(\"scan\"),ie=aZ(\"set\"),it=e=>\"function\"==typeof e,ir=aZ(\"consent\");Object.defineProperty(t0,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(aI)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
                                body = await unwrap(body);
                                if (body == null || !isJsonObject(body) || body.length === 0) {
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
        src.push("?init");
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

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
        text: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,I,A,E,x,N,O,C,j,M,_=\"@info\",U=\"@consent\",$=\"_tail:\",F=$+\"state\",q=$+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},J=e=>{var t={initialized:!0,then:V(()=>(t.initialized=!0,ts(e)))};return t},V=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eI=e=>e instanceof Map,eA=e=>e instanceof Set,eE=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,ej=e=>e?.filter(ee),eM=(e,t,r,n)=>null==e?[]:!t&&ev(e)?ej(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):eM(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),e_=(e,t)=>t&&!ev(e)?[...e]:e,eU=(e,t,r,n)=>eM(e,t,r,n),e$=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?eM(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(eM(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...eU(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(e$(e,t,r,n,a,i)),eR=(...e)=>{var t;return eV(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eJ=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of eM(e,t,r,n))null!=i&&(a=i);return a}},eV=eJ,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of eU(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eV(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eJ(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>e_(eM(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eI(e)?e=>e:eA(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eJ(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eJ(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eV(t,t=>eV(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eV(r,r=>ev(r)?e(t,r[0],r[1]):eV(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eA(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eI(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eV(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tI=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tA=(e,t=\"'\")=>null==e?G:t+e+t,tE=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tx=(e,t,r)=>null==e?G:eS(t)?tI(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tI(eF(e,e=>!1===e?G:e),t??\"\"),tN=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eE(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eE(o/l+100*s/o),readTime:eE(o/238*6e4),boundaries:f}},tO=e=>(e=Math.log2(e))===(0|e),tC=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tO(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tO(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tI(eF(eh(e),e=>tA(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},tj=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tM=Symbol(),t_=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tU=(e,t=!0,r)=>null==e?G:tR(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:t$(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),t$=(e,t,r=!0)=>tF(e,\"&\",t,r),tF=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=t_(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tM]=a),i},tq=(e,t)=>t&&null!=e?t.test(e):G,tP=(e,t,r)=>tR(e,t,r,!0),tR=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tR(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tz=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tD=/\\z./g,tW=(e,t)=>(t=tx(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tD,tB={},tJ=e=>e instanceof RegExp,tV=(e,t=[\",\",\" \"])=>tJ(e)?e:ev(e)?tW(eF(e,e=>tV(e,t)?.source)):ea(e)?e?/./g:tD:ef(e)?tB[e]??=tR(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tW(eF(tL(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tx(t,tz)}]`)),e=>e&&`^${tx(tL(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tz(tK(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tL=(e,t)=>e?.split(t)??e,tK=(e,t,r)=>e?.replace(t,r)??e,tG=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tH=5e3,tX=()=>()=>P(\"Not initialized.\"),tY=window,tZ=document,tQ=tZ.body,t0=(e,t)=>!!e?.matches(t),t1=H,t2=(e,t,r=(e,t)=>t>=t1)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==tZ&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t4=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>ni(e),Z);case\"e\":return W(()=>ns?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t4(e,t[0])):void 0}},t6=(e,t,r)=>t4(e?.getAttribute(t),r),t5=(e,t,r)=>t2(e,(e,n)=>n(t6(e,t,r))),t3=(e,t)=>t6(e,t)?.trim()?.toLowerCase(),t8=e=>e?.getAttributeNames(),t9=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,t7=e=>null!=e?e.tagName:null,re=()=>({x:(r=rt(X)).x/(tQ.offsetWidth-window.innerWidth)||0,y:r.y/(tQ.offsetHeight-window.innerHeight)||0}),rt=e=>({x:eE(scrollX,e),y:eE(scrollY,e)}),rr=(e,t)=>tK(e,/#.*$/,\"\")===tK(t,/#.*$/,\"\"),rn=(e,t,r=Y)=>(n=ra(e,t))&&K({xpx:n.x,ypx:n.y,x:eE(n.x/tQ.offsetWidth,4),y:eE(n.y/tQ.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),ra=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=ri(e),{x:a,y:i}):void 0,ri=e=>e?(o=e.getBoundingClientRect(),r=rt(X),{x:eE(o.left+r.x),y:eE(o.top+r.y),width:eE(o.width),height:eE(o.height)}):void 0,ro=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eV(t,t=>e.addEventListener(t,r,n)),r=>eV(t,t=>e.removeEventListener(t,r,n)))),rs=e=>{var{host:t,scheme:r,port:n}=tU(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rl=()=>({...r=rt(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:tQ.offsetWidth,totalHeight:tQ.offsetHeight});(A=s||(s={}))[A.Anonymous=0]=\"Anonymous\",A[A.Indirect=1]=\"Indirect\",A[A.Direct=2]=\"Direct\",A[A.Sensitive=3]=\"Sensitive\";var ru=tC(s,!1,\"data classification\"),rc=(e,t)=>ru.parse(e?.classification??e?.level)===ru.parse(t?.classification??t?.level)&&rd.parse(e?.purposes??e?.purposes)===rd.parse(t?.purposes??t?.purposes),rf=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:ru.parse(e.classification??e.level??t?.classification??0),purposes:rd.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(E=l||(l={}))[E.None=0]=\"None\",E[E.Necessary=1]=\"Necessary\",E[E.Functionality=2]=\"Functionality\",E[E.Performance=4]=\"Performance\",E[E.Targeting=8]=\"Targeting\",E[E.Security=16]=\"Security\",E[E.Infrastructure=32]=\"Infrastructure\",E[E.Any_Anonymous=49]=\"Any_Anonymous\",E[E.Any=63]=\"Any\",E[E.Server=2048]=\"Server\",E[E.Server_Write=4096]=\"Server_Write\";var rd=tC(l,!0,\"data purpose\",2111),rv=tC(l,!1,\"data purpose\",0),rp=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),rh=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rg=tC(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rm=e=>`'${e.key}' in ${rg.format(e.scope)} scope`,ry={scope:rg,purpose:rv,purposes:rd,classification:ru};tj(ry),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tC(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tC(d,!1,\"variable set status\");var rb=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rT)=>J(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rk)),values:o(e=>eF(e,e=>rk(e)?.value)),push:()=>(i=e=>(r?.(eF(rw(e))),e),s),value:o(e=>rk(e[0])?.value),variable:o(e=>rk(e[0])),result:o(e=>e[0])};return s},rw=e=>e?.map(e=>e?.status<400?e:G),rk=e=>rS(e)?e.current??e:G,rS=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rT=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rm(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rI=e=>rT(e,G,!0),rA=e=>e&&\"string\"==typeof e.type,rE=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),rx=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rN=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rO=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eV(e,e=>rO(e,t,r)):ef(e)?tR(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?rx(n)+\"::\":\"\")+t+rx(a),value:rx(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rN(r,u)}):rN(r,e),r},rC=new WeakMap,rj=e=>rC.get(e),rM=(e,t=X)=>(t?\"--track-\":\"track-\")+e,r_=(e,t,r,n,a,i)=>t?.[1]&&eV(t8(e),o=>t[0][o]??=(i=X,ef(n=eV(t[1],([t,r,n],a)=>tq(o,t)&&(i=void 0,!r||t0(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rO(a,tK(n,/\\-/g,\":\"),r),i)),rU=()=>{},r$=(e,t)=>{if(h===(h=rW.tags))return rU(e,t);var r=e=>e?tJ(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tV(e.match),e.selector,e.prefix]:[tV(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rU=(e,t)=>r_(e,n,t))(e,t)},rF=(e,t)=>tx(eR(t9(e,rM(t,Y)),t9(e,rM(\"base-\"+t,Y))),\" \"),rq={},rP=(e,t,r=rF(e,\"attributes\"))=>{r&&r_(e,rq[r]??=[{},tP(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tV(r||n),,t])],t),rO(rF(e,\"tags\"),void 0,t)},rR=(e,t,r=X,n)=>(r?t2(e,(e,r)=>r(rR(e,t,X)),eS(r)?r:void 0):tx(eR(t6(e,rM(t)),t9(e,rM(t,Y))),\" \"))??(n&&(g=rj(e))&&n(g))??null,rz=(e,t,r=X,n)=>\"\"===(m=rR(e,t,r,n))||(null==m?m:ei(m)),rD=(e,t,r,n)=>e?(rP(e,n??=new Map),t2(e,e=>{r$(e,n),rO(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rW={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rB=[],rJ=[],rV=(e,t=0)=>e.charCodeAt(t),rL=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rB[rJ[t]=e.charCodeAt(0)]=t);var rK=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rJ[(16515072&t)>>18],rJ[(258048&t)>>12],rJ[(4032&t)>>6],rJ[63&t]);return a.length+=n-r,rL(a)},rG=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rB[rV(e,r++)]<<2|(t=rB[rV(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rB[rV(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rB[rV(e,r++)]));return i},rH={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},rX=(e=256)=>e*Math.random()|0,rY=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(rX()));for(r=0,i[n++]=g(f^16*rX(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=rX();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rH[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},rZ={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(rZ);var{deserialize:rQ,serialize:r0}=(C=rZ.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r1=\"$ref\",r2=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r4=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r2(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r1]||(e[r1]=o,l(()=>delete e[r1])),{[r1]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r0(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r6=e=>{var t,r,n=e=>eg(e)?e[r1]&&(r=(t??=[])[e[r1]])?r:(e[r1]&&(t[e[r1]]=e,delete e[r1]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>rQ(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},r5=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r4(e,!1,r))):r4(e,!0,r),n);if(t)return[e=>r4(e,!1,r),e=>null==e?G:W(()=>r6(e),G),(e,t)=>n(e,t)];var[a,i,o]=rY(e);return[(e,t)=>(t?Q:rK)(a(r4(e,!0,r))),e=>null!=e?r6(i(e instanceof Uint8Array?e:rG(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r5(),r5(null,{json:!0,prettify:!0});var r3=tL(\"\"+tZ.currentScript.src,\"#\"),r8=tL(\"\"+(r3[1]||\"\"),\";\"),r9=r3[0],r7=r8[1]||tU(r9,!1)?.host,ne=e=>!!(r7&&tU(e,!1)?.host?.endsWith(r7)===Y),nt=(...e)=>tK(tx(e),/(^(?=\\?))|(^\\.(?=\\/))/,r9.split(\"?\")[0]),nr=nt(\"?\",\"var\"),nn=nt(\"?\",\"mnt\");nt(\"?\",\"usr\");var[na,ni]=r5(),[no,ns]=[tX,tX],[nl,nu]=tT(),nc=e=>{ns===tX&&([no,ns]=r5(e),nu(no,ns))},nf=e=>t=>nd(e,t),nd=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nv,np]=tT(),[nh,ng]=tT(),nm=e=>nb!==(nb=e)&&np(nb=!1,nS(!0,!0)),ny=e=>nw!==(nw=!!e&&\"visible\"===document.visibilityState)&&ng(nw,!e,nk(!0,!0));nv(ny);var nb=!0,nw=!1,nk=tv(!1),nS=tv(!1);ro(window,[\"pagehide\",\"freeze\"],()=>nm(!1)),ro(window,[\"pageshow\",\"resume\"],()=>nm(!0)),ro(document,\"visibilitychange\",()=>(ny(!0),nw&&nm(!0))),np(nb,nS(!0,!0));var nT=!1,nI=tv(!1),[nA,nE]=tT(),nx=th({callback:()=>nT&&nE(nT=!1,nI(!1)),frequency:2e4,once:!0,paused:!0}),nN=()=>!nT&&(nE(nT=!0,nI(!0)),nx.restart());ro(window,[\"focus\",\"scroll\"],nN),ro(window,\"blur\",()=>nx.trigger()),ro(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nN),nN();var nO=()=>nI();(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nC=tC(b,!1,\"local variable scope\"),nj=e=>nC.tryParse(e)??rg(e),nM=e=>!!nC.tryParse(e?.scope),n_=tj({scope:nC},ry),nU=e=>null==e?void 0:ef(e)?e:e.source?nU(e.source):`${nj(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,n$=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nF=0,nq=void 0,nP=()=>(nq??tX())+\"_\"+nR(),nR=()=>(td(!0)-(parseInt(nq.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nF).toString(36),nz=e=>crypto.getRandomValues(e),nD=()=>tK(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nz(new Uint8Array(1))[0]&15>>e/4).toString(16)),nW={},nB={id:nq,heartbeat:td()},nJ={knownTabs:{[nq]:nB},variables:{}},[nV,nL]=tT(),[nK,nG]=tT(),nH=tX,nX=e=>nW[nU(e)],nY=(...e)=>nQ(e.map(e=>(e.cache=[td(),3e3],n_(e)))),nZ=e=>eF(e,e=>e&&[e,nW[nU(e)]]),nQ=e=>{var t=eF(e,e=>e&&[nU(e),e]);if(t?.length){var r=nZ(e);e7(nW,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(nJ.variables,n),nH({type:\"patch\",payload:eG(n)})),nG(r,nW,!0)}};nl((e,t)=>{nv(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nq=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nW=eG(eR(eX(nW,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nU(e),e])))}else sessionStorage.setItem(F,e([nq,eF(nW,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nH=(t,r)=>{e&&(localStorage.setItem(F,e([nq,t,r])),localStorage.removeItem(F))},ro(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nq)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||nH({type:\"set\",payload:nJ},a);else if(\"set\"===i&&r.active)e7(nJ,o),e7(nW,o.variables),r.trigger();else if(\"patch\"===i){var s=nZ(eF(o,1));e7(nJ.variables,o),e7(nW,o),nG(s,nW,!1)}else\"tab\"===i&&(e7(nJ.knownTabs,a,o),o&&nL(\"tab\",o,!1))}}});var r=th(()=>nL(\"ready\",nJ,!0),-25),n=th({callback(){var e=td()-1e4;eV(nJ?.knownTabs,([t,r])=>r[0]<e&&tn(nJ.knownTabs,t)),nB.heartbeat=td(),nH({type:\"tab\",payload:nB})},frequency:5e3,paused:!0}),a=e=>{nH({type:\"tab\",payload:e?nB:void 0}),e?(r.restart(),nH({type:\"query\"})):r.toggle(!1),n.toggle(e)};nv(e=>a(e),!0)},!0);var[n0,n1]=tT(),[n2,n4]=tT(),n6=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?ns:ni)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?no:na)([nq,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nq))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ro(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})($+\"rq\"),n5=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),n1(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?no(a,!0):JSON.stringify(a)))};if(!r)return await n6(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?ns:JSON.parse)?.(o):G;return null!=l&&n4(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},n3=[\"scope\",\"key\",\"targetId\",\"version\"],n8=[...n3,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n9=[...n3,\"init\",\"purpose\",\"refresh\"],n7=[...n8,\"value\",\"force\",\"patch\"],ae=new Map,at=(e,t)=>{var r=th(async()=>{var e=eF(ae,([e,t])=>({...n$(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(ae,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nU(e),i=ta(ae,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eV(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nv((e,t)=>r.toggle(e,e&&t>=3e3),!0),nK(e=>eV(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await n5(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nU(e);n(r,e.result);var a=nX(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nM(e))return[to(e,n9),t];else if(eb(e.init)){var u={...n_(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rd.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&nQ(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rb(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nU(e),n=nX(r);if(o(r,e.cache),nM(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nC(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,n7),t]}}),f=u.length?D((await n5(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nQ(a),eV(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,n8),cache:[t,t+(ta(i,nU(e))??3e3)]});return n2(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rk(e)),eF(e.set,e=>rk(e)));r?.length&&nQ(eB(r,c,t))}}),u},ar=(e,t,r=tH)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),n5(e,{events:r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rp(tl(e),!0),{timestamp:e.timestamp-td()}))),variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nh((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},an=Symbol(),aa=[.75,.33],ai=[.25,.33],ao=e=>{var t=new IntersectionObserver(e=>eV(e,e=>e.target[an]?.(e))),r=new Set;th({callback:()=>eV(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=tZ.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nO),!1,!1,0,0,0,tG()];a[4]=t,a[5]=r,a[6]=n},y=[tG(),tG()],b=aT(!1),w=tv(!1,nO),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],I=S[1]-S[3],A=T/t.height||0,E=I/t.width||0,x=v?ai:aa,N=(T>x[0]*o||A>x[0])&&(I>x[0]*r||E>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rW.impressionThreshold-250)&&(++h,b(v),u||tu(e,u=eX(eF(s,e=>(e.track?.impressions||rz(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:rn(i),viewport:rl(),timeOffset:aA(),impressions:h,...aq(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=tN(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var j,M=tZ.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,U=0;for(l??=[];U<f.length&&(j=M.nextNode());){var $=j.textContent?.length??0;for(_+=$;_>=f[U]?.offset;)if(a[U%2?\"setEnd\":\"setStart\"](j,f[U].offset-_+$),U++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;U<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+I)/D),l&&eV(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[an]=({isIntersecting:e})=>{e7(r,S,e),e||(eV(c,e=>e()),S())},t.observe(i)}}},as=()=>{var e=tY?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??tY.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tY.devicePixelRatio,width:t,height:r,landscape:a}}},al=e=>tu(e,K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...as()})),au=(e,t=\"A\"===t7(e)&&t6(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ac=(e,t=t7(e),r=rz(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t3(e,\"type\"),\"button\",\"submit\")||r===Y),af=(e,t=!1)=>({tagName:e.tagName,text:tE(t6(e,\"title\")?.trim()||t6(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?ri(e):void 0}),ad=(e,t,r=!1)=>{var n;return t2(e??t,e=>\"IMG\"===t7(e)||e===t?(n={element:af(e,r)},X):Y),n},av=e=>{if(w)return w;ef(e)&&([t,e]=ni(e),e=r5(t)[1](e)),e7(rW,e),nc(ta(rW,\"encryptionKey\"));var t,r=ta(rW,\"key\"),n=tY[rW.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rW.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nf(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nP(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=at(nr,l),c=ar(nr,l),f=null,d=0,v=X,p=X;return Object.defineProperty(tY,rW.name,{value:w=Object.freeze({id:\"tracker_\"+nP(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):ni(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?ni(e):e),e=>{if(!e)return X;if(aB(e))rW.tags=e7({},rW.tags,e.tagAttributes);else if(aJ(e))return rW.disabled=e.disable,X;else if(aK(e))return n=Y,X;else if(aQ(e))return e(w),X;return p||aH(e)||aL(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aL(e)?-100:aH(e)?-50:aZ(e)?-10:rA(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rA(t))c.post(t);else if(aG(t))u.get(...eh(t.get));else if(aZ(t))u.set(...eh(t.set));else if(aH(t))tu(i,t.listener);else if(aL(t))(e=W(()=>t.extension.setup(w),e=>nd(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(aQ(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nd(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nd(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),nV(async(e,t,r,a)=>{if(\"ready\"===e){var i=rI((await u.get({scope:\"session\",key:_,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(al(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aR,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ap=()=>k?.clientId,ah={scope:\"shared\",key:\"referrer\"},ag=(e,t)=>{w.variables.set({...ah,value:[ap(),e]}),t&&w.variables.get({scope:ah.scope,key:ah.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},am=tv(),ay=tv(),ab=1,aw=()=>ay(),[ak,aS]=tT(),aT=e=>{var t=tv(e,am),r=tv(e,ay),n=tv(e,nO),a=tv(e,()=>ab);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aI=aT(),aA=()=>aI(),[aE,ax]=tT(),aN=(e,t)=>(t&&eV(aC,t=>e(t,()=>!1)),aE(e)),aO=new WeakSet,aC=document.getElementsByTagName(\"iframe\"),aj=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aM(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var a_=e=>rD(e,void 0,e=>eF(eh(e3(rC,e)?.tags))),aU=e=>e?.component||e?.content,a$=e=>rD(e,t=>t!==e&&!!aU(e3(rC,t)),e=>(T=e3(rC,e),(T=e3(rC,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aF=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eF(I,e=>({...e,rect:void 0}))},aq=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t2(e,e=>{var a=e3(rC,e);if(a){if(aU(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&ri(e)||void 0;var u=a$(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aF({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rR(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aF({id:\"\",rect:n,content:o})),eV(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tx(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tx(a,\"/\")}:void 0},aP=Symbol();M={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=tZ.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=M[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aR=[{id:\"context\",setup(e){th(()=>eV(aC,e=>tt(aO,e)&&ax(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=nX({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nX({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nY({scope:\"tab\",key:\"tabIndex\",value:n=nX({scope:\"shared\",key:\"tabIndex\"})?.value??nX({scope:\"session\",key:_})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!rr(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tU(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nP(),tab:nq,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rl(),duration:aI(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),nY({scope:\"tab\",key:\"viewIndex\",value:++r});var u=t$(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tK(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nX(ah)?.value;c&&ne(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ah,value:void 0}))}var c=document.referrer||null;c&&!ne(c)&&(k.externalReferrer={href:c,domain:rs(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aA()})),aS(k)}};return nh(e=>{e?(ay(Y),++ab):ay(X)}),ro(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aW(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rE(e)||rh(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ao(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(rC,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(rC,e))};return{decorate(e){eV(e.components,e=>ta(e,\"track\"))},processCommand:e=>aV(e)?(n(e),Y):aY(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t6(a,e);){tt(n,a);var o=tL(t6(a,e),\"|\");t6(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ro(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t2(n.target,e=>{ac(e)&&(o??=e),u=u||\"NAV\"===t7(e);var t=rj(e),r=t?.component;!n.button&&r?.length&&!l&&(eV(e.querySelectorAll(\"a,button\"),t=>ac(t)&&((l??=[]).length>3?eN():l.push({...af(t,!0),component:t2(t,(e,t,r,n=rj(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rz(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rz(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aq(s,!1,f),v=a_(s);a??=!u;var p={...(i??=Y)?{pos:rn(o,n),viewport:rl()}:null,...ad(n.target,s),...d,timeOffset:aA(),...v};if(!o){f&&te(t,s,r=>{var a=ra(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(au(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nP(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=ne(w);if(k){ag(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rW.captureContextMenu)return;o.href=nn+\"=\"+S+encodeURIComponent(w),ro(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ro(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t6(o,\"target\")!==window.name?(ag(b.clientId),b.self=X,tu(e,b)):rr(location.href,o.href)||(b.exit=b.external,ag(b.clientId)));return}var T=(t2(n.target,(e,t)=>!!(c??=aj(rj(e)?.cart??rR(e,\"cart\")))&&!c.item&&(c.item=e2(rj(e)?.content))&&t(c)),aM(c));(T||a)&&tu(e,T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),aN(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=rt(Y);ak(()=>ty(()=>(t={},r=rt(Y)),250)),ro(window,\"scroll\",()=>{var n=rt(),a=re();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aD(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aM(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return aX(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t5(i,rM(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ri(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t5(i,rM(\"form-name\"))||t6(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aA()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ro(i,\"submit\",()=>{a=aq(i),t[3]=3,u(()=>{i.isConnected&&ri(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rz(e,\"ref\"))&&(e.value||(e.value=nD()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tK(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aP]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=aw())),u=-(l-(l=td(Y))),c=t[aP];(t[aP]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eV(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ro(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=aw()):o()));u(document),aN(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:U,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rc(n,r=rf(r)))return[!1,n];var a={level:ru.lookup(r.classification),purposes:rd.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(a0(e)){var a=e.consent.get;a&&t(a);var i=rf(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(tZ.hasFocus()){var e=o.poll();if(e){var t=rf({...s,...e});t&&!rc(s,t)&&(await r(t),s=t)}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],az=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aD=az(\"cart\"),aW=az(\"username\"),aB=az(\"tagAttributes\"),aJ=az(\"disable\"),aV=az(\"boundary\"),aL=az(\"extension\"),aK=az(Y,\"flush\"),aG=az(\"get\"),aH=az(\"listener\"),aX=az(\"order\"),aY=az(\"scan\"),aZ=az(\"set\"),aQ=e=>\"function\"==typeof e,a0=az(\"consent\");Object.defineProperty(tY,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(av)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqS9i3rTSNY2eiuJhklLuOLYzoEgI_QBDTTdzaFJaKCNAcUuJwJHCpKcA7bn-W9j38C-sP9K9nrXqtLBCT39PXumiaWqUh1XrVrncl0vuD93Zrley4ssHhVO_zzK1rQqVKYSFalYpSpXUzVTIzVRY3WuztSJOlan6kodqQv1VR2oQ_VMPVCP1aV6oV6qR-qLeq4-Bc7_xMkkddQbehqlSa6TwlG3AudTEcVT31FPglstJy-iQjvqG57PZvmJo14FLrUe6OD-4yxLM1d76GFxkqUXa3ri6qDIkRYW9NfXS_Way6ss2OyiYIwiQVAsFq4Ow8ILgmQ2nXqZLmZZst7pI_-YPt3YoJ8CP-2pTo6LE3xkHr055iAJOv0JdQDP0VqcrGmPax9Ew3UqSz8bG-uv-V3hTWXUA9tQt99qJUt5oZqC4OXRFz0q2l_1VU7NmoaWtvRSfZdhtNvtjIZhhpCZcvc7GxtZO09PtVsE97-jpOepn_kTKo0Rrgc61P4rtwhD58Fapr_N4kyP186j6UyvxfnaaZzncXLsKJrYw6szbSa3nemzaTTSrkMtO8pBUftx2_GolbeyHusdlfFCZFdzMyztestRVIxOaDrLtAMaXajPsE68TK94mXwdIR1gkE51W3Pjhcn0_GI5iZNoOqWqwzbVulQPAQC8DFhaAGnWjpO4iKNp_F2PF4siLHyaDAGGdnGik5De-IHavu82inPvaajU-Dm9EXR5nv_3Rby-GVG2VL9WnQnmtW98-gYN-n-66KFbrFYovfOWtq5iqf6s1fWQck0WzTGm93e3UAN6HHpL9XsQ5VfJ6NrsC2xGF1FcrHEDtnZ9jjkuBp0hTWLi-Um1OoBbrAA_FZ7ZTf3memhvqae55sLntvB6MegOyw_sOCgNxXlr2K5Qo9QX-gSbhfZ1MtLpZI3hzHwf2e-jZbng8rFd9t8wO1o9Dc7TeLzWUb8EL2anRzprP3_w7tPBgyePPz17cfj46ePX6l2w3lXvMTF_MXjMl-oP-Vhr_Jo9oXQRHFydHqXTdlzoLCrSTOnMbhyXcBxVgQ3nZl6Y-cXGRkL_8beZfXAzguXMQ_5TpRP7sQF1wgVPBRk99XXYHhRDTtEoG6EnzlFKcxwlDm1p2ng0J9SrONA04RF2Y4e6ubHhdoNALxbOJKIlcKgKpDlFNtP0HXKeYjPqFDWur1MNOY-W8t4rPeVn-uid0jM7ZXF-EE30s6TQx5oGPeK-JJzX6MqEM4D9CT3UM8bcxwn6SAMr0gMu4qIb58GDLIuuqA3-VfqMe3Bt4ZU-Meija_AUjSV86q_TRBOMaZo_Xx_id0D4Rw_9gR4qfVwtIKbBSRl3Nvp2ahHqWZYWKdKVvrJpx7p4ZZNfUv-PagBB7V5Re5jTU6Uv7GI6k1kyKuK0vkq8mEp_lflhIGr04YAzbvhQ6cPaqNfXXVSliyFW9NpYCJVhRp9dm8Dn0ZnSD64lH-hC6cd11G-mtIszg-bzeVSctLN0loxdfZtQJL-fpRdulxASHVkdnF6EPTsEUFtU1yV2kn6Bhly8dJSm_ry0cya1E7DzYtHxU_AaPTLHLuO9MMw8hnpCvfollVSUFBDOor-_KJfoCCpWbG5SRRn9pZOK0_zEzwj_K_0lEBibxNMCMIcOPDcNqKQ2zMGwDjpf-PjAzIZ2FW7zvABxmfU2GG9eoGOE1YGystrJnqxhEbzyAzehzZ6orNXyiDhwr2I9Ha8l1J9Lb85T1T_KdPR1yahybaUWqSKpfbdcArMHjCN8_ciVAVGvQYOs9vrHfRTqQ9DtIFF6kAyHQLU0F25EHY6kw0o6EJUdiG7oOHpU78lzVxa30Rnq8w8wrzdHt6ShomwI5-XmZokxaSQ4QPqeyeVZoOb8WiMEH7JS-l7HmzA9EAaberPb161W-eXmZr-caQaqvqYkm9tqcc0EbzTQT3ZTAMoFRAxWoQG_qYMTxmxelL5lCcguDoMuaF4AddlTonMMMVyDK-l5AdhbLBJDTHp2wWKAQxRSMwURN16X9kYWcpdvazcGoUjV0bnjyzBiGaKdq6Xnmg6iK7SyXLpLXX1SHwR3QCBG8WgtgHRUHAyGDD1ZkN3rhJbEbWU-7cgODTOppyZ-EpZv_exegum77AOiuEY6cwbZsE_TnxKopSqiDD-lDY-p2NiI2yDc3dSz5K5glLikfi11SpTIm7L_dFwulf62uslRMNEXwHIuL171xdDDkfrqxtVC3bfcGtcClEqcAWrwLL1V0kl_4rAN7IhDTRQTQKR2RjCoDYaeDA21nDAlp4iC098bq8BzTjPe-f8x4TzXFc6i2Tb7Go8qpswwjLCTm1u5pKaULnkB7g_Imjrz0kRxQA8ZI42Ea85-WDPRvvrt39bMiIlqRn0D6iLxQcN6tT-q9WGD3amdM0wM6CcurwdNgBShXWQflf71-vz3VxC-7Ae73t_L8n3uKmFjw8rR9i1L_czjRInrh3RZ6C0XWjY2eg2bmBMg5uWLvRq9qzRR_r8qXaPqbxwBTYNt7Gm_2Uxt81THVWzI79gzbf5o1gElv1kKaZKlp48Toud0rvTT6iif39QLyzwQP2o54_mytpkIAdPBz2e86RQzf5TglQeCJo4hoGNjgM1G5AOYCvTYJASc4IMKQH1ExjA9QIkWy7i2aH1j8lc4Vq4Xr1eMGaNiJX76zWUAK0LDdRHLWMgx0pWqwI51wbgp_UtQoRW7WDFzHHRqgmdwPT8rJ-NXKkz_YVmZaVB4DsPY9fh7fqJK35UyDsumZAGDrGlFf5ITwPRPOscsBfLRUf0--GcgxNQPUWXvuDghTN4Gls8zqxNVyJDwUk7sa7l5uNb1xk6pizL0iiiDjx-ZBupXq4Uxd2jEfwWyf5s0qx5htzOBehpd2hK-_sWMHcMNwGyGzHEyBVHDF4sFVRARGEW0-hGh8KeqGPQgjdkmsNB_VHAtCOWIcQu9UWW8zpyrdIeZKl4AOslrGOiZ_cDXD8wjcefrdFwYnDgg-nloqTkzL1r2FXOESndvImOf-tXJ_Wu1zusstQpkuam1F1IH73ilezfXxN2mmZhwBwd2ITcxxJW6a3AkpM_OD6o84plYL8Ibl_p-x9csjCKmnc5JndIac1Plhlpfl6ZoNl-4oHN4v_AjNxaGYDn2yl2AMxpMUp5mhVsBvbfJfDfzI7s1fkO3Ibgg3nhE7HwpW6M5YJpPRAcBSK6xnupCr2ni43z8CTK_lqvbkl8-gFprfNLOdRHyX5CAtM7taDwO8SX9onT9S2mAAWq7iVHNmXRjrwVDUnfKI4aq6QuW1eBkQ_4rjZ1Eech_bXsW8ZSjukF6QfVUmApLssudS4ARaWfu13amS9i3oCW5z78uQXc2xBjKKl2ABrWLao5Qqd7nd54cHr-3NAt2lxnKGuZkTNToLyHrsCKufbRO80etn3PVyCEcTn_4bECmO6CyQ5bXmJMQpD-N4k6g77p6l940nqqNL4O1M6C3RXbqA6yKohTlrDDYBEr1lLd0jFJquG7nHhNhQIDJeFMtxBV3BM8SoBelmAlDF2m0HE9yihLKl8_K0-OCXh0BKMf7EVSqjFatSGqrZmobDA1FjCwW21fghxJTwqQxcY01QfdmN6S5nnqhCzGYmraJ4HgcjU4gZc7kiC0ymTHMWS1lCgHqD7-N7EQT7Uobnb_3TeLUJtLDun7PmCbd2CgiFz0mhrkkmqgwTWMSEhFNYECDjuoTWtFkLPZ0Lfq2SKobFiU-YaZwE4Jmjw6aM3SxiAwkCNIo7lXsQDs_m8YjQFjXA2sgwOqbmaB-xNcn3y1WDuLCa8pRabtAMksvha2_65VzRluFa-cSZgKWdPSJlIGO5yeQC0Rl-XJrGgQ91pM40a-y9ExnxRWD4JywzSQ-nmXR0VT7wLfJ7FSbt466yOLC5tBQEvzhLQ0hFSEchyj7bLFwWIHAL5B_8j6ik8EqJsI5FfWzpT_ncvS0rC9hsTJAoAaav7Q-fzQ3FhtUdMt1MtWlt2lUPKfVA4Y4ZgzBeCKzSyqA0K3BdzjAjBK1iZ_h0C9S1zxz84xXcITTtqKnlfPbwEo51QNsazk4cDhIXcB8qITwEng1qqYUYpXEHdO6NGyR2IogzYXcq5jKCciaKwOHBH5oFczPFJnQKflWjHFkijzFuS56AqZIqGjGRakrc5RdGoLFstJFxVJVtUJ49syWwsRWpZh4RrVMPpuaNfd5Vls8OrItg0x7vRg1s2ZJfhJPCps7ae5eVi5gV1hSk8ah5eQzPDy4DNk5NV7uTzP0dGhqSlkZR1SY2WVZkBrNhZsGBeUrzrU19AcpTVuQys4i-jEF0hi5CQA_DfjzTTCK9FGQKjcifoPmgXqJBMC3isJBrCKLF4CNx4EzS2QPjp11yzXSXiTwP8UhAsHoe54VJnaJCCAWsBi772gZasXaRXyqX2bxcZy06slJekEA83NU8KMqzsFiQb_EjAjV49X585a-XRDDQZS4VS7FxGGkrO8g-i5qBZtJi-WcwMoqZcaRMC3VyVyk5BBg08jO0FLHq3RxVL-LtdGNvUvbIrKqz_WsP5rqKDuksaSzgonciMj0EHKHGHKQqa9zz2WdDwEf7WE_Mwofn3oY0bCI4rKfY4QJUY4QheHrzdiPayq1hDppdAydCh3LLptPoMrUyejKL9Qomk6PotFXH5tDzSmd8BUfXWfRLNdjP8LhSVv_-FhnfoyXlObeT_FUfpxbZVMWTfzpMsj6RZC1y3aI2WEInhEXNAqKC1C8VqlISzIJinN3nTi4cTCh13ORBaxpmcr12WKxTgTcqH2mk3GcHBthva6UylTqtH00y6_Qb5MJIUG__KbviTxgVFIVi8UIXdCACVcyf-dZzV10YnPccrk7tOQ0UmSsa3Si7DaUJetdYh_uBZ3FAvvl2IU40vakSz1ZqjOemdnq0k1Dnpu8eJDEpxEEqk-y6FS7J55_Qq0XWNGCzmV1IjN72o5GRXxOPTh30YR9OwPjfGzUKswvTITCaMDarPokWF93ZwTu9KFPwH1K_wVzycKZh67jl0ZZRFnhG64DfBkRaionNB_m6tjleQaxmB4f02lpCUaaedtQqAklu8fM3Jy2DQCh757PiT7Pln9awla56LIYQrdQBbZCpilLAKcquWmCG9oCS9pbUZ6vFcfzT2d0Osa5aHENW-ESeXES53a9l3Q6iwmAW2roOd9-2-ZMLiY64B8U40wuZsDsRwVN9tICj9GC3Vy4VogmmLLoMxzB_-0rW6b8iAd7Y-kAZ1txKgXz-DiJpjVrBTtX0guprtwr_InYE0BRcWNfyuzl0qzLabUupuK-dLjPU93nmeybaaJdvLJ6bHzTvz6EV_LsupZs0kTkMHlSabINRl7nr00LorLwap3viy6-sgFxTN1r0TTT0fhqzRpBbEnH2RBkWR9-2fsuT9KgCB0eluMbcpEOSghZFwuiitzMTCVxhmpQn3E73WhkGOj_xVzzWXRVYf3ifies4R0U8i_iZJxetBnPP49HWVpE-Vde5KMV5eliEedPYLkBGCAmj7g_wnRhwVx2ffKJ8Ky1InJcSPrc0hiDVbl0qr5yPz9LaC7oTCPWLbpauzXXy_ZnavxCVJ0Mlse-hc6vparilYVyGOWUtGCNagQuOqjJF0RUIHyfpb34gQ9MRqoJYStwaV3gGeotIxiVNvI6yCtMnsU9KW0DonVSMF-Hgp-NdVhgKEtTcuDWBZFBcQDRJ60LM8mQBuDZsLO65HDWoDjb2Mh47CoC86OipXKNVoAGTlRtnYXQkuV56NAzWf-BEyVjRzlqzWHBADMA0EM_Ycugho6HGYQBMXjMf3UU0bXtL2mcuCxjDFGHp5w1hxkxfmgI1IZS2HEgi5HvzEf-U1U8kP44PzkNYVrR0q1CFaXGXrPwwDCpLF2qOtNy_u__-X8dH0B6WS1xQwsPC59nLL9mgd-AtZuECem44n5NjJ5eymDi2TCAv2a1PJVSxQszdx3V7u2qNv13Z1d1maS2OgcRvm4NPpzNf1_SnxfLYe35p__7f_6f4e2FO2ivh8OWt3U8gwqMYKpDR2dHTenfDCoIIufa-pLlvH0PgpzQnW1stFpTzvZ8OqJB2rUCsPhmVlTt-f4eSueq1Uq9vvlypVfUiY-1V-4ME2EjgyIBOLfjRQf012BItFeHKC8i-9C_cbrGKqGylzSR0CN4Z2jrXATlYyIG2oRO9GWpkTnBjjsmCvv43sgq8o5bLW80OB5ubi4W7oQegnk6mRDGgLpvrC7SbJw_1FSD9s8VUC0wia8fu-dbve3923t6h0icE2zFvkudO_GomnMQ5kkwbnWXFyfxFNjUbJ55oS8LWntp3LcgpUYnEeEO4kBzP5Y2_VTB-JLoU537UzWNL9FoujVtdTud2_lW6jV6k5a9UUewIonADfsT8DkvxUhETEqm6XGPrTNpu3UWAK5HNylGIYi6Qe3kXpOWW8YZ3F3BW3kiEp0R0KrhxU0W7coi_T290NmjKAdlTakeQd1KpblHYGbS-GTipFGQt6OEaPUZHT7jGW0-uzUXhWIoKUJw0bmiUv5IJWmi_c7Szwl0_vtAJqtdZRUBiH2rbZrxMVMQ4gtFQjCmXQypvH-T5Zbs56dmZ09QFH-b46e0c_csynJ8xVAMlAQIV4MTRZBYhAMzyIbhFldem4UK3WSLxRm1Ky-0Qc4hYSB2DZDZUU8h_SNmx6MT3uVmntKpxxqsxtlKsEKIG8YLHlAhGECMdmM0pJqi4NjVG_-hfyOPi5RSmxhSBOKwY2olmFaAITMKA6AN-lO8rAMGQwwwXCnIu0HJ7ztYTGDYoT84r1T-1AxrjEMshf90SLzCNQOr2ojSgGWH4Su3IqM-35r_evDyRVsM6eLJFSwiYE6bpMVatCbEwK15thSCnIgBiFOuGsPjQawntO-TDbFR41HWTswiBjo7xUQP_lbC112qOQMEMx5Xr_jxRBkoJTQg-8GfqWmafp2d-ccWk0wtJmHxQwFF2THWkHYGbfknkihHHZF8sJ2jbeLIoWsKeiHS1pxW5n8msk2GfWtuDqUTSxE8YIkg1AnLz0vYps3PZoQcrxQtqeW0qFIe7dV1KNBGmBuG5dyxtS2MZ4svK8Yfge64LDdjbi4TRCaG4K4xJ6ukqyLMhZVVkAHG_OK65FUILzqMnvYrRYuoRti8JKsgD3oRHGm8HrDMzarqYhbMrEeluiYK0trXm90wrr6L23Yp6Y17jrojDJoJz5rNcvHc2L0COX6ypNKCCKU-iCVnSHPAlq8ih6sUxlb1BCF14TqB49lDFPq0UTrWb14_e5SentFGAq4Bx3vqep61JH8wnbpOC6bkTCaZ3JLiY0IrcByVDHrDAK8E4qEZLW3sLhRPYuGDTNMNdgLIKtF-5j_F6ci1DfCXtjMsAWjcbxr26jU67DWlb310Qx__DT5ctNqbRCz4hIg-bH3Y8kJ64JyP_v9QOj1-wMv_DG8TOP8PZVLCAKTGkHI_gOrobN71h63F4ONWa9gKPS7iux_G-IBrHXz8V0if86chffovrove_uW28XRr67hUc686WlgIOw_meTrLRnQ0q3x0oumMzhTNpJ-F64kPcdFTFc2KkzSLiys_UrMc0it1RswoDn86-0_SvPDzMJyqszQrfAGzWVieFjM-KuhEp6OOuKXsypqSTvziljsBcTnJouNTWm1_XIolztv4JJAfECrtshfheZtKEKHpO1sOLZQ6J86vKM3sGOoKEKfOhiMa-KIybDNAaUwdh0RV1sjfp1ASn7JR-xZN48f27fBDuPjombmlRQTtFhqgKeQwYg5G5XQGfuKjiEX4MCQVYf5TXzTS1NYU-GYalJY1cVi6R2x9GHwY3tpSRD3T2S0GfVRvXoEkkVkEhGCWaDojkYtPPWi5LHVhv9OvhUOlwWhsFJ8qbUEGZucW5kPxoHiOra1igulvNctGayVXtAudi925Kl5V3ALDOaaSdZCvA9dK09kY2SU-ITFOMTT0CILppyoO3QKTTd-itFszy-KzMTJ8F21VY3gj-kA7O_IJD1LKCh_sZ2axEurJd2PjW87o4MPHWx8-tG-3QtejyZ0vF0PaD86HD7c2wKL8HGx9-N6mlKK0QIO_x6Wrv7lszSLVGY8dYtsWWJrX-vjxJZ0JyjmeEf4pflbFw2BOU_jrNUNqKaqKPy1yVIy0-Gz51Zimi07mbclLFWyd5MFSAXsSR3jERcMt6io1Z8i04iHTaQEWY7EgbMeI58OW2yZE8WErXDACuAW2yVjGAr2azme289xu8TtNr8n57Ib31vHvA_3P4z8DOlYvobT_TgffZ48PVqIaPn-U9N-B9KqvPPx3e0uO3-9u8RuyP3xw2x6m_lbXwUS2bzve8tZnLDGB1u8l41rtqzCkpN9q5jXVsiKBs2FVVn66WRhDD9qemyDF6mrrUlJ9h4Y-Z_hiY9vS-o3YygGlDImRYL0Ht5i1L-IxYaBshXwlbhsipw6gj0uAGe1P79nToz-1dq0zOpWnbEbdua_dFJquGStgTX9yN7Oq2qki3tbzpGyAwh0UhmJvXn7fMd8zlYunIGWRRlk3FYcnF-d2kQvrtXWXetEC1qLC96TOsgPGnJAaJqqg6s3mpqiml8uyJLQ42cAOcggl2FLx-Il1AUH0S7Crt1XxjsU4-PfKdV4QaVpzWWpj370PRHKmir-CcTqaAe-r4o-g-Kt9lI6vVNGxq7q-brExa0tV0Q1-UYU1UypR1v2g6NYFC6CZYKL8rk-fJ0RPgIYmVNyFXhlmg7Q-hGjEdIm3fWWWS4QJfVkQGn1vMSHhlveeija7ML94R3XE_dJsuS9nB4uDQEXRUB5PNUYEo4OwnV4kOvvZDBJ6xL9AUwWrOVCvR7Np8WesL0Li_aJTbatZ1tRQO0YA9N2pWVJyvx08lU49_EBY4QhEM2HK_CIGkiy8-YiYufWOjx-qxTfaO8dpEakrhFTY5Pv6_EVXvsgc-T2yXzrGdUjHEL9wXmLz1vj8fzJNo6LM_FJmvmXdDfMzQnwSBf6XKXWyUiqJ67l6NTdnvzDkm1n0G3Yb0sfQqv9krIb2VBXtqQMpaKfB2mTslFYTNXXsXu003AHJcKyLBwV9eTRjcxomOWoGZUWvMttM3GLPZEDSul2C8Z7B_Deugyr2zfFWb-oFAUqOzLu2FsoF6Ux544Piaop5Nd5KbLjxJ6tqYGkLgFHFnZqJKPEnRXSMKpmEU5mWnTy_hNI0K6BLbl9uucUfbZE6vcXm3zRi8DgheOYUqryjrgg5XtXK_qLj45OiUViSUJqot4yxN9rSj918lKXT6TtYeV1V7-_pHSWrjc-Hy7_at4VsAqz_RsdDlaKyxOKK97zNg8wY5Wxs_EZtnV36SftSXfHvleK2KWGrOUK1Y7pBZbZWBoS8s-hYP0mn45woZhS5PkYLOdSh0sKIWJKzNE6I4QR2YhYFFb0XA66QJqLghHfUtjy9X_o6xAxFlBQvg4y3Rflu4VNlsUAKhAhY-4eQscXJ8aNpTAjlNVRb4E95QZVMeEpYfVK0svalGWpK0HdG71eeQfGcxo-eOpFBcZI8e7XW04rSJnRzVoDhZh14nrNmlKZBtKAnjNIPjEWetQuEQP_xOXX09zgvNE2htcNrlsr0aXqubyyIorl1gp0zc1JUnI2wKMugeCNiIyvslHItl9gK32klIJnLj2jLZ1OzGUCnYu7e25m5Bv92fq7DgSrSIppyIX8FxjjHQMsKjC29vvsgyIkFyonQ9LzBg_aDJE2uTtNZHhAN4JRvjnpAmc9otTNa5YAoAMe-SNbPkkF8sfNzLflAJ3nMKu1tyinfxFM_mwXFIzeH6t4ZR0W0xnrIeBKPWNmOXTayQJ3NLDYP281iRLGBlD7XU-zTslxxvVxhy21sZOOqurNZdpbmOueK7AvXNa7qqgrVXqiDk1Vhm8HuEMivdEDkwbr6mqh0tnhS3CsL5ibbvjbr8Kt5uD4NMjru4Woe8VO2Wb8ae33o9rkxQOK82y_0SOd5lF15y777OJgStEwFWh63X6SJZkDBg6MeI8kWZyAp3yTziXFMI5qtuGJgaaRIoVeV9VCwQ0Vq71LgMMoI-UCLu0_Z5ZtkHujRDJx80N1jiJM3yXuWEAEkGmvCHcF2j8G4niblHiRXn6qNsHOXd0ItqSwV7G1Lnm07O9dZ0Ovs7HPbeKvnfHpLfaFBde7ulfmSZjbEGBtiSuyv2RBmHRzV63a7BG3nJr-7mg_j9LOS12TjkfapLiKUYu1o6Bo7XIIfwkd6rMp3VjOP1YouYGZF2ouFteCtavSvJ-FIzU6MizdOHKILZWmejfvuZTAiuBkJ3Fy2n07To2jKkCOPjrqk5MdJwStHyfIoyQcEQgQiDC_mWTJ-1ufEUzBqkUdJfpPTIgBy8GBm9hgzN-KZo_cYgua1fESki-P18wrrqRq8y4enGNLnn27NNVwJlj_BbezWPDtui4iZNhFX4y2lus-KIH_Oj352XG7m7Ly-_65v6mW_-OLSFlPui2ACFZzM1Iv2g_FYMPF47KgXlPA8TniC6NckRJc8M_QrCc8mzzH5PC3m2WZgm0rmDmeW746i6Zk0p4eXcA0GgYSJ3ZfBmPo1ln69bB_MRpgmgnX0zrw56iVlPcp0RABGWeineZOsN8noJEqOKXO7wwtk3yX7Z53ElLfTkRXFi2QQs_cEtAZl7TC2kVfJfK2j8ctkekWZu5RpX01n0mRCjGeBTYfemFfbnXx2hmObGt3l3tZSpIgxhaDPO4ws-E2yWHdC3yGDn3kSxyswpos1BIohpGGco49WDSCIpwQZLrSVYiKH6IBDMDGVoQZRmLFrrTUitkqn4wSidEVnN0fySJnZkIAiKppOTQJLVTxlJtokWiFUW_p2b7sD1YLtdW5KQXKUfeUMVrhUqRCpwyIlFN2kh-MlP2FfGZcHwiaSVDS7EOdT6kFu6pFq8DmYH1tD2XgzG_rdHJyXtI2kUo6bE_FkbFJKXiu0I6IFg-6RvucgCJlYobTpOAArHYon0UEt1kERVh_TdPiNqogRta9EGBAUquzw-jqy8zKtYKkpcsV2Vewm6rWtZxsbVAuzhZJOHXKj4DOhllOUZRkd9ZLwyiidwR8_LdaOoI5a-cyZYCe0Hf8zUJR8t1gQVK7XCxEYEvEJVbmzpGpGMBvluu7W6_oM1--1kdkj7bXDE0Lxl2dsSLVGZxUw79pPVTu0dpJIaHEcSx9PBWvQl2aqmx_a-a--bH_2acM3ZkJs9sLQQTVgLxlNrl1E-dqYsQINl6bxx99I6KBxqkWFiRERtl4rUu4YE98RqthtzCRcURFCKBqvpYRAqJHdZiM8P8naLCknhRv1YSJl7Aw_-44t9DVJLxJUl6dJ21l-Xn5WxscRZsphe5AOiUVlwXpiXU6NQzodp4iZUgrVrT7ulRsbO54PRB5bB5DUT1kCR9uBQ3Fkhy78CdljTYJwbGxcD5LS5sgj2ePAtdrGgnnHgplG8ZJzTZwWk-x5rnMe6wtQ5pem4q2P7r8HDzafdDbvDue95WLw8d9Dj7jk49gK-alMrUAt40adHDTL2Yua0sBdd8-E3XTPESUpOm65xiSCLYI8aNPOcApnlND17lFu-cJeNbCJPGdDo5dGzOVARSeeA9dccsSH8k-D5F5agYqVjr8WqTT0ax9y_z9Qw_luuD5Y84MhNGRI_g90ahCa57cHlEw_9OJARecMPjrD24u2d5sLOItb3uInZPw0-PjTf2o5PyEHGWu3Re03-Kg2-v9C3TTi255HlbI-bu32f6jIhzGKfWhDg2fUeYMPOb6gvlBVoq2r6eos1prR4REd-8ScZpd0mrQc3zdKnRYlRBZl03MchmkY5oR-pxsbXaCXmhgOPJU7k3lvpm91AYYviBefgZfnJ5CKBKyPeA3goYZ4MRlHUske8UqjhERRCd5JmBZnc7PIotHXTeqeefBaBCqfgkbsBAZh1syCo99HRSnivnSGtN3CEKqxd4qWMgmQD9k2a8VVMpRAL9_gdCFicMOArWeLRdERv1Z2CiV2KuXjlyAzEsisJHQpwFHHLu9mgh46qn9zE7X1YRNaCt9hAR5CPGRvSnP8W3XvEgRzoz_ZW0B6XsrTszfib2d8BHDSiaZnMNDDoY098Iq76Q_E22YAlY9IuekApm0w1SMOItU-y_Qkvhz6XMJjDbRKggF1ZjBgdQ_P8IdNgnfqBKDp1oLeoPnZYv-jzNV_uCcefdp3szclk_6JgYyIE-Nulj0pN_Klq1-7xV108LlbqPeQUJo35yjK9abT4lQ2YqTp-QbVV1aGzMhY6RrZeSZqCvNFpyi3mX0bZOxdD3XZK4Iw3qEfDlreB99ulA-uJHhsdJcrn7aux1tz_cPB7Q--2SPWBgxTQyufeAo2G0NBH650A5NCfTQAwgMtQ_m946-J_LGS2YzNbDNRbb4DKSQOnYbB93wzNXtmamoTU5sQLwxdBOc5DjKEDkJ0AvcYqSJQ_d5sngXO7mmQva7iLsDmgE-f0_DUJwg9BRD-3AgtE7oZIIgAvMSOiocBkVd2i8XMPAsiFzfjT6Ci8VTCzvch0EnOXl-JtVvzhkuf2AYfC_o2mCeQAzuIpOioPBv5ztanov2FmIdxnIMAHMMeCEwqy-ByFvHR25PSIaant5XxzDAGzT70Q5SXXZ2BUvhNX4mg-at9iM7iMnGsj2bHaCM-pX3A7OThCT2cpNOx36WKjGyReAXYKT7XyQx9MCqAB_BzYHrkEHuEzlTfiWZFSsQ_Bj63moIBc-ibYBbkCcN2hhD4PQSVmP3Kf_-sLMGJODqJskd0Ij5gA4Dsd-xziVzGVnuPTLac133MsfPg4aOfHz95-suzX3_7_fmLl6_-eH1w-ObPt-_e_xUdjagvxyfxl6_T0yQ9-5blxez84vLqe6fb297Z3buzf3fzkzOs7HnMJn44yH6FbU6jPx1vGFj0w5HuSp0YoA5hYkorTtg-9JP7Wd8rEA-m1Rreu9fdW9jHffNkDQ2oMbe7t9vd7dzpbRTe_fvdfczOwO3t7nd29iWpJ0lEKEqZPX7f296gvVk63doYNUGymdHsEQ6myX56Y2c7qoobATsNgvY3cVLsi2Xh9m032tpZdLyWG7W2N7a9f297_QgjigcJdT3AHHHwkFbLoyH1Fm7RTKMu7ij6gq0h-BO3u0s9v3dv56ayvZWy21x0b9EsV9GDNK5fgvl2zx_0unt73e293l43Ud29O3fu7HXv0lm2t-MPOpejo0nv7kjv7O_0er3t3i4V6dy9u9vt7vX2e90ulev29lFwb7TX693p6c6do6NOd6e31zuiAnd293p3d0e7--NEdS67nev_624fJSA7ERQk6O3uAYpvSxC3KBmnp6636KjsfT0gpiVCgk5iza0TNcNeGNHbhP5VRs4mEhQl9Mf3SoOJ_nkrOBuMVwB0jCBifbFvJkSG04FqpS1yNqRae7u7G-4oOIf72mZ36Zujl6P1uTa7FWzOBuOAqup6_55ZdXTLnXFjdSu1gQ4tVJ2wu2J3b9OF5sHadLR2vH93965D1g7RVZHHgYiSe9t9s97HbvYOTmwmDFNHlemTj92925TZ3fPou35BMFjLk41kvutHCC5mAZTqq6BFAoY0-4wgbRl14dgta4GrfzWGzR0a0uRjlU8DWiyoI949QldWd9wcXke6krCSfCWvQPcT2_16xasdZYy4t3NzTB-8ciN5IIFZCdQLhRENUjWlkf8yyIdmdGWcqjR4GB8_S4p2lKNHL9xcuelHSWuM0bs9LfvDRlZFKIbNrilsI8s9e9GMLNdK_71SYiX23OaPvvT8tApQub3nLbGh_grmxGOmGR1_8-WyDz5szjrpuY3ttlaU4QJhT9w-pUMnPpsSR7a-aiZtQpgalynr3BNlx2whwBI-f-2xZWmJd-UPwS3nOhP7ijVbvbDWedtKs9jTYmWlCal4HFVstW9lkDna_f20tjy0d3NaA2KIJZxcPTRs1M5nR5GAF1HO_XICcmaa58bMxsZ37luTBBv-ii0Taj7O_szt3u15EmFKFP82yill6bB7d9fv3t1pFDChR33XuLvWnK42Nn5g-S5O3feDDjEN94Ju744H43kZn0QOpIz7weZ2byXjvnxBOMkbuYNeZwf2wbVsQmC9_bJSLrK_UkRq2Nvd3TZ17Cp9__79_Ws1bffu7EldeDK13b2xsNS507u7c3fvDp0LUnaPy_Z2-Ke794Nmet2dOzv723s70lb5Kg12O_-gEjON-zs7e3d2djp3tu907u7uEinoWSPprbJvezjd_1299rmVriqklUJaKbiVgo5eTo0kNeLUaOgZL3vqfedyf-Xc4750Lu9Mmv8L3Znbg6IGogLPpyUOTcu0YqpT___Q83n-7iha57_7ZzvClvW8034mahLmPK7IMHjPPZxNJgR1-xwsDAIPZr_3dlyOiEq96mx7auSubNQMxteAvRqoGzmRT6cuYgo0iCe2TK7oJjnFsn4iEQAbx3Hi3Qd0zosqmFsZee-m08FWeptY_a6_44FtJxwBo1NGD7zIefPIT_nIyu8B38zjQYRzJYdTahEnM73kPOjiPJtHdOOC9n4ZQiy_TxB0d3djI7-3u7fd6_CWbbXS-0HWxJlvDp9s7q8Rg0EN-2sx_Z6esQIsn1GB46iAtiTODFKc3tTNqTSxWEzv797Z3tn-uwZyTYMY1yovHaPWOpdOa1qdF6ALnLUIpnBjfbnmtFJ6JYYIQfcyCPyh3mJEsNdy3W6nt72RE2XZBWnLbwhpU85Od3_R2-nUE3obe9sLml-BwXrGotfb6dcm1hY0SUSa5_xunT_C2I_rmDwS0LNaRiIqtrshoea9Tmvs-WPGf7J77qjxkFMYn0navhrzPh2bfdS9ywm0jceyjctshTAZdQA3ARKNTwzRinIe-A0DW8SrCN0q3DlLecBsut4WsYhsTMmSYUp-Hk-nsSwZ8bp03jHOL-5V-Eew3A5v6RtxUA3T2a-7d7p37u7v3SWMZ2MudfXe7RtaFOwmCCND7T3-ofbws6cyYlDoobMo6hjyB_2QMOr_tb3u3buE06ompS2qKOOKsiFwINydscb-Nb-tKct56xNeoYKVAFac8WganZ7pMeeHrnsSQCRcAx0DK10a1wlBxEkNVrp376gT7tSJwEr37j4nUJ9PpM9lNsHKmbfSsWc_6Beld_d-1OGbc-iT7d6PPrk5h9H432Tt7cic8ITW4LWKc5pJnNMqThFHaC1arWaJgs7WXWyF3n4LgX_ru40AqoQP3m297R-Bj9I2zCbH3S1bhegqh21zDpXlsn7qWIEJfHmiDXaOa8dCo8J-7bUYZ7PF6g0By39UNszdH2W5EqXC_3EJ9iPnDflPKGdoyfC09pPTslRny_lpbRQlRmlXktEcjmBZUrBTG9-s4rr65ULs7FxfiM7qQnR_iE_K1SVYANuYGRob9zOUHZiZYEZWdHIvJta3dt73bkdVvyiv7xW3g54RQl_n7zJWtURgiLNlNIiHMHlutar2RtfbK1nmHzdbzs3_pnV-0RxIoFXObtWTMrRcobI-qHS4kTRIyKxBQnoIe_kfG5I-OsqJTtBerTw46v8QSVbma6_-OXDL4Gb68wcItAYnEr2tFsQY1FYdF9RoQLYCXyWuIEQ25956LXp_GQCpXIT_Hae4dnRFxAmf6GuuMI1pVmvYAw851iX4g2tkl71_1JzsrFoTzcqgq9WnZ8WVqfWHx8nN83GdMWV_jqTiSj0TNDCCDyBjgyyIKrFKVnGikVtuY5Zu9GvnODNplggyGcy_IYvIQJM1cwuwdZ4tsbMjJXbv2hIjlNjZKUvsmervdm2JCUrsdbgEkTRsoV-XmnDyNiffOPE81aBAicocddeMYYGpbqdWnURzIka5ntaRtL16s1N3k3gfU8Odazk9k7N_LWfH5Nyt54yr2nqsmG_m9ExO91rOjslpTEnu2uTtZvK-Sa6PeC11bcO7zWTb6l4z2dZ9p5ls626MOC7rvttMNnV3O81kU3e320w2dXd7zfGburvbzWRb904z2da920y2de-t1L1n0hvDnNTWqbt_Lce2fPdajmm81xjvqPZNr3stx37TGPWs_s32tZxyExEPw5sIsha7Rzd7u3sm0JC9Y4g1Rq5zmh-fRaOvgo18B5z1TTtIjE9ADIAKqPFmbsJxUpjcIsz2HGaGx_oVqjyKkyi7WmOjTlfwD31QRt13PIt2iekjvMusHXi8DpAi9R62OoQPS5f9CmuC4igRVQxPnRplQEcl7dtic3PtfqcPHt7K0ywiy1rAXxsxBBgb8O3MNgMW7yHinDCF2W1I_hWVtN9YR-6y2XSl2bLFf_At3LPm1ZFfCj90-4jPO5XQNGG4L9mwvYpJ6yatoFAC3mEGNsYQ08R8InwLA2Ytg4UlyDAuFTUqDQYg8wICOyIAUohN-iLI0BVHm1BHKjdYbjtqEFo4wVnoBy8tvmGkmpH5EleDyJQM6DQZNg6aBv30d9XQ-VVWUzu7rtcz-fGQksYQ3NVgTTSqwHFEUUEF-tn9pL8CM5CPivBHnu52Nzbie7TVJKDXD4QrYgvUEK70NhmMc9H7QpQRB-52dyNm3dje9oY0uLSsc0ys7za3tSOinKTV_eetbd_UWneXW-v2Fm7Z3o9b374rre-b1nv_vPWdm1q_I43vNxv_r535mxatVRoTPtIiQgiyWCn-G7ESoy4PIrXYypWjVnCTbjquRBlUtNvt7sB0Pd4UIZT60VdE-3YWkMZRyzcVYGFVvBAxXf-_DZOJGHaCunlk-nKk9Thfw1fdPdjojU6qQHER2FMV8WUZdseMb9p5sutAGtCumNZ0FoSR2UHf6gt26jS2IRXZvvUeQQtkM16Lw9VCUV6-9qAslzc92C5xo8GCNCV6-3bBa7J_rfqsrL7XrH6nUX3V2PYQXIiHsKwApu2hd7viXlBgp9nX3WZf9-p9vfODvrayra7e4x4zkfKjLv_jGUk2g_2-zCaTP3_b6o0kLx-45rwlnEYn5ziyRzhOTo9ORH_OfE-mUNiPlhLDLwnmJSviF6rGmFBJI8hFMj9khN9hoioqvSAxHlwD48hlCItfc7hILhaW0HCGQUI9QC-yvxja5o1m_lC1l84ycB8F2V-2EW9j41H70yedP0_HM6gFVy-dQzz4lxeJ9d9sI06s-whB3Fke43jhI-s87D9SWTdwbmV64qisV3OeZxvwp34WwgXZxhnC9Z-Ub25osBYxf4oNecZha2mlinhyhSC23eVqxC2J8c8RacDL9xDTBq75M8SRecrG8NQaQvJG6xyq0QTB4YAyjXjzU9aZcgYs5SPE2YLGP2rcxIJIW7qhbKYqD-Rqiq-1AM5PhXk9rsd0Zs6T0Av8jTc2EFuVHbYlwS1DN7Okpbrpx00RoEMMHau6Bll3CHYVv0FqOl8OJ4N3vZrj109r0aVLsQkhaxhplqZbVgLCdlkt3MEFARAIJKDPdTYZvEnYatnmdXM9x40XaVQx522Ab68eg4iN3ljyGOZik8iiJ_ZAvTawYc3UWZfW_eKDTRRax-WoY2zp5vk19-4qXBXMnZOwh2C5N-Ti87IAZH9cKAqb4Rn5zpxsr2mrwpaWxwJdGaxKXcTLF-gZcNIQpnyuzS1MYqBVY-HUDSHjVqMyZescrQxBpcv4SHKFiF_eXpqY2IkN93bfulnL3GR_sOsB9knzktQS650K50Hn3kjH55BKgpd5ynHVaQ7EvRyePtUdAVrNv-Rp4kOfxwagy4omNO7nHIMQcZ9xl0cofhzS21Xxy5NS3QeXWxjfrNi-IWxVePNK37jC2Q673LLjuy8viKFkbs0qyijtNDllSdW4JNJM3R6DShUJjn85svuAsROtyPvqnB-UwV3CP_zsNzos3Kpxz6tdyxZSzfGPRFQ0V9lTiUvD-6PZ-FKwjpWrw_gdKwGfTkYoNONwIQBmF6RqRuteAUzlukOzeMC1qplSw8XwnyaobiXD8rYzMePtZ7swGNr9uw-FFtoOit8RB6H4yzp6HIyy-Kxo59lIOf-CXe--KeJm2wOgO3hDO33k3A0oCXem3Amyfc4r3rjZXfBkYRtO1CrR4l_oZneIbTdu1pIX0tYa52_j4oQy4bz7nla_KAOpwX3_Emu75X50w-BD6HkL9-OHNp63PG-LWreRG0LH49AnCW1FfmVvLupgkpQJpwmdj337NsuN5neQRCqJCUYwX4MkVUk-DAbFO1W8G9L7VCWzYVAc4kYtvtJ2nsCbqHhHu92Wpk9xlRYddXgHSkr4klvaJ4nQoCoZX4sP15bbCrzVW5Encs1YWBbwNQeZMggA920n4sOylo54xcaOKtrxGHHEuY0l9ftcJWem34PkRCXHdhDsG5kccRjeowCbPznDE-2v5KAMP55ccbELLnYRrCNEu3Me5_HRlC8ItpFa2pwWwxH4AFero7pj-kKtE375aqvrJ-duciXwhqY6CnVSg185QD0dc8mBeepnqWsCwgwcxDk4icea1muSaf1dO0PGJMkpihL4rZTNT9ILKgvvs9N62Y6ULcPLOFWvxcXOEdSbXHFU9eSCRiGf0QtmpzY1MohD7v4z2_1B8kAlj-0UXwYE0fMyhj_34pCqfOza76T7k5p19I5E_6-uB8AGVckLdjhYx-eu-b7D3_MiXbZNOHmWGNQmY0IjzWkmJFQGzUTyoj5bztF0lsmYqY4yhHxjkiT6zsAhEoI-SagyE6Ci-Ya4C6sNJUREyTS9lJjPz-jd_RIcEYFyJM6oX9oQCAWbcBrFk6O-UNphdBRs9tg__EhSDuiE0TD_hMMqP4tvcPIIvsFH7Lc5TWmq11Y9hFXCvinJoyqGIQiS7Jj36nNBSo3c0HgFq-RTUHxxjUNw8ohO1ytKfFO_odhGDDDhj0vnuuRN6Qjowbsv-VI5G3_oWIdkeSqMpzU8opafVXIrqNsuGMz2oeOUQSmkQy0OFg0reXaFsbX4uIpuSajnCYylv1lPmOSVRKpIvhF6gMFqy_nktJLXgNPXklWMAU6bVTzX5FsVJJrYy-09RGXBrfc1i0euxm21kifNdJVw4DW26k9BLb9mo2JhJHjqf5ZLRH5zHWudvImHzR382bev9n-O2hp0uvsI1QYmwNW3g673Mfm-ahZF-4mmZaO7e_--3trxGsIDavQtPFOSh8E8HvvJN3WiadMc6ajwcZkJ5fwazFnIQoCX-_NB8m3oJw-XNefa-RJY9U-V_F5i1d9U8tRu-V_oRFDJOwaRtwNAgUd74X2J9JM_quDqMLoiIlLTKUONq229TUU_MS1BNf0V1Px1CesOCJHaGnHC_VGHkloxLsH2d6CewhU2PfmLzRXvuMlb65GU4JLGQpkoaQKk94-wBwlflwEyXXzza7ucCL7H7RdX2GvnTPzQz6KraRqNETAx4dCgyVME9nvLF0ss-8nU-inM6SDIhGsr7_Ys3FwcOg6KNCMkDqB5VuhT9wkhtZUsifNicgHlCTtREmgzDDchtHb1Tbd3d69p494sS2T5-IARaU85HYcBBtEfXyP0H42jjPcq00QH4BEjMNyR7CbsvMbXGJWL4BkLwJX-53ZoShP18I2_vlb7uq09tAFFPL7QiY-mXwLDqc3hoMyo70eVM4uCILq1Mo0JBN9QnQm5FHGUYasZVdFIn5QLBQ-iNu073syWkHXXEVl1seD4qsREfJN7oYn0FhiJS-hIl8RL8n23HPYTZETsZeYSEqqghCo4PpdfJb8uVVTJJzkTX25s2E89BlGV0sQzfKcVtNKJVh1vVR0Ctty-sVHE_njipriFtb8K8VXFDNg5A3ZXFtgpoiPTHbNTSjSiInyQ0rlPtDOKqZSjTi-XlvIGmcDnIxXgqzAcQkS8zJu9XTgc1MkIe1lHAKSx2dU7ff0ntRfWGqy4UsjkEEUqafYIfmrJw3aJ_biu2nbmXpYT_xBx_CoaBe5addokEmr45o_pJHxYxbmCk1pFqtQaFEBYcnBPe-0MqEH7QqcmaEfNV_zJPTVs58N0Ox1u3RIZ91SyY5HxXgB8My-Mn1kRdCtPM5Fl0YHKYamToNtZ1pjmSE7ELEwoL_aa-8viJVgiyOUDfOHQTVtQK9SR-knkyVakeW4VNbcJiRGRwavXxH_Nw66f2LiF_Sn8QoyzL9RKcPPAfU2I13iPL-DC9WFwY0FsOMR-lK1nFaIm7iP6AyrtPBL5Db4otnoQq5mLmTIrWpnzxUZl6fjHiANx1-yFBxeY_AmxQDfgEWJ_5iyCkviDRYk6zA1RctsT1WWuM_nqFkcugjV5agRTRG8p1Fa-sfHK1S2nGVQhGn2bxZmxzvLcWy0n-wbEvVu78HpOQD5CrJaAo5ULACDkb2PN2bOJCuRBZpLywNx8QRgvgiDM3jvCXHsOWlzWzNyYlfOVZoRtki4rIfgyEjcNItxKg40CCVbKK5IQWFCdsGVbkYdwWG2WG5R3s8rEJHsiEf3d7Sq5y6kwYbTz6ja7NW2J7szc0D3RcKmgfXCqi5N0bAROUei8enlw6PjO08eHjmJCBFHqN_mJEmhKifqPo2nuO3Eyms7Afp1CIO6M0oyYCsIeY9z2MHfY2TIpNmGJBw9vfVlsnU2jOHGWCtwDwtDxDegmFsN9RGSx_RVHHep17e4aAoozYoY1gjPIIAgtUK0ECghfX4rGLqIscT-_FndSaNNx3c3aJIqnGmEg1qKigJURQsC3usutbdyEY4DsyHW7rcK73etYXi7FmjSJSdt2VDPTx911jS7Rzk0tmRUSEUAoo5Lw0aZ0U89_2q_Z8qwHUzoMdhClmYY9BaHUz12-CCeJzuPjiDYOYZBk_JChFhI66tbDaXrk2rUbxOz2bTFubcLhK_zKdeTTNdRi5oP2Bwjc7WDgCGekwNI5cIgWxgGyEonrAfZtn_3vkm3ljGwQIIdWP55wXB9nJdobsYEmQpJjPKwVn2Qpx_KxtzOp5G5ZK1xwqs-4-AR-vCh1R0rt2w-J608zBIgyB_ZQRdpKylVU3qY7Lw_TMvKOOSrpSI_k-kYO4c_h-pJbHKhAAtSgvWKIhdAlxSurPGNJvxGnEImO47iKb6EfmsiD22hALh83NxR55qJeT61cH2tMAaNAiMQ4KCJ8HPEWiUO5Bp2LVrHcJIyHfaN2V6PEcX4zaWPjNargKVRFGezHXEdJRENMbd-fM06MQdIpRMCXMMdZgLmBnzpf_gZaBeev9TIuj2Wl2WSe54XJ0t9YHm8vy-TZNrE1ZZPF5bqlZZDmO9QTrcQhsLAcdQd3880CvufVxgXPjmorS-iRjju-gDzjYEOMe-XiZoQsNlfdemboMXSDv2mg177B9vBbzQEbmZXaSpdpQ1POLDDbP9k1t8qvr7tcPK_GVl9RWc9-ghgZbYGr0i7jHe7P0W0A_cZGyiUYz0oBuMbYteUTng6__xA-cKN6ND9KMZeXts1eIRhllkMIgWJG8zgAaEdK8Kw_tqG-lg03hfXkeaUGG-BCWdqZuMumctk6cqW3niU-eMuAOa3qNtHBWNbIhZfmRoqZwBpUKjN3qkbuDMvA3ZvxjTlLY-tQ9lhXtUroMCXBeZwXKRtywYAVKl6nlY3b5W0gbu7xwHD5b7lt5zVeHcDDCwZ6ccxR5kwMOshJwvZKElUTVvQ-6_gQn7-8AwXdRWefuDNV3apFsJAPiiEugwCXVXaEWH046DTviVkqhjeJdsVjRBCw_w2MJ_8AxhPD2StzlQGDcx3Qr8MtoTWBUlxtWwNQJbBSCyst4QHt8U1nze8sd-NUWLgZO7YyFpt1NyUYkng05vbH1UB69Uh-Zby9Wkg_ZeVwpSSNhV8iSSvdkKF4mxtgSsJyA9TAtbzWwmg5_NlSomHQ-kYCrMvaaR3YETPWNSck4WPBUxwczCYmZb7iS10QBAwic5uKO2d4s93BZsOVvpPAuqqHP7t1fFOHYoDHrAySxlHU_hkw12EZ5nXYTYKYaE38CrCjOswiGuSf7kTVDtUBQuwEswEQhBFqBpnKDJKTeCIxLq3RS7434jqIL5UEgw3MncF8Astc7HuG-CSmtWi5dBjGiiHSC0OcK3Qql8RTz3VrE6OXTUg2bCydXa9FTUn7twx2xxIaZsyqJKo4rA-dTvNMjXBYYW0ILKLMhmYpfqlUpoOhcZu20Y9uOtTK4JqhidEZ6n2iFYRik_hdLedTKTerBdz0ER0WMZmxhj7trwOe8TWNiCq8taRCRM3PA8tA8o3Cke1kbO0ob0Ag8U0IRIBOS9AWZFkZ5QpmiRFtljYcTee-4Sl4lP5cIpNCJLDkzOzMxT3eQhcwD0678vTMl8um-XmTha5eI3hh9E9Au2ToEogmpiWnN59MEcmQSRpOw-XKnVrtsWX4cMrqoH4rFJanHZ2dTa84dM3jywIBj-ns4XDa1Thl8mWctWPHBh0zgjq1HlVG6ay0jj3D080rEpMwTiKqOrNey0rgWozkUvPE3r4ATc8qdZqLwjqu4ipm4PiNPGnqgkeQOWFRDbTqJzWzUKYmcKaU4WKLxSK7390FU2QvM3hCG7IieEp0ULj16zTduLpmU0W1KzdVhkDVVQOpFUhvbEwhV60ND2KyWm8BRwxV_pRjCL3CJvHLzk_dVFSqjQHqY4T9zngJ-QPZPPYKoK5KrKSPnmcSxSuHIKAWsYAtbxh2cXzLq2sDWoTtOCd-N2EvGr6g2psZkaI5TiMbBG0QI6ZFMXELDqDGF5QMxMR2Y2P9NVFGWcm115qd4m6yVNyfcqvOHxg1DiUwYc47a0ZkuYqS6sKtiM573KjZ3t4mHEXnPt-yyS9pTV0AbMUCnlyzgeTLo5zDGZe0O0cXFb5wECVDxvAcat3evnpNr0mfCcp3m_rM3Q7fWF5aGZSR9zlo0r0szHx9vwhxoWSEqz6E2XwNXWwJX-auMkw_ZCc59BXEcY9s3EHTXUR0otUp40IhNHqZLA6wREUAf8UJMfKZHuPmjvccGO49kZIGMKqrsNR58E6d0b-ToIM7N83lfI17JgN3ag2KJIbZeCYBL_1OLURV7neIUIWKWCUv-bpz-k-CCRRPXW_YjwYQWqposDukkzUa7MF6UF0FA2RLGXUURIcsFb0Iqqq-BptddVBdkVsE8d8E978elD4NbohHfxAMEkKGRXrGom56zDg9k5ejtCjSU5uFKwIoZ6gOg4NBb7h5gMPlGT138Uyg9yA43CrMjQC4A-Jx8IzeOUo-Xi-D8zCK_ShSLwL38P4lfX47XSwe8BPOq2eSli0WjyUNO-iMlu7FxsaFexa84BPmHBYK58EZ0rz7CMF3Q4SwTYJHVNlqnagj95x2EGE8mPfPAFPMKYhe7iZgyr4TIDq1JEe9_xHomaskRDxTpTtAZD4gmjoc6wu-dSDjq_LoTBQnCD96gIDCNdg54Vspv1Hr7-m0lDs6sB1n1S1UvPYvgyNYkQTMn_B1CHKet3-IFQsxd5hnegrSmPNx4pYEiCrB-eVKl1AnnqbEcRGg-FNEaaSVP43H46mm1y6_CqzQa2_IQU5zrRP_WPEdsmO-_tV_adQ38NDf2BhD6FBP2hq37S2x6pipBdggW4CiVf_qzb8G9p2RzKMgZtmckUsCXub1K2Uxn-NlULxwH0Hnrux1xHIXsZpCRi3V3Q-6lHM7lQn-op5XOOow0_ptNP1KaDNWL9KxfsL3RLYPfnn59tPh43eHnvpEOOONcecWNNF_c29SqVS_BM_bCfUTX8NyQ1q5FXyp974ULYZS0adWcKv_6X4wGbwhxCw3Qoj7z-DNv3scLfhxMnZYe8aqTGfoflEobQpvfmrd8tSbVuvfPW6Ql--JXalvSznAbsQgrwLGCjSK7fDU7agnm6_UN_o3geLYrpLnu6duVzFA7Ay5zISWv8pXp26v9ul2LQuCJrbQfh0IZrnXCTfliRDqd2le0tDrjvo5MKjkdgUBHGnxii--hInwd_W9dejdvkIfOeG1et165m39TCvNdNtU6VJ4aPBevQnYyyvY0EOSV-G_-2mY-iUyrBWKA-pBtEmEGKRL1I1-3rbbKICKHbuf9YQ0dLY5pt8g9nDxM4rX8YjK29gxAezyTcQ9IvK32IZ_U5rLefaoY1UrW7DpN58iSswSsT6IZHPncV6d-8mx4aD4_rMDWJFqHJl_uqPyJD9wwbsV7VQoBOo5kxx57U72oHgPgxnaDUm_fqXnfMlG73IbSmFvP8lUmgGgBKkky4DP_XsZeKiwTcf-FJdYvG_XSgHwDSGweRfagnixkF-gclZ1BkSSQnA3F0YBegi_uLez3wmd0_QonmoHvvjdTm8nhHpyygG1xzr_SivsKOm8Px-fZT41LXW8ii_19DU6oK4NYRol43wUUSMRTwfbpfM5UuJ8XIf5KTqmMTjqJMoP0xnRrpV0_zS65KRXMJ7KCVJQ_gGK1wqVaXxW-F_DCi1TD45nMHSDeKv6oky2V5mW5kObHHOVuhePcXe3KecLJ8io3Mct6eosi0-JSvJZKwMrUaKU4NPkQ4HiyTn1HfdSz-MoiXyCpmkb7hrYvUYo51md3vglB_TMKQWf_UWfKXsxufXy8GxsFlQqByDscHDg5cwbqmhm4j4_4GvL7rCdMgdcdU7g0-CJJN75F7zjia4u2qxeFnNS50t0HuVsxorwvZGVQtxh2X9ARzpVczSjLZxwRZnc5eZ-x02ODxzlPHxzePjyhUOnrvPsxas3h9yHjQ3K3-ZgsnLBgq1COfns6DQuUD4TO9ZoUgtT787tVVrlpVpyFBaPJYasU8QFQWt53RedRJwcsU9HmaiFXDukT22i6hLPpjAjVDd-wsqwBXzRiBoJ-W6oSh1PaKNkjErxRint7OGmbSaunWfPn5aTT62zNsJNgrmW2-j8aMJ-Akv1zvPf83W40bn1yriwLM5F31ys7vLV5IHc36ZhNVt4QIsspCFc9BaoiPj5IsKz0wgN6xg9AstkJB9aLDaSeD8gqg-RWoeWz4IXBGHA-Sv3M8IRHPN1JZWFICTKcOZl-k1na86tualh6UCMCRsHLoRw6gULN43zWpQg1J5ENkgnRiCzRhzJKVBD-3PJz9fuk-XbBYSnr2mr3vdj0J4xDeC-2LG7CXiJNl9nquamb_6FmiUEXIDlI80sVxa8Myz9BIOk2c_RxjSY_0CKMa8ES_A0eeVCnlAKY3BrKMRn59Ql4STelX4dT9wIxkly_7QLGUEbzlEZAi2BNySAeMc31QSgUFWpxNGwnCuFR765IBmqFGJh17WAEhH267iVnhYJtwzglpbm5eW0wDSjSyLSCbskGa62HQVRZh4n4pcigUeZX7PdNm4bEjvQukq5xXtlFlkZefRFYEqKbTHjSMfMO2wkeaJEMjaqyZJmfG2GqAbFTsqa2tVe7ndhGaWtEE5bIVzBlIGCu1ElhCsLWB8WIR90YO-z3fo4mA-GWw0XkszzaSfR5hP2-l3fiLaIn3llWHnx4-C9L7Ku5t3b_En0kFVCErk8oG3IAZ_5TTGyKsOk55UiKfq15k5FpW0QaBqVeVTvqsK_1Qonwft61h91tyxCGapcxLPFIvqF0U70O4bx3idCx7p-vfMqzQ_Cfc9NCNk9Gbh8ATNSn-sIN3fp6S-T6Ge4Bz682_HFGWPdnWxsTKw46jwct7q-JdaJUad1JkZLXOHHHO32pD8uqfn-2Ma5OybKfDzsH8MqryE6LcLwWESnss-FfKIdweVZ7eIYDOJArgVopi4Wnjfia5_cojbxT5Fe6aZPiCylZ69W4i8pkddK5M0Sv6AEK7WIwja35dWyf3c5FnxgfLna2uIS1DM7wyppdmyoZ8VjpSW-PmtTBvBsieV27pDWQdF4q9IIObXHqMVox7w6RKBz1EhdtPbO-svDUBJXdYDvAZVzlqXQ8jyS6SOchLuC33kSpAqR4MeuY8JFbVZzrJzf02iMm0BKNOk7KqpULcS1xGMwJWakF7BbIPo5iaabWm4NwmiXBgclGxtmqSq5a8LK86X69CnODw0uf084EteaxMdEsOPWnPWuuqA5Ms-w9__TrayXMpHrw2BRrAPhfmv99rNnVm8k0GCMw53cShygI_ukjMYYgjh1Y5E3tSJGIfPLkm2pPVHX9aerYvggXk1RMRxT31i6lbiJaAo4aSbjCCA8Te3kdUn4BS4ZilzWFF8YPWv0mgUy83KBwLJ4LBZXrBezY-GbTXggzpTX1DGXX7CcfilGsxdEl5wx61KnpaOToJwR8SyQepj2zXTm0FfHpQnHRaVU473F-vYT09iAAAdmv0sOUVQvWlua6ETUl9wKvdCPNUORO9P5Tm5zSQrNh5_YF-j6A77MF0QynYjRKUSBNGtX5vco6KrogocYXcEkL_qqogNjDxkd1mTAVJ5Yr1NQwfJ4xTQUHiFXjOSRKzoqBbGaL-kgKhbXUoJq902YLuMRxEmZJFUSHD-ppTBLl_sRJ_EYnkGuSbkPpNvPuNuPVXRpu_2iuoed-fXoEUu3jPSKPWiix0w9Ri9LvdyBLlT0qPJPogUwdyfnD68OhfYmnMCXKoMzYCeRyoXYBWXyHh5uvNk4boATjceOnNIeWADQ5bjZzRGbSDiTnQHZs3mUhttZOI9YwE5Q6xtPVGvJXQtA9dwEVtMNLfssiYucm2lLJYpxTLNJcw04--PzB6V5j_nIpt8nVhhf-vbLZemzKzTqJ77A5WcalNE0GO8DOme33eyRgiWbXGpCk_XGXNxViuD5iq2RCKxUdKusC7cSyfXT6-vRG1NVId6VLoGjqVrVniGOfwXN0GFNwn9YVn7o2Ss80JHqipLyPk5mdez9m_KR7z5DVFd5Qf1P3GeCV1a_WIKMjr6Zy2tW7gfDdfBDS2R36nxSKUCKymH0JSAP_r6BSacNs_IOUxpVQ-OpwAJOiQzGjUmIkgS51DXNxToDZJlOR95pWuDMTAI3C0O9AzOqmjha2Hq-yiZmAkqGaGwxIpi_9SM7K6xvTC3WLWd7ZZJYWTljjW1cac5d-jQ3n3IX3Gmg_4JY7br2pev3sGymUrs-aaN6tb4u9_VivoWuJXq_Tag5Is7jNe87ena8_oi7bdumiR15ortP6wdLzg2CqHdsO2XDOE0IpbDcf25uiZqZEAOKw3Jyu2COLolScbZwVf2IXfW5ANidmGjTcF6uaO7HCt_45RdLC10qelUq6_rPg3libVv8bk3Wkvs9Nocikiwe5f6OOo2yr3xLqr-_VEZfgytYhA6eGwMpn09J0CYi3ffnfIw9StOvsT5K4UqRTqeV-8BftMrIsryFFHwklQXu4GN_eNvb8vjU6detLLolXwgg48Cb7pY7iDa_40Itt8hmejGJiGozt_KIvsx1kAF0CnVxsQie87U_dCzjHjA1l3t0i_tdgpFOZQBULPl_xpLudTDghRzJ9S6OElKUumZU3nI8QBxXuNFLBUQdXfLZ0NXbXuUDovTNh3OdkJDH1aPZnBFfcQ-gOZgXi6-hsJkxCyyLwOb47tdaBvFxYvn0tWYdInYT2PBGW1Pqut2vHH_DfEwz4TF9ZK3uwR8m78qOs9tF2e9niP3jLO0NjTTPYuB1vTQ9rRTuywhpmZL3f_eBIXoa9TYoqOtVh2G9bINErcoQbB_l1OMapXpjrbZ9SCatoSWOyJgvCrP2DVkGj_UIQX5SsTRj8RjhQ3H6mRt7sNTe650rvvR7ypeBN75pEQKB18nXwEh5BUIq2xYWoFjC0mfBAfWWHQ0hmEth6HPil3XijQURRB3XkvFmsbUap6dRnIDObXYOFcvlBZgAvMFTzKRklNLUL5Z6PKKv7N1oMIrsmP34tT2Js7yA4-17z6biJ-NMSLwJ_7yKjjU757__W7AzC9NqZUtr-lfcak6lRP184g4cmX5Yl-txPDsF8URTGcXHEKfCsRgpgq7hyW0owa_tWXFKSHi-hOYdt8bPBp8p6RMkSJ-H4gvjqXUqaMTj0APTogUHhBLOqlupmRqovTOhKIE-iE6kD1ynqsAR6clXQntyfzosd-3zo3RGJ-a19orfXHNd49aHT7hHbhOhidSBdcy11TNqvNZdGmJVwFARI2y46KTcrnQKJrry17Z8i8crh1UJRjwdCv2uK3o5HR6Lf8fTVISRtH2tHVFIoxfr1I2RNGuPotemUDDnHTCy8JzlVJKmoYEeYUpvqc86NnS_euq_K7O_GmV2BeoPjAbhgCpYlhY-CceMmevQJRaJgLnVIg7Hp2dIk-qOkGfpGY5hGxTgIHBg7rJJkHIRZYSNYtcTs8KBg4OYqXI-DZ2hqhitkxiOUFcD3QocDo3gDPtl2rCKBmGMz1yTB6r4oLb2aA2UDf2oeVPc4ROVHb11CyN1gYgFqiNgltAgqml6jCunbbJflVj6VZF0VhCqVjQnVrqLk3WdjrrsMVOQ2Qn_wOQVYPW1ZKJFxmGOZksH1U5nmYooFbXLdf95Sw6aT32wHXUa2dJrJl0Iebm0jZOYM1nCNcMq-q98sZ5jDScNBEQ5W366zAfFBAfhtVbZYaLiOpIbu2AKCYGcVL1hmg9KTKYXtTyYPvI3LEtNpK9qFBFqpq_phwvjQTG5TKlCNiOZn5a-5Sy520lb3jh6EHRyYEAs92TBfF5fQhh1VWNhYreIWN2E6tkxaAWkID3F9ZKhm2DN3tMGec-vBO5uzYh8vYzPM-zbOJYqKe3EbLBZizPYz_PA3GX5gKjRzwMg7OHnKqRSZMXT2y4IrjJEVswRnpk5LiA01LCXICoPhYz_VvG7a7KUsyD2QF6Yb64ibebEuuX3LIPQz63cdhqkg5wJXcchVmtqHR8IX4MjCze7fhkYQY_dqcemI9sSRHd2D0EryzvsZo2LTHCM5mwiKfkB0bxx_iJ64c5wv-7HgfNhMB9uyc2602rEIwTrXOlqkV3Np0FN_D9qcb9NQP7liAlHWvLlTGJYD2YIbTUN8GCcMKa0W-kha7Bsc9oV_ntOUuUWipbWb2dCDBhMVYwM5SA-mhI90HfePnyN6YmsOpPIbXSMisCoJTTuoo9O4ulYortPgMQyBGls56MoaZe3giqTUIEpQkAB8t6VuKV2Eq_ilsZttOzAmcGNYeAQiiIQV5ZloN7P6C2aXUoGoLURwQ72f6JFIc4-MVaQjM8jiZHlpnQoc9y52WLhvHjwZ6kaNXozvuQTcrUaLumvJ21REhM7XrHO61NIlrA7r-0MJ1JWMQ0xCjXOCN7aG1r90jZcJz3f8oI4uREgFuLOCrEVCMNnbRelf7W-wWcNIsWESSaIbFjmxWw--pfzeGnx6Fc05jx11-zfJBWXnRLRqHeMQWgzF_p1lh7YqkRKsVqVkV38oCor2SBIQt-MddZITSA4gX9tpMZB9I24-vWumkCTEn1yc6-PAazPeJXO2KGJ-fj3Xjg3ZnkpIK5BOC8lqhemdVxBQ84i6PE1qz1KPBfXXerThOYUQspcZaV0KIsQNkCcYT3eg1FNwREHpf1IuTifeN4-xUIAo4UzJVPpE66NhvIiGsnpEk5m_41Oig2dZGohPIsBLTm2Xl66vmSl2wVQWDTD5chGvZZy0C4QD8CTJVVv0tScOZRjy06dWoebK2aoUib_EQCBVV78WbBSzcZGWvJG9TybhvxcR9nopJ4rKSxyc_6FPZkyJ2UlovLW6HEEFzrmdcq92bTiIYbgJM0-1dGOJPlSGy_H0mto-4-wiCs8IFdWr4WJ4ZNQJsMnYs-Qy_5JyfCtzCJMJ6cTwtA3dYBPrTqC4zHxre-8ZheBmfavhCehU6PyX715dOweVXoQ1vJh-EfNAR0EYKBXgqZYuY_TdiC_QSjt3MTZURJvfv2reCtmb9vX7-StLQp1K0iSlhM4rYOWxF5tXCp_4d0YnMREPylMcJJvoH3LwAIbG7UTskr2gDrYV_wZTPcPzHIfIa6eJ1GvskakK3qanTk3hQlrhL0q2dI5jCTNmC6Wdi8tLXjdC7pGwGtTiHdqj4ps-pu-wiMHejPP0VSeiIhJrZO2A4t1IwBk8t5tLKGnjnBR-CR4p-xC-lnWZLxN90DFHxGXFhfBUcmsqWZtTTA4DBoHohnx-ro7IhwafXHtqcIErUhp8eywNnh91I4LfUqjl4dA98oPDP0Mqy7Ib1X0HD9993CxiDyzRIdhhRmp0k9CAI8NPqQ_h0vP_xHydOw2hSawn5WcMlRLrOe1ffjZZNAR7V5LZDUwUyEmxtkqBQKDiSAriKXsR19FZ34lBj31PE_BBr0J06Y-t3Ix4_AodFxoCfmRtK_uB1n7ymoRiBJeL4hinsJa2uS1eh0OCM_JwXsh9Ry8QLy6XkhkvE2xz3aGINTow_YuBz5t5pVf11PrlehkXNVw926tCs5pfo-kMsSCpTfLtSonk3_ZcrO0EgT52W-I8inLE32u8JoAMFkHn4nYJhfjyhWr0c-u9WMmoowh1AC20dNxuG-u_UYYMzo8U5gAzc0CAlKO9CpfwXdX3fApmOkyMPk7GCW49WbSbKwzhs6izc9LS-96ZoCQSuU30rpC5zL05kw1luaWEtR3NXVYWjWYQADtL4TBXMJkHnX6RI--HqWXrOzkcyNEUFdK1OPQudK5g9AgTum5SwxeRTQTMkM32a_JOlcVu7TM2XMYLMBCk-hkJt0-cRDqKSt647ojFeuoYk9MueGNAaIkrnZEYXyPMOrESl_RqqNEnmHbQ5rc1u6J8WQMARteFwtqcVzKVWvq6Y6q9NkdNYn1dCw39zaFUMk_EUIlhrhiC4UV8nDpWXd_HhfH4EHs9qDHLnj2OoFxwJeeUM5isT51PU_doBpIlDj61zTxY8Ium8Vgh60PYFLehclccVa7jCLFdBgTVZncCHRybD7YVjOxTPrx2tzHXVso26OyHu5hI1C9QxgNjQaDhBiMGF5N6Izq1nx3aUURs4iI38UCSOAGhocNbNXB498fPzpU8KB48PrxA8er-6yvaz73CJ5OCCvppAJYb34tiX2zDQ0p_jvMbwAgxW1bdDf2KUh-xmTPYIKPA9xulPohCH06E7lRwOUEWAYJfL_YtJpBLBGgTNQ0OoJOCxJgfswlSl3Nejc09W19_JDfdtu3Q49-P9wO6e8tCItvdR3vx7BacyYOQ8fcD-GoQfRqCDMMOu3qvYzEODaI1IwD_bHDIa7yVLRuM8SM5EglYlGfcJRMdnXOWErMWrICRtLRxsaADccjDi0HDAAeScJgzUs0MOBI8CoaBtCcb7o5_RdEF0xpzeh9ugmxBAAFF6wRwFOv-y7_BBksWonWGcmJFk-nL4EfQWkMdoetlpJEACflj9IsE09G2lqNV-gXET3dFqeTKRLoZaZbJoa9WyVeGi1TXjxBasBWzjxjELHVHJJaQargG2KWoRXMlF7J1s1smaAlDHQ7MB2QkPUEnxncPE2UVshn5QliWCKehNIcVqb8QnnRsevaZzZZF5duVdZS4XA7v8rMu5_yRfWzf0IBzW6ggCSMoxXzsp74uozXBqYSo7QfqVmv2Z6xkrVYGmMzGq9UtBok0kRvErJonejnbES4kGgrlClDmsA5cmhUgkaxnM3a0zT9Sl3NVuLkeJWymYOLmEI2sXKttiOqHwo1mtPMh9XGR3BfFid06s5KUJLBzfOw5KAQA3jycwhX3C1kxLkrlI25irHDsTnsfUamaUx0H7dx2lg3MaanyoYZaB8OSGWgkbhtnXnF7twEuKKN7HluSbqVFTTtDJiPL51nidOEQdssSAZTYEV4Clf-wMTXE5X3xL6HYVdvL9mcu4x5AsHbX2BunwCeXc_aK8insvAltNG4cA6KBQgdNnAAyWARwrIyO4wCO6DgIEazMvzgSlfUqGYdYGm2kniDCHJJCO97FZTciMnEsrsNDwHsJHsFd3nHKYz1CH9qeHrZ2ADRz0H03TXskYre8ptVyCDlIac0jK6R_CsnG8tqJPzJCVZci5TfOaU0l0TSb0h6T_gB9qhIeMplmJ1U0S_8Ys1_kfKOU4Q2pdf3_ArRLN7-kjf5lkPQ3nCvK50qHRmh2RRe_4e2-I5YsnzJ2xIRbF4zhL1mJPv_DVw2gCc0NBLLwB0BUPLk0tdXVoAMMgHbhwXA4A8N8rEF336kl5uZBzIb2PblAgBYc04-c9oAAA",
        br: "G3LaIxHCxgHAIJcLi6iqdQqg3oo7xHhl7JMxKtChTmfdUZHxlDChLhoDwhJRLRDTf2q8IviEA23w0nuwle8hCoXCVa_4hmLzi5U0jIFT3vibIAg2XzQug_87XbZwhMY-yaX4veGq2uaYD48UTVhS9LZHioAnBgKCClZnqprbZINnnt8pVRKZVrF_IujT--TI-l5T-_rG-AJGwQYoOUY6ZFJhDaUmtpbb2mEPr6bAcHj0zde0r9-QyeDeRrsMoZTKwfX9vdLlpomRi1y4HhipwtiyV_dfvw-ErNuXiSmhGoajpjfLipzYKRQ7HYJ8fv_tZ-1ns9LXfZhbocCeWZYpq01_Ph-aY6M8jRMCNjwmmgA8Weanp2vohe4nvb8ht-rUNJzrftcw-LJBe9cENLOS5fe-5v7rF5k2lAV5beh3KKXZRzRtMvtwipw3uamCr1dTq5qyc4z0ZY8O6ImLwKiqzc2iSxduAmaa3ptN_3QFhZIRi5Fsh1IS6r-n23qyTVDw2KjPSHQ0ppvTw-3wfT-1VbVU85B3lid95TVcbOqQfNe5Jgz_f6n2ObOrAoP-z-oZp7yyt17ZO5LdTmGx9mbFuve-94T3qgrNelWAWVUALCQegek3wOBPSd2vCux_CqD-MciWfdBqB7YmUROl_psJUanTxI6OYe28bTmm1VhXLBss-9t6QhLuMVzV1UfdnIGACOLVfhtq_032JdnS_sV00wxCSDLZ-yDk1CP1Gz9p23a_Ca5j4F87QCACBkdFQ8GCGTtscYVL7HGOC9ziDNc44MRTf8LX-B43-N0_8K1v8ZuvW_NwibaN8wmbh_cA7_39V2tW7u8rSfxDnhsycKun9D-4KrlH-WcKIBp1C8YFECj_dda8bW4mmALkBhCGK0jA-HcKIJALVurhU4AAkwC0uCTKrqpoC0Pf1tPafQrMAJlJZ5DMpH0AJGSLxBa9YOwkGbZ_Hk0gJVx1zZuWE7ZnSr-FSQ87Ms0qbB_3-0M3zNcJAkSETeHxZYk_pkjL_1flN75birFqeBa3v3j9TLbtOFqi_v-4KfhdLgSptXz6tJlW588mLXmp9uGdvmf3qa0lqNzJECyuHO--aSmZ0zYBGkoEPnv7XQwV1rU-Dcf0oHI1NhE-2CIZuqQV7uZ-iR3465gYwE3T4SlCV0KGtR9yR12Qq_yGCZAUQN6yeGG7axA3l0O4dqcXQ8C9cygbggtllI-3JFgDtukVfgpKJU2IaKJxn6PxZ4CmWdPZAoVek6etz2tFEYRVKj9LS582HjcUpQEUX_tzE6Z0yKP8NcVWPgWIP2XWYbAQv-O_tH-Su0OOgpAIChHvIhVwKZK0qAn3NAkhoh4SLO53O3fHTMRKg3BIAuAsWqDL3inzzUmrm-2tkLM8Fq1mhuj0zUlf-qW14jg1vs7gj3l3K1u_fd0f3Zlrb7TBrQfxPAOzQU78T8px9TP_1wZCtXbRAbZ6TWxPTX3r2yI0LWPdeD5qI4KhKnVVlGGOLOoWpfd94aqQlMC-dyyiDBi7d44aXgik644DukzyQqXGlz40T_psHTeVL2qXULz_lgAs1NaAz6C-Ls0swjhgSeQrktRTC1ep71O5dnAPiDjXG6akwEZNVrRH8bVsHVmDv0Nb4JvZr-wKShPGBB7qA7I7NV1JXeTvrwI4S9PqqjcRCoCi97qhDLVvzieMJRT5xK8z5iLEY1ll63vuo3OLdA_IUAft80-f3i1FvZjgiRkRCRVu7lGz8PnfQlX0fg3GIbx3Hob3b7vvPhnjPGHX1wMgeO19M34I6n_WwRol0XMqPnGEjJR9tlrHSDwLtGseTwnZxdjmVM2vT5yEY3VyAYlv-bfHHuN51eWTg_477CZar_EAOGHKNm4ElU38hxj28Mv4BqORRakucT-gO4PgxYFfDQyqGbV9W_UBImpZCSFaBGuLutPJe-16Ufa1tZhw_j86gFYDUVpahFraS_uASeqe3sk-mN6Jag1_XIRDCQAfymekoAQAEF6lkGlEVU9NL9lHfXQhgF1_UEKeJUThxWjOpF5wCDhXamyRvftvjH91KhL9LUmQKsDUsGEm3C58VU5CxC8d6FJdaQvGsgzzcqJTsaQdrmoAKSc6Dl5VShN6SBby48NJGgiJ3KMpADe8pVfuBotgpDKgXYG4lE8w4BGqDDRWZXLr7bZA6RvIARoVdonQZ9bSO6n5O0RTinqOAeVCkcUoKGKkVgsPg_IFvnnZQtPckRpSO6fyGtvIWGsdMI-hU0PuB0WJGDUM4PRp3UuWNwHosFRtrQSssgsnLbZEc_iNBhcBbf0elEJs8tY8gf_qZ3SF0odo0lnifU1rhSQkb0uDa7BbZ6pcWdxLoKuKqrheTY6vtGhAIjiJTKW4hyWyFUEgiGuUNeZMMhRxppccdID0h2Gquc8Sm0MtlWBZs9Gd0CGtOR8ChcHvnKsw13evNJde76UPpKowsh1VJu06jWixpKpVVF6SKr4HCQ11Yw506vAg4rjEqlI8ctzDG0mnQEAjVXlpbyzqFIP8F08wfADRTHLxRecSulLQJS95rdum7sAmZj-B7Jakl1QPcoJCfiwBZcQf4IR3p_-FijvEN-cv_GJtGxbX9CceMrfmnL3QqCJhDzCYThMGTFbMkYhQFBwqcn9hZvOF977kEeQZTwaDqLhkfbxd8cXkyfY1c22dRZN0V4hWIxbfQBRpMOle6FOb4DSv_KWBuCiR6ROasHguvWGsER21-JnrjVdjNyUK6wXs6bxxEp33RxXdrDjQ7EfXwlaW8ozja1GXOmaX5bkKHrmUeyzM2-aXtCQYJWDXVF1n5HAKh5GQcAOicYZZx9P1rkG9AqAGYM24LSADG8y0P-KOma7CbXDB4jfE4F9z2Q5Q8wyldQKH4JLGR_RM48SU0LXkJ8lmDlhrYsiodgmyJTHLq71G0GLomN16BNghKJFnuCrsmDrFBrC4ayoHEWIXdQ_SouEgsdwfsqicB35CxnP9jKmiSbZlJYXrqBdgMNIJzAqMI20Izz8YTcAhyUrrv4cdv5GtJxipYAIxEL1fSaIBYc7jXWvJDGesBOyCCBXODK5Dvcu1W0NswxO8xZcmqKQ2LvxjrCSQrz8hXtLglOOMalqEKTN-1ZLQCUxmmh9XPTvAsXKPUrmPEtHgbRIq7TEg3OV0pDXGiMUZNUhrODWTFPILieoOnhf334CuZsjFnZsAT6NjuGEjwBrosxbOTyNqL3pvzjY21TRy5ZLkTlPVfDD9dwNxkRuC_pvP0KnvElMm1czLX_AS5fuXIy53aoyNOyfX5KYRKR3YBVb6yk2NaUhxVemjm577M2mVrgMMQYtYYDDE7KhctwTop-MGvV2KDMbvy5MrVr8r4uoNY4t7w1Vr2vG1cAi9j4YPthJw7bTtw5UXZ2bTnRih2kexABpbNtmm3cJg5ySKd8AhC0ozfR5SZFJTIchUEzJSlfVLoyEnKVlXeAvD0t0uaaVZs8rOUYHtvd_ZM__hwkfUbNQIxlRQWiFZ1BWAMqTi-RK3rfP6hi5B1PMD_STQq4fItgWMUTZkJccZa70Nq0ocRFJEU3dGpSk9URplYd6dWtEaTQYEzxGU-xdcu-kOKfsH_On3ExFgsaSolpWlPewmu4OrpcIlQQJWYY6FEJnx0yCYWG81ZISRfXqIULhkscNULeEfkMHYAFV5lnV_arCbJViRqnURVH0akZ6fSJ3ymFT0IPaPm5jqthyceX9pSkWUYzlG6aVWDKtx6F6wIMb6UQvputd9sPsDJTx1jyIDwVAp9i5uNx9oR9Stmw21xhoczVCr3F706f07srf0FJOHFyvmCy4knQ6kzcDBIvcBdY3SLh5mChhkaHNY4U2lfKSehgx9-hDhrHrWouIypSQrPRiS52v_AGa0-9xAgmPKH0wCfjuyQxsPYbx-LfbpBTa-i1ILApwl6oxPS8ZSofHA6KwD-CqjNgpvFvATYzEkdMY7OdLwSqNlSbqlEc2TCWlyRvFLgiMbjq-38dZaV15kLr9BXQrRlSuyYmuhOrKfwWYNA1WP2oXB_RhNmER2IkAAjpFqtGJVkyGsvMo3hSbWk5ONFRknqZKvEIRRMQ6JnEwimLrLCFU1gO5wXOvNYw9SojQjWeEbWYkZiszjgU1Y1eLsvmUJxVhGEFC2BJPilL0srw9n_CLQ7cRe13mErvIj6QcZrU1sFmsLA1lCwYOigHVo1JYG04ZVDkBfTE3eK8aLWmvJjjrYvyI4XiWGMrxxtP05QD8BtjVAXiKAI9cPy9jPwpz2pNRkc96BBAoxAbnGMyrQkDV-sR8FuIs7AtZWbSS_6EKvMNEfIm8sfytNx9Utyq5lcHWzkwHo_ZgdD5YGtR7TnvO61bcq5aaqQ64Kr6V1yFkKuIpKahQOPJcb5lMFvZxb10sxQZWZQjucIsxCPhmLTuF75IzetDR-QUIg8PhBTU8Okw0gkWcCbVzk_mQ5ms7WvgEcMUMK72fXuq83UIDnEFHhLtnRLcmMxauuj_gGOb67c3GItVeBjwmNkTftAbKN_pQr-t9V1hgdTC86h10_ZCNNz6m26CkEqTJhqMajFZMetCRpbSD5Vi5L82MJgXCUQp9xa79WLuQ3TZPdTxtARfefgA-TMVsEfximfgk21KgLMqMrSpCC9jf0ZC7SeW33Rx6qq7iYw_nd4rhbzQpPfgYBaki2tMr6gFyrwmNqhQaisT5YWuy-gkv_IbRK60CZdz0QD4AH6CrrSWTgN4fT29PfSjHp96LbZSUmlYuPLIzM5I_Wyx2LHwrZHblHN4tbrlX2ihOTXKDzcV021A0xdBHt05Prnw3YF8yx7CgHjul9351gpwg48Fi5ThfO5ZhAZa9ZJEnsNwZXKoUI6hVmg98ASHtexQApABMRVgYTvgrQ34MEgt57Pt_EvW8zBxoMtYDG1klxws7Ef5Ev-sVmIrSX3V7P88ANw3DkQHGAlKm6h4WJA3bd45YLuk9EZ0hDrFO9bFwrNoat1jKy_Fbokv3cGobQqdkNZCjKWVrrHvs9AN8WTf4h0jLL4_0bq5kwB3WTwA1wnUrO0CDbj_xtvLABU3NDbACAMRHArylWwDlLV478JQhPBCHdpQENMkW9UjD5KkPFX8PQsD04h6zLs7u7mTbFuWmRQB7zfhjN2_W9D__2BeGlxzg8vUq_MSr5gY_zjK_4zFjtWF8sij8yEHnCjpPAjBgQq73xToe8qpQUT7yzCo9OIbV_C_k7Mk1BOgN4FJDgQeCPktGcgtthhkdEiapos-SbZe7OgVZzdKs5Nr05qu6kQVEQJ-CccF8N991yFaA6JahUFkxvtkeiBHNgpZDbokgVcOf-eGMeiCfyZ5dSYrCH5WyPk0HGCgWiBkojqp2x5apFLlRGnTnQuv_siRGEzntUmGOdTlTQX6182Df2R4WD5D-3LzxlD0b0YioUynq84iyYKIaEVuvEmaGk_x-2e_os--CBNIc4BJ5v4uQOTEGAWVItCZvy5yDDDUdM9CiJpHjX3jx3M8pwLv1jRiuObzsp37g7kTWrM-HQypW7gpUH24tM6IOm5niRJH8aYwB8cNuP61-4gJ0mCtb-Y9og8UDWJAQjZE7j15fUAnP5c8QraW7ZG2DWZ14koJ5plyz2qQwGIzfJT6hwoqFsIS4zk7aGVAY4z5KIqP4BGwNoWzMCnoF7G6qzGeGuqwMBlPuCBx6VhKlLh5gN3OAAGgGBoNn0epD8PGQk6By3z1pfMdfavGY4ziizfDahGDhjDBeyg2puJtgWQgamZaetuJWXML2-uRQDaoc51tiZvfY7a0SA36f_GUCf6ST-dw5I8JHMWU-8Jc0vxrDV1smJpyEmyAQ2XBOhxAPkJ5MeOWDWGLMuv8XfSxVR3Ihe7ccNrVZzvwMNwL70el6c7l5VMPumcvlX_OV_ZddDHg2z8ipfmp6tRvy2g93Kzg0xRJpTPI71xl1umB6GLqLptI2yroCwr7BxM_MZZoq8HCweKfYGnk499dS5kJ07Id--EUCoiDX3ZBv6QGfLUEWtqbTSyFkjJxjvWzUTOwWkGvIlBPrns3seLG9X6nbPS4VXRh5a3cFGY2_O9868d2niQX6bNfl53vdQJ-GoczXB5acrnppJ_xXD4MziFqTJP0LBJ7iajbfncbn1qzxoUOpw0nCgvYezRuF0M-bazBw-NSB593iuQ2QAfGGrAj_Ia9eW2xDP82EHO2m53R_3z1xnVzHbxzA7EESXaoFHnS1rWwcnhoQNp5VcbZvdv_Y0JSBqR4J3pjigwaiT1KbPHTEXxjNYeCVGfkYDLWSyx8Xq0zec6irlmrthqxl3A9F9orZD70_a635q6pNJl95PFx_NMxmcOSWgWdJrgZX_k8qeXVN7URWBq8qM1eAKNwEo_NzjpPquZosjIhslaG1mmI_MnxiztxIgrafWLevocC4HBw5eO2NOMXAyiCXg8ieQH7jJB22qaHbyFhZgYMIUOXt9iJOpBDxMSA9BzKTBne-huCUATZR24lBba4UXK9u_PkxQ_wF5qCVxCEYg1Phdore5Bhj9DxjdAaQomhi5kXYk4UczeVgB1B3moJ3cew4nOMXvXuGAUs7XrEY5-gMRBAUpe9-M_MzotUSvsRzkWO1vsHCcZGXWatOrMU9wNVSpeDf6dbv1NJlucL89wVNNqWWbdAIvXbaq0zRuh8kH7ySB_KOKJdw7uSHARfPUsKZmr_kfPC-Aqr8CiXyUr62LX0yBxoc-vV_UB-ZUFAXUJmLpeB56rz9II00WW_q3Mg6h6vdAtaHTNrunK6i7C3y73_rM1CfX8bLIgUb49ROhJDu-9FV3AtYx-ZdaAQxTfWKZc656f5Aj-nXqWy8_-FgcrK2kodb4hB-c4OmAbs0Efzjj9i0tlPzfBJB9tAfwDMRQEmY0GdyDKWVC22ADujDT6icwHEwKHn0l5cuZtRfd2cLcIzjFZNHxG7s1pMkFOArKUtnBmdpkXDaJ0TkHMUpfsGm1TclJIVAY5p9mkuclM2854jdzX3cg5ZW6VO67vP46KEpJgzIbTKcxcz_xjSnpy44UfGpwyYHml98Km01a4ob0q0pmkw8sr1qI6b7pEDGE1ofK1tFNI2Yui3MEdT-P2Wq8NyL8h7gnwQgECl0QoLAN78cktz0k5ijzc8-akZfoRvjLnHVTFzv6EXixhWz950Pmxbe4zMurDDmgWBQLOeSAtevb9R_dSWVxXPXBi2T8IUegna8VpUJ-1Dy-Vp2fRHnt4c8tpjqT0VprKKpEmPMq27nIyktyOytfALiPLyD6jkeLpr6jL2zBuSw9s_4DJ0Pk_4PlL03ctbWQJSdDF9GtD-_-suGu14rlR4gfeH6w-f1g0vLj2ydWqx1Yj6G601ARLmXPF5rh00nf5p3wfdTMxM1kNKUavY7STubqWVBWKikk6_YxVf2ilsVaLMT6Fs6j5Kl2xHlyV1BTMRZe-AJPbqMofLrjuVKrZIQ27NnlqsqL5-ZtNMmKrN9K_DpbRlzBGCdk4iaVo3c4H1wBuX7KJ5MqtRTuwyv9NnlpS0Nbq7Nrpia7pM7ji7wov1jMhJCM4aS-c5PlwJabQXweBlMnbjVj4xst0faK_ppW68fQzwVIbSz3WwshryzOQGn7yjjjN837vtgR_jO7kc-Uc_2iWgrtDz4zDqK5HxfJD2l9ZCxGE5K3G5m4C8a8u-3DGFBfaA2sqSzBHTfCRP_o5tCO5jFXTqFPUGCIktnM4pMtHAURbNMRfGv8mlhd9X9W21FRRJNpBvJWlMfDWb40LIpiNBZSftxQ_EwXDfMsNLjMh3XUfzCjhbIkGvRJip48dLP5_0-DWTS9U_Dj4YvGB_nlZGqK3mD-KiDtGRmSen_ZKXD_YO0bD0rpa0ozapebpMAi-k32KFo0wo9VNc0Xe7khSGcIIYTP1xYLiKaZDHXWCwHHvf4ZRByvwAJR2dt6LXhtfwfZzfBvuZhKfrzvbfSLj2DmW6rlXYKaTkS77Tr5WvAZKaXc68kiZn-_Bb-KsorHEEn0xyN9QOb10UTI-mInYS_rNedh0bY-PzP_Fd9lSQuBGMV-JpJve4e0Q5x9I5_UsYzrWoxWb94gVh7DCbdiBtxVVCY09Wy-DyzVtS0YN8lV2CesKVcUB0UsMEh7vTzQVLMLlr-50N0ylbo_fKyqervkAh7vDxtN0V27t2CgCvFl7kuDPVaOPBYG1HRhSWZ4DfO3xujDa4zSaI8DHeiWlORyCuQfVppAsCmF95HunAlRmN65p2tVscGTU6Vb0eE8Z6HEwa-SDEWpfDe2btRPcmrLqX9v6e0n1jnBRYD11dVggnqPNWzpovtqxKEM4Q3WWcpWp1Qj44jpQXXeS4WqxE3esz8mz4ELYQBNuTV0aFnTkdp-DLRjy1oBxfjATK6Aom-g5j4taHDyqGGsDX-OIm7Q0izGGpppuUddxtYZAwmZZ2TI5vMC4oHSkqhzNlbg8FvlcCOAumyt5GAeqDIp0LlTxRqKmr-sN7fHTSsRdpm3xMQe-ICa4Yb1cQIUZmm2IDnmccbTGl8d9__jcN8pqscqjakJo--nuq15tjZ87H9j23PTh4Z0AUjXX3wgAdDdp6-mCLdLP6ln4zfYp0Gz24D4z32lH049FiZWXOsbK68sJscFd4PC6eshQNpf1v5cwuFKwywquJ2aLjEnzCHZ4vUR0boc00vlqCXNjuKVwcIF6mb3oXStuQMqk5Xp5zZkpEWqbg9xWe-QNj8Y8O9ccg7nYqbKFQcKILY48gZOmUZsW8g0l1k35gzPli1_56wSAyHD0vwR1hunJ32L5_D8-RRqLBAeMhVwk3dzkeVQ9TPSGZVbh_ateZqonb2RMnzuLeRWzb8U76YQB9-nZ2ao2T_AtCj8dIBJ75eHTaf1BNClasiovlBjUU_ovv3LzPSI9WZ5lLBvcPtY38J_B5xwupcRPw6Ko5t0ulOgDzOhjzz93ik7oTY2Yj8p9-Bvxd8BTy_-IdRQ2E0Bx8Ifb62n9nrjSLH-fW63-j_OgI6lssFtN-lFQ_zwPJrKRW4JUXH8kMFEuq93ImTIj8NbUTZRXSNdVmntW7HZNzdUXFd8cOsWq3lSx82QnAZPH_RZpBAU4ta2V-esA0oQI8ripF6NhEKlpATmWxS4gfnTzTkuXtYkozoy-h1e_c1EWHXXQSmod0PdlLZJdtrrvFnMzB5NIXSWFPdms7C4bUp-FYjvfLcUfxM7-WWAx9GIvKB4ej0anCD5jHRZjsl7-TQjvf-a-0mgsd7B7Wub6cauxsxGZd35tSB8EZErWNPWuQJ9uI_v9rL4-C74kqxpt4QKzdZ_KHfKVw0dk-h65PCE6SEnGbu67Wr0M3Qx2jZRfYIAUFbF5_No0c_NZIGTnLDBtIkC_nCDy7TU7yinADdWw38Ok7xAEEy4ABfCoVhPCiHjWZ0Z4Uo57hQkLkZc6YqhzNVvVOl1QfY_c-VX2kmhV7uy-b88jqr333MnCZQcE3xvs7PBzAIbsfN7ZW4FM4pQIQNZEqWYYbKqZNAkr7GmfTfV6IvEQoGR3PLtW6jQF-cO85y2D36hjxwSooF2gchRp89zy-i0Kgy6X2-msjCZ6s2bPqmSHCstXfoeOFLJ6KoVC56O9l7DJ9R5oSgFVlmoLC2e4Dy6XC6SezMr8u4guexvIgJJv1yHoTCJI6SRBi6uXE65oeFLVqOh5rNKHg_wF7B2NITpAlw9IZRvEiLnau3r0g0lz-NefMz7G24kgTnvuDeLkoivtLnuvKG2vo_CPmQe2qQXJlwM5hm2TZokfAxWL7RJWsBiCHMPbLDYLc2s2WJOGQlFJZqht5qvyHmeLMvv3eq_f3N_xXSC_vjVxCO4sDv7w-XSsJ0KqZwc-r3lQetmUzgr0Ke4L4MjCvbDx64P8ED2v-d6GI5ia_P352VQvjnxuvN3MHnzY4kk52Iv-n4cO85FL_rFlH8TRg3b5ppQVMnAXC_U3oJTr3ZRhMkI5OVf6rD_g5s-v43-sEWxiXXpd6ay7vyDZqLaWGpf2IUu0ZeIdEysnUMh1MjI1cdr2c-gd_BJgTSTt5_ISUprb5Ur0QfwlQLGUM6wG3-hb86RylJ75RceJEEOR-uNEJuqZIzQIcBz26TCPnD8ROsNTdzGiFxhm7Yw8Kv9NspUE8dIEM6Eprjyq0JDp0V6eD53ZAxkjZ3mdALGxpqBwyHlo8CRDFr50tfigaorUZEum6pSVKzjEdn0IQBRbhq-g-eJLRlyrzNpP9V0pTlV9W9kf_XaBNKMXmOSi6mCocWdQTRJRx7yZgJqF4ngFl7RiUam8l0EIM9IiMR_6AOVBSy3GwyElyL6W77tlZXC-OMVZKUrd8NEYSsO6dpsouInegfnd1OLkvFwrrb3SoEiJ74B9DktcQJzU6-jRT1A9rgTWRdfOqSIUt8713uyqYDRv6NfdA2E091jglTkNVc1eVZVFrFsTazL-dsDhriyF4MDwQcXQgIrrwhAg3vLVnk2_dv_dxLXnM4Uo81cuPQrsqJRHb_wtkDa8Sy6cyyzF_PzAdFunfoWFIa3t2si-FICpKxwqlAzrKWi7gUas5XgTMHOLQxMELUwcGZZq2TBOSGiYJ2Zv3-xvrLjqBBRE0WPpaBJMVzD5OdaGGSUq-lkW68IdnVEMxiMfZRTWsl9rrMHrvtl2imblB4YGpg2AOt8TK7-S3Ncnmbh3CSQxIuHwrVLepHfrc-abwHpKS0bYHUEoRRpb-wwPWky4ij3goBaaURItonRamEvLVITsnl1JR0d_7tYbOFR_nP-3-v5Sf6Pa8-3jwqX0aLZA_odnflmao4el7svBTK9HTjowBBOXc4WzkpgQhQDLQKxgiQjaup0Ojb3M9H6BqygtDdgHZGNvHegrq6Ykc4eyJ-WQ_Mova8VnfeuoHMUJRqOcxyG1OIgv38euYZsmA-kXzC0HFfZSNx6OJsuJ3SAQMDXqmRYlJc-kpfXAdGP5HmpaV1OX_6-lS7hIgf2nb7qrdn4-sL93wO4SPRmmLlyt2D0DvwsR7G3GdKL8yLYWu2daz-SI3bmnddcH6dj5WIn4MyOcHQS6_XATjkGfVNtO_n_QWviTQJVbyPSXjYAxUG_KoQu7nP0gnedFa9_i9xREVtHkOCURr6mA85SA5oxX-CH3l5TG0wRJZWQA6mWJCc7unTdJEvaeDBdFRw1-gmYjXF0Fnr18taxuFJBbe95q96QJs5BTBE044gT-8mF2NOuWytUCBTOOmFDnSXhZ1B6mhg6HFoOArnTtiyUzmERcIkl-uFWY1BJ4L2j3UjF20siKbogOyj5YyczTK7uCQSB984giP_qCWfRu_JLxz0a7dmZJngL_QG7PkSJCWNtGPYhSHdKYqE_15o2pdUDUWFKySj09QbTeuc0DflgLLd-7TYjIJCj1v4VCIz-qJc5SL-EKTTshWXpPTsddTXKaHUJU86qzGp_bv_9RZt0B2CFsAFVZKIHmCQ51kFExr7IlUaPIJuhfODVEIoOp44ktMjfFlcZUxj2oqM6ltIDL36_bj6-KizhCyjqzVlOh_DJy-uG4nklcenl6FU5EXhgED2PYxJdfCCPpQpxBQUiJnWYSWhnBTm_dDDGKzl01uZv3hSb1nM-qZN18iMiehauzbsZKR-dIQiLcE7_AISZujoXhgBVJ_wFAYHOiVzQZ9wrrCnpCPTsu_rawQIXgnwjLxNrMBc1Q0sNqdwVifiWJ9oYE9i-E3FgR1tiTMAPbI0gnPnld9y1I3mpWO-IRI171ZXf-UQp-PvK2dYbSbNTt99unIu_E3dMR5UkPVtF5qrgULspR1s3V79DapYyRuTwcXs6tBbSV8cJsNk_bDRtuddA4qPgj0Fucu3zVwJr09Mdt27gi0xONeBgC-FgwwByOdcB2ySckW0gSY4-5c57q1EtUy9dJh0G2oJdf7RbquRL6aUsPip0scGD1caBBP62evkH7Zflsk7UyxBzz3tkhI7Zssfzvw15-fL69p7N5QvFUrlSrdUbzVa70-31B0N_tSn9dne5_--quq6bw5-2C_3_N8fT7Y6kBGoeWX29EzlODy_Ire2djvFzsmHqKSpWBc2-ysbFIOdZSqCsBTMbG_0E4d8x_xpm0qFMNzrWpre6cmSDD0bHO-hwcU4Mhvt8faPGntiLre7zSFNWc2rlurvUwaWltGD-e0-b6408ZVDJgwDPqGkCrTzHb332k1fYhR8w2cAMT5YiBaOPR0JNQtH2av0puy4tnqCV4HzKst0lXsDq1-C-NKvqLcHta0D7YOifN11pQSXX08v1ZrYJ_zkZycNqglseS4RoIOScjZGZIX2W_MBuuXre39dx_8G0DIDCz9nI3S4SKIhYPKJuLy7_oO-GxMH5-16JIfBb9N8lPdD-56r-utnwrPk_LdHfrun57NMELfYge3rX0Wjd_VeTzmhHimM1YFz75618tqt5yRmxahPRmVGDcsDtvUq48fnWrq-0nXKVSTuVDvLaPihuHF6DzorJxzsV7ix2H7C3M7i1uX4Ph1-k2OeLkV9A27zLlUGlTE3nY7tU6K4ZTLVGjhs5620PImmm4wrAb9-K1JQaHblrKL2wziBG1HUp2dP8ukZoSgJ7bFFl6l2rZxybYF0H1V6M8u_4QYWJvZy7tn6XSaencgwRDckJNxBqO0Qp2Rtx6ZTf78fh-ZMrQD0zAzv1hNXrIKSNIvfzdtFVwXFsxO5L3oXFd9Px_MBirXgbS6PrA0roURiMOGt_aTfmXj1p8izF6HAPZQ8FraqHVfvL_z8PjuwnVHvfCOz9TD27n010bZgQ0SrkDeRmDyxw6nJ_lJ-qTfWNqdH0525pbnsGoRKpbCVBtVDVz6vPPHl_faixTz2ieSzIIleYZCDgFPNzObvjmIao0oyMKeH7cjgWZ9EAK8jExclKTD2wDD3mNHjCseCsIuiEzqcSTXnOTe22RhFlsdzwCUJzZS8o-iQa0EH-CHaKiaScA5hVe6f93ZsstjEtYiTYwTKGasNpPHsRLUGQwFLjxVgGqD2L6AZRmaLBf0bpFLRfxI1xr990myFGfjSNHvOlOfHqdtox9jsmzy-IbmqMMW00kv4E9xF0Zbr-mdzmCZTbgnrpGehG8phtYjGyY3ONcpiMrVTkirX09NXyO7i7UQpAmOEebLHvk9sCuXtziraORDs-F3rBHt7OfHh1YyyWVhrmn1AiT_9ihR1iUflJyizSjFOT2x2HEqJ0ZQifjCN8oVFSu0-_RibP8xynTNOZN3OmbQqq_7AHd1DPq0Mfhecu6vnxv_98lAydxCLEnSAQkNRH3-FYe2qq_ybfEOLwB50zdv_mgUHset8E0JFmWQclKVGBZcuCM4QEK0JjXN9xFzxZ2j1V1B_fIjErcZbC-mACKgSzO4MV_RjRVwbeoAFF2MniIMGOZCnFoAKYPSTHDp5Dp0Ym6MadOtEcIbjDj5iAN_iWElhPAOIpVhGY0FbI-KP8YSsIqc5pjTabY0s1RFL36kEfxuN8uhx2X1m6QUbsvYMvO9rHOKSrUDBpvIXp1LtRvUmnA-DdnehDYc1yKHsmVMCJBLgCsIrxxDaobuvNT-7qW19ONb0Tjz3hgeB-s6uexak9ZmDboC0mOTDXWReDhxjnAxTANVFslcHPHxcAzdARkG40k37MtGAMPWC-Vmz8ewPGUpdG5cOM5qr6T4Pt_sqVKa8ieoRXPgHkTbYEr83PG1TMdHxfmTaJfOxEB18qhG0dSCWolbMqqrgr7NsqKKuoi4pWU1Ger4QRi-M-kzMiiWxeTLrBjWPCeECyBZoVtQxNV4T0YIdzCOSgD0WoDJ-g5b9eHwrGRmITZDvmen-KUx00R8qK9eh6yKztuAtP0ynZFS1ldJe-K33E5ivVcFRpSPJB4eEX5-0lK5PSTTxm5xbXkscKS6m-Sj_36O6p8U6OzdMcWTTEnTBqOk8Oc7fu0ApGulkdvEYfmsNfW3M8YWWmnwEOBhYW2Ufkl9-pO-ZhYU_qVsIFdVHRKnqZPwgjFs86IXCTn1-F3u3oCLT4zrf2x5HgWBesyo_7-cWlUaQaedakdTpPglYRUWm9A-tgapDPN9o_du23ey6MoBL3m4HJC3xb0CyUELi7jvau8BnAV88ShMAmDqhHHg40gfk8iWmp0eh6OxVw2EwhQE6SRMuPZf4vK7sV7RCQ-tkxTcEbFcpX23qGkTLc6g0uc9zybMb5b4bqoilNJAkqtRVrtbwFI9rDIjH-GGYr8gsSI4W1qq6jx3a2RUYgSh2wPmA_F2-sMh3zm_Fmwgb6e3b527W49T-qj6c43PJfZkAzqlfZFkO6Dn4-z57v_DG9Fsa-cSFABeeUsUQMG6Gxaw6WkLGlftZHaEYupwMUerbfZOl_VLsOMJ0i7KwTqVlCpxBOQP1ycp5ex6pEzbxCFNwEoSTsXGXrA7MdCMPN-Q2sBsBjX3Gh4M-JIIk4-kb2FtuT-xNLHexCx3Hat55L2Y-sVf41jRKRZX31XlLpMrzJcxDGa5HVEXP5eIeUY8TJiM6pItil8RPl7wHZSOTnBqmRW4F6ozWDoowQjkI8llNHjVnzWBP7cDZXTb_jDty188nUl8y-4l3af9XsS8FfaSnVXwiGZs2bnrBhyAlplXR05FN0A3-1bfW813fIBczJpRYO-W3M1efrkoBKrjvXU7syOXUX4pVrIV3WhcrFO8fMl4V4ZVlIl6Ea8LaCLqyW2a_10Cv4QrxCLKTLU7i_rC7ZZb1ozxC-LKQryMJqGX5tBb1cxWWZXaqW-aVqpfDitiyLdVqdLaW7EK_c7PJHgOX-shCvKMLeMizrJutFFKTnYhi2Ifllm5PRg9gQ5zOEo0Z9ENc_DVs1qpG-hXVigKWIoGTUIICWgNk_0-BopTgYe4bXgFP7wP3eGfrB3NQFNqgVcfBrTDNVvevWNQ1lq5GqYjwfuz_I3JqpnKHVIa6XLdhsHQTTkHI6wv1uoN7lwZkuvq3MAmodFg_LamvAtgTUf0myHOr3ilGeQf_rk9SeqCMvjZO818LXV2u_FMhuFgCS4OTsmNefhepkl0m2bIMu7R5w2phZPNigrgxrUMf3apJwwcxpan55aXRkzLTUBpjEyEC7fcDmhQYbLGP0ajccQ_2fGxStsUVHcYXu2GizESu9Xw8Rt3uzEVkONpk21PGd-kpemsevkZ-3WO_WuNuNiT3BpjK7Fs7fMom-v0h_j_kGYKQEAKKt61vG2KYYpngrDsDyR6-8jq9ZmYteD9MJNyGRYcfH0qUOTykron_fuQD9kvFfIuXX502-qH1DY8HrMUPwJe2F-oM0Pm_qPr4urVcdoGP6KjDTsPFDL-1giEFLL9BS9RWg7iqHLb_hlbbxac-2l8j4VS1i74Seept_XDH77vO8IHJvFKSGCGAV2n9Q3TcVdxU-kWX06L2jhaxsYRUGNrUO0VqmhFhO3B-CNKr2PLEqfVTyoHlwjmbtuAXUyjhJn48ZFNN2Nm8uAo4rjB9Lg8-skUK2_qoOO3ZX1ybmpH7kaxC7qQ_dOF0mr7y4RCtguXEP4RN6IoNEGSRDaQpdDwYMTUjDu8LVsuULeTykNvARoX4Njds3OFa2om-rPUaxCXR8n0c2e-mgS8uOJ40qO4zD0XNIWKCZxNr3CQgL22KmipmI6I7MiNA5AdMIzCUt3NhH06F1LdkjLbO43OzLSxsXwcvfaZL1IbLaoFuyGFpINIc5bvzOq-nGKLzs7Ez5Nn34dSPN9MPz6lQ3YtSfFRHjOaQJ33j3X8_hhCdpoPGtiT1tl_HD8_Z_qXwrz2vuW7h18mICPeKB9_dB7XzUOFx1L5Nw8NKsv85CJjxyRdK1X7_2Iey3J4kxqahukVWiSvM3rdEvCAHK-KBC4pjUFkcN2SKYz5yBAhGVydKcV2XcFDWHi6CJLAdPN-PG0hUXFlaDQ4fbYk9hf2a5ksx2OlMuAYhawZzjrkV6NGmbFGsqG8ZhPoNzSbdy0siOhnvDLs_vZ-BxlPMO0C6Rgd8ErtNRKUzzJgBU2NNw9C0OBUHcLBnz4fqC_EZVaDLV9l4es-vsdSw6RjPTEF1lwatsTOgQ2SToY6hv8RJl_4GzUPN3ruihO1_Byc7D7u_azkQgYbuFFFo5JKsQ5flbCT3GIE2gE-IX4H9o8Iy7JtGIfHPO4DW-CqgQlxRMBORAxZlsqZvygYVhTm_C0_fr05B4kyUbN4Iyk96OKJZZxaCR5DpBEh9fXtBPzE5x92OqNcVPZ2tAXIw3Rqmi5mNSlPDTPgkSx9INEJCSU8xrrIVTUlGuK_kYioT3K2bADkIhdCfsV5Cfh6vnclCIc0EwleyQX4tFRcDJw3_7QUBIp_boVNa8nHYbQNukYFfGOasiSu1TVNPjMopk0Ve6LhxTg8PHSN1dZTXUBS99ABVIEHj50fSvwdJqpgJQwRd7-t2yaw6m6ps6zBVnSs28AKiqeQRsPbgChEmc10mVirZoGkGVdsXK9jjAbVYllocsAaG-HVfVrI9xDvWBhdv97jWGGOeIq51Xam_56kbtoVYmlmkhVH042YOWJOdJbb3hdC-TvDXWAjN7lTeQHZnmuu27PMM3pX2T3373vYN3_TI5zjo-5QjnGF4DbzYSFPBP2qnFg4CBjr1yJTBibImpwRT-D_QLiO_hFb5sP2XDiVdHZdt61HvZ8o56g2VI_qQday1KOKOr7L6XovXrKBz-c7nftJhPfmf4HAuIs1XAiq3NS5P6o_59WV_Wbpht2ZjUNauaywqkG8EGWl-DaBV-oVr6Qkw7O_XRDr2zEdCIw6eOYmLmjOxOWY1VhiEZatEolQDw3FaRsBX8fFCuV7YHJg5_biin2HMsw-4A1tyf7UjpWz_GpHifG6sFfbm1G5hokSDXcTA69xP_aCDT7uVlXaklqLUYp7ePch-Ck9bsN_xwp4ufe3rsEYc8B95ZVf14qj6J1FscRWur2xmDKEwwJVoHcN4qjzBt197ferfUJsHj2_iZeANO89_OTinx952vPOBTnG60Si34L25x-Ldt_ERkVWMMmW-0I7K9C1-KAkSz9bz4fuhXOcdKxx9DcqC9UX9nl3ahuMOQdnsOAIJFABbSllHNBTndPNxKlRIq-k1Jyp-BHHnImt-ZRC7DsVNRjTGZzsSGoqjwS0Y-G1FEgac_pavwdOoukYlIRY4K0F7I9aweVVGla_lTLmA39G-5SgJnE1Ll2zUOCHQxcRS21p1v8T97el-5PToJfdApiawum2nbda7L1_nBc2cogETuLGFtzE-xHpyOITZKtM3Kq1upmLImAl2sw2V71PiBScGrss-dvkUyOhnVAEECWUywa_SObUkz_KbiY8Jx9LFOSmZbnmZbw6yoC-P7Nk6aMgZNxMavejh6sUDJ-5NjEFMep8Nwl34xkXuUVUa2SKw-0qiXvT_SysT7Mte8ynFvykZTe03BqemJpqujNwhF90f56EGZ5ZTAeiSnvh_cH3pWTxvE1xCzXzYtZjpZFepMYPSnb0kF7ycM5eDMD0pPvBdK4mfw4HvTcHmSa_t3C2rr8b-1-kf_Q42yxme-DTlz-_iwnj4RAOEfEUaveme8VD2QWPE-LNqw9kUQBchlFKuAFpAL9DPKOsUqj3g5J9gG613NanUvla3SYm44H_sT_WwS9PacsCuLMaj4px4NAuu6YXUPAk0BuOqjrZN_1hEggDFszu6h1aIJcBWOcsVGTjGNkqlUeC2oSbqrrssQZbF3I3qzkqzo9gmU0iijBotvymGTehDJlLBXK14iI-DYY1cXW6VTTGp56Z_WFPTvAjkhBUYOEb3pqqp6fGHCVCf2YM9N8PeMqASRYH-5_JClf8w_f40foGtzWi_sF3K6KhMp9ZB8nJdLTfY3dxmv6wPPPcd8-_nGL1dxevOI9OCQaYACZKsJ_WgTNF8pqtoKrCqxIRJZMYENItNICA8swLx98Nvu_Tmhpo0u5PuwOK2azjlCpk66q5nNE_huGxah-juWB9hN0WhudCSeoo4LbOF4PLvWWF1tKPA8sdZ0IZIIbwo0b8wG6KirBmc8ciqSsqLXNDPkk4rnkH41SxabKp0r074EJtkYkUwNkbNmujDcL0Tx1GCUYABtVy26KcqmnaliHi_UHDtD8hAn3KGsi98MTxHLyI8rq2IUPdebjmPmnmsuJ3Lb7f7aMVFaRFUSsFkaqhb1MqOB1WqDqtZ3Qs57MWAIz-gpMYpJ_cCHY5PRlOAMOyQrjs_6xFt_RVcUb54aPVOAy30_sMijUB2WYLxcakBbzSJNIWVfUAdOUe0UnLKVaZ8oq4yO48CL0MOgddWDBpsrWU8pM2wXBFnPUIuQK8SQaj92QL1jAVFRoLa7dVY5r5Cti8XL-Drp_3qaazYjtq8EzwoZkqa-GGxdHWfLaDJgufNnLKiMLZynEBgQoIXRxTAA3LFiy8fieDFAvvrUCaIT0SMaaMD29zVHhAXnhpQKm_CrsypvyLNJfgCxgovIQmxIZU3lapAVP-aFJ9qPphQrmNvA1gGdjkLmTD7BK-PHGdbfolceESQTI9epbzE77bysS2xJvRENQt-rDyc3OD6Be4ylifX5XmM0LS7O4k7lih1LH2zRLw2pTFiBiehOGFqDtH8NuV1V3sUrptfuKvwLpHuFM4EV2QvNbvp8YM-Vo0buFy_XBQZKaIqJ5iVMHtINoCdMddi4L8b5QIRie-V9KzOBFxpNsDukylDRPYbhs-XBRDomADvwLSkpcsK4hop2ykb4OXkipd27VZJ3Hw3vkLSqd6FAHiHWP-QRCnaSdV5PWZmeMT1ojCClepVsOeAT1770ddgXVSdpgZKkaw-7N23itnOKXtPtZE3iwqhkzWplmnypZmdjFpQLAKvd5F6P9BjkgioLDzNN1pnRKv41XOxIINBAOxLQdvkwcr1vCPDYvmu_rfFmzViA5Y37u6d5nUlc5FAvU4rr5fHb70z_NI3RjyeXy-j-3B0rC8CL-180VP07ZCJYPQvnplZsiGrDgPL92DQKqsRxF0zg0-9Y1C8VEVVFCnpTg2aCcDyw8Bv0J-sfAEHb-ebVrJF-evKp31SDZiMd5gunv7RkHcTHojjRaQJKdDKl1DuSduuciHcenJSt4dLmYtw2FbiXmbQhBOSn8z87y0TxrWo6wzQ2y1p5NFMNPR_i0AQuX7qDaTiGVbSCAvGAyfkb_9ayNp12mudBu7doIbS8ybadhS8OqFT6uTLy5WlYyOwxiGTfRj8BiNSAn4F7iVFBq5dSWi3QfgKpQDPdWiaNi0hfqA_KjCfEgJxxKfKIWe9ZyEKWguow1FBsOek7oKyYhK5ZoaNxg54blhOhcnZExPTQTI7ydkS_NVDpiVgbvKqAhsOQw6lHvZi4LpUlJ3X83htNpEVdGVyKasEv7sVxOgGANo9xg03Tagk_fRHj6m6TFbSKp51fr3vXGw5gUqDvverhISQu5PXKaYNPb-PUDfquhYNMyGFDQ_0L311J77zGo9h9LmTR1qvjBBYYRvOn1CLim4IdWHTrC6XqDa8kbjIlWKm0_cumKt339lAE7LwlcDPiPv5Cxk8iOpjCupY-mo2WvpAR4AB46K5qhv2QKmNg6tnlZS0ikWgMDOw7OKbsHc6oa6uyJfc1Pk5VmOl6ZSjs6zPFAOJuycQ1xRgh9qkBgsXGHgn3Ob2wMrNkIRo7oX_KbzCs8pgdCma1CAZRLoFJqHo1Qr1EiXyYywR6rqSvd2YVf3dTyoKUI0iCJju3UQVFt7D21zEDYaJBm5GkXWJ06ABWcpYuyudGGG1-HOermdAKpyDDvZG15BrqnA83V95tzJ6WCEzQG7X8BOcVo8s8RxSvcD-_1whbPv8Djfl4LmCU2Zcso_NuZORUh81kUtf8YpKWJhKB_BCe_CkJ_og6jX29w2UT9Nj4lNNoIcNmF1kkl5hehpqfoLlnkvXzGRYnoGkIAKOLmIoMg29ezVC10IXAzLKCtQUb6UhlMRQxOtrBMmxGjBBf93oqIrpZiQLWEKlEaFSKGc1YKJVdkxbSLSILXOnmYBXueNB6OPVjq3MyOdluaslKjJLaNyRDZ67WreQSRZXTuTRRZO4xy7eWXUTXDgdWZIAf5AHvfw7Y7KqDFR3RFFlzV_YDmkHP5rokCEudTX4UpviwbqkB-qhJUAry4ciVMUOOLVNL4YfMXugj5wyY3Ew-bEpac6gSyrAgeKdReVl7E5169z8JXhAzJFThYrQ1eZYa88OmUKLGjQLSyAObILDpGZ3ObdNbarURDa96nFewsyzRzVDwrL5AOnbiz5ZECcSn15UcdSyydXSIiYkpLQaLtpGVyPM6ZTwXhFtAm8Mp82qXxLUUuhaJW1t8T7Ws1EkRLKDKwDaX0FeHvea6Msw12NsqAbyOQ8Dwm7bsLTp1h8JQlt7ennX31XeXb6i-JnabPnje6SPpCMbIGQqSCJdMBsnXGE_76CnIvlIC0MU89HDCYwxY17SbEdNp4Dpy6dfVDlhMfQcm-IL_fuGh_x0TwO8cGO42CFuo5L5dRSUo2etnMKXuL2p6GS8ErrlAMeaoodSigOOKIBl7sydhj2_NPvgjTcSiN3pElXCKiqXmFJzV5pS2fV-koXviHb5aNNMVbNXcxVmrhBjLIeasWAoe4mkMVGQH4l9U3c5a8xVADZMRv6gAkU0cd2PQPth2F0pejlVqHPL5R5h_6-hKXh9lu6HLsjmnAGRSfVH_UrnPvvQzIbSPNjmKl5xCilhEypAJzRalOPsBCih4bRc57Z_lfhvSd7O8BYrYOMfSVV7uGS1iutUyXxNXzZe--_iW2gJYHAvxkAHWWAjkYaK_sfOurLTtd3jMhqbamUV5LQ_JKTiw5o1totU5TlBjmrqZa7nANBDU9-34nusDtTl43LU7gBH7AA_UePoBIo914ahJAPCTw43WV_UK6lCQkfJZwVYhB8ijCy0hmRzUYR_Po61vW1_S1DDCTDrQMn1W7rirHLx8_849I-cnXPCabFAKUhHRMUu3u7ZJMz0QnLYM5TDxNaK2DJ2lhv8eUU5eurmAyyv4WO_bbn0wUIy3TEbI3KZnzG3I6NQ1nXvlgQvmJCUn8K1OBP5HEKZ_rUqa9AMnmUKJ3n-Lq7ipqOfym2TX479xCbfXhyye5pfbUT79foAp_5SXRuvR9tf8-uJcAYAPxPr3fIUhpXz4eNcbHup5Iebz7ymnH_77LzYvhyS-24JjlvuTumVzP2Fd-sjLo4b3M31Sl3x_lClfgS254t6_IH8gwzeKSliSjA3U8iHvD-9xpq7EJQnfAVhofb0FGpsbmaHua39wJOW_LOcm-xE7CTrgm9akq8yk5OqquLjZkqUXjos0EeJesWc5_6g9Z8r9Kzg2FJ-OXQKXAT66xX-0wiRR7KNIBY6W2-94NWMocDBg4geCGWiEXFKFs_SkP4IF7sLWQ4tFq-KDFHfI1Cc5BB1obqT84ljpKChXE1ufg4-s2rKAjeSPIRyYpR9HdA54yCg3Zuc2p9gtPpcCm51nqpdNG7blOFANK5rk2yb4HINNQp4ZW9nKQpwOnptk1bfj7j6zJKa3niUJJ9cX2XrLhkcfyTNf8Lqean3-QX9qF33fwvK5a9D_yzFglUPlaM1D9wt3m8jnKd1UVZzrn292w6rxF323gELgQh0SYP_rRm1rDwR40RXHnnw33Zy7vnua6-xzOblC0BSgVVA_AsXg_pNeudjAE9JtZfvCNtj1z09OpyPp5-nU0FNMQv-_1PrufR1HrkX0u6wZ3mX--ebRPELx39M7v7436kxnSg1TwBGaTGGl6j8zS-PzHBFbX5pEKixt_aHaBUU1oK2OKH4GAdRxw9nWP1SdFM5yAVJb7JxkKtGEv_Yn_4z_4Agu6Ed98MP1uXz_BxSM0nYrFd4fnqy8AZx5KR79OTTWgTuLT_rgKGQMfiLnoUVz2h5faTR3yN7sooSCeUANkLhFyPvJ1PAYpaAIhsFKpi4Z4Ga30Fv1PtyBAcLkBV7OP6kWgzNalE_WLPogrcdEjSjAofxCyuqbY39U73pRyANt4ESIOGw2u-ajuT5pUoSwP8xe7dLsmN4ogDXl4PYsH43N2Xp-4e6OSb_piwPKNLF-4UmYPPa3HgjvQTv7_pU38cHFZM1EpoyjD196AFMSjzHaaLgzyUTgnbt2FmAVxPfq4fHTM69EngPJz2X9lHOIUlVEtdkS6bnuwE2ybpetaNDhwLNVwT9xmfzdAJEnZbd45cqiBHHT8Vgi6n1gialWZ47cdu93J3NSEAh_cuEflekcapuLV4T0NA2KTzxezMhBV81iqcVnkGVLaHF2pgKFKEjyR_CnhvtSgRMo5Ayrzp3cGtnffw-OzBSwIuQwiOJyrILlJH-f1f26kJ-iUKXf3VlbM8BcJUu0yIQhdVCwav_0mDn5SFHYyWE6CCbIddBzasHXyHa0n4PlcbjUDa4yEl2V6fSeXaDxSb6XZYPTyZeeiVBKi-lUp51LTW7kUl_S_24k9Ca-uhs_tyvgLHWWx6b_Q3y1OSP_ZQsECZ8cjcxYJyYLwpnQJCcn2HENl3XapqTqq21lpyUYa9HhMNW73cIzaBYsv8IztF5XfIW7q0228udy_jLgaMtYiQX2w4z0hJ9Nhpsg0rYAZEi-aYF2jgSIQ0A8Ny9ASwO799mLSi4BIASwua0RrH8WQJ_IpgAo5XNig2G0_cyM6FocXb--h5SVWwvEw20v6Fckwj0ikoVFG60J5G-PJ_KwnhtLgICjGRrJQkSJ1mBnb2WivLyvhTMhbgzh-LO9-eOHNYjjq6tRFofPmXg9nayuTI-fCfUshJdlE9iCoia3hydtQnAB_uQ5Vt706QVPWcZhIF-In3js3v7ccgQVlz1o0Z8ICsxGWMO3K9dYomVUh0t949Ctl9MdbVE2f_5yCisko3AAl2C2yfm6LEDGgeG76xXHqVn-8AZDaI4zHtSqFxLUWDgH5fuHrQSGl0BspVYcyJmFEYDkSmGwK7BRCJNmpwFPIiUf30duLWearxiYf9xDeErfbMqFeYtYcxFn5vWmu5ubQsRH7UEE_RhyCtU1mIT2GCYdXdM04RdjPemluAc8SbvOoGPFGZ5UWyCoHQ3ZscZaViFYvGFH-QqIW8R3iPangyYM8XksaNDqvjMgfuDJtE4vX6aR2OwuQJncFg0dvGX1rTpeaS4Hlv-7QgT_bbS2z15AoF6-X-3GeqdKwHhonNOQMZg0ZcVreVLBCUFX1Tan-LmFpaXXBUftpY1dqGsxIa9dJjHnHye0y7vj3-jb9K9zzynYHTHwTmdPu955sgWopElYfrP81OeGFn-Bz52XjgE8t4OdRe9AUgeu9HmKo8Ee8FB0t98LHIRtD7Djv_tti95JOa27I-dcu1uvn2PmZcGnlub_P_WsibWBdmjoxUu1SNspydHDfCbhW9ZP01Dky5yeMT4dz6HtIpmaHy5tKzQrz0YOXT0BXtO-_SmV0waGuLIvixeu7ReklMLkhoz2pgcMyeU4olKdtGhfP6oJ2wA2ruWIa6UYISuSKzCAp9U1eM0f5swDsiSw6yAxAD17krmYpM7aCr_g8B8IVQE1-HqARDKqkMRziHR2PsYa3zcT23AL9Fz2LQFRtbeNayTZe91E-hTcY6_qoTQsSi4T9qrD9Gv2-fp02Xyuz--6KZSjwJSNylHMRpfIfkKWMYYh2EvA5u6f94IeW4FjrHtpUR9xnEy_3o4aE6T0ZI0tfcIGZZIfixk1NGR35ryA4s_USdXi5t7vTjirPwTsK69ktfAwoBTpYaxBw5NrNFQ25TaNtSbWHB6gIpGg2yIxoDvGxvj-QCuZfty04pLKkBOs3i3E2c610UQGyrSnGzZXl0jwYfbKz4R-o7QZGkfhemANrgpj7t7cw8HJlsgCTmvJNJ5JnsTm6QZ8gIITclQUvxdczdtQNvbZrHKEAo73MwEdoH1slfwGB3azdnj84lgfbT-3J90PyE72ydbCiZyyNhwY7FjofpPctA5zgbBF1y7oWHEsMK7tuq2sKVF2D0aqi80KQuV5IhSHPpaGLkJRk_aP9iMplEPoPgd9rmC9L_4KpjK6qc-u7RXCxSBYOIumZe_wsFIbmzv06SDb6xylY4jNTStqmaBNFDGmEaNAx9bo5gKHtAP2N0VQOmzJQvcBVbumNpwBQ6tcqU3nxB8z1v3GnMvk9RPY3CYRKr8irF12pB3FfEavXNshybp53iqsNYaBu0DxYRa5XrJ4nbYXo1LzdqmdKkdx0NvegDuEA7Ehspsy-DqQwdgkQZsGU1zB8Mhmi0n33GQ7ca8j6s6CupvS3PlwNcOy0U7T-aLbMTM1XmaaTr2o8ek9OgXJDANjsCnhPDmpu8M-mMUd6X-iuQJ-JFk_hSLfVlDkSm_FwCaPR1iA-soa2mOxrySASBXbFWxXEc28jQ4TUiuyH60F2z2MDkjE7Z0kkstxAbCp_NELNc2UQo-Jq_3sRA8KteglB0lT1x7iFLt-nGocw8c4mE8A6RYzOObo1ZpX6ORGlAxD5Q82gz56Xkb5fKNg_IRaoQ0VjMDEHEdJRw6LNBqvXiR2iWcvxjm1bd9zZrZt7YshrAlI2wccfbbIf8qv4Szj92P14CKbp9iw951fwnNtQHlQLRUZpyhvR2ZASZoT_Aa1X4S_MKRZJjWBG_rdKfQkCutTYhA47FXk7lcOa2r1AbuN_lvWp-egOMJbznVyxBN3UHvMM2dQ_6gcswE2LEx2eoYkVZVVxG6C8GtZD2UkcXl_3QSnpOZ8CgECs1Gb9y_IsPvIwQsq06vX4k2MdUwLv83-Gcka-pgs_ZWp1lCvde8HkZKJMw-7G4Ily5JtkqS9Y_2jq-SbCF156R7S49vkuLU7kfkPw6ZLmqXEZMsQqmyOQvDYsDcdIiwM7FtYbSprPf_-nB-3bknKdSIO0NnGBG3mH57ZccLajpJ9nRviUi-EXMOcurPSH66h-ts0HzBECHeiFtGIjRjvXq2fwnrTIojYOZUpMEit9AM_G_z1FZ-wwagICwkEO8oGbuV9ICYfJtVt94El1vAht_NbUaN_tYn5kc1UwxysyR2K8Hl8l0UYqinOItQUV84sjOM4BLaetf7mGUbJ1dt0xvLLRR1ZrG6TXkQVhuBZe0mc3cyT6EBIL-USAUZRcueNSyXAg0T-erIhAOfcKvKIcBdUEBgxu_c7LXjhNbbrn8vUxDWA4DgxMIBIABWYLcZULeaNMYqxvNQKXKeJNN5QJtVhVe5g8m11RAceKjfAZJkHUeHhfXTeAE-zn737gxn0vzN4Ep1E-bOTNaUkqDvTKTNUTcsE0TeFsFXli9QjxHP42z3Yy_bapNU7bvDS5ljcNx-216sHK8z78XyYC9jhsA55KPTD-S_MJOcetghMNWwsIrEPZ4OlKSRHXAdBqR9sij3f7NS28cnozvczYQnKFwi9IU_ffkOSqaKTTAruBVaP-UGeMWmGWEvi8sxStXmZgSPhVA_nbPO-i6LUg5TRuhElV5w5g72oZ423in6N2Tgi__P9okFpCEk5NXf2mh-OvI8GtdZS4M95eo0b9esLq8gGoZjJ1ojfQxzEAe2Fg5HdvedRhNmWg4CQScxxwH8XDTtgg_eHeUyRA0QpMxkyPcQHUfHJ8fgkG5QXL1ny1o6uMmqhN4mR76Uj4oxb7GwxmfiHMqRa88nJ2tLVCx5FCIaA5kE_YOQTkf7oY1zFwzNcQR43iaj3HkFeEkDDR1C7eFZZ4Upf-GoVxNTUGLfNpg-uRNvgEF44ug51l0nYeytS2_xhCGStynZHmuAcdHgWbSHzl6IjzPHQS_4cetZ8F9aldD0y7WSsBIQeKShi3EbKsLVLZXCwPz4J7rqb-FVhwxyxP5XqC33_P0aT0D5bzYK-nc0RDGGQPumLQkTtvih0m9HVDQwn2cNPzfHw9yZnvw0SNljAb8VNZofBx_iJ39EYvUsKuu62ClEQOiwoBfSgeFYfu0vGU-hGab1jyCJKkG6cHJSXrWw4hQMyEArZIgkbKCXIQiLkd0GjZ-plFwk1T1I3cfZrONfT-8TPEqQ2Ct5MlfbU8k5WyTPHtWYkcrmEc9gcA0nA4TCk50Nbg2wOV8oybZLMxu0KEhYNapsHG2NvDxV2u9j6hbPbGrskLIm_M_nhapNkhc7pHYewW-0ARdBH3EeEdIPlgXCl4GM3fsDMJBzG7EBu5qEapW_ePt5bhA_v3in9mtaXL9x1C2Wv7zqzccEFYfynC4cA9JwKOyPKb0jfH979i4517C4eNFpyg03EuFqkysbZbRtaLShlo1xBMaqambuT7JjRVRgcpfXpuaoEf3x5-vbH5nECeUhzNqL5FCSKtk6OROFdriuyhAZE_mZRp5xBXVY0s2pCRu7zn9cv5tE4_5LlSIuTOIcZg5jSwon4dhtgTUO2TMXuqAk5lqprUxwmGknp6kJgQmKd7hqdrF8aVUszceFBEvnt193hUTZ2FvpHVVdkfZLOu_7cKk5HhHi-ma4sQgnNLx2NVGBwWlrJz084ziEfY9r7-6lVOfqDdPTWUzBCMCu3DV0Qj1QKoxm-o5T6sMhVNJsQbGOTkLMhjKrt8xaallFzitd8HDjSAYanFr8rvUQTMMa-AbpzBKnIvZDO6Iswgf1vCJ83N40C7IAnMMd2z4wt80pCDbWTebM_QpO-Ezp8SKngktGFffnuyFhR8-5UEa9uUfaCqC0EOSJoojrpHHMPf92P03e__iDHziIPUVADIUQ999FEAldSDos2yFFz4pCIBFKruAtXSyMYfAlvEJ17hEzmKdCo5PewGHpbacGZSwEy4YT4DLr6WBAdFuPYAMf6tTvUZM-ZcBc0IGrT1rES6i7LTeKfd6n8i0k36vZb1S5Awh2_k3OT1KlmRIf-kakv1MEMnYlI5k6qisZKhu5lBebeFIeKkooZavymjo5RPnMweejUTcZWVQ8pu-IiJslpw4i_PEvInH4gOZhxCRvE4V5HSENu0WSuyr6RnBuTgfH5WjlxEwiMzmwlh_sFXlO6WdcU9UMHlhDXdg4f5LAZzppxmDMwCiac7VRwUic6j3CKOIUPuE87Oo-UdOSjIdXwUvrgr9G78OXlCUNB-_ekJYqzNvHv15NFee1rIVDCKKB4--Xc_xaBuMB0REdJoQUVH7Efhv7PNvBlpn3elCrj1xipXcHWG_YHRyosS_pKdE23D6nsflWPTHnyxyxWP_-8BfJy1YcN0e1521avjpNNJPbGPkP7uvf8Wp2o3XNMDWkbm_jjSMYWeWbnlIYOJuYdguvONwuiJDJcsFKcNV112CawizlZwTrNHBSFPE5rmO80f-DIwhq1BKmFX-VGhIP0dhUzV5N5pGoXlkRrGkwecTULWuXh_t6fnjFLMlVPR7lEh73V8idjGYAH360_iqhAySQKiVxmiN4yDC_BP9Gr8B5r3j0iUxoR0RJhdM7yWyH1eqcYOGm3z3FzdXg41vQDxEPP5GvhZqGfZua6ML2phyCx80r79jHdvpWjNSw78fB6VRmRfpAa2Ru60Ap1bO7JpLDHgZ1Tx_OTE-FvLTPNloNrT-3l6QsXTJ2sQzMalW_Ry_UmdMWPUBZkFnibk6eXiAB6jNibAlNQWvWaBec7NKYkpQZlMvqCXsuk1jlmAlF_0d4YhQDMpSxzs7E6JPmNPozOZ2wcj1nQhcDAvQpKDkUJgE7AJ3aoBXHyB_RJBrzCdbFBpDBlb_tjm9fjhqfhM7q9S21dy7h8AALlkgj75upUcswGRgyAySNxgRNFOl3_NAGAVWT6_Jm-neVT2LlIdexm704HG84xix1U-BGklNq84hICEJZmeEZvU66UXOUmGvtxMhWOU0UuwpPphQ2TWUcvBLLYcz8gsOCzdsI0uJ-oThzbXRAoLUclxzcW2wPYqjlE7Q6iFrFtPFch4t6bA4j6A46FAPBDbhPRq5LAMKiRDg_Qb9e5nIYnTv-or90AdH9CZ6QrlXF4QEXGK86hf5wCbHhy93GW20G2aHPTXDKkaMZwNFWKYGltZc8ttTsWpXPM9GkvXifM28u_hUw0lcsPm1UopgDhGAjQtOP83Q4yltMiCM6oCEZ0egjJ1sXftIyPv2WXUwhySNUOUut8SQ9Epj2bDmWcn83akTSHxwJlStRm4zd8a0jLm4w4bQDf9FQreyAMg64mbDRLGSbIYv4XoldjNnN7xtSBZ84HocC46XaU6kwMXk_cDN47kWjh6rsPZRNfOXLH_Qfi0R0zv5oTiusmecGth52sfg8SzsqEVJl3rTwzUoNNOpSWek7vLF4VtRLCqk-LgoCCoVE6VSYR_jCpd4sm5PHAYJyJSxhyzdqiKvhHkwFCwLycULlAS6Mx_yCDCxcoaRRmlgFwJkOue_-wn65C2jvuxlEtWVTVOYTHJm2aXHodthral2bYCqRhVTdBlWCMsXllWenoqOVg7HhT5BhijcttBVTlUx2lmM4Ya5LcMNJhPW4zhr_0cacDwMgKoEiaHktMWSLY2LMYoNQKMFraWm_60Fhrs7Cg81PrqxfRrLYlhZumdftwyazHeRx7xr2Oyqz-m15aQc_3oWlX39nAc_6nIE5FiGn5Q62j8c_4V12Go4xHx3IJRZLLrppGILXoEZsgQLo5QdYEJkh63rAgG1xOuUuFDj0LpJWTlbBKGBSfxvRq8j_nwCDaMiJO2MaQmMH1C1D88giT3MIUF7FZqkS2uordzHPeyG3dzOPXnsFlo5H3ENlyzpGT07uRHkWGEatdoO4WERvxf1z4V8I9p709TOUCrfkmHMnBNcC-vJhAqzkjtfUXFrfUjLOcQyRyWReL1n-qdqMJb92Jc4p_CTnQsIOLzxof28UQtH4aGR1B-_RwS1ggsaFPAunYBE0UFL4rUqVAkZBRZSFBmBecaZ4xBHi7TTTgAAy5W4v2N2bDQWWE3S2ErskX14bkeOtN8CayITegvZX_0IJ1kLkeH5QB1bmXLOI1aM0VGXY1KM51OcgWPufKAmUSPkulZGPCSYWvUi5JuzAAc3mOAgyXUh_bp6g0NwDwLHzMD8n-rTVORknbmVleMG6Pjo_vJmyW9O0mpQpWXJFh8xFlsX7AQY23pmxPVSxPTToM9xebgi15UvvLe5kckPjSY0D7V_4F"
    },
    debug: "(()=>{\"use strict\";var e,t,r,n,a,i,o,s,l,u,c,f,d,v,p,h,g,m,y,b,w,k,S,T,E,I,A,x,N,O,C,$,j,M=\"@info\",_=\"@consent\",U=\"_tail:\",F=U+\"state\",q=U+\"push\",P=(e,t=e=>Error(e))=>{throw ef(e=ts(e))?t(e):e},R=(e,t,r=-1)=>{if(e===t||(e??t)==null)return!0;if(eg(e)&&eg(t)&&e.length===t.length){var n=0;for(var a in e){if(e[a]!==t[a]&&!R(e[a],t[a],r-1))return!1;++n}return n===Object.keys(t).length}return!1},z=(e,t,...r)=>e===t||r.length>0&&r.some(t=>z(e,t)),D=(e,t)=>null!=e?e:P(t??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),W=(e,t=!0,r)=>{try{return e()}catch(e){return eS(t)?ep(e=t(e))?P(e):e:ea(t)?console.error(t?P(e):e):t}finally{r?.()}},B=e=>{var t,r=()=>r.initialized||t?t:(t=ts(e)).then?t=t.then(e=>(r.initialized=!0,r.resolved=t=e)):(r.initialized=!0,r.resolved=t);return r},V=e=>{var t={initialized:!0,then:J(()=>(t.initialized=!0,ts(e)))};return t},J=e=>{var t=B(e);return(e,r)=>L(t,[e,r])},L=async(e,t=!0,r)=>{try{var n=await ts(e);return ev(t)?t[0]?.(n):n}catch(e){if(ea(t)){if(t)throw e;console.error(e)}else{if(ev(t)){if(!t[1])throw e;return t[1](e)}var a=await t?.(e);if(a instanceof Error)throw a;return a}}finally{await r?.()}},K=e=>e,G=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,et=Symbol.iterator,er=(e,t)=>(r,n=!0)=>e(r)?r:t&&n&&null!=r&&null!=(r=t(r))?r:G,en=(e,t)=>eS(t)?e!==G?t(e):G:e?.[t]!==G?e:G,ea=e=>\"boolean\"==typeof e,ei=er(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||G))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=er(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,t=!1)=>null==e?G:!t&&ev(e)?e:eT(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,em=Object.prototype,ey=Object.getPrototypeOf,eb=e=>null!=e&&ey(e)===em,ew=(e,t)=>\"function\"==typeof e?.[t],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eT=(e,t=!1)=>!!(e?.[et]&&(\"object\"==typeof e||t)),eE=e=>e instanceof Map,eI=e=>e instanceof Set,eA=(e,t)=>null==e?G:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?G:eS(e)?e:t=>t[e],eC=(e,t,r)=>(t??r)!==G?(e=eO(e),t??=0,r??=H,(n,a)=>t--?G:r--?e?e(n,a):n:r):e,e$=e=>e?.filter(ee),ej=(e,t,r,n)=>null==e?[]:!t&&ev(e)?e$(e):e[et]?function*(e,t){if(null!=e){if(t){t=eO(t);var r=0;for(var n of e)if(null!=(n=t(n,r++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,r===G?t:eC(t,r,n)):eg(e)?function*(e,t){t=eO(t);var r=0;for(var n in e){var a=[n,e[n]];if(t&&(a=t(a,r++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,eC(t,r,n)):ej(eS(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(t??=-e-1;e++;)yield t--;else for(t??=0;e--;)yield t++}(e,r),t),eM=(e,t)=>t&&!ev(e)?[...e]:e,e_=(e,t,r,n)=>ej(e,t,r,n),eU=(e,t,r=1,n=!1,a,i)=>(function* e(t,r,n,a){if(null!=t){if(t[et]||n&&eg(t))for(var i of a?ej(t):t)1!==r?yield*e(i,r-1,n,!0):yield i;else yield t}})(ej(e,t,a,i),r+1,n,!1),eF=(e,t,r,n)=>{if(t=eO(t),ev(e)){var a=0,i=[];for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n&&!ex;r++){var o=e[r];(t?o=t(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(e_(e,t,r,n)):G},eq=(e,t,r,n)=>null!=e?new Set([...e_(e,t,r,n)]):G,eP=(e,t,r=1,n=!1,a,i)=>eh(eU(e,t,r,n,a,i)),eR=(...e)=>{var t;return eJ(1===e.length?e[0]:e,e=>null!=e&&(t??=[]).push(...eh(e))),t},ez=(e,t,r,n)=>{var a,i=0;for(r=r<0?e.length+r:r??0,n=n<0?e.length+n:n??e.length;r<n;r++)if(null!=e[r]&&(a=t(e[r],i++)??a,ex)){ex=!1;break}return a},eD=(e,t)=>{var r,n=0;for(var a of e)if(null!=a&&(r=t(a,n++)??r,ex)){ex=!1;break}return r},eW=(e,t)=>{var r,n=0;for(var a in e)if(r=t([a,e[a]],n++)??r,ex){ex=!1;break}return r},eB=(e,t,...r)=>null==e?G:eT(e)?eF(e,e=>t(e,...r)):t(e,...r),eV=(e,t,r,n)=>{var a;if(null!=e){if(ev(e))return ez(e,t,r,n);if(r===G){if(e[et])return eD(e,t);if(\"object\"==typeof e)return eW(e,t)}for(var i of ej(e,t,r,n))null!=i&&(a=i);return a}},eJ=eV,eL=async(e,t,r,n)=>{var a;if(null==e)return G;for(var i of e_(e,t,r,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eK=Object.fromEntries,eG=(e,t,r)=>{if(null==e)return G;if(ea(t)||r){var n={};return eJ(e,r?(e,a)=>null!=(e=t(e,a))&&null!=(e[1]=r(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eJ(e,t?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eF(e,t?(e,r)=>en(t(e,r),1):e=>en(e,1)))},eH=(e,t,r,n,a)=>{var i=()=>eS(r)?r():r;return eV(e,(e,n)=>r=t(r,e,n)??i(),n,a)??i()},eX=(e,t=e=>null!=e,r=ev(e),n,a)=>eM(ej(e,(e,r)=>t(e,r)?e:G,n,a),r),eY=(e,t,r,n)=>{var a;if(null==e)return G;if(t)e=eX(e,t,!1,r,n);else{if(null!=(a=e.length??e.size))return a;if(!e[et])return Object.keys(e).length}return a=0,eV(e,()=>++a)??0},eZ=(e,...t)=>null==e?G:ec(e)?Math.max(e,...t):eH(e,(e,r,n,a=t[1]?t[1](r,n):r)=>null==e||ec(a)&&a>e?a:e,G,t[2],t[3]),eQ=(e,t,r)=>eF(e,eb(e)?e=>e[1]:e=>e,t,r),e0=e=>!ev(e)&&eT(e)?eF(e,eE(e)?e=>e:eI(e)?e=>[e,!0]:(e,t)=>[t,e]):eg(e)?Object.entries(e):G,e1=(e,t,r,n)=>null==e?G:(t=eO(t),eV(e,(e,r)=>!t||(e=t(e,r))?eN(e):G,r,n)),e2=(e,t,r,n)=>null==e?G:ev(e)||ef(e)?e[e.length-1]:eV(e,(e,r)=>!t||t(e,r)?e:G,r,n),e4=(e,t,r,n)=>null==e?G:eb(e)&&!t?Object.keys(e).length>0:e.some?.(t??eo)??eV(e,t?(e,r)=>!!t(e,r)&&eN(!0):()=>eN(!0),r,n)??!1,e6=(e,t=e=>e)=>(e?.sort((e,r)=>t(e)-t(r)),e),e5=(e,t,r)=>(e.constructor===Object||ev(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),e3=(e,t,r)=>{if(e){if(e.constructor===Object&&null==r)return e[t];var n=e.get?e.get(t):e.has?e.has(t):e[t];return void 0===n&&null!=r&&null!=(n=eS(r)?r():r)&&e5(e,t,n),n}},e8=(e,...t)=>(eJ(t,t=>eJ(t,([t,r])=>{null!=r&&(eb(e[t])&&eb(r)?e8(e[t],r):e[t]=r)})),e),e9=e=>(t,r,n,a)=>{if(t)return void 0!=n?e(t,r,n,a):(eJ(r,r=>ev(r)?e(t,r[0],r[1]):eJ(r,([r,n])=>e(t,r,n))),t)},e7=e9(e5),te=e9((e,t,r)=>e5(e,t,eS(r)?r(e3(e,t)):r)),tt=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):e3(e,t)!==e7(e,t,!0),tr=(e,t)=>{if((e??t)!=null){var r=e3(e,t);return ew(e,\"delete\")?e.delete(t):delete e[t],r}},tn=(e,...t)=>{var r=[],n=!1,a=(e,i,o,s)=>{if(e){var l=t[i];i===t.length-1?ev(l)?(n=!0,l.forEach(t=>r.push(tr(e,t)))):r.push(tr(e,l)):(ev(l)?(n=!0,l.forEach(t=>a(e3(e,t),i+1,e,t))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ta(o,s))}};return a(e,0),n?r:r[0]},ta=(e,t)=>{if(e)return ev(t)?(ev(e)&&e.length>1?t.sort((e,t)=>t-e):t).map(t=>ta(e,t)):ev(e)?t<e.length?e.splice(t,1)[0]:void 0:tr(e,t)},ti=(e,...t)=>{var r=(t,n)=>{var a;if(t){if(ev(t)){if(eb(t[0])){t.splice(1).forEach(e=>r(e,t[0]));return}a=t}else a=eF(t);a.forEach(([t,r])=>Object.defineProperty(e,t,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(r)&&(\"get\"in r||\"value\"in r)?r:eS(r)&&!r.length?{get:r}:{value:r}}))}};return t.forEach(e=>r(e)),e},to=(e,...t)=>{if(void 0!==e)return Object.fromEntries(t.flatMap(r=>eg(r)?ev(r)?r.map(t=>ev(t)?1===t.length?[t[0],e[t[0]]]:to(e[t[0]],...t[1]):[t,e[t]]):Object.entries(t).map(([t,r])=>[t,!0===r?e[t]:to(e[t],r)]):[[r,e[r]]]).filter(e=>null!=e[1]))},ts=e=>eS(e)?e():e,tl=(e,t=-1)=>ev(e)?t?e.map(e=>tl(e,t-1)):[...e]:eb(e)?t?eG(e,([e,r])=>[e,tl(r,t-1)]):{...e}:eI(e)?new Set(t?eF(e,e=>tl(e,t-1)):e):eE(e)?new Map(t?eF(e,e=>[e[0],tl(e[1],t-1)]):e):e,tu=(e,...t)=>e?.push(...t),tc=(e,...t)=>e?.unshift(...t),tf=(e,t)=>{if(e){if(!eb(t))return[e,e];var r,n,a,i={};if(eb(e))return eJ(e,([e,o])=>{if(o!==t[e]){if(eb(r=o)){if(!(o=tf(o,t[e])))return;[o,r]=o}else ec(o)&&ec(n)&&(o=(r=o)-n);i[e]=o,(a??=tl(t))[e]=r}}),a?[i,a]:void 0}},td=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(td(X)):performance.timeOrigin+performance.now():Date.now,tv=(e=!0,t=()=>td())=>{var r,n=+e*t(),a=0;return(i=e,o)=>(r=e?a+=-n+(n=t()):a,o&&(a=0),(e=i)&&(n=t()),r)},tp=(e=0)=>{var t,r,n=(a,i=e)=>{if(void 0===a)return!!r;clearTimeout(t),ea(a)?a&&(i<0?el:es)(r?.())?n(r):r=void 0:(r=a,t=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},th=(e,t=0)=>{var r=eS(e)?{frequency:t,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{},raf:l}=r;t=r.frequency??0;var u=0,c=tw(!0).resolve(),f=tv(!a),d=f(),v=async e=>{if(!u||!n&&c.pending&&!0!==e)return!1;if(m.busy=!0,!0!==e)for(;c.pending;)await c;return e||c.reset(),(await L(()=>s(f(),-d+(d=f())),!1,()=>!e&&c.resolve())===!1||t<=0||o)&&g(!1),m.busy=!1,!0},p=()=>u=setTimeout(()=>l?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{m.active&&v(),m.active&&p()},g=(e,t=!e)=>(f(e,t),clearTimeout(u),m.active=!!(u=e?p():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=e??t,s=r??s,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await v(e)&&(g(m.active),!0)};return m.toggle(!a,i)};class tg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tm,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}}class tm{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[t?\"error\":\"value\"]=r===G||r,e(r),this})}),[this.resolve,this.reject]=e}then(e,t){return this._promise.then(e,t)}}var ty=(e,t=0)=>t>0?setTimeout(e,t):window.queueMicrotask(e),tb=(e,t)=>null==e||isFinite(e)?!e||e<=0?ts(t):new Promise(r=>setTimeout(async()=>r(await ts(t)),e)):P(`Invalid delay ${e}.`),tw=e=>e?new tg:new tm,tk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),tS=(e,t,r)=>{var n=!1,a=(...t)=>e(...t,i),i=()=>n!==(n=!1)&&(r(a),!0),o=()=>n!==(n=!0)&&(t(a),!0);return o(),[i,o]},tT=()=>{var e,t=new Set;return[(r,n)=>{var a=tS(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,a[0]),a},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tE=(e,t=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(t)?[e.slice(0,-1).join(t[1]??\", \"),\" \",t[0],\" \",e[e.length-1]].join(\"\"):e.join(t??\", \"):G,tI=(e,t,r)=>null==e?G:ev(t)?null==(t=t[0])?G:t+\" \"+tI(e,t,r):null==t?G:1===t?e:r??e+\"s\",tA=!0,tx=(e,t,r)=>r?(tA&&tu(r,\"\\x1b[\",t,\"m\"),ev(e)?tu(r,...e):tu(r,e),tA&&tu(r,\"\\x1b[m\"),r):tx(e,t,[]).join(\"\"),tN=(e,t=\"'\")=>null==e?G:t+e+t,tO=(e,t)=>e&&(e.length>t?e.slice(0,-1)+\"…\":e),tC=(e,t,r)=>null==e?G:eS(t)?tE(eF(ef(e)?[e]:e,t),r??\"\"):ef(e)?e:tE(eF(e,e=>!1===e?G:e),t??\"\"),t$=(e,t=[0,.25,.5,.75,1])=>{for(var r,n,a=/[\\p{L}\\p{N}][\\p{L}\\p{N}'’]*|([.!?]+)/gu,i=0,o=0,s=0,l=0,u=!1;r=a.exec(e);)r[1]?(u&&++l,u=!1):(u=!0,i+=r[0].length,r[0].length>6&&++s,++o);u&&++l,a=/[\\p{L}\\p{N}]|([^\\p{L}\\p{N}]+)/gu;var c=t.map(e=>e*i|0),f=[],d=0,v=0,p=!1;do if(r=a.exec(e),r?.[1])p&&++v;else{d=r?.index;for(var h=!1,g=0;g<c.length;g++)c[g]--||(f[g]={offset:n??d,wordsBefore:v,readTime:eA(v/238*6e4)},h=!0);(p=!h)||(v=0),n=d+1}while(r);return{text:e,length:e.length,characters:i,words:o,sentences:l,lix:eA(o/l+100*s/o),readTime:eA(o/238*6e4),boundaries:f}},tj=e=>(e=Math.log2(e))===(0|e),tM=(e,t,r,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,t])=>ef(e)&&ec(t)).map(([e,t])=>[e.toLowerCase(),t])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,t)=>e|t,0),f=t?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,t])=>[t,e])),v=(e,r)=>eu(e)?!t&&r?null!=d[e]?e:G:Number.isSafeInteger(e)?e:G:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),r):G,p=!1,[h,g]=t?[(e,t)=>Array.isArray(e)?e.reduce((e,r)=>null==r||p?e:null==(r=v(r,t))?(p=!0,G):(e??0)|r,(p=!1,G)):v(e),(e,t)=>null==(e=h(e,!1))?G:t&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,t])=>t&&e&t&&tj(t)).map(([e])=>e),t?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:G],m=(e,t)=>null==e?G:null==(e=h(o=e,t))?P(TypeError(`${JSON.stringify(o)} is not a valid ${r} value.`)):e,y=l.filter(([,e])=>!n||(n&e)===e&&tj(e));return ti(e=>m(e),[{configurable:!1,enumerable:!1},{parse:m,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,t=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+r:`the ${r} ${tE(eF(eh(e),e=>tN(e)),[t])}`},t&&{pure:y,map:(e,t)=>(e=m(e),y.filter(([,t])=>t&e).map(t??(([,e])=>e)))}])},t_=(...e)=>{var t=e0(eG(e,!0)),r=e=>(eg(e)&&(ev(e)?e.forEach((t,n)=>e[n]=r(t)):t.forEach(([t,r])=>{var n,a=G;null!=(n=e[t])&&(1===r.length?e[t]=r[0].parse(n):r.forEach((i,o)=>!a&&null!=(a=o===r.length-1?i.parse(n):i.tryParse(n))&&(e[t]=a)))})),e);return r},tU=Symbol(),tF=(e,t=[\"|\",\";\",\",\"],r=!0)=>{if(!e)return G;var n=e.split(\"=\").map(e=>r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&t?.length&&e1(t,(e,t,r=n[1].split(e))=>r.length>1?r:G)||(n[1]?[n[1]]:[]),n},tq=(e,t=!0,r)=>null==e?G:tW(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:r,urn:r?!n:!n&&G,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):G,path:c,query:!1===t?f:tP(f,t),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":G),v}),tP=(e,t,r=!0)=>tR(e,\"&\",t,r),tR=(e,t,r,n=!0)=>{var a=[],i=null==e?G:eG(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(t),(e,t,[i,o,s]=tF(e,!1===r?[]:!0===r?G:r,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==r?[i,s.length>1?s:o]:[i,o]:G,a.push(l),l),(e,t)=>e?!1!==r?eR(e,t):(e?e+\",\":\"\")+t:t);return i&&(i[tU]=a),i},tz=(e,t)=>t&&null!=e?t.test(e):G,tD=(e,t,r)=>tW(e,t,r,!0),tW=(r,n,a,i=!1)=>(r??n)==null?G:a?(e=G,i?(t=[],tW(r,n,(...r)=>null!=(e=a(...r))&&t.push(e))):r.replace(n,(...t)=>e=a(...t)),e):r.match(n),tB=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tV=/\\z./g,tJ=(e,t)=>(t=tC(eq(eX(e,e=>e?.length)),\"|\"))?RegExp(t,\"gu\"):tV,tL={},tK=e=>e instanceof RegExp,tG=(e,t=[\",\",\" \"])=>tK(e)?e:ev(e)?tJ(eF(e,e=>tG(e,t)?.source)):ea(e)?e?/./g:tV:ef(e)?tL[e]??=tW(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,n)=>r?RegExp(r,\"gu\"):tJ(eF(tH(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tC(t,tB)}]`)),e=>e&&`^${tC(tH(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>tB(tX(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):G,tH=(e,t)=>e?.split(t)??e,tX=(e,t,r)=>e?.replace(t,r)??e,tY=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return e7(r,{push(n,a){for(var i,o=[n,a],s=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u=r[l];if(0>e(o[1],u[0]))return s(r.splice(l,0,o));if(0>=e(o[0],u[1])){if(0>e(o[0],u[0])&&(i=u[0]=o[0]),e(o[1],u[1])>0&&(i=u[1]=o[1]),!(r[l+1]?.[0]<u[1]))return s(null!=i);i=o=r.splice(l--,1)[0]}}return s(o&&(r[r.length]=o))},width:0})},tZ=5e3,tQ=()=>()=>P(\"Not initialized.\"),t0=window,t1=document,t2=t1.body,t4=(e,t)=>!!e?.matches(t);((e=!0)=>tA=e)(!!t0.chrome);var t6=H,t5=(e,t,r=(e,t)=>t>=t6)=>{for(var n,a=0,i=X;e?.nodeType===1&&!r(e,a++)&&t(e,(e,t)=>(null!=e&&(n=e,i=t!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==t1&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},t3=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return W(()=>JSON.parse(e),Z);case\"h\":return W(()=>np(e),Z);case\"e\":return W(()=>ng?.(e),Z);default:return ev(t)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:t3(e,t[0])):void 0}},t8=(e,t,r)=>t3(e?.getAttribute(t),r),t9=(e,t,r)=>t5(e,(e,n)=>n(t8(e,t,r))),t7=(e,t)=>t8(e,t)?.trim()?.toLowerCase(),re=e=>e?.getAttributeNames(),rt=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,rr=e=>null!=e?e.tagName:null,rn=()=>({x:(r=ra(X)).x/(t2.offsetWidth-window.innerWidth)||0,y:r.y/(t2.offsetHeight-window.innerHeight)||0}),ra=e=>({x:eA(scrollX,e),y:eA(scrollY,e)}),ri=(e,t)=>tX(e,/#.*$/,\"\")===tX(t,/#.*$/,\"\"),ro=(e,t,r=Y)=>(n=rs(e,t))&&K({xpx:n.x,ypx:n.y,x:eA(n.x/t2.offsetWidth,4),y:eA(n.y/t2.offsetHeight,4),pageFolds:r?n.y/window.innerHeight:void 0}),rs=(e,t)=>t?.pointerType&&t?.pageY!=null?{x:t.pageX,y:t.pageY}:e?({x:a,y:i}=rl(e),{x:a,y:i}):void 0,rl=e=>e?(o=e.getBoundingClientRect(),r=ra(X),{x:eA(o.left+r.x),y:eA(o.top+r.y),width:eA(o.width),height:eA(o.height)}):void 0,ru=(e,t,r,n={capture:!0,passive:!0})=>(t=eh(t),tS(r,r=>eJ(t,t=>e.addEventListener(t,r,n)),r=>eJ(t,t=>e.removeEventListener(t,r,n)))),rc=e=>{var{host:t,scheme:r,port:n}=tq(e,!1);return{host:t+(n?\":\"+n:\"\"),scheme:r}},rf=()=>({...r=ra(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:t2.offsetWidth,totalHeight:t2.offsetHeight});(I=s||(s={}))[I.Anonymous=0]=\"Anonymous\",I[I.Indirect=1]=\"Indirect\",I[I.Direct=2]=\"Direct\",I[I.Sensitive=3]=\"Sensitive\";var rd=tM(s,!1,\"data classification\"),rv=(e,t)=>rd.parse(e?.classification??e?.level)===rd.parse(t?.classification??t?.level)&&rh.parse(e?.purposes??e?.purposes)===rh.parse(t?.purposes??t?.purposes),rp=(e,t)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:rd.parse(e.classification??e.level??t?.classification??0),purposes:rh.parse(e.purposes??e.purpose??t?.purposes??l.Necessary)};(A=l||(l={}))[A.None=0]=\"None\",A[A.Necessary=1]=\"Necessary\",A[A.Functionality=2]=\"Functionality\",A[A.Performance=4]=\"Performance\",A[A.Targeting=8]=\"Targeting\",A[A.Security=16]=\"Security\",A[A.Infrastructure=32]=\"Infrastructure\",A[A.Any_Anonymous=49]=\"Any_Anonymous\",A[A.Any=63]=\"Any\",A[A.Server=2048]=\"Server\",A[A.Server_Write=4096]=\"Server_Write\";var rh=tM(l,!0,\"data purpose\",2111),rg=tM(l,!1,\"data purpose\",0),rm=(e,t)=>((u=e?.metadata)&&(t?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),ry=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var rb=tM(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var rw=e=>`'${e.key}' in ${rb.format(e.scope)} scope`,rk={scope:rb,purpose:rg,purposes:rh,classification:rd};t_(rk);var rS=e=>e?.filter(ee).sort((e,t)=>e.scope===t.scope?e.key.localeCompare(t.key,\"en\"):e.scope-t.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",tM(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",tM(d,!1,\"variable set status\");var rT=(e,t,r)=>{var n,a=e(),i=e=>e,o=(e,r=rx)=>V(async()=>(n=i(r(await a,t)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,rI)),values:o(e=>eF(e,e=>rI(e)?.value)),push:()=>(i=e=>(r?.(eF(rE(e))),e),s),value:o(e=>rI(e[0])?.value),variable:o(e=>rI(e[0])),result:o(e=>e[0])};return s},rE=e=>e?.map(e=>e?.status<400?e:G),rI=e=>rA(e)?e.current??e:G,rA=(e,t=!1)=>t?e?.status<300:e?.status<400||e?.status===404,rx=(e,t,r)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!r&&404===e.status?e:(a=`${rw(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=t?.[o])||!1!==n(e,a))&&i.push(a),G)));return i.length?P(i.join(\"\\n\")):ev(e)?o:o?.[0]},rN=e=>rx(e,G,!0),rO=e=>e&&\"string\"==typeof e.type,rC=((...e)=>t=>t?.type&&e.some(e=>e===t?.type))(\"view\"),r$=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rj=(e,t)=>t&&(!(p=e.get(v=t.tag+(t.value??\"\")))||(p.score??1)<(t.score??1))&&e.set(v,t),rM=(e,t=\"\",r=new Map)=>{if(e)return eT(e)?eJ(e,e=>rM(e,t,r)):ef(e)?tW(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?r$(n)+\"::\":\"\")+t+r$(a),value:r$(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),rj(r,u)}):rj(r,e),r},r_=new WeakMap,rU=e=>r_.get(e),rF=(e,t=X)=>(t?\"--track-\":\"track-\")+e,rq=(e,t,r,n,a,i)=>t?.[1]&&eJ(re(e),o=>t[0][o]??=(i=X,ef(n=eJ(t[1],([t,r,n],a)=>tz(o,t)&&(i=void 0,!r||t4(e,r))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&rM(a,tX(n,/\\-/g,\":\"),r),i)),rP=()=>{},rR=(e,t)=>{if(h===(h=rL.tags))return rP(e,t);var r=e=>e?tK(e)?[[e]]:eT(e)?eP(e,r):[eb(e)?[tG(e.match),e.selector,e.prefix]:[tG(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(eQ(h))]];(rP=(e,t)=>rq(e,n,t))(e,t)},rz=(e,t)=>tC(eR(rt(e,rF(t,Y)),rt(e,rF(\"base-\"+t,Y))),\" \"),rD={},rW=(e,t,r=rz(e,\"attributes\"))=>{r&&rq(e,rD[r]??=[{},tD(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tG(r||n),,t])],t),rM(rz(e,\"tags\"),void 0,t)},rB=(e,t,r=X,n)=>(r?t5(e,(e,r)=>r(rB(e,t,X)),eS(r)?r:void 0):tC(eR(t8(e,rF(t)),rt(e,rF(t,Y))),\" \"))??(n&&(g=rU(e))&&n(g))??null,rV=(e,t,r=X,n)=>\"\"===(m=rB(e,t,r,n))||(null==m?m:ei(m)),rJ=(e,t,r,n)=>e?(rW(e,n??=new Map),t5(e,e=>{rR(e,n),rM(r?.(e),void 0,n)},t),n.size?{tags:[...n.values()]}:{}):{},rL={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},rK=[],rG=[],rH=(e,t=0)=>e.charCodeAt(t),rX=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>rK[rG[t]=e.charCodeAt(0)]=t);var rY=e=>{for(var t,r=0,n=e.length,a=[];n>r;)t=e[r++]<<16|e[r++]<<8|e[r++],a.push(rG[(16515072&t)>>18],rG[(258048&t)>>12],rG[(4032&t)>>6],rG[63&t]);return a.length+=n-r,rX(a)},rZ=e=>{for(var t,r=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>r;)i[n++]=rK[rH(e,r++)]<<2|(t=rK[rH(e,r++)])>>4,a>r&&(i[n++]=(15&t)<<4|(t=rK[rH(e,r++)])>>2,a>r&&(i[n++]=(3&t)<<6|rK[rH(e,r++)]));return i},rQ={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},r0=(e=256)=>e*Math.random()|0,r1=e=>{var t,r,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((t=e.length)+4)%16,i=new Uint8Array(4+t+a),n=0;n<3;i[n++]=g(r0()));for(r=0,i[n++]=g(f^16*r0(16)+a);t>r;i[n++]=g(f^e[r++]));for(;a--;)i[n++]=r0();return i}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((f^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(t);t>n;i[n++]=f^g(e[r++]));return i}:e=>e,(e,t=64)=>{if(null==e)return null;for(s=ea(t)?64:t,h(),[o,l]=rQ[s],r=0;r<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[r++])))*l));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},r2={exports:{}};(e=>{(()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,a=new Uint8Array(128),i=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var t=e/4294967296,a=e%4294967296;c([211,t>>>24,t>>>16,t>>>8,t,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(r=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(r))})(e);break;case\"string\":(d=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(e.charCodeAt(n)>127){t=!1;break}for(var a=0,i=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return t?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var t=e.getTime()/1e3;if(0===e.getMilliseconds()&&t>=0&&t<4294967296)c([214,255,t>>>24,t>>>16,t>>>8,t]);else if(t>=0&&t<17179869184){var r=1e6*e.getMilliseconds();c([215,255,r>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t])}else{var r=1e6*e.getMilliseconds();c([199,12,255,r>>>24,r>>>16,r>>>8,r]),f(t)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var t=0;for(var r in e)void 0!==e[r]&&t++;for(var r in t<=15?u(128+t):t<=65535?c([222,t>>>8,t]):c([223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(s(r),s(n))}})(e);break;default:if(!a&&t&&t.invalidTypeReplacement)\"function\"==typeof t.invalidTypeReplacement?s(t.invalidTypeReplacement(e),!0):s(t.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var t=e.length;t<=15?u(144+t):t<=65535?c([220,t>>>8,t]):c([221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;t>r;r++)s(e[r])}function u(e){if(a.length<i+1){for(var t=2*a.length;t<i+1;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var t=2*a.length;t<i+e.length;)t*=2;var r=new Uint8Array(t);r.set(a),a=r}a.set(e,i),i+=e.length}function f(e){var t,r;e>=0?(t=e/4294967296,r=e%4294967296):(t=~(t=Math.abs(++e)/4294967296),r=~(r=Math.abs(e)%4294967296)),c([t>>>24,t>>>16,t>>>8,t,r>>>24,r>>>16,r>>>8,r])}}function r(e,t){var r,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(a());else r=a();return r;function a(){var t=e[n++];if(t>=0&&t<=127)return t;if(t>=128&&t<=143)return u(t-128);if(t>=144&&t<=159)return c(t-144);if(t>=160&&t<=191)return f(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return l(-1,1);if(197===t)return l(-1,2);if(198===t)return l(-1,4);if(199===t)return d(-1,1);if(200===t)return d(-1,2);if(201===t)return d(-1,4);if(202===t)return s(4);if(203===t)return s(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return i(1);if(209===t)return i(2);if(210===t)return i(4);if(211===t)return i(8);if(212===t)return d(1);if(213===t)return d(2);if(214===t)return d(4);if(215===t)return d(8);if(216===t)return d(16);if(217===t)return f(-1,1);if(218===t)return f(-1,2);if(219===t)return f(-1,4);if(220===t)return c(-1,2);if(221===t)return c(-1,4);if(222===t)return u(-1,2);if(223===t)return u(-1,4);if(t>=224&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(t){for(var r=0,a=!0;t-- >0;)if(a){var i=e[n++];r+=127&i,128&i&&(r-=128),a=!1}else r*=256,r+=e[n++];return r}function o(t){for(var r=0;t-- >0;)r*=256,r+=e[n++];return r}function s(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return(n+=t,4===t)?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function l(t,r){t<0&&(t=o(r));var a=e.subarray(n,n+t);return n+=t,a}function u(e,t){e<0&&(e=o(t));for(var r={};e-- >0;)r[a()]=a();return r}function c(e,t){e<0&&(e=o(t));for(var r=[];e-- >0;)r.push(a());return r}function f(t,r){t<0&&(t=o(r));var a=n;return n+=t,((e,t,r)=>{var n=t,a=\"\";for(r+=t;r>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=r)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=r)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=r)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,t)}function d(e,t){e<0&&(e=o(t));var r=o(1),a=l(e);return 255===r?(e=>{if(4===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*t)}if(8===e.length){var r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*t+r/1e6)}if(12===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var t=i(8);return new Date(1e3*t+r/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:r,data:a}}}var n={serialize:t,deserialize:r,encode:t,decode:r};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(r2);var{deserialize:r4,serialize:r6}=(C=r2.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C,r5=\"$ref\",r3=(e,t,r)=>ek(e)?G:r?t!==G:null===t||t,r8=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var a,i,o,s=(e,t,n=e[t],a=r3(t,n,r)?u(n):G)=>(n!==a&&(a!==G||ev(e)?e[t]=a:delete e[t],l(()=>e[t]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return G;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[r5]||(e[r5]=o,l(()=>delete e[r5])),{[r5]:o};if(eb(e))for(var t in(i??=new Map).set(e,i.size+1),e)s(e,t);else!eT(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?s(e,r):(e[r]=null,l(()=>delete e[r])));return e};return W(()=>t?r6(u(e)??null):W(()=>JSON.stringify(e,G,n?2:0),()=>JSON.stringify(u(e),G,n?2:0)),!0,()=>a?.forEach(e=>e()))},r9=e=>{var t,r,n=e=>eg(e)?e[r5]&&(r=(t??=[])[e[r5]])?r:(e[r5]&&(t[e[r5]]=e,delete e[r5]),Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ef(e)?JSON.parse(e):null!=e?W(()=>r4(e),()=>(console.error(\"Invalid message received.\",e),G)):e)},r7=(e,t={})=>{var r=(e,{json:t=!1,...r})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,t=>255&e.charCodeAt(t))):t?W(()=>JSON.stringify(e),()=>JSON.stringify(r8(e,!1,r))):r8(e,!0,r),n);if(t)return[e=>r8(e,!1,r),e=>null==e?G:W(()=>r9(e),G),(e,t)=>n(e,t)];var[a,i,o]=r1(e);return[(e,t)=>(t?Q:rY)(a(r8(e,!0,r))),e=>null!=e?r9(i(e instanceof Uint8Array?e:rZ(e))):null,(e,t)=>n(e,t)]};if(!e){var n=+(t.json??0);if(n&&!1!==t.prettify)return(y??=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[+n]}return r(e,t)};r7();var[ne,nt]=r7(null,{json:!0,prettify:!0}),nr=tH(\"\"+t1.currentScript.src,\"#\"),nn=tH(\"\"+(nr[1]||\"\"),\";\"),na=nr[0],ni=nn[1]||tq(na,!1)?.host,no=e=>!!(ni&&tq(e,!1)?.host?.endsWith(ni)===Y),ns=(...e)=>tX(tC(e),/(^(?=\\?))|(^\\.(?=\\/))/,na.split(\"?\")[0]),nl=ns(\"?\",\"var\"),nu=ns(\"?\",\"mnt\");ns(\"?\",\"usr\");var nc=Symbol(),nf=Symbol(),nd=(e,t,r=Y,n=X)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tx(\"tail.js: \",\"90;3\"))+t);var a=e?.[nf];a&&(e=e[nc]),null!=e&&console.log(eg(e)?tx(ne(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,t,r])=>nd(e,t,r,!0)),t&&console.groupEnd()},[nv,np]=r7(),[nh,ng]=[tQ,tQ],[nm,ny]=tT(),nb=e=>{ng===tQ&&([nh,ng]=r7(e),ny(nh,ng))},nw=e=>t=>nk(e,t),nk=(...e)=>{var t=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",t.id??t,...e)},[nS,nT]=tT(),[nE,nI]=tT(),nA=e=>nN!==(nN=e)&&nT(nN=!1,n$(!0,!0)),nx=e=>nO!==(nO=!!e&&\"visible\"===document.visibilityState)&&nI(nO,!e,nC(!0,!0));nS(nx);var nN=!0,nO=!1,nC=tv(!1),n$=tv(!1);ru(window,[\"pagehide\",\"freeze\"],()=>nA(!1)),ru(window,[\"pageshow\",\"resume\"],()=>nA(!0)),ru(document,\"visibilitychange\",()=>(nx(!0),nO&&nA(!0))),nT(nN,n$(!0,!0));var nj=!1,nM=tv(!1),[n_,nU]=tT(),nF=th({callback:()=>nj&&nU(nj=!1,nM(!1)),frequency:2e4,once:!0,paused:!0}),nq=()=>!nj&&(nU(nj=!0,nM(!0)),nF.restart());ru(window,[\"focus\",\"scroll\"],nq),ru(window,\"blur\",()=>nF.trigger()),ru(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nq),nq();var nP=()=>nM();($=b||(b={}))[$.View=-3]=\"View\",$[$.Tab=-2]=\"Tab\",$[$.Shared=-1]=\"Shared\";var nR=tM(b,!1,\"local variable scope\"),nz=e=>nR.tryParse(e)??rb(e),nD=e=>nR.format(e)??rb.format(e),nW=e=>!!nR.tryParse(e?.scope),nB=t_({scope:nR},rk),nV=e=>null==e?void 0:ef(e)?e:e.source?nV(e.source):`${nz(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nJ=e=>{var t=e.split(\"\\0\");return{scope:+t[0],key:t[1],targetId:t[2]}},nL=0,nK=void 0,nG=()=>(nK??tQ())+\"_\"+nH(),nH=()=>(td(!0)-(parseInt(nK.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nL).toString(36),nX=e=>crypto.getRandomValues(e),nY=()=>tX(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nX(new Uint8Array(1))[0]&15>>e/4).toString(16)),nZ={},nQ={id:nK,heartbeat:td()},n0={knownTabs:{[nK]:nQ},variables:{}},[n1,n2]=tT(),[n4,n6]=tT(),n5=tQ,n3=e=>nZ[nV(e)],n8=(...e)=>n7(e.map(e=>(e.cache=[td(),3e3],nB(e)))),n9=e=>eF(e,e=>e&&[e,nZ[nV(e)]]),n7=e=>{var t=eF(e,e=>e&&[nV(e),e]);if(t?.length){var r=n9(e);e7(nZ,t);var n=eX(t,e=>e[1].scope>b.Tab);n.length&&(e7(n0.variables,n),n5({type:\"patch\",payload:eG(n)})),n6(r,nZ,!0)}};nm((e,t)=>{nS(r=>{if(r){var n=t(sessionStorage.getItem(F));sessionStorage.removeItem(F),nK=n?.[0]??td(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nZ=eG(eR(eX(nZ,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nV(e),e])))}else sessionStorage.setItem(F,e([nK,eF(nZ,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n5=(t,r)=>{e&&(localStorage.setItem(F,e([nK,t,r])),localStorage.removeItem(F))},ru(window,\"storage\",e=>{if(e.key===F){var n=t?.(e.newValue);if(n&&(!n[2]||n[2]===nK)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)r.active||n5({type:\"set\",payload:n0},a);else if(\"set\"===i&&r.active)e7(n0,o),e7(nZ,o.variables),r.trigger();else if(\"patch\"===i){var s=n9(eF(o,1));e7(n0.variables,o),e7(nZ,o),n6(s,nZ,!1)}else\"tab\"===i&&(e7(n0.knownTabs,a,o),o&&n2(\"tab\",o,!1))}}});var r=th(()=>n2(\"ready\",n0,!0),-25),n=th({callback(){var e=td()-1e4;eJ(n0?.knownTabs,([t,r])=>r[0]<e&&tn(n0.knownTabs,t)),nQ.heartbeat=td(),n5({type:\"tab\",payload:nQ})},frequency:5e3,paused:!0}),a=e=>{n5({type:\"tab\",payload:e?nQ:void 0}),e?(r.restart(),n5({type:\"query\"})):r.toggle(!1),n.toggle(e)};nS(e=>a(e),!0)},!0);var[ae,at]=tT(),[ar,an]=tT(),aa=((e,{timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var a=()=>(r?ng:np)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(r?nh:nv)([nK,td()+t]));return async(r,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<td())&&(o(),a()?.[0]===nK))return t>0&&(i=setInterval(()=>o(),t/2)),await L(r,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=tw(),[f]=ru(window,\"storage\",t=>{t.key!==e||t.newValue||c.resolve()});await tk(tb(s??t),c),f()}null==s&&P(e+\" could not be acquired.\")}})(U+\"rq\"),ai=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=r=>{var s=eS(t)?t?.(a,r):t;return!1!==s&&(null!=s&&!0!==s&&(a=s),at(e,a,r,e=>(o=a===G,a=e)),!o&&(i=n?nh(a,!0):JSON.stringify(a)))};if(!r)return await aa(()=>eL(1,async t=>{if(!s(t))return eN();var r=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(r.status>=400)return 0===t?eN(P(`Invalid response: ${await r.text()}`)):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tb((1+t)*200));var o=n?new Uint8Array(await r.arrayBuffer()):await r.text(),l=o?.length?(n?ng:JSON.parse)?.(o):G;return null!=l&&an(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||P(\"Beacon send failed.\"))},ao=[\"scope\",\"key\",\"targetId\",\"version\"],as=[...ao,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],al=[...ao,\"init\",\"purpose\",\"refresh\"],au=[...as,\"value\",\"force\",\"patch\"],ac=new Map,af=(e,t)=>{var r=th(async()=>{var e=eF(ac,([e,t])=>({...nJ(e),result:[...t]}));e.length&&await u.get(...e)},3e3),n=(e,t)=>t&&eB(t,t=>e3(ac,e,()=>new Set).add(t)),a=(e,t)=>{if(e){var r,a=nV(e),i=ta(ac,a);if(i?.size){if(e?.purposes===t?.purposes&&e?.classification==t?.classification&&R(e?.value,t?.value))return;eJ(i,i=>{r=!1,i?.(e,t,(e=!0)=>r=e),r&&n(a,i)})}}};nS((e,t)=>r.toggle(e,e&&t>=3e3),!0),n4(e=>eJ(e,([e,t])=>a(e,t)));var i=new Map,o=(e,t)=>e7(i,e,ea(t)?t?void 0:0:t),u={get:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(a=r[0],r=r.slice(1)),t?.validateKey(a);var a,i=[],s=eF(r,(e,t)=>[e,t]),l=[],u=(await ai(e,()=>!!(s=eF(s,([e,t])=>{if(e){var r=nV(e);n(r,e.result);var a=n3(r);e.init&&o(r,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<td())tu(i,[{...a,status:d.Success},t]);else if(!nW(e))return[to(e,al),t];else if(eb(e.init)){var u={...nB(e),status:d.Created,...e.init};null!=u.value&&(tu(l,c(u)),tu(i,[u,t]))}}else tu(i,[{...e,status:d.Denied,error:\"No consent for \"+rh.logFormat(s)},t])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:t?.deviceSessionId}))?.variables?.get??[];return tu(i,...eF(u,(e,t)=>e&&[e,s[t][1]])),l.length&&n7(l),i.map(([e])=>e)},eF(r,e=>e?.error)),set:(...r)=>rT(async()=>{(!r[0]||ef(r[0]))&&(n=r[0],r=r.slice(1)),t?.validateKey(n);var n,a=[],i=[],u=eF(r,(e,t)=>{if(e){var r=nV(e),n=n3(r);if(o(r,e.cache),nW(e)){if(null!=e.patch)return P(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nR(e.scope),key:e.key};return i[t]={status:n?d.Success:d.Created,source:e,current:u},void tu(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[to(e,au),t]}}),f=u.length?D((await ai(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:t?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n7(a),eJ(f,(e,t)=>{var[r,n]=u[t];e.source=r,r.result?.(e),i[n]=e}),i},eF(r,e=>e?.error))},c=(e,t=td())=>({...to(e,as),cache:[t,t+(ta(i,nV(e))??3e3)]});return ar(({variables:e})=>{if(e){var t=td(),r=eR(eF(e.get,e=>rI(e)),eF(e.set,e=>rI(e)));r?.length&&n7(eB(r,c,t))}}),u},ad=(e,t,r=tZ)=>{var n=[],a=new WeakMap,i=new Map,o=(e,t)=>e.metadata?.queued?e8(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):P(\"Source event not queued.\"),s=async(r,n=!0,a)=>{var i;return(!r[0]||ef(r[0]))&&(i=r[0],r=r.slice(1)),nd({[nf]:eF(r=r.map(e=>(t?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(rm(tl(e),!0),{timestamp:e.timestamp-td()}))),e=>[e,e.type,X])},\"Posting \"+tE([tI(\"new event\",[eY(r,e=>!ry(e))||void 0]),tI(\"event patch\",[eY(r,e=>ry(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ai(e,{events:r,variables:a,deviceSessionId:t?.deviceSessionId},{beacon:n})},l=async(e,{flush:r=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(t.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eJ(e,e=>nd(e,e.type)),!a)return s(e,!1,i);if(!r){e.length&&tu(n,...e);return}n.length&&tc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return r>0&&th(()=>l([],{flush:!0}),r),nE((e,t,r)=>{if(!e&&(n.length||t||r>1500)){var o=eF(i,([e,t])=>{var[r,n]=t();return n&&(i.delete(e),a.delete(e)),r});(n.length||o.length)&&l(eR(n.splice(0),o),{flush:!0})}}),{post:l,postPatch:(e,t,r)=>l(o(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var s=!1,u=()=>{s=!0};return a.set(e,tl(e)),i.set(e,()=>{if(n?.isConnected===!1)u();else{var r=a.get(e),[i,l]=tf(t(r,u),r)??[];if(i&&!R(l,r))return a.set(e,tl(l)),[o(e,i),s]}return[void 0,s]}),r&&l(e),u}}},av=Symbol(),ap=[.75,.33],ah=[.25,.33],ag=e=>{var t=new IntersectionObserver(e=>eJ(e,e=>e.target[av]?.(e))),r=new Set;th({callback:()=>eJ(r,e=>e()),frequency:250,raf:!0});var n=(e,t,r=0)=>e<r?r:e>t?t:e,a=t1.createRange();return(i,o)=>{if(o&&(s=eX(o?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(s)){var s,l,u,c,f,d,v=X,p=X,h=0,g=0,m=(e,t,r,n)=>{var a=(l??=[])[e]??=[{duration:0,impressions:0},tv(!1,nP),!1,!1,0,0,0,tY()];a[4]=t,a[5]=r,a[6]=n},y=[tY(),tY()],b=a_(!1),w=tv(!1,nP),k=-1,S=()=>{var t=i.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,S=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],T=S[2]-S[0],E=S[1]-S[3],I=T/t.height||0,A=E/t.width||0,x=v?ah:ap,N=(T>x[0]*o||I>x[0])&&(E>x[0]*r||A>x[0]);if(p!==N&&w(p=N,!0),v!==(v=p&&w()>=rL.impressionThreshold-250)&&(++h,b(v),u||tu(e,u=eX(eF(s,e=>(e.track?.impressions||rV(i,\"impressions\",Y,e=>e.track?.impressions))&&K({type:\"impression\",pos:ro(i),viewport:rf(),timeOffset:aF(),impressions:h,...aG(i,Y)})||null))),u?.length)){var O=b();c=eF(u,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:l&&{top:l[0][0],middle:l[1][0],bottom:l[2][0]},seen:g,text:d,read:O.activeTime&&d&&n(O.activeTime/d.readTime,g)})))}if(t.height!==k){k=t.height;var C=i.textContent;if({boundaries:f,...d}=t$(C??\"\",[0,.25,.75,1]),l||t.height>=1.25*o){var $,j=t1.createTreeWalker(i,NodeFilter.SHOW_TEXT),M=0,_=0;for(l??=[];_<f.length&&($=j.nextNode());){var U=$.textContent?.length??0;for(M+=U;M>=f[_]?.offset;)if(a[_%2?\"setEnd\":\"setStart\"]($,f[_].offset-M+U),_++%2){var{top:F,bottom:q}=a.getBoundingClientRect(),P=t.top;_<3?m(0,F-P,q-P,f[1].readTime):(m(1,l[0][4],F-P,f[2].readTime),m(2,F-P,q-P,f[3].readTime))}}}}var R=t.left<0?-t.left:0,z=t.top<0?-t.top:0,D=t.width*t.height;v&&(g=y[0].push(z,z+T)*y[1].push(R,R+E)/D),l&&eJ(l,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),a=n(t.bottom>o?o:t.bottom,e[5],e[4]),i=v&&a-r>0,s=e[0];s.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,s.seen=e[7].push(r,a)/(e[5]-e[4]),s.read=n(s.duration/e[6],s.seen))})};i[av]=({isIntersecting:e})=>{e7(r,S,e),e||(eJ(c,e=>e()),S())},t.observe(i)}}},am=()=>{n4((e,t,r)=>{var n=eR(rS(eF(e,1))?.map(e=>[e,`${e.key} (${nD(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X]),[[{[nf]:rS(eF(t,1))?.map(e=>[e,`${e.key} (${nD(e.scope)}, ${e.scope<0?\"client-side memory only\":rh.format(e.purposes)})`,X])},\"All variables\",Y]]);nd({[nf]:n},tx(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(t)} in total).`,\"2;3\"))})},ay=()=>{var e=t0?.screen;if(!e)return{};var{width:t,height:r,orientation:n}=e,a=t<r,i=n?.angle??t0.orientation??0;return(-90===i||90===i)&&([t,r]=[r,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:t0.devicePixelRatio,width:t,height:r,landscape:a}}},ab=e=>tu(e,K({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,t,r=e.split(\"-\"))=>K({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...ay()})),aw=(e,t=\"A\"===rr(e)&&t8(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ak=(e,t=rr(e),r=rV(e,\"button\"))=>r!==X&&(z(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&z(t7(e,\"type\"),\"button\",\"submit\")||r===Y),aS=(e,t=!1)=>({tagName:e.tagName,text:tO(t8(e,\"title\")?.trim()||t8(e,\"alt\")?.trim()||e.innerText?.trim(),100),href:e.href?.toString(),rect:t?rl(e):void 0}),aT=(e,t,r=!1)=>{var n;return t5(e??t,e=>\"IMG\"===rr(e)||e===t?(n={element:aS(e,r)},X):Y),n},aE=e=>{if(w)return w;ef(e)&&([t,e]=np(e),e=r7(t)[1](e)),e7(rL,e),nb(ta(rL,\"encryptionKey\"));var t,r=ta(rL,\"key\"),n=t0[rL.name]??[];if(!ev(n)){P(`The global variable for the tracker \"${rL.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...t)=>{var r=Y;i=eX(i,n=>W(()=>(n[e]?.(...t,{tracker:w,unsubscribe:()=>r=X}),r),nw(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nG(),e.timestamp??=td(),v=Y;var t=X;return eF(a,([,r])=>{(t||r.decorate?.(e)===X)&&(t=Y)}),t?void 0:e},validateKey:(e,t=!0)=>!r&&!e||e===r||!!t&&P(`'${e}' is not a valid key.`)},u=af(nl,l),c=ad(nl,l),f=null,d=0,v=X,p=X;return Object.defineProperty(t0,rL.name,{value:w=Object.freeze({id:\"tracker_\"+nG(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(t=e[0],e=e.slice(1)),ef(e[0])){var t,r=e[0];e=r.match(/^[{[]/)?JSON.parse(r):np(r)}var n=X;if((e=eX(eP(e,e=>ef(e)?np(e):e),e=>{if(!e)return X;if(a0(e))rL.tags=e7({},rL.tags,e.tagAttributes);else if(a1(e))return rL.disabled=e.disable,X;else if(a6(e))return n=Y,X;else if(ie(e))return e(w),X;return p||a3(e)||a4(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>a4(e)?-100:a3(e)?-50:a7(e)?-10:rO(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(t??g.key),W(()=>{var e,t=f[d];if(o(\"command\",t),v=X,rO(t))c.post(t);else if(a5(t))u.get(...eh(t.get));else if(a7(t))u.set(...eh(t.set));else if(a3(t))tu(i,t.listener);else if(a4(t))(e=W(()=>t.extension.setup(w),e=>nk(t.extension.id,e)))&&(tu(a,[t.priority??100,e,t.extension]),e6(a,([e])=>e));else if(ie(t))t(w);else{var r=X;for(var[,e]of a)if(r=e.processCommand?.(t)??X)break;r||nk(\"invalid-command\",t,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nk(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),am(),n1(async(e,t,r,a)=>{if(\"ready\"===e){var i=rN((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:_,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ab(w),i.hasUserAgent=!0),p=!0,s.length&&tu(w,s),a(),tu(w,...eF(aX,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},aI=()=>k?.clientId,aA={scope:\"shared\",key:\"referrer\"},ax=(e,t)=>{w.variables.set({...aA,value:[aI(),e]}),t&&w.variables.get({scope:aA.scope,key:aA.key,result:(r,n,a)=>r?.value?a():n?.value?.[1]===e&&t()})},aN=tv(),aO=tv(),aC=1,a$=()=>aO(),[aj,aM]=tT(),a_=e=>{var t=tv(e,aN),r=tv(e,aO),n=tv(e,nP),a=tv(e,()=>aC);return(e,i)=>({totalTime:t(e,i),visibleTime:r(e,i),activeTime:n(e,i),activations:a(e,i)})},aU=a_(),aF=()=>aU(),[aq,aP]=tT(),aR=(e,t)=>(t&&eJ(aD,t=>e(t,()=>!1)),aq(e)),az=new WeakSet,aD=document.getElementsByTagName(\"iframe\"),aW=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&z(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aB(e){if(e){if(null!=e.units&&z(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aV=e=>rJ(e,void 0,e=>eF(eh(e3(r_,e)?.tags))),aJ=e=>e?.component||e?.content,aL=e=>rJ(e,t=>t!==e&&!!aJ(e3(r_,t)),e=>(T=e3(r_,e),(T=e3(r_,e))&&eP(eR(T.component,T.content,T),\"tags\"))),aK=(e,t)=>t?e:{...e,rect:void 0,content:(E=e.content)&&eF(E,e=>({...e,rect:void 0}))},aG=(e,t=X,r)=>{var n,a,i,o=[],s=[],l=0;return t5(e,e=>{var a=e3(r_,e);if(a){if(aJ(a)){var i=eX(eh(a.component),e=>0===l||!t&&(1===l&&e.track?.secondary!==Y||e.track?.promote));n=(r??e4(i,e=>e.track?.region))&&rl(e)||void 0;var u=aL(e);a.content&&tc(o,...eF(a.content,e=>({...e,rect:n,...u}))),i?.length&&(tc(s,...eF(i,e=>(l=eZ(l,e.track?.secondary?1:2),aK({...e,content:o,rect:n,...u},!!n)))),o=[])}var c=a.area||rB(e,\"area\");c&&tc(s,...eF(eh(c)))}}),o.length&&tu(s,aK({id:\"\",rect:n,content:o})),eJ(s,e=>{ef(e)?tu(a??=[],e):(e.area??=tC(a,\"/\"),tc(i??=[],e))}),i||a?{components:i,area:tC(a,\"/\")}:void 0},aH=Symbol();j={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=t1.cookie.match(/CookieConsent=([^;]*)/)?.[1];if(e){var t=1;return e?.replace(/([a-z]+):(true|false)/g,(e,r,n)=>(\"true\"===n&&(t|=j[r]??0),\"\")),{level:t>1?1:0,purposes:t}}}}}});var aX=[{id:\"context\",setup(e){th(()=>eJ(aD,e=>tt(az,e)&&aP(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(r,n,a)=>(null==k||!r?.value||k?.definition?t=r?.value:(k.definition=r.value,k.metadata?.posted&&e.events.postPatch(k,{definition:t})),a())});var t,r=n3({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n3({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n8({scope:\"tab\",key:\"tabIndex\",value:n=n3({scope:\"shared\",key:\"tabIndex\"})?.value??n3({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!ri(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=tq(location.href+\"\",!0);k={type:\"view\",timestamp:td(),clientId:nG(),tab:nK,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:r+1,viewport:rf(),duration:aU(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===r&&(k.landingPage=Y),n8({scope:\"tab\",key:\"viewIndex\",value:++r});var u=tP(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>(k.utm??={})[e]=eh(u[`utm_${e}`])?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tX(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n3(aA)?.value;c&&no(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...aA,value:void 0}))}var c=document.referrer||null;c&&!no(c)&&(k.externalReferrer={href:c,domain:rc(c)}),k.definition=t,t=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aF()})),aM(k)}};return nE(e=>{e?(aO(Y),++aC):aO(X)}),ru(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:t=>aQ(t)&&(tu(e,t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),Y),decorate(e){!k||rC(e)||ry(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=ag(e),r=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{te(r_,e,e=>r(\"add\"in n?{...e,component:eR(e?.component,n.component),content:eR(e?.content,n.content),area:n?.area??e?.area,tags:eR(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),t(e,e3(r_,e))};return{decorate(e){eJ(e.components,e=>ta(e,\"track\"))},processCommand:e=>a2(e)?(n(e),Y):a9(e)?(eF(((e,t)=>{if(!t)return[];var r=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=t8(a,e);){tt(n,a);var o=tH(t8(a,e),\"|\");t8(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&t[u]&&(l=t[u]),tu(i,l)}}tu(r,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),r})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ru(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var a,i,o,s,l,u=X;if(t5(n.target,e=>{ak(e)&&(o??=e),u=u||\"NAV\"===rr(e);var t=rU(e),r=t?.component;!n.button&&r?.length&&!l&&(eJ(e.querySelectorAll(\"a,button\"),t=>ak(t)&&((l??=[]).length>3?eN():l.push({...aS(t,!0),component:t5(t,(e,t,r,n=rU(e)?.component)=>n&&t(n[0]),t=>t===e)}))),l&&(s??=e)),a??=rV(e,\"clicks\",Y,e=>e.track?.clicks)??(r&&e4(r,e=>e.track?.clicks!==X)),i??=rV(e,\"region\",Y,e=>e.track?.region)??(r&&e4(r,e=>e.track?.region))}),s??=o){var c,f=l&&!o&&a,d=aG(s,!1,f),v=aV(s);a??=!u;var p={...(i??=Y)?{pos:ro(o,n),viewport:rf()}:null,...aT(n.target,s),...d,timeOffset:aF(),...v};if(!o){f&&te(t,s,r=>{var a=rs(s,n);if(r)tu(r,a);else{var i=K({type:\"component_click_intent\",...p,clicks:r=[a],clickables:l});e.events.registerEventPatchSource(i,()=>({clicks:e3(t,s)}),!0,s)}return r});return}if(aw(o)){var h=o.hostname!==location.hostname,{host:g,scheme:m,source:y}=tq(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===n.button&&tu(e,K({type:\"anchor_navigation\",anchor:o.hash,...p}));return}var b=K({clientId:nG(),type:\"navigation\",href:h?o.href:y,external:h,domain:{host:g,scheme:m},self:Y,anchor:o.hash,...p});if(\"contextmenu\"===n.type){var w=o.href,k=no(w);if(k){ax(b.clientId,()=>tu(e,b));return}var S=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!k){if(!rL.captureContextMenu)return;o.href=nu+\"=\"+S+encodeURIComponent(w),ru(window,\"storage\",(t,r)=>t.key===q&&(t.newValue&&JSON.parse(t.newValue)?.requestId===S&&tu(e,b),r())),ru(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),o.href=w})}return}n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t8(o,\"target\")!==window.name?(ax(b.clientId),b.self=X,tu(e,b)):ri(location.href,o.href)||(b.exit=b.external,ax(b.clientId)));return}var T=(t5(n.target,(e,t)=>!!(c??=aW(rU(e)?.cart??rB(e,\"cart\")))&&!c.item&&(c.item=e2(rU(e)?.content))&&t(c)),aB(c));(T||a)&&tu(e,T?K({type:\"cart_updated\",...p,...T}):K({type:\"component_click\",...p}))}})};r(document),aR(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=ra(Y);aj(()=>ty(()=>(t={},r=ra(Y)),250)),ru(window,\"scroll\",()=>{var n=ra(),a=rn();if(n.y>=r.y){var i=[];!t.fold&&n.y>=r.y+200&&(t.fold=Y,tu(i,\"fold\")),!t[\"page-middle\"]&&a.y>=.5&&(t[\"page-middle\"]=Y,tu(i,\"page-middle\")),!t[\"page-end\"]&&a.y>=.99&&(t[\"page-end\"]=Y,tu(i,\"page-end\"));var o=eF(i,e=>K({type:\"scroll\",scrollType:e,offset:a}));o.length&&tu(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(t){if(aZ(t)){var r=t.cart;return\"clear\"===r?tu(e,{type:\"cart_updated\",action:\"clear\"}):(r=aB(r))&&tu(e,{...r,type:\"cart_updated\"}),Y}return a8(t)?(tu(e,{type:\"order\",...t.order}),Y):X}})},{id:\"forms\",setup(e){var t=new Map,r=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=t9(i,rF(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&rl(i).width,u=e3(t,i,()=>{var t,r=new Map,n={type:\"form\",name:t9(i,rF(\"form-name\"))||t8(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aF()}));var s=()=>{o(),t[3]>=2&&(n.completed=3===t[3]||!l()),e.events.postPatch(n,{...a,totalTime:td(Y)-t[4]}),t[3]=1},u=tp();return ru(i,\"submit\",()=>{a=aG(i),t[3]=3,u(()=>{i.isConnected&&rl(i).width>0?(t[3]=2,u()):s()},750)}),t=[n,r,i,0,td(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||rV(e,\"ref\"))&&(e.value||(e.value=nY()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:tX(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aH]:r(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[t,r]=n(e)??[],a=r?.[1].get(t))=>a&&[r[0],a,t,r],i=null,o=()=>{if(i){var[e,t,n,a]=i,o=-(s-(s=a$())),u=-(l-(l=td(Y))),c=t[aH];(t[aH]=r(n))!==c&&(t.fillOrder??=a[5]++,t.filled&&(t.corrections=(t.corrections??0)+1),t.filled=Y,a[3]=2,eJ(e.fields,([e,r])=>r.lastField=e===t.name)),t.activeTime+=o,t.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ru(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(i=r,\"focusin\"===e.type?(l=td(Y),s=a$()):o()));u(document),aR(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async t=>await e.variables.get({scope:\"session\",key:_,result:t}).value,r=async r=>{if(r){var n=await t();if(!n||rv(n,r=rp(r)))return[!1,n];var a={level:rd.lookup(r.classification),purposes:rh.lookup(r.purposes)};return await e.events.post(K({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:_}]}}),[!0,a]}},n={};return{processCommand(e){if(it(e)){var a=e.consent.get;a&&t(a);var i=rp(e.consent.set);i&&(async()=>i.callback?.(...await r(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=th({frequency:o.pollFrequency??1e3}),c=async()=>{if(t1.hasFocus()){var e=o.poll();if(e){var t=rp({...s,...e});if(t&&!rv(s,t)){var[n,a]=await r(t);n&&nd(a,\"Consent was updated from \"+l),s=t}}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aY=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&t?.[e]!==void 0),aZ=aY(\"cart\"),aQ=aY(\"username\"),a0=aY(\"tagAttributes\"),a1=aY(\"disable\"),a2=aY(\"boundary\"),a4=aY(\"extension\"),a6=aY(Y,\"flush\"),a5=aY(\"get\"),a3=aY(\"listener\"),a8=aY(\"order\"),a9=aY(\"scan\"),a7=aY(\"set\"),ie=e=>\"function\"==typeof e,it=aY(\"consent\");Object.defineProperty(t0,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(aE)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
        src.push("?", "lyybumzz");
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

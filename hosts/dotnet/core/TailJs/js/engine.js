import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, DataPurposeFlags, VariableScope, isPassiveEvent, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, isSuccessResult, extractKey, variableScope, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
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
    if (target.constructor === Object) {
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
        return (await next(await mapAsync(events, async (event)=>{
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
        }))).map((event)=>(event.timestamp ??= now, event));
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

function bootstrap({ host, endpoint, schemas, cookies, extensions, allowUnknownEventTypes, encryptionKeys, debugScript, environmentTags }) {
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        allowUnknownEventTypes,
        extensions: map(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension) ?? [],
        encryptionKeys,
        debugScript,
        environmentTags
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
                            "type": "object",
                            "properties": {
                                "tagName": {
                                    "type": "string",
                                    "description": "The tag name of the activated element."
                                },
                                "text": {
                                    "type": "string",
                                    "description": "The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image)"
                                }
                            },
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
                "interactiveTime": {
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
                            "const": "component_click_intent",
                            "description": "The type name of the event.\n\nThis MUST be set to a constant value in extending interfaces and implementing classes for the event to be registered."
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
                            "type": "string"
                        },
                        "searchParameter": {
                            "type": "object",
                            "additionalProperties": {
                                "$ref": "urn:tailjs:core#/definitions/SearchParameter"
                            }
                        },
                        "resultCount": {
                            "$ref": "urn:tailjs:core#/definitions/Integer"
                        },
                        "significantResults": {
                            "type": "array",
                            "items": {
                                "$ref": "urn:tailjs:core#/definitions/SearchResult"
                            }
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ]
        },
        "SearchParameter": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ExternalReference"
                },
                {
                    "type": "object",
                    "properties": {
                        "value": {
                            "type": "string"
                        },
                        "comparison": {
                            "type": "string",
                            "enum": [
                                "lt",
                                "eq",
                                "gt"
                            ]
                        }
                    },
                    "required": [
                        "value"
                    ]
                }
            ]
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
                            "$ref": "urn:tailjs:core#/definitions/Integer"
                        },
                        "duration": {
                            "$ref": "urn:tailjs:core#/definitions/ViewTimingData"
                        },
                        "details": {
                            "type": "object",
                            "properties": {
                                "top": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails"
                                },
                                "middle": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails"
                                },
                                "bottom": {
                                    "$ref": "urn:tailjs:core#/definitions/ViewDetails"
                                }
                            },
                            "description": "Detailed information about the parts of the component that was viewed.\n\nTODO: Not implemented."
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
                        "percentage": {
                            "$ref": "urn:tailjs:core#/definitions/Percentage",
                            "description": "The percentage of the component that was viewed.\n\nTODO: Not implemented."
                        }
                    },
                    "required": [
                        "type"
                    ]
                }
            ],
            "description": "The event is triggered when more than 75 % of the component has been visible for at least 1 second. Components that are too big for 75 % of them to fit in the viewport are counted if they cross the page fold.\n\nThis applies only to components that have impression tracking configured,  either via  {@link  TrackingSettings.impressions } , \"track-impressions\" in the containing DOM or \"--track-impressions\" via CSS.\n\nNote that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via  {@link  TrackingSettings.impressions } ."
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
                "impression": {
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
        text: "(()=>{\"use strict\";var e,r,t,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,I,A,E,T,x,N,O,j,C,M,U=\"@info\",_=\"@consent\",$=\"_tail:\",F=$+\"state\",P=$+\"push\",q=(e,r=e=>Error(e))=>{throw ef(e=rs(e))?r(e):e},z=(e,r,t=-1)=>{if(e===r||(e??r)==null)return!0;if(eg(e)&&eg(r)&&e.length===r.length){var n=0;for(var a in e){if(e[a]!==r[a]&&!z(e[a],r[a],t-1))return!1;++n}return n===Object.keys(r).length}return!1},R=(e,r,...t)=>e===r||t.length>0&&t.some(r=>R(e,r)),D=(e,r)=>null!=e?e:q(r??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),B=(e,r=!0,t)=>{try{return e()}catch(e){return eS(r)?ep(e=r(e))?q(e):e:ea(r)?console.error(r?q(e):e):r}finally{t?.()}},J=e=>{var r,t=()=>t.initialized||r?r:(r=rs(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},V=e=>{var r={initialized:!0,then:W(()=>(r.initialized=!0,rs(e)))};return r},W=e=>{var r=J(e);return(e,t)=>K(r,[e,t])},K=async(e,r=!0,t)=>{try{var n=await rs(e);return ev(r)?r[0]?.(n):n}catch(e){if(ea(r)){if(r)throw e;console.error(e)}else{if(ev(r)){if(!r[1])throw e;return r[1](e)}var a=await r?.(e);if(a instanceof Error)throw a;return a}}finally{await t?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,er=Symbol.iterator,et=(e,r)=>(t,n=!0)=>e(t)?t:r&&n&&null!=t&&null!=(t=r(t))?t:L,en=(e,r)=>eS(r)?e!==L?r(e):L:e?.[r]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=et(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=et(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,r=!1)=>null==e?L:!r&&ev(e)?e:eI(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,ey=Object.prototype,em=Object.getPrototypeOf,eb=e=>null!=e&&em(e)===ey,ew=(e,r)=>\"function\"==typeof e?.[r],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eI=(e,r=!1)=>!!(e?.[er]&&(\"object\"==typeof e||r)),eA=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,r)=>null==e?L:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:r=>r[e],ej=(e,r,t)=>(r??t)!==L?(e=eO(e),r??=0,t??=H,(n,a)=>r--?L:t--?e?e(n,a):n:t):e,eC=e=>e?.filter(ee),eM=(e,r,t,n)=>null==e?[]:!r&&ev(e)?eC(e):e[er]?function*(e,r){if(null!=e){if(r){r=eO(r);var t=0;for(var n of e)if(null!=(n=r(n,t++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,t===L?r:ej(r,t,n)):eg(e)?function*(e,r){r=eO(r);var t=0;for(var n in e){var a=[n,e[n]];if(r&&(a=r(a,t++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,ej(r,t,n)):eM(eS(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(r??=-e-1;e++;)yield r--;else for(r??=0;e--;)yield r++}(e,t),r),eU=(e,r)=>r&&!ev(e)?[...e]:e,e_=(e,r,t,n)=>eM(e,r,t,n),e$=(e,r,t=1,n=!1,a,i)=>(function* e(r,t,n,a){if(null!=r){if(r[er]||n&&eg(r))for(var i of a?eM(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}})(eM(e,r,a,i),t+1,n,!1),eF=(e,r,t,n)=>{if(r=eO(r),ev(e)){var a=0,i=[];for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n&&!ex;t++){var o=e[t];(r?o=r(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(e_(e,r,t,n)):L},eP=(e,r,t,n)=>null!=e?new Set([...e_(e,r,t,n)]):L,eq=(e,r,t=1,n=!1,a,i)=>eh(e$(e,r,t,n,a,i)),ez=(...e)=>{var r;return eW(1===e.length?e[0]:e,e=>null!=e&&(r??=[]).push(...eh(e))),r},eR=(e,r,t,n)=>{var a,i=0;for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n;t++)if(null!=e[t]&&(a=r(e[t],i++)??a,ex)){ex=!1;break}return a},eD=(e,r)=>{var t,n=0;for(var a of e)if(null!=a&&(t=r(a,n++)??t,ex)){ex=!1;break}return t},eB=(e,r)=>{var t,n=0;for(var a in e)if(t=r([a,e[a]],n++)??t,ex){ex=!1;break}return t},eJ=(e,r,...t)=>null==e?L:eI(e)?eF(e,e=>r(e,...t)):r(e,...t),eV=(e,r,t,n)=>{var a;if(null!=e){if(ev(e))return eR(e,r,t,n);if(t===L){if(e[er])return eD(e,r);if(\"object\"==typeof e)return eB(e,r)}for(var i of eM(e,r,t,n))null!=i&&(a=i);return a}},eW=eV,eK=async(e,r,t,n)=>{var a;if(null==e)return L;for(var i of e_(e,r,t,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,r,t)=>{if(null==e)return L;if(ea(r)||t){var n={};return eW(e,t?(e,a)=>null!=(e=r(e,a))&&null!=(e[1]=t(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eW(e,r?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,r?(e,t)=>en(r(e,t),1):e=>en(e,1)))},eH=(e,r,t,n,a)=>{var i=()=>eS(t)?t():t;return eV(e,(e,n)=>t=r(t,e,n)??i(),n,a)??i()},eX=(e,r=e=>null!=e,t=ev(e),n,a)=>eU(eM(e,(e,t)=>r(e,t)?e:L,n,a),t),eY=(e,r,t,n)=>{var a;if(null==e)return L;if(r)e=eX(e,r,!1,t,n);else{if(null!=(a=e.length??e.size))return a;if(!e[er])return Object.keys(e).length}return a=0,eV(e,()=>++a)??0},eZ=(e,...r)=>null==e?L:ec(e)?Math.max(e,...r):eH(e,(e,t,n,a=r[1]?r[1](t,n):t)=>null==e||ec(a)&&a>e?a:e,L,r[2],r[3]),eQ=(e,r,t)=>eF(e,eb(e)?e=>e[1]:e=>e,r,t),e0=e=>!ev(e)&&eI(e)?eF(e,eA(e)?e=>e:eE(e)?e=>[e,!0]:(e,r)=>[r,e]):eg(e)?Object.entries(e):L,e1=(e,r,t,n)=>null==e?L:(r=eO(r),eV(e,(e,t)=>!r||(e=r(e,t))?eN(e):L,t,n)),e2=(e,r,t,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eV(e,(e,t)=>!r||r(e,t)?e:L,t,n),e4=(e,r,t,n)=>null==e?L:eb(e)&&!r?Object.keys(e).length>0:e.some?.(r??eo)??eV(e,r?(e,t)=>!!r(e,t)&&eN(!0):()=>eN(!0),t,n)??!1,e6=(e,r=e=>e)=>(e?.sort((e,t)=>r(e)-r(t)),e),e5=(e,r,t)=>(e.constructor===Object?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),e3=(e,r,t)=>{if(e){if(e.constructor===Object&&null==t)return e[r];var n=e.get?e.get(r):e.has?e.has(r):e[r];return void 0===n&&null!=t&&null!=(n=eS(t)?t():t)&&e5(e,r,n),n}},e8=(e,...r)=>(eW(r,r=>eW(r,([r,t])=>{null!=t&&(eb(e[r])&&eb(t)?e8(e[r],t):e[r]=t)})),e),e9=e=>(r,t,n,a)=>{if(r)return void 0!=n?e(r,t,n,a):(eW(t,t=>ev(t)?e(r,t[0],t[1]):eW(t,([t,n])=>e(r,t,n))),r)},e7=e9(e5),re=e9((e,r,t)=>e5(e,r,eS(t)?t(e3(e,r)):t)),rr=(e,r)=>e instanceof Set?!e.has(r)&&(e.add(r),!0):e3(e,r)!==e7(e,r,!0),rt=(e,r)=>{if((e??r)!=null){var t=e3(e,r);return ew(e,\"delete\")?e.delete(r):delete e[r],t}},rn=(e,...r)=>{var t=[],n=!1,a=(e,i,o,s)=>{if(e){var l=r[i];i===r.length-1?ev(l)?(n=!0,l.forEach(r=>t.push(rt(e,r)))):t.push(rt(e,l)):(ev(l)?(n=!0,l.forEach(r=>a(e3(e,r),i+1,e,r))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ra(o,s))}};return a(e,0),n?t:t[0]},ra=(e,r)=>{if(e)return ev(r)?(ev(e)&&e.length>1?r.sort((e,r)=>r-e):r).map(r=>ra(e,r)):ev(e)?r<e.length?e.splice(r,1)[0]:void 0:rt(e,r)},ri=(e,...r)=>{var t=(r,n)=>{var a;if(r){if(ev(r)){if(eb(r[0])){r.splice(1).forEach(e=>t(e,r[0]));return}a=r}else a=eF(r);a.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(t)&&(\"get\"in t||\"value\"in t)?t:eS(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e},ro=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>eg(t)?ev(t)?t.map(r=>ev(r)?1===r.length?[r[0],e[r[0]]]:ro(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:ro(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rs=e=>eS(e)?e():e,rl=(e,r=-1)=>ev(e)?r?e.map(e=>rl(e,r-1)):[...e]:eb(e)?r?eL(e,([e,t])=>[e,rl(t,r-1)]):{...e}:eE(e)?new Set(r?eF(e,e=>rl(e,r-1)):e):eA(e)?new Map(r?eF(e,e=>[e[0],rl(e[1],r-1)]):e):e,ru=(e,...r)=>e?.push(...r),rc=(e,...r)=>e?.unshift(...r),rf=(e,r)=>{if(!eb(r))return[e,e];var t,n,a,i={};if(eb(e))return eW(e,([e,o])=>{if(o!==r[e]){if(eb(t=o)){if(!(o=rf(o,r[e])))return;[o,t]=o}else ec(o)&&ec(n)&&(o=(t=o)-n);i[e]=o,(a??=rl(r))[e]=t}}),a?[i,a]:void 0},rd=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(rd(X)):performance.timeOrigin+performance.now():Date.now,rv=(e=!0,r=()=>rd())=>{var t,n=+e*r(),a=0;return(i=e,o)=>(t=e?a+=-n+(n=r()):a,o&&(a=0),(e=i)&&(n=r()),t)},rp=(e=0)=>{var r,t,n=(a,i=e)=>{if(void 0===a)return!!t;clearTimeout(r),ea(a)?a&&(i<0?el:es)(t?.())?n(t):t=void 0:(t=a,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},rh=(e,r=0)=>{var t=eS(e)?{frequency:r,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{}}=t;r=t.frequency??0;var l=0,u=rw(!0).resolve(),c=rv(!a),f=c(),d=async e=>{if(!l||!n&&u.pending&&!0!==e)return!1;if(p.busy=!0,!0!==e)for(;u.pending;)await u;return e||u.reset(),(await K(()=>s(c(),-f+(f=c())),!1,()=>!e&&u.resolve())===!1||r<=0||o)&&v(!1),p.busy=!1,!0},v=(e,t=!e)=>(c(e,t),clearInterval(l),p.active=!!(l=e?setInterval(d,r<0?-r:r):0),p),p={active:!1,busy:!1,restart:(e,t)=>(r=e??r,s=t??s,v(!0,!0)),toggle:(e,r)=>e!==p.active?e?r?(v(!0),p.trigger(),p):v(!0):v(!1):p,trigger:async e=>await d(e)&&(v(p.active),!0)};return p.toggle(!a,i)};class rg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new ry,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}}class ry{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[r?\"error\":\"value\"]=t===L||t,e(t),this})}),[this.resolve,this.reject]=e}then(e,r){return this._promise.then(e,r)}}var rm=(e,r=0)=>r>0?setTimeout(e,r):window.queueMicrotask(e),rb=(e,r)=>null==e||isFinite(e)?!e||e<=0?rs(r):new Promise(t=>setTimeout(async()=>t(await rs(r)),e)):q(`Invalid delay ${e}.`),rw=e=>e?new rg:new ry,rk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),rS=(e,r,t)=>{var n=!1,a=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(a),!0),o=()=>n!==(n=!0)&&(r(a),!0);return o(),[i,o]},rI=()=>{var e,r=new Set;return[(t,n)=>{var a=rS(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,a[0]),a},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rA=(e,r=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(r)?[e.slice(0,-1).join(r[1]??\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(r??\", \"):L,rE=(e,r=\"'\")=>null==e?L:r+e+r,rT=(e,r,t)=>null==e?L:eS(r)?rA(eF(ef(e)?[e]:e,r),t??\"\"):ef(e)?e:rA(eF(e,e=>!1===e?L:e),r??\"\"),rx=e=>(e=Math.log2(e))===(0|e),rN=(e,r,t,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,r])=>ef(e)&&ec(r)).map(([e,r])=>[e.toLowerCase(),r])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,r)=>e|r,0),f=r?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,r])=>[r,e])),v=(e,t)=>eu(e)?!r&&t?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),t):L,p=!1,[h,g]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||p?e:null==(t=v(t,r))?(p=!0,L):(e??0)|t,(p=!1,L)):v(e),(e,r)=>null==(e=h(e,!1))?L:r&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,r])=>r&&e&r&&rx(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],y=(e,r)=>null==e?L:null==(e=h(o=e,r))?q(TypeError(`${JSON.stringify(o)} is not a valid ${t} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&rx(e));return ri(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+t:`the ${t} ${rA(eF(eh(e),e=>rE(e)),[r])}`},r&&{pure:m,map:(e,r)=>(e=y(e),m.filter(([,r])=>r&e).map(r??(([,e])=>e)))}])},rO=(...e)=>{var r=e0(eL(e,!0)),t=e=>(eg(e)&&(ev(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,a=L;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,o)=>!a&&null!=(a=o===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=a)))})),e);return t},rj=Symbol(),rC=(e,r=[\"|\",\";\",\",\"],t=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&r?.length&&e1(r,(e,r,t=n[1].split(e))=>t.length>1?t:L)||(n[1]?[n[1]]:[]),n},rM=(e,r=!0,t)=>null==e?L:rP(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:t,urn:t?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===r?f:rU(f,r),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),rU=(e,r,t=!0)=>r_(e,\"&\",r,t),r_=(e,r,t,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(r),(e,r,[i,o,s]=rC(e,!1===t?[]:!0===t?L:t,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==t?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,r)=>e?!1!==t?ez(e,r):(e?e+\",\":\"\")+r:r);return i&&(i[rj]=a),i},r$=(e,r)=>r&&null!=e?r.test(e):L,rF=(e,r,t)=>rP(e,r,t,!0),rP=(t,n,a,i=!1)=>(t??n)==null?L:a?(e=L,i?(r=[],rP(t,n,(...t)=>null!=(e=a(...t))&&r.push(e))):t.replace(n,(...r)=>e=a(...r)),e):t.match(n),rq=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rz=/\\z./g,rR=(e,r)=>(r=rT(eP(eX(e,e=>e?.length)),\"|\"))?RegExp(r,\"gu\"):rz,rD={},rB=e=>e instanceof RegExp,rJ=(e,r=[\",\",\" \"])=>rB(e)?e:ev(e)?rR(eF(e,e=>rJ(e,r)?.source)):ea(e)?e?/./g:rz:ef(e)?rD[e]??=rP(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,n)=>t?RegExp(t,\"gu\"):rR(eF(rV(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rT(r,rq)}]`)),e=>e&&`^${rT(rV(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>rq(rW(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,rV=(e,r)=>e?.split(r)??e,rW=(e,r,t)=>e?.replace(r,t)??e,rK=5e3,rG=()=>()=>q(\"Not initialized.\"),rL=window,rH=document,rX=rH.body,rY=(e,r)=>!!e?.matches(r),rZ=H,rQ=(e,r,t=(e,r)=>r>=rZ)=>{for(var n,a=0,i=X;e?.nodeType===1&&!t(e,a++)&&r(e,(e,r)=>(null!=e&&(n=e,i=r!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},r0=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return B(()=>JSON.parse(e),Z);case\"h\":return B(()=>nt(e),Z);case\"e\":return B(()=>na?.(e),Z);default:return ev(r)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:r0(e,r[0])):void 0}},r1=(e,r,t)=>r0(e?.getAttribute(r),t),r2=(e,r,t)=>rQ(e,(e,n)=>n(r1(e,r,t))),r4=(e,r)=>r1(e,r)?.trim()?.toLowerCase(),r6=e=>e?.getAttributeNames(),r5=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,r3=e=>null!=e?e.tagName:null,r8=()=>({x:(t=r9(X)).x/(rX.offsetWidth-window.innerWidth)||0,y:t.y/(rX.offsetHeight-window.innerHeight)||0}),r9=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),r7=(e,r)=>rW(e,/#.*$/,\"\")===rW(r,/#.*$/,\"\"),te=(e,r,t=Y)=>(n=tr(e,r))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/rX.offsetWidth,4),y:eT(n.y/rX.offsetHeight,4),pageFolds:t?n.y/window.innerHeight:void 0}),tr=(e,r)=>r?.pointerType&&r?.pageY!=null?{x:r.pageX,y:r.pageY}:e?({x:a,y:i}=tt(e),{x:a,y:i}):void 0,tt=e=>e?(o=e.getBoundingClientRect(),t=r9(X),{x:eT(o.left+t.x),y:eT(o.top+t.y),width:eT(o.width),height:eT(o.height)}):void 0,tn=(e,r,t,n={capture:!0,passive:!0})=>(r=eh(r),rS(t,t=>eW(r,r=>e.addEventListener(r,t,n)),t=>eW(r,r=>e.removeEventListener(r,t,n)))),ta=e=>{var{host:r,scheme:t,port:n}=rM(e,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}},ti=()=>({...t=r9(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:rX.offsetWidth,totalHeight:rX.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var to=rN(s,!1,\"data classification\"),ts=(e,r)=>to.parse(e?.classification??e?.level)===to.parse(r?.classification??r?.level)&&tu.parse(e?.purposes??e?.purposes)===tu.parse(r?.purposes??r?.purposes),tl=(e,r)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:to.parse(e.classification??e.level??r?.classification??0),purposes:tu.parse(e.purposes??e.purpose??r?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var tu=rN(l,!0,\"data purpose\",2111),tc=rN(l,!1,\"data purpose\",0),tf=(e,r)=>((u=e?.metadata)&&(r?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),td=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var tv=rN(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var tp=e=>`'${e.key}' in ${tv.format(e.scope)} scope`,th={scope:tv,purpose:tc,purposes:tu,classification:to};rO(th),(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",rN(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",rN(d,!1,\"variable set status\");var tg=(e,r,t)=>{var n,a=e(),i=e=>e,o=(e,t=tw)=>V(async()=>(n=i(t(await a,r)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,tm)),values:o(e=>eF(e,e=>tm(e)?.value)),push:()=>(i=e=>(t?.(eF(ty(e))),e),s),value:o(e=>tm(e[0])?.value),variable:o(e=>tm(e[0])),result:o(e=>e[0])};return s},ty=e=>e?.map(e=>e?.status<400?e:L),tm=e=>tb(e)?e.current??e:L,tb=(e,r=!1)=>r?e?.status<300:e?.status<400||e?.status===404,tw=(e,r,t)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!t&&404===e.status?e:(a=`${tp(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=r?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?q(i.join(\"\\n\")):ev(e)?o:o?.[0]},tk=e=>tw(e,L,!0),tS=e=>e&&\"string\"==typeof e.type,tI=((...e)=>r=>r?.type&&e.some(e=>e===r?.type))(\"view\"),tA=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tE=(e,r)=>r&&(!(p=e.get(v=r.tag+(r.value??\"\")))||(p.score??1)<(r.score??1))&&e.set(v,r),tT=(e,r=\"\",t=new Map)=>{if(e)return eI(e)?eW(e,e=>tT(e,r,t)):ef(e)?rP(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?tA(n)+\"::\":\"\")+r+tA(a),value:tA(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),tE(t,u)}):tE(t,e),t},tx=new WeakMap,tN=e=>tx.get(e),tO=(e,r=X)=>(r?\"--track-\":\"track-\")+e,tj=(e,r,t,n,a,i)=>r?.[1]&&eW(r6(e),o=>r[0][o]??=(i=X,ef(n=eW(r[1],([r,t,n],a)=>r$(o,r)&&(i=void 0,!t||rY(e,t))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&tT(a,rW(n,/\\-/g,\":\"),t),i)),tC=()=>{},tM=(e,r)=>{if(h===(h=tz.tags))return tC(e,r);var t=e=>e?rB(e)?[[e]]:eI(e)?eq(e,t):[eb(e)?[rJ(e.match),e.selector,e.prefix]:[rJ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eQ(h))]];(tC=(e,r)=>tj(e,n,r))(e,r)},tU=(e,r)=>rT(ez(r5(e,tO(r,Y)),r5(e,tO(\"base-\"+r,Y))),\" \"),t_={},t$=(e,r,t=tU(e,\"attributes\"))=>{t&&tj(e,t_[t]??=[{},rF(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rJ(t||n),,r])],r),tT(tU(e,\"tags\"),void 0,r)},tF=(e,r,t=X,n)=>(t?rQ(e,(e,t)=>t(tF(e,r,X)),eS(t)?t:void 0):rT(ez(r1(e,tO(r)),r5(e,tO(r,Y))),\" \"))??(n&&(g=tN(e))&&n(g))??null,tP=(e,r,t=X,n)=>\"\"===(y=tF(e,r,t,n))||(null==y?y:ei(y)),tq=(e,r,t,n)=>e?(t$(e,n??=new Map),rQ(e,e=>{tM(e,n),tT(t?.(e),void 0,n)},r),n.size?{tags:[...n.values()]}:{}):{},tz={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},tR=[],tD=[],tB=(e,r=0)=>e.charCodeAt(r),tJ=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>tR[tD[r]=e.charCodeAt(0)]=r);var tV=e=>{for(var r,t=0,n=e.length,a=[];n>t;)r=e[t++]<<16|e[t++]<<8|e[t++],a.push(tD[(16515072&r)>>18],tD[(258048&r)>>12],tD[(4032&r)>>6],tD[63&r]);return a.length+=n-t,tJ(a)},tW=e=>{for(var r,t=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>t;)i[n++]=tR[tB(e,t++)]<<2|(r=tR[tB(e,t++)])>>4,a>t&&(i[n++]=(15&r)<<4|(r=tR[tB(e,t++)])>>2,a>t&&(i[n++]=(3&r)<<6|tR[tB(e,t++)]));return i},tK={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},tG=(e=256)=>e*Math.random()|0,tL=e=>{var r,t,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+a),n=0;n<3;i[n++]=g(tG()));for(t=0,i[n++]=g(f^16*tG(16)+a);r>t;i[n++]=g(f^e[t++]));for(;a--;)i[n++]=tG();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((f^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);r>n;i[n++]=f^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(s=ea(r)?64:r,h(),[o,l]=tK[s],t=0;t<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[t++])))*l));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},tH={exports:{}};(e=>{(()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,a=new Uint8Array(128),i=0;if(r&&r.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var r=e/4294967296,a=e%4294967296;c([211,r>>>24,r>>>16,r>>>8,r,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(t=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(t))})(e);break;case\"string\":(d=(o=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(e.charCodeAt(n)>127){r=!1;break}for(var a=0,i=new Uint8Array(e.length*(r?1:4)),o=0;o!==t;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return r?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var r=e.getTime()/1e3;if(0===e.getMilliseconds()&&r>=0&&r<4294967296)c([214,255,r>>>24,r>>>16,r>>>8,r]);else if(r>=0&&r<17179869184){var t=1e6*e.getMilliseconds();c([215,255,t>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r])}else{var t=1e6*e.getMilliseconds();c([199,12,255,t>>>24,t>>>16,t>>>8,t]),f(r)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var r=0;for(var t in e)void 0!==e[t]&&r++;for(var t in r<=15?u(128+r):r<=65535?c([222,r>>>8,r]):c([223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(s(t),s(n))}})(e);break;default:if(!a&&r&&r.invalidTypeReplacement)\"function\"==typeof r.invalidTypeReplacement?s(r.invalidTypeReplacement(e),!0):s(r.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var r=e.length;r<=15?u(144+r):r<=65535?c([220,r>>>8,r]):c([221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;r>t;t++)s(e[t])}function u(e){if(a.length<i+1){for(var r=2*a.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var r=2*a.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a.set(e,i),i+=e.length}function f(e){var r,t;e>=0?(r=e/4294967296,t=e%4294967296):(r=~(r=Math.abs(++e)/4294967296),t=~(t=Math.abs(e)%4294967296)),c([r>>>24,r>>>16,r>>>8,r,t>>>24,t>>>16,t>>>8,t])}}function t(e,r){var t,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(a());else t=a();return t;function a(){var r=e[n++];if(r>=0&&r<=127)return r;if(r>=128&&r<=143)return u(r-128);if(r>=144&&r<=159)return c(r-144);if(r>=160&&r<=191)return f(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return l(-1,1);if(197===r)return l(-1,2);if(198===r)return l(-1,4);if(199===r)return d(-1,1);if(200===r)return d(-1,2);if(201===r)return d(-1,4);if(202===r)return s(4);if(203===r)return s(8);if(204===r)return o(1);if(205===r)return o(2);if(206===r)return o(4);if(207===r)return o(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return d(1);if(213===r)return d(2);if(214===r)return d(4);if(215===r)return d(8);if(216===r)return d(16);if(217===r)return f(-1,1);if(218===r)return f(-1,2);if(219===r)return f(-1,4);if(220===r)return c(-1,2);if(221===r)return c(-1,4);if(222===r)return u(-1,2);if(223===r)return u(-1,4);if(r>=224&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var t=0,a=!0;r-- >0;)if(a){var i=e[n++];t+=127&i,128&i&&(t-=128),a=!1}else t*=256,t+=e[n++];return t}function o(r){for(var t=0;r-- >0;)t*=256,t+=e[n++];return t}function s(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return(n+=r,4===r)?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function l(r,t){r<0&&(r=o(t));var a=e.subarray(n,n+r);return n+=r,a}function u(e,r){e<0&&(e=o(r));for(var t={};e-- >0;)t[a()]=a();return t}function c(e,r){e<0&&(e=o(r));for(var t=[];e-- >0;)t.push(a());return t}function f(r,t){r<0&&(r=o(t));var a=n;return n+=r,((e,r,t)=>{var n=r,a=\"\";for(t+=r;t>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=t)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=t)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=t)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,r)}function d(e,r){e<0&&(e=o(r));var t=o(1),a=l(e);return 255===t?(e=>{if(4===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*r)}if(8===e.length){var t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*r+t/1e6)}if(12===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var r=i(8);return new Date(1e3*r+t/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:t,data:a}}}var n={serialize:r,deserialize:t,encode:r,decode:t};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(tH);var{deserialize:tX,serialize:tY}=(j=tH.exports)&&j.__esModule&&Object.prototype.hasOwnProperty.call(j,\"default\")?j.default:j,tZ=\"$ref\",tQ=(e,r,t)=>ek(e)?L:t?r!==L:null===r||r,t0=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var a,i,o,s=(e,r,n=e[r],a=tQ(r,n,t)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[r]=a:delete e[r],l(()=>e[r]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[tZ]||(e[tZ]=o,l(()=>delete e[tZ])),{[tZ]:o};if(eb(e))for(var r in(i??=new Map).set(e,i.size+1),e)s(e,r);else!eI(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?s(e,t):(e[t]=null,l(()=>delete e[t])));return e};return B(()=>r?tY(u(e)??null):B(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},t1=e=>{var r,t,n=e=>eg(e)?e[tZ]&&(t=(r??=[])[e[tZ]])?t:(e[tZ]&&(r[e[tZ]]=e,delete e[tZ]),Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(ef(e)?JSON.parse(e):null!=e?B(()=>tX(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},t2=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,r=>255&e.charCodeAt(r))):r?B(()=>JSON.stringify(e),()=>JSON.stringify(t0(e,!1,t))):t0(e,!0,t),n);if(r)return[e=>t0(e,!1,t),e=>null==e?L:B(()=>t1(e),L),(e,r)=>n(e,r)];var[a,i,o]=tL(e);return[(e,r)=>(r?Q:tV)(a(t0(e,!0,t))),e=>null!=e?t1(i(e instanceof Uint8Array?e:tW(e))):null,(e,r)=>n(e,r)]};if(!e){var n=+(r.json??0);if(n&&!1!==r.prettify)return(m??=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[+n]}return t(e,r)};t2(),t2(null,{json:!0,prettify:!0});var t4=rV(\"\"+rH.currentScript.src,\"#\"),t6=rV(\"\"+(t4[1]||\"\"),\";\"),t5=t4[0],t3=t6[1]||rM(t5,!1)?.host,t8=e=>!!(t3&&rM(e,!1)?.host?.endsWith(t3)===Y),t9=(...e)=>rW(rT(e),/(^(?=\\?))|(^\\.(?=\\/))/,t5.split(\"?\")[0]),t7=t9(\"?\",\"var\"),ne=t9(\"?\",\"mnt\");t9(\"?\",\"usr\");var[nr,nt]=t2(),[nn,na]=[rG,rG],[ni,no]=rI(),ns=e=>{na===rG&&([nn,na]=t2(e),no(nn,na))},nl=e=>r=>nu(e,r),nu=(...e)=>{var r=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",r.id??r,...e)},[nc,nf]=rI(),[nd,nv]=rI(),np=e=>ng!==(ng=e)&&nf(ng=!1,nb(!0,!0)),nh=e=>ny!==(ny=!!e&&\"visible\"===document.visibilityState)&&nv(ny,!e,nm(!0,!0));nc(nh);var ng=!0,ny=!1,nm=rv(!1),nb=rv(!1);tn(window,[\"pagehide\",\"freeze\"],()=>np(!1)),tn(window,[\"pageshow\",\"resume\"],()=>np(!0)),tn(document,\"visibilitychange\",()=>(nh(!0),ny&&np(!0))),nf(ng,nb(!0,!0));var nw=!1,nk=rv(!1),[nS,nI]=rI(),nA=rh({callback:()=>nw&&nI(nw=!1,nk(!1)),frequency:2e4,once:!0,paused:!0}),nE=()=>!nw&&(nI(nw=!0,nk(!0)),nA.restart());tn(window,\"focus\",nE),tn(window,\"blur\",()=>nA.trigger()),tn(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nE),nE(),(C=b||(b={}))[C.View=-3]=\"View\",C[C.Tab=-2]=\"Tab\",C[C.Shared=-1]=\"Shared\";var nT=rN(b,!1,\"local variable scope\"),nx=e=>nT.tryParse(e)??tv(e),nN=e=>!!nT.tryParse(e?.scope),nO=rO({scope:nT},th),nj=e=>null==e?void 0:ef(e)?e:e.source?nj(e.source):`${nx(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nC=e=>{var r=e.split(\"\\0\");return{scope:+r[0],key:r[1],targetId:r[2]}},nM=0,nU=void 0,n_=()=>(nU??rG())+\"_\"+n$(),n$=()=>(rd(!0)-(parseInt(nU.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nM).toString(36),nF=e=>crypto.getRandomValues(e),nP=()=>rW(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nF(new Uint8Array(1))[0]&15>>e/4).toString(16)),nq={},nz={id:nU,heartbeat:rd()},nR={knownTabs:{[nU]:nz},variables:{}},[nD,nB]=rI(),[nJ,nV]=rI(),nW=rG,nK=e=>nq[nj(e)],nG=(...e)=>nH(e.map(e=>(e.cache=[rd(),3e3],nO(e)))),nL=e=>eF(e,e=>e&&[e,nq[nj(e)]]),nH=e=>{var r=eF(e,e=>e&&[nj(e),e]);if(r?.length){var t=nL(e);e7(nq,r);var n=eX(r,e=>e[1].scope>b.Tab);n.length&&(e7(nR.variables,n),nW({type:\"patch\",payload:eL(n)})),nV(t,nq,!0)}};ni((e,r)=>{nc(t=>{if(t){var n=r(sessionStorage.getItem(F));sessionStorage.removeItem(F),nU=n?.[0]??rd(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nq=eL(ez(eX(nq,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nj(e),e])))}else sessionStorage.setItem(F,e([nU,eF(nq,([,e])=>e.scope!==b.View?e:void 0)]))},!0),nW=(r,t)=>{e&&(localStorage.setItem(F,e([nU,r,t])),localStorage.removeItem(F))},tn(window,\"storage\",e=>{if(e.key===F){var n=r?.(e.newValue);if(n&&(!n[2]||n[2]===nU)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)t.active||nW({type:\"set\",payload:nR},a);else if(\"set\"===i&&t.active)e7(nR,o),e7(nq,o.variables),t.trigger();else if(\"patch\"===i){var s=nL(eF(o,1));e7(nR.variables,o),e7(nq,o),nV(s,nq,!1)}else\"tab\"===i&&(e7(nR.knownTabs,a,o),o&&nB(\"tab\",o,!1))}}});var t=rh(()=>nB(\"ready\",nR,!0),-25),n=rh({callback(){var e=rd()-1e4;eW(nR?.knownTabs,([r,t])=>t[0]<e&&rn(nR.knownTabs,r)),nz.heartbeat=rd(),nW({type:\"tab\",payload:nz})},frequency:5e3,paused:!0}),a=e=>{nW({type:\"tab\",payload:e?nz:void 0}),e?(t.restart(),nW({type:\"query\"})):t.toggle(!1),n.toggle(e)};nc(e=>a(e),!0)},!0);var[nX,nY]=rI(),[nZ,nQ]=rI(),n0=((e,{timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var a=()=>(t?na:nt)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(t?nn:nr)([nU,rd()+r]));return async(t,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<rd())&&(o(),a()?.[0]===nU))return r>0&&(i=setInterval(()=>o(),r/2)),await K(t,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=rw(),[f]=tn(window,\"storage\",r=>{r.key!==e||r.newValue||c.resolve()});await rk(rb(s??r),c),f()}null==s&&q(e+\" could not be acquired.\")}})($+\"rq\"),n1=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=t=>{var s=eS(r)?r?.(a,t):r;return!1!==s&&(null!=s&&!0!==s&&(a=s),nY(e,a,t,e=>(o=a===L,a=e)),!o&&(i=n?nn(a,!0):JSON.stringify(a)))};if(!t)return await n0(()=>eK(1,async r=>{if(!s(r))return eN();var t=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(t.status>=400)return 0===r?eN(q(`Invalid response: ${await t.text()}`)):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rb((1+r)*200));var o=n?new Uint8Array(await t.arrayBuffer()):await t.text(),l=o?.length?(n?na:JSON.parse)?.(o):L;return null!=l&&nQ(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||q(\"Beacon send failed.\"))},n2=[\"scope\",\"key\",\"targetId\",\"version\"],n4=[...n2,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n6=[...n2,\"init\",\"purpose\",\"refresh\"],n5=[...n4,\"value\",\"force\",\"patch\"],n3=new Map,n8=(e,r)=>{var t=rh(async()=>{var e=eF(n3,([e,r])=>({...nC(e),result:[...r]}));e.length&&await u.get(...e)},3e3),n=(e,r)=>r&&eJ(r,r=>e3(n3,e,()=>new Set).add(r)),a=(e,r)=>{if(e){var t,a=nj(e),i=ra(n3,a);if(i?.size){if(e?.purposes===r?.purposes&&e?.classification==r?.classification&&z(e?.value,r?.value))return;eW(i,i=>{t=!1,i?.(e,r,(e=!0)=>t=e),t&&n(a,i)})}}};nc((e,r)=>t.toggle(e,e&&r>=3e3),!0),nJ(e=>eW(e,([e,r])=>a(e,r)));var i=new Map,o=(e,r)=>e7(i,e,ea(r)?r?void 0:0:r),u={get:(...t)=>tg(async()=>{(!t[0]||ef(t[0]))&&(a=t[0],t=t.slice(1)),r?.validateKey(a);var a,i=[],s=eF(t,(e,r)=>[e,r]),l=[],u=(await n1(e,()=>!!(s=eF(s,([e,r])=>{if(e){var t=nj(e);n(t,e.result);var a=nK(t);e.init&&o(t,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<rd())ru(i,[{...a,status:d.Success},r]);else if(!nN(e))return[ro(e,n6),r];else if(eb(e.init)){var u={...nO(e),status:d.Created,...e.init};null!=u.value&&(ru(l,c(u)),ru(i,[u,r]))}}else ru(i,[{...e,status:d.Denied,error:\"No consent for \"+tu.logFormat(s)},r])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:r?.deviceSessionId}))?.variables?.get??[];return ru(i,...eF(u,(e,r)=>e&&[e,s[r][1]])),l.length&&nH(l),i.map(([e])=>e)},eF(t,e=>e?.error)),set:(...t)=>tg(async()=>{(!t[0]||ef(t[0]))&&(n=t[0],t=t.slice(1)),r?.validateKey(n);var n,a=[],i=[],u=eF(t,(e,r)=>{if(e){var t=nj(e),n=nK(t);if(o(t,e.cache),nN(e)){if(null!=e.patch)return q(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nT(e.scope),key:e.key};return i[r]={status:n?d.Success:d.Created,source:e,current:u},void ru(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[ro(e,n5),r]}}),f=u.length?D((await n1(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:r?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nH(a),eW(f,(e,r)=>{var[t,n]=u[r];e.source=t,t.result?.(e),i[n]=e}),i},eF(t,e=>e?.error))},c=(e,r=rd())=>({...ro(e,n4),cache:[r,r+(ra(i,nj(e))??3e3)]});return nZ(({variables:e})=>{if(e){var r=rd(),t=ez(eF(e.get,e=>tm(e)),eF(e.set,e=>tm(e)));t?.length&&nH(eJ(t,c,r))}}),u},n9=(e,r,t=rK)=>{var n=[],a=new WeakMap,i=new Map,o=(e,r)=>e.metadata?.queued?e8(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):q(\"Source event not queued.\"),s=async(t,n=!0,a)=>{var i;return(!t[0]||ef(t[0]))&&(i=t[0],t=t.slice(1)),n1(e,{events:t=t.map(e=>(r?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(tf(rl(e),!0),{timestamp:e.timestamp-rd()}))),variables:a,deviceSessionId:r?.deviceSessionId},{beacon:n})},l=async(e,{flush:t=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eW(e,e=>void 0),!a)return s(e,!1,i);if(!t){e.length&&ru(n,...e);return}n.length&&rc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return t>0&&rh(()=>l([],{flush:!0}),t),nd((e,r,t)=>{if(!e&&(n.length||r||t>1500)){var a=eF(i,([e,r])=>{var[t,n]=r();return n&&i.delete(e),t});(n.length||a.length)&&l(ez(n.splice(0),a),{flush:!0})}}),{post:l,postPatch:(e,r,t)=>l(o(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!0){var n=!1,s=()=>n=!0;return a.set(e,rl(e)),i.set(e,()=>{var i=a.get(e),[l,u]=(t?rf(r(i,s),i):r(i,s))??[];return l&&!z(u,i)?(a.set(e,rl(u)),[o(e,l),n]):[void 0,n]}),s}}},n7=Symbol(),ae=e=>{var r=new IntersectionObserver(e=>eW(e,({target:e,isIntersecting:r,boundingClientRect:t,intersectionRatio:n})=>e[n7]?.(r,t,n)),{threshold:[.05,.1,.15,.2,.3,.4,.5,.6,.75]});return(t,n)=>{if(n&&(a=eX(n?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(a)){var a,i,o,s,l=X,u=0,c=rp(tz.impressionThreshold),f=ag();t[n7]=(r,n,d)=>{f(r=d>=.75||n.top<(i=window.innerHeight/2)&&n.bottom>i),l!==(l=r)&&(l?c(()=>{if(++u,!o){var r,n=t.innerText;n?.trim()?.length&&(r={characters:n.match(/\\S/gu)?.length,words:n.match(/\\b\\w+\\b/gu)?.length,sentences:n.match(/\\w.*?[.!?]+(\\s|$)/gu)?.length}).words&&(r.readingTime=6e4*(r.words/238)),ru(e,o=eX(eF(a,e=>(e.track?.impressions||tP(t,\"impressions\",Y,e=>e.track?.impressions))&&G({type:\"impression\",pos:te(t),viewport:ti(),timeOffset:am(),impressions:u,text:r,...aj(t,Y)})||null)))}o?.length&&(s=eF(o,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:f(),impressions:u}))))}):(eW(s,e=>e()),c(!1)))},r.observe(t)}}},ar=()=>{var e=rL?.screen;if(!e)return{};var{width:r,height:t,orientation:n}=e,a=r<t,i=n?.angle??rL.orientation??0;return(-90===i||90===i)&&([r,t]=[t,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rL.devicePixelRatio,width:r,height:t,landscape:a}}},at=e=>ru(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,r,t=e.split(\"-\"))=>G({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...ar()})),an=(e,r=\"A\"===r3(e)&&r1(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),aa=(e,r=r3(e),t=tP(e,\"button\"))=>t!==X&&(R(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&R(r4(e,\"type\"),\"button\",\"submit\")||t===Y),ai=e=>{if(w)return w;ef(e)&&([r,e]=nt(e),e=t2(r)[1](e)),e7(tz,e),ns(ra(tz,\"encryptionKey\"));var r,t=ra(tz,\"key\"),n=rL[tz.name]??[];if(!ev(n)){q(`The global variable for the tracker \"${tz.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...r)=>{var t=Y;i=eX(i,n=>B(()=>(n[e]?.(...r,{tracker:w,unsubscribe:()=>t=X}),t),nl(n)))},s=[],l={applyEventExtensions(e){e.clientId??=n_(),e.timestamp??=rd(),v=Y;var r=X;return eF(a,([,t])=>{(r||t.decorate?.(e)===X)&&(r=Y)}),r?void 0:e},validateKey:(e,r=!0)=>!t&&!e||e===t||!!r&&q(`'${e}' is not a valid key.`)},u=n8(t7,l),c=n9(t7,l),f=null,d=0,v=X,p=X;return Object.defineProperty(rL,tz.name,{value:w=Object.freeze({id:\"tracker_\"+n_(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(r=e[0],e=e.slice(1)),ef(e[0])){var r,t=e[0];e=t.match(/^[{[]/)?JSON.parse(t):nt(t)}var n=X;if((e=eX(eq(e,e=>ef(e)?nt(e):e),e=>{if(!e)return X;if(aF(e))tz.tags=e7({},tz.tags,e.tagAttributes);else if(aP(e))return tz.disabled=e.disable,X;else if(aR(e))return n=Y,X;else if(aK(e))return e(w),X;return p||aB(e)||az(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>az(e)?-100:aB(e)?-50:aW(e)?-10:tS(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(r??g.key),B(()=>{var e,r=f[d];if(o(\"command\",r),v=X,tS(r))c.post(r);else if(aD(r))u.get(...eh(r.get));else if(aW(r))u.set(...eh(r.set));else if(aB(r))ru(i,r.listener);else if(az(r))(e=B(()=>r.extension.setup(w),e=>nu(r.extension.id,e)))&&(ru(a,[r.priority??100,e,r.extension]),e6(a,([e])=>e));else if(aK(r))r(w);else{var t=X;for(var[,e]of a)if(t=e.processCommand?.(r)??X)break;t||nu(\"invalid-command\",r,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nu(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),nD(async(e,r,t,a)=>{if(\"ready\"===e){var i=tk((await u.get({scope:\"session\",key:U,refresh:!0},{scope:\"session\",key:_,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(at(w),i.hasUserAgent=!0),p=!0,s.length&&ru(w,s),a(),ru(w,...eF(aM,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ao=()=>k?.clientId,as={scope:\"shared\",key:\"referrer\"},al=(e,r)=>{w.variables.set({...as,value:[ao(),e]}),r&&w.variables.get({scope:as.scope,key:as.key,result:(t,n,a)=>t?.value?a():n?.value?.[1]===e&&r()})},au=rv(),ac=rv(),af=rv(),ad=1,av=()=>ac(),[ap,ah]=rI(),ag=e=>{var r=rv(e,au),t=rv(e,ac),n=rv(e,af),a=rv(e,()=>ad);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),interactiveTime:n(e,i),activations:a(e,i)})},ay=ag(),am=()=>ay(),[ab,aw]=rI(),ak=(e,r)=>(r&&eW(aI,r=>e(r,()=>!1)),ab(e)),aS=new WeakSet,aI=document.getElementsByTagName(\"iframe\"),aA=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&R(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function aE(e){if(e){if(null!=e.units&&R(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aT=e=>tq(e,void 0,e=>eF(eh(e3(tx,e)?.tags))),ax=e=>e?.component||e?.content,aN=e=>tq(e,r=>r!==e&&!!ax(e3(tx,r)),e=>(I=e3(tx,e),(I=e3(tx,e))&&eq(ez(I.component,I.content,I),\"tags\"))),aO=(e,r)=>r?e:{...e,rect:void 0,content:(A=e.content)&&eF(A,e=>({...e,rect:void 0}))},aj=(e,r=X)=>{var t,n,a,i=[],o=[],s=0;return rQ(e,e=>{var n=e3(tx,e);if(n){if(ax(n)){var a=eX(eh(n.component),e=>0===s||!r&&(1===s&&e.track?.secondary!==Y||e.track?.promote));t=e4(a,e=>e.track?.region)&&tt(e)||void 0;var l=aN(e);n.content&&rc(i,...eF(n.content,e=>({...e,rect:t,...l}))),a?.length&&(rc(o,...eF(a,e=>(s=eZ(s,e.track?.secondary?1:2),aO({...e,content:i,rect:t,...l},!!t)))),i=[])}var u=n.area||tF(e,\"area\");u&&rc(o,...eF(u))}}),i.length&&ru(o,aO({id:\"\",rect:t,content:i})),eW(o,e=>{ef(e)?ru(n??=[],e):(e.area??=rT(n,\"/\"),rc(a??=[],e))}),a||n?{components:a,area:rT(n,\"/\")}:void 0},aC=Symbol();M={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=rH.cookie.match(/CookieConsent=([^;]*)/)?.[1],r=1;return e?.replace(/([a-z]+):(true|false)/g,(e,t,n)=>(\"true\"===n&&(r|=M[t]??0),\"\")),{level:r>1?1:0,purposes:r}}}}});var aM=[{id:\"context\",setup(e){rh(()=>eW(aI,e=>rr(aS,e)&&aw(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(t,n,a)=>(null==k||!t?.value||k?.definition?r=t?.value:(k.definition=t.value,k.metadata?.posted&&e.events.postPatch(k,{definition:r})),a())});var r,t=nK({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nK({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nG({scope:\"tab\",key:\"tabIndex\",value:n=nK({scope:\"shared\",key:\"tabIndex\"})?.value??nK({scope:\"session\",key:U})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!r7(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=rM(location.href+\"\",!0);k={type:\"view\",timestamp:rd(),clientId:n_(),tab:nU,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:t+1,viewport:ti(),duration:ay(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===t&&(k.landingPage=Y),nG({scope:\"tab\",key:\"viewIndex\",value:++t});var u=rU(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>(k.utm??={})[e]=u[`utm_${e}`]?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=rW(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=nK(as)?.value;c&&t8(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...as,value:void 0}))}var c=document.referrer||null;c&&!t8(c)&&(k.externalReferrer={href:c,domain:ta(c)}),k.definition=r,r=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:am()})),ah(k)}};return nS(e=>af(e)),nd(e=>{e?(ac(Y),++ad):(ac(X),af(X))}),tn(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:r=>a$(r)&&(ru(e,r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),Y),decorate(e){!k||tI(e)||td(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var r=ae(e),t=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{re(tx,e,e=>t(\"add\"in n?{...e,component:ez(e?.component,n.component),content:ez(e?.content,n.content),area:n?.area??e?.area,tags:ez(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),r(e,e3(tx,e))};return{decorate(e){eW(e.components,e=>ra(e,\"track\"))},processCommand:e=>aq(e)?(n(e),Y):aV(e)?(eF(((e,r)=>{if(!r)return[];var t=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=r1(a,e);){rr(n,a);var o=rV(r1(a,e),\"|\");r1(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&r[u]&&(l=r[u]),ru(i,l)}}ru(t,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),t})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var r=r=>{tn(r,[\"click\",\"contextmenu\",\"auxclick\"],t=>{var n,a,i,o,s=X;if(rQ(t.target,e=>{var r;aa(e)&&(o??=e),s=s||\"NAV\"===r3(e),a??=tP(e,\"clicks\",Y,e=>e.track?.clicks)??((r=eh(tN(e)?.component))&&e4(r,e=>e.track?.clicks!==X)),i??=tP(e,\"region\",Y,e=>e.track?.region)??((r=tN(e)?.component)&&e4(r,e=>e.track?.region))}),o){var l,u=aj(o),c=aT(o);a??=!s;var f={...(i??=Y)?{pos:te(o,t),viewport:ti()}:null,...(rQ(t.target??o,e=>\"IMG\"===r3(e)||e===o?(n={element:{tagName:e.tagName,text:r1(e,\"title\")||r1(e,\"alt\")||e.innerText?.trim().substring(0,100)||void 0}},X):Y),n),...u,timeOffset:am(),...c};if(an(o)){var d=o.hostname!==location.hostname,{host:v,scheme:p,source:h}=rM(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===t.button&&ru(e,G({type:\"anchor_navigation\",anchor:o.hash,...f}));return}var g=G({clientId:n_(),type:\"navigation\",href:d?o.href:h,external:d,domain:{host:v,scheme:p},self:Y,anchor:o.hash,...f});if(\"contextmenu\"===t.type){var y=o.href,m=t8(y);if(m){al(g.clientId,()=>ru(e,g));return}var b=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!m){if(!tz.captureContextMenu)return;o.href=ne+\"=\"+b+encodeURIComponent(y),tn(window,\"storage\",(r,t)=>r.key===P&&(r.newValue&&JSON.parse(r.newValue)?.requestId===b&&ru(e,g),t())),tn(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),o.href=y})}return}t.button<=1&&(1===t.button||t.ctrlKey||t.shiftKey||t.altKey||r1(o,\"target\")!==window.name?(al(g.clientId),g.self=X,ru(e,g)):r7(location.href,o.href)||(g.exit=g.external,al(g.clientId)));return}var w=(rQ(t.target,(e,r)=>!!(l??=aA(tN(e)?.cart??tF(e,\"cart\")))&&!l.item&&(l.item=e2(tN(e)?.content))&&r(l)),aE(l));(w||a)&&ru(e,w?G({type:\"cart_updated\",...f,...w}):G({type:\"component_click\",...f}))}})};r(document),ak(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=r9(Y);ap(()=>rm(()=>(r={},t=r9(Y)),250)),tn(window,\"scroll\",()=>{var n=r9(),a=r8();if(n.y>=t.y){var i=[];!r.fold&&n.y>=t.y+200&&(r.fold=Y,ru(i,\"fold\")),!r[\"page-middle\"]&&a.y>=.5&&(r[\"page-middle\"]=Y,ru(i,\"page-middle\")),!r[\"page-end\"]&&a.y>=.99&&(r[\"page-end\"]=Y,ru(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&ru(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(r){if(a_(r)){var t=r.cart;return\"clear\"===t?ru(e,{type:\"cart_updated\",action:\"clear\"}):(t=aE(t))&&ru(e,{...t,type:\"cart_updated\"}),Y}return aJ(r)?(ru(e,{type:\"order\",...r.order}),Y):X}})},{id:\"forms\",setup(e){var r=new Map,t=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=r2(i,tO(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&tt(i).width,u=e3(r,i,()=>{var r,t=new Map,n={type:\"form\",name:r2(i,tO(\"form-name\"))||r1(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:am()}));var s=()=>{o(),r[3]>=2&&(n.completed=3===r[3]||!l()),e.events.postPatch(n,{...a,totalTime:rd(Y)-r[4]}),r[3]=1},u=rp();return tn(i,\"submit\",()=>{a=aj(i),r[3]=3,u(()=>{i.isConnected&&tt(i).width>0?(r[3]=2,u()):s()},750)}),r=[n,t,i,0,rd(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||tP(e,\"ref\"))&&(e.value||(e.value=nP()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:rW(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aC]:t(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[r,t]=n(e)??[],a=t?.[1].get(r))=>a&&[t[0],a,r,t],i=null,o=()=>{if(i){var[e,r,n,a]=i,o=-(s-(s=av())),u=-(l-(l=rd(Y))),c=r[aC];(r[aC]=t(n))!==c&&(r.fillOrder??=a[5]++,r.filled&&(r.corrections=(r.corrections??0)+1),r.filled=Y,a[3]=2,eW(e.fields,([e,t])=>t.lastField=e===r.name)),r.activeTime+=o,r.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&tn(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&a(e.target))=>t&&(i=t,\"focusin\"===e.type?(l=rd(Y),s=av()):o()));u(document),ak(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>await e.variables.get({scope:\"session\",key:_,result:r}).value,t=async t=>{if(t){var n=await r();if(!n||ts(n,t=tl(t)))return[!1,n];var a={level:to.lookup(t.classification),purposes:tu.lookup(t.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:_}]}}),[!0,a]}},n={};return{processCommand(e){if(aG(e)){var a=e.consent.get;a&&r(a);var i=tl(e.consent.set);i&&(async()=>i.callback?.(...await t(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=rh({frequency:o.pollFrequency??1e3}),c=async()=>{if(rH.hasFocus()){var e=tl(o.poll());e&&!ts(s,e)&&(await t(e),s=e)}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aU=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&r?.[e]!==void 0),a_=aU(\"cart\"),a$=aU(\"username\"),aF=aU(\"tagAttributes\"),aP=aU(\"disable\"),aq=aU(\"boundary\"),az=aU(\"extension\"),aR=aU(Y,\"flush\"),aD=aU(\"get\"),aB=aU(\"listener\"),aJ=aU(\"order\"),aV=aU(\"scan\"),aW=aU(\"set\"),aK=e=>\"function\"==typeof e,aG=aU(\"consent\");Object.defineProperty(rL,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(ai)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqV9eX_TSLb2__dTJBomI-GKYzsLiYzQpWnopjssw9JAOwYUu5wIHClIckKwPZ_9Pc85VVqcpKfv752hY6mqVOups9cp1_WCB3Nnluu1vMjiUeH0L6JsTatMFSpRkYpVqnI1VTM1UhM1VhfqXJ2qE3WlztSxulRf1Wv1VD1Uj9Ub9V09Vy_UF_VIPVNvA-d_42SSOuoTPY3SJNdJ4ag7gfOpiOKp76gnwZ2WkxdRoR31Es_ns_zUUd8Cl1oPdPDgcZalmas99LA4zdLLNT1xdZDlSAuR4-ul-sHlVRFsdlEwRpEgyBYLV4dh5gVBMptOvUwXsyxZ7_SRf0KfbmzQT4af9lQnJ8UpPjKP3hxzkASd_oQ6gOdoLU7WtMe1D6LhOpWln42N9R_8rvCmCuqBbajbb7WSpbxQTUHw4viLHhXtr_oqp2ZNQ0tbeqleyTDa7XZBwzBDKEy5B52NjaKdp2fazYIHr1DS89TP_AmVxgjXAx1q_5ubhaHzcC3T32ZxpsdrF9F0ptfifO0szvM4OXEUTeybq3NtJred6fNpNNKuQy07ykFR-3Hb8aiVn2Q91juq4IXIruZmWNr1lqOoGJ3SdJZpr2l0oT7HOvEyfeNl8nWEdIBBOtVtzY1nJtPzs-UkTqLp9GpehG2qdal-AwDwMmBpAaRFO07iIo6m8Q89XiyyMPNpMgQY2sWpTkJ64wdq-4HbKM69p6FS4xf0RtDlef5fF_H6ZkTFUv1RdSaY177x8Q016L9z0UM3W61QeuctbV3ZUr2r1fUb5ZosmmNM7-9upgb0OPSW6vcgyq-S0bXZF9iMLqO4WOMGbO36AnOcDTpDmsTE85NqdQC3WAF-yjyzm_rN9dDeUk9zzYUvbOH1bNAdlh_YcVAaivPWsF2hRqkv9Ak2C-3rZKTTyRrDmfk-st9Hy3LB5WO77L9gdrQ6DC7SeLzWUb8Gz2dnxzprP3v4_tPrh08ef3r6_M3jXx6_Uu-D9a76gIn5k8FjvlT_lo-1xq_ZE0pnweurs-N02o4LnUVFmild2I3jEo6jKrDh3MILCz_b2EjoH39b2Ae3IFguPOQfKp3Yjw2oEy44FGR06OuwPciGnKJRNkJPnOOU5jhKnCAoaOPRnFCv4kAXtCTYjR3q5saG2w0CvVg4k4iWwKEqkOYU2UzTd8g5xGbUKWpcX6cach4t5X1QesrP9NF7pWd2yuL8dTTRT5NCn2ga9Ij7knBeoysTzgD2J_RQzxhzHyfoIw2sSF9zERfduAgeZll0RW3wr9Ln3INrC6_0qUEfXYOnaCzhob9OE00wpmn-fP0UvwPCP3roD_RQ6ZNqATENTsq4s9G3K4tQz7O0SJGu9JlNO9HFS5v8gvp_XAMIaveM2sOcUrcv7WI6k1kyKuK0vkq8mEp_lflhIGr04TVn3PCh0k9ro15fd1GVzoZY0WtjIVSGGX14bQKfRedKP76W_FoXSr-po34zpV3QDJrPZ1Fx2s7SWTJ29V1Ckfx-nl66XUJIRLI6oF6EPTsEUFu0Qt-xk_RzNOTipaM09eeFnTOpnYCdF4vIT8Zr9MWQXcZ7YVh4DPWEevULKqkoKSCcRX9_VS7xEVQs29ykigr6S5SK0_zELwj_K_0oEBibxFPapK5GB56ZBlRSG-ZgWAedR0w-MLOhXYW7PC9AXGa9DcabZ-gYYXWgrKJG2ZM1LIJXfuAmtNkTVbRaHjEH7lWsp-O1hPrz3ZvzVPWPMx19XTKqXFupRapIat8tl8DsAeMIX39xZUDUa_Agq72-vY_CfQi6HSRKD5LhEKiW5sKNqMORdFhJB6KyA9ENHUeP6j155sriNjpDfb4F83pzdEsaysqGqNe0siXGpJGAgPQ9k8uzQM35tUYIPmSl9P2ON2F-IAw29Wa3r1ut8svNzX450wxUfU1JNrfV4poJ3migb-2mAJQLiBisQgP-VAcnjNm8KH3HMpBdEIMueF4AddlT4nMMM1yDK-l5BthbLBLDTHp2wWKAQxRSMxkxN16X9kYRcpfvajcGo0jVEd3xZRixDNHO1dJzTQfRFVpZLt2lrj6pD4I7IBCjeLQWQDoqDgZDhp4iKO53QsvitgqfdmSHhpnUUxM_Ccu3fnE_wfR97wOiuEaiOYNi2KfpTwnUUhVRhp_ShsdUbGzEbTDubupZdlcwSlxyv5Y7JU7kU9l_IpdLpV-ubnIUTPQlsJzLi1d9MfRAUr_duFqo-45bk1qAUkkyQA2e5bdKPukdiG1gRxxq4pgAIjUawaA2GHoyNNRyypycIg5Ov2qsAs85zXjn_2PCea4rnEWzbfY1HlVMmWEYYSc3t3LJTSldygLcH7A1deGlieKAHgpGGgnXXNxaM_G--qe_rJkRE9WM-gbURZKDhvVqb6v1t4a4U6MzzAzoJy6vB02AFKFdZB-V_uP6_PdXEL7sB7ver8ryfe4qYWMjytH2LUv9zONEietEuiz0ExdaNjZ6DZsYChDz8sVejd9Vmjj_P5SucfU3joCmwTZ22G82U9s8FbmKDfsde6bN22YdUPKL5ZAmWXr2OCF-TudKH1akfH5TL6zwQPKolYzny9pmIgRMhJ9pvOkUC3-U4JUEQZPEEBRuMsBmI_YBQgV6bBICTvDBBaA-YmOYH6BEi2VcW7S-MfkrkJXrxesVY8aoWImffnEZwLLQSF0kMmZCRrpSFcSxLgQ3pX8NKrRiFytmiYOoJmQG1_OLcjL-oML0D8vKQoPCcxjGrsff8xNV-r7UcVgxpQgYZE0r-q1QANM_6RyLFMhHR_WH4O-BEHM_xJW95-KEMHkbWDnPrE5UIUPCSzmJr-Xm4VrXGzulrsrQK6oMJj8yDdSvVgtj7tCI_wxk_zZ5Vj3CbmcG9Sz6bkv4-lczdgw3gLAZssTJHEQNXywWVEFEYBTR6keEwg9VNuhBG7NNYKH_XcG1IJRjxi30RpXxOnOu0h0WqngBiJLXMNBD-4GvH5tHks7XiVwYnDgg_nlouTkzL1r2FUuESndvYmMP_Ypy_1Gt8zprrQJZbmrtudTBO17p3s01cbdpJibcwYFdyE0McaXuGhwJ67NzS5XHPBPrWXjjUj_o-JqVUSS0E53UKa0xN1VuqPV1aYpm87kLPof3Cz9yY2EIkWOv3AWg0RCS8jQr3ArovU2Wu1ke2a3JG7oNxQXJxiMS50vdWig6gwC81lhPdaHXNAlwPv4EhV_L1W3JLx_ApjU-aecaxegveD9a4HY0HodIol-Urn8pDTAkbTdRqSFGN3ZXUCN1p6QtVE1f0KuGCBvyX2nsNMpD_mvbsxinHNUNaguqp0JRWItd7lwCVEhbcr-2JV1CuxmtxQP-dQmsiyHGUFbpAiaoXVRzjEr1Pr_z5PD4vaVZqQOWJGsok1FQo7-EpcOKq_bROs0ftX7BVSOHkDf9YaKATHdAZYesqDEkEDw_jeJeoA9cvUtvGk_VjpfB2hnQ26I09QFPWVbqcFYk63DdzjKGbBabOXVTATQS9wSVEixnpSYJgxSFs1AgIZSE1eWzkkBc0qsjoON4t8GfKmh9sqS2Pqa2wdAwvchizXwFaCgxJWQZk2BY02VvdkOa1akXutB0qWmbeIrH0egUiuRCqCjtOZ4bzE4tZQod6a3fRnZKiT2lvczf-yZxahPpYV1_YGSSbmxkkYsek0xc8kVUmKYxCYlPpgWnQUf1Ca3YLtZsuhZDWzzUDbMSZbDctwldske05BxdzCKz5iILZvcrjr-dn0_jEWCp64H7F7D0zUxQP-Lrk-9mK7Q285qqUtoYUL7SS2br73rlnNGm4Nq5hJmAJVE3USQQBX4C0T8qy5eb0ODgsZ7EiX6Zpec6K64YBOeEVybxySyLjqfaB0pNZmfavHXUZRYXNoeGkuAPb17ooQi1OMS8F4uFwzYCfoGKk3cMIX9rewjnVNQvlv6cy9HTsr6E2coAgQRo_tL6_NHc2H1fsSbXOVGX6ppGxTNaPeCCE8YFjBEKu6QCCN0afIcDzCgxlPgZDv0sdc0zN88YBFSathU9rZBoAyvlVA-wrYVEgAxIXcBxqIQwEMQxqqbUU5X8G7OzNGxRyoquzIVqK5sKkWPjlIFDAj-0CvlmikyYjXyrqTg2RQ5BusUUwEwHFS24KHVljrJLw5NYaTmrpKaqVujHHtpSmNiqFPPHqJY5ZFOz5j7PaotHVNnKwLTXs1Eza5bkp_GksLmT-u5dx36wfCSNQAt1MwI6RAjZMzVB7Z0ZdDo0daRsaSMWy-yvIkiNWcJNg4zyFefaGvqDlCYsSGVPEXOYAl2M3AQgnwb8-SakQPooSJUbkTBBM0C9RAIgW0XhIFaRxQi0pOPAmSWy-cbOupUIaRMS3J-BckDp-YGngxlZovMk3mVj9z3Nf61Yu4jP9IssPomTVj05SS8JUn6OCn5U2QXEJ9iOWMigery67N3SdzMSJojLtoajmKSHlG0ZxLtFrWAzabEOE-hYpSwUEoqlOllClByCaBrZOVrqeJWdjep3sTS6sWlpP0TWrLle9EdTHWVvaCzprGAGNiIWPIROIYaOY-rr3HPZnkNQR5vXL4wxx6ceRjQsYqrs5xhhQlwh1Fz4ejP245q5LKFOGvtBp8LDsr3mE5gpdTK68jM1iqbT42j01ceuUHNKJ0TFNOs8muV67EegmrTnT0505sd4SWnu_RRP5ce5MSQtAxLoAqAm0wKJMH0hrx01C7JL8LHWVEiLMQqyC3ed5LJJMKLXsUj4a9psg-lisU7c2ax9rpNxnJwYFbyuTMVU6rx9PMuv0GOTCdG_X37T90TKn5WMxGIxQxdo49PiSubvPJ-5i05sTloud4cWm8aIjHWNTpTdhglkvUtCwf2gs1hgo9Agup6yPelST5YK0Eic2Tpz6CMRkhkCYFfKiCIQe0CfRKMiviCwXXenBIXUqzJ7rDIsbEZ02Sc4PKd_wVyKgy6hLfxSt4ooK3zD_EM8ImZK5YSKw1xduDwxANz05IQommXfaKps46EmtOlesIxx3jZr7aJFnxN9Hp5_XoJBuUoye2PmLagCWyHzfSUsUpXcNC00QeuStkGU52vZyfzTOVGwOBdjqmHyXW9enMa5XaAlUVCxxLuloZzz7bdtzuRiYoq9pRhncjEDF7cVNNlLu9rGGHVz4VohmmDKos9AJv_bV7ZM-REP9sbSAehPdiUF8_gkIcjQzaJlL6S6Erj5EzHrs43kpr6U2culWZeral1MxX3pcJ-nus8z2TfTRNtuZfXYB6Z_fQgv5dl1LWtD0rqwEJVB2ZI__tq0IJYDr9b5vpjEK1cMx9S9Fk0zHY2v1qwvwpZ0nP0xlvXhl73v8iQNstDhYTm-YemIpEHXuVgQ50KYWKaS5DQ1qM-4nW40Mgz0_2GumWycVQg6e9AJa9gdhfzLOBmnl21Gyc_iUZYWUf6VLYTHKzbMxSLOn8CBAjBAgthioQk1hRnLvPXJJ-aw1oqoU6Fwc0ufCLaoEgH85n5-mtBcEPkh8Sq6Wrsz18v2Z2r8UiyODJYnvoHO7GtpMXhpoRy-MSW_VuPsIEa-rkn7IriLbGb5I35g2saUJSFsBUmqCzxDvWUEo9JGXgd5mcmzuCelbUBcSQoB6akQKeOkFRjuz5QcuHV9YJC9hgaS1oUFWcjmeDYipy6lkDXYrzY2mIvTKoKAoqKlco1yngZOnGedzdeS5Xno0ENZ_4ETJWNHOWrNYTGdmXSYg5-wg07D1MJM_ICEMJaROop4z_aXNE5cVvWFqMNTzprDwhI_NPRaQynsONCMyHfmI_9QZY-lP86_nIZOK2vpVqayN9WSNYzbcJx5yGph1qMN2GgIzEY1o52JMX9LGUwk29v5a7Z2UymVfRcjupjcp-lJj73XaB46C5R6fpPhCFL8DWp595o20UodYJAznuOJiMMjwLsRZEwWTVeRHqaXOnsU5eBRKNVT02Cl0twjfsakMcrgpFGQt6OEuB5wC-MZLZElt4sM4vokyEKIILmiUv5IJWmi_c7Sz4n1-e8Dmax2lVWonuE00MqM939GEBmKeDWm5YDW0r_Js0UW5tAs0QRF8bc5fkojwh5lOb5iEgNYOcd-HZyqkyGNaGAG2XBs4cprs1DBDQnO59SuvBBKuoB4Riyvew4m7hCqE2IbPUK9Ljdz6IED0eDEa0iPYIV2FIy7HmAUTDRGuzEaUk1RcOLqjf_QfyOPi5QibwwRjISUmFoJphVgyIzCQWKD_mTf64DBEANQLbUgNxhBfQeL6RBMD_3BRWUSpWbYohZiKfzDobq67oBSG1EasOIl_OZW9O3znflvr188b4ujUTy5gsUY7oZJWqxFa4Kl78yLpXBKhKUhi541hseDWE8WCzfZEB8eHmUNlWUxEBTWTQ3-Uj3SXao5A4RPXEl29ZIfT5WBUn-qZD_4MzVN06-zc_9EyUz5UzNlikW4AoaEE6wh7Qza8k8kUXAQ0WL4FtE2cQQbmoJeiLQ1p1X4n4meyrDvzA12ObWo-jGrU6B1XX5ewndnfj7LtH-maEktC0yV8mjPrkOBNpqwMCznjr0R4VyYvVgxjge647LSQdhsQWTiKOsad5tKNSWaMHihBJABPT-7rrYSikjk8LBf6aNFg8zm96KCPKiPCfzavB7wXCyq6mIWbtejUqsdBWnt681uGFffxW27lPTGPUfdEQbNHEHNpzP7YvwCgRwfWRq2IArWBxVzhpB6OqUqozKoWQ09NHyF6wSOZ7kDmB1G6Vi_ffX0UXp2ThsJuAaiyBmJW9bT9uF06jotuNoy_TK5JSlmChg4jkoGvWGAVwLx0IyWNnYX-nnxgECm6QY7SReVXrTwDz3sEtQ2wF_azrCU0rifNfx5awTyJaVvfXRDH_8GR5et9uaw5fmEiI62jra8kB4456P_v5ROj0d4-d_hXQLn_6VMShhQwtGQco-GC3fQ2Tzwh63F4ONWa9gKPS7iu0djfMC1Dj7-I6TP-dOQPv0H10Vv_3DbeLqzdVKaAVcd0S2EXQTzPJ1lJMxrlY9O9Zn2C0Uz6RfheuJD8D5U0aw4TbO4uPIjNcuhAVDnJCVcptnYT9Vpmhd-HoZTdZ6SBCpgNgtLajFjUkEUnUgdsbHZlXW1m_jZW3cCLmGSRSdntNr-uJQXL9r4JJAfWoqLdtmL8KJNJYhj8J0thxZKXRBLnr21ji0MdRmM_c6GIxbKrPJeMkBpXMGGxFrW-JhDGNHO2Ol3i6bxY_tueBQuPnpmbmkRYSMPDdBkQoyYtVQ50cBHTIpY_wlHO9GEHvpisaO2psA306D0PIjD0n1862hwNLyzpYgNItotDk9Ub16BZO6nBITgYmk6I1EqTj2YCCx3Yb_TP0R0oMFobBSfKm1BgWDnFu4V8SD7gq2tYoLpOzXPL-tFlLULnRdiQc2eVGwfwzmmkg04LwPXKiTZWdMlhi8xhwZo6BGUe4cqDt0Mk03forRbc1th2hgZhpi2qnFMEGOKnR35hAcpZUVA8QuzWAn15JvxgSxndHD08c7RUftuK3Q9mtz5cjGk_eAcHd3ZAK_5I9g6-tGmlOxV6c6cBdkbV9MA3wuPqi3ioOYIt9HSvNInj78TTVDOyYzwT_ZDZT8Hc5rCn645mkpRlf1mkaNipMW05SfjuisK7VclU5z9xl2BJRd7EiQ84qLhFnWVmjNsWvYz82kBFmOxIGzHiOdoy20TojjaCheMAGj_zwwCAHqznS9s57nd7A-aXpPz2Q3vr-O_I_qfx38GRFbfwLb5jQjfZ48JK3ENnz9KOszWW9VXHv7d3RLy-83NoJDeOjpy2x6m_k7XwUS275IgfuczlphA64_SlljtqzCkpHc194NqWZHA2b8Hu3pbZb-wPIf_vrnOc2KFakcI2ljnw0BEaJX9GozT0Qx4RmXvg-zX9nE6JqH1g-3A-rrd_WzaUNmfwa8qs14Q5RZ5EGR_AoWU3qVKXAbf9-nzhOgXeDba-l0YgeDG02oBsMWVgMGscpMjQkhfZrRtP9idR7D8geRHkungj051xP3SjbAvuIrlQlBtGsrjqcaIYCEM2-llorOfzSDpczteUPJgNR8WsWg2Lf6I9WVIEkd0pm1ly5oCuWPkwR9Ozb-Je-_gqXS15weCxWOwarQ_88sYWzPz5iMSIdY7Pn6oFt_o3R2nRQyWkO-wKW30-YuufJE58ntsv3SMQ7-OcV6C8xKbt8ZU58k0jYoy80uZ-RMreJmLFpaH-L4_TanTlVIi5thcvZob8WkN5JtZ9BumVuljaBX3MlbD8aiK49GBFLTTYM2ondLQae0otBDdGg7ugFCd6OJhQV8ez9gCzoSuVyv078qZikT8rsmA4mWnBOauwTc3roPK9gxSrTf1nAAlR-aurYVywbBR3vh1cTXFvJozBGxr_YM1t_B_A8CobLvmuEVccRGdoEpfMvdlP8-_w9yRHcAK1P6-5Wbv2-lkkuviXTwmrtVoxeKE4JlTqPKOuiKCcFUr-6uOT06LRmFJQmnwDOJqQW3pN24-ytLp9D1cMK6q9w_0jpL3yhljlPaP9l0h1oB1uHxUKarQFmN84M0eFJnY0Tc2fqG2zr_7Sfu7uuLfK8VtU8JWc4Rqx3SDymytDAh559GJfpJOxznxaShyfYwWcqhDpbsGMcLnaQzTAnAUM8ao6IP4XIQ0ERknvKe25enD0tchZiiipHgZFLwtyncLn6ooBFIgumLtf8L5CZJTH01jQiivoOmGVMQLqmTCU6Ktk6JVtL-boaYEfef0fuWpS8yBpPGjp05lUJwkz16t9aTi7wjdnBcQ89h6ledsKKFpEKPIKSP218ZdxjrtQL_3-II6ehjnhaYptE4yzVKZPksv9I0FUTSyR9PmzBJnFT8tjPEyyJ6JssIwYqZcyyVm1ndaCRi18iPa8kVsNgO4I8zdBzsz1-Dfzs91OFBFWkRTLuSvwBjnGGhZgbGl13cfBzkx3jmxN543eNx-mKTJ1Vk6y4POMHDKN0c9psyntNoZrXLQpTz7Ilk_SwZJY87PteTXOsljtnptU075JudnizTInrs5TG_OOCqiNTZLxJN4FPFZIZrt3AJ1kVpsHrabxYhPAAN3oafYp2W57Hq5zJbb2ChmVXXns-w8zXXOFdkXrmtW1VUVqr1QB6erKh6D3eG0udIB0ULq6mviDdlJQXGvLJibbPvarMOv5uH6NMjouIereTD3mWb9auz1odvnxgBJ3ms_1yOd51F25S377ptgStAyFWh5035O4jsDCh4c9QZJtjgDSfkmmU_McRHi3IorBpZGihR6Wdn9gx0qUnuXAm-ijJAPjDr7lF2-SeZrPZpBfgy6ewxx8iZ5TxNigMSARbgj2O4xGNfTpNzD5OpTtRF2Dngn1JLKUsHetuTZtrMLnQW9zs4-t423es6nd9QXGlTnYK_MlzSzIWbYEFMSusyGMOvgqF632yVoG5n87mo-XEZLvxLXnQVgcnURoRQbS0LXuM7R4hM-0mNVvrPVaaxWNNAzq0hdLKzTXVWjfz0JJLUYm4OXoDjEF8rSPB333e_BiOBmJHDzvf3LND2Opgw58uio75T8OCl45ShZHiX5NYEQgQjDi3mWjJ_1RTwS1CKPkvw2p0UA5ODBzOwFZm7EM0fvMdSba_mIWBfH6-cV1lM1eJcP-czm53_dmWs4-C7_hcMcd-bFRVsUm7SJuBpvKdV9VsVpMOdHv7goN3Mxqu-_65t62c9euKCA7vNgQjM1kZl63n44HgsmHo8d9ZwSnsUJTxD9moToO88M_UrC08kzTD5Pi3m2GdimkrnDmeW7o2h6Js3p4SVcgysPYWL3RTCmfo2lXy_ar2cjTBPBOnpn3hz1grIeZToiAKMs9NO8SdbbZHQaJSeUud3hBbLvkv2zTmLK2-nIiuJFMkjkewJeg7J2GNvIq2S-0tH4RTK9osxdyrSvpjNpMpnGRJlo06E35tV2J5-dg2xTo7vc21qKFDGWUfq8w8iC3ySLNfb0HTL4mSdxvAJjulhD-AZCGubI4smqPZQkS7DhsRzMTsWXpLik_D8quy1xmLFrjbcRO5ISOYECVxHt5vP1KQsbcsxfRdOpSWBZ3lNmok2iVX20pW_3tztQaNte56YU9BXFGWewmr9KhSIXJ4RDsYh5IC_5KXuwuzwQdm6ionDC9MTnOTf1SDX4HMKPraFsvJkNl-Uckpe0jaRSe5gT83RlZBcra4V2RLRgsHgRUjpDkUKONbSJHECgDsW__7h2AjkLq49pOvxGVSSI2ldiDAgKVXF5fR35SCGtYGmfcMXrTLOfdL22dZLWqRYWCyWdOuRGwWdCLecoy5oh6iXhlVE6wynZtFg7hhFk5TNngp3QdvzPQFHy3WJBULleL0RgSMwnXCacJVUzgsMX13VQr-szDmSujcweaa-9OSUU__2c_SrWiFYB8679q2qH1k4SCS2OY-njmWAN-tJMdfNDO__Vl-3PPm34xkyIC08YOqgG4iWjybXLKF8bM1ag4dI03v6NBPQYp1oMZxgRYWtiOLljzHxHqGK3MZM4IIbAHtF4LSUEQo3sNhvh-UnWZkk5KdyoD48J43b02Xdsoa9JepmgujxN2s7y8_KzMieP4GAYtgfpkERUVucm9iCYOSZK5BSRDEpVrrUCfXNjY9Y_IvbY-mynfkq1wTO84GP4BfznD1l1W_Dxe6hxroUuaHM8gOJp4FobV8ayY8FCo5xdcU30BJPsea5zEetLcOYPTcVbH91_Dh5uPulsHgznveVi8PGfQ4-k5JPYqpapTK1ALeNGSxDsmcXjmqraXXfPRdx0LxC7JDppuZkgDXYo8GDDOQcVziih692n3PKFHeHhInXBfgpvjJrLgWFInH2vedHLyaZ3Bsm9sQoVq5N9KbpQWHWOcv8_MP74brg-WPODIewySP4PLDlQ1eZ3B5RMP_TiwDDkDD46w7uLtneXCziLO97iX8j41-Djv_5Ty_kXcpCxdleMTYOPaqP_D9RNI77reVQpW4HW7v6HihyNUeyoDbuRMSINjnJ8QX2hqsRGVLMQWaw1I-IRnfgknBYPiZq0HN83poQWJUQWZdNzHIZpGOaEfqcbG12gl5oaDjKVO5N5b6ZvdQGGj0kWn0GW5yewigSs33kN3unoK6I4FBxcofjOK40SL2Sx3kvwBGdzs8ii0ddN6p558FoEKl-CxolmBmG2B0Ki30NFKaIxdIa03cIQBpn3ipYyCZAPp262xapkKOEX7sBb2mMXAyOArReLRfZBTpvxUS0Sp1ImvwSZkUBmpaFLAY46dnk3E_QQqX7nJmrraBO6cd9hBR4OXhePbESW4lndIRwhluhP8QOQnpde38UjOSJjvHtB6cS-MBjo4dCeCP7G3fQH4iA_gKFBdN1EgGkbTPWIQ7u0zzM9ib8PfS7hsd1TJcGAOjMYsJGBZ_ho0wvRCUDTnQW9wd6wxUcGaIX-7Z569GnfLR6VQvoXBjJiTswJkaKKNkAb6Yeb4bxR8cLN1AdQdvPmHEe53nRanMo-TTQ9n2BwKcqwA8VbmPoiO8_ETXGkH5pjtFl8GhR85hVGGmI6ZIcevW55R77dKEeuJNC2wh5VPm1dj7fm-tHru0e-2SPW8whTQyufeAqeAkNBH650A5NCfTQAwgO1tjOCrkQsZFYzW7DXXcFnadV7sEJy2soI-J5vpqZrpqY2MbUJ8cLQRciMk6DAgUecGXZPkMoK1eJls3lWOLtXgWmVlVewdDP1uQqvfILQKwDht0bAh9AtEB-AALzEjoqHAZVX8YzVzDwLohc340_gKeGphI_EhkAnOR_USKy3lDdc-iQ2-FjQH8E8gR7YQXwzR-XZyHe2PhXtLyQ8jOMcDOAYXigQUlkHl7OKj96elK7sPZiE8JJb_0YfViLKy67OwSn8rq9E0fzVPkTncZk41sezE7QRn9E-YHHyzSk9nKbTsd-lioxukWSFQn8vnulkhj4YE8BDuD0zP_IGe4Roqu9EsyIlkoKBz62lYMAS-iaEBXnCsJ0hFH6vwCUWP_PfnyrHUGKOTqPsEVHEh2x2Lji8l8QTYl-xRyZb6HUfc-w8_OnRz4-f_PLr099-P3z2_MXLf796_ebtH-_ef_gzOh5RX05O4y9fp2dJev4ty4vZxeX3qx-dbm97Z3fv3v7B5idnWHmRmE38alD8DI-QRn863jCw6EcifVnLGKAOwRusk5SCxb2fPCj6XoYoDa3W8P797t7CPu6bJ2vepsbc7t5ud7dzr7eReQ8edPcxOwO3t7vf2dmXpJ4kEaMoZfb4fW97g_ZmeU7ORo4Iks2CZo9wME32uxs721HVaW54BxC0v42TYl_82bbvutHWzqLjtdyotb2x7f1z2-tHGFE8SKjrAeYIQQ4QkYKG1Fu4WTONurij6Au2wfMnbneXen7__s5NZXsrZbe56N6iWa7iB2lcvwfz7Z4_6HX39rrbe729bqK6e_fu3dvrHhAt29vxB53vo-NJ72Ckd_Z3er3edm-XinQODna73b3efq_bpXLd3j4K7o32er17Pd25d3zc6e709nrHVODe7l7vYHe0uz9OVOd7t3P9f93t4wRs5y8wVvZ29wDFdyW0UpSM0zPXW3RUcVgPU2eZkKCTkOTaUVM8zLAXRvQ2of_G9N8F_Xdu47NQQn98vzTT9y9awflgvAKgY4T2Yfg8DQiRgTpQrbRFzodUa293d8MdBRc4eLLZXfqG9HIMLddmt4LN2WAcUFVd758z09qw5c64sbpv1ECHFqpO-aBRd2_TheXBehK0drx_dveuQ9YO8VXEVCE8SHJ_u2_W-8QtfsEhFBMcpaPK9MnH7t5dyuzuefRdPyMYrOXJRjLf9SOE_LEASvVV0CLH-Jt9Ruikgrpw4pa14HRuNYbNHRrS5GOVTwNaLKgj3n1CV9Z23BxeR7qSsKl8JQ-eKQ8S2_16xasdZYy4t3NzpA28ciN5IOESCdQzhRENUjWlkf8-yIdmdGX0mDT4KT55mhTtKEePYHRw04-S1hijd3da9odde7JQ3GldU9jGe3r6vBnvqZX-c6XESkSozdu-9Py0Chu3vectsaF-DeYkY6YZkb_5ctmHHDZnm_TcRlxay8ogXvBibZ8R0YnPpySRra8655rAguYEhfX1j7IT9hBgDZ-_9tiKtCS78oeQlnOdiZfFmq1eROu8bbVZHHxiZaUJqXgc62e1b2XoJ9r9_bS2PLR3c1oDEoglyFM9YGPUzmfHkYAXcc79cgJyFpol1ggJNSbqat-4JJRBadgzoXY60Z-53YOeJ3FfxPBvYw9Slg67B7t-92CnUcAEBPRdc1ytdgZjY-MWf2s5jfkg6JDQcD_o9u55cNmW8Uk8L8p4EGxu91YyHsgXhJO8kTvodXbglVrLJgTW2y8r5SL7K0Wkhr3d3W1Tx67SDx482L9W03bv3p7UhSdT28GNhaXOnd7BzsHePaILUnaPy_Z2-Ke7d0szve7OvZ397b0daat8lQa7nb9RiZnG_Z2dvXs7O5172_c6B7u7xAp61jV3q-zbHqj7P6vXPrfSVZm0kkkrGbeSEenl1EhSI06Nhp45Hku973zfX6F73JfO93uT5v9Cd-b2YKiBqsDzaYlD0zKtmOrU_z_0fJ6_e4rW-a_-sx1hf27eaT8TNwl3Hld0GLznfppNJgR1-xzCBwoPFr_3dlyOU0i96mx7auSubNQCLr-AvRqoGz2RT1QXh4EbzBP7w1Z8k1Cxop9IXK4GOU68B4DOeVaFWCrjYd1EHWyld0nU7_o7HsR2whFwdWT0wIucN0l-yiQrvw98M48HEehKjjNqRZzM9JLzYIvzbB7xjQva-2Vgn_wBQdDB7sZGfn93b7vX4S3baqUPgqKJM9--ebK5v0YCBjXsr8X0e3bOBrB8RgVOogLWkjgzSHF6Uzen0sRiMX2we297Z_uvGsg1DWJcqxy1RYSds7XOd6c1regF-AJnLYJD3Fh_X3NaKb2SQIRQWBkU_jBvMSLYa7lut9Pb3siJs-yCteU3RKEoZ6e7v-jtdOoJvY297QXNr8BgPWPR6-30axNrC5okYs1zfrdHDsLYj-uYPBLQs1ZGYiq2uyGh5r1Oa-z5Y8Z_snvuqfGQUxifSdq-GvM-HZt91D3gBNrGY9nGZbbC-fY6gJuwZeYkBvGKQg_8hlsnTpqHbhWEmLU8EDZdb4tERCyoaIYp-Vk8ncayZCTrEr1jnJ_dr_CPYLkd3tI34qAaprNfd-917x3s7x0QxrNhUrp67-4NLQp2E4RRoPYe_1B7-NlTBQko9NBZZHUMeUs_JLjxf22ve3BAOK1qUtqiigquqBgCB-L0I9bYv3ZaaMp63vqEV6hgsbie8WganZ3rMeeHrnsaQCVcAx0DK10a1ylBxGkNVroH99Qpd-pUYKV7sM8J1OdT6XOZTbBy7q107Okt_aL07t5tHb45hz7Z7t32yc05jMb_ImtvR-aEJ7QGr1X0wUKiD1ahRThuYtZqNUtkRFt3sRV6-y2E46zvNgKoEj54t_W2bwMfpW3wO46GWbYK1VWO07U5TJbLOtWxChOcIIk2-EhWOxYeFf5rr8QlmD1WbwgjfFvZMHdvy3Ll0Lp_ewk-Vsob8u9wzrCS4WntX07Lcp0t519roygxRruSjebTycuSg53akESV1NUvF2Jn5_pCdFYXonsrPilXF0EwSGwsDI-NqOllB2Ym-JZVndyPSfSt0fve3ajqF-X1vexu0DNK6OvyXcGmlggCcbGMBvEQjs-tVtXe6Hp7pch8e7Pl3PxfWucXzeeKW-XsVj0po0FlquiDS8fhhQYLWTRYSA_B6P5jA0VHxznxCdqrlYdE_R9iycp87dU_B24Z3Mx_3oJAa3Aip8RroUXBbdVxQY0HZC_wVeYKSmRD99ZrMbXL0CXlIvzfJMW14ytiTpiir7kiNKZZrWEPMuRYl-APqZEPiv2t5mRn1ZpoVgZbrT47L65MrbeSk5vn47pgWrDespJKPRPnK8LJM8EGQVSpVYpKEo3cchuzdqNfo-MspFkmyGSw_IYsYgNN1szNINZ5tsTOjpTYPbAlRiixs1OW2DPVH3RtiQlK7HW4BLE07KFf15pw8jYn3zjxPNXgQInLHHXXjGOBqW6nVp1EYyFBuZ7WkbS9erNTd5NkH1PDvWs5PZOzfy1nx-Qc1HPGVW09Nsw3c3omp3stZ8fkNKYkd23ydjN53yTXR7yWurbh3WaybXWvmWzrvtdMtnU3RhyXdR80k03d3U4z2dTd7TaTTd3dXnP8pu7udjPZ1r3TTLZ17zaTbd17K3XvmfTGMCe1deruX8uxLR9cyzGN9xrjHdW-6XWv5dhvGqOe1b_ZvpZTbiKSYXgTQddi9-hmb3fPxB2xN3-wxch1zvKT82j0VbCR70CyvmkHifMJMQMZuICabOYmm12IawgiR5jtGdwMT_RLVHkcJ1F2tcZOna7gH_qgjIXteBbtktBHeJdFO8h4HSBF6j18dQgflgfFK6wJjqNEVDFO6tQ4AyKVtG-zzc21B50-ZHirT7OIrGgBf23EUGBs4ERhsRmweg-xokQoLO5C86-opPmmPD5cNpuuNFu2-De-xSGteUXyS-WHbh8zvVMJTROG-4Id26swkm7SCjIl4B3ydReGmSbhEzGOGDBrGawsQYY5UlHj0uAAMs-gsCMGIIXapC-KDF1JtAl1pDp8yW1HDUYLFJyVfjilxXH_qxmZLxGwX6ZkQNRk2CA0Df7pr6oh-lVWU6Nd1-uZ3D6kpDEEdzV2C40qcBwxVFCBfvEg6a_ADPSjovyRp4PuxkZ8n7aaxPe5RbkivkAN5Upvk8E4F7svVBlx4G53N2K2je1tb0iDSys6xyT6bnNbO6LKSVrdv9_a9k2tdXe5tW5v4Zbt3d769oG0vm9a7_391nduav2eNL7fbPy_duYvWrReacz4SIuIKMZqpfgv1EqMujyo1GKrV45awU226bhSZVDRbre7A9f1eFOUUOq2r4j37SygjaOWbyrAyqp4IWq6_n8bJjMxfAjq5pHp7yOtx_kavuruwUdvdFrFjYognqqIQ9jbHTO-aefJrgNrQLtiWrNZEEbmY-HWXrBT57ENq8j-rfcJWqCb8VocYRKG8vK1B2O5vOnBdokbDRakKdHbdzNek_1r1Rdl9b1m9TuN6qvGtoeQQjwEVAQwbQ-9u5X0ggI7zb7uNvu6V-_rvVv62iq2unqPe8xMym1d_tszkmwG-32ZTWZ__rLVG1leJriG3hJOI8o5jiwJB-X0iCL6c5Z7CoXCfrSUkF5JMC9FET9TNcGEShpFLpL5oSD8DhdVMekFiTnBNTAHuQxj8VuOI5KLhWU0nGGQUA_Qi-JXhrZ5o5n3qvbyYRm4X4LiV9uIt7Hxpf3pk86fpeMZzIKrV0EhhPOLy8Se32wjwqP7BXGXWR_jeOEXe3jY_6KKPwPnTqYnjirqEeMRpAzBD0KcbrbRbXApH-XLmWJlPWL-EB_yggNO0koV8eQK4Se7y9U4TxKAm-OgQJb_NyKp4ED4DNFLDtkZnlpDMM1onSO3mdArHMakESJ6yjZTzoCnfIToTrD4R437ERDfSTeMzVTlawkY_7UWefVQhNeTejBWljwJveC88cYGQi3ysW1JcMuYq6xpqe7fcFOEhRBHx6quQfHnEOIqfoPUdL4cDiXSEOb49dNaWNhSbULIGk6apeuW1YCwX1YLN-NAAQQGCehznV0Gb1K2WrF53QTNvzG8fRUm2sbk9eqRb9jpjTWPYS4-iax64hOo1wY2rLk669K7X85gE4f2weVYV-zp5vm1491VkCS4OydhD7Ezb8jF52UB6P64UBQ2o7XxTRZFt-mrwp6WJwJdNPF8J4y99mbASUO48rk2NzOJgVaNhVM3BCpbjQWEs_yw6blFFZVHAvv75Z2CiQm91jje7ttj1jI3xXs-esCxSBtXF5ZY70wkD6J7Ix1fQCsJWeaQQyHTHMjxcpz0qcJ6azX_kqeJD3seO4AuK57QHD_neyoQtxWB9kM5xyG9XVW_PCnNfThyC-ebFd83BEsKb17pG1e46PCRWz747ssLIveYu2yyMrwyTU5ZUjWubjNT12VQqeKP8S-HZB4wdqIVOazo_KAMKRL-2y_-IGLhVo17Xu2ypJBqjm9TUdFcFe8kGgrvj2bjS8E6Vq8O53esBM50MkKhGccRgqxtkaoZrXsGMC0Y45jFA65VzZQaLsb5aYLqVjIsA2iKG2-_6MFhqPdXHwovtBNkfyAOQvarPejxepTF50U7z0bK-Qf8evdMEbfYIfKOsCYeoklRzm5ASbjQYDso9jgve-YWu5DJwjYOUatiX84XugWx-faYteSFtLXG-bu4OKVMHN79QDUelOG7cHz_DdZ2y_3ohsFR6HkL9-NRG89bnrdFrdvIDaHjcXDH4l5QHOCVT3NRBxNdJpwlRB_79m2WG8vvICFKRViO52uQkEgYDYNB9ovKfhnSe6wSAqDsKe654Rjo8yQCtfyFdrstXfT4gpvU5XegpIRJVgZQkjiyyexaVLK2BBj3Vu8qncjlP2FZwNcc2sggANyCm8gZlrV0xCs2dlTWjscIK8xtLKnfI5VMTL8HyVglF3YQfDYyOeGonCcBNn8ycSXWanJcRiNOTrnYFRe7CtYRYtm5iPP4eMrXdtr4JW1Oi3EQ-DUuPEZ1F_SFWif8cmar6ycjNzkVeOOgtCrhOMzJGQeYJjKXHJunfpG4JizMwEGcg9N4rGm9JpnWP7QzZEySnKMoLfdK2fw0vaSyOH12Vi_bkbJlkBmn6rUcsXME9SanHGQ5uaJRyGf0gtmpTY0M4pK7_9V2f5C8VslTO8UPg-zUnZfRt7kXl1TlU9d-J92f1LyjdyRudxXYGxtUJY_5wME6PnfN9x3-nhfpYdtEl4bGoJoMZ0IDzR36uj5FzvF0lslA6cMyjHRjZiTwzsAhvoE-SWguTVSK5huCLdCbBOKgeUZDyWPE634UHBMXciwnTh-1ofUJNnEyFE-OekRpb6LjYLPHh8CPJeU1kRENH0-cSuVnOQCcvMEB4GM-nDlNaT7XVo8Bq4QDkyZvqvB44DoKuXHquWCeRm5ojv6q5EWQvXDNqd_kDZHQU0r8Ur8c1IYFMCFSyxN0yZfytJ-HI3zJ9-pE8VHHnjqWp8Icp8axp-VnlTwK6g4KBn0ddZwy8oR0qMUBYuEKz-ddbC0-boFaEn55Bo_ot_a4S_JJwlEkbwkHwCu15XxyWskdAOMdycrGgJnNKlRo8raKUksy5PYeQq_gwumaWyNX47ZaybNmukqeYBjsup-CJX7FnsMiLfDUv5QY_-9cx7ogb-Jhcwd_9u2r_Z-jtgad7j6igIHTd_XdoOt9TJ6s-j7RpqFp2ejuPnigt3a8hoaAGv2G4yfJj2Aej_3krTrVtDOOdVT4uGuAcl4Fc9akEODl_nyQvB36yY9l7QTtfAnU-bNKfipR528q-cPu63eE9lXyO4PItwGgwCPY_6XE7MmvVUBleFYRp6iJlFDjaltvU9EXzDBQTexdbQ_lEmodELa0NSKa4a91KKkV4xLsZAcWKVyRxRNmc_Q9N_lmjx0luB8tU-ZqMAHSB8fYg4SUy9iLLr551S4ngm9SeueKDO2cy2Hz8-hqmkZjxOJLOOpk8gdixn3jYPLLfhLbwwhzwvaFiGbltXqZm8upjddFmhGmBtA8LfSZ-4Qw10qWBHMxuYDyhE9KEmgzDDchtHYzRbd3sNd0ZG-WJd57_JqxZU85HYcBBoEFfyCqHI2jDCUq00RU7pgRGK4ndRM-ocbXi5SL4Bk3v5X-53ZoShOL8Ja_vlb7uq09tFFDPL5ohenPu8CIY3OcQmbUd1vlLIcgPmutTGMCIRxUNCCXIo4ysjOjKhrpk3KhcEyoTfuON7PlVt11BO1cLDh0J0kKb-VKVuKvBUbiEjrSJQmMfNUkR5QErxB7hbl4gCoooQqnm8uvkldLEvRLJSRn4suNDfupxyCqUpp4hu-0glaiYBU5q-oQsOX2jSMi9scTN8UFiP1ViK8qZsDOGbC7ssBOER2b7pidUqIRFeGDlIj7Ty4XUykHNF4uLXsNXoBpLhXg8PdEl1_xMm_2dnGqoM4r2AD9AZDGZlfv9PU7ai-sNViJnlC8IVRU0uwRDqMlP9ol9uO6atuZe1lO_I8lAUjFiOBMVp0BkchJt3xMlPBHFcwKJ9EqfqTWoADCkuNG2qsmwPLZF6KaYBA1X70ld1OwMw8z5-9V8qFExn-q5N8WGXcC4Jt5YQ6TZUG3Ok4mCisiqBzxOAm6nWVNMo6EIhZhEvlJ4TX3l8VLcDeIichKEPsbt6BWqCPxk8yTrUjz3MpqZyMkEESBo7smtGgedv3EhijsT3H4w5zohe0IZznWZ4vFDDpUvh8Hl_vgrAoCwNFym61nrZ7wr3bjoH4pCTqLL7KtHnRn5vaUwupP5s0bTuLbEQeCqzEAj3AtDE0-SRM34RGSceYZkIgEGcxK1LFYjKorWaguc4XBVzc7dhGRyVMj-Bt6S-G28o2Nb65uOc3ICdHo2yzOjAuW595pOdk3IO5u7a7ZOQH5CAFZ-LZ3AwCIJttYcz6-RAXyoDBJeWCi4xPGi6Dtstcos2ieg-GWNTPX2uR84xBhm-QDWxr4AgI3DSAOHmKjQE2V8ookBBZUJxzWVpQeHLGZlQPl7YgyMUlH1J6_u10l97dkJkJzXt01taafuxatyGcTjXMTtA_OdHGajo1WKQqdly9ev3F855fHbxzFjAgCoG_yEyXQlBK3H0fT3HfiZDSdQcY6g9bbGaUZiQ6EPcY6I47I4ROVSbEJdzsc49bfi63zaRQnzlJBWkCsOb582ARceICwK7a_chqHel27r4KA4pwkXo0IDDIIQgtUK4ECIqOX-q_LiDDb51dyZhQmc1xxsTaJ4qlGrIe1qCjgSoTo4q3ucmsbt18YIDt23W4r8-72OlZgS7EmTWbSth3VfPFxtVSjS7RzU8tmhcQEEMqo1Hi0Kd3U8w_7jfvAp0QM_o0AwDTsKRilfu7y5RdJdBGfRLRxCIMk458YaqGGo279NE2P7R3W4SDms90W49YmHAeCv7mOfLqGWsx80P4Ag9sLBo5IRgoinINTzyI4QCEiwTsgru3wIbuE2KCRjfTj0OrHEw7e46yEdCOxz4RBcswxasWULOWAPfZGFpXslbXinE31GRef4LAuSu1KqR37IaTVDFGgDMGmIttWHa6S_eYd3SCWZXgdQyrBXm2r8tYFjsmXPOKLWCQKDdrLhlgIXXK85tIpVucbnQmx6CDHVRAL_ZsJL7iNBuTeX3MriWcu0PTUyrWOxt8vCoRJjIMswscRb5E4lBuIuWgVsE1iddg3anc1FBznN5M2Nn6gCp5ClZURfcxlccQ0xNT2gznjxBgsnUJwdQmxXQSI1IDD6HzhE3gV0F97lLgky0qzXzzPC7Olv7n2Gutyts1FlLLJ4nLd0jJ08D3qiVZy6i-zEnXHz2C_4fsXbcjp4qS2soQeidzx3b8FRxRi3CtXpwaFEVyhQpGhxzAA_q6BXvv21nraQTlgo7CqWekybWjKmQVm-yddc6Hz-rrLxfNqbPUVlfXsJwiE0Ra4Kp0viL4CtAD0Gxspl2A8KwVw_sWuLVN4In7_IXzgRvWQfZQit_-hdt4rBKMscggjkM1oHgcA7UgJnvXHNp7XsnEWYT15Xtm6BrjokXYmrkmpzmUdu9JbzzIfvGUgnFZ1mxBgrFDkwktz2cFMYA12k5k7VSN3hmXg7s34MpalCEVVj3VVq8QHUxKBx3mesrcWvFRhx3VaxaxdXjTh5h4PDJdyltt2XpPVATy8YOAXxxxKzgSag54kbK8kUTVhxe-zIQ-h38vrNdBddPaJOyvjtrNgng-yIe4ZgJRVdoREfZzCaV5BslQMbxLSiseISF__FxhP_gaMJ0ayVyZKPoNzHdCvwy2hNYFSXDxZA1AlsFKLHS0xAC35JlpzyHo3ToUbm3FWKwOu2TOlBEMSdMbc-LYaLa8erq8MqleL26esHq7UpLHySzRp5VljWNfmBpiSsNwANXAtb0wwpgx_tpSQF7S-kQDrskatAztixrqGQhI-FjzFEcBsYlLmK74vBJG-oBe3qbjOhDcbbmwe4sLNSWDPo4c_u3V8U4digMesjITGodL-HjDXYRk-dNhNgphoTfwKsKM6zCLk4zt3ompEla-fDma4edsqNXHlt0FyEjQkxn0oeslXElwH8aUaifHRXOnJFFjmYsczzCcJrVnLJWIYK4ZILwxBV4gql8zTn65bmxi9bEKy1A4H_x9ii6T9W0a0Yw0NC2ZVktcvwvrQiZoXagRihbUhsEgObPyV7PfKLjoYmrPRNsTRTUStjKAZmkCcuDQ8MxybBOlqOZ9KvVktqqaPELAIvIw19Gl_veYZX9MIm8JbSypEgPw8sAIkX_gZ2U7G1lnyBgQS34RABOi0RGZBltVRrmCWGCFlacPRdO4bmYJH6c8l_ChUAkvOLCYu7tcVvoBlcNqVZ-e-3AXLz5usdPUaEQqjvwPapUCXQDUxLSW9-WSKcIXM0nAa7j7t1GqPrcDHN5YH9QuHsDzt6Px8esXxaR5_LxDVmGgPx8yuximTL-OskR0bWcwo6tR6VHmes2U69oxMN69YTMI4cjF1eSd2pXDNRnLZcGKv04Y5Z5U7zcUqHVfBEwtI_EafNHUhI8icsKoGpvNxzfeTuQnQlDImbLZYFA-6uxCKjCKE5iiuMTwlOsjc-hV6cXWznuL401WVFrsQ7E2hSa0NCJ47tf4BchiO_CmHBnqJbeGX3Z26qVhK60PK9AmieWe8aPyBbJfqPpnqdkK54zZh3-gyCAE70zCkgljLayk6xEFk45YNpmo2DBAAigCbpiRHvC9fnrw6m0DC3foP4hBi3GJW1Q8eaJDKBfEJrtS2hhlCcCpfwmJzr7qVKdI19T6wCytkcs1eiy-Oc44xXPHacxHiiKjFeVUyOfEzEsBXg7n7hYprtb0C-cVO4kut7g0Jn9sA6vOiDKA0aHd2VbtL_-inp9rbqr2j2vS8p9r3diskXbsENGGOHIpzEk1sJEAJT8pxyMJ2FakJwcrLZDmSSiQfyCZOSOrO9Bg3anzgUG0foCKpe5YRBnhPDE4HlxGfu8WP9g0RoEBroxOC2QJj5Pvs5R4lWs1g_CCgQSwW0Dee3ycMeT0S-1YPduv2cVoU6dkDaMVg954GHFRuGo4kigefM5-p9dQeQiNuTWp5QzJ6P6nuaijtKlkwL4-BE8tibzA6er11MivLKVzXVM89PrpsHR03ioBJho9xvdhl-244aK-Hw5Z7lHO8wOqDpdfmWtGHNoR1AhIchQ729M5dSuLMrd72vjDvCGGL-LJPiEkS49VNi1jgkiCnluSoD7ctublUQXQYVbqDve8XfGkrolJy_P0iBmXHJeJ8HMCPzhBat6rLnyloQXx2b4i-UCc-EGWRSyugT0trM85CXCq3AgjFa9-KRTKx-s8zPQXzyPmgSSWJVuOZhDH1J6s9An1AbESX9miujDMaMZhQ_kNwaaeyj2mg2P5RVrvdNMgOYYbOtE769TvY5kv2F5WLBDJ7cUCh0gzdkY4ky0ATh5LdL8CZhO0oIVk9DLPDdq0UrvU2O3bzADq4eLGQXwA0GxACQvQQh-dCfqHd87P7O_ud0DlLj-Mp7lW5H3Q7vZ0QSv8px6Id6_wrbSJHSef9-fg886lpqeNl_F1PGeGoa0OYRsk4H0XUSMTTweEQGfBKIMH9ZZ-iExqDo06j_E06I_pQ6czOou-c9BIuCPmDDt939hDFa4XKNAYu_2tYLSX14GQGHxEIjdUXZbK9e640ym9yuELqXkxcW_m5z_wVQAoqZ5gEz2nTEzrzWdcJBytCadiqPtSSngD2D1wkOo-jJPIJg0_b8HTGdjSibnnn-vgFx8LLKQWf_UmfKbn8wS8dpD0b1gCVyo6BdRtbI2OOS0WJCZn6kG_82WYXP45V6JzCHdgT_ZbzD2c9oN_1rM1GG_HEcr5EF1HOHmCIfBlFhrffZuofFIil6hzPCFMmXFEhlyG5r3D11kNHOT-9ffPmxXOH9qfz9PnLt2-4DxsblL_DcRglNrmtQjn57PgsLlC-EBewKLaevZeWzbrsmythXb5UNZAD4RqeV5lHiyAywD0iD3CKpPkjSYOenUZ4QceoqZjll3woSdkGdzggyoJof0Om9rwrL3Dsff7N_YwjrScc8r5yQIHCAgfCGPPpbM25Mzc1LB1IyTChcSGE5C1YdjYHIKIE4ZrkdGw6Mfz-GtHQM-yR9ueSXazdhMcRqoVlrClDP_RjYG0SqYIH4gvpJrh9rC3XM89N3_xLNUtolrGox5rdkYrgveEYpxgkgU-ONqbB_BYmeV7JLfBW_uSCXS15fdx3BunsgrokXM370jcYJMUdmJszXbCgbTjYZwjWAeGS1vw933YQfOD7fEqvGzhmlLKJb652hKauIJCFt3fAd9Wu4z5dWiREqkak_-a1q7TANKNLYiASklrugT8bBcmBeZyIb7MEr3uvzqtuG9dfiT9l3e3d7FCZRVZG3XFZ3QsM_zRGFo6Zd7jg8ESJ4DWqiSozDr0ummcxw1tPjtrLgy4M79rKeNrKeDix3IErgq7JeGUB6wfNhfo6sDfxbX0czAfDrYYbcuH5tJOIQgkX_b5vJCfiBL4ZpxPxBZYYz571GqhuDeVPIr4J20S_DWgbctBQflN8i1QZajev9JTRy5pLPpW2gURpVOZRva8Kv6oVToIP9azf6679hDJUuYjnJJ_8xO7w0Q8M44Pv5uXxgfdepVhEyNi5CUO4JwOXL-Cl5HMd4eYuPb0ziX7B96UfdHxx6F13JxsbEyv7XITjVtefWN6tg217SrtsbgIjEtyd9sf3bYH-2MZKOgkmg_GwfwKusyGZZ2F4IpK57PPylnQuz1o9x2AQB0IUoLmAddMb8dUhblab-J-RXpk-TokdpGevVuKdlMhrJfJmiZ_YKAmdKZFQc-NSLfuHy_GEA3MeoK0tLkE9s3OsEvvZufWseIyr7T3RLEdqAO_oWO4VDWkdFI23Ko2wJXuMWuz1v3WIQOeokX4tMM57e-YSfjgI946jsyD351kKJeIjmT4ISCTxvfck0AmiCc9cx4Qc2azmWDmHaTRGNPkSTfqOiipNXm9IA4KyyYz0EmYx4kKTaLqp5eYJvrPY4CCSp8xSVWJ9wraZpfr0Kc7fGFz-gXDk6u3PlzRH9u5nQuk_u5VxvBC1EfxhxPkER7js2c_iq1VLCjQY30Mnt7w6VLBvlTFIQCRXNxb5VCti9H2_LtlVzxNtcH-6quUJ4tUUks-J63trGTgSGYkxuvRWkkECFF9EntcVLZeQ2COXZZlLo8aPnrEoMy8XCDpFj7UuitWudiwcHZ8H4kx5TR0TQJ3VQEvxybokplV8QepMZZQH5YyI46rUw0xgpjOHvipvm5pfVjpb3ltszslNY4MIfhsaCgMiaPWitaWJctGOcyv0Qj_Wyim3vfJtoibQPs2Hn9gXmJLMteJgEqlfMzgv06yNzO_E_I6DrooueKjRCJ4f0bmKTo3bTXRSU11QeZJFZnx9HD-OmJfixwlMo_zIFY1LFYLmgO_E9OOKM7CxfiYhX4x3OSfZKDDYMOL_xcnytYrKcM65H3ESD-iKdQAqOpO-X3Hfj1V0afv-tbpOlnV60VOWE40cyC7ZER_PUtHrUgf8WtMeelo5vNNqmMs485-u3sgNiYQg-JZO8Mt8x0J1Js0Fm_IBRyZ45_FBVCcajx0h2R4YYwRJx1VBjvjf4HTCOTA_m-I1zjGE84jVOQTCvjnaZL0GaxFNHptIPbph0ZklcZFzM22pRDHCaTYpRiAJK8MflKZk85FNf0ACIr707ZfL8hCYMKxv-EYAsA9GB2Y8XYnobrvFdwWvCYmST5P13dwEU2qQ-M6WkbicqOh5WReuuZD7TNfXo--mqkyO67hPA1u1qj1Dm_QNOsmnNQXV07Lyp56NCY-OvKguYrQXvOFCvPJCN_nIdx8iTKC8oP4n7kNBMqtfLMFTR1-q2xDmZeRVy86zgbpUVpYh243XrhkE-19K-KXvLI4Yve17TGhSDYwnAsuXE0ecmYvo4UtwTe22zuBYphP1O0sLkE-ihTui_ikzRczFpQgFs1EyNhMvMXrOFnE7HazUtibUMnV1dgoUmLJZIKrryUZuatE2f0Js5J8uc4-rWsOu38N6mUrtwsSN6tX6esGO1phq4W5JACD5WEckfzzhDUfPjtefcbdt2zMxDsV10pJyY2DrHdtG2SjoCeGRlBfO3DUyw10TWFwO7sZtQjx64ybK2cK1xyNzkhUgCg9L4jDCebmQMJLgG7_8YmlBSkWPSh1y_1kwT6zx1O_W1A6532N7OzFl8Sj3d9RZlH3lu_b8_aUyuk8E8hdOeG4s8D7TSXAnohzz50zIHqXp11gfp_DVTafTyj_1V1phZFnpQgo-ksoCd_CxX13LTlugW8qDtXvA3UG0-QOXsbhFNtOLSUTcmrnRQRTNroMMYE6om7NF8IyvjCByjDtk1FzuYMwedAkqOpVdOQPXZNwXo2fBgFdvJDcDOEo4UMKRxpAihADqqMyNXiug5OiSqUBXb3uVZ7HSN9PkOv8gj6sU2VCDr7hCytDjxeJrKNJlzAq7LLA5vvu1lkHim9jTv9ZsjmKNw-Y2Gs7SnuJ-5aPb5mOaCI_ZIuvLCbEw-b3sODvzlv1-irARztJe7kXTLG4D10vT00phc_01rVLyy199YHidRr0Nxul61WFYL9vgTKsyBNDHOfW4xqDeWKttH5o5674DYhjzHTPWapbdw2HHCPEhUvFfaENvRghQXMnnxssgtVfC5orvi53yPbKNb1qENeDL_DUwWk6BkMpiynoTy0_6rC-g3vLxFfqcmjiPilO_rBNvrH8gpriWjDeLntU4PYviBOxts3OoWOJeYwLwhvMHJqWglKZCvtR9Eydlr9WBq03HbMev7Umc5QWOc33wbCp-Cs6ExpeQzsvoRCP_RriowM4sTKtVLK1DSfa2OZUSMO6JO3Bk-uGzqMfx7AxsEk1lFJ9AnYjjaUgRHI1DgIbn-9qeFTheO196JDMGs8Fnev8ErdHnIXtXe2qdChnVMMxLuC3-NaGD8-oyU6b5tXdmB-V8OHGD9IHrVBU4ojD5ShhPrt2FL5h9fpTOiDxeaw-3WMstX1tHn3D90CYiWqjX9qiXrZ6x4rXu0vCqAoZbGGGzRXm5VUdEzverE39WVPF41bAiwYinQ6HfdcMIp-MMzF-JMRX7I21fa0fMNujFOnVjJM1a2vPKFArmDP0jC8tFRCVpGhqoEc6ZlsesY0L3q6f-u_HnqzH-VGB-ZrTnhEVxoMlqm17zyQSODg4DO5P60CXRiKC61SLJxsfLe0hQuBN92ThzeZ6egxjbA6avAwfHPDYJfC6jjNBT7HrivTJwQI6ZIWfq6AxVJWidxvC3vxroVuDwMVtn2C_ThtXJYuPj4Jo8MMSvawCB1pi_cWGKb6g9fGKwoztuZrQvULXAlgJUExrMNU1PcH2pTfarEku_KpLOCsLdiubGanlBateJ9hUSu6IY8w88qwBrX0thWnQdhlZbbqhGrmUqIvFCuOGYpmUIzac-JI46g2y5NpMuPLxcAMRJLJQs4QE8Z7M6GCtx0mCnkkwzR84ORi6LQDEBR3itVfbLrQSO5MYumELCIidVb5jzg1WPuUYtD6aP_A3rVBPpqxpFuLy8jR8ujAfFDDOlCuOMZH5a-lao5G4nbXnjSBSwAUP6sIKThf15fQnhi1CNhU2eWcQGHVTP_ucrIIVt8w08sZtgzT54fvQHvxK4uzVfxfUy1sOwb2OiKQmbT8K33YclIuHjRK_NvWgPiSf9PAASH36uwnNEVk297YIDK8OtxBwtlOXirAtJw-sTG5hxIXNMIPvDNVnKWeBULr-wyFxFbYPclt9Prf42t_rbaZAOctbHOg7JWVPrX0tInLD1NNzs-uX5Wz12px5OBePoLT6Z3UcAtPI-pFkjKH5HxDnX5gfEA8f5c5LBZrir8ePAORrMh1tyS-O0GvEIgd9WulpkV_NpUDMDjFrcbxPceTliTpKWfDmTeKiDGcKkTAM8GF_fKe1WeiiM4BSLnEe7wv_ASarcQtHSuodPgqidEKY36pPX8fGUGIS-8-6nV5ieCFANbQrx3-gYFXmejllegKLh0Wk8HUuk4AmQWIGAX-18FJFcZ80LyiRUYIpwIoC89yVuqZHnVdyCEzeEuzM1cAgpEVArKzVQf2f0Fs2-SwY87Go3yHIEJDaFkBhfmDPfFf7uR5EYL1Oiz3CyhpTuPH_4R2meVRAJxbTKDVzzrJBUXCgH88-pyxfK1fAMazt2zEnf5kewz0IULlsQqX61BSPrSwvXqr-hdvMBCJ7xiJmqWRB9cVPY2KI3COGPYa3nZvWBKjnY0QcvnBs3kFStOoIsJZ4KytYmMwxZyHaePvulnDQxAaaEXoK5Fpjy5waGfG2hybiOsPW7iIuphqVZXqMpm5115cRjXXgQIlIObbkd1e10St0HQdF7z__AYEVdnF1zW6HEER_wihLcK8nzMg5SjncCWgm0UHK1Jk3NmUO_sOLEuXVjPmWBImX2F8dK2dLDnwUr1WxspKVsUM-zacjPdZSNTuu5ksLqJecfmNeUJQmr-5O3Ro8jHExgJr8tBnzWkdS8OIgpPk2zT_VdJkm-1IYJmiy9hpH7JKDPV2QgrqxeCzOE41Amwz9VlmX0x6XAszKLS9rf0wkhpJs6wEi6vrt5THxhLq_ZVWCm_SwgNvWKy59582jqnlTqfzZuYfgnzQEdBxAgV46iW7WH03agvqiBWFdJqN71MzkDUvxoX7_OsLYo1C2iji0ncFrHLQlb17iP98q78ci3OVOemSPfL9k3zB7X3NioEYQq2cM-5xN4xP8HwbFZ7hOEJPIkdkjWiBdCT7Nz56YIK43gIaVYNodmxYzpammd85cWvO4HXaPMtClwIBgV2fR3fYVHjpFjnmk_8xPt7tQefXPgWmi0XszNuo0l9NQJ7lidBO-VXUifxP-G4Gm6B6b1hCSVuAhOSoFFNWtrgsFl0KAHZsTr6-6UkGD0sETizL-JWhLPDhtB16ftuNBnbArGQ6B7FdYXdhFePSD2KnqMn757uVhEnlmiy7Dck6j0k_B7JHIA_vHncun5VRELPJ8M5TPbFAawflZKizCisHnT9uFnk4GeXEtk6ycTXRMpZpXgwk8gyA5IkurjHA2A80z8WOp5nurtdrwmTJv63FqQ2wO-1C_bl4PUSfvqAcHMlbV1EuO3nhGDOB3D01PyWr0Ox9Ll5OCDcDYOXqBdXM8kqNDmWTweE9kYgi-hD9u7HDOumVd-XU-tV6KTcVXDwUGtCs5pfo-k8uCqZa_KtSonk3_Zc6_0EgO31U_r-mvcZi9mTBGtAGCyDj7zbE2m3ZXb6aJPMKHbM5cMoQawjUWKI6Vy7TfCmLFWmcJwkywCAlIBWf4KJ6LUDZ9Cdixjuv4GW7xbbybNxjpj6Mza_Ly07J1nBgjNzHWx0Z7hkGuYzbXKpbudxENcTR2WxnxzvNJc464cjzp9qkdfj9PvbNZjuhEiHh4l6nHoXOncwYFrpzwPRfJMdRQ9SCCqnPGZUBucIuvRMuNiZfHQIwaR-axPHL9zyibNuB3TOhGvMmL1b1HQ1212tcQJsG3CxHG1I7LqunRq3EwfWnWUiO-2PaTJRbeecEYxlExnzCdRi-NSr1gzxHZUZb7tqEmsp2O59LCpiEn-jiImMYoYNsyvsFNLzx6i5HFxZAOEvQ16fLDBRmIeBxwvnnIWi_Wp63nqBtV4ouT4ZM3wPCbsspkNdtjoTl8HXXiKZee1ON4JpsO4KMrkRuBxY_PBtpoZ5_Bb1-YBrilB2R6V9XCFDYHqPcJoaDQY0Jhp2TqKO6O6tRNRtKKIBEGsJvGohASuS77iYKlePz58_OiNevP4_ZuHrx4_dLz6ScB1zXSP4OmUsJJOKoD15teS-MSb4SHF4ZvlBQCkHIYT24V9CpKXmOzZoDOEfi-wG6VOBGE5ZiY3CricAMsgwdXf7FrLIJYIUCZqGh3DpANlAz_mEvunxqKHpr6tj7gIvH03xIXgR3dD-nsHCtM7Xce7HVZrR7RI-DahtR01iB4N4XVA1K7ey0h8QoNIzTh8Ep_3wC1oitZthkhc7B4rHtUJxx7jA2QFa0rZSpTBSTba2Biw43DEAXuAASDkiEPJvEQDAw6iq6JhgGgVm25O_4LogjmtGb1PNyGFA1Dga04AT73uu_wTYLeB1xkJRYun0xfAj-A0BrvDVktJIoCT8kdplskJEdpajVeY1xB41hYnyhQJ9LIGSCaGzwxJFBpaprx4gtQAUJPxjEGj1K7WoBWk9F4uQyuYKb2SrZvZMkHLpb1uWKL9EnwW8AEZSIQ7qCPlCVpHYp6E0xxWrtzCeRHZde0zuyzLQTlV1lLhcDu_ysy7n_Idv7O_wwHNbuCAJDiW1WqycfS6StOG-xBfrNvMjNdcrtjISATQUJjCVLQaesvExBC2aB38c064sAiKKeixVb0hLOHQmMSMXbUgPiJNv1JXi5XoA15la-Uj26aQTawOrNkR1YlCjec082FN0BGOiMnRPurOylHvwc3zsOSjtgOcj-TAeLiWwWgvVzgbc4vVL3zi2V4FYZrGRPdxkZmNIBBjeqpseD_2Ef6pPL4dt23MJnG3NmFDaCN7nluybmUFTeM6y_GG8CPCCPtxzYJkMAVWRECoKiITyfXE5T2x72HY1dtL1rCUJ8mhd_oVwu0TwLPrWSM9DUG-5suQYHDJ4VPBwRRMd1kbpWHumJWxm1ZaVKOaEdyyZiWPBsXakvDa2ypsK_4FgfFbbsP_HRvGXlJa3gIHVzRCk3q4bs9b0976FERvXSMFqegOv1kzA1KecErDpRjJLznZ-A0j4RsnWCUkUn5wSukMiKRXSPpAaADelkj4mcuw1Kiin_jFOrci5TdOERaUXv_gVygc8fZO3uRbjhF4w813RDx-kREa2Pf6t3qaO-Kl8SVvSziVec3N85oLKKMAVtO7Ucz8PqDwf7a2_rEmuiRiA89p-t--Ogz4foj2WZygbmJx_-f_AVGMl00rzwAA",
        br: "GyrPUVT1jhBR1JBWS5mAngq0McKjF8XaTqWmR7tLRkcttk7MSi5LuJue4sXUp9snS_Dx_tQ8QuGtvxZvcFLb2OYIjX2Sy_OsyVK2jHfyWSjyWQrjwsJAQTCYD57PtNLTVVTg4g3fpOuHICiFm0PqhWtaLkq5t0zRkfx-X7b0nssJyn7yL6skL8eSi_KyLEkYHhGowUrEklaTGXlQ7L83Z__1G93ZujMzIJPMvnuWHUY44SKXTcfitlMq2fB0eH7vv9O-flcKO7miCImUqjNbShdgvzhjlhQRDyLe9ZvEqjdX__U7EISia500xy2cFKe5DfYNegqebMkHh3zINtihtrJsvt6S0zgc1hJy6-kYtSUnAQMsYbaqb0iWvpv0SjNxSXPdpfyNZTzCR6lKjINN1ZxWvwYFcjuC5PP1RWlb3zIpDTIhm3cK5QOhr0nMt6Z_Opc10WxTQMtSCU-A-5wy_X9K7Vt7NUSDdiJbvpGeuv9dJ7g0HzRO2fx9qZbeW4NJG0K-uXzzbW8iNU7hcPblxH7v_f-H_3c3hv27gWV3A1w1ALIGTCuCpCrP7wZnqwFqyyBXdmGoDZScKEdp9qKxs9J4pQ0h352vM8757rKuIXa6iFq77xdC2EuWNe7X7vNVTYAAIZB41vX2R5rf28Te7cl9D20oogkhMTj38ZBbPuyUhck4i-06UeXAnziAEAKOgooRAyb02GCNA_a4wRb3uMU1jtjhT3_AF_gGf3mHX_wVL_CVP_s348N9ujmQz0t8eAR49_fVEpc9ajs1-bbdn3nips_Ib7AruVv5kgKQynwG43wIlX-SNYiHywl6AJkBQlcDCTj_RwEIcZHR8lF6AAHmBiirNNi863hL0inup6mVHtAHZCbpgzKTtAGQkc2SWiwEUxNJp_8r6QSC4Xjg4bRttzGTu1kmfVlVmxnINuX25qw55WsGASHCqfB4HsUbcyTbP4ryqpMYOyuG29O2Z08f6ueOIyXz7y5Lgl-3Gb_lUt59WlTFf2mo7B-5fXjQ9-yY2lLBrJ2MwWLneNcsY_Ri5wSowxj88vXNDImqaTp0xyzA5KxsYvn6GkqXsazwafQq8hGtY2YAT02HywQtCTrVvsm1NCJn-qMSoChAvKCohf3QIM5tzqaqfqJCwNE5zDiDM1cDzCULloCdeoXfgsZIFSKZqNwH5PyHoEH2fCUFpA_rvyXlPSWJwgoJz-LR_9bfFKDSAIvv800hOkAh6U_NbOVLgPRTNh8GkXiV_yOLO2nQukeEREiIdBelgHMhpUb1OZVJADH1kGFisdZosHAmhg2WQxYgZ8J9jc92meeDtPqwuRdyBmPCq-6ETl9c9CPfpSuWzeNrtn7fDrcy_fmj9sfBXLsfJ9x6Pc5byLxgTvRfk8v0Z-z3RSSm9aIJTG1PbHctyyzEOh2iYFZ5TixCMKTo9quR9O7To-ZRfs_fjotICTwvLEUKgKl7c63gnUE6YxnQWBkulZJeRtTc6e3V6NCFek8NjvcXBGBoOgMiAfNTKuoRFh2am9-RpJ7KcmVtn2pr138HiBHUsyYnQGZqKxqj-J631qzizdnml2zrV7aD0ljQpYfagOyT6q2kJvItVUznSK-y6ilCAVL0wk6UoS7Z7VgwpiJf-DXBwIS42VaV7Mv_Lhr1SBaAdPFxD0ivJzFKGB1C0RciscLxLWqWPm9pVEXrN81P_Cxsk_Txde3DRtCBCU9t-QGErwtLwa9AvbcbWAMTTYn44hEqUnayatvIPAzclzyaHMBFmC6kml-eKDflav8LJj7un_0suFn1wj-hXp12k60P5w5wwSbbeBJUlvAfyGVfr_3oEguRHrmUCqjqt4BHBf4sZKJcZS5XK11HxIsphgA1gTXIvMnJ_Wx60fY1lLto_jcOoL4AIpVLopTLK1PApeVtc8HfhTYXLCrLbxfhSwLAVfWMHBQfIMJ9RjKIKOquulIfddWEAHe9Lgl5OyMaLyZzZvX8g8Q5dGOLat1fFf9qT2T6giRIE1BhFpgJ98PQNZMQ8ccHu1Rz2vwxI8M8SHQtWt7OzAKIdqLp4xOF0oQfkqV8-3SSB0Im9_QaQBDhqIU7yyM4aZxoRyKOtB2ceKQqQ4313L_2elGQ9fXlII2QHeFJlKrNhdV8I6mGYc0pAC-gLAaikElaKYot4ILenLeQzdxQmOW2T_kJt1GxZhtonkIXZtC3ihTRqBig6YOysCyXAfhQqer6vKAmNtamHBjV4VWOIoLa2gfBOMSmbo0R9K92WnMoPYQmi0rc11WeUYLynApcyU5viynO4kYGmoQoilOKyfmVJIVIJCdWhRxXZYhSQZAI0hplibmSdCQW1pUGbRG92A439-nk3ZdyYtDWLDY_dElaqRgs9P8qrUKoH7hSA4U1UQ-kqfBkI6pM3nWS0T6SqlRxecmqeGWR8FAXB8BHGa5HLFO8FoonjlpyaekUBGjkmhnj0mIiMYA_sYHL1yFWJlA88bmEr-S32Ete6oZL0KqJ2U6gusV1RfEAEiB5IgHpRJVw4rttP1npCfnN9Qs_Wd2G2VnLE3UeanPOs_CoKiIeIJp2CwFM1syRiVAyHCqgP7Be0gO_fG5JAWbUOQKi4gC9vafiQ8iTbWtG73WJTJLNIFmVmL2EaMqg36nRpzrBZV6u5oG0aJHpA6qwmEauMVWXhlp8j172ZmU3LQprBUrTQeckPu8NRavaDDz77qUoGcu5x_IjVEc-zCbLLS54WATvtjhfcu_WS4JeAran6prgiafw0pUSHkDUT-vR8WB_qFCPAKQAvBo3BOTCOjM93yNYuLmJAEHr4RVS8MfR1ggwwwyoPoGd4JbGQ_JM5cSc0LTkZ8kCB67NY9ioxi2UMLHIq7Gm4GzgAtxcCrSTIMWdwlXgl6RQYgBLa93kEENKTZ0gWgwcJObbnfcmw8APADzazoQqWlRbhilYG60Ao5GuEFZgGmlFOPZbdwF2UFZq-y1o8ivFekKRCm4QfZbjSuIViCD3NrUl050xFbAJIlbYy19m5Z5JZr1jHe6jNX6ki05q_Ta6ShUH7spPjJcMOGW_oYoXYdqM_7XcpAuXmYazVQcfWMrgzDJ4YkRFt8moNDqAaJdtKGtMEYltaZDXsGsmK-RdZKr5uJndfAGa5LCLqxcCoUfHeMN6gDXQZo3v7EaUXrTeXG1KUlPPlUOR20OV4VCtfzfELjQk_TWnSc8LhCmLYubBF7pEcN8dsf-kOtzY36mKm3qkdODJ99hWLsmIO6OrUC-Om9ozSZmvAwpBs4jQ7xx2lA9rArTTUYGelyJD8dtyr0bFb4k4eMXU4mi4qofYv-Z4v8FyA1xHa9sIGMaN4eZ-ikDsRcyAq5bNtmTHJPktCbw22eFx411vQ45MbkKC2tRnz5yyBqk7yWQe7ZtVLZycamKlhrHKbxHCxk3U-8S_udURJevWdTEQNFMoD3VAoAxzeDDFcbU8s6CFIPPtdakjFJZDgE2BDnADKNkBrOV4WUXxIJSUljqJJk2ziWYoS_PaVEwlmQwKXiRILh5w7VLQWjUM-N1OnRBksazoj83IuNlR9QQOhkzmhAhYgTkXAux1nPqhzHpqS7pE1xV3nIZiM4Gjt86AtKcCPZqDFYmcAaOCUqfz2EQek8usopEo_TqmPhdF6OC1lUuZyohBDOvK8YXV2DsvlA1T3XAggxLW0p_9cRV5yAKDdARD4mA3o3iGQJtk3lvSgDP-wMVcag0XFym_d2XrsqWQCcONFWMDzsSNvBmUdQePNALVVdKBuJkboIWh3Rf6ZSkjpu6G9G56sNKseNasrGZjhNbm-qA8vI6OZIZbJHfMO9S16PXzu4qVa33yF4gASDXd4MbPkHIogL2E7e1uSncpVBPogLUJjziqC_DNAn5gKsaE5nglOxNSp5bC_7LnERWR2WEab-L_2BvVsHe-G7d01QU1q_w-c2mJTtxXFVsLxZHtBlZg6Iu61TZJ9GM6UW5-nAAWYDeoRi1VxXWGzYzyJZWL-WpHPSnGfizkIwTh5IiHJE5W9033pIs36oPHFJe-u86wByN9sgpeFyspQzHruO-Vq1rc3DRGcIR5JAGtiN8xzUwY5TXTTF8Eu23fbZoJHRAes3MAaLbTsFQd9FUJHw5QgepQxyz1l3WaHAC_lZoGqJguahXMttrfvhPYqBC9FW4n2eYnQOpA2ywgHxGQI-d3x_klImJ26bdkIa9CAhcpgbnGhD4ygMZP9q1Ad3EuwOqqcfBDKukpuvqUDrjy155eDZZNneC-ZHMOoIVjQTqEEVRvzGDNbRXcqgRH1dG2CsI6VhPnoYnjqKRG4YVDOavqKhS2uV6diC6qzOSWwi5CEPI-ErQL79FmJFcu_AaFhaDdW3WtBW4VrpEytjj87U1RoTmQ2naAI0vImX3qmp72azDGOURSONw6upeYnnzVmTG6RI6vrzrbIVyYYPwIA43Lthg5_r7LU_lPTdaZBo8eKpyl-q0poupQKItWQJAmE47qEZwJJnCSmdb6SmHlGJuXMPjERYp4erXiWm28XTZ1_XSTAHRivwURXPrgEUqxHfKtyLhIIzK9GUmIFvaVSWxFDkyX0mk30yQWEcLBxd4vQ2ZWuBxDEKQGYhUrj39sa4X4e1mhZmjMfwgttlv-PvrzWKW3nGzk3NeyAP74VlmvAoA7DiY9Ipufkm6xNJ1Ta2LvkjiRv2gShgs_IWR7coFmEDc8NNk1NzdyURVu8yo31zw62f2APuuGL-hwsa1ct7fX836gmhJgd2L5o3xBlSP98uRMxLmdTvFWkk0J1E889X8zhDTeviyAJB8CP1jpT_IoSL8HDQh5mRY_Scsqy5a3psmQmlL2txrZgBi8dKcPlLOH_iSHbLS5wQ0tOAxUPVcL0RoU7gnqU6KV21uzP2PbBPhKqpn8pbJwget9SVVWjHTlIw6GOQlwQwkegi2sawUErHNRVaQGopi8JbDKWIG3rFzeq4KQFHFQrf2LOg4GKPp-Qh-nM4T-YTQDysFNuVrsXz_f4KVYOfox8rH5DRNSM79P0mh8GYPlmIbnV-UXJqXh2O1M-IgT041tfbIk3ihxGpDaTgYzoS-udsdj_3hUOSmdeGMF7p5DWhsUcJmYtgTaA7gISuiF84-y0dD-xYD0iCRhpmyOWjLgTkW0qtitKm66Fav2s5AkiNvB7HBaDOe3-QqSexODbNDNQWXeBCIEhoVGD4pSAKcaFjc2x3ANPvvHQoz2oLnzjNtk9CQLRAlUZlRjTvVFCyncOj1af-fm0zpgxM6rSOy4TldC9N5aNP3CpqPwY6QPbGdPw8JjQje2SEKzjPuvgvM1sQSRncyZHp3_zX32_JPbFADpTnKT4idpaAZKCAAcRBMTVuVnIge7uWCmWyGEeGmuvk437MJN2m_z6gj3cB7k76gjqmbYVw2t8mvUgOGD0zYmfDbTu4NQcrRWgdonHp9xHwlnsH3D1qV9WyuQdGBrYhk3Mrut60fSOLn9Oa2abFdQgyTrnqME1jMPkKXeNU99gktkjZxCDGY1ZJ6HnVUIDhjDij3q5ffhQcqK7kwd9FcX0OHqO-tqH4hyLnTgVtXqtCFNHlGojo66LwhtHgthuIUceV1xmtTaLd_OOMtl2N0nGc4S2oQCJpzJ9m05I8OKEQfysutyLOUNTY-Nt6hf6wYsSEHButiyA9wWtV50Dave2CFeOyhKGReuCcVPB8ysTblDiEWmTOTfQDoNu3cMo-19aGsjadfjDuV-W4rkd2JAlN-jyCMPcJJHiIShjxtQghmxevcFmwLKvOZKOBBwaxSnD2yG6O1OPZfW08H5ZI9jhFu4_4euuaKFG1LHkxiP8HTQHjHaB213jFgXpndDLu9GdfE2AJOa24Bl9ahriJUeBQh7LneMrVtIOO5STPIyOdzK4YHNV9-abS5TiNIXua-z53Y32IaNWgua3bgFERicMHVno-f2RsVf8PmJeG0ECh17hsQlkaCccHYsLWVN9PJnDd9xAU-ftMlAT8GRhhJ_AO8ipMN5YuC9B6UkmQh7ZQnDbjSEUfwEXigHPcmtStvOLv17hPXxiuDqiVPdBkJ934Tr3jggI7oDMKoDAfDpyTFtlxjeE6GYoVqqVJAA0KjjoqvJKNebiI2idjOMGgPJIdvyBpx9M63TcvvUeP2rQAC3QRzBxqnlhvDoeDCkZnHmc1hIQdpdvB2KpJG3M1B06j00HT4ehjeA1EQH5IlIJ9DpLp-OukVshTpEmyNPu2EHmL83KM-bw2j7XIPKIf8wvS-_XacDlYjMsE9XP3NiS_ev-iAE3XZYCeMNimvo43_a2DEkX95Jj8b9PAa9xW10bAbHBQzxDreQ4Ao2rKocf0iR-LgGKV8GyBvUbYgHampTYUbEsi5IbkQ1wLBhQIny625uKARRV6xWtFf1XcVJMywyDsFPOP0B8nRMk0MICTmpSge3Og2Y7cQ5u8BRnIW9XV1scpIKnAzdT5qAoM7QdYb8pA1cRZZX9djM2WT1s9UWiiG158xBNYal55vN6HELAYYegLJ6_tvn-21llthovEqG2nbdo66D5fd5IkyI6hhrwdNLJIngzE2pNZNqiDdmJDuImgQNkFeIULqw40Y7u7_kNLgo66N0RLfC_Q_LZ5rebCV5-ivgdIvPHv_nE-wurwtxsVlC5I7L5XoZeujQnXv2-HOzQ3n5No31d4H-UeiKpfr7rzdjCa83J7r2fBSrxeYzlzPNwVj6Ybp8bgldns42b_Hmzvosg7GBL9ErODmKJstdeLsTo3MoSw7sT3BjADxPkB9ZmKZ7lbrmN82j77z89Rc6poWoBVfQ7ldcjHt7VH6F638nUKteaY2hpveOKP3UHpMKOLndk1z6bGADimIE5nXtBmektebYw7eeDVP45JP0t3aa7t2T2h2vSzw4JAUThzy5DfgnlvlRygJ_kxFODnZgZWEyQh52dd7JzOlz7rM45TXbNsSvfckIFQxwAgo0qS56O8PGK0D4lBPbqXQUfBejdk9SVw7SchlIfTAw6UyG26_r5ebd5dyI6Y7o6UAtGMFy6ejXMFqyzVjqiMXFQRxqRW-1q2Wl-sxIUjLLtdSIF_VHUmSpK6OAn9n7mhYnN6i_OCWRo1NZFBqGhVLTL9heD2kQx3plIEYEmytFym3iwAf278IV4DuLgqyrErzx1rGoH52m2mQmDZzCgIqIIbJWUmaeOilhKMGWQuSkV2LG6jS-bdvJeh2nM0a-XG6Oh3PzuINdrCfkWa7s-frGnu7AagwATbxV169G_MlJSoM2o52Th8SK_7sGYds5EVwJr9sf5CWxKRmvCx8KyJJQC19vl5UCH1ypVqGfRx4S6TFfLjGByPg5uozLnc9VU03r9V2WBGnm5qnwefvLJU5mHFzNVgjYcOcvUMTxAIyLzr3CpoBu-wqfPW3-O7NeKnzd9_LqyDqCE87xEoiapkfnWz3ZLPgMmzLc9XRpsr1NwJaRaT7CSYj-6GY-IvPMcuo53z0PgJfV5DAs8tazOnstuMsmLSiikTMeuzFdeNung_9e45_G3r9RBmjQ6a_JpwmjC8K7biVym-3ybk3PdeGbJyqTKwFweGOrfO8rSQkhskl61vhejAgKUwdkg2mp0LVfI_frCBgGgrQByd-WmdQAoGaQyt0tqCjkWsGY-34PEy_QNzMyVpl3-1NSQmwNsL6heYV0bH4djBIqXRk2n1ZWnZYwQ23el2bYDqbB7Czla7PmDhYTiTy2XYu_1it0EQLpjwS5PXwCPJ61Wm8AhblTKSjH7KpomuK7Sf9fD_ftolouUoX36T0OVW2NZWvDx963tl0i6u-QISBVf-KGbPnWnn8Pdbof-Ul9ieTFljSaXQHE_16n-mHXbWZiyrUWeXxjMdmrw63kT0-R9xRe1uo5SoKVhllUcDtVbg928rEUexR3ymFru0c3sFBTKrvirsFChaCqdTPc0VwDuQ_Q-OcipKdFIg8L1uzpkGM2GPAOXLIPly2kmn3A8SG2-HgrTmREGjgAmhcK98x5V6lVtHXWUQPOcZ7-JOY7P4k8cQ4P_22B7W17Q1bfTvFhbn0aqj5FPi3x3pe9N0_TJ7N3UoYvaDckJ9XzJaib2HeN3wPxXq30B5j2jsJLxVpyK04r7LkGsEezrpJSQ40ZPqZP7d-Pmb4s8934SsPe4f6xvsf5bbLPVihDeeoVW9dvK1CgD_MTT3v-m5pepca6hJNDzyJqGgBXt-QPyilsHINjwR-POrsx3vlUrP2e-6P2HyugsTTjdKO45llD_OEwmqgZtASoBDjI9j1p99uFHcjP2O4wm6iOkS7rGsrTvNu7OyrOaXSEdY8TOukvHgbs5FT6pK8i-6CQtvHcPpMURvEZqwQ7dPfACBRKStyeJUG4kz8JlBPKZE0yXgDdP-DNi6anqetmcYFtamocN1zjcyuRN8aY2dMLCPVqeWusCYsrLtUwQ7zkJEbvInby8wCPoy6woGTSKxrso3BGugxi8n59JiM1fcNlbhjZH-DyjWWFv2bJLarMkd8Igvt0EvGsDeAK9Olcv5ZWi09fhbSAWVvbQoXm0N5UI2PZiCbTZtvnSGpYQGWAXdlHJfoeGo02nEWX7Q55VXwdgxN6YKY-d5JPNx50VsA_3OAkHq37qm80Dyvhn4lunicIE1mAC0EXQgUFn3FQZ0a4Uo47BY2LLje6oS9z9esJnrqg4c_c-I0CKfSqr6xUhttx1vRXu8gNA8T4fz0ImUBggYOI_EuZW0FAESpkIMs4EAEmq0oGzUnvs7Zuphp902ItYGBnZvsWKvTNZTa8yIaHv9BnDmM_39Y8kaNOXwcu0mGZGfR6vZvKwmRim5c-qdLqMlJb1e05UsnoqqVgjKatq_pPqPNMMTK3hvHE0uIO5FnOGaprZso80y5BW5KWNLGhGyWpNokDJqGCfE5OC-Gvh0bUaORpr0aw0N6ETA3PZroAV3cI5XOEqNi0lT3yhpLndq-aKt3xMDf0sOPcbRUgvtHhHHmXWv4mTW0CHjqkX2zJHwgz7Jg0aUkgWLzQIWmB4A-EHjhgsTuysHorc34luICZIepY8hUF5skyzttsv9y-OYLItz2-mrQpNtJZ_HPC0rBOBZxOdvw118D64bxqkaF3qZsHu2Ts9lj5glrwrPRLO84Nm9ha-uXhIm7ebX-O_IWMn3_MkWR39ktfH2PH7vRL3_ekqmDUsGOuCVmVDIyuC7XHQbJsE0WYjMD0-UTC9CuPMLYOf7ULJIlsVR9MZY78Nc0WUGJZKbMXegkbKUOHyNbkC6FGRo5fr7ld_rq8TwqkGZffqHwXe5ZurkQ_IO0FxLVYVir8hV64nBjLSpW_cC8JJhXaNnxsqpIxGh2Fk5dEKuwTsfbaNjTxGCNyinUyJkmK5HcQUPXtj4naC5riqtwCVHqSZ_lv4U9jt6slOJkB3FkHoEo5w4TgyD7H3q_GEZrq3xL_7hQVdFwjmz4F-sOx_jv5wRMJyFCEmSyVtH40B7rTO9mf7kuA9PgWMW5xCPoWA4METrY80HJaWAvi6Bbe0Il60PpDeCDPSIAsOegTlQUGcXl0atkqFf0tT0NlPYVRrzbqx9ykqQ1sHxAdp_EvdmYhH9xUNEp6w7nqMiXfAImXoH7TEqcVzls5RuEkyjPoPvfCxRNd9-iubuN6d3bxk_PfZNQYwA5d5SySTO-mNXlWlV_41KxpOX-_ztnuScnguj5JFLYuIjfZsoJ7k6o8n5Tp_bu0Ys79hXFMLbxxrtCjRmV8xXEeOTqz6M6xzH6ZX9cpzx8_1eUVRsaz5uzTYF022SXDY8kwW1rdAxSCleAXz674CUwQDx9wZlIp--UsQkTB7g__4qbvSHFUSHn84Yl9fRQ6PGyML4_NIOMnS5fA-aBlp2c4T0OAtwpSY60hp6F0HZsMJqaK-i7DoQY6l48E1a5MGdqfv2jrdNtLB79qpA7X-oJ361djib5NVCs6rwv7AmkPVkX3JuNccssIqJVkJMxUGAcF9itliq2YqYW6cPzLWG7x2vnF5hdP5yMfZ_uszz6c3E2WuyF62daZ76Zm99Gga0oAukFXN9Fg3-VMcSCRCUkOFhxIVCAZx1H7iyS5lnPG-4kKitCAdaRVcOuorhaJSPCbT0lPs5vcVkHn1jM6p3CgQSAbMJATHf3__7nlh-kzVx9pf0PXsqF4_Gfu-F_ttmsTvuF7WtLpF3cWw93bOjtPwnlb03pj8Pb_95E34EU-sm_bNNL5609ecf87AXcBHbqZB99vGDOCc85E3w0DSVF3ebQ1bc3FJmGcyHzlJdenMrEr2moK7RcIWbx-OJwwUyA9L7bt-F-xKB-Uj5J18CgrFaDioF9lAeM-R89_zKB45g2ESZI4OgOinPpLB5BIB5wcnq2y3v9SG0w5LwnmFAYKsS8W3KJahVc7uD4vAn3arGYEYxwThF69PHQsqsyotnteati5SGERPQTN2OLY1LkQhfqtvYEKBsgrHFZu1_Tc9A0gma7VGcoHAegseRZLZ2cRcYk5-ua9zsGWwOl6gR-_uxorsQjqiivLLj0ThR-_IeD4voL2as8UcerKHDUjqN6jMYbV2iEcs4JLkw5JdOhow2AD4bsTFttv2TxEwZZe6kWYUjL2eabBOj_YdQMNGMvpxSJ0jwBEzb5qDIw5qMdpAx-mG1TcCGPUpKsw6P0T0GoUZomUxXEAhl1etQIPztcLiAtQRRqXrrjwuQ7SNbVRHyV6BOuBa3gDgC1VjJheaY_Om-qjKoUhFE2WKJduufx1Ca8fZ5bgEoo6nPm0Ax-ulkD2fNDlkrv143wiqI8gem6n3Jr4FkNGEeLwCkRMQggkFFiv5NmkGKNkHDtb0mt2o5J1zmdcsU5-SETP-I75akbKJ0xnhEfY0ssgzNTMVugEQPuIXr2ASOdVuaeXQoUlJdVAT_9O__cxxL2gJkwfUoU2UrGqXEIqgyIR3_JZG2MC23ciDkrRoBjTYn0fIwgna3iNYuq0PDLmByJR05X1wAV_WpaitiPH6Vrtzlm3LzJyS2aiJrOjSuuvmmZGk5AbuaRn0-Xm9TSOUkeK7HwUh2NrIXlzPyGbvd3BvI9bDWQJCOcxmMDNfn0HsGM0rcV0wS-y1WOBXMlnuBwGkI9In7FNwsVL-mqrW1MG3p2Nau166bLoMNARBN2ngfTrrLau1PWjwiVxqF7t4gFA6qR-lLD9yOKLeAohvZj7xAjV2bLG858F_-jy6vqmdHt3__D49Fx-ea1Ua_VGs9V-e4-GdRM225_t3_90u_3h-G_s0-m_y6vhV0AZhXlk9Vx-VQtKEp6R04Oq61QhWT8tGCpeBA1_h46OAeRZRhBKfdpb9_6H5fhn-ce5Vd38yHeY-9Btb3yI--PT9QqYoSGFJYiY7O_U2GCjxft1DIkXM6fmbmvBlpSW0jj9Q2-63Ci1K4RKPfXwkGHytCoQv_wtZW1p2j5OdwLq-m1IgdQtRyOOjEI199xmkx5PwOjA_sw04wp2g6g_jIgZrqqN1nB_O8BYAv0x_VRTyt12h_1utgn_gIzUPXSHa281Uy2Ret8usqpS5_6Dwa-9eToMo52_7NsBGOK-XchMqCYaqi1C9P3_iPA3AIWbqT-DUUfiTwutSEz8vex_eds-ofxPqvYnNz2f_haE3UaSv77vcE686s-w7rOq4w2R093ct6Mbng7klB9mDow1znJ8l-69M48Wm5w_Yh6qf3y3B-3ObQTSZtRNc2ucjJeqV3_xbPKpHQtHtxELDn4PRt_hW6p-kY-WJ0Y-hHa7pY0OUZFGljM2figstwx9VL3nJch60pM0JMe8AMj7-9OopxFM6OrwZ1ECi5BWzu5I8zOOolvSACG2tMx6D489zJNgDpNqD5vEP_ukzMR-Ld5SswNScNOAGJrKn-NvYJ90kmZ3HMWlXekhHCfv_AVg7JmBQJ2__2IScmeaJnlBdIx37NYl-FKCMPFhOp7vWSwVLyI4tw1QwhMFxVkmtoNfhaG6Uz9zKK57tZQQCg4yN6v-Ph0_hO7911cw8JCkuaeeDec8OpOfkLwnkCWSWhcscJ5PP8iH8rzOI6a6c4W6oML2ENLMOi51STVT1bbRnw_u9vyvGqQecSIVzErLwsgLKFn5FVbtW9cXBLqMuSBRmXI8FmecDvs6xBd5FNN-ZRl6zEkJQmnBGbhTvT60N56rmJvaDUQTv59c_wn2TzOzoDgn0TrdNL_CnWJi9GQTZtHeHP8PBGKLnGCRUCqWw696ksp51TWyBMGYRvVfjM052rAIDoj3Cw3-M_6DoP0QL82r44rjhhhTwCSA4dKch3ExozXNNSbPh-Rws2rOHaLov3AYQVfm208UvnNQYQvKpadBt9JbceZiZM13iHYYjU3V5IoVXHuzYp-IMEoeCCrdgyP2s_NYIHfP9RifLIzjo6mn_OHFTOapzrbq5W3p5xNKdNKfqopDLCrf1u5Zf3eXspKJwM0ReW656z-ZNXxhREkdZ3qpsozJqCRC1xmjUWpQQT0_hGAf89RWfeSfK5inq___86m8gUWsKnEUBhJn8-nsVyGazVf8HSkOf9nFNuKHewZpuj1fFoqkzdaTqkQZlm3WSwcLtITGuL7XLngc_JFX4a9vEStGPEhmvb4CFcLgznBFTxAQHWaHBhTRxIpKgtVkiVrw5spWyVFGQOhAX9gscad2pBqCO3yLNcgSXj2B5UQ60HVaRFBCWyVzHjVXW37JZU7aTy3VLZViDKjVP30Yj_Po5eSIuY0D5j73LjEbmFh1yZdpENJ4HJvNHK7lJi3S3X1Yfn_hRhBI9vqEQD4A8OpmBeOOk1ed6TS_ufvvFLNlbq8k-UqcQMikWDNP1TLVGdg2aFSTlkRezFX5TDF-5LgszhgrhcEHzzMACmwV5DsU0s-hCYyh60z2ti5_z8IKthENhxnNafWPgx_e3I0pTzN6lTc-7eAyT6mU5g6Bn4dW0_1y5_TTIphyjkixDKQclBbHoopBYT9WQ15FXVS0hrLyWBRGLPbOQM5Yl7HZGEnHS3VCbyLthNnm1TfQdEVMD3Y410HTxZtL1MR8gJb3ZdcWGHP3JWhGayn3BySXQaOkPFt3L4fM0o67cDcsrekcbWeV8jPhLZzOSiUcFRpSz6Dw8DmTfsIca76zc3hiSym5Lb-M1Ed5zk04w4gPdGxMR9XSDo4iqOncP80Y2mcSjnSzOHgXf_9qdn7r6M-Zo5n2G4CTo4UF-Ah4eRNO8mn8ROpWwQvqoqLV9GvsJIxY3OsMz_X_cBN6F4Xpaf6Tb-2H4bCtFyzKt_v1nOAUqQbMmhwIx1SwFyHeifuIbkytlwcdxqel_XbVWZAkx70GYBmXi4KBUEzGq5M5YoozA_rq6RRRsEgGas3DkSYwiySm0brR6JR2KtCwmUtz2KlhJbwt8-_WmyLaATDDom2agnfKlI-29QwjZXjUWr2i3GeLnFe3xBzxpjTNUC5XZF6sNXEPRvjDQhg_hPuU8oDUkLA2Ezq68rMtNYgYWWCH5Ozr8F1SpDZ_3p6INli_4Wh-Op31_rvFeEqHW_52BJJrvW5TcWbRDc5jHHjht4uaJ3vHUYAL7DODLThsUFMaebeENE99r0_gRk7WLZRA_P_Oom_oNwU2G0aeOaJqjtJdDBBgX3bu5bUtI2rqCv1Lcb6LEwqusvbA9ANhuDnfwaoDbPuK0361-e5LBI_ekdFiYzIMeiywDgSOg3NELps4shrDJdkb7yzx0aOk2mWgyQMI47V4ByQM8vaalG3wpEtwqrTv0vgK878B2VCa90U1kueCRqNVQlXGHo6CteUUqLFsrqzEGK4kFbfPaIGEdh6leq7782NGDi9wf27K80dHxmengFtz2Qd00nNCq0asO_OJ3XCvRyvm6YAPGxcwkEd7cIHXnlg-Zo5KMHKtHTJC6V9rx-3UPe4nTSFC3N-KTON2ah33k1ApuE5h4-0kf9kMnCLG7RQ57qeo8XZSlxP8STOR9lCZxv0UOt5OwssicArj0yQ_EifFkThVuvk8qYqjrPbWXjtupx42_QCIPEzjdmrl-SZh0tLfJlGRXmTh6EPyaUUKG7nvEXbvH3gO2dNq93u8syOySO_HjQmDtYh6ydAhkOIJmPHZiZAbJK049v8uBvefvG5oM8nTXQ46cOeE5arxq28qNr1zKR8HHvGINIbxoI14dyScGeMMXod4emGCmN6Bz7Rnl9Ok2a2yjqZxpslLxsxXtWHRSjRb69JoDdp8SMoc4JthlLd7_2usmk_YyCNjvxm1wPpo848UypvtAIl5_LrNa29DebzIdMTHxq4kN0DWTqjiaukuL5hDHT0a3s8RKqe58nnBqWXMeGrrhEJfOu02gfgsOthgkRHVLmaG4h9dFd3ZolZcMZwSl8TgysLLP-Pnq1uSpjQ2GR9q-6Be0P8w2q-u7xc4Fqs3F6Nv2n_LjEBXhHdGRb-YKT5Mb6CPlDqAaO7M0VWnbOELLyR3sPzgMWh7UWV-QORnYsnB6UrjY0mwhZRUEfG9ZAr2XJefJsXLMd1zMBYRGy7bpOC5NuP9vWSP6Z2rp0n9aAnaLla-ZRo6P_TQSCTatfQAE5kvH7WovG_5ktfajU-7yV-i5MdR1d8xPTc5f1jJ7YhJ2T1yl0rSRNRhFaS_rrp3yooK73hHrt1LR6eXMeVYVjk15gFvDFTsCP7aEKaT1nPHWPuo5oF7cIDk07gFWGX8p-F8zKDo_WzuLsI2rjB-LL1_ZpaUKuELMEvWaZ_muXX2kZ8Z1CW8uZPIpX-L4ohOgcnOEcI7RCLrieLg1qIBdCIYSNTH0zvF5aTwQK46VLt4C1S_C8TzO5gry7np2oOj6AJtH3NXt5caXToZcJKWsmYcWs8OCGkREnPs4wsZVtRd5v_B4l90R4aU6JyAaUTmkhYebJKrUNnh8dBsFpcz_3bLxoX_-j9NsnY2r7aeRjNH8YnWHcT1Xp9qsB2F895Wkxf0u--zeaYX9vmZZIsb3ysjcVDIxrn-4XI_hxO2Tr_-AiY0skV_YY__DvoCem-8qcmGFNd460sKA4Rl1bUCDjckmK-p0LZZThVD6zPXKqaTp05DSu1m0Jj9Nq8nskq8UD5vnV5BBCT9ZEJiScsl1gqaR_AzB6eRwhIrkyybaDWMm6Jmpwm6KAhsd3EZCS1xYmY1-OY7Nabxpa-srIDhRvrKI0hhNZpz3PJI1qZuk2LVZMM4zGfIE2hVTkrsaLjXGeh9nobHYZsDQEEiA68G58GorGEF6uTwv5KikG9xLAjSZslcOs6z5TcqQpOp3Idye11nt2Gc353FvegqCwlCPcL9piTCPgZ6pEuU6RNnoeYHrhiSOz8Wrs7Dbm_a30QgUbsFHFp5jJL-IoCloatooQl0QvwF_B8a3OOqHNtQmsUe2qFXARWSXYCJgHJhuOgbdVHeMujdTyZc_jy2KRKvv8zKuvAD0vsanyzLDM48jrPB8PDtBvu17BR3L6ZaU_w09zbERaGIL8yWfEy4Ob8Yi4YJhAHXekiq3b5V2TOnlKKc99cwIHlll7uBUhAJodMVioDM9h2dy0E-zkXBlEtDfqmQmQAnj_7tlwFBTe3uqay1Pe3Wp2yTQikxeTZlslgeYDbdq_g2Fn0jO4UlDzJ8jGyZ1byEOhQ2f0IKJNiK3Eh_DjVHceOBMmcpTX9WfUdBU7VdfLWyM6VmngdUljwCtw4E8JAaiXMqVLRH0wgqtAUrC7GPW1DVMs5SAkJ526uqWR7jHOotg8ubLWwMMWbvx6t21V7w7p3aQ-l-2eSFUNG7yR60UTB3GqdrsRue1aGxddD-uTBrk5S1SrdxUN8XatDYqx_-tPWZDvplsl8LeCI6nmP4MLS3kaCA39Iv-BuW_Wa3R44GjKgTFl4f99bCOoineIbPyi8OnHi2jsfWcuFxrgPuDZYjg8e2juonSjija40wkp-5XZoO__PCUxYRTt4UU4kZxNk0YaVWdGLlbXg7tzW0Rp28RzaysmZa80IDko1gA613QIwRPqBYenZ8yw2cMEn2N-acyfAJXeib5ZU6PQFA5W5IhlrYYyEAknBVugQCfpUWZ0pbYmfFec5Ku-hK9PxuE1bsLQIyMta3PmfOF_VNk9YDv9VqdDgS6xgYHV1GSwtsll2_2SKFxsPEuOh0XI0dOGktXrmURiZ-NtToIgYwB6ezklqeNPkx8mcOo3PUqkrBGsbvjNcBXE3GLbTNNIRfgUZp4t_GxvfEO8h_fgbb6NW3GEvc4wNid9o7EvwdlRj8XjGWGVnVGEPmOwVE_gbhufEF0WzVJu5PujAOMHPgRp9s-c2o3cMuBaG4oZB2PO9uwdwbM2lq3JgLcrq7uI8kSqjwouQwvQs58pRdL4f9C4OsDlwUCcVL4YKVdDZ2iPlOu7N_kuEqOkKNM0WOCjBcsBvtuIkaJ7t93CCbvmoHueF61qn86vLifVvMDoWjOfIr_q3164DSyg7ok64GYnqXMh3TJOBnR330GmX_504Fjo0_WC3XWeRhy8PpUqeccumTNeHq9N_NxovxBTN__0KivtSAjU9T1gCMTaqYRVdvnziWPI1vIP5mFVdep5nHdORqSjVMfTo0vszjqr1isNurX6SjimKekm_OgEFyeJzzwl36cMrgzJnGcxOj8ZnER4HhtOGslKm3XfzS520D2djQ9hnDTfmeXaitNzjVtlfwycN-ZRcgbSSnfhG8OWvPepFRCgqS78tDs5iuE4N6DBj9yWulFPeMDNk_84ORu95DJf797_fwtLb59eMOYC4J_5UBf28lhIoSRf0Tz7n8f7Bu3QWW4BuEMbH-YKysl1ijITdJHdMq1EkZI6dRbcemwJIc36pzJzu8iFiNs2j9-aH4tK6PXFoPE83OVnmbeAQTfzKHhDUZxm3pPnC7Y6qsCy6s37fqgeM-mU7-VF8AAYynTsw9afWoAq4eHhh3kGIaJVOJCJtJ_bQ_rqyps4ojMZl6ZEWrjRAPRoDqz77Nh_Ncg_-ihL1qdY8MXyLEjn60squ7Sd1Hw3Ze3hdPQhKMJiEmDOVXs8YQs6Ka0YW6Z0K0XkizBgD2jwYfQPoJU9jhW6janKEL-wuQrmy2pO4Mx3lQakqnuMLirz7E7DnmGw9vomYDlZfOaHcPoAHmgukKaEebYCdKUdUw4KAQ62BRErPUIDKNhHAh9csLgzcG723CdBe6kH-GiWnFZWIRClvRTQI2V5C4DXiE4m9bJ8C-iEZz3SNxF1kPsD2bce0_Y3G1aMCLxJrVmIgjuczQvMXqo2Hc6Z_2yK6IrcFvydwBJ-UCIe3qRjObyi5TZ1MDJtmFDwycDbKG-iS9Horq0hGRYABtVzy6KwbTZqoI44UKsUOsqjThDoEu_jBiRMwjv66SigWoUG86jsA9Ojo5kRu0RyvHRG4RRYkvbqmjetQuGfWtVutkNrFjctBVAUN4MT2xUU3q6769KjDaC5xJv2TB8VTv8_QvtET1OKnR_QTk2y8CjzT11ckUjFVZApbMzNLkU_YNZeAA2RjBeVmZRghxT9qOAw9Bp8HQahEKtUkyJyVgWEkIiZugZh9XiCDZSGyC-UrqQ1mBGuhWu_xWIFvvE5Vou9LJdTWhbIgc3ghpZeNVsQ398KDdO7acZvw9jhZpzDiPjW81hCSeMbLvng19wB0rtaaYHQ_HyIvOjyBmEAvCCPai7aXmCL_gBJCRgc3qDZqZz9FuTrmd8KjgIgr4mTNZARaDLPuxU8Q8e5r3mhFMAh4GW1u4tQJKUPGEQ-lzSDm5wFJ4hBAgtnr5mwCX3IStLClR8p0YDXpafNhx-UL6BbjHxBhYX_fqYFRWsRc3JmfsWHZ9j64MCp57AlsdN5Fhrae8OvNxUngXd-TNOvO6OyDdyxkIrMi-0BSmZ4XsunI4kkP--RrhkATnkeic_OQi3QBFwlQ7nUsx3kYblNor961sBN7pVMHmkCodpi2FE63lIT6aLoAg8HpSUuQEsY36bD5aUIaLSy7NC0dD-aijrGghq3qTrIUhwPxv6IO8HTf1W5kq7cmKg8YIMkFXxZFN3nEamrBPbd31ansDJN320422HsWeXPVIq9fZVuqhiu1ilTbDUt25ECo_3XtTXRz0umK6IGesV7ifaUbOkJTJrOAr_gMuDBQQX9blk5HzJRA4sE3HKO5xtV0jIObCeesZFmeLnbFT57GQ9-Od3_-B_m7sIC2-Kncrddr2rTSsFj9_0enx98mEtxYcODe1IkcUGwYq74m5R1SJZZUJ_plfeNQqBhFlgyTU0bSYCetSgT2XoH8t-j7gtdUvh8MK6adrmd9NJWg20mFScHJlzDqs3IjiRJeGeWjutlrvSNqNsz3eebBDtn1CS8PY73zfhd3YmtuPZ0svh8M8tm4V7eKu2FRqZW2mDkx7SCoLuHzkEObaGFbRCq5FBUyOHXj7lrV2xVfKShuNeXso8XmJ46n2okKl3M-VURZHEnuRvMD58i22K-BEA-f0NUyMMlq9TPAUovQJbwLNdGuYjCxCeWAxKPdOQrJ_mWQSl4Vo7oWiHcmrdoYaimkhIweUZ5OgqBRiNG4wbcN8IlT2zohjHprJUV7J6MaAFU8oPOBFBTQcOgoK81EuxkVjYRkksNlu71RRoKoyQp98sgU_0RX1dAyANh7jBpumlQeirEWMq6tNltHKJe28etu4HikAZv552qvubIPiRBmMnO304N5PXT81LRyU_wsHGspf-Gkpeuc1WoDg8_XNLL-5n-CeYYx9RsZQ-CFv-w66tYlS9AY7EjeeHKyUx_BlU5VeN9YwAixsCQKM6JH-AuDHGR1MYVlLn_MjNX0BEKACPOl9wgz_Q6okATAUm19mMxKJxsC6bY6CDryDAWVtRdc8vXrH-QiLTSuDhlPnHAGIwyETtwQd-NjjBghmm9KLcJ8zBZuRLFkIx8pDnuANxk5uM8eA3kyCXpSTZ2Iy3wxfHyXEI8wRLjwP2tddbaDtmi19XgqbiDFK4BYzIesWxv46AhAmGrQZaaE5jNkc4Er20qh8YITe5sfBvLpzHfkmL8NrUjJBDe-cd44Bw8vCPS3hGb_dlfJ9ihgSncIcsbXCcP68MY5w_j2NsXhRwAnYJ03dYDc0INXOZoDUEV5M_tHEB5BX4fFLY2vuQ516u98SrAmma3xeaThRkKoDEMnlmJdh2ScY65m8-zzBxQlsGiLA6EXMN4YRNrcDVDU0E5ggK6QmsOGMRCfH9qLJORxgMyt48CzUAxkxx4oNsIaUI0KjbGa0YI9C1pxLcPeQzXAjB1szccOr1sOuz0qZk4Hk0qgmUGLs0t4hAJ25WUcpOYoKpwOlcQB3j8Ot5YfRskHFiiKo_XYlfZsjNlvmUEFHjENmSyD7JdVhAfM47Yt87GzyWpjiw9qnBuitOoIFMEIBVEZ0rlsGRhKBDL9LkbMHHDTTGZYUdTUeCXlYcLXTqDxpvIwqDf56PBB6-Pm8xMkZJzxYqnwcG4Uc1etsjrpWbIKLpuvMOFdcjrHVRoy6arlf4s6ynDUDxRNqAunYjJfGVvGGz2wpOWq30LGjQ_IxzIUasGjrWogcsxDgOeDOAtocT5lXusRFOdOlLI5t8ZBqnVmQIlpApYEV9cDvDnvVeVOGq7DHqkC89sKl8J128BadupPCkQ69vQ3z5vvU_3xH9Vn12zyDWzp9JLW8h0KHIIlwt1KQR43xjGvugoSVEoBezKqHcxdjyLp5m4H6nEanwyL9uuoBi4nOIZxayMUu3PRf3AW8JlL7Si2whUrul5IoBKV6_Qyn1PrFdKt4IXTNdSVGDEn9qpFmIPjCnq-59bPnIi2qBOKpWBo9okjYRSNGr7CXrndYOaqz7nCU8kyvsKlmoIZ18SPmPISlSAc8xDXDl9XL0S-mHmetea72ChMOvynLGDJlDAmFJOcWcgv3PZ9ShNBaw6JUTnmpwsa77JPsBkxhE6n2QFMwikXiqIemghpWR3XNCUU6zlGaZBcIa5AhVpsPzjyVMHF0mcaRZKYBT1D8WMIgUoatkotdomAhtreduSN3SIGSmX7c-60S1wzdD6pQXMQl1CcaTrDV4tHskYl6dRYTpRO7k1R4kl-2a60evNOsu9Y96_7Ag1JQm4JAVbTKAXle1p2GweyG-wNT8N16AYblQkus4AsKnE-tpJsQY2h4KhhhJnnjECpY3_1DsTgxsSfH0KrkAgX17brWR64KJ8q0J1lK_zE2hjw6aysPyrJmNTo-SIXc2P07q7FresZkPrXZj-KwViADKTNh0AuTQr7lzdkJzWEiWhJ0l2AB8gNVyGsQYytDZN-aZC-kGK2tf33czc1KEdmUMfG2Z_-7LjhZY3zZZxmjf6dr-5jriePNgstjPgmW4pEHl8Ef7ImUgenQG21z-idooHlndb0N-Aio6ZmixNPxAspddkFBRVN-t8iLZCfBClQrmtYk5f-tqgQSN9-5rSGylQdNCbim-g-y7kU6YYuXkcThnOETwgUpuOIQQ76JderIOVUyAO0F3fZKkoBg5M_WxgZmoJo-wqas57EN23fjK99xdlrlQziCIK1tb5r8O5T_0mh9SREw7FNDWyR8Op62mp5KDtuzrx_Ycu48Cg8YFDbk-X8xXFM4WRQKTeOQbrvgrE-7yaqzIPWz336kDky5PQagxkGEuFV1iZ25CoZtfd7I4tNXw2-tmU3JTxavJwfiX3X8aNmenzkG4Byd1-OofKrG8fILsNDpL8GANbzJfjemlUeJmtHIwLsAlKVTFuLyUkgb3kT91QmUFW8GSylBZbooyPnZE1edZxoUXwhgQ7rT5BR7Bz2EEltCi8ufEwPzfuE__S_KiHIZTihtY9EK5OzYWrB_0DSI7yxgi6MBNekA3LA_0veaS7Sv9Yc0deXXVw1ZknV3y3mJZmx1fzYLVkt_BlIzRte1HZPDlGti5Mweatrqqukp21T_0bq_1B6ZH_IrlHa9qg44rtjf8Itd0k73UoeosYp27a52pzu51Fb01zut4g7fnF0g0m3wRyHs0br2__CqBqf5p2rebziTrZH71ok_uXAm0BZ-B3acTgZW8SF1r3dsaunjKSEGAbCFwGaNu2XfRVm2GY7hvUorQZqB0XGvsRh0CVUFKY1mCFGK43Dtp1Or8qLzscbHnHm7BUI4Xpqr337YXS6-bwYzyuGz4Vyzd0dXBse3l2suVqXJJkH49Z5lEy7Hn5qd_GnRK181GYU0PMalOn_tFtFYS8m9XBDM9JBpiQD1PJgNMftvTY-Y0g2yhpfaztJqjL8RhZYcz_PuDOwN5cLRd7mhc7EPZNv7Ng0_LQ8cyfu98o7VSpg66ZkqLf_OuCR6FTqYaQPKL58s2MviCYfh7J9gY5FQmMCKG-VoK8qrjZzT4SPk-L-neyV69VPdJUN5FdKJdkxHGcSednKoNkNzjIFdqQivb2N5GjU-JaFdQXmER5omGjUsMFyLeyDDKX2wzlex765UJyzBiTDCrBLLKviz58F3T_p5E3gxqT8eVGGI00KjQat63ma47rbO3eqRFLmk1gySCRJhqb0nq21N8Eb0wMTneV8RkkPRmnJp2IwD7mbTI_ODKr7goXG1GgaucsBfbzOTCs5MtGJ6OCDnFo6uPiY4ah_9uAZzFBMy3ec28Ny13dJqrf8daZxCIM-LS9GXcVrcNW-oh4EnW0CpFIdfHs7cw2jLys9WrflI0fb-VrHx6LL_s_mgzws5Nifwpc26K_8KHMwRN3PD09N10ZAdcn5Jp215HKzDum15ZnvnFsd2u74sktLRDmH2XCtFGiQFoqVGOH3-8Rx6FRn58lrPGP6IBuBxkU2NtY4epxitS4aYdvjUJvWE04yskgL6uLxteBI-a2Pukda6B9pLJRYIlCPCrtJxO5Zu6JwlAjYeXiAOlQIB2wNUlBiYozIrML0y7xJocYDlOy3wytWnD4mtwRQ6ScvS-S-YnUi1NEMY25FCEc8B7LorjN0bHzJxbF77zA_7GOHEQls_wlZV6RQLGsAQu1kOJeFRcpldexXjM5vT52f77Gt5fsWLRAnQ5pJYbMVwXFuMlVisDiNAWWiAzv886F9Ig2GcINK17dpDNKz-G4MS1C3fWWNHP2c4v_j7hCqbMMJ7VgOmZ0-bVC2Zv4n6S4lpnw0-g5WsFvb7lcLIe0ZkS3zESCmhPCZUfuzPkSMnEqmtcGBAN6BeeXiguUh_HNtLP6XPCRXkJF1W8-h0epBMw7LumblES9pkb_wal-3K8vcoYeGIt4WbwpCOm53wzM5HyCJMVhem8UzyxJ6VB_AJCrbLRzq9tDIhdx8R3OSDyREKOJxEosWxoWilnBMwt7LefTze64htoC-Ce6drF9nOx-ID0psB76MvwI6F1pzVodUdD6s35uhYMV4SZKnoMos5g6asVqq7Upjj55jM1YGi1ljgp65TvpP-mwL16qW1vvPj_9Gl1Zn4LXyJlEW8nvb7viLrCyJZduod4GG5hgc-6cut4vdE79tYHS1tnGCMLmfBmJeG6_a0RsfnPpyMujnWcUPYrG38UgDVlhYT6mrazECtXfp0RB_DjWDMlmUlKAdNribezdKcsqM6uJpTPJVjHZKim3dahbV62_EqhpOZRa4Xz56G7Yko50QwarTKehzIvQlBnoSMyNCx5-zRn0A6p_wYnYK7uGKRUG4LW8TpvHjZvSaZN5mmLeeGv0-HU3bq5Qc6X_AYMUp2-dAKP5yiKj-8hj8IQQN6pvwy9i-EvC0wWacbs7iq6QuqK3COuOQLX-Tb8hOoLHxKRODMgITQGRqkFghLYtvOzHoREKLBJBZMQ38I3K1sR2ohAoeRAUm4sszNqTD6Syw9Qr2pKUgKPbYmWRgySaj7KCBxo67uEs_UZ00pCh_jmahbeVScRwkitvkwqtDJjSEpQ_qVi3cTc2OXj1fl1t6_kfpuBOYwynGWZuSwSJzecoozbFwXILqphXvPiWZ9Guqz9RLAjhtEnbw-Xp1pgKinVC-ynhCb9h6dR5xYO8bUVE08Jm8kniOmGyoZvOF5be7DsC5gdzzLLtzQUyDRc2s6bne877BX1lcvwWpev8IjL9afW996-eIC9XCg1zNuynz1KXdFvvb-Fv8JzPzZupjZKHxF5-XTEoJM61yZ0Wp626tDIlfhK2hUYcIYavMeBhl2njh4yKR79kQ0-4LkAOsZWeBtdL55I5ClI2l6CudFgpJUB_ZqLBVUGqDEeXkvNkInSGQPnOUwnsSz55HjvtYrXdLgNvy5NQXZvjI6tkJrkGMwhSoDC6dtU3gtkDEY_HNwMd1Yc82OqJezbQg6zK-VWY1gnYeufx8420vd2a66K3WHNe1ugfn7oOzGHWlErpoRllOMqUzXD2C-ayVG6IDJJPajao-eH07R6obPwFuY-IVWeNjNBh7lfSJ9CKbURbdbS6y9Q27nN566_9XO5ru2Tg1zsMliuCa77bss_FApZBChFrgqcmb4yJmvRxMeLx_gXIpwg0_b_-VrM5iozrjcAjXIks3ai3NP9MzhjphOghKBPVH6ytuUSnEGkaLVFBZwItC6RgPhLqggDmL4Juq14Bcvoh3__SP1nT0IjhPva4gEUIE5CEzVUh5SXuC_E1_CdSLPdtssqXbbLAZTuiojOvBQuQG2OGVY-zF8dIcNOGn2a-HNWXdEJXuwEZ3ENK5Z0lkS1EhbA3lFu-77tpaSqMp3HUXId093dppNsf1f6g9cELar4Oo02y0nI9zLpsfaGhvsNpUMJcYf_MpMC5vCet9UwyYhzhG3L7A0AHPEIaRJbWe5huX53vQYn1nk_HPGbCEiAAn98uz9lYXnDP9sycBPgSVjvpeHnIsh1mKQfYarepZdD_Ue9eNZf7y7ojjlIFW0HUbJg66cwRHUsxYXiq6M2QSi8-efi4ZuwCczbjj9qXn94342qK3nAK-H5ydUhF4Si8c6wZjJloY_R-zEAaDxnQHq7g8GfXiA3VLQdNRmJ0AFj4PsWN3fQ-FdXOCbsyHmULDObZ113pvzLpPj6LgYaDpj9GeLUz3cYlMzn2khCha3Wyi0azXkEA07W2zV0x1zFEr84mR1VPVCOLuY0Tm40PcFwCOAAs-IbZwrmOyM-jhHyXzdADEwATCeAsWN66UX7uWAp1ZBTQ2McV86nBLlYgk4pte2DUfzMrfOv0L3-GEAwFv5vENN-A6qr0WLyPxL0eE0SoRuUzWpUSisS-11ZBrJVCpwPVJQLASIlOGok9OgzEPr0LgiQg3l4lclrXIkMlKmG_SL_5hOQs9srQp631vCG8IgfdE3-Yhaf2Foy9GRA_Qn2cMvLfHwu7N9FJOGBQv4o6TRbGfwMX7hTzhGx5K8rptVIW4UJwvSAJ0nDv8918m4C60orfWCpegRxhtp0PPAqoTTJ4B0hAFYxOFNpctQkpbUJvg9DKzqigDzFoEkrm8IpxS5X2SjwbpT_KtakA-MFxYdrjsO1NsDcJYr0CVgpKy35A4HpOaDU4NsqkDCJm1aW4ZTFSQsGpzboO9WH4sVhzsxtgfOwYiTpYU3eBc0tsdj4Y06oIscy_W5TYxBOnuSJ0wZ_anIBE3IROq9YozvtF06D2ZuagmW7P311SQyHTdWu6jz6lFSY2EI9RV7RvIuLLd6cOBQgO4LfmcMno31VQcP_-KJGgVTiJWWPGD0vscHyWyuOk9O6estedzohXIZ2ajijkR864bNRnKFQkm_fIZuEWjn24-Pq-sNaGtOGM5oWGR60XdCj7gFy-OCLJaDXnS-3pdS5hxRNEE1ZgP6vPPyxayi819g1k2nUhCdbYaDZ88B9qlhWavnV5qV4UwiIaKRRlBarNC8b6MMT049GsA8rSoXFcee-qJ__1FziLapKw-v0tnzqStIB4TKfZdE6gBmWYMYj0vto0UYo10Ey1moZ5_7QjrsJf-d3_ItYaXn1ixwb0xsn6hiz1ZXpQYtDEcIgOJSwiutkT6SguxZ8eYkTxUwb0Zo5Hz4WHz71fNtxNEw4MZZEeyAq1BnOKooIIrIR2gEHHcPwr5IKaq_02tBCHn4q7lq-bWWCwn_sS7Tc6JNi9jkfifSFdTQF25grJaitsLiNWeeJ1BfVqelYyHUHVlygnfoUnh7UmZ186NqEziWJn-Qc_3MqfmMDv0DU1-ogxlaWn3mlVQVDxH4N3yEYm-C4_9IxfQ1_rCGPj2Re3tkRMlBa9HvWeY0UnbURYikx146Brpnt_yJnH4QOWi6RF2iYK0RUtcbNBsrum4o5sak73wCKna88ARGZzaHY7jg1JRu1j1Ffcct_di9nWvdyuHf2A4BhCkTsvTZBsq_Zicybzq6WJM8vPYQmCULvj-S6LyeB3KJvipFGvKEIa_9BZklubeYPyusfv9d38u0bzav3N1eDnyaCVM2BzKqFEytkPvT7Tf7qqmzDliYl5TJnKuHPEPg6JKnI3FZyTIQEV2zlYMmG67WnSNjkoNY7cEnA0KTqwIRwfp-Frs399Mh8slhX4F_vy7ojjr9bYGYCtUftmh7kYwpu7WQUrdiYu4TPOp8Mi9Cw1Vut76waiedlj7iYg4oWMdMnSAWNLMVg3JpFwU5teEINQnHigZCffdqWwangzEMme6W_OE-vUqt8CP95uHmmo65DZJMlaPmS3TYXe7nLOYBeHDg2hHGOAC5y9qPZVUYBKtW9hhhIAWHOLk_3Kea4Jt8jQpT8RK3mPxKt9YfXEFHUn08XKx-HvYU_eviWRHgmrspxsNlGMdhp-AY4rzT3p81t_fv1PiTzXquFromI32_sJIM5UArsLF1I01hA4GNMhbyiit7TsdMg2V_5Z69PH3hgqmTdWhI0uY9fFTvQlf8Ecpi8ipvYvH0EhFAj5F6T1CKSS9eeYuPQYOqKUmpQUBG39BI71f6gmz5p8_2Dz7vEqGUATcblUJuqXiG7nDGRqyYBZ2sknLhBhIIxcWT7IAv7D8Kvq7qYYGsmVPhRn8gLZSyx97YxHO5A3Ymv-vI53HQDxetLEjuiCdirk55MaDPplgyUe6HxDjs-qOTBiBtQpcnBPLJ3A9JT2H7Ec2JGg7asrp9s14FWBUMKhrcVYQrE5VecFrnSi6VtMOw5uKPtmRXm4oDM0GRlbj4Mo0aHSYK0so3Rci9wEDCmTXZhefnRHUSduvQOrIKKMGXtS_HuEVzMNZpV6nCjvHiK0jwYQ4y5nsc4wG97dwmlZs5gS1iE7kbAOtb3VYnN4jr2WjbWgd0f0OnuVcmI3pcBeAVB9_fjjEuuNfgqdNtvw3UYoMc8_KeT1HIFCmCpbdz3WKpscbJ6GwzfRqzpwHzpdUvIBOjyel7RUgka0AoaOmhQRezoprYM63z2j-tIOjS-yUiSwf_SE88bM67vbILVg1scKnl1ygugHZvPpSTjGCFRhOpz0BAidps_IIffUizVxmnoPWDJhvTylaEQdDVWJxmCWA65hF2LuS1CGZOA0wdeCpQEBOKh07P_8dsprvspn-6FQZ-_GTKwX9wDRveZD1T24RXc5pWzdnvIHCnnV_NEDuSjE-Vny5dtIbUYHM-pKeebc0pzJwDTlTViRmsKCx2OraUrXS5k5avHlXiYd9hnK1vLJAK2qIo-MbMASLgYZtQucC4iZFtgQxOXGDYxEBgWQf2pM91TQ9ly3HLTAWHtVo87LqLooXWxobgHS-zuYYOjRm2pVJY1PUxJRhim18yrDRt1CEYsUAUOcYibuW-pZPyuY40yFGMNcluGOkwl5eZw7_0ud8VYGQKUCRVxhQ5bIPYYPk9jXPicgcoSTqaO5zSYK3NwiDnptbXQkaDOZbsb5os58Elsxzncewa9zqqnN93emoFHes0b5M-2Ghr_pdg-UH0WPlDjd3Jrvh3jY5axpVjuey3yOWAppsBbegnyxAQ_RuSyeLAmtANh8XY2GqiUblKwL0gDgTZxekIg-LLmLRG58-pGERbRsQJO-hQdzh_A2Vb3nTvC-jiIno3MkemTaLfzUW857ZuxvCyW3ihU-n0ENmyEmbGuQjIEkWGEWs8xLV4NIXb-3EnM4nkmkILJf88lOabcCRngB378qzyBy4jSMvVnmjBUDIOc4B14Mq6-53ec7WznfN0C_sUfy6yz7sOLj4NZiyIEsEgF1AgEgy6tDOMwBv3MmKkpA55lCf-TXlnHZR-IJw3z0Q7DZBr18mhN2xVGjUCtMviK39BG7TSqYWKcJpzfRb6R2kNNFRtZnSDDzWA6mgpS1YMWqOvRDuMZkcnHBEJqqMrQRAIXyPV-EKjuITvkevYtokHRi85gSu8jDxgMxSVRpuAdITPsRbZv7DHi-jQfmuWw__FUanNHaPUSF5kJUuV4kzqmU8GisUAouofn_EhZ7KtHsnj8tZF8rOtmml8-_xEGRF8ywSgmSt_Aw"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,I,A,E,T,x,N,O,$,j,C,M=\"@info\",U=\"@consent\",_=\"_tail:\",F=_+\"state\",P=_+\"push\",q=(e,r=e=>Error(e))=>{throw ef(e=rs(e))?r(e):e},z=(e,r,t=-1)=>{if(e===r||(e??r)==null)return!0;if(eg(e)&&eg(r)&&e.length===r.length){var n=0;for(var a in e){if(e[a]!==r[a]&&!z(e[a],r[a],t-1))return!1;++n}return n===Object.keys(r).length}return!1},R=(e,r,...t)=>e===r||t.length>0&&t.some(r=>R(e,r)),D=(e,r)=>null!=e?e:q(r??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),V=(e,r=!0,t)=>{try{return e()}catch(e){return eS(r)?ep(e=r(e))?q(e):e:ea(r)?console.error(r?q(e):e):r}finally{t?.()}},B=e=>{var r,t=()=>t.initialized||r?r:(r=rs(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},J=e=>{var r={initialized:!0,then:W(()=>(r.initialized=!0,rs(e)))};return r},W=e=>{var r=B(e);return(e,t)=>K(r,[e,t])},K=async(e,r=!0,t)=>{try{var n=await rs(e);return ev(r)?r[0]?.(n):n}catch(e){if(ea(r)){if(r)throw e;console.error(e)}else{if(ev(r)){if(!r[1])throw e;return r[1](e)}var a=await r?.(e);if(a instanceof Error)throw a;return a}}finally{await t?.()}},G=e=>e,L=void 0,H=Number.MAX_SAFE_INTEGER,X=!1,Y=!0,Z=()=>{},Q=e=>e,ee=e=>null!=e,er=Symbol.iterator,et=(e,r)=>(t,n=!0)=>e(t)?t:r&&n&&null!=t&&null!=(t=r(t))?t:L,en=(e,r)=>eS(r)?e!==L?r(e):L:e?.[r]!==L?e:L,ea=e=>\"boolean\"==typeof e,ei=et(ea,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),eo=e=>!!e,es=e=>e===Y,el=e=>e!==X,eu=Number.isSafeInteger,ec=e=>\"number\"==typeof e,ef=e=>\"string\"==typeof e,ed=et(ef,e=>e?.toString()),ev=Array.isArray,ep=e=>e instanceof Error,eh=(e,r=!1)=>null==e?L:!r&&ev(e)?e:eI(e)?[...e]:[e],eg=e=>null!==e&&\"object\"==typeof e,ey=Object.prototype,em=Object.getPrototypeOf,eb=e=>null!=e&&em(e)===ey,ew=(e,r)=>\"function\"==typeof e?.[r],ek=e=>\"symbol\"==typeof e,eS=e=>\"function\"==typeof e,eI=(e,r=!1)=>!!(e?.[er]&&(\"object\"==typeof e||r)),eA=e=>e instanceof Map,eE=e=>e instanceof Set,eT=(e,r)=>null==e?L:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,ex=!1,eN=e=>(ex=!0,e),eO=e=>null==e?L:eS(e)?e:r=>r[e],e$=(e,r,t)=>(r??t)!==L?(e=eO(e),r??=0,t??=H,(n,a)=>r--?L:t--?e?e(n,a):n:t):e,ej=e=>e?.filter(ee),eC=(e,r,t,n)=>null==e?[]:!r&&ev(e)?ej(e):e[er]?function*(e,r){if(null!=e){if(r){r=eO(r);var t=0;for(var n of e)if(null!=(n=r(n,t++))&&(yield n),ex){ex=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,t===L?r:e$(r,t,n)):eg(e)?function*(e,r){r=eO(r);var t=0;for(var n in e){var a=[n,e[n]];if(r&&(a=r(a,t++)),null!=a&&(yield a),ex){ex=!1;break}}}(e,e$(r,t,n)):eC(eS(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(r??=-e-1;e++;)yield r--;else for(r??=0;e--;)yield r++}(e,t),r),eM=(e,r)=>r&&!ev(e)?[...e]:e,eU=(e,r,t,n)=>eC(e,r,t,n),e_=(e,r,t=1,n=!1,a,i)=>(function* e(r,t,n,a){if(null!=r){if(r[er]||n&&eg(r))for(var i of a?eC(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}})(eC(e,r,a,i),t+1,n,!1),eF=(e,r,t,n)=>{if(r=eO(r),ev(e)){var a=0,i=[];for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n&&!ex;t++){var o=e[t];(r?o=r(o,a++):o)!=null&&i.push(o)}return ex=!1,i}return null!=e?eh(eU(e,r,t,n)):L},eP=(e,r,t,n)=>null!=e?new Set([...eU(e,r,t,n)]):L,eq=(e,r,t=1,n=!1,a,i)=>eh(e_(e,r,t,n,a,i)),ez=(...e)=>{var r;return eW(1===e.length?e[0]:e,e=>null!=e&&(r??=[]).push(...eh(e))),r},eR=(e,r,t,n)=>{var a,i=0;for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n;t++)if(null!=e[t]&&(a=r(e[t],i++)??a,ex)){ex=!1;break}return a},eD=(e,r)=>{var t,n=0;for(var a of e)if(null!=a&&(t=r(a,n++)??t,ex)){ex=!1;break}return t},eV=(e,r)=>{var t,n=0;for(var a in e)if(t=r([a,e[a]],n++)??t,ex){ex=!1;break}return t},eB=(e,r,...t)=>null==e?L:eI(e)?eF(e,e=>r(e,...t)):r(e,...t),eJ=(e,r,t,n)=>{var a;if(null!=e){if(ev(e))return eR(e,r,t,n);if(t===L){if(e[er])return eD(e,r);if(\"object\"==typeof e)return eV(e,r)}for(var i of eC(e,r,t,n))null!=i&&(a=i);return a}},eW=eJ,eK=async(e,r,t,n)=>{var a;if(null==e)return L;for(var i of eU(e,r,t,n))if(null!=(i=await i)&&(a=i),ex){ex=!1;break}return a},eG=Object.fromEntries,eL=(e,r,t)=>{if(null==e)return L;if(ea(r)||t){var n={};return eW(e,t?(e,a)=>null!=(e=r(e,a))&&null!=(e[1]=t(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eW(e,r?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eG(eF(e,r?(e,t)=>en(r(e,t),1):e=>en(e,1)))},eH=(e,r,t,n,a)=>{var i=()=>eS(t)?t():t;return eJ(e,(e,n)=>t=r(t,e,n)??i(),n,a)??i()},eX=(e,r=e=>null!=e,t=ev(e),n,a)=>eM(eC(e,(e,t)=>r(e,t)?e:L,n,a),t),eY=(e,r,t,n)=>{var a;if(null==e)return L;if(r)e=eX(e,r,!1,t,n);else{if(null!=(a=e.length??e.size))return a;if(!e[er])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eZ=(e,...r)=>null==e?L:ec(e)?Math.max(e,...r):eH(e,(e,t,n,a=r[1]?r[1](t,n):t)=>null==e||ec(a)&&a>e?a:e,L,r[2],r[3]),eQ=(e,r,t)=>eF(e,eb(e)?e=>e[1]:e=>e,r,t),e0=e=>!ev(e)&&eI(e)?eF(e,eA(e)?e=>e:eE(e)?e=>[e,!0]:(e,r)=>[r,e]):eg(e)?Object.entries(e):L,e1=(e,r,t,n)=>null==e?L:(r=eO(r),eJ(e,(e,t)=>!r||(e=r(e,t))?eN(e):L,t,n)),e2=(e,r,t,n)=>null==e?L:ev(e)||ef(e)?e[e.length-1]:eJ(e,(e,t)=>!r||r(e,t)?e:L,t,n),e4=(e,r,t,n)=>null==e?L:eb(e)&&!r?Object.keys(e).length>0:e.some?.(r??eo)??eJ(e,r?(e,t)=>!!r(e,t)&&eN(!0):()=>eN(!0),t,n)??!1,e6=(e,r=e=>e)=>(e?.sort((e,t)=>r(e)-r(t)),e),e5=(e,r,t)=>(e.constructor===Object?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),e3=(e,r,t)=>{if(e){if(e.constructor===Object&&null==t)return e[r];var n=e.get?e.get(r):e.has?e.has(r):e[r];return void 0===n&&null!=t&&null!=(n=eS(t)?t():t)&&e5(e,r,n),n}},e8=(e,...r)=>(eW(r,r=>eW(r,([r,t])=>{null!=t&&(eb(e[r])&&eb(t)?e8(e[r],t):e[r]=t)})),e),e9=e=>(r,t,n,a)=>{if(r)return void 0!=n?e(r,t,n,a):(eW(t,t=>ev(t)?e(r,t[0],t[1]):eW(t,([t,n])=>e(r,t,n))),r)},e7=e9(e5),re=e9((e,r,t)=>e5(e,r,eS(t)?t(e3(e,r)):t)),rr=(e,r)=>e instanceof Set?!e.has(r)&&(e.add(r),!0):e3(e,r)!==e7(e,r,!0),rt=(e,r)=>{if((e??r)!=null){var t=e3(e,r);return ew(e,\"delete\")?e.delete(r):delete e[r],t}},rn=(e,...r)=>{var t=[],n=!1,a=(e,i,o,s)=>{if(e){var l=r[i];i===r.length-1?ev(l)?(n=!0,l.forEach(r=>t.push(rt(e,r)))):t.push(rt(e,l)):(ev(l)?(n=!0,l.forEach(r=>a(e3(e,r),i+1,e,r))):a(e3(e,l),i+1,e,l),!eY(e)&&o&&ra(o,s))}};return a(e,0),n?t:t[0]},ra=(e,r)=>{if(e)return ev(r)?(ev(e)&&e.length>1?r.sort((e,r)=>r-e):r).map(r=>ra(e,r)):ev(e)?r<e.length?e.splice(r,1)[0]:void 0:rt(e,r)},ri=(e,...r)=>{var t=(r,n)=>{var a;if(r){if(ev(r)){if(eb(r[0])){r.splice(1).forEach(e=>t(e,r[0]));return}a=r}else a=eF(r);a.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eb(t)&&(\"get\"in t||\"value\"in t)?t:eS(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e},ro=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>eg(t)?ev(t)?t.map(r=>ev(r)?1===r.length?[r[0],e[r[0]]]:ro(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:ro(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rs=e=>eS(e)?e():e,rl=(e,r=-1)=>ev(e)?r?e.map(e=>rl(e,r-1)):[...e]:eb(e)?r?eL(e,([e,t])=>[e,rl(t,r-1)]):{...e}:eE(e)?new Set(r?eF(e,e=>rl(e,r-1)):e):eA(e)?new Map(r?eF(e,e=>[e[0],rl(e[1],r-1)]):e):e,ru=(e,...r)=>e?.push(...r),rc=(e,...r)=>e?.unshift(...r),rf=(e,r)=>{if(!eb(r))return[e,e];var t,n,a,i={};if(eb(e))return eW(e,([e,o])=>{if(o!==r[e]){if(eb(t=o)){if(!(o=rf(o,r[e])))return;[o,t]=o}else ec(o)&&ec(n)&&(o=(t=o)-n);i[e]=o,(a??=rl(r))[e]=t}}),a?[i,a]:void 0},rd=\"undefined\"!=typeof performance?(e=Y)=>e?Math.trunc(rd(X)):performance.timeOrigin+performance.now():Date.now,rv=(e=!0,r=()=>rd())=>{var t,n=+e*r(),a=0;return(i=e,o)=>(t=e?a+=-n+(n=r()):a,o&&(a=0),(e=i)&&(n=r()),t)},rp=(e=0)=>{var r,t,n=(a,i=e)=>{if(void 0===a)return!!t;clearTimeout(r),ea(a)?a&&(i<0?el:es)(t?.())?n(t):t=void 0:(t=a,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},rh=(e,r=0)=>{var t=eS(e)?{frequency:r,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{}}=t;r=t.frequency??0;var l=0,u=rw(!0).resolve(),c=rv(!a),f=c(),d=async e=>{if(!l||!n&&u.pending&&!0!==e)return!1;if(p.busy=!0,!0!==e)for(;u.pending;)await u;return e||u.reset(),(await K(()=>s(c(),-f+(f=c())),!1,()=>!e&&u.resolve())===!1||r<=0||o)&&v(!1),p.busy=!1,!0},v=(e,t=!e)=>(c(e,t),clearInterval(l),p.active=!!(l=e?setInterval(d,r<0?-r:r):0),p),p={active:!1,busy:!1,restart:(e,t)=>(r=e??r,s=t??s,v(!0,!0)),toggle:(e,r)=>e!==p.active?e?r?(v(!0),p.trigger(),p):v(!0):v(!1):p,trigger:async e=>await d(e)&&(v(p.active),!0)};return p.toggle(!a,i)};class rg{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new ry,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}}class ry{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[r?\"error\":\"value\"]=t===L||t,e(t),this})}),[this.resolve,this.reject]=e}then(e,r){return this._promise.then(e,r)}}var rm=(e,r=0)=>r>0?setTimeout(e,r):window.queueMicrotask(e),rb=(e,r)=>null==e||isFinite(e)?!e||e<=0?rs(r):new Promise(t=>setTimeout(async()=>t(await rs(r)),e)):q(`Invalid delay ${e}.`),rw=e=>e?new rg:new ry,rk=(...e)=>Promise.race(e.map(e=>eS(e)?e():e)),rS=(e,r,t)=>{var n=!1,a=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(a),!0),o=()=>n!==(n=!0)&&(r(a),!0);return o(),[i,o]},rI=()=>{var e,r=new Set;return[(t,n)=>{var a=rS(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,a[0]),a},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rA=(e,r=[\"and\",\", \"])=>e?1===(e=eF(e)).length?e[0]:ev(r)?[e.slice(0,-1).join(r[1]??\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(r??\", \"):L,rE=(e,r,t)=>null==e?L:ev(r)?null==(r=r[0])?L:r+\" \"+rE(e,r,t):null==r?L:1===r?e:t??e+\"s\",rT=(e,r,t)=>t?(ru(t,\"\\x1b[\",r,\"m\"),ev(e)?ru(t,...e):ru(t,e),ru(t,\"\\x1b[m\"),t):rT(e,r,[]).join(\"\"),rx=(e,r=\"'\")=>null==e?L:r+e+r,rN=(e,r,t)=>null==e?L:eS(r)?rA(eF(ef(e)?[e]:e,r),t??\"\"):ef(e)?e:rA(eF(e,e=>!1===e?L:e),r??\"\"),rO=e=>(e=Math.log2(e))===(0|e),r$=(e,r,t,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,r])=>ef(e)&&ec(r)).map(([e,r])=>[e.toLowerCase(),r])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,r)=>e|r,0),f=r?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,r])=>[r,e])),v=(e,t)=>eu(e)?!r&&t?null!=d[e]?e:L:Number.isSafeInteger(e)?e:L:ef(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),t):L,p=!1,[h,g]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||p?e:null==(t=v(t,r))?(p=!0,L):(e??0)|t,(p=!1,L)):v(e),(e,r)=>null==(e=h(e,!1))?L:r&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,r])=>r&&e&r&&rO(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:L],y=(e,r)=>null==e?L:null==(e=h(o=e,r))?q(TypeError(`${JSON.stringify(o)} is not a valid ${t} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&rO(e));return ri(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+t:`the ${t} ${rA(eF(eh(e),e=>rx(e)),[r])}`},r&&{pure:m,map:(e,r)=>(e=y(e),m.filter(([,r])=>r&e).map(r??(([,e])=>e)))}])},rj=(...e)=>{var r=e0(eL(e,!0)),t=e=>(eg(e)&&(ev(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,a=L;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,o)=>!a&&null!=(a=o===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=a)))})),e);return t},rC=Symbol(),rM=(e,r=[\"|\",\";\",\",\"],t=!0)=>{if(!e)return L;var n=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&r?.length&&e1(r,(e,r,t=n[1].split(e))=>t.length>1?t:L)||(n[1]?[n[1]]:[]),n},rU=(e,r=!0,t)=>null==e?L:rz(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:t,urn:t?!n:!n&&L,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):L,path:c,query:!1===r?f:r_(f,r),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":L),v}),r_=(e,r,t=!0)=>rF(e,\"&\",r,t),rF=(e,r,t,n=!0)=>{var a=[],i=null==e?L:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(r),(e,r,[i,o,s]=rM(e,!1===t?[]:!0===t?L:t,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==t?[i,s.length>1?s:o]:[i,o]:L,a.push(l),l),(e,r)=>e?!1!==t?ez(e,r):(e?e+\",\":\"\")+r:r);return i&&(i[rC]=a),i},rP=(e,r)=>r&&null!=e?r.test(e):L,rq=(e,r,t)=>rz(e,r,t,!0),rz=(t,n,a,i=!1)=>(t??n)==null?L:a?(e=L,i?(r=[],rz(t,n,(...t)=>null!=(e=a(...t))&&r.push(e))):t.replace(n,(...r)=>e=a(...r)),e):t.match(n),rR=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rD=/\\z./g,rV=(e,r)=>(r=rN(eP(eX(e,e=>e?.length)),\"|\"))?RegExp(r,\"gu\"):rD,rB={},rJ=e=>e instanceof RegExp,rW=(e,r=[\",\",\" \"])=>rJ(e)?e:ev(e)?rV(eF(e,e=>rW(e,r)?.source)):ea(e)?e?/./g:rD:ef(e)?rB[e]??=rz(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,n)=>t?RegExp(t,\"gu\"):rV(eF(rK(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rN(r,rR)}]`)),e=>e&&`^${rN(rK(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>rR(rG(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L,rK=(e,r)=>e?.split(r)??e,rG=(e,r,t)=>e?.replace(r,t)??e,rL=5e3,rH=()=>()=>q(\"Not initialized.\"),rX=window,rY=document,rZ=rY.body,rQ=(e,r)=>!!e?.matches(r),r0=H,r1=(e,r,t=(e,r)=>r>=r0)=>{for(var n,a=0,i=X;e?.nodeType===1&&!t(e,a++)&&r(e,(e,r)=>(null!=e&&(n=e,i=r!==Y&&null!=n),Y),a-1)!==X&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},r2=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return V(()=>JSON.parse(e),Z);case\"h\":return V(()=>nc(e),Z);case\"e\":return V(()=>nd?.(e),Z);default:return ev(r)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:r2(e,r[0])):void 0}},r4=(e,r,t)=>r2(e?.getAttribute(r),t),r6=(e,r,t)=>r1(e,(e,n)=>n(r4(e,r,t))),r5=(e,r)=>r4(e,r)?.trim()?.toLowerCase(),r3=e=>e?.getAttributeNames(),r8=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,r9=e=>null!=e?e.tagName:null,r7=()=>({x:(t=te(X)).x/(rZ.offsetWidth-window.innerWidth)||0,y:t.y/(rZ.offsetHeight-window.innerHeight)||0}),te=e=>({x:eT(scrollX,e),y:eT(scrollY,e)}),tr=(e,r)=>rG(e,/#.*$/,\"\")===rG(r,/#.*$/,\"\"),tt=(e,r,t=Y)=>(n=tn(e,r))&&G({xpx:n.x,ypx:n.y,x:eT(n.x/rZ.offsetWidth,4),y:eT(n.y/rZ.offsetHeight,4),pageFolds:t?n.y/window.innerHeight:void 0}),tn=(e,r)=>r?.pointerType&&r?.pageY!=null?{x:r.pageX,y:r.pageY}:e?({x:a,y:i}=ta(e),{x:a,y:i}):void 0,ta=e=>e?(o=e.getBoundingClientRect(),t=te(X),{x:eT(o.left+t.x),y:eT(o.top+t.y),width:eT(o.width),height:eT(o.height)}):void 0,ti=(e,r,t,n={capture:!0,passive:!0})=>(r=eh(r),rS(t,t=>eW(r,r=>e.addEventListener(r,t,n)),t=>eW(r,r=>e.removeEventListener(r,t,n)))),to=e=>{var{host:r,scheme:t,port:n}=rU(e,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}},ts=()=>({...t=te(Y),width:window.innerWidth,height:window.innerHeight,totalWidth:rZ.offsetWidth,totalHeight:rZ.offsetHeight});(E=s||(s={}))[E.Anonymous=0]=\"Anonymous\",E[E.Indirect=1]=\"Indirect\",E[E.Direct=2]=\"Direct\",E[E.Sensitive=3]=\"Sensitive\";var tl=r$(s,!1,\"data classification\"),tu=(e,r)=>tl.parse(e?.classification??e?.level)===tl.parse(r?.classification??r?.level)&&tf.parse(e?.purposes??e?.purposes)===tf.parse(r?.purposes??r?.purposes),tc=(e,r)=>null==e?void 0:ec(e.classification)&&ec(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:tl.parse(e.classification??e.level??r?.classification??0),purposes:tf.parse(e.purposes??e.purpose??r?.purposes??l.Necessary)};(T=l||(l={}))[T.None=0]=\"None\",T[T.Necessary=1]=\"Necessary\",T[T.Functionality=2]=\"Functionality\",T[T.Performance=4]=\"Performance\",T[T.Targeting=8]=\"Targeting\",T[T.Security=16]=\"Security\",T[T.Infrastructure=32]=\"Infrastructure\",T[T.Any_Anonymous=49]=\"Any_Anonymous\",T[T.Any=63]=\"Any\",T[T.Server=2048]=\"Server\",T[T.Server_Write=4096]=\"Server_Write\";var tf=r$(l,!0,\"data purpose\",2111),td=r$(l,!1,\"data purpose\",0),tv=(e,r)=>((u=e?.metadata)&&(r?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),tp=e=>!!e?.patchTargetId;(x=c||(c={}))[x.Global=0]=\"Global\",x[x.Entity=1]=\"Entity\",x[x.Session=2]=\"Session\",x[x.Device=3]=\"Device\",x[x.User=4]=\"User\";var th=r$(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var tg=e=>`'${e.key}' in ${th.format(e.scope)} scope`,ty={scope:th,purpose:td,purposes:tf,classification:tl};rj(ty);var tm=e=>e?.filter(ee).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope);(N=f||(f={}))[N.Add=0]=\"Add\",N[N.Min=1]=\"Min\",N[N.Max=2]=\"Max\",N[N.IfMatch=3]=\"IfMatch\",N[N.IfNoneMatch=4]=\"IfNoneMatch\",r$(f,!1,\"variable patch type\"),(O=d||(d={}))[O.Success=200]=\"Success\",O[O.Created=201]=\"Created\",O[O.Unchanged=304]=\"Unchanged\",O[O.Denied=403]=\"Denied\",O[O.NotFound=404]=\"NotFound\",O[O.ReadOnly=405]=\"ReadOnly\",O[O.Conflict=409]=\"Conflict\",O[O.Unsupported=501]=\"Unsupported\",O[O.Invalid=400]=\"Invalid\",O[O.Error=500]=\"Error\",r$(d,!1,\"variable set status\");var tb=(e,r,t)=>{var n,a=e(),i=e=>e,o=(e,t=tI)=>J(async()=>(n=i(t(await a,r)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eX(e,e=>e.status<300)),variables:o(e=>eF(e,tk)),values:o(e=>eF(e,e=>tk(e)?.value)),push:()=>(i=e=>(t?.(eF(tw(e))),e),s),value:o(e=>tk(e[0])?.value),variable:o(e=>tk(e[0])),result:o(e=>e[0])};return s},tw=e=>e?.map(e=>e?.status<400?e:L),tk=e=>tS(e)?e.current??e:L,tS=(e,r=!1)=>r?e?.status<300:e?.status<400||e?.status===404,tI=(e,r,t)=>{var n,a,i=[],o=eF(eh(e),(e,o)=>e&&(e.status<400||!t&&404===e.status?e:(a=`${tg(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=r?.[o])||!1!==n(e,a))&&i.push(a),L)));return i.length?q(i.join(\"\\n\")):ev(e)?o:o?.[0]},tA=e=>tI(e,L,!0),tE=e=>e&&\"string\"==typeof e.type,tT=((...e)=>r=>r?.type&&e.some(e=>e===r?.type))(\"view\"),tx=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tN=(e,r)=>r&&(!(p=e.get(v=r.tag+(r.value??\"\")))||(p.score??1)<(r.score??1))&&e.set(v,r),tO=(e,r=\"\",t=new Map)=>{if(e)return eI(e)?eW(e,e=>tO(e,r,t)):ef(e)?rz(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,a,i,o,s,l)=>{var u={tag:(n?tx(n)+\"::\":\"\")+r+tx(a),value:tx(i??o??s)};l&&10!==parseFloat(l)&&(u.score=parseFloat(l)/10),tN(t,u)}):tN(t,e),t},t$=new WeakMap,tj=e=>t$.get(e),tC=(e,r=X)=>(r?\"--track-\":\"track-\")+e,tM=(e,r,t,n,a,i)=>r?.[1]&&eW(r3(e),o=>r[0][o]??=(i=X,ef(n=eW(r[1],([r,t,n],a)=>rP(o,r)&&(i=void 0,!t||rQ(e,t))&&eN(n??o)))&&(!(a=e.getAttribute(o))||ei(a))&&tO(a,rG(n,/\\-/g,\":\"),t),i)),tU=()=>{},t_=(e,r)=>{if(h===(h=tV.tags))return tU(e,r);var t=e=>e?rJ(e)?[[e]]:eI(e)?eq(e,t):[eb(e)?[rW(e.match),e.selector,e.prefix]:[rW(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eQ(h))]];(tU=(e,r)=>tM(e,n,r))(e,r)},tF=(e,r)=>rN(ez(r8(e,tC(r,Y)),r8(e,tC(\"base-\"+r,Y))),\" \"),tP={},tq=(e,r,t=tF(e,\"attributes\"))=>{t&&tM(e,tP[t]??=[{},rq(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rW(t||n),,r])],r),tO(tF(e,\"tags\"),void 0,r)},tz=(e,r,t=X,n)=>(t?r1(e,(e,t)=>t(tz(e,r,X)),eS(t)?t:void 0):rN(ez(r4(e,tC(r)),r8(e,tC(r,Y))),\" \"))??(n&&(g=tj(e))&&n(g))??null,tR=(e,r,t=X,n)=>\"\"===(y=tz(e,r,t,n))||(null==y?y:ei(y)),tD=(e,r,t,n)=>e?(tq(e,n??=new Map),r1(e,e=>{t_(e,n),tO(t?.(e),void 0,n)},r),n.size?{tags:[...n.values()]}:{}):{},tV={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},tB=[],tJ=[],tW=(e,r=0)=>e.charCodeAt(r),tK=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>tB[tJ[r]=e.charCodeAt(0)]=r);var tG=e=>{for(var r,t=0,n=e.length,a=[];n>t;)r=e[t++]<<16|e[t++]<<8|e[t++],a.push(tJ[(16515072&r)>>18],tJ[(258048&r)>>12],tJ[(4032&r)>>6],tJ[63&r]);return a.length+=n-t,tK(a)},tL=e=>{for(var r,t=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>t;)i[n++]=tB[tW(e,t++)]<<2|(r=tB[tW(e,t++)])>>4,a>t&&(i[n++]=(15&r)<<4|(r=tB[tW(e,t++)])>>2,a>t&&(i[n++]=(3&r)<<6|tB[tW(e,t++)]));return i},tH={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},tX=(e=256)=>e*Math.random()|0,tY=e=>{var r,t,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+a),n=0;n<3;i[n++]=g(tX()));for(t=0,i[n++]=g(f^16*tX(16)+a);r>t;i[n++]=g(f^e[t++]));for(;a--;)i[n++]=tX();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((f^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);r>n;i[n++]=f^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(s=ea(r)?64:r,h(),[o,l]=tH[s],t=0;t<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[t++])))*l));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},tZ={exports:{}};(e=>{(()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,a=new Uint8Array(128),i=0;if(r&&r.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var r=e/4294967296,a=e%4294967296;c([211,r>>>24,r>>>16,r>>>8,r,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(t=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(t))})(e);break;case\"string\":(d=(o=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(e.charCodeAt(n)>127){r=!1;break}for(var a=0,i=new Uint8Array(e.length*(r?1:4)),o=0;o!==t;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return r?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var r=e.getTime()/1e3;if(0===e.getMilliseconds()&&r>=0&&r<4294967296)c([214,255,r>>>24,r>>>16,r>>>8,r]);else if(r>=0&&r<17179869184){var t=1e6*e.getMilliseconds();c([215,255,t>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r])}else{var t=1e6*e.getMilliseconds();c([199,12,255,t>>>24,t>>>16,t>>>8,t]),f(r)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var r=0;for(var t in e)void 0!==e[t]&&r++;for(var t in r<=15?u(128+r):r<=65535?c([222,r>>>8,r]):c([223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(s(t),s(n))}})(e);break;default:if(!a&&r&&r.invalidTypeReplacement)\"function\"==typeof r.invalidTypeReplacement?s(r.invalidTypeReplacement(e),!0):s(r.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var r=e.length;r<=15?u(144+r):r<=65535?c([220,r>>>8,r]):c([221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;r>t;t++)s(e[t])}function u(e){if(a.length<i+1){for(var r=2*a.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var r=2*a.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a.set(e,i),i+=e.length}function f(e){var r,t;e>=0?(r=e/4294967296,t=e%4294967296):(r=~(r=Math.abs(++e)/4294967296),t=~(t=Math.abs(e)%4294967296)),c([r>>>24,r>>>16,r>>>8,r,t>>>24,t>>>16,t>>>8,t])}}function t(e,r){var t,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(a());else t=a();return t;function a(){var r=e[n++];if(r>=0&&r<=127)return r;if(r>=128&&r<=143)return u(r-128);if(r>=144&&r<=159)return c(r-144);if(r>=160&&r<=191)return f(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return l(-1,1);if(197===r)return l(-1,2);if(198===r)return l(-1,4);if(199===r)return d(-1,1);if(200===r)return d(-1,2);if(201===r)return d(-1,4);if(202===r)return s(4);if(203===r)return s(8);if(204===r)return o(1);if(205===r)return o(2);if(206===r)return o(4);if(207===r)return o(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return d(1);if(213===r)return d(2);if(214===r)return d(4);if(215===r)return d(8);if(216===r)return d(16);if(217===r)return f(-1,1);if(218===r)return f(-1,2);if(219===r)return f(-1,4);if(220===r)return c(-1,2);if(221===r)return c(-1,4);if(222===r)return u(-1,2);if(223===r)return u(-1,4);if(r>=224&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var t=0,a=!0;r-- >0;)if(a){var i=e[n++];t+=127&i,128&i&&(t-=128),a=!1}else t*=256,t+=e[n++];return t}function o(r){for(var t=0;r-- >0;)t*=256,t+=e[n++];return t}function s(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return(n+=r,4===r)?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function l(r,t){r<0&&(r=o(t));var a=e.subarray(n,n+r);return n+=r,a}function u(e,r){e<0&&(e=o(r));for(var t={};e-- >0;)t[a()]=a();return t}function c(e,r){e<0&&(e=o(r));for(var t=[];e-- >0;)t.push(a());return t}function f(r,t){r<0&&(r=o(t));var a=n;return n+=r,((e,r,t)=>{var n=r,a=\"\";for(t+=r;t>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=t)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=t)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=t)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,r)}function d(e,r){e<0&&(e=o(r));var t=o(1),a=l(e);return 255===t?(e=>{if(4===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*r)}if(8===e.length){var t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*r+t/1e6)}if(12===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var r=i(8);return new Date(1e3*r+t/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:t,data:a}}}var n={serialize:r,deserialize:t,encode:r,decode:t};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(tZ);var{deserialize:tQ,serialize:t0}=($=tZ.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$,t1=\"$ref\",t2=(e,r,t)=>ek(e)?L:t?r!==L:null===r||r,t4=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var a,i,o,s=(e,r,n=e[r],a=t2(r,n,t)?u(n):L)=>(n!==a&&(a!==L||ev(e)?e[r]=a:delete e[r],l(()=>e[r]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||eS(e)||ek(e))return L;if(!eg(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[t1]||(e[t1]=o,l(()=>delete e[t1])),{[t1]:o};if(eb(e))for(var r in(i??=new Map).set(e,i.size+1),e)s(e,r);else!eI(e)||e instanceof Uint8Array||(!ev(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?s(e,t):(e[t]=null,l(()=>delete e[t])));return e};return V(()=>r?t0(u(e)??null):V(()=>JSON.stringify(e,L,n?2:0),()=>JSON.stringify(u(e),L,n?2:0)),!0,()=>a?.forEach(e=>e()))},t6=e=>{var r,t,n=e=>eg(e)?e[t1]&&(t=(r??=[])[e[t1]])?t:(e[t1]&&(r[e[t1]]=e,delete e[t1]),Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(ef(e)?JSON.parse(e):null!=e?V(()=>tQ(e),()=>(console.error(\"Invalid message received.\",e),L)):e)},t5=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var n=(e,n)=>ec(e)&&!0===n?e:o(e=ef(e)?new Uint8Array(eF(e.length,r=>255&e.charCodeAt(r))):r?V(()=>JSON.stringify(e),()=>JSON.stringify(t4(e,!1,t))):t4(e,!0,t),n);if(r)return[e=>t4(e,!1,t),e=>null==e?L:V(()=>t6(e),L),(e,r)=>n(e,r)];var[a,i,o]=tY(e);return[(e,r)=>(r?Q:tG)(a(t4(e,!0,t))),e=>null!=e?t6(i(e instanceof Uint8Array?e:tL(e))):null,(e,r)=>n(e,r)]};if(!e){var n=+(r.json??0);if(n&&!1!==r.prettify)return(m??=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[+n]}return t(e,r)};t5();var[t3,t8]=t5(null,{json:!0,prettify:!0}),t9=rK(\"\"+rY.currentScript.src,\"#\"),t7=rK(\"\"+(t9[1]||\"\"),\";\"),ne=t9[0],nr=t7[1]||rU(ne,!1)?.host,nt=e=>!!(nr&&rU(e,!1)?.host?.endsWith(nr)===Y),nn=(...e)=>rG(rN(e),/(^(?=\\?))|(^\\.(?=\\/))/,ne.split(\"?\")[0]),na=nn(\"?\",\"var\"),ni=nn(\"?\",\"mnt\");nn(\"?\",\"usr\");var no=Symbol(),ns=Symbol(),nl=(e,r,t=Y,n=X)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rT(\"tail.js: \",\"90;3\"))+r);var a=e?.[ns];a&&(e=e[no]),null!=e&&console.log(eg(e)?rT(t3(e),\"94\"):eS(e)?\"\"+e:e),a&&a.forEach(([e,r,t])=>nl(e,r,t,!0)),r&&console.groupEnd()},[nu,nc]=t5(),[nf,nd]=[rH,rH],[nv,np]=rI(),nh=e=>{nd===rH&&([nf,nd]=t5(e),np(nf,nd))},ng=e=>r=>ny(e,r),ny=(...e)=>{var r=e.shift();console.error(ef(e[1])?e.shift():e[1]?.message??\"An error occurred\",r.id??r,...e)},[nm,nb]=rI(),[nw,nk]=rI(),nS=e=>nA!==(nA=e)&&nb(nA=!1,nx(!0,!0)),nI=e=>nE!==(nE=!!e&&\"visible\"===document.visibilityState)&&nk(nE,!e,nT(!0,!0));nm(nI);var nA=!0,nE=!1,nT=rv(!1),nx=rv(!1);ti(window,[\"pagehide\",\"freeze\"],()=>nS(!1)),ti(window,[\"pageshow\",\"resume\"],()=>nS(!0)),ti(document,\"visibilitychange\",()=>(nI(!0),nE&&nS(!0))),nb(nA,nx(!0,!0));var nN=!1,nO=rv(!1),[n$,nj]=rI(),nC=rh({callback:()=>nN&&nj(nN=!1,nO(!1)),frequency:2e4,once:!0,paused:!0}),nM=()=>!nN&&(nj(nN=!0,nO(!0)),nC.restart());ti(window,\"focus\",nM),ti(window,\"blur\",()=>nC.trigger()),ti(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nM),nM(),(j=b||(b={}))[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\";var nU=r$(b,!1,\"local variable scope\"),n_=e=>nU.tryParse(e)??th(e),nF=e=>nU.format(e)??th.format(e),nP=e=>!!nU.tryParse(e?.scope),nq=rj({scope:nU},ty),nz=e=>null==e?void 0:ef(e)?e:e.source?nz(e.source):`${n_(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nR=e=>{var r=e.split(\"\\0\");return{scope:+r[0],key:r[1],targetId:r[2]}},nD=0,nV=void 0,nB=()=>(nV??rH())+\"_\"+nJ(),nJ=()=>(rd(!0)-(parseInt(nV.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nD).toString(36),nW=e=>crypto.getRandomValues(e),nK=()=>rG(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nW(new Uint8Array(1))[0]&15>>e/4).toString(16)),nG={},nL={id:nV,heartbeat:rd()},nH={knownTabs:{[nV]:nL},variables:{}},[nX,nY]=rI(),[nZ,nQ]=rI(),n0=rH,n1=e=>nG[nz(e)],n2=(...e)=>n6(e.map(e=>(e.cache=[rd(),3e3],nq(e)))),n4=e=>eF(e,e=>e&&[e,nG[nz(e)]]),n6=e=>{var r=eF(e,e=>e&&[nz(e),e]);if(r?.length){var t=n4(e);e7(nG,r);var n=eX(r,e=>e[1].scope>b.Tab);n.length&&(e7(nH.variables,n),n0({type:\"patch\",payload:eL(n)})),nQ(t,nG,!0)}};nv((e,r)=>{nm(t=>{if(t){var n=r(sessionStorage.getItem(F));sessionStorage.removeItem(F),nV=n?.[0]??rd(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nG=eL(ez(eX(nG,([,e])=>e.scope===b.View),eF(n?.[1],e=>[nz(e),e])))}else sessionStorage.setItem(F,e([nV,eF(nG,([,e])=>e.scope!==b.View?e:void 0)]))},!0),n0=(r,t)=>{e&&(localStorage.setItem(F,e([nV,r,t])),localStorage.removeItem(F))},ti(window,\"storage\",e=>{if(e.key===F){var n=r?.(e.newValue);if(n&&(!n[2]||n[2]===nV)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)t.active||n0({type:\"set\",payload:nH},a);else if(\"set\"===i&&t.active)e7(nH,o),e7(nG,o.variables),t.trigger();else if(\"patch\"===i){var s=n4(eF(o,1));e7(nH.variables,o),e7(nG,o),nQ(s,nG,!1)}else\"tab\"===i&&(e7(nH.knownTabs,a,o),o&&nY(\"tab\",o,!1))}}});var t=rh(()=>nY(\"ready\",nH,!0),-25),n=rh({callback(){var e=rd()-1e4;eW(nH?.knownTabs,([r,t])=>t[0]<e&&rn(nH.knownTabs,r)),nL.heartbeat=rd(),n0({type:\"tab\",payload:nL})},frequency:5e3,paused:!0}),a=e=>{n0({type:\"tab\",payload:e?nL:void 0}),e?(t.restart(),n0({type:\"query\"})):t.toggle(!1),n.toggle(e)};nm(e=>a(e),!0)},!0);var[n5,n3]=rI(),[n8,n9]=rI(),n7=((e,{timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var a=()=>(t?nd:nc)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(t?nf:nu)([nV,rd()+r]));return async(t,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<rd())&&(o(),a()?.[0]===nV))return r>0&&(i=setInterval(()=>o(),r/2)),await K(t,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=rw(),[f]=ti(window,\"storage\",r=>{r.key!==e||r.newValue||c.resolve()});await rk(rb(s??r),c),f()}null==s&&q(e+\" could not be acquired.\")}})(_+\"rq\"),ae=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=t=>{var s=eS(r)?r?.(a,t):r;return!1!==s&&(null!=s&&!0!==s&&(a=s),n3(e,a,t,e=>(o=a===L,a=e)),!o&&(i=n?nf(a,!0):JSON.stringify(a)))};if(!t)return await n7(()=>eK(1,async r=>{if(!s(r))return eN();var t=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(t.status>=400)return 0===r?eN(q(`Invalid response: ${await t.text()}`)):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rb((1+r)*200));var o=n?new Uint8Array(await t.arrayBuffer()):await t.text(),l=o?.length?(n?nd:JSON.parse)?.(o):L;return null!=l&&n9(l),eN(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||q(\"Beacon send failed.\"))},ar=[\"scope\",\"key\",\"targetId\",\"version\"],at=[...ar,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],an=[...ar,\"init\",\"purpose\",\"refresh\"],aa=[...at,\"value\",\"force\",\"patch\"],ai=new Map,ao=(e,r)=>{var t=rh(async()=>{var e=eF(ai,([e,r])=>({...nR(e),result:[...r]}));e.length&&await u.get(...e)},3e3),n=(e,r)=>r&&eB(r,r=>e3(ai,e,()=>new Set).add(r)),a=(e,r)=>{if(e){var t,a=nz(e),i=ra(ai,a);if(i?.size){if(e?.purposes===r?.purposes&&e?.classification==r?.classification&&z(e?.value,r?.value))return;eW(i,i=>{t=!1,i?.(e,r,(e=!0)=>t=e),t&&n(a,i)})}}};nm((e,r)=>t.toggle(e,e&&r>=3e3),!0),nZ(e=>eW(e,([e,r])=>a(e,r)));var i=new Map,o=(e,r)=>e7(i,e,ea(r)?r?void 0:0:r),u={get:(...t)=>tb(async()=>{(!t[0]||ef(t[0]))&&(a=t[0],t=t.slice(1)),r?.validateKey(a);var a,i=[],s=eF(t,(e,r)=>[e,r]),l=[],u=(await ae(e,()=>!!(s=eF(s,([e,r])=>{if(e){var t=nz(e);n(t,e.result);var a=n1(t);e.init&&o(t,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<rd())ru(i,[{...a,status:d.Success},r]);else if(!nP(e))return[ro(e,an),r];else if(eb(e.init)){var u={...nq(e),status:d.Created,...e.init};null!=u.value&&(ru(l,c(u)),ru(i,[u,r]))}}else ru(i,[{...e,status:d.Denied,error:\"No consent for \"+tf.logFormat(s)},r])}})).length&&{variables:{get:eF(s,0)},deviceSessionId:r?.deviceSessionId}))?.variables?.get??[];return ru(i,...eF(u,(e,r)=>e&&[e,s[r][1]])),l.length&&n6(l),i.map(([e])=>e)},eF(t,e=>e?.error)),set:(...t)=>tb(async()=>{(!t[0]||ef(t[0]))&&(n=t[0],t=t.slice(1)),r?.validateKey(n);var n,a=[],i=[],u=eF(t,(e,r)=>{if(e){var t=nz(e),n=n1(t);if(o(t,e.cache),nP(e)){if(null!=e.patch)return q(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nU(e.scope),key:e.key};return i[r]={status:n?d.Success:d.Created,source:e,current:u},void ru(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[ro(e,aa),r]}}),f=u.length?D((await ae(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:r?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n6(a),eW(f,(e,r)=>{var[t,n]=u[r];e.source=t,t.result?.(e),i[n]=e}),i},eF(t,e=>e?.error))},c=(e,r=rd())=>({...ro(e,at),cache:[r,r+(ra(i,nz(e))??3e3)]});return n8(({variables:e})=>{if(e){var r=rd(),t=ez(eF(e.get,e=>tk(e)),eF(e.set,e=>tk(e)));t?.length&&n6(eB(t,c,r))}}),u},as=(e,r,t=rL)=>{var n=[],a=new WeakMap,i=new Map,o=(e,r)=>e.metadata?.queued?e8(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):q(\"Source event not queued.\"),s=async(t,n=!0,a)=>{var i;return(!t[0]||ef(t[0]))&&(i=t[0],t=t.slice(1)),nl({[ns]:eF(t=t.map(e=>(r?.validateKey(i??e.key),e8(e,{metadata:{posted:!0}}),e8(tv(rl(e),!0),{timestamp:e.timestamp-rd()}))),e=>[e,e.type,X])},\"Posting \"+rA([rE(\"new event\",[eY(t,e=>!tp(e))||void 0]),rE(\"event patch\",[eY(t,e=>tp(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ae(e,{events:t,variables:a,deviceSessionId:r?.deviceSessionId},{beacon:n})},l=async(e,{flush:t=!1,async:a=!0,variables:i}={})=>{if((e=eF(eh(e),e=>e8(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eW(e,e=>nl(e,e.type)),!a)return s(e,!1,i);if(!t){e.length&&ru(n,...e);return}n.length&&rc(e,...n.splice(0)),e.length&&await s(e,!0,i)};return t>0&&rh(()=>l([],{flush:!0}),t),nw((e,r,t)=>{if(!e&&(n.length||r||t>1500)){var a=eF(i,([e,r])=>{var[t,n]=r();return n&&i.delete(e),t});(n.length||a.length)&&l(ez(n.splice(0),a),{flush:!0})}}),{post:l,postPatch:(e,r,t)=>l(o(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!0){var n=!1,s=()=>n=!0;return a.set(e,rl(e)),i.set(e,()=>{var i=a.get(e),[l,u]=(t?rf(r(i,s),i):r(i,s))??[];return l&&!z(u,i)?(a.set(e,rl(u)),[o(e,l),n]):[void 0,n]}),s}}},al=Symbol(),au=e=>{var r=new IntersectionObserver(e=>eW(e,({target:e,isIntersecting:r,boundingClientRect:t,intersectionRatio:n})=>e[al]?.(r,t,n)),{threshold:[.05,.1,.15,.2,.3,.4,.5,.6,.75]});return(t,n)=>{if(n&&(a=eX(n?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==Y))&&eY(a)){var a,i,o,s,l=X,u=0,c=rp(tV.impressionThreshold),f=aT();t[al]=(r,n,d)=>{f(r=d>=.75||n.top<(i=window.innerHeight/2)&&n.bottom>i),l!==(l=r)&&(l?c(()=>{if(++u,!o){var r,n=t.innerText;n?.trim()?.length&&(r={characters:n.match(/\\S/gu)?.length,words:n.match(/\\b\\w+\\b/gu)?.length,sentences:n.match(/\\w.*?[.!?]+(\\s|$)/gu)?.length}).words&&(r.readingTime=6e4*(r.words/238)),ru(e,o=eX(eF(a,e=>(e.track?.impressions||tR(t,\"impressions\",Y,e=>e.track?.impressions))&&G({type:\"impression\",pos:tt(t),viewport:ts(),timeOffset:aN(),impressions:u,text:r,...aR(t,Y)})||null)))}o?.length&&(s=eF(o,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:f(),impressions:u}))))}):(eW(s,e=>e()),c(!1)))},r.observe(t)}}},ac=()=>{nZ((e,r,t)=>{var n=ez(tm(eF(e,1))?.map(e=>[e,`${e.key} (${nF(e.scope)}, ${e.scope<0?\"client-side memory only\":tf.format(e.purposes)})`,X]),[[{[ns]:tm(eF(r,1))?.map(e=>[e,`${e.key} (${nF(e.scope)}, ${e.scope<0?\"client-side memory only\":tf.format(e.purposes)})`,X])},\"All variables\",Y]]);nl({[ns]:n},rT(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eY(r)} in total).`,\"2;3\"))})},af=()=>{var e=rX?.screen;if(!e)return{};var{width:r,height:t,orientation:n}=e,a=r<t,i=n?.angle??rX.orientation??0;return(-90===i||90===i)&&([r,t]=[t,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rX.devicePixelRatio,width:r,height:t,landscape:a}}},ad=e=>ru(e,G({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:k?.clientId,languages:eF(navigator.languages,(e,r,t=e.split(\"-\"))=>G({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...af()})),av=(e,r=\"A\"===r9(e)&&r4(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),ap=(e,r=r9(e),t=tR(e,\"button\"))=>t!==X&&(R(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&R(r5(e,\"type\"),\"button\",\"submit\")||t===Y),ah=e=>{if(w)return w;ef(e)&&([r,e]=nc(e),e=t5(r)[1](e)),e7(tV,e),nh(ra(tV,\"encryptionKey\"));var r,t=ra(tV,\"key\"),n=rX[tV.name]??[];if(!ev(n)){q(`The global variable for the tracker \"${tV.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...r)=>{var t=Y;i=eX(i,n=>V(()=>(n[e]?.(...r,{tracker:w,unsubscribe:()=>t=X}),t),ng(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nB(),e.timestamp??=rd(),v=Y;var r=X;return eF(a,([,t])=>{(r||t.decorate?.(e)===X)&&(r=Y)}),r?void 0:e},validateKey:(e,r=!0)=>!t&&!e||e===t||!!r&&q(`'${e}' is not a valid key.`)},u=ao(na,l),c=as(na,l),f=null,d=0,v=X,p=X;return Object.defineProperty(rX,tV.name,{value:w=Object.freeze({id:\"tracker_\"+nB(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||ef(e[0]))&&(r=e[0],e=e.slice(1)),ef(e[0])){var r,t=e[0];e=t.match(/^[{[]/)?JSON.parse(t):nc(t)}var n=X;if((e=eX(eq(e,e=>ef(e)?nc(e):e),e=>{if(!e)return X;if(aK(e))tV.tags=e7({},tV.tags,e.tagAttributes);else if(aG(e))return tV.disabled=e.disable,X;else if(aX(e))return n=Y,X;else if(a2(e))return e(w),X;return p||aZ(e)||aH(e)?Y:(s.push(e),X)})).length||n){var h=e6(e,e=>aH(e)?-100:aZ(e)?-50:a1(e)?-10:tE(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(r??g.key),V(()=>{var e,r=f[d];if(o(\"command\",r),v=X,tE(r))c.post(r);else if(aY(r))u.get(...eh(r.get));else if(a1(r))u.set(...eh(r.set));else if(aZ(r))ru(i,r.listener);else if(aH(r))(e=V(()=>r.extension.setup(w),e=>ny(r.extension.id,e)))&&(ru(a,[r.priority??100,e,r.extension]),e6(a,([e])=>e));else if(a2(r))r(w);else{var t=X;for(var[,e]of a)if(t=e.processCommand?.(r)??X)break;t||ny(\"invalid-command\",r,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>ny(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:Y}),configurable:!1,writable:!1}),ac(),nX(async(e,r,t,a)=>{if(\"ready\"===e){var i=tA((await u.get({scope:\"session\",key:M,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:H}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ad(w),i.hasUserAgent=!0),p=!0,s.length&&ru(w,s),a(),ru(w,...eF(aV,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),w},ag=()=>k?.clientId,ay={scope:\"shared\",key:\"referrer\"},am=(e,r)=>{w.variables.set({...ay,value:[ag(),e]}),r&&w.variables.get({scope:ay.scope,key:ay.key,result:(t,n,a)=>t?.value?a():n?.value?.[1]===e&&r()})},ab=rv(),aw=rv(),ak=rv(),aS=1,aI=()=>aw(),[aA,aE]=rI(),aT=e=>{var r=rv(e,ab),t=rv(e,aw),n=rv(e,ak),a=rv(e,()=>aS);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),interactiveTime:n(e,i),activations:a(e,i)})},ax=aT(),aN=()=>ax(),[aO,a$]=rI(),aj=(e,r)=>(r&&eW(aM,r=>e(r,()=>!1)),aO(e)),aC=new WeakSet,aM=document.getElementsByTagName(\"iframe\"),aU=e=>(null==e||(e===Y||\"\"===e)&&(e=\"add\"),ef(e)&&R(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eg(e)?e:void 0);function a_(e){if(e){if(null!=e.units&&R(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aF=e=>tD(e,void 0,e=>eF(eh(e3(t$,e)?.tags))),aP=e=>e?.component||e?.content,aq=e=>tD(e,r=>r!==e&&!!aP(e3(t$,r)),e=>(I=e3(t$,e),(I=e3(t$,e))&&eq(ez(I.component,I.content,I),\"tags\"))),az=(e,r)=>r?e:{...e,rect:void 0,content:(A=e.content)&&eF(A,e=>({...e,rect:void 0}))},aR=(e,r=X)=>{var t,n,a,i=[],o=[],s=0;return r1(e,e=>{var n=e3(t$,e);if(n){if(aP(n)){var a=eX(eh(n.component),e=>0===s||!r&&(1===s&&e.track?.secondary!==Y||e.track?.promote));t=e4(a,e=>e.track?.region)&&ta(e)||void 0;var l=aq(e);n.content&&rc(i,...eF(n.content,e=>({...e,rect:t,...l}))),a?.length&&(rc(o,...eF(a,e=>(s=eZ(s,e.track?.secondary?1:2),az({...e,content:i,rect:t,...l},!!t)))),i=[])}var u=n.area||tz(e,\"area\");u&&rc(o,...eF(u))}}),i.length&&ru(o,az({id:\"\",rect:t,content:i})),eW(o,e=>{ef(e)?ru(n??=[],e):(e.area??=rN(n,\"/\"),rc(a??=[],e))}),a||n?{components:a,area:rN(n,\"/\")}:void 0},aD=Symbol();C={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=rY.cookie.match(/CookieConsent=([^;]*)/)?.[1],r=1;return e?.replace(/([a-z]+):(true|false)/g,(e,t,n)=>(\"true\"===n&&(r|=C[t]??0),\"\")),{level:r>1?1:0,purposes:r}}}}});var aV=[{id:\"context\",setup(e){rh(()=>eW(aM,e=>rr(aC,e)&&a$(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(t,n,a)=>(null==k||!t?.value||k?.definition?r=t?.value:(k.definition=t.value,k.metadata?.posted&&e.events.postPatch(k,{definition:r})),a())});var r,t=n1({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=n1({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n2({scope:\"tab\",key:\"tabIndex\",value:n=n1({scope:\"shared\",key:\"tabIndex\"})?.value??n1({scope:\"session\",key:M})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=X)=>{if(!tr(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=rU(location.href+\"\",!0);k={type:\"view\",timestamp:rd(),clientId:nB(),tab:nV,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:t+1,viewport:ts(),duration:ax(void 0,!0)},0===n&&(k.firstTab=Y),0===n&&0===t&&(k.landingPage=Y),n2({scope:\"tab\",key:\"viewIndex\",value:++t});var u=r_(location.href);if(eF([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>(k.utm??={})[e]=u[`utm_${e}`]?.[0]),!(k.navigationType=S)&&performance&&eF(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=rG(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(k.navigationType??=\"navigate\")){var c=n1(ay)?.value;c&&nt(document.referrer)&&(k.view=c?.[0],k.relatedEventId=c?.[1],e.variables.set({...ay,value:void 0}))}var c=document.referrer||null;c&&!nt(c)&&(k.externalReferrer={href:c,domain:to(c)}),k.definition=r,r=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:aN()})),aE(k)}};return n$(e=>ak(e)),nw(e=>{e?(aw(Y),++aS):(aw(X),ak(X))}),ti(window,\"popstate\",()=>(S=\"back-forward\",i())),eF([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),S=\"navigate\",i()}}),i(),{processCommand:r=>aW(r)&&(ru(e,r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),Y),decorate(e){!k||tT(e)||tp(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var r=au(e),t=e=>null==e?void 0:{...e,component:eh(e.component),content:eh(e.content),tags:eh(e.tags)},n=({boundary:e,...n})=>{re(t$,e,e=>t(\"add\"in n?{...e,component:ez(e?.component,n.component),content:ez(e?.content,n.content),area:n?.area??e?.area,tags:ez(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),r(e,e3(t$,e))};return{decorate(e){eW(e.components,e=>ra(e,\"track\"))},processCommand:e=>aL(e)?(n(e),Y):a0(e)?(eF(((e,r)=>{if(!r)return[];var t=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e3(n,a))for(var i=[];null!=r4(a,e);){rr(n,a);var o=rK(r4(a,e),\"|\");r4(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ed(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&r[u]&&(l=r[u]),ru(i,l)}}ru(t,...eF(i,e=>({add:Y,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),t})(e.scan.attribute,e.scan.components),n),Y):X}}},{id:\"navigation\",setup(e){var r=r=>{ti(r,[\"click\",\"contextmenu\",\"auxclick\"],t=>{var n,a,i,o,s=X;if(r1(t.target,e=>{var r;ap(e)&&(o??=e),s=s||\"NAV\"===r9(e),a??=tR(e,\"clicks\",Y,e=>e.track?.clicks)??((r=eh(tj(e)?.component))&&e4(r,e=>e.track?.clicks!==X)),i??=tR(e,\"region\",Y,e=>e.track?.region)??((r=tj(e)?.component)&&e4(r,e=>e.track?.region))}),o){var l,u=aR(o),c=aF(o);a??=!s;var f={...(i??=Y)?{pos:tt(o,t),viewport:ts()}:null,...(r1(t.target??o,e=>\"IMG\"===r9(e)||e===o?(n={element:{tagName:e.tagName,text:r4(e,\"title\")||r4(e,\"alt\")||e.innerText?.trim().substring(0,100)||void 0}},X):Y),n),...u,timeOffset:aN(),...c};if(av(o)){var d=o.hostname!==location.hostname,{host:v,scheme:p,source:h}=rU(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===t.button&&ru(e,G({type:\"anchor_navigation\",anchor:o.hash,...f}));return}var g=G({clientId:nB(),type:\"navigation\",href:d?o.href:h,external:d,domain:{host:v,scheme:p},self:Y,anchor:o.hash,...f});if(\"contextmenu\"===t.type){var y=o.href,m=nt(y);if(m){am(g.clientId,()=>ru(e,g));return}var b=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!m){if(!tV.captureContextMenu)return;o.href=ni+\"=\"+b+encodeURIComponent(y),ti(window,\"storage\",(r,t)=>r.key===P&&(r.newValue&&JSON.parse(r.newValue)?.requestId===b&&ru(e,g),t())),ti(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),o.href=y})}return}t.button<=1&&(1===t.button||t.ctrlKey||t.shiftKey||t.altKey||r4(o,\"target\")!==window.name?(am(g.clientId),g.self=X,ru(e,g)):tr(location.href,o.href)||(g.exit=g.external,am(g.clientId)));return}var w=(r1(t.target,(e,r)=>!!(l??=aU(tj(e)?.cart??tz(e,\"cart\")))&&!l.item&&(l.item=e2(tj(e)?.content))&&r(l)),a_(l));(w||a)&&ru(e,w?G({type:\"cart_updated\",...f,...w}):G({type:\"component_click\",...f}))}})};r(document),aj(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=te(Y);aA(()=>rm(()=>(r={},t=te(Y)),250)),ti(window,\"scroll\",()=>{var n=te(),a=r7();if(n.y>=t.y){var i=[];!r.fold&&n.y>=t.y+200&&(r.fold=Y,ru(i,\"fold\")),!r[\"page-middle\"]&&a.y>=.5&&(r[\"page-middle\"]=Y,ru(i,\"page-middle\")),!r[\"page-end\"]&&a.y>=.99&&(r[\"page-end\"]=Y,ru(i,\"page-end\"));var o=eF(i,e=>G({type:\"scroll\",scrollType:e,offset:a}));o.length&&ru(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(r){if(aJ(r)){var t=r.cart;return\"clear\"===t?ru(e,{type:\"cart_updated\",action:\"clear\"}):(t=a_(t))&&ru(e,{...t,type:\"cart_updated\"}),Y}return aQ(r)?(ru(e,{type:\"order\",...r.order}),Y):X}})},{id:\"forms\",setup(e){var r=new Map,t=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=r6(i,tC(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&ta(i).width,u=e3(r,i,()=>{var r,t=new Map,n={type:\"form\",name:r6(i,tC(\"form-name\"))||r4(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aN()}));var s=()=>{o(),r[3]>=2&&(n.completed=3===r[3]||!l()),e.events.postPatch(n,{...a,totalTime:rd(Y)-r[4]}),r[3]=1},u=rp();return ti(i,\"submit\",()=>{a=aR(i),r[3]=3,u(()=>{i.isConnected&&ta(i).width>0?(r[3]=2,u()):s()},750)}),r=[n,t,i,0,rd(Y),1]});return e3(u[1],n)||eF(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||tR(e,\"ref\"))&&(e.value||(e.value=nK()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:rG(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aD]:t(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[r,t]=n(e)??[],a=t?.[1].get(r))=>a&&[t[0],a,r,t],i=null,o=()=>{if(i){var[e,r,n,a]=i,o=-(s-(s=aI())),u=-(l-(l=rd(Y))),c=r[aD];(r[aD]=t(n))!==c&&(r.fillOrder??=a[5]++,r.filled&&(r.corrections=(r.corrections??0)+1),r.filled=Y,a[3]=2,eW(e.fields,([e,t])=>t.lastField=e===r.name)),r.activeTime+=o,r.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&ti(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&a(e.target))=>t&&(i=t,\"focusin\"===e.type?(l=rd(Y),s=aI()):o()));u(document),aj(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>await e.variables.get({scope:\"session\",key:U,result:r}).value,t=async t=>{if(t){var n=await r();if(!n||tu(n,t=tc(t)))return[!1,n];var a={level:tl.lookup(t.classification),purposes:tf.lookup(t.purposes)};return await e.events.post(G({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(a4(e)){var a=e.consent.get;a&&r(a);var i=tc(e.consent.set);i&&(async()=>i.callback?.(...await t(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=rh({frequency:o.pollFrequency??1e3}),c=async()=>{if(rY.hasFocus()){var e=tc(o.poll());if(e&&!tu(s,e)){var[r,n]=await t(e);r&&nl(n,\"Consent was updated from \"+l),s=e}}};u.restart(o.pollFrequency,c).trigger()}return Y}return X}}}}],aB=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&r?.[e]!==void 0),aJ=aB(\"cart\"),aW=aB(\"username\"),aK=aB(\"tagAttributes\"),aG=aB(\"disable\"),aL=aB(\"boundary\"),aH=aB(\"extension\"),aX=aB(Y,\"flush\"),aY=aB(\"get\"),aZ=aB(\"listener\"),aQ=aB(\"order\"),a0=aB(\"scan\"),a1=aB(\"set\"),a2=e=>\"function\"==typeof e,a4=aB(\"consent\");Object.defineProperty(rX,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(ah)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
    constructor(config){
        let { trackerName, endpoint, extensions, cookies, client, clientIdGenerator } = config = merge({}, DEFAULT, config);
        this._config = config;
        this._trackerName = trackerName;
        this._endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
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
        this._clientConfig = client;
        this._clientConfig.src = this._endpoint;
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
        const headers = Object.fromEntries(Object.entries(sourceHeaders).filter(([k, v])=>!!v).map(([k, v])=>[
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
    host;
    path;
    url;
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, clientId }){
        this.disabled = disabled;
        this._requestHandler = requestHandler;
        this.env = requestHandler.environment;
        this.host = host;
        this.path = path;
        this.url = url;
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
        const consentData = (this.cookies[this._requestHandler._cookieNames.consent]?.value ?? `${DataPurposeFlags.Necessary}@${DataClassification.Anonymous}`).split("@");
        this._consent = {
            level: dataClassification.tryParse(consentData[1]) ?? DataClassification.Anonymous,
            purposes: dataPurposes.tryParse(consentData[0]?.split(",")) ?? DataPurposeFlags.Necessary
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
        src.push("?", "lx8ucc3k");
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
    manageConsents: false,
    sessionTimeout: 30,
    deviceSessionTimeout: 10,
    includeIp: true,
    client: DEFAULT_CLIENT_CONFIG,
    clientEncryptionKeySeed: "tailjs",
    cookiePerPurpose: false,
    allowBrowserJson: false
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

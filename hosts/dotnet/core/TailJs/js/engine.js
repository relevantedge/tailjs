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
const join = (source, projection, sep)=>source == null ? undefined$1 : isFunction(projection) ? separate(map(isString(source) ? [
        source
    ] : source, projection), sep ?? "") : isString(source) ? source : separate(map(source, (item)=>item === false ? undefined$1 : item), projection ?? "");
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
 */ const separate = (values, separator = [
    "and",
    ", "
])=>!values ? undefined$1 : (values = map(values)).length === 1 ? values[0] : isArray(separator) ? [
        values.slice(0, -1).join(separator[1] ?? ", "),
        " ",
        separator[0],
        " ",
        values[values.length - 1]
    ].join("") : values.join(separator ?? ", ");
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
    results[parameterList] = list;
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
            updatedEvents.push(event);
            if (tracker.session.isNew) {
                updatedEvents.push({
                    type: "session_started",
                    url: tracker.url,
                    sessionNumber: tracker.device?.sessions ?? 1,
                    timeSinceLastSession: tracker.session.previousSession ? tracker.session.firstSeen - tracker.session.previousSession : undefined,
                    tags: tracker.env.tags,
                    timestamp
                });
            }
            event.session = {
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
    async patch (events, next) {
        const now = Date.now();
        return (await next(events.map((event)=>{
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

var index = globalThis.schema;

const scripts$1 = {
    main: {
        text: "(()=>{\"use strict\";var e,r,t,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,I,A,E,T,x,N,O,j,C=\"@info\",U=\"@consent\",M=\"_tail:\",$=M+\"state\",_=M+\"push\",F=(e,r=e=>Error(e))=>{throw eu(e=ro(e))?r(e):e},P=(e,r,t=-1)=>{if(e===r||(e??r)==null)return!0;if(ep(e)&&ep(r)&&e.length===r.length){var n=0;for(var a in e){if(e[a]!==r[a]&&!P(e[a],r[a],t-1))return!1;++n}return n===Object.keys(r).length}return!1},q=(e,r,...t)=>e===r||t.length>0&&t.some(r=>q(e,r)),z=(e,r)=>null!=e?e:F(r??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),R=(e,r=!0,t)=>{try{return e()}catch(e){return ew(r)?ed(e=r(e))?F(e):e:et(r)?console.error(r?F(e):e):r}finally{t?.()}},D=e=>{var r,t=()=>t.initialized||r?r:(r=ro(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},B=e=>{var r={initialized:!0,then:J(()=>(r.initialized=!0,ro(e)))};return r},J=e=>{var r=D(e);return(e,t)=>V(r,[e,t])},V=async(e,r=!0,t)=>{try{var n=await ro(e);return ef(r)?r[0]?.(n):n}catch(e){if(et(r)){if(r)throw e;console.error(e)}else{if(ef(r)){if(!r[1])throw e;return r[1](e)}var a=await r?.(e);if(a instanceof Error)throw a;return a}}finally{await t?.()}},W=e=>e,K=void 0,L=Number.MAX_SAFE_INTEGER,G=!1,H=!0,X=()=>{},Y=e=>e,Z=e=>null!=e,Q=Symbol.iterator,ee=(e,r)=>(t,n=!0)=>e(t)?t:r&&n&&null!=t&&null!=(t=r(t))?t:K,er=(e,r)=>ew(r)?e!==K?r(e):K:e?.[r]!==K?e:K,et=e=>\"boolean\"==typeof e,en=ee(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||K))),ea=e=>!!e,ei=e=>e===H,eo=e=>e!==G,es=Number.isSafeInteger,el=e=>\"number\"==typeof e,eu=e=>\"string\"==typeof e,ec=ee(eu,e=>e?.toString()),ef=Array.isArray,ed=e=>e instanceof Error,ev=(e,r=!1)=>null==e?K:!r&&ef(e)?e:ek(e)?[...e]:[e],ep=e=>null!==e&&\"object\"==typeof e,eh=Object.prototype,eg=Object.getPrototypeOf,ey=e=>null!=e&&eg(e)===eh,em=(e,r)=>\"function\"==typeof e?.[r],eb=e=>\"symbol\"==typeof e,ew=e=>\"function\"==typeof e,ek=(e,r=!1)=>!!(e?.[Q]&&(\"object\"==typeof e||r)),eS=e=>e instanceof Map,eI=e=>e instanceof Set,eA=(e,r)=>null==e?K:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eE=!1,eT=e=>(eE=!0,e),ex=e=>null==e?K:ew(e)?e:r=>r[e],eN=(e,r,t)=>(r??t)!==K?(e=ex(e),r??=0,t??=L,(n,a)=>r--?K:t--?e?e(n,a):n:t):e,eO=e=>e?.filter(Z),ej=(e,r,t,n)=>null==e?[]:!r&&ef(e)?eO(e):e[Q]?function*(e,r){if(null!=e){if(r){r=ex(r);var t=0;for(var n of e)if(null!=(n=r(n,t++))&&(yield n),eE){eE=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,t===K?r:eN(r,t,n)):ep(e)?function*(e,r){r=ex(r);var t=0;for(var n in e){var a=[n,e[n]];if(r&&(a=r(a,t++)),null!=a&&(yield a),eE){eE=!1;break}}}(e,eN(r,t,n)):ej(ew(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(r??=-e-1;e++;)yield r--;else for(r??=0;e--;)yield r++}(e,t),r),eC=(e,r)=>r&&!ef(e)?[...e]:e,eU=(e,r,t,n)=>ej(e,r,t,n),eM=(e,r,t=1,n=!1,a,i)=>(function* e(r,t,n,a){if(null!=r){if(r[Q]||n&&ep(r))for(var i of a?ej(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}})(ej(e,r,a,i),t+1,n,!1),e$=(e,r,t,n)=>{if(r=ex(r),ef(e)){var a=0,i=[];for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n&&!eE;t++){var o=e[t];(r?o=r(o,a++):o)!=null&&i.push(o)}return eE=!1,i}return null!=e?ev(eU(e,r,t,n)):K},e_=(e,r,t,n)=>null!=e?new Set([...eU(e,r,t,n)]):K,eF=(e,r,t=1,n=!1,a,i)=>ev(eM(e,r,t,n,a,i)),eP=(e,r,t)=>null==e?K:ew(r)?rI(e$(eu(e)?[e]:e,r),t??\"\"):eu(e)?e:rI(e$(e,e=>!1===e?K:e),r??\"\"),eq=(...e)=>{var r;return eV(1===e.length?e[0]:e,e=>null!=e&&(r??=[]).push(...ev(e))),r},ez=(e,r,t,n)=>{var a,i=0;for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n;t++)if(null!=e[t]&&(a=r(e[t],i++)??a,eE)){eE=!1;break}return a},eR=(e,r)=>{var t,n=0;for(var a of e)if(null!=a&&(t=r(a,n++)??t,eE)){eE=!1;break}return t},eD=(e,r)=>{var t,n=0;for(var a in e)if(t=r([a,e[a]],n++)??t,eE){eE=!1;break}return t},eB=(e,r,...t)=>null==e?K:ek(e)?e$(e,e=>r(e,...t)):r(e,...t),eJ=(e,r,t,n)=>{var a;if(null!=e){if(ef(e))return ez(e,r,t,n);if(t===K){if(e[Q])return eR(e,r);if(\"object\"==typeof e)return eD(e,r)}for(var i of ej(e,r,t,n))null!=i&&(a=i);return a}},eV=eJ,eW=async(e,r,t,n)=>{var a;if(null==e)return K;for(var i of eU(e,r,t,n))if(null!=(i=await i)&&(a=i),eE){eE=!1;break}return a},eK=Object.fromEntries,eL=(e,r,t)=>{if(null==e)return K;if(et(r)||t){var n={};return eV(e,t?(e,a)=>null!=(e=r(e,a))&&null!=(e[1]=t(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eV(e,r?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(e$(e,r?(e,t)=>er(r(e,t),1):e=>er(e,1)))},eG=(e,r,t,n,a)=>{var i=()=>ew(t)?t():t;return eJ(e,(e,n)=>t=r(t,e,n)??i(),n,a)??i()},eH=(e,r=e=>null!=e,t=ef(e),n,a)=>eC(ej(e,(e,t)=>r(e,t)?e:K,n,a),t),eX=(e,r,t,n)=>{var a;if(null==e)return K;if(r)e=eH(e,r,!1,t,n);else{if(null!=(a=e.length??e.size))return a;if(!e[Q])return Object.keys(e).length}return a=0,eJ(e,()=>++a)??0},eY=(e,...r)=>null==e?K:el(e)?Math.max(e,...r):eG(e,(e,t,n,a=r[1]?r[1](t,n):t)=>null==e||el(a)&&a>e?a:e,K,r[2],r[3]),eZ=(e,r,t)=>e$(e,ey(e)?e=>e[1]:e=>e,r,t),eQ=e=>!ef(e)&&ek(e)?e$(e,eS(e)?e=>e:eI(e)?e=>[e,!0]:(e,r)=>[r,e]):ep(e)?Object.entries(e):K,e0=(e,r,t,n)=>null==e?K:(r=ex(r),eJ(e,(e,t)=>!r||(e=r(e,t))?eT(e):K,t,n)),e1=(e,r,t,n)=>null==e?K:ef(e)||eu(e)?e[e.length-1]:eJ(e,(e,t)=>!r||r(e,t)?e:K,t,n),e2=(e,r,t,n)=>null==e?K:ey(e)&&!r?Object.keys(e).length>0:e.some?.(r??ea)??eJ(e,r?(e,t)=>!!r(e,t)&&eT(!0):()=>eT(!0),t,n)??!1,e4=(e,r=e=>e)=>(e?.sort((e,t)=>r(e)-r(t)),e),e6=(e,r,t)=>(e.constructor===Object?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),e5=(e,r,t)=>{if(e){if(e.constructor===Object&&null==t)return e[r];var n=e.get?e.get(r):e.has?e.has(r):e[r];return void 0===n&&null!=t&&null!=(n=ew(t)?t():t)&&e6(e,r,n),n}},e3=(e,...r)=>(eV(r,r=>eV(r,([r,t])=>{null!=t&&(ey(e[r])&&ey(t)?e3(e[r],t):e[r]=t)})),e),e8=e=>(r,t,n,a)=>{if(r)return void 0!=n?e(r,t,n,a):(eV(t,t=>ef(t)?e(r,t[0],t[1]):eV(t,([t,n])=>e(r,t,n))),r)},e9=e8(e6),e7=e8((e,r,t)=>e6(e,r,ew(t)?t(e5(e,r)):t)),re=(e,r)=>e instanceof Set?!e.has(r)&&(e.add(r),!0):e5(e,r)!==e9(e,r,!0),rr=(e,r)=>{if((e??r)!=null){var t=e5(e,r);return em(e,\"delete\")?e.delete(r):delete e[r],t}},rt=(e,...r)=>{var t=[],n=!1,a=(e,i,o,s)=>{if(e){var l=r[i];i===r.length-1?ef(l)?(n=!0,l.forEach(r=>t.push(rr(e,r)))):t.push(rr(e,l)):(ef(l)?(n=!0,l.forEach(r=>a(e5(e,r),i+1,e,r))):a(e5(e,l),i+1,e,l),!eX(e)&&o&&rn(o,s))}};return a(e,0),n?t:t[0]},rn=(e,r)=>{if(e)return ef(r)?(ef(e)&&e.length>1?r.sort((e,r)=>r-e):r).map(r=>rn(e,r)):ef(e)?r<e.length?e.splice(r,1)[0]:void 0:rr(e,r)},ra=(e,...r)=>{var t=(r,n)=>{var a;if(r){if(ef(r)){if(ey(r[0])){r.splice(1).forEach(e=>t(e,r[0]));return}a=r}else a=e$(r);a.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...ey(t)&&(\"get\"in t||\"value\"in t)?t:ew(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e},ri=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ep(t)?ef(t)?t.map(r=>ef(r)?1===r.length?[r[0],e[r[0]]]:ri(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:ri(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},ro=e=>ew(e)?e():e,rs=(e,r=-1)=>ef(e)?r?e.map(e=>rs(e,r-1)):[...e]:ey(e)?r?eL(e,([e,t])=>[e,rs(t,r-1)]):{...e}:eI(e)?new Set(r?e$(e,e=>rs(e,r-1)):e):eS(e)?new Map(r?e$(e,e=>[e[0],rs(e[1],r-1)]):e):e,rl=(e,...r)=>e?.push(...r),ru=(e,...r)=>e?.unshift(...r),rc=(e,r)=>{if(!ey(r))return[e,e];var t,n,a,i={};if(ey(e))return eV(e,([e,o])=>{if(o!==r[e]){if(ey(t=o)){if(!(o=rc(o,r[e])))return;[o,t]=o}else el(o)&&el(n)&&(o=(t=o)-n);i[e]=o,(a??=rs(r))[e]=t}}),a?[i,a]:void 0},rf=\"undefined\"!=typeof performance?(e=H)=>e?Math.trunc(rf(G)):performance.timeOrigin+performance.now():Date.now,rd=(e=!0,r=()=>rf())=>{var t,n=+e*r(),a=0;return(i=e,o)=>(t=e?a+=-n+(n=r()):a,o&&(a=0),(e=i)&&(n=r()),t)},rv=(e=0)=>{var r,t,n=(a,i=e)=>{if(void 0===a)return!!t;clearTimeout(r),et(a)?a&&(i<0?eo:ei)(t?.())?n(t):t=void 0:(t=a,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},rp=(e,r=0)=>{var t=ew(e)?{frequency:r,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{}}=t;r=t.frequency??0;var l=0,u=rb(!0).resolve(),c=rd(!a),f=c(),d=async e=>{if(!l||!n&&u.pending&&!0!==e)return!1;if(p.busy=!0,!0!==e)for(;u.pending;)await u;return e||u.reset(),(await V(()=>s(c(),-f+(f=c())),!1,()=>!e&&u.resolve())===!1||r<=0||o)&&v(!1),p.busy=!1,!0},v=(e,t=!e)=>(c(e,t),clearInterval(l),p.active=!!(l=e?setInterval(d,r<0?-r:r):0),p),p={active:!1,busy:!1,restart:(e,t)=>(r=e??r,s=t??s,v(!0,!0)),toggle:(e,r)=>e!==p.active?e?r?(v(!0),p.trigger(),p):v(!0):v(!1):p,trigger:async e=>await d(e)&&(v(p.active),!0)};return p.toggle(!a,i)};class rh{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rg,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}}class rg{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[r?\"error\":\"value\"]=t===K||t,e(t),this})}),[this.resolve,this.reject]=e}then(e,r){return this._promise.then(e,r)}}var ry=(e,r=0)=>r>0?setTimeout(e,r):window.queueMicrotask(e),rm=(e,r)=>null==e||isFinite(e)?!e||e<=0?ro(r):new Promise(t=>setTimeout(async()=>t(await ro(r)),e)):F(`Invalid delay ${e}.`),rb=e=>e?new rh:new rg,rw=(...e)=>Promise.race(e.map(e=>ew(e)?e():e)),rk=(e,r,t)=>{var n=!1,a=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(a),!0),o=()=>n!==(n=!0)&&(r(a),!0);return o(),[i,o]},rS=()=>{var e,r=new Set;return[(t,n)=>{var a=rk(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,a[0]),a},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rI=(e,r=[\"and\",\", \"])=>e?1===(e=e$(e)).length?e[0]:ef(r)?[e.slice(0,-1).join(r[1]??\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(r??\", \"):K,rA=(e,r=\"'\")=>null==e?K:r+e+r,rE=e=>(e=Math.log2(e))===(0|e),rT=(e,r,t,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,r])=>eu(e)&&el(r)).map(([e,r])=>[e.toLowerCase(),r])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,r)=>e|r,0),f=r?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,r])=>[r,e])),v=(e,t)=>es(e)?!r&&t?null!=d[e]?e:K:Number.isSafeInteger(e)?e:K:eu(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),t):K,p=!1,[h,g]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||p?e:null==(t=v(t,r))?(p=!0,K):(e??0)|t,(p=!1,K)):v(e),(e,r)=>null==(e=h(e,!1))?K:r&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,r])=>r&&e&r&&rE(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:K],y=(e,r)=>null==e?K:null==(e=h(o=e,r))?F(TypeError(`${JSON.stringify(o)} is not a valid ${t} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&rE(e));return ra(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+t:`the ${t} ${rI(e$(ev(e),e=>rA(e)),[r])}`},r&&{pure:m,map:(e,r)=>(e=y(e),m.filter(([,r])=>r&e).map(r??(([,e])=>e)))}])},rx=(...e)=>{var r=eQ(eL(e,!0)),t=e=>(ep(e)&&(ef(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,a=K;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,o)=>!a&&null!=(a=o===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=a)))})),e);return t},rN=Symbol(),rO=(e,r=[\"|\",\";\",\",\"],t=!0)=>{if(!e)return K;var n=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&r?.length&&e0(r,(e,r,t=n[1].split(e))=>t.length>1?t:K)||(n[1]?[n[1]]:[]),n},rj=(e,r=!0,t)=>null==e?K:r_(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:t,urn:t?!n:!n&&K,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):K,path:c,query:!1===r?f:rC(f,r),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":K),v}),rC=(e,r,t=!0)=>rU(e,\"&\",r,t),rU=(e,r,t,n=!0)=>{var a=[],i=null==e?K:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(r),(e,r,[i,o,s]=rO(e,!1===t?[]:!0===t?K:t,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==t?[i,s.length>1?s:o]:[i,o]:K,a.push(l),l),(e,r)=>e?!1!==t?eq(e,r):(e?e+\",\":\"\")+r:r);return i[rN]=a,i},rM=(e,r)=>r&&null!=e?r.test(e):K,r$=(e,r,t)=>r_(e,r,t,!0),r_=(t,n,a,i=!1)=>(t??n)==null?K:a?(e=K,i?(r=[],r_(t,n,(...t)=>null!=(e=a(...t))&&r.push(e))):t.replace(n,(...r)=>e=a(...r)),e):t.match(n),rF=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rP=/\\z./g,rq=(e,r)=>(r=eP(e_(eH(e,e=>e?.length)),\"|\"))?RegExp(r,\"gu\"):rP,rz={},rR=e=>e instanceof RegExp,rD=(e,r=[\",\",\" \"])=>rR(e)?e:ef(e)?rq(e$(e,e=>rD(e,r)?.source)):et(e)?e?/./g:rP:eu(e)?rz[e]??=r_(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,n)=>t?RegExp(t,\"gu\"):rq(e$(rB(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${eP(r,rF)}]`)),e=>e&&`^${eP(rB(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>rF(rJ(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):K,rB=(e,r)=>e?.split(r)??e,rJ=(e,r,t)=>e?.replace(r,t)??e,rV=5e3,rW=()=>()=>F(\"Not initialized.\"),rK=window,rL=document,rG=rL.body,rH=(e,r)=>!!e?.matches(r),rX=L,rY=(e,r,t=(e,r)=>r>=rX)=>{for(var n,a=0,i=G;e?.nodeType===1&&!t(e,a++)&&r(e,(e,r)=>(null!=e&&(n=e,i=r!==H&&null!=n),H),a-1)!==G&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},rZ=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||en(e);case\"n\":return parseFloat(e);case\"j\":return R(()=>JSON.parse(e),X);case\"h\":return R(()=>ne(e),X);case\"e\":return R(()=>nt?.(e),X);default:return ef(r)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:rZ(e,r[0])):void 0}},rQ=(e,r,t)=>rZ(e?.getAttribute(r),t),r0=(e,r,t)=>rY(e,(e,n)=>n(rQ(e,r,t))),r1=(e,r)=>rQ(e,r)?.trim()?.toLowerCase(),r2=e=>e?.getAttributeNames(),r4=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,r6=e=>null!=e?e.tagName:null,r5=()=>({x:(t=r3(G)).x/(rG.offsetWidth-window.innerWidth)||0,y:t.y/(rG.offsetHeight-window.innerHeight)||0}),r3=e=>({x:eA(scrollX,e),y:eA(scrollY,e)}),r8=(e,r)=>rJ(e,/#.*$/,\"\")===rJ(r,/#.*$/,\"\"),r9=(e,r,t=H)=>(n=r7(e,r))&&W({xpx:n.x,ypx:n.y,x:eA(n.x/rG.offsetWidth,4),y:eA(n.y/rG.offsetHeight,4),pageFolds:t?n.y/window.innerHeight:void 0}),r7=(e,r)=>r?.pointerType&&r?.pageY!=null?{x:r.pageX,y:r.pageY}:e?({x:a,y:i}=te(e),{x:a,y:i}):void 0,te=e=>e?(o=e.getBoundingClientRect(),t=r3(G),{x:eA(o.left+t.x),y:eA(o.top+t.y),width:eA(o.width),height:eA(o.height)}):void 0,tr=(e,r,t,n={capture:!0,passive:!0})=>(r=ev(r),rk(t,t=>eV(r,r=>e.addEventListener(r,t,n)),t=>eV(r,r=>e.removeEventListener(r,t,n)))),tt=e=>{var{host:r,scheme:t,port:n}=rj(e,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}},tn=()=>({...t=r3(H),width:window.innerWidth,height:window.innerHeight,totalWidth:rG.offsetWidth,totalHeight:rG.offsetHeight});(I=s||(s={}))[I.Anonymous=0]=\"Anonymous\",I[I.Indirect=1]=\"Indirect\",I[I.Direct=2]=\"Direct\",I[I.Sensitive=3]=\"Sensitive\";var ta=rT(s,!1,\"data classification\"),ti=(e,r)=>ta.parse(e?.classification??e?.level)===ta.parse(r?.classification??r?.level)&&ts.parse(e?.purposes??e?.purposes)===ts.parse(r?.purposes??r?.purposes),to=(e,r)=>null==e?void 0:el(e.classification)&&el(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:ta.parse(e.classification??e.level??r?.classification??0),purposes:ts.parse(e.purposes??e.purpose??r?.purposes??l.Necessary)};(A=l||(l={}))[A.None=0]=\"None\",A[A.Necessary=1]=\"Necessary\",A[A.Functionality=2]=\"Functionality\",A[A.Performance=4]=\"Performance\",A[A.Targeting=8]=\"Targeting\",A[A.Security=16]=\"Security\",A[A.Infrastructure=32]=\"Infrastructure\",A[A.Anonymous=49]=\"Anonymous\",A[A.Any=63]=\"Any\",A[A.Server=2048]=\"Server\",A[A.Server_Write=4096]=\"Server_Write\";var ts=rT(l,!0,\"data purpose\",2111),tl=rT(l,!1,\"data purpose\",0),tu=(e,r)=>((u=e?.metadata)&&(r?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),tc=e=>!!e?.patchTargetId;(E=c||(c={}))[E.Global=0]=\"Global\",E[E.Entity=1]=\"Entity\",E[E.Session=2]=\"Session\",E[E.Device=3]=\"Device\",E[E.User=4]=\"User\";var tf=rT(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var td=e=>`'${e.key}' in ${tf.format(e.scope)} scope`,tv={scope:tf,purpose:tl,purposes:ts,classification:ta};rx(tv),(T=f||(f={}))[T.Add=0]=\"Add\",T[T.Min=1]=\"Min\",T[T.Max=2]=\"Max\",T[T.IfMatch=3]=\"IfMatch\",T[T.IfNoneMatch=4]=\"IfNoneMatch\",rT(f,!1,\"variable patch type\"),(x=d||(d={}))[x.Success=200]=\"Success\",x[x.Created=201]=\"Created\",x[x.Unchanged=304]=\"Unchanged\",x[x.Denied=403]=\"Denied\",x[x.NotFound=404]=\"NotFound\",x[x.ReadOnly=405]=\"ReadOnly\",x[x.Conflict=409]=\"Conflict\",x[x.Unsupported=501]=\"Unsupported\",x[x.Invalid=400]=\"Invalid\",x[x.Error=500]=\"Error\",rT(d,!1,\"variable set status\");var tp=(e,r,t)=>{var n,a=e(),i=e=>e,o=(e,t=tm)=>B(async()=>(n=i(t(await a,r)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eH(e,e=>e.status<300)),variables:o(e=>e$(e,tg)),values:o(e=>e$(e,e=>tg(e)?.value)),push:()=>(i=e=>(t?.(e$(th(e))),e),s),value:o(e=>tg(e[0])?.value),variable:o(e=>tg(e[0])),result:o(e=>e[0])};return s},th=e=>e?.map(e=>e?.status<400?e:K),tg=e=>ty(e)?e.current??e:K,ty=(e,r=!1)=>r?e?.status<300:e?.status<400||e?.status===404,tm=(e,r,t)=>{var n,a,i=[],o=e$(ev(e),(e,o)=>e&&(e.status<400||!t&&404===e.status?e:(a=`${td(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=r?.[o])||!1!==n(e,a))&&i.push(a),K)));return i.length?F(i.join(\"\\n\")):ef(e)?o:o?.[0]},tb=e=>tm(e,K,!0),tw=e=>e&&\"string\"==typeof e.type,tk=((...e)=>r=>r?.type&&e.some(e=>e===r?.type))(\"view\"),tS=e=>e?.toLowerCase().replace(/[^a-zA-Z0-9:.-]/g,\"_\").split(\":\").filter(e=>e)??[],tI=(e,r,t)=>{if(!e)return[];if(Array.isArray(e)&&(e=eP(e,\",\")),/(?<!(?<!\\\\)\\\\)%[A-Z0-9]{2}/.test(e))try{e=decodeURIComponent(e.replace(/([^=&]+)(?:\\=([^&]+))?(&|$)/g,(e,r,t,n)=>[r,t&&`=\"${t.replace(/(?<!(?<!\\\\)\\\\)(\"|%22)/g,'\\\\\"')}\"`,n&&\",\"].join(\"\")))}catch{}var n,a=[],i=tS(r);return e.replace(/\\s*(\\s*(?=\\=)|(?:\\\\.|[^,=\\r\\n])+)\\s*(?:\\=\\s*(?:\"((?:\\\\.|[^\"])*)\"|'((?:\\\\.|[^'])*)'|((?:\\\\.|[^,])*)))?\\s*(?:[,\\s]+|$)/g,(e,r,o,s,l)=>{var u=o||s||l,c=tS(r);return i.length&&(1!==c.length||u||(u=c.pop()),c=i.concat(c)),c.length&&(a.push(n={ranks:c,value:u||void 0}),t?.add(tA(n))),\"\"}),a},tA=e=>null==e?e:`${e.ranks.join(\":\")}${e.value?`=${e.value.replace(/,/g,\"\\\\,\")}`:\"\"}`,tE=new WeakMap,tT=e=>tE.get(e),tx=(e,r=G)=>(r?\"--track-\":\"track-\")+e,tN=(e,r,t,n,a,i)=>r?.[1]&&eV(r2(e),o=>r[0][o]??=(i=G,eu(n=eV(r[1],([r,t,n],a)=>rM(o,r)&&(i=void 0,!t||rH(e,t))&&eT(n??o)))&&(!(a=e.getAttribute(o))||en(a))&&tI(a,rJ(n,/\\-/g,\":\"),t),i)),tO=()=>{},tj=(e,r)=>{if(v===(v=tP.tags))return tO(e,r);var t=e=>e?rR(e)?[[e]]:ek(e)?eF(e,t):[ey(e)?[rD(e.match),e.selector,e.prefix]:[rD(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eZ(v))]];(tO=(e,r)=>tN(e,n,r))(e,r)},tC=(e,r)=>eP(eq(r4(e,tx(r,H)),r4(e,tx(\"base-\"+r,H))),\" \"),tU={},tM=(e,r,t=tC(e,\"attributes\"))=>{t&&tN(e,tU[t]??=[{},r$(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rD(t||n),,r])],r),tI(tC(e,\"tags\"),void 0,r)},t$=(e,r,t=G,n)=>(t?rY(e,(e,t)=>t(t$(e,r,G)),ew(t)?t:void 0):eP(eq(rQ(e,tx(r)),r4(e,tx(r,H))),\" \"))??(n&&(p=tT(e))&&n(p))??null,t_=(e,r,t=G,n)=>\"\"===(h=t$(e,r,t,n))||(null==h?h:en(h)),tF=(e,r,t,n)=>e?(tM(e,n??=new Set),rY(e,e=>{tj(e,n),tI(e$(t?.(e)),void 0,n)},r),n.size?{tags:[...n]}:{}):{},tP={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},tq=[],tz=[],tR=(e,r=0)=>e.charCodeAt(r),tD=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>tq[tz[r]=e.charCodeAt(0)]=r);var tB=e=>{for(var r,t=0,n=e.length,a=[];n>t;)r=e[t++]<<16|e[t++]<<8|e[t++],a.push(tz[(16515072&r)>>18],tz[(258048&r)>>12],tz[(4032&r)>>6],tz[63&r]);return a.length+=n-t,tD(a)},tJ=e=>{for(var r,t=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>t;)i[n++]=tq[tR(e,t++)]<<2|(r=tq[tR(e,t++)])>>4,a>t&&(i[n++]=(15&r)<<4|(r=tq[tR(e,t++)])>>2,a>t&&(i[n++]=(3&r)<<6|tq[tR(e,t++)]));return i},tV={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},tW=(e=256)=>e*Math.random()|0,tK=e=>{var r,t,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+a),n=0;n<3;i[n++]=g(tW()));for(t=0,i[n++]=g(f^16*tW(16)+a);r>t;i[n++]=g(f^e[t++]));for(;a--;)i[n++]=tW();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((f^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);r>n;i[n++]=f^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(s=et(r)?64:r,h(),[o,l]=tV[s],t=0;t<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[t++])))*l));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},tL={exports:{}};(e=>{(()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,a=new Uint8Array(128),i=0;if(r&&r.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var r=e/4294967296,a=e%4294967296;c([211,r>>>24,r>>>16,r>>>8,r,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(t=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(t))})(e);break;case\"string\":(d=(o=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(e.charCodeAt(n)>127){r=!1;break}for(var a=0,i=new Uint8Array(e.length*(r?1:4)),o=0;o!==t;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return r?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var r=e.getTime()/1e3;if(0===e.getMilliseconds()&&r>=0&&r<4294967296)c([214,255,r>>>24,r>>>16,r>>>8,r]);else if(r>=0&&r<17179869184){var t=1e6*e.getMilliseconds();c([215,255,t>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r])}else{var t=1e6*e.getMilliseconds();c([199,12,255,t>>>24,t>>>16,t>>>8,t]),f(r)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var r=0;for(var t in e)void 0!==e[t]&&r++;for(var t in r<=15?u(128+r):r<=65535?c([222,r>>>8,r]):c([223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(s(t),s(n))}})(e);break;default:if(!a&&r&&r.invalidTypeReplacement)\"function\"==typeof r.invalidTypeReplacement?s(r.invalidTypeReplacement(e),!0):s(r.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var r=e.length;r<=15?u(144+r):r<=65535?c([220,r>>>8,r]):c([221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;r>t;t++)s(e[t])}function u(e){if(a.length<i+1){for(var r=2*a.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var r=2*a.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a.set(e,i),i+=e.length}function f(e){var r,t;e>=0?(r=e/4294967296,t=e%4294967296):(r=~(r=Math.abs(++e)/4294967296),t=~(t=Math.abs(e)%4294967296)),c([r>>>24,r>>>16,r>>>8,r,t>>>24,t>>>16,t>>>8,t])}}function t(e,r){var t,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(a());else t=a();return t;function a(){var r=e[n++];if(r>=0&&r<=127)return r;if(r>=128&&r<=143)return u(r-128);if(r>=144&&r<=159)return c(r-144);if(r>=160&&r<=191)return f(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return l(-1,1);if(197===r)return l(-1,2);if(198===r)return l(-1,4);if(199===r)return d(-1,1);if(200===r)return d(-1,2);if(201===r)return d(-1,4);if(202===r)return s(4);if(203===r)return s(8);if(204===r)return o(1);if(205===r)return o(2);if(206===r)return o(4);if(207===r)return o(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return d(1);if(213===r)return d(2);if(214===r)return d(4);if(215===r)return d(8);if(216===r)return d(16);if(217===r)return f(-1,1);if(218===r)return f(-1,2);if(219===r)return f(-1,4);if(220===r)return c(-1,2);if(221===r)return c(-1,4);if(222===r)return u(-1,2);if(223===r)return u(-1,4);if(r>=224&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var t=0,a=!0;r-- >0;)if(a){var i=e[n++];t+=127&i,128&i&&(t-=128),a=!1}else t*=256,t+=e[n++];return t}function o(r){for(var t=0;r-- >0;)t*=256,t+=e[n++];return t}function s(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return(n+=r,4===r)?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function l(r,t){r<0&&(r=o(t));var a=e.subarray(n,n+r);return n+=r,a}function u(e,r){e<0&&(e=o(r));for(var t={};e-- >0;)t[a()]=a();return t}function c(e,r){e<0&&(e=o(r));for(var t=[];e-- >0;)t.push(a());return t}function f(r,t){r<0&&(r=o(t));var a=n;return n+=r,((e,r,t)=>{var n=r,a=\"\";for(t+=r;t>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=t)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=t)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=t)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,r)}function d(e,r){e<0&&(e=o(r));var t=o(1),a=l(e);return 255===t?(e=>{if(4===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*r)}if(8===e.length){var t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*r+t/1e6)}if(12===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var r=i(8);return new Date(1e3*r+t/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:t,data:a}}}var n={serialize:r,deserialize:t,encode:r,decode:t};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(tL);var{deserialize:tG,serialize:tH}=(N=tL.exports)&&N.__esModule&&Object.prototype.hasOwnProperty.call(N,\"default\")?N.default:N,tX=\"$ref\",tY=(e,r,t)=>eb(e)?K:t?r!==K:null===r||r,tZ=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var a,i,o,s=(e,r,n=e[r],a=tY(r,n,t)?u(n):K)=>(n!==a&&(a!==K||ef(e)?e[r]=a:delete e[r],l(()=>e[r]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||ew(e)||eb(e))return K;if(!ep(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[tX]||(e[tX]=o,l(()=>delete e[tX])),{[tX]:o};if(ey(e))for(var r in(i??=new Map).set(e,i.size+1),e)s(e,r);else!ek(e)||e instanceof Uint8Array||(!ef(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?s(e,t):(e[t]=null,l(()=>delete e[t])));return e};return R(()=>r?tH(u(e)??null):R(()=>JSON.stringify(e,K,n?2:0),()=>JSON.stringify(u(e),K,n?2:0)),!0,()=>a?.forEach(e=>e()))},tQ=e=>{var r,t,n=e=>ep(e)?e[tX]&&(t=(r??=[])[e[tX]])?t:(e[tX]&&(r[e[tX]]=e,delete e[tX]),Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eu(e)?JSON.parse(e):null!=e?R(()=>tG(e),()=>(console.error(\"Invalid message received.\",e),K)):e)},t0=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var n=(e,n)=>el(e)&&!0===n?e:o(e=eu(e)?new Uint8Array(e$(e.length,r=>255&e.charCodeAt(r))):r?R(()=>JSON.stringify(e),()=>JSON.stringify(tZ(e,!1,t))):tZ(e,!0,t),n);if(r)return[e=>tZ(e,!1,t),e=>null==e?K:R(()=>tQ(e),K),(e,r)=>n(e,r)];var[a,i,o]=tK(e);return[(e,r)=>(r?Y:tB)(a(tZ(e,!0,t))),e=>null!=e?tQ(i(e instanceof Uint8Array?e:tJ(e))):null,(e,r)=>n(e,r)]};if(!e){var n=+(r.json??0);if(n&&!1!==r.prettify)return(g??=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[+n]}return t(e,r)};t0(),t0(null,{json:!0,prettify:!0});var t1=rB(\"\"+rL.currentScript.src,\"#\"),t2=rB(\"\"+(t1[1]||\"\"),\";\"),t4=t1[0],t6=t2[1]||rj(t4,!1)?.host,t5=e=>!!(t6&&rj(e,!1)?.host?.endsWith(t6)===H),t3=(...e)=>rJ(eP(e),/(^(?=\\?))|(^\\.(?=\\/))/,t4.split(\"?\")[0]),t8=t3(\"?\",\"var\"),t9=t3(\"?\",\"mnt\");t3(\"?\",\"usr\");var[t7,ne]=t0(),[nr,nt]=[rW,rW],[nn,na]=rS(),ni=e=>{nt===rW&&([nr,nt]=t0(e),na(nr,nt))},no=e=>r=>ns(e,r),ns=(...e)=>{var r=e.shift();console.error(eu(e[1])?e.shift():e[1]?.message??\"An error occurred\",r.id??r,...e)},[nl,nu]=rS(),[nc,nf]=rS(),nd=e=>np!==(np=e)&&nu(np=!1,ny(!0,!0)),nv=e=>nh!==(nh=!!e&&\"visible\"===document.visibilityState)&&nf(nh,!e,ng(!0,!0));nl(nv);var np=!0,nh=!1,ng=rd(!1),ny=rd(!1);tr(window,[\"pagehide\",\"freeze\"],()=>nd(!1)),tr(window,[\"pageshow\",\"resume\"],()=>nd(!0)),tr(document,\"visibilitychange\",()=>(nv(!0),nh&&nd(!0))),nu(np,ny(!0,!0));var nm=!1,nb=rd(!1),[nw,nk]=rS(),nS=rp({callback:()=>nm&&nk(nm=!1,nb(!1)),frequency:2e4,once:!0,paused:!0}),nI=()=>!nm&&(nk(nm=!0,nb(!0)),nS.restart());tr(window,\"focus\",nI),tr(window,\"blur\",()=>nS.trigger()),tr(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nI),nI(),(O=y||(y={}))[O.View=-3]=\"View\",O[O.Tab=-2]=\"Tab\",O[O.Shared=-1]=\"Shared\";var nA=rT(y,!1,\"local variable scope\"),nE=e=>nA.tryParse(e)??tf(e),nT=e=>!!nA.tryParse(e?.scope),nx=rx({scope:nA},tv),nN=e=>null==e?void 0:eu(e)?e:e.source?nN(e.source):`${nE(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nO=e=>{var r=e.split(\"\\0\");return{scope:+r[0],key:r[1],targetId:r[2]}},nj=0,nC=void 0,nU=()=>(nC??rW())+\"_\"+nM(),nM=()=>++nj,n$=e=>crypto.getRandomValues(e),n_=()=>rJ(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^n$(new Uint8Array(1))[0]&15>>e/4).toString(16)),nF={},nP={id:nC,heartbeat:rf()},nq={knownTabs:{[nC]:nP},variables:{}},[nz,nR]=rS(),[nD,nB]=rS(),nJ=rW,nV=e=>nF[nN(e)],nW=(...e)=>nL(e.map(e=>(e.cache=[rf(),3e3],nx(e)))),nK=e=>e$(e,e=>e&&[e,nF[nN(e)]]),nL=e=>{var r=e$(e,e=>e&&[nN(e),e]);if(r?.length){var t=nK(e);e9(nF,r);var n=eH(r,e=>e[1].scope>y.Tab);n.length&&(e9(nq.variables,n),nJ({type:\"patch\",payload:eL(n)})),nB(t,nF,!0)}};nn((e,r)=>{nl(t=>{if(t){var n=r(sessionStorage.getItem($));sessionStorage.removeItem($),nC=n?.[0]??rf().toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nF=eL(eq(eH(nF,([,e])=>e.scope===y.View),e$(n?.[1],e=>[nN(e),e])))}else sessionStorage.setItem($,e([nC,e$(nF,([,e])=>e.scope!==y.View?e:void 0)]))},!0),nJ=(r,t)=>{e&&(localStorage.setItem($,e([nC,r,t])),localStorage.removeItem($))},tr(window,\"storage\",e=>{if(e.key===$){var n=r?.(e.newValue);if(n&&(!n[2]||n[2]===nC)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)t.active||nJ({type:\"set\",payload:nq},a);else if(\"set\"===i&&t.active)e9(nq,o),e9(nF,o.variables),t.trigger();else if(\"patch\"===i){var s=nK(e$(o,1));e9(nq.variables,o),e9(nF,o),nB(s,nF,!1)}else\"tab\"===i&&(e9(nq.knownTabs,a,o),o&&nR(\"tab\",o,!1))}}});var t=rp(()=>nR(\"ready\",nq,!0),-25),n=rp({callback(){var e=rf()-1e4;eV(nq?.knownTabs,([r,t])=>t[0]<e&&rt(nq.knownTabs,r)),nP.heartbeat=rf(),nJ({type:\"tab\",payload:nP})},frequency:5e3,paused:!0}),a=e=>{nJ({type:\"tab\",payload:e?nP:void 0}),e?(t.restart(),nJ({type:\"query\"})):t.toggle(!1),n.toggle(e)};nl(e=>a(e),!0)},!0);var[nG,nH]=rS(),[nX,nY]=rS(),nZ=((e,{timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var a=()=>(t?nt:ne)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(t?nr:t7)([nC,rf()+r]));return async(t,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<rf())&&(o(),a()?.[0]===nC))return r>0&&(i=setInterval(()=>o(),r/2)),await V(t,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=rb(),[f]=tr(window,\"storage\",r=>{r.key!==e||r.newValue||c.resolve()});await rw(rm(s??r),c),f()}null==s&&F(e+\" could not be acquired.\")}})(M+\"rq\"),nQ=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=t=>{var s=ew(r)?r?.(a,t):r;return!1!==s&&(null!=s&&!0!==s&&(a=s),nH(e,a,t,e=>(o=a===K,a=e)),!o&&(i=n?nr(a,!0):JSON.stringify(a)))};if(!t)return await nZ(()=>eW(1,async r=>{if(!s(r))return eT();var t=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(t.status>=400)return 0===r?eT(F(`Invalid response: ${await t.text()}`)):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rm((1+r)*200));var o=n?new Uint8Array(await t.arrayBuffer()):await t.text(),l=o?.length?(n?nt:JSON.parse)?.(o):K;return null!=l&&nY(l),eT(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||F(\"Beacon send failed.\"))},n0=[\"scope\",\"key\",\"targetId\",\"version\"],n1=[...n0,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],n2=[...n0,\"init\",\"purpose\",\"refresh\"],n4=[...n1,\"value\",\"force\",\"patch\"],n6=new Map,n5=(e,r)=>{var t=rp(async()=>{var e=e$(n6,([e,r])=>({...nO(e),result:[...r]}));e.length&&await u.get(...e)},3e3),n=(e,r)=>r&&eB(r,r=>e5(n6,e,()=>new Set).add(r)),a=(e,r)=>{if(e){var t,a=nN(e),i=rn(n6,a);if(i?.size){if(e?.purposes===r?.purposes&&e?.classification==r?.classification&&P(e?.value,r?.value))return;eV(i,i=>{t=!1,i?.(e,r,(e=!0)=>t=e),t&&n(a,i)})}}};nl((e,r)=>t.toggle(e,e&&r>=3e3),!0),nD(e=>eV(e,([e,r])=>a(e,r)));var i=new Map,o=(e,r)=>e9(i,e,et(r)?r?void 0:0:r),u={get:(...t)=>tp(async()=>{(!t[0]||eu(t[0]))&&(a=t[0],t=t.slice(1)),r?.validateKey(a);var a,i=[],s=e$(t,(e,r)=>[e,r]),l=[],u=(await nQ(e,()=>!!(s=e$(s,([e,r])=>{if(e){var t=nN(e);n(t,e.result);var a=nV(t);e.init&&o(t,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<rf())rl(i,[{...a,status:d.Success},r]);else if(!nT(e))return[ri(e,n2),r];else if(ey(e.init)){var u={...nx(e),status:d.Created,...e.init};null!=u.value&&(rl(l,c(u)),rl(i,[u,r]))}}else rl(i,[{...e,status:d.Denied,error:\"No consent for \"+ts.logFormat(s)},r])}})).length&&{variables:{get:e$(s,0)},deviceSessionId:r?.deviceSessionId}))?.variables?.get??[];return rl(i,...e$(u,(e,r)=>e&&[e,s[r][1]])),l.length&&nL(l),i.map(([e])=>e)},e$(t,e=>e?.error)),set:(...t)=>tp(async()=>{(!t[0]||eu(t[0]))&&(n=t[0],t=t.slice(1)),r?.validateKey(n);var n,a=[],i=[],u=e$(t,(e,r)=>{if(e){var t=nN(e),n=nV(t);if(o(t,e.cache),nT(e)){if(null!=e.patch)return F(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nA(e.scope),key:e.key};return i[r]={status:n?d.Success:d.Created,source:e,current:u},void rl(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[ri(e,n4),r]}}),f=u.length?z((await nQ(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:r?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&nL(a),eV(f,(e,r)=>{var[t,n]=u[r];e.source=t,t.result?.(e),i[n]=e}),i},e$(t,e=>e?.error))},c=(e,r=rf())=>({...ri(e,n1),cache:[r,r+(rn(i,nN(e))??3e3)]});return nX(({variables:e})=>{if(e){var r=rf(),t=eq(e$(e.get,e=>tg(e)),e$(e.set,e=>tg(e)));t?.length&&nL(eB(t,c,r))}}),u},n3=(e,r,t=rV)=>{var n=[],a=new WeakMap,i=new Map,o=(e,r)=>e.metadata?.queued?e3(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):F(\"Source event not queued.\"),s=async(t,n=!0,a)=>{var i;return(!t[0]||eu(t[0]))&&(i=t[0],t=t.slice(1)),nQ(e,{events:t=t.map(e=>(r?.validateKey(i??e.key),e3(e,{metadata:{posted:!0}}),e3(tu(rs(e),!0),{timestamp:e.timestamp-rf()}))),variables:a,deviceSessionId:r?.deviceSessionId},{beacon:n})},l=async(e,{flush:t=!1,async:a=!0,variables:i}={})=>{if((e=e$(ev(e),e=>e3(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eV(e,e=>void 0),!a)return s(e,!1,i);if(!t){e.length&&rl(n,...e);return}n.length&&ru(e,...n.splice(0)),e.length&&await s(e,!0,i)};return t>0&&rp(()=>l([],{flush:!0}),t),nc((e,r,t)=>{if(!e&&(n.length||r||t>1500)){var a=e$(i,([e,r])=>{var[t,n]=r();return n&&i.delete(e),t});(n.length||a.length)&&l(eq(n.splice(0),a),{flush:!0})}}),{post:l,postPatch:(e,r,t)=>l(o(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!0){var n=!1,s=()=>n=!0;return a.set(e,rs(e)),i.set(e,()=>{var i=a.get(e),[l,u]=(t?rc(r(i,s),i):r(i,s))??[];return l&&!P(u,i)?(a.set(e,rs(u)),[o(e,l),n]):[void 0,n]}),s}}},n8=Symbol(),n9=e=>{var r=new IntersectionObserver(e=>eV(e,({target:e,isIntersecting:r,boundingClientRect:t,intersectionRatio:n})=>e[n8]?.(r,t,n)),{threshold:[.05,.1,.15,.2,.3,.4,.5,.6,.75]});return(t,n)=>{if(n&&(a=eH(n?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==H))&&eX(a)){var a,i,o,s,l=G,u=0,c=rv(tP.impressionThreshold),f=ap();t[n8]=(r,n,d)=>{f(r=d>=.75||n.top<(i=window.innerHeight/2)&&n.bottom>i),l!==(l=r)&&(l?c(()=>{++u,o||rl(e,o=eH(e$(a,e=>(e.track?.impressions||t_(t,\"impressions\",H,e=>e.track?.impressions))&&W({type:\"impression\",pos:r9(t),viewport:tn(),timeOffset:ag(),impressions:u,...aN(t,H)})||null))),o?.length&&(s=e$(o,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:f(),impressions:u}))))}):(eV(s,e=>e()),c(!1)))},r.observe(t)}}},n7=()=>{var e=rK?.screen;if(!e)return{};var{width:r,height:t,orientation:n}=e,a=r<t,i=n?.angle??rK.orientation??0;return(-90===i||90===i)&&([r,t]=[t,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rK.devicePixelRatio,width:r,height:t,landscape:a}}},ae=e=>rl(e,W({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:b?.clientId,languages:e$(navigator.languages,(e,r,t=e.split(\"-\"))=>W({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...n7()})),ar=(e,r=\"A\"===r6(e)&&rQ(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),at=(e,r=r6(e),t=t_(e,\"button\"))=>t!==G&&(q(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&q(r1(e,\"type\"),\"button\",\"submit\")||t===H),an=e=>{if(m)return m;eu(e)&&([r,e]=ne(e),e=t0(r)[1](e)),e9(tP,e),ni(rn(tP,\"encryptionKey\"));var r,t=rn(tP,\"key\"),n=rK[tP.name]??[];if(!ef(n)){F(`The global variable for the tracker \"${tP.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...r)=>{var t=H;i=eH(i,n=>R(()=>(n[e]?.(...r,{tracker:m,unsubscribe:()=>t=G}),t),no(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nU(),e.timestamp??=rf(),v=H;var r=G;return e$(a,([,t])=>{(r||t.decorate?.(e)===G)&&(r=H)}),r?void 0:e},validateKey:(e,r=!0)=>!t&&!e||e===t||!!r&&F(`'${e}' is not a valid key.`)},u=n5(t8,l),c=n3(t8,l),f=null,d=0,v=G,p=G;return Object.defineProperty(rK,tP.name,{value:m=Object.freeze({id:\"tracker_\"+nU(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||eu(e[0]))&&(r=e[0],e=e.slice(1)),eu(e[0])){var r,t=e[0];e=t.match(/^[{[]/)?JSON.parse(t):ne(t)}var n=G;if((e=eH(eF(e,e=>eu(e)?ne(e):e),e=>{if(!e)return G;if(a$(e))tP.tags=e9({},tP.tags,e.tagAttributes);else if(a_(e))return tP.disabled=e.disable,G;else if(aq(e))return n=H,G;else if(aV(e))return e(m),G;return p||aR(e)||aP(e)?H:(s.push(e),G)})).length||n){var h=e4(e,e=>aP(e)?-100:aR(e)?-50:aJ(e)?-10:tw(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(r??g.key),R(()=>{var e,r=f[d];if(o(\"command\",r),v=G,tw(r))c.post(r);else if(az(r))u.get(...ev(r.get));else if(aJ(r))u.set(...ev(r.set));else if(aR(r))rl(i,r.listener);else if(aP(r))(e=R(()=>r.extension.setup(m),e=>ns(r.extension.id,e)))&&(rl(a,[r.priority??100,e,r.extension]),e4(a,([e])=>e));else if(aV(r))r(m);else{var t=G;for(var[,e]of a)if(t=e.processCommand?.(r)??G)break;t||ns(\"invalid-command\",r,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>ns(m,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:H}),configurable:!1,writable:!1}),nz(async(e,r,t,a)=>{if(\"ready\"===e){var i=tb((await u.get({scope:\"session\",key:C,refresh:!0},{scope:\"session\",key:U,refresh:!0,cache:L}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ae(m),i.hasUserAgent=!0),p=!0,s.length&&rl(m,s),a(),rl(m,...e$(aj,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),m},aa=()=>b?.clientId,ai={scope:\"shared\",key:\"referrer\"},ao=(e,r)=>{m.variables.set({...ai,value:[aa(),e]}),r&&m.variables.get({scope:ai.scope,key:ai.key,result:(t,n,a)=>t?.value?a():n?.value?.[1]===e&&r()})},as=rd(),al=rd(),au=rd(),ac=1,af=()=>al(),[ad,av]=rS(),ap=e=>{var r=rd(e,as),t=rd(e,al),n=rd(e,au),a=rd(e,()=>ac);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),interactiveTime:n(e,i),activations:a(e,i)})},ah=ap(),ag=()=>ah(),[ay,am]=rS(),ab=(e,r)=>(r&&eV(ak,r=>e(r,()=>!1)),ay(e)),aw=new WeakSet,ak=document.getElementsByTagName(\"iframe\"),aS=e=>(null==e||(e===H||\"\"===e)&&(e=\"add\"),eu(e)&&q(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ep(e)?e:void 0);function aI(e){if(e){if(null!=e.units&&q(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aA=e=>tF(e,void 0,e=>e$(ev(e5(tE,e)?.tags))),aE=e=>e?.component||e?.content,aT=e=>tF(e,r=>r!==e&&!!aE(e5(tE,r)),e=>(k=e5(tE,e),(k=e5(tE,e))&&eF(eq(k.component,k.content,k),\"tags\"))),ax=(e,r)=>r?e:{...e,rect:void 0,content:(S=e.content)&&e$(S,e=>({...e,rect:void 0}))},aN=(e,r=G)=>{var t,n,a,i=[],o=[],s=0;return rY(e,e=>{var n=e5(tE,e);if(n){if(aE(n)){var a=eH(ev(n.component),e=>0===s||!r&&(1===s&&e.track?.secondary!==H||e.track?.promote));t=e2(a,e=>e.track?.region)&&te(e)||void 0;var l=aT(e);n.content&&ru(i,...e$(n.content,e=>({...e,rect:t,...l}))),a?.length&&(ru(o,...e$(a,e=>(s=eY(s,e.track?.secondary?1:2),ax({...e,content:i,rect:t,...l},!!t)))),i=[])}var u=n.area||t$(e,\"area\");u&&ru(o,...e$(u))}}),i.length&&rl(o,ax({id:\"\",rect:t,content:i})),eV(o,e=>{eu(e)?rl(n??=[],e):(e.area??=eP(n,\"/\"),ru(a??=[],e))}),a||n?{components:a,area:eP(n,\"/\")}:void 0},aO=Symbol();j={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=rL.cookie.match(/CookieConsent=([^;]*)/)?.[1],r=1;return e?.replace(/([a-z]+):(true|false)/g,(e,t,n)=>(\"true\"===n&&(r|=j[t]??0),\"\")),{level:r>1?1:0,purposes:r}}}}});var aj=[{id:\"context\",setup(e){rp(()=>eV(ak,e=>re(aw,e)&&am(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(t,n,a)=>(null==b||!t?.value||b?.definition?r=t?.value:(b.definition=t.value,b.metadata?.posted&&e.events.postPatch(b,{definition:r})),a())});var r,t=nV({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nV({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&nW({scope:\"tab\",key:\"tabIndex\",value:n=nV({scope:\"shared\",key:\"tabIndex\"})?.value??nV({scope:\"session\",key:C})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=G)=>{if(!r8(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=rj(location.href+\"\",!0);b={type:\"view\",timestamp:rf(),clientId:nU(),tab:nC,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:t+1,viewport:tn(),duration:ah(void 0,!0)},0===n&&(b.firstTab=H),0===n&&0===t&&(b.landingPage=H),nW({scope:\"tab\",key:\"viewIndex\",value:++t});var u=rC(location.href);if(e$([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>(b.utm??={})[e]=u[`utm_${e}`]?.[0]),!(b.navigationType=w)&&performance&&e$(performance.getEntriesByType(\"navigation\"),e=>{b.redirects=e.redirectCount,b.navigationType=rJ(e.type,/\\_/g,\"-\")}),w=void 0,\"navigate\"===(b.navigationType??=\"navigate\")){var c=nV(ai)?.value;c&&t5(document.referrer)&&(b.view=c?.[0],b.relatedEventId=c?.[1],e.variables.set({...ai,value:void 0}))}var c=document.referrer||null;c&&!t5(c)&&(b.externalReferrer={href:c,domain:tt(c)}),b.definition=r,r=void 0,e.events.post(b),e.events.registerEventPatchSource(b,()=>({duration:ag()})),av(b)}};return nw(e=>au(e)),nc(e=>{e?(al(H),++ac):(al(G),au(G))}),tr(window,\"popstate\",()=>(w=\"back-forward\",i())),e$([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),w=\"navigate\",i()}}),i(),{processCommand:r=>aM(r)&&(rl(e,r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),H),decorate(e){!b||tk(e)||tc(e)||(e.view=b.clientId)}}}},{id:\"components\",setup(e){var r=n9(e),t=e=>null==e?void 0:{...e,component:ev(e.component),content:ev(e.content),tags:ev(e.tags)},n=({boundary:e,...n})=>{e7(tE,e,e=>t(\"add\"in n?{...e,component:eq(e?.component,n.component),content:eq(e?.content,n.content),area:n?.area??e?.area,tags:eq(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),r(e,e5(tE,e))};return{decorate(e){eV(e.components,e=>rn(e,\"track\"))},processCommand:e=>aF(e)?(n(e),H):aB(e)?(e$(((e,r)=>{if(!r)return[];var t=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=rQ(a,e);){re(n,a);var o=rB(rQ(a,e),\"|\");rQ(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ec(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&r[u]&&(l=r[u]),rl(i,l)}}rl(t,...e$(i,e=>({add:H,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),t})(e.scan.attribute,e.scan.components),n),H):G}}},{id:\"navigation\",setup(e){var r=r=>{tr(r,[\"click\",\"contextmenu\",\"auxclick\"],t=>{var n,a,i,o,s=G;if(rY(t.target,e=>{var r;at(e)&&(o??=e),s=s||\"NAV\"===r6(e),a??=t_(e,\"clicks\",H,e=>e.track?.clicks)??((r=ev(tT(e)?.component))&&e2(r,e=>e.track?.clicks!==G)),i??=t_(e,\"region\",H,e=>e.track?.region)??((r=tT(e)?.component)&&e2(r,e=>e.track?.region))}),o){var l,u=aN(o),c=aA(o);a??=!s;var f={...(i??=H)?{pos:r9(o,t),viewport:tn()}:null,...(rY(t.target??o,e=>\"IMG\"===r6(e)||e===o?(n={element:{tagName:e.tagName,text:rQ(e,\"title\")||rQ(e,\"alt\")||e.innerText?.trim().substring(0,100)||void 0}},G):H),n),...u,timeOffset:ag(),...c};if(ar(o)){var d=o.hostname!==location.hostname,{host:v,scheme:p,source:h}=rj(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===t.button&&rl(e,W({type:\"anchor_navigation\",anchor:o.hash,...f}));return}var g=W({clientId:nU(),type:\"navigation\",href:d?o.href:h,external:d,domain:{host:v,scheme:p},self:H,anchor:o.hash,...f});if(\"contextmenu\"===t.type){var y=o.href,m=t5(y);if(m){ao(g.clientId,()=>rl(e,g));return}var b=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!m){if(!tP.captureContextMenu)return;o.href=t9+\"=\"+b+encodeURIComponent(y),tr(window,\"storage\",(r,t)=>r.key===_&&(r.newValue&&JSON.parse(r.newValue)?.requestId===b&&rl(e,g),t())),tr(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),o.href=y})}return}t.button<=1&&(1===t.button||t.ctrlKey||t.shiftKey||t.altKey||rQ(o,\"target\")!==window.name?(ao(g.clientId),g.self=G,rl(e,g)):r8(location.href,o.href)||(g.exit=g.external,ao(g.clientId)));return}var w=(rY(t.target,(e,r)=>!!(l??=aS(tT(e)?.cart??t$(e,\"cart\")))&&!l.item&&(l.item=e1(tT(e)?.content))&&r(l)),aI(l));(w||a)&&rl(e,w?W({type:\"cart_updated\",...f,...w}):W({type:\"component_click\",...f}))}})};r(document),ab(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=r3(H);ad(()=>ry(()=>(r={},t=r3(H)),250)),tr(window,\"scroll\",()=>{var n=r3(),a=r5();if(n.y>=t.y){var i=[];!r.fold&&n.y>=t.y+200&&(r.fold=H,rl(i,\"fold\")),!r[\"page-middle\"]&&a.y>=.5&&(r[\"page-middle\"]=H,rl(i,\"page-middle\")),!r[\"page-end\"]&&a.y>=.99&&(r[\"page-end\"]=H,rl(i,\"page-end\"));var o=e$(i,e=>W({type:\"scroll\",scrollType:e,offset:a}));o.length&&rl(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(r){if(aU(r)){var t=r.cart;return\"clear\"===t?rl(e,{type:\"cart_updated\",action:\"clear\"}):(t=aI(t))&&rl(e,{...t,type:\"cart_updated\"}),H}return aD(r)?(rl(e,{type:\"order\",...r.order}),H):G}})},{id:\"forms\",setup(e){var r=new Map,t=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=r0(i,tx(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&te(i).width,u=e5(r,i,()=>{var r,t=new Map,n={type:\"form\",name:r0(i,tx(\"form-name\"))||rQ(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ag()}));var s=()=>{o(),r[3]>=2&&(n.completed=3===r[3]||!l()),e.events.postPatch(n,{...a,totalTime:rf(H)-r[4]}),r[3]=1},u=rv();return tr(i,\"submit\",()=>{a=aN(i),r[3]=3,u(()=>{i.isConnected&&te(i).width>0?(r[3]=2,u()):s()},750)}),r=[n,t,i,0,rf(H),1]});return e5(u[1],n)||e$(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||t_(e,\"ref\"))&&(e.value||(e.value=n_()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:rJ(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[aO]:t(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[r,t]=n(e)??[],a=t?.[1].get(r))=>a&&[t[0],a,r,t],i=null,o=()=>{if(i){var[e,r,n,a]=i,o=-(s-(s=af())),u=-(l-(l=rf(H))),c=r[aO];(r[aO]=t(n))!==c&&(r.fillOrder??=a[5]++,r.filled&&(r.corrections=(r.corrections??0)+1),r.filled=H,a[3]=2,eV(e.fields,([e,t])=>t.lastField=e===r.name)),r.activeTime+=o,r.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&tr(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&a(e.target))=>t&&(i=t,\"focusin\"===e.type?(l=rf(H),s=af()):o()));u(document),ab(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>await e.variables.get({scope:\"session\",key:U,result:r}).value,t=async t=>{if(t){var n=await r();if(!n||ti(n,t=to(t)))return[!1,n];var a={level:ta.lookup(t.classification),purposes:ts.lookup(t.purposes)};return await e.events.post(W({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:U}]}}),[!0,a]}},n={};return{processCommand(e){if(aW(e)){var a=e.consent.get;a&&r(a);var i=to(e.consent.set);i&&(async()=>i.callback?.(...await t(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=rp({frequency:o.pollFrequency??1e3}),c=async()=>{if(rL.hasFocus()){var e=to(o.poll());e&&!ti(s,e)&&(await t(e),s=e)}};u.restart(o.pollFrequency,c).trigger()}return H}return G}}}}],aC=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&r?.[e]!==void 0),aU=aC(\"cart\"),aM=aC(\"username\"),a$=aC(\"tagAttributes\"),a_=aC(\"disable\"),aF=aC(\"boundary\"),aP=aC(\"extension\"),aq=aC(H,\"flush\"),az=aC(\"get\"),aR=aC(\"listener\"),aD=aC(\"order\"),aB=aC(\"scan\"),aJ=aC(\"set\"),aV=e=>\"function\"==typeof e,aW=aC(\"consent\");Object.defineProperty(rK,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(an)}})})();\n//# sourceMappingURL=index.min.js.map\n",
        gzip: "H4sIAAAAAAACCqW9aXvbOLI2_P35FTYn4yEjWJbkJTYVhidJZ187SacXRUloCbKZyKSapOy4JZ3f_tZdBXCR7Z4-1zvTsUgAxFqoHQXX9YJ7C2ee6428yOJR4fTPo2xDq0wVKlGRilWqcjVVczVSEzVW52qmTtWJulRn6lhdqO_qvXqm7qtH6oP6oV6rN-qbehg4_xMnk9RRv9DTKE1ynRSOehU4X4oonvqOuhW8ajl5ERXaUV_wPJvnp456HLjUcqCDe4-yLM1c7aF3xWmWXmzouauDLEVaiBxfr9RbLq-KYLuLgvGEigRBtly6OgwzLwiS-XTqZbqYZ8lmp4_8GX26tUU_GX7aU52cFKf4yDx6C4w_CTr9CXUAz9FGnGxoj2sfRMNNKks_W1ubb_ld4U0V1APbULffaiUreaGaguDN8Tc9Ktrf9WVOzZqGVrb0Sv0pw2i32wUNwwyhMOXudba2inaenmk3C-79iZKep_7iT6g0RrgZ6FD7j90sDJ37G5n-cx5nerxxHk3neiPON87iPI-TE0fRxH64nGkzue1Mz6bRSLsOtewoB0Xtx23Ho1beyXpsdlTBC5FdLsywtOutRlExOqXpLNMuaHShHmOdeJke8zL5ukA6wCCd6rbmxjOT6fnZahIn0XR6uSjCNtW6Uj8BAHgZsLQA0KIdJ3ERR9P4Lz1eLrMw82kyBBjaxalOQnrjB2r7ntsozr2noVLj5_RG0OV5_t8X8fpmRMVKPag6Eyxq3_j4hhr0n7vooZutVyi981a2rmylntfq-olyTRbNMab3o5upAT0OvZX6GET5ZTK6MvsCm9FFFBcb3ICtXU8wx9mgM6RJTDw_qVYHcIsV4KfMM7up31wP7a30NNdceGILb2aD7rD8wI6D0lCct4btCjVKfaFPsFloXycjnU42GM7M95H9PlqVCy4f22X_FbOj1YvgPI3HGx31Mng9PzvWWfvV_d--vL__-NGXZ68_PHry6J16Emx21VNMzG8MHouV-l0-_gM_Zkuon4P3l2fH6bQdFzqLijRTWttt4xJ2owqw3dzCCws_29pK6D_-tLAPbkGQXHjIf6F0Zj82gE6Y4IWgohe-DtuDbMgpGmULdMQ5TmmGo8QJgoK2Hc2IVjoJtKYFwV7sUC-3ttxuEOjl0plEtAAOVYE0p8jmmr5DzgtsRR2hxs1NqiHmsVLeU6VTfqaPniid2wmL8_fRRD9LCn2iadBT7kvCeY2uzDkDeJ-QQz1jxH2co480sCJ9z0VcdGMS3M-y6JLa4F9FwI5SV5Zd6XODPLoGS9FYwhf-Jk00QZim-fP1d_wOCPvooT_QQ6Vn1fphGpyUMWejb6cWnc6ytEiRrvSJTTvRxVub_Gai9GUNHqjdE2oPc3qq9JldTGcyT0ZFnNZXiRdT6WOZHwaiRh8uOOOaD5X-Xhv15qaLqn4eYkGvDIXwGCb0_ZX5exXNlH52Jfk9gOZ-He-bGe2CYNB0voqK03aWzhPCwLcJP_L7LL1wu4SNiF51QLoIdXYInnZogR5hG-kPaMjFS0dp6s8PO2VSO8E6rxXRnoyX6LWhuYz0wrDwGOgJ7-ofVFJRUkAIi_6-VC4xEFQs296migr6S2SK0_zELwj5K_0mEBCbxFPao-4f1P43U79KaqMcDOuA84ZJB81raJfgNs8KcJZZbIPsFhm6RQgd2KqoEfVkA0vglR-4Ce30RBWtlkd8gXsZ6-l4I6HuPPIWPFH940xH31eMJTfWapEqktp3qxWQesAIwtevXRkPdRrsx3qvb-6jMB6CaQeJ0oNkOASWpalwI-pwJB1W0oGo7EB0TcfRo3pPvrmytI3OUJ9vQLreAt2ShrKyIeo1rWuJLmkkoB19z-TyLFBzfq0Rgg5ZKX23402YFQiDbb3d7etWq_xye7tfzjSDVF9Tks1ttbhmgjYa6EO7JQDjAiEGpdCAf6lDE8ZsXpR-ZXnHLihBF6wuQLrsKbE4hgeuwZX0PCPQWy4Tw0Z6dr1iQEMUUisZsTVelzZGEXKPb2s3BotItRHN8WUUsYzQTtXKc03_0BNaWC7dpZ7eqo-B2xeAUTxYCx8dFQeDIQNPERR3O6FlbluFT9uxQ6NM6qmJn4TlW7-4m2D2HvUBUFwjUZZBMezT7KcEaamKKMNPabdjJra24jZYdjf1LKMr6CQu-V7Ll567-pey_0QqV0p_Wd_iKJjoC6A4l9eu-mLogZw-vnaxUPcrtyarAJ--rfBTA4uBPXrm6lsuBAkCEYYPmkSaG8eh_TA3eE7KgPQxYuWvGa1RKaWJVUf_PMvHlfzXR5dLm_kMNXFiPtdSUh-G48HQk4lDLefMISriDPVfjTXmFaX17Pz_WE5eyQoh0loapIFHFVNmGEZAE008UXJpSr-zG4v7A4apLhQ18SdwT8EYKeGaixtrJp5a__S3NTPWo5pR34C6SPLVsF7tTbU-aIhRtcVnNsOuKk2AFKE9ah-Vfn51_vtr1ER2m13vv8ryfe4qoXojIv48LAu942GiwFXyXxb6iQutGlikhqkMdYl59WKvxkYr_THQz5X-tRIWrh0AzYJt7EW_2UxtZ1akMDZcfeyZNm-adADJC8t6TbL07FFCjKLOlX5ZbcLFdb2wMgmJuVbgXqxqe4mQO7EUzD2YTrFMSQleSWw0CSJB4SYD7DViTCCroMcmIeAEH_wF6iMGiTkNSrQozLVF6_uSvwLJulq8XjFmjIqVyO-FYI0sNMIcMTOZkKiuVIW3LuRBpZ8EFc6yixWzIENoCsKI6_lFORnPqTD9h2VlaUThOQxj1-Pv-YkqfVqqTqz4QyIIINa0oh8KeTH9k86xrIJ8dFT_FvwzEGLOivi9p1ycsDHvAis-mtWJKlxIaCknqbjcO1zrZn2j1BUkek1BwqRNZoG61WphyB0a8O-B7N4mM6yn2OvM-Z5FP2wJXz8xQ8doA4iwIcuxzJzUsMVySRVEBEURLX5ECPyFygY96Hh2CSr0HxVYCzq5ZMxCb1QZLzPnKv0zC2s8_8Ql1PDPe_uBr5-ZR5L5N4lYGIw4IMZ8aBlFMy9athVLmkp3rmOQX_gVV_C8WuZN1oUFstrU2gepgze80t3ra-Ju00wIRRzYddzGENfqroGRcFW9G6q85JnYzMJrl_pex9es4grboJIaa8xNlftpc1Oaotn84IKH4u3Cj9xYGEKW2Ss3ASg0hK88zQq3gnlvm-V5FnQOaoKMbkMdQjL3qEizUmMXiiYiAB831lNd6A1NgqGPP0Hh13J1W_LLB7CAjU_auUaxHGhPQfhpR-NxiCT6Ren6l9IAQ9J-E5MaUnRtdwUzUndK0kLV9AW7aojGIf-Vxk6jPOS_tj2LcMpRXaMOoXoqDIW1OODOJcCEtCV3a1vS1dBnZYx9M-USWBdDjKGs0gVMULuo5hKV6l1-58nh8Xsrs1KHLKLWMCZjoEZ_CUmHFcPuo3WaP2p9wlUjh3A3_WGagEx3QGWHrAAyFBDiBI3iKNCHrj6gdu_gqdrxMlg7A3pfVLE-4CkrFUvrInu4aWcZQzaLzVKAqQCajiPBpATLWalkwiBFjS0ESOgkIXX5rKQPZ_TqCOg43k3wpwpan6yorY-pbTA0DDWyWNdfARpKTAlZxiRz1jTk292QZnXqhS40aGraJpbiUTQ6hXq6ECKaZTI3mJ1ayhSa1xu_jeyUEnNKe5m_903i1CbSw6b-jZFJurWVJS56TOJ2yRZRYZrGJCQumRacBp3UJ7Tiulhf6loMbfFQN8xKlMEi5TY01B7Rkhm6yLparLmImdndit9v57NpPAIsdT3w_gKWvpkJ6kd0dfLdbI3UZl5TAUsbAypdesls_V2vnDPaFAVq5xJmAlZE3URHQQT4FrQKUVm-3IQGB4_1JE702yyd6ay4ZBBcEF6ZxCfzLDqeah8oNZmfafPWURdZXNgcGkqCP7x5oeAi1OIQ614slw5bHvgFqlPeMYT8rUUjXFBRv1j5Cy5HT6v6EmZrAwQSoPmL6_NHc2P3fcWZXGVEXaprGhWvaPWAC2aMCxgjFHZJBRC6NfgOB5hR4ifxMxz6WeyaZ26eMQioNG0reloj0QZWyqkeYFsLiQAZkLqA41AJYSAIY1SNVYBV7BtzszRsUfCKEs6FzizLhcixycvAIYEfWoV0kyMTxijfKkEuTZGXIN1iYGCmg4oWXJS6skDZleFJrCSeVTJTVSs0b-9tKUxsVYrZY1TLDLKpWXOfp7XFI6psJWDa69m8mTVP8tN4UtjcUX33bmI_WDaSRqCFuhnhHxKE7JmamPbRDDodmjpStt8Ri2X2VxGkxtjhpkE2InzCubaG_iClCQtS2VPEHKZAF1M3AcinAX--DRmQPgpS5UYkS2QAAw8JgGwVhYNYRRYj0JJOAmeeyOYbO5tWIKRNSHB_BsoBbepTng5mZInOk3SXTdwnNP-1Yu0iPtNvsvgkTlr15CS9IEj5KSr4UWVjSE-wSLGMQfV4dcm7pW9nJEsQl23NUTEJDynbSIh3i1rBdtJi9SjQsUpZJiQUS3WygCg5BNE0Mqj8g45XWe-ofhdLoxublvZDZI2lm0V_NNVR9oHGks4LZmALYsFDaBRiaDhSX8eey1YigjravH5hTEQ-9TCiYRFTZT_HCBPiCqFCw9fbsR_XjHAJdXIm-6dT4WHZXosJjJ86GV36mRpF0-lxNPruY1eoBaUTomKaNYvmuR77Eagm7fmTE535MV5Smns_xVP5cW7MU6uA5LkAqMm0QCJMX8hrR82D7Bh8rDVA0mKMgmzsbpJYNglG9DoWAX9Dm20wXS43iTubt2c6GcfJidHt68oATaVm7eN5fokem0xI_v3ym74nQv68ZCSWyzm6QLNPiyuZH3k-cxed2J60XO4OLTaNERmbGp0ouw3TymaXhIK7QWe5xEY5d6HAtD3pUk9Wis1CRbDJHPpIZGSGANirMqIIxB7QJ9GoiM8JbDfdKUEh9arMHqsMC5sRXfYJDmf0X7CQ4qBLaAu_1K0iygrfMP8Qj4iZUjmh4jBX5y5PDAA3PTkhimbZN5oq23ioCW265yxjzNpmrV206HOiz8PzZyUYlKskszdm3oIqsBUy31fCIlXJTdNCE7SuaBtEeb6RnS6-zIiCxbmYaA2T73qL4jTO7QKtiIKKfd8tze-cb79tcyYXEwPvDcU4k4sZuLipoMle2dU2Rq7rC9cK0QRTFn0GMvnfvrJlyo94sNeWDkB_shMpmMcnSTStuSLYuZJeSHUlcPMn4izA5pfr-lJmr1ZmXU6qdTEV96XDfZ7qPs9k30wTbbu11WOvmv7VIbyVZ9e1rA1J68JCVIZqS_74a9OCGCW8Wuf7YmivHDwcU_dGNM10NL7csB4OO9Jx9vJY1Ydf9r7LkzTIQoeH5fiGpSOSBk3nckmcC2FimUqS09SgPuN2utHIMND_h7lmsnFZIejsXiesYXcU8i_iZJxetBklv4pHWVpE-Xc2PZ6tGUeXyzh_DLcMwAAJYsulJtQUZimko_rkE3NYa0W0qdC3uaWnBZtqiQA-dr8-S2guiPyQeBVdbtxa6FX7KzV-LKZMBstT30BndlHaC95aKIfHTcmv1Tg7iJHfa9K-CO4im1n-iB-YtjFlSQhbQZLqAs-AarIMmTbyOsjLTJ7FPSltA-JKUghI74VIGbevwHB_puTArasDg-y7y54LGQuykM3xbEROXUohG7CNbW0xF6dVBAFFRSvlGtU8DZw4zzqbryXL89ChZ7L-AydKxo5y1IbDYjoz6bAz32K3n4ahhZn4AQlhLCN1FPGe7W9pnLis6gtRh6ecDYeFJX5o6LWGUpjtQOY785H_QmVicw-c_zgNnVbW0q1MZY_Efi7W9ml60mOvNeppZwmY_HCdYQdy9jV6c_eKvs_KBWBhM56FuQisU0CkETVMFg2oSF-mFzp7GOXgIijVU9NgrdLcI47DpPGm5qRRkLejhPgS0PPxnCbREsRlBoF6EmQhhIRcUSl_pJI00X5n5efEnPz3gUzWu8pKTs_wAmgl5x2aEcyEIgCNiX-GXtG_zqdFTHUvjNFugqL42xw_pRHpjbIcXzERwGrOsKMGp-pkSCMamEE2XFq48tosVOphEm1n1K68ENI4hwBFTKk7A5v1AsoNYuw8Qo4uN_PCA4-gwSvX0BLBCsE8TLseoAhsLka7NRpSTVFw4uqt_6V_I4-LlEJpDCGJxIiYWgmmFWDIjMI5Yov-ZI_qgMEQA-Nlqae4xkjpO1hMhxDQ0B-cVyZLaoYNlCGWwn8xVJdXfU9qIyJBlSfjsVtRoK-3Fs_fv3ndFhejeHIJezHcDJO02Ig2BI_eWhQr4WUIj0JaPGsMjwexmSyXbrIl3js8yhqyySKgEKybGvytAqO7UgsGCP-SeLbLt_x4qgyU-lMl-8Gfq2mafp_P_BMlM-VPzZQpFrIKqPpPsIa0M2jLP5ZEwRJELeFVRNvEEXxlCnoh0jacVuF_JYonw761MPbmc4tM77PCA3rR1dcV3HYWs3mm_TNFS2qZVKqUR3t2FQq00VWFYTl37IUIp8Lsx5rxOtA_u6wWEEZYEJk4yLrG1aZSHomuCi4oAXsT-tlVxZLQLCJYL_qVxlh0vGweLyrIg4KXwK_N6wGPxaKqLmbxczMq9c5RkNa-3u6GcfVd3LZLSW_cc9QdYdBMs2u-nNlr4xEI5PjGUpkl0Zg-6IwzhFzSKZUNlcXL6tChgytcJ3A8S79hGBilY_3Lu2cP07MZbSTgGggLZyQQWQ_b-9Op67TgYssUxuSWxJJpVOA4Khn0hgFeCcRDM1ra2B1o0MX_AZmmG-wcXVSay8J_4WGXoLYB_tJ2himTxv2t4cdbI2FfKH3nsxv6-G_w6aLV3h62PJ8Q0aedTzteSA-c89n_H0qnx094-Z_hbQLn_6FMShhQwqch5X4aLt1BZ_vIH7aWg887rWEr9LiI734a4wOudfD5XyF9zp-G9Om_uC56-5fbxtOtnZPSULfufG4h7DxY5Ok8I3Fbq3x0qs-0XyiaSb8INxMfovELFc2L0zSLi0s_UiSwk4xOknueX6TZ2E_VaZoXfh6GUzVLSUYUMJuHJbWYM6kgik6kjhjN7NJ62U387KE7gYQyyaKTM1ptf1xKdOdtfBLIDy3FebvsRXjephKhQ5z0jkMLpc6Jac4eWrcWhroM1nhnyxEbYla5LhmgNH5gQ2L-apa1lzBznbGz7w5N4-f27fBTuPzsmbmlRYQROzRAkwkxYuZP5UQD3zApYg0lnOxEV_nCF5satTUFvpkGpWtAHJZu4zufBp-Gt3YUsU1Eu8XdierNK5DM_ZSAEHwmTWckaj-S7qclRdT2Oy2O7aCgGhvFp0pbEPHt3MaD7DVtaxUTOL-qeXxZ96GsXZDAL-bN7FbFRjOIYxbZuvIlcK22kD003SIME3NOgEYdQfP2QsWhm2Ge6VuUdmseJUwWI8Ot0i41TgNi6bATI5_w-KSsSA9-YdYpoZ48Np6P5WQOPn2-9elT-3YrdD2a18VqOaSt4Hz6dGuLeNfsbbDz6a82pWR_lj7MhMDfupoG-FQUsNriDGqO0Bqtyjt98ugHkQPlnMwJ9WRvVfZXsKApfHfFvVSKquwnixcV4ysmK--Mv65om_8sPaQy8V2BmRXbEdS74KLhDnWVmjMcWvYXs2gBFmO5JETHOOfTjtsmHPFpJ1zy3qetPzd7H5jNdr6wned2swc0vSbnqxve3cS_T_Q_j_8MSB57C8PjY6J5Xz2mqcQwfP0s6Q-A76qvPPx3e0co72M3g8l559Mnt-1h6m91HUxk-zZJybe-YokJtB6Uhr5qS4UhJT2v-QZUy4oEzv4Y7Otdlf3Kwhb-PXad18QF1U4NtLHOLwKRb1X2MhinozlQjMqeBNnL9nE6vlTZU9uBzU278dnuoLLfgpcq-92iFLtF7gXZb8AepVepEl_BJ336PCHSBXaNdn0XFhq42LRaAGyx8zOYVR5sRAPpy4x27FO78wiWn5JwRwIXnNCpjrhf-g_2BU2x0AaCTUN5NNUYEcx3YTu9SHT2kxkkfW7HCyIerOfDXBXNp8XHWF-EJGxEZ9pWtqppd_8wwtpfTs33iHvv4Kn0r-cHgsVjcGm0P_OLGFsz8xYjkh42Oz5-qBbfKMUdp0W8lVDusClo9PmLrnyROfJ7bL90jBc_dBxS1Els3gYTnMfTNCrKzG9l5jvWvjIDLdwOsXy_mVKna6WSRq5ezy34gAbyzSz6DTuo9DG0WnUZq2F2VMXs6EAK2mmwNs4_SiukNXLQQvxcw8F_gEad6OJ-QV8ez9k8zTSuUyv0e-XoRPL3zyYDWpFuCcw_G3xz7TqorGeQar2p1wQoOTL3bC2UC16N8sbvi8spZs4cHGBD6EdWq8I3DQCjsoOaUxUxxEV0gip9ydyX_bz4AVtEtgsTTfvHjps9aaeTSa6LX-MxMaxGZRUnBM-cQpV31CURhMta2ac6PjktGoUlCaXBLuwyh05t6ftuPsrS6fQ3-EdcVu-_0ztKHpYzxijtX-3bQqcB688JKVUpKjuyGOMpb_YguyNG7q2tX6mt2Q8_af9Ql_x7qbhtSthpjlDtmW5QmZ21ASFvFp3ox-l0nBOLhiJXx2ghhzp0p-x82J6lMfT-wFHME6Oi38UhIqSJyDjhN2pbnn5f-TrEDEWUFK8C1kqp8t3Cpyq0QAqkVqz9A5yaIBH14TQmhPIOamgIRLygSiY8Jdo6KVpF-4cZakrQN6P3S09dYA4kjR89dSqD4iR59mqtZxVrR-hmVkDCY9NSnrMVg6ZByPs5I_bvxpfFetRA-fbonDr6Ms4LncDX0Lh0NUpl-iw919cWRNHCnkZbMDecVay08MSrIPsmegrDg5lyLZf4WN9pJeDRyo9oyxeJ2QzgjjB3T-3MXIF_Oz9X4UAVaRFNuZC_BmOcY6BlDcZWXt99FuTEc-fE3nje4Fn7fpIml2fpPA86w8Ap3xz1jDKf0WpntMpBl_Lsi2T9JBkkiDk_1ZLf6ySP2SS1SznlmxyXLaIg--DmsIs546iINthmEE_iUcQHhGi2YwvURWSxedhuFiM-AQzcuZ5in5blsqvlMltua6vIq-pm82yW5jrniuwL15VXdVWFai8wg61rdwx2h0flWgdEAamrr4k3ZA8Cxb2yYG6y7WuzDr-ah6vTIKPjHq7nwRZnmvWrsdeHbp8bAyRRr_1aj3SeR9mlt-q794MpQctUoOV--zVJ7gwoeHDUfSTZ4gwk5ZtkPjbHRIhzKy4ZWBopUuhtZZQP9qhI7V0KfIgyQj6wuBxSdvkmme_1aA7RMegeMMTJm-Q9S4gBEusS4Y5gt8dgXE-TctUm2Dtq7gLJvQwOdjn90raZness6HX2DrlNvNVzvvxKfaDBdI4OynxJMxshx0aYkrBlNoKZf0f1ut0uQdnU5HfX8-HHOS8lG3cegLnVRYRSbMEIXePPNieiQNhsrMp3NgWN1ZrSeW51p8ul9YSravSvJoGUFiNzyhKUhvhBWZJn4777KBgRvIwEXh61n0zT42jKECOPjnpEyY-SgleMkuVRkt8T6BBoMJyYZ8n4SZ_HI0Ep8ijJv-S0CIAYPJiZnWDmRjxz9B5Do7mRj4hlcbx-Xi20qsG5fMgHNL_-hwQgeN2u_oPzFbcWxaQtukzaPFyNt5LqvqoC-hU8-sWk3MTFtL7vrm7mVT_74RbnJNl_CCY0UxOZqQ_t--OxYODx2FEfKOFVnPAE0a9JiH7wzNCvJDybvMLk87SYZ5uB7SmZe5xZvjuKpmfSnB5ewg341xAGdn8EY-rXWPr1o_1-PsI0Eayjd-bNUT8o62GmIwIwykI_zZtk_ZKMTqPkhDJ3O7xA9l2yf9JJTHl7HVlRvEgGiXqPwWNQ1h5jGXmVzHc6Gr9JppeUuU-Z9tV0Jk0m05goEm069Ma82u7k8xnINTW6z72tpUgRY66kzzuMJPhNslhJT98hg595EsdrMKaLDURqIKRhjijO1o2UJFGC_ZZzySoVB4_ijPIfVMZU4ixj11pUI_buJDICna0ims1H6VMWMuREv4qmU5PAMrynzESbRKvyaEvf7u52oMO2vc5NKegpihPOYM1-lQrdLY4Dh2IE80BW8lN2K3d5IOxxREULUe8AO-SmHqkGn0PosTWUjTez4RycQ-KStpFUKgxzYppOjcxiZazQjogWDEYuQkonKFIYwxSRAQjSoTjdX9aOG2dh9TFNh9-oigRQ-0oMAUGhKs6uriOfIaQVLE0SrriCaXZerte2SVI61cLioKRTh9wo-EqoZYyyrBGiXhJeGaVznIpNi41j2D3WPnMm2Altx_8KFCXfLZcElZv1QgSGxHTCj8FZUTUjeGFxXUf1ur7iBObGyOyR9saHU0LxP2bs7LBBtAqYd-M_VTu0dpJIaHEcSx_PBGvQl2aqmx_a-a--bH_1acM3ZkL8asLQQTUQKxlNblxE-caYsQINl6bx5m8kdsc41WIrw4gIW28UKXeMme4IVew3ZhKHthDDIxpvpIRAqJH9ZiM8P8nGPCknhRv14cZgfIG--o4t9D1JLxJUl6dJ21l9XX1V5jQQxMSwPUiHJJqyBjexh7PMuVAipwhbUGpvreHnsRsbW_snYoutI3Xqp1Qb3LULdqMo4NT-glW2BZ-1h_rmSpyCNh_-L74HrjVrZSwzFiwsyoES14RKMMme5zrnsb4AR_4-sOENajqEmj72c7T91_3tP2DRaG-zLvaLU2pFfKfus6tFV148ax7WKE1IAz61vW5lZjUXNLjQtBKeWFNM_nsgrQ8XvdWO1W57iAKig2uNTmXX3cHnYMvYawJ6wbMXulvLW55YV6w_Aux2W1tfA4c2be3zRjdcZ_nvXg8f_ufTJ-c_3sr5qhJaDuVUXhOeCQazWFl6wFaK4r1bO6hQsxvkt138C4NPgbdELz-1l4PPKviUfUqGXsvjTOq7_DpuWcQZerc9Z_mfKuU_SPnPskpQSKDhyrcD9SkftmoDZ4OSxXjzIF0uSWqcqlGzs3FpfHMB3aOSk5wTCzGn91k6g9frKIhxFIcG747wWn1mrB0k4GdR8j33R4Z0UAWlpoOQCNxoivsunz5xnBW7yRT36yEYtOBFrsVMuA-F9ML4-IVfg_K5mmIltgOCK2xo2ruqeMSuPb_q6DsCTBQc96F4xCeCwPn-EEryROI6ONvbRRaNvm9TY-bBa9Fmex00zlvzfmN7JdQOcH0h4nEPukDCDWEIg9ETpedQHH9kXxw5CaSSoUSGeAV_a49dIIyUuFksl9lTOa_Gh71I5kuZV3A3-VBhQ41IOaxZZdRTPHOJr3juJmrn0zbG7zusZcSx8OKNjRRTfKu7lJ9DPX0eFG-h18tLv_HijRyyMf7BwBNiBBkM9HBoTxQ_5m76A3GxH8AaIgp54hbaOQkYIw46055lehL_GPpcwmO7rEqCAXVmMGBLCM_wp20vRCdgDL21pDcYRXb40AGt0B_uuUef9t3iTalJeA11KTgpc8akKEMhAKv86WZ76OAPN1NPwYaYN-eYMN220-JU9oqi6fkFVqGijIlQPARWiuw8E-vHEYhojtFm8cug4EOzsCQRhwTM5buf3tPG9WnbiXHXlQTa34PPn3LlAwfxntz89P72J_8KJvrJpZVPPAVPhiG7gD5zpRuYFOqjARAeqDXwEXQlYsaz6uOC_fYKPoyrnoBvk_NaRgtBFEem5mczNbWJqU0I4XMX8TxmQYEjkzh07M6Qylrf4kuzedaKu6eBaZU1bLDE8w4-DU99glDY5IrHjWgUoVsgegEBuHW6o778LrzpovjGunDMAphQ1t-Xc5DAm8NTCZ-rDReYID7ukQxXPok3PtbybbBIoKd2EHLNUXk28p2dL0X7Gwk54zgHozqGgwyEadYR5qyCpLfHpR98DyYrvOTWOdKHFYvysssZOJoX-lIU4d_tQzSLy8SxPp6foI34jLYAi70fTunhNJ2O_S5VZHSfJNMU-kfxSidz9MGYKO7DZ5r5pg_YHkT7fSeaF6mjeLwLa8kYsCZhG0KNPGHYzhAKyT9Bh4q_-O-7yquUmLjTKHtIFPQ-W8QLjjgmQY7Yje2hyRa-oo-pde4_ePjTo8dPnj57_uLlq9dv3v787v2HXz7--tvvf0THI-rLyWn87fv0LElnf2Z5MT-_-HH5V6fb293bP7hzeLT9hchl6eBi9u-fg-IvOKs0-tPxhoHFPBJ8zFruAHCI-2D9t5jM9pN7Rd_LEOCh1Rrevds9WNrHQ_NkLe_UmNs92O_ud-70tjLv3r3uIWZn4Pb2Dzt7h5LUkyRiaKXMAb8f7G7RtiwP2dmgE0GyXdDsEfqlyX5-bWc7qjoJDscFAvRf4qQ4FCZo97Yb7ewtO17LjVq7W7vev3e9foQRxYOEuh5gjhBFAcEsaEi9pZs106iLe4q-AA2RT9zuPvX87t2968r21sructGDZbNcxQfQuD4Gi92eP-h1Dw66uwe9g26iugd37tw56B4RGTvY8wedH6PjSe9opPcO93q93m5vn4p0jo72u92D3mGv26Vy3d4hCh6MDnq9Oz3duXN83Onu9Q56x1Tgzv5B72h_tH84TlTnR7dz9X_d3eME7PGvMKb29g8Axbcl4FOUjNMz11t2VPGiHjnPetAEnYQk7I6a4mGOvTCitwn9G9O_c_o3s4FjKKE_vlu6EfTPW8FsMF4D0DFCDjF8kugaMlWlWmmLzIZUa29_f8sdBec4tbLdXfmG6rII69rsVrA9H4wDqqrr_XtuWhu23Dk3VnfbGujQQtUpn1LqHmy7sIxYT4fWnvfv7sFVyNprZS0SQhBZJLm72zfrfeIWv-IEi4mr0lFl-uRz9-A2ZXYPPPqunxEM1vJkI5nv-hFCEVkApfoqaJEYAM0-I6RTQV2APsDUgqO91Ri292hIk89VPg1ouaSOeHcJXVnbdnN4HelKwqb8tTywsfcS2_16xesdZYx4sHd9lA68ciN5IBEcCdQzhRENUjWlkX8c5EMzujLwTBo8iE-eJUU7ytGj126u3PSzpDXG6N2elv1hr6MsFE9f1xS2caievW7GoWql_14rsRapavumLz0_rWLZ7R54K2yol8GCZOE0I_K3WK36kOYWbDNf2EhQG1kZXAwOtu0zIjrxbEoi5ua6RGdiHZrjF_agQJSdsAcDayL9jUdW9CYZmz-EVJ_rTLxANmz1ogLI21brxpEr1laakIrHYYLW-1bGpKLd309ry0N7F-czSXCX6FN5LYZk1M7nx5GAFzHN_XICchbuJU4JCVAmCGzfuEyUAW3Yc6J2tNGfu92jnicxY8QxwQZEpCwddo_2_e7RXqOAiVLou-asW-0Ax9bWDa7gcpTzXtAheeFu0O3d8eB0JOOTOGOUcS_Y3u2tZdyTLwgneSN30OvswWG2lk0IrHdYVspFDteKSA0H-_u7po59pe_du3d4pabd3p0DqQtPprajawtLnXu9o72jgztEF6TsAZft7fFP9-CGZnrdvTt7h7sHe9JW-SoNdjv_oBIzjYd7ewd39vY6d3bvdI7294kV9KzX8E7ZtwNQ939Xr31upasyaSWTVjJuJSPSy6mRpEacGg09c7aWet_5cbhG97gvnR93Js3_he7c7cGgxDGZfFri0LRMK6Y69f8PPZ_n746idf67f7Yj7GrOO-0n4ibhbkSUAq-85x7MJxOCukMO_4NwHuy9c7DncvRE6lVn11Mjd22jFvBGBuzVQN3os3yiujhJ3GCe2FW34puEihX9REJ6Nchx4t0DdC6yKjxTGUrrOupgK71NUn7X3_MgsROOgBcmowde5LxJ8lMmWfld4JtFPIhAV3IccCviZK5XnAeboWfziG9c0t4vgwLl9wiCjva3tvK7-we7vQ5v2VYrvRcUTZz5y4fH24cbJGBQw_5GTL9nMzbU5XMqcBIVsOrEmUGK0-u6OZUmlsvpvf07u3u7f9dArmkQ41rlqC0i7JxtdH44rWlFL8AXOBsRHPbG-seG00rplQQihNHKYJiAGY4RwUHLdbud3u5WTpxlF6wtvyGERTk73cNlb69TT-htHewuaX4FBusZy15vr1-bWFvQJBFrnvO7PQ0Rxn5cx-SRgJ61hhJTsdsNCTUfdFpjzx8z_pPdc0eNh5zC-EzSDtWY9-nY7KPuESfQNh7LNi6zCerTBoCbkGfmkAjxikIP_IbbKY6ph24VF5kVPBA2XW-HREQsqGiwKflVPJ3GsmS5CydFxvnZ3Qr_CJbb4y19LQ6qYTr7dfdO987R4cERYTwbY6WrD25f06JgN0EYBWrv8Q-1h58DVZCAQg-dZVbHkDf0Q-It_9f2ukdHhNOqJqUtqqjgioohcCCOTmKN_SsHmaYcKrU-4RUqWC6vZjycRmczPeb80HVPA3cW6BroGFjp0rhOCSJOa7DSPbqjTrlTpwIr3aNDTqA-n0qfy2yClZm31rFnN_SL0rsHN3X4-hz6ZLd30yfX5zAa_5usgz2ZE57QGrxWgQsLCVxYxSXhkItZq9UskRFt3cdW6B22ECe0vtsIoEr44N3W270JfJS2gfM4TGfZKrRWOY7m5lAqr-pUxypMYJmItvi0WDsWHhX-de9Ed8wetdfENr6pbJi7N2W5cuLdv7kEn0nlDflPOGdY8_C08R-nZbnOlvOfjVGUGONiyUbz0eZVycFObTyjSurqlwuxt3d1ITrrC9G9EZ-Uq4sIGiQ2FobHRiD3sgNzE7nLqk7uxiT61uh973ZU9Yvy-l52O-gZ_fNV-a7gQGIRBOJiFQ3iIRyzW62qvdHV9kqR-eZmy7n5v7TOL5oPJbfK2a16UoaSylTRB5eOwxUNFrJosJAeItn9rw1fHR3nxCdor1YeEvX_EktW5muv_jlwy-B6_vMGBFqDEzliXotKCm6rjgtqPCCb79aZK-iPDd3brEX6LuOelIvwf5MUN44viTlhir4hdsSNNKs17EGGHOsS_CE1sgHyHzUnO6vWRLMy2JT12ay4NLXeSE6un4-rgmnBestKKvVMkLAIh-IEGwRRpVYpKkk0csttzNqNfo2Os5BmmSCTwfIbsogNNFlzN4NY59kSe3tSYv_IlhihxN5eWeLAVH_UtSUmKHHQ4RLE0vAJgrrWhJN3OfnaieepBgdKXOaou2EcIEx1e7XqJJQLCcr1tI6kHdSbnbrbJPuYGu5cyemZnMMrOXsm56ieM65q67EDQTOnZ3K6V3L2TE5jSnLXJu82kw9Ncn3EG6lrG95vJttWD5rJtu47zWRbd2PEcVn3UTPZ1N3tNJNN3d1uM9nU3e01x2_q7u42k23de81kW_d-M9nWfbBW94FJbwxzUlun7uGVHNvy0ZUc03ivMd5R7Zte90qO_aYx6nn9m90rOeUmIhmGNxF0LXaPbvf2D0zQEnsZCVuMXOcsP5lFo--CjXwHkvV1O0icZIgZyMAF1GQzN9nuQlxDBDrCbK_gDnmi36LK4ziJsssNdj51Bf_QB2UYbcezaJeEPsK7LNpBxusAKVLv4VNE-LA8w15hTXAcJaKKcZKoxhkQqaR9m21vb9zr9CHDW32aRWRFC_hrK4YCYwvBnovtgNV7CDQlQmFxG5p_RSXNN-XJ5rLZdK3ZssV_8C0OkS0qkl8qP3T7mOmdSmiaMNw37HhfxaB0k1aQKQHvkO_gMMw0CZ8IkMSAWctgZQkyjCNEjUuD78wig8KOGIAUapO-KDJ0JdEm1JHKU4PbjhqMFig4K_1wiozvI6hmZLHCRQIyJQOiJsMGoWnwT39XDdGvspoa7bpaz-TmISWNIbjrgV9oVIHjiKGCCvSLe0l_DWagHxXljzwddbe24ru01SQ40A3KFfEdaihXetsMxrnYfaHKiAN3t7sVs23sYHdLGlxZ0Tkm0XeX29oTVU7S6v7z1nava627z611e0u3bO_m1nePpPVD03rvn7e-d13rd6Txw2bj_7Uzf9Oi9Z5jxkdaRDgyVivFf6NWYtTlQaUWW71y1Aqus03HlSqDina73T242MfbooRSN31FvG9nCW0ctXxdAVZWxUtR0_X_2zCZieFDWtePTP8YaT3ON_BV9wC-hKPTKuhUBPFURRz-3u6Y8XU7T3YdWAPaFdOazYIwMp9Yt_aCvTqPbVhF9sO9S9AC3YzX4vCUMJSXrz0Yy-VND3ZL3GiwIE2J3r2d8ZocXqm-KKvvNavfa1RfNbY7hBTiIRojgGl36N2upBcU2Gv2db_Z14N6X-_c0NdWsdPVB9xjZlJu6vI_npFkOzjsy2wy-_O3rV7L8jLBNfSWcBpRznFkSTgop0cU0V-w3FMoFPajlcQDS4JFKYr4maoJJlTSKHKRzA8F4Xe40opJL0jMCbOBOWhmGIvnOY5wLpeW0XCGQUI9QC-Klwxti0YzT1Tt5ekqcF8HxUvbCAxT7S9fdP4qHc9hFly_nwrxn99cJPZ8aRvhId3XCNrM-hjHC1_bw83-a1X8Fji3Mj1xVPF77Uj5MbR5L_wixOlrG3gH9wRSvglLbz1iPoqve8HRKmmlinhyidiV3dV6CCqJ3s0hWiDL_44gLziwPkdglRfstE-tIRJntMlh30xUGI6w0ogvPWWbKWfAoz9C4ClY_KPG3QoIPaUbxmaq8kKizR_Xwra-EOF1Vo_kypInoRech97aQpxGPlYuCW4ZsJU1LdXVHW6KiBXi41jVNSh-G0JcxW-Qms6Xw6FEGsICv35aiylbqk0IWbux8dp6Fc08qwFhd6wWruzxcvEfBPrcZG_B65StVmzeNBH3r42NX8WYtgF9vXpQHvZ3Y81jmIs7Ique-ITslYENay7ZujyFIGfEiUN76nK0BnZy8_za8fMqfhPcspOwh8Cb1-Ti87IAdH9cKAqbod74Fozi56avCjtZzgS6aOL5Ohl7Y86Ak4bw4nNtbmYSA60aC6euiaG2HqYIsQZg03OLKmCQ3Argl9ccJuaeoMbxe98eA5e5KZ7wEQkOZNq4TbHEemcieRDdG-n4HFpJyDIvOI4yzYEcf8eJpComuFaLb3ma-LDnse_nquIJzfF4vuQCQV8RpT-U8ybS23X1y63S3IcjwXC-WfN9Qxyn8PqVvnaFiz_4SDAfzPflBUGFzDU4WRmbmSanLKkaF8qZqfuZQaUKjca_HM95wNiJVuRFRecHZciT8He_eEDEwq0a97zaPUsh1RzfpKKiuSqeS7QW3h_NxleCdaxeveVmbawEzpwyQqEZhzN41rZI1YzWPQGYFoxxzOIB16pmSg0X43w3QXUrGZbRN8WDt1904DDU-bsPhRfqBtkDxGnIXtoDKe9HWTwr2nk2Us6_4NLbM0XcokvkHWFXPAS6opy9gJJwG8JBUPQ4L_vmFnuQycI2DnmrYl_OQbrFAYnt5hi45IW0tcb5r3FxSpk4XPyUatwtI4sh4MBbrO2O-xkO_qHnLd3Pn9p43vG8HWrdnqEIHY8jQxaHQbGLVz51hg4elQlnCdHHvn2b58byOyjuqAQBtjFfg4TIFqG8Qfaryn4d0juJiNEwyN7jjhw-zLVIELc0-5V2uy1Nn-JynMjld6CkhGOt0z5JBHurJL8SMK0t0cm99etT53JxUFgW8DVHXTIIABfzJnLWZiMd8YqNHZW14zFiEnMbK-r3VCVz0-9BMlLJxA6Cz3AmMw7pCYMcoq_gifZXclmGMk7OudgpFzsNNhGf2TmP8_h4yneJ2vgqbU6LcVD5Pe5gRnUE36dqk_DLia2un0zd5FzgLeEIh6iTGjzh6NRE5pJL89QvMteErRk4iMNwGo81rdck0_ov7QwZkyRclFZ3rWx-ml5QWZySO6uX7UjZMgiOU_VajgI6gnoTidCcnNIo5DNciEizU5saGcQZd__Ydn-QXKjku53i90E2cxdl6G7uxRlV-d2130n3JzXv6D0J-l1FBccGVckzPmuwic9d832Hv-dFet82oamhMagmw5nQQHOHvq5PkXM8nWcyUPqwjEHdmBkJDDRwiG-gTxKaSxM1o_mGYBD0JoFCaJ7RUPIMwb7fBOBCLuVk7Js2tD7BNk6w4slRbyjtQ3QcbPf4kPqxpLwnMqLh44nTs_wsB5WT-ziofMmHSKcpzefG-nFllXDM1OR-FbkPXEcht1V9EMzTyA3NEWWV_AiyH645nZzcJxJ6Tomv6-dlbNgCc59fedIveV2eSvRwpCZ5VJ18_tSxp6PlqTDHvnHp3-qrSt4EdQcFg74-dZwyMoZ0qMXRZeEKz0ddbC0-rpBaEX75Bo_oh_akS_KLhMtIHhIOgFdqy_nitJJXAMZXgVx2lXxTyS00zg73KRjZd-zvKzw-T9gXCev_3HWs4_A2Hrb38OfQvtr_OWpn0Oke4jwb-HNX3w663ufk1rrHEoE6DWaru3_vnt7Z8xpyPTX6GOdFkrfBIh77yUN1qgmej3VU-LhegHL-DBas_yBwyf3FIHk49JO3q9r53MUKCO8vlbwrEd5PKnlgd-NzQtYq-cgL-3iAtfMIYn8t8XHysoqhDH8o4u80EQBqXO3qXSr6g8k81cQ-0fbILyHEAeE4WyPCI76sr22tGJdg1zgwNuGaBJ0wc6KP3OSxPSeU4Ea0TJnbwAS07l1i5xAqrQ6G4Zs_2-VE8OVJz12RfJ2ZHGWfRZfTNBojuF_CYSyTB4hE95jjx6_6SWKPECwIRxciUJUX6WVuLmct3hdpRvgVQPOs0GfuLcI3a1kSIsbkAjYTPodJAEkz2XCWbdWuouj2jg6azufNssQvj98zhuspp-MwuCBO4Z-IVEejKCOTyiQRZbpkpIO7Tt2ED5TxfSLlEnjGNW-t97kdmNJE1h_y11dq37S1hzYSicc3qzDNeB4YEWqBE86Mrm6qnGUHhHutlWlMHxj6Cm_nUsRRRt5l9EIjvVUuE470tGnX8Va2HKa7iRigyyVHAiXu_qHc70o8sUBIXMJGuiIhj6-W5ACVoO-xV5ibBqiCEqZwcrr8KvlzRcJ5qTjkTHy5tWU_9RhAVUoTz9CdVrBKVKciQVUdArTcvnEeTPg6xBQXHvbX4b2qmME6Z7DuygI7RXRsumP2SYlEVIQPUiLI71wuplKOj7xaWZYY9JvpJBXgePdES__kZd7u7eMkQJ2-24j8AQB9u6v3-vojtRfWGqzERSjLEH6qaPYIZ8eSt-0S93Fdtc3MvSwn_u2KAKRiHnCOqs40RMKmXv8xUa-3VYAsHByreIhagwIIK45Fae-WAJtmX4jSganTfNeWXEbBDjgAsOSJSp6WqPg3lfxuUfEfAbDNojAHwLKgWx0BEyUTEUEOoJwE3c6qJs1GQuCKMCn8RHvN_WWxElwEYiKMErX-2i2oFerI_OKOJ1uR5rmV1c4zSJCJAkd7TaTSPOz6iQ172J_iwIY58Qt7D85fbM6Xyzn0nnwhDm7zwfkSBJWj5TZbz1oq4RPtxkH9FhJ0Fl9kOz3ou8x1KYXVeSyaV5rENyMOBGxjAB7hHhiafGL6r8MjJJcsMiARCVyYlahjuRxVd7BQXebOggs3O3MR5clTI_gIeivhkPKtrceubjnNqAzR6M95nBm3Kc991XKyP4G4f67dLbsgIB8h2AvfG28AAMFpG2vOR46oQB4UJikPzPXLhPEiaKjsrcksTudgkmXNzD02OV8xRNgmecrWAb5xwE2DCFdPYKNAtZTyiiQEFlQnnMzWFBUcAJoF-vI6RJmY5A9RVf7qdpVc2JKZ0_p5dbnUhv7gWrQin000zjrQPjjTxWk6NpqgKHTevnn_wfGdJ48-OIrZEMRT3-YnSqApJQ49jqa578TJaDqHXHQGTbUzSjNi9wl7jHVG_JDDpyCTYhsucjh1rX8UO7NpFCfOSoHDR_w6vmvYBHO4h5Autr9ygoZ6XbuggoBiRlKqRnQHGQShBaqVQAGB1kud1UWUJe7Xd3LOE2Zu3GmxMYniqUYciY2oKOD-g2Dlre5qZxfXXRggO3Pdbivzbvc6VshKsSZNVtK2HdX853GXVKNLtHNTy2SFxAQQyqhUb7Qp3dTzX_Qbl4tPiRj8jnjCNOwp2KR-7vJtF0l0Hp9EtHEIgyTjBwy1UJ1Rtx5M02N7ZXU4iPkotsW4tQnH-d3HriOfbqAWMx-0P8DedoKBI9KMgtjl4JCyMPtQYkhgEIhYXT4Yl3SUM7JRhBxa_XjCgYGctTBxJKqZEEuOOfWsmJKlHAzIXsGikl5ZK87GVJ9x8QkO2KLUnpTq2g8hYWaIMGUINhU5sCpslew3r-QGsSxD9xhSCfbqQJWXOHCcv-QN37wiEW7QXjbEQuiS3zW3TLEK3ug5iEEHOa5iOOsHJmThPhqQi37tiWhzY6YnN1RmzdspCxyJYiYxDuCHcADeBvbQUG4c5qJVEDiJA2LfqN318HKc30za2nqLKngKVVZGCzK3wxHTEFPb9xaME2OwdAqx2iVidxEgsALOjvMNT-BVQH_t8d-SLCvNvuw8L8yW_uTaa6vL2Y7MjZp98QCw61ZG7SN2Kaapk5N6mZWCO34GmwtfuGjDWBf1lSX0SOSOL_stOFoR4165KzUozH0qUHvI0GMY7V5ooNe-vaSedlAO2CisOlW6TBuacuaB2f7Jz-YG581Nl4vn1djqKyrr2U9wz0xb4Kp0mCD6CtAC0G9tpVyC8awUwJkVu7ZM4Yn4_S_hAzeqhwGkFLnuD7XzXiEYZZFDGIGMiLUaALQjJXjWH9tYYavG-YHN5ENlnxrgZkfambh1pTpLhdM26K1nmQ_eMhBNq7pNeDFWAnLhlbk7YS6wBlvH1J2qkTvHMnD35ny3y0qEoqrHuqpVYo8pie7jvE7ZwwqepbC9Oq0ib5f3Vri5xwPDLZzltl3UJHUADy8Y-MUxh6kzQeyg2wjba0lUTVjx-2x8Q3Sc8rYOdBedveXOyzDwLJbng2yIawsgZZUdIUEfJ2eaN5qsFMObxO_hMSKK2P8FxpN_AOOJkettOBsG5zqgX4VbQmsCpbhpsgagSmClFo9a4gta8k205iXryjgVrmfGwawM5mbPgRIMSSAZE_JlPRJfPRRgGbCvFhNQWd1Zqf1ihZVov2rB9ofBwgBTEpYboAau5QUMxvzgz1cSnYLWNxJgXdWodWBHzFjXUEjCx4KnOLqYTUzKfMXXjyCKGHTZNhW3o_Bm28Nmww2bk8CeIQ__cuv4pg7FAI95GWWNw7D9M2CuwzL83rCbBDHRmvgVYEd1mEU4yY_uRNWIKt83Hcxx1bZVROKOb4PkJEB3jOtVNA0pvg7EV0quQw3MHZ5MgWUuSMwT5pOE1qzl4hZPxRDphSHoClHlknn6zXVrE6NXTUiW2uGUL3H-sX_LaHmsoWHBrEry-kVYH7qGrmoEYoW1IbBIdm24lOxjZcscDM15ZhuR6DqiVkbnDE2QT9wSnhmOTQKAtZwvpdasFrHTR1hZBHPGGvq0v97zjG9ohDrhrSUVIuh-HlgBkm_4jGwnY-vgeA0Cia9DIAJ0WqKpIMtqKNcwS4wwtbThaDp3jUzBo_QXEtoUKoEVZxZzN8uNsC4yOO3Ks5kvl7_y8zarXL1G9MPon4B2KdAlUE1MS0lvMZkiFCKzNJyGy047tdpjK_DxFeVB_f4iLE87ms2mlxxT5tGPApGS04THUBunTL6Ms0Z2mOehaoyiTm1Glbc4W5Njz8h0i4rFJIwjN1GXl2BX6tZsLrcLJ_b-bJhg1rnTXCzJcRWYsYDEb_RJUxcygswJq2pg7h65a5HeQFPKKGHZclnc6-5DKDKKEJqjuMbwlOggc-t35sXVVXqKY1pXVVrsQrA3hSa1NiB429T6B8hhOPKnHM7nLbaFX3Z3SoSJrZv1IWX6BBHCM140_kC2S3U9TXUdoVxqm7A_cxk4gB1gGFJBrOW1FB3iILJhxgZTNR8GiNc0cjOakhzhuXx58upsAgl3m2-JQ4hxKVpVP3igQSo3wie4Q9saUwjBqXwFK8thdclTclRT7gO7sEIm1-xp-OY45_jFFa-9ECGOiFqcVyWTEz8jAXw9QLxfqLhW2zuQX-wkviPrcEj43AZlXxRl0KNBu7Ov2l36j356qr2r2nuqTc8Hqn1nv0LStVs_E-bIoTgn0cRG-5PQpxw2LGxX0ZUQAL1MlmOkRPKBbOKEpO5Mj3FLx1OOrPYbVCR1bzDCAE-Iweng9uFzt3jbviZqE2gtoTRC-RgjX2Av1zJN3CwY3wtoEMsl9I2zu4Qhr0Z33-nB1tw-TosiPbsHrRhs1dOAY8BNw5FE3mi15iqlXTRF9FEMnXZPpMTSc92YC9zT49SSHPX0phky9xqIyF-lO9gqfnaEk5MIEMkh8IsEhBCXbLPHux-dIMptVZc_5zv5XlPrTwkDy4URQMRpRRBF2EklIr9QhvaNuy0Ti_Yi01MwWZwP3F2SMjWeSyhRf7LeFeBR3DHgEiznyjhaESMGJTkY_HYq8E4j5G1yp3btZ5C9gIk10zrp1-NWLlbsCylB_DMbtL9QaYbuSEeSVaCJkmd3C1DwsB0lJNOGYfaiXSuF-64NZG8fQVcVL5fyi4VnRXtACBFi40LIFLRgfnZ377ATOmfpcTzFnSZ3g26ntxdCOT7leLBjnX8nYHOUdN5fjGeZT01LHW_jH3rKG1NdGcI0Ssb5KKJG4GeqIr4QgiGuhA5cG_YlOqExOOo0yj-kc8KjlW7pLPrBSW9hXs_vdfiasfsoXitUpjFU-cdhtZTUg5M5_B8gXFVflMn2yrfS4LzNUfioezFxN-XnPvMhACmoZmE6m2XxGW17n3WCcB6irQ9Xdx_qO08g-i_c37mIoyTyCdNN2_Dixal7IxKWl5GP33CctxzWQMr-gz5TcvGCXzr_evbIPiqVrQIbMKjuHeZMVJSZW3nu8207B-y-xiH4nFO4unqiB3L-5WwG9LuZtdm4IV5GzrfoPMrZuwkBHaPC8MAHTCWDAhd8OcdzwigJV1TIRUTun7j26r6jnAe_fPjw5rVD-9N59vrtLx-4D1tblN_l8IISH9xWoZx8fnwWFyhfiHtTlFiv1TPLjpz1zU2sLt9lGsj9OxpeRZlHiyC8MqGTt3D4S2Jw5PTsNELnOUadw6yx5EOZyLaqFwPCwIhkN2SqyLsSFz57i8fuVxzXPOGw85VzBQR7HHZilKdJyL-1MDWsHEiTMDVxIYTFLVjGNM79UYJQRHLyM50YvniDaM0Z9kj7a8lW1S6g4yjRwlrVlIZP-zHQNYkewT3x83MT3PzVlnuLF6Zv_pmaJzTLWNRjza42RfDEcFYpB0NdEZuB2-eCxQ3M5KLi7-GJ-4sLtq7kiXHXGDDkOXVJqP-T0u8VtMQdmAsrXbBqbTiPZwhEASGM1vwJ3zgQPOW7dEqPErgvlDy8b25UhEarIJCFJ3PAV8Ru4hpbWiREi0a0_eZtp7TANKMrIrTJvlscgo8ZBcmueZyI364EZnuiZlW3jVurxFayruRu9kKZRVZGLXBWXccL3ytGFo6Zd7iX8ESJgDKqsfRzDn8uGloxV1t_h9rLvS4M1NrKQtrKQjiN24HJXtdkobKA9fHlQn0d2Fvwdj4PFoPhTsPFtsC93KBQwm0-6RsJg1iAx8Y1w_i5clwLz1rXq8s6-ZOIr4g2QV0D2oYcEJPfFN_gVEaQzSt9XvSl5m5OpW2QTBqVeVRPqsJ_1gonwdN61se62zqhDFUu4oz4-Hfs6h3BRzJ86rt56Rr_xKsUcIiEujAh9vZk4PIFfHl8riPc3qen5ybRL_gi8aOOL86qm-5ka2tiZYTzcNzq-hPrCtzBtj2lXbYwQf8I7k7747u2QH9s4wCdBJPBeNg_AXfWkGCzMDwRCVb2eXl9OJdn7ZdjMIgDYQPQXMAK6I34-g43q038X0ivTATnJELSs1cr8VxK5LUSebPEOzbeQbdIJNTcdlTLfutymNzA-Lq3tcUlqGc-wyppdvysZ8Vj3PnuiQY2UgN4_sZynWdI66BovFVphOTYY9Rib92tQwQ6R430a0FfntjzhPBXQch1HAsFuZ9lKZRtD2X6IEiQZPTEkyAeCJKbu44Jp7FdzbFyXqbRGBHdSzTpOyqqNF69IQ0IShkz0jOYj4gLTaLptpbbH_iqYIODSO4wS1WJvwnbMFbqy5c4_2Bw-VPCkeuXLl_QHNkrlwml_-VWRuRC1CvwGxEnDRxPsucai2OrvhNoMH51Tm6ZdKgqHyqjuIfoqq4t8kutiNGLvVyxQ5snWtP-dF0bEsTrKSTHEtf3i2XgSLSKeDc3k0ECFHvH5nWFxBkk28hlhf2ZUXdH31iGWZQLBN2bx3ySYvWkHQtHqOeBOFNeU8cED2d1yUp8l86IaRUHizpTGcVBOSPilCn1MBOY6cyhr0r12uKs0m3y3mKzR2waG0Tov4ZgTQStXrS2NFEsWmRuhV7ox1oD5aZVvsnTRCqn-vzEvsDkYm7zBpNI_crhmEuzNjW_c_M7CroqmvBQI0j1g4jGeW7cU6JZTcTPcHgwyvnqNn6cMi_Fj3OYEPmRKxqVorbmOObE9ON6MbCxfibhTIznNCfZCCfYMOInxcnytYrKUMW5H3ESD-iUZWUVnUjfOXRmdKmiM9v34-oqV9Z9Rd9ZTjRyILsbmyAa0UWpK32vaQ99r5y5aTXMRZj5g8sPcjshIQi-IRP8Mt9zUJ23csGmPMVxAN55fMjSicZjR0i2B8YYsb9xXY8jfirwvJ8B87PJWsNHP1xErPYgEPbNsR3rXVeL1vHMRKHRDcvHPImLnJtpSyWKEU6zSTGWSMgU_qA0uZqPbPo9EhDxpW-_XJUHnIRh5Wj6BdgHoysy_qDnriYO7JGCd4EEf6fJemQuhSg1LXxvykhcM1T0oawLV03IXaKbm9EjU1UmR1Hc74GtWtWeoXV5DN3d95oi53tZ-XfPhjpHR35UlyDay9VwGV15mZp85LvvEQJPXlD_Lfe9IJn1L1bgqaPXVZD_RRlV1LLzbMgtlXplJHLj22oGwX6KElroEYsjRr_5FBOaVAPjicDy5cQRZ-b-d9jcr6inNhkcy3SifmdpAfJJtLAnep8yU8RcxPrXzEbJ2EwswOgDW47tdLDy15oay9T12SlQYMrq86imtaFPU4u2-RNiI393mXtc1651_R7Wy1RqFyZuVK82Nwt2R8ZUC3dLAkCbEHRE8sct3nD07Hj9OXfbtj0XI0pcJy0pNwa23rFtlI3ylfcfqQgWzty9PMUVClhcDlzGbdK7fusmytnBBaBzc0oTIApPROIwwkW5kDAm4Bu__GJlQUpFb0pda_9bsEiskdHv1tQOud9juzQxZfEo9_fUWZR953vu_MOVMjpCBKkXTnhhLNU-00lwJ6Ic8xdMyB6m6fdYH6fwaU2n08qP8yWtMLKsdCEFH0pluAWlX92GTlugW8qDYf3ilGj7r2GL5qnI5no5iYhb88oL6YGnHWQAc0Itmy2Db3wTQsfjS9DVQu4_zO51CSo6lf01A9dk3Pyib8GAV28kUe8dJRwo4UhjcBBCAHWUJm5IASVH4ifZ1bte5YGr9PU0uc4_yOM6RTbU4BjXOBl6vFwehyJdxqywywKb47vHtQwS38TufFyzzYnVCpvbaDhLu4N7zMeSzcc0ER6zRdbnEWJh8rHsODu9lv1-hpAIzspesEXTLOb1q6Xpaa2wuXqaVin59e8-MLxOo94G43S16jCsl21wplUZAujjnHpcY1CvrdW2D82cdXMBMYz56hRrXcoOcZAvQuyDVOz8bejNCAGKy_XCWONTex1rrviu1inf4dr4pkVYAz6_x4HRcgqEVJZF1ptYftJnfQH1lg950OfUxCwqTv2yTryx_oGY4loy3ix6VuP0LIoTsLfNzqFiiemMCcAb_PRNSkEpTU18qfsmTsreFgOXlI7ZjsftSZzlBY4qPfVsKn4KzoTGl5DO2-hEI_9auKjAzixMq1WsrONF9rA5lRIM7ZY7cGT64dunx_H8DGwSTWUUn0CdiKNXSBEcjQNuhuc7bs-LM8K8i5VHMmMwH3yl9y_QGn0dsheypzapkFENwwyDm9ovCB3MqotEmebX3pkdlLPPxA3SB65TVeCIwuSYMJ5ceQufKfv8MJ0TebzSHg50yk1bO5--4FadbURrUBf2GJOtnrHile7S8KoChlsYYbNFcblVR0TO96vTbFZU8XjVsCLBiKdDod91wwin46zI34kxFfsjbV9pR8w26MUmdWMkzVra884UChYM_SMLywUufKJpaKBGODFaHrOOCd1jT_1348-xMf5UYH5itOfnVMGqtE0nF-zBP2eKAKkapD50STQiqG61SLLx8fIEEhTuI181zhPO0hmIsT08eRE4OA6xTeBzEWWEnmLXEy-PgQNyzAw5U0dnqCpB6zSGX_rlQLcCh4-QOsN-mTasTs0aXwDX5IEhvqgBBFpj_saFybqh9vCJwY5euZnRvkDVAlsKUE1oMNc0PcEVojbZr0qs_KpIOi9wrxbNjdXygtRuEu0rJC5DMeIfeCAB1o5LYVp0HYZWW26oRq6NWflI7BBXjyBahtB86kPiqDPIlmsz6cLDy-U2nMRCyQqesgs2P4OxEmcGdr7Qd5gjZ0ccl0WgmIAjvNLqn25dnlHJtV0whYRFTqreMOcHqx5zjVoeTB_5G9apJtJXNYpwcXgbP1wYD4oZZkoVxhnJ_LTyrVDJ3U7a8sZRFuCLB-nDCk4W9hf1JYTNvhoLmzxZmhdtN_tpr4EUts1j8MRugjV76vnRA34lcHdrPn2bWXVvn433pRJ7SZPdhyUi4WM37811X_eJJ_06ABIffq1CT0RWTb3vggMrQ4nEHAmT5eLsZ0gaXp_YQM2FjDt99sA1WcpZ4sQpv7DIXEUkg9yW302t_ja3-ttpkA5y1sc6DslZU-uHSkicsPU03O76rHjHdRp65E49nHhVuxJscH4Xwb3Ku37mjYDvHRHnXJsfEA8c56-j1ySzbG3tfB44nwaLobm3cFqNeISgZmtdxZ2G06BmBhi1uN8mcLHcLYglX80l1udgjhAg0wAPxid2SruVHgojOMUi59Gu8J9ykiq3ULSybtSTIGonhOmN-uR9fDwlBqHv_PrgHaYnAlRDm0L8NzpGRV6nY5YXoGh4eBpPxxIFdwIkViCYVTsfRSTXWfOCMgkVmCJUBiDvSYlbauR5HbfgZArh7kwNHEJKBNTKSg3U3zm9RfMfkgFPtNotrhzdh00hJMYX5jxzhb_7uPaZzzxBEoQDHEnpzuv7H0vzrIJIKKZVbuCKS4Wk4p40mH_OXb4nrYZnWNvRM-dhmx_BPgtRuGxBpPr1FoysLy1cqf6a2s0HIHipAX81DwgiU9jYovsIT49hbeZm9YEqOZDPUy9cGP-PVK17gKwkVgjK1iYzDFnIdp69elJOmpgA0xC3PmqBKX9hYMjXFpoU1s8X63cRF1MNS7O8RlM2O2txmflA5YAs4zPXQ_hDOdzkdlS30yl1HwRFTzz_KYMVdXF-xV-FEkd8ECrKcF0iz8s4SDmWB2gl0ELJ1Zo0tWAO_dyKEzPr7nvKAkXK7C-OX7Klhz8L1qrZ2kpL2aCeZ9OQn-soG53WcyWF1UvOvzCvKUsSVvcnb40eR3DgZya_LQZ81pHUvDiIKT5Nsy_1XSZJvtSGCZqsvIaR-ySgz9dkIK6sXgszhONQJsM_VZZl9MelwLM2iyva39MJIaTrOsBIur67eUx8aS2v2WVgpv0sIDb1ksufeYsodU8q9T8btzD8k-aAjgMIkGtHtq3aw2k7UF_UQKyrJAzt5pmclSjetq9e1VdbFOpWUBy1nMBpHbckJFvjbtpL79qj0ebsdWaORn8Bq1cea9zaqhGEKtnDPueTasT_B8GxWe4ThNvxJC5G1oiFQU_zmXNd9JBGYIxSLFtAs2LGdLmyTuwrC153g65RZtoUOBCMimz6Ql_ikeO_mGfaz_xEuzu1R8QcuOAZrRdzs25jCT11gqtDJ8ETZRfSJ_G_IXia7oFpPSFJJS6Ck1JgUc3ammBwETTogRnx5qY7JSQYvS-ROPNvopbEs8NG0M1pOy70GZuC8RDoboX1hV2EVw-IvYqe4afvXiyXkWeW6CIs9yQq_SL8HokcgH_8uVh5flXEAs8XQ_nMNoUBrF_FPoERhc2btg8_mQz05EoiWz-Z6JooKOsEF34CQbZLklQ_Goup-FL8WOp5nurtd7wmTJv63FoA112-sC7blwPHSfvyHsHMpbV1EuO3mRGDOB3DI1LyWr0Ox4nl5OCpcDYOXqBd3MwkYM72WTweE9kYgi-hD9v7HA-tmVd-XU-tV6KTcVXD0VGtCs5pfo-k8oCnZa_KtSonk3_Zc6_0EgO31U_r-mvcKC9mTBGtAGCyDj7zbE2m3ZWb16JfYEK3ZxMZQg1gG4sURwHl2q-FMWOtMoXhJlkEBKQCsvwVTg6paz6F7FjGK_0Jtni33kyajXXG0Jm1-Xll2TvPDBCamWvERnPWQW4XNrcFl-52EutvPXVYGvPNMURzH7RyPOr0qR59P05_sFmP6UaIWG-UqMehc6lzBweTnfLcEMkz1ZHtIIGocsZnJ20Qh6xDy4z7gsVDjxhE5rO-cGzKKZs043ZM60S8yojVvwWC0rbZ1RInpfYJE8fVjmBdrz1uarWPaNVRIr7b9pAml7h6whnFUDKdMZ9ELY5LvWLNENtRlfm2oyaxno7lQr-mIib5J4qYxChi2DC_xk6tPHvYkMfFEQAQ0jXo8QEAG2V4HHAsdMpZLjenruepa1TjiZJjhjXD84Swy3Y22GOjO30ddOEplp3XYlTDV966KMrkRuBxY_PBrpqLQ87Na3MPV3CgbI_KeriehUD1DmE0NBoMaMy0bB3FnVHd2skhWlFETCBWk3hUQgJXJV9xsFTvH7189PCD-vDotw_33z2673j1E3ObmukewdMpYSWdVADrLa4k8ckww0OKpzfLCwBIOTQmtgv7FCRfMNnzQWcI_V5gN0qdCMJyzExuFHA5AZZBghut2bWWQSwRoEzUNDqGSQdaUH7MJUJOjUUPTX07n3G_dft2iHuuP93GDfS3oDC91XW8m2G1dpSJhG8TNtpRg-jNEF4HRO3qvYzEJzSI1JyDDPG5CNzwpWjd5ogyxeekxaM64bhafNCqYE0pW4kyOMlGW1sDdhyOOLANMACEHAnCsSjRwIADxKpoGCCqw7ab039BNGFOa07v021I4QAU-JoTwFOv-y7_BNht4HVGQtHi6fQN8CM4jcH-sNVSkgjgpPxRmmVykoK2VuMV5jUEVbXFiTJFAr2sAZKJ4bM1Eq2FlikvHiM1ANRkPGPQKLWrNWgFKb2Xy9AK5kqvZetmtkzQamWv0pVItgSfBTRVA4neBnWkPEHrSMyTcJrDypVbOC8iu659ZpdlOVCmyloqHG7nV5l591O-v3b-Tzig-TUckISQslpNNo5eoU1lWAzxxbrJzHjF5YqNjEQADYUpTEXrAapM7AhhizbBP8eEC4ug4Oj4VvWGkHtDYxIzdtUiak_T9Dt1tVg7pe9VtlY-2mwK2cTqYJcdUZ0o1HhOMx_WBB3hKJUcgaPurB2JHlw_Dys-kjrAOUIO-oYrB4z2co2zMTc0_cong-01B6ZpTHQfl3TZk_YxpqfKhvdjH2GSymPOcdvGNhJ3axNegzay57kl61ZW0DSusxxvCD8icbAf1zxIBlNgRQROqiIXkVxPXF55SXwYdvXuijUs5Ylr6J1eQrh9DHh2PWukpyHI13zRDwwuMXwqOOiA6S5rozTMHfMyxtFai2pUM4Jb1qzk0aBYWxFee1iFJMV_QWD8ltvwf8eGsRdwljecwRWN0KQebtpzybS3fgmih66RglT0it-smQEptzil4VKM5C-cbPyGkfCYE6wSEilvOaV0BkTSn0h6SmgA3pZI-IvLsNSoonf8Yp1bkfITpwgLSq8P-BUKR7w9lzf5liPpXXOrGxGPX2WEBva9_o2e5o54aXzL2xJ2ZFFz87ziAsoogNX0bpQwvw8o_H87O__aEF0SsYEzmv5f3r0M-O6D9lmcoG5icf_f_wfzXFIcls4AAA",
        br: "G5XOUVT1JpEoqmSnJ4pg4wAUYDnhgF4KuDEcHVTrJ2ukWrpHVmq11Do3XOnHMjwSm1fBn7ZOkSFHj4ZLYzL-tWhTTDkk4QiNfZKraVq-3mkLcofrK10y5bRXeVdDBzi53hP5_f9a9j8_X1rpQ26FgiyfRZeVZdltj0F5Gie4DDxjM4L996r6X78PN203RQJlp1bJYVqH5OgSHEprg3eZ2YEsPhxZmqavN5lGd8qlD18BqLTHS06hz2NbwWEFzK0rfd_U7HQNOV7MlwtNpHQ-7KlXyUWZYCZOofNgOk3YQJRqZZSKWy8e-rbPpYOCIB-Edg_vKfmtEp-y5Gym6uvr6KFCHjmCZBhlqOu3f32pCzIhm3cq5QOhZNd_e3X___V7QJE1-2YxlG5YbEpLp3Q_K88Qp2GcxE4hyGPqYkrvBcmFg9yAEtZlVKnKGbf61l4N0aCdyJZvpKfuf9cJLs0HjVM2_3-p-ia7AVh-b6ufbXZZJTtZSmuLdTYrzS3vme_NDMx5M4CFGZBfA5A8BinxiyCp81XsNwPaZwD6n4C0kgNLv1BK4--S0uSkq7r8Umr26Vs7pRXj_1Sgy-cshDsL6to2uhZuoGJeMFjR2hrDsxCw3FrwPHs_fO1lS9du_2v8oiIgWpPmrjGjqhj-RpJIEppOMvsfDZBb2e2Yh1GbNptlpJoDf6gAQgg4CioaJswYscMWdzjgFjc4Yo8NXuA5ftUTfI6v8Zvu8YN-xDN86Xj_kK725O-M94_-7qn93nHeok2tJi-XXxEBO3xX_4Vp5G7kN04ASZazFxdCIPzDrH6zP40wA6gRIHQzkIDzJyeAEPcYreylCxBQ4YCKSYPN6prXOB6b3TjP0gXGgMykY1BmUvoPHnmTUGIxmGdx9Pq_ko4gMRwNPJyWG7ZnCr-YKd-OqzVGZBt4vrGoDvE6QaAA4TR4vIASDD7S8r-kvOYkpcbJ8Jvb7uTxRu28cWRk-fO6LPh_boStpPL240JV_xtQJT4Q-fCA7_l42jLBgpmcwXJivMvmKUWx8wHUYwz-8v4tDJlqKetUMYswOSuaNF-7AKVrp6xwnfiq6WNqxyQAT0uHTwcLEnRofZ2zNCFn-hUSYFFA8QKSlrbDgji76t3U_ESEgCNzaLtRGzNoHyxeMAV82hV-HSoTKYQzWbH3yPkFQKPs_ioKkd6n3yLldVAShHUyPIcHfjv3FYjKAFn8FN-AGACFpH-YZBWXAOGnavILRhLU_K92b2VBnz0hJKKECHexFHArptSoIUdlEkHIPHiY7q52FqzSE8cG5uAFwJn2UNPFbQu8g9bsV3sg5zCmveGu0OlHFH31z2zB2tJep_c7H2pl9v2Ht_aBXPvtk229FucOzIvMaf7ldD18Tv49_49ZLVL87DnYbpuXaWjKuG8EcdU5sQjBkLObL0bSm0-PqkfeA_84mkRR4LK4FrIAGNk7KwU_yNFp6wRNPUNTpe7VFJhbnRajfR3KHTWI3J8TgNQYA1MBy2Mr9AirBRYep5A0UzHXxvV0s137PUFEoZ4xBQUGRkrRHoXRtrPi1CDPtLDk4155atJEkMBD1D-_6pklMcfvqL_grM7qi54cFADFdO0UGZqS308EHSiKi74lmBMQnylVxZ70-9SZR9oFpKuP7_u3709S0jAGhGJchpQVXuSlefiCPkmVfG9O0DNfvInj-_fVdyvBMkxYu9oDJF8X-4KfAg1OrNWKiZZUfOYRIlJ-cRZb8DwOfKe8OQUEF_5cC7U4Oc3CLVOHP-bhVX9fngQVqxf_GjQ4A93O1ft4AXIYq41nP2UZ_4E0u_5hdMJKpEchN7cfpfk94MGAKwtMPJks5cfJVxDxa4whwqK82mRZi8lv8l0kfG2VJoj_pgD5C4jw51YypVJ-KgVcWlnXVvJ90tpKVPVyswhfEgBahmYkmcziH_WHcYwiUrqjv0Ie3WIfi8HPtReDuuUP6RYXOBO8cCdoHqXXshj7a-Jf7UpPn1MKygRUXnTMhOMg1NUoRFzxnll6ymrhkA3CopDoVja_vZkFEIlEx0cTaTKECJKHfOtwkvBB1PbUKYAgwlETd4ZHcMo40J5APKtt48AjVDlonOHwxfs5QYQ3lB00iuxZOolStbYimWeTNBRqdgHxQpTliChmLq0Mxz3CBay5356u8UR54du9a09yG9FqdgIWLkx5EfpmkSIuqgXg-ah2ycpFAJ4xqrEMDVqiYZtxYFSG1ziKSGhbt2DkYBu3JrUh-LkeXkXJgDJTBSOe0lWHoATlqRW4Qp3dUlPExPUMdBmREq-kUmRXmhQYEZpElX28A0OU0oEwENJoEyxwpCezcLpCoE2iH_ch4D6TtPlSyQyazVL1Q02yQseRg-FVgVQY6hNXMlBYE_VImQovtqPKJFenCR3aT_Uqwi6RlKAYSdl0aQ48p-FKxLqJdqKE42aNT2ROo_wsXzNjXli4LjAIf7qB5nOIdsEwoWQOT7MKUAJmaIK3kEKuOpE4bGL13Skw3JhXCIlIl10xsQRjILKclMHMC3xwnmauQR9HjgMhLifTFZkHIUESHktAOvGXLVSqrv545RVLUyAvfjPhgM1Zy9PsMpKKgouU1CLRAhAw7RQaRnkaSvRHiyrpCP071yr6zl8-v6QQZnNwNLTKI-itrYPnTSmJACxqiJJNVwNnDWLzAqJaBsOOOArVOFHmtT8_4BbJPX4Ba5If1Qd01EcEkC8Tl4NJSWxqxRymMu91ziJKX0u8mFXhtcHQPxEVY58710VUdl2z2aFfJPu4SLxbyviKBzXxCxQPPPn1mKBeEbfdIRHtkrnDW6N7tD_UpwcAUgBOI9oJlGENhnMqglU2NxHUt3BoBC7E90RrB1jCjKjShlsQZCyA81zdRJ_Atoq95AOHXJvHIIBejXLE1AZde8nAzchVcPD7gBUgxQ2-1eHXtDA1LhytNpNDGVKpmoSixRaJwna3y8HkMPALAp64zTWBjIi1HFO0XLAYhpFu0F5BN8p6cOi3_gXYQ1nI24-o43fRhOQSKjk9DEUPVUnUHwp5oKssOSXJwYDsjXLC9fC8SPZMVucda_AQq-_VBKXfuX107SoJ3CSf8l2xGav6HV0EFJti_JcVrglcZhpPFh19YC0GZymDR4n4QG0iKe0lIMjlKhY1umiK-8IggWTHTDQoePTU8lHZ3HgBupxBFY9fCITCIucN65QNwA-nNnYiUi8lA4E1FelJH-axxN2pn8KhSv8WiM3QEPT4cK4YBGWpsmQWhS9RicJ9S8TWqpe5cf5gWtyk5zKONfTEKZWWM0ZXp169sHRn0ifIUYAQtIkRhl3aM7WdigBculmgZ7rIwvuu3JlR8hdE7L2ja3l8XY19o7XzXBux0gDX_t8uAoZxZ7y57yJSe5UbIAbmvS3bFke_pxCvC_Z4p_Km98FHzjdFgtg0ZJeaMjvqDzJRR3dz1cLFqxRWsXms_R5F2L6NWl_EryA6MmX9VCIjQSqF5aH3AFRBDfem2K6WYYFOKyHL_TVpIBSmQwabAUvEDUGpZcBGt83qKg9iydLSB81Um2oiFcrDvDoVU3WmAoKXCFLdF7RdDvpUfAF_u2kQAiz2itLYk0mKQ_MA2KPY35JFwAkWuRBhVx0bhjwL5VJxs73uIach2Vzg2BLgQLpTAQ-3wCKVWWCUUFJlT04kL_n0KnlE5ccz9DknAgcvr1zKaRlxiPF0JVSDNer7JbKhq2tOVFDCWrTkH1XGoV1M0hEMmZPdjZpzDtohy8ZII2b5A1fb1JnOLZL_4E22rljKzDD8sJiccCPp9I2grDl6ZCmgbpDyw_XcAD0MbX6hX5QyzdSdEJ1pACrNyXMmNSMbVTpra4Ny_yY6gBmvabmj37FuxzK_2PmsWuJTuIL8T6jpR278FCmjAtgtkd3upChhoZqAWtcFAsbRWCHfHDibB1ecCZ3hDaWneKCTJVCq-5EVkekw9WCJh48jGg4uO4bLFnVQsir2wksmJnP2K7aF5Kh6ByswKLlutI4j_ZKOVHjsfQADVK8aLFzVQ8uwmYm-rHKx3NxsIItxGBP5AEE4OchDKk6u-7Z00kcYDcGjlMveTCfQg-qYqELQipWQocw4Hnqfq0bc3TBGcIBtBAGpSDjQzUyYFbFpxheZ3W7sd2zCBAyP6RwENDtoOqoPlGCWCAdRAeqQkpcUcb0mB8Acqanbi3HRqMbsssM1d-BKnVCE-EtnG-sA0gDYZgF6VQCOWj49J5fI1rhPuSUf8nFI4NElZK61oIgMQeM3_2rAXU4KsLFoK_gek_JBZuacduGK94GvGqy6OiFEyc4UAIdjBQC0Iqje2E01_yXhTqVwdO3DqyOsYy1x6fA4DZX6QoULEcoZxVChsC316kQkqDJTWAm3CYNQd-1At_FJ2oLkKkU5KBgCdm_WtS9wqnCZlF2LHerB1Ci0u2a7DnDMEhJmn76y424JdnFOwikcwB3td2YgtTo9Rifk-GrSzR5hxxJ6pbCdcdHaRW5932ZH_zOTdeYuqXsKrVI_xiJSx3LZq2UEZTLhqO1CJycJbCSSbagQVs1jC3IMIXFVqXgGWXGdNtUuGod2NMgAhdhvwBQuffQI5bgPHSkGXKQJmV6NJEQK--oktjK7uivplKvpMosYwt7VwS8dcU5EHNchCWokVrHa9PRd68QzcIWaYbA8tVrkW-EhesKtyjkn98WHWgzg6byqepMB-K2L6gHZ_Ih0G0vHJU8We5vMmfpEl9EJ-TEhO1IddKO448pktxzA5KMq3OR14aF6dLaHIQKs3y-xE9plrjnYzaztoCYHqKqsfegvKnJDvzYLE0nh55PGlWaTA_1HnoYfDCDtt67LACmEdh9YhpO-StCfhAYEPm7HH-fjlWXTO9MxhKbCpuwaclTRqIzt5PzBRKnJGw1guKaFgInU0R8ZtmDhnmA-JXq6uwz7BXkTxFdRw_i5z8IVbk9JUsXQ6Con3JnMSYFDL0QTbHFZKQBgjauawjUAxeWtEKsKC7zncO2ACrKkKAf1Vr6Yw50JFGU_iY_RwUZ_H7oRpYSDwxbYP_87hKZcCPoJ8j6ghwupkz_FsY-_hi54dCP86_wHnVIn71YWfMWFcWNL3-wkGEqcOrq24sF2GIrW_nA0IQ_KJ7mTH5zg_j6U8aCIPcc0tmgX4CohoTeRf-SNBgycCwiPdBJnls0BPQ7cK4DWRXbrIjf9IqvOZyGXII6s2eYoGd5P23Uk8SYBxdDtzmrBAjEEjoU6JsqSAK_obLcGefgWPj_8iGGPqtsXHOkxkFkgU6A5o9pTakxaTCHWmdG0nRv_ewOMsvMdSBxynW4U0dtq1viDrKO0JNJ71pPHoPDo0I8xTkiWcUYsOAMUSxDZrys1Ov8dh_zpcd7EAEgPWrgef5zDRqBEAYyLJSasys9GjjZzRU83QgjxDa6_TYeK4SD501_ucPf7TnYYU1dGi33F0AYXfQYcH5wIMimz2dIdNCUnvusQfxLtMyEj4QbyN-Qu3etKQXIHtCaRcSKz02pfzVMU9OeUarJDQW0kOY8iSsh6lgDZ9Y5pUgkuU9-QUIiNWQe4zc3OBiQO6B9LPGrpD-GNlEx3GpHK5dF0iPreYh0CUF4FB240WZlWpMn_rKmOgjr0NVdKg3S2kCBvepx4tW7PtxjnzQzVfUrCWaY2sgYTbuR1W97wgH1B7JdvnViL_e4XM94kvdYZLGvZwKs-dOpxz6bR-h6EAO3Ppz8q8kmxSm3t7dhkKdb5ibYBiLFVomIOpdCI0tyQ1jsvGP6nss2lcGLAi02cv7Bi48etRm6sp53L2R67SACm-P9vYejhjtLpJKUTPO10RIx2QfuKhm1iBnfgCkWnjzzgOiZY9W7-qGkjKLsLEOoWt03jWhJA7ElNqa6dw72CPHDxxjszzjKDqBJVh1p19nCLm7BJ-4Tmh7VgBHZOWCpixztvVX2Dzy6Jz0ag0HFgyFwzElQyjgbTCoOc8GiIpOl6CXw0QMcAk0DUhRQ_gXcV0uF8MPA-A9LiTDZMVWkoXWsMo_gJXCMHrWqtdG6ww65e4Q07MAMNql9HZejbDnWvHZARwx3Q7QIJCOnFcVgvUD2OP7FTtVxJcOCfxYWa17NpX940zKi5WXV9xjDUkE9zAz7ipv1ylzs3jVe-7ghgn8Qq1k-1cIQ3ggdTahOckBEZgbI7dwclRpvLBSl69Qhl3fvN-BaYmuqEOtHUGWNzV44HvUFuxTplmydDbUHdn_xkQHE702j91IIoRbjPLiunMu2IZrHjkG5--sii-detH5LuBtznHMwJ6hd1BggODMnX_0uPpsOsCbrHPjoIqkkBU7zNHhN81Vc1VPIPRyJe1SDlbwd2m7yHaoCEYSJmNEjWx3AbSahZXwXDUH4VzQ2FoHKJ-JbrjR9Za8x6Xuwin3b6gSHpWCb7EBIKUpcmaGMadc-pcwlBKCFLB7-m2OIkE4gMw0-boELOjeeM2RwVeBxZtjjNTK-q-N5sM8WQJS6714v16OIEMwbMw6FzAEZTz3_5WDmVzAonF6-eGWW75kFdw9LLvDFcSIaJfOrUEkkiOMtmtDCTaYrXJ6QbIDgJOiBQaIB0adNe9jZ_zcMRourvZSOGK-38uByO5c2zsVPbAE63-PTxPx_jcPm-nFabcxe543I9rLveddgeefr4M3VTdXk9LGtvO_qXXTes9I8_bMa5e94cGPrHI786uz17vTDSOcs-SJfPPWHIh6udC9ncep8VIK7g0nwJJz_N2fomvf0HoAssS-_Y_1MbI-D_BvJDC3O2U2moflc9-l5Pef3Fjnmx0YJnzR5WPAH3blN5jef8TqjWeFKOoedbTxR_64jhISQQmHZ3uPZ5gR0oig6Y162bPlHWm2c37-0dJmPycfo7O2c7j6R2O-qa3jkk-pIoeWqdkU8tifOIJT6RE4ELtufKwmyEOuwrrcnM6XP20zSXQXzbpa97qVQquOBElNKkh-TtDZtaAI5PO6KdzlvR92leLeuvnNqcxkT0gJFZqReeaugvNy_WSyOmB27hjBW0Yrl88msYfc1OrOWgv6VJnM6KweJXK3I7nkWVVpbLqRGfzZ_rePolYLO2huJkA-tLoBB5Rrmi0WsrlbrS0drepBkWp82li7A0jxWpVFqBJ_bvkyvAHyoKcrpqwWfRdZWnRq-ZdpjJjsvDbIdIHPJWMXZPI4g4lFfLIfJ6yGAn6GH5HdvOhiHNF4J8udzsD8fm4QZ2NcwosrzzwfDJnt6AkxQ4vZC8A9qYjacgKfm7jNbnDEkR_xcNwtYzIngn_ll_kA8opuR8TnjZNlaEut9mfTgfiJmPxgSw4eplKj1VyWUmMHV-lq7T-sbnXS_N2N-LKhnSKTxSu_PGl2ucLKQLjXj9d8WfPUDrJg5gSrTvYzxHwLZ7jU-fdv-dGVx3X095eXnCHQheM8frjqTpeLTf2qnzNs_yqboXM1-77K7XYNXJYbyJky75mxd8Jebp-Txyvth3FC_nXBRfWa2e00VgEQ1K1oIhOjntxSfbia8DLvjvZb6Gvb1UfmcwIm_JGn3oorDulUPu8saqq_A8J7yNRH0KlR_nHs6Sb_4pvkdFVpPspOmtBZGYpR7wBbOaoapeI7PrJjDM0hgDXL9NM5kBipqFxXa7IFGolYKx9v02Jl5QX2NUnDofDkc4hNgR4IGbfUF0TE4HU3haFcEWVGSNcTlmOJEPpRtesDQgxtKuirUIsJwQ3smPVvx_9Vwuj0DFLYljD59QHs9YrDZAAqlUBspOTNUcZ__u0P-rEb7b1EpVzt5D-mBDV1-T7Kx4O3jr2ydM_h5NAan201fkwrf69Gxfxpdn_ap_gcBiJxrdHgPEv14P9vPg1cVBl9bU0xun5KDOhVI8A4Ws0_Fyh-cAiRY65qQQfhr8mIkUEx3uLN3XCXA0oOtVaCjnufKGw9I7stPC1fDechXkZoHG33OQnhep3GpY87tDBtngINgJyb2FKCFdLftNCPElJkORbhHx06DQvFi4Z5NaZVbROlhPHXi7dfrjWO79JGob5-T-wzp4s0pvyNnbyz7slU5D06fJh2cefdmje6KWzL-QMXxBlyHdNveX4gx0fJf5LohHs8oPcB0cHC81a-lFmp-rjzQAPZBz8rDV0GOFT6h9_0_FTH9juR9fa9h7HG-bI_bvgkPWj9LI46iA9dRRHhR8ATniKU8vp6pVqbM-xylKj0Nt_wB8XYE_aKewXwyBRT9enbPb071Pw9Z3Hbe6P1pAU2nG4XZxzauG_BVlNFVxaYlQsWOQy3u62a31OFAfQdFxNlM9E11VlcmztNn7FzQ8otFBnCPSb9IfbkYsLSp90leZY1DKund-JxyFKXbmjOCmfp3il-egCHhzJLFqinnOMhZL3iWT_vf_gLdgSpGmzz3iGrvT3C9uu6ZhB1H0w9jtqWWERrW09tOkx2MuVVohXnaSUnCROsV1QKRRn7KghcYVHQ7Rcka2XGKKHj-VgZqecFM4GvsDXJ5YzverlrNFkyPkE0JUSWmGZ20QYUCf3uVr5bD8-FUKB5i1oyVNiGT2uopMT2jomEZcXyCYYRE1KNj1LWrRd9HktO2iqqU71FX5dQhO256ZWh6koC4edTHA3-k85_BAO68aQXi4hX82kqJIEBCyhBCirlgEGjETRZ2dCKOCcEqaFn2e6RljWWg_l-GuS3r8uWfxTAcp7RqvrRCGm3HW9DnXhWMqMeHnVqYEFhbYaJKfGwsvWFCkCTnI8wnEApM3JYc2jfusHattRt-kmwXMusycb2lC30JEw0ts-IoH-izg4xfaUSQKzOnLqgg7j8cLu2h3dvq247BJiYzMDvWJFJnkbPVc_kXHjjXiJc1FZajmzjSVOQ9uQZ713qESNwfl1R5qNrppppkd3GYcS5c4ixErcNrUrO_-XKjEjKaDdqsE8BzM8NO4d9clhLpNGJ8lRH0Ze9fVt5QtN3tRFelrrgrHWGa8r1cEEN9o8wj5dWnlKo2bWGhokx5Zsw8sK7xNlqT5BzYrtElWIN8DSw1scOpWu87osGBLgnrKjFFbZpelrJNnJNLsvr68mIB52x1uRiUFQHrdfzVYBjaoiDPInl9Lza1vzqu6FXmHkrrXp0K__6HyF5qz6TffF45dai3_1p11qnc3PkL-BiaN45xI7sGPZnpIHfegR1PpCk_BpOFtYQlVlBxMHEuzqyD5hF0SYTYCb-cTCdM972RyG99bPUiadqgPNjlC3pdZTxLHKp0f6CH-PeXb0LQjxUKakZOjX-3njYfHij4ZkGXyw6WKcTF27FUY0ScIdQGpLK5VTDzSjxAH41hliAcRJcmLwthJjG1TckZTlrDzisiEPxFQb-zEErcxIQ-yTVschUV-ExWqoeOJStehC67Lc4SK5PEc_yl9PqF6vARnM6uaOSi9TITbtm3s5PRhNYEQVf-CeFIbatj4JjZ9SrCHZ-O3-fKRBIy537qslIx6liP18Z389249QHqydgesZAjGFg8GsY5cuicQzzEhtrDwGYOAgQ__yQgUOYmQ8wZ9orEEGh5pTsHeqBxnBXpUzmOY6Mqoes78bXKK-X14jnhfXpIc711VNUkGPbjGcaPQUBIvQP3kJdIRzls5LeEldDAYNg8ixBND8-iuPirsbu3qJ-e_2aQOABV6BxeV5G13mFPkVUf9pmZN28X7FXq_JzWHa9o4Upj6Q35yX4Xw7jLUngoz-HcFxYLJCzNGLb22r9iTRX24YSyPjJs5uQs886P9dYV8__ix3lFh3JpVlxj76tfkNYPHlmE2t77vpLBYSbbwfGFP4IJY9UAwd7Fa1FoREgoWefidm74tpVEpZeWHO1aKykBxaA-vH5tDZhtLV7p5t1UPW7xMs343CkpTX0MOh-J6RqAlaUNDlxlQC4IrJn9aX6HMt89f1VVk6uWjXzWhbBt9lnfnx2ANtk21MDBeH14Fym4cF31bmtpSa0VAqzQh5ZvC7BL4MWOKKcaUoojvi-AINkx27dNx7dNZ9t-shjlZwWMb8wgZcdTG2_UWeHmsSq0qnEbSU8rtwplmqFcIxb1KmBgDnIw-7mNwPPezeoBwKziBPDI48SSjfzdmXD7P2VQKbLvf5qs-g23aOAl3vBDyaF_ixaQgiqKyplj_hX15vvs15OnFm5ynX8vwKIphTvgwhInPD20JzVSM-yOIFey5g-bpP_x3zaflpmwdMb13SD5vsPz4xv5XQ86dA-cx3W4YnF0jzrjtTv2lafVy5KZ_qC5T6P4vM7x5eQrPB0-TSqLVe6Yzl8JPhb_GGGFZZmHu0mlTqxN7PxeOGfunOowOyDhytuNotywjRsHRK894NIOdxVSr1fH0MT8XDu0wUlSafwadIQQ0GtCdOmPD4GnbiCFxomdqnOYY6pzvy7adzN5y_qC5NK7UPTS8XuoKvQek5AGTiefqyWxXVEErEPV7NvEqb4ckZisOVgtZVNu4Mp8VaprmGusczlkC6EFtBdasLPDAJ73UsEtJhVWYIejGJSemIYRmqD_3NFBBQYPgkeLNula43QKQEHx1Q-Uo21eBDk6CEt0qQlex-bl-q8DBKgKnwyoNbq_GSiyCanGL2aEhWvnROwJB6HfXGiNxx5-jlmDLQG0FTYQc7weEg6q4ct0jiQFLa5gRIaB8ymJJMDv7RrDMmGYWrrTMzZ5ucFoeHIbZEEzl7GrV9YjMODj7sjtMjJiHDZXynQ0-cCeMUZNa0ISzmwACFOhMamKHAC1LNgF3Inm_XxAXRBNlnMOSLKY2iBnVpXq25JF8EUK_aJks9cmIGZfxaL-ZnqfKYTiKjCWo9brF43T5e3TPjy9PE7weDMPumCM-csIHRnX77lA7_3x43Bp9XJdQ4VV8kyFDiqogKpAwKWEhoYMNSpFNq2IqT4CQK3rdZlRyzplmS8AYYyJ5pu7tVztRPjq6IDzCgf4ECDNVc7BByO8uakcBIeOr6ZZeOqoWh58un_mjvvCR4lZQ1xwpMoUauVhXQbwz7KEopLcaWmNKpCgBhi-_K9GmGLS1oU-JhCQfp9QwY3kg8jO7cw9Y9SdlMdrUZMuWard3zT7LyRWiaXbMATWpg3UYmchSjOWynm2n56BFkFQ6k-XWm0136NWkr_YfgeHB8415H28skEMh7MfiSTf7-SiBBaxZWG0n-CcrswViLh31OU2hHuBNY99JSLsM1ZRt0x6zvzhNdDBujDCwoS049JAGUFJNzkVGf7dKD5ilZrG6DIAQTP1gVlyL6xgxOkJUNv8R2AnJFqpm7x-H-OD84vLq-ua2Uq3VG83W3f3D49Pzy-vb-0c0LKuwWv_e_Pun3u72h_-aNh7_nq67ZHoyCvPI6rn8qWaDXEQdzq57fRmwkodp0VA19Rl_aPbeAdI5Ro7hQlb7yeRc7nK-MY8am1_9Lebe9NtV9L5_dPrSA2ZoSGEJS1np77JYZ6PF-20SqRdzpzfX1WBLKoecor_tTZcXKn0GsUm_ADxmmIDWBdlXfpSsrSD0UboT0JLfhgIo3HL0zlGmVB05HrMq5xPMpOCeM828hN0g5vexlHXuas1quLwRYCwh_5D-YKvarTvDvtmy6--SQfrd3eHaW81US6Tet6usqtS5_1Lwa2-e9sNo5y_7dgCGuG9XMhOqiYbqaCL68pGEvwEo3Ez9GYw6En9IfysViYm_F_0vb_snlD-Z2p8sIj_zH05sG0l-uz-fyHH_f8P6dfY8OYrmVJv7ttnwtKHm-jCzR5xxluO7checJo9xwWNH7Hn4vLqbu-hOY0TSToxNs7aPxgNnDRdXk0_sUDXaRizY-46K3uFb4rzYjA3g5ANEt1vGaIiB9G6Jsf0rYFlzQ7fmeh4w645HNCJjXgDk9vNpwtM7TOzq8WcJ4uwiC7l3R5mfdoD-QEOm2NEa29037mKeCEcwqXd_lnKXP6gy8cvSDS12SAphWhhDHT4ABfEGtk4nae-OA0LakQ6O4-SdvwCMu27goG6xXzCJfWco_KJD9Ex03NHn8JUcwvSFHXhxZLFVPIfgnDrACHcUFXNx7Aa_io7qVv2sqVq_j6UeoWQ-c73qj-nwKfTcb2O1_juK0rxrnj_Oec6nOCHmUSQDtq8PHgQvqu_n09v5mN-56s-t6mHtfI8xzfzsMpfUKlXrm_vd091dXluG3CPGqJJ3ak0YjAGSrbjgq_PW9dmojvkdEgKsgLcJPu6wzERC56SEdivPMLJPSxBMEMFPnq76esSY0LEwt9uIJlZBhfGTfKlmZkJ5zqI1sWluwYN34kDlAnbT3mn3AxWxJU7MiVApjsPjXJLKCNbPaBOSqY3-92CtFdK6BTggvjGEnMBMEcH6Hh7sHeOK446YU2HqwOXSJuI4l1mNDo6GL54PyMVm1dx3iKJ7cBrBVvXrj1W8c9DFF9ClZ0B_0Vtx5upk1TtEB4zODtYUihN8uzpxnlKKUwIgqgwPtvh7-_FA4Z7tMT5ZmMAn0qz63XNZyajOtOrlbenxSSOK9CeqEhBn5RvaPftv71JWMhG4ORo5XFuC7zLJZH5npI-YXq4skzIhqchtJmmC2lTZ4ocUnMc8tayP4LmEebr8_6f7DhbYTiWcl2klcW8-xQ68dgebv8l3pjx8t4ttxLcABoebBz5KFUXnfk-pEVVYPncwPSzQEmVws68jeJLgjzMo_soWWDHSHpX1yko2gtGddVqP4RANs0GAouG6kkkwJ0s1x7ReeZbczCwYOvJPpmgSQW1LHEIEfIM1yIBXTxSdyF51nZIIKmin5OLRM9sKS09zsn9pJN5SL3k-bP1qD_2GAS0nl7K5cTAx0JOXshGYWHXpL9IgZHEVm81crHSTjhnef3g2AKXr_ZLkny4R7K4Apg5nwrjtBKo3RfNru1-mslHm9kY74pIRyF1krJqn6j7xDJQN2tWoxT1wHKnSGeLp0fEoPRPkQgzef54BUGCrsL9FofgYm6gcusJKb-vyewZWsI1oPMxZHmb_KPgRbK5sfBgxq1zFIyIu8pQKNfcI_QJKTU_Vd04_LcCUc2SKNJBqUFYcqykmhb-dhrqKtmjoDFXlySidOBqckZynPeMHiqQdDzxhMA09hYeqN96B6IpKHmxwroFmCW-uUFPzAVbBt5PIwHPNL0Mzq4Xuj0hPgyZIe7XuT4dsaidCuB2W1nSOts-z8lPhLZxiJQpHRENpDBp3n7fiJ2yy9rfWxpe3UMktwVJtDzLODTjDiHcMbFIn1NEejRC2ch6eHsx0ngmc6TY5eISXF8vebxP9O3F088B3AEfDyYw-El9ej5N8nDqSuVOwoC0aOk0vk0fpxNFuJwI3_NMq7c4JE2jxXeztB-GwpQVJ-VY_nxecMtXCWXvywkmVc5PQtIvnkdi4WiuXHcanRX57h7MwSY1rADhCyznBUCgR883LU3XKmEFz9UwKlCrIZOM8QmkCvRMJzWqh0StyKoyxs48UYrtmfuMtuX-L3hVYR8CzHW3RFdyoUj5Y6Rl69HBrcfWGUslzPq1u7nVJiNL08OZak2KdSUgwUh6WhfEDuB9UvlNqlbAx03T0JWc7agFRXWCOdP7Zf5sCiefP2xPBBvbrjuZm3lnpv18bT-tkYn81osjapjFVs0ps4jzEXiR-q1ELZw8dBGjg3jNcMoctaCqjUEuoLKnv9gnEyLvqJkog_j-F9TX9T4HNhunnCEk5B-gOZhBAX7bvy2tLRNTGFXqYuZgfhRpXeXpgy4HYhVcoYM2R4n3lNtu3mPtE5tFD2Vpsj4ZOD03Wg4bj6NxErpp2ZCOGa3puPNHig4-SapcVTVGA0K-M-0PhkLfGUraQJ30ap1p1l9ZPnO86jmM0n0tqhEtJW6MNQlVGDUcp83JqqLE3XyyxDVeRutt3c4E07QJy9Xz3F8ZU9y9yf37KC0er43NTQKy56AM60ZyQVdX6Zz5lN-yE6Zh52uPDIAgO8kCPzvA2EOaT5oAEIhffdsgYynzZwuqGp5nEEH9bkQVWKzyhL7gJQ0vuz0ARsCLhRaXhU5tEY6UFlQVeKFqCH4HC0oXcRAoTVTZ5oZqOZbWsbQurJ1kCkHK_wGpN_RFombclq0i2hUcyZLrcJbORE5ckOySJTmn7udreHva9FFOkP65NmKpFsZYsEghKkQS-22fvkBdIUWHJfwNZuDvnj2GTSR73gFjDvhK7ivntNxWT3lXKh6mP8ABMlCGMe23EuwPzzBFnkDrk-uIEsaWDkGlamFNksVsVHQ1zpiVIxCzUoGHNlUS21qRZDbr4UuQ5wjfCqG5p_1us4U_SyGcNw-aoZawP1n-1kN-8AiThbsPzutsI7pJMB6BszUO5DnJ0IhTXw344WKBuPhqeJAmR07Z8QXDijDlJbY1I_CdKuw0gnqGdDQ5ZrdqlrIj4J1ZlF7aIi2sOp8IVsXJl8fk18-UdR0JTmU1Ohtp6UC_sf9n8q-_nwxyTNZiTMTRN_jIjYiqKd0ZJ7yyrXGS8AR0pKYBo6_TRVafewg0fTlawfP8xGHtBZXF85qcjJ4PTlfrH0mArUkJFjO9lq7Dnu_wkBV4P6Z6HsYTYcN0iBM-3mervJntI712ud-kHC9BWYxUj6FD4oZd2JFHV0ncyEfkK2ZIqdMsXnKLrn_aTvETOj6KqvxM6Xvj8QSV3S1mRrZG7UFI4IoVVlP6r6t6snFT4xP3K9k8dne3GjGNZ-TSYx98xUmES-csTLBep57ax9lHNA_Fgj8hTvwVQZXzUuugzKHs5W4iLMBYX-o-V62dmKaAKvgizYr12nefR0UdxolKX8eZOUi7D2yiepQfBXV1ECJ_QEllLEoNbRiOct2DA0RAP70Eu7hK-M5c9oUt4C1A_AuLyEOfKSl507ZGjKAJtPea-Yi8xXTo3cUpacFNm48A9eygusbR9QsHDMXWXuXsA2RwZU6JxAq5RmUtWuLFBrkL1wbHg5LEZlZk3_fbzzkX48paMs9V7NFtLo5mjxMSoXuIGz7savZHB_W5bSz_Y698wObXStXea61q-W0IyqpAH9Ny7047GFFZyf-4HmQzLBfpP3fZfVX-Q3hwvLF6Reicrzz4B4c2worZSwHyHZAW2DGJNL7BiSF10o-JY-aZZiHGz6jRsWLGhIq_EpuVz1-nvIAKSfjYhsWYrJVYKmkfwFdZvhLJLXFbyPKb1NG-Klr0m6KLksZ3F5SsY8deecO4UrguO85XPvJyB8U7HxlVksBrRRC94pCuk5WTYMNkxTvNZsggWKmfFc7TC6w30Vg_H7bgtB0CHRA5eCy6jUfnKStDJWf9KiqJS2OAGDAVBlCyViu15rnygJjQZ6_dRbnHo7Hdc9_vzx5dDZSnZaEAY81RE0MdITyiJKn0ilWzxwZVDtOxHw1U68e6q7RYJSIhuEYdVAQ8nRM3--YTe9h66wCDkH8D_0OEub5TdG0rC2EX3-CpgQoIPMBNQpIyQmqMvxpsGvfnJhc-fRzci84bLR60PqyKzrbDwcsxiGuQ5m44A337ICsqT4AdBCk7p09lugLQYLBIVZcvHqlaIa8Nom0B4g62FpNrwW4O9cioZqmW5DyOS0XatOagEYQ96iUQF5NTvKc0JxbgQBFMrTfllQhYEnCL8t3cDgprb_XPZ6IMsOKR8k0ElsyicGvkzj7C4HlSoHCdf9b60Zo-Gt5Gns562UPvC5jWgAkm2J9fSf5POWdxEoMZeKuOfVrtHAVN1XX1VqzPlZlEEvGx5BGw92wFtbqQuuVExHpE71GUbVj7iEDdF1cgESxkI7e2gpnZ7jDTeJw0ub9SQAydh8f4aV20gqw3P1B_KNq1zXg11qxOl0LrF3KplS7EbkdWWszXQ5rhK1isZa4Vte8e-KRGhvWff-unaENoZl6l-aeKpaJcW8j5ob0aEEp6UX384aCHnjrPZgJFqm7sYMR34qO4A8RRP8Wm5kY4DT4e07awXH5baoaNwHLlDdnVg3zZCyjOIZO3Q8MXbNAb1_cXHvMFy8nrtK2JIs9_hITKJ6axNfBVfq0OkEtGs6RHZGBhZ9pgaoNcZwYfb3gMxInxAs_TcGHVWlmsLfn4jZ5qG9y_D0CxC1ZsJD6p1RyrM4p4aARDOq1ONDMRFY5wubem4GPZzRjpEIjGLuws4X0H3QKodcx2z9XzJ2BjW2dZqYMaSnbGJudOJfrNvgUezH9d-pNR4rFjXwI7K4UGQTvfVfel0ureuRoKYlznYnZN1f6e6x6Ha4TiWWwtVGVjXhIPxYoCL27iBtspC-D_QaE301fmu-ALiqL-Zrzvv209mEfERsRdayhJ8ikpwaV6IfkJeDaaQ_U4Hon4O4fnxCcnsLKa_T3q0xljYd2NMNv0kVL_hlw6hvMOQ9jzjb8kZHCtpZlQsBDW9-HipZsqo-LFjT70DOfG0Xb6H-w-jrA1cowmlS-mRD3U-dYg5UHewP3F3UR-xxjmjwOQ12_3fQAuAosfOTokKsulH9kS8I3Ws-vFq50Pbo2KFrSPkj_i9T9MgldtuQp90cRKHV4Vpm4iVnxtnE0dURaCQZDkxrspq7Yx7H_Y8vCaxyntqffIufCVT3mj8mn5BofynEmeDmrPRNFkXsEw_Se03V5vYVkxWMxJX1M_150whTVu-SL-NC_nMSLT6KxYnwLmrfJ2iOFLqDeIXRIdHchcR0gdTBmeZaQwtMy4-03i2MpxdDGKYqTc_x3lMawPZaFjgVbcOJUoRQKR7te_M0sVmUD8fEy1tl9T2BoY8HD74RvWu_9BI_q69PO37_qNp-xsES0n4rwx4WUtAL1RooB97Zvt_sqzfxdj-a4Rx7f5g3LmXjsaFbuOyiYtQRmUXOY2JdRgI6PV4ry4DbX-NuGs0uuHy0Og5f896cC6nz3ur1qviJXPD6zH_VmUYr23yyLXOR9kUXJ1_aFMEjvpoO_rT_QUEMGom-z1p8agHQt0_MOr5azslV6kIOzfDdBStrYNyHIeIa1ohJxZuQUgEo-IVTv6rPWNcgzgM_DUmeWKEEkfsYfSr7RJxMg9RtyaYT4k6QhKMcwhxzUP-eNZIQcbUiQQaVElherGMIgH8Lw8fCuJjxrDFyx3VWrCJ4T8on9poMcMuqZlHmC2fxVFcYvUaXwT0Avft-7dRtQbLy2e0O1eRAV6F2QS4TTTJnZQSqm3AW8PTw6KEICqDpLSywQc9r-gIgnZwb1jCDBeGULyH6XHdlQ4IpauYLhc1PwFe2_AITdaWdoDjB4Pu-ifhDrLt5mWf8R3zYhOzZMDHrJrVVEgiPlVn0csM0fEBDQ-_5XYkdsG3dOooJbVSPrrVjWY-tV3pzoYGzLJJGxjpvVyNtXF83ReTQQceggP0XffoRXMh7UgVS3ipltcxVqchGQ4VXPwRCITaRCJeVcUK1DJvB45Fe6J5nMlt2qJFYLKuyIYkFPfUUz2qD3AaWr3OkdkthnM4tIbgCK_HJzEmWX3Ft24bjHO84MqvWNif7h1vn_GCmPhOrSEjAMzeCTyyaaxOpmDcde1fxewKTTHlb2gBR8gOBNJS5ToO2puirQRwD9QsJlmLUKgfkd8pFYZjCSH5EtRVEwZNSHbsOmB5g56DVYE61c-Om9ptc-y8Tb-f9eGUgEVEYGPk8EaApogxE-X9wUE1onWcCPSuok41Yq5jUzcGgsbOnOv7V8MQCGclU-2zOu7vIp-NpoEYTSwKDdxKuxtlj7gg0UZ1YqrfqBkajG53LvwM-4QQUaJPj8m6yY0gVz_eRcKTRzLVnCQSiDD42sT120CRKYHgHkN2sSYPszQeMaQQO6P6zIAL7sLWllSo-E7MCwNrPty8diXuAsJjuQXO4sl-0FRMHMWdyZk6jl3Zo6-AcuTMwAp2E-rUWsr3EZtJ412-ly_rLap7QL7XuBA4kX8gsqPnBPbdOG4UwXx_TXBIgrQfhlucfOQbgDXYtNe5EeN2hkCrt_KUlY3ADzkp2B1zpce0ZnBEsyJgRccFBvVBy0pKnCg-wJWdV6wotMUnxf7YyRBMWH9C00JezS5WqSHC8s_wg6KdNI2roars_o6DrgjyVNfZlgveMgtV2MVNWbdqywukXDnU9bYcNS2pOMlCq4sp-6GzFWdVRhWpb19LVZj28lMtTt4wM3Q4PmnH0idR0YzpE4RUCKUBgcMDHUgoG_LJyPm6I-BWG15EzQ7XKz4Cci28j-6kcdaXxi3dj2WuhzvP_xf62_EHaXU3ub2tgdZ5Kw0SJfZfdhz682QiWotOXDpaTUc0Gxb47bG5J1SJdRYw_qmvParvmEQ8YZKE2kyPmaDaCizbBP2D0w-BqB3_ot4vkH-mL-TY1ILmEx1oeNOvYN5B-SNKE5MbtKCz4clGNMqhlxuJDr-b8goMLQ9j06S5ixuyJSehwLQ3h80iVnF17fqwmPJZezbTe4ZAJIYFQn7WFtDHWF7RC6qzAi4nd4JNz0a7aCztSRudBXtg7HmJXcp4eUKl2i-MUfhGGnsS5CB4_S3VFsDlBvYZWpgZNfR5WdIUguEJ1gGddIc2H-dYz9kWqt2dkLBfQRXNUjPPgy7LkaKawtlRzAqVBqC9mkRFpQ6jc4sRHNYTabJ7Qlz40E2B8bGEfgHY_MTCDdFUQMehp6Cw7O1iUjQ1llEC1-7uRooSVLWR8hSS_ffpRJ6nEwD47Jg22DWtX0J0tUxx_cYnV7RaybugPq9fDlEAUOsFNhLu7Z3iTKGLgpX1wJa7Yep6OCjwFzYMtL_ws6DoMlWaK3D4QkWalVf7j_DIMNOgaouFH4p26GTbmpma3ugemZtMAV5q7fjyuUqv62sYAbZsSaSJ5gv0BwU_SejoCtta-pxvZP5CQYAT4EmfM2b4L5mSyL9IbX2BctrQ1BlYsyYoGIp3NKKtreuWX9jgQEMw1tWnOao3nXIAILZIk88plohxwB0QrDaVXxm-YDg2I1XyEA-VJT2VN5jvuEmCCaOZBaOo5sgkZL5ZsX6WMjMyTzj8LNjby9Ua3K5atDyXXZGgycEtZULVLU2jdSxAmGnQZyRddZiRHcA3dtNkvGeA3ufHCbg5l362mqIMr2kJc6kRQ_PeFjC8rHKkJSMT1norP6RINTFpmSMePnicP2uMrZx_V2MiJEsbKtKysPcvu7FRUt1qrpB6lhebJzXxGBSn8OQbmNp-aDO32a2RzCRDN0ELGs-UnMpsXwq58eXYAUqmfTZfwEDgZxIChkArerAZ7rfC1gtUI7QS2EVWCmHgKYhUZ8ehosMEXmBz6kAEdtQjCTHeSgzwhtge0qJmboxgmUNWXUoILzFb4ao7mzNxx6few45Pps3JleRK03NRYlZsD0mBzj07JyU1ihqnPblxFO4BL7eO78cLdjixoszpsD2J2xbAyAVzqKEjJt2zJaC9SzosxTxKRaLiYFOchSk9nE3qgN5oIFgGUxSUyiZdzi0jIxE3xt-QEmcXuNJMe-goktc_1GHJMc-g8V3aRVTp4SvAq46OoMhmnJ2xzTKloZf5TKhRg86VqO-JTXLo9J3R5zHXbbDXRkzA5tM4h5zZXDsjxX1yAvnYiW9gisDhnWNKgbojtg10SNyGrZgBJ1vfRuSQhQqeB44qYC2glEWtS1JUKl3GYtuXOFKjC3tTBAvodHBMMzAfsDdc1nW4AbutM7DrIBwQ32wv3nJQpwI8UZtGe-uWXXJsf7-j-az6tvfgl0EfiSkfoAwjyCJc8BTkK2PdaZs7IMdKGUAP9qkH-j0QFAPr5u1GjHGaUY6LjOsaOzymlkAatRSEXbrav3QGBFWG9qV6YA-Vwq9k2QgqjfoZprTwuxmu0oXANVclMb7A7Q3OK5JTmGOb2smTSRqaQDqVS6dHNgk7ZOTmlQ7i9PYrRw3WH7cynuk1NNU-qHFd4og1D8tSUyfcRLXjaxrl5u-mbue9BSqMhRmH31RlLBE1lkhCEmwLtUXEXpABRcwhOmxUS3WpzsZq7OMcJsxhS1L7Ak1BE4vE1gBdBT0pWXXZGUU69lGZ1XAQzqRCjraYUHk6YWJzmcaBoKeROATwYwuDQBlWtIuvcrDU9Le9ZSC3T4GSu77q3VqJDZP4vSqUEFEL-1TDyclaOqg9MWZvLGJ8dOJwko0n_HJD5_bdd4Zz17nn3B95YA21LflTR68cgOc1XawYrG64xDAlX_AXYIIuraQSYNDgfGIlXYWmCRVPBSOZSd_gJVTKWvrbYtXMzJGaQ3cd5yY4365pY-Sq40Qh9iSa6V_HzpB3J23_gR2vVqPDZSrk8B7evj3fTHe6jJpAxp5qpSBNlMyESa9Mufk431icUQu3BEAlb4ESHLM9fY9bNVk9ZTN-i8iLVCLZBnQSsb0pqi6blYeQuNzNXaXItrWE9X5Z9R6y4Rmd5fJtbEK4YAqN2MdgPSnSgMerXPlp2eW2VuMigok-q6EGbuB09ix2ZDtr-npDd9GBtjQi1V-IG5Ctuo6mY7tY_qOeNZKqMrrv4X2q2nAP0QwUvCvN-QEfkhj5B2TcPyqsffN_YbhGOHUsFJqmMV3XwcVqncuGi4TxM996pAXMhd-GzEdge9ImDR295VQFK-i8nsePf4q4imUupD7WE08FgFzXPGF5ec08D-AsXbbjRlk73eGVDmDlHC6HAeqyqXbho5UniXahEFjqZAlZPuahmV91aNvbqL0QgJLCl5J9dG1M1984P3mkgne2Q_mFJWtMN5qdcpmex1CCL2klxL7JSecwi5_ht5h3rSEIrX0RUvbNzZ0V_9uhQbhgCasJDSA8j1INSxH9ZEuJdqU-SWOdfzVpoLznYWEta0TGivS5KHit_Iyk1oi-ahRTwFRdEuQ88-r93klLzyTzhA9W46X3UNiQDZ-yS0P1gAUl8UZUMMkEW7YcwjQq22WyuoeevlBIXUVvv5DCdPjmbcKIboL_DGEPVrX_M1W1OTzeK_Jhw55cjtr0TjzCZTCRpmMd-PEailPdU8zVYN8lMfsjJAMqwA4iiztBK74BipZkONf1Gt0J2QBMtweNfZ5PIB3IaXRDAEWcr-rWRt1113ePZ0asmTfrIoT9G1z_cbSQW2KJCmZUwzueGfi6Uiijw0kzcqkAJiP4h-WOHRFqvk_dM3EP5NWuu1ZSCB1zii5WaqI55tJkrxQEC65fViLA-RDcxljit6p7zOlaVMNDa2PtXSUjRKOl2n7ekom9Q1na-_jXdCn2jGy_2IXhZ8E7jqjrQX3H80mcBqGVOmlbZ119vA4DsawB9TEkG_aa8LRxOPvx2KkiUB-ww0YB05piYpsh2DQLct3f1d1IPP1En8ddft2lM20XOtAkjrTtTb2bwmLmbJUqo74FvS1arCmjfQENxHu6JvwrbDB8S3tAMak88yClPHbrGzM0UyLIKZ_E8gbh5GmSOtDx0DReSvJHg5SOBJ4vOnRq4BILr7jtl-HqAc22IrjFyP9xzaMM59a5xmfGdSUN8nYVAjvRm3Yx0czYdaPxEMuDJqHgpnVhGBZMb8TbzzOjDsEos27cHJFzDwdOHhUcrQ98WYXZixmZHQofWcm6YeVutX-TUkOPV-fNpezzezXtOrfkzsGTL8DnSdwfNmfuyUTV4edq0Xkk70dJx7Hz6HqcsPFOn5fZdzsIpa-6x14I7Iz_NnLHx6PtsSM3FbyATrnhfbAN600PLT-KdTh5s-MXiBBHPwQB860VaZOUEq00Exjy7u7qKjPx1Z-dNU3QnIPbZXY1WT2wHaQ5DwzA9XgvIg2E3VTv0gLGuLauLRLeQWLeHo94Rw7r5dIRSClHwFZ94MonXdOFJQI-HjBD7MABqBygVFQYmb0xN5hBpSkEnBVgu056T_m8p45Y3VEYTKxIl6_JyAMY5bZyGEuNUpbOEewSJ6yFEh8zcahX9yzvDx3ADB_t3B6mwKSXSfrHI_azHUrDo-yyh8A65jE2pv_uDvnn9vySFw0FL9u6oriM8fiDklJSixtG1FhsAGkb9_on0qSRQPbzbWX0EFxpvhTwnoav2-vswN8ZNpZ818A4JsjprsUEEdnVZlNH5m-j9qpd2r3Da3TeCsfHWgzZgQaUSPZoGAXabQJ5Jz4UGW4yk7oKBw5MBYhSHA90F-nXs2Xr08acQCZe4i919k5Hssh1LOd8YCGR9pj8Ji4n2e2UILaRfQ_fhGeEKcbjYIfh4MeQIEw2DrbzXPYkPsg34BMM3FDMCAZJZR9_mznb4KPJEQY47cISvaGj6OTZuamDrCe3p2Y9XzbQu4d74psE2cHdn6OojPh4mA9-HCzkrDadZCqc2aRjYOUvDRwrxZRFxBh0ZY3S3Bd7Gj8nZSviiVaTgZ-mjPVO-RMd1Gv71sZeL_4TfWc5_VP6FOeK8C_j32NFHgsiyjEz0mj4Al560qd9Ff9G6N6CIrK0RoEJuqwDi-YK1eR0RhLnSIIINsayUxF2a0EcL5ouaE2MOUzrBmi0q4w2dK07sBizvlISw87m2BFX0KPIz36g4qS4K88GpMS2aLcab3P9wqucdmWPwi6ZPIbv6aglkRN1WpGjvtq6EBRJqIgMtjxrF7oSSGcAn6BjJ5cXaAvKTmF9SefFn8LrkGWVJ7oQwnj16ZEcZa48Z_AltxHy4raPTfB8Fw15_ho_l4l_jEztd45cClhbZLyMz-zxuKZfzVBgH0kJv8ai2FeYlMpSk9E_T6Jbgl9oMlcC9iQ3cuqO0YEwriKxFxq7QsA41W2iluLgMDEgC49tCg8mA_4CG49AVHpcJKUdq_8KUwspuQX7kc801E14Jjip4K3D_ABNe5o9FkmCAGAx3ShtClNIyZF57dLdhty47VNVu7efXyPf0QBha7Kf5RkFLDNnsOziNLvQBEhu6uE-6UyznoWy91YCYNttos5Rn6rePJEyUE4vqu4Qu_YB7Ufu2DjmnnTNPJa_nCQIUjot8zLcb-gie8QJ5_ZxOYM7ehokeuFVp5WFDx3-avoaZLGa11vw1qX6jH2V48sr0MOeVs-4_vGNx1yA-NZ7JZwQGNWzCso8W13XRVNZApAZXU5mpLhud7GPpMK7EpcTiKHQWowwyLH3KECQhFJ6IhF9SXIYEw6o8JSX-Nqn3kjKjqHXypOEFfCrpZunsoKSFOW_NASTIQg9cpGBeBJPnoL9ZbVVusRVbfvQphzkJVz07IW2IPukA50MHKxZY_hCmmUz_vzuXW1HZWS2xXk534egzeKzMp8RnNs4tO89vT_TReSac6PtuKbNc2T-Piqb-TmauWokBOWUcw97sMESgFFChPaYTEI_GvYS-fEYLZ7xzm6Lk7iQ4oP9fOBW0SfiUWBOnXN99cT9HQq7uPPU_8-4uO_bO7XcwXqGobJyWw9ZxqFe5iJCPXBdxKeIGabQDoj5Lh7h1Pq3zYcf_oRKBNPVa1oO6EmOa95fkkbC-403hHRSKZHQE62vok-pFWbQVLQg9IAgIq2qEchwwQRhEOO3UWsFj6KJ9vynhjR0iSAETnydIRHABHD12dRRETRewr9T7yN0QmP2-yqpNysaBuRK9ZE2cFO7A9YDGdQsho_-ZQN2mv9afGPRHPLFLrpITmKI1ilhsCxokaZueF27xPquFuPGVCzwiZSt_hFs7DzdupT-wAVhewqut5pDjszrDSbyPuywWb8xlNa-90Vm0vgJz_u2GXYJkf7ZvcDTCCwQj4AmrY2lusjzrXEb78Tj4n0mqmKyHaTjq937q7PIGb9gNohdYMtYHOUxl-KIewxqrHANH1TXfaNHbZeiTQxXNOcc5IqxVZLcrRdMjqCds3q4GMrYXSDaf_G-aOoGYjITpjfuWpx__I8OjfUaEIzlOdMUY1Lkm8c5gSmTbw1_htiIE0BTG6uo-z0I-vgcGx3JTCyw-OEEj5PReLp_EoUnuKBvLMYvDgPn3OU554NJU5geRgfdm2mP2QvGhYQnXj_MjsVkTA9_0MvZtzPkGA0HW6xgdM8U5RI_BdkY1bwUUs4yPoAP-1BQeGShwD1iH-cSJruAPs5SsrxpgBCYCJhPgebG99YLl00g0KqkrkaGeFneHyOlogIC0gun25XuWeGNN4NpXzcjoLzVbgfUBO-g87XsEdl_PLXsHc5FFJMhcs9delc66sh1kqlVEHZkoFnADRnDVi-nwbRMQUPnihAaEAHDYL9Xjsg42gyD3vkv6Sh0z86kpC-7S0RDOqQv-qYYUe8vDu05erqB8SR_-GUkbn5bdoyaqGHBA_5o6TS7FbyNX_gTDzGwpKibak2I08LJgjTA4EmU_4FzNu7AS5K2WoGOdgTxRlztomJVwanXgHSEQbFIws-NLkIJSde0ksnus1TlK9KOSF5KEJLe-J9EfoG6J-F135CPjNfsJ3wPHLCcR-DsRGBIwCifN9Q9HJCad8YOGaU-1TmsSa8LrxooeLS4ksHYba4dVxjudOtOXIIGkyWlF4I1LurRmEWD9uiKXUue7AuTUL1G8ojhYDgfM_iS8n4Gn5i-e_2QLoCbT9AyLPnb6TtmmWm97e2qX65kF5amo77UyEjRRbmGoxOnAsxYjjszL7bUmY4e_uL32QzmECqtuMF4sUcnyRy-Bk9eGeste6fSC-MaqlHdHSr15h2bjfgahJJ9Oh5q7cjub98-Pqw2oOl7MJ7QqM952RcdjzjhqvuGLJEDr3K-3OXC0zwxtItqwkbpC87bF_sUXfygpfr1MojB1p0hcOQAS8KwopWza8v6kOJG6s5CMygLfIdomq02PD3y6QTmKVWlUGwj9aX49sPLFG1HV5lepb0Xo1WQDchK-1aJ5Bx2W4MQjwttgR5hjnaJWPZCI_vCB7Lhh-J38VzsCU96fq0CT46ZrYkqjmxnqFIPLQ6nEgDNpUJUFkb2CQdk14o3L_mFgHs7QZsux4-l04vGTcLRNOD6RRHsKFexLuWorihRSvLQ0xlwXKgHt5mMmmUSXz1Fm5n5zBXqTtgKwt_XcyVtqW5F7znjggY0edgZZwUtzJWbGGtlqL2wZMuFnwecLxvjMrCQ5p6oexDcDSmCA8qvvv3RtQucSMcfFNwwC2o-oeP4wLaX5uCGtJjPvZKp5imC8EZMUBxNCPgfmdixxh_u6NN9prdLQpgcpPb9wLymkbGnIUIiPfraMdE9e8O_KBgHUYB2SDQkiraaIHN6i25jXbcdxcKUDJ339cS2F5HA5MzXcDwu2DXlm3OkpO_Z03dx9HO5vew-ws0UQJwyIsuQm4MKNxxEFpFtSxXg4XWAilm64nszid4beokLtLtOXJ_IGIran5L5YUSL6bOyovmPfBTyaKa_9teHPX-JQNo4ktBJwbaKud-zfbMvqj7nlo95WZnMvgbIDwO2Lng8EAeRPHMMOTQ7ttNkj2vhzZEpKYpY6_LjAaApTAGJYO04bepX-4-byAOGv4wnr1DDg0omtkhMBTsOe7SDyMaMvbElZc6qMvM8wYPBJ0cROq7qZpUJG_YwaBkiIRYUBedF7pwglYnZjEmltMeGnPpwBJqEbU0ToToo0w58TWhjzLjZ8se7-KrshN_UKzc31vSi8FGyqf5C6yUG7M-XThbrANzY894RzkQB8udnP66qMAlWqvxPYCIFpzhFPPzHlhCbYos6c-IlTijFJ91Wf1B7jbR6Z7pYL28OFPsr4pkJ5VqEKefDVTjHaadoF4DzXns8aW6P79T5U50aVYt1lZB9WL4t9ciDVWRj70aZwToCO2OaE2QX0ZyNmUbP4f49f0X2MgTbJh_QmKbVe_xovEhb-SuNJZGn6GKJ_JIJQLcRe09iiilvXkWPj0uDrjlJuUGFjL6hkz6sjAVZL9Ln-TPTJ2Ip5cLNs1LICRT30L-c8YwVezCJ-pCLFUhKKCousg2-cPwoeZbqS81Rc7vCNfVAXChtt4Ohi-fzAtCZ4qGjoHegHyExWKLcEb-_QpvabEKfSRFZJrQjI2GX-pw2AGgTu973jnfy2MUthe1GRDs0HjRts0OzUYWyKhk5tLWBIjOYsPSiwwdXam5knKY1l36xJb-wU5yYiYpowRLKPGu0nyhIKmHKIw8CAgl7NuQQXuwTzUmQq0fvyClgBF_OodaBLdqTsV6vIQpv43VOkFC_AmDMdzmmAkbbhV0qP2sCa3eJXACAratph0QA8tIxuna0ANtf1eHhtckIHtdR8Mpj7G_GLi54Z8HjzLCv2YZypuZ8quczFDRFSmDl_Vy_eGofcTY2W8yf9uQx4L5y-DlkopmcvmtCIjkFhIKeERp1RT3UwS5m_afDwxuCPqNfQrL08O_hJMC_g5GdqMlpZIMDq7gccFlod-fdOE0IXmg2kcYMVCjRmucvxNYHNGsj4xz0eW_xyqzyJ8IoGGoiTrdUYHqmEXYp6LVYzLxaME3gXjdBSChuei2XHLub7kuY4elWxvXRk7l08d2DuBLMdInaYnm1yZlaLnGxfnsdvDULse3IxVT77rJZa8gNpo1QnnuuduYwk1aasKpjM8oJJE6HlrIKyICQkHjUIw-HDuesVlgktWjLpkBPmcR-rvCwzajcQ1tDY-sigzP3MK1hYmFBgfhKMTc13VStxq0wFazOasmgrq8_Fnob64K387xYWphQueHVi8KmbogZwRTb_JnhpWOjvAQjFIgSx9JuVm2rJ6me2igrOVqppjgMKx-OpGXB8I8-z_cEODkIKJHqQ4rTdYWYRYUtS3Pi4AYgSdoCyGOs9TZrA52be1-LCY1mW3G8iagsQEh2Oy7S2DftTVQZtm_23As61HneLn_wbGvxl2SNQfhYxVON_dGuxHeLjrOMr8AKmVRRyBHNMAP60L0DBETnkC_Ab8B2zw-nxXhuNVWUK-e3G0Spn1cMRzqUXxZxF-2_4MQg-zIyTXijR93h8g2YbUVk0Q9jSIumG1kjsy7TX2zl1gt7N5MovyryH9PuHhJbFYK6BLW9KklkOXHaPq7FI1Ln4JdFwySUazrak2WKQOm-yUAKJthxLM8nf-DGgbhc3ZkWTC3juMZQkFbVheYMnpqd6cLbNRxz_PnIIesDXLzHyfgQFQ6DQkBhPzDp0h2gAW8iygiRUpzyqM18jor2OirjRLjonsl-GgDXrpBDv7BmGC0CuMvyq1ipDNIyarFHONEmn4H-bO0CHVUXmWiIqQYwnSjl0YrBaqJNuMPoduJaACLBdOJOIgTCV3WSXMgwLuG7-pfYOo7AxINAcIWH6iV2Q9Fo4hyAjvA5WSX_D-_lqjWMv7oV5f_cqNjmnmFqpM_ynPVIeUH1LEYDxWYAQfVXZzzlTFawI719cHE9-rwqMu0vH-uUfyBWJwC6ueof"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,a,i,o,s,l,u,c,f,d,v,p,h,g,y,m,b,w,k,S,I,A,E,T,x,N,O,$,j=\"@info\",C=\"@consent\",U=\"_tail:\",M=U+\"state\",_=U+\"push\",F=(e,r=e=>Error(e))=>{throw eu(e=ro(e))?r(e):e},P=(e,r,t=-1)=>{if(e===r||(e??r)==null)return!0;if(ep(e)&&ep(r)&&e.length===r.length){var n=0;for(var a in e){if(e[a]!==r[a]&&!P(e[a],r[a],t-1))return!1;++n}return n===Object.keys(r).length}return!1},q=(e,r,...t)=>e===r||t.length>0&&t.some(r=>q(e,r)),z=(e,r)=>null!=e?e:F(r??\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),R=(e,r=!0,t)=>{try{return e()}catch(e){return ew(r)?ed(e=r(e))?F(e):e:et(r)?console.error(r?F(e):e):r}finally{t?.()}},D=e=>{var r,t=()=>t.initialized||r?r:(r=ro(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},V=e=>{var r={initialized:!0,then:B(()=>(r.initialized=!0,ro(e)))};return r},B=e=>{var r=D(e);return(e,t)=>J(r,[e,t])},J=async(e,r=!0,t)=>{try{var n=await ro(e);return ef(r)?r[0]?.(n):n}catch(e){if(et(r)){if(r)throw e;console.error(e)}else{if(ef(r)){if(!r[1])throw e;return r[1](e)}var a=await r?.(e);if(a instanceof Error)throw a;return a}}finally{await t?.()}},W=e=>e,K=void 0,L=Number.MAX_SAFE_INTEGER,G=!1,H=!0,X=()=>{},Y=e=>e,Z=e=>null!=e,Q=Symbol.iterator,ee=(e,r)=>(t,n=!0)=>e(t)?t:r&&n&&null!=t&&null!=(t=r(t))?t:K,er=(e,r)=>ew(r)?e!==K?r(e):K:e?.[r]!==K?e:K,et=e=>\"boolean\"==typeof e,en=ee(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||K))),ea=e=>!!e,ei=e=>e===H,eo=e=>e!==G,es=Number.isSafeInteger,el=e=>\"number\"==typeof e,eu=e=>\"string\"==typeof e,ec=ee(eu,e=>e?.toString()),ef=Array.isArray,ed=e=>e instanceof Error,ev=(e,r=!1)=>null==e?K:!r&&ef(e)?e:ek(e)?[...e]:[e],ep=e=>null!==e&&\"object\"==typeof e,eh=Object.prototype,eg=Object.getPrototypeOf,ey=e=>null!=e&&eg(e)===eh,em=(e,r)=>\"function\"==typeof e?.[r],eb=e=>\"symbol\"==typeof e,ew=e=>\"function\"==typeof e,ek=(e,r=!1)=>!!(e?.[Q]&&(\"object\"==typeof e||r)),eS=e=>e instanceof Map,eI=e=>e instanceof Set,eA=(e,r)=>null==e?K:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eE=!1,eT=e=>(eE=!0,e),ex=e=>null==e?K:ew(e)?e:r=>r[e],eN=(e,r,t)=>(r??t)!==K?(e=ex(e),r??=0,t??=L,(n,a)=>r--?K:t--?e?e(n,a):n:t):e,eO=e=>e?.filter(Z),e$=(e,r,t,n)=>null==e?[]:!r&&ef(e)?eO(e):e[Q]?function*(e,r){if(null!=e){if(r){r=ex(r);var t=0;for(var n of e)if(null!=(n=r(n,t++))&&(yield n),eE){eE=!1;break}}else for(var n of e)null!=n&&(yield n)}}(e,t===K?r:eN(r,t,n)):ep(e)?function*(e,r){r=ex(r);var t=0;for(var n in e){var a=[n,e[n]];if(r&&(a=r(a,t++)),null!=a&&(yield a),eE){eE=!1;break}}}(e,eN(r,t,n)):e$(ew(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(r??=-e-1;e++;)yield r--;else for(r??=0;e--;)yield r++}(e,t),r),ej=(e,r)=>r&&!ef(e)?[...e]:e,eC=(e,r,t,n)=>e$(e,r,t,n),eU=(e,r,t=1,n=!1,a,i)=>(function* e(r,t,n,a){if(null!=r){if(r[Q]||n&&ep(r))for(var i of a?e$(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}})(e$(e,r,a,i),t+1,n,!1),eM=(e,r,t,n)=>{if(r=ex(r),ef(e)){var a=0,i=[];for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n&&!eE;t++){var o=e[t];(r?o=r(o,a++):o)!=null&&i.push(o)}return eE=!1,i}return null!=e?ev(eC(e,r,t,n)):K},e_=(e,r,t,n)=>null!=e?new Set([...eC(e,r,t,n)]):K,eF=(e,r,t=1,n=!1,a,i)=>ev(eU(e,r,t,n,a,i)),eP=(e,r,t)=>null==e?K:ew(r)?rI(eM(eu(e)?[e]:e,r),t??\"\"):eu(e)?e:rI(eM(e,e=>!1===e?K:e),r??\"\"),eq=(...e)=>{var r;return eJ(1===e.length?e[0]:e,e=>null!=e&&(r??=[]).push(...ev(e))),r},ez=(e,r,t,n)=>{var a,i=0;for(t=t<0?e.length+t:t??0,n=n<0?e.length+n:n??e.length;t<n;t++)if(null!=e[t]&&(a=r(e[t],i++)??a,eE)){eE=!1;break}return a},eR=(e,r)=>{var t,n=0;for(var a of e)if(null!=a&&(t=r(a,n++)??t,eE)){eE=!1;break}return t},eD=(e,r)=>{var t,n=0;for(var a in e)if(t=r([a,e[a]],n++)??t,eE){eE=!1;break}return t},eV=(e,r,...t)=>null==e?K:ek(e)?eM(e,e=>r(e,...t)):r(e,...t),eB=(e,r,t,n)=>{var a;if(null!=e){if(ef(e))return ez(e,r,t,n);if(t===K){if(e[Q])return eR(e,r);if(\"object\"==typeof e)return eD(e,r)}for(var i of e$(e,r,t,n))null!=i&&(a=i);return a}},eJ=eB,eW=async(e,r,t,n)=>{var a;if(null==e)return K;for(var i of eC(e,r,t,n))if(null!=(i=await i)&&(a=i),eE){eE=!1;break}return a},eK=Object.fromEntries,eL=(e,r,t)=>{if(null==e)return K;if(et(r)||t){var n={};return eJ(e,t?(e,a)=>null!=(e=r(e,a))&&null!=(e[1]=t(n[e[0]],e[1]))&&(n[e[0]]=e[1]):e=>eJ(e,r?e=>e?.[1]!=null&&((n[e[0]]??=[]).push(e[1]),n):e=>e?.[1]!=null&&(n[e[0]]=e[1],n))),n}return eK(eM(e,r?(e,t)=>er(r(e,t),1):e=>er(e,1)))},eG=(e,r,t,n,a)=>{var i=()=>ew(t)?t():t;return eB(e,(e,n)=>t=r(t,e,n)??i(),n,a)??i()},eH=(e,r=e=>null!=e,t=ef(e),n,a)=>ej(e$(e,(e,t)=>r(e,t)?e:K,n,a),t),eX=(e,r,t,n)=>{var a;if(null==e)return K;if(r)e=eH(e,r,!1,t,n);else{if(null!=(a=e.length??e.size))return a;if(!e[Q])return Object.keys(e).length}return a=0,eB(e,()=>++a)??0},eY=(e,...r)=>null==e?K:el(e)?Math.max(e,...r):eG(e,(e,t,n,a=r[1]?r[1](t,n):t)=>null==e||el(a)&&a>e?a:e,K,r[2],r[3]),eZ=(e,r,t)=>eM(e,ey(e)?e=>e[1]:e=>e,r,t),eQ=e=>!ef(e)&&ek(e)?eM(e,eS(e)?e=>e:eI(e)?e=>[e,!0]:(e,r)=>[r,e]):ep(e)?Object.entries(e):K,e0=(e,r,t,n)=>null==e?K:(r=ex(r),eB(e,(e,t)=>!r||(e=r(e,t))?eT(e):K,t,n)),e1=(e,r,t,n)=>null==e?K:ef(e)||eu(e)?e[e.length-1]:eB(e,(e,t)=>!r||r(e,t)?e:K,t,n),e2=(e,r,t,n)=>null==e?K:ey(e)&&!r?Object.keys(e).length>0:e.some?.(r??ea)??eB(e,r?(e,t)=>!!r(e,t)&&eT(!0):()=>eT(!0),t,n)??!1,e4=(e,r=e=>e)=>(e?.sort((e,t)=>r(e)-r(t)),e),e6=(e,r,t)=>(e.constructor===Object?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),e5=(e,r,t)=>{if(e){if(e.constructor===Object&&null==t)return e[r];var n=e.get?e.get(r):e.has?e.has(r):e[r];return void 0===n&&null!=t&&null!=(n=ew(t)?t():t)&&e6(e,r,n),n}},e3=(e,...r)=>(eJ(r,r=>eJ(r,([r,t])=>{null!=t&&(ey(e[r])&&ey(t)?e3(e[r],t):e[r]=t)})),e),e8=e=>(r,t,n,a)=>{if(r)return void 0!=n?e(r,t,n,a):(eJ(t,t=>ef(t)?e(r,t[0],t[1]):eJ(t,([t,n])=>e(r,t,n))),r)},e9=e8(e6),e7=e8((e,r,t)=>e6(e,r,ew(t)?t(e5(e,r)):t)),re=(e,r)=>e instanceof Set?!e.has(r)&&(e.add(r),!0):e5(e,r)!==e9(e,r,!0),rr=(e,r)=>{if((e??r)!=null){var t=e5(e,r);return em(e,\"delete\")?e.delete(r):delete e[r],t}},rt=(e,...r)=>{var t=[],n=!1,a=(e,i,o,s)=>{if(e){var l=r[i];i===r.length-1?ef(l)?(n=!0,l.forEach(r=>t.push(rr(e,r)))):t.push(rr(e,l)):(ef(l)?(n=!0,l.forEach(r=>a(e5(e,r),i+1,e,r))):a(e5(e,l),i+1,e,l),!eX(e)&&o&&rn(o,s))}};return a(e,0),n?t:t[0]},rn=(e,r)=>{if(e)return ef(r)?(ef(e)&&e.length>1?r.sort((e,r)=>r-e):r).map(r=>rn(e,r)):ef(e)?r<e.length?e.splice(r,1)[0]:void 0:rr(e,r)},ra=(e,...r)=>{var t=(r,n)=>{var a;if(r){if(ef(r)){if(ey(r[0])){r.splice(1).forEach(e=>t(e,r[0]));return}a=r}else a=eM(r);a.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...ey(t)&&(\"get\"in t||\"value\"in t)?t:ew(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e},ri=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ep(t)?ef(t)?t.map(r=>ef(r)?1===r.length?[r[0],e[r[0]]]:ri(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:ri(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},ro=e=>ew(e)?e():e,rs=(e,r=-1)=>ef(e)?r?e.map(e=>rs(e,r-1)):[...e]:ey(e)?r?eL(e,([e,t])=>[e,rs(t,r-1)]):{...e}:eI(e)?new Set(r?eM(e,e=>rs(e,r-1)):e):eS(e)?new Map(r?eM(e,e=>[e[0],rs(e[1],r-1)]):e):e,rl=(e,...r)=>e?.push(...r),ru=(e,...r)=>e?.unshift(...r),rc=(e,r)=>{if(!ey(r))return[e,e];var t,n,a,i={};if(ey(e))return eJ(e,([e,o])=>{if(o!==r[e]){if(ey(t=o)){if(!(o=rc(o,r[e])))return;[o,t]=o}else el(o)&&el(n)&&(o=(t=o)-n);i[e]=o,(a??=rs(r))[e]=t}}),a?[i,a]:void 0},rf=\"undefined\"!=typeof performance?(e=H)=>e?Math.trunc(rf(G)):performance.timeOrigin+performance.now():Date.now,rd=(e=!0,r=()=>rf())=>{var t,n=+e*r(),a=0;return(i=e,o)=>(t=e?a+=-n+(n=r()):a,o&&(a=0),(e=i)&&(n=r()),t)},rv=(e=0)=>{var r,t,n=(a,i=e)=>{if(void 0===a)return!!t;clearTimeout(r),et(a)?a&&(i<0?eo:ei)(t?.())?n(t):t=void 0:(t=a,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n},rp=(e,r=0)=>{var t=ew(e)?{frequency:r,callback:e}:e,{queue:n=!0,paused:a=!1,trigger:i=!1,once:o=!1,callback:s=()=>{}}=t;r=t.frequency??0;var l=0,u=rb(!0).resolve(),c=rd(!a),f=c(),d=async e=>{if(!l||!n&&u.pending&&!0!==e)return!1;if(p.busy=!0,!0!==e)for(;u.pending;)await u;return e||u.reset(),(await J(()=>s(c(),-f+(f=c())),!1,()=>!e&&u.resolve())===!1||r<=0||o)&&v(!1),p.busy=!1,!0},v=(e,t=!e)=>(c(e,t),clearInterval(l),p.active=!!(l=e?setInterval(d,r<0?-r:r):0),p),p={active:!1,busy:!1,restart:(e,t)=>(r=e??r,s=t??s,v(!0,!0)),toggle:(e,r)=>e!==p.active?e?r?(v(!0),p.trigger(),p):v(!0):v(!1):p,trigger:async e=>await d(e)&&(v(p.active),!0)};return p.toggle(!a,i)};class rh{_promise;constructor(){this.reset()}get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rg,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}}class rg{_promise;resolve;reject;value;error;pending=!0;constructor(){var e;this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(!this.pending){if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")}return this.pending=!1,this[r?\"error\":\"value\"]=t===K||t,e(t),this})}),[this.resolve,this.reject]=e}then(e,r){return this._promise.then(e,r)}}var ry=(e,r=0)=>r>0?setTimeout(e,r):window.queueMicrotask(e),rm=(e,r)=>null==e||isFinite(e)?!e||e<=0?ro(r):new Promise(t=>setTimeout(async()=>t(await ro(r)),e)):F(`Invalid delay ${e}.`),rb=e=>e?new rh:new rg,rw=(...e)=>Promise.race(e.map(e=>ew(e)?e():e)),rk=(e,r,t)=>{var n=!1,a=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(a),!0),o=()=>n!==(n=!0)&&(r(a),!0);return o(),[i,o]},rS=()=>{var e,r=new Set;return[(t,n)=>{var a=rk(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,a[0]),a},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rI=(e,r=[\"and\",\", \"])=>e?1===(e=eM(e)).length?e[0]:ef(r)?[e.slice(0,-1).join(r[1]??\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(r??\", \"):K,rA=(e,r,t)=>null==e?K:ef(r)?null==(r=r[0])?K:r+\" \"+rA(e,r,t):null==r?K:1===r?e:t??e+\"s\",rE=(e,r,t)=>t?(rl(t,\"\\x1b[\",r,\"m\"),ef(e)?rl(t,...e):rl(t,e),rl(t,\"\\x1b[m\"),t):rE(e,r,[]).join(\"\"),rT=(e,r=\"'\")=>null==e?K:r+e+r,rx=e=>(e=Math.log2(e))===(0|e),rN=(e,r,t,n)=>{var a,i,o,s=Object.fromEntries(Object.entries(e).filter(([e,r])=>eu(e)&&el(r)).map(([e,r])=>[e.toLowerCase(),r])),l=Object.entries(s),u=Object.values(s),c=s.any??u.reduce((e,r)=>e|r,0),f=r?{...s,any:c,none:0}:s,d=Object.fromEntries(Object.entries(f).map(([e,r])=>[r,e])),v=(e,t)=>es(e)?!r&&t?null!=d[e]?e:K:Number.isSafeInteger(e)?e:K:eu(e)?f[e]??f[e.toLowerCase()]??v(parseInt(e),t):K,p=!1,[h,g]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||p?e:null==(t=v(t,r))?(p=!0,K):(e??0)|t,(p=!1,K)):v(e),(e,r)=>null==(e=h(e,!1))?K:r&&(i=d[e&c])?(a=g(e&~(e&c),!1)).length?[i,...a]:i:(e=l.filter(([,r])=>r&&e&r&&rx(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[v,e=>null!=(e=v(e))?d[e]:K],y=(e,r)=>null==e?K:null==(e=h(o=e,r))?F(TypeError(`${JSON.stringify(o)} is not a valid ${t} value.`)):e,m=l.filter(([,e])=>!n||(n&e)===e&&rx(e));return ra(e=>y(e),[{configurable:!1,enumerable:!1},{parse:y,tryParse:h,entries:l,values:u,lookup:g,length:l.length,format:e=>g(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=g(e,!0))?\"any \"+t:`the ${t} ${rI(eM(ev(e),e=>rT(e)),[r])}`},r&&{pure:m,map:(e,r)=>(e=y(e),m.filter(([,r])=>r&e).map(r??(([,e])=>e)))}])},rO=(...e)=>{var r=eQ(eL(e,!0)),t=e=>(ep(e)&&(ef(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,a=K;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,o)=>!a&&null!=(a=o===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=a)))})),e);return t},r$=Symbol(),rj=(e,r=[\"|\",\";\",\",\"],t=!0)=>{if(!e)return K;var n=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim());return n[1]??=\"\",n[2]=n[1]&&r?.length&&e0(r,(e,r,t=n[1].split(e))=>t.length>1?t:K)||(n[1]?[n[1]]:[]),n},rC=(e,r=!0,t)=>null==e?K:rP(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,a,i,o,s,l,u,c,f,d)=>{var v={source:e,scheme:t,urn:t?!n:!n&&K,authority:a,user:i,password:o,host:s??l,port:null!=u?parseInt(u):K,path:c,query:!1===r?f:rU(f,r),fragment:d};return v.path=v.path||(v.authority?v.urn?\"\":\"/\":K),v}),rU=(e,r,t=!0)=>rM(e,\"&\",r,t),rM=(e,r,t,n=!0)=>{var a=[],i=null==e?K:eL(e?.match(/(?:^.*?\\?|^)([^#]*)/)?.[1]?.split(r),(e,r,[i,o,s]=rj(e,!1===t?[]:!0===t?K:t,n)??[],l)=>(l=null!=(i=i?.replace(/\\[\\]$/,\"\"))?!1!==t?[i,s.length>1?s:o]:[i,o]:K,a.push(l),l),(e,r)=>e?!1!==t?eq(e,r):(e?e+\",\":\"\")+r:r);return i[r$]=a,i},r_=(e,r)=>r&&null!=e?r.test(e):K,rF=(e,r,t)=>rP(e,r,t,!0),rP=(t,n,a,i=!1)=>(t??n)==null?K:a?(e=K,i?(r=[],rP(t,n,(...t)=>null!=(e=a(...t))&&r.push(e))):t.replace(n,(...r)=>e=a(...r)),e):t.match(n),rq=e=>e?.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rz=/\\z./g,rR=(e,r)=>(r=eP(e_(eH(e,e=>e?.length)),\"|\"))?RegExp(r,\"gu\"):rz,rD={},rV=e=>e instanceof RegExp,rB=(e,r=[\",\",\" \"])=>rV(e)?e:ef(e)?rR(eM(e,e=>rB(e,r)?.source)):et(e)?e?/./g:rz:eu(e)?rD[e]??=rP(e||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,n)=>t?RegExp(t,\"gu\"):rR(eM(rJ(n,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${eP(r,rq)}]`)),e=>e&&`^${eP(rJ(e,/(?<!(?<!\\\\)\\\\)\\*/),e=>rq(rW(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):K,rJ=(e,r)=>e?.split(r)??e,rW=(e,r,t)=>e?.replace(r,t)??e,rK=5e3,rL=()=>()=>F(\"Not initialized.\"),rG=window,rH=document,rX=rH.body,rY=(e,r)=>!!e?.matches(r),rZ=L,rQ=(e,r,t=(e,r)=>r>=rZ)=>{for(var n,a=0,i=G;e?.nodeType===1&&!t(e,a++)&&r(e,(e,r)=>(null!=e&&(n=e,i=r!==H&&null!=n),H),a-1)!==G&&!i;){var o=e;null===(e=e.parentElement)&&o?.ownerDocument!==document&&(e=o?.ownerDocument.defaultView?.frameElement)}return n},r0=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":return(\"\"+e).trim()?.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||en(e);case\"n\":return parseFloat(e);case\"j\":return R(()=>JSON.parse(e),X);case\"h\":return R(()=>nl(e),X);case\"e\":return R(()=>nc?.(e),X);default:return ef(r)?\"\"===e?void 0:(\"\"+e).split(\",\").map(e=>e=\"\"===e.trim()?void 0:r0(e,r[0])):void 0}},r1=(e,r,t)=>r0(e?.getAttribute(r),t),r2=(e,r,t)=>rQ(e,(e,n)=>n(r1(e,r,t))),r4=(e,r)=>r1(e,r)?.trim()?.toLowerCase(),r6=e=>e?.getAttributeNames(),r5=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,r3=e=>null!=e?e.tagName:null,r8=()=>({x:(t=r9(G)).x/(rX.offsetWidth-window.innerWidth)||0,y:t.y/(rX.offsetHeight-window.innerHeight)||0}),r9=e=>({x:eA(scrollX,e),y:eA(scrollY,e)}),r7=(e,r)=>rW(e,/#.*$/,\"\")===rW(r,/#.*$/,\"\"),te=(e,r,t=H)=>(n=tr(e,r))&&W({xpx:n.x,ypx:n.y,x:eA(n.x/rX.offsetWidth,4),y:eA(n.y/rX.offsetHeight,4),pageFolds:t?n.y/window.innerHeight:void 0}),tr=(e,r)=>r?.pointerType&&r?.pageY!=null?{x:r.pageX,y:r.pageY}:e?({x:a,y:i}=tt(e),{x:a,y:i}):void 0,tt=e=>e?(o=e.getBoundingClientRect(),t=r9(G),{x:eA(o.left+t.x),y:eA(o.top+t.y),width:eA(o.width),height:eA(o.height)}):void 0,tn=(e,r,t,n={capture:!0,passive:!0})=>(r=ev(r),rk(t,t=>eJ(r,r=>e.addEventListener(r,t,n)),t=>eJ(r,r=>e.removeEventListener(r,t,n)))),ta=e=>{var{host:r,scheme:t,port:n}=rC(e,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}},ti=()=>({...t=r9(H),width:window.innerWidth,height:window.innerHeight,totalWidth:rX.offsetWidth,totalHeight:rX.offsetHeight});(I=s||(s={}))[I.Anonymous=0]=\"Anonymous\",I[I.Indirect=1]=\"Indirect\",I[I.Direct=2]=\"Direct\",I[I.Sensitive=3]=\"Sensitive\";var to=rN(s,!1,\"data classification\"),ts=(e,r)=>to.parse(e?.classification??e?.level)===to.parse(r?.classification??r?.level)&&tu.parse(e?.purposes??e?.purposes)===tu.parse(r?.purposes??r?.purposes),tl=(e,r)=>null==e?void 0:el(e.classification)&&el(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:to.parse(e.classification??e.level??r?.classification??0),purposes:tu.parse(e.purposes??e.purpose??r?.purposes??l.Necessary)};(A=l||(l={}))[A.None=0]=\"None\",A[A.Necessary=1]=\"Necessary\",A[A.Functionality=2]=\"Functionality\",A[A.Performance=4]=\"Performance\",A[A.Targeting=8]=\"Targeting\",A[A.Security=16]=\"Security\",A[A.Infrastructure=32]=\"Infrastructure\",A[A.Anonymous=49]=\"Anonymous\",A[A.Any=63]=\"Any\",A[A.Server=2048]=\"Server\",A[A.Server_Write=4096]=\"Server_Write\";var tu=rN(l,!0,\"data purpose\",2111),tc=rN(l,!1,\"data purpose\",0),tf=(e,r)=>((u=e?.metadata)&&(r?(delete u.posted,delete u.queued,Object.entries(u).length||delete e.metadata):delete e.metadata),e),td=e=>!!e?.patchTargetId;(E=c||(c={}))[E.Global=0]=\"Global\",E[E.Entity=1]=\"Entity\",E[E.Session=2]=\"Session\",E[E.Device=3]=\"Device\",E[E.User=4]=\"User\";var tv=rN(c,!1,\"variable scope\");s.Anonymous,l.Necessary;var tp=e=>`'${e.key}' in ${tv.format(e.scope)} scope`,th={scope:tv,purpose:tc,purposes:tu,classification:to};rO(th);var tg=e=>e?.filter(Z).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope);(T=f||(f={}))[T.Add=0]=\"Add\",T[T.Min=1]=\"Min\",T[T.Max=2]=\"Max\",T[T.IfMatch=3]=\"IfMatch\",T[T.IfNoneMatch=4]=\"IfNoneMatch\",rN(f,!1,\"variable patch type\"),(x=d||(d={}))[x.Success=200]=\"Success\",x[x.Created=201]=\"Created\",x[x.Unchanged=304]=\"Unchanged\",x[x.Denied=403]=\"Denied\",x[x.NotFound=404]=\"NotFound\",x[x.ReadOnly=405]=\"ReadOnly\",x[x.Conflict=409]=\"Conflict\",x[x.Unsupported=501]=\"Unsupported\",x[x.Invalid=400]=\"Invalid\",x[x.Error=500]=\"Error\",rN(d,!1,\"variable set status\");var ty=(e,r,t)=>{var n,a=e(),i=e=>e,o=(e,t=tk)=>V(async()=>(n=i(t(await a,r)))&&e(n)),s={then:o(e=>e).then,all:o(e=>e,e=>e),changed:o(e=>eH(e,e=>e.status<300)),variables:o(e=>eM(e,tb)),values:o(e=>eM(e,e=>tb(e)?.value)),push:()=>(i=e=>(t?.(eM(tm(e))),e),s),value:o(e=>tb(e[0])?.value),variable:o(e=>tb(e[0])),result:o(e=>e[0])};return s},tm=e=>e?.map(e=>e?.status<400?e:K),tb=e=>tw(e)?e.current??e:K,tw=(e,r=!1)=>r?e?.status<300:e?.status<400||e?.status===404,tk=(e,r,t)=>{var n,a,i=[],o=eM(ev(e),(e,o)=>e&&(e.status<400||!t&&404===e.status?e:(a=`${tp(e.source??e)} could not be ${404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because ${409===e.status?`of a conflict. The expected version '${e.source?.version}' did not match the current version '${e.current?.version}'.`:403===e.status?e.error??\"the operation was denied.\":400===e.status?e.error??\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?`of an unexpected error: ${e.error}`:\"of an unknown reason.\"}`}`,(null==(n=r?.[o])||!1!==n(e,a))&&i.push(a),K)));return i.length?F(i.join(\"\\n\")):ef(e)?o:o?.[0]},tS=e=>tk(e,K,!0),tI=e=>e&&\"string\"==typeof e.type,tA=((...e)=>r=>r?.type&&e.some(e=>e===r?.type))(\"view\"),tE=e=>e?.toLowerCase().replace(/[^a-zA-Z0-9:.-]/g,\"_\").split(\":\").filter(e=>e)??[],tT=(e,r,t)=>{if(!e)return[];if(Array.isArray(e)&&(e=eP(e,\",\")),/(?<!(?<!\\\\)\\\\)%[A-Z0-9]{2}/.test(e))try{e=decodeURIComponent(e.replace(/([^=&]+)(?:\\=([^&]+))?(&|$)/g,(e,r,t,n)=>[r,t&&`=\"${t.replace(/(?<!(?<!\\\\)\\\\)(\"|%22)/g,'\\\\\"')}\"`,n&&\",\"].join(\"\")))}catch{}var n,a=[],i=tE(r);return e.replace(/\\s*(\\s*(?=\\=)|(?:\\\\.|[^,=\\r\\n])+)\\s*(?:\\=\\s*(?:\"((?:\\\\.|[^\"])*)\"|'((?:\\\\.|[^'])*)'|((?:\\\\.|[^,])*)))?\\s*(?:[,\\s]+|$)/g,(e,r,o,s,l)=>{var u=o||s||l,c=tE(r);return i.length&&(1!==c.length||u||(u=c.pop()),c=i.concat(c)),c.length&&(a.push(n={ranks:c,value:u||void 0}),t?.add(tx(n))),\"\"}),a},tx=e=>null==e?e:`${e.ranks.join(\":\")}${e.value?`=${e.value.replace(/,/g,\"\\\\,\")}`:\"\"}`,tN=new WeakMap,tO=e=>tN.get(e),t$=(e,r=G)=>(r?\"--track-\":\"track-\")+e,tj=(e,r,t,n,a,i)=>r?.[1]&&eJ(r6(e),o=>r[0][o]??=(i=G,eu(n=eJ(r[1],([r,t,n],a)=>r_(o,r)&&(i=void 0,!t||rY(e,t))&&eT(n??o)))&&(!(a=e.getAttribute(o))||en(a))&&tT(a,rW(n,/\\-/g,\":\"),t),i)),tC=()=>{},tU=(e,r)=>{if(v===(v=tR.tags))return tC(e,r);var t=e=>e?rV(e)?[[e]]:ek(e)?eF(e,t):[ey(e)?[rB(e.match),e.selector,e.prefix]:[rB(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eZ(v))]];(tC=(e,r)=>tj(e,n,r))(e,r)},tM=(e,r)=>eP(eq(r5(e,t$(r,H)),r5(e,t$(\"base-\"+r,H))),\" \"),t_={},tF=(e,r,t=tM(e,\"attributes\"))=>{t&&tj(e,t_[t]??=[{},rF(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rB(t||n),,r])],r),tT(tM(e,\"tags\"),void 0,r)},tP=(e,r,t=G,n)=>(t?rQ(e,(e,t)=>t(tP(e,r,G)),ew(t)?t:void 0):eP(eq(r1(e,t$(r)),r5(e,t$(r,H))),\" \"))??(n&&(p=tO(e))&&n(p))??null,tq=(e,r,t=G,n)=>\"\"===(h=tP(e,r,t,n))||(null==h?h:en(h)),tz=(e,r,t,n)=>e?(tF(e,n??=new Set),rQ(e,e=>{tU(e,n),tT(eM(t?.(e)),void 0,n)},r),n.size?{tags:[...n]}:{}):{},tR={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,debug:!1,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},tD=[],tV=[],tB=(e,r=0)=>e.charCodeAt(r),tJ=e=>String.fromCharCode(...e);[...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>tD[tV[r]=e.charCodeAt(0)]=r);var tW=e=>{for(var r,t=0,n=e.length,a=[];n>t;)r=e[t++]<<16|e[t++]<<8|e[t++],a.push(tV[(16515072&r)>>18],tV[(258048&r)>>12],tV[(4032&r)>>6],tV[63&r]);return a.length+=n-t,tJ(a)},tK=e=>{for(var r,t=0,n=0,a=e.length,i=new Uint8Array(3*(a/4|0)+(a+3&3)%3);a>t;)i[n++]=tD[tB(e,t++)]<<2|(r=tD[tB(e,t++)])>>4,a>t&&(i[n++]=(15&r)<<4|(r=tD[tB(e,t++)])>>2,a>t&&(i[n++]=(3&r)<<6|tD[tB(e,t++)]));return i},tL={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},tG=(e=256)=>e*Math.random()|0,tH=e=>{var r,t,n,a,i,o=0n,s=0,l=0n,u=[],c=0,f=0,d=0,v=0,p=[];for(d=0;d<e?.length;v+=p[d]=e.charCodeAt(d++));var h=e?()=>{u=[...p],f=255&(c=v),d=-1}:()=>{},g=e=>(f=255&(c+=-u[d=(d+1)%u.length]+(u[d]=e)),e);return[e?e=>{for(h(),a=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+a),n=0;n<3;i[n++]=g(tG()));for(t=0,i[n++]=g(f^16*tG(16)+a);r>t;i[n++]=g(f^e[t++]));for(;a--;)i[n++]=tG();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((f^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);r>n;i[n++]=f^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(s=et(r)?64:r,h(),[o,l]=tL[s],t=0;t<e.length;o=BigInt.asUintN(s,(o^BigInt(f^g(e[t++])))*l));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]},tX={exports:{}};(e=>{(()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,a=new Uint8Array(128),i=0;if(r&&r.multiple)for(var o=0;o<e.length;o++)s(e[o]);else s(e);return a.subarray(0,i);function s(e,a){var i,o,d,v,p,h;switch(typeof e){case\"undefined\":u(192);break;case\"boolean\":u(e?195:194);break;case\"number\":(e=>{if(isFinite(e)&&Number.isSafeInteger(e)){if(e>=0&&e<=127)u(e);else if(e<0&&e>=-32)u(e);else if(e>0&&e<=255)c([204,e]);else if(e>=-128&&e<=127)c([208,e]);else if(e>0&&e<=65535)c([205,e>>>8,e]);else if(e>=-32768&&e<=32767)c([209,e>>>8,e]);else if(e>0&&e<=4294967295)c([206,e>>>24,e>>>16,e>>>8,e]);else if(e>=-2147483648&&e<=2147483647)c([210,e>>>24,e>>>16,e>>>8,e]);else if(e>0&&e<=18446744073709552e3){var r=e/4294967296,a=e%4294967296;c([211,r>>>24,r>>>16,r>>>8,r,a>>>24,a>>>16,a>>>8,a])}else e>=-0x8000000000000000&&e<=0x7fffffffffffffff?(u(211),f(e)):e<0?c([211,128,0,0,0,0,0,0,0]):c([207,255,255,255,255,255,255,255,255])}else n||(n=new DataView(t=new ArrayBuffer(8))),n.setFloat64(0,e),u(203),c(new Uint8Array(t))})(e);break;case\"string\":(d=(o=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(e.charCodeAt(n)>127){r=!1;break}for(var a=0,i=new Uint8Array(e.length*(r?1:4)),o=0;o!==t;o++){var s=e.charCodeAt(o);if(s<128){i[a++]=s;continue}if(s<2048)i[a++]=s>>6|192;else{if(s>55295&&s<56320){if(++o>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var l=e.charCodeAt(o);if(l<56320||l>57343)throw Error(\"UTF-8 encode: second surrogate character 0x\"+l.toString(16)+\" at index \"+o+\" out of range\");s=65536+((1023&s)<<10)+(1023&l),i[a++]=s>>18|240,i[a++]=s>>12&63|128}else i[a++]=s>>12|224;i[a++]=s>>6&63|128}i[a++]=63&s|128}return r?i:i.subarray(0,a)})(e)).length)<=31?u(160+d):d<=255?c([217,d]):d<=65535?c([218,d>>>8,d]):c([219,d>>>24,d>>>16,d>>>8,d]),c(o);break;case\"object\":null===e?u(192):e instanceof Date?(e=>{var r=e.getTime()/1e3;if(0===e.getMilliseconds()&&r>=0&&r<4294967296)c([214,255,r>>>24,r>>>16,r>>>8,r]);else if(r>=0&&r<17179869184){var t=1e6*e.getMilliseconds();c([215,255,t>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r])}else{var t=1e6*e.getMilliseconds();c([199,12,255,t>>>24,t>>>16,t>>>8,t]),f(r)}})(e):Array.isArray(e)?l(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((h=(p=e).length)<=255?c([196,h]):h<=65535?c([197,h>>>8,h]):c([198,h>>>24,h>>>16,h>>>8,h]),c(p)):e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?l(e):(e=>{var r=0;for(var t in e)void 0!==e[t]&&r++;for(var t in r<=15?u(128+r):r<=65535?c([222,r>>>8,r]):c([223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(s(t),s(n))}})(e);break;default:if(!a&&r&&r.invalidTypeReplacement)\"function\"==typeof r.invalidTypeReplacement?s(r.invalidTypeReplacement(e),!0):s(r.invalidTypeReplacement,!0);else throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\")}}function l(e){var r=e.length;r<=15?u(144+r):r<=65535?c([220,r>>>8,r]):c([221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;r>t;t++)s(e[t])}function u(e){if(a.length<i+1){for(var r=2*a.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a[i]=e,i++}function c(e){if(a.length<i+e.length){for(var r=2*a.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(a),a=t}a.set(e,i),i+=e.length}function f(e){var r,t;e>=0?(r=e/4294967296,t=e%4294967296):(r=~(r=Math.abs(++e)/4294967296),t=~(t=Math.abs(e)%4294967296)),c([r>>>24,r>>>16,r>>>8,r,t>>>24,t>>>16,t>>>8,t])}}function t(e,r){var t,n=0;if(e instanceof ArrayBuffer&&(e=new Uint8Array(e)),\"object\"!=typeof e||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(a());else t=a();return t;function a(){var r=e[n++];if(r>=0&&r<=127)return r;if(r>=128&&r<=143)return u(r-128);if(r>=144&&r<=159)return c(r-144);if(r>=160&&r<=191)return f(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return l(-1,1);if(197===r)return l(-1,2);if(198===r)return l(-1,4);if(199===r)return d(-1,1);if(200===r)return d(-1,2);if(201===r)return d(-1,4);if(202===r)return s(4);if(203===r)return s(8);if(204===r)return o(1);if(205===r)return o(2);if(206===r)return o(4);if(207===r)return o(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return d(1);if(213===r)return d(2);if(214===r)return d(4);if(215===r)return d(8);if(216===r)return d(16);if(217===r)return f(-1,1);if(218===r)return f(-1,2);if(219===r)return f(-1,4);if(220===r)return c(-1,2);if(221===r)return c(-1,4);if(222===r)return u(-1,2);if(223===r)return u(-1,4);if(r>=224&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var t=0,a=!0;r-- >0;)if(a){var i=e[n++];t+=127&i,128&i&&(t-=128),a=!1}else t*=256,t+=e[n++];return t}function o(r){for(var t=0;r-- >0;)t*=256,t+=e[n++];return t}function s(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return(n+=r,4===r)?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function l(r,t){r<0&&(r=o(t));var a=e.subarray(n,n+r);return n+=r,a}function u(e,r){e<0&&(e=o(r));for(var t={};e-- >0;)t[a()]=a();return t}function c(e,r){e<0&&(e=o(r));for(var t=[];e-- >0;)t.push(a());return t}function f(r,t){r<0&&(r=o(t));var a=n;return n+=r,((e,r,t)=>{var n=r,a=\"\";for(t+=r;t>n;){var i=e[n++];if(i>127){if(i>191&&i<224){if(n>=t)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(i>223&&i<240){if(n+1>=t)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else if(i>239&&i<248){if(n+2>=t)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}else throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1))}if(i<=65535)a+=String.fromCharCode(i);else if(i<=1114111)i-=65536,a+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320);else throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\")}return a})(e,a,r)}function d(e,r){e<0&&(e=o(r));var t=o(1),a=l(e);return 255===t?(e=>{if(4===e.length){var r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];return new Date(1e3*r)}if(8===e.length){var t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=(3&e[3])*4294967296+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7];return new Date(1e3*r+t/1e6)}if(12===e.length){var t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3];n-=8;var r=i(8);return new Date(1e3*r+t/1e6)}throw Error(\"Invalid data length for a date value.\")})(a):{type:t,data:a}}}var n={serialize:r,deserialize:t,encode:r,decode:t};e?e.exports=n:window[window.msgpackJsName||\"msgpack\"]=n})()})(tX);var{deserialize:tY,serialize:tZ}=(N=tX.exports)&&N.__esModule&&Object.prototype.hasOwnProperty.call(N,\"default\")?N.default:N,tQ=\"$ref\",t0=(e,r,t)=>eb(e)?K:t?r!==K:null===r||r,t1=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var a,i,o,s=(e,r,n=e[r],a=t0(r,n,t)?u(n):K)=>(n!==a&&(a!==K||ef(e)?e[r]=a:delete e[r],l(()=>e[r]=n)),a),l=e=>(a??=[]).push(e),u=e=>{if(null==e||ew(e)||eb(e))return K;if(!ep(e))return e;if(e.toJSON&&e!==(e=e.toJSON()))return u(e);if(null!=(o=i?.get(e)))return e[tQ]||(e[tQ]=o,l(()=>delete e[tQ])),{[tQ]:o};if(ey(e))for(var r in(i??=new Map).set(e,i.size+1),e)s(e,r);else!ek(e)||e instanceof Uint8Array||(!ef(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?s(e,t):(e[t]=null,l(()=>delete e[t])));return e};return R(()=>r?tZ(u(e)??null):R(()=>JSON.stringify(e,K,n?2:0),()=>JSON.stringify(u(e),K,n?2:0)),!0,()=>a?.forEach(e=>e()))},t2=e=>{var r,t,n=e=>ep(e)?e[tQ]&&(t=(r??=[])[e[tQ]])?t:(e[tQ]&&(r[e[tQ]]=e,delete e[tQ]),Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eu(e)?JSON.parse(e):null!=e?R(()=>tY(e),()=>(console.error(\"Invalid message received.\",e),K)):e)},t4=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var n=(e,n)=>el(e)&&!0===n?e:o(e=eu(e)?new Uint8Array(eM(e.length,r=>255&e.charCodeAt(r))):r?R(()=>JSON.stringify(e),()=>JSON.stringify(t1(e,!1,t))):t1(e,!0,t),n);if(r)return[e=>t1(e,!1,t),e=>null==e?K:R(()=>t2(e),K),(e,r)=>n(e,r)];var[a,i,o]=tH(e);return[(e,r)=>(r?Y:tW)(a(t1(e,!0,t))),e=>null!=e?t2(i(e instanceof Uint8Array?e:tK(e))):null,(e,r)=>n(e,r)]};if(!e){var n=+(r.json??0);if(n&&!1!==r.prettify)return(g??=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[+n]}return t(e,r)};t4();var[t6,t5]=t4(null,{json:!0,prettify:!0}),t3=rJ(\"\"+rH.currentScript.src,\"#\"),t8=rJ(\"\"+(t3[1]||\"\"),\";\"),t9=t3[0],t7=t8[1]||rC(t9,!1)?.host,ne=e=>!!(t7&&rC(e,!1)?.host?.endsWith(t7)===H),nr=(...e)=>rW(eP(e),/(^(?=\\?))|(^\\.(?=\\/))/,t9.split(\"?\")[0]),nt=nr(\"?\",\"var\"),nn=nr(\"?\",\"mnt\");nr(\"?\",\"usr\");var na=Symbol(),ni=Symbol(),no=(e,r,t=H,n=G)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rE(\"tail.js: \",\"90;3\"))+r);var a=e?.[ni];a&&(e=e[na]),null!=e&&console.log(ep(e)?rE(t6(e),\"94\"):ew(e)?\"\"+e:e),a&&a.forEach(([e,r,t])=>no(e,r,t,!0)),r&&console.groupEnd()},[ns,nl]=t4(),[nu,nc]=[rL,rL],[nf,nd]=rS(),nv=e=>{nc===rL&&([nu,nc]=t4(e),nd(nu,nc))},np=e=>r=>nh(e,r),nh=(...e)=>{var r=e.shift();console.error(eu(e[1])?e.shift():e[1]?.message??\"An error occurred\",r.id??r,...e)},[ng,ny]=rS(),[nm,nb]=rS(),nw=e=>nS!==(nS=e)&&ny(nS=!1,nE(!0,!0)),nk=e=>nI!==(nI=!!e&&\"visible\"===document.visibilityState)&&nb(nI,!e,nA(!0,!0));ng(nk);var nS=!0,nI=!1,nA=rd(!1),nE=rd(!1);tn(window,[\"pagehide\",\"freeze\"],()=>nw(!1)),tn(window,[\"pageshow\",\"resume\"],()=>nw(!0)),tn(document,\"visibilitychange\",()=>(nk(!0),nI&&nw(!0))),ny(nS,nE(!0,!0));var nT=!1,nx=rd(!1),[nN,nO]=rS(),n$=rp({callback:()=>nT&&nO(nT=!1,nx(!1)),frequency:2e4,once:!0,paused:!0}),nj=()=>!nT&&(nO(nT=!0,nx(!0)),n$.restart());tn(window,\"focus\",nj),tn(window,\"blur\",()=>n$.trigger()),tn(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],nj),nj(),(O=y||(y={}))[O.View=-3]=\"View\",O[O.Tab=-2]=\"Tab\",O[O.Shared=-1]=\"Shared\";var nC=rN(y,!1,\"local variable scope\"),nU=e=>nC.tryParse(e)??tv(e),nM=e=>nC.format(e)??tv.format(e),n_=e=>!!nC.tryParse(e?.scope),nF=rO({scope:nC},th),nP=e=>null==e?void 0:eu(e)?e:e.source?nP(e.source):`${nU(e.scope)}\\0${e.key}\\0${e.targetId??\"\"}`,nq=e=>{var r=e.split(\"\\0\");return{scope:+r[0],key:r[1],targetId:r[2]}},nz=0,nR=void 0,nD=()=>(nR??rL())+\"_\"+nV(),nV=()=>++nz,nB=e=>crypto.getRandomValues(e),nJ=()=>rW(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^nB(new Uint8Array(1))[0]&15>>e/4).toString(16)),nW={},nK={id:nR,heartbeat:rf()},nL={knownTabs:{[nR]:nK},variables:{}},[nG,nH]=rS(),[nX,nY]=rS(),nZ=rL,nQ=e=>nW[nP(e)],n0=(...e)=>n2(e.map(e=>(e.cache=[rf(),3e3],nF(e)))),n1=e=>eM(e,e=>e&&[e,nW[nP(e)]]),n2=e=>{var r=eM(e,e=>e&&[nP(e),e]);if(r?.length){var t=n1(e);e9(nW,r);var n=eH(r,e=>e[1].scope>y.Tab);n.length&&(e9(nL.variables,n),nZ({type:\"patch\",payload:eL(n)})),nY(t,nW,!0)}};nf((e,r)=>{ng(t=>{if(t){var n=r(sessionStorage.getItem(M));sessionStorage.removeItem(M),nR=n?.[0]??rf().toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nW=eL(eq(eH(nW,([,e])=>e.scope===y.View),eM(n?.[1],e=>[nP(e),e])))}else sessionStorage.setItem(M,e([nR,eM(nW,([,e])=>e.scope!==y.View?e:void 0)]))},!0),nZ=(r,t)=>{e&&(localStorage.setItem(M,e([nR,r,t])),localStorage.removeItem(M))},tn(window,\"storage\",e=>{if(e.key===M){var n=r?.(e.newValue);if(n&&(!n[2]||n[2]===nR)){var[a,{type:i,payload:o}]=n;if(\"query\"===i)t.active||nZ({type:\"set\",payload:nL},a);else if(\"set\"===i&&t.active)e9(nL,o),e9(nW,o.variables),t.trigger();else if(\"patch\"===i){var s=n1(eM(o,1));e9(nL.variables,o),e9(nW,o),nY(s,nW,!1)}else\"tab\"===i&&(e9(nL.knownTabs,a,o),o&&nH(\"tab\",o,!1))}}});var t=rp(()=>nH(\"ready\",nL,!0),-25),n=rp({callback(){var e=rf()-1e4;eJ(nL?.knownTabs,([r,t])=>t[0]<e&&rt(nL.knownTabs,r)),nK.heartbeat=rf(),nZ({type:\"tab\",payload:nK})},frequency:5e3,paused:!0}),a=e=>{nZ({type:\"tab\",payload:e?nK:void 0}),e?(t.restart(),nZ({type:\"query\"})):t.toggle(!1),n.toggle(e)};ng(e=>a(e),!0)},!0);var[n4,n6]=rS(),[n5,n3]=rS(),n8=((e,{timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var a=()=>(t?nc:nl)(localStorage.getItem(e)),i=0,o=()=>localStorage.setItem(e,(t?nu:ns)([nR,rf()+r]));return async(t,s,l=null!=s?1:n)=>{for(;l--;){var u=a();if((!u||u[1]<rf())&&(o(),a()?.[0]===nR))return r>0&&(i=setInterval(()=>o(),r/2)),await J(t,!0,()=>{clearInterval(i),localStorage.removeItem(e)});var c=rb(),[f]=tn(window,\"storage\",r=>{r.key!==e||r.newValue||c.resolve()});await rw(rm(s??r),c),f()}null==s&&F(e+\" could not be acquired.\")}})(U+\"rq\"),n9=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var a,i,o=!1,s=t=>{var s=ew(r)?r?.(a,t):r;return!1!==s&&(null!=s&&!0!==s&&(a=s),n6(e,a,t,e=>(o=a===K,a=e)),!o&&(i=n?nu(a,!0):JSON.stringify(a)))};if(!t)return await n8(()=>eW(1,async r=>{if(!s(r))return eT();var t=await fetch(e,{method:null!=a?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i});if(t.status>=400)return 0===r?eT(F(`Invalid response: ${await t.text()}`)):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rm((1+r)*200));var o=n?new Uint8Array(await t.arrayBuffer()):await t.text(),l=o?.length?(n?nc:JSON.parse)?.(o):K;return null!=l&&n3(l),eT(l)}));s(0)&&(navigator.sendBeacon(e,new Blob(null!=a?[i]:[],{type:\"text/plain\"}))||F(\"Beacon send failed.\"))},n7=[\"scope\",\"key\",\"targetId\",\"version\"],ae=[...n7,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ar=[...n7,\"init\",\"purpose\",\"refresh\"],at=[...ae,\"value\",\"force\",\"patch\"],an=new Map,aa=(e,r)=>{var t=rp(async()=>{var e=eM(an,([e,r])=>({...nq(e),result:[...r]}));e.length&&await u.get(...e)},3e3),n=(e,r)=>r&&eV(r,r=>e5(an,e,()=>new Set).add(r)),a=(e,r)=>{if(e){var t,a=nP(e),i=rn(an,a);if(i?.size){if(e?.purposes===r?.purposes&&e?.classification==r?.classification&&P(e?.value,r?.value))return;eJ(i,i=>{t=!1,i?.(e,r,(e=!0)=>t=e),t&&n(a,i)})}}};ng((e,r)=>t.toggle(e,e&&r>=3e3),!0),nX(e=>eJ(e,([e,r])=>a(e,r)));var i=new Map,o=(e,r)=>e9(i,e,et(r)?r?void 0:0:r),u={get:(...t)=>ty(async()=>{(!t[0]||eu(t[0]))&&(a=t[0],t=t.slice(1)),r?.validateKey(a);var a,i=[],s=eM(t,(e,r)=>[e,r]),l=[],u=(await n9(e,()=>!!(s=eM(s,([e,r])=>{if(e){var t=nP(e);n(t,e.result);var a=nQ(t);e.init&&o(t,e.cache);var s=e.purposes;if((s??~0)&(a?.purposes??~0)){if(!e.refresh&&a?.[1]<rf())rl(i,[{...a,status:d.Success},r]);else if(!n_(e))return[ri(e,ar),r];else if(ey(e.init)){var u={...nF(e),status:d.Created,...e.init};null!=u.value&&(rl(l,c(u)),rl(i,[u,r]))}}else rl(i,[{...e,status:d.Denied,error:\"No consent for \"+tu.logFormat(s)},r])}})).length&&{variables:{get:eM(s,0)},deviceSessionId:r?.deviceSessionId}))?.variables?.get??[];return rl(i,...eM(u,(e,r)=>e&&[e,s[r][1]])),l.length&&n2(l),i.map(([e])=>e)},eM(t,e=>e?.error)),set:(...t)=>ty(async()=>{(!t[0]||eu(t[0]))&&(n=t[0],t=t.slice(1)),r?.validateKey(n);var n,a=[],i=[],u=eM(t,(e,r)=>{if(e){var t=nP(e),n=nQ(t);if(o(t,e.cache),n_(e)){if(null!=e.patch)return F(\"Local patching is not supported.\");var u={value:e.value,classification:s.Anonymous,purposes:l.Necessary,scope:nC(e.scope),key:e.key};return i[r]={status:n?d.Success:d.Created,source:e,current:u},void rl(a,c(u))}return null==e.patch&&e?.version===void 0&&(e.version=n?.version,e.force??=!!e.version),[ri(e,at),r]}}),f=u.length?z((await n9(e,{variables:{set:u.map(e=>e[0])},deviceSessionId:r?.deviceSessionId})).variables?.set,\"No result.\"):[];return a.length&&n2(a),eJ(f,(e,r)=>{var[t,n]=u[r];e.source=t,t.result?.(e),i[n]=e}),i},eM(t,e=>e?.error))},c=(e,r=rf())=>({...ri(e,ae),cache:[r,r+(rn(i,nP(e))??3e3)]});return n5(({variables:e})=>{if(e){var r=rf(),t=eq(eM(e.get,e=>tb(e)),eM(e.set,e=>tb(e)));t?.length&&n2(eV(t,c,r))}}),u},ai=(e,r,t=rK)=>{var n=[],a=new WeakMap,i=new Map,o=(e,r)=>e.metadata?.queued?e3(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):F(\"Source event not queued.\"),s=async(t,n=!0,a)=>{var i;return(!t[0]||eu(t[0]))&&(i=t[0],t=t.slice(1)),no({[ni]:eM(t=t.map(e=>(r?.validateKey(i??e.key),e3(e,{metadata:{posted:!0}}),e3(tf(rs(e),!0),{timestamp:e.timestamp-rf()}))),e=>[e,e.type,G])},\"Posting \"+rI([rA(\"new event\",[eX(t,e=>!td(e))||void 0]),rA(\"event patch\",[eX(t,e=>td(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),n9(e,{events:t,variables:a,deviceSessionId:r?.deviceSessionId},{beacon:n})},l=async(e,{flush:t=!1,async:a=!0,variables:i}={})=>{if((e=eM(ev(e),e=>e3(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eJ(e,e=>no(e,e.type)),!a)return s(e,!1,i);if(!t){e.length&&rl(n,...e);return}n.length&&ru(e,...n.splice(0)),e.length&&await s(e,!0,i)};return t>0&&rp(()=>l([],{flush:!0}),t),nm((e,r,t)=>{if(!e&&(n.length||r||t>1500)){var a=eM(i,([e,r])=>{var[t,n]=r();return n&&i.delete(e),t});(n.length||a.length)&&l(eq(n.splice(0),a),{flush:!0})}}),{post:l,postPatch:(e,r,t)=>l(o(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!0){var n=!1,s=()=>n=!0;return a.set(e,rs(e)),i.set(e,()=>{var i=a.get(e),[l,u]=(t?rc(r(i,s),i):r(i,s))??[];return l&&!P(u,i)?(a.set(e,rs(u)),[o(e,l),n]):[void 0,n]}),s}}},ao=Symbol(),as=e=>{var r=new IntersectionObserver(e=>eJ(e,({target:e,isIntersecting:r,boundingClientRect:t,intersectionRatio:n})=>e[ao]?.(r,t,n)),{threshold:[.05,.1,.15,.2,.3,.4,.5,.6,.75]});return(t,n)=>{if(n&&(a=eH(n?.component,e=>e.track?.impressions||(e.track?.secondary??e.inferred)!==H))&&eX(a)){var a,i,o,s,l=G,u=0,c=rv(tR.impressionThreshold),f=aA();t[ao]=(r,n,d)=>{f(r=d>=.75||n.top<(i=window.innerHeight/2)&&n.bottom>i),l!==(l=r)&&(l?c(()=>{++u,o||rl(e,o=eH(eM(a,e=>(e.track?.impressions||tq(t,\"impressions\",H,e=>e.track?.impressions))&&W({type:\"impression\",pos:te(t),viewport:ti(),timeOffset:aT(),impressions:u,...aq(t,H)})||null))),o?.length&&(s=eM(o,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:f(),impressions:u}))))}):(eJ(s,e=>e()),c(!1)))},r.observe(t)}}},al=()=>{nX((e,r,t)=>{var n=eq(tg(eM(e,1))?.map(e=>[e,`${e.key} (${nM(e.scope)}, ${e.scope<0?\"client-side memory only\":tu.format(e.purposes)})`,G]),[[{[ni]:tg(eM(r,1))?.map(e=>[e,`${e.key} (${nM(e.scope)}, ${e.scope<0?\"client-side memory only\":tu.format(e.purposes)})`,G])},\"All variables\",H]]);no({[ni]:n},rE(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eX(r)} in total).`,\"2;3\"))})},au=()=>{var e=rG?.screen;if(!e)return{};var{width:r,height:t,orientation:n}=e,a=r<t,i=n?.angle??rG.orientation??0;return(-90===i||90===i)&&([r,t]=[t,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rG.devicePixelRatio,width:r,height:t,landscape:a}}},ac=e=>rl(e,W({type:\"user_agent\",hasTouch:navigator.maxTouchPoints>0,userAgent:navigator.userAgent,view:b?.clientId,languages:eM(navigator.languages,(e,r,t=e.split(\"-\"))=>W({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:new Date().getTimezoneOffset()},...au()})),af=(e,r=\"A\"===r3(e)&&r1(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),ad=(e,r=r3(e),t=tq(e,\"button\"))=>t!==G&&(q(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&q(r4(e,\"type\"),\"button\",\"submit\")||t===H),av=e=>{if(m)return m;eu(e)&&([r,e]=nl(e),e=t4(r)[1](e)),e9(tR,e),nv(rn(tR,\"encryptionKey\"));var r,t=rn(tR,\"key\"),n=rG[tR.name]??[];if(!ef(n)){F(`The global variable for the tracker \"${tR.name}\" is used for something else than an array of queued commands.`);return}var a=[],i=[],o=(e,...r)=>{var t=H;i=eH(i,n=>R(()=>(n[e]?.(...r,{tracker:m,unsubscribe:()=>t=G}),t),np(n)))},s=[],l={applyEventExtensions(e){e.clientId??=nD(),e.timestamp??=rf(),v=H;var r=G;return eM(a,([,t])=>{(r||t.decorate?.(e)===G)&&(r=H)}),r?void 0:e},validateKey:(e,r=!0)=>!t&&!e||e===t||!!r&&F(`'${e}' is not a valid key.`)},u=aa(nt,l),c=ai(nt,l),f=null,d=0,v=G,p=G;return Object.defineProperty(rG,tR.name,{value:m=Object.freeze({id:\"tracker_\"+nD(),events:c,variables:u,push(...e){if(e.length){if(e.length>1&&(!e[0]||eu(e[0]))&&(r=e[0],e=e.slice(1)),eu(e[0])){var r,t=e[0];e=t.match(/^[{[]/)?JSON.parse(t):nl(t)}var n=G;if((e=eH(eF(e,e=>eu(e)?nl(e):e),e=>{if(!e)return G;if(aJ(e))tR.tags=e9({},tR.tags,e.tagAttributes);else if(aW(e))return tR.disabled=e.disable,G;else if(aG(e))return n=H,G;else if(a0(e))return e(m),G;return p||aX(e)||aL(e)?H:(s.push(e),G)})).length||n){var h=e4(e,e=>aL(e)?-100:aX(e)?-50:aQ(e)?-10:tI(e)?90:0);if(!(f&&f.splice(v?d+1:f.length,0,...h))){for(d=0,f=h;d<f.length;d++){var g=f[d];g&&(l.validateKey(r??g.key),R(()=>{var e,r=f[d];if(o(\"command\",r),v=G,tI(r))c.post(r);else if(aH(r))u.get(...ev(r.get));else if(aQ(r))u.set(...ev(r.set));else if(aX(r))rl(i,r.listener);else if(aL(r))(e=R(()=>r.extension.setup(m),e=>nh(r.extension.id,e)))&&(rl(a,[r.priority??100,e,r.extension]),e4(a,([e])=>e));else if(a0(r))r(m);else{var t=G;for(var[,e]of a)if(t=e.processCommand?.(r)??G)break;t||nh(\"invalid-command\",r,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nh(m,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},__isTracker:H}),configurable:!1,writable:!1}),al(),nG(async(e,r,t,a)=>{if(\"ready\"===e){var i=tS((await u.get({scope:\"session\",key:j,refresh:!0},{scope:\"session\",key:C,refresh:!0,cache:L}))[0]).value;l.deviceSessionId=i.deviceSessionId,i.hasUserAgent||(ac(m),i.hasUserAgent=!0),p=!0,s.length&&rl(m,s),a(),rl(m,...eM(aR,e=>({extension:e})),...n,{set:{scope:\"view\",key:\"loaded\",value:!0}})}},!0),m},ap=()=>b?.clientId,ah={scope:\"shared\",key:\"referrer\"},ag=(e,r)=>{m.variables.set({...ah,value:[ap(),e]}),r&&m.variables.get({scope:ah.scope,key:ah.key,result:(t,n,a)=>t?.value?a():n?.value?.[1]===e&&r()})},ay=rd(),am=rd(),ab=rd(),aw=1,ak=()=>am(),[aS,aI]=rS(),aA=e=>{var r=rd(e,ay),t=rd(e,am),n=rd(e,ab),a=rd(e,()=>aw);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),interactiveTime:n(e,i),activations:a(e,i)})},aE=aA(),aT=()=>aE(),[ax,aN]=rS(),aO=(e,r)=>(r&&eJ(aj,r=>e(r,()=>!1)),ax(e)),a$=new WeakSet,aj=document.getElementsByTagName(\"iframe\"),aC=e=>(null==e||(e===H||\"\"===e)&&(e=\"add\"),eu(e)&&q(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ep(e)?e:void 0);function aU(e){if(e){if(null!=e.units&&q(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=e.units>0?\"add\":\"remove\"}return e}}var aM=e=>tz(e,void 0,e=>eM(ev(e5(tN,e)?.tags))),a_=e=>e?.component||e?.content,aF=e=>tz(e,r=>r!==e&&!!a_(e5(tN,r)),e=>(k=e5(tN,e),(k=e5(tN,e))&&eF(eq(k.component,k.content,k),\"tags\"))),aP=(e,r)=>r?e:{...e,rect:void 0,content:(S=e.content)&&eM(S,e=>({...e,rect:void 0}))},aq=(e,r=G)=>{var t,n,a,i=[],o=[],s=0;return rQ(e,e=>{var n=e5(tN,e);if(n){if(a_(n)){var a=eH(ev(n.component),e=>0===s||!r&&(1===s&&e.track?.secondary!==H||e.track?.promote));t=e2(a,e=>e.track?.region)&&tt(e)||void 0;var l=aF(e);n.content&&ru(i,...eM(n.content,e=>({...e,rect:t,...l}))),a?.length&&(ru(o,...eM(a,e=>(s=eY(s,e.track?.secondary?1:2),aP({...e,content:i,rect:t,...l},!!t)))),i=[])}var u=n.area||tP(e,\"area\");u&&ru(o,...eM(u))}}),i.length&&rl(o,aP({id:\"\",rect:t,content:i})),eJ(o,e=>{eu(e)?rl(n??=[],e):(e.area??=eP(n,\"/\"),ru(a??=[],e))}),a||n?{components:a,area:eP(n,\"/\")}:void 0},az=Symbol();$={necessary:1,preferences:2,statistics:4,marketing:8},window.tail.push({consent:{externalSource:{key:\"Cookiebot\",poll(){var e=rH.cookie.match(/CookieConsent=([^;]*)/)?.[1],r=1;return e?.replace(/([a-z]+):(true|false)/g,(e,t,n)=>(\"true\"===n&&(r|=$[t]??0),\"\")),{level:r>1?1:0,purposes:r}}}}});var aR=[{id:\"context\",setup(e){rp(()=>eJ(aj,e=>re(a$,e)&&aN(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result:(t,n,a)=>(null==b||!t?.value||b?.definition?r=t?.value:(b.definition=t.value,b.metadata?.posted&&e.events.postPatch(b,{definition:r})),a())});var r,t=nQ({scope:\"tab\",key:\"viewIndex\"})?.value??0,n=nQ({scope:\"tab\",key:\"tabIndex\"})?.value;null==n&&n0({scope:\"tab\",key:\"tabIndex\",value:n=nQ({scope:\"shared\",key:\"tabIndex\"})?.value??nQ({scope:\"session\",key:j})?.value?.tabs??0},{scope:\"shared\",key:\"tabIndex\",value:n+1});var a=null,i=(i=G)=>{if(!r7(\"\"+a,a=location.href)||i){var{source:o,scheme:s,host:l}=rC(location.href+\"\",!0);b={type:\"view\",timestamp:rf(),clientId:nD(),tab:nR,href:o,path:location.pathname,hash:location.hash||void 0,domain:{scheme:s,host:l},tabNumber:n+1,tabViewNumber:t+1,viewport:ti(),duration:aE(void 0,!0)},0===n&&(b.firstTab=H),0===n&&0===t&&(b.landingPage=H),n0({scope:\"tab\",key:\"viewIndex\",value:++t});var u=rU(location.href);if(eM([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>(b.utm??={})[e]=u[`utm_${e}`]?.[0]),!(b.navigationType=w)&&performance&&eM(performance.getEntriesByType(\"navigation\"),e=>{b.redirects=e.redirectCount,b.navigationType=rW(e.type,/\\_/g,\"-\")}),w=void 0,\"navigate\"===(b.navigationType??=\"navigate\")){var c=nQ(ah)?.value;c&&ne(document.referrer)&&(b.view=c?.[0],b.relatedEventId=c?.[1],e.variables.set({...ah,value:void 0}))}var c=document.referrer||null;c&&!ne(c)&&(b.externalReferrer={href:c,domain:ta(c)}),b.definition=r,r=void 0,e.events.post(b),e.events.registerEventPatchSource(b,()=>({duration:aT()})),aI(b)}};return nN(e=>ab(e)),nm(e=>{e?(am(H),++aw):(am(G),ab(G))}),tn(window,\"popstate\",()=>(w=\"back-forward\",i())),eM([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),w=\"navigate\",i()}}),i(),{processCommand:r=>aB(r)&&(rl(e,r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),H),decorate(e){!b||tA(e)||td(e)||(e.view=b.clientId)}}}},{id:\"components\",setup(e){var r=as(e),t=e=>null==e?void 0:{...e,component:ev(e.component),content:ev(e.content),tags:ev(e.tags)},n=({boundary:e,...n})=>{e7(tN,e,e=>t(\"add\"in n?{...e,component:eq(e?.component,n.component),content:eq(e?.content,n.content),area:n?.area??e?.area,tags:eq(e?.tags,n.tags),cart:n.cart??e?.cart,track:n.track??e?.track}:\"update\"in n?n.update(e):n)),r(e,e5(tN,e))};return{decorate(e){eJ(e.components,e=>rn(e,\"track\"))},processCommand:e=>aK(e)?(n(e),H):aZ(e)?(eM(((e,r)=>{if(!r)return[];var t=[],n=new Set;return document.querySelectorAll(`[${e}]`).forEach(a=>{if(!e5(n,a))for(var i=[];null!=r1(a,e);){re(n,a);var o=rJ(r1(a,e),\"|\");r1(a,e,null);for(var s=0;s<o.length;s++){var l=o[s];if(\"\"!==l){var u=\"-\"===l?-1:parseInt(ec(l)??\"\",36);if(u<0){i.length+=u;continue}if(0===s&&(i.length=0),isNaN(u)&&/^[\"\\[{]/.test(l))for(var c=\"\";s<o.length;s++)try{l=JSON.parse(c+=o[s]);break}catch(e){}u>=0&&r[u]&&(l=r[u]),rl(i,l)}}rl(t,...eM(i,e=>({add:H,...e,boundary:a})));var f=a.nextElementSibling;\"WBR\"===a.tagName&&a.parentNode?.removeChild(a),a=f}}),t})(e.scan.attribute,e.scan.components),n),H):G}}},{id:\"navigation\",setup(e){var r=r=>{tn(r,[\"click\",\"contextmenu\",\"auxclick\"],t=>{var n,a,i,o,s=G;if(rQ(t.target,e=>{var r;ad(e)&&(o??=e),s=s||\"NAV\"===r3(e),a??=tq(e,\"clicks\",H,e=>e.track?.clicks)??((r=ev(tO(e)?.component))&&e2(r,e=>e.track?.clicks!==G)),i??=tq(e,\"region\",H,e=>e.track?.region)??((r=tO(e)?.component)&&e2(r,e=>e.track?.region))}),o){var l,u=aq(o),c=aM(o);a??=!s;var f={...(i??=H)?{pos:te(o,t),viewport:ti()}:null,...(rQ(t.target??o,e=>\"IMG\"===r3(e)||e===o?(n={element:{tagName:e.tagName,text:r1(e,\"title\")||r1(e,\"alt\")||e.innerText?.trim().substring(0,100)||void 0}},G):H),n),...u,timeOffset:aT(),...c};if(af(o)){var d=o.hostname!==location.hostname,{host:v,scheme:p,source:h}=rC(o.href,!1);if(o.host===location.host&&o.pathname===location.pathname&&o.search===location.search){if(\"#\"===o.hash)return;o.hash!==location.hash&&0===t.button&&rl(e,W({type:\"anchor_navigation\",anchor:o.hash,...f}));return}var g=W({clientId:nD(),type:\"navigation\",href:d?o.href:h,external:d,domain:{host:v,scheme:p},self:H,anchor:o.hash,...f});if(\"contextmenu\"===t.type){var y=o.href,m=ne(y);if(m){ag(g.clientId,()=>rl(e,g));return}var b=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8);if(!m){if(!tR.captureContextMenu)return;o.href=nn+\"=\"+b+encodeURIComponent(y),tn(window,\"storage\",(r,t)=>r.key===_&&(r.newValue&&JSON.parse(r.newValue)?.requestId===b&&rl(e,g),t())),tn(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),o.href=y})}return}t.button<=1&&(1===t.button||t.ctrlKey||t.shiftKey||t.altKey||r1(o,\"target\")!==window.name?(ag(g.clientId),g.self=G,rl(e,g)):r7(location.href,o.href)||(g.exit=g.external,ag(g.clientId)));return}var w=(rQ(t.target,(e,r)=>!!(l??=aC(tO(e)?.cart??tP(e,\"cart\")))&&!l.item&&(l.item=e1(tO(e)?.content))&&r(l)),aU(l));(w||a)&&rl(e,w?W({type:\"cart_updated\",...f,...w}):W({type:\"component_click\",...f}))}})};r(document),aO(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=r9(H);aS(()=>ry(()=>(r={},t=r9(H)),250)),tn(window,\"scroll\",()=>{var n=r9(),a=r8();if(n.y>=t.y){var i=[];!r.fold&&n.y>=t.y+200&&(r.fold=H,rl(i,\"fold\")),!r[\"page-middle\"]&&a.y>=.5&&(r[\"page-middle\"]=H,rl(i,\"page-middle\")),!r[\"page-end\"]&&a.y>=.99&&(r[\"page-end\"]=H,rl(i,\"page-end\"));var o=eM(i,e=>W({type:\"scroll\",scrollType:e,offset:a}));o.length&&rl(e,o)}})}},{id:\"cart\",setup:e=>({processCommand(r){if(aV(r)){var t=r.cart;return\"clear\"===t?rl(e,{type:\"cart_updated\",action:\"clear\"}):(t=aU(t))&&rl(e,{...t,type:\"cart_updated\"}),H}return aY(r)?(rl(e,{type:\"order\",...r.order}),H):G}})},{id:\"forms\",setup(e){var r=new Map,t=e=>e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"yes\":\"no\":e.value,n=n=>{var a,i=n.form;if(i){var s=r2(i,t$(\"ref\"))||\"track_ref\",l=()=>i.isConnected&&tt(i).width,u=e5(r,i,()=>{var r,t=new Map,n={type:\"form\",name:r2(i,t$(\"form-name\"))||r1(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}};e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:aT()}));var s=()=>{o(),r[3]>=2&&(n.completed=3===r[3]||!l()),e.events.postPatch(n,{...a,totalTime:rf(H)-r[4]}),r[3]=1},u=rv();return tn(i,\"submit\",()=>{a=aq(i),r[3]=3,u(()=>{i.isConnected&&tt(i).width>0?(r[3]=2,u()):s()},750)}),r=[n,t,i,0,rf(H),1]});return e5(u[1],n)||eM(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{if(!e.name||\"hidden\"===e.type){\"hidden\"===e.type&&(e.name===s||tq(e,\"ref\"))&&(e.value||(e.value=nJ()),u[0].ref=e.value);return}var n=e.name,a=u[0].fields[n]??={id:e.id||n,name:n,label:rW(e.labels?.[0]?.innerText??e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:e.type??\"unknown\",[az]:t(e)};u[0].fields[a.name]=a,u[1].set(e,a)}),[n,u]}},a=(e,[r,t]=n(e)??[],a=t?.[1].get(r))=>a&&[t[0],a,r,t],i=null,o=()=>{if(i){var[e,r,n,a]=i,o=-(s-(s=ak())),u=-(l-(l=rf(H))),c=r[az];(r[az]=t(n))!==c&&(r.fillOrder??=a[5]++,r.filled&&(r.corrections=(r.corrections??0)+1),r.filled=H,a[3]=2,eJ(e.fields,([e,t])=>t.lastField=e===r.name)),r.activeTime+=o,r.totalTime+=u,e.activeTime+=o,e.totalTime+=u,i=null}},s=0,l=0,u=e=>e&&tn(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&a(e.target))=>t&&(i=t,\"focusin\"===e.type?(l=rf(H),s=ak()):o()));u(document),aO(e=>e.contentDocument&&u(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>await e.variables.get({scope:\"session\",key:C,result:r}).value,t=async t=>{if(t){var n=await r();if(!n||ts(n,t=tl(t)))return[!1,n];var a={level:to.lookup(t.classification),purposes:tu.lookup(t.purposes)};return await e.events.post(W({type:\"consent\",consent:a}),{async:!1,variables:{get:[{scope:\"session\",key:C}]}}),[!0,a]}},n={};return{processCommand(e){if(a1(e)){var a=e.consent.get;a&&r(a);var i=tl(e.consent.set);i&&(async()=>i.callback?.(...await t(i)))();var o=e.consent.externalSource;if(o){var s,l=o.key,u=n[l]??=rp({frequency:o.pollFrequency??1e3}),c=async()=>{if(rH.hasFocus()){var e=tl(o.poll());if(e&&!ts(s,e)){var[r,n]=await t(e);r&&no(n,\"Consent was updated from \"+l),s=e}}};u.restart(o.pollFrequency,c).trigger()}return H}return G}}}}],aD=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&r?.[e]!==void 0),aV=aD(\"cart\"),aB=aD(\"username\"),aJ=aD(\"tagAttributes\"),aW=aD(\"disable\"),aK=aD(\"boundary\"),aL=aD(\"extension\"),aG=aD(H,\"flush\"),aH=aD(\"get\"),aX=aD(\"listener\"),aY=aD(\"order\"),aZ=aD(\"scan\"),aQ=aD(\"set\"),a0=e=>\"function\"==typeof e,a1=aD(\"consent\");Object.defineProperty(rG,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(av)}})})();\n//# sourceMappingURL=index.min.debug.js.map\n"
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
        return patched;
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
                schemas.unshift(index);
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
        const validateEvents = (events)=>map(events, (ev)=>isValidationError(ev) ? ev : this._config.allowUnknownEventTypes && !this._schema.getType(ev.type) && ev || this._schema.censor(ev.type, ev, tracker.consent));
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
                    purposes: ~(purposes | DataPurposeFlags.Anonymous),
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
        if (this._session?.value) {
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
        src.push("?", "lwr749l3");
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
	       *  <img src="data:image/png;base64,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" />
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
	       *  <img src="data:image/png;base64,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" />
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
	       *  <img src="data:image/png;base64,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" />
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
	       *  <img src="data:image/png;base64,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" />
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
            if (!(item.current.purposes & ((item.getter.purpose ?? 0) | DataPurposeFlags.Anonymous))) {
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
            if (value === undefined) {
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
    _censor(mapping, key, value, consent, write) {
        if (key == null || value == null) return undefined;
        const localKey = stripPrefix(key);
        if ((dataPurposes.parse(key.purposes) ?? ~0) & DataPurposeFlags.Server_Write) {
            if (mapping.variables?.has(localKey)) {
                return mapping.variables.censor(localKey, value, consent, false, write);
            }
        }
        return validateConsent(localKey, consent, mapping.classification) ? value : undefined;
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
            if (consent) {
                target.value = this._censor(mapping, {
                    ...key,
                    ...target
                }, target.value, consent, write);
            }
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
        if (consent) {
            for (const result of results){
                if (!isSuccessResult(result, true) || !result?.value) continue;
                const mapping = this._getMapping(result);
                if (mapping) {
                    if ((result.value = this._censor(mapping, result, result.value, consent, false)) == null) {
                        result.status = VariableResultStatus.Denied;
                    }
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
                    return patched === undefined || this._censorValidate(mapping, patched, setter, i, variables, censored, consent, context, true) ? patched : undefined;
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
        if (consent) {
            results.results = results.results.map((result)=>({
                    ...result,
                    value: this._censor(this._getMapping(result), result, result.value, consent, false)
                }));
        }
        return results;
    }
}

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, InMemoryStorageBase, MAX_CACHE_HEADERS, ParsingVariableStorage, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, TargetedVariableCollection, Tracker, TrackerEnvironment, VariableMap, VariableSplitStorage, VariableStorageCoordinator, bootstrap, getErrorMessage, hasChanged, isValidationError, isWritable, mapKey, requestCookieHeader, requestCookies };

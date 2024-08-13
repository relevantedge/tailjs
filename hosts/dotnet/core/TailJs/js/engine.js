import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, httpDecode } from '@tailjs/transport';

var _globalThis_trackerName$1, _globalThis$1, _trackerName$1;
const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "lzsgjtmv" ;
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";
const PLACEHOLDER_SCRIPT$1 = (trackerName = "tail", quote = false)=>{
    var _;
    return quote ? `window.${trackerName}??=c=>(${trackerName}._??=[]).push(c);` : (_ = (_globalThis$1 = globalThis)[_trackerName$1 = trackerName]) !== null && _ !== void 0 ? _ : _globalThis$1[_trackerName$1] = (c)=>{
        var __;
        return ((__ = (_globalThis_trackerName$1 = globalThis[trackerName])._) !== null && __ !== void 0 ? __ : _globalThis_trackerName$1._ = []).push(c);
    };
};

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const required = (value, error)=>value != null ? value : throwError(error !== null && error !== void 0 ? error : "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
const tryCatch = (expression, errorHandler = true, always)=>{
    try {
        return expression();
    } catch (e) {
        return isFunction(errorHandler) ? isError(e = errorHandler(e)) ? throwError(e) : e : isBoolean(errorHandler) ? console.error(errorHandler ? throwError(e) : e) : errorHandler;
    } finally{
        always === null || always === void 0 ? void 0 : always();
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
        var _errorHandler_;
        const result = await unwrap(expression);
        return isArray(errorHandler) ? (_errorHandler_ = errorHandler[0]) === null || _errorHandler_ === void 0 ? void 0 : _errorHandler_.call(errorHandler, result) : result;
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            if (isArray(errorHandler)) {
                if (!errorHandler[1]) throw e;
                return errorHandler[1](e);
            }
            const error = await (errorHandler === null || errorHandler === void 0 ? void 0 : errorHandler(e));
            if (error instanceof Error) throw error;
            return error;
        } else if (errorHandler) {
            throw e;
        } else {
            // `false` means "ignore".
            console.error(e);
        }
    } finally{
        await (always === null || always === void 0 ? void 0 : always());
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
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : (value === null || value === void 0 ? void 0 : value[resultOrProperty]) !== undefined$1 ? value : undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isTruish = (value)=>!!value;
const truish = (value, keepUndefined)=>isArray(value) ? keepUndefined ? value.map((item)=>!!item ? item : undefined$1) : value.filter((item)=>!!item) : !!value ? value : undefined$1;
const isInteger = Number.isSafeInteger;
const isNumber = (value)=>typeof value === "number";
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
const isIterable = (value, acceptStrings = false)=>!!((value === null || value === void 0 ? void 0 : value[symbolIterator]) && (typeof value === "object" || acceptStrings));
const isMap = (value)=>value instanceof Map;
const isSet = (value)=>value instanceof Set;
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
        offset !== null && offset !== void 0 ? offset : offset = -length - 1;
        while(length++)yield offset--;
    } else {
        offset !== null && offset !== void 0 ? offset : offset = 0;
        while(length--)yield offset++;
    }
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (start != null) yield start;
    while(maxIterations-- && (start = step(start)) != null){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start !== null && start !== void 0 ? start : end) !== undefined$1 ? (action = wrapProjection(action), start !== null && start !== void 0 ? start : start = 0, end !== null && end !== void 0 ? end : end = MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
/** Faster way to exclude null'ish elements from an array than using {@link filter} or {@link map} */ const filterArray = (array)=>array === null || array === void 0 ? void 0 : array.filter(FILTER_NULLISH);
const createIterator = (source, projection, start, end)=>source == null ? [] : !projection && isArray(source) ? filterArray(source) : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : isObject(source) ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        start = start < 0 ? source.length + start : start !== null && start !== void 0 ? start : 0;
        end = end < 0 ? source.length + end : end !== null && end !== void 0 ? end : source.length;
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
    forEach(items.length === 1 ? items[0] : items, (item)=>item != null && (merged !== null && merged !== void 0 ? merged : merged = []).push(...array(item)));
    return merged;
};
const forEachArray = (source, action, start, end)=>{
    let returnValue;
    let i = 0;
    start = start < 0 ? source.length + start : start !== null && start !== void 0 ? start : 0;
    end = end < 0 ? source.length + end : end !== null && end !== void 0 ? end : source.length;
    for(; start < end; start++){
        var _action;
        if (source[start] != null && (returnValue = (_action = action(source[start], i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked)) {
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
        var _action;
        if (value != null && (returnValue = (_action = action(value, i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked)) {
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
        var _action;
        if (returnValue = (_action = action([
            key,
            source[key]
        ], i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked) {
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
        var _result, _item_;
        let result = {};
        forEach(source, merge ? (item, i)=>(item = selector(item, i)) != null && (item[1] = merge(result[item[0]], item[1])) != null && (result[item[0]] = item[1]) : (source)=>forEach(source, selector ? (item)=>{
                var _;
                return (item === null || item === void 0 ? void 0 : item[1]) != null && (((_ = (_result = result)[_item_ = item[0]]) !== null && _ !== void 0 ? _ : _result[_item_] = []).push(item[1]), result);
            } : (item)=>(item === null || item === void 0 ? void 0 : item[1]) != null && (result[item[0]] = item[1], result)));
        return result;
    }
    return fromEntries(map(source, selector ? (item, index)=>ifDefined(selector(item, index), 1) : (item)=>ifDefined(item, 1)));
};
const entries = (target)=>!isArray(target) && isIterable(target) ? map(target, isMap(target) ? (value)=>value : isSet(target) ? (value)=>[
            value,
            true
        ] : (value, index)=>[
            index,
            value
        ]) : isObject(target) ? Object.entries(target) : undefined$1;
const mapFirst = (source, projection, start, end)=>source == null ? undefined$1 : (projection = wrapProjection(projection), forEachInternal(source, (value, i)=>!projection || (value = projection(value, i)) ? stop(value) : undefined$1, start, end));
const rank = (source)=>createIterator(source, (item, i)=>[
            item,
            i
        ]);
const some = (source, predicate, start, end)=>{
    var _source_some;
    var _source_some1, _ref;
    return source == null ? undefined$1 : isPlainObject(source) && !predicate ? Object.keys(source).length > 0 : (_ref = (_source_some1 = (_source_some = source.some) === null || _source_some === void 0 ? void 0 : _source_some.call(source, predicate !== null && predicate !== void 0 ? predicate : isTruish)) !== null && _source_some1 !== void 0 ? _source_some1 : forEachInternal(source, predicate ? (item, index)=>predicate(item, index) ? stop(true) : false : ()=>stop(true), start, end)) !== null && _ref !== void 0 ? _ref : false;
};
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
const define = (target, ...args)=>{
    const add = (arg, defaults)=>{
        if (!arg) return;
        let properties;
        if (isArray(arg)) {
            if (isPlainObject(arg[0])) {
                // Tuple with the first item the defaults and the next the definitions with those defaults,
                // ([{enumerable: false, ...}, ...])
                arg.splice(1).forEach((items)=>add(items, arg[0]));
                return;
            }
            // ([[key1, value1], [key2, value2], ...])
            properties = arg;
        } else {
            // An object.
            properties = map(arg);
        }
        properties.forEach(([key, value])=>Object.defineProperty(target, key, {
                configurable: false,
                enumerable: true,
                writable: false,
                ...defaults,
                ...isPlainObject(value) && ("get" in value || "value" in value) ? value : isFunction(value) && !value.length ? {
                    get: value
                } : {
                    value
                }
            }));
    };
    args.forEach((arg)=>add(arg));
    return target;
};
const unwrap = (value)=>isFunction(value) ? value() : value;
const wrap = (original, wrap)=>original == null ? original : isFunction(original) ? (...args)=>wrap(original, ...args) : wrap(()=>original);
const MILLISECOND = 1;
const SECOND = MILLISECOND * 1000;
const MINUTE = SECOND * 60;
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
function _define_property$1$1(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class ResettablePromise {
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
    constructor(){
        _define_property$1$1(this, "_promise", void 0);
        this.reset();
    }
}
class OpenPromise {
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
    constructor(){
        _define_property$1$1(this, "_promise", void 0);
        _define_property$1$1(this, "resolve", void 0);
        _define_property$1$1(this, "reject", void 0);
        _define_property$1$1(this, "value", void 0);
        _define_property$1$1(this, "error", void 0);
        _define_property$1$1(this, "pending", true);
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
        var _state_;
        while(state && ownerId !== state[0] && ((_state_ = state[1]) !== null && _state_ !== void 0 ? _state_ : 0) < now()){
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
                ownerId !== null && ownerId !== void 0 ? ownerId : true,
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
])=>{
    var _separator_;
    return !values ? undefined$1 : (values = map(values)).length === 1 ? values[0] : isArray(separator) ? [
        values.slice(0, -1).join((_separator_ = separator[1]) !== null && _separator_ !== void 0 ? _separator_ : ", "),
        " ",
        separator[0],
        " ",
        values[values.length - 1]
    ].join("") : values.join(separator !== null && separator !== void 0 ? separator : ", ");
};
const quote = (item, quoteChar = "'")=>item == null ? undefined$1 : quoteChar + item + quoteChar;
const join = (source, projection, sep)=>source == null ? undefined$1 : isFunction(projection) ? enumerate(map(isString(source) ? [
        source
    ] : source, projection), sep !== null && sep !== void 0 ? sep : "") : isString(source) ? source : enumerate(map(source, (item)=>item === false ? undefined$1 : item), projection !== null && projection !== void 0 ? projection : "");
const isBit = (n)=>(n = Math.log2(n), n === (n | 0));
const createEnumAccessor = (sourceEnum, flags, enumName, pureFlags)=>{
    const names = Object.fromEntries(Object.entries(sourceEnum).filter(([key, value])=>isString(key) && isNumber(value)).map(([key, value])=>[
            key.toLowerCase(),
            value
        ]));
    const entries = Object.entries(names);
    const values = Object.values(names);
    var _names_any;
    const any = (_names_any = names["any"]) !== null && _names_any !== void 0 ? _names_any : values.reduce((any, flag)=>any | flag, 0);
    const nameLookup = flags ? {
        ...names,
        any,
        none: 0
    } : names;
    const valueLookup = Object.fromEntries(Object.entries(nameLookup).map(([key, value])=>[
            value,
            key
        ]));
    const parseValue = (value, validateNumbers)=>{
        var _nameLookup_value, _ref;
        return isInteger(value) ? !flags && validateNumbers ? valueLookup[value] != null ? value : undefined$1 : Number.isSafeInteger(value) ? value : undefined$1 : isString(value) ? (_ref = (_nameLookup_value = nameLookup[value]) !== null && _nameLookup_value !== void 0 ? _nameLookup_value : nameLookup[value.toLowerCase()]) !== null && _ref !== void 0 ? _ref : // Let's see if that is the case.
        parseValue(parseInt(value), validateNumbers) : undefined$1;
    };
    let invalid = false;
    let carry;
    let carry2;
    const [tryParse, lookup] = flags ? [
        (value, validateNumbers)=>Array.isArray(value) ? value.reduce((flags, flag)=>flag == null || invalid ? flags : (flag = parseValue(flag, validateNumbers)) == null ? (invalid = true, undefined$1) : (flags !== null && flags !== void 0 ? flags : 0) | flag, (invalid = false, undefined$1)) : parseValue(value),
        (value, format)=>(value = tryParse(value, false)) == null ? undefined$1 : format && (carry2 = valueLookup[value & any]) ? (carry = lookup(value & ~(value & any), false)).length ? [
                carry2,
                ...carry
            ] : carry2 : (value = entries.filter(([, flag])=>flag && value & flag && isBit(flag)).map(([name])=>name), format ? value.length ? value.length === 1 ? value[0] : value : "none" : value)
    ] : [
        parseValue,
        (value)=>(value = parseValue(value)) != null ? valueLookup[value] : undefined$1
    ];
    let originalValue;
    const parse = (value, validateNumbers)=>value == null ? undefined$1 : (value = tryParse(originalValue = value, validateNumbers)) == null ? throwError(new TypeError(`${JSON.stringify(originalValue)} is not a valid ${enumName} value.`)) : value;
    const pure = entries.filter(([, value])=>!pureFlags || (pureFlags & value) === value && isBit(value));
    return define((value)=>parse(value), [
        {
            configurable: false,
            enumerable: false
        },
        {
            parse,
            tryParse,
            entries,
            values,
            lookup,
            length: entries.length,
            format: (value)=>lookup(value, true),
            logFormat: (value, c = "or")=>(value = lookup(value, true), value === "any" ? "any " + enumName : `the ${enumName} ${enumerate(map(array(value), (value)=>quote(value)), [
                    c
                ])}`)
        },
        flags && {
            pure,
            map: (flags, map)=>(flags = parse(flags), pure.filter(([, flag])=>flag & flags).map(map !== null && map !== void 0 ? map : ([, flag])=>flag))
        }
    ]);
};
/**
 * Creates a function that parses the specified enum properties to their numeric values on the object provided.
 * Note that it does the parsing directly on the provided object and does not create a copy.
 */ const createEnumPropertyParser = (...props)=>{
    const parsers = entries(obj(props, true));
    const parse = (source)=>(isObject(source) && (isArray(source) ? source.forEach((sourceItem, i)=>source[i] = parse(sourceItem)) : parsers.forEach(([prop, parsers])=>{
            let parsed = undefined$1;
            let value;
            if ((value = source[prop]) == null) return;
            parsers.length === 1 ? source[prop] = parsers[0].parse(value) : parsers.forEach((parser, i)=>!parsed && (parsed = i === parsers.length - 1 ? parser.parse(value) : parser.tryParse(value)) != null && (source[prop] = parsed));
        })), source);
    return parse;
};
function _define_property$g(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class TupleMap extends Map {
    _tupleInstance(key) {
        let map = this._instances.get(key[0]);
        !map && this._instances.set(key[0], map = new Map());
        var _map_get;
        return (_map_get = map.get(key[1])) !== null && _map_get !== void 0 ? _map_get : (map.set(key[1], key = [
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
    constructor(...args){
        super(...args);
        _define_property$g(this, "_instances", new Map());
    }
}
let _Symbol_toStringTag = Symbol.toStringTag, _Symbol_iterator$2 = Symbol.iterator;
class DoubleMap {
    clear() {
        var _this__reverse;
        if (!this._size) {
            return false;
        }
        this._size = 0;
        (_this__reverse = this._reverse) === null || _this__reverse === void 0 ? void 0 : _this__reverse.clear();
        this._map.clear();
        return true;
    }
    _cleanDelete(key, map = this._map.get(key[0])) {
        if (!map) return false;
        if (map.delete(key[1])) {
            var _this__reverse;
            if (!map.size) this._map.delete(key[0]);
            (_this__reverse = this._reverse) === null || _this__reverse === void 0 ? void 0 : _this__reverse.delete(key[0]);
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
                var _this__map_get;
                var _this__map_get_size;
                this._size -= (_this__map_get_size = (_this__map_get = this._map.get(key[0])) === null || _this__map_get === void 0 ? void 0 : _this__map_get.size) !== null && _this__map_get_size !== void 0 ? _this__map_get_size : 0;
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
        var _this__map_get;
        return (_this__map_get = this._map.get(key[0])) === null || _this__map_get === void 0 ? void 0 : _this__map_get.get(key[1]);
    }
    getMap(key) {
        return this._map.get(key);
    }
    /**
   * @returns boolean indicating whether an element with the specified key exists or not.
   */ has(key) {
        var _this__map_get;
        var _this__map_get_has;
        return (_this__map_get_has = (_this__map_get = this._map.get(key[0])) === null || _this__map_get === void 0 ? void 0 : _this__map_get.has(key[1])) !== null && _this__map_get_has !== void 0 ? _this__map_get_has : false;
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
        var _filter_;
        if (!filter || ((_filter_ = filter[0]) !== null && _filter_ !== void 0 ? _filter_ : filter[1]) === undefined) {
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
    get [_Symbol_toStringTag]() {
        return `Map`;
    }
    *[_Symbol_iterator$2]() {
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
    constructor(optimizeReverseLookup = false){
        _define_property$g(this, "_map", new Map());
        _define_property$g(this, "_reverse", void 0);
        _define_property$g(this, "_size", 0);
        if (optimizeReverseLookup) {
            this._reverse = new Map();
        }
    }
}
const parameterList = Symbol();
const parseKeyValue = (value, arrayDelimiters = [
    "|",
    ";",
    ","
], decode = true)=>{
    var _parts, _ref;
    if (!value) return undefined$1;
    const parts = value.split("=").map((v)=>decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim());
    var _;
    (_ = (_parts = parts)[_ref = 1]) !== null && _ !== void 0 ? _ : _parts[_ref] = "";
    parts[2] = parts[1] && (arrayDelimiters === null || arrayDelimiters === void 0 ? void 0 : arrayDelimiters.length) && mapFirst(arrayDelimiters, (delim, _, split = parts[1].split(delim))=>split.length > 1 ? split : undefined$1) || (parts[1] ? [
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
            host: bracketHost !== null && bracketHost !== void 0 ? bracketHost : host,
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
    var _query_match_, _query_match;
    const list = [];
    var _parseKeyValue;
    const results = query == nil ? undefined$1 : obj(query === null || query === void 0 ? void 0 : (_query_match = query.match(/(?:^.*?\?|^)([^#]*)/)) === null || _query_match === void 0 ? void 0 : (_query_match_ = _query_match[1]) === null || _query_match_ === void 0 ? void 0 : _query_match_.split(separator), (part, _, [key, value, values] = (_parseKeyValue = parseKeyValue(part, arrayDelimiters === false ? [] : arrayDelimiters === true ? undefined$1 : arrayDelimiters, decode)) !== null && _parseKeyValue !== void 0 ? _parseKeyValue : [], kv)=>(kv = (key = key === null || key === void 0 ? void 0 : key.replace(/\[\]$/, "")) != null ? arrayDelimiters !== false ? [
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
 */ const match = (s, regex, selector, collect = false)=>(s !== null && s !== void 0 ? s : regex) == nil ? undefined$1 : selector ? (matchProjection = undefined$1, collect ? (collected = [], match(s, regex, (...args)=>(matchProjection = selector(...args)) != null && collected.push(matchProjection))) : s.replace(regex, (...args)=>matchProjection = selector(...args)), matchProjection) : s.match(regex);

function _define_property$f(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class TrackerCoreEvents {
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
            var _tracker_clientIp;
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
                clientIp: (_tracker_clientIp = tracker.clientIp) !== null && _tracker_clientIp !== void 0 ? _tracker_clientIp : undefined
            };
            updatedEvents.push(event);
            if (tracker.session.isNew) {
                let isStillNew = true;
                await tracker.set([
                    {
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        patch: (current)=>{
                            var _current_value;
                            // Make sure we only post the "session_started" event once.
                            if ((current === null || current === void 0 ? void 0 : (_current_value = current.value) === null || _current_value === void 0 ? void 0 : _current_value.isNew) === true) {
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
                    var _tracker_device;
                    var _tracker_device_sessions;
                    updatedEvents.push({
                        type: "session_started",
                        url: tracker.url,
                        sessionNumber: (_tracker_device_sessions = (_tracker_device = tracker.device) === null || _tracker_device === void 0 ? void 0 : _tracker_device.sessions) !== null && _tracker_device_sessions !== void 0 ? _tracker_device_sessions : 1,
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
                var _data;
                sessionPatches.push((data)=>++data.views, (data)=>{
                    var _tabs;
                    return event.tabNumber > ((_tabs = (_data = data).tabs) !== null && _tabs !== void 0 ? _tabs : _data.tabs = 0) && (data.tabs = event.tabNumber);
                });
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
    constructor(){
        _define_property$f(this, "id", "core_events");
    }
}

function _define_property$e(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class EventLogger {
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
    constructor(configuration){
        _define_property$e(this, "configuration", void 0);
        _define_property$e(this, "id", void 0);
        this.configuration = configuration;
        this.id = "event-logger";
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
                var _ev, _ev1;
                var _timestamp;
                (_timestamp = (_ev = ev).timestamp) !== null && _timestamp !== void 0 ? _timestamp : _ev.timestamp = now;
                var _id;
                (_id = (_ev1 = ev).id) !== null && _id !== void 0 ? _id : _ev1.id = await tracker.env.nextId();
                return ev;
            }
        });
    }
};

function _define_property$d(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function fillPriceDefaults(data, content) {
    var _content_commerce, _content_commerce1, _content_commerce2;
    var _data, _data1, _data2;
    if (!content) return data;
    var _price;
    (_price = (_data = data).price) !== null && _price !== void 0 ? _price : _data.price = (_content_commerce = content.commerce) === null || _content_commerce === void 0 ? void 0 : _content_commerce.price;
    var _unit;
    (_unit = (_data1 = data).unit) !== null && _unit !== void 0 ? _unit : _data1.unit = (_content_commerce1 = content.commerce) === null || _content_commerce1 === void 0 ? void 0 : _content_commerce1.unit;
    var _currency;
    (_currency = (_data2 = data).currency) !== null && _currency !== void 0 ? _currency : _data2.currency = (_content_commerce2 = content.commerce) === null || _content_commerce2 === void 0 ? void 0 : _content_commerce2.unit;
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
    return !lines ? undefined : lines.reduce((sum, item)=>(selected = selector(item)) != null ? (sum !== null && sum !== void 0 ? sum : 0) + selected : sum, undefined);
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
    patch(events, next) {
        return next(events.map((event)=>isOrderEvent(event) ? normalizeOrder(event) : isCartEvent(event) ? normalizeCartEventData(event) : event));
    }
    constructor(){
        _define_property$d(this, "id", "commerce");
    }
}

function bootstrap({ host, endpoint, schemas, cookies, extensions, allowUnknownEventTypes, encryptionKeys, debugScript, environmentTags, defaultConsent }) {
    var _map;
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        allowUnknownEventTypes,
        extensions: (_map = map(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension)) !== null && _map !== void 0 ? _map : [],
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

var index = {
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
        text: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,A,x,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rd(e))?r(e):e},B=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!B(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},J=(e,r,...t)=>e===r||0<t.length&&t.some(r=>J(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return eA(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rd(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rd(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>eA(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:ex(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,eA=e=>\"function\"==typeof e,ex=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,eC=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,ej=!1,e$=e=>(ej=!0,e),e_=e=>null==e?Z:eA(e)?e:r=>r[e],eM=(e,r,t)=>(null!=r?r:t)!==Z?(e=e_(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eU=e=>null==e?void 0:e.filter(el),eF=(e,r,t,n)=>null==e?[]:!r&&em(e)?eU(e):e[ei]?function*(e,r){if(null!=e)if(r){r=e_(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),ej){ej=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eM(r,t,n)):ew(e)?function*(e,r){r=e_(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),ej){ej=!1;break}}}(e,eM(r,t,n)):eF(eA(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eP=(e,r,t,n)=>eF(e,r,t,n),eR=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eF(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eF(e,r,l,i),t+1,n,!1),ez=(e,r,t,n)=>{if(r=e_(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!ej;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return ej=!1,i}return null!=e?eb(eP(e,r,t,n)):Z},eW=(e,r,t=1,n=!1,l,i)=>eb(eR(e,r,t,n,l,i)),eB=(...e)=>{var r;return eH(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eK=(e,r,...t)=>null==e?Z:ex(e)?ez(e,e=>r(e,...t)):r(e,...t),eG=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,ej)){ej=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,ej)){ej=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,ej){ej=!1;break}return t})(e,r)}for(var i of eF(e,r,t,n))null!=i&&(l=i);return l}},eH=eG,eY=Object.fromEntries,eZ=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eH(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eH(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eY(ez(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e0=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eF(e,(e,t)=>r(e,t)?e:Z,n,l)),e1=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e0(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eG(e,()=>++l))?t:0},e2=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>eA(t)?t():t;return null!=(e=eG(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e8=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eG(e,r?(e,t)=>!!r(e,t)&&e$(!0):()=>e$(!0),t,n))&&l},e9=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),e7=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),re=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=eA(t)?t():t)&&e7(e,r,n),n)},rr=(e,...r)=>(eH(r,r=>eH(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rr(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eH(t,t=>em(t)?e(r,t[0],t[1]):eH(t,([t,n])=>e(r,t,n))),r)},rn=ea(e7),rl=ea((e,r,t)=>e7(e,r,eA(t)?t(re(e,r)):t)),ri=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):re(e,r)!==rn(e,r,!0),ra=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=re(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},ru=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>ru(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ra(e,r)},rv=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rv(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rv(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rd=e=>eA(e)?e():e,rc=(e,r=-1)=>em(e)?r?e.map(e=>rc(e,r-1)):[...e]:eT(e)?r?eZ(e,([e,t])=>[e,rc(t,r-1)]):{...e}:eO(e)?new Set(r?ez(e,e=>rc(e,r-1)):e):eN(e)?new Map(r?ez(e,e=>[e[0],rc(e[1],r-1)]):e):e,rf=(e,...r)=>null==e?void 0:e.push(...r),rp=(e,...r)=>null==e?void 0:e.unshift(...r),rh=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eH(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rh(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rc(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},rg=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(rg(ee)):performance.timeOrigin+performance.now():Date.now,rm=(e=!0,r=()=>rg())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rb=(e,r=0)=>{var e=eA(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rk).resolve(),c=rm(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rw(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rk{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rS,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rw(this,\"_promise\",void 0),this.reset()}}class rS{then(e,r){return this._promise.then(e,r)}constructor(){var e;rw(this,\"_promise\",void 0),rw(this,\"resolve\",void 0),rw(this,\"reject\",void 0),rw(this,\"value\",void 0),rw(this,\"error\",void 0),rw(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rE=(e,r)=>null==e||isFinite(e)?!e||e<=0?rd(r):new Promise(t=>setTimeout(async()=>t(await rd(r)),e)):W(`Invalid delay ${e}.`),rx=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rx(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rO=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=ez(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},rj=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),r$=(e,r,t)=>null==e?Z:eA(r)?rO(ez(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rO(ez(e,e=>!1===e?Z:e),null!=r?r:\"\"),rM=e=>(e=Math.log2(e))===(0|e),rU=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rM(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rM(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=ez(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:eA(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rO(ez(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rF=(...e)=>{var r=(e=>!em(e)&&ex(e)?ez(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(eZ(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rq=Symbol(),rP=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=e_(r),eG(e,(e,t)=>!r||(e=r(e,t))?e$(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rR=(e,r=!0,t)=>null==e?Z:rJ(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rz(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rz=(e,r,t=!0)=>rD(e,\"&\",r,t),rD=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:eZ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rP(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eB(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rq]=o),e},rJ=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rJ(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rV=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rL=/\\z./g,rK=(e,r)=>(r=r$((e=>null!=e?new Set([...eP(e,void 0,void 0,void 0)]):Z)(e0(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rL,rG={},rH=e=>e instanceof RegExp,rX=(t,n=[\",\",\" \"])=>{var l;return rH(t)?t:em(t)?rK(ez(t,e=>{return null==(e=rX(e,n))?void 0:e.source})):eu(t)?t?/./g:rL:eh(t)?null!=(l=(e=rG)[r=t])?l:e[r]=rJ(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rK(ez(rY(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${r$(n,rV)}]`)),e=>e&&`^${r$(rY(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rV(rZ(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},rY=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},rZ=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},rQ=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return rn(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r0=((C=l=l||{})[C.Anonymous=0]=\"Anonymous\",C[C.Indirect=1]=\"Indirect\",C[C.Direct=2]=\"Direct\",C[C.Sensitive=3]=\"Sensitive\",rU(l,!1,\"data classification\")),r1=(e,r)=>{var t;return r0.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r0.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r4.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r4.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r2=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r0.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r4.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r4=((C=i=i||{})[C.None=0]=\"None\",C[C.Necessary=1]=\"Necessary\",C[C.Functionality=2]=\"Functionality\",C[C.Performance=4]=\"Performance\",C[C.Targeting=8]=\"Targeting\",C[C.Security=16]=\"Security\",C[C.Infrastructure=32]=\"Infrastructure\",C[C.Any_Anonymous=49]=\"Any_Anonymous\",C[C.Any=63]=\"Any\",C[C.Server=2048]=\"Server\",C[C.Server_Write=4096]=\"Server_Write\",rU(i,!0,\"data purpose\",2111)),C=rU(i,!1,\"data purpose\",0),r5=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r8=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rU(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:r8,purpose:C,purposes:r4,classification:r0}),te=(rF(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tr=((C=$={})[C.Add=0]=\"Add\",C[C.Min=1]=\"Min\",C[C.Max=2]=\"Max\",C[C.IfMatch=3]=\"IfMatch\",rU($,!(C[C.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rU(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=ti)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rd(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e0(e,e=>e.status<300)),variables:e(e=>ez(e,tn)),values:e(e=>ez(e,e=>{return null==(e=tn(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(ez((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=tn(e[0]))?void 0:e.value}),variable:e(e=>tn(e[0])),result:e(e=>e[0])};return o}),tn=e=>{var r;return tl(e)?null!=(r=e.current)?r:e:Z},tl=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),ti=(e,r,t)=>{var n,l,i=[],a=ez(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r8.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},to=e=>e&&\"string\"==typeof e.type,tu=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),ts=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tv=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},td=(e,r=\"\",t=new Map)=>{if(e)return ex(e)?eH(e,e=>td(e,r,t)):eh(e)?rJ(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?ts(n)+\"::\":\"\")+r+ts(l),value:ts(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tv(t,l)}):tv(t,e),t},tc=((C=c=c||{})[C.View=-3]=\"View\",C[C.Tab=-2]=\"Tab\",C[C.Shared=-1]=\"Shared\",rU(c,!1,\"local variable scope\")),tp=e=>{var r;return null!=(r=tc.format(e))?r:r8.format(e)},th=e=>!!tc.tryParse(null==e?void 0:e.scope),tg=rF({scope:tc},o),tm=e=>{return null==e?void 0:eh(e)?e:e.source?tm(e.source):`${(e=>{var r;return null!=(r=tc.tryParse(e))?r:r8(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},ty=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tw=()=>()=>W(\"Not initialized.\"),tk=window,tS=document,tT=tS.body,tI=Q,tA=(e,r,t=(e,r)=>tI<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tS&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tx=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nb(e),et);case\"e\":return L(()=>null==nk?void 0:nk(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tx(e,r[0])):void 0}},tN=(e,r,t)=>tx(null==e?void 0:e.getAttribute(r),t),tO=(e,r,t)=>tA(e,(e,n)=>n(tN(e,r,t))),tC=(e,r)=>{return null==(e=tN(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},t$=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,t_=e=>null!=e?e.tagName:null,tU=e=>({x:eC(scrollX,e),y:eC(scrollY,e)}),tF=(e,r)=>rZ(e,/#.*$/,\"\")===rZ(r,/#.*$/,\"\"),tq=(e,r,t=er)=>(p=tP(e,r))&&Y({xpx:p.x,ypx:p.y,x:eC(p.x/tT.offsetWidth,4),y:eC(p.y/tT.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tP=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tR(e),{x:h,y:g}):void 0,tR=e=>e?(m=e.getBoundingClientRect(),f=tU(ee),{x:eC(m.left+f.x),y:eC(m.top+f.y),width:eC(m.width),height:eC(m.height)}):void 0,tz=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rx(t,t=>eH(r,r=>e.addEventListener(r,t,n)),t=>eH(r,r=>e.removeEventListener(r,t,n)))),tW=()=>({...f=tU(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tT.offsetWidth,totalHeight:tT.offsetHeight}),tB=new WeakMap,tJ=e=>tB.get(e),tV=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tL=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eH((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eH(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&e$(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||td(l,rZ(n,/\\-/g,\":\"),t),i)}),tK=()=>{},tG=(e,r)=>{if(w===(w=t1.tags))return tK(e,r);var t=e=>e?rH(e)?[[e]]:ex(e)?eW(e,t):[eT(e)?[rX(e.match),e.selector,e.prefix]:[rX(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(ez(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tK=(e,r)=>tL(e,n,r))(e,r)},tH=(e,r)=>r$(eB(t$(e,tV(r,er)),t$(e,tV(\"base-\"+r,er))),\" \"),tX={},tY=(e,r,t=tH(e,\"attributes\"))=>{var n;t&&tL(e,null!=(n=tX[t])?n:tX[t]=[{},(e=>rJ(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rX(t||n),,r],!0))(t)],r),td(tH(e,\"tags\"),void 0,r)},tZ=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tA(e,(e,t)=>t(tZ(e,r,ee)),eA(t)?t:void 0):r$(eB(tN(e,tV(r)),t$(e,tV(r,er))),\" \"))?t:n&&(k=tJ(e))&&n(k))?t:null},tQ=(e,r,t=ee,n)=>\"\"===(S=tZ(e,r,t,n))||(null==S?S:es(S)),t0=(e,r,t,n)=>e&&(null==n&&(n=new Map),tY(e,n),tA(e,e=>{tG(e,n),td(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t1={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t2=[],t4=[],t6=(e,r=0)=>e.charCodeAt(r),t3=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t2[t4[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t4[(16515072&r)>>18],t4[(258048&r)>>12],t4[(4032&r)>>6],t4[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),t9={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},t7=(e=256)=>e*Math.random()|0,nr={exports:{}},{deserialize:nt,serialize:nn}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nr.exports=n})(),($=nr.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),nl=\"$ref\",ni=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,na=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=ni(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||eA(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[nl]||(e[nl]=a,u(()=>delete e[nl])),{[nl]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!ex(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?nn(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},no=e=>{var r,t,n=e=>ew(e)?e[nl]&&(t=(null!=r?r:r=[])[e[nl]])?t:(e[nl]&&delete(r[e[nl]]=e)[nl],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?JSON.parse(e):null!=e?L(()=>nt(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nu=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var l,i,a,n=(e,n)=>ep(e)&&!0===n?e:a(e=eh(e)?new Uint8Array(ez(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(na(e,!1,t))):na(e,!0,t),n);return r?[e=>na(e,!1,t),e=>null==e?Z:L(()=>no(e),Z),(e,r)=>n(e,r)]:([l,i,a]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(t7()));for(t=0,i[n++]=g(d^16*t7(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=t7();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=t9[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t3)(l(na(e,!0,t))),e=>null!=e?no(i(e instanceof Uint8Array?e:(e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t2[t6(e,t++)]<<2|(r=t2[t6(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t2[t6(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t2[t6(e,t++)]);return i})(e))):null,(e,r)=>n(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},C=(nu(),nu(null,{json:!0,prettify:!0}),rY(\"\"+tS.currentScript.src,\"#\")),rU=rY(\"\"+(C[1]||\"\"),\";\"),nd=C[0],nc=rU[1]||(null==(rF=rR(nd,!1))?void 0:rF.host),nf=e=>{return!(!nc||(null==(e=rR(e,!1))||null==(e=e.host)?void 0:e.endsWith(nc))!==er)},o=(...e)=>rZ(r$(e),/(^(?=\\?))|(^\\.(?=\\/))/,nd.split(\"?\")[0]),nh=o(\"?\",\"var\"),ng=o(\"?\",\"mnt\"),nm=(o(\"?\",\"usr\"),Symbol()),[ny,nb]=nu(),[nw,nk]=[tw,tw],[$,nT]=ea(),nA=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nx,nN]=ea(),[nO,nC]=ea(),nj=e=>n_!==(n_=e)&&nN(n_=!1,nF(!0,!0)),n$=e=>nM!==(nM=!!e&&\"visible\"===document.visibilityState)&&nC(nM,!e,nU(!0,!0)),n_=(nx(n$),!0),nM=!1,nU=rm(!1),nF=rm(!1),nq=(tz(window,[\"pagehide\",\"freeze\"],()=>nj(!1)),tz(window,[\"pageshow\",\"resume\"],()=>nj(!0)),tz(document,\"visibilitychange\",()=>(n$(!0),nM&&nj(!0))),nN(n_,nF(!0,!0)),!1),nP=rm(!1),[,nz]=ea(),nD=rb({callback:()=>nq&&nz(nq=!1,nP(!1)),frequency:2e4,once:!0,paused:!0}),C=()=>!nq&&(nz(nq=!0,nP(!0)),nD.restart()),nB=(tz(window,[\"focus\",\"scroll\"],C),tz(window,\"blur\",()=>nD.trigger()),tz(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],C),C(),()=>nP()),nJ=0,nV=void 0,nL=()=>(null!=nV?nV:tw())+\"_\"+nK(),nK=()=>(rg(!0)-(parseInt(nV.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nJ).toString(36),nX={},nY={id:nV,heartbeat:rg()},nZ={knownTabs:{[nV]:nY},variables:{}},[nQ,n0]=ea(),[n1,n2]=ea(),n4=tw,n6=e=>nX[tm(e)],n5=(...e)=>n8(e.map(e=>(e.cache=[rg(),3e3],tg(e)))),n3=e=>ez(e,e=>e&&[e,nX[tm(e)]]),n8=e=>{var r=ez(e,e=>e&&[tm(e),e]);null!=r&&r.length&&(e=n3(e),rn(nX,r),(r=e0(r,e=>e[1].scope>c.Tab)).length&&(rn(nZ.variables,r),n4({type:\"patch\",payload:eZ(r)})),n2(e,nX,!0))},[,n7]=($((e,r)=>{nx(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nV=null!=(n=null==t?void 0:t[0])?n:rg(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nX=eZ(eB(e0(nX,([,e])=>e.scope===c.View),ez(null==t?void 0:t[1],e=>[tm(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nV,ez(nX,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n4=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nV,r,t])),localStorage.removeItem(\"_tail:state\"))},tz(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nV||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n4({type:\"set\",payload:nZ},e):\"set\"===i&&t.active?(rn(nZ,a),rn(nX,a.variables),t.trigger()):\"patch\"===i?(o=n3(ez(a,1)),rn(nZ.variables,a),rn(nX,a),n2(o,nX,!1)):\"tab\"===i&&(rn(nZ.knownTabs,e,a),a)&&n0(\"tab\",a,!1))});var t=rb(()=>n0(\"ready\",nZ,!0),-25),n=rb({callback(){var e=rg()-1e4;eH(null==nZ?void 0:nZ.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ra(e,r)))):t.push(ra(e,u)):(em(u)?(n=!0,u.forEach(r=>l(re(e,r),i+1,e,r))):l(re(e,u),i+1,e,u),!e1(e)&&a&&ru(a,o)))};return l(e,0),n?t:t[0]})(nZ.knownTabs,[r])),nY.heartbeat=rg(),n4({type:\"tab\",payload:nY})},frequency:5e3,paused:!0});nx(e=>(e=>{n4({type:\"tab\",payload:e?nY:void 0}),e?(t.restart(),n4({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[le,lr]=ea(),lt=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nk:nb)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nw:ny)([nV,rg()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<rg())&&(a(),(null==(v=l())?void 0:v[0])===nV))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rS,[v]=tz(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rE(null!=o?o:r),d],await Promise.race(e.map(e=>eA(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),ln=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var l,i,a=!1,o=t=>{var o=eA(r)?null==r?void 0:r(l,t):r;return!1!==o&&(n7(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nw(l,!0):JSON.stringify(l))};if(!t)return lt(()=>(async r=>{var l,i;for(i of eP(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),ej){ej=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?e$(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rE(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nk:JSON.parse)?void 0:a(r):Z)&&lr(a),e$(a)):e$()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&W(\"Beacon send failed.\")},rU=[\"scope\",\"key\",\"targetId\",\"version\"],li=[...rU,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],la=[...rU,\"init\",\"purpose\",\"refresh\"],lo=[...li,\"value\",\"force\",\"patch\"],lu=new Map,ls=(e,r)=>{var t=rb(async()=>{var e=ez(lu,([e,r])=>({...ty(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eK(r,r=>re(lu,e,()=>new Set).add(r)),o=(nx((e,r)=>t.toggle(e,e&&3e3<=r),!0),n1(e=>eH(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tm(e),null==(i=ru(lu,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&B(null==e?void 0:e.value,null==r?void 0:r.value)||eH(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>rn(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tr(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=ez(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await ln(e,()=>!!(c=ez(c,([e,r])=>{if(e){var t,l=tm(e),i=(n(l,e.result),n6(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<rg())rf(v,[{...i,status:s.Success},r]);else{if(!th(e))return[rv(e,la),r];eT(e.init)&&null!=(t={...tg(e),status:s.Created,...e.init}).value&&(rf(f,d(t)),rf(v,[t,r]))}else rf(v,[{...e,status:s.Denied,error:\"No consent for \"+r4.logFormat(l)},r])}})).length&&{variables:{get:ez(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rf(v,...ez(a,(e,r)=>e&&[e,c[r][1]])),f.length&&n8(f),v.map(([e])=>e)},ez(t,e=>null==e?void 0:e.error)),set:(...t)=>tr(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=ez(t,(e,r)=>{var a,n;if(e)return n=tm(e),a=n6(n),u(n,e.cache),th(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tc(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rf(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rv(e,lo),r])}),a=c.length?V(null==(a=(await ln(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&n8(o),eH(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},ez(t,e=>null==e?void 0:e.error))},d=(e,r=rg())=>{return{...rv(e,li),cache:[r,r+(null!=(r=ru(o,tm(e)))?r:3e3)]}};return le(({variables:e})=>{var r;e&&(r=rg(),null!=(e=eB(ez(e.get,e=>tn(e)),ez(e.set,e=>tn(e)))))&&e.length&&n8(eK(e,d,r))}),v},ld=Symbol(),lc=[.75,.33],lf=[.25,.33],lg=()=>{var l,a,i,t=null==tk?void 0:tk.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tk.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tk.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lm=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:ez(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lg()})),ly=(e,r=\"A\"===t_(e)&&tN(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lb=(e,r=t_(e),t=tQ(e,\"button\"))=>t!==ee&&(J(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&J(tC(e,\"type\"),\"button\",\"submit\")||t===er),lw=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rj((null==(t=tN(e,\"title\"))?void 0:t.trim())||(null==(t=tN(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tR(e):void 0}},lS=e=>{if(I)return I;eh(e)&&([t,e]=nb(e),e=nu(t)[1](e)),rn(t1,e),(e=>{nk===tw&&([nw,nk]=nu(e),nT(nw,nk))})(ru(t1,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=ru(t1,\"key\"),i=null!=(e=null==(t=tk[t1.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e0(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>nA(e,r))(n)))},s=[],d=ls(nh,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nL()),null==e.timestamp&&(e.timestamp=rg()),h=er;var n=ee;return ez(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rr(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),ln(e,{events:t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rr(e,{metadata:{posted:!0}}),rr(r5(rc(e),!0),{timestamp:e.timestamp-rg()}))),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=ez(eb(e),e=>rr(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eH(e,e=>{}),!l)return o(e,!1,i);t?(n.length&&rp(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rf(n,...e)};return rb(()=>u([],{flush:!0}),5e3),nO((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=ez(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eB(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rc(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rh(r(i,s),i))?t:[];if(t&&!B(v,i))return l.set(e,rc(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nh,v),f=null,p=0,g=h=ee,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(e=(t=e[0]).match(/^[{[]/)?JSON.parse(t):nb(t));var r,n=ee;if((e=e0(eW(e,e=>eh(e)?nb(e):e),e=>{if(!e)return ee;if(lZ(e))t1.tags=rn({},t1.tags,e.tagAttributes);else{if(lQ(e))return t1.disabled=e.disable,ee;if(l2(e))return n=er,ee;if(l9(e))return e(I),ee}return g||l6(e)||l1(e)?er:(s.push(e),ee)})).length||n){var t=e9(e,e=>l1(e)?-100:l6(e)?-50:l8(e)?-10:to(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,to(e))c.post(e);else if(l4(e))d.get(...eb(e.get));else if(l8(e))d.set(...eb(e.set));else if(l6(e))rf(o,e.listener);else if(l1(e))(r=L(()=>e.extension.setup(I),r=>nA(e.extension.id,r)))&&(rf(a,[null!=(t=e.priority)?t:100,r,e.extension]),e9(a,([e])=>e));else if(l9(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nA(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nA(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tk,t1.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+nL(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n1((e,r,t)=>{eB(null==(e=te(ez(e,1)))?void 0:e.map(e=>[e,`${e.key} (${tp(e.scope)}, ${e.scope<0?\"client-side memory only\":r4.format(e.purposes)})`,ee]),[[{[nm]:null==(e=te(ez(r,1)))?void 0:e.map(e=>[e,`${e.key} (${tp(e.scope)}, ${e.scope<0?\"client-side memory only\":r4.format(e.purposes)})`,ee])},\"All variables\",er]])}),nQ(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>ti(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lm(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...ez(lG,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t1.name}\" is used for something else than an array of queued commands.`)},lT=()=>null==A?void 0:A.clientId,lE={scope:\"shared\",key:\"referrer\"},lI=(e,r)=>{I.variables.set({...lE,value:[lT(),e]}),r&&I.variables.get({scope:lE.scope,key:lE.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lA=rm(),lx=rm(),lN=1,[lC,lj]=ea(),l$=e=>{var r=rm(e,lA),t=rm(e,lx),n=rm(e,nB),l=rm(e,()=>lN);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},l_=l$(),[lU,lF]=ea(),lq=(e,r)=>(r&&eH(lR,r=>e(r,()=>!1)),lU(e)),lP=new WeakSet,lR=document.getElementsByTagName(\"iframe\");function lD(e){if(e){if(null!=e.units&&J(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lB=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lJ=e=>t0(e,r=>r!==e&&!!lB(re(tB,r)),e=>(re(tB,e),(N=re(tB,e))&&eW(eB(N.component,N.content,N),\"tags\"))),lV=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&ez(O,e=>({...e,rect:void 0}))},lL=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tA(e,e=>{var s,i,l=re(tB,e);l&&(lB(l)&&(i=e0(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e8(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tR(e)||void 0,s=lJ(e),l.content&&rp(a,...ez(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rp(o,...ez(i,e=>{var r;return u=e2(u,null!=(r=e.track)&&r.secondary?1:2),lV({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||tZ(e,\"area\"))&&rp(o,...ez(eb(i)))}),a.length&&rf(o,lV({id:\"\",rect:n,content:a})),eH(o,e=>{eh(e)?rf(null!=l?l:l=[],e):(null==e.area&&(e.area=r$(l,\"/\")),rp(null!=i?i:i=[],e))}),i||l?{components:i,area:r$(l,\"/\")}:void 0},lK=Symbol(),lG=[{id:\"context\",setup(e){rb(()=>eH(lR,e=>ri(lP,e)&&lF(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n6({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n6({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n5({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n6({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n6({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tF(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rR(location.href+\"\",!0),A={type:\"view\",timestamp:rg(),clientId:nL(),tab:nV,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tW(),duration:l_(void 0,!0)},0===d&&(A.firstTab=er),0===d&&0===v&&(A.landingPage=er),n5({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rz(location.href),ez([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&ez(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=rZ(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n6(lE))?void 0:l.value)&&nf(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lE,value:void 0})),(p=document.referrer||null)&&!nf(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rR(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:l_()})),lj(A))};return nO(e=>{e?(lx(er),++lN):lx(ee)}),tz(window,\"popstate\",()=>(x=\"back-forward\",f())),ez([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>lY(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!A||tu(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eH(e,e=>{var r,t;return null==(r=(t=e.target)[ld])?void 0:r.call(t,e)})),t=new Set,n=(rb({callback:()=>eH(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tS.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e0(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e1(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rm(!1,nB),!1,!1,0,0,0,rQ()];i[4]=r,i[5]=t,i[6]=n},y=[rQ(),rQ()],b=l$(!1),w=rm(!1,nB),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,A=S/r.width||0,x=f?lf:lc,I=(x[0]*a<T||x[0]<I)&&(x[0]*t<S||x[0]<A);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t1.impressionThreshold-250)&&(++h,b(f),s||e(s=e0(ez(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||tQ(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tq(i),viewport:tW(),timeOffset:l_(),impressions:h,...lL(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=ez(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:eC(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:eC(a/u+100*o/a),readTime:eC(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var j=tS.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=j.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=P;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+P),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}x=r.left<0?-r.left:0,A=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(x,x+S)/I),u&&eH(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[ld]=({isIntersecting:e})=>{rn(t,S,e),e||(eH(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{rl(tB,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eB(null==e?void 0:e.component,n.component),content:eB(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eB(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,re(tB,e))};return{decorate(e){eH(e.components,e=>ru(e,\"track\"))},processCommand:e=>l0(e)?(n(e),er):l3(e)?(ez(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!re(n,l))for(var i=[];null!=tN(l,e);){ri(n,l);var a,o=rY(tN(l,e),\"|\");tN(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rf(i,v)}}}rf(t,...ez(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tz(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tA(n.target,e=>{lb(e)&&null==a&&(a=e),s=s||\"NAV\"===t_(e);var r,v=tJ(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eH(e.querySelectorAll(\"a,button\"),r=>lb(r)&&(3<(null!=u?u:u=[]).length?e$():u.push({...lw(r,!0),component:tA(r,(e,r,t,n=null==(l=tJ(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=tQ(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e8(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=tQ(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e8(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lL(o,!1,d),f=t0(o,void 0,e=>{return ez(eb(null==(e=re(tB,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tq(a,n),viewport:tW()}:null,...((e,r)=>{var n;return tA(null!=e?e:r,e=>\"IMG\"===t_(e)||e===r?(n={element:lw(e,!1)},ee):er),n})(n.target,o),...c,timeOffset:l_(),...f});if(a)if(ly(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rR(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nL(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tN(h,\"target\")!==window.name?(lI(w.clientId),w.self=ee,e(w)):tF(location.href,h.href)||(w.exit=w.external,lI(w.clientId))):(k=h.href,(b=nf(k))?lI(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t1.captureContextMenu&&(h.href=ng+\"=\"+T+encodeURIComponent(k),tz(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tz(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tA(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&J(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tJ(e))?void 0:t.cart)?t:tZ(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eG(e,(e,t)=>e,void 0,void 0))(null==(t=tJ(e))?void 0:t.content))&&r(v)});c=lD(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&rl(r,o,t=>{var l=tP(o,n);return t?rf(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:re(r,o)}),!0,o)),t})}})};t(document),lq(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tU(er);lC(()=>{return e=()=>(r={},t=tU(er)),setTimeout(e,250);var e}),tz(window,\"scroll\",()=>{var i,n=tU(),l={x:(f=tU(ee)).x/(tT.offsetWidth-window.innerWidth)||0,y:f.y/(tT.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rf(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rf(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rf(i,\"page-end\")),(n=ez(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return lX(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lD(t))&&e({...t,type:\"cart_updated\"}),er):l5(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tO(e,tV(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rj(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tO(i,tV(\"ref\"))||\"track_ref\",s=re(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tO(i,tV(\"form-name\"))||tN(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:l_()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tz(i,\"submit\",()=>{l=lL(i),r[3]=3,s(()=>{(i.isConnected&&0<tR(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tR(i).width)),e.events.postPatch(n,{...l,totalTime:rg(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,rg(er),1]}),re(s[1],r)||ez(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:rZ(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lK]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!tQ(e,\"ref\")||(e.value||(e.value=rZ(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lx())),d=-(s-(s=rg(er))),c=l[lK],(l[lK]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eH(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tz(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=rg(er),u=lx()):o()));v(document),lq(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,n=async r=>{var n;if(r)return!(n=await t())||r1(n,r=r2(r))?[!1,n]:(n={level:r0.lookup(r.classification),purposes:r4.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},l={},r={necessary:1,preferences:2,statistics:4,marketing:8};return e({consent:{externalSource:{key:\"Cookiebot\",poll(){var n,e=null==(e=tS.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return n=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,t,l)=>{return\"true\"===l&&(n|=null!=(l=r[t])?l:0),\"\"}),{level:1<n?1:0,purposes:n}}}}}),{processCommand(e){var i,a,s,r;return l7(e)?((r=e.consent.get)&&t(r),(i=r2(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await n(i))})(),(a=e.consent.externalSource)&&(r=a.key,(null!=(e=l[r])?e:l[r]=rb({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e;tS.hasFocus()&&(e=a.poll())&&(e=r2({...s,...e}))&&!r1(s,e)&&(await n(e),s=e)}).trigger()),er):ee}}}}],rF=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),lX=rF(\"cart\"),lY=rF(\"username\"),lZ=rF(\"tagAttributes\"),lQ=rF(\"disable\"),l0=rF(\"boundary\"),l1=rF(\"extension\"),l2=rF(er,\"flush\"),l4=rF(\"get\"),l6=rF(\"listener\"),l5=rF(\"order\"),l3=rF(\"scan\"),l8=rF(\"set\"),l9=e=>\"function\"==typeof e,l7=rF(\"consent\");Object.defineProperty(tk,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lS)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9iXbbRtYueh5FRKvVgFmiSGqwDArmbzt24iQeYslxYppxILIoIYYABgA1hGSv8xr3Be6DnSe5-9s1ACApd_6z7lmnOxaBqkLNtWvP23W94PHcmeVyKy-yaFQ4vesw25IiE4VIRCwiEYpcXIuxGImJmIpLcSGuxJ04FzfiizgVZ-KleCJuxWvxRnwIXPowkMHj51mWZq70UHlxmaU3W_LSlUE2RlofOb5ciqdcXhTBbgcFowkVCYJssUhmcRwELn4agexLP_O8TBazLGm0eyh2QzXs7NBPhp9WLJOL4hLf6kdvjlHEIgnavQn1JN6Kki3pcRODeNigkvSzs9N4yu8Cb6KgbphmOr1mM1mql62Ean5z_occFa0v8i6nRnUzS1N6Kb5XY2m1WgWNRY-jfVLokjs7RStPr6SbBY-_R0nPEz_zJ1S6HOcHPeasn_nOk61M_jmLMjneug7jmdyK8q2rKM-j5MIRNMlnd1OpJ7qVyWkcjqTrUAcc4aCo-bjleNTYj2ptGm1R8KJkd3M9Oul6y1FYjGiBPJv2hAbZl3dYM16yD7xkvpwhfZQmeRrLluTGM53p-dlyEiVhHN_N1SgKGjVVvhQ_YE_wkmC1seWKVpRERRTG0V9yvFhgvDQ1an-0ikuZ9OmNH6gLj91acR4EjZj6cE1vtOE8z_96Ea-nB1YsxS9BmN8lo7XpQPdoxwfhTRgVW9wV85W8wrDNrqS90x56_es0Gm-1_aQ1oiG7mYg9Py4nknZag2dLbbor85QNOkO9ybbwjFb0CVmiB5Fq31WNZaYVXgVs_Yh2cl6EyUimky1efU99HpnORks0o1Nlr75Y0rNrVG2nMO3QemHBfsWCSfExUMnip-D17OpcZq1XT375fPrkxfPPL1-fPf_2-TshZdDoCMlTKdXazpdCJqoCGeNX728ho-D07uo8jVtRIbOwSDMhQ3MIXII3VAkOj1t4tCV2dhL6z2wk9eAWtB8L2o-F_1HI1Hyrtysd648KuHz09cCkGZgcZEOPC0h8OkO_nPOUZiZMHJoAOks0odTHPJChK2c4YG3q9M6O26FqFgtnEsa5dKgKpDlFNpP0HXI-4nzJa9TYaFANEzNZUX4aTuTLpJAXkoY65TYTzqs1eckZgL90sqsZF9yXS6HnsDqcVpGe8gcuGr8KnmRZeEct8q-Qdzz_a3tFyHMNBzpeWedHv0GzTXtU0iT68ha_AwIkcugP5FDIm3IRMXgnZVhY6-kXAyCnWVqkSBfy1KRdyOKtSX4zEfKssimo3VNqDzP5RcjnZkWdySwZFVFars3GBRXypZo73la1Hj3hjLVqkHVbmYOGqXexaMiBjIa00np8DfsJXRQZtfV6bVJfhVMh36wln8pCyGdV8K6nuYN7geb4VVhctrJ0lhCUeUCAj9-n6Y3baQtaikYbNxTBxDZtrT1atT_4kG2jIRcvdNaoP58DWa2dTgEvIF0xGa_bK32_4nSV90qhjgHBVfmZPhAa0tCmzoK2eaUTR2ftJ0-4BBLp-2x3l1oo6C9dU5zmJ1STT7P5Pti0PSdRTGfclTH184Xuh0gqszEYVnfde75CMP99s2QPePoAM_VW8RiuzTP0myA6oGWh7_dkC8vk2bIA0tTLotn0CEFw7yIZj7cS6sof3pwns3eeyfDLcinpTG-hBob-qhZVRVL5bkldKQKGLr585aqhUH-Bhqz2t9o96oHtoEJAGC0JBomQg2Q47JUdjrE2bsxd9uOy0_GGTqM71W68cNXS13pCTd8Ds70590htCNsQdZmW1wJaGgaurJ6nc3kKqDm_0kjQ1gskT9qeqdNspV1J6FRPNpu2it3dnp3u-qbrScozxZpNbssTOHJvq1sHA9UvQr4zyGMH90YHqCoVsb2TrsZgKzso4x2kDnmi0UfPLH6ExY_71EZGmIzXaeBW5C5RXRGQQ6qN7idfdTNSYylnR_UNvaA15LId6uVf1f7z_a-2h-B9b_ZDW0TBYMgbpQiKk3bfoLTNwtc3IN14bRpoUs1MdGbST3yT2CtOaGgN-UcPO4nrDwM5KIY9s7D9kM5GKGJstJA2WtSazvJLN_QMuqugTWSxX4OdnrvyrR0N3bF0zX_YuAgo-c6t0BC4ogjZx5XiGUTQ4lbf4YINTP_7kpArgJXKDVEBXhnNk6c6jNrOMYm0U6grP9QQ8ApU5OtM_uVynQSRVBHPt49CfltbJV6TXgXuaAxOGurAXSsNMkmf9P8_FpDXruwArR5NQhzoFYyAk1OaCAHe-pEfA0TUYYSe3Hjp2b5iRAzENBlEx6A6HjMWLFlEaLAaTbQCWCO-FypANuKNRMixX9zbi0L1gnuwjjz8nU4w8OT-V5oeRARFo-Gw3oOvdWBZO-wVcOKVo4uDyOL9MaHC8rtAfivkrwaZmWTp1fOEUC-ZC_mxvGEN_SAsIl7ZgyAEFouiT2sH7Pg7ADi6ge2FSCNiSgtdsSBYEnkQFG40wJGg6xyUAy4GnRBwgg_cA_URWrF6tMxcrSJO9BlV41pIT7MZeQNC1VEtked-QuRwedD4AzrES98eyvvqrHYNxx6f-fJXl49f1me4Tv1N3UyB-I7qf0pvRHt7NDVty0MwVEMR8NkTChEBOVgAwF1VsFTpKfir61eVM6KPj-iAd-4_4DQKQ4997DGGQYhRm4sTQOODA0g_r17V5R1p-A1ADFo5kZ4GRqgGGtVjtlXlIcgVHgLfApbIkd9iNNTXZjNmaqdNU9MNFMSq45RyiolgBPIqvDUlfLeEv2bIIVNnhCrQ3BCd5xcr-0TqZtW2NKwAe-SwQemEYYvS1IZE2KvZ1S-enn8kBqBs-0zeMs5QgciLBXUY-I08ifsxAfqPIht0wYHZBzp_vGGh1o_TGbN_Glm_fbJxTv3VlVIPAR4k82Es-R4r8l2K8o6R1zQo6tq31T3baKhdRR3fdoEG8Fzyo4IgOzsxrdEju31liXWDyKFWs8ItN6i3y4Qs4_EPK3i6bIFgJ-pyROSx5TvRrPF-V50OgJqMZSwLuQUyiGmhoPArubKl8u0DsJraJ61cohj9BaZE57AVjsd9JNEvSle_VA0wUiZXQR4z5MwW39x9BdK4X2jbtR0lyCNBHvb5r2r1Msz7_Nc07K2zAeizchtjTR5ypwgvJGRdZFnlpLgEHTNaksf86w6o60P03VbpYjupZuiJKs0yfudJ4XHT5lYLFTIBVjlWDC9qpyjpl5inj7Zp1qjtK1TMOQQf6Q9DbmS6Ayo7ZK6HvoqA-NIYEqb9H9JbjCc76XqoZvyZVNxEH5spiyxHZIUcpQ1UTflAlyOl9htmojENeuEZydXVggxNFCykfZ5ZZo26pCvkywZWLUEOXQvR9fTrqO3kePftSVHQsGe2idq2YgacQsJ2djonFlvM7LnKmEoFF9IjQDgFozWb6blRhycrP6N9P42jEea84wHhNGy2UOEJIruubCF0RRVoVG6LdXzAzVqTOCxeUetY8xtec175wnRJDaRTYVX3B2An0u2On-HQz65d_czN806hTYsJoifdqDQNqrHaXT3AQgX2oKm6sJNRCe00oI1UjaXO7S3LuAUNe8ygSzESXJD32UhBNGbR63mk6UOrQKeZjQq-uW-u4jNd5CPug4HU_UJFtNtRlLoyR1lCJ96gbCJvsEOJMLFIelkruAKvTSlMbFmKUQ1Uy8iGrllynycbbkrLmTDEA-3LbPq1grMkv4wmhSl7Wd_8jOnV9ugZ71GF4akbymXMDLMQDvU-Cln2IIcKCSd4E4SKMdxwiS4jMkxwrjlEvUFIMxiES8Ks6Efog4ark27ZEQhYZBTLpUcAp08ocWw2My0JzdOQFvUicGbJWE6iRI5LrtZUZoQOXwEiMDOIwYZCJAh-J1T3hSvBWq8UbBXRlXyTRRdR0qwmJ-kN7ZZvwoIfRXYFdKHRpn2DazIDk7LE7IOmfJC5HqP3GvePCM8LmQlMCxA3g92kySg-tR6LkLFygj9UZ4RZVTm0q2lsmp_ZNvXLQO3e-QTyD5mM7vxM4Io_D0dffGw6Maf0maT5ow5Ow1kux34E4pWO1MWFzPwQLykNy0_xZD-eGe52Fk78fEldvgYOWGJPLdsmkKK2oC6PCTTSzs2-eEYaQQMfBdmV24g8MQlG9DpVAoktqXZI43qxaMQ7O-PWVCbjKLnQ_EBZyqaolHvXOp_ld-CYcx4om579pOcpKcbYUtmLxRg9oHNG88h8SFXiFxeDmrnoyO6k6XKXaHJp4MhoSHTEdh18-ZOgvViktA40hg4VtD3p0Hpc8hxdB9TQGW2VdFZw_XmfZyYvniTRVQgGzYssvJLuhefT3hAZEcW7RNx74kLN8V0rHBXRNTU-pezy7RJY55Vm3zKGNVI3zCiWYWZavC4_CRoN95r2FH3o03Lc0X_BXGX5NER0HL80wCLMCl_jZ3ZV-UITs6Ck4WeCht3GdUgbML24iKVvrlxaB9NsXxIIdK8YO7xr6Y2FkXg-J_o8d_5duefMDlCrMlXg48o1FfKtvDSrSVVy07SJ6Ngse4brtZXdaDxhnjHN3Nf3hTr8b7OUDm1xx2XmLFMEzZzMrmQWntNIaGCEvk2ii5l9v8miQj8vDT60HMVhntOmnhPSpmSTrhUdFpdR3vo8pVsxymWLM5copuRP9xTjTC6mN_B9BXX20uxIzcffXLhSiBaLsugzTMd_-sqUsR_xsdlYOuDTfaoK5tFFEsYVMSoXtb1Q1dlTyJ8oCSfzjTf1xWYvK2g1ukK4BRUUjinpCA30a20szUqdzv83G2KQ2vtKczZLD3NjDnN81jN4c2xI592wIV0vvsPI6PoyvFXPrmvQNqJYFXpUShj1Lcwf6-q86oToNL4O6H2Q9XVvfN1b2v7goS0WdHAIs-NSjAdXq9ES3VJA7-i-bYVxJsPx3ZYRTe-pyWEp_ZL-LwbVPWMWE0WGgVyyhDh7viJYWiyi_AWE39hjhNITrk8wup8xFVedGEJKK3BZScEhi3etyDtjQsfzP7i_v0xowLQAhKCHd1vbc7ls_U5rcbtK_jHbNzBzLvkBTPCIIXnSYCKPDhsYh0T489qFtbw28jKdZ0BcSCeEsJmQ8Bepis-1YkqgEUZdcuBWmQVBdgsmBeEcTM2AaMOzpjcgQzfUGlF7UE8AJipiCPQF0e-uZh_TbU7Iaosu1ech5Pl6YERjeUCo3qgbaOCEydgRjthyhiVRZG5cxvKBFvzFSg019jZTAQOiQpgIaQtCXlt_pFHilmJuYOR036ByTzhbjmAyAQ9yYOiY3c5wqL5zHJDOlSpYgwTfgk-f_WHpQib01NePgchXetB0_tf__H8dQqFFtl2uck2-SL3O3jA375LZb0D4ASfL-5E7cqkFkaooloAxDq7Eq3BaqLDIXimpppKBxulFl_WGaOraC3TlfbCR2y5SqnYDCbZCIElL6wALz5jQvlTKQ1Psdk0-6awBxOo_pjcyexbmwNQo1RN5sFYpYX46jaECJ41LZhOR0skdeEjXdHjHM5pgM_2LDFghIYB9poEElfPHIkkTwheBm07-xphGq70m6hD9ZGKmwpcxG3HCYCGj3d5XPZzQuoE76m_SU1BL91EvouW32IcRyJN-4o9WJ4tTp-40zHLUxfcd775LgIjBhbga0rAHeiZq-grcZmWqyn1XLBZ0ZnzNvSuCKYhIj8isS2DvHz2_wnloewSUXW7tI8gW9KAGKWmTEUkDwZxHOxHCxxBzsTMeMt1GxO3Ov-nf2OMilj4PQSFGQz8kTC_Iy_2kZh8y7B36k72q7ifeaB6Y8qaaDUIu38HC48QN_cG0FHlRM1PWusJC-R-HhLOuqRJURpQGzOXof3DLC-f70zevW0qjJJrcuanX_B06YUlabIVbCrBvz4ulQt4IsINsPq8NjofQSBYLN9lR-hk8xhKE1gU2RAmtMNezFc0n0MeAs-ai5Os9M4wYAoAVaMvoFxfuEUhXUvoYkDSjBFvQsj2-guXW8dnOCrZbYrcdLHKCP8wEhIoPoaMOIdG0BfXdjxfAZOa9EVVmlPv6wIP9YukbnJqoccK9zAHMVkaGOxbs8uAxNr4YDL7ayc5SzPlMMbVw95YfL4QGBn4uFATyr0Wcpl9mU_9KaCZ4rrsnmEwvIGm5wvYnAERg9oVK5IvMIQQHSjcEjRx1aemCXh9pW06z8H8nFFHtmd-bGrCf6_vVramhOP9ymrJJfz0eKjirSyi1zKezTPrngk6IIZnoQ56C8_VDJdVRKu8KsyWpzuWQq3yxIlFGvx83NI-wKvZlBhLucM1xYuYRDW9o-qEgqNbnWAP2_kcayUc9IRBHoeM3msGj1FfKLalOAbQ7AvCzPT9b365W1fBjr-RnKw40y8KLEkyA3KJz0OId4EKUUlYXMcsErAJ78YSVr3c7_aj8LmqZzeOysIIZg0EMoRvjfBUFyexPraaHC_CtQXUWhOj0gOw4Q5qDRntNPiP7blXIQse6cJ3A8QyvECKLUTqW79-9fJZeTQny4ZIAcXzlep7RYH0Sx67ThAorYzQ61yNsCFwgSESBNMSDLnVeJa5qShqRHEScq1CzVL_4thQXNjICckr8CtVCuc1rrskPQ4V4HqQHStkBDesBsopzx6r5Qi_Ro9pQoj_AX4LsQC0VGvaupoRbdiuDSvDeb27fx3-DTzfN1u6w6fl0LX3a-7Tn9emBc37z_4vS6fETXv5r-ID6-1-USQkDSvg0pNxPw4U7aO8-8ofNxeC3veaw2fe4iO9-GuMDrnXw2z_69Dl_2qdP_8F10ds_3BaetvcurDhP41szowiuaKt5ns6yEZ0pkY8u5RVYCbQN_KLfSPwGodcfRTgrLlOCsHd-LGa5zPxITIkcvUmzsR-KyzQ3yhFpP_VnYppmJiHvWzQix1pMCTckCPfnTGZ3Rotu7Gd_uWNgn5MsvLii3eSPLMyVLXwSqB8sb8t2hk4rleg7RNLtObRcAMYiM4o6amdn30BgseMwDiyybywOWtn4NCXBYEjwr4Ihfyy1Ce0FDWY5lIL3aHJ_az3of-ovfvP0jO-Bo1aWZJzf8p_VDssUEiMGWIbZ0CBiYZC9ZVyGuf1QplN8_48-C5H6Ie07kQPG5qtC0LiUfRq18b1Pg0_D7T1BZ4tQRaX7RA12TmZmY898woDQB0JIRKqY6DnhxhbFkuY7-ZRTCLb2JQ4ysPwmmHt2bRT0-XMYpJh8kWndeaq8qpdakynRuOI-4X8fRURgBvPOZyYT5gqwhFOsUiA0VL0E0eaXGvLlJ2VZJf9UywRW_88bVRrtZA0-_bb96VPrQbPvejRv8-ViSKfF-fRpewcEzY_B3qe_WpSS_WCVm7Mg23Yr8hYr9WCxCVayBm4M1Bmqy6ftyo06wBrSEX24wMK9kxfPb4msEc7FjKBn9qPIvoU0IvtuTUNVFRXZLwHrXQ8YsFfIWAvVs-9chfOwHCv7ARc_E9jzmlge8PMXpb9S2cAMIJaY_hnX0t-jaaF-gbgoLHER89ffeoMsoOsRkndcTbS-wLwcBRc_7bktgmOf9voLhk8EnmbC0qjZ2tC5n9mv1FWd87vbP2ng3yf6n8d_BttzWpSElpswit89RmVob_7-G6fTx9J87Kx__OnTA0d9kv3sZsAO9j59clseNsJ2B1lOi0ost3_3lK5c9quVH9XVLrJgbV3NyWe1Evq0qmb0Hz8uN3phK_gJU2wO6m6mNRQI3OyCEimR-MHQrntCczfnA8RKlFZzCsqr8RAsHKnV9ftF6yYaE7QtVkg42YSOAxG8vi5BELPdS-1t2UuNiiJfLYTppKwSK90IIr1rdO2k7VmOUGGIhVS0oV1kyrZRlkDnSdBWlIZJ4-8J2swCPAcRs3naJ7Z-pbSE3A5yoebUcA0Wk6M_zQpEzrk-_qrsk1qHmdebBVFQdnB3VwmWl0tbklXnBmbs1B4ErjwtRPoDn20HrvssiIN4sZgvvcGz1hMiD--u0lkeUOcd--aIZ5T5MhlHGSGqAVAi86KyvlEZhCI531SST2WSRywU2acc-0aX3Hs3hsDHGYdFuMUs42gSjVhOg52cdVbk_maPtA1-aYDv2masVwZAsgGIXcsYBOZ91VVQu_uqq2F_qI5o1YP_2DkiSKZpLvON3bKZ6NnBf-zZel2bMmmVu5vncrX9qbs2ecyzqvZaKkG64CFrqa_Q2ea1Xoe_eY7rD5tWzSzTptGtlyYK0_TSX507ubHF6vTZt6_PJQ0_ar2WI5nnYXYHq6XsgE9QFETmBL0mKoMPDx7UKbBf8MGxbyrzhRakhQR_7_gA1VJUobel4Ds4oCKVd1XgLMwuZAExwjFl2zdzCkczoKFB54hPoXozZ5pQWSV9IVo52O_y0a6mqXJPkrvPJXA4eMTQoZJkSwVH-yrPtJ1dyyzotg-OuW28VXM-f6C-0KDaj45svkpjIBERBayBhF4FR3Q7nQ6BiGeByu-s5kN-c2jRICg5rJ20K1mE-EgZfblaIyhsUQWFHAv7zmL7sVihz0PDqKPPjTKRrRJaW9kx7YrtIA2wJbZb38bpeRjzplCPjtim5OdJwYtCyepRJZ_S7qDV562gn1XGN_KaAD1DUvXIM5TS_YHc90Tt8N7AA_j3dNYj8HO28lE6lQCqKSE-JYQXla0s5lzIz47tYX5WPU_rZ5oIGFo2N3vhpp74ujVOTV-KMA20xNpI_ES00Rd514rTURhLUOlhRogE0oQjE6bIudyuLg_UOeNDtx3oO2s8VrfVeKx21qso4VmlX50Q3vJ00q_e9ZNXwLx5LvUzT-Y2TabKx-lVZQ64jH2vTe0UKVvQbqFkWvE8yBUcoGWcjTC5tPPRN_2mFvJZJkPaZpSFXuo3lfU-GV2GyQVl7rd5Mc272QJJRHkHbbUJ8KIyXqfFC9h2UdYBwx71qjLfyXD8JonvKPOQMs2r7kyaTAiBKHAE0Rv9arqTz6YgkqnRQ-5tJUUV0UI7-rzNoIPf9AYHX5i-Q8ZzJWClOc75yJa7UxZbRCMUBEI8sabaHkAkEmnLThY2BEWkdbI1C25eMcIFgxVyZb-S_0NpVauRxF8IUVVqYkuPdUVov61Y8iqz4FL9IaOSVnoJ5XXXiDBjMMJxUYLJRUeMxd6-ZAGesisWYRzrBMb3PaHXVCdqUov2OU_DyX4bTD8zQbkuBbZikXAGM1_L1E2UUZEwN9-eRqUUAYkNodesSOzyrLoVs2mqzN10kjUzzV2nGbi_3gktPeQ3nqdMY2iAqe6m6uXG3jGrfa2DdtjqS1sQ6jKzuNCjRpJdmhSgKAnWTBGKuCJNgt48XXsZgXAmUEAeFXHFKDPr3z8-WhD_q6NfLOjYBUFwbyFRRJvMNsBUCAPL13aVRhrn5zXWhdka3FaDVku1Z9Jp9hVJ-_j3f23PGaAu_wVtHCIrj1uKF-9qOOot1YXwu2fQozwwdLPXp33lNZ2tUTqDFWJabJ3LLafprjTnTABcWo7_O1pT3y4WdNAb1UJ0sh3fgfKBs6R6RtB72_odlT2qVvZ7OtkiEkDDndbW2SVdp7dTVlHYImwAF-AWDcvSSGVvDZXU0sVo0ONI9ftKQWaqSy_7PVXZTbFeV-t3nwBttauVCWMVDcyXgzYg_uGbcesmzLfGDJhpemi5_tbnytfCOJVKXIa5oDXbKlIeAPM6Q9R2WFsEAj7scyEcb6UEzqm9w3p7DmY22Zoldjq5WZ9WVPfAt0W-JOlNgsryNIH7BlETw1bR4UEIEpa5gACoMSFB2p4v9iAFXVquW2Q4eR_cSOsMfAJ1p5WjQ41ph6bqENSrKNJAcUXWzdNbbOVdzHirZxYkVVB1FPCU7cOVghXlsVwtRvBq4FxH8sYhIrzIdat7v7n_HDzZfdHefTScd5eLwW__HHoPtvcuolYh84JlMHuVApWMjdIGiDmL63uoWTrbDXesDBLca7ifCC-aFY0MBRY9peQAxm2ZN8Zxzjiv451Uv6mkq6lA3axiXowVxHMcuke1evOa3ruSYn2nLpZirMGWUbFQcgMlGfiU-_-GzMB3-43Blh8AoHPyvyEAAAstfzCgZPqhFwfyBGfwmzN8sGh5D7iAs9j2Fv9Cxr8Gv_3r35WcfyEHGVsPlIxi8JvY6f0DddNEPPA8qpSFB1sP_k1FPo1R7FML4gYtexh8yvEF9YWqUqKFimABw47psg4vCLT3i5xu76bj-5p13KSE2NxhyKzrJET9yA-he5DSNTTb2ekA8DHJ-SJOCdTOwOOJ1ULU0_c60CO7dgs6N0vP5ydoLdDajBipHQUjQ0n-TFsz2AWmhydD550Hu10m8c41GXVJCPM42AVypp4ZyxoxlsVY9dY6JVBMg_tM97KgGNkrg7l5lSsEe-hSeZ2gUqV4b-3a45tGFBcBEQiatihGS-AFxVWwhhKUX2o1HgPi-8WVa8E9bhv3q922HTIdR4-98ub7H-Zy_B-_N92KEnXB9PLLMZqm9adBsjOLuSylip_ajoFrejxNNgag2tgUUZg66K07XFIVN6xChn8fXCDkWxUUkyCsKL4EN1EyTm9EcRqM09EM8iRRnAXFaes8Hd-J4mXwkyieGCmRhiDFy5OAIYl1IRC0gSfLXmcjBpIQRDpTULEBHYek2QSrSskis5rFGOvEx0GGWzwzIt6IEDqoW-12WOsbjininmKhRoTuyp5qUU0kiLekeB5LjMWzktLUdCdt0S0js2_0aFFjcQoER98yqRVNpcFKWahahIQC4ix4ZX0TKHWbBpfWH40otMcN5y9HQzg7TAdP1qsKPywWzjnUEAiVz28iJZOZj8JcNto-fqgWfwPvjMAtVdAEnq-ExtanTV1PqcdVdVRVmaN-zx1fVeZopy4s-eeiTmLytirQw2T-YTN_ZOqFFW-met8LWehilyvFkvNatlzN5hElX6yToS-muJ54v2oYRbPIE9fX49enRJSydzUqPTF2Xm6tlo3mFuKkvC5xYyqwtoPpWD0pqJ7zGdtvQTxavKl88qS0IE3c4rW5sKjUs03yD0WBvFZ2Wna_ZbavXgVNqC4idXTb1EddwhVPHRqfFncxJl67nGE9oJ9ZPz3TtYvic8W4uA9wc_Gadq2vMtmZiTu_9eUzNx9laRz_givhrnz_VQCMieKFaV4Jf_7ReqDkp9i4H4mmLVNE8acBG2xk406D4q0a8c7Or9TY9Naftm7FHf_eCW6cEvaKs1Y6mRDG8IGFJwe6H1SmzPpORheXBfKm4YV8kcbj3C_6KKLgGdHSdG5VKbPK1KO3dd9j0F9rTQkpLGQG-FQaWq6xX6mVX70-zZB6_oX6pFOXPu1AyrikpItlULzDnrXvZo-J4h0jd333SqFaT0G-EGr5LI4IbLyD7j0sY4r3sD4SaimuCHmdFM1J61bPwRVthym933lahMJp_OiJSzVaTlLPXqX50iVHQFBlCq6qz5ZAec5WITQ_LLAlMhCy4FttwWmsSKFX_PyaevpjlBeS5tbYbdZLZfIqvZYbC6LoB3UfgX-vhpqZgVSXTa27Hs76ehJ2XoQxF_JX9grn6FVf2StY_qeMcMIKFB6Miu-xIsVTRnyBKfysrZjZwibrO7u7RRaOvuwSQqYfvCYh0j8GNScfG0gAJWGjWdnIy6jCEpzB3GWuBVHhCq1IV9CKNHDvlPO1wXlAhE8_9e8G50N4xJBSNAhfSQKsADAAVrYSyVA5DchYT1NVE_YzRSOELFxn29fIODprFKwLVHcLpTQDqHsAZC7rFshtt3TdESpqIA5WwGOIkg0J7HWxIOQ9FgQZErH3aRdSYt9h6BkxNPnB2JYV31YNYG9wl98ERQdgKi8ta39Q_jSU0JZPU_YdK2QP5HBoXJ58YA6bP1AmmQPI59VI6CYhOiSWI_bA1ppmchLdDn0u4bHGElQCqDODAQvfec0_7RIVQ50ANr-9oDfI4ffYSJW5VTcwerxRena0AOzXYVWHajjsuYVViih-ZCog87RzDlF8Z2HqtiufusU2RvAznRsJwwTz6pzTFbDrNFUyK8dT5i_QdCh-NZC2AM3khGYtcscrFaPBYPvRmvzTpil-GRSsvswPPHQmai159em06X3yDZXzyVUJRBOBwBI-0V0e01WNT6cPPvmawDFK65hX2laJJ0Q2ZCVC2khDNi8au6qfmFgahJ4unouP9s6o-2NYl54VfXPr8g3sFh-VhTgrmiozcWsSqif2tZ7YyqxWZ5MFb3QsvgTF92q_J-4Xz4jjqHM_rXSO8Qv3NNBNM5jT9HEQnPZPfToEp2isXfPnZHHShK06DRFMy8gohOBxAfcvvtUJ43WHhdLOG9v-E3asHHH0QU_mbJecGDV9b7j0sU06wTzBpU8TH8WOyLOR7-x9Llp_5I4YRznoszEUcSGCYhie8xVBby-sWWlX7gtt1ahNavxDSqK87G4K9tMPRI0wVvHFPITTyCZGV3TuWKB0dkkPl3Rz-x36Xl9Jz1K6i2-LVzKZMR8dQ5kb5G_AQrZdsPbVEwbjMKHTBRuzOOC_R6VtrGyNiBx9RuTHE1YpK_YDVj1ynjx99s3zF99-9_L7H3589frN25_enZ69__nDL79-DM9H1N7FZfTHl_gqSad_Znkxu765vfur3enuHxwePTx-tPvZGZYKqfpYdwfFATR4am22vWGQsXDK0krYP3CJZPSYiNoZDNn9kZfB6VGzOTw56RwtzOOxfhKxVuw6GLido8POYfthdyfzHj_uHGPoA7d7eNw-OFZJXZV00N5XZY74_Wh_JxuWbn6MP6Yg2S345CvXimyE8UyPQauKuTHD60fBfL_rD7qdo6PO_lH3qJOIztHDhw-POo_ozjk68Aft29H5pPtoJA-OD7rd7n73kIq0Hz067HSOusfdTofKdbrHKHg0Oup2H3Zl--H5ebtz0D3qnlOBh4dH3UeHo8PjcSLat532-v86--cJeHTwHxJ0D4-wzg-Ua8GQcAVCnxc0v1kwl7cQEtEGoh1CmyiXmSJ9faJxKy_JMnCZ_JiXBqXWCR-jiFe0-6JpDLpz1YBDOxzV9m7GeozocCYYWSznbz03vM8w2eIPwVa1Pdgy1SsebE6Eec94g4oZOrwnDPVYtUhzB2EU-wOu9c16dINHrtD6fOjBW1bqSnBMle-2tOLhNW7ls_OQK4ZqUWlRmzJXlS-OkQh7miC1vquYLq1Y1_u523nU9ZT7KUXbGSejlCX7nUeHfufRQa2A9ghaEZP1KgZ9Ozv3Wem0T9izzEnQ6T6EzV97Z2d3v0uJfdZab5-o3O7hYf_aHXTbB6zkvksTV_lQZR1zlvni6PBwX39zKOTjx49VNlX-8Mh-ixf99aNKIVPHQffRwaOjh7SDVZkjLtM94J_OUbXabufg4cHx_tGBrdumqAY67Xs_Ns1tOCDq044AKr9nu3PkqZoyVVPGNWVc6J__oRD62r49XmnG9Hk9p-_mLnXAEyy-9K_hJrHPXaIlEO3q_wnn6rYfClqqr_0bwq0TXZOES9BZ-IYAP_gvruIe86l4OptMaHMc00UOTjOzKo4OXHYXSp1p79Nd6a4cpIJtAHAWKntSc_t9dwRVY7cGtll_vYTa8LGdnBS9RPmsoz11UoP8hArMs9Ilm6lGeT1c6Yup9AFRHR3_wPPYrR58ZhR8fhVZUL9ZQtYDTE8AEKJBTBdEkFqXXekJlF1sOsH_BZ1Pm314SBv0JN3ZSU8Oj_a7Sn2w2QwfB0Udnr0_e7F7vEV3O7Xpb0X0ezVlXZN8RgUuwgLqB1GmAdZsUw9nqonF4vDh_sH-yexrDeRylCbjSuWoLSTImW21b53mrPT-2zmCiDAEQ3Msb7ecZkivhIvAwV0GwTZ1SY-e6Cec7KOm63ba3f2d1KPrte011dvM4xt00T2gdbHT1enuHO0vaGqVDVY1Y9HtHvQqE2sK6iS6YlN-N3zArB_5URXMxmrbWf0dgikdAl2do3ZzhOMyUrCLTsxDMRr6IwOYKOFYjPhMjnBwOo_4jc7rSJ1Xk4fNHta2tXY-qGVdDCkBrv2abjTcmPQtMC5ACIOuA5LnenuEo_WUYI_SXkVxHKnFIuRyZ4egAe6ikxKSKCh0wEc4uweqmK86DzsPHx0fPeocH6jP1MmnA96RRw82NMhgqisKVHjAP0eiODnp0kN7kVWA3r1Nu9RO59Ejgkh_pynVBlVQcAVEMwm2Ged19NdMOmcscKtObXnUVxxSccazOLyayjHn913AnVEgK9tD32QdGg9d4rRDQrslOo8eipA7FdKW6Dw65jfqcKg6bPKwJUZwF19r_eU9vaL0ztF93d2cQ5_sd-_7ZHMOQ-mvZB0dqBmZ-dU9qb2NKteYpXcq9hWaNZtlbkb3_CE2eve4mWHWsvIg0eYxe4EOUnf_vn0itOviRLmStc2Bbkuh450CzC-r14ihVQjyxYsFbKwaUOxhtBAsxndKTZ1FBX8HdYQmAp62_uU0DfrVdP61NQoTrRph8UhIdHobXH_f134_de_LcpXnFf_-EuyYZWnxRex5retkMU-7AgcH6yvQrq1A574V6Jl7Ex6li5OMXcSm7AfWK1vPdegBQ9GcRM2OV7m5uw_islOUR5TWg6Cr-UgrdzEcQrO4OoarpmIZDyKi6UTUbJbtXa-3Z61S7m_WTsx_p3V-kexZommntuzJ2M470ZhAyvoreJ-o4XewBPy3y7RSeJ7TlS-9Ko4oKnnSq35IF7w72LhG9-Golc2hvMpYP1jtqkNc45cLorsqCKjgdf1VbAn-zhYL603RTv1_jxTbOr-Dfi2TY66iytKs0o4HIq1CNeJ0sW_Tv9WcOrmVJuqVQWtGXk2LO13rvdeFK9eQRWiirVF-bMSSlGSfV2h9GLrDFN0Hu6_S3rUk9WLXntwBIbNsimKuZpBKNmxHj9HcY5t1sG-ycjcDfcUjodNuSxw-slbvKHFwoEocldU_6pgSY5Q4aqsSj7osCK3w_lTyPidvnHieaqCRhCqOOltaO0xXd1CpTjkSI4q0mtZWaUfVZmfuLtEsuoaHazldnXO8lqOH-ehRNWdU1tZlFal6TlfndNZyDnRObUpS1yTv15OPdXJ1xFuhaxo-rCebVo_qyabuh_VkU3dtxJGt-1E9WdfdadeTdd2dTj1Z193p1sev6-7s15NN3Qf1ZFP3YT3Z1H20UveRTq8Nc1xZp87xWo5p-dFajm68WxvvdeWbbmctx3xTG3Ve_WZ_Lcd8Y48Z4Yf2jO52D4-0GyYTAWcsz2cXrnOVX0zD0RcFjXwHpPGmE6TUAAnZyIBlVAgsN2FfOUCtoBD4Ckr7F_ItqjyPkjC722ILCFfBH1bv0-xFxzNglyg3grtMn4FQawMoUu-hb0nw0DrqKKEm3ENZQBVBIcIa5DEXFc4Me-0TxFjwYCjbBMBiHRIGZR5YDjtsgbYbMOcshqatXwRu8YBZh00N86wbANtaWG0N2IdupsB3D4r7P0xdc9cFNX6FbJ3zdSYSmhoM8Q1LJ0VpIZw0g0zwlu5z9BiNIRPNiE4fr2QwgwMZWrxdwcWUKzy2AcyCEKyOHjgXlghNqA8rzRY1bArXNXPW6PoJOSBGORPzJU0FR64oBnR3DGvXSg1H-lotdFuZWioX1Xo1482DSWqdd1edc2W00I6jiAEqwIwarS9UueXAs4mYefOoc0K7JDqhU8WIXXESJJsYFUq5ssYJ6e7yds2VfIT5DoG739mJvJOTo8XR_o5qTzMS-Ejrtg7ati1CV_9ea_ubWusccmud7sK17W1oXblb7e4_Mu0fe19r1ejjMpqhWoWzSObERF_hxDCgUGEXMLLu3xzZwaaRPVQDO64P7GsDRawwTWZ4cTPYJNGIStf2DRTudDoHbM71lY4yYsGaIpvHL29HUo7zLXzVOYIOM6x0etGu4j2J-7pCOHN7AXYc1bKpAPOoooXi0i3r8S0KDu1gDspo03nDgUE8lmBWYfoTxGVQUuX1YLkOqri0uVACNn44od0C7orXZLfDkE_Z1y5kVOpNDvaHQgM96rvcf6CiXxxvqLmwNXfrNR_Uai7b2R-C0CDct2SyHz1wsfD7Qy5wUO_mYb2bR9VuPlztZrPY60iFDzAKcn9v__487AZEHgVAbe5pbCMey7eovkQJftF1OA7NvczeEkH_zJmYyQQK-3KpPCQmwbyUalFeReAFd6e8kZHMD8Wyl2QtLSELEqqWjcfKNG9nZ7v1-bPMX6XjGURfq5HO4EL9zU1i9M1UQIFt-DtnDojj9beNvqS_TVNAEHk7kxNHJBU7FPkSHLOPftGHxqfx74UgknRPKr_rwsh_f1ZGRwU7MKZ1KaLJnQ8ni8sVF3nqM-VcCBK0CO6JEBoDGtb-R9bYodZiKEg32Kul9mfEvoFqvtlnLBjkDOg6EVU-q5gsKX_UZcQQOM2Tpaan0qiEX2b6eVkG0lERN9iXkjLcJ2gCBcqdHTjTVdrAnOBah9jM4qg4njf2pJFRCIi0FpP9gOBhPAT9iN8g1COxY6NEGs8cv3647ClHZbKMCwVHum6paR5ZLQXDkGBtgyaAC_gxwGIAVBushLOJy2noWeWparHYGMGidFVvQ5xUfUyxoofy8JsqLR_mBPFcrA6wgI6-je1kLbWUoumKCUQ_qbigzFlzW-l8eH5FvbX0K4fwHUm_C4PvDbnsFtEU8JawHi6VWyteaGpuNjkMTJJWI4YKFU3yRm3NBIFboey7EhVqwFnsNNPVpUyYAZ0VSA-_YoOPyFUXXUWDFYoTYFnGWZYK1-FLi3FpL5g1lV_faJZqRV7mILKuXz0QpwVzV4p-oJtyJKNr8C5BkXxk3_c0ESoeAoxrS097Usz_yGH4Gyi3dcXKuU8CrYErlR9pdg2UcJwWOlKXxp1-lZXylxW9QX2RLsadFY0ReDLrb94DG9c-Cdk7Eev--uoFXq8QTsdutgGUAm05UfMip6cv5S1U-nHk36HvsjekcLgimbTuqlLIDRMCUfQnhy7MNdFIY_o3on8T-jdFIr30RifufW51epNmMB2MVhRZRgg2xTzLSzAZMfPUAq3CdEgtYObc62ACH5-7naWvtfouGFaa7Gawmw9GAVXV8f5pvPQNm27OjVXdsQ1k3wzwkj3md4523WrcoeaB98_O0bog9YDIVoLRSja734sYJwwu3OIhDpgOVAZBn04f_9YhWu4hI3GxxwzmSp7Su9Hf9WIQKzoX9ZWBZ5XSX73Pil-937twbS1wX1-OYfeAhjT-rcynAS0W1BH252LOWn14bdWVZJMMmQBwUna_WvFqR_lkHR14tYuqxmtDIwSKOOrx0QEhDRjRIIQfruLRIB3q0ZU6JsHT6OJlUrTCHD167abCDX9TabUxeg9mtj98PLO-UvNwdWETu_Hl63rsxmb4z5USK9Edd-_70vPDElnfP_KWQ0ahxMD6qOrLxC_2PaJAywPreaLqtSp1o_tYtLB73aTexQYxBrisrdb-AzfeO1gAc4yb-zv73j_3sf3icod1B8UR7jg6d0A7F7AuqqZ5jx8fCPqCw4_xJ6ADMyKHDjaV7aKsVym8z2WPFvWC5V5RhtRKaa8Ohryl4oMb2VizEn20BQgNlVLFyEVMRrhHy1oGYTNh79QnZ_0z_ywYqHjMGrwDnxP1lAq-Bz11uvSSoQ1yp7Von-FmdGEz-rVPRfYrrEWKU2N0ezrKomnRyrORcP7BXn_eB6qM-4wwfLji8uABkioeB89gbZWMguw9ZxmXSdmLIHvnJmPlYtcogb9owdUffTepGJs13EYyKr-U-FC55q25zuMvS8gsk3H-ISou3WTksQUUBpxaP6AwvID3RrHn_ub2g099qs397VMLz3uet0ddN8Yxfcdjb1DJZZDijZ0gYHAX5v0qKfB-Fbg6YZajgHGNSQcnuRPJOZAuAIXkRiRfhrSEN6K4GYrBtkjOhojcRHU8WfFUyidCBZfxVgN063h7fVvAX3H1BdBZdRSYtTQK4XHQ-ETZFW-lI17YsSPs93ErGqNQzG5uaeYGya1IXuteDpI3InlmuvwHW8l8ZhftnwNgEclrPNFVnbywETASDkmcvOJir4IGwoU411EencccHdtY0rU4LYIPndOCqDhU94y-EA1CVN6X1X2mam7dZFu5iUeN1Nx7DpdCCHbywj79SdjZX6422Rs4sD-5jMaSVmmSSfmXdIYK1fwDxekUrZTNL9Mbh2MWzK6qZduqrDUAdMp-KzcRjsLlEhX4LXlF41Cf0Qvmpzo53NG3pssDkfxlJvebIDt35zawDLf-J1X1l0sDw5Dfqm5PKsrGByokTRmzhk_xM7YbaOBrV3_e5s95Or9p6cAm2K7J0_qcTWiQOU2CMmuiSXhWnSfnPJ5larRUjY1gUpseZRk5cIh0oU8SqkubENXfYAiz0s4zVyGN1FP07HtcFD8bG4zkR2Ucow0sfu4nP_vFDRVsOp-dZvIDZlDZSyBEEY10t3Q6nvxcerTveoKuuQXdLV7t4uNq3GYz-b6eLhK2IUh-DebR2E9-FpeSpu5choWPCEaU8zGYMyvwLDzPfSIZfx76ya_LincQKNgOkp9E0raHilaza9b9ICDokBzxmfllAHNaj8DooYUOybFbevggrJNIEhkM0LjYl_uEbVzwXUQ17QcVhyN06AZ0jkyNgGrHJf0UVItxCUilexXDL3U3K8vPfeTjWvoFqvSANW2YBiijDmW6-3gEy2ertwV2NJX_2LLTwEr4B67izThT5dBnGt7FaTiGj9SMfQ4nXVApv_BZWeJ4PKTLeNt6FSc4UJQWG_D9mbm5Upg_LdKMDjEI_ZcFUdHOZ6jx-3C0wAbVK8WUKdaGkthzK54VSrsC3A50fasdVt8_lRhZHfDeairX9bJEF45P-QR2hdN2eI_Bl_RTOPWkwVuv1tYT04hNzRE6es3UAXZN8F1tFxF4ycpg801zIqRLm5WrXGuyYZrsG59x3lAR67xhNbNhDlsNNmD_Ow0xEQ0v45Xy964CjF1KsJOr4o4w-5cZWb3aJ-zYhIDOYtGwxsqlzRkdHMIxmUcGZAL8yJ0d_IW-0s-EctBZUVszspsyXEK1xWH_wri3on6hAy8RNmJ3Mnyo2E8SxL_2VCK-2Nkxn_TVeRChOUhheTQIflaAqTkc3CIRGjh9f7khYuGK1TNV1sZHJ-WjgxB5ThGe6x7og2hhlIAPG4Eg30nb5XI0mfhoaWzH6B5iOEzZHJiGsIWPvPS73UOQj9V7yoQDCgCQdjvyoCe_M_Y7H62lcrX5kp0ClrEsPXJbd6PCxI-RimNp8mY9yZ45s0E0JKKhDJe420FIxZnX58gxYmZZNxm1oriPOogjDkc1ZcZqf_d9G5tImiJqdoT63teJM5NIDw3ZYZ5KSIBz5qLHFcdUiCOLY9MvGH4Q6VCbjgGHE0l-bdmLhaeyAit5iewO-xVuQUscANZFlbu_RxBSO9-f31MDEWy_lka_tDGLEiGotKq2_ZLnywQWA-5iXpTfBhWCjDcHbjO622Ip4kzfbXERuFSfNoTKgk5pCqUY1TRFHLAgCTrtZYWfFaubvOgnX_zk3KsDmRUIn_0J8B4RtqBCAn0NIFFZgVpv_OTOU1CJ5rqZVfgAyodYAQ8kgXFE3vET48-hNwOjgzt5zbJd8C0QnQ8uYE84qCFCiACV0Zg5F7OIOfufBeftZ8uLbp9kbG2KvgI1ug5jPn-oJNvr0uB-cQvDJ51zUDtbLvqPABXTo0_22AQmG1wTCb0BvNKWn5efMWXKEDWzwFNHDFSB_6haYCLP3dJhOx2V8VAov2tvTew0OB62KEwljihcpVEtKpyYdi-xs_Oh7Hndy1U4-nMWZSoqFktk4kQFSVRyEDo6RDVhX3XsJsORru0rABSO5BgYPCINVAijtRsjBgfdODFhOj0FPo1IuyaEdKqjMGLkVJzDXoQBRDQfQc0B3Q-VJXFCew7-dNuev8ITjT3NMShskHAVHlF5s9vKyq7ruPdQcn3rdmjMK5a0pQAk0oEcOTJmzB5C_vDm8o_S4qIiK623E1qvbZiVA9iy0JhUdRMJOye6Ka9kcZmOfSPncd6-OT1zfOfb52eOYAQVUWx2-YkSaM2IMIjCOPedKBnFM9BkV5CzOaM0I3KDQN9YZoQpO2zhmBS70KeFYbm8LfamcRglzlKAsPCjJaxYlPcsxSKT2-6HknNOm3NKtLOECy3V6bCFWsDh9C27_SakS_H3d8pQE3o2CGW2NaFdJ-GqayssCugfwjtbs7Pc20eUMx0P7TkU1B64nSZfBnWJkyLIV_nophthxRgHjLd670qcW29F1An4V0oSLBCB-Nr_iOjimUt3Oc1ACNHANo6k10tdBE9rJOF1dBHS0SYgmIyf8ukAck2dexqn51ZIN4jYuNtcFZUZR6doatWnW6hFTxFOIFhBA0f5KxKg9hxYLCsPO2CcKB9tRNnFEXPCs_fCGRlHmg6tfjRh35jOimtpohC1V1NHm0ALxkJS9odpAu6JOLS1wiiu_IyLT2A8i1Ipl4ojG1eQKNwMflk1kkVFZkZ4J-K87gQMiI51KWkCyf7lxjNhw2yxs4aC5R3a_yH3aoh1kJYWUkt9zUJIzWUh0s1TMplMx4v6QXmJIOSCGpCKElbxADwdhJv9w9IFb2xq7VUsCC-iCuF2SKHoHYa0Js6w6ul6oGJG3wNFOOg9FwWEwFD7MbDkhhJjWobcPY6w3fvdMVtb7vu9f2_6fs3H9dP1ang9xdqnyh0bYfjfuREhBY_nfB9oUe3OTqTiQ2gv9UUAxxYwZI_Z5QKjNIzlCWt2bmOPE8RIaV0U39-22MaVdx1wsCcTKLDIKtsGOB8cPly6TD3SZIaBivcOz_A6zJWNfwcowICMzskP8g6WSgrVYMkUh1kw4Yl4XcVEeahcEXxbiB3jyDM3qOHy96NyRyincmY_6H0Q0XLQbHCcVNrO1LEjXFGMjbML1p2dGeczcIfTCLvYjAqVov_djrez6hu9IpCvOveGSpRSHtdH1-6b8gP25c_4VTZxr8UABy8S6ibwc-PMd8lmEVaBqbgs9QoGCHxOcAMB_HoQ5_NwPOvVpgj4LF-wooKpVrv-Zd4ol196aouBrpq4EzGGMFioLhUcGlDpspWdlGVtyh-w0I4dX6eshQrte6iyOM3soGVjcMGkHNUhapiFI_MKUwkbjtcT-PeYvU1rX9Qvx-sO0lcKLCscddoqFVLUXjEAVipijJXNYkgYEKjRMnQkbacRETEIawTupO1scuxO6GjUg98thQkVsnaglcNNMGr-T56kVAl-146Tjt6T1KK3J_pQ0LE6chOCBW5S7vyiEguRQwqN4EbT-ZEd-vErFHq12q51yUxXJyENgQ4KZ8DYivPuqg9w6-O76gzc-OuzjvOUlzv2nCeuoZcw15su7NuzUdnONkqTlvP4yVJhkbTGKe3pxOI2gRnbzo41KdkAjNVtz1oR5iVY9R1qMoSpl69i9Q0_QlRgqxL6vKYccHOJRRgZBOln1-5dtwLnqscDu2hkaQ52R_y_c0o2ngzoJeP0KhCJFS0PSVrd_3C8_l15WDSoHWQiHgY4Mz0LeqwPRbrCDegF84jVxjIof1wPYkT7pYf_fIaWQrsRZXhpxWuARmpSiSBQaDr1JbMSygyXfyp4z7N7RiApwzJmIaEabmWOpSWrMkYlMs24sF4bnyoVEgIkQnuK9piFyWR5maScc1fnTcKVEaJ4eWq88bgMPhePCKV7eCha-_uEvNH11-qal4syJHAsQgEleM0ttT7zii90YDIprYZ00XfnysdWYXxqxSLN4HVMncVoGRS094qTWOw-ArEHas5QWbWH2vUWJoSZef0ILVaqQwqwc64pAt-xwGYYxGw3O1cbEMSPX5wcHLf7hCifE8bt0GvQaXcP-g6HpoTb5rHMvxTp1BFqQP58PM3QmqrjbXQr43doU6wNLw6TcT4KqZGQrheWT8Ts81O6vxr2D0KzfQ4vqN9EnoX5WTobXfrtk5KouApvOfEt5Dk5h3J7csGgxBaxaQI-fPVxe2Lm6AmheZiXl2N06GIGCRxutPJ7m2xi7Flfn7vsuYk6G419aT9n_hrh4RdYN2aMT7PoiuClz5QiZN1Ee0F_2gdZB7lVdCX_QpzdeRQmof8yKeIWNFFh1q3vYc_wO8Zv2IFPTin47CN9JpQLNd81GqyesQlHpcqCATIikCAXTJyJ-E57vXwC9mzxmfmG7HrJuYT-p6eoAecfDt9hjazFrDkl4Hb-CK_DnGXycBQWn6u6uBbcgj-hmvNZUXCIHqWwBn-g7vcIgvWEqJ6n78_O3rx26PJ0Xr5--_6MXWru7HzvFs_Y5ZSKk2DqEE4-O78i6gquygKWrIv4puKTvaYpODdeE63_RAFq0s_-sOGTCuXW0SmiIgaXv-KNU3l2LIX_pmgIZdmvF5TK_90ZNbZeUHTaRBFhbv3KB3iv-QLV0hmQcSPqcp8dFZYeMONTo7r60iAHL3s6aDTOsBwG2nsnJP8FQlMqU8TELTqCPceDI_sFa36DT7RmQDJj4uvM5XcmQAgG0ydOzWWU4xmnN7WYi2IipuJSXMAlrPoKdDiQ-FpcHTWbXwZFpwWfUMPKwD_Doe5ABdi6cqMyhhUwJMaVmP7Rgdw1WSyzXgoRYEoE7OOKymi84povDhLgfTs7sbrHOJJuJubsOk5m_ksxS2iDYUOfSxZ4w3fYkp0ta__hyRNFkDFGslRqe-Mgzt3kElRXOJ3Gd-yL6_ltgdhVOJ9E0xgMw0AYxjHMS5D86HqexUJwmOmMXU25kH1Td6e4xGi1lbtV8lQYsA5Lq89AI7FEC_v4hiZ5BpBQTra9zJWfXmxhVlaBcMBc4RAcW6TV15FBdUTXBhSmaQfBdB6huz-4HEwAgQTqUZwRruV31AuP1RXcg2MkxjU3j1Z1WYT3x6DS8ZhsTB5gJirwTj-DB0t1Zyjn703nsxXu0s-Zdbps55-uHMKTTxnd2ZJYPO68qpBZS2lguPAsk4lNpyJ7a6-RAtEmUkBhhVL5akNWNVDGBhqh1OhmVJqOb6a5nTxuf66iD0HSsuTM7NDNRloKIuZ27_iVfbSbKchfjRcS__dRUcvfTiD_mVnG93wSI14Iczk4zYfVX6WtyPC_QZ3LoBqiGQNo3XOEqqNWK6NGXaFGjQd6ql404tLIllV3Iw_y-cQWzqYKjCQmGh50UVY5ZKlSMIw4Nqf9cqIAh6zEelECypkLvqWaAFZ8OWSm2puKwVuD3QnquhaLbLHoHLbbJ-z5micjqvBDaNIIH06GQVbqr-JURy2tM07TEpfPtANwdG3lsgwyPIMwvzJU3ACVjtJnvJU4vm1evMVB8W2nZ66SVdaGBqyG9l7GK8UfqANkAtR2RGIcIdFzrjDhFOKPijcztk3gDevBRIFfXb03GhXn5BYcJa0of5bS5QqnAJ5HuI_irShbwdj4hqUL8HpY-p7MLt2MJjaHH1Owd9T9UtCBfepei_KSqfToGqLDkK0WRGq0FwdavkEJzKbjuzJfQvgD8A_mFyszToO2uAgu4XfyZalUx6Yjxu1E56TcUG4D9CCt16UOXcO0C_uKZ3fyFnyYArxXAAHxYgL3_jaYD4Z7NUX_wvMJCSj0Xc02NrKnj13bZderQLIV3-BceWoQGq1olOEd-Jv4I7vPUz5eA0Ij2EMlvwnGr6xH2bzkd8U_VcxoqLTxWkmj0o9C196tFMQlZNIfVdIl4TqUbkRFF4tFfMTGKXGHRXiZ7-bWtEdCHuzZs5AYI1_5SI1afbNLyJjPtfR3D-npWCf6BXT6-4_aWjO2MaErbmLOz2V_2uz4hrMk2mze4Cn74ynr7he96YnJ702NT7AomAymtPdo_a43wHkYiUQKzleQGKk_mrgz1xmlV1chgnRJxgRoe6Kf3ojD0MHmyNitxgdIH1sO_7mie71KiWNVIq-UyOsljnjywYGhzar9Q1eyMYOEHgaqs0TsG3iNemZTrJbGmCpZ0VhHvwK7MhSDanjFLOLY1xyIpN2Gs5LyQ7j3ecRYjubcVTrCmwS7owQGsLHIEAZMspASqBHi1oCrG62qU7Em9DRLwZN6pibYKwFOiST1E592lXIcRKQyDczR3nZ2y3URzo9pOEbgHHt7-Y4IS85PdwgFV0SClDw5LyEwIkCahPGuVCHPOI6YhiUE7_XqlncLrlz6nzERUm4djWWfW3wRGrEWmqunyymlU1e_gcF3kVDzoFkdjQJDdZGQUaFRlFHl3h6Lz5-j_EyjyjID8YiwQ9HFLOPwWwTmb2j59POSpT7lxSefllrUuK2g7tfxqvG89AzR7fe7Cbqx5W7Pi2kZjUNscfQovJy0-45C4HbzaCy3ruRVmt1xWCMH4TxtCKsyrKn3O0EF2kcDgpTJ1dBf6U_2f6k_S6KE4zLkSk7rnw2Zw5j85Jb6BMob8VxrQAUqFoVk26IiYhs3dtqs-Y_q5Ou4I05ugkKCK-v8V5RMUkdo0Qauc3FPQS0OqJbVfLqfaPn59lH84utV_BAQvp4i2AT1vWHBwBX5FQP0WjKIC7o7qZ3c3o8vEcM9oV350lXc_vhb1myY2yPmc6A6FsAwo9UMh0M1qbHEfCodHaBHoY5KT-hlj-gWuP-54EibZewbCEHgPEOfjS2HFl8drKUDCgdKTlwIkaMK5q4r1z2XYQLfscqTEIEdha9uaSCRgxQS8VlQmhlu5EE9D-yq6CA9PBDmGWUyc6iOl5ZEelkyhhmig7UaP9ejHcRnONPAWojEqBatbJL4udrI3Aq9IJymYvy6bLDm1X17wz25Wvx-7FrefGKlOEWQmFBUFc1QT-1bwmeXIBviJ1A8JyT2Vv--DjpiED8T8R9GY2u7oiNMZSR9A9aSerxl7T88Jk8hEuRH1rl6XQngyE7_5xxsAKwwKF_CQ5e2AOAk7bRLqUZySlJJYU4pUUmcxP3-HMTbUJyO34v4henqnzaCbMbESPyOoywQYGGBJxOA7xnXjd9amvdUFiJ-V9og0Iro2DT507szxbaie4aD1jgVl7_xN9qrmfprxD6zJCpy8M8k63lq4YZwQkQ6dZQ2lqPsmJUzLv5AY1g981HQPtE5ff7SN1-WFrqsJRU_DTaGeRyZYGbeJln9SOnU0DSokA5t5io8zlR8nUYjfgqNxuIpEAU-6OoNTKvXgXkGi_4DqJrXZWvitalbvPaMv3pM989WZm7DUTNbzYSfVh_57pug7B3V_5f7RgGa1S8YdsQ_mgAUKzEaRZVZ1bYsAuMmnmM1UqnYjqXHtu1PXWXxxbj5uRtXZtF-Z7kgWLwZvBXSFyCUZlVmD-LSEMiqcHqUh0xEoGZ7pDqzcrUwoUJXaSFZ2JEYC-YCMa-PiYraFJ1ztQ7IzcH0Zo0d5lwaB3BECcbfK7pVTzST4qGW49rU1XlnijtntoUJMrWzE1WU-6eEpao6IrEW8WsWyK47E5XInqq_4LfYqel3_C72im7WbIqw1gHRaCTMN8cag7EZtwg2h4sFBxVw8Oyw7lTZH1rLiL0XExZY4SGk3BRwL8e0YJtEAwRAUh6JjqI3WfFiAL1uKxFFu8wuxEOQbbt05PfYPm5acwvAn6ErhL_G_bndYblPu5Y-9e2nS7PVRfxDRdj1bTDgPo-U539HKFSfgJDmgSi4B2ZO5MZvBfjR8QsGeh2575Vq5UJuvoaqd7Z61JcQMKD6JUT3prlulOPOa6URqgb8ZGfniUKNI4C0_npYSlXed6vFTADFcq88qbIZMx3vG_JBhSO3LMPEfcK-L3RFQNJpvviiU_xa6EcG62ZyyZEdOqtF25G_hIceKL2tKhMRmQg78a_XQE_3VQAurPqYxpEcfu1jjUCM6_2-dwA1ROUrPcAQNn6_AU9d1kJuZStIBeJfnuc8JRUsdmM3zFiaTJvAXQQR6q4OIFRacRAEn_aKF7ApHdFMQZsZ66kkNBCAEfCca32FTHCkVUKeBGxAwdvM3rm1T5p0vIFlPgm0IFNt6pI1yzJqg_X5TH1Rl9myCzKiDGzrS9_WiTem7QhrriTjzcLYcXoVRgmw4HrnULEyvMYs4A0mNTrlmlLQN6iF-MUH6sZ4lmn1j8-uiTwE5R7cPZBgPGlNoiwvEGASgjidjJ9rzoVYl5Dit-GF5AIbt1q50_X6NJvXrFyR_VWfSJbUDxw189DYlONodgV9TZrFkEhZqGfKjFMUHIXJZFXY0KsZMxPV76bBE681K644MCceOD68HJaMAQLe4cChHKKMZSX8dMKWE6JBw9TyYcRIoQUObmmTECHO9F4ykoxGVN4ZwVM-PQi_ow9cp6zAUTf9E7o-xxEuBQT-Nc_P0hndi2vtIbKbinK79-kzQjbtQr9e3BpDRVM9m7q6FbBWrwdHaK3u8ltgJlMzLTHObPy8nI1Yn0oCJ5PS8NJQKh7vBiy0rmBqvpuCx4nRxtACYlbyy_F6IViUfY2-sUiZoD6uNa-gB2sgT9yp6gwoR3Bc3ukywZwP29QcHct-m_PRsee8EHw8Ej7nU1gpGVmzKtd0kz5hy80EQUHtR2wdQGtSu2gIMzdLVLtL3CdemXAvl_2JMvGdV8-okuf_QRWUkonkDQt6Zd-Nbzl-W7NJtJGPFxUhsLS6mKZTbR_HVd8GDuypdmnj3oQZQdOJ63n6EILJyuQEO5h2hiXGFVxGsN64G8hm4LAVtTPs2bRhyQ3Xgh5X5wG7v63sN7QGmRb9iHmdN-fDEOpXFRKNiCvW6gBE7GsAG6cXEQEDk-yXJZZ-WSSdFc5SBSo1klFgMQ1CKYoZI6zrEdZqAkQOsoZSameXlLvizWksyeBXFURJzVMZR4VJQTagySVTX2_Oqb_XCJ-idaYrXoZWoolmGoPnPnmDeFy1uGfOZcGRID0dvRnUJsG9NcNuaoZRbng2qhp0H7ZFFk6UxEdLdjhQ0wnIgexEEtCQ7Pr6tKV06d_B_txKqwgXt-HpN6kJXIk7cS5uxBdx2gP-ylL8NTW9kr5bRezdWijOKgWStcrQVXklCnbVP8HaJyWVhHG1CP0AcBgrmolpGdlxUwUKJ6D7IORpi6tquDBjG1OqYrnGOmfWn_kz5QRqCL2rGAdiUB7hdiXcVg58ho3ymbVBP_SfisOS_eR6w140OBgGmYgGh8OgoJ8jurSW4i4YIFuVEefgUsBI7iYoq_oS7HbEaamZ9gZe7-4NcVkE66Eew2BDlMfTYJC4iH86ZdtPesxU9Ef1cp4WRXplshAnUyC83FlwOugOd09xD5zScwfP-0PxMjjby3RYzMWiTdjTKb2z4hheb4NJP5748QjytVv6-EF4crZY4OnkJdaH04qTU532hIU4U1rHlzs7N7R6Lxknm0B7bhJMkeY9RgDDDfHOdukQoMpm81KcQ4M4XyykmzOV_pcm0fRudL9CENe3Y_ETHQ2nkgam798krStfLXVwVgXVygwHYly_-NNlNlcVpwPeqfTA-Mao7bhL1gv7EQQ0lEDUvVkhuWE-UXJl3TfBuQtTA5qFXIUT_U-XVqYvrfp9z_YVmulpz8KblZ4pfkLuz3Z25rTH_BktKzbNVTQex5JeO_yqthm9dvG6JKArE_9CqX2NBFjn_ptWyeXb2RnB2KKatDdqoRgexQXrSdBp0juRtssXb_4lMO-9gk4O6tZWYthk83Mco5CtSFlNf7Ss-_9SccLeyYvnt1PXGXz6NJ3_uMTf18th7e1f_-t__j_DBwt30Gr0h02P7tuLmWMMS9sipX-zAAyVRoc6EhNOIyFJh6PfzrDv5js7zeaMsz2f9iv0GJqslGLklkcnlTeUTgk7CL2e-rKn7F43d5RjSlYTyv5dB4O2YB3Yh4eiM7SCrwfRgo7cGCwI5duMuj1OS96lWxkDuEbgFk_Rk4mS6pn5G605QWixL1txCUWDi6Dduzi5NqLXi2bTux5cDHd36QoY00Mw1yqSZWDUkbhJs3H-VFIL0p8Is_wIzTvZ6-4fPziSB0T2XEI20SPg0bjEhUKDAHtsROTk8uYyiiFut4qH2G9SqE5Y1RFh4yOB3cKN-qGAgAUqoLS3RRxxIOFwb9bstNsP0j0Yh1S6E9ruiOo2YwUEy6UD5jmDjazapI-DDq3Gg1AhHn-UV_VZJuWHMP4ioRvxOh3LF1FMfWudfvfmw-ez57-ceWKbFuqzDuKiZn3GBu90h_U-n4xLWPAq-KOV0KBRDTxDq8ZeiffihfhLfCPemuvwvbl_3wevqkfHwrf3RkWi_95XDW83g7e97ceGZ-G-CMaDzyWe80LHDaZG48Hnf3b7cHbwPAHTmh7YrYUzdF8JfKSL7m4333ric7P5zy71neHJCwM6_loqNZKNt-E3gbrhPp_s96_ctnix-434i_6N4XbELBSdtiu3IxhCHQy5zBhSX5svrtxu5dP9ShbkwsvbQN2QJ-3-rnrycQNy0yoNPW7T3aevxAcWIE1oPBfBHY41K0I8EU-aZ96DO_SPE27FbfPU23tJW4RlFLOStRzo-7vaBPzyCvjqBZJX3uOPw37o20u9UigKJogvFe8WBJ-gntJLWwams0Mo3EgR-6rcH7L3VPplXm6zieLVy02kLYDvAP5_dSxNEXt77Ct4VzWX8sxRx8pW9uA7WH_qsbAmAlocuPMoL5Hs5EJbC0AfVpyC-oD6I03ItUWDT11w-bNWqtBxMHFV7CBg0AbM3_lKi0xVFjM_fx1NXTeNMDxmjdn6rH5RYfgbVrBO1wITDrDKSRxpmXrD4pmI8IX-Wo1PvyKXEcnGxp7eK6zhD3QvmFG8gk9XNLSQXTL4KlUhQw9hQ0OsSZSogYlRmBWVJlp431gnMgRjSNXiGmXaUJ5zlr4zm0L3Rs1c0lJv7BgVRDHHEzVyJkNKz6tkIsiycgZz5nfPWJEc9bO7mBWiFSpHbTDy3YTVkzIiwvf5nfCnFVvYpPQ-6mr_I4Z4s9wNdodxquNjPyFC7_cBVG-Hv5d-YmOtyUVDgfzWOguOOPiMui9ew3YS8DqLuFBPmZ2l8KqnM4WzcLyeelF8UxsYAOKt2YkxMerNjKLTdZAOZqyz5MBrw7VKzQNnF0yo6_5uxy-dYallI4T6Alp3_RwCkX3l3Ds_aXuRjXubW72ytpZ4mTxcxVH-OnztAkfd-23gfBrMh3sqgvp1OfIRwgysdLjI7ubXQUVrbtTk3usQYcsR8_ZpzZftk4BQo2yQw7XvdYAHtrSMxDXANj0VVRGUO6ez6RNazwfTwgvGqHmaJ3TT4NLU8t7T6DwmwNRzPjx9h2mKjdWCtQgNKY36SGVxz8K_i_av8Yzwj7EKQjUB1wQB1dlxZisfhXQijWqe0AnlzoWvW96MUlquRYUfucq1qGpqF-yyooDp1wCqL7TvhZEL0Xhm9BbOblUGtnDN6TeYAVobsXjiJpqDwZAzPmcrBs0GgPOSgF11E93lvH7yszVT0UqN1yr8t5atYHcZzyblMHuNpKVMSMxcXu_sXFv0pYG9xEd67VQ5oTD2K6BxqG_Md9o_cVdoemMKCKcH_kzdV8ykvCGyB8RmCZlpwJkNvV7yVFUU85KlWgJouj2gM5GwL0hIyiG5VzrcMztTqeKfGDsCFimX0hplisOL8d-hNdUHSza-oymTx-p-nNfZL_d_qQwLlta6IVLOR-q9UrTdf6NXVri8sVd_68ulIWrhKiUNNHZ8TfQJ7YUG7boYsp8fib4nomIMSVEB-xLDsC0bUwLe0kGouTbqFxs3ODUorFqbBh0-7JCKtZ7M_MjrzzXxHuJs1sj3pXLwio82STagY2Cc4EI4Rd10Xr761p4YZa2RwbPUXCqg49P-ZI-mS2jM-iymATVhDmTKalWjNb4BJU6WDKNZpzKGPbOaw8sgpKm7ZKeoYLrCdb-V4-g0odjlE8MhvzMGwOfMWL9kgQ9z16luVVWwUs3OzqWVhVXzTBrycxlmo8tqrkrR6i7OPzAzlyw7s0CDflyVVOt4CB8A7KHcApKKcWKYjC7T7HMVcKokX1WF6ZpauP9FnImbgD5ekfpxVdU6WCYx6qvp8M-FkVoQyWpEfCvzCI5HPMGls6n9Xg08w9McC476ZkwnQUerk5iUxYIuiyKLf4DXpUQ5e9XPYayeCDG4NJ5WHJx3zRxklrwbv3RvSs64uGmhf2CdSvcGrrxe1IV8Qo0V9PVNS95GRXBjZTWiXhcMwr8Eequ450Eycb_QsasVYn6Task9CyDSXfGCqCUYrtOi28rxEHMp14FixDER2TS8DuGYU9ou8pmau1c0dzRLquEguWg6gdM8a6qIHe_fvXxmwDZ1Z6PPQOOsUG9C5VuKJSqBdnAFfRbr4apU7MmqWEpW8R9YcrAz5UGIpofqOsMevYF3Zk-LeoqaH1R6mk2dTe5ja05RSykq1Db0uL8wZ0wFKqpe4JtMthoNDZXoavavmRsGnZagDLrBDPadHUYWAbqYqvFYjW1FdU0YzB2XmYQz5P5c6awRQefr6AvGReSqtw9YHdYu2UITFgRdWX0Hbw5rpzeuW1Ehr1hTHw-BW3P8r6NiKNUcObBe4jtDX37rstN2jpey6hHLvb8jmrqCkgmhrHRY6f75hp567mixgPgS8GZkhFzo6Wc1FTQ7ON6K12gkXBZ5-KwxMw2BlDOQMTUCpfZUFNbBXfEW9pNlUK8-47MxnZw4sIBupdrPkRK0qw6oK98niiUeqhelOT5b_h2JZqyZw7qWDOziFPu20Yb_QlEsWWe0V1gBM1QueTOZyftGZ-zsFO5aIqvcM36rffyu4rYwaAmK95CS9uJnSgJsLnntyLdahh2DnClXgrTckBIwdJd1qappzC2VTBLUAFx9fuu7E64OAcZv99ziTHOoWNCyuyZ6gZ9gcedPWneVskoAs7suk0HpZS9p3T0OitYdY15ESzYyIhBjaP7ojGa3zdHaOBmmN0zSOHiDBlkjU96odxWr3SHip3V4QpQIg6mVvPLzanK1FpmMuYpHj1br4JyVCpAGsX4SGKrKbkW7ivzLLgqs_XtcsQvkkwOy3gplccjV4vtMptUpdRsP0Nqp_QIHS66GN4E2p1WAQ7obz6OGSPqTJZ2hAoeZT7dULrrEhu-Wmi9wyA3autNsLDM-Y1mLn5clyebpQUG9ZE3IrIW-INaSNSP5AJpMxRtAqp9d_n5XuSRjpVuoMANK9WUOMzKH8IvRl_P0lg0PGGvAmc6ZUrKeCFQYoNXUUgSgtURaf9Dt4hIE31hvH4FMKFGO-06RzeB1bxIS0HKMc5oyNouymSRY9gcOYJv9olvov4SCbcX7Ri6iIGMzDCCVUWlYTnMQ8RwodwdEZTLV8JmjX-WM0RPN6pZ-8auzqpcI1TqC1Q1sdTylCatte4wmRdDFwetiEbWisVXXqmidt0Wppt4Wk0jGY-WvG57galoiyd-BqYmGqeBQrqLwrC5D89f2ajGM4HksMPaK1sOOsaZtNIoeb2oD-IhekDM3JrwL8OWkjagqfJ1Ljl6ifDSs-YiG_1FELaK7QifhgND-rIBUto5w2fpWoOLdyI-qii3QqSlvK0AH4xxCrVUM8o2-zcBh3he5AuhuVLUgBa-6eEelFB-973Lhrsg9FRMnJTDdPQmQyma7JvzhOOBAr5QM784rVVYq9DyxQU80YbIvrix1doEbZTcbHLCNBjrRYZ0h8ZCuFSQFA1pA2oZtocqKDpeUbg7tqAy4CE3BBv4Fe9UQp89_fP7sTECq8-Td8yeOV0PUoJQR9WRL0U3OJUFtmSgH1nwiXZjzMN1mafdraDbk4NirTeoNWPXEj-iXPdNL3uFjdSbgUeVcxn720aBkVn31GmFXkJmXap5RwF5pS-c1FXcaqJm7svfbp_yB23rQ9-j304M-_d2G-tt2x_HuP1J8XO0YNCSjfjs6fqYjBvEPQ595tEq5LGEbcPh6KEc7iJTjiiASOXuc11HfCaCtTh7MsDUZHBJaaTgeE0frDimVZfMEbT6n01b_g3Fqe_cAf47Nq_mfI_YG7c7xkEYs2Zfig6Dj_QYoy146Uoiw3jGZo-Lwsanmih_QDptw7XQOHz-WewdeLUgm0BuMF7i-gbtL-MAS-XApOCTgoIBpehm3g_HZDK47ozWhACYJSt4FvMBEOzsD8LLgEImq0N4C4Uuy5g6SsFPWFmLNoIFOQmy862DXndF_QXzLKmljes_pv0AdDdglBjGWUbj8EySQ3cCFvKWlYlrIOH6DyxS8mPItSAeHw2YT9glIw3lmo4QsU7pZuVWhpDaq6V5_5Lc9RNgzXwKVSRU8gXqV3jqleT_8CeXFC6QGzMLgfQIVPr0XoD4FzmFcUU9oBtf0bnd0MxiLYiW7qGer2WUfDVAWaENjg_3kFTDB1BE2oDCnnqAXR4SQIgSHpaMjRd-xw0qjbgb_KMyeLYStpbzG7XoIvVB-ylG9rv8O_n69AX_nU2gV67RhYg3hKQLrOvg-64L7DRzZWWpm3CmKJKi7IWZHfDYAPSGkys6yYNc_WYeAehZkXThF7Q-gaTVkr3oxAX8Ce-1WnKZfqKNrrkRLd3rsbFEXKm1EtZff-t1fIcd09_UDjA7EXLndoE6seGcc_IdJWA4hOxggNgusUmNQO0TyJMbLn9-peKzK_S77kSTEIxrl_oG4CrMvkiWrx_aSJhTW9Gxu2DgKNfHn3PYzGnEk_7-6rqanQSCI3v0X5bQoUrFqNUh6MOFuvKhNTTAhEbPBpNy0_HfnvdldPqqnZh8LzX4Nw3y8ef9CyQLR4h15f5sEnqCa8Qrs5YkO9J4HfW5htm_57jRejiyuImxmrImecBXR2MHmszTb6vx7dwbtXPTMA7XMWAQqi_XakYmGamihdtv2UAQ2oT3KVm4sCktGUN7dcmf37SaTd01Y2hYRof1RIKvftg2105CsZNd0CzJC0c0eU_fxVYtqJw322XCJOfs4hlNi4Fmwe100qY_4hIVES_7FCMfVHUYZqXVlq9EfT1dNmSkq5oYOT7YoGSDPxC9rMQwBpKFPlWJ9S38B3bN61dMEp1z_sx7JfDyyDz6qroScMcqAoXcowX2NSYFa1dHdxsC4hRzLjhlIxo9Ra77KOMfFgoL7qxdNqhzqdDlHi3JzpEjyhbSK1EAo-wFnENznnoly8Qd1MEI9Rc49F_vSOPNSYl_Y8lHJQF6JTFg0AD8SdlQZAC4IeF8ikIxIyIQGdAlIXj4R2QKAXLETDbSJvWHD8zkAuSain5nSXLEJRyFat9rSe-_w7oh8EupoDhK71iE6WRLn_5ITRCksnulnlypR9s-INeCIUYDCmB53Y59oAJItmp_8AjjhBlYS7AAA",
        br: "GxHsUdQO1usHMSI5qaUH6KGAGyKCC-h7kbFavMvpZz17a9cB9LeuLmeLii5R8wWqV7Q6dU5sy0R5Xi_WIARnYNvIn-SkD09ftvR0FW0_8ssqycuxcFletywro0cY1GASWRCpyQweKYfbIf7372_-12_tcDN7mUUEa9UGVs-gLeLrWSVzrjdIePgIGkSolyRgpqlfvqp9fQNR1g-BClZWmmwcr_SvlE66cKy1zRkGyqwgX-FO_L4vZ_3XryuH9zrTC66SsGfl-DH0LPSyYfeiAkOqdCWiCSJ1bkYVqOvwIP7TqoVljhpGk1GK7uKyflZ2WpyGA7si9xbczT5RnNI3U82q1hXnoON5gEUgIMn-1JQOuVXtwNd0YginoJL73uSqy7Qmlw9ChiGs5_emaqdryG0jVwCkGLkMtp1aOxlpMPllY4MM_YYjbWG8_79v6r_tvYNAvkzp_1z9bLsMsSMgx9QVuHvvc7Zwzg3CPXdmFibhvxmEpwFAfs4A5BNA6p1771DrzpD2GoC0PQT114KoH6BQgJID9ZwpivrvkfrPIYSidKvgGEpXpYvKTeeidNVYl4y8-hQsOjtDAM_h8mWmLYUT42DWNNn-UP2e2yRNnY77hm2mkAS26fn9MK2ep2Mnk_SxGyNAIHEWxa8S7vn_A0gtHuE0jVl97_ebFOqU9hlIOo1KYWblxA0HbrnnHXd84IFrPvKel_zIC57xid_xe_4iAikoflTooQegxcNH_eEqwwhI-wB0NSBQ-k8RSLrOGS0eMgBi1qWVWds6k83adpbhJCbYs3Tqu1nqMgBzgJlkDjGTRHFoLy6k2CcrTa5vJz36RfIMQPPVRP20PNiZyf1cprzb0KuMahf3V7GUxrNqYlYCHMqOLxHh1KKRfsXPDxwfH7vgpZnCa9fmVI_9xg9S8fNN4M9aGWuR1-AXvi9Tp3F4kr3hvtsL1-gGoWhkQtj8O-5OLY-Pg4ZD-9MXBPzm8UfUJHrTi_Osyjospc9weW_LiC5_9YY3Ux9rMWbbhDfjEeYIWGENwdJC_RtOnmABVUuZfi0oqgU0DmZXuO_oQ60ZjedypI3AvjZ0KpWuLNI-XJogI-JAKvwZaFwFENXYVTe99FeFg0yRIIldoypnB0hOWC-lF2mZsbSjUD0pqbVhR-bjFFIRKkyIcSgxXK3g5Wah3-kEaFgHTMJLVEmFL3c-CEPFhJoA8w_lK6DmsP0T376ACIXgJSlL5ZZD0FBYFdBTCtes1dyS0kq_rW5caVPDH7Xbk-1vW7f3O1Ud3P_jK_Yj84YJcfrQ79bxLHIgG3h22PgqMfbfivbYUt5jv06HXpE6wqXFaWpS9KGbOU7TgEpAxkRPvxi51Bz0Gq-ISXthsqsrme8CTHkVMzeLTST0VFLSXM1o-6CHy8mhjesuNE6Jvw7E1JFS4-oT3i0ZAaEbjKX5X_FoplyuQ6-k29beLwDxAfWyyQkxEFgs0-8_Fb8itK54xUtROH2jRxupk_r19ZCe0iiTJXnIToAA8-IHrtDIdLmu-KuDbHtpKnqxYIwB99t-iRsNSF4AusRYLD--PT4-ho8eXswVSQLwfQ-XpjZ8CpLcG7UUl-Xruyx9frz4aXCGK5hw05VLAGmuPyl-azV86PAYU_5TQ-zLD00rfXZaeaBwc3Ehh3CC_ZilOUkwrk_j8cz0TQfkFOJEsO_427xXnG46dwnXu5gyRP0iD2Y94duq8UClbGIVVNkT9pMrOpEBuVRyP7C_BVyVeHQ0VUGmSoGT7gNxn4EhQUuJHSruuvOP-yV4sPsW313hWkC4B2C0uSwgUK7ItXOu375FNCpa3KuL5kvsqC5Oyj_LsNgRIK5lopRr7AbPItq0jNMkcqC9tjx17bmog7CrTd1piHFTmItGbIsP0u4zIQ28j_8B-1IGXP_viExqRg9jYCYcxrFtMoN4lEOguqde_vS3reT3XQhI9FCUtn1ZQFeEWY1xDDuGSEXSNGeRWDXeiyQEtnwcVTIiMT8q0Y52nJrej4XeP5cCSSlSnPbo1uNt0eO2wUEVGQUju4KoXl0E2x-iYCzXVAPwAspiICrLKWkNzRZw2Zy-8VyqjIowglmpLs5EnjY8r_Qr1YUJ4-V-kBBn5lPZ2gVeduaiLU_zkO9XCpjCslgWa1vRlJKjByWFDDGAkjxRnbQhgnivZDZHVvuOmCSIO2lsEoJUX_hhCRF9SEldD-u_gSE-eQBqhIlobV_aRJ-jKF0by2Uua7YzrW3mNe4F38PVuKVJKsyUdXEl3vCQhTctICePC2tCHF_LQuIqlbvH9VLLVGNzsz-MhCoZKS--VyhFnKFu9MAZR--eWJXijyKg9uwFlvcgdpy6lRDJIOdXqtPJhszDe1SStA6wl7AD2CaVriEaIAKyBwNkKQ6T8HRknFqYT-A2dkO1KrF6p9jTFOrFcs8QWZwDons0Lf6fQWGWUyLqTxKBr1szQVXUJZFa-ZK5sksfYg0T6VupvxUtoRe4wkBGL-AKqbPkZ9lpNqOjJLjq0jfYgdYrR0r-wErs045U5CQQ1_3-RcnT6N-zFyIRP66D3wynw9shpQCHF1UFVYSPSdFx7CnuEhoYYItf8txUdI1H3qHFSwhshzR02nNadRCtYJcBCQ0rElw5wMKIMLwXSedmJolbxMMiqCFfp1onoAjzSDpxLwErq3-GM9xEMdrvI1PBqgL9ALrGlqh3NmzUVpD4BoebJg9cH5p2Ane4oCLXrne2CVxN7HhwJ_s6QIqaVFMjB-PyP99kBIaE6h7kii-ZagLEYIGDHiDZx4Y_Q0TdyV0XMlOr8j5iE2pNTMOPGO2Hbrprlp50XBCcwg4ZhQKwpJRWyuLUPMJ8wJ6ABzox9jjyzvoSxxHPjjbFuketEYxxpVdMIlsP6XWtsYgxWLLdyKLxkuNvVi2F20oA1D4kJSqw27mInWcQbydbykdZoGlOWJVGt6ov6JI32FH5f5mlySuKmaSpbozBFZksLJOlEdvKynMpfTUF9NZOXQq5Dpu2eKXkGnMxPISf1jGwn2njQyBvaM9uzeRugPi4glQA5Ymrie66F8dS_DBhtRmsNdCBYy5kGanB42D2VAGxlatH2NOr6qGfe0pGs3kiXLX0hL4gCUMhFQuTzeIaiUT3vAKZTbrZZlSzVC0p0HtkX-43VXXL0CLVmpBgYjYyC3tg6-xG-SyIITzQhvijSGybTBgi6mqJMHfu0qE6y_cbMBUwZjJl1IveIuzBBg0pC2_ZX9CBpOJyT-xJ9_QzWAWTIlSxXAE2WpRVdN7LSGXpdBBmuxbGjLQnrYiTSirwP-P01RccWzeT1nr0xvdu7J1GlGiKKQ3wofPxf3dL5PMaC16wK2WQMJtRjMMbm7GX5AxJD45WCj8r62UqlRM2iEIoHxNdARqGoipfgw2vlal31Jwn5U3XYvQQkJbFb_XDLvTeFHZ5hV7KGRo2LZ6Eo0RsYyaOjDFS3yrRqfYG8fSQHidbk312q6PtWNebUP5W6OM2EbLD2jqm2hopUEH0YUZEDlUqTj1GTk4Qw50ia39Y79F7aU7aDytZxAwkvbO61HIasbhrjOAH60gCWkvcs86ijwTiEEiJX7ZstSorGs5W4Yc1A6Cl3qfj1cEInXtaQAWs1_uObsKBKx2QD0qhaXohS-MEM6TUOJXq5StEdxxcVdvdBYw9aFsCy0sO5Kj52SlLp7WSXVlpGSbqacgXgMBJTRCudcZ0A0Djq3jXoLs4UGBmtsIDiLdNyNfKZsy_miQfnVE6S3U0I_ytX0FkedRLQQwgSTiZbEnnPtMfavBIQJlTV8a6v0GWjsjUITPSX3DRZ7pvufwuAQyY2aD63KPSBwgUH2tloqK3Qk3QlxI9CC8TQ28peIzZsmlBiBDCooOAiX9HL07dBg5BJoRmOGc0OtTFUK603yZXpPgydeH7KV-coCaRYMfxfUiC7vt1KqtqCcQX8P8LounmfzbFBTeG-byEMKklQpkDgsrBCBXMpBrriVbgNEPnRgKl4Gi6GM8KeT2dkPAM5wslVerJeJ9ePqeSBqygrMWWJeDiPFV5sgXhiOH-eEy3VssGTiKCSFVE7sLvnpYt3IhSb4tPQpH4qyE5SF9oBrjVaMn9Z5IhlTyqeViaGwPaRXsKoMAJFkCf8irfLx6i9Ww4e5OgDq2b6O_GkkWiZESblnZ9abspoaonIy6SdOlfqYDxr-aZzpvbEN6KAf4FxXiSd_Y-4Oa_Y_PUPbbHTF-tYdj4ZpOR3oXT-G-iPoJk-RdHj-w8yctXai-Sh_9q2CF2lmSznQuNCXfh7B_mL-eUOX2z5I9z30wfULiuJGWoZVKE6jEmY39hbxwmwd1bijblrUTrvW0N0_OwbZhdKKmA0SYLValNcFQ7vmfkgzWpSkzwr7Ymq93WSmaneypx6qAbvCMSl8IPKhRwy-HokO44FVDM-PsipPJglmLNHGaMJofI-RdpBuYUk3nLnMMK5mC7OXB1BhUAcqQI1Kfn60FtOnHWEfe_bKM1iUeGFHI44J0QhwkT6ZKPZQefbnZZok9GkA-R7yC4uQoA1KAmrUiDGmjBd1xEIh7oW2gJp1RJuPxBDNgaY6gcTCc1cT0mWR-vmHXyTWjP4f6lZmJxOAR8sE_owTkRjRGV83ZI_7CWYoLW4J14juaKhns5WPCn3Qkztv5oXN44hsXqzTacZGXa1fwVAzVvxQSSt2KKyFtEAtABIM2JCnHkqQoRdKtDCqwwlZExsWiBsFLW4Sl5KPtBrrmk81EQPjaj4dF2Lq0S5l5BWDhllaDqWkT6IPhP9ASR5Gn_bgAhpf4-SWKfbuhJ2jp1Q0kljkgo42Z1bZi-JID_d4kA3cnSpHnqpvYhInAmXbFsxmLnLCm52wcaej8EiF_s9q-cIwZ5gT_Fownl022QiyYgon5DhbveBJsUKKV592UlM-mDIq3jpoi_4axeSjOUxdwjsyV7YfYpjFB6bJICGoXuA8uIMNiULnA4Els0CSAWbY4q4AbQAExAAF4NVKJ-Wy2Voqb4HhkZbSf9bNoCXEzKO2GkPF0-NIV13gSDvvAexuFaFyH9GkEw60GA4qaWgGkxUWTdlm8Y8_xlkbqfTTqDA5fCkHmyGwVNJLBxtWAPs1shSEDIyAw0j7j6Kh_bhq2AYMOdj3bni4-1-P8dYkBWYjpNY3Ro9BSjp0coOHgeI2EdiZ5BDWWJtUM0NCceFo1DT24FkceUTaKD_k-tk90DABoztY9AXgvj_lYshJphWY2kCO0dgMRLTLYRA5H7Sk0oVj64goNKJZV7Y5XFFacvLBlwDTfQoKvX5vwsfYyn6EwwQqKgs1S2QKBxU-rzav8ztQ1t0kVrM8Dtfo0cfF4j4Vds0FiZkxOjHhQNWxpQdb5s7xN4DOkNY14Fir5gFZGMc2GBGpso9-wlHgIMVap742zrAHoKVHfFxLX9jg--qWtDI82zgO5awWWnvZ22tHsnscR_U3I9mZOg405N4gqBfei2OCsVXY4JOGrY0vKfHEEPBjYM-peYASFrnyDYeTpEHwzBdyDYQRu30VVuJT5IfOQ4QkuaopvaCxMPHNDjd3hACq44sSqP0BXHIfIh1506ot8T9ADYgZgeWQt6F--BncDeq80ikHxaVqUDh1AmrpI9--2ZguWaL0xMLwL2dOgcTV7OCeL9bwMBrnewhJ1TWRos4NHA_cRiNI9oc5SICPZR5H5awtVyWnnHKj4kMuZAhxJX3b_QwGpVKaVeaWm6SJI1M-pjUEg3A6YNGeLNhnAVR7SyDUQEApvPI3ZZCt_lmS-t_kcJKJcNWroqrkYpwMLr5mXA1RfLhITYR3HveoAokXD_fPX2vUc7nM75ClsM5vxZWN6xQGhYZSlUs4kMpdunoz0QEc5jT_vKHwrUlvpPhkp4VSe7lwpYmT2yPRSBFh_W-TlUXEJzTJe_OgthjW_rKKab8nUs3INeHTtcWFEuCd-FXEKkZXcBu_rElAFN-1kfbc2H9OiyhmEMhhusM5aW7GRXaDJZbm4gh7Wj2lRlJb8EE54wRfrVJ0KvHbFO-KbWXdT2C5eigqcju8DvxAoFpUUNP6qyiAs1AAsLx7LICZ_JlphvZgTBJMvshtW7RtEqsNBID581-gHObUwFJzCEW6kFbQLoAq58itmGYwXPwayRKAGRDDiG9jcrQHDbTJJlvrHqXSDJM3BncVS1-H7nodbVJBrNBBwILXIuFkPBFwLZAhiPV36-2J91ZYV5uKskuFh7njxXQn5f8QgdddaODO7Br7U2iOYsdFXI5pYUQQD7mV1yMgsGEnjkY4cuDdDvWTrGu087xeYOoJDQCDpOO0lsztF7rL7Am1jHaZ6Ne7tVG9GDlwSKFS4YcdNeU2QL7r69xIftP79Qf_VPuHxzsYRIHVcrORu6hury5-3_qReqq48F6b0E-o-hS7rtL9xdjCV8dXGib18v2_VidnYVTRO0tf8Wr3aG0OaF7Oqj5uJifKkB4wkutT_hWLQyW92R9ATMFY7M4NS-8tc_LGMC_n0ev7NzLDpz50rclIC-8LLTY-Ulq1eEV64eZ14EO6Xel89uH4_cT3rJ6uJACVXjAy5_3Uzk6ZecdB-yi_nJhoSj-FdtKHdjRMZ834QojiIPLVcSVT218sHCXW8riBLJrCNT9579F2CYe9kNyF9wqJ34PT9V6VoISi50OQq5kg7QE-SD3-LD9vPyZdM1dhlC_Y5rQPdY0vEWy2yUEElP9VFRGT0wVstShhwMD20MdTqJ6l9ip9J-mn3cX1vRYqmE0LA6U9COCE_q2quLd1bzEITuuNh7QdnFmLi7x1h8-GPLx4oFkb5RYQWzws2skR3ZsxGVZGaA9C8uGhPxQyVQ-61ucwSsywPnn7J5U9N0JYDZvoU6uO4oDqZ03Yk3WQ1w48mvst7hF59e4YDA7lrGWD8CqzKq3pqQN2yNHGAL8i_sctZ1y5exQVqvLo7n8-J6x3DRzciLPPLL7v_o7R15yOB8ktIKaC5M-UDSCcQmOZWxmTAqILeW6ytR2rUxjJFHxwz_Hxoy7GaB4JFyz9dn2eFSJe0d5a3zXutUuHNT1v6pswPcQ7SsWA8r_wkneARwwa_klht7kQoJNUWBntm0x62Wb-9iHjUwzrhWGy7Zk5Wy2x8xjTU9APryQ9n4U69WOH7VBGgaK6M8qc60nTp633306xLvllDt3uLDefPvYnfq8PorWI8mVmDkjeT4V0C0kePrSzWwYBbzBXxPnnhj3f0GdsvwBbqG45QY4tusvBTKqq185zpQAUzdjUDoObOIhUh27kfWEq-dWY2u99tO7JFb4p5LLzS2qnIpQJGz8ShJG_EbrnT96eSGcyZCRkrmnlpS4hreTOXBzO_XyWQbZc24D9hCNYctQtcVWuR6qTEri8KmiNVLR5YUttgaTMh6avLeyq0FVij0BsPlhS0F6C-1brd-6nDIsx3dnTBKrJrKBrbhhtMJHaXO7SoNIBlV_VQMS2VdFzRp-Yvi4rQD6qgiTybVBXG5mqkb2efCZP_761ZAGjR_w9YmKWtO8VxVdWnTM-t5NHjzRXdurcxy8Lwg2c-7vS25FylBq__r4Ybi8wePb73k3WKZhwV5bcqGGTqGZgwqDqwFU_VsNFeFNRiTEuRzeIaFUJhka8OOaT8jacxWzupzMXuh5Wc3k254UPbGY7tyNaDvfuM2su3Lf_sZpFwPz0w_HP5KACLeKuVzX4jpmrvtm-lALVIqw54bWThnC3JjTkQVCK83Ylot9OlIC78bwtX0L8vkupgOgqpEA6v3SabcyEXfW1RgqHjMQCCgnMCmMPOwDL3Sw39hJkrLkka76-qS92rL0RedcgGQEhZ3N8vQlxx5_Rn3X7nQmjE8V-ydJzLk6XWslf-7KiBMf99tadbZ8OFSJ1k6R4S2B308RzIpVb0a3n7Ve93-Y3kqKByZSSImHhVcnOcJPJeeefliC_kdFLpLg5wV8fhgYJA6fgXgClL5tNZXYqNySLo_rNE2epiRdd4nhHbL2ocrILed4lGelSz8o7m8ww8SLgePUlv_ym2f0gW90Zs4JwdMDkJMinTODliaopB-nKKgAwbox_QBAsDhy5EE8NRCTgOLSEv5oiZno7PGFeN2hh46z1M5-fpfjwk9c2KbAnvkpHmmzBa5BqUcieJKuCnxDOKDeHoWMZTfrSHmgTAVFI9NQS8yXvJpftZb_enmYVrrx2MLWe8QkiZ9ClLvEClfD46VgOEpxPhyj0gP5GDSN9WzXCp4cXgdOJeTR2A8youWpUW8OOmJmgd9Chl6iZOi8NLuKd5oKX_KO2nXvJPjLCeTwZLt86bXN0qQYv27iR-zwTP3I6XoG47gAIdgcNytcqFFHvvBcfeWi_QSdzw3vvWxLUvaiHAHjrsiGbEibtj4VhHFGM5OHeIUmmTpyHBHB2Rv3yVYUnp3Qr5uu2z8GQENV1w74pbs-Ch2pqfwQ89aASiufmkkq1gnKbG9lNmbl7oGF0CqjpVQMC8UUzEy5pJSoLI0ZtlMr35QuPtb3-I1zc-tpKZKYLyKNanx6UdBceXDpQQcj0DodD-N54oH2tMzv3V01vLUAwzCqpw8DdwRDNli6Tr9uvgk5maBUBtdFMnPXbmdSDQcA8JtW8DiVbzl-xAbAjm_vOt0Y82-YwnQgtIcPU65t557d4Rxf6YoNSnMWiA2UqCJNO7PHTNvc3f76CxvvoXAn7bHNvoMZo131cddNwCxUM3CbXtVYX4MV_SFsIvcW3U1IDelWqOSuFm7Gf91cnsqVOPpDUfOApFw-3_VLFGWfpfkq8qfAUSqVLWdz0k_3IHFDw12VAjhpPbnh1QLdnsj8_cZ7alUNPYMWQoRTh8nyNEr1a2Fc-7LrveDLH-5BF05SoYYWbL-RWUK37SPuaUURFor05uxunEsXBH1g1gndOS-7lPebk90eZcDTbAQwaqCOzzgTfpMzLFwXirDJ37jhRmAR-QW11QEOmiUFLBxTo38CQNCGMP8-h4R7J2byoduIR9FDZ1esxc-9EVk2nD0ILrESAAYmFSQCRLHSW7GIiYQCtU1xWl9-l5UuMLmoQEkNq_50YRvYOWifGWQDnpoezar3IJd1SeOGcnpoq4iQV19ltzvuSsW_6Em7496XYDOn8km5nsXSh_OWWh7oE9d_rtYXeJ_7s6qv9deL30s8mw_P37gMlvdjQeqWQIe-2kr5lMc_pggQP9o0e4ICA02nRIezCSNPN3lXBlUNOJvHAR5a6nr6Uo2XJnocFOboxQcYD-ymX_e-7upNqiLxTmb950oWaXOmuK9X3RJNguiHXgC-P_aIf7_n_f9W_zg2hdbvYau5IluyAbLh9X28GAXH7aBx0JJv68vtkyXj54wzsJ5ouh8MX7y3730BSzqhXlPF6Q9_9-zP9n_ywCXgAldz_PfF5AawM3FJQ4C_aHWXx1MLWhnsVkgL6QesOt_LarV051Fc3WKYfH2N_TxYkiGWo-Bhgy-hG5xQ5wfewqyjgFx4YfNzj0v23mdGEE9osjIUHvSlQX9A6ciCdE-QC_1h6ndsG2NGnuTMAZQ7OfQHohkX-_5Ne2uvYA-SWOfheUyPceW1tSAwFw5vYFX5a8-fW-DsodqAyl6djUC6cgfIU9U68MQX17Vh7XNbn3o2qZ_sd8fJgv0l93n0yGYlUcW8-tVfeG5khrnpmPQOVD8C3xdoPYL36ogj7_1XwQjNQEWxW_6tziEHS39HTswsti6SFvZJuKkX00I6NxnZ7tLfzxmeeF0PWcjg3_jLwwot-RMAPtdU3_C5VtXv_QVm-_6ldvlpZP8Sur7-o3eqtBLkfZ9v3m6zSTSz9jkqEK26FohMLaW_1PJGLuaD5bCGPo6HjnMWWPIF_8yla5kRjHM-7ACUYhWZag5WcONDTLqDmERGnulg0m4UwLALJLR0tlZlytxkTBeYOtZu2wCsszDU4cV_RGrRwn5oSB-IkKW3GmUmDRNfVHclb99LeU4qsqLGFkFP3-ppfnLr62hAMCqDXEMcVWbpfZ4vfDX16CfXUsuCiEXDBxz2EY4r5Ku3k2zs-P3zn_oVxCAXXD0X9ftsy-FrAThrzPf6296MMh8g3aRQSJ4_5zv24MvPSvzbhirijxFo2JPTsTBH7LJUclMBy9wx0DklIKOv1PMxMHht2jBaeOHMeSWwkn7-PD7IhWnVh32gYQO_dRZoTWLdO3F_GTjGuiYKLm9ELRqD4c6zDyR83A99YqfrW-yJBpeN8s4FgNelbxAuA5lAfdQVUdOcWdKKnqYcRqyULreWeanGLtApZ3ymwIezNzfoaETtoNAA0CNR8uXY6jLjZk9ny39rehQeGyVvews1k-Y6bPNT6_Xto-eePjeHBgAj2ys1au13sTXhzY4CYtXZ20miD24w5Bve14etBnMnTYq0-zL68Y_8kw7hGcxYCiQQFc7FcoovmU32MCl7d-lT0_PW7_pYUt7CrjgW7x7vnFXNrsA8EOms7p-0cBrODw0t1DCZmPf7XToeuoPcUgkt7JrQyaeDvVwvTqd_DZ6uoPksk-OkhwwjELm-DQRgQDpk76KEgQLlqOsFbUPsBUCltYL_Ry0jdFL48hT7DjPJM0G3JNzN9M2Be5q_r_w4f-pkwCHT9ENi8ikTh2dexGlnHOqFQ8QLY6y9IJbxZnP-geSgNoBOnEmKIxi9Hk_MPedxu82oN_MZMbHJp0vFnCGa4W38OT-sgj9yIE-8roBNMpmpEPPGLw8wdcxYneiAOamxXxltYgOAGx_e-ta2dP38SFZ-0YiZNrICBM6uFw39oFrePWMRrEebWSn_QSdB9gNUd-KFGKayg-UAQ0l_sKxGUcgaSK4Bd_h5x7BYaoiUmXdbSdTmmZ_v7WPkl2Mb7vF6o7BguhQkOiH88sO-N4k2K8-ihnEVr8UJmt2rT58EAwS5SijHaZsb4YD9sT90-eIHlebm7wlNg0RK1a6dOhDWgYTHbY0uJb2a0rzs30_AI_nvX2xCN0jANEvHRkDtHh9naiKFCv12PGx-Yg-uKxiO5OP6uIYNTpjhLkf9QSaBBNvq94pV53K8g6OHke_gUQhaKTC0JeNwuebkEG-C_3WQzC8K22VtZsKQQHAAszRdQ9o_9yZ6Njt0lmY8QlGHxKC1cW67OptGL7a9nSSKxiacHay-vi36yXQt3re5Rqr3baTw4zrELb7fWkFvqZnJHxUcQwJvU9YIXArgUOGxyPq1hsZmAw5I2gVczWv6859qnsWmZwqztNCxcGdObE_UkcUTF1lAeFedpDm14vdY0jutZN-HkDRxrhAl7Ju3LmP_BDnP9zbGFMuHRyuYTpxu1SJiDvCbf0Ou5t6i6pa9j3DG_RBCyMcO9dWCQ2MI-5TyOLc5NBY9dtpZCSVdt1Xq_j_ukJK922wFhsLd69q9Ps0uHxCtYZJhiJd6RaYqcQynjdtsZb6Fg7TapbsHe3lH9Gfj2l_6N7FQ8sivH-ykl_3Gyyc1qWfvgyY1KG1bi21WhIK3sGhn8F5jE44NwBNHwCIAb1Pz2CHdOjsqHVUpvGN7wqb82PNFqnvAcd9Nk_em27mm7Mf_csQnuzs_vrd3uvsHxweHZ-cnp1fXF5d3_y5veum600Tt7sv-7_-br92h-M__ZBO_15dn78thppAzWNkXd56z5Qqs3Z7_c42uHjS-32goyGF6C8tk26OSF7ljiq9hkD6RVIhJBbGi-atj_k02L2Vqcxdf1kbd-TDxXmgKZ5_1vNBhR3Bky0f02j0rPb05tvFQZt68tiMboZZqjX3E7wiTsQIduMh2MWM1TL7f0d-3PzfYU1BIkQDIcdZF2OMkDpe-97W5D7H3mC93tCnAVD4cdZxlYsEEiLHazvkmtzn8DYAAx9uvN7XxBB43UGGB8rftvkubD89_09b9FXwdDCGyA8oeBzMVtF9dy9Tl0LrCzD-iPm55DxlS6bd3-PX9k6D1bxsBApsTSplID5sJkq04yM_JzeJQ4CO0hQEOfwkZRjAFCtJfavqWb44BtQqh0LKUqAsm0ShmsNGBpYQW59E3rf3-s16JClyW_gY1W0xF0QZ90E1RszaOTEk2YPf5hF2MujU2X3qObAX8axa0JhQe9lrA3OjU8r4Vfq4WevjtKOaLxAEFfXvBNAoKL8AZ2_01ZdZEqigxSCp2JP6bmummTom7egy3SZ7jH5_T3ft88UpdoY7GBDtbuO_ZXD_dbQU2Do88RtGOqbfpWRXzhDou-OrP59_brveOMWId5AQvwplkf35Wo-yKiqjPJsKs27fHqiH19-4FhuWGuY_m9JObkvYA95lXiYh51dKJxXWgpQE-TatU6rV4m_MP-Dfo9Lnblcy3LQ1HYhnaDFDDmH2xpOh6X55C_L-ge7-91_hh-gDjx7c39sPxLGqrCxNhxqVzkwgUpApS4mVrenN1HYEsM1IrvgPt2kn1wGrBVZyssxUN0CbS6dLQfF_z4ijKIuKbuRh50_E2d6SpjUMt-61HmMv_U8I-F9h2dArRj7MCo_89T6rUMdrTzAjA3YK8zB1DTJqF515AeO5WShc9V1Sw3ihGbYLNwHDC39d-fN5c_qCladtHeX7HNC-uQ0FC-E7OI39z2ZlGumyH1xdpULhWl5O-jKeYBh9OKKtKLRuOIbSP-zmT-_8-HSo6X54kIA43gGLbjnRfrbLEQE49kEmNNkkwyyH2FMCth-1Ry3TOAKG5tz99DgTeYa2Gbdbz7SYmANq0QszGPdDBl8726DTI-dhpTaenAG2HVxpWRh3Bm3zh6QFvoFuiKWo9WvSYx6eJ9-4k1-L-eDziJhsLL8g1-wYffQxFE5o6CR8gZLHOEV5dmrk7ZDgh3PSFgCEYryrwXBF9nDwR8NQJtGXBXLdyb4dNvQeQZs1_ug2dyPz7WOpz2PpBy_Y5uckqI8KzdKESiJt2fhmtGSRLh_lh4zKKEm7T_m7I5P_GJadYlH1LLpp-_aSzW7N22CTtakF32C7_9csHi35qu6xO_Rk2qbMsTVuTIuQ0TGt84ij4fDa2f0WS9vY_0_zh9dsshM7lD0ro5BEuDbr8RU9-98wJwuPdwbenOwxTtJtKsvteHvjCOIYgtEXIeNtt1OPIOOvfGe_A98w0A1L6kG_vrBpk-4Yp0sBjzltjFBFeKETGkYbXTbZe2JvI88acmd0JQDpYTGYm9K00iDQfyY4WbFL6rt93NkMFhNQViVMrN4jA6tLc_pvEknTENCMtmIa1998jP8cnaVr8wsfNsGgpyGL3OK2pJqAxzz474HC8Krc3jYnBky0AW3Bs5plm9EZ6VGlWp98Fn47ZnP5N0jwnErY621rasObtI5ZIShVCHXx-2SzhEy190pYasBAfce2KVZzaGhn1scdRfUh63-3ClVW_pgU30AJ4z6fY5IxH3DXbO2VCwEaeNciFh9eKzSlDfUsHQAgnNX2G-5tvL6Iqv_RX3pg7k3tNArsj5PbDwCO35rGZOk8DdROtRMIIcuIbOxYChR3ZrrToGLAbtuNdC2myxDAaYiKfGReye5Y58X677veu37smY0X3ZdCQ83uOTYuAvBNr3-XlHvt3aQ9RMEmKGxH-DxYlXE0oENwC9j7w4ksBftdTu88MWXbfG24qt0L3t1L1D4AAeEKeElUz9hdYtEdoIg9KfHry6a1atrG0mTrK2Zf9ipNXzT7SvCXS0qbLwa_sXAjhpmkTSXNP_h4uOEAf9vt51i_4hATXp5vyQp_DLn5dDovoFxbO-fufRk9ts6E-XOmn1OFwcejA_NtJswvM_0cVAp9zKMzuzn2PZn8PD4T5gb7P2ecyXPyjMypWTlE-DbTzyMzuzn4nsH8XOXbHDszzPEzw3wRxH3OKG7O1eGSW2fCfMW33wocTO7wn3mFb3Mwp87ROVVkNWwjyts2q2sPKCYhBQfXS77dvkyHB_bDEuldxYGAuQjJUNjgUApp2J0sA8HL8TjxGqPBscJ71mNJ9e_hNf0oiDMKVV4r9Ch6l8cynKjdi2oLxuML92utT1OF83gUavpJIZ2Uh5RUGNCwtrn9OAs96dnBwkKr2agUZ0ug6zYLbamaQ0WG9jGFi2yVfOgvlrloPFMO5T1WXbtS72Zvc7F7qdDvNM2ijmhdpXVpoUS7SRpNj5EATZ0wK5O1dhJkRCu5dnLd46P-svFLm0aVYao9RnB4OA_w46iyGWi40BG9l9DCXduR8GuVreGHC1eto7G0Ps8pvDGptvFVS6qdNLhPX0mvubLK_bqJTYSGJQIjI0DXokrSfu0QeEVIrBE8Q1zTEd0mLhCcLekPaGgGWOPuda3JQqw4vMmoIWZxSbJSyfen0xBRJ63gdjvMQds-iZhA2Vrs7yvGfyRCfn_O5Re8b3hMes8LAUGuLlxh3W83ac_Mk4tNDfqn857qOzVmviG7sKjQiN1vivVznvgv3-bm4JGF44WJrsbr0o9hHtVYKaiHBAx81YvYe_ADAt8oSDj_GNDyRrYxTb-YND4ULoHd0NXg_A5F7_58rvNEyd01aLGEdKqkLCl1I1LGxaSTJeQNhzwHmeZUT0IHwr9ZeB2ZpvfAq9i3p7lS0ZoA0b7dBsOwLNFCuf4rPtzg794uSNI9uNCtm_6jWzQx3Gjn-xmfB3NN7gte0Ng4RlJ9k_ZCXVNFSyP6oM6znTPM-3JnWNf4Y6CSITfEr_SxWK7mnQN4M8gO89uyWJPSatYpLllW1M3lMtCd9NyhiUkDW4Yys-gL1z4Gbi9kJsZJZqVN-GTby2rFCqVvupSUCWSW-dUy02x5cyVTXdoPm5O0M4RRb32aC88ZCRVoHc2DjNI1-mz5_N_VjoL27O1tzbZBm4vS3fYNGMFjy-lKZowvEiS5qrTUrhwDJn3gjTmI8UuLmNJ-ezazUQmTR04JYOhvW5WMIY2OfjBDrNBisZXMNSCoy1LUAOEDpfHZ9Tg4iBv7BahQjF4Kk9qWGrIGqyCNmZcGsZk96O6npW4AWCBgwmqRT5go1wKSFUZWMpywRPNP44N2znNKZ0sgnEzsaB8Se65Pw_fllmMj4ocb2uD8Xo9chql0xRSMY18kh9s8Ek4FSZRAjgOVFzAGPxc_WLDWZ7KI8oB92oWqqZd8KRbch7XEnKRwplwn8l_i9pw-Kq54PDIjec49YX6Nl5XZNHsaxLgrMJTgJcn3kUi4ycKW-6zAFc2tWwttgCX8Z5O0STazkWjSUJsq6T5gE6mhMU2GELrwpKEgokzJUHrdjMCZQbQpRQ2IH7UGPEeL8pUD06XuafCES8wBsxy7IBB4BIaEmWb7DYO7lI4ZURFBNFyEcXJRJ7TxkJcP0gkKgBj2AqnN_KOqNXsrl1TzjDAmFHTdKM_7rhGTDWFJIzyQFlktBvEKdzY1KfocfvumSMV198Y18jZATJcO8s-_kRShKO5mmgzcNKEhwR1roWh3WCQ5cQhLk8IKyxG_74w4ptiO8qOTDFm1pzDLHWfjxl9mVXrNSa5Pcn2U63u5_qTgDD-jbWwStM47q9swPyUjM8vqGMYw0ufcaZeP4kUZtbv3bhR6H0hH7eGgc_4fnH16V15KKx8R5vNDMorGkOn1ssuOX7A8UpBsrQQukvoRNf81Pi4ke-hdLBt67WMwdVd_1nDE-Gy920q7cLcezLZOmy4INB15W__0L8diWw05M4LIbG8n3hvhNr7RBov4BXZawmeJ8S8j3ESz3ui2B_PpgAzicWV1cyGa_rUDO7U5P3IQpovwPyuKvguOkt3Iox4XLAq259mBxdz1-cFyBEKBFO4omSX5uPvMVuVeParPHH2zH3ezj6HNZ_IQfSMPFpk3uZV56qudHymM-V_zdDxXuBzDhFk0UcfqEeBAym_8beyfrCz9P7byJTzeVNX1BJEb7M7S5GhGVe1xqq51kpt_k6I5eCoNiVz1qiYImfZ1K4kji9eKo57vnDPWuzyga5sHetyj4el-iteaBAuayi5dX_om4FYB9DziAc2f51r6kF2NgHDHvqCrNzyxX3q_iLte3g55_3xwesED5VO2ZxVFhqSF8_hY8VQCKVyyP7CVEjFXWUdNp1Q0arSJtCac7fvTvYs_KrmRKOIBphvW1G7zIa_6xcFqXtAdPWLPa8e3TdJmzmvyrsdIpV5OvKV179lXi42GW17Ql8ne3xnOk86n-SCGRRCt798mrbUH1-vNIeZufMy26wXW14bfVfty94-LNphwdmKGpjy4VrhpvKVA8fCH_QuOfQ9_ALeOPQizozYkLVigf9l7F1YA-Baf8SG_agInPndLsbNav86tP0HGqRARqm0jn2UQCAF2MByaPfs1T80Xp_szp2kv4TH3YG9_1XqAl0LCmTtP_4Mln6vPa_ujuV3VDSlJa6GVYq4gATMjk5BuIXMv6pZGBdzXIUSwwIAL-g_f9fAkV_xDXptMpB_tGklfo1GG6Kq0t4XaSUg9wjmd2TX2OFNG38O0P3OfEZcT0cWGaW0pGMYqVqeO28feuF5dYrVhqo1n01mrLoDqSIKVzu73H2sj513vvc9kC6wS5JS_i1yTSMWNVK39bNebk38ybS_uQx8UuKCaRxi2RYzfYhjNTfVo5FD8gFMgcIK41slfdzrJoI9puNPyyaD11WIVBLI8J6cGj1HqAwMbngV7vX9tnwf4il-uPWbhMhiCfW9zKp_YW7T9s6AXtwzH_olYGpZbQzk5PpcFaroHuE-lOMGtoBRuopAZsXPc8HJxEsPUJu8ZOj9WKlwcEB2cwi8pJulDRLMju334OztfTU7ZMI0owwQ6w2Ttq3FuyXt9Fjp1UFlUbpyVe-LIaTrkX63cVOXGfE5i8Sufl0OSdmgt5nBvC4_A42N2g2r_Sddw-cVpCVR-6NWb4FUsB9uMNo_Asf5V-mY3qgMEzOSo4VDkYb3rKzkQzlb0Y9rc200ddjchhMTzc8Zyzs_UnPrsev-G21xtM9_UbpfeBtwY2vcSYuJlG5QPjTVHiD154L-hy7Ws9SEAoH1z0JErtoBa0Fco2QrbfaiirJKtk8JTJ39R_UyzP9U3PR_NHLtVwkihBjmxg6bvxo_-2_t5THALZqrd8lDEyv31oc_ocNlLbffpeZ5DH4ouRIK2jscxv6jMIs5WlY6QxY_ZAp-1oZ30f6EhhbikGmjswx9lrz-sarpv7UKHjgKt0nSsvD-Q7rLQFWat7kk7KwRTWVYasuVkqQ7_lma7zrDfedqnzXJUby4Y7m3pDMaTbu-AWjgzsjWjMelxuvmbi_gkWHHn2LBO5L2AiPAN63H5SWG9o7fZu52drVQSI49ihx0TbUBDCh0EhEns170z7EgbdHN9Z-IAWfSI5fIJTcNIzBpuOKtPmWePv4vRHCBtGTqRZVd0MgAoACcZz7TltV4lN6OhB5NnJAmzP5ejgeGaoVTDKAVV-NLYaKl5YsjSQ9kxsDU2oKtKQHe_yhMVzZmpkLPHpOgFqvhFezUoObD9SWb5n5WvbB8x-0wVxfbUU3r54MzI5VSsMKFyjWtq2DVmh2HOHzPa62uDFryGqbrWPf33fbOu0OoqKRJIqVDa_cjrZIFOOq1I954OgkVSAbRxAajcDDkaKkPGB9VSbo_HhokHjtJEvCIyMS74sIrOiNJjqhzJN00qDqKRIEfMIClTZ7y9iO7DH6Vpbikh048gNkyP-KTeSJ2u0tMHpDN8bYNTtdXArGNcLUMOJmcE4fAvot2VlUvJubzE08k_oXoZI9sBOMPIrv-3qy0AANcgvrwAZ9bE33U4eKMgvWdK-jqPGQkXo4aWNCDsBmyXUdlgkLaBtzVTLeq33fruFGefDDVB-XciVnvyA_0-Die8sq3_Um3-TbgrT2Y9KWjm2XX4Fpj4IaQIpe3PX5U2O_Pkr5RMJ4ekRWkBhCO24ixS3rqz42a-Q2JHacSAdiZV68uhhD71QPUAG6EpCQEgezJolRvniEGrWsHD9Oh6e-OMU1ubGfwFFr2ca2vgr-a00uHjGvtvVgpVjrbM3eFGONnr9pNvRaxLdgql6rRGWoAuqCX8D6wGaGTst4G29xFuvNhrUsoUzHIGN2NSskT7gJOlERoJVHFsDuhj6NNIV0Lfe5SMhaMyY5prbpJw1iEH0lbECc219K1BoTTHssw4KRJjlF1rXKZ0BEkyhksAL4dtAWrqIEmMGHujRMF-esmqYr6jCsCmn03cJ67MUc7RLLpoWUE1qFQUGuadHEAiAAsMvi2A_03P6MjZtNYgSCI6DWWBAPuBBOE7mrWvKCO3QcioTX-WMmUvzTZTZiXh_NfORI71aL_6tyr8ff9wVWw7oZsUzzzyA4vYxC7t1-1gYTmdlDNluzNsJv0QVBRobbA5KLejixXWVaHHo7577XBxOl2161ICghaRyTakgl-o51IpThhGiwIe58imiyQIkvuux7TvuF3PGDicmf_qJYgX2kB5qWsZcl5P3_-FhB3zN5Na50D3VyHYo07cKc-kpcugFPOEnKMSEUKr3U3JEf2FMtAaTeCC5F9MNiJWmGksyBAVZBCoICXUYi1mcrocwTyF0BWW1QA9uPHPOl8O1H1_Kz5ECyh91A3kSHKuMpvwMFEuBHRQkgJmkbLF5yGJsuOFYsWhOkMdU8PXeM2w1lAVw9XKHWaAl64YrodOTIPWtkTgCuWEiECw-UwKHeMsp-gE1TcCnVOTio4dG8NF0mkbWmgtnA3grahOp9pzY4gKGWmMwtuaOlNRWwKwAQ4txBiIGDLl4yJCf4hOt54GIonSAs23lmj73NoDkkOkiHjPHCFh_0ImQCCCuOtYyCHCIdfNHwQioNO1fHiqdJJyHS0Q7NDmCCvWKCCo8yDSXVukMz8ohZR9N5T56kcDGPZNEiTzT2smIIDn-pGNc32Dn73CczpaneMmgPL3dRCK4lEnsDYPeqgvJFL9R98F6AEVUwoS1IJogunie8Vx555TCNL-ea-edeAkgU9SWOD4vUg6APfBoA_xCJG3a8ha1nQZaeJ4B-x9S62jtt7FA7n29qfRKRS1IIJE5zZxi1KZNfjNpXZDc5JTfXLwIxhSBQPLiZ8yLdREFCIJoiTdFm2zmsIWOcKw1ud0tIMF_LiYHKAms4f_7_mGMeOjz5Y5Atp9GMhF9uW0M1sQjJ_aWD37gIl95kuEtUHFKqDv8Ul6JqaxOuIt-KglPwA1FekrrqJUFE2CMD-7Q_ZaggEvapbcJBPJDNpWjxiw5cYcGCzlHvDhZ7MCegYCIDhQcMfmx8mLRTC-GELdKOVw1VHEZzyTrlKYCEuY6PCcAgxOymIJPOqj3_Svs0aWpeIzVf1AVneUqxkosEhqjGgUULTgAS1SSomC0nTJkNCvna7gNsDvpGyzhZMAPJOm41zwFzwy__cK1txUKtlZiiX4ZCivEFjG-DhZsonB0Sz1F10eokFUpXSqjxY07USj1r7bse7y1YHuChLRJBhOFGWZAN4pHHDG-U4BgkvMPgbPQ0gJ-trtlNC3NeFVsssfqSTNkprEWE_drGxJQjxfLNyYtW9Cj18yp7OVD2MnanzPIxiMdPxQuTFUv7E6Rnf0dMIb511gni1NYjIiwrGRVP1g70Uq61JZxK3R0O-ANPPK55T83OFUpTmYisnJMkhGGSp5wClvgg6Z1W9PT6pv-SaqxQ_jKLZcUfy2ZqqqZL0IOCWNiMF8nfmonEKJSkH7FEAokejAOmNqqm_0JEcpHXZmFKZ7hGgEQGVsJDVjMiMe5whdK83mBO2yIHKjv8NG4u1A0aLrQOM5lQC6U8dOYTijrQ0J4jymfQF030ofPB3_ufJ4eVkdELOLiaFTZ28xW-hE3Ojp7j-96DUyXk13UAIvdFytceUyPp-Tsj0ly5rKNy9VMpPUuOkn2VXcnpzv2ih9cNX2EmQBQkffVME9Kk8QVyWle5wTIUwU9E5vnvw0_WKdeZQ6PR0-NfE5uoVuFquI5huprs2b195F8gcv6AD_FqhkRxHOCk4N8zvdyWUyRqEV97O12W8koLOnqV5dXWnHu3S44IEVa6NjAeeWghvovzRaXshqyxp_Kh3HV2S52a_9s9dHZ-VN_0w5OajVLD94k5Szx3ifceHX-G9Gl4nghbYagVScI-K4-BtTg73FAtdQGpp2NRA9BRMw_e1mSbu1XeTWll-mHrt2i7o4SlqjCfUBPRaMun_4-teuJl-NT_SYZjG0SWkzRA87aE31L_Jl_5OvYrZ72iHCL6lwQaw-PYK6v-XrMeN0sXZokLsYLg62I2rPP_Kpq8vO76QmHr4Hd0zQR-ArI8OTrwz_DVl1cJp_MehjsVPtv813zZOsBPYnMaiWB2ZM1ej6pDrHZU9zC4Y3yImMoah0eqk3-EhE5KTo4rWopm-E7njoadZ_Wuvn9PCBgQfXspBz67GTYPgWzRHIpeyz7mT7ZLZJRgdWaKFgVvSSfTW8aCCUL6rgaMjHDgSCJ1D_jUORNyLa7_C6AlJl1VO8q7kxwR0Qy-y7bleYYSck5szYcICNKgfo8wSPnK2An1G5pL54FQsnB3xE209Lr88N0Pl1-yZ0qcFIMG9B5FgBlITtpWjUiIO7xh8fxaIINQpNkW10Vi35ggD7lWfSqUabX4YzfNyVsbcLjvnqY_uxUwbVnOMCQzx5af2DrRI_Wfd6N6pTbNTyQjUKEY_LeiVom8BROXIpM_E5weByliMS2mO9GPHOJlR_xt7tsZjpHmZxpFaw09tS3uEIl1ayHNPo4vWL8Y0rdMLqhWSMDCstNIuTKG24BiYdVEh1RUn-NTF3n4-d4mdQoMCh5RtJznDIFnVr98FBXX-UkzisUI_MvjxSdXnJhJez5fI0Z6rCd7YrLSD9iADgm7lfDfDit9FPwMt8DtTz6QT4QQdXfF2K0VMiLwWFtkvyNSvU91ACltMdeE6hlqEPvDZQlkPpg_QTmKubmtNtkYUlMu6xzQO-0WiLTgvb_A4fRkKqzumnaGmpVBxMZIb8IdbmKNO4ldGAopH4vWPePp-GLx9ojmqM2PsLhQYOLfQDkJhm2ImbibJRKuZ0duhm90glCv0VxzM240RbYt-NBTT6yBwk-lqUhCYR754tkEqG7t00QeDx7AArYFhNDFKu_Wr99UEg5hf9jrBWPJ30BvxHHJKnjKZL4yqFY6YDEgpNhJLZeyxJ801NLYQxiLoIY-rzU5Al7kAG23N1JOjb0b1DILCeYXKq2chNvAaYyAKe_GrjlenoSe0t8WyhI8pE6JLoXAIMCcR-bQ17I0oHTgImYKJtohgFMX0UG4DyWdmwSKYX6bIm_GL0FZovGFZ82I3eOQmidfwjRtCEFQrotY7Rrl2lmuRzQuVOqt91x8PCwegvQwKSSKrD-nKzlplUAXW43e_H070cd3oUMr1grPPcgp4Y6yJRxWjahGunyUh8DfZfQHhcCEWIsETpxZD_ChHee9_Ldu6vr8z-rjd7eH1tyGpDZD2n5vyBm-C3h4yo4186BUx4IHexdmNK4Lzuds2ZnzWJFZvWZcxYNK8xPX9rZV5f86eK42mgeyiuW4aKSG47_8cPwC4QTEYv2S1t3ASAbv2KLoXFOr0nRlbQcX6oFLQX_B8xJ3f9C5aabj5dfCpT2w5_3ifll-KOvay5XZq7zUOX3blvITfqUllbhd1wTFbv-ffXrbFv2lkIJS7YZybaJ3tfJSBMZf2PqdNY7IZMAIfbA0YLi1nYETCNYVgN_xVFl4CjX8pKG9H_qPx-r-9bFFvT2-fXeWppE6kwTUSKEW1bKdUbhQpwtC2FFa7nFcQYtZpSm7V0pX1IlpOZfZUuVXZFYSQnJZKOX6wRP5qYemcHpvQDUggas35ufaQI2R3Ao_bPgyx_nyeWwpzilacS6vtyQ-l8O9dL7At40G5ZWmlZQNwpFOcmYbiIF2sp4CeCZupPvDCT6yaZ4gC1LhhUdA0KvVJQlpgoT5oW0Bnm-gWrXe_fTahVQtOftHEtVagRdonxNMBErsBMjQu2W4PQDAb2RfdINFOKQ929e8Obq2H6U3P5zVBMoIvN-ezwpFav_KAOYjh9Jws-NWrLFhy2voK3gjdeeIVozF8lcsS-uKPB6sN2-kbcanEYN2udhyNzK8ENGSS2aNM-_jVHVuuz8Ga9vdQRpv8TGaZmGpYPmo_2ZhBFTWVM7JzinNIvRHBBrTZmVAWAunLGCVfAzYIGSblfyB4JwqItImU2Do-v7Vw7vEFV-s1oWQwJpP4IWl39xxL2dEEzHjm1EQ9lmOqzaah8fVEwHLl-KdTTm6CBseQOVVnryK__yyo0S26i-Nd1T4UgcDYD9J_BQRgktsooAapH_KalddSGmZqPgldo50XjF7t9N1p1PrmeJouew1fJvRkqU-Yanx7UOGd1lbFYylj2D51dpg-1WeXlkkBzqK5eNYsGpUNVfisqpGKveJfX3L6R6n43qXBBHMZS3Zmbx_o7xr29XpEE5OLQtp5KKAubEjO4BBIeFMPIAWpKyiqaZQBSAlipRqPPRzKS03CJlSHhDpVqerQtZQbEtS3pC0ldfP-YE_fsdVf1kWurUOETBn0O1lrQnzqLaTtrO9OKfFfFEyGOrpgyCxyACc7XNA-cBYCf047skfR5vpl1Ksq1_sCwd-9zrYDBzLmebRfehOljh8TohaSFxDjoiZ1A5xo2o7N-7xU_Rle9mIcwgMbWtJiTRbCggl_IZkPQQBSXewxwaBq8nmKAo6ZhfbRTPyyrpMZZqx38kLp8SYdNd7FVV65nQ7a_hKY_d9cdF_XICivfVU6zEXfpkahiHeo1wGxAMnYe6dy4AzN8Rzm3S5jsAozf6YFkevWnZVP4bo9KxaZLjxCY9RDkrMhwuIukJtKa-BQONyx-rxCCG_VPvg9DtissPwLVWPgwZHIah0iwCl2Xh6Dihd3FqpHGR9f57QtOs76wfT7ZQ48kuw39B0SgOoxYKDTyGDoQfAyiYsv-zbo2l8QpBnYgdJvWUg2NiVTneX1sI_JD2R_-RYRv5NpB6qUEgduyqh70XcXBxu54kMdyeUvmscde92IdIfwTi5g2g3_zleJPJEdslleMwjrjPCMO88RMenjaFbdFeqFdc8IYzoHYZ-MKEs5zjO3Oh-YirkerXcAgVmHHrTBBfBrBAR3KdARVnMP2Vxj2wruFtYMOJTZCkt6oAZLBuBgVBbcbc8KTfw_XCpThrhfkKzQAOsXgnCJLG930ygzEQuNnLMzkPqkeDng5exhusbSbvs39JnDQQajsc_C--xg9U2Cmsf1xvFtL0TRsNKqi7HqbnoqK6PckXdSdsspB8E76IuNTZvnrgH5acLZXURXx5xywaDXwLVZ6Gfqa1BiozG-gEdLytDLR5BhnnD0zZiMsWNkJVWtfh5w0Vc7IZvSZNZo_8WX0Oyoh0EAMffUtN77gs4E-KzrQVt72FFD57oFoRESbsA8cCW6ssEcDRyPPj_y26nCK3RI_Up_19HI4LLefBoXjA9Q2PMU1cftxBzKZydFL5b7h7X6lr73hIA3GgZURClCpWcosfVUWJZayl2jaWZJ7bcCSMxGmRcJmkmzJQlt--roHtsPTS7ObcSKfqqWwvyADYCgQQu1N8M7lLP2tiRo5BxAsp8nXEBIgA91qhKk7ydfQ4Rr_Q3Iz61lAknv4Tgz2ph2px-BscebgIJMtFLIJNvXRhtBpHU4ZHf_NT27gbPqr_io-MFgcop8HE0frkz4c_WYwXDRBxbBQDF1DynpZuUw5aWYHOczOc6AfIir6Gk_j-9dPVQQoI34MnjhwCXrkJGRPWflcPJ84e-KYDc6Wrg6vyPD4P5hJ80BsSthm2MhDXA_PwdAYwRM_1PbNs6jQlH1lcDzH1y87e5917TLYAef3oa6e3194yfBpsqLcBU53tbgrsvzCbJntv-UeoJPCXkdRYMQb_40b5cxjM5XB5EvZW9GSIiCyhSfhk1u1x3MGZ69nnnnxkQ9yLDrdTaOPww2zexv3CgKVIMiF3BiwD5DULz74wZ7xNcOF--zDJDh9c-O8HrgOOHhb37Phroaw--EhzHkLeYlDEIc4Q-DOxMqmJbTTlK5PJjiD4WCU9uSM4tlS-ZTG9CcfOZvwU7dTa0d8OwddgEJ8FccTCYk7M8n5tM3j5DhHDr2vPantUxUUi7Z61m1ARgREq3eLRZodG_bThFb3fUuEuf3Ry-qo5gVPEReDPQHbTyrgU5ozbmtP2DzEmT6nrDNUcKcSqG-cHVAqBlUhiwtVEbqpYLbGprhvHU4ppLBSOTr62QIczU9LqzMAKWvpQcTyBpuUuq3eO9HnqKXEbSzrj60KFD3F7iBOohHK9YuVjYh6vmm2PpISRR1GLpH2uKzan3VP1EvXkbtEaiV3LzXR5G7cVckP2WxSt6nSJRJHfcTojnJGVLNJ8BQ24TQGVNllyU-PrwU8d8ALIqL-VReOevqrBgyLI_nZrHp8JLMb97InMz8LXGHA4iAJ-3YpZ9wdIG15jeQFhN_0m7A_syp1SnHY2QvZQM_dHB8UgLPZscqkz7cO7hiPQFDaa8UMmaKQsvF4y3ADTIMT85G8ETf8j27f_vw8J40qyYmbEjrvXHPe90jpQUkL2YtdYypOaRg-yrtT7nXOvOROe3vfSxUxl7dwiXu8VZakx55LJTMe9LKtGQo1t_n-iy5hQf6paba9PWT4UX8kCz--rQsWL-NS5yy3L_TnmorGvHS0xDP9wSHzGKwvfdLejQPTh-IlevpAz6VvflyaaOt2gZnMv6c2L_XZQM777lcyfxfQP7bXd-2yxS3Zpq2e3uP0fBDDPJln7WJdZe1_61fxnmvbwro0sSrUwCelT3ybxHtWkjylniMM5kj4TXevr983TJfMJmdtVIGU-w7M3xC067DtSbxgWGukU52-4w3rHCFkBKG60-52u8t5h1_ue91bctK5Sl5nxTXDjDp_7JqET84Po74PHdgLoqeOAU0-OdqYtF5beyUTHjXVUVLzRmlxVVqz2NmO9SseiD6fsO8jSt_95nQTUDHj2t2bSCsIje54JSqYGl82y_wex73MugtXiewXM8UgoRXmF0EEWfUPGUoMMHyE0tuod3nVffv_m3Lrzu_KYfLEN__LH4b-uGkulvCgOZKYXOq93eKOf4dVDXdXjbCIG4Ca7knnjhpQjEcry4i4O4kSMqbIscvx92ECJnbu-Sr2qK6x4zpQYFGupP3HDmN3UmrJBwuMsdXOg1_11WGpbmqSrvHNwOvjm4nW0nY8asx0j_n_om9H9vgYjh6AEHC9GUmLv8t3cn3XnIZf3d1f4Ldk5x8XZtgE5baySVrCUc3A69GgvwpglS2TABye92HbtfX1O56tE0k3_kETatyrucdp2MpB0xhy5u-jfRvxBiGmuRBqzs3CemlLfNlxyzKvAqR3sJE6vr5_4rx2DFk69ms9gnQmD5nUAMZMK7i47ri0hHrVo-bf6_XoGx-F36vr9k894uXGdmOP8Hpq6b-8H5h5d3U_D-874VF2vBHkgjshWiPWY8fqzfmmPKh9q79m9xGsapKYlPy4b88-8d_8g1_yhypRf_pQLhj6KftwGRd9Ulg7eR_v_NqjmH9tHP3QyPWJf2tKbto6wb9lB_-k1PRjzjyGJhndF_kUQoCrrNIe5VsaFNa_vpjFV_AmxlXfCWVK-O_i42f2R9lqjZh8qVruL3xzvpxfreW_q7_yj_fGJulcdPRLxAfrWEo5J_rfds5fHPfBFs7PXyoAyOQP1ZKocyw-U1YL4u5BHp947lxQtRjdKZQu3QaEnf51Yob4qWc8C9_hQs507_fEp_Atrn_BcZyiMJKXj5bYbmBsXuV4vcdQVZdfePRv18cGKYs10f4YU5tarSwsKq1aonIdQaH6i0AJCCS4PmX-vtYK8joYSVVwPVqimkWjwZ8j0ONUXOHk9KMuR2_Cxfbk3C2_t3MtAzZKQOMTjWaZNrTL3W7GAPDExry8K8DzKx2mprC5NIWTxd8z8lDkB61oKuqTs3GSkYf6maaf01TNmR5BdGZu3WpjwWCjQMjBvA0NtAhZJWMQdSQpQzRv_l2emfP1ZnfGZm6ttsN8Z6ZLDw4JEYu5TZ3NpQVamMhne4cbMRr5O4O3RC1yJx3SPu1GRXK5_uJGra2klBM0zP_CrY0pwiXG0NEzJTIhcNRvQCINHGsKs2BPdRUPoHPKmoNCl2vipUDImKyOq4sn1wA6zABRSOg3syPxiWr5FgKpDwwS7sAxhQMhMYIfZWTDOQnGty377dj4F1ZsoNxcvl4PRRENyeRsnx47QYky23BsMayK4zX1Dguou5tfDYh2GlbfgMTVGpulxnVGiUbRnpPR31HvA_-45ZKqtvBOHXMLboBYrOZKZ8iERyPoEuB7uzZbfPe2kueFtyxoR73kdqiO98j04_o7Ks7JZGcbLtr5-ipFvTDF_p6D2hBovLKWojjnzBDGQIgJsy6Y5WHP78bpEpAm1TNxKQlwtmVNOBXdXjTkw1D7ypz7jaEwj1hmYKsaD3V9q1pxijHf9o_7dXtmzC8Pv-5cfBVznbnAs0Ins-ol-yPGi720pCSIqrMvE6HqwbUqGyvrrhQy7quhnXoboiXICjLKhU2TzL6lhfIjbIXy7l-mDyuOEzo2BJOBs2VYz643NoeWwm1dDQVH4pq3zKgYWHpe0B6AQu6AGXCygboybfiPrZupKoKx0Z9EgHuYXEVHdBOOKjDE04sVKo_nxjGghyZM2R014c7JWa2w5hwWJe5punfUMmK_njWi3KogxVhnIaHSzNFN3S6dN7xlFL_OdFWKiv3JjoBVpB2QGt5ZM1ruivi4o_FouXOpkJFT7esAoOk4dKZesf4mOdLTBLzTp4Bkm8n1bxxIPnEyGTK3zCvUv3ulbuQofXtFXU8kAsU0i3LZFXNTtvxduD6gkYPqEYUNcwO3shqFnqV2SIO8vFuuOjIqN9zpHXvR-Wk3B5hK7Bl7u6UwQZ868Edl2rufIK9gMG90A_kMbJ0UwasbD2-O93INzdjYpQ6m9S_pWqJzVNO-FJnEUM1YSaY0Bf3YLNoBbjDbspxGvkqlfZrpOPbfKXPQIzAqIF6rszyOxua-kszDLZU8PEwC1mviur4b9AGfgSPk3Sj3amVO9-Nh9nY2Bz10AVKpB5kGokmJevuuH8fP5CmDTR9jO_D4m4a3rMLEnqBIV201tCo8ydg37yDIon3Zf8k9P_JRH8ga-UPvbH9oEDAZ3CFp2ZqvilA4jFVkHsu49A81dGsUYRiuRbSadggcDqt4NR-eepYSafqw0Uo0vPftu3gQIuCr-Ery82O9nnCHtrIemDKBEMnyJ6D79kgdf94Y_PipODKFPYLw9kCfr_GFNrZ6nJpY5ZsU8xHq3y6IeK_kshnXkoEGCGmLSHOivZn4UfmWLCREviopeIwHucKtcx3_8i7WS6v1UuGB8pzS6WfkMsy9t_m78Mq1bn0P3MDhqCejuOGoStBAribmhLvF3FNkS8W2lBphJ3UPIIh6GvOfAe3_mm5puGfIsVBBdLfTMUDIpoFR7ZHUNVoy7vo9dYyEFaUq8dxpW_WZwztUz2vxJJp3UJDgDSSys5IwRuKejYaVLYt9LbT1bgxLiWTo2rIjH6jQj5ZhIjMRPw4jr2gD71wkNWbhAZk48Irdw0zKLgTTGOEq5ArJGMSek1Z3uhCKu-bpl3GTJTDUwwL3_-rUJiR1UP3FhBqHpY0oc5LBvWNog9W6jmMWJ3pjGHZkSgxWrTMqBQQgyIdtAtJnyEIHuTtuZxThB8Zdm7ariKjlVb7XZjUEXAQCjXcO5krqDYh7_A97LEc1Z1T4FDPzI6Td79gkFqCXZJLVB5mB7RITlDyAUvmfe8-p2oaK0MYlnN_s9i10ahGarpxadZeYKnqt8KXtjaOq4jFIKcASfhgjq7zDQmQ0UWbLy5Kq9SmOesS8CU9Pa9CRZXQx_KKEAHLyEG-jg30ahEl_kTG89ma16PCzWVSwIA-Yas73d71t5rRxZ7iWdsKj4Si6NSrILAfoIUTqsFgVjX1jpuW7OK2-Zm5nL1Kb0j7VJW8-Kn-97-mt_JvN4acVTT0rTo58JvF7hCngOfBFnRsolK0LMwlQRqef0DIfVYaYj4Bgt9yttxAdZU7QptRS4XFrsTwpSiXh7FwSkKExh_sC03Ujug2SNqC_75T9xxWRwvnKOnpemLptAXe8BLvMZG2p7XW42kR5JW6mpJ7qVoJ--AUsGTLeGqIImweZkymOCGu00WjMLCeWji6MRoCigLK3WMMAglNEKHd2aw1-lyt5MYb96hrGgriwsTD8SOlDpsFSrh4zoaMT6E6YF8elCByblSKdioFXqWZNLu_YqclxIMiD5DRCjlpJGWur3lDycN6RFacJrDZBlgP0kg-rR8OKTSVH0AhVYKtIn2UrxXnut3rxiOd4JXyE2X1EFXGK_EbbjAGWMrMZjywzb4yQgxyj-5JShGsKcdpMfe3M1caVLDjswwxFl25hmq12Ndjxw1-E05B7DW9xL2krcRljJjmUvCoH82IzcJWWv2YxxMLccqBEDCWUEBIggs5XrCJnaly3zWbrWG3LgSizSAFfveQXlURLNxUcOMEg7r3Fkos4VQFQjNdcuOPd4K8jT3Pe2o-7CfKKGiNxwD7dH8ghKORRkxNnqLXnG-r65ypIt5WMSTFpad_YPeoZ9dpCajitkMyjYSCyhs-_-0Eh_873sLwi2fXdojQQ9Z1CvwAm0ZQrG9jIgsXaoKZPtWDtKaEaWdlPlmLBiE6vkcr9Xb4wG74sXE128YNZWDuTEFkoDKyeWrSh5d9DAqlR3sXBSb0goZes4vhlE_DznXgSznTbHTBbYZbleFAcwe9BWID6a-31sA4z6PMGQmJ9tGNslhKOdt0K44Alvx9OHMBktIee0bNCR_VItoF_CPfDz5CjLwyKgsQv3ihtghdG_Lt349u2PX-ndayBp7h_NXv8A1BE6lAHMhat-FX4i_73h1IUVMFpXO89c_1_3tY2EJSZQJwB3pdl73-bxJ6sPhUR2DvNN9kdzxpw7_5aGRiAgHJ3ex20-F1ALT6rptAaY35_rRYRJGTCwjGE3EFBb_xS3zInnWN8vVR1QQI3j1NNVfaA79qgGpXG-G2niQnMRTT2p1Sdr2VcagiPt02u9jl55yUGbyY2VsRVS0KNxmyUBwdte4D0m7jFwq63HIWWMgVYrETysab4q30GldVLFe1kDEwrTUGOSvA66cJusygs5_nIYaqmz6MmupV5nI5wWZJhoOk4qS64Xj-BlA1gmqNny4dTmtQZFN2_AtnMELRSPFeyIIm2YvTJrsr5nASerHoUo4Jcdxv-uR4gPOQfnpyY_qq64IPzZxgMPskRAVNbLJkDwP7ZV5E0w-YMhmnp-yWn_FXXMVK6DkFvG6b5iKZV8d0Ga6Xq86OBE02rocsWbXV8aVcZ9T-3gzkK4gl0PDDOgYcuuVkIjX8w_YGo5chs_h2bRPOkqvVZan1Z0IodatWxwRZ8wdCqJ3zFzqK_VNQt2By6cCblUPPE2Lx_usLT2uUhcS2FrX4DVSNWkAbPAtqUYAfkzn_m95ZT__lMT_HUpX5lISdK0FUHtpbcD0Gfq__7JUSENfX4CEWr9IJ2AflSGlUtQwpLbcUTTdTBbrcwAPDilJ_WhTlu7emNrfxPNjOrTLp0BaMR-xzPbAHkUhRHEKfvm5maXHGUtGZtdqs3M8GBsxjeW1BZr-mmdBH7p2DJpVSG5STJli3mnWecOV8ke-P8UMv3dk3o7YVtlMdgMZGyvThHcTz08vJzrujWcgK8_yxbIzVOsV-iM_HVAQW_SH8TkonR9baurkNuqlToc1qnMuAyniT3dRw5GckeAjuQQ2d_OdhC-BysImaOnpkSjfLMNKt0qUQ71VvXNr1Pj5m6k5zJIDvVTSNpgNLUuYDLAMmpmhxPhNdUnWdDw6u03kGhATEA3ksb9bDLQjC1KTEdYCl9x64mGk19A2IhrNPb5P7mflyzpNEtu7I8uT0qQEEcSqznavn7tATLLs7IAdmoAlgg46j7OzO9lEzWGAs"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,x,A,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rd(e))?r(e):e},B=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!B(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},V=(e,r,...t)=>e===r||0<t.length&&t.some(r=>V(e,r)),J=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rd(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rd(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>ex(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:eA(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eA=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,eC=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,ej=!1,e$=e=>(ej=!0,e),e_=e=>null==e?Z:ex(e)?e:r=>r[e],eM=(e,r,t)=>(null!=r?r:t)!==Z?(e=e_(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eU=e=>null==e?void 0:e.filter(el),eF=(e,r,t,n)=>null==e?[]:!r&&em(e)?eU(e):e[ei]?function*(e,r){if(null!=e)if(r){r=e_(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),ej){ej=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eM(r,t,n)):ew(e)?function*(e,r){r=e_(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),ej){ej=!1;break}}}(e,eM(r,t,n)):eF(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eq=(e,r,t,n)=>eF(e,r,t,n),eR=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eF(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eF(e,r,l,i),t+1,n,!1),ez=(e,r,t,n)=>{if(r=e_(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!ej;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return ej=!1,i}return null!=e?eb(eq(e,r,t,n)):Z},eW=(e,r,t=1,n=!1,l,i)=>eb(eR(e,r,t,n,l,i)),eB=(...e)=>{var r;return eH(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eK=(e,r,...t)=>null==e?Z:eA(e)?ez(e,e=>r(e,...t)):r(e,...t),eG=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,ej)){ej=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,ej)){ej=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,ej){ej=!1;break}return t})(e,r)}for(var i of eF(e,r,t,n))null!=i&&(l=i);return l}},eH=eG,eY=Object.fromEntries,eZ=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eH(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eH(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eY(ez(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e0=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eF(e,(e,t)=>r(e,t)?e:Z,n,l)),e1=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e0(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eG(e,()=>++l))?t:0},e2=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eG(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e8=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eG(e,r?(e,t)=>!!r(e,t)&&e$(!0):()=>e$(!0),t,n))&&l},e9=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),e7=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),re=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&e7(e,r,n),n)},rr=(e,...r)=>(eH(r,r=>eH(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rr(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eH(t,t=>em(t)?e(r,t[0],t[1]):eH(t,([t,n])=>e(r,t,n))),r)},rn=ea(e7),rl=ea((e,r,t)=>e7(e,r,ex(t)?t(re(e,r)):t)),ri=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):re(e,r)!==rn(e,r,!0),ra=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=re(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},ru=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>ru(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ra(e,r)},rv=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rv(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rv(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rd=e=>ex(e)?e():e,rc=(e,r=-1)=>em(e)?r?e.map(e=>rc(e,r-1)):[...e]:eT(e)?r?eZ(e,([e,t])=>[e,rc(t,r-1)]):{...e}:eO(e)?new Set(r?ez(e,e=>rc(e,r-1)):e):eN(e)?new Map(r?ez(e,e=>[e[0],rc(e[1],r-1)]):e):e,rf=(e,...r)=>null==e?void 0:e.push(...r),rp=(e,...r)=>null==e?void 0:e.unshift(...r),rh=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eH(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rh(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rc(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},rg=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(rg(ee)):performance.timeOrigin+performance.now():Date.now,rm=(e=!0,r=()=>rg())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rb=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rk).resolve(),c=rm(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rw(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rk{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rS,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rw(this,\"_promise\",void 0),this.reset()}}class rS{then(e,r){return this._promise.then(e,r)}constructor(){var e;rw(this,\"_promise\",void 0),rw(this,\"resolve\",void 0),rw(this,\"reject\",void 0),rw(this,\"value\",void 0),rw(this,\"error\",void 0),rw(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rj,rE=(e,r)=>null==e||isFinite(e)?!e||e<=0?rd(r):new Promise(t=>setTimeout(async()=>t(await rd(r)),e)):W(`Invalid delay ${e}.`),rA=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rA(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rO=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=ez(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},rC=(e,r,t)=>null==e?Z:em(r)?null==(r=r[0])?Z:r+\" \"+rC(e,r,t):null==r?Z:1===r?e:null!=t?t:e+\"s\",r$=(e,r,t)=>t?(rj&&rf(t,\"\u001b[\",r,\"m\"),em(e)?rf(t,...e):rf(t,e),rj&&rf(t,\"\u001b[m\"),t):r$(e,r,[]).join(\"\"),rM=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rU=(e,r,t)=>null==e?Z:ex(r)?rO(ez(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rO(ez(e,e=>!1===e?Z:e),null!=r?r:\"\"),rP=e=>(e=Math.log2(e))===(0|e),rq=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rP(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rP(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=ez(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rO(ez(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rR=(...e)=>{var r=(e=>!em(e)&&eA(e)?ez(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(eZ(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rz=Symbol(),rD=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=e_(r),eG(e,(e,t)=>!r||(e=r(e,t))?e$(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rW=(e,r=!0,t)=>null==e?Z:rK(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rB(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rB=(e,r,t=!0)=>rV(e,\"&\",r,t),rV=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:eZ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rD(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eB(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rz]=o),e},rK=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rK(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rG=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rH=/\\z./g,rX=(e,r)=>(r=rU((e=>null!=e?new Set([...eq(e,void 0,void 0,void 0)]):Z)(e0(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rH,rY={},rZ=e=>e instanceof RegExp,rQ=(t,n=[\",\",\" \"])=>{var l;return rZ(t)?t:em(t)?rX(ez(t,e=>{return null==(e=rQ(e,n))?void 0:e.source})):eu(t)?t?/./g:rH:eh(t)?null!=(l=(e=rY)[r=t])?l:e[r]=rK(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rX(ez(r0(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rU(n,rG)}]`)),e=>e&&`^${rU(r0(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rG(r1(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},r0=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r1=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r2=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return rn(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r4=((C=l=l||{})[C.Anonymous=0]=\"Anonymous\",C[C.Indirect=1]=\"Indirect\",C[C.Direct=2]=\"Direct\",C[C.Sensitive=3]=\"Sensitive\",rq(l,!1,\"data classification\")),r6=(e,r)=>{var t;return r4.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r4.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r3.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r3.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r5=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r4.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r3.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r3=((C=i=i||{})[C.None=0]=\"None\",C[C.Necessary=1]=\"Necessary\",C[C.Functionality=2]=\"Functionality\",C[C.Performance=4]=\"Performance\",C[C.Targeting=8]=\"Targeting\",C[C.Security=16]=\"Security\",C[C.Infrastructure=32]=\"Infrastructure\",C[C.Any_Anonymous=49]=\"Any_Anonymous\",C[C.Any=63]=\"Any\",C[C.Server=2048]=\"Server\",C[C.Server_Write=4096]=\"Server_Write\",rq(i,!0,\"data purpose\",2111)),C=rq(i,!1,\"data purpose\",0),r9=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r7=e=>!(null==e||!e.patchTargetId),te=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rq(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:te,purpose:C,purposes:r3,classification:r4}),tn=(rR(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tl=((C=$={})[C.Add=0]=\"Add\",C[C.Min=1]=\"Min\",C[C.Max=2]=\"Max\",C[C.IfMatch=3]=\"IfMatch\",rq($,!(C[C.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rq(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=tu)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rd(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e0(e,e=>e.status<300)),variables:e(e=>ez(e,ta)),values:e(e=>ez(e,e=>{return null==(e=ta(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(ez((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=ta(e[0]))?void 0:e.value}),variable:e(e=>ta(e[0])),result:e(e=>e[0])};return o}),ta=e=>{var r;return to(e)?null!=(r=e.current)?r:e:Z},to=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),tu=(e,r,t)=>{var n,l,i=[],a=ez(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${te.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},tv=e=>e&&\"string\"==typeof e.type,td=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tc=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tf=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tp=(e,r=\"\",t=new Map)=>{if(e)return eA(e)?eH(e,e=>tp(e,r,t)):eh(e)?rK(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tc(n)+\"::\":\"\")+r+tc(l),value:tc(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tf(t,l)}):tf(t,e),t},th=((C=c=c||{})[C.View=-3]=\"View\",C[C.Tab=-2]=\"Tab\",C[C.Shared=-1]=\"Shared\",rq(c,!1,\"local variable scope\")),tm=e=>{var r;return null!=(r=th.format(e))?r:te.format(e)},ty=e=>!!th.tryParse(null==e?void 0:e.scope),tb=rR({scope:th},o),tw=e=>{return null==e?void 0:eh(e)?e:e.source?tw(e.source):`${(e=>{var r;return null!=(r=th.tryParse(e))?r:te(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tk=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tT=()=>()=>W(\"Not initialized.\"),tE=window,tI=document,tx=tI.body,tN=((e=>rj=e)(!!tE.chrome),Q),tO=(e,r,t=(e,r)=>tN<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tI&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tC=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nx(e),et);case\"e\":return L(()=>null==nN?void 0:nN(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tC(e,r[0])):void 0}},tj=(e,r,t)=>tC(null==e?void 0:e.getAttribute(r),t),t$=(e,r,t)=>tO(e,(e,n)=>n(tj(e,r,t))),t_=(e,r)=>{return null==(e=tj(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},tU=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tF=e=>null!=e?e.tagName:null,tq=e=>({x:eC(scrollX,e),y:eC(scrollY,e)}),tR=(e,r)=>r1(e,/#.*$/,\"\")===r1(r,/#.*$/,\"\"),tz=(e,r,t=er)=>(p=tD(e,r))&&Y({xpx:p.x,ypx:p.y,x:eC(p.x/tx.offsetWidth,4),y:eC(p.y/tx.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tD=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tW(e),{x:h,y:g}):void 0,tW=e=>e?(m=e.getBoundingClientRect(),f=tq(ee),{x:eC(m.left+f.x),y:eC(m.top+f.y),width:eC(m.width),height:eC(m.height)}):void 0,tB=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rA(t,t=>eH(r,r=>e.addEventListener(r,t,n)),t=>eH(r,r=>e.removeEventListener(r,t,n)))),tJ=()=>({...f=tq(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tx.offsetWidth,totalHeight:tx.offsetHeight}),tL=new WeakMap,tK=e=>tL.get(e),tG=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tH=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eH((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eH(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&e$(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tp(l,r1(n,/\\-/g,\":\"),t),i)}),tX=()=>{},tY=(e,r)=>{if(w===(w=t6.tags))return tX(e,r);var t=e=>e?rZ(e)?[[e]]:eA(e)?eW(e,t):[eT(e)?[rQ(e.match),e.selector,e.prefix]:[rQ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(ez(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tX=(e,r)=>tH(e,n,r))(e,r)},tZ=(e,r)=>rU(eB(tU(e,tG(r,er)),tU(e,tG(\"base-\"+r,er))),\" \"),tQ={},t0=(e,r,t=tZ(e,\"attributes\"))=>{var n;t&&tH(e,null!=(n=tQ[t])?n:tQ[t]=[{},(e=>rK(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rQ(t||n),,r],!0))(t)],r),tp(tZ(e,\"tags\"),void 0,r)},t1=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tO(e,(e,t)=>t(t1(e,r,ee)),ex(t)?t:void 0):rU(eB(tj(e,tG(r)),tU(e,tG(r,er))),\" \"))?t:n&&(k=tK(e))&&n(k))?t:null},t2=(e,r,t=ee,n)=>\"\"===(S=t1(e,r,t,n))||(null==S?S:es(S)),t4=(e,r,t,n)=>e&&(null==n&&(n=new Map),t0(e,n),tO(e,e=>{tY(e,n),tp(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t6={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t5=[],t3=[],t8=(e,r=0)=>e.charCodeAt(r),t7=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t5[t3[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t3[(16515072&r)>>18],t3[(258048&r)>>12],t3[(4032&r)>>6],t3[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nr={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nt=(e=256)=>e*Math.random()|0,nl={exports:{}},{deserialize:ni,serialize:na}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nl.exports=n})(),($=nl.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),no=\"$ref\",nu=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,ns=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=nu(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[no]||(e[no]=a,u(()=>delete e[no])),{[no]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eA(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?na(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nv=e=>{var r,t,n=e=>ew(e)?e[no]&&(t=(null!=r?r:r=[])[e[no]])?t:(e[no]&&delete(r[e[no]]=e)[no],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?JSON.parse(e):null!=e?L(()=>ni(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nd=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var l,i,a,n=(e,n)=>ep(e)&&!0===n?e:a(e=eh(e)?new Uint8Array(ez(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(ns(e,!1,t))):ns(e,!0,t),n);return r?[e=>ns(e,!1,t),e=>null==e?Z:L(()=>nv(e),Z),(e,r)=>n(e,r)]:([l,i,a]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nt()));for(t=0,i[n++]=g(d^16*nt(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nt();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=nr[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t7)(l(ns(e,!0,t))),e=>null!=e?nv(i(e instanceof Uint8Array?e:(e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t5[t8(e,t++)]<<2|(r=t5[t8(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t5[t8(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t5[t8(e,t++)]);return i})(e))):null,(e,r)=>n(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[nc,,]=(nd(),nd(null,{json:!0,prettify:!0})),C=r0(\"\"+tI.currentScript.src,\"#\"),rq=r0(\"\"+(C[1]||\"\"),\";\"),ng=C[0],nm=rq[1]||(null==(rR=rW(ng,!1))?void 0:rR.host),ny=e=>{return!(!nm||(null==(e=rW(e,!1))||null==(e=e.host)?void 0:e.endsWith(nm))!==er)},o=(...e)=>r1(rU(e),/(^(?=\\?))|(^\\.(?=\\/))/,ng.split(\"?\")[0]),nw=o(\"?\",\"var\"),nk=o(\"?\",\"mnt\"),nS=(o(\"?\",\"usr\"),Symbol()),nT=Symbol(),nE=(e,r,t=er,n=ee)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":r$(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nT];null!=(e=t?e[nS]:e)&&console.log(ew(e)?r$(nc(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nE(e,r,t,!0)),r&&console.groupEnd()},[nI,nx]=nd(),[nA,nN]=[tT,tT],[$,nC]=ea(),n_=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nM,nU]=ea(),[nF,nP]=ea(),nq=e=>nz!==(nz=e)&&nU(nz=!1,nB(!0,!0)),nR=e=>nD!==(nD=!!e&&\"visible\"===document.visibilityState)&&nP(nD,!e,nW(!0,!0)),nz=(nM(nR),!0),nD=!1,nW=rm(!1),nB=rm(!1),nV=(tB(window,[\"pagehide\",\"freeze\"],()=>nq(!1)),tB(window,[\"pageshow\",\"resume\"],()=>nq(!0)),tB(document,\"visibilitychange\",()=>(nR(!0),nD&&nq(!0))),nU(nz,nB(!0,!0)),!1),nJ=rm(!1),[,nK]=ea(),nG=rb({callback:()=>nV&&nK(nV=!1,nJ(!1)),frequency:2e4,once:!0,paused:!0}),C=()=>!nV&&(nK(nV=!0,nJ(!0)),nG.restart()),nX=(tB(window,[\"focus\",\"scroll\"],C),tB(window,\"blur\",()=>nG.trigger()),tB(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],C),C(),()=>nJ()),nY=0,nZ=void 0,nQ=()=>(null!=nZ?nZ:tT())+\"_\"+n0(),n0=()=>(rg(!0)-(parseInt(nZ.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nY).toString(36),n4={},n6={id:nZ,heartbeat:rg()},n5={knownTabs:{[nZ]:n6},variables:{}},[n3,n8]=ea(),[n9,n7]=ea(),le=tT,lr=e=>n4[tw(e)],lt=(...e)=>ll(e.map(e=>(e.cache=[rg(),3e3],tb(e)))),ln=e=>ez(e,e=>e&&[e,n4[tw(e)]]),ll=e=>{var r=ez(e,e=>e&&[tw(e),e]);null!=r&&r.length&&(e=ln(e),rn(n4,r),(r=e0(r,e=>e[1].scope>c.Tab)).length&&(rn(n5.variables,r),le({type:\"patch\",payload:eZ(r)})),n7(e,n4,!0))},[,la]=($((e,r)=>{nM(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nZ=null!=(n=null==t?void 0:t[0])?n:rg(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n4=eZ(eB(e0(n4,([,e])=>e.scope===c.View),ez(null==t?void 0:t[1],e=>[tw(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nZ,ez(n4,([,e])=>e.scope!==c.View?e:void 0)]))},!0),le=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nZ,r,t])),localStorage.removeItem(\"_tail:state\"))},tB(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nZ||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||le({type:\"set\",payload:n5},e):\"set\"===i&&t.active?(rn(n5,a),rn(n4,a.variables),t.trigger()):\"patch\"===i?(o=ln(ez(a,1)),rn(n5.variables,a),rn(n4,a),n7(o,n4,!1)):\"tab\"===i&&(rn(n5.knownTabs,e,a),a)&&n8(\"tab\",a,!1))});var t=rb(()=>n8(\"ready\",n5,!0),-25),n=rb({callback(){var e=rg()-1e4;eH(null==n5?void 0:n5.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ra(e,r)))):t.push(ra(e,u)):(em(u)?(n=!0,u.forEach(r=>l(re(e,r),i+1,e,r))):l(re(e,u),i+1,e,u),!e1(e)&&a&&ru(a,o)))};return l(e,0),n?t:t[0]})(n5.knownTabs,[r])),n6.heartbeat=rg(),le({type:\"tab\",payload:n6})},frequency:5e3,paused:!0});nM(e=>(e=>{le({type:\"tab\",payload:e?n6:void 0}),e?(t.restart(),le({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[lo,lu]=ea(),ls=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nN:nx)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nA:nI)([nZ,rg()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<rg())&&(a(),(null==(v=l())?void 0:v[0])===nZ))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rS,[v]=tB(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rE(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),lv=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(la(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nA(l,!0):JSON.stringify(l))};if(!t)return ls(()=>(async r=>{var l,i;for(i of eq(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),ej){ej=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?e$(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rE(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nN:JSON.parse)?void 0:a(r):Z)&&lu(a),e$(a)):e$()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&W(\"Beacon send failed.\")},rq=[\"scope\",\"key\",\"targetId\",\"version\"],lc=[...rq,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lf=[...rq,\"init\",\"purpose\",\"refresh\"],lp=[...lc,\"value\",\"force\",\"patch\"],lh=new Map,lg=(e,r)=>{var t=rb(async()=>{var e=ez(lh,([e,r])=>({...tk(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eK(r,r=>re(lh,e,()=>new Set).add(r)),o=(nM((e,r)=>t.toggle(e,e&&3e3<=r),!0),n9(e=>eH(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tw(e),null==(i=ru(lh,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&B(null==e?void 0:e.value,null==r?void 0:r.value)||eH(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>rn(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tl(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=ez(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await lv(e,()=>!!(c=ez(c,([e,r])=>{if(e){var t,l=tw(e),i=(n(l,e.result),lr(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<rg())rf(v,[{...i,status:s.Success},r]);else{if(!ty(e))return[rv(e,lf),r];eT(e.init)&&null!=(t={...tb(e),status:s.Created,...e.init}).value&&(rf(f,d(t)),rf(v,[t,r]))}else rf(v,[{...e,status:s.Denied,error:\"No consent for \"+r3.logFormat(l)},r])}})).length&&{variables:{get:ez(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rf(v,...ez(a,(e,r)=>e&&[e,c[r][1]])),f.length&&ll(f),v.map(([e])=>e)},ez(t,e=>null==e?void 0:e.error)),set:(...t)=>tl(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=ez(t,(e,r)=>{var a,n;if(e)return n=tw(e),a=lr(n),u(n,e.cache),ty(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:th(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rf(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rv(e,lp),r])}),a=c.length?J(null==(a=(await lv(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&ll(o),eH(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},ez(t,e=>null==e?void 0:e.error))},d=(e,r=rg())=>{return{...rv(e,lc),cache:[r,r+(null!=(r=ru(o,tw(e)))?r:3e3)]}};return lo(({variables:e})=>{var r;e&&(r=rg(),null!=(e=eB(ez(e.get,e=>ta(e)),ez(e.set,e=>ta(e)))))&&e.length&&ll(eK(e,d,r))}),v},ly=Symbol(),lb=[.75,.33],lw=[.25,.33],lT=()=>{var l,a,i,t=null==tE?void 0:tE.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tE.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tE.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lE=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==x?void 0:x.clientId,languages:ez(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lT()})),lI=(e,r=\"A\"===tF(e)&&tj(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lx=(e,r=tF(e),t=t2(e,\"button\"))=>t!==ee&&(V(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&V(t_(e,\"type\"),\"button\",\"submit\")||t===er),lA=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rM((null==(t=tj(e,\"title\"))?void 0:t.trim())||(null==(t=tj(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tW(e):void 0}},lO=e=>{if(I)return I;eh(e)&&([t,e]=nx(e),e=nd(t)[1](e)),rn(t6,e),(e=>{nN===tT&&([nA,nN]=nd(e),nC(nA,nN))})(ru(t6,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=ru(t6,\"key\"),i=null!=(e=null==(t=tE[t6.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e0(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>n_(e,r))(n)))},s=[],d=lg(nw,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nQ()),null==e.timestamp&&(e.timestamp=rg()),h=er;var n=ee;return ez(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rr(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),nE({[nT]:ez(t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rr(e,{metadata:{posted:!0}}),rr(r9(rc(e),!0),{timestamp:e.timestamp-rg()}))),e=>[e,e.type,ee])},\"Posting \"+rO([rC(\"new event\",[e1(t,e=>!r7(e))||void 0]),rC(\"event patch\",[e1(t,e=>r7(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),lv(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=ez(eb(e),e=>rr(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eH(e,e=>nE(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rp(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rf(n,...e)};return rb(()=>u([],{flush:!0}),5e3),nF((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=ez(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eB(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rc(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rh(r(i,s),i))?t:[];if(t&&!B(v,i))return l.set(e,rc(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nw,v),f=null,p=0,g=h=ee,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(e=(t=e[0]).match(/^[{[]/)?JSON.parse(t):nx(t));var r,n=ee;if((e=e0(eW(e,e=>eh(e)?nx(e):e),e=>{if(!e)return ee;if(l5(e))t6.tags=rn({},t6.tags,e.tagAttributes);else{if(l3(e))return t6.disabled=e.disable,ee;if(l7(e))return n=er,ee;if(ia(e))return e(I),ee}return g||ir(e)||l9(e)?er:(s.push(e),ee)})).length||n){var t=e9(e,e=>l9(e)?-100:ir(e)?-50:ii(e)?-10:tv(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,tv(e))c.post(e);else if(ie(e))d.get(...eb(e.get));else if(ii(e))d.set(...eb(e.set));else if(ir(e))rf(o,e.listener);else if(l9(e))(r=L(()=>e.extension.setup(I),r=>n_(e.extension.id,r)))&&(rf(a,[null!=(t=e.priority)?t:100,r,e.extension]),e9(a,([e])=>e));else if(ia(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||n_(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>n_(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tE,t6.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+nQ(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n9((e,r,t)=>{var n=eB(null==(n=tn(ez(e,1)))?void 0:n.map(e=>[e,`${e.key} (${tm(e.scope)}, ${e.scope<0?\"client-side memory only\":r3.format(e.purposes)})`,ee]),[[{[nT]:null==(n=tn(ez(r,1)))?void 0:n.map(e=>[e,`${e.key} (${tm(e.scope)}, ${e.scope<0?\"client-side memory only\":r3.format(e.purposes)})`,ee])},\"All variables\",er]]);nE({[nT]:n},r$(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e1(r)} in total).`,\"2;3\"))}),n3(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>tu(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lE(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...ez(l1,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t6.name}\" is used for something else than an array of queued commands.`)},lC=()=>null==x?void 0:x.clientId,lj={scope:\"shared\",key:\"referrer\"},l$=(e,r)=>{I.variables.set({...lj,value:[lC(),e]}),r&&I.variables.get({scope:lj.scope,key:lj.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},l_=rm(),lM=rm(),lU=1,[lP,lq]=ea(),lR=e=>{var r=rm(e,l_),t=rm(e,lM),n=rm(e,nX),l=rm(e,()=>lU);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lz=lR(),[lW,lB]=ea(),lV=(e,r)=>(r&&eH(lL,r=>e(r,()=>!1)),lW(e)),lJ=new WeakSet,lL=document.getElementsByTagName(\"iframe\");function lG(e){if(e){if(null!=e.units&&V(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lX=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lY=e=>t4(e,r=>r!==e&&!!lX(re(tL,r)),e=>(re(tL,e),(N=re(tL,e))&&eW(eB(N.component,N.content,N),\"tags\"))),lZ=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&ez(O,e=>({...e,rect:void 0}))},lQ=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tO(e,e=>{var s,i,l=re(tL,e);l&&(lX(l)&&(i=e0(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e8(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tW(e)||void 0,s=lY(e),l.content&&rp(a,...ez(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rp(o,...ez(i,e=>{var r;return u=e2(u,null!=(r=e.track)&&r.secondary?1:2),lZ({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t1(e,\"area\"))&&rp(o,...ez(eb(i)))}),a.length&&rf(o,lZ({id:\"\",rect:n,content:a})),eH(o,e=>{eh(e)?rf(null!=l?l:l=[],e):(null==e.area&&(e.area=rU(l,\"/\")),rp(null!=i?i:i=[],e))}),i||l?{components:i,area:rU(l,\"/\")}:void 0},l0=Symbol(),l1=[{id:\"context\",setup(e){rb(()=>eH(lL,e=>ri(lJ,e)&&lB(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==x||null==r||!r.value||null!=x&&x.definition?n=null==r?void 0:r.value:(x.definition=r.value,null!=(r=x.metadata)&&r.posted&&e.events.postPatch(x,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=lr({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=lr({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&lt({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=lr({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=lr({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tR(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rW(location.href+\"\",!0),x={type:\"view\",timestamp:rg(),clientId:nQ(),tab:nZ,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tJ(),duration:lz(void 0,!0)},0===d&&(x.firstTab=er),0===d&&0===v&&(x.landingPage=er),lt({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rB(location.href),ez([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=x).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(x.navigationType=A)&&performance&&ez(performance.getEntriesByType(\"navigation\"),e=>{x.redirects=e.redirectCount,x.navigationType=r1(e.type,/\\_/g,\"-\")}),A=void 0,\"navigate\"===(null!=(r=x.navigationType)?r:x.navigationType=\"navigate\")&&(p=null==(l=lr(lj))?void 0:l.value)&&ny(document.referrer)&&(x.view=null==p?void 0:p[0],x.relatedEventId=null==p?void 0:p[1],e.variables.set({...lj,value:void 0})),(p=document.referrer||null)&&!ny(p)&&(x.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rW(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),x.definition=n,n=void 0,e.events.post(x),e.events.registerEventPatchSource(x,()=>({duration:lz()})),lq(x))};return nF(e=>{e?(lM(er),++lU):lM(ee)}),tB(window,\"popstate\",()=>(A=\"back-forward\",f())),ez([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),A=\"navigate\",f()}}),f(),{processCommand:r=>l6(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!x||td(e)||r7(e)||(e.view=x.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eH(e,e=>{var r,t;return null==(r=(t=e.target)[ly])?void 0:r.call(t,e)})),t=new Set,n=(rb({callback:()=>eH(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tI.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e0(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e1(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rm(!1,nX),!1,!1,0,0,0,r2()];i[4]=r,i[5]=t,i[6]=n},y=[r2(),r2()],b=lR(!1),w=rm(!1,nX),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,x=S/r.width||0,A=f?lw:lb,I=(A[0]*a<T||A[0]<I)&&(A[0]*t<S||A[0]<x);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t6.impressionThreshold-250)&&(++h,b(f),s||e(s=e0(ez(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t2(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tz(i),viewport:tJ(),timeOffset:lz(),impressions:h,...lQ(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=ez(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:eC(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:eC(a/u+100*o/a),readTime:eC(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var j=tI.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=j.nextNode());){var M,U,F,z,D,q=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=q;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+q),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}A=r.left<0?-r.left:0,x=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(x,x+T)*y[1].push(A,A+S)/I),u&&eH(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[ly]=({isIntersecting:e})=>{rn(t,S,e),e||(eH(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{rl(tL,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eB(null==e?void 0:e.component,n.component),content:eB(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eB(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,re(tL,e))};return{decorate(e){eH(e.components,e=>ru(e,\"track\"))},processCommand:e=>l8(e)?(n(e),er):il(e)?(ez(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!re(n,l))for(var i=[];null!=tj(l,e);){ri(n,l);var a,o=r0(tj(l,e),\"|\");tj(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rf(i,v)}}}rf(t,...ez(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tB(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tO(n.target,e=>{lx(e)&&null==a&&(a=e),s=s||\"NAV\"===tF(e);var r,v=tK(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eH(e.querySelectorAll(\"a,button\"),r=>lx(r)&&(3<(null!=u?u:u=[]).length?e$():u.push({...lA(r,!0),component:tO(r,(e,r,t,n=null==(l=tK(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t2(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e8(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=t2(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e8(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lQ(o,!1,d),f=t4(o,void 0,e=>{return ez(eb(null==(e=re(tL,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tz(a,n),viewport:tJ()}:null,...((e,r)=>{var n;return tO(null!=e?e:r,e=>\"IMG\"===tF(e)||e===r?(n={element:lA(e,!1)},ee):er),n})(n.target,o),...c,timeOffset:lz(),...f});if(a)if(lI(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rW(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nQ(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tj(h,\"target\")!==window.name?(l$(w.clientId),w.self=ee,e(w)):tR(location.href,h.href)||(w.exit=w.external,l$(w.clientId))):(k=h.href,(b=ny(k))?l$(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t6.captureContextMenu&&(h.href=nk+\"=\"+T+encodeURIComponent(k),tB(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tB(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tO(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&V(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tK(e))?void 0:t.cart)?t:t1(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eG(e,(e,t)=>e,void 0,void 0))(null==(t=tK(e))?void 0:t.content))&&r(v)});c=lG(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&rl(r,o,t=>{var l=tD(o,n);return t?rf(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:re(r,o)}),!0,o)),t})}})};t(document),lV(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tq(er);lP(()=>{return e=()=>(r={},t=tq(er)),setTimeout(e,250);var e}),tB(window,\"scroll\",()=>{var i,n=tq(),l={x:(f=tq(ee)).x/(tx.offsetWidth-window.innerWidth)||0,y:f.y/(tx.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rf(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rf(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rf(i,\"page-end\")),(n=ez(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l4(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lG(t))&&e({...t,type:\"cart_updated\"}),er):it(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||t$(e,tG(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rM(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=t$(i,tG(\"ref\"))||\"track_ref\",s=re(t,i,()=>{var r,t=new Map,n={type:\"form\",name:t$(i,tG(\"form-name\"))||tj(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lz()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tB(i,\"submit\",()=>{l=lQ(i),r[3]=3,s(()=>{(i.isConnected&&0<tW(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tW(i).width)),e.events.postPatch(n,{...l,totalTime:rg(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,rg(er),1]}),re(s[1],r)||ez(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r1(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l0]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t2(e,\"ref\")||(e.value||(e.value=r1(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lM())),d=-(s-(s=rg(er))),c=l[l0],(l[l0]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eH(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tB(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=rg(er),u=lM()):o()));v(document),lV(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,n=async r=>{var n;if(r)return!(n=await t())||r6(n,r=r5(r))?[!1,n]:(n={level:r4.lookup(r.classification),purposes:r3.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},l={},r={necessary:1,preferences:2,statistics:4,marketing:8};return e({consent:{externalSource:{key:\"Cookiebot\",poll(){var n,e=null==(e=tI.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return n=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,t,l)=>{return\"true\"===l&&(n|=null!=(l=r[t])?l:0),\"\"}),{level:1<n?1:0,purposes:n}}}}}),{processCommand(e){var i,a,r,s,v;return io(e)?((r=e.consent.get)&&t(r),(i=r5(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await n(i))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(r=l[v])?r:l[v]=rb({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e,t,l;tI.hasFocus()&&(e=a.poll())&&(e=r5({...s,...e}))&&!r6(s,e)&&([t,l]=await n(e),t&&nE(l,\"Consent was updated from \"+v),s=e)}).trigger()),er):ee}}}}],rR=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l4=rR(\"cart\"),l6=rR(\"username\"),l5=rR(\"tagAttributes\"),l3=rR(\"disable\"),l8=rR(\"boundary\"),l9=rR(\"extension\"),l7=rR(er,\"flush\"),ie=rR(\"get\"),ir=rR(\"listener\"),it=rR(\"order\"),il=rR(\"scan\"),ii=rR(\"set\"),ia=e=>\"function\"==typeof e,io=rR(\"consent\");Object.defineProperty(tE,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lO)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
};

function _define_property$c(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
/**
 * A crypto provider based on linear feedback XOR, entropy and padding.
 */ class DefaultCryptoProvider {
    hash(value, numericOrBits) {
        return this._ciphers[this._currentCipherId][2](value, numericOrBits);
    }
    decrypt(cipher) {
        let cipherId = "";
        cipher = cipher.replace(/^(.*?)!/, (_, m1)=>(cipherId = m1, ""));
        var _this__ciphers_cipherId;
        return ((_this__ciphers_cipherId = this._ciphers[cipherId]) !== null && _this__ciphers_cipherId !== void 0 ? _this__ciphers_cipherId : this._ciphers[this._currentCipherId])[1](cipher);
    }
    encrypt(source) {
        return `${this._currentCipherId}!${this._ciphers[this._currentCipherId][0](source)}`;
    }
    constructor(keys){
        _define_property$c(this, "_currentCipherId", void 0);
        _define_property$c(this, "_ciphers", void 0);
        if (!(keys === null || keys === void 0 ? void 0 : keys.length)) {
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
                var _patchTarget, _selector;
                var _;
                patchTarget = i ? current = (_ = (_patchTarget = patchTarget)[_selector = selector]) !== null && _ !== void 0 ? _ : _patchTarget[_selector] = {} : value !== null && value !== void 0 ? value : value = {};
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
            var _patched, _patched1;
            var _classification;
            (_classification = (_patched = patched).classification) !== null && _classification !== void 0 ? _classification : _patched.classification = dataClassification.parse(current === null || current === void 0 ? void 0 : current.classification);
            var _purposes;
            (_purposes = (_patched1 = patched).purposes) !== null && _purposes !== void 0 ? _purposes : _patched1.purposes = dataPurposes.parse(current === null || current === void 0 ? void 0 : current.purposes);
            !("tags" in patched) && (patched.tags = current === null || current === void 0 ? void 0 : current.tags);
        }
        return patched !== null && patched !== void 0 ? patched : undefined;
    }
    var _setter_purposes;
    const classification = {
        classification: dataClassification.parse(setter.classification, false),
        purposes: dataPurposes((_setter_purposes = setter.purposes) !== null && _setter_purposes !== void 0 ? _setter_purposes : current === null || current === void 0 ? void 0 : current.purposes)
    };
    const value = current === null || current === void 0 ? void 0 : current.value;
    setter.patch = patchType.parse(setter.patch);
    switch(setter.patch){
        case VariablePatchType.Add:
            return {
                ...classification,
                value: patchSelector(requireNumberOrUndefined(value), setter.selector, (value)=>{
                    var _ref;
                    return ((_ref = value !== null && value !== void 0 ? value : setter.seed) !== null && _ref !== void 0 ? _ref : 0) + setter.value;
                })
            };
        case VariablePatchType.Min:
        case VariablePatchType.Max:
            return {
                ...classification,
                value: patchSelector(value, setter.selector, (value)=>requireNumberOrUndefined(value) ? Math[setter.patch === VariablePatchType.Min ? "min" : "max"](value, setter.value) : setter.value)
            };
        case VariablePatchType.IfMatch:
        case VariablePatchType.IfNoneMatch:
            if ((current === null || current === void 0 ? void 0 : current.value) === setter.match === (setter.patch === VariablePatchType.IfNoneMatch)) {
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
const mergeKeys = async (results, partitionMappings, partitionResults)=>(partitionMappings === null || partitionMappings === void 0 ? void 0 : partitionMappings.length) ? (await partitionResults(partitionMappings.map((item)=>item === null || item === void 0 ? void 0 : item[1]))).forEach((result, i)=>result && (results[partitionMappings[i][0]] = result)) : undefined;

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
    ]) : clientConfig)})),true);s.src=${JSON.stringify(config.src + (BUILD_REVISION_QUERY ? (config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY : ""))};d.head.appendChild(s)})();`;
};
const generateClientExternalNavigationScript = (requestId, url)=>{
    // TODO: Update if we decide to change the client to use BroadcastChannel (that would be, if Chrome fixes the bf_cache issues
    // where BroadcastChannel makes the page unsalvageable)
    return `<html><head><script>try{localStorage.setItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)},${JSON.stringify(JSON.stringify({
        requestId
    }))});localStorage.removeItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)});}catch(e){console.error(e);}location.replace(${JSON.stringify(url)});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};

function _define_property$b(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
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
    async applyExtensions(tracker, context) {
        for (const extension of this._extensions){
            // Call the apply method in post context to let extension do whatever they need before events are processed (e.g. initialize session).
            try {
                var _extension_apply;
                await ((_extension_apply = extension.apply) === null || _extension_apply === void 0 ? void 0 : _extension_apply.call(extension, tracker, context));
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
            var _this_environment_storage_initialize, _this_environment_storage;
            if (this._initialized) return;
            let { host, crypto, environmentTags, encryptionKeys, schemas, storage } = this._config;
            schemas !== null && schemas !== void 0 ? schemas : schemas = [];
            if (!schemas.find((schema)=>isPlainObject(schema) && schema.$id === "urn:tailjs:core")) {
                schemas.unshift(index);
            }
            for (const [schema, i] of rank(schemas)){
                if (isString(schema)) {
                    schemas[i] = JSON.parse(required(await host.readText(schema), ()=>`The schema path '${schema}' does not exists`));
                }
            }
            if (!storage) {
                var _this__config_sessionTimeout;
                storage = {
                    default: {
                        storage: new InMemoryStorage({
                            [VariableScope.Session]: ((_this__config_sessionTimeout = this._config.sessionTimeout) !== null && _this__config_sessionTimeout !== void 0 ? _this__config_sessionTimeout : 30) * MINUTE
                        }),
                        schema: "*"
                    }
                };
            }
            this._schema = SchemaManager.create(schemas);
            this.environment = new TrackerEnvironment(host, crypto !== null && crypto !== void 0 ? crypto : new DefaultCryptoProvider(encryptionKeys), new ParsingVariableStorage(new VariableStorageCoordinator({
                schema: this._schema,
                mappings: storage
            })), environmentTags);
            if (this._config.debugScript) {
                if (typeof this._config.debugScript === "string") {
                    var _ref;
                    this._script = (_ref = await this.environment.readText(this._config.debugScript, async (_, newText)=>{
                        const updated = await newText();
                        if (updated) {
                            this._script = updated;
                        }
                        return true;
                    })) !== null && _ref !== void 0 ? _ref : undefined;
                } else {
                    var _ref1;
                    this._script = (_ref1 = await this.environment.readText("js/tail.debug.map.js")) !== null && _ref1 !== void 0 ? _ref1 : scripts.debug;
                }
            }
            await ((_this_environment_storage_initialize = (_this_environment_storage = this.environment.storage).initialize) === null || _this_environment_storage_initialize === void 0 ? void 0 : _this_environment_storage_initialize.call(_this_environment_storage, this.environment));
            this._extensions = [
                Timestamps,
                new TrackerCoreEvents(),
                new CommerceExtension(),
                ...await Promise.all(this._extensionFactories.map(async (factory)=>{
                    let extension = null;
                    try {
                        extension = await factory();
                        if (extension === null || extension === void 0 ? void 0 : extension.initialize) {
                            var _extension_initialize;
                            await ((_extension_initialize = extension.initialize) === null || _extension_initialize === void 0 ? void 0 : _extension_initialize.call(extension, this.environment));
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
            passive: !!(options === null || options === void 0 ? void 0 : options.passive)
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
                    var _sourceIndices_get;
                    validationErrors.push({
                        // The key for the source index of a validation error may be the error itself during the initial validation.
                        sourceIndex: (_sourceIndices_get = sourceIndices.get(item.source)) !== null && _sourceIndices_get !== void 0 ? _sourceIndices_get : sourceIndices.get(item),
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
                    var _extension_post;
                    var _ref;
                    (_ref = await ((_extension_post = extension.post) === null || _extension_post === void 0 ? void 0 : _extension_post.call(extension, eventBatch, tracker, context))) !== null && _ref !== void 0 ? _ref : Promise.resolve();
                } catch (e) {
                    extensionErrors[extension.id] = e instanceof Error ? e : new Error(e === null || e === void 0 ? void 0 : e.toString());
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
        const headers = Object.fromEntries(Object.entries(sourceHeaders !== null && sourceHeaders !== void 0 ? sourceHeaders : sourceHeaders = {}).filter(([, v])=>!!v).map(([k, v])=>[
                k.toLowerCase(),
                Array.isArray(v) ? v.join(",") : v
            ]));
        let trackerInitializationOptions;
        let trackerSettings = deferred(async ()=>{
            var _headers_xforwardedfor, _obj;
            var _headers_xforwardedfor_, _ref;
            clientIp !== null && clientIp !== void 0 ? clientIp : clientIp = (_ref = (_headers_xforwardedfor_ = (_headers_xforwardedfor = headers["x-forwarded-for"]) === null || _headers_xforwardedfor === void 0 ? void 0 : _headers_xforwardedfor[0]) !== null && _headers_xforwardedfor_ !== void 0 ? _headers_xforwardedfor_ : (_obj = obj(parseQueryString(headers["forwarded"]))) === null || _obj === void 0 ? void 0 : _obj["for"]) !== null && _ref !== void 0 ? _ref : undefined;
            let clientEncryptionKey;
            if (this._config.clientEncryptionKeySeed) {
                clientEncryptionKey = await this._clientIdGenerator.generateClientId(this.environment, request, true, this._config.clientEncryptionKeySeed);
            }
            var _this__config_clientEncryptionKeySeed;
            return {
                headers,
                host,
                path,
                url,
                queryString: Object.fromEntries(Object.entries(query !== null && query !== void 0 ? query : {}).map(([key, value])=>[
                        key,
                        !value ? [] : Array.isArray(value) ? value.map((value)=>value || "") : [
                            value
                        ]
                    ])),
                clientIp,
                clientId: await this._clientIdGenerator.generateClientId(this.environment, request, false, (_this__config_clientEncryptionKeySeed = this._config.clientEncryptionKeySeed) !== null && _this__config_clientEncryptionKeySeed !== void 0 ? _this__config_clientEncryptionKeySeed : ""),
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
                var _response_headers;
                var _response;
                var _headers;
                (_headers = (_response = response).headers) !== null && _headers !== void 0 ? _headers : _response.headers = {};
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
                    var _response_headers1;
                    response.body = ((_response_headers1 = response.headers) === null || _response_headers1 === void 0 ? void 0 : _response_headers1["content-type"]) === "application/json" || json ? JSON.stringify(response.body) : (await trackerSettings()).transport[0](response.body, true);
                }
                if (isString(response.body) && !((_response_headers = response.headers) === null || _response_headers === void 0 ? void 0 : _response_headers["content-type"])) {
                    var // This is probably a lie, but we pretend everything is text to avoid preflight.
                    _response1;
                    var _headers1;
                    ((_headers1 = (_response1 = response).headers) !== null && _headers1 !== void 0 ? _headers1 : _response1.headers = {})["content-type"] = "text/plain";
                }
            }
            return {
                tracker: resolveTracker,
                response: response
            };
        };
        try {
            let requestPath = path;
            if (requestPath === this.endpoint) {
                let queryValue;
                switch(method.toUpperCase()){
                    case "GET":
                        {
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[INIT_SCRIPT_QUERY])) != null) {
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
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[CLIENT_SCRIPT_QUERY])) != null) {
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
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[CONTEXT_NAV_QUERY])) != null) {
                                var _this;
                                // The user navigated via the context menu in their browser.
                                // If the user has an active session we respond with a small script, that will push the request ID
                                // that caused the navigation to the other browser tabs.
                                // If there is no session it means the user might have shared the link with someone else,
                                // and we must not set any cookies or do anything but redirect since it does not count as a visit to the site.
                                trackerInitializationOptions = {
                                    passive: true
                                };
                                var _match;
                                const [, requestId, targetUri] = (_match = match(join(queryValue), /^([0-9]*)(.+)$/)) !== null && _match !== void 0 ? _match : [];
                                if (!targetUri) return result({
                                    status: 400
                                });
                                if (!requestId || // We need to initialize the tracker to see if it has a session.
                                !((_this = await resolveTracker()) === null || _this === void 0 ? void 0 : _this.sessionId)) {
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
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[SCHEMA_QUERY])) != null) {
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
                                var _headers_acceptencoding;
                                var _headers_acceptencoding_split_map;
                                const accept = (_headers_acceptencoding_split_map = (_headers_acceptencoding = headers["accept-encoding"]) === null || _headers_acceptencoding === void 0 ? void 0 : _headers_acceptencoding.split(",").map((value)=>value.toLowerCase().trim())) !== null && _headers_acceptencoding_split_map !== void 0 ? _headers_acceptencoding_split_map : [];
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
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[EVENT_HUB_QUERY])) != null) {
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
                                        if (headers["sec-fetch-dest"]) {
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
                                            var _response;
                                            var _variables;
                                            ((_variables = (_response = response).variables) !== null && _variables !== void 0 ? _variables : _response.variables = {}).get = await resolvedTracker.get(postRequest.variables.get, {
                                                client: true
                                            }).all;
                                        }
                                        if (postRequest.variables.set) {
                                            var _response1;
                                            var _variables1;
                                            ((_variables1 = (_response1 = response).variables) !== null && _variables1 !== void 0 ? _variables1 : _response1.variables = {}).set = await resolvedTracker.set(postRequest.variables.set, {
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
            trackerScript.push(PLACEHOLDER_SCRIPT$1(trackerRef, true));
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
                src: `${this.endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName ? `#${this._trackerName}` : ""}`,
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
                return html ? `<script src='${script.src}?${INIT_SCRIPT_QUERY}${BUILD_REVISION_QUERY ? "&" + BUILD_REVISION_QUERY : ""}'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
    constructor(config){
        _define_property$b(this, "_cookies", void 0);
        _define_property$b(this, "_extensionFactories", void 0);
        _define_property$b(this, "_lock", createLock());
        _define_property$b(this, "_schema", void 0);
        _define_property$b(this, "_trackerName", void 0);
        _define_property$b(this, "_extensions", void 0);
        _define_property$b(this, "_initialized", false);
        _define_property$b(this, "_script", void 0);
        _define_property$b(this, "_clientConfig", void 0);
        _define_property$b(this, "_config", void 0);
        _define_property$b(this, "_defaultConsent", void 0);
        /** @internal */ _define_property$b(this, "_cookieNames", void 0);
        _define_property$b(this, "endpoint", void 0);
        _define_property$b(this, "environment", void 0);
        /** @internal */ _define_property$b(this, "_clientIdGenerator", void 0);
        let { trackerName, endpoint, extensions, cookies, client, clientIdGenerator, defaultConsent } = config = merge({}, DEFAULT, config);
        this._config = config;
        this._trackerName = trackerName;
        this.endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
        this._defaultConsent = {
            level: dataClassification(defaultConsent.level),
            purposes: dataPurposes(defaultConsent.purposes)
        };
        this._extensionFactories = map(extensions);
        this._cookies = new CookieMonster(cookies);
        this._clientIdGenerator = clientIdGenerator !== null && clientIdGenerator !== void 0 ? clientIdGenerator : new DefaultClientIdGenerator();
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
            src: this.endpoint
        };
    }
}

function _define_property$a(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
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
    get clientEvents() {
        return this._clientEvents;
    }
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
        var _this__session;
        return (_this__session = this._session) === null || _this__session === void 0 ? void 0 : _this__session.value;
    }
    get sessionId() {
        var _this_session;
        return (_this_session = this.session) === null || _this_session === void 0 ? void 0 : _this_session.id;
    }
    get deviceSessionId() {
        var _this__session_value, _this__session;
        return (_this__session = this._session) === null || _this__session === void 0 ? void 0 : (_this__session_value = _this__session.value) === null || _this__session_value === void 0 ? void 0 : _this__session_value.deviceSessionId;
    }
    get device() {
        var _this__device;
        return (_this__device = this._device) === null || _this__device === void 0 ? void 0 : _this__device.value;
    }
    get deviceId() {
        var _this__session_value, _this__session;
        return (_this__session = this._session) === null || _this__session === void 0 ? void 0 : (_this__session_value = _this__session.value) === null || _this__session_value === void 0 ? void 0 : _this__session_value.deviceId;
    }
    get authenticatedUserId() {
        var _this__session_value, _this__session;
        return (_this__session = this._session) === null || _this__session === void 0 ? void 0 : (_this__session_value = _this__session.value) === null || _this__session_value === void 0 ? void 0 : _this__session_value.userId;
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
        var _CookieMonster_parseCookieHeader;
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
            ]), map((_CookieMonster_parseCookieHeader = CookieMonster.parseCookieHeader(finalRequest.headers["cookies"])) === null || _CookieMonster_parseCookieHeader === void 0 ? void 0 : _CookieMonster_parseCookieHeader[requestCookies], ([name, cookie])=>[
                name,
                cookie.value
            ]))), ([...args])=>args.map((value)=>encodeURIComponent(value !== null && value !== void 0 ? value : "")).join("=")).join("; ");
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
            var _result, _ref;
            var _variables, _get;
            ((_get = (_ref = (_variables = (_result = result).variables) !== null && _variables !== void 0 ? _variables : _result.variables = {}).get) !== null && _get !== void 0 ? _get : _ref.get = []).push(...this._changedVariables);
        }
        return result;
    }
    // #region DeviceData
    async _loadCachedDeviceVariables() {
        // Loads device variables into cache.
        const variables = this._getClientDeviceVariables();
        if (variables) {
            var _this__clientDeviceCache;
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.loaded) {
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
                var _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_flag;
                // Device variables are stored with a cookie for each purpose.
                this._requestHandler._cookieNames.deviceByPurpose[flag];
                forEach(this.httpClientDecrypt((_this_cookies_this__requestHandler__cookieNames_deviceByPurpose_flag = this.cookies[this._requestHandler._cookieNames.deviceByPurpose[flag]]) === null || _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_flag === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_flag.value), (value)=>{
                    var _deviceCache;
                    var _variables;
                    update((_variables = (_deviceCache = deviceCache).variables) !== null && _variables !== void 0 ? _variables : _deviceCache.variables = {}, value[0], (current)=>{
                        current !== null && current !== void 0 ? current : current = {
                            scope: VariableScope.Device,
                            key: value[0],
                            classification: value[1],
                            version: value[2],
                            value: value[3],
                            purposes: value[4],
                            created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
                            modified: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
                            accessed: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now()
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
        var _this_cookies_this__requestHandler__cookieNames_consent, _consentData_;
        if (this._initialized === (this._initialized = true)) {
            return this;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        var _this_cookies_this__requestHandler__cookieNames_consent_value;
        const consentData = ((_this_cookies_this__requestHandler__cookieNames_consent_value = (_this_cookies_this__requestHandler__cookieNames_consent = this.cookies[this._requestHandler._cookieNames.consent]) === null || _this_cookies_this__requestHandler__cookieNames_consent === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_consent.value) !== null && _this_cookies_this__requestHandler__cookieNames_consent_value !== void 0 ? _this_cookies_this__requestHandler__cookieNames_consent_value : `${this._defaultConsent.purposes}@${this._defaultConsent.level}`).split("@");
        var _dataClassification_tryParse, _dataPurposes_tryParse;
        this._consent = {
            level: (_dataClassification_tryParse = dataClassification.tryParse(consentData[1])) !== null && _dataClassification_tryParse !== void 0 ? _dataClassification_tryParse : this._defaultConsent.level,
            purposes: (_dataPurposes_tryParse = dataPurposes.tryParse((_consentData_ = consentData[0]) === null || _consentData_ === void 0 ? void 0 : _consentData_.split(","))) !== null && _dataPurposes_tryParse !== void 0 ? _dataPurposes_tryParse : this._defaultConsent.purposes
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
            await this._ensureSession(referenceTimestamp !== null && referenceTimestamp !== void 0 ? referenceTimestamp : now(), {
                deviceId,
                deviceSessionId,
                resetSession: session,
                resetDevice: device
            });
        }
    }
    async updateConsent(level, purposes) {
        if (!this._session) return;
        var _dataClassification_parse;
        level = (_dataClassification_parse = dataClassification.parse(level)) !== null && _dataClassification_parse !== void 0 ? _dataClassification_parse : this.consent.level;
        var _dataPurposes_parse;
        purposes = (_dataPurposes_parse = dataPurposes.parse(purposes)) !== null && _dataPurposes_parse !== void 0 ? _dataPurposes_parse : this.consent.purposes;
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
        var _this__session;
        if ((resetSession || resetDevice) && this._sessionReferenceId) {
            // Purge old data. No point in storing this since it will no longer be used.
            await this.purge({
                session: resetSession,
                device: resetDevice
            });
        } else if (((_this__session = this._session) === null || _this__session === void 0 ? void 0 : _this__session.value) && !refreshState) {
            return;
        }
        // In case we refresh, we might already have a session ID.
        let sessionId = this.sessionId;
        let cachedDeviceData;
        const getDeviceId = async ()=>{
            var _ref;
            return this._consent.level > DataClassification.Anonymous ? (_ref = deviceId !== null && deviceId !== void 0 ? deviceId : resetDevice ? undefined : cachedDeviceData === null || cachedDeviceData === void 0 ? void 0 : cachedDeviceData.id) !== null && _ref !== void 0 ? _ref : await this.env.nextId("device") : undefined;
        };
        if (this._consent.level > DataClassification.Anonymous) {
            var _this__getClientDeviceVariables_SCOPE_INFO_KEY, _this__getClientDeviceVariables, _this_httpClientDecrypt, _this_cookies_this__requestHandler__cookieNames_session;
            cachedDeviceData = resetDevice ? undefined : (_this__getClientDeviceVariables = this._getClientDeviceVariables()) === null || _this__getClientDeviceVariables === void 0 ? void 0 : (_this__getClientDeviceVariables_SCOPE_INFO_KEY = _this__getClientDeviceVariables[SCOPE_INFO_KEY]) === null || _this__getClientDeviceVariables_SCOPE_INFO_KEY === void 0 ? void 0 : _this__getClientDeviceVariables_SCOPE_INFO_KEY.value;
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
                                    ...current === null || current === void 0 ? void 0 : current.value,
                                    deviceId: await getDeviceId()
                                }
                            })
                    }
                ]);
            }
            var _ref;
            // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
            // This means clients must make sure the initial request to endpoint completes before more are sent (or at least do a fair effort).
            // Additionally, empty sessions should be filtered by analytics using the collected events.
            this._sessionReferenceId = sessionId = (_ref = resetSession ? undefined : (_this_httpClientDecrypt = this.httpClientDecrypt((_this_cookies_this__requestHandler__cookieNames_session = this.cookies[this._requestHandler._cookieNames.session]) === null || _this_cookies_this__requestHandler__cookieNames_session === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_session.value)) === null || _this_httpClientDecrypt === void 0 ? void 0 : _this_httpClientDecrypt.id) !== null && _ref !== void 0 ? _ref : passive ? undefined : sessionId !== null && sessionId !== void 0 ? sessionId : await this.env.nextId("session");
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
                                    ...current === null || current === void 0 ? void 0 : current.value,
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
                            value: sessionId !== null && sessionId !== void 0 ? sessionId : await this.env.nextId()
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
                            deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                            previousSession: cachedDeviceData === null || cachedDeviceData === void 0 ? void 0 : cachedDeviceData.lastSeen,
                            hasUserAgent: false
                        })
                    };
                }
            }
        ]).result));
        if (this._session.value) {
            var _this_session;
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
            if ((device === null || device === void 0 ? void 0 : device.value) && device.status !== VariableResultStatus.Created && ((_this_session = this.session) === null || _this_session === void 0 ? void 0 : _this_session.isNew)) {
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
            var _this__clientDeviceCache, _this__clientDeviceCache1;
            this.cookies[this._requestHandler._cookieNames.consent] = {
                httpOnly: true,
                maxAge: Number.MAX_SAFE_INTEGER,
                essential: true,
                sameSitePolicy: "None",
                value: this.consent.level > DataClassification.Anonymous ? this.consent.purposes + "@" + this.consent.level : null
            };
            const splits = {};
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.touched) {
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
                    var _splits, _purpose;
                    dataPurposes.map(variable.purposes, ([, purpose])=>{
                        var _;
                        return ((_ = (_splits = splits)[_purpose = purpose]) !== null && _ !== void 0 ? _ : _splits[_purpose] = []).push([
                            variable.key,
                            variable.classification,
                            variable.version,
                            variable.value,
                            variable.purposes
                        ]);
                    });
                });
            }
            if (this.consent.level === DataClassification.Anonymous) {
                // Clear session cookie if we have one.
                this.cookies[this._requestHandler._cookieNames.session] = {};
            }
            if (this.consent.level <= DataClassification.Anonymous || ((_this__clientDeviceCache1 = this._clientDeviceCache) === null || _this__clientDeviceCache1 === void 0 ? void 0 : _this__clientDeviceCache1.touched)) {
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
            if (keys.some((key)=>variableScope(key === null || key === void 0 ? void 0 : key.scope) === VariableScope.Device)) {
                await this._loadCachedDeviceVariables();
            }
            return restrictTargets(await this.env.storage.get(keys, this._getStorageContext(context)).all);
        }, undefined, (results)=>results.forEach((result)=>(result === null || result === void 0 ? void 0 : result.status) <= VariableResultStatus.Created && this._changedVariables.push(result)));
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
            if (variables.some((key)=>variableScope(key === null || key === void 0 ? void 0 : key.scope) === VariableScope.Device)) {
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
                var _result_current;
                return result.status !== VariableResultStatus.Unchanged && this._changedVariables.push({
                    ...(_result_current = result.current) !== null && _result_current !== void 0 ? _result_current : extractKey(result.source),
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
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, clientId, defaultConsent }){
        /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */ _define_property$a(this, "_eventQueue", []);
        _define_property$a(this, "_extensionState", 0);
        _define_property$a(this, "_initialized", void 0);
        _define_property$a(this, "_requestId", void 0);
        _define_property$a(this, "_clientId", void 0);
        /** @internal  */ _define_property$a(this, "_clientEvents", []);
        /** @internal */ _define_property$a(this, "_requestHandler", void 0);
        _define_property$a(this, "clientIp", void 0);
        _define_property$a(this, "cookies", void 0);
        _define_property$a(this, "disabled", void 0);
        _define_property$a(this, "env", void 0);
        _define_property$a(this, "headers", void 0);
        _define_property$a(this, "queryString", void 0);
        _define_property$a(this, "referrer", void 0);
        _define_property$a(this, "requestItems", void 0);
        /** Transient variables that can be used by extensions whilst processing a request. */ _define_property$a(this, "transient", void 0);
        /** Variables that have been added or updated during the request (cf. {@link TrackerStorageContext.push}). */ _define_property$a(this, "_changedVariables", []);
        _define_property$a(this, "_clientCipher", void 0);
        _define_property$a(this, "_defaultConsent", void 0);
        _define_property$a(this, "host", void 0);
        _define_property$a(this, "path", void 0);
        _define_property$a(this, "url", void 0);
        /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
   *
   * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
   * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
   *
   */ _define_property$a(this, "_sessionReferenceId", void 0);
        /** @internal */ _define_property$a(this, "_session", void 0);
        /** @internal */ _define_property$a(this, "_device", void 0);
        /**
   * See {@link Session.expiredDeviceSessionId}.
   * @internal
   */ _define_property$a(this, "_expiredDeviceSessionId", void 0);
        /**
   * Device variables are only persisted in the device.
   * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
   */ _define_property$a(this, "_clientDeviceCache", void 0);
        _define_property$a(this, "_consent", {
            level: DataClassification.Anonymous,
            purposes: DataPurposeFlags.Necessary
        });
        this.disabled = disabled;
        this._requestHandler = requestHandler;
        this.env = requestHandler.environment;
        this.host = host;
        this.path = path;
        this.url = url;
        this._defaultConsent = defaultConsent;
        this.queryString = queryString !== null && queryString !== void 0 ? queryString : {};
        this.headers = headers !== null && headers !== void 0 ? headers : {};
        this.cookies = cookies !== null && cookies !== void 0 ? cookies : {};
        this.transient = {};
        this.requestItems = new Map();
        this.clientIp = clientIp;
        var _this_headers_referer;
        this.referrer = (_this_headers_referer = this.headers["referer"]) !== null && _this_headers_referer !== void 0 ? _this_headers_referer : null;
        // Defaults to unencrypted transport if nothing is specified.
        this._clientCipher = cipher !== null && cipher !== void 0 ? cipher : defaultTransport;
        this._clientId = clientId;
    }
}

var _globalThis_trackerName, _globalThis, _trackerName;
const PLACEHOLDER_SCRIPT = (trackerName = "tail", quote = false)=>{
    var _;
    return quote ? `window.${trackerName}??=c=>(${trackerName}._??=[]).push(c);` : (_ = (_globalThis = globalThis)[_trackerName = trackerName]) !== null && _ !== void 0 ? _ : _globalThis[_trackerName] = (c)=>{
        var __;
        return ((__ = (_globalThis_trackerName = globalThis[trackerName])._) !== null && __ !== void 0 ? __ : _globalThis_trackerName._ = []).push(c);
    };
};
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
    tags: {
        default: [
            "data-id",
            "data-name"
        ]
    }
};
const CLIENT_CONFIG = trackerConfig;
// Don't pollute globalThis in server context.
let ssrTracker;
const setTrackerName = (name)=>{
    if (typeof window === "undefined") {
        return ssrTracker !== null && ssrTracker !== void 0 ? ssrTracker : ssrTracker = ()=>{};
    }
    const prop = Object.getOwnPropertyDescriptor(globalThis, CLIENT_CONFIG.name);
    if ((prop === null || prop === void 0 ? void 0 : prop.value) && prop.writable) {
        Object.defineProperty(globalThis, name, {
            value: prop.value,
            writable: prop.value[isTracker]
        });
    } else {
        PLACEHOLDER_SCRIPT(name);
    }
    return globalThis[CLIENT_CONFIG.name = name];
};
let tail = setTrackerName(CLIENT_CONFIG.name);
tail((actualTail)=>tail = actualTail);
var LocalVariableScope;
(function(LocalVariableScope) {
    /** Variables are only available in memory in the current view. */ LocalVariableScope[LocalVariableScope["View"] = -3] = "View";
    /** Variables are only available in memory in the current tab, including between views in the same tab as navigation occurs. */ LocalVariableScope[LocalVariableScope["Tab"] = -2] = "Tab";
    /** Variables are only available in memory and shared between all tabs. */ LocalVariableScope[LocalVariableScope["Shared"] = -1] = "Shared";
})(LocalVariableScope || (LocalVariableScope = {}));
const localVariableScope = createEnumAccessor(LocalVariableScope, false, "local variable scope");
createEnumPropertyParser({
    scope: localVariableScope
}, VariableEnumProperties);

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
    client: CLIENT_CONFIG,
    clientEncryptionKeySeed: "tailjs",
    cookiePerPurpose: false,
    json: false,
    defaultConsent: {
        level: "anonymous",
        purposes: "necessary"
    }
};

function _define_property$9(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
const getCookieChunkName = (key, chunk)=>chunk === 0 ? key : `${key}-${chunk}`;
const requestCookieHeader = Symbol("request cookie header");
const requestCookies = Symbol("request cookies");
class CookieMonster {
    mapResponseCookies(cookies) {
        const responseCookies = [];
        forEach(cookies, ([key, cookie])=>{
            var _cookies_requestCookies;
            // These are the chunks
            if (typeof key !== "string") return;
            const requestCookie = (_cookies_requestCookies = cookies[requestCookies]) === null || _cookies_requestCookies === void 0 ? void 0 : _cookies_requestCookies[key];
            // These cookies should not be sent back, since nothing have updated them and we don't want to mess with Max-Age etc..
            if (requestCookie && (requestCookie === null || requestCookie === void 0 ? void 0 : requestCookie.value) === cookie.value) return;
            responseCookies.push(...this._mapClientResponseCookies(key, cookie, requestCookie === null || requestCookie === void 0 ? void 0 : requestCookie.chunks));
        });
        return responseCookies;
    }
    static parseCookieHeader(value) {
        const cookies = {
            [requestCookies]: {}
        };
        cookies[requestCookieHeader] = value !== null && value !== void 0 ? value : undefined;
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
        var _cookie_httpOnly, _cookie_sameSitePolicy, _cookie_essential;
        return {
            name: name,
            value: cookie.value,
            maxAge: cookie.maxAge,
            httpOnly: (_cookie_httpOnly = cookie.httpOnly) !== null && _cookie_httpOnly !== void 0 ? _cookie_httpOnly : true,
            sameSitePolicy: cookie.sameSitePolicy === "None" && !this._secure ? "Lax" : (_cookie_sameSitePolicy = cookie.sameSitePolicy) !== null && _cookie_sameSitePolicy !== void 0 ? _cookie_sameSitePolicy : "Lax",
            essential: (_cookie_essential = cookie.essential) !== null && _cookie_essential !== void 0 ? _cookie_essential : false,
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
        var _cookie_sameSitePolicy;
        parts.push(`SameSite=${cookie.sameSitePolicy === "None" && !this._secure ? "Lax" : (_cookie_sameSitePolicy = cookie.sameSitePolicy) !== null && _cookie_sameSitePolicy !== void 0 ? _cookie_sameSitePolicy : "Lax"}`);
        let attributeLength = parts.join().length;
        if (attributeLength > 0) {
            attributeLength += 2; // + 2 because additional `; ` between key/value and attributes.
        }
        const cutoff = 4093 - attributeLength;
        const encodedName = encodeURIComponent(name);
        var _cookie_value;
        const value = (_cookie_value = cookie.value) !== null && _cookie_value !== void 0 ? _cookie_value : "";
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
    constructor(config){
        _define_property$9(this, "_secure", void 0);
        this._secure = config.secure !== false;
    }
}

function _define_property$8(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class PostError extends Error {
    constructor(validation, extensions){
        super([
            ...validation.map((item)=>`The event ${JSON.stringify(item.source)} (${item.sourceIndex ? `source index #${item.sourceIndex}` : "no source index"}) is invalid: ${item.error}`),
            ...map(extensions, (item)=>`'${item[0]}' failed: ${item[1]}`)
        ].join("\n"));
        _define_property$8(this, "validation", void 0);
        _define_property$8(this, "extensions", void 0);
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

function _define_property$7(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
const SAME_SITE = {
    strict: "Strict",
    lax: "Lax",
    none: "None"
};
const uuid = new ShortUniqueId();
const getDefaultLogSourceName = (source)=>{
    var _source_constructor;
    if (!source) return undefined;
    if (!isObject(source)) return "" + source;
    let constructorName = (_source_constructor = source.constructor) === null || _source_constructor === void 0 ? void 0 : _source_constructor.name;
    var _source_logId;
    let name = (_source_logId = source.logId) !== null && _source_logId !== void 0 ? _source_logId : source.id;
    if (name) {
        return (constructorName && constructorName !== "Object" ? constructorName + ":" : "") + name;
    }
    return constructorName !== null && constructorName !== void 0 ? constructorName : "" + source;
};
class TrackerEnvironment {
    /** @internal */ _setLogInfo(...sources) {
        sources.forEach((source)=>{
            var _source_name;
            return this._logGroups.set(source, {
                group: source.group,
                name: (_source_name = source.name) !== null && _source_name !== void 0 ? _source_name : getDefaultLogSourceName(source)
            });
        });
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
        var _message, _message1;
        // This is what you get if you try to log nothing (null or undefined); Nothing.
        if (!arg) return;
        const message = !isObject(arg) || arg instanceof Error ? {
            message: arg instanceof Error ? "An error ocurred" : arg,
            level: level !== null && level !== void 0 ? level : error ? "error" : "info",
            error
        } : arg;
        var _this__logGroups_get;
        const { group, name = getDefaultLogSourceName(source) } = (_this__logGroups_get = this._logGroups.get(source)) !== null && _this__logGroups_get !== void 0 ? _this__logGroups_get : {};
        var _group;
        (_group = (_message = message).group) !== null && _group !== void 0 ? _group : _message.group = group;
        var _source;
        (_source = (_message1 = message).source) !== null && _source !== void 0 ? _source : _message1.source = name;
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
        var _request, _request1, _responseHeaders, _contenttype;
        var _method;
        (_method = (_request = request).method) !== null && _method !== void 0 ? _method : _request.method = request.body ? "POST" : "GET";
        var _headers;
        (_headers = (_request1 = request).headers) !== null && _headers !== void 0 ? _headers : _request1.headers = {};
        delete request.headers["host"];
        delete request.headers["accept-encoding"];
        var _request_headers;
        const response = await this._host.request({
            url: request.url,
            binary: request.binary,
            method: request.method,
            body: request.body,
            headers: (_request_headers = request.headers) !== null && _request_headers !== void 0 ? _request_headers : {},
            x509: request.x509
        });
        const responseHeaders = Object.fromEntries(Object.entries(response.headers).map(([name, value])=>[
                name.toLowerCase(),
                value
            ]));
        const cookies = {};
        for (const cookie of response.cookies){
            const ps = parseHttpHeader(cookie, false);
            var _ps_parameterList_;
            const [name, value] = (_ps_parameterList_ = ps[parameterList][0]) !== null && _ps_parameterList_ !== void 0 ? _ps_parameterList_ : [];
            if (!name) continue;
            var _SAME_SITE_ps_samesite;
            cookies[name] = {
                value,
                httpOnly: "httponly" in ps,
                sameSitePolicy: (_SAME_SITE_ps_samesite = SAME_SITE[ps["samesite"]]) !== null && _SAME_SITE_ps_samesite !== void 0 ? _SAME_SITE_ps_samesite : "Lax",
                maxAge: ps["max-age"] ? parseInt(ps["max-age"]) : undefined
            };
        }
        var _;
        (_ = (_responseHeaders = responseHeaders)[_contenttype = "content-type"]) !== null && _ !== void 0 ? _ : _responseHeaders[_contenttype] = "text/plain";
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
        var _this;
        this.log(source, isString(message) ? message : (_this = error = message) === null || _this === void 0 ? void 0 : _this.message, "error", error);
    }
    constructor(host, crypto, storage, tags, cookieVersion = "C"){
        _define_property$7(this, "_crypto", void 0);
        _define_property$7(this, "_host", void 0);
        _define_property$7(this, "_logGroups", new Map());
        _define_property$7(this, "tags", void 0);
        _define_property$7(this, "cookieVersion", void 0);
        _define_property$7(this, "storage", void 0);
        this._host = host;
        this._crypto = crypto;
        this.tags = tags;
        this.cookieVersion = cookieVersion;
        this.storage = storage;
    }
}

function _define_property$6(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class DefaultClientIdGenerator {
    async generateClientId(environment, request, stationary, entropy) {
        let clientString = [
            stationary ? "" : request.clientIp,
            entropy,
            ...this._headers.map((header)=>request.headers[header] + ""),
            entropy
        ].join("&");
        return environment.hash(clientString, 128);
    }
    constructor({ headers = [
        "accept-encoding",
        "accept-language",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
        "user-agent"
    ] } = {}){
        _define_property$6(this, "_headers", void 0);
        this._headers = headers;
    }
}

function _define_property$5(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
const hasChanged = (getter, current)=>getter.version == null || (current === null || current === void 0 ? void 0 : current.version) !== getter.version;
class InMemoryStorageBase {
    _remove(variable, timestamp) {
        const values = this._getScopeVariables(variable.scope, variable.targetId, false);
        if (values === null || values === void 0 ? void 0 : values[1].has(variable.key)) {
            var _this__ttl;
            const ttl = (_this__ttl = this._ttl) === null || _this__ttl === void 0 ? void 0 : _this__ttl[variable.scope];
            values[0] = ttl ? (timestamp !== null && timestamp !== void 0 ? timestamp : now()) + ttl : undefined;
            values[1].delete(variable.key);
            return true;
        }
        return false;
    }
    _update(variable, timestamp) {
        let scopeValues = this._getScopeVariables(variable.scope, variable.targetId, true);
        scopeValues[0] = variable.ttl ? (timestamp !== null && timestamp !== void 0 ? timestamp : now()) + variable.ttl : undefined;
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
        const ifNoneMatch = (settings === null || settings === void 0 ? void 0 : settings.ifNoneMatch) ? new Map(settings.ifNoneMatch.map((variable)=>[
                variableId(variable),
                variable.version
            ])) : null;
        var _settings_ifModifiedSince;
        const ifModifiedSince = (_settings_ifModifiedSince = settings === null || settings === void 0 ? void 0 : settings.ifModifiedSince) !== null && _settings_ifModifiedSince !== void 0 ? _settings_ifModifiedSince : 0;
        for (const queryFilter of filters){
            const match = (variable)=>{
                var _classification_levels;
                const { purposes, classification, tags } = queryFilter;
                if (!variable || variable.purposes && purposes && !(variable.purposes & purposes) || classification && (variable.classification < classification.min || variable.classification > classification.max || ((_classification_levels = classification.levels) === null || _classification_levels === void 0 ? void 0 : _classification_levels.some((level)=>variable.classification === level)) === false) || tags && (!variable.tags || !tags.some((tags)=>tags.every((tag)=>variable.tags.includes(tag))))) {
                    return false;
                }
                let matchVersion;
                if (ifModifiedSince && variable.modified < ifModifiedSince || (matchVersion = ifNoneMatch === null || ifNoneMatch === void 0 ? void 0 : ifNoneMatch.get(variableId(variable))) != null && variable.version === matchVersion) {
                    // Skip the variable because it is too old or unchanged based on the settings provided for the query.
                    return false;
                }
                return true;
            };
            var _queryFilter_scopes;
            for (const scope of (_queryFilter_scopes = queryFilter.scopes) !== null && _queryFilter_scopes !== void 0 ? _queryFilter_scopes : variableScope.values){
                var _queryFilter_targetIds;
                var _queryFilter_targetIds_map;
                for (const [, scopeVars] of (_queryFilter_targetIds_map = (_queryFilter_targetIds = queryFilter.targetIds) === null || _queryFilter_targetIds === void 0 ? void 0 : _queryFilter_targetIds.map((targetId)=>[
                        targetId,
                        this._getScopeVariables(scope, targetId, false)
                    ])) !== null && _queryFilter_targetIds_map !== void 0 ? _queryFilter_targetIds_map : this._getTargetsInScope(scope)){
                    var _queryFilter_keys;
                    if (!scopeVars || scopeVars[0] <= timestamp) continue;
                    const vars = scopeVars[1];
                    let nots = undefined;
                    var _queryFilter_keys_map;
                    const mappedKeys = (_queryFilter_keys_map = (_queryFilter_keys = queryFilter.keys) === null || _queryFilter_keys === void 0 ? void 0 : _queryFilter_keys.map((key)=>{
                        // Find keys that starts with `!` to exclude them from the results.
                        const parsed = parseKey(key);
                        if (parsed.not) {
                            (nots !== null && nots !== void 0 ? nots : nots = new Set()).add(parsed.sourceKey);
                        }
                        return parsed.key;
                    })) !== null && _queryFilter_keys_map !== void 0 ? _queryFilter_keys_map : vars.keys();
                    for (const key of mappedKeys.includes("*") ? vars.keys() : mappedKeys){
                        if (nots === null || nots === void 0 ? void 0 : nots.has(key)) continue;
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
        var _this__ttl;
        const timestamp = now();
        const ttl = (_this__ttl = this._ttl) === null || _this__ttl === void 0 ? void 0 : _this__ttl[scope];
        if (!ttl) return;
        for (const targetId of targetIds){
            const vars = this._getScopeVariables(scope, targetId, false);
            if (vars) {
                vars[0] = timestamp;
            }
        }
    }
    async get(getters, context) {
        const variables = getters.map((getter)=>{
            var _this__getScopeVariables;
            return {
                current: getter && ((_this__getScopeVariables = this._getScopeVariables(getter.scope, getter.targetId, false)) === null || _this__getScopeVariables === void 0 ? void 0 : _this__getScopeVariables[1].get(getter.key)),
                getter
            };
        });
        const results = [];
        let timestamp;
        for (const [item, i] of rank(variables)){
            var _item_getter, _item_getter1, _item_current;
            if (!item.getter) continue;
            if (!item.current) {
                var _item_getter2;
                if ((_item_getter2 = item.getter) === null || _item_getter2 === void 0 ? void 0 : _item_getter2.init) {
                    const initialValue = await unwrap(item.getter.init);
                    if (initialValue === null || initialValue === void 0 ? void 0 : initialValue.value) {
                        // Check if the variable has been created by someone else while the initializer was running.
                        results[i] = copy(this._update({
                            ...extractKey(item.getter),
                            ...initialValue,
                            created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
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
            var _item_getter_purpose;
            if (!(item.current.purposes & (((_item_getter_purpose = item.getter.purpose) !== null && _item_getter_purpose !== void 0 ? _item_getter_purpose : 0) | DataPurposeFlags.Any_Anonymous))) {
                var _item_getter_purpose1;
                results[i] = {
                    ...extractKey(item.getter),
                    status: VariableResultStatus.Denied,
                    error: `${formatKey(item.getter)} is not stored for ${dataPurposes.logFormat((_item_getter_purpose1 = item.getter.purpose) !== null && _item_getter_purpose1 !== void 0 ? _item_getter_purpose1 : DataPurposeFlags.Necessary)}`
                };
                continue;
            }
            results[i] = copy(item.current, {
                status: ((_item_getter = item.getter) === null || _item_getter === void 0 ? void 0 : _item_getter.version) && ((_item_getter1 = item.getter) === null || _item_getter1 === void 0 ? void 0 : _item_getter1.version) === ((_item_current = item.current) === null || _item_current === void 0 ? void 0 : _item_current.version) ? VariableResultStatus.Unchanged : VariableResultStatus.Success,
                accessed: now()
            });
        }
        return results;
    }
    head(filters, options, context) {
        return this.query(filters, options);
    }
    query(filters, options, context) {
        var _options_cursor;
        const results = this._query(filters, options);
        return {
            count: (options === null || options === void 0 ? void 0 : options.count) ? results.length : undefined,
            // This current implementation does not bother with cursors. If one is requested we just return all results. Boom.
            results: ((options === null || options === void 0 ? void 0 : options.top) && !(options === null || options === void 0 ? void 0 : (_options_cursor = options.cursor) === null || _options_cursor === void 0 ? void 0 : _options_cursor.include) ? results.slice(0, options.top) : results).map((variable)=>copy(variable))
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
            if ((scopeVars === null || scopeVars === void 0 ? void 0 : scopeVars[0]) < timestamp) {
                scopeVars = undefined;
            }
            let current = scopeVars === null || scopeVars === void 0 ? void 0 : scopeVars[1].get(key);
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
                var _patched_classification;
                classification = (_patched_classification = patched.classification) !== null && _patched_classification !== void 0 ? _patched_classification : classification;
                var _patched_purposes;
                purposes = (_patched_purposes = patched.purposes) !== null && _patched_purposes !== void 0 ? _patched_purposes : purposes;
                value = patched.value;
            } else if (!source.force && (current === null || current === void 0 ? void 0 : current.version) !== version) {
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
            var _current_created, _current_purposes;
            const nextValue = {
                key,
                value,
                classification,
                targetId,
                scope,
                created: (_current_created = current === null || current === void 0 ? void 0 : current.created) !== null && _current_created !== void 0 ? _current_created : now(),
                modified: now(),
                accessed: now(),
                version: this._getNextVersion(current),
                purposes: (current === null || current === void 0 ? void 0 : current.purposes) != null || purposes ? ((_current_purposes = current === null || current === void 0 ? void 0 : current.purposes) !== null && _current_purposes !== void 0 ? _current_purposes : 0) | (purposes !== null && purposes !== void 0 ? purposes : 0) : DataPurposeFlags.Necessary,
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
    constructor(scopeDurations, cleanFrequency = 10000){
        _define_property$5(this, "_ttl", void 0);
        /** For testing purposes to have the router apply the patches. @internal */ _define_property$5(this, "_testDisablePatch", void 0);
        var _this__ttl;
        (_this__ttl = this._ttl) !== null && _this__ttl !== void 0 ? _this__ttl : this._ttl = scopeDurations;
        if (some(this._ttl, ([, ttl])=>ttl > 0)) {
            setInterval(()=>this.clean(), cleanFrequency);
        }
    }
}
class InMemoryStorage extends InMemoryStorageBase {
    _getNextVersion(key) {
        return (key === null || key === void 0 ? void 0 : key.version) ? "" + (parseInt(key.version) + 1) : "1";
    }
    _getScopeVariables(scope, targetId, require) {
        var _this__variables_scope;
        let values = (_this__variables_scope = this._variables[scope]) === null || _this__variables_scope === void 0 ? void 0 : _this__variables_scope.get(targetId !== null && targetId !== void 0 ? targetId : "");
        if (!values && require) {
            var _this__variables, _scope;
            var _;
            ((_ = (_this__variables = this._variables)[_scope = scope]) !== null && _ !== void 0 ? _ : _this__variables[_scope] = new Map()).set(targetId !== null && targetId !== void 0 ? targetId : "", values = [
                undefined,
                new Map()
            ]);
        }
        return values;
    }
    _resetScope(scope) {
        var _this__variables_scope;
        (_this__variables_scope = this._variables[scope]) === null || _this__variables_scope === void 0 ? void 0 : _this__variables_scope.clear();
    }
    _deleteTarget(scope, targetId) {
        var _this__variables_scope;
        (_this__variables_scope = this._variables[scope]) === null || _this__variables_scope === void 0 ? void 0 : _this__variables_scope.delete(targetId);
    }
    _getTargetsInScope(scope) {
        try {
            var _this__variables_scope;
            return (_this__variables_scope = this._variables[scope]) !== null && _this__variables_scope !== void 0 ? _this__variables_scope : [];
        } catch (e) {
            console.log("Nope", scope);
            return [];
        }
    }
    constructor(scopeDurations, cleanFrequency = 10000){
        super(scopeDurations, cleanFrequency);
        _define_property$5(this, "_variables", variableScope.values.map(()=>new Map()));
    }
}

function _define_property$4(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
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
    (options === null || options === void 0 ? void 0 : options.ifNoneMatch) && (options.ifNoneMatch = toNumericVariableEnums(options.ifNoneMatch));
    return options;
};
const parseContext = (context)=>{
    (context === null || context === void 0 ? void 0 : context.consent) && (context.consent = {
        level: dataClassification(context.consent.level),
        purposes: dataPurposes(context.consent.purposes)
    });
    return context;
};
/**
 * A wrapper around a {@link VariableStorage} that accepts string values for enums.
 */ class ParsingVariableStorage {
    renew(scope, scopeIds, context) {
        return this.storage.renew(variableScope(scope), scopeIds, parseContext(context));
    }
    purge(filters, context) {
        return this.storage.purge(map(filters, parseFilter), parseContext(context));
    }
    initialize(environment) {
        var _this_storage_initialize, _this_storage;
        return (_this_storage_initialize = (_this_storage = this.storage).initialize) === null || _this_storage_initialize === void 0 ? void 0 : _this_storage_initialize.call(_this_storage, environment);
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
    constructor(storage){
        _define_property$4(this, "storage", void 0);
        this.storage = storage;
    }
}

function _define_property$3(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
let _Symbol_iterator$1 = Symbol.iterator;
class TargetedVariableCollection {
    get size() {
        return this._size;
    }
    get(key, init) {
        if (key == null) return undefined;
        if (isString(key)) {
            return this._scopes.get(key);
        }
        var _key_targetId;
        let targetId = (_key_targetId = key.targetId) !== null && _key_targetId !== void 0 ? _key_targetId : "";
        let collection = this._scopes.get(targetId);
        if (init && !collection) {
            this._scopes.set(targetId, collection = new VariableMap(this._updateSize));
        }
        return collection === null || collection === void 0 ? void 0 : collection.get(key, init && ((scope, key)=>init(mapKey(scope, key, targetId))));
    }
    has(source, scope) {
        var _this__scopes_get;
        if (source == null) return undefined;
        if (isString(source)) {
            var _this__scopes_get1;
            var _this__scopes_get_has;
            return scope != null ? (_this__scopes_get_has = (_this__scopes_get1 = this._scopes.get(source)) === null || _this__scopes_get1 === void 0 ? void 0 : _this__scopes_get1.has(scope)) !== null && _this__scopes_get_has !== void 0 ? _this__scopes_get_has : false : this._scopes.has(source);
        }
        var _source_targetId, _this__scopes_get_has1;
        return (_this__scopes_get_has1 = (_this__scopes_get = this._scopes.get((_source_targetId = source.targetId) !== null && _source_targetId !== void 0 ? _source_targetId : "")) === null || _this__scopes_get === void 0 ? void 0 : _this__scopes_get.has(source)) !== null && _this__scopes_get_has1 !== void 0 ? _this__scopes_get_has1 : false;
    }
    clear() {
        this._updateSize(-this._size);
        this._scopes.clear();
        return this;
    }
    delete(key) {
        var _this__scopes_get;
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
        var _key_targetId, _this__scopes_get_delete;
        return (_this__scopes_get_delete = (_this__scopes_get = this._scopes.get((_key_targetId = key.targetId) !== null && _key_targetId !== void 0 ? _key_targetId : "")) === null || _this__scopes_get === void 0 ? void 0 : _this__scopes_get.delete(key)) !== null && _this__scopes_get_delete !== void 0 ? _this__scopes_get_delete : false;
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
        var _key_targetId;
        const targetId = (_key_targetId = key.targetId) !== null && _key_targetId !== void 0 ? _key_targetId : "";
        let scopes = this._scopes.get(targetId);
        if (!this._scopes.has(targetId)) {
            this._scopes.set(targetId, scopes = new VariableMap(this._updateSize));
        }
        scopes === null || scopes === void 0 ? void 0 : scopes.set(key, value);
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
    *[_Symbol_iterator$1]() {
        for (const [targetId, scopes] of this._scopes){
            for (const [[scope, key], value] of scopes){
                yield [
                    mapKey(scope, key, targetId),
                    value
                ];
            }
        }
    }
    constructor(values){
        _define_property$3(this, "_scopes", new Map());
        _define_property$3(this, "_size", 0);
        _define_property$3(this, "_updateSize", (delta)=>{
            this._size += delta;
        });
        if (values) {
            this.set(values);
        }
    }
}

function _define_property$2(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
const mapKey = (scope, key, targetId)=>scope === VariableScope.Global ? {
        scope,
        key
    } : {
        scope,
        key,
        targetId
    };
let _Symbol_iterator = Symbol.iterator;
class VariableMap {
    get size() {
        return this._size;
    }
    _updateSize(delta) {
        var _this__onSizeChanged, _this;
        this._size += delta;
        (_this__onSizeChanged = (_this = this)._onSizeChanged) === null || _this__onSizeChanged === void 0 ? void 0 : _this__onSizeChanged.call(_this, delta);
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
            let value = values === null || values === void 0 ? void 0 : values.get(key);
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
        var _this__values_get;
        if (source == null) return undefined;
        if (isObject(source)) {
            var _this__values_get1;
            var _this__values_get_has;
            return (_this__values_get_has = (_this__values_get1 = this._values.get(variableScope.parse(source.scope, false))) === null || _this__values_get1 === void 0 ? void 0 : _this__values_get1.has(source.key)) !== null && _this__values_get_has !== void 0 ? _this__values_get_has : false;
        }
        const scope = variableScope.parse(source, false);
        var _this__values_get_has1;
        return key != null ? (_this__values_get_has1 = (_this__values_get = this._values.get(scope)) === null || _this__values_get === void 0 ? void 0 : _this__values_get.has(key)) !== null && _this__values_get_has1 !== void 0 ? _this__values_get_has1 : false : this._values.has(scope);
    }
    clear() {
        var _this__values;
        this._updateSize(-this._size);
        (_this__values = this._values) === null || _this__values === void 0 ? void 0 : _this__values.clear();
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
    *[_Symbol_iterator]() {
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
    constructor(arg){
        _define_property$2(this, "_values", new Map());
        _define_property$2(this, "_onSizeChanged", void 0);
        _define_property$2(this, "_size", 0);
        if (isFunction(arg)) {
            this._onSizeChanged = arg;
        } else if (arg) {
            this.set(arg);
        }
    }
}

function _define_property$1(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class VariableSplitStorage {
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
            var _filter_scopes;
            const scopes = (_filter_scopes = filter.scopes) !== null && _filter_scopes !== void 0 ? _filter_scopes : variableScope.values;
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
        await waitAll(...map(this._splitKeys(keys), ([storage, split])=>mergeKeys(results, split, async (variables)=>{
                var _this__patchers_get, _this__patchers;
                var _ref;
                return (_ref = await ((_this__patchers = this._patchers) === null || _this__patchers === void 0 ? void 0 : (_this__patchers_get = _this__patchers.get) === null || _this__patchers_get === void 0 ? void 0 : _this__patchers_get.call(_this__patchers, this._errorWrappers.get(storage), variables, await storage.get(variables, context), context))) !== null && _ref !== void 0 ? _ref : variables;
            })));
        return results;
    }
    async _queryOrHead(method, filters, options, context) {
        var _options_cursor, _options_cursor1, _options_cursor2;
        const partitions = this._splitFilters(filters);
        const results = {
            count: (options === null || options === void 0 ? void 0 : options.count) ? 0 : undefined,
            results: []
        };
        if (!partitions.length) {
            return results;
        }
        if (partitions.length === 1) {
            var _partitions___method, _partitions__;
            return await ((_partitions___method = (_partitions__ = partitions[0][0])[method]) === null || _partitions___method === void 0 ? void 0 : _partitions___method.call(_partitions__, partitions[0][1], options));
        }
        const includeCursor = (options === null || options === void 0 ? void 0 : (_options_cursor = options.cursor) === null || _options_cursor === void 0 ? void 0 : _options_cursor.include) || !!(options === null || options === void 0 ? void 0 : (_options_cursor1 = options.cursor) === null || _options_cursor1 === void 0 ? void 0 : _options_cursor1.previous);
        let cursor = (options === null || options === void 0 ? void 0 : (_options_cursor2 = options.cursor) === null || _options_cursor2 === void 0 ? void 0 : _options_cursor2.previous) ? JSON.parse(options.cursor.previous) : undefined;
        var _options_top;
        let top = (_options_top = options === null || options === void 0 ? void 0 : options.top) !== null && _options_top !== void 0 ? _options_top : 100;
        let anyCursor = false;
        for(let i = 0; // Keep going as long as we need the total count, or have not sufficient results to meet top (or done).
        // If one of the storages returns an undefined count even though requested, we will also blank out the count in the combined results
        // and stop reading from additional storages since total count is no longer needed.
        i < partitions.length && (top > 0 || results.count != null); i++){
            const [storage, query] = partitions[i];
            const storageState = cursor === null || cursor === void 0 ? void 0 : cursor[i];
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
                        previous: storageState === null || storageState === void 0 ? void 0 : storageState[1]
                    }
                }, context);
                count = storageCount;
                if (includeCursor) {
                    anyCursor || (anyCursor = !!storageCursor);
                    (cursor !== null && cursor !== void 0 ? cursor : cursor = [])[i] = [
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
        await waitAll(...map(this._splitKeys(variables), ([storage, split])=>isWritable(storage) && mergeKeys(results, split, async (variables)=>{
                var _this__patchers_set, _this__patchers;
                var _ref;
                return (_ref = await ((_this__patchers = this._patchers) === null || _this__patchers === void 0 ? void 0 : (_this__patchers_set = _this__patchers.set) === null || _this__patchers_set === void 0 ? void 0 : _this__patchers_set.call(_this__patchers, this._errorWrappers.get(storage), variables, await storage.set(variables, context), context))) !== null && _ref !== void 0 ? _ref : variables;
            })));
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
    constructor(mappings, patchers){
        _define_property$1(this, "_mappings", new DoubleMap());
        _define_property$1(this, "_cachedStorages", null);
        _define_property$1(this, "_errorWrappers", new Map());
        _define_property$1(this, "_patchers", void 0);
        this._patchers = patchers;
        forEach(unwrap(mappings), ([scope, mappings])=>forEach(mappings, ([prefix, { storage }])=>(this._errorWrappers.set(storage, new SplitStorageErrorWrapperImpl(storage)), this._mappings.set([
                    1 * scope,
                    prefix
                ], storage))));
    }
}
class SplitStorageErrorWrapperImpl {
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
    constructor(storage){
        _define_property$1(this, "_storage", void 0);
        _define_property$1(this, "writable", void 0);
        this._storage = storage;
        this.writable = isWritable(storage);
    }
}

const isWritable = (storage)=>!!(storage === null || storage === void 0 ? void 0 : storage.set);

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class VariableStorageCoordinator {
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
            var _result_current;
            if ((context === null || context === void 0 ? void 0 : context.tracker) && (result === null || result === void 0 ? void 0 : result.status) <= 201 && (result === null || result === void 0 ? void 0 : (_result_current = result.current) === null || _result_current === void 0 ? void 0 : _result_current.scope) === VariableScope.Device) {
                context.tracker._touchClientDeviceData();
            }
            return result && (result.source = setters[i]);
        });
        return finalResults;
    }
    async _patchGetResults(storage, getters, results, context) {
        const initializerSetters = [];
        for(let i = 0; i < getters.length; i++){
            var _results_i;
            if (!getters[i]) continue;
            const getter = getters[i];
            if (!getter.init || ((_results_i = results[i]) === null || _results_i === void 0 ? void 0 : _results_i.status) !== VariableResultStatus.NotFound) {
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
        results.forEach((result, i)=>(result === null || result === void 0 ? void 0 : result.status) === VariableResultStatus.Unsupported && (setter = setters[i]).patch != null && patches.push([
                i,
                setter
            ]));
        if (patches.length) {
            const patch = async (patchIndex, result)=>{
                const [sourceIndex, patch] = patches[patchIndex];
                if (!setters[sourceIndex]) return undefined;
                if ((result === null || result === void 0 ? void 0 : result.status) === VariableResultStatus.Error) {
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
        var _mapping_variables;
        if (key == null || value == null) return undefined;
        const localKey = stripPrefix(key);
        if ((_mapping_variables = mapping.variables) === null || _mapping_variables === void 0 ? void 0 : _mapping_variables.has(localKey)) {
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
        var _mapping_variables;
        if (!target) return target;
        const definition = (_mapping_variables = mapping.variables) === null || _mapping_variables === void 0 ? void 0 : _mapping_variables.get(stripPrefix(key));
        if (definition) {
            target.classification = definition.classification;
            target.purposes = definition.purposes;
        } else {
            var _mapping_classification, _mapping_classification1;
            var _target, _target1;
            var _key_classification, _classification;
            (_classification = (_target = target).classification) !== null && _classification !== void 0 ? _classification : _target.classification = (_key_classification = key === null || key === void 0 ? void 0 : key.classification) !== null && _key_classification !== void 0 ? _key_classification : (_mapping_classification = mapping.classification) === null || _mapping_classification === void 0 ? void 0 : _mapping_classification.classification;
            var _key_purposes, _ref /* getters */ , _purposes;
            (_purposes = (_target1 = target).purposes) !== null && _purposes !== void 0 ? _purposes : _target1.purposes = (_ref = (_key_purposes = key === null || key === void 0 ? void 0 : key.purposes) !== null && _key_purposes !== void 0 ? _key_purposes : key === null || key === void 0 ? void 0 : key.purpose) !== null && _ref !== void 0 ? _ref : (_mapping_classification1 = mapping.classification) === null || _mapping_classification1 === void 0 ? void 0 : _mapping_classification1.purposes;
        }
        required(target.classification, ()=>`The variable ${formatKey(key)} must have an explicit classification since it is not defined in a schema, and its storage does not have a default classification.`);
        required(target.purposes, ()=>`The variable ${formatKey(key)} must have explicit purposes since it is not defined in a schema, and its storage does not have a default classification.`);
        value != null && (definition === null || definition === void 0 ? void 0 : definition.validate(value));
        return target;
    }
    _applyScopeId(key, context) {
        if (key) {
            const scope = variableScope(key.scope);
            var _context_tracker;
            const scopeIds = (_context_tracker = context === null || context === void 0 ? void 0 : context.tracker) !== null && _context_tracker !== void 0 ? _context_tracker : context === null || context === void 0 ? void 0 : context.scopeIds;
            if (scopeIds) {
                var _key, _key1, _key2;
                const validateScope = (expectedTarget, actualTarget)=>{
                    if (!actualTarget) {
                        return scope === VariableScope.Session ? "The tracker does not have an associated session." : scope === VariableScope.Device ? "The tracker does not have associated device data, most likely due to the lack of consent." : "The tracker does not have an authenticated user associated.";
                    }
                    if (expectedTarget !== actualTarget) {
                        return `If a target ID is explicitly specified for the ${variableScope.format(scope)} scope it must match the tracker. (Specifying the target ID for this scope is optional.)`;
                    }
                    return undefined;
                };
                var _targetId, _targetId1, _targetId2;
                const error = scope === VariableScope.Session ? validateScope(scopeIds.sessionId, (_targetId = (_key = key).targetId) !== null && _targetId !== void 0 ? _targetId : _key.targetId = scopeIds.sessionId) : scope === VariableScope.Device ? validateScope(scopeIds.deviceId, (_targetId1 = (_key1 = key).targetId) !== null && _targetId1 !== void 0 ? _targetId1 : _key1.targetId = scopeIds.deviceId) : scope === VariableScope.User ? validateScope(scopeIds.authenticatedUserId, (_targetId2 = (_key2 = key).targetId) !== null && _targetId2 !== void 0 ? _targetId2 : _key2.targetId = scopeIds.authenticatedUserId) : undefined;
                return error;
            } else if (scope !== VariableScope.Global && !key.targetId) {
                return `Target ID is required for non-global scopes when variables are not managed through the tracker.`;
            }
        }
        return undefined;
    }
    _restrictFilters(filters, context) {
        var _context_tracker;
        const scopeIds = (_context_tracker = context === null || context === void 0 ? void 0 : context.tracker) !== null && _context_tracker !== void 0 ? _context_tracker : context === null || context === void 0 ? void 0 : context.scopeIds;
        if (!scopeIds) {
            return filters;
        }
        const scopeTargetedFilters = [];
        for (const filter of filters){
            var _filter_scopes;
            for (let scope of (_filter_scopes = filter.scopes) !== null && _filter_scopes !== void 0 ? _filter_scopes : variableScope.values){
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
                            created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
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
                    return (result === null || result === void 0 ? void 0 : result.value) != null && this._censorValidate(mapping, result, getter, index, keys, censored, consent, context, true) ? result : undefined;
                });
            }
            return getter;
        });
        let expired;
        const results = (await this._storage.get(keys, context)).map((variable)=>{
            if (isSuccessResult(variable, true) && variable.accessed + variable.ttl < (timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now())) {
                (expired !== null && expired !== void 0 ? expired : expired = []).push(variable);
                return {
                    ...extractKey(variable),
                    status: VariableResultStatus.NotFound
                };
            }
            return variable;
        });
        if (expired === null || expired === void 0 ? void 0 : expired.length) {
            // Delete expired variables on read.
            await this._storage.set(expired.map((variable)=>({
                    ...variable,
                    value: undefined
                })), context);
        }
        for (const [i, result] of censored){
            var _result_current;
            var _result_current1;
            results[i] = {
                ...extractKey(result.source, (_result_current1 = result.current) !== null && _result_current1 !== void 0 ? _result_current1 : result.source),
                value: (_result_current = result.current) === null || _result_current === void 0 ? void 0 : _result_current.value,
                status: result.status,
                error: result.error
            };
        }
        for (const result of results){
            if (!isSuccessResult(result, true) || !(result === null || result === void 0 ? void 0 : result.value)) continue;
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
    constructor({ mappings, schema, retries = 3, transientRetryDelay = 50, errorRetryDelay = 250 }){
        _define_property(this, "_settings", void 0);
        _define_property(this, "_variables", new TupleMap());
        _define_property(this, "_storage", void 0);
        _define_property(this, "_getContextConsent", (context)=>{
            var _context_tracker;
            let consent = context === null || context === void 0 ? void 0 : (_context_tracker = context.tracker) === null || _context_tracker === void 0 ? void 0 : _context_tracker.consent;
            if (!consent && (consent = context === null || context === void 0 ? void 0 : context.consent)) {
                consent = {
                    level: dataClassification(consent.level),
                    purposes: dataPurposes(consent.purposes)
                };
            }
            if (!consent) return consent;
            consent = {
                ...consent
            };
            if (!(context === null || context === void 0 ? void 0 : context.client)) {
                consent.purposes |= DataPurposeFlags.Server;
            }
            return consent;
        });
        const normalizeMappings = (mappings)=>(mappings === null || mappings === void 0 ? void 0 : mappings.storage) ? {
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
}

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, InMemoryStorageBase, MAX_CACHE_HEADERS, ParsingVariableStorage, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, TargetedVariableCollection, Tracker, TrackerEnvironment, VariableMap, VariableSplitStorage, VariableStorageCoordinator, bootstrap, getErrorMessage, hasChanged, isValidationError, isWritable, mapKey, requestCookieHeader, requestCookies };

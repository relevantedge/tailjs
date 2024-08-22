import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m04hlwvn" ;
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";
const PLACEHOLDER_SCRIPT$1 = (trackerName = "tail", quote)=>{
    var _globalThis, _trackerName;
    if (quote) {
        return `(window.${trackerName}??=c=>${trackerName}._?.push(c) ?? ${trackerName}(c))._=[];`;
    }
    var _;
    ((_ = (_globalThis = globalThis)[_trackerName = trackerName]) !== null && _ !== void 0 ? _ : _globalThis[_trackerName] = (c)=>{
        var _globalThis_trackerName__;
        var _globalThis_trackerName___push;
        return (_globalThis_trackerName___push = (_globalThis_trackerName__ = globalThis[trackerName]._) === null || _globalThis_trackerName__ === void 0 ? void 0 : _globalThis_trackerName__.push(c)) !== null && _globalThis_trackerName___push !== void 0 ? _globalThis_trackerName___push : globalThis[trackerName](c);
    })._ = [];
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
const testFirstLast = (s, first, last)=>s[0] === first && s[s.length - 1] === last;
const isJsonString = (value)=>isString(value) && (testFirstLast(value, "{", "}") || testFirstLast(value, "[", "]"));
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
                if (changed) {
                    if (!await tracker._requestHandler._validateSignInEvent(tracker, event)) {
                        updatedEvents[updatedEvents.length - 1] = {
                            error: "Sign-ins without evidence is only possible in a trusted context. To support sign-ins from the client API, you must register an extension that validates the sign-in event based on its provided evidence.",
                            source: event
                        };
                    }
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
        var _this_configuration;
        _define_property$e(this, "configuration", void 0);
        _define_property$e(this, "id", void 0);
        this.configuration = configuration;
        this.id = "event-logger";
        var _group;
        (_group = (_this_configuration = this.configuration).group) !== null && _group !== void 0 ? _group : _this_configuration.group = "events";
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

function bootstrap({ host, endpoint = "./_t.js", schemas, cookies, extensions, json, allowUnknownEventTypes, encryptionKeys, debugScript, environmentTags, defaultConsent }) {
    var _map;
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        allowUnknownEventTypes,
        extensions: (_map = map(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension)) !== null && _map !== void 0 ? _map : [],
        json,
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
                                "$ref": "urn:tailjs:core#/definitions/ComponentElementInfo"
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
        "ComponentElementInfo": {
            "allOf": [
                {
                    "$ref": "urn:tailjs:core#/definitions/ElementInfo"
                },
                {
                    "type": "object",
                    "properties": {
                        "component": {
                            "$ref": "urn:tailjs:core#/definitions/Component"
                        }
                    }
                }
            ],
            "description": "Basic information about an HTML element that is associated with a component."
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
                        "httpStatus": {
                            "type": "number",
                            "description": "The HTTP status for the response associated with the view.",
                            "default": 200
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
                        "userId"
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
        text: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,E,A,x,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return eA(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>eA(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:ex(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eE=e=>\"symbol\"==typeof e,eA=e=>\"function\"==typeof e,ex=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,e_=(e,r,t)=>e[0]===r&&e[e.length-1]===t,eC=e=>eh(e)&&(e_(e,\"{\",\"}\")||e_(e,\"[\",\"]\")),eM=!1,e$=e=>(eM=!0,e),eU=e=>null==e?Z:eA(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),eM){eM=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),eM){eM=!1;break}}}(e,eF(r,t,n)):eP(eA(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!eM;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return eM=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eH=(e,r,...t)=>null==e?Z:ex(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,eM)){eM=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,eM)){eM=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,eM){eM=!1;break}return t})(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e2=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eP(e,(e,t)=>r(e,t)?e:Z,n,l)),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>eA(t)?t():t;return null!=(e=eX(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&e$(!0):()=>e$(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=eA(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,eA(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>eA(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=eA(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rT).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rI,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rI{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rA=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},r_=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},rM=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),r$=(e,r,t)=>null==e?Z:eA(r)?r_(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:r_(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rF=e=>(e=Math.log2(e))===(0|e),rq=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rF(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rF(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:eA(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+r_(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rP=(...e)=>{var r=(e=>!em(e)&&ex(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rR=Symbol(),rz=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?e$(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rD=(e,r=!0,t)=>null==e?Z:rL(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rW(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rW=(e,r,t=!0)=>rJ(e,\"&\",r,t),rJ=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rz(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rR]=o),e},rL=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rL(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rK=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rG=/\\z./g,rH=(e,r)=>(r=r$((e=>null!=e?new Set([...ez(e,void 0,void 0,void 0)]):Z)(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rG,rX={},rY=e=>e instanceof RegExp,rZ=(t,n=[\",\",\" \"])=>{var l;return rY(t)?t:em(t)?rH(eW(t,e=>{return null==(e=rZ(e,n))?void 0:e.source})):eu(t)?t?/./g:rG:eh(t)?null!=(l=(e=rX)[r=t])?l:e[r]=rL(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rH(eW(rQ(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${r$(n,rK)}]`)),e=>e&&`^${r$(rQ(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rK(r0(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},rQ=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r0=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r1=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r2=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rq(l,!1,\"data classification\")),r4=(e,r)=>{var t;return r2.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r2.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r5.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r5.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r6=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r2.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r5.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r5=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rq(i,!0,\"data purpose\",2111)),j=rq(i,!1,\"data purpose\",0),r8=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r7=((C=o={})[C.Global=0]=\"Global\",C[C.Entity=1]=\"Entity\",C[C.Session=2]=\"Session\",C[C.Device=3]=\"Device\",rq(o,!(C[C.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:r7,purpose:j,purposes:r5,classification:r2}),tt=(rP(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tn=((j=C={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rq(C,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(C=s=s||{})[C.Success=200]=\"Success\",C[C.Created=201]=\"Created\",C[C.Unchanged=304]=\"Unchanged\",C[C.Denied=403]=\"Denied\",C[C.NotFound=404]=\"NotFound\",C[C.ReadOnly=405]=\"ReadOnly\",C[C.Conflict=409]=\"Conflict\",C[C.Unsupported=501]=\"Unsupported\",C[C.Invalid=400]=\"Invalid\",C[C.Error=500]=\"Error\",rq(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=to)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,ti)),values:e(e=>eW(e,e=>{return null==(e=ti(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eW((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=ti(e[0]))?void 0:e.value}),variable:e(e=>ti(e[0])),result:e(e=>e[0])};return o}),ti=e=>{var r;return ta(e)?null!=(r=e.current)?r:e:Z},ta=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),to=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r7.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},ts=e=>e&&\"string\"==typeof e.type,tv=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),td=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tc=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tf=(e,r=\"\",t=new Map)=>{if(e)return ex(e)?eY(e,e=>tf(e,r,t)):eh(e)?rL(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?td(n)+\"::\":\"\")+r+td(l),value:td(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tc(t,l)}):tc(t,e),t},tp=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rq(c,!1,\"local variable scope\")),tg=e=>{var r;return null!=(r=tp.format(e))?r:r7.format(e)},tm=e=>!!tp.tryParse(null==e?void 0:e.scope),ty=rP({scope:tp},o),tb=e=>{return null==e?void 0:eh(e)?e:e.source?tb(e.source):`${(e=>{var r;return null!=(r=tp.tryParse(e))?r:r7(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tw=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tS=()=>()=>W(\"Not initialized.\"),tT=window,tI=document,tE=tI.body,tx=Q,tN=(e,r,t=(e,r)=>tx<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tI&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tO=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nk(e),et);case\"e\":return L(()=>null==nT?void 0:nT(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tO(e,r[0])):void 0}},tj=(e,r,t)=>tO(null==e?void 0:e.getAttribute(r),t),t_=(e,r,t)=>tN(e,(e,n)=>n(tj(e,r,t))),tC=(e,r)=>{return null==(e=tj(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},t$=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tU=e=>null!=e?e.tagName:null,tq=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tP=(e,r)=>r0(e,/#.*$/,\"\")===r0(r,/#.*$/,\"\"),tR=(e,r,t=er)=>(p=tz(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tE.offsetWidth,4),y:ej(p.y/tE.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tz=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tD(e),{x:h,y:g}):void 0,tD=e=>e?(m=e.getBoundingClientRect(),f=tq(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tW=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tB=()=>({...f=tq(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tE.offsetWidth,totalHeight:tE.offsetHeight}),tV=new WeakMap,tL=e=>tV.get(e),tK=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tG=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&e$(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tf(l,r0(n,/\\-/g,\":\"),t),i)}),tH=()=>{},tX=(e,r)=>{if(w===(w=t4.tags))return tH(e,r);var t=e=>e?rY(e)?[[e]]:ex(e)?eB(e,t):[eT(e)?[rZ(e.match),e.selector,e.prefix]:[rZ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eW(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tH=(e,r)=>tG(e,n,r))(e,r)},tY=(e,r)=>r$(eV(t$(e,tK(r,er)),t$(e,tK(\"base-\"+r,er))),\" \"),tZ={},tQ=(e,r,t=tY(e,\"attributes\"))=>{var n;t&&tG(e,null!=(n=tZ[t])?n:tZ[t]=[{},(e=>rL(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rZ(t||n),,r],!0))(t)],r),tf(tY(e,\"tags\"),void 0,r)},t0=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tN(e,(e,t)=>t(t0(e,r,ee)),eA(t)?t:void 0):r$(eV(tj(e,tK(r)),t$(e,tK(r,er))),\" \"))?t:n&&(k=tL(e))&&n(k))?t:null},t1=(e,r,t=ee,n)=>\"\"===(S=t0(e,r,t,n))||(null==S?S:es(S)),t2=(e,r,t,n)=>e&&(null==n&&(n=new Map),tQ(e,n),tN(e,e=>{tX(e,n),tf(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t4={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t6=[],t5=[],t3=(e,r=0)=>e.charCodeAt(r),t9=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t6[t5[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t5[(16515072&r)>>18],t5[(258048&r)>>12],t5[(4032&r)>>6],t5[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),ne={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nr=(e=256)=>e*Math.random()|0,nn={exports:{}},{deserialize:nl,serialize:ni}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nn.exports=n})(),(C=nn.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C),na=\"$ref\",no=(e,r,t)=>eE(e)?Z:t?r!==Z:null===r||r,nu=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=no(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||eA(e)||eE(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[na]||(e[na]=a,u(()=>delete e[na])),{[na]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!ex(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?ni(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},ns=e=>{var r,t,n=e=>ew(e)?e[na]&&(t=(null!=r?r:r=[])[e[na]])?t:(e[na]&&delete(r[e[na]]=e)[na],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>nl(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nv=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nu(e,!1,n))):nu(e,!0,n),t),i=e=>null==e?Z:L(()=>ns(e),Z);return r?[e=>nu(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nr()));for(t=0,i[n++]=g(d^16*nr(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nr();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=ne[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t9)(a(nu(e,!0,n))),e=>null!=e?ns(o(e instanceof Uint8Array?e:(t&&eC(e)?i:e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t6[t3(e,t++)]<<2|(r=t6[t3(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t6[t3(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t6[t3(e,t++)]);return i})(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},j=(nv(),nv(null,{json:!0,decodeJson:!0}),nv(null,{json:!0,prettify:!0}),rQ(\"\"+tI.currentScript.src,\"#\")),rq=rQ(\"\"+(j[1]||\"\"),\";\"),nf=j[0],np=rq[1]||(null==(rP=rD(nf,!1))?void 0:rP.host),nh=e=>{return!(!np||(null==(e=rD(e,!1))||null==(e=e.host)?void 0:e.endsWith(np))!==er)},o=(...e)=>r0(r$(e),/(^(?=\\?))|(^\\.(?=\\/))/,nf.split(\"?\")[0]),nm=o(\"?\",\"var\"),ny=o(\"?\",\"mnt\"),nb=(o(\"?\",\"usr\"),Symbol()),[nw,nk]=nv(),[nS,nT]=[tS,tS],nI=!0,[C,nA]=ea(),nO=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nj,n_]=ea(),[nC,nM]=ea(),n$=e=>nF!==(nF=e)&&n_(nF=!1,nR(!0,!0)),nU=e=>nq!==(nq=!!e&&\"visible\"===document.visibilityState)&&nM(nq,!e,nP(!0,!0)),nF=(nj(nU),!0),nq=!1,nP=rb(!1),nR=rb(!1),nz=(tW(window,[\"pagehide\",\"freeze\"],()=>n$(!1)),tW(window,[\"pageshow\",\"resume\"],()=>n$(!0)),tW(document,\"visibilitychange\",()=>(nU(!0),nq&&n$(!0))),n_(nF,nR(!0,!0)),!1),nD=rb(!1),[,nJ]=ea(),nB=rk({callback:()=>nz&&nJ(nz=!1,nD(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nz&&(nJ(nz=!0,nD(!0)),nB.restart()),nL=(tW(window,[\"focus\",\"scroll\"],j),tW(window,\"blur\",()=>nB.trigger()),tW(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nD()),nK=0,nG=void 0,nH=()=>(null!=nG?nG:tS())+\"_\"+nX(),nX=()=>(ry(!0)-(parseInt(nG.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nK).toString(36),nQ={},n0={id:nG,heartbeat:ry()},n1={knownTabs:{[nG]:n0},variables:{}},[n2,n4]=ea(),[n6,n5]=ea(),n3=tS,n8=e=>nQ[tb(e)],n9=(...e)=>le(e.map(e=>(e.cache=[ry(),3e3],ty(e)))),n7=e=>eW(e,e=>e&&[e,nQ[tb(e)]]),le=e=>{var r=eW(e,e=>e&&[tb(e),e]);null!=r&&r.length&&(e=n7(e),ri(nQ,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n1.variables,r),n3({type:\"patch\",payload:e0(r)})),n5(e,nQ,!0))},[,lt]=(C((e,r)=>{nj(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nG=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nQ=e0(eV(e2(nQ,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tb(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nG,eW(nQ,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n3=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nG,r,t])),localStorage.removeItem(\"_tail:state\"))},tW(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nG||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n3({type:\"set\",payload:n1},e):\"set\"===i&&t.active?(ri(n1,a),ri(nQ,a.variables),t.trigger()):\"patch\"===i?(o=n7(eW(a,1)),ri(n1.variables,a),ri(nQ,a),n5(o,nQ,!1)):\"tab\"===i&&(ri(n1.knownTabs,e,a),a)&&n4(\"tab\",a,!1))});var t=rk(()=>n4(\"ready\",n1,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n1?void 0:n1.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n1.knownTabs,[r])),n0.heartbeat=ry(),n3({type:\"tab\",payload:n0})},frequency:5e3,paused:!0});nj(e=>(e=>{n3({type:\"tab\",payload:e?n0:void 0}),e?(t.restart(),n3({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[ln,ll]=ea(),li=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nT:nk)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nS:nw)([nG,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===nG))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rI,[v]=tW(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rA(null!=o?o:r),d],await Promise.race(e.map(e=>eA(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),la=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nI;var l,i,a=!1,o=t=>{var o=eA(r)?null==r?void 0:r(l,t):r;return!1!==o&&(lt(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nS(l,!0):JSON.stringify(l))};if(!t)return li(()=>(async r=>{var l,i;for(i of ez(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),eM){eM=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?e$(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rA(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nT:JSON.parse)?void 0:a(r):Z)&&ll(a),e$(a)):e$()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rq=[\"scope\",\"key\",\"targetId\",\"version\"],lu=[...rq,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ls=[...rq,\"init\",\"purpose\",\"refresh\"],lv=[...lu,\"value\",\"force\",\"patch\"],ld=new Map,lc=(e,r)=>{var t=rk(async()=>{var e=eW(ld,([e,r])=>({...tw(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ld,e,()=>new Set).add(r)),o=(nj((e,r)=>t.toggle(e,e&&3e3<=r),!0),n6(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tb(e),null==(i=rv(ld,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await la(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tb(e),i=(n(l,e.result),n8(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tm(e))return[rc(e,ls),r];eT(e.init)&&null!=(t={...ty(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r5.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&le(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tb(e),a=n8(n),u(n,e.cache),tm(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tp(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lv),r])}),a=c.length?V(null==(a=(await la(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&le(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>{return{...rc(e,lu),cache:[r,r+(null!=(r=rv(o,tb(e)))?r:3e3)]}};return ln(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>ti(e)),eW(e.set,e=>ti(e)))))&&e.length&&le(eH(e,d,r))}),v},lp=Symbol(),lh=[.75,.33],lg=[.25,.33],lb=()=>{var l,a,i,t=null==tT?void 0:tT.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tT.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tT.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lw=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lb()})),lk=(e,r=\"A\"===tU(e)&&tj(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lS=(e,r=tU(e),t=t1(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tC(e,\"type\"),\"button\",\"submit\")||t===er),lT=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rM((null==(t=tj(e,\"title\"))?void 0:t.trim())||(null==(t=tj(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tD(e):void 0}},lE=e=>{if(E)return E;eh(e)&&([t,e]=nk(e),e=nv(t,{decodeJson:!0})[1](e)),ri(t4,e),(e=>{nT===tS&&([nS,nT]=nv(e,{json:!e,prettify:!1}),nI=!!e,nA(nS,nT))})(rv(t4,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rv(t4,\"key\"),i=null!=(e=null==(t=tT[t4.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:E,unsubscribe:()=>t=ee}),t},(e=>r=>nO(e,r))(n)))},s=[],d=lc(nm,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nH()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),la(e,{events:t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(r8(rp(e),!0),{timestamp:e.timestamp-ry()}))),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>{}),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nC((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nm,v),f=null,p=0,g=h=ee,E=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=eC(t)?JSON.parse(t):nk(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nk(e):e),e=>{if(!e)return ee;if(l1(e))t4.tags=ri({},t4.tags,e.tagAttributes);else{if(l2(e))return t4.disabled=e.disable,ee;if(l5(e))return n=er,ee;if(ir(e))return e(E),ee}return g||l8(e)||l6(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>l6(e)?-100:l8(e)?-50:ie(e)?-10:ts(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,ts(e))c.post(e);else if(l3(e))d.get(...eb(e.get));else if(ie(e))d.set(...eb(e.set));else if(l8(e))rh(o,e.listener);else if(l6(e))(r=L(()=>e.extension.setup(E),r=>nO(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(ir(e))e(E);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nO(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nO(E,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tT,t4.name,{value:Object.freeze(Object.assign(E,{id:\"tracker_\"+nH(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n6((e,r,t)=>{eV(null==(e=tt(eW(e,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee]),[[{[nb]:null==(e=tt(eW(r,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee])},\"All variables\",er]])}),n2(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):to(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lw(E),e.hasUserAgent=!0),g=!0,s.length&&E(s),n(),E(...eW(lY,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),E;W(`The global variable for the tracker \"${t4.name}\" is used for something else than an array of queued commands.`)},lA=()=>null==A?void 0:A.clientId,lx={scope:\"shared\",key:\"referrer\"},lN=(e,r)=>{E.variables.set({...lx,value:[lA(),e]}),r&&E.variables.get({scope:lx.scope,key:lx.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lO=rb(),lj=rb(),l_=1,[lM,l$]=ea(),lU=e=>{var r=rb(e,lO),t=rb(e,lj),n=rb(e,nL),l=rb(e,()=>l_);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lF=lU(),[lP,lR]=ea(),lz=(e,r)=>(r&&eY(lW,r=>e(r,()=>!1)),lP(e)),lD=new WeakSet,lW=document.getElementsByTagName(\"iframe\");function lB(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lL=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lK=e=>t2(e,r=>r!==e&&!!lL(rt(tV,r)),e=>(rt(tV,e),(N=rt(tV,e))&&eB(eV(N.component,N.content,N),\"tags\"))),lG=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},lH=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tN(e,e=>{var s,i,l=rt(tV,e);l&&(lL(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tD(e)||void 0,s=lK(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),lG({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t0(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,lG({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=r$(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:r$(l,\"/\")}:void 0},lX=Symbol(),lY=[{id:\"context\",setup(e){rk(()=>eY(lW,e=>ro(lD,e)&&lR(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n8({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n8({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n9({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n8({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n8({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tP(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rD(location.href+\"\",!0),A={type:\"view\",timestamp:ry(),clientId:nH(),tab:nG,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tB(),duration:lF(void 0,!0)},0===d&&(A.firstTab=er),0===d&&0===v&&(A.landingPage=er),n9({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rW(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=r0(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n8(lx))?void 0:l.value)&&nh(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lx,value:void 0})),(p=document.referrer||null)&&!nh(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rD(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lF()})),l$(A))};return nC(e=>{e?(lj(er),++l_):lj(ee)}),tW(window,\"popstate\",()=>(x=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>l0(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!A||tv(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lp])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tI.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nL),!1,!1,0,0,0,r1()];i[4]=r,i[5]=t,i[6]=n},y=[r1(),r1()],b=lU(!1),w=rb(!1,nL),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],E=T/r.height||0,A=S/r.width||0,x=f?lg:lh,E=(x[0]*a<T||x[0]<E)&&(x[0]*t<S||x[0]<A);if(p!==E&&w(p=E,!0),f!==(f=p&&w()>=t4.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t1(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tR(i),viewport:tB(),timeOffset:lF(),impressions:h,...lH(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var _=tI.createTreeWalker(i,NodeFilter.SHOW_TEXT),C=0,M=0;for(null==u&&(u=[]);M<d.length&&($=_.nextNode());){var $,U,F,z,D,P=null!=(U=null==(U=$.textContent)?void 0:U.length)?U:0;for(C+=P;C>=(null==(F=d[M])?void 0:F.offset);)l[M%2?\"setEnd\":\"setStart\"]($,d[M].offset-C+P),M++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,M<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}x=r.left<0?-r.left:0,A=r.top<0?-r.top:0,E=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(x,x+S)/E),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lp]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tV,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tV,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>l4(e)?(n(e),er):l7(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=tj(l,e);){ro(n,l);var a,o=rQ(tj(l,e),\"|\");tj(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tW(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tN(n.target,e=>{lS(e)&&null==a&&(a=e),s=s||\"NAV\"===tU(e);var r,v=tL(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lS(r)&&(3<(null!=u?u:u=[]).length?e$():u.push({...lT(r,!0),component:tN(r,(e,r,t,n=null==(l=tL(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t1(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e7(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=t1(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e7(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lH(null!=a?a:o,!1,d),f=t2(null!=a?a:o,void 0,e=>{return eW(eb(null==(e=rt(tV,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tR(a,n),viewport:tB()}:null,...((e,r)=>{var n;return tN(null!=e?e:r,e=>\"IMG\"===tU(e)||e===r?(n={element:lT(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lF(),...f});if(a)if(lk(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rD(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nH(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tj(h,\"target\")!==window.name?(lN(w.clientId),w.self=ee,e(w)):tP(location.href,h.href)||(w.exit=w.external,lN(w.clientId))):(k=h.href,(b=nh(k))?lN(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t4.captureContextMenu&&(h.href=ny+\"=\"+T+encodeURIComponent(k),tW(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tW(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tN(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tL(e))?void 0:t.cart)?t:t0(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tL(e))?void 0:t.content))&&r(v)});c=lB(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tz(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lz(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tq(er);lM(()=>{return e=()=>(r={},t=tq(er)),setTimeout(e,250);var e}),tW(window,\"scroll\",()=>{var i,n=tq(),l={x:(f=tq(ee)).x/(tE.offsetWidth-window.innerWidth)||0,y:f.y/(tE.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return lQ(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lB(t))&&e({...t,type:\"cart_updated\"}),er):l9(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||t_(e,tK(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rM(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=t_(i,tK(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:t_(i,tK(\"form-name\"))||tj(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lF()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tW(i,\"submit\",()=>{l=lH(i),r[3]=3,s(()=>{(i.isConnected&&0<tD(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tD(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r0(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lX]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t1(e,\"ref\")||(e.value||(e.value=r0(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lj())),d=-(s-(s=ry(er))),c=l[lX],(l[lX]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tW(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lj()):o()));v(document),lz(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r4(t,r=r6(r))?[!1,t]:(t={level:r2.lookup(r.classification),purposes:r5.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tT.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{level:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,s,r;return it(e)?((r=e.consent.get)&&n(r),(t=r6(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(r=a.key,(null!=(e=i[r])?e:i[r]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e;tI.hasFocus()&&(e=a.poll())&&(e=r6({...s,...e}))&&!r4(s,e)&&(await l(e),s=e)}).trigger()),er):ee}}}}],rP=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),lQ=rP(\"cart\"),l0=rP(\"username\"),l1=rP(\"tagAttributes\"),l2=rP(\"disable\"),l4=rP(\"boundary\"),l6=rP(\"extension\"),l5=rP(er,\"flush\"),l3=rP(\"get\"),l8=rP(\"listener\"),l9=rP(\"order\"),l7=rP(\"scan\"),ie=rP(\"set\"),ir=e=>\"function\"==typeof e,it=rP(\"consent\");Object.defineProperty(tT,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lE)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9iXbbRrYoej-FRLuZKrNEEdRgGVQZR3acxBlsJ1Li2BDiQGSRgg0VmEJRQ0j2ur_xfuB92P2St_auASBFufvc9e6653QsouZx1543IZQ_WwTzSrQqrfKRDobXmWoJpphmkhUsZxmr2DUbsxGbsBm7ZFN2xe7YBbthn9kpO2Mv2Qm7Za_ZG_aOE8EUF_zZS6VKRQSFxvWlKm9a4pIIriaQFkNOJFbseyzPNN8JoWA-IYJzrpZLOS8Kzgn8aXMRi0hRqoSeK9nuD6HYDRG00xE3RMGfXiHkVF9CXfuTLmAWBZO8P5yUihStXLYExS6SIm1zrpIi7XTa3-M3gy-md0LfTTjsduXKfLQk5_zNxScx0r3P4q4iitpuVq70ij03c-n1epryZ3Ye_WNtS3Y6uleVV4Io_uw5lKSU_YZVKH9Wz_OdnbOKVRSctJT4a54rMW5dZ8VctPKqdZVXVS6nARP82dndTNiF7ikxK7KRIEGv1wtYAEVd5V5AKWU_mr1p95nGTVF3Czs7QehqlOnRJRHUp50QRWNxB3uGW_YOtywSc0gflbIqC9ET2LmymTRSq0kus6K4W5hZ6E5HE7pasR_gTOCWwG7DkdO9XOY6z4r8bzFeLmG-RNnz0dOXQsaKK_xBBH9G1orjJHpKVGVxLcZccUFp9OUidGgnplfsd55Vd3J0bzlgeJIVPLvJct3Cobha4gqm7U4lV0k_pfF1mY9b_Uj2RllREMUKGhX1QuYT0sbVMofuyv1SSZjaQ9aC39CLvSErGEFu-iemM-V6wV2Ao5-3clnpTI5EOWnh7lNTPXeDzVfQjU0Vw_XNEtTvUbMf7frRhMKGvYcNE-wDN8nsZ_56fnUhVO-nk98_np588_Ljq9dnL799-QsTgrdDJnAphdnbxYoJaRoQBfy155uJnJ_eXV2URS_XQmW6VExk7hIQzSRv9-HyEE2XS9XpyE7HHyTzg2iuiKY01tEHJkpX1x7XNucfDHD5ENmJCTcxkaiUYgEBVecwruCiLAuRyYBzfTeDBRVMVFxkRMzhgvXbXHQ6JORcLJfBJCsqEbQ5pgVazUXAMecD3C9xDS2224KJiVusvDrNJuKV1GIqFBMz7FNi3lqXl5gB8FdO1zKmOJZLZtewOZ2eLk-xAoHOr_iJUtldL6_wLxN3uP73zgoTFxYOhLRu80PUVp2OuCKCxiISt_A36fV6Io0SkTJxU28iTD4oERaujfSzA5AzVeoS0pk4dWlTod-65DcTJs4ah6LTEadEUFjJz0y8cjsaTOZypPOy3putG8rES7N2eKzWRnSCGfeagazbxhq0XbvLZVskIk-XSze_tq_S6bQVZeL1vUX9KZsx8eZe8qnQTHxqgne7zCG8C7GIfsr0ZU-Vczkm4jFRHL9n5Q0J-0x1Ou0-vFCxivqU0l3FxEf7UsJZT_optNLpiMS9fDshJGkmXuBQLvF1JOIjESxYBCxYBXS5NJ9JwII0gDPzE17cR1CDwEefCcrEr1w0RyxOzKFQ_JnCs_BNPZLGW6XN1SKCi1-JoMxCr06HKN53n7rTIZr_TBmRrKD8mdrZiT9EemcnFrHAtEhGmkaCib_4tiM_yQstFBEFZeKtHQeTjRVO0uZJ_gufJdjT2B2Dx7glAIft8aMIKxcKxq0o4j7a4gyyBVtPfVkA_EQy3e1SWN27XBTjloSFpAtczOGFEtnn1UoUlWhBC_iimFZME7JRb0UE0xwhViS-IWYqNELUZnO8zeFJVg_QIDWI6vBEMpHINB3WAy5gb0iBQ46KetDFlkHDcJrDeEvM1q-NhOmH3gG6wBGZA-E7UnSod3Y88FZcwDM4pDYXl4BJGjU64X27QeK4T12b7ijtiJ2QDkW365vY2Rn65V4_dEOxs-OLdbvYF2Vwjf9uHh2YqP1g4muHkIbwFoWA_lL-zI9OEIsVN06QwhNkAIe0KCl1m5_D5hexeEsUjRQN2_DS4pAeC5IDwskka_dpZIaZm7nUq2PGBqNguotlQ8rEu-b4Eacwx4PhuXfnoc9ynqR4UDTXx_3YAYuujuyrGuuozySXzUxpM2UsI5c41Mey02mLn4ZwkrD9jItEp0O3sXHGFclYAQcto51O3pvNq0uSUYdCG2iTe4zaYbwXRPztZ0OjDysmnm_dBCj5NWnQJQDCfuMEninqkEuPr72HR5u78ccAMwGsNF6dBvBSPEmpGTC0dgGLSJlaMfHdGlLfgIr4RIp3BNtURJgiNPI_mfh9bZdwT4YNuGOxQuEoDnKvNJBe9qb__7GBuHf1ABKddjqk4HYHc8DzE52yDMBbnEcFgIh1GGEXt1hRP1aYEQIxS1qJPG3Ox80FtixnhZ1NvgFYc3wXGkA2x4NEYxnpB0ehzShwBPcRkv9kEAg8cfyNrpOciSRP0_URfGkAq7XL3gAntJ5dwXNPSxSrFRPvufidiZ8dgjRR5dVLqVUuKib69QvraBLmkfvGGQTiYrnUMck5YNzvAcDFRPgHsc0N9QZD8SBYJGHKNckTuBIpg098zWwCx4QIkAhoT8Vi82q5tdpExsIUmiEe0hPJc5oUHJulsYpkUqT1RcMKLKeryF_Kh9psDg2uPVSLxM8Er5-KEa7zZ6IkyoD40Iy_JIKFlNIVEwPPl3CUiOZ495hBRIDE1ADgrhqYr6AG_tr2TeNIPEAlysT-wxecc3cCWx-GiGEILgZYvB2aiwOQftF8qus30vEwADHoVfnfHkaYDtrNa9Zq8iXEBl8CXwFPOInfYTaUP-t2C6Sg-ismDrmBWOt4qpjBQiBSepXduhIRqeGvm3KGFJ84IZrGmtBIb5wTYbs1x9KxF_yVgwOqGR7RWEQZoSuzuvaD2vWHRA7UcowkM-IMDYi8XIoZAfxGHBdxEQn2galkAFydPSARnmzZqPvX6QyR5raK-8db1zTa3Cnzg8MPgbwdzxIoDEtAsPqNEdeUwtB-b57Zdtucqk5HPCKABuBa4k8DQTqdYsWU8MdX1Fg3EE69qlSa1AeU7iBxDHi8Ug08XfSACaDVfKRL5XlZy6U572bQQD_EY1EILVpAWiF9xXXUyBU9k-9_AFazVqVXCShWCQ2YEo1ELxuPY0jKxmMo3axpOkCkTG-CPGTyuSO-ffgGpOG4oG_iB0okF0Byxviv6fUyq2L813VM77MWJG8cY9rpKIWDkpRJumJKNm4KEe-JYgqhpGIkUUynMHbfJIHjZLoRZ9CokviNi4LzpiuzUSJDAqxxrRBerN0iGdeYZwR9a6b5M3EFDWNO0k-ZNpAbMkmimUyRk2KfIkB8V0zlwE9QijKVwS-_6Haqbv5KGw5lBIdJ1VyWDRJ3uVxLeSeyz6dCx2230LAMduMRybXNAmmbG1jYp0zN-doj3SBftrB_W5rbVph4BeSsOU4BfehMMr1i6tp3sXaskKlnkLBOJzz22KLy90ohlQqcTdq7ymbAvFXXdm3M5VF1NdGrZkU-gjUPKSCcjnU3N3gCU6PGEYKhmALtxmtxHx8gqjcpMv1TNiOw5ze457jz2g3JTCRssL_jBFiUTOCfNI3UiNjf2D2elERBfprSyHYqXIdmrv5UJ7BR3F800xacZGgk0QzQxjSlnjr3ryziFiumJgi6DCOBAHmvZgaiIdvfrmMssFdAp2eQCbz4yD3FZ7ZIH96DRNhxQUNEY9GURgsou4rEGygrxQ2cUKJqJL1uFbgCr10pWNi6FKIa0CwiG7ZlgWO-3PJSes6EIx7gak2_VHAuq8t8ol3Zq_XDj5je2hk9wzNqMLwzy9Z5b1chS-05ylCeIVKDhJ8RzTPDbG6TjKsrkjHMdZdomGRMpzxb5YlIecbsRYOns-BqBgQsZOjVirKCxknOCneYaZQIJtIVU3c8mMuxmORSjGtO2UyoSamuACIgMwjBhkEktJrLEVF3RAC7vlGwp_Mr8Ubl01x2m8myvCE0-jrT-JMp4FwCl0ohyqHuCG1g9rwrHitCEb23uH_OBcuQscxFXHT5juwiik9pVLAMsfI-ZUTwHFbV5DANB_azOZ59177g5vQuJiBTEXJ0FykGT_xFNvocwaFji7_mYi6iAgY4y-aVGEc5EK9a5dOpUFEGH6UciaiEX77y3HHMVTaJqhUX7BpwwBp76vk-ASnqsz5lY07g5Koz6iQchLIRVxeknVM24SNC2cwIOVrCnJD29XLZLjqdcW8m5DiXU8tjFLW8K58Qcte7mFd3wIXHPKBshr7KkBrJyNhT2cvlGEYgNKGMIG_TlPidwKTmBAayM-kSHBKlgPtCRlvAQPzQgdd_zPvLZUk7nSsCLI62H0lIV-wS1-iaV0Kf5VeinGtsv4pxZSp9IvOrDBg036jsSpApjaaEMnXcj3dUpCibmjW-62UjnV-LTmdGKKu_LgHrvLIsYcSwRuaFGRUiU67H67oKb7fJNRfxJaFRn7I7yu74wmRF7ZDBwOGvEpXOlI4sfuZ3FR80Nuc1DT9nV6Tdh-eQMl1Op4WI3JPb5tx1G4tYxeQKscO7nj1YMBMaYWKEaxfd1WfOnQCzKzMDPq6IaxBf5ZXbzbue6Zq0c5bR1dBxvVrq1OIJC4U0c2zfC3P536pyJpS-wzILlFMCzSznV0JlF4WI2n02KuUkn879943Ktf29cvjQalRkVdVSZ4up0EbeSbw4Ul_mVe_jTJVXeSV6mLmCYkam9UAxzMRi9gA_VNBmr9yJtLKB7YUbhSiDrJUSsBz_rpYr4yvhtdlamuPtfmUKVvlUZkVDNItF_ShMc_4WYhUjNUW-8bax-OxVA62GoZwSKMgCVzJgFuiv9bFyO_Vq8b_ZEYLU4Re681l2mltzkONzPwMPx5Z0PA1b0u3mB4iM3t-Gt-Y3IQ5tE1wZ9KiWWtpXGCvb5mhzQWwaPgeXeZWo2I4msqNNOfLQlkvNQPaJpRAPbjZjpcS10D-wY2tlhRLZ-K7lxN27ZnFQ8r-iK8qS5plxmwlFUi5WKHVWJxvCquUyr74BgTqcsbgNJPYx78cKaJOouTCaP2vAZSNZB_k-8WJ0hYQOjd6RP1_J66zIx62xKLK71qOFWPX-pEy92ST_kO3L3ZoL_AFM8BwhuWwjkdcOAZxpUiAcY9laXh_ylM1zIC4jlCU5y9IVyp39884UtwijLZmQJrOAqzfApODPFFIzQLTBb0tvgFzeUWudjgCVB8BEWQFKAqxYMWLZx0RwzVRvUqqXGegI2IlpSikgVEbEx5Mgk-OABawVpDVR5F5cxPIBLXiHihJr7G2kAhLRq5AI6bOdkPY-lbkktegcMPJYR9A4ZUErYEgmwI81WWJq6gUBkM6NJlArBeoCn1795OlCJPRM7WeAyDdG0A3-1__8f4MIOBKP6l1eky8qGquPyM27RPYbIPwAJ-v3EQdyaQWRpihsAWIc2AhtcFqCgDL1jZFqGrlqUU4HqIvEOekvYSh_8a3cdlYysYUlSzYIJOFpHcDCFRLaRuQqEHm25JPNSkBU_2N5I9SLrAJMTaWUsorfa5RduzSECpg0rplNopfJO-AhXfeUGM9HwoEgsVSAFY64ipEGYpm8i8ZMllJEfcBNJ__BnEabo1YMKAaGlFqDL-MO4gTBgup0dGxGOElECtzRaJvug9m6D3YTPb_F_xgBeRLLaLS5WJg6I7NMVdAWvnd4-i4BRCRTdpVyFSd2JdZ0ILDPxlLV504vl5exiCz3TnMkIimNySVg7x9o1OA89OlSM4K9fQCyBUawBimJ4FMiQDBH4w8RCB8zWIvOOEW67YqIzr-I6IwpFvH0eQYUYp5GWUQEr-rzZFYfZNgd1emob5rnCQ8aBaa8a2aLkCsKYOPhxqVRMqtFXkTwGWpywUZFH1J2d189oTGjkiOXI35H6gfn-9M3r3tGSyWf3JGSdv8EPTNZ6lbWMoD90UKvDPLW-xMobXaxNjmcQlsul0R2jM4HzrEGoesCG07UBnNdbWhTAX0McNY9lPi8K8eICWkT2iL6hYWHBVdGSl8AJFV0WPiCnu3xBSx3HZ8NN7DdGrsNYZMl_INMQFAbmgod5LKll0v79sMHwGTkvXU6bacwGAMeHOlV5HDq1Qo0s9wFVBszgzcW2OX8GRx8liRfHGS4Ygu8U0gt3L3Fn1NmgUFUMQOBomtWlOXn-Sy6YpYJXtnhMSTTNUharuD49ykryuk3JhEfsqBUASjyZPIuMI-WLUhjSGsFXR39qS-FOTN_di1gv7DvK1lTQwm-CrqiG3wVUJwqcFZXoCizmM2ViC7YVTZzJBMRHJfg4v6lEuYq1W-FO5KC0lWKTb7dkCjDuJ-1LY-wKfZFBhK84ZbjhMwj1u6nbhwGglp9jnvAPvpACbKzDNFnnqsby-Ax6iv1kTS3ALQ7OPCzaaTuH1evvvhhWPOzDQcaZeG6BhNAbiX9tIcngIAopW4uR5YJsAr8w5M1au-EcV7Xy3vu8BAUViBjkBcgdEOcr6F0qX6xqn_wAP7tUJ1lwIIhIDtByrRR_luXz4iYNIUssyLXJOABdbxCEFmMyrH49ZdXL8qrWSkFPBJAHF8RSp1W7ElRkKALarGI0dhcmoQoAgeJKCANRTJIeWESN7UvnUgORJybULNWv_i9Fhe21XJpxa-grige4Z5b8sNRIZSC9MAoO0DHdoKoNh161WHQdaTLJQ40TuDfNEoAtTRo2Ndrir31sNSPRLDdP0gcwf-S85tubyft0ojG5Hz3fJfGNCaY80f0X2mXkjg6h4__Sh9TGv8XjSEhIckf52napefpkiT9nadR2l0mf-x2025MsUhEzsdQAVtN_vhHnD42VWOS_PEPbIvE0T9ID3492p16cZ7Ft-ZOudzQVouqnKuRiASrRpfiClgJcyUjHbdl1JadzgeWzfVlqXJ9FxVsXgkV5WyWVdVNqcZRxi7LyilHlHEZzdmsVC6hij0aUcFezDJ9GV2zv-ZC3TnNvHGk3pExYJ8TlU2vhNTRyMNc0YMq3PyB7e35wcSiN1cyDoIo2A2iDwiMmXKKOuZkq-9BYNEJEAdm6nuPgzYOfsZKnqRM8AaG3K81FP0DDcxyUDTeJXH0R-9xfB4v_6B2xXeBo1aXRJzf85_NCVMGiWEJbMM8dYhYxtXfiMsgtx-U6Qzf_0OEQqQ4i5KUVQBjq00haFHLPp0q-u55cp4-2mVBQGncNrpPScHC47k72PMoTyMYQxp9YKVholeUVR7FEq6e-A1TIiJiARcZsPwuMPf83hjo80vKS1h8poy-O5yzpq7rmkwp_hAVMdH8A8tjImHd8c4o5p4ATzgVJgWEhmaUQLRFtdZ9XaUua-SfZpuA1f_DVpVGv1jJ-R-Pzs97j7sxocl5ulgt090pC87PH3WAoPmW757_3dudMvWdV5hWXD0iDXmLl3qg2AR2cg3cOKiTmsdnQMRWvWIL6SgLlrBxv4jpy9sZUSyYzgMaqW-Z-h2kEer9Pa1XU5SpDxx1uRME7A0y1kN19Z4YnAflWOo7ePiRwF6sieUBfn4w-iuNA4wAYgXLP8dW4t3e7jRS3wJxoT1xUWDt32miuE5R8g5Pk_qRAOYVGLh4vkt63Zie78ZLhE-PdqdzVstE700dx6l-JprZnD9JfNyG_87Pz88p_pM8WqhHRDL1A12lf1JEZUSn8-cfmK5-JsJVDu5XPj9_HJgq6geiADvYPT8nPQoH4VEIWUHvcUBXj_6kRldO_ezlR-tqF4rf21d381GtZMVUU83o31auD7r2DYSwxO6i7iiroZCE6Q5QIjUSn6R-33Oi2QIvECpRes0pUF4tUmDhCGsCEOveTT7Wl1xvkHCiCzoOrA9YC5ZgJe8PS_9aDkunoohPC9dJiSqxguQg0ruGoR33qecIaUcslKwP2kWubB_Khik95n1Dabg0rN_pkDmH3zxHNk__2LdvlJYgN4RcUHNqE4fFVDCebgMiV9ge1qrHZPZhTodznvN6gDs7RrC8WvmSqDqXuLmnPAeBKy5L1F8BPjvghHziBS-Wy8WKJp96J7KUd1flvOL9lAf-K2Cfkk-9V3KcKzHSHFAi92GyvjYZg5QHXzeST4WschSK7KU88F8BU3-RAgQ-wTjTWQtZxvkkH6GcBk6y2t-Q-7szMnD4pQO-9w7jemMASLYAsWtRAIH5UHMN1O6h5tawP2iu01EH_3Zws7malZWotg7LZ8LIDv7tyO63tS1zxdTh9rXc7H9G7i0e8qyaoxZGkM5wylbqy2y2-1xvI9q-xus_tu2a26Zts7tfuk_dMKpoc-3E1h6by-e_vryWsYjy3msxElWVqTuwhFIHeINynrsb9LqUAi8P_DC3wNfAi-O_TOY3VpCWFbm-wwu0lmIKva0F33w_5UHj2xQ4y9RUaBAjHKU88F_uFo7mgIby8BBvoflyd3qiMiN9mSvB9wZ4tZtpptyJvPtYA4f9pwgdGkm-FD_cM3mub3UtFB_094-wb_hq5nx8p3It-H7_6aHPN2kIJHLW7lsgYXchYIMwDClln7jJDzfzQX5z5NEgUHK4d9OuhM6gkjEkI1YjKOvNykqLMfPfKLYfsw36PHOMOrpcOmUi3ySq1z3hhLzgJYcj8aL3bVFeZAUeCvMzYC-SF72XUuOmpDwwP03yqaiqvJR4FOxvk_G1uM5HBpKan7hCJWsTyP21EgrPBvwA_v11pnLg57SqUTkTAFRLTooawrPGUWYLLBSpJ_4yf2rep_t3ekWZBg7cW1JS9mVrnDV9KdHDnlAbCX_FAjQpe0U5ygoBVHqmBFGQxgIhkSLHcju2PKDOEi_dC27frPHYvFbjsTlZP-USV_WnXNqE7BaX86fs1p76yU-AeeNa2t-4mC9Ym5h8uL2mzD6W8d9rSzuDlBZotwSUkRe84pWBAy96p_MRLC4f9GFs9sts5AslMi3GfNCHUdovk_WrHF1mcirGfK-Pm-m-3RGQuRjz_b45BPBhMl6X-huwF-P7WM19msxfRDZ-I4s7vt8_SHngPu1gSjkp8pGGKwijsZ9uONV8BkSyGPMDHG0jxRSxQju-j_O0X_aAA1-YH2DGSyNgVX-RCq9sfTqFblU60_MqoOyeajsHkUhurUVR2MB1aXWyLQtu0TDsBQYryJWjRv4PtaWuRRJ_J4oZNbEVRV0Rojatg42pca3-oFa0ll6C8jpxIswCGOHwUAKTi5Ucxd6RQAGesVVmWVHYBMT3KbN7ahMtqSV6ZhmO9_rA9HMLVNlSwFbUOWYg87VO3UYZ6Ry5-f42GqUIkNjMq0tUJCa4qqRhii3eEbLtJltmGrlPM-B46fF-vw_yG0qNaYygrLTDNKPcOjpktd8boJ-2qekLgrrMvNB21pDkt6YEUJTze6YIOmtIk0BvfjRXSkiNBAqQRzprGHqq-OH57fX70Rdnv1zu9_c55w8WYrrcZrYBTIWMe742MRppmF-tsS7c0cC-2rrTMf259FhEhqR99udXjxYIUFdfgTbOo4V60jO8eGLhKF2ZB-FP6tCjiju6mcZVJGg3aI3KOVghlrp1IVpBl2x0F0wAuPSC6E_ozdRdLg_6qDPmC1VCB1EAygfBqnUhRqD31voTGnvabOzPctLKWiMLd3qts0vRErczVFFoXQsFD2Drq0cLTyPVo3VUUs8WW33VGudm3FcGMl-Klt32B5ryh-J-W70_o_3-XnOojQVDFQ1YrwD6APEPvoytm6xqjREw94Jov9__j6ob_w3jUhhxGaxFqa5ausQJIK8zg9YO1jYh18aPQzZulbK46wXRwXp_AaysbM2lX07sNmoFXTuCyBf5LMsbCY1VpQSXEGxNDNtEh5MMSFjkAgJALehyae35CgpS0JXnuuWOk_eO5FZn4ByoO6scnVlMO3NNZ0C9Ml1xwxW5b_LeQ8txfY1HXXmQ1EDVoQA1tg9XBlbU13KzGKUkCa5zcROklOmx7XX3D_LP5GTnm_7O03QxWC2TP_6Z0sePdqd5T4tKowxmt1GgkbFV2gBiTj16gJrtdEibjI1BArkGlxbZtNvQyDBgkRolB2Dc1nljuM4K80J63KzTSDdLAW2jirmeGIgXBExzq958T-_dSLHem4dFTyzYcioWRm5gJAPnVfQvkBlEJG4nrYgDQMfkf4EAAFho1eMk4ul59ZjEUQDyhCD5I0gfL3v0MRYIlo_o8ivI-Cr546t_NXK-ghzIaD02MorkD9YZ_gPappQ-pvS8MqKE1uN_tR6DmAH664G4wcoekvMKavwr7S4fUSNaaAgWYNoFX-hsGhEZ6zGRtBtEkWUdd_UYTrOVrY7Jhk5CHudRBroHJV0N551OCIAPSc5vijLTZA48nsJsxHr6bgh6ZCOiWUFXNMJfoLWwYnqGSO2Ijxwl-VsubvgOYHrwy9F5F3xngCTehSWjLjMlxhxs_APzG7GsEWJZiFW37lMCesofMt1TXM_8k4HcvMYTAmfoyniy0LOGeO_es4cvDdN3XL0llrbQsxXgBfqC30MJ6ppWjceB-FhfEA_u4bUhXxy2H5AbOIyY1i_f_3CP4__4s0saStQa6eVXY-g6CGCS6NNiIWqp4nk_cHDNzqeLxgCfxR2aIjLXRiSSQbpaMX2KKmTw3zsCCHmrgWL2Asr0Gb_J5bi8YfoVH5ejOciTmH7J9aveRTm-Y_qW_8z0ayclshBE3x5zhCTehQDvA54shuFWDESWY3FmoGIbdBxktwusKiOLVGsWY6gTX3AFr7hyIt6cMgHqVjshan2Ds4tiaFioOSu5GJoezUIC8Sb1y0LAXKiXlJZuOGWvvJFCfW1nCy3qV4Dg2Fem9KKpkm-UBVWLbF5ouAu0bm8CSt2uw5X3ccP0Gwvq_g4shPPTDOCX99SCP5bL4ALUEBSl1U1uZDKLUVaJdj-CP8HfQbSFd0Y0J0HQBTzfCI29n5x1PaUhNhWaplRg_l4EkWkssI5iUPKPRQPp8loN6OEyP_nMH5F6QcWbmT33TGhb7HKjmPy8li02s3FG8sw7Ljpzxe3CR03DqE7HLFxs529vCatl72ZWdmH8urzxWjaWWwg35VONG-s390_wVOgTrVV-MUf7LRCP6obHE_26tiCVRH9yDxZl-sU2-YehQD4ZOy1_3pQfK22gCc1NXDH9yLU3FRqe-LkW41N9V8DCWzc2qAf0G-qnK9s60782jItjADfT19mVUTFjGp2ZkMVtJD6RaqTKovgdnoS7-vs9AzDG9FvXvRH-_KP32MhP4eD2iWqkMP2LAxtoZENmXP9tZtzpvCeL29ltNOvdsjv8e8ew81nvdle_7JWTSSX0OxSe7NtxzHp3ddZ3Ip9easibZVPxTVmMq0jHUMTAs14upVCmlNtlyvTf6_7MQH-tNytzqYUC-FQbWt5jv2ZT8Z7Gi1v7-3d251JXkYhh6S7ZXTRdcf01nFn_7c4Y018jcheTK4NqPQfyJZfTF0UupP4FdO_BMkb_BdZHzGzFVa8QE92d9G7tGlz1dDnrTnp31IpQMA1_UnZpZotJ5jdtdF-75OCLUTYDrmqElkBVhVYh_ZUR2IoLlAW_sRaczooU9IpfXgupf8wrLaRQzm5zvZQSV-W12FoQij437xHw781UlZtIc9vMvtvp3N9PpkudFVgo2jgrmGN3feOswPb_hggnWIGCVyT9I-yI_g0RX8AUfrBWzGhho-JgZ0erbPR5J4gC-4N2BdPf8jUnH1tIACNhE--38zKasATuYEWQa8Eyi1aUG2hFycmdceiWXPAspXEZ3SUXKXjEEIK1xSXoUb1Ht23G0JfJ1DgNUKinaZrJYmVohAyF62j7mjvnaW2NukDrrqaMZoCoUJWAoG6BeERq1x2ZoQYKvgEeMyjZFhUBskxPSMFUn0i2e74DUuIoQOiZIzT5ztmW6d-bBrA38JbfcL0PYKqqLWu_M_40jNAWb5N6jwrZiUhT5_LkOXLYosSYZCYgnzczoQzokEKM0Ktbb6bEJL9NIyxBUWMJVAIWK5YkKHzHPT_foTEMArD5R8vzHQpy-F00UkVu1Q0YPd4YPbskTNGvw6YOVZoOifZKEfpbpAIUtc45mH7vYeojIn4j-hHM4AeiAOmhzH0GF1kldoKuSUbleMr0B9B00D87SKuBZgoytxdVQGvFaGCwfetN_onk-kOiUX0Zf-DUkaj15NX5aZeeR47KOScmgS6RwGJR2kUSiMTt89PH55ElcJzSOqyrXi4lZUylqERINE3RvGhCzDhhYQPqlgvXou_fjHV_DPelZzp2ry6-wET3jYU4KpoaM3FvEmoX9pNd2MaqNlcTBW-dDvnM9Y_mvEvymTpx3IrpcGNwiF-QU267RjBn6WPOT-PTSFTkFDobrPlz8jipRKtORwQz_TOiEAznBbi__t0mTO47QRR-3dD2nzJpHHHEQE9WaJcsnZo-TVcRHJN9vpDw6Ac6y4uAVWoUBbsfde9TFbBxXgF9NgZFXBBBIQyv8IkoK_2NNysdiD1mrRqtSU10IPaYkCN1NwP20w_izmAVn92PbJb7xE9VKaGL_GqmjGDp7FKJ6rIsxlEo9ph9ml6UUotb_ZOQc-Snw5QWDglMUNi2Ayx-8wsmFSDBcwjsTH2A_-7VNrKiN7rM1ItyLE5QtUw_5aiCFJw8f_H1y2--_e7V9z_8-NPrN29__uX07Nff3v3-_kN2MRqLyfQy__S5uJLl7C9V6fn1ze3d3_1wsLd_cPjk6OnOxyCtFVPt9T5M9AFo8qz12acpVyik8jQTnCNwjeT0mVgBeijgBokqcH7U7abHx-Hh0v08sr9YYRW8DhISHh6EB_0ng46iz56FRzD1hAwOjvr7RyZpYJL2-3umzCF-H-51VFq7-3F-mbjc0QgBjNtGNMZ4YedgVcYIsAyYFHyxN4iSQXh4GO4dDg5DycLDJ0-eHIZPZcoO96Okfzu6mAyejsT-0f5gMNgbHEgW9p8-PQjDw8HRIAxlysLBERQ8HB0OBk8Gov_k4qIf7g8OBxdHg_DJweHg6cHo4GgsWf827N__v3DvQqYrJlEDenBwCPv82LgtzOS4vCJ02WdS8oW4BWFRFS1WK7YYi0ooQwJHsmCNj3zFCZIhi9qw1DvjQ1Txal7ofFYA_blpyGGdmVq7N2dFlqkpEo4onotaLx0PNJMtrAjsVT-Clmve8GKrXmCfOvQtA1Di11zqI9NjODgCoRT6Gl4bm_fsBp65Mu_7YQhes0oigHNqfLiVDe-xRa-aX2TYMKgY1Za1JXJX8QEZsWxoCVPvwwrp04aVfVSR8OmAGjdUhsZzDkyjiog4fHoQhU_31wpYb6MNcdmwYdjX6TxkrdM_Rg8zxzwcPAHbv36ns7M3OOYiRu31_rHJHRwcxNckGfT3Udl9JxwcNSqarCPMcjUODw72bJ0DJp49e2ayd_YGTw59XfiwtZ82Crk29gdP958ePhk8tQ0dYpnBPv4JD5vNDsL9J_tHe4f7vm2fYjoI-w9Wdt1tuSCmasgApd_1wzmkpiVlWlLYksJC__w3hWCs_dujjW7cmO_nxKQigzCkDOwRaXQN7hJjHFI4OGL95v-nUTLoP2GDg4Mv_ZeCeyfJ5XIJd-HrTGfAhyGGi4y34vl8MhGKHFFKgeOMLIvDfYJuQysy6O9Rdk02LpJGWwC4C40zabn-ERmByjFZA9uox15DbfDfLY_1UBrfdeHgyfEa5JcUnGN612yuGeP9cGMsrtHHRMVhtE8putcD3xka768hD9Zflgz1ActjAAh5UnS7KS-9667yGJRefPqzZ4fL8OnAZx8cDJ4eHJedTnl8cLg3MGqE3W72jOt1ePbr2Tc7Ry0hQbQQtXI5Kq9mqHNSzZUqp5kGNYRcWYA13zbCueliuTx4sre_dzz_UgeVGJVy3GgcWstGWqhW_zbozmvPwuEhiAozYGyOxW0r6GbdoFXONTi6UyDgDujQzp6UeLMPu4SE_cFep6THx2Gfds3XnOILuhzs91m9XOGgc7i3DAdHxharmbEcDPaHjYV1BW3S4V6nxG_HD1RxHuVNMFuYY-f1eI75XhhXJDzsd0dwXUYGdiWD8AkbpdHIAaZkEB6xEd7JEVyc8Cl-DfbxT3jo8-CwZ2vH2johtDIvhJQArqM1HWlwZxJ7YKyBIAb6DpA9QndDsTc0Ar6p0D_lRZGbzaoI7XT6x8hSOa4hiYFC-3iF1QNQxdUKn4RPnh4dPg2P9k01c_OJ5qE4fLylQwRTA6ahwX38c8j08fHg2bNn_aVqAL0HuybXJAmfPmXh4D_pyvQRHuKfI9DdYOA5yuxjdM-0c46Ct-bS1ld9wzEVZrwosquZGGN-TADujLhoHA_7koVPD8GvTnRNMn8kwqdPWIaDytIoCZ8e4ddgH_-Ehz4PjsQIXNGv9f7qgVG9kjo8fGi423NeSb03eKjK9hyE0l_IOtw3KzKPmmfSeh01LjJrL1XoM1R1u3WuOubhARz0wVFXwaqp-iINBv4sRMlgsPfQOWHWhbE0LmV9d0C_laDrXQKYXzWfEUer5BNSLJdga9UGBR9EC4HV-ItRV0eRwX-COoJGAvxqfRV0HfrVDb5qjTJpVSQ8HgmSneEWt-IP9R-X5KEsYjywRA-XQActK48vwpm3Ok8e8_Q7sL9_fwf6azsQPrQDQ_dugmdpfazQVWyJ_mBp3Xtlwxo4iuY474a08XIPHhf1oPJuOKTqMR9YftLGWwyOoVFsXYDLJr0qkjzlguXdbt3f9f3-vHXKw936hfnv9I4fAj1MdP3S1iMZ-3VnggNSFm_gfWwNvwOLwH8RpJWyi4p0u4I2cUTWyBO0WZEOr0mydY8ewlEbh8N4l_H-sPpNx7jOPxeI8JogoIHXxZvYEvg9Wy69V0W_9P89Uqx1cQd6tkiOEUOVlarRDwUirUE1wu1CH6f_UXfm5ja6WG8MtGfE1Uzf2VYffC6IuIcsgkbaPcoPjVlkTfZRbfViCLV0H9h_1XavNalXEH9zE9ntokmKe5qBVPIhQYaI5h75rP09l1URBfQVziTc3_clDp5663cosb9vShzWzT8NXYkxlDjsmxJPBygQbfAATfIeJm9deFxqQCNb_dtR2LJaYra5_UZzxqFY-PSgmdY3aYfNbudkJ2ShbeHJvZyBzTm6l2On-fRpM2dUtzZAVan1nIHNCe_l7NuctSUpiUveW08-ssnNGbcy4jo-WE92vR6uJ7u2n6wnu7bXZpz7tp-uJ9u2w_56sm07DNeTbdvhYH3-tu1wbz3Ztb2_nuzaPlhPdm0fbrR9aNPXpjlu7FN4dC_H9fz0Xo7tfLA23-tGnUF4L8fVWZt11ayzdy_H1fHXbHBw4O_ozuDg0LpjctF1xuJiPiXBVTWdZaPPBhpFAZDG226QUQf8KugqwDIaBBaR6DMHUCtQDPwJlPen4i00eZHLTN210BKCGPiDan6WvRhQB3ZzOW1lhj4DQq0PQHFwcAB6l3lVO-yooSa4ifKAKgfFCG-Yh1xUcGo47B9DrAUKBrNdAFioS4KgjALLoYOWaDscOWcFaNxGmhP9GFmHXQvzvDsA31vW7A2wD9uNhnqP9cMVS-LeOr7GrxC9C3zOmOyKHkzxDUopWW0pLLtcMTzSMUamsRgy6YODluhoIwMZHJBhxdwNXMy4xENbQMUzYHUMgXPhiVDJZHejW72GTcFzjZw1IniGgTHqlVishv1jjGChk4LQdO1ZWcORvtRKkvpWGg_V_WbG2ycj1wZPNp10KVbwIDDEQJcrZNRYvaHGKwc8mxyZN0_D47zTyY8Hg31E7PQxl9sYFUbJco0TMtjB41oZOQnyHTjZCzs5PT4-XB7udUx_lpGAV9r2td_3fXXD_7C3vW29hQfYWzhYEt_flt6N29XB3lPX_xH9Uq9OLxfRDNMrOI1ETkz-BU4MAgoTfgFmNvgPZ7a_bWZPzMSO1if2pYlCHDJLZtCiy7dJNPLaxX0bCodhuI9mXV8YKCIWqDGyff7idiTEuGpBrfAQdJnBWmeY7xjeE3toKM-ehf0lsOMOaXdbAeRR5UvDpVutx7nQGOLBXZTRtvsGFwbisvB5g-k_OMD3cY3XA9u138Sl3YPC0Qji-HiwD9wV2kX3wyCf8p8DkFGZL5HspcwCPUFCsffYRME42tKy9i0P1lveX2u57mcvBUKDMlUz2Q8fE9j4vRQL7K8P82B9mIfNYT7ZHGZX74bC4AOIgjw82v98HXb4EVMcUJsHOtuKx-Irah_RSalaGaTYdxm9JgL9s0BiRjEoHImV8ZQo-aKWainWFHiB21M8yJCMP_RqKGXPSsi4XFGCRmR1Gu10XvQ-fhTVT-V4DqKvzShq4Er9zY10emcmsMAL8HuOHJCAxi-c3mT0gjKZ8eCREpOAyYY9ingJHLMPkY5B89P5-YIAlYpJ43-dOfnvb8b4SKMjYyW0zid3EThbXG24yjPVjJMhkKCV4KYIQmRU4BroA2rutDkvQFG6jd4trV8j9BG05qN9joJBzACdp4KyecN0yfilriOHgPM8UWt8Gs1K8M-8XOJE1yJvoE8lY8Df0yUoUnY64FTXaAVjAvGOsZHF0XBA7-xKc6cYkFttJl9BJDJLgX6EvzyzM_FzkxlYNi3gb5SthsZhmajjQ4FDXVJrnOdeW8ExJFDroAvABfgxgMUAUG2jMs42LqejZ43HquVyaySL2mW9D3XS9DWFCh_G029ptH2QE4RrsTlBDbr6PsaTt9gyCqcbphCxzGsjhgo1uI3uB40aaq61fzkI4yHjARh-b8lF94iuAF2BFXGt5NrwRrPmbhPDwciqGY2UmUiVN-ZoyizFYESb0aESzELnmcSWcuEGbBYXFP6yLb4iN1116TYqFkvAspzTLBO2IxIe47LeMLcpAEPKelRPD9egYEuJkcivgVOJfledWqrVAi5cE-SBNq4M0bHeDHo_BOsAaYIpgGVu7aZPsAWqnoAozsK-7-Fbc-sDb9VwcMTm4NvVevMwTqldfIFoDvfy0vnmb_Jj3nn5HehCDg4OOhtqJ-AWLd5-kLYeIDlHV0eoPBmZjz6qA1lz1NoDk104c-JofZ4TLOVaYbnTty_wbxqRBGebbog4vf-rEgSQks3hnwqUaq55n415n414n014n80gccT7w9ExechPz3DS5bNktKERM4LoVcj8vARuJax-xeG2z1I2Blq2Q675BJyG7oSryKoJoskIcdldvlMlI05G3ZD-07n9S7ukws6a_t0SEbsJXqIL_vBwhzQDGXX36T_Dw_sS2f2u6hbUCnn3hjkil3xKJLjipzbyGUgMbfr4j_DwsVSIDRYUOdWNPKPAY-sNC6B6bC60V0fHNVqE62M2jO-94ZT4VsAffj2Hnf0dQsZ_1Pn_DA-Xy_CQooMYd2nXp9c3Q5HbhNGKDmU9_GbDmwPF23a4T9devDWmHXRSchOa-XA_UgxmlGTo2EskZWpnVyur8Of59JXUvayCEb0mJSPZHyZtbY708dyPB6-oio2-CLGFXTDIV6_Xg0F2s39ulNgIF7nzUE0aZTXWv3dIVyniYizxTq9iISP9lJKM1JeWUtZ0g1WR8iFeLxjS6k5HvAAYk0fbVMbQ2MbBmnsbt_eYFLv7S8BGi-5eZ4_-cw9OYuEPG6io7QF463YpoLJLsFxqptFnz_aZPi4wtBlWAdpS0ePj_W1lB1CWNgrvYdnD5XrB-tgYI22jELgOkejK8NadvK3biGzaAwAO6qqGOQzxHsH1muo5JNCF1DNVzuKz6IwnJn60hf6AI7L1lAYOCTrwKU1k6gPoWQ3dT5zIa0KZvN6o2nhIoPL9AmttM_UzmKroV87i93Sk8pnuVWrEgn-gy6G_uClDPiUhxPkFTw_DgDI54Z_A1EvOuPoLs5y_JvWWq6-JnBj_vk4D_W0P_AxSJi8blm5t0pazuqaAisYv8JrfPqxZQ3Ehx9W7XF8SOaNofgUrUnonpGD1Aa4j2S75g8T8PKZ0Sf4478HvXUp3mZw4y5w4oOiKSl7xEr7QAwNM7s59X0kN3xec2IR5BQWcX07KEnnD5OeU43Yk8pTJs5Qn-pTp05TJV0ASJC-YPEkheBRl8s2Gs1S8OCa-Dd2MO25D_sW-QLThbQyAbdNXoepZRAQM_YITaUybW-UIt3ccMF-_6OVjKFSgp126Yon8xORHO8pEvmDyJzdkDHcsv0Ev8d9wwD3kR_gFT_gvPgiHNPY8f2Gxv3gbIpYE13mVXxQY9NsZ8_UwLQc3Pqc609jcT0T-xdqCybd1c99wIj8R-avxVA8thky-xYgtIWXyF__rb070O2KtBpMATGAu87EIWDBRQvwtgtRguY-gOGWbZavL8ibAsAnzq2bZvinrbRCDetzGU0VgMEL5KzED7HRsNcpwfZqLgwP92g05YfJ7t7jPufpMFj62Dfb-d6cjvyfyb5zy12bYk4a-876JilOHzcG7_AlNF9pQm9jqfayOy_m8Z2OrwKGVP66v2aQcgbOiwFhWBSn71Fyn4KKYKzNb-bwOorK2PMY4Mwk-i7txeSMDFlgrpvUvsMXZ6OcTMaim_BpH9gO8J986MxBp7DGcjce3sfw20qeE0m7wMejK32EFfzdF1B3MdKf2ey6_rZ3qDyjbO6TLZZ_StacSmyHdrvxhPZ3Jn8GMQfb5Ih9H8lt2KTKlL0SmIwiitGIy5AvkQp5lF1W0SOS3aST7q4aDEtDtTeSAyX1_qQ6ZPHD7vsf1KZNHeGd-TsCil6ZMPvXQAcznvJMR0Rtlo0vBE-ic7Ym9lGmUt8KKPeENnyei00kE8y2Cy1tRk268WUwbt9EpHTZsz8wTboxPwVCYqZzIn0GbH2DNAKwTjF2JsR5-NgLja68yBpzwnMiw55cB7QD2iGELBTPjU2iW3RVlNgY3rQrdHssDMCv4Ge_KiiWs0CknL7xjc_kJQmY4oxFwP6pIZXT1T3WpsinqR73S4ooEH8GSIAJfD2jTvVHMWINtKQlnbsO5Q23aAG9ELCNzwtbPTyNMVwhsvzVt7_WyvVk2PsUbOGBBP8AzBu6sfwO_ovJn5h1re2dQI7R2h-jV96wtwLQK3Gf7TQT0ZWOy1bY1YYIk8lts8l6Xbddl7NzW0dTwCfDAWj7HAsxF0Ib-P-kI6XdwdN4o_-AugL1NDXYqUzxg7vwiD224VgV9q3wWd8tl29tL12ZvRPSkuEH2HKAUwArtdOBfUJX6drmE0A3maOb-UGYr0KoJ0MUxvFt5rG3sp-WyPsngxsVXkeEKGBGYCDU6HVclNveBZe4iZfXVoEw3gKm7HNgjKfH2vSMZhONlm3eqbg2vTolXB6L0BTq7sCOwF9HDKAZudBjEGZf7BMuxDCutnPma-mxo9n2C7mnuAiZD3PqdwQEQnM13ykUk4gCQdkKxPxTvnQlR6I2lm93XnBzgVovaKbj3eMpcCBthmKUubz4U6BxUJXnK8kbExp0QojrOaYzBa9jcc40Uf2ZldzaOJFyOZsocNQ4fqlu4YJ4s74bM1I9s4twlzilri33kxGSdjromMOKGbywgH-DaxBrhx4qu70aCEU1kv-cfFlzKBqzELfInDD2T1jgAGDg13v6h_ESs___FAy2IWPZru2MRE10jBI1ezbFf4Xq52GaAu7gP4zrCREHDwwGvGWVJIVlR2LetyDkhC21tsRQPa2sswyNXwsRMkDzsrxpcscK85DqWZ5H8TNeBzAaEV38BeM953wYx-hJAUn8FDFo9jeQNNVDpjtCuanAOjBszDbwn7nyhh5F0LiWGc2CN4CCvUawMnA4IEAheaI8xriJEMQFUxmLmWMwj5ugCF3wDfevZ4P1jhQavMFZAja6zAu8fNKJ2B5Sy34l2LNoFxtXz5fJ_C1BheezNHrvYaMl1yreBV8WfLepqSMAiRFUeeNqghSb24IoOARM5IbXPeEXZOGXG9dtbF74NfB97FKYRyhS8tRG6MhHNrIeLTuddPfJ1R1vZ6K95rkxgLhQGFZmJ02hEMBciGzmuqTtkcKXduZKgEytfDb0UBoNKcodPlNxEU7r3chTAxHf-VJCsL-HZAxjgolmXNiAkrEDB0Bk3yThIiT4AVQdof2aMmmUsT8G1b59GGxzVgloGg_bxynPjfc9EIlS1AAl5Vjmop4i_ScjUplFvLYPJbUxJDNJZoLOSn-hC_FQbfTTEtev9ZN6BHKzKPpjTkMw2NxFgaiXY4kroy3IcOVFT8PbN6VkQBd--PAsYIqoQUGcHfwVspMRYSPDxUkVBLkfFHGizKxD1BaNSVQHg1mOhqmgRoJGl1Dug0gs27uJW786KLJdDNLiohOZ5Ve4cHR083QmDFQOiI8pXYFxjnHsZhpt4RN7VvHklqlkpKwEevsxEsh60DPzSyDP0bzIlyZ-_GDtSUP-BSGutSZYXAjyJtTKtQS0SnMd1w9XuHgRhs-HaTkBv7jEJu_hQrAvCDLG-yZl3w8gaNkLAxlsfXY2P2-MJbQJsrEUbHsCAVD36AMHPC5JRJh6B0XskHsF1pcOSQGy3tsyu82mmS9WrhBw_x5sDiLe4aT0vygsvO0xytD13z8i_2QUY6DsSmOZa0LJdNrixwEBKAuNiiQF1GICRtXEKBOwW41YuSFkxR167-osFI-f7M7gqx_kE3XkGG96wWeAcsQbWapsh1lKiC08XI5AVlW8V7Pfqalh8Ana-UOoaSxVzHwoxmJQKXMlapCxlxdjJGVmx4bcMECPvBdPFvn1HijHzkcHQv4S-QXrKuGzEUaWwN8LTTmb7r1Fearkye2IPUC9njd_piO-MYwuloQNhKGcTwoDauOHo0lZ-8ua__ulmotPZE3vgKcmg9IcImV1oZDPS-7GVEd3nhtCw5zDn6hr6LwCrbhuJq2fjPeC7mzzsQdqbnz_ssHxb_Xtuub-_3wzuJ7tX1XiQWy7Fe5KzHAzbkddipMqdjgm17hzraw6-OMD2vkAvEYgCIVbIvKW8j8iuclIywYxkwffYhyfymmN8KhfbUMvGsQEcEXxUXBKkNpdLknEToh6c2dvIXD5kH0AGBG6ZFj-IOzCqMqgJyr4wMoSLqIT7yibGqeaGjN5D9iIj5ii12wTrj-oTYfzgufNgz0HOCawGhnadF8DWPYKnDLF39Brb6cwxHx8B8HPhNxtRp1pLYSeknU137g3dgaY_ctDeMnru9ur6c1NXwPADiI-pS3LNErh4OTOvQ1Q5_8MrtODwulb6qlaBSCBWOysqiDk4BM0DnA71jng0x7uMElLfrPVWjLxULL-i5ogBHXZJJmwMcmtmhqQxmqFRu6sHKerWjAtjZn1Rvi5RYRYMBUDrJuiqg54PGwbW79AcBDrzcGTRYELBgcP9BHx9jA6yrfvsV-P7Pt03CqwafPiMN0lX_-wAsDJBbryMF6YEEwLqtY52mQg2SlQKkZiAm-kHWwgyoex6PV7firnoJvcutPERCoyd_5M3qTSi5XvXycrj5VrAeWkvRcblEZGUzYmsTz6eLevkFKMgjcDzZ_Aj-iDET9A9thrG3ot0LwBEgts4dg6Mbfgbb7ot927Jm_7LnYtB7-vPOOZDZ3-INpKs08lM40CcuDObbYBWzFtPgkKuT8h1vyHdsa-k9WV-DcoaC3-8vfdu5gNXWelTlK0islY6i_2dbVyze_XkCu5WycBhJfVIGHcL3ul4k5wtL4RBQVCrxH3wTR-sLoO5dhE_MHXwJ8g7fFPMApFrDFy6gpMxcpjcb8RfKNIAvs07C0d75AkndOv8v3N1t15X0OsGkGLgNhyz-uaWzUsJDuzf1zfYwv9EsSLlcJGHHh56X5RcUfceAAcM1e4U6MFcJ8AaAD_W__5ir9jYKMsgEPeSQgCRZlHn1NIYiWLKS2MVYCQlw4uIbi4Bc0rr2I-FJKSxxsLzHBTiN8pyX7z3y9-M9sxU4GCN43CGSVUzyTg5b66bAJdQEA2NmvkWszqIX3HJk96TA9bb20tZMeVJb-A-LurQygXLGBgRWJav9z2oz3rVSAnhNcx1TBbGV5l2vskKVirw3mYARL7immVcHxds5ylQqkCKOhJx7cfam5vJaYGSfn3WazQHKUBGYEs5ME81HIakQLvjhTmAQLlF-nj_qB8HV-VFXogg0sc87A_24wBDfIL767GoPutyFjAzoWgxninozbTxNr8VxS_QJ7s3vSKT42qUzUSUrVYUhSwFuiUV5L3jYUGIu4_ZVEgdsMusOivno8uof1xTP1fZLSa-BaFUhSHxTqYIR3wRn8bAF7K9bidujU56I3SS92oMA5rOQYwIz2xd3ye7WIXeZ-oOesB6T0CwJHx1ZBIyJaawb8jdn6n8KlN3EZK0ILafCAX65xHQnyB8y6_E3xCveJFnMoteSV30QJMXzOItckAd02b8Bh0hVYT2oNqHUgpmXNFFxGkAU2dTD40aCxAQdAFddIFUJCs-W--hJ8Bj1r8i8xNdWAWXoD9LDYkS_CPAh7WteshfNLL64FN2nVWoXgAO14pT0xa2Ak9zCM1czLXGUEdG4Q_8qpLnEEzsJGDB81_Pzt68DuhyGbx6_fbXM3RN2uk8J_oFuu4y8SZcGyyo5hdXuYbyECkeHPsVZw3f9mualgvnfdL7oWRA9kbqJx-GShv3mIHOdQGiioZXU-Mhs9ZjcEUzUDb-ckFh_AieiVt9vyAL-33KYG2jRgX4XvOpakVMQFuOdKRidPhYexItXjrV35cOY3k5tMG34Q6LlFsvqKDEoOEmr-mQJGFqTDtzovcZeuQHvtoZnIFTaMIqPchrr9PYFg09E9BwAUUIkO-fECyMJJS6hvaCNT9dAXUehtYCXbIJm7FLNgU_vKYWcBKADFkLZmSW_izR-z1wwJU2VukjeDFOTFSzK5LXgcMAx0NsDyk4eGVqwl6oYQlCz5JJ_qyhn1ts-EMsuATMtdMpzKOH4YsVW6C_PqGil2wuq_kFnP4LgSJ-cNi2Qg_X1mm7fGNISkRgVka1ccyLEZFXQDdms1lxhw7QXt5qCBhWomrlwqEjDhwhQuI-uPyOUOpRFrj5lc6uZljIf5mHll3CbK1LAa9Ra3B4GwvYXpi29GQXOlaH06IAftSL7V9-4xwZzjsq6YA4xL33ICr3aHdkw7HaMLpt0E7nHAKwtSFe-juCERwgesN66GyIkfMntDvia4wLDExZrPnW9HriLHs48JcNguUDIQEaY6IdxUoSZTlixuN-N_joxdl6dHnmPV379V_R6B0JThE3agnYPBy8aRCZYyV3cgeUQhVuULl_4u8RM_k2YsagkMI4yIOsZnSSLVROrT6PxABlGAVm4eYdLUzIJ7j-K8xUR0TNrNyHLfzZiRrnaAcVI-hakJbiv4-3eo6-BInX3LP6F5MCgrQgnwbTIjCxbPSVO44_8BcEb8bFhgn0HrhCzVmbnTGzbtDTzu3_YkVZu6gtmlGJOaegkSB9YTU1YES6EISgfbPJ4yuNEmaOAVF9zUsDOEQjwI4Ryc4JcGPNAqCqzwGyBV80rAvb6MPRtrVcquUyPOj3j9HdOC5G3uDoXGcqUUymvKHjC7c671kFfUFZUf-mTMHV9Y2LOrLzHNQXGlOF56Ex0BVleJQwqHCl38JFifyg5yQzYtbm1AAFqrRQuFNYwVwgFxUY1Mat5KYdssqgzSUIfBqu49AQBA8sBXsQ_CT2bLQbHuE9OJK9vHpRSokeGCitiOUOGcPMwjnkTTS7TmuHn-qKKJJD7N0cDTPM-6I7nfb35JrVj0xjRNcgLM1Qk5-VTq0zsZKcMl0ho3GOzKUViLsA_AP7DpU4Z7zPpvwSnH2-rNUI0U7H-fgIj-sDRdpAPC6XqEcI3sWR0EEH_ejD34MPVwDNOFz-C3BY2jCi0DSSn9HI1egt4jth79qAoJNbQMONIcJn4wuDWcSjXQfSwDpFiA4KjTddrnKCvkDxiyEG5n33VjWbrhg0DJX0fs_5B-XC_WS29YNGQXh5bHquGumCvKRMCCcJmy6XxRGa_xSHKKlUEam88ZQAsTf1F0A6M2olzKxNnZ2w34-wlXjnoB_lwiZGGgBN_LRv9YTbk-WyPXGX5jKedcPIMcRYHx35UmPhPUOjBj2cHbv84cx5Xcv5JJmlQ1D1uN4C3MEMJzfAvYG5CFtpQuYkGJVXVxmEQxP4_AuG46QjDPgHVl3OMrjYg_SxF0xcGMqY1iVwrnSM59yVqNZK4LpQ5NKIXmE9cTeyYQUpUdwMVvSEA9LQznwGu2XRpEZWPrZxxoDLmrGkGchS5RhlHEO-9PvgDqaumAKcQdTGMhwbM8FDAqejhgBgfKLAwkWgDBbwIYgQBMzofFNrDPXCZ6oEltULs8C0hjI1ZhTLSAhqXDPly6V8QwLrz2in3hcW_FhmYwhR5J-sKGBZzRsapKDHCzE3BS7OS5BzaaFkVuwIE1wOI7ZZACI7Hbu79YMC7-xqtXJGWMZxprOdJPqMWWyaWWakLWd0a4n9AtbgVJKXDKjawOK9oKH5HaHM4iWjxmM9Zh8_5tWZxY-FAvISAjzl07nCQGftkN2oXNvfKxRW1a-d-K1WGdfo9VqAohS9F54tEexPF96kRR4t9LSOe8JaGKcLPo77cWCwtp0qH4vWlbgq1R0GkAogcKoPFlYHkKV_MiFSypJkkciLNNoYj_q_NJ4VC06KOrhNFTChUuRBygGp1SaM3-eFVfTiJuqH4E3v8BifxTcEnEJdon0hOs62vEsDE2zsl6BygTmBzRz8Vy4nZcCsrAZed_ZAQSvfaJa1PL6fVxQ19C0D_HoTXQTYv57C0Pz3V8e-AXfwNwjq15KB1mBTQCAr_1y-JBVlklD2khjxBYSYANmtv3wRBgtEiRIyad10MFyWmUuB9zWwQZIMJmkUpV4O35E_wfXSFKOd1vGHQKoDjkvsrWkFjxb2yq0CIHhAywsLQfQujeIC4zbpMpPgt9d4cSonlrBoWfBRAWXEihNem3hu5V_dcr8rNlASTgT5TUqoYMWK155ielkzlRHWA1u2uLWzTYoTuO2AxKhOp1m0cUiKW3PEsZfiFkOaGqYxQRs_uu5fHVzEm82PC-L5-tKLpbSTWtCmaiw1J1oREIytWPEGNO8pKz7Zvx95yJLiJ1Y8ciprvzaUpNUF8JnfAFvK_PyE6o_wU_4IMk78iUpnHxtBNDHwwgIDPgAbDbRPwTuaNYHAJOswzeiGYopspCCXtYoKTMJxf8OLX0FzvHjLil_cUH3IEHCzLN6T4h1GuiDKSHCRHnyLqG_xtSeBT4VmxbvaCGMqXECi6vndmWF5kSDHwEFBw91y8dx6lDP_OjnWXOa6At6bQEVXKxhhQQbRZgOjjhYYG3LjCA0rWNxr6Crx_rHNibFm5GrW1tGoJlb8yLeG2hy5gHJ0m_LByCgTUVb8gGE1BshkeKZMjKN2u_gRVDr1b4BC4EU3X8Dges3db2DvPwci53XdG3vt2mavqYsZAMv9rVcC8CHBkSXnQoCbShF5w-vRdTriHXljAM1mDYQdxXcuCMhGnEzW5F31PcfAuerHeJksh-Nq5zJEvwI_EmMZh1j7BSkaq-jreaYIbN4cPEV2OgTopnmT9wOxgbLR5wbjx3gnhSjgaJa1zujcLDxT5VWpBQpKpLMe1xB3_AnJt8Zv3WwDFAGAYY4qSMj1dM73WMWLHwwZaxcaKfPMCqZ96ua6IwFeIRfDBfrqdPKGdcOUlLaNnN2Lujbn4pDMWSO6qhkvsF_80sRhNICzYrt1hyJbGwBrtyXy3GGPgc9Z9DIlsuUSAzsE8DtABbF6POIC2JoobWyyFErsCrCywPXgu4QOxHvAyAGnMpEMLzc8SIBiu5emQr_IPYQfXD0iBQt20UxwuuaSAavBUPLlsogX_oRVUc6gauSrrtxRZ8XvDUHZe57gmEcm6kLADBEg6MKyRAzcA95OSYqvGfCyi18Q6IVij9Z69Uxsf4aab7b5aR8hwI3WHyHOT9xzY5ymXhuVWDPhk07nxCDNOYC0-H5oUFM-Is1iLohlfVZOmlxHZWOug2zRYM89zz8hJ-h3xDYE6DtlBT50hn0LiqH8vp2gPPJTR71wP_NX4B0JtPg2taNiFYFp_Zdb0NnFQw0AU9ZUHnc68umXKlsEYrw-7gcnsIaofGEEMIWt9bfgqau1sGdqA6mAGKQXFS5JA4vdOgw3ly5SLeCqg00QGHibTxNss2CzoX4LprUjNuKgzg37aaQ7IDxbLsnCKjoohtFuRVQwMIUFVqf6mqxV6QYBYpkn3ApBzaGuObUo33ZYX4R0mc4u0LQN5EsKuNiXkW8TvpDqu8yqRjJ8eRg7Lq-yXAIWvD44aNjYqsMqwBfYFNmU626IIlXQc4n0c0LZeK6sPss3xEV_Am0leHtAoHHSm-Sq0hDkE4R4Nhn-XGMuiIRzOX2bTQUW2HrU6pNu96fbvUbFDPVufSFRyp8EZuVBBVWM8_kVKKBmV7Msn4JkEQwZIcXAUbAZbcoehmtG30SCn_cT2pvrKwyOCj-AU52ItGYZiAuSJcFcX30MuqIRAlyi6Qhrk5OelS1DfJq7meC3tNOZCYWUoBwJRCMa34jgGX8qz--gAgnqBgLz0p_0lBjn8ChA8GX3-0U5l5rd6w-i65lIw7vnHyFs1g4YGLBbZ6npmkdbX9IAa-vtwBW613ZdFzCTmVuWAu5scVuvRmFvZacjL2vLU0epUDwNsNG2gZmrNwOWJsy2APUh5Cy_Gt8vBCZ1X6JvPFLGyIzf695AD1SzviQzMxigHIEX84stwxd42Wbu6njG3AKvjr_nmuH1kHjPZ2Cm5eTUplyXyDiIgq6EwKy-EppHrChbe2gkk26L1t4SckLrhAeZ7ifGxnnRvKNGF-AROWlYO8kXKBQWMSk-YQy9brf4SCP4MFEaa7OTWTmzBoLY9C0PwKBsZ1Kqm0yNAzYhlNpLCOxXJCfQuXeQ1hgXv8zBfOUuEV0eoBl5kA59Wlozx63ch9g8wO5vG-cNegMR14SApGKNaxeBJVjfhKUTxGiEAESMLYAtymkuA-aSo7rEKqqLlHMdrEywWCcoBSymfbJc6mtEWO9HuVuTJ2KgOyhlTnZNuRuuncWSHH7VQJTMOtUxbJAURAuiSiD19eaiEuoaQtdYJfCGh6eNiK7KYvA4JpoUs6bLAeRpaozGSW0EbaA2JSf3LNvFe6P8BV6lmhbtB32msokRAFlBDwbJOgZyQB2LWIEwoYAgwMY44BdQIPTCK5KzzIHfbVoDV-yOXbAb9pmdDgF_RaH-PRW_mr7bROzJWjjUJgWienXYsKoRibzpoOFelZpKgnn1conAYWxoJqRlxD4pDSicAN0HMp8-u2qGbHNGQbUaF3FmSfN4Hs2NA64UdLYKuBBJfYX7jVBnFeAz6JUAWRvtEP5nYuCokNB0mCf7KVcsTw5SrlmeHKZcrtgdTyDblGEXwKUAK8EbXjf1me-E7LTWansDHgcfDDOq-f1wmxnfEmnzlCcgzNXlDI1fieopE4HTfFyUWpdXLgtilTII8XfGT5NBunMK78ApP01C-L2Xspf8bFfZ0KTLZZ-d8NNdZaKXwuctn8TFNCouQdx2m_TTx9nx2XIJv45fwv5gmj4-tWknKN6ZtTl_2enckBl_iTjZBDTvJnwGafQZBJHcEmtuZ3AAynWk271kF6ASXS2XglRIpb-zJJo9jeQLBPH6cdQhyVnQSAN28H9IWjdqrWyAXAPV6owApLqR_oUgm6uJ0wHeaXTI8MVYO3GXqFP2HRDQoBNi3s0GyQ32IDVXlrzhwLK7Bhl2ZUK6_rtHS9lHa_29R4MRy_T0d-HNxsgMP6GK5p3OQpezaJ70Uzg0V_l4XIhonoT4aY5ZNE8G8LliFSgxTo3K2IgBUz1606u5fJ3OCKxHmkm7ox4Ug59simoTlLmT2Ob8M1185u57qHmONmHWPA4O2eICrlGGZrRodzBarbtMMzHafhHTl7czEiTn57PFjyv49_UqXfv66n_9z_8nfbwkSa8dp10asGA6D5xlbZ-VvA_sJVaB8aDmRU_cihEIBykwWmNSdTrd7hyzaUQqYKnnXdRRcRLNw-PGF5QuWbeb0aGpaQwzHxgoxvVsJtTju-ZJn6H-7JMDFqZeJPY4X_YpGwMLwriDa4fDcVnzLkljDsA1Am7xDEYyMfI-t36je14geuhHmF2C3sGU94fT42snlJ12u_Q6maY7O8slGSfTlC-semUdnHbEbko1rp6LSalENGFu-yE88mR3sHf0-FDs0xW036dDMuPtS3hQJhwstfioG65WN5d5AYJ4r7QI500wMwivScJ8bCpgt2CnUcZAwALqo1U0Z0WOwZyz3Xk37Pcfl7vgUKAxnMwPhzWPGeojeC4dYJ5zMBI2h_QZD3uDg8eZQTw-1k_1mRLi_6vsWrvbtpHo9_0VFTfVAS2IlmznRRnRSR27zWmdprHTtKuoXlqCY8YI5SUpxY6s_77nzgAgRSu7aT7EIkiCL2Awjzt33iXmSgMq8Wo21UepKXUenfz067uz08M_TkN5oHry2BbQ4bc-p4z_0TgcHO9PK1nwQJ1Fmb4p0Q1YufliD-RbeSS_yBfytVsO37r19616UJ86Xr69dYiJ4duYL3zQUa8HB8-cz0IcqenouNJzjmzt5nAQmtHx9ztDsD0cZnBaF7okXo9gLB5InGQP7R50XofyuNP5fqfdFiRPjpzo-LJiVMnG1fCF4hXueH93-En05FH3hfzSfSGn4F1xHyqMxSfRlySh9sZ0zBTxYL9ffhI7tVN3a7sQMV7dKF4h93vDLv-KsQLSpbkNd9yTh8ouiVteIF202-KDusW0JojEc_m8cxpu3eL-qOFG3nROwu3DUM4pRjGvXMvKrt_1S4ATWYInGUpetY4_S4ZJ7Bf12kGpukBtL9Mt5YwAK4NZ5GQ6MWJhRUqJJ3R3TMy1o90x-XI7HRxeX9zkLIL4VuBetnVMpQm3iae5y5eb0ZtTmaiusg3eZntqSMGaFGqxEsu0qJTs7IPNNAB2Vp7A-gAaUv8pFl4NBpvRSubRjNVxOHG5bhM0aCfmb2NdcYLmCfnz76up99MqnI_ZarYxATNqDn_nCrbtNmBCxW2piapdr0JB4Zk0-y4b3uvx9_8Rl5HZxov9_tVgDZ1g74IcxQ19ugbYwu7KwVfrCjvsI2y4EGGMMn4wOUnysnaJCNsb-8QOSRpS_XCrMm04nvas4mB-DVQOv7ks4i1Ao-Dcl1TL1cWZnCm9rJuJMMuqN1iQv3tBIHT0T3w5DaMVYCSwkgxFRsClPIzNY9rW70QjuTeraFmFJWBxxpv3bhAfyImtUf7cGPHvEZC4439XHL3GYrzyUiB-64maUyr8w-vFRySDQl7nMzpoYHltQS5od8rgLggHvMF-U1-UAeGt-b5LTxrMHQRqoWajOaGZAtBWLLi1UEEXTqjFsNuPKzYw_myF0h8AwhsWCIjsMrF6sd8LU19zuPCIs56NeLl9WIrT4lXySkBH3f5rFLwfLcfbXMV-UT35BCUeGjdc5rfLharh6SYduntbnm01Id--Dper3r4q2u18VIBWeaHwg1JHU7mA2M4hoGohKLFMptNY59QmvbwgjZpe84UytGjaeO9Jem7S7MMgePfDG7wm4zIefIprogzuUWe0zoLgxhKMHFymZsoFwC7gNUFRe-IajYpJkkW-yLu0DdXIDUH2i8Gotfda1PyRTa9FHbhdEldHibSxEUAxkyvner0pP-lsHsggmd_wDgzhNcJ1OAMsTrF8JTLrwSDJaU4oA8K6AcDeoogmvbi7C149_92nuFi444JLsNvYCkaXo3apHnPQyiJOP3HvctFuL7z60sJYoil9b1YFiXS5L7BxzAn7nXb3RcOmd2mEYHaI57xekZPyVORkbFaSuXwFS8i6DCqfKleSr1yqlYBWzzJgJjKixESkHJF7hnTP_Zuasf_EpRVQSLmK1nAaD32Mv2Nr8gkrStxbtNv6Ma-Py3X3y9fP5DyDlU92SJl1Zf2u2Lb7G3flg8sb7-qbzlw5oxYcMTNlteOFnEKutJJ22yD285P9ylB3ZvDATBEzKnfWmp0Tt7oBDvpW3KluKVlf7Ogmrp1ay9-rVYQSo6aW_afzOA2HS2vQJ5ivayb9islxcdKmaAdwB45LGAErrZ4FL49_9LOIEzpy0G0tNQui2Jwy2esK-NqYQjewMNwkrT08ga4m97wKURRdrEiCExbTXIH0ZMkM3omcqEtijoVLFkUVfJTHtkl2pl84__mtyys-J7f7JYWDyPeeXgjuSjW6abcvfaSsvs-1YX-hk3xyWd_LLRYME_wT7-iSImtepCA1m5vWbjwB5UGPMqudmKmlPSbZ5HKWn9XFKjfF3BVe17VfFa7kqfys_hTLRkyQuqr3QRGLyZBfR3wuXUwjnvgAYOM9wh9iLrAkbbr-YE14g4iPwkpD90z7qm_BJq7l7i6LJmVufgYpVcZcuPZ3YvhX-VFcOmKZANLAug7JYS_MK_G58pvLzxHuD45VLT6D6ez1eghQ8rPC-v4c6Zu0VJ99JEeu94VU8ytlh4o4V9mluArD4dpB5I3iK4lThYBvgyTSxjdEEAUyCEJUwypsCR_5JJTnd3flXjRJrst5rg_43R3rDIsJX1hlt51ABZ3TDtdSefvm5YET6uIq3Eip6Lgc7SBk6i2KtyjL_wW0iycAq2A_eV2HyWv0ipV_O2cSpZdTwPBOMUY_g-M6tIGgco0m9krfzq-DTey6a5yxVYwVoA773FfkN-MSUvXlfVN-V6tl5dNiuIgX5CsD4kVV5VDI_d5ukyoJIUY2T0ggtwawTTq9HkudBmP0cMmItlivYlsXwzFoNslNkKK4tgSX1uwoYwb3YCsgVHtrEaWl_kQIf_xYw-f-K7b1Shi4o0eedr8_jvUfgljwqV5EkyhMfP1GrO0FCIpYgOltoswPYhEOxOTuDsFNyJuJC4HhTs_4VUwDmt7siXTxL69anFm9zUog5j6Zttt5InI5k6Xn_yu_INmyKrc2zNkcj4VRXtA1uj1LOQzPN8AKQVyqkRnzBiPO56tviXca6zq2veTAA80wbls90DvKckWI0kHpw88AZNJgci_vhd3RbpfiXiNB9Un7tRTITc0XiTCq_A9iqANzzPFht9xbnuP6McSDcspMi0JLxBBIuuv1mKu7mKggKBl6gCa_vInFBXWH0u8326I8tP4rCsN07wVmQKMsb-OL6LZ2LIdnuvcjNjh6Ncii22eqjG5JLxuNZSuPLmYGuCC7o7PTozp61IyUHTJ4AmwBX9bKmay7y474YNxuRw_3laEem_uq0-vN9V50NqUunj5t9kF7Gh2gDUH_TDmbyw9F_xXpL5Ef-Mx6U0sipJkDo9-HbDHJ-ePHZMSt2_G-UqNPavsNfFLCyhtlc29ZcGixcT5aiWRPWYUxXN8_cAEdzYxkcsN5K-s1eEoX9H3P8qnOaY7lEf1eVQZdaB8K4JN7IWgbEoYpl91Lv1fAOZVnkFQ_Czq_ywxsBMkFwBlSaqgLpJ8Fk0s9uTqf3VDCAmkNmNMF2VGe44ALNDVbqwCBxZBEH2dpJgIZbOx3iMowenKlp8OgzOcgI7xITKEDx8VTlbThBMt2Oz_GBOwRbbyX_ivAb2u8HoVMVU7pG5SQVmWhl2cipXfARAp3d-ziOaO6ZAXp9iiWU5UNqL9V-4nQbSAJjOC7o1eaEag7JDUpBVIHm3d3aZROPZirhknvyQrE3pMXqTZTpjMvwPVSx5Bk3yJTMytT4b9sqvAEphGaov216lIgWlMuudFz97jU21arHNCgdoIvD8G3ZsIh1QfZ76FMDS3nmsrBMPvDPQpt0LOinlRcWoAMTRCZq5pIpdwJQam6Eh130zitw16AuKlWK0gHRzvB38rAuEtDmcP_vCsLFugiraebwpNdvhBpyF72oaCDd2QRcpGhmQjlzr5CK-X4usKUU0UleEe7Y5BfN7qsdRiGcgOKNCMD0NQ-dX6LFaWbj_YogwM30SdEkXz8sEf-SjXKJIZhT_Kxsk9HlqIAdiqHLvJOpBu8G8TXIU8Ofzk8OJWI-Tx_c_g8CNcUNUA20oGO2G4KLtPpVGfM700zUiDZh-w2b9kvgHso4M_nQRqOpgjYxOloOibifk0jfMpzAlwt59rEec-pZB7cukDxGuwsKhBoqoi0t6LFqRF1oGe6le2_3hdbItoahu-Lrfdbw_fF1gOA4x70g_DrU4qmq38GK8mGiziwlU0DOTJ_jGPy4DL0LKOEcRBDVE87SpnlQqWyIEJ-Ln8HGvDmy0POtjWDk3a75fwhF4FFFjGg2f0C1i_o9_gfklp73T3898Rtun-B3B71-k_G2x_IESn0luqHf0HKEqXHDAGuN2TmcIVESvFsUKH2KcGr3X_47Jne3gvXypdCvcHzQtd3cncFdi1ZjFfgINTIyM7GlafHkD6bg700vRcywEsCBLwEv0zabo_g6QLVkswcOSKoM9fYL-WMsUSEGxrZJlQtXKiumHfFXJmPBFibqq4ouqJQPDWQz6gMPqMU9EdliOyAYd_bUia6SI35FYspvDLVlpqNHo47HWQvoA3zmVIW8pyRW4UHWE7UWns4nMS9ELUP3ZlQZWYsTwC-skOn4gIAU1FRHqFVkQuDxgkAfnYsAFwFv6KpgRc6aiFN5Ed0R01l2dhdru_mt0uEDoAS9IDnIFrAEqmbtgAJ4HT8C6g5GVhDcFxRKLF9R_ycDowGMhVy3pbS91It4_57SPuh4hmVSVt8i_6-2KC_0yz0sDubtthQeDLlOZW_ln3w9QRIYofNHX-kNGqdn5nAH67sekuUlsAzI1qhfE-UYE57BBbY4ajVl-UYi9rS6AUE305kZrOr-bW4x51a8QcSu6Q9qMoutVTH66t_zSCzt29_xCWIH5ilo9WXDTrK0f95CasxYgujVg-8YjB1lkmWmNsynRRn1n8R70mXoZbAZeDbd-S1zgtq_UJP5vf0ZDL1G09koSfzvH5m_xFLFLF0D7F0Ph_WY-Il3eaPs9kHo787sJScxyi_vNgJGmjG65kxrkYCTK3TCJkdvyS3GgWf8g3CycWKoBbCHmlx0sIo7fbB-9LKq_BSovqDtNulEgo4YgyxAq4cEw7gB_XfYxPfIfM8OAcGZgoQMJVHuawqNQQf8iSDSUBH7YxHORSQ5I4Kb9ox1d9Phv24V42fBLBUfP6Vh6k0TBtPJgt12OdOpSVFKQkwae-fOAYAnEL1mRLDutpF5AK4m3Xi5Qb2XismIzon97y2RRtDoIMt9yIWAy4xnNQuvP7lmTcjoVTVqucUJRyGOsZfqo1RjQB_TBL5Rhza17sr8vdx3YXaXtl8jvIlfKZHEGiCOVySiAcVb-WPSKEuKOpH-LxWvicKSoRyvJK27G-4CutFm3wUbjWW-euqapqN9zBjSIRcY4jFgD2RgVKY6uCed2SarQ2UzECchtL8pvLXwvqxpOnRlgNHo6VPLWs0H2jeoWbL5YGGPWpwIU20PKIWn5CNpodo0rkMiM4ALbt0EHmCpXlCG45wAi1PqYXt2VCax7SJeCVQb5q36Nw0xyIVOElTewcyLfkR7UQLB19lTwgiuFajj0XEBOTLGq3BPcoDkvkU-BfmkDxNoQgH__gvAnWOQnHuAAA",
        br: "G3DuUVT1HhERVb2uIPRUvBEhPVl1g1warVAs-g12Dm8oqUMdxPvXGBHchj7pitc0VbNYOB549bj5IKwD2zpCY5_k-n0usyhFZT_2lynwEZamBh_HreHJSLRk1kyjbVrWyAIHWbDwPKap5XQ0tTaNN3zSWN7-MRC2Hs5tgnSmKo2ZVPInYKapX_-q-l-_xqZdudCgpLRCtbxmOxnZKbqirUvgkFppteAsDmAyGD1fe7X8-p45h_cmchl6fc2XgVL615UubRHW3F0DyvhA004RkXXa-9Pc2-mJDaH0iDpX-5_SiwcekPggGSf_32YtM0SNpqy98ZfUynv7mUCHTA87DE_MPap81Qscwbc9qsQnoiLQwWAwu8UvX9W-volri8loAkiyry7Tv64WpiH0k40zsvA8rphCq81KafbeZjtbnYfUBoZDqZHYEypj379t_dfvOOWkTpsmIq4T6LmuCwouTOo-K4xBcAEM4PaS_9839d_23gEB8GVK_-cq5C46dQTkmLoCd-99zhbOueHNPXcGxgTM9wzCewOA_JwBiCeC1Dv3XlDrzhD2GoC0PQT114KoHyA-B1D6BfWcGS1RcgixKN0qOOXSrkoXlZvORemqsS4ZdjpaLDr9N4Sw18jC2fvWkl87CiIK1_aTRUy1cxs7qZ1nN4viL74gCEB09_8HcNDGXfYTl_TT0K4j1TENCRgknUZlYc-RLRuuueUtN3zgnit-5D0v-ZbnspAdX_ON_CkBQ9D47xD6AIA27uyH_pCgD4g9AHQ1IFD6HwkYpHaMNu7aA6TKwuus60zFZ103K3ASB9iyuA9-lpv2gA8AM8kHiJmEiUNy4SK8Pt_oSm09Cmg_dJgApVyaND8VJerMFP70Uj6vyQqXtI3bs6aWtLPsUsUBHMmOLxDhlKARnlTnu2azGUVVmtk8ci0lO_Qb302N_1gH_qH9kTZWNfiz2pfRaSz3hDe86faiZ3RJaKQx0dZ8EXenFrOZiBzZnz5h8H9v36chk03mx0WVVVjMLsPevVsgunyhDR8nPtZizIJEZ8YDzBEwfAURJYH6p4o8xwMyi5n-V9CIFUA4UF3hdjsfas3oVa6kIBG4qQ2dUsX9eXQPlhRYD3EcFf4kNEYBRCzuqess_UvcILNFEMKu01SEA4QmrKfSqyTMWBwnVJdJanX4gfk4hTSEtSWwOGwwdFXx-jjX7mSRMzihINFJVAmEr88-ygtZECICqD-sClDTb67h2-ccQoW3rKVSBhyCOr4WADSlipryGi3irPT38sorhTT8Xbd6sv1q6-7-NlUH9__fK_Yjs4GJ1vSB3o39UQzzWMOLgcSXiYFdKNpTC526UMc-CNJ-cGkhXUNOnrma43ANqAZES_T-5xOK5qBbfEWMkguKXZ4r-h9_qVzFdZvCOhJ64ihJrWagPeluNeo7V3tqKhF_DYiJIYXElee8SQUBYd4VhcdLeDRT8dYyKOkW2PsFIN4zvWwKQvTaK9aJ-am4hNC6YFwsMeH0o-6H0Rj1q-pHcEr9zBrJI3YC5ZtXO26FRie7dcEXCrLJpSnosoIRRrbv-yWuNCB5BdAlxufus7vZbAYfGV584BHr78cBLg1s-MwjeTBaErS8VzdZfPt28c1G0M4SHrvSAjTm6rPgCKnh3XjHBeW_N8Re8yFlpTdnKy8nDC1-NkM4Zf2UwoMkGFSHV3F6-qYDCgpx3q5v-1XZCi5Czl2C-qmgjJb-KndVHmBVjccpZR0LCHk9Zzs6IIsRUMipDANX14CzEvcDDL7WkuTbDwYkCeKcfTtO7ECj-wPkBwL3AOUkItMdH-7jLpyqgzjru2o-kSpuJ98H4toAdIItuuiExo0cCvvA2MOVz951JSBcAzAQwVxFKPm4fo769T2S09DGrbJov8QEdXHi_WmGx0SAeDOqJ_FlO_DCognKKL2RD3RLYl5_AxBoDTslqBvpkBULCtRgl_EeoPuUcQOKDd9lP7oeR_87EhfNyLBJzIT9wHVN4hBnY29P3aQ5f7q6LGnKITKi16Il7csCUkxrOca-2hhCukmDnAXhgvNFyDUQ8FFMkxOJ-VFhdqzj1NrLSNjLSxlAlILEaQ7ferslcigw2IEimuCydgQqKwv-_T0hGCv1IAIUCyUWo5yKEo5W0EjIlqnp63dSYVSETS6tyuJli6fpzlN-qbIwYXO6HwyIb-qprk23V5zcbSvTO8h3GhUMYEVMMLaJaILEO4IqlYbgv6TPNSdNRAQeU1F3ULVviFWZcyudVUZA6mt1uIEIPASkLsPob2GI2yoAMIJCtKQvSaIvUTUtaeUylzfS4BfNzOKB9V2cxTVdFj5ZV83V2P8hczYsoCBnD2LCIr5ShMSnxO0VbhCt0GjNLf5-clUtkKLxp0r1YaF3rQt8V-idE1el2MYDRJ7aRe8exE1lpAohX7LIpjrjdqhVUCXbvC3AgcfmX-uhaQnMkCGU9WCAUYpDuT7NGCc-za1sG5sh1gLhul3cIQrRYvXOEIKhAwJ7OBL8P4PKooRDRJ-EAb82ZoLJpysqmnfZIuzS97FxifSTRF_LSsCFSiEfo0_oCalNVmeRdJ-0YZW36jo02HzWUyMgv3s15hkiEDkyyXX_fF6H6dLfdVIiqX487P1xMPu7zVEKVPCiqaK24FNSdIq74FJGgjm7uNzopqBKO_IZCV5mwGRIs7ErDjcH1ZbrIjDXICJRKQfoF8GFr0SSvbnVpFfEQx-IIL8mWiegMcsjw0nvElllDc-wwWOUmP0ucVVcTTk_gK6xJ833NUzTVpHF7T3bNHTQ8yFlJ3CpB6qotMvOOgJdifMquKNdc0CKWqOmJiOG6n6-sgjMMtWNxxVfhd8EYMGiCHqF-QOm-zkiVvq4a6LJ1JV3H7EKtRSm4jdk9gOn0ZobT_ZbaDeF23gUcn4lI0lV-qaWJmYDDgQ8d4pxVyHv6C7NCLjHRoi1Mq0hweJKY5RLlx7Sq0gjkViwrHWjSKZgjt_LLAZJJUDJPhpKhHOvcxE7N2jdTrGYb9KtSU2FKk2YVf-ti9hgM-X_ZQqXMRpmkkZzYwxeMZK9G8nBEeu4yutRui03f-OgLluzDiqyeL9kGss7vCpwxkbAYaaNdwa6gTuyNVN4BNjjeUgC2JzoSmTPvTiWRkbBaqVXa-4Eh3HIolGD-_nxqQJGLqpHuPFYC31YzjKjk7yAWzXphHScMLvCKdZ48zhCItEL74Ngk061HvVZLHcUSve4vvLQlOZ2IUEqMZWBctnQKdcDUudetIcaVFNavcDiowRrW1yYdepyhwru3KZDucmfG7C6MOqiZE9iNIfrwQ4daQw7y-6CDjI07vakHKQHn3NVoCgqKZZ2vkaHXlVZ9Q4S5lyltFh6FrKMdEdqmZM4Kop_wcnlVzgC15PkknnjTzdl0mESKVGigWo8bGBIwZyN1MHtLmormyDhdJEyDqblhZbMWe7B0T3h7LdeoVqGtoaWELhHOVfkDLNbNXCA_xuNmY3TLCblrQAj8xAZLYqj6cut8t0XZLlDlsZ7KUxZvK5HctjaTGwCY6RdqxROpTcCDw_pbv022d6fdCQd6foYytWPPm3tQM5xrT1W7xozAAPRPyoiaChOcRowckSCGLydZe1X7y3QXvog5IcGFdUFZN4plrsYRuxtGyPiH5wIARJLnCPKvE9EuSHKpOoyYasrrqLe16rxj5ghn3LmcHxhMEHngRZKgpqrHpGLtYR-iwHGGCe08i-a0jgpGCRqNQ73rEqMxkE71vYqMGWAVgbVJQdo1PThlKWLWs0ORFoF5fRUxheAwHlEaFtrQ2kDcsYv8aMBdrGPv0xhhecP0Lv2_RjXDEMFlXxzXtNCqmMZ3G-1jRDyaJACFkAN4RQiJV1UGjV43MBy6ip43z2giK8ojCD70Z9lngvpWym_KDRbYV-D0fMKE8cgCHuql4mG3imNni8lMghvY18WlIK8WGarl3A9CDkHyRL_jsz3fg1-ARkTceFmqNG1ZwxkIbt9dECMs5SuWGLxcl1DZkgdx7cvROG-X_dkQS1K-EL8_3LVcMs_m0LBjWHZ1RAuWiSMJSCYEkxQxUyBsaRZ_5lCw1REAhFwNN2_z2rwLnoC3RlO971UGYzxNr1Hnkrnr0JZF2txw_39VN0rpw-HRfOPFulG-7KBoyQkpAVExcLPFTVr2EqIdynaQ8nxV4NoI3Yx7OFas0W3b0kCInnccC48jAHtoq1SUSwzFqDy8oSPkn20mg1HGzKCYXITfZsqmR8oR6J2ol0vfHeUqerRtLxJkfRfisX4R4Ol8-IuBFQxiL8QFk_ywNDDcv9fsKHp9gNm-ssGhhUw64z0tplGf5JCE_wqPzgVZ-eeby8VyKhx_qvBNWJj0WiksdA44KaZ_f0h0Tklpa8W_XYemunDqrArSWkGmZTuewRrqj-7DQGj4B4sRl3xVqLtqa0VE3bYNZHd91Ihoo2X0Jg2xkHT-J6BDzbkETHBPwSbHHWX5oqW3FOKU4fIAI2gLQUQVPjjjsPRnuyYCAgx_paDVB8sTxyYw0Roso9K_yqGPUuFNceVaIkKZo9pc-CGDOr_8sInMJqe7mJqk8QNmbj_qnNaZV7ZpPDCy9ATzjBEIl2axmyJ9t91FlWeITSSeE7G4MMdC8BwNcVEtdaeNnzATdDwnr5EjHAiSlIP7CW-HS-GocF0OymuJyFH43fsOfkJtHVw_yguWU0cArwwIPTMHRFTkeL0VhjgcIxiStYATdwStyryVCH5frqYMJH1h-LoVBZy1f3WS-RQqmn-O7Zp3jvSR947EkTeJvCvSR7NwYT_m7MKkdzqEGUVVlzyQiymFzmyxGp7A-sHr-aCDqAgADajLaNtLdwIc0hQFE7lJBTFlt4_COCJM5dIjbd_s31Q-X-fJDGTDb1SrE7VUCqeD4stfVW38P3ksU79v4sD0IMULg1NQ3sgom3GXSNrRq6DKn7fvjDNoxAg_rTXf3gjGzQv_gQ_PaF8uEnGxQwQV35DNbte99epUJl595u5ohINOFqH1oC-wRJcypMhudxji0WzsvgUKYgcmwzJjCLygYWsF6yLF3AxEic0DtApphwLQBGgAjAByXcPAy1JjlbqQzPxK-SMaD0KB-g2QN3aBMhUpOV7tiaphw0p8oSGiMODLgr6NYFE1oNghZsmAqbDsSfrJr5gHDowS3v-YpId8r8UJSGjGffT6kR_JN0IxAEXr2VgclyqX4izqeFSQMjg9vPNAdG7xP9NsSgxNZ-lYnRo9H5BT_dX4OD1GAMOkQgLhlckjg1YaE7c8xmFMG4QG_uKTVKtdmy0vWOO1FWV-obGectdcP9G7AjNwrLmSBGmOyCIO8FaVy3yM7IIDj14hVGWigF3x175Vh0_kTHge9gKg65dW4ZH7mM8RjcuIwQGOoWylgGNm4jPk_5nqi195J3WEeC6WkNnwGtBgIqTNatvMi3qHmfY0IDMAdk-JfALpDeMzR_qAIIJj7zkwvtqnqHctde4aS8MWNiasVwHkASobrnEtXnDB9_ousZIm0FgsVZr2aS31Qt_cBK760LNI7ug41aAH79CLD50axzGMJfLxOcgZJb_5AS6NrBi0L_EERCKTgmCnadD9dYQ_A8EO8TiKboqk8QHqY8SJ2ghKXpUGy_x3gd0_wGegYCrTnLK03PFseAeOt2pI_KWUAcA_DEdV3PzDt69hYJdqXoXmmXko405cK3MZKhyRbs5omO5MTUTRywBzzzR-fTE8jAj3v8mEeCqfiVsnWrh8MDsA6uJXDRPZ3OUJNbXh9Ggqoz2cpJ8whE-jLWYAxkMV90-Mf5yNVFRr4yZzpPjuLzysVdBN0OkDVngzRZwFeNZ-W9cBwTLocdss0hfDBMWPvyjG9iywVakajCMgii8qixDrL5YJqTAPiwq1wNEidv99fWbM5wdDqduhRMGc3zrqmzIDxrakwnVdKSN6uZ-pw9cB-eLs_bF5BSULfWvDWPwso22j_1xLHts6HOijXf18Ejjlogb072vTmSx-Mb6jmwqPzLeHnSH2MFiiXKJ_EOZhEBzbWFx9blpBDRtZ8Hpig_prmCNtNgKN1j1Ky29yR7PJFWuryBHrsOaSmUlUIJpmTCl-dXnLq8bF53Qpa411A4KM1Fh0pHN77fFFQqqbWLkiCUMWwNYsDCSRUf4VNbEfHMjiKBYtmBc-K_OWcUiNKrDp5y-wRgcieAEDMEcta6awGoBjz3FksGxnMc-qdGIfsgDysLsGw2sb6fsLitxZf13AdH4lnbmx6nmX29fKqkhq2jG4KBnkYd3MeTlQtBagC1z69P7owO5rHBo76oRw9iee12HkD21iIhQ5zrXgnvoKy0Q685eN_9sA0zRAlDNbMbJFhio35HPW7RwQD9n6Yh2n1nSHph3OYVesWyqI1lOR4_Ww2DuWMfhsMa926mNyNIlSWKFXdveNGTlOC11X17h5-2__wrz9d_h8sXlkuKg43rVr1JPHV-L77e_7F6mrl_mrPeU6N-n7ud2f-7-cizp3csDuV5e1OXifnbVmDbFan-XrndpMOO54vKj9vKUutyC8Ay32ieYOVqz1b1GT4hc4WBfTtMrf_tbNSbgn_zxL0wOuVe6UOOqBvSF92Q9Nt4L9qryzrDHhfernYj31d0d4oHbUfBbWJwkoRZ0wD1qNyPPJiCN856xi-PWFQNeMcCCNmw3RpTKtz3AcBTBs1hKJPrQMpLKzahXECWGrY4g7vJ2TPxYSaMECVkMtWnfi1M1LYWE5ELVSJHH6ABnLnnyffy8fb982vatX6VGv-2ciDySZHNl2YsSgvJUxkR18LJYrYj2ONgc2u3pdHbUv8RU0n6SQ5yX9mhj6fWgYSulYOdteF7fXV--XM2FmB44ZXvBOLczbXdPsfoAY8PHFbt19LUF9lJWuCY1cuN5NpKSvgyC_sVF4wB6iAG1r1br7b9qnNZ8yjZ3TauVQGR7D3Og_qM6uKZlIz7KUYDnTn7z9Ha_ArrDAYHaWqk4OsqqElPfmDBOrBq5vebsX9jVrO-XT5sWB9fry_3xuDzfUy76GUU2Dnq__y96ec84tJk-GeI8VC6s-EDNCSCTSsrYSxjjj1vLBUowuzbKiDu6GvL_oUHKdkZEHCTuuj0aHcNXit2R-Ftzbj3xdp7J2t-N6BB7UJUV6-HYP-aEiQBu-Jn89cgQEo9QEwb0LKMr3Gr58j6Og_nFtGvL4JK7cQ355Y8LjTWeEr58Yo0_83qF2bM2IdM6i_JsZCZq0ezaI6hlXi4R2H2Nn7-rfs33h04ffwXXT6eYhzNORo4PEmKKHN9cBUH6KcwW8CH5NqbqbidYZeFzbA2zA1qIr3NoWQrRRr68SfD_icshaDxnFgUPye78aFnidbOl0fV-2bQeMQ93SULQWCtqpAAcZ-1ekoT3NWpavjkDw6kPoR0lG0-VNVENb1HyYN_37fi0DfNZ3BPWUM1hjYi0Qzql1g2Y1XlnpYijS0eedKvYGqxq9dQIXetSY1Eo9PnC5Z01FUQvJTev_piwe3MW3W_CIKdqAWtYWxFOFhFK2c3VCoKM6kEqhkxZ9xsmZLAEnzrtjDqoCsakstAtL2RGRuu5MKl-f9UqSP9CzPwNax2kUaukOzW1wqdHrncRPeiLlrwFhUXyrp7828-kK1s2uU13_-zm7osPb0wyu2yHxQoPI-MNjRVT5ppm0CkHzIKJlWwoVzVqTUxKjy_BDPugLMnWhXPdfk7cVG2c4ktF9oUuP7-ZdNV_coIfW5W7Hz33a7aabV3-r59DGmvRmemFw8eIPwRbpTzuy1i6Zqh9NRyoQ6pkWHMjjebs57kHThwp2Lre47JUQ48O1ei7IRxN_7BCroPpGFjQiFZ7H2caq5no26sqUJ_H_APPKSOwIcw7rECPNEUxzENpRdJnz4Yt23HaSvRJUhzASML8Vxcr0Kck5v6C5VNe6J5B8Su2gx8ylOlxbOGPy_LBHK-rrcoaG3a57yZFEjuhbXsdfiOF1E69pJi_bEdd3mNlKiecOpnFgXgcebiuK_BOWmblizWMjZbQHSqUnIgsx8AczSULgBSkiqTsLdeIEo7cH9ZIFz0ssDrvF4Ruy1bEsHPWu-lUXanCP10ePHynrUXytLJx7mMbkwVt0S8h5gOmBrFJ-0gMCCxMcYu-na6gAWj-Y_KA5wDCl8QJUFqR08BOYoV8UVKzkUlfS2M9Pw_cZamcbP2vx0FOTaKpwwk5aZQps0aOQSFHG3EpyJQolHzgJL6IQeXtIm5IhKEgv60zcpjvkif6qC-a5s2DdK-_GnjEertQM-kuRr1dJHy9Yb-A0Sk28eE-IS2QgUnbxJGVUrGLFHtAPJTHYDrVoqXw4y7kqKjZXn-EAj2EnBVe1V3FL7pU3vl53zU7yG1Wkqmg7G3ZHPWF27Sv_npENhCeu4dUoS9gCgFcHRxzi7zQRbKTcMy95EX6iOeyG7vwsK1IumjcDtx2RQrijqBhYxf7cBOj2VkGOIEmWWQ2dzQhdvs2waI6YRSydZvy0Z8IULjiNre3pMf7zquWwveTdUU7cfm_RmKKdZKSukuZE4RptnEBmOpIyQDmheKqNopZNhrUlcYsl-nNCwpXf52uvCLlpVPT3BF4WMU9qfnjRzGx8-wgAUkcCI3ureFg34Fu_5HfOTrrg9QNzMFduR4bGA6M2GKZjf2muCWZWcDThpd95OUuX46lIRwDom1TwM6n-JbvQewH5PxwyOmN9fqSJ6ALqvLRcbq7y4HNRhhlOqDUDGEhBLGPAj2kUaZzPW9xc0F0jvZfI-BP2O0bHV1V3x3laOYGwBUWikDbnigst8EeeiGsIueWgwXkpNzVKCXu1a6PHzy-PpWp8fQaIWcuT2L9b3-WKEq_hfNF9UdqIVV7dZ3PcT_ehiVSGztKFrioo8hJNdGbNzJ-n9GfSElfz5BFCpFIJ0iCmOrGvhnXZTeHXlJ-nNWuJLwhiFXWv3g5RW_aw9xRCiKd1ek1-W8kryuO_F5sExpyH_cpbrbH2n3LcSYwiOCuxBmmoZMW7hzL5nIhv_BrLkz_TORbnKYRaCDCK2DhjBJFGQQhimHJfo8Q_dJJFSO3MCTMhi6v6BNaPBGpLiRIRGctCe0FHinIbBHHSenFIiAQytQVw-FT-uKGgdCFhNqABOY1P1pFG2hd1J_40cHQ2J4qqnRgl-XEACM5s95V9LwufE_td900Fu-hHu9Lky5A489lleq1CyWLGESbA_ng8N_F6gqfrYv81-rywvfDOLr337xzmq3uB7RvysBtf9j78gccfkkQIP91aLcEhArtnIQHYxUjptsMKYNKRvyJiWG31m59dXIcLo_Ncdk1gxQbYD1imX-Wve2hQEJhOGejvtNAVqmzovHWK7kklgUNHXgG4P_aMf7_9yO_Sz-H7on2BfQ9nul21GDxuNDtHuri563gNqfoj9XJlwen9x4ZZ-l4vM_5YvTx32vpC7ioJ8a9OWft-ecvP7H-RwGnhEldy8t_F4w0gJPzSxik4Ydavj4ampudxWdpdCF1g5D_tZg2pltN7uwBhiXqd9Dj-ZALWzUG-zPQErrV7eNyu6JD1iEgLvuw1_nYx999HXHGTLBjkbHreWcW5D84DUls7AJkKcft2qVZc2cSyArFtmvswYbs6r28Yt21h-lOQgDNLZdpExtaEzPS-srpDLwuPtrsvbWQj2sNBOjZtQgkI_-VmMWojUf4sms-rGy2yy9jU_diN8eTHWTX9XwwBGPyyFJ-tbQuNhVXOPtOPmc_8Rd4ukDlF75TPx5_54MMeNREAyl-1rzFQuEsfYzsGFhcusiPok0EST-bD9C5z456ldZ4xOLeM3QLiwz-Ff_H2uQW6wrAvmvKNqm_VeGRLQJ9l3vmR2dj8pOEn_YreV4lC5H27fNMnzKE9FN2JZqQzeeNECDX5X8sGONg2aAcNpmvw5GDMWkM0eJfZeJcUeSjvA-rEDnrFcYuJ2uEsQ5F3aLshLqjFJdEykrQRIt4sHSq6-7kXiRlMLD0rB81Aenl0anDOv2IBamE7FBgK5HolnQzSjI3TXlR2lX-_CzkOKQqbjCxFrz_iMLj6mdrENDEaoPYqWbVZrne3ox--xngs2uFEqFMMG7MXhtCVCVdbTvDzoZPnY_oKyBaMTj4r-vuqW8KSQHCj-kv9f86MIh7g1q3ARDTt9k-P_jNs45ZVwxU1dqhqHrbhIj7AZ0blcwUd4GLApFRCjL8TgETccNv0QWijR-qkFkKT81jT5OZiFMLGftAQkLemyqcTyJd-cb8ad8GyJ18k9sJQZ32aKgTmcdxllhNOW_l0mdZ5Davm5UhiwGfSlQgXNqygA4sCAmnuDMl9TwsYg3tL71tLdMuxhOor53yNYB7Jfcb9HPCpg9o_KfxaPl0CHWxqZLnc0lelRwKt42ylX8H-jkzfbZtN77SbbTj_qnZ032Payza3vJx4ktOGxx7xZNZe4lqH1yBitwVj3-sGZROFxVp9hl744880A7hdwCYEkigC6gKRRRfsttr4NDmt9Gn3ebS1-x3tE_Axd787f31m7L5LsAPmczqcrd913B4aG0h085G67dieX3g-91ERNfyNyBjj4Z6ewo8newu2l1BbZGjnTl7HEUhZdxKWNqCdKdHkX1gUeWoaCMECMAKIek2bPkxZhujm8QRpdghTyTNpuEnp26mNQpSrvl_4N3frpIAhE-hDfOwpI4cHXoRopxDqoXEIOobpskFd4oDn_ULUoC6aXPiRFAgjPRZnprbTdt3E5AnE5nxth4u5gsKiSt5VHl-f16EPCidj7xeAA2yGemAM_ZenOBLI7E9UgBLy2K2brmT7Gm6_e1dVyqefoj3yRvfRIVMKunDhA6H66bst4bXDmg0VqON4rSboMv4uglUtyKBmMrQgTKoTYm_w2zG4UeaB25R7_BLh-AwUwmpiuZ2kAl6Zn-_1kNjVBlf9ovVPUWFJVQk8nB62QHezYH9ve-k-o595eyarMm1-vBGVJAoQxnt4GR7IxxUT9ztPiIy2nub8VdgGiwWwbTch4xW1kSHJg2kpd26punRnMff8bC3Lxap-wMa9OVPnYCheH2ep4oAq2veEW3v0MeWVTzNRKO6OEZNxIswt4OOQDPAvNsFdopVZ37xhoOnkSdI5IwqKlDTbOQx24P48V3k30ZgeFnYnuIdoMgUWAA3us6AnOe-RMf_Xo7BjM8x9JAOrB7WZddvw_TutqOTXEPNpKOP1cfvlkuia_VyKDUW-m0fh_HWIWp3e-EVPg-PR_i4QgwDsgevQtxWiRjD6Iiq1UYGSYacAbSqu4rXpXObqJ5FJmeK86xQEbeTT_ZHKkLB0FUeEO7lp0l-tdotRuTeOMkl_4kmxgW5lFeDzl3kh5j-7t7GmOB39wZrJJ24Wapsg_vBbXnJ6qY8B6pWeKd2gx4dxAhR5_pyQKfFEfcpYnFqcuiY-u04MlJKe6Wb1_t_XRLTtiP7fK1y89qiuwm5IkO1ijkKReLXzRETmdlGr-vhPMpbOMyqKeuXrFeuheMOAtV4sfcNi_D-eauMW3UgEwyuWCRgyx8_GNaLaGU-j1I7CdnxgKs0-AJDFU7tQJOFtjFA-WkDwqWpz6PWIJqGq08Ky9NkzRpJBgIspc292IIzv4uF9C-D3Lu_s7u3f3B4dHxyenZ-0by8arWvb27vOn_T1bpxm-3P9t9f3aXvd_-FIe5_H66OfzKiKlDzyOqbz-MKN1Xm8Pbara4i86SdfaCh0QRyt2lRxN1pEmW507S-U0L688RNnGjYvF-eMdZWEN4qVhyvv6zVW8BwcU4MwdPTY92rvoW82Op2Bg3Hqk3_6e2i1yEeSjZZ18PSKlYIEOVGnI8R7ARDYI39b0ypSGzZ8sdiX0kiRAMhl-scmRnSl3e97av5SN1erV_ZlQFQ-OU6c7eLBAoil3cRta_mw796IPFu8uVQFUPgJUDSA-2vc701pg_kf95X9KX5tOUCFnkc6sEFwsHbDzPbUH9e2_HHbP_SPzkbmfSCjz_aC7eXB_8a0Bu25pYyPT5sLUpCykee09FcDkHPlGYiyFEoyR4BVm9JinJVj_6HWYCwsickmwbKuUkktR22NbCg2Pimbbrh6DeLKLLInL3HxN3mYz2K5B9UnXDW1m-Nk-gh4-bldiro9LNDajdgGfHkWtCXsHW2V5KUet-UyVjp_WItvdOWYdggSlTUzRM0TGHvl9n5W33HNj2C4GgxICv23L5bms8n7BhzEJnpNhZETv_7YDPObyyOhd3RGGEODf8tyf33biuxTfbEDaLM0nep2JDjA313fPnP09NfDK9ZZLzDtvgqtD625isOba2poO2aCPPWnh14DJu_nsTSSsOsZ0Vy45aEzbOLeXmETO-UCSJe9FESZNkZmRAt-n5NfoF3jzIfwSXpbdqZ9sMLMOx9yGwMYjdumN--gqx_YJr_-1f4PlbinOT-3r4noMasFi6ejUoXPRAByZSjxKLZ9GZigQDojFCL_3Brdm0mw2HESu6Wl-oKQHTpZCkA_-8akARRUHIjKjvfkYT3Rmto3cjXvRGRR-F_ooFdqLOhTUwAMcs78usRCxDHuyPMxwCkwixMPYSMykVHlMC4N8qEq75Iati8t069C_cA3gs_dv55-tPCho4Pmh3tRw-oN-ZQYBK-jaur-KdpkUZi8gdXJ8BQeGTFkz5DKKDQD8xyRZl1w82T_ubKn9j1d041PbYb8Z5j-5krzAnzcbxsxIVjjNFCk0amM4vHWWQERwAUTLVCjQADPXN_cJwAkKGj4_KMTIuC2VCJXlhkPGMMPrcOrwtR07FS-04ugp3jVuoVqh2vo39IkOBbpNzHtaT1a8pjVJ7nXxYrv4dh8CkhdkvFF2SaLTmTj1Q2oZpT8Al7PMJpyrITiXdDeh-MKVvQIRTDXo2FXYk9GGjSQNEkeimP6yrs4mF77zEwnfHdns3PKm-eaX0ZMFb4sk0fx0B1VGgUJlQQacvF-5GCRRp8HKZkV7SUXSf8nYEK3_3mJpZUL2KqtmeX_Glq45l8_M2Scm9vrv9rBrut2D0RrqEdZ3RCHV0xm5Qgw2N25xGbcezauf0mhe_r_2_x-zjLWmKHoqeVxCmEK7Me7JjR_4QxVXi0k3hxokc4RZeJKHfj5a0JBHhg-KvHeNetLIWP8Svf1G_GMvZ0wYJ6r4_Prdm4O8XJUlDJPKNMqIrIho5J2GjoytmCntbbqJNE3LS0CEgO80HsS5NKQ0Y3mqjKChepC_dRuyns1kDWJAyzvqL2rBZ-JP9KIm0ZArTRlnnj-luPcbsvAGzzgrIWGEw4ZG5e3JRUue2YR1l8T154Xe5gexNj0mh71AQfC5lNRmej24JY45MPwm_CbCb_agkeUkn9elMbUvcWraOWB0oDIl18n2yUkKnybtFW_QW7t5ynbaFQOzuzOu4Iqo5c_7tVWKXlc1J8Y9awcfIldhnwPbrMul47D-C2d85jcexanill6lg6gHZwVtNvcDbx-gJE_6G79MDSndjVFUP7KLn7AMPsN6buth6mPTVT7fRBBGZELnYsRRt3crrdWKWA3bQb6hpMlyEYx1_Cihwxr2VvrJMcjlORen3omI324JRCP83uODZuhcmcXr-LlHltV9L2Ic8U5OMjLN5bjXE0sGLgJtj5w_kshfZdiTfUmIpNjzW1ateC9vaSig-AP7gNfCRqZ-wtMVcQ2IcdKfH1RdPagHSxNGn6ktkXvUv7582-FPzFllL-fPBbGz-7UJukPSXNj3uMbeAduGk-0tIVopiw8XxL5vhjwJXP5PMCirWVG5xoyfDcOUmz16Sb0YVk4dHEfJmk2WXSzUC142MWnQwz7NsicBafpJnB1s_I6TijpsuMniqHCF8m3SwyGWbg2xJwpvJlhk2nGT6dZosgrjOymA_V4VI7J2m25stvAFb7ZZJmFTY2AzPGDJ0xRE7DJqK8bEq-9qDIJBjs4FLMt48vJ488A7FAekdxEIaZCKFQ2N5Q0tCw-1gGGtkcjxIvXxqwIe85tC2VL86dPvD4jI5rvKUwcsm7OGiPAwWHUaZcPE7uPwRKTZXNo5FU9OMFMjcPAalA17B2Nge7hZ7p2UHDMqs5oJRmZQw9JqOVKyVTZGYXUqhAF6CH_qKXS8bpaSA6uKDmkroZvcVNr6VO32mQRZ2jVY3WpYUShZKEpR4h6TR1siJM1doxpxGN5Nq1mf4eFvZ9Yc2oLkw1x4gqHk4H_CiiaAqqivuhd2u00GU7DP6osTVb4bIrVmSU__wbE_zWpNo0apZUM2nvFn1pfee6Kvexjxyeweb_oUKna14sOab-gKdBWI1AHeKKjsA2ccHzsy39AZUGwdp2b6qNpcEqDs8OGGLoJsVK-eE_mFoEVkbB5dkvr8NJgiVQrhbOfcn4D0bI7y9pP4e-hljwnucBorw6d4Z9vdUihxk1F1sa9KsTU5kCY2Yr2WVFlRq4Xxvrl3T-_dvM2ntYgRWZ6Gm8KT2HZVCjVVBjBPT_0qOIicgnPEEexflRQCsn2eY8-WHQYMhyAqHQFd_8ZsXs_nl65AWRu2PQogfBVEkpAHVDktXFuJMF5A1TloM8cyqSrA3ub8iryDS4Bx5F15zmOkXbPIj25ZkMwFKmhXHxSxgu-eHtAif23jV0Xcd3u0lauFGwfFpnwUyTTsED-hrHSFHXpL2BHTtRzxDn01nmGX7W-62hLfK7p4Ih18OvdVQsVkoIaN3sxb38pixWpLRQdkqjKoqiaq4UAnbSU38mDurfUJSZJV-4dTFwdyFTMCSUlfbg802W1YeLn75uVlLmkVnKV_NMP0UfrmUipvthKTFSQ2rqS28OHvWMeAssPaGwP12h_xRt_rvqKfTUwnXNNqRPSemuewAIeWw4nStK6ot4VC4rfaZVDgGTqPFGScv4lbmLsd0c1X1YUMsjk0Rn6G9bk41AOol-NENcoY3F54q2gGAOS44DRCYoTaZdD2ODuK_fgAY59KVIU9vMQ1ZgL8rGjFKDJJo95O6lmW9Aq0BQC6tFHOFSrgQkc_ispDZmkdafxge5zVNLp2qgCE1sZhcSS6vD8bTSSmBE8FC9DU6_61FKL5XaDMA49kOHQDqPFGFBwiQQ8UBl5YvBt6UPlqv1mXyGeI9d2jnRxGs-MwvuwlrcTlLkplwS9C9xB4Qfle4YHZlhPOeeMB-jZcU5zZ4NMebqYB4D-EiifyQcRrJIzH1a4BXdrWsNNYAd_LNOWmWN2QRp0hQ3VdR8wCcMSWO6AhHqwmOG_IgyGUTp616knxkkjZLjgPhda8DHcIl95VDrUrckeIIyc7pZjl8QCNwCJ4iZiwMMiszYM6NoA73yZUjRQnqVQhPAtuo3L7bso1yFdCDpP0gAUSECiZ9CS9vjQQY1PWGfwGicKP7UcyWHRAaP9RPZp6qJoAfRpZYsBtbjwaCwZ0OkotshvG9KQuPbUr4xT_4wIMKlpfw0ZGxG7SimG6ZtJxMGXQYbRBF3lOgKSNKq08gWVVWUe_38tDMi5QAP86OcTAJLdWOQtX8Z_v2X2WtaOiqxVWKjxLUSt-pO83NqTUNI9by9ug7LXTIjxSzPYZNGDJ1b7fJj3CvDd7feVhH4RIw6wUY7jsAUxFkjYdHxIWHZHZNZ0oSMV8PFTrWgv6VIvC0t4MKob6jwvyGfC3gZvYNlg1d4DspuOz41HDHOWz80bV9ub9dmOWJXBrqgvKv_6j8-c80bhGYEsNreTTg8wmj8rXV8xBdYaTHIJUTCDG8T7Hvt0DZm0QHtBWNnvlmQ2v-0QJjWb-cTNGKE9Vkh9JNvlIUiDwpd8BDYdmf7FTPcZy-PHAZToILuJF3cmbtPjxoMlMmFttdytug-gDa-ykP0eLB55mNRJp7a-lpnKv8pp4PZ4nTyEubShA5lJIB-yQ_yN3J03lqGX5ryOUbuq2J4jCgNf-dgcjTHFsx0r651MlT-HqVk4ok8ICWs1zVBB_f-xyolTgxIdgB9H2ONIcxD_s45dr2HDFvc3A3SKyy8-L7AK5sYo5beAEutvgx8N6E1e8SNUH6Zs_wHNjUCwhW7l67e8Fh76W0RV310OeSr-4NTDkaZKPmzCiVDgtd5yK14j7kprDAAYKwSfFjZHFAnVRm1A0WqE6Z2_eHexW81UUVUANBMHFTRbkYiGvzFwdU9Dz26vdI7ib8j-k6btusS_LL05Fv_auNSoMyOJv3SOv7s6vO1yLXIlJ9J298Z7pLsh0diZS6s9-z_JLk-Nr7tDTFv5CM2y13Wk4rfVfP0_Y-z3p_sdmKGqo4NK7xpvKUI8uFv-wt4-cML-taxMTMza43Tjg7pX_ZWxXkAvsR7_Fyet4kD7_vlprNaPc-9NznHKZEaVdtfrSsgEQYIX_il9OLlMDa7JtcX9pMgSXM-HLN_iD9Xzd6x7bSc9v9UE1tha-lHNmTmU_pW1ZAi6hf0UjHvEIuboZH1uOD6F3U9Q4LgGDwnTTwzRLRFNLPD116cEXnGNZFWtFukD_qM0UNXpdmfxO896uXOzuSZ8fnaXe8Tin9hv4jr_QbU4tEVHw7fp_ToN53tNxvCvDKxhjILTefzWWtJgEJWgo3O2Xe-SSXnNa_cr_gT7JqVlD_zLEGmLQ4v-NXGtm8T3po4GGeZBQOnifMYZZM798fRaOiqeROH4gcIduCQOIPLX_lMlj4fEbnSotCg7uXi1_BjJSWTBqMo9YF-DXd9vZqf-3H87tgun7Gxt0EP7PpOqR6z71D7uz4vrlGe_WPGOMw5h7JzfCfzaroGuE7kOMOpYLJXUVAYchpteBI8iTK5yrsH7qJKySkPUdwUtvmopGOI5md2s_zKjufIU1EmMmUowHScLKcadxZt17ueUydVSvWgyOQ0JUNO8_irPHjVgztbIktcxqzeifqdrji-Alu4J30-Ygd09T_uGh6dODyD2hJtugeeNfVk1z8Z_bLbo17tpg_qB7nN6hBXro4aX4ipL3UDRIIMpr9Hp6w6ucKrh0ZJPD3mK6c2veKsTa32L9db8Y1s86zLy7sAhv67gBh7zkBnRGMlFWKb3O_3aB4tOeR6KujrJXuyYw2oAy09MdCy3ltROknTSeGp08-oFqf5p2pdy4fHAHaZgCmEGnJqCU0gjs8_nn89whgFIwtLMyZiieD6IENaTuap7TY9rt7oQ1FFJOir_I3Z5Rlpfm7TqskpbfNj_gSfN7LNgaLJfSFOFAfADPBS8_WHpaVtp6dvdBSokyaE5f1Assui7zDldSZpXgomsqwkZHPqUhnyl0b4ztDeedimzSJbr-8ptx7JLEZ1JkiMWjQzbW2mB6XnCe_3ZnHLV3H2g2Edx7sBEd4b9tHy08KmQFuzXZ2atUqJaZ8iqADTbCCDGR0EhGn01-0WduENGrm-A3GALHnEIgCFJmEEow3WTdWnovPX38HoAZAMEJ3IswOEDloVAA2NZ3ridV5lB_-ODKbOSNNlfylHA-VMqFSDZQXG_mlk9MQ8NmTx1udLR0AdDVUDuvpllqim5KVCyR3jLMtT8UWOGnQZsH2rsPjPyla2hZh7Jrpia-oxXd04L3IxFQsMqFLhmhVajcVcmDPYDJ-77aADz8yqri8d_fu-WBfoVZVkSqRUJm2_53n8QCeZVm3pmvaBBcwBgHUBdMGZ6GkoFxsf8FK5Ox7qBh44iEn1KtPGOGfGjs4Z-dcscAAcNalx-I5YSWL-SCk6w61FMh4-8_PcUEOmFUGoTw7wvF7JCjCmZwhI3-FpmzxW2wzMOcZZEXIwOSBIkP8ienXWLa7ZxSUdJU5kSJyUmwE4x8mu_jerPwEkwPZiyTG4Wp16vAoHtgnSDlPK1xllxN6M2llym6hHYLOMigaDtCG8aUOxl-ptuw1M0sTpWGOh_E5gcs--K7RuOJEVbftDlfk3QVfbd3_mcmaWTSfeiCkngo9RWvvsvdJip-V8YMF08gtxUeABUTJrOTs-c93uuLrnEDpSGtCfnVHNenzII1Cdx1vAQuhwQvhldwZ1ctscqeCqVu4wJLxeXzjn1ZbRBr_AnlfH4hr4lzmUdnBfOYD91jKVQy0zd9iyR3vTPPpWwrrBJqFQPcNIy8-R0dkPgs3QGBnZAtn4voCtl_qb5HMFa7fBrZgUN9M-4GhxbEiSyjjWA_ro-TStLSHFPvLmwvGgEUvlUUk4ScaDgFNOZ45z0lKOFtuqR_OBGNBb7dSkSDoxVMquPC5rJCJgOYaTPy-HTQFaIiGekBgJxkiP-4NLUZPqfzQBWA3zmvvM1ZaGu5oFVK00wBiqhrLDDJARiBlhIcaQbFEA7vmNzJjXaw3DJKqjUVGw0t8TS37HspyKCg05iBi1mVFTkWKjWWeiuiSc_lKdyNEmHdc2V8mrF4hrftsRP8o3PO6JuWucj23dDSqLBaVcB9ytsh6FgRSDaGXQSUT30fn68SqZc6lvSkYUzM-PYtXqpJepKE4X6HZVS6DvRTC3NZnHn-B5KQYoEPmisMQlsvwiIgRMf9vHNHi8XsEZYLbmv3jR5YX8U17l2gg5zhevm5Tm49hCnetkzJ91hT0Wxv31TOC89EmxTBM6KhIetJrklELRWigerdENLmP-xRQj4gozjS8oEPMoIDCPg4TaWcJMQXolWJkROqe0GkD_rZ1Yvxo-_M5OfVDj6DoPhIEMTDaqxHKMOcq0AENKJqGypOwgekDSBfIyse5SnaHNwO0r8Say4lJV5ZztDlMIYleVs8ITE7e1DRc4TzvB1BAsnp7AFD7LJJpAIZZA48R71WZmjXKqeNp2GeoKH4YaR8RIl3HbicokqYrs5lrtQZiDIYmJNX4AVBvRY8ofngjdJ0oBehwyJcAM9PaWhu7kxhaQHNK2iLepGySegOBiEDDr8Dp20BNhjqvyJ4EI6GIePZVgleoauRUsz-awV9YoR6ivIZJiW8V3LyhrWPth0PX1jw7y3fsUItI_q5lAszzXimzK3Df40yY8pMPFNO6BTsGujkrVuFchLH8EcVuXtPU__CZABlStUZEgyEQTTBbfzg5btwE6wcEFdtTzDhzFokqyNxy9DVMONBOBTEXcx4b31FB0WZFySMbxDOysS9mrNl7sPUpl74_DX8gcQviIDm3imq5m1jA9F-4NS5Ga6lOAFcGcKJgUnviUSaGmkghJEKXoNusbtRk24JFwbD2lkxasB0bZ1AAVno2ocNcXjJmi-1SdoaDbB9Vd5F5OOlMV2QdQk6xn62NlznuJsoKoak-C-PhkeHSrookV8mEL_gNoEzZ8RTtERZanCLOz-8U2S_LFCE5FI8lEKoOu2GP6OLE1B_pK0X0fzDvLn9MQJI0DIUfZfD16shTIF2XR1ck5rI6G4IxmgmEKExwK0xweUmiyk8hcgoL20c8azRlZeooTKP5AUe-Vax4or4jPjWg7UKjgBh1YSogCMHVJk9Bf57OFa_--nTHDCY4s-0yajHPJ1WDE_N_L2GemUpedo3hIPkPchsDzxUcpsg0GB7PEP8JXmrsGUY3SKT9akDcUVZZav0Uy5nMk3SYcycXKTpRkmSTHU5TLmTJ5ioS5pDLI5P6QCAY9sOW4gRLQYD_0T2gDVDMcw90Zv0CfdBY0yE3YJSFYvm3sLM8JfdtSOBPwjoR3lRiAequWMpKBanHZlnNartFFL93c7hi3w0KL8ySlFJRPDVC0QryIsD3UyLDKfaFYjU0ENEZbYzYE2wLLkdJ7TCaOcG7MLXyw96KUv6ls6_ZR03eCdPza5978HOv0SkoVKrrHC-HMO9DlS6ffAx2FTYKeHDTf8nJUi0QmR7lkRJWwNJNJ-fVVwDHpQ1LW15e3IbSEL4PlOA8Wwg_FqzOjbsZaDsaArBOdd3TmRaR0CY2nkZEQmfEhJJojgB10NHHIxYIEMP0bBBrvCYTodh2oOqMnOuepqFOgCrXRMkCQR2zMx--9rG_T7OvC2dHu2mM-dTjWNUEXnC8eEhAdta9--_XIkcFq0kE-v5DkyUaNKyx9Tsv2vCJvNL54oVRUVKFMP8-udttluO0G-8FR20ZQhJ4EWqYq_FQxPVw1GelxSoOwhtNb2Ti-NeI6qnmMUkkF1YBJ6Y4CtljgNd8wdXVqx8FBsgbPtQH_gq5khxAEtlPD0lt3SpmMs2ijTLq02r9grLP7iV6e-GrH23Q4F4WW1tYBAhFdUJ3-I7DlNca2dPFdCTlkkeOmHvmLl66n9awRufGgprWs4D2SXSGTTY3zeI__Z2NLEWzQWkuR9HkE4Bd_mW2wV1vg8lZDF7QGgthgbazfc9LU1_pvH7viLKX7WBLtgygK9CYkO_RIMOl-9-VvxE2-hKVoL00CaSOmXaNaF9HRwMR82BXuUVP1a_gnUrFScq6yPr2UerwW61YTdB19aLi-GM7btsNayzqyqCvlS1eS4A_fgxtp1cfgxEi5R8p_3lcdDo-v0z0J9dX-0XzHOLGcYGsSReo_MGJMeALjWpu8fRrZMjwRoGRSlEpW_notzghhUwotniZs-kJEMg89XPfPqn6JNx-kBOE0I3IuPc4lGL1FNQNKKe0s1tpHNrJ11HC2C8REq7aH_Rs-a7RUziv_bcjGDgQhVMBjOMo5oZGgzHU0ELHFVwIIaVbtZKBathDeA5gPgWpyvjiMuBDlIFNDP_ai4ni3clBIdVWIAQkiSZ0tSGHFZFD90h5ZkDng2G-3L19Z46Hzq_aH1KW2I2bIhco7DJp52OCLBilEuG__0ZHPO6Gm0zWi6E6ZxdMRGq-VmeTY0WaV4USyb6cLei7DcBW5_dSrhCrRoaDbnnxz8QvbMH5iN_a2av9gr11HFIcRaaBZr-htE9grUi6RxlLC9uVmhyJqY_km8coKVNfG3gZYUBUIsyBSM97JNmd94CpqJeERRosQUHRvXPkTfWRI8oins4SubxylLe9AObIKTrooPUFNqqQK4qAAJmTicGj5mns2sMlRN1YfbAS7QN6Ug0ZeM1IQzpDylnU4RyleSM2ZjOHRZqlDEChGRPebWVyOaOOz6COxaz4EWybiTwuy1OLri4x2Enws6IDZxNO0SnsP1V85_ZmXVGpF-qCRB3sl7sBeOjqMQU_9gTYbQztk0BOduD5BCaBz_yY3cDz0s-CUfIqalEr5wYRPy-9na7oyUF_5oFc0QPu3TOuX_fDzA5VRdBTbuVCB_gBiOACxxoYw7CfKRamA08Ghi92llpT_d-yPWI2TmgmPOVYgJUSuP9HHkiR0LoR3TUAwHxp38xiB24t9WAHjiGJUduVHm5ZxQNg--kvIYHFngiEgXLFHPmB0LZyLZI6Z4iOsQB1KZe-yIN03migOI1ARHUa0zVMwSrS_IMydndPojdDeJuBXzzE11XTgMzyXm0j9XfvRymbaUKgUnniw8E55CA0SoE4QnoJNv285e1uU400Sp8A020RVCVLyKA5E4adszSOdnGzNCvODAYhobmbYaPKuZXJk_uvwQ15Bq-yhgm5VjHYpOdWqnOMpd1U55A7DDrPTX3gE1OrIiO2HfZlJDVCHa2c_mmyVuNGNkMk5JqEXFpmPkbmlqRhV_3HlcOmzDMK-DmwdF0IJIvTA2zRP7nD0eRTbHeHP8DraBKsKkd2cmrMNbzQXAZsUOv5QtDO4hIzFbenoCIK6240DbI8qxIJn1jnoWJC6kVZ7m08aJInQqmErEAeKq3qh8hG7fv2afxfsGQeTyis2hY8bAOSu7eiSa-rnT8XICjfOA9UK4L-fBZyM9S9YqraxtflEVTP1WuXkrfJCqMKXDXeFh7t8c9mN-xpyhYlVpJaMDkee4ZhftpbXtw0tc5kkvPapqU7Jna8aEMby_QfoNFa78RLA3GYPZwsrkdgRMF2hVw0f8_xLgMgvJaXl6JOxCb_bOS6wps_X7Px-Zo9RowHUNBEZMW5bR2mtUUL-jdZ1zMLF2IIDRi2l1F6tfW0fQOt4Ya7Gpby1yPXlpMSg2VdVGBkKYY6pwJRySCCoyoLQ9QVVyK7QJGp_20vK13nVknZUvGxYQvZibhyd7-d6jX2mzrRdC68XCCSNCvmhSShnYGOt4_yYSAEPxXtH5V0nU8TP0jMR-WqDXIAXZNomypCmB3SAuU7Bqtb724fiOzS9nQa1lFVHaCX02gAKcvlsangmHdtAmr6ApOkeiqZJsamvt7f8cL2ffGwi3wv5BELvTLPoRBTXKjyod5hvgTMNbkWXy-bQtnoFbzicfPkFkhE-sj6JfXLF7eWzNGLDbTk_DpqF6sPxxFbEKrMXm4dsHx_MkVWCQ9wre7cKL_2fyP81U1n7aY7sdRJ5BYZMvAYnTwlyInC9_Mb44wBEIB5ZtLBdACw0HE0xRNrZAnxJxYJg_xLIWjwipDmWu6fsrh2uoQp-P-oVQxypHwHmq_9egqQvYOBDxxbjoQZFLTOA-bSxgCK8_ijt03ugu1F2AxbY15hf-wsW6BZ9aASj3jrhQ8H5DyCHBgeVEE4rQwRQIvFNKyap9TI1JgWu1Nbz-Z_2-l1_MQHlMqnMsyQyzkoiL6dcNzrdSefOUkhjeZWxmiM6OfsiasHKs2CBzlFd22ok7RWEVf20kJDkxOJdnkr9WmrnnabCOVwZi3tna87sM8C92bYQRTvGCVt3Kp3MPZTKwSHY9pAYFg8gKaasu5kNIx3_VjkaaD-ykamQAxcDjB0rJSVpW8yMh2svjF1E7enpU-5LZraz2DzWWuEaTxq0OVi5YLnlPJ3xs356xhDvrHjPR9NVUyaeD7Bu_TqUA2dB4P0MET2U7ue7qWMZr-03er2733YNBDunOXXFXENMie7JcrtNSC6Hg7jYJXSa8Cza7QXv-LApdjsPYw-CeNMaXRYhwxVsE5UbgBCouIpnAH7TwHUVYyM1kZrhrC-rZakxtZS63qQ4ZdJc05Lt1KXhqZANMyFs0Z3ttNw2WQ7pO_LhGmIfb0aTJKFzqwHyBLE5emwI4ylO4TeJ2XBCYRtgeq0bQvjVdj-n8JODSjaNj7cQbAMgxqMDPADmCo5QOXEX5tY0vTEPghP1Wz97IdsQFh9VO-QDksUqc4DgqzB1gIhav9A638_IgqMraYHk1OQ4bLiPd9Eiko2G_A3HT52JRQqhSAbO4B-DqNSyv1mE6hI7-Z71C5G1NddPIxLphd4c6yoLV7aGvwhmjlhICPiU9Pc27NVOerIirrFzHpSxad6RGfXYB5_vtxB8kHkMe4JD8xHdmqhG2FTsGIQ153lW7OWxmTR22iXXw-RCLnO6GCx-2GUVKhIOc4y90IeW3NWjWxUom4rCbXtpHV1UxOdAgSqo7ho2zEJyhF2FewcdPTCCmeGwPhGJETGgit5opITn_x7GeRjlZmSMR6oMaBJ9c4oWPrrpBTeIlaanNczUPq7djZU5HfS2WLFP335AE9ihIlT0OejdRmi7AfxVX30fn8-jIezZcNRE2dU2bYl66LcnKapOWeMg3VR6kOops_IopR_WEe51lFX4Rgc06Qxsh5VcBh4BHgNluw7Di7TqsAxCOYZHMtll1AdnsK4T0u6-SXDUVEFjG6Fn1HC-46sjeFSCn2Ec9fXXbC3BjT3dq9JAWv6wrwKqv82LNkTUen3PYeC2Ctuz51DkWZHfVB1Mzmfid-peT1dDrNx66BMODgzU4RGusev325DxTJZeGrd1NmfXvvGWjQRTB3RNKD-lcC9T4Zu8LrGWc2XTppIsCmRmFgamlumaAbQlDW34ae2a1ZiuZrfhEJMf0r2wtaAArVAYQ7X3wG8uZukvw9TQyX9gN01Xh4gABZhWJBTdUb40EtdwW7SdBZSWZJ_lNMHA1D3xGCzW3A74fC4h5z3wTK8ahKjyIAk8_slPbeBq-lF_1pxxMw7hbVziQH8ySeQ3STkXhqqy_g9dJWZBUa4-z6DDD7JRyLCB3dLpET8M00v-qPAc2fSPwEMNLkEXJQnFU5YxE88dZ48cs8JiRfLwRBuPv8dMwh9iS8JWwjYeklTxAsyMINjhU2XfXBQhAH1rMGziy9Kd7WSdVUMfIGKJuv74zjxyhrvJmtIFnO5rIWZkWYW5Mtt6yzg0TgpbMVEBsXD0ky-UMY_NVPuTT2VnRXOCgGMt7AjvjKotVDNYvEx95tHvbJCjz8n7RheH22V3N23lAypAENO60cedf6TY-MF7bca2_BZucw_D5vTpwlk9oBg-eFm9Y8U9DaH12SHcRZWsxkJsDmdI3J5Y1ywZ_Silq5MxPGK1vcHdk0fCIS-VTQkdYHweiwlPdd_RjHg_B3sCcvZZM96n2L4945xP3NiNdrP3yPbaTmFOWZCvxetZ1wH5ECCw3iXW3nZk2E0Twvr3LRCW8MHGhVGVCx4-LoZ-Auw-KYC7JGdcV57w7BAnwJ3SyWBBVSpT35BCoFAMyjIW1x8jdE9BNY1Mcd3o95GSX6wcK_10AezVD6PbOwBGd-khxQqjkRK31XknwB01lLiJZf3Y0ljRFvYGcRKROGcCsWAVUcADZ91DydTViYhMgY_z1cZUBwis6ToipkjB8O4uLpncnqyd-yGrTWo3ReJc4hiQGOtRyYRq9Ag-uWjAaQxo8qOzlMeXeJ7734UqJcDr7jicfoGqN2FxXD8by48jMrttLzsys0chFo6wODAjv9WQKe4NkMDCRoflg990m7A7sywremnYOQnZsM-dEh9ksLMxuSpimxtnd4oHGlzaCyYNeaIw5eLRmt6GJg0SJkDoRlzx_-v67c8cS-Komhy9kci5cN257LHSvSYdpC12Bag4ZWD4Ubadcq8d8xKx7Q_vjaHKafQmFMfNmxUx2-y51ORGvqNtKXBLxy6fX3RmEvKnZtnm7b2Gb_V7svf7t0lyL9NSdg6b5_bHonInvXT0zIX9TiHeGdxfudPJjY9qfW1Zdv09p6HxR-EbG5dznkn526zxu16M8Dzybq7os5T-tjs9a5bNr7m2rHX3O45PfCTz2M2183WRrf-tnzUPXNkJ9oWLLUINbvUu8S1Crlkp8hRbUinKCBFO966v3zJMloxhZ-1TNLD7NpRXKpp12PQkNDKsNNKJTt-ilXUOVaKFUNVp97rd5bzjj3tjbyw66tzCuM56a5IZVf6IBtyTs8OwN54Da2HjoUNAE0c7HZLk6YZOUMNjJjKlNG8r7a9K-8x53WCNxQ3h6mP6pgD03S-l24CqqdZu3kY6YcvIBnOiionxVbOit9jvpdSdUzWyXsyQg3RW2F7bEpx6cEhTUk3DWyjRmXoX1_3X_38on9z-UzkUnvv6f43syLOqvVzSnfBOYnKt93I7d1D9_MG_cqpF-HRrAPXglmTv6ANqmpOORURCnUwN0VTkoOboV6YABrYe-KwZUA1jv3VPfkXWnvaP7cXuqKkmCi3g1C7MfVSsvrAvJH5NpiVFOPD5aDsSHNsORo2ZrjHfXfTdkB9H4fCGEAQuIyQJUnj5RqltGuu4rLv5s_yUXPv7hTtaXGkbhqXFn9Y0PM0Q-hseVl0zBbyf4gmnxfX-zk_n8Ugn_kEzatpqeMDhWCtB1xxy5M_9tnPw9iAmuRCS5k3BesVSfHV3SQtP7qR30IE2uLp-7LJ4ClnKh8UBPpouA6Y0aGKmZYxcdSg8nV513vLrsOSh7VH4UFu3P_46dxa5XRdQeZq89B9UECyovLpfXvmt8FSJr3jooBsEasRq7Fh91bgqDmqflleLNgk2NRGZlP20T-WdXPAfnvG3GlG_-1D2fODT3MNFXPROZvDkvbp97ZOw_FI__dPE8IkLXSU_NnWCC_bNP8314LlkfkGYj-4j31A8x8VzaY_y6dyc0P21-U_hK_gqbFb9m1CkhBelx8_tn7K1CjE5UyX3Z3_VOIy_LPGi8jP_ea21SfaSo58jPVhmIeUc6wst5--P-2B70-cfFO3H5BdVkij2LW4orQTRdVDG514451QrRjfKpEvXAWGjD0FYEj_zkSyydzhxk_lR77kL3-L8CzsMUxTO0OWjZeYKkEVWkko-hqaq_ML5h26It1P6aqoTe6_1VjF2OCtLtYuKdSSK1V8UakD0metT0ae1VpHVwUSqfuuRLuozZzL40v89TsMZLp65113kjZmZQ87NyqWb1jxeo7RlfKLJpJN2dsVvJxsA-mzMy6tCc77VsbaEt19aJI2_PuZhZd3U0lXSjx0VZEFNpCD9nJZqzswKAjNz41Yrbgar-AwN5l20rZm_LanCRoeTMkJz7y-GiTtL93szNHNzcffyTRkfb-wRghVzkzobZwt0MIzPtg33YSjy3YJfiXjYTtqkIbqiIqVca3GflkZSygSq5T9wZ2MKOXMcirykRgrPBhCOxDBwqCnMcj3VUzyAzhFrDgJxugnJAknmZPVbXTx_BdDhBoicw9aVjsQt6f4tyqw-aLBw_40BHEgSJPjAphzEQoxfd8i4I-MDMr1BQ_MyOhVS7XzkRKEef0IjimwTI31hld2vwUv7SXw6v24T6DSslsEI19LQ6BWuM0hqHO2enP0VRW_w1x2X9Ap5NOaYW3AlCMaSxnQeseLWIDmirb65NBK-eGtlZUE6C9Kgl9wNtfEVOnn9fm2BWCxbO7nopuWZkX1hDfxdGwXyM54wTVEodWYOAyA4tFnnQfO-j29Ml4A0WfxMGPUcZ4_WKseS20sGfBRqV5nKQ6PIlSMWGdioxpiur9XqTTHk2_7wteqEk361fNm--tlU26QHnuU6XtTOxAho3Ngrhko8wDqnMuFrHyylCWnVvuDz7ouanXgbrKfHKjLAhQ2SzL6k5SJAch2KM8dMloXkCR0agjXe2VDq2dU-SMXcO5azCASq4oqfMyAGFp4XrAWQiR4AA04xUFyptfh662aWi8B49Ecu7B4kQ9FK3YVDCujx9BqUyuhcWwM6t2Aq4SSMeE7GWgo1p78oQU9nWkcdmXTrhX1A5aJxEEOVhXBK0yYevF04r_EcOeAzWJVCYt_ZDGCKtANSAztrBstdEVZ3NESW20sdqTjNPhUDmslDB-o1626SGT3N3Tt9DEjWrYZ_zYDQEyeTHnPrrErdu9fqQmbSl9fU8FgioZxmp1J0xWyLlseFIaCRjdohfeeKGz4uK2YL1_LaHrI_5Qca92WfcG2SUd-hP27bSg5ZezjChGNPANwuuSr61Kc_qtDf_aSPC-byBjwQ9cAWFRJ8unb37NVBRqI5HVvp4NpQFjXU2vReP1qKjAM56yX51A6_Ric3C7CA6mZdFuKIjlluz5Aiuf9WhY1uiMcCVHZhVgbZWNkXeHq4BqGH-6nFegV51zcjQuBFcINsG2Y2tVJ6GCyzd7MyaKGzzkrdSDFgUVfU7676ZnBNHjt45kPV9jt-09iXVdLYMx_pVL0GliUrqfpqG8RYtK0YLrnnW35Uf9awINpmW0MjhEnjYmRJVxzWqGozkJEZlXHpq3N0c-ReGKzlt5rCA-6GZbCaZ5rxTaTiw0avUTMN3Yu930JyuOKRlJfbqj3hhrbMKjEV6CHC7E_Azr0Dnb9sCl78RAyZwN6BYHMU0JfgQgdcfVyPWmXPKOBDxLptEOleqWU9rWR9ER3S-hAgRY6Z9FY6miw6kXwqWnAbJT6tsXOZ37yDVeG2MiVRqKSUTD8ls68sWsjehacrdvNbUFUcTIJMigsOuQSNBNhYSrhamD_FaMbYelLD7ySPA8RQT1P9I6Dgr0iLY0EDTikWNu603xGB3TTZWHuYdSUsGnR9CzojLlKpGj53ild9FvAOdfdKPEqmKxTEEQUh8CzFjZG426PBc8vCbQtt2htl_ZgMXZx5RBIVAuwyEc1M-iaHCWvhgD2PxGL8HlCIiUcczstnO4fPYIjJ-CtYlhDuTloe7UJIVpsnAMg-i1-o-wXO_9WprUhqo7ZtRU1N4SOKnGR27-jZYLmY55jDCRgZhhaZEINl040KAUH-5FltQJqC7EgSgKf5Nzodk9x97ZHXIllxlW-zWe79LfyAqlsHpSbz24R0_gc8lEOek01YFMfUi5B0_4JVZgdkSSZZOQINOJmYnmT8BQ_33T0lM_Uq0wAmKsjZjV-YCyNEkTm12hk5qPG1vJfWNoqypMfgMAIW8IMYdmX3CgkLRbklr4qatl2cBL25Bw-7RQgxMzwfm1E8OnJyH6-jvXYaoUk_SBUeV0b1aP-neVSuIIKYqgQyXu2alPZtDdfSN-HWMOR9HiUKiwQtRK87zJfCY9eYafmlabM0czfbkNqTtqguw-bjwLfXlXfyNyvD91Jydbs4NfKBxKdI_4An1xdtHqGQhi_MFED5nD6h2z6sjD8fAQIXc7tdIjqKnKBNv6Wy4-ZiWVIUSsLUuSQgP2MG94Uo2Y1oNEjAgf7tJluPy2CFc5t1tFmY-nQBVzzvvsxUbclVdrj4DHwlVKfE7oVfQSv8nAgbYuUaiUlpD3InEzhCFuaj0VTxUSwhapjMAfJoyt5hjREINBIhfdvNRayulPIKHPvliasFcTZrYViRElhNA99cneVBRyeQTjAbR0XSHus9VZzBgXPSrInoHb-HRgPRUkgOh_KopYqxb94bahbOi1hxlMBmQ-IjoI0cqx4Ld2wpORVVUEa5qj7gc6XQ0v1acCGxiac_SBTNj-glaCS_xjZpAMLMbMUjPs1bE5TAYOq-YlThpE-cNtneOAtWP9UIh32YoaGzCDGNJP4O9grxiwhA5J64Xdxr0kooVcwjhzJOm8J8Y7N1lXa_YbGPFfPlQAl_UCggJOUJOlyxaaxT48R61tuBve04kHTGKQCzy74rJEC7KaHf2RvEtbez6KHpDmiJ8UIbd-zQ9XHk4cFW-3YnRkRSY4Qc2Ef7ifEF5HyvydHT0zojFXX9ugiqbU3OlJjU1G6c3-pTLCd_UsPhZWQegANJdvj8Cz8U8i_6D0utLPvFG9Q6oq5TGFc9JZoyZQOt9lt4D2r8oxaQPqXTGl_bMZtyrBBp92skcn-XLUzL1wKsGVVWMH5rZxSi_YUBD1SruLr8PaC0Oiq72DepV6H0kgXMnrYJvtybZ-FM-OA95irMsRwMCiJ4PZBVx7_WbHcr3CBwHWwRXqQdYLOo3mhXrfIQMEv-w4n4S0a_6RmwKwwgkWRDyEXoDG8gul8YJDiJF_53aRM8V-Hv3ocvu3p9y92sQT1y90LJeA_QSNVD9WNctMxb4WcB_Q-lSA6Dc7zefeby97QubsDBNIEgQ3NfFr3_bRJzsPepSsBMum-cTV404O55qY4aQDy5mysdtPGLgDpgV02lLcby_kbpJAQwE3boRIg6FGTVV_pWOGqH4f8r1Z4QwfZ2etMrd8BXrVE7ksb0rNPMKkmMaO5OqbZIz7i-FB5tK1xtPbnwpUlejGt0iFPVhAqNcSwPNtr1AO63cY2FDW8YcumKFMC_EqnHIgegtmVzVo93aINiYFJpMqJbgs9JWHkbf2ExKyuFiZruR12ROmZSRHCFE5ugmTjKlrhqt8CDBDDqaGOx38dBfUHR-ysQBw1JdIpNxReE31adFtk1OR-SwGNVj86AINfdhH-pM0SH_OGZixmPFl1klfMnIOx9DiQSiA2DhGRVzLrU6R6xfAAVkIan72cF81e9whniGoLeVUz6SNQmm3AjalM6_eEgn5qWFJj12RITk0sZDQBuCHMIxPNYSfsB_Q5zebMoUv6-5Hio5ch8_qwqk56U2k7qNViCMG7XY55zKu-qHPKMiuV5rfL7Ws3ysF39hqdyyqrJ_CxUqraFI5zAPtSUMTr5lBbrwj_VB8vZdNRYuyE0wssKSknCRezt1aPGv8p2dzKxfBJ9BWwZQpfEn5u30E1qhZ3O7qhClKJabnqWgDUkaGp4JnI5tREVFMqHJJfkIZF6kDCMpCkPKQuoXHBmDcHdOcSSxu7er-Ez27aiODBZnTa34rjWSSgu5T-ehIXezOzdTAJbxDx9yuh0oBJxJkUQINOg1FtdwsSUbe11e29k0l7OQr9fgnxVsJvchW-jAkFYkF9cNgdchovF7YyD7zOPd5ytalnergm9tfAU2WNYiYC1DSknI7RjPo8OsF6wNQyVoMQ8Apvia08KXnBB6YoUDNfa1Lof-NMlvGhdVyz0rwwecf4dRU6JsgfiDuQ4ewM55ENEQ1hY0ByJQyU9zelpinTSTFu1y7Kpl-sRE1WJHw2KE0tpSh-wZ6ImyHmA2sSKHNWEx8Qaz8mGR2m1g1yEogH8Li3XwzbzwMSGpDkBl9Jv7NKiysQ6DFl68XnN0PitaX5GnEanWmVeuzUqAYVYCujqcnE3KWiQFyfKBtlUD7DYx7H_t2dtjzNZwS4"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,x,A,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>ex(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:eA(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eA=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eC=(e,r,t)=>e[0]===r&&e[e.length-1]===t,e_=e=>eh(e)&&(eC(e,\"{\",\"}\")||eC(e,\"[\",\"]\")),e$=!1,eM=e=>(e$=!0,e),eU=e=>null==e?Z:ex(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e$){e$=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e$){e$=!1;break}}}(e,eF(r,t,n)):eP(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e$;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e$=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eH=(e,r,...t)=>null==e?Z:eA(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e$)){e$=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e$)){e$=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e$){e$=!1;break}return t})(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e2=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eP(e,(e,t)=>r(e,t)?e:Z,n,l)),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eX(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&eM(!0):()=>eM(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,ex(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>ex(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rT).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rE,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rE{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var r$,rx=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},r_=(e,r,t)=>null==e?Z:em(r)?null==(r=r[0])?Z:r+\" \"+r_(e,r,t):null==r?Z:1===r?e:null!=t?t:e+\"s\",rM=(e,r,t)=>t?(r$&&rh(t,\"\u001b[\",r,\"m\"),em(e)?rh(t,...e):rh(t,e),r$&&rh(t,\"\u001b[m\"),t):rM(e,r,[]).join(\"\"),rF=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rq=(e,r,t)=>null==e?Z:ex(r)?rC(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rC(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rR=e=>(e=Math.log2(e))===(0|e),rz=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rR(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rR(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rD=(...e)=>{var r=(e=>!em(e)&&eA(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rW=Symbol(),rJ=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?eM(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rB=(e,r=!0,t)=>null==e?Z:rH(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rV(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rV=(e,r,t=!0)=>rL(e,\"&\",r,t),rL=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rJ(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rW]=o),e},rH=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rH(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rX=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rY=/\\z./g,rZ=(e,r)=>(r=rq((e=>null!=e?new Set([...ez(e,void 0,void 0,void 0)]):Z)(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rY,rQ={},r0=e=>e instanceof RegExp,r1=(t,n=[\",\",\" \"])=>{var l;return r0(t)?t:em(t)?rZ(eW(t,e=>{return null==(e=r1(e,n))?void 0:e.source})):eu(t)?t?/./g:rY:eh(t)?null!=(l=(e=rQ)[r=t])?l:e[r]=rH(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rZ(eW(r2(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rq(n,rX)}]`)),e=>e&&`^${rq(r2(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rX(r4(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},r2=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r4=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r6=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r5=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rz(l,!1,\"data classification\")),r3=(e,r)=>{var t;return r5.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r5.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r9.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r9.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r8=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r5.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r9.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r9=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rz(i,!0,\"data purpose\",2111)),j=rz(i,!1,\"data purpose\",0),te=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),tr=e=>!(null==e||!e.patchTargetId),tt=((_=o={})[_.Global=0]=\"Global\",_[_.Entity=1]=\"Entity\",_[_.Session=2]=\"Session\",_[_.Device=3]=\"Device\",rz(o,!(_[_.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:tt,purpose:j,purposes:r9,classification:r5}),ti=(rD(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),ta=((j=_={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rz(_,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(_=s=s||{})[_.Success=200]=\"Success\",_[_.Created=201]=\"Created\",_[_.Unchanged=304]=\"Unchanged\",_[_.Denied=403]=\"Denied\",_[_.NotFound=404]=\"NotFound\",_[_.ReadOnly=405]=\"ReadOnly\",_[_.Conflict=409]=\"Conflict\",_[_.Unsupported=501]=\"Unsupported\",_[_.Invalid=400]=\"Invalid\",_[_.Error=500]=\"Error\",rz(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=tv)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,tu)),values:e(e=>eW(e,e=>{return null==(e=tu(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eW((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=tu(e[0]))?void 0:e.value}),variable:e(e=>tu(e[0])),result:e(e=>e[0])};return o}),tu=e=>{var r;return ts(e)?null!=(r=e.current)?r:e:Z},ts=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),tv=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${tt.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},tc=e=>e&&\"string\"==typeof e.type,tf=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tp=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,th=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tg=(e,r=\"\",t=new Map)=>{if(e)return eA(e)?eY(e,e=>tg(e,r,t)):eh(e)?rH(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tp(n)+\"::\":\"\")+r+tp(l),value:tp(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),th(t,l)}):th(t,e),t},tm=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rz(c,!1,\"local variable scope\")),tb=e=>{var r;return null!=(r=tm.format(e))?r:tt.format(e)},tw=e=>!!tm.tryParse(null==e?void 0:e.scope),tk=rD({scope:tm},o),tS=e=>{return null==e?void 0:eh(e)?e:e.source?tS(e.source):`${(e=>{var r;return null!=(r=tm.tryParse(e))?r:tt(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tT=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tI=()=>()=>W(\"Not initialized.\"),tx=window,tA=document,tN=tA.body,tj=((e=>r$=e)(!!tx.chrome),Q),tC=(e,r,t=(e,r)=>tj<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tA&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},t_=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nN(e),et);case\"e\":return L(()=>null==nj?void 0:nj(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:t_(e,r[0])):void 0}},t$=(e,r,t)=>t_(null==e?void 0:e.getAttribute(r),t),tM=(e,r,t)=>tC(e,(e,n)=>n(t$(e,r,t))),tU=(e,r)=>{return null==(e=t$(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},tq=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tP=e=>null!=e?e.tagName:null,tz=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tD=(e,r)=>r4(e,/#.*$/,\"\")===r4(r,/#.*$/,\"\"),tW=(e,r,t=er)=>(p=tJ(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tN.offsetWidth,4),y:ej(p.y/tN.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tJ=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tB(e),{x:h,y:g}):void 0,tB=e=>e?(m=e.getBoundingClientRect(),f=tz(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tV=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tK=()=>({...f=tz(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tN.offsetWidth,totalHeight:tN.offsetHeight}),tG=new WeakMap,tH=e=>tG.get(e),tX=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tY=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&eM(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tg(l,r4(n,/\\-/g,\":\"),t),i)}),tZ=()=>{},tQ=(e,r)=>{if(w===(w=t3.tags))return tZ(e,r);var t=e=>e?r0(e)?[[e]]:eA(e)?eB(e,t):[eT(e)?[r1(e.match),e.selector,e.prefix]:[r1(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eW(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tZ=(e,r)=>tY(e,n,r))(e,r)},t0=(e,r)=>rq(eV(tq(e,tX(r,er)),tq(e,tX(\"base-\"+r,er))),\" \"),t1={},t2=(e,r,t=t0(e,\"attributes\"))=>{var n;t&&tY(e,null!=(n=t1[t])?n:t1[t]=[{},(e=>rH(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[r1(t||n),,r],!0))(t)],r),tg(t0(e,\"tags\"),void 0,r)},t4=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tC(e,(e,t)=>t(t4(e,r,ee)),ex(t)?t:void 0):rq(eV(t$(e,tX(r)),tq(e,tX(r,er))),\" \"))?t:n&&(k=tH(e))&&n(k))?t:null},t6=(e,r,t=ee,n)=>\"\"===(S=t4(e,r,t,n))||(null==S?S:es(S)),t5=(e,r,t,n)=>e&&(null==n&&(n=new Map),t2(e,n),tC(e,e=>{tQ(e,n),tg(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t3={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t8=[],t9=[],t7=(e,r=0)=>e.charCodeAt(r),nr=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t8[t9[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t9[(16515072&r)>>18],t9[(258048&r)>>12],t9[(4032&r)>>6],t9[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nn={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nl=(e=256)=>e*Math.random()|0,na={exports:{}},{deserialize:no,serialize:nu}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};na.exports=n})(),(_=na.exports)&&_.__esModule&&Object.prototype.hasOwnProperty.call(_,\"default\")?_.default:_),ns=\"$ref\",nv=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,nd=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=nv(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[ns]||(e[ns]=a,u(()=>delete e[ns])),{[ns]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eA(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?nu(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nc=e=>{var r,t,n=e=>ew(e)?e[ns]&&(t=(null!=r?r:r=[])[e[ns]])?t:(e[ns]&&delete(r[e[ns]]=e)[ns],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>no(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nf=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nd(e,!1,n))):nd(e,!0,n),t),i=e=>null==e?Z:L(()=>nc(e),Z);return r?[e=>nd(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nl()));for(t=0,i[n++]=g(d^16*nl(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nl();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=nn[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:nr)(a(nd(e,!0,n))),e=>null!=e?nc(o(e instanceof Uint8Array?e:(t&&e_(e)?i:e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t8[t7(e,t++)]<<2|(r=t8[t7(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t8[t7(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t8[t7(e,t++)]);return i})(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[np,,]=(nf(),nf(null,{json:!0,decodeJson:!0}),nf(null,{json:!0,prettify:!0})),j=r2(\"\"+tA.currentScript.src,\"#\"),rz=r2(\"\"+(j[1]||\"\"),\";\"),ny=j[0],nb=rz[1]||(null==(rD=rB(ny,!1))?void 0:rD.host),nw=e=>{return!(!nb||(null==(e=rB(e,!1))||null==(e=e.host)?void 0:e.endsWith(nb))!==er)},o=(...e)=>r4(rq(e),/(^(?=\\?))|(^\\.(?=\\/))/,ny.split(\"?\")[0]),nS=o(\"?\",\"var\"),nT=o(\"?\",\"mnt\"),nE=(o(\"?\",\"usr\"),Symbol()),nI=Symbol(),nx=(e,r,t=er,n=ee)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rM(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nI];null!=(e=t?e[nE]:e)&&console.log(ew(e)?rM(np(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nx(e,r,t,!0)),r&&console.groupEnd()},[nA,nN]=nf(),[nO,nj]=[tI,tI],nC=!0,[_,n$]=ea(),nF=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nq,nP]=ea(),[nR,nz]=ea(),nD=e=>nJ!==(nJ=e)&&nP(nJ=!1,nL(!0,!0)),nW=e=>nB!==(nB=!!e&&\"visible\"===document.visibilityState)&&nz(nB,!e,nV(!0,!0)),nJ=(nq(nW),!0),nB=!1,nV=rb(!1),nL=rb(!1),nK=(tV(window,[\"pagehide\",\"freeze\"],()=>nD(!1)),tV(window,[\"pageshow\",\"resume\"],()=>nD(!0)),tV(document,\"visibilitychange\",()=>(nW(!0),nB&&nD(!0))),nP(nJ,nL(!0,!0)),!1),nG=rb(!1),[,nX]=ea(),nY=rk({callback:()=>nK&&nX(nK=!1,nG(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nK&&(nX(nK=!0,nG(!0)),nY.restart()),nQ=(tV(window,[\"focus\",\"scroll\"],j),tV(window,\"blur\",()=>nY.trigger()),tV(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nG()),n0=0,n1=void 0,n2=()=>(null!=n1?n1:tI())+\"_\"+n4(),n4=()=>(ry(!0)-(parseInt(n1.slice(0,-2),36)||0)).toString(36)+\"_\"+(++n0).toString(36),n3={},n8={id:n1,heartbeat:ry()},n9={knownTabs:{[n1]:n8},variables:{}},[n7,le]=ea(),[lr,lt]=ea(),ln=tI,ll=e=>n3[tS(e)],li=(...e)=>lo(e.map(e=>(e.cache=[ry(),3e3],tk(e)))),la=e=>eW(e,e=>e&&[e,n3[tS(e)]]),lo=e=>{var r=eW(e,e=>e&&[tS(e),e]);null!=r&&r.length&&(e=la(e),ri(n3,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n9.variables,r),ln({type:\"patch\",payload:e0(r)})),lt(e,n3,!0))},[,ls]=(_((e,r)=>{nq(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),n1=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n3=e0(eV(e2(n3,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tS(e),e])))):sessionStorage.setItem(\"_tail:state\",e([n1,eW(n3,([,e])=>e.scope!==c.View?e:void 0)]))},!0),ln=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([n1,r,t])),localStorage.removeItem(\"_tail:state\"))},tV(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==n1||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||ln({type:\"set\",payload:n9},e):\"set\"===i&&t.active?(ri(n9,a),ri(n3,a.variables),t.trigger()):\"patch\"===i?(o=la(eW(a,1)),ri(n9.variables,a),ri(n3,a),lt(o,n3,!1)):\"tab\"===i&&(ri(n9.knownTabs,e,a),a)&&le(\"tab\",a,!1))});var t=rk(()=>le(\"ready\",n9,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n9?void 0:n9.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n9.knownTabs,[r])),n8.heartbeat=ry(),ln({type:\"tab\",payload:n8})},frequency:5e3,paused:!0});nq(e=>(e=>{ln({type:\"tab\",payload:e?n8:void 0}),e?(t.restart(),ln({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[lv,ld]=ea(),lc=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nj:nN)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nO:nA)([n1,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===n1))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rE,[v]=tV(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rx(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),lf=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nC;var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(ls(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nO(l,!0):JSON.stringify(l))};if(!t)return lc(()=>(async r=>{var l,i;for(i of ez(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),e$){e$=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?eM(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rx(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nj:JSON.parse)?void 0:a(r):Z)&&ld(a),eM(a)):eM()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rz=[\"scope\",\"key\",\"targetId\",\"version\"],lh=[...rz,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lg=[...rz,\"init\",\"purpose\",\"refresh\"],lm=[...lh,\"value\",\"force\",\"patch\"],ly=new Map,lb=(e,r)=>{var t=rk(async()=>{var e=eW(ly,([e,r])=>({...tT(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ly,e,()=>new Set).add(r)),o=(nq((e,r)=>t.toggle(e,e&&3e3<=r),!0),lr(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tS(e),null==(i=rv(ly,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await lf(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tS(e),i=(n(l,e.result),ll(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tw(e))return[rc(e,lg),r];eT(e.init)&&null!=(t={...tk(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r9.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&lo(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tS(e),a=ll(n),u(n,e.cache),tw(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tm(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lm),r])}),a=c.length?V(null==(a=(await lf(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&lo(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>{return{...rc(e,lh),cache:[r,r+(null!=(r=rv(o,tS(e)))?r:3e3)]}};return lv(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>tu(e)),eW(e.set,e=>tu(e)))))&&e.length&&lo(eH(e,d,r))}),v},lk=Symbol(),lS=[.75,.33],lT=[.25,.33],lx=()=>{var l,a,i,t=null==tx?void 0:tx.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tx.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tx.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lA=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==x?void 0:x.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lx()})),lN=(e,r=\"A\"===tP(e)&&t$(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lO=(e,r=tP(e),t=t6(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tU(e,\"type\"),\"button\",\"submit\")||t===er),lj=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rF((null==(t=t$(e,\"title\"))?void 0:t.trim())||(null==(t=t$(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tB(e):void 0}},l_=e=>{if(I)return I;eh(e)&&([t,e]=nN(e),e=nf(t,{decodeJson:!0})[1](e)),ri(t3,e),(e=>{nj===tI&&([nO,nj]=nf(e,{json:!e,prettify:!1}),nC=!!e,n$(nO,nj))})(rv(t3,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rv(t3,\"key\"),i=null!=(e=null==(t=tx[t3.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>nF(e,r))(n)))},s=[],d=lb(nS,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=n2()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),nx({[nI]:eW(t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(te(rp(e),!0),{timestamp:e.timestamp-ry()}))),e=>[e,e.type,ee])},\"Posting \"+rC([r_(\"new event\",[e4(t,e=>!tr(e))||void 0]),r_(\"event patch\",[e4(t,e=>tr(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),lf(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>nx(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nR((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nS,v),f=null,p=0,g=h=ee,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=e_(t)?JSON.parse(t):nN(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nN(e):e),e=>{if(!e)return ee;if(l9(e))t3.tags=ri({},t3.tags,e.tagAttributes);else{if(l7(e))return t3.disabled=e.disable,ee;if(it(e))return n=er,ee;if(is(e))return e(I),ee}return g||ii(e)||ir(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>ir(e)?-100:ii(e)?-50:iu(e)?-10:tc(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,tc(e))c.post(e);else if(il(e))d.get(...eb(e.get));else if(iu(e))d.set(...eb(e.set));else if(ii(e))rh(o,e.listener);else if(ir(e))(r=L(()=>e.extension.setup(I),r=>nF(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(is(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nF(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nF(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tx,t3.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+n2(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),lr((e,r,t)=>{var n=eV(null==(n=ti(eW(e,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee]),[[{[nI]:null==(n=ti(eW(r,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee])},\"All variables\",er]]);nx({[nI]:n},rM(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e4(r)} in total).`,\"2;3\"))}),n7(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):tv(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lA(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...eW(l6,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t3.name}\" is used for something else than an array of queued commands.`)},l$=()=>null==x?void 0:x.clientId,lM={scope:\"shared\",key:\"referrer\"},lU=(e,r)=>{I.variables.set({...lM,value:[l$(),e]}),r&&I.variables.get({scope:lM.scope,key:lM.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lF=rb(),lq=rb(),lP=1,[lz,lD]=ea(),lW=e=>{var r=rb(e,lF),t=rb(e,lq),n=rb(e,nQ),l=rb(e,()=>lP);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lJ=lW(),[lV,lL]=ea(),lK=(e,r)=>(r&&eY(lH,r=>e(r,()=>!1)),lV(e)),lG=new WeakSet,lH=document.getElementsByTagName(\"iframe\");function lY(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lQ=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),l0=e=>t5(e,r=>r!==e&&!!lQ(rt(tG,r)),e=>(rt(tG,e),(N=rt(tG,e))&&eB(eV(N.component,N.content,N),\"tags\"))),l1=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},l2=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tC(e,e=>{var s,i,l=rt(tG,e);l&&(lQ(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tB(e)||void 0,s=l0(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),l1({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t4(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,l1({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=rq(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:rq(l,\"/\")}:void 0},l4=Symbol(),l6=[{id:\"context\",setup(e){rk(()=>eY(lH,e=>ro(lG,e)&&lL(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==x||null==r||!r.value||null!=x&&x.definition?n=null==r?void 0:r.value:(x.definition=r.value,null!=(r=x.metadata)&&r.posted&&e.events.postPatch(x,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=ll({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=ll({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&li({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=ll({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=ll({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tD(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rB(location.href+\"\",!0),x={type:\"view\",timestamp:ry(),clientId:n2(),tab:n1,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tK(),duration:lJ(void 0,!0)},0===d&&(x.firstTab=er),0===d&&0===v&&(x.landingPage=er),li({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rV(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=x).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(x.navigationType=A)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{x.redirects=e.redirectCount,x.navigationType=r4(e.type,/\\_/g,\"-\")}),A=void 0,\"navigate\"===(null!=(r=x.navigationType)?r:x.navigationType=\"navigate\")&&(p=null==(l=ll(lM))?void 0:l.value)&&nw(document.referrer)&&(x.view=null==p?void 0:p[0],x.relatedEventId=null==p?void 0:p[1],e.variables.set({...lM,value:void 0})),(p=document.referrer||null)&&!nw(p)&&(x.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rB(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),x.definition=n,n=void 0,e.events.post(x),e.events.registerEventPatchSource(x,()=>({duration:lJ()})),lD(x))};return nR(e=>{e?(lq(er),++lP):lq(ee)}),tV(window,\"popstate\",()=>(A=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),A=\"navigate\",f()}}),f(),{processCommand:r=>l8(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!x||tf(e)||tr(e)||(e.view=x.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lk])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tA.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nQ),!1,!1,0,0,0,r6()];i[4]=r,i[5]=t,i[6]=n},y=[r6(),r6()],b=lW(!1),w=rb(!1,nQ),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,x=S/r.width||0,A=f?lT:lS,I=(A[0]*a<T||A[0]<I)&&(A[0]*t<S||A[0]<x);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t3.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t6(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tW(i),viewport:tK(),timeOffset:lJ(),impressions:h,...l2(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var C=tA.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,$=0;for(null==u&&(u=[]);$<d.length&&(M=C.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(_+=P;_>=(null==(F=d[$])?void 0:F.offset);)l[$%2?\"setEnd\":\"setStart\"](M,d[$].offset-_+P),$++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,$<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}A=r.left<0?-r.left:0,x=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(x,x+T)*y[1].push(A,A+S)/I),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lk]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tG,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tG,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>ie(e)?(n(e),er):io(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=t$(l,e);){ro(n,l);var a,o=r2(t$(l,e),\"|\");t$(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tV(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tC(n.target,e=>{lO(e)&&null==a&&(a=e),s=s||\"NAV\"===tP(e);var r,v=tH(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lO(r)&&(3<(null!=u?u:u=[]).length?eM():u.push({...lj(r,!0),component:tC(r,(e,r,t,n=null==(l=tH(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t6(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e7(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=t6(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e7(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=l2(null!=a?a:o,!1,d),f=t5(null!=a?a:o,void 0,e=>{return eW(eb(null==(e=rt(tG,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tW(a,n),viewport:tK()}:null,...((e,r)=>{var n;return tC(null!=e?e:r,e=>\"IMG\"===tP(e)||e===r?(n={element:lj(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lJ(),...f});if(a)if(lN(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rB(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:n2(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t$(h,\"target\")!==window.name?(lU(w.clientId),w.self=ee,e(w)):tD(location.href,h.href)||(w.exit=w.external,lU(w.clientId))):(k=h.href,(b=nw(k))?lU(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t3.captureContextMenu&&(h.href=nT+\"=\"+T+encodeURIComponent(k),tV(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tV(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tC(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tH(e))?void 0:t.cart)?t:t4(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tH(e))?void 0:t.content))&&r(v)});c=lY(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tJ(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lK(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tz(er);lz(()=>{return e=()=>(r={},t=tz(er)),setTimeout(e,250);var e}),tV(window,\"scroll\",()=>{var i,n=tz(),l={x:(f=tz(ee)).x/(tN.offsetWidth-window.innerWidth)||0,y:f.y/(tN.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l3(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lY(t))&&e({...t,type:\"cart_updated\"}),er):ia(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tM(e,tX(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rF(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tM(i,tX(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tM(i,tX(\"form-name\"))||t$(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lJ()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tV(i,\"submit\",()=>{l=l2(i),r[3]=3,s(()=>{(i.isConnected&&0<tB(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tB(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r4(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l4]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t6(e,\"ref\")||(e.value||(e.value=r4(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lq())),d=-(s-(s=ry(er))),c=l[l4],(l[l4]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tV(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lq()):o()));v(document),lK(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r3(t,r=r8(r))?[!1,t]:(t={level:r5.lookup(r.classification),purposes:r9.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tx.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{level:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,r,s,v;return iv(e)?((r=e.consent.get)&&n(r),(t=r8(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(r=i[v])?r:i[v]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e,t,n;tA.hasFocus()&&(e=a.poll())&&(e=r8({...s,...e}))&&!r3(s,e)&&([t,n]=await l(e),t&&nx(n,\"Consent was updated from \"+v),s=e)}).trigger()),er):ee}}}}],rD=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l3=rD(\"cart\"),l8=rD(\"username\"),l9=rD(\"tagAttributes\"),l7=rD(\"disable\"),ie=rD(\"boundary\"),ir=rD(\"extension\"),it=rD(er,\"flush\"),il=rD(\"get\"),ii=rD(\"listener\"),ia=rD(\"order\"),io=rD(\"scan\"),iu=rD(\"set\"),is=e=>\"function\"==typeof e,iv=rD(\"consent\");Object.defineProperty(tx,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(l_)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
    /** @internal */ async _validateSignInEvent(tracker, event) {
        if (tracker.trustedContext && !event.evidence) {
            return true;
        }
        for (const extension of this._extensions){
            if (extension.validateSignIn && await extension.validateSignIn(tracker, event)) {
                return true;
            }
        }
        return false;
    }
    /**
   * This method must be called once when all operations have finished on the tracker
   * returned from {@link processRequest} outside the main API route to get the cookies
   * for the response when the tracker has been used externally.
   */ getClientCookies(tracker) {
        if (!tracker) return [];
        tracker._persist(true);
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
    async processRequest(request, { matchAnyPath = false, trustedContext = false } = {}) {
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
                !this._config.json && (clientEncryptionKey = await this._clientIdGenerator.generateClientId(this.environment, request, true, this._config.clientEncryptionKeySeed));
            }
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
                clientId: await this._clientIdGenerator.generateClientId(this.environment, request, false, this._config.clientEncryptionKeySeed || ""),
                trustedContext,
                requestHandler: this,
                defaultConsent: this._defaultConsent,
                cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
                clientEncryptionKey,
                transport: this._config.json ? defaultJsonTransport : createTransport(clientEncryptionKey)
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
                        response.cookies = this.getClientCookies(resolvedTracker);
                    } else {
                        await resolvedTracker._persist(false);
                    }
                }
                if (isPlainObject(response.body)) {
                    var _response_headers1;
                    response.body = ((_response_headers1 = response.headers) === null || _response_headers1 === void 0 ? void 0 : _response_headers1["content-type"]) === "application/json" || json || this._config.json ? JSON.stringify(response.body) : (await trackerSettings()).transport[0](response.body, true);
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
            if (requestPath === this.endpoint || requestPath && matchAnyPath) {
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
                                        src: matchAnyPath ? requestPath : this._clientConfig.src,
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
                                    if (headers["content-type"] === "application/json" || isJsonString(body) || isJsonObject(body)) {
                                        if (!this._config.json && headers["sec-fetch-dest"]) {
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
    async _getClientScripts(tracker, html, initialCommands, nonce, endpoint) {
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
                src: `${endpoint !== null && endpoint !== void 0 ? endpoint : this.endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName ? `#${this._trackerName}` : ""}`,
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
        this._config = Object.freeze(config);
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
        this._clientConfig = Object.freeze({
            ...client,
            src: this.endpoint,
            json: this._config.json
        });
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
    signIn(signIn) {
        signIn.type = "sign_in";
        return this.post([
            signIn
        ]);
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
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, clientId, defaultConsent, trustedContext }){
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
        /**
   * Whether the tracker has been instantiated in a trusted context.
   * A trusted context is when the tracker's API is used for server-side tracker.
   *
   * Signing in without evidence is only possible in trusted contexts.
   *
   * Extensions may use this flag for additional functionality that is only available in server-side tracking context.
   */ _define_property$a(this, "trustedContext", void 0);
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
        this.trustedContext = !!trustedContext;
        // Defaults to unencrypted transport if nothing is specified.
        this._clientCipher = cipher !== null && cipher !== void 0 ? cipher : defaultTransport;
        this._clientId = clientId;
    }
}

const PLACEHOLDER_SCRIPT = (trackerName = "tail", quote)=>{
    var _globalThis, _trackerName;
    if (quote) {
        return `(window.${trackerName}??=c=>${trackerName}._?.push(c) ?? ${trackerName}(c))._=[];`;
    }
    var _;
    ((_ = (_globalThis = globalThis)[_trackerName = trackerName]) !== null && _ !== void 0 ? _ : _globalThis[_trackerName] = (c)=>{
        var _globalThis_trackerName__;
        var _globalThis_trackerName___push;
        return (_globalThis_trackerName___push = (_globalThis_trackerName__ = globalThis[trackerName]._) === null || _globalThis_trackerName__ === void 0 ? void 0 : _globalThis_trackerName__.push(c)) !== null && _globalThis_trackerName___push !== void 0 ? _globalThis_trackerName___push : globalThis[trackerName](c);
    })._ = [];
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
    json: false,
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
    } else if (!globalThis[name]) {
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

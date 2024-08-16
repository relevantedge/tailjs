import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "lzwo8gp3" ;
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
        text: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,E,A,x,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return eA(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>eA(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:ex(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eE=e=>\"symbol\"==typeof e,eA=e=>\"function\"==typeof e,ex=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eC=(e,r,t)=>e[0]===r&&e[e.length-1]===t,e$=e=>eh(e)&&(eC(e,\"{\",\"}\")||eC(e,\"[\",\"]\")),e_=!1,eM=e=>(e_=!0,e),eU=e=>null==e?Z:eA(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e_){e_=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e_){e_=!1;break}}}(e,eF(r,t,n)):eP(eA(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e_;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e_=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eH=(e,r,...t)=>null==e?Z:ex(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e_)){e_=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e_)){e_=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e_){e_=!1;break}return t})(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e2=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eP(e,(e,t)=>r(e,t)?e:Z,n,l)),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>eA(t)?t():t;return null!=(e=eX(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&eM(!0):()=>eM(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=eA(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,eA(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>eA(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=eA(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rT).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rI,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rI{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rA=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},r_=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rM=(e,r,t)=>null==e?Z:eA(r)?rC(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rC(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rF=e=>(e=Math.log2(e))===(0|e),rq=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rF(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rF(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:eA(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rP=(...e)=>{var r=(e=>!em(e)&&ex(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rR=Symbol(),rz=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?eM(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rD=(e,r=!0,t)=>null==e?Z:rL(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rW(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rW=(e,r,t=!0)=>rJ(e,\"&\",r,t),rJ=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rz(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rR]=o),e},rL=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rL(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rK=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rG=/\\z./g,rH=(e,r)=>(r=rM((e=>null!=e?new Set([...ez(e,void 0,void 0,void 0)]):Z)(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rG,rX={},rY=e=>e instanceof RegExp,rZ=(t,n=[\",\",\" \"])=>{var l;return rY(t)?t:em(t)?rH(eW(t,e=>{return null==(e=rZ(e,n))?void 0:e.source})):eu(t)?t?/./g:rG:eh(t)?null!=(l=(e=rX)[r=t])?l:e[r]=rL(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rH(eW(rQ(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rM(n,rK)}]`)),e=>e&&`^${rM(rQ(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rK(r0(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},rQ=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r0=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r1=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r2=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rq(l,!1,\"data classification\")),r4=(e,r)=>{var t;return r2.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r2.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r5.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r5.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r6=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r2.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r5.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r5=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rq(i,!0,\"data purpose\",2111)),j=rq(i,!1,\"data purpose\",0),r8=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r7=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rq(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:r7,purpose:j,purposes:r5,classification:r2}),tt=(rP(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tn=((j=$={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rq($,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rq(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=to)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,ti)),values:e(e=>eW(e,e=>{return null==(e=ti(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eW((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=ti(e[0]))?void 0:e.value}),variable:e(e=>ti(e[0])),result:e(e=>e[0])};return o}),ti=e=>{var r;return ta(e)?null!=(r=e.current)?r:e:Z},ta=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),to=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r7.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},ts=e=>e&&\"string\"==typeof e.type,tv=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),td=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tc=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tf=(e,r=\"\",t=new Map)=>{if(e)return ex(e)?eY(e,e=>tf(e,r,t)):eh(e)?rL(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?td(n)+\"::\":\"\")+r+td(l),value:td(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tc(t,l)}):tc(t,e),t},tp=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rq(c,!1,\"local variable scope\")),tg=e=>{var r;return null!=(r=tp.format(e))?r:r7.format(e)},tm=e=>!!tp.tryParse(null==e?void 0:e.scope),ty=rP({scope:tp},o),tb=e=>{return null==e?void 0:eh(e)?e:e.source?tb(e.source):`${(e=>{var r;return null!=(r=tp.tryParse(e))?r:r7(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tw=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tS=()=>()=>W(\"Not initialized.\"),tT=window,tI=document,tE=tI.body,tx=Q,tN=(e,r,t=(e,r)=>tx<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tI&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tO=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nk(e),et);case\"e\":return L(()=>null==nT?void 0:nT(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tO(e,r[0])):void 0}},tj=(e,r,t)=>tO(null==e?void 0:e.getAttribute(r),t),tC=(e,r,t)=>tN(e,(e,n)=>n(tj(e,r,t))),t$=(e,r)=>{return null==(e=tj(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},tM=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tU=e=>null!=e?e.tagName:null,tq=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tP=(e,r)=>r0(e,/#.*$/,\"\")===r0(r,/#.*$/,\"\"),tR=(e,r,t=er)=>(p=tz(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tE.offsetWidth,4),y:ej(p.y/tE.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tz=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tD(e),{x:h,y:g}):void 0,tD=e=>e?(m=e.getBoundingClientRect(),f=tq(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tW=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tB=()=>({...f=tq(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tE.offsetWidth,totalHeight:tE.offsetHeight}),tV=new WeakMap,tL=e=>tV.get(e),tK=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tG=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&eM(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tf(l,r0(n,/\\-/g,\":\"),t),i)}),tH=()=>{},tX=(e,r)=>{if(w===(w=t4.tags))return tH(e,r);var t=e=>e?rY(e)?[[e]]:ex(e)?eB(e,t):[eT(e)?[rZ(e.match),e.selector,e.prefix]:[rZ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eW(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tH=(e,r)=>tG(e,n,r))(e,r)},tY=(e,r)=>rM(eV(tM(e,tK(r,er)),tM(e,tK(\"base-\"+r,er))),\" \"),tZ={},tQ=(e,r,t=tY(e,\"attributes\"))=>{var n;t&&tG(e,null!=(n=tZ[t])?n:tZ[t]=[{},(e=>rL(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rZ(t||n),,r],!0))(t)],r),tf(tY(e,\"tags\"),void 0,r)},t0=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tN(e,(e,t)=>t(t0(e,r,ee)),eA(t)?t:void 0):rM(eV(tj(e,tK(r)),tM(e,tK(r,er))),\" \"))?t:n&&(k=tL(e))&&n(k))?t:null},t1=(e,r,t=ee,n)=>\"\"===(S=t0(e,r,t,n))||(null==S?S:es(S)),t2=(e,r,t,n)=>e&&(null==n&&(n=new Map),tQ(e,n),tN(e,e=>{tX(e,n),tf(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t4={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t6=[],t5=[],t3=(e,r=0)=>e.charCodeAt(r),t9=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t6[t5[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t5[(16515072&r)>>18],t5[(258048&r)>>12],t5[(4032&r)>>6],t5[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),ne={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nr=(e=256)=>e*Math.random()|0,nn={exports:{}},{deserialize:nl,serialize:ni}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nn.exports=n})(),($=nn.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),na=\"$ref\",no=(e,r,t)=>eE(e)?Z:t?r!==Z:null===r||r,nu=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=no(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||eA(e)||eE(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[na]||(e[na]=a,u(()=>delete e[na])),{[na]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!ex(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?ni(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},ns=e=>{var r,t,n=e=>ew(e)?e[na]&&(t=(null!=r?r:r=[])[e[na]])?t:(e[na]&&delete(r[e[na]]=e)[na],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>nl(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nv=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nu(e,!1,n))):nu(e,!0,n),t),i=e=>null==e?Z:L(()=>ns(e),Z);return r?[e=>nu(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nr()));for(t=0,i[n++]=g(d^16*nr(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nr();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=ne[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t9)(a(nu(e,!0,n))),e=>null!=e?ns(o(e instanceof Uint8Array?e:(t&&e$(e)?i:e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t6[t3(e,t++)]<<2|(r=t6[t3(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t6[t3(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t6[t3(e,t++)]);return i})(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},j=(nv(),nv(null,{json:!0,decodeJson:!0}),nv(null,{json:!0,prettify:!0}),rQ(\"\"+tI.currentScript.src,\"#\")),rq=rQ(\"\"+(j[1]||\"\"),\";\"),nf=j[0],np=rq[1]||(null==(rP=rD(nf,!1))?void 0:rP.host),nh=e=>{return!(!np||(null==(e=rD(e,!1))||null==(e=e.host)?void 0:e.endsWith(np))!==er)},o=(...e)=>r0(rM(e),/(^(?=\\?))|(^\\.(?=\\/))/,nf.split(\"?\")[0]),nm=o(\"?\",\"var\"),ny=o(\"?\",\"mnt\"),nb=(o(\"?\",\"usr\"),Symbol()),[nw,nk]=nv(),[nS,nT]=[tS,tS],nI=!0,[$,nA]=ea(),nO=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nj,nC]=ea(),[n$,n_]=ea(),nM=e=>nF!==(nF=e)&&nC(nF=!1,nR(!0,!0)),nU=e=>nq!==(nq=!!e&&\"visible\"===document.visibilityState)&&n_(nq,!e,nP(!0,!0)),nF=(nj(nU),!0),nq=!1,nP=rb(!1),nR=rb(!1),nz=(tW(window,[\"pagehide\",\"freeze\"],()=>nM(!1)),tW(window,[\"pageshow\",\"resume\"],()=>nM(!0)),tW(document,\"visibilitychange\",()=>(nU(!0),nq&&nM(!0))),nC(nF,nR(!0,!0)),!1),nD=rb(!1),[,nJ]=ea(),nB=rk({callback:()=>nz&&nJ(nz=!1,nD(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nz&&(nJ(nz=!0,nD(!0)),nB.restart()),nL=(tW(window,[\"focus\",\"scroll\"],j),tW(window,\"blur\",()=>nB.trigger()),tW(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nD()),nK=0,nG=void 0,nH=()=>(null!=nG?nG:tS())+\"_\"+nX(),nX=()=>(ry(!0)-(parseInt(nG.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nK).toString(36),nQ={},n0={id:nG,heartbeat:ry()},n1={knownTabs:{[nG]:n0},variables:{}},[n2,n4]=ea(),[n6,n5]=ea(),n3=tS,n8=e=>nQ[tb(e)],n9=(...e)=>le(e.map(e=>(e.cache=[ry(),3e3],ty(e)))),n7=e=>eW(e,e=>e&&[e,nQ[tb(e)]]),le=e=>{var r=eW(e,e=>e&&[tb(e),e]);null!=r&&r.length&&(e=n7(e),ri(nQ,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n1.variables,r),n3({type:\"patch\",payload:e0(r)})),n5(e,nQ,!0))},[,lt]=($((e,r)=>{nj(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nG=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nQ=e0(eV(e2(nQ,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tb(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nG,eW(nQ,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n3=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nG,r,t])),localStorage.removeItem(\"_tail:state\"))},tW(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nG||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n3({type:\"set\",payload:n1},e):\"set\"===i&&t.active?(ri(n1,a),ri(nQ,a.variables),t.trigger()):\"patch\"===i?(o=n7(eW(a,1)),ri(n1.variables,a),ri(nQ,a),n5(o,nQ,!1)):\"tab\"===i&&(ri(n1.knownTabs,e,a),a)&&n4(\"tab\",a,!1))});var t=rk(()=>n4(\"ready\",n1,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n1?void 0:n1.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n1.knownTabs,[r])),n0.heartbeat=ry(),n3({type:\"tab\",payload:n0})},frequency:5e3,paused:!0});nj(e=>(e=>{n3({type:\"tab\",payload:e?n0:void 0}),e?(t.restart(),n3({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[ln,ll]=ea(),li=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nT:nk)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nS:nw)([nG,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===nG))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rI,[v]=tW(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rA(null!=o?o:r),d],await Promise.race(e.map(e=>eA(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),la=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nI;var l,i,a=!1,o=t=>{var o=eA(r)?null==r?void 0:r(l,t):r;return!1!==o&&(lt(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nS(l,!0):JSON.stringify(l))};if(!t)return li(()=>(async r=>{var l,i;for(i of ez(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),e_){e_=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?eM(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rA(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nT:JSON.parse)?void 0:a(r):Z)&&ll(a),eM(a)):eM()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&W(\"Beacon send failed.\")},rq=[\"scope\",\"key\",\"targetId\",\"version\"],lu=[...rq,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ls=[...rq,\"init\",\"purpose\",\"refresh\"],lv=[...lu,\"value\",\"force\",\"patch\"],ld=new Map,lc=(e,r)=>{var t=rk(async()=>{var e=eW(ld,([e,r])=>({...tw(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ld,e,()=>new Set).add(r)),o=(nj((e,r)=>t.toggle(e,e&&3e3<=r),!0),n6(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tb(e),null==(i=rv(ld,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await la(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tb(e),i=(n(l,e.result),n8(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tm(e))return[rc(e,ls),r];eT(e.init)&&null!=(t={...ty(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r5.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&le(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tb(e),a=n8(n),u(n,e.cache),tm(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tp(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rh(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lv),r])}),a=c.length?V(null==(a=(await la(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&le(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>{return{...rc(e,lu),cache:[r,r+(null!=(r=rv(o,tb(e)))?r:3e3)]}};return ln(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>ti(e)),eW(e.set,e=>ti(e)))))&&e.length&&le(eH(e,d,r))}),v},lp=Symbol(),lh=[.75,.33],lg=[.25,.33],lb=()=>{var l,a,i,t=null==tT?void 0:tT.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tT.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tT.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lw=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lb()})),lk=(e,r=\"A\"===tU(e)&&tj(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lS=(e,r=tU(e),t=t1(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(t$(e,\"type\"),\"button\",\"submit\")||t===er),lT=(e,r=!1)=>{var t;return{tagName:e.tagName,text:r_((null==(t=tj(e,\"title\"))?void 0:t.trim())||(null==(t=tj(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tD(e):void 0}},lE=e=>{if(E)return E;eh(e)&&([t,e]=nk(e),e=nv(t,{decodeJson:!0})[1](e)),ri(t4,e),(e=>{nT===tS&&([nS,nT]=nv(e,{json:!e,prettify:!1}),nI=!!e,nA(nS,nT))})(rv(t4,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rv(t4,\"key\"),i=null!=(e=null==(t=tT[t4.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:E,unsubscribe:()=>t=ee}),t},(e=>r=>nO(e,r))(n)))},s=[],d=lc(nm,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nH()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),la(e,{events:t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(r8(rp(e),!0),{timestamp:e.timestamp-ry()}))),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>{}),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),n$((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nm,v),f=null,p=0,g=h=ee,E=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=e$(t)?JSON.parse(t):nk(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nk(e):e),e=>{if(!e)return ee;if(l1(e))t4.tags=ri({},t4.tags,e.tagAttributes);else{if(l2(e))return t4.disabled=e.disable,ee;if(l5(e))return n=er,ee;if(ir(e))return e(E),ee}return g||l8(e)||l6(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>l6(e)?-100:l8(e)?-50:ie(e)?-10:ts(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,ts(e))c.post(e);else if(l3(e))d.get(...eb(e.get));else if(ie(e))d.set(...eb(e.set));else if(l8(e))rh(o,e.listener);else if(l6(e))(r=L(()=>e.extension.setup(E),r=>nO(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(ir(e))e(E);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nO(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nO(E,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tT,t4.name,{value:Object.freeze(Object.assign(E,{id:\"tracker_\"+nH(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n6((e,r,t)=>{eV(null==(e=tt(eW(e,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee]),[[{[nb]:null==(e=tt(eW(r,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee])},\"All variables\",er]])}),n2(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):to(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lw(E),e.hasUserAgent=!0),g=!0,s.length&&E(s),n(),E(...eW(lY,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),E;W(`The global variable for the tracker \"${t4.name}\" is used for something else than an array of queued commands.`)},lA=()=>null==A?void 0:A.clientId,lx={scope:\"shared\",key:\"referrer\"},lN=(e,r)=>{E.variables.set({...lx,value:[lA(),e]}),r&&E.variables.get({scope:lx.scope,key:lx.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lO=rb(),lj=rb(),lC=1,[l_,lM]=ea(),lU=e=>{var r=rb(e,lO),t=rb(e,lj),n=rb(e,nL),l=rb(e,()=>lC);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lF=lU(),[lP,lR]=ea(),lz=(e,r)=>(r&&eY(lW,r=>e(r,()=>!1)),lP(e)),lD=new WeakSet,lW=document.getElementsByTagName(\"iframe\");function lB(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lL=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lK=e=>t2(e,r=>r!==e&&!!lL(rt(tV,r)),e=>(rt(tV,e),(N=rt(tV,e))&&eB(eV(N.component,N.content,N),\"tags\"))),lG=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},lH=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tN(e,e=>{var s,i,l=rt(tV,e);l&&(lL(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tD(e)||void 0,s=lK(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),lG({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t0(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,lG({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=rM(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:rM(l,\"/\")}:void 0},lX=Symbol(),lY=[{id:\"context\",setup(e){rk(()=>eY(lW,e=>ro(lD,e)&&lR(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n8({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n8({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n9({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n8({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n8({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tP(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rD(location.href+\"\",!0),A={type:\"view\",timestamp:ry(),clientId:nH(),tab:nG,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tB(),duration:lF(void 0,!0)},0===d&&(A.firstTab=er),0===d&&0===v&&(A.landingPage=er),n9({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rW(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=r0(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n8(lx))?void 0:l.value)&&nh(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lx,value:void 0})),(p=document.referrer||null)&&!nh(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rD(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lF()})),lM(A))};return n$(e=>{e?(lj(er),++lC):lj(ee)}),tW(window,\"popstate\",()=>(x=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>l0(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!A||tv(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lp])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tI.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nL),!1,!1,0,0,0,r1()];i[4]=r,i[5]=t,i[6]=n},y=[r1(),r1()],b=lU(!1),w=rb(!1,nL),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],E=T/r.height||0,A=S/r.width||0,x=f?lg:lh,E=(x[0]*a<T||x[0]<E)&&(x[0]*t<S||x[0]<A);if(p!==E&&w(p=E,!0),f!==(f=p&&w()>=t4.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t1(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tR(i),viewport:tB(),timeOffset:lF(),impressions:h,...lH(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var C=tI.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=C.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=P;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+P),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}x=r.left<0?-r.left:0,A=r.top<0?-r.top:0,E=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(x,x+S)/E),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lp]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tV,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tV,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>l4(e)?(n(e),er):l7(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=tj(l,e);){ro(n,l);var a,o=rQ(tj(l,e),\"|\");tj(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tW(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tN(n.target,e=>{lS(e)&&null==a&&(a=e),s=s||\"NAV\"===tU(e);var r,v=tL(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lS(r)&&(3<(null!=u?u:u=[]).length?eM():u.push({...lT(r,!0),component:tN(r,(e,r,t,n=null==(l=tL(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t1(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e7(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=t1(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e7(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lH(o,!1,d),f=t2(o,void 0,e=>{return eW(eb(null==(e=rt(tV,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tR(a,n),viewport:tB()}:null,...((e,r)=>{var n;return tN(null!=e?e:r,e=>\"IMG\"===tU(e)||e===r?(n={element:lT(e,!1)},ee):er),n})(n.target,o),...c,timeOffset:lF(),...f});if(a)if(lk(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rD(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nH(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tj(h,\"target\")!==window.name?(lN(w.clientId),w.self=ee,e(w)):tP(location.href,h.href)||(w.exit=w.external,lN(w.clientId))):(k=h.href,(b=nh(k))?lN(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t4.captureContextMenu&&(h.href=ny+\"=\"+T+encodeURIComponent(k),tW(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tW(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tN(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tL(e))?void 0:t.cart)?t:t0(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tL(e))?void 0:t.content))&&r(v)});c=lB(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tz(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lz(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tq(er);l_(()=>{return e=()=>(r={},t=tq(er)),setTimeout(e,250);var e}),tW(window,\"scroll\",()=>{var i,n=tq(),l={x:(f=tq(ee)).x/(tE.offsetWidth-window.innerWidth)||0,y:f.y/(tE.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return lQ(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lB(t))&&e({...t,type:\"cart_updated\"}),er):l9(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tC(e,tK(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&r_(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tC(i,tK(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tC(i,tK(\"form-name\"))||tj(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lF()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tW(i,\"submit\",()=>{l=lH(i),r[3]=3,s(()=>{(i.isConnected&&0<tD(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tD(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r0(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lX]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t1(e,\"ref\")||(e.value||(e.value=r0(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lj())),d=-(s-(s=ry(er))),c=l[lX],(l[lX]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tW(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lj()):o()));v(document),lz(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,n=async r=>{var n;if(r)return!(n=await t())||r4(n,r=r6(r))?[!1,n]:(n={level:r2.lookup(r.classification),purposes:r5.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},l={},r={necessary:1,preferences:2,statistics:4,marketing:8};return e({consent:{externalSource:{key:\"Cookiebot\",poll(){var n,e=null==(e=tI.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return n=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,t,l)=>{return\"true\"===l&&(n|=null!=(l=r[t])?l:0),\"\"}),{level:1<n?1:0,purposes:n}}}}}),{processCommand(e){var i,a,s,r;return it(e)?((r=e.consent.get)&&t(r),(i=r6(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await n(i))})(),(a=e.consent.externalSource)&&(r=a.key,(null!=(e=l[r])?e:l[r]=rk({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e;tI.hasFocus()&&(e=a.poll())&&(e=r6({...s,...e}))&&!r4(s,e)&&(await n(e),s=e)}).trigger()),er):ee}}}}],rP=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),lQ=rP(\"cart\"),l0=rP(\"username\"),l1=rP(\"tagAttributes\"),l2=rP(\"disable\"),l4=rP(\"boundary\"),l6=rP(\"extension\"),l5=rP(er,\"flush\"),l3=rP(\"get\"),l8=rP(\"listener\"),l9=rP(\"order\"),l7=rP(\"scan\"),ie=rP(\"set\"),ir=e=>\"function\"==typeof e,it=rP(\"consent\");Object.defineProperty(tT,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lE)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9iXrbVrYm2o8iolwqwNyiSGqwDQrm8Zg4iYdYcuyYZmyI3JRgQwADgBpCsr5-jfsC98H6Se761x4AkJQrp7_bX59TsYg9j2uvebmuFzycO7NcbuVFFo0Kp3cZZltSZKIQiYhFJEKRi0sxFiMxEVNxLs7EhbgRp-JKfBPH4kQ8E4_EtXglXov3gUsVAxk8fJZlaeZKD40X51l6tSXPXRlkE6T1kePLpfiJy4si2OmgYES5QRBki0Uyi-MgcPGnEci-9DPPy2Qxy5JGu4diV9TC9jb9yfCnFcvkrDhHXf3Tm2MWsUiCdm9CI4m3omRLetzFIB42qCT92d5u_MTfAl-ioGGYbjq9ZjNZqo-thFp-ffpVjorWN3mTU6e6m6UpvRSP1VxarVZBc9HzaB8VuuT2dtHK0wvpZsHDxyjpeeI3rkKly3m-13PO-pnvPNrK5J-zKJPjrcswnsmtKN-6iPI8Ss4cQYt8cjOVeqFbmZzG4Ui6Dg3AEQ6Kmsotx6POflF702iLgjclu5nr2UnXW47CYkQb5Nm0RzTJvrzBnvGWvect8-UM6aM0ydNYtiR3nulMz8-WkygJ4_hmrmZR0Kyp8aX4GWeCtwS7jSNXtKIkKqIwjv6S48UC86WlUeejVZzLpE9f_IOG8NCtFedJ0IxpDJf0RQfO8_zvF_F6emLFUnwIwvwmGa0tB4ZHJz4Ir8Ko2OKhmFryAtM2p5LOTnvo9S_TaLzV9pPWiKbsZiL2_LhcSDppDV4tdeguzK9s0BnqQ7aF3-hF35AlRhCp_l3VWWZ64V3A0Y_oJOdFmIxkOtni3fdU9cgMNlqiG50qe_XNkp7do2o_hemH9gsb9js2TIqPgUoWvwavZhenMmu9fPTh8_Gj588-v3h18uyHZ2-FlEGjIyQvpVR7O18KmagGZIy_-nwLGQXHNxenadyKCpmFRZoJGZpL4BK8oUZwedzCoyOxvZ3Q_8xBUj_cgs5jQeex8D8KmZq6-rjStf6ogMtHX09MmonJQTb0uIBE1RnG5ZymtDJh4tAC0F2iBaUx5oEMXTnDBWvToLe33Q41s1g4kzDOpUNNIM0pspmkesj5iPslL9Fio0EtTMxiRflxOJEvkkKeSZrqlPtMOK_W5TlnAP7Sza5mnPFYzoVew-p0WkV6zBVcdH4RPMqy8IZ65L9C3vD6r50VIU81HOh4ZZsf_QatNp1RSYvoy2v8HRAgkUN_IIdCXpWbiMk7KcPC2ki_GQA5zdIiRbqQxybtTBZvTPLriZAnlUNB_R5Tf1jJb0K-MDvqTGbJqIjScm82bqiQz9Ta8bGqjegRZ6w1g6zryho0TLuLRUMOZDSkndbza9gq9FBk1NertUV9GU6FfL2WfCwLIb9Wwbte5g7eBVrjl2Fx3srSWTJ25V0CfPw9Ta_cTlvQVjTaeKEIJrbpaO3Srj3RLyXOOgEftEILNzAv304HSdTnHR7KOb-OrnxClZw5PQdLhy6U-hzQ59DBmfnMF_clarj4oPtLqe8CWR0x3Sw-FPRsZXwWnpcjqbxVhbpaBKvlO6ogNPSiQWRB23zSLab7-6snXAKzVD_b2aEeCvqXnj5O8xNqyacd-jPYdOQnUUxww5UxjfONHodIKis8GFZP8p_8LGFP--YY3OUtARzWx89jWDnPMG56JQCBC40zJFvYes-WBeCnURbNpofVvYlkPN5KsJDenBezd5rJ8NtyKQlObKEFflFUK6qJpFJvSUMpAoZYvnzuqqnQeIHarI63OjwagR2gQmoY1QkGiZCDZDjslQOOsTduzEP243LQ8YZBYzjVYbxx1dbXRkJd3_IOeHMekToQtiMaMm2vBd40DTyDPU_n8hJQd36lk6CtN0getT3TpjlKO5JQtJ5sNm0TOzs9u9z1Q9eTlGeKNZvclydwjf-qHh1MVH8I-dQgpB28RR2gv1TEjk66GiuunKCMT5ACHIlGST2z-RE2P-5THxlhR16ngZeWh0RtRUA4qTV683w1zEjNpVwdNTaMgvaQy3ZolO-r42ecQh0PwefenIe2iILBkA9KERRH7b4BFs3C168qvaJtmmhSzUx0ZtJPfJPYK45oag35uYeTxO2HgRwUw57Z2H5IdyMUMQ5aSActak1n-bkbegaFVtAmshi1wXhPXfmXnQ2924Q6PN64CSj51K3QJQBhhEHjmfIMcmnxtd_xaAdm_H3ATICVyqtTAV4ZrZOnBozWTrGIdFJoKD_WkPoKVOQnUr53uU2CSKqI59ufQn6o7RLvSa8CdzRWKA3F4a6VBumlb_r_HxvIe1cOgHaPFiEO9A5GwPMpTYQAb_3IjwEi6jBCL2689OxYMSMGYpq0omtQnY-ZC7YsItRazSZaAawRvwsVIBvxQSKE2y9uHUWhRsEjWEdI_s4gGHjy-CtdDyKCotFwWB_B9wawrF32CjjxytnFQWRpiZjQa0n49QchfzUI0iRLL54lhM7JXMh2-cIamkRY5L5yBkFcLBZFn_YOGPfvAHD0AtsHkWbE1BuGYkGwJJIjKNxogCtBzzmoETwMOiHgBB9IBNojVGX1apm1WkXGqBo141pIT6sZeQNC_9Eskfx-QiR2edG4Al3ipW8v5W1tVoeGa49qvvzV5euX9Rmu03hTN1MgvqPGn9IX0fMeLU3X8iUMJVIEfPeEQkRAYhYAcBcVzFd6Cv7q9lXjTDygEl3w_dsvOM3C0Hgfe4xhEGLU5eIE0PjiANLPq091-UYaHgYQg1ZO5KyBEaqDRvWabVX5EnKFL8GvgCWc5AfMhsbabMZMQbVpaQ4DBbHqeKqcYiEYKb0Ir00J3y3hr5lyyBQfoQq0NkQ7-sXKOZG6W3UsDXvBXjkcULphOKK0tKFLu8Wrqz88vf5IDEAt95lkZpyhApEJt526wG_kUdyPCdB_FNmgC67OHkiEexs2av06nTDS3Mj67aONa-qv7pT6EeCHZN6OZQnEiiUgRfnGyEuaFA3tQ_XMNhrqVNHAX7pAA3gt-aeCINvb8VJk0h5fWWLdIJyo16xwywPq7TBxDDw-yyp4umyBCUAU64hIbsvLolXj864GDfqhP5axLOQWSCumr4LCr-TKlsq3P4DV1Kq0coli9C8wJbqHrXA87iOJ_qJ0tabqgJGyYhXkMZPPHPHNw1cgjceFvl07UII8EiRnn_9VvZ6HeZ__NR1766wFqlYeY8rPMh4U4YWErIssqdwUl6BjRlvykP-6Axr6EGO3Tbo4Tqob-kWN0luEb14Unjcdbt4oGTIBVrlWDC9qtyjpl5inj75p1ajvCzTMOQQf6R-G3Mh0B1R2yJwU_RQB8aU5ROAnZIQpZiF-2UXXUzXzp0PFHEofhykruSwrJC4doGrKe3ocKbXfMAuNZdAbz0iubhakbaRgIZ3zbBbUHukK-bKB_UuQQ7ci5AuQs-o4Od5tZ1IUNO1L20XtWDFTTyFh29udI4stZvZeZUylgrPpESCcgnmbXeq1UZcnK6vRuZ_G0Qhr3vGAcBrW3UzhCSIbVY4QhqIKNCqvxTo-4GatSRwWL6l37PkV7znvfGGGpCbSqbC_-wOwKOl1x5_h0M9Grv7N3fNJoUOLBaJfulNpOlRztad6gI0K7EVTbeEkoxE6aUAbqRlLndtXlnELmvaEQZdiJLgg77OpgmjM9tfrSMuHXoFOT5EJXrxvnuITXaSN92Ag9bjQEJ12FKWhzFGW0InXKJvIK5xQIkwskl62Cq7AK1MKC1uWYlQDzTKyoVuWPObzDS-l5UwY4gFX6-x7BWdJfh5NClP2on74GdOrndETPqMKwzvRbJ3f9SqEQ32OQpZnyKFCwgneBKFiNjdcossuiDDjXHOJeoOQVjAIl4RZ0R-hLxqeTnplpyBgkVEslx4BnD6hxLE5zLQltE5D2tSbwJklYzmJEjkuOWVTmRE6fAGIwMwgBhsKkSD4nYzc7MaVYNdXCraK6EK-zqKzKGlWk5P0ik7L07DgnyID5xJcqoxRDmrIq2D2QVPezVyP0XuN-xOwEyEzlmkD4mawkzQZxafeYxEyVk7wh9qMsKoqh041ze2bOp5t074M1OmdTyBTkcnoxs8EnvjTcPTNx6ETc0qfSVo_GuA0nOVy7EcgXulKnZ3JzA_xkdK0_BS_bOWZ4Zhn4cTPlzTkS-CAJfbUsn0CKWoLGvKYQCOd3OzEMxIOmvgoyE7dRuSJSTCiz6kScmxJdUIal4tFI97eHremMhlHyZnmMcpS3kWl3JvW6Sy_ARee80DZ9GyVnqckI2NLZS8WY4yA7hmtI_M2VYkPLiY1czGQnUnT5SHR4tLEkdGQGIgdOnj9R0F7sUhpHy5csDgadiQd2o9zXqPLgDo6oaOSzgpuP-_zyuTFoyS6CMGgeZ6FF9I98_wz6jgjoniHiHtPnKk1vmmFoyK6pM6nlF1-nQPrvNAsYcawRuqFGcUyzEyPl2WVoNFwL-lMUUWftuOG_hfMVZZPU8TA8ZcmWIRZ4Wv8zO4qP2hiFpQ0_EzQtNt4DukApmdnsfTNk0v7YLrtSwKB7gVjhzctfbAwE8_nRJ_Xzr8pz5w5AWpXpgp8XLimQX6Vl2Y3qUnumg4RXZtlz3C9trJjjSfMM6aZ-_q9UJf_TZbSpS1uuMyc5ZSgmZPZhczCU5oJTYzQt0l0NrPfV1lU6N9Lgw8tR3GY53So54S0KXmna8WRxXmUtz5P6VWMctnizCWKKZnWLcU4k4vpA3xbQZ29NCdSywY2F64Uos2iLKqG5fhPtUwZW4mvzcbSAd_uF6pgHp0lYVwRzXJROwrVnL2FXEVJTZlvvGksNntZQasxlGMXBYVjSjpCA_1aH0uzUy_m_5sdMUjtfac7m6WnuTGHOT7rGXw4NqTzadiQrjffYWR0fRveqN-ua9A2olgVelRKLfUrzJV1c151QXQaPwf0Pcj6ejS-Hi0df_DQFgu6OITZcSnGg6vNaClxKfR39Ni2wjiT4fhmy4i7d9XisOR_Sf8vBtUzYzYTRYaBXLLUOXu0IqxaLKL8OQTqOGOE0hOuTzC6n4E28asLQ0hpBS4ryTrk-64Vo2dM6Hj-e_fLi4QmTBtACHp4s3VnLpetL7QXr1fJP2b7BmbNJf8AEzxiSJ40mMijywbGIRH-vHdhLa-NvEznGRAX0g0hbCYk_EWq4nOt7BJohFGXHLhVZkGQvQaTgnAOpmZAtOG3pjcglzfUGlF7UHkAJipiKAkIot9dzT6m15yQ1RY9qs9C6AjoiRGN5QGhUiK-YOCEydgRjthyhiVRZF5cxvKBFrxnRYkae5upgAFRIUyEtAUhr62vaZS4pegcGDm9N2jcE86WI5hMwI-aLHGo6jkOSOdKE6yVgrrg02efLV3IhJ6q_RCIfGUETed__c__1_HBkXhZ7nJNvkijzp4wN--c2W9A-AEny_eRB3KuBZGqKLaAMQ5uxKtwWqiwyJ4rqaaSq8bpWZd1kWjp2gsM5c9gI7ddpNTsBhJshUCSltYBFp4xoa1ErpKRZ00-6awBRPW_pFcyexLmwNQo1RN5sNYoYX46jaECJ41LZhOR0skNeEiXdHnHM1pgs_yLDFghIYB9poEElfPHIkkTwheBm07-xpxGq6Mm6hDjZEqtwpcxB3HCYCGj095XI5zQvoE76m_SfVBb91FvouW32B8jkCf9xB-tLhanTt1pmOVoi987Pn3nABGDM3ExpGkP9ErUdCC4z8pSleeuWCzozviae1cETER6RGadA3v_6PkVzkPbI6Dscm8fQbZgBDVISYfsjBIIGHl0EiF8DLEW2-Mh021E3G7_m_4be1zE0uchKMRo6IeE6QV5eZ7U6kOGvU3_ZM-r54kPmgemvGlmg5DLd7DxuHFDfzAtRV7UzZQ1ubBR_sch4axr6gmVGaUBczn6793ywfnp-PWrltJSiSY3buo1v0DPLEmLrXBLAfY782KpkDcC7CCbT2uT4yk0ksXCTbaVzgfPsQShdYENUUIrzPVsRZsK9DHgrHko-XnPDCOGAGAF2jL6xYV7BNKVlD4GJM0owRa0bI_vYLl1fLazgu2W2G0Hm5zgH2YCQm2I0FGHkGg6gvrtxwdgMvPeiCozCoN94MF-sfQNTk3UOOFe5gJmKzPDGwt2efAQB18MBt8dZGcp5nynmFq4ecM_z4QGBn4uFATyL0Wcpt9mU_9CaCZ4rocnmEwvIGm5wPEnAERg9rlK5IfMIQQHijwEjRz1aOmCXh9pW06z8L8QiqjOzJemBuyn-n11a2oozr-cpmzSvx5PFZzVJRRl5tNZJv1TQTfEkExUkZfgdP1SSXWVyrfCHElqcznkJt-sSJQx7ocNzSOsin2ZgYQ3XHOcmHlE0xuacSgIqvU51oC9_5Fm0tYLAnEUBn6lGTxKfaU8kuoWQLsjAD_b87P142rVFz_2Sn624kCzLLwowQTILboHLT4BLkQpZXMRs0zAKrAPT1ipvdPpR2W9qGUOj8vCCmYMBjGEbozzVZQus7da9Q8P4F8G1VkQotMDsuMMaQ0a7TX5jOy7VSELXevCdQLHM7xCiCxG6Vi-e_viSXoxJciHRwLE8YXreUYr9lEcu04TarGM0ehcj7AhcIEgEQXSEA-6NHiVuKp9aURyEHGuQs1S_eJDKS5sZATklPgV6oryJe-5Jj8MFeJ5kB4oZQd0rCfIatMdqzoMXUePWkOJ_gD_EmQHaqnQsKc1xd5yWNkvlL77h9v38b_Bp6tma2fY9Hx6lj7tftr1-vSDc_7w_4vS6ecnfPzX8C6N978okxIGlPBpSLmfhgt30N554A-bi8Efu81hs-9xEd_9NEYFbnXwxz_6VJ2r9qnqP7gt-vqH28KvO7tnVpyn8a2ZUS5XtNU8T2fZiO6UyEfn8gKsBDoGftFvJH6D0OuPIpwV5ylB2Bs_FrNcZn4kpkSOXqXZ2A_FeZob5Yi0n_ozMU0zk5D3LRqRYy-mhBsShPtzJrMbo5k39rP37hjY5yQLzy7oNPkjC3NlC1UC9Qfb27KDodtKJfoOkXS7Dm0XgLHIjKKOOtnZTxBYbDuMA4vsJ4uDVg4-LUkwGBL8q2DI7VJD0T7QYJZD0XiXFveP1t3-p_7iD0-v-C44amVJxvkt_1mdsEwhMWKAbZgNDSIWBtlfjMswtx_KdIrv_9FnIVI_pHMncsDYfFUIGpeyT6OKvvtp8Gl4Z1fQ3SJUUek-UYedo5k52DOfMCCMgRASkSomek64sUWxpKknf-MUgq19iYsMLL8J5p7dGwV93g6DFIsvMqXvjnNW1XWtyZRoXnGf8L-PIiIwg3XnO5MJ8wRYwilWKRAaqlGCaPNLrfuySllWyT_VNoHV__NGlUa7WINPf9z59Kl1t9l3PVq3-XIxpNvifPp0ZxsEzQ_B7qe_WpSS_WgVprMge-lW5C1W6sFiE-xkDdwYqDNUj0_XlRv1ijWkI_pwgY17K8-eXRNZI5yzGUHP7AeRfYA0Ivt9TetVFRXZx4B1uQcM2CtkrIXq2e-uwnlYjpX9iIefCex5TSwP-PlR6a9UDjADiCWWf8at9HdpWWhcIC4KS1zEXPuDN8gCeh4hecfTRPsLzMtRcPHTrtsiOPZpt79g-ETgaSZKmeja1Hmc2a80VJ3zxe0fNfDfJ_o_j_8Z3JnTpiS03YRRfPEYlaGz-eUPTqfK0lR21it_-nTXUVWyn90M2MHup09uy8NBuNNBltOiEss7XzylK5f9auVHdbWLLFjbV3PzWa2EqlbVjP5j5fKgF7aBDpbYXNSdTGsoELjZASVSIvGDod33iNZuzheIlSit5hSUV-MhWDhSmwD0i9ZVNCZoW6yQcLIJHQcieH1dgiBmu5fa17KXGhVFfloI00lZJVa6EUR6lxjaUduzHKHCEAupaEO7yJRtoyyBzqOgrSgNk8b1CdrMAvwOImbztI9s-0ppCbkd5ELNqeEaLCbHeJoViJxze1yrHJPah5nXmwVRUA5wZ0cJlpdLW5JV5wZm7tQfBK68LET6A5_tBq77NYiDeLGYL73B19YjIg9vLtJZHtDgHfvliK-U-SIZRxkhqgFQIvOhsp6qDEKRnKeV5GOZ5BELRfYox37RI_enG0Pg44zDItxilnE0iUYsp8FJzvZX5P7mjHQNfmmA79phrDcGQLIBiF3KGATmbc1VULvbmqthf2iOaNWD_zg4IkimaS7zjcOymRjZwX8c2XpbmzJplw83r-Vq_1N3bfGYZ1UdtVSCdMFT1lJfobPNZ70Nf_Ma139s2jWzTZtmt16aKEwzSn917eTGHqvLZ7--v5Y0_aj1So5knofZDSyhsgO-QVEQmRv0iqgMvjz4oW6BrcEXx36pzOdakBYS_L3hC1RLUYXelILvYJ-KVL5VgZMwO5MFxAj3Kdt-mVs4mgENDTqHfAvVl7nThMoq6QvRysFel692NU2Ve5TcfC6Bw_4Dhg6VJFsqONxTeabv7FJmQbe9f5_7xlc15_N7GgtNqv3g0OarNAYSEVHAGkjoXXBEt9PpEIj4Gqj8zmo-5Df3LRoEJYe1m3YhixCVlCGZqzWCwhY1UMixsN8sth-LFfo8NIw6qm6UiWyTrF53j07FnSANcCTutH6I09Mw5kOhfjriDiU_SwreFEpWP1XyMZ0O2n0-Cvq3yngqLwnQMyRVP3mFUno_kPuOqB0-G_gB_j3d9Qj8nK18lE4lgGpKiE8J4UXlKIs5F_Kze_Yyf63ep_U7TQRMAQ7cGzf1xPetcWr6UoRpoCfWRuJfRBt9kzetOB2FsQSVHmaESCBNODJhipzL7ejyQJ0TvnR3Av1mjcfqtRqP1cl6GSW8qvRXJ4TXvJz0V5_6yUtg3ryW-jcv5h1aTJWP26vK7HMZ-11b2ilStqDdQsm043mQKzhA2zgbYXHp5GNs-ktt5JNMhnTMKAuj1F8q610yOg-TM8rca_Nmmm9zBJKI8vbb6hDgQ2W8SovnsBejrH2GPepTZb6V4fh1Et9Q5gFlmk89mDSZEAJR4ApiNPrTDCefTUEkU6cHPNpKiiqihXZUvc2gg7_0AQdfmOoh45kSsNIa53xly9Mpiy2iEQoCIZ5YU20PIBKJtLUoCxuCItU62ZoFN68Y9oLBCrmyX8n_ubTU1UjiB0JUlZrY0mNdETpvK9bBytS4VH_IqKSVXkJ53TUizBiMcDyUYHLRFWOxty9ZgKdslUUYxzqB8X1P6D3ViZrUonPOy3C01wbTzyxQrkuBrVhEnMHM1zJ1E2VURMzNt7dRKUVAYkPoNSsSu7yqbsUUmxpzN91kzUxz12kGHq93RFsP-Y3nKdMYmmCqh6lGuXF0zGpfG6CdtqppC0JdZhYXetZIsluTAhRFwZopQhFWpEnQm6dnLyMQzgQKyKMirBh6Zv3b50cb4n939osFXbsgCG4tJIp0k9kGmAphYPnartJI4_y8xrowR4P7atBuqf5MOq2-ImkffvnXnTkD1OW_oI1DZOW9luLFuxqOekv1IHzxDHqUB4Zu9vp0rrymszVKZ7BCTIutU7nlNN2V7pwJgEvL8b-gN1V3saCL3qgWopvt-A6UD5wltTOC3tvWFzT2oNrYl3SyRSSAhjutrZNzek6vp6yisEXYAB7ALZqWpZHK0RoqqaWL0aTHkRr3hYLM1Jbe9luasodiva3WF58AbXWolQVjFQ2sl4M-IP7hl3HrKsy3xgyYaXlou_5WdeW_YZxKJS7DWtCebRUpT4B5nSFaO6htAgEf9uMQjrdSAufU30G9Pwcrm2zNEruc3K1PO6pH4Nsi35L0KkFjeZrAJYSoiWGr6PAgBAnLXEAA1JiQIG3PF3uQgi4t1y0ynLz3bqR1Bj6ButPK0aHGtEPTdAjqVRR5oLgi6ybvLbYcLy75qGcWJFVQdRTwlO3DhYIV5bVcLUbwauBcRvLKISK8GOted_9w_zl4tPO8vfNgOO8uF4M__jn07t7ZPYtahcwLlsHsVgpUMjZKGyDmLEa3ULN0txvuWBkkuJdwaRGeNSsaGQosekrJAYzbMm-M65xxXsc7qtappKulQNusYl5MFMRzHHpHtXrzmt67kmL9rh6WYqLBllGxUHIDJRn4lPv_hszAd_uNwZYfAKBz8r8hAAALLb87oGT6Qx8O5AnO4A9neHfR8u5yAWdxx1v8Cxn_Gvzxr39Xcv6FHGRs3VUyisEfYrv3D7RNC3HX86hRFh5s3f03Ffk0RrFPLYgbtOxh8ClHDRoLNaVECxXBAqYd02MdnhFo7xdjer2bju9r1nGTEmLzhiGzrpMQ9SM_hO5BSs_QbHu7A8DHJOfzOCVQOwOPJ1YbUU_f7UCPbOQWdG-Wns-_oLVAezNlpHYUjAwl-RsdzWAHmB5-GTrvNNjpMol3qsmoc0KYxwFs_B31m7GsEWNZjFVvrVMCxVlwm-leFhRT-2QwN6_yhOAMXShPFlSqFO-tPXv80giibohA0LRFMV0CLyhOgzWUoKyp1XgMiO8Xp64F93ht3O8O2w7IDBwj9sqX73-Yx_F_fGm6FSXqgunlF2N0TftPk2SfFnNZShU_tR0D1_R8mmwMQK2xKaIwbdBXd7ikJo5ZhQz_vXeBkG9VUEyCsKI4Ca6iZJxeieJFME5HM8iTRPEsKF60TtPxjSiug19F8cpIiTQEKa6PAoYk1oVA0AaeLHudjRhIQhDpREHFBnQckmYTrColi8xqFmOsEx8HGV7xzIh4I0LooG6102Gtbzi7iHuKhRoRuit7qke1kCDekuJZLDEXz0pKUzOctEWvjMye6tmixeIFEBz9yqRWNJUGK2WhahESCoi74JXtTaDUbTpcWh83onitQd1fjoZwdpoOfllPLfxjsXBOoYZAqHx-FSmZzHwU5rLR9vGHWvE38M4I3FIDTeD5Smhs_eTU9ZR63FRHNZU56u-p46vGHO0ohiX_XNRJTN5WBXqYzK828xemXljxZqrPvZCFLna-Uiz5VsuWq9k8o-TEOi46McX1wvtVwyhaRV64vp6_viWilL2rWemFsevy2mrZaG4hbsrXEjemAmsnmK7Vo4LaOZ2x_RbEo0XF40nxqrQgTdziq3mwqNSdTfIPRYF8VXZa9rxldqxeBU2obiIN9KVpj4aEJ54GND4ubmIsvHZjw3pAv7F-eqZbF8W7inFxH-Dm7BWdWl9lsjMTd37ty69uPsrSOP6AJ-Gm_P5dAIyJ4o3pXgl__tG6q-SnOLhtomnLFFG8NWCDjWzcaVD8pWa8vf07dTa99qeta3HDf28Ed04Ju8WzVjqZEMbwnoUn-3ocVKbM-lFGZ-cF8qbhmXyexuPcL_ooouAZ0dJ0b1Ups8s0or_q_sygv9aaElJYyAzwqTS0XGO_Ui-_e31aIfX7A41Jpy59OoGUcU5JZ8ugeIoza7_NGRPFU0bu-u6FQrUeg3wh1PJJHBHYeAvde1jGFH_C-kiorbgg5HVSNCeta70GF3QcpvR942kRCqfxT0-cq9lykvrtVbovXXIEBFWm4Kr6bAmU52wVQuvDAlsiAyELfq0tOI0VKfSKn13SSH-J8kLS2hq7zXqpTF6kl3JjQRR9rN4j8O_VVDMzkeq2qX3X01nfTyJkizDmQv7KWeEcvesrZwXb_xsjnLAChVek4hfsSPEbI77AFH7WVsxsYZP1nZ2dIgtH33YIIdM_vCYh0j8ENScfG0gAJWGjVdnIy6jCEtzB3GWuBVHhCq1IV9AKIttvlEO3wWlAhE8_9W8Gp0N4xJBSNAhfSQLsADAAVrYSyVA5DchYT1M1E_YzRSOELFxn29fIOE9rFKwLVHc1pTQDaHgAZC7rFsiXbum6I1TUQBysgMcQJRtUD2QZIe-xIMiQiN1PO5AS-w5Dz4ihyY_Gtqz4UDWAvcJbfhUU-wBTeWlZ-6Pyp6GEtnybst9ZIXsgh0Pj8uQxc9j8gTLJHEA-r2ZCLwnRIbEcsVe31jSTk-h66HMJjzWWoBJAgxkMWPjOe_5ph6gYGgSw-TsL-oIcfpeNVJlbdQWjxyulZ0cbwH4dVnWohsOeW1iliOIHpgIyTzvnEMXvFqa-dOVvbvESM_iZ7o2EYYL5dE7pCdhxmiqZleMp8yM0HYpfDaQtQDM5odmL3PFKxWgw2H6wJv90aIqPg4LVl_kHT52JWktefTpuep98Q-V8clUC0UQgsIRPdJfHdFXj0_HdT74mcIzSOtaVjlXiCZENWYmQDtKQzYsmrhonFpYmoZeL16Jt34y6P4Z16VnRN68uv8Bu0VYW4qxoqszErUmoXtivemErq1pdTRa80bX4FhS_qPOeuN88I46jwXVWBsf4hXsc6K4ZzGn6OAiO-8c-XYJjdNat-XOyOGnCVp2GCKZtZBRC8LyA-xcfdMJk3QmitOvGtv-EHStHHH3QkznbJSdGTd8bLn0ck_1gnuDRp4WPYkfk2ch3dj8Xra-5I8ZRDvpsDEVciKAYhuf8RNDXc2tW2pV7Qls1apMa_4CSKC-7mYL99DNRI4xVfDM_wmlkE7_maYIuogu6fyxYOjmnH-f0gvsdakc_TU9SepOvi5cymTE_HVOaGyRwwMK2HbD41S9MymGC5xDszOKA_90rbWRla0Rk6RMiQx6xalnxIGAVJOfR4ydPnz3_4ccXP_38y8tXr9_8-vb45N1v7z_8_jE8HVF_Z-fR12_xRZJO_8zyYnZ5dX3zV7vT3ds_OLx3_8HOZ2dYKqbq6304KA6gyVPrs-0Ng4yFVJZmwjmCaySjz0RUz2DIbpC8DM6Pms3h0VHncGF-3te_RKwVvA4GbufwoHPQvtfdzryHDzv3MfWB2z24396_r5K6Kmm_vafKHPL34d52Nizd_Ri_TEGyUzAEUG4b2RjjiZ6DVhlzwTIQiQzme11_0O0cHnb2DruHnUR0Du_du3fYeUBvz-G-P2hfj04n3QcjuX9_v9vt7nUPqEj7wYODTuewe7_b6VC5Tvc-Ch6ODrvde13Zvnd62u7sdw-7p1Tg3sFh98HB6OD-OBHt6057_f86e6fJcCkS1oDuHhxin-8qt4Uh4QyERi9ofQndkdcQFtEBohNChyiXmSKB_SQWlY9oGbhMhsxLw1LrjI9RxQs6fdE0Bv25asihnZlquzdjRUb0OBOOLJ7zt54ZHmiYbHFFsFftCLZM84oXmxOB3jNeoWKGEu8IU72veqS1g1CKfQ3XxmY9u8EzV2h9P_TgNSt1JTinyodbWvEeG7fy2WnIDUPFqLSsTZm7yg_ISIQ9TZhaH1ZMn1as7P3c7TzoesoNlaLxjANTypL9zoMDv_Ngv1ZAexutiMt6FcO-7e3brHXaR-xh5ijodO_B9q-9vb2z16XEPmuvt49UbvfgoH_pDrrtfVZ236GFq1RUWfc5y9Q4PDjY03UOhHz48KHKpsbvHdq6-NC1H1QKmTb2uw_2HxzeoxOsyhxyme4-_-kcVpvtdvbv7d_fO9y3bdsU1UGnfWtl092GC6KqdgRQ-l07nENPtZSpljJuKeNC__wPhTDW9vX9lW7MmNdz-m7u0gA8AXtEokPgLrHPQ6ItEO3q_xPu1W3fE7RV3_tvCPdO9FwSTkF34SkBfvBhXMVF5lvxeDaZ0OG4Tw86OM7Msjjcd9ltKA2mvUdvprtykQq2BcBdqJxJzfX33RFUjt0a2GY99hJqw393clT0EuW7js7UUQ3yE0owz0rXbKYZ5f1wZSym0btEfXT8fc9j93rwnVHw_VXkQf1lCVkfMD0CQIgGMT0QQWpdd6VHUHqx6QT_F3Q_bfbBAR3Qo3R7Oz06ONzrKjXCZjN8GBR1ePbu5PnO_S1646lPfyuivxdT1jnJZ1TgLCyghhBlGmDNNo1wprpYLA7u7e3vHc2-10EuR2kyrjSO1kKCnNlW-9ppzkrPwp1DiApDMDbH8nrLaYb0STgJHN1lEHDTkPTsiY7CzT5sum6n3d3bTj16XtteU33NPH5BF9192he7XJ3u9uHegpZW2WJVMxbd7n6vsrCmoE6iJzblb8MPzPqRH1XBbKyOndXjIZjSIdDVOWw3R7guIwW76MbcE6OhPzKAiRLuixHfyREuTucBf9F9Han7avJw2MPasdZOCLXMiyElwLVf05GGO5O-BcYFCGLQd0D2XG-XcLSeEvBR2ssojiO1WYRkbm8TNMBbdFRCEgWF9vkKZ7dAFVOrc69z78H9wwed-_uqmrr5dME78vDuhg4ZTHVFgQb3-c-hKI6OuvSjvcgqQO_Wrl3qp_PgAUGkv9OV6oMaKLgBop0EPEepffTXTDtnLHirLm151VccU3HGkzi8mMox5_ddwJ1RICvHQ79kHZoPPeJ0QkJ7JDoP7omQBxXSkeg8uM9fNOBQDdjk4UiM4Iq-1vuLW0ZF6Z3D24a7OYeq7HVvq7I5h6H0d7IO99WKzPzqmdReR5WLzNJLFfsMzZrNMjejd_4AB717v5lh1bLyItHhMWeBLlJ377ZzIrQL40S5lLXdgX5LoeudAswvq8-IoVUI8sWLBWytGlDwYbQQrMa3Sl2dRQZ_B3WERgJ-bf3LaRr0q-n8a2sUJlpFwuKRkOz0NrgVv63_fureluUqDyz-7SXYQcvS4os481rnyWKedgf299d3oF3bgc5tO9Az7yY8SxdHGbuKTdkfrFf2nuuwBoaiOYqaHa_ycnfvxuWgKI8orbtBV_OTVt5iOIZmsXUMl03FMh5ERNOJqNks-7tc789ap9zerV2Y_07v_CHZw0TTLm05krFdd6IxgZT1V_A-UcPvYBH4b5dppfA0pydfelUcUVTypFetSA-8O9i4R7fhqJXDobzLWH9Y7apjXOOfCyK8Kgio4HX9VWwJfs8WC-tV0S79f48U2zq9gZ4tk2OuosrSrNKPByKtQjXidrGP07_Vnbq5lS7qjUF7Rl5Mixvd6q3PhSvXkEVopK1RfmzMkpRkn1dovRh6wxTdB_uv0u61JPVi197cASGzbJJinmaQSjYkSI_R3Ps2a3_PZOVuBvqKZ0K33ZY4eGCt31Fif1-VOCybf9AxJcYocdhWJR50WSBa4QGq5D1O3rjwvNRAIwlVHHW2tJaYbm6_0pxyKEYUaTWtrdIOq93O3B2iWXQL99Zyujrn_lqOnuaDB9WcUdlal1Wl6jldndNZy9nXObUlSV2TvFdPvq-TqzPeCl3T8UE92fR6WE82bd-rJ5u2azOObNsP6sm67U67nqzb7nTqybrtTrc-f912Z6-ebNreryebtg_qyabtw5W2D3V6bZrjyj517q_lmJ4frOXozru1-V5W6nQ7azmmTm3WebXO3lqOqWOvGeGH9o7udA8OtTsmE11nLE9nZ65zkZ9Nw9E3BY18B6Txphuk1AEJ2ciAZVQILDdhnzlAraAY-BLK-2fyDZo8jZIwu9liSwhXwR9W89PsRcczYJcoN4K7TJ-BUGsDKNLooXdJ8NA67CihJtxEWUAVQTHCGuYxFxVODXvtI8Ra8GAw2wTAYl0SBmUeWA7bbIm2EzDnLIbGrV8EbnGXWYdNDfOsOwDbW1jtDdiH7qZAvbvF7RVT17x1QY1fIVun_JyJhJYGU3zNUkpRWgonzSATfKT7HJlGY8hEM2LQ91cymMGBDC3mruBiyiUe2wJmQQhWRw-cC0uEJjSGlW6LGjaF55o5a_T8hBwYo1yJ-ZKWgiNYFAN6O4a1Z6WGI32vFXqtTCuVh2q9mfHmySS1wburTroy2mjHUcQAFWBGjdYbqrxy4NlEzLx50DmiUxId0a1ixK44CpJNjAqlZFnjhHR3-LjmSk7CfIfA3etsR97R0eHicG9b9acZCXyldV_7bdsXoat_r7e9Tb11Dri3Tnfh2v429K7crnb3Hpj-73vf69Xo5TKaoXqF00jmxETf4cQwoFDhFzCz7t-c2f6mmd1TE7tfn9j3Joo4ZJrM8OJmsEmiEZUu7hso3Ol09tms6zsDZcSCNUY2z19ej6Qc51uo1TmELjOsdXrRjuI9iduGQjhzewF2HLWyqQDzqKKF4tIt63EuCg7xYC7KaNN9w4VBXJZgVmH6E8RlUFLl9WC79qu4tHlQAjaCOKLTAu6K12T3w5BP2c8uZFTqSw72hkIDPRq73LuromDc39ByYVvu1lver7Vc9rM3BKFBuG_JZD-862Lj94ZcYL8-zIP6MA-rw7y3OsxmsduRCh9gFOT20f79ddgJiDwKgNrc0tlGPJZfUf2IEvyi53AcmneZvSaC_pkzMZMJFPblUnlKTIJ5KdWivIrAC25P-SAjmX8Uy16StLSELEioWTYiK9O87e07rc-fZf4yHc8g-lqNogZX6q-vEqN3pgIL3IHfc-aAOF7_jtGb9O_QEoSBcyeTE0ckFXsU-Qwcs49-0Yfmp_HzhQCV9E4q_-vCyH9_U8ZHBTsypn0posmND2eLyxVXeaqacjIECVoKN0UIkZHDNdBH1tyh3mIoSjfYu6X2a8Q-gmo-2mcsGOQM6DwRVT6rmC4pv9Rl5BA4z5OlxqfSrIR_ZvrzrAyooyJvsE8lZcBP0ASKlNvbcKqrtII5wbWOsZnFUXFAb-xKI6MYEGltJluB4GE4BP2Iv0GoZ2LnRok0nzn--uGypxyWyTI-FBzquqXGeWS1FQxDgrUOmgAu4McAiwFQbbAyziYup6FnlceqxWJjJIvSZb0NdVL1NcUKH8rTb6q0fZgTxGuxOsECuvo2xpO12FIKpyumEP0kKo0YctbgVrofnl9Rcy39yyGMR9LvwvB7Qy67RzQFvCWsiEsl14o3mpq7TQ4Hk-TVaKRCRaq8UkeTNoqDEa1GhxpwFjvPdHUpE25AZwXSw1-xwVfkqquuosGKxQmwLOM0S4Xt8KXFuLQ3zE0KwEipR_W0cA0F6V0cyegSnEr2u2rUUrUWcGyacG9p40IRHfVm2PshrAMSFUwBlrmlmz4p5qx6AlGchn0_4bsItA-8ZcXBkZjBt6v25qGcUpv4Av4M9_Lc-Oav8mPeW_kddCHpdd1eUTuBW7T-5oO08QAlM3Z1xMqTvvposzqQNkctPTDphVMnzivP84BLmVYIKmollZj_Dn13wLMdrog4rf-rFALIhGAd_ZNDqeaSiK0x_Tei_yb03xSJ9NEbHbm3-enpTZrBdDBa0YgZIXoVMz_Pwa3E6lMPtBPTIfWA1XMvgwmchu50lr5WE2STEddkN4OdfDAKqKmO90_j9m_YdHPurOrfbSD7ZoLn7IK_c7jjVgMZNfe9f3YO1yWy-0T_ErBXQt69XsTIZXDmJnDF7-nIZ5AY6vTxH53Du5QJbDD2mFNdyVMKPLpeLwbVo3PRXhkdV2kR1sesGN97vTPXtgJ_-OUcdvZpSuM_ynya0GJBA2EHMebS1qfXVkNJNgmjCZIn5fCrDa8OlG_b4b5Xe_FqTDt0kgYqNPPhPmEfmBGdPTj2koN0qGdXKqsEj6OzF0nRCnOM6JWbCjf8Q6XV5ujdndnx8BXN-kpfxNWFTTDIF6_qwSCb4T9XSqyEi9y5rabnhyXWv3foLYeMi4mBdXrVlwRXHnhu6JaX1vNE1Q1W7qa38XphSFsQCnAHMCbyN6mMsbGNgTVrG7d314139xfARuPm3vae9889nMTYHjaoqO0BvNEVBCq7gOVSNc17-HBfUA0ObcZVQFtmRGLtbyrbRVmvUniPyx4u6gXLY6OMtJVCYB0ieUvFWzfytmYlsmkLABzqqoo5jHiPcL2WtQwSaELqqSon_RP_JBio-NEa-gNHFPWUCg4JHXh6SJOhDaCnNXS_Uv-XdGLpn3rVykOCyusFam2L7FeYqhQvjMXv8SiLpkUrz0bC-Qe7HPozUGXcr0RWwA-YB_eT1PAk-ApTr2QaZH9ylvHXlL0JsqduMlH-fY0G-psW_AxSvfOKpVvDbSTTsqZEReUXuOa3j2uWUFwm4_x9VJy7ydRj8yusSGqdkMLqA64jxa77h9sPPvWpNfePTy383vW8XRq6sczpOx67okoughRf7IEBk7sx3xdJge_TwNUJsxwFjF9OumTJlUi-EdTAdgySY5GcDGmPj0VxTIvzAiTB4I5IHg0RPIpaer3iLJUvjopv463GHdch__q2gL_ibQzAtuqrMGtpRASGfs6jRJk2b6Uj3t6xI2z9uBWNUShmT7u0foPkq0ie6FEOEhryZzNkDnecPGcv8c8D4B7JE_zCE_7WBuFIlD3Pn1zsz6CBiCXOZZRHpzEH_TbGfC1Oi-DG57ggAhLNfaYaoiFF8qZs7jk189VN3ilP9WiRunvDEVsIt0_e2l9_EWL43tVWgwMHJjDn0VjSXk0yKf-SzlBhuS9RnC7bStn8PL1yOGzC7KJatq3KWhtEpxy38lThKIwweeeqAdI8VDX6wPpUF4cH-tQMeSCSn8ziPg6yb-7cxrbh3v-ipn5yaWKY8lM17ElF33lfRcUpw-bwXf7KpgsN1HZ19TZX5-V83NKxVXBok1_qazahSea0CMqyihbha3WdnNN4lqnZUjM2iEpteZRx5sAhqomqJNSWtmKqf8EWZ6Wfr65CNWmkGNnPeE9-MGYgibLHMDYeP_STH_zimAo2nc9OM_mAFfygimQ3mOlO6fc8-aF0qt_1BD2MC3qCvNpTyc24zWbycz1dJL_CjCFpB_No7Cc_iHNJS3cqw8JHECXK6QRz5kKehKe5T9TqD0M_aS8rDkqg2ztIuiLZt5fqUCQHZt_3AoIRyX2-M78OYNHrEbx4YKEDzOeskxHCU4kaksEAnYs9uUf4CctbsWL3gorPE7p0A7pHpkW4vJUl6RZUixXKbTQ9gxXbM_WEK-NTGAqLjAjQX6HND1jThXWCsitR1sMPRzC-tipj4IRT-U7LLgPbAey5ii3kTJVPoWl4E6fhGG5aM3Z7nBzArOBXviu0aiIm0tm9Yx2bExwoSqMRuB_N3Fzp6h8XaUaXGDyGFwUR8M5nWBL48PXANt0rxZQ12IaSOHMrzh1K0wa8EfTKqxNWPz-VMF0dsP1q2t71skSMjo_5BnaF03b4jMGd9W_wK0qTt461rTOoEVu7I3r1mrUFTKvgPttuItCXlcnmm9ZESJcOKze51mXDdNk3buu8oeIT8IHVfI45zEXYhv7vdMT0OxydV8rfuguwtynBTq6KO8KcX-ah9WpV2LcKAZ3FomHtpUuzN7o4hIoyew4oBVihhMfSv1CV-oEQD7or6mhG9lCGS2jVOOziGO9W1C907CfCSexJhhsXWyXpLMGI4ETU2N42VfrqPojQXKSwvBoEPyvA1FwO7pFIE9y-926IcLxi9U6VrfHVSfnqIEqfU4SnegT6IloYJeBGRyDOeLLvcjlaTFRaGvM1eocYDlM2x8YhbKHDW7_TPQDBWX2nTESiAABppyP3e_J3Y0LUscbS1e5LTg641bJ0Cm49ngoTwkYqZqnJm_UkOwfNBtGQaIsyYuNOB1EdZ16fg9eImeUaZdSLYnzqOJK4HNWUGWsc3lY3NsE8RdTsCFXf14kzk0g_GnKfOTEhAc5LFyOu-MYC-YBr0y8YfhCFUVuOAUc0Sdot-7DwUlZgJW-RPWHsmbTEAWDgVHn7ewQhtf__-S0tEInXLu2O6WAWJUJQ6VUd-yWvl4ltBtzFfCjXESoKGh8OvGb0tsWJiGP9tsVR4FJ72hYrCzqlNZbikdMSccyEJOi0lxWuWKxe8qKfnPjJN68OZFYgfPYnwHtE2IKKSvQ9gERlBVo99pMrT0ElWutmVuEcKDdmBXhPgfGF3vET41KiNwNrhAd5yWJlcDoQIBBeaI84riKimACV0Zg5F7OIObvAhW-gHywbvH2UscErxgrU6DKM-f6hkWy3S5P74BaGRTvnuHq2XPQfASqWR9_ssYmNNrgkSnsDeKUjPy-rMQHLEDWzwFMHLVSxB6lZYCKP3NJnPF2V8VAo129vTPg2-D62KEwllCm8tVErKqKZ9nCxvf2-HHnd0VY4-nMWZSowFwuD4lDFaVQiGLo6I8M1NYcMV9qcqwQ6scmLnpXCcFDJwOATaaCiKa29HDGY-MafCpP1KZ49wAATzTrVASGxAlScI3CEAaREH0HVAe0PlVFzQmcPrn3bnr_CUY09zWAobLzySHnfU5EIs1KAxDyrCOop8i-3Q3NfMeotZTCRjinJQTpjdlby2ZvLz6XRR0VcW-8ntA7ksCr7MKehOanmJhKmVvRiXsjiPB37RtTkvHl9fOL4zg_PThzBiCoC6uzwL0qgvSMCIQrj3HeiZBTPQJtdQNTnjNKMyA4CgWOZEcbssJFlUuxApRc27vK62J3GYZQ4SwECw4-WMKRRjrwUc02-dN-XfHg6pFOioSW8ealBhy20At6ob5n3V2GWuF_eKptRqPogqtrWhE6fhNewrbAooAIJR3HNznJ3DwHXdGi2R9CRu-t2mvwo1IVeijBf5cKbYYQVeyCw7OqjK3FvfRTRJuBgKcawwAQSdP8jAp3HLr3ptAIhBA0vcTW9XuoijlsjCS-js5CuOAHDZPyYbwmQbBrc4zg9tXLCQcR25ubJqKw4BkVLq6puoRW9RLiJYAwNHOU6SYDqc2A8rZz9gI2i3MURhRfPmIee_SmckfHp6dDuRxN20-mseLkmSlE7WHW0NbZgbCRl15wm9p-Ic9sq7PLKalx8AvtdlLrkUvHMhjgkSjeDi1iNbFGRsZEfinjFHxkQHuvd0sS0fe_GY2EjfrHfiOKK6STlipFHNcQ-SEsTqa2-ZDmo5rYQCQeUyljZE1L6o3JYQc8xdSAVRaxCE3g6Hji7qqWH3pj12idZEH5EDcIDkkLVDxnimpDHaqTrMZMZjQ8UAaHPXBQQIkP9x8CWG0qSatlzt_jkdm_3DG3Nym93RL6p_pq77Z_Wm-H9FGtVlWc4wvR_dyNCDh7O-V3Q0uLtbRVC3TjMLwL42IBNfczeHxi1YWxPWAt4G2md0OmU9kVJDGyPbTx9lwHHnTIxC4ukcmyA-8H3xLnLVCQtZhio0PNwUq8jbtlQfIACDMjonvwsb2AspVAOlmlxxAcTKYn3VUyUs8wV2buF2HHoqqPUaLhcf1SeCOXfzpwHfQ4Ic8NqcMhWOs40sPt4ohgrZ2-w29szzmfgDv8VdrMZJSq1D3Y63vaqm_aKTkDVzzi0spT-ur669tyUFTisAONZ2bl7KQa4eJFQL4GfG7_CS7bMsDpUxUWp2jBADHaCG4gl2INGAU_Hsw52ioDvMks-bbPaCzHzSLn80lNHDPTVuTsRY8ijhRpSwVEKlTpdOUhZtqZcEwvtY_JVyoqwMACANo3TzA5aNhwYrNrRHAKYWTgyrzCXcOB4P4GHj9nxtXaL_WK87qt9pcCywl-no1IhSe0TA2ClgtdY2S2mhAmBKi2jWNJxGhExgwhL4FLawRJgmtDVqMfhWwoTtWTtQivfn2DY_J-8SakSGa9dJy1nT2qB5BN9Keha3XcTggVuUp58PlvaeSlHNxrBo6fzC_sW5E_oFGvNYesdmp5OQhoCHZ_OgLEVP-JVd-TW3XjVL7lxHWh9-CmHe-zET1xCNWKuD13Yt3ejcpxtwCgt9fGTpcIiaY9TAa-PBrcJzNy2t61VywZgrF57VswwH8GqG1OTIUy7_BSrOvwTIgPblND39ZJjfy6xCSODIP3m2rPrVuBc9XrgFI0s7cGekf93bsnGmwHVaNxeBSKxo-UlSavnHz7gfy8viwa1g0wQoYw707Ogx7pzpCfcgF4wkVhzLYMqyeUA1DVcQf_nO7REtHtIwBleWmEboJFa1Jmn0XQaS2YFmhke_1TwmWdPkUBShmX4xDghqr7igNuS7RmjEplmYFgHkr8pBRQCJEI7rfaYlcnkeZmk_IRX103CqxICinlqvvG0jIMXnxNKd-9AtPb2CHk7o4-u-TgtoxPHIhTQw9dcU-u-rzihC5NJaZW0i747V-6-CuPeKxZpBgdo6i5Gy6Cgs1ccxWLnAYg9UHOGyqr9qD1vYUKYGYTl1GOlOaQAO-eWIvAfCxyGQcymu3N1AEH8-MXR_v12nxDlU8K4HfoMOu3uft_hKJnwID2W-bcinTpCTcifj6cZelNtvImuZfwWfYq16cVhMs5HIXUS0vPCcoqYPXtK93fDBkKUuM_hGY2byLMwP0lno3O_fVQSFRfhNSe-gVwn56hyj84YlNgiNk3AnbC-bo_MGj0iNA_r8mKMAZ3NIInDi1bWt8km3J91O7rDTqRosNGYgJgpx3w2wsPPsG_MIJ9m0QXBS58pRUi-ifaCCrcPsg7yq-hC_oWQv_MoTEL_RVLELSjDwrJcv8Oe4XuMX7MvoZxSUO0jVRPKm5vvGiVaz5ilo1FlRAFZEUiQUybORPxNO-B8BDZt8Y75h-wFyjmHCqqnqAHnHw6_YY2sxSw6Je52voaXYc4Sevgsi49VW9wKXsEOmjmdFQVHC1I6c3BN6j5GPK5HRPU8fndy8vqVQ4-n8-LVm3cn7N1ze_uxW9xh71cqZINpQzj57PSCqCt4TQtYzi7ik4p7-Jqy4tw4cLSuHAWoST_7bCM5FcrDpFNERQxuf8UxqHIyWaoCmKIh9HW_X1AqV3wn1Nl6QdFpE0WEtfUrFfBdc0uqpTQg40Y05D77TCydccbPjPbsM4McPOvp-NW4w3IYaEei0AMocJNrahh0GJV1ZOQW-4Kd2oM1dYIzcIwmtN5AcmnVAhuyoqoBJRHoEkBE_sjlwkytEMCm9pyaqyvHM056arEixURMxbk4gytbVQtEOzD-WjwgtfQng2K_BR9Ww8oqfYYj4IEKDHbhRmXsLaBTjFgxsaQD0GsaWma9FHLDlKjdhxUV13jFpWAcJEASCf6rR48jAGdizi7vZOY_E7OETiNO_6lkKTl8ni3ZSbT2e568VtQboy9LpR04DuKRm1yARAun0_iGfYg9uy4Qcytl7cS5QUcMOGKExHwEyY-u51mUBTefLuTFlAvZL_XQinPMVlvlW6VUhS7rcLr6wjQSS-Gwb3Kclgzwo1xs-_Ir_8I476znAomCee8hbbYYrq8jmupItA0oeNPxgqk_Qo6_dzkIAgIg1KNPI8zMF7Q7Cmo8Ao7tGNfcU1pVaxHeHjtLx5GysYSAxqiAQf0scTPNaFJO65vOZysRpj8n1lm0XX96nwipPmbcaEti83jwqkHmQ6WBYd2zICc2g4rsE79GN0Sb6AaFQkrlYw5Z1QAfGwiKUgOd8W6624lmjfK8_bmKmoTrv-TM7L6bTbXoRMzt2fEr52iHdQu8WpyT-L-Pt1qmeAKh0cxyy-eTGHFOmCXCaT6sFCt9RYZpDlJeBtXQ0phA65YrVJ212hk16wrpajznU_OiEZdGwawHHHkQ6ie2cHamwEhiovhBgWWVnZYqPcaIY4ramucKcMhKjBol1Zy5YHKqBWBtmQPmwN2pGOg12A2ibmuxyBaLzkG7fcQeu3kxogrzhBaNkOdkGFTUZHGro5bWcadlicvfdAJwdW3jsgyOPIMGQGWqeB4qA6VqfJQ4Lm9evMFF8e2gZ26oJJXVqQEForOX8U5xBXWBTGBdaF5r4Qf9zhXanEJmUvG-xrYUfGA9mFTwp6vPRqPiVN2Co6QV5U9SeonhxMDzCFFSjBhl2xgbn7b0Wl4OS5-Z2YWb0cLm8L8KXpB6Xwq6sD-5l6J8ZCojuoS8MWRleJEazciBFoZQAvP0ZszHWUJiBPAPThnrQU6DtjgLzuEv81mpicemLsZNRueoPFBuA8Qj7de5DrnDhA77uGc3-BZ8mAJsCWHy78DnZ8UOofB8QhMK_UCzIZDs6bvWddlPLNBwpcv_TbmTEBrxaJSxKLhO3GEff8ohbUCIBbvT5C_BGJh1f5uXHLG4W7H1odLGxSZNRf8UuvWDSkG8PDo9yirpkrAhSjfCpLPFIr7PFjTxIQv7Mt_Nrf2RhOTYsxcgMZbImVSzVnV2CF3zuZX-zgERUlIn-gUATf9BW6vaNib0rk3MpTnvT5sd3_CeRJt94XrKSHrKdgFFb3pk8ntT47gsCiaDKR042rTLDcAdliyRAu4VzEXqShN35jqj9OIiREQxyc8_nUk20hlxzDwYRhnj2ngP6WMrAzhVlLFXluC5Uom8UiKvleB18ZhHQydUO7OuZGMFCScM1GBlSxogjXZmU-yWRpMqWdFYh-oCQzMUg2osyCziQN0cNaXdhkeVsuIQcIZRG83bq8yEDwlORwkBYL-RwUhEshgT-BCC7IDvG60qXrFq9TRLwbV6ohbYK6FMiRn1E59OlfJuRMQ0TczRLoF2yn0Rzi9pOEaUH_tk-Y4IS95QdwhVWIStlLw4zyBSIuiZhPGOVPHZOOiZBiAE5PXulg8K3ln6P2PHpHxPGvNDtzgRGpsWmu-nyyn1VFd_gQV4llD3oGodjfdCyZEwUKHxklHlsR6Lz5-j_ETjxzIDeYkYSdHZLONYYQTbr2j79O8ly4XK107-VmpdF-w4WkLXyFuLcEZP3hcTIWTLvTMvzsrQIWKLQ13h46jddxTWtpNHY7l1IS_S7IZjMDmIPWrjbZUxWL0vBBXoHA0G80FyOvRXxpP9XxrPkmjluIwPk9P-Z0PmQSZdt9Q8UK6T51pXKlCBM2RQdbDOIU5sQ-AUFimb6LHvac27VDBBh09xchPbEhxd57-iZJI6QotF8LqLWwpqUUK1rObx_UoHAy-T5jVfrqKLgP31FMEWtO8M-wYe1a8Y1NeSQWvQU0r95Pa5fIZQ9Amd12eukhQgSgPEpPby-Rxvj4U3zKQ10-GIU2ouMd9XR8cZUpik0jV61iMyBt6LzjhgaBnCBwIU-P7Qt2bLoWOhrtzSAcEDRSkuhABYBXPmleeh8zCB61vlCIkAkkJftzT4yEEZifhRUFpJbuRfXQd2V3SsIZ4I85symTnUxitLMT0rmcoM68GWja_1bAfxI9x2IDFEcVSLVg5JfK2OOPdCH4gKqpjGLpvJeXUX5fCyrja_H7uWr59YCVARJCaiVkW71FMnmtDbJaiI-DWU1wmn_ar_Pgk6YhB_FvFLo_X1rqJnTGUk1QFbSv38yhqE-Jn8AnEi_2S9rSeVOJQcu2DOMRPARoMCJxyMaSsCTtI-x5R6JacklRTmshLRxEk87udB_A7K1_EbEb81Q7VRN-CpmGiT-D0HiyCQw8JSpgffMOobP7Uk8LEsRPy-tGOgHdEhdvLHNyeK5UUvEMfecSoei-PH2imb-teIjGZJVOTgvUnWFdWCEeGECNjqKI0uR5lhK19iXEHjXj1TKWgf6Zw-1_RNzdLAmDWt4l-CjdEqRyYmm7dJzj9S-ji0DD9zZIouMxkeZipMUKMR_wKtyOI3oBB80dUXGFyvAvMb7P3HIHJelb2JV6Zt8cozbvex3D9YebuNqs0sORNFW1Xy3ddBOTpq_737WgGa1RoMO-IfTRyNlVCTosq7aluOgfF2zyEnqVRs59Jj0_xfXGVcxlj7qRtXVtHWs0wRbN4MzhapBuimWZX3g_A6BLIqjB_l4BOBtNmyqc7oXC1MSNJFWkgWlCTGALtA6O57RFRtCjK62gZk7mCYs7YPcz2N_zoiDOOfFRmrF5op81DLgG3q6rozAZ4zF8PEytrejioGAmeEv6o2IrEWuGwWyEN3JioBStV4wX6xS9Pv-F2cFd2tORRhbQCi0UiY5449Bp8zbhFsDhcLjo3g4LfDelfleGgvI3a-TPhhhaWQclfAyhzTg-0SHRAASXkmOhjg-YoTBuiGW2kq-mXuIX4E2UuXrvwuW9qd1bwacDUMhTDbuD-3Jyz36dRSVd9WXZqjLuIPFUHZ78GAxzxSgQscoYgAAkKaJaLgHng7qRs_FeBlx28Z6HXknleqpgu5-Rmqvtnqp36EgBvVHyF6N81zo_yOXiqtUjXhR9vbjxTSHAGk9deja6ryvlstZuJAlmflUZXrmOmw5ZAtKuy5Zfkn7iN23aEbAvpO68UPnWLfQrcyWDe1S-7bqbNqtZ35CzgYgsLcqiISEZCwTv9-C_TrtgbAlFWVaR7Jg-9V1gjEuD7uWydQQ1S-MwJMYWP9DXjqshY5LFtBKhDG8zTnJalgsRuHYebSZKoF3i6IhHd1HKTSEoQg-LRXvIF16ohWChrR2E8l3YHwjIDnXOs6ZIIDxhLyJGBNClZn9tStVWnS9QaW-SjQQlB1qEtOLcu3DdbnM11GQ2brMMiXMnCxz33bJr6Y6iOsuZKMLwtjx-lFGCXAguuDQ8PK3BurgC-Y5eiUS0rB2KBS4hePaRjjWaZVR567JoASFIPw9kCg8ag1ibK8QJxMCPF0Mv5cci5EwoQUvwnPJBfYeNTKk673p9m8ZMWM7H19IVnKP3DUykPbU46j2QV0PWkVQyJyodopM05RcBRml1XZQ69mN-0mcJX-yGvNiguOL4ofHOZeDkuWAQHvcOBQDtHMshJFO2HrC9GgaWrZMkK80AYH13RIiERnSjAZSUYjKt-M4CmXJITfUQXXKRtw1Ev_iJ7PcYRHAfGLze8n6YzexbX-EKBOBevd_fQZkad2oKMvro2xo2mezWXdClirt4MrtNZ2WReYydQsS4w7G1-XqxHrW0ng5Lw03jSUisenARutG5iaelOwNDHbGBpEzFl-MV4vBKu079E3FikTNMa17hX0YO3lc3eqBgPKEbyYt7pMMOfLNjVXxzLm5nx17D0vBF-PhO_5FJZORk6tyjXdpE_YcjNBbFNbiS0MaE9qDw1h5maLam-J-8grE25luj9SZsLz6h1VugAvqYFSUJHcYaGw7LvxVw5D12wSbeTjQwU6LC03pulU29hx09eBA5usHTq4V2FG0HTiep6-hGC_MjnB_rGdYYlxBecRLEBuBrIZOGyJ7Qx7Nm1YMse13MfVecDuryvnDb1BxEV_xLzOtfNhTNVWkd2IuGKNEEDEvgawcXoWETAwyX5ZYumXRdJZ4SxVvFUjKAUW0yCUorhkhHU9UFxNnsix4lBKneyScldcO40lGfyqgiipdSrDwDApyEY4uWTq6_UpjfcS0V-0vnXFSdJKUNRMY_A8Jm8QT6tW-8zTLDigpaeDUIPaJLi3ZhxO3TDKDcdMVaPwg7bIwokSAGlBD8eZOgI5kB1JAhqSPXe_aCk9_LewYbfCK8LFQwN-N2kNXIgbcSquxDdx3AP-ykL9NRW_kr5bRezdWkTRKgWStcrIW3klmHfVx8FalZJKwrxahH4AOIwVzcS0jNx3UwUKJ6D7IPNpi4tq1DNjV1OqcbnGsmfWn_kz5cNqCJ2tGBdiUF7hdiVaWA58hg37mbVBf-h_KoxM1nG9YS8a7A-DTESDg2FQ0J9DerSW4iYYIFuVEafgUsDQ7ioom_oW7HTEcanV9hpO-26N1FkE6xErw2BDsMrjYABhbpFO2X6UfmYqiKX6OE2LIr0wWQj3KRAl7yQ4HnSHO8d4B47pdwe_94biWXCym-nonotFm7CnY_pmpTN8XgeTfnzmx-cQt11T5bvh0cligV9Hz7A_nFYcHeu0RyzemdI-PtvevqLde8Y42QSad5NgijTvIeIwbgjXtkOXAE02m-fiFNrH-WIh3Zyp9PeaRNOn0f0OQVw_jkWHroZTSQM7-G-S1pVaSx1jVkG1MsOBVNcv3rrM5qridMA7lQ4Zvxi1E3fOOmU_goCGToh6NyskN0wvSq6s-zoAy-4SMuxcRUX9T49Wph-t-nvPthma6WnvwuuVkSl-Qu7PtrfndMb8GW0rDs1FNB7Hkj47_KmOGX128bkkoCsT_0ypjI0EmOr-61bJ5dveHsFQo5q0O2qhGH6KM1aboNukTyIdl2_e_FtgvnsF3Ry0rS3McMjmp7hGIVuisor_aFn3OqbCnL2VZ8-up64z-PRpOv9liX9fLYe1r3_9r__5_wzvLtxBq9EfNj16b89mjjFObYuU_psFYKg0OjSQmHAaOYJw0AOjte_m29vN5oyzPZ_OK9QamqyjYiSah0eVL5ROCTsIvZ6qqWwbbxkoh8asJpTjuwwGbcH6s_cORGdoRWJ3owVduTFYEMqjGg17nJa8S7cyB3CNwC2eYiQTJe8z6zdac6TQYle84hx6B2dBu3d2dGmEsmfNpnc5OBvu7NATMKYfwVyrV5bxXUfiKs3G-WNJPUh_Isz2I8LwZLe7d__uodwnsuccsokeAY_GOR4UmgTYYyMiJ5dX51EMQbxVWsR5k0INwmqSCBveCewW7tQPBQQsUB-lsy3iiOMhh7uzZqfdvpvuwia_MpzQDkdUjxnrI1guHTDPGexs1SF9GHRoN-6GCvF4Uj7VJ5mU78P4m4SqxKt0LJ9HMY2tdfzj6_efT559OPHEHdqozzoGjVr1GRvN0xvW-3w0LmHBy-BJK6FJoxk4tladvRTvxHPxl3gq3pjn8J15f98FL6tXx8K3d0Zjov_OVx3faQZvenceGp6F-zwYDz6XeM5zHf6YOo0Hn__Z7cNhwrMETGv6wa4xnKH7UqCSLrpzp_nGE5-bzX92aewMT54b0PHXUmmVbHwNnwbqhft8tNe_cNvi-c5T8Rf9N4brErNRdNsu3I5gCLU_5DJjyINtvrhwu5Wqe5UsSIyX14F6IY_a_R31y8cLyF2rNIy4TW-ffhLvWoA0ofmcBTe41qwi8Ug8ap54d28wPk64FtfNY2_3GR0RllHMStZyoN_vahdwKyzgahhIXvmOPwz7oW8f9UqhKJggPFa8UxB8gsJKL20ZmM5OpfAiRexqc2_Izl_pL_Nym00Urz5uIm0BfAdwX6xDgYrY22VXxzuqu5RXjgZW9rIL18e6qsfCmghoceDOo7xEspMzbWkA3VlxDOoD2pC0IJcWDYZDIMLBWqlCx8HEVaGPgEEbMH_jy9KtZhYyP38dTV03qzA8Zo3Z-qyYUWH4G1awTtcCE44Py0kcMJpGw-KZiPCF_lqLv31HLiOSjZ39dquwhivoUTCjeAWfrihsIbtk8FWaQoaewoaOWMcoURMTozArKl208L2xTWQIxpCqxTXKtKE85yx9ZzaFVo5auaSlvqAaBea-4HCoRs5kSOl5lUwEWVauYM787ktWQkf77HJmhWiFMhIce_TdhBWXMiLC7_E34U8rdrRJ6dnU1T5MDPFmuRvsUuNYh_l-RITelwE0cYdfSje3sdbxoqlAfmt9HUccO0e9F19hdwl4naVcqKddw8I_n84UzsLxeupD8U1tXAOIt2ZHxjypNzMqUJdBOpixNpMDzw-XKjUPnB0woS77Ox2_dKilto0Q6jMo4fVzCET2lG_y_KjtRTZsb241ztpa4mXy8BRH-avwlQscdfePgfNpMB_uqkDwl-XMR4iSsDLgIruZXwYVfbpRk0evI5wtR8zbpz1fto8CQo2yQQ7PxJcBfrCVZiQuAbYzAKiKCMqd0930Ca3ni2nhBWPUvMwTemnwaGp573F0GhNg6jnvH7_FMsXG4sFak4aURmOksnhn4SNG--h4QvjHWMXQmoBrgrjw7K6zlY9CupFGaU_ohPLkevCXi8MopeVaVPiRq1yLquJ2we4uCpiNDaAUQ-deGLkQzWdGX-HsWmXgCNd8loMZoPUUi1duojkYDDnjY7aA0GwAOEAJ2NM40V3Oq0e_WRMXre54qaKYa9kKTpfxjlJOs9dIWsr8xKzl5fb2pUVfGjhLfKXXbpUTCmP7AhqHxsZ8p70jd4WmN2aEcJjgz9R7xUzKEyJ7QGyWkJkmnNkI8iVPVQVjL1mqJYCm1wM6Ewl7lYSkHJJ7pdI9syuVKv6JMStgkXIprVFmPLwZ_x1aU1VYsuEeLZm8p97HeZ39cntNZWewtMYOkXJcUh-Vou3-G6OywuWNo_pbNZeGqIWblTTQ2PEl0Sd0Fhp06mLIfn4k-h5-tCEpKmBuYhi2ZWdKwFu6GjXPRv1h4w6nBoVVe9Ogy4cTUrH0k5kfef25Jt5D3M0a-b5UvmRRaZNkAzoGxvUuhFM0TOfFyx_sjVHGGxm8U82lAjo-nU_2jbqELq3PYhpQE-ZCpqxWNVrjG1DiZMkwmrUt42_wFjJXbq5DWrpzdq8KpisiD1g5jk4Til0-MRzyG2M8fMqM9XMW-DB3ndpWTQUrzWxvn1tZWDXPpCE_l2E2Oq_mqhSt7uL8AytzzrIzCzToj6uSagMP4T8Az04JSCqGjWEyOk-zz1XAqZJ81RSWa2rh_jdxIq4Cqrwi9eOmqm2wTGLUV8vhnwojtSCS1Yj4VtYRHI94gkdnU_-9GniGtzoWHPXNnI6CjlYnMSmLBT0WRRb_DM9NiXIYq3-HsfpFiMG58dLi4L5r5iCz5N34lXtVcsbFVQvjA-tUuldwB_amLuQTaq6gr69a8joqgisrqxH1tmBM_i3QR8U9DZJz9xtdu1oh5jepntyTACLdFU-KWoLhOi16rRwPIaNyHedG3Ccim6a3TzjmlI6LfKLW7iWtHa2S6jhIbppO4DRPmirgyLu3L54YsE3D2eh30Dg81IdQ-adiiUqgnWRBn8V6ySoVe7IqlpJVfBCWHOxMeR-i5aG2TnBGr-AI2tOinqLmS5V-zabOJhe0NceqpRQVaht63t-YM6biLFUf8E0WXI2Ghkr0NPuXzA2DTktQxgxhBvv2NiOLAF1M1XisxraiuiYM5o7HTMKtcn-udNaIoPN18AjjZnLVUwiMEGuPbKEJC4KurL6DL4f11huXraiQF6zDjx81DdyPvg7qoVRz5MD6pu8MffnBZVfxHFRh1ZuWe_tANHUFJRNCWemy0vvzmH713NFiAfEl4M3ICLkw0s9qKWh1cL0Vr9FIuCzy8FljZhoCKUciY-okpHOYisI6ySv-gjllGZOsnymC26enygK6lWY_R0rQrgagnnyfKJZ4qD6UTvls-XckmrFmDutWMmj8pDi3jTZ8IIpiyTqjvcIKmKFyyYfJLN5TnbG9XbhriayMz_it9hO8itvC1CUo_oSUtBd_VhJg88hrZ8DVMuxU5ES5I6TthpSAobusS1VNZ26pZJKgBeDq82vfnXBziI9-vesWzzSHigUtO2uiF_gaFjf-pHVTKasEMDvrMhmUXvaS1s3DoGjdMOZFtGQjIwIxhuaPzmh22xxsjpNhlMMkjYMvaJA1MuXRekex2h0ifloHR0SJMJhaySurV5OrrchkzE08eLDaBuesNIA0iPWTwFBV9ijaXeS_7N7A2s7HFTNBvjkg661QFpdcbb7PZFqdUrfhDK3Z2q9wzuRqeBNo61oFOKS78T5qiKSrLOkOFbjMfLulcu8lNtRbar7AA-7Qtp1mY5nxHcta_HtZkmyenhTUS9aEzFroC2ItWTOwD6DJVDwBpPrZ5fo7yp0ZK91ChRlQqi9zGJg5hF-Mvp2m12ySwFgD7nTOlJL1YqCiGK2mliIArSXS-kqvi0sQfGO7fYRPoUQ57jtFNoPHvklIQMsxjm3KuC_KhJJg2WdcwDb7VrfQfwkF24rnjlxEQcYGGmxyVtqZ0xpEvAbKVQJRmUw1fObgXTlj9IgoU_rWr66q3iI06whWN7DN8ZImrLbtMZoUQRcHn4tF1IrGVl2ronXeFqWaeltMIhmPlc_vHN5cqloiyd-BqYmGqeBQrqLwrC5D69f2aiGY4LUsMOaL1juPMa5tNIoeH2oD-IhekDM3JrwL8OWojVgu_JxLjpmi_Dus-ZmGD1MEXaK3QifhgtD5rIBUto5w2RhXoOGdyI-qii3QqSlfK0AH41hC7VUM8o3qZuAw74lcAXQ3qhqUglddPKVSio_ed7lwV-SeisSTEpjuHgVIZSteE71xHHCcWkqGh-iVJisNep7YoCeaMNkXV7Y6u8GLspMN9tlGA4PosM6QuEfPCpKCAW0gHcO2UGVFh0sWbg7tqAy4CC3BBv4Fe-QQx89-efbkRECq8-jts0eOV0PUoJQR9WRL0U3OOUFtmSgn2HwjXZjzMN1mafdLaDbk4NirQ-oNxhDJ-BH9Ze_2kk_4WN0JeGM5lbGftQ1KZtVXLxHhBZl5qeYZBezZtnR8U3HFgZZ5KLt_fMrvuq27fY_-frrbp3_vQP3tTsfxbr9SfF3tHDQko3E7OvynIwbxh6HPPFqlXJawSThcP5SzHUTKj0UQiZy91uug9QTQVhcPVtmaDA4JrTQcj4mjdYeUyrL5BW0-p9NW_wez1fbOPv65bz7N_zlid9Du3B_SjCX7YbwbdLw_AGXZaUcKEdZbJnNUGEE24lzxIdphE67tzsHDh3J336vF-AR6g_kC1zdwdwn_WSIfLuHQT8LmOhmWvJyY8dkMbj-jNaEAFglK3gU8yETb2wPwsuBMiZrQngbhh7LmSpKwU9YWYs2ggU5CaL_LYMed0f-C-CurpI3pO6f_BepqwGIxiLGNwuU_QQLZDdzQW1oqpo2M49d4TMGLKb-CdHAwbDZhn4A03Gc2SsgypZuVWxVK6qOa7vVHfttDgEBTE6hMquAJ1Kv00Smt_eGLKC-eIzVgFgafE6jw6bMA9SlwDuOKekIzuKRve6KbwVgUK9lFPVutLrtsgLJAGxob7GOvgHGmjtIBhTn1C3pxRAgpQnBYOklS9B07uzTqZnCXwuzZQthWymfc7ofQG-WnHEvs8u_g75cb8He-hVaxThsm1hCeIrBuh2-zLrjdwJEdrWbGFSO9hHUXxuzEz0QmJ4JW-8Is2G1Qtk9APQuyQzhU7Q-gaTVkj3wxAX8Ce91WnKbfaKBrbkhLV3zsqFEXKq1HtYfg-tv__xV2NT0NAkH07r8oJ6pIpVatraSHxp7rmdQEDYkoYlJ6kva_O-_N7rKlGk_tDsvCfjA7Ox9vvOOYeX3zB0EHUasoHPISPWTH7J9BOGxgO8iQ3wXxqhVOO3LkqS1C4Czx0K6a2ZgYlCJ4lK_NbBJ95tuPgpbVqdukRYS1b9ZaNY6KJrOWz15Kj8vi5QtpD0SKNwkA6sjBBhX0V2AtESOxe470nqW2m4bZ83xzPhx5GldhNj3ERQvWCm9sp_MZhVl--b25gHQucuaeUuZQGCpzDVeeioZiaKp623qfOnChLbJuLirkxQwgvJvpTh7qRSJ7jZvaGh6hhxNHVrtsS0qnLlip3NEsSA9FM3oM6sepFhlTSqyz7hKj-fEZHoMK95zdi7SMrccnNCSaaHAId1xdYeSRmhY39x58PGsKVJEzNrRruULaAWkTv8zn0DmQujp5jPld2QuonhTXB6rgNF9Ar0bU74-sg7e8WYHPhAqeoncoSH6BQYFY1dDcRse4gXyWDSOQQttHTVkr_fQTDjnz10EkqXWX8csYWhSqI0aQL7hVoApCWQ_4BoGbblEsB7_ADsPVU_jcU7pdh0a9FFVXLFmvZFASUo7wNUAek2xANECYkGBtiaDckuIioUG6AUk2n4A4AqBcsxIVtFE1ZcEiPYByT4oeM6V4xyIMhXA3K7TEe8st9o7ABqF6YxCVO-2i4SXD-Z-wBUEMjWf83sQKst16eAInWANkxrS4h9UjFUCyROdnP1DqVoIt7QAA",
        br: "GyztIwPBxgGA2f2PiYiqXlYA6qV4Q6RTaYdcNgZLiaobes0uIvr1U3Zwa4-RNkT--mIMmh0amq5b6sPAiuETAkHzxQqOJrVZ3Fal1ePmhrBZG54jNPZJrv_VtDxdUdum3hs-cshf-uoNIbOUEi0tZRbJ0PKMPHC4XdbMmSHs3rvpprN9nGlk-YyQoOkBZCVgpul9rdmfrqHCaHXYo39jFmb1NNvejRGl5WOw8BVlXMDxs7dWff2OU0ib3l6YdEH3ni6pRsMeV--IngsvahL7uYgmiCy9DBuQ1b72pvb1PYOAeIKi7HCsuC6S2ev6bW_VSLU2gwjQjgKa8h5mC89nWppPR3EsUXjN15O88WMw2BAPp9TGZtaWQqJ7I_l5vrVYq29gWPrpxxSODRcWFATBqmvWMkPUaMraG39Jrby3nwl0yPSww9j3b87___oNKa5qddQI24wR7rcZxsBsMziqfSg5yBMgG9lmetL_b6b1ptUNx_Wc-d9HRj4zPiMwsi4LUPfe9-7gvTLb9aq7D9rhqxtmtxsgP7sBcocgZ19VgXOqm5BOA6SkJjj_HAznGwxXBpz5AWflaTVD7l8ZY4JQKb-1oRSFCiIlmYJQUSJdY3QZSlpf3xij19D-m93-SkusKIgobMu_W8RmOO4K7UGfjTj-41eWJcV0_38Abdvv4TQNSZ119Ta6uqZdApJOo1KYWbly4siZJz7yyGe-8YEvfOINP_GaB77yv_zIn2UgBe1_WXSHDgBtv_ugO1wmGABiDwBdDQhU_lMGkq5zRtvv0gPU9yy9zpvG-mjzppkUOIkJtiyeunaSmvSADwAzyQeImYSLQ3yxSoh9vtKU2jzuoD8kT4BsLk7UT6Un7MwU_nRTnjf0Jc5qB7d3ba2IZ9XU90iATdnxGSIYYzTS78rzbRcXFy7K0kzuoWsp2bbf-HZq_7Me8CetjLV9Wf2fy30JncbhpvSGz91eNI2uE9oTmahsvo-7U6cXF0HCpv0ZCAT__fZdahK96cV5VmUd1mabYff-HRBdvvCGx6l3tRhzP9GacQtz-AywhmBFod51SZ7jAZm1mf5LmfZoAYwD2eWuT_ShVg1e5nIkjcBzbeh4FVeWUD5comBBxIZU-FtQGQUQwbip9rzyF7GD1CpBELtGVZYOEJyg7ouvkjIjsaNQXSipJbMt83EKqQitTOBxWGO4WsHrcbHe6UTSsA45iVaiKig8OXvIMGBOiAkg_0A0oOawe4hvj0kEAnBJKqn0OQRbCKsCeErkNes1txZpxV9XV97Kq8Ef9LQn2__ZeVg-qWr_8X98xUFk1jBRnR7wu7l_FXkiG3gx0PgqMbR7RXvqVGahW8dDJ0gbwsXFaWpS9MzVHIdrQDUgYqL3Hy66aA66xbfEOL4g2dWF0t8ymPJtXLhZ9JDQE0hJdDWH7Uk3m_GhCevWtV4k_hIQU0MKTUGec18KAkLXhdLjXTyaqbjr0Cvp5tv_ESDeU71kCkL0KiySqf2puIvQumCSL3Hh5FEPPKmT-j11H57iILVIcpOdAADm1TZcoZHpcl3whYN0emkKurxgjJHux36MGw1IXgF0ifG5_Ozh4uICPgZ48YFIrAAv9nBJaINnJsm9UUvQcl8_ZvHF24XnO0E7TTh2pQWozfVnwQlWg5sOj3PKfm-Ig_pD0krunJ2spNA7_1kPwZT2U0oPkmBYHl7GuemrDigoxEXFvu__5J3g0uvsDUSPckqp6i9yV88DzKpxQ6X08AuU23NO40t0IgMKqZR-4OoEuFNir4fBay1Jsft1AUmCKGfnjhOL4OhBD_lCYA8YroOE8YaHOxUKp-wgHhuvOo-lioOT7gNxaxnUMXYIo0PtN3rIHUJj91eeN68rAeEWgL4I5zqo5FTws64fPiIaFW2_LXXffYwd1cWJ-49lWOwIEG9G9iS_7AReKK5gGafV8oHhjpp7bwACr0EnBXUREXmxIEENfhnthN2jkOu73PBt9qP0OPy_VjTRjB62DTPhbRiaKjGIx2avUN3EOW98vCxpyyFSomve4g5kAV1cazXGoeIYQrxJwpwGYtV4EYIN-LyMajAiMT8q0I52nJpexkIvr6UAUgIU52r0ztst0fsCwx0qIgrO7DKi-lLHwL-DgrFc2xCQL2SZj4zKSkhaQzMhXSanLz-XJUZF2CazstTdVXmS8Fzp55Y6E7b7-0FCfJNPZb1ycLMz-211tBbyrUoBQ1gWk4xtKpoiMQ-_iqUBBFCU56qTK0QQD6X07sBqX4iJ0LmdxiYhQPWkPFxDBB9CUtfD8O9hiPsyADSCRLS0L2liIFE03BHLJS5vpsEwmpnFPeuHOIsTTRZgpq6bq7HHQ2betICCPN5RE-bxhSwkPiRyr3CjaJlKbIXsTaOrSoYYjT8VihNLvRtd4LtEH5y4rcQuIiD07D669yHuYl1VAAGTZTbV6biDvgzK883bAux5bAbWo4Y7gIYUIbMHA2QljgX7JGec-jT30m1shmBVYvV28YApxIvVPANIhg4I7tGI8f8MCrMSEhF_Egj82pwJKqduFNHcS2Zllz7FyiaSJ4m_Fa2AF0qFjIw-oSkkdrI8y07zGR0lzFVL32AzWleOkPzZ1dinHaHIEEqu--fTkiez_9BBiET8OOz9OJwN3mYpOUp4QSWoVfiUFJ1kD41rIQkG7eKOo5uCGvHIM1K8TIHpkIZjVxxuDqIt2WUgoUFFolQO0LHFTKePSbpobpIgSTG8Qgh5mGqdgPZpHkknzUukldY_ww6OYeT2u6JJcFEl_QC6xpaob2wYqa0g89t7uknwoOlD1E7gWhNULHXBO-sYXI3tylAY7-oAKRq1mhiNGFf78xRGYJiprkwu_yr9xgAPFnnQFQYQGPH7iFht5AUTdaZu3QeIVWhEMQ2_Ibcfuu6uufZkw4WKU3iSRwETLCqJqtI5MTexELAn4MFThIcSuUd3aWfAPjZTrIdrjSCPK05QMG09p1ehxiLyYFnsRlYcgzl-L7M2nFZ8ZO2hpkQAbnYFRM4dVG8nW5tv0kETnXJVGjGrvqCL3GBz5f9lSpcJFDNJU90cg7dksguZXAZiA1lZTUq3BeevHNQlr9dhxRavFE1jfoenBaZ1DOxn2ngn4A090K2ZwhGAj86JAlifuBrrTffCXMmMhNVKsNbgCbbjkEWkBucB8qkCspDVQzx7rOqhm8-KB6d5Alx18YSUnDC8wjHWZPM4RCzRhVdAsklG60U1i35JIXuXHMhPlTe3DDESsSkTFMxGztge0Do3oz0UoZLS9AXmH0Zg29GEYaf2S5Rz5zHt_U7-3IDphXETKbsaowVgDzZoSJm3lt0FHSS1X-6LA-kefk5WgaQoq0jaCRvN3Sp62TtIGHQV03xpWsgzki1pxZwEUpH_K05ffYXDt5ek0Lk3_nTj4DSgRFQUaaAcDxsaUrCgTNe44kVxZR3EnM1SRuGReaYldZh7cHBXuP2tm6n4UNlQFQL5KOiKpGF4q4Zr4PFOObeOmuWkrClg5B4ipWVxMrzwtHz3BV1eplfyPRsmLZ7YI0FsYyZ2iTHUtlWks_TGIG6f0yNI-e_1g3HHuh4DefzRp20DyA6XFDF915gDKAj_kRGBQ4HypcfIkAki8ImWtZ9eO-C9-EHYDwwsKgwIvbMsDexGLO4YI_gP6wgCUks0MMySj0TGATKl8jJlqwuywt7YKvxHzZBQafDueHUwQueeFrKCoqselYvJhEFrA-QEKTT1L-rSOMkZRGo1CeBaheiO_XawnTVgHABbCZQXHcBR24dTFS9rNbuk0gooqCdSPg8ELkJC5Vo7FDcgafwSPxpw5wcITJVWeAABzWvf_cBmyTVU8s15TUqpjqawv_U2QsqjXgp4ANWEk4mWdNZp1OBxAJ5TV8b77gZZfEVmCNmQ_h6zIdN9y9WbTLNlNjboPq9QcQICz6d6lajog1AJ-mLEAMLbxJcFrSDPltn6JZwQQtZBwsRP04tTuwW_gIxEYHgeavTwGUOZ124bX6KN71NZjYSzlz01iRQ7jm9faKX7Qb2TX2qtiC_k_8-LeiH_1ykuuDks5zWEidYSyhwQVAlGSDCTb6QTrfdMokHKI4YoOLy8wM8K-Ro9gfAMtxdfqhTI6JS-JE8lA1ihrYs0O8AL_lTlygkEy6z5yzHdaa0auCpSRKoiyhd-rkhMcFKk3hbbpeX4J0HrKHbRTHDWaK2ntzgBlTyuOZce5oCO0UmrKOYZc9B5ucpHxbfoYd6frUnwh9FN-Odo8azVjoTTSLte-nEzU9Vb4_wmhdK_aBajfxkwnfPHEGBFIP-CZzTJgcGH-f6v2-zT8gUz_W0NwwaaHiN9rKfxf0ujCY7l75yOs3Ozrb9qkFHl_E-CI-JorWym0WlMeKxn722b6JyS0rO1fjtPzfR5WrggcRl7mYTyewxrtL-3NQGr4J6sjZRyZ6zt1NaGCTwsG2YvvlTIaJOF6tQmuGgc37fw2ZrUJcb4L8Emu93WQumz7vPi1CE0gCOISwEGFR645HD4RndMBYQZ78RCKs-WKPbMQWI0fouy_yKaiTnFquMyW7KC2Tlu9l2fQQxA3vsEhtPba0xtOvFMJu6_aYI2iY82KdzwTvTEepAyka5sY7ax_TtmUecZQiWJtgz-51cWgAHUGBT1Wnva4QF3goj39CWCBCNVkn5gLxHsgBH09scnSnE9MTkcv2PTyY6hrYV7J4HJbOIQ4MKQ0JlbIkYjzemtkPBwkHyK1gBO1BK4IuFUdjL-ZD5BYusvx8l1ZshW97uVJXtTUbPfsVKz3pFAst6RIrJ2ggC0E0gzUOH9b72CKLrVIQorrLnkmVhMQCQp-_CEO_B-cGsWdBD5AbEZbR5te-lGmIOCsnAiKaEpthT_foBP3LpEqry9HysItf_3SRIHuqErBeuUDZXm-TDuKKy6pU_Te0r1X5EAoAcpXZp9GtoDEZUz6drzZmQ7qOP37AsjPQoB4me7_yO3skH74h_Fsw3V7X0jL4eAOPUbqN71utKjQOHm3Y8LpY_hgKV13BT4G87-xTRDyeYem611EGafIgrRY5OU0ChCHyjihEFPvITLkTiicYDrYsxRBfIAHYAJSMCrgWoosKVWxinkhxbIyWged3fX76JwbQcIVaTme7aGsM4rZ5BvYMg43OuipF-LkMx6EExx00jADNj4ZN3Ec8a2A7PU568mXUAGF2NIQFbjSlKf6I24m8ExsMqTGRgf5-qrfBwbtgJCCrcvNgdF_xK_2cWsxOx5mo7RodG9GT09mIKD6zES9pEIDAYoSxwc0NCcuCc0DoHcdJSHmk3SrXZ0vP_FHqnb9zEtcJy3zBn3r8RCaBiWNkgKMd4BSdwhq121CNDII9j74AVWWar1uTtWJVxx_UTOgO_BJA0W9Nqcn9nneI2eXUYAFHRKZRICjbtQn6v9BaoTbdwGTRngXK6RI-Q1ErDiaM1qnEyMuscaNjUgc1C25wR-hvSGsf1DHYA_IZLnXHhFjUOUu_YajxWGPtWTWct1AJ0C1SObuHY48tk3uqE2knYQmK9VXTbtbffSn5zEDvXoGkh2QcejBD95i5h96CYcRs8Cl4j9IOSW__kidDSwYdA_xgwIWXOC4OjpED0bgq9AcEQwHqOrPEp8kPjIcYQqTdFRbczEBQf08ABnoOCKk6SyFF1RHJAPre7UEcOJ0AdAASI6shbHHbxvJgp2qXpFIG2_rE4HHpaZLFWuqHdnFCyfbc3EJkvAW090zjavtjPi_e8bAnwoYBHbp1o6LLD7wHIiG81S2hylyAn2UbSoKqE9nSRP2MUHnIw50IHjqusnRlitKmrqlXLTJZIcmKc-9irppsi0AUu86RKuYkQrW8CJQDAdesw-i-5Nnnjp_T86AF822AlVCYZSkIXX1auQqy9UCSmxj2Lp-oCocCj87-07DIB2ON3aFY4YzPnFavlIhtDQSi5U05VGqlunoz5zIpzvz9oTm1PQttQ_GDrhVR3v73lgZ_bYcCgcbX-zzs8odB2XCBzR3a9OYJF4IYNAN-WFx9z9bh87XExRLoIxeDZEWhUXZlefm3JA_W7OIV1ym-5y1oiM1XCDZcPS0pzsDk2SZW8FOZIddaVVVoLFn-YJE6pffbHqluOsE66qSxF1wMJcVNh0pDP8HfGbYmuVEitdFlm2-mjCwlgWLeHHZE3MNzeCYJJlE8bqbWWtYhYa9eGzTt9gDY5UcAINIUnqetoEpgu488nnFI7lPOq4po4IiFwgM0y_oWCCO2F4WeYb87_zaOVvcWdpGOrx1_uHXFET62gmrIOiRW7fxUDNF4LaAoyZV769OtmSywrb9q7SYhnb96JpELzTChAh6lwSNbgLv9ACKN3ZafVIt8AUVQDlTOecbIKBCh553salo9XPGTri3TNNWgT7LqfQFTOnQpLpdPhgPgz2jnWOAdio66XaCC1ekiiW2zfuTYJW4rNcN5pjlv75x9TmEN4E-aJCdTSRiVRXHb-W5-nz5obKXBat_6Toz1V3LOi_v8nHor7ND9Tx_p_ly-BnIs9kKlg7RVNGwpQXs6vXWX6KXsqQcQ13tWsM11bcqFLpCZkr2BuY0_jK2_6xGmPLf_PHry_cF62KCxQ7FNBvX8p61PBlsFdqvhr2qOALayfqfXNxS7znbsyO1epECVXxAS-p3TzwdgLSOu8Zx5jvTWT4yABVXfHdyEbRPFsEFIcRQMteItULfYQUIkh_o62QjXUkdZe2P8xvDiPwmQJZDrWJ312nasi1kpJzNStF7qR93Lrkyd9ils7Dm8xkw1zV-m13itBjSWevLJtRTJCe0qio7L0wVitEgxysD-0GdTpeq38M0dL-aBaxzu3Q9qVThAaaTa65ccPzjDb5y8gHUHQnKemeb5j4QtzdNa59wLHp47ftRPpGhZ2YFaxxjdy5nglU0phB0r-wcMzAD3Gg9s1sBQHr8lnsp2x716ReCWS2j2gcRLfWDqQhr8Sj7AZ48OSpq9s8gvQyB4QtrhWNw6OwKlH1lQn51KyRK2zR_rvNXWPCGy9DdTH5fjnyu4pgjDsCJR8lMucoqsjHRtMnWTync2HNB6pOAJuUVcpizOiACo1MqAS3ayMMyKPHIf9VDRKqOSD4qPkh_UXuWL5S8I7w39hz64G581DW_m5wh9yDuqyIjzv_Cae1EcAdfsZ_HRlEYhLqggI9T-kK900YVTEfDTDmXDcpXPRQF5ZfXjPTWOMZ6csD3vg9TYShlylosoFHuTY29_Wi6cVHWEu8nsK3e4_ZE-fvkjm0-vjHuLg9nzPyaeX4i0I7Ro4Wcz9IYBYLBTzENxCtu51ijYcv0jUMFTFEbuJdglC1mS8Xig5g6noEas-ZhMxE0ls_mpa45WxqdL1fNrGHpe6JFOoShMa6pFYKwHI2zpIkxG-4hrs3Z2i4NSI0pGTrqZIGruHNWh5s_J5toLZRPox7whqqOUyIUJdJUWqlx6zMipkidi8deVLMYmswUeupFbyVp4RZocAHDJcWJgoIX0yFbr1P2N05je43YdG6aj4bmDwPpxMhil2hqzSQZFSFKR9yZV13GJPhEozqtAV1kQjIeKlTLlczQ6P5XJCUf7BsAtKeEDX_3JqSlI1Y_CKVln75yuVLRBD6gqVoQWXZ-UUQ_yOfSleyzqQC3b3vb4Vd_s6NaWaX7HKyysOcfIOyYYbJpimEygG1YGo1HcxVYaONSQnyNTzFQihM0rXhZLfvE1vfWznL12L6hS7fv5l0zYNyhh_blakBfff7tpZuX_af70PK9fhM9cPhE0Qgwq0SPvdkMF0z2J6a9qlFKqXYcyON5_SNzCMnDhVsXu-BaSXo05EafzeEq8kfVsl0MRkFVYmItQ8wU67lom8WCZCfxwwEG5QT2BRmHlahR5KkGGaipCpptKfDluxq2Gr0SWIcwFDC0h8uVqFPSc39FesOeaF7CsmvyC49kaJOj2OH_LwsIMzVebWVWWfDPjz3kyrJndC2nV6eI5XEXr0kmb9qVzr9x-pUUDgyk8SReJxzd7_fgV-kZ0G-kCA3m0J3aJCzIvIcA4M0mcwHVpDKorKvhErUcOj-sEr66EEG1rmfENotaxHFztnoxrNSlCy8s_XBw3faXHaepTav81jHdEGb9EfI-YDJQWzTTpIDAktT3KRvpyjoAKL_mD5gA2D4kjoBiityGlgUtZTPS3I2smlcUW5k6KEveSojX__E2Ogzi7xS4IycJM6UWSPXoJSjrcgLNiVKJe8HkS8iUH2nhJA7wpSf33pEzzNefFY-6oen6s3FdK__Z0gx6zahaNJjlLpNpHzd47-A8Sm28VE4Iz2Qg0nf1BWrJaIXSfaAfCiPwXhWqmrpB14IUlGznf4JFXoIQSvcdOEu_tCl_GM-8btml3Kc1WQyKFGdN1f6QgXaWf_vWPhAGLsyKpXoDlwhgK2D64Uq_9CX5CfhWOGUF-klnsxu7L2PbVXSRgN34HhBpCLuCBs29n4nbmM8O3WIU2icRW5zRztEb98hWKvMGIV83Xb5-F8IMFx-m9xb1OOD0Kqe3L9m64qG4urvjUQV6yQl9pdSZwjTdOMcQNWxihHM88UkNoxZUhpUlsYsm-nNDwpXb52vvCb5pVHU3ON7XMU9bvjnRVFx-fxSAtI4EDoL98aHOw80p4_s3tEZHyZuYBDuygXZwIBgzObLdOx3xb2YmwVAbXTZSX7u8ulKGsMxIN62BCxexbdsH2JHIOOHg05vrNmTPgFdUJkPj1Purg9tOsK4pyNKTQorIYidFOgijXs62fMWNxdG53L_FgN_05b3enX1Gu-oj6duAGChmgXbdlWBzi5uwx34QthF7q06EpCbcl_DS9yt7e3_Mnb7QjUaX2PkLBIxb_z6Z4my9BtUvqgsmiZSpVPf-azq3W1YgNzYUbCgkzrKnFSDdPFG5u8z-F9S0djXZeJiEEnHryhiqoWF885LPre9pPhxWruS8oagVlkfv-zjN-lj7in5kdbK-Jr-N9LXFYd-L9YJHZmP-4SLdKqndznSBAoR3BW4w0R0ktKdY-FcmsInft-FGYCpfIvzNAIdRHkFbJxXwyiEIMQxrNnvEZD-5aaKsZvLKbOh02t6BYsvQtWGFInotCWhwcBDBalN4ijJ3ViEBF5jBjY4hjl9kWIktJqQG5DQvOa7IngDK4Z-Ikj7RWt7NquiB7uqTA0ykjHtXUUbdV_ek_tdN-2L_1CT-6NZF6Dz-7Kq769dKBrkINryKE8u_xtEc3w0vDjP7vf_Yr_NQ88f7Tm5UTUkflMCbvvD3pk94vBDgrCUfz3abQGhg-WkhAdjFSNJqwwrg4pG_IlAAW-t_Xo6O46CmkjwtG8eKTrAfkQz_6T0drIC-CIU53TcdxrJKnbWtL_2ii6JZkFjB64B_L_WxX--H5li5uirVHfQd7mms2GD5e7X0FzYRZYC3hYlg5CfhlCd3vtgcNUx3umMx8d_rsUxXNSVeXcsWtsfPb62_zcBTgrTdD2v_5kw1ABuLoXYb8Yfatp0phZHZxlcNbyQuEHQ_2kabZJWiuTsCYYF0hR8vBSSgdZjoCEFL6ErboqL2xUtsu4DSgo_7HY-dvZuC8GCeYTNwUjZ97y7RFD-wdkgia1dFkqlTBq2rVFjbxLoCkV23tqDLdnXe31JF27dgO4kBdDiLCS0jS2tqRGJfWX0Bt6W9G363gbLJ9UGQvTsagTSkfdKzWJcJkN86VUf1jY7lS_jlf7FbpmMtlC6zmfDIRiVRxbz65l1sa1UjbNv9Dp7ir_A1zlqv-CrCvL4VwsPEamJCFL0sHqLAAJa_Bjb7chiy8SXsk2ESXsTAjr32Umv0h6XWd5FLt1CI4P_jX5XGuUW7wpAv2sqbVp_6yIntgr0XTkwOTkdk99G5NN-UC4qlFKkff2c988ZRPpjTEpshOxx0goBel3e15IxciQflMI29Hg8cphnjSFe_JsacaH0KIZ5HybQFpSWGPucrOE0W2DUbTVbYctVikyiZSWIooUcLZ0tuj27F0kaDGw94ydNtNLMw1OHtfoRK1IJ-SFHO5HqlnQ0TDo3TeWyuCuff5ZyHFQFW0ytBe-_Uemw_KkGAVGsNoidbFbNSXZ7N_j-GcPPro2iCOBZDByz30YIrpKu1k2zU-Bzp0tfviMWg6P_uu6fzXNJCcKPuZF-24NB5BvUuwMB7extocHBj89aFswwVBVrB6NCbSMi8od0clQ8jyLPd3EgckrOH3-nkInI4bfwEtPGC2XILblR-9gVpabixErGPpBQoOwZy13MIl37aD7auQnKYsbJ7IWgVns41OHUA7kAr6dybmfrn5mwm9fl0pBFgFclLhCubZlPF6oilFMKEyUVPaxiDWkovm0v_TG2I5BfO-VDW3hSK3yEjk5w5QUaAGpchzdjqMut79lz2VJuig6F22bZyb9D_Zx59Ktsx8mV7qIjT8_NiR5wycayHawfJ77mtGrqF9x9zonI9sEVyMhdMfs0Va_itFGZZp-yN_7II-0QfIeASYH4vIKqUEbxJb3BBi5t_areH7dbP_u0p73Duuhb-v_-8qpqvg_wQ6azurLfwGs4bJtbyLWzUdNeLq8XvlqriNa1_A3IlIdDPZ8DTyd7jI5XUFyW8c6cEw6jkDpuxpS4IN3pkacXLLIcZW2UAAFaIUTdhk0vB20jdNM44hQ7wjNJ04n4ybmbSZ2Clmv2P3j3duskgOFTcIMiMIlDR8deBCnjmGqhMYgaR2l6wb3iyKf9gSSg7hqdOBMUKCN9Us7M9a7xuwUopzOZ8dZjF4OAROJaHlPYuL9aLOUohD6yugE0ymZsB56x9_IEXxuJnS3FwqJpsVC72iqeiLr9q12Wyp7exqfkwbdYC5nv2AFM6HC5LmrPNbzNEQ339WgjO-0n6DzAbhj1rUghxhF8oBRyU-KXmM04PEkTwS3yHV7RIzisURGpsu62Y6fomv27Sg9KrpkxMkFUEVJQCqyRKMfzyw7IwyTYP_eivgeRr55ekzW7Vh_fiAwS5SijHaRstweD7Elhd0AQ2rZ3N_mv0DSoXQXT0oFDWloTHbo0sJZ2Sxr6i1oPwONxb3_uVPcItOhL7sDAWLy-m6iKEKtrXmjbXtAHl1U8T8WjujBGRUGMMNejnkCTwcTbqnTKVed8-Y6jp1FOkbYgKqlATrMRRG8XIsh3Uf4mBoPr0vYU7wBBqMAckKPrEpD73Jno-N_TUZhxA4MPCcHqYl1ivizq27SnExtUNOroZA0wzRdF3-p1J9c4mbSTw4jrELe7vXSCPntEwscVwZCh9OBXiNyKQ5RhfIS1eiOFJkPGCFrFXc1bEOc6VTtjMzlVnKeFisidGdkfiRgFU1dRQHgvP0vz62RPGJJ756jUPSjaGOfjlya1sHMf-SHW3_QvYae4cXC4QdOJ26XKtrgj3Fau2d1ULqCqZXlQvEGPEGKIuCvQKkMixhH1PmZxbnJAqPrtdmQklfaqeqr4_5lA0rpx7IqtQnQn0WbquCRDNSfhMBTJX7fITMXMN7qnt3PCt6CbVlPSv2g3_5jufIx1S4_XqWUR3G-sFJN6B9AJBmcsGrClN88AFoxoLZkTVk9CeDxgKw3ewGAFfUPQaCBuDGB-2oKAaej0qHWQppG1Z7mVebJmjUQDAZ7S5kVswpnfQkP6HwFe_Gxv_-Dw6Pjkz-nZ-cXl1fVNq317d__Q-Zsut1VY77_Um3-ar-1h92_Xx9PD5dX5fyOiJlDzyOqbhziQU2UWb_9xa79j8yTdfWCi0ZSi37RMcXeqxFnuqA17Ukg_TLuZFJa1-6d7jrXp797KKpLXP9Lvt-BwcU4M5fPzQ927Y1v2YqvbNBo9qz79g7cLWx1agslmtBeWmlspQKQbcUKGvxcOgTb2vzFlZqKFp5cN9iFLhGgg5HLdRWaG9GXvB9uH9HHo9hr9KtMyAAq_XHfc7SKBgshlb4fah_Sxfd0CifeUL3_VxBB42UHSA-2vt_VWmT6Y_-tjRV-qT60TxLLHsR6-oBy880iztrq8uOOP2b6k2zF0GXeDj6fWUGG1vjQQHLYmlzJBPmwuSkrKR44oTOYQBE1pKoIchpL8EWD5lqQsV_VMPwwDiJV9Ifk0UNaNo1DdYWMDS4rNH6XONl39ahlFiqWz_5i6G1DnCkf6D2qLctb2T5BiLKHj5hJ2MujU0zK1HNCMeHYtaIxFe9tro-RZ55TpWOn9Yq2907YKbhApKurnCSKmsPvz4v29vnObJkFxNB-gFXty3y3NNGPHpIPKTHdeGDn_78VpULfBUcSfIIx06PjlzO6_zxgy25SSOGeUYfouFptytr6-O766eH7-kemNDTLeQUF85Voj2_OFHm0tKqMtmwrzaE8PPITVX57F0krD7GdVcuSWhC1gJ7MyCRm_XCbU5EcvxUG2TeuUatX4-_ID-Peo9LFzSvqb9iY98QpO-BhygpBYIfP021uQ9w_M9N8_ju9jyJwzu7-374lYZVYGl89GpaseiJBkylJi1Wz6M7YdAdQZwRY_e-t2nabQisxKrshMdSMwumS6FJD_D414MIyGohtx2fmONLw369xmRr_unYw8Sv8TlexKng2tYgqIaf6RX4_4BfW894QZGaBUmIepi5BSu-gRJzBa5oXCVW-KOWv3bSHfhbsA8YUfly-ef7C4oeVFt472Y0lpmd-GApXwfbTtuGhWppGc_P7VGTDkUl48yVOEAhL9wC1XFFo3XHzprc78zV1-m2p6rDdiPscOMFuYE-kjLit14YhjuNCkwnVmOXgjJVgCoGSqZWoMGCy5-8VxApihY-HTPTMtKmZlLXp-ZeMZZfC5fWx1MWo-VmLnyZVh58iVmoXyImPG8i5hgu-hn1SKWm9OeozL8_ynspHfJ3Dw6cBYcSi_INdsy3koYyycUNEp-IRdLuM05dmpA--HBD88Jm1BiFCMezWK-CJ7OPCkgaRJmBXIdRf28bDB9xhs7vh9c04_pb51LvPLkLPC563ZnQT1UW5emlBJpC0b70dLFmnycZySXdFSdp3yDwYzft9ujmJR9SqmaXt60Q-mze-zT94vLfj25vxPsHjGwN2T4RxaMm1T5tiaE7QIGR3TO49YIdFrZ_eblL5z8L-O20lW6okcyp6Vg0kS4dqsjzvmWP4EY7JweSfx4owu4xRdpka5Hy_vPZCIPhj9D5_xvluph5fxK9vYH8UK9nTBknqvj0-t26RbNV0KMpnTxpSqiG7ohGatji7nhT2xt1Enjbk5XclAelgKZl-aVhqC_WgiKyucpD7cyy4wWlBJViUMtL5CdjYPHvR_46k0DQHcaAu9cf3Nx6g9kAC2-RtYmmAw45DZeXFbUpWNxyzS4nvyw9tyC3bHJrTR9qgLPqqZbUZnoVuV1vrko_BHMJvPv1eCx1SSv96yuc68SeuY5YNihVgX3yebU8ZUe6_kbfYY7N92braLkhvaqfVxR1l96PqnN1M1G98XU9lEJGvdfI1VhnyPTrO2t84HqOCeS5wcvZZvihP1LB1AQzit7Tc823gDEdW-or_0wLyZWtsK9Y-T-w8IDX9l6orhOO2pnWonEKIwI7KxYwniuDPT7SZWDNhtu5GuxXQJAzycsiLHzFvZHetcPZxnMvV6sWc2XtgthY6a3XNshAE6p9fvJOVe25mkhcg0BRn5CJv3VmUcDbEouAn2_nBCS86-y-0VN6aM5rHhNuOa8-5erPgAAEShgpdE9YzdJWYLAjuxJyW-Pmtaq9A-liZdnzP7rHdx_bTZ54I_21KcPh383sZPFXKTtKuo2ZGP0Q3MA7fSx6F-hSkmrDzX4gX-GHL16XROQLm21vFkW0bn3pm8cM308zo32nh0Zr7M5IVlpp-HSsGPBXRmN8--KSMv4DN5frD983Iuz6s5mdezcojwZaZfQGZ28_BNI3i-8mWezY3zfG5cKPy4zsv8dKwOl9o7kxdqvvwhYLVeZvKCwubmYV6dp_OqyGrYRpSXLebZgyST4LCDazHfjh_6PtNALJE-UBwEzUUIhsIGh9KWht3JMqh0c1xOvH5pwIe876GmlL9Yd3qRyWcYqrxWGCl6l4fU7yg5jEoF4_Gd-w-JUhOF83gUavpJQZ2ch5BUIGxYO6eD30Jf-97DskKrOTAVZyVcesxGK-UlVGRoF1O4wS7Ah96imYvGuXEou1h1c0pdzd7iZtdioe8kzKIu04cqrUvLZBpMkpZ6jCTU1MmKSrLWnjuNaCXXrtP0-Kg_7PzMulFlmGiPEVk8nA_4MmojjFQ36YjerYplTtuB8GqVrcWOghTUio3S5UufkvcWM5pRtSTaSXu36XPDniurzMc-pgAN1wCMjIS6ltTieNMhcEUIrBG4Q1zTEdwmmrhxpmUwpWmeYY27d7V5qcCKw6sADTG7myQrBYh_MVUMGxkTn-63a6vDTQImULYW7n3O-C9Fxu-vefkp9g3GwnuWD4j06uIZ9PVWi1xm3FxsatCfTkx5Bo1ZaEovLCrU0P3-yK955b14m197DyzwIhNdjXel91kZ1ViZWKMEDPzQs4iJyCc8QybF2XFASyfZtuX0h0nDIcwJBEPn3vmjitldPD_wAsndMWjRhHCqeBogdSOS18WkC0vIG455DjLNqUzCVsC_2XkdmYT3wCPft6e5UtE2EaL9dJ8NwlKihSrw5zgK2du9nZdic-8iuvb4fbNpYrjRzvY5XwDzTboFD-hsHCNpfZP2hs3Yi5pG9F5d4HbedsEX2zP7kd-3VDJk-vitjovlvOwWNG_24mB2WxZrUlopO5VVRd1c3tk0wJ301qGJSAObiiqz6Au2Pgbuz2UqxglmpV24seVVtXz103tmFWUimaV-NWe6uvn8IFM53Q9LiZMaklNvPb9scc-IuUDr7DrwP12jX91s_3T1rNFSC99rtnPanJTuegCAksem04XS0_oiJpWrSpvrlWPAJGu8USdm_MYixFjvzmo-KsnlkVEiNPSvrMrGII2OfjJD3KLtiy2UXgOCuixZDhCdoCSddr0MDuLOQQMqZNGXoE1tcw9Zg1WkjRmnBmk0u7BwkOS-Ac0CQS6sFvkYmXItJVlAaCXFCbQ0_zQ-yHGeWzorvmA0saFdSCwtD8fzcsuhEeHDHW1w-1uPXPmp2GYIxrEfkgPrPBSMBQmUQMwDlRUwBp-KHyxY6xP5DPIe-7SLqqnXbG4W3Ie12J0k6E0VnMB_sVswflS8Y3ykBvKse4J8jFcV6TR9OsSEq8OJDOAlif8RM8yk0Zj7sQJvaS5bgjrAEv7pkTZJZzpFmiTJTdXqPmBTjqQRTYUodeFBQ4ZEqRyi9GU3EtD0o07JckD8rTXgY7TUvjLIdalrGjzhMnPCWY6fFwjcfKOImYkEDKrM2TOlbAPN8nVI0YH2KgXHh3WVjy_W7KNchXggyX9IAVEhBomhwoq2r0cZFPWGfgLDcaL8U4_UHCc6eGyA6D5VVBQ9iDC15DHQixeDAp8Okgrvx_C-KqH2j7V-o578FUDQJabsRGRsTu4oopkmBQfkMaHQpfBBFJFHqS5HmlaDTrapYo1zr98_74xAHeJRfpiTaWCpdhCy9u_vn_wjdhpyH5RYKnGlxLUSdzuc1feprZqRVs_7q-uwnJIRK2Z1DFs1ZOj8r12GjDrl-O7OWyoGn4gPmuFK50kGqiBOGwmKlq8RlvMuGRVXIePVyclOuWB3S9B4axVwgdSPZPjf0R07MjP6AMsUr_gYld1xdeVwxkBv_bLVDcyd7WhWoO3LQB-U9w1O__GxUdEiNA2g1fZ-QuIRZqM_Nz0f8QV2WhxyCZMwxd8E_N64bJXZdKDuhePyvN8Ry__0QKB6a0gOEIkR9qcF0UveURaMLDB0joJgW57uWcxxn_zwyuAwBUroUFzEnrn798uYoTK6IO61muniQ2gjrDxE372pHrYyLaa-2v5MIRb_qSfDucJp7yfMpjEdzogPA5Ih5B_mtxcrS_E_XdksI_e1ZHqCKFr-zqXJ0R6rqglfXeskV_mNUuTiqXhIUlhva4oC7_258hKjBGQXYdHrGG0MgR7yb8bB67_csFnuV4v0iibcfE_wapMaQ01wgKZWXzEw3oTm7BELWf11ztL3WNUICK_YvyzwDaf6i495XPXkcsjf64OTDsaZKPrTSiVDwtd5zC3_jrspLDEAoKwSgFjZJFCnVBg1BEWyE8Z2fepf42vToiRqAGgnDqtqtyMRD_7C4EKeiR7d3uhGkd7RCpLG7coEvyxN2fa_Wb4WwJOTWb-0kD-7umIrcA2K9DPp-9fDTdLFMQAo4TEoqWdfkhTSxPi2O8CJIy95Fd5nPXGSd3V1_v7HKQ1mu52YwKGJaWXfNN4SFPnwr_0FzPzhFX3r2IRMzdpg2hIi_UfeasZzgBHOMXv6_0xx4NyE2060fudTb3aOkyE5qja9WlFBKgwQwOBL7dVtHptdi9dX9tNO0uZ8OGr6EHoum71DwWk57f-pBmm1tKZ0Yk5M7fq0Uzak2EqXBFMx8xCPm5Et73HB9i_smkYExTHYIF08NUQ0RrTih68_yjMiT7kmpB1tjeonjaahj65KNY2E9nzqEs7izKMmlsfm4yGl-FcOYyPa24JqPLxhxOHRnB79prX9Zo0zsUwsokxV_YQ-azEJUMpKsNJ5_NY3cew5V1ceBmkEu6Wa8mcp0SDXFiep0s3Wjm-Lcm_mYKRhGgycJ85jCOsi2HMA39JV50YOxQ-Q7MBx4hQuf_fpWHp9TOBKq0KD2lcL3cKT5ZSMGoyjxAd6Ntj39rr26U8EX7YbfsbG3wZ9sOs7JfrDvoPt7Xs9v8Z59qaccZh1DuXnaCML1HT18ToVRzHc8gd_FQWVEWfxhmfBExNmV7n30CauFJzzEEVObpeRSjKKaIJmV8N9djpJnjJhJlOKCszHSXOrsbHWer3vO3Vap1SOgk1OczLkPI9_wqMHHR3S0rLAHXj0oJUetEX8Fdrcmfb5mB0R1v-R3sLJgWOIQXWJVt0DPY9O9z1fuk5_kWrq6yeloxZt4o2bUIjyF1p36giJBCFMX1J7TUczqFYRKYn6S8ZyGnOrzvrs2uCKpNW0mW-i63NW7wUM6XcJMfE-Q0Ij2i6lQvR08MCgkznxypjrqSB1dG2E7slla0ADaOuJgZp13_LSSrpOCk-df0bVOE1AVRt6vjaHsOsmjBQayLklNIM4Wvx9AvYYMQtmqvURFZEwvB7QkA5n89T2lJ6Xb_ShqCEStDUex_zyjHT4nc7KFs-Imx-zEXziyA4HF03wC3GmOABngNeabzAsLa0bPX-jo0CtNCMs6wfSXRqBh1mve5ImpmAqS0tDNqsu1YH-khjfKfo7t6e0WmXr3o7hp0s6i7LaVJAIjXhm4tpMEEqPM97vTXHPW1EXR8M6kHcDIsA3rPHy3cKGhdamOzs7WfESEz9FWAEmWt9GMzoICPPor9sx7MMbNHN9R-IAWfSIVQAKTMMIRxveMlafSj-B_QMMHgAJAdGJLLsE0UGzAsCh0UzP3NKr7OjvGMDkGUrCHMzVaGA4FSrVgFm-8X8aGzw1T_RZvA1YfQvsQFOVgK6ezxOVzpkpl7PHJPUCVXyRqwYlB7bvZZb_afnKthGzz1RRbE89ppsbZ0YupyKBCZVrXLNKrzEbDHIKm-Fzvx204KlZ1bX64b_vea7Q6irJlUipUNp55jm9oZNOK1a_Jr1gQXMAYp0DYXCmehrIxsYDwFTuj5YtEw9cxES8wrUxypmzo7MgA5sqF8hRk9qP3xEvScwgCVVnubWI5oP3DD03lZBphx87phfcqDeyCo3pGwPSd_japo_VVgOzjnFWhhxMjghS5L-AVhuVS8Hs8pIOE6cypE7K7QCc5GTX_1vVRgANsL3Ycgyu1uYer8PBGwVJlynp64wz4m9GDS2pQOQjsF1GZYNB2hLe0lz0pX7bqUOLcfP5WBNU905wcte-ratDf6JTtu0f1eZfhbvaPuyZBc0Cxw7fHHNOBCOjpP6Fq9Jmp-V8YMl08gvtotADImW24iyM5rrFsZnvEDxSXNCjnVVqXT5kEqjOAy5gI_Q4IQJkfwa1cuMcyeCqVvAwKLyenJNebSFt8AssejOXM_AXczDt8L50APuVQpWDLXN3MPFHe9dh9a2ILZCNQqk6zVAL0LHB-Q-C1dAaGdsB3fgBwslL_k0yuoLF2-BmTIKd6QBwtXZwSNLKOFYCeuf7JLEtIcY-MufCAaExTQVSibmJxoOQU05ojnHaUoYXu1JPZiMxoLlS1KaIizgqpdcelygdQWCO4eLRS6EzgJpKiCkkxoJREuR-cclS9f0tVQA248TmAXO1RZFX06CqZQWQoWIoPMwQOYG4EeY4iGTLAnDPb3TkxF5rHCYWHY6ygJf-nnjyO5rmVpiJyEHMqH5KTTlmK82cyeoSc_utOpHDTToubq4KL18gLvptJ7TjfMsln1iEKrSxXje9htWCUi4E7vawHXe9Uw6itV63ILuPzheQV4VJl_rHU6OL0tW4XZcKiHkRgG1Dzv0Mi5cyfwJFL_J4lCObLqCFAODveEm7FvfLNQOc1bwXr7C8EHbKTV3LkPNuc1s0CTziDp5cZ0N3rRjsgS_unKdC4qVX8nlO0FEt4UOr_U3JEe2FstAayuAC5b9PNiJuMdP8ggxxLoPAuTahFkuYKYiqBMswQieQVgPowY3v9LAZK_zWQXyIllAy1g3kTDKuEpswmig3AnAoHgL5JGXPz0WS4I8bigWV6gx1Dkdf45uEpZSqGE7G7jADpeuK4XTvxIxsbYsETsBOcCsEm-emMDfPMopGUDol0Dn1XtG5YWM4Bzxtgwu1BU9jiGOiNMm4UUSFjVRGPnItfRKuX0Q7YsM_AHKM6DPlj0WIfhEdbr2OhRLEBbpxrdLc3NwCkmOiFdE2c0Sj4BfsCXzyBK9jAYsIg1xHPwlEQJs5ufeEl1TWCaRg-TaDb7JGAUGdCJHu2iK--0Fpi9kLo6lvf3DQ5d5npA79vZoJxMgz7UgnuX2DP63CYzpajOMuaO3v6hCK9nvdwIJFEBt1STT_a18F6AFVUwoSJJRogunim-myfRuiEBw1YFdd78BVvKck38Lxa550oP0H9CeiAbbcp4asy5ouB1Ec74C9cClU1ebjdUKuxb11XAu5Pggv0bGNnQlmpo2_c6nd0BTJqT4F2OGPqYJp3IlPmRZqohgjMaIk3aa2WU1hyxwpwtZTWvVgAT9OkwPUZDYGwl3PGTOp9lmZJ6DdA4ddZF9OO7OCfAGordW3DbByyHyxsDaoaKUtfHyUHo8qb_KCRAUbDdfqlNJXtIOUp6BEmJ8LX2y1pEuMcFI0E48kM-hjPWaAmZM50FvKPeCBUmd5dA6CVrEvdCabz8ZXa3x8ISy6NliC1aEIz3gmfCV3ATBhosNjCm1xkoVLkMY--mGlWSNNU36EsR_I6pZyNQMFFjGwEY0CChbcoGdKKVFAnC4aE_pLN1Zw9vD7mTPMcOXFZ9J0nEmHBmPm_15izU3Fkp6leKw9RY4G3zLGy2TZJoOLWeof81diugZRldLx7ywIEopKrbrdYw_zyY_uCIxo4lEnirJUWuIJkuRMcjxBm1ySD2Q6fkjdgh47XRP6tiW8Snb5I5GkmWmUGPmpq1UtSTjOFwons_ZNYOGLUzpa2RT1RI0PZT4rjDRSpnJnIHZjdYzmaHPCmmCdb54tvkfkgQjGRlL1rb3nY1mXyCKFGo79D0gzb31Oyc4dTlWSg6mYnJwGZpShkgeccg90ZFa_fQOpvuWbsBY_TNKxZUTx25rJJOX6IuCaFCI56OvLRxBcwjmRPP_Jg1AiUcQ6c2qqbwwkBzUddt5RmO6RWiQ0VMZGQjUmc8R4DtF112xOkJM5iUh6d0go7uML4eo6UHleJVrhibhToKy0OZEgzGM64YX3UTqw4eL3lReXz1D7xOxuomsR5W4pe-DA3LB99dqv6Y0MV9MdZNwLnMTXuHKVos9K1V6Q5U3l-UuV0kepcZMb6VVcO-f7ZsAcXLWtBFVooaNtSmCQyhPEVYPSPW6JENZBers3r94acS3SXEr10v6pAdfRDRVpsUhqnoHq6jZNOhfJHjxfBfwlV0kPIgg9p_rlq-7kKhmr0Erds7Xar6CgM6epXp48asfHtD-fgxVN3rEAMVdwB_0fqZbX6drSxnclJIVFlps9eIeXf2flYSWy10GtZtnBuyTLPyY9GuXxHv3BxmdCWKG1RiAJ7ghILn4hbLC3mOMSUUPXrgaCqWB9qT9yk7Rd6z_y2Ey_TyW8yYm6OGyFYhPSEbosGC188uS3yiZbSlG0mCZStNGm3RDd7aCVVVEZdoWbP1vf-y0MESlBqXC-rx49gnr8LtZjJuha9NCQdz6c-2yHass-sqmry-tXkoIP3_0redLH4Dsjw82fhv-LXHU4PL7W9SQYV_tH80XzxLaB7YkNkvOBGWMaa59U2yTikwiLwTURRybnqGT1rDf4iEgclIKLp9qavBChyUMP1_69Wr_EmwdyfHCqDhmXPjsJxm9eDYFaQj-LhvbSMttGpbN9IMhZ0QMM2uC6gVC-rjysIR87EMREARfgKOeGioFyyxEwf5uvNiC0VrXTgWpZQ7gDYEEAdI1zxWHEJygFGRoGsMcS8d3O4UDuquwA6hNZ53RhBI3KJHXcq1iSOeDob7dPX10noXPL9uemS3VHDIVzwn8LmlTYuBpa5DURdPFeupgVoaHQtEdznVWLLyI0FMszyYKjzS7Djezd5aHTay75Smx7sQcHdaLjgvZ5_PHyDzZhvMQQ7J-k_2Cv3TQUKRHpiFmvim0T2GtSLpImUoLCpWbHWtTHMkLilVWoso18DLGYmR9kYaQmszPY3OmBM6eVhscYnch_Prxx7U80hiHNI65LC03jJCpbub5yNRXcaFECgZr6frp_FBSYg4wQDq1ec6AGVjPq3u6Do-AEyN9xWElUhgIuGZHf0o7nuIufUHMmYxq05TUHgU1EuL6ZxeWoMD4N3xCM5mOwbSR-tiCPLL5Gx2gpwaL8AhAmvqAV6nsgHsvoO7ymUDPSA5052C3H3_fSqWAsdGp7tylzS2TYY904J0ERoFPDFjdxMnxSdUs_eU1LxfxgwuvkL7C2XRkwrmzgKFwg5tu2-eXUf_lAdRS_xHYvEMA5dOcPQOylIRD7ibJRIuR0dOhid18l9fzL9q_YzBODCRc4Egzsh2Yg1n5REhgnv7smIEgNzRfSBIHbqwNYDmNxYmRz7V823EUCYczo91C4_OIkPUBaYp-8YHAtnavkjpkiJBAACiWzDylI840mzsIYRMyFMXX7FGSFDuSEQbKzjt8J7m0CnnUdk1NNFz7F86EJ1eO1f1neTpoKlGQTjxbeKROhSQKKCeJNsO3VprO7hSniJIEHTLRNFCU_po98Q1h91jYskukJy6yR7wwYQ_MbA6VruzE4Vwa6jn-NV9CEFQroVsdolzRTreoZviqsagi640HBjvQKn4BiHT1mB2GtMqkC6nB29-XkpMSjHoVMrrHx3GWRyhjrPFFFaDqQa4fLgO0OdnZg87gQihChCd7m_OQiHH0uwk5H2DO8kjZkXSHym9NwduGN8PmxTaHjH8U7gybIXKT1wyOI0u40DrF9VSUSPLXO48aCio1p420pqZBkNiuGTV9cyK9phtpH7PuDpfg22DX8UekNx9LnTQAsrF_WpdBY5yBFyEo3zgSVCkC7l4WczA12LJlubm7dyiTbUTOfvpVfCt32kuax9PCYcS55dM8hG_ypLEm6OBy9hYN-ySzfOjX1LIaSeNmPmWhOTr5KQFgL-F9Lp7HYrRcfBrd6WCys5mFHwISFfjX8nW9eDMR-MSmuhP8YB_C6veMcdX1asnPr_Ipxo4HTNBEpQWtbS3G9USgPh-taYOGCZsERo6ZSYreWzrYHUHMyc6jHpcyyyDnlpETS8JtKZIZM-F4iNMUCUggqszBxA6QI2RXaRO1PvSR_nSOWxKDipbcS8gtz6-hcO9tr7JHC0U4pvV4ikAXK5ccmZjiLGWst5CeCZPhQtAt02B6ZIoJa1wwyyvq5ECzI-EwUIk0L6AhzpYJ1rfu3D0VgaHq7W9RS3huhl1BUfajIJaip4Zo9Wz-0fQHRsXAs2ib5scLeOfHzwzR900a-F4oRBMeZY9GLyK_XeFDxMO1_Z-bfi_-WzuVs_QLecwn5_AuMxrzPPiTymysqrM7TiC231fw0rBZ7D8fuVoJrDFNsPqwD_OUaWSl8w70G65bhp_8T-Z9mGtZPmmO750RRwiFja8CkE8KQCHwprzHPOAARWUc2J2wZQAuNj6fpIf1pAb-kckGwUPHDejYiVDcKN057XTs0QjX8ftQshhMSPwLOV_-hAtFdwJtHrk3GQw2qWmbR8qlXAVV1_VHcJ3dBf6PkEVVZq8wv_cUqNGt9aLSgrp3m5cAZEECHBgdwEFArgwRgIvFNqw6p9TO1JgW-0fbrrZ_t_vVgQf7kUqMseQ5fQPhmeHnJduPjjYTrLMkzFlgpKyKikzMYoiasPJMU6B3V1Z1W0l5hWJVPCwpJHyze5enIb6R60WvKXQOWsbx3tuaFfoa4f9AdtKIh49DWnkgosX4mc7iDggvFELQPaStl5c2sDCkBrPjZYPuhjQI1XKZliBimUtqQtrWZEXHtpRVdtOro-VP2Uuegj9d6jvmVu8U1Bn0O1i6pbzqjaTtjZ9OKuFv5PV6UBTFl45sAa7-vqe47kwDv044olnQ_18w6FvJa_6Lfu4d5uQWSmnM1e8OcN0xh_8ToPcOI2Dhgin1C5wqehvvd4MteLxG9n8uwB2G2aZ0r85Cy8ncJsw1BkFJcCTOAv2ngi4rBkZqENdNWL6w4pcZYK3XdpEhi0mDTku_V3vRs8CRjmoZ_Zz0Lx0qW5fmOPFxH1MabUaUx6FwbgKhArIIeG8J8hjP4XXNGmVDZARj_qxuC-NVuRyf3XxeVbJs23gKQ3ocoD4_G3JmzNoLlxF0Y3ND4UT4EN-r3Pvoh3RSWHxU95qWRxm5yiPCrIPWAiOK90LtUR6jh0XV6fnxmghm23Ce70Jhks4H_hQOoFoKLQrCQoQX-YxAVW_Y3iyFdpFPs2YAQ-1qzghpTlADo3bFB2KCyPfxFQHPE-EHIp6Rh12OVnnZlZWRj79zP48C8JzXusRO-VLcA3IsldHuSQLOPYk8oMTbLyxZh3TJXif08MZNGT9uz7dILOc0JYzh7YpdNqEg4zhF2Qx-ai7Ae3GrAsK1cwG0_9dCFIEKHMlhBFeewZRY4V9hZuHfQUUIjGAKOGhBiGBcjquB2IyVs_AyM55Thx0hkn7IBGkXvnCKlz-7yohVEQuNzGmRyn1QfBsucDvpbrHqnZ0egCexgESr7HPRvY-h-AwCrb76Pd3NSApONRlWUXm_TpqiI_mTSRd0pqxykPUoPUj5lUg4B_bAWb2_DV-H2HNCo1bc9VnoZOkAefWVdDuOLtHKvDEM5hgM3y4za6AxWdkJi3HchV023M7YZfEav5ju-woBHJXgaBlLffuJkC27t6V6REdTyVzwFVH9bIBoR4eT3PQeCGyts0Z6DkWVHdlt1OLmHib-Jez3d9NFy66lXODwwUoeHuEbn99uQcTZIP5WnLb-aofrOA0cJdw5okFCASgFZZumpzCuRVPNNk8biLAo1Zg6CU8uEzRDaoga2_LT2zWqebmaI4RiTRwlZ2F5QgWYoDKLau-Avl7P0CyU1cvMgWE5TviEmQAWm5gjVwipfXohrfFfrNO_QR-JDthOSvkk99Rgc1q0OeGW2UHAXPNWrDiHuO0jTjv-ykxs4m3zU37Vn5IxDeB-ZONIfDyH2m85wPgkVwxo6dA0x61TlCu4kESXkED1Pt36IYtEBt8vs6z9VNpDV_Rg82OAidJGTkD1lGTPx3HEGxjEbHFb1Dk9W8fgrZhKgEJsStho28pAsibvA0BiCJZ6r7ZuHiIWIX-kN2_jSbqe7WWfN2AeIKaIePr41j8zgdcKjdAKnzFqYGWl2YbZMt98yD62T3EnUUkDiG__khXLmsZnqYAKn7K1opgg42MKS4GRWncCa_uGl3jN3_8sHGRqdbt_o43DD7O7Gk7xAJQhiMDcGOHlIil7vv9JnbMtwwSn7MHBOX184r_suyg5e1k9suKsh9D47hLmoIatxcDSIswxuT6xsWkY7TMn6ZAIHKO4N8B4fyGUukU8JH2Dy3GHSUN0W0Y74OAcdAQV91857FQq3Z8w5uY3j-DgDjqyvvSrMy_Lz9Ww94-yTEQEE615i_WrHhv00IfD-QIGwhNdWVkdVz3kAuRj78bH_pAC-pjnjXHvC00PcIHdKJ1T5NclGPcMKgVLR94UsruFF4K6c6hob47p5OEWXPFflYOmPLYC9-aF0ewfALC45plgmOil1W713gtxRS4nbWNaPLdEUbWJ3ECfiiPMOEIs-EXY416x9JBmjOgydse5xXnQyc5_gmgVHzBQpXN3dxRQniMdr537IahPDTZVIlDgIJAZ7VDKiml2CF7AJpzGgyk-muPj4MslzBzwnnPbfduFyCgNqqw2LA_vpaH4ck-mNe9mTWZg5Lr5gvmfofauUMe4OkNC_RvICwqv6TdifWZVVpTjszEI27nPHxGc55hiVy5JVd3Nxa7zQsdJeuGfIFLkhG48n-hvaNDi5H8EbUcP_o9Pb35117aiSXEUjofO-4M6HPqt806CF9EU-QCpOaRi-yLpTnnTOvMFs-yv7KCXcOm_i4lp5syyGlX03SszIu7MtGW5q7vP8i87uQf7UNNu9fdTwk1rJLs6vkhTexMXOudy6VntZOXxePHjiQS0OEc_g_sZXzW7uqw7EJXv9QN9pbH4qfWvz6RozqX-TNW_0YYjnkaeF0l8H9I-ddN0uW5rJdpx1-hu1z7wYs1i2tfNcZe0v97v2iQ82w1q6WBUacK_0iW8R8ZqWJE-xOmFQR5Bwsnt9_bZhumQUO2unciO770P9hqBdh21PwiPDWiOZ6vQjXlnnmBAvhOpOu9tdqOecfouP6lrrqrOVvM6Ka4Ypdf6YEvDJ-WHUR9-BvbD10CWgi4-PuiQpEg6d5IVLTXWU1NytuLsqrVlo9Yg2Fo0ErE_oxwjSd7-UDgFVU679eIi0wqaRI-pEBVPjmyalf8L-JLXuzCWR_WKWGSS03Pb6kCCa_yFjRXkMb4HET-ov_v_p-f__XT27_b_VUHnu62-KzTFcNN_tl-ZGACYxQdV9F0phUXUO3j--SyN8hi2A2l6TLjpqQG27allGRNhJlBBPRY5qjn9wFTCxfeG7dkQ1jR3XPXkW2WPaP7Yfe6uGRBzaC7-v7GJYrP5rKqVmjYc7qmrg9fFpLHy1HY4aM10jPl_045gfx-HokZgCLsUjCSN46VGpHZvrwGzh-Pf4d3L0584dU1BuG4qlxePVjDxVD_otCavMTAIfpxhhXs7P97ad00o3_n0TajypecLhmJWgaQw58z-DugnwBiGmuQDS2s3CetVPPHG4pZknSNLf60IdXl1_xHl5DVnaluURXprLQyY1aGMm5XRcdyk9oV61aN3ttm5j4yNH6lV13f76tfZMbLuBITzVXPo_JRAsSrx6XKL47dB9mnjHhwYdIVgj1mPH6t2TsjyovWuvFj4SrGpiy8Tmp73zmzPPfO3HKlF_-1C2MfQu-3AZF36Tuzv-Fo5fe-Y9_V91n7Vo-sSslcnnto4_Y4H83azqfc48ygJxdO-2pYs3cAFa2r6806DQ_qX5lfcR7zxv1r9HWKYEs-Lj-3aumtaI8etWy_29755MxtYSZ-fXnt8bZdJF0TGoArfWsZRypnqm59zdcbe2M37upaIBGf9XtSSKTotbSmtBdB7UccNdzhuqFsOLQunidUBY6W0RmsT3PPhi-cqJnOke9cpj-Iq7Ny0YuIxT5Bbw8tEycwZICyvJDR9DVV1-fvFXN8YKCY010cwiq6dLxoK00qolKteRsNRgESgB0TiuT6V_XmuCvA5GEhVcn5SoZsGo__sA9DkVd3By-qxL7E2YmUvOj-UPYVxzwEZJ0_hEi5tMG9rldj_bAPBnI95cFdrzKx1rU3jnjbWk_BUsD4T90Yqmon7irCCtaZjC9DOaqhlTKwjOzK1brcgZrKQJDuZ9QkGTRywpw1aHSRmiufebPDFn637vxmZuLuZgtjHTxhv7hIDF3KZOR9oCLQzks63DnRiMbMfgTywWuJOOaRedUZFapr24U0srKWEEFbMfuLcxRjj7Goq9uEYqzwYQhkQaONYUZMGe6CoeQOeQNXuBSNqEZYFkZ9I6rgU8fxXQYQaIgqEbakfinoT8FnVTD3RMuAPHEA4kq-G_ZvUNohVG9wM27tj4C6lbX_G8jM4EPTsXOVOoz0dQosw2HGsMqvx7DV7TQCLIeVWBYKfM2wCGuFpLs9S4ziIpWrRLsvgriq_grXsuqgp5NOqY69iIarG0Lp0-VtwaTi7pk2_VZsKbt5WsVKwzP416yf1QHV8h02fXexWipWwfwudhu7tjBp9bQ3_XUcF5Gk86Ji-cOjOGIRBczqxzifnYr_fe14A0qX4mrNrAmZo14Vp0u9GQD0PtKlt-qhSFesgyA1vVGNX1WVpxijHf9uvXshHw-c3h_e4r1_peZz3wjNLJLD2bIaATY6-6KfHR6sxVwhvev5PIY2XdTnmle6Jop94GtQRZQQa5sGGS6ZekbAFI8kL51DEzhMXYCRwbgnXS2TSs51c7m0NL4bbIiQJXcc0vGBQDS8_z2gLIFQ-QAScbKPLTRny2czfNRaA8eisncxeTqXClkMJBBfx4eh1HZXxurAGdmzDlsAr0nZGzWmHN-S9K2NN066hLj_16YSFQj2i0sdRZCKg0bSK226Xzhl8gF3mGq1JQ7DsbAlSRXkBqRlkSRssLIrTucImtQikWUnLUPp0BmspDR-ot62-SIT1O3jt9DUg2rKZ_34DgEyeTPivIgkL9u7fqQoaSl7fU9EQisZlmUS67Ik5ly79BGAOaOUqPFTbMCc7yhkLLEg7SIC87y1VHSuWGjt52Ujw-7eYEU4k922-nFCrolw78UZn27iU9WTCYPrpBeAYJ0RrBqxs3D8_v5xqawBHRzRcWv79ssbbpo75cioyBglpFpjQF_dg02AHuMHNVTiPGZUmfMcXj4KMyRz2SWAXAa3VSxtFY3ROQeTBDyYO3CcT6AbiuHwd9wGfgCFk3yqxaSelpPMzez-qgh87NKnEjVZ8Coaivr_px_EweMnjqQdn2PH7T8JZVmNiTG-mEtoaWhScpe2odRFl4KvsveuInvugDaSN_aJ1tDw0CxqOLkpY-cOSiouNYRWpcRpWvYdHNUfhhuBbRagoQOBz4cDXnfYdSIlUfNniNxlnXPF6nTSQaKx5xfrmt2wiPlFrWHVMBECJY_gT0wgt0_HVj8OOPiiET2AsIvxro8yS80MdWL6s2q-wphXyE2LcDIj4pufTig2wgyEJSI8KcyDUTP8kQk0ZNkU_YCm7jjif_dbbjHz7AQ-m2OuQ1KKeUTn-MzL6yaCF7HZ7U182fQHtwOIr7KC44quI3QlkTKeFqIffk2VKxNSVG2ElqBYiivtb3nwIK_5pu7XDPkNNTha07nY6ODG2SuKo9krpGaw27foKOEa-lRCWeOYurPgl4h-p5LV4VZyTkxDcEgews64yRuGejQWVLQ18LbL0bwyorGbrQ74gHKsS8ZVKTqdRCDote0freuYgtRuEBlcjxiMJ5kWkXg2mMMEl4BWMPQs9JSm2dC_ljs8Tk2GfxDPWwwP1_MrUVSR2lu1bUOJY-o8yJR_eOvvWXS16OWZzgjUHokSnRX7bOqBQQxESeNQWkKchCJ5R3mn-j0DCP3dNOdy2illfZVpvl5HHhCVTe3qtrUK9AeOV_0Us1qjmjwqaIMz9C2v26TWIBekUmWX2QGdAuMUHJCPTv7Lx7SmY7KqSNS7SC09u3MN1FCOxyatVHxLai1_JfUt84SlwegSMFWMIPY2SVHcxFRBNltrypVbW9xlEcmntw-7oMUV9G58MvigMgJ9_iOXrTT4MwyQcpw-PKrBa9_V_zqGBBHDDViC283lQp7dweZumbcGsYim6NCirLDmqIqnWQLxjHrjHTzXvv1dbU_WxFYlfSprrk1ceBP55X3svfrA7frWjqWXFy5COJz5HEAc-fz-tUQSEzXpBJgDI6fWrtqqX01o8AgW65U68RHWWO32bYUuFxc7E8KUolYexsEpChMYd7QuLrRjTrJ2xA_3aU7cfFosLpyzrazo3dNp8rnp1earK2pA87XGySvRI2U2x7IqKgHV5O0gwRb03kvLMHuZMpHBGWr6PR-h7lxBI1hikZICej9D3WMIDAFBEyqt1cgt1lL69TsedP78yPcz4Lwo6EWGcaKOXqMRM6OoHuBHlxXKTe0asUcZIGTjuz5pp3fI_EA5FLiA8H5KilkrG26g0lD2fFrDhMYLVxohyglRytLg13bCo5gkooyVtFnlC2EpjnXhLvR2zjSQIS3e8jqiKmyO-zzRhAKVOb8Ygy894IJbBhum9UinBqJE6f0XdOgm2dkIPDAcyh6Iw0TDMJiYMdP_wiGg-ZpzcX9Zq2YpcyZpJDyZOLMB9tQq7S8nd0UyzILQcquGhCCSGJS9DxilTDmRqnn9Nrl6y250CUSaUAry75vpJg6cbDgLMziGt_sdad93ugKcbLUdyxy67HkYcHa-3bnYi4osYIHLAP9xP5BRQ8a3IV6Wvd4Q11_X0VlNsajEkxTtRv7G71GeopktRweCGZBcNAqhye_FoMBfLr8MOyHcuu7yZlC1HfKYhrgxJOubKBSRos1Aa1_lMVak8JtcbLNCxTigUjhXuNVO4d84WZ-Ip5NVljB6OwdlYh0pDrUT21CHXL30NCjqN8jL2TeK1GL_qFi99-1-DXP5lrwZWIvnvMVphlORwURvC7H9bm_loHfZhhBrHkYJNQH-0Qm0L80S6b8Bgw4_rDiQiMB7_pCTwrCFCPeOfwh9Ad3kKMviDIORLt_KTY-zsl_u6_-O2Q7m_plDVoMe7-VTr8CdCecIc6DGPRYmgF78TYP5QiXwtO4_rwmevf87rcg89nDGGG9r4se395Egey-lQUwcFpvvH_eNWAuw93ysAARFTheKWDtn8T0ADPqim0xpjf3ylFkZxkzIIxhNhB_qD8Rt8yV51jeb1ROkILTrdTTVX2gK_aKD2Uxvi008yE6kU49qeULmUzrsKEy9sqV1tJ3sfSNl5MqLSIE7qEGo3RKA-O2vdl7Ic4YWHT2JzySpkCKFYi-Vgz_tW2uMzq3h5tYAxMK00iRiV4nUR6t1EUlrOycpiq6X7URNcy30UMl5kIA83EVQLDdbsHTh2ANEdby4dT7NQZFN2_HNHMkOCl2Fa8IIi24rTJrsr5mPgerHoUg4Jcdxv-tc4QH_KHJycmH1UX6eHsGQZ7n-SIxFZbrJgDwPbZJ8M0w-YERg_T8zNn-SdeZaS4jqAPDdN8RNMmv2-DjSHB_WiQIk1K08sabamCyamU-p_bwRwEsQETD4yb52Gybhp1xz-fISJqOTKbf90m0Typavsqtb1iavmO4tWxXnd8LdWqV3wx08I_VNQt2Oa7YAPlUPPE6OY-nfxqbXOIWEtBI55B1Ug6SANnAXVKYcvJnFjJtiX7Td8lzlgsjeqiJNjqwBb2-yEY8tL_fmkitjX1cAsoHHtOu4B8lpFKy5BcKXR5zESq7XaCoQEvDvlpnZtjS4c3suq_0pFZZdKlkzvlCUtGZkODiKUoYhAn9puZmlxRlLRm7S5Ut6cSFk5DeG9BspTVTXZhNqhAyaVUhuUkscbNZ8dTjpxHxuQ4P9Syva0Jvb3wHHk6WEikrC_K0TEeuncWPZd1c7KBZ0CarpESpshPwJn4womCX6S9MVoVw_W2rq5DbrqC4_R0VaXHZTiJbe04cjKSPQR2IMepB8jBFiLXwZJuZojLKSlZzpVZ0hkfbVevU1zpfbrMVE1iJoPqVD1JYwN2TTUEIQ1QnFqV44nwmFrn2dDwKK51UEigJQB_iyv1sM98MLUpqT3Apfgbu5qoNLUBg4Xu-rRkaP7WpDidSyMzvbI8uTUq6YIoTKGeq9Mv0ymh7fxGUyCd3gAWyDjq_v5MD5jJ8msB"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,x,A,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>ex(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:eA(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eA=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eC=(e,r,t)=>e[0]===r&&e[e.length-1]===t,e$=e=>eh(e)&&(eC(e,\"{\",\"}\")||eC(e,\"[\",\"]\")),e_=!1,eM=e=>(e_=!0,e),eU=e=>null==e?Z:ex(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eP=e=>null==e?void 0:e.filter(el),eq=(e,r,t,n)=>null==e?[]:!r&&em(e)?eP(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e_){e_=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e_){e_=!1;break}}}(e,eF(r,t,n)):eq(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),ez=(e,r,t,n)=>eq(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eq(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eq(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e_;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e_=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eH=(e,r,...t)=>null==e?Z:eA(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e_)){e_=!1;break}return l})(e,r,t,n);if(t===Z){if(e[ei])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e_)){e_=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e_){e_=!1;break}return t})(e,r)}for(var i of eq(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e2=(e,r=e=>null!=e,t=em(e),n,l)=>(e=>t&&!em(e)?[...e]:e)(eq(e,(e,t)=>r(e,t)?e:Z,n,l)),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eX(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&eM(!0):()=>eM(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,ex(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>ex(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rT).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rE,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rE{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var r_,rx=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},r$=(e,r,t)=>null==e?Z:em(r)?null==(r=r[0])?Z:r+\" \"+r$(e,r,t):null==r?Z:1===r?e:null!=t?t:e+\"s\",rM=(e,r,t)=>t?(r_&&rh(t,\"\u001b[\",r,\"m\"),em(e)?rh(t,...e):rh(t,e),r_&&rh(t,\"\u001b[m\"),t):rM(e,r,[]).join(\"\"),rF=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rP=(e,r,t)=>null==e?Z:ex(r)?rC(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rC(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rR=e=>(e=Math.log2(e))===(0|e),rz=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rR(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rR(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rD=(...e)=>{var r=(e=>!em(e)&&eA(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rW=Symbol(),rJ=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?eM(e):Z,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rB=(e,r=!0,t)=>null==e?Z:rH(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rV(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rV=(e,r,t=!0)=>rL(e,\"&\",r,t),rL=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rJ(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rW]=o),e},rH=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rH(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rX=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rY=/\\z./g,rZ=(e,r)=>(r=rP((e=>null!=e?new Set([...ez(e,void 0,void 0,void 0)]):Z)(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rY,rQ={},r0=e=>e instanceof RegExp,r1=(t,n=[\",\",\" \"])=>{var l;return r0(t)?t:em(t)?rZ(eW(t,e=>{return null==(e=r1(e,n))?void 0:e.source})):eu(t)?t?/./g:rY:eh(t)?null!=(l=(e=rQ)[r=t])?l:e[r]=rH(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rZ(eW(r2(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rP(n,rX)}]`)),e=>e&&`^${rP(r2(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rX(r4(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},r2=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r4=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r6=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r5=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rz(l,!1,\"data classification\")),r3=(e,r)=>{var t;return r5.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r5.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r9.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r9.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r8=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r5.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r9.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r9=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rz(i,!0,\"data purpose\",2111)),j=rz(i,!1,\"data purpose\",0),te=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),tr=e=>!(null==e||!e.patchTargetId),tt=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rz(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:tt,purpose:j,purposes:r9,classification:r5}),ti=(rD(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),ta=((j=$={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rz($,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rz(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=tv)=>(e=>{var r={initialized:!0,then:(e=>{var r=K(e);return(e,t)=>X(r,[e,t])})(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,tu)),values:e(e=>eW(e,e=>{return null==(e=tu(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eW((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z))(e))),e),o),value:e(e=>{return null==(e=tu(e[0]))?void 0:e.value}),variable:e(e=>tu(e[0])),result:e(e=>e[0])};return o}),tu=e=>{var r;return ts(e)?null!=(r=e.current)?r:e:Z},ts=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),tv=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${tt.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},tc=e=>e&&\"string\"==typeof e.type,tf=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tp=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,th=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tg=(e,r=\"\",t=new Map)=>{if(e)return eA(e)?eY(e,e=>tg(e,r,t)):eh(e)?rH(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tp(n)+\"::\":\"\")+r+tp(l),value:tp(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),th(t,l)}):th(t,e),t},tm=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rz(c,!1,\"local variable scope\")),tb=e=>{var r;return null!=(r=tm.format(e))?r:tt.format(e)},tw=e=>!!tm.tryParse(null==e?void 0:e.scope),tk=rD({scope:tm},o),tS=e=>{return null==e?void 0:eh(e)?e:e.source?tS(e.source):`${(e=>{var r;return null!=(r=tm.tryParse(e))?r:tt(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tT=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tI=()=>()=>W(\"Not initialized.\"),tx=window,tA=document,tN=tA.body,tj=((e=>r_=e)(!!tx.chrome),Q),tC=(e,r,t=(e,r)=>tj<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tA&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},t$=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nN(e),et);case\"e\":return L(()=>null==nj?void 0:nj(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:t$(e,r[0])):void 0}},t_=(e,r,t)=>t$(null==e?void 0:e.getAttribute(r),t),tM=(e,r,t)=>tC(e,(e,n)=>n(t_(e,r,t))),tU=(e,r)=>{return null==(e=t_(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},tP=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tq=e=>null!=e?e.tagName:null,tz=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tD=(e,r)=>r4(e,/#.*$/,\"\")===r4(r,/#.*$/,\"\"),tW=(e,r,t=er)=>(p=tJ(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tN.offsetWidth,4),y:ej(p.y/tN.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tJ=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tB(e),{x:h,y:g}):void 0,tB=e=>e?(m=e.getBoundingClientRect(),f=tz(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tV=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tK=()=>({...f=tz(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tN.offsetWidth,totalHeight:tN.offsetHeight}),tG=new WeakMap,tH=e=>tG.get(e),tX=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tY=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Z)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&eM(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tg(l,r4(n,/\\-/g,\":\"),t),i)}),tZ=()=>{},tQ=(e,r)=>{if(w===(w=t3.tags))return tZ(e,r);var t=e=>e?r0(e)?[[e]]:eA(e)?eB(e,t):[eT(e)?[r1(e.match),e.selector,e.prefix]:[r1(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eW(w,eT(w)?e=>e[1]:e=>e,void 0,void 0))]];(tZ=(e,r)=>tY(e,n,r))(e,r)},t0=(e,r)=>rP(eV(tP(e,tX(r,er)),tP(e,tX(\"base-\"+r,er))),\" \"),t1={},t2=(e,r,t=t0(e,\"attributes\"))=>{var n;t&&tY(e,null!=(n=t1[t])?n:t1[t]=[{},(e=>rH(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[r1(t||n),,r],!0))(t)],r),tg(t0(e,\"tags\"),void 0,r)},t4=(e,r,t=ee,n)=>{return null!=(t=null!=(t=t?tC(e,(e,t)=>t(t4(e,r,ee)),ex(t)?t:void 0):rP(eV(t_(e,tX(r)),tP(e,tX(r,er))),\" \"))?t:n&&(k=tH(e))&&n(k))?t:null},t6=(e,r,t=ee,n)=>\"\"===(S=t4(e,r,t,n))||(null==S?S:es(S)),t5=(e,r,t,n)=>e&&(null==n&&(n=new Map),t2(e,n),tC(e,e=>{tQ(e,n),tg(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t3={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t8=[],t9=[],t7=(e,r=0)=>e.charCodeAt(r),nr=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t8[t9[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t9[(16515072&r)>>18],t9[(258048&r)>>12],t9[(4032&r)>>6],t9[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nn={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nl=(e=256)=>e*Math.random()|0,na={exports:{}},{deserialize:no,serialize:nu}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};na.exports=n})(),($=na.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),ns=\"$ref\",nv=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,nd=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=nv(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[ns]||(e[ns]=a,u(()=>delete e[ns])),{[ns]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eA(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?nu(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nc=e=>{var r,t,n=e=>ew(e)?e[ns]&&(t=(null!=r?r:r=[])[e[ns]])?t:(e[ns]&&delete(r[e[ns]]=e)[ns],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>no(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nf=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nd(e,!1,n))):nd(e,!0,n),t),i=e=>null==e?Z:L(()=>nc(e),Z);return r?[e=>nd(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nl()));for(t=0,i[n++]=g(d^16*nl(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nl();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=nn[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:nr)(a(nd(e,!0,n))),e=>null!=e?nc(o(e instanceof Uint8Array?e:(t&&e$(e)?i:e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t8[t7(e,t++)]<<2|(r=t8[t7(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t8[t7(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t8[t7(e,t++)]);return i})(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[np,,]=(nf(),nf(null,{json:!0,decodeJson:!0}),nf(null,{json:!0,prettify:!0})),j=r2(\"\"+tA.currentScript.src,\"#\"),rz=r2(\"\"+(j[1]||\"\"),\";\"),ny=j[0],nb=rz[1]||(null==(rD=rB(ny,!1))?void 0:rD.host),nw=e=>{return!(!nb||(null==(e=rB(e,!1))||null==(e=e.host)?void 0:e.endsWith(nb))!==er)},o=(...e)=>r4(rP(e),/(^(?=\\?))|(^\\.(?=\\/))/,ny.split(\"?\")[0]),nS=o(\"?\",\"var\"),nT=o(\"?\",\"mnt\"),nE=(o(\"?\",\"usr\"),Symbol()),nI=Symbol(),nx=(e,r,t=er,n=ee)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rM(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nI];null!=(e=t?e[nE]:e)&&console.log(ew(e)?rM(np(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nx(e,r,t,!0)),r&&console.groupEnd()},[nA,nN]=nf(),[nO,nj]=[tI,tI],nC=!0,[$,n_]=ea(),nF=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nP,nq]=ea(),[nR,nz]=ea(),nD=e=>nJ!==(nJ=e)&&nq(nJ=!1,nL(!0,!0)),nW=e=>nB!==(nB=!!e&&\"visible\"===document.visibilityState)&&nz(nB,!e,nV(!0,!0)),nJ=(nP(nW),!0),nB=!1,nV=rb(!1),nL=rb(!1),nK=(tV(window,[\"pagehide\",\"freeze\"],()=>nD(!1)),tV(window,[\"pageshow\",\"resume\"],()=>nD(!0)),tV(document,\"visibilitychange\",()=>(nW(!0),nB&&nD(!0))),nq(nJ,nL(!0,!0)),!1),nG=rb(!1),[,nX]=ea(),nY=rk({callback:()=>nK&&nX(nK=!1,nG(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nK&&(nX(nK=!0,nG(!0)),nY.restart()),nQ=(tV(window,[\"focus\",\"scroll\"],j),tV(window,\"blur\",()=>nY.trigger()),tV(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nG()),n0=0,n1=void 0,n2=()=>(null!=n1?n1:tI())+\"_\"+n4(),n4=()=>(ry(!0)-(parseInt(n1.slice(0,-2),36)||0)).toString(36)+\"_\"+(++n0).toString(36),n3={},n8={id:n1,heartbeat:ry()},n9={knownTabs:{[n1]:n8},variables:{}},[n7,le]=ea(),[lr,lt]=ea(),ln=tI,ll=e=>n3[tS(e)],li=(...e)=>lo(e.map(e=>(e.cache=[ry(),3e3],tk(e)))),la=e=>eW(e,e=>e&&[e,n3[tS(e)]]),lo=e=>{var r=eW(e,e=>e&&[tS(e),e]);null!=r&&r.length&&(e=la(e),ri(n3,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n9.variables,r),ln({type:\"patch\",payload:e0(r)})),lt(e,n3,!0))},[,ls]=($((e,r)=>{nP(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),n1=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n3=e0(eV(e2(n3,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tS(e),e])))):sessionStorage.setItem(\"_tail:state\",e([n1,eW(n3,([,e])=>e.scope!==c.View?e:void 0)]))},!0),ln=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([n1,r,t])),localStorage.removeItem(\"_tail:state\"))},tV(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==n1||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||ln({type:\"set\",payload:n9},e):\"set\"===i&&t.active?(ri(n9,a),ri(n3,a.variables),t.trigger()):\"patch\"===i?(o=la(eW(a,1)),ri(n9.variables,a),ri(n3,a),lt(o,n3,!1)):\"tab\"===i&&(ri(n9.knownTabs,e,a),a)&&le(\"tab\",a,!1))});var t=rk(()=>le(\"ready\",n9,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n9?void 0:n9.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n9.knownTabs,[r])),n8.heartbeat=ry(),ln({type:\"tab\",payload:n8})},frequency:5e3,paused:!0});nP(e=>(e=>{ln({type:\"tab\",payload:e?n8:void 0}),e?(t.restart(),ln({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[lv,ld]=ea(),lc=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nj:nN)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nO:nA)([n1,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===n1))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rE,[v]=tV(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rx(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),lf=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nC;var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(ls(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nO(l,!0):JSON.stringify(l))};if(!t)return lc(()=>(async r=>{var l,i;for(i of ez(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),e_){e_=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?eM(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rx(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nj:JSON.parse)?void 0:a(r):Z)&&ld(a),eM(a)):eM()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&W(\"Beacon send failed.\")},rz=[\"scope\",\"key\",\"targetId\",\"version\"],lh=[...rz,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lg=[...rz,\"init\",\"purpose\",\"refresh\"],lm=[...lh,\"value\",\"force\",\"patch\"],ly=new Map,lb=(e,r)=>{var t=rk(async()=>{var e=eW(ly,([e,r])=>({...tT(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ly,e,()=>new Set).add(r)),o=(nP((e,r)=>t.toggle(e,e&&3e3<=r),!0),lr(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tS(e),null==(i=rv(ly,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await lf(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tS(e),i=(n(l,e.result),ll(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tw(e))return[rc(e,lg),r];eT(e.init)&&null!=(t={...tk(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r9.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&lo(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tS(e),a=ll(n),u(n,e.cache),tw(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tm(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rh(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lm),r])}),a=c.length?V(null==(a=(await lf(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&lo(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>{return{...rc(e,lh),cache:[r,r+(null!=(r=rv(o,tS(e)))?r:3e3)]}};return lv(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>tu(e)),eW(e.set,e=>tu(e)))))&&e.length&&lo(eH(e,d,r))}),v},lk=Symbol(),lS=[.75,.33],lT=[.25,.33],lx=()=>{var l,a,i,t=null==tx?void 0:tx.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tx.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tx.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lA=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==x?void 0:x.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lx()})),lN=(e,r=\"A\"===tq(e)&&t_(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lO=(e,r=tq(e),t=t6(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tU(e,\"type\"),\"button\",\"submit\")||t===er),lj=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rF((null==(t=t_(e,\"title\"))?void 0:t.trim())||(null==(t=t_(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tB(e):void 0}},l$=e=>{if(I)return I;eh(e)&&([t,e]=nN(e),e=nf(t,{decodeJson:!0})[1](e)),ri(t3,e),(e=>{nj===tI&&([nO,nj]=nf(e,{json:!e,prettify:!1}),nC=!!e,n_(nO,nj))})(rv(t3,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rv(t3,\"key\"),i=null!=(e=null==(t=tx[t3.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>nF(e,r))(n)))},s=[],d=lb(nS,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=n2()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),nx({[nI]:eW(t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(te(rp(e),!0),{timestamp:e.timestamp-ry()}))),e=>[e,e.type,ee])},\"Posting \"+rC([r$(\"new event\",[e4(t,e=>!tr(e))||void 0]),r$(\"event patch\",[e4(t,e=>tr(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),lf(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>nx(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nR((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nS,v),f=null,p=0,g=h=ee,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=e$(t)?JSON.parse(t):nN(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nN(e):e),e=>{if(!e)return ee;if(l9(e))t3.tags=ri({},t3.tags,e.tagAttributes);else{if(l7(e))return t3.disabled=e.disable,ee;if(it(e))return n=er,ee;if(is(e))return e(I),ee}return g||ii(e)||ir(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>ir(e)?-100:ii(e)?-50:iu(e)?-10:tc(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,tc(e))c.post(e);else if(il(e))d.get(...eb(e.get));else if(iu(e))d.set(...eb(e.set));else if(ii(e))rh(o,e.listener);else if(ir(e))(r=L(()=>e.extension.setup(I),r=>nF(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(is(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nF(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nF(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tx,t3.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+n2(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),lr((e,r,t)=>{var n=eV(null==(n=ti(eW(e,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee]),[[{[nI]:null==(n=ti(eW(r,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee])},\"All variables\",er]]);nx({[nI]:n},rM(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e4(r)} in total).`,\"2;3\"))}),n7(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):tv(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lA(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...eW(l6,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t3.name}\" is used for something else than an array of queued commands.`)},l_=()=>null==x?void 0:x.clientId,lM={scope:\"shared\",key:\"referrer\"},lU=(e,r)=>{I.variables.set({...lM,value:[l_(),e]}),r&&I.variables.get({scope:lM.scope,key:lM.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lF=rb(),lP=rb(),lq=1,[lz,lD]=ea(),lW=e=>{var r=rb(e,lF),t=rb(e,lP),n=rb(e,nQ),l=rb(e,()=>lq);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lJ=lW(),[lV,lL]=ea(),lK=(e,r)=>(r&&eY(lH,r=>e(r,()=>!1)),lV(e)),lG=new WeakSet,lH=document.getElementsByTagName(\"iframe\");function lY(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lQ=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),l0=e=>t5(e,r=>r!==e&&!!lQ(rt(tG,r)),e=>(rt(tG,e),(N=rt(tG,e))&&eB(eV(N.component,N.content,N),\"tags\"))),l1=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},l2=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tC(e,e=>{var s,i,l=rt(tG,e);l&&(lQ(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tB(e)||void 0,s=l0(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),l1({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t4(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,l1({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=rP(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:rP(l,\"/\")}:void 0},l4=Symbol(),l6=[{id:\"context\",setup(e){rk(()=>eY(lH,e=>ro(lG,e)&&lL(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==x||null==r||!r.value||null!=x&&x.definition?n=null==r?void 0:r.value:(x.definition=r.value,null!=(r=x.metadata)&&r.posted&&e.events.postPatch(x,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=ll({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=ll({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&li({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=ll({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=ll({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tD(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rB(location.href+\"\",!0),x={type:\"view\",timestamp:ry(),clientId:n2(),tab:n1,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tK(),duration:lJ(void 0,!0)},0===d&&(x.firstTab=er),0===d&&0===v&&(x.landingPage=er),li({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rV(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=x).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(x.navigationType=A)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{x.redirects=e.redirectCount,x.navigationType=r4(e.type,/\\_/g,\"-\")}),A=void 0,\"navigate\"===(null!=(r=x.navigationType)?r:x.navigationType=\"navigate\")&&(p=null==(l=ll(lM))?void 0:l.value)&&nw(document.referrer)&&(x.view=null==p?void 0:p[0],x.relatedEventId=null==p?void 0:p[1],e.variables.set({...lM,value:void 0})),(p=document.referrer||null)&&!nw(p)&&(x.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rB(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),x.definition=n,n=void 0,e.events.post(x),e.events.registerEventPatchSource(x,()=>({duration:lJ()})),lD(x))};return nR(e=>{e?(lP(er),++lq):lP(ee)}),tV(window,\"popstate\",()=>(A=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),A=\"navigate\",f()}}),f(),{processCommand:r=>l8(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!x||tf(e)||tr(e)||(e.view=x.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lk])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tA.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nQ),!1,!1,0,0,0,r6()];i[4]=r,i[5]=t,i[6]=n},y=[r6(),r6()],b=lW(!1),w=rb(!1,nQ),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,x=S/r.width||0,A=f?lT:lS,I=(A[0]*a<T||A[0]<I)&&(A[0]*t<S||A[0]<x);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t3.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t6(i,\"impressions\",er,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Y({type:\"impression\",pos:tW(i),viewport:tK(),timeOffset:lJ(),impressions:h,...l2(i,er)})||null}))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var C=tA.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=C.nextNode());){var M,U,F,z,D,q=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=q;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+q),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}A=r.left<0?-r.left:0,x=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(x,x+T)*y[1].push(A,A+S)/I),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lk]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tG,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tG,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>ie(e)?(n(e),er):io(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=t_(l,e);){ro(n,l);var a,o=r2(t_(l,e),\"|\");t_(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tV(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tC(n.target,e=>{lO(e)&&null==a&&(a=e),s=s||\"NAV\"===tq(e);var r,v=tH(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lO(r)&&(3<(null!=u?u:u=[]).length?eM():u.push({...lj(r,!0),component:tC(r,(e,r,t,n=null==(l=tH(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t6(e,\"clicks\",er,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e7(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==ee})),null==i&&(i=null!=(r=t6(e,\"region\",er,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e7(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=l2(o,!1,d),f=t5(o,void 0,e=>{return eW(eb(null==(e=rt(tG,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tW(a,n),viewport:tK()}:null,...((e,r)=>{var n;return tC(null!=e?e:r,e=>\"IMG\"===tq(e)||e===r?(n={element:lj(e,!1)},ee):er),n})(n.target,o),...c,timeOffset:lJ(),...f});if(a)if(lN(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rB(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:n2(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t_(h,\"target\")!==window.name?(lU(w.clientId),w.self=ee,e(w)):tD(location.href,h.href)||(w.exit=w.external,lU(w.clientId))):(k=h.href,(b=nw(k))?lU(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t3.captureContextMenu&&(h.href=nT+\"=\"+T+encodeURIComponent(k),tV(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tV(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tC(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tH(e))?void 0:t.cart)?t:t4(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tH(e))?void 0:t.content))&&r(v)});c=lY(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tJ(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lK(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tz(er);lz(()=>{return e=()=>(r={},t=tz(er)),setTimeout(e,250);var e}),tV(window,\"scroll\",()=>{var i,n=tz(),l={x:(f=tz(ee)).x/(tN.offsetWidth-window.innerWidth)||0,y:f.y/(tN.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l3(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lY(t))&&e({...t,type:\"cart_updated\"}),er):ia(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tM(e,tX(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rF(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tM(i,tX(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tM(i,tX(\"form-name\"))||t_(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lJ()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?e=>e!==ee:e=>e===er)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tV(i,\"submit\",()=>{l=l2(i),r[3]=3,s(()=>{(i.isConnected&&0<tB(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tB(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r4(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l4]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t6(e,\"ref\")||(e.value||(e.value=r4(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lP())),d=-(s-(s=ry(er))),c=l[l4],(l[l4]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tV(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lP()):o()));v(document),lK(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,n=async r=>{var n;if(r)return!(n=await t())||r3(n,r=r8(r))?[!1,n]:(n={level:r5.lookup(r.classification),purposes:r9.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},l={},r={necessary:1,preferences:2,statistics:4,marketing:8};return e({consent:{externalSource:{key:\"Cookiebot\",poll(){var n,e=null==(e=tA.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return n=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,t,l)=>{return\"true\"===l&&(n|=null!=(l=r[t])?l:0),\"\"}),{level:1<n?1:0,purposes:n}}}}}),{processCommand(e){var i,a,r,s,v;return iv(e)?((r=e.consent.get)&&t(r),(i=r8(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await n(i))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(r=l[v])?r:l[v]=rk({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e,t,l;tA.hasFocus()&&(e=a.poll())&&(e=r8({...s,...e}))&&!r3(s,e)&&([t,l]=await n(e),t&&nx(l,\"Consent was updated from \"+v),s=e)}).trigger()),er):ee}}}}],rD=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l3=rD(\"cart\"),l8=rD(\"username\"),l9=rD(\"tagAttributes\"),l7=rD(\"disable\"),ie=rD(\"boundary\"),ir=rD(\"extension\"),it=rD(er,\"flush\"),il=rD(\"get\"),ii=rD(\"listener\"),ia=rD(\"order\"),io=rD(\"scan\"),iu=rD(\"set\"),is=e=>\"function\"==typeof e,iv=rD(\"consent\");Object.defineProperty(tx,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(l$)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
    async processRequest(request, { matchAnyPath = false } = {}) {
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
                        await resolvedTracker._persist(true);
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

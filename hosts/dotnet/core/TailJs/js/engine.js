import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m07a6z5j" ;
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
                const changed = tracker.authenticatedUserId != event.userId;
                if (changed) {
                    if (!await tracker._requestHandler._validateSignInEvent(tracker, event)) {
                        updatedEvents[updatedEvents.length - 1] = {
                            error: "Sign-ins without evidence is only possible in a trusted context. To support sign-ins from the client API, you must register an extension that validates the sign-in event based on its provided evidence.",
                            source: event
                        };
                    }
                    event.session.userId = event.userId;
                    sessionPatches.push((data)=>{
                        data.userId = event.userId;
                    });
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
        text: "(()=>{var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,E,A,x,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return eA(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},H=e=>{var r=K(e);return(e,t)=>X(r,[e,t])},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>eA(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ed=e=>e===er,ec=e=>e!==ee,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:ex(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eE=e=>\"symbol\"==typeof e,eA=e=>\"function\"==typeof e,ex=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,e_=(e,r,t)=>e[0]===r&&e[e.length-1]===t,eC=e=>eh(e)&&(e_(e,\"{\",\"}\")||e_(e,\"[\",\"]\")),eM=!1,e$=e=>(eM=!0,e),eU=e=>null==e?Z:eA(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),eM){eM=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),eM){eM=!1;break}}}(e,eF(r,t,n)):eP(eA(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r)=>r&&!em(e)?[...e]:e,ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!eM;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return eM=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eJ=(e,r,t,n)=>null!=e?new Set([...ez(e,r,t,n)]):Z,eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eL=(e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,eM)){eM=!1;break}return l},eK=(e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,eM)){eM=!1;break}return t},eG=(e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,eM){eM=!1;break}return t},eH=(e,r,...t)=>null==e?Z:ex(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return eL(e,r,t,n);if(t===Z){if(e[ei])return eK(e,r);if(\"object\"==typeof e)return eG(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eZ=async(e,r,t,n)=>{var l,i;if(null==e)return Z;for(i of ez(e,r,t,n))if(null!=(i=await i)&&(l=i),eM){eM=!1;break}return l},eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e1=(e,r,t,n,l)=>{var a=()=>eA(t)?t():t;return null!=(e=eX(e,(e,n)=>t=null!=(e=r(t,e,n))?e:a(),n,l))?e:a()},e2=(e,r=e=>null!=e,t=em(e),n,l)=>eR(eP(e,(e,t)=>r(e,t)?e:Z,n,l),t),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):e1(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e5=(e,r,t)=>eW(e,eT(e)?e=>e[1]:e=>e,r,t),e8=(e,r,t,n)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?e$(e):Z,t,n)),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&e$(!0):()=>e$(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=eA(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,eA(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>eA(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}else ep(a)&&ep(void 0)&&(a=(t=a)-void 0);i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=eA(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=rx(!0).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rI,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rI{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rA=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rx=e=>new(e?rT:rI),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},r_=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},rM=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),r$=(e,r,t)=>null==e?Z:eA(r)?r_(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:r_(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rF=e=>(e=Math.log2(e))===(0|e),rq=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rF(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rF(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:eA(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+r_(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rP=(...e)=>{var r=(e=>!em(e)&&ex(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rR=Symbol(),rz=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&e8(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rD=(e,r=!0,t)=>null==e?Z:rL(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rW(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rW=(e,r,t=!0)=>rJ(e,\"&\",r,t),rJ=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rz(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rR]=o),e},rB=(e,r)=>r&&null!=e?r.test(e):Z,rV=(e,r,t)=>rL(e,r,t,!0),rL=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rL(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rK=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rG=/\\z./g,rH=(e,r)=>(r=r$(eJ(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rG,rX={},rY=e=>e instanceof RegExp,rZ=(t,n=[\",\",\" \"])=>{var l;return rY(t)?t:em(t)?rH(eW(t,e=>null==(e=rZ(e,n))?void 0:e.source)):eu(t)?t?/./g:rG:eh(t)?null!=(l=(e=rX)[r=t])?l:e[r]=rL(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rH(eW(rQ(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${r$(n,rK)}]`)),e=>e&&`^${r$(rQ(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rK(r0(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},rQ=(e,r)=>null!=(r=null==e?void 0:e.split(r))?r:e,r0=(e,r,t)=>null!=(r=null==e?void 0:e.replace(r,t))?r:e,r1=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r2=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rq(l,!1,\"data classification\")),r4=(e,r)=>{var t;return r2.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r2.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r5.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r5.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r6=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r2.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r5.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r5=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rq(i,!0,\"data purpose\",2111)),j=rq(i,!1,\"data purpose\",0),r8=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r7=((C=o={})[C.Global=0]=\"Global\",C[C.Entity=1]=\"Entity\",C[C.Session=2]=\"Session\",C[C.Device=3]=\"Device\",rq(o,!(C[C.User=4]=\"User\"),\"variable scope\")),o={scope:r7,purpose:j,purposes:r5,classification:r2},tt=(rP(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tn=((j=C={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rq(C,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(C=s=s||{})[C.Success=200]=\"Success\",C[C.Created=201]=\"Created\",C[C.Unchanged=304]=\"Unchanged\",C[C.Denied=403]=\"Denied\",C[C.NotFound=404]=\"NotFound\",C[C.ReadOnly=405]=\"ReadOnly\",C[C.Conflict=409]=\"Conflict\",C[C.Unsupported=501]=\"Unsupported\",C[C.Invalid=400]=\"Invalid\",C[C.Error=500]=\"Error\",rq(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=to)=>(e=>{var r={initialized:!0,then:H(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,ti)),values:e(e=>eW(e,e=>null==(e=ti(e))?void 0:e.value)),push:()=>(i=e=>(null!=t&&t(eW(tl(e))),e),o),value:e(e=>null==(e=ti(e[0]))?void 0:e.value),variable:e(e=>ti(e[0])),result:e(e=>e[0])};return o}),tl=e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z),ti=e=>{var r;return ta(e)?null!=(r=e.current)?r:e:Z},ta=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),to=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r7.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},ts=e=>e&&\"string\"==typeof e.type,tv=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),td=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tc=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tf=(e,r=\"\",t=new Map)=>{if(e)return ex(e)?eY(e,e=>tf(e,r,t)):eh(e)?rL(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?td(n)+\"::\":\"\")+r+td(l),value:td(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tc(t,l)}):tc(t,e),t},tp=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rq(c,!1,\"local variable scope\")),th=e=>{var r;return null!=(r=tp.tryParse(e))?r:r7(e)},tg=e=>{var r;return null!=(r=tp.format(e))?r:r7.format(e)},tm=e=>!!tp.tryParse(null==e?void 0:e.scope),ty=rP({scope:tp},o),tb=e=>null==e?void 0:eh(e)?e:e.source?tb(e.source):th(e.scope)+`\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\"),tw=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tS=()=>()=>W(\"Not initialized.\"),tT=window,tI=document,tE=tI.body,tA=(e,r)=>!(null==e||!e.matches(r)),tx=Q,tN=(e,r,t=(e,r)=>tx<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tI&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tO=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nk(e),et);case\"e\":return L(()=>null==nT?void 0:nT(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tO(e,r[0])):void 0}},tj=(e,r,t)=>tO(null==e?void 0:e.getAttribute(r),t),t_=(e,r,t)=>tN(e,(e,n)=>n(tj(e,r,t))),tC=(e,r)=>null==(e=tj(e,r))||null==(r=e.trim())?void 0:r.toLowerCase(),tM=e=>null==e?void 0:e.getAttributeNames(),t$=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tU=e=>null!=e?e.tagName:null,tq=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tP=(e,r)=>r0(e,/#.*$/,\"\")===r0(r,/#.*$/,\"\"),tR=(e,r,t=er)=>(p=tz(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tE.offsetWidth,4),y:ej(p.y/tE.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tz=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tD(e),{x:h,y:g}):void 0,tD=e=>e?(m=e.getBoundingClientRect(),f=tq(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tW=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tB=()=>({...f=tq(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tE.offsetWidth,totalHeight:tE.offsetHeight}),tV=new WeakMap,tL=e=>tV.get(e),tK=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tG=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY(tM(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>rB(a,r)&&(i=void 0,!t||tA(e,t))&&e$(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tf(l,r0(n,/\\-/g,\":\"),t),i)}),tH=()=>{},tX=(e,r)=>{if(w===(w=t4.tags))return tH(e,r);var t=e=>e?rY(e)?[[e]]:ex(e)?eB(e,t):[eT(e)?[rZ(e.match),e.selector,e.prefix]:[rZ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(e5(w))]];(tH=(e,r)=>tG(e,n,r))(e,r)},tY=(e,r)=>r$(eV(t$(e,tK(r,er)),t$(e,tK(\"base-\"+r,er))),\" \"),tZ={},tQ=(e,r,t=tY(e,\"attributes\"))=>{var n;t&&tG(e,null!=(n=tZ[t])?n:tZ[t]=[{},rV(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rZ(t||n),,r])],r),tf(tY(e,\"tags\"),void 0,r)},t0=(e,r,t=ee,n)=>null!=(t=null!=(t=t?tN(e,(e,t)=>t(t0(e,r,ee)),eA(t)?t:void 0):r$(eV(tj(e,tK(r)),t$(e,tK(r,er))),\" \"))?t:n&&(k=tL(e))&&n(k))?t:null,t1=(e,r,t=ee,n)=>\"\"===(S=t0(e,r,t,n))||(null==S?S:es(S)),t2=(e,r,t,n)=>e&&(null==n&&(n=new Map),tQ(e,n),tN(e,e=>{tX(e,n),tf(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t4={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t6=[],t5=[],t3=(e,r=0)=>e.charCodeAt(r),t9=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t6[t5[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t5[(16515072&r)>>18],t5[(258048&r)>>12],t5[(4032&r)>>6],t5[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),t7=e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t6[t3(e,t++)]<<2|(r=t6[t3(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t6[t3(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t6[t3(e,t++)]);return i},ne={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nr=(e=256)=>e*Math.random()|0,nn={exports:{}},{deserialize:nl,serialize:ni}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nn.exports=n})(),(C=nn.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C),na=\"$ref\",no=(e,r,t)=>eE(e)?Z:t?r!==Z:null===r||r,nu=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=no(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||eA(e)||eE(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[na]||(e[na]=a,u(()=>delete e[na])),{[na]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!ex(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?ni(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},ns=e=>{var r,t,n=e=>ew(e)?e[na]&&(t=(null!=r?r:r=[])[e[na]])?t:(e[na]&&delete(r[e[na]]=e)[na],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>nl(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nv=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nu(e,!1,n))):nu(e,!0,n),t),i=e=>null==e?Z:L(()=>ns(e),Z);return r?[e=>nu(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nr()));for(t=0,i[n++]=g(d^16*nr(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nr();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=ne[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t9)(a(nu(e,!0,n))),e=>null!=e?ns(o(e instanceof Uint8Array?e:(t&&eC(e)?i:t7)(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},j=(nv(),nv(null,{json:!0,decodeJson:!0}),nv(null,{json:!0,prettify:!0}),rQ(\"\"+tI.currentScript.src,\"#\")),rq=rQ(\"\"+(j[1]||\"\"),\";\"),nf=j[0],np=rq[1]||(null==(rP=rD(nf,!1))?void 0:rP.host),nh=e=>!(!np||(null==(e=rD(e,!1))||null==(e=e.host)?void 0:e.endsWith(np))!==er),o=(...e)=>r0(r$(e),/(^(?=\\?))|(^\\.(?=\\/))/,nf.split(\"?\")[0]),nm=o(\"?\",\"var\"),ny=o(\"?\",\"mnt\"),nb=(o(\"?\",\"usr\"),Symbol()),[nw,nk]=nv(),[nS,nT]=[tS,tS],nI=!0,[C,nA]=ea(),nO=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nj,n_]=ea(),[nC,nM]=ea(),n$=e=>nF!==(nF=e)&&n_(nF=!1,nR(!0,!0)),nU=e=>nq!==(nq=!!e&&\"visible\"===document.visibilityState)&&nM(nq,!e,nP(!0,!0)),nF=(nj(nU),!0),nq=!1,nP=rb(!1),nR=rb(!1),nz=(tW(window,[\"pagehide\",\"freeze\"],()=>n$(!1)),tW(window,[\"pageshow\",\"resume\"],()=>n$(!0)),tW(document,\"visibilitychange\",()=>(nU(!0),nq&&n$(!0))),n_(nF,nR(!0,!0)),!1),nD=rb(!1),[,nJ]=ea(),nB=rk({callback:()=>nz&&nJ(nz=!1,nD(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nz&&(nJ(nz=!0,nD(!0)),nB.restart()),nL=(tW(window,[\"focus\",\"scroll\"],j),tW(window,\"blur\",()=>nB.trigger()),tW(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nD()),nK=0,nG=void 0,nH=()=>(null!=nG?nG:tS())+\"_\"+nX(),nX=()=>(ry(!0)-(parseInt(nG.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nK).toString(36),nQ={},n0={id:nG,heartbeat:ry()},n1={knownTabs:{[nG]:n0},variables:{}},[n2,n4]=ea(),[n6,n5]=ea(),n3=tS,n8=e=>nQ[tb(e)],n9=(...e)=>le(e.map(e=>(e.cache=[ry(),3e3],ty(e)))),n7=e=>eW(e,e=>e&&[e,nQ[tb(e)]]),le=e=>{var r=eW(e,e=>e&&[tb(e),e]);null!=r&&r.length&&(e=n7(e),ri(nQ,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n1.variables,r),n3({type:\"patch\",payload:e0(r)})),n5(e,nQ,!0))},[,lt]=(C((e,r)=>{nj(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nG=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nQ=e0(eV(e2(nQ,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tb(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nG,eW(nQ,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n3=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nG,r,t])),localStorage.removeItem(\"_tail:state\"))},tW(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nG||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n3({type:\"set\",payload:n1},e):\"set\"===i&&t.active?(ri(n1,a),ri(nQ,a.variables),t.trigger()):\"patch\"===i?(o=n7(eW(a,1)),ri(n1.variables,a),ri(nQ,a),n5(o,nQ,!1)):\"tab\"===i&&(ri(n1.knownTabs,e,a),a)&&n4(\"tab\",a,!1))});var t=rk(()=>n4(\"ready\",n1,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n1?void 0:n1.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n1.knownTabs,[r])),n0.heartbeat=ry(),n3({type:\"tab\",payload:n0})},frequency:5e3,paused:!0});nj(e=>(e=>{n3({type:\"tab\",payload:e?n0:void 0}),e?(t.restart(),n3({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[ln,ll]=ea(),li=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nT:nk)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nS:nw)([nG,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===nG))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=rx(),[v]=tW(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rA(null!=o?o:r),d],await Promise.race(e.map(e=>eA(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),la=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nI;var l,i,a=!1,o=t=>{var o=eA(r)?null==r?void 0:r(l,t):r;return!1!==o&&(lt(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nS(l,!0):JSON.stringify(l))};if(!t)return li(()=>eZ(1,async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?e$(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rA(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nT:JSON.parse)?void 0:a(r):Z)&&ll(a),e$(a)):e$()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rq=[\"scope\",\"key\",\"targetId\",\"version\"],lu=[...rq,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ls=[...rq,\"init\",\"purpose\",\"refresh\"],lv=[...lu,\"value\",\"force\",\"patch\"],ld=new Map,lc=(e,r)=>{var t=rk(async()=>{var e=eW(ld,([e,r])=>({...tw(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ld,e,()=>new Set).add(r)),o=(nj((e,r)=>t.toggle(e,e&&3e3<=r),!0),n6(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tb(e),null==(i=rv(ld,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await la(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tb(e),i=(n(l,e.result),n8(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tm(e))return[rc(e,ls),r];eT(e.init)&&null!=(t={...ty(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r5.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&le(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tb(e),a=n8(n),u(n,e.cache),tm(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tp(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lv),r])}),a=c.length?V(null==(a=(await la(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&le(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>({...rc(e,lu),cache:[r,r+(null!=(r=rv(o,tb(e)))?r:3e3)]});return ln(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>ti(e)),eW(e.set,e=>ti(e)))))&&e.length&&le(eH(e,d,r))}),v},lp=Symbol(),lh=[.75,.33],lg=[.25,.33],lb=()=>{var l,a,i,t=null==tT?void 0:tT.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tT.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tT.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lw=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lb()})),lk=(e,r=\"A\"===tU(e)&&tj(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lS=(e,r=tU(e),t=t1(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tC(e,\"type\"),\"button\",\"submit\")||t===er),lT=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rM((null==(t=tj(e,\"title\"))?void 0:t.trim())||(null==(t=tj(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tD(e):void 0}},lE=e=>{if(E)return E;eh(e)&&([t,e]=nk(e),e=nv(t,{decodeJson:!0})[1](e)),ri(t4,e),(e=>{nT===tS&&([nS,nT]=nv(e,{json:!e,prettify:!1}),nI=!!e,nA(nS,nT))})(rv(t4,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,m,l=rv(t4,\"key\"),i=null!=(e=null==(t=tT[t4.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:E,unsubscribe:()=>t=ee}),t},(e=>r=>nO(e,r))(n)))},s=[],d=lc(nm,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nH()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),la(e,{events:t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(r8(rp(e),!0),{timestamp:e.timestamp-ry()}))),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>{}),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nC((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nm,v),f=null,p=0,g=h=ee,m=!1,E=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=eC(t)?JSON.parse(t):nk(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nk(e):e),e=>{if(!e)return ee;if(l1(e))t4.tags=ri({},t4.tags,e.tagAttributes);else{if(l2(e))return t4.disabled=e.disable,ee;if(l5(e))return n=er,ee;if(ir(e))return e(E),ee}return g||l8(e)||l6(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>l6(e)?-100:l8(e)?-50:ie(e)?-10:ts(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var y=f[p];y&&(v.validateKey(null!=r?r:y.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,ts(e))c.post(e);else if(l3(e))d.get(...eb(e.get));else if(ie(e))d.set(...eb(e.set));else if(l8(e))rh(o,e.listener);else if(l6(e))(r=L(()=>e.extension.setup(E),r=>nO(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(ir(e))e(E);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nO(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nO(E,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else i.push(...e)},Object.defineProperty(tT,t4.name,{value:Object.freeze(Object.assign(E,{id:\"tracker_\"+nH(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n6((e,r,t)=>{eV(null==(e=tt(eW(e,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee]),[[{[nb]:null==(e=tt(eW(r,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee])},\"All variables\",er]])}),n2(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):to(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lw(E),e.hasUserAgent=!0),g=!0,s.length&&E(s),n(),m=!0,E(...eW(lY,e=>({extension:e})),...i),E({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),E;W(`The global variable for the tracker \"${t4.name}\" is used for something else than an array of queued commands.`)},lA=()=>null==A?void 0:A.clientId,lx={scope:\"shared\",key:\"referrer\"},lN=(e,r)=>{E.variables.set({...lx,value:[lA(),e]}),r&&E.variables.get({scope:lx.scope,key:lx.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lO=rb(),lj=rb(),l_=1,[lM,l$]=ea(),lU=e=>{var r=rb(e,lO),t=rb(e,lj),n=rb(e,nL),l=rb(e,()=>l_);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lF=lU(),[lP,lR]=ea(),lz=(e,r)=>(r&&eY(lW,r=>e(r,()=>!1)),lP(e)),lD=new WeakSet,lW=document.getElementsByTagName(\"iframe\");function lB(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lL=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lK=e=>t2(e,r=>r!==e&&!!lL(rt(tV,r)),e=>(N=rt(tV,e),(N=rt(tV,e))&&eB(eV(N.component,N.content,N),\"tags\"))),lG=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},lH=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tN(e,e=>{var s,i,l=rt(tV,e);l&&(lL(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>null==(e=e.track)?void 0:e.region))&&tD(e)||void 0,s=lK(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),lG({...e,content:a.length?a:void 0,rect:n,...s},!!n)})),a=[]),i=l.area||t0(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,lG({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=r$(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:r$(l,\"/\")}:void 0},lX=Symbol(),lY=[{id:\"context\",setup(e){rk(()=>eY(lW,e=>ro(lD,e)&&lR(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n8({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n8({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n9({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n8({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n8({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tP(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rD(location.href+\"\",!0),A={type:\"view\",timestamp:ry(),clientId:nH(),tab:nG,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tB(),duration:lF(void 0,!0)},0===d&&(A.firstTab=er),0===d&&0===v&&(A.landingPage=er),n9({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rW(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=r0(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n8(lx))?void 0:l.value)&&nh(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lx,value:void 0})),(p=document.referrer||null)&&!nh(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rD(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lF()})),l$(A))};return nC(e=>{e?(lj(er),++l_):lj(ee)}),tW(window,\"popstate\",()=>(x=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>l0(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!A||tv(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lp])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tI.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nL),!1,!1,0,0,0,r1()];i[4]=r,i[5]=t,i[6]=n},y=[r1(),r1()],b=lU(!1),w=rb(!1,nL),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],x=f?lg:lh,t=(x[0]*a<T||x[0]<(T/r.height||0))&&(x[0]*t<S||x[0]<(S/r.width||0));if(p!==t&&w(p=t,!0),f!==(f=p&&w()>=t4.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>((null==(e=e.track)?void 0:e.impressions)||t1(i,\"impressions\",er,e=>null==(e=e.track)?void 0:e.impressions))&&Y({type:\"impression\",pos:tR(i),viewport:tB(),timeOffset:lF(),impressions:h,...lH(i,er)})||null))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;x=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=x?x:\"\"),u||r.height>=1.25*a){var _=tI.createTreeWalker(i,NodeFilter.SHOW_TEXT),C=0,M=0;for(null==u&&(u=[]);M<d.length&&($=_.nextNode());){var $,U,F,z,D,P=null!=(U=null==(U=$.textContent)?void 0:U.length)?U:0;for(C+=P;C>=(null==(F=d[M])?void 0:F.offset);)l[M%2?\"setEnd\":\"setStart\"]($,d[M].offset-C+P),M++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,M<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}var t=r.left<0?-r.left:0,x=r.top<0?-r.top:0,B=r.width*r.height;f&&(g=y[0].push(x,x+T)*y[1].push(t,t+S)/B),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lp]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tV,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tV,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>l4(e)?(n(e),er):l7(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=tj(l,e);){ro(n,l);var a,o=rQ(tj(l,e),\"|\");tj(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tW(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tN(n.target,e=>{lS(e)&&null==a&&(a=e),s=s||\"NAV\"===tU(e);var r,v=tL(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lS(r)&&(3<(null!=u?u:u=[]).length?e$():u.push({...lT(r,!0),component:tN(r,(e,r,t,n=null==(l=tL(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t1(e,\"clicks\",er,e=>null==(e=e.track)?void 0:e.clicks))?r:v&&e7(v,e=>(null==(e=e.track)?void 0:e.clicks)!==ee)),null==i&&(i=null!=(r=t1(e,\"region\",er,e=>null==(e=e.track)?void 0:e.region))?r:v&&e7(v,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lH(null!=a?a:o,!1,d),f=t2(null!=a?a:o,void 0,e=>eW(eb(null==(e=rt(tV,e))?void 0:e.tags))),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tR(a,n),viewport:tB()}:null,...((e,r)=>{var n;return tN(null!=e?e:r,e=>\"IMG\"===tU(e)||e===r?(n={element:lT(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lF(),...f});if(a)if(lk(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rD(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nH(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tj(h,\"target\")!==window.name?(lN(w.clientId),w.self=ee,e(w)):tP(location.href,h.href)||(w.exit=w.external,lN(w.clientId))):(k=h.href,(b=nh(k))?lN(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t4.captureContextMenu&&(h.href=ny+\"=\"+T+encodeURIComponent(k),tW(window,\"storage\",(r,t)=>\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())),tW(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tN(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tL(e))?void 0:t.cart)?t:t0(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tL(e))?void 0:t.content))&&r(v)});c=lB(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tz(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lz(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tq(er);lM(()=>{return e=()=>(r={},t=tq(er)),setTimeout(e,250);var e}),tW(window,\"scroll\",()=>{var i,n=tq(),l={x:(f=tq(ee)).x/(tE.offsetWidth-window.innerWidth)||0,y:f.y/(tE.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return lQ(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lB(t))&&e({...t,type:\"cart_updated\"}),er):l9(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||t_(e,tK(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rM(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=t_(i,tK(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:t_(i,tK(\"form-name\"))||tj(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lF()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?ec:ed)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tW(i,\"submit\",()=>{l=lH(i),r[3]=3,s(()=>{(i.isConnected&&0<tD(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tD(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(i=null!=(v=(i=s[0].fields)[d=e.name])?v:i[d]={id:e.id||d,name:d,label:r0(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lX]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t1(e,\"ref\")||(e.value||(e.value=r0(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lj())),d=-(s-(s=ry(er))),c=l[lX],(l[lX]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tW(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lj()):o()));v(document),lz(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r4(t,r=r6(r))?[!1,t]:(t={level:r2.lookup(r.classification),purposes:r5.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tT.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{classification:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,s,r;return it(e)?((r=e.consent.get)&&n(r),(t=r6(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(r=a.key,(null!=(e=i[r])?e:i[r]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e;tI.hasFocus()&&(e=a.poll())&&(e=r6({...s,...e}))&&!r4(s,e)&&(await l(e),s=e)}).trigger()),er):ee}}}}],rP=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),lQ=rP(\"cart\"),l0=rP(\"username\"),l1=rP(\"tagAttributes\"),l2=rP(\"disable\"),l4=rP(\"boundary\"),l6=rP(\"extension\"),l5=rP(er,\"flush\"),l3=rP(\"get\"),l8=rP(\"listener\"),l9=rP(\"order\"),l7=rP(\"scan\"),ie=rP(\"set\"),ir=e=>\"function\"==typeof e,it=rP(\"consent\");Object.defineProperty(tT,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lE)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9iXbbRrYoej-FRLuZKrNEEdRgCVQZR3YcxxlsJ1Li2BBiQ2SRgg0WmEJRQ0j2ur_xfuB92P2St_auKgwU5e5z17vrntOxiJrHXXvehFD-dHmdqJZgimkmWcZSlrCCXbMxG7EJm7MrNmUzdscu2Q37ws7YOXvBTtkte83esHecCKa44E9fKJUrIii0p69UftMSV0RwNYG0EHICsWY_YHmm-Y4PBdMJEZxztVrJRZZxTuBPm4tQBIpSJfRCyXZ_CMVuiKCdjrghCv70MiGn-grq2p8UZ5ExyfvDSa5I1kplS1DsIsriNucqyuJOp_0DfjP4YnrHL7vxh92uXJuPluScv7n8LEa690XcFURR283alV6zZ2YuvV5PU_7UzqN_om3JTkf3inwmiOJPn0FJStnvWIXyp9U839k5q1AF3mlLib8WqRLj1nWSLUQrLVqztChSOfWY4E_P7-bCLnRPiXmWjATxer2exzwo6ir3PEop-8nsTbvPNG6Kulva2QlC16NEj66IoGXaKVE0FHewZ7hl73DLArGA9FEuizwTPYGdK5tJA7WepDLJsrulmYXudDSh6zX7Ec4EbgnsNpwy3UtlqtMkS_8W49UK5kuUPR89fSVkqLjCH0Twp6RRHCfRU6LIs2sx5ooLSoOvF6FDOzG9Zt9Xg-E_EuGyiMCV-YMoFgmmY7pmf_CkuJOjewsHdSXLeHKTpLqFg3btixkskDu_XEX9mIbXeTpu9QPZGyVZRhTLaJBVS55OSBvX1RzPmfulIj-2x7EFv6EXe5fWMILU9E9MZ8r1gvsFlyRtpbLQiRyJfNLCc0JN9dQNNl1DNzZVDJvbKmi5m_V-tOtHEwpb-x5WU7AP3CSzX_jrxexSqN7Pp398PDv97sXHV6_PX7x88SsTgrd9JnAphTkFyzUT0jQgMvhrbwITKT-7m13mWS_VQiU6V0wk7roQzSRv9-GaEU1XK9XpyE6nPHLmB9FcEU1pqIMPTOSurj3Ybc4_GDD0IbATE25iIlIxxQICqi5gXN5lnmcikR7n-m4OCyqYKLhIiFjAVey3ueh0iM-5WK28SZIVwmtzTPO0WgiPY84HuIniGlpstwUTY5w75CkmRvgBtQQTE7eMaXGWTMQrqcUUCs1xNBLzGoO5woxCK4AO9YwpjvKK2dWtT7Sn8zOsQGBYM36qVHLXSwv8y8QdDujeKWLi0sISn1ZtfgjaqtMRMyJoKAJxC3-jXq8n4iASMRM31fbCsng5wtPGSL84IDtXuc4hnYkzlzYV-q1LfjNh4rx2XDodcUYEhXX8wsQrt9feZCFHOs2rXdu61Uy8MGuHB64xolPMuNcMZN3W1qDt2l2t2iISabxaufm1yyqdTltRJl7fW9SfkzkTb-4lnwnNxOf6E2GX2Ye3JRTBz4m-6ql8IcdEPCaK4_c8vyF-n6lOp92HVy5UQZ9SuquY-GhfW7gFUT-GVjodEbnXc8eHJM3EcxzKFb6wRHwkgnlLj3lrj65W5jPymBd7cGZ-xiv9CGoQ-OgzQZn4jYv6iMWpORSKP1V4Fr6rRlJ777S5dERw8RsRlFm41ukQxfvuU3c6RPNfKCOSZZQ_VTs74YdA7-yEIhSYFshA00Aw8RffduQnaaaFIiKjTLy142CytsJRXD_Jf-HTBnsaumPwGLcEILQ9fhSh6FLBuBUdAmzWFu-QLdh6WpaFJ4FIprtdCqt7l4ps3JKwkHSJizm8VCL5sl6LrBAtaAHfGtOKaULW6q3h0eIIywLxHTFToQGiR5vjrQ9PsmqABjFCdIlHkolIxvGwGnAGe0MyHHKQVYPOtgwahlMfxltitr4xEqYfeiHoEkdkDkTZkaJDvbNTgnXFBTyQQ2pzcQmYpEGtE963GyRO-tS16Y7Sjtjx6VB0u2UTOzvDcrmbh24odnbKYt0u9kUZXONf3cWEm2bOioV2gom_6-cKVsF-MPGtw3h9eMJ8wK8pf1oOXRCLdteOl8LjZaCKtDgvdScjhZORheItUTRQ1G_DA43jfSxIChgtk6zdp4GZQ2omWi2dGRuMgukulvUpE-_q40dUxJwdhhN1h6XPUh7FeIo01yf90EGSrg7sYxzqoM8kl_VMaTNlKAOXONQnEtbx5yEcM2w_4SLS8dDtephwRRKWwSlMaKeT9uaL4ook1OHoBhSlJcruUOpLIv4uZ0ODD2smfti89lBQihsAuQR3saoRU8ABnm3dNmj7W1IjlQAi_s4JtOAIKVUihu8BO-BuxiGAYDgrtUesBgsVj2JqpgitXcKyU6bWTPzU2BtD5aQssdf5_4-NwD2ooFuk406HZNzuRAoEQaRjlgAMC9MgAzjQBAR2ytmaiR_dPcGhwjqlLLODTTeAY4qwvQYoU9xvGspAP9iJXjPx8qudIIBLJ82mo5SJKI3jZg8PdfB9g7irvWyI5oh3BDdSEWGK0KD8ycQf9zdsWHs7LM4vHOXZEj-V5Yc4as4_WMJVpCVBIH7EKUOJ-6hUWeglFlo3oEUNHtFq3TOeljRMtl4z8Z6LP5j4UFFAG0fOzYHzsrsPtV2t3bnqLbEUSyultseH1hxOzi8O85uofPZCapWKgol-hTo4MoyV9ExtY4CeWq10SFIORMZ7gNwhEbUrb0hbGGD5tojIj7kmaQSXM2bwic-0TeCYEAB2BO2pUGxecnfANrFMP4ZmSPmEEclTGmUcm6WhCmSUxdWVxwospeugBA8PtVkfGgAgqBaIXwieSRVaolbkRJm3yzfjz4lgPqV0zYTPKxDmVjVB6kycEk1DTWigNyYouPiDCGbXs7xYsKKa4ZqGIkgIxTbt7zUTg5I_5Og8zfHs277Fr-ZFsqM2Q0YqDPJh-GL_4dvUOImIkgkuBli87Zv7BK_fso7bVEiFYxwBJtUr0r-rC4kdtBu3r84MEhvMIHwZSxrUrBPlT7vdDInR_pqJQ27AQxOxF3MAJojFz5JbVyIQvl0RWAQOjIAQuQGI9NTA0Wol5gQQNHGShVkg2AemogGwtvaAxjmoYf8Ir84RdAEt4Md4JjCXiaNtSPGHoMIB_qh2qK1WK3uPgNQWj5CiNteeiSdb9ur-TT1HQqOtwv7J1mUNNjfL_ODwQyBPrWSwZIbBIlj1kIprSmE1_qhfh3bbjLjTEY8IYEd42vGnGXunk62ZEuVxFRWlAsRmr8iVJtUppTvIagDaR6kabSN6wFLRajHSuSp5iKuVwRfNoIHmCsciE1q0gBxFmpTroJYreia__AHIXqNKrxBQrBAaEEgaiF4yHoeQlIzHULpe03SAiKzehKbIXC2fj63DN9ASxwV9k3KgRHIBZHqI_5per5IixH9dx_Q-o0byGqChnY5SOChJmaRrpmTtshDxniimEAArRiIFfDr-tGI3EjhOphtxDo0CXy9SMS4KzpuuzUaJBInWGuBDkNGAczKsEPIA-tZM86diBg1jTtSPmTaPAmSSSDMZI1_Kvn1ALKyZSoEHoxRlKoFf5aLbqbr5K204wwEcJlXxrDbYAqtVI-WdSL6cCR223ULDMtiNR9zfNgvsgNSAwz5latFEmmok3xa2e0tz2woTr4AFYI6TRx86k0yvmbouu2gcK2SRGqSn0_FPSpRYlfcKCasd4CjT3iyZA9NcXdu1MZdHVdVEr5hn6QjW3KeAVTtG6MJgP0yNakcIhmIKtGsPxn1Ug6jeJEv0z8mcwJ7f4J7jzms3JDMRvyZ2CCNg-DKBf-I4UCNif2P3eFIiBflxTAPbqXAdmrmWpzqCjeLlRTNtwUmGRiLNAAuPY1pyNMpXFdGWNVMTBF2G-UKAJaLmBqKhuMWuYyiwV0Bf55AJMpDAkbLntkgfQL7hivOnETRENBaNabCEsutAvIGyjopSFVJctQqclNeuFCxsVQqxGGgW8RjbssAxX215LEtujqOQ4GpNv1ZwIYurdKJd2dkGxWAR2uqMnuMZNcjjuWWFvberkMT2HCUoRxKxQc_PieaJYd23ScLVjCQMc90lGkYJ0zFPDHNHzAkQsmJujyN0kXBsY8emDNNIxDxh9kbCs55xNQcGAGTo9ZqyjIZRyjJ36mkQCSbiNVN33FvIsZikUowrNuRcqEmuZgA6kNOG8MUgHVot5IioOyJAnlIr2NPpTLxR6TSV3XqyzG8IDb5NNP5kCtjCwAJUiD2qO0JrJBnviseKUKTLrMAl5YIlyM_nIsy6fEd2kTajNMhYgiRCnzIiONILJodpONlfzDnul-JKbo75cgJCLyFHd4FigAtcJqMvAZxOtvxrIRYiyGCA82RRiHGQAimvVTqdChUk8JHLkQhy-FVWXjhBhUomQbHmgl0Dvlghwr2yT0BV-6xP2ZirW0AmnACKUDbi6pK0U8omfEQomxu6qiXMQWpfr1btrNMZ9-ZCjlM5texbUYkj0wkhd73LRXEHog_MA2prWFYZUkNcjUuOw2o1hhEITSgjyDY2Jf4gMKUFgYHsTLoEh0QpYMmQ0RYwkHLoIGA54f3VKqedzowAg6hdjsSna3aFK3TNC6HP05nIFxrbL0Jcl0KfynSWAHvrO5XMBJnSYEooUyf9cEcFirKpWeG7XjLS6bXodOaEsurrCkiHmeW2IyI2Mg_RKBOJcj1eV1V4u02uuQivCA36lN1RdseXJito-wwGDn-VKHSidGDRuHJP8d1jC15xThZsRtp9eDUp0_l0monAvcxtzl23oQhVSGaIRN717LGCmdAAEwNcu-CuOnHuBJhdmRsoMyOuQXy8124373qma9JOWULXQ8czbKkzi04sFbI6QvusmKv_VuVzofQdllmiGBlYHXIxEyq5zETQ7rNRLifpdFF-36hU299rhzatR1lSFC11vpwKbcTRpJQW66u06H2cq3yWFqKHmWsoZgSJDxTDTCxmD_BDBW322p1IK3bZXrhWiDLIWisBy_HvarkyZSW8NltLc3i-1CtTsEinMslqknMsWo7CNFfeQqxihNrIkt82ljJ7XcO-YShnBAoyz5X0mAX5jT7WbqdeLf83O0KAOvxKd2WWnebWHGRJ3c_Aw7ElHU_DlnS7-R7irPe34a35TYjD7gRXBouqRMX2scbKtjlaXxCbho_BVVpEKrSjCexoY45MuNVKMxA4YylEl-vNWNF8pZPh2bG1kkyJZHzXctoIu2ZxUDFjTdeURfUz4zYTisRcrFHUr0435ICrVVp8B_oOcMbCNhD_J7wfKiBhgvrCaP60BpcNMw9YNqTUXVBID9HgHfn0Sl4nWTpujUWW3LUeLcW694kydYscGxAqheo8UK8oU282CUfkinO3DQJ_gFQhReAu20getn2AcJpkCNpY0shDBEjZPAf1gIcUpSyJ1yj_r6kncYtq2pIRqbMZuHoDjCj-VCEdBOQe_LaUCuhHODqv0xGgpAI4LMtAWYNla0Yso5cIrpnqTXL1IgFdDTsxTSkFDMsIVHnkJXLsMY-1vLgip9wjjPQB4AnvULWlwf1H-iESvQLJlz7b8Wnvc55KUqkwAC4f6gAap8xreQwJDPjRkNzGpp7nAdFdawL1iKAuCD7UzyVFiSSiqf0USIDaCLre__qf_68XAC_jUbXLDWmuoqH6iCzGKxR8odRLUVY9mTiQKyv2NUVhCxAJwUZojUfjeZSp74wM2Uixs3w6QO0xzkl_BUP5a7vYg-VMbOETkw3SSpRUEuDvCkl0I-AWiE1bwstmRaAY8VN-I9TzpADkTcWUsoLfa5RduzQEFJg0rthUopfIO-A-XfeUGC9GwkElsVKAJo64CpF6Yom8C8ZM5lIEfUBWJ__BnEabo1YMaA2GNF6No-MO4gQhhep0dGhGOIlEDMzVYJumidm6D3YTS05N-WMEhE0og9HmYmHqnMwTVUBb-ATi6bsCEBFN2SzmKozsSjQ0TrDP2lJV506vVlehCCzfT3MkPykNyRWg8x9oUONZ9OlKM4K9fQA6BkbQAJ5E8CkRIOmk4YdAIdk1iURnHCPFNyOi8y8iOmOKRUrKPgHaMo2DJCCCF9V5MqsPGgMd1emo7-rnCQ8aBUmBa2aLDDDwYOPhxsVBNK8kgkTwOerewUYFH2J2d18ZpDajnCN_JHxHqjfoh7M3r3tGJyid3JGcdj-BZqDMdStpGVj_aKnXBp_rfQIanV02JodTaMvVisiO0bDBOVYglDQIaU7UBmdebWi1AWUNcNa9nfjiK8fC8Wkd2iJGhoWHGVeGbM4Akio6zMqCJcPkK4hvE8X1NxDgCuH1YZMl_IPsQ1DfmgrtpbKlVyuLDsAHwGTk2nU6bafiGQJqHOh14NDs9Ro05NwFVBszg2d3TeEDDj6Loq8O0l-zJd4pJCDu3uLPKbPAICiYgUDBNcvy_MtiHsyYZZ8XdngM6XYNrP4ZHP8-ZVk-_c4k4kPm5coDtalE3nnm0bIFaQhpLa-rg0_6Spgz86lrAfulfV9JQ-nH-8briq73jUdxqsCTXYNa0nK-UCK4ZLNk7qgoIjguweX9SyXMVareCnckBaXrGJt8uyFwh3E_bVvuYl1A-9oJPCyvCtlOrN2P3TgMBLXaM_eAffCBEmSEGTrQPFc3ljVklIWqI2luAejScOCE00DdP66lGumHYcUJN7xrVBXQFZgACizqxz08AQTkPlVzKfJQgHtQPjxJrfaOH6ZVvbTnDg9BMQeyFHkGkkBEA2tqsupXq4IJD-DfDtVZecwbArLjxUwbJcymZEeEpC6emWepJh73qOMygrBjlI_Fb7--ep7P5rkU8EgAvTwjlDo95tMsI14XFJkRo7G5NPJRFwHEtIA0ZNEg5plJ3NSCdfK8TkccgazA6G9AYTsoVE73SwVt0BOlqxU2HkbwbxxEgA4a1Onbhvp0dcwVSOt3_yRhAP-LLm66vZ24SwMakovdi10a0pBgzp_Bf8VdSsLgAj7-K35MafhfNISEiER_XsRxl17EKxL1d46DuLuK_tztxt2QYpGAXIyhArYa_fmPMH5sqoYk-vMf2BYJg3-QHvx6tDst5YUWR1o4FX5DIi2LfKFGIhCsGF2JGXAEFkoGOmzLoC07nQ8sWeirXKX6LsjYohAqSNk8KYqbXI2DhF3lhdMsycM8WLB5rlxCEZZPfwGywHmir4Jr9tdCqDunuzgO1DsyBoxxopLpTEgdjEo4KXpQhZs_IF7slYMJRW-hZOh5gbfrBR8QgDLltJXMaVQ_gHii4xlppqp0fWqHNWE5j2ImeA2r7Vc6nOWjCqxxUNLeJWHwZ-9xeBGu_qR2xXeBMVaVRDy95DabE6YM4sEi2IZF7JCnhKu_Ef9A3j6oGxou_4cARUZhEkQxKwAuFpsiz6ySdDqF_92L6CJ-tMs8j9KwbRTAooz5Jwt3sBdBGgcwhjj4wHLDMi8oK0q0SLh64ndMCYgIBVw-wMy7wKMr98ZAjF9jnsPiM_WspgbnUDDV06LQRhKsfq9ICOUUW1D8ZPWYMpbW9YgbsqfwQ5CFRPMPLA2JhB2zTTiAX5JJmUkB4aKZH5BoQWUVUVWpyho5qdlgEAn8uFVdtFzm6OLPRxcXvcfdkNDoIl6uV_HulHkXF486QL685LsXf_d2p0x9X6qpK64eEfEDQSWEbY1bEEWZt4Ld-1VMX9zOiWLedOHRQL1k6g8QQKj395SDTVGmPnBUho8QItfozxIcq_fEICsoulLfw4utq8GA8P6D0YKpnV6EDrCAC6wc7vZ2p4F6CcSALomBDCv_QSPFdYwydnhK1E8EMCXPwMSLXdLrhvRiN1whbHq0O12w6kDcmzEOT_1CNLM5n0h40ob_Li4uLij-Ez1aqkdEMvUjXcefKKIeotP59Cemq1-IcJW9-5UvLh57por6kSh4zXcvLkiPwlY-8iHL6z326PrRJ2qUBdUvTSMdyyZubKO77ag7wlS_STVvr1OdTO3qgSJOSaDvKKt5EPnxDtAJFYodxeXmpkSzJR541Bkt9bxAkTeLgcEirKFEqHs36Vhfcb1BYIku6C6wPuAUWILlvD_My3dxmDuNTHxEuI5yVA8WJAVR3TUM7aRPS36Ndqh8zvqgkOTK9qGsH9MT3jd0gEvD-p0OWXD4zVNkwvRPyvaNnhPk-pALmlFt4nCMAsbTrcHeAtvDWtWYzDYs6HDBU14NcGfHCIzX67IkqiBGbu4xT0GQissS9NeAbQ44IZ95xrPVarmm0efeqczl3SxfFLwfc6_88tjn6HPvlRynSow0B4TFfZisb03GIObet7XkMyGLFKUYezH3yi-Pqb9IBhIab5zopIU83nSSjlCwAudW7W_I890ZGTjszwHLe2ex2RhAiy2Q6lpkQP491FwN8XqouQZuBs11Ourg3w5uvlDzvBDF1mGVmTCyg387svttbctcM3W4fS03-5-Te4uHHKX6qIURkDOcshXSMpvtPpttBNvXuPlj2665bdo2u_ul-9QNowg2105s7bG-fOXX19cyFEHaey1GoigSdQf2YuoAb1DKU3eDXudS4OWBH-YWlDXw4pRfJvM7K_lKslTf4QVqpJhCbys5Nd-PuVf7NgXOEzUVGvj-RzH3yi93C0cLQDi5f4i30Hy5Oz1RiRGXLJTgewO82vU0U-5U3n2sgMP-MUKHWlJZih_umTzXt7oWig_6-0fYN3zVcz6-U6kWfL9_fFjmmzQEEilr9y2QsLvgsYHv-5Syz9zk-5v5gI8dlWgLKC_cu2kzoROoZMztiNX0SXrzvNBizMpvlLKP2Qb1nDg2Gl2tnJJQ2SSqzT3hhDznOYcj8bz3MssvkwwPhfnpsefR894LqXFTYu6Znyb5TBRFmks8Cva3yfhWXKcjA0nNT1yhnLUJ5P5WCIVnA34Ad_06USlwW1rFKJ8LAKo5X-LvQD0p7-zn-rW5f3XXTAMX7C3JKfu6_VFD20n0sCPUJcJfoQA9yF6Wj5JMAKWcKEEUpDFPSKSKsdyOLQ8IrcSr9Zzbl2k8Nm_SeGzOz8-pxLX7OZU2IbnFRfs5ubVne_Iz4MO4YvY3Ltlz1iYmH-6oKbOPZcrvxgLOIaUFKiceZeQ5L3hhbvvz3tliBLeZD_owNvtltuu5EokWYz7owyjtl8n6TY6uEjkVY77Xxy1z326jZSrGfL9vtho-TMbrXH8HFnJ8H6u5T5P5q0jGb2R2x_f7BzH33KcdTC4nWTrScNFgNPbTDadYzIHoFWN-gKOtpZgiVpbG93Ge9sseY-DN8gPMeGHknuovUuDFrM6g0K1CJ3pReJTd03nnIJZIreUsMvy5zg0rzbHBljVzaGBygrg3-B5VM4jatJU2hteVtoFa00pYCNrqxEkMM2AywzMHDCS4INiuQOGYsdxmSZbZBMTNKbN7ZRMtNSR6Znone31gqLmJF7YUsOx0ihnI2KxS68SLTpFDXt4uLAxCkEVxhVq9BBeJ1OzRgQDKjD2NoCy3HZj2G-0i43mz6XKcpkJZDtRJFpm2w4Skci3zNWU620pdWp4YuU9S4NLQk_1-H8QwlOmU37M20ElNNgMq7KOFUkJqpCeAeNFJzUhVhQ93s9fvB18dxGq139_nnD9YiOl8m2UGEO0JL7nExCh8YX7RYCq4w4B9tXWnY_pz6aEIDMH59NM3j5YIGtffgLrLo6V60jOcbWIhIl0bAP6JOnSm4CVRGxaBoF2vNcoXYEGZ69alaHldstGdNwEw0fOCT9CbqbtaHfRRKassVAjtBR5I971161KMQK2s9QkaO6439imftJLWyEKQXuv8SrTE7Rx1AFrXQsGD1frm0bKkaarROqqmZ4utv2mNUzPumYGxV6Jlt_2BpspDcb-t3qdgv79XH2ptwVAHAtbLgz5AmIJPXOsmKVpjBLE9L9jv9_-j6sZ_xTgXRvgEa5GrWUvnOAHkQibQ2kFjE8BUCPxYJONWLrO7nhccNPvzYGVlayHL5cRug5bXtSMIyiJfZH4jobEil-ASgzWEmnX0NUqA5ET-HCjIZHS1suaGGQWZ4rrkh6WOx_aOpFYCfwHUmFVSTixmnLimE6A2mS644VncN9fvodW7vsajrkrIUEOtoQA1NggzA2yqa7lZjFISedepuPFiyvTY9rr7J_lndLrzXX_nOF4O1qvoz3_G9PGj3WnqGHedzm6tQC1jK-8ehIZ69AD12emQNhkbwwByDS49kmm3pt9gwapRGQCWapU3huusMM-nJ_U6tXSzFNA2qnrriYF4nsc0t2rG9_TPjUzovXlK9MSCLaewYDj6hmd_UQT_Am5-QMJ21Ao4PAiY_C9gzQODq3gcBTy-KB6TMPCA0-9Ff3rx41WPPsYC3uoRXX0DGd9Ef37zr1rON5ADGa3HRnoQ_ck6w39A25TSx5ReFIbJ33r8r9ZjEABAfz0QBFipQHRRQI1_xd3VI2qY_jWWP0w740udTAMiQz0mkna9ILBM3a4ew2m2ksox2ZDwp2EaJCDJz-l6uOh0fAB8SCJ-l-WJJgu04DMb0Uzf9UFRa0Q0y-iaBvgLdADWTM8RPR3xkaP8fk_FDd8BnA1-Obrsku8MkCS7tGTPVaLEmIN_As_8RnxphPgS4set-5i7vuIPWecprueVGAz9EQXqCfg7YXr69VruobF1qu810zPj1aPe9v3HEt8npu-4ekssaaHna8BC9OU2DMGq0LgHIdSXpHwcAn1VPnndT__DPYv_41OX1LSTNVK2r8bQDMjMNDriWIpKOHfR9xxAs0Pqojb-F3GHZobMNRGIaBCv10yfoSYW_PeOAE7dqmGTPejjnN-kcpzfMP2Kj_PRAkQ8TL_g-lXvMh_fMV3qszVcZxhuPJpCUKZv-S9Mv3bCHVte355wBDOlbwTeB3RYDP2t6InMx-LcgMw2qBPIbhf4TsaETTXMulAfPeMKnvhSnAE2qqDZtOOjzjV48ciGhh-aspyLoenRrDXQaFK_yATMl5ZCydwNJ-_lN1Kob-2KQIv6FWA_9gnKS4lSzjfKglZDssg0XBRatTcBlWrX4bp068P0GwsH__Ys-Cun6cGv0jkN_litvEuQ-CtKi5vUCESWo6QQ7X4Af7y_vWALI4xoTjyvC2i_kc-WroGaKkFDbMo3TSnP_L30AtOYZ33joJAdi3rS5bVqoMVlfi4zf0JiBnVc5vYuM6FtsauNYvJLI1tsZuOM5Hnpq-ncFbcLH9Stlzods3Chnb-9SawSc5tZ2YUp1-VNqdBiWX9wmz5XiLN-c_8ET4U-1Vqllws0sgKppq65ctGvK0NcSfRn95pRpp_zTb0nk12TXKpyjLSGOzSU3_TPW0mX-rBeJzNRQNFHrsep0IAhLLQYn-m7DLbGevBBpZzfUX9c2XEw_VvNJjgEmDWFJgOTiX5cyPI2EJ9JMVJ5lv0BL8pd9f2eCdCj1W9LaSRKdv7Re2wEo3C0-0TVUpj-1QEWNIEhc67_NmvT6bwny9v5bTDv3bI7_HvHsPN573ZXv-jlk0kh9DuUlezbccx7d1XW9yKdXmnImydT8V2ejYtAh1DEQMVeKqVQppQ7B5Tpv5uSJlAm683zVGqhAIJV9pL3uK3JVLyn4fLW_v6D3bnUdSBCWLordhdM11x_C6e6_HankOlvETcMycxgas-A-knl9HmWCql_Bd14sFzRf4FtEDNbMetlYqK7k96tXYNZT-fz7qR3R63EBNPwJ2VXZraYZH7TWveVwxG-HCVzYKIGaKdTFGi10V8beaq4RFHtG2uI6YxBQcn3xbWQ-qe00EIK5cwvm6WUmOXXYmtBKPrMvGrArjdTVW4i9W0z-26nc38_mc51kmGhYOOsYI7d9Y2zAtv_O-KrYMwJDqH0T7Aj-nfEmwFl-NEaI6MFjAq9nR2tktGXHS_w7A_aFUy_5A2HJFsoCCNQA3vVn6HhxOI7-Qa-k3NyZ9zXRZc8iWmYB3fRZQxOHIRgbXEF2krv0UmdMcRlMjYemZ6B3Rv6JnA-4dp6tdKnxkgcba4rxyOJQfozvgHoEijZFgUB6ktPSMZUn0i2e7EDotrAQziY4q3_3llo6T_q9qY38CrfcL0P4KSoDFm_N44zjCwVT716j1rMkYhj59HjGQ42iIwFZAQycoOcUAbkRiZG6JKuN1dikt7GAZagqDIE4vjlmkURSsBxby52aAiDAKT90epih4IwfBdtQjURB-SG0jgeEl2qDuiXiMsrSq0Jq35fgrZHRPxO9CMY4I9EAXYCgNd8epdJIXa8rklGhXHK9AdQItC_OICngfLxErfUhUcrZWHgkL0sDeiJ5PpDpFGlF3_gzNTvRBsC6eKsSy8CR6dcEJNAV0gisSDuIhFDwvbF2eOLwJIoTokblkyvVpIyUPaL0fRmQszgYLE8aq1BzAL0S3jdcOJRE1Dp0L2F-C4S3TfG1ahpaSysSyNJu4qf7SrWlrC-dCjb6nTIF65_Ika9hHyhTuLFtL8xJnz0yRm3PSNksRQt52fhWSAKcgZ9DRoOokpEUaKZoyNbmf4F33WG0wKkXf9hEyb3nTGKcrnQap4yabxYhEABFmjRK52aOo3XARyJfb6U8M56OkkzjxVqFHi7H3Xvc-GxcVoARTUGRVQQ8iDYLBAq54X-rrSzHIg9Zg39rJVJcCD2mJAjdTcHhtGP4s4s1xf3I5mnZeLnIpfQRTqbKyO6Ob9SorjKs3Hgiz1mX4PnudTiVv8s5AJ52TClpcPMIhRn7QB73fyCSXlIqRwCA1If4L97ldGo6I2uEvU8H4tTVNPSxxwdP3mnz55_--K7l9-_-uHHn35-_ebtL7-enf_2-7s_3n9ILkdjMZlepZ-_ZDOZz_9ShV5c39ze_d33B3v7B4dPjo53PnpxpZhpr_JhpA9AM6bRZ5_GXKGAqCRk4ByBjyanFsQy0PQAf0xUgRembjc-OfEPV-7nkf3FMqvydBAR__DAP-g_GXQUffrUP4KpR2RwcNTfPzJJA5O0398zZQ7x-3Cvo-LK_Y9zEMXljgbz26fGSSQaIzy3c7BKVCRDEPyEb5sJEmZuNime699SqY-Msv_eY5Lt7q_6tEuy7l5nj_5zjw71STakaSS73ZjDyu3Bpex2aXxyMlgBDV5Po0-f7jN9kqEbHKxC_IOOoicn-9vKDqAsrRXew7KHq2bByjkqk4Iv9wZBNPAPD_29w8GhL5l_-OTJk0P_WMbscD-I-rejy8ngeCT2j_YHg8He4EAyv398fOD7h4Ojge_LmPmDIyh4ODocDJ4MRP_J5WXf3x8cDi6PBv6Tg8PB8cHo4GgsWf_W79__P3_vUsZrJlGzeXBwCOf3sXH-mMhxPiN01WdS8qW4BQFUESzXa7Yci0IoQ5MHMmO1j3TNCdI8y8qGtHRpiFjnbJHpdJ4BsbtpoGGdxVoTN2cwlqgpUqko8gtaLxw3NpEtrAiM3nIELde84QoXPc--xujgZuOU-IMjEHSh1-fG2EoXeOD6LCm9QQzBLVlOBPBwjbO7vOadN-sVi8sEGwblpMqINkc-Lz6CI5YMLRVc-tNCYrhmTh8UxD8eUOO0yhCUzkFsUBAR-scHgX-83yhgfbYGlYhuWLPh63QessLpn6DPmRPuD56AmV-_09nZG5xwEaJWev_E5A4ODsJrEg36-6jEvuMPjmoVTdYRZrkahwcHe7bOARNPnz412Tt7gyeHZV34sLWPa4VcG_uD4_3jwyeDY9vQIZYZ7OMf_7De7MDff7J_tHe4X7ZdppgO_P6DlV13Wy6IqeozoA52y-EcUtOSMi0pbElhoX_-m0Iw1v7t0UY3bsz3c0JSkIHvUwZ2hjS4BqeTIQ7JHxyxfv3_4yAa9J-wwcHB1_6LaUAADVit4C58m-gEmD7E8LPxVjxbTCZCkSNKKfC-kT9yuE_Q-WpBBv09yq7JxkXSqOMPd6F2Jq38ISAjUEsmDSCOuu4V_AZP6vJED6VxDugPnpw0XjRJwcVo6cjNNWPcRG6MxTX6mKjQD_YpRf-F4E1D4_01BEnzxUxQkzA_AYCQRhkA8Lz055WfgLpMmf706eHKPx6U2QcHg-ODk7zTyU8ODvcGRgGx202ect2EZ7-df7dz1BIShBxBK5WjfDZHbZVioVQ-TTSoNqTKAqzFthEuTBer1cGTvf29k8XXOijEKJfjWuPQWjLSQrX6t153Ufln9g9BaJkAp3UsblteN-l6rXyhwdeeAuG6B85CcPYkx5t92CXE7w_2Ojk9OfHhlcWvBUXMYDXY77NqufxB53Bv5Q-OjI1VPWM1GOwPawvrCtqkw71Ojt-O-ajCNEjrYDYzx67UADrhe35YEP-w3x3BdRkZ2BUN_CdsFAcjB5iigX_ERngnR3Bx_GP8GuzjH_-wzIPDnjSOtXWIaKVvCCkBXAcNFWrwWxKWwFgDbQ0kKCCxhO76Ym9oRI1ToX9Osyw1m1UQ2un0T5A7c1JBEgOF9vEKqwegiqvlP_GfHB8dHvtH-6aauflEc18cPt7SIYKpAdPQ4D7-OWT65GTw9OnT_krVgN6DXZNrEvnHx8wf_CddmT78Q_xzBMZKDHxJmX0M7plsLlAEWF_a6qpvuKrCjOdZMpuLMeaHBODOiIva8bAvmX98CJ52gmuSlEfCP37CEhxUEgeRf3yEX4N9_OMflnlwJEYQFKDR-6sHRvVKav_woeFuz3kl9d7goSrbcxBKfyXrcN-syCKon0nr1tU4Ma38VqFTVtXtVrnqhPsHcNAHR10Fq6aqizQYlGchiAaDvYfOCbOOoKXxvVt2B3RpDlriOYD5df0ZcTRYOiHZagX-ANugXIRoIXAtfzV67iif-E9QR9CNgF-tb7yuQ7-63jetUSKtskaJR4KoabjFOftD_Yc5eSiLGGcrwcMl0BfLusQX4cxbPasS8yx3YH___g70GzvgP7QDQ_dugn9ufaLQF2-ODndp1Xthw0Y4Su0k7fq09nIPHmfVoNKuP6TqMR9YltfGWwzutVGAnoFvJr3OojTmgqXdbtXf9f3-SuOVh7stF-a_0zt-CPQc0S2XthrJuFx3JjggZeEG3sca-B14rfwXQVopuSxItytoHUdktTxB6xXp8JpEW_foIRy1djiMI5nS8VW_7qTXOeICeWEdBNTwunATWwJPaKtV6WexXPr_HinWurwDDV0kx4ihynJV64cCkVajGuF2oePT_6g7c3NrXTQbAz0eMZvrO9vqg88FEfeQRVCuu0f5oRmMrMg-qq2GDqGW7gNLr8qetSL1MlLeXOQDwHDc0wykUhlyZYho7lGZtb_nsgqigL7Cmfj7-2WJg-PSqh1K7O-bEodV88e-KzGGEod9U-J4gNLXGgfeJO9h8taFx6UGNLLVvx35LauvZpvbrzVnfIf5xwf1tL5JO6x3uyA7PvNtC0_u5QxsztG9HDvN4-N6zqhqbYBKW82cgc3x7-Xs25zGkuTEJe81k49scn3GrYS4jg-aya7Xw2aya_tJM9m13ZhxWrZ93Ey2bfv9ZrJt2_ebybZtf9Ccv23b32smu7b3m8mu7YNmsmv7cKPtQ5vemOa4tk_-0b0c1_PxvRzb-aAx3-tanYF_L8fVacy6qNfZu5fj6pTXbHBwUN7RncHBofW85KIXjcXlYkq8WTGdJ6MvBhoFHpDG226QUUz8xusqwDJqBBaR6AsHUCtQUfwZLFCm4i00eZnKRN210IaCGPiDCoeWbepRB3ZTOW0lhj4DQq0PQHFwcAAaoGlROeKooCZ4hCoBVQpaGKVJH_JUwXvhsH8CESsomMZ2AWCh4gqCMgoshw7asO1w5JxloPsbaE70Y2Qddi3MK838y96Sem-AfdhuNNR7rB-umBP31vEGv0L0LvE5Y7IrejDFNyjwZJU1sexyxfBIhxjfx2LIpA-OV4KjjQxkcECGlZjXcDHj_Q6tCBVPgNUxBM5FSYRKJrsb3eoGNgXPNXLWiOAJhhepVmK5HvZPMA6IjjJC48az0sCRvtZKFJet1B6q-82Mt09GNgZPNp1vKZZxzzPEQJcrZNRYJaXaKwc8mxSZN8f-SdrppCeDwT4idvqEy22MCqPu2eCEDHbwuBZG_oN8B072_E6KrPTDvY7pzzIS8Erbvvb7ZV9d_z_sbW9bb_4B9uYPVqTsb0vvxhHrYO_Y9X9Ev9ar0xBGNMP0Cv4hkROTfoUTg4DChGqAmQ3-w5ntb5vZEzOxo-bEvjZRiPNmyQyadfk2SU1a-b1vQ2Hf9_fRIOwrA0XEApVPts9f3I6EGBctqOUfglY1WAAN0x3De2IPDeXpU7-_AnbcIe1uK4A8qnRluHTrKhwERYcWqgYdR9vuG1wYCGDDFzWm_-AA38cGrwe2a7-OS7sHhaM9x8nJYB-4K7SLDolB7lZ-DkD2Zr5EtBczC_QE8cXeYxOR42hLy7psedBseb_RctXPXgyEBmWqYrIfPiaw8XsxFthvDvOgOczD-jCfbA6zq3d9YfABREEeHu1_vg47_IgpDqjNA51txWPxFbWP6CRXrQRS7LuMDhKB_lkiMaMYFA7E2jhFlHxZSbUUqwu8wMMpHmRIxh96PZSyZyVkXK4pQcO0Ko12Os97Hz-K4ud8vADR12YsOnCu_uZGOhU2E2rgOXhCRw6IR8PnTkkzeE6ZTLj3SImJx2TNMka8AI7Zh0CHoGbq_HdBqFDFpPHIzpxc-3dj-KTRY7ESWqeTuwCcKK43XOCZasZ5EEjQcnA_BJEzCnD58wGVgNqcg5wUou99cAEIjO-fhtf2BQoGMQPUpzLKFjX7KeOAugpTAk7xRKVeatQ4wRHzaoUTbYTjQF9JxvS_p3PQ2ux0wH-u0VLGBFK6ykYWR80lvbNITZ3CQ2oVo6qwOZFMYqAf4S9P7EzKuckEjLSW8DdI1kPjiExUgbTAdy6pdN_TUgvDMSRQm6ILwAX4MYDFAFBto77QNi6no2eNJ6rVamtsi8qJvfO4Tus-pFCPxTj1zY1CEnKCcC02J6jBaqAMhlUanxnt1g2jjFCmlTlFgersRqWFBjWd2spvHMQSkeEATMa35KLbQ1eArsH-uNKorXmsabjRxNgzsqjHhWUmEuiNOZoyiTEc1GZQrAiz0CkmsaVcAAKbxQWFv2yLD8hNF1y6jVrMkujKGZYJ5BGIEuOyXi63aRtDSjNqagnXoGBLiZFIr4FTiS5WnYarVTnOXBPkgTZmhuhoNoNeDcHiQJrwCmDtW7nfE2yJKjUgirOw7wf41tz6tlvXnCCxBfhstX5AjP9pF3EgWMC9vHLe-uv8mHel_A7UKgcHB50NdRpwdxZuP0hbD5BcoDsk1MMMzEcf1ZysiWvlpckunDlxtDrPEZZyrbDUKfdn-DcOSISzjTdEnKWPrBwEkJIt4J8ClIWueZ-NeZ-NeJ9NeJ_NIXHE-8PRCXnIjc9w0uXzaLSh6TOC-GLI_LwCbiWsfsHhts9jNgZatkOu-QScge7468BqMqIZCnHZXb5TRCNORl2f_tO584u7pMDO6n7bIhG6CV6hr33_cIfUoxt19-k__cP7Etn9rupm1Ap594ZWQ2ZKJPjcpza0HEgMbfr4T__wsVSIDWYUOdW1PKOYZOsNM6B6bC60VynYmLBDzTEbxvfecErKVsD1fTWHnf0dQsZ_Vvn_9A9XK_-QomsZd2mb0-ubochtwmhFh7Iafr3hzYHibTvcp40Xr8G0g05yboJkH-4HisGMogSdf4koj-3sKmUV_iydvpK6lxQwotckZyT506Q15kgfL8rx4BVVodEXIbawC6n56nUzpGY3-edGiY2gmzsP1aRBUmH9e4d0HSMuxqLSvVUoZKCPKUlIdWkprYU0DGVB8od4vWDSqzsd8RxgTBroJyglNkBy4_7SteFEO-lUtxZNtQfgDhRUDSsVwkiCMzPVcyiT3SBb5Tw8D855ZKJZW1gJGBVrptQwLlA-j2kk4zIgoNXJ_cyJvIYYZ9cbVWtgFyrfL9Bom6lfwIpEv3KWumcjlc51r1Aj5v0DXfv8xU0Z8jnyIbYw-FoYepTJCf8MllpyztVfmOX8Iqm3XH1L5MR4uXWq32974LmPMonGcW3SlvOqioAaxi1uwwUeVqmAnZDj4l2qr4icUzSJUuAFwLlXAzMLCALGdsmfJOQXIaUr8udFD37vUrrL5MQZy4QeRVdPcsZz-ELfBzCpO_c9kxq-LzmxCYsCCjivlJRF8obJLzHHbYjkGZPnMY_0GdNnMZOvAHGOnjN5GkPQJcrkmw1XoaifaOLC0M3o5zYKX1gWCDaceQFIqnv9Uz37XINtoHcqjSlyKx_hto49VtbPeukYCmXoZ5auWSQ_M_nRjjKSz5n82Q0ZQyvL79BH-nccXmj5EX7BQ_drGZVCGgOav7DYX7wNITy867RILzMMPe5s8HqYloKbnDOdaGzuZyL_Ym3B5Nuque84kZ-J_M34aYcWfSbfYggTnzL5a_nrb070O2KN_SIPbE6u0rHwmDdRQvwtvNjggo-gOGWbZYur_MbDOAKLWb1s35QtTQe9atzGl4Rn8Cb5GzED7HRsNcpwfeqLgwP91g05YvIHt7jPuPpClmWoF-z9705H_kDk3zjlb82wJzVt530TJKaKIoN3-DPaILShNrHV-1gdl_NZzwYbgUMrf2qu2SQfgTMgz5gyeTH7XF8n7zJbKDNb-ayKKtJYHmNTGXlfxN04v5Ee86zZUPMLjF82-vlMDEImv8WR_Qhquy-d1YY0hhXOWONlKF8G-oxQ2vU-el35B6zgH6aIuoOZ7lRev-XLyqX8gLK9Q7pa9SltPCjYDOl25Y_NdCZ_AYMF2efLdBzIl-xKJEpfikQHEFNozaTPl8irO08ui2AZyZdxIPvrmgsR0ICN5IDJ_fJSHTJ54PZ9j-szJo_wzvwSgU0tjZk8LqED2KuVvjlEb5SMrgSPoHO2J_ZiplEqCSuGis_OK4nodCLByhbBeayoCBxeL6aN0-SYDmvGXgYpMPagYI_MVErkL6DLD7BmAKYJxiGgMfp9OgJj6VKxCvjFKZF-r1wGtALYI4Z54s2NN595cpflyRgcnip0-isPwKjgF7wraxaxTMecPC_desvPEEPCmYeAO05FCqOpf6ZzlUxRi-iVFjPifQQ7ggB8M6AN9kYxY361pSScuQ1nDJVhA7wRoQzMCWuen1rUKh-YYw2d6GbZ3jwZn-ENHDCv7-EZA2fOv4NzTvkLK91Kl26YRmidDsGw79lagMkTOI8uNxHQlo3JFtvWhAkSyZfY5L0u267L0LmFo7GhpvHAWm7AEoxF0Ob9P-kIqVxw810r_-AugJFNBXYKU9xj7vwip2nYqIK-UL6Iu9WqXZowV3ZmRPSkuPndOORZrYBh2OnAv6BQ9HK1gsAF5mim5aFM1qB74qGzYHi30lDbYEirVXWSwe1KWUX6ayDXMRFqdDquSmjuA0vcRUqqq0GZrgFTdzmwR5Lj7XtHEoiQyzbvVNUaXp0crw5Et_N0cmlHYC9iCaMYuL1hEO1N7hMsxxKstHZ2aOqLoWz3CbqTufOY9HHrdwYHQJbV3ykXoocDQNrxxf5QvHcGRH5pv1zvvuJ3AE8XjlDTaT8arZkALsKwFF3eYijQ-aaK0piltUiHOz5EQ1zQEEO3sEXJW1H8qZVw2fiLcDnqKQvUy3uobuaCYLK06zNTP7CJC5e4oKwt9pFfkXQ66prAiGveq4BsgGsTaoQfa9rcjQjjech-r3xYcClrsBK3qDxh6PmzwgHAvKn29g_lZ2K93y8faEGEsl8Z-oqQ6AohqPVqjv0a18sF-wLcxX0Iww1HVTQ8HPCaURZlkmWZfduylBOy1NYSS3G_ssUynGQlTMQAyf3-usY7ysxLrkN5HsgvtAlkNiC8-gvAe8r7NoTP1wCS-stj0OpZIG-ogUp3hHZVjb42jsY0cGi48yruB9J5eRgugIGAg7xG4SvwAyBiHnh5PcEwgxDDA1AZi5ljsRIxRxez4MvnZcks7p8otE-FsQJqdJ1keP-gEbU7oJT9QbRjZC4x0FxZLv23ABWWx95sjARIWXQd823AVfGny6oSkq0IT1UJOm0MPxOKb02HgIecksr3uqJsHDPjmu2ti2YGjoVLBKYWABS8qRG6NgG-rMuJTuddNe6mW6xk9NciVSZOFQpMsqQWDn55KZKR4yy6IwYX2p0qCXqj8tWwlFRghEXusImcm0hC996NDBjdzv0KEvM5PHoAAVwM6NzGR4QVyBj6syYJB0nKB6DpAOlPjAWyDOUZOM7t02CD65hRy1bQZaDv1Eg_PhCfmeB8yvFKS19uMOJ9MAchiY2mOBFgKiTYcib0VT4OnKjEe_vm7NwLvJcvzj2GKCQEetnBXx4bKTEWEpymFIGXylG2AKppBqIqb5SrwgOsdyxUESw9NH6UegdUUsHcW9zq3XmWpHKIBgOF0Dwt8p2jo4PjHd9bMyAHgnQNxiHGTZZhGIlH5F3FW1aimOeyEOAry0wk6UHLwO8LSob0TaIk-fSrse8E9RUICtaaJGkmwCdXK9Ea1PrADVvXX-_uQbwwG1nsFPS-HhO_iyC8KcgxZPQmZ9kNI6nZuAAbqjm6ClO2RwfaBKhVsebLqw9S4eADhPPOSEKZeAR25YF4BFeJDnMCMcfaMrlOp4nOVa8QcvwMTzWgxOKm9SzLL0vZV5SiebcD8P9mF2Cg74hnmmtBy3bZ4DYBSyfyjLMiBnSbBzbPxssOMEKMgzYvZtkCecXqL-aNnD9Mb5aP0wm6uPQ2_EAzz_km9awRNUN8Ike3li6cHcuKslWwP6uqYfEJ2N9CqWsslS3KqH3eJFfgRNWiSzHLxk5OxrIND2CAspQeJF2Q1nckG7MyYhW6WtA3SOkY74k4qhj2RpRUjdn-a5T3WX7JntgDpKgKPSC-Nz4elIYOhKFpTXw4aiNhI5dKfi7NcstHlYlOZ0_sgVshg2wfItR0wX7NSO9HC0ZEnBsSwJ7DlKtr6D8DfLdtJIYlf-0Br9XkYd_JpVn4w666t9W_55D6h_vN4H6ye1WNL7bVSrwnKUvB4By5IEYq2umY4OHOpbzm4JYCTOIzdMSAyAnia6y0YC9jjKuU5Ewwwxkve-zD83XNMW6Si7mnZe3YAPYGbiCuCNKBqxVJuAm6Dm7cbcSoMpQcQAYEbokWP4o7MAoySAPKbjDwgYv0g_vKJsY95YaMuYTsWULMUWq3CdYfVSfCeJRz58Geg5QTWA2MQrrIgNF6BM8M4tXocbXTWWA-PgLgSqLcbERqKin7jk87m47Ma7Lvuidu0D4yetr26pbnpqqAjvcRU1JX5JpFcPFSZl6HoHA-eddogVDqCulZJcKPIPo4ywqIhTcEyTlOh5Y-aTTHu4wSvrJZ68EXuZxYfk3NEQMK6YpM2JhgoHscksYoe0ZtrBqkqFozbn2Z9er4OkeFT1B0B60Rr6sOemU4K7BKh-YgAFcJR5Y19hAcONxPwKTH6BraOo5-Nb7vzXyjwLrGIE94nagsnx0AViaQSymjhCnBhICurKIwRoKNIhVDtCHgM5aDzQSZUHbdjCO3Zs3gHbULbbxtAsvl_-RNyo1o9N51svJk2QihLu2lSLg8IpKyBZHVycezZd2FYqSfEfjQ9H5Cb374CbqzVkO29Kzc8wCR4Da-mgNjGy64syokQ-Wpu-aEnjm3e6XzPOPpDp3noQ8NknQ6iWkcyAZ3ZpMN0Ip5zSQo5PqEXPcb0h1jSVr_3tegbLAsj3fp0ZqVwZmsPChI1gFplE7C8s7Wrtm9enINdytn4PqRlkgYdwve6ZQmJVteCIOCoFaE--Cb3kxdBnPtIn5g6uBPkESUTTELRK4xoOYaTsbIYXK_k_JCkRrwrd9ZONqjkqhBD8v_O1d363UFvWQAKQZuwzGrbm5ev5Tg1P19dYMt_I8Uy2IOF3lYwsPSTyNX1L0HwJtCtTEFehzXERDta8qu__3FXrOxUfZAIG5RJ7OcC2qpi0gxVUpGFeAiOcMriN4qAWeKK8-1mSSktrqi5AMoxGyU5YiUfiR_N3ofU4HDNG63GSYV9STjGry-YgL8LUGsL2pmms2rsHLZFY96Tw5Yb28vZtmUR72B-7isgv1mLGGg_m7ZsKWLPn3eK0ZKiFI3WodkaRx2aeegK2O5AhdmBjSka65ZwvVJxnaOgX4EAtFMceNH47VN5DQzMurzXq05SAECAltKgaGp4RhEGVrMLs3RA5ot0Cf7R_3Qm-WXaSa8QJ9wvz_YDz0MOgkupMei-KLzucfMhILleK6gN9PG2_RWZL9Cn-ze9LJEjotRMhdBsl5TFHxk6OFTkPeOrwQB3D4mUyG1x66S4jxfjK6C_klF98ySW0x8C4KiAgO-nU4RgpRFyjQG_oTtRTt1a3TaG6GnuFdjGNB0AaI9eGCr-mWyi8RXuh_dQf9T7wkIe0RZHRl3TIkp7Bty3OcqnSXqLkBiFkToE6FAczoAyhMEYulM_A0RdJdpIpPgldRZD3RQwaDbogXUsVLGb9A1UUFoD6p9yKVgxh9bQJzuKnXW4NCosV0A4RNQRJdIP7Lsi3WyeQp8X_0bMiTRp5R3BZqf1BAn3j88fFLbqoc8PyM-9z4n10mBon7wZpadmbawFXiUfWjmcqE1hvcxqmrgfpQ8g3BZpx7znv12fv7mtUdXK-_V67e_naMHz07nGdHP0YeWib7g2mBesbicpRrKQzhzkNtn5zX_8A0dwaVzwVg6Y2RA8Abq5zL0kjbeJD2d6gzEBzXnn8ahZKVa4IomoCb79YLCONM7F7f6fkHm9_uUwdoGtQrw3XA9asU-QFWOdKBC9HpYOdzMXjil1RcOV3kxtOGg4Q6LmFtnoaBYoOEmN_Q5Ij82Rokp0fsMvdoDt-sczsAZNGEVEeR1qY3XFjWdD9A2AeUEkLmfEiyMxJO6hva8hucsjzrfOI0wjmzC5uyKTdkMHNaaesBFABKkEcLHLP55pPd74BQrrq3TR_AIHJlYXjOSVuGyAL9DTA-pNxvR3RL1Qg1zEEXmTPKnNd3SbMN7YMYlYK2dTmYePAypq9gS3eEJFbxgC1ksLuH8XwoUvIMTtTX6ibauz-UbQ04i8rI2anljno2InAHNmMzn2R06JXtxqyFMVo5qgUuHijiAhMiI--Dye0Jpia7A3S90MptjofLLPLLsCmZrzeFLbVCDv9v4tPbKtGVJcqF7cjgvCiBItdjlq2-8CMOJhxsIJ6F860GAXaLcgQ03akO7tkGzmnMIO9aGGN7vCMZBgBgIzXDOEDPmE7Q74g2mBYZPzBouJksdZ5Y8HO7Khn4qw_8ACmNi_IRKEmW5YcZvfdf7WAqZ9ejqvHQbXa7_mgbviHeGeFFLwObh4E2DyBjLuZMGoGwoc4NKy0f-HiGTbiNkDPoojNM6yKqH2thC4VSq30gIUKak5enivIOlCXQEAGCNmeqIqLmVxrBleXaC2jnaQXUF2ghukv33cdaS0y5BDrUoWfDLSQZRTpBHg2kBmAfW-kodJx54C4LXYzXDBHoPXKH6rM3OmFnXaGnnPH-5pqydVda4qICbUtATkGVhNTVgRLrAe6ATs8nfy40CYYphO8uaVwZwiFpgGiMoXRDgxJoFQAWcA2QJPq9ZxrXRr6Jta7VSq5V_0O-foF9uXIy0xs25TlSkmIx5TT8VbnXas8rlgrKs-k2ZgqtbNi6qaMMLUCqoTRUeiNpA15ThUcKguYV-CxclKAe9IIkRftanBkhQoYXCncIK5gK5qLeg8mwlKm2fFQZxzkEQU3N7hkYMeGAp2DLgJ7Fno11znV6CI9lLi-e5lOg9gNKCWM6QMSrMnF_aSLPruPLBqWZEkRRiy6ZoVGDeF93ptH8g16x6ZGojugYRZoJa6Cx3SpaR1UHK4zUyGRfIWFqDGArAP7DuUKVyzvtsyq_AAecMZv-i0vBLJ2RmzU2cqwr_pDpbpA005GqFin7gkRupHnR8j77xS0jiCqA1gst_Du5Ea7YAmgbyC9pqGsVCfDLstRsQdCcLOLnRp_9iXDowi4W0q8gUWCfz0c-e8VvLVUrQVSd-MUTHSi-5RcWtywY1exu933PuO7lwP5lt_aBWEB4hm56qWrogLygTwmm8Tler7AitWLJDFCaqgBSlDZAAuTQt74J01sBKmFmbOjt-vx9gK-HOQT9IhU0MNMCc8LhvFXjbk9WqPXH35yqcd_3A8cVYH13mUmOoPEfdfD2cn7j84dw5D7vjk2geD-86HXK9Bc6DNcmdgfM1JEaYSuDEi3ijfDZLIFKYQExAMBwnHWHEOzBOcgau2R6kj0v5xKUhk2lVAudKx3jkXYmiUQLXhSKzRvQy65u6lg0rSIniZrCiJxy8hnYWc9gtizHVstKxDdUFzNaERfVIjirFgNoYQ6XfB68mVcUYQA5iOZbvWJsJHhI4HRUwABsKBYYaAtXfATWCkDvAk0431bpQYXuucuBcPTcLTCuAUyFJoQyEoMbDULpayTfEs255dqp9Yd5PeTKGmD_l6xV4LKlYRIMYFG0h6KTAxXkB4i4tlEyyHWHirmHQMwtLZKdjd7d6W-DJXa-tMbM58VYGZa2LjEdIZxRI9DmzqDazXEpbzqjDEvsFPMOpJC8YEL2eRYpBqfJ7QplFWka1l3zMPn5Mi3OLPAsF1CfEUEqnC4XByNo-u1Gptr_XKMWqnkLxe6XkrTECmgDdJnovEFkk2CcXR6RFHi31tAqqxVoYCgs-TvqhZ1C6nSIdi9ZMzHJ1hzGaPIglWsbjqmKq0k9MiJiyKFpG8jIONsaj_i-NZ82806yKH1N4TKgYmZNyQCpdB-OoeWl1s7iJnSE4qXHsMBJK2RCwEHWOhnOgV0ksU9NACRtlxStcrErgP3v_lcpJ7jErxIGnnz1Q0Ao-6mUtC_CXNUWlessZv97EJeE1aKYwtGv9zXF3wBX7DQL_RjIQImwK2GVRPqAvIIi8JBQe3j57QYxwA2IxAHuyvJPAWqQAtlPKXhDk4rppYWQqM6cMb7Jn4xEZdNPoOL0YviOfwLfQFAOBVqF-QOwDnjns7Wl5j5b26q09oIpAQQsLQaAsjfIE4xfoKpHgmNa4KconlvpoWcBSAPnEslNe2TBuZXPd8nJ3bEwinAiypZRQ3pplr0uy6kXFdcZXALi32a2dbZSdwq0HTEd1OvWitcOS3Zqjjr1ktxgH1HCVCRqx0WWDaAM_7uYQhBkpGf-ylFtpJ9agda1Wak62IiA5W7PsDSjNU5Z9tn8_cp9F2c8se-S0zX6r6TerS2BHvwHulfn5GTUX4af8CYSg-BP1xT46JBtdfcF5weAIwG0DxVFw_2WtFzDJegQzap2YImspyIwtggyTcNzf8ew30LrK3rLsVzfUMrwG-BEW70n2DqNCEGVEvEg0vkX8OPu2pJPPhGbZu8p-YipceJ_i2d254YwRL8UwPF7Nn3D2zLpMM_86QddCproAFp1AHVUrOWFeAiFaPaNJ5hkjaePpCytYrGzoKvH-ic0JsWbgalbmv6jjlf3EtwaXHLnYbXSbdsLIaBtRlv2IISgGyIl4qkzEoHY7-wm0MfXvgFzgXX_NzTdwwqrfIAd4BrTQ66o_9tq1zl5T5-UfFvxlqSdQxstG3p2Lj20qBeQNr8bX6Yh35I2BNps1EHpk37uQGRtBKVmdxdUvGQvOyz4Gp2QpHFg7lyGazv9EjPdwxOgvSVZbx7JeyTuB7VuAM8ROhwB5taiziCDmTjL6UuMPGQecECIbTaqaHNHNwnOVz3ItUKIinYG0hqDcT0jaCI-6WRd0BICjDruDXFHnVo4VPPvRELl2fZFuT6zIukzdXG4kzwvkcbh4WZ1OWrNImJLctpGye6HVFlwckgWrRTA1wwXmTLkioR8M4IjYbt1ZSJzoMHGnpD4g1m5L5NHDVgNXNOslSiSrFYZm8OC3h6pk1fjEJTBBUS5ZZ0Dk2DWgaZ7roRwCdCDeA9IOSJaJHni14SsBlNNLuSv0i7xG-MHVI5IxbxdN_KYN5wNYDYaSrlZZuCwPWhGkDKoGZdW1O_Es-6MmWHvPIxzzyMRN8JihEwRdWgaKAYDACcpJ9i0D3nf2K0I_X-zRSjeeie3vUf3xNj_tawTIUvM14vzUvTvGPei1UWw1Ez7tdE4NFp0CbAvvh-M05QNSL-YCR1Zn57TOo1Q2LjnIIg063Su5LeQUPWzYhgDDpyzDF88we5li1_y-rZ88KqeOut3lzF-BHyDQ99vUowpVAEbkX29BJ5cPNQAsXFN53OnI469VtpjEuDnuByfQwFi-MgKYwtb6WxDXdSOqmNrALiDu52WBS1JDa7cOw82li2QMOKVgEwQOpd2mCXCZsflQvwWz2BEbcVDJhv000iAQtq1WZGlVIhTDCLMiyBhYswJjVH1LGlW6nofo5im3QlNzqCu-LsrDHfoXIKGmk0s0TwN5lAKe91VQtglfSAZeJUUtGb5KmDvOZ0kqAR1uDg4aNlbZsArwBXZBNuW666MIFjRiAv2MUDZeKKv58h1xAZdArwmeIBB_nPYmqSo0BNYEoZ9Nhj_XmAsi5FRO3yZTgQW2HrXqpNv96XavUYVDvWsuJGoFRJ5ZeVBWFeN0MQNV1WQ2T9IpSCLBGBFSDBwFu8-6pGLYMNgmEjyan9LeQs8wICn8wAj3Iq64CuKSJJG30LOPXlfUwnZLNP9gbXLas7JoiDBzNxf8lnY6c6GQNJQjgdhE7RsxPeM55NkdVCBe1YBnHvzTnhLjFB4FCHjsfj_PF1Kze_1BSDoT3Xf34iPEsNoBIwF266wtXfNor0tqYK3ZDlyhe21XdQFBmbtlyeDOZrfVamT2VnY68qqyHnUkC8XTABttG5i7enPgesJsM1A0Qj70q_H9QmAW9zVCp8TNGJnze90b6IEK2VdkbgYDVCSwa361ZfgSL9vcXZ2Sd7fEq1Pec83weki853MwtXJybVOuS2ToBV5XYkhUVwmNHNaUNR4ayaTbosZbQk5plfAgi_7U2Ckv63fU6A48Iqc1iyX5HIXIIiTZZww81-1mH2kAHya0YWU8Ms_n1sgPm77lHhiF7UxydZOosccmhFJ7CYFfhXQFurH24goD41cpGKHcRaLLPTQF9-JhmRZXXHQrJSI2D5D829p5g95AIDYhINdoMPYCsObqY7BMIojRIAGIGFoAm-XTVHrMJQdViXVQFckX2lubGKxOrApYTPt0tdLXiMASsRlFtiF9hBBqWMqc7IqER8Yes1iSw69qiJJZpypaC9KEaAVUCCTD3lwWQl1DkBarLl7zZbQRKFVZRB7HRKNsXncbgGxPjSEsqY1aDWSn5OSedTpE7WPWf1LdKv2gz1QyMeIiKxbCMFcnQBWoExEqkDdkEH_XmBH8CqqGpaiLpCxx4He7lsEdu2Q37As7GwL-iioA95QBKzJvE9EnjWijdYJE9arAX0Ut-nfdycK9KhWxBPPqpRKBw9iQTmh4IfZJbkDhBMg_kBD12awedM35T6vUvogzLlqEi2BhXE3FoOOVwYWIqivcrwUrKwCfQc8CyONo-_A_E-1F-YTGwzTaj7liaXQQc83S6DDmcs3ueATZpgy7BHYFWPrd8KqpL3zHZ2eVFtwb8K33YGxOze_HqEz4lvCUZzwC0a_O52jASlRPmbCV5uMy1zqfuSwI8Mk0jdk5P4sG8c4ZvANn_Czy4fdezG75JMymQXYFAZpvo378ODk5X63g1wk531U21Cfa_nc6poQ-OXMlznaViQ-KBUDwMocYMJ3ODcRjRXxsAlp6Ez6HNPoUojluiRS3MzgARTzS7V6xS1CcLlYrQQok1N8Z8oyQrxDFzTOofZIyr5YGTOF_Q1bXWzARZA0Eq9I9kPcG-leCvK06_gY4ptEvw9ehcbquUN_seyCeQVvEvpEltQ1GIhVHlrzhwKa7BuF2YUKe_rv3Sdn3qfm0oxWJZXSWx_7NxsAMJ6EIFp3OUufzYBH1Yzgfs3Q8zkSwiHz8NCcqWEQD-FyzAvQbp0abbMSAoR686VWcvU5nBCYl9aTdUQ-KwU82RX0KytzJanP-hS6_cPc9vOUpGopZmzk4U8tLuDEJWr2iMcJo3fQDZgKP_SqmL27nxIsuLubLn9bw7-t13Pj65n_9z_8nfrwiUa8dxl3qMW-68JwhbJ_lvA8MJVZAGCTNs564FSMQFVJgroak6HS63QVm04AUwDZPu6i84uSbhye1Lyids243oUNT01hSPjBQDLpZT6jGd82jPkPV2icHzI9LAdnjdNWnbAzcBuPjrO0Px3nFryS1OQDDCDjEcxjJxEj_3PqN7jlt6KFzXHYFIvkp7w-nJ9dORDvtdul1NI13dlYrMo6mMV9azcsqKOyI3eRqXDwTk1yJYMLc9kP44MnuYO_o8aHYp2tov0-HZM7bV_B2TDiYb_FR11-vb67SDMTy_19j19rdto1Ev--vqLipDmhBtGQ7j1KGeRInbnNap2nsNO0qqktLUMyYIb0kpdiR9d_33BkApB7ZJh9iESTBFzCYx507Ds-I8aYl34SDmEhXcAmeFbpoGEsEV4AsLcOZTBMqdhzvzjr9Xm8n30X-f-N2Ync7sjnMCKhAz3Mb3ZKSOUNWLw_SI9UP9h7uxKxjXNSr8nmh9bs4vdbAULzKJ_okSStdBGc__fru4vzFH-e-PFY9eWqqwvBbn1GC_nDkD04PJ7UseKAugkzfVugGVNN8sQfyrTyRX-Rz-dqufG_tUvtWPWhOHSfd3lr8RPQ25Asfd9TrwfGRdU-IEzUZntYqzYmpbewP_HR4-v1eBHKGFxkc1aWuiIbDG4kHEieZQ7vHnde-PO10vt9rtwXJkxMrOr4sGW6ydeF7rngxOz3cjz6JnjzpPpdfus_lBDQp9kP5ofgk-pIk1MGIjpkgOuz2y09ir3HqfmMX4sdLA2igBfGwF3X5V9iTt3x5bsNd9-QzZRa1HSeUpu22-KDuMLUphHwrbzvn_s4d7pFrd8qqc-bvPvPljGITs9qhrMxy3bwEyH4lCICh09XL9lEcxaFbwxsHJWqKolVpt5I5QVgGeWDlOpFYYVFKiABzf0SUrMP9EblyOx0c3lzeZB5AhCuQCtubT_1dIiDu8uVyensqE_VVdkFIbE71KUiTQAtWYpGUtU6dfTCJCIDWyjMYG4BK6j_F3Gm9ICBayiLIWfuGz5YLEkFhtqL-LtQ12WURkxd_UyvdzLewLmajyIYE1Wi4-a3n17SbQAlVo6UmqjS99AWFZZLsuyza6PH3_xOPkdnWi_3-1SANnWDugvzCa-pzA82F3bU_r9EVdphH2HIhQh1l_GByHBdV4xIBtrf2iR2SdKTm4UZp2nI87VmG3uwGOB1-c1nAWwBLwZcvqUipjS5Zy3nRtAphhdVvsCT39pww6uifKG7WbFTAk0AkEomMoEyFH6aPaVu_E2tZv1nNNyoMZ4q11Zwzgyg8zkx98KdpKv4eAqY7-rsmn00N6quoBOK2joE4oYo2HMv5iCxRyOwip4MGhrAVPIBmp_TuPX_AG-wmddUGENSaHdq8pcHMgqLmKh_OCN_kgWtizq2l8rrwOc2jbj-sCbz4s5VKfwBCLyoR_9hnxvDysOcnrkhw6TBoPRPnsvuwHCflq_iVgJ66-9fQez9cjHaDSpcVOq31B89bv-GquFvMVQNhN-7Q3Zu6Y8sxufK1v1j2DlXZbhfDEnzBc4UflFOayDlEdwEB1YhAiUU8mYS6oDbp5EUKvZJe81SltHCaOO9Zcpkm2YeB9-7ZG7ym1CZEuNzXWKW4R53RWgtOGsMJcnyVpBOubDWFkwQF5YlEMyjHcRa4CuzSNNQj1weLLQaj1s5J0XA_rjspmqjuigg2KuSTDQGKGV9bT-tt9UlnM0968eyWd2AIrzCJw_Y3yMXqlciMw4IkZ3pGCRLG6gfhiiL-7_L-3nv19HeXAWMAkHMumW5CKRhdlo2lfsxBKws4O8W-y3m7PXcqTAtjiab0xqzyYmlTY2DnpGfsZto_FGsmvA0SgvIhnPF6RT7Jc1GQfVlL5uoVrCHjIahdqFz5vfag1gJaHWXASmTEYokIOSL2jPeeuTeVs7vE5hxQILkOznCWD32Mb7Ey-UBK55u32_oxL4vin8-gpAOX-JAwM8rqTbA59w03YSPIqzfxDScsrdUK1pZcGfV3LicQGq243U4Rx_nJfELoMjm8KRPEf6q9lWbrkGXuvcsGhaldH1ZXMHyTG6uu8jdolb7ESGgk_OkiTPxoYez0GHNwxVJfMjctTtoWsACCwBLfIuak1ZH38vRHNzM4g6MA69VCs3AJ03OmXF0CRRtS9AWWg514jWcmDNV4w1kQBMF0SVKZEJfpNRhOFkw3HcuxuiL-VnhVUQHABWpMm2R_-NS6wO9sEvElec6vKKJD7vNkKrgrtdZNu33lgl3NfbYN-0sdF-Or5l5uMcAW7994R1cUHHNiAnnY3LRy4zH4DXqURm1FRyPTMc7GV3lx0RSV3BRyV3hdN07SX8tz-Vn9KRZrYT3qqtkHBR3GEb-O8FLasEQ4djG8tfcIP0c6xTKz7fqDFYEMPjyKDEX2mQ5V38BGbMv9fRaMqyL9GexQGVPSmt9xyr-qj-LKssh4mPHG-0c-d5G-Ep9r17f8HOD-4BvV4jMIx16vRvEkPyus6s-Bvk0q9dkFY-RqX8grv1ZmqIhLlV2Ja9-PVg4iLxNfSZwrxGzXuBpNiEJ4gSc9z0fpptLUm5FPfHl5f18dBOP4ppoV-pjf3anOsEDwhVV21_GU1znvcOGPt29eHltBLa79rcyGhlLRkF9RrEQZBi4gVxwFV43cKZoKSdGgN6x90wVTJb2cAEt3jsH5GdzSPjO2Vissrdf6bnbjbSO3XaFsrcOjwGOY570mPxjXOWou1dsSuVotI5fm0Tyck-8LYBVV1-wgz3m7TWohhBfZLz4B1dbAadLq6Fi2NAibowWj0kK9DE3xBktguc5gglzEleW0MiZEFTIuB1seYdZb8yCp9CfC7-PHCtb2P6EpqsGYGz103PD9Uaj_EETVTkUN7EphbsgXX78RY0cBPSLmoFobq_SZmPsDMb6_R1wScmZso1e40wt-FROPpjV7Fm3oyqkJF0YHM5KHoeSTdruIRSFzWTn6veoLsirrmmBRwaZ1KFLlBNxatxcJR9D5BnixDys1TEe8wejx2fJbQpWpcQWbXgpAeXIs2q0e2BVltSRU6KBykWOAKmkw2Zf33Oxotyux0UhAfNJkDQPxuhaLNBdV_Rfhz0F6yqFdC2g0NMPNY4js5JyJDoWWCAGQVNer4VJ7MVGjRzL0AK18cRuKKXWH-uS3u6J6YfxRFEHpbsRUwGIs78JpcNc4liMr3c1gC45eDrLg7khVwR0pXcORbBXBNE8B6TE7Ons9KvZGzUjIIePFwxagYa2CubK77Fj3Ru128PBQpdTj-r769GZzsxedTaiLH35Y74P2rHWANsTrM2XtJzcU3Vekv8Rz4JLo00a2IM0cGPAu2opJzh8_JINs1SZ35QRd9tpvII0SRt4ok2TLgkOLrfPRSCRzytIP4cp-xlVeNNOOyS3nLY0H4Ae6oOs7Lya6oDlWBPR7WRtnvnko4EY2oscmmguzLNvItFeAKFUXkFQ_Czq_yzRrBKsFSBlSKtIlksu88ZUeX1_mt5R8QNoC5nRJNpGjM-AqQuuttcPfwD-Cj3mSCU96W_uNUL5Ej6_1JPKqYgbGwWmcltqzhDt13RXOpGy3i1NMwB6xtjvpvwSAtkHhUcpEFZSKQelmdbp5dSESegfMmXB_z-6aCyqeVZJKj4ouNWt_862aT4RuPUk4AtcdvdKMgNk-qUcJQDbYvL9PgmTicFgNXHlP1kD0npwmOp0wm3gJQpcm_CP7FpmaGZkKX-S66k44GKEpUN8ogQQ2NWUTGB1Bj82xbbWqAQ1qK_gKH6RqqR_BqkkOe5Eeh3rib3BWgw8VZY7CyqBZaErIQjWEKGU8CMrCleiqm4RJE6MCeEy9PkEeWE4J_joprLfElwW8x_uyZBEukmYmKfzQ1XOR-OwjjwQdvCdLn2vf5MKXe4cKrZS-a-slThRVhh3uj8A2vdZlo0Pfl1sgnxmZemnj4xZ3WEO6xfCA8i5wE32C_8jHD3vkbVTDTGLg9SQfK_t0ZCVKAJ0KaB_vRLLFN0FkHPLsxS8vjs8lojZP37x46vkrqhnwFclAB2wheVfJZKIzJtSmOVjb53NgE0o44Xk0-kNk8VgyhzAZTkbEk69pRE94DoCG5VKnYdGzKpjDoc5RSAc7yxqvmSjiyK0ZbxocHOiZTMXdv96XOyLYifz35c77neh9ufMAOLYHfc__-hSi6ekexUiuaB56ptymJ4fpH6OQvK-MEssoExyMD_VDDxN-YpXIkvjvTZF4P9x4dUjGNuZu3G63rHNj6hkQEGOP7S_A8rx-j_8hRbXXPcB_T-ym_efJ3WGv_2S0-4HRBHpH9f2_IFWJrSNHgOoNmTNcto8SNtf4TfuUnNXuPzw60rsH_kpNTagzeF7o9lbOLkGZJcvREsSCGqnW2ah226SkvxagJE023P14SUBrV6COSdrtIbxUYFGSmWU8BB_mCqWlzBn2QxCfoWlCKb256opZV8xU-pEMmYnqirIrSsUTA7mIKsVnlIL-qAxRGRDaO9MpDaZJmv6KxRPel3pL5cOHo04HiQdow2ymbIOiYJBV6bCQY7XS7kfjsOejIJ89E6pLztIEOCkzdOokf5AQldUJWhW5KmicAItnxgJwUPAJpg3wQUfNZRq4Ed1RE1mt7a5Wd_PbJaYGQAF6wGMQ11-FtEtT7wPIN_4FgJv0jOE3qtmR2J4j0k2LGwNLCjleK-l6qZdt9z2k-VBhTrW75t-ir8-36Os0Cx1CzqQcrik4mXJEyV9LFPh68iJRvhaWFFKmapV0mcAbrmK9qAwrZ0aMQcWBqECH9gjUrtGw1ZfVCEvaItVzCL69IM3z69mN2CBErUkBiTLSHFRnhhr-4tXVvmGAmds3P8IKjA5Mv9HqyzWOyeE_vITlCHGBYasHyjCYNos4i9O7KhmXF8ZPER5Im1UWw0Xg2vfkjS5Kav1CT-b29GQ8cRtPZKnHs6J5Zv8RSxSxsA-xsL4d1lvCBd3mj3n-IdXfHRuezVPUBJ7veWvAw5s8TW1JAphW5wGSMH6J7zTqKxVbhJON80ANhP3R4vyCYdLtg9ClVdShoVj1B0m3SxULcMQIYgUkOKk_gL_TfY9tJIbM2mAdFpgpQLDURD5VXRjB-1DEGUwAOmpvNCygfsT3VA1yscYw2T-Mo37YqwdSDCgpxoHj11u3aRxVLPRgl_-UVBRqJJCjeRCiDgACClVfKozvehdxBuC2VmmV1_DyWjHd0CV54bUpKegD0WuYFbEqcAHcuHHh1SHAdBgx5ZnWPSconRDpEH-pJkU9FNwxceAacWhf7y_Jwcf1Dhp75fpzVC_hJD2BZBPM0hIHPLp4q3hEmnRJoTvCebaKA1FS8pJljTRFaf2l3yyW5EJpy5EsXtfVykzQholAAiQKQz567Hr0lMKcz6ffaUuV2dpCuAyUqC_T31TxWhgHlkx7tGUBzWjpU8sKewea96jZUHSg4YAabFwSLY-oxSVUo-khmnQhPWIpQMs-HUSuX5k-oQ3LI4GWH6iFDVlfpo9pE0FHwNc0b9G5SYHVyrMip_EOZFLxI5oZ5w--SoHgBXCpBh_LgOnFFw1ugg3eAhL-FL0X6QtyMfnCH_zrf_rHU9CM7gAA",
        br: "G4vuIwPBxgEArG_pFFHVyw5ArQt4MmrudYfimRPjcQ7lkFVDKRYlEVq9IyoqiyK-1ah1vI2Ffn17aBLURMkNoPVq9bz-arnI1sdH6CXYcITGPsmFp_9fK79-9SWHc2ssmOWz7BrSs29ZDMfQ8nRIGDTwTLdp8as31f-vX2OyDa4jeUDSirOAefJ2V28lZ9NIiUfgIdVSq8E6aMBiUHp-bzUzp2OkIeUvi0XVs-PokWW_zuwNNh1Txv3SI_wKQZau58PtEHj6NDM3CoVZCepPfA61Dqunpt9z5iC6uO0bPnVy6ZMo___ftr6v3_ItO-tsswlDKVqB7XUeUKTS99lBg-AAGMCpiZkzQ9i9d9NNZ_vY08jyGSFB0wMoSsBMU9_0l1VtjjyrH-dGeuKFw6YMcLt1wP-_mfaZVjcIgN9zZtdHVi5UJmUEKOuyAHXvfe8O3ivzUa-6-qANsNsNo98AyM9ugFi6-a-qmnOqm1ydBkhJTWD2HJDrMJQDZ2Q4fz3o9g9lrDm5Ip0zRt5HihWkCiIlmYJQOmUYFcDt3t9SOt8P7evNb3U3saIggjAte7c_TPteZpq0k_T4G3MZMKcQkky6XVDn-tHof-Ag6TQqhYUDJ27Yccs9r7njHQ-84mfe8kw_6is91Xu-1Xf6m0eQgtbHGy4CyvxHwPvD_nqGPhB7AAw1IFD4H48g6Tpi5PohPaC25dzKrOu8jTbrunmGk5jglqXj0M9Tlx74BFhJPiFWEsYN-cUu4fLVSlPq29GA_pLhDKjm8kT9klvC9krujzDly7pe4qp2cH8cS0EvK6a27Xc4eh2fI4IpRyN93p5vOT4-dtGWZnJPXcuoHu6Nb6XWP28Df83mrrDa6v_W7ivoNA6XAhveXHsxGjpBaE1XorP5Yu1OLI6Pg4aj-dMTBPzf-3eoSvSm56eFlDVYXcOEw7s3IYZ84w2fJj7UYszixADGg8rhM8EqggVRerctea4HVK2u8r8O4gKMz0cr3G_bQ605W5srkTQCN6-hXaq4M8_ywZYFGyKOncKPQ-MUQCTj0XnEC_8F0Jr-C6IN6J1X_Aoyg-4pf3dekdl5mL9jVBXRAQEP-kP5TdJwJM4iakgstRR22D5OIBWh3Q4MEPsWdxO8Pc2tdxpRNOxDTWI8qQIKT148KgxYE-IMBkog5lGz317_tydFBALwghRSGbMPGqitAhhN1TXlNbcaveU_Vnaee1TDD36bKFtvLu_Wt7jav_-_YrEXmVdMdKcHSth8PIhhIet4dYyGFWLgF5n2wkKmcajTflCkQ-by5jRVqXrpbo7DNKASENnRxx8uumgORo3PFaP8grhXFnJ7zooq59a4KWwgoSeRkuxqBtvznq5G-y7WfchWXv5eICaOFE1JX_GhZASEZrSYm7_8R7PkcB2mLJ2x3Z8FxEepPYsT4rH9EN_OFQ8BpQUnC3pdGcnEbVVcsmhdMYaImHf6SfcjaW77hfUTpOV-ZmPlkT4B0MybH-9CI5PtuuIbqGxKaiq6_GSEUe4HfrZKA5I3gCExvrZf3h4fH8NHhhefKMau8fzEmIY2eGG0PIktKa7D13ZZ-vB-6f1W0SoTnjpyDdCXzktwiO_gaZ7kmvI_GmK3_5Do0idnM7soEV386odgKfsFc3OSYFAd1sbp5asOyCnEWce-6zdlrziPOncGD57bY3f1l3i0LU_wxsbjm7KBJVBhr9iPrmlEBuRSyXPJjQlwUeJ-lsK3WpLi9LMCkgRRzsFtJ7bB0f1Z9g8K3AMMt0HD9CSHBZVWTtVGnA5rtZhLtQAnPQbixgF1jE3CaFPrGz0U9qCx5zzPB961gHADYCzCuQYqBZX8nOvD14hGRa5vpdnqszmqi5PwTzIsdgSIdyd7Ent2glcRF7CM0np5T3tJzRvvAIHXYJCCupMRubQgQQ1OGj0Iu0fZ2HfZ41vsV9-T6XFa-BM2o4cxsBIOg9g1M4M4lUeH6i4FetPVbEkXEFESvRUtb0810MXPVmLs0RxDiEhpmLNArBpfhXAEMR9GlY1IzM8OtKNtp6avI6GvF1IAKQWKczF88_2e6LOEkQdURBRc2S6ie2nG2r-NgrHS6xRQL1RZjIoqSkhaRTOhXCanrzySEqMjjMUsl2ZXXZ4mPFf6hdLMhPHhSkiIq8EJo21U3jjeAyB-aKu6XwQ0xU5sSw1t-HyzUsDgV8REb5vEJkicxS9ybwB1lOWV6uQCIogfSm7dwdy6IyZS7XYaq4RohyeN5e4j-BCSuh6mfwdDtNsA0Aj60TZWEkxPoihfUtIVLm-myU2aixpPyO_japxosgSTZc1ciSNaS29aX0anS1LDOn5zERIPiflrXCdaoVJiqXi9xpYUyOn4m1CCWKxe74KfFj2OOJ_EURNl4lrJrtmuBpNWrvnphyu2UAflT-1geBfi1mMpAcRMFg6jDsxbtrpdSpLoxZ7IbH64QeVLmgklQmXnAA8U4qQBhI3_b1BYlJ4QD5IE8XtzJaiCOlFEC1-wKDuMPlZekPEsmr2hhTgGWYK76LSc1GHCILXwd5tZunKs6DetxF7yX_T9z8owXfz7ZiES8fOnv6figYKXnt0mvkwbZDZuhmRVYvcQcYc0i8UGkPsdSGIJT_JAWmTx-IUzEZ_Kx5gqR5zi34n9weIYNk8q0PeXVIKOO9d3dhx3ir9aUA7ZyXaUXOQtnGPWHkX2BOiL1lQR1NpXv5c0uJT-YBFDXJB2U1HpUfmCY08Cz8ghXfWaw6qDaG7RIiBRxLAn9RaA5PnlWiRNpJskAzSaBkEK-T2R7YDWZR5IJwOdysqUNOEET2Gcxq6LJsFVVfQTGBpbon7YY6aWgqqv_3LT4AETgqw9gUvQhlIotu19BHdjmzaURl_RAEpUaTShvjaKor7k-KOq1eGN3AnhDrBPR-96Nc7XniFxsbpc2ofqJmopXc-46F_UH-9Xs5KAnN5AE8M0yhF1geV8akSxrL0LtS9T8TvOgNbsajG2kLwZEKJwY5p4UGIlg9UITC0IzQacHcWj733lntEWe2OxximcOrKIIWQo5TFK8kt36U2qRqDaK4gkpcUANTZ0E3xsltSZm4wR0v59SVPdEIPnymQRMlkGYmXwEM_SLfYVaU09SBeG7OXptTSELAdI7Jd8ddG5jSXH60MWtWoa-oeJVXxlj1aEBfSjw13yrh00hPFO2TXW1XiR5YyOgJNpCx9CjwzcDYl4cU-dlWQREhJSPO4S_LtXGgqZkWywayukcMIhM7Io1eC83HCigMz1mxA31Ku6H9YRzdnoXgCuUmojezKopKiXjqfHKWKJXnkHBL50to1oyFK5pajeJXvKY1NWtw05UrmpEhRmh045KpA7j6Q-mpBktBiE9YcR2FY0QVXX5RbV3L5Ox_Ikf2_DYs2oidm4GqM5YE82aCg5HDDXN3QgqfV2V8yke_i5WAWSoqoiaRVsdBiW6G1vo0BRLacscwtZVzZfSkehJFJR_2tOX3nDEbuRpNAnBvztxOw0oERWlNugHacNHCnMRaZ73PGiubIPYk5Xh6PwzLxulbk0sPdsoXBWZ7eTlK6zoSsE8lH-F0V3ltxysAcRB8iZ4MRySf7Se3PmKmlRHIYXSOqeAnS5Sy_kRzVMWrxMSoLP-krsYnGoY6tMp9QdxPNdelg4j28fzzryjgx9CuSqXl-0iZANriliMbQxAygIHshIgEOJisukkSNuRPA2rbXe1nvwXv4k7AcVLGoMSPZTXGjpRmzumDP4wD6CgNQSZaaZ95WoOECl1F6mbHVFVjgGW8IHaoaCFrK749XJqgbPrFAVNL3ec0zkDkrSBjlGCplcRF8aJzWDCKvGCVxLCHXWbyXbWQGMGbAtgPKyAzhq_nSK0jlrUgEF41TJF4HAWUroXOuEkgwUjd_iVwPuYh-BmYIQa0kwvO74KbEZh8ZA-T7sTWtwNIP9rbUgBEiapYAHUE84hWhJF1tSDZ4A4Dl1FXxcX6GIbxSmkAPphmUudJ9lgaeGMcqsCwlQqMYUleOfQxe6vKKZhaMSpvZrVBxDEPlCLwoVoxUq5V9OZBDexr49WGp5KdK2-eFqG_IYEjz-OT0_9hv4DTIhEsNtg6OrNBlYRF1vo2vqeFn7bqRcGt5QlUgJ8ujtm1ot69VjWVKrdTNhdPmiKEvlb01zwQ1hPiohTLSaUJaAoEowQoKVYiOdur0XWg5SHTFE6uF4p0sT8n6TAoUazneIVSmQ0T69m6RK1HlhQY2sBMCdMFX9GxcQjMaKD8d0a0OR4KRIqbeKqF74vTYxwY34JVBII9Qb0E7ndJ_Ww606q93LC8UDMT2rOs_NDQHtor2dVyzhFmCSdJVPi4foajaevEqIB40r_DFbvKwVrHCz6lCf2-7AX9Vr49IxpdK_23qjfxkw7aO7EGBFIClDZLTII4MPRpY_YrNNpx2wEvn4YhXDCpoNRnndS6P_lo0ZAis_Oatz-7KXHzZ9PAgIfxI7xM5q2UyzpDHhrpe9w1HqOSGjB6v9ce6b5d2Ke0ni1k1GqcORUJiy_fReOUyCu7c6UssdsebnllVM4GHbMLs7rEKUG2_U3DfGUasnXSPvrEozZ4z_Nm8IBVlsZNVdpTh1SA3gCNKC1hhEBGw5HB6ojqmAMOPtOU1yZ4XiBB4URuNDVP2XqHqWFhvzK7wWKcyDyx2-m1po-MvLA8F0er7Xr00nblvG46-6aFXi9X-KMLxYQ7EfpOikC2-lbWzd7rJkkg6wGOOZS_2_7usBJlBTUjQm9nXCRzwJIu7rWyQJJqok00s_GeyEEYz2p5uucSs5OR1_4NDJz6F8Cot5mJgcWfYBrwwJvfBIxGxk2L4XEh5OUiwJHMCJrkmcaHiuBLL9dD1BYeu3x-FtZchU77RRJUdTU_M_sFPzPpBA8j6QIvJOggB0kFtzUOG930-IEl4dokzD5mJex8YCRJFyqk-FA-eHsOaKDiI_htj4XIjbfswrYQ4KisypooR53vLL8AN84vw-0iPBu9tB6JzxmKIw0w29UbJ2lSjM_ftx0xb4P2Zu_eRZa22KAMPJ3KTZppn3IKJzxl1r3oxs5yx1fLdXzPQ0BIjf2qffe78n9Pj-n_PLEcXzNsgvh9afs2vgtGU8FHmuPOLKeCBU6H1ngwKFwXc-L-Q2pgMu13ZToHSwxJfTJCXn-xcoVpuFxZdI3UXJl7gpUu9ZxaWGDfEcl0BRF3KA-0JbqQJ1gFHFBCQa1oTqsLGlFsbF3lMb5GS0HQ1P6w_RuFYFSFlkVH25cuiGTWCYPvJT6OGJGHWEWoSk3b3AAkA6hGlxhNA6iUeMAzxmuTG8njQBFVyO4WsvV-NO2nrrzbybwYfALi-DYH40flR5qlUuBYQS7n94c1B0b_5_-1jPmFrMsug6NHq_zKj7xi98GyOcNhEYTFCRODmgobnwKGgUArnpg9yzI5Ml-z8HOto9ACDbNqYzg3w3ffyO2BNS4LLUqxCaEsjwDtnIrUWiRrbB0XuvcJ1TdczDcVDBidMXMgv8CDbiYUlvLsOTjCGeopsAEoCC9lyZ5ELjRupztf-G2oY26qOlDHDbrqEd5DUSsKKeZw1OJkbd4xabGlB1ULa2CfwC623D26QOEE-I5NUa3lGdcvPQUeKuwzCmujeXxjagU6C6ZhM35x3vfNK1vZH2OsF6re6yaW-7z-3eSRxQjy4VtAMGrkX68XNi3aKTcFRGlniBOPZCBvqqCO0MrBiMz0HVq2ebINh5re8pd4bgEQh2SMbavSr65ZN6HyWO0EBT9KRuzMQFe3TvEV6AghMnReXZAaM4IB9G3Ykz8p4wUkADIgay5uKQ6cEhxG5VvRf6ZeRDm4fgurPJL-iadnuix7b1DhTHlQHP4tL-cvTiYDA-_lMgwKsGlrF9KXODBV422E6LjQ6iTB-kyNX5YfRsW0BrOEk-46wfcBlnTwOOq-5fmGGlq6g6K-Wm8yQ5MS-a9Cv8Zoi5AQvB2UKvYkSrsoFLiODC9Yx9lsJgOPO5iQQYAHzZYDNV4ipKQTxeMy9C1L5UFJQQP4yt6wKiIKD0v7dvzoC2OZ3HFSoR5vRht7IjQ2jYQC5Us4mexFvHg91xCZ0vdNxTx2BY7q9_MkzCKzraPYvAyeyZ4ZAH5PqpG57CxCUSR4zwG2dhq_Gn2o90U9lG5u5359jB5vhzWbjwUUKkQ3NhXfaVJQMa97Mh2hXv0kPNGpmxG25zNbC0DCd7QpNkubGDmsUOuzC6K8HiLyuMKSNtcGb0wPUq3FXXJgYBC3FR4UGTzfB3xDkNlU6J9SmLfJF9OAwxlsVIAH-aH0W6EQRJll1Jq-edtYr1a3QXmHL6AZd9pIJjGMKL1LKOAisIPPkUSwlHcp6DvEYiAqIQqAzLbypYGrddZSu8csO8SC1_xJ15C3X1_e7DRleVrDtjcDDRyIPwGISVRjB4gMf58tdPh4fbWeEA7CU1vsxdl50S4vOyJ1LUuTb-CC5UKTjMfZ2F1ohsT1jRBUAHK2uQEgRmIMDIQT38wUkbfEXrHFZBNNqt2owsEpL4VNxxoU6RuqLFvvPkGj8v__qZ8sXf4Xy22ULUAxcLOxuGRuzin8v_C7dUF69z1n0KjO_CCCy1P_N6M7fw4-ZATvsfu9wszy6iWYVkrR_ixS4TljzXXXmy2pyyL6zAuIan2hc43lueLPY2QyEnBaMbP6lJ3vyvABmD_5iSf2TnmPfmzpW4KgF99j7CR8r7F58I72Z8VHiP5Yni3ty7QzxyPxoCq4Ob_ueHU3lf5c3EM2BI_8WX7GK22ZDwKheq1vHKCFE2zzfBxBhGAC2WEqn-sKX3y7Dwy3NEgfRYIoq84XYEGMhbNL_AI5tgn1zYK18KSbaFih8nT6w-zrbz_Cf4efnn_HK1Xtl16PX7LoHUI0nj6y1JPyZIT2VUJKMXoGpF9JDA_tDucqjTXv1zuPX84-zifOmAXLfB7BloNQU918ir1u3F5u1iGnxgOC7lXlQ2PhJ35xSLDzg2fZzbL5uvD3AQjYI9r5Hb0LMRlQxAkM4vbRoT-CGu0bqqskfAuNxyhZNimKdnG0Jr8Ahv1Yjg5tyCJqiJE6BS25c4bX8CCe0PpQ6uc8XBlC8tRjJ9VpU8DXV3r7RxlwMCHWVl4_Qomkok_44Jeewyyl09Z3_7rifr9fwyrlBfLzaPh2Nz2TOs1xPyQe77Yv1f9GRPHvjU9slSXASOQA2wAsGmWhgMg3Qt7_9RQ4b9LCC4r7zz8UF2HIQpeVv51x3idebKrIPaPw12EFjQfLVbD0AbBwjdNuK_PDFoxCGgE_WsgGvcYr7Yx9xXCKZd6-myO7lSfnnDYmGNJ0hLnueLX36xwHFcBWhWxp9cG5kpUWS3GkFc4OUQsZ1P-Pnb6u_59anD55_A9cuRizDyWGr-PiB02mh7HQcFTGG2gI_xpc_WuR3DCv-eo2s4DuiMJhy9EOaqzXq7DTD_iUuL4EIyjuwRj_4jCemm1Hc-mzoDz1uqygp37CUl5aGxfpYkYXfdlS_fnYHhTPToN8q-XgvKXMNbjDI4zL16jN-GuZL1nD1UC6fDhEi1S3ul3s-NybL3ysSJpC1PehfhGkzMdWoCL3lJEv1SMX-7smeigPTlVGrW2oRHOJfR-SaM2lcZs47J63AakaLclJqkgpyhBpiKIf_VwwlzWnARKk4a0UeJgIxLM6NxtSo1uiEGSft7qxRQPoWo-TO2lJSseYw3UuncxgeuNxFN7UueIoPKYvBGEP-7n4244I1JBbp7L2-lRfHJjcmOL_hysMppQb6jrJhhvm4GrXdAGZhYzgZCJay1ACk9XsAzHIQSI9sYzhf8QUm2rZNTvBCzL3T5oa2kKx6UkyTZrVwD6LtfvJVs9_L__CBK1uMz0w_7j4lAhCqlfO7JILlmsD2z7WtEKmW4czuL5-yN3CMnDhVs3uqBWUrQp0Mt_m6LvaZ_WCV3j-koqEpE775HquRKLvpGkQAFf8xAsEE5gW1h5mEVeqSpsmEmSquSQXtG8YKvwlajT5KEAWD_888uVqFPSRD_NW-avNA9g2pa5EtPZKjT48hpf1oXEGZ1XG1lNtnwk6c-qZLoDi1f6OU5Uknp6jXXgRVf6fAfq1NB4chkEkfiWcHF_X4H3sjMrAxtsnCt6XJIhZIVkW0bWKQpdz6wfVSRNn45NqqGI-37NdqDDgoozX2FMG45i6hzzmonvvBeycJ7scR6-E6bi8EXrc3dPrUpXdAm_RGiUmByENukSaJUYGmKm_Tt9AomgG8Cpg_YAAi7JPCAEp_0gL3mn2Xjar4duMk6Odn3n4hJn3rkBT2cg5TGeDJ7tDMoy2grKgUXEsW396NsHBFU36khDgNhy89vG4I-zF7xC_-onzbNm4vpXn_TWvy5u1A09X3EubtI33rLqAJjTWzjo_SCzEA-JXMTK1ZLRSLSNgJBWp6B8YUPGuZ2eIXEGTVf6J9QoYeQSMNtl-7iD10qN_0M-ZovtXNWkwd7wdp-vNJXYu13_WzvDDOMr6xKJboD-wzgf-Fmqco_9CUZbzheOuRFeoln_Rt_6mNblYzReBrsvCRSEXeEzxp_qonbGM_OMMDpMM4SW76DA-K97xCsVmbPQu5tuXz0z5reXJynRJetux97-xfR5FDOl6bJ1wUAliMFA4YXm0ls1HBBaVDVxWaZBN2OYN6h2durWl47RU0d3-Ml7nGNf14UxN0XSwlI5EGYLLWNDzT3dMePdAfmrA9SN7RQE1yIDvQ_RlShzUnHTpB-DfGWgP1O8C3tNja8s3_Yr_TGZj0pKtAFlTk-nf5w_bWHKeBiw5smRU9HXlbSUMyjRR_4jINRT8dnmhQWfxD7FNCBGfV0ouo93tyunOWdm0d-zE57ptdoW4OH6qPZGdBxrxZBil1VYLPLbXAALAi3aH8rrga0T6nXKCXudG6sf38xGYvHaHqP8jJHxFz9jdcSpeLXSb1J_gpNmuqgju3jxjEGNk9h7aCwYZfai9lUC8tPb2T_MWd7LhWDXccshThI4eMXREDVJwdnHFdsD71Z-XUmv5LYiCDQWf_m7Ri_aR9zz8aPjCbTe5LnSFJYHPp-nBMmch-PmW-XKz29y5EmcHTgrsJ-mG5QWqB1LGYXivCKX3xhBmLC5uLUlMAEEZsBF2fU0MtdCHEMyxR8QFg-3afysVsYEqPDXa_aI7_5wjNjguwpnaklVPAMeM9swkZJ6XYijO4mM1Bx2JTDSDGuGBZMLBA4W_NDk1H45XX5B1HZ71rHU0WVHueKPnG4Rc6UfRVt1NU_kvtDb1o3_6Eh90uzH3xICPRjtAMtB9GPtjz6457_MhbX-Ko9zfc-7H_iscij_fObDafJYj8A3rk6-8PWzIff_15BgP7QA90WECpsJgc8mUmMPN0tcBxE0UpoAwBWtfT15oRASjLW4EVvBik6wH1E9_6093ZSwU9dqMbZOOg0LlTurGp97xVdEmmBoPquAWS-doz___upP8SfXftoqUsYWq7pFUB_8bjU7i50iSjgc07S6zcnm4fTe1ewSTguNJ1vRi8er-Vv4KIe2XdjzlrTr6--cP_nAU4BE4aZNx4HDALAPufn2A8jA7V8cbQ1F-3NJgHwn7pB0P9UVLOnO4vm6iOGzS9_AOzOh2Sg9R8YyBjl74jr43K7pkf1MSAu_LCb2Pus6-vEOIuPDkaG3qsuLOgPOBVFbF0H6IU-bqIudep6f0BKKfKjdhtsyb7ZG1d0qXELupPgQ3OjxLSNbaaJDumb5bTe35b3fYbeEcrHQ2EaILgfe64ClP5kU1Q2_CnUyHr5bXRx7mdXmKKO2ql_Oy_oXvxofTzZQ--2EgQajawU1sraZXtdwvvV3tK2_apqPPrdNgJDmSg-RS-bNxg3M_4ZzAIG6JbW6VKoCW_pxxj57dvsZFfpjMtct4gq_dqbV506179s7erirEWpiv34LbqGa-qHvuL1Hd_1enjqKVV1nLY0-Qzxu1z2PAL9yz_oZy0Laad1_7ponzO88xM2JaqQLZsmCtAv874Um5GrmWQhjGVbDXQ0NbULcdJ3q7iQWwxpnCYQuWglhp6TNdzQgIluE_ZCY68U30TbSxCJC2VgcqrX_dnOSFJp4OpZP2wCMsyjSvv1-hErdAmZpSBuIhUyudOwSPs09fOysPLfP0UgB1X5LSZQg_efa27-z3_UICAS1oJ4kBGrzZPdfqDw808MDHtzdMXgo2CMVvptiKMF6e7cGXZyfO506csP9HFwoF13_alhYVa88GP6Wf-vQ4N4Lmh2B4CYvs3W3_v5xcisGYYqsVYwEmtZEZE_YDOY4pUiz3dxIHJTYTrUTSETkcNv4TlSixfKkKMKz41nV5SZilMrO_tEQod-b61wNhl39bP5syZkon23HfeJjNijlw4zD-AsPFQ_LZzSXkO2k2A8WNyrq5AM-nWzmGYRYEsi5uBqoPn0S1WdaExprqSdAM56ZqD8vr3N9zGeIVh3wm8KeFAr_Q4dreDCCzS603gyvxwcXcy2Zc_nkn5VuCjcNtte_hM_r1jpU5vvxze2j-55eG4O9IBLNsp1d8U98VW69Vd-cXWWNhE6hCsQ3rvm2V6b0dwZo5LRPslx_JFpwSH4CQFTQfF1zVmhFONLdnsP9rT1u4zxfnvpNz3otKaAi7756_srd0X6DoAfMiXW9Z32YcPhrrWGfE4bbb-TZOwP-il2idqt_B1k4uFQd2cN1F7cRfdXUFz00cGcA46akDpuxiI5RrrToyhesIiOVDTTTgSwhRAOHDZ1_vQKXQgRfB3nCaHZZA_lFMy0SUH9Nv8fvHtbNRuA7Cm4QR6Y1KGjYy-ClHNMtVJlRIPDLL2grjjyWX8gCajbNitO6ASiUJ_2E3O_bTtvAfrxhGS8bdD52Yyo5Grul2Hj8WET-r4TJcnrRdCgGsxZ3XEKYGnzzNav9IoHEnZ_ftcrFc84xIfkymcUIdNK-pjQwcm6Me_V81SZerYoJOpUcYyfVdW51U1Ax7xri_iIVxr--6kKO1VMt5xM6IH95dYeSlYwPlnPFnuGZQg6FBT6wSytPX435_R7PqttQeTLJw5lTWbVBzei1EQp32gHk9n1YFL1KG31OCKjpd3kXxooDRHre7qwH0paNBQdpjTQhq7XlOcHcx4Fx-PT-nMWhkeg4b7wpTEwIK4v80JfXg0rfAZz9ujoA-a-355vEkxjrXqneHMWF29x9CL6MSRyQSUV6IA2ch-1EGm8g_7XIyi4LPRO8A5gkIawAIThuge0f-4StP3vytF6cQNDt8JbvJN0xcWbDT8u-yrxBRRNOLpJPfzhcgv0jt5wvcbpv8tuCiNyQ7T9SfjcCvyWnimh9_AgRFgjwCREkRBWymxR32UPUiXu6sOSO_eJyllkcpY1T5QUMTn5bH-kog9s3WgB4VZ-AoqJsVsdqp0Gq_4SFf_FeJa1Elbu1Z7i7dm4Dkw4299gjUgUNxaVbXHXta5f1u3aoEHDveJ3irfpEWQMEWUlg2YrUbKIxhihOKs3KKjqrXpWJIvWso9W1_5phZq2XeCQbywsbmp0MwlcN6JaxRzoISHx5piJxMytN2yxlvoWjDNNFuwp7fafMZwOqd33r-MhyoLbjeUybjWAmDHsxiJUu_DlewGrWrTarKXWCELCPeB9Dd7AYAVz68zkQIEZQOy0BQHTobei6kBI4yvPCr8njpo9kl8EGF-by9Suqv1xxNI_DP77R9s7u3v7B4dHxyenZ-cXl1fXrZvb9l3nb3q1aeJ29739-5_uR78__DuM6fjf9c3pf1pSEah5ZPXVjZ_ImTI7t-rXvoIdk97vExNNEaIzs0h6OiZxdtuq9pIm0x-mziWJh3HT_KmJtek_e6tQ0Z7-uFauYxMuzomheF2v1q0a2xZebHU7g8aK1Zyuv1060aEesDWpXWG2UmWDlghF4oQEfzscApHKmBbDd109hWYsTQ2RlrS9-YvYdA3h_38Lyw1afrYSbdDw6XhK75S6N7VRDxIL40Zev_bfO9DDGHzzp8UC1b-E9fXluaoZEK5fFhsfCv0FV-VaEVe9vOxzsj4sAqn_Z6JlGpfY54VEiAZCzrOJzAzp860nts_p7bnbq_Xz63IZAIWfZ8PdLhIoiJxvbVD7nN7iOYDEa8qnp4oYAk8FSQ-0P3u9nJnehP_zgaJPZ1-0XIAajzQ8uES2eec8TRtqfGXNnzE_FJw32STL--VHY3ulwsqgyEjt2ZpHymQNseUpyVgfGJCbpCEIxtIUAzm0JZlTwNo5SUG66qX_ZRmAvewLySSDTmXdCzUytlsyU8pX26BIUTr4j8ngzRdBWChCqAZpsu0jQ1I8BO9cwk7e7WHWTR1fT1MwkRYMxtSu_WrH0ugJM00t_bhYCx-1bbCmQYSrqFMpiMSC9hfh8p2-b9oMCbqtIxahTPY8vntaaSaOSUe6M51m2yCn-v3B06DZUxxbuKMBkY4m_n0u3H-fLS_YJjzxEaMs03e52JZz4uu74yvrr-trttefIuMdFMRXoQ2yOzev0NaRaMcmwtTs6Z5qOP2VjVhaaZj7rEo7uSdhB3iXeZmErO-WGSkpeykOcu0MJ6hp8BfnP-Dfg9Jb7Ur6m3TTnngNg30AuTGAeDI0029vQd7fM9N__zG-jbzgnAv399YtcWwKJHMTjkelS06IMG3KUmLJcrqz3J4RgH8jjORfXt12aQIOtmAlJ8tM2vH89xrSpRiDeF-LnVCEghzx3bkMR2rqm9b0hhEIfLBBHmu1Ywb-T2Ju0qlDVKn4lw4_ZQl0vF8RzMgAEsM8TJ2SjFpTF2zCqG8WCrW_J1qIez1NL9QClBl-7F5_rS9uGPngp472Yx_Qofk0FEzf7-Jx7NbTyzQ6SQH_4vQjCjEjpPT5WQF_BGBVLAqt246-9Mbd_Ngue55qehxvxPmPd8A8eY6lt6_XE43mqImBS1MSy5_FEDtK8GNAsWAraMSAiX3u_oPHJWLD0HHAy08N06ZiTmgdXFyN8Ywy-Nw-Xuhi1DyrlObx1cAOkSsNC-U5xozDuwRAvoOuj6Wo9TTpMRbQq1_apfw-WhN8eYuYrCu_INdsy9n56AonVHQKPkHLZZymPDvRsT4k-MGStAVRRDEC12jhiuzBQKMG2iWhK5DrTnZDsSH7DKvL_Lo8pJPUt05FXwdsLb5o9eEkqI8KzdKESiJt2fhOWLJIm89qUrIrWsquE_7eootfT7adYlH1OqZre3pZfXrzp0WOV5YWfP3t_p-wOFluumeD3aEjZ3zCHV_lxliEDI9pmwecDNFrZ_e7zE2z978-vo2zRzORQ9mz3EmSCNdmXU3HLP4nKMnC5Z3Ei1Ncxim6TBSpj5d3diCOPhj-b5-x3r1Uw8v4lW_tV-E3-rpgSd3v4zN1G3enOF0KQqZnnGlXEWHWMQ2jiQ6bbeOJvYW61Jib5vICSA_zwdyRphWfxKA9o78rdkl90w_bm8PeDBRVCUPIr5Ge6dyc_m8cSdMQIJe2xCG33nyMPvbFr21-47cmGMwkZF5q3JZUj43HPALtffnhbbmDaccGaml9moKPahVtRmekW5VqffJR-JWYzeRfJMFjKomIb3mTDW_SOm75oDxArIvv400JmWrv5WYbPAb62w51vpQXDe3M-rhNdB9E_-dTqKrFx0R8ghLGfV5gkiHvc9ds7K3zASq4n3kMjl7LN-UN9TMdQEM4q-03ONt4PRGpR_SXnli6E3scBeZHSf09gOXfMY3J8nHqq51qJxAiJiOysWMpQr2T5X6DigG7bTfUtZiuQACH0VrkmHkru2Pt2dX3VKBhL_bMRvthXwodNbvn2IgCxE9vfZeUe-3dpB1E9jXIRUm43F-VcTCgKLgL7P3hVJiCfVfqKZZOxerHumuwa8G7e1W13IuwAPCSqJ6xu8RsV0ATe1Li6_OmtcHYx9Jk6gtmn_cuT581-0Lw51vKm88Gv7NxUkuAkrTKmh_5GN3AuXErvT1XL3DWhJPnW7zAHwOufiadF1CurR7xbFwZnrqTi9lrcjWjC52LBy-YL5OL2WVyNQNJz8csOvlshiWFnQ_xi_weEhf5PZgXdn9GTcuMnpJ9hC-Tq1lk8tkMfENnzUzlywyb7mb4dDdb-HGdkcXNsdpfSndyMXuLyy8H9iZ79GdW4csMzBhm6IxBZDVsI8rLFkuNB_UlwcEIF8K-FT5Nnjg2Yon0nuIgYC5CMBQ2OJS2NOxOloHRw3E58eKxARP4rqvBMM2_-aZ6kcNqGKq8pdBT9C4Ohk-OYtuoVDAeXbj_FOc1VTiPRqGmHxc4rc-ow1Q7Lh3SkWtFV_3q4GGh1RyQ4mwBnHrMY1so5VKRpeuYwgVfAh96m2EuGqeLgbLHqmtXamr3Hrd6Lff0nYZZ1BFdVWkdWihRMElU7RGSAFM7zGSy1o7Hj2gl13ZpenzYM83P1Y0qw1R7jCjg4UzCD0N15qDhko7ow4wW7toOhDdU2RpulFCiFRsL44NP4J2JWu2rllQ7qX-XvtBecmWV-7iDTYAGSwCGRgJc82qxf-oQuCIE1ghEJa7pCG4TCTbOtvQG1DcXsMbdD-jN1oAV-zcZNMQsrpKslN7-ejREWMrowemNFzr2ScAEytZif18w_m0R8vsFl59pfL3BwnueD4gY69wn6Ou9Fu2ZsYSxqUF_2tM0n0JjZuuzC4uERuh-STQXXHnfvc2s_gMLvN5EV-MHpI9hHq1ZFvQoAQu_9xsRE5FPeIYcovPjgNatspU9Tn7ZNByStEAwdMk7v0oxO-uvVV4guUODNkMIp4r7OaSuUCwhTsZAJ0vI23Z5DjLNiQ0JnQD_ZuF1ZBreA4_iqj3NlUpHQJJGnJRBWBZoo0rNF5ooLbxnbxclWd66grEbzety08Rwu2euT_ssmGlyX_CAzsYRkuqbtDYshy4aGrLy6ixPZ5zM-t32sJb59YRKhlwfv9VxsVjKzyY0b_rZYX5bFmtSWqY8VVRF3Vw5XRHgTnru0ESkhU1DUVX0BXMfA_ULmYpxgllJCze2vOg2XHr2DbeCNjnNUr9RVvqxuL-RiZD0-2XEjw4JrC-9v-7R2IjdwNILDcxnVxk_Ftv_3PZCtNTDz5ptgzZiv-DsKlD72HK6kFsaXsgudEVpM7NybJsEvTfmVIuvzmNK7fZklsOSDB5ZJQJCf1tU2QjS6BhHM8S55LrZQm41IOhCbs-ZEBD9nzTldj0ODqJmrwEVskBMEaG2WZWswkFUjBmTF4kxm8MCm2bJAc0CQQasFvkIc3M1I1nAniXFMWqafxoftHOelTolviBHsaXrkFhaHYbnlSyhEeFDjRY4_61HKfxUbjEE48gvGYL_HgomhgRKIEaFWhQwBl-KHyxY63P5CnKffdo51cRbPn8L7sMyA7EB0JEqOYH_YndASlLxjvGRGchz7gnqMVp0DNfsiRljrgymVICXJFpLLGEni3bcJwWeq7nGEjQBjvDPBmWVTGZTrUmT0lS16T024Q0b0VSIAhceNGQJlckYS1-1kTCmH01KJgTiby2Bj-FS8cohw6XuafCYy8wJYjl-USBw843SZS7GMagy59SMsg0MyxeBRQcyqxQcH84ln1-duYN2FbKZpP8hZUOFGCQWC8uaH44yKOoZrQaG40T5p16pOU707dgC0YZKVLRAiAa15DqwEY8GBT4bJBW2x_C-KqXWP6v1G6XmdwKCLjHlJyJjM5JIEc02KTj6lwjLL4ObpIg8SnUF0rRqTbJLiYLgrz8-b8-IOcTD_DAn08m6pmdR-v92fPLHOShfOilxo8ROiVsl7jWc7gfVu2Yk5fPu-jbM-6TD9lnpwhiGDJ1r7TJkNCjHdx68G8Xgc23SFnY64gxsRpyKEjQjf4gwHx2TTrELGe-Ou2xXG4Zbinbb0goukPqa3v4DTduNw9F72J7hHbdR2R2rax4OGOitLDuWzI6dWU7dl4E-KOv1bv7ltg3zFqEZAK229Qk5SdiNftSej_gCNy0kG2I9lOFvAn6vL_vOXNojvXDszp_tFjf_moFAbZxzbiAvI9zPCqKXvKMsGHlg6IIFwXY827OY4z598sphOwVKuKO4F6PszouXkaEyuRAAW8lWvQ-hjbByip7_ffey96JMfLX9HT1j-Vc9Hc5lTic_YTaN6XBGfCxItpq_gl-cLW_df0zlM968o5LtMaK0_J2lqdkeq5pJXN3sZGj-R1rJxRNpVDBWfFsTenjvn1opcfSAZBtg9LGvSgMKyqw8bChoNI9QFR9zVIXVEAAkVQKnKpu86ZSEUbNJHCRh7bqPoxUfs3UlUV5Cq2pQVbvVhQjolyZX80wBBV7ux3CjaB_U2od1u-jFL8tQvvs1eTmTJKmHs3VpzYGuG_KNhic-EEAmcx3cJE1Q2PoTCoarELSe3yQptLHzXTvA3I4PeeG6g_W04nd1sdQAddEmyB1bUJWxNYU3jbcUcTv8a3-BwAHwqsO1bSxMl1oWezKcf9y3ClwE4BP8iZ_zxSpw4M_1fNtZrF2m1psw46yQ3FPL3rxXQfoHELDgW-31L8PU7Hq8vnaaDJIy5emY7VPtpUr7QMG5dlr_U2W_Vr-utEN3ifmFtlklUmrtnFwo4igSb5ihNQd0wYkvHIaGBEEv2CBTPBdDVNla-PfrXuQSeVY4Id1oaSSPBo3SRzeU2Z7V7n3qEs725KmxxUpQ79FJf23PJSr3W1DZhVecKTybRKPfjbbevXJzvcQ6z1TVzsOz1rsABcEEJ53Tb37XSs67uHbPYc_Yjagpf-ZZg2xMHK7a1daOH4_eZsJflMO8EziVnWcw3OUx_h-Dbw-qRSv74gcIn-AEcZaZv-CZJL0-ouFKC1eDxlea3eDJSkZWDcZR6gM9G-x4ey1_a0cRvGvL9YWZ3Qv64LqfjMoR9hNsb8frxS3Gs7diFMOcZCgfRzdyQC1XH9eJFCXsyy8YjihUhpzEG56oT8wwncm9B27iSoXTMqLIKWxxFklHEc2r7OTwV3Y6j58Kw9ShDBWYAJO1r8aN1c7rHd9deeyJtu-45DS5Qk7Y-JPcL4f75tfUbP7Gx3JHrd0Zi_gd2sKZ8veI7ZOV_6gNXDYclkClgk49Ao9jOdb7G6Ndei_S_KBVfJZHs329zuohXcU6Gb-pS6v6DK8DOVE_pM3Z9quwykRGJJofMpZTm1526lMrvb_dr9XW8s3LLlfeBZjanxJi7GMGfQ6N1V6IPHug1-VaVvrI5ImgrTplkl17QC3o6vGJmsmbYBslU8eFp0_4ooYBzQlVq2b-0Bxgl0oYKdQgiQLSxN_o4Z8mTI8IdsFOtVpERaQMrwcARYcTjmq5T08rTHoqKhAF2goex_zykjJ_q9Mq4wvS3kfsGZ8issPBRZNNQ5zMDvTG4eXw6w3rmradnWLSQaBRmoKV9wPpLosgw5TXPUlTUDCVZaUhm3OVagBkabzoDPPt533aLAT2xoLh3iWdRajMA4lQi2cmLc2kmHQ3Q_3RItp4K2riaFgH8mFABPi2Q7x8t7A80dns3U7Ng5I0XMzsUWOi9SPMv42AMO_9lneGPV2Ddm7tSOyhih6xUEGBaRihTYMNa_Ult9PO38PZHCBRJNqRZdeALGhVANAwWumZu_QG2z8bMpg8Q0mYvaWYCYaztVIJ8vErQ6SRs6XmsTFLtx6rTgIaaCsJ6OqVeSLRkpkKJXuMi16gii_aq0GfA1ttCsv_rHxlu4jZZ6JX7E49pVc3zoxcTkUKG6rUuGYZs8ZiMai5aIYvvVswgmePVdeqh_-xR02FVldJNj1KhdLOM6_VEp10mlj1mvaCBfMAuO5BCIhw_1K-lImLB7Ci1I_Gho0njmIiXuF2GOXMEdEZkX1LlSN8pUmtR7mIByNmkJSqM95bRPvBR0aYm0rIdMMPjckRNuqVLMMsurqA9ANf2xSsWmpg1jGuliF7iyOC9OgvoVWKyqXsXF7S4eRPbdQ_uR2AU5zs-n-r2zOgvtWPK0fgSmWy7xocvFGQ3jMlfV1xRgy_qKElFVaBAluNygaDtCW8pUPV1_ptpw48xtlnY41RzTtBk137lqGN47FGmfM_qs2_CnelZfYiBc0suzbfAzMzBBuftPnZB6XLzrX5lJIJ4nt00z42ERtbdvac1zq9YzPfIRChPKJH25PUunrINU-dhyXARWSfuGS13Rk0yo1zJDOrsuBhgHE9vXCOqi1HDn6BQ29muQH-jgMzBx-rG3DnUqiKYMvcjdwA32NtnnwWsCWyRShTzzDU4nPkbOz4wGFoi4xsQn99G-HGS54teM_RrJpuGjFpJqA9wMnqARRJvOJIH9AHv6dJYwk5-5FXFQ6ajGrKEt6bZfdB6CInM8c4ZSnDHV0uh8vRCjCc9GpRxL24CWXXHVcoHUGAh-Hi0SuhU0BNI8QjEWPBKGlav9aKOu25qsJarzoc5R5z5RpF8MyCPFYUoIWkoujwBiMgK39pyKAvILyU6bmBr9WzKSGNWBTzZpvJ8hJz_pU8kcMl2q-MrgqvfSCuGG479KN8yyWfm8cm9qmtu9HCUkMpVxF3e9iMhjEoRNHqaHMQ_Efnq8-rwmRIfVeuIn95dhVrLpO9REZRuby3a1IAqSwCGq3LIn6DL0shQoFeFgUmKpHrl6ghgNI7PqdDz6f1nwHGYN6bl2xeSE_ltm5myHl5evtfSJARN3G_2huaazFuD-ZwVzoTuiy9UizzXA6qCR9arWVKPugulFwWeJ6z__8axYg4l5WGVwrEIgoILKIu6L0lrOQkJALBjuiM1GqAHlx_rvur8a9vbsUHtVtu8UgYyF3kJEiMhlGHOQrAOnEOBIuUfTcXSUo7bilWbao91Rm8eJXvGtZrKjGc8d1-BlrQieGc8sREam2bAs7yTjDgA5enJzAHzbKKVlAEJjA58ZHozLIxnGietsmExoLHsbIRVSpg3KyhAkMqIx-0ZX1UrlVIbmHdPwEFRfSZ8scnRM-GkoCexvwIZgIdsXHR2A_EckDnIbpNd0JM9wWPOF-4YdexB2wIi1zLPg9EQE_X8qIlxCOpI-WB5dscjsHYGPfUDRBpsSXihx-Utnk9N2r49s8GytV3GOknf79WArnuXDeyiVLf5g-n8JgOV-uoBe316zoIRetH-c6CQhADcUlW_k_lLkAPqJhSUFC0-XzTxTeK4_bbgJ4gdJz36mYbTuKdJPnujd6HSQdacEAKIuqz5f5qKLqs6nIgw9EG2I-Wklttvo4HSj3sTeM3yPxAeImObeyWRGXWODOX7g1NSU71xcENv0sVTFVOfMq0UBPFGIkRJemWaGtVDbatkepqPaOTGawIRsXkALWRPdL-0CPGSsx8SmYIGPfA1RbZl9POlCDlfGotdd36TMyZLxbWEIkNdHmPTtLjCxWrZBqvrfhws05E-o5WkIoicBHm59I3Oy1p-s5rl-zEE8kMeknP6LPlxhzoLeUe8EAdszw6DUHn11fKjs13-0cLiXwpRF0pWFrVUYRntApCUhhBRJjo8JhCa5oE7hLEow9-2VjWyDJUnIDke4o6llz1QIFFzFxE44GCBTfoW1JKFDCjy7qE_trEMm49_G6GjC2ceMmZMh3nUmTCmPl_V3DITeU-O0vxmHKGBAm-ZYwPU2RrGBzNUv-Iv5GvNYiqlHb5gSCtKCottf0OS5bPsHRHkIgmHmuiKMskw11QtgxMrTtFiD5Q0ntMQA-pU9BFGaublIC6HUDXgbZAOWNvqJ_xBwzK_YIJuQ16Erjk2VZUnhEOwjmJM1XrUBk0iTGhd1opItpIisu3nNVy7S5a4VbqHeOGWOCRHmeUhPJp54lmiDtDKAx1iqZSM1C3sY2A9mhzzCvnnG9BUv6IqNQRdK256nvei7EATuXb0hB2HRtIyG999s3Pss6gtFihsnu8CJJ7B_qM6fSPQIfCNkFXJtVnZg57mci0GpecqBOWVqpigP2TBzgl6hMFTpkbgovVKQIrZPOJotSZUQ9jPZMcHXXY_qBnNkSKldBuKkzqtUd1SIzhELAAzdYN7awgLUnvFvfD_flK-roOVJ4xEHnwVKwp0Fza3JAgtCM6Zi33tbTv-fi7yuPlM9QnYmox1vWI6TZfMnDocNi6eq3XMUeGq-kOcv0FTqRrVLky0-ekyFcVeVN59Folt1EUzPRGdo3bKsNdN04Ne7WdBFXoRKBrSoCaypPCDVnpHufkB_22G8ybq7emX381l1KthINqAop0R0ZaLAybZ6A6Nm_Gwx7JHTxHB_zFXskOIgh6p8Ylu26Xohj80Erlc2m3P2BLZ48TvT5h1rbX6XgOC8uWvO8DIqegBv2fx5bXJtsyxnelNIVFZps69U5f8p7ll43KmweVrOUGa0lufEyCNMr9Pfo1Az4hnEDgnafUegR1F78EN9ihLXBZrKH3WQPhXrCm1l9zlrSv7d996oqXtccvPdE0CGup4IREiC4LVkt_ePqbdJMvmSk6TPMXWtRlr6jWpd6rr6IoXBcuQ7at3wAlka6UCuc469FBqfuffLVqnK6_Dw2hF8P53rZFvXaPXOro8uqVJP_Dd_9OgvQZeA4ZLoPh_xZYbQ7zr-89SfXV-gHftk8cGNid2CAtINiJq8buR7VFIz6NJxjckmFkgoxKVwx7nadEAqAUXDy92PSFiErue5jx71f9mm4eCOrB6UnkXLpsJBi_RbMEainzLNfah5bZJhld3QFENxPdRVwNXrVXKq86S2jIxw4EwVBALjjIOeN0oDh2NDqwzZcVEPyrWulAXTtDyAjgQAC8j_PFYURQWHASGgvYgYr44eZgoJ5VCYwSEF3nPGkMKyq76h8boWWZAz4ArdbKl1eH6Pyq9VcYUtURh96CsMyCNh629sJRqA7u2H945MteqNHTtMYvnVKLaSG0XCsriWWjzS3DmSTe7jjYKx2H68_txS4l1IeOC_Ln8efzP9iA8Qo1r3sjfcDe-o0oSCMSJrNeC9wm8KhFuVAaywgKV7odUKM5lowSr6xCFW3kdYjFlPggCyO14Z1ss3sHtplWKh5htHwBxfjGNT9REoZUD7kQUoM0OI7CZrdvLEcFe1fk8l9T286zj5xCl5AXwr7Fe5bOwDdGfXJ7byfABbJQHFQyk6HAb4aUt6zjOepiAdRcqfL52Sp1CCFiRLu-ufDrgWZ8Gn4hHc3HYNtE_EaQwhZfmWR0lIBjfg9lJqadCfU9EI_ldGYuKNSE9EC4DrTlkH4_vRxG_6bOQEvk0BEZ9thmZkdQCOgysMU1OB6RqTqnn6KlpXK-t2Bw8ltY260MbVc2FhWOYPht8_b1OH7_QHUUcMTeXyDQeIAv7IH4NUMg7iTKRqmQ09Ghi92flgT0dz0esBpm5BISbiTAFQjNQqxPRUlgzPcemoAwPrRfSmMEbq_3sQKG98Rg6eq_LF9GAiHh6KdgweL27DjAg2KfnHI2nRtXyVviFCGBQHQomb3PijSfNPkQRiByI4yo2ycgC9xBQTgOqxNigR3c-wQ86yYmp5qNfIpngROax2v_srKdthUovyceLbxTJkKbBKUTVJNg2xsaz-4WpoiTlBUw0TZRlPyYPooV-fQpW7dIJqdpsyL8ZNAhMbEwUNq069k5cbd1_A_xBk04QAGj1jHahe1Uk3qOr0qTykF3POgRLb2VT0Cxjh6zvXAoqqgC6nC739N1r8SdroVM72IgeIXHg4GL7vDMIlcx0nj6ilD1I1cPkz4XH-z5wOZRIZQmwhC8TfvxbRxjPsBOR9gLXmMbstoQWc-pOVvwRjj12MDQ8Y8OAYNNyF6k1SMlaNfudA6YH1SJFE-tE9mxIHYjWnubn62QJDwTx6aveyiuGIaKSOj9spJ_C-yV-JPSVbu5DWsAsFTfNSS3OMwDipAVdJwfkoJBAC8LOdnrnbFkura59VwmmUbNfPJWeS0k3iuqu7m5uzx0xbV7CNlgYxVNMrbh2LDe4-eveWPfNDNXSgJin9hB22Tv-yEgTGX9d9FpfLAbMhoWkZBXxcJyJrYFTGPoV8OfuN7FIPbLs_Lv8M9jFF63q1wQU5-V7Pxh5oBxowHYNBEpfWrbSLneaJSHw30xtHBFt-CIUasppa2l5-0BcB0vzFW6FNoW-agcl0haflOFzCiEPaZCU84hhaAyi1zXQ4qQXaF51PrSm5Wv88SSilS89lhCgGNuKJ1v50aJPaEytFPmVs4JpHkK-bGJGU7jxloM-rGgBUwULQLZdoMqEUFLrzQIaevnMqcg4zNRnjQtoCPM9QtWu-4fxQGlejEO1YfACU1vaXNbClwjzBJKrI-KXJWbGq-04-uHhjEgVpYORMOl2NXmOzf866affGlAPwr5BJLbTLPoZBTr1SHUSswGwJn6bQngspmRrV3BT7xEvviGasSfGGspx39JYeUiTd-sW8mPg2b9-3CkcTm4whrF5qvaw--nyCpRFx6VrVuFn_5vpJ-aZVhSao7tjSDyCkB5sNUQf0_gZ3nJP2MPJPUCckNhxwCMaHw0eW6rSqABNqmkEJxW_LDEjwiDjsIvZwKvHcih6v9ONCwGP1I_AgxY_zCBWC-g40On9uS-DlWtc1v5bLSAHLv-rADSWtAZWXCHqhwq0Wt-ZoBmdeXrJHzbaKMd5djA-bJjKKDoXhAIEZIrgwbQJPFNCzKp9Ts1OQWe0_ZXy9_49Pb7WgXKVViZ957IQauzMBmz3-j0JPw7CzmNWTljsUj07OSOqJ0rT7IFulB1dbMp1S-oK_nyoJBgxuJdnqn9eqlnXavCK8gz1gTO3DzWrxB3Z92kFq0dh7bxVIKJ9Su5wx0UXCgGzn2ExpTVOnM7pISwXA4G_A9t7CrwoY0BwWyVMn60rK6KiJvPnV1q9fn5C-5zw6ynqosYZ4UbHGcw52D1XPRN5_mMnbWTM4o4Y8V7wXtLYtrMIAGWxV9T3XcGA97POKJ20v18M3Uq_rX-Rb939lxvQI5zLqaumMWGaezEGG1zhoiNw7zYcXQu4Gm401fe9Tm6ansORR9yftMSYBYhNOVvkU0bgLCouEhoAKbTwFMVoyc1DTWbVi8sxqXG2lIa7U2KECYtNj25ri5tTwVPAaZJ8ofriTOYZDGnD5XDTER9uhlVKoL2vQbQK4hr0CucG07gFL9Vgvwev3W1ccDtDivJVn-o8HafSrdNn26BUPqHSGchLoMbz2yC34m7sLhu8Z37EfZRb_POF9m2sARJ9IBtRhZjygGCuYLUUSJK-8Ls_BChhkf36fPxCRTEsVU_3kXjku0G_hcOoRoJIgqBPgZGMJFBVHDZ3yyjdVmcvG8LQiZuLVXViKLkPQ9iFWGRyvb5i6DqcIQQMipJy204SI87ujKOse_ul2Fr1smMcuyizw9bAKrIPNyeldB8oncnlIia4q5RqDNOjmIvj62ksdIq2RbJhHbN6SEow4d-d9zTnrrOyhUUHO4IO62nljzWZ6sVwLCtQkTYftxAF0G8DhQghOp3j021IOyFvQH3Njr0oRMcBIf16SWMirFX2HcjI2z8CzgXoQx3vSCfCBCgVfTOCTK3wY0v7EEktD5tQaX6cfVucM3poL_FyoB69hWawAOIQoWgg-7bCN1RgGv11ffRZi1FhLHhqJOyK3DaFDXSr0u6qERl3YMkQulByifM82lG369X3Nsoi1CT9lg06ruOlX4GTuGUvvImh_FIWt1Yhrgc4VRnx4zZaA7WekI83h-AnDTfz9ha8Bm_m-_4KgweVOBpGHh9-4kbV3Crr3uiHWDmd3oTUPnjgGhNhBu_9x0IbrWwQ30HI8-N_MbrYHEWE39T93p6NUbLvade4fDAyB4e4pq4fb8PmUxH6aZy3_CLqbEP3rKTAOyA2QnlqJR1ZYqeiq8SSTHfNW0tXngxw-JTh2qLhM3w3LIFNgG1ddZqnl5NUQMnYqOwK-wuqEB7FAZdbS34y-Uu_dJNDZ09CI7TzGyICVCBuUFCtTTJl2DiJt-idjMbsF_iPVynWQImjdRjcLq2d8Bccwm5aMFTPZkQItGDxPH4Lz-5wW7Tj_rjeEbjOIBt4n-baJPDrRkM59yQGNYZomNI2aAqV7knjVIhh_R5nvcpir1O5Xmc_vin-g3kcj8CD1m4DF1KEronrP1CPHecAnLECqcrn4cn9Hj0HisJNIgtClsNW3tIPcSdYGmE4IgXKv3maZELWr88Orbx5e_O3medFUZKQOoQdfPxzbmXCu5nXMpd4JxdC5Mjyy3MltnuW_ahkVLYy0gKOIijX3KhnHlkpdKfQSq7LVpSBBxs4Uiwt6v2kE__9OXwM0__ywc5Bp3mjtHZ4fbZw417eYFKEETKbvTZe0iKp-9_Mmd8znDBPvsw_E7fXjiv-y6VDl7W9qy4zyHMvjyEOW9hUeIQxCJOdLi_sLJZMtphStcnY5yKYn9g-vhU-cql8inhD4wv4nTWUt22aUd8kIM-g1x8HIf7EAr3Z1KTghuH0WEKHjlfu1eYGObna_561q1PRgSYlXuJNb4dmXbYxEkB9KwQ5vDZyers6gUPSRcjRT76xxXwPs0Zt7UnPN3HGbinbEaXXxFJ1DMsEigV_bKQxXXOCNQqmKmRKa6b-2MKxYdVDq1CS6an-v5s9aMRuy_ASTY9AlkRTFLqtrrxCNwjIJzVxrIaS7ZAUbSJ_UKcCSTOzUAsjEU4oIyz8aFkluowdH68R-WqY9IBBPosOWKySNnmHq6mOEM93jv3fXabmW6qRJTEISMxNKSSFdXsGXx8bMJpDKjyw7Ohx5eSnnviBWHN_7Z7jud8oJZtWEQDyEYI5JjMbuzLDs3sLHCBCosjB_B7paxx94AE9jUyLCC8pvuEky9WZJm-OGxvhWyU6LDEOzHibNSvStTtzdGd4pHclPZCTkOmKORsPJrob2jTIHUBhHNEFf-PTm8_NavUs0uyiiSh87TkzkmXFR6UjZC5yCuQxQkVw89y7oRbHTHPMOF-595JCX_Ou7j4VN6tiEVl15lnM3LrbGmBm5p6nn_RGVDIn5pm27dTph_9bLWI85u6YP6sLjfO8mvca-uGJ9O-uuK9ouvUNT-e7XPrJX68q-w-cf5_vJKpb6zNs9IZYrXBHUeAzH5BzPeVv20vWZHmt2QrbrX_F9WvHB3zuMW18qZqH39yj-M9r2wLh7mJDUINtLto99hixzgrHZ5YqwiDeiuI3J234AahZfQ7S0-FMd93YX6FoA2H7UzCMcMaIp3C9DXOWfsAIcaIqCe5x10azjv-fO_8ymonnRvIW6yjJplRvY8YgZ2c9Ie98xy4C1unAjMGNProYGOSIo3QOW-41ERDqcrdyosbyiGLve0wyqKOQPUxe1dA9x6X0W1AxZRrd28jo7BpdIdTkWDqetM8t7d43Eqts7yXRO6LeXOQrgrzy2WCExL2uS1ogeEtkOBI3e3F-uH__6tn97-tqfLK9_9rsxnysVtttvAkupKYDOs-S31pVAMrpD9xl0b4ihuAXt-TJgaGgGI8GVlERNhOlBCBRY5xjp64CtjYfuDj2KHbxj5qX55Fxpv2j-3HjUk5Eb320svKJgbJ6kv9XGDVOF_SOQOvj25GMlLb4aix0jXi60XfjQByHA7vCDfgykSS2H9X7pT6rjkN05Z2P82_k50_z8ywKSo5Y19ajGFNxzMXoV8asWTLJPBBhme25eb53uprJbWPP-GEHveq7nEYtkrQ1IWc9TJshd72wzQXQC66KVgvgoonO16ywvNF6R5tpA5urh-5lE8hS9uo3MFL02XApNYsiois37t_GppL49wS6g0Ps7mhbmk7o_BXzdz6MiCemG4nDgjPvJf-PxoEazSv7ldsfjt8kYlvOMPgTgi6iFXWkf7mZVMe1L7Mf60DJTjVpGYS9Yu-nP6ir_2bL31f--lfPpRvDEyyD5dw4S_iccfvbOc3v9j0vr94zWj72OvcJW-aNf5r_sbfLb3-2DPvICxH52m_CfEGrsdLy7cvpxaF8e-d_7hd4JstHPXvAGVK8Lr4-MH9XaRWfvHLrNB--jcvy_lmia_PO_79XN8kTRQdvRLxzhqWUs5KvzZz_uKod7awfv6yAiRnY1eliLLL4taKJSY6914Addxwp_OcKrbwTsHUvQ0IOx2yNw4jf_k978O3ciInm6c5PXwjlx_EcXyiMAKVD5bZboDgr5II8BFUVd0XH_7BdbFCymBNtGVctaGlyh6NZan3UdmOhKx6m0AJiPJwfcnt81oK8jtYSVVxXdpHQxatht8FoKW4YJdnzrqPwTE325Nzt3IS1rUM1ChpCR_LOMukXV3pd5MRAL024tlVofm-3GFq-e48o6bkb6V5IEyJljUV92MnA8FLwxSSn9MyzZlzQWBmbsxqQ9dgJU-gv6xHClo40pIybLWlaEMzj_77cGbO1Tu9HZO5u9oO862ZPt3YJwQb5iZ0NkYXGGGYnu0camIw8ncGf2K1wB23S4e0GxWp5bqLmlrbSSkrqJj_QN3GFOGEdCj24hKpvBwgDIU0cIQpqMI91TPcg84ha44K0bEJywLJ3GT1U0t49TLAgBkgcgldVTsIbWb-8lwTh0Q3hftrDNBAMh7-Zx7hIMhg9KlF1R2ZvydA6yvml9Gp4GbnI6cQdfkzSpTbhiODQZdcr8FLDJDccF5XIFBp0F2Dga2lsdnXus4oKWi0-mT0V5RgwZt0LhsUcu_UETdjI-LF0ry0n5hwawRdUg3fGpoJf39bXuQBD81PY11S_1RPUCbv6rcMED1lexv-bOfLi0AphSn0D-0UgqfxVGuKwrIzXRgCwXvMOoOa0x4-eDsEpMngEb6UNnBeaU04Fd9uNeCjUNe1uTw2hlw9ZJmxogVEdX0rrTzFWG_rc3vVSdj85vDro08h21YnRfD81_EiPcEjoEtjL0Qqcbdqb4uCqXz9skBjWa77ggu7p4p26m2IliATZIAKGwSZfUkLD4BENpTPKTM5rE9P4FAQLB3PpqGe3WhCMubesJxlILAXV_0MA1pg6VnTa8Inev4oOGkdULindf_u8nYWjECC9Ca26S4mW-FEkYWDCsjz9NKWyvhcnwI6N2Mq7iR4d07OWgo1p8coQU1nrg9aeuzGCweB_kWjjrHOQrikaSEKu106r_sZ5FHPYFQKin1nS4Ai0gpIDcysGSUviXC-wzG2Sn25JyVH7TMPoJk-dKRuuadJhnFK3-YUkKxWjd_HZgsnHgTikZLMKtSlu9ULGc643LqlsULaNc1epWCKuCk4nuW6gAZ20gMMniuu-6ismBu4lde0yH3YNw3esg-4jsioxTyRjTZ1HFrVEaYGe9LfTslNMMa--kGF9u4VfVqwmD1oQVgEKREWwYfrTy_fPs8dNIsjopvFLH5122JtkV39cCUyCeSiFWQ-O9wavdcsgAFqmG1RMiPW5YK-YIrc3msVdrqm4QqQ1eo8D5Sxuqcw8WALBg8OE4n1FfRcX4_qgB9hJ-TcMHdqOaP7AS9bn9XBDJ2gVupGqr5IgaK-v-rrATJ57OCph7Ltefym8Sur-LBnO9JZfQ2si0tS9sw5iLJwX9pfdsuP-lkvyBraQ-dsd2iUL-5clCzZFYcmEusGIzLjMip8IY_ujtwPg71QVkuAYMdBGa7mRdugjkjV085Wom46dK_jYRPJ0opHXF5va_WZa0oya4ElQwAR7n4MesZn8Pcb1uDHj8WRKewzCL8YyfM0vNCzVp-Xrlb5Uwr5EHVvB0S8VXLZiFeyvpwMaYMIaaK9mfhRcJgseo18CltwGw1yBmTnGj57D1dzq8uFPAiVjNLpJ-T2vfAeFm8XZzZ291tQNxRkFQUBLBwv8ZMK11hGuFrYO0U2SmxDqbFzEocB4qYr2_ZjRgHf0K3GHwNOqRW2DjseAoHbNNlWe4h0lVYbZn0LCyNeR6nqOncyV33u8A4V8Wo8Kc5GKIhvB0LPWbAZI3EfRoOsloWgFthON4YlZjIM-doR2VOIT8tELDOpmOwXvUr1vRsR1xg3B1SiwCNy5xW2nSvOYIhLmCsYaxDeTVoa6oE4R41gry2Ep_Ca7xnuS6GEQH8yE4reSbeY0GM3twFlTdy5d_Stv17vc8zaBF0MwoxMgf66HUa5XxA5edkmIE0hezoJvpP8h56GCe2edq9rEbWcynfarHuPC0-g8vbRXFm9AmGQ_1aPxXDlpAqXIk79-GeEwiqxB3pBFdV99BgQKzFByQj0n2g-PKNqGonQmiUqxNktWZjqImRvaXQ9Hd4VEWIg_6XNjaJw4xE4DIAl-yCGTHmHhYhBosyVN9Wq5vs4SjbzCJ7vy5DaZXg-rgKUjE_kId5GB_M0upJ-kDI8rs1u0WE9PSpXELlLVeIAr3VNRprfEzaSgD4bjrwDo4LKYoA1RC87yFfL47q50vypt-pqpj47kdJKu1SXYfORfH9c07r8zerwvRRNfShOjnwk8TnSOuCJ9EWdMSjkxQsqCVBGp0_ogw9rY8cHQKBT7tRLiIEyx8-JtlR43F0sT4pSSVg7VwRkaMzhnpAeux3t-gUF0H92yu7jSlnhLGYdbRemDprPFU_NLzNZW3KI7a82214JTSmu95KnoBteTmoNUWtN5JyzJ7mTCY4Ia_fRyLbFJbGkkWGSBshJKFvHAvoLFBAhrdrdNbhdKeVFOvbK01fz45zWgnAjJeCZBtK4Os2Ejo6hO8FKHBXJeGwMFHE6Bk45s6act_0eEg9ENyE-DGSj1krGoVlvKHk4L2bFYQKnTRCXAJ3kaHVpuGMTyRFUQpneEnnExUrhlntJUh-xjWdISBTFDxgUUUB-sW3SAB6Z2XxHXJh3RiiBDdJjo1KEkxVxclIfnLvaOPcFhz2YoRiSkPxom2nKg-FRTtguGiU1xS5lzBb7kmfuYD7bTFylcw_M-ljwVPYU8K2EMkHSlaAjFKlGKzXOOmcjlxxMZ0-U2aQAi17wHSXByU0JC87CIK7dvdUuvNWBthevvnHbl6N9HHiYc9a-HSaI9mmMHX_7AD-X3yCXsyarKF_rBgWo43dVUG4pGxNfnGje2NzqU4bTFKnhsGIxDz6BBDk8_S0gCvS3_2eQ5hngWKxIA1EvKfBLoRIu-dDqoy9MqtUAiKcUeUmuG4GgQ08sycYn-RRM1d4uH5gNXx6wJis4xbio7UmIDBRGnE0t4tfy94DQ4Yh38R4H9IUpvWwJx_9YBfzG2lwLJqLz9pmNMItycCiE4Hc_LET-zWa9q8IMAsnBJuEw2gGPV_JRS-ERYEbx-xPRF5_Nz3oOqQocgENtc76PUoy3EDUvCHKFRDs_KT8LXinJz-6LT9p0f8t9jBgFPw-WcoPf6jXFDrUfpKKV3wq-iYO_L02eFZyg9f4r17_XvfwMfDVjCDO072VZ---nMJODL0URzE7zyUnkdQMeni8VkD9EVGl3rYNc_z2gFlJVU-iMsbw_qL0iWcuYPeoPovn4Wflqn4WTjjA-rpY-U4Ob2xnMoMwBX7VOeiiN8Wk7zYTYRdh1n5Su2zMuOYXL2yo3ep88jS0GLyY2RsTZa0INxviQezvpPUHGbZywse1NR659iQK4UiL5WBP91W0lndUzHe3gCkwrTUHUSPA6icZuIyAsLvLEYaqm-0EbupFZnGK4IoUO0EycZC9cq23A8wOw32hrcX9MTp0_0d0rEF8MCW-KbSUXBL4mTpfsqpuPie_Bqkdv0I5bbrNf6AzxIX_EtMPMxzJNxJLzJwv0P4ERyb4GJAyZqLqXOi0h5lpfgVPm9Oy0VP6kl3FSrEMw2orpPqJrlrW3wVohC_1wiKKmJd9lg7YEwLSrjBqfW74cBLERmVN1QM_DRNwsOpPflxwRtZqV0eMqnXPmsms-z1d_Dau431Y8DVXWqyx4ksXyVFf5fT2xPCokz3h2p6wcN61USWwOSDDDd6jtYmz2Kq3fhffCIKxw00FTLSAfwisNSmmihMhbC0qNv912h6lYQInOATYFoQ_iLcwx6CRS4qCeO6oQ8KfWdDkDwBoiTDU8CyGc2oAO8-RjkkvIkCg3SKBFnC3PJouYT8GZI_hPpxVLJjuLuNLntnc3zw6cqUye1HhxbCkxRaX4jytmGnuZ_ZpJYFuY50AZmQ43IqKjCAxkH5Q1q0MYPY1b2qXB9UzSylk480uQrxh2U4awFVRg9QrqiivmgAlusew8Ixl4woIc55parrckoXcXniNfCis5sLkh5aR4djVrOQHPA9vEUA1L5IeAUnxdSsEPJVAKIxXDemtaD8N3qtDocbrMQA_L8BFj2lHUPCZ7OG1PzZMGkAM3RAyEperMEc1TksucXqZIZ3m0Xb10XtC_dZmJikRqBtWJapqCB2hN1ASZDlCcWJZjk_CYqPOkaniUV9rINVAqgL_l3_Wwy3wwsSZpScCl_Ac7s6g0sQoDj-78rGRo_94kP-1NI1OzMtfdG50MQhQKsOpKcTMpSIwXZ_oE2bQLsALAEfx3Z7orVaxuFw"
    },
    debug: "(()=>{var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,x,A,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},H=e=>{var r=K(e);return(e,t)=>X(r,[e,t])},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>ex(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ed=e=>e===er,ec=e=>e!==ee,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:eA(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eA=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eC=(e,r,t)=>e[0]===r&&e[e.length-1]===t,e_=e=>eh(e)&&(eC(e,\"{\",\"}\")||eC(e,\"[\",\"]\")),e$=!1,eM=e=>(e$=!0,e),eU=e=>null==e?Z:ex(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e$){e$=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e$){e$=!1;break}}}(e,eF(r,t,n)):eP(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r)=>r&&!em(e)?[...e]:e,ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e$;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e$=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eJ=(e,r,t,n)=>null!=e?new Set([...ez(e,r,t,n)]):Z,eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eL=(e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e$)){e$=!1;break}return l},eK=(e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e$)){e$=!1;break}return t},eG=(e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e$){e$=!1;break}return t},eH=(e,r,...t)=>null==e?Z:eA(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return eL(e,r,t,n);if(t===Z){if(e[ei])return eK(e,r);if(\"object\"==typeof e)return eG(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eZ=async(e,r,t,n)=>{var l,i;if(null==e)return Z;for(i of ez(e,r,t,n))if(null!=(i=await i)&&(l=i),e$){e$=!1;break}return l},eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e1=(e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eX(e,(e,n)=>t=null!=(e=r(t,e,n))?e:a(),n,l))?e:a()},e2=(e,r=e=>null!=e,t=em(e),n,l)=>eR(eP(e,(e,t)=>r(e,t)?e:Z,n,l),t),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):e1(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e5=(e,r,t)=>eW(e,eT(e)?e=>e[1]:e=>e,r,t),e8=(e,r,t,n)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?eM(e):Z,t,n)),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&eM(!0):()=>eM(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,ex(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>ex(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}else ep(a)&&ep(void 0)&&(a=(t=a)-void 0);i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=rA(!0).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rE,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rE{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rx=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rA=e=>new(e?rT:rE),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},r_=(e,r,t)=>null==e?Z:em(r)?null==(r=r[0])?Z:r+\" \"+r_(e,r,t):null==r?Z:1===r?e:null!=t?t:e+\"s\",r$=!0,rM=(e,r,t)=>t?(r$&&rh(t,\"\u001b[\",r,\"m\"),em(e)?rh(t,...e):rh(t,e),r$&&rh(t,\"\u001b[m\"),t):rM(e,r,[]).join(\"\"),rF=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rq=(e,r,t)=>null==e?Z:ex(r)?rC(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rC(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rR=e=>(e=Math.log2(e))===(0|e),rz=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rR(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rR(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rD=(...e)=>{var r=(e=>!em(e)&&eA(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rW=Symbol(),rJ=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&e8(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rB=(e,r=!0,t)=>null==e?Z:rH(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rV(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rV=(e,r,t=!0)=>rL(e,\"&\",r,t),rL=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rJ(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rW]=o),e},rK=(e,r)=>r&&null!=e?r.test(e):Z,rG=(e,r,t)=>rH(e,r,t,!0),rH=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rH(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rX=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rY=/\\z./g,rZ=(e,r)=>(r=rq(eJ(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rY,rQ={},r0=e=>e instanceof RegExp,r1=(t,n=[\",\",\" \"])=>{var l;return r0(t)?t:em(t)?rZ(eW(t,e=>null==(e=r1(e,n))?void 0:e.source)):eu(t)?t?/./g:rY:eh(t)?null!=(l=(e=rQ)[r=t])?l:e[r]=rH(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rZ(eW(r2(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rq(n,rX)}]`)),e=>e&&`^${rq(r2(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rX(r4(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},r2=(e,r)=>null!=(r=null==e?void 0:e.split(r))?r:e,r4=(e,r,t)=>null!=(r=null==e?void 0:e.replace(r,t))?r:e,r6=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r5=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rz(l,!1,\"data classification\")),r3=(e,r)=>{var t;return r5.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r5.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r9.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r9.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r8=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r5.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r9.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r9=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rz(i,!0,\"data purpose\",2111)),j=rz(i,!1,\"data purpose\",0),te=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),tr=e=>!(null==e||!e.patchTargetId),tt=((_=o={})[_.Global=0]=\"Global\",_[_.Entity=1]=\"Entity\",_[_.Session=2]=\"Session\",_[_.Device=3]=\"Device\",rz(o,!(_[_.User=4]=\"User\"),\"variable scope\")),o={scope:tt,purpose:j,purposes:r9,classification:r5},ti=(rD(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),ta=((j=_={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rz(_,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(_=s=s||{})[_.Success=200]=\"Success\",_[_.Created=201]=\"Created\",_[_.Unchanged=304]=\"Unchanged\",_[_.Denied=403]=\"Denied\",_[_.NotFound=404]=\"NotFound\",_[_.ReadOnly=405]=\"ReadOnly\",_[_.Conflict=409]=\"Conflict\",_[_.Unsupported=501]=\"Unsupported\",_[_.Invalid=400]=\"Invalid\",_[_.Error=500]=\"Error\",rz(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=tv)=>(e=>{var r={initialized:!0,then:H(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,tu)),values:e(e=>eW(e,e=>null==(e=tu(e))?void 0:e.value)),push:()=>(i=e=>(null!=t&&t(eW(to(e))),e),o),value:e(e=>null==(e=tu(e[0]))?void 0:e.value),variable:e(e=>tu(e[0])),result:e(e=>e[0])};return o}),to=e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z),tu=e=>{var r;return ts(e)?null!=(r=e.current)?r:e:Z},ts=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),tv=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${tt.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},tc=e=>e&&\"string\"==typeof e.type,tf=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tp=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,th=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tg=(e,r=\"\",t=new Map)=>{if(e)return eA(e)?eY(e,e=>tg(e,r,t)):eh(e)?rH(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tp(n)+\"::\":\"\")+r+tp(l),value:tp(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),th(t,l)}):th(t,e),t},tm=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rz(c,!1,\"local variable scope\")),ty=e=>{var r;return null!=(r=tm.tryParse(e))?r:tt(e)},tb=e=>{var r;return null!=(r=tm.format(e))?r:tt.format(e)},tw=e=>!!tm.tryParse(null==e?void 0:e.scope),tk=rD({scope:tm},o),tS=e=>null==e?void 0:eh(e)?e:e.source?tS(e.source):ty(e.scope)+`\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\"),tT=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tI=()=>()=>W(\"Not initialized.\"),tx=window,tA=document,tN=tA.body,tO=(e,r)=>!(null==e||!e.matches(r)),tj=((e=>r$=e)(!!tx.chrome),Q),tC=(e,r,t=(e,r)=>tj<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tA&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},t_=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nN(e),et);case\"e\":return L(()=>null==nj?void 0:nj(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:t_(e,r[0])):void 0}},t$=(e,r,t)=>t_(null==e?void 0:e.getAttribute(r),t),tM=(e,r,t)=>tC(e,(e,n)=>n(t$(e,r,t))),tU=(e,r)=>null==(e=t$(e,r))||null==(r=e.trim())?void 0:r.toLowerCase(),tF=e=>null==e?void 0:e.getAttributeNames(),tq=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tP=e=>null!=e?e.tagName:null,tz=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tD=(e,r)=>r4(e,/#.*$/,\"\")===r4(r,/#.*$/,\"\"),tW=(e,r,t=er)=>(p=tJ(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tN.offsetWidth,4),y:ej(p.y/tN.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tJ=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tB(e),{x:h,y:g}):void 0,tB=e=>e?(m=e.getBoundingClientRect(),f=tz(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tV=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tK=()=>({...f=tz(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tN.offsetWidth,totalHeight:tN.offsetHeight}),tG=new WeakMap,tH=e=>tG.get(e),tX=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tY=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY(tF(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>rK(a,r)&&(i=void 0,!t||tO(e,t))&&eM(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tg(l,r4(n,/\\-/g,\":\"),t),i)}),tZ=()=>{},tQ=(e,r)=>{if(w===(w=t3.tags))return tZ(e,r);var t=e=>e?r0(e)?[[e]]:eA(e)?eB(e,t):[eT(e)?[r1(e.match),e.selector,e.prefix]:[r1(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(e5(w))]];(tZ=(e,r)=>tY(e,n,r))(e,r)},t0=(e,r)=>rq(eV(tq(e,tX(r,er)),tq(e,tX(\"base-\"+r,er))),\" \"),t1={},t2=(e,r,t=t0(e,\"attributes\"))=>{var n;t&&tY(e,null!=(n=t1[t])?n:t1[t]=[{},rG(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[r1(t||n),,r])],r),tg(t0(e,\"tags\"),void 0,r)},t4=(e,r,t=ee,n)=>null!=(t=null!=(t=t?tC(e,(e,t)=>t(t4(e,r,ee)),ex(t)?t:void 0):rq(eV(t$(e,tX(r)),tq(e,tX(r,er))),\" \"))?t:n&&(k=tH(e))&&n(k))?t:null,t6=(e,r,t=ee,n)=>\"\"===(S=t4(e,r,t,n))||(null==S?S:es(S)),t5=(e,r,t,n)=>e&&(null==n&&(n=new Map),t2(e,n),tC(e,e=>{tQ(e,n),tg(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t3={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t8=[],t9=[],t7=(e,r=0)=>e.charCodeAt(r),nr=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t8[t9[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t9[(16515072&r)>>18],t9[(258048&r)>>12],t9[(4032&r)>>6],t9[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nt=e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t8[t7(e,t++)]<<2|(r=t8[t7(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t8[t7(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t8[t7(e,t++)]);return i},nn={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nl=(e=256)=>e*Math.random()|0,na={exports:{}},{deserialize:no,serialize:nu}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};na.exports=n})(),(_=na.exports)&&_.__esModule&&Object.prototype.hasOwnProperty.call(_,\"default\")?_.default:_),ns=\"$ref\",nv=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,nd=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=nv(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[ns]||(e[ns]=a,u(()=>delete e[ns])),{[ns]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eA(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?nu(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nc=e=>{var r,t,n=e=>ew(e)?e[ns]&&(t=(null!=r?r:r=[])[e[ns]])?t:(e[ns]&&delete(r[e[ns]]=e)[ns],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>no(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nf=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nd(e,!1,n))):nd(e,!0,n),t),i=e=>null==e?Z:L(()=>nc(e),Z);return r?[e=>nd(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nl()));for(t=0,i[n++]=g(d^16*nl(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nl();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=nn[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:nr)(a(nd(e,!0,n))),e=>null!=e?nc(o(e instanceof Uint8Array?e:(t&&e_(e)?i:nt)(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[np,,]=(nf(),nf(null,{json:!0,decodeJson:!0}),nf(null,{json:!0,prettify:!0})),j=r2(\"\"+tA.currentScript.src,\"#\"),rz=r2(\"\"+(j[1]||\"\"),\";\"),ny=j[0],nb=rz[1]||(null==(rD=rB(ny,!1))?void 0:rD.host),nw=e=>!(!nb||(null==(e=rB(e,!1))||null==(e=e.host)?void 0:e.endsWith(nb))!==er),o=(...e)=>r4(rq(e),/(^(?=\\?))|(^\\.(?=\\/))/,ny.split(\"?\")[0]),nS=o(\"?\",\"var\"),nT=o(\"?\",\"mnt\"),nE=(o(\"?\",\"usr\"),Symbol()),nI=Symbol(),nx=(e,r,t=er,n=ee)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rM(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nI];null!=(e=t?e[nE]:e)&&console.log(ew(e)?rM(np(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nx(e,r,t,!0)),r&&console.groupEnd()},[nA,nN]=nf(),[nO,nj]=[tI,tI],nC=!0,[_,n$]=ea(),nF=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nq,nP]=ea(),[nR,nz]=ea(),nD=e=>nJ!==(nJ=e)&&nP(nJ=!1,nL(!0,!0)),nW=e=>nB!==(nB=!!e&&\"visible\"===document.visibilityState)&&nz(nB,!e,nV(!0,!0)),nJ=(nq(nW),!0),nB=!1,nV=rb(!1),nL=rb(!1),nK=(tV(window,[\"pagehide\",\"freeze\"],()=>nD(!1)),tV(window,[\"pageshow\",\"resume\"],()=>nD(!0)),tV(document,\"visibilitychange\",()=>(nW(!0),nB&&nD(!0))),nP(nJ,nL(!0,!0)),!1),nG=rb(!1),[,nX]=ea(),nY=rk({callback:()=>nK&&nX(nK=!1,nG(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nK&&(nX(nK=!0,nG(!0)),nY.restart()),nQ=(tV(window,[\"focus\",\"scroll\"],j),tV(window,\"blur\",()=>nY.trigger()),tV(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nG()),n0=0,n1=void 0,n2=()=>(null!=n1?n1:tI())+\"_\"+n4(),n4=()=>(ry(!0)-(parseInt(n1.slice(0,-2),36)||0)).toString(36)+\"_\"+(++n0).toString(36),n3={},n8={id:n1,heartbeat:ry()},n9={knownTabs:{[n1]:n8},variables:{}},[n7,le]=ea(),[lr,lt]=ea(),ln=tI,ll=e=>n3[tS(e)],li=(...e)=>lo(e.map(e=>(e.cache=[ry(),3e3],tk(e)))),la=e=>eW(e,e=>e&&[e,n3[tS(e)]]),lo=e=>{var r=eW(e,e=>e&&[tS(e),e]);null!=r&&r.length&&(e=la(e),ri(n3,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n9.variables,r),ln({type:\"patch\",payload:e0(r)})),lt(e,n3,!0))},[,ls]=(_((e,r)=>{nq(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),n1=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n3=e0(eV(e2(n3,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tS(e),e])))):sessionStorage.setItem(\"_tail:state\",e([n1,eW(n3,([,e])=>e.scope!==c.View?e:void 0)]))},!0),ln=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([n1,r,t])),localStorage.removeItem(\"_tail:state\"))},tV(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==n1||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||ln({type:\"set\",payload:n9},e):\"set\"===i&&t.active?(ri(n9,a),ri(n3,a.variables),t.trigger()):\"patch\"===i?(o=la(eW(a,1)),ri(n9.variables,a),ri(n3,a),lt(o,n3,!1)):\"tab\"===i&&(ri(n9.knownTabs,e,a),a)&&le(\"tab\",a,!1))});var t=rk(()=>le(\"ready\",n9,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n9?void 0:n9.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n9.knownTabs,[r])),n8.heartbeat=ry(),ln({type:\"tab\",payload:n8})},frequency:5e3,paused:!0});nq(e=>(e=>{ln({type:\"tab\",payload:e?n8:void 0}),e?(t.restart(),ln({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[lv,ld]=ea(),lc=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nj:nN)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nO:nA)([n1,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===n1))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=rA(),[v]=tV(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rx(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),lf=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nC;var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(ls(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nO(l,!0):JSON.stringify(l))};if(!t)return lc(()=>eZ(1,async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?eM(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rx(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nj:JSON.parse)?void 0:a(r):Z)&&ld(a),eM(a)):eM()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rz=[\"scope\",\"key\",\"targetId\",\"version\"],lh=[...rz,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lg=[...rz,\"init\",\"purpose\",\"refresh\"],lm=[...lh,\"value\",\"force\",\"patch\"],ly=new Map,lb=(e,r)=>{var t=rk(async()=>{var e=eW(ly,([e,r])=>({...tT(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ly,e,()=>new Set).add(r)),o=(nq((e,r)=>t.toggle(e,e&&3e3<=r),!0),lr(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tS(e),null==(i=rv(ly,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await lf(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tS(e),i=(n(l,e.result),ll(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tw(e))return[rc(e,lg),r];eT(e.init)&&null!=(t={...tk(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r9.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&lo(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tS(e),a=ll(n),u(n,e.cache),tw(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tm(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lm),r])}),a=c.length?V(null==(a=(await lf(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&lo(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>({...rc(e,lh),cache:[r,r+(null!=(r=rv(o,tS(e)))?r:3e3)]});return lv(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>tu(e)),eW(e.set,e=>tu(e)))))&&e.length&&lo(eH(e,d,r))}),v},lk=Symbol(),lS=[.75,.33],lT=[.25,.33],lx=()=>{var l,a,i,t=null==tx?void 0:tx.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tx.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tx.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lA=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==x?void 0:x.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lx()})),lN=(e,r=\"A\"===tP(e)&&t$(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lO=(e,r=tP(e),t=t6(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tU(e,\"type\"),\"button\",\"submit\")||t===er),lj=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rF((null==(t=t$(e,\"title\"))?void 0:t.trim())||(null==(t=t$(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tB(e):void 0}},l_=e=>{if(I)return I;eh(e)&&([t,e]=nN(e),e=nf(t,{decodeJson:!0})[1](e)),ri(t3,e),(e=>{nj===tI&&([nO,nj]=nf(e,{json:!e,prettify:!1}),nC=!!e,n$(nO,nj))})(rv(t3,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,m,l=rv(t3,\"key\"),i=null!=(e=null==(t=tx[t3.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>nF(e,r))(n)))},s=[],d=lb(nS,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=n2()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),nx({[nI]:eW(t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),rn(te(rp(e),!0),{timestamp:e.timestamp-ry()}))),e=>[e,e.type,ee])},\"Posting \"+rC([r_(\"new event\",[e4(t,e=>!tr(e))||void 0]),r_(\"event patch\",[e4(t,e=>tr(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),lf(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eW(eb(e),e=>rn(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eY(e,e=>nx(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nR((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nS,v),f=null,p=0,g=h=ee,m=!1,I=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=e_(t)?JSON.parse(t):nN(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nN(e):e),e=>{if(!e)return ee;if(l9(e))t3.tags=ri({},t3.tags,e.tagAttributes);else{if(l7(e))return t3.disabled=e.disable,ee;if(it(e))return n=er,ee;if(is(e))return e(I),ee}return g||ii(e)||ir(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>ir(e)?-100:ii(e)?-50:iu(e)?-10:tc(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var y=f[p];y&&(v.validateKey(null!=r?r:y.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,tc(e))c.post(e);else if(il(e))d.get(...eb(e.get));else if(iu(e))d.set(...eb(e.set));else if(ii(e))rh(o,e.listener);else if(ir(e))(r=L(()=>e.extension.setup(I),r=>nF(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(is(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nF(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nF(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else i.push(...e)},Object.defineProperty(tx,t3.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+n2(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),lr((e,r,t)=>{var n=eV(null==(n=ti(eW(e,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee]),[[{[nI]:null==(n=ti(eW(r,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee])},\"All variables\",er]]);nx({[nI]:n},rM(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e4(r)} in total).`,\"2;3\"))}),n7(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):tv(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lA(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),m=!0,I(...eW(l6,e=>({extension:e})),...i),I({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t3.name}\" is used for something else than an array of queued commands.`)},l$=()=>null==x?void 0:x.clientId,lM={scope:\"shared\",key:\"referrer\"},lU=(e,r)=>{I.variables.set({...lM,value:[l$(),e]}),r&&I.variables.get({scope:lM.scope,key:lM.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lF=rb(),lq=rb(),lP=1,[lz,lD]=ea(),lW=e=>{var r=rb(e,lF),t=rb(e,lq),n=rb(e,nQ),l=rb(e,()=>lP);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lJ=lW(),[lV,lL]=ea(),lK=(e,r)=>(r&&eY(lH,r=>e(r,()=>!1)),lV(e)),lG=new WeakSet,lH=document.getElementsByTagName(\"iframe\");function lY(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lQ=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),l0=e=>t5(e,r=>r!==e&&!!lQ(rt(tG,r)),e=>(N=rt(tG,e),(N=rt(tG,e))&&eB(eV(N.component,N.content,N),\"tags\"))),l1=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},l2=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tC(e,e=>{var s,i,l=rt(tG,e);l&&(lQ(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>null==(e=e.track)?void 0:e.region))&&tB(e)||void 0,s=l0(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),l1({...e,content:a.length?a:void 0,rect:n,...s},!!n)})),a=[]),i=l.area||t4(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,l1({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=rq(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:rq(l,\"/\")}:void 0},l4=Symbol(),l6=[{id:\"context\",setup(e){rk(()=>eY(lH,e=>ro(lG,e)&&lL(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==x||null==r||!r.value||null!=x&&x.definition?n=null==r?void 0:r.value:(x.definition=r.value,null!=(r=x.metadata)&&r.posted&&e.events.postPatch(x,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=ll({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=ll({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&li({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=ll({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=ll({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tD(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rB(location.href+\"\",!0),x={type:\"view\",timestamp:ry(),clientId:n2(),tab:n1,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tK(),duration:lJ(void 0,!0)},0===d&&(x.firstTab=er),0===d&&0===v&&(x.landingPage=er),li({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rV(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=x).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(x.navigationType=A)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{x.redirects=e.redirectCount,x.navigationType=r4(e.type,/\\_/g,\"-\")}),A=void 0,\"navigate\"===(null!=(r=x.navigationType)?r:x.navigationType=\"navigate\")&&(p=null==(l=ll(lM))?void 0:l.value)&&nw(document.referrer)&&(x.view=null==p?void 0:p[0],x.relatedEventId=null==p?void 0:p[1],e.variables.set({...lM,value:void 0})),(p=document.referrer||null)&&!nw(p)&&(x.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rB(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),x.definition=n,n=void 0,e.events.post(x),e.events.registerEventPatchSource(x,()=>({duration:lJ()})),lD(x))};return nR(e=>{e?(lq(er),++lP):lq(ee)}),tV(window,\"popstate\",()=>(A=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),A=\"navigate\",f()}}),f(),{processCommand:r=>l8(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!x||tf(e)||tr(e)||(e.view=x.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lk])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tA.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nQ),!1,!1,0,0,0,r6()];i[4]=r,i[5]=t,i[6]=n},y=[r6(),r6()],b=lW(!1),w=rb(!1,nQ),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],A=f?lT:lS,t=(A[0]*a<T||A[0]<(T/r.height||0))&&(A[0]*t<S||A[0]<(S/r.width||0));if(p!==t&&w(p=t,!0),f!==(f=p&&w()>=t3.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>((null==(e=e.track)?void 0:e.impressions)||t6(i,\"impressions\",er,e=>null==(e=e.track)?void 0:e.impressions))&&Y({type:\"impression\",pos:tW(i),viewport:tK(),timeOffset:lJ(),impressions:h,...l2(i,er)})||null))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;A=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=A?A:\"\"),u||r.height>=1.25*a){var C=tA.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,$=0;for(null==u&&(u=[]);$<d.length&&(M=C.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(_+=P;_>=(null==(F=d[$])?void 0:F.offset);)l[$%2?\"setEnd\":\"setStart\"](M,d[$].offset-_+P),$++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,$<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}var t=r.left<0?-r.left:0,A=r.top<0?-r.top:0,B=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(t,t+S)/B),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lk]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tG,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tG,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>ie(e)?(n(e),er):io(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=t$(l,e);){ro(n,l);var a,o=r2(t$(l,e),\"|\");t$(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tV(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tC(n.target,e=>{lO(e)&&null==a&&(a=e),s=s||\"NAV\"===tP(e);var r,v=tH(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lO(r)&&(3<(null!=u?u:u=[]).length?eM():u.push({...lj(r,!0),component:tC(r,(e,r,t,n=null==(l=tH(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t6(e,\"clicks\",er,e=>null==(e=e.track)?void 0:e.clicks))?r:v&&e7(v,e=>(null==(e=e.track)?void 0:e.clicks)!==ee)),null==i&&(i=null!=(r=t6(e,\"region\",er,e=>null==(e=e.track)?void 0:e.region))?r:v&&e7(v,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=l2(null!=a?a:o,!1,d),f=t5(null!=a?a:o,void 0,e=>eW(eb(null==(e=rt(tG,e))?void 0:e.tags))),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tW(a,n),viewport:tK()}:null,...((e,r)=>{var n;return tC(null!=e?e:r,e=>\"IMG\"===tP(e)||e===r?(n={element:lj(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lJ(),...f});if(a)if(lN(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rB(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:n2(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t$(h,\"target\")!==window.name?(lU(w.clientId),w.self=ee,e(w)):tD(location.href,h.href)||(w.exit=w.external,lU(w.clientId))):(k=h.href,(b=nw(k))?lU(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t3.captureContextMenu&&(h.href=nT+\"=\"+T+encodeURIComponent(k),tV(window,\"storage\",(r,t)=>\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())),tV(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tC(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tH(e))?void 0:t.cart)?t:t4(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tH(e))?void 0:t.content))&&r(v)});c=lY(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tJ(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lK(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tz(er);lz(()=>{return e=()=>(r={},t=tz(er)),setTimeout(e,250);var e}),tV(window,\"scroll\",()=>{var i,n=tz(),l={x:(f=tz(ee)).x/(tN.offsetWidth-window.innerWidth)||0,y:f.y/(tN.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l3(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lY(t))&&e({...t,type:\"cart_updated\"}),er):ia(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tM(e,tX(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rF(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tM(i,tX(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tM(i,tX(\"form-name\"))||t$(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lJ()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?ec:ed)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tV(i,\"submit\",()=>{l=l2(i),r[3]=3,s(()=>{(i.isConnected&&0<tB(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tB(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(i=null!=(v=(i=s[0].fields)[d=e.name])?v:i[d]={id:e.id||d,name:d,label:r4(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l4]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t6(e,\"ref\")||(e.value||(e.value=r4(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lq())),d=-(s-(s=ry(er))),c=l[l4],(l[l4]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tV(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lq()):o()));v(document),lK(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r3(t,r=r8(r))?[!1,t]:(t={level:r5.lookup(r.classification),purposes:r9.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tx.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{classification:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,r,s,v;return iv(e)?((r=e.consent.get)&&n(r),(t=r8(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(r=i[v])?r:i[v]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e,t,n;tA.hasFocus()&&(e=a.poll())&&(e=r8({...s,...e}))&&!r3(s,e)&&([t,n]=await l(e),t&&nx(n,\"Consent was updated from \"+v),s=e)}).trigger()),er):ee}}}}],rD=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l3=rD(\"cart\"),l8=rD(\"username\"),l9=rD(\"tagAttributes\"),l7=rD(\"disable\"),ie=rD(\"boundary\"),ir=rD(\"extension\"),it=rD(er,\"flush\"),il=rD(\"get\"),ii=rD(\"listener\"),ia=rD(\"order\"),io=rD(\"scan\"),iu=rD(\"set\"),is=e=>\"function\"==typeof e,iv=rD(\"consent\");Object.defineProperty(tx,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(l_)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
    ]) : clientConfig)})),true);s.src=${JSON.stringify(config.src + ((config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY ))};d.head.appendChild(s)})();`;
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
   */ async getClientCookies(tracker) {
        if (!tracker) return [];
        await tracker._persist(true);
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
            this.instanceId = this.environment.nextId("request-handler-id");
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
                        response.cookies = await this.getClientCookies(resolvedTracker);
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
                return html ? `<script src='${script.src}?${INIT_SCRIPT_QUERY}${"&" + BUILD_REVISION_QUERY }'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
        _define_property$b(this, "instanceId", void 0);
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
        var _this__variables_scope;
        return (_this__variables_scope = this._variables[scope]) !== null && _this__variables_scope !== void 0 ? _this__variables_scope : [];
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

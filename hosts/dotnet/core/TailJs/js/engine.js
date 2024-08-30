import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m0gr0ovk" ;
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
        text: "(()=>{var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,E,A,x,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return eA(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},H=e=>{var r=K(e);return(e,t)=>X(r,[e,t])},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>eA(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ed=e=>e===er,ec=e=>e!==ee,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:ex(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eE=e=>\"symbol\"==typeof e,eA=e=>\"function\"==typeof e,ex=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,e_=(e,r,t)=>e[0]===r&&e[e.length-1]===t,eC=e=>eh(e)&&(e_(e,\"{\",\"}\")||e_(e,\"[\",\"]\")),eM=!1,e$=e=>(eM=!0,e),eU=e=>null==e?Z:eA(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),eM){eM=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),eM){eM=!1;break}}}(e,eF(r,t,n)):eP(eA(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r)=>r&&!em(e)?[...e]:e,ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!eM;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return eM=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eJ=(e,r,t,n)=>null!=e?new Set([...ez(e,r,t,n)]):Z,eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eL=(e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,eM)){eM=!1;break}return l},eK=(e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,eM)){eM=!1;break}return t},eG=(e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,eM){eM=!1;break}return t},eH=(e,r,...t)=>null==e?Z:ex(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return eL(e,r,t,n);if(t===Z){if(e[ei])return eK(e,r);if(\"object\"==typeof e)return eG(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eZ=async(e,r,t,n)=>{var l,i;if(null==e)return Z;for(i of ez(e,r,t,n))if(null!=(i=await i)&&(l=i),eM){eM=!1;break}return l},eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e1=(e,r,t,n,l)=>{var a=()=>eA(t)?t():t;return null!=(e=eX(e,(e,n)=>t=null!=(e=r(t,e,n))?e:a(),n,l))?e:a()},e2=(e,r=e=>null!=e,t=em(e),n,l)=>eR(eP(e,(e,t)=>r(e,t)?e:Z,n,l),t),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):e1(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e5=(e,r,t)=>eW(e,eT(e)?e=>e[1]:e=>e,r,t),e8=(e,r,t,n)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?e$(e):Z,t,n)),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&e$(!0):()=>e$(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=eA(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,eA(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>eA(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}else ep(a)&&ep(void 0)&&(a=(t=a)-void 0);i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=eA(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=rx(!0).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rI,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rI{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rA=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rx=e=>new(e?rT:rI),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},r_=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},rM=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),r$=(e,r,t)=>null==e?Z:eA(r)?r_(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:r_(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rF=e=>(e=Math.log2(e))===(0|e),rq=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rF(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rF(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:eA(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+r_(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rP=(...e)=>{var r=(e=>!em(e)&&ex(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rR=Symbol(),rz=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&e8(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rD=(e,r=!0,t)=>null==e?Z:rL(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rW(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rW=(e,r,t=!0)=>rJ(e,\"&\",r,t),rJ=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rz(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rR]=o),e},rB=(e,r)=>r&&null!=e?r.test(e):Z,rV=(e,r,t)=>rL(e,r,t,!0),rL=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rL(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rK=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rG=/\\z./g,rH=(e,r)=>(r=r$(eJ(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rG,rX={},rY=e=>e instanceof RegExp,rZ=(t,n=[\",\",\" \"])=>{var l;return rY(t)?t:em(t)?rH(eW(t,e=>null==(e=rZ(e,n))?void 0:e.source)):eu(t)?t?/./g:rG:eh(t)?null!=(l=(e=rX)[r=t])?l:e[r]=rL(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rH(eW(rQ(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${r$(n,rK)}]`)),e=>e&&`^${r$(rQ(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rK(r0(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},rQ=(e,r)=>null!=(r=null==e?void 0:e.split(r))?r:e,r0=(e,r,t)=>null!=(r=null==e?void 0:e.replace(r,t))?r:e,r1=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r2=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rq(l,!1,\"data classification\")),r4=(e,r)=>{var t;return r2.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r2.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r5.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r5.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r6=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r2.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r5.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r5=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rq(i,!0,\"data purpose\",2111)),j=rq(i,!1,\"data purpose\",0),r8=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r7=((C=o={})[C.Global=0]=\"Global\",C[C.Entity=1]=\"Entity\",C[C.Session=2]=\"Session\",C[C.Device=3]=\"Device\",rq(o,!(C[C.User=4]=\"User\"),\"variable scope\")),o={scope:r7,purpose:j,purposes:r5,classification:r2},tt=(rP(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tn=((j=C={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rq(C,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(C=s=s||{})[C.Success=200]=\"Success\",C[C.Created=201]=\"Created\",C[C.Unchanged=304]=\"Unchanged\",C[C.Denied=403]=\"Denied\",C[C.NotFound=404]=\"NotFound\",C[C.ReadOnly=405]=\"ReadOnly\",C[C.Conflict=409]=\"Conflict\",C[C.Unsupported=501]=\"Unsupported\",C[C.Invalid=400]=\"Invalid\",C[C.Error=500]=\"Error\",rq(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=to)=>(e=>{var r={initialized:!0,then:H(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,ti)),values:e(e=>eW(e,e=>null==(e=ti(e))?void 0:e.value)),push:()=>(i=e=>(null!=t&&t(eW(tl(e))),e),o),value:e(e=>null==(e=ti(e[0]))?void 0:e.value),variable:e(e=>ti(e[0])),result:e(e=>e[0])};return o}),tl=e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z),ti=e=>{var r;return ta(e)?null!=(r=e.current)?r:e:Z},ta=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),to=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r7.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},ts=e=>e&&\"string\"==typeof e.type,tv=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),td=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tc=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tf=(e,r=\"\",t=new Map)=>{if(e)return ex(e)?eY(e,e=>tf(e,r,t)):eh(e)?rL(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?td(n)+\"::\":\"\")+r+td(l),value:td(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tc(t,l)}):tc(t,e),t},tp=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rq(c,!1,\"local variable scope\")),th=e=>{var r;return null!=(r=tp.tryParse(e))?r:r7(e)},tg=e=>{var r;return null!=(r=tp.format(e))?r:r7.format(e)},tm=e=>!!tp.tryParse(null==e?void 0:e.scope),ty=rP({scope:tp},o),tb=e=>null==e?void 0:eh(e)?e:e.source?tb(e.source):th(e.scope)+`\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\"),tw=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tS=()=>()=>W(\"Not initialized.\"),tT=window,tI=document,tE=tI.body,tA=(e,r)=>!(null==e||!e.matches(r)),tx=Q,tN=(e,r,t=(e,r)=>tx<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tI&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tO=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nk(e),et);case\"e\":return L(()=>null==nT?void 0:nT(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tO(e,r[0])):void 0}},tj=(e,r,t)=>tO(null==e?void 0:e.getAttribute(r),t),t_=(e,r,t)=>tN(e,(e,n)=>n(tj(e,r,t))),tC=(e,r)=>null==(e=tj(e,r))||null==(r=e.trim())?void 0:r.toLowerCase(),tM=e=>null==e?void 0:e.getAttributeNames(),t$=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tU=e=>null!=e?e.tagName:null,tq=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tP=(e,r)=>r0(e,/#.*$/,\"\")===r0(r,/#.*$/,\"\"),tR=(e,r,t=er)=>(p=tz(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tE.offsetWidth,4),y:ej(p.y/tE.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tz=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tD(e),{x:h,y:g}):void 0,tD=e=>e?(m=e.getBoundingClientRect(),f=tq(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tW=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tB=()=>({...f=tq(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tE.offsetWidth,totalHeight:tE.offsetHeight}),tV=new WeakMap,tL=e=>tV.get(e),tK=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tG=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY(tM(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>rB(a,r)&&(i=void 0,!t||tA(e,t))&&e$(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tf(l,r0(n,/\\-/g,\":\"),t),i)}),tH=()=>{},tX=(e,r)=>{if(w===(w=t4.tags))return tH(e,r);var t=e=>e?rY(e)?[[e]]:ex(e)?eB(e,t):[eT(e)?[rZ(e.match),e.selector,e.prefix]:[rZ(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(e5(w))]];(tH=(e,r)=>tG(e,n,r))(e,r)},tY=(e,r)=>r$(eV(t$(e,tK(r,er)),t$(e,tK(\"base-\"+r,er))),\" \"),tZ={},tQ=(e,r,t=tY(e,\"attributes\"))=>{var n;t&&tG(e,null!=(n=tZ[t])?n:tZ[t]=[{},rV(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rZ(t||n),,r])],r),tf(tY(e,\"tags\"),void 0,r)},t0=(e,r,t=ee,n)=>null!=(t=null!=(t=t?tN(e,(e,t)=>t(t0(e,r,ee)),eA(t)?t:void 0):r$(eV(tj(e,tK(r)),t$(e,tK(r,er))),\" \"))?t:n&&(k=tL(e))&&n(k))?t:null,t1=(e,r,t=ee,n)=>\"\"===(S=t0(e,r,t,n))||(null==S?S:es(S)),t2=(e,r,t,n)=>e&&(null==n&&(n=new Map),tQ(e,n),tN(e,e=>{tX(e,n),tf(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t4={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t6=[],t5=[],t3=(e,r=0)=>e.charCodeAt(r),t9=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t6[t5[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t5[(16515072&r)>>18],t5[(258048&r)>>12],t5[(4032&r)>>6],t5[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),t7=e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t6[t3(e,t++)]<<2|(r=t6[t3(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t6[t3(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t6[t3(e,t++)]);return i},ne={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nr=(e=256)=>e*Math.random()|0,nn={exports:{}},{deserialize:nl,serialize:ni}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nn.exports=n})(),(C=nn.exports)&&C.__esModule&&Object.prototype.hasOwnProperty.call(C,\"default\")?C.default:C),na=\"$ref\",no=(e,r,t)=>eE(e)?Z:t?r!==Z:null===r||r,nu=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=no(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||eA(e)||eE(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[na]||(e[na]=a,u(()=>delete e[na])),{[na]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!ex(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?ni(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},ns=e=>{var r,t,n=e=>ew(e)?e[na]&&(t=(null!=r?r:r=[])[e[na]])?t:(e[na]&&delete(r[e[na]]=e)[na],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>nl(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nv=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nu(e,!1,n))):nu(e,!0,n),t),i=e=>null==e?Z:L(()=>ns(e),Z);return r?[e=>nu(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nr()));for(t=0,i[n++]=g(d^16*nr(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nr();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=ne[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:t9)(a(nu(e,!0,n))),e=>null!=e?ns(o(e instanceof Uint8Array?e:(t&&eC(e)?i:t7)(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},j=(nv(),nv(null,{json:!0,decodeJson:!0}),nv(null,{json:!0,prettify:!0}),rQ(\"\"+tI.currentScript.src,\"#\")),rq=rQ(\"\"+(j[1]||\"\"),\";\"),nf=j[0],np=rq[1]||(null==(rP=rD(nf,!1))?void 0:rP.host),nh=e=>!(!np||(null==(e=rD(e,!1))||null==(e=e.host)?void 0:e.endsWith(np))!==er),o=(...e)=>r0(r$(e),/(^(?=\\?))|(^\\.(?=\\/))/,nf.split(\"?\")[0]),nm=o(\"?\",\"var\"),ny=o(\"?\",\"mnt\"),nb=(o(\"?\",\"usr\"),Symbol()),[nw,nk]=nv(),[nS,nT]=[tS,tS],nI=!0,[C,nA]=ea(),nO=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nj,n_]=ea(),[nC,nM]=ea(),n$=e=>nF!==(nF=e)&&n_(nF=!1,nR(!0,!0)),nU=e=>nq!==(nq=!!e&&\"visible\"===document.visibilityState)&&nM(nq,!e,nP(!0,!0)),nF=(nj(nU),!0),nq=!1,nP=rb(!1),nR=rb(!1),nz=(tW(window,[\"pagehide\",\"freeze\"],()=>n$(!1)),tW(window,[\"pageshow\",\"resume\"],()=>n$(!0)),tW(document,\"visibilitychange\",()=>(nU(!0),nq&&n$(!0))),n_(nF,nR(!0,!0)),!1),nD=rb(!1),[,nJ]=ea(),nB=rk({callback:()=>nz&&nJ(nz=!1,nD(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nz&&(nJ(nz=!0,nD(!0)),nB.restart()),nL=(tW(window,[\"focus\",\"scroll\"],j),tW(window,\"blur\",()=>nB.trigger()),tW(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nD()),nK=0,nG=void 0,nH=()=>(null!=nG?nG:tS())+\"_\"+nX(),nX=()=>(ry(!0)-(parseInt(nG.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nK).toString(36),nQ={},n0={id:nG,heartbeat:ry()},n1={knownTabs:{[nG]:n0},variables:{}},[n2,n4]=ea(),[n6,n5]=ea(),n3=tS,n8=e=>nQ[tb(e)],n9=(...e)=>le(e.map(e=>(e.cache=[ry(),3e3],ty(e)))),n7=e=>eW(e,e=>e&&[e,nQ[tb(e)]]),le=e=>{var r=eW(e,e=>e&&[tb(e),e]);null!=r&&r.length&&(e=n7(e),ri(nQ,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n1.variables,r),n3({type:\"patch\",payload:e0(r)})),n5(e,nQ,!0))},[,lt]=(C((e,r)=>{nj(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nG=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nQ=e0(eV(e2(nQ,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tb(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nG,eW(nQ,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n3=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nG,r,t])),localStorage.removeItem(\"_tail:state\"))},tW(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nG||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n3({type:\"set\",payload:n1},e):\"set\"===i&&t.active?(ri(n1,a),ri(nQ,a.variables),t.trigger()):\"patch\"===i?(o=n7(eW(a,1)),ri(n1.variables,a),ri(nQ,a),n5(o,nQ,!1)):\"tab\"===i&&(ri(n1.knownTabs,e,a),a)&&n4(\"tab\",a,!1))});var t=rk(()=>n4(\"ready\",n1,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n1?void 0:n1.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n1.knownTabs,[r])),n0.heartbeat=ry(),n3({type:\"tab\",payload:n0})},frequency:5e3,paused:!0});nj(e=>(e=>{n3({type:\"tab\",payload:e?n0:void 0}),e?(t.restart(),n3({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[ln,ll]=ea(),li=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nT:nk)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nS:nw)([nG,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===nG))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=rx(),[v]=tW(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rA(null!=o?o:r),d],await Promise.race(e.map(e=>eA(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),la=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nI;var l,i,a=!1,o=t=>{var o=eA(r)?null==r?void 0:r(l,t):r;return!1!==o&&(lt(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nS(l,!0):JSON.stringify(l))};if(!t)return li(()=>eZ(1,async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?e$(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rA(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nT:JSON.parse)?void 0:a(r):Z)&&ll(a),e$(a)):e$()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rq=[\"scope\",\"key\",\"targetId\",\"version\"],lu=[...rq,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],ls=[...rq,\"init\",\"purpose\",\"refresh\"],lv=[...lu,\"value\",\"force\",\"patch\"],ld=new Map,lc=(e,r)=>{var t=rk(async()=>{var e=eW(ld,([e,r])=>({...tw(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ld,e,()=>new Set).add(r)),o=(nj((e,r)=>t.toggle(e,e&&3e3<=r),!0),n6(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tb(e),null==(i=rv(ld,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await la(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tb(e),i=(n(l,e.result),n8(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tm(e))return[rc(e,ls),r];eT(e.init)&&null!=(t={...ty(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r5.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&le(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>tn(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tb(e),a=n8(n),u(n,e.cache),tm(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tp(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lv),r])}),a=c.length?V(null==(a=(await la(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&le(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>({...rc(e,lu),cache:[r,r+(null!=(r=rv(o,tb(e)))?r:3e3)]});return ln(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>ti(e)),eW(e.set,e=>ti(e)))))&&e.length&&le(eH(e,d,r))}),v},lf=Symbol(),lh=Symbol(),lg=[.75,.33],lm=[.25,.33],lw=()=>{var l,a,i,t=null==tT?void 0:tT.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tT.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tT.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lk=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lw()})),lS=(e,r=\"A\"===tU(e)&&tj(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lT=(e,r=tU(e),t=t1(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tC(e,\"type\"),\"button\",\"submit\")||t===er),lI=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rM((null==(t=tj(e,\"title\"))?void 0:t.trim())||(null==(t=tj(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tD(e):void 0}},lA=e=>{if(E)return E;eh(e)&&([t,e]=nk(e),e=nv(t,{decodeJson:!0})[1](e)),ri(t4,e),(e=>{nT===tS&&([nS,nT]=nv(e,{json:!e,prettify:!1}),nI=!!e,nA(nS,nT))})(rv(t4,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,m,l=rv(t4,\"key\"),i=null!=(e=null==(t=tT[t4.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:E,unsubscribe:()=>t=ee}),t},(e=>r=>nO(e,r))(n)))},s=[],d=lc(nm,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nH()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),la(e,{events:t=eW(t,e=>{if(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),e[lf]){if(!1===e[lf](e))return;delete e[lf]}return rn(r8(rp(e),!0),{timestamp:e.timestamp-ry()})}),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{var a=[];if(e=eW(eb(e),e=>{var t;return null!=(t=e.metadata)&&t.queued||rh(a,e),rn(r.applyEventExtensions(e),{metadata:{queued:!0}})}),eY(a,e=>{}),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nC((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nm,v),f=null,p=0,g=h=ee,m=!1,E=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=eC(t)?JSON.parse(t):nk(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nk(e):e),e=>{if(!e)return ee;if(l2(e))t4.tags=ri({},t4.tags,e.tagAttributes);else{if(l4(e))return t4.disabled=e.disable,ee;if(l3(e))return n=er,ee;if(it(e))return e(E),ee}return g||l9(e)||l5(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>l5(e)?-100:l9(e)?-50:ir(e)?-10:ts(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var y=f[p];y&&(v.validateKey(null!=r?r:y.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,ts(e))c.post(e);else if(l8(e))d.get(...eb(e.get));else if(ir(e))d.set(...eb(e.set));else if(l9(e))rh(o,e.listener);else if(l5(e))(r=L(()=>e.extension.setup(E),r=>nO(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(it(e))e(E);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nO(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nO(E,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else i.push(...e)},Object.defineProperty(tT,t4.name,{value:Object.freeze(Object.assign(E,{id:\"tracker_\"+nH(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),n6((e,r,t)=>{eV(null==(e=tt(eW(e,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee]),[[{[nb]:null==(e=tt(eW(r,1)))?void 0:e.map(e=>[e,`${e.key} (${tg(e.scope)}, ${e.scope<0?\"client-side memory only\":r5.format(e.purposes)})`,ee])},\"All variables\",er]])}),n2(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):to(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lk(E),e.hasUserAgent=!0),g=!0,s.length&&E(s),n(),m=!0,E(...eW(lZ,e=>({extension:e})),...i),E({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),E;W(`The global variable for the tracker \"${t4.name}\" is used for something else than an array of queued commands.`)},lx=()=>null==A?void 0:A.clientId,lN={scope:\"shared\",key:\"referrer\"},lO=(e,r)=>{E.variables.set({...lN,value:[lx(),e]}),r&&E.variables.get({scope:lN.scope,key:lN.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lj=rb(),l_=rb(),lC=1,[l$,lU]=ea(),lF=e=>{var r=rb(e,lj),t=rb(e,l_),n=rb(e,nL),l=rb(e,()=>lC);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lq=lF(),[lR,lz]=ea(),lD=(e,r)=>(r&&eY(lJ,r=>e(r,()=>!1)),lR(e)),lW=new WeakSet,lJ=document.getElementsByTagName(\"iframe\");function lV(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lK=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lG=e=>t2(e,r=>r!==e&&!!lK(rt(tV,r)),e=>(N=rt(tV,e),(N=rt(tV,e))&&eB(eV(N.component,N.content,N),\"tags\"))),lH=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},lX=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tN(e,e=>{var s,i,l=rt(tV,e);l&&(lK(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>null==(e=e.track)?void 0:e.region))&&tD(e)||void 0,s=lG(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),lH({...e,content:a.length?a:void 0,rect:n,...s},!!n)})),a=[]),i=l.area||t0(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,lH({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=r$(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:r$(l,\"/\")}:void 0},lY=Symbol(),lZ=[{id:\"context\",setup(e){rk(()=>eY(lJ,e=>ro(lW,e)&&lz(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){var i;return null==A||null==r||!r.value||null!=A&&A.definition?(n=null==r?void 0:r.value,null!=r&&null!=(i=r.value)&&i.navigation&&f(!0)):(A.definition=r.value,null!=(i=A.metadata)&&i.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n8({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n8({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n9({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n8({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n8({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tP(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rD(location.href+\"\",!0),A={type:\"view\",timestamp:ry(),clientId:nH(),tab:nG,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tB(),duration:lq(void 0,!0)},0===d&&(A.firstTab=er),0===d&&0===v&&(A.landingPage=er),n9({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rW(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=r0(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n8(lN))?void 0:l.value)&&nh(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lN,value:void 0})),(p=document.referrer||null)&&!nh(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rD(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lq()})),lU(A))};return nC(e=>{e?(l_(er),++lC):l_(ee)}),tW(window,\"popstate\",()=>(x=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>l1(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!A||tv(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lh])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tI.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nL),!1,!1,0,0,0,r1()];i[4]=r,i[5]=t,i[6]=n},y=[r1(),r1()],b=lF(!1),w=rb(!1,nL),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],x=f?lm:lg,t=(x[0]*a<T||x[0]<(T/r.height||0))&&(x[0]*t<S||x[0]<(S/r.width||0));if(p!==t&&w(p=t,!0),f!==(f=p&&w()>=t4.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>((null==(e=e.track)?void 0:e.impressions)||t1(i,\"impressions\",er,e=>null==(e=e.track)?void 0:e.impressions))&&Y({type:\"impression\",pos:tR(i),viewport:tB(),timeOffset:lq(),impressions:h,...lX(i,er)})||null))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;x=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=x?x:\"\"),u||r.height>=1.25*a){var _=tI.createTreeWalker(i,NodeFilter.SHOW_TEXT),C=0,M=0;for(null==u&&(u=[]);M<d.length&&($=_.nextNode());){var $,U,F,z,D,P=null!=(U=null==(U=$.textContent)?void 0:U.length)?U:0;for(C+=P;C>=(null==(F=d[M])?void 0:F.offset);)l[M%2?\"setEnd\":\"setStart\"]($,d[M].offset-C+P),M++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,M<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}var t=r.left<0?-r.left:0,x=r.top<0?-r.top:0,B=r.width*r.height;f&&(g=y[0].push(x,x+T)*y[1].push(t,t+S)/B),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lh]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tV,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tV,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>l6(e)?(n(e),er):ie(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=tj(l,e);){ro(n,l);var a,o=rQ(tj(l,e),\"|\");tj(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tW(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tN(n.target,e=>{lT(e)&&null==a&&(a=e),s=s||\"NAV\"===tU(e);var r,v=tL(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lT(r)&&(3<(null!=u?u:u=[]).length?e$():u.push({...lI(r,!0),component:tN(r,(e,r,t,n=null==(l=tL(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t1(e,\"clicks\",er,e=>null==(e=e.track)?void 0:e.clicks))?r:v&&e7(v,e=>(null==(e=e.track)?void 0:e.clicks)!==ee)),null==i&&(i=null!=(r=t1(e,\"region\",er,e=>null==(e=e.track)?void 0:e.region))?r:v&&e7(v,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lX(null!=a?a:o,!1,d),f=t2(null!=a?a:o,void 0,e=>eW(eb(null==(e=rt(tV,e))?void 0:e.tags))),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tR(a,n),viewport:tB()}:null,...((e,r)=>{var n;return tN(null!=e?e:r,e=>\"IMG\"===tU(e)||e===r?(n={element:lI(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lq(),...f});if(a)if(lS(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rD(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:nH(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tj(h,\"target\")!==window.name?(lO(w.clientId),w.self=ee,e(w)):tP(location.href,h.href)||(w.exit=w.external,lO(w.clientId))):(k=h.href,(b=nh(k))?lO(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t4.captureContextMenu&&(h.href=ny+\"=\"+T+encodeURIComponent(k),tW(window,\"storage\",(r,t)=>\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())),tW(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tN(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tL(e))?void 0:t.cart)?t:t0(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tL(e))?void 0:t.content))&&r(v)});c=lV(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tz(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lD(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tq(er);l$(()=>{return e=()=>(r={},t=tq(er)),setTimeout(e,250);var e}),tW(window,\"scroll\",()=>{var i,n=tq(),l={x:(f=tq(ee)).x/(tE.offsetWidth-window.innerWidth)||0,y:f.y/(tE.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l0(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lV(t))&&e({...t,type:\"cart_updated\"}),er):l7(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||t_(e,tK(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rM(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=t_(i,tK(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:t_(i,tK(\"form-name\"))||tj(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lq()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?ec:ed)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tW(i,\"submit\",()=>{l=lX(i),r[3]=3,s(()=>{(i.isConnected&&0<tD(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tD(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(i=null!=(v=(i=s[0].fields)[d=e.name])?v:i[d]={id:e.id||d,name:d,label:r0(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lY]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t1(e,\"ref\")||(e.value||(e.value=r0(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=l_())),d=-(s-(s=ry(er))),c=l[lY],(l[lY]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tW(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=l_()):o()));v(document),lD(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r4(t,r=r6(r))?[!1,t]:(t={level:r2.lookup(r.classification),purposes:r5.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tT.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{classification:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,s,r;return il(e)?((r=e.consent.get)&&n(r),(t=r6(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(r=a.key,(null!=(e=i[r])?e:i[r]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e;tI.hasFocus()&&(e=a.poll())&&(e=r6({...s,...e}))&&!r4(s,e)&&(await l(e),s=e)}).trigger()),er):ee}}}}],rP=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l0=rP(\"cart\"),l1=rP(\"username\"),l2=rP(\"tagAttributes\"),l4=rP(\"disable\"),l6=rP(\"boundary\"),l5=rP(\"extension\"),l3=rP(er,\"flush\"),l8=rP(\"get\"),l9=rP(\"listener\"),l7=rP(\"order\"),ie=rP(\"scan\"),ir=rP(\"set\"),it=e=>\"function\"==typeof e,il=rP(\"consent\");Object.defineProperty(tT,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lA)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9i3bbRrYgOp9Cot1MlVmiCOphCVQZx3Ycx3nYTqTEsSHEhsgiBRssMIWiZIVkr_mN-wP3w-ZL7tq7HgApyd1n1p0153Qsot7PXfu9CaH88fIqUy3BFNNMsoLlLGMVu2JjNmITNmeXbMpm7IZdsGv2mZ2yM_acPWFf2Cv2mr3lRDDFBX_8XKlSEUGhPX2pyuuWuCSCqwmkxZATiTX7AcszzXdCKJhPiOCcq9VKLoqCcwJ_2lzEIlKUKqEXSrb7Qyh2TQTtdMQ1UfCnVwg51ZdQ1_6kOIuCSd4fTkpFilYuW4JiF0mRtjlXSZF2Ou0f8JvBF9M7oe8mHHa7cm0-WpJz_vrikxjp3mdxUxFFbTdrV3rNnpq59Ho9TfljO4_-ibYlOx3dq8qZIIo_fgolKWW_YxXKH9fzfGvnrGIVBU9aSvy1yJUYt66yYiFaedWa5VWVy2nABH98djMXdqF7SsyLbCRI0Ov1AhZAUVe5F1BK2U9mb9p9pnFT1M3Szk4Quh5lenRJBPVpT4iisbiBPcMte4tbFokFpI9KWZWF6AnsXNlMGqn1JJdZUdwszSx0p6MJXa_Zj3AmcEtgt-GU6V4uc51nRf63GK9WMF-i7Pno6UshY8UV_iCCPyYbxXESPSWqsrgSY664oDT6ehE6tBPTa_Z9PRj-IxEuiwhcmT-IYolgOqVr9gfPqhs5urVwUFeygmfXWa5bOGjXvpjBArnzy1XST2l8VebjVj-SvVFWFESxgkZFveT5hLRxXc3xnLlfKglTexxb8Bt6sXdpDSPITf_EdKZcL7hfcEnyVi4rncmRKCctPCfUVM_dYPM1dGNTxXBzWwX1u9nsR7t-NKGwte9gNQV7z00y-4W_WswuhOr9_OSPD6dPvnv-4eWrs-cvnv_KhODtkAlcSmFOwXLNhDQNiAL-2pvARM5Pb2YXZdHLtVCZLhUTmbsuRDPJ2324ZkTT1Up1OrLT8UfO_CCaK6IpjXX0nonS1bUHu835ewOG3kd2YsJNTCQqpVhAQNUFjCu4KMtCZDLgXN_MYUEFExUXGRELuIr9NhedDgk5F6tVMMmKSgRtjmmBVgsRcMx5DzdRXEGL7bZgYoxzhzzFxAg_oJZgYuKWMa9Os4l4KbWYQqE5jkZi3sZgLjGj0gqgQzNjiqO8ZHZ1mxPt6fIUKxAY1ow_USq76eUV_mXiBgd06xQxcWFhSUjrNt9HbdXpiBkRNBaR-AJ_k16vJ9IoESkT1_X2wrIEJcLTjZF-dkB2rkpdQjoTpy5tKvQbl_x6wsRZ47h0OuKUCArr-JmJl26vg8lCjnRe1rt251Yz8dysHR64jRE9wYxbzUDWl8YatF27q1VbJCJPVys3v7av0um0FWXi1a1F_TmbM_H6VvKp0Ex8aj4RdplDeFtiEf2c6cueKhdyTMRDojh-z8trEvaZ6nTafXjlYhX1KaW7iokP9rWFW5D0U2il0xGJez13QkjSTDzDoVziC0vEByJYsAxYsA7oamU-k4AFaQBn5me80g-gBoGPPhOUid-4aI5YPDGHQvHHCs_Cd_VIGu-dNpeOCC5-I4IyC9c6HaJ4333qTodo_gtlRLKC8sdqZyd-H-mdnVjEAtMiGWkaCSb-4ncd-UleaKGIKCgTb-w4mGyscJI2T_Jf-LTBnsbuGDzELQEIbY8fRSi6VDBuRYcAm7XFO2QLtp76svAkEMl0t0thdW9yUYxbEhaSLnExhxdKZJ_Xa1FUogUt4FtjWjFNyEa9NTxaHGFZJL4jZio0QvRoe7zN4UlWD9AgRogu8UQykcg0HdYDLmBvSIFDjop60MUdg4bhNIfxhpit3xgJ0_e9EHSJIzIHwnek6FDv7HiwrriAB3JIbS4uAZM0anTC-3aDxEmfujbdUdoROyEdim7XN7GzM_TLvXnohmJnxxfrdrEvyuAa_-ouJtw0c1YstBNM_N08V7AK9oOJbx3GG8ITFgJ-TfljP3RBLNrdOF4Kj5eBKtLivNSdjBxORhGLN0TRSNGwDQ80jvehIDlgtEyydp9GZg65mWi9dGZsMAqmu1g2pEy8bY4fURFzdhhO1B2WPst5kuIp0lyf9GMHSbo6so9xrKM-k1w2M6XNlLGMXOJQn0hYx5-HcMyw_YyLRKdDt-txxhXJWAGnMKOdTt6bL6pLklGHoxtQlHuU3aHUF0T87WdDo_drJn7YvvZQUIprALkEd7GukVLAAZ7euW3Q9rekQSoBRPydE2jBEVLKI4bvADvgbsYxgGA4K41HrAELFU9SaqYIrV3AslOm1kz8tLE3hsrJWWav8_8fG4F7UEO3RKedDim43YkcCIJEpywDGBbnUQFwYBMQ2CkXayZ-dPcEhwrrlLPCDjbfAo45wvYGoMxxv2ksI31vJ3rNxIuvdoIALp9sNp3kTCR5mm72cF8H328Qd42XDdEc8ZbgRioiTBEa-Z9M_HF7w4aNt8Pi_MJRni3xky8_xFFz_t4SriL3BIH4EacMJW6jUr7QCyy03oAWDXhE63UveO5pmGK9ZuIdF38w8b6mgLaOnJsD5767941dbdy5-i2xFEsrp7bH-9YcTs4vDvObqHL2XGqVi4qJfo06ODKMeXqmsTFAT61WOiY5ByLjHUDumIjGlTekLQzQvy0iCVOuSZ7A5UwZfOIzbRM4JkSAHUF7Khbbl9wdsG0sM0yhGeKfMCJ5TpOCY7M0VpFMirS-8liB5XQdefBwX5vNoQEAgmqR-IXgmVSxJWpFSZR5u0Iz_pIIFlJK10yEvAZhblUzpM7EE6JprAmN9NYEBRd_EMHsevqLBSuqGa5pLKKMUGzT_l4zMfD8IUfnaY5n3_YtfjUvkh21GTJSYZAPwxf799-mjZOIKJngYoDF26G5T_D6LZu4TY1UOMYRYFK9Kv-7vpDYQXvj9jWZQWKLGYQvo6dBzTpR_rjbLZAY7a-ZOOQGPGwi9mIOwASx-Fn2xZWIRGhXBBaBAyMgRm4AIj0NcLRaiTkBBE2cFHERCfaeqWQArK09oHEOGtg_wqszBF1AC4QpngnMZeLoLqT4fVTjAH_UO9RWq5W9R0BqiwdIUZtrz8SjO_bq9k09Q0KjreL-yZ3LGm1vlvnB4YdAnppnsBSGwSJY_ZCKK0phNf5oXod224y40xEPCGBHeNrxpxl7p1OsmRL-uIqaUgFis1eVSpP6lNIdZDUA7aNUg7YRPWCpaLUY6VJ5HuJqZfBFM2igueKxKIQWLSBHkSblOmrkip7J9z8A2duo0qsEFKuEBgSSRqKXjccxJGXjMZRu1jQdICKrt6EpMlf983Hn8A20xHFB38QPlEgugEyP8V_T62VWxfiv65jeZtRI3gA0tNNRCgclKZN0zZRsXBYi3hHFFAJgxUiigE_HH9fsRgLHyXQjzqBR4OslKsVFwXnTtdkokSHR2gB8CDI24JyMa4Q8gr410_yxmEHDmJP0U6bNowCZJNFMpsiXsm8fEAtrpnLgwShFmcrgl190O1U3f6UNZziCw6RqntUWW2C12kh5K7LPp0LHbbfQsAx24xH3t80COyA34LBPmVpsIk0Nku8OtntLc9sKEy-BBWCOU0DvO5NMr5m68l1sHCtkkRqkp9MJTzxKrPy9QsJqBzjKtDfL5sA0V1d2bczlUXU10avmRT6CNQ8pYNWOEbow2A9To8YRgqGYAu3Gg3Eb1SCqNyky_XM2J7Dn17jnuPPaDclMJGyIHeIEGL5M4J80jdSI2N_YPZ6UREF-mtLIdipch2au_lQnsFHcXzTTFpxkaCTRDLDwNKWeo-FfVURb1kxNEHQZ5gsBloiaG4iG4ha7jrHAXgF9nUMmyEAiR8qe2SJ9APmGK84fJ9AQ0Vg0pdESyq4j8RrKOipK1Uhx3SpwUl65UrCwdSnEYqBZxGNsywLHfHnHY-m5OY5Cgqs1_VrBhawu84l2ZWdbFINFaOszeoZn1CCPZ5YV9s6uQpbac5ShHEmkBj0_I5pnhnXfJhlXM5IxzHWXaJhkTKc8M8wdMSdAyIq5PY7QRcaxjR2bMswTkfKM2RsJz3rB1RwYAJCh12vKChonOSvcqadRIphI10zd8GAhx2KSSzGu2ZBzoSalmgHoQE4bwheDdGi1kCOibogAeUqjYE_nM_Fa5dNcdpvJsrwmNPo20_iTKWALAwtQIfaobghtkGS8Kx4qQpEuswKXnAuWIT-fi7jo8h3ZRdqM0qhgGZIIfcqI4EgvmBym4WR_Nue478WV3Bzz5QSEXkKObiLFABe4yEafIzidbPnXQixEVMAA59miEuMoB1Jeq3w6FSrK4KOUIxGV8MtXXjhBhcomUbXmgl0Bvlgjwj3fJ6CqfdanbMzVF0AmnACKUDbi6oK0c8omfEQomxu6qiXMQWpfrVbtotMZ9-ZCjnM5texbUYsj8wkhN72LRXUDog_MA2pr6KsMqSGuxp7jsFqNYQRCE8oIso1NiT8ITGlBYCA7ky7BIVEKWDJktAUMxA8dBCwnvL9albTTmRFgELX9SEK6Zpe4Qle8Evosn4lyobH9KsZ1qfQTmc8yYG99p7KZIFMaTQll6qQf76hIUTY1K3zTy0Y6vxKdzpxQVn9dAukws9x2RMRG5iEaFSJTrserugpvt8kVF_EloVGfshvKbvjSZEXtkMHA4a8Slc6Ujiwa5_cU3z224DXnZMFmpN2HV5MyXU6nhYjcy9zm3HUbi1jFZIZI5E3PHiuYCY0wMcK1i27qE-dOgNmVuYEyM-IaxMd77Xbzpme6Ju2cZXQ9dDzDljq16MRSIasjts-KufpvVDkXSt9gmSWKkYHVIRczobKLQkTtPhuVcpJPF_77WuXa_l47tGk9KrKqaqmz5VRoI44mXlqsL_Oq92GuylleiR5mrqGYESTeUwwzsZg9wPcVtNlrdyKt2OXuwo1ClEHWWglYjn9Xy5XxlfDa3Fmaw_OlXpqCVT6VWdGQnGNRPwrTnL-FWMUItZElf9dYfPa6gX3DUE4JFGSBKxkwC_I3-li7nXq5_N_sCAHq8Cvd-Sw7zTtzkCV1OwMPxx3peBruSLebHyDOensb3pjfhDjsTnBlsKhaVGwfa6xsm6PNBbFp-Bhc5lWiYjuayI425ciEW600A4EzlkJ0udmMFc3XOhmBHVsrK5TIxjctp42waxYHFTPWdE1Z0jwzbjOhSMrFGkX96smWHHC1yqvvQN8BzljcBuL_hPdjBSRM1FwYzR834LJh5gHLhnjdBYX0EI3eko8v5VVW5OPWWBTZTevBUqx7HylTX5BjA0KlWJ1F6iVl6vU24Yhcce62QeAPkCrkCNxlG8nDdggQTpMCQRvLNvIQAVI2z0E94CElOcvSNcr_G-pJ3KKatmRCmmwGrl4DI4o_VkgHAbkHvy2lAvoRjs7rdAQoqQAOywpQ1mDFmhHL6CWCa6Z6k1I9z0BXw05MU0oBwzICVZ4EmRwHLGCtIK3JKfcII30AeMJbVG3Z4P4j_ZCIXoXkS5_thLT3qcwlqVUYAJePdQSNUxa0AoYEBvzYkNympl4QANHdaAL1iKAuCD7Uz56iRBLR1H4MJEBjBN3gf_3P_zeIgJfxoN7lDWmuorH6gCzGSxR8odRLUVY_mTiQSyv2NUVhCxAJwUZog0cTBJSp74wM2Uixi3I6QO0xzkl_BUP5626xByuZuINPTLZIK-GpJMDfFZLoRsAtEJu2hJfNSkAx4qfyWqhnWQXIm0opZRW_1Si7cmkIKDBpXLOpRC-TN8B9uuopMV6MhINKYqUATRxxFSP1xDJ5E42ZLKWI-oCsTv6DOY22R60Y0BoMabwGR8cdxAlCCtXp6NiMcJKIFJir0V2aJmbr3ttN9Jwa_2MEhE0so9H2YmHqnMwzVUFb-ATi6bsEEJFM2SzlKk7sSmxonGCfjaWqz51erS5jEVm-n-ZIflIak0tA59_TqMGz6NOVZgR7ew90DIxgA3gSwadEgKSTxu8jhWTXJBGdcYoU34yIzr-I6IwpFvGUfQa0ZZ5GWUQEr-rzZFYfNAY6qtNR3zXPEx40CpIC18wdMsAogI2HG5dGybyWCBLB56h7BxsVvU_ZzW1lkMaMSo78kfgtqd-gH05fv-oZnaB8ckNK2v0ImoGy1K2sZWD9g6VeG3yu9xFodHaxMTmcQluuVkR2jIYNzrEGoWSDkOZEbXHm1ZZWG1DWAGfd24kvvnIsnJA2oS1iZFh4WHBlyOYCIKmiw8IX9AyTryC-myhuuIUA1whvCJss4R9kH4L61lToIJctvVpZdAA-ACYj167TaTsVzxhQ40ivI4dmr9egIecuoNqaGTy7awofcPBZknx1kOGaLfFOIQFx8wZ_TpkFBlHFDASKrlhRlp8X82jGLPu8ssNjSLdrYPXP4Pj3KSvK6XcmER-yoFQBqE1l8iYwj5YtSGNIawVdHX3Ul8KcmY9dC9gv7PtKNpR-gm-CrugG3wQUpwo82TWoJS3nCyWiCzbL5o6KIoLjElzcvlTCXKX6rXBHUlC6TrHJN1sCdxj347blLjYFtK-cwMPyqpDtxNr91I3DQFCrPXML2EfvKUFGmKEDzXN1bVlDRlmoPpLmFoAuDQdOOI3U7ePq1UjfD2tOuOFdo6qArsEEUGBJP-3hCSAg96mby5GHAtwD__Bkjdo7YZzX9fKeOzwExRzIUuQFSAIRDWyoyapfrQomPIB_O1RnFbBgCMhOkDJtlDA3JTsiJk3xzLzINQl4QB2XEYQdo3Isfvv15bNyNi-lgEcC6OUZodTpMT8pChJ0QZEZMRqbS5MQdRFATAtIQ5EMUl6YxG0tWCfP63TEEcgKjP4GFLaDQuX00Ctog54oXa2w8TiBf9MoAXTQoE7fbqhP18dcgbR-908SR_C_5Py629tJuzSiMTnfPd-lMY0J5vwZ_VfapSSOzuHjv9KHlMb_RWNISEjy53madul5uiJJf-c4Srur5M_dbtqNKRaJyPkYKmCryZ__iNOHpmpMkj__gW2ROPoH6cGvB7tTLy-0ONLCqfAbEmlZlQs1EpFg1ehSzIAjsFAy0nFbRm3Z6bxn2UJflirXN1HBFpVQUc7mWVVdl2ocZeyyrJxmSRmX0YLNS-USqtg__RXIAueZvoyu2F8LoW6c7uI4Um_JGDDGicqmMyF1NPJwUvSgCjd_QLzY84OJRW-hZBwEUbAbRO8RgDLltJXMaVQ_gHiiExhppqp1fRqHNWMlT1ImeAOr7dc6nP5RBdY4KGnvkjj6s_cwPo9Xf1K74rvAGKtLIp7uuc3mhCmDeLAEtmGROuQp4-pvxD-Qtw_qhobL_z5CkVGcRUnKKoCL1bbIs6glnU7hf_c8OU8f7LIgoDRuGwWwpGDhycId7EWUpxGMIY3es9KwzCvKKo8WCVdP_I4pERGxgMsHmHkXeHR-bwzE-DXlJSw-U08banAOBVM9LSptJMHq95qEUE6xBcVPVo-pYHlTj3hD9hS_j4qYaP6e5TGRsGO2CQfwPZlUmBQQLpr5AYkW1VYRdZW6rJGTmg0GkcCPd6qL-mVOzv98cH7ee9iNCU3O0-V6le5OWXB-_qAD5MsLvnv-d293ytT3Xk1dcfWAiB8IKiHc1bgFUZQFK9i9X8X0-Zc5USyYLgIaqRdM_QECCPXulnKwKcrUe47K8AlC5Ab96cGxekcMsoKiK_U9vNi6HgwI798bLZjG6UXoAAu4wMrxbm93GqkXQAxoTwwUWPkPmiiuU5Sxw1OifiKAKQUGJp7vkl43pue78Qph04Pd6YLVB-LWjHF46heimc35SOKTNvx3fn5-TvGf5MFSPSCSqR_pOv1IEfUQnc7HPzFd_UKEqxzcrnx-_jAwVdSPRMFrvnt-TnoUtvJBCFlB72FA1w8-UqMsqH7ZNNKxbOKNbXS3HXVHmOpvUs1316lPpnb1QBHHE-g7ymoeJGG6A3RCjWInqd_cnGi2xAOPOqNezwsUeYsUGCzCGkrEunedj_Ul11sEluiC7gLrA06BJVjJ-8PSv4vD0mlk4iPCdVKierAgOYjqrmBoJ33q-TXaofIl64NCkivbh7JhSk9439ABLg3rdzpkweE3z5EJ0z_x7Rs9J8gNIRc0o9rE4RgVjKfbgL0Vtoe16jGZbVjQ4YLnvB7gzo4RGK_XviSqICZu7inPQZCKyxL114BtDjghn3jBi9VquabJp94TWcqbWbmoeD_lgf8K2KfkU--lHOdKjDQHhMV9mKxvTcYg5cG3jeRTIascpRh7KQ_8V8DUX6QACU0wznTWQh5vPslHKFiBc6v2t-T57owMHPbngOWts7jZGECLOyDVlSiA_LuvuQbidV9zG7gZNNfpqIN_O7j5Qs3LSlR3DstnwsgO_u3Ibrd1V-aaqcO713K7_zm5tXjIUWqOWhgBOcMpWyEts9nuc7ON6O413vxx1665bbprdrdL96kbRhVtr524s8fm8vmvr69lLKK890qMRFVl6gbsxdQB3qCc5-4GvSqlwMsDP8wt8DXw4vgvk_mdlXxlRa5v8AJtpJhCb2o5Nd9PedD4NgXOMjUVGvj-RykP_Je7haMFIJw8PMRbaL7cnZ6ozIhLFkrwvQFe7WaaKfdE3nyogcP-MUKHRpIvxQ_3TJ7rW10JxQf9_SPsG76aOR_eqlwLvt8_PvT5Jg2BRM7afQsk7C4EbBCGIaXsEzf54XY-4GNHHm0B5YVbN20mdAaVjLkdsZo-WW9eVlqMmf9GKfuYbVHPmWOj0dXKKQn5JlFt7hEn5BkvORyJZ70XRXmRFXgozM-APUue9Z5LjZuS8sD8NMmnoqryUuJRsL9NxrfiKh8ZSGp-4gqVrE0g97dKKDwb8AO461eZyoHb0qpG5VwAUC35En9H6pG_s5-a1-b21V0zDVywN6Sk7Ov2RxvaTqKHHaEuEf6KBehB9opylBUCKOVMCaIgjQVCIlWM5XZseUBoJV6tZ9y-TOOxeZPGY3N-fs4lrt3PubQJ2RdctJ-zL_ZsT34GfBhXzP7GJXvG2sTkwx01ZfaxjP_eWMA5pLRA5SSgjDzjFa_MbX_WO12M4DbzQR_GZr_Mdj1TItNizAd9GKX9Mlm_ydFlJqdizPf6uGXu2220zMWY7_fNVsOHyXhV6u_AQo7vYzX3aTJ_Fdn4tSxu-H7_IOWB-7SDKeWkyEcaLhqMxn664VSLORC9YswPcLSNFFPEytL4Ps7TftljDLxZfoAZz43cU_1FKryY9RkUulXpTC-qgLJbOu8cxBK5tZxFhj_XpWGlOTbYsmEODUxOEPdG36NqBlHbttLG8LrWNlBrWgsLQVudOIlhAUxmeOaAgQQXBNsVKBwzltssKwqbgLg5ZXavbKKlhkTPTO9krw8MNTfxypYClp3OMQMZm3Vqk3jROXLI_e3CwiAEWVSXqNVLcJFIwx4dCKDC2NMIykrbgWl_o11kPG837cdpKvhyoE6yKLQdJiT5tSzXlOniTurS8sTIbZICl4ae7Pf7IIahTOf8lrWBzhqyGVBhHy2UElIjPQHEi84aRqoqvr-bvX4_-uogVqv9_j7n_N5CTJd3WWYA0Z5xzyUmRuEL86sNpoI7DNhXW3c6pj-XHovIEJyPP37zYImgcf0NqLs8WKpHPcPZJhYi0rUB4B-pQ2cq7onauIoE7QatUbkAC8pSty5EK-iSre6CCYCJXhB9hN5M3dXqoI9KWb5QJXQQBSDdD9atCzECtbLWR2jsuNnYx3LSylojC0F6rbNL0RJf5qgD0LoSCh6s1jcPlp6mqUfrqJqeLbb-pjXOzbhnBsZeipbd9nua8ofidlu9j9F-f6851MaCoQ4ErFcAfYAwBZ-41nVWtcYIYntBtN_v_0fVjf-KcSmM8AnWolSzli5xAsiFzKC1g41NAFMh8GORjVulLG56QXSw2V8AKytbC-mXE7uNWkHXjiDyRT7L8lpCY1UpwSUG2xBqNtHXJAOSE_lzoCBT0NXKmhsWFGSKa88Pyx2P7S3JrQT-HKgxq6ScWcw4c01nQG0yXXHDs7htrt9Dq3d9hUddecjQQK2hADU2CDMDbOpruV2MUpIEV7m4DlLK9Nj2uvsn-WfyZOe7_s5xuhysV8mf_0zpwwe709wx7jqd3UaBRsadvHsQGurRPdRnp0PaZGwMA8gVuPTIpt2GfoMFq0ZlAFiqdd4YrrPCvJCeNOs00s1SQNuo6q0nBuIFAdPcqhnf0j83MqF35inREwu2nMKC4egbnv15Ff0LuPkRidtJK-LwIGDyv4A1Dwyu6mES8fS8ekjiKABOf5D8GaQPVz36EAsEqwd09Q1kfJP8-c2_GjnfQA5ktB4a6UHyJ-sM_wFtU0ofUnpeGSZ_6-G_Wg9BAAD99UAQYKUCyXkFNf6VdlcPqGH6N1j-MO2CL3U2jYiM9ZhI2g2iyDJ1u3oMp9lKKsdkS8Kfx3mUgSS_pOvhotMJAfAhifhdUWaaLNCCz2zEZvpuCIpaI6JZQdc0wl-gA7Bmeo7o6YiPHOX3ey6u-Q7gbPDL0WUXfGeAJNmFJXsuMyXGHPwTBOY34ksjxJcQP27dxtz1Jb_POk9xPa_FYOiPKFKPwN8J09Ov13IPja1Tf6-ZnhmvHs22bz-W-D4xfcPVG2JJCz1fAxaiL-7CEKwKjXsQYn1B_OMQ6Uv_5HU__g_3LP6Pj13S0E7WSNm-HEMzIDPT6IhjKWrh3Hk_cADNDqmL2vifxQ2aGTLXRCSSQbpeM32Kmljw31sCOHWrgU32oI8zfp3LcXnN9Es-LkcLEPEw_Zzrl72LcnzDtNdn23CdYbjxaApBmf7Cf2H6lRPu2PL6ywlHMON9I_A-oMNiGN6JnshyLM4MyGyDOoHsdoHvZEzY1IZZF-qjF1zBE-_FGWCjCppNOyHqXIMXj2Jo-KE5K7kYmh7NWgONJvXzQsB8qRdKlm44Za-8lkJ9a1cEWtQvAfuxT1DpJUol3yoLWg3ZotBwUWjd3gRUql2Ha-_Wh-nXFg7-HVjw56cZwC_vnAZ_rFbBBUj8FaXVdW4EIstRVol2P4I_wd9BdAcjjGhOgqALaL-Rz3rXQJsqQUNsKjRNqcD8vQgi01hgfeOgkB2LBtLltRqgxWV-8pk_ITGDOi5ze5eZ0LbY5VYx-XkjW2xn44zkmffVdOaK24WPmtZLnY5ZuNjO394kVou5zazswvh1ee0VWizrD27Tpxpx1q9vn-Cp0E-0VvnFAo2sQKqpG65c9KvaEFcS_cm9ZpTpZ3xb78lkNySXyo-RNnCHDeU3_fOdpEtzWK-ymaig6APX41RowBAWWoxP9U0BW2M9-KBSzu-oP67sOJj-rWETHAPMmkKTkclEPy5k-SUSn0g1UmVR_AEvyk39_Y4J0KPVb7w0EiU7_-g9NIJRONp9ohopTP_qAAuawJA513-btel03pHll_mXaN77wm7w7w3Dzue9L7v6ea-cTCqh36KsZN-OY967qbO-F_n0UkPePJuK78piXEU6hiIGKvZyKYUypdw5oEz_vSlpAmWy3rzMpRYKIFhtL3mL25pNxTsaL7_Y33-wG5e6jkQMS3fJbqLpmutv4VT7b3cKmf4WccOYzAym9hSon1xOnxW5kPpX0I0HyxX9F9gGMbMVs14hJro76X2xazDr6XLenfRuqJWYYBr-pOzSzBaTzG_a6L52OMKXo2wOTNQI7XSqCq02-msjTxUXKKp9bQ0xnTEoKPk-vxJS_5RXWkihnPnlZiklZuWVuLMgFH1qXjVg15upKjeR5raZfbfTub2fTJc6K7BQtHVWMMfu-tZZge3_HfFVMOYEh1D6J9gR_TvizYAy_GiNkdECRsXBzo5W2ejzThAF9gftCqZf8A2HJHdQEEagBvaqP0PDmcV3yi18p-TkxrivSy54ltK4jG6SixScOAjB2uIStJXeoZM6Y4jLZGo8Mj0Fuzf0TeB8wrX1aqWfGCNxtLmuHY9kBukv-Bagy6BkW1QEqC89IQVTfSLZ7vkOiGqjAOFgjrf-e2ehpf9o2ptew6t8zfU-gJOqNmT93jjOMLJUPPXqHWoxJyJNnUePpzjYKDEWkAnIyA1yQhmQG4UYoUu63lyJSf4ljbAERZUhEMcv1yxJUAKOe3O-Q2MYBCDtD1bnOxSE4btoE6qJOCDXlKbpkGivOqBfIC6vKLUmrPqdB20PiPid6AcwwB-JAuwEAK_5DC6ySuwEXZOMCuOU6fegRKB_cQBPA-UTZG6pq4DWysLAIXvhDeiJ5Pp9olGlF3_gzNTvRBsC6fy0S88jR6ecE5NAV0gisSjtIhFD4vb56cPzyJIoTokblkyvVpIyUPZL0fRmQszgYLECaq1BzAL0PbzecOLREFDp2L2F-C4S3TfG1ahpaSysvZGkXcVPdhUbS9hcOpRtdTrkM9c_EaNeQj5TJ_FiOtwaEz765JTbnhGyWIqW89P4NBIVOYW-BhsOojyiKNHM0ZGtTP-C7zrDaQHSrv-wCZPbzhiFXy60mqdMGi8WMVCAFVr0SqemTtN1BEdiny8lvLOBzvIiYJUaRcHuB937VAVsnFdAUY1BERWEPAg2K4TKZaW_83aWA7HHrKGftTKJDsQeE3KkbubAMPpR3Jjl-ux-ZPPcJ36qSgld5LO5MqKbs0slqsuyGEeh2GP2NXhWSi2-6J-FXCAvG6a0dJhZguKsHWCvm18wqQAplUNgQOoD_HevNhoVvdFlpp6VY_EE1bT0MUfHT8GTp8--ff7di-9f_vDjTz-_ev3ml19Pz377_e0f795nF6OxmEwv80-fi5ks53-pSi-urr_c_N0PB3v7B4ePjo53PgRprZhpr_Jhog9AM2ajzz5NuUIBkSdk4ByBjyanFsQK0PQAf0xUgRembjc9OQkPV-7nkf3FCqvydJCQ8PAgPOg_GnQUffw4PIKpJ2RwcNTfPzJJA5O0398zZQ7x-3Cvo9La_Y9zEMXljgbz28fGSSQaIzyzc7BKVKRAEPyI3zUTJMzcbHI817_lUh8ZZf-9h6TY3V_1aZcU3b3OHv3nHh3qk2JI80R2uymHlduDS9nt0vTkZLACGryZRh8_3mf6pEA3OFiFhAcdRU9O9u8qO4CytFF4D8serjYL1s5RmRR8uTeIkkF4eBjuHQ4OQ8nCw0ePHh2GxzJlh_tR0v8yupgMjkdi_2h_MBjsDQ4kC_vHxwdheDg4GoShTFk4OIKCh6PDweDRQPQfXVz0w_3B4eDiaBA-OjgcHB-MDo7GkvW_hP3b_xfuXch0zSRqNg8ODuH8PjTOHzM5LmeErvpMSr4UX0AAVUXL9Zotx6ISytDkkSxY4yNfc4I0z7K2IfUuDRHrnC0Knc8LIHa3DTSss1hr4uYMxjI1RSoVRX5R67njxmayhRWB0etH0HLNG65w1Qvsa4wObrZOSTg4AkEXen3eGJt3gQeuzzLvDWIIbslKIoCHa5zdlQ3vvEWvWlxk2DAoJ9VGtCXyefERHLFsaKlg708LieGGOX1UkfB4QI3TKkNQOgexUUVEHB4fROHx_kYB67M1qkV0w4YNX6dznxVO_wR9zpzwcPAIzPz6nc7O3uCEixi10vsnJndwcBBfkWTQ30cl9p1wcNSoaLKOMMvVODw42LN1Dph4_Pixyd7ZGzw69HXhw9Y-bhRybewPjvePDx8Njm1Dh1hmsI9_wsNms4Nw_9H-0d7hvm_bp5gOwv69lV13d1wQUzVkQB3s-uEcUtOSMi0pbElhoX_-m0Iw1v6Xo61u3Jhv58SkIoMwpAzsDGl0BU4nYxxSODhi_eb_p1Ey6D9ig4ODr_2X0ogAGrBawV34NtMZMH2I4WfjrXi6mEyEIkeUUuB9I3_kcJ-g89WKDPp7lF2RrYukUccf7kLjTFr5Q0RGoJZMNoA46rrX8Bs8qcsTPZTGOWA4eHSy8aJJCi5GvSM314xxE7k1FtfoQ6LiMNqnFP0XgjcNjffXECSbL2aGmoTlCQCEPCkAgJfen1d5AuoyPv3x48NVeDzw2QcHg-ODk7LTKU8ODvcGRgGx280ec70Jz347-27nqCUkCDmiVi5H5WyO2irVQqlymmlQbciVBViLu0a4MF2sVgeP9vb3ThZf66ASo1KOG41Da9lIC9Xqfwm6i9o_c3gIQssMOK1j8aUVdLNu0CoXGnztKRCuB-AsBGdPSrzZh11Cwv5gr1PSk5MQXln8WlDEDFaD_T6rlyscdA73VuHgyNhYNTNWg8H-sLGwrqBNOtzrlPjtmI8qzqO8CWYLc-y8BtAJ3wvjioSH_e4IrsvIwK5kED5iozQaOcCUDMIjNsI7OYKLEx7j12Af_4SHPg8Oe7ZxrK1DRCt9Q0gJ4DraUKEGvyWxB8YaaGsgQQGJJXQ3FHtDI2qcCv1zXhS52ayK0E6nf4LcmZMakhgotI9XWN0DVVyt8FH46Pjo8Dg82jfVzM0nmofi8OEdHSKYGjANDe7jn0OmT04Gjx8_7q9UA-jd2zW5Ikl4fMzCwX_SlekjPMQ_R2CsxMCXlNnH6JbJ5gJFgM2lra_6lqsqzHhWZLO5GGN-TADujLhoHA_7koXHh-BpJ7oimT8S4fEjluGgsjRKwuMj_Brs45_w0OfBkRhBUICN3l_eM6qXUoeH9w337pyXUu8N7qtydw5C6a9kHe6bFVlEzTNp3boaJ6a13yp0yqq63TpXnfDwAA764KirYNVUfZEGA38WomQw2LvvnDDrCFoa37u-O6BLS9ASLwHMr5vPiKPB8gkpVivwB9gG5SJEC4Fr-avRc0f5xH-COoJuBPxqfRN0HfrVDb5pjTJplTU8HgmipuEdztnv6z8uyX1ZxDhbie4vgb5Y1h5fhDNv9aw85ul3YH__9g70N3YgvG8Hhu7dBP_c-kShL94SHe7SuvfKho1wlNpJ3g1p4-UePCzqQeXdcEjVQz6wLK-ttxjca6MAvQDfTHpdJHnKBcu73bq_q9v9eeOV-7v1C_Pf6R0_BHqO6PqlrUcy9uvOBAekLN7C-9gGfgdeK_9FkFbKLirS7QraxBFZI0_QZkU6vCLJnXt0H47aOBzGkYx3fNVvOul1jrhAXtgEAQ28Lt7GlsAT2mrl_Sz6pf_vkWKtixvQ0EVyjBiqrFSNfigQaQ2qEW4XOj79j7ozN7fRxWZjoMcjZnN9Y1u997kg4hayCMp1tyg_NIORNdlHtdXQIdTSfWDpVduz1qReQfzNRT4ADMc9zUAq-ZArQ0Rzj3zW_p7LqogC-gpnEu7v-xIHx96qHUrs75sSh3Xzx6ErMYYSh31T4niA0tcGB94k72HynQuPSw1oZKv_ZRS2rL6abW6_0ZzxHRYeHzTT-ibtsNntguyELLQtPLqVM7A5R7dy7DSPj5s5o7q1ASptbeYMbE54K2ff5mwsSUlc8t5m8pFNbs64lRHX8cFmsuv1cDPZtf1oM9m1vTHj3Ld9vJls2w77m8m27TDcTLZth4PN-du2w73NZNf2_maya_tgM9m1fbjV9qFN35jmuLFP4dGtHNfz8a0c2_lgY75XjTqD8FaOq7Mx66pZZ-9Wjqvjr9ng4MDf0Z3BwaH1vOSiF43FxWJKglk1nWejzwYaRQGQxnfdIKOY-E3QVYBlNAgsItEXDqBWoKL4M1igTMUbaPIil5m6aaENBTHwBxUOLds0oA7s5nLaygx9BoRaH4Di4OAANEDzqnbEUUNN8AjlAVUOWhjepA95quC9cNg_gYgVFExjuwCwUHEFQRkFlkMHbdh2OHLOCtD9jTQn-iGyDrsW5nkzf99b1uwNsA_bjYZ6D_X9FUvi3jq-wa8QvQt8zpjsih5M8TUKPFltTSy7XDE80jHG97EYMumD45XoaCsDGRyQYSXmDVzMeL9DK0LFM2B1DIFz4YlQyWR3q1u9gU3Bc42cNSJ4huFF6pVYrof9E4wDopOC0HTjWdnAkb7WSpL6VhoP1e1mxndPRm4Mnmw731Ks4EFgiIEuV8iosUpKjVcOeDY5Mm-Ow5O808lPBoN9ROz0CZd3MSqMuucGJ2Swg8e1MvIf5Dtwshd2cmSlH-51TH-WkYBX2va13_d9dcP_sLe9u3oLD7C3cLAivr87ejeOWAd7x67_I_q1Xp2GMKIZplfwD4mcmPwrnBgEFCZUA8xs8B_ObP-umT0yEzvanNjXJgpx3iyZQYsuv0tSk9d-79tQOAzDfTQI-8pAEbFA5ZO75y--jIQYVy2oFR6CVjVYAA3zHcN7YvcN5fHjsL8Cdtwh7d5VAHlU-cpw6dZ1OAiKDi1UAzqO7rpvcGEggA1fNJj-gwN8Hzd4PbBd-01c2j0oHO05Tk4G-8BdoV10SAxyN_85ANmb-RLJXsos0BMkFHsPTUSOozta1r7lwWbL-xst1_3spUBoUKZqJvvhQwIbv5digf3NYR5sDvOwOcxH28Ps6t1QGHwAUZD7R_ufr8MOP2KKA2pzT2d34rH4itpHdFKqVgYp9l1GB4lA_yyRmFEMCkdibZwiSr6spVqKNQVe4OEUDzIk4w-9HkrZsxIyLteUoGFanUY7nWe9Dx9E9XM5XoDoazsWHThXf30tnQqbCTXwDDyhIwckoPEzp6QZPaNMZjx4oMQkYLJhGSOeA8fsfaRjUDN1_rsgVKhi0nhkZ06u_bsxfNLosVgJrfPJTQROFNdbLvBMNeM8CCRoJbgfgsgZFbj8eY9KQG3OQU4K0ffeuwAExvfPhtf2BQoGMQPUpwrKFg37KeOAug5TAk7xRK1eatQ4wRHzaoUT3QjHgb6SjOl_T5egtdnpgP9co6WMCcS7ykYWR8MlvbNIzZ3CQ24Vo-qwOYnMUqAf4S_P7Ez83GQGRlpL-Btl66FxRCbqQFrgO5fUuu-518JwDAnUpugCcAF-DGAxAFTbqC90F5fT0bPGE9VqdWdsi9qJvfO4Tps-pFCPxTj1LY1CEnKCcC22J6jBasAHw_LGZ0a7dcsoI5Z5bU5RoTq7UWmhUUOntvYbB7FEZDwAk_E7ctHtoStA12B_XGvUNjzWbLjRxNgzsmrGhWUmEui1OZoySzEc1HZQrASz0CkmsaVcAAKbxQWFv-wOH5DbLrh0G7WYJdG1MywTyCMSHuOyXi7v0jaGlM2oqR6uQcGWEiORXwGnEl2sOg1Xq3JcuCbIPW3MDNGx2Qx6NQSLA2nCK4C1b-1-T7AlqtSAKM7Cvh_gW3Pr227dcILEFuCz1foBMf6nXcSBaAH38tJ562_yY956-R2oVQ4ODjpb6jTg7iy--yDdeYDkAt0hoR5mZD76qOZkTVxrL0124cyJo_V5TrCUa4XlTrm_wL9pRBKcbbol4vQ-skoQQEq2gH8qUBa64n025n024n024X02h8QR7w9HJ-Q-Nz7DSZfPk9GWps8I4osh8_MSuJWw-hWH2z5P2Rho2Q654hNwBroTriOryYhmKMRld_lOlYw4GXVD-k_nzi_tkgo7a_ptS0TsJniJvvbDwx3SjG7U3af_DA9vS2T3u6pbUCvk3RtaDZkpkeBzn9rQciAxtOnjP8PDh1IhNlhQ5FQ38oxikq03LIDqsbnQXq1gY8IObY7ZML73hlPiWwHX9_UcdvZ3CBn_Wef_MzxcrcJDiq5l3KXdnF7fDEXeJYxWdCjr4Tcb3h4o3rbDfbrx4m0w7aCTkpsg2Yf7kWIwoyRD518iKVM7u1pZhT_Npy-l7mUVjOgVKRnJ_jRpG3OkDxd-PHhFVWz0RYgt7EJqvny1GVKzm_1zq8RW0M2d-2rSKKux_r1Duk4RF2OJd28VCxnpY0oyUl9aShshDWNZkfI-Xi-Y9OpORzwDGJNH-hFKiQ2Q3Lq_dG040U461W1EU-0BuAMFVcNKhTCS4MxM9RzKZDfIVjmLz6Iznpho1hZWAkbFNlMaGBcon6c0kakPCGh1cj9xIq8gxtnVVtUG2IXKtwtstM3UL2BFol86S93TkcrnulepEQv-ga59_uKmDPmUhBBbGHwtDAPK5IR_AkstOefqL8xyfpHUG66-JXJivNw61e83PfDcR5lE47g2act5XUVADeMWd8MFHlapgZ2Q4-ptri-JnFM0iVLgBcC5VwMzCwgCxnbJnyTm5zGlK_LneQ9-71K6y-TEGcvEAUVXT3LGS_hC3wcwqRv3PZMavi84sQmLCgo4r5SUJfKayc8px21I5CmTZylP9CnTpymTLwFxTp4x-SSFoEuUyddbrkJRP9HEhaHb0c9tFL7YF4i2nHkBSGp6_VM9-1yDbWDwRBpT5FY5wm0dB8zXL3r5GAoV6GeWrlkiPzH5wY4ykc-Y_NkNGUMry-_QR_p3HF5o-QF-wUP3q49KIY0BzV9Y7C_ehhAewVVe5RcFhh53Nng9TMvBTc6pzjQ29zORf7G2YPJN3dx3nMhPRP5m_LRDiyGTbzCESUiZ_NX_-psT_ZZYY78kAJuTy3wsAhZMlBB_iyA1uOADKE7ZdtnqsrwOMI7AYtYs2zdlvelgUI_b-JIIDN4kfyNmgJ2OrUYZrk9zcXCg37ohJ0z-4Bb3KVefydKHesHe_-505A9E_o1T_tYMe9LQdt43QWLqKDJ4hz-hDUIbahNbvY_VcTmf9mywETi08qfNNZuUI3AGFBhTpiBln5rrFFwUC2VmK5_WUUU2lsfYVCbBZ3EzLq9lwAJrNrT5BcYvW_18IgYhk9_iyH4Etd0XzmpDGsMKZ6zxIpYvIn1KKO0GH4Ku_ANW8A9TRN3ATHdqr9_yRe1SfkDZ3iFdrfqUbjwo2AzpduWPm-lM_gIGC7LPl_k4ki_YpciUvhCZjiCm0JrJkC-RV3eWXVTRMpEv0kj21w0XIqABm8gBk_v-Uh0yeeD2fY_rUyaP8M78koBNLU2ZPPbQAezVvG8O0Rtlo0vBE-ic7Ym9lGmUSsKKoeKz80oiOp1EMN8iOI8VNYHDm8W0cZqc0mHD2MsgBcYeFOyRmcqJ_AV0-QHWDMA0wTgENEa_j0dgLO0Vq4BfnBMZ9vwyoBXAHjHMk2BuvPnMs5uizMbg8FSh0195AEYFv-BdWbOEFTrl5Jl36y0_QQwJZx4C7jgVqYym_qkuVTZFLaKXWsxI8AHsCCLwzYA22FvFjPnVHSXhzG05Y6gNG-CNiGVkTtjm-WlErQqBObahE71ZtjfPxqd4Awcs6Ad4xsCZ8-_gnFP-wrxbae-GaYTW6RAM-5atBZg8gfNov4mAtmxNtrprTZggiXyBTd7qsu26jJ1bOJoaahoPrOUGLMFYBG3e_5OOkMoFN9-N8vfuAhjZ1GCnMsUD5s4vcpqGG1XQF8pncbNatb0Jc21nRkRPiuvfjUOe1QoYhp0O_AsKRS9WKwhcYI5m7g9ltgbdkwCdBcO7lcfaBkNareqTDG5XfBUZroFcx0So0em4KrG5DyxzFymrrwZlugFM3eXAHkmJt-8tySBCLtu-U3VreHVKvDoQ3S7Q2YUdgb2IHkYxcHvDINqb3CdYjmVYae3s0NRnQ9nuE3QncxMwGeLW7wwOgCxrvlMuRA8HgLQTiv2heOcMiEJvv9zsvuZ3AE8XjtCm0340WjMBXIRhKbq8xVCg802V5CnLG5EOd0KIhrigMYZuYQvPW1H8sZVw2fiLcDmaKQvUy7uvbuGCYLK8GzJTP7KJC5e4oKwt9pFfkXU66orAiBveq4BsgGsTa4Qfa7q5GwnG85D9nn9YcCkbsBK3yJ8w9PxZ4wBg3tR4-4fyE7He75f3tCBi2a8NfUVMdI0QNHo1x36N6-WCfQHu4j6E4YajKhoeDnjNKEsKyYrCvm1FzglZamuJpXhY22IZTrISJmKA5GF_3eAdFeYl17E8i-RnuglktiC8-gvAe877NoTP1wCS-itg0OppJK-pgUo3hHZVg742jsY0cGi48yoeRtJ5eRgugIGAg7xC4SvwAyBiHnh5PcEwgxDDA1AZi5ljMY-Yo4tZ8OXzwjOL-ycK7VNhrIAaXWUF3j9oRO0OKGV_EO0YmUsMNOfL5f8WoMLy2JuNkQApS65SfhdwVfzxsq6EZCvCU-VBp43hZ0LxrekQ8JAnpPa9rigbp8y4ZnvjopmBY2GPwDQCgII3NULXJsCXdTnR6bytx73pFisb_bXIlYlThQKTImuEg19eiGzkOIvuiMGFdqdKgt6ofDn0kgqMsMgdNlFyE0no1rtRAKPbuV9BYr6ERw8ggIsBXdr4iLACBUN_1iTjIEl5DzQdIP2ZsUCWsTwFx7l9Gm1xHQtq2QraB_rOjfTjPQmZCc6nHK_U-3KDEe-DOQjJbDTFiQBTIcGWM6Evy3HkRCXBm9enZ0EUvHh-FjBEISHQyw7-CthIibGQ4DSlioJcjooFUE0zEFUFo1JVAWC9Y6GqaBmg8aPUO6CSCube4ovenRdZLodoMFAJzfOq3Dk6OjjeCYM1A3IgytdgHGLcZBmGkXhA3ta8ZSWqeSkrAb6yzESyHrQM_L7IM6SvMyXJx1-NfSeor0BQsNYkywsBPrlamdag1gdu2LrhencP4oXZyGJPQO_rIQm7CMI3BTmGjN7mLLthZA0bF2BDbY6uxpTt0YE2AWrVrHl_9UEqHL2HcN4FySgTD8CuPBIP4CrRYUkg5lhbZlf5NNOl6lVCjp_iqQaUWFy3nhblhZd9JTmadzsA_292AQb6lgSmuRa0bJcNbhOwdJLAOCtiQLcFYPNsvOwAI8Q4aAtSViyQV6z-YsHI-cMMZuU4n6CLy2DLDzQLnG_SwBpRM8QnSnRr6cLZsaLyrYL9WV0Ni0_A_hZKXWGpYuGj9gWTUoETVYsupawYOzkZK7Y8gAHK4j1IuiCtb0kxZj5iFbpa0NdI6RjviTiqFPZGeKrGbP8Vyvssv2RP7AFSVIceEN8bHw9KQwfC0LQmPhy1kbCRSyU_ebNc_6gy0ensiT1wK2SQ7UOEmi7Yrxnp7WjBiIhzQwLYc5hzdQX9F4Dvto3E0PPX7vFaTe73nezNwu931X1X_VsOqX-43QzuJ7tV1fhiW63EO5KzHAzOkQtipKKdjgke7lzKaw5uKcAkvkBHDIicIL7GvAW7jzGuclIywQxn3PfYh-frimPcJBdzT8vGsQHsDdxAXBKkA1crknETdB3cuNuIUT6UHEAGBG6ZFj-KGzAKMkgDym4w8IGL9IP7yibGPeWWjNlD9iIj5ii12wTrj-oTYTzKufNgz0HOCawGRiFdFMBoPYJnBvFq9Lja6SwwHx8BcCXhNxuRmlrKvhPSzrYj84bsu-mJG7SPjJ62vbr-3NQV0PE-YkrqklyxBC5ezszrEFXOJ-8aLRC8rpCe1SL8BKKPs6KCWHhDkJzjdKj3SaM53mWU8PlmrQdf5HJi-TU1RwwopEsyYWOCge5xSBqj7Bm1sXqQom7NuPVl1qvjqxIVPkHRHbRGgq466PlwVmCVDs1BAC4PR5YN9hAcONxPwKTH6BraOo5-Ob7tzXyrwLrBIM94k6j0zw4AKxPIxcsoYUowIaAr6yiMiWCjRKUQbQj4jH6whSATyq4248it2WbwjsaFNt42geXyf_ImlUY0eus6WXmy3AihLu2lyLg8IpKyBZH1ycezZd2FYqSfEfjQDH5Cb374CbqzVkPWe1buBYBIcBtfzYGxLRfcRR2SofbU3XBCz5zbPe88z3i6Q-d56EODZJ1OZhoHssGd2WwLtGLeZhIUcn1CrvsN6Y6xJK1_7ytQNlj64-09WjMfnMnKg6JsHZGN0lns72zjmt2qJ9dwt0oGrh-pR8K4W_BOx5uU3PFCGBQEtSLcB9_2ZuoymGsX8QNTB3-CJMI3xSwQucKAmms4GSOHyf1O_IUiDeDbvLNwtEeeqEEPy_87V_fO6wp6yQBSDNyGY1bf3LJ5KcGp-7v6Blv4nyhWpBwu8tDDQ--nkSvq3gPgTaHamAI9jqsEiPY1ZVf__mKv2dgoeyAQt6iTWc4FtdRFopjyklEFuEjJ8Aqit0rAmdLac20hCWmsrvB8AIWYjbIcEe9H8nej9zEVOEzjdpthUtVMMq7BmysmwN8SxPqiZqbFpA4rV1w2fk950nt0wHp7eykrZjzpDdzHdR34t2AZA1V4y5L17vr0Wa8aKSG8nrSOydI479LOWVfBSgXuzAyYyNdcs4zrk4LtHAMtCcSime7Wj42XN5PTwsirz3qN5iAFiAlsKQfmpoYjkRRoPbs0xxDot0if7B_142BWXuSFCCJ9wsP-YD8OMAAluJMei-qzLucBMxOKluO5gt5MG2_yL6L4Ffpkt6ZXZHJcjbK5iLL1mqIQpPiMAgryzvGYIJjbh2wqpA7YZVadlYvRZdQ_qWmgWfYFE9-A0KjC4G9PpghNfBGfxsC3sL10T9waPemN0GvcyzEMaLoAMR88tnV9n-yi8nlXpDvoi-odAcGP8NWRiceUmMK-Ifd9rvJZpm4iJGxBnD4RCrSoI6BCQTiWz8TfEE13mWcyi15KXfRAHxWMuy2KQB1bZfwa3RRVhPag2vtSCmZ8s0XE6bFSZxkOjRo7BhBEAXV0jbQkK06tw80nwAPWvyFzEv1LBZegBUoNoRL8I8Dnta16yP8zovTgU3aVVSj2B89mxZlpC1uBBzqEZi4WWmOoH6O2Bq5IyVMInfUkYMHT387OXr8K6GoVvHz15rcz9ObZ6Twl-hn60zKRGFwbLKgWF7NcQ3kIbQ4y_OJlw1f8hr7g0rlj9I4ZGRC_kfrZh2HSxrNkoHNdgCih4QjUOJes1Qxc0QxUZr9eUBjHemfii75dkIX9PmWwtlGjAnxvuCG1IiCgMEc6UjF6QKydbxZPnALrc4e3PB_a0NBwh0XKreNQUDLQcJM3dDuSMDUGijnR-ww93APn6wzOwCk0YZUS5JXXzGuLhv4HaJ6AogLI358QLIyElLqC9oINL1oBdX5yNkI6sgmbs0s2ZTNwXmvqAUcByJGNcD5m8c8Svd8DB1lpY50-gHfgxMT1mpG8Dp0FuB5ifUjJ2ejulsAXaliCWLJkkj9u6JkWW54ECy4Bg-10CvP4YXhdxZboGk-o6DlbyGpxAef_QqAQHhyqrdFntHWDLl8b0hIRmbVR0RvzYkTkDOjHbD4vbtBB2fMvGkJmlagiuHRoiQNIiJi4Dy6_J5R61AXufqWz2RwL-S_z4LJLmK01jfeaoQaXt7Fq7ZVpS09-oatyOC8KIEi92B4DMB6F4cTDDYST4N99EGZ79DuyoUdtmNc2aFlzDiHI2hDP-y3BmAgQD2EztDPEj_kI7Y74BgMDQykWG-4mvb4zy-4PfWXDQPlQQIDOmHg_sZJEWc6Y8WHfDT54gbMeXZ55F9J-_dc0ekuCU8SRWgI2DwdvGkQmWcmdZADlRIUbVO4f-VtETX4XUWNQSWEc2GnucK3aK_IteqdWBEeygDIlLYcXZx4tTdgjAAEg0EmKSYqa7Sa-PXzWpPPQq2gXE69DBut1RNTcinPY0h-4qHH4dlDfAREnj6kV_32k17PqJQiyFp6Hv5wUECYFmTyYFoF9YaOvvCkgAliAAII3gz7_d07JaqUuiQn3JInq3XNrm8ts6pllXlvUGzpdU9YuaiNg1PvNKagnSI97qqmBWNLF-wNVnG22Ymn0FnOMFuprXhoYJRrxcIx8dkGAAWyWDfV-DpAT-axhkNdGd462rdVKrVbhQb9_gu7AcenyBhPpKlOJYjLlDbVYACB5z-q0C8qK-jdlCqCEb1zUQY4XoMvQmCqscmOga8rwzGKs3kq_gTsZ-UEvSGZkrs2pAb5VaaFwh7CCuasu2C5oWltBTjtklcHRS5D_NLytoe0EHnMKJhT4SSz7rN3w2O4hn-zl1bNSSnRaQGlFLEPK2DIWzh1uotlVWrv-VDOiSA4hbXO0ZTAnVXc67R_IFavfs8aIrkBymqHyOyvdvUys6lOZrpG3uUB-1hqkX_DSAMcQNTnnvM-m_BL8fs5g9s9rxcJ8QmbWysV5yAhP6rNF2kC6rlaoXwiOwJHYQn_76JLfAy1XAI0gXP4z8GLaMEHQNJKf0UTU6DPi6wScRAEPM3qxBfTfqPF_Np4kHOhr1wExsE4xQPd-xl0uVzlBD6H4xRDz8855q5pJWOw3zHz0fs95DeXC_WS29b1GQXjvbLoJxO0GQp5TJoQDktPVqjhG45niAGWYKiKVNz0SIA6n_i5IZ4SshJm1qbMT9vsRthLvHPSjXNnESAOsiY_7Vm-4PVmt2hN3fy7jeTeMHDuO9dFTLzX20XM0CdDD-YnLH86dz7IbPknm6fCm0yFXdzwoYMRyYx6UBr4kTCXwHUaCUTmbZRCgTCDSIRiOk44w0B7YRDm72uII0sdeLHJhqHNal8C50jEeeVei2iiB60KRRyR6hXWJ3ciGFaREcTNY0RMOTkM7iznslkXOGln52EYIIwjtk2YASZVjHG8M3dLvgzOVumIKIAcRKsvubMwEDwmcjhoYgOmGAvsQgVr3gIVBpB9ghefb2mSoJz5XJTDMnpkFpjXAqfGxWEZCUOPYKF-t5GsSWG9AO_W-sOCnMhtDqCH_akUBy2rO1CAF_V6IdSlwcZ6DlE0LJbNiR5hwbxhrzcIS2enY3a3fFnio12trQ21OvBV9WaMm44jS2SISfcYsVs8sc9SWM1q4xH4Bq3IqyXMG9HVg8W_Q5fyeUGbxo1Hj_R-zDx_y6szi6UIBoQuhm_LpQmEMtHbIrlWu7e81Cs_qp1D8XuuWawy8JkClit6Kf5YI9tGFL2mRB0s9rWN5sRZG4IKPk34cGOxxp8rHojUTs1LdYGioAEKY-jBgdShX-pEJkVKWJMtEXqTR1njU_6XxrFnwpKjD1lQBEypFnqgckFrFwviHXlqVMG5CdghOGoxCDMDiGwLOpS7RXg_UOYnlpRooYYO7BJULkQls7-C_cjkpA2ZlR_D0s3sKWnlLs6zlPP6ypqjLbxnyV9sYKLwGmykMzWl_c4wk8AD_GYH_RjLQPGwKOGnlH9DnELteEgoPb589J0amUrxHHZClv5PA0aQAtnPKnhNkHrtpYUAsM6cCb3JgwyAhmmlVq54P35KP4NJoivFH6whDIG0ChyD29rSCB0t79dYBEGCgF4aFID6XRjGGcUd0mUnwh2u8I5UTS-i0LGCpgFJjxRdem07eyVF7xf3u2FBIOBHkgCmhgjUrXnsK7nnN7MZXAJjGxSs726QAzSQBmI7qdJpFG4eleGWOOvZSvMLwo4aZTdB2ji43MH9wH28OQVwQL2-QXlymnTSFNpVpqTnZioDAbs2KT6CrT1nxwf59xkOWFA9Y8ZtTcvuuoVatLoALDkrz9ucHVJiEn_InkL3iT1RTe-aQbPQwBucFYzIAYw_0VcHrmDWawCTriMxok2KKbKQg37eKCkzCcf_Fi-9A2av4lRV_u6F-6-PqKoy6UPyAwSiIMpJlpE9_Rfy4eOtJ8lOhWfFDbbYxFS6qUPX05sww4UiQY_SfoOHGuPjdemoz_zr52kLmugJuoEDVWCuwYUEGkWEDo8AWGNts42AMKzj61VXi_RObE2PNyNWsrY5Rtaz4kd8Z03LkQsbRu5QiRkbJibLiBUa-GCDT47EygYra7eJHUALVvwNygXf9FTffwHSrf4P44SnQQq_q_tgr1zp7RV1wAVhwH29B-TDdyCZ0YblNpYi85vX4Oh3xlrw20Ga7BkKP4g8XqWMrFiZrctP6nofhnPtjTEyWw4G1cxmixf6PxDgtR4z-ghSNdbxNgMP2LcAHY6dDgLxaNLlREOonG31usKKM30-IzI2WXJvM1-3Cc1XOSi1QkCOdXbaGWOCPSL4RlXW7LqgmAPMedgcZsM6bHat48cIQuXZ9kW7PrKTcp24vN5Ln1Zp6iXVOO528YQgxJaVtI2e3IrotuDgkC9YInGqGC1wgvyJxGA3giNhu3VnInMQyc6ekOSDWbksUB8BWAwO26GVKZKsVRoQI4HeAGmz1-MQF8FtRHNpkQJTYNaBpgevBDwE6EO8AaQckywQtvNxy0QA68V7cC_0iWxN-cPWAFCzYRcvC6YbPA6wGQ8lXqyJe-oNWRTmDqpGvunYnnhXvGjK89zzBMY9MuIaAGTpB0KVloBgACEzdkhRvGbDZi78R-oVij9Yq-Uzc_R41H2_z075GgCxZB-75ZpSyJ-71Mb5Jr4xWrZn2k07nicGlc4Bw8R3BQBu6Usgo9KJBpy4FB8_KtlADYIJGXxFpNsw3myE5f9JkkOU2jDqITg0a3vNcGvIEHYLYhoAyoKzAl9Lwo5liV_y2aaI88kuGquh-xV6C2yJQT9xW-4pVBDbvX29BZxf3NQBcZlN53OnI469VthjIeHPc905gA9P5yghgCnfWvwPhXW8EQVNbWAmEKb2ocEka6PCdw3Bz6SL5Az402ASBijczNfE4CzYf6jdgxTtiIw4a5LCfRmAF8sDViiytBodiGBBXRAUD41tgw6pvyUaVbhAgmvqEW7muuQw1FxnF9w5tjJDA09kFWtOByEwBW_4y8m3CF5KPl1nVSIYvD6vH5SzLJaDRm4ODho0ROawCfIEZk0256oYoJQYFnkg_JZSNF8oq6vxFXHwoUMOCpwskNE96k1xVGuKAglzSJsOfK8wFKXcup2-yqcACdx61-qTb_el2r1DjRL3dXEhUYkgCs_KgWyvG-WIGmrXZbJ7lUxCWgu0kpBj4C2aqTWHKcMO-nEhwwP6E9hZ6hvFT4Qdw0ROR1twIcUGyJFjo2YegKxpRxiVaq7A2edIAKaA2wL_QTmcuFJKUciQQC2l8I4ZoHJ08vYEKJKgbCAyi8KSnxDiHxwTiM7vfz8qF1OxWfxBBzwQj3j3_ACG3dsCmgX1xxqGueTQvrpVOttuBK3Sr7bouIDZztywF3NniVb0ahYew8rI2dnWkDsXTABttG5i7enPglsJsC9CLQv71y_HtQmDF9zUCyeN0jMz5re4N9ED98UsyN4MB6hPYPL_aMnyJl23uro7n-S3x6vh7rhleD4n3fA6WYU70bsp1iYyDKOhKjODqKqFNxpqyjYdGMum2aOMtIU9onXAva_-JMateNu-oUW_4jTxpGFjJZyjnFjEpPmCcvG63eEYj-DCRGGtbl3k5tzaJ2PQXHoAN286kVNeZGgdsQii1lxD4XEiPoNftIK0xN36Zg83MTSK6PEDL9SAd-rS05r5bqRKxeUAcfGmcN-gNJHYTAvKQDYZgBMZnIcb2JIIYJReAiLEFsEU5zWXAXHJUl1hHdZFyoYO1CRnrJL-A_bSfrFb6ChFfIraD3m4ISCHiG5YyJ7sm_ZEhyCx25fCyBoJl1qkOLoO0JBotVQLJt9cXlVBXEFPGarc3XC9txXVVlgDAMdGkuGx6OUB2qcaIm9QG2QZyVXJyy5geggwy6-6paUR_0GcqmxgxkxUnYVSuE6Am1ImIFcgpCggXbKwefgXNSC8iIznLHPi9WxHihl2wa_aZnQ4B70UthVu6izV5uE0gkI3gqE1CRvXqOGVVI1h50yfErSo1kQXz6uUSgcPYkFxoJyL2SWlA4QTIRpAs9dmsGSPOuXurNdOIs4VaxItoYTxjpaCGVsCFSOor3G_EVqsAn0FHCMgbaYfwPxOcRoWEpsM82U-5YnlykHLN8uQw5XLNbngC2aYMuwA2BxgmXvO6qc98J2SntaLea3AFeG8oUc1vh9TM-B3RNE95AqJiXc7R3paonjJRNs3HRal1OXNZEI-UaZqyM36aDNKdU3gHTvlpEsLvvZR94ZO4mEXFFOJJf0n66cPs5Gy1gl8n5GxX2cik6Kqg0zEl9MmpK3G6q0w4UywAAps5hKzpdK4hfCziYxNQJJzwOaTRxxB88o7AdjuDA9AVJN3uJbsAPe9qtRKkQgL_rSHrCPkKMb15BnVIchY00oCZ_G_I8WYLJuCtgWB1egBy4kj_SpAn1sTfAMc0KnD4OmycrktUifsDiG5QaLFvpKfSwaal5uSS1xzYe1cgFK9MhNZ_9z4p-z5tPu1o9GIZpP7Yv94amOFAVNGi01nqch4tkn4K52OWj8eFiBZJiJ_mREWLZACfa1aBCubUKLyNGDDio9e9miPY6YzAAqaZtDvqQTH4yaYAJIHOtierzflnuvzM3ffwC8_Rrs2a-MGZWl7AjcnQSBdtJ0brTbdlJk7ar2L6_MucBMn5-Xz50xr-fbVON76--V__8_9JH65I0mvHaZcGLJguAme322cl7wMjilUQtUnzoie-iBGIGCkwZWNSdTrd7gKzaUQqYLfnXdSvcXLRw5PGF5QuWbeb0aGpaQw_7xkoxghtJtTju-JJn6H276MDFqZesPYwX_UpGwOXwrhka4fDcVnzOUljDsBoAs7yHEYyMVJDt36jWz4meujLl12CKH_K-8PpyZUT7U67XXqVTNOdndWKjJNpypdWObSOYTti16UaV0_FpFQimjC3_RDteLI72Dt6eCj2_7_GrrW7bRuJft9fUXFTHdCCaMl2HqWM6KRO3M1pneYkTtKuonppCYoZI6SXpGQ7sv77njsDgJSsbJMPsQiS4AsYzOPOnXCF_nvhQFyp1gXWjplCtpmadPqr1fVFahDO95BLjDct-SY8NEX6-lDwyNBF40QiKAPwaxnPpUmpNnOyO-_0e72dfBd0BY3bSfztyOYwI4ADPc_N8IaUzDmSkHmQPlX9aO_hTsI6xlm9Kp8WWn9IzKUG9uJVPtXHqal0Eb391-8fzk5f_HEayiPVkye2iA2_9TnxCYzG4eDkcFrLggfqLMr0TYVuwIzNF3sg38lj-VU-l6_dyvfOLbXv1IPm1PHS7Z3DXQzfxXzho456PTh66twT4lhNRye1SnNsSzGHg9CMTn7cG4JL4kUGB3epK2INCcbigcRJ9tDuUed1KE86nR_32m1B8uTYiY6vK4apbF34nitezE4O94dfRE8ed5_Lr93ncgpWF_ehwlh8EX1JEupgTMdMEVX2--UXsdc4db-xC3HnlQVC0IJ42Bt2-Vfckzd8eW7DXffkz8ouajteKM3abfFJ3WJqU-j5Rt50TsOdW9wjlxqVVedtuPtzKOcU05jXjmhll-vmJcBNLMFXDJ2uXrafJsMk9mt446BUzVBjy3QrmRP0ZZBHTq4T5xYWpZT4OvfHxCA72h-TC7jTweHN5U3mEUS4Ageyu3kT7hJfcpcvl9PbU5mor7IL_mR7akjBnRRasBLLtKx16uyTzZsA-le-hbEBNKf-Uyy81gu-pJUsopy1b_h6uX4SFGYn6m9jXXNzFgl5_-9rpffTQ5xr2iqyMUE8GuEB5zG27TbAQsVzqYkKY69CQeGcNPshG97r8f3_iePIbOvF3n8zuEMn2Lsgf_KG-txAgWF37c9rdIUd9hG2XIjQShk_mJwkRdW4RITtrX1ihyQdqXm4VZq2HE97VnEwvwK-h99cFvEWQFaIAUiqqeqiUs5yXjatQlhh9RssyS2-IBg9-idGng0bFbCmR_D3i4wgUEUYp5q29QexkaSc1fSowlK8OFvNOzOIceStLWf-zBjxnxGQxOP_1Fy5xqLFikog3usJk1MqwMMxoM9IaoXMLnI6aGD5ZUFbaHfK4C4IB7zBblJfHAHBsPmhS7MazB2YaqHy0ZxwUQGoMRbcWqqgC5_TYtjtxzXfGH-2UulPQPYNS8RN9pngvDzshamvaVx67FrPxsfcPizHafkqeSWgp-7-NQo-jpbj3ajSZYVOa_0hCDZvuCpulwvVQOZNOnT3tkzaakKufB0uV71DVbbbxagEvfFC4QelwKZyAdFdQEA1IldimUynsS6oTXp5YaBX0mueKUMLp40Pv03PTZp9GgQffn6D12RczoaPXCTK4B51RmstKHQshcnRRWqmXIhrBidJhSw4yKqonCRZ5AvGS9tQj9wQpLsYjFp7J0XD_bjppGgCzyviA6kAyR4BTDO5dJ7Wm-qLzuaBDJL5De_AEF4jPoftbxGP1SuRWYcFSU5zSjkc1uoHP4wiuvLy7i549ey9T9KxwMkFV3i3oRSMLkceUz_moJVFnEDj3uWi3V54FaaFsURT-t6sChLpsndg55hTdjPtH4oNE94FF8FQEc95vSKf5EtRkH1ZS-bqFawh6yGoXahcqL72oNYCWj3NgLHIiHQTkXVE-sk-kXP_pnJ2l7i0CApA18EZTkSij_E9ViYfSNmHi3ZbP-ZlUfz9GZQX4XMzUiZyWb8JNue-4yZc5Hn9Jr7jhJWzWkEykyur_i7kFEKjlbTbBnGcP-wnhC6Tw5syRfyn2ltrdg5Zpgo8bzCuuvVhfQXDN7ly6ip_g1YZSoyERk6iLuI0HC6tnZ5gDq5Z6ium0sVJ2wIWQB44nl7EnLR6Grw8-cXPDE4yKRATXWoWLrF5yQyxK6BvY4q-wHJwE6_xzIS9mtxzFkRRNFuRVCakpnkLQpYls2MncqIuiG4WXlUULPCBGtsm2R8-cy7wW5fzfE6e8wuK6JD7PJ0J7kptdNNuX_hgV3Ofa8P-UifF5KK5l1ssICb4J97RBQXHvJhA2jg3rd14AjqGHmV9O9HRSMZMsslFXpw1RSU3xdwVXteVl_SX8lReqz_FciOsR101-6Cgw2TIryM-ly4sEU98DG_jPcLPYWZYZrZdf7AmkEHfR5GhoXumQ9W3cBPXcneXRZOqML-CzCpjBl37OzH8q_osLhzpTYAZb71_5HMX5ndxXbu-5XWE-4NvVItr8KO9Xo_iSX5WWNXXkb5JK3XtgzFyvS-E5i-VHSriXGUX4jIMh2sHkZeJryROFWK2G9SSNkQhgiiQQRCi0lRpy-PIJ6E8v7urDqJJclXNC33E7-5EZ1gg-MIqu-0EKuicdrhOybs3L4-coBaX4VYiRssAabm6KFaiLGEYEC-eMaxG_BRNhaRosDHWvumCmZ1eToHBO8XgvAYVdsgEs9Uaqeylvp1fBdu4eNcYZuvwKHAc9nkvyQ_GZZmaS_W2XLNWy8qlxXARL8j3BZCLqkuMkOe83Sa1EMKL7JeQAG4boDbpdHQsWxr80sMlo9livYptrQnHt7lJuIJ0ybXltLImRBUzngdbAWHdW4sorfQXwv3jxxpG99-xrQHCWB098lT2_XGs_xDELE81GNxKYW8oFN--EWtHAUwkFmCGmyjzXizCgZjc3SEuCTkzcdEr3OkZv4ppQNOaPYsudOXVhDOrg1nJwxD0abtdJKKQuaw8W2D1FYmfdQmzYcGmdSyM8gJuo9uzlCPofAO82MeVGpkxbzDqfL76nlClsa5g20sBCFCORbvVAxmkrFaEJh1UPnIMMCYNJvfyntsd7XYl7jUSgJ80WUuYvKnFIj1GVf9F-HNgHnBo1wEhLSty8xjiZjllXkahJUIAJNX1erjUXUzU6JEMPUArX97EYkbdoZz6za6oXlh_FEVQuvdiKiBdlrfxLLptHMuRle79YAuOXg2y6PapqqJbUrpGY9kqolluAOmxOzp7PapNR81I5CHjJcAWIGWtgqm9u-xYD8btdvTwUBnqcXNffXqzudmLzqbUxU8_bfZBezY6QBvi9Zly9pMfiv4r0l-iYvB5_mRN1bl0WsCA99FWTHL--DEZZOs2ua9-6LPeQKw8FFbeKJsHzIJDi63z0Uoke8oqjOHKfs9FaTSzpMkt53GgOTaP6YK-77yY6oLmWBHR71VtnIX2oYAbuRc9ttFcmGXZPTIABYhSdQZJ9aug87vMCkdwXICbIaWGukRSWjC50JPL8_yGkhZIW8CcLskm8owLXPRos7V2-Fv4R_Q5TzMRyGBrv0NUW9GTSz0dBlUxB0HiLDGlDhw_UF0mhjMw2-3iBBOwRyTzXvqvALxtsIyUEhA_PCelqdUZ8dWZSOkdMK3D3R27a86o1ldJKj0K0NRFBppv1X4idBtIwhH47uiVZgToDkk9SgGywebdXRqlU4_DauDRe7IGsPfkLNVmyuTnJfhnmvCP7HtkamZlKnyRm6o74WCEpkB9o2ITyN-US3z0fEIuN7fVqgY0qJ3gK0JwwJlwCKsmPewN9STW0_AexTboW1GVKa4smoWmhCxUQ4hSpoSg7F2JrrppnDYxKoDH1OsT5IGjveCvY2C9paEs4D3elyWLcJE2M1Dhh66eizRkH_lQ0MF7sgy5VE8uQrl3qNBKab-uvONUUSHb0f4Y5NgbXTY6DEO5BfKZkalnGh-3uMUa0i1GB5SvgZvoE_xHPn7YI2-jGmUSA68n-VjZpyMrUQLoVED7-CDSLb4J4guRb1_89uLoVCJq8-zNi2dBuKaaAV-RDnTEFlJwkU6nOmP-b5qDtX2-ADahhBOeR2M4QvaP45uI09F0TLT-mkb0lOcAmGLOtYmLnlPBPA51gbo_2FnWeM1UEaVvTcrToAlBz2Qq7v71sdwR0c4w_FjufNwZfix3HgDH9qAfhN-eQjQ9_aNYyTVcxIGtDhrIkflzHJP3lVFiGWWQg5SifuhRyk-sUlkSXb-taR_G914dkrituZu02y3n3JgFFgTEaGX3C7C8oN_jf0ht7XUP8N8Tt-n-BXJ31Os_Ge9-YjSB3lH98C9IVSIUyRGgekPmDFcZpETPDTrWPiV1tfsPnz7VuwfhWglQqDN4Xuj2Ts6uwPAly_EKPIgaKdrZuHbbGNJfCzCopvfc_XhJQHlXYLdJ2-0RvFQgepKZI2gEfecaA6fMGfZDEJ-RbULlv4XqinlXzJU5I0Nmqrqi7IpS8cRADqMy-IxS0B-VISoD_n1vOplolhrzOxZPeF_qLZWPHo47HSQsoA2zmbIUioJBVqXHQk7UWns4nMS9EPUD3ZlQXXKWJsBJ2aFTkwOAJ6msjtGqyFVB4wRYPDsWgIOCT9A0wAcdtZAm8iO6o6ay2thdre_mt0u8EIAC9IDHIGrCCumatjwJkG_8CwA3GVjDb1wTOLE9RxyhDjcGIhdyvFbS91Iv2_57SPuh4pxKjS2-R19fbNHXaRZ6hJxNVdxQcDLleZ2_lWDw7aRHYqgtHIelNGqdI5rAG650eUtUlkQ0I1Kj4kBUYG97BCba4ajVl9UYS9rS6AUE315k8vxyfiXu8bfWHIbEcGkPqjNKLd3y-mrfMMDs7dsfcQUmCCb7aPXlBiXm6G9ewmqMuMCo1QOrGUybZZIl5rZKJ-WZ9VPEB9JloyVwEfj2PXmli5Jav9KT-T09mUz9xhNZ6sm8aJ7Zf8QSRSzdQyydb4f1lnhJt_lLnn8y-ocjSwt6ghLGi71gA3h4lRvjKijAtDqNkITxW3KrUQ6q2CKcXJwHaiDsjxbnF4zSbh-cM62iDg0lqj9Iu10qsIAjxhAr4Okx4QD-Tv89tnEuMtuDc1gQkUx_HNZcQ1VdxyH4VCQZTAA6am88KqB-JHdUvHK5QYjZP0yG_bhXD6QEUFKMA08HuGnTeGZb6ME-byo1FGokkKN9EKIcAAIKRWoqjO96F3EN4LbWWaA38PJaMSPSOXnhta2AGALRa4kgsSpwvd6kceH1IcA0Ggnlp9Y9p6j0MNQx_lIJjXoo-GOSyDfi0L7eX5GDj8szNPbKzeeoXsJJegzJJpjdJYl4dPFW8Yg06ZJCd4TzbBUHoqSkJ0dyaWvohquwWdvJh9JWY1m8rour2aANE4hESDCGfAzY9RgohTmfz37QjtmztYUfGijRUJqeKl4L68CSpk9bDtCMlj1qWWP9QPMBNVtqDzQ8ogYXl0TLQ2rxidho2keTLmRA7AZoeUIHketXmp9ow_FPoOUxtbAhG8pU0yaCjtgqeIvOTSusVoETOY13IFPDj2hnXDj4JnVCEMGlGn0uI2ZDXzY4De7xHZDwp-i9MM_IxRSKcPCP_wGWfJ4AO-8AAA",
        br: "GzrvIxG6HQCIqvo7jFEIbBxAANLvDkC9FG-IdFTrkEshCgnNgzRts-tHoev3a-UWEkMfvcYTLY49JGTDYWVxeBAGvRef4fMXXXEpXOuR0ZVGy-FAGLRIOgPbRv4kJ30_e9W8r9_dCx4eQdPekZX0TWtfVzp9hbBGEQHeyhiPlMJB_Odbqr_aSi8KOUfvguwMHS66enWHYUJYxgaptAT5A66jCP5it2gCZpr6___m9L9-o9tJSlsi2aTDTKaOSfoW6YRCw8XeNgcO53ptbQm7Wjx4qizbczoiE6OpN3p2DxyznK4ILpetKXbBbgjRf22lv9TyqzaVZvGyGXgCBLaTfzVljrt1nUMfKp0Ywi6otPlJtVHqqnHOb4QOmrDaL19Nv77JtNXcaWYBUrRSFmlftcMNBz75ECPgzXLFFNrm-dZiqZvewLD0048pHBsMCwqCYNX1qdft-a_f6x1eZs_lGAF75Ly1I5ZKNbOPCRoEC2Aolpf9_y21z7QAiKT-ru6ZPZrxumR2JlJettBZwLr3vneb71UVPusVgEMUQP4BuPiDpPQFkOJo_a-qoD4FSONTpGQbImehNBtb3qhuL-o_u1pqzW95WZeTO_I5vXjbM0_k2EHqIHKSOQitS4adDqDtfP2FkPp-aF9vfqu7iRUFEYRp2btrqHpKLcexM1oxphjPAw8i9W34aZNrs2n_M10MGGy-QjwJNtdHNhnujf7nDpJi0GnMHDhxzRU33PGKW97ywEve8Yan8kaey4ns-Upey19GIAWF4w0XAmX-S6Bhd3ycYQhIBwAYZoCA9xcjkJSOogx3GwAS0TzaomlMKBZNM6-wGhEc6fDQtfNy2wD4ArBCv0CsUMYN-cUu4fLVzhDfm0kH_2PjGVDN5bG7pYrC7or0Z5jyZUOtSlW75P64b55eVkMi_Q5Hr-NzRDDlaC2ftOfbjo6OJNrSLqHUzQh-uDe-nQqfbgL_tJ1Chrb6f7X7CrUWpSuBDW-uvRgNPScU6Ep0Nl-s3anJ0VGSdDR_BhLB395_nrqC2spOCynrME0NEw7vPwAx9Adv-FR52YywiBMDGA8qh88Eawh6ovTOLXmhBXDTVPmrgbgA4wtkudtte2iWY7S5VpNG4OY1dINJdxawfbRlwYaIY6fwE1CaCiCS8eg8Ju9PAK3rKyDaAL3zis9B9qAc5d_GK1I7D_P3gq4kOiDgQX8of0gaDqWziBoSS7Ntcdg-TiEd4d0ODBD7Fnfr-Hia3-90omjYh5rEeFIeCs9ePFQYaE2IMxgogZlHzXF__d8eiwgM4EXzUhlzAPZQ2wAwmqhr2poyDXrL_6zuPLOoFv-z20TZeXnV6d3iar_3f8XiIFLrBHSnB0rYut-LcSEbeDeMhlViZBeZ9r6JzauuGI6dIBkylzcx1JXqpbsRzrAALQDZ0cefiiQ1AsOjM8EkvyDu1ZUqf7Ki2pk2bhqbiOlIpDS7WsD2oofbybGpitalyMvfDcTMkEBTkle8LxUB2HVBHvnyH81Sw3WasnTG9r8hiGWpA0tS4rn9EN_NBE8BpRUnDQZdGdrMbVVcsmgsmEJEzDv5pIeRNLf9-voF0vIwtbHySJ8AaObDjnehsdl2LPgBKp2S2oI-PymIyv3AN1pZAP0AMDTC9_bLx6OjI7jo4cQXirFrvDwxJqEN3hgtT2LLgofw9W06fP9-6bu9oFEmPPX0AdCXzltQx3fwME9yTdkfLXHSf0h0yZNzkFUURue_-yFYyn6fPJLGGOVntHFm-ZoDJIO47ti3_TLvBDdR506h4LU9dld_WbqIDvDGxuObsol_pMJesZs8ojMMkEqpc8mNreBiRG-Wwrdm3ObpFwbQGGEswV0jjsDRw1n2T0j0CKZzkjQ98IygUubkXcTVsFaFXKoFOOUJEE0D1BEOCKNLhYMecqfQ2HOep4F3LSE0ARiLcK6T4qCSnZN--Dp10JHhWB2-e6NCsVoN_yQjIiFAfBrZk9izG3inuIWlyOjlfeM5NW9-Agi8BoMU1DIjcmlBghqcNLwTdo-ysS_Z49viTxnI9Dgt_HmboIp9xwoeRlVTzgLiqu4dqm8p0JuuZku6gIiS6C3f8g5UAyV-thrhVHMMISIlYU4DsRF8FcIRxHwYVwwiDjc70I53rRl_LYS_XsgBpAQozu34g_f7omYJgztURBRc2R6ia3Vg7d9BwbDWmxRQL1SZj4pqYiStodqqXCanrz7qqqij2Bezsjp83eVJwnOlX1gdTLF_uBIS4n5wwmgr6gfHewjEL2019tuAtjiO7cgRw-dbnQYGv6ZG9LZJrKLEWfwm9wZQR9le6VZvEUF8XKqYhbmzVGNS7U6CVVG0w7PGcvcRfAhJrIrp3yIS7TYANIJ-tI2VBDPAmOI5JV0hWbUd3KTtPZqQ38V61BJqCabaerMtiuikqkZfhldXUsM6flcWYoXE_DV2kppMp8RS9maNrZ4hp-NvHQtisXqjD_y26EnE2STOmygTN1v6yHY1MGnlWph-tOAQdVD-9DGG9yFaoVICiJksHIZdzFu2uhs0bunFnshsfrhJxXOaCSVCZecAD3lx2QDCxv83aMziJ8SDJEH83lpBV1CPTGrCF83KHmOOnBekPItmb7oXFyBLcJfEyCkfZwxSF_5uM0tXjhX9zrVIJf2G1z5r42Tx79obEZubP8M95c8UvOTsVvk2bchsHQbJGsTuEaKDNIvFBpD7HUhiqV7mgbTI4vELZyI-lS8wVYY4xb-V2mhxDJsn5ej7S66CjjvXd3eDTuNRC8ogO9mOkom8uTPM2qPIngB905pqhlqH6veSB3fSHyxiiAvSbgtKPSpfcOxJ4Bk5pKtec4ZbmvYWLQGJPIY9qbcAJM8v1yLuMs1YPEDDaRCkkN-V7AYUyjyUVgc6lZUqacIJnqr1NHYdhQqurqKfwrAoYnfDHjN1NFR9w5ebBA-YEGQdCNxBG0qh2Hb3Cbgb2bWhNPmqTlCiTKN1-msri_QlR49z04QauRtCB9inxZtejfg6MDTKpimX9qG6SiWh6xmJ_kX90X4_KwnI6Q00MUyjHFEX2MimRhTLurtQ-TKVvOMMaM2uFmOrkjcDQhRuTBMPSqxktBqBiQWhuYCzo3j01VfuCLe-N5Y8asPZQhYxhgylPEVJfvk2eZMqDpR7hZCktBigxoZugo_Nknp56BRC2n8rrbpdIvBMGC9SxstEbA4e4lm6wb5CBepBujBkL8_sJCFkOUBiv6S1xfIYS47ioQWtmob-UWIbX-mjFWEB_ehoW6JrRxVhvFM2jXU1XmQ54wVwMu1gSXpkpDMkoiU99VZogRISUjzuEvx7VyxepiQb7NoKKZxwyIwsSjV4XG44VUBm-k0VN9SrcezWEc0YdC8AV11qI3syqKSol06mRSkiDV95BwS-ZLbNcEiHsKVQvUsO5OcyuN2GHIncVAkKs2PnHBXInUfSEE2oR1gMwvqrNbAdCkFV12GLau5eJX04yd87sFhTDDEbV2MsA-zpAQMlxwPm-oYukgrbfXVPysHPxSqSFFUVaqNgY-Owump7FwWKajlhmVvIurL5UjqqaiIV9b8mavUDQuxm3KaaGPC3V_diACWyotwG7XjWyJCAGWWyxx0vmiv7IOJ8dTgMZeZ1q9Slgf1jhMJZnd1OPaTOhq4QyEf5XxTdW6roaA8iDpELwYnlkuyl9_ZMKmlJ1MNLJHVfDrrco7xcVsOkxcukJPhsrJAQi6s2tsp0VvuDeLpN7hfOo2P5rCNvYdhToFf1-n53FchO1zZjMbS1AFAQPJGRAIcS5cukkSFuhOBtWut889gB7-Uvwn7gYFFjQLKf1sWRbsTmrjmDT9hHEJBawp5pFlwlKg5QKbWXKVtdkVXtg63OJ2qGghZ7uaPGZFWDZ1aoCpoeDwwTuYOSdkFOkUImF9GXxmrNIMKqaQLX6oQ66zeS7S4B6x6wLYLysgAcNX86vnTDmlRAwThR8kUgcJ0SOtc6oSQDReO3-NWAOz9EYKogxFoSDK-7fklsxrExUL6P-9AaHE9hf-sNhABJsxTwAOoJJxMt6WxLasIRADwnVsLH9RWz9AOZKeRAuiHtM-UyLfA0MYUy60ICFKoxWeX4j6GL3V7RzsRRCVP7NS6dgiDyfc0XOsZodMq_XNGDcDbxY72llpcibZsfrrYhjyHB499R2UN7B_4AKYnEcNvg6CpNRnzU9TF5RBPPCu2GwqXhTXUFSpDHjx80atmgbvSfmUY3E0aXL5qylP_hNAl2KdZjKzKkpiGcOQBdLGuoYEVsqKjbe6PlgOuIIFKvrne6tE7eb1KgUMP5DrEqBzLcJXeTVJk6LyyooeYAuBOmqrxxAcForPhwTPY6-AQnEaXeBsJ64ffallaupd8ChTRCvQHaWTn995rhRtk07uSF4oGYnled80hLgF24s_OKJdwcTJKu8r3qQ3i56E_WFcWDxlX9OluUNgpWdb3qEOexO_BXcWO9dEyp9N-23vBfBpjup_siwQpBUobIcNFHBv8vizOs-i3_4ogVH00lsvrcFJVXvVT8t2zMEFj7x1qdu1dt_dqmjwcB4S9gi9iaRlbbMVhEuO1l73CUek6JcGcaf5xDu7xdcS9p1FaTUeJwJOSmbD-zdYmTYA-mibblzkj7c0crAXjYNkzvDqsQ5SYbNfdNcNTqSd_IW1OVmTPCf5s3hIIsNrLqvqDWLFMDOIK0oDUGEQFbjlQPVMdUQJjxdpymfmsKxQk8KIxGh7D6L6OamVtszK_xQaQwdy53-HZqoeEvLw8E0-n5Xr-2Rdy2jCffNpVWhev_FGF4sYZiP1iik_beSjvY-G3TwSQdwGKMZy71393XA0ygpqRoTBzqhI94EkQ81LdIEkxUSaaXYTLYCUMY7U83XeN2cnI6_sChk51D2RQWsZ6YHFkOAF4ZEnrhkYjZyLB9PyQ8nCRfEjiAEz5IXJf0XHOy_WQ9QWHr90X9XBky1bvdq5KjqanZH9ipWR9IIFkfSBFZJ0EA2smtGajwft-vo5bwYkhlGjYX8zo2FiCKZMnWDgfOD2HtjBYiPyA2Mxfido7hhBEoKDInihLmecsvw0_wifP7SI8Eb9VB6JzxhKKwpxt6o2TdPOHN_QfxwBb4PyePefbpK-qhAjCS5qHVb3nYAER0zqQUeDOynbNoopt5xUzvhQDxFy7-aP2e0OP75-b7Z_ini05-GxRe00fAWuNgnfJGecSV8UCo0PvOJg0ag--9rlShdMDlujIOlI7m-HKZouR8_x7ZNPbG7Eok5qLkS9wUqfdl9VLDpvQGkkBRFzLAvtRWGkAdYFQxAUTDJugOG9u6t17sfWaDjAw3k-6T4kM0riOAlEVG1ZcrpmJcOpM8cLnQwxMx6ghNgqTd_cACQDqEGXGE0Hotn4oO8JjlxvB63CVUcDlNMyfcjTtJ6603824lx8AuL4NgfjR-NHilVS4HYAkPbg4LRf-W_3PW9YzpQppF16Gx3jKjHhq_8G2CcNpEYDBBTaPkgIb2Ir2gIgRyy1Ge2pHJkv0BPjk8B5Ai1P7AcT4zTR-_PxZCClyaelWFpgQyvEM2cmuVqJFtcPT-K1znVBPzaBxUcN3pC5kFfgRr8bDkN-fxiWOJpvAmgARAQTc3tnKhsSv1udr_THXNmLSVtivATbvGriBvkoAV9TxrcDIx6gG32LIAbqHsXGK4BdY7qrdJDCCeEMmrNbyjsnLzyNGiVYdhTGNnXBq7gKJAdcUmbu63vHWpduyNpNcJ1mt1l017Oy2Pg9UoICZJBe2BwSuRfvKMsW7Ra3U6I0uySHz2Qwb6KoJeGLASMd4oVa-BS4xg57S-9_jbIPifCHZIxtq9yvrl08xFjmpopSl6UgczccE-O32EF6DgutWisuyAYZSQD6Pu1Bn9jjBSQANCBrLm44jcg0OI3aq4CP1SeIl5CK47m_yCrqn3JxRsH7wDxXFlwLO4dN8_yx8MxidfdAR42cAydi4tD0bgZYPttNjoKJTpw0RcnR9Hz7ZFNKbTymec9QMu4-zrxHHV7QszrHaXqs7KuekCSU7MiybDCr8pYm4gQnC60KsE0So2cAkRXLiec0gH9-t4pjxEAgwAvmxwkKqeHKUgHq-rfIjal3xBCfHj2Lo-IDwBpf997-17QLuynMcVKhHm9P1ubUuG0NKBXKipEz2Jtx_u9ZZL6Hyh4544BsNyf_ynwSS86pPDpxE4mT23P2aODA_F-OQmLpE4ZITfOEveowsfVnRTu_HM3e_PsaPN8eey9Mx5LSLN5sK67CtLBlh3i67SS94m9zVrZMZuuMPlwNI6nOwJTZLl5g5qFjvu1uiuBIu_rDAmjLRBWbs2euB6Fe6qrIlBwkJcVHjQpDP8XXEGqlKnRKIpi3yRfTgMMZbFSAB_mh9DyhAoSZZdSRt_dtYq1q_RXWBa9AMu-0gFJxAIFanrdRRYQeDJJ59KOBbLqPMaCwmIQqAyLL_tYGncdpWt8d4N8yIa4a-4szCGSr_ffspF6i6sOxMINNHIg_AYcKURDB7gcb7yy4_1w-2scAD26g19mfuuGkfyzyuOmiJmdumP4EJlgsP8n7PQHpHuCSu6AOhgdYekBIEZCDByUK9eOmmDr2jMOFYQhmyrmWsvEpL4lD92oU6QuqLFvvfoGkH_-tmy7WPxMs49tQnYruwsg0bs0rX-EG6p3r7OW_-SDB8wBJayn32b557bfER2sb_fzv2YZ1feBCbrfFVvy0xY8nx38Ul4BWZfDGBcw1PzPSR7K4vVwWYo5KRgdOMnNcnb_xUgI_AfU_JPL45Zq7Kpjao2wJ_eR_jQef_i68a7GR9m3mN5orhbiz1GI3eTLrAx2Ol_YRjK-ypvJp4BQ_ovvmQXsW1NwqtcaOiKV4ZIsnm2CSbGagjQUtBQ9acM2WlaOT1D4BF6LBFF3tCdA1PkLJpf4LlNsE_PUhRzgSTbXMmPkydWH2fbefEjBP03WYZtGK_Z6w-syNSFuPP1lqQfEaSnelTURydANQuphwT2h5bLob7Yi9-ErOcfZxH1uQzI79CbPQOvJufnGnnVNtvmi5UkR4b5ZSn3YsMuRuLunSJzAceWizPLsvnGAAfRKKjyGm2Fno1a6QAE6fyS7yICP8Q1OvfTCgIm5aErnBTDPDvbEFqDC2ypEUHn3IImqMolUKntS5y0P4GE9idzy0F_apatYi7FSKbPqpJXQ93Ta9u4R4CKjrKycXoUTSWSf_-EvHAZ5a6et39014vtNln6AGbb_DyN-erAtN0uIkdhLZft23B1IM8ytX2ynbTA6hwqBCsQbKqDpBGDdC3v_0ODTIeFQ1lrdnKfhF0HYUreFT7GIV5Hrsw6qP0T8w8CC5mv9nZn0CaA0G0jevTEoBGHgE7UiwKusVfJ6hCxphDMSDenyzqVdbLLaxYLm7wkLXmOL37l2xUSHwhNGPmTa4WFEEV6qxHERd5NEdu7QFjP_17YDs3PP49sce4KbMmLmvIbUqDThjfXcVDANOZK-BgtXbZed4El_j1PN5EQneHiMnoxJaqtaXFDMv_KnUVwQcc4MkY8-o_USTelofPZ1Bkob6ksK9xVrRopD42NuIpb7G7IYv7u1IYz0aPfKPt6LVrkWs5slMFh7vkxfhtnStYLqqIZdgq2ilR7pIjvMjfW0-KViRNJVxYXF-EmjJnr1ARe_bmV6Jez0duVhS0G0pfbUrf-LesezmX0nuCofZUxG9hGHU4nUpS7UlevKGeoAaZ8kf_q4YQ5LbgIFadd0UcVARmtDkbjRlVqdEMM4vYP5llA2TV_2douSlZC9bWqah7rPdfrcMZoal8yzux5lpzXgujntjfiojmTHPT0nt1LPv_xncmOL9owmedZTn7CWQmpv24KrXdoMlDZSEdC1VmBACk8XkApGkKKkS4N-wv-kJgiWk7rhZi-0fbDW2GbFpSdJFmvTAlou9-4zXT9st9-CCW3_DPVDgdP4YGIVUrY3NNKck1ne6raR4rkStHnTurP6YzMMydOFTBv98Qst9KmY9X_7ghTkz_Mk2li0gsaFtK7H2CV3IxF31xUgII_RiBgUExgVRh5mIdeSapsGImSvCTR7lG8aGPYfPRJM2EA3P_C-WIe-pQE8V8z95EbPVOopoU2WCKFn17HTtrTLoEw47Xb3CyzZdMpTrw0dYeOeb8tRzwJUb0bdWDVRl_2Y35KKBybKuJMPM-5OI5DeC05cwrAZNUd0OWIijkq4rBtoJC63Pls7aPybONXqlL4sKb9oFJK0EFGpbmvENItbbHpnLPdq5_aomDhPV1iPXwn5pLzaWvreTvUQ7ggJr2JqVJgcBBsEqSpVGBqikz6doqiDBg3AcMHMADDLgk84IxPBsCi_WdFuR1vR66jTkb0_ddiq7kRbxXYBynZ4snsoWGQlhErDNoWEqdv71dz4whB_t2SqrEjVPnxfZOocfSKPrdHfFKWNxfTM35Zh_-5p-A0xd7j3FOEb70fqAJ9TbDxVXpKciCekrzKyHwJT0TaRjCRludg_dRWrXmcXjHjjKZ5fwgeeokZabjt0iHeaKv90faQb9pgw5lPnuzFqPvR6K961N_xq6MGzDA2KpVc9IThM2D8CzdLVb7Rlxx4w7HSJTdpJe71b-xkY5uXpFF9GhheMvGIJ-JnjZ0EkY3-7AwjEg6jdBiW73CH7d53CabRes9C7O1INvmwujfn9y7RZe0fVq3-hFrmWPaXps7XORCWBU-F4cUWKqbWcNFpkNVFJiIJ6q1guLf33l6T_N5waor4ni_xjCo-vNCJe9dLW0jkQcgstY1Ggvuah0eyAHPWRok7KmgSF6ID7Y8elWt90rEQpN9dvC1gMQRvSb0R8E7_YbvSjeV6UlSgDbnZP51ytHovYQq82PgmSN7T4_OxXRXzeKqR9TgoKqmfaVNY_EEsU0ABpqiko-p9HtYoZ3n3zSI_br_Y-t1FJB6pJr0zoODeyMIUu6ogdfk-OiAWhF5k3up8CGCmFGsFjQqdm-Hm2eKcPIbT2yYv80TUbf-P1xKp4jewZvWbDqRp9CrYPmn0EbA5CmuHJQ8jdZ5mU9PpxY3UP2GMV3aR2Neng4s0Cx-_iICqCw1nXVd8OA5meXYlv5LYiCDQGX-0OPtv0sZcsvFDqfXpLclzJCksTv0w2gkZma8nJDd67NO67GmijQ48VTKH6QYlJ7SOyexi4l7xG2-MQEzYXFyaEsggYjOg46xazfMuBD-GZQo-xOljM1X23VxLjA6NXtMHztvCU2mC7CldqSVk8Ix4TwVhwzgXOxFHd1MY0HGOXQ5DR71idcKJBYZna79sVgu_sm3_NlT2C-h4Oqtc4lwVzQxvkdFlXyWMWLQM7o_sFGA_lARJMFEUESQEhpHag8jc1I-2J0XPJv8trK7x9O5q__T9_n6en68xu376wOVidRgh71yd_bAFs_H3f0QQoJ5KoDsiYI6yc8DTMUnDITn4Ng4iaaVmA4BWtcT1fEEgJU50WovNUvIO0B-be39ag91U70RqapzeBp3qhcrdNYVhkHTJRguE1XcNMPPNPvr_93t-VYd5NlOdk0HINR0Q-kv9v_F0oUuECZ_zkkGXL8eEy_e-NC44PhN0Pio--_9e_gg29UC9G_PWkQ_T9_T_pUguSdMFOW-8mVAJAGYuJNjvagaa_bZXNR9dPy6I-E_cwel_MY32ITlo3Vp_RmBz-hVid6FIBp7_gYSUWv6e2TnK92sKKh0DXCZ-WEwc_PRdigFjLz46GSlir7pcWqIniI6isq4DlFdTEHU5K5f-gJRSaEe4DViybPbGK1167hb0pIkPzc_SJbERZqqskL5ZBvT-vVIyGloPvWOUTavCHPxrMSziNqDUi0rKbPhT8JHy8kdxSfpnZZiYR-1WP6a3ihc_Vk0nC1QfShDNaGSmsB68D_YGQ8Nsb3n78CBrPP7BjWcLZaL4FH5R3qDezOjLmTlU0C1vyyNRE9bSH7fI796kJ92lNi5z3SKr1EPAq16T4TPA1fkZRKkSc_wGXcN1Ud1WvL6nE7P6pac0RG3akuQzxP_lshcRqG_7QXQNWUg1ndv3-ttjxnd-wiHGhTTtQBSgX-b9nGyGySPJYrEvu2ZATRNdu7BN-l6XrlRBlcazCkRGY1Uk5qSttOzhRHcYi7BnKvk30fYSROKqrJicXnS52hlJKg10PWv1NiHJXKt0UNGPWKFLiCw56olUyKSh1SLt01Y3aWHt7d8kkJ2qMosJ1ODzl8gj3_7NlgIiYR0QdzJizXlp9x_M_f9vIMNuJYmS84o6Wmm3MWoWpLt2Z8Q58Nj5nr58Rx8HK9p1F59-zc2SF37N_KZ_K9BgOxeUuwuAmN_m-mX_65uUOXd0Vb01nFGPhhLh-SPagyla4Xm-9QMRm3JS1U0uE57Dt-pNoxYvuCFG5V6BZ1eUGooTKzv7VEJB9ZTlrjvjrr0avQpCJDrwKG2fSIpde-kw9QTOwSPVVeKUtBoOOwnSg4KprkIO0K_LxTQLAVWyYQ6uBppPuzRERGNKc6VwAmjrqYTy58427yO8gmDdKb834IGv9AcUtIJbK1DtTuvh5cPK0aUUYc_nsrpPXBTuW20n-_WfV6x4jXk_faO7cM_DsTnQAi7ZWvOTFffE39KtOrYLCp93IEKHsAPhvWs-_XjZq6w0ShntixzHHxkWHIJfFzAVFN_WnBVSMd7S4T0wafuPGuuevfx7H0Q6O2C9b-Hq_uqtTzsG-JAhMUbH8GHL8hZaw3FOW3V7mMnYn_DHtRrQuJF9Aik9Her2qoG6fh_ud-Bc0uTenAPWmhA_MiNKjpGe9MrTChbRkZp22omAthCTAwemXj-DQh-EDXwdcYfQdLKHsgtmUqagfpv9Ae_eYc4GKHtybpA5JnHq6NwLJ2WcUy1UGVHiOA0vKCrOfNobBAHVglmxQycQhfq0Ls2tBTtvA-qiQzLeN2lzPBCVXIuzJsaTuSlVC1GSrFIEVapBn9VdVwAzzDNXWS2iAwm7v7brpZJjHKNDfOmSTEil0iFC6NIytu5N9RxVpoFDmUSeKs7x8yrPww8ACv2uLeIjXgb8D3IldirL7iSdoQT2t-oDOFkSfHQzXP3FpIkKGgp11ktrnzp9Tr_rTiIgtI0Lh7I6s-qzO1FqopBvrNuS2fVgUvUoHQ4I0aMh3OYjAKVFsb6ni8eupEVD0SFLo9nQ9YbifG_f14Lj-elsh25YBAD3xfeDgQpxfekX-nIZbLoDc_ZazQfMrQbPtwm6sTbUTd6cwlKL0PtRF0hkRC6V6IC24uyFsNF4j-oxHhTcJXrKSj-5NBvCHA2GYwUwn4sEXXs81awXGei6VbaokHTF26e---qrskr0lpymO4tJA_zqfOsoHb2Req3lzVfFFG7IDd72F6A8GvyEjimhBrAgeFjLYRAiT6iW0myR36VXUtXN5oclObdK6SxS2cuaO0oKn5x6tR8J7wNVN0YA3sguNTEx5kaEcqfRsr1Exn-RTs1KbuVS7TNMfgpPFTOcmjdaIRLFwKJqLC66xuoub9c6DQD3mjqcdxgQZKzCy0oBYCtRsgjH6qHYqzeIpuqdZlYEi85G9shr_5LSkNSNc8juNK3ee3g9c64bUbMSKnpoknjzTKXw4NabupjLvgV9T5NFfUy7_ed0p_uhPrZfrYOXBTeMlTytBYCYMRhjEapd_PlZwKoWrXVz2TmCmOEejH0N1kBnBTN0ZvpEgRlQ7MQCh2lXWlFbSEijzaPcesdRs4fzF4GBr83VAFc1d0O-9C9Cuvrw6PjktHZWP7-4vLq-ub27f2g0W-1O9zG5vCur_eGv-u9_mtft8f5_XT88_Pv45vT2ZXKh6OYxsi7P-rxxpozOnXfu7FXrmKS5T2WaphSFmSUVpdNkm92uW3xCk-lP0XSGzHz_ZP2Ri8n0z7ea1GZPf06v7siFq8tAU75sLvNBgR3eUyzvZ9AapcvT79wuTb1pjtiaqn2-ttgFoCVCkdghwf_IHaIhlUFNhu_57o1rJpiri7SF7a1frA3vNfj_38KwUF1tJ9NG1V-3gd4M1G1d06bOmu-fmL1zZy9OEPn-kK8_8pOU_8vcbF7yrnYE2r-CnDel_oJj-Xmeux62A6b5sAik_p-JrbJ9wBq9RmgPhB63XYwxQut44mRr5M98u39eb3iZBqDDj9tOqlw1kFA9nuiQa-TP6W0CBj54vN5dqCHweoYOD5S_nfK9Sfvp5K8P1P7a8pLWGcG8RxgeXZJt3j0yt9b236z5c-bXk-xz1Vddufy4RiMcq_WURO3Z6kfKZA0R8pRkrA-N0HXSEARjqYuBrNqSg1PA2jnJiXTFqZ0pBmQv20IOkkGXsu6lHBnhltSQ8rU6JFmMN_sxGbyFJKgmihAqJU228whkKYfgnUvYwbs7PNwWmm8wF3akBYmReNF-LUtOS8JMU0vfN2vho3ascAUiXEWFSkEkFoS_iJBv9dWVSRJ0WwtKWCa7H999re_2xDG8053prcVhdPX7E3N79zhgF4R7gMG7jP-W3v3XhujFGDl6dEjF9F1OVuVMfn93fHXzsnlP9caAEe_AIb5yJZH1uXlEWcVAaVYJ89wO912G1l_t1YZlD9OfecmQ-1LRgI3MiiSkfK8yqWFlpShItzNaUa0Sf2Oegn0P48-zUdLeJJq0xGu04gPIGSC6AWv-ZS2I-_uY__5X-CGil8He_b3zgBIoUB8jphyPKpacEGnalKXEluX0Vx3OBPHfSCP5D_eOnZhBV3jp5IbMpI3Pfz-QLsUYxLsqZaNkVJAjvzuX4YimvtXWlgZA4MMOY6_VTjRyVjA36dUR1bj4lx6_x5IaZB0JyciAEsM8TJ2SlFpTJ27CcFknCs1fs5qIewumFx6CJjP8c-_m5Z3pClY--OQo35cIy_oUHULfb-PmJm3SyjRapIB_tfyInApCSq7PCsZHgKGKRaF1x2sovetpfnznq9Po1vfrgyT_8QlYJs8J_uz9FaM5dFFxafIg8mep94kS8hhQLdgaU1p8wNASu__EcSZygt4WPn_khDYecyV0cHF6E_Yy-NzZpj4dsp9VQvDk9LDNc6VkwT3PmLa8SwTkWzTMakmtV4MetwJ69bMM-muFCzlnxoacfkGs2TE455ETJ-R0Ej5ByGWcojhbySwOAX40BW1BFFHUwLUEIckejWbUQLukGhLk2ITFUARkn4PDyn0MG9-If_sbq009rMUXcfg4DPlRbp2aUEqkLRrfjaYsUuXz3NBRGaVpe8XfGZm5j2kxFJOq18Gm7fCyd9jWH_mcvJia8A1n_L9mtCG6KnYwDjU5YxVzbE1maBIyPrptHnIFvNeO7vcYQ3Dwn6fX91UpJwxMe1ayIYhwbtbnKjjlP0EKFi7vDNyc5DJO0lZJUhy3t2aiZIPxX9iMxe7nMqyMX9nKfgdeYKgNU-phX595xybDScOlIGR6xph2FRFmnVDfy-jpWpwH9g7yrD43oyseCA8LwdxVDyu-EIP2Gv1dYSSVTT_sAqMLGpmyEsaQX2N71DE6_TdKDDQEzKU945DbBx_DN8Pp17bfcx4Eg56EPJYaw5KqBB6zCLQPZYfvVThCOAKopQ0pCx6NmmBG50r3hhr0yWfht2M2W36DFM-pJCK-bWtNBdI6ZtmgvIKvi--T6-KFcu8Vv1SLgfiO7dAtqwe0U_PjrrJbJfq_W6XVbPojK3lCzPdmXmCTLh_SaJb25tkAOdzvAid7r2Wb8kzlTAcACKfBfqMM4w0Eqb2h8tJT822PmxtQfpEU3wcq_v2TbojnaSg41Q4gRExGRGMnEoR6p-YPApYM2LDd2AAxXcEAz1e0Ftln3sziWHd2dxomNOxRyay4dGYpFtTskmMrSSR-evtGUuy1jUlqiMPX4ChKQufhsozDCeYF90BKf9gVJte-a83QSqeGw2vDrGLPWXGvURF7ERcAVhLZMxaXeNgVEMSSlPj6vPXmCi1jaZL1BbPPe5W3z5p9IeTzpeX5syFvLdxICFCSULlnez56N4zcuM2f-fKqzZrQ8nyL5vIYcf4z5byAdG3t6NjpMn6ITvm5c2qcVbms4-FeZJvyc-vUOAv1BY85-tR5ltUTDB_jm_weE5v8Hh0b6z8rZ8qsmi4HqGxT4xw6dZ6Fb8pwsztvs2wmz_KZPFf4sc8a-flcHawpOuXnLrH9VhC1bVN-TmV1szBrndVnrSKqIYwot22NNx7Ul8QIRrgQ9p3-dX8YsRFTpHekSUBjEaKhEOBQCmnYhSxDjR6Oy4lfHhsMAt93V7dFdxo31aM0yN3EtPXrmUnvUt0eHKdtozhhPO7dr6fzmkici0nK6ScLtFufEeFUex1vvI9a0XdoAs0nWu1GJTlbpCzd-rEtxrVUpOg6R2FGtkQfeptkThpnppFkYsPMKDWovc_F9vJC30mcRYzkMkvrSXhNnElT1S4ICTB1fVUJ1jqM8SOg5OaJ2eLjzoKfe8coM0zAY0QBD3sSfhi1BCOpGQqij2oS3mjbEd6aZWvoUUJJLd9Y3F97BW_NKg551pKAk4bX6QvxCWdWma-7mB002hwwtibAtaBmemdk13xVZI1oqMQ5HeFtwkLG2dLBCGXtYcDdD2praciKg-cKG2L8JcjK2dtfz7QYDdoKOr019WYmIRMoWgvzvmDye8PL-wWHzzjfcJj0nmUDIsY6_w1qv98kk7mVMIIa9NYdim7AxsxV0hOLOqnrflNsLjh6j26zc3jHwlhvoqjxg9IfvtbWrBR2LwEFf-SdqqnqJxzhCNHZfkDrVtmpyn6m0riYSQs4Q8fW-R0K7m1eLmWi5I4M2iQhnioqI6YuV0NCnA4gEqaQd8xxDiLNqY6EXRH_xnsemcT3wCs_wtOcqfSMkHGNkzIMyyJtVMl9wUXJe-fbRWTDgysYu-k-hkUDw53Ous_YHJht0ix4QWHjGKlWNuksNDRRlDRmtOocp1nTnI92el_Jx0QpQ6aN32y_WIrreQF4M4yB2bAs5qS0THkq8Yq8uYZjkvBOei7QhKSCLYWvSvqCvYyB4rmUx4hoVhJCxrZ8j_EDbevZN6152uQ0y_xGrvgpefdeZ0rSHxRBHh0CrC9_99iysZG4geWnkoTPrjF-Sp7_O-tTGon1C0v3zpiIX3BOFKh9bFlbqYLhReJCV42xsCvHtknRe6NCLb46q4ah3p80ctyCwSOnBCD0j0RXm4AMCuPeBOKMGVqsVKkB6CtV_hRCQPg_SeR2PQ4O4sHBBnQoAjEBQm2LKlmDg1CMmZMXwZjNGZFNiuQAsEDAgDVDTVpurgXQFe5ZMpwwDc0_jW90cp6VOl18Y45iR9chjiQ_g_-uZYqNiB8e6IDznziyD1O5wRSMY39sDP73qnFiSKIEclQon8AY_FX8YMEaz_U7ykP2aedVlY9s-Rbch2UBYiPAkSqJyH-RPTIlqfqJ1yM1kufkCOpn0XcO1_SJGRO2jaZUgJUkW0vEcJOGHfdJgWcSdtNaaQM04b-blFWxmY5ak4TSVI3sfTGTDRsyeAiBC28aioRKFYylr4cRGNOvbUohBOJLM4HHeFG8MmC41C0MnpCaESCWYxcFAg8_kC4zOY6BlyWnppRtIFm-CCw6waxSdHx4V3999-Yu2rvQzST5HZENFXyQRCysaL-_y8CpZ7YaqI4T5Z_6ks8R4duxA8KGqruwQAiDWkod2IxGA0U-nSRVbY_hfU1ChU9qfbLU_AFA0Cam7ERkYgGJFBKqycApxOWXIk1SXDxKdTmmaTXKZJ_qGoO__uPfXWBTKcZ4XD7MyThZ1xTJxsftePDnOFh8Ipsxz8acjflizA8CTv4hbXlNUD5vr198fcgyt89q9v1hyNC51yFDhqvF-N4udzYffCFtdqHZju5_cDPiVJQAVv4kvh7XLBtlL_RmPWU332h9JLDbljOESOp7vP2HXFxIwtE72EZ642JUdtd4Vr9woLc2bFwyu16gdTj0ZaAMyscG52uJpXUtQlNJrbaPE3OScBt-WEs-4jfoaTHZkOihlHAT8Xtj2F7Ap31lH4-98fZCNF_bAUdtzlcuCF5G-J8WRY-Do5ozssjQuRYF2_P0wGKO-_RkGWKngAtPFC0mKLs3mUecRrrK9BkAbDXNiouhzbDyDH1Wb79ohyTPbLXzW4V1_p95Mp4rvDuFCbNppJZnxIcDKVbzt_HF9co2_cdWtuDNu1p1PUHklr-zNDXbYw17iKubrY5Vu9VyLq6UohCs-L2aodB7_-KCRrUC6BFgzJG2qwEFZVoeNhQ1mkeo8jcSVWE1BKCRKpFTVXTedEpdw2aTuEnC2XU_h2f6xqKMRHkJUNWopnarCxnQL02u4YQCCr7cj-FaFEs0xtK5XfTib8tStv9NedeTpO712bq050DXDdmdpCeZAMhkr8fruEsKW39eNKWJxsD-its0pqafhwPO7fiQt9FjMZBKPtTtUgPENCbInVhYtakzhZvG1wS4HX6xf8OEA-C3DteNKZkutUILDOef81HCAgEf8V9-Xx9_13Hy35tLtnO1frmIwYQZJyDcUyc-bOFB_ANwWPBj9vrr8dDuG72_9jDrJDLls7GPL4m3PNsSHM6D0_g5FfXQephG3bpC_1TiIE8kaIwbuFDkUSTZMGMbCehCEl91WBoTgF7AIFs8F0NU2Zry-3WrcolcFU5VPzo1tGeJxhmiG8o-XiV6IXUJ52jqykShEtSnOOmvnQZh67Egs6veS6bwYhKN_rTa-bQu9fUS-zzTSJmHZ-13ASqCCVo6V9_6KZWed3vtaSheEU3yKX8WRINiTBxpxP2zXb9GapvwF_ap3wlcys5zTPusqt5WbrYHVUHJgfgNJp_gOLHKzF_3TJFBL0h6p42rQeurLZoIZC2CU4PXKPENAxscB3u9_yTOL_Cew-gbZnEvGILrfiO0c_Ebbe846PkNx7N3LCiGJclQPg6vpYFadp_vlRIWmeUPgSMKPGMurxsu1CcyTWdy75Hra6XSZRnRxckdShZJXiKaV9nr0z_p6Tp-aqapQykm0AEm7Vyta9N4r49Dd-VFmKiFl5wmV8gJG3-BtXurHXrQsOVd9q2jMTrWQv64NveI_F2IGqz8R93I5UdnFFGpoFeP4cd9uzj298e4y35vlLLbs0atr9KiG26rYlD-oCmjnJ1eB_NE_ZA691GbEaUNIxLO9xHLqcxsOFvTm4PrsYeOnXwT3p39ai9hGrslxMQfKfA5NHZ7IbRogUGXcznVyOSpYGwHmWTPHmAEfT050VN9E2yrZOukcPQJX9QwoDmhalvOn5wjxF0T1hQqSFBAmvgbbn7oMF0gbkFNozwuRSh0r4eAotOCozruktMKkz4TJUSBscnimF9eUvaf-DxPegrtfSxeoSkiuywlNbppiMXsQGkcfh1-g2nnSd3oEpMOA63SFKysvxDu0gAZpi1W3E5BwVSWloZsyVWqQ5Al-aJT7Hefdkm5EdibC9LFI52FKPUDCVHxZ4aWZigmnWeoP56iLVhhl2fDupGPAiLCdxyuy5eE6Rd6m37a6XkQoOEizR41JlqfaP5dBOC899s-GfZ0Dbq5vTuxjyp6xEYFBaZhpDaN7jmLlyrTzt_BGImQKhLdMNJHQhZAFYA0DFccuVtvaLV_sAeTZ9US5mD2M8G0WiuVKB_fBSIVxkjNE306PAaivAUOoKt6gHcv5Il658yUy9ljkqpAFb_prIYlB3baMtP_tHxl-4jZp1KU6BMPye2DMyOXU6FAhco5rtlg15gdBjUXzehb7xak4OqxYqN8-5_46abKqKukmB6lRGn3o8zjK7rptN7K78kgWDQPwOsehgDA_cvxXCEuHsiK8ng47ql46iiNzWnSDsNYRkR0RhTf0mCkr7SpMMpFMhgxgyRMnfH-onYf_CEIc0srCn74cWBqBEZc6QbNom8KYEvY2kaw6rgBo46xXobsL-4I4tFfwiiNyqVsXF7S7eRfOtA_uR2AU5zs-n-7xyuAvjWML8dgW2my7wYs1SiwzyySvq5rRgK_qKElDdaAgluNygaDpCW87WPx9_ptt4-M6lmzsSYo90HUZNe-raur_oTzyv071eZfg2xrHPHGgmaObZefjpkZQoxP0v7cg1Jn58F8sWQC_y5u1scmsLEVsUhe6y1WWtgOiQjlEQPanVRNVw-l5qlztQToiOITl01jdwatcuMcYWZVJjxMMI7b4BxVW48c_A0a3cq1jfBviJg5et_dgLu3QlVEW-ZulAb4Dhv7yWUBWyI7hDT1jFat-CyMIY4PNAZYpHAA_PUdhGsnPFvwu0SzRnLXiEkKAR0ATqYZQJHgFceWAC_DnoTGEnr2o6wqHDQpeiIS3pt190HqIiczJzhlqWg7utLq6WgFSK4XtSiiImlC6XXHFU4hSPAwUgJ6JX0O0NMIyUjEq2CcmNavtaye_Ckut8bVhLs80Gx74AyeaZTHmoO0UHcUHd5oBGT1UYeAvoD0UsZzA1urbZeQFmVdebNJdXmJOH9KnsjhEp13Rlel330g7hhuN7WT-JlLvjCryqod6qLpNW01lHIVcXemu0nXO5UoWut1Tor_6Hj3eVXqDKlXehX56eoq1q3MjhoZheXy3q6bB6gsIhptaIF_0ZelEqFAL4siE-ZQ90toIIjSu-6SrsXF_s_AwGDehy_ZvNCeym3dzKKsy_XrokuQIQ_afnU3dn_FuD2Yw13pVOqyDEo-z3M5rCFCaLWWKfmgv5ByWeR5zv7_a2RDxBlXLO_IEAVmECiwKejFtFqRNCSCiR3RitSaAC248cSPt-Nf3zqaC2q33OadMJC7yEs10x0vHeUoQOtEMQEWKctuLpJIO24pdm2qO_UFvXiNn5L2a6puWvHdQSYs6LppTXliIrW2TQFXeScE8IHOMzPog2Y5RSeoAhPIrCzrvnBsTAvN0zaZ0FrwPFZWEEcB42YNFRjSGOWgrfizSK1CuIUNfQEIihgy5c5PFT0bSgJ6GvMjmgkUxCbLED8Q6RnOQ3jMDSGh-0JGnE9p2DEWwoZwyLXsi0AEuJ7L27dK8aht0fLADm2GxGBsjHvqBoi02DHp0g7KYV4vjRp-78cgcvVdEn7y92kF4boz_UgHpb7Dn17hPR0vzvEQwOvXdRlN4V6-s6IQJEBcwsr_xdwEqADNOA0FRZvPN118Mx13HiMUgtRxPqubXThJdpKUu1e8jZMOQHBACiIcguU-TWZta0pGZDjeCfvRUnOrra_WAbke9qbxGxR-IIJE9zZyA1GZNs7MpXvLEySneEn0w1-lCkaVE79kWmiayEcihEm6Q2Mnq8G2NaKuxhFOdrAiKNLkALmRPdL-yE9FK5j5dJllIN2DV1tkX0470wWR86m11HcMMbGPfJGxhqjrgMt7fJKOXyjvmmm8lvHpZp9Ruo5GlPJUuAjzc-mHvZaYvgvSJTfRRDKDUtJzhthwbQQMlpIFPFjHrIDOQOD8-oLs2P72-GAjkS8lb5tDpFUMR3yKVRSS3EoiwkSH9xSgaVK4S4BHH_5FqVkjzVJ-IpLvy-pYctUDCRYJcxGNB4oW3KFsSSlR0IwuW8V01y5WcBPgt7Ok2MBJlpwp03EmIhNemf93iUNuKpf0LMVjyikaJPiRMT5MVtsRcDSR-gv6gK81CKuUbniJpK0oGi3X7YFLlldYuisx6pCMNVGUpcJw51wsA6N1J4DoA4HeYwA9RKegN6WvbiEHmE4ARQd6BtwpZ8PjKf-BRHlekCGfg5gkLnnt2d5wjulyT-KMal0VAU1iTOitmn3ULurZ5lvOaplul8J7lIoT3BAL7KJHEZJQNnaeaIa4q0qDsYZoKg8G4je2EdAdPZ2wLnnnW5CUlyEVOoLcmmu8wEeeCuBEvi0N1VXHBgLym599s7OsMyhJVqjsnkwSc-9IyZhOeQy6MtsEfT3pLiNztZeJjNW4bIo6YXmFqwH2rx_gFLtLeJwyNzgXq1MkVsjmE11SZ0E9jI2e5Oiow-4ShdkQESsBbspN9NrjPkZ9haugBWi2buhkObEkvRbvh_v4An0dA41nDQQPnrhqCjSXttYkiG3BB6Llij58_tO9WDz6vHK0PNNLH9OLiS8jrreFnIEoxdXGu9d4TXNkHNuy1PEvEGBX0blL0-fM56uyrOr89EuXKmSKcvJJeu3byeNDU2cNptpeAi8UKNA3VRCcSsHihuiUwzkpQhnuBlX1-OuR92LNpdS3sx1UA2mkG0hpsUlsnpHq6byediaSP7heB_wkX0mPIkz6TvXLd93NvhgIMf42SFE3_9CZzj7M9G7xrF2vkn49CyvaRj8Ipp-CB-h_JFvep2zLGv9QQl9YZLzpT72Tl79n5YtSdM-DDNfygw9JyXwMRxrG-Rl-gcqfKrxAQp6nBntEgRefEDfYuc1xi6yhJNoEcWCwvtZfd7akLfTndmiSZ4Wqn3uimVBtNIQT2iG6LCgt_enJZ9VNtpam6DHNZeigKUtI-qs_2dYfQDcHr1yKWJNAiRhTKl3vrEdnJc5PchVrku3FDw2n59Pab7vUG_6RTz0lK--kBSB--Dc40ufwCch05Uz_i2B1OSO_1vek4VfnR-hIPUljYH8ik-aAoCZyjeMXvY4Xn-QZDM6QjAzOqGT1sDd4pQYDpejiUmOTbwQweeAZ1r9Pxfvw8ACuB5cqkfHWZ2dL_82rI-BL2Gcd1z60TO8GpfVjAOCs-wETa_C87VJ73sVDQzx2IMBDoaHBYeLM34Gq2dFIwQ5tNCApWDXCgXrQhhgTQIMAPCDnqyPIrLCYNDQcYGcq5FLP0YSkVXOMGBDGc5ZmhjWXW_WPiqplmQO-AZ3GqY2VIjo_77zrhmZ7JK03Z-KzAN7Dll91VLCDO_kfHllahIrCUOA1nXZLgCFAsbUVKtro8MtwhsfbW3X6XMbxXnR7dfcS8kZHAgo9er35DxszXrHp9a9VnxAfZUhUqhFByqzXBbcN3GtULpQmItDgSmtnGrTHWlLiO5tQpRt65WIxPT5I40jteae3Rb_DEJpWKi5ouJUB-eortwIIVRhCPcRCCA3S4iS8TXBfxY8KUa8o8b8pkT73YTJME8pFONC_Fe8MY8ioC733r0TEQHGKow45WTVazpj8Ne1-FiVxQO0VLvNnO9gYpI4Rjn3b592gM_6z-jOMNN-DHRPxF5JGtvgqJaOnRCjzC8WZBHjW8Y_AApbRsbmgUXMST9PqVb0XkfOH6fMwMzh1DTqUY21k7COdRR9BMrCzELEP9EBBuQFoZHWf_ZRNGw_JX-Bnazs4HdJpOCe6vCbAcvxAURJSfjd7w5fJ9Soqs6ojHX_HvHl_6P_6huaoIYl9vhEbJKplFRI5CX5-E1PKdWPYEJm4pPfDMOcmLjW5pTevmt944l_pHqsFXuH9DQ1NFKrR_ozspdQKQubfI1shaRHdl8oEgcfrQ0QOo4pijHbtX6Y_v3TE-6MfUyPzR5PyoPkVh-QZY1geUu0oANDlC4yQRL_fJSPDpRq1FAo0dRUK-vNTkB5PkFNBx-rUnsGO7gMCgXUT021TRx7i4nOqGvDmv0xmJ10Fqg2Kdwl_UH5Fl0QcFGBNwPaGdrp7VMuFk4AOmNTbaEZoWWYYOXjNX1dCm60OZ438Y4hSNJ8xqJC4G704CdV19Cf5AI1xgAaGV2daOn6qiT8jVKVJ9U53FJS86WUhAc4YdWUH4eCrqG1iuDnvs2UnZqt7IZVbHwiesw9h5MJbHFkoGYUu0lfIqvi6doYOhQdhhwuYx4VQcAlLcJvRySPCmIawW4h4gxoHOA9Ip9RE0n7LO2Q6IlZ-bMvo-E63gKk15G7BRw1A5u42HWG-1yQUHFrr57EIhQXf-Low2yGRQ-uGp76cIb9uGfI8cey3tPm3wTynLCi_vM1j2R0uLG3uGZppPUw_2oOUBfmh3jD24KUxJ3eDg9jNd59uf-pm2YFm0-xW-9K8w1dU-zzSPg9dcWXvitJIcjVpVXvDIWk4_1dsZHu7qp35UuKWfWIHXeKd64cAnCqVX6DWooPdZtJwiPhhNZN2UbErYBrDsBp-ELYXAVe_PCvvVH8cGvH6PfQcbX3WsvOH2QNeGw2dqI3QYbFtK-XNVqMCXN33YAs3kgvOGDXQEodr9iwlTLPEz_f1gtQVF8W3nLQhHd-SI1NkkjwTsSnPIYSgMWt610eakO7YEuv8NZjlr_PMUsZUvORZQm9kbpOdH-dGizyCG-22PNoNEiJQLr43EdPqcaw9qJ9IkqlT4SLb-G5SJS7Q8nNJuuH6saorKG9NlCftCHCHuX7Bytr9R9eAUr0Y_hpCz4W2Gt2yl3reCLvEievDRG4GThPPpYztpzY4tOcsnYk2Un7VBti95rv38-zntvrjkE2gMM6MiP5Mfqs6hFyJpQ84c7-teFy6DLT1K3ghwuSLH6Iq6EWel7LamQxW1-3ILcjV-H5UbrsfDnCuBDclstjiXAf49gJprmHD4_ro5xGm_xsZpnaZdrKar_amE1lOFz08KrTuE2xhXort2Acp24BCWNgzwF4aTebsbVdFNHoqlRRCwIufdhYSSd9h-uAC5LXjR1T9342WxZhL4q-gPsb_m-DnF0T5sVMr9ECDqZYptbwILqACr98qgOQhKPcsukUNhkr0ml8wwDBN5usU_LrZ5o8tKILzZU_hIeleNAiRgCyjBogr8Yf2gVIbdmpqCvaqnc_Tv3Dx7K8tEpSbv7KgnshBa7O0WLNfcXrQOZ51q8asnLJHJXq2piRq38q1vUBpLda_m1LDUtXq14kK6YMsPuQC8TdKv-nF5Z4TvLEmcOb2kV_HuL_3bzQC2nFoW08kmPmHkjuYBBwuFOP1PnTVlNU6C1mkhLASFjPmUG1DZoFGVEbIUCtVCwlNA-q_SH817aPRe_9-n6M4ei9ceJPRLXfKWg3yHEDDefHU6Z2Js3F5xpFVLX-k72_JTJvlMsBq_Gua-06cwB9nhByl9OP8MMVQ_Gv_gmHvfVo91SbPuZ_-zR2rBICSF4yfC6SIDEeXsY_q3MNhtd0t_9JPSyLmqRtDqBdOO4-ZB9_Kb6G1jUBHVdybNMAIarDHikGbpqRidFgv7QGmxtly2-Uh-7DSYds4jurgejpkm00oLHS0X0SuJWtXfSTPsBG2w72p17To3irA1UHCil6R0nKBc6jVBPk9emVmk4DPm6wAfSdaXp1TCdu0wyOggAHwdJa5EByiuolUKH4Ihxtav7Ywghlx2-tQpLvCEqTuHWkdafIwR0hRC7ijRAD_wu7CEFWPj-6z9qMLwOXYqp_ow-OW1QmHU6iudBiFHiEjV4qUQVhw2X9YNewynWxoB0IVb82qqiBS-OdhbDPJrOyefxMBH84QEmElot0mg2qtoyuvMfbd_TxazkdSLzl20ReGI4BDZQFuT4Zov6D4U7ULNc09o7BlnJPFQZ5YYVelE6QtggmdmtNDkEct_em-JwN1nVVqKLjdIRZan5mzqhjDS8DEVs4j7DBuog_DdR3JRAhVjMemWuDOwsEwHnJIpQjBheOGMA1FMeQLZrci8Mm_h2mBzrTKRL7gHqBTDM4plsdi19cTITQqn9GgUv2k3h3Hcx4x3GJDQj37Cm3gTkShQtBB_zGBtxuYYf3753g3l6U52XjUSekVOD0VNdLrpJIkQlGVyhoI8UnpJxmfMq-fRvhhs-TuFASCkiOLOYKHB8VRTHyWWuVxhP3Er31Rey4dVMWHkU-JZP4sSh2qT2kzZplScwwnMntmNAacsLYU2vz-IOSk6Ymm7Vw2ZkfnH_iiER5WEEuoJ_7et6x9wWdD_ajLiqDzBzwHaLseiFZIdR32oSPBrR32aOhoZPmR3egdLUFo4kviR5zc9pfl_pdB4fhA5SPe4phuCpZ9KWfP9NO529NtT96Hb7mSvu7QEBXSX6mayzQ917YlNN89N-ks8lkrMnNihHeZIZh6XNbApqPWTt4OJbcatWEzj7q5sL_AA3As1Avbh-APl9f0OUI1dg4gaE4TycEngAe6MgnT0iRfMYqbdKhxveiYdaJP-E6TGkzbU4_hyVbkwVigy8h4CA71ZkNocA8TpMfv2ckNjE3-jD_uz1wnh2jb9d8h2vr0aDvTEiHqpm2R6JmGtOOVm_Iz6oCKbFYy3eF6KvqUT-P8tQxVYKBQ_gIcReIy9JHj1D1ll706fuCMleNWPClWcP2Rx__FCv0LsSVim2ErEcFO3AWKCkieeK6x0D5JqBf-Sm94jq_Wd_o5Yy0ZzIFJkqj3j2-NMyvYTxCVp8ApxhbjSZpfmC3T_bfcA3CT26l0Ck0mC9f1xqVsoQ0nvMrujmaKgJMtPAke3KodxtQ_efX-zCf_5oMMi0531-gkcbvu0dY7BYFKEOQhbw2xC5DUpt__0Z6xPcMFu-zDdD99fuO87kuJHnxb37GSvoqw-_Iiw2ZNvkXJ0SHOy3iwsLJZbozblKxPJnBCw-HI-9GJiMFL5FNicZhs4mSSVRxH2h8fZOk9IqMf98tRBceDKWsOc-t-cj9jkLxv7tX3Y_PjLYo968YnIwKuy73EluQWph09sYaBgQzF2v_kZWN285yjwIuRJR_HTwrgPs0ZN7UnHB7gTBRU2gHNL2tQ6hlGF0gV_VDI4rZsBB7Kqa3CFO9bx4fBldhYOfoLENBA9cMYvmz8HkgIvk0OktaITUrdVvcfiYJEvLPaZlYjy9Z_ip5ifxInLomlJIh9vKh2HO5sfSxluzqsSnzwcV59iHRAJNOSkNlGqmL3KAnRhHo8VVkH7GYivanWqBKHmsSQkmIlqlqi-PhYhbUI0GX1xdvjK1_PPficaRLwvS4cl6igUtgXORXS-Rf5SqZ3EmRHaG7muJ-G-V5g-f1SzrhbQfoFGxsXEF7Z7cK5Iqu6oRSH3YuQji4dxdxqPWdzp9XIn29d7Ska0bG008kaIkUuZuNiS7gBpkEwBKSPhJX8o9uvPz3LmtktPs5UQudxyZzP-pr3oCiF7IVeojpOqUTeybtTbnQUTpn1_sBeSxVxoveQxGreK0uiZt-pxTAcXLQjGTI1j3n6TQu2kH-bnu5vz5i-sZ-yRT4-zQsWTuty5yy_zl4Xu3yov4hEe0Xfu6n6ZozP7ef6zcqkkyJcQbTC1jd79bR0iox38MSRI7Nb0Up-9W-zk2pLCxuyQxs9fITNywCUWcLtOvGm2oy_sI_7Ay_NBg55qBmECrS7dvfZ6g51Wjo8xcuMyRwJyqDPm_AA1zKHoHVMubrit6G6Z2jDYTuT2OCwhkimMH3FFtftMDK1iHqSe-ql9bz7X-u13ZnGSecG8jbrqCmmVO8FJZGUk_6414EDfYH1zDHAqsm9jnGbYYSW6OFSlY5SlXuUFzeUQ1q1umV6C1dExk_o64Qq-KQItwGaMW6ubkOpwLxVtigAU9ct8yovcb-RWS_dq4T6i2l-EK5y86t7gvMnDlh56DJ8BNJzqT97e3P3_9-mowdfTdPklW__U74F-6Pqu7db96Bpk5i76_6WSmlUw8hNf_5SDfFd3QHozS3ucnAI0PcnK0uKGnYLVuSxkWOjxc_CBFTsPPLjfkJ3jX3UoQKLckLtv3YYNyfFFg7gS59Xuhxci__NuX6tUTyHZQOrF9cTla7teDRZsYf8ven9yCFfw_ErnAncSEnSUvDKrfjeVqfh3dL2Z_h3vHWPQwTXRS13BlFLjq1ZcaEl9DkuVt8wCXyQ4hWbtc353T6bx1Vm_HkX9Xqn7oAzuBHLUC7KqleNq6q2H6a5AGrcTcN6zVY8O_GyZi5vpb_XkT56s3_kvHYqir0d1yYEaSaPmNTavriQ8b_2n4bm8phHQr1hk-61qNvUzsi9q5k7P3-r6jp6e1UH44UC0_9SQrCk9Kq3wPQ74VNjXgqywZMQVRKrrGP95XpdHjTfr8-WrRK0aqNhzvf7vS9_yAv5j8_k99pP__FNGWPk7ezDJVz1D22-o-d68puf-vp9-nST5PrEC5vjl80a_4U45i-xN3_0zFPo9tH7pC1dMHD7YDqzvX-hUFj_7vFP_hF96fsZP8EyJXhRfPzQ_vNZK7_omVVoP_PL9XJ8NC0v4p_lv9-Nddxl0THIqG9NRynlHOsXds5fHPfWLJyfv6wBQm4kVYqoai0-W9WWfRCAH5-4y3lCFVt1WTD1bwJwq_-iNw4_f-We--IzviOnuvcSVXzKy490HNfIjcTow9XMaYA-sZJm8TF0Vd0XN9_ZKTJIWGyaLuNsbfqqs7C_LPcSlu2IuzXYDFoAoOR4qfLvZhbEd1CSqOL6pIRDWimtfh6BjuNCI8886nIFJ6yZMzmr2mfpXHOARxkkfCJptlm7utYe5k5AC-CQp7sC-L7SNbV8d5-ioeQn0XlgMpRWDBX3EycFPqdhMgKQ0TLNmCJC5GluzGpl82Ajj1RjPkYGmgJ0yRhYXRZtSOfxv45nYX2929ZYzr0lTpjtzLTDg0NCNGVuQqdzgoEUpunZ3uFBjEb2yeAtkojcSVdJN5xGhXyZ_uJBLe2khBM0zP6JR1tTpPXz0NWLWmjycgARKKQBR6aCKtwTPcN96N6ydi_QdJu4MxCVJ62fWsKrtwCDYQCRMSw1OwxtE5V5OoxDgnnh_hoTNBB1xP9JpDnMuzC8GFsTF-a3eLm-c4wZm-uZdj5yxlOfvcKJdNtwYjHoiva19I4FUnPO6wZEKg26b1AhtjxWS63rjBLwo7PEo9tR4QZvO3LZoD7ORh2zgzTMMVY-pvuCCY-WkyXI-fZQbfXr1xVfV_41vx0jk8efaSxt9u3jlQEzZdk5pu04n1_0X8lNsX_kSr0LNK4MJy_uPLMqxkCISrMWfPOs-_fx7RrA4sE1FFNi4DTYpnFKvt1qRKNX17U5P5eKzLzKMmPVPVzqeKNaeYox4s5Pr8tmQtC3pt8-vP-bInXeBo9eTGbV9SgBGR1731RJGNd7XnyhEP15wf6yUrSJ0HhPDO3U26KRIOtICRU2CTL9LanrAGKCKDXLNn3aTp_AISRY6Z4tU7F4cxCCMfeG5UQIwfW4pmtBtMDS03PFvUXPH_U8jQF1kdrI3161JuoI5klvkvLuYnJV3QBkOKrQvp9eiVN5PTe2AOdmTC2d9ATPyFnLqeAMHiWq6UzjsGXU3XjhIZDriJsY6yyiS5o6NHe3S-cNXaNIfSajUlTsH-wImpZ0AphBM2tG10vCPkrD8WqVlnIhI6faCyWgyUh0p267p0mWcQbi1hRAt6vG72FzhXMjAgakVOY06tLd7htZTnm7fUcThVA77aJUMIVcJxzPS1OAhSvVDovnkp0-KithDTeyyiHyH8ymQV8OAdcRKbWYR1VuE_eh093D0GDPS9ytmRrG2lc_LDM-vILTBYXpgxbEfZDQuBFsuPHwxTe13EETTXaqZWhHAdNSr6PEfrgSKQMZDU_ms-Ot0XtNIxjgAbPxJTNyay76A6aLO3ilxJXuIWcBs9qY14EyNveEJh5syODBYd6zvqSe66tRHbAjGELejTOvViIcBrzs42wOcmg9XYkHmfpUWkV9tOv7ATJ57-DQg7EdePxD41dW8WFPyKRFiI3siksy9tQ78LLqrrS_7IZv5E4vSBvaQ-9sf2iUL1rZS7KslxyaqOtqMCL1Wobe3zvSvZGFYbQXympxEBgchHi11986lhNp-qwxWriad81X68BEFF3xM8rvj3V_xRXwzbpjqRRApLufoN_gjvz9hjXY8WMxpAJzB0K3I3mexBdK1upupW2VHVLMx4h_uyDqGyWXzfpSbajWQ9IiUprobKZ-o-dMGrwkr7gL7kXHBZud6_jiHVzm4RtDfYVahHT6CVn78dl6_8wvxOzeNwBjFCiQAq8Lx0v8BA2biMB3i-snz0aJbSkxdk7aO4Df9KXIzxEcvqlMQzhGBCwLrKMe7h0ebxJl1h4iXaNpjLN-SQsj0UyJ6jpzvlk8T_yAjHgtmkSzGHISM4LUc9bDxmjUh9EwuaUxtgW2041pR5wMQx14ZBIV2t4y5mYq6MpBpCrVVzci8oinB3hCxytM5wXBnS_OcIwpxCvkgBC_TlJ565FYUkew1xYiUPieHRjuS6FCQ38hE4q-Um2Z0OtVHgvKmmhlPzC0_m570jFrE3UxCDsyBfq7dhjlfoHJ8rJ1AEtAFgox8DT7RWFgzr1n3etm1J5OZXttdnPARSDQeGevUnRnQJznv8ejH66ccuFTyLkd_7JQWBUKUJ4qqmv0GBpkYoKSF9D_-OCjI7g5UCetWQJNTm_JQhcZoSpMq3theFdcEAOFL2mviLqYh2A1AJbsoxgy5RPmag4SFbrc0uja91GtiM1jeNqvUcmY8fG4ChBePpVDtAkP9ml0JfmTjOF17eoRHv6bFqYryBSmqtkLrzdlhIPfVdzYAvrVMmQdGJV4lhzsIXjvIN7cj-vmisvH8W31NfU4e5E4lPQp1nH5rf7l9Z48yn_YHL6X61AfSiZHvrj0b4Rj4Ln-2KOylQbeMIFKApjR6ReUwce1seNDQLBh7vYSYrDM8XMuMBUe91aTJ0WpJJydKwIiNOZwT5HS7kS3NNgch2-flP3Hhf1hPjMMn-emDprPO64kMDVZW2qTHSwBCKDUTCnynqIs6IcXI8MhS64hzlV7mlmdQYi01SCtFOElsZSnYdQFFHyUfsQi-gsWEKFc270l-V0L-poie2G1bX4swS0IPxL6qGkwm6urSOj4BMoqN2NRijSyOdCk0zhwqpo1K75rPdp1IGiH6AySjdpxGYdmvaHl4awrK24TaG2cvAToJV9Wl4YnNpEcQyNUQa5uz7xYCZ50r1UsSDzHBR0SAPohg4gF5Dc6pgLwkanNd-SFeWsNsaQ2PZGcJqytxOlT9eF58r2lOjgcwAKOobjJj7XaDn1SPHN9eeFooSmSjDFbHEguNMK8mhm8Su0eGubI-FT2ecRsQpogoS_oDoWu2kqNRfJs5sBgjuyrbRYq4KIXdawkOrkJdOB4g3jvL6ZxEd-KAOzFm4XctaHLz0PPSN7aj6OIbJ8m2PG3b_AL-QNkfLT4OCvU2rEA9fy8WtwdxWDgi1rsG7tHPMewqpImzkgWs-gTiBni8ZOWKOAnK9AozTNoY7Fqewh7SUHeuZXqkg-tPvripFqtiHhKkZd4XQuYEwORxWuXCC-Yqr1dPjBrvpphbZZ4xbyo3UkILeR6nk1t2uLynxGDCol20RlH5HU0vewfjx5-1-E3bsy14BNNf4fMRphFOToUQ7C7n_ZN_2Z7784IA_3pgEk8jHbEo8y-NbPwDLBc-4OJyxeNEWY9p1QFicCh9jHfZynGz5A1L0hqkIS7HJS3wRdG8lf_w0dje3ynqYwcBb8U_lWnr3UAFVHHSiraqK7gV-31D6Sp34ITu959lfr_sq9tJQY0gjgDfC_L2v82hT05uNJEYC-GS8Enrxvg0f25RvIHjyptrxXI8GuAEVPV1KiNMX88LEWEwhmxsP4gm4_fG1_tMnHSkePP1ao9NuD6dgYzKHPAV3OleiqN9T-72YzhcVRz90nVZYbGHbJwedvkRlvix7n1nW-mKq2IxXZCDsb8kPtXOvYUjtuo1SautwyZlBIF2kqJ5GMBBKhj4Z_VpyLayBWYVtpE1kiwOmnybjMgLPm6cZiq6cdhM2VlDtEVrrHYAdrMpCriurdBRAm0fqNnS8eHwanzJ7p7OfKLIU6oeK64IfG1bvTJrrr5nvjerDiKoXbcdpv9QmfwD_lXTFdM_bnCELZz9iSD4Sc-IkptQBzLurh_iVUUsZD9GgUk6sUqWv6CN4iUbiEYYyXIRS3tqgG3WBmq248HhmtSUV-2aCssTKdKqfG55ctREE9CFTUIDDx04E2Dxfye9BeiWbMielSVJXKuSPuyZP0dreJBPWbVrHystmBNyHJlrvyx0ZKfDepfsBhVNo66T6lSN3NEgpm-Q20Xo3NQabsxvKcWYUGeDpsqF-ZD-MWIUpooIbTG-lfjJ-PdUS4toETnAJuCUAbxVuYY9GJblST2WzToI9R0t12wYJM1ZLUcC1ZPc0HHefI9ycRdJMQHSbSIUkRMWXhDOcly8B9WQUs2e4u80sW2t5dXA86gmKd1ka20NjGF2f_lihkSMLVfMwVsC_PcKWPvw43I6CgiA9EHVePqEdYK49bh0uB6KhJ0Gs_8MmQbnN3mUCmIila9Agxy1QjI7M3nk6ckA48S03GOquV7p8R0-sIxitGwkgPbG5PW8LOnm8sNIhpsG2MlLqHqiFJ8GU3BDiVQCiMTo1utaT0M3ykvMJBsw8AAy_iRHN0iav6TPZy2r-YaB-TADYGIsBKgGZqESnTPmTKttCilnXopeqt_6zKVsmRqBt5KJYn8AUKVDQHvAZyVLTk2Ca_KJk_Ghld5vYtMEsIB_CnvxOmQhqCyKzEoYKtsU2e2i5YaQcUjPM9k6P7-bL5KT2PvdmWuuz86fEKYErTqanI9SxDR8zOuQTrmAVYAOIL_9owfsIrN-AI"
    },
    debug: "(()=>{var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,x,A,N,O,W=(e,r=e=>Error(e))=>{throw eh(e=rf(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ew(e)&&ew(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},B=(e,r,...t)=>e===r||0<t.length&&t.some(r=>B(e,r)),V=(e,r)=>null!=e?e:W(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),L=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?ey(e=r(e))?W(e):e:eu(r)?console.error(r?W(e):e):r}finally{null!=t&&t()}},K=e=>{var r,t=()=>t.initialized||r?r:(r=rf(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},H=e=>{var r=K(e);return(e,t)=>X(r,[e,t])},X=async(e,r=!0,t)=>{try{var n,l=await rf(e);return em(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!eu(r)){if(em(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Y=e=>e,Z=void 0,Q=Number.MAX_SAFE_INTEGER,ee=!1,er=!0,et=()=>{},en=e=>e,el=e=>null!=e,ei=Symbol.iterator,ea=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Z,eo=(e,r)=>ex(r)?e!==Z?r(e):Z:(null==e?void 0:e[r])!==Z?e:Z,eu=e=>\"boolean\"==typeof e,es=ea(eu,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Z))),ev=e=>!!e,ed=e=>e===er,ec=e=>e!==ee,ef=Number.isSafeInteger,ep=e=>\"number\"==typeof e,eh=e=>\"string\"==typeof e,eg=ea(eh,e=>null==e?void 0:e.toString()),em=Array.isArray,ey=e=>e instanceof Error,eb=(e,r=!1)=>null==e?Z:!r&&em(e)?e:eA(e)?[...e]:[e],ew=e=>null!==e&&\"object\"==typeof e,ek=Object.prototype,eS=Object.getPrototypeOf,eT=e=>null!=e&&eS(e)===ek,eE=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eI=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eA=(e,r=!1)=>!(null==e||!e[ei]||\"object\"!=typeof e&&!r),eN=e=>e instanceof Map,eO=e=>e instanceof Set,ej=(e,r)=>null==e?Z:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,eC=(e,r,t)=>e[0]===r&&e[e.length-1]===t,e_=e=>eh(e)&&(eC(e,\"{\",\"}\")||eC(e,\"[\",\"]\")),e$=!1,eM=e=>(e$=!0,e),eU=e=>null==e?Z:ex(e)?e:r=>r[e],eF=(e,r,t)=>(null!=r?r:t)!==Z?(e=eU(e),null==r&&(r=0),null==t&&(t=Q),(n,l)=>r--?Z:t--?e?e(n,l):n:t):e,eq=e=>null==e?void 0:e.filter(el),eP=(e,r,t,n)=>null==e?[]:!r&&em(e)?eq(e):e[ei]?function*(e,r){if(null!=e)if(r){r=eU(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e$){e$=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Z?r:eF(r,t,n)):ew(e)?function*(e,r){r=eU(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e$){e$=!1;break}}}(e,eF(r,t,n)):eP(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r)=>r&&!em(e)?[...e]:e,ez=(e,r,t,n)=>eP(e,r,t,n),eD=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ei]||n&&ew(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eW=(e,r,t,n)=>{if(r=eU(r),em(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e$;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e$=!1,i}return null!=e?eb(ez(e,r,t,n)):Z},eJ=(e,r,t,n)=>null!=e?new Set([...ez(e,r,t,n)]):Z,eB=(e,r,t=1,n=!1,l,i)=>eb(eD(e,r,t,n,l,i)),eV=(...e)=>{var r;return eY(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...eb(e))),r},eL=(e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e$)){e$=!1;break}return l},eK=(e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e$)){e$=!1;break}return t},eG=(e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e$){e$=!1;break}return t},eH=(e,r,...t)=>null==e?Z:eA(e)?eW(e,e=>r(e,...t)):r(e,...t),eX=(e,r,t,n)=>{var l;if(null!=e){if(em(e))return eL(e,r,t,n);if(t===Z){if(e[ei])return eK(e,r);if(\"object\"==typeof e)return eG(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eY=eX,eZ=async(e,r,t,n)=>{var l,i;if(null==e)return Z;for(i of ez(e,r,t,n))if(null!=(i=await i)&&(l=i),e$){e$=!1;break}return l},eQ=Object.fromEntries,e0=(e,r,t)=>{var n,l,i;return null==e?Z:eu(r)||t?(i={},eY(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eY(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eQ(eW(e,r?(e,t)=>eo(r(e,t),1):e=>eo(e,1)))},e1=(e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eX(e,(e,n)=>t=null!=(e=r(t,e,n))?e:a(),n,l))?e:a()},e2=(e,r=e=>null!=e,t=em(e),n,l)=>eR(eP(e,(e,t)=>r(e,t)?e:Z,n,l),t),e4=(e,r,t,n)=>{var l;if(null==e)return Z;if(r)e=e2(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ei])return Object.keys(e).length}return l=0,null!=(t=eX(e,()=>++l))?t:0},e6=(e,...r)=>null==e?Z:ep(e)?Math.max(e,...r):e1(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||ep(l)&&e<l?l:e,Z,r[2],r[3]),e5=(e,r,t)=>eW(e,eT(e)?e=>e[1]:e=>e,r,t),e8=(e,r,t,n)=>null==e?Z:(r=eU(r),eX(e,(e,t)=>!r||(e=r(e,t))?eM(e):Z,t,n)),e7=(e,r,t,n)=>{var l;return null==e?Z:eT(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ev))?l:eX(e,r?(e,t)=>!!r(e,t)&&eM(!0):()=>eM(!0),t,n))&&l},re=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),rr=(e,r,t)=>(e.constructor===Object||em(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rt=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&rr(e,r,n),n)},rn=(e,...r)=>(eY(r,r=>eY(r,([r,t])=>{null!=t&&(eT(e[r])&&eT(t)?rn(e[r],t):e[r]=t)})),e),ea=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eY(t,t=>em(t)?e(r,t[0],t[1]):eY(t,([t,n])=>e(r,t,n))),r)},ri=ea(rr),ra=ea((e,r,t)=>rr(e,r,ex(t)?t(rt(e,r)):t)),ro=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rt(e,r)!==ri(e,r,!0),ru=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rt(e,r),eE(e,\"delete\")?e.delete(r):delete e[r],t},rv=(e,r)=>{if(e)return em(r)?(em(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rv(e,r)):em(e)?r<e.length?e.splice(r,1)[0]:void 0:ru(e,r)},rc=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ew(t)?em(t)?t.map(r=>em(r)?1===r.length?[r[0],e[r[0]]]:rc(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rc(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rf=e=>ex(e)?e():e,rp=(e,r=-1)=>em(e)?r?e.map(e=>rp(e,r-1)):[...e]:eT(e)?r?e0(e,([e,t])=>[e,rp(t,r-1)]):{...e}:eO(e)?new Set(r?eW(e,e=>rp(e,r-1)):e):eN(e)?new Map(r?eW(e,e=>[e[0],rp(e[1],r-1)]):e):e,rh=(e,...r)=>null==e?void 0:e.push(...r),rg=(e,...r)=>null==e?void 0:e.unshift(...r),rm=(e,r)=>{var t,l,i;if(e)return eT(r)?(i={},eT(e)&&(eY(e,([e,a])=>{if(a!==r[e]){if(eT(t=a)){if(!(a=rm(a,r[e])))return;[a,t]=a}else ep(a)&&ep(void 0)&&(a=(t=a)-void 0);i[e]=a,(null!=l?l:l=rp(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},ry=\"undefined\"!=typeof performance?(e=er)=>e?Math.trunc(ry(ee)):performance.timeOrigin+performance.now():Date.now,rb=(e=!0,r=()=>ry())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rk=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=rA(!0).resolve(),c=rb(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await X(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rS(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rT{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rE,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rS(this,\"_promise\",void 0),this.reset()}}class rE{then(e,r){return this._promise.then(e,r)}constructor(){var e;rS(this,\"_promise\",void 0),rS(this,\"resolve\",void 0),rS(this,\"reject\",void 0),rS(this,\"value\",void 0),rS(this,\"error\",void 0),rS(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Z||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rx=(e,r)=>null==e||isFinite(e)?!e||e<=0?rf(r):new Promise(t=>setTimeout(async()=>t(await rf(r)),e)):W(`Invalid delay ${e}.`),rA=e=>new(e?rT:rE),rO=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},ea=()=>{var e,r=new Set;return[(t,n)=>{var l=rO(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eW(e)).length?e[0]:em(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Z},r_=(e,r,t)=>null==e?Z:em(r)?null==(r=r[0])?Z:r+\" \"+r_(e,r,t):null==r?Z:1===r?e:null!=t?t:e+\"s\",r$=!0,rM=(e,r,t)=>t?(r$&&rh(t,\"\u001b[\",r,\"m\"),em(e)?rh(t,...e):rh(t,e),r$&&rh(t,\"\u001b[m\"),t):rM(e,r,[]).join(\"\"),rF=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rq=(e,r,t)=>null==e?Z:ex(r)?rC(eW(eh(e)?[e]:e,r),null!=t?t:\"\"):eh(e)?e:rC(eW(e,e=>!1===e?Z:e),null!=r?r:\"\"),rR=e=>(e=Math.log2(e))===(0|e),rz=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eh(e)&&ep(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ef(e)?!r&&t?null!=f[e]?e:Z:Number.isSafeInteger(e)?e:Z:eh(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Z},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Z):(null!=e?e:0)|t,(h=!1,Z)):p(e),(e,r)=>null==(e=g(e,!1))?Z:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rR(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Z],y=(e,r)=>null==e?Z:null==(e=g(o=e,r))?W(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rR(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(em(r)){if(eT(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eW(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eT(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eW(eb(e),e=>(e=>null==e?Z:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rD=(...e)=>{var r=(e=>!em(e)&&eA(e)?eW(e,eN(e)?e=>e:eO(e)?e=>[e,!0]:(e,r)=>[r,e]):ew(e)?Object.entries(e):Z)(e0(e,!0)),t=e=>(ew(e)&&(em(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Z;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rW=Symbol(),rJ=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&e8(r,(e,r,t=l[1].split(e))=>1<t.length?t:Z)||(l[1]?[l[1]]:[]),l):Z},rB=(e,r=!0,t)=>null==e?Z:rH(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Z,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Z,path:v,query:!1===r?d:rV(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Z),e}),rV=(e,r,t=!0)=>rL(e,\"&\",r,t),rL=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Z:e0(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rJ(e,!1===t?[]:!0===t?Z:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Z,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rW]=o),e},rK=(e,r)=>r&&null!=e?r.test(e):Z,rG=(e,r,t)=>rH(e,r,t,!0),rH=(e,r,l,i=!1)=>null==(null!=e?e:r)?Z:l?(t=Z,i?(n=[],rH(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rX=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rY=/\\z./g,rZ=(e,r)=>(r=rq(eJ(e2(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rY,rQ={},r0=e=>e instanceof RegExp,r1=(t,n=[\",\",\" \"])=>{var l;return r0(t)?t:em(t)?rZ(eW(t,e=>null==(e=r1(e,n))?void 0:e.source)):eu(t)?t?/./g:rY:eh(t)?null!=(l=(e=rQ)[r=t])?l:e[r]=rH(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rZ(eW(r2(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rq(n,rX)}]`)),e=>e&&`^${rq(r2(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rX(r4(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Z},r2=(e,r)=>null!=(r=null==e?void 0:e.split(r))?r:e,r4=(e,r,t)=>null!=(r=null==e?void 0:e.replace(r,t))?r:e,r6=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return ri(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r5=((j=l=l||{})[j.Anonymous=0]=\"Anonymous\",j[j.Indirect=1]=\"Indirect\",j[j.Direct=2]=\"Direct\",j[j.Sensitive=3]=\"Sensitive\",rz(l,!1,\"data classification\")),r3=(e,r)=>{var t;return r5.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r5.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r9.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r9.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r8=(e,r)=>{var t;return null==e?void 0:ep(e.classification)&&ep(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r5.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r9.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r9=((j=i=i||{})[j.None=0]=\"None\",j[j.Necessary=1]=\"Necessary\",j[j.Functionality=2]=\"Functionality\",j[j.Performance=4]=\"Performance\",j[j.Targeting=8]=\"Targeting\",j[j.Security=16]=\"Security\",j[j.Infrastructure=32]=\"Infrastructure\",j[j.Any_Anonymous=49]=\"Any_Anonymous\",j[j.Any=63]=\"Any\",j[j.Server=2048]=\"Server\",j[j.Server_Write=4096]=\"Server_Write\",rz(i,!0,\"data purpose\",2111)),j=rz(i,!1,\"data purpose\",0),te=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),tr=e=>!(null==e||!e.patchTargetId),tt=((_=o={})[_.Global=0]=\"Global\",_[_.Entity=1]=\"Entity\",_[_.Session=2]=\"Session\",_[_.Device=3]=\"Device\",rz(o,!(_[_.User=4]=\"User\"),\"variable scope\")),o={scope:tt,purpose:j,purposes:r9,classification:r5},ti=(rD(o),e=>null==e?void 0:e.filter(el).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),ta=((j=_={})[j.Add=0]=\"Add\",j[j.Min=1]=\"Min\",j[j.Max=2]=\"Max\",j[j.IfMatch=3]=\"IfMatch\",rz(_,!(j[j.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),(_=s=s||{})[_.Success=200]=\"Success\",_[_.Created=201]=\"Created\",_[_.Unchanged=304]=\"Unchanged\",_[_.Denied=403]=\"Denied\",_[_.NotFound=404]=\"NotFound\",_[_.ReadOnly=405]=\"ReadOnly\",_[_.Conflict=409]=\"Conflict\",_[_.Unsupported=501]=\"Unsupported\",_[_.Invalid=400]=\"Invalid\",_[_.Error=500]=\"Error\",rz(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=tv)=>(e=>{var r={initialized:!0,then:H(()=>(r.initialized=!0,rf(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e2(e,e=>e.status<300)),variables:e(e=>eW(e,tu)),values:e(e=>eW(e,e=>null==(e=tu(e))?void 0:e.value)),push:()=>(i=e=>(null!=t&&t(eW(to(e))),e),o),value:e(e=>null==(e=tu(e[0]))?void 0:e.value),variable:e(e=>tu(e[0])),result:e(e=>e[0])};return o}),to=e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Z),tu=e=>{var r;return ts(e)?null!=(r=e.current)?r:e:Z},ts=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),tv=(e,r,t)=>{var n,l,i=[],a=eW(eb(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${tt.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Z))});return i.length?W(i.join(\"\\n\")):em(e)?a:null==a?void 0:a[0]},tc=e=>e&&\"string\"==typeof e.type,tf=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tp=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,th=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tg=(e,r=\"\",t=new Map)=>{if(e)return eA(e)?eY(e,e=>tg(e,r,t)):eh(e)?rH(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tp(n)+\"::\":\"\")+r+tp(l),value:tp(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),th(t,l)}):th(t,e),t},tm=((j=c=c||{})[j.View=-3]=\"View\",j[j.Tab=-2]=\"Tab\",j[j.Shared=-1]=\"Shared\",rz(c,!1,\"local variable scope\")),ty=e=>{var r;return null!=(r=tm.tryParse(e))?r:tt(e)},tb=e=>{var r;return null!=(r=tm.format(e))?r:tt.format(e)},tw=e=>!!tm.tryParse(null==e?void 0:e.scope),tk=rD({scope:tm},o),tS=e=>null==e?void 0:eh(e)?e:e.source?tS(e.source):ty(e.scope)+`\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\"),tT=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tI=()=>()=>W(\"Not initialized.\"),tx=window,tA=document,tN=tA.body,tO=(e,r)=>!(null==e||!e.matches(r)),tj=((e=>r$=e)(!!tx.chrome),Q),tC=(e,r,t=(e,r)=>tj<=r)=>{for(var n=0,l=ee;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==er&&null!=i),er),n-1)!==ee&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tA&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},t_=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||es(e);case\"n\":return parseFloat(e);case\"j\":return L(()=>JSON.parse(e),et);case\"h\":return L(()=>nN(e),et);case\"e\":return L(()=>null==nj?void 0:nj(e),et);default:return em(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:t_(e,r[0])):void 0}},t$=(e,r,t)=>t_(null==e?void 0:e.getAttribute(r),t),tM=(e,r,t)=>tC(e,(e,n)=>n(t$(e,r,t))),tU=(e,r)=>null==(e=t$(e,r))||null==(r=e.trim())?void 0:r.toLowerCase(),tF=e=>null==e?void 0:e.getAttributeNames(),tq=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tP=e=>null!=e?e.tagName:null,tz=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tD=(e,r)=>r4(e,/#.*$/,\"\")===r4(r,/#.*$/,\"\"),tW=(e,r,t=er)=>(p=tJ(e,r))&&Y({xpx:p.x,ypx:p.y,x:ej(p.x/tN.offsetWidth,4),y:ej(p.y/tN.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tJ=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tB(e),{x:h,y:g}):void 0,tB=e=>e?(m=e.getBoundingClientRect(),f=tz(ee),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tV=(e,r,t,n={capture:!0,passive:!0})=>(r=eb(r),rO(t,t=>eY(r,r=>e.addEventListener(r,t,n)),t=>eY(r,r=>e.removeEventListener(r,t,n)))),tK=()=>({...f=tz(er),width:window.innerWidth,height:window.innerHeight,totalWidth:tN.offsetWidth,totalHeight:tN.offsetHeight}),tG=new WeakMap,tH=e=>tG.get(e),tX=(e,r=ee)=>(r?\"--track-\":\"track-\")+e,tY=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eY(tF(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=ee,!eh(n=eY(r[1],([r,t,n],l)=>rK(a,r)&&(i=void 0,!t||tO(e,t))&&eM(null!=n?n:a)))||(l=e.getAttribute(a))&&!es(l)||tg(l,r4(n,/\\-/g,\":\"),t),i)}),tZ=()=>{},tQ=(e,r)=>{if(w===(w=t3.tags))return tZ(e,r);var t=e=>e?r0(e)?[[e]]:eA(e)?eB(e,t):[eT(e)?[r1(e.match),e.selector,e.prefix]:[r1(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(e5(w))]];(tZ=(e,r)=>tY(e,n,r))(e,r)},t0=(e,r)=>rq(eV(tq(e,tX(r,er)),tq(e,tX(\"base-\"+r,er))),\" \"),t1={},t2=(e,r,t=t0(e,\"attributes\"))=>{var n;t&&tY(e,null!=(n=t1[t])?n:t1[t]=[{},rG(t,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[r1(t||n),,r])],r),tg(t0(e,\"tags\"),void 0,r)},t4=(e,r,t=ee,n)=>null!=(t=null!=(t=t?tC(e,(e,t)=>t(t4(e,r,ee)),ex(t)?t:void 0):rq(eV(t$(e,tX(r)),tq(e,tX(r,er))),\" \"))?t:n&&(k=tH(e))&&n(k))?t:null,t6=(e,r,t=ee,n)=>\"\"===(S=t4(e,r,t,n))||(null==S?S:es(S)),t5=(e,r,t,n)=>e&&(null==n&&(n=new Map),t2(e,n),tC(e,e=>{tQ(e,n),tg(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t3={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},t8=[],t9=[],t7=(e,r=0)=>e.charCodeAt(r),nr=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t8[t9[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t9[(16515072&r)>>18],t9[(258048&r)>>12],t9[(4032&r)>>6],t9[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nt=e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t8[t7(e,t++)]<<2|(r=t8[t7(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t8[t7(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t8[t7(e,t++)]);return i},nn={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nl=(e=256)=>e*Math.random()|0,na={exports:{}},{deserialize:no,serialize:nu}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};na.exports=n})(),(_=na.exports)&&_.__esModule&&Object.prototype.hasOwnProperty.call(_,\"default\")?_.default:_),ns=\"$ref\",nv=(e,r,t)=>eI(e)?Z:t?r!==Z:null===r||r,nd=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=nv(r,n,t)?s(n):Z)=>(n!==l&&(l!==Z||em(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eI(e))return Z;if(ew(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[ns]||(e[ns]=a,u(()=>delete e[ns])),{[ns]:a};if(eT(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eA(e)||e instanceof Uint8Array||(!em(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return L(()=>{var t;return r?nu(null!=(t=s(e))?t:null):L(()=>JSON.stringify(e,Z,n?2:0),()=>JSON.stringify(s(e),Z,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nc=e=>{var r,t,n=e=>ew(e)?e[ns]&&(t=(null!=r?r:r=[])[e[ns]])?t:(e[ns]&&delete(r[e[ns]]=e)[ns],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eh(e)?L(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?L(()=>no(e),()=>(console.error(\"Invalid message received.\",e),Z)):e)},nf=(e,r={})=>{var t=(e,{json:r=!1,decodeJson:t=!1,...n})=>{var a,o,u,l=(e,t)=>ep(e)&&!0===t?e:u(e=eh(e)?new Uint8Array(eW(e.length,r=>255&e.charCodeAt(r))):r?L(()=>JSON.stringify(e),()=>JSON.stringify(nd(e,!1,n))):nd(e,!0,n),t),i=e=>null==e?Z:L(()=>nc(e),Z);return r?[e=>nd(e,!1,n),i,(e,r)=>l(e,r)]:([a,o,u]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nl()));for(t=0,i[n++]=g(d^16*nl(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nl();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=eu(r)?64:r,h(),[a,u]=nn[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?en:nr)(a(nd(e,!0,n))),e=>null!=e?nc(o(e instanceof Uint8Array?e:(t&&e_(e)?i:nt)(e))):null,(e,r)=>l(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[np,,]=(nf(),nf(null,{json:!0,decodeJson:!0}),nf(null,{json:!0,prettify:!0})),j=r2(\"\"+tA.currentScript.src,\"#\"),rz=r2(\"\"+(j[1]||\"\"),\";\"),ny=j[0],nb=rz[1]||(null==(rD=rB(ny,!1))?void 0:rD.host),nw=e=>!(!nb||(null==(e=rB(e,!1))||null==(e=e.host)?void 0:e.endsWith(nb))!==er),o=(...e)=>r4(rq(e),/(^(?=\\?))|(^\\.(?=\\/))/,ny.split(\"?\")[0]),nS=o(\"?\",\"var\"),nT=o(\"?\",\"mnt\"),nE=(o(\"?\",\"usr\"),Symbol()),nI=Symbol(),nx=(e,r,t=er,n=ee)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":rM(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nI];null!=(e=t?e[nE]:e)&&console.log(ew(e)?rM(np(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nx(e,r,t,!0)),r&&console.groupEnd()},[nA,nN]=nf(),[nO,nj]=[tI,tI],nC=!0,[_,n$]=ea(),nF=(...e)=>{var r,l=e.shift();console.error(eh(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nq,nP]=ea(),[nR,nz]=ea(),nD=e=>nJ!==(nJ=e)&&nP(nJ=!1,nL(!0,!0)),nW=e=>nB!==(nB=!!e&&\"visible\"===document.visibilityState)&&nz(nB,!e,nV(!0,!0)),nJ=(nq(nW),!0),nB=!1,nV=rb(!1),nL=rb(!1),nK=(tV(window,[\"pagehide\",\"freeze\"],()=>nD(!1)),tV(window,[\"pageshow\",\"resume\"],()=>nD(!0)),tV(document,\"visibilitychange\",()=>(nW(!0),nB&&nD(!0))),nP(nJ,nL(!0,!0)),!1),nG=rb(!1),[,nX]=ea(),nY=rk({callback:()=>nK&&nX(nK=!1,nG(!1)),frequency:2e4,once:!0,paused:!0}),j=()=>!nK&&(nX(nK=!0,nG(!0)),nY.restart()),nQ=(tV(window,[\"focus\",\"scroll\"],j),tV(window,\"blur\",()=>nY.trigger()),tV(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],j),j(),()=>nG()),n0=0,n1=void 0,n2=()=>(null!=n1?n1:tI())+\"_\"+n4(),n4=()=>(ry(!0)-(parseInt(n1.slice(0,-2),36)||0)).toString(36)+\"_\"+(++n0).toString(36),n3={},n8={id:n1,heartbeat:ry()},n9={knownTabs:{[n1]:n8},variables:{}},[n7,le]=ea(),[lr,lt]=ea(),ln=tI,ll=e=>n3[tS(e)],li=(...e)=>lo(e.map(e=>(e.cache=[ry(),3e3],tk(e)))),la=e=>eW(e,e=>e&&[e,n3[tS(e)]]),lo=e=>{var r=eW(e,e=>e&&[tS(e),e]);null!=r&&r.length&&(e=la(e),ri(n3,r),(r=e2(r,e=>e[1].scope>c.Tab)).length&&(ri(n9.variables,r),ln({type:\"patch\",payload:e0(r)})),lt(e,n3,!0))},[,ls]=(_((e,r)=>{nq(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),n1=null!=(n=null==t?void 0:t[0])?n:ry(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n3=e0(eV(e2(n3,([,e])=>e.scope===c.View),eW(null==t?void 0:t[1],e=>[tS(e),e])))):sessionStorage.setItem(\"_tail:state\",e([n1,eW(n3,([,e])=>e.scope!==c.View?e:void 0)]))},!0),ln=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([n1,r,t])),localStorage.removeItem(\"_tail:state\"))},tV(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==n1||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||ln({type:\"set\",payload:n9},e):\"set\"===i&&t.active?(ri(n9,a),ri(n3,a.variables),t.trigger()):\"patch\"===i?(o=la(eW(a,1)),ri(n9.variables,a),ri(n3,a),lt(o,n3,!1)):\"tab\"===i&&(ri(n9.knownTabs,e,a),a)&&le(\"tab\",a,!1))});var t=rk(()=>le(\"ready\",n9,!0),-25),n=rk({callback(){var e=ry()-1e4;eY(null==n9?void 0:n9.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?em(u)?(n=!0,u.forEach(r=>t.push(ru(e,r)))):t.push(ru(e,u)):(em(u)?(n=!0,u.forEach(r=>l(rt(e,r),i+1,e,r))):l(rt(e,u),i+1,e,u),!e4(e)&&a&&rv(a,o)))};return l(e,0),n?t:t[0]})(n9.knownTabs,[r])),n8.heartbeat=ry(),ln({type:\"tab\",payload:n8})},frequency:5e3,paused:!0});nq(e=>(e=>{ln({type:\"tab\",payload:e?n8:void 0}),e?(t.restart(),ln({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),ea()),[lv,ld]=ea(),lc=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nj:nN)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nO:nA)([n1,ry()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<ry())&&(a(),(null==(v=l())?void 0:v[0])===n1))return 0<r&&(i=setInterval(()=>a(),r/2)),X(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=rA(),[v]=tV(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rx(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&W(\"_tail:rq could not be acquired.\")}})(),lf=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{n=n&&nC;var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(ls(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Z,l=e)),!a)&&(i=n?nO(l,!0):JSON.stringify(l))};if(!t)return lc(()=>eZ(1,async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:i})).status?0===r?eM(W(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rx(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nj:JSON.parse)?void 0:a(r):Z)&&ld(a),eM(a)):eM()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&W(\"Beacon send failed.\")},rz=[\"scope\",\"key\",\"targetId\",\"version\"],lh=[...rz,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lg=[...rz,\"init\",\"purpose\",\"refresh\"],lm=[...lh,\"value\",\"force\",\"patch\"],ly=new Map,lb=(e,r)=>{var t=rk(async()=>{var e=eW(ly,([e,r])=>({...tT(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eH(r,r=>rt(ly,e,()=>new Set).add(r)),o=(nq((e,r)=>t.toggle(e,e&&3e3<=r),!0),lr(e=>eY(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tS(e),null==(i=rv(ly,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eY(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>ri(o,e,eu(r)?r?void 0:0:r),v={get:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eW(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await lf(e,()=>!!(c=eW(c,([e,r])=>{if(e){var t,l=tS(e),i=(n(l,e.result),ll(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<ry())rh(v,[{...i,status:s.Success},r]);else{if(!tw(e))return[rc(e,lg),r];eT(e.init)&&null!=(t={...tk(e),status:s.Created,...e.init}).value&&(rh(f,d(t)),rh(v,[t,r]))}else rh(v,[{...e,status:s.Denied,error:\"No consent for \"+r9.logFormat(l)},r])}})).length&&{variables:{get:eW(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rh(v,...eW(a,(e,r)=>e&&[e,c[r][1]])),f.length&&lo(f),v.map(([e])=>e)},eW(t,e=>null==e?void 0:e.error)),set:(...t)=>ta(async()=>{t[0]&&!eh(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eW(t,(e,r)=>{var a,n;if(e)return n=tS(e),a=ll(n),u(n,e.cache),tw(e)?null!=e.patch?W(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tm(e.scope),key:e.key},void(a&&a.value===n.value&&a.classification===n.classification&&a.purposes==n.purposes&&a.scope===n.scope?v[r]={status:s.Unchanged,source:e,current:a}:(v[r]={status:a?s.Success:s.Created,source:e,current:n},rh(o,d(n))))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rc(e,lm),r])}),a=c.length?V(null==(a=(await lf(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&lo(o),eY(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eW(t,e=>null==e?void 0:e.error))},d=(e,r=ry())=>({...rc(e,lh),cache:[r,r+(null!=(r=rv(o,tS(e)))?r:3e3)]});return lv(({variables:e})=>{var r;e&&(r=ry(),null!=(e=eV(eW(e.get,e=>tu(e)),eW(e.set,e=>tu(e)))))&&e.length&&lo(eH(e,d,r))}),v},lw=Symbol(),lS=Symbol(),lT=[.75,.33],lE=[.25,.33],lA=()=>{var l,a,i,t=null==tx?void 0:tx.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tx.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tx.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lN=e=>e(Y({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==x?void 0:x.clientId,languages:eW(navigator.languages,(e,r,t=e.split(\"-\"))=>Y({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lA()})),lO=(e,r=\"A\"===tP(e)&&t$(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lj=(e,r=tP(e),t=t6(e,\"button\"))=>t!==ee&&(B(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&B(tU(e,\"type\"),\"button\",\"submit\")||t===er),lC=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rF((null==(t=t$(e,\"title\"))?void 0:t.trim())||(null==(t=t$(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tB(e):void 0}},l$=e=>{if(I)return I;eh(e)&&([t,e]=nN(e),e=nf(t,{decodeJson:!0})[1](e)),ri(t3,e),(e=>{nj===tI&&([nO,nj]=nf(e,{json:!e,prettify:!1}),nC=!!e,n$(nO,nj))})(rv(t3,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,m,l=rv(t3,\"key\"),i=null!=(e=null==(t=tx[t3.name])?void 0:t._)?e:[];if(em(i))return a=[],o=[],u=(e,...r)=>{var t=er;o=e2(o,n=>L(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=ee}),t},(e=>r=>nF(e,r))(n)))},s=[],d=lb(nS,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=n2()),null==e.timestamp&&(e.timestamp=ry()),h=er;var n=ee;return eW(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==ee||(n=er)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&W(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rn(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):W(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eh(t[0])||(i=t[0],t=t.slice(1)),t=eW(t,e=>{if(null!=r&&r.validateKey(null!=i?i:e.key),rn(e,{metadata:{posted:!0}}),e[lw]){if(!1===e[lw](e))return;delete e[lw]}return rn(te(rp(e),!0),{timestamp:e.timestamp-ry()})}),nx({[nI]:eW(t,e=>[e,e.type,ee])},\"Posting \"+rC([r_(\"new event\",[e4(t,e=>!tr(e))||void 0]),r_(\"event patch\",[e4(t,e=>tr(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),lf(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{var a=[];if(e=eW(eb(e),e=>{var t;return null!=(t=e.metadata)&&t.queued||rh(a,e),rn(r.applyEventExtensions(e),{metadata:{queued:!0}})}),eY(a,e=>nx(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rg(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rh(n,...e)};return rk(()=>u([],{flush:!0}),5e3),nR((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eW(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rp(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rm(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rp(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nS,v),f=null,p=0,g=h=ee,m=!1,I=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||eh(e[0]))&&(r=e[0],e=e.slice(1)),eh(e[0])&&(t=e[0],e=e_(t)?JSON.parse(t):nN(t));var r,n=ee;if((e=e2(eB(e,e=>eh(e)?nN(e):e),e=>{if(!e)return ee;if(l7(e))t3.tags=ri({},t3.tags,e.tagAttributes);else{if(ie(e))return t3.disabled=e.disable,ee;if(il(e))return n=er,ee;if(iv(e))return e(I),ee}return g||ia(e)||it(e)?er:(s.push(e),ee)})).length||n){var t=re(e,e=>it(e)?-100:ia(e)?-50:is(e)?-10:tc(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var y=f[p];y&&(v.validateKey(null!=r?r:y.key),L(()=>{var e=f[p];if(u(\"command\",e),h=ee,tc(e))c.post(e);else if(ii(e))d.get(...eb(e.get));else if(is(e))d.set(...eb(e.set));else if(ia(e))rh(o,e.listener);else if(it(e))(r=L(()=>e.extension.setup(I),r=>nF(e.extension.id,r)))&&(rh(a,[null!=(t=e.priority)?t:100,r,e.extension]),re(a,([e])=>e));else if(iv(e))e(I);else{var t,n,r,i=ee;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:ee)break;i||nF(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nF(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else i.push(...e)},Object.defineProperty(tx,t3.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+n2(),events:c,variables:d,__isTracker:er})),configurable:!1,writable:!1}),lr((e,r,t)=>{var n=eV(null==(n=ti(eW(e,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee]),[[{[nI]:null==(n=ti(eW(r,1)))?void 0:n.map(e=>[e,`${e.key} (${tb(e.scope)}, ${e.scope<0?\"client-side memory only\":r9.format(e.purposes)})`,ee])},\"All variables\",er]]);nx({[nI]:n},rM(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e4(r)} in total).`,\"2;3\"))}),n7(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>null==e?W(\"No variable.\"):tv(e,Z,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:Q}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lN(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),m=!0,I(...eW(l5,e=>({extension:e})),...i),I({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;W(`The global variable for the tracker \"${t3.name}\" is used for something else than an array of queued commands.`)},lM=()=>null==x?void 0:x.clientId,lU={scope:\"shared\",key:\"referrer\"},lF=(e,r)=>{I.variables.set({...lU,value:[lM(),e]}),r&&I.variables.get({scope:lU.scope,key:lU.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lq=rb(),lP=rb(),lR=1,[lD,lW]=ea(),lJ=e=>{var r=rb(e,lq),t=rb(e,lP),n=rb(e,nQ),l=rb(e,()=>lR);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lB=lJ(),[lL,lK]=ea(),lG=(e,r)=>(r&&eY(lX,r=>e(r,()=>!1)),lL(e)),lH=new WeakSet,lX=document.getElementsByTagName(\"iframe\");function lZ(e){if(e){if(null!=e.units&&B(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var l0=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),l1=e=>t5(e,r=>r!==e&&!!l0(rt(tG,r)),e=>(N=rt(tG,e),(N=rt(tG,e))&&eB(eV(N.component,N.content,N),\"tags\"))),l2=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eW(O,e=>({...e,rect:void 0}))},l4=(e,r=ee,t)=>{var n,l,i,a=[],o=[],u=0;return tC(e,e=>{var s,i,l=rt(tG,e);l&&(l0(l)&&(i=e2(eb(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==er||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e7(i,e=>null==(e=e.track)?void 0:e.region))&&tB(e)||void 0,s=l1(e),l.content&&rg(a,...eW(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rg(o,...eW(i,e=>{var r;return u=e6(u,null!=(r=e.track)&&r.secondary?1:2),l2({...e,content:a.length?a:void 0,rect:n,...s},!!n)})),a=[]),i=l.area||t4(e,\"area\"))&&rg(o,...eW(eb(i)))}),a.length&&rh(o,l2({id:\"\",rect:n,content:a})),eY(o,e=>{eh(e)?rh(null!=l?l:l=[],e):(null==e.area&&(e.area=rq(l,\"/\")),rg(null!=i?i:i=[],e))}),i||l?{components:i,area:rq(l,\"/\")}:void 0},l6=Symbol(),l5=[{id:\"context\",setup(e){rk(()=>eY(lX,e=>ro(lH,e)&&lK(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){var i;return null==x||null==r||!r.value||null!=x&&x.definition?(n=null==r?void 0:r.value,null!=r&&null!=(i=r.value)&&i.navigation&&f(!0)):(x.definition=r.value,null!=(i=x.metadata)&&i.posted?e.events.postPatch(x,{definition:n}):nx(x,x.type+\" (definition updated)\")),l()}});var n,r,v=null!=(r=null==(r=ll({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=ll({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&li({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=ll({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=ll({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=ee)=>{var i,a,o,l,p;tD(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rB(location.href+\"\",!0),x={type:\"view\",timestamp:ry(),clientId:n2(),tab:n1,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tK(),duration:lB(void 0,!0)},0===d&&(x.firstTab=er),0===d&&0===v&&(x.landingPage=er),li({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rV(location.href),eW([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=x).utm)?n:o.utm={})[e]=null==(n=eb(a[\"utm_\"+e]))?void 0:n[0]}),!(x.navigationType=A)&&performance&&eW(performance.getEntriesByType(\"navigation\"),e=>{x.redirects=e.redirectCount,x.navigationType=r4(e.type,/\\_/g,\"-\")}),A=void 0,\"navigate\"===(null!=(r=x.navigationType)?r:x.navigationType=\"navigate\")&&(p=null==(l=ll(lU))?void 0:l.value)&&nw(document.referrer)&&(x.view=null==p?void 0:p[0],x.relatedEventId=null==p?void 0:p[1],e.variables.set({...lU,value:void 0})),(p=document.referrer||null)&&!nw(p)&&(x.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rB(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),x.definition=n,n=void 0,e.events.post(x),e.events.registerEventPatchSource(x,()=>({duration:lB()})),lW(x))};return nR(e=>{e?(lP(er),++lR):lP(ee)}),tV(window,\"popstate\",()=>(A=\"back-forward\",f())),eW([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),A=\"navigate\",f()}}),f(),{processCommand:r=>l9(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),er),decorate(e){!x||tf(e)||tr(e)||(e.view=x.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eY(e,e=>{var r,t;return null==(r=(t=e.target)[lS])?void 0:r.call(t,e)})),t=new Set,n=(rk({callback:()=>eY(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tA.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e2(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==er}))&&e4(o)&&(p=f=ee,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},rb(!1,nQ),!1,!1,0,0,0,r6()];i[4]=r,i[5]=t,i[6]=n},y=[r6(),r6()],b=lJ(!1),w=rb(!1,nQ),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],A=f?lE:lT,t=(A[0]*a<T||A[0]<(T/r.height||0))&&(A[0]*t<S||A[0]<(S/r.width||0));if(p!==t&&w(p=t,!0),f!==(f=p&&w()>=t3.impressionThreshold-250)&&(++h,b(f),s||e(s=e2(eW(o,e=>((null==(e=e.track)?void 0:e.impressions)||t6(i,\"impressions\",er,e=>null==(e=e.track)?void 0:e.impressions))&&Y({type:\"impression\",pos:tW(i),viewport:tK(),timeOffset:lB(),impressions:h,...l4(i,er)})||null))),null!=s)&&s.length&&(O=b(),v=eW(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;A=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=A?A:\"\"),u||r.height>=1.25*a){var C=tA.createTreeWalker(i,NodeFilter.SHOW_TEXT),_=0,$=0;for(null==u&&(u=[]);$<d.length&&(M=C.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(_+=P;_>=(null==(F=d[$])?void 0:F.offset);)l[$%2?\"setEnd\":\"setStart\"](M,d[$].offset-_+P),$++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,$<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}var t=r.left<0?-r.left:0,A=r.top<0?-r.top:0,B=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(t,t+S)/B),u&&eY(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lS]=({isIntersecting:e})=>{ri(t,S,e),e||(eY(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ra(tG,e,e=>{var r;return(e=>null==e?void 0:{...e,component:eb(e.component),content:eb(e.content),tags:eb(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rt(tG,e))};return{decorate(e){eY(e.components,e=>rv(e,\"track\"))},processCommand:e=>ir(e)?(n(e),er):iu(e)?(eW(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rt(n,l))for(var i=[];null!=t$(l,e);){ro(n,l);var a,o=r2(t$(l,e),\"|\");t$(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eg(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rh(i,v)}}}rh(t,...eW(i,e=>({add:er,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),er):ee}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tV(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=ee;if(tC(n.target,e=>{lj(e)&&null==a&&(a=e),s=s||\"NAV\"===tP(e);var r,v=tH(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eY(e.querySelectorAll(\"a,button\"),r=>lj(r)&&(3<(null!=u?u:u=[]).length?eM():u.push({...lC(r,!0),component:tC(r,(e,r,t,n=null==(l=tH(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t6(e,\"clicks\",er,e=>null==(e=e.track)?void 0:e.clicks))?r:v&&e7(v,e=>(null==(e=e.track)?void 0:e.clicks)!==ee)),null==i&&(i=null!=(r=t6(e,\"region\",er,e=>null==(e=e.track)?void 0:e.region))?r:v&&e7(v,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=l4(null!=a?a:o,!1,d),f=t5(null!=a?a:o,void 0,e=>eW(eb(null==(e=rt(tG,e))?void 0:e.tags))),p=(null==l&&(l=!s),{...(i=null==i?er:i)?{pos:tW(a,n),viewport:tK()}:null,...((e,r)=>{var n;return tC(null!=e?e:r,e=>\"IMG\"===tP(e)||e===r?(n={element:lC(e,!1)},ee):er),n})(n.target,null!=a?a:o),...c,timeOffset:lB(),...f});if(a)if(lO(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rB(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Y({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Y({clientId:n2(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:er,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t$(h,\"target\")!==window.name?(lF(w.clientId),w.self=ee,e(w)):tD(location.href,h.href)||(w.exit=w.external,lF(w.clientId))):(k=h.href,(b=nw(k))?lF(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t3.captureContextMenu&&(h.href=nT+\"=\"+T+encodeURIComponent(k),tV(window,\"storage\",(r,t)=>\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())),tV(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tC(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eh(e=null==e||e!==er&&\"\"!==e?e:\"add\")&&B(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ew(e)?e:void 0)(null!=(t=null==(t=tH(e))?void 0:t.cart)?t:t4(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Z:em(e)||eh(e)?e[e.length-1]:eX(e,(e,t)=>e,void 0,void 0))(null==(t=tH(e))?void 0:t.content))&&r(v)});c=lZ(v);(c||l)&&e(Y(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ra(r,o,t=>{var l=tJ(o,n);return t?rh(t,l):(l=Y({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rt(r,o)}),!0,o)),t})}})};t(document),lG(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tz(er);lD(()=>{return e=()=>(r={},t=tz(er)),setTimeout(e,250);var e}),tV(window,\"scroll\",()=>{var i,n=tz(),l={x:(f=tz(ee)).x/(tN.offsetWidth-window.innerWidth)||0,y:f.y/(tN.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=er,rh(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=er,rh(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=er,rh(i,\"page-end\")),(n=eW(i,e=>Y({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l8(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lZ(t))&&e({...t,type:\"cart_updated\"}),er):io(r)?(e({type:\"order\",...r.order}),er):ee}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tM(e,tX(\"form-value\")),e=(r&&(t=t?es(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rF(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tM(i,tX(\"ref\"))||\"track_ref\",s=rt(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tM(i,tX(\"form-name\"))||t$(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lB()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),eu(l)?l&&(i<0?ec:ed)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tV(i,\"submit\",()=>{l=l4(i),r[3]=3,s(()=>{(i.isConnected&&0<tB(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tB(i).width)),e.events.postPatch(n,{...l,totalTime:ry(er)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,ry(er),1]}),rt(s[1],r)||eW(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(i=null!=(v=(i=s[0].fields)[d=e.name])?v:i[d]={id:e.id||d,name:d,label:r4(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l6]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t6(e,\"ref\")||(e.value||(e.value=r4(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lP())),d=-(s-(s=ry(er))),c=l[l6],(l[l6]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=er,o[3]=2,eY(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tV(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=ry(er),u=lP()):o()));v(document),lG(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r,n=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,l=async r=>{var t;if(r)return!(t=await n())||r3(t,r=r8(r))?[!1,t]:(t={level:r5.lookup(r.classification),purposes:r9.lookup(r.purposes)},await e.events.post(Y({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},t={analytics_storage:4,functionality_storage:2,personalization_storage:0,ad_storage:8,security_storage:16},i=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=tx.dataLayer,l=r,i=null==n?void 0:n.length;if(i&&(r!==(r=n[i-1])||!r))for(var a=1;i--&&((e=n[i])!==l||!l);)if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return eW(t,([r,t])=>\"granted\"===e[2][r]&&(a|=t)),{classification:1<a?1:0,purposes:a}}}}}),{});return{processCommand(e){var t,a,r,s,v;return id(e)?((r=e.consent.get)&&n(r),(t=r8(e.consent.set))&&(async()=>{var e;return(null!=(e=t.callback)?e:()=>{})(...await l(t))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(r=i[v])?r:i[v]=rk({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e,t,n;tA.hasFocus()&&(e=a.poll())&&(e=r8({...s,...e}))&&!r3(s,e)&&([t,n]=await l(e),t&&nx(n,\"Consent was updated from \"+v),s=e)}).trigger()),er):ee}}}}],rD=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l8=rD(\"cart\"),l9=rD(\"username\"),l7=rD(\"tagAttributes\"),ie=rD(\"disable\"),ir=rD(\"boundary\"),it=rD(\"extension\"),il=rD(er,\"flush\"),ii=rD(\"get\"),ia=rD(\"listener\"),io=rD(\"order\"),iu=rD(\"scan\"),is=rD(\"set\"),iv=e=>\"function\"==typeof e,id=rD(\"consent\");Object.defineProperty(tx,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(l$)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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

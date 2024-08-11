import { isConsentEvent, dataClassification, dataPurposes, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, isVariablePatchAction, toNumericVariableEnums, patchType, VariablePatchType, VariableScope, isPassiveEvent, DataPurposeFlags, DataClassification, requireFound, restrictTargets, Necessary, VariableResultStatus, toVariableResultPromise, variableScope, isSuccessResult, extractKey, VariableEnumProperties, parseKey, formatKey, stripPrefix, validateConsent, getResultVariable } from '@tailjs/types';
import { SchemaManager } from '@tailjs/json-schema';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY$1 = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY$1 = "rev=" + "lzpmsdxd";
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";

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
        text: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,A,x,N,O,B=(e,r=e=>Error(e))=>{throw eg(e=rc(e))?r(e):e},J=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ek(e)&&ek(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!J(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},V=(e,r,...t)=>e===r||0<t.length&&t.some(r=>V(e,r)),L=(e,r)=>null!=e?e:B(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),K=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?eb(e=r(e))?B(e):e:es(r)?console.error(r?B(e):e):r}finally{null!=t&&t()}},G=e=>{var r,t=()=>t.initialized||r?r:(r=rc(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},Y=async(e,r=!0,t)=>{try{var n,l=await rc(e);return ey(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!es(r)){if(ey(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Z=e=>e,Q=void 0,ee=Number.MAX_SAFE_INTEGER,er=!1,et=!0,en=()=>{},el=e=>e,ei=e=>null!=e,ea=Symbol.iterator,eo=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Q,eu=(e,r)=>ex(r)?e!==Q?r(e):Q:(null==e?void 0:e[r])!==Q?e:Q,es=e=>\"boolean\"==typeof e,ev=eo(es,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Q))),ed=e=>!!e,ep=Number.isSafeInteger,eh=e=>\"number\"==typeof e,eg=e=>\"string\"==typeof e,em=eo(eg,e=>null==e?void 0:e.toString()),ey=Array.isArray,eb=e=>e instanceof Error,ew=(e,r=!1)=>null==e?Q:!r&&ey(e)?e:eN(e)?[...e]:[e],ek=e=>null!==e&&\"object\"==typeof e,eS=Object.prototype,eT=Object.getPrototypeOf,eE=e=>null!=e&&eT(e)===eS,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eA=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eN=(e,r=!1)=>!(null==e||!e[ea]||\"object\"!=typeof e&&!r),eO=e=>e instanceof Map,eC=e=>e instanceof Set,ej=(e,r)=>null==e?Q:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,e$=!1,e_=e=>(e$=!0,e),eM=e=>null==e?Q:ex(e)?e:r=>r[e],eU=(e,r,t)=>(null!=r?r:t)!==Q?(e=eM(e),null==r&&(r=0),null==t&&(t=ee),(n,l)=>r--?Q:t--?e?e(n,l):n:t):e,eF=e=>null==e?void 0:e.filter(ei),eq=(e,r,t,n)=>null==e?[]:!r&&ey(e)?eF(e):e[ea]?function*(e,r){if(null!=e)if(r){r=eM(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e$){e$=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Q?r:eU(r,t,n)):ek(e)?function*(e,r){r=eM(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e$){e$=!1;break}}}(e,eU(r,t,n)):eq(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r,t,n)=>eq(e,r,t,n),ez=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ea]||n&&ek(r))for(var i of l?eq(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eq(e,r,l,i),t+1,n,!1),eD=(e,r,t,n)=>{if(r=eM(r),ey(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e$;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e$=!1,i}return null!=e?ew(eR(e,r,t,n)):Q},eB=(e,r,t=1,n=!1,l,i)=>ew(ez(e,r,t,n,l,i)),eJ=(...e)=>{var r;return eX(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...ew(e))),r},eG=(e,r,...t)=>null==e?Q:eN(e)?eD(e,e=>r(e,...t)):r(e,...t),eH=(e,r,t,n)=>{var l;if(null!=e){if(ey(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e$)){e$=!1;break}return l})(e,r,t,n);if(t===Q){if(e[ea])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e$)){e$=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e$){e$=!1;break}return t})(e,r)}for(var i of eq(e,r,t,n))null!=i&&(l=i);return l}},eX=eH,eZ=Object.fromEntries,eQ=(e,r,t)=>{var n,l,i;return null==e?Q:es(r)||t?(i={},eX(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eX(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eZ(eD(e,r?(e,t)=>eu(r(e,t),1):e=>eu(e,1)))},e1=(e,r=e=>null!=e,t=ey(e),n,l)=>(e=>t&&!ey(e)?[...e]:e)(eq(e,(e,t)=>r(e,t)?e:Q,n,l)),e2=(e,r,t,n)=>{var l;if(null==e)return Q;if(r)e=e1(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ea])return Object.keys(e).length}return l=0,null!=(t=eH(e,()=>++l))?t:0},e4=(e,...r)=>null==e?Q:eh(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eH(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||eh(l)&&e<l?l:e,Q,r[2],r[3]),e9=(e,r,t,n)=>{var l;return null==e?Q:eE(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ed))?l:eH(e,r?(e,t)=>!!r(e,t)&&e_(!0):()=>e_(!0),t,n))&&l},e7=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),re=(e,r,t)=>(e.constructor===Object||ey(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rr=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&re(e,r,n),n)},rt=(e,...r)=>(eX(r,r=>eX(r,([r,t])=>{null!=t&&(eE(e[r])&&eE(t)?rt(e[r],t):e[r]=t)})),e),eo=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eX(t,t=>ey(t)?e(r,t[0],t[1]):eX(t,([t,n])=>e(r,t,n))),r)},rl=eo(re),ri=eo((e,r,t)=>re(e,r,ex(t)?t(rr(e,r)):t)),ra=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rr(e,r)!==rl(e,r,!0),ro=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rr(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rs=(e,r)=>{if(e)return ey(r)?(ey(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rs(e,r)):ey(e)?r<e.length?e.splice(r,1)[0]:void 0:ro(e,r)},rd=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ek(t)?ey(t)?t.map(r=>ey(r)?1===r.length?[r[0],e[r[0]]]:rd(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rd(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rc=e=>ex(e)?e():e,rf=(e,r=-1)=>ey(e)?r?e.map(e=>rf(e,r-1)):[...e]:eE(e)?r?eQ(e,([e,t])=>[e,rf(t,r-1)]):{...e}:eC(e)?new Set(r?eD(e,e=>rf(e,r-1)):e):eO(e)?new Map(r?eD(e,e=>[e[0],rf(e[1],r-1)]):e):e,rp=(e,...r)=>null==e?void 0:e.push(...r),rh=(e,...r)=>null==e?void 0:e.unshift(...r),rg=(e,r)=>{var t,l,i;if(e)return eE(r)?(i={},eE(e)&&(eX(e,([e,a])=>{if(a!==r[e]){if(eE(t=a)){if(!(a=rg(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rf(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},rm=\"undefined\"!=typeof performance?(e=et)=>e?Math.trunc(rm(er)):performance.timeOrigin+performance.now():Date.now,ry=(e=!0,r=()=>rm())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rw=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rS).resolve(),c=ry(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await Y(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rk(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rS{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rT,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rk(this,\"_promise\",void 0),this.reset()}}class rT{then(e,r){return this._promise.then(e,r)}constructor(){var e;rk(this,\"_promise\",void 0),rk(this,\"resolve\",void 0),rk(this,\"reject\",void 0),rk(this,\"value\",void 0),rk(this,\"error\",void 0),rk(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Q||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var rI=(e,r)=>null==e||isFinite(e)?!e||e<=0?rc(r):new Promise(t=>setTimeout(async()=>t(await rc(r)),e)):B(`Invalid delay ${e}.`),rN=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},eo=()=>{var e,r=new Set;return[(t,n)=>{var l=rN(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eD(e)).length?e[0]:ey(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Q},r$=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),r_=(e,r,t)=>null==e?Q:ex(r)?rC(eD(eg(e)?[e]:e,r),null!=t?t:\"\"):eg(e)?e:rC(eD(e,e=>!1===e?Q:e),null!=r?r:\"\"),rU=e=>(e=Math.log2(e))===(0|e),rF=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eg(e)&&eh(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ep(e)?!r&&t?null!=f[e]?e:Q:Number.isSafeInteger(e)?e:Q:eg(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Q},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Q):(null!=e?e:0)|t,(h=!1,Q)):p(e),(e,r)=>null==(e=g(e,!1))?Q:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rU(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Q],y=(e,r)=>null==e?Q:null==(e=g(o=e,r))?B(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rU(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(ey(r)){if(eE(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eD(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eE(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eD(ew(e),e=>(e=>null==e?Q:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rq=(...e)=>{var r=(e=>!ey(e)&&eN(e)?eD(e,eO(e)?e=>e:eC(e)?e=>[e,!0]:(e,r)=>[r,e]):ek(e)?Object.entries(e):Q)(eQ(e,!0)),t=e=>(ek(e)&&(ey(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Q;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rP=Symbol(),rR=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Q:(r=eM(r),eH(e,(e,t)=>!r||(e=r(e,t))?e_(e):Q,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Q)||(l[1]?[l[1]]:[]),l):Q},rz=(e,r=!0,t)=>null==e?Q:rV(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Q,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Q,path:v,query:!1===r?d:rD(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Q),e}),rD=(e,r,t=!0)=>rW(e,\"&\",r,t),rW=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Q:eQ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rR(e,!1===t?[]:!0===t?Q:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Q,o.push(s),s),(e,r)=>e?!1!==t?eJ(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rP]=o),e},rV=(e,r,l,i=!1)=>null==(null!=e?e:r)?Q:l?(t=Q,i?(n=[],rV(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rL=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rK=/\\z./g,rG=(e,r)=>(r=r_((e=>null!=e?new Set([...eR(e,void 0,void 0,void 0)]):Q)(e1(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rK,rH={},rX=e=>e instanceof RegExp,rY=(t,n=[\",\",\" \"])=>{var l;return rX(t)?t:ey(t)?rG(eD(t,e=>{return null==(e=rY(e,n))?void 0:e.source})):es(t)?t?/./g:rK:eg(t)?null!=(l=(e=rH)[r=t])?l:e[r]=rV(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rG(eD(rZ(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${r_(n,rL)}]`)),e=>e&&`^${r_(rZ(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rL(rQ(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Q},rZ=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},rQ=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r0=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return rl(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r1=((C=l=l||{})[C.Anonymous=0]=\"Anonymous\",C[C.Indirect=1]=\"Indirect\",C[C.Direct=2]=\"Direct\",C[C.Sensitive=3]=\"Sensitive\",rF(l,!1,\"data classification\")),r2=(e,r)=>{var t;return r1.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r1.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r6.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r6.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r4=(e,r)=>{var t;return null==e?void 0:eh(e.classification)&&eh(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r1.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r6.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r6=((C=i=i||{})[C.None=0]=\"None\",C[C.Necessary=1]=\"Necessary\",C[C.Functionality=2]=\"Functionality\",C[C.Performance=4]=\"Performance\",C[C.Targeting=8]=\"Targeting\",C[C.Security=16]=\"Security\",C[C.Infrastructure=32]=\"Infrastructure\",C[C.Any_Anonymous=49]=\"Any_Anonymous\",C[C.Any=63]=\"Any\",C[C.Server=2048]=\"Server\",C[C.Server_Write=4096]=\"Server_Write\",rF(i,!0,\"data purpose\",2111)),C=rF(i,!1,\"data purpose\",0),r3=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),r9=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rF(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:r9,purpose:C,purposes:r6,classification:r1}),tr=(rq(o),e=>null==e?void 0:e.filter(ei).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),tt=((C=$={})[C.Add=0]=\"Add\",C[C.Min=1]=\"Min\",C[C.Max=2]=\"Max\",C[C.IfMatch=3]=\"IfMatch\",rF($,!(C[C.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rF(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=ta)=>(e=>{var r={initialized:!0,then:(e=>{var r=G(e);return(e,t)=>Y(r,[e,t])})(()=>(r.initialized=!0,rc(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e1(e,e=>e.status<300)),variables:e(e=>eD(e,tl)),values:e(e=>eD(e,e=>{return null==(e=tl(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eD((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Q))(e))),e),o),value:e(e=>{return null==(e=tl(e[0]))?void 0:e.value}),variable:e(e=>tl(e[0])),result:e(e=>e[0])};return o}),tl=e=>{var r;return ti(e)?null!=(r=e.current)?r:e:Q},ti=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),ta=(e,r,t)=>{var n,l,i=[],a=eD(ew(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${r9.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Q))});return i.length?B(i.join(\"\\n\")):ey(e)?a:null==a?void 0:a[0]},tu=e=>e&&\"string\"==typeof e.type,ts=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tv=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,td=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},tc=(e,r=\"\",t=new Map)=>{if(e)return eN(e)?eX(e,e=>tc(e,r,t)):eg(e)?rV(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tv(n)+\"::\":\"\")+r+tv(l),value:tv(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),td(t,l)}):td(t,e),t},tf=((C=c=c||{})[C.View=-3]=\"View\",C[C.Tab=-2]=\"Tab\",C[C.Shared=-1]=\"Shared\",rF(c,!1,\"local variable scope\")),th=e=>{var r;return null!=(r=tf.format(e))?r:r9.format(e)},tg=e=>!!tf.tryParse(null==e?void 0:e.scope),tm=rq({scope:tf},o),ty=e=>{return null==e?void 0:eg(e)?e:e.source?ty(e.source):`${(e=>{var r;return null!=(r=tf.tryParse(e))?r:r9(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tb=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tk=()=>()=>B(\"Not initialized.\"),tS=window,tT=document,tE=tT.body,tA=ee,tx=(e,r,t=(e,r)=>tA<=r)=>{for(var n=0,l=er;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==et&&null!=i),et),n-1)!==er&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tT&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tN=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ev(e);case\"n\":return parseFloat(e);case\"j\":return K(()=>JSON.parse(e),en);case\"h\":return K(()=>nw(e),en);case\"e\":return K(()=>null==nS?void 0:nS(e),en);default:return ey(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tN(e,r[0])):void 0}},tO=(e,r,t)=>tN(null==e?void 0:e.getAttribute(r),t),tC=(e,r,t)=>tx(e,(e,n)=>n(tO(e,r,t))),tj=(e,r)=>{return null==(e=tO(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},t_=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tM=e=>null!=e?e.tagName:null,tF=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tq=(e,r)=>rQ(e,/#.*$/,\"\")===rQ(r,/#.*$/,\"\"),tP=(e,r,t=et)=>(p=tR(e,r))&&Z({xpx:p.x,ypx:p.y,x:ej(p.x/tE.offsetWidth,4),y:ej(p.y/tE.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tR=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tz(e),{x:h,y:g}):void 0,tz=e=>e?(m=e.getBoundingClientRect(),f=tF(er),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tD=(e,r,t,n={capture:!0,passive:!0})=>(r=ew(r),rN(t,t=>eX(r,r=>e.addEventListener(r,t,n)),t=>eX(r,r=>e.removeEventListener(r,t,n)))),tB=()=>({...f=tF(et),width:window.innerWidth,height:window.innerHeight,totalWidth:tE.offsetWidth,totalHeight:tE.offsetHeight}),tJ=new WeakMap,tV=e=>tJ.get(e),tL=(e,r=er)=>(r?\"--track-\":\"track-\")+e,tK=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eX((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=er,!eg(n=eX(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Q)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&e_(null!=n?n:a)))||(l=e.getAttribute(a))&&!ev(l)||tc(l,rQ(n,/\\-/g,\":\"),t),i)}),tG=()=>{},tH=(e,r)=>{if(w===(w=t2.tags))return tG(e,r);var t=e=>e?rX(e)?[[e]]:eN(e)?eB(e,t):[eE(e)?[rY(e.match),e.selector,e.prefix]:[rY(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eD(w,eE(w)?e=>e[1]:e=>e,void 0,void 0))]];(tG=(e,r)=>tK(e,n,r))(e,r)},tX=(e,r)=>r_(eJ(t_(e,tL(r,et)),t_(e,tL(\"base-\"+r,et))),\" \"),tY={},tZ=(e,r,t=tX(e,\"attributes\"))=>{var n;t&&tK(e,null!=(n=tY[t])?n:tY[t]=[{},(e=>rV(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[rY(t||n),,r],!0))(t)],r),tc(tX(e,\"tags\"),void 0,r)},tQ=(e,r,t=er,n)=>{return null!=(t=null!=(t=t?tx(e,(e,t)=>t(tQ(e,r,er)),ex(t)?t:void 0):r_(eJ(tO(e,tL(r)),t_(e,tL(r,et))),\" \"))?t:n&&(k=tV(e))&&n(k))?t:null},t0=(e,r,t=er,n)=>\"\"===(S=tQ(e,r,t,n))||(null==S?S:ev(S)),t1=(e,r,t,n)=>e&&(null==n&&(n=new Map),tZ(e,n),tx(e,e=>{tH(e,n),tc(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t2={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},t4=[],t6=[],t5=(e,r=0)=>e.charCodeAt(r),t8=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t4[t6[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t6[(16515072&r)>>18],t6[(258048&r)>>12],t6[(4032&r)>>6],t6[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),t7={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},ne=(e=256)=>e*Math.random()|0,nt={exports:{}},{deserialize:nn,serialize:nl}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};nt.exports=n})(),($=nt.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),ni=\"$ref\",na=(e,r,t)=>eA(e)?Q:t?r!==Q:null===r||r,no=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=na(r,n,t)?s(n):Q)=>(n!==l&&(l!==Q||ey(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eA(e))return Q;if(ek(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[ni]||(e[ni]=a,u(()=>delete e[ni])),{[ni]:a};if(eE(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eN(e)||e instanceof Uint8Array||(!ey(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return K(()=>{var t;return r?nl(null!=(t=s(e))?t:null):K(()=>JSON.stringify(e,Q,n?2:0),()=>JSON.stringify(s(e),Q,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nu=e=>{var r,t,n=e=>ek(e)?e[ni]&&(t=(null!=r?r:r=[])[e[ni]])?t:(e[ni]&&delete(r[e[ni]]=e)[ni],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eg(e)?JSON.parse(e):null!=e?K(()=>nn(e),()=>(console.error(\"Invalid message received.\",e),Q)):e)},ns=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var l,i,a,n=(e,n)=>eh(e)&&!0===n?e:a(e=eg(e)?new Uint8Array(eD(e.length,r=>255&e.charCodeAt(r))):r?K(()=>JSON.stringify(e),()=>JSON.stringify(no(e,!1,t))):no(e,!0,t),n);return r?[e=>no(e,!1,t),e=>null==e?Q:K(()=>nu(e),Q),(e,r)=>n(e,r)]:([l,i,a]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(ne()));for(t=0,i[n++]=g(d^16*ne(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=ne();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=es(r)?64:r,h(),[a,u]=t7[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?el:t8)(l(no(e,!0,t))),e=>null!=e?nu(i(e instanceof Uint8Array?e:(e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t4[t5(e,t++)]<<2|(r=t4[t5(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t4[t5(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t4[t5(e,t++)]);return i})(e))):null,(e,r)=>n(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},C=(ns(),ns(null,{json:!0,prettify:!0}),rZ(\"\"+tT.currentScript.src,\"#\")),rF=rZ(\"\"+(C[1]||\"\"),\";\"),nc=C[0],nf=rF[1]||(null==(rq=rz(nc,!1))?void 0:rq.host),np=e=>{return!(!nf||(null==(e=rz(e,!1))||null==(e=e.host)?void 0:e.endsWith(nf))!==et)},o=(...e)=>rQ(r_(e),/(^(?=\\?))|(^\\.(?=\\/))/,nc.split(\"?\")[0]),ng=o(\"?\",\"var\"),nm=o(\"?\",\"mnt\"),ny=(o(\"?\",\"usr\"),Symbol()),[nb,nw]=ns(),[nk,nS]=[tk,tk],[$,nE]=eo(),nx=(...e)=>{var r,l=e.shift();console.error(eg(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nN,nO]=eo(),[nC,nj]=eo(),n$=e=>nM!==(nM=e)&&nO(nM=!1,nq(!0,!0)),n_=e=>nU!==(nU=!!e&&\"visible\"===document.visibilityState)&&nj(nU,!e,nF(!0,!0)),nM=(nN(n_),!0),nU=!1,nF=ry(!1),nq=ry(!1),nP=(tD(window,[\"pagehide\",\"freeze\"],()=>n$(!1)),tD(window,[\"pageshow\",\"resume\"],()=>n$(!0)),tD(document,\"visibilitychange\",()=>(n_(!0),nU&&n$(!0))),nO(nM,nq(!0,!0)),!1),nR=ry(!1),[,nD]=eo(),nW=rw({callback:()=>nP&&nD(nP=!1,nR(!1)),frequency:2e4,once:!0,paused:!0}),C=()=>!nP&&(nD(nP=!0,nR(!0)),nW.restart()),nJ=(tD(window,[\"focus\",\"scroll\"],C),tD(window,\"blur\",()=>nW.trigger()),tD(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],C),C(),()=>nR()),nV=0,nL=void 0,nK=()=>(null!=nL?nL:tk())+\"_\"+nG(),nG=()=>(rm(!0)-(parseInt(nL.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nV).toString(36),nY={},nZ={id:nL,heartbeat:rm()},nQ={knownTabs:{[nL]:nZ},variables:{}},[n0,n1]=eo(),[n2,n4]=eo(),n6=tk,n5=e=>nY[ty(e)],n3=(...e)=>n9(e.map(e=>(e.cache=[rm(),3e3],tm(e)))),n8=e=>eD(e,e=>e&&[e,nY[ty(e)]]),n9=e=>{var r=eD(e,e=>e&&[ty(e),e]);null!=r&&r.length&&(e=n8(e),rl(nY,r),(r=e1(r,e=>e[1].scope>c.Tab)).length&&(rl(nQ.variables,r),n6({type:\"patch\",payload:eQ(r)})),n4(e,nY,!0))},[,le]=($((e,r)=>{nN(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nL=null!=(n=null==t?void 0:t[0])?n:rm(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),nY=eQ(eJ(e1(nY,([,e])=>e.scope===c.View),eD(null==t?void 0:t[1],e=>[ty(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nL,eD(nY,([,e])=>e.scope!==c.View?e:void 0)]))},!0),n6=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nL,r,t])),localStorage.removeItem(\"_tail:state\"))},tD(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nL||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||n6({type:\"set\",payload:nQ},e):\"set\"===i&&t.active?(rl(nQ,a),rl(nY,a.variables),t.trigger()):\"patch\"===i?(o=n8(eD(a,1)),rl(nQ.variables,a),rl(nY,a),n4(o,nY,!1)):\"tab\"===i&&(rl(nQ.knownTabs,e,a),a)&&n1(\"tab\",a,!1))});var t=rw(()=>n1(\"ready\",nQ,!0),-25),n=rw({callback(){var e=rm()-1e4;eX(null==nQ?void 0:nQ.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?ey(u)?(n=!0,u.forEach(r=>t.push(ro(e,r)))):t.push(ro(e,u)):(ey(u)?(n=!0,u.forEach(r=>l(rr(e,r),i+1,e,r))):l(rr(e,u),i+1,e,u),!e2(e)&&a&&rs(a,o)))};return l(e,0),n?t:t[0]})(nQ.knownTabs,[r])),nZ.heartbeat=rm(),n6({type:\"tab\",payload:nZ})},frequency:5e3,paused:!0});nN(e=>(e=>{n6({type:\"tab\",payload:e?nZ:void 0}),e?(t.restart(),n6({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),eo()),[lr,lt]=eo(),ln=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nS:nw)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nk:nb)([nL,rm()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<rm())&&(a(),(null==(v=l())?void 0:v[0])===nL))return 0<r&&(i=setInterval(()=>a(),r/2)),Y(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rT,[v]=tD(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rI(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&B(\"_tail:rq could not be acquired.\")}})(),ll=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(le(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Q,l=e)),!a)&&(i=n?nk(l,!0):JSON.stringify(l))};if(!t)return ln(()=>(async r=>{var l,i;for(i of eR(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),e$){e$=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?e_(B(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rI(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nS:JSON.parse)?void 0:a(r):Q)&&lt(a),e_(a)):e_()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&B(\"Beacon send failed.\")},rF=[\"scope\",\"key\",\"targetId\",\"version\"],la=[...rF,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lo=[...rF,\"init\",\"purpose\",\"refresh\"],lu=[...la,\"value\",\"force\",\"patch\"],ls=new Map,lv=(e,r)=>{var t=rw(async()=>{var e=eD(ls,([e,r])=>({...tb(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eG(r,r=>rr(ls,e,()=>new Set).add(r)),o=(nN((e,r)=>t.toggle(e,e&&3e3<=r),!0),n2(e=>eX(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=ty(e),null==(i=rs(ls,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&J(null==e?void 0:e.value,null==r?void 0:r.value)||eX(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>rl(o,e,es(r)?r?void 0:0:r),v={get:(...t)=>tt(async()=>{t[0]&&!eg(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eD(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await ll(e,()=>!!(c=eD(c,([e,r])=>{if(e){var t,l=ty(e),i=(n(l,e.result),n5(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<rm())rp(v,[{...i,status:s.Success},r]);else{if(!tg(e))return[rd(e,lo),r];eE(e.init)&&null!=(t={...tm(e),status:s.Created,...e.init}).value&&(rp(f,d(t)),rp(v,[t,r]))}else rp(v,[{...e,status:s.Denied,error:\"No consent for \"+r6.logFormat(l)},r])}})).length&&{variables:{get:eD(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rp(v,...eD(a,(e,r)=>e&&[e,c[r][1]])),f.length&&n9(f),v.map(([e])=>e)},eD(t,e=>null==e?void 0:e.error)),set:(...t)=>tt(async()=>{t[0]&&!eg(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eD(t,(e,r)=>{var a,n;if(e)return n=ty(e),a=n5(n),u(n,e.cache),tg(e)?null!=e.patch?B(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tf(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rp(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rd(e,lu),r])}),a=c.length?L(null==(a=(await ll(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&n9(o),eX(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eD(t,e=>null==e?void 0:e.error))},d=(e,r=rm())=>{return{...rd(e,la),cache:[r,r+(null!=(r=rs(o,ty(e)))?r:3e3)]}};return lr(({variables:e})=>{var r;e&&(r=rm(),null!=(e=eJ(eD(e.get,e=>tl(e)),eD(e.set,e=>tl(e)))))&&e.length&&n9(eG(e,d,r))}),v},lc=Symbol(),lf=[.75,.33],lp=[.25,.33],lm=()=>{var l,a,i,t=null==tS?void 0:tS.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tS.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tS.devicePixelRatio,width:t,height:l,landscape:a}}):{}},ly=e=>e(Z({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eD(navigator.languages,(e,r,t=e.split(\"-\"))=>Z({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lm()})),lb=(e,r=\"A\"===tM(e)&&tO(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lw=(e,r=tM(e),t=t0(e,\"button\"))=>t!==er&&(V(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&V(tj(e,\"type\"),\"button\",\"submit\")||t===et),lk=(e,r=!1)=>{var t;return{tagName:e.tagName,text:r$((null==(t=tO(e,\"title\"))?void 0:t.trim())||(null==(t=tO(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tz(e):void 0}},lT=e=>{if(I)return I;eg(e)&&([t,e]=nw(e),e=ns(t)[1](e)),rl(t2,e),(e=>{nS===tk&&([nk,nS]=ns(e),nE(nk,nS))})(rs(t2,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rs(t2,\"key\"),i=null!=(e=null==(t=tS[t2.name])?void 0:t._)?e:[];if(ey(i))return a=[],o=[],u=(e,...r)=>{var t=et;o=e1(o,n=>K(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=er}),t},(e=>r=>nx(e,r))(n)))},s=[],d=lv(ng,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=nK()),null==e.timestamp&&(e.timestamp=rm()),h=et;var n=er;return eD(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==er||(n=et)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&B(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rt(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):B(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eg(t[0])||(i=t[0],t=t.slice(1)),ll(e,{events:t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rt(e,{metadata:{posted:!0}}),rt(r3(rf(e),!0),{timestamp:e.timestamp-rm()}))),variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eD(ew(e),e=>rt(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eX(e,e=>{}),!l)return o(e,!1,i);t?(n.length&&rh(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rp(n,...e)};return rw(()=>u([],{flush:!0}),5e3),nC((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eD(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eJ(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rf(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rg(r(i,s),i))?t:[];if(t&&!J(v,i))return l.set(e,rf(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(ng,v),f=null,p=0,g=h=er,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eg(e[0]))&&(r=e[0],e=e.slice(1)),eg(e[0])&&(e=(t=e[0]).match(/^[{[]/)?JSON.parse(t):nw(t));var r,n=er;if((e=e1(eB(e,e=>eg(e)?nw(e):e),e=>{if(!e)return er;if(lQ(e))t2.tags=rl({},t2.tags,e.tagAttributes);else{if(l0(e))return t2.disabled=e.disable,er;if(l4(e))return n=et,er;if(l7(e))return e(I),er}return g||l5(e)||l2(e)?et:(s.push(e),er)})).length||n){var t=e7(e,e=>l2(e)?-100:l5(e)?-50:l9(e)?-10:tu(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),K(()=>{var e=f[p];if(u(\"command\",e),h=er,tu(e))c.post(e);else if(l6(e))d.get(...ew(e.get));else if(l9(e))d.set(...ew(e.set));else if(l5(e))rp(o,e.listener);else if(l2(e))(r=K(()=>e.extension.setup(I),r=>nx(e.extension.id,r)))&&(rp(a,[null!=(t=e.priority)?t:100,r,e.extension]),e7(a,([e])=>e));else if(l7(e))e(I);else{var t,n,r,i=er;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:er)break;i||nx(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nx(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tS,t2.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+nK(),events:c,variables:d,__isTracker:et})),configurable:!1,writable:!1}),n2((e,r,t)=>{eJ(null==(e=tr(eD(e,1)))?void 0:e.map(e=>[e,`${e.key} (${th(e.scope)}, ${e.scope<0?\"client-side memory only\":r6.format(e.purposes)})`,er]),[[{[ny]:null==(e=tr(eD(r,1)))?void 0:e.map(e=>[e,`${e.key} (${th(e.scope)}, ${e.scope<0?\"client-side memory only\":r6.format(e.purposes)})`,er])},\"All variables\",et]])}),n0(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>ta(e,Q,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:ee}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(ly(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...eD(lH,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;B(`The global variable for the tracker \"${t2.name}\" is used for something else than an array of queued commands.`)},lE=()=>null==A?void 0:A.clientId,lI={scope:\"shared\",key:\"referrer\"},lA=(e,r)=>{I.variables.set({...lI,value:[lE(),e]}),r&&I.variables.get({scope:lI.scope,key:lI.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lx=ry(),lN=ry(),lO=1,[lj,l$]=eo(),l_=e=>{var r=ry(e,lx),t=ry(e,lN),n=ry(e,nJ),l=ry(e,()=>lO);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lM=l_(),[lF,lq]=eo(),lP=(e,r)=>(r&&eX(lz,r=>e(r,()=>!1)),lF(e)),lR=new WeakSet,lz=document.getElementsByTagName(\"iframe\");function lW(e){if(e){if(null!=e.units&&V(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lJ=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lV=e=>t1(e,r=>r!==e&&!!lJ(rr(tJ,r)),e=>(rr(tJ,e),(N=rr(tJ,e))&&eB(eJ(N.component,N.content,N),\"tags\"))),lL=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eD(O,e=>({...e,rect:void 0}))},lK=(e,r=er,t)=>{var n,l,i,a=[],o=[],u=0;return tx(e,e=>{var s,i,l=rr(tJ,e);l&&(lJ(l)&&(i=e1(ew(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==et||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e9(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tz(e)||void 0,s=lV(e),l.content&&rh(a,...eD(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rh(o,...eD(i,e=>{var r;return u=e4(u,null!=(r=e.track)&&r.secondary?1:2),lL({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||tQ(e,\"area\"))&&rh(o,...eD(ew(i)))}),a.length&&rp(o,lL({id:\"\",rect:n,content:a})),eX(o,e=>{eg(e)?rp(null!=l?l:l=[],e):(null==e.area&&(e.area=r_(l,\"/\")),rh(null!=i?i:i=[],e))}),i||l?{components:i,area:r_(l,\"/\")}:void 0},lG=Symbol(),q={necessary:1,preferences:2,statistics:4,marketing:8},lH=(window.tail({consent:{externalSource:{key:\"Cookiebot\",poll(){var t,e=null==(e=tT.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return t=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,r,n)=>{return\"true\"===n&&(t|=null!=(n=q[r])?n:0),\"\"}),{level:1<t?1:0,purposes:t}}}}}),[{id:\"context\",setup(e){rw(()=>eX(lz,e=>ra(lR,e)&&lq(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=n5({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=n5({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&n3({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=n5({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=n5({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=er)=>{var i,a,o,l,p;tq(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rz(location.href+\"\",!0),A={type:\"view\",timestamp:rm(),clientId:nK(),tab:nL,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tB(),duration:lM(void 0,!0)},0===d&&(A.firstTab=et),0===d&&0===v&&(A.landingPage=et),n3({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rD(location.href),eD([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=ew(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eD(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=rQ(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=n5(lI))?void 0:l.value)&&np(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...lI,value:void 0})),(p=document.referrer||null)&&!np(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rz(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lM()})),l$(A))};return nC(e=>{e?(lN(et),++lO):lN(er)}),tD(window,\"popstate\",()=>(x=\"back-forward\",f())),eD([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>lZ(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),et),decorate(e){!A||ts(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eX(e,e=>{var r,t;return null==(r=(t=e.target)[lc])?void 0:r.call(t,e)})),t=new Set,n=(rw({callback:()=>eX(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tT.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e1(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==et}))&&e2(o)&&(p=f=er,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},ry(!1,nJ),!1,!1,0,0,0,r0()];i[4]=r,i[5]=t,i[6]=n},y=[r0(),r0()],b=l_(!1),w=ry(!1,nJ),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,A=S/r.width||0,x=f?lp:lf,I=(x[0]*a<T||x[0]<I)&&(x[0]*t<S||x[0]<A);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t2.impressionThreshold-250)&&(++h,b(f),s||e(s=e1(eD(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t0(i,\"impressions\",et,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Z({type:\"impression\",pos:tP(i),viewport:tB(),timeOffset:lM(),impressions:h,...lK(i,et)})||null}))),null!=s)&&s.length&&(O=b(),v=eD(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var j=tT.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=j.nextNode());){var M,U,F,z,D,P=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=P;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+P),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}x=r.left<0?-r.left:0,A=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(x,x+S)/I),u&&eX(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lc]=({isIntersecting:e})=>{rl(t,S,e),e||(eX(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ri(tJ,e,e=>{var r;return(e=>null==e?void 0:{...e,component:ew(e.component),content:ew(e.content),tags:ew(e.tags)})(\"add\"in n?{...e,component:eJ(null==e?void 0:e.component,n.component),content:eJ(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eJ(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rr(tJ,e))};return{decorate(e){eX(e.components,e=>rs(e,\"track\"))},processCommand:e=>l1(e)?(n(e),et):l8(e)?(eD(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rr(n,l))for(var i=[];null!=tO(l,e);){ra(n,l);var a,o=rZ(tO(l,e),\"|\");tO(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=em(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rp(i,v)}}}rp(t,...eD(i,e=>({add:et,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),et):er}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tD(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=er;if(tx(n.target,e=>{lw(e)&&null==a&&(a=e),s=s||\"NAV\"===tM(e);var r,v=tV(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eX(e.querySelectorAll(\"a,button\"),r=>lw(r)&&(3<(null!=u?u:u=[]).length?e_():u.push({...lk(r,!0),component:tx(r,(e,r,t,n=null==(l=tV(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t0(e,\"clicks\",et,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e9(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==er})),null==i&&(i=null!=(r=t0(e,\"region\",et,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e9(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=lK(o,!1,d),f=t1(o,void 0,e=>{return eD(ew(null==(e=rr(tJ,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?et:i)?{pos:tP(a,n),viewport:tB()}:null,...((e,r)=>{var n;return tx(null!=e?e:r,e=>\"IMG\"===tM(e)||e===r?(n={element:lk(e,!1)},er):et),n})(n.target,o),...c,timeOffset:lM(),...f});if(a)if(lb(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rz(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Z({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Z({clientId:nK(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:et,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||tO(h,\"target\")!==window.name?(lA(w.clientId),w.self=er,e(w)):tq(location.href,h.href)||(w.exit=w.external,lA(w.clientId))):(k=h.href,(b=np(k))?lA(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t2.captureContextMenu&&(h.href=nm+\"=\"+T+encodeURIComponent(k),tD(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tD(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tx(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eg(e=null==e||e!==et&&\"\"!==e?e:\"add\")&&V(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ek(e)?e:void 0)(null!=(t=null==(t=tV(e))?void 0:t.cart)?t:tQ(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Q:ey(e)||eg(e)?e[e.length-1]:eH(e,(e,t)=>e,void 0,void 0))(null==(t=tV(e))?void 0:t.content))&&r(v)});c=lW(v);(c||l)&&e(Z(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ri(r,o,t=>{var l=tR(o,n);return t?rp(t,l):(l=Z({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rr(r,o)}),!0,o)),t})}})};t(document),lP(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tF(et);lj(()=>{return e=()=>(r={},t=tF(et)),setTimeout(e,250);var e}),tD(window,\"scroll\",()=>{var i,n=tF(),l={x:(f=tF(er)).x/(tE.offsetWidth-window.innerWidth)||0,y:f.y/(tE.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=et,rp(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=et,rp(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=et,rp(i,\"page-end\")),(n=eD(i,e=>Z({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return lY(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lW(t))&&e({...t,type:\"cart_updated\"}),et):l3(r)?(e({type:\"order\",...r.order}),et):er}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||tC(e,tL(\"form-value\")),e=(r&&(t=t?ev(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&r$(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=tC(i,tL(\"ref\"))||\"track_ref\",s=rr(t,i,()=>{var r,t=new Map,n={type:\"form\",name:tC(i,tL(\"form-name\"))||tO(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lM()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),es(l)?l&&(i<0?e=>e!==er:e=>e===et)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tD(i,\"submit\",()=>{l=lK(i),r[3]=3,s(()=>{(i.isConnected&&0<tz(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tz(i).width)),e.events.postPatch(n,{...l,totalTime:rm(et)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,rm(et),1]}),rr(s[1],r)||eD(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:rQ(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[lG]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t0(e,\"ref\")||(e.value||(e.value=rQ(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lN())),d=-(s-(s=rm(et))),c=l[lG],(l[lG]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=et,o[3]=2,eX(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tD(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=rm(et),u=lN()):o()));v(document),lP(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,t=async t=>{var n;if(t)return!(n=await r())||r2(n,t=r4(t))?[!1,n]:(n={level:r1.lookup(t.classification),purposes:r6.lookup(t.purposes)},await e.events.post(Z({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},n={};return{processCommand(e){var i,a,s,l;return ie(e)?((l=e.consent.get)&&r(l),(i=r4(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await t(i))})(),(a=e.consent.externalSource)&&(l=a.key,(null!=(e=n[l])?e:n[l]=rw({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e;tT.hasFocus()&&(e=a.poll())&&(e=r4({...s,...e}))&&!r2(s,e)&&(await t(e),s=e)}).trigger()),et):er}}}}]),rq=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),lY=rq(\"cart\"),lZ=rq(\"username\"),lQ=rq(\"tagAttributes\"),l0=rq(\"disable\"),l1=rq(\"boundary\"),l2=rq(\"extension\"),l4=rq(et,\"flush\"),l6=rq(\"get\"),l5=rq(\"listener\"),l3=rq(\"order\"),l8=rq(\"scan\"),l9=rq(\"set\"),l7=e=>\"function\"==typeof e,ie=rq(\"consent\");Object.defineProperty(tS,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lT)}})})();\n",
        gzip: "H4sIAAAAAAACCsS9iXbbSNImOo8iot1qwExRJLXYAgXz91rlKu9SrTRtQ2RSQhkCWACopUj2mde4L3AfbJ7kxhe5ACApd_1z7pzpLotAZiLXyMjYMsJ1veDR3JnlcisvsmhUOL2rMNuSIhOFSEQsIhGKXFyJsRiJiZiKC3EuLsWtOBPX4qs4EafipXgsbsQb8VY8CVz6MJDBo-dZlmau9FB5cZGl11vy3JVBNkJaHzm-XIofuLwogp0OCkYTKhIE2WKRzOI4CFz8NALZl37meZksZlnSaPdQ7CvVsL1NPxl-WrFMzosLfKsfvTlGEYskaPcm1JN4K0q2pMdNDOJhg0rSz_Z24wd-F3gTBXXDNNPpNZvJUr1sJVTz27M_5KhofZW3OTWqm1ma0kvxsxpLq9UqaCx6HO3jQpfc3i5aeXop3Sx49DNKep54xZ9Q6XKcT_SYs37mO4-3MvnnLMrkeOsqjGdyK8q3LqM8j5JzR9Akn95OpZ7oViancTiSrkMdcISDoubjluNRYz-qtWm0RcGLkt3O9eik6y1HYTG6oDm1aTc0yL48w5rxkj3hJfMlBt8fpUmexrIlufFMZ3p-tpxESRjHt3M1ioJGTZUvxXeACV4SrDZArmhFSVREYRz9JceLBcZLU6Pgo1VcyKRPb_xAXXjk1orzIGjE1IcreiOA8zz_20W8nh5YsRS_BWF-m4zWpgPdI4gPwuswKra4K-YreYthG6gk2GkPvf5VGo232n7SGtGQ3UzEnh-XE0mQ1uDZUkB3a56yQWeogWwLz2hF75AlehCp9l3VWGZa4VUA6EcEyXkRJiOZTrZ49T31eWQ6Gy3RjE6VvfpiSc-uUbWdwrRD64UF-x0LJsX7QCULKYM3s8szmbVeP_7188njF88_v3xz-vy75x-EpFnsCFlgLmXCiztfChmrGmSEXw3gQobBye3lWRq3okJmYZFmQqZmF7iEcKgS7B638AgmtrcT-s9AknpwCwLIggCy8N8LOTPfanilff1eYZf3vh6ZNCOTg2zocQGJT3P0yzlLaWrCxKEZoM1EM0p9vApk6socO6xNnd7edjtUzWLhTMI4lw5VgTSnyGaSvkPOe2wwAjP6otGgGqZmsqL8JJzIl0khzyUN9YLbTDiv1uQ5ZwAB09auZlxyX86FnsPqcFpFesIfuGj8NnicZeEttci_Qp7x_K8Bi5DXGhF0vLLO936DZpuAVNIk-vINfgeESeTQH8ihkF_LRcTgnZSRYa2nJwZDTrO0SJEu5KlJO5fFO5P8diLk8wpQULun1B5m8kTIl2ZFncksGRVRWq7NxgUV8rGaOwarWo9uOGOtGmS9qcxBw9S7WDTkQIZDWmk9vob9hE6KjNp6uzapr8OpkE_Xkk9kIeQfVfyup7mDg4Hm-HVYXLSydJaMXXmfMB-_T9Nrt9MWtBSNNo4oQoptAq1dWrV7vMk-oyEXL7TXqD-vA1mtnXYBLyCdMRmv20_6gMXuKg-WQm0DQqzyNX0gNKohoM6CtnmlHUd7TVK2S0iRKsh2dqiJgv7SQcVpfkJV-TSdL4JN8DmJYtrkroyoo3_qjoikMh2DYRXsXvAhggXomzW7z_MHrKlhxWPMNs_QccLpwJeFPuGTLayTZ8sCTVMvi2bTIxLBvY1kPN5KqCv3vDnPZu8sk-HX5VLSpt5CDYz_VS2qiqTy3ZK6UgSMXnz5k6uGQv0FIbLa32r3qAe2g4oEYcIkGCRCDpLhsFd2OMbiuDF32Y_LTscbOo3uVLvxp6vWvtYTavoOpO3NuUcKImxD1GVaXotpaRg4tHqezuUpoOb8SiNBWy-QPG57pk4DSzuSCKqebDZtFTs7PTvddajrScozxZpNbssT2HMfqqCDgeoXIf8y5GMHB0cHxCoVsb2TrqZhKxCUMQSpXZ5oAtIzix9h8eM-tZERLeN1GjgXuUtUVwTykGqjA8pX3YzUWMrZUX1DL2gNuWyHevms2n-mABR4CIZ7Aw9tEQWDIQNKERTH7b4hapuFr49AOvLaNNCkmpnozKSf-CaxVxzT0BryXg-QxPWHgRwUw55Z2H5IeyMUMQAtJECLWtNZfuGGniF4FbqJLP1r6NNrV36wo6FDls75JxsXASX_citcBM4oIvdxpniGFLTU1a84YQPT_74k8gpopXJEVLBXRvPkqQ6jtmtMIkEKdeW7GgleQYt8nslnLtdJGEkV8Xz7KOT3tVXiNelV8I6m4aThD9y10mCU9E7__2MBee3KDtDq0STEgV7BCFQ5pYkQ6K0f-TFQRB1H6MmNl57tK0bESEwzQrQNquMxY8GSRUQIq9FEK4g14oOhgmQjBiQij_3izl4Uqhfcg3Xq4e90gpEn97_S9CAiLBoNh_UefKsDy9pmr6ATrxxdHESW8o-JGJa_BvJ7IX831MwkSy-fJ0R7gUh8Xx6xhoMQlhSvwCBYgcWi6NPagTz-FQiOjmB7INKImNdCVywKlsQgBIUbDbAl6DwH74CDQScEnOCD-EB9RFesbi0zV6uUE31G1bgW09NsRt6AaHZUSwy6nxBDXG40_oA28dK3m_KuOqtdw7bHZ7783eXtl_UZr1N_Z26mUHxH9X9Gb8R9ezQ1HStFMGwD0SG3TKgwIQKGsACCu62QqdJT-FfXrypnSh8f0Qbv3r3BaRSGI3vfYwqDKKMOFyeExhsHmH5eParLM9JIHEAYtHJiPg2OUA00qttsqypFkCtSBD4FLJcjv8doqK_NZszsTpumZj9QGKtOVEownH2mIC_DG1PCd0v8a4YcMntGpALNDXF6frECJ1I3q8DSCAPslgOA0g4DiNLUhsTaq9nVL56efyQG4G37zOAyzVDByIsFdRj0jTyO-zEh-vciG3Qhg9kDPX-0YaHWt9NzFgA1sn77eOOc-qsrpR4CPEiWxFgGPlYMvBTlGSPHNCjq2vdVmG00FFRRxz-7IAN4LvlRYZDt7ZjW6IEFX1mS3eByqNWscEsA9XaYkwUhn8kKoS5bYNmJvRwRf2wlTzRrDO-q0wFIk7GMZSG3wAcxMxQUfiVXtlS-fQBVU_uklUsUo7-glGgftsLxuI8k-kXp6peqASbKslWUxyI5A-Kbu69QGvcLbbu2o4R5JPjDPv9VrV6EeZ__moa9dTkAfVaCMeVnkjtFdCER6yIrKjvFJeyY0ZI84l93QF0fou-2ShfgpJqhJ6qU1gnvPCk8bgJuXiiZMgdW2VaML2q7KOmXlKePtmnWqO1bVMw5hB_pD2NuZLoDKjtksYc-ikD40hhiMP8ZwCPCk510PVQz_ixT8kQfwJSFViSywo8SAFVTfqHDkVL7DTPRmAa98Ezk6mrBh8YKFxKcZ1Zaow7pCvuyQVhLmEPXQow9_ToKnBzvLpgUBQ07t03UwIpFcIoI297uHFtqMbP7KmMuFXJIjxDhFKLWLNdzozZPVn5GcD-NoxHmvOOB4DSCtlTRCSIbV0AIXVEFGpXTYp0ecLPWJA6L19Q61vwrrzmvfGG6pAbSqQir-wMIFOl0x89w6GdjVz9z8wwpBLSYIHrSjUrToBqrheoBFiqwG03VBUhGJQRpIBupGsud21OWaQsa9ohRl5IkuGDvs4nCaCyk1_NI04dWQU5PkAnJuW-O4ue6yHucBwOp-4WKCNpRlLoyR1kiJ56ibCKvAaHEmFgivawVUoG3phQmtizFpAaqZWJD1yy5z9MNJ6WVTBjmgeAyu_hWwVmSX0STwpQ9rwM_U3o1GH3OMKooPHVCuUyZYRbCoYajkLUPcqiIcMI3QahEww2X-LJzYsw412yi3iCkGQzCJVFW9CP0RsPRSacssI-HjGK59Ajh9Ikkjg0w05LQPA1pUS8DZ5aM5SRK5LgUa01lRuTwJTACS4OYMlOEBOHvZORml67E7qkUbBXRpXybRedR0qwmJ-k1QcuzsOBHkd2CXGi0CW5wTFJFXoWyD5ryfuZ6TN5r2p9QnAhZCkwLEDeDnaTJJD61HouQqXLCP1RnhFlVOQTVNDYt0Gyb-mWgoHc-gQZEJqNbPxM44s_C0VcfQCfmlD6TNH_UwWk4y-XYj8C80pY6P5eZH-IlpWH5KZ7sxzMj3s7CiZ8vqctXoAFL6qll2wRR1BbUZUIjgNzsxDP6CBr4KMhu3UbkiUkwotepUklsSQUhjavFohFvb49bU5mMo-RcCwRlqZ2iUu5t62yW30JkznngbHr2k56n9Bhjy2UvFmP0gPYZzSMLIlWJ31wMauaiIzuTpstdosmlgSOjIdER23UI5o-D9mKR0jpcuhBxNGxPOrQeFzxHVwE1dEqgks4Krj_v88zkxeMkugwhoHmRhZfSPff8c2o4I6Z4h5h7T5yrOb5thaMiuqLGp5Rdvl2A6rzU8lumsEbqhBnFMsxMi1flJ0Gj4V4RTNGHPi3HLf0XzFWWT0NEx_FLAyzCrPA1fWZXlQ80MQtKHn4maNhtHIcEgOn5eSx9c-TSOphm-5JQoHvJ1OFtSwMWRuL5nOjz3Pm3JcwZCFCrMlXo49I1FfKpvDSrSVVy0wREtG2WPSP12sq-ajphnjHP3Nfnhdr877KUNm1xy2XmrFUEz5zMLmUWntFIaGBEvk2i85l9v86iQj8vDT20HMVhnhNQz4loU9pJ1yoPi4sob32e0qkY5bLFmUsUUxqoO4pxJhfTAHxXQZ29NBCpBfmbC1cK0WJRFn2G6fhPX5ky9iPeNhtLB7y7T1XBPDpPwriiSOWitheqOrsL-ROl42S58aa-2OxlhaxGV4i2oILCMSUdoZF-rY2lWanT-f9mQ4xSe99ozmbpYW7MYYnPegYDx4Z0hoYN6XrxHSZG15fhnXp2XUO2EceqyKNSxahPYf5YV-dVJ0Sn8XFA74Osr3vj694S-EOGtljQxiHKjksxHVytRut0SxW9o_u2FcaZDMe3W0Y5vasmh_X0S_q_GFRhxiwmigwDuWQdcfZyRbO0WET5C6i_AWNE0hOtTzi6n41AX1cnhojSCl5WenBo412r9M6Y0fH8J-6XlwkNmBaACPTwduveXC5bX2gt3qyyfyz2DcycS36AEDxiTJ40mMmjzQbBITH-vHZhLa-NvEznGRQX0g4haiYk-gVKYnu8087VBKMuOXCrwoIgewMhBdEczM2AacOz5jegRTfcGnF7MFAAJSpiqPQF8e-uFh_TaU7EaosO1echNPp6YMRjeSConqoTaOCEydgRjthyhiVTZE5cpvJBFjxjs4aaeJu5gAFxIcyEtAURr60_0ihxSz03KHI6b1C5J5wtRzCbgAc5MHzMTmc4VN85DljnShVsQ4JvIafP7lm-kBk99fUjEPKVHjSd__U__1_HB8v5uVzlmoKRep09ZWneOYvfQPADT5bnI3fkXGsiVVEsAVMcXIlXkbRQYZH9pNSaSgkap-ddthyiqWsv0JUXwUZpu0ip2g0s2AqDJC2vAyo8Y0b7XJkPXQDaNfukswbQq79Kr2X2NMxBqVGqJ_JgrVKi_HQaYwVOGpfCJmKlk1vIkK5o845nNMFm-hcZqEIiAPvMAwkq549FkiZEL4I2nfyNMY1We03cIfrJXE9FLmMAccpoISNo76seTmjdIB31NxkqqKV7rxfRylvswwjsST_xR6uTxalTdxpmOeri846h7wIoYnAuLoc07IGeiZrBArdZmaoS7orFgvaMr6V3RTAFE-kRm3UB6v2951ckD22PkLLLrb0H24Ie1DAlARkNCoo5jyARyscQc7E9HjLfRuzO9r_p39jjIpY_D8EhRkM_JEovyEt4UrMPHfY2_cl-qsITA5oHobypZoOSy3ew8NhxQ38wLVVe1MyU7a6wUP77obhdtyWojCgNWMrRf-KWB84PJ2_ftJRJSTS5dVOv-QVWYUlabIVbCrHfmxdLRbwRYgfbfFYbHA-hkSwWbrKtDDR4jCUKrStsiBNaEa5nK7ZP4I-BZ81Bycd7ZgQxhAAr2JbJLy7cI5SutPQxMGlGCbagFXt8g8qt07OdFWq3pG47WOQEf1gICBsfIkcdIqIJBPXZjxfgZJa9EVdmzPv6oIP9Yukbmpq4caK9zAbMVkaGMxbi8uAR6zUGg292srMUc95TzC3cvuPHc6GRgZ8LhYH8KxGn6dfZ1L8UWgie6-4JZtMLaFouAf6EgAjNvlCJfJA5RODA6oawkaMOLV3Q6yNty2kW_hciERXMfGlqxH6tz1e3Zofi_Mtpyib99XiokKwuYdUyn84y6Z8J2iGGZaIPeQrO1jeVVFupPCsMSFKdyyFX-eeKRhn9ftTQMsKq2pcFSDjDtcSJhUc0vKHph8Kg2p5jDdn772kk7_WEQB2Fjn_VAh6NuyxIql0A644A8mzPz9bB1Robvu-V8mwlgWZdeFGiCbBbtA9aDAEuVClldRGLTCAqsAdPWPl6p9OPyu-ilgEel5UVLBgMYijdmOarmEhm77SdHg7AD4bUWRCh0wOx4wxFoSz16voZ2XerShba1oXrBI5nZIVQWYzSsfzpw8un6eWUMB8OCTDHEA8ZG9bHcew6TRixMkWjcz2ihiAFgkYUREM86FLnVeKqraRRyUHFuYo1S_OL70t1YSMjJKfUr7AtlJ95zTX7YbgQz4P2QBk7oGE9QDZy7lhDXxgmelQbSvQH-EuYHaSlIsP-qpnhlt3KYBS8-8nt-_hv8PG62doZNj2fjqWPux93vT49cM4n_78onR4_4uW_hvepv_9FmZQwoISPQ8r9OFy4g_bOkT9sLgafdpvDZt_jIr77cYwPuNbBp3_06XP-tE-f_oPrord_uC083ds9t-o8TW_NjCm44q3meTrLRrSnRD66kJcQJRAY-EW_kfgNIq_fi3BWXKSEYW_9WMxymfmRmBI7ep1mYz8UF2lujCPSfurPxDTNTELet2REjrWYEm1IGO7PmcxujRnd2M-euWNQn5MsPL8kaPJHFufKFj4J1A-Wt2U7Q7uVSvQdYul2HVouIGORGUMdBdnZL1BYbDtMA4vsF0uDVgCfpiQYDAn_VSjk96U5oT2gISyHWfAuTe6n1v3-x_7ik6dnfBcStbIk0_xW_qwgLFNEjBhgGWZDQ4iFQfaBaRmW9sOYTsn93_usROqHBHciB47NV5Wgcan7NIbjux8HH4f3dgXtLSIVle0TNdg5nhnAnvlEAaEPRJCIVAnRc6KNLYklzXfyB04h3NqX2Mig8psQ7tm1Udjn3TBIMfki09bzVHnVMLWmU6JxxX2i_96LiNAM5p33TCbMEWAZp1ilQGmoegmmzS9t5MtPyrJK_6mWCaL-VxtNGu1kDT5-uvfxY-t-s-96NG_z5WJIu8X5-PHeNhiaH4Pdj3-1KCX7zlo3Z0H22a3oW6zWg9UmWMkaujFYZ6gOn44rNxoBa0xH_OECC_dBnj-_mdIInfMZYc_sR5F9D21E9uuaiaoqKrLfAja8HjBir7CxFqtnv7qK5mE9VvYdDn5msOc1tTzw52_KfqUCwIwglpj-nGvp79K0UL_AXBSWuYj56--9QRbQ8QjNO44mWl9QXo7Cix933RbhsY-7_QXjJ0JPM1HqRNeGzv3Mfqeu6pwvbv-4gX8f6X8e_xncm9OiJLTcRFF88ZiUIdj88onT6WNpPnbWP_748b6jPsleuRmog92PH92WB0C410GW06ISy3tfPGUrl_1u9Ud1s4ssWFtXs_PZrIQ-rZoZ_cePS0AvbAVtTLHZqDuZtlAgdLMDTqQk4gdDu-4xzd2cNxAbUVrLKRivxkOIcKS21-8XretoTNi2WGHhZBM2DsTw-roEYcx2L7WnZS81Jop8tBClk7JJrHQjqPSu0LXjtmclQoVhFlLRhnWRKdtGWUKdx0FbcRomjb8nbDML8BxELOZpH9v6ldEScjvIhZlTwzVUTI7-NCsYOef6-KuyT2odZl5vFkRB2cGdHaVYXi5tSTadG5ixU3tQuPK0EOsPerYTuO7TIA7ixWK-9AZPW4-JPby9TGd5QJ137JsjnlLmy2QcZUSoBiCJzIvKeqYyiERynlWST2SSR6wU2aMc-0aH3As3hsLHGYdFuMUi42gSjVhPA0jOuit6fwMjHUNfGuS7Boz1yoBINiCxKxmDwbyrugppd1d1NeoP1RGvevgfO0cMyTTNZb6xWzYTPTv8jz1br2tTJq3y_ua5XG3_wl2bPJZZVXstlSJd8JC11lfobPNar8PfPMf1h02rZpZp0-jWSxOHaXrpr86d3Nhidfrs27fnkoYftd7IkczzMLvFvaXskHdQFERmB70hLoM3Dx7ULrBf8MaxbyrzhVakhYR_b3kD1VJUoXel4jvYpyKVd1XgNMzOZQE1wkPKtm9mF45mIEODziHvQvVm9jSRskr7QrxysNflrV1NU-UeJ7efS-Swf8TYoZJkSwWHeyrPtJ1dySzotvcfctt4q-Z8_oX6QoNqHx3afJXGSCIiDlgjCb0Kjuh2Oh1CEU8Dld9ZzYf-Zs-SQTByWNtpl7II8ZG69eVqi6CwRRUUcizsO6vtx2KFPw-NoI4-N8ZEtko2rzsiqLgXpAFA4l7ruzg9C2MGCvXoiHuU_DwpeFEoWT2q5BOCDlp9BgX9rDKeyStC9IxJ1SPPUErnB3J_Im6HYQMPkN_TXo8gz9nKR-lUAqmmRPiUGF5UQFnMuZCfHdnN_LS6n9b3NDEwRUbEwJ9u6olv38ap2UsRpYGW2BqJn4g3-ipvW3E6CmMJLj3MiJBAmnBkwhw5l9vR5UE6F7zp7gX6zBqP1Wk1HivIeh0lPKv0qxPCG55O-tVQP3kNypvnUj_zZN6jyVT52L2qzD6Xse-1qZ0iZQvWLZRMK54HucIDtIyzESaXIB99029qIZ9mMiQwoyz0Ur-prJ-S0UWYnFPmXpsX07wbEEgiyttvKyDAi8p4kxYvcLmLsvYZ96hXlflBhuO3SXxLmQeUaV51Z9JkQgREgS2I3uhX0518NgWTTI0ecG8rKaqIVtrR521GHfymARxyYfoOGc-VgpXmOOctW0KnLLaIRygIhXhizbQ9gEok0lc7WdkQFKG2ydYiuHnlGi4ErNAr-5X878p7tZpI_I0IVWUmtvTYVoTgbeUur7oYXJo_ZFTSai9hvO4aFWYMQTgOSgi5aIux2tuXrMBTN4tFGMc6gel9T-g11Yma1SI452k43mtD6GcmKNelIFYsYs5g4WuZuokzKmKW5tvdqIwioLEh8poNiV2eVbdycZoqczftZC1Mc9d5Bu6vd0xLD_2N56mrMTTAVHdT9XJj71jUvtZBO2z1pS0Ic5lZXOhRI8kuTQpUFAdrVxGKqKJNgt08HXsZoXBmUMAeFVHlVmbWv3t8tCD-N0e_WNC2C4LgzkKiCDdd24BQIQysXNtVFmmcn9dEFwY0uK0GrZZqz6TT7CuW9tGXf92bM0Jd_gvWOMRWHrWULN7VeNRbqgPhi2fIozwwfLPXJ7jyms7WKJ3hFmJabJ3JLafprjTnTIBcWo7_Ba2pbxcL2uiNaiHa2Y7vwPjAWVI9I9i9bX1BZUfVyr6kky1iATTeaW2dXtBxejNlE4UtogZwAG7RsCyPVPbWcEktXYwGPY5Uvy8VZqa69LLfUZUFivW6Wl98QrTVrlYmjE00MF8O2oD6h0_Gresw3xozYqbpoeX6W58rbwvjVCp1GeaC1myrSHkALOsMUdtBbREI-bDXhXC8lRI6p_YO6u05mNlka5bY6eRmfVpR3QPfFvmapNcJKsvTBA4cRE0NWyWHByFYWJYCAqHGRATp-3yxBy3o0krdIiPJe-JG2mbgI7g7bRwdako7NFWH4F5FMQuUVGT9fnqLr3kXOYN6ZlFShVRHAU_dfbhUuKLclqvFCF8NnKtIXjvEhBdXutXdT-4_B493XrR3jobz7nIx-PTPoXf_3u551CpkXrAOZrdSoJKxUdsANWcxvoObpb3dcMfqQoJ7BQcU4XmzYpGh0KKnjBwguC3zxtjOGed1vOPqN5V0NRWom03Mi5HCeI5D56g2b16ze1darF_VwVKMNNoyJhZKb6A0Ax9z_9_QGfhuvzHY8gMgdE7-NxQAEKHl9weUTD_04kCf4Aw-OcP7i5Z3nws4i3ve4l_I-Nfg07_-Xcn5F3KQsXVf6SgGn8R27x-omybivudRpaw82Lr_byrycYxiH1tQN2jdw-Bjji-oL1SVUi1UFAsYdkyHdXhOqL1fXNHp3XR8X4uOm5QQmzMMmXWbhKgf-SFsD1I6hmbb2x0gPmY5X8QpodoZZDyxWoh6-m4HdmRjt6B9s_R8foLVAq3NhInaUTAynOTPBJrBDig9PBk-7yzY6TKLd6bZqAsimMfBDogz9cxU1oipLKaqt9Y5geIiuOvqXhYUE3tksDSvcoQAhs6V2wkqVar31o49PmlEcRkQg6B5i2KyBF1AHM8aSVB-qc14DIrvQ6du0D1OG_eb3bYdMh1Hj73y5Psf5nD8H1-absWIumB--eUYTdP60yDZm8VcllrFj23H4DU9niZfBqDa-CqiMHXQW3e4pCq-sgkZ_j1xQZBvVUhMwrCiOAmuo2ScXoviNBinoxn0SaJ4HhSnrbN0fCuKx4Ek3HFj1EQahRSPjwNGJdaHQNAGoZz1OhtJkIRQ0qlCiw0YOSTNJmRVShmZ1a6MsVF8HGQ4xu3NJ7hTKOg82Omw2TecRcQ9JUONiN6VPdWimklwb0nxPJYYjGdVpanpTtqiY0Zmz_RwUWNxCgpHHzOp1U2lwUpZ2FqERANiM3hlfRNYdZsGl9YljSi0zw3nL0ejODtMB0_Wrwo_LBbOGewQiJbPryOllJmPwlw22j5-qBZ_g_CM8C1V0AShr7TG1q1N3VCpx1V1VFWZo37PHF9V5mi3LvIKrArnJSZvq4I-TOYfNvNHZl_Y8maqAV_IRBe7WCmWXNey5Wo2jyg5sX6GTkxxPfF-9WYUzSJPXF-PX28TUSrf1aj0xNh5eWPNbLS4EFvlbUkcU4E1CKZ99biges5mfIEL-tHiaeWTm_IKaeIWb82JRaX-2KQAUSzIW3VRy8JbZvvqVeiE6iJSRz-b-qhLOOOpQ-OT4jbGxGunM2wI9DMbqGe6dlG8rtwu7gPfnL8hqPVVJnszcec3vvzDzUdZGse_4ky4Ld9_E8BjovjTNK-0P_9o3VcKVADue2JqyxRRvDNog2_ZuNOg-KBGvL39OzU2vfGnrRtxy7-3ghunhN3ieSudTIhk-IW1J_u6H1SmzPpeRucXBfKm4bl8kcbj3C_6KKIQGjHTtG9VKbPK1KMPdfdjMGBrTYkqLGQG_FTetFyTv1Irv3l9miH1_Cv1SacufYJAyrigpPNlUPwFmLXvBsZE8RdTd333UtFaT8C_EG35NI4IbXyA8T2uxhQvcP1IqKW4JOp1UjQnrRs9B5cEDlN6v_W0DoXT-NETF2q0nKSevUrzpU-OgLDKFGJVn68C5TlfC6H5YY0t8YFQBr_RVzjNNVIYFj-_op6-ivJC0tyai5v1Upm8TK_kxoIo-kQdSBDgq6EWZiDVZVPrroezvp6iSIsw5kL-Cqxwjl71FVjB8v_AFCeugcKHUfEzVqT4gSlfkAqv9DVmpbvuOzs7RRaOvu4QRaYfvCadhj8GNS8fG3gApWKjWdkozKjiEuzB3GWxBbHhiq5IV-iKNHBvlf-1wVlAnE8_9W8HZ0O4xJCZaBDBkgRYAZAAbG0lkqHyGpCxoaaqJuxnikkIWbvOl18j4-usUbAxUN0xlDINYCW2kqvwLfDSd0eo2IE4WEGPIUo2JMjXxYKo91gQZkjE7scdqIl9h7FnxNjkO3O5rPi-egP2Gmf5dVB0gaby8mrtd8qhhtLa8m7KfmWL7IEcDo3PkycsYvMH6k7mAAp6NRI6SYgRieWIfbC1ppmcRDdDn0t4bLIEmwDqzGDA2nde8487xMZQJ0DO31vQGxTxu3xLlcVV17j1eK0M7WgB2LHDqhHVcNhzC2sVUfzIbEDmae8covjV4tTPrvzBLT5jBK9o30hcbzavzhkdATtOUyWzdTxl_gZTh-J3g2kLME1OaNYid7zSMhoSth_tnX8CmuK3QcH2y_zAQ2eu1vJXH0-a3kffsDkfXZVATBE4LOET4-UxY9X4eHL_o685HGO1jnklsEo8IbIhWxESIA35ftHIVf3ExNIg9HTxXLy3Z0ZWc8iwrj4r-ubU5RPYLd6rK-J8m0PdE7d3QvXEvtUTW5nV6myy5o22xdeg-FnBe-J-9Yw-jjrXXukc0xfuSaCbZjSnGeQgOOmf-LQJTtBYp-bQydKkCV_rNFwwLSOTEILHBeK_-F4njNZ9Fko7b3z5n6hj5YmjD4Yy54vJibHT94ZLH2DSDeYJDn2a-Ch2RJ6NfGf3c9H6I3fEOMrBoI1hiQsdFOPwnI8Ienth75V25Z7Q1xr1nRr_gJIoL7udQv70I7EjTFV8NQ_hNLKJ0SXtO9YonV7QwwWd3H6HvtdH0tOUzuKb4rVMZmhak32PcRuQhVun2JN0avpOOCtSR_BY54Y6HLAabgfCf_WE0TrMCu1D0Fkc8t-D8vasbI2IYX1K_MljNjorHgZsnOQ8fvL02fMX333_8ocfX71-8_bd-w8npz_9_Muvv_0eno2ovfOL6I-v8WWSTv_M8mJ2dX1z-1e7093bPzh88PBo57MzLE1W9b7fHxSHsPGptdn2hkHG6ivLTAHA4DTJWDoROzQYsoMkL4NbpGZzeHzcOVyYx4f6ScTa9Otw4HYODzoH7Qfd7cx79KjzEEMfuN2Dh-39hyqpq5L223uqzCG_H-5tZ8PSEZDx2BQkOwWjBuV9ka9pPNVj0MZkbswI_UEw3-v6g27n8LCzd9g97CSic_jgwYPDzhEdSof7_qB9MzqbdI9Gcv_hfrfb3eseUJH20dFBp3PYfdjtdKhcp_sQBQ9Hh93ug65sPzg7a3f2u4fdMyrw4OCwe3QwOng4TkT7ptNe_19n7ywZLkUCbU3QPTjEOt9X3gdDIiaIvl7Q_BbBXN5AjUQARBBCQJTLTDHHfpKIyku8DFzmT-bllVPrpo9pyEuCvmgaw2fi6hUP7ZRU34gz98uIU2eOkhV3_tZzIx0Nky3-EIJX24MtU72S0ubEuveMv6iY0cdPRMI-VC3S3EFdxT6Da32zPt_gsyu0XiF68KeVuhIyVeXdLa14gY1b-ews5IphfFTeuU1Z7sony0iEPc2xWu9WzLhW7t_7uds56nrKQZVi_owfUsqS_c7Rgd852q8V0E5DK4q0XuXK3_b2Xfd42sfse-Y46HQf4FZge3t7Z69LiX22a28fq9zuwUH_yh102_tsBr9DE1f5UGU95CzzxeHBwZ7-5kDIR48eqWyq_MGh_RYv-uujSiFTx373aP_o8AFBsCpzyGW6-_zTOaxW2-3sP9h_uHe4b-u2KaqBTvvOj01zGzaI-rQjQOvv2u4ceqqmTNWUcU0ZF_rnfyiEvrZvHq40Y_q8ntN3c5c64AncVCQGBY4U-9wlWgLRrv6fiLJu-4GgpfrWvyEcP9E5SsQG7YVnhPghoHGVfJl3xZPZZELA8ZBOesiiWZZxuO-yR1HqTHuPDlN3ZSMVfEsAe6ECk1of4LsjGCO7NbTNFu4l1oYf7uS46CXKqx3B1HEN8xOtMM9Kp22mGuUXcaUvptL7xJZ0_H3PY8d78KpR8P5VfEP9ZAnZUjA9BkKIBjEdEEFqnXqlxzCHsemE_xe0P232wQEB6HG6vZ0eHxzudZWBYbMZPgqKOj776fTFzsMtOvypTX8rot_LKVuj5DMqcB4WMFCIMo2wZpt6OFNNLBYHD_b2945n32ogl6M0GVcqR20hYc5sq33jNGelg-DOIZSIIUSeY3mz5TRDeiViBS7wMqi-qUt69MRgYWcfNl230-7ubaceHa9tr6neZh6foIvuPq2Lna5Od_twb0FTq25pVTMW3e5-rzKxpqBOoiM25XcjKMz6kR9V0WyswM5a-BBO6RDq6hy2myNsl5HCXbRjHojR0B8ZxEQJD8WI9-QIG6dzxG-0X0dqv5o8AHtYA2vtnlBrwxhTAl37NetpODrpW2RcgFMG4wcq0PV2iYjrKdUfpb2O4jhSi0XU5_Y2YQOcRcclJlFYaJ-3cHYHVjFfdR50Hhw9PDzqPNxXn6mdTxu8Iw_vb2iQ0VRXFKhwn38ORXF83KWH9iKrIL07m3apnc7REWGkv9OUaoMqKLgCYqoEfEqpdfTXLn3OWCVXndpyq6-4rOKMp3F4OZVjzu-7wDujQFbAQ59kHRoPHeIEIaEFic7RAxFyp0ICic7RQ36jDoeqwyYPIDGCS_la6y_v6BWldw7v6u7mHPpkr3vXJ5tzGEt_I-twX83IzK_CpPZHqpxnlv6r2Jto1myWuRmd8wcA9O7DZoZZy8qNRMBjYIE2UnfvLjgR2rlxopzN2ubA2KWwAk-B5pfVY8TwKoT54sUCt7AaMP1hshAyyA_KkJ11CX-HdIStAp62_uU0DfnVdP61NQoTbTxh6UjofHobvIPf1X4_de_KcpVvFv_uEuy6ZWnpRcC8toaylKddgf399RVo11agc9cK9My5CZ_TxXHGTmRT9hTrla3nOjyB4WiOo2bHq5zc3ftx2SnKI07rftDVgqaVsxguo1mhHcOZU7GMBxHxdCJqNsv2rtbbs_dW7m7WTsx_p3V-kex7ommntuzJ2M478ZggyvordJ-o0Xe4K_hvl3ml8CynI196VRpRVPKkV_2QDnh3sHGN7qJRK8Ch_M5YT1ntqstc47kLur0qCqjQdf1Vagke0RYL62_RTv1_jxXbOruFBS6zY67iytKs0o4HJq3CNWJ3sffTv9Wc2rmVJuqVwa5GXk6LW13rnceFK9eIRdiqrXF-fM0lKdk-r9AWM3SGKb4PN8PKG7Elqxe7ducOiJjlyyrmaAarZEN79JjMfWiz9vdMVu5m4K94JLTbbYmDI3svHiX291WJw7L6o44pMUaJw7YqcdRlTWlFOKiS9zh548TzVIOMJFJx1NnS9mO6uv1KdcrVGHGk1bS2SjusNjtzd4hn0TU8WMvp6pyHazl6mEdH1ZxRWVuXjajqOV2d01nL2dc5tSlJXZO8V09-qJOrI94KXdPwQT3ZtHpYTzZ1P6gnm7prI45s3Uf1ZF13p11P1nV3OvVkXXenWx-_rruzV082de_Xk03dB_VkU_fhSt2HOr02zHFlnToP13JMy0drObrxbm28V5Vvup21HPNNbdR59Zu9tRzzjd1mRB_aPbrTPTjUjppMlJyxPJudu85lfj4NR18VNvIdsMabdpAyFCRiIwOVUWGw3IS96YC0gsnga5j1n8t3qPIsSsLsdovvSLgK_7ABoBYvOp5Bu8S5Ed5l_gyMWhtIkXoPi0zCh9aVR4k14UDKIqoIFhP2yh5LUeHusNc-RhQGD1dpm0BYbGTCqMyDyGGb76jtBCw5i2GL6xeBW9xn0WFT4zzrKMC2FlZbA_Whmynw3f3i7g9T15x1QU1eIVtnfJyJhKYGQ3zL6ktR3iFOmkEmGKT7HGBGU8jEM6LTD1cyWMCBDK3_rtBiylke3xLMghCijh4kF5YJTagPK80WNWoKxzVL1uj4CTlkRjkT8yVNBce2KAZ0dgxrx0qNRvpWLXRamVoqB9V6NePNg0lqnXdX3XdltNCOo5gBKsCCGm1QVDnlILOJWHhz1DkmKImOaVcxYVccB8kmQYUyv6xJQro7DK65UqCw3CFw9zrbkXd8fLg43NtW7WlBAm9p3dZ-27ZF5Orfa21vU2udA26t0124tr0NrSuHrN29I9P-Q-9brRqLXSYzVKtwJ8mSmOgbkhhGFCowA0bW_Zsj2980sgdqYA_rA_vWQBFPTLMZXtwMNmk0otL5fQOFO53OPl_4-kZHmbBgU5LN45c3IynH-Ra-6hzCyhn3eHrRjpI9ibu6QjRzewFxHNWyqQDLqKKFktIt6xEwCg7-YDbKaNN-w4ZBxJZgVhH6E8ZlVFKV9WC59qu0tDlQAr4ecUzQAumK12THxNBP2dcudFTqTQ72hkIjPeq73Luv4mM83FBzYWvu1mver9VctrM3BKNBtG8pZD-872Lh94ZcYL_ezYN6Nw-r3Xyw2s1msduRih5gEuTu3v79edgJiD0KQNrc0dhGOpZPUX2IEv6i43AcmnOZ_SmC_5kzM5MJFPblUvlQTIJ5qdWivIrCCw5RGZCRzA_FspcULa0hCxKqlq-XlWne9va91ufPMn-djmdQfa0GQ4OT9bfXiTFIUyEH7sEjOktAHK9_zxhU-vdoCqLAuZfJiSOSyk0V-RgSs_d-0YdJqPEAhkCTdE4qz-zC6H9_VteSOCzflNaliCa3PtwwLlec6KnPlPshaNBCODBC8IwcToPes0kPtRbDhLrBfi-1xyP2HlTz3j5jxSBnwBiKuPJZ5VKT8lhdxhSBWz1ZmoIqk0t4bqafx2WoHRWTg70tqav9hE1gYbm9DXe7yl6YE1zrMptFHBXX9ObGaWQsBiJt5mQ_IHwYDcE_4jcI9Ujs2CiRxjPHrx8ue8qVmSwjR8HVrlvaokfWjMEIJNgcoQnk4in_8oxUG2yls0nKafhZ5ctqsdgY46J0Zm-DoFS9ULEliPIBnCozIJYE8VysDrCAFb-N_mTvcilL1JVLEv0kLq835GzbrYxCPL9i_1p6nkOAj6TfxZXwDbnsONEU8Ja4X1xav1b81NQccXKgmGRWjSoKCGaP-wyatFAcpmg1btSAs9itpqtLmUAEOiuQHn7FBi-Sq068igZbHCegsow7LRXQw5eW4tJ-Mms2wb4xPdWWvgnfNmNf1rVgnRbNXSr-gU7KkYyuILsER_KevePTRKiICbh-W_rik2L-R46rwYFybFes7Psk0Ca6HD0GDsZxgYgjudCWOjcO96uilGdW9Qb7RjoYt1csRuDrrL8ZBjaufZKy_yI2DvbVC_xiIeCOBbYBrAZtOVHzM2cMpRmESk-P_Dv0XfaXFA5XNJPWoVUKvWFCKIr-5LCFuSIeaUz_RvRvQv-mSKSX3ujYvcvxTm_SDKaD0YohywjhqFhmeQEhI2aeWqBVmA6pBcycexVM4AV0p7P0tdkfX-RwTXYz2MkHo4Cq6nj_NH78hk0358aqDtsGsm8GeME-9TuHO241MlFz3_tn53BdkbpPbCvhaKWb3etFTBMG527CG0yHMoOiT6ePP3UO71MmiLjYYwFzJU_Z3ejvejGYFZ2L-srgtMoqsN5nJa_e6527thY4uC_HsLNPQxp_KvNpQIsFdYQ9vpi9Vh9eW3Ul2aRDJgSclN2vVrzaUd5Zh_te7aCqydrQSBqoyMiH-0Q0YESDEJ66igeDdKhHV9qYBE-i85dEO4Q5evTGTYUbflJptTF692e2P7w9s74y83B1YRPd8eWbenTHZvjPlRIr8R937vrS88OSWN879JZDJqHEwHqx6svYLx56xIGWG9bzRNWv1cyN7hLR4mbsJvMuvjFjkMvaau3dd-Pd_QUox7i5t73n_XMP4BdbCIM52QHOONp3IDsXuH9UTfMePdoX9AUHKONPwAdmxA7tbyrbRVmvUniPyx4u6gVLWFFXrZVVXx0NeUslBze6sWYlPmkLGBo2p0qQi6iNcKCWtQzBZgLjqU9O-6f-aTBQMZs1em-w54daSoXegyE7HXrJ0IbB02a2T6n9nMCU_nzjU5H9juskxam5lnsyyqJp0cqzkXD-wX6BXgSqjPuUKHw46_LgI5IqHgVPcR8rmQTZC84yTpWyP4PsLzcZKSe8xkr8zxacAdJ308p1tIbbSCbllxIfKue9Ned6_GWJmWUyzn-Jigs3mXh8RQpRQlLrKRQ3M-DfUey6n9x-8LFPtbmfPrbwvOt5u9R1c3um73jsLyo5D1K8sZsEDO7SvF8mBd5vA1cnzHIUMM4zaeMkZyK5JhyI2R4kX0VyMqQl_CqKr0MxuCeS50PEdqI6blZ8mfKOUOFnvNUg3ucqIl_fFvBXnIEBdVZdCWYtTUJ4HFg-UTePt9IRL-zYEfb7uBWNUShmR7g0c4PkjUje6l4Okqci-cN0-R5fo3nNTtxfB6Aikrd4oqM6-dPGyEg4anHyExf7KWggoIhzFeXRWcwBtM1duxanRfCyc1IQF4fq_qAvRIMIlRdlda-pmjdu8lk5kkeN1NwLDqhCBHbyp316R9TZM1df6hs4uKByEY0lrdIkk_Iv6QwVqXkPxWkXrZTNL9Jrh6MazC6rZduqrL0i6JT9Vo4kHEXLJSo0XPITjUN9Ri-Yn-rkcEc_mC4PRPLMTO4vQXbtzm3oGW79HVX1zKWBYcgfVLcnFWvkfRW0poxqw7v4KV8saOBrV3_e5s95On9p6dAnANfkh_qcTWiQOU2CuvdEk_C0Ok_OWTzL1GipGhvjpDY96u7kwCHWhT5JqC59x6j-hpsyK-08dRXRSD1Fz37GQfHKXNJIflS3Z_QNjFf95JVffKWCTeez00y-wwyqCxUIYkQj3SndkievSp_3XU_QMbegs8WrHXxcjdtsJj_X00XClwyS34N5NPaTV-JC0tSdybDwEeOIct4HcxYFnoZnuU8s46uhn_y-rPgPgYHtIKEhdOym6opk36z7YUDYITngPfPbABduPUKjexY7JEdu6QOEqE5iSWQwQONiT-4RtXHJZxHV9DCouCShTTegfWRqBFY7KvmnoFqMS0Ar3avcDFNns7oa-hD5GVEAv8HWHrimg7sD6taHutz7aIS70dZuC-JoKv--ZaeBrfQPXSWbcabK5c80vI3TcAwvqhl7JU72waX8xnuFZk3Ekg7je9bvOOGBorzSAe-gmZsri_qTIs1oE4PRf1nIS9f5DDt_H64Y-Mr1SjF1V2tDScDciu-F8uIBTgc6vhWE1eGnEkWrA9lbzeS6Xpb4wvEJ78CucNoOwxi8Tf8At580eOv32vpqGvFldASXXrsLgYtP8G5tFxF0ycpg801zIqRLwMpVrjXZME32jVc5b6iYdQZYLWyY4zIHX3H_Ow0xEw0_5JXyd64CbsOUaCdXxR1h4JcFWb3aJ-z6hJDOYtGwt5nLS2m0cYjGZBkZiAnII7e38Rf2Sq-I5KC9okAzskAZLmHa4rAHYpxbUb_QoZmIGrGQDC8r9pMEEbI9lYgvtrfNJ321H0RoNlJYbg3CnxVkajYHt0iMBnbfMzdEtFyxuqfK2njrpLx1EETPKcIz3QO9ES2OEvByIxAGPOm4XI4mEx8tzeUyOocYD1M2h64hauE9L_1O9wDsY_WcMgGDAiCknY7c78lfzQWf9_Yqc7X5UpwCkbEsfXZbh6TCRJiRSmJp8mY9yb47s0E0JKahDKi400HQxZnX59gyYmZFNxm1oqSPOswjNkc1ZcZmf3d9G5tYmyJqdoT63teJM5NIDw3ZZZlKSIgzd9HjiusqBNPEtukXjD-IdahNx4ADjiS_t-zBwlNZwZW8RBbCfofj0JIGwPWjytnfIwyp3fPP76iBGLbfy1vBBJhFSRBUWlVgv-T5MqHHQLuYF-XZQQUpY-DAaUZnW0yEbKHPtjgJXKpP35TKgk55V0oJqmmKOKRBEnTay4o8K1YnedFPTvzk2qsjmRUMn_0J9B4RtaBiDH0LIVFZgVq_-smZp7ASzXUzq8gBlJexAj5KAuOqvOMnxuFDbwZBB3fyinW7kFsgfh-cxB5z2EMEGQEpoylzLmYJc_ZQC8nbKyuLbh9nfB0VfQVpdBXGvP9QSbbbpcH95hZGTjrnsHe2XPQfESqmR-_ssQldNrgiFnoDeiWQn5efMWfKGDWzyFPHFFShAalaUCIv3dKlO22V8VAoz2zvTHQ1uCa2JEwl0iicqVEtKuCY9j-xvf2k7HndD1Y4-nMWZSpuFmtk6AO1WqwHoa1DXBPgqmOBDFu6BldAKBzrMTB0RBqoIEdrJ0YMCbpxc8J8eorjDrHlTJDpVMdpxMipOAfGCAOoaN6DmwO5H6qrxgnBHDzutj1_RSYae1piUNgw4olyiqcCBGZl11nypOLYf3A7NOaVq7alAiTSoR45dmbMLkTueXN5r7xxUdGV1tsJrV83zMo-7rLQmFR1E4l7TnRSXsriIh37Rs_jvHt7cur4znfPTx3BBCri3OzwEyXQmhFjEIVx7jtRMopn4MkuoWdzRmlG7AahvrHMiFJ2-ApkUuzAnhY3z-VNsTuNwyhxlgKMhR8tcYtF-ddSIjL52X1SSs4JOKfEO0s42VKdDluoBRJO34rbr8Mscb98UDc5YWeDYGdbE4I6CWdeW2FRwP4Q_tuaneXuHuKg6YhpL2Ggdt_tNPkwqGucFEO-Kkc33Qgrl3EgeKv3rqS5NSiiTuC_UpNgkQjU1_57xB_HPRJBMxBCNfAZW9LrpS7CqzWS8Co6D2lrExJMxk94d4C4ps49idMzq6QbRHz72xwVlRlHp2hq1adbqEVPEXYgREEDR3k0EuD2HFxpVj54IDhRXtyIs4tDloRnL4QzMq42HVr9aMLeM50V59PEIWq_p46-Iy2YCknZY6YJyUdYz9aKS3HlZ1x8gtu1KDXjUnFoIw8Sh5vBc6smsqhIbpR3Ir6quwkDoWOdTppQs8_cOBc2EBd7cyjOmD9SHhK5V0Osg7S8kFrqK1ZCaikLsW6e0slkOqLUd8qNBBEXMWg0psBUxABPh-lmD7J0wJs7tfYoFkQXUYXwS6RI9C5jWhOJWPV0PZQxk--BYhw0zEUBETDUfgwquaHUmFYgd4erbPduh832svfd_sE3fb_mBfuH9Wp4PcXap8phG1H4v7oREQWP5nweaFXt9nakIkhoP_ZFAM8XuOkes08GJmmYyhP2XvrMrlFM9DVNNcv9bYttHHlXAYeDMqEEi0qkxTloPniEOHeZe6TJDAMVER6-43UgLBshD1iAERntkx-JLg3VyX2lNFMciMEEMOJ1FRPlw3JF8W0xdgzqk6VBDZe_H5UQodzOGXjQcBDRctBscCRVAmfq2AGOKKbG2Unr9vaM8xm5w6uEXWwmhUrV_07H2171nl5RyFfdf8MkShmP661r4ab8gL39M32VTd0rMcDGi4Q6CfzcuPtd8rUIa8BUnJd2BQOERie8gRB_PajzeTiedXtTBLyXL9lQwVSrnQOzbJTLLz0FYuCrpu5EjKEMFqpLBQcPVLZsZSdlWZvyGCy068c3KVuhwvoepixOMzts2ShduFKO6hBXzOKReUWoBIDj9QT9PWZ_1Npb9cvxugv1lQLLikSdQKXCitojBshKxZSxulkMCQMCN1oGlyRwGhETg8BHkE7aziZH7oS2Rj083lKYYCJrG1q55ISg5v_kTkqV4ndtO-n4PkktvnuiNwVtqwM3IVzgJiXkF5VoiRx0aARHm84rdvnHrzDo1Wa71mkzHZ1ENAQ6bJxBYyvuvatewq0X8Kq7cOPRz7rWU37w2LeeuIJdwlwDXdi3e6MCzjaOk9bz-MlSUZG0xinBdGJpm8CMbXvbXinZgIzVac9WEeYlWPUuajKEqZePYvUNP0JVYKsSer_OOCTnEoswMgTSK9fCrlvBc9XtASgaWZ6DHRb_7-ySjTsDdsnYvQpFYkXLTZJW4R-u2X8tN4tGtQPikIcB9kzPoh7rZZGOcIN6ITxis7EMxh9XgxjxgOnhP--hpVAOT1mSUPqRATZSk0pEoyLTqS-Z1VBmOPxTwTDPDhxBpAzLqIZxRtx8xS-2ZasyJiUyLbiwfh1_UCYkhEiE9iXtsQiT2fIySbnvrs6bhK8jxPny1HjjURmeLqYTr_XgQLT29oh4m9JL17xclkGDYxEKGMFraal1qlec0IbJpLQW0kXfnSsnXIVxuhWLNINbMrUXo2VQEOwVx7HYOQKzB27OcFm1h9rxFiZEmXn9CC1WqkMKqHOuKYLcsQAwDGK-NztXAAjmxy-O9x-2-0QonxHF7dBr0Gl39_sOB6-EY-exzL8W6dQRakD-fDzN0Jqq4110I-MPaFOsDS8Ok3E-CqmRkI4X1k_E7BVUur8b8Q-Ct30Oz6nfxJ6F-Wk6G1347eOSqbgMbzjxHfQ5OQd7e3zOqMQWsWkCXn71dnts5ugxkXmYl5djdOh8Bg0cTrTye5tsovBZb6A77NqJOhuNfWk_Z_ka0eHnWDcWjE-z6JLwpc-cInTdxHvBftoHWwe9VXQp_0Ik3nkUJqH_MiniFixRca1bn8OekXeM37KHn5xS8Nnv9JlQPtZ811iweuZOOCpVNxigIwILcsnMmYjPtFvMxxDPFq9Zbsi-mZwL2H96ihtw_uHwGdbIWiyaUwpu54_wKsxZJw9PYvG1qotrwSnYRjVns6LgID7KYA0OQ92fESbrMXE9T346PX37xqHD03n55t1Pp-xzc3v7Z7f4g31SqUgKpg7h5LOzS-Ku4MssYM26iL9WvLbXLAXnxq2idbAowE362T0bYKlQfh-dIipiSPkr7jqV68dS-W-KhjCW_XZBqRzknVJj6wVFp00cEebWr3yA95qzUK2dARs3oi732ZNh6SIzPjWmqy8NcfCyp8NKYw_LYaDde0LzXyB4pbqKGLtFV7BveUhkT7DmX_GJtgxI2Bwyee7yOzMghIPpE6fmU8rxjNObWlRGMRFTcSHO4TNWfQU-HER8LfKOms2TQdFtwSfUsDLwz3C5O1AhuG7dqIxyBQqJaSXmf3Sod80Wy6KXQgWYEgP7qGIyGq_47ouDBHTf9naszjGOtZuJOfuWk5n_UswSAjAA9JlkhTeciy3ZHbP2MJ7cKIaMKZKlMtsbB_GVm5yD6wqn0_iWnXU9vykQ3SrlCZ0bCsNgGKYxzEuQ_Oh6nqVCsJlpj11OuZB9U2enuMBo9S136_NYUcA6cK3eA43EMi3sBRyW5BlQQjnZ9jBXjnwBwmysAuWAOcKhOLZEq69jh-qYrw0YTBME4eo8gns_cTncAEIN1OM8I6DLF9Q7CmpsP0dRjGt-IK3psgjvjlKlIzbZqD2gTFRonn5WuJmWHSn38E3ns1Xu0s-pdcts55-OHKKTT5jc2ZJYPO68qpBFS2lgpPCsk4lNpyJ7aq-xAtEmVkBRhVI5c0NWNZTGBh6htOhmUpq2b6GlnTxuf67iE0HTsuTMbM_NJloLIuYWdvwKHO1kCvNXI4rE_31S1Mq3E-h_ZlbwPZ_EiCjCUg5O83Hrr9JWZOTf4M5lUA3ijAG07thC1VGrlVGjrnCjxkc9VS8acXnJlk13Iw_6-cQWzi4UGklMvDzYoqxKyLSBYcTRO-2XU4U4ZCUajFJQzlzILdUEsOHLAQvVnlYuvDXY36Cua7GgPdc5aLeP2TU2T0ZUkYfQpBE9nAyDrLRfxa6OWtpmnKYlLp8JArB1beWyDEM8gzK_MlScAJWO0mcMShwBNy_eYaP4ttMzN1RKx-rQQNUQ7GW8UvyB2kAmhG1HJMYREj3nihJOof6oeDPjuwkMsB6uKPCrq2GjUfFebtFR0orypykdrnAK4HlE-yjZirorGBvnsXQAXg1L55TZuZvRxOZwdArxjjpfCtqwP7hXojxkKj26guow5FsLIjXWiwOt36AEFtOx3Xe-hPIH6B_CLzZmnAZtcR5cwDHly9Kojq-OGLcTneMSoNwG-EFar3Md3IZ5F_Ymzw7nLfowBRhWgAHxYkL7fhrMB8PdmqF_4flEBBT6rOY7Nnx1DJDWcdk3K4hsJTe4Vp4ahCYrGmUACP4mfs_u85QT2IDICHZhyW-C6SvrcjYv5V1xu3KNhkobt5Y0Kv0odO37lYI4hEz6g0q6JFqH0o2q6HyxiA_4ckrcZRUe0b25vdoj2X7H7oXEXPKVD9So1Tc7RIz5XEt_54CejnSiX2Bt-0dtbRnbmNARNzH756I_bXZ8I1kSbb7e4Kn7x1O23S9602OT35san2BRMBlMCfZo_a424HlcEokUnq8QMVJ_NHFnrjNKLy9DhPGSTAnQTkM_vREHqsOdI3NvNT5E-thK-K8V3-tVShypEnmlRF4vccCTDwkMAat2IF3JxgwSeRiozhKzb_A16plNsVqaYqpkRWMdHwviylAMqgEYs4ijY3OoknYbzkrKD-He5wFTOVpyV-kIAwmgo0QGuGORIVBYxkpKkEaIbAOpbrRqTsWW0NMshUzqqZpgr0Q4JZHUT3wav3IcRKwyDczR3nZ2ynURzqs0HCO0jj29fEeEpeSnO4SBK2JFSp6cl1AYESJNwnhHqqBoHGlM4xLC93p1y7MFRy79z1wRUm4dzc0-tzgRmrAWWqqnyymjU1e_QcB3nlDz4FkdTQLDdJGIUaFJlFHl3B6Lz5-j_FSTyrIA84jARNH5LOMAXYTmr2n59POStT7lwSd_KK2oi4wFMbAg8tbCitHp98WE5dhy782LizJeh9ji-FJ4OW73HUXA7eTRWG5dyss0u-XARw4CftogV2XgU-8LYQWCowFhyuR26K_0J_u_1J8lccJxGZQlp_UvhixhTNpuaU-g3BXPtQVUoIJVsFPVR0XId9zYq7OWP6qdryOTOLkJGwmprPNfUTJJHaFVGzjOxR0FtTqgWlbL6SSCx_HxowTGV6sEIlB8PUXwHdSfjAwGzspvGaPXksFd0OFJDeX2gHyJMO8JgeVLV4n74-_ZtGFu95jPsexYA8OSVjMejuakBhPztnR0DB9FOypDoZc9Ylzg_-ecg3GW4XGgBYH3DL05thxafbWzlg5YHFg5cSEElypYvK5891yECZzHKldChHcUwbqlsUQOXkjEz4PynuFGIdTLwC6LjuPDA2GhUSYzh-p4bHmkl6VkmFE6ZKvxSz3aQfwcmxpkC_EY1aIVKIlfKkjmVugFETeV5NflG2te3fs3HJirxe_HrhXOJ1aNUwSJiVZVMQ31FOASQbsE3xDfwPKcqNg3-vdt0BGD-A8R3zMmW58rRsIZLnPGN5Atqcc3bP6Hx-QH6AT5kY2u3lZiPHJYgDmHI4AsDNaXcNGlrwBwkvbapWwjOSWppLColNgkTuJ-vw7iz7Ccjl-I-E_T1Xc2yGzG3Ej8F8dhIMzCGk_mAF8wsRt_sEzvCRE78V_lJQRaER29Jn9ye6rkVnTQcFgbp-LzN_5FuzVTf43eZ5ZERQ4BmmRDT63dEE6IYKiOMsdy1EVm5Y2LP9AkVs98FLSPdU6fv_TNl-UVXTaTin8INkaCHJl4Z94mZf1IGdXQNKigDx0WKzzKVASeRiP-ASaNxQ8iUxe79BukVgQn-hky-idga96UrYk3pm5BkKE92mO6X1mluY1YzXI1E6FafeS7b4Oyd1T_M_etQjSrXzDuiH80ISpWwjiKqrSqbWUExpE8h3OkUrEdS48vt__gqitfTJxfu3FlFu13VgyCxZvBXSF9AU5pVpX2IHINoayKqEe5yESQar6QVJdWrhYmWugyLSRrOxJzhblAWOwjYqM2BfBcrQOKc0i92WSHRZfGAxyxgvHPinHVE828eKgVuTZ1dd6Z5c5ZbmHCUG1vRxXr_gsiU1UdkVgLCjYL5L47E5Xgn6q_ELjYqel3_C5gRTdrgCKsdUA0GgkLzrHGkGzGLcLN4WLBYQccPDtsPFX2h9YyYvfFRAZWhAgpNwXiyzEt2CbRACGQlEeiA-1NV9wYwLDbqkTRLssL8RBkn13a8rt8Qe6i5heAP0NXiICN-3MLYblPUEuf-vbTpQF1EX9Xarv-DOaJ0fr6nYoGI_e7bFdAbEI0yv19cRlmXznmuP-Qqvg-0NadLZhSunNNWfh8hIP2VdIDf85H3NM0_RrJsxSW7GlsXN4BJkqa7ZQgBaUM_6u-earqDdzBp97wvrdbIejo9Kkp04vA2OHANzYBLHvLdHfdQbjzF8IYukU2k4tJSEe6jaZRiYLhIBuEGEQyxaLkKv6ECTVfqhSOA9EKx633O8cFQVi7VKAXIOIpf8BAMFLBFhyhmCfC6lqqpA4SiMdCN_4gIOGP_-RTpCP3vNJQX8jN53qVCFKP-lQHTVk_1YkQMee3coV6pWxs1dAeb28_VsxGhDOivx4KVJX33WoxE7Sy3HyPq4LbTMdYxxIorqNlRVDuY_YmoisC20PbkykHJQGHxWmwfvEwObBDZ0NzO_KX8HkEM8JV8yxivHHz_ts10NNdFUCurT6mcSR73_pYU2Tjer_vHECN8vtGDzCEjd9voPyXtShn2QqVhpijZzlPSYUv2NgNM5Ymc3twwCEmjF2t1F4F14zFtFf8iVu6I5op2IdjPZXOCypFOo3m2gIkExzdlqhRgVu1kBZnf7m1T5qEL0G2Pw60algBdSnsZq2_IaN95mepy3xXDlq3DIqAC9_WiTfmlokNqSTjzR5a4_QyjBKwFfXOoWJ1lR2zgDdcUtIpV5SCvsHQxi-eUDfGs0wb1Lx2TbAnmEvhMIdO6HFrEmV5gaCeUG3qZPxccS4U5YRR34XnkgtsBLUS0vX6NJtXbK6SPatPJNs-DBw187CBleNodgkLWJrFMDqHvhU3I5GiDiZcQq2qb3q16-GE-tw0eOy1ZsUlB0PFA4T9AzksRS10GoYDh3I-O01ZCfmd8F0U0aBhao07IszQAgc3BCRTmTEHTScN02WVd6aYlZcUIpjpA9cpK3AU6fSY0Ps4wimLYMvm-Wk6I0JjrT0E01ORhXc_fkaUrB3cWBA35uqnqZ6Rv1tBa_V6sIXW6i6_Bak3NdMSY8_GL8vZiPWuJHQyLa-yGtbPY2jAQusKpua7KaTGGG0MuyoWzr8crxfCHb1vMYyWyhXUx7XmFfZgm-6pO1WdMef4B10mmPNmm5qtYwWac946dp8XgrdHwvt8intfRnuvyjXdpE_sRzNBIFb7Ed-3oDWpHTTE6pglqp0l7mOvTLhTb_FYXZqeV_eospC4RxWUup7kKavOZd-N33DIvGaTmE0fLxlH3SnvsUzTqb5xyFXfBA5uqO0Q4F6HGWHTiet5ehNCbM38GRMhzrAkYYOLCPdhbgeyGTh8L90Z9mzasNQvaNWZq_PALt1U4A2tgdqgHzGvSzt9XC37XUWhI26V7WSAEfsawcbpeUTIwCT7ZYmlXxZJZwWoHUyJ0TWDimkQSVHkzAGsB7WrqWQ5rh1KKcguRSFK2qmpJEOwVgglNU9lZBrmrflKUi6ZnX17Rv29QkAabYVe8du0EsA10ywR98kbxKOqDwOWBRccfNPTEbPBvhPeW7sqT80wDwNXNtUr8gdtkYUTpUPTujIOfXUM_io7loQ0JDsTJ_qWjSM_4Ea_1f8RcxMa9LvJ8OJS3IozcS2-ipMeGAK2i1gzfCwZ5lVOya1FP62ydFmrjBaWVyKPVz0-rH1Ssp0YV4vIDyCHsWJCmTmUXTdVqHACRhpqs7a4rEZoM7eNSuM219x3mvVn_ky51RrCki3GhhiUW7hdiXCWg55hNwcsK6If-k9Ftsnarke8wWB_GGQiGhwMg4J-DunQWorbYIBsVUacQeyDa4fXQVnV12CnI05KW7-38CN4Z1TRIliPrhkGGwJrngSDxEXI2SnfpqXHTAXcVC_EHRXppclCaFKBiH6nwcmgO9w5wTlwQs8dPO8NxcvgdDfTkUgXizZRTyf0zqZ4eL0JJv146scTaCxv6OP74fHpYoGn45dYH04rjk902mNWi01pHV9ub1_T6r1kmmwCe8RJMEWa9wgxIzeEmNuhTYAqm80LcQab7HyxkG7OYo9nmufV0Oh-Q8JQB8eiTVvDqaRBjP43ZRWVr5Y6Hq7CamUGGFHi2N65LDes0nSgO5VlHZ8YNYi7YEu7HyGRgFmNOjcrMgxcSCnF3O7b4MzF5Q2ahVxFcP1Ph1amD636ec83VrQU2e6Ftys9UwKa3J9tb88JxvwZLSuA5jIaj2NJrx1-VWBGr128LgnpysQ_V4Z0IwFlhP-2VYpNt7dHuL5STdodtVAMj-KcLU9oN2lIJHD56s2_Bua9V9DOQd363h2AbH6GbRTyvVy--DBa1j2qqchrH-T585up6ww-fpzOXy3x981yWHv71__6n__P8P7CHbQafWLw6bw9nznmqm5bpPRvFkBC1ehQR2KiaeQISlUPkuu-m29vN5szzvZ8gldYhjTZzMdogg-PK28onRJ1EHo99WVP3STe3FEO41lNKPt3FQzagq2KHxyIztCqEu9HC9pyY8h0lLc46vY4LYXBbmUMEMNB_D5FTyZKT2rmb7TmVqLF3oHFBUw3zoN27_z4yiizz5tN72pwPtzZoSNgTA_BXBudlrFoR-I6zcb5E0ktSH8izPIjGvJkt7v38P6h3Ce25wLKnh4hj8YFDhQaBOSNI2Inl9cXUQwDBmvKCXiTQnXCGuMIG3EK8itu1A8FBEBKJDUTccSxm8PdWbPTbt9Pd-GhoNKd0HZHVMGMTTqs2BOU5wy3jhWQPgo6tBr3Q0V4_FEe1aeZlL-E8VcJa5M36Vi-iGLqW-vk-7e_fD59_uupJ-7RQn3WYXHUrM_YhQCdYb3Px-MSF7wO_mglNGhUA1_bqrHX4ifxQvwlnol35jj8yZy_PwWvq1vH4refjNFJ_ydfNXyvGbzr3XtkZBbui2A8-FzSOS90qGZqNB58_me3D_cRzxNoAeiBHYU4Q_e1wEe66M695jtPfG42_9mlvjM-eWFQx19LZZiz8TR8FqgT7vPxXv_SbYsXO8_EX_RvDEcuZqFot126HcEYan_IZcbQo9t8cel2K5_uVbKgaV_eBOqEPG73d9STjxOQm1Zp6HGbzj59JN63CGlC4zkPbrGt2bTksXjcPPXu36J_nHAjbpon3u5LAhFW-sxKWX2gz-9qE_B0LOD9GEReeY4_Cvuhbw_1SqEomCBiV7xTEH6CwU8vbRmczi62cCJF7P1zb8j-aOmXhePNJopXDzeRtoC-A3hU1tFJReztsvflHdVcyjNHHStb2YU3Zv2px9qvCGRx4M6jvCSyk3N9_wIWxuIE3AcuatKEXFky-MSF2iRrpYoch1RcRWMCBW3Q_K2v7PJUZRErSNbJ1PXLJkZorylbnw1aKhoUI1vX6VoDxSFrOYmDW1NvWN8VEb3QX6vxh28oukSysbEf7tR-8Qe6Fyx5X6GnKzZvyC4FfJWqkKGHsKEhts1K1MDEKMyKShMtvG-sExmCKaRqcU0ybSjPOUvfmU1hzaRmLmmpN3Y1C6aYvZYYxZ1hpedVNhFsWTmDOcu7czbNR_3sgGeFaYURVweaEZfd1xK-8uOH_E7008rt4qT05-pqjy6GebPSDXYwcqJDkj8mRu_LAMbMwy-l591Y28bRUKAQt-6XIw7no86Lt7iNCnydhVyopy7ypfBTqDOFs3C8nnpRclMbagH6wtmxubTVmxnTsasgHcxYf-HAD8aVSs0DZwdCqKv-Tscv3YupZSOC-hJ2jP0cGqY95S49P257kY0knFtLvbZWIZo8HMVR_iZ844JG3f00cD4O5sNdFbT-qhz5CIEbVjpcZLfzq6Bihzhqcu910LXliGX7tObL9nFApFE2yOEs-SrAA99djcQV0DY9FVWdnjunvelLlSYsvmCKmqd5QicNDk2tQD-JzmJCTD3nlycfME2xuQdi79iGlEZ9pLI4Z-ExR3sseUr0x1iF9ZpAaoIY9uyKtJWPQtqRxthR6IQScuE9mIFRZlZqUZFHrkotqrbvBTsBKXCZbgBjIoJ7YfRCNJ4ZvYWzG5UBEK65UYcwQNt3FjduoiUYjDnja74XosUAcAcTsPNz4rucN49_thd_tJnolYq4rnUrgC7jK6YcZq-RtNSlHDOXV9vbV5Z8aQCWeEuv7SonFOZGEHgc6hvLnfaO3RWe3lyuhBsJf6bOKxZSfiW2B8xmiZlpwJmNdl_KVFXg-FKkWiJoOj1ghJKwd02YHsAUQlnFz-xMpUp-Ym5msI6-1Naoy028GP8dXlN9sOTrjDRl8kidj_O6-OXuL9VVjaW9LxIpdy71Xine7r_RK6ut39irv_Xl0jC1cD6TBpo6viL-hGChQVAXQ_fzI_H3xFSMoSkqcGPHCGzLxpTGvHS5ao6N-sHGDU4NCavWpkGbDxBSuf9IfEnk9eeaeQ-xN2vs-1K5zMVHmzQbMNowboWhnKJuOi9ff2d3jLr_ksFX11wqpOMTfLKP2CVskH1W04CbMBsyZTu10ZrcgBInS8bRbKUan8GHyly58A5p6i7YzSyErgiGYPU4Ok0ocfnESMhvzZXqMxasX7DCh6XrVLeqKlipZnv7wurCqnkmDfm5DLPRRTVXpWiduvMPzMwF684s0qAfVyXVOh7CqwL7fLeIpHLdM0xGF2n2uYo4VZKvqsJ0TS3e_ypOxXVAH69o_biqah2skxj11XT4Z8JoLYhlNSq-lXmExCOe4NDZ1H6vhp7hu48VR30zpuOgo-1zTMpiQYdFkcU_wo9Votzn6ucwVk9EGFwY3zUO9rsWDrJI3o0fu9elZFxct9A_iE6lew3naH_WlXxCjRX89XVL3kRFcG11NaJeF67Yfw00qLhnQTJ1v9K2qxVieZNqyT0NoNJd8StpzCicFp1WjocoVrkOvSMeEpNNw-sSjTklcJFP1dy9prmjWVINB8ll0wmc5mlTxUD56cPLpwZtU3c2emE07h81ECpvXaxRCbTLMBgIWZ9hpaVUVqVSsopHxlKCnSmfTDQ9VNcpYPQa_q49reopap5l6Wk2dTY55K25mS21qDDb0OP-ypIxFfqpeoBvugTXaGisREezf8XSMBgJBWUYExawb28zsQjUxVyNx3aBK7aAwlDuOMwk3Ev358oIkBg6X8ezME43V_2n4B5n7ZAtNGNB2JXtofDmsL1_46oVFfKS7z7gIXBroRR0nBFl6yQH1u9-Z-jL7112g88RaFZ9jLl3d0RzVzAyIZKVNiudP7_QU88dLRZQXwLfjIySCz39rKaCZgfbW8kajYbLEg-fNWWmMZByrzKmRiKCw1QU1mVg8QE3UsswaX2mZ2PaOXFgEd1KtZ8jpWhXHVBHvk8cSzxUL8oWf7b8OxrNWAuHdS10kFL_ALeNNjxCimLJRri9wiqYYcPKwGQm75nO2N4u3LVEvsTA9K32mrxK2-KKUFC8gJa0F_-hNMDmkNeukatl2NXKqXLOSMsNLQFjd1nXqprG3NLIJEENoNXnN7474eoywkU3u27xXEuoWNGys6Z6gedlcetPWreVskoBs7Ouk0HpZS9p3T4KitYtU17ESzYyYhBjWP7ojGa3zfHvOBmXmZilcfAGk7xGpvx77yhRu0PMT-vgmDgRRlMreeXn1eRqLTIZcxVHR6t1cM5KBUiDWj8JDFdlQdGuIv-y0wfrUSCu3LTknQO23iplscnV4vvMptU5dRth0d78-w0uq1yNbwJ9QVkhDulu3I8aI-lPljDOw2bm3S2V0zOx4bullgvscYO27jQby4z3WNbi52XJsnl6UDAvWVMya6UvmLVkze1AAEum4ikw1SuXv99RTt7Yihk24cBSfXmFi3kO0Rejr2fpDV_lYKoBezpnTsn6dlCBlVZTSxWAthJp_UGni0sYfGO9fYSGoUQ57iubRRocjBod4-6njHajbqESLruHDdhmT_MW-y9hsVzxZ5KLKMj4YguIyqi8qk9zEPEcKAcSxGUy1_CZ44nlTNETz-qWkQaqs6qXCNUi-BisPUx1PKUJ28F7TCZFsMXB62IRtaKxNdeqmPG3RWn33xaTSMZj5QEdMYtqViLJ38GpicapkFCukvBsLkPz1_ZqUaHgyy0wN0CtzyJzP7nRKHoM1AbxZR5cusVEdwG_HLcRp4aP84zjwSivF2tet-HRFXGg6KzQSdggBJ8VlMrXTVy-zyxQ8U7kR1XDFtjUlKcVsINxt6HWKgb7Rt9mkDDviVwhdDeq3smFrLr4i0opOXrf5cJdkXsqyhDuSXSPA6TyRWgTUHIccOhcSoa_7JUqKxV6nthgJ5ow2xdXljq7xImykw32-dILOtFhmyHxgI4VJAUDWkACw7ZQZUWHS2ZuDuuoDLQITcEG-QX7KREnz189f3oqoNV5_OH5Y8erEWowyoh6sqX4JueCsLZMlEtw3pEu7kcx32Z59ytYNuSQ2Csg9QZjqGT8iH7Z179kCB-rPQEfNWcy9rP3hiSz5qtXCGSDzLw084wC9vNbugOqOChBzdyV3U8f8_tu637fo9-P9_v09x7M3-51HO_uLcXb1Y5BYzLqt6MjkjpiEH839FlGq4zLEr5VD-8Z5WgHkXIFEkQiZx_-KmwdPIevTh4utms2OCSy0kg8Jo62HVImy-YJ1nxOp63-h-u-7Z19_HloXs3_HLE7aHceDmnEkr1T3g863idgWfZ7kkKF9YHZHBXZkC-_rnhW7fCduO3OwaNHcnffq4UdBXmD8YLWN3gXxt-ZyIdLuDmUuLaeDEtZDjuj6mdwhhqtKQUwSTDyLuBXJ9reHkCWBRdTVIX2vwjvnDUHm0SdsrUQWwYNdBKiDV4FO-6M_gtiDmIoxvSe03-B2hq46RnEWEbh8k-QQHcDp_yWl4ppIeP4LQ5TyGLKtyAdHAybTVz4QBr2M9_yyDJlm5VbE0pqo5ru9Ud-20PMQvMlSJlU4ROYV2nQKR0mwENTXrxAasAiDIYTmPBpWID5FCSHccU8oRlc0buF6GYwFsVKdlHPVrPLXi9gLNCGxQZ7HixwqVXHLIHBnHqCXRwxQooRHJauoxR_xy5AjbkZPM6weLYQtpbyGLfrIfRC-f9fY2fP2yAMhOG9_yKZiISskqRfiqJu2StlaaMMDAy0CBRAWSr-e-99zx_gBrVT5ItDsGWD7bv3uYZ50q7_Wb9fb6zfOQt9YJ2VekZreA9jnlMXzEtGiZ9tHaBS2qzXCgkzcFTtXoOyILVAY8KU2rU81GVVuMUAfz0h0upMTqFqKdrMVE3zJTfax3DWoK8gvtJWCqpby02evvtH2zF7-06gUkPAoSATuYmId3n6oxOGM_UdyHYDnW-NbNzW9xUtkW1_l1xWeW5RWdCflVQqS-usPpA72kreOCU6KHxF-T7Gz5QRHEVpF_vSuFBFbO01-98KcaTaNT0ds0wxm4_-eKrUUZB3TpVouHItG1VcE59MyxAiH32d3EDTc3BfoHpWbAaeHSn2P6qRxu3pjziDO2CCJArD0F8o675Ap2A90NFPxIiuhYynjtKZxLVR079KO8d5g7zfZoBf4BJydlkXgXI6DPS-mGdLPdqSOYrRAw66o1IubmCEEaQoM_R9314SezCSVh8suXhaWN5omRA1YL6n2WIzYMhocF4wWNa0eFE0TFuYgIckOQCWR1bi0WJaPbDg2A6wbGjRDZIUn1mEiwulFy3pb5_w1Fs6PeqoD9Ky0CbaWbDazYIKlpSDmc_OKDT7e0QQ-EUX4GOEvuKkOvLoQsbo7u4HpA2FyELsAAA",
        br: "G0HsIxHCxgEAJP-zTRQlG3bpjEhNCw9QLwXcEJF0oOoPP60UuyZa3OLXzLtR6N61rLK2In_3KRoNM_B0V8O89RzDaOdkw1_a5gbzKnYQ3cvrP4sn624SxWdg28if5KTvR9nMP12lMsGvUEn8ZS1c00OWZZNkwFZD-CM3_q0mNmMph9shCZhp6ldvqn39GlP8GPiQAVJ2TtUWLSdZ-laOC1GkIfBIdtTqwTYeIDIor5--aX59k00fnsAo4TjevdnjupQ9jHhSC1DpxWScHhoUnkc11dNoKjGNZz7p3KYPQUgd1npBOt3TmHMa-f3vX519_YYdVnMPOhbYoco-eUNo1UCIQfPWI0AuFBdJpq3ll6mvpzOZthqZM1iQopWySO8nuOFDTzZiBPxZrphCOzzfWqw1eQPD0tWPKSwbDAsKgmA9z2qzUprc22xnq_OQSngOpUZiTyjGt6b5iAbtRL5NRnrqtu9XAlM6PZzi_99K_UyrGiDI2SnN7NHuJbMzO6Mor1sWoO69713hvVrU9aq7D3qDfxeWrwZIDhsAOQJI_VdVTZ3qJuzTgGi7CWrOgahZoCUAJS_U9851vijNeFmWIHTKWdfMx1HoIHKSOQgdJTZhbGVkiCZa59aIkQ1xSR6SSZJ_T9TPr0tGnn0KFp2dIYDL2DBbERaNL-8mNmvYAu1Cn1vi75UlWU7SW4apdLktadf3bsGAMeaVhCRw9_8HULawh3Phs6GMx_tEdUpjBjpJo1KYOHBix5Y79jxwz3ueuOUD7_gTf-ZG1nLkB36UVyLQBYXPYzxFALSwcxBPTxn6gPQRAN0MCFS-EYFOahC0sEsPkIjOo8_63oRs1vd5g9PYwZalcwx5LdIDXgDM0Bc4ZmgUh_FilRT7bKXJld04Qn_IKAPQfCFRPy0PpjPSF23KuzVZE1TbpDwpvTKeZZOIEuBUdnydI5xGtN1f-fn2s7MzCl46tbJ3cw4_9xvf4QpfpMB3w7wOi9fgFd9XqLM4rKs3PHZ74Rp9EgpGJoTNv-PuxOrsLEg4tT-bAoNvH79bXSU7zC97VVZhZfoMtw9-wtH1QW94M_NBM0axTXgznmGOwDusILyyUP-Fk2dYALcy0x8EBbWAxsHsSpcDfWh2Y_Bci24jcKwNqTPpygLaR8sQZEScSIW_DZ2pAKIbu-o6K_9QOMgVCZLYN6pSdYDkhPWq8iUtM5YmCtWLkmaV7cx8nOBUhAoTYhxKDFfr-LqZ73dqARrWAZPwElVR4cudD4ShYkJNgPmH8hVQc9r_iW-fQYRCcFWqUrnlADQV1gD0lME1Z01aqbTKn8srr7RpmcjsuCd777c73aOqDrpnvnonkVsnRCnPHkZGj8ufxSuUNQwNRr5MpPZr0Z5YSenjLp2iYOwJlxfS1NXoqasRR1iAHsCa6OnHI0qNoHt8RczGC5tdXmjyc4SpXcXczWEdiXs6KR2uCtoed3U3PvV-F6hJTfwDQLwbxqhx5RmPQ0MA1k0wj_w7Hs3U2nVIS7ptHfweIJ6gXjElJSYCi6X4BlTxO0JbggFeCsPZG93fSFnq99Zv9FT6uSzJc3YCBJgvO3OFRorlluBBB_kG0xF8BIMJAdxP_T4uLIB-Aega43z56dPZ2Rl8NPDiRZEoAD-nuCy14XWU5HTUFdy0r-6z9PXjpa_2gj2YcNPXG4A0V68bR1oNrzIeYyp-aott-aFpZS-dzyJQuLl8Lodwgv2EeSRNkLZH8Hh6-rIDJIO4EOxHfr_rBTubzv7kqZ8x5Yj6NWkiesL3VeOZSlnHEl1tz-jHT6hFD5BqaIlgdwU4GbHoaKqLTJUGp94D4izAkOBTiakrbLrz_yQmeLCTi09XuJ4QzgCGmysC0OWaXPuHopCx0ahoYauN734fE7XUaftPZ1hMBIj92ChVG9uBIYspMZM0keybrk1P7bsuKiHselOLgRg5hb1oRLd4d-J9L0kDZvlvtx-5x_3_tcikZmRYBmbwNPR9lxnE4rBLVJfiy5_-upX8zgsBiR7KbeymLCAVYpZj_AE7hihGsjTnkdgw3osyBLY8jyoakZgflWhHU2em9xOh9y-nQFKGFGc6_vPxlsjAbbBTRVbByK5yVNbGaPudLpjXatkD8ALKciCqySlpBa0KcNmevnTQmqAiLGCWauMzkWctzyv9htpownJ1L-gQV-ZTX6cNXvbUd09Mc5FvUwqYwppaHWtb0YySpwe9iAwxgIo8U51O4QjHk9DEHFm9hZqUiFtpLCqCVF_4YQkRfUhJS4b93yMQuzwANcJEtLYvbWKToyheG8sVlLWqXth2Co_T4Cc4jyuaWodTfbW5Hm94wIotC5B08Zk1IY4vJiGhSuXucDupJaqxucmf50L1hKIX3-uUJq5R1z6AK44-PnFVid-KgN5z39g-gDgO5ZUQ5SBXWKqTZUPh4ROcJpUFmCbsCLbuitcQDRAB2VnA0UoclOHZ0DhzbnbBbW-Gbg1i9XZxqCnUi-WeIeo4B0T3eIz4fwaFSU6JqD9JBL5uzKCqqU8itfaqqbJPn2MNE9lbqb8lraAXuMJARi_gCplLyc8iaXZKx0lw1SU52IHWK0dK_tx6zFkiFQUVxA2_f62Msug_sREiET-uh78ZTYe3Q0oJDi-pCqoIn5CiExw27isamGKLX_PcEbSNR96hxUsIbIc0edpxhDuKdrCLQELDigRXDrAxIgzvRFJbM5PELeJhE_SQrzMtDSjAPNSdupeAlZef4RJuohjtd5Gp4KwCfR-6xZaodzYc1FOQ-IaHmyUPXB-GpoF7Lqica5fpOoOvJtY8uLNdNSBFXaqZqYOh_M-3GIFJoboEufJXqZoAMVjgoAeo9nHgDxHRcHLXhMzUVfsmxyrUh5hCHjHaj7yka5aedFwQnMIhGYUMsKJUV8rmzJ6E8wEzAc90Yhxy5J39pSwgfGy4WE3UGuMxrjLAKrJ7nz73mogYgyXb7SSaMDl8P7cyaCsBUPuQlOjAbuciJi9BvGmyMh9lg2Y4YVWa36q-oEvdYEfl_2XmoQMoZmhL3RKDV_RkaXqyMsSWsopcSu_tBPrgZK5WuY6qtnilYhp7Y3gSP6sTYJ7p4Ykhb-TQbs2UboD4uMtSAOWJq4l03UtLJTZMWK0Ga8104KwLWUZqcD2bPVFAz4r1CMd61TjFvU9nxohAuGrlCX1JEuZCKhamm8U9Eo3ueQUqm-yw9WjIkltSQO-Rm9JT59wtw4jMaEKChdnYPOyBrbMbFbMg5vBAG-KPIrE9MmGOqN0SYU4P6eAu5ftN2BcwaTJlr8ZYRtj9DRpSL71ld0GH0xWWB2LjpKefwSqaFKGKdQ-wsbKtLnlPkTDrqozLxbUwZmQ9aak57aQC_wskl79AbF1PKpPRG9_7sSGNKDEUSxrg40GvhjE8Y324xoIX7EoZJJ7vU4yDg01qLQVz0v1jtMJPy3qZukvCBlEI5WOhK0DDXFS9rsGGd-pjS9RcJxXtsMXoISAtiiP1w0H07gm7vEpWeoGGTYt3w1EhtjZDasUYmW9V3Km9Phw39-kjnAoK-eDYiW43of610CfdezhrnCuLnW3tMaCC8MmMBDnUqRwyRkFNEMMPi6z3xbOH3isvpP3QySJmoOid0-rk04jFbWOEP2EdSUBriRvvs-AjgTgEUuKXLVudlRU1Z6v7kzUDoGrD6bAxmKFzpgVUwHrr0ZAmHLiagt5TCu2oF7I0TjFDSa16HTypE-k42Ou2vQ2MDWirguUVAjlqfnaqyk6zZ09WWocX6hnIF4HARU8QrnWJ5QaAxlfxrkF3eaLA3GqFJxAf2qEPOptx9PUk-ej0s1Wqoznhb3UPjiqPshTEAJKEk8iWdGoECkQTHgVoc1pKeOwumKR9JJqQFenvu2oS6VuqXieAASsbdJ9NlbZACs0nWpWo6JNQC_TliAaEl6k362l4jNqyqUGIEULojICJXyDzc7iHvwE5E4Zhr9FosYuRQmu3jZ9QxuuUmwPiX0ZAVWkHO45ubyih-8066pJZCeIL-P9V0XTTf51CwS1hG3pIk1pJKFMAqhyMUMEM3VgWWoHUDJ0fCVSCo_VwPOvOI-qEgmc4Hyqp0kDGfXoAnUoGsOJ3a6aSAhyep8of7EA4orifz9O9DlUDJ5GDSA1E_sLPjooV7ESlt-vXRZP4J0FpK_1CMcOdspX2f5MMpeRRxf080hJgH_U0QIEULIFC5VU-LJ6i7Wy4WFehD6Ob6BtryaqkZUTdSLs1j_1JoWqVRmQkmdJ_0AHj9xaY9NltyGDFAP-CZjzpGwf_n4sjrHXhZhwx4y8rBBbPdUF6SKfJv0V_BMXaX44ima7D8YHeiwTifxLsEXsr9VbVR4sd7tPZP53BnBPmeGOl386hk97jcF1NStvLZE5VQWmy9ve3LnES3MHKqFLeSrTfeloIAw-vjWeHSipgtOni6tSmOGocPzDy3oraJSb4e1uT3W53oYnXA06dOZqG4IjCpRAGFRr4ypHoVO64FFDO-H0TUr83R7FnDjNHk1Pk_WsoZqYUE3pr_gIrmN3HzYHrM6gBkLIi0Jyejwi1Q2K_I-5913stKteGFGoo8k5shw4T6YqTZYtfH_ssUShDEBBx4mFwcxwAaEBNRpEKNdQF3_AiCvFQX8JIOJVKQuYPY8E2GEPtYNqtiRuxyeb4gVWn2Ia2Gu7fGCYmhwOAdw4J3bkmojWic94KPTxspJygNQQnfoHhuoRbjWz4s_6EmVt_JW4Oz7BZ3WvTS9amqBY_MFGLHlhAih5YIoouogBoAkgLskKsPVVHBN1akAIrTGZkTCw6IJyUfXhGHdp-UOvU7kIURIjNaHi0rfNwwhgUhIUzTgm6rkWmD0L4xFwQSaD2lwmEtPp7JIlNuaEPMpa2DRWdOHJKGQ-r_2fMxYdvOyYPoCedh7YuXLdHOCJxpqnQNmOzcwZlcrF3tPQwBIhXdvt54IlBbuCfwsWK6uZ20M-HgIj6DZXuet1Yp0Bpzfu_LTQhc9CkpTRF_o0m_Uo95bKZe0iy0kaYfBKKuYvv0AU0CtP76ogwWJeeIxyJIxoHuC3GHA3AD6ABmAAAXhNUsn5PrVSiofgOGT3ajeP5tAW4mLS3wkh95_LUGHajjgzyiAaMw70uQvpNgmDW_QDFTSMBM-FUkfUrPhOc6S-L1v1iUht4cDmGjPRu3OgggYvzrYmN20YgDmwyMgPtI66-4Ytjw24AunD7q82F4rmW_KcpAL2b01kio-PGdjB6uo-Cg48jdNhHYmDQQE1j45ANnUmaQ5MwkBvE-h_SJhFCUx0f_sY91BehagbH2S_EuH8QM6FhWN4gKcJ4ByDxiidrn4XIHdAQirX3n8FDpUqdu-Mgh-tOn9gy4CPsoEFXr0-jC_clnqJ9wQiRBencWAGBxq2lz6v9VaodbRy8Vh7gLl5j25A3nQgrjnysysmFUU-ahg0L4C6UvWsCjyG9acysQNkXXGUk41x4Q-Uhyl17j9sEQ51Gb7xtKSBLoDo0E9c3e977pm5KjSzTAvprJZdd9rbaPA5OY4XfUKLujXTQeVBXeYXAPvQrHE5NV2Ii6qO2lv_5CHpuYCGgfx97ACZdEwR7T6foT0PwPxHsYYzH6CqNEu8nPlIcobVM0VVtjYkH9tmfN7hDCa47daqI0BXHIfOh1p04oukJegBEIKZn1rzewXviJ7BjtZ4FOqeW1enAIsrEVrLjuL8gY3nNGSZOMALOdUgXK6uzgnjv24EAtxGsYOvU50ELmDQwntiMFhFtDhM5gn2c8z9Vsbe6lXHDLj50ZMy-Gi2uunyiheWqUkq90tZ0wUk2zKiPYSHdHJg2FIg3H8JVktHKXiAiEPh8HnHIEr0eZZxH_48K0C4bfJqqJ89SgIVXlVXA1ZeqhITYx3nsBoCoUHD_e_s2TUBTced6hSMGc_l6s7Zng9DWga1QUyeylF44P-o9EeEsfdoXDlGgtrR-NXTCyzo-fKiBndkj-1NOtHC1G12o4xKGY7r6tVlYPL71gS83tW1p3IOPPna08KJcFq6p0BBpji5gV5-ZeoC1n0WvW96njz5rWMZkuMm2YmmtTnaHJovl-gpyODtuSlVWCksw4QkzpF99sem1I9YJN9U5itrCwq2o4OnIb_DTuEJBadHAj7os4kMNyMLCuSxqwk_LmphvZg7CiywzHDZ-bjatAguN9PA5o2_g3cZScAyGoJNa0CaALuDOp5xcOFJKn-0aiQoQqYBn6H6nAgS3zSZZ80tevYso9StwZ2FUtfr66KGV6iqNZgqOhBZ5NhZDxhcC2QJYj5d--PbovCsrnIm7egkf68C67xGK2xIRJlqcazK4B7_YemLNWeqqkc8vKZIA4pnfcjILBhJ45H2LzYPQzxk65rtPN8XLLYDihEbQc4okMTpHT5h9gTmxhSMCGyfa1a-aXmvwkkCx0jcrbjZoyhmD-89v4fSfH6tunsKLsi1Y2aFZyhl2GrqLt_pavVA17_MyuGB2r9kpuvWP3bRtwU07ov7LupWvi9HOLAvj2FhP0XSW0OX57PKVaxfWqw6MJ3hpXqHaWpotDyQ9AXOFIzs4ja_8_VfLmIC_ocefmBzzoHQpxEUI8I0Hnh4rD1q9Ljx29TjxMNip9L5xccd4ZD-Oio3VgRJqyA84AHYzkatfstI9ZR_7ro4O5fg3tG13Y19Z8-0lZHEUBWjRaVT1uS6T0pL0G-grJDLriNJdjX-Z3zXMSSIJGQ61C7_nJyq24gUll9oshdxJB5gL8vjncHpbLVzjxltO9duWzKYnkpq7WFajxFH0VJMV9dEDY82dlCEH00MbQ53-y1br-yCV9qdyFzetDGgBAyE0rN6UdCrCs5q6aWdLIWJ2-V-Duxd71nUs3P1TLD7CseHjGzMifW2AA5gVertGj1XPBJRWZoD0LxUxduQPtUC9y6UlA1aNt-GfsplTs3QlgNm-gjom_aw4BsW2E6-yG-DBk19VveGHkF5FwOqja1lj8wisyqz6YIfxlK2RE2xe_rvdzpqmWhQOXDftyzS2ywND08zmxBJPctm8jZYH-gGH8_Eo7ZLmwpQPJJ1AbpJXOS8TfAfk1gtDJVq7HkJj5tGq4b-l4QyHGaHxpP0w6ySxw6ZKxlPxuzBf69i481DW_m7HDrgHaVlxPOj8p0jwCOAFP5M7Vw4iNRJqygJduLTDXVbLQ-wnA4zT1L0Llx1WEmW332Mam3oL-vKpbfz-zRJV4RgaN7ZRnkzMhC6aH30Ma9Xvl9Dt38Ld5P8uNKfm57Pq2UvsMtBPq2q3DM70fYDtrR44MIfzBXxLFmStH095uw2fp5uouDDEs79qV6mq2phmW-YOYOZ-DFLPyaPYiOTXfmQt8dqZ1ehGv-zCHlFOR9wVGYT2WjMuBWhy1q41qTJ-jYrXf51Xw7kSISMlc09VFbm2N1F5sPL7fjrZxtkw7jFraEZYIUxdJVmu5B6zvspsiti9pLIks8U2YULWU1Pwlm4rYIVCDhiuzKwowHylcuvVC4ddnd3of4OjtlXTWcOq-uHUwkSldut6QUhGDWEqh62yHi5o0woX5cVJN9RRRYFMaiNxuZFpGtnnwiT-m9tWQJo0_9xaOanXQ_FSVXUe62fOl5H45kvmrPUqi-RlQbIJE9-qxiIV6OG_vru-_P6dJVxXbVys8iDS9ykLYZgamiNWHFgLZhr5aK6612FMKpAvwxwHoTHJN4ZT035I3EScnNOX8_wLXX54M2w9gHI-HrtVaABD9_u3nu9e8Z8fQuqr6ZkbhoMHSEDEW2VC7isxXTPavtoOaEQq5bhzM03n_I3CnBNZBZs3mjHdCoZ0rKbfTeFr9odVCn3MJkFDItHqmzhTX69F31JUQFg8ViDYoJrAtrDysAo9swLAsBJlVcmgPXm1apPaavRJO10ApISF880q9Cllr79gfMkLPXIEdMU2BiJHnZ5H1uGyaSDM9NxsZTbZtvnQJ1XaS4SeeZ2BI5WMrt4IuF-2SU_4WJ0aCkdOVZETjyKX27YBL2XmvHKpgv4TFLpDwVQVcYUwsEgzvwJyBam0Y-tLvhM1JN0f1MkYPUzIOu8TwrjlLLLYOVv9uGiLioW_OJt3-E6bi-QitfFdSMdULmiT_oi9csDiILZJk_baAVtT3KRvJyuaABH9WD5gA3D4UpYA7lzISWAWaStfluJsZDa4pL5VoUcu61RBvf7ZcSJzI58iwxk5WZ4ps0a-QStHW7FTbkrch_jA76BFDFffLsGPiLAVlPd1RpYVL3mzfbTWXXf1MD1a74eWst4QiiY9Jqk3RMnX-9USMD3FNj7dBZmBGkzmZiZWyyQvCtiBvTl5BMZFW7XOI-PFbk80zeuvUKGn2C0KL-1u4g9dar-EadpNG-U5q8liULVj3kz6QgXSbH0Yc9UGz9xTKtEXrOEAizA45iZ5oYtc_cEx95EXGSSeem7sFGJblYwR4Q48d0Uq4oG4YWMnTdzGdHaGESmhSZbWhjuckL19m2ClMr0T6nWPsvRvBDRceZ-KW9GjAx_UTOnLubUCUFz-2pysYmlS4ngpdz4vTQ4ugVSdqKBgXiymYmTMqlKgszRm1UzvYVC4-evs4hVJr72ipk5gvopHUvfXj5Li6puVBJRIIEy6u4avmvv680fx6OiMvWbuYBEeytOngRHBlC2XydPvil2xNguE2viiSWHu8-25RMMxIN0uCJiDitfiEOJAoOCHo05XNuwrTYAuqMzZ4-S7y1ebjjDJIUWp48J5C8RBCgyRJjmcmXmLm4ujs9p7ToG_ZTO2OpuIwTvK8NKpG4BYaOyE2_aqwnQfHdAXwi3ybzlPAfyUem2n8bB2PWyvZy-Najw95MiZJ5K49T9rlmhLv5Ezq28HEKk-aOx8lvtwGxYSDnYYFXip8x4iNUm3V7J_jzH-KQWDA0OWKGgHcoKUX6m2Dr7kueL1qZftsoPQlXIyhGzJ1vXZS_pmQ8wjpSAyWp8eSutGabgi64dxTpgofN6j2uo_dASXE02wEMFDBX9Y5E12X8yxca5W9Inff2EFYJnc4qiKwATJSQEXX5KivMuAkMZwhn0PIf2nnyqnbinIUUOvV_QRlVBEagzlB9FBRgLAwKSCXJA4TtIwFjGB0KiuKI5xTt9rCr9hs3AAic3rfFCEb2CpCf8wSAc7aHsuqTSCXZY0M8xIwRx1VW20hEVxv2tUQPjQkPdHsy7A5A_FS-TWh1HTXgtdGCzp3ed_g-Ut3pnrYf_xumX__83n9e07ixez5WEoqqYKPPaHrVlMcfirgvDk04h2SwDk6CYl3B-TNErpoeDKoKYRf2Ji5K2lry_HsuHyVI2W3kuUkgPcRzbzr06P2109SRKLcz7vO1GyKp0VhfTYdEk2C6IdeAL4_-YQ___7oQqX15nmMbPT8kQ7ssHisDQND_bplHCfL9lM7WKsePE-QOOMx2tN53ry-o9b5RouKrPv6bz0ZL66cv93YuYFsxmcmVf-WEBqAD8XKhwM9Idm3Qy25jUtxhmTFzJ3iPo_jVhS7UwPGs35OwxL1q_RxwshGWo_BgZy-BL6xc1xuu_IyDoGkMYPh507PvycdgkjqEeUGTl6zzqJIJ9AKpLY2gXISvYA225WHk2CFKDYBmgPtuRY75Ut7W68gB60zz7zyxXaRkhrpkXRXAWjgbfFgU3fW3NZr9tAjJ7djUA58vuiJxreI_EVdX3Y22yXb6ZTjC92szeZIb-8L8ZDMCuPbOZXnX9hW3GPs-cYdA4Uf0GoS_R-4b0O8ui9bSEjNYksij_prnGgiFYeJnZQFrtNXdo2ESf9ZEJAepdd9Cbd8ZjFpaXrFzYy-Df-xIBya6UJYL_ryGvJfKvCm5yz-T73zG4OnuR64bYhE35CD7IZ6V22by5eM470p9nkqEK-qsEQEK_lf980xskrQjUsoW8EyVGfNoaM8VerdKEJZj89qECUrNUEek7eTksTj7pFmIWmr5SaJHpKyDCLmFw6t-h8MC5Skhe4esZuOoQMM33qoKwfcQIpoUKU2E0UkiU9jVIsTUeet3e1t_80cxxVlbdYtgo-fod55Lt_WluBDKseHLuUq2Ze8_3d6P9_AoF2PVEUqFBQjjlsY8ispKtzs-Js-Nr5ib4CEu0S6_twBfXnfitlTQg_T7_Rb4cwyH2DZpFDIhg9zvdq_28fRs67Yqzq7Toadbu2IhJ_RGdHJTMSL3BpIKpKSQjwFDOROHyNzllt_FCG6lK6AJC9otxSnDnxsPd1SMgda6XPaaQrvxkvNFdASkUpHIagUZse6nhuRp7HV1N23ey-zNLq8Lo7k2MxEFTJDISnoixwHxpC2SlurrSnh5NOQwYq-1vLfIzxDGlpJ_zcgCc19xcY6YTTIBAFqP3WxWMi6mITYc_1rrxsOjQ4TJ3ev4r1M2b8YfNx8qx9dOTptTkxAB7ZXva9072JvyJadR4W1D7nRFL24AZS33Z8-NVuUDpj1KjZR9iNPzKnHcKrGLAskMBOeCq0UXzJh9jApwu_VF-P292f-6TTOwMu-RYOz5fuq2bfAPyQ5axFfkN4bcd7eAsX2Wwfw2E3uj7z290mlO5k-5Cz2aHuD1knLW6j4w0UFzl-lOQEOgqp42bCygKkBz3LHARLLkdNu-A-QFcIybRe6DvVNsZHGUemYoc8lTRf5p6cvJk1KUSvFv-Fd_93pwRIfIpuWEYmk3WU9yJKBXmqRSQgGhyn5QV1Rc7n_YEioI6hTpwKCnKMvpq35nIM_S4DUkBdItCvU5fLUaLhSpk1bNybFyVPIumjaBxAZDajHYTG8O0J_iojtpcUwARbnC8vZ9FJBtu_2nmr5OnH-JRsfSMRcim0DxM6fG4Zm8C1vZqj9bCV63ZyNlDQicJuHP2tKCGmcIagHOFQ4v85NkMEkmaCW_I7_DQkOEjVRKpkupf0HWOzf1d_hNLbjM-vx8s_GTSwhIJEHkww28fDWbBfeJAIiK1xNEzW9Fp9cCc5SFSjjHW4sr0ZDrkn7u9NRDTY0-74ndi0WZy00uophnQmTHSY0mBb2q0pzp9tGgo85nuvGYceEADpq4tggBivTzNVEWWlHmY-dh7QqcsqXucyUl0ao0ZyRpjLyVCg42DmbYOddtXpLh4jehJ5yomSUUkF6ZftMhdayCHfR94lBcP71lbZwKkU9gGwBHd0iwH859FEaneTPMy4gdGHgmCNsa7468dw-PbpUCf5i4pmOEZZm_j19TIwuHol5dpL109HOcy5Dmm7m_Po8Kl7TsJHFWLokI8IKyRunUgyTI-o3W-M5kIZCkhodXM9r0vnMtM-g1zOFed5oSJxT13YH5kUBVvXWADeyW7L_Gq3O9Dk3jnJlQAKGKNFP8l7jDsPkn-xJr-6H2O84ycg60KdGC5VbYtHwi15D0Z05CdatcZDxZs8yi2MkHauLTs0aRxxX1MWJyeHxqvfK0dGUek1slvH_88UUnrsySG_17B85dE_BXkGhZqFkA5Fu0s3z8xUXuZ5XZdj1ddwmFdT1Re0l39EvDym4yl8tk-QRXi3sZQmRw1LVGv1-9cB53VopR6r7pbEPt7B6s_gvQD91HpGICK45CLQsYZ9UNTGN5whRNMEIcVAAKAtiLGm4ZBaRXYarr8qrc2gNWu0ix-wNrRZJ9jObIZB6X-EsH53Z3dv_-Dw6Pjk9Oz84rJ9dX3z5_Zv5-4-3d53fn_47fi_N_1DOD3-Pw7p_PvT8-XtHWJFoOaR1TdP-5ZtVdb93uqdrfP5ZP29r6MhhRhQLSppTpPczKkqPhaS9OOUuZBYWB63PuA4NoPztcbK_vWPtH5HHC7OiaG4-1WvBzW2eC-2us-iPbGa0-vXS7MO9Qi0U3U9bK3mzQNJYMSpGsFOPARDmbHaqP_vyMb5GLFGLxGigZDLgzoyM6Qvj51tje4zP_Qa_YZ_lAFQ-OVBzd0uEiiIXB7LqDW6z_ltBhIfLl_vVsQQeD1D0gPtb6d6b6w-mf_zqaKvzSdbZgR5j7weXZIAvH3uZiu1_5LGHzG_rrhfsiGLA-SjaiMqLL9WjQQHW9NOWVQfwpFSIvKhc3TTPIRgUpqkIAlUcp0DOA1Lcp-sWin8sAzIVw6FXG-B6nQShX4QoRBsQjZ-l1Zu-vrlMoosclv4WO7bQiqIkmQI1ZSptXVsSJJHwptH2MUgHWZ3qePAgMTzbsFgQh2Gr2Sm5qiVJVzp_WKdQ6ctq3GDhFTRAFDIIgXtV-Hsvb5ymyEhOLQcSBd72t8tzW_P5TFulz_TbwkjZwZ-thtvDyN2gbszINxu4jfSu__eLHq2CU88MMoyfVeKbTlzoO-OL_-6-7Vpe21ExjsoiK9SG2R3vjihrYtqaMdmwjTs5b56OP2lXiytNMx9ViVPbknYAfayqJKQ9atlkgrLQUqCXJvVGdVq8PfnXwjvYe7z7JUMN-lmA_ECrfYp5MUA4s3Qcr-DBXV_33T__Rn8ENFzTu_-3nsgpr60Po_9rFHp2QtEHDNVKXH2awazaGcC-GjEZ_zSrdu1m4CreVZys8rUMoC9y5ZLQRP4xKAsSqKmG7nc-YGyuDday5om2e6djNxb_2MN_K-C29Aplo2YFx759ZAlqpN1IliRAX2FdZjGDjm9i07cgvHSahSueZ3UsDzWItgLtYAlhp9X_7pbP7hh5LNOjvZ9CbC0TqFgMvwIx2P61axNo_3dD66OZKGka-pkD_UJRO3Dqrei0brpLZT-zZu_tcerU6rpfrvTInLsAS_vcsx99stNSHDMQUg0Ka0es9gXiRKi_XEPU2s0U8DQUrs_O05EzNCx4PYDZlpUzA296MXDG88kg8-tY9aDUTO1MprHDw_bElcaFsrprGP5kMjC96ibY2lq_Vr0mMvn2bcyyu_VOPiUEZvl9gtqzZac2UdunFDRKfgELY9xmursTGZ9KPCjqWgLEYWCItYWuCZ7NDioQdhJ5BrkltEHfwgJPgKHZf4YN3eO-oUzqa_DFRJetcPPcdAflVqtCbVE2qrxXrRlkTYfxSnZFS1ltxn_eGTij3nxFJuqFzFN28vL1qe1PvA2vXJowzec9z_LaLPI3ZPhHToyazPm2Aovpk3I-Jj4ecjNkLx2dX-LeWhu_q_pYZJ1ZmLHtmcpC0WEe7MB7pjJ_4SpWHi8k3hxksc4RZeZJPXx8t4MYgrB-K9Dxnq3Uo8g41extT-Gnxjqgi31sM-vWbdpd4rLpRCgOWssw4okik5pWEz0tSXshb2HOmnKndYlD5SHhWD2pGWlTWCATQJnhZc0uHvexQwu1kDVlTA2e4f0rM6j03-TSEBDwEPaO69x4-Bj_NthT14771ABgsFcRF6Wi2FJ1QGPRRLChwrD23JH004MUtOGNAUfjaxgRudG94YK-uRc-KOYvZR_nwTzVArGvmAtbRKkdcwKQWWFVBffx1slFOq9l_xSAwb6W7ZDvtQ8oJ3bH6eKakTtX1iFVVa9S4pvoITFz5fZZMyH9JqNvXkhQAXvWsDi5LVCU7nQyNIBAMJ5sN_ohPE2Ban-p_HSfdNDYccjYH6S1N8HWP5gmpvFfBoKTrULCMmeEdXYsYzY3FPT7QY1AzZsN9ZBTFcggOOVzEVOmTdzOJZmd1_lvvH6NDKbXKJfCgM1e-TYrgJLQL1xL6n22t5kHcTFT3BBHuHycF1G8neCkuANOPrTqS4X7btcllwzZTs8p6Zqtwsb7pWqfQgCwtAkSOHuWYdL0eU9RFNHUuEvj2ljNR1jJcmU18zjbdxcZt5gT4vx4gr-2zhHBFGGtIy6P_E1uWURwJn7zPUrHrKwk_5WWpCPK1c3V7-Qdm088GRXbqcueb5ogr7ILv7umS_keaEJUFnwwSidwXwJzDh5jKj7kNYEZS3QlvJE-EITI3QG-LIxavQCZs3g1sxFOm6Ql5e8ei6lS57v8CUAnNgu5FmJ2gPACgpruKopjBi5zLS28RDWFF4pR8-p_KB_KPqL_2mL9K84CGAtUjSUAhwJhTQ2B1lFahJ1glz495Am64mv3Q1DGr-W4EzRYp3ZvsvrhJmb3vow9KfuAUzCNYyv3v12z1C3Guf7KPT03wt02p5iUkXkYWNz-0oMa4dXRwsbLV5nUGnOqqDrMU-tWmuhIku7mMJEtoQ-9BfD3DSerkaSjw2TV6q0e4uL3SoLfWdxFi1E2y6tTws1iibt9fQEXYRTGjZlsdZukRkBJTev3Qz4uLPm160bdYYZeIwE5uFMwedRJTPQNGEgerdGC722I-GvXbaGGy5ctVKjur-eM3hvUu3gu5YMnDS8S98QH3NnVfjcwyVCoy0CY6MIrwWVpKcBgVeEyBrBVMQ9HeFt4oKNMy2bA5SWhwF372otaciKg7sMG2L8TZGVOwL_2TSLaJRRcPvBfMw6_CRkAlVr4d83GP_lCOX9ZcevYV9jHPReFAISyjp_hX271SKfmWsXQQ36k5ZpLLEx5yv5jUWdZuz-QGxedvIfXl9aw0cW1hQTQ413pXdho2osFdQkAQtfYBF7D58g8IWLDRenwQ48P2a-K37YNBw7ZQLR0LXg_DHF7P-6q_OBkrtj0GII8VRJmWPqxuQqGNOkt5A3zXUOKs2JTEI3xL_x3kdm8T3wLE_wNHcqWlMkercfeMOwVGmhXP4GDtf75-tFJOODJ8N1nT_GRQvDzc6uD6sxQIv4JU8ZbLyQqrHJYKFx6KqhG1NQmRPM7EMrcGvoy_IxU8tQGOI3Oy0Wa-3sAN4M42ExLIs9KZ3xOpVURd9cc4WqAt5JzwOa2GlhQ1FlNn3hPsZA_VKmYkg0K2nhxgVW1cqzmL5uraJMMbPUr-UZZxc3r7TY3_aD5lgQDQWtd796CkxptOxAd3Ee1jFdoZ9dbP9CdTFoQ-tnlu1Jm63SX7cByPjYcLbQRAoYLTa5bLSxWUkDpn2GN0oxx6_PfUrH_UXNxrkgPbJKIoj-lVW1FE4j0e_MEFdoodhCkxqA6rNcjIAkCGUluOuROIiamxtQ4fyBjNRqe12RFThI6DEz26D0Zg-627wuB6_6SdP7mxHHXJbLAXSB01UoTlkJ-KfxQZ7zrNO5EgirE1vahcSG7RF8XWspNiJ-qNED57dWpCpMlT3GYBz5ISPwo0fCyiCREsiSoIoGxoeMeWxYW7meR3nIMe181cxX8ToXPIa1FkLJSKJySei_xB1ZgVR8YHrkRvIsPWE-J6vKjZo_UWLK9dcpDhAkyRiScNjJkz730wVe0dwmV9AEOMI_66RFNZkvqyYrjFOVpvfZbGXRmKZCMrww03Cpoty1o_RZG0VrBtGkXIxAvDUb8DFeOWAFgrzUpQweo5pRpJZjFwUC98BkZWb5gsNgPxXcvu0RkD6jZcFOburEHnvIQwxJgwBiDgeB1Ap7b2iv3oqKaj5rjIlLuN041n3XiAsHqiMIGXeabqu5GCjc-dikaJf89mWJKzxN6Ztr5ENAuCsHxflvbCzDKCZtk4JbpzQUuCMTFMyOKmtOJGFlVrqS9oiv0xGxie04T51koVY7MpPcv4wv_j6D4rWTHDtxW3eneg2n_SGVthWF73y0ugvbfdIysyy3YRkofc5Bu3oUD6qo_d7bKfUey0lX2GoQD9Y_nMwRFiOfE7bhLmlFbSh4sHqZtguHe0ZoW7eGi6Q-yNV_B18rVyf6GMsWD_gipm47f1m4gD7bWhWBC9P23KySieXMGo56m7v_5Io9A-TMAiSzrU-8N8Ju_I0OWMQXuGktUEucgTnhJpz12qrszaV90ovH1eV2Zez-MwORWp8hF6S-CPfzouhXwVEWjSLsccmiYDueH1isXbfPJzqrDL4NPUqyVkfuPzyzM1aPahJH32xjZh9Dm8_kAfpkuP8kpCoVodr6pcyY_lPPxnOJR6cwYRVN1LF6BLAgV3j8IxydLy27f00VrwG5p5rtKSIB7M7K5ACjGjaSrK53-qrcrKI1eKaOKNvqbc0gaNp3dRpHFq8lR83vghwbXEXq8nZCjzs0vPq-woOxCEZayoClrLUGy2cC6HnIpKu_wlV9zq52AH7RHfuCrt303H7laRl3vbod8HK-cnrBiPIp2_OKIkPCwhk_Vj7KKIXD-ge-UwLmKpvK6YS6Ro02kdaEs12_uZ_inxVpJIp4gOlGNbXbfEjMfmlwNi8Kjx4_k70UWYFSK5w39fspJXW_GZpLa-Oza8jvJVxl5s9M9v71eJnUdkQmNqwCa4_2aVKZ1jPd3xxycMdzTk2_YY9SyIuaHhL_UdYmQ9KO5Sx6z7XCVeN3hm0e_rI_YX18-CW5pdZjhk-tcZq5hf4jb23eJeBz_s3_tEfvDhz8-_pi27lcPZ3b4wgaxyHPqJ71bVFBVgkQwfDN7MWHUep8Gd1fOBdRMtB8MDb2IPbRtlZAwXlxrn-LRb4IX1qbxbnttQ1jlNonP1PMFSSCZmwpyDvpg1kgWxoXDMEOIGcnGPii_8NXK6yDciBy_jKRfvRqJE8GjTJE16SNnbddhNQjnJ1Tz8YWh9LoM0buL5wFcb_YutQJbSonw1jX6syf3h_r0rQvsSIxjSbj7ayVGUCVJcFJ5_nb_kih5-zvPAvZOesOasqfBalBoSqONGz6bNtliLsG9sVNmKQCB13zCMM-9_6tp9HcVItWDsRX2E0Ch8R8KH_P2SqDPiHhTkssg9aXi3UZyNocTg3GUeYVAxteBXu1eWq7EXzV3-gHZvEzGIJdlxf0XXZ52P5V0Ms7imT_XHANS7ahnBxfygE13QLeZ2pc4VcwxJ8oqIw5jjecUk5iGPvkPSOXcaXCAQRR5JT-yjnJRhGNn-w34U12OeKcmmGcUY4JzJbJ21f70krv9VXo1G1nUT8NrffUSWi85D9pO3300ytfULLkTS76gVI7sKZd5krpmjX5hJ3yvf_JbuDqwhEVVH7o1fvwSem324w20MCxzbs8qZ22nhBwtkeNvwlFbLWzgwNhj0afU-fGTlfY_clDJJ4_Vyxn5XTdacytbl6PvYit5Zvm3ST8vDa0nyXE1G9b-IBorEtCbDEAv4GuxmrJNwCAthm2JFetASbQV2jZSlt9qLKskq3jwlNHh1H9TMND1aaZz_dX2F07jC7UOUd-0ADf-NXP86MnGLdgp9EeURGLx9cHn9Fhakw9-_RyLkQfiDZHgrYq4JhfnpI2TzVrGy14jx-xcxzWsc2RUtOiQky7Bgb78Ivb2xw2nh57nQzR7aBVOV6r6BvKXR7_hTlrMamGjWAqy0tDtiQtVePfsmTXOfbTmz7tlqx6fcnwlyWd7UAbjqGezsz7mvk16Twg_f1Z7ApWXFtuWCfybkAc8E2HePnzwhpHb_N3O5cvOY15k2KHHRNtQCiFFAE4zP2Gd4YdaYNubuxM7COLHrGkPqFpGIFZo01nranJ-PKPMUYipFFDGln2BCcDgAJwkvGMV17rNe30H2zA5BlJwtycqtHAMK8o1TBKgYtnmhgjNU8NWXooWyVbYwO6qge4-y5P1DtlplLKHtMsC1TxSXs1zDmwtyux_c_LV7aPmH1mshJ3Wim9e3Bm5HIqFthQqcc1dXaNyWGYA8yMfvS1wQjOc6qltU__PZ9tErS6SgoNUmqUtl_LOL-hk07rrX3PBsECqQDauAS-3cyUNFTKjA-opdwej00b9x2liXhFqGJcysKLzojyZRocwTcdV0CikahHzCAZU2e8tYjuw3fyNjeUUOhHEBtmR3zSKrQBVxnYBbACobbZV_XUwKpjnJch-5MzggzzL6Hdj8qlYlxe4unkD-heJsh2AA5Bsuv_C9XOgUXXML68CmfWyOBVOLJRkN0zJX2dcUbix6ihJQ2IuwO2y6hsMBi3gS9oLlrWb9t1ZBRnjpaacvELAas9-fZ49MMxlrf9D9XmXwZdv77aBxc059mnPiUGfgg5Q1n75x-ULjsv5oFLJkjvycVgAcRpbInMcuD6i5NsoUNgR2XEgKaTqvXlUIafuqd6gIswlFxNVtqTQavcOEcutao1PAyPblXVh6TaGs_gJzj0Rl_eAP8wwkpH93n4710KVXHYMneHnfiyd20m34pY19kptKqzGlkBOq-WeEBwGqCRiSOwdd_ksPNyZ5NyqOBMaHAzJiNtdBNwshJDIzlZHFkCfBD6LC8soRM-ys5CrMyEvmp3knDWMwfKViQJzTG-MTgUDHWyzDjJEnSUX2tcoSTCQTJGQgAVS3-dmjpIViMevVHyyf7sklQl8jNVABa74cabmusvUMrRPLhoTQE1qDsKDTNCDiAhgSUPvi2i_32v1PThthYSJBGdhppAxP1QovIdzdtXlHi7Qcqo7XyWGiUvzS5TeCXh_KNpInE9Oq8Qrgq_A0BcOds0hHH5zCMfm_vOh3Tc9YOGJXdSnk3breF-HAdSmaCVQeegAI8uV2FXhSmRejm_uDg9pbWrUgGPLQKTrWmXr6DnUnFOELRFAY9T5NIllBAg920PaQy4XfMYWPDMv3-Z4oXGUF7qeg_FT1fv2yFhx37EpJZG1q8KwcY6cac8F5Yug1JOA3IOK4kQWu1uSo7oL7SBFjaBC5L_PskccYUZS4kE0WUCgS7LhJqtwoyk7xGcyxCahVkTYADXXvWnO0Tdt03iQ7SAsrFuIEeSc5W5hNFEuRDQQUkMXI2UIz4PST48XihWJSodagoNX_H9DusRVTfMaO4gAwPqumHOdGKctLYlAkcxJ4QIgsunxzAxznKKTlDFIzA5M6tr6tgYJlKnbWihtbBA4C2Jvo_F58YQFTLSGMW7dbQQYVyCo8MaHwAuiRgy5fMiQn-ITreeEJEEaYHhW7e0fW5sAfSAlUS85Z5oFPhCakDAorpbmMEhwiHXzY8DEeBqrO4XCiepN-iJYIW2QJyxRgFBnQeR7noiLcKgFFL2Eyrz7Y9Bdtl7JKbNP6gZ5BFe6Ec-J-ybfOEVntPx4hw3AZS_q0MoCnudwPo-6Lm-kLzsP_8iQAbophQkKA7RAdPFt7Dj1u0VmSDsn_fqWQoniYSS4gQnL2XSAbgPpELEfWx5u8mky4qUgSaO1sDet9RMauOzfUKqvf0JO4XCGESQ6Nwm7vhY5iG_udRu6yuSU2tK9CNoUwWznhMfMi00RZQiCaIk3WNtrZvCFjkyam3NcbKDBfwkmxygJ7PR_3d9Jpg5qM-VlwgY9yEgF9mX085cQXb91MYa2CaY2FS-RFgb1HVg-Xt00j0R04T3aQs-r_YngDpm3VfsHVKZlQ3C_Oy-sdeSXfCCZMlNMpHMYGz1iAl27IzAYCkGwIeezQroaQgWwoGwf-x8OX60UMaXwmLrQ1JXC4rjmcyEq5RWwBImOjynAIOTQlmCY_Xhn3SaNfIslSeo-r6k7ihXM9BgkVwZ0Sigw4I7jEgpJQpI02Vt4v5c6xLuAvxR-pYdnETkmTQdF3KHwZj5v5dxyE2VnJ-lWMZPjnoLgWWM50lqawyOZqm_TImJBlGVkroPLGjjiUbdYziQ7vIMQrcFjmgSHSeKslwW3xlO4cwJPMMyXHL1Y_Z6yHOC3rc7Je7bnvDqyeWPTJJmWU4C19NSq1qSkM-XMjuz9k1ox5fMcbaK-dyJGt_ziAZjjcOo3BiK31gdozt6OmVd8i4wz1ZmMZkRYW4kNb6ylzKVdZks4g5R2--AMvPm55Ti3OEMSmowFZPTVeCMMpLzgJPfBx2J1e9A41Tf6k1Uix_mtNg1RfHbneHqZr0GOCWNyKX5xvIRRJeoRKQofgogtEgUsU5KTfW1xulYSsfTApnpHpk4AqAyMRKaMZ0jxnOErpX25gTtsiRvR_-YjMTbgfCT9k40fslALLwzcacg72ijo4NjntBHEXVfSXsWz75IPFsdpk6IueXUm1FnbyFZSCBudH33ry-MjTyuDh0VxQvJeGtSudTPZ6Vqn5FkLeWzJwpNSGrc7JP8Km5HGh16z3321fYSVAFCR99UwT0qFohropIe50QIJxN6K1vnt3pe0DOPUhe7zKc6Pkf3zJ3FSqP5HlRf524SfSR_cNIH-JOikn-IsOdwajgH1GmqEhyFVs6g3dX-BAGdORd6MwPT1EM6TIpgSavasYC9T8EN9K-Rlhe72rLGb0ok_YosN_exv76GOkufdKLAHPRqlh-8SUriY46gcZkf8TdGl4nghdYagdSgI-C4-Kmqwd5iiessDUO7JoiegpM0_WmzpGGnm5D66nVKP7Vb1MVRqVmaUDHQY8Gq-6svP5o1xap-osc0iqGHMh2G6LcOWkd9YI25eU0SsTPYIfJnUuGgWX16BK18lesxk2xBdwjJXQ4TiE1Z_fCPfOpL2cqNVMnDl-DCNPQR_NWcYU0M_86sUhyRLxh9LPGq94vx2T5JU2B_EoP6eWDHuLDr0-oL5_YstWD4wlqRmSwqOQXVa77IyLKTDhfnq5q9EfvHA4-w_oPavaaHDyZ5cLwLBbcBawmmb1kdgVrGPqtX9tx6dp_UnX8DbDLrekO-Gm4aCLVNFS0N9diBYPEJ1H9DKPtGQPstbDQgVFZd57t6sSaoA-JWfLVsD2bYCYm9sDYa-ErVCPg8MVDOV9KvpnKp3piPLJwccIz2ricb5w_o3LZ3M3TtwUh0b0kkXQGUhO2lkVEzEsGA7rnLVRbqMk2BbHROLQmEAPvVZmhdo80vw5m_3NU-6kbG0Qpl-7FTtj2fkJVcxpPfPm_YKvGTdG-wU32H9UdeqGohMuyyrhZtB9grRy5lpuagwZXWTpRoj3VnxDubUP0Ze4ixGOke5sdIrWCnseXAwxqYVrKc0GiC-2X_myt0YuYLxRgJVrpoFqdR2XANVH6okPuKsv6bEpk-HyfDz6DIgQOrh7KeYVEXdev2_lZdf5SkOKq8ICOBgIxJv_PO5yQluaczw8XzXHBWwuFHxCK-U-QNghf_Gn3PmpnPgZp2OMAPerritStGTwm8FGTYLkngrFNfQglYQXfgZYVahj4YuoG2RKUP009gqm5qTvdYLx2Rx250llGE2BadFi74T97DhDSc009Z01Kl3J9IFfmLrM1RhnErowFFI_B7y7x7PQ-_vaI5Kjpi7y8UGDiM0PdBgpwhEnuJslHmyOns0M3ukUo-9Vfsn7FYSg9BvhsLaPSROUhsUJSEJjPvrhUQSobu3TpF4PHiBFYCWk0gKVffW3MdCUj8ol8A1so7g96A_4hD8hlj2DwkSZWYESGhwEQomX1C7TTf1BRHmKAolDChPo-xvbJ2IIPtuToR9O3DvU0gsJ5hcmrqyJc4T5hIA958b2k76ypUw0s8W_hGmQhdEpxLMEOCbX9oDXtHVCNOMkzARNtBMQpi-igXHMzn2ppFUkzkZZn5y-ArYrxgWBnIrjXkJKrW4ef04SYcoIDudYymBpZqUi8IlTupJuoOw0zB6NchAcUWMmY3w6HKpApowd1-n096Oe71QshlQ1jnucV6YqKuiSpmMSZcOUL7Am6w_wKbR4VQhAhLlF4M8TNEvO89X05zc30i9nfZ-QDra-OsNkTWc-rOb7gKenuoiDr-0ClgwAO526ZtAIxgt5u-Yv6sSSx4aU11xoJ5TejK727GxrpA1Q1PA9lDedUydERy27kb3w7bcDAZvW4_j2UNAN2G6rBvNAzv0aDh4fxQ72gv-BtHTu42jyJlXXu68EBmthz5as5qT0Qde0VxO490m4euOLg3oWToUk0qld4QJ6t7-v1Va_YtO_Oh5Av20ya6Jr2vEoBTWf-96iwWuyETwOGFHkYLC16YCpjGMKyGn4XVJUDsV7LKevQLlN__6PuW2dbs1rnDeYbKGkJhOoiUibRtpdJoF1eAo3W5rHDNryDHqNWU2aylK-0DspxObKp0qdYriis5LtHp-LUWsdHE0Ds7MJUNKCFozBq8bXKKkN8BPOr93svS1zliKdUprk6VUPGXG0rn2tneY5-ZB22XefRPBI47pfLcJAwTfbGWC34qSIL-xEtjcl0nU0RQdyNBjdeg1DwFpY2J8qRjAc4w1y9Y7Xr_9qDeCR1ed-NaKlkj7BLhaQATuUozTWxk3BqEZjCwL7onoplSbuvu7R1vXs3F983l90M5gbY254oj01qj8oM-iPntO3mwq3Nbvmix1TN4K5rj1fuIJjiQ2RH76IYGyzdVz4245fJu2K2HHmLmlsLXpZTYwk838cM58lbjhfdr7KuNMP2f6P_ppGGJoTm210mULZQxsRWIc0YDEUEFtdxEUBUA6spJE15xdhYwSMr9QjpJEBZ2ESGzcXh9_Oda9AZV6XvRskAJZL4FrC5FNkGfLoDGY6dG4oEGUy3jUHkSUiCwXH-V6tlNMMKoukcNDpXkoz7HAM1KNwD5t_SwxSRwPlMaJC0WBqGt8pgA1yO-aP0dtWGm9qMgFtq6Wb2y258GS9MnF91kgTm8lO6d8OGauyanK13PWadlLJdy1gZEZ3P5oUarnFMJjIda6l67aFhAVP3IDoX08BUvcmLua6lu95NKG-gwFuvO3DnToyMebHQPpQBdHLetZ1LK_KbUDD6BggcFHjmAJpOyjmYxgZQAltxiAPqooXLaVLMywuShUpOPnpWZCXH9p-kXSvX870-4MGajz6KLZFulLqEwmHOw8snyqXM-a2fseFaR8Kp8IefRFVNmkQRwFvS1mwcOA8C3WSJ9JL2da2aXynKtvzDs_bPULjnMnP25aelS3j72SIx-y2JIzLGe2At09uFldNXxveq7TdHvgQhDqHVNKz5ZhhlU8Je12QiUFMU1IQMkmgaxp8BwNCXsFkT1w9pLapx1qyYPqe6XdNgxV7dq53ouZANMKAN0Zz2ONEjWavmOfISNOKR7ogp-aNWB2oCk8DwypeWY5-Bx--AuYbINMH7QA-H06vfQpvRhj0q2TUiPEFztIclZ2-Fwk1pNsDXxJhyuafxoIQQ_Wrs-hiHfFZYfgao1PBaiHEcIsQpdn4eYyQu7C4NGejy6DnCfdxr2hQ306Q9oTLLbkL8gA9VNZKFQ2mPkBvExiIot-4sVcq6wUw7tQChArbkemhBp1_Pu2CIiRtkf_iTIN5LtIPhScoHb4KB623kVkY398SAhc3lLbtxjt3thOEIIKBYwbQr_zgDZn0hibM6vGoVV40AjDvPUDIuenpO8LC-0a04YoykQuyxSR8J5jnHg-cCU-90Y3gaGbUURt8IE-WkEETqSAAkqe4cNsJD2wruFR4qOfDRC2N64CSuDSYEWBb_bc_DJL8K0S2VYZkYf8AZApxicE2Qei1sv30AstH5aw0zuU-oBxmvpf9ovJUG5xmIcGXTJi0zQOOdVHtj2pauHWcVWYKesYW5d1HXWBpsgCEbnao6UA-_fnRL5S8WRhCEMQnYQ3CgNL_vA5M5_z-8No-bvZwpuZHTEzCLU6xQtjgNbvYpnsUm1__wyRGR-9qPixSxRw5aEwUoYA1pmgvOexfJfifuBlU0DoVdIQP5VdaWTfO8Nyuo_LWwSglhQT98OVAfYIUtUmTgY3FLoVQOHradfR-uxKu3OxqNuz28I0VNRs_-pTorGiKzDkR0qvZPxCXn7eI73l_ntbbguiqd9Gq0GtsXKgCMfA28Dk7MO2UCLAstgqCNYy-yZUcNZYetBqLf7Ls5Jgw9NWzt8JjbnN7x4gYclBBrIy2-_YucLPhvqrS4ttOpDXwL0nx6IVlnUhX3og-DWH3s09GEU-VHc-h9NSWfiV-atld4N0XLrblD4eIB-iae4ye7eb0POY2MGqeybnM7UfecNW-mN3uIZ-s9IbV7m3FcFXWKp5t1mnSVF1sAsWRuoXyRsBnJXNLQprbVP22R6N18OnEjU1Xlhf0EF4HogLdub4I0rLvpZlRo7BxAcp-HskBKgAhOVhKk7ySsXcR1_K-1mkagmOeM7DVkwVUs9huslsYOFPbsoeRO81JsNoUk87Kg7_ilObuBt9r31pNyTrByiu-J_i9jVhEeHDFNVqBuW56FvSFlUlYvDMyoKRzazufjbTVkf881YPghEhQ2Uyz8BD265DB9ISciesMmFet5wPMoRC64XDA_nwXj0H8zQ9hDbZrYZtpqRU4rnYGkCwROfmk-ddeX6yS8Nhud41bjz99nSNvQR7FOJevXxbWXmDI_DP-UusAKw6FXy_MJsme-_5R7AvVKvFyqwNk4e8Y1y5pEZfTKcVXb_NKcIyGzhSXjvVvWY42B9FfnMB7_ngwKLTr1ndBq5pXt3Y68gUAmCdN3tCfoAybo8-NaesT3DhX32YaCmfrlxXg-odw_eVnsW0ncTdp8e0lzWUPQ4EDvEMRe3J1Y23UY7Tdn6ZAprNhwOd5GsRSJeJp8SlcT0ItdDqFq2o2H2aY56DiX7pCwXHAq355wjlNuP48fxgOR986h-llpQLpXrGXcBGRFQ194tlsZ2YtjxFbr0b6oRtv47Lxujmpc8jkGgzwJsPy6AxzRn3NWe8PIAZ4in0ullwb0apr7RykCrGLhCFpcHI3RTSW1NTHHfOJ0TpXxYiW_-6QWwF--P4QUAwXZZtGyNsUmp2wKHEMSTWkrcaLW-bfWr6Cn2r3FYkpjSgFhPiihSorP1sRTi6nhEKcBH-ayPfAwIHuwS6XWkJnh3ExMNl8ddVXjAasPkTZL-lohHE_gy5aw8q0XnsbfgLAbUNi4SSOIVmGeIRknUAnjbmePsCFRzUIC0EfnEjxyT-b0l2TU8v5d8XQfLg_TxW3U54_4VaShsZFRA-F1HFDuIy9qQi8P0KuSoszs53itdZxO41Uifb9zcKR5Za2mviTRUilLMxpMVww0wDbI6QHiRB72lq__9e_uKclRJzq0ph_PCNeflQKs8KRohe7Fb1M8JhcAHeXfCnQbhT_R-H-6jriJZ9C0oCZtvlSRcc-AnRTNfZ7QnCW5q3-bzkyYOIb-bmu2vX2n4s35Nlnb9Y1KZP8WV2lld2NhvyyaN9PIxKtf2K4fkePB4_VFXt0xUe8VVOn5g4NGu9fM8tjZuNzzD_Ju99ZNeo8Ye2i80-XqOv63X1-2yhR3Zo53u3-Lybt3IIjFzvXKT5Oxv9JNy4NZ2cJiH2iDUYVcGMtwi4j0vSZ7oK4TB_BASiiLduG-YLpnw0NoIg9GPMigvCdp12PYk6jqsNbKpTh-o7dITQtIaqjttOIa7nnP3u320OyuddHag32DFdcpz6vwJdUgy54dxH0MH7sLWA8cAK8ePOiaVFRyaP4ZHzdSU1LyjsrwmHTIfdE9MF7ckSEzpxwp0eq85bgJ0M24ubyKjsGlkT31Sx9T4hrzJS-x3MuuvqBK5L8beQUErzZeeBAc_HNBWXNXwEUpXpsH6r-s3_7-rXt3-oRomz3z4p9oYbM6Kd18sw5W2TmK4rvd2szv-aw7qpFA1wqe_B1DLS1Jb5xCglJOVRUTcaaWEpD4SGzz5spqAja1HPik7VNfYcR0qsCjK0_62w9ifFCtyFgOrcaM2dGJraZ6r-JrEa45xEPTJbqwptn0cTWbcYv646FtcKcfh-Ja1BK7yI2lOeOVeruxbE0Lb3f99_k72_nqMYBfU2k54asmjNS1nAUI_gGH1HZMArIj833m3vDnu-HCcV3pQV1Fjr-6AI7iTg6Yciuc_g2PvwQYhprkQquXNwbqgKL7suKuJcy8ZHHSkDp9vP-m0fApFisflHYJ0Oo2Y1ADGzCoVueo4j4R6zavG72WKu8ZH6Z_quvf9z_uDvO37COFR7NK_dyA43_Gqe_bjt8JFc7wRjYM7IeAt1mNH6s3zrjxovtcf51QSnOqgZJj3k97LL_I9_-VrfqoS9S-vyjZGvs8-XMZFvygJnvysO79-UdpPzcU7jVwf-16X5KatE3wvrnkX1_JdcvO2196j_0HoKDZwbVt6o7ynRWH9B5Zn5Tt4U8pqfYNlSvh98fFD-7dqtUZMXquW-_vfPF_1v6zi97WP-O97rUtqKzo2c8R7q1lKOef6ezvnLo96b0vn564UAGTyr2pJ1PMWnyntBXH3oI5PPHc2VC1Gi0Lp8l0A7vWvE3nJ91_LuvgJj8hT9cOOPIY_4vQ5OyJ-SiO8_nA12w1IO1ZKQD6Cqrr84qsf3S42yFhsiq6rdq1rzZmJfro1R-U6stnaXARKALbLranJ35utoK6DlUwFNyA5GjJvNfjiAAZIxYlezl7rHHtT1mxPzrL20pxrxoApAY2PNZqlaGjXwmEMBnAZx_zppgDPL3VMTWHzkyn5LH66y0ORyLSkqahPLkqbRx7qIZKkoKlaMOCEAPfcutVK1MJGAcPXeRsaaBZbS8awlXJScF7v_3qUmfN1r8fIrrcW22GxMxPSg0NC0HduU-fTvYERBvLZ3uFGPIzincGfROzgjtumMe1GRWqF_uJGLa2kjBM0LH7Hre0pwsRuKPZMj0yI3eyXINENRN6FWbBnuor70DllnUGgPzdRpyATnryOq4tn1wGdZoAoOXTT7FDsUuff4unqk6sLd-AYwoFMRoLvxJLDfiDGtxND88T4gftuoPRxxnKt1M5Fjp8asAso0WYbTy2GVVm_tt6zQPrS-dVA0aolbgFoht2xlWtcZ5T8PXpLMvobqtrgb1suG9SX2agjbpTMYoxVi0nfMOHRJlmxTL8wtCq8_r1UtJVaL6jQiHI7dMc7pPjy-cGA_WDZOoVmmq9PgutL09HftVVPgcb5zJRFi2ja8AiE4DVrmjIP-vy4XqwBLBk8W5zSBo5fbQqnptuLRojX21rm9NQpzCOWGdiqxqhu7VQrToFE73333vZ7I_3G8NPvq38kUseC8Djb6aQ6USKQmmMv6CmJ9kqvVSLHPrhWH2RpFyq57oEYWqm3zVqCrCOHXNgwyfxbVg8CZASiOKHONGGdd0JxQ3AKdjYMu9nzxs7QUritH6Og8VzhJwyKgaXnRf0AoAQ9YAacZKB-Umv5y-3bwT-CVNSfpK57mFxFG78YPlSYYkCXiFTG59oW4L4JU0sn7cMLclY37DgqSIl7mv04bFVjv5610FzvsoyxziJApXmBPvB26bzGT7jEe4ar0qHYb-wIeG96AczwzhryA1dEGR-NseUulUxGTrXnXkADnOhMvWn9TXKkpyGNJ08BdMvk-vcPCD5xchkyt5xXqH_3Zt3IUfb2prqeSmS908lKZVfMrm35N0i7AAtb1ROZhbCDO1ldpmeZHRLWnHfLVUdO5YY7va0XnZ9edwdLiT0GcruWKuhrB_6wRHvxk20uWCzCbiDhhq0HJAR17eqTLw5yDY2B2aaOpv1Hoy3RFz6xm1LkHKiaiYpMaTL6sXmwA9xgdlU5jZSqVX3AFI-bD0ps9YLVLCBeG3nDo7G5LyDzcAclD0_DqvUWuK4PSB8IGXhC3o0zr5bmOODD7O1sDmZo2leZB5kGjBZXH3zoF_gzecrgpQ9jO_D4RegtqzCxh3zSXLlGNoUnGfvqHSRZ1Jf9l93xZz7oA3mYP_TO9oeQgEnroqSrW2Iu6triKnLjMq789Ri9NcowjNYiWk0RAo9Dd1ydmwum0ZGmDxqjR20Z-8_2aRNZ6Ir3JL0-Vv0CB_41q8TUAIQIlj9G3cYDdPwVYwjjT4khF9gDCE4Rfb4cL4yx1cMJoVX2ko58jPi3DSLeKbmsx63aROmGrEWEOdHeTPxZ35k83pI8Fyy4TxLPK-xszS8_xnYe3hg6JtTmSKc_Tdbeimx98VM4X7C3vgMnxtGom6S4IVYlaGzDpubg3aKWKntLxbaUwbCThg2QRANN5LcA8V-RVqJ7RshdFrbudH4kprxZVrM2JnXFrfTY9UvoGIl_ylTihQPhWnniC3TPK_EkGslRkigTBLKzXjZG456NhjYwjx4wtPVuDAu4ZOgayiNhrdBJlxlv5vJQOYhY0QbsXCQe00SBSkw843R__mrng1mOMbV9hawRonfKqphdCmVpi1T62GMJDPWwwP9_MrMJSW1V_5pQYzuPBWVO0roXDG2wWU1zzOIEbwzDjkyJwaZ1RqWAYLHytC6ADeHMJNvAo3Yli5MwdG3aviKitlfFXpvNHHARCDTeOigV1RsQPf5f8lhhNU-p8Cn2PIxQdn_CojIDWZFJViKZgY8VE5SMwOD9jXefw21DnWnjEufk_PYtTBMSysWcWPUZsazotcKXtTeJ6qHHIKUAS_hRYFZ5h6VIaKLMlTeUqvZjHFW3eR9ujstUS2Z8iX5RTAA5fop30ck-IWGy72QMz51eLTr9ahY1LEhUp4p9LF7tuzk2bg030jf4aBvKbo0KKosEPcTjOyzXomPXmHHxol5UX3O3sxeZTVmfWjrqXutfPffsVv5ic_juRlPPipMjn0n8OzJ-YK4CZR1tKRTcCzMJUEanDxiZjyso5kPgoF_drnccnWVO0AYpU-Hx1mp5UpRKwtnZJKBCYw73lfHZzeg2SNiA_rlT9h_noYf5zHj0vDR12wLuOPG93GRtqUp2sBjrASVupsR31FlBP_yS0RtSMhtyoUD3M6fvICKsjEe7iZCcWGrRMH8HFK6Uv8VCAwhKEaFQ21tL8Lvm9BIY-45uMYjZpIXhR0YHNQ0afbVYCR0dQzqlBp2U8jRZHyjSwS04NzhruH5qOyQeiIlEcgQgR22UjEOr3lDycFHMitMEThuS5AC95Gj1aHhgU8kRNEK14-ryRLKVIeX3K1WExHOcfyBxQT9kEFGK_H7bKQMsZW4zHklm3hshB8lQ9ySlCPM4cdqp-s48eXP2EI57u6Xo8kJMq1JoBzt--EmcLwpnThf3XrYSyhgzyYH0mVCY32xMs9Lxd4xzLMQt-yoEe0ILIVlu0PmKVeRMjbnyrLeRg23ZF2VcLuCrq_yuJFi6cXTgeIO4D2YrXdYLHQDFeKWLUxubvB96RPLWftyJkVbUGIED9ul-rL8BJV9bcm4Zas10Q32_SIJyT9FYFJOK9o31o5VjmM9JE0c0kkUwDORV4vMnbijkT9oPS4CSXd8NShNR3ynMy44STbmyzU4WLNIGNf1VK9aeEmqTzx1ZphoLRn7_Gqnc3-cL0_FifHW8zQ8mYU0nIbJQGkg9tWigy18jwqSkto-Dk7kMpJct8ezxuwN-5Vo8Cc_0CR4yW2GW5eOgY4SwB2HZ76-30YMVZtChDjaJ9NE-YlNLOHptK8wDlqV_MBGByRgPncOzwgT1SPZEP4T74WdI0RcG1UviVV5UtsFjI_4aXPh8qrZ7V5o1OFTuXmqM7wgF3ifqRMaiddYKf9S5_0CKyi84Lu6TZ0l_d-vyFqJHEzhmgPdl2fsbk9g4B5-KCGxI800ayosG3L25VhADkFDufidBC68DTPispkJnjOnlnZJFTDYTZoohpA4KGuPX-5Y4aeD4MqqCDKt2nDOYQdkDvpqtalYa41_T1kwYh0S5P6XqWXLGBZ7weNvkWluSF7aUwZvxnRUxV0zo0ZiMcn-rbffhfhNXWMT1hqGUXKYAixUlH5sBqtrOW7P6UEcbGAPTSoeRohKCTvrH2yQKi0XbOEzV9HbYhbRyHlIM1zgJBuqO6iKu-i7ILQGmOXq2eDqnSZ1B0f0rkcwM2YCK54ovCKKtG32yq3I-J4EnqxXZoCA33IZ_uXtID_ktBmXkvzND5uIRBsMPG0UWtKEzqawJ_RvhzJ1OsZvT5j5J03z5p20wUrqKoE-F0HxE03iKtteHuvkHggxas6r_skVbBWLaVU79z-1gPgTxBCYeGOfAwyTnPJ6XfyFNRJgcYzxgxZsrPalpr3Fzm8mzoAmPMu8iIxlOCzX7Ev5C-mOvtq8wSiJZm93Bm7l8gvMotbtQWd7pDneVAKjgJaXoUazgJGa2nHaeM1qHmHnrNFLU8r3XEvXuwmsUzWBRP7I9lc4T9siHc9W5qh6rE1j_59kaK8cU8wYPhxcTFMIi_U1QmhhdbaTpAVekKwDEujUMDLg8ThIBO4kcRWPjbm7LgYb_Ek1AvDpYocwCrTQlZ8rTYU5pYkVb1bvoFP0mj5m5lzS1oDrTznLVAK2ZFcE6AxRn6hITBs-ZBg-MhmdlNUUpgXsAvFXWW-GQhWBmTfJ3gEvlJ3aS0GhmE8hc8JjdIvd725jipJHMrswJt0ZlVqDDkLDl6p-iYpxdnrkI5HMYwKIE8cUfzfSmMlmTLA"
    },
    debug: "(()=>{\"use strict\";var e,r,t,n,l,i,a,s,v,d,c,f,p,h,g,m,y,b,w,k,S,T,I,A,x,N,O,B=(e,r=e=>Error(e))=>{throw eg(e=rc(e))?r(e):e},V=(e,r,t=-1)=>{if(e===r||null==(null!=e?e:r))return!0;if(ek(e)&&ek(r)&&e.length===r.length){var l,n=0;for(l in e){if(e[l]!==r[l]&&!V(e[l],r[l],t-1))return!1;++n}return n===Object.keys(r).length}return!1},J=(e,r,...t)=>e===r||0<t.length&&t.some(r=>J(e,r)),L=(e,r)=>null!=e?e:B(null!=r?r:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),K=(e,r=!0,t)=>{try{return e()}catch(e){return ex(r)?eb(e=r(e))?B(e):e:es(r)?console.error(r?B(e):e):r}finally{null!=t&&t()}},G=e=>{var r,t=()=>t.initialized||r?r:(r=rc(e)).then?r=r.then(e=>(t.initialized=!0,t.resolved=r=e)):(t.initialized=!0,t.resolved=r);return t},Y=async(e,r=!0,t)=>{try{var n,l=await rc(e);return ey(r)?null==(n=r[0])?void 0:n.call(r,l):l}catch(e){if(!es(r)){if(ey(r)){if(r[1])return r[1](e);throw e}var i=await(null==r?void 0:r(e));if(i instanceof Error)throw i;return i}if(r)throw e;console.error(e)}finally{await(null==t?void 0:t())}},Z=e=>e,Q=void 0,ee=Number.MAX_SAFE_INTEGER,er=!1,et=!0,en=()=>{},el=e=>e,ei=e=>null!=e,ea=Symbol.iterator,eo=(e,r)=>(t,n=!0)=>e(t)||r&&n&&null!=t&&null!=(t=r(t))?t:Q,eu=(e,r)=>ex(r)?e!==Q?r(e):Q:(null==e?void 0:e[r])!==Q?e:Q,es=e=>\"boolean\"==typeof e,ev=eo(es,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||Q))),ed=e=>!!e,ep=Number.isSafeInteger,eh=e=>\"number\"==typeof e,eg=e=>\"string\"==typeof e,em=eo(eg,e=>null==e?void 0:e.toString()),ey=Array.isArray,eb=e=>e instanceof Error,ew=(e,r=!1)=>null==e?Q:!r&&ey(e)?e:eN(e)?[...e]:[e],ek=e=>null!==e&&\"object\"==typeof e,eS=Object.prototype,eT=Object.getPrototypeOf,eE=e=>null!=e&&eT(e)===eS,eI=(e,r)=>\"function\"==typeof(null==e?void 0:e[r]),eA=e=>\"symbol\"==typeof e,ex=e=>\"function\"==typeof e,eN=(e,r=!1)=>!(null==e||!e[ea]||\"object\"!=typeof e&&!r),eO=e=>e instanceof Map,eC=e=>e instanceof Set,ej=(e,r)=>null==e?Q:!1===r?e:Math.round(e*(r=Math.pow(10,r&&!0!==r?r:0)))/r,e$=!1,e_=e=>(e$=!0,e),eM=e=>null==e?Q:ex(e)?e:r=>r[e],eU=(e,r,t)=>(null!=r?r:t)!==Q?(e=eM(e),null==r&&(r=0),null==t&&(t=ee),(n,l)=>r--?Q:t--?e?e(n,l):n:t):e,eF=e=>null==e?void 0:e.filter(ei),eP=(e,r,t,n)=>null==e?[]:!r&&ey(e)?eF(e):e[ea]?function*(e,r){if(null!=e)if(r){r=eM(r);var t=0;for(n of e)if(null!=(n=r(n,t++))&&(yield n),e$){e$=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,t===Q?r:eU(r,t,n)):ek(e)?function*(e,r){r=eM(r);var n,t=0;for(n in e){var l=[n,e[n]];if(null!=(l=r?r(l,t++):l)&&(yield l),e$){e$=!1;break}}}(e,eU(r,t,n)):eP(ex(e)?function*(e,r,t=Number.MAX_SAFE_INTEGER){for(null!=r&&(yield r);t--&&null!=(r=e(r));)yield r}(e,t,n):function*(e=0,r){if(e<0)for(null==r&&(r=-e-1);e++;)yield r--;else for(null==r&&(r=0);e--;)yield r++}(e,t),r),eR=(e,r,t,n)=>eP(e,r,t,n),ez=(e,r,t=1,n=!1,l,i)=>function*e(r,t,n,l){if(null!=r)if(r[ea]||n&&ek(r))for(var i of l?eP(r):r)1!==t?yield*e(i,t-1,n,!0):yield i;else yield r}(eP(e,r,l,i),t+1,n,!1),eD=(e,r,t,n)=>{if(r=eM(r),ey(e)){var l=0,i=[];for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n&&!e$;t++){var a=e[t];null!=(r?a=r(a,l++):a)&&i.push(a)}return e$=!1,i}return null!=e?ew(eR(e,r,t,n)):Q},eB=(e,r,t=1,n=!1,l,i)=>ew(ez(e,r,t,n,l,i)),eV=(...e)=>{var r;return eX(1===e.length?e[0]:e,e=>null!=e&&(null!=r?r:r=[]).push(...ew(e))),r},eG=(e,r,...t)=>null==e?Q:eN(e)?eD(e,e=>r(e,...t)):r(e,...t),eH=(e,r,t,n)=>{var l;if(null!=e){if(ey(e))return((e,r,t,n)=>{var l,i,a=0;for(t=t<0?e.length+t:null!=t?t:0,n=n<0?e.length+n:null!=n?n:e.length;t<n;t++)if(null!=e[t]&&(l=null!=(i=r(e[t],a++))?i:l,e$)){e$=!1;break}return l})(e,r,t,n);if(t===Q){if(e[ea])return((e,r)=>{var t,n,i,l=0;for(i of e)if(null!=i&&(t=null!=(n=r(i,l++))?n:t,e$)){e$=!1;break}return t})(e,r);if(\"object\"==typeof e)return((e,r)=>{var t,n,i,l=0;for(i in e)if(t=null!=(n=r([i,e[i]],l++))?n:t,e$){e$=!1;break}return t})(e,r)}for(var i of eP(e,r,t,n))null!=i&&(l=i);return l}},eX=eH,eZ=Object.fromEntries,eQ=(e,r,t)=>{var n,l,i;return null==e?Q:es(r)||t?(i={},eX(e,t?(e,n)=>null!=(e=r(e,n))&&null!=(e[1]=t(i[e[0]],e[1]))&&(i[e[0]]=e[1]):e=>eX(e,r?e=>{var r;return null!=(null==e?void 0:e[1])&&((null!=(r=(n=i)[l=e[0]])?r:n[l]=[]).push(e[1]),i)}:e=>null!=(null==e?void 0:e[1])&&(i[e[0]]=e[1],i))),i):eZ(eD(e,r?(e,t)=>eu(r(e,t),1):e=>eu(e,1)))},e1=(e,r=e=>null!=e,t=ey(e),n,l)=>(e=>t&&!ey(e)?[...e]:e)(eP(e,(e,t)=>r(e,t)?e:Q,n,l)),e2=(e,r,t,n)=>{var l;if(null==e)return Q;if(r)e=e1(e,r,!1,t,n);else{if(null!=(l=null!=(r=e.length)?r:e.size))return l;if(!e[ea])return Object.keys(e).length}return l=0,null!=(t=eH(e,()=>++l))?t:0},e4=(e,...r)=>null==e?Q:eh(e)?Math.max(e,...r):((e,r,t,n,l)=>{var a=()=>ex(t)?t():t;return null!=(e=eH(e,(e,n)=>{return t=null!=(e=r(t,e,n))?e:a()},n,l))?e:a()})(e,(e,t,n,l=r[1]?r[1](t,n):t)=>null==e||eh(l)&&e<l?l:e,Q,r[2],r[3]),e9=(e,r,t,n)=>{var l;return null==e?Q:eE(e)&&!r?0<Object.keys(e).length:null!=(l=null!=(l=null==(l=e.some)?void 0:l.call(e,null!=r?r:ed))?l:eH(e,r?(e,t)=>!!r(e,t)&&e_(!0):()=>e_(!0),t,n))&&l},e7=(e,r=e=>e)=>(null!=e&&e.sort((e,t)=>r(e)-r(t)),e),re=(e,r,t)=>(e.constructor===Object||ey(e)?void 0===t?delete e[r]:e[r]=t:void 0===t?e.delete?e.delete(r):delete e[r]:e.set?e.set(r,t):e.add?t?e.add(r):e.delete(r):e[r]=t,t),rr=(e,r,t)=>{var n;if(e)return e.constructor===Object&&null==t?e[r]:(void 0===(n=e.get?e.get(r):e.has?e.has(r):e[r])&&null!=t&&null!=(n=ex(t)?t():t)&&re(e,r,n),n)},rt=(e,...r)=>(eX(r,r=>eX(r,([r,t])=>{null!=t&&(eE(e[r])&&eE(t)?rt(e[r],t):e[r]=t)})),e),eo=e=>(r,t,n,l)=>{if(r)return null!=n?e(r,t,n,l):(eX(t,t=>ey(t)?e(r,t[0],t[1]):eX(t,([t,n])=>e(r,t,n))),r)},rl=eo(re),ri=eo((e,r,t)=>re(e,r,ex(t)?t(rr(e,r)):t)),ra=(e,r)=>e instanceof Set||e instanceof WeakSet?!e.has(r)&&(e.add(r),!0):rr(e,r)!==rl(e,r,!0),ro=(e,r)=>{var t;if(null!=(null!=e?e:r))return t=rr(e,r),eI(e,\"delete\")?e.delete(r):delete e[r],t},rs=(e,r)=>{if(e)return ey(r)?(ey(e)&&1<e.length?r.sort((e,r)=>r-e):r).map(r=>rs(e,r)):ey(e)?r<e.length?e.splice(r,1)[0]:void 0:ro(e,r)},rd=(e,...r)=>{if(void 0!==e)return Object.fromEntries(r.flatMap(t=>ek(t)?ey(t)?t.map(r=>ey(r)?1===r.length?[r[0],e[r[0]]]:rd(e[r[0]],...r[1]):[r,e[r]]):Object.entries(r).map(([r,t])=>[r,!0===t?e[r]:rd(e[r],t)]):[[t,e[t]]]).filter(e=>null!=e[1]))},rc=e=>ex(e)?e():e,rf=(e,r=-1)=>ey(e)?r?e.map(e=>rf(e,r-1)):[...e]:eE(e)?r?eQ(e,([e,t])=>[e,rf(t,r-1)]):{...e}:eC(e)?new Set(r?eD(e,e=>rf(e,r-1)):e):eO(e)?new Map(r?eD(e,e=>[e[0],rf(e[1],r-1)]):e):e,rp=(e,...r)=>null==e?void 0:e.push(...r),rh=(e,...r)=>null==e?void 0:e.unshift(...r),rg=(e,r)=>{var t,l,i;if(e)return eE(r)?(i={},eE(e)&&(eX(e,([e,a])=>{if(a!==r[e]){if(eE(t=a)){if(!(a=rg(a,r[e])))return;[a,t]=a}i[e]=a,(null!=l?l:l=rf(r))[e]=t}}),l)?[i,l]:void 0):[e,e]},rm=\"undefined\"!=typeof performance?(e=et)=>e?Math.trunc(rm(er)):performance.timeOrigin+performance.now():Date.now,ry=(e=!0,r=()=>rm())=>{var t,n=+e*r(),l=0;return(i=e,a)=>(t=e?l+=-n+(n=r()):l,a&&(l=0),(e=i)&&(n=r()),t)},rw=(e,r=0)=>{var e=ex(e)?{frequency:r,callback:e}:e,{queue:l=!0,paused:i=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,v=(r=null!=(e=e.frequency)?e:0,0),d=(new rS).resolve(),c=ry(!i),f=c(),p=async e=>{if(!v||!l&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await Y(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||r<=0||o)&&m(!1),!(y.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(g):g(),r<0?-r:r),g=()=>{y.active&&p(),y.active&&h()},m=(e,r=!e)=>(c(e,r),clearTimeout(v),y.active=!!(v=e?h():0),y),y={active:!1,busy:!1,restart:(e,t)=>(r=null!=e?e:r,u=null!=t?t:u,m(!0,!0)),toggle:(e,r)=>e!==y.active?e?r?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!i,a)};function rk(e,r,t){r in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t}class rS{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,r=!1){return this._promise.resolve(e,r),this}reject(e,r=!1){return this._promise.reject(e,r),this}reset(){return this._promise=new rT,this}signal(e){return this.resolve(e),this.reset(),this}then(e,r){return this._promise.then(e,r)}constructor(){rk(this,\"_promise\",void 0),this.reset()}}class rT{then(e,r){return this._promise.then(e,r)}constructor(){var e;rk(this,\"_promise\",void 0),rk(this,\"resolve\",void 0),rk(this,\"reject\",void 0),rk(this,\"value\",void 0),rk(this,\"error\",void 0),rk(this,\"pending\",!0),this._promise=new Promise((...r)=>{e=r.map((e,r)=>(t,n)=>{if(this.pending)return this.pending=!1,this[r?\"error\":\"value\"]=t===Q||t,e(t),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var r$,rI=(e,r)=>null==e||isFinite(e)?!e||e<=0?rc(r):new Promise(t=>setTimeout(async()=>t(await rc(r)),e)):B(`Invalid delay ${e}.`),rN=(e,r,t)=>{var n=!1,l=(...r)=>e(...r,i),i=()=>n!==(n=!1)&&(t(l),!0),a=()=>n!==(n=!0)&&(r(l),!0);return a(),[i,a]},eo=()=>{var e,r=new Set;return[(t,n)=>{var l=rN(t,e=>r.add(e),e=>r.delete(e));return n&&e&&t(...e,l[0]),l},(...t)=>(e=t,r.forEach(e=>e(...t)))]},rC=(e,r=[\"and\",\", \"])=>{var t;return e?1===(e=eD(e)).length?e[0]:ey(r)?[e.slice(0,-1).join(null!=(t=r[1])?t:\", \"),\" \",r[0],\" \",e[e.length-1]].join(\"\"):e.join(null!=r?r:\", \"):Q},rj=(e,r,t)=>null==e?Q:ey(r)?null==(r=r[0])?Q:r+\" \"+rj(e,r,t):null==r?Q:1===r?e:null!=t?t:e+\"s\",r_=(e,r,t)=>t?(r$&&rp(t,\"\u001b[\",r,\"m\"),ey(e)?rp(t,...e):rp(t,e),r$&&rp(t,\"\u001b[m\"),t):r_(e,r,[]).join(\"\"),rU=(e,r)=>e&&(e.length>r?e.slice(0,-1)+\"…\":e),rF=(e,r,t)=>null==e?Q:ex(r)?rC(eD(eg(e)?[e]:e,r),null!=t?t:\"\"):eg(e)?e:rC(eD(e,e=>!1===e?Q:e),null!=r?r:\"\"),rq=e=>(e=Math.log2(e))===(0|e),rR=(e,r,t,n)=>{var l,i,a,o,e=Object.fromEntries(Object.entries(e).filter(([e,r])=>eg(e)&&eh(r)).map(([e,r])=>[e.toLowerCase(),r])),s=Object.entries(e),v=Object.values(e),d=null!=(l=e.any)?l:v.reduce((e,r)=>e|r,0),c=r?{...e,any:d,none:0}:e,f=Object.fromEntries(Object.entries(c).map(([e,r])=>[r,e])),p=(e,t)=>{var n;return ep(e)?!r&&t?null!=f[e]?e:Q:Number.isSafeInteger(e)?e:Q:eg(e)?null!=(n=null!=(n=c[e])?n:c[e.toLowerCase()])?n:p(parseInt(e),t):Q},h=!1,[g,m]=r?[(e,r)=>Array.isArray(e)?e.reduce((e,t)=>null==t||h?e:null==(t=p(t,r))?(h=!0,Q):(null!=e?e:0)|t,(h=!1,Q)):p(e),(e,r)=>null==(e=g(e,!1))?Q:r&&(a=f[e&d])?(i=m(e&~(e&d),!1)).length?[a,...i]:a:(e=s.filter(([,r])=>r&&e&r&&rq(r)).map(([e])=>e),r?e.length?1===e.length?e[0]:e:\"none\":e)]:[p,e=>null!=(e=p(e))?f[e]:Q],y=(e,r)=>null==e?Q:null==(e=g(o=e,r))?B(TypeError(JSON.stringify(o)+` is not a valid ${t} value.`)):e,b=s.filter(([,e])=>!n||(n&e)===e&&rq(e));return((e,r)=>{var t=(r,n)=>{var l;if(r){if(ey(r)){if(eE(r[0]))return void r.splice(1).forEach(e=>t(e,r[0]));l=r}else l=eD(r);l.forEach(([r,t])=>Object.defineProperty(e,r,{configurable:!1,enumerable:!0,writable:!1,...n,...eE(t)&&(\"get\"in t||\"value\"in t)?t:ex(t)&&!t.length?{get:t}:{value:t}}))}};return r.forEach(e=>t(e)),e})(e=>y(e),[[{configurable:!1,enumerable:!1},{parse:y,tryParse:g,entries:s,values:v,lookup:m,length:s.length,format:e=>m(e,!0),logFormat:(e,r=\"or\")=>\"any\"===(e=m(e,!0))?\"any \"+t:`the ${t} `+rC(eD(ew(e),e=>(e=>null==e?Q:\"'\"+e+\"'\")(e)),[r])},r&&{pure:b,map:(e,r)=>(e=y(e),b.filter(([,r])=>r&e).map(null!=r?r:([,e])=>e))}]])},rz=(...e)=>{var r=(e=>!ey(e)&&eN(e)?eD(e,eO(e)?e=>e:eC(e)?e=>[e,!0]:(e,r)=>[r,e]):ek(e)?Object.entries(e):Q)(eQ(e,!0)),t=e=>(ek(e)&&(ey(e)?e.forEach((r,n)=>e[n]=t(r)):r.forEach(([r,t])=>{var n,l=Q;null!=(n=e[r])&&(1===t.length?e[r]=t[0].parse(n):t.forEach((i,a)=>!l&&null!=(l=a===t.length-1?i.parse(n):i.tryParse(n))&&(e[r]=l)))})),e);return t},rD=Symbol(),rW=(e,r=[\"|\",\";\",\",\"],t=!0)=>{var l;return e?(null==(l=e.split(\"=\").map(e=>t?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim()))[1]&&(l[1]=\"\"),l[2]=l[1]&&(null==r?void 0:r.length)&&((e,r)=>null==e?Q:(r=eM(r),eH(e,(e,t)=>!r||(e=r(e,t))?e_(e):Q,void 0,void 0)))(r,(e,r,t=l[1].split(e))=>1<t.length?t:Q)||(l[1]?[l[1]]:[]),l):Q},rB=(e,r=!0,t)=>null==e?Q:rG(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,t,n,l,i,a,o,u,s,v,d,c)=>{e={source:e,scheme:t,urn:t?!n:!n&&Q,authority:l,user:i,password:a,host:null!=o?o:u,port:null!=s?parseInt(s):Q,path:v,query:!1===r?d:rV(d,r),fragment:c};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":Q),e}),rV=(e,r,t=!0)=>rJ(e,\"&\",r,t),rJ=(e,r,t,n=!0)=>{var a,o=[],e=null==e?Q:eQ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(r),(e,r,[l,i,u]=null!=(a=rW(e,!1===t?[]:!0===t?Q:t,n))?a:[],s)=>(s=null!=(l=null==l?void 0:l.replace(/\\[\\]$/,\"\"))?!1!==t?[l,1<u.length?u:i]:[l,i]:Q,o.push(s),s),(e,r)=>e?!1!==t?eV(e,r):(e?e+\",\":\"\")+r:r);return e&&(e[rD]=o),e},rG=(e,r,l,i=!1)=>null==(null!=e?e:r)?Q:l?(t=Q,i?(n=[],rG(e,r,(...e)=>null!=(t=l(...e))&&n.push(t))):e.replace(r,(...e)=>t=l(...e)),t):e.match(r),rH=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),rX=/\\z./g,rY=(e,r)=>(r=rF((e=>null!=e?new Set([...eR(e,void 0,void 0,void 0)]):Q)(e1(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(r,\"gu\"):rX,rZ={},rQ=e=>e instanceof RegExp,r0=(t,n=[\",\",\" \"])=>{var l;return rQ(t)?t:ey(t)?rY(eD(t,e=>{return null==(e=r0(e,n))?void 0:e.source})):es(t)?t?/./g:rX:eg(t)?null!=(l=(e=rZ)[r=t])?l:e[r]=rG(t||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,r,t)=>r?RegExp(r,\"gu\"):rY(eD(r1(t,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rF(n,rH)}]`)),e=>e&&`^${rF(r1(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>rH(r2(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):Q},r1=(e,r)=>{return null!=(r=null==e?void 0:e.split(r))?r:e},r2=(e,r,t)=>{return null!=(r=null==e?void 0:e.replace(r,t))?r:e},r4=(e=(e,r)=>e-r,r=e=>e[1]-e[0])=>{var t=[];return rl(t,{push(n,l){for(var i=[n,l],a=(e=!0)=>e?t.width=t.reduce((e,t)=>e+r(t),0):t.width,o=0;o<t.length;o++){var u,s,v=t[o];if(e(i[1],v[0])<0)return a(t.splice(o,0,i));if(e(i[0],v[1])<=0){if(e(i[0],v[0])<0&&(u=v[0]=i[0]),0<e(i[1],v[1])&&(u=v[1]=i[1]),!((null==(s=t[o+1])?void 0:s[0])<v[1]))return a(null!=u);u=i=t.splice(o--,1)[0]}}return a(i&&(t[t.length]=i))},width:0})},r6=((C=l=l||{})[C.Anonymous=0]=\"Anonymous\",C[C.Indirect=1]=\"Indirect\",C[C.Direct=2]=\"Direct\",C[C.Sensitive=3]=\"Sensitive\",rR(l,!1,\"data classification\")),r5=(e,r)=>{var t;return r6.parse(null!=(t=null==e?void 0:e.classification)?t:null==e?void 0:e.level)===r6.parse(null!=(t=null==r?void 0:r.classification)?t:null==r?void 0:r.level)&&r8.parse(null!=(t=null==e?void 0:e.purposes)?t:null==e?void 0:e.purposes)===r8.parse(null!=(t=null==r?void 0:r.purposes)?t:null==r?void 0:r.purposes)},r3=(e,r)=>{var t;return null==e?void 0:eh(e.classification)&&eh(e.purposes)?e:{...e,level:void 0,purpose:void 0,classification:r6.parse(null!=(t=null!=(t=null!=(t=e.classification)?t:e.level)?t:null==r?void 0:r.classification)?t:0),purposes:r8.parse(null!=(e=null!=(t=null!=(t=e.purposes)?t:e.purpose)?t:null==r?void 0:r.purposes)?e:i.Necessary)}},r8=((C=i=i||{})[C.None=0]=\"None\",C[C.Necessary=1]=\"Necessary\",C[C.Functionality=2]=\"Functionality\",C[C.Performance=4]=\"Performance\",C[C.Targeting=8]=\"Targeting\",C[C.Security=16]=\"Security\",C[C.Infrastructure=32]=\"Infrastructure\",C[C.Any_Anonymous=49]=\"Any_Anonymous\",C[C.Any=63]=\"Any\",C[C.Server=2048]=\"Server\",C[C.Server_Write=4096]=\"Server_Write\",rR(i,!0,\"data purpose\",2111)),C=rR(i,!1,\"data purpose\",0),r7=(e,r)=>(!(a=null==e?void 0:e.metadata)||r&&(delete a.posted,delete a.queued,Object.entries(a).length)||delete e.metadata,e),te=e=>!(null==e||!e.patchTargetId),tr=(($=o={})[$.Global=0]=\"Global\",$[$.Entity=1]=\"Entity\",$[$.Session=2]=\"Session\",$[$.Device=3]=\"Device\",rR(o,!($[$.User=4]=\"User\"),\"variable scope\")),o=(l.Anonymous,i.Necessary,{scope:tr,purpose:C,purposes:r8,classification:r6}),tl=(rz(o),e=>null==e?void 0:e.filter(ei).sort((e,r)=>e.scope===r.scope?e.key.localeCompare(r.key,\"en\"):e.scope-r.scope)),ti=((C=$={})[C.Add=0]=\"Add\",C[C.Min=1]=\"Min\",C[C.Max=2]=\"Max\",C[C.IfMatch=3]=\"IfMatch\",rR($,!(C[C.IfNoneMatch=4]=\"IfNoneMatch\"),\"variable patch type\"),($=s=s||{})[$.Success=200]=\"Success\",$[$.Created=201]=\"Created\",$[$.Unchanged=304]=\"Unchanged\",$[$.Denied=403]=\"Denied\",$[$.NotFound=404]=\"NotFound\",$[$.ReadOnly=405]=\"ReadOnly\",$[$.Conflict=409]=\"Conflict\",$[$.Unsupported=501]=\"Unsupported\",$[$.Invalid=400]=\"Invalid\",$[$.Error=500]=\"Error\",rR(s,!1,\"variable set status\"),(e,r,t)=>{var n,l=e(),i=e=>e,e=(e,t=ts)=>(e=>{var r={initialized:!0,then:(e=>{var r=G(e);return(e,t)=>Y(r,[e,t])})(()=>(r.initialized=!0,rc(e)))};return r})(async()=>(n=i(t(await l,r)))&&e(n)),o={then:e(e=>e).then,all:e(e=>e,e=>e),changed:e(e=>e1(e,e=>e.status<300)),variables:e(e=>eD(e,to)),values:e(e=>eD(e,e=>{return null==(e=to(e))?void 0:e.value})),push:()=>(i=e=>(null!=t&&t(eD((e=>null==e?void 0:e.map(e=>(null==e?void 0:e.status)<400?e:Q))(e))),e),o),value:e(e=>{return null==(e=to(e[0]))?void 0:e.value}),variable:e(e=>to(e[0])),result:e(e=>e[0])};return o}),to=e=>{var r;return tu(e)?null!=(r=e.current)?r:e:Q},tu=(e,r=!1)=>r?(null==e?void 0:e.status)<300:(null==e?void 0:e.status)<400||404===(null==e?void 0:e.status),ts=(e,r,t)=>{var n,l,i=[],a=eD(ew(e),(e,a)=>{var s;return e&&(e.status<400||!t&&404===e.status?e:(l=(e=>`'${e.key}' in ${tr.format(e.scope)} scope`)(null!=(s=e.source)?s:e)+\" could not be \"+(404===e.status?\"found.\":`${e.source||500!==e.status?\"set\":\"read\"} because `+(409===e.status?`of a conflict. The expected version '${null==(s=e.source)?void 0:s.version}' did not match the current version '${null==(s=e.current)?void 0:s.version}'.`:403===e.status?null!=(s=e.error)?s:\"the operation was denied.\":400===e.status?null!=(s=e.error)?s:\"the value does not conform to the schema\":405===e.status?\"it is read only.\":500===e.status?\"of an unexpected error: \"+e.error:\"of an unknown reason.\")),null!=(n=null==r?void 0:r[a])&&!1===n(e,l)||i.push(l),Q))});return i.length?B(i.join(\"\\n\")):ey(e)?a:null==a?void 0:a[0]},td=e=>e&&\"string\"==typeof e.type,tc=(e=>r=>(null==r?void 0:r.type)&&e.some(e=>e===(null==r?void 0:r.type)))([\"view\"]),tf=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,tp=(e,r)=>{var t;return r&&(!(d=e.get(v=r.tag+(null!=(t=r.value)?t:\"\")))||(null!=(t=d.score)?t:1)<(null!=(t=r.score)?t:1))&&e.set(v,r)},th=(e,r=\"\",t=new Map)=>{if(e)return eN(e)?eX(e,e=>th(e,r,t)):eg(e)?rG(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,l,i,a,o,u)=>{l={tag:(n?tf(n)+\"::\":\"\")+r+tf(l),value:tf(null!=(n=null!=i?i:a)?n:o)};u&&10!==parseFloat(u)&&(l.score=parseFloat(u)/10),tp(t,l)}):tp(t,e),t},tg=((C=c=c||{})[C.View=-3]=\"View\",C[C.Tab=-2]=\"Tab\",C[C.Shared=-1]=\"Shared\",rR(c,!1,\"local variable scope\")),ty=e=>{var r;return null!=(r=tg.format(e))?r:tr.format(e)},tb=e=>!!tg.tryParse(null==e?void 0:e.scope),tw=rz({scope:tg},o),tk=e=>{return null==e?void 0:eg(e)?e:e.source?tk(e.source):`${(e=>{var r;return null!=(r=tg.tryParse(e))?r:tr(e)})(e.scope)}\u0000${e.key}\u0000`+(null!=(e=e.targetId)?e:\"\")},tS=e=>{e=e.split(\"\\0\");return{scope:+e[0],key:e[1],targetId:e[2]}},tE=()=>()=>B(\"Not initialized.\"),tI=window,tA=document,tx=tA.body,tO=((e=>r$=e)(!!tI.chrome),ee),tC=(e,r,t=(e,r)=>tO<=r)=>{for(var n=0,l=er;1===(null==e?void 0:e.nodeType)&&!t(e,n++)&&r(e,(e,r)=>(null!=e&&(i=e,l=r!==et&&null!=i),et),n-1)!==er&&!l;){var i,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==tA&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return i},tj=(e,r=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===r))switch(r){case!0:case\"z\":var t;return null==(t=(\"\"+e).trim())?void 0:t.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ev(e);case\"n\":return parseFloat(e);case\"j\":return K(()=>JSON.parse(e),en);case\"h\":return K(()=>nx(e),en);case\"e\":return K(()=>null==nO?void 0:nO(e),en);default:return ey(r)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:tj(e,r[0])):void 0}},t$=(e,r,t)=>tj(null==e?void 0:e.getAttribute(r),t),t_=(e,r,t)=>tC(e,(e,n)=>n(t$(e,r,t))),tM=(e,r)=>{return null==(e=t$(e,r))||null==(r=e.trim())?void 0:r.toLowerCase()},tF=(e,r)=>getComputedStyle(e).getPropertyValue(r)||null,tP=e=>null!=e?e.tagName:null,tR=e=>({x:ej(scrollX,e),y:ej(scrollY,e)}),tz=(e,r)=>r2(e,/#.*$/,\"\")===r2(r,/#.*$/,\"\"),tD=(e,r,t=et)=>(p=tW(e,r))&&Z({xpx:p.x,ypx:p.y,x:ej(p.x/tx.offsetWidth,4),y:ej(p.y/tx.offsetHeight,4),pageFolds:t?p.y/window.innerHeight:void 0}),tW=(e,r)=>null!=r&&r.pointerType&&null!=(null==r?void 0:r.pageY)?{x:r.pageX,y:r.pageY}:e?({x:h,y:g}=tB(e),{x:h,y:g}):void 0,tB=e=>e?(m=e.getBoundingClientRect(),f=tR(er),{x:ej(m.left+f.x),y:ej(m.top+f.y),width:ej(m.width),height:ej(m.height)}):void 0,tV=(e,r,t,n={capture:!0,passive:!0})=>(r=ew(r),rN(t,t=>eX(r,r=>e.addEventListener(r,t,n)),t=>eX(r,r=>e.removeEventListener(r,t,n)))),tL=()=>({...f=tR(et),width:window.innerWidth,height:window.innerHeight,totalWidth:tx.offsetWidth,totalHeight:tx.offsetHeight}),tK=new WeakMap,tG=e=>tK.get(e),tH=(e,r=er)=>(r?\"--track-\":\"track-\")+e,tX=(e,r,t,n,l,i)=>(null==r?void 0:r[1])&&eX((e=>null==e?void 0:e.getAttributeNames())(e),a=>{var o;return null!=(o=(y=r[0])[b=a])?o:y[b]=(i=er,!eg(n=eX(r[1],([r,t,n],l)=>(r=>r&&null!=a?r.test(a):Q)(r)&&(i=void 0,!t||(e=>!(null==e||!e.matches(t)))(e))&&e_(null!=n?n:a)))||(l=e.getAttribute(a))&&!ev(l)||th(l,r2(n,/\\-/g,\":\"),t),i)}),tY=()=>{},tZ=(e,r)=>{if(w===(w=t5.tags))return tY(e,r);var t=e=>e?rQ(e)?[[e]]:eN(e)?eB(e,t):[eE(e)?[r0(e.match),e.selector,e.prefix]:[r0(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...t(eD(w,eE(w)?e=>e[1]:e=>e,void 0,void 0))]];(tY=(e,r)=>tX(e,n,r))(e,r)},tQ=(e,r)=>rF(eV(tF(e,tH(r,et)),tF(e,tH(\"base-\"+r,et))),\" \"),t0={},t1=(e,r,t=tQ(e,\"attributes\"))=>{var n;t&&tX(e,null!=(n=t0[t])?n:t0[t]=[{},(e=>rG(e,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,r,t,n)=>[r0(t||n),,r],!0))(t)],r),th(tQ(e,\"tags\"),void 0,r)},t2=(e,r,t=er,n)=>{return null!=(t=null!=(t=t?tC(e,(e,t)=>t(t2(e,r,er)),ex(t)?t:void 0):rF(eV(t$(e,tH(r)),tF(e,tH(r,et))),\" \"))?t:n&&(k=tG(e))&&n(k))?t:null},t4=(e,r,t=er,n)=>\"\"===(S=t2(e,r,t,n))||(null==S?S:ev(S)),t6=(e,r,t,n)=>e&&(null==n&&(n=new Map),t1(e,n),tC(e,e=>{tZ(e,n),th(null==t?void 0:t(e),void 0,n)},r),n.size)?{tags:[...n.values()]}:{},t5={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,impressionThreshold:1e3,captureContextMenu:!0,defaultActivationTracking:\"auto\",tags:{default:[\"data-id\",\"data-name\"]}},t3=[],t8=[],t9=(e,r=0)=>e.charCodeAt(r),ne=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,r)=>t3[t8[r]=e.charCodeAt(0)]=r),e=>{for(var r,t=0,n=e.length,l=[];t<n;)r=e[t++]<<16|e[t++]<<8|e[t++],l.push(t8[(16515072&r)>>18],t8[(258048&r)>>12],t8[(4032&r)>>6],t8[63&r]);return l.length+=n-t,(e=>String.fromCharCode(...e))(l)}),nt={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nn=(e=256)=>e*Math.random()|0,ni={exports:{}},{deserialize:na,serialize:no}=((()=>{function r(e,r){if(r&&r.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var t,n,l=new Uint8Array(128),i=0;if(r&&r.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return l.subarray(0,i);function o(e,l){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var r;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(r=e/4294967296)>>>24,r>>>16,r>>>8,r,(r=e%4294967296)>>>24,r>>>16,r>>>8,r]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(t=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(t)))})(e);break;case\"string\":(c=(a=(e=>{for(var r=!0,t=e.length,n=0;n<t;n++)if(127<e.charCodeAt(n)){r=!1;break}for(var l=0,i=new Uint8Array(e.length*(r?1:4)),a=0;a!==t;a++){var o=e.charCodeAt(a);if(o<128)i[l++]=o;else{if(o<2048)i[l++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=t)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");i[l++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,i[l++]=o>>12&63|128}else i[l++]=o>>12|224;i[l++]=o>>6&63|128}i[l++]=63&o|128}}return r?i:i.subarray(0,l)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var t,r=e.getTime()/1e3;0===e.getMilliseconds()&&0<=r&&r<4294967296?v([214,255,r>>>24,r>>>16,r>>>8,r]):0<=r&&r<17179869184?v([215,255,(t=1e6*e.getMilliseconds())>>>22,t>>>14,t>>>6,t<<2>>>0|r/4294967296,r>>>24,r>>>16,r>>>8,r]):(v([199,12,255,(t=1e6*e.getMilliseconds())>>>24,t>>>16,t>>>8,t]),d(r))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?v([196,a]):v(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var t,r=0;for(t in e)void 0!==e[t]&&r++;for(t in r<=15?s(128+r):v(r<=65535?[222,r>>>8,r]:[223,r>>>24,r>>>16,r>>>8,r]),e){var n=e[t];void 0!==n&&(o(t),o(n))}})(e);break;default:if(l||!r||!r.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof r.invalidTypeReplacement?o(r.invalidTypeReplacement(e),!0):o(r.invalidTypeReplacement,!0)}}function u(e){var r=e.length;r<=15?s(144+r):v(r<=65535?[220,r>>>8,r]:[221,r>>>24,r>>>16,r>>>8,r]);for(var t=0;t<r;t++)o(e[t])}function s(e){if(l.length<i+1){for(var r=2*l.length;r<i+1;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l[i]=e,i++}function v(e){if(l.length<i+e.length){for(var r=2*l.length;r<i+e.length;)r*=2;var t=new Uint8Array(r);t.set(l),l=t}l.set(e,i),i+=e.length}function d(e){var r,e=0<=e?(r=e/4294967296,e%4294967296):(r=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([r>>>24,r>>>16,r>>>8,r,e>>>24,e>>>16,e>>>8,e])}}function t(e,r){var t,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),r&&r.multiple)for(t=[];n<e.length;)t.push(l());else t=l();return t;function l(){var r=e[n++];if(0<=r&&r<=127)return r;if(128<=r&&r<=143)return s(r-128);if(144<=r&&r<=159)return v(r-144);if(160<=r&&r<=191)return d(r-160);if(192===r)return null;if(193===r)throw Error(\"Invalid byte code 0xc1 found.\");if(194===r)return!1;if(195===r)return!0;if(196===r)return u(-1,1);if(197===r)return u(-1,2);if(198===r)return u(-1,4);if(199===r)return c(-1,1);if(200===r)return c(-1,2);if(201===r)return c(-1,4);if(202===r)return o(4);if(203===r)return o(8);if(204===r)return a(1);if(205===r)return a(2);if(206===r)return a(4);if(207===r)return a(8);if(208===r)return i(1);if(209===r)return i(2);if(210===r)return i(4);if(211===r)return i(8);if(212===r)return c(1);if(213===r)return c(2);if(214===r)return c(4);if(215===r)return c(8);if(216===r)return c(16);if(217===r)return d(-1,1);if(218===r)return d(-1,2);if(219===r)return d(-1,4);if(220===r)return v(-1,2);if(221===r)return v(-1,4);if(222===r)return s(-1,2);if(223===r)return s(-1,4);if(224<=r&&r<=255)return r-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+r+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function i(r){for(var i,t=0,l=!0;0<r--;)l?(t+=127&(i=e[n++]),128&i&&(t-=128),l=!1):t=(t*=256)+e[n++];return t}function a(r){for(var t=0;0<r--;)t=256*t+e[n++];return t}function o(r){var t=new DataView(e.buffer,n+e.byteOffset,r);return n+=r,4===r?t.getFloat32(0,!1):8===r?t.getFloat64(0,!1):void 0}function u(r,t){r<0&&(r=a(t));t=e.subarray(n,n+r);return n+=r,t}function s(e,r){e<0&&(e=a(r));for(var t={};0<e--;)t[l()]=l();return t}function v(e,r){e<0&&(e=a(r));for(var t=[];0<e--;)t.push(l());return t}function d(r,t){r<0&&(r=a(t));t=n;return n+=r,((e,r,t)=>{var n=r,l=\"\";for(t+=r;n<t;){var i=e[n++];if(127<i)if(191<i&&i<224){if(t<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");i=(31&i)<<6|63&e[n++]}else if(223<i&&i<240){if(t<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");i=(15&i)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<i&&i<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+i.toString(16)+\" at index \"+(n-1));if(t<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");i=(7&i)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(i<=65535)l+=String.fromCharCode(i);else{if(!(i<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+i.toString(16)+\" exceeds UTF-16 reach\");i-=65536,l+=String.fromCharCode(i>>10|55296)+String.fromCharCode(1023&i|56320)}}return l})(e,t,r)}function c(e,r){e<0&&(e=a(r));r=a(1),e=u(e);return 255===r?(e=>{var t,r;if(4===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*r);if(8===e.length)return t=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),r=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*r+t/1e6);if(12===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,r=i(8),new Date(1e3*r+t/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:r,data:e}}}var n={serialize:r,deserialize:t,encode:r,decode:t};ni.exports=n})(),($=ni.exports)&&$.__esModule&&Object.prototype.hasOwnProperty.call($,\"default\")?$.default:$),nu=\"$ref\",ns=(e,r,t)=>eA(e)?Q:t?r!==Q:null===r||r,nv=(e,r,{defaultValues:t=!0,prettify:n=!1})=>{var l,i,a,o=(e,r,n=e[r],l=ns(r,n,t)?s(n):Q)=>(n!==l&&(l!==Q||ey(e)?e[r]=l:delete e[r],u(()=>e[r]=n)),l),u=e=>(null!=l?l:l=[]).push(e),s=e=>{if(null==e||ex(e)||eA(e))return Q;if(ek(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==i?void 0:i.get(e)))return e[nu]||(e[nu]=a,u(()=>delete e[nu])),{[nu]:a};if(eE(e))for(var r in(null!=i?i:i=new Map).set(e,i.size+1),e)o(e,r);else!eN(e)||e instanceof Uint8Array||(!ey(e)||Object.keys(e).length<e.length?[...e]:e).forEach((r,t)=>t in e?o(e,t):(e[t]=null,u(()=>delete e[t])))}return e};return K(()=>{var t;return r?no(null!=(t=s(e))?t:null):K(()=>JSON.stringify(e,Q,n?2:0),()=>JSON.stringify(s(e),Q,n?2:0))},!0,()=>null==l?void 0:l.forEach(e=>e()))},nd=e=>{var r,t,n=e=>ek(e)?e[nu]&&(t=(null!=r?r:r=[])[e[nu]])?t:(e[nu]&&delete(r[e[nu]]=e)[nu],Object.entries(e).forEach(([r,t])=>t!==(t=n(t))&&(e[r]=t)),e):e;return n(eg(e)?JSON.parse(e):null!=e?K(()=>na(e),()=>(console.error(\"Invalid message received.\",e),Q)):e)},nc=(e,r={})=>{var t=(e,{json:r=!1,...t})=>{var l,i,a,n=(e,n)=>eh(e)&&!0===n?e:a(e=eg(e)?new Uint8Array(eD(e.length,r=>255&e.charCodeAt(r))):r?K(()=>JSON.stringify(e),()=>JSON.stringify(nv(e,!1,t))):nv(e,!0,t),n);return r?[e=>nv(e,!1,t),e=>null==e?Q:K(()=>nd(e),Q),(e,r)=>n(e,r)]:([l,i,a]=(e=>{for(var r,t,n,l,i,o,a=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},g=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),l=16-((r=e.length)+4)%16,i=new Uint8Array(4+r+l),n=0;n<3;i[n++]=g(nn()));for(t=0,i[n++]=g(d^16*nn(16)+l);t<r;i[n++]=g(d^e[t++]));for(;l--;)i[n++]=nn();return i}:e=>e,e?e=>{for(h(),t=0;t<3;g(e[t++]));if((r=e.length-4-((d^g(e[t++]))%16||16))<=0)return new Uint8Array(0);for(n=0,i=new Uint8Array(r);n<r;i[n++]=d^g(e[t++]));return i}:e=>e,(e,r=64)=>{if(null==e)return null;for(o=es(r)?64:r,h(),[a,u]=nt[o],t=0;t<e.length;a=BigInt.asUintN(o,(a^BigInt(d^g(e[t++])))*u));return!0===r?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,r)=>(r?el:ne)(l(nv(e,!0,t))),e=>null!=e?nd(i(e instanceof Uint8Array?e:(e=>{for(var r,t=0,n=0,l=e.length,i=new Uint8Array(3*(l/4|0)+(l+3&3)%3);t<l;)i[n++]=t3[t9(e,t++)]<<2|(r=t3[t9(e,t++)])>>4,t<l&&(i[n++]=(15&r)<<4|(r=t3[t9(e,t++)])>>2,t<l)&&(i[n++]=(3&r)<<6|t3[t9(e,t++)]);return i})(e))):null,(e,r)=>n(e,r)])};if(!e){var n=+(null!=(n=r.json)?n:0);if(n&&!1!==r.prettify)return(null!=T?T:T=[t(null,{json:!1}),t(null,{json:!0,prettify:!0})])[n]}return t(e,r)},[nf,,]=(nc(),nc(null,{json:!0,prettify:!0})),C=r1(\"\"+tA.currentScript.src,\"#\"),rR=r1(\"\"+(C[1]||\"\"),\";\"),nm=C[0],ny=rR[1]||(null==(rz=rB(nm,!1))?void 0:rz.host),nb=e=>{return!(!ny||(null==(e=rB(e,!1))||null==(e=e.host)?void 0:e.endsWith(ny))!==et)},o=(...e)=>r2(rF(e),/(^(?=\\?))|(^\\.(?=\\/))/,nm.split(\"?\")[0]),nk=o(\"?\",\"var\"),nS=o(\"?\",\"mnt\"),nT=(o(\"?\",\"usr\"),Symbol()),nE=Symbol(),nI=(e,r,t=et,n=er)=>{r&&(t?console.groupCollapsed:console.group)((n?\"\":r_(\"tail.js: \",\"90;3\"))+r);t=null==e?void 0:e[nE];null!=(e=t?e[nT]:e)&&console.log(ek(e)?r_(nf(e),\"94\"):ex(e)?\"\"+e:e),t&&t.forEach(([e,r,t])=>nI(e,r,t,!0)),r&&console.groupEnd()},[nA,nx]=nc(),[nN,nO]=[tE,tE],[$,nj]=eo(),nM=(...e)=>{var r,l=e.shift();console.error(eg(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[nU,nF]=eo(),[nP,nq]=eo(),nR=e=>nD!==(nD=e)&&nF(nD=!1,nV(!0,!0)),nz=e=>nW!==(nW=!!e&&\"visible\"===document.visibilityState)&&nq(nW,!e,nB(!0,!0)),nD=(nU(nz),!0),nW=!1,nB=ry(!1),nV=ry(!1),nJ=(tV(window,[\"pagehide\",\"freeze\"],()=>nR(!1)),tV(window,[\"pageshow\",\"resume\"],()=>nR(!0)),tV(document,\"visibilitychange\",()=>(nz(!0),nW&&nR(!0))),nF(nD,nV(!0,!0)),!1),nL=ry(!1),[,nG]=eo(),nH=rw({callback:()=>nJ&&nG(nJ=!1,nL(!1)),frequency:2e4,once:!0,paused:!0}),C=()=>!nJ&&(nG(nJ=!0,nL(!0)),nH.restart()),nY=(tV(window,[\"focus\",\"scroll\"],C),tV(window,\"blur\",()=>nH.trigger()),tV(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],C),C(),()=>nL()),nZ=0,nQ=void 0,n0=()=>(null!=nQ?nQ:tE())+\"_\"+n1(),n1=()=>(rm(!0)-(parseInt(nQ.slice(0,-2),36)||0)).toString(36)+\"_\"+(++nZ).toString(36),n6={},n5={id:nQ,heartbeat:rm()},n3={knownTabs:{[nQ]:n5},variables:{}},[n8,n9]=eo(),[n7,le]=eo(),lr=tE,lt=e=>n6[tk(e)],ln=(...e)=>li(e.map(e=>(e.cache=[rm(),3e3],tw(e)))),ll=e=>eD(e,e=>e&&[e,n6[tk(e)]]),li=e=>{var r=eD(e,e=>e&&[tk(e),e]);null!=r&&r.length&&(e=ll(e),rl(n6,r),(r=e1(r,e=>e[1].scope>c.Tab)).length&&(rl(n3.variables,r),lr({type:\"patch\",payload:eQ(r)})),le(e,n6,!0))},[,lo]=($((e,r)=>{nU(t=>{var n;t?(t=r(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),nQ=null!=(n=null==t?void 0:t[0])?n:rm(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),n6=eQ(eV(e1(n6,([,e])=>e.scope===c.View),eD(null==t?void 0:t[1],e=>[tk(e),e])))):sessionStorage.setItem(\"_tail:state\",e([nQ,eD(n6,([,e])=>e.scope!==c.View?e:void 0)]))},!0),lr=(r,t)=>{e&&(localStorage.setItem(\"_tail:state\",e([nQ,r,t])),localStorage.removeItem(\"_tail:state\"))},tV(window,\"storage\",e=>{var i,a,o;\"_tail:state\"!==e.key||!(e=null==r?void 0:r(e.newValue))||e[2]&&e[2]!==nQ||([e,{type:i,payload:a}]=e,\"query\"===i?t.active||lr({type:\"set\",payload:n3},e):\"set\"===i&&t.active?(rl(n3,a),rl(n6,a.variables),t.trigger()):\"patch\"===i?(o=ll(eD(a,1)),rl(n3.variables,a),rl(n6,a),le(o,n6,!1)):\"tab\"===i&&(rl(n3.knownTabs,e,a),a)&&n9(\"tab\",a,!1))});var t=rw(()=>n9(\"ready\",n3,!0),-25),n=rw({callback(){var e=rm()-1e4;eX(null==n3?void 0:n3.knownTabs,([r,t])=>t[0]<e&&((e,r)=>{var t=[],n=!1,l=(e,i,a,o)=>{var u;e&&(u=r[i],i===r.length-1?ey(u)?(n=!0,u.forEach(r=>t.push(ro(e,r)))):t.push(ro(e,u)):(ey(u)?(n=!0,u.forEach(r=>l(rr(e,r),i+1,e,r))):l(rr(e,u),i+1,e,u),!e2(e)&&a&&rs(a,o)))};return l(e,0),n?t:t[0]})(n3.knownTabs,[r])),n5.heartbeat=rm(),lr({type:\"tab\",payload:n5})},frequency:5e3,paused:!0});nU(e=>(e=>{lr({type:\"tab\",payload:e?n5:void 0}),e?(t.restart(),lr({type:\"query\"})):t.toggle(!1),n.toggle(e)})(e),!0)},!0),eo()),[lu,ls]=eo(),lv=(({timeout:r=1e3,encrypt:t=!0,retries:n=10}={})=>{var l=()=>(t?nO:nx)(localStorage.getItem(\"_tail:rq\")),i=0,a=()=>localStorage.setItem(\"_tail:rq\",(t?nN:nA)([nQ,rm()+r]));return async(t,o,u=null!=o?1:n)=>{for(;u--;){var v=l();if((!v||v[1]<rm())&&(a(),(null==(v=l())?void 0:v[0])===nQ))return 0<r&&(i=setInterval(()=>a(),r/2)),Y(t,!0,()=>{clearInterval(i),localStorage.removeItem(\"_tail:rq\")});var d=new rT,[v]=tV(window,\"storage\",r=>{\"_tail:rq\"!==r.key||r.newValue||d.resolve()});e=[rI(null!=o?o:r),d],await Promise.race(e.map(e=>ex(e)?e():e)),v()}var e;null==o&&B(\"_tail:rq could not be acquired.\")}})(),ld=async(e,r,{beacon:t=!1,encrypt:n=!0}={})=>{var l,i,a=!1,o=t=>{var o=ex(r)?null==r?void 0:r(l,t):r;return!1!==o&&(lo(e,l=null!=o&&!0!==o?o:l,t,e=>(a=l===Q,l=e)),!a)&&(i=n?nN(l,!0):JSON.stringify(l))};if(!t)return lv(()=>(async r=>{var l,i;for(i of eR(1,r,void 0,void 0))if(null!=(i=await i)&&(l=i),e$){e$=!1;break}return l})(async r=>{var a;return o(r)?400<=(a=await fetch(e,{method:null!=l?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain\"},body:i})).status?0===r?e_(B(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${r+1}/3.`),await rI(200*(1+r))):(null!=(a=null!=(r=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&r.length?null==(a=n?nO:JSON.parse)?void 0:a(r):Q)&&ls(a),e_(a)):e_()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=l?[i]:[],{type:\"text/plain\"}))&&B(\"Beacon send failed.\")},rR=[\"scope\",\"key\",\"targetId\",\"version\"],lf=[...rR,\"created\",\"modified\",\"classification\",\"purposes\",\"tags\",\"readonly\",\"value\"],lp=[...rR,\"init\",\"purpose\",\"refresh\"],lh=[...lf,\"value\",\"force\",\"patch\"],lg=new Map,lm=(e,r)=>{var t=rw(async()=>{var e=eD(lg,([e,r])=>({...tS(e),result:[...r]}));e.length&&await v.get(...e)},3e3),n=(e,r)=>r&&eG(r,r=>rr(lg,e,()=>new Set).add(r)),o=(nU((e,r)=>t.toggle(e,e&&3e3<=r),!0),n7(e=>eX(e,([e,r])=>((e,r)=>{var t,l,i;e&&(l=tk(e),null==(i=rs(lg,l))||!i.size||(null==e?void 0:e.purposes)===(null==r?void 0:r.purposes)&&(null==e?void 0:e.classification)==(null==r?void 0:r.classification)&&V(null==e?void 0:e.value,null==r?void 0:r.value)||eX(i,i=>{t=!1,null!=i&&i(e,r,(e=!0)=>t=e),t&&n(l,i)}))})(e,r))),new Map),u=(e,r)=>rl(o,e,es(r)?r?void 0:0:r),v={get:(...t)=>ti(async()=>{t[0]&&!eg(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var v=[],c=eD(t,(e,r)=>[e,r]),f=[],a=null!=(a=null==(a=await ld(e,()=>!!(c=eD(c,([e,r])=>{if(e){var t,l=tk(e),i=(n(l,e.result),lt(l)),l=(e.init&&u(l,e.cache),e.purposes);if((null!=l?l:-1)&(null!=(t=null==i?void 0:i.purposes)?t:-1))if(!e.refresh&&(null==i?void 0:i[1])<rm())rp(v,[{...i,status:s.Success},r]);else{if(!tb(e))return[rd(e,lp),r];eE(e.init)&&null!=(t={...tw(e),status:s.Created,...e.init}).value&&(rp(f,d(t)),rp(v,[t,r]))}else rp(v,[{...e,status:s.Denied,error:\"No consent for \"+r8.logFormat(l)},r])}})).length&&{variables:{get:eD(c,0)},deviceSessionId:null==r?void 0:r.deviceSessionId}))||null==(a=a.variables)?void 0:a.get)?a:[];return rp(v,...eD(a,(e,r)=>e&&[e,c[r][1]])),f.length&&li(f),v.map(([e])=>e)},eD(t,e=>null==e?void 0:e.error)),set:(...t)=>ti(async()=>{t[0]&&!eg(t[0])||(a=t[0],t=t.slice(1)),null!=r&&r.validateKey(a);var o=[],v=[],c=eD(t,(e,r)=>{var a,n;if(e)return n=tk(e),a=lt(n),u(n,e.cache),tb(e)?null!=e.patch?B(\"Local patching is not supported.\"):(n={value:e.value,classification:l.Anonymous,purposes:i.Necessary,scope:tg(e.scope),key:e.key},v[r]={status:a?s.Success:s.Created,source:e,current:n},void rp(o,d(n))):(null==e.patch&&void 0===(null==e?void 0:e.version)&&(e.version=null==a?void 0:a.version,null==e.force)&&(e.force=!!e.version),[rd(e,lh),r])}),a=c.length?L(null==(a=(await ld(e,{variables:{set:c.map(e=>e[0])},deviceSessionId:null==r?void 0:r.deviceSessionId})).variables)?void 0:a.set,\"No result.\"):[];return o.length&&li(o),eX(a,(e,r)=>{var t,[r,l]=c[r];null!=(t=(e.source=r).result)&&t.call(r,e),v[l]=e}),v},eD(t,e=>null==e?void 0:e.error))},d=(e,r=rm())=>{return{...rd(e,lf),cache:[r,r+(null!=(r=rs(o,tk(e)))?r:3e3)]}};return lu(({variables:e})=>{var r;e&&(r=rm(),null!=(e=eV(eD(e.get,e=>to(e)),eD(e.set,e=>to(e)))))&&e.length&&li(eG(e,d,r))}),v},lb=Symbol(),lw=[.75,.33],lk=[.25,.33],lE=()=>{var l,a,i,t=null==tI?void 0:tI.screen;return t?({width:t,height:l,orientation:i}=t,a=t<l,-90!==(i=null!=(i=null!=(i=null==i?void 0:i.angle)?i:tI.orientation)?i:0)&&90!==i||([t,l]=[l,t]),{deviceType:t<480?\"mobile\":t<=1024?\"tablet\":\"desktop\",screen:{dpr:tI.devicePixelRatio,width:t,height:l,landscape:a}}):{}},lI=e=>e(Z({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==A?void 0:A.clientId,languages:eD(navigator.languages,(e,r,t=e.split(\"-\"))=>Z({id:e,language:t[0],region:t[1],primary:0===r,preference:r+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...lE()})),lA=(e,r=\"A\"===tP(e)&&t$(e,\"href\"))=>r&&\"#\"!=r&&!r.startsWith(\"javascript:\"),lx=(e,r=tP(e),t=t4(e,\"button\"))=>t!==er&&(J(r,\"A\",\"BUTTON\")||\"INPUT\"===r&&J(tM(e,\"type\"),\"button\",\"submit\")||t===et),lN=(e,r=!1)=>{var t;return{tagName:e.tagName,text:rU((null==(t=t$(e,\"title\"))?void 0:t.trim())||(null==(t=t$(e,\"alt\"))?void 0:t.trim())||(null==(t=e.innerText)?void 0:t.trim()),100),href:null==(t=e.href)?void 0:t.toString(),rect:r?tB(e):void 0}},lC=e=>{if(I)return I;eg(e)&&([t,e]=nx(e),e=nc(t)[1](e)),rl(t5,e),(e=>{nO===tE&&([nN,nO]=nc(e),nj(nN,nO))})(rs(t5,\"encryptionKey\"));var t,a,o,u,s,v,d,c,f,p,h,g,l=rs(t5,\"key\"),i=null!=(e=null==(t=tI[t5.name])?void 0:t._)?e:[];if(ey(i))return a=[],o=[],u=(e,...r)=>{var t=et;o=e1(o,n=>K(()=>{var l;return null!=(l=n[e])&&l.call(n,...r,{tracker:I,unsubscribe:()=>t=er}),t},(e=>r=>nM(e,r))(n)))},s=[],d=lm(nk,v={applyEventExtensions(e){null==e.clientId&&(e.clientId=n0()),null==e.timestamp&&(e.timestamp=rm()),h=et;var n=er;return eD(a,([,r])=>{var t;!n&&(null==(t=r.decorate)?void 0:t.call(r,e))!==er||(n=et)}),n?void 0:e},validateKey:(e,r=!0)=>!l&&!e||e===l||!!r&&B(`'${e}' is not a valid key.`)}),c=((e,r)=>{var n=[],l=new WeakMap,i=new Map,a=(e,r)=>{var t;return null!=(t=e.metadata)&&t.queued?rt(r,{type:e.type+\"_patch\",patchTargetId:e.clientId}):B(\"Source event not queued.\")},o=async(t,n=!0,l)=>{var i;return t[0]&&!eg(t[0])||(i=t[0],t=t.slice(1)),nI({[nE]:eD(t=t.map(e=>(null!=r&&r.validateKey(null!=i?i:e.key),rt(e,{metadata:{posted:!0}}),rt(r7(rf(e),!0),{timestamp:e.timestamp-rm()}))),e=>[e,e.type,er])},\"Posting \"+rC([rj(\"new event\",[e2(t,e=>!te(e))||void 0]),rj(\"event patch\",[e2(t,e=>te(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),ld(e,{events:t,variables:l,deviceSessionId:null==r?void 0:r.deviceSessionId},{beacon:n})},u=async(e,{flush:t=!1,async:l=!0,variables:i}={})=>{if((e=eD(ew(e),e=>rt(r.applyEventExtensions(e),{metadata:{queued:!0}}))).length&&eX(e,e=>nI(e,e.type)),!l)return o(e,!1,i);t?(n.length&&rh(e,...n.splice(0)),e.length&&await o(e,!0,i)):e.length&&rp(n,...e)};return rw(()=>u([],{flush:!0}),5e3),nP((e,r,t)=>{!e&&(n.length||r||1500<t)&&(e=eD(i,([e,r])=>{var[r,n]=r();return n&&(i.delete(e),l.delete(e)),r}),n.length||e.length)&&u(eV(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,r,t)=>u(a(e,r),{flush:!0}),registerEventPatchSource(e,r,t=!1,n){var o=!1,s=()=>{o=!0};return l.set(e,rf(e)),i.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var i=l.get(e),[t,v]=null!=(t=rg(r(i,s),i))?t:[];if(t&&!V(v,i))return l.set(e,rf(v)),[a(e,t),o]}return[void 0,o]}),t&&u(e),s}}})(nk,v),f=null,p=0,g=h=er,I=(...e)=>{if(e.length){1<e.length&&(!e[0]||eg(e[0]))&&(r=e[0],e=e.slice(1)),eg(e[0])&&(e=(t=e[0]).match(/^[{[]/)?JSON.parse(t):nx(t));var r,n=er;if((e=e1(eB(e,e=>eg(e)?nx(e):e),e=>{if(!e)return er;if(l3(e))t5.tags=rl({},t5.tags,e.tagAttributes);else{if(l8(e))return t5.disabled=e.disable,er;if(ie(e))return n=et,er;if(io(e))return e(I),er}return g||it(e)||l7(e)?et:(s.push(e),er)})).length||n){var t=e7(e,e=>l7(e)?-100:it(e)?-50:ia(e)?-10:td(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...t)){for(p=0,f=t;p<f.length;p++){var i=f[p];i&&(v.validateKey(null!=r?r:i.key),K(()=>{var e=f[p];if(u(\"command\",e),h=er,td(e))c.post(e);else if(ir(e))d.get(...ew(e.get));else if(ia(e))d.set(...ew(e.set));else if(it(e))rp(o,e.listener);else if(l7(e))(r=K(()=>e.extension.setup(I),r=>nM(e.extension.id,r)))&&(rp(a,[null!=(t=e.priority)?t:100,r,e.extension]),e7(a,([e])=>e));else if(io(e))e(I);else{var t,n,r,i=er;for([,r]of a)if(i=null!=(n=null==(n=r.processCommand)?void 0:n.call(r,e))?n:er)break;i||nM(\"invalid-command\",e,\"Loaded extensions:\",a.map(e=>e[2].id))}},e=>nM(I,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}},Object.defineProperty(tI,t5.name,{value:Object.freeze(Object.assign(I,{id:\"tracker_\"+n0(),events:c,variables:d,__isTracker:et})),configurable:!1,writable:!1}),n7((e,r,t)=>{var n=eV(null==(n=tl(eD(e,1)))?void 0:n.map(e=>[e,`${e.key} (${ty(e.scope)}, ${e.scope<0?\"client-side memory only\":r8.format(e.purposes)})`,er]),[[{[nE]:null==(n=tl(eD(r,1)))?void 0:n.map(e=>[e,`${e.key} (${ty(e.scope)}, ${e.scope<0?\"client-side memory only\":r8.format(e.purposes)})`,er])},\"All variables\",et]]);nI({[nE]:n},r_(`Variables changed${t?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${e2(r)} in total).`,\"2;3\"))}),n8(async(e,r,t,n)=>{\"ready\"===e&&(e=(e=>ts(e,Q,!0))((await d.get({scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:ee}))[0]).value,v.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(lI(I),e.hasUserAgent=!0),g=!0,s.length&&I(s),n(),I(...eD(l2,e=>({extension:e})),...i,{set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),I;B(`The global variable for the tracker \"${t5.name}\" is used for something else than an array of queued commands.`)},lj=()=>null==A?void 0:A.clientId,l$={scope:\"shared\",key:\"referrer\"},l_=(e,r)=>{I.variables.set({...l$,value:[lj(),e]}),r&&I.variables.get({scope:l$.scope,key:l$.key,result(t,n,l){return null!=t&&t.value?l():(null==n||null==(t=n.value)?void 0:t[1])===e&&r()}})},lM=ry(),lU=ry(),lF=1,[lq,lR]=eo(),lz=e=>{var r=ry(e,lM),t=ry(e,lU),n=ry(e,nY),l=ry(e,()=>lF);return(e,i)=>({totalTime:r(e,i),visibleTime:t(e,i),activeTime:n(e,i),activations:l(e,i)})},lD=lz(),[lB,lV]=eo(),lJ=(e,r)=>(r&&eX(lK,r=>e(r,()=>!1)),lB(e)),lL=new WeakSet,lK=document.getElementsByTagName(\"iframe\");function lH(e){if(e){if(null!=e.units&&J(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lY=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lZ=e=>t6(e,r=>r!==e&&!!lY(rr(tK,r)),e=>(rr(tK,e),(N=rr(tK,e))&&eB(eV(N.component,N.content,N),\"tags\"))),lQ=(e,r)=>r?e:{...e,rect:void 0,content:(O=e.content)&&eD(O,e=>({...e,rect:void 0}))},l0=(e,r=er,t)=>{var n,l,i,a=[],o=[],u=0;return tC(e,e=>{var s,i,l=rr(tK,e);l&&(lY(l)&&(i=e1(ew(l.component),e=>{var t;return 0===u||!r&&(1===u&&(null==(t=e.track)?void 0:t.secondary)!==et||(null==(t=e.track)?void 0:t.promote))}),n=(null!=t?t:e9(i,e=>{return null==(e=e.track)?void 0:e.region}))&&tB(e)||void 0,s=lZ(e),l.content&&rh(a,...eD(l.content,e=>({...e,rect:n,...s}))),null!=i)&&i.length&&(rh(o,...eD(i,e=>{var r;return u=e4(u,null!=(r=e.track)&&r.secondary?1:2),lQ({...e,content:a,rect:n,...s},!!n)})),a=[]),i=l.area||t2(e,\"area\"))&&rh(o,...eD(ew(i)))}),a.length&&rp(o,lQ({id:\"\",rect:n,content:a})),eX(o,e=>{eg(e)?rp(null!=l?l:l=[],e):(null==e.area&&(e.area=rF(l,\"/\")),rh(null!=i?i:i=[],e))}),i||l?{components:i,area:rF(l,\"/\")}:void 0},l1=Symbol(),P={necessary:1,preferences:2,statistics:4,marketing:8},l2=(window.tail({consent:{externalSource:{key:\"Cookiebot\",poll(){var t,e=null==(e=tA.cookie.match(/CookieConsent=([^;]*)/))?void 0:e[1];if(e)return t=1,null!=e&&e.replace(/([a-z]+):(true|false)/g,(e,r,n)=>{return\"true\"===n&&(t|=null!=(n=P[r])?n:0),\"\"}),{level:1<t?1:0,purposes:t}}}}}),[{id:\"context\",setup(e){rw(()=>eX(lK,e=>ra(lL,e)&&lV(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(r,t,l){return null==A||null==r||!r.value||null!=A&&A.definition?n=null==r?void 0:r.value:(A.definition=r.value,null!=(r=A.metadata)&&r.posted&&e.events.postPatch(A,{definition:n})),l()}});var n,r,v=null!=(r=null==(r=lt({scope:\"tab\",key:\"viewIndex\"}))?void 0:r.value)?r:0,d=null==(r=lt({scope:\"tab\",key:\"tabIndex\"}))?void 0:r.value,c=(null==d&&ln({scope:\"tab\",key:\"tabIndex\",value:d=null!=(r=null!=(r=null==(r=lt({scope:\"shared\",key:\"tabIndex\"}))?void 0:r.value)?r:null==(r=lt({scope:\"session\",key:\"@info\"}))||null==(r=r.value)?void 0:r.tabs)?r:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(r=er)=>{var i,a,o,l,p;tz(\"\"+c,c=location.href)&&!r||({source:r,scheme:l,host:i}=rB(location.href+\"\",!0),A={type:\"view\",timestamp:rm(),clientId:n0(),tab:nQ,href:r,path:location.pathname,hash:location.hash||void 0,domain:{scheme:l,host:i},tabNumber:d+1,tabViewNumber:v+1,viewport:tL(),duration:lD(void 0,!0)},0===d&&(A.firstTab=et),0===d&&0===v&&(A.landingPage=et),ln({scope:\"tab\",key:\"viewIndex\",value:++v}),a=rV(location.href),eD([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,r)=>{var n;return(null!=(n=(o=A).utm)?n:o.utm={})[e]=null==(n=ew(a[\"utm_\"+e]))?void 0:n[0]}),!(A.navigationType=x)&&performance&&eD(performance.getEntriesByType(\"navigation\"),e=>{A.redirects=e.redirectCount,A.navigationType=r2(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(r=A.navigationType)?r:A.navigationType=\"navigate\")&&(p=null==(l=lt(l$))?void 0:l.value)&&nb(document.referrer)&&(A.view=null==p?void 0:p[0],A.relatedEventId=null==p?void 0:p[1],e.variables.set({...l$,value:void 0})),(p=document.referrer||null)&&!nb(p)&&(A.externalReferrer={href:p,domain:(()=>{var{host:r,scheme:t,port:n}=rB(p,!1);return{host:r+(n?\":\"+n:\"\"),scheme:t}})()}),A.definition=n,n=void 0,e.events.post(A),e.events.registerEventPatchSource(A,()=>({duration:lD()})),lR(A))};return nP(e=>{e?(lU(et),++lF):lU(er)}),tV(window,\"popstate\",()=>(x=\"back-forward\",f())),eD([\"push\",\"replace\"],e=>{var r=history[e+=\"State\"];history[e]=(...e)=>{r.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:r=>l5(r)&&(e(r.username?{type:\"login\",username:r.username}:{type:\"logout\"}),et),decorate(e){!A||tc(e)||te(e)||(e.view=A.clientId)}}}},{id:\"components\",setup(e){var r=(e=>{var r=new IntersectionObserver(e=>eX(e,e=>{var r,t;return null==(r=(t=e.target)[lb])?void 0:r.call(t,e)})),t=new Set,n=(rw({callback:()=>eX(t,e=>e()),frequency:250,raf:!0}),(e,r,t=0)=>e<t?t:r<e?r:e),l=tA.createRange();return(i,a)=>{var o,u,s,v,d,c,f,p,h,g,m,y,b,w,k,S;a&&(o=e1(null==a?void 0:a.component,e=>{var r;return(null==(r=e.track)?void 0:r.impressions)||(null!=(r=null==(r=e.track)?void 0:r.secondary)?r:e.inferred)!==et}))&&e2(o)&&(p=f=er,g=h=0,m=(e,r,t,n)=>{var l,i=null!=(i=(l=null!=u?u:u=[])[e])?i:l[e]=[{duration:0,impressions:0},ry(!1,nY),!1,!1,0,0,0,r4()];i[4]=r,i[5]=t,i[6]=n},y=[r4(),r4()],b=lz(!1),w=ry(!1,nY),k=-1,S=()=>{var O,r=i.getBoundingClientRect(),t=window.innerWidth,a=window.innerHeight,S=[n(r.top,a),n(r.right,t),n(r.bottom,a),n(r.left,t)],T=S[2]-S[0],S=S[1]-S[3],I=T/r.height||0,A=S/r.width||0,x=f?lk:lw,I=(x[0]*a<T||x[0]<I)&&(x[0]*t<S||x[0]<A);if(p!==I&&w(p=I,!0),f!==(f=p&&w()>=t5.impressionThreshold-250)&&(++h,b(f),s||e(s=e1(eD(o,e=>{return((null==(e=e.track)?void 0:e.impressions)||t4(i,\"impressions\",et,e=>{return null==(e=e.track)?void 0:e.impressions}))&&Z({type:\"impression\",pos:tD(i),viewport:tL(),timeOffset:lD(),impressions:h,...l0(i,et)})||null}))),null!=s)&&s.length&&(O=b(),v=eD(s,r=>e.events.registerEventPatchSource(r,()=>({relatedEventId:r.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),r.height!==k){k=r.height;t=i.textContent;if({boundaries:d,...c}=(e=>{for(var t,n,l=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),i=0,a=0,o=0,u=0,s=!1;t=l.exec(e);)t[1]?(s&&++u,s=!1):(s=!0,i+=t[0].length,6<t[0].length&&++o,++a);s&&++u;var l=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*i|0),d=[],f=0,p=!1;do{if(null!=(t=l.exec(e))&&t[1])p&&++f;else{for(var c=null==t?void 0:t.index,h=!1,g=0;g<v.length;g++)v[g]--||(d[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ej(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(t);return{text:e,length:e.length,characters:i,words:a,sentences:u,lix:ej(a/u+100*o/a),readTime:ej(a/238*6e4),boundaries:d}})(null!=t?t:\"\"),u||r.height>=1.25*a){var j=tA.createTreeWalker(i,NodeFilter.SHOW_TEXT),$=0,_=0;for(null==u&&(u=[]);_<d.length&&(M=j.nextNode());){var M,U,F,z,D,q=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for($+=q;$>=(null==(F=d[_])?void 0:F.offset);)l[_%2?\"setEnd\":\"setStart\"](M,d[_].offset-$+q),_++%2&&({top:F,bottom:z}=l.getBoundingClientRect(),D=r.top,_<3?m(0,F-D,z-D,d[1].readTime):(m(1,u[0][4],F-D,d[2].readTime),m(2,F-D,z-D,d[3].readTime)))}}}x=r.left<0?-r.left:0,A=r.top<0?-r.top:0,I=r.width*r.height;f&&(g=y[0].push(A,A+T)*y[1].push(x,x+S)/I),u&&eX(u,e=>{var t=n(r.top<0?-r.top:0,e[5],e[4]),l=n(r.bottom>a?a:r.bottom,e[5],e[4]),i=f&&0<l-t,o=e[0];o.duration=e[1](i),i&&(e[3]!==(e[3]=i)&&++e[0].impressions,o.seen=e[7].push(t,l)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},i[lb]=({isIntersecting:e})=>{rl(t,S,e),e||(eX(v,e=>e()),S())},r.observe(i))}})(e),n=({boundary:e,...n})=>{ri(tK,e,e=>{var r;return(e=>null==e?void 0:{...e,component:ew(e.component),content:ew(e.content),tags:ew(e.tags)})(\"add\"in n?{...e,component:eV(null==e?void 0:e.component,n.component),content:eV(null==e?void 0:e.content,n.content),area:null!=(r=null==n?void 0:n.area)?r:null==e?void 0:e.area,tags:eV(null==e?void 0:e.tags,n.tags),cart:null!=(r=n.cart)?r:null==e?void 0:e.cart,track:null!=(r=n.track)?r:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),r(e,rr(tK,e))};return{decorate(e){eX(e.components,e=>rs(e,\"track\"))},processCommand:e=>l9(e)?(n(e),et):ii(e)?(eD(((e,r)=>{var t,n;return r?(t=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(l=>{if(!rr(n,l))for(var i=[];null!=t$(l,e);){ra(n,l);var a,o=r1(t$(l,e),\"|\");t$(l,e,null);for(var u=0;u<o.length;u++){var v=o[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=em(v))?s:\"\",36);if(s<0)i.length+=s;else{if(0===u&&(i.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<o.length;u++)try{v=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&r[s]&&(v=r[s]),rp(i,v)}}}rp(t,...eD(i,e=>({add:et,...e,boundary:l})));var f=l.nextElementSibling;\"WBR\"===l.tagName&&null!=(a=l.parentNode)&&a.removeChild(l),l=f}}),t):[]})(e.scan.attribute,e.scan.components),n),et):er}}},{id:\"navigation\",setup(e){var r=new WeakMap,t=t=>{tV(t,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var l,i,a,o,u,s=er;if(tC(n.target,e=>{lx(e)&&null==a&&(a=e),s=s||\"NAV\"===tP(e);var r,v=tG(e),v=null==v?void 0:v.component;!n.button&&null!=v&&v.length&&!u&&(eX(e.querySelectorAll(\"a,button\"),r=>lx(r)&&(3<(null!=u?u:u=[]).length?e_():u.push({...lN(r,!0),component:tC(r,(e,r,t,n=null==(l=tG(e))?void 0:l.component)=>n&&r(n[0]),r=>r===e)}))),u)&&null==o&&(o=e),null==l&&(l=null!=(r=t4(e,\"clicks\",et,e=>{return null==(e=e.track)?void 0:e.clicks}))?r:v&&e9(v,e=>{return(null==(e=e.track)?void 0:e.clicks)!==er})),null==i&&(i=null!=(r=t4(e,\"region\",et,e=>{return null==(e=e.track)?void 0:e.region}))?r:v&&e9(v,e=>{return null==(e=e.track)?void 0:e.region}))}),null!=o?o:o=a){var v,d=u&&!a&&l,c=l0(o,!1,d),f=t6(o,void 0,e=>{return eD(ew(null==(e=rr(tK,e))?void 0:e.tags))}),p=(null==l&&(l=!s),{...(i=null==i?et:i)?{pos:tD(a,n),viewport:tL()}:null,...((e,r)=>{var n;return tC(null!=e?e:r,e=>\"IMG\"===tP(e)||e===r?(n={element:lN(e,!1)},er):et),n})(n.target,o),...c,timeOffset:lD(),...f});if(a)if(lA(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=rB(h.href,!1);if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(Z({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=Z({clientId:n0(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:et,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||t$(h,\"target\")!==window.name?(l_(w.clientId),w.self=er,e(w)):tz(location.href,h.href)||(w.exit=w.external,l_(w.clientId))):(k=h.href,(b=nb(k))?l_(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||t5.captureContextMenu&&(h.href=nS+\"=\"+T+encodeURIComponent(k),tV(window,\"storage\",(r,t)=>{return\"_tail:push\"===r.key&&(r.newValue&&(null==(r=JSON.parse(r.newValue))?void 0:r.requestId)===T&&e(w),t())}),tV(t,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,r)=>{r(),h.href=k}))))}else{tC(n.target,(e,r)=>{var t;return!!(null!=v?v:v=(e=>eg(e=null==e||e!==et&&\"\"!==e?e:\"add\")&&J(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ek(e)?e:void 0)(null!=(t=null==(t=tG(e))?void 0:t.cart)?t:t2(e,\"cart\")))&&!v.item&&(v.item=(e=>null==e?Q:ey(e)||eg(e)?e[e.length-1]:eH(e,(e,t)=>e,void 0,void 0))(null==(t=tG(e))?void 0:t.content))&&r(v)});c=lH(v);(c||l)&&e(Z(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else d&&ri(r,o,t=>{var l=tW(o,n);return t?rp(t,l):(l=Z({type:\"component_click_intent\",...p,clicks:t=[l],clickables:u}),e.events.registerEventPatchSource(l,()=>({clicks:rr(r,o)}),!0,o)),t})}})};t(document),lJ(e=>e.contentDocument&&t(e.contentDocument))}},{id:\"scroll\",setup(e){var r={},t=tR(et);lq(()=>{return e=()=>(r={},t=tR(et)),setTimeout(e,250);var e}),tV(window,\"scroll\",()=>{var i,n=tR(),l={x:(f=tR(er)).x/(tx.offsetWidth-window.innerWidth)||0,y:f.y/(tx.offsetHeight-window.innerHeight)||0};n.y>=t.y&&(i=[],!r.fold&&n.y>=t.y+200&&(r.fold=et,rp(i,\"fold\")),!r[\"page-middle\"]&&.5<=l.y&&(r[\"page-middle\"]=et,rp(i,\"page-middle\")),!r[\"page-end\"]&&.99<=l.y&&(r[\"page-end\"]=et,rp(i,\"page-end\")),(n=eD(i,e=>Z({type:\"scroll\",scrollType:e,offset:l}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(r){var t;return l6(r)?(\"clear\"===(t=r.cart)?e({type:\"cart_updated\",action:\"clear\"}):(t=lH(t))&&e({...t,type:\"cart_updated\"}),et):il(r)?(e({type:\"order\",...r.order}),et):er}})},{id:\"forms\",setup(e){var r,t=new Map,n=(e,r=!1)=>{var t=!r||t_(e,tH(\"form-value\")),e=(r&&(t=t?ev(t):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(e=e&&rU(e,200)),t?e:void 0},l=r=>{var l,a,s,i=r.form;if(i)return a=t_(i,tH(\"ref\"))||\"track_ref\",s=rr(t,i,()=>{var r,t=new Map,n={type:\"form\",name:t_(i,tH(\"form-name\"))||t$(i,\"name\")||i.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:lD()})),((e=0)=>{var r,t,n=(l,i=e)=>{if(void 0===l)return!!t;clearTimeout(r),es(l)?l&&(i<0?e=>e!==er:e=>e===et)(null==t?void 0:t())?n(t):t=void 0:(t=l,r=setTimeout(()=>n(!0,i),i<0?-i:i))};return n})());return tV(i,\"submit\",()=>{l=l0(i),r[3]=3,s(()=>{(i.isConnected&&0<tB(i).width?(r[3]=2,s):()=>{o(),2<=r[3]&&(n.completed=3===r[3]||!(i.isConnected&&tB(i).width)),e.events.postPatch(n,{...l,totalTime:rm(et)-r[4]}),r[3]=1})()},750)}),r=[n,t,i,0,rm(et),1]}),rr(s[1],r)||eD(i.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,r)=>{var v,d,i;e.name&&\"hidden\"!==e.type?(d=e.name,i=null!=(v=(i=s[0].fields)[d])?v:i[d]={id:e.id||d,name:d,label:r2(null!=(d=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?d:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(v=e.type)?v:\"unknown\",[l1]:n(e),value:n(e,!0)},s[0].fields[i.name]=i,s[1].set(e,i)):\"hidden\"!==e.type||e.name!==a&&!t4(e,\"ref\")||(e.value||(e.value=r2(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[r,s]},i=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],a=null,o=()=>{var t,l,i,o,v,d,c;a&&([t,l,i,o]=a,v=-(u-(u=lU())),d=-(s-(s=rm(et))),c=l[l1],(l[l1]=n(i))!==c&&(null==l.fillOrder&&(l.fillOrder=o[5]++),l.filled&&(l.corrections=(null!=(c=l.corrections)?c:0)+1),l.filled=et,o[3]=2,eX(t.fields,([e,r])=>r.lastField=e===l.name)),l.value=n(i,!0),l.activeTime+=v,l.totalTime+=d,t.activeTime+=v,t.totalTime+=d,a=null)},u=0,s=0,v=e=>e&&tV(e,[\"focusin\",\"focusout\",\"change\"],(e,r,t=e.target&&i(e.target))=>t&&(a=t,\"focusin\"===e.type?(s=rm(et),u=lU()):o()));v(document),lJ(e=>e.contentDocument&&v(e.contentDocument),!0)}},{id:\"consent\",setup(e){var r=async r=>e.variables.get({scope:\"session\",key:\"@consent\",result:r}).value,t=async t=>{var n;if(t)return!(n=await r())||r5(n,t=r3(t))?[!1,n]:(n={level:r6.lookup(t.classification),purposes:r8.lookup(t.purposes)},await e.events.post(Z({type:\"consent\",consent:n}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,n])},n={};return{processCommand(e){var i,a,l,s,v;return iu(e)?((l=e.consent.get)&&r(l),(i=r3(e.consent.set))&&(async()=>{var e;return(null!=(e=i.callback)?e:()=>{})(...await t(i))})(),(a=e.consent.externalSource)&&(v=a.key,(null!=(l=n[v])?l:n[v]=rw({frequency:null!=(e=a.pollFrequency)?e:1e3})).restart(a.pollFrequency,async()=>{var e,n,l;tA.hasFocus()&&(e=a.poll())&&(e=r3({...s,...e}))&&!r5(s,e)&&([n,l]=await t(e),n&&nI(l,\"Consent was updated from \"+v),s=e)}).trigger()),et):er}}}}]),rz=(...e)=>r=>r===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==r?void 0:r[e])),l6=rz(\"cart\"),l5=rz(\"username\"),l3=rz(\"tagAttributes\"),l8=rz(\"disable\"),l9=rz(\"boundary\"),l7=rz(\"extension\"),ie=rz(et,\"flush\"),ir=rz(\"get\"),it=rz(\"listener\"),il=rz(\"order\"),ii=rz(\"scan\"),ia=rz(\"set\"),io=e=>\"function\"==typeof e,iu=rz(\"consent\");Object.defineProperty(tI,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(lC)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
    ]) : clientConfig)})),true);s.src=${JSON.stringify(config.src + (config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY$1)};d.head.appendChild(s)})();`;
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
                    this._script = scripts.debug;
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
        const headers = Object.fromEntries(Object.entries(sourceHeaders).filter(([, v])=>!!v).map(([k, v])=>[
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
            if (requestPath === this._endpoint) {
                requestPath = requestPath.substring(this._endpoint.length);
                let queryValue;
                switch(method.toUpperCase()){
                    case "GET":
                        {
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[INIT_SCRIPT_QUERY$1])) != null) {
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
            trackerScript.push(`window.${trackerRef}??=c=>(${trackerRef}._??=[]).push(c);`);
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
                return html ? `<script src='${script.src}?${INIT_SCRIPT_QUERY$1}&${BUILD_REVISION_QUERY$1}'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
        _define_property$b(this, "_endpoint", void 0);
        _define_property$b(this, "_extensionFactories", void 0);
        _define_property$b(this, "_lock", createLock());
        _define_property$b(this, "_schema", void 0);
        _define_property$b(this, "_trackerName", void 0);
        _define_property$b(this, "_extensions", void 0);
        _define_property$b(this, "_initialized", false);
        _define_property$b(this, "_script", void 0);
        /** @internal */ _define_property$b(this, "_cookieNames", void 0);
        _define_property$b(this, "environment", void 0);
        _define_property$b(this, "_clientConfig", void 0);
        /** @internal */ _define_property$b(this, "_clientIdGenerator", void 0);
        _define_property$b(this, "_config", void 0);
        _define_property$b(this, "_defaultConsent", void 0);
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
            src: this._endpoint
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
    defaultActivationTracking: "auto",
    tags: {
        default: [
            "data-id",
            "data-name"
        ]
    }
};
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
const INIT_SCRIPT_QUERY = "init";
const BUILD_REVISION_QUERY = "rev=" + "lzpmskq5";
var _tail, _globalThis, _initialName;
const externalConfig = trackerConfig;
const initialName = trackerConfig.name;
var _;
let tail = (_ = (_globalThis = globalThis)[_initialName = initialName]) !== null && _ !== void 0 ? _ : _globalThis[_initialName] = (c)=>{
    var __;
    return ((__ = (_tail = tail)._) !== null && __ !== void 0 ? __ : _tail._ = []).push(c);
};
let initialized = false;
tail((tracker)=>tail = tracker);
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
        src.push("?", INIT_SCRIPT_QUERY, "&", BUILD_REVISION_QUERY);
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

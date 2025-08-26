'use strict';

var types = require('@tailjs/types');
var transport = require('@tailjs/transport');

const TRACKER_CONFIG_PLACEHOLDER = "{{CONFIG}}";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_TYPES_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "meso6jn2" ;
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";
const PLACEHOLDER_SCRIPT = (trackerName = "tail", quote)=>{
    var _globalThis, _trackerName;
    if (quote) {
        const reference = `window[${JSON.stringify(trackerName)}]`;
        return `(${reference}??=(...c)=>${reference}._?.push([c]) ?? ${reference}(...c))._=[];`;
    }
    var _;
    return ((_ = (_globalThis = globalThis)[_trackerName = trackerName]) !== null && _ !== void 0 ? _ : _globalThis[_trackerName] = (...c)=>{
        var _globalThis_trackerName__;
        var _globalThis_trackerName___push;
        return (_globalThis_trackerName___push = (_globalThis_trackerName__ = globalThis[trackerName]._) === null || _globalThis_trackerName__ === void 0 ? void 0 : _globalThis_trackerName__.push(c)) !== null && _globalThis_trackerName___push !== void 0 ? _globalThis_trackerName___push : globalThis[trackerName](...c);
    })._ = [];
};

const getRootPrototype = (value)=>{
    let proto = value;
    while(proto){
        proto = Object.getPrototypeOf(value = proto);
    }
    return value;
};
const findPrototypeFrame = (frameWindow, matchPrototype)=>{
    if (!frameWindow || getRootPrototype(frameWindow) === matchPrototype) {
        return frameWindow;
    }
    for (const frame of frameWindow.document.getElementsByTagName("iframe")){
        try {
            if (frameWindow = findPrototypeFrame(frame.contentWindow, matchPrototype)) {
                return frameWindow;
            }
        } catch (e) {
        // Cross domain issue.
        }
    }
};
/**
 * When in iframes, we need to copy the prototype methods from the global scope's prototypes since,
 * e.g., `Object` in an iframe is different from `Object` in the top frame.
 */ const findDeclaringScope = (target)=>target == null ? target : typeof window !== "undefined" ? findPrototypeFrame(window, getRootPrototype(target)) : globalThis;
let stopInvoked = false;
const skip = Symbol();
const stop = (value)=>(stopInvoked = true, value);
// #region region_iterator_implementations
const forEachSymbol = Symbol();
const asyncIteratorFactorySymbol = Symbol();
const symbolIterator$1 = Symbol.iterator;
// Prototype extensions are assigned on-demand to exclude them when tree-shaking code that are not using any of the iterators.
const ensureForEachImplementations = (target, error, retry)=>{
    if (target == null || (target === null || target === void 0 ? void 0 : target[forEachSymbol])) {
        throw error;
    }
    let scope = findDeclaringScope(target);
    if (!scope) {
        throw error;
    }
    const forEachIterable = ()=>(target, projection, mapped, seed, context)=>{
            let projected, i = 0;
            for (const item of target){
                if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip) {
                    if (projected === stop) {
                        break;
                    }
                    seed = projected;
                    if (mapped) mapped.push(projected);
                    if (stopInvoked) {
                        stopInvoked = false;
                        break;
                    }
                }
            }
            return mapped || seed;
        };
    scope.Array.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        let projected, item;
        for(let i = 0, n = target.length; i < n; i++){
            item = target[i];
            if ((projected = projection ? projection(item, i, seed, context) : item) !== skip) {
                if (projected === stop) {
                    break;
                }
                seed = projected;
                if (mapped) {
                    mapped.push(projected);
                }
                if (stopInvoked) {
                    stopInvoked = false;
                    break;
                }
            }
        }
        return mapped || seed;
    };
    const genericForEachIterable = forEachIterable();
    scope.Object.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        if (target[symbolIterator$1]) {
            if (target.constructor === Object) {
                return genericForEachIterable(target, projection, mapped, seed, context);
            }
            return (Object.getPrototypeOf(target)[forEachSymbol] = forEachIterable())(target, projection, mapped, seed, context);
        }
        let projected, item, i = 0;
        for(const key in target){
            item = [
                key,
                target[key]
            ];
            if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip) {
                if (projected === stop) {
                    break;
                }
                seed = projected;
                if (mapped) mapped.push(projected);
                if (stopInvoked) {
                    stopInvoked = false;
                    break;
                }
            }
        }
        return mapped || seed;
    };
    scope.Object.prototype[asyncIteratorFactorySymbol] = function() {
        if (this[symbolIterator$1] || this[symbolAsyncIterator]) {
            if (this.constructor === Object) {
                var _this_symbolAsyncIterator;
                return (_this_symbolAsyncIterator = this[symbolAsyncIterator]()) !== null && _this_symbolAsyncIterator !== void 0 ? _this_symbolAsyncIterator : this[symbolIterator$1]();
            }
            const proto = Object.getPrototypeOf(this);
            var _proto_symbolAsyncIterator;
            proto[asyncIteratorFactorySymbol] = (_proto_symbolAsyncIterator = proto[symbolAsyncIterator]) !== null && _proto_symbolAsyncIterator !== void 0 ? _proto_symbolAsyncIterator : proto[symbolIterator$1];
            return this[asyncIteratorFactorySymbol]();
        }
        return iterateEntries(this);
    };
    for (const proto of [
        scope.Map.prototype,
        scope.WeakMap.prototype,
        scope.Set.prototype,
        scope.WeakSet.prototype,
        // Generator function
        Object.getPrototypeOf(function*() {})
    ]){
        proto[forEachSymbol] = forEachIterable();
        proto[asyncIteratorFactorySymbol] = proto[symbolIterator$1];
    }
    scope.Number.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(range(target), projection, mapped, seed, context);
    scope.Number.prototype[asyncIteratorFactorySymbol] = range;
    scope.Function.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(traverse(target), projection, mapped, seed, context);
    scope.Function.prototype[asyncIteratorFactorySymbol] = traverse;
    return retry();
};
// #endregion
function* range(length = this) {
    for(let i = 0; i < length; i++)yield i;
}
function* traverse(next = this) {
    let item = undefined;
    while((item = next(item)) !== undefined)yield item;
}
function* iterateEntries(source) {
    for(const key in source){
        yield [
            key,
            source[key]
        ];
    }
}
const forEach = (source, projection, seed, context)=>{
    try {
        var _source_forEachSymbol;
        return source ? (_source_forEachSymbol = source[forEachSymbol](source, projection, undefined, seed, context)) !== null && _source_forEachSymbol !== void 0 ? _source_forEachSymbol : seed : source == null ? source : undefined;
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEach(source, projection, seed, context));
    }
};
let map = (source, projection, target = [], seed, context = source)=>{
    try {
        return !source && source !== 0 && source !== "" ? source == null ? source : undefined : source[forEachSymbol](source, projection, target, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>map(source, projection, target, seed, context));
    }
};
/** Creates an array with the parameters that are not false'ish */ const truish = (...values)=>filter(values.length === 1 ? values[0] : values, false);
let filter = (items, filter = true, invert = false)=>map(items, filter === true ? (item)=>item !== null && item !== void 0 ? item : skip : !filter ? (item)=>item || skip : filter.has ? (item)=>item == null || filter.has(item) === invert ? skip : item : (item, index, prev)=>!filter(item, index, prev, items) === invert ? item : skip);
const group = (source, projection, map)=>{
    var _groups, _kv_;
    if (projection != null && typeof projection !== "function") {
        [projection, map] = [
            undefined,
            projection
        ];
    }
    let groups, kv;
    forEach(source, map !== false ? (groups = new Map(), (item, index, prev)=>{
        kv = projection ? projection(item, index, prev) : item;
        if (kv[0] !== undefined) {
            get(groups, kv[0], ()=>[]).push(kv[1]);
        }
    }) : (groups = {}, (item, index, prev)=>{
        var _;
        return (kv = projection ? projection(item, index, prev) : item) && kv[0] !== undefined && ((_ = (_groups = groups)[_kv_ = kv[0]]) !== null && _ !== void 0 ? _ : _groups[_kv_] = []).push(kv[1]);
    }));
    return groups;
};
let forEachAwait = (source, projection, seed, context)=>{
    try {
        return iterateAsync(source, projection, undefined, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEachAwait(source, projection, seed, context));
    }
};
const iterateAsync = async (source, projection, mapped, seed, context)=>{
    if ((source = await source) == null) return source;
    if (source === false) return undefined;
    const iterator = source[asyncIteratorFactorySymbol]();
    let result;
    let projected, i = 0;
    while(result = iterator.next()){
        if (isPromiseLike(result)) {
            result = await result;
        }
        if (result.done) {
            break;
        }
        let item = result.value;
        if (isPromiseLike(item)) {
            item = await item;
        }
        if ((projected = await (projection ? projection(item, i++, seed, context) : item)) !== skip) {
            if (projected === stop) {
                break;
            }
            seed = projected;
            mapped === null || mapped === void 0 ? void 0 : mapped.push(projected);
            if (stopInvoked) {
                stopInvoked = false;
                break;
            }
        }
    }
    return mapped || seed;
};
const distinct = (source)=>source == null ? source : source instanceof Set ? source : new Set(source[symbolIterator$1] && typeof source !== "string" ? source : [
        source
    ]);
const iterable = (source)=>source === void 0 ? [] : (source === null || source === void 0 ? void 0 : source[symbolIterator$1]) && typeof source !== "string" ? source : [
        source
    ];
const array = (source)=>source == null ? source : isArray(source) ? source : source[symbolIterator$1] && typeof source !== "string" ? [
        ...source
    ] : [
        source
    ];
const some = (source, predicate)=>forEach(source, (item, index, prev)=>(predicate ? predicate(item, index, prev, source) : item) ? stopInvoked = true : item) === true;
const concat = (arg0, ...other)=>{
    if (other.length || !isIterable(arg0)) {
        arg0 = [
            arg0,
            ...other
        ];
    }
    let result;
    for (const arg of arg0){
        if (arg == null) continue;
        if (isIterable(arg)) {
            (result !== null && result !== void 0 ? result : result = []).push(...arg);
            continue;
        }
        (result !== null && result !== void 0 ? result : result = []).push(arg);
    }
    return result;
};
const keys = Object.keys;
const hasKeys = (obj)=>!!keyCount(obj, true);
const keyCount = (obj, some = false)=>{
    if (!obj) return 0;
    let count = 0;
    for(const _ in obj){
        if (++count && some) {
            return 1;
        }
    }
    return count;
};
const setSymbol = Symbol();
const getSymbol = Symbol();
const pushSymbol = Symbol();
let ensureAssignImplementations = (target, error, retry)=>{
    if (target == null || (target === null || target === void 0 ? void 0 : target[getSymbol])) {
        throw error;
    }
    let scope = findDeclaringScope(target);
    if (!scope) {
        throw error;
    }
    if (scope.Object.prototype[setSymbol]) throw error;
    for (const { prototype } of [
        scope.Map,
        scope.WeakMap
    ]){
        prototype[setSymbol] = function(key, value) {
            return value === void 0 ? this.delete(key) : this.get(key) !== value && !!this.set(key, value);
        };
        prototype[getSymbol] = prototype.get;
    }
    for (const { prototype } of [
        scope.Set,
        scope.WeakSet
    ]){
        prototype[setSymbol] = function(key, value, add = false) {
            return value || add && value === void 0 ? this.has(key) ? false : !!this.add(key) : this.delete(key);
        };
        prototype[getSymbol] = prototype.has;
        prototype[pushSymbol] = function(...keys) {
            for (const key of keys)key !== void 0 && this.add(key);
            return this;
        };
    }
    scope.Array.prototype[pushSymbol] = scope.Array.prototype.push;
    for (const { prototype } of [
        scope.Object,
        scope.Array
    ]){
        prototype[setSymbol] = function(key, value) {
            if (value === undefined) {
                if (this[key] !== undefined) {
                    delete this[key];
                    return true;
                }
                return false;
            }
            return (this[key] = value) !== value;
        };
        prototype[getSymbol] = function(key) {
            return this[key];
        };
    }
    return retry();
};
let get = (source, key, initialize)=>{
    try {
        if (source == null) return source;
        let value = source[getSymbol](key);
        if (value === void 0 && (value = typeof initialize === "function" ? initialize() : initialize) !== void 0) {
            if (value === null || value === void 0 ? void 0 : value.then) return value.then((value)=>value === void 0 ? value : source[setSymbol](key, value));
            source[setSymbol](key, value);
        }
        return value;
    } catch (e) {
        return ensureAssignImplementations(source, e, ()=>get(source, key, initialize));
    }
};
let add = (target, key, value)=>{
    try {
        return (target === null || target === void 0 ? void 0 : target[setSymbol](key, value, true)) === true;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>add(target, key, value));
    }
};
const obj = (source, projection)=>{
    const target = {};
    forEach(source, projection ? (item, index, seed)=>(item = projection(item, index, seed)) && (typeof item !== "symbol" || item !== skip && item !== stop) ? target[item[0]] = item[1] : item : (item)=>item && (typeof item !== "symbol" || item !== skip && item !== stop) ? target[item[0]] = item[1] : item);
    return target;
};
const merge = (target, sources, options = {})=>{
    if (target == null) {
        return target;
    }
    const { deep = true, overwrite = true, nulls = false } = options;
    for (const source of iterable(sources)){
        forEach(source, (kv)=>{
            if (!kv) return;
            const [key, value] = kv;
            const current = target[key];
            if (nulls ? current == null : current === void 0) {
                target[key] = value;
                return;
            }
            if (deep && (value === null || value === void 0 ? void 0 : value.constructor) === Object && (current === null || current === void 0 ? void 0 : current.constructor) === Object) {
                merge(current, value, options);
            } else if (overwrite) {
                target[key] = value;
            }
        });
    }
    return target;
};
const unwrap = (value)=>typeof value === "function" ? value() : value;
const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const required = (value, error)=>value != null ? value : throwError(error !== null && error !== void 0 ? error : "A required value is missing", (text)=>new TypeError(text.replace("...", " is required.")));
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
const formatError = (error, includeStackTrace)=>!error ? "(unspecified error)" : includeStackTrace && (error === null || error === void 0 ? void 0 : error.stack) ? `${formatError(error, false)}\n${error === null || error === void 0 ? void 0 : error.stack}` : error.message ? `${error.name}: ${error.message}` : "" + error;
const tryCatchAsync = async (expression, errorHandler = true, always)=>{
    try {
        return await unwrap(expression);
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            return await errorHandler(e);
        } else if (errorHandler) {
            throw e;
        }
        // `false` means "ignore".
        console.error(e);
    } finally{
        await (always === null || always === void 0 ? void 0 : always());
    }
    return undefined;
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
/** Minify friendly version of `null`. */ const nil = null;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolAsyncIterator = Symbol.asyncIterator;
const isBoolean = (value)=>typeof value === "boolean";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isObject = /*#__PURE__*/ (value)=>value && typeof value === "object";
const isPlainObject = /*#__PURE__*/ (value)=>(value === null || value === void 0 ? void 0 : value.constructor) === Object;
const isFunction = /*#__PURE__*/ (value)=>typeof value === "function";
const isPromiseLike = /*#__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value["then"]);
const isIterable = /*#__PURE__*/ (value, acceptStrings = false)=>!!((value === null || value === void 0 ? void 0 : value[symbolIterator]) && (typeof value !== "string" || acceptStrings));
const testFirstLast = (s, first, last)=>s[0] === first && s[s.length - 1] === last;
const isJsonString = (value)=>isString(value) && (testFirstLast(value, "{", "}") || testFirstLast(value, "[", "]"));
/**
 * Clones a value by its JSON representation.
 */ const jsonClone = (value)=>value == null ? null : JSON.parse(JSON.stringify(value));
const isJsonObject = (value)=>isPlainObject(value);
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
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
        _define_property$e(this, "_promise", void 0);
        this.reset();
    }
}
class OpenPromise {
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
    constructor(){
        _define_property$e(this, "_promise", void 0);
        _define_property$e(this, "resolve", void 0);
        _define_property$e(this, "reject", void 0);
        _define_property$e(this, "value", void 0);
        _define_property$e(this, "error", void 0);
        _define_property$e(this, "pending", true);
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
const race = (...args)=>Promise.race(args.map((arg)=>isFunction(arg) ? arg() : arg));
const createEventBinders = (listener, attach, detach)=>{
    let bound = false;
    const outerListener = (...args)=>listener(...args, unbind);
    const unbind = ()=>bound !== (bound = false) && (detach(outerListener), true);
    const rebind = ()=>bound !== (bound = true) && (attach(outerListener), true);
    rebind();
    return [
        unbind,
        rebind
    ];
};
const createEvent = ()=>{
    const listeners = new Set();
    let dispatchedArgs;
    return [
        (handler, trigger)=>{
            const binders = createEventBinders(handler, (handler)=>listeners.add(handler), (handler)=>listeners.delete(handler));
            trigger && dispatchedArgs && handler(...dispatchedArgs, binders[0]);
            return binders;
        },
        (...payload)=>(dispatchedArgs = payload, listeners.forEach((handler)=>handler(...payload)))
    ];
};
const ellipsis = (text, maxLength, debug = false)=>text && (text.length > maxLength ? debug ? `${text.slice(0, maxLength)}... [and ${text.length - maxLength} more]` : text.slice(0, maxLength - 1) + "…" : text);
const isEmptyString = (s)=>s == null || typeof s === "boolean" || s.toString() === "";
const join = (source, arg1, arg2)=>source == null ? source : typeof source === "string" ? source : source[symbolIterator] ? filter(typeof arg1 === "function" ? map(source, arg1) : (arg2 = arg1, source), isEmptyString, true).join(arg2 !== null && arg2 !== void 0 ? arg2 : "") : typeof source === "boolean" ? "" : source.toString();
const indent = (text, indent = "  ")=>{
    if (text == null) return text;
    let i = 0;
    let baseIndent = 0;
    return replace(text, /( *)([^\r\n]*)(\r?\n?)/g, (_, lineIndent, text, br)=>{
        if (!text) {
            return br;
        }
        if (!i++) {
            baseIndent = lineIndent.length;
        }
        return `${indent}${lineIndent.length >= baseIndent ? lineIndent.slice(baseIndent) : ""}${text}${br}`;
    });
};
/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */ const itemize = (values, separators, result, rest)=>{
    if (!values && values !== 0) return values == null ? values : undefined$1;
    if (typeof separators === "function") {
        return itemize(map(values, separators), result, rest);
    }
    const first = [];
    const last = forEach(values, (item, _, prev)=>isEmptyString(item) ? skip : (prev && first.push(prev), item.toString()));
    let [separator, conjunction] = isArray(separators) ? separators : [
        ,
        separators
    ];
    separator !== null && separator !== void 0 ? separator : separator = ",";
    conjunction = (conjunction !== null && conjunction !== void 0 ? conjunction : conjunction = "and")[0] === separator ? conjunction + " " : " " + // Don't add two spaces if the conjunction is the empty string.
    (conjunction ? conjunction + " " : "");
    const enumerated = first.length ? `${first.join(separator + " ")}${conjunction}${last}` : last !== null && last !== void 0 ? last : "";
    return result ? result(enumerated, first.length + +(last != null)) : enumerated;
};
const parameterListSymbol = Symbol();
const parseKeyValue = (value, { delimiters = [
    "|",
    ";",
    ","
], decode = true, lowerCase } = {})=>{
    var _parts, _ref;
    if (!value) return undefined$1;
    const parts = value.split("=").map((v)=>{
        v = decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim();
        return lowerCase ? v.toLowerCase() : v;
    });
    let split;
    var _;
    (_ = (_parts = parts)[_ref = 1]) !== null && _ !== void 0 ? _ : _parts[_ref] = "";
    parts[2] = parts[1] && (isString(delimiters) && (delimiters = [
        delimiters
    ]) || isArray(delimiters)) && forEach(delimiters, (delim)=>(split = parts[1].split(delim)).length > 1 ? stop(split) : undefined$1) || (parts[1] ? [
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
 */ const parseUri = (uri, { delimiters = true, requireAuthority, ...options } = {})=>uri == nil ? undefined$1 : match(uri, /^(?:(?:([\w+.-]+):)?(\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/g, (source, scheme, slashes, authority, user, password, bracketHost, host, port, path, queryString, fragment)=>{
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
            query: delimiters === false ? queryString : queryString ? parseQueryString(queryString, {
                ...options,
                delimiters
            }) : undefined$1,
            fragment
        };
        parsed.path = parsed.path || (parsed.authority ? parsed.urn ? "" : "/" : undefined$1);
        return parsed;
    });
const parseHttpHeader = (query, options)=>parseParameters(query, "; ", options);
const parseQueryString = (query, options)=>parseParameters(query, "&", options);
const parseParameters = (query, separator, { delimiters = true, ...options } = {})=>{
    var _query_match_, _query_match;
    const parameters = map(query === null || query === void 0 ? void 0 : (_query_match = query.match(/(?:^.*?\?|^)([^#]*)/)) === null || _query_match === void 0 ? void 0 : (_query_match_ = _query_match[1]) === null || _query_match_ === void 0 ? void 0 : _query_match_.split(separator), (part)=>{
        var _parseKeyValue;
        let [key, value, values] = (_parseKeyValue = parseKeyValue(part, {
            ...options,
            delimiters: delimiters === false ? [] : delimiters === true ? undefined$1 : delimiters
        })) !== null && _parseKeyValue !== void 0 ? _parseKeyValue : [];
        return (key = key === null || key === void 0 ? void 0 : key.replace(/\[\]$/, "")) != null ? delimiters !== false ? [
            key,
            values.length > 1 ? values : value
        ] : [
            key,
            value
        ] : skip;
    });
    const results = obj(group(parameters, false), ([key, values])=>[
            key,
            delimiters !== false ? values.length > 1 ? concat(values) : values[0] : values.join(",")
        ]);
    return results ? (results[parameterListSymbol] = parameters, results) : results;
};
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */ const match = (s, regex, projection, map = false)=>{
    regex.lastIndex = 0;
    let lastMatch = regex.exec(s);
    if (!projection) {
        return lastMatch;
    }
    let returnValue = map ? [] : undefined$1;
    while(lastMatch){
        const value = projection(...lastMatch);
        if (value === stop) {
            break;
        }
        if (value !== skip) {
            if (map) {
                returnValue.push(value);
            } else {
                returnValue = value;
            }
        }
        lastMatch = regex.global ? regex.exec(s) : null;
        if (!(lastMatch === null || lastMatch === void 0 ? void 0 : lastMatch[0].length) && ++regex.lastIndex >= s.length) {
            break;
        }
    }
    return returnValue;
};
/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */ const replace = (s, match, replaceValue)=>{
    var _s_replace;
    return (_s_replace = s === null || s === void 0 ? void 0 : s.replace(match, replaceValue)) !== null && _s_replace !== void 0 ? _s_replace : s;
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
const mapEventSession = (tracker)=>{
    var _tracker_clientIp;
    return tracker.session && {
        sessionId: tracker.session.id,
        deviceSessionId: tracker.deviceSessionId,
        deviceId: tracker.deviceId,
        userId: tracker.authenticatedUserId,
        consent: types.DataUsage.clone(tracker.consent),
        expiredDeviceSessionId: tracker._expiredDeviceSessionId,
        clientIp: (_tracker_clientIp = tracker.clientIp) !== null && _tracker_clientIp !== void 0 ? _tracker_clientIp : undefined,
        anonymousSessionId: tracker.session.anonymousSessionId,
        collision: tracker._expiredDeviceSessionId ? true : undefined,
        anonymous: tracker.session.anonymous
    };
};
class TrackerCoreEvents {
    async patch({ events }, next, tracker) {
        if (!tracker.session || !tracker.sessionId) {
            // Abort the pipeline and do nothing if there is no session.
            return [];
        }
        let currentTime = now();
        // Finish the pipeline to get the final events.
        events = await next(events);
        // Apply updates via patches. This enables multiple requests for the same session to execute concurrently.
        let sessionPatches = [];
        let devicePatches = [];
        const flushUpdates = async ()=>{
            var _tracker_device;
            [
                sessionPatches,
                devicePatches
            ].forEach((patches)=>patches.unshift((info)=>info.lastSeen < currentTime && (info.isNew = false, info.lastSeen = currentTime)));
            await tracker.set([
                {
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    patch: (current)=>{
                        if (!current) return;
                        sessionPatches.forEach((patch)=>patch(current));
                        return current;
                    }
                },
                ((_tracker_device = tracker.device) === null || _tracker_device === void 0 ? void 0 : _tracker_device.id) && {
                    scope: "device",
                    key: SCOPE_INFO_KEY,
                    patch: (current)=>{
                        if (!current) return;
                        devicePatches.forEach((patch)=>patch(current));
                        return current;
                    }
                }
            ]);
            sessionPatches = [];
            devicePatches = [];
        };
        const updatedEvents = [];
        for (let event of events){
            // Capture the session from the tracker before it potentially is modified by consent changes etc. below.
            // We want to attribute the event to the session it happened in, and not the session afterwards.
            let session = mapEventSession(tracker);
            if (types.isConsentEvent(event)) {
                await tracker.updateConsent(event.consent);
            } else if (types.isResetEvent(event)) {
                const resetEvent = event;
                if (tracker.session.userId) {
                    // Fake a sign out event if the user is currently authenticated.
                    events.push(event);
                    event = {
                        id: undefined,
                        type: "sign_out",
                        userId: tracker.authenticatedUserId,
                        timestamp: event.timestamp,
                        session
                    };
                }
                // Start new session
                await flushUpdates();
                await tracker.reset({
                    session: true,
                    device: resetEvent.includeDevice,
                    consent: resetEvent.includeConsent,
                    referenceTimestamp: resetEvent.timestamp
                });
            }
            updatedEvents.push(event);
            if (tracker.session.isNew) {
                let isNewSession = true;
                await tracker.set({
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    patch: (current)=>{
                        // Make sure we only post the "session_started" event once.
                        if ((current === null || current === void 0 ? void 0 : current.isNew) === true) {
                            return {
                                ...current,
                                isNew: false
                            };
                        }
                        isNewSession = false;
                        return current; // No change.
                    }
                });
                if (isNewSession) {
                    var _tracker_device;
                    var _tracker_device_sessions;
                    updatedEvents.push({
                        type: "session_started",
                        url: tracker.url,
                        sessionNumber: (_tracker_device_sessions = (_tracker_device = tracker.device) === null || _tracker_device === void 0 ? void 0 : _tracker_device.sessions) !== null && _tracker_device_sessions !== void 0 ? _tracker_device_sessions : 1,
                        timeSinceLastSession: tracker.session.previousSession ? tracker.session.firstSeen - tracker.session.previousSession : undefined,
                        session: mapEventSession(tracker),
                        tags: tracker.env.tags,
                        timestamp: currentTime
                    });
                    devicePatches.push((current)=>{
                        if (current) {
                            ++current.sessions;
                        }
                        return current;
                    });
                }
            }
            event.session = session;
            if (types.isUserAgentEvent(event)) {
                sessionPatches.push((data)=>data.hasUserAgent = true);
            } else if (types.isViewEvent(event)) {
                var _data;
                sessionPatches.push((data)=>++data.views, (data)=>{
                    var _tabs;
                    return event.tabNumber > ((_tabs = (_data = data).tabs) !== null && _tabs !== void 0 ? _tabs : _data.tabs = 0) && (data.tabs = event.tabNumber);
                });
                devicePatches.push((data)=>++data.views);
            } else if (types.isSignInEvent(event)) {
                const changed = tracker.authenticatedUserId != event.userId;
                if (changed) {
                    if (types.DataClassification.compare(tracker.consent.classification, "direct") < 0) {
                        updatedEvents[updatedEvents.length - 1] = {
                            error: "Sign-in is only possible when the user has consented to tracking of direct personal data.",
                            source: event
                        };
                    } else {
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
                }
            } else if (types.isSignOutEvent(event)) {
                sessionPatches.push((data)=>data.userId = undefined);
            }
        }
        await flushUpdates();
        return updatedEvents;
    }
    constructor(){
        _define_property$d(this, "id", "core_events");
    }
}

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
/** Outputs collected tracker events to either the log or the console. */ class EventLogger {
    async post({ events }, tracker) {
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
        _define_property$c(this, "configuration", void 0);
        _define_property$c(this, "id", void 0);
        this.configuration = configuration;
        this.id = "event-logger";
        var _group;
        (_group = (_this_configuration = this.configuration).group) !== null && _group !== void 0 ? _group : _this_configuration.group = "events";
    }
}

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
    patch({ events }, next) {
        return next(events.map((event)=>types.isOrderEvent(event) ? normalizeOrder(event) : types.isCartEvent(event) ? normalizeCartEventData(event) : event));
    }
    constructor(){
        _define_property$b(this, "id", "commerce");
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
        _define_property$a(this, "_currentCipherId", void 0);
        _define_property$a(this, "_ciphers", void 0);
        if (!(keys === null || keys === void 0 ? void 0 : keys.length)) {
            this._currentCipherId = "";
            this._ciphers = {
                "": transport.defaultTransport
            };
            return;
        }
        this._ciphers = Object.fromEntries(keys.map((key)=>[
                transport.hash(key, 32),
                transport.createTransport(key)
            ]));
        this._currentCipherId = transport.hash(keys[0], 32);
    }
}

const generateClientExternalNavigationScript = (requestId, url)=>{
    return `<html><head><script>try{localStorage.setItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)},${JSON.stringify(JSON.stringify({
        requestId
    }))});localStorage.removeItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)});}catch(e){console.error(e);}location.replace(${JSON.stringify(url)});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};

function bootstrap(settings) {
    var _settings_endpoint, _map;
    return new RequestHandler({
        ...settings,
        endpoint: (_settings_endpoint = settings.endpoint) !== null && _settings_endpoint !== void 0 ? _settings_endpoint : "./_t.js",
        extensions: (_map = map(settings.extensions, (extension)=>!extension ? skip : typeof extension === "function" ? extension : async ()=>extension)) !== null && _map !== void 0 ? _map : []
    });
}

function getErrorMessage(validationResult) {
    return !validationResult["type"] ? validationResult["error"] : null;
}
const isValidationError = (item)=>item && item["type"] == null && item["error"] != null;

var index = {
    "namespace": "urn:tailjs:core",
    "readonly": false,
    "visibility": "public",
    "classification": "anonymous",
    "purposes": {},
    "name": "urn:tailjs:core",
    "version": "0.42.0-preview2",
    "types": {
        "ScopeInfo": {
            "version": "0.42.0-preview2",
            "abstract": true,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "firstSeen": {
                    "primitive": "timestamp",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "lastSeen": {
                    "primitive": "timestamp",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "views": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "isNew": {
                    "primitive": "boolean",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "userAgent": {
                    "primitive": "string",
                    "description": "The user agent of the client (only included when debugging).",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionInfo": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.42.0-preview2"
            ],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "deviceId": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "deviceSessionId": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "userId": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "previousSession": {
                    "primitive": "timestamp",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "hasUserAgent": {
                    "primitive": "boolean",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anonymous": {
                    "primitive": "boolean",
                    "description": "The session id anonymous.",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anonymousSessionId": {
                    "primitive": "string",
                    "description": "If the user upgraded their consent, this will be the original anonymous session ID.",
                    "visibility": "trusted-only",
                    "readonly": false,
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tabs": {
                    "primitive": "number",
                    "description": "The total number of tabs opened during the session.",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "DeviceInfo": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.42.0-preview2"
            ],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "sessions": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "UserConsent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#DataUsage@0.42.0-preview2"
            ],
            "properties": {
                "source": {
                    "primitive": "string",
                    "description": "Where the consent comes from (typically Google Consent Mode v2 via a cookie consent screen).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "DataUsage": {
            "version": "0.42.0-preview2",
            "description": "The combination of the classification and purposes it can be used for determines whether data can be stored or used when compared to an individual's consent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "classification": {
                    "primitive": "string",
                    "enum": [
                        "never",
                        "anonymous",
                        "indirect",
                        "direct",
                        "sensitive"
                    ],
                    "description": "The maximum classification of data a user has consented to be collected and stored.\n\nAny property with a classification higher than this will be cleared (censored) before an object is stored. If all properties gets censored, the object is not stored at all.\n\nAnonymous data does not require active consent, so data is stored regardless of its purposes since it is not \"personal data\" but just \"data\". This means you should not annotate all anonymous data as \"necessary\" in your schema, but rather use the purpose(s) that would require consent had the data not been anonymous.\n\nIn this way you can simply remove the `anonymous` annotation from a field or object if it turns out it is not truly anonymous. After that the data can no longer be read for purposes without user consent. However, tail.js does not currently support redacting/purging the data from storage so this you need to do manually.\n\nFor schema definitions see  {@link  SchemaDataUsage }  for inheritance rules.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "purposes": {
                    "reference": "urn:tailjs:core#DataPurposes@0.42.0-preview2",
                    "description": "The purposes the data may be used for.\n\nIf a data point has multiple purposes, consent is only need for one of them for the data to get stored. However, if some logic tries to read the data for a purpose without consent, it is not returned, since it is only stored for other purposes.\n\nPurposes do not restrict anonymous data. If no purposes are explicitly specified it implies \"necessary\".\n\nFor schema definitions see  {@link  SchemaDataUsage }  for inheritance rules.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                }
            }
        },
        "DataPurposes": {
            "version": "0.42.0-preview2",
            "description": "The purposes data can be used for. Non-necessary data requires an individual's consent to be collected and used.\n\nData categorized as \"anonymous\" will be stored regardless of consent since a consent only relates to \"personal data\", and anonymous data is just \"data\".\n\nWhether the two purposes \"personalization\" and \"security\" are considered separate purposes is configurable. The default is to consider \"personalization\" the same as \"functionality\", and \"security\" the same as \"necessary\".",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "performance": {
                    "primitive": "boolean",
                    "description": "Data stored for this purpose is used to gain insights on how individuals interact with a website or app optionally including demographics and similar traits with the purpose of optimizing the website or app.\n\nDO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope of the website or app. Use  {@link  DataPurposeFlags.Targeting  }  instead.\n\nIt may be okay if the data is only used for different website and apps that relate to the same product or service. This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may also be distributed across multiple domain names.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "functionality": {
                    "primitive": "boolean",
                    "description": "Data stored for this purpose is used for settings that adjust the appearance of a website or app according to an individual's preferences such as \"dark mode\" or localization of date and number formatting.\n\nDepending on your configuration, a functionality consent may also include personalization. Personalization such as suggested articles and videos is per definition functionality, but a special subcategory may be used to make the distinction between profile settings and behavioral history depending on your requirements.\n\nDO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope of the website or app. Use  {@link  DataPurposeFlags.Marketing  }  instead.\n\nIt may be okay if the data is only used for different website and apps that relate to the same product, brand or service, hence the information is still \"first party\" with respect to the legal entity/brand to whom the consent is made.\n\nThis would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may also be distributed across multiple domain names.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "marketing": {
                    "primitive": "boolean",
                    "description": "Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties or otherwise used to perform marketing outside the scope of the specific website or app.\n\nWhen tagging data points in a schema it is good practice to also specify whether the data is related to performance, functionality or both\n\nIf the data is only used for different websites and apps that relate to the same product or service that belongs to your brand, it might not be necessary to use this category.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "personalization": {
                    "primitive": "boolean",
                    "description": "Personalization is a special subcategory of functionality data that is for things such as recommending articles and videos. This purpose is per default synonymous with  {@link  DataPurposes.functionality } , but can be configured to be a separate purpose that requires its own consent.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "security": {
                    "primitive": "boolean",
                    "description": "Data stored for this purpose is related to security such as authentication, fraud prevention, and other user protection.\n\nThis purpose is per default synonymous with  {@link  DataPurposes.essential  }  but can be configured to be a separate purpose that requires its own consent.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "TrackedEvent": {
            "version": "0.42.0-preview2",
            "description": "The base type for all events that are tracked.\n\nThe naming convention is:\n- If the event represents something that can also be considered an entity like a \"page view\", \"user location\" etc. the name should be that.\n- If the event indicates something that happened, like \"session started\", \"view ended\" etc. the name should end with a verb in the past tense.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "system": "event",
            "properties": {
                "type": {
                    "primitive": "string",
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "schema": {
                    "primitive": "string",
                    "description": "The ID of the schema the event comes from. It is suggested that the schema ID includes a SemVer version number in the end. (e.g. urn:tailjs:0.9.0 or https://www.blah.ge/schema/3.21.0)",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "id": {
                    "primitive": "string",
                    "description": "This is assigned by the server. Only use  {@link  clientId }  client-side.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timestamp": {
                    "primitive": "timestamp",
                    "description": "If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).\n\nThe timestamp is assigned before it reaches a backend.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clientId": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "patchTargetId": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "relatedEventId": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "view": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "metadata": {
                    "reference": "urn:tailjs:core#EventMetadata@0.42.0-preview2",
                    "description": "These properties are used to track the state of the event as it gets collected, and is not persisted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "session": {
                    "reference": "urn:tailjs:core#Session@0.42.0-preview2",
                    "description": "The session associated with the event.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Tagged": {
            "version": "0.42.0-preview2",
            "description": "Types extending this interface allow custom values that are not explicitly defined in their schema.\n\nSee  {@link  tags }  for details.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "tags": {
                    "item": {
                        "reference": "urn:tailjs:core#Tag@0.42.0-preview2"
                    },
                    "description": "Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.\n\nExamples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,  `ext1:video:play` and `area=investors+9, area=consumers+2`\n\nAs in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).\n\nIt is possible to specify \"how much\" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the \"investors\" audience will ultimately be higher than the score for \"consumers\".\n\nTags are separated by comma (`,`).\n\nThe following rules apply:\n- There should not be quotes around tag values. If there are they will get interpreted as part of the value.\n- Tag names will get \"cleaned\" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.\n- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.\n- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\\,`), however using commas or similar characters   to store a list of values in the same tag is discouraged as each value should rather have its own tag.\n\nBAD: `selected=1\\,2\\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`\n\nBAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`\n\nBAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`\n\nTags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.\n\nTags are associated with HTML elements either via the `track-tags` attribute, or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.\n\nSince stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Tag": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "tag": {
                    "primitive": "string",
                    "required": true,
                    "description": "The name of the tag including namespace.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "value": {
                    "primitive": "string",
                    "description": "The value of the tag.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "score": {
                    "primitive": "number",
                    "description": "How strongly the tags relates to the target (between 0 and 1).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "EventMetadata": {
            "version": "0.42.0-preview2",
            "description": "These properties are used to track the state of events as they get collected, and not stored.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "passive": {
                    "primitive": "boolean",
                    "description": "Hint to the request handler that new sessions should not be started if all posted events are passive.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "queued": {
                    "primitive": "boolean",
                    "description": "Hint that the event has been queued.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "posted": {
                    "primitive": "boolean",
                    "description": "Hint to client code, that the event has been posted to the server.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Session": {
            "version": "0.42.0-preview2",
            "description": "Identifiers related to a user's session, login and device. Based on the user's consent some of these fields may be unavailable.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "anonymousSessionId": {
                    "primitive": "string",
                    "description": "If a non-anonymous session started as an anonymous session, this is the anonymous session ID. Since an anonymous session is not necessarily unique to a device, processing logic may decide whether and how to stitch the anonymous and non-anonymous session together.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "sessionId": {
                    "primitive": "string",
                    "required": true,
                    "description": "The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards). Sessions are reset when an authenticated user logs out (triggered by the  {@link  SignOutEvent } ).\n\nAggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.\n\nIt is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "deviceId": {
                    "primitive": "string",
                    "description": "The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.\n\nAggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.\n\nIt is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "deviceSessionId": {
                    "primitive": "string",
                    "description": "The unique ID of the user's device session ID. A device session starts when the user enters the site like a normal server session, but unlike server sessions, device sessions stay active as long as the user has tabs related to the site open. This means that device sessions survives when the user puts their computer to sleep, or leaves tabs open in the background on their phone.\n\nAfter the user has completely left the site, device sessions time out in the same way as server sessions.",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true,
                        "functionality": true
                    },
                    "readonly": false,
                    "visibility": "public",
                    "required": false
                },
                "userId": {
                    "primitive": "string",
                    "description": "The current user owning the session.",
                    "classification": "direct",
                    "readonly": false,
                    "visibility": "public",
                    "purposes": {},
                    "required": false
                },
                "consent": {
                    "reference": "urn:tailjs:core#UserConsent@0.42.0-preview2",
                    "description": "The user's consent choices.  {@link  DataClassification.Anonymous  }  means the session is cookie-less.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clientIp": {
                    "primitive": "string",
                    "description": "The IP address of the device where the session is active.",
                    "classification": "indirect",
                    "readonly": false,
                    "visibility": "public",
                    "purposes": {},
                    "required": false
                },
                "collision": {
                    "primitive": "boolean",
                    "description": "Indicates that multiple clients are active in the same anonymous session.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anonymous": {
                    "primitive": "boolean",
                    "description": "Whether the session is using anonymous tracking.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "expiredDeviceSessionId": {
                    "primitive": "string",
                    "description": "This value indicates that an old device session \"woke up\" with an old device session ID and took over a new one. This may happen when background tabs are suspended.\n\nPost-processing can decide how to tie them together when the same tab participates in two sessions (which goes against the definition of a device session).",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true,
                        "functionality": true
                    },
                    "readonly": false,
                    "visibility": "public",
                    "required": false
                }
            }
        },
        "UserInteractionEvent": {
            "version": "0.42.0-preview2",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ActivatedComponent": {
            "version": "0.42.0-preview2",
            "description": "The component definition related to a user activation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.42.0-preview2"
            ],
            "properties": {
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedContent@0.42.0-preview2"
                    },
                    "description": "The activated content in the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle@0.42.0-preview2",
                    "description": "The size and position of the component when it was activated relative to the document top (not viewport).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Component": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.42.0-preview2",
                "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                "urn:tailjs:core#Personalizable@0.42.0-preview2"
            ],
            "properties": {
                "typeName": {
                    "primitive": "string",
                    "description": "An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "instanceId": {
                    "primitive": "string",
                    "description": "An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "instanceNumber": {
                    "primitive": "integer",
                    "description": "If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "inferred": {
                    "primitive": "boolean",
                    "description": "A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "dataSource": {
                    "reference": "urn:tailjs:core#DataSource@0.42.0-preview2",
                    "description": "Optional references to the content that was used to render the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ExternalReference": {
            "version": "0.42.0-preview2",
            "description": "Represent a reference to externally defined data.\n\nHave in mind that the reference does not need to point to an external system or database. It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.\n\nThe tailjs model generally prefers using external references rather than simple strings for most properties since that gives you the option to collect structured data that integrates well in, say, BI scenarios.\n\nThe tenet is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change. Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources. The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "description": "The ID as defined by some external source, e.g. CMS.\n\nThe property is required but an empty string is permitted. The library itself uses the empty string to indicate an \"empty\" root component if a page has content that is not wrapped in a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "version": {
                    "primitive": "string",
                    "description": "Optionally, the version of the item in case the external source supports versioning.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "language": {
                    "primitive": "string",
                    "description": "Optionally, the language of the item in case the external source supports localization.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "source": {
                    "primitive": "string",
                    "description": "Optionally, the ID of the external system referenced.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "referenceType": {
                    "primitive": "string",
                    "description": "Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. \"parent\" or \"pointer\".",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "isExternal": {
                    "primitive": "boolean",
                    "description": "Flag to indicate that this data comes from an external system that you do not control.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "name": {
                    "primitive": "string",
                    "description": "Optionally, the name of the item at the time an event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "itemType": {
                    "primitive": "string",
                    "description": "Optionally, the type of item referenced. In CMS context this corresponds to \"template\". Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "path": {
                    "primitive": "string",
                    "description": "Optionally, the path of the item at the time the event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Personalizable": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "personalization": {
                    "item": {
                        "reference": "urn:tailjs:core#Personalization@0.42.0-preview2"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Personalization": {
            "version": "0.42.0-preview2",
            "description": "The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "definition": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.definition }  corresponding to the test, but have different  {@link  Personalization.variable  } s.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variants": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationVariant@0.42.0-preview2"
                    },
                    "description": "The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.\n\nTo represent the default values for the sources that can be personalized, include the default variant and assign the default settings to it as sources.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PersonalizationVariant": {
            "version": "0.42.0-preview2",
            "description": "A reference to the data/content item related to a variant in personalization.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "sources": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationSource@0.42.0-preview2"
                    },
                    "description": "The aspects of the component or page the variant changed. There can multiple sources, e.g. a variant may both change the size of a component and change the content at the same time.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "default": {
                    "primitive": "boolean",
                    "description": "If the reference is the default variant.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "eligible": {
                    "primitive": "boolean",
                    "description": "If the variant could have been picked.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "selected": {
                    "primitive": "boolean",
                    "description": "If the variant was chosen.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PersonalizationSource": {
            "version": "0.42.0-preview2",
            "description": "A specific aspect changed for a page or component for personalization as part of a  {@link  PersonalizationVariant } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "relatedVariable": {
                    "primitive": "string",
                    "description": "In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "personalizationType": {
                    "primitive": "string",
                    "description": "The kind of personalization that relates to this item.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "DataSource": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {}
        },
        "ActivatedContent": {
            "version": "0.42.0-preview2",
            "description": "The content definition related to a user activation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.42.0-preview2"
            ],
            "properties": {
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle@0.42.0-preview2",
                    "description": "The current size and position of the element representing the content relative to the document top (not viewport).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Content": {
            "version": "0.42.0-preview2",
            "description": "Represents a content item that can be rendered or modified via a  {@link  Component } \n\nIf the content is personalized please add the criteria",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "commerce": {
                    "reference": "urn:tailjs:core#CommerceData@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CommerceData": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "price": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The unit price.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "unit": {
                    "primitive": "string",
                    "description": "The unit the item is sold by.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variation": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "stock": {
                    "primitive": "number",
                    "description": "The current number of units in stock.\n\nUse fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Rectangle": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Position@0.42.0-preview2",
                "urn:tailjs:core#Size@0.42.0-preview2"
            ],
            "properties": {}
        },
        "Position": {
            "version": "0.42.0-preview2",
            "description": "Represents a position where the units are (CSS pixels)[#DevicePixelRatio].",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "x": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "y": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "Size": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "width": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "height": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ViewTimingData": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "activeTime": {
                    "primitive": "duration",
                    "description": "The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar. Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "visibleTime": {
                    "primitive": "duration",
                    "description": "The time the view/tab has been visible.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "totalTime": {
                    "primitive": "duration",
                    "description": "The time elapsed since the view/tab was opened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "activations": {
                    "primitive": "integer",
                    "description": "The number of times the user toggled away from the view/tab and back.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ScreenPosition": {
            "version": "0.42.0-preview2",
            "description": "Represents a position where the units are percentages relative to an element or page.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "xpx": {
                    "primitive": "integer",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "ypx": {
                    "primitive": "integer",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "x": {
                    "primitive": "number",
                    "format": "percentage",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "y": {
                    "primitive": "number",
                    "format": "percentage",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "pageFolds": {
                    "primitive": "number",
                    "description": "The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Viewport": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Rectangle@0.42.0-preview2"
            ],
            "properties": {
                "totalWidth": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "totalHeight": {
                    "primitive": "number",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ElementInfo": {
            "version": "0.42.0-preview2",
            "description": "Basic information about an HTML element.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "tagName": {
                    "primitive": "string",
                    "description": "The tag name of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "className": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "primitive": "string",
                    "description": "The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image)",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "href": {
                    "primitive": "string",
                    "description": "The target of the link, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "form"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "name": {
                    "primitive": "string",
                    "description": "The name of the form that was submitted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "completed": {
                    "primitive": "boolean",
                    "description": "Indicates whether the form was completed (that is, submitted). If this is false it means that the form was abandoned.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "activeTime": {
                    "primitive": "duration",
                    "description": "The duration the user was actively filling the form.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "totalTime": {
                    "primitive": "duration",
                    "description": "The total duration from the user started filling out the form until completion or abandonment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "fields": {
                    "key": {
                        "primitive": "string",
                        "required": true
                    },
                    "value": {
                        "reference": "urn:tailjs:core#FormField@0.42.0-preview2"
                    },
                    "description": "All fields in the form (as detected).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "ref": {
                    "primitive": "string",
                    "description": "A correlation ID. If a hidden input element has the name \"_tailref\", the HTML attribute \"track-ref\" or css variable \"--track-ref: 1\" its value will be used. If all of the above is difficult to inject in the way the form is embedded, the form element or any of its ancestors may alternatively have the HTML attribute \"track-ref\" with the name of the hidden input field that contains the reference.\n\nIf no initial value a unique one will be assigned. Make sure to store the value in receiving end.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormField": {
            "version": "0.42.0-preview2",
            "description": "A form field value in a  {@link  FormEvent } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "id": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "name": {
                    "primitive": "string",
                    "required": true,
                    "description": "The name of the form field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "label": {
                    "primitive": "string",
                    "description": "The label of the form field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "type": {
                    "primitive": "string",
                    "description": "The type of the input field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "filled": {
                    "primitive": "boolean",
                    "description": "If a user provided a value for the form field.\n\nFor checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "corrections": {
                    "primitive": "integer",
                    "description": "The number of times the field was changed after initially being filled.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "activeTime": {
                    "primitive": "duration",
                    "description": "How long the user was active in the field (field had focus on active tab).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "totalTime": {
                    "primitive": "duration",
                    "description": "How long the user was in the field (including if the user left the tab and came back).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "value": {
                    "primitive": "string",
                    "description": "The value of the form field. Be careful with this one.\n\nThe default is only to track whether checkboxes are selected. See  {@link  TrackingBehavior.forms }  and  {@link  TrackingBehavior.formFields }  for details.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "fillOrder": {
                    "primitive": "integer",
                    "description": "This field's number in the order the form was filled. A field is \"filled\" the first time the user types something in it.\n\nIf a checkbox or pre-filled drop down is left unchanged it will not get assigned a number.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "lastField": {
                    "primitive": "boolean",
                    "description": "The field was the last one to be filled before the form was either submitted or abandoned.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentClickEvent": {
            "version": "0.42.0-preview2",
            "description": "The event is triggered when a component is clicked.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_click"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ComponentClickIntentEvent": {
            "version": "0.42.0-preview2",
            "description": "The event is triggered when a user probably wanted to click a component but nothing happened.\n\nUsed for UX purposes where it may indicate that navigation is not obvious to the users. This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_click_intent"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "clicks": {
                    "item": {
                        "reference": "urn:tailjs:core#Position@0.42.0-preview2"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "elements": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.42.0-preview2"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentElementInfo": {
            "version": "0.42.0-preview2",
            "description": "Basic information about an HTML element that is associated with a component.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ElementInfo@0.42.0-preview2"
            ],
            "properties": {
                "component": {
                    "reference": "urn:tailjs:core#Component@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentViewEvent": {
            "version": "0.42.0-preview2",
            "description": "This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_view"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "NavigationEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "navigation"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "clientId": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "href": {
                    "primitive": "string",
                    "required": true,
                    "description": "The destination URL of the navigation",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "exit": {
                    "primitive": "boolean",
                    "description": "Indicates that the user went away from the site to an external URL.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anchor": {
                    "primitive": "string",
                    "description": "The anchor specified in the href if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "external": {
                    "primitive": "boolean",
                    "description": "Indicates that the navigation is to an external domain",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "self": {
                    "primitive": "boolean",
                    "required": true,
                    "description": "Whether the navigation happened in the current view or a new tab/window was opened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "domain": {
                    "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                    "description": "The domain of the destination",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "Domain": {
            "version": "0.42.0-preview2",
            "description": "Represents a domain name, e.g. https://www.foo.co.uk",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "scheme": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "host": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ScrollEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "scroll"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "offset": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The offset relative to the page size (100 % is bottom, 0 % is top)",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                },
                "scrollType": {
                    "primitive": "string",
                    "enum": [
                        "fold",
                        "article-end",
                        "page-middle",
                        "page-end",
                        "read",
                        "offset"
                    ],
                    "description": "The type of scrolling.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SearchEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "search"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "query": {
                    "primitive": "string",
                    "description": "The free-text query used for the search.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "filters": {
                    "item": {
                        "reference": "urn:tailjs:core#SearchFilter@0.42.0-preview2"
                    },
                    "description": "Any filters that were applied to the search in addition to the query. Filters are assumed combined using \"and\" semantics unless they are for the same field in which case it means that the field must match at least one of the values.\n\nFor example \"age>=10 AND age<=20 AND (type=horse OR type=cat)\"",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "hits": {
                    "primitive": "integer",
                    "description": "The number of results that matched the query.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "topHits": {
                    "item": {
                        "reference": "urn:tailjs:core#SearchResult@0.42.0-preview2"
                    },
                    "description": "If some or all of the results are relevant for analytics or AI, they can be included here.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SearchFilter": {
            "version": "0.42.0-preview2",
            "description": "A filter that applies to a field in a search query.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2"
            ],
            "properties": {
                "group": {
                    "primitive": "number",
                    "description": "If the filter consisted of multiple groups of filters where one of them should match this can be used to separate the groups.\n\nFor example (age>=10 AND age<=20 AND type=horse) OR (age<5 AND type=cat).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "value": {
                    "union": [
                        {
                            "primitive": "string"
                        },
                        {
                            "primitive": "number"
                        },
                        {
                            "primitive": "boolean"
                        }
                    ],
                    "description": "The value the field must match. Use UNIX ms timestamps for dates and durations. If the value is the ID of a defined entity use  {@link  reference }  instead.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "reference": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "If the value is a defined entity such as a product category use this instead of  {@link  value } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "comparison": {
                    "primitive": "string",
                    "enum": [
                        "<",
                        "<=",
                        "=",
                        "!=",
                        ">=",
                        ">"
                    ],
                    "description": "How the field compares against the value.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SearchResult": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2"
            ],
            "properties": {
                "rank": {
                    "primitive": "integer",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "SearchFieldReferenceFilter": {
            "version": "0.42.0-preview2",
            "description": "A search filter that applies to a single field that must match a defined entity (e.g. \"manufacturer\").",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.42.0-preview2"
            ],
            "properties": {
                "references": {
                    "item": {
                        "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2"
                    },
                    "description": "A list of entities where the field must match at least one of them (or none depending on the comparison).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "comparison": {
                    "primitive": "string",
                    "enum": [
                        "eq",
                        "neq"
                    ],
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionStartedEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "session_started"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "url": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "sessionNumber": {
                    "primitive": "integer",
                    "description": "The total number of sessions from the given device (regardless of username).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeSinceLastSession": {
                    "primitive": "duration",
                    "description": "The time since the last session from this device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "UserAgentLanguage": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "description": "The full language tag as specified by (RFC 5646/BCP 47)[https://datatracker.ietf.org/doc/html/rfc5646]",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "language": {
                    "primitive": "string",
                    "required": true,
                    "description": "The language name (ISO 639).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "region": {
                    "primitive": "string",
                    "description": "Dialect (ISO 3166 region).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "primary": {
                    "primitive": "boolean",
                    "required": true,
                    "description": "If it is the users primary preference.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "preference": {
                    "primitive": "integer",
                    "required": true,
                    "description": "The user's preference of the language (1 is highest).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "UserAgentEvent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2",
                "urn:tailjs:core#SessionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "user_agent"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "hasTouch": {
                    "primitive": "boolean",
                    "description": "Has touch",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "deviceType": {
                    "primitive": "string",
                    "enum": [
                        "mobile",
                        "tablet",
                        "desktop"
                    ],
                    "description": "The device type (inferred from screen size). The assumption is:   - anything width a logical device pixel width less than 480 is a phone,   - anything with a logical device pixel width less than or equal to 1024 (iPad Pro12.9\") is a tablet,   - the rest are desktops.\n\nDevice width is the physical width of the device regardless of its orientation.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "userAgent": {
                    "primitive": "string",
                    "required": true,
                    "description": "User agent string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "languages": {
                    "item": {
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.42.0-preview2"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "version": "0.42.0-preview2",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "iana": {
                            "primitive": "string",
                            "required": true,
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "offset": {
                            "primitive": "number",
                            "required": true,
                            "description": "The offset from GMT in hours.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        }
                    },
                    "required": true
                },
                "screen": {
                    "version": "0.42.0-preview2",
                    "description": "Screen",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "dpr": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device pixel ratio (i.e. how many physical pixels per logical CSS pixel)",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "width": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device width.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "height": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device height.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "landscape": {
                            "primitive": "boolean",
                            "description": "The device was held in landscape mode.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "webdriver": {
                    "primitive": "boolean",
                    "description": "The browser is being controlled by automation (e.g., Selenium or Puppeteer).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionEvent": {
            "version": "0.42.0-preview2",
            "description": "Events implementing this interface indicate that they contain information that relates to the entire session and not just the page view where they happened.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {}
        },
        "ClickIds": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "google": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "googleDoubleClick": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "facebook": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "microsoft": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "googleAnalytics": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ViewEvent": {
            "version": "0.42.0-preview2",
            "description": "This event is sent a user navigates between views. (page, screen or similar).\n\nThis event does not",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "view"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "clientId": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tab": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "href": {
                    "primitive": "string",
                    "required": true,
                    "description": "The fully qualified URL as shown in the address line of the browser excluding the domain.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "hash": {
                    "primitive": "string",
                    "description": "The hash part of the URL (/about-us#address).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "path": {
                    "primitive": "string",
                    "description": "The path portion of the URL.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "duration": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "For how long the view was active. This is set via patches",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "httpStatus": {
                    "primitive": "number",
                    "description": "The HTTP status for the response associated with the view.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "utm": {
                    "version": "0.42.0-preview2",
                    "description": "Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "source": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "medium": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "campaign": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "term": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "content": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "queryString": {
                    "key": {
                        "primitive": "string",
                        "required": true
                    },
                    "value": {
                        "item": {
                            "primitive": "string"
                        }
                    },
                    "description": "The query string parameters in the URL, e.g. utm_campaign. Each parameter can have multiple values, for example If the parameter is specified more than once. If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order). A parameter without a value will get recorded as an empty string.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "domain": {
                    "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                    "description": "The domain part of the href, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "landingPage": {
                    "primitive": "boolean",
                    "description": "Indicates that this was the first view in the first tab the user opened. Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "firstTab": {
                    "primitive": "boolean",
                    "description": "Indicates that no other tabs were open when the view happened. This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity. By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tabNumber": {
                    "primitive": "integer",
                    "description": "The tab number in the current session.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tabViewNumber": {
                    "primitive": "integer",
                    "description": "The view number in the current tab. This is kept as a convenience, yet technically redundant since it follows from timestamps and context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "redirects": {
                    "primitive": "integer",
                    "description": "Number of redirects that happened during navigation to this view.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "navigationType": {
                    "primitive": "string",
                    "enum": [
                        "navigate",
                        "back-forward",
                        "prerender",
                        "reload"
                    ],
                    "description": "Navigation type.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clientNavigation": {
                    "primitive": "string",
                    "enum": [
                        "push",
                        "replace"
                    ],
                    "description": "The navigation happened without making an additional request to the server (the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "mode": {
                    "primitive": "string",
                    "enum": [
                        "manual",
                        "automatic"
                    ],
                    "description": "Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "externalReferrer": {
                    "version": "0.42.0-preview2",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "href": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "domain": {
                            "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The size of the user's viewport (e.g. browser window) and how much it was scrolled when the page was opened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewType": {
                    "primitive": "string",
                    "description": "The type of view, e.g. \"page\" or \"screen\".",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "definition": {
                    "reference": "urn:tailjs:core#View@0.42.0-preview2",
                    "description": "The primary content used to generate the view including the personalization that led to the decision, if any. If views are loaded asynchronously in a way where they are not available immediately after a user navigates to a URL on the website, the view definition may follow from a separate patch event.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "View": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.42.0-preview2",
                "urn:tailjs:core#Personalizable@0.42.0-preview2"
            ],
            "properties": {
                "preview": {
                    "primitive": "boolean",
                    "description": "The page was shown in preview/staging mode.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionLocationEvent": {
            "version": "0.42.0-preview2",
            "description": "This event is triggered whenever the user's location changes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2",
                "urn:tailjs:core#SessionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "session_location"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "accuracy": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "Like the bars indicating signal strength on mobile phones - higher is better, yet nobody knows the exact definition.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "zip": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "lat": {
                    "primitive": "number",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "lng": {
                    "primitive": "number",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "continent": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "description": "The continent is considered safe to store with anonymous tracking.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "country": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "description": "The country is considered safe to store with anonymous tracking.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "subdivision": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                }
            }
        },
        "GeoEntity": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "name": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "geonames": {
                    "primitive": "integer",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "iso": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "confidence": {
                    "primitive": "number",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "AnchorNavigationEvent": {
            "version": "0.42.0-preview2",
            "description": "The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3)",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "anchor_navigation"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "anchor": {
                    "primitive": "string",
                    "required": true,
                    "description": "The name of the anchor.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ConsentEvent": {
            "version": "0.42.0-preview2",
            "description": "The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.\n\nThis event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device. In the same way, such information is cleared if the user opts out.\n\nBackends are expected to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.\n\nThe user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with  {@link  nonEssentialTracking  }  `false` revokes the consent if already given. The event should ideally be sent from a cookie disclaimer.\n\nGranular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events. This event only ensures that non-essential tracking information is not stored at the user unless consent is given.\n\nAlso, \"consent\" and \"event\" rhymes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "consent"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "consent": {
                    "reference": "urn:tailjs:core#UserConsent@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                }
            }
        },
        "CommerceEvent": {
            "version": "0.42.0-preview2",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {}
        },
        "CartUpdatedEvent": {
            "version": "0.42.0-preview2",
            "description": "Indicates that a shopping cart was updated.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2",
                "urn:tailjs:core#CommerceEvent@0.42.0-preview2",
                "urn:tailjs:core#CartEventData@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "cart_updated"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "CartEventData": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.42.0-preview2",
                "urn:tailjs:core#OrderQuantity@0.42.0-preview2"
            ],
            "properties": {
                "action": {
                    "primitive": "string",
                    "enum": [
                        "add",
                        "remove",
                        "update",
                        "clear"
                    ],
                    "description": "The way the cart was modified.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderQuantity": {
            "version": "0.42.0-preview2",
            "description": "Base information for the amount of an item added to an  {@link  Order }  or cart that is shared between  {@link  CartUpdatedEvent }  and  {@link  OrderLine } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceData@0.42.0-preview2"
            ],
            "properties": {
                "units": {
                    "primitive": "integer",
                    "description": "The number of units.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "item": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "The item that relates to this quantity. If not explicitly set it will get its value from the closest associated content in a  {@link  UserInteractionEvent }  context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderEvent": {
            "version": "0.42.0-preview2",
            "description": "An order submitted by a user.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.42.0-preview2",
                "urn:tailjs:core#Order@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "Order": {
            "version": "0.42.0-preview2",
            "description": "Represents an order for tracking purposes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "internalId": {
                    "primitive": "string",
                    "description": "A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "orderId": {
                    "primitive": "string",
                    "required": true,
                    "description": "The order ID as shown to the user.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "items": {
                    "item": {
                        "reference": "urn:tailjs:core#OrderLine@0.42.0-preview2"
                    },
                    "description": "Optionally, all the items in the order at the time the order was made.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "discount": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total discount given for this order including the sum of individual order line discounts",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "delivery": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The delivery cost, if any, and it is not included as an order line.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "vat": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The VAT included in the total.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "total": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total of the order including VAT, delivery, discounts and any other costs added.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "The payment method selected for the order.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency used for the order.\n\nThe order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderLine": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity@0.42.0-preview2",
                "urn:tailjs:core#Tagged@0.42.0-preview2"
            ],
            "properties": {
                "lineId": {
                    "primitive": "string",
                    "description": "An optional identifier that makes it possible to reference this order line directly.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "vat": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The VAT included in the total.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "total": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total for this order line including VAT",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartAbandonedEvent": {
            "version": "0.42.0-preview2",
            "description": "The shopping cart was abandoned. Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.42.0-preview2",
                "urn:tailjs:core#Order@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "cart_abandoned"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "lastCartEvent": {
                    "primitive": "timestamp",
                    "description": "The timestamp for the last time the shopping cart was modified by the user before abandonment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderStatusEvent": {
            "version": "0.42.0-preview2",
            "description": "Base event for events that related to an order changing status.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {
                "order": {
                    "primitive": "string",
                    "required": true,
                    "description": "A reference to the order that changed status.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "OrderConfirmedEvent": {
            "version": "0.42.0-preview2",
            "description": "An order was accepted.\n\nThis may be useful to track if some backend system needs to validate if the order submitted by the user is possible, or just for monitoring whether your site is healthy and actually processes the orders that come in.\n\nThis event should also imply that the user got a confirmation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderStatusEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_confirmed"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "OrderCancelledEvent": {
            "version": "0.42.0-preview2",
            "description": "An order was cancelled.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderStatusEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_cancelled"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "cancelledByUser": {
                    "primitive": "boolean",
                    "description": "Indicates if the user cancelled the order or it happended during a background process.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderCompletedEvent": {
            "version": "0.42.0-preview2",
            "description": "An order was cancelled.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderStatusEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_completed"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "PaymentEvent": {
            "version": "0.42.0-preview2",
            "description": "Events related to order payments.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.42.0-preview2"
            ],
            "properties": {
                "orderReference": {
                    "primitive": "string",
                    "required": true,
                    "description": "The reference to order for which payment was made, either  {@link  Order.orderId }  or  {@link  Order.internalId } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "amount": {
                    "primitive": "number",
                    "format": "decimal",
                    "required": true,
                    "description": "The amount paid.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "A domain specific value for the payment method.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency of the payment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PaymentAcceptedEvent": {
            "version": "0.42.0-preview2",
            "description": "The payment for an order was accepted.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "payment_accepted"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "finalPayment": {
                    "primitive": "boolean",
                    "description": "The payment was the final payment, hence completed the order.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PaymentRejectedEvent": {
            "version": "0.42.0-preview2",
            "description": "A payment for the order was rejected.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "payment_rejected"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "AuthenticationEvent": {
            "version": "0.42.0-preview2",
            "description": "Events related to users signing in, out etc..",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {}
        },
        "SignInEvent": {
            "version": "0.42.0-preview2",
            "description": "A user signed in.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "sign_in"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "userId": {
                    "primitive": "string",
                    "required": true,
                    "description": "The user that signed in.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "evidence": {
                    "primitive": "string",
                    "description": "Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked by abusing the API.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SignOutEvent": {
            "version": "0.42.0-preview2",
            "description": "A user actively signed out. (Session expiry doesn't count).",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "sign_out"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "userId": {
                    "primitive": "string",
                    "description": "The user that signed out.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SystemEvent": {
            "version": "0.42.0-preview2",
            "description": "Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "properties": {}
        },
        "ImpressionTextStats": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "text": {
                    "primitive": "string",
                    "required": true,
                    "description": "The source text.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "length": {
                    "primitive": "number",
                    "required": true,
                    "description": "The number of characters in the text.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "characters": {
                    "primitive": "number",
                    "required": true,
                    "description": "The number of word characters (a letter or number followed by any number of letters, numbers or apostrophes) in the text.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "words": {
                    "primitive": "number",
                    "required": true,
                    "description": "The number of words in the text. A word is defined as a group of consecutive word characters.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "sentences": {
                    "primitive": "number",
                    "required": true,
                    "description": "The number of sentences in the text. A sentence is defined as any group of characters where at least one of them is a word character terminated by `.`, `!`, `?` or the end of the text.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "lix": {
                    "primitive": "number",
                    "required": true,
                    "description": "The LIX index for the text. The measure gives an indication of how difficult it is to read. (https://en.wikipedia.org/wiki/Lix_(readability_test))",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "readTime": {
                    "primitive": "number",
                    "required": true,
                    "description": "The estimated time it will take for an average user to read all the text. The duration is in milliseconds since that is the time precision for ECMAScript timestamps.\n\nThe estimate is assuming \"Silent reading time\" which seems to be 238 words per minute according to [Marc Brysbaert's research] (https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786?via%3Dihub)",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ImpressionEvent": {
            "version": "0.42.0-preview2",
            "description": "The event is triggered when more than 75 % of the component's has been visible for at least 1 second, or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.\n\n\nThis only gets tracked for components that have impression tracking configured,  either via  {@link  TrackingSettings.impressions } , \"track-impressions\" in the containing DOM or \"--track-impressions\" via CSS.\n\nNote that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via  {@link  TrackingSettings.impressions } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "impression"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "impressions": {
                    "primitive": "integer",
                    "description": "The number of times the component was sufficiently visible  to count as an impression. This counter will increment if the component leaves the user's viewport and then comes back.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "duration": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "version": "0.42.0-preview2",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "top": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The top 25 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "middle": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The middle 25 - 75 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "bottom": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The bottom 25 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.42.0-preview2",
                    "description": "The length and number of words in the component's text. This combined with the active time can give an indication of how much the user read if at all.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "seen": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "read": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "The percentage of the text the user can reasonably be assumed to have read  based on the number of words and duration of the impression.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ImpressionRegionStats": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "duration": {
                    "primitive": "duration",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "impressions": {
                    "primitive": "integer",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "seen": {
                    "primitive": "number",
                    "format": "percentage",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "read": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ResetEvent": {
            "version": "0.42.0-preview2",
            "description": "An event that can be used to reset the current session and optionally also device. Intended for debugging and not relayed to backends.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2",
                "urn:tailjs:core#SystemEvent@0.42.0-preview2"
            ],
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "reset"
                    ],
                    "required": true,
                    "description": "The type name of the event.\n\nAll concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.\n\nSince this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "includeDevice": {
                    "primitive": "boolean",
                    "description": "Whether only the session or also the device should be reset.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "includeConsent": {
                    "primitive": "boolean",
                    "description": "Whether to also reset the consent.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ConfiguredComponent": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.42.0-preview2"
            ],
            "properties": {
                "track": {
                    "reference": "urn:tailjs:core#ComponentTrackingBehavior@0.42.0-preview2",
                    "description": "Settings for how the component will be tracked.\n\nThese settings are not tracked, that is, this property is stripped from the data sent to the server.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentTrackingBehavior": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackingBehavior@0.42.0-preview2"
            ],
            "properties": {
                "promote": {
                    "primitive": "boolean",
                    "description": "Always include content and component, also if it is a parent component. By default only the closest component will be included.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-promote`. CSS: `--track-promote: 0/no/false/1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "secondary": {
                    "primitive": "boolean",
                    "description": "The component will only be tracked with the closest non-secondary component as if the latter had the  {@link  promote }  flag.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-secondary`. \\ CSS: `--track-secondary: 0/no/false/1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "TrackingBehavior": {
            "version": "0.42.0-preview2",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "disable": {
                    "primitive": "boolean",
                    "description": "Disable tracking for this element and elements below it.\n\nHTML attribute: `track-disable`. \\ CSS: `--track-disable: 0/no/false/1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "region": {
                    "primitive": "boolean",
                    "description": "Track the coordinates of the visible region occupied by the component or content.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-region`. \\ CSS: `--track-region: 0/no/false/1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "primitive": "boolean",
                    "description": "Track clicks. Note that clicks are always tracked if they cause navigation.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-clicks`. CSS: `--track-clicks: 0/no/false/1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "forms": {
                    "primitive": "boolean",
                    "description": "Track forms.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "formFields": {
                    "version": "0.42.0-preview2",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "privacy": {
                            "primitive": "string",
                            "enum": [
                                "never",
                                "anonymous",
                                "indirect",
                                "direct",
                                "sensitive"
                            ],
                            "description": "Minimum consent classification before values are tracked.\n\nHTML attribute: `track-form-privacy`. CSS: `--track-form-privacy: 0/no/false/1/yes/true/none/checkbox-only/all`.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "values": {
                            "union": [
                                {
                                    "primitive": "boolean"
                                },
                                {
                                    "primitive": "string",
                                    "enum": [
                                        "checkbox-only"
                                    ]
                                }
                            ],
                            "description": "Which form fields to track values for.\n\nHTML attribute: `track-form-field`. CSS: `--track-form-field: 0/no/false/1/yes/true/none/checkbox-only/all`.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "impressions": {
                    "union": [
                        {
                            "primitive": "boolean"
                        },
                        {
                            "version": "0.42.0-preview2",
                            "abstract": false,
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "extends": [],
                            "properties": {
                                "delay": {
                                    "primitive": "number",
                                    "description": "Do not count the impression before the component has been visible for at least this amount of milliseconds",
                                    "readonly": false,
                                    "visibility": "public",
                                    "classification": "anonymous",
                                    "purposes": {},
                                    "required": false
                                }
                            }
                        }
                    ],
                    "description": "Track impressions, that is, when the component's element becomes visible in the user's browser. This goes well with  {@link  region } .\n\nNot inherited by child components.\n\nNot configurable via HTML/CSS.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#FormEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "form_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "name": {
                    "primitive": "string",
                    "description": "The name of the form that was submitted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "completed": {
                    "primitive": "boolean",
                    "description": "Indicates whether the form was completed (that is, submitted). If this is false it means that the form was abandoned.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "activeTime": {
                    "primitive": "duration",
                    "description": "The duration the user was actively filling the form.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "totalTime": {
                    "primitive": "duration",
                    "description": "The total duration from the user started filling out the form until completion or abandonment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "fields": {
                    "key": {
                        "primitive": "string",
                        "required": true
                    },
                    "value": {
                        "reference": "urn:tailjs:core#FormField@0.42.0-preview2"
                    },
                    "description": "All fields in the form (as detected).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "ref": {
                    "primitive": "string",
                    "description": "A correlation ID. If a hidden input element has the name \"_tailref\", the HTML attribute \"track-ref\" or css variable \"--track-ref: 1\" its value will be used. If all of the above is difficult to inject in the way the form is embedded, the form element or any of its ancestors may alternatively have the HTML attribute \"track-ref\" with the name of the hidden input field that contains the reference.\n\nIf no initial value a unique one will be assigned. Make sure to store the value in receiving end.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentClickEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ComponentClickEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_click_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentClickIntentEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ComponentClickIntentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_click_intent_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "item": {
                        "reference": "urn:tailjs:core#Position@0.42.0-preview2"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "elements": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.42.0-preview2"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentViewEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ComponentViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "component_view_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "NavigationEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#NavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "navigation_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "href": {
                    "primitive": "string",
                    "required": false,
                    "description": "The destination URL of the navigation",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "exit": {
                    "primitive": "boolean",
                    "description": "Indicates that the user went away from the site to an external URL.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anchor": {
                    "primitive": "string",
                    "description": "The anchor specified in the href if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "external": {
                    "primitive": "boolean",
                    "description": "Indicates that the navigation is to an external domain",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "self": {
                    "primitive": "boolean",
                    "required": false,
                    "description": "Whether the navigation happened in the current view or a new tab/window was opened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "domain": {
                    "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                    "description": "The domain of the destination",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ScrollEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ScrollEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "scroll_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "offset": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The offset relative to the page size (100 % is bottom, 0 % is top)",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "scrollType": {
                    "primitive": "string",
                    "enum": [
                        "fold",
                        "article-end",
                        "page-middle",
                        "page-end",
                        "read",
                        "offset"
                    ],
                    "description": "The type of scrolling.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SearchEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#SearchEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "search_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "query": {
                    "primitive": "string",
                    "description": "The free-text query used for the search.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "filters": {
                    "item": {
                        "reference": "urn:tailjs:core#SearchFilter@0.42.0-preview2"
                    },
                    "description": "Any filters that were applied to the search in addition to the query. Filters are assumed combined using \"and\" semantics unless they are for the same field in which case it means that the field must match at least one of the values.\n\nFor example \"age>=10 AND age<=20 AND (type=horse OR type=cat)\"",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "hits": {
                    "primitive": "integer",
                    "description": "The number of results that matched the query.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "topHits": {
                    "item": {
                        "reference": "urn:tailjs:core#SearchResult@0.42.0-preview2"
                    },
                    "description": "If some or all of the results are relevant for analytics or AI, they can be included here.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionStartedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#SessionStartedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "session_started_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "url": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "sessionNumber": {
                    "primitive": "integer",
                    "description": "The total number of sessions from the given device (regardless of username).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeSinceLastSession": {
                    "primitive": "duration",
                    "description": "The time since the last session from this device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "UserAgentEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#UserAgentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "user_agent_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "hasTouch": {
                    "primitive": "boolean",
                    "description": "Has touch",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "deviceType": {
                    "primitive": "string",
                    "enum": [
                        "mobile",
                        "tablet",
                        "desktop"
                    ],
                    "description": "The device type (inferred from screen size). The assumption is:   - anything width a logical device pixel width less than 480 is a phone,   - anything with a logical device pixel width less than or equal to 1024 (iPad Pro12.9\") is a tablet,   - the rest are desktops.\n\nDevice width is the physical width of the device regardless of its orientation.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "userAgent": {
                    "primitive": "string",
                    "required": false,
                    "description": "User agent string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "languages": {
                    "item": {
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.42.0-preview2"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "version": "0.42.0-preview2",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "iana": {
                            "primitive": "string",
                            "required": true,
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "offset": {
                            "primitive": "number",
                            "required": true,
                            "description": "The offset from GMT in hours.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        }
                    },
                    "required": false
                },
                "screen": {
                    "version": "0.42.0-preview2",
                    "description": "Screen",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "dpr": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device pixel ratio (i.e. how many physical pixels per logical CSS pixel)",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "width": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device width.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "height": {
                            "primitive": "number",
                            "required": true,
                            "description": "Device height.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {}
                        },
                        "landscape": {
                            "primitive": "boolean",
                            "description": "The device was held in landscape mode.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "webdriver": {
                    "primitive": "boolean",
                    "description": "The browser is being controlled by automation (e.g., Selenium or Puppeteer).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ViewEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "view_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "tab": {
                    "primitive": "string",
                    "description": "An identifier that is locally unique to some scope.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "href": {
                    "primitive": "string",
                    "required": false,
                    "description": "The fully qualified URL as shown in the address line of the browser excluding the domain.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "hash": {
                    "primitive": "string",
                    "description": "The hash part of the URL (/about-us#address).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "path": {
                    "primitive": "string",
                    "description": "The path portion of the URL.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "duration": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "For how long the view was active. This is set via patches",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "httpStatus": {
                    "primitive": "number",
                    "description": "The HTTP status for the response associated with the view.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "utm": {
                    "version": "0.42.0-preview2",
                    "description": "Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "source": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "medium": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "campaign": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "term": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "content": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "queryString": {
                    "key": {
                        "primitive": "string",
                        "required": true
                    },
                    "value": {
                        "item": {
                            "primitive": "string"
                        }
                    },
                    "description": "The query string parameters in the URL, e.g. utm_campaign. Each parameter can have multiple values, for example If the parameter is specified more than once. If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order). A parameter without a value will get recorded as an empty string.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "domain": {
                    "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                    "description": "The domain part of the href, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "landingPage": {
                    "primitive": "boolean",
                    "description": "Indicates that this was the first view in the first tab the user opened. Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "firstTab": {
                    "primitive": "boolean",
                    "description": "Indicates that no other tabs were open when the view happened. This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity. By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tabNumber": {
                    "primitive": "integer",
                    "description": "The tab number in the current session.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "tabViewNumber": {
                    "primitive": "integer",
                    "description": "The view number in the current tab. This is kept as a convenience, yet technically redundant since it follows from timestamps and context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "redirects": {
                    "primitive": "integer",
                    "description": "Number of redirects that happened during navigation to this view.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "navigationType": {
                    "primitive": "string",
                    "enum": [
                        "navigate",
                        "back-forward",
                        "prerender",
                        "reload"
                    ],
                    "description": "Navigation type.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clientNavigation": {
                    "primitive": "string",
                    "enum": [
                        "push",
                        "replace"
                    ],
                    "description": "The navigation happened without making an additional request to the server (the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "mode": {
                    "primitive": "string",
                    "enum": [
                        "manual",
                        "automatic"
                    ],
                    "description": "Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "externalReferrer": {
                    "version": "0.42.0-preview2",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "href": {
                            "primitive": "string",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "domain": {
                            "reference": "urn:tailjs:core#Domain@0.42.0-preview2",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The size of the user's viewport (e.g. browser window) and how much it was scrolled when the page was opened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewType": {
                    "primitive": "string",
                    "description": "The type of view, e.g. \"page\" or \"screen\".",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "definition": {
                    "reference": "urn:tailjs:core#View@0.42.0-preview2",
                    "description": "The primary content used to generate the view including the personalization that led to the decision, if any. If views are loaded asynchronously in a way where they are not available immediately after a user navigates to a URL on the website, the view definition may follow from a separate patch event.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionLocationEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#SessionLocationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "session_location_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "accuracy": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "Like the bars indicating signal strength on mobile phones - higher is better, yet nobody knows the exact definition.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "zip": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "lat": {
                    "primitive": "number",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "lng": {
                    "primitive": "number",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "continent": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "description": "The continent is considered safe to store with anonymous tracking.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "country": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "description": "The country is considered safe to store with anonymous tracking.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "subdivision": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                }
            }
        },
        "AnchorNavigationEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#AnchorNavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "anchor_navigation_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "anchor": {
                    "primitive": "string",
                    "required": false,
                    "description": "The name of the anchor.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ConsentEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ConsentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "consent_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "consent": {
                    "reference": "urn:tailjs:core#UserConsent@0.42.0-preview2",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartUpdatedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#CartUpdatedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "cart_updated_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "price": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The unit price.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "unit": {
                    "primitive": "string",
                    "description": "The unit the item is sold by.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variation": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "stock": {
                    "primitive": "number",
                    "description": "The current number of units in stock.\n\nUse fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "units": {
                    "primitive": "integer",
                    "description": "The number of units.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "item": {
                    "reference": "urn:tailjs:core#ExternalReference@0.42.0-preview2",
                    "description": "The item that relates to this quantity. If not explicitly set it will get its value from the closest associated content in a  {@link  UserInteractionEvent }  context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "action": {
                    "primitive": "string",
                    "enum": [
                        "add",
                        "remove",
                        "update",
                        "clear"
                    ],
                    "description": "The way the cart was modified.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#OrderEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "internalId": {
                    "primitive": "string",
                    "description": "A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "orderId": {
                    "primitive": "string",
                    "required": false,
                    "description": "The order ID as shown to the user.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "items": {
                    "item": {
                        "reference": "urn:tailjs:core#OrderLine@0.42.0-preview2"
                    },
                    "description": "Optionally, all the items in the order at the time the order was made.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "discount": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total discount given for this order including the sum of individual order line discounts",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "delivery": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The delivery cost, if any, and it is not included as an order line.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "vat": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The VAT included in the total.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "total": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total of the order including VAT, delivery, discounts and any other costs added.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "The payment method selected for the order.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency used for the order.\n\nThe order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartAbandonedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#CartAbandonedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "cart_abandoned_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "internalId": {
                    "primitive": "string",
                    "description": "A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "orderId": {
                    "primitive": "string",
                    "required": false,
                    "description": "The order ID as shown to the user.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "items": {
                    "item": {
                        "reference": "urn:tailjs:core#OrderLine@0.42.0-preview2"
                    },
                    "description": "Optionally, all the items in the order at the time the order was made.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "discount": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total discount given for this order including the sum of individual order line discounts",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "delivery": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The delivery cost, if any, and it is not included as an order line.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "vat": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The VAT included in the total.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "total": {
                    "primitive": "number",
                    "format": "decimal",
                    "description": "The total of the order including VAT, delivery, discounts and any other costs added.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "The payment method selected for the order.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency used for the order.\n\nThe order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "lastCartEvent": {
                    "primitive": "timestamp",
                    "description": "The timestamp for the last time the shopping cart was modified by the user before abandonment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderConfirmedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#OrderConfirmedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_confirmed_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "order": {
                    "primitive": "string",
                    "required": false,
                    "description": "A reference to the order that changed status.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "OrderCancelledEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#OrderCancelledEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_cancelled_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "order": {
                    "primitive": "string",
                    "required": false,
                    "description": "A reference to the order that changed status.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "cancelledByUser": {
                    "primitive": "boolean",
                    "description": "Indicates if the user cancelled the order or it happended during a background process.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "OrderCompletedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#OrderCompletedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "order_completed_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "order": {
                    "primitive": "string",
                    "required": false,
                    "description": "A reference to the order that changed status.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "PaymentAcceptedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#PaymentAcceptedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "payment_accepted_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "orderReference": {
                    "primitive": "string",
                    "required": false,
                    "description": "The reference to order for which payment was made, either  {@link  Order.orderId }  or  {@link  Order.internalId } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "amount": {
                    "primitive": "number",
                    "format": "decimal",
                    "required": false,
                    "description": "The amount paid.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "A domain specific value for the payment method.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency of the payment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "finalPayment": {
                    "primitive": "boolean",
                    "description": "The payment was the final payment, hence completed the order.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PaymentRejectedEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#PaymentRejectedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "payment_rejected_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "orderReference": {
                    "primitive": "string",
                    "required": false,
                    "description": "The reference to order for which payment was made, either  {@link  Order.orderId }  or  {@link  Order.internalId } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "amount": {
                    "primitive": "number",
                    "format": "decimal",
                    "required": false,
                    "description": "The amount paid.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "paymentMethod": {
                    "primitive": "string",
                    "description": "A domain specific value for the payment method.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "currency": {
                    "primitive": "string",
                    "description": "The currency of the payment.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SignInEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#SignInEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "sign_in_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "userId": {
                    "primitive": "string",
                    "required": false,
                    "description": "The user that signed in.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "evidence": {
                    "primitive": "string",
                    "description": "Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked by abusing the API.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SignOutEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#SignOutEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "sign_out_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "userId": {
                    "primitive": "string",
                    "description": "The user that signed out.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ImpressionEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ImpressionEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "impression_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "Relevant components and their content in the scope of the activated element.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.42.0-preview2"
                    },
                    "description": "The content associated with an element that is not contained by a component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "area": {
                    "primitive": "string",
                    "description": "An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timeOffset": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.42.0-preview2",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.42.0-preview2",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.42.0-preview2",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "impressions": {
                    "primitive": "integer",
                    "description": "The number of times the component was sufficiently visible  to count as an impression. This counter will increment if the component leaves the user's viewport and then comes back.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "duration": {
                    "reference": "urn:tailjs:core#ViewTimingData@0.42.0-preview2",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "version": "0.42.0-preview2",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "abstract": false,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "extends": [],
                    "properties": {
                        "top": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The top 25 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "middle": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The middle 25 - 75 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        },
                        "bottom": {
                            "reference": "urn:tailjs:core#ImpressionRegionStats@0.42.0-preview2",
                            "description": "The bottom 25 % of the component.",
                            "readonly": false,
                            "visibility": "public",
                            "classification": "anonymous",
                            "purposes": {},
                            "required": false
                        }
                    },
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.42.0-preview2",
                    "description": "The length and number of words in the component's text. This combined with the active time can give an indication of how much the user read if at all.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "seen": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "The percentage of the component's area that was visible at some point during the  {@link  View  } .",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "read": {
                    "primitive": "number",
                    "format": "percentage",
                    "description": "The percentage of the text the user can reasonably be assumed to have read  based on the number of words and duration of the impression.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ResetEvent_patch": {
            "version": "0.42.0-preview2",
            "description": "Patch type for urn:tailjs:core#ResetEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.42.0-preview2"
            ],
            "system": "patch",
            "properties": {
                "type": {
                    "primitive": "string",
                    "enum": [
                        "reset_patch"
                    ],
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "includeDevice": {
                    "primitive": "boolean",
                    "description": "Whether only the session or also the device should be reset.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "includeConsent": {
                    "primitive": "boolean",
                    "description": "Whether to also reset the consent.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        }
    },
    "variables": {
        "session": {
            "@info": {
                "reference": "urn:tailjs:core#SessionInfo@0.42.0-preview2",
                "readonly": false,
                "visibility": "trusted-write",
                "classification": "anonymous",
                "purposes": {},
                "dynamic": false
            },
            "@session_reference": {
                "primitive": "string",
                "classification": "anonymous",
                "visibility": "trusted-only",
                "readonly": false,
                "purposes": {},
                "dynamic": false
            },
            "@consent": {
                "reference": "urn:tailjs:core#UserConsent@0.42.0-preview2",
                "description": "User consent is a dynamic variable that is resolved by the Tracker and cannot be set.",
                "readonly": false,
                "visibility": "public",
                "classification": "anonymous",
                "purposes": {},
                "dynamic": true
            }
        },
        "device": {
            "@info": {
                "reference": "urn:tailjs:core#DeviceInfo@0.42.0-preview2",
                "readonly": false,
                "visibility": "trusted-write",
                "classification": "indirect",
                "purposes": {},
                "dynamic": false
            }
        }
    }
};

const scripts$1 = {
    production: "(()=>{var e,t,r,n,i,a,o,l,u,s,v,c,f,h,y,g,m,b,w,k,S,O=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},_=(e,t)=>{if(!e||O(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=_(r.contentWindow,t))return e}catch{}},C=e=>null==e?e:\"undefined\"!=typeof window?_(window,O(e)):globalThis,j=!1,U=Symbol(),M=e=>(j=!0,e),F=Symbol(),q=Symbol(),P=Symbol.iterator,z=(e,t,r)=>{if(null==e||e[F])throw t;e=C(e);if(!e)throw t;var o,i=()=>(e,t,r,n,i)=>{var a,l,o=0;for(l of e)if((a=t?t(l,o++,n,i):l)!==U){if(a===M)break;if(n=a,r&&r.push(a),j){j=!1;break}}return r||n},a=(e.Array.prototype[F]=(e,t,r,n,i)=>{for(var o,l=0,u=e.length;l<u;l++)if(o=e[l],(o=t?t(o,l,n,i):o)!==U){if(o===M)break;if(n=o,r&&r.push(o),j){j=!1;break}}return r||n},i());for(o of(e.Object.prototype[F]=(e,t,r,n,o)=>{if(e[P])return(e.constructor===Object?a:Object.getPrototypeOf(e)[F]=i())(e,t,r,n,o);var u,v,s=0;for(v in e)if(u=[v,e[v]],(u=t?t(u,s++,n,o):u)!==U){if(u===M)break;if(n=u,r&&r.push(u),j){j=!1;break}}return r||n},e.Object.prototype[q]=function(){var t,e;return this[P]||this[eW]?this.constructor===Object?null!=(e=this[eW]())?e:this[P]():((e=Object.getPrototypeOf(this))[q]=null!=(t=e[eW])?t:e[P],this[q]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))o[F]=i(),o[q]=o[P];return e.Number.prototype[F]=(e,t,r,n,i)=>a(R(e),t,r,n,i),e.Number.prototype[q]=R,e.Function.prototype[F]=(e,t,r,n,i)=>a(D(e),t,r,n,i),e.Function.prototype[q]=D,r()};function*R(e=this){for(var t=0;t<e;t++)yield t}function*D(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var B=(e,t,r,n)=>{try{var i;return e?null!=(i=e[F](e,t,void 0,r,n))?i:r:null==e?e:void 0}catch(i){return z(e,i,()=>B(e,t,r,n))}},W=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[F](e,t,r,n,i):null==e?e:void 0}catch(a){return z(e,a,()=>W(e,t,r,n,i))}},J=(e,t=!0,r=!1)=>W(e,!0===t?e=>null!=e?e:U:t?t.has?e=>null==e||t.has(e)===r?U:e:(n,i,a)=>!t(n,i,a,e)===r?n:U:e=>e||U),L=(e,t)=>!t&&eZ(e)?e[e.length-1]:B(e,(r,n,i)=>!t||t(r,n,i,e)?r:U),V=(e,t,r=-1,n=[],i,a=e)=>W(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(V(e,void 0,r-1,n,e),U):e,n,i,a),K=(e,t,r)=>{var n,i,a,o;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),B(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(o=t?t(e,r,n):e)[0]&&es(a,o[0],()=>[]).push(o[1])}):(a={},(e,r,l)=>(o=t?t(e,r,l):e)&&void 0!==o[0]&&(null!=(r=(n=a)[i=o[0]])?r:n[i]=[]).push(o[1]))),a},H=(e,t,r,n)=>{try{return G(e,t,void 0,r,n)}catch(i){return z(e,i,()=>H(e,t,r,n))}},G=async(e,t,r,n,i)=>{if(null==(e=await e))return e;if(!1!==e){for(var l=e[q](),u=0;(a=l.next())&&!(a=e5(a)?await a:a).done;){var a=a.value;if(e5(a)&&(a=await a),(a=await(t?t(a,u++,n,i):a))!==U){if(a===M)break;if(n=a,null!=r&&r.push(a),j){j=!1;break}}}return r||n}},X=e=>null==e||e instanceof Set?e:new Set(e[P]&&\"string\"!=typeof e?e:[e]),Z=e=>void 0===e?[]:null!=e&&e[P]&&\"string\"!=typeof e?e:[e],Y=e=>null==e||eZ(e)?e:e[P]&&\"string\"!=typeof e?[...e]:[e],Q=(e,t)=>!0===B(e,(r,n,i)=>(t?t(r,n,i,e):r)?j=!0:r),ee=(e,...t)=>{var r,n;for(n of e=!t.length&&e3(e)?e:[e,...t])if(null!=n){if(e3(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},et=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),er=(e,t,r)=>Y(e).sort(\"function\"==typeof t?(e,n)=>et(t(e),t(n),r):eZ(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=et(t[a](e),t[a](n),r);return i}:(e,t)=>et(e,t,r):(e,r)=>et(e,r,t)),en=(e,t,r,n=!1)=>{var i,a;return B(e,n?(e,n,o)=>(void 0!==(i=t?t(e,n,o):e)&&o!==(o=r(o,i))&&(a=e),o):(e,n,o)=>void 0!==(i=t?t(e,n,o):e)?a=r(o,i):o),a},ei=(e,t,r)=>!t&&eZ(e)?Math.max(...e):en(e,t,(e,t)=>null==e||e<t?t:e,r),ea=Symbol(),eo=Symbol(),el=Symbol(),eu=(e,t,r)=>{if(null==e||e[eo])throw t;var i,e=C(e);if(!e||e.Object.prototype[ea])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[ea]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[eo]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[ea]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[eo]=i.has,i[el]=function(...e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[el]=e.Array.prototype.push,[e.Object,e.Array]))i[ea]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[eo]=function(e){return this[e]};return r()},es=(e,t,r)=>{try{if(null==e)return e;var n=e[eo](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[ea](t,r));e[ea](t,n)}return n}catch(n){return eu(e,n,()=>es(e,t,r))}},ev=(e,t,r)=>{try{return!0===(null==e?void 0:e[ea](t,r,!0))}catch(n){return eu(e,n,()=>ev(e,t,r))}},ec=(e,t,r)=>{try{return e[ea](t,r),r}catch(n){return eu(e,n,()=>ec(e,t,r))}},ef=(e,t)=>ep(e,t,void 0),ep=(e,t,r)=>{try{var n=e[eo](t);return e[ea](t,r),n}catch(n){return eu(e,n,()=>ep(e,t,r))}},ey=(e,t=-1)=>{var r=null==e?void 0:e.constructor;if(r!==Object&&r!==Array)return e;var i,n=r();for(i in e){var a=e[i];n[i]=t&&((null==a?void 0:a.constructor)===Object||eZ(a))?ey(a,t-1):a}return n},eg=(e,...t)=>{try{return null!=e&&e[el](...t),e}catch(r){return eu(e,r,()=>eg(e,...t))}},em=(e,t)=>{var r={};return B(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==U&&e!==M)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==U&&e!==M)?r[e[0]]=e[1]:e),r},eb=(e,t,r=!1)=>{try{var n;return e.constructor===Object?r?(n=e,B(t,t=>{t&&(void 0===t[1]?t[0]in e:e[t[0]]!==t[1])&&(n===e&&(e={...n}),void 0===t[1]?delete e[t[0]]:e[t[0]]=t[1])})):B(t,t=>t&&(void 0===t[1]?delete e[t[0]]:e[t[0]]=t[1])):B(t,t=>t&&e[ea](t[0],t[1])),e}catch(n){return eu(e,n,()=>eb(e,t,r))}},ew=(e,...t)=>{var r,n;return e&&t.length&&(\"boolean\"==typeof t[0]?1<t.length&&(r=e,n=t[0],2<t.length?B(t,(t,i)=>0<i&&(e=eb(e,t,n&&e===r))):e=eb(e,t[1],n)):1<t.length?B(t,t=>eb(e,t,!0)):eb(e,t[0])),e},ek=(e,t,r={})=>{if(null!=e){var o,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(o of Z(t))B(o,t=>{var l,u;t&&([t,l]=t,u=e[t],(a?null==u:void 0===u)?e[t]=l:n&&(null==l?void 0:l.constructor)===Object&&(null==u?void 0:u.constructor)===Object?ek(u,l,r):i&&(e[t]=l))})}return e},eS=(e,t)=>null==e?e:em(t,t=>void 0!==e[t]||t in e?[t,e[t]]:U),eT=e=>\"function\"==typeof e?e():e,ex=(e,t)=>{var r,n,i;if(e)return e0(t)?(i={},e0(e)&&(B(e,([e,a])=>{if(!eE(a,t[e],-1)){if(e0(r=a)){if(!(a=ex(a,t[e])))return;[a,r]=a}i[e]=a,(null!=n?n:n=ey(t))[e]=r}}),n)?[i,n]:void 0):[e,e]},eA=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return Object.assign(r,{push(n,i){for(var a=[n,i],o=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u,s,v=r[l];if(e(a[1],v[0])<0)return o(r.splice(l,0,a));if(e(a[0],v[1])<=0){if(e(a[0],v[0])<0&&(u=v[0]=a[0]),0<e(a[1],v[1])&&(u=v[1]=a[1]),!((null==(s=r[l+1])?void 0:s[0])<v[1]))return o(null!=u);u=a=r.splice(l--,1)[0]}}return o(a&&(r[r.length]=a))},width:0})};function eI(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var eN=(e,t=e=>Error(e))=>{throw eG(e=eT(e))?t(e):e},eE=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(!eZ(e)&&!e0(e)||!eZ(t)&&!e0(t)||e.length!==t.length)return!1;var i,n=0;for(i in e){if(e[i]!==t[i]&&!eE(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length},e$=(e,t,...r)=>e===t||0<r.length&&r.some(t=>e$(e,t)),eO=(e,t)=>null!=e?e:eN(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),e_=(e,t=!0,r)=>{try{return e()}catch(e){return e2(t)?eY(e=t(e))?eN(e):e:eL(t)?console.error(t?eN(e):e):t}finally{null!=r&&r()}};class eC extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),eI(this,\"_action\",void 0),eI(this,\"_result\",void 0),this._action=e}}var ej=e=>new eC(async()=>eT(e)),eU=async(e,t=!0,r)=>{try{return await eT(e)}catch(e){if(!eL(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},eM=e=>e===ez,eF=void 0,eq=Number.MAX_SAFE_INTEGER,eP=!1,ez=!0,eR=()=>{},eD=e=>e,eB=Symbol.iterator,eW=Symbol.asyncIterator,eJ=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:eF,eL=e=>\"boolean\"==typeof e,eV=eJ(eL,e=>0!=e&&(1==e||\"false\"!==e&&\"no\"!==e&&(\"true\"===e||\"yes\"===e||eF))),eK=e=>e!==eP,eG=e=>\"string\"==typeof e,eX=eJ(eG,e=>null==e?void 0:e.toString()),eZ=Array.isArray,eY=e=>e instanceof Error,eQ=e=>e&&\"object\"==typeof e,e0=e=>(null==e?void 0:e.constructor)===Object,e1=e=>\"symbol\"==typeof e,e2=e=>\"function\"==typeof e,e5=e=>!(null==e||!e.then),e3=(e,t=!1)=>!(null==e||!e[eB]||\"string\"==typeof e&&!t),e6=(e,t)=>null==e?eF:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,e4=(e,t,r)=>e[0]===t&&e[e.length-1]===r,e8=e=>eG(e)&&(e4(e,\"{\",\"}\")||e4(e,\"[\",\"]\")),e9=\"undefined\"!=typeof performance?(e=ez)=>e?Math.trunc(e9(eP)):performance.timeOrigin+performance.now():Date.now,e7=(e=!0,t=()=>e9())=>{var r,n=+e*t(),i=0;return(a=e,o)=>(r=e?i+=-n+(n=t()):i,o&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t,r)=>{var n,i,a,o,l;return\"function\"==typeof t?tt(e,{...r,then:t}):({then:n,timeout:i=-1,pollInterval:a=25}=null!=t?t:{},o=e9(),(l=e())?(null!=n&&n(l,0),l):(async()=>{for(;!(l=e())&&(i<=0||e9()-o<i);)await tl(a);return l?(null!=n&&n(l,e9()-o),l):eN(`Target not resolved after ${i} ms.`)})())},tr=(e,t=0)=>{var e=e2(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:o=!1,once:l=!1,callback:u=()=>{},raf:s}=e,v=(t=null!=(e=e.frequency)?e:0,0),d=tu(!0).resolve(),c=e7(!a),f=c(),p=async e=>{if(!v||!i&&d.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await eU(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||t<=0||l)&&g(!1),!(m.busy=!1)},h=()=>v=setTimeout(()=>s?requestAnimationFrame(y):y(),t<0?-t:t),y=()=>{m.active&&p(),m.active&&h()},g=(e,t=!e)=>(c(e,t),clearTimeout(v),m.active=!!(v=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,g(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(g(!0),m.trigger(),m):g(!0):g(!1):m,trigger:async e=>await p(e)&&(g(m.active),!0)};return m.toggle(!a,o)};function tn(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class ti{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ta,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tn(this,\"_promise\",void 0),this.reset()}}class ta{then(e,t){return this._promise.then(e,t)}constructor(){var e;tn(this,\"_promise\",void 0),tn(this,\"resolve\",void 0),tn(this,\"reject\",void 0),tn(this,\"value\",void 0),tn(this,\"error\",void 0),tn(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===eF||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?eT(t):new Promise(r=>setTimeout(async()=>r(await eT(t)),e)):eN(`Invalid delay ${e}.`),tu=e=>new(e?ti:ta),tv=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),o=()=>n!==(n=!0)&&(t(i),!0);return o(),[a,o]},eJ=()=>{var e,t=new Set;return[(r,n)=>{var i=tv(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tc=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tp=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),th=(e,t,r)=>null==e||\"string\"==typeof e?e:e[eB]?J(\"function\"==typeof t?W(e,t):(r=t,e),tp,!0).join(null!=r?r:\"\"):\"boolean\"==typeof e?\"\":e.toString(),ty=JSON.stringify,tg=(e,t=!1)=>null==e||\"\"===e?eF:\"object\"==typeof e?e:t?e_(()=>JSON.parse(e+\"\"),()=>{}):JSON.parse(e+\"\"),tm=(e,t,r,n)=>{var i,l;return e||0===e?\"function\"==typeof t?tm(W(e,t),r,n):(i=[],n=B(e,(e,t,r)=>tp(e)?U:(r&&i.push(r),e.toString())),[t,l]=eZ(t)?t:[,t],l=(null!=l?l:l=\"and\")[0]===(t=null==t?\",\":t)?l+\" \":\" \"+(l?l+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+l+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:eF},tb=(e,t)=>{var o,r=[],n={},i={},a=0;for(o in t)o===t[o]&&(Object.defineProperty(i,o,{value:o,writable:!1,enumerable:!0,configurable:!1}),n[o]=a++,r.push(o));var l=(t,r=!0)=>null==t?eF:null!=n[t]?t:r?eN(`The ${e} \"${t}\" is not defined.`):eF,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:l,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[l(e)],t=n[l(t)];return e<t?-1:+(t<e)},...u}}),i},tw=Symbol(),tk=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,o;return e?(null==(o=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(o[1]=\"\"),o[2]=o[1]&&(eG(t)?t=[t]:eZ(t))&&B(t,e=>1<(i=o[1].split(e)).length?M(i):eF)||(o[1]?[o[1]]:[]),o):eF},tS=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?eF:tN(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,o,l,u,s,v,d,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&eF,authority:a,user:o,password:l,host:null!=u?u:s,port:null!=v?parseInt(v):eF,path:d,query:!1===t?c:c?tT(c,{...n,delimiters:t}):eF,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":eF),e}),tT=(e,t)=>tx(e,\"&\",t),tx=(e,t,{delimiters:r=!0,...n}={})=>{e=W(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,o]=null!=(e=tk(e,{...n,delimiters:!1===r?[]:!0===r?eF:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<o.length?o:a]:[e,a]:U}),t=em(K(e,!1),([e,t])=>[e,!1!==r?1<t.length?ee(t):t[0]:t.join(\",\")]);return t&&(t[tw]=e),t},tA=(e,t)=>t&&null!=e?t.test(e):eF,tI=(e,t,r)=>tN(e,t,r,!0),tN=(e,t,r,n=!1)=>{t.lastIndex=0;var i=t.exec(e);if(!r)return i;for(var a=n?[]:eF;i;){var o=r(...i);if(o===M||(o!==U&&(n?a.push(o):a=o),(null==(i=t.global?t.exec(e):null)||!i[0].length)&&++t.lastIndex>=e.length))break}return a},tE=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),t$=/\\z./g,tO=(e,t)=>(t=th(X(J(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):t$,t_={},tC=e=>e instanceof RegExp,tj=(r,n=[\",\",\" \"])=>{var i;return tC(r)?r:eZ(r)?tO(W(r,e=>null==(e=tj(e,n))?void 0:e.source)):eL(r)?r?/./g:t$:eG(r)?null!=(i=(e=t_)[t=r])?i:e[t]=tN(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tO(W(tU(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${th(n,tE)}]`)),e=>e&&`^${th(tU(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tE(tM(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):eF},tU=(e,t,r=!0)=>null==e?eF:r?J(tU(e,t,!1)):e.split(t),tM=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tF=(tb(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),tb(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"})),tq=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],tP=em(tq,e=>[e,e]),tz=(Object.freeze(em(tq,e=>[e,!0])),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),tR=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},tD={names:tq,specificNames:tq.filter(e=>\"necessary\"!==e),parse(e,{names:t=!1,includeDefault:r=!0,validate:n=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),eG(e)&&(e=e.split(\",\")),eZ(e)){var a,i={};for(a of e)if(a!==t4){if(!tP[a]){n&&eN(`The purpose name '${a}' is not defined.`);continue}\"necessary\"!==a&&(i[a]=!0)}e=i}return t?(t=W(e,([e,t])=>tP[e]&&t?e:U)).length||!r?t:[\"necessary\"]:e},get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=tz(i,n))&&!t[tz(i,n)])return!1;if(e=tR(e,n),t=tR(t,n),r){for(var a in t)if(tP[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(tP[a]&&e[a]&&!t[a])return!1;return!0}var o=!1;for(a in e)if(tP[a]&&e[a]){if(t[a])return!0;o=!0}return!o}},tB=e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${tm(tD.parse(null==e?void 0:e.purposes,{names:!0}))} purposes.`},tW={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes},source:e.source},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&tD.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),applyOptional:(e,t={})=>(e&&(t.security||(e.purposes.security=!0),t.personalization||(e.purposes.personalization=e.purposes.functionality)),e),serialize(e,t){null!=t&&t.security||delete(e={...e,purposes:{...e.purposes}}).purposes.security;t=tD.parse(e.purposes,{names:!0,includeDefault:!1});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t+(e.source?` (${e.source})`:\"\"):null},deserialize(e,t){var n;return e?(e=null!=(e=e.match(/^\\s*([^:]+):((?:\\s+[^(]|[^\\s])*)(?:\\s+\\((.+)\\)\\s*$)?/))?e:[],{classification:null!=(n=tF.parse(e[1],!1))?n:\"anonymous\",purposes:null!=(n=tD.parse(e[2],{validate:!1}))?n:{},source:e[3]}):t?tW.clone(t):{classification:\"anonymous\",purposes:{}}}},tJ=(e,t)=>(!(r=null==e?void 0:e.metadata)||t&&(delete r.posted,delete r.queued,Object.entries(r).length)||delete e.metadata,e),tV=e=>{var t;return e&&`${e.id}\u0000${(null==(t=e.dataSource)?void 0:t.id)||\"\"}\u0000${e.source||\"\"}\u0000`+(e.name||\"\")},tK=(e,t)=>{var r;return e&&t&&e.id===t.id&&e.source===t.source&&(null==(r=e.dataSource)?void 0:r.id)===(null==t||null==(r=t.dataSource)?void 0:r.id)&&e.name===t.name},tH=e=>{if(e)for(var t in e)if(null!=e[t])return!1;return!0},tG=e=>!(!e||tH(e.components)&&tH(e.content)),tX=e=>tZ(e,tY),tZ=(e,t,r,n)=>{if(e)r&&(e=[...e,...r]);else{if(!r)return;e=r}var i,a=e;if(e.length){for(var o=0;o<e.length;o++)if(!(i=e[o])||n&&i!=(i=n(i))){for(a=e.slice(0,o++),i&&a.push(i);o<e.length;o++)!(i=e[o])||n&&!(i=n(i))||a.push(i);break}if(null!=a&&a.length){if(1<a.length&&t){var u,l=new Map;for(u of a)l.set(t(u),u);l.size<a.length&&(a=[...l.values()])}}else a=void 0}return a},tY=tV,tQ=e=>{var t;return!e||tH(e.components)&&tH(e.content)&&!e.area&&!e.cart&&tH(e.track)&&tH(e.extensions)&&tH(e.tags)&&(!e.view||!(null!=(t=e.view)&&t.definition)&&tH(null==(t=e.view)?void 0:t.tags))},t0=e=>!!e&&\"string\"!=typeof e&&Symbol.iterator in e,t1=(e,t,r=!0)=>{if(e===t)return t2(e,r);if(!t)return e||void 0;if(t0(t)){var n,l,o=e||void 0;for(l of t)l&&(o=t1(o,l,r));return o}return e?{components:tZ(e.components,tY,t.components),content:tZ(e.content,tY,t.content),area:t.area||e.area,cart:t.cart||e.cart,track:e.track?t.track?{...e.track,...t.track}:e.track:t.track||void 0,layer:null!=(n=t.layer)?n:e.layer,layerPriority:null!=(n=t.layerPriority)?n:e.layerPriority,tags:tZ(e.tags,t5,t.tags),view:e.view?t.view?{definition:t.view.definition||e.view.definition,tags:null!=(n=tZ(e.view.tags,t5,t.view.tags))?n:[]}:e.view:t.view,extensions:e.extensions?t.extensions?{...e.extensions,...t.extensions}:e.extensions:t.extensions}:t2(t,r)||void 0},t2=(e,t=!1)=>{var r,a,o;if(e&&(t||!tQ(e)))return t=void 0,(r=tZ(e.components,tY))!==e.components&&((null!=t?t:t={}).components=r),(r=tZ(e.content,tY))!==e.content&&((null!=t?t:t={}).content=r),(r=tZ(e.tags,t5))!==e.tags&&((null!=t?t:t={}).tags=r),void 0!==(r=e.view)&&(r?(a=r.definition||void 0,o=tZ(r.tags,t5),a===r.definition&&o===r.tags||((null!=t?t:t={}).view={definition:a,tags:o})):(null!=t?t:t={}).view=void 0),t?{...e,...t}:e},t5=e=>{var t;return`${e.tag}\u0000${null!=(t=e.value)?t:\"\"}\u0000`+(e.eventType||\"\")},t3=(e,t)=>{if(null!=e&&\"object\"==typeof e){var n,r=e;for(n in e){var i=e[n];null!=i&&\"object\"==typeof i&&i!==(i=\"track\"===n?void 0:(\"tags\"===n?t6:t3)(i,t))&&((r=r===e?{...e}:r)[n]=i)}}return e},t6=(e,t,r)=>e?tZ(e,t5,r,!1===t?void 0:e=>e.eventType?e.eventType===t?{...e,eventType:void 0}:void 0:e):void 0,t4=\"@schema\",t8=Symbol(),t9=e=>void 0===e?\"undefined\":tc(JSON.stringify(e),40,!0),t7=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,re=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rt=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rr=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rn=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,ri=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:t9(t)+` ${r}.`}),t8),ra=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&ra((t?parseInt:parseFloat)(e),t,!1),ro={},tq=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,l=null!=(l=ro[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?l:ro[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:ri(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&t7.test(e)&&!isNaN(+new Date(e))?e:ri(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||ra(e,!1,!1)){if(!ra(e,!0,!1))return ri(n,e,\"is not a valid UNIX timestamp\");e*=1}else if(!re.test(e)||isNaN(+new Date(e)))return ri(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>ra(e,!0,!1)?+e:ri(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>ra(e,!0,!1)?+e:ri(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>ra(e,!1,!1)?e:ri(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rr.test(e)?e:ri(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rr.exec(e);return r?r[2]?e:ri(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):ri(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rr.exec(e);return r?\"urn\"!==r[1]||r[2]?ri(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:ri(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rn.test(e)?e.toLowerCase():ri(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:ri(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rt.exec(e))?void 0:r[1].toLowerCase():null)?r:ri(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${t9(e)}' is not a supported primitive type.`)}})(e),v=e.maxLength,c=(null!=v&&(d=l,l=(e,t)=>(e=d(e,t))!==t8&&e.length>v?ri(t,e,`exceeds the maximum allowed ${v} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,d=l,l=(e,t)=>(e=d(e,t))===t8||(null==c||c<=e)&&(null==f||e<=f)?e:ri(t,e,p)),\"enum\"in e){var d=l;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=d(e,t))===t8)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+tm(e.enum.map(e=>JSON.stringify(e)),\"or\"),l=(e,t)=>(e=d(e,t))===t8||u.has(e)?e:ri(t,e,p)}X(u)})({primitive:\"string\",format:\"uri\"}),tb(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),ru=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rs=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rv=((T={})[T.Success=200]=\"Success\",T[T.Created=201]=\"Created\",T[T.NotModified=304]=\"NotModified\",T[T.BadRequest=400]=\"BadRequest\",T[T.Forbidden=403]=\"Forbidden\",T[T.NotFound=404]=\"NotFound\",T[T.Conflict=409]=\"Conflict\",T[T.Error=500]=\"Error\",T),rd=(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status),rc=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rf(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rp=e=>{var t=ru(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${rv[e.status]}.`:`${t} failed with status ${e.status} - ${rv[e.status]}${r?` (${r})`:\"\"}.`};class rh extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rf(this,\"succeeded\",void 0),rf(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rc(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rc(e,!1)))?t:[]}}var ry=e=>!!e.callback,rg=e=>!!e.poll,rm=Symbol(),rb=(e,t)=>{var r;return n=>{var i;return!rd(n,!1)||(i=!rd(n,!1)||e.poll(n.value,t?n===t:n[rm]===e,r),r=n.value,i)}},rw=(e,t,r,{poll:n,logCallbackError:i}={})=>{var a=eZ(t)?t:[t],o=[],l=(async()=>{var s,u,v,d,t=await r(a.filter(e=>e)),l=[];for(u of a)u&&null!=(s=t.get(u))&&(s[rm]=u,ry(u)&&l.push([u,s,e=>!0===u.callback(e)]),rg(u))&&l.push([u,s,rb(u)]);for([u,v,d]of l)try{var c=\"get\"===e?async e=>!0===await d(e)&&(null==n?void 0:n(u,c)):d;await c(v)}catch(t){var f=`${e} callback for ${ru(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),u=async(r,n)=>{var v,d,c,i=await l,u=[],s=[];for(v of a)v?null==(c=i.get(v))?s.push(`No result for ${ru(v)}.`):!r||rc(c,n||\"set\"===e)?u.push(r&&c.status===rv.NotFound?void 0:1<r?null!=(d=c.value)?d:void 0:c):s.push(rp(c)):u.push(void 0);if(s.push(...o),s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rh(u,s.join(\"\\n\"));return a===t?u:u[0]};return Object.assign(ej(()=>u(1,!1)),{as:()=>u(1,!1),all:()=>u(0,!1),successOnly:()=>u(1,!0),value:(e=!1)=>u(2,e),values:(e=!1)=>u(2,e)})},rk=e=>e&&\"string\"==typeof e.type,rS=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rT=/%[A-F0-9]{2}/i,rx=e=>e&&rT.test(e)?e_(()=>decodeURIComponent(e),e):e,rA=/(?:^|[\\s,&#])(?:([^\\s,:=\"'&#~]+)::)?([^\\s,='\"&#~]+)(?:\\s*=\\s*(?:\"((?:\\\\.|[^\"\\\\]+)*)\"?|'((?:\\\\.|[^'\\\\]+)*)'?|((?:\\s*[^,~&#\\s]+)+)))?(?:~\\s*((?:\\d*\\.\\d)?\\d*))?/g,rI=/^(?:([^:]+)::)?(.*)$/,rN=/^:+|:+$|(:):*/g,rE=(e,t,r)=>(e&&(e3(e)?B(e,e=>r=rE(e,t,r)):\"object\"!=typeof e||\"tag\"in e?eG(e)?tN(e,rA,(e,n,i,a,o,l,u)=>{r=rO(r,{tag:rx(i),value:rx(null!=(a=null==(i=null!=a?a:o)?void 0:i.replace(/\\\\(.)/g,(e,t)=>\"r\"===t?\"\\r\":\"n\"===t?\"\\n\":\"t\"===t?\"\\t\":t))?a:l),score:u?parseFloat(u):void 0,eventType:null==t?void 0:t.eventType},null==t?void 0:t.prefix,rx(n)||(null==t?void 0:t.ns))}):r=rO(r,e,null==t?void 0:t.prefix,null==t?void 0:t.ns):r=rj(e,t,r)),r),r$=(e,t)=>{var[,e,i]=e.match(rI);return[e,(t?t+\":\"+i:i).replace(rN,\"$1\")]},rO=(e,t,r,n)=>(t&&([r=n,n]=r$(t.tag,r),n)&&(null!=e?e:e=[]).push((n=r?r+\"::\"+n:n)!==t.tag||\"\"===t.value?{...t,tag:n,value:t.value||void 0}:t),e),r_={value:!0,score:!0,eventType:!0},rC=(e,t,r,n,i)=>{if(t)if(eZ(t))for(var a of t)e=rC(e,a,r,n,i);else if(\"object\"!=typeof t)e=rO(e,{tag:\"\",value:\"string\"==typeof t?t:void 0},i,r);else if(\"value\"in t||\"score\"in t||\"eventType\"in t)e=rO(e,{tag:\"\",eventType:n,...t},i,r);else for(var o in t){var s,l=t[o];l&&!r_[o]&&([o=r,s]=r$(o),e=rC(e,l,o,n,i+\":\"+s))}return e},rj=(e,t,r)=>rC(r,e,null==t?void 0:t.ns,null==t?void 0:t.eventType,null!=t&&t.prefix?t.prefix+\":\":\"\"),rU=tb(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rM=tb(\"variable scope\",{...rU,...tq}),rF=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rq=e=>null!=e&&!!e.scope&&null!=rU.ranks[e.scope],rP=e=>null==e?e:[e.scope,e.key,e.entityId].join(\"\\0\"),rz=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],entityId:e[2]}},rD=()=>()=>eN(\"Not initialized.\"),rB=window,rW=document,rJ=null,rL=(tt(()=>document.body,e=>rJ=e),(e,t)=>!(null==e||!e.matches(t))),rV=eq,rK=(e,t,r=(e,t)=>rV<=t)=>{for(var n=0,i=eP;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&(o=t(e,(e,t)=>(null!=e&&(a=e,i=t!==ez&&null!=a),ez),n-1))!==eP&&o!==M&&!i;){var a,l,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rW&&(e=null==o||null==(l=o.ownerDocument.defaultView)?void 0:l.frameElement)}return a},rH=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||eV(e);case\"n\":return parseFloat(e);case\"j\":return e_(()=>JSON.parse(e),eR);case\"h\":return e_(()=>nW(e),eR);case\"e\":return e_(()=>null==nL?void 0:nL(e),eR);default:return eZ(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:rH(e,t[0])):void 0}},rG=(e,t,r)=>rH(null==e?void 0:e.getAttribute(t),r),rX=(e,t,r)=>rK(e,(e,n)=>n(rG(e,t,r))),rZ=e=>null==e?void 0:e.getAttributeNames(),rY=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,rQ=e=>null!=e?e.tagName:null,r0=()=>({x:(n=r1(eP)).x/(rJ.offsetWidth-window.innerWidth)||0,y:n.y/(rJ.offsetHeight-window.innerHeight)||0}),r1=e=>({x:e6(scrollX,e),y:e6(scrollY,e)}),r2=(e,t)=>tM(e,/#.*$/,\"\")===tM(t,/#.*$/,\"\"),r5=(e,t,r=ez)=>(i=r3(e,t))&&{xpx:i.x,ypx:i.y,x:e6(i.x/rJ.offsetWidth,4),y:e6(i.y/rJ.offsetHeight,4),pageFolds:r?i.y/window.innerHeight:void 0},r3=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:a,y:o}=r4(e),{x:a,y:o}):void 0,r4=(e,t=!0)=>e?(l=e.getBoundingClientRect(),n=t?r1(eP):{x:0,y:0},{x:e6(l.left+n.x),y:e6(l.top+n.y),width:e6(l.width),height:e6(l.height)}):void 0,r8=(e,t,r,n={capture:!0,passive:!0})=>(t=Y(t),tv(r,r=>B(t,t=>e.addEventListener(t,r,n)),r=>B(t,t=>e.removeEventListener(t,r,n)))),r7=()=>({...n=r1(ez),width:window.innerWidth,height:window.innerHeight,totalWidth:rJ.offsetWidth,totalHeight:rJ.offsetHeight}),ne=new WeakMap,nt=e=>{var t;if(null!=e)return!(t=null==(t=ne.get(e))?void 0:t.merged)&&e.getAttribute&&(t=t2(tg(e.getAttribute(\"data-tailjs\"),!0)))&&ne.set(e,{merged:t,layers:new Map([[null,t]])}),t},nr=(e,t,r=null,n)=>{if(null!=e){var i=ne.get(e);if(\"function\"==typeof t)t=t(null==i?void 0:i.merged);else if(t&&\"clear\"in t)return void ne.delete(e);null==r&&(r=null==t?void 0:t.layer);t=t2(t);return i?((e,t,r)=>es(e,t)!==ec(e,t,r))(i.layers,r,null!=t?t:void 0)&&(i.layers.size?i.merged=t1(void 0,er(i.layers.values(),e=>null!=(e=e.layerPriority)?e:0)):(ne.delete(e),i=void 0)):t&&ne.set(e,i={merged:t,layers:new Map([[r,t]])}),nv(),null==i?void 0:i.merged}},nn=(e,t=eP)=>(t?\"--track-\":\"data-track-\")+e,ni=(e,t,r,n,i,a)=>(null!=t&&t[1]&&B(rZ(e),o=>{var l,u;return null!=(u=(l=t[0])[o])?u:l[o]=(a=eP,!eG(n=B(t[1],([t,r,n],i)=>tA(o,t)&&(a=void 0,!r||rL(e,r))&&M(null!=n?n:o)))||(i=e.getAttribute(o))&&!eV(i)||(r=rE(i,n?{prefix:tM(n,/\\-/g,\":\")}:void 0,r)),a)}),r),na=(e,t)=>{var r,n;return(s===(s=nh.tags)?u:(n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...(r=e=>e?tC(e)?[[e]]:e3(e)?V(e,r,1):[e0(e)?[tj(e.match),e.selector,e.prefix]:[tj(e)]]:[])(V(s,([,e])=>e,1))]],u=(e,t)=>ni(e,n,t)))(e,t)},no=(e,t)=>th(ee(rY(e,nn(t,ez)),rY(e,nn(\"base-\"+t,ez))),\" \"),nl={},nu=(e,t,r=no(e,\"attributes\"))=>{var n;return r&&ni(e,null!=(n=nl[r])?n:nl[r]=[{},tI(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tj(r||n),,t])],t),rE(no(e,\"tags\"),void 0,t)},ns=new WeakMap,nv=(setInterval(()=>nv,500),()=>ns=new WeakMap),nd=(e,t,r=eP,n)=>\"\"===(c=nc(e,t,r,n))||(null==c?void 0:eV(c)),nc=(e,t,r=eP,n)=>{var i;if(e)return((null==(i=ns.get(e))?void 0:i[+r].get(t))||ec(es(ns,e,()=>[new Map,new Map])[+r],t,{value:n&&(v=nt(e))&&null!=(v=n(v))?v:(r?rK(e,(e,r)=>r(nc(e,t,eP,n)),e2(r)?r:void 0):rG(e,nn(t))||rY(e,nn(t,ez)))||void 0})).value},nf=(e,t,r)=>{if(e){var n=[];if(rK(e,e=>n.unshift(e)),r=nu(e,r),B(n,e=>{var t;r=rE(null==(t=nt(e))?void 0:t.tags,void 0,r=na(e,r))}),null!=r&&r.length)return{tags:t6(r,t)}}return{}},nh={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]},defaultTracking:{clicks:!0,disable:!1,formFields:{values:\"checkbox-only\",privacy:\"anonymous\"},forms:!0,impressions:!1,region:!1}},ny=[],ng=[],nm=(e,t=0)=>e.charCodeAt(t),nw=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>ny[ng[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(ng[(16515072&t)>>18],ng[(258048&t)>>12],ng[(4032&t)>>6],ng[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nk=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=ny[nm(e,r++)]<<2|(t=ny[nm(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=ny[nm(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|ny[nm(e,r++)]);return a},nS={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nT=(e=256)=>e*Math.random()|0,nA={exports:{}},{deserialize:nI,serialize:nN}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)l(e[o]);else l(e);return i.subarray(0,a);function l(e,i){var c,o;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(r)))})(e);break;case\"string\":(c=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var l=e.charCodeAt(o);if(l<128)a[i++]=l;else{if(l<2048)a[i++]=l>>6|192;else{if(55295<l&&l<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(o);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+o+\" out of range\");a[i++]=(l=65536+((1023&l)<<10)+(1023&u))>>18|240,a[i++]=l>>12&63|128}else a[i++]=l>>12|224;a[i++]=l>>6&63|128}a[i++]=63&l|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(o);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?v([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?v([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(v([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),d(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((o=(c=e).length)<=255?v([196,o]):v(o<=65535?[197,o>>>8,o]:[198,o>>>24,o>>>16,o>>>8,o]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):v(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(l(r),l(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?l(t.invalidTypeReplacement(e),!0):l(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):v(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)l(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function v(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function d(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return v(t-144);if(160<=t&&t<=191)return d(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return l(4);if(203===t)return l(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return d(-1,1);if(218===t)return d(-1,2);if(219===t)return d(-1,4);if(220===t)return v(-1,2);if(221===t)return v(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function o(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function l(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=o(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=o(t));for(var r={};0<e--;)r[i()]=i();return r}function v(e,t){e<0&&(e=o(t));for(var r=[];0<e--;)r.push(i());return r}function d(t,r){t<0&&(t=o(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i=(i+=String.fromCharCode(a>>10|55296))+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=o(t));t=o(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nA.exports=n})(),(T=nA.exports)&&T.__esModule&&Object.prototype.hasOwnProperty.call(T,\"default\")?T.default:T),nE=\"$ref\",n$=(e,t,r)=>e1(e)?eF:r?t!==eF:null===t||t,nO=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,o,l=(e,t,n=e[t],i=n$(t,n,r)?s(n):eF)=>(n!==i&&(i!==eF||eZ(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||e2(e)||e1(e))return eF;if(eQ(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(o=null==a?void 0:a.get(e)))return e[nE]||(e[nE]=o,u(()=>delete e[nE])),{[nE]:o};if(e0(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)l(e,t);else!e3(e)||e instanceof Uint8Array||(!eZ(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?l(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return e_(()=>{var r;return t?nN(null!=(r=s(e))?r:null):e_(()=>JSON.stringify(e,eF,2*!!n),()=>JSON.stringify(s(e),eF,2*!!n))},!0,()=>null==i?void 0:i.forEach(e=>e()))},n_=e=>{var t,r,n=e=>eQ(e)?e[nE]&&(r=(null!=t?t:t=[])[e[nE]])?r:(e[nE]&&delete(t[e[nE]]=e)[nE],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(eG(e)?e_(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),eF)):null!=e?e_(()=>null!=e&&e.length?nI(e):eF,()=>(console.error(\"Invalid message received.\",e,Error().stack),eF)):e)},nC=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var o,l,u,i=(e,r)=>\"number\"==typeof e&&!0===r?e:u(e=eG(e)?new Uint8Array(W(e.length,t=>255&e.charCodeAt(t))):t?e_(()=>JSON.stringify(e),()=>JSON.stringify(nO(e,!1,n))):nO(e,!0,n),r),a=e=>null==e?eF:e_(()=>n_(e),eF);return t?[e=>nO(e,!1,n),a,(e,t)=>i(e,t)]:([o,l,u]=(e=>{for(var t,r,n,i,a,l,o=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},y=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=y(nT()));for(r=0,a[n++]=y(d^16*nT(16)+i);r<t;a[n++]=y(d^e[r++]));for(;i--;)a[n++]=nT();return a}:e=>e,e?e=>{for(h(),r=0;r<3;y(e[r++]));if((t=e.length-4-((d^y(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=d^y(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(l=eL(t)?64:t,h(),[o,u]=nS[l],r=0;r<e.length;o=BigInt.asUintN(l,(o^BigInt(d^y(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]})(e),[(e,t)=>(t?eD:nw)(o(nO(e,!0,n))),e=>null!=e?n_(l(e instanceof Uint8Array?e:(r&&e8(e)?a:nk)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=f?f:f=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},tb=(nC(),nC(null,{json:!0,decodeJson:!0}),nC(null,{json:!0,prettify:!0}),tU(\"\"+rW.currentScript.src,\"#\")),tq=tU(\"\"+(tb[1]||\"\"),\";\"),nM=tb[0],nF=tq[1]||(null==(T=tS(nM,{delimiters:!1}))?void 0:T.host),nq=e=>!(!nF||(null==(e=tS(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nF))!==ez),tb=(...e)=>tM(th(e),/(^(?=\\?))|(^\\.(?=\\/))/,nM.split(\"?\")[0]),nz=tb(\"?\",\"var\"),nR=tb(\"?\",\"mnt\"),nD=(tb(\"?\",\"usr\"),Symbol()),[nB,nW]=nC(),[nJ,nL]=[rD,rD],nV=!0,[tq,nH]=eJ(),nZ=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:eG(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[nY,nQ]=eJ(),[n0,n1]=eJ(),n2=e=>n3!==(n3=e)&&nQ(n3,n8(!0,!0)),n5=e=>n6!==(n6=!!e&&\"visible\"===document.visibilityState)&&n1(n6,!e,n4(!0,!0)),n3=(nY(n5),!0),n6=!1,n4=e7(!1),n8=e7(!1),n9=(r8(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>n2(!1)),r8(window,[\"pageshow\",\"resume\"],()=>n2(!0)),r8(document,\"visibilitychange\",()=>(n5(!0),n6&&n2(!0))),nQ(n3,n8(!0,!0)),!1),n7=e7(!1),[,it]=eJ(),ir=tr({callback:()=>n9&&it(n9=!1,n7(!1)),frequency:2e4,once:!0,paused:!0}),ii=()=>!n9&&(it(n9=!0,n7(!0)),ir.restart()),ia=(r8(window,[\"focus\",\"scroll\"],ii),r8(window,\"blur\",()=>ir.trigger()),tt(()=>document.body,e=>{r8(e,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],ii),ii()}),()=>n7()),io=0,il=void 0,iu=()=>(null!=il?il:rD())+\"_\"+is(),is=()=>(e9(!0)-(parseInt(il.slice(0,-2),36)||0)).toString(36)+\"_\"+(++io).toString(36),ic=new Map,ip={id:il,heartbeat:e9()},ih={knownTabs:new Map([[il,ip]]),variables:new Map},[iy,ig]=eJ(),[im,ib]=eJ(),iw=rD,ik=(e,t=e9())=>{e=ic.get(eG(e)?e:rP(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iS=(...e)=>{var t=e9();return ix(W(e,e=>(e.cache=[t],[rs(e),{...e,created:t,modified:t,version:\"0\"}])))},iT=e=>null!=(e=W(e,e=>{var t,r;return e&&(t=rP(e[0]),(r=ic.get(t))!==e[1])?[t,e[1],r,e[0]]:U}))?e:[],ix=e=>{var r,n,e=iT(e);null!=e&&e.length&&(r=e9(),B(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),ew(ic,e),(n=J(e,([,,,e])=>0<rM.compare(e.scope,\"tab\"))).length&&iw({type:\"patch\",payload:em(n)}),ib(W(e,([,e,t,r])=>[r,e,t]),ic,!0))},[,iI]=(tq((e,t)=>{nY(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),il=null!=(n=null==r?void 0:r[0])?n:e9(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),ic=new Map(ee(J(ic,([,e])=>\"view\"===(null==e?void 0:e.scope)),W(null==r?void 0:r[1],e=>[rP(e),e])))):sessionStorage.setItem(\"_tail:state\",e([il,W(ic,([,e])=>e&&\"view\"!==e.scope?e:U)]))},!0),iw=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([il,t,r])),localStorage.removeItem(\"_tail:state\"))},r8(window,\"storage\",e=>{var a,o,l;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==il||([e,{type:a,payload:o}]=e,\"query\"===a?r.active||iw({type:\"set\",payload:[W(ih.knownTabs),W(ih.variables)]},e):\"set\"===a&&r.active?(ih.knownTabs=new Map(o[0]),ih.variables=new Map(o[1]),ic=new Map(o[1]),r.trigger()):\"patch\"===a?(l=iT(W(o,([e,t])=>[rz(e),t])),ew(ih.variables,o),ew(ic,o),ib(W(l,([,e,t,r])=>[r,e,t]),ic,!1)):\"tab\"===a&&(ec(ih.knownTabs,e,o),o)&&ig(\"tab\",o,!1))});var r=tr(()=>tt(()=>document.body,()=>ig(\"ready\",ih,!0)),-25),n=tr({callback(){var e=e9()-1e4;B(ih.knownTabs,([t,r])=>r[0]<e&&ec(ih.knownTabs,t,void 0)),ip.heartbeat=e9(),iw({type:\"tab\",payload:ip})},frequency:5e3,paused:!0});nY(e=>(e=>{iw({type:\"tab\",payload:e?ip:void 0}),e?(r.restart(),iw({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),eJ()),[iN,iE]=eJ(),i$=(({timeout:t=1e3,encrypt:r=!0,retries:n=50}={})=>{var i=()=>(r?nL:nW)(localStorage.getItem(\"_tail:rq\")),a=0,o=()=>localStorage.setItem(\"_tail:rq\",(r?nJ:nB)([il,e9()+t]));return async(r,l,u=null!=l?1:n)=>{for(;u--;){var v=i();if((!v||v[1]<e9())&&(o(),(null==(v=i())?void 0:v[0])===il))return 0<t&&(a=setInterval(()=>o(),t/2)),eU(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var d=tu(),[v]=r8(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||d.resolve()});e=[tl(null!=l?l:t),d],await Promise.race(e.map(e=>e2(e)?e():e)),v()}var e;null==l&&eN(\"_tail:rq could not be acquired.\")}})(),iO=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&nV;var i,a,o=!1,l=r=>{var l=e2(t)?null==t?void 0:t(i,r):t;if(!1===l)return!1;iI(e,i=null!=l&&!0!==l?l:i,r,e=>(o=i===eF,i=e));l=!o&&(a=n?nJ(i,!0):JSON.stringify(i));return!!l&&!!l.length&&l};if(!r)return i$(()=>H(1,async t=>{var o;return l(t)?400<=(o=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?M(eN(\"Invalid response: \"+await o.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(o=null!=(t=n?new Uint8Array(await o.arrayBuffer()):await o.text())&&t.length?null==(o=n?nL:JSON.parse)?void 0:o(t):eF)&&iE(o),M(o)):M}));l(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&eN(\"Beacon send failed.\")},T=[\"scope\",\"key\",\"entityId\",\"source\"],iC=[...T,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\",\"passive\"],ij=[...T,\"value\",\"force\",\"ttl\",\"version\"],iU=Symbol(),iM=new Map,iq=Symbol(),iP=(e,t)=>{var r;return(null!=(r=(h=e)[y=iq])?r:h[y]=new Set).add(t),e},iR=Symbol(),iD=Symbol(),iB=[.75,.33],iW=[.25,.33],iL=e=>!!(e=\"string\"==typeof e?eV(e):e)&&{delay:!0===e||null==e.delay?nh.impressionThreshold:e.delay},iK=e=>W(er(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${ru(e)}, ${rq(e)?\"client-side memory only\":tB(null==(e=e.schema)?void 0:e.usage)})`,eP]:U),iG=()=>{var i,o,a,r=null==rB?void 0:rB.screen;return r?({width:r,height:i,orientation:a}=r,o=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rB.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rB.devicePixelRatio,width:r,height:i,landscape:o}}):{}},iX=e=>e({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==m?void 0:m.clientId,languages:W(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return{id:e,language:r,region:n,primary:0===t,preference:t+1}}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},webdriver:navigator.webdriver,...iG()}),iZ=(e,t=\"A\"===rQ(e)&&rG(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),iY=(e,t=rQ(e))=>\"INPUT\"===t||\"SELECT\"===t||\"TEXTAREA\"==t||\"LABEL\"===t,iQ=(e,t=rQ(e),r=nd(e,\"button\"),n=rG(e,\"type\"))=>r===ez||r!==eP&&(\"A\"===t||\"BUTTON\"===t||\"INPUT\"===t&&(\"button\"===(n=null==n?void 0:n.toLowerCase())||\"submit\"===n||\"checkbox\"===n&&!e.form)),i0=(e,t=!1)=>{var r;return{tagName:\"INPUT\"===e.tagName&&e.type?e.tagName+`[type=${e.type}]`:e.tagName,text:tc((null==(r=rG(e,\"title\"))?void 0:r.trim())||(null==(r=rG(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),50),className:e.className||void 0,href:null==(r=e.href)?void 0:r.toString(),rect:t?r4(e):void 0}},i2=e=>{if(g)return g;if(eG(e)&&([n,e]=nW(e),e=nC(n,{decodeJson:!0})[1](e)),ek(nh,[e],{overwrite:!0}),null!=(n=rB[nh.name])&&n.__isTracker)return g=rB[nh.name];(e=>{nL===rD&&([nJ,nL]=nC(e,{json:!e,prettify:!1}),nV=!!e,nH(nJ,nL))})(ef(nh,\"encryptionKey\"));var n,s,v,d,c,f,p,h,y,m,b,w,k,S,l=ef(nh,\"key\"),u=null!=(n=null==(e=rB[nh.name])?void 0:e._)?n:[];if(eZ(u))return s=[],v=[],d=(e,...t)=>{var r=ez;v=J(v,n=>e_(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:g,unsubscribe:()=>r=eP}),r},(e=>t=>nZ(e,t))(n)))},c=[],p=((e,t)=>{var r=tr(async()=>{var e=W(iM,([e,t])=>Q(t,e=>null==(e=e[iU])?void 0:e.refresh)?{...rz(e),refresh:!0}:U);e.length&&await o.get(e)},3e3),n=(e,t)=>t&&!!es(iM,e,()=>new Set).add(t),a=(nY((e,t)=>r.toggle(e,e&&3e3<=t),!0),im(e=>B(e,([e,t])=>{null!=t&&t.passive?delete t.passive:(e=>{var t,r;e&&(t=rP(e),null!=(r=ef(iM,t)))&&r.size&&B(r,r=>!0===r(e)&&n(t,r))})(t?{status:rv.Success,...t}:{status:rv.NotFound,...e})})),(e,t)=>(t[iU]=e,n(rP(e),t))),o={get:r=>rw(\"get\",r,async r=>{r[0]&&!eG(r[0])||(l=r[0],r=r.slice(1)),null!=t&&t.validateKey(l);var u=new Map,s=[],v=W(r,e=>{var t=ik(rP(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:rv.Forbidden,error:`No consent for '${r}'.`});else if(!e.refresh&&t)u.set(e,{status:rv.Success,...t});else{if(!rq(e))return[eS(e,iC),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rs(e),version:\"1\",created:d,modified:d,value:r,cache:[d,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},eg(s,[rs(r),r]),u.set(e,{status:rv.Success,...r})):u.set(e,{status:rv.NotFound,...rs(e)})}return U}),d=(B(u,([e,t])=>{var r,n;e.poll&&(r=rb(e,t),(n=async t=>!0===await r(t)&&(null==a?void 0:a(e,n)))(t))}),e9()),l=v.length&&(null==(l=await iO(e,{variables:{get:W(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=l.variables)?void 0:r.get)||[],f=[];return B(l,(e,t)=>{var n,r=v[t][1];(null==e?void 0:e.status)===rv.NotFound&&r.init?null!=(n=r.init())&&f.push([r,{...rs(r),value:n}]):u.set(v[t][1],rF(e))}),f.length&&B(await o.set(W(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rF(e.status===rv.Conflict?{...e,status:rv.Success}:e.status===rv.Success&&null==e.value?{...e,status:rv.NotFound}:e))),s.length&&ix(s),u},{poll:a,logCallbackError:(e,t,r)=>nZ(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rw(\"set\",r,async r=>{r[0]&&!eG(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,a=[],l=new Map,u=e9(),s=[],v=W(r,e=>{var i,r,t=ik(rP(e));return rq(e)?(i=e.patch?e.patch(null==t?void 0:t.value):e.value,null!=(null==t?void 0:t.value)&&(i===(null==t?void 0:t.value)||eE(i,null==t?void 0:t.value))||((r=null==i?void 0:{...rs(e),created:null!=(r=null==t?void 0:t.created)?r:u,modified:u,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[u,e.ttl]})&&(r.cache=[u,null!=(i=e.ttl)?i:3e3]),l.set(e,r?{status:t?rv.Success:rv.Created,...r}:{status:rv.Success,...rs(e)}),eg(a,[rs(e),r])),U):e.patch?(s.push(e),U):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[eS(e,ij),e])}),d=0;!d++||s.length;)B(await o.get(W(s,e=>rs(e))).all(),(e,t)=>{var r=s[t];rc(e,!1)?eg(v,[{...r,patch:void 0,value:s[t].patch(null==e?void 0:e.value),version:e.version},r]):l.set(r,e)}),s=[],B(v.length?eO(null==(i=(await iO(e,{variables:{set:W(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=v[t];d<=3&&t.patch&&((null==e?void 0:e.status)===rv.Conflict||(null==e?void 0:e.status)===rv.NotFound)?eg(s,t):l.set(t,rF(e))});return a.length&&ix(a),l},{logCallbackError:(e,t,r)=>nZ(\"Variables.set\",e,{operation:t,error:r})})};return iN(({variables:e})=>{e&&null!=(e=ee(W(e.get,e=>rd(e)?e:U),W(e.set,e=>rc(e)?e:U)))&&e.length&&ix(W(e,e=>[rs(e),rc(e)?e:void 0]))}),o})(nz,f={applyEventExtensions(e){return null==e.clientId&&(e.clientId=iu()),null==e.timestamp&&(e.timestamp=e9()),w=ez,B(s,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===eP&&M(!0)})?void 0:e},validateKey:(e,t=!0)=>!l&&!e||e===l||!!t&&eN(`'${e}' is not a valid key.`)}),h=((e,t)=>{var n=[],i=new WeakMap,a=new Map,o=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?ek(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):eN(\"Source event not queued.\")},l=e=>{i.set(e,ey(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!eG(r[0])||(a=r[0],r=r.slice(1)),iO(e,{events:r=W(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),ek(e,{metadata:{posted:!0}}),e[iq]){if(B(e[iq],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iq]}return ek(tJ(ey(e),!0),{timestamp:e.timestamp-e9()})}),variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var o=[];if(e=W(Y(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||o.push(e),null!=(r=ek(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:U}),B(o,e=>{}),!i)return u(e,!1,a);r?(n.length&&e.unshift(...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&n.push(...e)};return tr(()=>s([],{flush:!0}),5e3),n0((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=W(a,([e,t])=>{var r=null;return B(t,n=>{var[o,l]=n();l&&(t.delete(n),t.size||(a.delete(e),i.delete(e))),o&&(r=r?{...r,...o}:o)}),null!=r?r:U}),n.length||e.length)&&s(ee(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r=!0)=>s(o(e,t),{flush:r}),registerEventPatchSource(e,t,r=!1,n){r&&s(e);var u=!1,v=()=>{u=!0};return l(e),iP(e,l),es(a,e,()=>new Set).add(()=>{if(!1===(null==n?void 0:n.isConnected))v();else{var a=i.get(e),[r,s]=null!=(r=ex(t(a,v),a))?r:[];if(r&&!eE(s,a))return i.set(e,ey(s)),[o(e,r),u]}return[void 0,u]}),v}}})(nz,f),y={track:{...nh.defaultTracking},layer:\"default\",layerPriority:-10},ap(document.body)||((null!=(n=(e=null!=y?y:y={}).track)?n:e.track={}).disable=!0,nh.disabled=!0),m=null,b=0,k=w=eP,S=!1,g=(...e)=>{if(S){if(e.length){1<e.length&&(!e[0]||eG(e[0]))&&(t=e[0],e=e.slice(1)),eG(e[0])&&(e=(r=e[0])?e8(r)?JSON.parse(r):nW(r):[]);var t,n=eP;if((e=J(V(e,e=>e&&eG(e)?nW(e):e),e=>{if(!e)return eP;if(ak(e))nh.tags=ew({},nh.tags,e.tagAttributes);else{if(aS(e))return nh.disabled=e.disable,eP;if(aM(e)){var t;null!=(null==(y=t1(y,{track:e.track}))||null==(t=y.track)?void 0:t.disable)&&(nh.disabled=y.track.disable),y&&(y.layer=\"defaults\",y.layerPriority=-10),nr(document.body,y)}else{if(aA(e))return n=ez,eP;if(aC(e))return e(g),eP}}return k||aE(e)||ax(e)?ez:(c.push(e),eP)}))&&(e.length||n)&&!nh.disabled){var r=er(e,e=>ax(e)?-100:aE(e)?-50:a_(e)?-10:90*!!rk(e));if(!m||!m.splice(w?b+1:m.length,0,...r)){m=r;try{for(b=0;b<m.length;b++){var a=m[b];a&&(f.validateKey(null!=t?t:a.key),e_(()=>{var e=m[b];if(d(\"command\",e),w=eP,rk(e))h.post(e);else if(aN(e))p.get(Y(e.get));else if(a_(e))p.set(Y(e.set));else if(aE(e))v.push(e.listener);else if(ax(e))(t=e_(()=>e.extension.setup(g),t=>nZ(e.extension.id,t)))&&(s.push([null!=(r=e.priority)?r:100,t,e.extension]),er(s,([e])=>e));else if(aC(e))e(g);else{var r,n,t,a=eP;for([,t]of s)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:eP)break;a||nZ(\"invalid-command\",e,\"Loaded extensions:\",W(s,e=>e[2].id))}},e=>nZ(g,\"internal-error\",e)))}}finally{m=null}n&&h.post([],{flush:n})}}}}else u.push([e])},Object.defineProperty(rB,nh.name,{value:Object.freeze(Object.assign(g,{id:\"tracker_\"+iu(),events:h,variables:p,__isTracker:ez})),configurable:!1,writable:!1}),im((e,t,r)=>{ee(iK(W(e,([,e])=>e||U)),[[{[nD]:iK(W(t,([,e])=>e||U))},\"All variables\",ez]])}),iy(async(e,t,r,n)=>{if(\"ready\"===e){var[e,,,]=await p.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:eq},{scope:\"device\",key:\"@info\",cache:!0}]).values(!1);if(e){for(var l of(f.deviceSessionId=e.deviceSessionId,n(),nr(document.body,y),S=!0,g(...W(ag,e=>({extension:e}))),k=!0,e.hasUserAgent||(iX(g),e.hasUserAgent=!0),c.length&&g(c),u))l.length&&g(...l);g({set:{scope:\"view\",key:\"loaded\",value:!0}})}else console.warn(\"No session. Tracking is disabled;\")}},!0),g;eN(`The global variable for the tracker \"${nh.name}\" is used for something else than an array of queued commands.`)},i5=()=>null==m?void 0:m.clientId,i3={scope:\"shared\",key:\"referrer\"},i6=(e,t)=>{g.variables.set({...i3,value:[i5(),e]}),t&&g.variables.get({scope:i3.scope,key:i3.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},i4=e7(),i8=e7(),i9=1,[ae,at]=eJ(),ar=e=>{var t=e7(e,i4),r=e7(e,i8),n=e7(e,ia),i=e7(e,()=>i9);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},an=ar(),[aa,ao]=eJ(),al=(e,t)=>(t&&B(as,t=>e(t,()=>!1)),aa(e)),au=new WeakSet,as=document.getElementsByTagName(\"iframe\");function ad(e){if(e){if(null!=e.units&&e$(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ac=(e,t)=>{e=nf(e,t);return(null==e?void 0:e.tags)&&e},af=(e,t)=>t?e:{...e,rect:void 0,content:(S=e.content)&&W(S,e=>({...e,rect:void 0}))},ap=e=>!0!==rK(e,(e,t)=>{var n=(null==(n=nt(e))||null==(n=n.track)?void 0:n.disable)||nd(e,\"disable\");null!=n&&t(n)}),ah=(e,{directOnly:t,includeRegion:r,eventType:n,previous:i}={})=>{var a,o,l,u,s,v,d;if(e.isConnected)return s=void 0,v=[],d=0,rK(e,e=>{var i,n=nt(e);n&&(tG(n)&&(i=null!=(i=J(tX(n.components),e=>{var r;return e&&(0===d||!t&&(1===d&&(null==(r=e.track)?void 0:r.secondary)!==ez||(null==(r=e.track)?void 0:r.promote)))}))?i:[],o=(null!=r?r:Q(i,e=>null==(e=e.track)?void 0:e.region))&&r4(e)||void 0,n.content&&(null!=s?s:s=[]).unshift(...W(n.content,e=>e?{...e,rect:o}:U)),null!=i)&&i.length&&(v.unshift(...W(i,e=>{var t;return d=ei([d,null!=(t=e.track)&&t.secondary?1:2]),af({...e,track:void 0,content:tX(s),rect:o},!!o)})),s=void 0),i=n.area||nc(e,\"area\"))&&v.unshift(i)}),B(v,e=>{eG(e)?(null!=l?l:l=[]).push(e):(null==e.area&&(e.area=th(l,\"/\")),(null!=u?u:u=[]).unshift(e))}),null!=(e=ac(e,n))&&null!=(a=e.tags)&&a.length||null==i||!i.tags||(e={tags:[]}),u||l||s||null!=e&&e.tags?t3({components:tX(u),area:th(l,\"/\"),content:tX(s),...e},n):void 0},ay=Symbol(),ag=[{id:\"context\",setup(e){tr(()=>B(as,e=>ev(au,e)&&ao(e)),500).trigger();var n,t,v=null!=(t=null==(t=ik({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,d=null==(t=ik({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==d&&iS({scope:\"tab\",key:\"tabIndex\",value:d=null!=(t=null!=(t=null==(t=ik({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=ik({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(t=eP)=>{var a,o,l,i,h;r2(\"\"+c,c=location.href)&&!t||(null!=b&&b(),{source:t,scheme:i,host:a,query:o}=null!=(t=tS(location.href+\"\",{requireAuthority:!0}))?t:{},m={type:\"view\",timestamp:e9(),clientId:iu(),tab:il,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},queryString:em(o,([e,t])=>eZ(t)?[e,t]:[e,[t]]),tabNumber:d+1,tabViewNumber:v+1,viewport:r7(),duration:an(void 0,!0)},0===d&&(m.firstTab=ez),0===d&&0===v&&(m.landingPage=ez),iS({scope:\"tab\",key:\"viewIndex\",value:++v}),W([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var i;return null!=(e=(null!=(i=(l=m).utm)?i:l.utm={})[e]=null==(i=Y(null==m||null==(i=m.queryString)?void 0:i[\"utm_\"+e]))?void 0:i[0])?e:U}),!(m.navigationType=w)&&performance&&B(performance.getEntriesByType(\"navigation\"),e=>{m.redirects=e.redirectCount,m.navigationType=tM(e.type,/\\_/g,\"-\")}),k&&(m.clientNavigation=k),w=k=void 0,\"navigate\"===(null!=(t=m.navigationType)?t:m.navigationType=\"navigate\")&&(h=null==(i=ik(i3))?void 0:i.value)&&nq(document.referrer)&&(m.view=null==h?void 0:h[0],m.relatedEventId=null==h?void 0:h[1],e.variables.set({...i3,value:void 0})),(h=document.referrer||null)&&!nq(h)&&(m.externalReferrer={href:h,domain:(()=>{var{host:t,scheme:r,port:n}=tS(h,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),m.definition=n,n=void 0,e.events.post(m),b=e.events.registerEventPatchSource(m,()=>({duration:an(),tags:m.tags})),at(m))};return n0(e=>{e?(i8(ez),++i9):i8(eP)}),r8(window,\"popstate\",()=>(w=\"back-forward\",f())),B([\"push\",\"replace\"],e=>{var t=e+\"State\",r=history[t];history[t]=(...t)=>{r.apply(history,t),w=\"navigate\",k=e,f()}}),f(),{processCommand(t){var a;return aw(t)?(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),!0):!!aj(t)&&((a=null==(t=t.view)?void 0:t.tags)&&m&&(a=null!=(a=null==(a=nr(m,{view:{tags:a}},t.layer))?void 0:a.view.tags)?a:[],eE(m.tags,a)||(m.tags=a)),(a=null!=t&&t.id?t:(null==t?void 0:t.definition)||void 0)&&!eE(a,null==m?void 0:m.definition)&&(null==m||m.definition?(n=a).navigation&&f(!0):(m.definition=a,null!=(t=m.metadata)&&t.posted&&e.events.postPatch(m,{definition:m.definition})),e({set:{scope:\"view\",key:\"view\",value:null!=a?a:null}})),!0)},decorate(e){!m||rS(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=m.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>B(e,e=>{var t,r;return null==(t=(r=e.target)[iR])?void 0:t.call(r,e)})),r=new Set,n=(tr({callback:()=>B(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rW.createRange();return(a,o)=>{if(!o)return!1;var f,p,h,m,b,w,k,S,T,x,A,I,N,l={components:W(o.components,e=>{var t;return null!=(t=e.track)&&t.impressions?{key:tV(e),config:null==(t=e.track)?void 0:t.impressions}:U}),config:null==o||null==(l=o.track)?void 0:l.impressions},u=l.config||null!=(u=l.components)&&u.length?ty(l):\"\";(null==(l=a[iD])?void 0:l[0])!==u&&(u?(m=null==(l=a[iD])?void 0:l[1],b=a[iD]=[u,new Map],w=iL(null==(l=o.track)?void 0:l.impressions),k=W(null==o?void 0:o.components,e=>{var t=iL(null!=(t=null==e||null==(t=e.track)?void 0:t.impressions)?t:w);return t?[e,t,ec(b[1],tV(e),null!=(t=es(m,tV(e)))?t:{active:!1,pendingActive:!1,activeTime:e7(!1,ia),viewDuration:ar(!1),impressions:0})]:U}),B(m,([e,t])=>!b[1].has(e)&&(null==(e=t.unbindPassiveEventSource)?void 0:e.call(t))),null!=k&&k.length&&((S=nt(a.previousElementSibling))&&(k=J(k,e=>!Q(tX(S.components),t=>tK(e[0],t)))),T=0,x=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=f?f:f=[])[e])?a:i[e]=[{duration:0,impressions:0},e7(!1,ia),!1,!1,0,0,0,eA()];a[4]=t,a[5]=r,a[6]=n},A=[eA(),eA()],I=-1,N=()=>{var t=a.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,l=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],u=l[2]-l[0],s=l[1]-l[3],v=u/t.height||0,d=s/t.width||0,c=(B(k,([t,{delay:i},l])=>{var b,c=l.active?iW:iB,c=(c[0]*o<u||c[0]<v)&&(c[0]*r<s||c[0]<d);if(l.pendingActive!==c&&l.activeTime(l.pendingActive=c,!0),l.active!==(l.active=l.pendingActive&&l.activeTime()>=i-250)){if(++l.impressions,l.viewDuration(l.active),!l.impressionEvent){c=ah(a,{directOnly:ez,eventType:\"impression\"}),i={...c,components:J(null==c?void 0:c.components,e=>tK(t,e))};if(null==(c=i.components)||!c.length)return U;l.impressionEvent={type:\"impression\",pos:r5(a),viewport:r7(),timeOffset:an(),impressions:l.impressions,element:i0(a),...i}}l.impressionEvent&&(b=l.viewDuration(),l.unbindPassiveEventSource=e.events.registerEventPatchSource(l.impressionEvent,()=>({duration:b,impressions:l.impressions,regions:f&&{top:f[0][0],middle:f[1][0],bottom:f[2][0]},seen:T,text:h,read:b.activeTime&&h&&n(b.activeTime/h.readTime,T)}),!0))}}),Q(k,e=>e[2].active));if(t.height!==I){I=t.height;l=a.textContent;if({boundaries:p,...h}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,o=0,l=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++l,++o);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*a|0),d=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,y=0;y<v.length;y++)v[y]--||(d[y]={offset:null!=n?n:c,wordsBefore:f,readTime:e6(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:tc(e,50),length:e.length,characters:a,words:o,sentences:u,lix:e6(o/u+100*l/o),readTime:e6(o/238*6e4),boundaries:d}})(null!=l?l:\"\"),f||t.height>=1.25*o){var g=rW.createTreeWalker(a,NodeFilter.SHOW_TEXT),m=0,b=0;for(null==f&&(f=[]);b<p.length&&(w=g.nextNode());){var w,S,N,_,C,$=null!=(S=null==(S=w.textContent)?void 0:S.length)?S:0;for(m+=$;m>=(null==(N=p[b])?void 0:N.offset);)i[b%2?\"setEnd\":\"setStart\"](w,p[b].offset-m+$),b++%2&&({top:N,bottom:_}=i.getBoundingClientRect(),C=t.top,b<3?x(0,N-C,_-C,p[1].readTime):(x(1,f[0][4],N-C,p[2].readTime),x(2,N-C,_-C,p[3].readTime)))}}}var l=t.left<0?-t.left:0,M=t.top<0?-t.top:0,F=t.width*t.height;c&&(T=A[0].push(M,M+u)*A[1].push(l,l+s)/F),f&&B(f,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>o?o:t.bottom,e[5],e[4]),a=c&&0<i-r,l=e[0];l.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,l.seen=e[7].push(r,i)/(e[5]-e[4]),l.read=n(l.duration/e[6],l.seen))})},a[iR]=({isIntersecting:e})=>{ec(r,N,e),e||(B(k,([,,{unbindPassiveEventSource:e}])=>null==e?void 0:e()),N())},t.observe(a))):(null!=(u=a[iR])&&u.call(a,!1),delete a[iD],t.unobserve(a)))}})(e),r=({boundary:e,...r})=>{var n=nr(e,null!=(n=null==r?void 0:r.update)?n:r);t(e,n)};return{decorate(e){B(e.components,t=>{t.track&&delete t.track,B(e.elements,e=>e.track&&delete e.track)})},processCommand:e=>aT(e)?(r(e),ez):aO(e)?(B(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=rG(i,e);){ev(n,i);var o,l=tU(rG(i,e),\"|\");rG(i,e,null);for(var u=0;u<l.length;u++){var v=l[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eX(v))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<l.length;u++)try{v=JSON.parse(c+=l[u]);break}catch{}0<=s&&t[s]&&(v=t[s]),eg(a,v)}}}eg(r,...W(a,e=>({add:ez,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(o=i.parentNode)&&o.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),r),ez):eP}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{r8(r,[\"click\",\"contextmenu\",\"auxclick\",\"pointerdown\"],n=>{if(ap(n.target)){var i,a,o,l,u,s=\"pointerdown\"===n.type,v=null,d=eP;if(rK(n.target,e=>{iQ(e)&&null==o&&(o=e),iY(e)&&null==v&&(v=e),d=d||\"NAV\"===rQ(e);var t,s=nt(e),s=tX(null==s?void 0:s.components);!n.button&&null!=s&&s.length&&!u&&(B(e.querySelectorAll(\"a,button\"),t=>iQ(t)&&(3<(null!=u?u:u=[]).length?(u=void 0,M):u.push({...i0(t,!0),component:rK(t,(e,t,r,n=tX(null==(i=nt(e))?void 0:i.components))=>n&&t(n[0]),t=>t===e)}))),u)&&null==l&&(l=e),null==i&&(i=null!=(t=nd(e,\"clicks\",ez,e=>null==(e=e.track)?void 0:e.clicks))?t:s&&Q(s,e=>(null==(e=e.track)?void 0:e.clicks)!==eP)),null==a&&(a=null!=(t=nd(e,\"region\",ez,e=>null==(e=e.track)?void 0:e.region))?t:s&&Q(s,e=>null==(e=e.track)?void 0:e.region))}),null!=l?l:l=o){var E,c=0<(null==u?void 0:u.length)&&!o&&!v&&i,f=e=>ah(null!=o?o:l,{includeRegion:c,eventType:e}),p=(null==i&&(i=!d),{...(a=null==a?ez:a)?{pos:r5(o,n),viewport:r7()}:null,...((e,t)=>{var n;return rK(null!=e?e:t,e=>\"IMG\"===rQ(e)||e===t?(n={element:i0(e,!1)},eP):ez),n})(n.target,null!=o?o:l),timeOffset:an()});if(o)if(iZ(o)){var h=o,y=h.hostname!==location.hostname,g=h.href||h.getAttribute(\"href\")||\"\";if(g){if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash===location.hash||0!==n.button||s||e({type:\"anchor_navigation\",anchor:h.hash,...p,...f(\"anchor_navigation\")}));var T,x,A,N,m=tS(g,{delimiters:!1,requireAuthority:!0}),{host:g,scheme:b,source:m}=(m||(b=g.match(/^([^:]+):(?:\\/\\/)?(.+)/),m={source:g,scheme:null==b?void 0:b[1]}),m);!m||(T=!(null==(b=null==b?void 0:b.toLowerCase())||!b.match(/^https?/)))&&s||!T&&!s||(x={clientId:iu(),type:\"navigation\",href:y?h.href:m,external:y,domain:g||b?{host:g,scheme:b}:void 0,self:ez,anchor:h.hash||void 0,...p,...f(\"navigation\")},\"contextmenu\"!==n.type?n.button<=1&&(T?1===n.button||n.ctrlKey||n.shiftKey||n.altKey||rG(h,\"target\")&&rG(h,\"target\")!==window.name?(x.self=eP,e(x),i6(x.clientId)):r2(location.href,h.href)||(x.exit=x.external,e(x),i6(x.clientId)):(x.self=eP,e(x))):T&&(A=h.href,(m=nq(A))?i6(x.clientId,()=>e(x)):(N=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),m||nh.captureContextMenu&&(h.href=nR+\"=\"+N+encodeURIComponent(A),r8(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===N&&e(x),r())),r8(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=A})))))}}else!s&&(rK(n.target,(e,t)=>{var r;return!!(null!=E?E:E=(e=>eG(e=null==e||e!==ez&&\"\"!==e?e:\"add\")&&e$(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:eQ(e)?e:void 0)(null!=(r=null==(r=nt(e))?void 0:r.cart)?r:nc(e,\"cart\")))&&!E.item&&(E.item=L(tX(null==(r=nt(e))?void 0:r.content)))&&t(E)}),(y=ad(E))||i)&&e(y?{type:\"cart_updated\",...p,...f(\"cart_updated\"),...y}:{type:\"component_click\",...p,...f(\"component_click\")});else!s&&c&&((e,t,r)=>{r=r(es(e,t));\"function\"==typeof(null==r?void 0:r.then)?r.then(r=>ec(e,t,r)):ec(e,t,r)})(t,l,r=>{var i=r3(l,n);return r?r.push(i):(i={type:\"component_click_intent\",...p,...f(\"component_click_intent\"),clicks:r=[i],elements:u},e.events.registerEventPatchSource(i,()=>({clicks:t.get(l)}),!0,l)),r})}}})};r(document),al(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r1(ez);ae(()=>{return e=()=>(t={},r=r1(ez)),setTimeout(e,250);var e}),r8(window,\"scroll\",()=>{var a,n=r1(),i=r0();n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=ez,a.push(\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=ez,a.push(\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=ez,a.push(\"page-end\")),(n=W(a,e=>({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return ab(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=ad(r))&&e({...r,type:\"cart_updated\"}),ez):a$(t)?(e({type:\"order\",...t.order}),ez):eP}})},{id:\"forms\",setup(e){var t,r,n=new Map,i=[],a=window.fetch,o=(window.fetch=async(...e)=>{var t=L(i);if(!t||t.requestState||100<e9()-t.started)return a(...e);t.requestState=1;try{var r=await a(...e),n=(r.ok||t.cancel(!1),r.headers.get(\"content-type\"));if(n&&n.includes(\"application/json\"))try{var o,l=await r.json();(null!=l&&l.error||null!=l&&null!=(o=l.errors)&&o.length)&&t.cancel(!1)}catch{t.cancel(!1)}return t.pending&&t.complete(!1),r}catch(e){throw t.cancel(!1),e}finally{t.requestState=2}},e({consent:{get:e=>(t=e,!0)}}),(e,r=!1)=>{var l,a=!r||(null!=(a=nc(e,\"field\",!0,e=>null==(e=e.track)||null==(e=e.formFields)?void 0:e.values))?a:\"checkbox-only\"),o=(r&&(a=!0===a||\"checkbox-only\"===a&&\"checkbox\"===e.type)&&(o=null!=(o=nc(e,\"field-privacy\",!0,e=>null==(e=e.track)||null==(e=e.formFields)?void 0:e.privacy))?o:\"anonymous\")&&(l=null!=(l=null==t?void 0:t.classification)?l:\"anonymous\",a=tF.compare(o,l)<=0),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(o=o&&tc(o,200)),a?o:void 0}),l=t=>{var r,l,u,d,a=t.form;if(a&&!1!==nd(a,\"disable\",!0,e=>null==(e=e.track)?void 0:e.forms)&&0!=nd(a,\"form\",!0,e=>null==(e=e.track)?void 0:e.forms))return l=rX(a,nn(\"ref\"))||\"track_ref\",u=0,(d=es(n,a,()=>{var t,n,o=new Map,l={type:\"form\",name:rX(a,nn(\"form-name\"))||rG(a,\"name\")||a.id||void 0,...ah(a,{eventType:\"form\"}),activeTime:0,totalTime:0,fields:{}},u=(e.events.post(l),e.events.registerEventPatchSource(l,e=>({...l,...ah(a,{eventType:\"form\",previous:e}),timeOffset:an()})),(n=!1)=>!(!n&&1===t[3]||(v(),(2<=t[3]||n)&&(l.completed=n||3===t[3]||!(a.isConnected&&r4(a).width)),e.events.postPatch(l,{...null!=r?r:ah(a,{eventType:\"form\"}),completed:l.completed,totalTime:e9(ez)-t[4]}),r=void 0,t[3]=1,0))),d=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),eL(i)?i&&(a<0?eK:eM)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})(),c=()=>{for(var e=a.ownerDocument;e;){if(Q(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||r4(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=e_(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1},f=null,p=null,h=e=>{var o;e.target===a&&(p=e),2===t[3]&&(r=ah(a,{eventType:\"form\"}),t[3]=3,(o=()=>{if(!f)return!1;f.pending=!1;var e=i.indexOf(f);return-1<e&&i.splice(e,1),(f=null)!=n&&n(),d(!1),!0})(),f={started:e9(),requestState:0,pending:!0,formElement:a,defaultPrevented:!1,cancel:e=>!!o()&&(t[3]=2,!0),complete:e=>!!o()&&(e&&2===t[3]&&(t[3]=3),u(),!0)},i.push(f),setTimeout(()=>{var r,i;e.defaultPrevented||null!=p&&p.defaultPrevented?(f&&(f.defaultPrevented=!0),p=null,[n]=nY((e,n)=>{e||(r?null!=f&&f.cancel(!1):3===t[3]?null!=f&&f.pending&&(e=e9()-f.started,!f.requestState&&e<1500||!f.defaultPrevented?null!=f&&f.complete(!1):null!=f&&f.cancel(!1)):1!==t[3]&&null!=f&&f.cancel(!1))}),r=!1,i=e9(),d(()=>{var e=e9()-i;if(c())t[3]=2,r=!0;else if(r&&(r=!1,t[3]=3),a.isConnected&&0<r4(a).width){if(1e4<=e)return!(t[3]=2)}else null!=f&&f.complete(!1);return!0},1e3)):null!=f&&f.complete(!1)},1))};return r8(a.ownerDocument.body,\"submit\",h),B(a.querySelectorAll(\"BUTTON,INPUT\"),e=>{\"submit\"===e.type&&r8(e,\"click\",h)}),t=[l,o,a,0,e9(ez),1,u,()=>{var e;return null!=(e=null==f?void 0:f.cancel(!1))&&e}]}))[1].get(t)||B(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var i,c,v;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(c=e.name||`(unnamed ${++u})`,\"hidden\"===e.type?\"hidden\"!==e.type||e.name!==l&&!nd(e,\"ref\")||(e.value||(e.value=tM(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),d[0].ref=e.value):(v=null!=(v=(i=d[0].fields)[c])?v:i[c]={id:e.id||c,name:c,label:tM(null!=(v=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?v:c,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(i=e.type)?i:\"unknown\",[ay]:o(e),value:o(e,!0)},d[0].fields[v.name]=v,d[1].set(e,v)))}),[t,d]},u=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],s=null,v=()=>{var r,n,i,a,l,u,v;s&&([r,n,i,a]=s,l=-(d-(d=i8())),u=-(c-(c=e9(ez))),v=n[ay],(n[ay]=o(i))!==v&&(a[7](),null==n.fillOrder&&(n.fillOrder=a[5]++),n.filled&&(n.corrections=(null!=(v=n.corrections)?v:0)+1),n.filled=ez,a[3]=2,B(r.fields,([e,t])=>t.lastField=e===n.name)),n.value=o(i,!0),n.activeTime+=l,n.totalTime+=u,r.activeTime+=l,r.totalTime+=u,s=null)},d=0,c=0,f=e=>e&&r8(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&u(e.target))=>{r&&(s=r,\"focusin\"===e.type?(c=e9(ez),d=i8()):v())});return f(document),al(e=>e.contentDocument&&f(e.contentDocument),!0),{processCommand(e){var t,r;return!!aI(e)&&({ref:t,form:r}=e,t&&!(t=rK(\"number\"==typeof t.nodeType?t:t.target,(e,t)=>{\"FORM\"===rQ(e)&&t(e)}))?nZ(e,\"Neither the reference or its ancestors is a `<form>` element.\"):(e=t?i.find(e=>e.formElement===t):i.pop())?\"validation-error\"===r?e.cancel(!0):\"submit\"===r&&e.complete(!0):t&&\"submit\"===r&&(r=null==(e=n.get(t))?void 0:e[6])&&r(!0),!0)}}}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!t,passive:!t}).value(),i=async t=>{var r;if(t)return!(r=await n())||tW.equals(r,t)?[!1,r]:(await e.events.post({type:\"consent\",consent:t},{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rB.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var o={},l=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return W(r,([t,r])=>\"granted\"===e[2][t]&&(o[r]=!0,l=l&&(\"security\"===r||\"necessary\"===r))),{classification:l?\"anonymous\":\"direct\",purposes:o}}}}}}),{});return{processCommand(e){var t,r,o,s,v;return aU(e)?((t=e.consent.get)&&n((e,r,n)=>!e||t(e,n)),(r=e.consent.set)&&(async()=>{var e,t,n;\"consent\"in r?([t,n]=await i(r.consent),null!=(e=r.callback)&&e.call(r,t,n)):i(r)})(),(o=e.consent.externalSource)&&(v=o.key,(null!=(e=a[v])?e:a[v]=tr({frequency:null!=(e=o.frequency)?e:1e3})).restart(o.frequency,async()=>{var t;rW.hasFocus()&&(t=o.poll(s))&&!tW.equals(s,t)&&(null==t.source&&(t.source=v),await i(t),s=t)}).trigger()),ez):eP}}}}],tb=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),ab=tb(\"cart\"),aw=tb(\"username\"),ak=tb(\"tagAttributes\"),aS=tb(\"disable\"),aT=tb(\"boundary\"),ax=tb(\"extension\"),aA=tb(ez,\"flush\"),aI=tb(\"form\"),aN=tb(\"get\"),aE=tb(\"listener\"),a$=tb(\"order\"),aO=tb(\"scan\"),a_=tb(\"set\"),aC=e=>\"function\"==typeof e,aj=tb(\"view\"),aU=tb(\"consent\"),aM=tb(\"track\");tt(()=>document.body,()=>i2(\"{{CONFIG}}\"))})();\n",
    debug: "(()=>{var e,t,r,n,i,a,o,l,u,s,v,c,f,m,h,g,y,b,w,k,S,O=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},F=(e,t)=>{if(!e||O(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=F(r.contentWindow,t))return e}catch{}},C=e=>null==e?e:\"undefined\"!=typeof window?F(window,O(e)):globalThis,j=!1,_=Symbol(),M=e=>(j=!0,e),q=Symbol(),U=Symbol(),P=Symbol.iterator,z=(e,t,r)=>{if(null==e||e[q])throw t;e=C(e);if(!e)throw t;var o,i=()=>(e,t,r,n,i)=>{var a,l,o=0;for(l of e)if((a=t?t(l,o++,n,i):l)!==_){if(a===M)break;if(n=a,r&&r.push(a),j){j=!1;break}}return r||n},a=(e.Array.prototype[q]=(e,t,r,n,i)=>{for(var o,l=0,u=e.length;l<u;l++)if(o=e[l],(o=t?t(o,l,n,i):o)!==_){if(o===M)break;if(n=o,r&&r.push(o),j){j=!1;break}}return r||n},i());for(o of(e.Object.prototype[q]=(e,t,r,n,o)=>{if(e[P])return(e.constructor===Object?a:Object.getPrototypeOf(e)[q]=i())(e,t,r,n,o);var u,v,s=0;for(v in e)if(u=[v,e[v]],(u=t?t(u,s++,n,o):u)!==_){if(u===M)break;if(n=u,r&&r.push(u),j){j=!1;break}}return r||n},e.Object.prototype[U]=function(){var t,e;return this[P]||this[eJ]?this.constructor===Object?null!=(e=this[eJ]())?e:this[P]():((e=Object.getPrototypeOf(this))[U]=null!=(t=e[eJ])?t:e[P],this[U]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))o[q]=i(),o[U]=o[P];return e.Number.prototype[q]=(e,t,r,n,i)=>a(R(e),t,r,n,i),e.Number.prototype[U]=R,e.Function.prototype[q]=(e,t,r,n,i)=>a(D(e),t,r,n,i),e.Function.prototype[U]=D,r()};function*R(e=this){for(var t=0;t<e;t++)yield t}function*D(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var B=(e,t,r,n)=>{try{var i;return e?null!=(i=e[q](e,t,void 0,r,n))?i:r:null==e?e:void 0}catch(i){return z(e,i,()=>B(e,t,r,n))}},L=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[q](e,t,r,n,i):null==e?e:void 0}catch(a){return z(e,a,()=>L(e,t,r,n,i))}},J=(e,t=!0,r=!1)=>L(e,!0===t?e=>null!=e?e:_:t?t.has?e=>null==e||t.has(e)===r?_:e:(n,i,a)=>!t(n,i,a,e)===r?n:_:e=>e||_),W=(e,t)=>!t&&eY(e)?e[e.length-1]:B(e,(r,n,i)=>!t||t(r,n,i,e)?r:_),V=(e,t)=>{var r=0;return B(e,t?(n,i,a)=>t(n,i,a,e)&&++r:()=>++r),r},H=(e,t,r=-1,n=[],i,a=e)=>L(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(H(e,void 0,r-1,n,e),_):e,n,i,a),K=(e,t,r)=>{var n,i,a,o;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),B(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(o=t?t(e,r,n):e)[0]&&ev(a,o[0],()=>[]).push(o[1])}):(a={},(e,r,l)=>(o=t?t(e,r,l):e)&&void 0!==o[0]&&(null!=(r=(n=a)[i=o[0]])?r:n[i]=[]).push(o[1]))),a},G=(e,t,r,n)=>{try{return X(e,t,void 0,r,n)}catch(i){return z(e,i,()=>G(e,t,r,n))}},X=async(e,t,r,n,i)=>{if(null==(e=await e))return e;if(!1!==e){for(var l=e[U](),u=0;(a=l.next())&&!(a=e5(a)?await a:a).done;){var a=a.value;if(e5(a)&&(a=await a),(a=await(t?t(a,u++,n,i):a))!==_){if(a===M)break;if(n=a,null!=r&&r.push(a),j){j=!1;break}}}return r||n}},Z=e=>null==e||e instanceof Set?e:new Set(e[P]&&\"string\"!=typeof e?e:[e]),Y=e=>void 0===e?[]:null!=e&&e[P]&&\"string\"!=typeof e?e:[e],Q=e=>null==e||eY(e)?e:e[P]&&\"string\"!=typeof e?[...e]:[e],ee=(e,t)=>!0===B(e,(r,n,i)=>(t?t(r,n,i,e):r)?j=!0:r),et=(e,...t)=>{var r,n;for(n of e=!t.length&&e6(e)?e:[e,...t])if(null!=n){if(e6(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},er=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),en=(e,t,r)=>Q(e).sort(\"function\"==typeof t?(e,n)=>er(t(e),t(n),r):eY(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=er(t[a](e),t[a](n),r);return i}:(e,t)=>er(e,t,r):(e,r)=>er(e,r,t)),ei=(e,t,r,n=!1)=>{var i,a;return B(e,n?(e,n,o)=>(void 0!==(i=t?t(e,n,o):e)&&o!==(o=r(o,i))&&(a=e),o):(e,n,o)=>void 0!==(i=t?t(e,n,o):e)?a=r(o,i):o),a},ea=(e,t,r)=>!t&&eY(e)?Math.max(...e):ei(e,t,(e,t)=>null==e||e<t?t:e,r),eo=Symbol(),el=Symbol(),eu=Symbol(),es=(e,t,r)=>{if(null==e||e[el])throw t;var i,e=C(e);if(!e||e.Object.prototype[eo])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[eo]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[el]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[eo]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[el]=i.has,i[eu]=function(...e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[eu]=e.Array.prototype.push,[e.Object,e.Array]))i[eo]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[el]=function(e){return this[e]};return r()},ev=(e,t,r)=>{try{if(null==e)return e;var n=e[el](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[eo](t,r));e[eo](t,n)}return n}catch(n){return es(e,n,()=>ev(e,t,r))}},ed=(e,t,r)=>{try{return!0===(null==e?void 0:e[eo](t,r,!0))}catch(n){return es(e,n,()=>ed(e,t,r))}},ef=(e,t,r)=>{try{return e[eo](t,r),r}catch(n){return es(e,n,()=>ef(e,t,r))}},ep=(e,t)=>em(e,t,void 0),em=(e,t,r)=>{try{var n=e[el](t);return e[eo](t,r),n}catch(n){return es(e,n,()=>em(e,t,r))}},eg=(e,t=-1)=>{var r=null==e?void 0:e.constructor;if(r!==Object&&r!==Array)return e;var i,n=r();for(i in e){var a=e[i];n[i]=t&&((null==a?void 0:a.constructor)===Object||eY(a))?eg(a,t-1):a}return n},ey=(e,...t)=>{try{return null!=e&&e[eu](...t),e}catch(r){return es(e,r,()=>ey(e,...t))}},eb=(e,t)=>{var r={};return B(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==_&&e!==M)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==_&&e!==M)?r[e[0]]=e[1]:e),r},ew=(e,t,r=!1)=>{try{var n;return e.constructor===Object?r?(n=e,B(t,t=>{t&&(void 0===t[1]?t[0]in e:e[t[0]]!==t[1])&&(n===e&&(e={...n}),void 0===t[1]?delete e[t[0]]:e[t[0]]=t[1])})):B(t,t=>t&&(void 0===t[1]?delete e[t[0]]:e[t[0]]=t[1])):B(t,t=>t&&e[eo](t[0],t[1])),e}catch(n){return es(e,n,()=>ew(e,t,r))}},ek=(e,...t)=>{var r,n;return e&&t.length&&(\"boolean\"==typeof t[0]?1<t.length&&(r=e,n=t[0],2<t.length?B(t,(t,i)=>0<i&&(e=ew(e,t,n&&e===r))):e=ew(e,t[1],n)):1<t.length?B(t,t=>ew(e,t,!0)):ew(e,t[0])),e},eS=(e,t,r={})=>{if(null!=e){var o,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(o of Y(t))B(o,t=>{var l,u;t&&([t,l]=t,u=e[t],(a?null==u:void 0===u)?e[t]=l:n&&(null==l?void 0:l.constructor)===Object&&(null==u?void 0:u.constructor)===Object?eS(u,l,r):i&&(e[t]=l))})}return e},eT=(e,t)=>null==e?e:eb(t,t=>void 0!==e[t]||t in e?[t,e[t]]:_),ex=e=>\"function\"==typeof e?e():e,e$=(e,t)=>{var r,n,i;if(e)return e1(t)?(i={},e1(e)&&(B(e,([e,a])=>{if(!eI(a,t[e],-1)){if(e1(r=a)){if(!(a=e$(a,t[e])))return;[a,r]=a}i[e]=a,(null!=n?n:n=eg(t))[e]=r}}),n)?[i,n]:void 0):[e,e]},eA=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return Object.assign(r,{push(n,i){for(var a=[n,i],o=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,l=0;l<r.length;l++){var u,s,v=r[l];if(e(a[1],v[0])<0)return o(r.splice(l,0,a));if(e(a[0],v[1])<=0){if(e(a[0],v[0])<0&&(u=v[0]=a[0]),0<e(a[1],v[1])&&(u=v[1]=a[1]),!((null==(s=r[l+1])?void 0:s[0])<v[1]))return o(null!=u);u=a=r.splice(l--,1)[0]}}return o(a&&(r[r.length]=a))},width:0})};function eN(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var eE=(e,t=e=>Error(e))=>{throw eX(e=ex(e))?t(e):e},eI=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(!eY(e)&&!e1(e)||!eY(t)&&!e1(t)||e.length!==t.length)return!1;var i,n=0;for(i in e){if(e[i]!==t[i]&&!eI(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length},eO=(e,t,...r)=>e===t||0<r.length&&r.some(t=>eO(e,t)),eF=(e,t)=>null!=e?e:eE(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),eC=(e,t=!0,r)=>{try{return e()}catch(e){return e3(t)?eQ(e=t(e))?eE(e):e:eV(t)?console.error(t?eE(e):e):t}finally{null!=r&&r()}};class ej extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),eN(this,\"_action\",void 0),eN(this,\"_result\",void 0),this._action=e}}var e_=e=>new ej(async()=>ex(e)),eM=async(e,t=!0,r)=>{try{return await ex(e)}catch(e){if(!eV(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},eq=e=>e===eR,eU=void 0,eP=Number.MAX_SAFE_INTEGER,ez=!1,eR=!0,eD=()=>{},eB=e=>e,eL=Symbol.iterator,eJ=Symbol.asyncIterator,eW=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:eU,eV=e=>\"boolean\"==typeof e,eH=eW(eV,e=>0!=e&&(1==e||\"false\"!==e&&\"no\"!==e&&(\"true\"===e||\"yes\"===e||eU))),eK=e=>e!==ez,eX=e=>\"string\"==typeof e,eZ=eW(eX,e=>null==e?void 0:e.toString()),eY=Array.isArray,eQ=e=>e instanceof Error,e0=e=>e&&\"object\"==typeof e,e1=e=>(null==e?void 0:e.constructor)===Object,e2=e=>\"symbol\"==typeof e,e3=e=>\"function\"==typeof e,e5=e=>!(null==e||!e.then),e6=(e,t=!1)=>!(null==e||!e[eL]||\"string\"==typeof e&&!t),e4=(e,t)=>null==e?eU:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,e8=(e,t,r)=>e[0]===t&&e[e.length-1]===r,e9=e=>eX(e)&&(e8(e,\"{\",\"}\")||e8(e,\"[\",\"]\")),e7=\"undefined\"!=typeof performance?(e=eR)=>e?Math.trunc(e7(ez)):performance.timeOrigin+performance.now():Date.now,te=(e=!0,t=()=>e7())=>{var r,n=+e*t(),i=0;return(a=e,o)=>(r=e?i+=-n+(n=t()):i,o&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t,r)=>null==e?e:t?new Date(e.valueOf()).toLocaleString(r,t):new Date(e.valueOf()).toISOString(),tr=e=>{var t,r;return null==e?e:(t=Math.floor(e/36e5),r=Math.floor(e%36e5/6e4),e=Math.floor(e%6e4/1e3),t?t+`h ${r}m ${e}s`:r?r+`m ${e}s`:e+\"s\")},ti=(e,t,r)=>{var n,i,a,o,l;return\"function\"==typeof t?ti(e,{...r,then:t}):({then:n,timeout:i=-1,pollInterval:a=25}=null!=t?t:{},o=e7(),(l=e())?(null!=n&&n(l,0),l):(async()=>{for(;!(l=e())&&(i<=0||e7()-o<i);)await tv(a);return l?(null!=n&&n(l,e7()-o),l):eE(`Target not resolved after ${i} ms.`)})())},ta=(e,t=0)=>{var e=e3(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:o=!1,once:l=!1,callback:u=()=>{},raf:s}=e,v=(t=null!=(e=e.frequency)?e:0,0),d=td(!0).resolve(),c=te(!a),f=c(),p=async e=>{if(!v||!i&&d.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;d.pending;)await d;return e||d.reset(),(!1===await eM(()=>u(c(),-f+(f=c())),!1,()=>!e&&d.resolve())||t<=0||l)&&g(!1),!(y.busy=!1)},m=()=>v=setTimeout(()=>s?requestAnimationFrame(h):h(),t<0?-t:t),h=()=>{y.active&&p(),y.active&&m()},g=(e,t=!e)=>(c(e,t),clearTimeout(v),y.active=!!(v=e?m():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,g(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(g(!0),y.trigger(),y):g(!0):g(!1):y,trigger:async e=>await p(e)&&(g(y.active),!0)};return y.toggle(!a,o)};function to(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tl{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tu,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){to(this,\"_promise\",void 0),this.reset()}}class tu{then(e,t){return this._promise.then(e,t)}constructor(){var e;to(this,\"_promise\",void 0),to(this,\"resolve\",void 0),to(this,\"reject\",void 0),to(this,\"value\",void 0),to(this,\"error\",void 0),to(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===eU||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tv=(e,t)=>null==e||isFinite(e)?!e||e<=0?ex(t):new Promise(r=>setTimeout(async()=>r(await ex(t)),e)):eE(`Invalid delay ${e}.`),td=e=>new(e?tl:tu),tf=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),o=()=>n!==(n=!0)&&(t(i),!0);return o(),[a,o]},eW=()=>{var e,t=new Set;return[(r,n)=>{var i=tf(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tm=(e,t,r)=>null==e?eU:eY(t)?null==(t=t[0])?eU:t+\" \"+tm(e,t,r):null==t?eU:1===t?e:null!=r?r:\"is\"===e?\"are\":e+\"s\",th=!0,tg=(e,t,r)=>r?(th&&r.push(\"\u001b[\",t+\"\",\"m\"),eY(e)?r.push(...e):r.push(e),th&&r.push(\"\u001b[m\"),r):tg(e,t,[]).join(\"\"),ty=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tw=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),tk=(e,t,r)=>null==e||\"string\"==typeof e?e:e[eL]?J(\"function\"==typeof t?L(e,t):(r=t,e),tw,!0).join(null!=r?r:\"\"):\"boolean\"==typeof e?\"\":e.toString(),tS=JSON.stringify,tT=(e,t=!1)=>null==e||\"\"===e?eU:\"object\"==typeof e?e:t?eC(()=>JSON.parse(e+\"\"),()=>{}):JSON.parse(e+\"\"),tx=(e,t,r,n)=>{var i,l;return e||0===e?\"function\"==typeof t?tx(L(e,t),r,n):(i=[],n=B(e,(e,t,r)=>tw(e)?_:(r&&i.push(r),e.toString())),[t,l]=eY(t)?t:[,t],l=(null!=l?l:l=\"and\")[0]===(t=null==t?\",\":t)?l+\" \":\" \"+(l?l+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+l+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:eU},t$=(e,t)=>{var o,r=[],n={},i={},a=0;for(o in t)o===t[o]&&(Object.defineProperty(i,o,{value:o,writable:!1,enumerable:!0,configurable:!1}),n[o]=a++,r.push(o));var l=(t,r=!0)=>null==t?eU:null!=n[t]?t:r?eE(`The ${e} \"${t}\" is not defined.`):eU,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:l,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[l(e)],t=n[l(t)];return e<t?-1:+(t<e)},...u}}),i},tA=Symbol(),tN=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,o;return e?(null==(o=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(o[1]=\"\"),o[2]=o[1]&&(eX(t)?t=[t]:eY(t))&&B(t,e=>1<(i=o[1].split(e)).length?M(i):eU)||(o[1]?[o[1]]:[]),o):eU},tE=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?eU:tj(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,o,l,u,s,v,d,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&eU,authority:a,user:o,password:l,host:null!=u?u:s,port:null!=v?parseInt(v):eU,path:d,query:!1===t?c:c?tI(c,{...n,delimiters:t}):eU,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":eU),e}),tI=(e,t)=>tO(e,\"&\",t),tO=(e,t,{delimiters:r=!0,...n}={})=>{e=L(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,o]=null!=(e=tN(e,{...n,delimiters:!1===r?[]:!0===r?eU:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<o.length?o:a]:[e,a]:_}),t=eb(K(e,!1),([e,t])=>[e,!1!==r?1<t.length?et(t):t[0]:t.join(\",\")]);return t&&(t[tA]=e),t},tF=(e,t)=>t&&null!=e?t.test(e):eU,tC=(e,t,r)=>tj(e,t,r,!0),tj=(e,t,r,n=!1)=>{t.lastIndex=0;var i=t.exec(e);if(!r)return i;for(var a=n?[]:eU;i;){var o=r(...i);if(o===M||(o!==_&&(n?a.push(o):a=o),(null==(i=t.global?t.exec(e):null)||!i[0].length)&&++t.lastIndex>=e.length))break}return a},t_=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tM=/\\z./g,tq=(e,t)=>(t=tk(Z(J(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tM,tU={},tP=e=>e instanceof RegExp,tz=(r,n=[\",\",\" \"])=>{var i;return tP(r)?r:eY(r)?tq(L(r,e=>null==(e=tz(e,n))?void 0:e.source)):eV(r)?r?/./g:tM:eX(r)?null!=(i=(e=tU)[t=r])?i:e[t]=tj(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tq(L(tR(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${tk(n,t_)}]`)),e=>e&&`^${tk(tR(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>t_(tD(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):eU},tR=(e,t,r=!0)=>null==e?eU:r?J(tR(e,t,!1)):e.split(t),tD=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tB=(t$(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),t$(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"})),tL=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],tJ=eb(tL,e=>[e,e]),tW=(Object.freeze(eb(tL,e=>[e,!0])),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),tV=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},tH={names:tL,specificNames:tL.filter(e=>\"necessary\"!==e),parse(e,{names:t=!1,includeDefault:r=!0,validate:n=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),eX(e)&&(e=e.split(\",\")),eY(e)){var a,i={};for(a of e)if(a!==rr){if(!tJ[a]){n&&eE(`The purpose name '${a}' is not defined.`);continue}\"necessary\"!==a&&(i[a]=!0)}e=i}return t?(t=L(e,([e,t])=>tJ[e]&&t?e:_)).length||!r?t:[\"necessary\"]:e},get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=tW(i,n))&&!t[tW(i,n)])return!1;if(e=tV(e,n),t=tV(t,n),r){for(var a in t)if(tJ[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(tJ[a]&&e[a]&&!t[a])return!1;return!0}var o=!1;for(a in e)if(tJ[a]&&e[a]){if(t[a])return!0;o=!0}return!o}},tK=e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${tx(tH.parse(null==e?void 0:e.purposes,{names:!0}))} purposes.`},tG={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes},source:e.source},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&tH.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),applyOptional:(e,t={})=>(e&&(t.security||(e.purposes.security=!0),t.personalization||(e.purposes.personalization=e.purposes.functionality)),e),serialize(e,t){null!=t&&t.security||delete(e={...e,purposes:{...e.purposes}}).purposes.security;t=tH.parse(e.purposes,{names:!0,includeDefault:!1});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t+(e.source?` (${e.source})`:\"\"):null},deserialize(e,t){var n;return e?(e=null!=(e=e.match(/^\\s*([^:]+):((?:\\s+[^(]|[^\\s])*)(?:\\s+\\((.+)\\)\\s*$)?/))?e:[],{classification:null!=(n=tB.parse(e[1],!1))?n:\"anonymous\",purposes:null!=(n=tH.parse(e[2],{validate:!1}))?n:{},source:e[3]}):t?tG.clone(t):{classification:\"anonymous\",purposes:{}}}},tX=(e,t)=>(!(r=null==e?void 0:e.metadata)||t&&(delete r.posted,delete r.queued,Object.entries(r).length)||delete e.metadata,e),tZ=e=>!(null==e||!e.patchTargetId),tY=e=>{var t;return e&&`${e.id}\u0000${(null==(t=e.dataSource)?void 0:t.id)||\"\"}\u0000${e.source||\"\"}\u0000`+(e.name||\"\")},tQ=(e,t)=>{var r;return e&&t&&e.id===t.id&&e.source===t.source&&(null==(r=e.dataSource)?void 0:r.id)===(null==t||null==(r=t.dataSource)?void 0:r.id)&&e.name===t.name},t0=e=>{if(e)for(var t in e)if(null!=e[t])return!1;return!0},t1=e=>!(!e||t0(e.components)&&t0(e.content)),t2=e=>t3(e,t5),t3=(e,t,r,n)=>{if(e)r&&(e=[...e,...r]);else{if(!r)return;e=r}var i,a=e;if(e.length){for(var o=0;o<e.length;o++)if(!(i=e[o])||n&&i!=(i=n(i))){for(a=e.slice(0,o++),i&&a.push(i);o<e.length;o++)!(i=e[o])||n&&!(i=n(i))||a.push(i);break}if(null!=a&&a.length){if(1<a.length&&t){var u,l=new Map;for(u of a)l.set(t(u),u);l.size<a.length&&(a=[...l.values()])}}else a=void 0}return a},t5=tY,t6=e=>{var t;return!e||t0(e.components)&&t0(e.content)&&!e.area&&!e.cart&&t0(e.track)&&t0(e.extensions)&&t0(e.tags)&&(!e.view||!(null!=(t=e.view)&&t.definition)&&t0(null==(t=e.view)?void 0:t.tags))},t4=e=>!!e&&\"string\"!=typeof e&&Symbol.iterator in e,t8=(e,t,r=!0)=>{if(e===t)return t9(e,r);if(!t)return e||void 0;if(t4(t)){var n,l,o=e||void 0;for(l of t)l&&(o=t8(o,l,r));return o}return e?{components:t3(e.components,t5,t.components),content:t3(e.content,t5,t.content),area:t.area||e.area,cart:t.cart||e.cart,track:e.track?t.track?{...e.track,...t.track}:e.track:t.track||void 0,layer:null!=(n=t.layer)?n:e.layer,layerPriority:null!=(n=t.layerPriority)?n:e.layerPriority,tags:t3(e.tags,t7,t.tags),view:e.view?t.view?{definition:t.view.definition||e.view.definition,tags:null!=(n=t3(e.view.tags,t7,t.view.tags))?n:[]}:e.view:t.view,extensions:e.extensions?t.extensions?{...e.extensions,...t.extensions}:e.extensions:t.extensions}:t9(t,r)||void 0},t9=(e,t=!1)=>{var r,a,o;if(e&&(t||!t6(e)))return t=void 0,(r=t3(e.components,t5))!==e.components&&((null!=t?t:t={}).components=r),(r=t3(e.content,t5))!==e.content&&((null!=t?t:t={}).content=r),(r=t3(e.tags,t7))!==e.tags&&((null!=t?t:t={}).tags=r),void 0!==(r=e.view)&&(r?(a=r.definition||void 0,o=t3(r.tags,t7),a===r.definition&&o===r.tags||((null!=t?t:t={}).view={definition:a,tags:o})):(null!=t?t:t={}).view=void 0),t?{...e,...t}:e},t7=e=>{var t;return`${e.tag}\u0000${null!=(t=e.value)?t:\"\"}\u0000`+(e.eventType||\"\")},re=(e,t)=>{if(null!=e&&\"object\"==typeof e){var n,r=e;for(n in e){var i=e[n];null!=i&&\"object\"==typeof i&&i!==(i=\"track\"===n?void 0:(\"tags\"===n?rt:re)(i,t))&&((r=r===e?{...e}:r)[n]=i)}}return e},rt=(e,t,r)=>e?t3(e,t7,r,!1===t?void 0:e=>e.eventType?e.eventType===t?{...e,eventType:void 0}:void 0:e):void 0,rr=\"@schema\",rn=\"@privacy\",ri=(e,t=!0)=>(null!=e&&\"object\"==typeof e&&(e[rr]||e[rn])&&((e=t?{...e}:e)[rr]&&delete e[rr],e[rn])&&delete e[rn],e),ra=Symbol(),ro=e=>void 0===e?\"undefined\":ty(JSON.stringify(e),40,!0),rl=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,ru=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rs=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rv=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rd=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rc=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:ro(t)+` ${r}.`}),ra),rf=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rf((t?parseInt:parseFloat)(e),t,!1),rp={},tL=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,l=null!=(l=rp[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?l:rp[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rc(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rl.test(e)&&!isNaN(+new Date(e))?e:rc(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rf(e,!1,!1)){if(!rf(e,!0,!1))return rc(n,e,\"is not a valid UNIX timestamp\");e*=1}else if(!ru.test(e)||isNaN(+new Date(e)))return rc(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rf(e,!0,!1)?+e:rc(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rf(e,!0,!1)?+e:rc(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rf(e,!1,!1)?e:rc(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rv.test(e)?e:rc(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rv.exec(e);return r?r[2]?e:rc(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rc(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rv.exec(e);return r?\"urn\"!==r[1]||r[2]?rc(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rc(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rd.test(e)?e.toLowerCase():rc(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rc(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rs.exec(e))?void 0:r[1].toLowerCase():null)?r:rc(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${ro(e)}' is not a supported primitive type.`)}})(e),v=e.maxLength,c=(null!=v&&(d=l,l=(e,t)=>(e=d(e,t))!==ra&&e.length>v?rc(t,e,`exceeds the maximum allowed ${v} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,d=l,l=(e,t)=>(e=d(e,t))===ra||(null==c||c<=e)&&(null==f||e<=f)?e:rc(t,e,p)),\"enum\"in e){var d=l;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=d(e,t))===ra)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+tx(e.enum.map(e=>JSON.stringify(e)),\"or\"),l=(e,t)=>(e=d(e,t))===ra||u.has(e)?e:rc(t,e,p)}Z(u)})({primitive:\"string\",format:\"uri\"}),t$(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rh=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rg=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},ry=((T={})[T.Success=200]=\"Success\",T[T.Created=201]=\"Created\",T[T.NotModified=304]=\"NotModified\",T[T.BadRequest=400]=\"BadRequest\",T[T.Forbidden=403]=\"Forbidden\",T[T.NotFound=404]=\"NotFound\",T[T.Conflict=409]=\"Conflict\",T[T.Error=500]=\"Error\",T),rb=(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status),rw=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rk(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rS=e=>{var t=rh(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${ry[e.status]}.`:`${t} failed with status ${e.status} - ${ry[e.status]}${r?` (${r})`:\"\"}.`};class rT extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rk(this,\"succeeded\",void 0),rk(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rw(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rw(e,!1)))?t:[]}}var rx=e=>!!e.callback,r$=e=>!!e.poll,rA=Symbol(),rN=(e,t)=>{var r;return n=>{var i;return!rb(n,!1)||(i=!rb(n,!1)||e.poll(n.value,t?n===t:n[rA]===e,r),r=n.value,i)}},rE=(e,t,r,{poll:n,logCallbackError:i}={})=>{var a=eY(t)?t:[t],o=[],l=(async()=>{var s,u,v,d,t=await r(a.filter(e=>e)),l=[];for(u of a)u&&null!=(s=t.get(u))&&(s[rA]=u,rx(u)&&l.push([u,s,e=>!0===u.callback(e)]),r$(u))&&l.push([u,s,rN(u)]);for([u,v,d]of l)try{var c=\"get\"===e?async e=>!0===await d(e)&&(null==n?void 0:n(u,c)):d;await c(v)}catch(t){var f=`${e} callback for ${rh(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),u=async(r,n)=>{var v,d,c,i=await l,u=[],s=[];for(v of a)v?null==(c=i.get(v))?s.push(`No result for ${rh(v)}.`):!r||rw(c,n||\"set\"===e)?u.push(r&&c.status===ry.NotFound?void 0:1<r?null!=(d=c.value)?d:void 0:c):s.push(rS(c)):u.push(void 0);if(s.push(...o),s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rT(u,s.join(\"\\n\"));return a===t?u:u[0]};return Object.assign(e_(()=>u(1,!1)),{as:()=>u(1,!1),all:()=>u(0,!1),successOnly:()=>u(1,!0),value:(e=!1)=>u(2,e),values:(e=!1)=>u(2,e)})},rI=e=>e&&\"string\"==typeof e.type,rO=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rF=/%[A-F0-9]{2}/i,rC=e=>e&&rF.test(e)?eC(()=>decodeURIComponent(e),e):e,rj=/(?:^|[\\s,&#])(?:([^\\s,:=\"'&#~]+)::)?([^\\s,='\"&#~]+)(?:\\s*=\\s*(?:\"((?:\\\\.|[^\"\\\\]+)*)\"?|'((?:\\\\.|[^'\\\\]+)*)'?|((?:\\s*[^,~&#\\s]+)+)))?(?:~\\s*((?:\\d*\\.\\d)?\\d*))?/g,r_=/^(?:([^:]+)::)?(.*)$/,rM=/^:+|:+$|(:):*/g,rq=(e,t,r)=>(e&&(e6(e)?B(e,e=>r=rq(e,t,r)):\"object\"!=typeof e||\"tag\"in e?eX(e)?tj(e,rj,(e,n,i,a,o,l,u)=>{r=rP(r,{tag:rC(i),value:rC(null!=(a=null==(i=null!=a?a:o)?void 0:i.replace(/\\\\(.)/g,(e,t)=>\"r\"===t?\"\\r\":\"n\"===t?\"\\n\":\"t\"===t?\"\\t\":t))?a:l),score:u?parseFloat(u):void 0,eventType:null==t?void 0:t.eventType},null==t?void 0:t.prefix,rC(n)||(null==t?void 0:t.ns))}):r=rP(r,e,null==t?void 0:t.prefix,null==t?void 0:t.ns):r=rD(e,t,r)),r),rU=(e,t)=>{var[,e,i]=e.match(r_);return[e,(t?t+\":\"+i:i).replace(rM,\"$1\")]},rP=(e,t,r,n)=>(t&&([r=n,n]=rU(t.tag,r),n)&&(null!=e?e:e=[]).push((n=r?r+\"::\"+n:n)!==t.tag||\"\"===t.value?{...t,tag:n,value:t.value||void 0}:t),e),rz={value:!0,score:!0,eventType:!0},rR=(e,t,r,n,i)=>{if(t)if(eY(t))for(var a of t)e=rR(e,a,r,n,i);else if(\"object\"!=typeof t)e=rP(e,{tag:\"\",value:\"string\"==typeof t?t:void 0},i,r);else if(\"value\"in t||\"score\"in t||\"eventType\"in t)e=rP(e,{tag:\"\",eventType:n,...t},i,r);else for(var o in t){var s,l=t[o];l&&!rz[o]&&([o=r,s]=rU(o),e=rR(e,l,o,n,i+\":\"+s))}return e},rD=(e,t,r)=>rR(r,e,null==t?void 0:t.ns,null==t?void 0:t.eventType,null!=t&&t.prefix?t.prefix+\":\":\"\"),rB=t$(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rL=t$(\"variable scope\",{...rB,...tL}),rJ=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rW=e=>null!=e&&!!e.scope&&null!=rB.ranks[e.scope],rV=e=>null==e?e:[e.scope,e.key,e.entityId].join(\"\\0\"),rH=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],entityId:e[2]}},rG=()=>()=>eE(\"Not initialized.\"),rX=window,rZ=document,rY=null,rQ=(ti(()=>document.body,e=>rY=e),(e,t)=>!(null==e||!e.matches(t))),r0=((e=>th=e)(!!rX.chrome),eP),r1=(e,t,r=(e,t)=>r0<=t)=>{for(var n=0,i=ez;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&(o=t(e,(e,t)=>(null!=e&&(a=e,i=t!==eR&&null!=a),eR),n-1))!==ez&&o!==M&&!i;){var a,l,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rZ&&(e=null==o||null==(l=o.ownerDocument.defaultView)?void 0:l.frameElement)}return a},r2=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||eH(e);case\"n\":return parseFloat(e);case\"j\":return eC(()=>JSON.parse(e),eD);case\"h\":return eC(()=>n1(e),eD);case\"e\":return eC(()=>null==n3?void 0:n3(e),eD);default:return eY(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r2(e,t[0])):void 0}},r3=(e,t,r)=>r2(null==e?void 0:e.getAttribute(t),r),r5=(e,t,r)=>r1(e,(e,n)=>n(r3(e,t,r))),r6=e=>null==e?void 0:e.getAttributeNames(),r4=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,r8=e=>null!=e?e.tagName:null,r9=()=>({x:(n=r7(ez)).x/(rY.offsetWidth-window.innerWidth)||0,y:n.y/(rY.offsetHeight-window.innerHeight)||0}),r7=e=>({x:e4(scrollX,e),y:e4(scrollY,e)}),ne=(e,t)=>tD(e,/#.*$/,\"\")===tD(t,/#.*$/,\"\"),nt=(e,t,r=eR)=>(i=nr(e,t))&&{xpx:i.x,ypx:i.y,x:e4(i.x/rY.offsetWidth,4),y:e4(i.y/rY.offsetHeight,4),pageFolds:r?i.y/window.innerHeight:void 0},nr=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:a,y:o}=ni(e),{x:a,y:o}):void 0,ni=(e,t=!0)=>e?(l=e.getBoundingClientRect(),n=t?r7(ez):{x:0,y:0},{x:e4(l.left+n.x),y:e4(l.top+n.y),width:e4(l.width),height:e4(l.height)}):void 0,na=(e,t,r,n={capture:!0,passive:!0})=>(t=Q(t),tf(r,r=>B(t,t=>e.addEventListener(t,r,n)),r=>B(t,t=>e.removeEventListener(t,r,n)))),nl=()=>({...n=r7(eR),width:window.innerWidth,height:window.innerHeight,totalWidth:rY.offsetWidth,totalHeight:rY.offsetHeight}),nu=new WeakMap,ns=e=>{var t;if(null!=e)return!(t=null==(t=nu.get(e))?void 0:t.merged)&&e.getAttribute&&(t=t9(tT(e.getAttribute(\"data-tailjs\"),!0)))&&nu.set(e,{merged:t,layers:new Map([[null,t]])}),t},nv=(e,t,r=null,n)=>{if(null!=e){var i=nu.get(e);if(\"function\"==typeof t)t=t(null==i?void 0:i.merged);else if(t&&\"clear\"in t)return void nu.delete(e);null==r&&(r=null==t?void 0:t.layer);t=t9(t);return i?((e,t,r)=>ev(e,t)!==ef(e,t,r))(i.layers,r,null!=t?t:void 0)&&(i.layers.size?i.merged=t8(void 0,en(i.layers.values(),e=>null!=(e=e.layerPriority)?e:0)):(nu.delete(e),i=void 0)):t&&nu.set(e,i={merged:t,layers:new Map([[r,t]])}),ny(),null==i?void 0:i.merged}},nd=(e,t=ez)=>(t?\"--track-\":\"data-track-\")+e,nc=(e,t,r,n,i,a)=>(null!=t&&t[1]&&B(r6(e),o=>{var l,u;return null!=(u=(l=t[0])[o])?u:l[o]=(a=ez,!eX(n=B(t[1],([t,r,n],i)=>tF(o,t)&&(a=void 0,!r||rQ(e,r))&&M(null!=n?n:o)))||(i=e.getAttribute(o))&&!eH(i)||(r=rq(i,n?{prefix:tD(n,/\\-/g,\":\")}:void 0,r)),a)}),r),nf=(e,t)=>{var r,n;return(s===(s=nT.tags)?u:(n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...(r=e=>e?tP(e)?[[e]]:e6(e)?H(e,r,1):[e1(e)?[tz(e.match),e.selector,e.prefix]:[tz(e)]]:[])(H(s,([,e])=>e,1))]],u=(e,t)=>nc(e,n,t)))(e,t)},np=(e,t)=>tk(et(r4(e,nd(t,eR)),r4(e,nd(\"base-\"+t,eR))),\" \"),nm={},nh=(e,t,r=np(e,\"attributes\"))=>{var n;return r&&nc(e,null!=(n=nm[r])?n:nm[r]=[{},tC(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tz(r||n),,t])],t),rq(np(e,\"tags\"),void 0,t)},ng=new WeakMap,ny=(setInterval(()=>ny,500),()=>ng=new WeakMap),nb=(e,t,r=ez,n)=>\"\"===(c=nw(e,t,r,n))||(null==c?void 0:eH(c)),nw=(e,t,r=ez,n)=>{var i;if(e)return((null==(i=ng.get(e))?void 0:i[+r].get(t))||ef(ev(ng,e,()=>[new Map,new Map])[+r],t,{value:n&&(v=ns(e))&&null!=(v=n(v))?v:(r?r1(e,(e,r)=>r(nw(e,t,ez,n)),e3(r)?r:void 0):r3(e,nd(t))||r4(e,nd(t,eR)))||void 0})).value},nk=(e,t,r)=>{if(e){var n=[];if(r1(e,e=>n.unshift(e)),r=nh(e,r),B(n,e=>{var t;r=rq(null==(t=ns(e))?void 0:t.tags,void 0,r=nf(e,r))}),null!=r&&r.length)return{tags:rt(r,t)}}return{}},nT={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]},defaultTracking:{clicks:!0,disable:!1,formFields:{values:\"checkbox-only\",privacy:\"anonymous\"},forms:!0,impressions:!1,region:!1}},nx=[],n$=[],nA=(e,t=0)=>e.charCodeAt(t),nE=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nx[n$[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(n$[(16515072&t)>>18],n$[(258048&t)>>12],n$[(4032&t)>>6],n$[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nI=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nx[nA(e,r++)]<<2|(t=nx[nA(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nx[nA(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nx[nA(e,r++)]);return a},nO={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nF=(e=256)=>e*Math.random()|0,nj={exports:{}},{deserialize:n_,serialize:nM}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var o=0;o<e.length;o++)l(e[o]);else l(e);return i.subarray(0,a);function l(e,i){var c,o;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?v([204,e]):-128<=e&&e<=127?v([208,e]):0<e&&e<=65535?v([205,e>>>8,e]):-32768<=e&&e<=32767?v([209,e>>>8,e]):0<e&&e<=4294967295?v([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?v([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?v([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),d(e)):v(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),v(new Uint8Array(r)))})(e);break;case\"string\":(c=(o=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),o=0;o!==r;o++){var l=e.charCodeAt(o);if(l<128)a[i++]=l;else{if(l<2048)a[i++]=l>>6|192;else{if(55295<l&&l<56320){if(++o>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(o);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+o+\" out of range\");a[i++]=(l=65536+((1023&l)<<10)+(1023&u))>>18|240,a[i++]=l>>12&63|128}else a[i++]=l>>12|224;a[i++]=l>>6&63|128}a[i++]=63&l|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):v(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),v(o);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?v([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?v([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(v([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),d(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((o=(c=e).length)<=255?v([196,o]):v(o<=65535?[197,o>>>8,o]:[198,o>>>24,o>>>16,o>>>8,o]),v(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):v(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(l(r),l(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?l(t.invalidTypeReplacement(e),!0):l(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):v(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)l(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function v(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function d(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));v([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return v(t-144);if(160<=t&&t<=191)return d(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return l(4);if(203===t)return l(8);if(204===t)return o(1);if(205===t)return o(2);if(206===t)return o(4);if(207===t)return o(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return d(-1,1);if(218===t)return d(-1,2);if(219===t)return d(-1,4);if(220===t)return v(-1,2);if(221===t)return v(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function o(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function l(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=o(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=o(t));for(var r={};0<e--;)r[i()]=i();return r}function v(e,t){e<0&&(e=o(t));for(var r=[];0<e--;)r.push(i());return r}function d(t,r){t<0&&(t=o(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i=(i+=String.fromCharCode(a>>10|55296))+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=o(t));t=o(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nj.exports=n})(),(T=nj.exports)&&T.__esModule&&Object.prototype.hasOwnProperty.call(T,\"default\")?T.default:T),nq=\"$ref\",nU=(e,t,r)=>e2(e)?eU:r?t!==eU:null===t||t,nP=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,o,l=(e,t,n=e[t],i=nU(t,n,r)?s(n):eU)=>(n!==i&&(i!==eU||eY(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||e3(e)||e2(e))return eU;if(e0(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(o=null==a?void 0:a.get(e)))return e[nq]||(e[nq]=o,u(()=>delete e[nq])),{[nq]:o};if(e1(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)l(e,t);else!e6(e)||e instanceof Uint8Array||(!eY(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?l(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return eC(()=>{var r;return t?nM(null!=(r=s(e))?r:null):eC(()=>JSON.stringify(e,eU,2*!!n),()=>JSON.stringify(s(e),eU,2*!!n))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nz=e=>{var t,r,n=e=>e0(e)?e[nq]&&(r=(null!=t?t:t=[])[e[nq]])?r:(e[nq]&&delete(t[e[nq]]=e)[nq],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(eX(e)?eC(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),eU)):null!=e?eC(()=>null!=e&&e.length?n_(e):eU,()=>(console.error(\"Invalid message received.\",e,Error().stack),eU)):e)},nR=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var o,l,u,i=(e,r)=>\"number\"==typeof e&&!0===r?e:u(e=eX(e)?new Uint8Array(L(e.length,t=>255&e.charCodeAt(t))):t?eC(()=>JSON.stringify(e),()=>JSON.stringify(nP(e,!1,n))):nP(e,!0,n),r),a=e=>null==e?eU:eC(()=>nz(e),eU);return t?[e=>nP(e,!1,n),a,(e,t)=>i(e,t)]:([o,l,u]=(e=>{for(var t,r,n,i,a,l,o=0n,u=0n,s=[],v=0,d=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var m=e?()=>{s=[...p],d=255&(v=f),c=-1}:()=>{},h=e=>(d=255&(v+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(m(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=h(nF()));for(r=0,a[n++]=h(d^16*nF(16)+i);r<t;a[n++]=h(d^e[r++]));for(;i--;)a[n++]=nF();return a}:e=>e,e?e=>{for(m(),r=0;r<3;h(e[r++]));if((t=e.length-4-((d^h(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=d^h(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(l=eV(t)?64:t,m(),[o,u]=nO[l],r=0;r<e.length;o=BigInt.asUintN(l,(o^BigInt(d^h(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+o%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):o.toString(36)}]})(e),[(e,t)=>(t?eB:nE)(o(nP(e,!0,n))),e=>null!=e?nz(l(e instanceof Uint8Array?e:(r&&e9(e)?a:nI)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=f?f:f=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},[nD,,]=(nR(),nR(null,{json:!0,decodeJson:!0}),nR(null,{json:!0,prettify:!0})),t$=tR(\"\"+rZ.currentScript.src,\"#\"),tL=tR(\"\"+(t$[1]||\"\"),\";\"),nW=t$[0],nV=tL[1]||(null==(T=tE(nW,{delimiters:!1}))?void 0:T.host),nH=e=>!(!nV||(null==(e=tE(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nV))!==eR),t$=(...e)=>tD(tk(e),/(^(?=\\?))|(^\\.(?=\\/))/,nW.split(\"?\")[0]),nG=t$(\"?\",\"var\"),nX=t$(\"?\",\"mnt\"),nZ=(t$(\"?\",\"usr\"),Symbol()),nY=Symbol(),nQ=(e,t,r=eR,n=ez)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tg(\"tail.js: \",\"90;3\"))+t);r=null==e?void 0:e[nY];null!=(e=r?e[nZ]:e)&&console.log(e0(e)?tg(nD(e),\"94\"):e3(e)?\"\"+e:e),r&&r.forEach(([e,t,r])=>nQ(e,t,r,!0)),t&&console.groupEnd()},[n0,n1]=nR(),[n2,n3]=[rG,rG],n5=!0,[tL,n4]=eW(),n7=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:eX(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[ie,it]=eW(),[ir,ii]=eW(),ia=e=>il!==(il=e)&&it(il,iv(!0,!0)),io=e=>iu!==(iu=!!e&&\"visible\"===document.visibilityState)&&ii(iu,!e,is(!0,!0)),il=(ie(io),!0),iu=!1,is=te(!1),iv=te(!1),id=(na(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>ia(!1)),na(window,[\"pageshow\",\"resume\"],()=>ia(!0)),na(document,\"visibilitychange\",()=>(io(!0),iu&&ia(!0))),it(il,iv(!0,!0)),!1),ic=te(!1),[,im]=eW(),ih=ta({callback:()=>id&&im(id=!1,ic(!1)),frequency:2e4,once:!0,paused:!0}),ig=()=>!id&&(im(id=!0,ic(!0)),ih.restart()),iy=(na(window,[\"focus\",\"scroll\"],ig),na(window,\"blur\",()=>ih.trigger()),ti(()=>document.body,e=>{na(e,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],ig),ig()}),()=>ic()),ib=0,iw=void 0,ik=()=>(null!=iw?iw:rG())+\"_\"+iS(),iS=()=>(e7(!0)-(parseInt(iw.slice(0,-2),36)||0)).toString(36)+\"_\"+(++ib).toString(36),i$=new Map,iA={id:iw,heartbeat:e7()},iN={knownTabs:new Map([[iw,iA]]),variables:new Map},[iE,iI]=eW(),[iO,iF]=eW(),iC=rG,ij=(e,t=e7())=>{e=i$.get(eX(e)?e:rV(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},i_=(...e)=>{var t=e7();return iq(L(e,e=>(e.cache=[t],[rg(e),{...e,created:t,modified:t,version:\"0\"}])))},iM=e=>null!=(e=L(e,e=>{var t,r;return e&&(t=rV(e[0]),(r=i$.get(t))!==e[1])?[t,e[1],r,e[0]]:_}))?e:[],iq=e=>{var r,n,e=iM(e);null!=e&&e.length&&(r=e7(),B(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),ek(i$,e),(n=J(e,([,,,e])=>0<rL.compare(e.scope,\"tab\"))).length&&iC({type:\"patch\",payload:eb(n)}),iF(L(e,([,e,t,r])=>[r,e,t]),i$,!0))},[,iP]=(tL((e,t)=>{ie(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),iw=null!=(n=null==r?void 0:r[0])?n:e7(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),i$=new Map(et(J(i$,([,e])=>\"view\"===(null==e?void 0:e.scope)),L(null==r?void 0:r[1],e=>[rV(e),e])))):sessionStorage.setItem(\"_tail:state\",e([iw,L(i$,([,e])=>e&&\"view\"!==e.scope?e:_)]))},!0),iC=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([iw,t,r])),localStorage.removeItem(\"_tail:state\"))},na(window,\"storage\",e=>{var a,o,l;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==iw||([e,{type:a,payload:o}]=e,\"query\"===a?r.active||iC({type:\"set\",payload:[L(iN.knownTabs),L(iN.variables)]},e):\"set\"===a&&r.active?(iN.knownTabs=new Map(o[0]),iN.variables=new Map(o[1]),i$=new Map(o[1]),r.trigger()):\"patch\"===a?(l=iM(L(o,([e,t])=>[rH(e),t])),ek(iN.variables,o),ek(i$,o),iF(L(l,([,e,t,r])=>[r,e,t]),i$,!1)):\"tab\"===a&&(ef(iN.knownTabs,e,o),o)&&iI(\"tab\",o,!1))});var r=ta(()=>ti(()=>document.body,()=>iI(\"ready\",iN,!0)),-25),n=ta({callback(){var e=e7()-1e4;B(iN.knownTabs,([t,r])=>r[0]<e&&ef(iN.knownTabs,t,void 0)),iA.heartbeat=e7(),iC({type:\"tab\",payload:iA})},frequency:5e3,paused:!0});ie(e=>(e=>{iC({type:\"tab\",payload:e?iA:void 0}),e?(r.restart(),iC({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),eW()),[iz,iR]=eW(),iD=(({timeout:t=1e3,encrypt:r=!0,retries:n=50}={})=>{var i=()=>(r?n3:n1)(localStorage.getItem(\"_tail:rq\")),a=0,o=()=>localStorage.setItem(\"_tail:rq\",(r?n2:n0)([iw,e7()+t]));return async(r,l,u=null!=l?1:n)=>{for(;u--;){var v=i();if((!v||v[1]<e7())&&(o(),(null==(v=i())?void 0:v[0])===iw))return 0<t&&(a=setInterval(()=>o(),t/2)),eM(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var d=td(),[v]=na(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||d.resolve()});e=[tv(null!=l?l:t),d],await Promise.race(e.map(e=>e3(e)?e():e)),v()}var e;null==l&&eE(\"_tail:rq could not be acquired.\")}})(),iB=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n5;var i,a,o=!1,l=r=>{var l=e3(t)?null==t?void 0:t(i,r):t;if(!1===l)return!1;iP(e,i=null!=l&&!0!==l?l:i,r,e=>(o=i===eU,i=e));l=!o&&(a=n?n2(i,!0):JSON.stringify(i));return!!l&&!!l.length&&l};if(!r)return iD(()=>G(1,async t=>{var o;return l(t)?400<=(o=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?M(eE(\"Invalid response: \"+await o.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tv(200*(1+t))):(null!=(o=null!=(t=n?new Uint8Array(await o.arrayBuffer()):await o.text())&&t.length?null==(o=n?n3:JSON.parse)?void 0:o(t):eU)&&iR(o),M(o)):M}));l(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&eE(\"Beacon send failed.\")},T=[\"scope\",\"key\",\"entityId\",\"source\"],iJ=[...T,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\",\"passive\"],iW=[...T,\"value\",\"force\",\"ttl\",\"version\"],iV=Symbol(),iH=new Map,iG=Symbol(),iX=(e,t)=>{var r;return(null!=(r=(m=e)[h=iG])?r:m[h]=new Set).add(t),e},iY=Symbol(),iQ=Symbol(),i0=[.75,.33],i1=[.25,.33],i3=e=>!!(e=\"string\"==typeof e?eH(e):e)&&{delay:!0===e||null==e.delay?nT.impressionThreshold:e.delay},i6=e=>L(en(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rh(e)}, ${rW(e)?\"client-side memory only\":tK(null==(e=e.schema)?void 0:e.usage)})`,ez]:_),i8=()=>{var i,o,a,r=null==rX?void 0:rX.screen;return r?({width:r,height:i,orientation:a}=r,o=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rX.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rX.devicePixelRatio,width:r,height:i,landscape:o}}):{}},i9=e=>e({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==y?void 0:y.clientId,languages:L(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return{id:e,language:r,region:n,primary:0===t,preference:t+1}}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},webdriver:navigator.webdriver,...i8()}),i7=(e,t=\"A\"===r8(e)&&r3(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ae=(e,t=r8(e))=>\"INPUT\"===t||\"SELECT\"===t||\"TEXTAREA\"==t||\"LABEL\"===t,at=(e,t=r8(e),r=nb(e,\"button\"),n=r3(e,\"type\"))=>r===eR||r!==ez&&(\"A\"===t||\"BUTTON\"===t||\"INPUT\"===t&&(\"button\"===(n=null==n?void 0:n.toLowerCase())||\"submit\"===n||\"checkbox\"===n&&!e.form)),ar=(e,t=!1)=>{var r;return{tagName:\"INPUT\"===e.tagName&&e.type?e.tagName+`[type=${e.type}]`:e.tagName,text:ty((null==(r=r3(e,\"title\"))?void 0:r.trim())||(null==(r=r3(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),50),className:e.className||void 0,href:null==(r=e.href)?void 0:r.toString(),rect:t?ni(e):void 0}},ai=e=>{if(g)return g;if(eX(e)&&([n,e]=n1(e),e=nR(n,{decodeJson:!0})[1](e)),eS(nT,[e],{overwrite:!0}),null!=(n=rX[nT.name])&&n.__isTracker)return g=rX[nT.name];(e=>{n3===rG&&([n2,n3]=nR(e,{json:!e,prettify:!1}),n5=!!e,n4(n2,n3))})(ep(nT,\"encryptionKey\"));var n,s,v,d,c,f,p,m,h,y,b,w,k,S,l=ep(nT,\"key\"),u=null!=(n=null==(e=rX[nT.name])?void 0:e._)?n:[];if(eY(u))return s=[],v=[],d=(e,...t)=>{var r=eR;v=J(v,n=>eC(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:g,unsubscribe:()=>r=ez}),r},(e=>t=>n7(e,t))(n)))},c=[],p=((e,t)=>{var r=ta(async()=>{var e=L(iH,([e,t])=>ee(t,e=>null==(e=e[iV])?void 0:e.refresh)?{...rH(e),refresh:!0}:_);e.length&&await o.get(e)},3e3),n=(e,t)=>t&&!!ev(iH,e,()=>new Set).add(t),a=(ie((e,t)=>r.toggle(e,e&&3e3<=t),!0),iO(e=>B(e,([e,t])=>{null!=t&&t.passive?delete t.passive:(e=>{var t,r;e&&(t=rV(e),null!=(r=ep(iH,t)))&&r.size&&B(r,r=>!0===r(e)&&n(t,r))})(t?{status:ry.Success,...t}:{status:ry.NotFound,...e})})),(e,t)=>(t[iV]=e,n(rV(e),t))),o={get:r=>rE(\"get\",r,async r=>{r[0]&&!eX(r[0])||(l=r[0],r=r.slice(1)),null!=t&&t.validateKey(l);var u=new Map,s=[],v=L(r,e=>{var t=ij(rV(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:ry.Forbidden,error:`No consent for '${r}'.`});else if(!e.refresh&&t)u.set(e,{status:ry.Success,...t});else{if(!rW(e))return[eT(e,iJ),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rg(e),version:\"1\",created:d,modified:d,value:r,cache:[d,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},ey(s,[rg(r),r]),u.set(e,{status:ry.Success,...r})):u.set(e,{status:ry.NotFound,...rg(e)})}return _}),d=(B(u,([e,t])=>{var r,n;e.poll&&(r=rN(e,t),(n=async t=>!0===await r(t)&&(null==a?void 0:a(e,n)))(t))}),e7()),l=v.length&&(null==(l=await iB(e,{variables:{get:L(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=l.variables)?void 0:r.get)||[],f=[];return B(l,(e,t)=>{var n,r=v[t][1];(null==e?void 0:e.status)===ry.NotFound&&r.init?null!=(n=r.init())&&f.push([r,{...rg(r),value:n}]):u.set(v[t][1],rJ(e))}),f.length&&B(await o.set(L(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rJ(e.status===ry.Conflict?{...e,status:ry.Success}:e.status===ry.Success&&null==e.value?{...e,status:ry.NotFound}:e))),s.length&&iq(s),u},{poll:a,logCallbackError:(e,t,r)=>n7(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rE(\"set\",r,async r=>{r[0]&&!eX(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,a=[],l=new Map,u=e7(),s=[],v=L(r,e=>{var i,r,t=ij(rV(e));return rW(e)?(i=e.patch?e.patch(null==t?void 0:t.value):e.value,null!=(null==t?void 0:t.value)&&(i===(null==t?void 0:t.value)||eI(i,null==t?void 0:t.value))||((r=null==i?void 0:{...rg(e),created:null!=(r=null==t?void 0:t.created)?r:u,modified:u,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[u,e.ttl]})&&(r.cache=[u,null!=(i=e.ttl)?i:3e3]),l.set(e,r?{status:t?ry.Success:ry.Created,...r}:{status:ry.Success,...rg(e)}),ey(a,[rg(e),r])),_):e.patch?(s.push(e),_):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[eT(e,iW),e])}),d=0;!d++||s.length;)B(await o.get(L(s,e=>rg(e))).all(),(e,t)=>{var r=s[t];rw(e,!1)?ey(v,[{...r,patch:void 0,value:s[t].patch(null==e?void 0:e.value),version:e.version},r]):l.set(r,e)}),s=[],B(v.length?eF(null==(i=(await iB(e,{variables:{set:L(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=v[t];d<=3&&t.patch&&((null==e?void 0:e.status)===ry.Conflict||(null==e?void 0:e.status)===ry.NotFound)?ey(s,t):l.set(t,rJ(e))});return a.length&&iq(a),l},{logCallbackError:(e,t,r)=>n7(\"Variables.set\",e,{operation:t,error:r})})};return iz(({variables:e})=>{e&&null!=(e=et(L(e.get,e=>rb(e)?e:_),L(e.set,e=>rw(e)?e:_)))&&e.length&&iq(L(e,e=>[rg(e),rw(e)?e:void 0]))}),o})(nG,f={applyEventExtensions(e){return null==e.clientId&&(e.clientId=ik()),null==e.timestamp&&(e.timestamp=e7()),w=eR,B(s,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===ez&&M(!0)})?void 0:e},validateKey:(e,t=!0)=>!l&&!e||e===l||!!t&&eE(`'${e}' is not a valid key.`)}),m=((e,t)=>{var n=[],i=new WeakMap,a=new Map,o=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eS(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):eE(\"Source event not queued.\")},l=e=>{i.set(e,eg(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!eX(r[0])||(a=r[0],r=r.slice(1)),r=L(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eS(e,{metadata:{posted:!0}}),e[iG]){if(B(e[iG],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iG]}return eS(tX(eg(e),!0),{timestamp:e.timestamp-e7()})}),nQ({[nY]:L(r,e=>[e,e.type,ez])},\"Posting \"+tx([tm(\"new event\",[V(r,e=>!tZ(e))||void 0]),tm(\"event patch\",[V(r,e=>tZ(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),iB(e,{events:r,variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var o=[];if(e=L(Q(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||o.push(e),null!=(r=eS(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:_}),B(o,e=>nQ(e,e.type)),!i)return u(e,!1,a);r?(n.length&&e.unshift(...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&n.push(...e)};return ta(()=>s([],{flush:!0}),5e3),ir((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=L(a,([e,t])=>{var r=null;return B(t,n=>{var[o,l]=n();l&&(t.delete(n),t.size||(a.delete(e),i.delete(e))),o&&(r=r?{...r,...o}:o)}),null!=r?r:_}),n.length||e.length)&&s(et(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r=!0)=>s(o(e,t),{flush:r}),registerEventPatchSource(e,t,r=!1,n){r&&s(e);var u=!1,v=()=>{u=!0};return l(e),iX(e,l),ev(a,e,()=>new Set).add(()=>{if(!1===(null==n?void 0:n.isConnected))v();else{var a=i.get(e),[r,s]=null!=(r=e$(t(a,v),a))?r:[];if(r&&!eI(s,a))return i.set(e,eg(s)),[o(e,r),u]}return[void 0,u]}),v}}})(nG,f),h={track:{...nT.defaultTracking},layer:\"default\",layerPriority:-10},aA(document.body)||((null!=(n=(e=null!=h?h:h={}).track)?n:e.track={}).disable=!0,nT.disabled=!0),y=null,b=0,k=w=ez,S=!1,g=(...e)=>{if(S){if(e.length){1<e.length&&(!e[0]||eX(e[0]))&&(t=e[0],e=e.slice(1)),eX(e[0])&&(e=(r=e[0])?e9(r)?JSON.parse(r):n1(r):[]);var t,n=ez;if((e=J(H(e,e=>e&&eX(e)?n1(e):e),e=>{if(!e)return ez;if(aj(e))nT.tags=ek({},nT.tags,e.tagAttributes);else{if(a_(e))return nT.disabled=e.disable,ez;if(aH(e)){var t;null!=(null==(h=t8(h,{track:e.track}))||null==(t=h.track)?void 0:t.disable)&&(nT.disabled=h.track.disable),h&&(h.layer=\"defaults\",h.layerPriority=-10),nv(document.body,h)}else{if(aU(e))return n=eR,ez;if(aJ(e))return e(g),ez}}return k||aR(e)||aq(e)?eR:(c.push(e),ez)}))&&(e.length||n)&&!nT.disabled){var r=en(e,e=>aq(e)?-100:aR(e)?-50:aL(e)?-10:90*!!rI(e));if(!y||!y.splice(w?b+1:y.length,0,...r)){y=r;try{for(b=0;b<y.length;b++){var a=y[b];a&&(f.validateKey(null!=t?t:a.key),eC(()=>{var e=y[b];if(d(\"command\",e),w=ez,rI(e))m.post(e);else if(az(e))p.get(Q(e.get));else if(aL(e))p.set(Q(e.set));else if(aR(e))v.push(e.listener);else if(aq(e))(t=eC(()=>e.extension.setup(g),t=>n7(e.extension.id,t)))&&(s.push([null!=(r=e.priority)?r:100,t,e.extension]),en(s,([e])=>e));else if(aJ(e))e(g);else{var r,n,t,a=ez;for([,t]of s)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:ez)break;a||n7(\"invalid-command\",e,\"Loaded extensions:\",L(s,e=>e[2].id))}},e=>n7(g,\"internal-error\",e)))}}finally{y=null}n&&m.post([],{flush:n})}}}}else u.push([e])},Object.defineProperty(rX,nT.name,{value:Object.freeze(Object.assign(g,{id:\"tracker_\"+ik(),events:m,variables:p,__isTracker:eR})),configurable:!1,writable:!1}),iO((e,t,r)=>{var n=et(i6(L(e,([,e])=>e||_)),[[{[nY]:i6(L(t,([,e])=>e||_))},\"All variables\",eR]]);nQ({[nY]:n},tg(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${t.size} in total).`,\"2;3\"))}),iE(async(e,t,r,n)=>{if(\"ready\"===e){var[e,a,o]=await p.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:eP},{scope:\"device\",key:\"@info\",cache:!0}]).values(!1);if(e){for(var l of(nQ({consent:ri(a),session:{firstSeenDate:tt(e.firstSeen),lastSeenDate:tt(e.lastSeen),duration:tr(e.lastSeen-e.firstSeen),...ri(e)},device:o?{firstSeenDate:tt(o.firstSeen),lastSeenDate:tt(o.lastSeen),duration:tr(o.lastSeen-o.firstSeen),...ri(o)}:\"(anonymous session)\"},\"Session and device info\"),f.deviceSessionId=e.deviceSessionId,n(),nv(document.body,h),S=!0,g(...L(aI,e=>({extension:e}))),k=!0,e.hasUserAgent||(i9(g),e.hasUserAgent=!0),c.length&&g(c),u))l.length&&g(...l);g({set:{scope:\"view\",key:\"loaded\",value:!0}})}else console.warn(\"No session. Tracking is disabled;\")}},!0),g;eE(`The global variable for the tracker \"${nT.name}\" is used for something else than an array of queued commands.`)},aa=()=>null==y?void 0:y.clientId,ao={scope:\"shared\",key:\"referrer\"},al=(e,t)=>{g.variables.set({...ao,value:[aa(),e]}),t&&g.variables.get({scope:ao.scope,key:ao.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},au=te(),as=te(),av=1,[ac,af]=eW(),ap=e=>{var t=te(e,au),r=te(e,as),n=te(e,iy),i=te(e,()=>av);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},am=ap(),[ag,ay]=eW(),ab=(e,t)=>(t&&B(ak,t=>e(t,()=>!1)),ag(e)),aw=new WeakSet,ak=document.getElementsByTagName(\"iframe\");function aT(e){if(e){if(null!=e.units&&eO(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ax=(e,t)=>{e=nk(e,t);return(null==e?void 0:e.tags)&&e},a$=(e,t)=>t?e:{...e,rect:void 0,content:(S=e.content)&&L(S,e=>({...e,rect:void 0}))},aA=e=>!0!==r1(e,(e,t)=>{var n=(null==(n=ns(e))||null==(n=n.track)?void 0:n.disable)||nb(e,\"disable\");null!=n&&t(n)}),aN=(e,{directOnly:t,includeRegion:r,eventType:n,previous:i}={})=>{var a,o,l,u,s,v,d;if(e.isConnected)return s=void 0,v=[],d=0,r1(e,e=>{var i,n=ns(e);n&&(t1(n)&&(i=null!=(i=J(t2(n.components),e=>{var r;return e&&(0===d||!t&&(1===d&&(null==(r=e.track)?void 0:r.secondary)!==eR||(null==(r=e.track)?void 0:r.promote)))}))?i:[],o=(null!=r?r:ee(i,e=>null==(e=e.track)?void 0:e.region))&&ni(e)||void 0,n.content&&(null!=s?s:s=[]).unshift(...L(n.content,e=>e?{...e,rect:o}:_)),null!=i)&&i.length&&(v.unshift(...L(i,e=>{var t;return d=ea([d,null!=(t=e.track)&&t.secondary?1:2]),a$({...e,track:void 0,content:t2(s),rect:o},!!o)})),s=void 0),i=n.area||nw(e,\"area\"))&&v.unshift(i)}),B(v,e=>{eX(e)?(null!=l?l:l=[]).push(e):(null==e.area&&(e.area=tk(l,\"/\")),(null!=u?u:u=[]).unshift(e))}),null!=(e=ax(e,n))&&null!=(a=e.tags)&&a.length||null==i||!i.tags||(e={tags:[]}),u||l||s||null!=e&&e.tags?re({components:t2(u),area:tk(l,\"/\"),content:t2(s),...e},n):void 0},aE=Symbol(),aI=[{id:\"context\",setup(e){ta(()=>B(ak,e=>ed(aw,e)&&ay(e)),500).trigger();var n,t,v=null!=(t=null==(t=ij({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,d=null==(t=ij({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==d&&i_({scope:\"tab\",key:\"tabIndex\",value:d=null!=(t=null!=(t=null==(t=ij({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=ij({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:d+1}),null),f=(t=ez)=>{var a,o,l,i,m;ne(\"\"+c,c=location.href)&&!t||(null!=b&&b(),{source:t,scheme:i,host:a,query:o}=null!=(t=tE(location.href+\"\",{requireAuthority:!0}))?t:{},y={type:\"view\",timestamp:e7(),clientId:ik(),tab:iw,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},queryString:eb(o,([e,t])=>eY(t)?[e,t]:[e,[t]]),tabNumber:d+1,tabViewNumber:v+1,viewport:nl(),duration:am(void 0,!0)},0===d&&(y.firstTab=eR),0===d&&0===v&&(y.landingPage=eR),i_({scope:\"tab\",key:\"viewIndex\",value:++v}),L([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var i;return null!=(e=(null!=(i=(l=y).utm)?i:l.utm={})[e]=null==(i=Q(null==y||null==(i=y.queryString)?void 0:i[\"utm_\"+e]))?void 0:i[0])?e:_}),!(y.navigationType=w)&&performance&&B(performance.getEntriesByType(\"navigation\"),e=>{y.redirects=e.redirectCount,y.navigationType=tD(e.type,/\\_/g,\"-\")}),k&&(y.clientNavigation=k),w=k=void 0,\"navigate\"===(null!=(t=y.navigationType)?t:y.navigationType=\"navigate\")&&(m=null==(i=ij(ao))?void 0:i.value)&&nH(document.referrer)&&(y.view=null==m?void 0:m[0],y.relatedEventId=null==m?void 0:m[1],e.variables.set({...ao,value:void 0})),(m=document.referrer||null)&&!nH(m)&&(y.externalReferrer={href:m,domain:(()=>{var{host:t,scheme:r,port:n}=tE(m,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),y.definition=n,n=void 0,e.events.post(y),b=e.events.registerEventPatchSource(y,()=>({duration:am(),tags:y.tags})),af(y))};return ir(e=>{e?(as(eR),++av):as(ez)}),na(window,\"popstate\",()=>(w=\"back-forward\",f())),B([\"push\",\"replace\"],e=>{var t=e+\"State\",r=history[t];history[t]=(...t)=>{r.apply(history,t),w=\"navigate\",k=e,f()}}),f(),{processCommand(t){var i,s;return aC(t)?(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),!0):!!aW(t)&&((i=null==(t=t.view)?void 0:t.tags)&&y&&(i=null!=(i=null==(i=nv(y,{view:{tags:i}},t.layer))?void 0:i.view.tags)?i:[],eI(y.tags,i)||(y.tags=i)),(i=null!=t&&t.id?t:(null==t?void 0:t.definition)||void 0)&&!eI(i,null==y?void 0:y.definition)&&(null==y||y.definition?(n=i).navigation&&f(!0):(y.definition=i,t=\"\",null!=(s=y.metadata)&&s.posted&&(t=\" via patch\",e.events.postPatch(y,{definition:y.definition})),nQ(y,y.type+` (definition updated${t})`)),e({set:{scope:\"view\",key:\"view\",value:null!=i?i:null}})),!0)},decorate(e){!y||rO(e)||tZ(e)||(e.view=y.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>B(e,e=>{var t,r;return null==(t=(r=e.target)[iY])?void 0:t.call(r,e)})),r=new Set,n=(ta({callback:()=>B(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rZ.createRange();return(a,o)=>{if(!o)return!1;var f,p,m,y,b,w,k,S,T,x,$,A,N,l={components:L(o.components,e=>{var t;return null!=(t=e.track)&&t.impressions?{key:tY(e),config:null==(t=e.track)?void 0:t.impressions}:_}),config:null==o||null==(l=o.track)?void 0:l.impressions},u=l.config||null!=(u=l.components)&&u.length?tS(l):\"\";(null==(l=a[iQ])?void 0:l[0])!==u&&(u?(y=null==(l=a[iQ])?void 0:l[1],b=a[iQ]=[u,new Map],w=i3(null==(l=o.track)?void 0:l.impressions),k=L(null==o?void 0:o.components,e=>{var t=i3(null!=(t=null==e||null==(t=e.track)?void 0:t.impressions)?t:w);return t?[e,t,ef(b[1],tY(e),null!=(t=ev(y,tY(e)))?t:{active:!1,pendingActive:!1,activeTime:te(!1,iy),viewDuration:ap(!1),impressions:0})]:_}),B(y,([e,t])=>!b[1].has(e)&&(null==(e=t.unbindPassiveEventSource)?void 0:e.call(t))),null!=k&&k.length&&((S=ns(a.previousElementSibling))&&(k=J(k,e=>!ee(t2(S.components),t=>tQ(e[0],t)))),T=0,x=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=f?f:f=[])[e])?a:i[e]=[{duration:0,impressions:0},te(!1,iy),!1,!1,0,0,0,eA()];a[4]=t,a[5]=r,a[6]=n},$=[eA(),eA()],A=-1,N=()=>{var t=a.getBoundingClientRect(),r=window.innerWidth,o=window.innerHeight,l=[n(t.top,o),n(t.right,r),n(t.bottom,o),n(t.left,r)],u=l[2]-l[0],s=l[1]-l[3],v=u/t.height||0,d=s/t.width||0,c=(B(k,([t,{delay:i},l])=>{var b,c=l.active?i1:i0,c=(c[0]*o<u||c[0]<v)&&(c[0]*r<s||c[0]<d);if(l.pendingActive!==c&&l.activeTime(l.pendingActive=c,!0),l.active!==(l.active=l.pendingActive&&l.activeTime()>=i-250)){if(++l.impressions,l.viewDuration(l.active),!l.impressionEvent){c=aN(a,{directOnly:eR,eventType:\"impression\"}),i={...c,components:J(null==c?void 0:c.components,e=>tQ(t,e))};if(null==(c=i.components)||!c.length)return _;l.impressionEvent={type:\"impression\",pos:nt(a),viewport:nl(),timeOffset:am(),impressions:l.impressions,element:ar(a),...i}}l.impressionEvent&&(b=l.viewDuration(),l.unbindPassiveEventSource=e.events.registerEventPatchSource(l.impressionEvent,()=>({duration:b,impressions:l.impressions,regions:f&&{top:f[0][0],middle:f[1][0],bottom:f[2][0]},seen:T,text:m,read:b.activeTime&&m&&n(b.activeTime/m.readTime,T)}),!0))}}),ee(k,e=>e[2].active));if(t.height!==A){A=t.height;l=a.textContent;if({boundaries:p,...m}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,o=0,l=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++l,++o);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),v=[0,.25,.75,1].map(e=>e*a|0),d=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,m=!1,h=0;h<v.length;h++)v[h]--||(d[h]={offset:null!=n?n:c,wordsBefore:f,readTime:e4(f/238*6e4)},m=!0);(p=!m)||(f=0),n=c+1}}while(r);return{text:ty(e,50),length:e.length,characters:a,words:o,sentences:u,lix:e4(o/u+100*l/o),readTime:e4(o/238*6e4),boundaries:d}})(null!=l?l:\"\"),f||t.height>=1.25*o){var g=rZ.createTreeWalker(a,NodeFilter.SHOW_TEXT),y=0,b=0;for(null==f&&(f=[]);b<p.length&&(w=g.nextNode());){var w,S,N,F,C,I=null!=(S=null==(S=w.textContent)?void 0:S.length)?S:0;for(y+=I;y>=(null==(N=p[b])?void 0:N.offset);)i[b%2?\"setEnd\":\"setStart\"](w,p[b].offset-y+I),b++%2&&({top:N,bottom:F}=i.getBoundingClientRect(),C=t.top,b<3?x(0,N-C,F-C,p[1].readTime):(x(1,f[0][4],N-C,p[2].readTime),x(2,N-C,F-C,p[3].readTime)))}}}var l=t.left<0?-t.left:0,M=t.top<0?-t.top:0,q=t.width*t.height;c&&(T=$[0].push(M,M+u)*$[1].push(l,l+s)/q),f&&B(f,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>o?o:t.bottom,e[5],e[4]),a=c&&0<i-r,l=e[0];l.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,l.seen=e[7].push(r,i)/(e[5]-e[4]),l.read=n(l.duration/e[6],l.seen))})},a[iY]=({isIntersecting:e})=>{ef(r,N,e),e||(B(k,([,,{unbindPassiveEventSource:e}])=>null==e?void 0:e()),N())},t.observe(a))):(null!=(u=a[iY])&&u.call(a,!1),delete a[iQ],t.unobserve(a)))}})(e),r=({boundary:e,...r})=>{var n=nv(e,null!=(n=null==r?void 0:r.update)?n:r);t(e,n)};return{decorate(e){B(e.components,t=>{t.track&&delete t.track,B(e.elements,e=>e.track&&delete e.track)})},processCommand:e=>aM(e)?(r(e),eR):aB(e)?(B(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=r3(i,e);){ed(n,i);var o,l=tR(r3(i,e),\"|\");r3(i,e,null);for(var u=0;u<l.length;u++){var v=l[u];if(\"\"!==v){var s=\"-\"===v?-1:parseInt(null!=(s=eZ(v))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(v))for(var c=\"\";u<l.length;u++)try{v=JSON.parse(c+=l[u]);break}catch{}0<=s&&t[s]&&(v=t[s]),ey(a,v)}}}ey(r,...L(a,e=>({add:eR,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(o=i.parentNode)&&o.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),r),eR):ez}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{na(r,[\"click\",\"contextmenu\",\"auxclick\",\"pointerdown\"],n=>{if(aA(n.target)){var i,a,o,l,u,s=\"pointerdown\"===n.type,v=null,d=ez;if(r1(n.target,e=>{at(e)&&null==o&&(o=e),ae(e)&&null==v&&(v=e),d=d||\"NAV\"===r8(e);var t,s=ns(e),s=t2(null==s?void 0:s.components);!n.button&&null!=s&&s.length&&!u&&(B(e.querySelectorAll(\"a,button\"),t=>at(t)&&(3<(null!=u?u:u=[]).length?(u=void 0,M):u.push({...ar(t,!0),component:r1(t,(e,t,r,n=t2(null==(i=ns(e))?void 0:i.components))=>n&&t(n[0]),t=>t===e)}))),u)&&null==l&&(l=e),null==i&&(i=null!=(t=nb(e,\"clicks\",eR,e=>null==(e=e.track)?void 0:e.clicks))?t:s&&ee(s,e=>(null==(e=e.track)?void 0:e.clicks)!==ez)),null==a&&(a=null!=(t=nb(e,\"region\",eR,e=>null==(e=e.track)?void 0:e.region))?t:s&&ee(s,e=>null==(e=e.track)?void 0:e.region))}),null!=l?l:l=o){var E,c=0<(null==u?void 0:u.length)&&!o&&!v&&i,f=e=>aN(null!=o?o:l,{includeRegion:c,eventType:e}),p=(null==i&&(i=!d),{...(a=null==a?eR:a)?{pos:nt(o,n),viewport:nl()}:null,...((e,t)=>{var n;return r1(null!=e?e:t,e=>\"IMG\"===r8(e)||e===t?(n={element:ar(e,!1)},ez):eR),n})(n.target,null!=o?o:l),timeOffset:am()});if(o)if(i7(o)){var m=o,h=m.hostname!==location.hostname,g=m.href||m.getAttribute(\"href\")||\"\";if(g){if(m.host===location.host&&m.pathname===location.pathname&&m.search===location.search)return\"#\"===m.hash?void 0:void(m.hash===location.hash||0!==n.button||s||e({type:\"anchor_navigation\",anchor:m.hash,...p,...f(\"anchor_navigation\")}));var T,x,$,N,y=tE(g,{delimiters:!1,requireAuthority:!0}),{host:g,scheme:b,source:y}=(y||(b=g.match(/^([^:]+):(?:\\/\\/)?(.+)/),y={source:g,scheme:null==b?void 0:b[1]}),y);!y||(T=!(null==(b=null==b?void 0:b.toLowerCase())||!b.match(/^https?/)))&&s||!T&&!s||(x={clientId:ik(),type:\"navigation\",href:h?m.href:y,external:h,domain:g||b?{host:g,scheme:b}:void 0,self:eR,anchor:m.hash||void 0,...p,...f(\"navigation\")},\"contextmenu\"!==n.type?n.button<=1&&(T?1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r3(m,\"target\")&&r3(m,\"target\")!==window.name?(x.self=ez,e(x),al(x.clientId)):ne(location.href,m.href)||(x.exit=x.external,e(x),al(x.clientId)):(x.self=ez,e(x))):T&&($=m.href,(y=nH($))?al(x.clientId,()=>e(x)):(N=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),y||nT.captureContextMenu&&(m.href=nX+\"=\"+N+encodeURIComponent($),na(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===N&&e(x),r())),na(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),m.href=$})))))}}else!s&&(r1(n.target,(e,t)=>{var r;return!!(null!=E?E:E=(e=>eX(e=null==e||e!==eR&&\"\"!==e?e:\"add\")&&eO(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:e0(e)?e:void 0)(null!=(r=null==(r=ns(e))?void 0:r.cart)?r:nw(e,\"cart\")))&&!E.item&&(E.item=W(t2(null==(r=ns(e))?void 0:r.content)))&&t(E)}),(h=aT(E))||i)&&e(h?{type:\"cart_updated\",...p,...f(\"cart_updated\"),...h}:{type:\"component_click\",...p,...f(\"component_click\")});else!s&&c&&((e,t,r)=>{r=r(ev(e,t));\"function\"==typeof(null==r?void 0:r.then)?r.then(r=>ef(e,t,r)):ef(e,t,r)})(t,l,r=>{var i=nr(l,n);return r?r.push(i):(i={type:\"component_click_intent\",...p,...f(\"component_click_intent\"),clicks:r=[i],elements:u},e.events.registerEventPatchSource(i,()=>({clicks:t.get(l)}),!0,l)),r})}}})};r(document),ab(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r7(eR);ac(()=>{return e=()=>(t={},r=r7(eR)),setTimeout(e,250);var e}),na(window,\"scroll\",()=>{var a,n=r7(),i=r9();n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=eR,a.push(\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=eR,a.push(\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=eR,a.push(\"page-end\")),(n=L(a,e=>({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return aF(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=aT(r))&&e({...r,type:\"cart_updated\"}),eR):aD(t)?(e({type:\"order\",...t.order}),eR):ez}})},{id:\"forms\",setup(e){var t,r,n=new Map,i=[],a=window.fetch,o=(window.fetch=async(...e)=>{var t=W(i);if(!t||t.requestState||100<e7()-t.started)return a(...e);t.requestState=1;try{var r=await a(...e),n=(r.ok||(nQ(`Request for pending form failed (status ${r.status}). ${tg(\"Form not submitted\",1)}.`),t.cancel(!1)),r.headers.get(\"content-type\"));if(n&&n.includes(\"application/json\"))try{var o,l=await r.json();(null!=l&&l.error||null!=l&&null!=(o=l.errors)&&o.length)&&(nQ(`Request for pending form (presumably) failed with an error response ('${tS(l)}'). ${tg(\"Form not submitted\",1)}.`),t.cancel(!1))}catch{nQ(`Request for pending form failed (invalid JSON). ${tg(\"Form not submitted\",1)}.`),t.cancel(!1)}return t.pending&&(nQ(`Request for pending form succeeded. ${tg(\"Form submitted\",1)}.`),t.complete(!1)),r}catch(e){throw nQ(`Request for pending form failed ('${e.toString()}'). ${tg(\"Form not submitted\",1)}.`),t.cancel(!1),e}finally{t.requestState=2}},e({consent:{get:e=>(t=e,!0)}}),(e,r=!1)=>{var l,a=!r||(null!=(a=nw(e,\"field\",!0,e=>null==(e=e.track)||null==(e=e.formFields)?void 0:e.values))?a:\"checkbox-only\"),o=(r&&(a=!0===a||\"checkbox-only\"===a&&\"checkbox\"===e.type)&&(o=null!=(o=nw(e,\"field-privacy\",!0,e=>null==(e=e.track)||null==(e=e.formFields)?void 0:e.privacy))?o:\"anonymous\")&&(l=null!=(l=null==t?void 0:t.classification)?l:\"anonymous\",a=tB.compare(o,l)<=0),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return r&&(o=o&&ty(o,200)),a?o:void 0}),l=t=>{var r,l,u,d,a=t.form;if(a&&!1!==nb(a,\"disable\",!0,e=>null==(e=e.track)?void 0:e.forms)&&0!=nb(a,\"form\",!0,e=>null==(e=e.track)?void 0:e.forms))return l=r5(a,nd(\"ref\"))||\"track_ref\",u=0,(d=ev(n,a,()=>{var t,n,o=new Map,l={type:\"form\",name:r5(a,nd(\"form-name\"))||r3(a,\"name\")||a.id||void 0,...aN(a,{eventType:\"form\"}),activeTime:0,totalTime:0,fields:{}},u=(e.events.post(l),e.events.registerEventPatchSource(l,e=>({...l,...aN(a,{eventType:\"form\",previous:e}),timeOffset:am()})),(n=!1)=>!(!n&&1===t[3]||(v(),(2<=t[3]||n)&&(l.completed=n||3===t[3]||!(a.isConnected&&ni(a).width),n)&&nQ(`Form explicitly submitted. ${tg(\"Form submitted\",1)}.`),e.events.postPatch(l,{...null!=r?r:aN(a,{eventType:\"form\"}),completed:l.completed,totalTime:e7(eR)-t[4]}),r=void 0,t[3]=1,0))),d=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),eV(i)?i&&(a<0?eK:eq)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})(),c=()=>{for(var e=a.ownerDocument;e;){if(ee(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||ni(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=eC(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1},f=null,p=null,m=e=>{var o;e.target===a&&(p=e),2===t[3]&&(r=aN(a,{eventType:\"form\"}),t[3]=3,(o=()=>{if(!f)return!1;f.pending=!1;var e=i.indexOf(f);return-1<e&&i.splice(e,1),(f=null)!=n&&n(),d(!1),!0})(),f={started:e7(),requestState:0,pending:!0,formElement:a,defaultPrevented:!1,cancel:e=>!!o()&&(t[3]=2,e&&nQ(`Form submit explicitly cancelled. ${tg(\"Form not submitted\",1)}.`),!0),complete:e=>!!o()&&(e&&(nQ(`Form explicitly submitted. ${tg(\"Form submitted\",1)}.`),2===t[3])&&(t[3]=3),u(),!0)},i.push(f),setTimeout(()=>{var r,i;e.defaultPrevented||null!=p&&p.defaultPrevented?(f&&(f.defaultPrevented=!0),p=null,[n]=ie((e,n)=>{e||(r?null!=f&&f.cancel(!1)&&nQ(`The browser is navigating to another page after submit leaving a reCAPTCHA challenge. ${tg(\"Form not submitted\",1)}.`):3===t[3]?null!=f&&f.pending&&(e=e7()-f.started,!f.requestState&&e<1500?null!=f&&f.complete(!1)&&nQ(`The browser is navigating to another page shortly after submit, and no requests are pending. ${tg(\"Form (quite likely) submitted\",1)}.`):f.defaultPrevented?null!=f&&f.cancel(!1)&&nQ(`The browser is navigating to another page before submit has completed. Note to developers: You may need to do an explicit \\`tail({form:\"submit\", ref: (submit event/form element)})\\` if you think this is wrong. ${tg(\"Form state uncertain\",1)}.`):null!=f&&f.complete(!1)&&nQ(`The browser is navigating to another page before 10s after submit. ${tg(e<3e3?\"Form submitted\":\"Form (quite likely) submitted\",1)}.`)):1!==t[3]&&null!=f&&f.cancel(!1)&&nQ(`The browser is navigating to another page after submit, but submit was cancelled earlier because of validation errors. ${tg(\"Form not submitted.\",1)}.`))}),r=!1,i=e7(),d(()=>{var e=e7()-i;if(c())t[3]=2,nQ(\"reCAPTCHA challenge is active.\"),r=!0;else if(r&&(r=!1,nQ(\"reCAPTCHA challenge ended (for better or worse).\"),t[3]=3),a.isConnected&&0<ni(a).width){if(1e4<=e)return t[3]=2,nQ(`Form is still visible after ${e} ms, validation errors assumed. Logic for auto-detecting submit is suspended. ${tg(\"Form not submitted\",1)}.`),!1}else null!=f&&f.complete(!1)&&nQ(`Form is no longer visible ${e} ms after submit. ${tg(\"Form submitted\",1)}.`);return!0},1e3)):null!=f&&f.complete(!1)&&nQ(`Submit event triggered and default not prevented. ${tg(\"Form submitted\",1)}.`)},1))};return na(a.ownerDocument.body,\"submit\",m),B(a.querySelectorAll(\"BUTTON,INPUT\"),e=>{\"submit\"===e.type&&na(e,\"click\",m)}),t=[l,o,a,0,e7(eR),1,u,()=>{var e;return null!=(e=null==f?void 0:f.cancel(!1))&&e}]}))[1].get(t)||B(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var i,c,v;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(c=e.name||`(unnamed ${++u})`,\"hidden\"===e.type?\"hidden\"!==e.type||e.name!==l&&!nb(e,\"ref\")||(e.value||(e.value=tD(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),d[0].ref=e.value):(v=null!=(v=(i=d[0].fields)[c])?v:i[c]={id:e.id||c,name:c,label:tD(null!=(v=null==(v=e.labels)||null==(i=v[0])?void 0:i.innerText)?v:c,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(i=e.type)?i:\"unknown\",[aE]:o(e),value:o(e,!0)},d[0].fields[v.name]=v,d[1].set(e,v)))}),[t,d]},u=(e,[t,n]=null!=(r=l(e))?r:[],i=null==n?void 0:n[1].get(t))=>i&&[n[0],i,t,n],s=null,v=()=>{var r,n,i,a,l,u,v;s&&([r,n,i,a]=s,l=-(d-(d=as())),u=-(c-(c=e7(eR))),v=n[aE],(n[aE]=o(i))!==v&&(a[7]()&&nQ(`Field got changed, assuming validation error correction. ${tg(\"Form not submitted\",1)}.`),null==n.fillOrder&&(n.fillOrder=a[5]++),n.filled&&(n.corrections=(null!=(v=n.corrections)?v:0)+1),n.filled=eR,a[3]=2,B(r.fields,([e,t])=>t.lastField=e===n.name)),n.value=o(i,!0),n.activeTime+=l,n.totalTime+=u,r.activeTime+=l,r.totalTime+=u,s=null)},d=0,c=0,f=e=>e&&na(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&u(e.target))=>{r&&(s=r,\"focusin\"===e.type?(c=e7(eR),d=as()):v())});return f(document),ab(e=>e.contentDocument&&f(e.contentDocument),!0),{processCommand(e){if(aP(e)){var{ref:t,form:r}=e;if(t&&!(t=r1(\"number\"==typeof t.nodeType?t:t.target,(e,t)=>{\"FORM\"===r8(e)&&t(e)})))n7(e,\"Neither the reference or its ancestors is a `<form>` element.\");else{var a=t?i.find(e=>e.formElement===t):i.pop();if(a)\"validation-error\"===r?a.cancel(!0):\"submit\"===r&&a.complete(!0);else{if(t&&\"submit\"===r){r=null==(a=n.get(t))?void 0:a[6];if(r)return r(!0),!0}nQ(`No pending submit for the form command '${e.form}'${t?\" with the specified element reference\":\"\"}.`)}}return!0}return!1}}}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!t,passive:!t}).value(),i=async t=>{var r;if(t)return!(r=await n())||tG.equals(r,t)?[!1,r]:(await e.events.post({type:\"consent\",consent:t},{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rX.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var o={},l=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return L(r,([t,r])=>\"granted\"===e[2][t]&&(o[r]=!0,l=l&&(\"security\"===r||\"necessary\"===r))),{classification:l?\"anonymous\":\"direct\",purposes:o}}}}}}),{});return{processCommand(e){var t,r,o,s,v;return aV(e)?((t=e.consent.get)&&n((e,r,n)=>!e||t(e,n)),(r=e.consent.set)&&(async()=>{var e,t,n;\"consent\"in r?([t,n]=await i(r.consent),null!=(e=r.callback)&&e.call(r,t,n)):i(r)})(),(o=e.consent.externalSource)&&(v=o.key,(null!=(e=a[v])?e:a[v]=ta({frequency:null!=(e=o.frequency)?e:1e3})).restart(o.frequency,async()=>{var e,r,n;rZ.hasFocus()&&(e=o.poll(s))&&!tG.equals(s,e)&&(null==e.source&&(e.source=v),[r,n]=await i(e),r&&nQ(n,\"Consent was updated from \"+v),s=e)}).trigger()),eR):ez}}}}],t$=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),aF=t$(\"cart\"),aC=t$(\"username\"),aj=t$(\"tagAttributes\"),a_=t$(\"disable\"),aM=t$(\"boundary\"),aq=t$(\"extension\"),aU=t$(eR,\"flush\"),aP=t$(\"form\"),az=t$(\"get\"),aR=t$(\"listener\"),aD=t$(\"order\"),aB=t$(\"scan\"),aL=t$(\"set\"),aJ=e=>\"function\"==typeof e,aW=t$(\"view\"),aV=t$(\"consent\"),aH=t$(\"track\");ti(()=>document.body,()=>ai(\"{{CONFIG}}\"))})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
const scripts = {
    production: scripts$1.production,
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
            if (this._initialized) return;
            let { crypto, encryptionKeys, schemas, storage, environment, sessionTimeout } = this._config;
            try {
                var _this_environment_storage_initialize, _this_environment_storage;
                var _storage, _storage1, _storage2, _ref, _session, _storage3, _ref1, _device;
                // Initialize extensions. Defaults + factories.
                this._extensions = [
                    new TrackerCoreEvents(),
                    new CommerceExtension(),
                    ...filter(await Promise.all(this._extensionFactories.map(async (factory)=>{
                        let extension = null;
                        try {
                            return await factory();
                        } catch (e) {
                            this._logExtensionError(extension, "factory", e);
                            return null;
                        }
                    })))
                ];
                // Initialize type resolver from core and extension schemas.
                const schemaBuilder = new SchemaBuilder(schemas, index);
                for (const extension of this._extensions){
                    var _extension_registerTypes;
                    (_extension_registerTypes = extension.registerTypes) === null || _extension_registerTypes === void 0 ? void 0 : _extension_registerTypes.call(extension, schemaBuilder);
                }
                this._schema = new types.TypeResolver((await schemaBuilder.build(this._host)).map((schema)=>({
                        schema
                    })));
                // Initialize environment.
                if (!sessionTimeout) {
                    return throwError("A session timeout is not configured.");
                }
                storage !== null && storage !== void 0 ? storage : storage = {};
                for (const extension of this._extensions){
                    var _extension_patchStorageMappings;
                    (_extension_patchStorageMappings = extension.patchStorageMappings) === null || _extension_patchStorageMappings === void 0 ? void 0 : _extension_patchStorageMappings.call(extension, storage);
                }
                var _session1;
                (_session1 = (_storage = storage).session) !== null && _session1 !== void 0 ? _session1 : _storage.session = {
                    storage: new InMemoryStorage()
                };
                var _device1;
                (_device1 = (_storage1 = storage).device) !== null && _device1 !== void 0 ? _device1 : _storage1.device = {
                    storage: new InMemoryStorage()
                };
                var _ttl, _;
                (_ = (_ref = (_ttl = (_storage2 = storage).ttl) !== null && _ttl !== void 0 ? _ttl : _storage2.ttl = {})[_session = "session"]) !== null && _ !== void 0 ? _ : _ref[_session] = sessionTimeout * 60 * 1000;
                var _ttl1, _1;
                (_1 = (_ref1 = (_ttl1 = (_storage3 = storage).ttl) !== null && _ttl1 !== void 0 ? _ttl1 : _storage3.ttl = {})[_device = "device"]) !== null && _1 !== void 0 ? _1 : _ref1[_device] = 10 * 1000; // 10 seconds is enough to sort out race conditions.
                this.environment = new TrackerEnvironment(this._host, crypto !== null && crypto !== void 0 ? crypto : new DefaultCryptoProvider(encryptionKeys), new VariableStorageCoordinator({
                    storage: storage,
                    errorLogger: (message)=>this.environment.log(this.environment.storage, message)
                }, this._schema), environment);
                this.environment._setLogInfo(...this._extensions.map((source)=>({
                        source,
                        group: "extensions"
                    })));
                this.instanceId = this.environment.nextId("request-handler-id");
                if (this._config.debugScript) {
                    if (typeof this._config.debugScript === "string") {
                        var _ref2;
                        this._script = (_ref2 = await this.environment.readText(this._config.debugScript, async (_, newText)=>{
                            const updated = await newText();
                            if (updated) {
                                this._script = updated;
                            }
                            return true;
                        })) !== null && _ref2 !== void 0 ? _ref2 : throwError(`This script '${this._config.debugScript}' does not exist.`);
                    } else {
                        var _ref3;
                        this._script = (_ref3 = await this.environment.readText("js/tail.debug.map.js")) !== null && _ref3 !== void 0 ? _ref3 : scripts.debug;
                    }
                } else {
                    this._script = scripts.production;
                }
                // Initialize storage and extensions with the tracker environment.
                await ((_this_environment_storage_initialize = (_this_environment_storage = this.environment.storage).initialize) === null || _this_environment_storage_initialize === void 0 ? void 0 : _this_environment_storage_initialize.call(_this_environment_storage, this.environment));
                await Promise.all(this._extensions.map(async (extension)=>{
                    try {
                        var _extension_initialize;
                        await ((_extension_initialize = extension.initialize) === null || _extension_initialize === void 0 ? void 0 : _extension_initialize.call(extension, this.environment));
                    } catch (e) {
                        this._logExtensionError(extension, "initialize", e);
                        throw e;
                    }
                    return extension;
                }));
                this.environment.log(this, {
                    level: "info",
                    message: "Request handler initialized.",
                    details: {
                        config: {
                            ...this._config,
                            extensions: map(this._extensions, (extension)=>extension.id)
                        }
                    }
                });
            } catch (error) {
                this._host.log(serializeLogMessage({
                    level: "error",
                    message: "An error occurred while initializing the request handler.",
                    error
                }));
                throw error;
            }
            this._initialized = true;
        });
    }
    _validateEvents(tracker, events) {
        return map(events, (ev)=>{
            if (isValidationError(ev)) return ev;
            try {
                const eventType = this._schema.getEventType(ev);
                var _tracker__getConsentStateForSession;
                const { trustedContext, consent } = (_tracker__getConsentStateForSession = tracker._getConsentStateForSession(ev.session)) !== null && _tracker__getConsentStateForSession !== void 0 ? _tracker__getConsentStateForSession : tracker;
                ev = eventType.validate(ev, undefined, {
                    trusted: trustedContext
                });
                var _eventType_censor;
                return (_eventType_censor = eventType.censor(ev, {
                    trusted: trustedContext,
                    consent: consent
                })) !== null && _eventType_censor !== void 0 ? _eventType_censor : skip;
            } catch (e) {
                return {
                    error: e instanceof types.ValidationError ? `Invalid data for '${ev.type}' event:\n${indent(e.message)}` : formatError(e),
                    source: ev
                };
            }
        });
    }
    async post(tracker, eventBatch, options) {
        const context = {
            passive: !!(options === null || options === void 0 ? void 0 : options.passive)
        };
        await this.initialize();
        let parsed = this._validateEvents(tracker, eventBatch);
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
        const validateServerEvents = async (parsed, timestamp, fromClient)=>{
            const results = [];
            for (const result of parsed){
                if (!isValidationError(result)) {
                    var _result;
                    if (result.timestamp) {
                        if (result.timestamp > 0) {
                            // Allow events with any timestamp to be posted from trusted contexts.
                            if (fromClient && !tracker.trustedContext) {
                                results.push({
                                    error: "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
                                    source: result
                                });
                                continue;
                            }
                        } else {
                            result.timestamp = timestamp + result.timestamp;
                        }
                    } else {
                        result.timestamp = timestamp;
                    }
                    var _id;
                    (_id = (_result = result).id) !== null && _id !== void 0 ? _id : _result.id = await tracker.env.nextId();
                }
                results.push(result);
            }
            return results;
        };
        const patchExtensions = this._extensions.filter((ext)=>ext.patch);
        const callPatch = async (index, results)=>{
            if (!tracker.session) return [];
            let timestamp = now();
            const validated = await validateServerEvents(this._validateEvents(tracker, results), timestamp, !index);
            const events = collectValidationErrors(validated);
            const extension = patchExtensions[index];
            if (!extension) return events;
            try {
                const extensionEvents = await extension.patch({
                    events
                }, async (events)=>{
                    return await callPatch(index + 1, events);
                }, tracker, context);
                timestamp = now();
                return collectValidationErrors(await validateServerEvents(this._validateEvents(tracker, extensionEvents), timestamp, false));
            } catch (e) {
                this._logExtensionError(extension, "update", e);
                return events;
            }
        };
        const patchedEventBatch = await callPatch(0, parsed);
        const extensionErrors = {};
        if (options.routeToClient) {
            // TODO: Find a way to push these. They are for external client-side trackers.
            tracker._clientEvents.push(...patchedEventBatch);
        } else {
            await Promise.all(this._extensions.map(async (extension)=>{
                try {
                    var _extension_post;
                    var _ref;
                    (_ref = await ((_extension_post = extension.post) === null || _extension_post === void 0 ? void 0 : _extension_post.call(extension, {
                        events: patchedEventBatch
                    }, tracker, context))) !== null && _ref !== void 0 ? _ref : Promise.resolve();
                } catch (e) {
                    extensionErrors[extension.id] = e instanceof Error ? e : new Error(e === null || e === void 0 ? void 0 : e.toString());
                }
            }));
        }
        if (validationErrors.length || hasKeys(extensionErrors)) {
            throw new PostError(validationErrors, extensionErrors);
        }
        return {};
    }
    async _getClientEncryptionKey(request) {
        var _this__clientKeys, _keyIndex;
        const clientId = await this._clientIdGenerator.generateClientId(this.environment, request, true);
        var keyIndex = this.environment.hash(clientId, true, false) % this._config.clientKeys;
        var _;
        return (_ = (_this__clientKeys = this._clientKeys)[_keyIndex = keyIndex]) !== null && _ !== void 0 ? _ : _this__clientKeys[_keyIndex] = {
            key: this.environment.hash(this._config.clientEncryptionKeySeed + keyIndex, 64),
            index: keyIndex
        };
    }
    _getConfiguredClientScript(key, endpoint) {
        const keyIndex = key ? key.index : this._config.clientKeys + 1;
        let cached = this._scriptCache[keyIndex];
        if (cached == null) {
            var _this__host_compress, _this__host, _this__host_compress1, _this__host1;
            const clientConfig = {
                ...this._clientConfig,
                src: endpoint,
                encryptionKey: key === null || key === void 0 ? void 0 : key.key,
                dataTags: undefined
            };
            const tempKey = "" + Math.random();
            const script = this._script.replace(`"${TRACKER_CONFIG_PLACEHOLDER}"`, JSON.stringify(key ? transport.httpEncode([
                tempKey,
                transport.createTransport(tempKey)[0](clientConfig, true)
            ]) : clientConfig));
            this._scriptCache[keyIndex] = cached = {
                plain: script,
                br: (_this__host_compress = (_this__host = this._host).compress) === null || _this__host_compress === void 0 ? void 0 : _this__host_compress.call(_this__host, script, "br"),
                gzip: (_this__host_compress1 = (_this__host1 = this._host).compress) === null || _this__host_compress1 === void 0 ? void 0 : _this__host_compress1.call(_this__host1, script, "gzip")
            };
        }
        return cached;
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
                join(v, ",")
            ]));
        let trackerInitializationOptions;
        let trackerSettings = deferred(async ()=>{
            var _headers_xforwardedfor, _obj;
            var _headers_xforwardedfor_, _ref;
            clientIp !== null && clientIp !== void 0 ? clientIp : clientIp = (_ref = (_headers_xforwardedfor_ = (_headers_xforwardedfor = headers["x-forwarded-for"]) === null || _headers_xforwardedfor === void 0 ? void 0 : _headers_xforwardedfor[0]) !== null && _headers_xforwardedfor_ !== void 0 ? _headers_xforwardedfor_ : (_obj = obj(parseQueryString(headers["forwarded"]))) === null || _obj === void 0 ? void 0 : _obj["for"]) !== null && _ref !== void 0 ? _ref : undefined;
            const clientEncryptionKey = await this._getClientEncryptionKey(request);
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
                anonymousSessionReferenceId: this.environment.hash(await this._clientIdGenerator.generateClientId(this.environment, request, false), 128),
                trustedContext,
                requestHandler: this,
                defaultConsent: this._defaultConsent,
                cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
                additionalPurposes: this._config.additionalPurposes,
                clientEncryptionKey: this._config.json ? undefined : clientEncryptionKey,
                transport: this._config.json ? transport.defaultJsonTransport : transport.createTransport(clientEncryptionKey.key)
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
                const resolvedTracker = resolveTracker.resolved;
                if (resolvedTracker) {
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
                            var _headers_acceptencoding;
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
                            if ((queryValue = join(query === null || query === void 0 ? void 0 : query[SCHEMA_TYPES_QUERY])) != null) {
                                let serialized;
                                if (queryValue === "native") {
                                    serialized = JSON.stringify(this._schema.definitions, null, 2);
                                } else {
                                    serialized = JSON.stringify(new types.JsonSchemaAdapter(types.CORE_SCHEMA_NS + ":runtime").serialize(this._schema.schemas), null, 2);
                                }
                                return result({
                                    status: 200,
                                    body: serialized,
                                    headers: {
                                        "content-type": "application/json"
                                    },
                                    cacheKey: "types"
                                });
                            }
                            // Default for GET is to send script.
                            // This is set by most modern browsers.
                            // It prevents external scripts to try to get a hold of the configuration key via XHR.
                            const secDest = headers["sec-fetch-dest"];
                            if (secDest && secDest !== "script" && secDest !== "document") {
                                return result({
                                    status: 400,
                                    body: `Request destination '${secDest}' not allowed.`,
                                    headers: {
                                        ...SCRIPT_CACHE_HEADERS,
                                        vary: "sec-fetch-dest"
                                    }
                                });
                            }
                            const { clientEncryptionKey } = await trackerSettings();
                            const script = this._getConfiguredClientScript(clientEncryptionKey, matchAnyPath ? requestPath : this._clientConfig.src);
                            var _headers_acceptencoding_split_map;
                            const accept = (_headers_acceptencoding_split_map = (_headers_acceptencoding = headers["accept-encoding"]) === null || _headers_acceptencoding === void 0 ? void 0 : _headers_acceptencoding.split(",").map((value)=>value.toLowerCase().trim())) !== null && _headers_acceptencoding_split_map !== void 0 ? _headers_acceptencoding_split_map : [];
                            const scriptHeaders = {
                                "content-type": "application/javascript",
                                ...SCRIPT_CACHE_HEADERS,
                                vary: "sec-fetch-dest"
                            };
                            let body;
                            if (accept.includes("br") && (body = await script.br)) {
                                scriptHeaders["content-encoding"] = "br";
                            } else if (accept.includes("gzip") && (body = await script.gzip)) {
                                scriptHeaders["content-encoding"] = "gzip";
                            } else {
                                body = script.plain;
                            }
                            return result({
                                status: 200,
                                body,
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
                                    if (this._config.json || headers["content-type"] === "application/json" || isJsonString(body) || isJsonObject(body)) {
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
                                        postRequest = isJsonObject(body) ? body : JSON.parse(typeof body === "string" ? body : transport.decodeUtf8(body));
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
                                        deviceSessionId: postRequest.deviceSessionId
                                    };
                                    const resolvedTracker = await resolveTracker();
                                    let response = {};
                                    if (postRequest.events) {
                                        // This returns a response that may have changed variables in it.
                                        // A mechanism for pushing changes without using cookies is still under development,
                                        // so this does nothing for the client atm.
                                        response = await resolvedTracker.post(postRequest.events, {
                                            passive: postRequest.events.every(types.isPassiveEvent),
                                            deviceSessionId: postRequest.deviceSessionId,
                                            deviceId: postRequest.deviceId
                                        });
                                    }
                                    if (postRequest.variables) {
                                        if (postRequest.variables.get) {
                                            var _response;
                                            var _variables;
                                            ((_variables = (_response = response).variables) !== null && _variables !== void 0 ? _variables : _response.variables = {}).get = (await resolvedTracker.get(postRequest.variables.get, {
                                                trusted: false
                                            }).all()).map((result, i)=>{
                                                var _postRequest_variables_get_i;
                                                if (result && ((_postRequest_variables_get_i = postRequest.variables.get[i]) === null || _postRequest_variables_get_i === void 0 ? void 0 : _postRequest_variables_get_i.passive)) {
                                                    result.passive = true;
                                                }
                                                return result;
                                            });
                                        }
                                        if (postRequest.variables.set) {
                                            var _response1;
                                            var _variables1;
                                            ((_variables1 = (_response1 = response).variables) !== null && _variables1 !== void 0 ? _variables1 : _response1.variables = {}).set = await resolvedTracker.set(postRequest.variables.set, {
                                                trusted: false
                                            }).all();
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
        } catch (error) {
            this.environment.log(this, {
                level: "error",
                message: "Unexpected error while processing request.",
                error
            });
            console.error("Unexpected error while processing request.", error);
            return result({
                status: 500,
                body: error.toString()
            });
        } finally{
            try {
                var _resolveTracker_resolved;
                await ((_resolveTracker_resolved = resolveTracker.resolved) === null || _resolveTracker_resolved === void 0 ? void 0 : _resolveTracker_resolved.dispose());
            } catch (error) {
                this.environment.log(this, {
                    level: "error",
                    message: "Unexpected error while processing request.",
                    error
                });
                console.error("Unexpected error while processing request.", error);
                return result({
                    status: 500,
                    body: error.toString()
                });
            }
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
            trackerScript.push(PLACEHOLDER_SCRIPT(trackerRef, true));
        }
        const inlineScripts = [
            join(trackerScript)
        ];
        const externalScripts = [];
        for (const extension of this._extensions){
            const scripts = extension.getClientScripts && extension.getClientScripts(tracker);
            for (const script of scripts !== null && scripts !== void 0 ? scripts : []){
                if ("inline" in script) {
                    // Prevent errors from preempting other scripts.
                    script.inline = wrapTryCatch(script.inline);
                    if (script.allowReorder !== false) {
                        inlineScripts.push(script.inline);
                        return;
                    }
                } else {
                    externalScripts.push(script);
                }
            }
        }
        if (html) {
            const keyPrefix = this._clientConfig.key ? JSON.stringify(this._clientConfig.key) + "," : "";
            const resolvedTracker = tracker.resolved;
            if (resolvedTracker) {
                const pendingEvents = resolvedTracker.clientEvents;
                pendingEvents.length && inlineScripts.push(`${trackerRef}(${keyPrefix}${join(pendingEvents, (event)=>typeof event === "string" ? event : resolvedTracker.httpClientEncrypt(event), ", ")});`);
            }
            if (initialCommands) {
                inlineScripts.push(`${trackerRef}(${keyPrefix}${isString(initialCommands) ? JSON.stringify(initialCommands) : resolvedTracker === null || resolvedTracker === void 0 ? void 0 : resolvedTracker.httpClientEncrypt(initialCommands)});`);
            }
            externalScripts.push({
                src: `${endpoint !== null && endpoint !== void 0 ? endpoint : this.endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName ? `#${this._trackerName}` : ""}`,
                defer: true
            });
        }
        const js = join([
            {
                inline: join(inlineScripts)
            },
            ...externalScripts
        ], (script)=>{
            if ("inline" in script) {
                return html ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${script.inline}</script>` : script.inline;
            } else {
                var _map, _this__config_client;
                return html ? `<script${(_map = map((_this__config_client = this._config.client) === null || _this__config_client === void 0 ? void 0 : _this__config_client.scriptBlockerAttributes, ([key, value])=>` ${key}="${value.replaceAll('"', "&quot;")}"`)) === null || _map === void 0 ? void 0 : _map.join("")} src='${script.src}${"?" + BUILD_REVISION_QUERY }'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
                    src: script.src,
                    async: script.defer
                })}))}catch(e){console.error(e);}`;
            }
        });
        return js;
    }
    _logExtensionError(extension, method, error) {
        this.environment.log(extension, {
            level: "error",
            message: `An error occurred when invoking the method '${method}' on the extension ${getDefaultLogSourceName(extension)}.`,
            group: "extensions",
            error: error
        });
    }
    constructor(config){
        _define_property$9(this, "_cookies", void 0);
        _define_property$9(this, "_extensionFactories", void 0);
        _define_property$9(this, "_lock", createLock());
        _define_property$9(this, "_schema", null);
        _define_property$9(this, "_trackerName", void 0);
        _define_property$9(this, "_extensions", void 0);
        _define_property$9(this, "_initialized", false);
        _define_property$9(this, "_script", void 0);
        _define_property$9(this, "_clientConfig", void 0);
        _define_property$9(this, "_config", void 0);
        _define_property$9(this, "_defaultConsent", void 0);
        _define_property$9(this, "_host", void 0);
        _define_property$9(this, "instanceId", void 0);
        /** @internal */ _define_property$9(this, "_cookieNames", void 0);
        _define_property$9(this, "endpoint", void 0);
        _define_property$9(this, "environment", void 0);
        /** @internal */ _define_property$9(this, "_clientIdGenerator", void 0);
        _define_property$9(this, "_scriptCache", []);
        _define_property$9(this, "_clientKeys", []);
        let { host, trackerName, endpoint, extensions, cookies, client, clientIdGenerator, defaultConsent } = config = merge({}, [
            config,
            DEFAULT
        ], {
            overwrite: false
        });
        this._config = Object.freeze(config);
        this._host = host;
        this._trackerName = trackerName;
        this.endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
        this._defaultConsent = defaultConsent;
        this._extensionFactories = filter(extensions);
        this._cookies = new CookieMonster(cookies);
        this._clientIdGenerator = clientIdGenerator !== null && clientIdGenerator !== void 0 ? clientIdGenerator : new DefaultClientIdGenerator();
        this._cookieNames = {
            consent: cookies.namePrefix + ".consent",
            session: cookies.namePrefix + ".session",
            device: cookies.namePrefix + ".device",
            deviceByPurpose: obj(types.DataPurposes.names, (purpose)=>[
                    purpose,
                    cookies.namePrefix + (purpose === "necessary" ? "" : "," + purpose)
                ])
        };
        this._clientConfig = Object.freeze({
            ...client,
            src: this.endpoint,
            json: this._config.json
        });
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
const createInitialScopeData = (id, timestamp, additionalData)=>({
        id,
        firstSeen: timestamp,
        lastSeen: timestamp,
        views: 0,
        isNew: true,
        ...additionalData
    });
class Tracker {
    /** Variables that have been added or updated during the request through this tracker. */ getChangedVariables() {
        return this._changedVariables;
    }
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
        var _this__device;
        return (_this__device = this._device) === null || _this__device === void 0 ? void 0 : _this__device.value.id;
    }
    get authenticatedUserId() {
        var _this__session_value, _this__session;
        return (_this__session = this._session) === null || _this__session === void 0 ? void 0 : (_this__session_value = _this__session.value) === null || _this__session_value === void 0 ? void 0 : _this__session_value.userId;
    }
    _encryptCookie(value) {
        return this.env.httpEncrypt(value);
    }
    _decryptCookie(value, logNameHint) {
        try {
            return !value ? undefined : this.env.httpDecrypt(value);
        } catch (error) {
            this.env.log(this, {
                level: "error",
                message: "Could not decrypt cookie value.",
                error,
                details: {
                    name: logNameHint,
                    value
                }
            });
            return undefined;
        }
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
        return await this._requestHandler.post(this, events, options);
    }
    // #region DeviceData
    /**
   * Load device variables from the client, and store them as variables with a short TTL to avoid race conditions.
   *
   */ async _loadCachedDeviceVariables() {
        const variables = await this._readClientDeviceVariables();
        if (variables) {
            var _this__clientDeviceCache;
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.loaded) {
                return;
            }
            this._clientDeviceCache.loaded = true;
            await this.set(map(variables, ([, value])=>value), {
                trusted: true
            }).all(); // Ignore conflicts. That just means there are concurrent requests.
        }
    }
    async _readClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = this._clientDeviceCache = {
                variables: {}
            };
            let timestamp;
            for (const purposeName of types.DataPurposes.names){
                var _this_cookies_cookieName;
                // Device variables are stored with a cookie for each purpose.
                const cookieName = this._requestHandler._cookieNames.deviceByPurpose[purposeName];
                const cookieValue = (_this_cookies_cookieName = this.cookies[cookieName]) === null || _this_cookies_cookieName === void 0 ? void 0 : _this_cookies_cookieName.value;
                if (cookieName && cookieValue) {
                    const decrypted = await this._decryptCookie(cookieValue, ` ${purposeName} device variables`);
                    if (!decrypted || !Array.isArray(decrypted)) {
                        // Deserialization error. Remove the cookie.
                        this.cookies[cookieName] = {};
                    } else {
                        for (let value of decrypted){
                            var _deviceCache_variables, _value_;
                            if (!value || !Array.isArray(value)) {
                                continue;
                            }
                            var _;
                            (_ = (_deviceCache_variables = deviceCache.variables)[_value_ = value[0]]) !== null && _ !== void 0 ? _ : _deviceCache_variables[_value_] = {
                                scope: "device",
                                key: value[0],
                                version: value[1],
                                value: value[2],
                                created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
                                modified: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now()
                            };
                        }
                    }
                }
            }
        }
        return this._clientDeviceCache.variables;
    }
    getRequestItems(source) {
        return get(this._requestItems, source, ()=>new Map());
    }
    registerSessionChangedCallback(callback) {
        return this._sessionChangedEvent[0](callback);
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
   * @internal */ async _ensureInitialized({ deviceSessionId, passive } = {}) {
        var _this_cookies_this__requestHandler__cookieNames_consent;
        if (this._initialized === (this._initialized = true)) {
            return this;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        this._consent = types.DataUsage.applyOptional(types.DataUsage.deserialize((_this_cookies_this__requestHandler__cookieNames_consent = this.cookies[this._requestHandler._cookieNames.consent]) === null || _this_cookies_this__requestHandler__cookieNames_consent === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_consent.value, this._defaultConsent), this.additionalPurposes);
        await this._ensureSession(timestamp, {
            deviceSessionId,
            passive
        });
        return this;
    }
    async reset({ session = true, device = false, consent = false, referenceTimestamp, deviceSessionId }) {
        if (consent) {
            await this.updateConsent({
                classification: "anonymous",
                purposes: {}
            });
        }
        if (this._session) {
            await this._ensureSession(referenceTimestamp !== null && referenceTimestamp !== void 0 ? referenceTimestamp : now(), {
                deviceSessionId,
                resetSession: session,
                resetDevice: device
            });
        }
    }
    async dispose() {}
    async updateConsent({ purposes, classification, source }) {
        if (!this._session) return;
        purposes = types.DataPurposes.parse(purposes);
        classification = types.DataClassification.parse(classification);
        purposes !== null && purposes !== void 0 ? purposes : purposes = this.consent.purposes;
        classification !== null && classification !== void 0 ? classification : classification = this.consent.classification;
        if (types.DataClassification.compare(classification !== null && classification !== void 0 ? classification : this.consent.classification, this.consent.classification) < 0 || some(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]))) {
            // Capture these variables for lambda.
            const sessionId = this.sessionId;
            const deviceId = this.deviceId;
            const expiredPurposes = obj(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]) ? [
                    key,
                    true
                ] : undefined);
            // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
            await this.env.storage.purge([
                sessionId && {
                    // NOTE: We do not touch user variables automatically.
                    // Consumers can hook into the apply or patch pipelines with an extension to provide their own logic -
                    // they can see the current consent on the tracker in context, and the new consent from the event.
                    scopes: [
                        "session"
                    ],
                    entityIds: [
                        sessionId
                    ],
                    purposes: expiredPurposes,
                    classification: {
                        gt: classification
                    }
                },
                deviceId && {
                    scopes: [
                        "device"
                    ],
                    entityIds: [
                        deviceId
                    ],
                    purposes: expiredPurposes,
                    classification: {
                        gt: classification
                    }
                }
            ], {
                bulk: true,
                context: {
                    trusted: true
                }
            });
        }
        let previousLevel = this._consent.classification;
        const previousConsent = this._consent;
        this._consent = types.DataUsage.applyOptional({
            classification,
            purposes,
            source
        }, this.additionalPurposes);
        const timestamp = now();
        if (classification === "anonymous" !== (previousLevel === "anonymous")) {
            // We switched from cookie-less to cookies or vice versa.
            // Refresh scope infos and anonymous session pointer.
            await this._ensureSession(timestamp, {
                previousConsent,
                refreshState: true
            });
        }
        this._changedVariables.set(trackerVariableKey({
            scope: "session",
            key: CONSENT_INFO_KEY
        }), {
            scope: "session",
            key: CONSENT_INFO_KEY,
            created: timestamp,
            modified: timestamp,
            value: types.DataUsage.clone(this._consent),
            version: timestamp.toString()
        });
    }
    _snapshot(previousConsent) {
        return this.session && {
            consent: {
                ...previousConsent !== null && previousConsent !== void 0 ? previousConsent : this.consent
            },
            session: {
                ...this.session
            },
            device: this.device && {
                ...this.device
            }
        };
    }
    _clearDevice() {
        var _this__clientDeviceCache;
        this._device = undefined;
        if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.variables) {
            this._clientDeviceCache.variables = {};
            this._clientDeviceCache.touched = true;
        }
    }
    async _ensureSession(timestamp = now(), { deviceSessionId = this.deviceSessionId, passive = false, resetSession = false, resetDevice = false, refreshState = false, previousConsent } = {}) {
        var _this__session, _this_session, _this, _this_cookies_this__requestHandler__cookieNames_session;
        const useAnonymousTracking = this._consent.classification === "anonymous";
        if ((resetSession || resetDevice) && this.sessionId) {
            // Purge old data. No point in storing this since it will no longer be used.
            await this.env.storage.purge([
                resetSession && this.sessionId && {
                    scope: "session",
                    entityIds: [
                        this.sessionId
                    ]
                },
                resetSession && this.sessionId && useAnonymousTracking && this._anonymousSessionReferenceId && {
                    scope: "session",
                    entityIds: [
                        this._anonymousSessionReferenceId
                    ]
                },
                resetDevice && this.deviceId && {
                    scope: "device",
                    entityIds: [
                        this.deviceId
                    ]
                }
            ], {
                bulk: true,
                context: {
                    trusted: true
                }
            });
            if (resetDevice) {
                this._clearDevice();
            }
        } else if (((_this__session = this._session) === null || _this__session === void 0 ? void 0 : _this__session.value) && !refreshState) {
            // We already have a session value, and no refresh is needed (refresh is needed e.g. when changing consent.)
            // No refresh needed means this method has been called a second time, just to be sure the session is initialized.
            return;
        }
        const snapshot = this._snapshot(previousConsent);
        var _ref;
        // In case we refresh (calling this method again, e.g. from consent change), we might already have an identified session ID.
        let identifiedSessionId = resetSession ? undefined : (_ref = ((_this_session = this.session) === null || _this_session === void 0 ? void 0 : _this_session.anonymous) ? undefined : this.sessionId) !== null && _ref !== void 0 ? _ref : (_this = await this._decryptCookie((_this_cookies_this__requestHandler__cookieNames_session = this.cookies[this._requestHandler._cookieNames.session]) === null || _this_cookies_this__requestHandler__cookieNames_session === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_session.value, "Session ID")) === null || _this === void 0 ? void 0 : _this.id;
        // We might also have an anonymous session ID.
        let anonymousSessionId;
        if (!identifiedSessionId || useAnonymousTracking) {
            var _this_session1;
            var _ref1;
            // We need to know the anonymous session ID (if any).
            // Either because it must be included as a hint in the identified session (for analytical processing)
            // or because we are using anonymous tracking.
            anonymousSessionId = (_ref1 = ((_this_session1 = this.session) === null || _this_session1 === void 0 ? void 0 : _this_session1.anonymous) ? this.sessionId : undefined) !== null && _ref1 !== void 0 ? _ref1 : await this.env.storage.get({
                scope: "session",
                key: SESSION_REFERENCE_KEY,
                entityId: this._anonymousSessionReferenceId,
                // Only initialize if anonymous tracking.
                init: ()=>!passive && useAnonymousTracking ? this.env.nextId("anonymous-session") : undefined
            }, {
                trusted: true
            }).value();
        }
        if (useAnonymousTracking) {
            // Anonymous tracking.
            if (!passive) {
                // Clear session cookie, if any.
                this.cookies[this._requestHandler._cookieNames.session] = {
                    httpOnly: true,
                    sameSitePolicy: "None",
                    essential: true,
                    value: null
                };
                if (identifiedSessionId || this.deviceId) {
                    // We switched from identified to anonymous tracking. Remove current session and device variables.
                    await this.env.storage.purge([
                        identifiedSessionId && {
                            scope: "session",
                            entityIds: [
                                identifiedSessionId
                            ]
                        },
                        this.deviceId && {
                            scope: "device",
                            entityIds: [
                                this.deviceId
                            ]
                        }
                    ], {
                        bulk: true,
                        context: {
                            trusted: true
                        }
                    });
                }
            }
            this._clearDevice();
            this._session = anonymousSessionId ? await this.env.storage.get({
                scope: "session",
                key: SCOPE_INFO_KEY,
                entityId: anonymousSessionId,
                init: async ()=>{
                    if (passive) {
                        return undefined;
                    }
                    return createInitialScopeData(anonymousSessionId, timestamp, {
                        deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                        anonymous: true
                    });
                }
            }, {
                trusted: true
            }) : undefined;
        } else {
            var _SCOPE_INFO_KEY_value, _SCOPE_INFO_KEY, _this1, // 2. The session ID from the cookie has expired:
            _this__session1;
            var _this_deviceId, _ref2;
            const deviceId = (_ref2 = (_this_deviceId = this.deviceId) !== null && _this_deviceId !== void 0 ? _this_deviceId : (_this1 = await this._readClientDeviceVariables()) === null || _this1 === void 0 ? void 0 : (_SCOPE_INFO_KEY = _this1[SCOPE_INFO_KEY]) === null || _SCOPE_INFO_KEY === void 0 ? void 0 : (_SCOPE_INFO_KEY_value = _SCOPE_INFO_KEY.value) === null || _SCOPE_INFO_KEY_value === void 0 ? void 0 : _SCOPE_INFO_KEY_value.id) !== null && _ref2 !== void 0 ? _ref2 : passive ? undefined : await this.env.nextId("device");
            if (!this._device) {
                this._device = deviceId ? await this.env.storage.get({
                    scope: "device",
                    key: SCOPE_INFO_KEY,
                    entityId: deviceId,
                    init: async ()=>{
                        var _SCOPE_INFO_KEY, _this;
                        if (passive) {
                            return undefined;
                        }
                        let current = (_this = await this._readClientDeviceVariables()) === null || _this === void 0 ? void 0 : (_SCOPE_INFO_KEY = _this[SCOPE_INFO_KEY]) === null || _SCOPE_INFO_KEY === void 0 ? void 0 : _SCOPE_INFO_KEY.value;
                        if (current) {
                            return current;
                        }
                        return createInitialScopeData(deviceId, timestamp, {
                            sessions: 0
                        });
                    }
                }, {
                    trusted: true
                }) : undefined;
            }
            if (// 1. We do not have an existing session ID from a cookie:
            !identifiedSessionId || ((_this__session1 = this._session) === null || _this__session1 === void 0 ? void 0 : _this__session1.entityId) !== identifiedSessionId && !(this._session = await this.env.storage.get({
                scope: "session",
                key: SCOPE_INFO_KEY,
                entityId: identifiedSessionId
            }))) {
                // Start new session.
                identifiedSessionId = await this.env.nextId("session");
            }
            // We might already have read the session above in check 2, or _ensureSession has already been called earlier.
            if (this.sessionId !== identifiedSessionId) {
                this._session = await this.env.storage.get({
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    entityId: identifiedSessionId,
                    init: async ()=>{
                        if (passive) return undefined;
                        // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
                        // This means clients must make sure the initial request to the endpoint completes before more are sent (or at least do a fair effort).
                        // Additionally, analytics processing should be aware of empty sessions, and decide what to do with them (probably filter them out).
                        const data = createInitialScopeData(identifiedSessionId, timestamp, {
                            anonymous: false,
                            deviceId,
                            deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                            anonymousSessionId
                        });
                        return data;
                    }
                }, {
                    trusted: true
                });
            }
            if (!passive) {
                var _this__session2, _this__session3, _snapshot_device, _this__device;
                if (anonymousSessionId) {
                    // We went from anonymous to identified tracking.
                    const anonymousSessionReferenceId = this._anonymousSessionReferenceId;
                    await this.env.storage.set([
                        {
                            scope: "session",
                            key: SCOPE_INFO_KEY,
                            entityId: anonymousSessionId,
                            value: null,
                            force: true
                        },
                        anonymousSessionReferenceId && {
                            scope: "session",
                            key: SESSION_REFERENCE_KEY,
                            entityId: anonymousSessionReferenceId,
                            value: null,
                            force: true
                        }
                    ], {
                        trusted: true
                    }).all();
                }
                this.cookies[this._requestHandler._cookieNames.session] = {
                    httpOnly: true,
                    sameSitePolicy: "None",
                    essential: true,
                    value: this._encryptCookie({
                        id: identifiedSessionId
                    })
                };
                if (this._session && ((snapshot === null || snapshot === void 0 ? void 0 : snapshot.session.id) !== ((_this__session2 = this._session) === null || _this__session2 === void 0 ? void 0 : _this__session2.value.id) || (snapshot === null || snapshot === void 0 ? void 0 : snapshot.session.deviceId) !== ((_this__session3 = this._session) === null || _this__session3 === void 0 ? void 0 : _this__session3.value.deviceId) || (snapshot === null || snapshot === void 0 ? void 0 : (_snapshot_device = snapshot.device) === null || _snapshot_device === void 0 ? void 0 : _snapshot_device.id) !== ((_this__device = this._device) === null || _this__device === void 0 ? void 0 : _this__device.value.id))) {
                    this._sessionChangedEvent[1](this._snapshot(), snapshot);
                }
            }
        }
        if (this.deviceSessionId != null && deviceSessionId !== this.deviceSessionId) {
            // The sent device ID does not match the one in the current session.
            // For identified session this means an old tab woke up after being suspended.
            // For anonymous sessions this more likely indicates that multiple clients are active in the same session.
            this._expiredDeviceSessionId = deviceSessionId;
        }
        if (this.sessionId) {
            var _this__previousSessions;
            ((_this__previousSessions = this._previousSessions) !== null && _this__previousSessions !== void 0 ? _this__previousSessions : this._previousSessions = new Map()).set(this.sessionId, {
                trustedContext: this.trustedContext,
                consent: types.DataUsage.clone(this.consent)
            });
        }
    }
    /** @internal */ _getConsentStateForSession(session) {
        var _this__previousSessions;
        if (!(session === null || session === void 0 ? void 0 : session.sessionId)) return undefined;
        if (session.sessionId === this.sessionId) {
            return {
                trustedContext: this.trustedContext,
                consent: types.DataUsage.clone(this.consent)
            };
        }
        return (_this__previousSessions = this._previousSessions) === null || _this__previousSessions === void 0 ? void 0 : _this__previousSessions.get(session.sessionId);
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
                value: types.DataUsage.serialize(types.DataUsage.applyOptional(this.consent, this.additionalPurposes))
            };
            const splits = {};
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.touched) {
                // We have updated device data and need to refresh to get whatever other processes may have written (if any).
                for await (const variable of types.iterateQueryResults(this, {
                    scope: "device"
                })){
                    var _variable_schema;
                    forEach(types.DataPurposes.parse((_variable_schema = variable.schema) === null || _variable_schema === void 0 ? void 0 : _variable_schema.usage.purposes, {
                        names: true
                    }), (purpose)=>{
                        var _splits, _purpose;
                        var _;
                        return ((_ = (_splits = splits)[_purpose = purpose]) !== null && _ !== void 0 ? _ : _splits[_purpose] = []).push([
                            variable.key,
                            variable.version,
                            variable.value
                        ]);
                    });
                }
            }
            const isAnonymous = this.consent.classification === "anonymous";
            if (isAnonymous) {
                // Clear session cookie if we have one.
                this.cookies[this._requestHandler._cookieNames.session] = {};
            }
            if (isAnonymous || ((_this__clientDeviceCache1 = this._clientDeviceCache) === null || _this__clientDeviceCache1 === void 0 ? void 0 : _this__clientDeviceCache1.touched)) {
                for (const purpose of types.DataPurposes.names){
                    var _this__consent;
                    const remove = isAnonymous || purpose !== "necessary" && (!((_this__consent = this._consent) === null || _this__consent === void 0 ? void 0 : _this__consent.purposes[purpose]) || !splits[purpose]);
                    const cookieName = this._requestHandler._cookieNames.deviceByPurpose[purpose];
                    if (remove) {
                        this.cookies[cookieName] = {};
                    } else if (splits[purpose]) {
                        this.cookies[cookieName] = {
                            httpOnly: true,
                            maxAge: Number.MAX_SAFE_INTEGER,
                            sameSitePolicy: "None",
                            essential: purpose === "necessary",
                            value: this._encryptCookie(splits[purpose])
                        };
                    }
                }
            }
            // Keep session alive in a fire and forget like fashion.
            if (this.sessionId) {
                (async ()=>{
                    try {
                        this.env.storage.renew([
                            {
                                scope: "session",
                                entityIds: truish([
                                    this.sessionId,
                                    isAnonymous && this._anonymousSessionReferenceId
                                ])
                            },
                            this.deviceId && {
                                scope: "device",
                                entityIds: [
                                    this.deviceId
                                ]
                            }
                        ]);
                    } catch (e) {
                        this.env.error(this, `An error occurred while renewing session ${this.sessionId} (keeping it alive).`);
                    }
                })();
            }
        } else {
            this.cookies = {};
        }
    }
    // #region Storage
    _getStorageContext(source) {
        var _source_trusted;
        return {
            ...source,
            scope: this,
            trusted: (_source_trusted = source === null || source === void 0 ? void 0 : source.trusted) !== null && _source_trusted !== void 0 ? _source_trusted : true,
            dynamicVariables: {
                session: {
                    [CONSENT_INFO_KEY]: ()=>types.DataUsage.clone(this.consent)
                }
            },
            cache: {
                get: (key)=>{
                    if (key.scope === "device") {
                        const variables = this._readClientDeviceVariables();
                        return variables[key.key];
                    }
                },
                set: (key, value)=>{
                    var _this__clientDeviceCache;
                    if (key.scope === "device" && ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.variables)) {
                        const current = this._clientDeviceCache.variables[key.key];
                        if (value !== current) {
                            if (value) {
                                this._clientDeviceCache.variables[key.key] = value;
                            } else {
                                delete this._clientDeviceCache.variables[key.key];
                            }
                            this._touchClientDeviceData();
                        }
                    }
                }
            }
        };
    }
    async renew() {
        await this.env.storage.renew({
            scopes: [
                "device",
                "session"
            ]
        }, this._getStorageContext());
    }
    get(getters, context) {
        return types.toVariableResultPromise("get", getters, async (getters)=>{
            if (getters.some((getter)=>getter.scope === "device" && !getter.cache)) {
                await this._loadCachedDeviceVariables();
            }
            const storageResults = await this.env.storage.get(getters, this._getStorageContext(context)).all();
            if (storageResults.some((result)=>result.scope === "device" && result.status === types.VariableResultStatus.Created)) {
                this._touchClientDeviceData();
            }
            return new Map(map(storageResults, (result, index)=>[
                    getters[index],
                    result
                ]));
        });
    }
    set(setters, context) {
        return types.toVariableResultPromise("set", setters, async (setters)=>{
            if (setters.some((setter)=>setter.scope === "device")) {
                await this._loadCachedDeviceVariables();
            }
            const storageResults = await this.env.storage.set(setters, this._getStorageContext(context)).all();
            for (const result of storageResults){
                if (result.key === SCOPE_INFO_KEY) {
                    if (result.scope === "session") {
                        this._session = types.isVariableResult(result) ? result : undefined;
                    }
                    if (types.isVariableResult(result)) {
                        this._changedVariables.set(trackerVariableKey(result), result);
                    }
                }
            }
            return new Map(map(storageResults, (result, index)=>[
                    setters[index],
                    result
                ]));
        });
    }
    async query(filters, { context, ...options } = {}) {
        if (!isArray(filters)) {
            filters = [
                filters
            ];
        }
        if (filters.some((filter)=>filter.scope === "device")) {
            await this._loadCachedDeviceVariables();
        }
        return this.env.storage.query(filters, {
            context: this._getStorageContext(context),
            ...options
        });
    }
    async purge(filters, { context, bulk } = {}) {
        await this.env.storage.purge(filters, {
            context: this._getStorageContext(context),
            bulk
        });
    }
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, anonymousSessionReferenceId, defaultConsent, trustedContext, additionalPurposes }){
        /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */ _define_property$8(this, "_eventQueue", []);
        _define_property$8(this, "_extensionState", 0);
        _define_property$8(this, "_initialized", void 0);
        _define_property$8(this, "_requestId", void 0);
        /** @internal  */ _define_property$8(this, "_clientEvents", []);
        /** @internal */ _define_property$8(this, "_requestHandler", void 0);
        _define_property$8(this, "clientIp", void 0);
        _define_property$8(this, "cookies", void 0);
        _define_property$8(this, "disabled", void 0);
        _define_property$8(this, "env", void 0);
        _define_property$8(this, "headers", void 0);
        _define_property$8(this, "queryString", void 0);
        _define_property$8(this, "referrer", void 0);
        /** Can be used by extensions for book-keeping during a request.  */ _define_property$8(this, "_requestItems", void 0);
        _define_property$8(this, "_sessionChangedEvent", createEvent());
        //private readonly _sessionChangedHandlers
        /** Transient variables that can be used by extensions whilst processing a request. */ _define_property$8(this, "transient", void 0);
        /**
   * Whether the tracker has been instantiated in a trusted context.
   * A trusted context is when the tracker's API is used for server-side tracker.
   *
   * Signing in without evidence is only possible in trusted contexts.
   *
   * Extensions may use this flag for additional functionality that is only available in server-side tracking context.
   */ _define_property$8(this, "trustedContext", void 0);
        /** Variables that have been added or updated during the request through this tracker. */ _define_property$8(this, "_changedVariables", new Map());
        _define_property$8(this, "_clientCipher", void 0);
        _define_property$8(this, "_defaultConsent", void 0);
        _define_property$8(this, "host", void 0);
        _define_property$8(this, "path", void 0);
        _define_property$8(this, "url", void 0);
        _define_property$8(this, "additionalPurposes", void 0);
        /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
   *
   * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
   * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
   *
   */ _define_property$8(this, "_anonymousSessionReferenceId", void 0);
        /** @internal */ _define_property$8(this, "_session", void 0);
        /** @internal */ _define_property$8(this, "_device", void 0);
        /**
   * See {@link Session.expiredDeviceSessionId}.
   * @internal
   */ _define_property$8(this, "_expiredDeviceSessionId", void 0);
        /**
   * Device variables are only persisted in the device.
   * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
   */ _define_property$8(this, "_clientDeviceCache", void 0);
        _define_property$8(this, "_previousSessions", void 0);
        _define_property$8(this, "_consent", {
            classification: "anonymous",
            purposes: {}
        });
        this.disabled = disabled;
        this._requestHandler = requestHandler;
        this.env = requestHandler.environment;
        this.host = host;
        this.path = path;
        this.url = url;
        this._defaultConsent = defaultConsent;
        var _additionalPurposes_personalization, _additionalPurposes_security;
        this.additionalPurposes = {
            personalization: (_additionalPurposes_personalization = additionalPurposes === null || additionalPurposes === void 0 ? void 0 : additionalPurposes.personalization) !== null && _additionalPurposes_personalization !== void 0 ? _additionalPurposes_personalization : false,
            security: (_additionalPurposes_security = additionalPurposes === null || additionalPurposes === void 0 ? void 0 : additionalPurposes.security) !== null && _additionalPurposes_security !== void 0 ? _additionalPurposes_security : false
        };
        this.queryString = queryString !== null && queryString !== void 0 ? queryString : {};
        this.headers = headers !== null && headers !== void 0 ? headers : {};
        this.cookies = cookies !== null && cookies !== void 0 ? cookies : {};
        this.transient = {};
        this._requestItems = new Map();
        this.clientIp = clientIp;
        var _this_headers_referer;
        this.referrer = (_this_headers_referer = this.headers["referer"]) !== null && _this_headers_referer !== void 0 ? _this_headers_referer : null;
        this.trustedContext = !!trustedContext;
        // Defaults to unencrypted transport if nothing is specified.
        this._clientCipher = cipher !== null && cipher !== void 0 ? cipher : transport.defaultTransport;
        this._anonymousSessionReferenceId = anonymousSessionReferenceId;
    }
}
const trackerVariableKey = ({ scope, entityId, key })=>`${scope}\0${entityId !== null && entityId !== void 0 ? entityId : ""}\0${key}`;

// import type { TrackerClientConfiguration } from "@tailjs/client/external";
// import { CLIENT_CONFIG } from "@tailjs/client/external";
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
const DEFAULT = {
    trackerName: "tail",
    cookies: {
        namePrefix: ".tail",
        secure: true
    },
    debugScript: false,
    sessionTimeout: 30,
    client: {
        scriptBlockerAttributes: {
            "data-cookieconsent": "ignore"
        }
    },
    clientEncryptionKeySeed: "tailjs",
    json: false,
    defaultConsent: {
        classification: "anonymous",
        purposes: {}
    },
    environment: {
        idLength: 10
    },
    clientKeys: 5
};
class SchemaBuilder {
    registerSchema(source, type = "native") {
        this._collected.push({
            source,
            type
        });
        return this;
    }
    /**
   * Can be used to patch another schema, e.g. to change privacy settings.
   *
   * If the intended target schema is not present, `undefined` is passed which gives an opportunity to do nothing or throw an error.
   */ patchSchema(namespace, patch) {
        get(this._patches, namespace, ()=>[]).push(patch);
    }
    _applyPatches(schemas) {
        const usedPatches = new Set();
        for (const schema of schemas){
            forEach(this._patches.get(schema.namespace), (patch)=>{
                usedPatches.add(patch);
                patch(schema);
            });
        }
        forEach(this._patches, ([, patches])=>forEach(patches, (patch)=>!usedPatches.has(patch) && patch(undefined)));
    }
    async build(host) {
        let schemas = [];
        for (let { source, type } of this._collected){
            if (typeof source === "string") {
                source = JSON.parse(required(await host.readText(source), `The schema definition file "${source}" does not exist.`));
            }
            if (type === "json-schema") {
                schemas.push(...types.JsonSchemaAdapter.parse(source));
                continue;
            }
            if (!("namespace" in source)) {
                throwError(`The definition ${ellipsis(JSON.stringify(source), 40, true)} is not a tail.js schema definition. The namespace property is not present.`);
            }
            schemas.push(source);
        }
        const usedNamespaces = new Set();
        for (const schema of schemas){
            if (!add(usedNamespaces, schema.namespace)) {
                throwError(`A schema with the namespace '${schema.namespace}' has been registered more than once.`);
            }
        }
        if (this._coreSchema) {
            var _schemas_find;
            const coreSchema = (_schemas_find = schemas.find((schema)=>{
                var _this__coreSchema;
                return schema.namespace === ((_this__coreSchema = this._coreSchema) === null || _this__coreSchema === void 0 ? void 0 : _this__coreSchema.namespace);
            })) !== null && _schemas_find !== void 0 ? _schemas_find : this._coreSchema;
            if (schemas[0] !== coreSchema) {
                schemas = [
                    coreSchema,
                    ...schemas.filter((schema)=>schema !== coreSchema)
                ];
            }
        }
        this._applyPatches(schemas);
        return schemas;
    }
    constructor(initialSchemas, coreSchema){
        _define_property$7(this, "_collected", []);
        _define_property$7(this, "_patches", new Map());
        _define_property$7(this, "_coreSchema", void 0);
        this._coreSchema = coreSchema;
        if (initialSchemas === null || initialSchemas === void 0 ? void 0 : initialSchemas.length) {
            this._collected.push(...initialSchemas.map((schema)=>({
                    source: schema,
                    type: "native"
                })));
        }
    }
}

const serializeLogMessage = (message)=>{
    const error = message.error;
    if (error instanceof Error) {
        var _error_constructor;
        var _error_message;
        return {
            ...message,
            error: {
                ...error,
                type: error.name || ((_error_constructor = error.constructor) === null || _error_constructor === void 0 ? void 0 : _error_constructor.name),
                message: (_error_message = error.message) !== null && _error_message !== void 0 ? _error_message : "(unspecified error)",
                stack: error.stack
            }
        };
    }
    return {
        timestamp: new Date().toISOString(),
        level: message.level,
        message: message.message,
        ...JSON.parse(JSON.stringify(message))
    };
};

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
        _define_property$6(this, "_secure", void 0);
        this._secure = config.secure !== false;
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
class PostError extends Error {
    constructor(validation, extensions){
        super([
            ...validation.map((item)=>`The event ${JSON.stringify(item.source)} (${item.sourceIndex ? `source index #${item.sourceIndex}` : "no source index"}) is invalid: ${item.error}`),
            ...map(extensions, (item)=>`'${item[0]}' failed: ${item[1]}`)
        ].join("\n")), _define_property$5(this, "validation", void 0), _define_property$5(this, "extensions", void 0), this.validation = validation, this.extensions = extensions;
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
const SAME_SITE = {
    strict: "Strict",
    lax: "Lax",
    none: "None"
};
const getDefaultLogSourceName = (source)=>{
    var _source_constructor;
    if (!source) return undefined;
    if (!isObject(source)) return "" + source;
    let constructorName = source.constructor === Object ? undefined : (_source_constructor = source.constructor) === null || _source_constructor === void 0 ? void 0 : _source_constructor.name;
    var _source_logId;
    let name = (_source_logId = source.logId) !== null && _source_logId !== void 0 ? _source_logId : source.id;
    if (name) {
        return (constructorName ? constructorName + ":" : "") + name;
    }
    return constructorName !== null && constructorName !== void 0 ? constructorName : "" + source;
};
const detectPfx = (cert)=>{
    const certData = cert === null || cert === void 0 ? void 0 : cert.cert;
    if (certData && cert.pfx == null && typeof certData !== "string" && certData.length > 2 && // Magic number 0x30 0x82
    certData[0] === 0x30 && certData[1] === 0x82) {
        return {
            ...cert,
            pfx: true
        };
    }
    return cert;
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
        return transport.httpEncode(value);
    }
    httpDecode(encoded) {
        return encoded == null ? undefined : transport.httpDecode(encoded);
    }
    httpDecrypt(encoded) {
        if (encoded == null) return undefined;
        return this._crypto.decrypt(encoded);
    }
    hash(value, numericOrBits, secure = false) {
        return value == null ? value : secure ? this._crypto.hash(value, numericOrBits) : transport.hash(value, numericOrBits);
    }
    log(source, arg, level, error) {
        var _message, _message1;
        // This is what you get if you try to log nothing (null or undefined); Nothing.
        if (!arg) return;
        if (!error && arg instanceof Error) {
            error = arg;
        }
        const message = !isObject(arg) || arg instanceof Error ? {
            message: arg instanceof Error ? `An error occurred: ${arg.message}` : arg,
            level: level !== null && level !== void 0 ? level : error ? "error" : "info",
            error: error !== null && error !== void 0 ? error : arg instanceof Error ? arg : undefined
        } : arg;
        var _this__logGroups_get;
        const { group, name = getDefaultLogSourceName(source) } = (_this__logGroups_get = this._logGroups.get(source)) !== null && _this__logGroups_get !== void 0 ? _this__logGroups_get : {};
        var _group;
        (_group = (_message = message).group) !== null && _group !== void 0 ? _group : _message.group = group;
        var _source;
        (_source = (_message1 = message).source) !== null && _source !== void 0 ? _source : _message1.source = name;
        this._host.log(serializeLogMessage(message));
    }
    async nextId(scope) {
        return this._uidGenerator();
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
            // Do the PFX test here so the host don't strictly need to,
            // (assuming requests are mostly made through the TrackerEnvironment, and not the host directly).
            x509: detectPfx(request.x509)
        });
        const responseHeaders = Object.fromEntries(Object.entries(response.headers).map(([name, value])=>[
                name.toLowerCase(),
                value
            ]));
        const cookies = {};
        for (const cookie of response.cookies){
            var _ps_parameterListSymbol;
            const ps = parseHttpHeader(cookie, {
                delimiters: false,
                lowerCase: true
            });
            var _ps_parameterListSymbol_;
            const [name, value] = (_ps_parameterListSymbol_ = (_ps_parameterListSymbol = ps[parameterListSymbol]) === null || _ps_parameterListSymbol === void 0 ? void 0 : _ps_parameterListSymbol[0]) !== null && _ps_parameterListSymbol_ !== void 0 ? _ps_parameterListSymbol_ : [];
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
    ls(path) {
        return this._host.ls(path);
    }
    write(path, data) {
        return this._host.write(path, data);
    }
    writeText(path, text) {
        return this._host.writeText(path, text);
    }
    delete(path) {
        return this._host.delete(path);
    }
    compress(data, algorithm) {
        if (!this._host.compress) {
            return null;
        }
        return this._host.compress(data, algorithm);
    }
    async decompress(data, algorithm) {
        if (!this._host.decompress) {
            return null;
        }
        return await this._host.decompress(data, algorithm);
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
    constructor(host, crypto, storage, { idLength = 10, tags, uidGenerator } = {}){
        _define_property$4(this, "_crypto", void 0);
        _define_property$4(this, "_host", void 0);
        _define_property$4(this, "_logGroups", new Map());
        _define_property$4(this, "_uidGenerator", void 0);
        _define_property$4(this, "tags", void 0);
        _define_property$4(this, "cookieVersion", void 0);
        _define_property$4(this, "storage", void 0);
        this._host = host;
        this._crypto = crypto;
        this.tags = tags;
        this.storage = storage;
        if (!uidGenerator) {
            const uid = new ShortUniqueId({
                length: idLength
            });
            this._uidGenerator = ()=>uid.rnd();
        } else {
            this._uidGenerator = uidGenerator;
        }
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
class DefaultClientIdGenerator {
    async generateClientId(environment, request, stationary) {
        const data = [
            stationary ? "" : request.clientIp,
            ...map(this._headers, (header)=>request.headers[header] + "" || skip)
        ];
        // console.log(
        //   `Generated ${
        //     stationary ? "stationary" : "non-stationary"
        //   } client ID from the data: ${JSON.stringify(data)}.`
        // );
        return data.join("&");
    }
    constructor({ headers = [
        "accept-language",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
        "user-agent"
    ] } = {}){
        _define_property$3(this, "_headers", void 0);
        this._headers = headers;
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
const internalIdSymbol = Symbol();
let _Symbol_dispose$1 = Symbol.dispose;
class InMemoryStorage {
    _purgeExpired() {
        if (!this._ttl || this._disposed) {
            return;
        }
        const now = Date.now();
        const expiredEntities = [];
        for(const key in this._entities){
            this._entities[key].forEach((value, key)=>value[0] + this._ttl < now && expiredEntities.push(key));
            for (const key of expiredEntities){
                this._entities[key].delete(key);
            }
        }
        setTimeout(()=>this._purgeExpired, Math.min(this._ttl, 10000));
    }
    _getVariables(scope, entityId, now) {
        var _this__entities_scope;
        let variables = (_this__entities_scope = this._entities[scope]) === null || _this__entities_scope === void 0 ? void 0 : _this__entities_scope.get(entityId);
        if (variables) {
            if (this._ttl && variables[0] + this._ttl < now) {
                // Expired but not yet cleaned by background thread.
                this._entities[scope].delete(entityId);
                variables = undefined;
            } else {
                variables[0] = Date.now();
            }
        }
        return variables;
    }
    _getVariable(key, now) {
        var _this__getVariables;
        const [, , variables] = (_this__getVariables = this._getVariables(key.scope, key.entityId, now)) !== null && _this__getVariables !== void 0 ? _this__getVariables : [];
        if (!variables) return undefined;
        let variable = variables.get(key.key);
        if ((variable === null || variable === void 0 ? void 0 : variable.expires) != null) {
            if (variable.expires < now) {
                // Expired.
                variables.delete(key.key);
                variable = undefined;
            } else {
                variable.expires = now + variable.ttl;
            }
        }
        return variable;
    }
    async get(keys) {
        this._checkDisposed();
        const results = [];
        const now = Date.now();
        for (const getter of keys){
            const key = types.extractKey(getter);
            const variable = this._getVariable(getter, now);
            if (!variable) {
                results.push({
                    status: types.VariableResultStatus.NotFound,
                    ...key
                });
                continue;
            }
            if (getter.ifModifiedSince != null && variable.modified <= getter.ifModifiedSince || getter.ifNoneMatch != null && variable.version === getter.ifNoneMatch) {
                results.push({
                    status: types.VariableResultStatus.NotModified,
                    ...key
                });
                continue;
            }
            const result = {
                status: types.VariableResultStatus.Success,
                ...variable,
                value: jsonClone(variable.value)
            };
            delete result[internalIdSymbol];
            results.push(result);
        }
        return Promise.resolve(results);
    }
    set(values) {
        this._checkDisposed();
        const results = [];
        const now = Date.now();
        for (const setter of values){
            var _this__entities, _key_scope;
            const key = types.extractKey(setter);
            let variable = this._getVariable(setter, now);
            if (!variable && (setter.value == null || setter.version != null)) {
                results.push({
                    status: types.VariableResultStatus.NotFound,
                    ...key
                });
                continue;
            }
            if (!setter.force && variable && variable.version !== setter.version) {
                results.push({
                    status: types.VariableResultStatus.Conflict,
                    ...variable
                });
                continue;
            }
            var _;
            const [, , variables] = get((_ = (_this__entities = this._entities)[_key_scope = key.scope]) !== null && _ !== void 0 ? _ : _this__entities[_key_scope] = new Map(), key.entityId, ()=>[
                    now,
                    this._nextInternalId++,
                    new Map()
                ]);
            if (setter.value == null) {
                variables.delete(setter.key);
                results.push({
                    status: types.VariableResultStatus.Success,
                    ...key
                });
                if (!variables.size) {
                    this._entities[key.scope].delete(key.entityId);
                }
                continue;
            }
            const created = !variable;
            var _variable_internalIdSymbol, _variable_created;
            variables.set(setter.key, variable = {
                [internalIdSymbol]: (_variable_internalIdSymbol = variable === null || variable === void 0 ? void 0 : variable[internalIdSymbol]) !== null && _variable_internalIdSymbol !== void 0 ? _variable_internalIdSymbol : this._nextInternalId++,
                ...key,
                created: (_variable_created = variable === null || variable === void 0 ? void 0 : variable.created) !== null && _variable_created !== void 0 ? _variable_created : now,
                modified: now,
                ttl: setter.ttl,
                expires: setter.ttl != null ? now + setter.ttl : undefined,
                version: "" + this._nextVersion++,
                value: jsonClone(setter.value)
            });
            const result = {
                ...variable,
                value: jsonClone(variable.value),
                status: created ? types.VariableResultStatus.Created : types.VariableResultStatus.Success
            };
            delete result[internalIdSymbol];
            results.push(result);
        }
        return Promise.resolve(results);
    }
    _purgeOrQuery(queries, action, { page = 100, cursor } = {}) {
        if (action === "query" && page <= 0) return {
            variables: []
        };
        this._checkDisposed();
        const variables = [];
        const now = Date.now();
        let affected = 0;
        var _map;
        let [cursorScopeIndex = 0, cursorEntityId = -1, cursorVariableId = -1] = (_map = map(cursor === null || cursor === void 0 ? void 0 : cursor.split("."), (value)=>+value || 0)) !== null && _map !== void 0 ? _map : [];
        let scopeIndex = 0;
        const scopes = group(queries, (query)=>[
                this._entities[query.scope],
                [
                    query,
                    query.entityIds && distinct(query.entityIds)
                ]
            ]);
        for (const [entities, scopeQueries] of scopes){
            if (scopeIndex++ < cursorScopeIndex) {
                continue;
            }
            let entityIds;
            for (const [query] of scopeQueries){
                if (query.entityIds) {
                    if (entityIds) {
                        for (const entityId of entityIds){
                            entityIds.add(entityId);
                        }
                    } else {
                        entityIds = new Set(query.entityIds);
                    }
                } else {
                    entityIds = undefined;
                    break;
                }
            }
            for (const entityId of entityIds !== null && entityIds !== void 0 ? entityIds : entities.keys()){
                const data = entities.get(entityId);
                if (!data) {
                    continue;
                }
                const [, internalEntityId, entityVariables] = data;
                if (action === "query" && internalEntityId < cursorEntityId) {
                    continue;
                }
                if (variables.length >= page) {
                    return {
                        variables,
                        cursor: `${scopeIndex - 1}.${internalEntityId}`
                    };
                }
                const matchedVariables = new Set();
                for (const [query, queryEntityIds] of scopeQueries){
                    var _query_keys;
                    if ((queryEntityIds === null || queryEntityIds === void 0 ? void 0 : queryEntityIds.has(entityId)) === false) continue;
                    const keyFilter = distinct((_query_keys = query.keys) === null || _query_keys === void 0 ? void 0 : _query_keys.values);
                    const keyFilterMatch = query.keys && !query.keys.exclude;
                    for (const [variableKey, variable] of entityVariables){
                        if ((keyFilter === null || keyFilter === void 0 ? void 0 : keyFilter.has(variableKey)) !== keyFilterMatch) {
                            continue;
                        }
                        if (variable && (action === "purge" || !(variable.expires < now)) && (!query.ifModifiedSince || variable.modified > query.ifModifiedSince)) {
                            if (action === "purge") {
                                if (entityVariables.delete(variableKey)) {
                                    ++affected;
                                }
                            } else if (action === "refresh") {
                                if (variable.ttl != null) {
                                    variable.expires = now + variable.ttl;
                                    ++affected;
                                }
                            } else {
                                if (internalEntityId === cursorEntityId && variable[internalIdSymbol] < cursorVariableId) {
                                    continue;
                                }
                                matchedVariables.add(variable);
                            }
                        }
                    }
                }
                for (const variable of matchedVariables){
                    if (variables.length >= page) {
                        return {
                            variables,
                            cursor: `${scopeIndex - 1}.${internalEntityId}.${variable[internalIdSymbol]}`
                        };
                    }
                    variables.push({
                        ...variable,
                        value: jsonClone(variable.value)
                    });
                }
            }
            cursorEntityId = -1;
        }
        // We have enumerated all variables, we are done - no cursor.
        return action === "query" ? {
            variables
        } : affected;
    }
    async purge(queries) {
        return this._purgeOrQuery(queries, "purge");
    }
    async renew(queries) {
        return this._purgeOrQuery(queries, "refresh");
    }
    async query(queries, options) {
        return this._purgeOrQuery(queries, "query", options);
    }
    _checkDisposed() {
        if (this._disposed) {
            throw new Error("This storage has been disposed.");
        }
    }
    [_Symbol_dispose$1]() {
        this._disposed = true;
    }
    constructor({ ttl } = {}){
        _define_property$2(this, "_nextVersion", 1);
        _define_property$2(this, "_disposed", false);
        _define_property$2(this, "_nextInternalId", 1);
        _define_property$2(this, "_entities", {});
        _define_property$2(this, "_ttl", void 0);
        this._ttl = ttl;
        this._purgeExpired();
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
const unknownSource = (key)=>({
        status: types.VariableResultStatus.BadRequest,
        ...types.extractKey(key),
        [traceSymbol]: key[traceSymbol],
        error: `The scope ${key.scope} has no source with the ID '${key.source}'.`
    });
const traceSymbol = Symbol();
const addSourceTrace = (item, trace)=>(item[traceSymbol] = [
        item,
        trace
    ], item);
const withTrace = (item, trace)=>(trace["source"] = item, item[traceSymbol] = trace, item);
const copyTrace = (item, trace)=>(item[traceSymbol] = trace[traceSymbol], item);
const clearTrace = (item)=>{
    if (item === null || item === void 0 ? void 0 : item[traceSymbol]) {
        delete item[traceSymbol];
    }
    return item;
};
const getTrace = (item)=>item[traceSymbol];
const mergeTrace = (target, { source, scope, [traceSymbol]: trace })=>Object.assign(target, {
        source,
        scope,
        [traceSymbol]: trace
    });
let _Symbol_dispose = Symbol.dispose;
class VariableSplitStorage {
    async _splitApply(keys, action, { notFound, parallel = true } = {}) {
        const results = [];
        const splits = new Map();
        let sourceIndex = 0;
        for (const key of keys){
            var _this__mappings_scope;
            const { scope, source } = key;
            let { storage, settings } = (_this__mappings_scope = this._mappings[scope]) === null || _this__mappings_scope === void 0 ? void 0 : _this__mappings_scope[source !== null && source !== void 0 ? source : ""];
            if (!storage) {
                const errorResult = notFound === null || notFound === void 0 ? void 0 : notFound(key);
                errorResult && (results[sourceIndex++] = errorResult);
                continue;
            }
            let storageKeys = splits.get(storage);
            !storageKeys && splits.set(storage, storageKeys = [
                {
                    source,
                    scope
                },
                [],
                [],
                settings
            ]);
            storageKeys[1].push(key);
            storageKeys[2].push(sourceIndex);
            sourceIndex++;
        }
        const tasks = [];
        for (const [storage, [source, keys, sourceIndices, settings]] of splits){
            const task = (async ()=>{
                let i = 0;
                const actionResults = await action(source, storage, keys, settings);
                if (actionResults) {
                    for (const result of actionResults){
                        results[sourceIndices[i++]] = result;
                    }
                }
                return actionResults;
            })();
            if (parallel) {
                tasks.push(task);
            } else {
                if (await task === false) {
                    break;
                }
            }
        }
        if (tasks.length) {
            await Promise.all(tasks);
        }
        return results;
    }
    async get(keys) {
        if (!keys.length) return [];
        return this._splitApply(keys, async (_source, storage, getters, settings)=>{
            try {
                const defaultTtl = settings.ttl;
                if (defaultTtl > 0) {
                    for (const getter of getters){
                        var _getter;
                        var _ttl;
                        (_ttl = (_getter = getter).ttl) !== null && _ttl !== void 0 ? _ttl : _getter.ttl = defaultTtl;
                    }
                }
                return (await storage.get(getters)).map((result, i)=>mergeTrace(result, getters[i]));
            } catch (error) {
                return getters.map((key)=>{
                    var _this__settings;
                    return mergeTrace({
                        status: types.VariableResultStatus.Error,
                        ...types.extractKey(key),
                        error: formatError(error, (_this__settings = this._settings) === null || _this__settings === void 0 ? void 0 : _this__settings.includeStackTraces),
                        transient: isTransientErrorObject(error)
                    }, key);
                });
            }
        }, {
            notFound: unknownSource
        });
    }
    set(values) {
        if (!values.length) return [];
        return this._splitApply(values, async (_source, storage, setters, settings)=>{
            if (isWritableStorage(storage)) {
                const defaultTtl = settings.ttl;
                if (defaultTtl > 0) {
                    for (const setter of setters){
                        var _setter;
                        var _ttl;
                        (_ttl = (_setter = setter).ttl) !== null && _ttl !== void 0 ? _ttl : _setter.ttl = defaultTtl;
                    }
                }
                try {
                    return (await storage.set(setters)).map((setter, i)=>mergeTrace(setter, setters[i]));
                } catch (error) {
                    return setters.map((setter)=>{
                        var _this__settings;
                        return mergeTrace({
                            status: types.VariableResultStatus.Error,
                            ...types.extractKey(setter),
                            error: formatError(error, (_this__settings = this._settings) === null || _this__settings === void 0 ? void 0 : _this__settings.includeStackTraces),
                            transient: isTransientErrorObject(error)
                        }, setter);
                    });
                }
            } else {
                return setters.map((setter)=>mergeTrace({
                        status: types.VariableResultStatus.BadRequest,
                        ...types.extractKey(setter)
                    }, setter));
            }
        }, {
            notFound: unknownSource
        });
    }
    splitSourceQueries(queries) {
        const splits = [];
        for (const query of queries){
            for (const scope of types.filterKeys(query.scope ? [
                query.scope
            ] : query === null || query === void 0 ? void 0 : query.scopes, keys(this._mappings))){
                var _this__mappings_scope;
                for (const source of types.filterKeys(query === null || query === void 0 ? void 0 : query.sources, keys((_this__mappings_scope = this._mappings[scope]) !== null && _this__mappings_scope !== void 0 ? _this__mappings_scope : [
                    null
                ]))){
                    splits.push({
                        source,
                        scope,
                        ...query,
                        sources: [
                            source
                        ],
                        scopes: [
                            scope
                        ]
                    });
                }
            }
        }
        return splits;
    }
    async purge(queries) {
        let purged = 0;
        await this._splitApply(this.splitSourceQueries(queries), async (_source, storage, queries)=>{
            if (isWritableStorage(storage)) {
                const count = await storage.purge(queries);
                if (count == null) {
                    purged = undefined;
                } else if (purged != null) {
                    purged += count;
                }
            }
        }, {
            parallel: false
        });
        return purged;
    }
    async renew(queries) {
        let refreshed = 0;
        await this._splitApply(this.splitSourceQueries(queries), async (_source, storage, queries)=>{
            if (isWritableStorage(storage)) {
                const count = await storage.renew(queries);
                if (count == null) {
                    refreshed = undefined;
                } else if (refreshed != null) {
                    refreshed += count;
                }
            }
        }, {
            parallel: false
        });
        return refreshed;
    }
    async query(queries, { page = 100, cursor: splitCursor } = {}) {
        const sourceQueries = this.splitSourceQueries(queries);
        // Cursor: Current query, current cursor
        const match = splitCursor === null || splitCursor === void 0 ? void 0 : splitCursor.match(/^(\d+)(?::(.*))?$/);
        let cursorOffset = match ? +match[1] : 0;
        let cursor = (match === null || match === void 0 ? void 0 : match[2]) || undefined;
        const variables = [];
        let nextCursor;
        let offset = 0;
        await this._splitApply(sourceQueries, async (source, storage, queries)=>{
            if (offset++ < cursorOffset) {
                return;
            }
            do {
                const result = await storage.query(queries, {
                    page,
                    cursor: cursor
                });
                cursor = result.cursor;
                variables.push(...result.variables.map((variable)=>mergeTrace(variable, source)));
                if ((page -= result.variables.length) <= 0) {
                    nextCursor = cursor ? `${offset - 1}:${cursor}` : `${offset}`;
                    // Stop
                    return false;
                }
            }while (cursor)
        }, {
            parallel: false
        });
        return {
            variables,
            cursor: nextCursor
        };
    }
    async initialize(environment) {
        await forEachAwait(this._mappings, ([, mappings])=>forEachAwait(mappings, ([, { storage }])=>{
                var _storage_initialize;
                storage === null || storage === void 0 ? void 0 : (_storage_initialize = storage.initialize) === null || _storage_initialize === void 0 ? void 0 : _storage_initialize.call(storage, environment);
            }));
    }
    [_Symbol_dispose]() {
        Object.values(this._mappings).forEach((mappings)=>Object.values(mappings).forEach((storage)=>{
                var _storage_Symbol_dispose;
                return (_storage_Symbol_dispose = storage[Symbol.dispose]) === null || _storage_Symbol_dispose === void 0 ? void 0 : _storage_Symbol_dispose.call(storage);
            }));
    }
    constructor(mappings, settings){
        _define_property$1(this, "_mappings", void 0);
        _define_property$1(this, "_settings", void 0);
        this._mappings = {};
        this._settings = settings;
        const defaultStorage = mappings.default;
        for (const scope of types.VariableServerScope.levels){
            var _mappings_ttl;
            var _mappings_ttl_scope;
            const defaultScopeTtl = (_mappings_ttl_scope = (_mappings_ttl = mappings.ttl) === null || _mappings_ttl === void 0 ? void 0 : _mappings_ttl[scope]) !== null && _mappings_ttl_scope !== void 0 ? _mappings_ttl_scope : undefined;
            var _mappings_scope;
            const scopeMappings = (_mappings_scope = mappings[scope]) !== null && _mappings_scope !== void 0 ? _mappings_scope : defaultStorage && {
                storage: defaultStorage
            };
            if (!scopeMappings) {
                continue;
            }
            if (scopeMappings.storage) {
                var _this__mappings, _scope;
                var _, _scopeMappings_ttl;
                ((_ = (_this__mappings = this._mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _this__mappings[_scope] = {})[""] = {
                    storage: scopeMappings.storage,
                    settings: {
                        ttl: (_scopeMappings_ttl = scopeMappings.ttl) !== null && _scopeMappings_ttl !== void 0 ? _scopeMappings_ttl : defaultScopeTtl
                    }
                };
            }
            forEach(scopeMappings.prefixes, ([prefix, config])=>{
                var _this__mappings, _scope;
                if (!config) return;
                var _, _config_ttl;
                ((_ = (_this__mappings = this._mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _this__mappings[_scope] = {})[prefix] = {
                    storage: config.storage,
                    settings: {
                        ttl: (_config_ttl = config.ttl) !== null && _config_ttl !== void 0 ? _config_ttl : defaultScopeTtl
                    }
                };
            });
        }
    }
}

const isWritableStorage = (storage)=>"set" in storage;

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
const DEFAULT_SETTINGS = {
    retries: {
        patch: {
            attempts: 10,
            delay: 50,
            jitter: 25
        },
        error: {
            attempts: 3,
            delay: 500,
            jitter: 250
        }
    },
    includeStackTraces: false,
    errorLogger: null
};
const isTransientErrorObject = (error)=>(error === null || error === void 0 ? void 0 : error["transient"]) || ((error === null || error === void 0 ? void 0 : error.message) + "").match(/\btransient\b/i) != null;
const mapValidationContext = (context, targetPurpose, forResponse = false)=>{
    var _context_scope, _context_scope1;
    return ((_context_scope = context.scope) === null || _context_scope === void 0 ? void 0 : _context_scope.consent) || targetPurpose || forResponse ? {
        ...context,
        targetPurpose,
        consent: (_context_scope1 = context.scope) === null || _context_scope1 === void 0 ? void 0 : _context_scope1.consent,
        forResponse
    } : context;
};
const censorResult = (result, type, context)=>{
    if ("value" in result && result.value != null) {
        if ((result.value = type.censor(result.value, context)) == undefined) {
            return copyTrace({
                // Document somewhere that a conflict may turn into a forbidden error.
                status: types.VariableResultStatus.Forbidden,
                ...types.extractKey(result),
                error: "No data available for the current level of consent."
            }, result);
        }
    }
    return result;
};
const retryDelay = (settings)=>delay(settings.delay + Math.random() * settings.jitter);
const validateEntityId = (target, context)=>{
    if (context.scope == null || target.scope === "global") {
        if (target.entityId == undefined) {
            throwError(`An entity ID for ${target.scope} scope is required in this context.`);
        }
        return target;
    }
    const expectedId = context.scope[target.scope + "Id"];
    if (expectedId == undefined) {
        return null; //No ID available for scope in context.
    }
    if (target.entityId && expectedId !== target.entityId) {
        throwError(`The specified ID in ${target.scope} scope does not match that in the current session.`);
    }
    target.entityId = expectedId;
    return target;
};
const getScopeSourceKey = (scope, source)=>source ? scope + "|" + source : scope;
const DEFAULT_USAGE = {
    readonly: false,
    visibility: "public",
    ...types.DataUsage.anonymous
};
const invalidVariableKeyToErrorResult = (key)=>{
    const errorMessage = types.validateVariableKeySyntax(key);
    return errorMessage ? {
        status: types.VariableResultStatus.BadRequest,
        ...key,
        error: errorMessage
    } : undefined;
};
class VariableStorageCoordinator {
    _getTypeResolver({ scope, source }) {
        var _this__storageTypeResolvers_get;
        return (_this__storageTypeResolvers_get = this._storageTypeResolvers.get(getScopeSourceKey(scope, source))) !== null && _this__storageTypeResolvers_get !== void 0 ? _this__storageTypeResolvers_get : throwError(`No storage is defined for ${scope}${source ? `:${source}` : ""}`);
    }
    _getSchemaVariable(key) {
        return this._getTypeResolver(key).getVariable(key.scope, key.key, false);
    }
    _assignResultSchemas(results) {
        for (const [, result] of results){
            clearTrace(result);
            if (types.isVariableResult(result)) {
                const variable = this._getSchemaVariable(result);
                if (variable && "properties" in variable.type) {
                    var _variable_usage;
                    result.schema = {
                        type: variable.type.id,
                        version: variable.type.version,
                        usage: (_variable_usage = variable.usage) !== null && _variable_usage !== void 0 ? _variable_usage : DEFAULT_USAGE
                    };
                }
            }
        }
        return results;
    }
    _captureVariableError(result, error) {
        var _this__errorLogger, _this;
        (_this__errorLogger = (_this = this)._errorLogger) === null || _this__errorLogger === void 0 ? void 0 : _this__errorLogger.call(_this, {
            level: "error",
            message: types.formatVariableResult(result),
            details: {
                scope: result.scope,
                source: result.source,
                key: result.key
            },
            error
        });
        return result;
    }
    get(getters, context = this._defaultContext) {
        return types.toVariableResultPromise("get", getters, async (getters)=>{
            const results = new Map();
            if (!getters.length) return results;
            let pendingGetters = [];
            let index = 0;
            for (const getter of getters){
                const syntaxErrorResult = invalidVariableKeyToErrorResult(getter);
                if (syntaxErrorResult) {
                    results.set(getter, syntaxErrorResult);
                    continue;
                }
                try {
                    if (validateEntityId(getter, context) === null) {
                        results.set(getter, {
                            status: types.VariableResultStatus.NotFound,
                            ...types.extractKey(getter),
                            message: `No ID is available for ${getter.scope} scope in the current session.`
                        });
                        continue;
                    }
                } catch (error) {
                    results.set(getter, this._captureVariableError({
                        status: types.VariableResultStatus.BadRequest,
                        ...types.extractKey(getter),
                        error: formatError(error, this._settings.includeStackTraces)
                    }, error));
                    continue;
                }
                const type = this._getSchemaVariable(getter);
                if (type) {
                    const targetPurpose = getter.purpose;
                    const cached = getter.cache && !getter.refresh && context.cache ? await context.cache.get(getter) : undefined;
                    if (type.dynamic || cached) {
                        var _context_dynamicVariables_getter_scope_getter_key, _context_dynamicVariables_getter_scope, _context_dynamicVariables;
                        let value = cached !== null && cached !== void 0 ? cached : (_context_dynamicVariables = context.dynamicVariables) === null || _context_dynamicVariables === void 0 ? void 0 : (_context_dynamicVariables_getter_scope = _context_dynamicVariables[getter.scope]) === null || _context_dynamicVariables_getter_scope === void 0 ? void 0 : (_context_dynamicVariables_getter_scope_getter_key = _context_dynamicVariables_getter_scope[getter.key]) === null || _context_dynamicVariables_getter_scope_getter_key === void 0 ? void 0 : _context_dynamicVariables_getter_scope_getter_key.call(_context_dynamicVariables_getter_scope, getter);
                        if (value) {
                            const errors = [];
                            const validationContext = mapValidationContext(context, getter.purpose, true);
                            value = type.censor(type.validate(value, undefined, validationContext, errors), validationContext);
                            if (value === types.VALIDATION_ERROR_SYMBOL) {
                                results.set(getter, {
                                    status: types.VariableResultStatus.Error,
                                    ...types.extractKey(getter),
                                    error: `Validation of the ${cached ? "cached" : "dynamically generated"} variable ${types.formatVariableKey(getter)} value failed: ${types.formatValidationErrors(errors)}.`
                                });
                                continue;
                            }
                        }
                        const timestamp = now();
                        results.set(getter, value == null ? getter.init ? {
                            status: types.VariableResultStatus.BadRequest,
                            ...types.extractKey(getter),
                            error: "Dynamic variables cannot be set."
                        } : {
                            status: types.VariableResultStatus.NotFound,
                            ...types.extractKey(getter)
                        } : {
                            status: types.VariableResultStatus.Success,
                            ...types.extractKey(getter),
                            created: timestamp,
                            modified: timestamp,
                            value: value,
                            version: now().toString()
                        });
                        continue;
                    }
                    pendingGetters.push(withTrace(getter, {
                        getter,
                        sourceIndex: index++,
                        type,
                        targetPurpose
                    }));
                    continue;
                }
                results.set(getter, {
                    status: types.VariableResultStatus.BadRequest,
                    ...types.extractKey(getter),
                    error: types.formatVariableKey(getter, "is not defined in the schema")
                });
            }
            const pendingSetters = [];
            let retry = 0;
            while(pendingGetters.length && retry++ < this._errorRetries.attempts){
                if (retry > 1) await retryDelay(this._errorRetries);
                for (let result of (await this._storage.get(pendingGetters.splice(0)))){
                    const { source: getter, sourceIndex, type, targetPurpose } = getTrace(result);
                    const validationContext = mapValidationContext(context, getter.purpose, true);
                    result = censorResult(result, type, validationContext);
                    results.set(getter, result);
                    if ("value" in result) {
                        continue;
                    } else if (types.isTransientError(result)) {
                        pendingGetters.push(getter);
                    } else if (result.status === types.VariableResultStatus.NotFound && getter.init) {
                        const initValidationContext = mapValidationContext(context, getter.purpose);
                        try {
                            let initValue = await getter.init();
                            if (initValue == null) {
                                continue;
                            }
                            let errors = [];
                            const validated = type.validate(initValue, undefined, initValidationContext, errors);
                            if (validated === types.VALIDATION_ERROR_SYMBOL) {
                                results.set(getter, {
                                    status: types.VariableResultStatus.BadRequest,
                                    ...types.extractKey(getter),
                                    error: types.formatValidationErrors(errors)
                                });
                                continue;
                            }
                            initValue = type.censor(validated, initValidationContext);
                            if (initValue == null) {
                                results.set(getter, {
                                    status: types.VariableResultStatus.Forbidden,
                                    ...types.extractKey(getter),
                                    error: "The current consent prevents one or more required properties."
                                });
                                continue;
                            }
                            pendingSetters.push(withTrace({
                                ...types.extractKey(getter),
                                ttl: getter.ttl,
                                version: null,
                                value: initValue
                            }, {
                                getter,
                                sourceIndex,
                                type: type,
                                targetPurpose
                            }));
                        } catch (error) {
                            results.set(getter, this._captureVariableError({
                                status: types.VariableResultStatus.Error,
                                ...types.extractKey(getter),
                                error: formatError(error, this._settings.includeStackTraces)
                            }, error));
                        }
                    }
                }
            }
            retry = 0;
            while(pendingSetters.length && retry++ < this._errorRetries.attempts){
                if (retry > 1) await retryDelay(this._errorRetries);
                for (const result of (await this._storage.set(pendingSetters.splice(0)))){
                    const { source: setter, getter, type, targetPurpose } = getTrace(result);
                    const validationContext = mapValidationContext(context, targetPurpose);
                    if (result.status === types.VariableResultStatus.Conflict) {
                        results.set(getter, censorResult({
                            ...result,
                            status: types.VariableResultStatus.Success
                        }, type, validationContext));
                    } else if (types.isTransientError(result)) {
                        pendingSetters.push(setter);
                    } else {
                        // Cast as any. The set result that doesn't overlap is a delete result,
                        // but a delete result at this point would mean an invariant was violated
                        // since we not add pending setters for null or undefined init results.
                        results.set(getter, censorResult(result, type, validationContext));
                    }
                }
            }
            for (const [key, variable] of results){
                var _context_cache;
                removeLocalScopeIds(variable, context);
                removeLocalScopeIds(variable, context);
                if (variable.status === types.VariableResultStatus.Created && ((_context_cache = context.cache) === null || _context_cache === void 0 ? void 0 : _context_cache.set)) {
                    context.cache.set(key, types.extractVariable(variable));
                }
            }
            return this._assignResultSchemas(results);
        });
    }
    set(setters, context = this._defaultContext) {
        return types.toVariableResultPromise("set", setters, async (setters)=>{
            const results = new Map();
            if (!setters.length) return results;
            const validationContext = mapValidationContext(context, undefined);
            const pendingSetters = [];
            let index = 0;
            for (const setter of setters){
                const syntaxErrorResult = invalidVariableKeyToErrorResult(setter);
                if (syntaxErrorResult) {
                    results.set(setter, syntaxErrorResult);
                    continue;
                }
                let type;
                try {
                    if (validateEntityId(setter, context) === null) {
                        results.set(setter, {
                            status: types.VariableResultStatus.NotFound,
                            ...types.extractKey(setter),
                            message: `No ID is available for ${setter.scope} scope in the current session.`
                        });
                        continue;
                    }
                    type = this._getSchemaVariable(setter);
                } catch (error) {
                    results.set(setter, this._captureVariableError({
                        status: types.VariableResultStatus.BadRequest,
                        ...types.extractKey(setter),
                        error: formatError(error, this._settings.includeStackTraces)
                    }, error));
                    continue;
                }
                if (type) {
                    pendingSetters.push(withTrace(setter, {
                        sourceIndex: index++,
                        type: type,
                        retries: 0,
                        current: undefined
                    }));
                    continue;
                }
                results.set(setter, {
                    status: types.VariableResultStatus.BadRequest,
                    ...types.extractKey(setter),
                    error: types.formatVariableKey(setter, "is not defined.")
                });
            }
            let retry = 0;
            while(pendingSetters.length && retry++ <= this._patchRetries.attempts){
                if (retry > 1) {
                    // Add random delay in the hope that we resolve conflict races.
                    await retryDelay(this._patchRetries);
                }
                const valueSetters = [];
                for (const current of (await this._storage.get(pendingSetters.splice(0).map((setter)=>copyTrace(types.extractKey(setter), setter))))){
                    const trace = getTrace(current);
                    const { source: setter, type } = trace;
                    if (!types.isSuccessResult(current, false)) {
                        results.set(setter, current);
                        // Retry
                        if (types.isTransientError(current) && trace.retries++ < this._errorRetries.attempts) {
                            pendingSetters.push(setter);
                        }
                        continue;
                    }
                    if (current.status === types.VariableResultStatus.NotModified) {
                        results.set(setter, {
                            status: types.VariableResultStatus.Error,
                            ...types.extractKey(current),
                            error: `Unexpected status 304 returned when requesting the current version of ${types.formatVariableKey(setter)}.`
                        });
                        continue;
                    }
                    const currentVariable = trace.current = types.isSuccessResult(current) ? current : undefined;
                    try {
                        const errors = [];
                        const currentValue = currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.value;
                        const snapshot = JSON.stringify(currentValue);
                        let value = setter.patch ? await setter.patch(// The patch function runs on uncensored data so external logic do not have to deal with missing properties.
                        currentValue) : setter.value;
                        if ((setter.patch || currentVariable) && JSON.stringify(value) === snapshot) {
                            // No change from patch, or same value as current if any.
                            // This branch excludes trying to explicitly delete a variable that does not exist, since that is an error (NotFound).
                            results.set(setter, {
                                ...currentVariable !== null && currentVariable !== void 0 ? currentVariable : types.extractKey(setter),
                                status: types.VariableResultStatus.Success
                            });
                            continue;
                        }
                        if (value != null) {
                            value = type.censor(type.validate(value, currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.value, validationContext, errors), validationContext);
                        }
                        if (errors.length) {
                            results.set(setter, {
                                status: errors[0].forbidden ? types.VariableResultStatus.Forbidden : types.VariableResultStatus.BadRequest,
                                ...types.extractKey(setter),
                                error: types.formatValidationErrors(errors)
                            });
                            continue;
                        }
                        if (!setter.patch && !setter.force && setter.version !== (currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.version)) {
                            // Access tests are done before concurrency tests.
                            // It would be weird to be told there was a conflict, then resolve it, and then be told you
                            // were not allowed in the first place.
                            results.set(setter, !currentVariable ? {
                                status: types.VariableResultStatus.NotFound,
                                ...types.extractKey(setter)
                            } : {
                                ...currentVariable,
                                status: types.VariableResultStatus.Conflict
                            });
                            continue;
                        }
                        // Add a clone of the source setter with the new validated and censored value.
                        valueSetters.push(copyTrace({
                            ...setter,
                            patch: undefined,
                            version: currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.version,
                            value
                        }, // Reuse original setter data, so we know what to do if retried.
                        setter));
                    } catch (e) {
                        results.set(setter, this._captureVariableError({
                            status: types.VariableResultStatus.Error,
                            ...types.extractKey(setter),
                            error: formatError(e, this._settings.includeStackTraces)
                        }, e));
                    }
                }
                if (!valueSetters.length) {
                    continue;
                }
                for (let result of (await this._storage.set(valueSetters))){
                    const { source: setter, type } = getTrace(result);
                    const validationContext = mapValidationContext(context, undefined);
                    if (result.status === types.VariableResultStatus.Conflict && setter.patch && retry < this._patchRetries.attempts) {
                        // Reapply the patch.
                        pendingSetters.push(setter);
                        continue;
                    }
                    results.set(setter, censorResult(result, type, validationContext));
                }
            }
            for (const [key, variable] of results){
                var _context_cache;
                removeLocalScopeIds(variable, context);
                if (types.isSuccessResult(variable) && ((_context_cache = context.cache) === null || _context_cache === void 0 ? void 0 : _context_cache.set)) {
                    context.cache.set(key, variable.version ? types.extractVariable(variable) : undefined);
                }
            }
            return this._assignResultSchemas(results);
        });
    }
    async _queryOrPurge(filters, action, context, purgeFilter) {
        const mapped = [];
        for (let query of this._storage.splitSourceQueries(truish(filters))){
            const contextScopes = context.scope;
            if (contextScopes != null && query.scope !== "global") {
                const scopeEntityId = contextScopes[query.scope + "Id"];
                if (scopeEntityId != null) {
                    var _query_entityIds;
                    const invalidEntityIds = query === null || query === void 0 ? void 0 : (_query_entityIds = query.entityIds) === null || _query_entityIds === void 0 ? void 0 : _query_entityIds.filter((entityId)=>entityId !== scopeEntityId);
                    if (invalidEntityIds === null || invalidEntityIds === void 0 ? void 0 : invalidEntityIds.length) {
                        throwError(`The entity IDs ${itemize(invalidEntityIds)} are not allowed in ${query.scope} scope.`);
                    }
                    query.entityIds = [
                        scopeEntityId
                    ];
                } else {
                    continue;
                }
            }
            let variableKeys = [];
            const resolver = this._getTypeResolver(query);
            if (query.classification || query.purposes) {
                const scopeVariables = resolver.variables[query.scope];
                forEach(scopeVariables, ([key, variable])=>{
                    const usage = variable.usage;
                    if (!usage) return;
                    if (!types.filterRangeValue(usage.classification, query.classification, (classification)=>types.DataClassification.ranks[classification])) {
                        return;
                    }
                    if (query.purposes && !types.DataPurposes.test(usage.purposes, query.purposes, {
                        intersect: purgeFilter ? "all" : "some"
                    })) {
                        return;
                    }
                    variableKeys.push(key);
                });
                if (!variableKeys.length) {
                    continue;
                }
                if (query.keys) {
                    variableKeys = types.filterKeys(query.keys, variableKeys);
                }
                if (variableKeys.length < keyCount(scopeVariables)) {
                    query = {
                        ...query,
                        keys: variableKeys
                    };
                }
            }
            const { scope, entityIds, keys, ifModifiedSince } = query;
            var _keys_not;
            const keyArray = array((_keys_not = keys === null || keys === void 0 ? void 0 : keys.not) !== null && _keys_not !== void 0 ? _keys_not : keys);
            mapped.push({
                scope,
                entityIds,
                keys: keyArray && {
                    exclude: !!(keys === null || keys === void 0 ? void 0 : keys.not),
                    values: keyArray
                },
                ifModifiedSince
            });
        }
        let retry = 0;
        while(retry++ < this._errorRetries.attempts){
            try {
                return await action(mapped);
            } catch (e) {
                if (retry === this._errorRetries.attempts || !isTransientErrorObject(e)) {
                    throw e;
                }
                await retryDelay(this._errorRetries);
            }
        }
        // Never happens.
        return undefined;
    }
    async purge(filters, { context = this._defaultContext, bulk } = {}) {
        if (!isArray(filters)) {
            filters = [
                filters
            ];
        }
        filters = truish(filters);
        if ((!bulk || !context.trusted) && some(filters, (filter)=>!filter.entityIds)) {
            return throwError(context.trusted ? "If no entity IDs are specified, the bulk option must be set to true." : "Bulk delete are not allowed from untrusted context.");
        }
        let purged = 0;
        await this._queryOrPurge(filters, async (filters)=>{
            const count = await this._storage.purge(filters);
            if (count == null) {
                purged = undefined;
            } else if (purged != null) {
                purged += count;
            }
        }, context, true);
        return purged;
    }
    async query(filters, { context = this._defaultContext, ...options } = {}) {
        return await this._queryOrPurge(!isArray(filters) ? [
            filters
        ] : filters, async (filters)=>{
            var _context_scope;
            const result = await this._storage.query(filters, options);
            const consent = (_context_scope = context.scope) === null || _context_scope === void 0 ? void 0 : _context_scope.consent;
            if (consent) {
                const validationContext = mapValidationContext(context, undefined);
                this._assignResultSchemas(result.variables.map((variable)=>[
                        ,
                        variable
                    ]));
                result.variables = map(result.variables, (variable)=>{
                    const variableType = this._getSchemaVariable(variable);
                    const censored = variableType === null || variableType === void 0 ? void 0 : variableType.censor(variable.value, validationContext);
                    return variableType ? censored ? variable.value !== censored ? {
                        ...variable,
                        value: censored
                    } : variable : skip : variable;
                });
            }
            return result;
        }, context, false);
    }
    async renew(filters, context = this._defaultContext) {
        if (!isArray(filters)) {
            filters = [
                filters
            ];
        }
        let refreshed = 0;
        await this._queryOrPurge(filters, async (filters)=>{
            const count = await this._storage.renew(filters);
            if (count == null) {
                refreshed = undefined;
            } else if (refreshed != undefined) {
                refreshed += count;
            }
        }, context, true);
        return refreshed;
    }
    async initialize(environment) {
        await this._storage.initialize(environment);
    }
    constructor({ storage, ...settings }, types$1, defaultContext = {
        trusted: false
    }){
        _define_property(this, "_storage", void 0);
        _define_property(this, "_types", void 0);
        _define_property(this, "_storageTypeResolvers", new Map());
        _define_property(this, "_defaultContext", void 0);
        _define_property(this, "_patchRetries", void 0);
        _define_property(this, "_errorRetries", void 0);
        _define_property(this, "_settings", void 0);
        _define_property(this, "_errorLogger", null);
        if (!types$1) {
            throwError("A type resolver is required.");
        }
        this._storage = new VariableSplitStorage(storage);
        this._defaultContext = defaultContext;
        this._types = types$1;
        const defaultStorage = storage.default;
        for (const scope of types.VariableServerScope.levels){
            var _storage_scope;
            const scopeMappings = (_storage_scope = storage[scope]) !== null && _storage_scope !== void 0 ? _storage_scope : defaultStorage && {
                storage: defaultStorage
            };
            if (!scopeMappings) {
                continue;
            }
            this._storageTypeResolvers.set(getScopeSourceKey(scope), scopeMappings.schemas ? this._types.subset(scopeMappings.schemas) : this._types);
            forEach(scopeMappings.prefixes, ([prefix, config])=>{
                if (!config) return;
                this._storageTypeResolvers.set(getScopeSourceKey(scope, prefix), config.schemas ? this._types.subset(config.schemas) : this._types);
            });
        }
        ({ retries: { patch: this._patchRetries, error: this._errorRetries }, errorLogger: this._errorLogger } = this._settings = merge(settings, [
            defaultContext,
            DEFAULT_SETTINGS
        ], {
            overwrite: false
        }));
    }
}
const removeLocalScopeIds = (variable, context)=>{
    var _context_scope;
    if (context === null || context === void 0 ? void 0 : (_context_scope = context.scope) === null || _context_scope === void 0 ? void 0 : _context_scope[variable.scope + "Id"]) {
        variable.entityId = undefined;
        return true;
    }
    return false;
};

exports.CookieMonster = CookieMonster;
exports.DEFAULT = DEFAULT;
exports.DefaultClientIdGenerator = DefaultClientIdGenerator;
exports.DefaultCryptoProvider = DefaultCryptoProvider;
exports.EventLogger = EventLogger;
exports.InMemoryStorage = InMemoryStorage;
exports.MAX_CACHE_HEADERS = MAX_CACHE_HEADERS;
exports.PostError = PostError;
exports.RequestHandler = RequestHandler;
exports.SCRIPT_CACHE_HEADERS = SCRIPT_CACHE_HEADERS;
exports.SchemaBuilder = SchemaBuilder;
exports.Tracker = Tracker;
exports.TrackerEnvironment = TrackerEnvironment;
exports.VariableSplitStorage = VariableSplitStorage;
exports.VariableStorageCoordinator = VariableStorageCoordinator;
exports.addSourceTrace = addSourceTrace;
exports.bootstrap = bootstrap;
exports.clearTrace = clearTrace;
exports.copyTrace = copyTrace;
exports.detectPfx = detectPfx;
exports.getDefaultLogSourceName = getDefaultLogSourceName;
exports.getErrorMessage = getErrorMessage;
exports.getTrace = getTrace;
exports.isTransientErrorObject = isTransientErrorObject;
exports.isValidationError = isValidationError;
exports.isWritableStorage = isWritableStorage;
exports.requestCookieHeader = requestCookieHeader;
exports.requestCookies = requestCookies;
exports.serializeLogMessage = serializeLogMessage;
exports.withTrace = withTrace;

import { isConsentEvent, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, DataUsage, isTrackedEvent, isOrderEvent, isCartEvent, TypeResolver, ValidationError, isPassiveEvent, JsonSchemaAdapter, CORE_SCHEMA_NS, DataPurposes, DataClassification, consumeQueryResults, toVariableResultPromise, VariableResultStatus, isVariableResult, extractKey, filterKeys, VariableServerScope, formatVariableResult, VALIDATION_ERROR_SYMBOL, formatValidationErrors, formatVariableKey, isTransientError, isSuccessResult, filterRangeValue } from '@tailjs/types';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m6ocby49" ;
const SCOPE_INFO_KEY = "@info";
const CONSENT_INFO_KEY = "@consent";
const SESSION_REFERENCE_KEY = "@session_reference";
const CLIENT_STORAGE_PREFIX = "_tail:";
const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";
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
const formatError = (error, includeStackTrace)=>!error ? "(unspecified error)" : includeStackTrace && error.stack ? `${formatError(error, false)}\n${error.stack}` : error.message ? `${error.name}: ${error.message}` : "" + error;
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
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
/** Minify friendly version of `null`. */ const nil = null;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator$1 = Symbol.iterator;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolAsyncIterator = Symbol.asyncIterator;
const ifDefined = (value, resultOrProperty)=>isFunction(resultOrProperty) ? value !== undefined$1 ? resultOrProperty(value) : undefined$1 : (value === null || value === void 0 ? void 0 : value[resultOrProperty]) !== undefined$1 ? value : undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isObject = /*#__PURE__*/ (value)=>value && typeof value === "object";
const isPlainObject = /*#__PURE__*/ (value)=>(value === null || value === void 0 ? void 0 : value.constructor) === Object;
const isFunction = /*#__PURE__*/ (value)=>typeof value === "function";
const isPromiseLike = /*#__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value["then"]);
const isIterable = /*#__PURE__*/ (value, acceptStrings = false)=>!!((value === null || value === void 0 ? void 0 : value[symbolIterator$1]) && (typeof value !== "string" || acceptStrings));
const testFirstLast = (s, first, last)=>s[0] === first && s[s.length - 1] === last;
const isJsonString = (value)=>isString(value) && (testFirstLast(value, "{", "}") || testFirstLast(value, "[", "]"));
/**
 * Clones a value by its JSON representation.
 */ const jsonClone = (value)=>value == null ? null : JSON.parse(JSON.stringify(value));
const isJsonObject = (value)=>isPlainObject(value);
let stopInvoked$1 = false;
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
            if (stopInvoked$1) {
                stopInvoked$1 = false;
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
        if (stopInvoked$1) {
            stopInvoked$1 = false;
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
const createIterator = (source, projection, start, end)=>source == null ? [] : !projection && isArray(source) ? filterArray(source) : source[symbolIterator$1] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : isObject(source) ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        start = start < 0 ? source.length + start : start !== null && start !== void 0 ? start : 0;
        end = end < 0 ? source.length + end : end !== null && end !== void 0 ? end : source.length;
        for(; start < end && !stopInvoked$1; start++){
            let value = source[start];
            if ((projection ? value = projection(value, i++) : value) != null) {
                mapped.push(value);
            }
        }
        stopInvoked$1 = false;
        return mapped;
    }
    return source != null ? array2(project(source, projection, start, end)) : undefined$1;
};
const mapAsync = async (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    const mapped = [];
    await forEachAsync(source, async (item)=>(item = await projection(item)) != null && mapped.push(item));
    return mapped;
};
const concat = (...items)=>{
    let merged;
    forEach(items.length === 1 ? items[0] : items, (item)=>item != null && (merged !== null && merged !== void 0 ? merged : merged = []).push(...array2(item)));
    return merged;
};
const forEachArray = (source, action, start, end)=>{
    let returnValue;
    let i = 0;
    start = start < 0 ? source.length + start : start !== null && start !== void 0 ? start : 0;
    end = end < 0 ? source.length + end : end !== null && end !== void 0 ? end : source.length;
    for(; start < end; start++){
        var _action;
        if (source[start] != null && (returnValue = (_action = action(source[start], i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked$1)) {
            stopInvoked$1 = false;
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
        if (value != null && (returnValue = (_action = action(value, i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked$1)) {
            stopInvoked$1 = false;
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
        ], i++)) !== null && _action !== void 0 ? _action : returnValue, stopInvoked$1) {
            stopInvoked$1 = false;
            break;
        }
    }
    return returnValue;
};
const forEachInternal = (source, action, start, end)=>{
    if (source == null) return;
    if (isArray(source)) return forEachArray(source, action, start, end);
    if (start === undefined$1) {
        if (source[symbolIterator$1]) return forEachIterable(source, action);
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
        if (stopInvoked$1) {
            stopInvoked$1 = false;
            break;
        }
    }
    return returnValue;
};
/** Fast version of `obj`. */ const fromEntries = (source, map)=>{
    if (source == null) return undefined$1;
    const result = {};
    if (map) {
        let i = 0;
        let value;
        for(const key in source){
            (value = map([
                key,
                source[key]
            ], i++)) && (result[value[0]] = value[1]);
        }
    } else {
        for (const entry of source){
            entry && (result[entry[0]] = entry[1]);
        }
    }
    return result;
};
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
const unwrap = (value)=>isFunction(value) ? value() : value;
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
const ellipsis = (text, maxLength, debug = false)=>text && (text.length > maxLength ? debug ? `${text.slice(0, maxLength)}... [and ${text.length - maxLength} more]` : text.slice(0, maxLength - 1) + "…" : text);
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
    ]) || isArray(delimiters)) && forEach2(delimiters, (delim)=>(split = parts[1].split(delim)).length > 1 ? stop2(split) : undefined$1) || (parts[1] ? [
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
    const parameters = map2(query === null || query === void 0 ? void 0 : (_query_match = query.match(/(?:^.*?\?|^)([^#]*)/)) === null || _query_match === void 0 ? void 0 : (_query_match_ = _query_match[1]) === null || _query_match_ === void 0 ? void 0 : _query_match_.split(separator), (part)=>{
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
        ] : skip2;
    });
    const results = obj2(group2(parameters, false), ([key, values])=>[
            key,
            delimiters !== false ? values.length > 1 ? concat2(values) : values[0] : values.join(",")
        ]);
    return results ? (results[parameterListSymbol] = parameters, results) : results;
};
let matchProjection;
let collected;
/**
 * Matches a regular expression against a string and projects the matched parts, if any.
 */ const match = (s, regex, selector, collect = false)=>{
    var _s_match;
    return (s !== null && s !== void 0 ? s : regex) == nil ? undefined$1 : selector ? (matchProjection = undefined$1, collect ? (collected = [], match(s, regex, (...args)=>(matchProjection = selector(...args)) != null && collected.push(matchProjection))) : s.replace(regex, (...args)=>matchProjection = selector(...args)), matchProjection) : (_s_match = s.match(regex)) !== null && _s_match !== void 0 ? _s_match : undefined$1;
};
/**
 * Better minifyable version of `String`'s `replace` method that allows a null'ish parameter.
 */ const replace = (s, match, replaceValue)=>{
    var _s_replace;
    return (_s_replace = s === null || s === void 0 ? void 0 : s.replace(match, replaceValue)) !== null && _s_replace !== void 0 ? _s_replace : s;
};
let stopInvoked = false;
const skip2 = Symbol();
const stop2 = (value)=>(stopInvoked = true, value);
// #region region_iterator_implementations
const forEachSymbol = Symbol();
const asyncIteratorFactorySymbol = Symbol();
const symbolIterator = Symbol.iterator;
// Prototype extensions are assigned on-demand to exclude them when tree-shaking code that are not using any of the iterators.
let ensureForEachImplementations = (returnValue)=>{
    ensureForEachImplementations = (func)=>func; // Already initialized next time this is called;
    const forEachIterable = ()=>(target, projection, mapped, seed, context)=>{
            let projected, i = 0;
            for (const item of target){
                if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip2) {
                    if (projected === stop2) {
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
    Array.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        let projected, item;
        for(let i = 0, n = target.length; i < n; i++){
            item = target[i];
            if ((projected = projection ? projection(item, i, seed, context) : item) !== skip2) {
                if (projected === stop2) {
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
    Object.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
        if (target[symbolIterator]) {
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
            if ((projected = projection ? projection(item, i++, seed, context) : item) !== skip2) {
                if (projected === stop2) {
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
    Object.prototype[asyncIteratorFactorySymbol] = function() {
        if (this[symbolIterator] || this[symbolAsyncIterator]) {
            if (this.constructor === Object) {
                var _this_symbolAsyncIterator;
                return (_this_symbolAsyncIterator = this[symbolAsyncIterator]()) !== null && _this_symbolAsyncIterator !== void 0 ? _this_symbolAsyncIterator : this[symbolIterator]();
            }
            const proto = Object.getPrototypeOf(this);
            var _proto_symbolAsyncIterator;
            proto[asyncIteratorFactorySymbol] = (_proto_symbolAsyncIterator = proto[symbolAsyncIterator]) !== null && _proto_symbolAsyncIterator !== void 0 ? _proto_symbolAsyncIterator : proto[symbolIterator];
            return this[asyncIteratorFactorySymbol]();
        }
        return iterateEntries(this);
    };
    for (const proto of [
        Map.prototype,
        WeakMap.prototype,
        Set.prototype,
        WeakSet.prototype,
        // Generator function
        Object.getPrototypeOf(function*() {})
    ]){
        proto[forEachSymbol] = forEachIterable();
        proto[asyncIteratorFactorySymbol] = proto[symbolIterator];
    }
    Number.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(range2(target), projection, mapped, seed, context);
    Number.prototype[asyncIteratorFactorySymbol] = range2;
    Function.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(traverse2(target), projection, mapped, seed, context);
    Function.prototype[asyncIteratorFactorySymbol] = traverse2;
    return returnValue;
};
// #endregion
function* range2(length = this) {
    for(let i = 0; i < length; i++)yield i;
}
function* traverse2(next = this) {
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
let forEach2 = (source, projection, seed, context)=>(forEach2 = ensureForEachImplementations((source, projection, seed, context = source)=>source ? source[forEachSymbol](source, projection, undefined, seed, context) : source == null ? source : undefined))(source, projection, seed, context);
let map2 = (source, projection, target = [], seed, context = source)=>(map2 = ensureForEachImplementations((source, projection, target = [], seed, context = source)=>!source && source !== 0 && source !== "" ? source == null ? source : undefined : source[forEachSymbol](source, projection, target, seed, context)))(source, projection, target, context, seed);
/** Creates an array with the parameters that are not false'ish */ const truish2 = (...values)=>filter2(values.length === 1 ? values[0] : values, false);
let filter2 = (items, filter = true, invert = false)=>map2(items, filter === true ? (item)=>item !== null && item !== void 0 ? item : skip2 : !filter ? (item)=>item || skip2 : filter.has ? (item)=>item == null || filter.has(item) === invert ? skip2 : item : (item, index, prev)=>!filter(item, index, prev) === invert ? item : skip2);
const group2 = (source, projection, map)=>{
    var _groups, _kv_;
    if (projection != null && typeof projection !== "function") {
        [projection, map] = [
            undefined,
            projection
        ];
    }
    let groups, kv;
    forEach2(source, map !== false ? (groups = new Map(), (item, index, prev)=>{
        kv = projection ? projection(item, index, prev) : item;
        if (kv[0] !== undefined) {
            get2(groups, kv[0], ()=>[]).push(kv[1]);
        }
    }) : (groups = {}, (item, index, prev)=>{
        var _;
        return (kv = projection ? projection(item, index, prev) : item) && kv[0] !== undefined && ((_ = (_groups = groups)[_kv_ = kv[0]]) !== null && _ !== void 0 ? _ : _groups[_kv_] = []).push(kv[1]);
    }));
    return groups;
};
let forEachAwait2 = (source, projection, seed, context)=>(forEachAwait2 = ensureForEachImplementations((source, projection, seed, context)=>iterateAsync2(source, projection, undefined, seed, context)))(source, projection, seed, context);
const iterateAsync2 = async (source, projection, mapped, seed, context)=>{
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
        if ((projected = await (projection ? projection(item, i++, seed, context) : item)) !== skip2) {
            if (projected === stop2) {
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
const distinct2 = (source)=>source instanceof Set ? source : source == null ? source : new Set(source[symbolIterator] && typeof source !== "string" ? source : [
        source
    ]);
const iterable2 = (source)=>source === void 0 ? [] : (source === null || source === void 0 ? void 0 : source[symbolIterator]) && typeof source !== "string" ? source : [
        source
    ];
const array2 = (source)=>source == null ? source : isArray(source) ? source : source[symbolIterator] && typeof source !== "string" ? [
        ...source
    ] : [
        source
    ];
const some2 = (source, predicate)=>forEach2(source, (item, index, prev)=>(predicate ? predicate(item, index, prev, source) : item) ? stopInvoked = true : item) === true;
const concat2 = (arg0, ...other)=>{
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
const keys2 = Object.keys;
const hasKeys2 = (obj)=>!!keyCount2(obj, true);
const keyCount2 = (obj, some = false)=>{
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
let ensureAssignImplementations = (returnValue)=>{
    ensureAssignImplementations = (returnValue)=>returnValue;
    for (const { prototype } of [
        Map,
        WeakMap
    ]){
        prototype[setSymbol] = function(key, value) {
            return value === void 0 ? this.delete(key) : this.get(key) !== value && !!this.set(key, value);
        };
        prototype[getSymbol] = prototype.get;
    }
    for (const { prototype } of [
        Set,
        WeakSet
    ]){
        prototype[setSymbol] = function(key, value, add = false) {
            return value || add && value === void 0 ? this.has(key) ? false : !!this.add(key) : this.delete(key);
        };
        prototype[getSymbol] = prototype.has;
        prototype[pushSymbol] = function(keys) {
            for (const key of keys)key !== void 0 && this.add(key);
            return this;
        };
    }
    Array.prototype[pushSymbol] = function(values) {
        this.push(...values);
        return this;
    };
    for (const { prototype } of [
        Object,
        Array
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
    return returnValue;
};
let get2 = (source, key, initialize)=>(get2 = ensureAssignImplementations((source, key, initialize)=>{
        if (source == null) return source;
        let value = source[getSymbol](key);
        if (value === void 0 && (value = typeof initialize === "function" ? initialize() : initialize) !== void 0) {
            if (value === null || value === void 0 ? void 0 : value.then) return value.then((value)=>value === void 0 ? value : source[setSymbol](key, value));
            source[setSymbol](key, value);
        }
        return value;
    }))(source, key, initialize);
let add2 = (target, key, value)=>(add2 = ensureAssignImplementations((target, key, value)=>(target === null || target === void 0 ? void 0 : target[setSymbol](key, value, true)) === true))(target, key, value);
const obj2 = (source, projection)=>{
    const target = {};
    forEach2(source, projection ? (item, index, seed)=>(item = projection(item, index, seed)) && (typeof item !== "symbol" || item !== skip2 && item !== stop2) ? target[item[0]] = item[1] : item : (item)=>item && (typeof item !== "symbol" || item !== skip2 && item !== stop2) ? target[item[0]] = item[1] : item);
    return target;
};
const merge2 = (target, sources, options = {})=>{
    if (target == null) {
        return target;
    }
    const { deep = true, overwrite = true, nulls = false } = options;
    for (const source of iterable2(sources)){
        forEach2(source, (kv)=>{
            if (!kv) return;
            const [key, value] = kv;
            const current = target[key];
            if (nulls ? current == null : current === void 0) {
                target[key] = value;
                return;
            }
            if (deep && (value === null || value === void 0 ? void 0 : value.constructor) === Object && (current === null || current === void 0 ? void 0 : current.constructor) === Object) {
                merge2(current, value, options);
            } else if (overwrite) {
                target[key] = value;
            }
        });
    }
    return target;
};
const isEmptyString = (s)=>s == null || typeof s === "boolean" || s.toString() === "";
const join2 = (source, arg1, arg2)=>source == null ? source : !isIterable(source) ? isEmptyString(source) ? "" : source.toString() : filter2(typeof arg1 === "function" ? map2(source, arg1) : (arg2 = arg1, source), isEmptyString, true).join(arg2 !== null && arg2 !== void 0 ? arg2 : "");
const indent2 = (text, indent = "  ")=>{
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
        consent: DataUsage.clone(tracker.consent),
        expiredDeviceSessionId: tracker._expiredDeviceSessionId,
        clientIp: (_tracker_clientIp = tracker.clientIp) !== null && _tracker_clientIp !== void 0 ? _tracker_clientIp : undefined,
        anonymousSessionId: tracker.session.anonymousSessionId,
        collision: tracker._expiredDeviceSessionId ? true : undefined,
        anonymous: tracker.session.anonymous
    };
};
class TrackerCoreEvents {
    async patch(events, next, tracker) {
        if (!tracker.session || !tracker.sessionId) {
            // Abort the pipeline and do nothing if there is no session.
            return [];
        }
        let currentTime = now();
        // Assign IDs and adjust timestamps.
        for (const event of events){
            if (event.timestamp) {
                if (event.timestamp > 0) {
                    continue;
                }
                event.timestamp = currentTime + event.timestamp;
            } else {
                event.timestamp = currentTime;
            }
            event.id = await tracker.env.nextId();
        }
        // Finish the pipeline to get the final events.
        events = await next(events);
        for (const event of events){
            event.timestamp < currentTime && (currentTime = event.timestamp);
        }
        // Apply updates via patches. This enables multiple requests for the same session to execute concurrently.
        let sessionPatches = [];
        let devicePatches = [];
        const flushUpdates = async ()=>{
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
                tracker.device && {
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
            if (isConsentEvent(event)) {
                await tracker.updateConsent(event.consent);
            } else if (isResetEvent(event)) {
                const resetEvent = event;
                if (tracker.session.userId) {
                    // Fake a sign out event if the user is currently authenticated.
                    events.push(event);
                    event = {
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
        _define_property$c(this, "configuration", void 0);
        _define_property$c(this, "id", void 0);
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
    patch(events, next) {
        return next(events.map((event)=>isOrderEvent(event) ? normalizeOrder(event) : isCartEvent(event) ? normalizeCartEventData(event) : event));
    }
    constructor(){
        _define_property$b(this, "id", "commerce");
    }
}

function bootstrap({ host, endpoint = "./_t.js", schemas, cookies, extensions, json, encryptionKeys, debugScript, environmentTags, defaultConsent }) {
    var _map2;
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        extensions: (_map2 = map2(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension)) !== null && _map2 !== void 0 ? _map2 : [],
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
    "namespace": "urn:tailjs:core",
    "readonly": false,
    "visibility": "public",
    "classification": "anonymous",
    "purposes": {},
    "name": "urn:tailjs:core",
    "version": "0.94.3",
    "types": {
        "ScopeInfo": {
            "version": "0.94.3",
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
                }
            }
        },
        "SessionInfo": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.94.3"
            ],
            "properties": {
                "id": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "trusted-only",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "deviceId": {
                    "primitive": "string",
                    "description": "Used to handle race conditions. When multiple session are created from concurrent requests, the winning session contains the device ID.",
                    "visibility": "trusted-only",
                    "readonly": false,
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#DataUsage@0.94.3"
            ],
            "properties": {}
        },
        "DataUsage": {
            "version": "0.94.3",
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
                    "reference": "urn:tailjs:core#DataPurposes@0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.94.3"
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
                    "reference": "urn:tailjs:core#EventMetadata@0.94.3",
                    "description": "These properties are used to track the state of the event as it gets collected, and is not persisted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "session": {
                    "reference": "urn:tailjs:core#Session@0.94.3",
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
            "version": "0.94.3",
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
                        "reference": "urn:tailjs:core#Tag@0.94.3"
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
            "version": "0.94.3",
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
                    "description": "How strongly the tags relates to the target.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "EventMetadata": {
            "version": "0.94.3",
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
            "version": "0.94.3",
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
                    "reference": "urn:tailjs:core#UserConsent@0.94.3",
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
            ],
            "properties": {
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.94.3"
            ],
            "properties": {
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedContent@0.94.3"
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
                    "reference": "urn:tailjs:core#Rectangle@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.94.3",
                "urn:tailjs:core#ExternalReference@0.94.3",
                "urn:tailjs:core#Personalizable@0.94.3"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "personalization": {
                    "item": {
                        "reference": "urn:tailjs:core#Personalization@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.94.3"
            ],
            "properties": {
                "source": {
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
                    "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.source }  corresponding to the test, but have different  {@link  Personalization.variable  } s.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variables": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationVariable@0.94.3"
                    },
                    "description": "Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variants": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationVariant@0.94.3"
                    },
                    "description": "The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.\n\nTo represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "PersonalizationVariable": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
            ],
            "properties": {
                "value": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "PersonalizationVariant": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
            ],
            "properties": {
                "sources": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationSource@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
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
        "ActivatedContent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.94.3"
            ],
            "properties": {
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3",
                "urn:tailjs:core#Tagged@0.94.3"
            ],
            "properties": {
                "commerce": {
                    "reference": "urn:tailjs:core#CommerceData@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CommerceData": {
            "version": "0.94.3",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Position@0.94.3",
                "urn:tailjs:core#Size@0.94.3"
            ],
            "properties": {}
        },
        "Position": {
            "version": "0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Rectangle@0.94.3"
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
            "version": "0.94.3",
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
                    "reference": "urn:tailjs:core#Rectangle@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#FormField@0.94.3"
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
            "version": "0.94.3",
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
                    "description": "The value of the form field. Be careful with this one.\n\nThe default is only to track whether checkboxes are selected. Otherwise, field values are tracked if the boolean tracking variable `--track-form-values` is set in the input field's scope.",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#Position@0.94.3"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ElementInfo@0.94.3"
            ],
            "properties": {
                "component": {
                    "reference": "urn:tailjs:core#Component@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentViewEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#Domain@0.94.3",
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
            "version": "0.94.3",
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
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                },
                "host": {
                    "primitive": "string",
                    "required": true,
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {}
                }
            }
        },
        "ScrollEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#SearchFilter@0.94.3"
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
                        "reference": "urn:tailjs:core#SearchResult@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.94.3"
            ],
            "properties": {
                "references": {
                    "item": {
                        "reference": "urn:tailjs:core#ExternalReference@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3",
                "urn:tailjs:core#SessionScoped@0.94.3"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.94.3"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type@0.94.3",
                    "description": "Screen",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "SessionScoped": {
            "version": "0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type@0.94.3",
                    "description": "Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
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
                    "reference": "urn:tailjs:core#Domain@0.94.3",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type@0.94.3",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
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
                    "reference": "urn:tailjs:core#View@0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.94.3",
                "urn:tailjs:core#Personalizable@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3",
                "urn:tailjs:core#SessionScoped@0.94.3"
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#UserConsent@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                }
            }
        },
        "CommerceEvent": {
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
            ],
            "properties": {}
        },
        "CartUpdatedEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3",
                "urn:tailjs:core#CommerceEvent@0.94.3",
                "urn:tailjs:core#CartEventData@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity@0.94.3",
                "urn:tailjs:core#ExternalUse@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceData@0.94.3"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
                    "description": "The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  {@link  UserInteractionEvent }  context.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ExternalUse": {
            "version": "0.94.3",
            "description": "Types and interfaces extending this marker interface directly must have a concrete type that can be instantiated in code-generation scenarios because they are referenced directly outside of the types package.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {}
        },
        "OrderEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.94.3",
                "urn:tailjs:core#Order@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.94.3"
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
                        "reference": "urn:tailjs:core#OrderLine@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity@0.94.3",
                "urn:tailjs:core#Tagged@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.94.3",
                "urn:tailjs:core#Order@0.94.3"
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
            ],
            "properties": {}
        },
        "SignInEvent": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
            ],
            "properties": {}
        },
        "ImpressionTextStats": {
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type@0.94.3",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.94.3",
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
            "version": "0.94.3",
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3",
                "urn:tailjs:core#SystemEvent@0.94.3"
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
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.94.3"
            ],
            "properties": {
                "track": {
                    "reference": "urn:tailjs:core#TrackingSettings@0.94.3",
                    "description": "Settings for how the component will be tracked.\n\nThese settings are not tracked, that is, this property is stripped from the data sent to the server.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "TrackingSettings": {
            "version": "0.94.3",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "promote": {
                    "primitive": "boolean",
                    "description": "Always include in  {@link  UserInteractionEvent.components } , also if it is a parent component. By default only the closest component will be included.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-promote`. CSS: `--track-promote: 1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "secondary": {
                    "primitive": "boolean",
                    "description": "The component will only be tracked with the closest non-secondary component as if the latter had the  {@link  promote }  flag.\n\nThis does not apply to impression tracking.\n\nNot inherited by child components.\n\nHTML attribute: `track-secondary`. \\ CSS: `--track-secondary: 1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "region": {
                    "primitive": "boolean",
                    "description": "Track the visible region occupied by the component or content.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-region`. \\ CSS: `--track-region: 1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "primitive": "boolean",
                    "description": "Track clicks. Note that clicks are always tracked if they cause navigation.\n\nInherited by child components (also if specified on non-component DOM element).\n\nHTML attribute: `track-clicks`. CSS: `--track-clicks: 1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "impressions": {
                    "primitive": "boolean",
                    "description": "Track impressions, that is, when the component becomes visible in the user's browser for the first time. This goes well with  {@link  region } .\n\nNot inherited by child components.\n\nHTML attribute: `track-impressions`. CSS: `--track-impressions: 1/yes/true`.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "UserAgentEvent_timezone_type": {
            "version": "0.94.3",
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
            }
        },
        "UserAgentEvent_screen_type": {
            "version": "0.94.3",
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
            }
        },
        "ViewEvent_utm_type": {
            "version": "0.94.3",
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
            }
        },
        "ViewEvent_externalReferrer_type": {
            "version": "0.94.3",
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
                    "reference": "urn:tailjs:core#Domain@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ImpressionEvent_regions_type": {
            "version": "0.94.3",
            "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "top": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.94.3",
                    "description": "The top 25 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "middle": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.94.3",
                    "description": "The middle 25 - 75 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "bottom": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.94.3",
                    "description": "The bottom 25 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent_patch": {
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#FormEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
                        "reference": "urn:tailjs:core#FormField@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ComponentClickEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ComponentClickIntentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "item": {
                        "reference": "urn:tailjs:core#Position@0.94.3"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ComponentViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#NavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
                    "reference": "urn:tailjs:core#Domain@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ScrollEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "offset": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#SearchEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
                        "reference": "urn:tailjs:core#SearchFilter@0.94.3"
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
                        "reference": "urn:tailjs:core#SearchResult@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#SessionStartedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#UserAgentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.94.3"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type@0.94.3",
                    "description": "Screen",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ViewEvent_patch": {
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type@0.94.3",
                    "description": "Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
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
                    "reference": "urn:tailjs:core#Domain@0.94.3",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type@0.94.3",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
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
                    "reference": "urn:tailjs:core#View@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#SessionLocationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#AnchorNavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ConsentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                    "reference": "urn:tailjs:core#UserConsent@0.94.3",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartUpdatedEvent_patch": {
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#CartUpdatedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.94.3",
                    "description": "The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a  {@link  UserInteractionEvent }  context.",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#OrderEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#OrderLine@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#CartAbandonedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#OrderLine@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#OrderConfirmedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                }
            }
        },
        "OrderCancelledEvent_patch": {
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#OrderCancelledEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#OrderCompletedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                }
            }
        },
        "PaymentAcceptedEvent_patch": {
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#PaymentAcceptedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#PaymentRejectedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#SignInEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#SignOutEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ImpressionEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.94.3"
                    },
                    "description": "Relevant components and content in the scope of the activated element.",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.94.3",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.94.3",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.94.3",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.94.3",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type@0.94.3",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.94.3",
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
            "version": "0.94.3",
            "description": "Patch type for urn:tailjs:core#ResetEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.94.3"
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
                "reference": "urn:tailjs:core#SessionInfo@0.94.3",
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
                "reference": "urn:tailjs:core#UserConsent@0.94.3",
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
                "reference": "urn:tailjs:core#DeviceInfo@0.94.3",
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
    main: {
        text: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,y,m,w,k,S,T,I;function j(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var C=(e,t=e=>Error(e))=>{throw ea(e=e2(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ed(e)&&ed(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},U=(e,t,...r)=>e===t||0<r.length&&r.some(t=>U(e,t)),F=(e,t)=>null!=e?e:C(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),q=(e,t=!0,r)=>{try{return e()}catch(e){return ep(t)?eu(e=t(e))?C(e):e:et(t)?console.error(t?C(e):e):t}finally{null!=r&&r()}};class z extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),j(this,\"_action\",void 0),j(this,\"_result\",void 0),this._action=e}}var R=e=>new z(async()=>e2(e)),P=async(e,t=!0,r)=>{try{return await e2(e)}catch(e){if(!et(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,B=e=>!!e,D=e=>e===K,J=void 0,L=Number.MAX_SAFE_INTEGER,V=!1,K=!0,H=()=>{},G=e=>e,X=e=>null!=e,Z=Symbol.iterator,Y=Symbol.asyncIterator,Q=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:J,ee=(e,t)=>ep(t)?e!==J?t(e):J:(null==e?void 0:e[t])!==J?e:J,et=e=>\"boolean\"==typeof e,er=Q(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||J))),en=e=>e!==V,ei=e=>\"number\"==typeof e,ea=e=>\"string\"==typeof e,el=Q(ea,e=>null==e?void 0:e.toString()),eo=Array.isArray,eu=e=>e instanceof Error,es=(e,t=!1)=>null==e?J:!t&&eo(e)?e:eh(e)?[...e]:[e],ed=e=>e&&\"object\"==typeof e,ev=e=>(null==e?void 0:e.constructor)===Object,ec=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ef=e=>\"symbol\"==typeof e,ep=e=>\"function\"==typeof e,eh=(e,t=!1)=>!(null==e||!e[Z]||\"string\"==typeof e&&!t),eg=e=>e instanceof Map,ey=e=>e instanceof Set,em=(e,t)=>null==e?J:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,eb=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ew=e=>ea(e)&&(eb(e,\"{\",\"}\")||eb(e,\"[\",\"]\")),ek=!1,eS=e=>(ek=!0,e),eT=e=>null==e?J:ep(e)?e:t=>t[e],eI=(e,t,r)=>(null!=t?t:r)!==J?(e=eT(e),null==t&&(t=0),null==r&&(r=L),(n,i)=>t--?J:r--?e?e(n,i):n:r):e,ex=e=>null==e?void 0:e.filter(X),eA=(e,t,r,n)=>null==e?[]:!t&&eo(e)?ex(e):e[Z]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),ek){ek=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===J?t:eI(t,r,n)):ed(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),ek){ek=!1;break}}}(e,eI(t,r,n)):eA(ep(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eE=(e,t,r,n)=>eA(e,t,r,n),eN=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Z]||n&&ed(t))for(var a of i?eA(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eA(e,t,i,a),r+1,n,!1),eO=(e,t,r,n)=>{if(t=eT(t),eo(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!ek;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return ek=!1,a}return null!=e?tV(eE(e,t,r,n)):J},e$=(e,t,r,n)=>null!=e?new Set([...eE(e,t,r,n)]):J,e_=(e,t,r=1,n=!1,i,a)=>tV(eN(e,t,r,n,i,a)),ej=(...e)=>{var t;return eq(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...tV(e))),t},eC=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,ek)){ek=!1;break}return i},eM=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,ek)){ek=!1;break}return r},eU=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,ek){ek=!1;break}return r},eF=(e,t,r,n)=>{var i;if(null!=e){if(eo(e))return eC(e,t,r,n);if(r===J){if(e[Z])return eM(e,t);if(\"object\"==typeof e)return eU(e,t)}for(var a of eA(e,t,r,n))null!=a&&(i=a);return i}},eq=eF,ez=async(e,t,r,n)=>{var i,a;if(null==e)return J;for(a of eE(e,t,r,n))if(null!=(a=await a)&&(i=a),ek){ek=!1;break}return i},eR=(e,t)=>{if(null==e)return J;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eP=(e,t,r)=>{var n,i,a;return null==e?J:et(t)||r?(a={},eq(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>eq(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eR(eO(e,t?(e,r)=>ee(t(e,r),1):e=>ee(e,1)))},eW=(e,t,r,n,i)=>{var l=()=>ep(r)?r():r;return null!=(e=eF(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eB=(e,t,r,n)=>eO(e,(e,r)=>e&&null!=t&&t(e,r)?e:J,r,n),eJ=(e,...t)=>null==e?J:ei(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ei(i)&&e<i?i:e,J,t[2],t[3]),eV=(e,t,r,n)=>{var i;return null==e?J:ev(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:B))?i:eF(e,t?(e,r)=>!!t(e,r)&&eS(!0):()=>eS(!0),r,n))&&i},eK=(e,t=e=>e)=>{var r;return null!=(r=es(e))&&r.sort((e,r)=>t(e)-t(r)),e},eH=(e,t,r)=>(e.constructor===Object||eo(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eG=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=ep(r)?r():r)&&eH(e,t,n),n},eX=(e,...t)=>(eq(t,t=>eq(t,([t,r])=>{null!=r&&(ev(e[t])&&ev(r)?eX(e[t],r):e[t]=r)})),e),eZ=(e,t,r,n)=>{if(e)return null!=r?eH(e,t,r,n):(eq(t,t=>eo(t)?eH(e,t[0],t[1]):eq(t,([t,r])=>eH(e,t,r))),e)},eY=(e,t,r)=>{var n;return ec(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ec(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ev(e)&&delete e[t],e},eQ=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):!eG(e,t)&&(eH(e,t,!0),!0),e0=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eG(e,t),ec(e,\"delete\")?e.delete(t):delete e[t],r},e1=(e,t)=>{if(e)return eo(t)?(eo(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e1(e,t)):eo(e)?t<e.length?e.splice(t,1)[0]:void 0:e0(e,t)},e2=e=>ep(e)?e():e,e6=(e,t=-1)=>eo(e)?t?e.map(e=>e6(e,t-1)):[...e]:ev(e)?t?eP(e,([e,r])=>[e,e6(r,t-1)]):{...e}:ey(e)?new Set(t?eO(e,e=>e6(e,t-1)):e):eg(e)?new Map(t?eO(e,e=>[e[0],e6(e[1],t-1)]):e):e,e4=(e,...t)=>null==e?void 0:e.push(...t),e5=(e,...t)=>null==e?void 0:e.unshift(...t),e3=(e,t)=>{var r,i,a;if(e)return ev(t)?(a={},ev(e)&&(eq(e,([e,l])=>{if(l!==t[e]){if(ev(r=l)){if(!(l=e3(l,t[e])))return;[l,r]=l}else ei(l)&&ei(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e6(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e8=\"undefined\"!=typeof performance?(e=K)=>e?Math.trunc(e8(V)):performance.timeOrigin+performance.now():Date.now,e9=(e=!0,t=()=>e8())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},te=(e,t=0)=>{var e=ep(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=tl(!0).resolve(),c=e9(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await P(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!a,l)};function tt(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tr{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tn,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tt(this,\"_promise\",void 0),this.reset()}}class tn{then(e,t){return this._promise.then(e,t)}constructor(){var e;tt(this,\"_promise\",void 0),tt(this,\"resolve\",void 0),tt(this,\"reject\",void 0),tt(this,\"value\",void 0),tt(this,\"error\",void 0),tt(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===J||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var ta=(e,t)=>null==e||isFinite(e)?!e||e<=0?e2(t):new Promise(r=>setTimeout(async()=>r(await e2(t)),e)):C(`Invalid delay ${e}.`),tl=e=>new(e?tr:tn),tu=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},Q=()=>{var e,t=new Set;return[(r,n)=>{var i=tu(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},td=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tc=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?J:null!=n[t]?t:r?C(`The ${e} \"${t}\" is not defined.`):J,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},tf=Symbol(),tp=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(ea(t)?t=[t]:eo(t))&&tR(t,e=>1<(i=l[1].split(e)).length?tj(i):J)||(l[1]?[l[1]]:[]),l):J},th=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?J:tw(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&J,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):J,path:v,query:!1===t?c:c?tg(c,{...n,delimiters:t}):J,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":J),e}),tg=(e,t)=>ty(e,\"&\",t),ty=(e,t,{delimiters:r=!0,...n}={})=>{e=tP(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=tp(e,{...n,delimiters:!1===r?[]:!0===r?J:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:t_}),t=t4(tD(e,!1),([e,t])=>[e,!1!==r?1<t.length?tK(t):t[0]:t.join(\",\")]);return t&&(t[tf]=e),t},tm=(e,t)=>t&&null!=e?t.test(e):J,tb=(e,t,r)=>tw(e,t,r,!0),tw=(e,t,i,a=!1)=>null==(null!=e?e:t)?J:i?(r=J,a?(n=[],tw(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:J,tk=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tS=/\\z./g,tT=(e,t)=>(t=t7(e$(eB(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tS,tI={},tx=e=>e instanceof RegExp,tA=(r,n=[\",\",\" \"])=>{var i;return tx(r)?r:eo(r)?tT(eO(r,e=>null==(e=tA(e,n))?void 0:e.source)):et(r)?r?/./g:tS:ea(r)?null!=(i=(e=tI)[t=r])?i:e[t]=tw(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tT(eO(tE(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${t7(n,tk)}]`)),e=>e&&`^${t7(tE(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tk(tN(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):J},tE=(e,t,r=!0)=>null==e?J:r?tE(e,t,!1).filter(G):e.split(t),tN=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tO=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eZ(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},t$=!1,t_=Symbol(),tj=e=>(t$=!0,e),tC=Symbol(),tM=Symbol(),tU=Symbol.iterator,tF=e=>{tF=e=>e;var n,t=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==t_){if(a===tj)break;if(n=a,r&&r.push(a),t$){t$=!1;break}}return r||n},r=(Array.prototype[tC]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==t_){if(l===tj)break;if(n=l,r&&r.push(l),t$){t$=!1;break}}return r||n},t());for(n of(Object.prototype[tC]=(e,n,i,a,l)=>{if(e[tU])return(e.constructor===Object?r:Object.getPrototypeOf(e)[tC]=t())(e,n,i,a,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=n?n(u,s++,a,l):u)!==t_){if(u===tj)break;if(a=u,i&&i.push(u),t$){t$=!1;break}}return i||a},Object.prototype[tM]=function(){var t,e;return this[tU]||this[Y]?this.constructor===Object?null!=(e=this[Y]())?e:this[tU]():((e=Object.getPrototypeOf(this))[tM]=null!=(t=e[Y])?t:e[tU],this[tM]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[Map.prototype,WeakMap.prototype,Set.prototype,WeakSet.prototype,Object.getPrototypeOf(function*(){})]))n[tC]=t(),n[tM]=n[tU];return Number.prototype[tC]=(e,t,n,i,a)=>r(tq(e),t,n,i,a),Number.prototype[tM]=tq,Function.prototype[tC]=(e,t,n,i,a)=>r(tz(e),t,n,i,a),Function.prototype[tM]=tz,e};function*tq(e=this){for(var t=0;t<e;t++)yield t}function*tz(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tR=(e,t,r,n)=>(tR=tF((e,t,r,n=e)=>e?e[tC](e,t,void 0,r,n):null==e?e:void 0))(e,t,r,n),tP=(e,t,r=[],n,i=e)=>(tP=tF((e,t,r=[],n,i=e)=>e||0===e||\"\"===e?e[tC](e,t,r,n,i):null==e?e:void 0))(e,t,r,i,n),tW=(e,t=!0,r=!1)=>tP(e,!0===t?e=>null!=e?e:t_:t?t.has?e=>null==e||t.has(e)===r?t_:e:(e,n,i)=>!t(e,n,i)===r?e:t_:e=>e||t_),tB=(e,t,r=-1,n=[],i,a=e)=>tP(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tB(e,void 0,r-1,n,e),t_):e,n,i,a),tD=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tR(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t1(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tL=e=>void 0===e?[]:null!=e&&e[tU]&&\"string\"!=typeof e?e:[e],tV=e=>null==e||eo(e)?e:e[tU]&&\"string\"!=typeof e?[...e]:[e],tK=(e,...t)=>{var r,n;for(n of e=!t.length&&eh(e)?e:[e,...t])if(null!=n){if(eh(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},tH=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),tG=(e,t,r)=>tV(e).sort(\"function\"==typeof t?(e,n)=>tH(t(e),t(n),r):eo(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=tH(t[a](e),t[a](n),r);return i}:(e,t)=>tH(e,t,r):(e,r)=>tH(e,r,t)),tX=Object.keys,tZ=Symbol(),tY=Symbol(),tQ=Symbol(),t0=e=>{for(var{prototype:t}of(t0=e=>e,[Map,WeakMap]))t[tZ]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},t[tY]=t.get;for(var{prototype:t}of[Set,WeakSet])t[tZ]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},t[tY]=t.has,t[tQ]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for(var{prototype:t}of(Array.prototype[tQ]=function(e){return this.push(...e),this},[Object,Array]))t[tZ]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},t[tY]=function(e){return this[e]};return e},t1=(e,t,r)=>(t1=t0((e,t,r)=>{if(null==e)return e;var n=e[tY](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[tZ](t,r));e[tZ](t,n)}return n}))(e,t,r),t2=(e,t,r)=>(t2=t0((e,t,r)=>(e[tZ](t,r),r)))(e,t,r),t6=(e,...t)=>(t6=t0((e,...t)=>null==e?e:e[tQ](t)))(e,...t),t4=(e,t)=>{var r={};return tR(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==t_&&e!==tj)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==t_&&e!==tj)?r[e[0]]=e[1]:e),r},t5=(e,...t)=>(t5=t0((e,...t)=>((null==e?void 0:e.constructor)===Object?tR(t,t=>tR(t,t=>t&&(e[t[0]]=t[1]))):tR(t,t=>tR(t,t=>t&&e[tZ](t[0],t[1]))),e)))(e,...t),t3=(e,t,r={})=>{if(null!=e){var l,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(l of tL(t))tR(l,t=>{var o,u;t&&([t,o]=t,u=e[t],(a?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?t3(u,o,r):i&&(e[t]=o))})}return e},t8=(e,t)=>null==e?e:t4(t,t=>null!=e[t]||t in e?[t,e[t]]:t_),t9=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),t7=(e,t,r)=>null==e?e:eh(e)?tW(\"function\"==typeof t?tP(e,t):(r=t,e),t9,!0).join(null!=r?r:\"\"):t9(e)?\"\":e.toString(),re=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?re(tP(e,t),r,n):(i=[],n=tR(e,(e,t,r)=>t9(e)?t_:(r&&i.push(r),e.toString())),[t,o]=eo(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},rt=tc(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rr=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rn=t4(rr,e=>[e,e]),ri=(Object.freeze(eR(rr.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),ra=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rl_parse=function(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),ea(e)&&(e=e.split(\",\")),eo(e)){var i,n={};for(i of e)rn[i]?\"necessary\"!==i&&(n[i]=!0):r&&C(`The purpose name '${i}' is not defined.`);e=n}return t?(t=tX(e)).length?t:[\"necessary\"]:e},rl_test=function(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=ri(i,n))&&!t[ri(i,n)])return!1;if(e=ra(e,n),t=ra(t,n),r){for(var a in t)if(rn[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(rn[a]&&e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(rn[a]&&e[a]){if(t[a])return!0;l=!0}return!l},ro=(tc(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${re(rl_parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),ru={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rl_test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rl_parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=rt.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rl_parse(a,{validate:!1}))?e:{}}):t?ru.clone(t):{classification:\"anonymous\",purposes:{}}}},rs=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rv=Symbol(),rc=e=>void 0===e?\"undefined\":td(JSON.stringify(e),40,!0),rf=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rp=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rh=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rg=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,ry=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rm=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rc(t)+` ${r}.`}),rv),rb=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rb((t?parseInt:parseFloat)(e),t,!1),rw={},rr=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rw[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rw[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rm(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rf.test(e)&&!isNaN(+new Date(e))?e:rm(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rb(e,!1,!1)){if(!rb(e,!0,!1))return rm(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!rp.test(e)||isNaN(+new Date(e)))return rm(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rb(e,!0,!1)?+e:rm(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rb(e,!0,!1)?+e:rm(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rb(e,!1,!1)?e:rm(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rg.test(e)?e:rm(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rg.exec(e);return r?r[2]?e:rm(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rm(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rg.exec(e);return r?\"urn\"!==r[1]||r[2]?rm(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rm(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&ry.test(e)?e.toLowerCase():rm(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rm(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rh.exec(e))?void 0:r[1].toLowerCase():null)?r:rm(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rc(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rv&&e.length>d?rm(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rv||(null==c||c<=e)&&(null==f||e<=f)?e:rm(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rv)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+re(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rv||u.has(e)?e:rm(t,e,p)}(e=>e instanceof Set||null==e||new Set(e[tU]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tc(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rS=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rT=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rI=((x=a=a||{})[x.Success=200]=\"Success\",x[x.Created=201]=\"Created\",x[x.NotModified=304]=\"NotModified\",x[x.Forbidden=403]=\"Forbidden\",x[x.NotFound=404]=\"NotFound\",x[x.BadRequest=405]=\"BadRequest\",x[x.Conflict=409]=\"Conflict\",x[x.Error=500]=\"Error\",(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status)),rx=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rA(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rE=e=>{var t=rS(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${a[e.status]}.`:`${t} failed with status ${e.status} - ${a[e.status]}${r?` (${r})`:\"\"}.`};class rN extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rA(this,\"succeeded\",void 0),rA(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rx(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rx(e,!1)))?t:[]}}var rO=e=>!!e.callback,r$=e=>!!e.poll,r_=Symbol(),rj=(e,t,r,{poll:n,logCallbackError:i}={})=>{var l=eo(t)?t:[t],o=[],u=(async()=>{var s,d,u,v,t=await r(l.filter(e=>e)),a=[];for(u of l)u&&null!=(d=t.get(u))&&(d[r_]=u,rO(u)&&a.push([u,e=>!0===u.callback(e)]),r$(u))&&a.push([u,e=>{var t;return!rI(e,!1)||(t=!rI(e,!1)||u.poll(e.value,e[r_]===u,s),s=e.value,t)}]);for([u,v]of a)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${rS(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),s=async(r,n)=>{var v,c,f,i=await u,s=[],d=[];for(v of l)v?null==(f=i.get(v))?d.push(`No result for ${rS(v)}.`):!r||rx(f,n||\"set\"===e)?s.push(r&&f.status===a.NotFound?void 0:1<r?null!=(c=f.value)?c:void 0:f):d.push(rE(f)):s.push(void 0);if(d.push(...o),d.length)throw 10<d.length&&d.push(`\n(and ${d.splice(10).length} more...)`),new rN(s,d.join(\"\\n\"));return l===t?s:s[0]};return Object.assign(R(()=>s(1,!1)),{as:()=>s(1,!1),all:()=>s(0,!1),require:()=>s(1,!0),value:(e=!1)=>s(2,e),values:(e=!1)=>s(2,e)})},rC=e=>e&&\"string\"==typeof e.type,rM=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rU=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rF=(e,t)=>{var r;return t&&(!(o=e.get(l=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(l,t)},rq=(e,t=\"\",r=new Map)=>{if(e)return eh(e)?tR(e,e=>rq(e,t,r)):ea(e)?tw(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rU(n)+\"::\":\"\")+t+rU(i),value:rU(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rF(r,i)}):rF(r,e),r},rz=tc(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rR=tc(\"variable scope\",{...rz,...rr}),rP=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rW=e=>null!=e&&!!e.scope&&null!=rz.ranks[e.scope],rB=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rD=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rL=()=>()=>C(\"Not initialized.\"),rV=window,rK=document,rH=rK.body,rG=(e,t)=>!(null==e||!e.matches(t)),rX=L,rZ=(e,t,r=(e,t)=>rX<=t)=>{for(var n=0,i=V;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==K&&null!=a),K),n-1)!==V&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rK&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},rY=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||er(e);case\"n\":return parseFloat(e);case\"j\":return q(()=>JSON.parse(e),H);case\"h\":return q(()=>nJ(e),H);case\"e\":return q(()=>null==nV?void 0:nV(e),H);default:return eo(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:rY(e,t[0])):void 0}},rQ=(e,t,r)=>rY(null==e?void 0:e.getAttribute(t),r),r0=(e,t,r)=>rZ(e,(e,n)=>n(rQ(e,t,r))),r1=(e,t)=>null==(e=rQ(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),r2=e=>null==e?void 0:e.getAttributeNames(),r6=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,r4=e=>null!=e?e.tagName:null,r3=e=>({x:em(scrollX,e),y:em(scrollY,e)}),r8=(e,t)=>tN(e,/#.*$/,\"\")===tN(t,/#.*$/,\"\"),r9=(e,t,r=K)=>(s=r7(e,t))&&W({xpx:s.x,ypx:s.y,x:em(s.x/rH.offsetWidth,4),y:em(s.y/rH.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),r7=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=ne(e),{x:d,y:v}):void 0,ne=e=>e?(c=e.getBoundingClientRect(),u=r3(V),{x:em(c.left+u.x),y:em(c.top+u.y),width:em(c.width),height:em(c.height)}):void 0,nt=(e,t,r,n={capture:!0,passive:!0})=>(t=tV(t),tu(r,r=>tR(t,t=>e.addEventListener(t,r,n)),r=>tR(t,t=>e.removeEventListener(t,r,n)))),nn=()=>({...u=r3(K),width:window.innerWidth,height:window.innerHeight,totalWidth:rH.offsetWidth,totalHeight:rH.offsetHeight}),ni=new WeakMap,na=e=>ni.get(e),nl=(e,t=V)=>(t?\"--track-\":\"track-\")+e,no=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tR(r2(e),l=>{var o;return null!=(o=(f=t[0])[p=l])?o:f[p]=(a=V,!ea(n=tR(t[1],([t,r,n],i)=>tm(l,t)&&(a=void 0,!r||rG(e,r))&&eS(null!=n?n:l)))||(i=e.getAttribute(l))&&!er(i)||rq(i,tN(n,/\\-/g,\":\"),r),a)}),nu=()=>{},ns=(e,t)=>{if(h===(h=ng.tags))return nu(e,t);var r=e=>e?tx(e)?[[e]]:eh(e)?e_(e,r):[ev(e)?[tA(e.match),e.selector,e.prefix]:[tA(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tB(h,([,e])=>e,1))]];(nu=(e,t)=>no(e,n,t))(e,t)},nd=(e,t)=>t7(ej(r6(e,nl(t,K)),r6(e,nl(\"base-\"+t,K))),\" \"),nv={},nc=(e,t,r=nd(e,\"attributes\"))=>{var n;r&&no(e,null!=(n=nv[r])?n:nv[r]=[{},tb(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tA(r||n),,t])],t),rq(nd(e,\"tags\"),void 0,t)},nf=(e,t,r=V,n)=>null!=(r=null!=(r=r?rZ(e,(e,r)=>r(nf(e,t,V)),ep(r)?r:void 0):t7(ej(rQ(e,nl(t)),r6(e,nl(t,K))),\" \"))?r:n&&(g=na(e))&&n(g))?r:null,np=(e,t,r=V,n)=>\"\"===(y=nf(e,t,r,n))||(null==y?y:er(y)),nh=(e,t,r,n)=>e&&(null==n&&(n=new Map),nc(e,n),rZ(e,e=>{ns(e,n),rq(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},ng={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},ny=[],nm=[],nb=(e,t=0)=>e.charCodeAt(t),nk=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>ny[nm[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(nm[(16515072&t)>>18],nm[(258048&t)>>12],nm[(4032&t)>>6],nm[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nS=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=ny[nb(e,r++)]<<2|(t=ny[nb(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=ny[nb(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|ny[nb(e,r++)]);return a},nT={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nI=(e=256)=>e*Math.random()|0,nA={exports:{}},{deserialize:nE,serialize:nN}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i+=String.fromCharCode(a>>10|55296)+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nA.exports=n})(),(x=nA.exports)&&x.__esModule&&Object.prototype.hasOwnProperty.call(x,\"default\")?x.default:x),nO=\"$ref\",n$=(e,t,r)=>ef(e)?J:r?t!==J:null===t||t,n_=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=n$(t,n,r)?s(n):J)=>(n!==i&&(i!==J||eo(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||ep(e)||ef(e))return J;if(ed(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nO]||(e[nO]=l,u(()=>delete e[nO])),{[nO]:l};if(ev(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!eh(e)||e instanceof Uint8Array||(!eo(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return q(()=>{var r;return t?nN(null!=(r=s(e))?r:null):q(()=>JSON.stringify(e,J,n?2:0),()=>JSON.stringify(s(e),J,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nj=e=>{var t,r,n=e=>ed(e)?e[nO]&&(r=(null!=t?t:t=[])[e[nO]])?r:(e[nO]&&delete(t[e[nO]]=e)[nO],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ea(e)?q(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?q(()=>nE(e),()=>(console.error(\"Invalid message received.\",e),J)):e)},nC=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>ei(e)&&!0===r?e:u(e=ea(e)?new Uint8Array(tP(e.length,t=>255&e.charCodeAt(t))):t?q(()=>JSON.stringify(e),()=>JSON.stringify(n_(e,!1,n))):n_(e,!0,n),r),a=e=>null==e?J:q(()=>nj(e),J);return t?[e=>n_(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nI()));for(r=0,a[n++]=g(v^16*nI(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nI();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=et(t)?64:t,h(),[l,u]=nT[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?G:nk)(l(n_(e,!0,n))),e=>null!=e?nj(o(e instanceof Uint8Array?e:(r&&ew(e)?a:nS)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},tc=(nC(),nC(null,{json:!0,decodeJson:!0}),nC(null,{json:!0,prettify:!0}),tE(\"\"+rK.currentScript.src,\"#\")),rr=tE(\"\"+(tc[1]||\"\"),\";\"),nF=tc[0],nq=rr[1]||(null==(x=th(nF,{delimiters:!1}))?void 0:x.host),nz=e=>!(!nq||(null==(e=th(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nq))!==K),tc=(...e)=>tN(t7(e),/(^(?=\\?))|(^\\.(?=\\/))/,nF.split(\"?\")[0]),nP=tc(\"?\",\"var\"),nW=tc(\"?\",\"mnt\"),nB=(tc(\"?\",\"usr\"),Symbol()),[nD,nJ]=nC(),[nL,nV]=[rL,rL],nK=!0,[rr,nG]=Q(),nY=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:ea(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[nQ,n0]=Q(),[n1,n2]=Q(),n6=e=>n5!==(n5=e)&&n0(n5=!1,n9(!0,!0)),n4=e=>n3!==(n3=!!e&&\"visible\"===document.visibilityState)&&n2(n3,!e,n8(!0,!0)),n5=(nQ(n4),!0),n3=!1,n8=e9(!1),n9=e9(!1),n7=(nt(window,[\"pagehide\",\"freeze\"],()=>n6(!1)),nt(window,[\"pageshow\",\"resume\"],()=>n6(!0)),nt(document,\"visibilitychange\",()=>(n4(!0),n3&&n6(!0))),n0(n5,n9(!0,!0)),!1),ie=e9(!1),[,ir]=Q(),ii=te({callback:()=>n7&&ir(n7=!1,ie(!1)),frequency:2e4,once:!0,paused:!0}),x=()=>!n7&&(ir(n7=!0,ie(!0)),ii.restart()),il=(nt(window,[\"focus\",\"scroll\"],x),nt(window,\"blur\",()=>ii.trigger()),nt(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],x),x(),()=>ie()),io=0,iu=void 0,is=()=>(null!=iu?iu:rL())+\"_\"+id(),id=()=>(e8(!0)-(parseInt(iu.slice(0,-2),36)||0)).toString(36)+\"_\"+(++io).toString(36),ip=new Map,ih={id:iu,heartbeat:e8()},ig={knownTabs:new Map([[iu,ih]]),variables:new Map},[iy,im]=Q(),[ib,iw]=Q(),ik=rL,iS=(e,t=e8())=>{e=ip.get(ea(e)?e:rB(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iT=(...e)=>{var t=e8();return ix(tP(e,e=>(e.cache=[t],[rT(e),{...e,created:t,modified:t,version:\"0\"}])))},iI=e=>null!=(e=tP(e,e=>{var t,r;return e&&(t=rB(e[0]),(r=ip.get(t))!==e[1])?[t,e[1],r,e[0]]:t_}))?e:[],ix=e=>{var r,n,e=iI(e);null!=e&&e.length&&(r=e8(),tR(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),t5(ip,e),(n=tW(e,([,,,e])=>0<rR.compare(e.scope,\"tab\"))).length&&ik({type:\"patch\",payload:t4(n)}),iw(tP(e,([,e,t,r])=>[r,e,t]),ip,!0))},[,iE]=(rr((e,t)=>{nQ(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),iu=null!=(n=null==r?void 0:r[0])?n:e8(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),ip=new Map(tK(tW(ip,([,e])=>\"view\"===(null==e?void 0:e.scope)),tP(null==r?void 0:r[1],e=>[rB(e),e])))):sessionStorage.setItem(\"_tail:state\",e([iu,tP(ip,([,e])=>e&&\"view\"!==e.scope?e:t_)]))},!0),ik=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([iu,t,r])),localStorage.removeItem(\"_tail:state\"))},nt(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==iu||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||ik({type:\"set\",payload:[tP(ig.knownTabs),tP(ig.variables)]},e):\"set\"===a&&r.active?(ig.knownTabs=new Map(l[0]),ig.variables=new Map(l[1]),ip=new Map(l[1]),r.trigger()):\"patch\"===a?(o=iI(tP(l,([e,t])=>[rD(e),t])),t5(ig.variables,l),t5(ip,l),iw(tP(o,([,e,t,r])=>[r,e,t]),ip,!1)):\"tab\"===a&&(t2(ig.knownTabs,e,l),l)&&im(\"tab\",l,!1))});var r=te(()=>im(\"ready\",ig,!0),-25),n=te({callback(){var e=e8()-1e4;tR(ig.knownTabs,([t,r])=>r[0]<e&&t2(ig.knownTabs,t,void 0)),ih.heartbeat=e8(),ik({type:\"tab\",payload:ih})},frequency:5e3,paused:!0});nQ(e=>(e=>{ik({type:\"tab\",payload:e?ih:void 0}),e?(r.restart(),ik({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),Q()),[iN,iO]=Q(),i$=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?nV:nJ)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?nL:nD)([iu,e8()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e8())&&(l(),(null==(d=i())?void 0:d[0])===iu))return 0<t&&(a=setInterval(()=>l(),t/2)),P(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=tl(),[d]=nt(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[ta(null!=o?o:t),v],await Promise.race(e.map(e=>ep(e)?e():e)),d()}var e;null==o&&C(\"_tail:rq could not be acquired.\")}})(),i_=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&nK;var i,a,l=!1,o=r=>{var o=ep(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iE(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===J,i=e)),!l)&&(a=n?nL(i,!0):JSON.stringify(i))};if(!r)return i$(()=>ez(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?eS(C(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await ta(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?nV:JSON.parse)?void 0:l(t):J)&&iO(l),eS(l)):eS()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&C(\"Beacon send failed.\")},tc=[\"scope\",\"key\",\"entityId\",\"source\"],iC=[...tc,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iM=[...tc,\"value\",\"force\",\"ttl\",\"version\"],iU=new Map,iF=(e,t)=>{var r=te(async()=>{var e=tP(iU,([e,t])=>({...rD(e),result:[...t]}));e.length&&await l.get(e)},3e3),n=(e,t)=>t&&t1(iU,e,()=>new Set).add(t),l=(nQ((e,t)=>r.toggle(e,e&&3e3<=t),!0),ib(e=>tR(e,([e,t])=>(e=>{var t,r;e&&(t=rB(e),null!=(r=e1(iU,t)))&&r.size&&tR(r,r=>!0===r(e)&&n(t,r))})(t?{status:a.Success,...t}:{status:a.NotFound,...e}))),{get:r=>rj(\"get\",r,async r=>{r[0]&&!ea(r[0])||(o=r[0],r=r.slice(1)),null!=t&&t.validateKey(o);var u=new Map,s=[],d=tP(r,e=>{var t=iS(rB(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:a.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)u.set(e,{status:a.Success,...t});else{if(!rW(e))return[t8(e,iC),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rT(e),version:\"1\",created:v,modified:v,value:r,cache:[v,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},t6(s,[rT(r),r]),u.set(e,{status:a.Success,...r})):u.set(e,{status:a.NotFound,...rT(e)})}return t_}),v=e8(),o=d.length&&(null==(o=await i_(e,{variables:{get:tP(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=o.variables)?void 0:r.get)||[],f=[];return tR(o,(e,t)=>{var n,r;(null==e?void 0:e.status)===a.NotFound?null!=(r=null==(r=(n=d[t][1]).init)?void 0:r.call(n))&&f.push([n,{...rT(n),value:r}]):u.set(d[t][1],rP(e))}),f.length&&tR(await l.set(tP(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rP(e.status===a.Conflict?{...e,status:a.Success}:e))),s.length&&ix(s),u},{poll:(e,t)=>n(rB(e),t),logCallbackError:(e,t,r)=>nY(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rj(\"set\",r,async r=>{r[0]&&!ea(r[0])||(v=r[0],r=r.slice(1)),null!=t&&t.validateKey(v);for(var n=[],i=new Map,o=e8(),u=[],s=tP(r,e=>{var s,r,t=iS(rB(e));return rW(e)?((r=null==(s=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rT(e),created:null!=(r=null==t?void 0:t.created)?r:o,modified:o,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:s,cache:[o,e.ttl]})&&(r.cache=[o,null!=(s=e.ttl)?s:3e3]),i.set(e,r?{status:t?a.Success:a.Created,...r}:{status:a.Success,...rT(e)}),t6(n,[rT(e),r]),t_):e.patch?(u.push(e),t_):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[t8(e,iM),e])}),d=0;!d++||u.length;){var v,f=await l.get(tP(u,e=>rT(e))).all(),f=(tR(f,(e,t)=>{var r=u[t];rx(e,!1)?t6(s,[{...r,patch:void 0,value:u[t].patch(null==e?void 0:e.value),version:e.version},r]):i.set(r,e)}),u=[],s.length?F(null==(f=(await i_(e,{variables:{set:tP(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:f.set,\"No result.\"):[]);tR(f,(e,t)=>{var[,t]=s[t];d<=3&&t.patch&&((null==e?void 0:e.status)===a.Conflict||(null==e?void 0:e.status)===a.NotFound)?t6(u,t):i.set(t,rP(e))})}return n.length&&ix(n),i},{logCallbackError:(e,t,r)=>nY(\"Variables.set\",e,{operation:t,error:r})})});return iN(({variables:e})=>{e&&null!=(e=tK(tP(e.get,e=>rI(e)?e:t_),tP(e.set,e=>rx(e)?e:t_)))&&e.length&&ix(tP(e,e=>[rT(e),rx(e)?e:void 0]))}),l},iq=Symbol(),iR=Symbol(),iP=[.75,.33],iW=[.25,.33],iD=e=>tP(tG(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rS(e)}, ${rW(e)?\"client-side memory only\":ro(null==(e=e.schema)?void 0:e.usage)})`,V]:t_),iK=(e,t=\"A\"===r4(e)&&rQ(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),iH=(e,t=r4(e),r=np(e,\"button\"))=>r!==V&&(U(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&U(r1(e,\"type\"),\"button\",\"submit\")||r===K),iG=(e,t=!1)=>{var r;return{tagName:e.tagName,text:td((null==(r=rQ(e,\"title\"))?void 0:r.trim())||(null==(r=rQ(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?ne(e):void 0}},iZ=e=>{if(w)return w;ea(e)&&([r,e]=nJ(e),e=nC(r,{decodeJson:!0})[1](e)),eZ(ng,e),(e=>{nV===rL&&([nL,nV]=nC(e,{json:!e,prettify:!1}),nK=!!e,nG(nL,nV))})(e1(ng,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,y,i=e1(ng,\"key\"),a=null!=(e=null==(r=rV[ng.name])?void 0:r._)?e:[];if(eo(a))return l=[],o=[],u=(e,...t)=>{var r=K;o=eB(o,n=>q(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:w,unsubscribe:()=>r=V}),r},(e=>t=>nY(e,t))(n)))},s=[],v=iF(nP,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=is()),null==e.timestamp&&(e.timestamp=e8()),h=K,tR(l,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===V&&tj(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&C(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eX(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):C(\"Source event not queued.\")},o=async(r,n=!0,i)=>{var a;return r[0]&&!ea(r[0])||(a=r[0],r=r.slice(1)),i_(e,{events:r=tP(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eX(e,{metadata:{posted:!0}}),e[iq]){if(!1===e[iq](e))return;delete e[iq]}return eX(rs(e6(e),!0),{timestamp:e.timestamp-e8()})}),variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},u=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=tP(tV(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e4(l,e),null!=(r=t3(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:t_}),tR(l,e=>{}),!i)return o(e,!1,a);r?(n.length&&e5(e,...n.splice(0)),e.length&&await o(e,!0,a)):e.length&&e4(n,...e)};return te(()=>u([],{flush:!0}),5e3),n1((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tP(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),null!=t?t:t_}),n.length||e.length)&&u(ej(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,t,r)=>u(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var o=!1,s=()=>{o=!0};return i.set(e,e6(e)),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var a=i.get(e),[r,d]=null!=(r=e3(t(a,s),a))?r:[];if(r&&!M(d,a))return i.set(e,e6(d)),[l(e,r),o]}return[void 0,o]}),r&&u(e),s}}})(nP,d),f=null,p=0,g=h=V,y=!1,w=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||ea(e[0]))&&(t=e[0],e=e.slice(1)),ea(e[0])&&(r=e[0],e=ew(r)?JSON.parse(r):nJ(r));var t,n=V;if((e=eB(tB(e,e=>ea(e)?nJ(e):e),e=>{if(!e)return V;if(ay(e))ng.tags=eZ({},ng.tags,e.tagAttributes);else{if(am(e))return ng.disabled=e.disable,V;if(ak(e))return n=K,V;if(aE(e))return e(w),V}return g||aT(e)||aw(e)?K:(s.push(e),V)})).length||n){var r=eK(e,e=>aw(e)?-100:aT(e)?-50:aA(e)?-10:rC(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),q(()=>{var e=f[p];if(u(\"command\",e),h=V,rC(e))c.post(e);else if(aS(e))v.get(tV(e.get));else if(aA(e))v.set(tV(e.set));else if(aT(e))e4(o,e.listener);else if(aw(e))(t=q(()=>e.extension.setup(w),t=>nY(e.extension.id,t)))&&(e4(l,[null!=(r=e.priority)?r:100,t,e.extension]),eK(l,([e])=>e));else if(aE(e))e(w);else{var r,n,t,a=V;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:V)break;a||nY(\"invalid-command\",e,\"Loaded extensions:\",tP(l,e=>e[2].id))}},e=>nY(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(rV,ng.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+is(),events:c,variables:v,__isTracker:K})),configurable:!1,writable:!1}),ib((e,t,r)=>{ej(iD(tP(e,([,e])=>e||t_)),[[{[nB]:iD(tP(t,([,e])=>e||t_))},\"All variables\",K]])}),iy(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:L}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{w(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==k?void 0:k.clientId,languages:tP(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return W({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==rV?void 0:rV.screen,r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rV.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rV.devicePixelRatio,width:r,height:i,landscape:l}}):{})}));var i,l,a,r})(),e.hasUserAgent=!0),g=!0,s.length&&w(s),n(),y=!0,w(...tP(af,e=>({extension:e})),...a),w({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),w;C(`The global variable for the tracker \"${ng.name}\" is used for something else than an array of queued commands.`)},iY=()=>null==k?void 0:k.clientId,iQ={scope:\"shared\",key:\"referrer\"},i0=(e,t)=>{w.variables.set({...iQ,value:[iY(),e]}),t&&w.variables.get({scope:iQ.scope,key:iQ.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},i1=e9(),i2=e9(),i6=1,[i5,i3]=Q(),i8=e=>{var t=e9(e,i1),r=e9(e,i2),n=e9(e,il),i=e9(e,()=>i6);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},i9=i8(),[ae,at]=Q(),ar=(e,t)=>(t&&tR(ai,t=>e(t,()=>!1)),ae(e)),an=new WeakSet,ai=document.getElementsByTagName(\"iframe\");function al(e){if(e){if(null!=e.units&&U(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var au=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),as=e=>nh(e,t=>t!==e&&!!au(ni.get(t)),e=>(T=ni.get(e),(T=ni.get(e))&&e_(ej(T.component,T.content,T),\"tags\"))),ad=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&tP(I,e=>({...e,rect:void 0}))},av=(e,t=V,r)=>{var n,i,a,l=[],o=[],u=0;return rZ(e,e=>{var s,a,i=ni.get(e);i&&(au(i)&&(a=eB(tV(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==K||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eV(a,e=>null==(e=e.track)?void 0:e.region))&&ne(e)||void 0,s=as(e),i.content&&e5(l,...tP(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e5(o,...tP(a,e=>{var t;return u=eJ(u,null!=(t=e.track)&&t.secondary?1:2),ad({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nf(e,\"area\"))&&e5(o,a)}),l.length&&e4(o,ad({id:\"\",rect:n,content:l})),tR(o,e=>{ea(e)?e4(null!=i?i:i=[],e):(null==e.area&&(e.area=t7(i,\"/\")),e5(null!=a?a:a=[],e))}),a||i?{components:a,area:t7(i,\"/\")}:void 0},ac=Symbol(),af=[{id:\"context\",setup(e){te(()=>tR(ai,e=>eQ(an,e)&&at(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==k||!t||null!=k&&k.definition?null!=(n=t)&&t.navigation&&f(!0):(k.definition=t,null!=(t=k.metadata)&&t.posted&&e.events.postPatch(k,{definition:n})),!0}});var n,t,d=null!=(t=null==(t=iS({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=iS({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&iT({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=iS({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=iS({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=V)=>{var a,l,o,i,p;r8(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=th(location.href+\"\",{requireAuthority:!0}),k={type:\"view\",timestamp:e8(),clientId:is(),tab:iu,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:nn(),duration:i9(void 0,!0)},0===v&&(k.firstTab=K),0===v&&0===d&&(k.landingPage=K),iT({scope:\"tab\",key:\"viewIndex\",value:++d}),l=tg(location.href),tP([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=k).utm)?n:o.utm={})[e]=null==(n=tV(l[\"utm_\"+e]))?void 0:n[0])?e:t_}),!(k.navigationType=S)&&performance&&tR(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tN(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(null!=(t=k.navigationType)?t:k.navigationType=\"navigate\")&&(p=null==(i=iS(iQ))?void 0:i.value)&&nz(document.referrer)&&(k.view=null==p?void 0:p[0],k.relatedEventId=null==p?void 0:p[1],e.variables.set({...iQ,value:void 0})),(p=document.referrer||null)&&!nz(p)&&(k.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=th(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),k.definition=n,n=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:i9()})),i3(k))};return n1(e=>{e?(i2(K),++i6):i2(V)}),nt(window,\"popstate\",()=>(S=\"back-forward\",f())),tR([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",f()}}),f(),{processCommand:t=>ag(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),K),decorate(e){!k||rM(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tR(e,e=>{var t,r;return null==(t=(r=e.target)[iR])?void 0:t.call(r,e)})),r=new Set,n=(te({callback:()=>tR(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rK.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;l&&(o=eB(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==K}))&&(e=>{var r,n;return null==e?J:null!=(r=null!=(n=e.length)?n:e.size)?r:e[Z]?(r=0,null!=(n=eF(e,()=>++r))?n:0):Object.keys(e).length})(o)&&(p=f=V,g=h=0,y=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},e9(!1,il),!1,!1,0,0,0,tO()];a[4]=t,a[5]=r,a[6]=n},m=[tO(),tO()],b=i8(!1),w=e9(!1,il),k=-1,S=()=>{var O,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],E=f?iW:iP,r=(E[0]*l<T||E[0]<(T/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=ng.impressionThreshold-250)&&(++h,b(f),s||e(s=tP(o,e=>((null==(e=e.track)?void 0:e.impressions)||np(a,\"impressions\",K,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:r9(a),viewport:nn(),timeOffset:i9(),impressions:h,...av(a,K)})||t_)),null!=s)&&s.length&&(O=b(),d=tP(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:em(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:em(l/u+100*o/l),readTime:em(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var _=rK.createTreeWalker(a,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(M=_.nextNode());){var M,U,F,P,B,z=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](M,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),B=t.top,C<3?y(0,F-B,P-B,v[1].readTime):(y(1,u[0][4],F-B,v[2].readTime),y(2,F-B,P-B,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(E,E+T)*m[1].push(r,r+S)/L),u&&tR(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[iR]=({isIntersecting:e})=>{eZ(r,S,e),e||(tR(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{eY(ni,e,e=>{var t;return(e=>null==e?void 0:{...e,component:tV(e.component),content:tV(e.content),tags:tV(e.tags)})(\"add\"in n?{...e,component:ej(null==e?void 0:e.component,n.component),content:ej(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:ej(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,ni.get(e))};return{decorate(e){tR(e.components,t=>{t2(t,\"track\",void 0),tR(e.clickables,e=>t2(e,\"track\",void 0))})},processCommand:e=>ab(e)?(n(e),K):ax(e)?(tR(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=rQ(i,e);){eQ(n,i);var l,o=tE(rQ(i,e),\"|\");rQ(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=el(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e4(a,d)}}}e4(r,...tP(a,e=>({add:K,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),K):V}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{nt(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=V;if(rZ(n.target,e=>{iH(e)&&null==l&&(l=e),s=s||\"NAV\"===r4(e);var t,d=na(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tR(e.querySelectorAll(\"a,button\"),t=>iH(t)&&(3<(null!=u?u:u=[]).length?eS():u.push({...iG(t,!0),component:rZ(t,(e,t,r,n=null==(i=na(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=np(e,\"clicks\",K,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eV(d,e=>(null==(e=e.track)?void 0:e.clicks)!==V)),null==a&&(a=null!=(t=np(e,\"region\",K,e=>null==(e=e.track)?void 0:e.region))?t:d&&eV(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=av(null!=l?l:o,!1,v),f=nh(null!=l?l:o,void 0,e=>tW(tV(null==(e=ni.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?K:a)?{pos:r9(l,n),viewport:nn()}:null,...((e,t)=>{var n;return rZ(null!=e?e:t,e=>\"IMG\"===r4(e)||e===t?(n={element:iG(e,!1)},V):K),n})(n.target,null!=l?l:o),...c,timeOffset:i9(),...f});if(l)if(iK(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=th(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:is(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:K,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||rQ(h,\"target\")!==window.name?(i0(w.clientId),w.self=V,e(w)):r8(location.href,h.href)||(w.exit=w.external,i0(w.clientId))):(k=h.href,(b=nz(k))?i0(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||ng.captureContextMenu&&(h.href=nW+\"=\"+T+encodeURIComponent(k),nt(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),nt(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{rZ(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>ea(e=null==e||e!==K&&\"\"!==e?e:\"add\")&&U(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ed(e)?e:void 0)(null!=(r=null==(r=na(e))?void 0:r.cart)?r:nf(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?J:eo(e)||ea(e)?e[e.length-1]:eF(e,(e,r)=>e,void 0,void 0))(null==(r=na(e))?void 0:r.content))&&t(d)});c=al(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eY(t,o,r=>{var i=r7(o,n);return r?e4(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),ar(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r3(K);i5(()=>{return e=()=>(t={},r=r3(K)),setTimeout(e,250);var e}),nt(window,\"scroll\",()=>{var a,n=r3(),i={x:(u=r3(V)).x/(rH.offsetWidth-window.innerWidth)||0,y:u.y/(rH.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=K,e4(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=K,e4(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=K,e4(a,\"page-end\")),(n=tP(a,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return ah(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=al(r))&&e({...r,type:\"cart_updated\"}),K):aI(t)?(e({type:\"order\",...t.order}),K):V}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||r0(e,nl(\"form-value\")),e=(t&&(r=r?er(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&td(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=r0(a,nl(\"ref\"))||\"track_ref\",(s=t1(r,a,()=>{var t,r=new Map,n={type:\"form\",name:r0(a,nl(\"form-name\"))||rQ(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:i9()})),((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),et(i)?i&&(a<0?en:D)(null==r?void 0:r())?n(r):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})());return nt(a,\"submit\",()=>{i=av(a),t[3]=3,s(()=>{(a.isConnected&&0<ne(a).width?(t[3]=2,s):()=>{o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&ne(a).width)),e.events.postPatch(n,{...i,totalTime:e8(K)-t[4]}),t[3]=1})()},750)}),t=[n,r,a,0,e8(K),1]}))[1].get(t)||tR(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{var d,v,a;e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:tN(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[ac]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!np(e,\"ref\")||(e.value||(e.value=tN(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=i2())),v=-(s-(s=e8(K))),c=i[ac],(i[ac]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=K,o[3]=2,tR(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&nt(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e8(K),u=i2()):o()));d(document),ar(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||ru.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rV.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tP(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"indirect\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,s,t;return aN(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(t=l.key,(null!=(e=a[t])?e:a[t]=te({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e;rK.hasFocus()&&(e=l.poll(s))&&!ru.equals(s,e)&&(await i(e),s=e)}).trigger()),K):V}}}}],x=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),ah=x(\"cart\"),ag=x(\"username\"),ay=x(\"tagAttributes\"),am=x(\"disable\"),ab=x(\"boundary\"),aw=x(\"extension\"),ak=x(K,\"flush\"),aS=x(\"get\"),aT=x(\"listener\"),aI=x(\"order\"),ax=x(\"scan\"),aA=x(\"set\"),aE=e=>\"function\"==typeof e,aN=x(\"consent\");Object.defineProperty(rV,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(iZ)}})})();\n",
        gzip: "H4sIAAAAAAACCry9-XrbRtI3-v-5ChLjYbrNFk1QiyVQbbyOY2dsx47jLQuE2BDZlBBDDabR1BIS85yrORd2ruQ8Vb0ApChP5vu-57zvxCKA3pfq6qpfVRFC-aPlZaY6gmmmmGQ5y1jBSrZgFZuySzZhMzZn5-yM3bALdsW-sHfsPXs-ni3kROel7PxBMCtd6k4uOyL-8fQPMdGDqZjlUrxR5VwofYNplpdZsRCRYkIuLoTKTgsRdYdsUspZfrbwz1cq1_Z3TSOR6JSrGpr4hEMxXPBHT5UqFREUGq_PVXnVERkRXIzgXayJoJGo2StumsZ3QkiYz4jgnOvVSi6KgnMCf7pcxCLSlCqhF0p2h2NINiWC9npiSjT8GRRCnulzyGt_UhyynEk-HM9KRXLsOsUqkjztcq6TPO31uq_wmcETUzuhryYc9_uyNg8dyTm3o_ZF3FREU1tN7VLX7IPpy2AwUJQ_sv0YHiubstdTg6q8EETzRx8gJaXsGWah_FHTzye2zzrWUfC4o8Sfi1yJaQcnppNXnYu8qnJ5FjDBH72_mQs70AMl5kU2ESQYDAYBCyCpyzwIKKXsTzM33SFTOCnqZml7JwitJ5menBNB_bs50TQWCyK4xil7glMWCQ3vJ6WsykIMBFau7Uca6XqWy6wobpamF6rXU4TW9XhSZFXV-asjrrWQ06rzRpUXeSWWZwLWZK7zrMj_ElPi67ejcJ5Xg09KVItC1_pcSBwvnFo1NinteBG1lpjGKmo_248ZbghC6cAX1vQcStUbpeqNUvXXS3VluWH4P1RsU1oNI6_VYqJxdy2rxVwogiSipuwPAjlZYLMG7LLMp51h64OpoPnQromLGjfxW9i_Ulx1_iJZdSMnULrZt-wNN2_uWEjZVZbrDqZthjWfkS6uGrqWClYV7GRNLXkYry-qZhCXmIEYkqBi0_RIEUrrmv0MjRXsW_jT7Qr2HT5zzl-yF9wkZT_w14uLU6EGrx7_8und42dPPz1__f7p90_fso-8G7KX0JV_cTOI7HtT4C84CGZbst_4u5uL07IY5FqoTJeK_ere4Hg8d69_chuaKCZ5dwgjRxRdrXSvJ3s9vymaNUsUhbX6ggnh8tqt1-X8hSGULyLbeeE6DySXYgIBWZHiBqdlWYhMBpzrm7koZx3BhOI_EaGBVgy7XPR6JORcrFbBLCsqEXQ5vgu0WoiA45cXQCqExEHocv6RiRwLlziCa2Vn-KHSCshR-0MBlWbMDmC72QNdvsP0BGop-WOlsptBXuFfJhZYbSeXlc7kBEpD6sZEZWlXSJsyX0Rd3euJkggai0jAWouTwWAg0igRKRNTLKzXC0ok3GstvIRvtwZ10Npc1FN8JiZuZgJ3pPrCtk4MEzMzNLhE1iqe44dbxcCn81Yfu67c1aorkt_S1er2OPd6XU2ZOLs1Zq-yORM3t16_g3Vw0T5x7CiGcFTFInqV6fOBKhdySsR9ojk-z8srEg6Z7vW6Qzg0Yx0NKaUPNBOn9vCGJZsMUyil1xOJO4x3QnilmLjCpmR4YBNxSgQLlgEL6oCuVuYxCViQBrAkvsCGFO9weuBhyARl4j0X7RaLuZlzzR9pnOrnTUtax6cyOwS4jvdEUGYK0L0e0XzoHlWvRxT_gTIiWU75I72zE7-I1M5OLGKB7yIZKRoJJq75thU9ywstFPmFMvHYNoPJ1gAnaXudXuNBmfyWxm4N3DdHWj5zzA5ForjU0GpNx3jWWSZGdmDiqU9LJNdEMtXvUxjbm1wU046EYaRLHMrxqRLZl7oWRSU6UAKUZksxRchWvpoIpjiSnUg8J6YnNEJea7O97eZJ1jTQcFnIe_FEMpHINB03Dc5hZkiOTY7yptH5lkZDc9rNeEzMxK-1hKm7iDtdYovMcvAVaTpWOzueAmsu4GQaU_sVh4BJGrUq4UM7QeJ4SF2ZbiHtiJ2QjkW_74vY2Rn74V5fcmOxs-OT9ftYF2WwiZ-2Vw501D4w8dpxyCEcKCEw_5Q_8q0TxN4JWitI4wpCqiEti0zd3Gcw93ksHhNNI03DLpyo2KL7gmTAADPJukMamVZmpivN4JimQSOY6mPakDLxY7v50BC7OhiuercchizjSYrrRHF1PIwdpeiryJ6MsYqGTHLZ_ijtRxnLyL0cq2PZ63XFlzEsJCy_4CJR6djNa1xwTQqWwzoraK-XDeaL6pwU1LH0htRk9Rq_KWL9kYinvjc0elEzcW9zX0NCYJDeCU3wyGlypBQO5E9bZw3Kfk1a1zigeH9wAiW4S57jFDviTziruetxDCQWqJBvQa_XonWaJyk1XRwMBlARnOO6ZuLJ2tyYS1HGCrth_09MBM5BQ78SlfZ6JOd2JjK4PyQqZQVQqTiLctjp61vddjmvmXjlDijD5DPJMpbbxmYb5C9D2t0ihRnON40l3GDvqETVTHz4aiVIwvLZetFJxkSSpel6DXdV8Oz2oI9bFB6JCW4NN9lPfPox1sz5C3tX_S31iV5hqyHBbZ7GJzJ3y3ptw7coCm2GLucZHfuhr5n4k4tnTPzV8Pgbq8Z1gXNf3YvWxLS2TUPwM27Y_YzaGu8aNpj8t35ettVkTsJlbW4NS3Py3Jq4LbMFyySRyTBNuUzClK4fh4VZVQWmKjBVAanGrfl80zAYtl4YjhbpsIwJXHNWKxWTjC9hQIHCx0S0CIe5T8MY-TNIJGHKFckS2OIpg0dss33B8UUEPBSUp2OxSSrcMt1kRcMUimnunETyjCY5x2Lh0imTPG0IB2ZgGa0jT2TuKrPdNCBjkC0Sb4n4EVuIBxt_JATR5owLTfsFESyklNZM_MwbQuhGtcA7mJgTRWNFaKQ2Oii4eEYEs-PptyeMqGI4prGICkKxTPu7ZuLbtcP1R1MCts9Nge71TEPxOmUO3heQC2jpGrMscuBAkDO-yK5dikj8bEuFqrlOwjSGfwiyEqopYbUSOQG2RxzncR4J9oLpZATSp124NnzcQjZuL7JL5KS7Oh4et2VSwsmkIs9rrf3g8EOgDIq6-cwHk6woYED9SfItpdCyZ-2J7HbN8PR64h0B7gDnCX-a_d7rwfZ96aV__jjbnELFBbSUGmmY0sTWAPfcHbwMM1Ez8a8WQ792LfO3stXKcNSmI3DRiKeiEFp04ApmZZJR66sYmO_-B3BAa1kGldAx_gtMFY3EIJtOY8iZTYGJito5TQWwtsX3m8QBBZSObvkmEMnF4AyrOENCEYnBeVbF-K8rkt4WEkje2hEwBf_C6iRlsmbil9YyJeJPoplGQqEZSTRTKTTKl0hg7ZhaxCWUKX7BZ-wtdojWMAOUid82WTrfIcch2HbgEm9qLlF2gZ-SISxspF1r7XEZUdIAG_TXWwPoDjM4hYJK6KA10URykHeaMYRt3p4VO3uSRiZvNp0GMHQw9maY6R3z2eutzRSOhhksM1qw51rLBZepF_dsXrRXq7U3P4vsyzuh465rBEyFbQVy213xPZYE783owNaC_8RwnVdp3aW2CMc7ituSmOm_aXFA71r1DE63sH3sNpwETqXhU3q98NhzotrvXI0XZpD70sFFNgfRtgiNbDsy21M32cSgmhf5BG4sIQVm1p0pQ8OxMDFC0mEu9wSv3AeGoqB2wBYYC6wKUh7ARxDZR1bug9MESd4AOU6EWW8JFEQUJk1ptIS0dSRAnOq5eB3jwbBeKlzVz1yqV9A_nwrPPygWT0BbssA27205OLy0wHPolIn9ryVcyOo8n2mXdneDY7XcWDNZlzhZhu24tKKWP-0oFKmd2wLVHiI1rOUlUbygRkBLCi52ScHwq1tN46RgKuWF4ZdETuAiJXJihce9Hik4lrFj34yzRKS8YHZpwhGXc3EAuw4-qLqmLKdxkrHcTT-NYHrSmolDHiyk0UlNg65jbOdCzUp1ARsJJDkvYSGY81erBXCph-QjpVEr2UDnF-JHlZ_lst9-LcsrQqPvMo0_mTgCzqE7ZNpwHYeEti4EvC_ua0KRubSi-4wLVqBol4s47_Md2Udek9IoZwVyt0PKiODI6povTNGaaSPZ5UOvyONmkS9noKERcnITaQYH8Wk2-RLB2mTLPxdiIaIcGjjPFpWYRhlcJLXKz86Eigp4KOVERCX88pkXToytsllU1VywKXB-DQM18HUCszNkQ8ouuS7gKB8oUZXFpSCUTbg4It2MshmfEMrm5krQEWYZdaerVTfv9S4HcyGnuTyzwkHR6M7yGSEXg9NFdQNScPwG_PbYZxlTcy-49LR-tbqEFggYdoJCSZPiDao3FgQasjPrE2wSpawbMvjQBcrdNB1k7cd8uFqVtNe7ISCe6PqWhLRm5zhCU14J_T6_EOVCY_lVjONS6ccyv8hAtvJMZReCnNHojFCmj4fxjo40ZWdmhC8GoDS5FL3enFDWPJ0Dy3ljRbnABpGJoceTQmTK1ThtsvBul0y5iM8JjYaUXVB2wZfmU9QNGTQc_ipR6UzpyPJLfk6R_LMFb-7tC3ZDukM4PCjT5dlZISJ3SnU5d9XGItYxuUEW7mJglxX0hEb4MsKxiy78ivMrwMzK3NCYG-IKxOOqdrN5MTBVk27GClo3umit_39RRht9o1aoYMRyGtWi0XnNjQZygB9rSGb0Tnckw4-YzC7guxLaz7VbkVamvz1xK5HRxdVKwHD8p1wujc-E22Zrag6Hl5YmYZWfyaxoqXkxqW-F1Qe6XYhZGq3r1ra09KgtzSRdau1Ujjblhs7R1lG7mZLL_8WKkKCOv1ad-2S7ufULSlNuf8DFseU9roYt7-3kB8i63Z4Gq_UmxJ76S8E1cjMtraGToEJmWxxtD4h9h4fBeV4lOratiWxrU47io9VKMdA9YirkGtvFjI3StQEQBLZtnaxQIpvedOxoTR-YwUEUQU1rypL2mnGTCUlSp0DW2YaWabXKq2eg5oc1FnfhGnzMh7EYATfaHhjFH7Xostc-K-I1yxovDTR6Qj4_l5dZkU87U1FkN517S1EPPlOmC6u-JiLWKtKSMr3YvGCgTJa7aRD4A2TaGRJ32cU7QDdEyRHJDSderH1D9kfbb47qgewhyViR1qAJbuF2uOUzbcKEtK_4XC9AfsEfabwSwO0Lflt-XVBfPEjzAVABDCzLk2FKWV4zYhEnRHDF9GBWqqcZaN5tv-CaldZMT51IGhWMAm8ghjN_pGMVf763FIMK-XNQd9SDwaCTZHIK4-oUerruXJRKpJ-jVtKdkPaD__f__n-CCMjHZI1PLZjiScokcKU5_JNZWV0BtF_TAnSGSQHy4u3HQM4KdwwULUIffvVICGvKZFKkPOv3mXJyf6OqKjnBMRj6xanjF06unegU1IbxE_L5_bnAFdUJ7i11jWgaWeqOZU8Hn0HKv-DLu5oU3mqSm8Nt_cxFRXK2nGeqEpHtbgk3gwXwcfJL5V5K-7IQl6Lwb5V9Oykv5plyJRhSKrhM4N6UwhpM4EaXeobrWMc7YaSPRRxGw9oUUuOS0jMLb4BDYA5TupyKIr8A-EMFuoZgFbBgHDDQ27KpmJRTEcGosqK8EupJVolI1nxZN8LjwlcbW6EiXDnwSqhJwAPqbnWwjGNT5Ie3z5-UF_NSCqmJACblAtAwFun0uChI0AeoUwBXefOVyRhABj-4ZsA1klKahLDGQKzLg4CyIhkZIS_sggxuTpqjCAgGiPZ6-i1BzER4THJMZ9spKPWX4D9ITqMXdLXCYuME_k2jJKWsQK2RPr89bgCZMZisxwt9Xqpc35jZc4PVSPn0FRHswe8kjuB_yclVf7CT9mlEY3Ly4OQBjWlM8Mvv0f-kfUri6AQe_ie9T2n8PzSGFwlJfj9J0z49SVckGe4cRWl_lfz-oJ_2Y4pJInIyhQxYavL7P-L0vskak-T3f2BZJI7-QQbw696DMyPj3AJANIfZsioXaiIiwarJubiApblQMlJxN4_gwvCCZb7fGVtUcJFh86yqrko1jUp2XlbabsZFvIgqNi-VezGNcX88l8A9Ry_YPNPn0SX7cyHUjcMwTKJJrM_IhMEdX7L22NeQZ6ayswshdTTz-1EMoCBu_qxWIJZxTYzFYKFkHARR8CCIXoBkkjJ95igccqlBL0AuzHD8a9ON-6E1t3DYv2lwHXYTwJXsAqFSD0gc_T64H5_Eq9-pHf4HcJ9pUoIwrRERmDWp8biAXZYImJe0JRafwwrcHAocK4W4BCMZfRGpGsXlSXpL4H5LLuFghg9OkpP03gMWBJTGXaNHTgQLjwu3Q4ooAyQOy9JIf4KR43qP6O-IQJ0xyCW0lc7Y7OGx9rvrJeqnQUqkB3-UuSQBC2ijk0GNeqJnKReo5dQe16Kd3FTEeqBFZQBUTLfAKri1QHCJTNoVdyrtNrxoTbgWv4jymCj-gmUxkXCi2SKc5tYLt3PzBqS45tyB07c1ak2WJi0IX72yzC0GjarSF0x_2Qo68bOQnPx-7-RkcL8fE5qcpMt6lT44Y8HJyb1eQJl-xx-c_DV4cMb0e49M01w_JOIeEd8SsRWjZQG0lAUrmNy34uzp9ZxoFpwtAhrpd0w_h7NcX9-CGJmkTD_miH9L8IDoBOktbYa-Rok2EFxFY_0eFEeqaQys3cdGS9Za7khbYDg1Zo4fDB6cRfpdJDJ49roOyPycJpqrFDUZcCHUV0StVkFgKOrJAzLox_TkQbxCynbvwdmCNcvjVo-xefopUcx--Uzi4y78d3JyckLxn-TeUj8kkukvtE4_U9yUotf7_Du-16AbtZmD25lPTu4HJov-QjRABB6cnJABham8F8KnYHA_oPW9z9RAEvRTz80N144NFWujhu2G1EGTvqdtYqFfNzvBawbvXGAopgc4ENMA8vDy7h1tFT1JmO6ALNTLznhDRcRvRLEl7gNEqHidNCCD8hQ4amFBkrEaXOVTfc7VQInpYiKcYkj0YbbZkEY2BSv5cFx6WPW4dAAQPI24SkrEGwmSgWR2Ck07HlLPoCsnhS7ZEDSXLu0Q0oYpPeZDIx117zB_r0cWHH7zDNnu4bEv3yhE4WsIX0GF2iWOxamgPf0W1a6wPMzVtMmeeHS84BlvGrizYwTlde1TIuIhcX1PeQa6VByWaFiDqPEe3gs_tdi3PxBLBx8QS6eftL69av3-cAvjqp9B1qX5IyzSy0hLb-tuM1Z6UEnpcRqA_og1KQH8gamjEoSB-hOOcQaH9h8UYQB4Q-UZA8S4IZ0ZZfoeXWKXHCTMaTlWK1kzxYnBj85VqUuQFyf6SbqhV_Zaflg3bOHxNOPyeIFrB8TiXCRlykiBjQXOBptatJpa3Gpq0Wpq8Z-aCrJgj-Bzd51bzbamHU4Rk-gPDvtxhxI0VpEt60zoN664H0EvgGVCta1yx2abTFllJ2rqsS4LnkyZSKZpysgCED5kwap-H7NFi9ZALDYGIuMLlvd6uRmIxd0Dka9WWc1ud_1Vyp1w0EpzNBPjlqgChmG1wl-_pjHKG7aORcP2mKQEeRpXAqERIYJvHy5IRCm2pcEFJr8iRgKnwYpaXkGhbWhgQ9OMNNOA-xLN4NRJa1NwzZJX2bzpMwN14Pqbd0JvfF9_s73ZTUPosqYppdLNOpOmM9B2N5YWJrlls0iLT1NE_4lCQPuG3c7yKuX6T_bMVvwfCvtrrbBtmaC4v5ho5MP3oQU4g62h5cOxPhZj3e97mGaT_q8t6Q2xHZs_ILC5BfPEdG_bOm6i33L9jLg3XOCxhB3Dd9aWANXd7rgUTolFG8SmdlghlHywHAsi-k1TePuDWK2GBngfIAC_VaEhYXfXlWNtPzdWPYZ_1aD7RM4ekUItPvZTpGNtIActyRy-IYLiVUB_ilBbYIgnoj7wJwIooASBTdafKNPfNrZbDJliYKGFawERdh14QKYBPuWIFAI9YrJx3qS9ngO5d1sgdxUTDZyqG39EqMK6-gTaVru29HfbAFqN0MHDfBrova8D7hIITeCJrQMg_Pot8RcTknGrAbYYH6zFLy5zbFjcsIATu9fTIckYgMlQR-UhVggsq2lkFLWYp4Tl0RRRmtHxpRdYXGPk5DBchcFwqQ0MF1YAcKya6R_g3PagBkSie-goUrVtAw7XQJEy_ZG3F4m3srgzW8vyQr9sKbadQrWFX-dd7W3ijNkG1IkZ0gY5KA0bdk4kpUvSqLfUGtJVUjAb0rlciHp7IklbwEzdBhYpEH-F9L6xOYyH0W0bi_jWK8AfFOUkK8QTI26Di2oYbUm3E_q96ySNw8i_1HEYiR3gx1vwIcTtGnTFFhsR7ZCE-l-Aq6NME4m3R4PU8Jdnm8rTQ4O8Ho6z42bcu_k4A-aHQ1lJlmJx8BdLbFChTnWoHWbHKSDxhUIrRv1L2zaS6d9aXOWvrd8_tX4PkbW0LVz6EyHSdTkj5qvAY9MdlimlOtG_tZiFtqrIr3JtGAQvOzd2dYAVEsjE9HrdLr4C7ZOBnehE_5pyPFzH2xuUgOmMPZTTLc0wpNerrVYr1QIT6dhUaKisr99I-qP11jaNOc8q-P1Tu6I2s4EMticSgF90hWraZp7qO7p0m3PeqGpN5WQ3m9UP1iyxllFYyN-emaa5wEwJIGsWiWRfIBSK2AeuccLckNzRtkSkjSivZjps7W8dcj0kzblwG1NsLzWA9vo1JQZa7RssW1SYSL5lQyqLyWvZXoCRH6oqPVrOKC5VixIDgRIwYuZ2PXa_G0ola3fKU6ZH7S6N1rpEmmIQTufzHLRRgfrAZtrAGiE5_ylFFJ37yvTeOtII8NZuvN86TKhhDxyUGcC2YEVozd2aQ2G1Enhx6PXw7x80Vi3cMBgTG0XUf5-TAm5N76_1cn-9l-RvmvfFKOwHUzL3F5QCicbatDlOoy1p7NB7kKPRS7YGctfxR0b624b_mwvpcirEPAJdIisvhQJdkkX8QMIKAT81V1ZhBgfADzBX-i3gtOz8lGwxtgxMmXIAgiCqj2T2zFk0ENgFjVEWVkbSMhScl25wyu2D4xMuXMLFXaO4SxashAMiN-OX8pKCwri1OQ83jQ9FBCJh6IyzHdFw1TPAEHeLipDbPFrjR7bYujoOumViyvTDdVmXXfXIc-ift5-xyL1qGoFxLvKZR0CWjBC6YTACkAseQTlBsGbWypTYYnBTtlBOhhnbWjdwE6Z6C6vNjfoUd17DJWC9-lNElL94Aw65bVwLanpYEZY1iBKmU1Y6sXYZl1HJg0xOA2osN70MUMcBC0DmXfaDThAFnaBPSvcAImWeOz4jCPq5GRcNn2m_XDMRCgIGBFIzl6Hf6XveDiCjt642NVOa6wkJppnOOggMyWf5JDO27EspLoWKAvwTsEyW8uaiXFRR4H8GLJfTXImJjgL3K2DujXuuhKxyxFcF_mdQU6YUTwIpJqKqMnUTAJrDowcD5icsK3INXy8y9UVoRHtAygq__GUbG1RisgAlUpAyJUHzoZTBjTKRUqZy7qRAMyXEX4KIt0QppwMFncgQSYozPN6sgKPldtecTXbi7A7Vg43ENN5oe9S07qvluFQ0bg0LEt9s45BwApu_2SAPct_80r7pKNwnFq2r6GCtD_GtrFytp4g2nm9Xxiz3cesDYDq-PiBNB9wrBw7f0nCXBM4sVXxCNWabWVrK7EKgejhkiGjJtNGmo-JwK9sCN6PBfKHmZSUqoLe8eaTM21o3CnaG-oWWNSaCMqxnFGM_BhfJ9kR3OQdSjvdLYMxUr2eBEbamDrS78829ZV5_cxsgMRbcu0_RMWidflnTn0ftvZaCMxhVfAKF3TprvcwlaC1hAytWzs10vrFdjSTTmQKpmHkR5Wa8bh8PuLL4cmOiI8nc5EQSoA-93voAkJyrnOTGxKWrE_uQrgFdBVcZ3rmYhl9omqFa2g6DdQGzPplkIBvAf7tgoLZWTpAV4CyAK7qWVbSyCpNVr2V1W682NlTdcNOOscmLo9POPRwXsNDsU1EzBQgZR4IBdKpy60tkOV-cFvkkCszfgIHbiEqL6Q5yLkG08dx8L2Vx0_qMj7VXW3s7ts_3lncrpNZPAzjSWmS_7mBzZ6Xq3FsqQdwuI1vw92bluE0HmFFad9ySrgaf4SBY8GVzvCzXq147bly2aFnXbFKU0vG0m5k2O9DKCXTCtwvNMBdZUXnMrvEjJHo94Dk3SkF_R-uvej27jVoEgulWv5v9hOvt9p6CIWGVUMYlj_dgw_2gbh_FBlCx2aDWgAEQfOO7wTcYG7zGVGQ9TT-Igr4BgtRsKlqNc96Asha8CDEHDemLAso2p8PrCpQe2E6BxhQkUVunt0nvBiFDXJqh1YA4g6zLuqaRjtVigEsBJEN_d_HUNVOVV9F3vclea-leCJ3BMjfeZNzVOR_MS9hVzD-j5cDUqQyE1ArxZY7y0tXK2f_4IoHPVZeNeEZNNkSHLcuMSE_Ji3c_vh4YiVc-AzsatoeAc6Zm_MHvJ9PlXr1zMl2O7L8kjt4PhxH-D9Tvg-FwCJij3-49YGp-Vw78EbX-xawn02XIHtY--zlkX8YIb8p2Zo93nqXLw3qn_bj33zyGo5qe1DEUfca34a8c_Op_E33VBl_9LewVUzf8we9JtvPXcOeo-497_-x9c7__gMe_f_q8XNX_3kn7OD5fS0Dv_w80-iQh2J5B2qcrN3BR2qf0JKUrEke2jLT5uZPedy9pfDKg_a8nMe29WDPixGvKElFbQcBQEAVLnFnImGYXcOyeiUhNiKb9z0DJa0OOLylTLfzObV9EvR4BHytWXdXCGvd6Xf_ydfaaCLpa-RfPpRZg9CAAZKUaqXa7XHVKiPbIswh_PCvKTFOj2wIok7oCYb5SHBSMxtoSyNxcAeIKjUJI66ntOAj5XAsVUFwMAELqoQIKoALmqmm9wLAFK52CsuTqKlHtavrBTtBvihUDvLtoWwR-7QISoYwgJ2jr-KNldZWjm66mGLqcZJXwHFTkFNDmHnL73h2LSF0AXJIFlgfMOt_aVHSMZQGR3CgIhnbm8Fkgjsbp6YOaBSy00OPcloIN4Pv5ux87hwfDsPPh_RM4-UWHgM2X40GzAlCoU9YB-LI-F51vfvumA1Ryll93LhaV7pyKTjadimlHlx24J06gjCdlqaa5zLSYdj7I_FKoKis6gEWnriNQS6Wzi3kQ-Y7BuyAy16DADHmA8otgIfNrc-KZ11GTnq8tkLEfGof-B4i8OsVDCc8lfGdeDPGFU2lcELllgD68fv5Lp2ks8OJ9Yaz4sKC5G3kA5t8a-P9Q-K3Rf4CDT_5PjbQ7yHmrTUzFraeBLp-_-9HJOqK-qO06WyhzO27WGtCL1rjFfVxUaku3XOYOcQ2fq_Iyh7Zn4HWxKPJKTEo5rfxyyA0B-V-qzuW1RVmStq0kXAHxloJsHluCJV6R39F2-5vtvFD55lbeRu3O3MK4e_N9ePvcVblQxUahVhxwR9niGoySG8casUpG6ddq-qFDcg3bOoNqWed0ofHnD23vljSgXykhoLVrrPzfayyWAPrgJExXK2z6ndW-vqPhrzcb_pXOv_ZNFxdZXvyd6btppm8DBH9HLVgy7FAlqipwwto7q9g2VzaRWxKLfLp1mG_5gdhSuj8J1bkb_tZpGKYbfYLkcLrdNYIfnn8HQzgVs2xRgIfNdYunz9_cWyqoo5FeZJ1qMQfMuZh2PHXuQPsGn2ld45k_RYzu9Q_ITLOJE6lOez1yyUuQsVomXvBLYwoPa-aycVL7aOrWzWdxPRFiWuEhdZFd5xeLC3d6de4tp7Xd4iCgmZxnKpvA1e0zIASYGFzkEuxzsTWNZ56JEU1xPlutyNxyCxMLjprFn0-FvhJCdu4tJzUekJ_7syjIdKcQWaU7QX-CTxclPszYHX0CMcXlauUqXa0mxxxlTr5yccxnLTIyBxAr8DdB4yHukpdjND5fOPsoQtY8QhLHEpm_UWL-pt5YxF5NE4R8brSObk446Gqa46WmlA6q_C9xK13w2I1GKUUHKrTed3XZgf3Vyc4yAD1vuNhFHm3O3TKEOUVVSSatBWon6Cthu-Q6cOsmRVlQqoB-ZcwXVpXcHtuaiG1OKBpjAzu8_wH2QSlZ0JqSpV_8HtjAHA8DJwmg-SckuMxUDvZNnWpSzkXAlmdFeZoVUWD-gqS9qvDWa38EbCou84mIAvM3MDYgAfwbgOcR9Y6T5RdxgxYkJeiqeRAwIXWub55PIwVP9sIgeRCAVVkQAMAm-Cboi37wTcBA4DBT5UXnm6Av8U0O3ith2QV9UFTYxgLDDwKjb4K-gmSpg0uj-xprdNAJKFNr3idF5I1cLCKdYXsB-2DbLAb4t2k2TLn5WTP1nBNyzTOerVbLmibXg3eLCUgc-Wg4THlgnwJ2nVwPnigBTBIfDcFwyT6ZT69L_aqc5rNcTPnucC_lQeuNSfKsVKf5dCok3xvupjzwz76EZ-Dsk--57PhoPn6bTd8ae3i-N9xPedC8sE0r5azIJ_D5CNpmH81H3Ed8Hzv01JjKWpQavdOzlDHEpqsV3OSQAd4b7iGfXOlMLypYHde8KcZcq8y3473h0GTcyNPYnavH_785QVdPeUOa1DtkX7m1IG-kZE3LwfZS150KZl4Av3mV6_OO-Y7ml-Zn3dnp3FtmiXtO68HnyGSdZXnxX-S7t1Tx5w6BCzb9HAUBXLOth2712rvoxolbrvmbBmmb8TjdclL-oxSdUqFlaAdGEbnoyrZpABvosbWO9j1sLKf9N5N8w0jcZ-B3C4abXauurRQPFZ4Gszsw5f6t_N2NAowxs_rRupYeOCcbTN1zr-ZlUTDVgturP5z2dwnfIsmK8uyJzYgjGuVtw8ii0dCigjZJ2YI3hs-YBozsFuySaesQQ5FijVbRxq_mAliFgi6886ipATaRBUI0pon6lPIFUz-SReMTM1mAKB4howvfSbAZpUzdMznXUq4J7bvquRm01Ypo3npa4OAQu6-ZwKo5X7CKsoq715rWqUHGJwt2mZazTkbBoThUMeHBmdAGFuu9T2AzresQ0uI4pJtRQK5PKI0uxybVBI60iTWqwnJn_DOa9rquOr3BO0hp123UgY01-DzO45zM2AIQAaUZhJnHNOiaEuiMma6Wwt_EZMhtOxesgnmdukm6NJN06fjdGc9xji4pjaemjs-vy45x1d407pKCfXvUVauVuiYzJsEptB0fGluUlur1Znafwzh5Iu9GJzxWDig_4TNLc-OJ88U0o5FtgXpKZpRGtljn3yefkamHg5WUTZ1Q2fBQ4fB46iGGriv_FzFm5FNn2BIOffQEpBqDwYB-pgx4FPWaVGxqD98TGTS272iAEVdoQLNpTA0S9jNJ3hpHLsSITNgyq6LWC5YVhX0eGrGdYd2aNOAKByk_WCWF-HYEknF8WW28BWsb9cS5GL91lxkgbF-9Qimb9r7GW7pkSIChKzAohHVaf0cySkkSXObiKoA9-cHW-uB38s_k8c4zELkuR_Uq-f2fKb1_78FZ3gjWHrQStD5sNbAGPLV6xrde2_BMJqXxYAdw5YHOzlrSRu2WkpFXUns1wG8l8EMKv4X0uJ2n9d4MBZSNoExlo1UAiMSBr285KDM4nrfGjFH96bzKRaj_jo0FtZHSn1TRv0F6H5G4m3QiDiJqfP1vEMaD4Ly6n0Q8PanukzgKQLYfJL8H6f3VgN7HBMHqHl19Ax--SX7_5t-tL9_AF_jQuW-0BcnvrDf-B5RNKb1P6UllBPud-__u3AeZv1Vk3KfWCjs5qSDHv9P-6h41RtatKC_Ybb7U2VlEZKw-EEn7QRQhHKev--oDOKGwLMuHxjG49fMaZ1EB7mpLWo8XvV4IwIZGio3HAMnNRKy_fxDC8fyMKJYDYh1_Gdyd-gtBOoiC7ty6A8AyjcxiZTo7jQKdnQasOs-UmEaB-Ytom7d86x0CXFb8hVFUFKR6g-Zr7kaB0lRMCcvFcdXICboH7jgIaOzPvO0vGU5sm9nCN_4aoH-FxL5Pmfp2ndlPPDOPDL4YGLzB82nqiNQQOByMOrFs4S3gtd07S3srAKQgXhXQY5wtJhLJKAXl3w_Gro7yR08I8OLtqCjIRH3kV7mclldMveTTcrIAO3am_sXVy8FpOb1h6nu3c9eCBxh7YoGeD5n6hf_AlHPt6NKrX465bgPGJR-ynH8chw1FajFMspyK94Z4dYEnlP0-Nf5T3Y21cVANPtNyrrucv3RjnlH2kjK5E4Jc5CMi0amzIORibKozdvEAr5f6aSGgr3QbaLG8kkJ9Z0cDBS0vEfdiE3rb-ZJvpB1YqdDHXFzRprwZ-PxyFbpjPquZ-tWSo7-CdSwnAEYWReEjaeAPwCfCsawptdJYK4btDo3e4C-rMFh37grWHUHQB_m28XThZV_rgi-UtHVDU5SyqohTJ3ULbCAPVGxZ4bL71mntcPfxD__xTzw_USJhdeKU_cumOt9IJV-0v4rNr4Yl--h5so82tZPFtV1M9npm1GLb-Qax5IQkDtiJo-IH5VfrYxR4PQMfrJn6qVETql9vr90zoR9rrfLTBXrCRNz0sJXlt8a9sCTqp8ZPqQrXsasABfjJiGX8ItO-jbR1frdnjqnRVnP-drNeA6ICkh64Gs-EhlN6ocX0nb4pUANiLAHxzvoRvb1o2w6m9njb7AvOaSjSKFvVLpLT5XUkLkg1UWVR_AKE8qZ5_hWZG6Y8WNfYo_9jcN94e4B1_Zro1humjhxFAfeMYPT80AxNr_czWV7Pr6NqcM1u8O8NM3UPrh-ofw3K2awS-me0695zzRjcNJ_-JfKzcw3f5tmZeFYW0ypSMSQx1HCQSymUSeWWAWXq4XpgLcSWzEuEvgDpanzr3kIqZmfiVxovr-3vX9iNe1tHIoaRm7Kb6LLmEveHf3aLkEmB7FlMJoZZ-hbY71yePSlyIfVbcNxG2YKrXfIRs4sLMhkUYqb7i8G1HYLJQJfz_mJwQ61xN77Dn5Sdm87iK_ObtmrXHn3Ml5NsrhcKhRXgZAU9Cg5r6wPiIzoDAM9TqsG1o1Pap5dC6h_ySgsplAu_sZ5KiYvyUmxNSCmT0hxmcJZjT1-6frQnzcy67c3t2WS61FmBiaKNlYJf7JxvrBRw_ZQjw2jthpjEMEUyt0ZATBaGlH_EcYiDnR2tssmXHQSo4Q_aF0yWfC1QwxYO3lj-67dEQbwrVjhE_oamo4QLHtKpZM4L1L_PknkKzj4-sq7ICMK7oTTjIZnJ1ASiuUBWGA9RO7l49fselYPGFXcDti4Mz53zDRpXIHBRgBOz1Ur9SXKmXxPJHpzsgG8JgEYpdPkO4XCc61BZtf0BQ1A9cs7lGVCSijZeoE0wAov_hRWvrzEEUyLS1GLsxSdsbJQYx7wJOPUwDAkoMCpRCJArMVCFi1l-nUaYgqIfJbApXdYsSRCEg1NzskNjaATwzPdWJzsUsDEPUmQWwUj0nJEE4NVgOxZSmqZjIheeEpTIVmtjJUNrJqeewj0k4g-iwPGvLIhmL2G526fgNKvETtDHtxSdTTF5CYAPOXFUDwImsSBzg14FtOXJutczNXu-_DIBxyQywh_YR31KlLmpnLzr05PIXRhOiHkBKJ3fTypmMDpwRemevLt_Etm7grM1gMEDdwOUgQVrilYEfxLTOBi2gDojWuz-zDX_Yzs8gfeqr8DO4bfGWb4icoYZPgKS2Hgk9z587Qj-ZEewNX6tcUNr1V6PnHGZGR_wkpyZt3A2yfl6g_DUJzfcVovExWucbuKbSChyA9TmfM2_fyMRQsivuzsyjGgByNzfzH1xKSv74s_boeWEHyoJRnmUSaMqiuEaVqG7aWluvBWhaR3BcjjjiIaEC08Oug81iYIHn_TgjwpMECq45EzBMxzgI5ByVkiYy0o_826AR2KXWT-01glitC92mZATdYM4zZfixozWF_cjm-f-5R9VKaGK_GKujMbl_bkS1XlZTKNQ7DJ7IDwppRbX-pWQC2gCdmnpWLMEob87-TRg5hd0KoA7irxBa5QL_Pe08WksBqCcfFJOxWP0MCO_cIyKEzz-9sl3T599_6_nL17-8Or1j29-evvu_YePP__y62_Z6WQqZmfn-R9figtZzv9UlV5cXl3f_DUMR7t7-wcPD492PoFOxnozdJv4JpEXIGlfq3NIwVqQtSxKO7CMIICNU7qyHP3SHMsxBdcOqt9Pj4_Dg5X7eWh_MWtPIy8SEh7sh_vDh6Oepo8ehYfQ9YSM9g-He4fm1ci82hvumjQH-Hyw29ONntEbv3C5o8A79CODWxmAjuqJ7YP1BEVyJMTv-LaewJXM98YYpH_IpT40itLd-yR_sLca0j7J-7u9XfrPXTpWx_mYZons91MOIwdwEojVkx4fj0Bau_aOPnq0x9RxjtE9MAsJ93uaHh_vbUs7grS0lXgX0x6s1hOOmzuUfM-Xu6MoGYUHB-HuwegglCw8ePjw4UF4JFN2sBclw-vJ6Wx0NBF7h3uj0Wh3tC9ZODw62g_Dg9HhKAxlysLRISQ8mByMRg9HYvjw9HQY7o0ORqeHo_Dh_sHoaH-yfziVbHgdDm__X7h7KtOaSQgZx0f7B7B-75vId5mclheEroZMPuZLcQ1AAIPsXrYwx5F8yloPr2tOTPzNxsWxj-iGfOfFotD5vAD5w4Zym1qxqVU7O3-mmTrDOyoCD6LO0-s5-l_tZLKDGUEP7VvQccUbHXPlFNEmEsnGKglHhxRNwTfb5i0OwIVP4X32jyFmU0lEUqTURAIrW5CYfFAtTjMsGFwpNbo2OO9yc6mfsGLs7sAuUpFFJDWI4oqERyNq_MWM19GHFRFxeLQfhUd7awkcXqoBAYzXYJ8e5Pkum4kG6BkPj9H7wTEPRw8BozDs9XZ2R8dcxKBSj4bH5utofz-ekmQ03AN-ItoJR4etjObTIX5yOQ7293dtnn0mHj16ZD7v7I4eHvi88GBzH7USuTL2Rkd7RwcPR0e2oANMM9rDP-FBu9hRuPdw73D3YM-X7d-YCsLhnZlddVs2iMkaMrjLPvDNOaCmJG1K0liSxkT__A-JoK3D68ONalybb3-JSUVGYUgZMIw0mkLMvRibFI4O2bD9_2mUjIYP2Wh__2v_peD3R3JpMBDfZToDkQ8xQmXcFd8uZjOhyCHiQYRG6cjBHkFvWRUZDXcpm5KNjQQyAYQDtdekQ-CRCfgEIWtE3Dho8fQbolLLYzWWxgFVOHp4vHaigc8L3fhQWvfksNEWV-h9Aj4l9ihFP1wQ6kHh_jW3kvUTs0BVTnkMBCFLciDgJW7wJb4eDfea948eHazCo5H_vL8_Oto_Lnu98nj_YHdk3KX1-8Ujrtbp2Yf3z3YOO0Kid9hOLsE_LRoeVAulyjNAgs6zXFmCtdjWwoWpYrXaf7i7t3u8-FoFBp3ZKtxDpjrD66C_aMxjwwPaDzoZyFin4roT9It-0CkX6FVBZfJMBBDJAntPStzZB31CwuFot1fS4-MQTll8WlDkDFajvSFrhisc9Q52V-Ho0CBu2x9Wo9HeuDWwLqF9dbDbK_G5MZzLoqxNZnOz7LwxxzHfDeOKhAfD_gS2y8TQrmQUPmSTNJo4wpSMwkM2wT05gY0THuHTaA__hAf-Gyz2Ym1Z21Bz1loXKSWQ62gNbgTI3NgTYwXOAeEiCkwsoQ9CsTtGQxJ496oFpSW01xseo3zmuKEkhgrt4RbWd1AVlyt8GD48Ojw4Cg_3TDaz84nioTi4v6VCJFMjpqDAPfxzwNTx8ejRo0fDlW4RvTurJlOShEdHLBz9napMHeEB_jmEiDQMYrWYeYw2OYJ4gXq49tA2W30jqhB-eFJkF3Mxxe8xAboz4aK1POxJFh4dQBiYaEoKvyTCo4eswEYVaZSER4f4NNrDP-GB_wZLAjTqZK3253e06rnU4cFdzd3-5bnUu6O7smz_glT6K58O9syILKL2mrQxL41lpHfuYSJW6n6_-aqPebgPC3102IeASUQ3G2k08mshSkaj3bvWCbMoR2kCk_rq4F4Kbk9ZCWS-bh8j7g6Wz0gOeCb4b5AbthDklm-NV07UTvwd1hGMdeEXgNwc-9UPvulMMgkQxVPR8JGIYNzmlOCO-uOS3PWJmFgg0d0pMFSI9-HWWTRGhp7z9DOwt3d7BoZrMxDeNQPO9w3GT1bHGgOVlhiNlDa1VzZIvbupHWf9sO1MbnQ_bxqV9cMx1ff5yAq-Ns5icL6DWuwcQgepOk_AEpFl_X5T3_R2fd7n7t3V-oH5b2q3Xo4gsEHfD23Tkks_7kxwYMriDb6PrfF3EdH83wTvStlpRfp9Qds8Imt9E7SdkY6nJNk6R3fxqK3FoRojT4V8Uyv8qcOvgrawTQJafF28yS0Benq1amwb1xEsf_cq1jm90aKDp3LHYJYBA9fUQ-GS1ro1wu5Cu56_VZ3Zua0q1gsD4LG4mOsbW-qdxwURt5hF8Nd16-aHTntlc-2j1q9pDm5LkYkBd9WNLURz1cuJ37koB4DmuKMZrko-5sgY2dxD_2lv132qiIb7FfYk3NvzKfaPXIoppNjbMykOmuKPQh9kEVIcGIBSeDRC3WtLDG9e7-LrrQOPQw1sZGd4PQk7M9DZ2MENj_ZaxRlL_fBov_1uaN4dtKtdkJ2QhbaEh7e-jOyXw1tfbDePjtpfJk1po-Hw1peR_RLe-rJnv6wNSUnc693114f2dbvHnYK4ivfXX7taD9Zfu7Ifrr92Za_1OPNlH62_tmWHw_XXtuwwXH9tyw5H6_23ZYe7669d2Xvrr13Z--uvXdkHG2Uf2Pdr3bxszVN4eOuLq_no1hdb-Witv9NWnlF464vLs9brqp1n99YXl8dvs9H-vt-jO6P9AxsYCGC_ZQFBI08XZyS4qM7mgJREahQFcDXetoOMmcM3iLP_pn3BIhLDxCBrdS46r4yp7xso8jSXmboxDhyIoT-dwB93_YA6spvLs05m7mdwURsCURzt7w8678_zqrHgaagmBCzyhAqifDQuOVCmCq62xsNjvbMzpuDfvw8ECzErSMooiBx66HF7h6PkLAcAYKQ4UfdRdNi3NM_7l_S1Fe3agPuw1SjId1_dnbF0IFXF1-QVYnCKxxmTfTGALv6ISk_WePuTfa4ZLulYwVXEcsgG7BgdbnxAAQd8sDrzFi9mQPLo81zzAkQdY5Bc-EuoZLK_Ua1a46Yw7gzmFxyVQS0-bFmPh8cChyLJCU3XjpU1HulrpSSpL6V1UN0u5nJ7Z-Ra48lmbCiNViXmMtDnGgU1FqLUOuVAZpOh8OYoPM56vex4NNpDxk4dc7lNUGHj5LQlIaMdXK6V0f-g3IGT3bCXoSj9YLdn6vOmu6PRrq1rb-jr6od_s7bdbbWF-1hbOFoRX9-W2k2U0NHukav_kH6t1oX8IssraaTTplYIX4iSmOwrkhgkFEijsGejv9mzvW09e2g6drjesa91FPyZ22sGzft8m6Ymo-NmOLJjHobhXhiGXx0MZCwQfrK9_84MEHKFBx0lssk5dGHHyJ7YXU159CgcrkAcd0D72xKgjCpbGSld44gdbpzourXZKJNt-w02TAhqtUVL6D_ax_NxTdYD07XX5qXdgQKx7YegbdoD6QrtY7Rc0Lv5xxHo3syTSHZT5q28Q7F73zjkPNxSsvIlj9ZL3lsrualnN4WLBnhoau4l9wlM_G6KCfbWm7m_3syDdjMfbjazrx6EwvADyILc3dq_Pw47_BAMPsghvaOyrXwsnqL2EAXDgcy4R8BzGeP3wf1nabzAMkgcidqYuUi-bLRauu1kBw2hcCFrH-qrHsvHA6sh4xLNIMg1b97RXu968OmTqF6V0wWovjb9_oMN449X0mHYTBj6a4hXjRKQgMbXDqIZXVMmf-TBPSVmAZP3GrieADC4CXrS5fyFk1Dq1Uoz-clHZDJATwPix6BMcyW0zmc34HszbMUoQ8C19WJv_GjmXN4Dh15M0bgiEgJ-ARLIukbLuxhn0TrHBrV0vhZbe4GKQfwACKoccF_C42NNdGTvp1qgWcyam9rVCuMEr1bYUbeaXuCVb4qu3NAPnC4Bs2lcpSJu1rwgjScHuJC3AocXFh-bOcBDZsFRPoNI5I8p3B_hLy9sT3zf5I8pGFjA36ioxyaYtKC0HQyBNAB07z6dOoEEoin6QFxAHgNcDBDVLqKGtkk53X22i2O9WrX8TRMv7WxCjbtw4LTBD1iAp7H9Kw0sCSVBOBabHVQA3W9cl47X0K0blhGxfN3YNFRos24QLTRqIWpbNr7sBZPxCIL9bvkKBfgEtAZHEg2iNncTlq-HeYTGMvlHY3ZoIhjwR7hMYpww4GN5y24PrKZpgp_QzQyxqVyYePuJCwp_N91JtYcWnefD4HYRwywJwtOMD1iFbnEjH9BDEmOcsQ1rDG_cvUOs0zVI2FFiIvJLkFRiBFAHcbWQ46euCHJHGda_0Hox7AXGea-ZfGIALY1pHuLjlwipQdeMhva9gGfw921CuzWRLiEcHgSfMpQpN25thjZywgL2ZeZCybdFdm-8_g6QlaP9_d4GnAZcpcbbF9LWBSQ_GachAMWMzMPQeCRkWRt8_MKuTvkHrrjGa3icQCpfCsscrj_Hv2lEEuxtuqHidFhJEwhIsgX8Yy3fhuySD9mED9mMD9kcXk74cDw5JndFHxvP-nyeTDaQPpN-3zpDOgdpJYx-xWG3z1N2CXfZHpnyGcQv3wnryOIZz5Dous99vlMlE04m_ZD-s3KRlPqkwspwuboorSJ2HTzHUPDhwQ4hjYya9vfoP8OD2xrZvb7u59QqeXfHFiFzRuRz2KnmYgGaXPf-8vfw4L58jtxgTlFS3fpmgEk23ziHW4_D9DwnLYANeh5k6202gu_d8RnxpYCjhKYPO3s7hFz-3nz_Z3iwWoUHFANhuU273r2hDWW0TRmt6Vg2zW8XvNlQ3G0He9sds6PQDkNJcQGbID7YizSDHiUFrDz5HgI2md41YBX-bX72XII9ILToNSkZKX4379b6SO8vfHtspBSDFyE2sUWPvHr--tO7x8-efnr--v3T75--pf3inxspHv-ylmLnrpw0Khquf_eA1qnxJpL4qHzx95H8QklBmj1rQsI5Oif_IOVdot5YoDNoEBRA3ED5DpXEhkZubF9aG0G0U071G5MxwCqCb00ZGUmq7PUwAgrwbYZjcuGoTJaL-CK64ImxBrekEqPvrr9pMVwAP09pIlMfk8MFYQBHKk8gcNGTjbwtsoueKW8lWCuc6adgRqJeDiYLBdZD7yYqn-tBpSYs-Ac4wVWKmzRET9CTD1gwBGOA9T7jegJWWvJProyXHxfH7ZrrcyKfrcX3NF4fLd26HkDsUsrkX2gaTrryzyY3BCjaiAWLmdeCgGL-hgyCCf7POdT6J3qQeWmCK9vokWCB8RDWzwPyO4n5SUzpivx-MoDfDyh9wOQzZ0cTo4tvyuQbtLcD996XGXgYkT_7FxdSw4tvjetXeLOoIIkza6cskd8x-SLlOEeJ_IHJjylP1A9M_ZAy-RK46kQpJr9P-U8wi7_6ptpLIoS2rM7zmSYYsaV1QMNdqLWo8UYTw8uB8wgIJyeGPvVFRFu857WDoyqXFw1SH8sOVtUpJ7gqpgHz-bNBPoVEGcP21iyRPzE5NN1IZMjkyHbpAE_PfXQMvY_ObuQQfsEpeUS66ACTMmnMb3Yx2S7vdsFE7DKv8tMC3b45070BvsvBM_U7nWksbkTkLusKJg-b4vY5kT8RuWdikEOJIZOHXBwRsGGWR_7XQ06kJtZGMAnAZOU8n6LjcvQwHphQRPKAoHX0ZtrqvLwKWABG5xfttEOT1lscBk27J-eIlTFMl9wjpoG9ns1GGY5Pe3CgoblwTU5YrszY5jnXgiydQT4e3PJhr5crIh9irHZhWj1rIaX3WCkn1rhlUQG2Gvb_NVoxdCE3sdmHmB3qz3OIWw-CKFjTebE-ZLNyAm5ZA2MHFaTsuj1MwWmxUKazeQ52XmcAKVwfHWOJmQRfxM20vAI38NboaP0JbGc26rkmhpnLBbYMYhXmC2f3kVfGnsbeGxdxvojUD4TSfvAp6OdTGMGpjcsIS4fuEB8rOV_4UO07I8p2D-hqNaR07TDCYki_n5fr71k-94Gv8nO-zKdRvmDnIlP6VGQ6EoeE1iw_40sU9r3PTqvIpidJki9Yfp4C3MWa-PqPNUvyG5Zf2E2Wn7L8yi6EL1z9wPJ3hheH8k3g5HxubqiZ9Xv0LRxv64Y2aBE8ySbnzY9kmPbdzzA9bmx3RM3y9-sUytTmoa3XJhADxiM3JUCAcJao92j1BTnZxPjjAdel1u9OpBk4M0SXR8Ogxksky583BnkEY0AL1rqoeY8wKKKGniG5hmDCptPGg5ghbxgTI0yZYhgNBQMrm8jNLL_mjUhOMsHz53Drbw2Oc8wAxPKQ2BBnYDFjAjEvAaHsh9B3eyMUdMtWDr9j7Yrtil0IbMb0PsnncK8CduJnUz4zNjnDY_V2YGPUE2dWjdbh1OPZer38CzHyqWAOdkIBm2c3RZlNIVKIhBryKzM1puHm5pko0wmWz5HQ1EBbnqacKOUsB5byJwjC46xyIJyzJtYt1TtdquwMAVzPtbggwScw4YjAjYYAlmEjmTF-25IStuya_X3bpgS9ucrIbND17YewCa0WckJCkEuuwdHX0w7m2fQdErARC8D0vNmiBIJm_wzD76ygjBX-ViNuHH3AAry5ZfwC6wtiUOAmg4KAkdwYgmrbSDFBYNPrN-02mONPXLVM9zGSIISrrPFMy79wK52BFUjQrcDfqgfmnrK19HdODdzwG1JemeSB34co-RuvZcH2fhE3q1V3y-InYiDFFQoVgY8DAS542B-lIBpcrFbghNys48yv4KIGLFCAEethVrJYDbIJeFlbrZplDy5dfJYEBvNs4MkrTlh-NvAklaY1yFecI5gMQtKaMuO1jH6RFEhd2kW0PoXp2oIyL1TrsHO7EltPSqAx-g0pWtHc1XfoGBlmBmhBqx5WOPJQuF1c3r2LQ6gMiIPpFdGjtf4wAaUUtNfLL4hxMVFgptqZJGqB4g34rEQ2vQlYfobrbWe0D3fzNsNhQSwC6eJOKPbG-u16dY2QCwT54I1_oz0uQCic3ucDf0YaStvMLrbUzW5-Dl5kGp4GTL1avMxY_kTwAIIr8vYSRJyfN2bPIiaqYXBatZolV1OKrgTOzgpheEb3IIxmAGF5OEY_Ic-fv2b5j_ZgvscJWWprk6Z52FilGZm6EigYjCQPh20HV7nhS1QsP0byBV3f3hsEV_0ZoDOrIUQGp_zR10iB-jNgUOoPkfyOIj2Ake7rtqTBumUqmSPLZRxGPjTieAGiFGzkFNXQIBnpTlcriM59jLwHkCNgzOwlA5P5OwaGBuew3b3YfHis0V4X2gqM3mVW4CLEkIcPRpSyN0Q5ke5yUohM-XTZfyRlMDx2eV9yDWUm05RvI2sQHazJhDd4pGTaE63V6hJWSllcCgKFAnuTtaJDacouU2b8V71R5UVeiYGCgPDCOWVA1UQMfljhHJkSimok58CjhGAxvgmdSbkoph2LOc0m3mdmjaqj_JN1oYUKm1ORTZyM1S0x6aLhwEGOQfZejr3OBhKW3B3uJRdzkBjdotg5iPy92zKQa5RwR3gKxkpufdhQSDACOcOATaTgOef8BcbrpaxbGItsGcsfSI4w1w35a06thEW5VZHfM3qgv0jIjB8zF73Nx6dFH3B7YBhDCus1bCbQjTNbXgh9Xk4jpzQK3vz47n0QBd8_fR8wZMGiQJY7-CsAnnQKnnAggkiQy0mxgCvgBSjtgkmpqgDY9ylIIJYBmoFKvQPgXLB-F9f6wbzIcjlG04lKaJ5X5c7h4f7RThjUDC43UVaDmQw6GIttkOF35EkjZVeimpeyElEn6JuOFAMoGSSfkRfNX2VKks_WoSQAedAhm3VjCGgdrQHgCE7Y-mH9YHfwmdrFqDNAwN0nYR9F4-sqLePhb1PG7pqRtax9KI02WtcKP2K3ewFFfYwaJYXf-qAfj17A4fMjxH4X78DOPhLvYCvRcUmGIPuX2WV-BoGNB5WQ029xVYPFsbjqfFuUp14LmGRo7u7I-3-YBWjoExKY4jpQcuNpEcVoSWA9KcEtNACfu8YvElw40V9pkLL8CQrN9YQFNghJwIJ85tyHvstNxLN89rqU4hWe-CnLX_lMqE8GyUKpMKHWBYiVzNUHkn5o7o0bDsXg3F13b4hXovxDw0Og3wjDRxgfeGhvrVMY2-YW46bPaC5ruIHAse5M-jEEc_6BCSPJMP5vqY2QCueL_MldDfyZKJjo9XbFLrhDMqzpKbpvM_ck17r23a25tNFGpCSwYliewI2BptO4iQAXGkYjhMohacJ_1pToeGl2VJQ5b7AYRLKOmvfOkR-KqcB3MVueCTh7H6k_CPpJZMpSF6CECsNGg3sJvHisVhAwAmSbCmKWGTd81LUZAcEums1LcUNKZ5LlZtGqcTQcX41v0_wdMTdxNG2zKwmxOxsh5bygM0enb-fiIqONKnMBgjofUwh1rwurKDYXbT8I3oMtQ3leBG4SgaQAQht9-YJL028gaMjYIabgIJ2BDXyvp5titw93C9qjfm407ok-hDPiCVyG7Knj5Y5gkw1Wp63uIJQBlEhwx8SljDIDLxgIAy85uGwkB5fOhZul6cmlW1BQhdYFjfPotndAXaQ10wekQtEEuDNKKftqNxWwgbdTtNcXNrgJ3QlCBnZpONmSNw4eiXeuZfZiDoqLZSPtwQWq35ApbB68C9LaOoB-Z66Tz6e3u7SRoC0mB1eCzc2nkfWeCfB-lKRshkb-PlptydqkRzI13nIRNo6C151l3pYuE8mniU7hQrQ-38rMNwaIm1kvqZLZaZfeMV-dukG3xTD1BlZYTdnMD6h-688qSKnfkFlzj6Z0ABX5kJCmtBmUNjSltf1-On_M8cYOsguhBqaNsqoRu1yTirJFbd3WOncLZn-DA4xbbmybwKq_kuCjm5UBUiLBlt4TcKTtZlU1xcBinmhV_5loXf4XROuyQYhKIFe5p16lWbsLeFutE7EKgHANIfMYUtj-MWlWQIXu6PQEYpPh39uuo4wDTO_I2n1oKIDb9Rurqy1RMylAH1E2pKH0tKPdc_MKgrA2wl7_mvZDipRm3SN546ncLMvKEZuSCUNLgLtVTuBZOhJUORJURSjoY86ySPmTS8d-cUWZc1xu6E20nQ4ZIgPESzq5KhAv_QnG0Iw1WXhsFLxuYnNv8R5uO46SS_twe4BdKmZp-isUcNUQ1WE47k77ffBb7IxgrCvfGW-zGvoNQSfI2GC_J2ec6LewW9dYnUWi07FzKh0bKo3LgWH3nM8uMxeQeG1p3XKN7peB72ANIxaZyVDGb5tZ5I6TfUa8j2FyB5GuDJGu_jeJ9BbCPIN2scC7Mh4ENEpSOt4cKYhNzCsYq-kx30VXbTAMvR75Orl2NM4rWv8DWccpQE_OZsS0p8E-7nqbHkrK8pot_y7hq75O-JoAiflrQloTIGor-Ww0BC8NLOhMaFxpz43SA8NgI5m376_9e-M9t9V2p2Rw-8omNcOT4rFT1Cz_s3Fcnr9t_X7Dk8HDfTbY3U1Z_jNPBiP3gI5O9RuiwQ0ZAIW8f1T4-UXcpIhZEHEi2Gd0Ww3rCRxYI0UNJugFb6fKp6JzIS5KddMx0UFVSVrK8A0eURgekdb0M_toAoLnL61HzscYMnUPWWp0QBWcA1CUmktA8I8ACWZXD1AsZnTqwR_ZZVYhMgBcoOX_MmVhKcDbzaGY04XWpcSClHFVSj4QzYLHAQu-_fD-_Y-vA7paBc9fv_nwHr199nofiArR2xbcqKkvAjzfn17kGtJDcOCXlOXf21AG4SagcOkcNnrXjQzuhBB2kTQBcrCjOtcFyLZbfkKN-8kGeuCSZoCp_XpCYbzvvRfX-nZCFg6HlMHIRq0M8LzmpbQVBX2iIx2jk8TGPWf-m0O4XjnhyNXYRSsG8W_KjWNRAUADBYiJNfBHEqZ43RC_EXmGWiZ05PURVsAPUIQFJsgnHrrXFS2ACGBTAKwAOvbvCSY2hvghlBesudlqou4ZbB944Td-3efsnJ2xG5AImXxw0Qa55YaqDAb_YyLPBuBBq41N-GRUdoibLUnmxYcF0G4XA0DgnaQ5TF6OSy6-JSWT_FELh5pvuBvMuQQ6DoHhDWOKxbAlOtATKrpiC1ktTmHxnxrf54p_rNGvs3VVLn81zjuBp6W1ufpd8vwZkW_YlC-z-by4Qf9lTyFQBBwAaEG95soWArjCRre-md0DzytiGTh06Ooi1GEi_2T0vuycvwQVJSgXrIKyvU2adQun0aRUgKHYYMo14EQ5bl39B6jdatrSALd4x6gJK9LNgQNdrcAbO9jgQ1CRJxgrSrTjRBlh1xdxA4GhAG9I1q4aDf_p3FB6DDQr-NcDY7UivYL8wIRzjcUvRFsZkXEu3w8-eQ2pnpy_9w6l_WjXNHpCgnco9OkImDFsvCkQxUVlE7oAYRKuUT6a7m2OPNvGkRumQhindqrhsD3k_Baz3oDD8dSgTPxiZZ3Y82hpotrCrgfFRpL_aWJXd8EMEh-b-_nYw7bzPz2wTPxCVEXEgVVrsKVfXlFrqe0ghAFmsDmQ8_-e_fFCawkKnYWXZi9nxaI6N6JsfBeBzWGrrmw9FoilCTCA-qOhg__VKlmtxB4pWFsYpXeJHtyxZ9vjbQow4w33D7z04_aDNtSUdfPGThihwRmKOBqWSewbmiVdnAfQhW3K60qDbcxAXNrk3DNkSlCPtLfauwUByagZRYT37KOUL2zZ7HXR46Mta7XSq1W4PxweK7wJwEhmjewOuU3NZMp1g_UAfxzZwMLeBdxt_G9_1wS8PAxIU48HAfd6C_B92eo1jH-rzTVluJqjBTp7fIOsv2__ghRIDtZ6qcQZeNVVOGWYwexi6x8TcdlW2dENmUEHLUvQkbR8s-EFDTcABYMLfCQuvmjLtXsTOWWQV09KKdHFAaUVsfIwY_noHegmik3Txkuo2CWaZBDVJcOFY9YwSABfkSlrDrdWi6agXCwQKs9Kt2MTexsqUxgAHFXKqho0RHDwwB0LcZ9zPmRn_Jx_ZDfQ-asGxpPPyI01iXHuNMLjFuylC5iZ1QrRhMAEo-wW3fIjy-mpmUtgkDL2-xU4PG3ZKygayRdoT2pkwZJ_tDHoxLfgi9ZwxAby_8J4nXAksethzpjFeGWw_nW5-I2gM1F8wngDZ96bb9UIKLOLlkWQPBs4B6NcuJ_MFP6lnY6_tG-ftt4KckXZR0c3z1ar7D3a2GQIJn4Zkcpfwj-CfsNvAekslcVL012TYyccDiMsI97ZH0bZY_syUk_g19HQoou7s9WqO3Pb5jye98PIycLYEEUE1BhRz9FuQI3nx-77eO4cm11w8KY8voDoRltOGNi5F-aEaTFNwmQCB2MkmJQXFxnEPRPAc3xk2Ew6wbjqIMd1kuQM7jL00kgBPpr7GW19fmw-V-5ztf4Z5QVij4CopbA-s1ufYego0dy0UgyEI9RQzmIOc2R5s9anfGrVDATpftI6HeYqL1WubzC6ynAIrlaajHBJe2lgG1a22DQElwasiWbzA55Ms4x_NIGamE4xgBGk3sQ7IYp8rkqQ8jwxA0sb-tJwZbGMPlLj9ChbreAmbT0F7TTTwYIfygziofl2V1HAEG8CeysZpYDdpXWNKPlfyRXDiLxKZsWOMFHnQERTW8Ihez07qc2ZAud1XVs_bT6wEVxZt4eHUx-Z5eddlDibzmBsyXpAoisGkMnAst4A1QTH_pZNmrTYgEv26VNevbcs-kuIhLgebS5sRZuDS0x-2joBxR8k_64BxeGMrlYgFmBJskzkt2lkvuvN7zULHhdNDJcqYC9TFIflN6TRyLcCWxVjC6bhJt5FIliRunBcuDMSG-6kCfkIQsfgf3I5KwNmdTFwyrE7Elp9TjutlVL-UKfUOV0Glm66yYcB8Vt_w9DQ9EMl1OMzIUFSZIjAFfnZYWMg9uSn7AyrPM-q9-Vich4Njxvt7UV2jS_fAHi3woiVWFjUJPHvGEa_MVvhi1v3XzxHzopMni0AbQ0itya_f70mFgNX8E1EmZ0mNPbPBNaV8KVFCjkG4D8ZRO7M1E2Eunm4-s6EApP4CBTpKG_NL8RfpRTRMs9kFj2XuhiAdTG46nuGMT4JddCQ6Y94G64IRZb5t1IKZrztR8RZJVPn5w8KNV4pABU8GAy8hFv5QCDq46CaKCEkUzFZmpgAysUAyFmpYJyM9CyruWIFV8c52zlCZaInNhs_1gxZM3lWoA2M-jhoFQdvQCuPJWWAz1MsT3mSo8x5aZYNACEidbx3OIyDi_I0LyCuyTEPh6O9OMDdpwMIXVp90eUcZOvQk2g5nSuozZTxJr8WxVuok93qXpHJaTXJ5iIq6ppGyxrhAkajWLCMKUTDrC9ZuJWyM7g1NMqaK9DVSEKBAxqyKyBZwOfOEK-y9NQSRIsUJiKj7IqgoNftOROeCTdcgTQ2sFJow_8bENjV-An5DI6oTPClJtQTqFrBjYslbJ3g3tJSxTqAKzIg2DARhDbT5-C4BSmsPs8keDE2Pq3Kmb2KdizJr-AuzfJf-f_X2NUut21k2f_7FEPsDLYhNiFSshIHVJsVe-TEq9iOLcXeCczxtAhQQggBXACULZOs2tfY19sn2Tr3duODopO4UhHR-AYa3ffj3HOagtd931DyRtVDB6tJ8Y1QVy8gJCuTYe1jf2oC0zQ1I_6evDF3Gyb_wAOHxVm5bntTDGXmLMmbVvYkeUPpE06SUcEjYgYQZhC7JbrIFfIwWYHmEuP2ViYjVD94Mjkyf79RIxkmJzI5NkC7xy3x0Pg7JClGlF-nn0eAOPBPgCj5J8Ecv7GjA_G9oR-QSgY-zMBwwJkqFGoqDC0cQUWpJWu1sIRnkFATXfZ3KkEKLdSx1BVfqa4FpIhL-q3QCYmDYJrBQ4EprdmL0lkdC7mIK6mTpgzmOrYCT-XT-0sOeAonISEmp8UprVNDm8f_N7B2f5UlVYnAa0yw1zwjj006OoqomoVKLbhQntneaAcbOLA7qeGpWTOhPQO7Z1MCTug23dTvd7INMyui5-3LRcwYZ-VJTQX-2Q1Fm55UrBnV6-mVMPIkFVf8iUvV6JW0FxDm_whv87I5pby0J5CXnhV6wDNv5C0gWkxpYIrKGj_L7BSIF6q5RNetfhYveBzZ3YPGBX1n1FNahDksVdeKXQ7r8NGvrVqHUmrExOy9jIlpfiWYRJ68pnciaT3Kh8EPUig1AsFwYFcNBqEg7SU9W7RigMzDqot7qp_rhrp3t10W-W1ecUI-s2XyxaQI4ndCy7gl-7S7LwAmmHtJzyIWDbkgCYNyQME8XoqRpJKH67p192lTKKQkiI9VTIMAa-3GxiciN8fQD-RYQaP8n2IlazScvVwE4OoHMhkFR-gh5rS2K6Q2bZjaTtK-INnroQDDo1eNcHfi6yKG9T6nDEMRa4d6KK6PJGXSdoQnp_PBHnbsYevz4qiE1yAVPS7yebRDkwGYu_226MQUNMYPVX0rEukcAjwcn3R4J2g3XIrebJLJuu5cZaAldg3qXbe2l0s9azJheq5CuuYZS2ZA0hzeWOytTYSKxz34I2-EziQyGSSu5smT4dBroPMy3j-7tKdi_kmyudVOQH3BdLB8bwvXXbBnkmD0mjQFvPSajV2Z5JnrzmEpB6K9uaqa3rFoRxErn4OuJK1ITopfB6zEgphUzCHgNyGsujVwZLiHDzSWBeEq7G0SbL2-yxege3K2baE0g5qoAnAF_P4RKn31tQMgEs8737lucvl7Oxsb4K573V-9gY6t8TtXgFvYu_8ef2jbUY-rdpAj0Fi9KumRtLylvZdh76VPGS5wjxAkgUSumgIXmcjluHiM4ueZnCnAzfE2OY2HHOlmI6y6fSUpBxsHiURlMszx6kZ0duk7jlwbFd3vV9UNxRs4gLlQxrsyOqBN7B1WhDXlAvKHIRKKskLkFiskM26C-jRYIm_7RpetZizVw2yU3-okg2nbvV4cmMvx8VywBCY90xL1R-Srga0oyGBLRyuTtk--E1ZvC-UQmHTuXFcs_HlSlNWlvkL-1rTiT0QrYdsn2fXP-jqm_O7l7_Z88776_QjDpKquu0-WEv2hxetK5zaOktWtI52Zvl3q5BopZdSRooXHUFTsthNQO_mCWDVV_iJXC89fVbckC4sfyEGE8bQVwnkn0tBZVbcfnT4KwOoIDhWxxRwL74lFa6iB76QuPNddxsUcbmQ2Y9hra5mMPSaQeXqPHYTTHMDhCX_hF3GUYIIA6Mj-fpavsko-OB-kCVlp-fDDRwiaDVAhIS9s4aw9fFwXwZlRr3scfGIPjt3sCwNl2QA-kwuRvPFagE_-al03-9IUAltnxKPOgRdvDrC0-y1JD9Yv4hRIKYr0v4geboRivN9zYWrbTIqlenB6Hl0Ijf5FLPli4B8iRvbWbKPW9Okt7YdUh0nX9CHVA0Eh-WOhgWC5w2Yg944DFtLAB-qLbOIETj-DcnF9VCoBwZDRnqIymdl32JmLxMJrGr6aJVlwSfq6_UmT5ZIci4XXJJmyEeEHUCp3BI3Cfj_5xguSI_GOzMCmsGaZL03pIR34QjmAAw3mefFJF5Ej56hugAUTOoghkudBZOfOtAWXvklQoHMfxn3lUM2_Mx3XbdMmj2HydcKsQ1z6otUdcTYkRecCiaVOqDWo1BN9TZqqIhYVxaUwfE7MaJzm10nmSNscNFtsg2aTfFVBoPnckzaxDnunt9hsipdk34p4V2S4k4KGwh5txf2-cd0p1iqNPWUtsZZJxY-pAdiT00gFUmVMftrrqzIu7qDkY1D5e-qo6-mU7Xy6Ji9M3k69duVymhrAnGf0xeGXZko8oCEg4L4h2WrTD5wMZaHnPNuZtBxpoZ3CaahO40mFjE8CeWZGdb4FWUKddRRapnaw3o8uuZVX8pNcyItxCsEAOEh8a2ldhdJyAnf9ANHRpG37K5XfqMOVLZ32ltXzcJfGlcJ9-UlGQ0dEjtWWExBN7Xn3TYBpaldbsNFlo5Joo61XBHH463RC3EjNhs9NhKPfLzympgn2sr9tPZHzSD1X7yhDOJT3ajeAnchW8FDYuq_VZBWsmA9tikhhgu8xbMaPYUtRr4Q1RgwWFIPpjfAfSxJVr4U3Hevw0VRVUocnU1VIHX4zVdlW3qoQq3kbeYVwCkowP6nmUAs1GMkLVWepXoMA8qsSsoV6KKaaqj06qhcqzASEiKnwFj8Lai944SqvqvzWroIQrSy8qbxUF-HRdHCBWepCXYQj_D6eyjM1nyTvg-Rn6IefhcPpQXp6udng16m4PKyMJC2RTLgub1GcXtgtLg4r1rGlDZCBW0KoCDHNpSoo7DjvEV51iTbvCYRH98gZDo5OEM4V_f6NvBJzT5abTSwI3E1epBC_47B3P4BsKbR0Wm2OPP8Dj799ABY55sGzaYcbVwbFd4Libm07E7Ywh8lpWur0rBuK1t4JLc-9rWdyONxFQanZRIDFa3UFm1URcpckef9oUqzMpNg1ODAY2sBq3d1f71wUBzjKYOW66ypfBqtwSEUHt0kUpUAuj2iRe1KwCo-wuJUlouPXjF6cSeSNgtd-E3F03RmKoNpNhzMfm-GnvMbgjFnV9KieUgtvvVB2eXymNNXumTJG9KX1Fb4UTYXId3iWs22XpI5V8d7G12efl8IJP3xYrn_a4v-vttPO0n_83__87_RgI0K_N5n2PUc61yvH1iYPJfhZVgohnt5oXKjEjz_HMwS1PNAnTETpuv3-ilZ7gSgRptd9Qk7ZBPc3p60lbJ3Lfj_1xrwnJwW-cqGkBttuaK4vUuFQElr32xMJBiVTq3ugN0PU8FCNDAj4eqNxlDeBVNG6B-CJELte4krmnAW2z2_2gNbCJ-ZmeQMsxrUajq9PbYHQ-Lrf96LwejoYoJIjvJ6qtUkeNbrFM_kpL6LyaTzPiziYS_v6IW89Pzw6fnzwTfzI2-L4Q28slqp3gzlrrsA1pGb90Xb76SZJgceo8bPob7Hki6hRRrJWA0Psh04apBKZRmTHymAl04TEuNPDVX80HB7kh6nXuZy0vhzZ7mYEUKH7OZuckWW7QqE1d9InauQfnRykbNt8bKyByyKO3-t0ERdCy1d5FD9P0iou_IsfX7__eHn2X5ee_E0N5TMjWcRPHfFOmqbGz07vmrHgpfroZ_HnCocBDzqf7KX8RT6XP8un8oud8X6xU_wv6mX706lHtl_qWfmXgE_8W199Gf_2xAZVxHN1Fz5rTKnnRnzbG3tJ-OxvRxMU9ZxliKCXcUVEJc5UvJTYyWw6-K3_xZPP-v2_HbmuoPHkuR06ft4yzGjvhPdU8ST27PR4Aim054On8ufBU3kHqjD7orxA3IuRpBHq0ZS2uQNQoF4v78VRa9fj1ipACbamSJUmwtPhZMC_gqE849NzG656KH9SZjI7qAelOekb3-LTJjTBmTzrX3oHt7hGaihk0b_wDn_y5Irc41UT5lZmmm6fAkzUEuzUsCWb6fpJOkmDeu5ubaTVHIpqyaBA1VM4nI5z347rxCGECYlCp-HxlPiCw-MpRZj7fWzentpk7mMIV2C8thefeIfEjj3g0-X09FQmmrMcgi3b7Eq1FVDGeztVYp2UjS2fXdvCh19FIS_g48SbDYpootravhDIOFR-zlY_gNKslgVD3Q7190HcMLHG_xBZIuOH1nCL97RVloXItzGgA4LstJIPNjZt2k0Gh6SSqYnE0LeeoHxRkv0lm-weEaDAryaKZLbvZPt34SxB1sojIXK9Y7a3UHxY3UQhW4fCCr6FfSciwFnGNyZnuqhap_CxvPeYWCHJPmpvbgymPdvTmm3grJYAavGTy3xeAkyOOJ6QsGySXtZfX7fdUbh_zSMkG2hdHaE-g87gWDoWyRumyWzBLDRwHY-oeqKzHfXUHW8akLYrKgTM0OvOvUBTIQ26aQfv3XJ6qgmpKcms9irroAyxsFwY0fvv01T8KwSqfPqvhks5MQhBCnGCSqJWLCGFJs5KvREJSGq9dfxGIAE9NgTE4LU0K6WzAVyEFjgeXNdGIj23Os3tJL2yQLpI5eGKMHEOGEMibi2VMyDawslgFNR1hk1ZYAow56REUueYGfDL06Gna9HrskYsDk3Czq7DDJ6Ur_QrAdP28J-h8yFcTw_9Ki4rHLQxORxn94Kr4n4dqRYac9anqzc6etsZpSxib70dnqrSdauwBP91pPDDk_EjoSVFI-JHomjn0sRaR1FwTmBkWY8wCSxRespzldBUa1LWF8lVmmTXY-f907d4Sokt2amruVKV4BLjjGZnz3VTQ-zy7CZJIxZqmyOaU6A2DqObX8505muL-ZSmoenqHkiZz73gXR1MaQVRd4Mp7RKEgjhSMpQKhg59ETZ-_Lm6jbOVIx29-swr0IE7tPiIUTDEtfhVZCauwojWH5nOgIMToMxRxGVfbjbOq-_f1eVZBigbqQwJPmljnVHNp9Pc47iX-Vw7ZR9k5LpN4XkP_Yi-6weflKOlrdvCkJD8yMGw41Ox4-nbVCdIOwJTZkqB1R8EyRO2BvLiVzhPJpDQxIHpNtp1__V4rp5kAH1QtJwy_UAekDsjV_WTyjmqY6thSE-glYGiEjR6F3_CH-XtPAy4yN6940lU_PEeqGurC3I0M9t0L4F9vz--BJsE717Cn9hhaz1ckO7kypjKkbzDaNFLXTeRM6XvzPuD3ZMj4nJHgPCbTrONGKsn1XugCeqzN3NJd7rDG1la25bfQK9kescWtuw80N5kbfz5FF9fx6PfMssy9tmbgsH3YiickVaL1RPnxcsf6s-CS42qicjUOuZhJUh-4JrhrXznBeeehMJG_c217pjQXbMHIQXf9-dbGowJpJucg55mzazpqZypGyIbRti3p1pZQNMmOVw_txH6W2lSglcU-b-hDNWfC_8nc8HnUjvncd2bOrfXXmfbsL6MdTG7aa_lFgPecf4dj_CGcoH2reKP4KbOnWnQf2ACaoaVuEGA6mx2kxcf26MoNwV8KDzPZT0FLOSl_KTei_VOFpMO1T4GZVVmE35ewZW0eZdgVqcsdx40QibpPDjfe_pxZ6iGjixlvib2lk7VyMBibMtmk_mzqkjPQf2VMXWy-a1T_lW8ETfADKFjORgNTPyQkgYiGYpPTfBefvJxeeqdBDrcC4rH3aSl5DuFe_7Jjz8nlfpU55pk91Agbloo05PElcq-IC8z6WxE4So-k7hUyFnv0GKaFItwfEc6jgeBstKoKsnHnrzabLJrf6aX1aqIn_GjexlnmDr4xCp733eU07_ss7zNL29fPLNDOPJM-4jVDFGlITajXI8y7GqYkmp6tQaYVLXNlKpFGtkE1wumwXoRAS54ia75CRTqHnMLFx0-4UV8v1o6-1iYO-TCTTYYnrO53wUF1FjNqz2J7ytH7PXMoBVNoiCiIBpwOapRpkHo33XJVsTARn6QR0i8HfSdtLY-5rMY1OOTNcPugngbGIUSk8f0xEPqle48WxhXpAgYdoQlh2ogepGfVDEXguCHEh21C6McY9BFYS2AMJoGnGMwyh12FrF-gfj6hRh_DNAZEaHCf6Y0DOKxmG02wLVhkJnZ5Buu9CM_isihj5ojlDbzVtsPH41tZoYdrk64c934H6KSuSxqZsXiW5QDN6QlEzJnEy8QiapHt53DfkwYL8AXwGZAUKgwmcrGSQpW2z-TZ01MSNkchcCcIseM3hvKHKk1lFfAf6sT43BeqTPZp_d3s8J1C_GgkYo7yMQ1XNm75u16C6v2WJx74-SEE9cWscm8k-1NiHzmkiksRSyRQaARPe4me-2pRIOdyXAAmOrrz4FYYeGd5_mfD0Xxo4lqUf5l8CAjA7JteR-s_PvWtpyXGTxM1WDr7Tjz75-owr8nayycyl7lz_M0cl27on80JD1Dalbn7M44WAACrlcxofuAo_PO1HX9k1OV0AF319V7t1vbB4mziI7w3Xe7h6A13f3R5DH1s_Gn6l5Yvz_6S0D7upSA3KumnDImnuc6UYzvm197QA5a10ev5TJr0s8bUCkKM9QoUyHOY0Ys9n6KZjAyu2y9ALIAKasYxUxGJ_fst-WIwAs6X33ovIjigr6uyqffW-useeaOgIZ5kPU2WWi4adkDZggFZFYxRFAkFbT_gBn4CC4M9DWoBiZxgapEZ3YTzxZX-Weq0SEbAd9ySU5SXdHBElm7rU3CwIBa_N_yJBOOdPYedwJtnni2iKOJUxUrkEjOdVrGTk1ZU0dFKEMMQBCUPY-GKA0u6lF_KxNV1e5mKkupFXp3cUvFig09QjEUmp4BM3xsNhzE-UjKcMj-jUQBvSKvgQW0Hqt5QziuIwn_UB-PnmlGkHOPrCIN7BAWNxsoRNRgsxZgfigbhP1QzpM4jcpgvQVjguiCVrI_M5hmZjBFMHPXoid4j4gJYdAS-BLIZtvS15obydZp93rFmLq0HfIAqYY2_ISQ16fDSZwFf_ce8H-D4hYaXkFhIDj4HgDtb42eVKEhqJBb4kgDHeg2sAaYnqbAGvXBlgLFlCDDo9OerBB9PpYlD91CtyuQEcfOEPXlGPtE0MZHsvRY2CkXnjw6VWilCnArBhopkj0Oj6eg7t45ZOuAnif34FyZuy1pvdv4sTj3BlX4iMpEcA0jgizJb0-GFKxUYQYaMzmUtKkcgakSAX-G9G82wAjvCVUQc4y8OPvp7NmlRM7n-7dn3ztexx4DKkSPY5-dIueG2A-Zm5y-wMZhj4BoKBHC567ohXcqttQjUaDDuykpOMTcnfkDuJOpvorToKol7GrsLarpaGXZYFS1ItLjptqqzRgT8Nnk4T8_lAfCP5h4H8qDDweTD-XBX4HN--vI8b7-_dC3Wd-KGbcmUeAYJVlHhno2DSgQy8i3jKgEwFDS3HSo-Y6VliXegJEbBJf47qNDCb91gYGPM9GOuWOgS8ySbH8BauiMhvwPFc7DwSP877FdtP8ceRgOR4-nh9cMQ4gP1Mj7J8ZU4pbJ0Snekg_DipRU9rtDWDvyINnjjk6ePIkPH3kduVhYMbhfGPR2lN2Cz0yW063UmDu4cLCO4yRktVbgmNUPkgW2mxagOdKuGyJohVI0mU0lk-pCErMJdLPAG4GVCJgUmiaoREZqIFYDsVLJEXkvd2ogygHCxPguUNSqErxFKeiPypDS6Sk1q92lxJ8nafoa8yaiMc2SysOTab-PYgq04VOmCoqiYGRYWcM7Z6rT7k1mwRB0ePWe6lzmPJIA22U6TsMRUfmpLqvnaFVEAkO9BOBB0xOA3SJy2BZwoa8imfh1f-6rO1nsrC66q_nZElsIYARDGZFeo-tm6LFGjAZgPf4FTJ50jK83tYgzi29zXS1qrBsofSgKW8j6KM2Ubd-GNG8pyEmTLvozFnq0x0KnT7AG9ZnS3R3bJlM17fXXqiC-VgRMhXZVu27YlACTOd5l0y5gLVi5-x6MOKpLzojnqlj58X-vdFoKKB9PQsSspoEhxetO1y3XyVyF-RFU4PJgIheEILtMp-Ef3Mt2ijh_2Buin8EpWetMp_dVMis_mgBD4LTQ0o60xW8afn6zTafZkcu4KGnhC8ViOsdqr3CkjpqVt7pYxMjD4m3NVkXnDLbF4RFFrO0DWNuADhstwZpu8Yc8v07jvzwzTLwvIXd9d-TswCWprsUILcCjeuej7uQnfR8XsP_2DE425QMjEJ5Hj-IpWagHI3AR9SrOEo31YACywBirphhQQNyUWCBEChcQ5CiU27JvYx-JJJN-2HCFMqI71oQFqVEtA-FcFzqDF0BbHU3DCkZICj1Z-L4U3W8eI2K9m42TxfBcNKt_FMThPEvBFTBPOI4W5BNHZ3l2f5uvSgcE7gx_d6RlR0blMP55ct3Aq3dcIvPdFWRJ14Vh-hVTmlZc7lea4ksmoia9oaa9pPZdnu5xR_xPxIpptq4orh8btU0PMGZDNSmY3tqTSAnVB-92IWZhSamqtjmyDisqNMBfUupoulK9TerXjdh0FB9vKSrI8hettfLBfZwjsPocY6Ng7GrqU-8kNF-vGSpKqueyzJlGotnbem35L5OJ204hPWbl-UzOh_lmfJRBY0h1OD7pKIXxJZ9D84n7Xosru44LAovqSX2jPgsT5ZL6GgsWs42GezR0OGLQeotWwwOD5Sss23QmGj6hoS4UR8tCfRbn0iFaDCxfYAuKCkt9id-WswQNL9DAnq4n9WcsIUmJhe9pgfc7w5RWD1et25b6Fd2V-Ra98VfZNhwfkVb_t5JYlx25bvFgPODI4Ikh9taxSH6lyJMnvPG__T9l2If9Qg8BAA",
        br: "W0EPMRIhbBwAQLSOCCMRwsbJ4BmgcURVr88A9VK8IdJRtUMujaBpItrDW3rDLn7hURrjwXtJCzeGyrCcyd7kSLxsitkQGhq6WQnr2NNG_CVX3DSmaj6TsZVWrzzyyPHFOkJjn-T6UXst73s5iRotfmUKsPaXpDQ1Pc7fM_v7IyzLoqUlKyOHbsWWgRxuh7VeZ37VZp4HD-clSAatdHRuKs_PuftsAmaa-tFb075-rc7V7QNLMyQ3uYidNeTm2ENgU0hPQ5mmerb0JJhoWb_8VP36DTCencc5nw1QSvpeShfdUircEN0yQnQGNculXG4Dz1ul6ek6PUtPPfYj6SzbL31VllNwz4lT3glYgSEFMr2yf7apVdWGT_JFSeBwuf6i9icWVDDDw4yQ3Wwwa6mIBt1EbyUjrdrJ_nSCS6XGKcfzv98w9QU5j72FVfWmJD8YPkwYDNa1719d_dfvMsWqTqO2CFlWzyXPmOAEmKDS8gSWA8E2DqTn-_9bqZ9pdWOh_i79mfG-ZQ6dQeAsW-jIUcS69753P96rqv6oqu4-qN6OegFGDZL46gbIOQBFvXrVpKub-HMaIGbcBPV9QEoBJG8g5UX63rlIRya9St_rGoRORS9bNHbqIHOQOkgc2lHmVqIJQwBj1C2gnQMKYddCvft7tPEPs0Cyz8Io8GyN4bVAFbdaz_P2fqjf61_jRuJAREQU0t_m7n6Y-j23tpMmTbprIcQlQDDMhZQ_ACmne6X_jYOk06gUZhZOHNlzZseBW95wwx3veM9bnnjqmzLo6L1lvxZ3_qODGRy6XkEf6ZyE6fSCwro6cd3ugG1Xq0TSl05heIyF2H9EEEiZpXo0w8N3UB2JJuemBEAFxK0k_9xPM-SAZA3AMAMC3l8TvURjTvwI7QBitrmzeWKMzWsTFicxAYskSfKvN7QBrHQUKUYJyC92iXEepzQlH4Y9tPoaxbyWarZMF3ZWCg_DlC8beikXtSP7s6F75uyZmCkHfaUB4hJMOerhWX1-9d7enou6NFL11ElKem45fg01_acDfJ3N3WHU1T-s9xXmLA7X2iHeNnxx09vaQhMTC2LzdeidWeztBQmnDmgoMPjf99-ikOgNjs-rNuuwVH2Swx83AjFkBsiabe7rJMY0TkgLPIMdPhP0EPQ9wBtqslcDUktVfVz1_14DF9dBdmLYFNGgWG2AA8FAEem96xhq6uFQDWre2Mup53EQ_n4PD43DRALqWOtInABy7QlyRCQKC16kOIDmEg2IpRpmsIfpuyAjMdF_xPf2WJaQPSTVsnwdSYUYl1RpNRPfkdVffVjeBtzobxPLUAL13Zp_ZOhIzKREbcP0BmlhLEHOGSdljYaRrkyIiPEyY5mE1EMmD2IhVof-7nBLVPlPhJMrf9zcXILwp7DtYt55lMnr_pI3CbP96z9uH25wtv9wUrAHeZ4h87g68T-SkLE_A3X-xV2zzv_k_xW_j9Gp7zfx2Mu_Q5EmwU1U8GenHmxOU0jU-yRz7G4B9YA6hsG3iTn4df1IFPlF9-suMF8Iy_JREGBBUOxqEinJjlL3aW_vh8eD33SUPH3YDWJsPzVM5cUzPrtkCQhNY5l7vDbMaOFwHQZwnbGDF4AYAAUsOr-LfgE0NKWfdB5JI_fvq14LLuZW1OVpTIGSoqGdzMNIJ9s1waxo6UEQHXf_RHZlTOTXVAbcv9JFVBaQDAEMifH5jFH29vaQRYtMtAHWA4rDfRpL9RE_uWFodrASS_2m4Kl1grfDKgPMbpy66JAH2SR9mR2ZgEpH53v1DBbYfzZzD5L-Z-5O6-87oGAQXbo99K9hK_iOevlEGLxVx6Tk67kx2wBPcjw3K5tYAhX26O3wCY2RAYV0mfZJFteAsxGPgx6-JWmty28PSFKEeQ7uKPGJjs4H7ecCjwDDECRMb3n3oELl1G3ES6eMcNlEEOCkB0BcRbCOMWr3DjXdmjtXwcYcQj3vJaB5FK6UsYjnOqgUVNCXXQ8-JRoVOd1K4-cX4agmTsL_fYbFjgDxZVxNKtsO_Auxj8o0jcgHyiWvqq8-Da0aDD5Ql_lQUgqJoyEYwzsx96jV-67I_Gr7p3Q4_aNgMjN6OGzo-_hd3x-amUG88J2c2vVXb_oBYdJ5RUCit3zPO1QNdImebowKahMR-lYaZxuKVeOr0LQg5ouoihGpZbMj7WjHmenrVOjr-RRQSqHi7E8evR-JLuAj3LEiluDCriK6l0Yp_JsoMZZ7SgHlQpH5KKis1Eg9JDXgMjO9dZRSRkc4gGmVxk9JnmY7V_qN0hiFw8ODICGOuady3Q9wqwvVtjKtf_wqpYAxLIvNC0wumjOUHH5XkwPavyjPVCf7IIL43SWzOqzal2KiBG-nsUoITD2pDhOI0ENEanqY_j0ZolYFQEZwiJbzJUsMJYrKJa9c4dKk3qVFI9N4dPwIp3FNU0-w0Ne763HEI5aeWEBBXpbMhGX8XJak3mTb7nKLzDKV1wrZq7PJSoZaj78rlCCphW9ZC45r9CDiqMRiFWViUJI6J0IMO0aulel3Fw8tB_AXqxg-gHg2QHElaW3xuhne0TTmWisnZkESMRbTAcm7TapcUk2ACIW9DLjHi8MKUGv8f4PCrPSE7SA5EL8vrQRVa7RFZuGr5tVn1Fh7u-VZVLurXswKJbprTusLOklEoK7y2xSHrhwL-v3rsRf8R3_9VR2kwX9kK0Qq2fw12tMtTghvCELSi6l7iI8KDvPgIwpiTAnDBX8ULzBRhl7DD3PX49XpTamSg3xbqopOfte3v5ucNH70_CzOkdUomMibP2ocs-sYQj8WqfxlQakjka6gc024ZJZGo2G8Ps4cELGsxstqMWCVfyeppbVm9rQRQ-J81t-nnMvFJd_bdKEuX7AHy0SmcvLIKYjd1UG0EvVsgO4A4UFz6pCGmQx1vwOpJikQUAZBCvk9l52AJpjH0om4IFhWdRQu8GTMO_fAVHFRgYbPE5ZqJjwwU1tBlTc63DR6IMog61CgCTUsY0AzrBXgbmxTh0LxlgZQ4qaXVKiv9SxMgRx_P7UUXsmdkJwAaTr9qtfI-To0JM6W4NI-FDd20CERS_lSDUhFIGRxSkWDb_EU5Ok41M9iH7Xj5l3-nKoRuIEMxQ_I0kZjQzd1IudQ_qeZu_ShWEkSdS0Gj2S6kkzXQrRERxaj6Q9t-j3BXKrrUosoqb6V3imalnWogNtU6UkLmgJHk-RHwG7spDGjJTwB7uElDQHbCndjnZ-hC5fOVgB5SLM2o-OArceKWKOPKMVtXxxHMwfCi79KfXpqxk9bo8sQlVGpypABGKZhYl0yH6eIJXrlHdCC0tk2o7GIbkuheJccknbj1G1DDjO3KAT4-1D8ERC4SOnjk9EYgkmiTTHFDbx0bvLgtiTYW7BQMGXqFdgM6m-RwKenzYvb970N7yCpaXsgtqRniDHUHvCBkkL5-I7kNqyiV2oNhd8Lcc-OqQepJQhckM2N0p2hj-jNtJaUXxacZGaN4u5f4o6IckArPD0ohCISg5YVNToehDaVLegY5X9l027W1Uyk3g-PBwIqhShCBMNn7HcmyyCr8pKPdbJ9cPRQOPDZrVRcQKS5Ep5R4x6q5A8wjigEX_j3IVjRV1iVyF4gb8xc0DxpQFhPIEqlqlLwuVVrW1Nzkq6ysVKu2mjJem-RTmkwiNNd_ri8HV9Xn3XknRr2FMhPf_24rQfZ4FIrxhVvRWvZFGuRIcBBQTogtrAjC4EAGjkproDillsvE2s_ZXwk214HxhY852JXPuftSSzPji98syYf0Q0OFsiXgEA3JaysmBccAwE0fovfGnjfamPwkNU1tPR3DbGZOJoGhjL5PmGdE1AFSTdY4UOqHsSwCo9ICSdT--ps-kiQEQBSoKYFH3srZMm6zBSSo65Ztpme5aIzJehjMlWXPhCFYqIsOP4xdLXLKxq5kD1hmNulki0EkR-rvlAxilBZICSa6KysxE6iFTNYlFvTHtZ3gHbMQGNwwvFJUz1zxzlEUrjVbPTDPsayqL02fEKKn77i7oBgN8Aik0fNY3ZHmhQMa5Als6RgiuX7TZEwL-_-q5C4FvLYQ5jMEqHMAUGVYIQqVordpqPkR0WpjBhi9NJ6d0Qr5D0KBf6MuNxVVKVIhtv8DoQqmUyKf1s0lQPg7omq8sYAgmkp-4t5vtPRp7AXqC1VJSoXfu-uWcNZ9jqci__5Np8l2Ul2VRUOurTkVv4ZHljpSdU899ACuo22FlCxQJgT-5mrfFy8i65n4WwhIR507tLX2eJlmhuUZnlfm_vtKbGqJePCJKXSf5g4wh8Nmc6LfQi0BsAqMzJc5IHR_ztid0sO0uEHrPTWqgyrz82M8oZK09_K-gqB5R-cPbZz3bUP1m40j38ebBAbSzKp99Fiwg2Vvbvzt3NGSjeW_OVcNcrdcm5B4tbJ5JShfgp9tr-8hYBe4q4sRV1yZ6z1ua1VJvKwHXlxR1GFzjTbqCFghpPm7gMTd1alASTGf7U2xIIW9WXRA06cOaQGdARrQW0iRARsObl0x3XMBdQy3lbOVHYGFIesoFo0vouKPwtVZUbZo__v5_SZbI4Rx0ZGhGWYF8nuJe4FASZQU1K0PY10wUe8CCYe6VskCSaupHX9UTKYCcke50836uJGcnI6_sCuk51D2QAWc5CYXDwOAV4ZE3oRPZECTMtrNj6cJG2d7KU7p2ZHmZo_0-UE1Vp_KAZDYShU91sukqOpqtkfSNSsD2SQrA_kiKyLYABN6pu9KaTlu4w48nfukGk0bDlklRsBCJByoE-Fg-SHsEZFh5EfGEczl5C2766EOSqoOaZAeUvDq-FE4Af8xJEwgmJxUxIIPQkeUBS2fENvlCyojciHMbc0fdrc2-Sfl7XRAxiBexFJDtIua4ggzqxrks1sga6-mnVZc-IwTBy2qx8HHkHoC_2UDxf409VGvpqw_50CzsbKAcvZJAPXZQM1hb7ubFKgCPj-8wIz0uHqUWyqjY_n-GJaoJR8L5Yt2QpzVv6Zvju-dE2R-EAVp_l92QyuWOrbtCAC9qXOXgWKgBX9JCDF-FGgprVQvUE0Wd4lJaNh2J9fXB91g6nWpVmy_QJVw-WPANr53jc3p-7lnRVnxez1mkRF_0l1DhrairRJbv5w5Vb95SfvqP6-8Bb_MAUgn3TVXZmucqlppko3fFmvK-bdxPditjSvGY8wFPwKZc5nYb__PCz8NXKgpTnLGg53fe2fzFW1ItChlBi0ae5ibTtJmZkOh93X7erX7zxXffsNoYjeo6Zhw_gf0EtdrfS_rUkrWstn2Y6Zdf1NrQ9QvMfPosqqzA6Syev-FoSIBUNPMX5ecOGsJ55JnD4O6mkxYMo9h6x0PSehG3NhApdLHYB0sVWZHReHpyLJkQFc-uKWbPwb7oNSJYxRwjJIkFDbF9tj49UVEvPwyfd_O0ev5nN95PMqc9FlhxUpJ8sTAujxzI5Y2XNgWz98Wzn7vwrng62S8HYauD4cELLnJhEp7tWc-Ni5ow-4NHwGS7tPykhsTlfKJWIPchDDtAwERBpiJWvym-j8rkZNK3BtAUyE9z5DEUfsDjocZWt4RnuJ2XJ0OHu0AyIJvyy-vi9qQUEwc7HxpTzg5wBf3uI7_eszthdP4b1jvXGkgYtyVfLggdi1t_p9c1N18XrBBg_MeMsjsFB99lU9N_5U72jrYSuX21i9LbN6c5ys_VW8aDIh5AvV7itXH7KvOjCu4SX5AHu_avNyv86Z6YRIA5q3_EsGxuA_COHfgXMad-outHHVBvROqXsovI_Ulcy7Sh0Wel2KDnn9yZ3ikdthH1idnUem6nsg3N_qaKYTqfRjeMRl3DnrouNC1zHSX_l8fGXSVR36ZIgTMM82t0YHIjTXnESqv7aLpKEkPUJ4ZFfKoaZaCylpYqT1p5u86Ny-NODn6r4doiM4EH7IT3-J7_RtcXArN95yE8yemdS4As_LBIIvG4RGgaQCxx9zafz4EUAOopdW3wR9tde5CPdL5oe3l4vu1rUJwzH2Wavqon5fSiBmJItLsJfBpuZe0l9iyQKvz5QFH_5Hiht4BKwWeCzSxQLEhbHI39vOEMG0htPrdiJIYLsMWtWHUnbqFEtnib4tbpXNueQqrdD6eTqsxLfPXVLUKp9m1qbRMcv79AcY70IdXEeKg6m9FIy03vICt9JQ_Pa6scfxPJQzshnp13WEwYwZok8wNrjrF41mtJa4YP_GbuerVXHIHNLlor4_7vV5z7BazVNieZn7q5fo5Z688k7790txGxaBA2AB1A7XMoaRmPFzbv-HBhn2MyJ42azY-ii_3IwoeUe4bz5wtTaIiJ6cWTQifq1qJzGG22G8Mh6VHCHk38L-tIHlSb4ASfUUwM9z94vzPuYlV8ylvQMfnlDhC-UZo50UXmOf8LkTSdXvvCixtzmGkRulm2tTM2ERe60RxVUeTxHbv8J3r6u_V1ZD8-fzLx8O3GbkC9f8ktEBLby7jQMAi1gu4GN8Sdn6txewKv0v0An2aM5wvoheDYXqYr2_YwaY4rFNmylI5K44xX4m3ZMOMO9nBEZArxKDd_fJrg5pwVp4BsiawU0xLpmxB8TSxlHSupmnXJJkCPecS19ALxW2S6-qcPXMvAqHy3qenu6wska3zEcah8Jr-NazRqS6SoqSF9fqyrI4geCI1JGmxecogcnqrOrRaz3UUNIDX4m-srCmgPTFutCsHyTcwxlGvyNM2lcZs4F1LcNpRIpiU2gqFdQcNeKUDyW3Hi-Y08BLjHpnoE-qQjIujYvl1arUWgzVsv7b66ygPIZkuA5KLs4N8w8qnH72p4NIvEzz8Hf-Yn_ytZ9ryJPs3n3Tv3p70Ypphv22JSyOJaXiqwEeIG1nVp4wRxIF69D64WVYxGzP7AqAs9QdqvSA1PYPE8jFzZ2L7gLy-Vqfe_e64EPKx1e8T8XDkfixpR945zdykkTJxD-wNL5HkpbMmBF21fS1NC-fly4_prxBS3jxifmOHXV5eAdc0P2jwuvnUQyhDacxvPVNEb9-X_lqvwZcKNqE7fWu0ug5Nlap93f5rJNKT6R9No2Tuus2cQyHrNMxEWO56TeJTtT59qOcHHVqRvWdC9uRNydJlJcrgBTR7nvJv-d4GYEerLeI5LrpNRLKn4yWIkaIZJAwYvARkNYoGSj9AIInqMJF2j3QkGu0okkOfklFjjzxLOBnlO2vX23rrcQkaAk97uTKNJbLCKgbyFyX7o9MeG75WKsQ4C_pKVwl7Zzn8RWXWrb4DiB0otkQcNPe5bqObwTgq344o_V760fge3UAC2xFk7yfoORMUGY4uGoaec73QwLX65u3W9jVE9OONe3cK41q2on3SDI0YeXwiQBihiCGzEAMWTm8Nr_KOq1-uENLAcV6RuTF69xTc8tXtC0KZTE2anlaX3M3R_aQDqtu9k_U7tFbyNRlLz58QmduB-bqHIa6F04HXF0PcYQAjRfbxXiCooH2GfawkQfHbykqxqhGB4JFOYIX2CnTERGh4_CtSemY06xXcnRfulytDjyANoAScTBbf9gE-Ou2PHLSMhYe2NXHcL9fXNwKuSfEWcqBucmGbHpuQGQFbkmEhw4zGA0dFPl3GMCl1kq2SpjTWsaUk5tVMdeLMNZivpWiMcF4hUJcgl5A8oFO7Mc1vyynxbxCf93L83QC5qc3OruPomTLJHrk5AiKO9gKo_CRFqNlNY--mOKZcZuNqqYPe0vBjouLpQfcazPlMu9Br6tiZ_Vg4B5NXOPu7do09IM-9zElnDY4Z47RuUj5EthmgwPQYSqpVG1J2oNrdHLzzX1_2xg-AIhoSlooQPZf3MZiOGLAXC4o6eRL_qDvLnlYZB0nEtCbsHP7i-J10wy6u0WB4kWmJJnI3tcnkktC-3ZoZVGAlOAlqWTvuI2_Dc9QaT4Mbn47ELjoH-EkkLfHR84K7zXL_N3-0sbMSgTL0jAqbFP6lw5S6OvQKQfMq2u4pbxXGCzmIuZ0z5QEXj9XEYT-QhqKTCegEIKdUbieDDLl3UhLuI8lUuvVyZUD861qVA7S7XWn564BYUWFkqRlHGi1f0JgzAhBDtgfaxRmjnKkZNMXVY0BHyAUqP1M1bJqz_biTDjc4XyYBWPbNtcC6Oa0DqOMCpWCaBPeSCJQ614oAqK0RiOyZOMnEhvLee6dX-3jLtGwFe_ZfsVzSExSjNfcqxnpfJfEd4OpU_rul2ccfwEZdTdXymIoZAoujVFIKVCNZthB3zekVc88vNxRP5Br1Xr1Wq6BgncjX7AlhfFzbosDDa0Cmz5uzE3eRj8NN6paaIzDYpVORWg26BWmwfKQt8UFxg6cPHQo9Qtv06P3HY4CGsXNzx1CgT6-WdNlNn8h2iF-2i34O-TtMCDaYokFeycg0hH54bfv00FBzLl1RSqaHFhIhH1MLacnA-yJisf-gz1JeP1AYh0-GpFqNINBQJ23145bUybbqFecykqMU2rGyXuxYZRxJ3dyg01OGPHb8xBbQHgPDgT6URROvHja10TJJ6-bWOgIDQiFnQZFddC5nTQXxtwgKpEHspb30TlEzqR0aJzjuzpJxvGurEWbh5k25HY7pMslveMI8WacRQ12NxHRRaJ0EE24EG0qGSqsDTq7CiaCdLm38-Kgm3zxdCKFLLv8hhZ4F661nppQsfdxbajsrfjwSfTJt-MpTOogVwj14E1x-5yZRbV44sEd4qKwGTTE0Zu8Dvhp5qIEJcYxjDOKn80QJeAKYinVNbqRspY2iknuxHY8TCgJJEKyQmZqZe9l-t1dCE5vdoc-NT4hXP2N5UcnRS7n80OHzSp53jxKYbdL6uCfGjcITxUyVL7wWQQphce3UqGPrQ23A2jacFt8Dhp-8FTVcC0dlFqHWP8F4SDcfJ_21AfWj9jHvqPXERl631aCnjiMvX_xQJOP7aCYMqquxIroNNZCkNuF553opYt2GKMMh_HAPxcYjg5LppzmQRoUwJPygcLH081Aih3drbGp2Y72viI8du90nOox2WU_xDzVJA3LKNAXDcQe-YtiicKV4GDpIJ6BPCeDcavmr2tTZkph0ssZIgGnr4BXcoMWRDQeZqsuLh_gnmqAzM0pqMoeb20Y2R2xHJGJjhn45alCqV4nk2ZjwxUEFBpEqVTOGh6Qc4QoDbsI-60P8MnioP4jkkSrQyxUHkwHirdj6GNxeavNQPrAoJ2lef3xiw6i74PfRnUyI5JCuupqZJ4jDGPVNMs4RGDuOkzLzm6qcQe11TzATEsibIfK-1Ayl0YSU4PxiezagTzvd4Vyqci8j3gQvsvv_tSBDyrR8dVq4j3tVjtsXg-F8qBi86WY96-KXPy8oKNyWXAje3tModRXkjxnNmFy9eL1ocVq2CbxmN7pAgV74fUmGeKYB5jOVa6aFGbnBH2mJsT92EJatrd5d2cYlLIcEeDLrPrDeqMw7eUPj16gpNmbgVxQRMFDvNEm9easL6urg8HMzJZDzITF-9R74KbX6_JYdq_Hrl1r-2uPhLE11hUcttpUMsbyQuebeQk9pA8oBuQSrLcZl1MqSnlEOMdFs0xhnrOXK0yWrmPRs-VhLjYlJewIKcmtHHugzEQ7djG2Ux0dQMdQDKu9i1nUkCGDnJzsiwDG5FteUIwQ78D4dnSiu4THCxo-LSIGo6Z3Z_hdzNsYCdESLvV1Ui1ic8gIwwSdzors8IcHRAZye9Unw_R3qaClAIW0Q1ZHjjLcfVY6t5iWb8QMqQeCZthAcLurQGtf9xXCuuHsGQLoHyCaw_wJfGhSZ7SDbah_R7c97e4MwH2k87-s3rGXt6vm__txRAur4fadnn5m5R2G4GFKPn-uBo9f3z-Ij7bChXy84-ZuttHw83Ci2IuG71CcXuT1i_1-_jTvX8TR6Mdtf7CZgk_TcN7pZuFgyfsfzHvqfoN3DFPh-x-oktK7ldd2eT3_ML24zEr7_HZ9N_xv-n9eb2k0sqWED28DXruo4m_nVOE98VZi4k18qtnxnbqT02Jz0GHFn3TGqmCzJsI89kbIKbiXIuZWEkgOzViyfEEbK5NXvXnQn0Bsd7W556vkjQ_WcXgy-RElK4HPihiyYnxjBLnxirUvz99GdR_vQjO8DgDAdplsdrb6R0Rin2lduPaf35dN5AagWiT6J0C_72OL8bAmCi_P02g2JZgID7itK-lzCw5opHxTji5A3U3BCeYSJxZt-4Ai_6zcq1NZzClz2sM5BxXOoA2VYCOEx3jrKMsAE__BPB4h33kVcivKi7pV1E5Zfe-nDYn9DSQY2oENefOjzYjuHlSUtm9IXt3B0aI9RbsoeHbm2e4K4DghfT_yzWXtn51s48X11SFPZRVZpQqrghWmMaHG8P6jBKbGrn2W7YCMG03u44Yw2VLDwhvw0QOODGvtV4rIgXlM0RXyQrJrgmGoqJBgdbG9kdNtxjOTlJbJ4xhRWTk-6h8PTPgHzel97koOa9ztDZZIcCqUjQBDezx-5in50LFglPq32cd72oMb3gO6vP-fEFObD-b5DNes7kyuON2GN9_V4B29eOZ9XtMzTqupjFtwM-2ikWWs87l0oDKLgZfn_cIynSjBRJWzhGAtffO9lNuTc6Jay_6YW2TdcTt2RVRgQZRqkfHE93E_jttSmF3j-d3MMWoBTM6aFW_J4eUOAiQwivu_Gl9-y8w1_qidpiv51jr_x9Q8VuI16_2sZZ3J4dLhUV1p_qIC_BPY4Q3GhDfTRvsY_NGeP5rqstUjInaHfyFX2xvehYvfVkT4kXxC14VOGt8LUd-Z-4sscra4-6xtHnZeEFk-8NGw4r1dYB4RD2sUL_j99nj0qZhcV44e4jp6W6me-lcX88H9MSAYJZEbwHzWIYyPK664igbY4-l6z0r8VaQDq751DgizCktDvgbNi4p8k_tgVFt5823eedOV_9p634QrIyTkOJ348Nh7gYcGZ-Dn3G0CENFdv2OHEBnceeqXAS1c2s8d2xZDfOk-Gnv3UjpC58Nj5w-S77m628VBo-laCLcm0d3wfpQd41XMyugeb859mxzAnTgAJ31ysK9K-ltgaOPkiEtcMqsEvllhopE6iMgVMkCziF5_VdtSTTCCTrWp9vJhC-FE3umKjSpjwDABJmhmtzsW5DuBp3qmmR2UMSEOK81ml9pp5a2yopxQvnCjF8K-iJaMhL039ScXw3FMpLt3Gk5Op-9dq4ERBY-ZyCS-EdSPt0KbULSlAARq3bcdg0eTpBBOJJnvIzdut9HFK_fC6zJ5vcz98IjJC2nuhZtHdCAq_H0mFeiXwXJbnBV091OVCiQYxDaeb5pwRnYaViz_1ElVIM7pEi4o8yFSAnQAFvsuO9f1lQwo610IJ8oAK7cbDvt7sfdrlGlMTR-EB87soM6BsioxoYsXLWgJ80p0iXBHiL6MfxVEiz9Q6RVDfJBI5j48cnmI1H3caSszZfyzRj6UhTqQjhVGcaNb87cXKhnwmq1tkbCptNZ5_eL3fOxfs32bG5uxK6i3QGT779KIvhs_ftUzmHe9kAxD-pQ6EDhW2ORfumFZiuzTSOFymcRU2x-4SxExdsL72JvDRnDtE1vaysQJHXKI88VOUdeK1ndf75ttbNvOoD3_f8P3GaHP-LFVT5FfNmF9UZFzFWSGHugv76B_o_s7yI8hO_iPFtemN_msSPq2WdfpS92cpPXdlPcLZ9_dyxk62X2-1EBdbcGlu-rVB-688YHndIV8MxmVm3L5DKEWFC5VFCJ_n0KaY8nU08Z62sRGKM5f-zPgsFlyy69fkDwc9PQunSG3b_x70vLwao_6NfbScsp_TfFFY7iiI3lHuXdcjACrZf1ONebh_m8bY6oeUCWOzOVRWrxvtZdOIn4me0BotzJ1n0wx7nTL9VUO3ppqai60Mn5kIOX1yE0RJjSNL9Sn_vAsT_QaJr6YSTsxSognwBG9BsBEX9yabdsB9_VEKwl3eh9BmehTAvko25HA-xXul0c4alWfqEnwwf3VObs3hdv47M1ap3ASaixzoMCgCvYheWt1BH2vAvb6tg7EXLbZ7GxiSC7gxbVBV-S9Mrpy7EBd2hZ5d0XJ59OfvlyqazZwIhElIaoDhrYST4sQ7TJz0J_kMvga1mRy3LdBv6Pm5-CnNm9tkH44czwaf-pXX75Ig-QAOjPQHv9Vqn7u_RcG2twppFEdI_zqeUC7sg5pxRW9TKFmUx1ZvtFpqHcbYxtbaQyIUOz0YwwgnKZfiCNV6lHCnBe_b9eKdlSzsWpaSSk68QdIyYOeuKXRGCwSTflgsXfiS7adssOrRvYH4BOr7hfk9YhGpo9ENFaCajmfohh_MXPxDGxy2kUmathTXg_3uVo03wx7zhXV_psRqhZrGiviPinchorSD3EVM6GH6rQQinM0fVnf3uzjyWAJUaFJMIRgXD-K1T60NqgLDOXSv_Z5V3mLj6of8iew63_BfRV79fbDmsO83PeBa_nSkrkym8j6gyNAP0nXDY_LHRQht56dxYj5HuLoMzvRBwBVjfW6TCKzwDMNHta9ipQc4D4iZvouseKlQBIB286kjHB5vCYpY-X1nbNcEshXEhW1awCLT0L8_-_HfhW_S6onqmcwVrmmHQh_LSyVjwtdIgz4e0EyTPVhLDi8DYRxzvvFSueT6Yv_P4qfwE092d5tF6wtHy8_cP93Aw5MtBl2vnWZAPcXgxluRfOfpL0IW11o3W2cM6H1EsOofxYtzPcazek1DBvpVwGyuxpDMtDMCxYk40Ba-OWprsYZo4sLqk8BLeyyMSQbDwUxdGdY1j3rvDDoJ5yKIpYI9y7yH0QdlGJl7wdAVvU0w75B5vcaQExeKH8v_IFOxN29mT_AtiL8kVdqbFPXSdhEr4Igqmh7KqWW9cxKMPCzvsIAH7gJz-RqkjhA5jX9KXgs-NW6-9T6QYNffnnSyPdwrp6bN82sqJyrmn7U6mOcC1olyo8_9Azqaa3uAtAOSqdcJlxpANA5h3d3hf9q7XFTMgo1pPyWWLp18bNcsJi-_42ezRw0FscltwoQED-Kgx9DoN_mgc7eUW7zntfb_cCQxgv2wVTnvWncVgfpU973Fdi1SW-ghQPzUJW9Vk70j4UIVHGBeffnGRUeo5UyFuPfsdGDREVYF8peEm08iWUS8r1uyYiLKKlKSrlCYItz1gBkmennDyv6J06uNAiOyrGbKEBKeMqH-ktS-l2VVH75VRNxPBUtsTQN-EAcRTg0NwxAZAUotpakcjv-t18BGCvaFTFQ5sHtguFflnfdnZvPziu-dr6mL5-Eeaz7MQBglutzs1LOn-f-2_uvxQSVQLuXAPiP53LfHXg-tbHslZplpdbDa23B8LgUm8l4TVPOdwnAWEsM6aFoiZThu3_HZ7QCKISu5xpDha7Imn9TZ-T9Qwkd-spmuXsWwyeezRu8SkvOJ5Op1MmKyaTBoXXvLcNIZ3M5etBQXSCwHmz56iqkYnW6OQmiIbCV7LfiWRz1GZZ7xDdC-gXHanDWUwvF9e1teYjxBkFjZ_zcgDuzwi9Q-TLCLtGk118VB44Pa8nMLmVD301GZNF4sY3y7eR5xpr-1JaH0bOO0QN3r6Md_XfJ-rL-PVHaeHHl_f2guDpjNcmngwfIS9v1z19ugrqzRjWieW5a8J_MCg7BdgRM_BIhKxSqL1EfZTW5wKdLv9QYHpabP_duTfsOuNRb6a_O7LOXEf6WGbFGK5podYeuwYTqKdXbbq-A9vO-nV1EcpKvO8edobq53nayU_TwAMM1Dh8t3oHAm8xxMWaF6NEHfeY5BKUpBnJZi8Q7AFgIka54Jz4Qmy2E3Kdyjts--SqsTorgSNsUMkuz_7g9tsEBDY7nGNvgOC6pHUd7XsQoY49qEaWHFidpbsG1Yr_bfm1OaP1Go6AdqonlZcLvEwLVtdfqXJ-nRcfFPBcE2MujhoUH8-ZpQxPWkNWKJ-r_fmzyNbf93GxeLDxYX4uD6qrOZas8Br82pFvbIzq38jlQvMHFmrH11MuE0ei35jAeSMUOxu4fsPiNHey4DYRrL7e7D1PVcyrbfj3xY6jkn7B_h5JVxpervNwzaGAdCgqNfegBm_AEfu1GBwxC6871uMrEEO0RcgLl-si-xDD1WmQTzz7yDwHuRIuP1Q3uo1FSZ3FKxrvHXnCax6M6bGnwUtqrqV0ebVtEHNw97dXIIyDQbl79cGQAPyY61w1GIBT9O7thbJ8jI6crGzBnjzarDfSwad0goP2qWruWc7bbz_AtS9e9gjwGTVSQ4ljLY7YmQqhwYh-WVMFTzXeGtQEGVfbzcLOOA_Kd2-btj8qzVjkuYDy7fIT3Vq64-G7DJ-00xBcwjHjvr2ji6WA35VtJrX541v4C0xtAAgLLgefA58yYEvo7AghJVyYgbJQEQScK-twF7prxQsXdMbHgv_bVrOOc-3IlZz6-IhUXGubTTDvY6FoLCBtZDkY5kW3W4PHpoI0CRUf-OnbymioYHnV68bfubYwxdkDr8fg3oEKwxP3HuvaEp4vxQlwdf2J4i3fxciUkV8G6hDZcFI4hMZHltPf8M7_YTrMiS0Rdw4iETs9qe_CPHW81QChfWPR-Qp7wv6TKxJHA2hNwJ9GEtRLb1NX7dd-DwAhxVT-l3XrUn3E16-_nLsWC24WWjNoVIIUWvDEkjK5-__nA6QjsNe_XfVAQqsmD0mIQDIxWsDTPojaIzu22NrkEEVPUT4nsmyJFv73KPfI1Dq_RACVoLJZcR6RX8mJIpX8bwvXB4dHxyZ-_ldOz84tqrd5oXl5dt25u7-7z623jd_vf2v_8fnjojo__7UM8_e_p-fxy9Z7mJeXHdRtexJqjoSzI7e_K3qDtaX8_tMZMg-jGQFZyErP8UEJNgwJr_hrpJkk9HJ49fNPkY9H_4u5LU_O3Zm9VbHIakz1OneHx8XerXLFtlVZb1uf8VN-32Z7-8_3EZ3NnY41MANPnXlK2aAl3BWaB7f8tHoIbVNS0Mr7tZWIzk6gxIqL0i2dPFv88WPq_hHUPXT4_EjZoeNad4YND90TL6avUwuFZ9u_KHl9wE3o4DKpvvMDMX8f5vPCuRkDw-A6gGAb9eX1xyuOh3e2Qab3nvB_1vyX1KleH48qaqZZIPd83WVWpff7t5McVf-JjZ60_xU8HYIjzfSPdoZqYUD3_ljCPK_5MnxNQ-Jb6OKyoI_GxQCsSHZ_j_Kqsf0j-Z5faR82KVWzcrxZHHny_JG9354Fc97WKREbs7vwR7_jkix3ToFutBBmcBptjluqGbU8pf_i473Q9wO0DdCqGniVPUylWHBElpQbUtVD_2RjGojkUUrsBOgcx4hMbL9ac0iFMIge3hq80sMpxBdWS_AW5Tdt_mqQlQxqYS5jZuzPODrnjM8hhvA0s1qmA4zckl_vBEjxK3eEUVvH2btSgzlfGgoH4It3E5Y4jtVtinKkcjEmkUT_5DvrlGcietYE7B4R-8k4oPIXn4_j-4LC_izuaIHC38cvJEXfJVhZnySgPhLkxfRcnb-VMvr050f39eF633nCofAMD8ZVri-zOz3m0t6iMdmwuo8lfHhjT6beyevm0dPfZlDw5kooD7GVWIaHNr1YGkywHKU5ybd7mTJvFH8u_EN7j8GfxSoab1xqBeAW6hWSjcRclmSR4Fywo-wcY__c_4OdYWYo54q39TIGmQHnuSIQqP1fACFimIiXONV2nUFtwQqLCICT_7bb8EllgNxYjkxWm6xQgcCf5Mo2F92CIgiKoyIlJiyxbKJn6Yk20bEyo7iXUflQ7VcF_46Nk4eZgC490OFwCX4mOJ1iQASCGZZh6Jpajpi7DOWFLKoXkqzRX4roVcn1cNcPij6t_P-ZFDSvPGwMdewuoJWMaWKY9xN1d-Z1ap9Hs8vyLeSPmXjTYSE-sGRRbgEmmCN5UmaH0Nm_-XK_TWOa2b0_C0GQPeC4Vp_DnZttIZPdQ0nYzE9PVYu0mLJQQpI_zOSnjKRBBK93PzwMACWw0PLyR0GYSbWgdXF7swkkGf7ePyRZhYt2mVp5eDD8lrrQsjC8w0WhvBvHcHTWWqtbLWY8JOp798O70rhulHCIiWay_oNRsK45ZxMoJDZ0Jf2GVyzhNZXYu8nrI8OMlawtxc0SxCw-qsscC5Qixc0ufFXJNhZ1RbMg-AYYH-rYT3rB5_gKddsiG7jvuMJpcUptQTaS9GO_Haha55ZOotHpm6_THXHwwUNF3bp5iVfVNsGp_-YbMmrxxn7VlFd9o3v9HBslW6maCd-jIvM6poz3uZlXIxGgV3GdsJslrFvfbzH3l8FMJ_0dFshM61D2tKMkifDQboE4u2b-gZAuXdwpvhXLBXEy_5opcjzcYVR-HEEz-GTJed5TVDDJ_2Tf7WaxjpBvW1KN-fmXLZ90pzpeC892cMgcVIbVyxsLBxqC9fqe4642m8GApd85aDOSHlWD2ZXnFJ6ajrp4wQzLsm75IM4XNKohDieyHtbVjGacJ_j-OtGkIsEtTVcwbbz4CwS4sAaKbaIIBohwrwcJtScRizGJMMFIY3pY72OrYRLDViLbgvVrRZsxthIbc-uS98DO4v1p-VIr7VMpQvqSJlb1J66gRgmKHVBffp5MQZjp6t3jLAYP1207DvyXmhrb1eNwxdB3J_i_LMEv9UxqyFEo4-HmeJGM-otds7eaFAA3ctYLJyWuEprhTP9MBNIRtbb9xbuMNBZgu0F_6UHmc2N2dwP40uf6AYOM_Mp5s3U8jtVPNDJJXtQ-w7WSKQF1Y7jRRNWC27Sa6FtNVCMF-om_k5L-J3bHO1eE8nYmOBz2z6aZ-KXTUzJ4jlDCk7blxL6n0mt6kHURiJ1R_Q7g82iHjeBAlwW1g7w8Z9-bqt594mzayDZ8batkeOe3uVTOUXoQFQJDE4Rm7Syx3BFZiT0p8fd0t6bA-liZb33D_enQxfdX9Gylfby3uX02JGuOvJiieVhUtO_ExuUHlng7-xNXLeeQHJ5d6vJDfx8J8Pi1JqNduLA_E5Mp1rQXrCU99iC6-s8gNrBWeMDR4F4aFfCjw_CJu8fsib_H7XLfkPk0Tzn2LtweVG7xQLIQqgtjSjdxEChNV9vnYR7Xb95VfqydYdbrVIE26gaWm7QjUyaiHoubaiPG2Wr6NFA4U9bFwpzB8vHmYdFXtcTXSzziIwFLkBsFQ2OCAlobZyYqgiopxOXHVT0F7t22Htub6zcTBA9WYSjeHvGYYuepd69euo76tCivGkxxxPQ-TVOU8HYUj_WwAY8sR3TtMtX-NJ9yF9g8Mnx00rLQaA0J1tgqGHly3V0ucKtpoD1GoQJfAh95mmavGc9NY8bGq5pX6s-0RN30UG32nYRY1ia4PaX1aKFE0aY5RU6SAoE7GxmwdOu2OiFYyITweFsvKr205HQxT7TFClEe-51_EVEyBq6Qjer9KC702I-F32TPoRkEKZqTG6vHsc_LeNNugQ0uqnTS6S99Yf_PBKvNzH3uExmsEJkb5UNooS9DLjoZswBqBpsRHOoLbhAELL7UOBxQShjfu3lGT9wqsODx5aEjEV1lWTrttLx4ETkcAp9cnG34SMIGKtfDvGy6_FGF-O6_7CsUGYcFbVghIUuiFFfTjqJN8FhrtYVODbp2Y6xQa86MNWFlU8Nj9eGzP6735vswcObLA01x0Nd6RnkIerWkF9CSBDV4jVX-OniDwhap9ZaeBJAWELSNKFUghGroUnJ9Vcv_34ygLJHfXpM0SwqniMIfUGczYy2fYtxqF5ZaxzEGhOZNI0Qb4jziOkWl4D3zmfXuaDyp9A0lxxEk5hGWVNqpA36AssLfctyR1z1J6d-nbNqac4t3iulEB9uiX_bSdjQ9p6puMG7ix1lm68EEVI01y3oa6nL-TagbiMTPENzst1kq8BDRvRvEwuy2LR1I6v7TKdUlMxbG5XAS4k7dwglXc4KLCV1V9wdrHwPW5wqTsBLOWKO6r57vtXzOUyDopxEx8kPm1vNKb6N0Lmcxu7dCUeP8DHWPzq6cOj41E0TcfGLSG6jHeRMv_xfoArWZxrsWOtEXNU7odAIJP6gvMotyIZVLXaA925dg2YsoJwUyfvB37GNvdWU0hk-MIpGvalKSA_8Cq-iJIo2MczRBH5NSMPZpSnyWDbNjmYDb52noaHMSVwx2oUMmZlIRkUwMDJI0xEEwJkbMwcmGhw8owsA5MxCU7iTjE2yR2qU1AhjOWaP5NA8LD4yxPgor04AuCFG-0B6nV6t3xupxLbCh-ZOHXgEstsg9T8SMlECEHJHRmoR4wUAIxKlRWwUR4qX6wYq0l0ovyiH3aC6q5YbbuA4a4cSkSPAccAoHkSfR_3gE1CaFBmB7WSK64mexL8x3D1U4dMeN6la4BgiSxWiKObex0vv-eeKS5bamhDXCE_51BWSVi1QbtPkFFPapke8qeSQ_bdJoJqe-COw315bBqDaIvq5HVjB9tSlHx4neSgncrSykzeVm2v3rNg1e6ujngA-volkCg1eUZgUYmvjGYsh5IlroNLMurd3Y5CAA_e-Fc5fnYmX20h1CqM_1n1aOpkIKkK4lJnqfcUC9oNTAcJ-o_9c6s6IAHxBuQSLyKSnKR12dt4yfpCd3JoMhbwXbVuoHBh6Om36fUodT8UUDQZabsTBTbA-MQZVuTgZMI18-iSo9IvOLz1BF5WhWb7FJFwe3XT687M2Ib4wnZMCfjS5IwoOSHTC8E9dta4hyFrjCo7Qqne1feJVEC2cP1IeSbtMP2aXThwBCpcyNxBTIcVeL728xZKfhU9NrDTmOOwGnUm4pXWvmrhDwe007owowP3ctOvWF8YpYVz2YFF8lPvrGkKucBkQrnB9jO8YHyqOyO_XsLGwZ6y2vHktnxr1kFqS8DfVBeNzz_l3PfKy3CqAFaba4n5CSxbfi19nzEF7hpINkg98EJDDcBvzfWvjGXDmgnHlfn5wPi_J8diNTm4TlDGJZw3xZFrw6OsmhkgaFzFgXTcXtgscQd4YOFOTsYoUdxkdJh_Q-WQsYqbHPuu9SvjpLF0EBYGdBXT5ubjiYQQrX9S4Ux_2eejmeLwylMQloK4Yz42EBqFfTT_Lva2pZ_bWXrHbSv0tYzRG75O-u4JkeRUiuZ703u-7AXbrkQz6W86Pzvqj-jgHsjJwyhAVjwFIwa22U1oJ60FeGIAkbzABUT8hUMajzATyVoas0CkoJSsajVNM6qjO155V7FdypuRNUlSeBNm5qNLkRB35pcLJPLIQUxADOV1w4lQXp7s-rFL8NStgeJPCYlKevZRdehk8X35HG8lfAqMvrY7NXAJ24-SSSWZ_s6ayeh99TS3k3H66Ustwc9yHqwExmfGFsm9lAPJ4ynw9oPefgJVP3dhSIm454W74n_zC8gw4cLybrX3pmFeUc6CQmSf8u3Km4DfIm3-I6ffr5hx9un95ad--vnu3ZCS-M4FFvXt3rsyUgJ3R1EuXRj-M2HQWweBI9XTpNekrY_Gls7ajsd2Q8ZOOdOa2_x8_bzoWlR9tdofSz2Z-RPLWl3wZUdxZpIrvzVhKTsGfaHrFp_KbciOHEFjJBbrDKcuUVw0ENb_FdsT0Sp0fVA1U45G9iSbrRrpG2LkTDMe8rWGm0rUXFzZ3V-LbKtI6jeZA6tNxnehH1lCY6UpV2tCyLbsDq33l5PCGRi4uy-VZPJ94yzHITTfwAnnbVftd6VLNnZvRlYg22UmfLfStagig5Ortru0o7twKagEwzbQLYCE5iNDVzGY5qNSbW1yaH4DioHOiTOLf5SP59k0KckPOh0xaH1brMNgSwvtGmEaZR6h8BWtAh2t32u4_S9WvtmBRZNJvD3ru2F2hi2HetYi5DnB2xpb18HClaSguqA8EEOqOXh4zGXCqmh_UKXBgWTCa_JhrOzjQ20UO419pBUKujiSBGeeuorzZBOIaLG7Lfh9-I8eduygfDIYgL0Mza_6g-WnNdF6NQQRB3MaD9O6cSQ-o6fc-baTP1cYovrmLU2ktq2ppB9WjhCXnJVZ-LaX_jFFq4zdk_ggIROvQ-eDW24rqWOhF_9A2rPVm2rzuSm2PTx3m-iYkcqtWsrwA9mCOLrNq-jbXW2cb2eSObLFl6adL79t4L22_RR9PMafTE9b71sj0u9PLpQG_VS_Zz30fiBaHwWbIXnAIkXulWt7Q1hLgb9zvvAq1e1FPkof8X6JYwBGo_CFWW9-l2tXwFctvb5w7pTIU_3d5n84d7ZDFdXNftmX9YKcxEWbnNnTXqrAaaG2GGVXYkeceIiRlVcUsiFRKdNEq5M0ptPq18mSk19CNQqAHoCMXOGCB5fEnPWiO1zYczqjqXMychR58Db6eXQDobgczvX79eDQm7SkQBGk9348c3nz9H7rHrz58lXklYjhXgLCGC9vQBGpcNknNtu8_PZF29zg_kS6-fuocALLV-0RwQyLVY2quoX53gdPgY50wlrcMqcHQ4uM9ZUYgK4kOJwCXmHw9ry9qDTMnYjbVUSwGX9a6qzJFuwCcrRNepxIbUVQVOlFdXAJtMo6Rb7ndM2by6exXtWDFdXxVRBcLa62QWSEooo8bMJuXEPPDQj6wIbNZJWgQUNHLsfEMlwyzG1EmEF_wDr4ahfA_rD5PskjzDeTAgHlvseSM-FGqwFbtgv3P9V3Gb03XOAqs7FGf_jsojQv7HyZhhmADLdbfRQAIYMkRVPgEVoywEQN1zpFYAHt89GRwvm5ZLk4uHsZwrDtKdVguB81Z9kavSsPxOK-FRtgla7RRUbs4ZcrQ7xLIEt0dlKQI9xtzFnFJ1rGNOZ1OpiM2lkmPcDniiZFIM-ilqlQBaya_RsHwFuVB-YflUkVxFBLsk_yuJkHX8pZneCa3EKBS4NZ6zU3mA3Mm8YFFliZAWIA6zg3K9rajfPPfDFNkFrdEhVQrBufJhjfr-_seklA7qgLAMOvTVMAblXbaH2iuNk0QL3MMWKb6e0N1HtGiT3Mtszv6lbAxDSMoor34brBunzOhy8kZP2mbLdpYJw3Vyo3SgNekCBuUflMvmzpYOzU12o7VhkxIV0aTNUfiO4umu_um99OJhN-wdqm3wf7nprtdMq4stsOv5O0KgIfTvS9pcflS4759FR1QmQ2tObQRska6ZKYdXcP7hcLHQITilOGNBOr2a9XlRvR80NBmx_QJXUtGRfDq1yPwPFg6ss8gw6r9UPpNk1VaHFL3Doei5vgX80B-uO30_Qz36lOuNoyyzuzODuO7Z9llVbgbwh1GbzVrKK60Iz9OYBh6GJk88lRO0gnDOV8JGqx4BQeNbAydTVaQjYWxpKkkw8ThwC-jrsKd25q_LEN1PX8NG0Pqgd5y3q5yKclbOZY5yztAnaq55t4zZguVJ0gI-LdOi019pbSkewLovyZUBDqMj8QPMIiUPCVHC3YBPw2VlNzBeqBFgt2MtD3fVziupqg8GWFVCWQHNGrItjQd0fNORl5jO8LKMW-cCpc-KYOrJSvjMUcQs5oJ8qIzlwpOPJvVfh8v1iM2xTQzfMl1zyqWPf-C62m0PQcLYcoY3qKrdth30g9QDuBV2C7ro6P4H6KpCF6lI1YH85Qch1a5OjUsFheYbqe-KByZjvBA3PXDqEtMsTYV9_Qltkwhy5voUEAZ7fcZ_3Ha5OYRwyZaOfOgyhALRbejPDHOez0_82GTJkjgW32aO5N1d5WEssOLTC2WVQ8kLxc1wiQmiKIGEdRVSvuYyBCi7-STYOB_4TrtRqyBCXMghcSgW9WI2VgvrGcGrCaFLlCcAAbvxYjvcjgb-qSBbUYrjBPRFB6SIn1cx15rZIoLRyCdyUoCfqIskbyU3pPEN2pnoIOO_xScLJk1w3tB0WojirKjSFiVzhNKlgw4ULVo0HeKii5bU4PSDR_QHrueu-o42p2HGygsUhdouqet2OIN4R1JagH4kk9Ftl6Wv0ZOQupNFLVb2Q2dJUwQht1eUQ_C144Aasd5nOkBVhn4-LTwQR0Nn79X5gaJ7WHgHWF3mEMNV_MzpuOYCVtHgeErtL62gnsYoo01kYRmogHxIBuq1odGupqqhwhFUS66qPdczMDz6fDQ-4bIqorun1GbwS6zqfjkd3Fx3dDpJj6fdgdxT1dClQ4GQDZJEiJdpcej93KGRZvCfFUI6yQ5jB39RpGP0ZdBlkiL9jEyvHwM66yi5iGr9pPe1m0gkdxl_9HweLqbPNCcFcbLWcO39glSguXQBw9f62_xj-_5jLOEQeeaE_dCslc3qUJDfRe6b0ZtT9qRV3gHpYIjvyjLlWfX9gHbTRQz8Ts3PxioED1cUV9GDJHMxs3ES9XmtnfpA3q5zeh7b4uAbrhuuSW0bwhOPv3jOMquMVwlZmHqNAm-I7UYMTb27NzhTNsARmsEXlMdQHVw2ID2bSNuv6AgTPxhXFBFpMpP42N020bJZSoPJZ16H3IzdDxEZXeHa5dFC5lFh7oLD6ua_Ry51hZhZsYZiZAWEehGlOmXWKLPt83rcZWGn_u9Ead33FsGcrfia8cOqT9DqAwiFRK9Y8XoFt6CQVB5F-ISfPghQvcrE4zNcm709m0TzuShFnhg-ZAgBH0MvOL4xw8qxrhT_ecxm_iwQrW0O4autOuBroWBu1wOWaFvgssKH7GOfGiuvHGH685tyMJVqwqlqDeSX_qmnNhLEiOznSWZnJDIRVwNRALqiNkpND57vXdpZAggkmM7OWK7kW4JLPOczuDNnCMYlcqR5Kpf4wYy-MQRCrAfDlVR3eMmqbNFdyk1s5Zc1grHDqhahPUOspCfQMSjW0OEbHGNgXSF1U8qNXle6tosK8nOqcW0VdxBUNVGBzVgTpdiDTu4wJP4pWefFXNlBLRB7iwAb2RGabvvV68QJC8km9kldzOLifCGEEO9_KoII5v0FGyBhoLpf9QWCzxKabO5dPKbPOWNobNTVmCc0ois672B-wQTp7LcoCOCtwJNWUal7skMtOoDK6bM2Wv2tvb2cQKur58SdyzKqc1RC2qgR2xt9nETjaS3pqDVTPmeXxbXufHJx1ZEnx9lNClc313C_B6FU77obmRKZaifUwy15P1YmOFfSmVH4_hjFX4wuzVXEnlOGhn8YoQXjmD2Q5zG2FCsFNtesWxnNfBwDGbw5giLIlrVMS6XnoOZW9-s68fFqby3-pesre54l761leuFlcIbPT9q2OrMhW2lNWL_ABH1HNbdMV8Ip1tYNVnwTWql5Uw76bH_vNGdokCaEzPsSAuLWdOI9hLr68ez5Tw1eFQ6N4LTZVbzSrkQmVCueywqMjMBBfxYTtN55nPRpXz4fzelFnVTMIcqmvq48epOE9vnmv7EqfgDMjw_Uvw3_9dR12jz_GGaQAdfs389XNVexVl3AmNiiFD9tEqvH8iv7R-NqKVBgMTBuZfaOSfuGWso3YJKHI4kmkyPMtWFAeurv172nzGp-ecOCDSShm3AZszGDq5nUjMDPtpyWhf_g2Kl0vABadFb3Hcg3uASSV-7LEYgABx1kyF1VANjjOuSCAgFqtiKa1-551BTA-B60VZj13hpATwIEASCJLxcmIsLAaZGgbEDG-WnVzPLDaYsl7o-nbH6m2pc72LMpwGe-Aduuw7jkAXFr77xSuIk2Az0kzq8gBsGvR8cW160VyoNA04aIuqqHvK9TljZVa4xSdirgw0bva93rPaXCRMeC251W_F7pPUH2r2jRY5b1iALt_j5vVTli9e62TJUAeZsZ8L03FHKQERCrsxJ-ZDRJrk_wk7bGUOvxkExr7bXuj3TBlMdPTrvr9nOWiU9Mz0TfMh0iALL6JPQPAnWcU2Gw_5lS0SLi0VujvOncRc1Phr_5aXtQYZEURwCu5Lc7CoTaw01gjt0EtrCgNNVJ-EVnCsUxpr42VVKQraOvqE05EDOYbWVyPkuLL0vdMpTnFt03EYQvTa8EfOQF0lEBGuSK-AFElZMAWJaNVfl6hhgV60wjqrWwq7KM02BlBnNqkbRa3zsjYx7pItoWSP1yIVN_lV5NumGhk9NH9Jeo2ruK_O2_5BNga2qi6ZLG8Zrdijn0T46D8C6xNIAZcX2WecoJob1uG11P47R3NUcUH078JIg9E1AuQiDFbdeHNyykPGl02ZAKk_mhsHaNym0pzcoRuNYZiF2ARxHC4-VTVaIVDMFII5jCaTbFs1luByXq4Xw2E2dH2hTRD4NnYYChYMq5iBK_3o7WXKUkoPvpTSF9-lW4PkKw4JM8Z3eaek1l1rJSagcDv6OsjKtKyNNOscAqih8mUupxDN2JKFMMvGQM3Tp8Mz4j5HQLhdjvm6EQnvsQ5xhoNyeRHy8vprQJnh4G7DT-oJLPCKWUaaydYJgyhlftRSmkoO2lYCBooRmhZFiW79JRWpJNJwPaYHwwmRtSPzET3qtbZZ5nJCjJswhFK5qF8rH12Fao3zwhVoVdt1B0PSqn1qpCAYQ09ZYfh6Ks4-NTg4O8jZavEja70u7sE8O9ReShu4Q6vDJYahua6KFdqV1prd8mxEAH8Fr5OCkmNJizB_Zyf_oRj0CzsdISd8obCJdL0uxy6nhygem2Es4TNGh1_aAcwqjNuRpwZBI_dnSb3lkdNQsFLY460BpBySt7uK7MdksloxWTREw_GXuyWtVuz9Hgn7B6el0l7M_fab3Bh4XNr7CKOHfGtcwqKgciHXZecRZm2Gh6zWZGrxZX3bW7fyV_2w_LHhmF8RbWfe9gXnStu3E2YCzwslnouHURIrbe0A-ta3iZ2LqSSuVl4J47KD93vAkJ_lKHS693dzIaTxobIZKxs4RwZtwXMWhjUiG9kq8dAshdnxUv1U1HAGhoW8mxlfn9xXGYsXrWvG0q9KPhmm7-Kn_VGhbR0PbWWeH4wYT-J9pm5uqztoQaNur_UPgM5A5goYeW0GcmNr64RZ3K3PxXWuePY7o0Zp-wiKfpdWFP4nPcwYwsbzhMs-HYhK8VsgEpcx5gts97o8bkiYYnMvTctuAXl8l0SM0wJ1riwMN0grB-XAOEG8Hc3qRKp07xnmO-LnytpegmAqjwaFtCO5eMKHrPLVbzaTF13jlCKiGt4q9v0UlKcRZMPi1Ci8J5ok35ofgO6ZmEimkr5rimwfea7F23yvd330-MCiXNLs5Nn1cej4Ck8Q48Q4yoZelo9Adt2ae1ghJ1l2SjDxXvgwHTI4wkSu7t-QxH4KJcRaqTuIKRgsoCRzc1-K_KExT4i4DEMb0-pjHY8ho50-9GyGNNJ_ROQyvVfasJ4GZp1E_u22KEmplqITXlez-XR-bU27-2f-DEvnSa1de166-pxMsktresILohYxRX0X3E5XyQcwxp_aJGAQ8UhuM77pdtWeUkmfgNgN8MNXpUGjc06TZUFJ5cH-PCfkLdKcLGuzh8ls7Lxx9IMx-dzvFA1MJgOuxfav3CZaz510bzb6JtBPBQ_fUX_fY3-M_VhbZD95oc0U6dmM_x0bNEPt1n2ZPPIYeJMESFpFMpQ7oq2HrG3LnNnT9xhvkeBywGYVl6xm8eLT2WWJsoXHw8ocoVjLtiJWX-VDPaHcFTvTCfBFEbm0bWkzh3i4GhUFO7sLVkHrgnOdk_2V9vjeXl2KXUw86VojyWwFynCCYP2jE1fl37U-0ju4Nyt8Qe-yx7Ffs67JlzKnTdnX8TySLUh3Pr3RaF7Wsq2ynL7ygaZAzbq9T0xS60gJ8Ed2rpRR-R7cI3ZV3jYGasCIQJ7ZbmDrCq-6bRLEySa-gACESy-L-t8QlMSlOdabYU1UbmBnqyiZpye3k7xlWcyhrWs5ZSQ6dkUjqnjIafSCv3pmnrXpB2xHNW1kaiwRCn6kudjZ6ZUxcnvuI9mMC3iF5S1EeOk1btEh1anw5T14oZ8unAbIyhgAJ80UBa4rmwgnGEiyHRhvJCqysQsUVOpiOGbVyO7krr2-ilbyWx1s3Ud2S63Q8kL1hz0VktfdNYWzHmdV0R1nNoqTQIKErVFUgYUzkhp7kuJgh_zjuii9LHUSIxnpPobg_6rd9N2Vls5vWlop2SsViaNX-q-gJDIGCqk2Yil6IKUBvCQl7-bLPVJYUaYpBedv2uTr3RZXlnnjWG-JHiGTwH4WkMklpWsJd3fY8OZtNZs1qwbPyXwQG7YsFTXarf1YjBEgRglHElmc4cRgvTuyrvbCLv4TJSJE-3nHpBY9dsCCya7XGewPro_luOp05RZYhogqF899Dhzp94qWY66-AwQ9gDpboi4iJ1omkKQWQqb7_OExjcK5tBKVvcmHPatsG4oy4cEFbu6dSb8spRASLP3MNw6I9T46M5tPp6BkTz2nGZaNG5ZABCUUiqEBKtm-UBAIGyskkw4IM-xCmnojry7fTGlLRwdmTYp-3QvWkQ5Ud6eb3T8hR000wswGEThoARUEEmMcJI4s8rmNdYUV2apNXogEADlydWubA-bijslSadF7pgkp6atK2CQYe8aidJ2uaxyCXnN2cFU35WikQ7UHqvQUbC7Q4QKJDL2Lfh-B2BYVpQQGEYtw0wpKI8qfmKbOCCn2e_IA2-aK4LQZ9IGq4x1gShf6DkkBy78V5htU4YyMmKT9wRtCsE5Q-be3HoxjkLh5uc0qJw-ozyNhr0kHQy3OJvfnj2yBnCHUlHdV8BAgwwE-0tPv09-agblyifjCGM_HNMiis6dRKC6d80SFgycZCag69MJW3L9MCzExumErae0n7JDapMpsxwydg1J9E2dGBhPpNMPz0CrddxycYZgnRG2F6RqoJMpZ1kDt0JGdTbm93e8SsImDS3LEP2jt7jm7AoujfQhlTJ42fj2yO3KAdEOKM1hHzkS3N5gh0aORpYb2X2i8ZIgJ36nPmr5fUiWo4dB4fhAOx_3MKEl3KHfIXIZpHJb9h0C6Hsv2Wl-agmvlMkCSLgPqMaxp5oZh-IJmdObvW8WSRadlgmIGd2qhyWzNcPcixrYnFPaJ0ZBobHOxhc9qnbMXoEJtC2hd2augt9c1dKPydzEJczgOJHkQ9qACXDTE6aFXl40qcs2QFIHkJ7qLteRJCKqW36KcHs2br_1_WjajjXwUs8WxBzmYIpw8Cc7-4Gn6c_k2TBXlcfIuqmLg_1Bi7NbNsyRsWI4L1B9Qyx6U3lW-iz4bnZljg1K_90ousZpmj78UWUBxiFmL8jAOK-35DRUz1jHTDI-kJDNE3j4bIXb6gZPyMHKLz9TcTJsGZpm2OBDJjJuwEZTCI54dNBv3EY-UbpWMFnGH18Hu581qxoQA5151Yv3X5VHruCEeFZ64XtCOK750m5hsbW7b2wPjZTSFukTyvWsNupGJffESv2HGFh2SDRnENj5wpHgZlu9lQkrLmcvQPvdyLDoNPtGN4bbZ_c3bhUEqmEQI73-g22A5PTy_G_tRbYWv2BbmBhUqocbVwaxs8DgbdKWo8Gt-SFyonCsHcKcMk9bPQ7ELiMZyJ2Fhymny_2YPh7N4BaGo42UxLcUQZgq1th6OaXrbjHQVLNVjY7_rg665hifDW2rQtecU-Tf9cfhI2EgOZ6cZEQJ8vNT-t51sNSKCdtwtrXKhlN4n58o02LOf0MVQo7fOVmd3TyXjWWIMTsf60NBruYsiT4mVbw8xAXcukOp6avuHEMiI2wKqlDf1ch4GrMCV-XU1tQUj83jKVJJ6pWD69DmGaqu564XbdxDAUHD6WHoMmOT8r7RfUd4K8FFjdaY2ayipCoh1bDjiERSYuaF4rRX-T1mfjYtNR9Sqa2P4TrFF22OYyvBoh3HjBG4AiLQ-LexIkCvin7I1VgQbEtGz3dHPIKUkjy0TuJO9Wp_s8WAKj3D7MQfFA3uqTeFucIeaTaH3vXbZs8BAf-DoldaKFGMDhPfF0j2zU6AmQKGhLh8kNV-RGozszsFcatFOqg-dNO5QrKUPOjPM6atY5UvaMhmQ7JoIV_P08mRIX8kw7J_AuXoboOCPc2tgwNcd6KV2rq21--jhE7KUsfQBCDOQKVwujfxRNPZNKWgTOZKHTJdM92gRYZcLBAOgyr6CLFE_zJYQ5pd0n2lUdJPlUpJP1N2750Ka0j2Nr1W2yHDnLqXc9fdasw8SYT3j-53qSpG9jYugaq3y5KluvckixkjDolvYVH7Os-_aH6V8l-Si939EdPT_OWy0vGXI9XKSV5snPWnvNLetZtV6-3CK8XAYUlOd1-69BBPzyaWFhlNxCvZ-hWanBROEDYKHzgU2N8uMCtcM95KK_NoWMBZVTfmYXoUPpol0rCdb5P58YxnwxWvbYDj3MUQvIvliC122m2F4Mw-gjCYJ-SxMzfhCTHl8QRjHXTlHhzUdwnamgSDJ1A5HprSuUvd9LZ_N_mA8FiM41A2BbaaBhR4G37XP5aocl4eyRs8MC7Q0uiYUgJXOctP-j1g4C4sPW4KaOXwUae0JjygmXS61FxDuck9iqtryrHwnW4wGMOOY0cz-nsEdQxT0ldnzIyT8jKyCovXywYFYK66LmG-xv1WZv3lK9XIfUHKCPkpt1yEMzWn5yGdZ1SHz0DKmA9WF09v_v9Lvbrzt5omz_z4h9Q72r3q82fb5q066II-2X0WSmF6y6iQ3dU0RlKJhcKegTGgYThZWUNE2EmUEHtKDnJPf1ZNYIvtBz4bFvStsWc9UmBRIqxpaIZxs1epibG79XliI3rd2lKdT_YlLpdM-CDoU_0QmJpHPBJWeoT876b3I8GchpM71hZ0Uao_9kYhc6Pkm6Qfpy9sBr5NN9lxpOZwk3KuA0iG7OKo43xI6UdRsDIwC4CI60cNy9t57T94v1_lx2dO6HGrcIXdMShB02WYoy7uZskbnJjnYjAgjGmUk0ur5onHTc2chepg0Im5__x44bx8CrNZf1heEKRzecys1vBFQta-dd-2bpvT3DPqNW8yn9ZSv7Rvcu9aBO3v_96f7o5rfQ_hby-9_y8_DK78jHq4DjTb4XslHootQk8I5omHqhP98GGuD5Jf88XZpQanGkgQL3zcr_dnfO0f_ujfRz199q5sYexh8eHarXR2ZI5_iz2_7n3I78rvf2eVetXrvE0P57v_WgD3o7inp_TwA_YYunlJQ7GAZ_mtPduvbiis__z8v_AdPNyGWesIdUrwuvp4d39UtoNe_GMeyP7yhw_r_a3VfH38yj-eG3PaqOoY5og7a1hLOfv6tZ2lq5PubLX50nUZ-CFHroMhzvuGlrpa81UQwBwX3HB-oQNa6bJi0oOMY_WqeCNGwXe-4qvwVw7kQvM4p4e_cH6AUxc5N4G6j1c3b4AbtZJD9QlUHbIvv_neLbFBymIi2ktV29SSsuAvNXuJ6nbkIzTcBEpAbLFrC_PrJCvKO2ySOrwNSInGwm9a-jwCbcUZXs4fdUnBGevmk1OWP9PmmgeQlLTATyUWnbTny92e-AH1xP_kEwExd7Cpb3HvPGmJkv-tGwQiMaulqbqfOSu4sX4Q3LG-oEWcoXgBQb-5Ea0VbYeNPIZP8zoy0CwumYxhqcNFGzN636fBzJyrR8XzYNGhYh6OuFnUxSeHhKDX3HS3Y_KBFYZEms7hSoxGtmfwKxaL3Gm7vI_eqMgs011cqaWNlNoEDTM_aW19ijDNXUq9uEcmmwDC8BRmDBz4Cqp2T3VJD7C5z7AdNHznGjL4YigThJZxTsDEiWYNmmI5UG619agL0I_EgHvNAI8JIaaBrMo437aOT50OSp5zz5IBM8iJxf9O8D3MYCS8KpjlU_NLfsq-YgkimPMkFEybQM5vcUAblKjqr0ODUdF13K_bMSzQ9B28bqC4qUEfCUN0zSkpB2pnknxQ2od0yh6okoU3r-mMijnrQlBpm2kNDdLAX_OKHt1AsuaCf2lManx1b2V8xFr060E7uR6O4qSAXjhCn5nhElZluTxrKQMOG82OwyIFGrUEmu6FkRl1YQyELD1j_rH9x8_qwVHr0sKYoNfCMGKDECLhrjEfT9vTFmk3emxx5lqmqx5SujaoHW7FsHX7u-v6MJ-p68NP_2z-SuZGtsMUXbNZbaLJJ3ml5YSok7C2x-59oSPay4I5WmvTFQoFeGJoZvcaa_kxOAeomIBU6y1NhqCdT8qwTeFsQ6mokINbcAL7Lho2s-eVM1PrNUsqGEJz7fk9g60QVuv6X4DmaQCvcPInwVHHuccv_9Ei0RLIsl6vAUAgvHNxzvXxrC-rfn3NZWLOzAERn6uQl7Bs24tVM2xIuwXVQvz0FyB23LrG3j6rG9q7lILUFIGr0R8iCs3KfMPvUdcChgVTVMwP3ggwWDoBmUHMcbS_IOzSVJ1Sq3AoFjIaa_Om9EiGRjvqRvukZFdxpQsjeF7rQPpdtq2Ati0gGIW6rFD_7wZvZNdyu_GN7ihUTNlfaqSQc43xlLAE1NipfuxDaPuoAnXRM1L4eG8VuY-1_IkbbKWBcTyxHPIexOBW2AtxOLJ4NPHLduxCMNY-_XGZ9uYVp2XYLnsY5oDfTygFQrjx9ubiT9EgcqMd5mBaf3gcY_1DN_xFynPiGM1T7sxYa_RzbWAFXBENvkJGRN1VPcOUtMM3WtjpiuEwgH6rCY8EsrknIPtggNIHd1q36Wvov74ZpbrRIQAKBfk3yfxqpXQ1vmeuZ3OwQzPoNp_C1GddZ9S7h74aD5R7Fl56MDZjh980XmdULTnBAqVph4-ta1Iy9tQ5SNPS9jDwhlueeq8XWEYyyTnTHRrUjDuXZk295mU9DLrRFmtih94rjXjr4yCM9-paLfEBfwMXrcbrg4waI00fNXqPuml_eD93i8g-WXzG8vrcpg03DJlrnVgYhogDB6egK-4B-In3URAT-10M8fsQvjNw6UlsoYuu7s-svbKXFO8J4pwCLcHTNi8q8Vr9B7dgWESQFfkWxVPleGysMXnS2_CcJp6g-csNv_gA13Pv3ULriXJK2fjfk_WbZ7SY_bpNvPz2t-AZKZhVCuZmON7jJ4e1mZTwMJCT8myqmJZSqAOk9AWkzUAy_7pSxDd1S4RjzHkKw9LdTo_EiTnNYNgcEe7RknHW10A1kuiVOpBnkiTWk4C3nbOb414gaMlJOg2A_1l9n1ji2TYiNp4NAy-wvR8ZToBjnbGi3uF098ba5Om3QDVW27HW9-6Io4h6BCYh8RmG-fzfX0jmcdAg8UJIjyEMo_RMlWnCm-IZXI8kIlBHpAWG-mTg_-cz61H0TvUVPXrs5t5Q0cSde8PQ-uurkYIFm6CUQdiRGdBbN8Nk1UMUCqBE5NV3yELnrnimbis0NTWxSdtXRNRKKtvpaN0CLgJBTYGz1FU0s6P0Pevkx1oXVLhE2sb9YAWFVWIBuqeK6j44Th1YzFAyBaVSTvdPSW1FhWnmEr9sexO3uz7qSubUu24OXrMKqRi-lLVpnF9aCI4iYK0-jgFf9i4X8WeUOQLN9d76EEf9fd6H08MylNOZnI_KAMPtM7mLp2hnn8Zm0p9kDJ-7o1u0-50aVSqIxKaqeZ2tH5qUVr4Wbs0E9De2XZdGBYM1gi3E1D3IT-TXnrnSvU_rQXPUup5dMNekHarJoHmf_nJ78Fr-ZmP4bkZTn0rmRE5Yeo3I9kxOgF0sg6RyS8xQOx_LOP2FPvmkNup9DAg80Z3SAzFQ3fhJJU71xu3FiqOokMRmrxSxWV_hCBAxbcna1iuogK74yc7jGbzEfqWOloOpw-bzAIwY-8i3oena4WLcIZSws2JdUaoG3fByLnyIMhyBxIofpk7GcEQ4o2D1ZMaQMRTuYaoOFJNlX8ODBpLtDM-_KtvtspMfHQLPTSPdj7mlB-FGSoU4DXR41S59js2i634_o7LZog1ypMiiuCLBosEioaMrJB2Iy0e8OyBHrY2UI4Bbq5xSem1JK_YSuB2ROBDoJqerS8MHtowcQSPXQEoEI5yZSPNerYuSWMYTN0AaoxwzCogrP2ZbMABoWlv1iOLz3gglCPkKMOuWsfvcJSoNh_GDWp54pEOUD68H9jXM7vkdB_oTc6sPR89NZZfxQ0ZXI2dNGT0bMbfStXvGGgtyzZanJUxaUwgbFEGGDL26SDD33c0842hrDkShQgZY9qoVSoKzRw4bONsI8RgsllzVgzXQ5OJrgtCxs8afx-4enDWfd2PEdSX-bXndv0_DjmOOlu6rAq0z2lLfz5PB-DEqRqewpvVVm6YA-vubOSEDnnAGuIK4x3j8ySQL-BMJNk6bDDBDulJG1DEK4ulZKy2l0Oi0r_bK1RGMT9nxMl9mCfuR4TmWdM6SdIyyNBWCaOYlCy1RjB3j3wJFHVoIAp4qeFKY-XtcuMZ4sY9jcrHM37CEvaefb_C3npprwZ3JbI1YhrB8cnQohhB2P1wcnets5akOM6UMYZGwNM2Ix5W8r2atOI3UgeBwIvmAjF92g5sBBYhHvCP0JfSHlxDdMAgqs4RDflE89z8y4u8nXPmy1OOq87-oCL8bljjjcz3xl1HHjEFno5OkUiLpr1VVG42J5HxkTufH6_I5RMbGEGdo1Ivw0cQcn8AxK0UAiQcZltNsBq04J8uAgcyqexzk9FVAU6VOFDoTmd_ulSJMPjZmQVhC5CS_NQZJka_3GjE9nq22JoGzRowljCobA2Cnticj48tOdhP5FqXLLpNqlxICz4KVy5sm19oh_VTbsPEW-caKOKHOePiqGlSbTK8DBSdP1Njy1l3bWWoTwO8SmcfgE6Fu1_ZB_XONNkYwmFMajMieEHJiEGsiL6xlPHOYp-njuFu6lWWc0rfMhUpQSTxlAet9CgikAYQ9Wlo7nqJTf0_08HLEcVtPqdoy8qxCSGxF6ZJ52JZ7xHdPRVHk0n3XfSv9fDMkh_zH5LuWzxZNrK8zKCFGJwQmYrsx0g577ApskrPTxvyIWTGDMpw2OTI7rsezQrn-VbhdO0qV6VlEa5ZDNjdcOSRiYUjpcfEY4F42bqffTRufpGYV1k-qEplRutbzh-GvgQwTdNoZ6Tvbs05GwzavBcOubeUGKW0L5gw2eBoMxi9p6lGtUrElEYIFqEMNl0iXaNI5xfIOLcJZdzxmXnugTBJtC2WLAoBqtpbHzU_c5d1UVkGJfgE2BKH3QbO5GuqplLKUxaWRovBrmdR_gojV9YyFeVPQkCFU7gbGRZo68H7NZCRJjD8kyMJPwTuyGTtT56Ig_LenPINsdle6cJKRjkP_FyH86Zl2tHTu04sgw9uAuQlMFzdJgNQ8Rni-AMWsKi8yirW1W7QAbE2X2Dl6pQqI4ikSAkohMaM-CaOvmxutvLpt5zGiBanGsA0eInFTgcos2E16xuL6ZDJmDyzZyGPp_EhZa7jerikzd-E1SuswshPbm7BMZ_iq5v36BhEYpo3JEhd1BlzFa20OYSgAc6geYUlGdRGNDKOMEolpnkaRdvFo3EZNH9C4xbgP8ZxhLU-z9fZm1WAydMxzsB2lZ2-sJ-wSxa7E2wbD4neaTwysKb4JXjBgVnyUQ5rwWfxkYnH4LLzUjg2sMeBv4bIW9oXPxSvJtwRuxUr9OG5Mil8wUAkfc_u07f6OT3hDKFWrsjwejc5xIwwFtLVWvJ9wXj5AzrrUzidDzH3UbQ9nel9VnJNP"
    },
    debug: "(()=>{var e,t,r,n,i,l,a,o,u,s,d,v,c,f,p,h,g,y,m,w,k,S,T,x;function j(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var C=(e,t=e=>Error(e))=>{throw el(e=e2(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ed(e)&&ed(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},U=(e,t,...r)=>e===t||0<r.length&&r.some(t=>U(e,t)),F=(e,t)=>null!=e?e:C(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),q=(e,t=!0,r)=>{try{return e()}catch(e){return ep(t)?eu(e=t(e))?C(e):e:et(t)?console.error(t?C(e):e):t}finally{null!=r&&r()}};class z extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),j(this,\"_action\",void 0),j(this,\"_result\",void 0),this._action=e}}var R=e=>new z(async()=>e2(e)),P=async(e,t=!0,r)=>{try{return await e2(e)}catch(e){if(!et(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,B=e=>!!e,D=e=>e===K,J=void 0,L=Number.MAX_SAFE_INTEGER,V=!1,K=!0,H=()=>{},G=e=>e,X=e=>null!=e,Z=Symbol.iterator,Y=Symbol.asyncIterator,Q=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:J,ee=(e,t)=>ep(t)?e!==J?t(e):J:(null==e?void 0:e[t])!==J?e:J,et=e=>\"boolean\"==typeof e,er=Q(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||J))),en=e=>e!==V,ei=e=>\"number\"==typeof e,el=e=>\"string\"==typeof e,ea=Q(el,e=>null==e?void 0:e.toString()),eo=Array.isArray,eu=e=>e instanceof Error,es=(e,t=!1)=>null==e?J:!t&&eo(e)?e:eh(e)?[...e]:[e],ed=e=>e&&\"object\"==typeof e,ev=e=>(null==e?void 0:e.constructor)===Object,ec=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ef=e=>\"symbol\"==typeof e,ep=e=>\"function\"==typeof e,eh=(e,t=!1)=>!(null==e||!e[Z]||\"string\"==typeof e&&!t),eg=e=>e instanceof Map,ey=e=>e instanceof Set,em=(e,t)=>null==e?J:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,eb=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ew=e=>el(e)&&(eb(e,\"{\",\"}\")||eb(e,\"[\",\"]\")),ek=!1,eS=e=>(ek=!0,e),eT=e=>null==e?J:ep(e)?e:t=>t[e],ex=(e,t,r)=>(null!=t?t:r)!==J?(e=eT(e),null==t&&(t=0),null==r&&(r=L),(n,i)=>t--?J:r--?e?e(n,i):n:r):e,eI=e=>null==e?void 0:e.filter(X),eA=(e,t,r,n)=>null==e?[]:!t&&eo(e)?eI(e):e[Z]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),ek){ek=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===J?t:ex(t,r,n)):ed(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),ek){ek=!1;break}}}(e,ex(t,r,n)):eA(ep(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eE=(e,t,r,n)=>eA(e,t,r,n),eN=(e,t,r=1,n=!1,i,l)=>function*e(t,r,n,i){if(null!=t)if(t[Z]||n&&ed(t))for(var l of i?eA(t):t)1!==r?yield*e(l,r-1,n,!0):yield l;else yield t}(eA(e,t,i,l),r+1,n,!1),e$=(e,t,r,n)=>{if(t=eT(t),eo(e)){var i=0,l=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!ek;r++){var a=e[r];null!=(t?a=t(a,i++):a)&&l.push(a)}return ek=!1,l}return null!=e?tG(eE(e,t,r,n)):J},eO=(e,t,r,n)=>null!=e?new Set([...eE(e,t,r,n)]):J,e_=(e,t,r=1,n=!1,i,l)=>tG(eN(e,t,r,n,i,l)),ej=(...e)=>{var t;return eq(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...tG(e))),t},eC=(e,t,r,n)=>{var i,l,a=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(l=t(e[r],a++))?l:i,ek)){ek=!1;break}return i},eM=(e,t)=>{var r,n,l,i=0;for(l of e)if(null!=l&&(r=null!=(n=t(l,i++))?n:r,ek)){ek=!1;break}return r},eU=(e,t)=>{var r,n,l,i=0;for(l in e)if(r=null!=(n=t([l,e[l]],i++))?n:r,ek){ek=!1;break}return r},eF=(e,t,r,n)=>{var i;if(null!=e){if(eo(e))return eC(e,t,r,n);if(r===J){if(e[Z])return eM(e,t);if(\"object\"==typeof e)return eU(e,t)}for(var l of eA(e,t,r,n))null!=l&&(i=l);return i}},eq=eF,ez=async(e,t,r,n)=>{var i,l;if(null==e)return J;for(l of eE(e,t,r,n))if(null!=(l=await l)&&(i=l),ek){ek=!1;break}return i},eR=(e,t)=>{if(null==e)return J;var r={};if(t){var n,l,i=0;for(l in e)(n=t([l,e[l]],i++))&&(r[n[0]]=n[1])}else for(var a of e)a&&(r[a[0]]=a[1]);return r},eP=(e,t,r)=>{var n,i,l;return null==e?J:et(t)||r?(l={},eq(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(l[e[0]],e[1]))&&(l[e[0]]=e[1]):e=>eq(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=l)[i=e[0]])?t:n[i]=[]).push(e[1]),l)}:e=>null!=(null==e?void 0:e[1])&&(l[e[0]]=e[1],l))),l):eR(e$(e,t?(e,r)=>ee(t(e,r),1):e=>ee(e,1)))},eW=(e,t,r,n,i)=>{var a=()=>ep(r)?r():r;return null!=(e=eF(e,(e,n)=>r=null!=(e=t(r,e,n))?e:a(),n,i))?e:a()},eB=(e,t,r,n)=>e$(e,(e,r)=>e&&null!=t&&t(e,r)?e:J,r,n),eD=(e,t)=>{var r,n;if(null==e)return J;if(!t){if(null!=(r=null!=(n=e.length)?n:e.size))return r;if(!e[Z])return Object.keys(e).length}return r=0,null!=(n=eF(e,t?(e,n)=>t(e,n)?++r:r:()=>++r))?n:0},eJ=(e,...t)=>null==e?J:ei(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ei(i)&&e<i?i:e,J,t[2],t[3]),eV=(e,t,r,n)=>{var i;return null==e?J:ev(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:B))?i:eF(e,t?(e,r)=>!!t(e,r)&&eS(!0):()=>eS(!0),r,n))&&i},eK=(e,t=e=>e)=>{var r;return null!=(r=es(e))&&r.sort((e,r)=>t(e)-t(r)),e},eH=(e,t,r)=>(e.constructor===Object||eo(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eG=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=ep(r)?r():r)&&eH(e,t,n),n},eX=(e,...t)=>(eq(t,t=>eq(t,([t,r])=>{null!=r&&(ev(e[t])&&ev(r)?eX(e[t],r):e[t]=r)})),e),eZ=(e,t,r,n)=>{if(e)return null!=r?eH(e,t,r,n):(eq(t,t=>eo(t)?eH(e,t[0],t[1]):eq(t,([t,r])=>eH(e,t,r))),e)},eY=(e,t,r)=>{var n;return ec(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ec(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ev(e)&&delete e[t],e},eQ=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):!eG(e,t)&&(eH(e,t,!0),!0),e0=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eG(e,t),ec(e,\"delete\")?e.delete(t):delete e[t],r},e1=(e,t)=>{if(e)return eo(t)?(eo(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e1(e,t)):eo(e)?t<e.length?e.splice(t,1)[0]:void 0:e0(e,t)},e2=e=>ep(e)?e():e,e6=(e,t=-1)=>eo(e)?t?e.map(e=>e6(e,t-1)):[...e]:ev(e)?t?eP(e,([e,r])=>[e,e6(r,t-1)]):{...e}:ey(e)?new Set(t?e$(e,e=>e6(e,t-1)):e):eg(e)?new Map(t?e$(e,e=>[e[0],e6(e[1],t-1)]):e):e,e4=(e,...t)=>null==e?void 0:e.push(...t),e5=(e,...t)=>null==e?void 0:e.unshift(...t),e3=(e,t)=>{var r,i,l;if(e)return ev(t)?(l={},ev(e)&&(eq(e,([e,a])=>{if(a!==t[e]){if(ev(r=a)){if(!(a=e3(a,t[e])))return;[a,r]=a}else ei(a)&&ei(void 0)&&(a=(r=a)-void 0);l[e]=a,(null!=i?i:i=e6(t))[e]=r}}),i)?[l,i]:void 0):[e,e]},e8=\"undefined\"!=typeof performance?(e=K)=>e?Math.trunc(e8(V)):performance.timeOrigin+performance.now():Date.now,e9=(e=!0,t=()=>e8())=>{var r,n=+e*t(),i=0;return(l=e,a)=>(r=e?i+=-n+(n=t()):i,a&&(i=0),(e=l)&&(n=t()),r)},te=(e,t=0)=>{var e=ep(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:l=!1,trigger:a=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=ta(!0).resolve(),c=e9(!l),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await P(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!l,a)};function tt(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tr{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new tn,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tt(this,\"_promise\",void 0),this.reset()}}class tn{then(e,t){return this._promise.then(e,t)}constructor(){var e;tt(this,\"_promise\",void 0),tt(this,\"resolve\",void 0),tt(this,\"reject\",void 0),tt(this,\"value\",void 0),tt(this,\"error\",void 0),tt(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===J||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?e2(t):new Promise(r=>setTimeout(async()=>r(await e2(t)),e)):C(`Invalid delay ${e}.`),ta=e=>new(e?tr:tn),tu=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,l),l=()=>n!==(n=!1)&&(r(i),!0),a=()=>n!==(n=!0)&&(t(i),!0);return a(),[l,a]},Q=()=>{var e,t=new Set;return[(r,n)=>{var i=tu(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},td=(e,t,r)=>null==e?J:eo(t)?null==(t=t[0])?J:t+\" \"+td(e,t,r):null==t?J:1===t?e:null!=r?r:\"is\"===e?\"are\":e+\"s\",tv=!0,tc=(e,t,r)=>r?(tv&&e4(r,\"\u001b[\",t,\"m\"),eo(e)?e4(r,...e):e4(r,e),tv&&e4(r,\"\u001b[m\"),r):tc(e,t,[]).join(\"\"),tf=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),th=(e,t)=>{var a,r=[],n={},i={},l=0;for(a in t)a===t[a]&&(Object.defineProperty(i,a,{value:a,writable:!1,enumerable:!0,configurable:!1}),n[a]=l++,r.push(a));var o=(t,r=!0)=>null==t?J:null!=n[t]?t:r?C(`The ${e} \"${t}\" is not defined.`):J,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},tg=Symbol(),ty=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,a;return e?(null==(a=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(a[1]=\"\"),a[2]=a[1]&&(el(t)?t=[t]:eo(t))&&tB(t,e=>1<(i=a[1].split(e)).length?tU(i):J)||(a[1]?[a[1]]:[]),a):J},tm=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?J:tT(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,l,a,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&J,authority:l,user:a,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):J,path:v,query:!1===t?c:c?tb(c,{...n,delimiters:t}):J,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":J),e}),tb=(e,t)=>tw(e,\"&\",t),tw=(e,t,{delimiters:r=!0,...n}={})=>{e=tD(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,l,a]=null!=(e=ty(e,{...n,delimiters:!1===r?[]:!0===r?J:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<a.length?a:l]:[e,l]:tM}),t=t8(tV(e,!1),([e,t])=>[e,!1!==r?1<t.length?tX(t):t[0]:t.join(\",\")]);return t&&(t[tg]=e),t},tk=(e,t)=>t&&null!=e?t.test(e):J,tS=(e,t,r)=>tT(e,t,r,!0),tT=(e,t,i,l=!1)=>null==(null!=e?e:t)?J:i?(r=J,l?(n=[],tT(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(l=e.match(t))?l:J,tx=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tI=/\\z./g,tA=(e,t)=>(t=rr(eO(eB(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tI,tE={},tN=e=>e instanceof RegExp,t$=(r,n=[\",\",\" \"])=>{var i;return tN(r)?r:eo(r)?tA(e$(r,e=>null==(e=t$(e,n))?void 0:e.source)):et(r)?r?/./g:tI:el(r)?null!=(i=(e=tE)[t=r])?i:e[t]=tT(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tA(e$(tO(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rr(n,tx)}]`)),e=>e&&`^${rr(tO(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tx(t_(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):J},tO=(e,t,r=!0)=>null==e?J:r?tO(e,t,!1).filter(G):e.split(t),t_=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tj=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eZ(r,{push(n,i){for(var l=[n,i],a=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(l[1],d[0])<0)return a(r.splice(o,0,l));if(e(l[0],d[1])<=0){if(e(l[0],d[0])<0&&(u=d[0]=l[0]),0<e(l[1],d[1])&&(u=d[1]=l[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return a(null!=u);u=l=r.splice(o--,1)[0]}}return a(l&&(r[r.length]=l))},width:0})},tC=!1,tM=Symbol(),tU=e=>(tC=!0,e),tF=Symbol(),tq=Symbol(),tz=Symbol.iterator,tR=e=>{tR=e=>e;var n,t=()=>(e,t,r,n,i)=>{var l,o,a=0;for(o of e)if((l=t?t(o,a++,n,i):o)!==tM){if(l===tU)break;if(n=l,r&&r.push(l),tC){tC=!1;break}}return r||n},r=(Array.prototype[tF]=(e,t,r,n,i)=>{for(var a,o=0,u=e.length;o<u;o++)if(a=e[o],(a=t?t(a,o,n,i):a)!==tM){if(a===tU)break;if(n=a,r&&r.push(a),tC){tC=!1;break}}return r||n},t());for(n of(Object.prototype[tF]=(e,n,i,l,a)=>{if(e[tz])return(e.constructor===Object?r:Object.getPrototypeOf(e)[tF]=t())(e,n,i,l,a);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=n?n(u,s++,l,a):u)!==tM){if(u===tU)break;if(l=u,i&&i.push(u),tC){tC=!1;break}}return i||l},Object.prototype[tq]=function(){var t,e;return this[tz]||this[Y]?this.constructor===Object?null!=(e=this[Y]())?e:this[tz]():((e=Object.getPrototypeOf(this))[tq]=null!=(t=e[Y])?t:e[tz],this[tq]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[Map.prototype,WeakMap.prototype,Set.prototype,WeakSet.prototype,Object.getPrototypeOf(function*(){})]))n[tF]=t(),n[tq]=n[tz];return Number.prototype[tF]=(e,t,n,i,l)=>r(tP(e),t,n,i,l),Number.prototype[tq]=tP,Function.prototype[tF]=(e,t,n,i,l)=>r(tW(e),t,n,i,l),Function.prototype[tq]=tW,e};function*tP(e=this){for(var t=0;t<e;t++)yield t}function*tW(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tB=(e,t,r,n)=>(tB=tR((e,t,r,n=e)=>e?e[tF](e,t,void 0,r,n):null==e?e:void 0))(e,t,r,n),tD=(e,t,r=[],n,i=e)=>(tD=tR((e,t,r=[],n,i=e)=>e||0===e||\"\"===e?e[tF](e,t,r,n,i):null==e?e:void 0))(e,t,r,i,n),tJ=(e,t=!0,r=!1)=>tD(e,!0===t?e=>null!=e?e:tM:t?t.has?e=>null==e||t.has(e)===r?tM:e:(e,n,i)=>!t(e,n,i)===r?e:tM:e=>e||tM),tL=(e,t,r=-1,n=[],i,l=e)=>tD(e,(e,i,l)=>null!=(t?e=t(e,i,l):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tL(e,void 0,r-1,n,e),tM):e,n,i,l),tV=(e,t,r)=>{var n,i,l,a;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tB(e,!1!==r?(l=new Map,(e,r,n)=>{void 0!==(a=t?t(e,r,n):e)[0]&&t4(l,a[0],()=>[]).push(a[1])}):(l={},(e,r,o)=>(a=t?t(e,r,o):e)&&void 0!==a[0]&&(null!=(r=(n=l)[i=a[0]])?r:n[i]=[]).push(a[1]))),l},tH=e=>void 0===e?[]:null!=e&&e[tz]&&\"string\"!=typeof e?e:[e],tG=e=>null==e||eo(e)?e:e[tz]&&\"string\"!=typeof e?[...e]:[e],tX=(e,...t)=>{var r,n;for(n of e=!t.length&&eh(e)?e:[e,...t])if(null!=n){if(eh(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},tZ=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),tY=(e,t,r)=>tG(e).sort(\"function\"==typeof t?(e,n)=>tZ(t(e),t(n),r):eo(t)?t.length?(e,n)=>{for(var i=0,l=0;l<t.length&&!i;l++)i=tZ(t[l](e),t[l](n),r);return i}:(e,t)=>tZ(e,t,r):(e,r)=>tZ(e,r,t)),tQ=Object.keys,t0=Symbol(),t1=Symbol(),t2=Symbol(),t6=e=>{for(var{prototype:t}of(t6=e=>e,[Map,WeakMap]))t[t0]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},t[t1]=t.get;for(var{prototype:t}of[Set,WeakSet])t[t0]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},t[t1]=t.has,t[t2]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for(var{prototype:t}of(Array.prototype[t2]=function(e){return this.push(...e),this},[Object,Array]))t[t0]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},t[t1]=function(e){return this[e]};return e},t4=(e,t,r)=>(t4=t6((e,t,r)=>{if(null==e)return e;var n=e[t1](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t0](t,r));e[t0](t,n)}return n}))(e,t,r),t5=(e,t,r)=>(t5=t6((e,t,r)=>(e[t0](t,r),r)))(e,t,r),t3=(e,...t)=>(t3=t6((e,...t)=>null==e?e:e[t2](t)))(e,...t),t8=(e,t)=>{var r={};return tB(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tM&&e!==tU)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tM&&e!==tU)?r[e[0]]=e[1]:e),r},t9=(e,...t)=>(t9=t6((e,...t)=>((null==e?void 0:e.constructor)===Object?tB(t,t=>tB(t,t=>t&&(e[t[0]]=t[1]))):tB(t,t=>tB(t,t=>t&&e[t0](t[0],t[1]))),e)))(e,...t),t7=(e,t,r={})=>{if(null!=e){var a,{deep:n=!0,overwrite:i=!0,nulls:l=!1}=r;for(a of tH(t))tB(a,t=>{var o,u;t&&([t,o]=t,u=e[t],(l?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?t7(u,o,r):i&&(e[t]=o))})}return e},re=(e,t)=>null==e?e:t8(t,t=>null!=e[t]||t in e?[t,e[t]]:tM),rt=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),rr=(e,t,r)=>null==e?e:eh(e)?tJ(\"function\"==typeof t?tD(e,t):(r=t,e),rt,!0).join(null!=r?r:\"\"):rt(e)?\"\":e.toString(),rn=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?rn(tD(e,t),r,n):(i=[],n=tB(e,(e,t,r)=>rt(e)?tM:(r&&i.push(r),e.toString())),[t,o]=eo(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},ri=th(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rl=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],ra=t8(rl,e=>[e,e]),ro=(Object.freeze(eR(rl.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),ru=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rs_parse=function(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),el(e)&&(e=e.split(\",\")),eo(e)){var i,n={};for(i of e)ra[i]?\"necessary\"!==i&&(n[i]=!0):r&&C(`The purpose name '${i}' is not defined.`);e=n}return t?(t=tQ(e)).length?t:[\"necessary\"]:e},rs_test=function(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=ro(i,n))&&!t[ro(i,n)])return!1;if(e=ru(e,n),t=ru(t,n),r){for(var l in t)if(ra[l]&&t[l]&&!e[l])return!1;if(\"all\"===r)for(var l in e)if(ra[l]&&e[l]&&!t[l])return!1;return!0}var a=!1;for(l in e)if(ra[l]&&e[l]){if(t[l])return!0;a=!0}return!a},rd=(th(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${rn(rs_parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),rv={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rs_test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rs_parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var l;return e?([e,l]=e.split(\":\"),{classification:null!=(e=ri.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rs_parse(l,{validate:!1}))?e:{}}):t?rv.clone(t):{classification:\"anonymous\",purposes:{}}}},rc=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rf=e=>!(null==e||!e.patchTargetId),rp=Symbol(),rh=e=>void 0===e?\"undefined\":tf(JSON.stringify(e),40,!0),rg=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,ry=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rm=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rb=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rw=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rk=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rh(t)+` ${r}.`}),rp),rS=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rS((t?parseInt:parseFloat)(e),t,!1),rT={},rl=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rT[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rT[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rk(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rg.test(e)&&!isNaN(+new Date(e))?e:rk(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rS(e,!1,!1)){if(!rS(e,!0,!1))return rk(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!ry.test(e)||isNaN(+new Date(e)))return rk(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rS(e,!0,!1)?+e:rk(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rS(e,!0,!1)?+e:rk(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rS(e,!1,!1)?e:rk(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rb.test(e)?e:rk(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rb.exec(e);return r?r[2]?e:rk(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rk(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rb.exec(e);return r?\"urn\"!==r[1]||r[2]?rk(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rk(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rw.test(e)?e.toLowerCase():rk(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rk(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rm.exec(e))?void 0:r[1].toLowerCase():null)?r:rk(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rh(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rp&&e.length>d?rk(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rp||(null==c||c<=e)&&(null==f||e<=f)?e:rk(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rp)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+rn(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rp||u.has(e)?e:rk(t,e,p)}(e=>e instanceof Set||null==e||new Set(e[tz]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),th(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rI=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rA=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rE=((I=l=l||{})[I.Success=200]=\"Success\",I[I.Created=201]=\"Created\",I[I.NotModified=304]=\"NotModified\",I[I.Forbidden=403]=\"Forbidden\",I[I.NotFound=404]=\"NotFound\",I[I.BadRequest=405]=\"BadRequest\",I[I.Conflict=409]=\"Conflict\",I[I.Error=500]=\"Error\",(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status)),rN=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function r$(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rO=e=>{var t=rI(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${l[e.status]}.`:`${t} failed with status ${e.status} - ${l[e.status]}${r?` (${r})`:\"\"}.`};class r_ extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),r$(this,\"succeeded\",void 0),r$(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rN(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rN(e,!1)))?t:[]}}var rj=e=>!!e.callback,rC=e=>!!e.poll,rM=Symbol(),rU=(e,t,r,{poll:n,logCallbackError:i}={})=>{var a=eo(t)?t:[t],o=[],u=(async()=>{var s,d,u,v,t=await r(a.filter(e=>e)),l=[];for(u of a)u&&null!=(d=t.get(u))&&(d[rM]=u,rj(u)&&l.push([u,e=>!0===u.callback(e)]),rC(u))&&l.push([u,e=>{var t;return!rE(e,!1)||(t=!rE(e,!1)||u.poll(e.value,e[rM]===u,s),s=e.value,t)}]);for([u,v]of l)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${rI(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),s=async(r,n)=>{var v,c,f,i=await u,s=[],d=[];for(v of a)v?null==(f=i.get(v))?d.push(`No result for ${rI(v)}.`):!r||rN(f,n||\"set\"===e)?s.push(r&&f.status===l.NotFound?void 0:1<r?null!=(c=f.value)?c:void 0:f):d.push(rO(f)):s.push(void 0);if(d.push(...o),d.length)throw 10<d.length&&d.push(`\n(and ${d.splice(10).length} more...)`),new r_(s,d.join(\"\\n\"));return a===t?s:s[0]};return Object.assign(R(()=>s(1,!1)),{as:()=>s(1,!1),all:()=>s(0,!1),require:()=>s(1,!0),value:(e=!1)=>s(2,e),values:(e=!1)=>s(2,e)})},rF=e=>e&&\"string\"==typeof e.type,rq=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rz=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rR=(e,t)=>{var r;return t&&(!(o=e.get(a=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(a,t)},rP=(e,t=\"\",r=new Map)=>{if(e)return eh(e)?tB(e,e=>rP(e,t,r)):el(e)?tT(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,l,a,o,u)=>{i={tag:(n?rz(n)+\"::\":\"\")+t+rz(i),value:rz(null!=(n=null!=l?l:a)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rR(r,i)}):rR(r,e),r},rW=th(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rB=th(\"variable scope\",{...rW,...rl}),rD=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rJ=e=>null!=e&&!!e.scope&&null!=rW.ranks[e.scope],rL=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rV=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rH=()=>()=>C(\"Not initialized.\"),rG=window,rX=document,rZ=rX.body,rY=(e,t)=>!(null==e||!e.matches(t)),rQ=((e=>tv=e)(!!rG.chrome),L),r0=(e,t,r=(e,t)=>rQ<=t)=>{for(var n=0,i=V;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(l=e,i=t!==K&&null!=l),K),n-1)!==V&&!i;){var l,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rX&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return l},r1=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||er(e);case\"n\":return parseFloat(e);case\"j\":return q(()=>JSON.parse(e),H);case\"h\":return q(()=>nZ(e),H);case\"e\":return q(()=>null==nQ?void 0:nQ(e),H);default:return eo(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r1(e,t[0])):void 0}},r2=(e,t,r)=>r1(null==e?void 0:e.getAttribute(t),r),r6=(e,t,r)=>r0(e,(e,n)=>n(r2(e,t,r))),r4=(e,t)=>null==(e=r2(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),r5=e=>null==e?void 0:e.getAttributeNames(),r3=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,r8=e=>null!=e?e.tagName:null,r7=e=>({x:em(scrollX,e),y:em(scrollY,e)}),ne=(e,t)=>t_(e,/#.*$/,\"\")===t_(t,/#.*$/,\"\"),nt=(e,t,r=K)=>(s=nr(e,t))&&W({xpx:s.x,ypx:s.y,x:em(s.x/rZ.offsetWidth,4),y:em(s.y/rZ.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),nr=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=nn(e),{x:d,y:v}):void 0,nn=e=>e?(c=e.getBoundingClientRect(),u=r7(V),{x:em(c.left+u.x),y:em(c.top+u.y),width:em(c.width),height:em(c.height)}):void 0,ni=(e,t,r,n={capture:!0,passive:!0})=>(t=tG(t),tu(r,r=>tB(t,t=>e.addEventListener(t,r,n)),r=>tB(t,t=>e.removeEventListener(t,r,n)))),na=()=>({...u=r7(K),width:window.innerWidth,height:window.innerHeight,totalWidth:rZ.offsetWidth,totalHeight:rZ.offsetHeight}),no=new WeakMap,nu=e=>no.get(e),ns=(e,t=V)=>(t?\"--track-\":\"track-\")+e,nd=(e,t,r,n,i,l)=>(null==t?void 0:t[1])&&tB(r5(e),a=>{var o;return null!=(o=(f=t[0])[p=a])?o:f[p]=(l=V,!el(n=tB(t[1],([t,r,n],i)=>tk(a,t)&&(l=void 0,!r||rY(e,r))&&eS(null!=n?n:a)))||(i=e.getAttribute(a))&&!er(i)||rP(i,t_(n,/\\-/g,\":\"),r),l)}),nv=()=>{},nc=(e,t)=>{if(h===(h=nb.tags))return nv(e,t);var r=e=>e?tN(e)?[[e]]:eh(e)?e_(e,r):[ev(e)?[t$(e.match),e.selector,e.prefix]:[t$(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tL(h,([,e])=>e,1))]];(nv=(e,t)=>nd(e,n,t))(e,t)},nf=(e,t)=>rr(ej(r3(e,ns(t,K)),r3(e,ns(\"base-\"+t,K))),\" \"),np={},nh=(e,t,r=nf(e,\"attributes\"))=>{var n;r&&nd(e,null!=(n=np[r])?n:np[r]=[{},tS(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[t$(r||n),,t])],t),rP(nf(e,\"tags\"),void 0,t)},ng=(e,t,r=V,n)=>null!=(r=null!=(r=r?r0(e,(e,r)=>r(ng(e,t,V)),ep(r)?r:void 0):rr(ej(r2(e,ns(t)),r3(e,ns(t,K))),\" \"))?r:n&&(g=nu(e))&&n(g))?r:null,ny=(e,t,r=V,n)=>\"\"===(y=ng(e,t,r,n))||(null==y?y:er(y)),nm=(e,t,r,n)=>e&&(null==n&&(n=new Map),nh(e,n),r0(e,e=>{nc(e,n),rP(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nb={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nw=[],nk=[],nS=(e,t=0)=>e.charCodeAt(t),nx=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nw[nk[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(nk[(16515072&t)>>18],nk[(258048&t)>>12],nk[(4032&t)>>6],nk[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nI=e=>{for(var t,r=0,n=0,i=e.length,l=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)l[n++]=nw[nS(e,r++)]<<2|(t=nw[nS(e,r++)])>>4,r<i&&(l[n++]=(15&t)<<4|(t=nw[nS(e,r++)])>>2,r<i)&&(l[n++]=(3&t)<<6|nw[nS(e,r++)]);return l},nA={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nE=(e=256)=>e*Math.random()|0,n$={exports:{}},{deserialize:nO,serialize:n_}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),l=0;if(t&&t.multiple)for(var a=0;a<e.length;a++)o(e[a]);else o(e);return i.subarray(0,l);function o(e,i){var c,a;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(a=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,l=new Uint8Array(e.length*(t?1:4)),a=0;a!==r;a++){var o=e.charCodeAt(a);if(o<128)l[i++]=o;else{if(o<2048)l[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++a>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(a);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+a+\" out of range\");l[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,l[i++]=o>>12&63|128}else l[i++]=o>>12|224;l[i++]=o>>6&63|128}l[i++]=63&o|128}}return t?l:l.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(a);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((a=(c=e).length)<=255?d([196,a]):d(a<=65535?[197,a>>>8,a]:[198,a>>>24,a>>>16,a>>>8,a]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<l+1){for(var t=2*i.length;t<l+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[l]=e,l++}function d(e){if(i.length<l+e.length){for(var t=2*i.length;t<l+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,l),l+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return a(1);if(205===t)return a(2);if(206===t)return a(4);if(207===t)return a(8);if(208===t)return l(1);if(209===t)return l(2);if(210===t)return l(4);if(211===t)return l(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function l(t){for(var l,r=0,i=!0;0<t--;)i?(r+=127&(l=e[n++]),128&l&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function a(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=a(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=a(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=a(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=a(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var l=e[n++];if(127<l)if(191<l&&l<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");l=(31&l)<<6|63&e[n++]}else if(223<l&&l<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");l=(15&l)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<l&&l<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+l.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");l=(7&l)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(l<=65535)i+=String.fromCharCode(l);else{if(!(l<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+l.toString(16)+\" exceeds UTF-16 reach\");l-=65536,i+=String.fromCharCode(l>>10|55296)+String.fromCharCode(1023&l|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=a(t));t=a(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=l(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};n$.exports=n})(),(I=n$.exports)&&I.__esModule&&Object.prototype.hasOwnProperty.call(I,\"default\")?I.default:I),nj=\"$ref\",nC=(e,t,r)=>ef(e)?J:r?t!==J:null===t||t,nM=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,l,a,o=(e,t,n=e[t],i=nC(t,n,r)?s(n):J)=>(n!==i&&(i!==J||eo(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||ep(e)||ef(e))return J;if(ed(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(a=null==l?void 0:l.get(e)))return e[nj]||(e[nj]=a,u(()=>delete e[nj])),{[nj]:a};if(ev(e))for(var t in(null!=l?l:l=new Map).set(e,l.size+1),e)o(e,t);else!eh(e)||e instanceof Uint8Array||(!eo(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return q(()=>{var r;return t?n_(null!=(r=s(e))?r:null):q(()=>JSON.stringify(e,J,n?2:0),()=>JSON.stringify(s(e),J,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nU=e=>{var t,r,n=e=>ed(e)?e[nj]&&(r=(null!=t?t:t=[])[e[nj]])?r:(e[nj]&&delete(t[e[nj]]=e)[nj],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(el(e)?q(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?q(()=>nO(e),()=>(console.error(\"Invalid message received.\",e),J)):e)},nF=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var a,o,u,i=(e,r)=>ei(e)&&!0===r?e:u(e=el(e)?new Uint8Array(tD(e.length,t=>255&e.charCodeAt(t))):t?q(()=>JSON.stringify(e),()=>JSON.stringify(nM(e,!1,n))):nM(e,!0,n),r),l=e=>null==e?J:q(()=>nU(e),J);return t?[e=>nM(e,!1,n),l,(e,t)=>i(e,t)]:([a,o,u]=(e=>{for(var t,r,n,i,l,o,a=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,l=new Uint8Array(4+t+i),n=0;n<3;l[n++]=g(nE()));for(r=0,l[n++]=g(v^16*nE(16)+i);r<t;l[n++]=g(v^e[r++]));for(;i--;)l[n++]=nE();return l}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,l=new Uint8Array(t);n<t;l[n++]=v^g(e[r++]));return l}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=et(t)?64:t,h(),[a,u]=nA[o],r=0;r<e.length;a=BigInt.asUintN(o,(a^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+a%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):a.toString(36)}]})(e),[(e,t)=>(t?G:nx)(a(nM(e,!0,n))),e=>null!=e?nU(o(e instanceof Uint8Array?e:(r&&ew(e)?l:nI)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},[nq,,]=(nF(),nF(null,{json:!0,decodeJson:!0}),nF(null,{json:!0,prettify:!0})),th=tO(\"\"+rX.currentScript.src,\"#\"),rl=tO(\"\"+(th[1]||\"\"),\";\"),nW=th[0],nB=rl[1]||(null==(I=tm(nW,{delimiters:!1}))?void 0:I.host),nD=e=>!(!nB||(null==(e=tm(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nB))!==K),th=(...e)=>t_(rr(e),/(^(?=\\?))|(^\\.(?=\\/))/,nW.split(\"?\")[0]),nL=th(\"?\",\"var\"),nV=th(\"?\",\"mnt\"),nK=(th(\"?\",\"usr\"),Symbol()),nH=Symbol(),nG=(e,t,r=K,n=V)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tc(\"tail.js: \",\"90;3\"))+t);r=null==e?void 0:e[nH];null!=(e=r?e[nK]:e)&&console.log(ed(e)?tc(nq(e),\"94\"):ep(e)?\"\"+e:e),r&&r.forEach(([e,t,r])=>nG(e,t,r,!0)),t&&console.groupEnd()},[nX,nZ]=nF(),[nY,nQ]=[rH,rH],n0=!0,[rl,n2]=Q(),n5=(...e)=>{var r,l=e.shift();console.error(e[1]instanceof Error?e[1].message:el(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=l.id)?r:l,...e)},[n3,n8]=Q(),[n9,n7]=Q(),ie=e=>ir!==(ir=e)&&n8(ir=!1,ia(!0,!0)),it=e=>ii!==(ii=!!e&&\"visible\"===document.visibilityState)&&n7(ii,!e,il(!0,!0)),ir=(n3(it),!0),ii=!1,il=e9(!1),ia=e9(!1),io=(ni(window,[\"pagehide\",\"freeze\"],()=>ie(!1)),ni(window,[\"pageshow\",\"resume\"],()=>ie(!0)),ni(document,\"visibilitychange\",()=>(it(!0),ii&&ie(!0))),n8(ir,ia(!0,!0)),!1),iu=e9(!1),[,id]=Q(),iv=te({callback:()=>io&&id(io=!1,iu(!1)),frequency:2e4,once:!0,paused:!0}),I=()=>!io&&(id(io=!0,iu(!0)),iv.restart()),ip=(ni(window,[\"focus\",\"scroll\"],I),ni(window,\"blur\",()=>iv.trigger()),ni(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],I),I(),()=>iu()),ih=0,ig=void 0,iy=()=>(null!=ig?ig:rH())+\"_\"+im(),im=()=>(e8(!0)-(parseInt(ig.slice(0,-2),36)||0)).toString(36)+\"_\"+(++ih).toString(36),ik=new Map,iS={id:ig,heartbeat:e8()},iT={knownTabs:new Map([[ig,iS]]),variables:new Map},[ix,iI]=Q(),[iA,iE]=Q(),iN=rH,i$=(e,t=e8())=>{e=ik.get(el(e)?e:rL(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iO=(...e)=>{var t=e8();return ij(tD(e,e=>(e.cache=[t],[rA(e),{...e,created:t,modified:t,version:\"0\"}])))},i_=e=>null!=(e=tD(e,e=>{var t,r;return e&&(t=rL(e[0]),(r=ik.get(t))!==e[1])?[t,e[1],r,e[0]]:tM}))?e:[],ij=e=>{var r,n,e=i_(e);null!=e&&e.length&&(r=e8(),tB(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),t9(ik,e),(n=tJ(e,([,,,e])=>0<rB.compare(e.scope,\"tab\"))).length&&iN({type:\"patch\",payload:t8(n)}),iE(tD(e,([,e,t,r])=>[r,e,t]),ik,!0))},[,iM]=(rl((e,t)=>{n3(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),ig=null!=(n=null==r?void 0:r[0])?n:e8(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),ik=new Map(tX(tJ(ik,([,e])=>\"view\"===(null==e?void 0:e.scope)),tD(null==r?void 0:r[1],e=>[rL(e),e])))):sessionStorage.setItem(\"_tail:state\",e([ig,tD(ik,([,e])=>e&&\"view\"!==e.scope?e:tM)]))},!0),iN=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([ig,t,r])),localStorage.removeItem(\"_tail:state\"))},ni(window,\"storage\",e=>{var l,a,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==ig||([e,{type:l,payload:a}]=e,\"query\"===l?r.active||iN({type:\"set\",payload:[tD(iT.knownTabs),tD(iT.variables)]},e):\"set\"===l&&r.active?(iT.knownTabs=new Map(a[0]),iT.variables=new Map(a[1]),ik=new Map(a[1]),r.trigger()):\"patch\"===l?(o=i_(tD(a,([e,t])=>[rV(e),t])),t9(iT.variables,a),t9(ik,a),iE(tD(o,([,e,t,r])=>[r,e,t]),ik,!1)):\"tab\"===l&&(t5(iT.knownTabs,e,a),a)&&iI(\"tab\",a,!1))});var r=te(()=>iI(\"ready\",iT,!0),-25),n=te({callback(){var e=e8()-1e4;tB(iT.knownTabs,([t,r])=>r[0]<e&&t5(iT.knownTabs,t,void 0)),iS.heartbeat=e8(),iN({type:\"tab\",payload:iS})},frequency:5e3,paused:!0});n3(e=>(e=>{iN({type:\"tab\",payload:e?iS:void 0}),e?(r.restart(),iN({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),Q()),[iU,iF]=Q(),iq=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?nQ:nZ)(localStorage.getItem(\"_tail:rq\")),l=0,a=()=>localStorage.setItem(\"_tail:rq\",(r?nY:nX)([ig,e8()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e8())&&(a(),(null==(d=i())?void 0:d[0])===ig))return 0<t&&(l=setInterval(()=>a(),t/2)),P(r,!0,()=>{clearInterval(l),localStorage.removeItem(\"_tail:rq\")});var v=ta(),[d]=ni(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[tl(null!=o?o:t),v],await Promise.race(e.map(e=>ep(e)?e():e)),d()}var e;null==o&&C(\"_tail:rq could not be acquired.\")}})(),iz=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n0;var i,l,a=!1,o=r=>{var o=ep(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iM(e,i=null!=o&&!0!==o?o:i,r,e=>(a=i===J,i=e)),!a)&&(l=n?nY(i,!0):JSON.stringify(i))};if(!r)return iq(()=>ez(1,async t=>{var a;return o(t)?400<=(a=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:l})).status?0===t?eS(C(\"Invalid response: \"+await a.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(a=null!=(t=n?new Uint8Array(await a.arrayBuffer()):await a.text())&&t.length?null==(a=n?nQ:JSON.parse)?void 0:a(t):J)&&iF(a),eS(a)):eS()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[l]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&C(\"Beacon send failed.\")},th=[\"scope\",\"key\",\"entityId\",\"source\"],iP=[...th,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iW=[...th,\"value\",\"force\",\"ttl\",\"version\"],iB=new Map,iD=(e,t)=>{var r=te(async()=>{var e=tD(iB,([e,t])=>({...rV(e),result:[...t]}));e.length&&await a.get(e)},3e3),n=(e,t)=>t&&t4(iB,e,()=>new Set).add(t),a=(n3((e,t)=>r.toggle(e,e&&3e3<=t),!0),iA(e=>tB(e,([e,t])=>(e=>{var t,r;e&&(t=rL(e),null!=(r=e1(iB,t)))&&r.size&&tB(r,r=>!0===r(e)&&n(t,r))})(t?{status:l.Success,...t}:{status:l.NotFound,...e}))),{get:r=>rU(\"get\",r,async r=>{r[0]&&!el(r[0])||(o=r[0],r=r.slice(1)),null!=t&&t.validateKey(o);var u=new Map,s=[],d=tD(r,e=>{var t=i$(rL(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:l.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)u.set(e,{status:l.Success,...t});else{if(!rJ(e))return[re(e,iP),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rA(e),version:\"1\",created:v,modified:v,value:r,cache:[v,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},t3(s,[rA(r),r]),u.set(e,{status:l.Success,...r})):u.set(e,{status:l.NotFound,...rA(e)})}return tM}),v=e8(),o=d.length&&(null==(o=await iz(e,{variables:{get:tD(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=o.variables)?void 0:r.get)||[],f=[];return tB(o,(e,t)=>{var n,r;(null==e?void 0:e.status)===l.NotFound?null!=(r=null==(r=(n=d[t][1]).init)?void 0:r.call(n))&&f.push([n,{...rA(n),value:r}]):u.set(d[t][1],rD(e))}),f.length&&tB(await a.set(tD(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rD(e.status===l.Conflict?{...e,status:l.Success}:e))),s.length&&ij(s),u},{poll:(e,t)=>n(rL(e),t),logCallbackError:(e,t,r)=>n5(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rU(\"set\",r,async r=>{r[0]&&!el(r[0])||(v=r[0],r=r.slice(1)),null!=t&&t.validateKey(v);for(var n=[],i=new Map,o=e8(),u=[],s=tD(r,e=>{var s,r,t=i$(rL(e));return rJ(e)?((r=null==(s=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rA(e),created:null!=(r=null==t?void 0:t.created)?r:o,modified:o,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:s,cache:[o,e.ttl]})&&(r.cache=[o,null!=(s=e.ttl)?s:3e3]),i.set(e,r?{status:t?l.Success:l.Created,...r}:{status:l.Success,...rA(e)}),t3(n,[rA(e),r]),tM):e.patch?(u.push(e),tM):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[re(e,iW),e])}),d=0;!d++||u.length;){var v,f=await a.get(tD(u,e=>rA(e))).all(),f=(tB(f,(e,t)=>{var r=u[t];rN(e,!1)?t3(s,[{...r,patch:void 0,value:u[t].patch(null==e?void 0:e.value),version:e.version},r]):i.set(r,e)}),u=[],s.length?F(null==(f=(await iz(e,{variables:{set:tD(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:f.set,\"No result.\"):[]);tB(f,(e,t)=>{var[,t]=s[t];d<=3&&t.patch&&((null==e?void 0:e.status)===l.Conflict||(null==e?void 0:e.status)===l.NotFound)?t3(u,t):i.set(t,rD(e))})}return n.length&&ij(n),i},{logCallbackError:(e,t,r)=>n5(\"Variables.set\",e,{operation:t,error:r})})});return iU(({variables:e})=>{e&&null!=(e=tX(tD(e.get,e=>rE(e)?e:tM),tD(e.set,e=>rN(e)?e:tM)))&&e.length&&ij(tD(e,e=>[rA(e),rN(e)?e:void 0]))}),a},iJ=Symbol(),iV=Symbol(),iK=[.75,.33],iH=[.25,.33],iX=e=>tD(tY(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rI(e)}, ${rJ(e)?\"client-side memory only\":rd(null==(e=e.schema)?void 0:e.usage)})`,V]:tM),i0=(e,t=\"A\"===r8(e)&&r2(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),i1=(e,t=r8(e),r=ny(e,\"button\"))=>r!==V&&(U(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&U(r4(e,\"type\"),\"button\",\"submit\")||r===K),i2=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tf((null==(r=r2(e,\"title\"))?void 0:r.trim())||(null==(r=r2(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?nn(e):void 0}},i4=e=>{if(w)return w;el(e)&&([r,e]=nZ(e),e=nF(r,{decodeJson:!0})[1](e)),eZ(nb,e),(e=>{nQ===rH&&([nY,nQ]=nF(e,{json:!e,prettify:!1}),n0=!!e,n2(nY,nQ))})(e1(nb,\"encryptionKey\"));var r,a,o,u,s,d,v,c,f,p,h,g,y,i=e1(nb,\"key\"),l=null!=(e=null==(r=rG[nb.name])?void 0:r._)?e:[];if(eo(l))return a=[],o=[],u=(e,...t)=>{var r=K;o=eB(o,n=>q(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:w,unsubscribe:()=>r=V}),r},(e=>t=>n5(e,t))(n)))},s=[],v=iD(nL,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=iy()),null==e.timestamp&&(e.timestamp=e8()),h=K,tB(a,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===V&&tU(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&C(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,l=new Map,a=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eX(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):C(\"Source event not queued.\")},o=async(r,n=!0,i)=>{var l;return r[0]&&!el(r[0])||(l=r[0],r=r.slice(1)),r=tD(r,e=>{if(null!=t&&t.validateKey(null!=l?l:e.key),eX(e,{metadata:{posted:!0}}),e[iJ]){if(!1===e[iJ](e))return;delete e[iJ]}return eX(rc(e6(e),!0),{timestamp:e.timestamp-e8()})}),nG({[nH]:tD(r,e=>[e,e.type,V])},\"Posting \"+rn([td(\"new event\",[eD(r,e=>!rf(e))||void 0]),td(\"event patch\",[eD(r,e=>rf(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),iz(e,{events:r,variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},u=async(e,{flush:r=!1,async:i=!0,variables:l}={})=>{var a=[];if(e=tD(tG(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e4(a,e),null!=(r=t7(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:tM}),tB(a,e=>nG(e,e.type)),!i)return o(e,!1,l);r?(n.length&&e5(e,...n.splice(0)),e.length&&await o(e,!0,l)):e.length&&e4(n,...e)};return te(()=>u([],{flush:!0}),5e3),n9((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tD(l,([e,t])=>{var[t,n]=t();return n&&(l.delete(e),i.delete(e)),null!=t?t:tM}),n.length||e.length)&&u(ej(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,t,r)=>u(a(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var o=!1,s=()=>{o=!0};return i.set(e,e6(e)),l.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var l=i.get(e),[r,d]=null!=(r=e3(t(l,s),l))?r:[];if(r&&!M(d,l))return i.set(e,e6(d)),[a(e,r),o]}return[void 0,o]}),r&&u(e),s}}})(nL,d),f=null,p=0,g=h=V,y=!1,w=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||el(e[0]))&&(t=e[0],e=e.slice(1)),el(e[0])&&(r=e[0],e=ew(r)?JSON.parse(r):nZ(r));var t,n=V;if((e=eB(tL(e,e=>el(e)?nZ(e):e),e=>{if(!e)return V;if(lx(e))nb.tags=eZ({},nb.tags,e.tagAttributes);else{if(lI(e))return nb.disabled=e.disable,V;if(lN(e))return n=K,V;if(lM(e))return e(w),V}return g||lO(e)||lE(e)?K:(s.push(e),V)})).length||n){var r=eK(e,e=>lE(e)?-100:lO(e)?-50:lC(e)?-10:rF(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),q(()=>{var e=f[p];if(u(\"command\",e),h=V,rF(e))c.post(e);else if(l$(e))v.get(tG(e.get));else if(lC(e))v.set(tG(e.set));else if(lO(e))e4(o,e.listener);else if(lE(e))(t=q(()=>e.extension.setup(w),t=>n5(e.extension.id,t)))&&(e4(a,[null!=(r=e.priority)?r:100,t,e.extension]),eK(a,([e])=>e));else if(lM(e))e(w);else{var r,n,t,l=V;for([,t]of a)if(l=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:V)break;l||n5(\"invalid-command\",e,\"Loaded extensions:\",tD(a,e=>e[2].id))}},e=>n5(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else l.push(...e)},Object.defineProperty(rG,nb.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+iy(),events:c,variables:v,__isTracker:K})),configurable:!1,writable:!1}),iA((e,t,r)=>{var n=ej(iX(tD(e,([,e])=>e||tM)),[[{[nH]:iX(tD(t,([,e])=>e||tM))},\"All variables\",K]]);nG({[nH]:n},tc(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eD(t)} in total).`,\"2;3\"))}),ix(async(e,t,r,n)=>{var a;\"ready\"===e&&([e,a]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:L}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{w(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==k?void 0:k.clientId,languages:tD(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return W({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==rG?void 0:rG.screen,r?({width:r,height:i,orientation:l}=r,a=r<i,-90!==(l=null!=(l=null!=(l=null==l?void 0:l.angle)?l:rG.orientation)?l:0)&&90!==l||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rG.devicePixelRatio,width:r,height:i,landscape:a}}):{})}));var i,a,l,r})(),e.hasUserAgent=!0),g=!0,s.length&&w(s),n(),y=!0,w(...tD(lw,e=>({extension:e})),...l),w({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),w;C(`The global variable for the tracker \"${nb.name}\" is used for something else than an array of queued commands.`)},i5=()=>null==k?void 0:k.clientId,i3={scope:\"shared\",key:\"referrer\"},i8=(e,t)=>{w.variables.set({...i3,value:[i5(),e]}),t&&w.variables.get({scope:i3.scope,key:i3.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},i9=e9(),i7=e9(),le=1,[lr,ln]=Q(),li=e=>{var t=e9(e,i9),r=e9(e,i7),n=e9(e,ip),i=e9(e,()=>le);return(e,l)=>({totalTime:t(e,l),visibleTime:r(e,l),activeTime:n(e,l),activations:i(e,l)})},ll=li(),[lo,lu]=Q(),ls=(e,t)=>(t&&tB(lv,t=>e(t,()=>!1)),lo(e)),ld=new WeakSet,lv=document.getElementsByTagName(\"iframe\");function lf(e){if(e){if(null!=e.units&&U(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var lh=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),lg=e=>nm(e,t=>t!==e&&!!lh(no.get(t)),e=>(T=no.get(e),(T=no.get(e))&&e_(ej(T.component,T.content,T),\"tags\"))),ly=(e,t)=>t?e:{...e,rect:void 0,content:(x=e.content)&&tD(x,e=>({...e,rect:void 0}))},lm=(e,t=V,r)=>{var n,i,l,a=[],o=[],u=0;return r0(e,e=>{var s,l,i=no.get(e);i&&(lh(i)&&(l=eB(tG(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==K||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eV(l,e=>null==(e=e.track)?void 0:e.region))&&nn(e)||void 0,s=lg(e),i.content&&e5(a,...tD(i.content,e=>({...e,rect:n,...s}))),null!=l)&&l.length&&(e5(o,...tD(l,e=>{var t;return u=eJ(u,null!=(t=e.track)&&t.secondary?1:2),ly({...e,content:a.length?a:void 0,rect:n,...s},!!n)})),a=[]),l=i.area||ng(e,\"area\"))&&e5(o,l)}),a.length&&e4(o,ly({id:\"\",rect:n,content:a})),tB(o,e=>{el(e)?e4(null!=i?i:i=[],e):(null==e.area&&(e.area=rr(i,\"/\")),e5(null!=l?l:l=[],e))}),l||i?{components:l,area:rr(i,\"/\")}:void 0},lb=Symbol(),lw=[{id:\"context\",setup(e){te(()=>tB(lv,e=>eQ(ld,e)&&lu(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==k||!t||null!=k&&k.definition?null!=(n=t)&&t.navigation&&f(!0):(k.definition=t,null!=(t=k.metadata)&&t.posted?e.events.postPatch(k,{definition:n}):nG(k,k.type+\" (definition updated)\")),!0}});var n,t,d=null!=(t=null==(t=i$({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=i$({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&iO({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=i$({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=i$({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=V)=>{var l,a,o,i,p;ne(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:l}=tm(location.href+\"\",{requireAuthority:!0}),k={type:\"view\",timestamp:e8(),clientId:iy(),tab:ig,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:l},tabNumber:v+1,tabViewNumber:d+1,viewport:na(),duration:ll(void 0,!0)},0===v&&(k.firstTab=K),0===v&&0===d&&(k.landingPage=K),iO({scope:\"tab\",key:\"viewIndex\",value:++d}),a=tb(location.href),tD([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=k).utm)?n:o.utm={})[e]=null==(n=tG(a[\"utm_\"+e]))?void 0:n[0])?e:tM}),!(k.navigationType=S)&&performance&&tB(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=t_(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(null!=(t=k.navigationType)?t:k.navigationType=\"navigate\")&&(p=null==(i=i$(i3))?void 0:i.value)&&nD(document.referrer)&&(k.view=null==p?void 0:p[0],k.relatedEventId=null==p?void 0:p[1],e.variables.set({...i3,value:void 0})),(p=document.referrer||null)&&!nD(p)&&(k.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tm(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),k.definition=n,n=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:ll()})),ln(k))};return n9(e=>{e?(i7(K),++le):i7(V)}),ni(window,\"popstate\",()=>(S=\"back-forward\",f())),tB([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",f()}}),f(),{processCommand:t=>lT(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),K),decorate(e){!k||rq(e)||rf(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tB(e,e=>{var t,r;return null==(t=(r=e.target)[iV])?void 0:t.call(r,e)})),r=new Set,n=(te({callback:()=>tB(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rX.createRange();return(l,a)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;a&&(o=eB(null==a?void 0:a.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==K}))&&eD(o)&&(p=f=V,g=h=0,y=(e,t,r,n)=>{var i,l=null!=(l=(i=null!=u?u:u=[])[e])?l:i[e]=[{duration:0,impressions:0},e9(!1,ip),!1,!1,0,0,0,tj()];l[4]=t,l[5]=r,l[6]=n},m=[tj(),tj()],b=li(!1),w=e9(!1,ip),k=-1,S=()=>{var $,t=l.getBoundingClientRect(),r=window.innerWidth,a=window.innerHeight,S=[n(t.top,a),n(t.right,r),n(t.bottom,a),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],E=f?iH:iK,r=(E[0]*a<T||E[0]<(T/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nb.impressionThreshold-250)&&(++h,b(f),s||e(s=tD(o,e=>((null==(e=e.track)?void 0:e.impressions)||ny(l,\"impressions\",K,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:nt(l),viewport:na(),timeOffset:ll(),impressions:h,...lm(l,K)})||tM)),null!=s)&&s.length&&($=b(),d=tD(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:$,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:$.activeTime&&c&&n($.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=l.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),l=0,a=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,l+=r[0].length,6<r[0].length&&++o,++a);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*l|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:em(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:l,words:a,sentences:u,lix:em(a/u+100*o/a),readTime:em(a/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*a){var _=rX.createTreeWalker(l,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(M=_.nextNode());){var M,U,F,P,B,z=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](M,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),B=t.top,C<3?y(0,F-B,P-B,v[1].readTime):(y(1,u[0][4],F-B,v[2].readTime),y(2,F-B,P-B,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(E,E+T)*m[1].push(r,r+S)/L),u&&tB(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>a?a:t.bottom,e[5],e[4]),l=f&&0<i-r,o=e[0];o.duration=e[1](l),l&&(e[3]!==(e[3]=l)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},l[iV]=({isIntersecting:e})=>{eZ(r,S,e),e||(tB(d,e=>e()),S())},t.observe(l))}})(e),n=({boundary:e,...n})=>{eY(no,e,e=>{var t;return(e=>null==e?void 0:{...e,component:tG(e.component),content:tG(e.content),tags:tG(e.tags)})(\"add\"in n?{...e,component:ej(null==e?void 0:e.component,n.component),content:ej(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:ej(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,no.get(e))};return{decorate(e){tB(e.components,t=>{t5(t,\"track\",void 0),tB(e.clickables,e=>t5(e,\"track\",void 0))})},processCommand:e=>lA(e)?(n(e),K):lj(e)?(tB(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var l=[];null!=r2(i,e);){eQ(n,i);var a,o=tO(r2(i,e),\"|\");r2(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=ea(d))?s:\"\",36);if(s<0)l.length+=s;else{if(0===u&&(l.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e4(l,d)}}}e4(r,...tD(l,e=>({add:K,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(a=i.parentNode)&&a.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),K):V}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ni(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,l,a,o,u,s=V;if(r0(n.target,e=>{i1(e)&&null==a&&(a=e),s=s||\"NAV\"===r8(e);var t,d=nu(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tB(e.querySelectorAll(\"a,button\"),t=>i1(t)&&(3<(null!=u?u:u=[]).length?eS():u.push({...i2(t,!0),component:r0(t,(e,t,r,n=null==(i=nu(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=ny(e,\"clicks\",K,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eV(d,e=>(null==(e=e.track)?void 0:e.clicks)!==V)),null==l&&(l=null!=(t=ny(e,\"region\",K,e=>null==(e=e.track)?void 0:e.region))?t:d&&eV(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=a){var d,v=u&&!a&&i,c=lm(null!=a?a:o,!1,v),f=nm(null!=a?a:o,void 0,e=>tJ(tG(null==(e=no.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(l=null==l?K:l)?{pos:nt(a,n),viewport:na()}:null,...((e,t)=>{var n;return r0(null!=e?e:t,e=>\"IMG\"===r8(e)||e===t?(n={element:i2(e,!1)},V):K),n})(n.target,null!=a?a:o),...c,timeOffset:ll(),...f});if(a)if(i0(a)){var h=a,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=tm(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:iy(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:K,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r2(h,\"target\")!==window.name?(i8(w.clientId),w.self=V,e(w)):ne(location.href,h.href)||(w.exit=w.external,i8(w.clientId))):(k=h.href,(b=nD(k))?i8(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nb.captureContextMenu&&(h.href=nV+\"=\"+T+encodeURIComponent(k),ni(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),ni(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{r0(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>el(e=null==e||e!==K&&\"\"!==e?e:\"add\")&&U(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ed(e)?e:void 0)(null!=(r=null==(r=nu(e))?void 0:r.cart)?r:ng(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?J:eo(e)||el(e)?e[e.length-1]:eF(e,(e,r)=>e,void 0,void 0))(null==(r=nu(e))?void 0:r.content))&&t(d)});c=lf(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eY(t,o,r=>{var i=nr(o,n);return r?e4(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),ls(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r7(K);lr(()=>{return e=()=>(t={},r=r7(K)),setTimeout(e,250);var e}),ni(window,\"scroll\",()=>{var l,n=r7(),i={x:(u=r7(V)).x/(rZ.offsetWidth-window.innerWidth)||0,y:u.y/(rZ.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(l=[],!t.fold&&n.y>=r.y+200&&(t.fold=K,e4(l,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=K,e4(l,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=K,e4(l,\"page-end\")),(n=tD(l,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return lS(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=lf(r))&&e({...r,type:\"cart_updated\"}),K):l_(t)?(e({type:\"order\",...t.order}),K):V}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||r6(e,ns(\"form-value\")),e=(t&&(r=r?er(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tf(e,200)),r?e:void 0},i=t=>{var i,a,s,l=t.form;if(l)return a=r6(l,ns(\"ref\"))||\"track_ref\",(s=t4(r,l,()=>{var t,r=new Map,n={type:\"form\",name:r6(l,ns(\"form-name\"))||r2(l,\"name\")||l.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ll()})),((e=0)=>{var t,r,n=(i,l=e)=>{if(void 0===i)return!!r;clearTimeout(t),et(i)?i&&(l<0?en:D)(null==r?void 0:r())?n(r):r=void 0:(r=i,t=setTimeout(()=>n(!0,l),l<0?-l:l))};return n})());return ni(l,\"submit\",()=>{i=lm(l),t[3]=3,s(()=>{(l.isConnected&&0<nn(l).width?(t[3]=2,s):()=>{o(),2<=t[3]&&(n.completed=3===t[3]||!(l.isConnected&&nn(l).width)),e.events.postPatch(n,{...i,totalTime:e8(K)-t[4]}),t[3]=1})()},750)}),t=[n,r,l,0,e8(K),1]}))[1].get(t)||tB(l.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{var d,v,l;e.name&&\"hidden\"!==e.type?(l=null!=(d=(l=s[0].fields)[v=e.name])?d:l[v]={id:e.id||v,name:v,label:t_(null!=(v=null==(d=e.labels)||null==(l=d[0])?void 0:l.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[lb]:n(e),value:n(e,!0)},s[0].fields[l.name]=l,s[1].set(e,l)):\"hidden\"!==e.type||e.name!==a&&!ny(e,\"ref\")||(e.value||(e.value=t_(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[t,s]},l=(e,[r,n]=null!=(t=i(e))?t:[],l=null==n?void 0:n[1].get(r))=>l&&[n[0],l,r,n],a=null,o=()=>{var r,i,l,o,d,v,c;a&&([r,i,l,o]=a,d=-(u-(u=i7())),v=-(s-(s=e8(K))),c=i[lb],(i[lb]=n(l))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=K,o[3]=2,tB(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(l,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,a=null)},u=0,s=0,d=e=>e&&ni(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&l(e.target))=>r&&(a=r,\"focusin\"===e.type?(s=e8(K),u=i7()):o()));d(document),ls(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||rv.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},l=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rG.dataLayer,i=t,l=null==n?void 0:n.length;if(l&&(t!==(t=n[l-1])||!t))for(;l--&&((e=n[l])!==i||!i);){var a={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tD(r,([t,r])=>\"granted\"===e[2][t]&&(a[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"indirect\",purposes:a}}}}}}),{});return{processCommand(e){var r,a,t,s,d;return lU(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(a=e.consent.externalSource)&&(d=a.key,(null!=(t=l[d])?t:l[d]=te({frequency:null!=(e=a.frequency)?e:1e3})).restart(a.frequency,async()=>{var e,t,r;rX.hasFocus()&&(e=a.poll(s))&&!rv.equals(s,e)&&([t,r]=await i(e),t&&nG(r,\"Consent was updated from \"+d),s=e)}).trigger()),K):V}}}}],I=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),lS=I(\"cart\"),lT=I(\"username\"),lx=I(\"tagAttributes\"),lI=I(\"disable\"),lA=I(\"boundary\"),lE=I(\"extension\"),lN=I(K,\"flush\"),l$=I(\"get\"),lO=I(\"listener\"),l_=I(\"order\"),lj=I(\"scan\"),lC=I(\"set\"),lM=e=>\"function\"==typeof e,lU=I(\"consent\");Object.defineProperty(rG,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(i4)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
};

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

const generateClientBootstrapScript = (config, encrypt)=>{
    // Add a layer of "security by obfuscation" - just in case.
    const tempKey = "" + Math.random();
    const clientConfig = {
        ...config,
        dataTags: undefined
    };
    const f = `window[${JSON.stringify(INITIALIZE_TRACKER_FUNCTION)}]`;
    const scriptBlockerAttributes = config.scriptBlockerAttributes;
    // We use polling instead of attaching to the "load" event for the injected script.
    // The latter seems to get blocked by e.g. Cookiebot.
    return `((d=document,s=d.createElement("script"))=>{const poll=()=>${f}?${f}(init=>init(${JSON.stringify(encrypt ? httpEncode([
        tempKey,
        createTransport(tempKey)[0](clientConfig, true)
    ]) : clientConfig)})):setTimeout(poll,10);${scriptBlockerAttributes && `${JSON.stringify(map2(scriptBlockerAttributes))}.forEach(([k,v])=>s.setAttribute(k,v))`};s.src=${JSON.stringify(config.src + ((config.src.includes("?") ? "&" : "?") + BUILD_REVISION_QUERY ))};poll();d.head.appendChild(s)})();`;
};
const generateClientExternalNavigationScript = (requestId, url)=>{
    // TODO: Update if we decide to change the client to use BroadcastChannel (that would be, if Chrome fixes the bf_cache issues
    // where BroadcastChannel makes the page unsalvageable)
    return `<html><head><script>try{localStorage.setItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)},${JSON.stringify(JSON.stringify({
        requestId
    }))});localStorage.removeItem(${JSON.stringify(CLIENT_CALLBACK_CHANNEL_ID)});}catch(e){console.error(e);}location.replace(${JSON.stringify(url)});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};

const LegacyClassifications = [
    "anonymous",
    "indirect",
    "direct",
    "sensitive"
];
const LegacyPurposes = {
    Functionality: 2,
    Performance: 4,
    Targeting: 8
};
const tryConvertLegacyConsent = (consent)=>{
    const match = consent === null || consent === void 0 ? void 0 : consent.match(/^(\d*)@(\d*)$/);
    if (!match) {
        return undefined;
    }
    const classification = LegacyClassifications[+(match[2] || 0)];
    const purposeFlags = +(match[1] || 0);
    const purposes = {
        performance: (purposeFlags & LegacyPurposes.Performance) > 0,
        functionality: (purposeFlags & LegacyPurposes.Functionality) > 0,
        marketing: (purposeFlags & LegacyPurposes.Targeting) > 0
    };
    purposes.personalization = purposes.performance;
    purposes.security = true;
    return {
        classification,
        purposes
    };
};
const tryConvertLegacyDeviceVariable = (values)=>{
    if (values.length > 3) {
        return [
            values[0],
            values[2],
            values[3]
        ];
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
            if (this._initialized) return;
            let { host, crypto, environmentTags, encryptionKeys, schemas, storage } = this._config;
            try {
                var _this_environment_storage_initialize, _this_environment_storage;
                if (!storage) {
                    storage = {
                        session: {
                            storage: new InMemoryStorage(30 * 1000 * 60)
                        },
                        device: {
                            storage: new InMemoryStorage(30 * 1000 * 60)
                        }
                    };
                }
                // Initialize extensions. Defaults + factories.
                this._extensions = [
                    Timestamps,
                    new TrackerCoreEvents(),
                    new CommerceExtension(),
                    ...filter2(await Promise.all(this._extensionFactories.map(async (factory)=>{
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
                this._schema = new TypeResolver((await schemaBuilder.build(host)).map((schema)=>({
                        schema
                    })));
                // Initialize environment.
                this.environment = new TrackerEnvironment(host, crypto !== null && crypto !== void 0 ? crypto : new DefaultCryptoProvider(encryptionKeys), new VariableStorageCoordinator({
                    storage: storage,
                    errorLogger: (message)=>this.environment.log(this.environment.storage, message)
                }, this._schema), environmentTags);
                this.environment._setLogInfo(...this._extensions.map((source)=>({
                        source,
                        group: "extensions"
                    })));
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
                this.environment.log(this, "Request handler initialized.", "info");
            } catch (error) {
                host.log(serializeLogMessage({
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
        return map2(events, (ev)=>{
            if (isValidationError(ev)) return ev;
            try {
                const eventType = this._schema.getEventType(ev);
                ev = eventType.validate(ev, undefined, {
                    trusted: tracker.trustedContext
                });
                var _eventType_censor;
                return (_eventType_censor = eventType.censor(ev, {
                    trusted: tracker.trustedContext,
                    consent: tracker.consent
                })) !== null && _eventType_censor !== void 0 ? _eventType_censor : skip2;
            } catch (e) {
                return {
                    error: e instanceof ValidationError ? `Invalid data for '${ev.type}' event:\n${indent2(e.message)}` : formatError(e),
                    source: ev
                };
            }
        });
    }
    async post(tracker, eventBatch, options) {
        const context = {
            passive: !!(options === null || options === void 0 ? void 0 : options.passive)
        };
        let events = eventBatch;
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
        const patchExtensions = this._extensions.filter((ext)=>ext.patch);
        const callPatch = async (index, results)=>{
            const extension = patchExtensions[index];
            const events = collectValidationErrors(this._validateEvents(tracker, results));
            if (!extension) return events;
            try {
                return collectValidationErrors(this._validateEvents(tracker, await extension.patch(events, async (events)=>{
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
        if (validationErrors.length || hasKeys2(extensionErrors)) {
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
                join2(v, ",")
            ]));
        let trackerInitializationOptions;
        let trackerSettings = deferred(async ()=>{
            var _headers_xforwardedfor, _obj2;
            var _headers_xforwardedfor_, _ref;
            clientIp !== null && clientIp !== void 0 ? clientIp : clientIp = (_ref = (_headers_xforwardedfor_ = (_headers_xforwardedfor = headers["x-forwarded-for"]) === null || _headers_xforwardedfor === void 0 ? void 0 : _headers_xforwardedfor[0]) !== null && _headers_xforwardedfor_ !== void 0 ? _headers_xforwardedfor_ : (_obj2 = obj2(parseQueryString(headers["forwarded"]))) === null || _obj2 === void 0 ? void 0 : _obj2["for"]) !== null && _ref !== void 0 ? _ref : undefined;
            let clientEncryptionKey;
            if (this._config.clientEncryptionKeySeed) {
                clientEncryptionKey = this.environment.hash((this._config.clientEncryptionKeySeed || "") + await this._clientIdGenerator.generateClientId(this.environment, request, true), 64);
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
                anonymousSessionReferenceId: this.environment.hash(await this._clientIdGenerator.generateClientId(this.environment, request, false), 128),
                trustedContext,
                requestHandler: this,
                defaultConsent: this._defaultConsent,
                cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
                clientEncryptionKey: this._config.json ? undefined : clientEncryptionKey,
                transport: this._config.json ? defaultJsonTransport : createTransport(clientEncryptionKey),
                cookieTransport: createTransport(clientEncryptionKey)
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
                            if ((queryValue = join2(query === null || query === void 0 ? void 0 : query[INIT_SCRIPT_QUERY])) != null) {
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
                            if ((queryValue = join2(query === null || query === void 0 ? void 0 : query[CLIENT_SCRIPT_QUERY])) != null) {
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
                            if ((queryValue = join2(query === null || query === void 0 ? void 0 : query[CONTEXT_NAV_QUERY])) != null) {
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
                                const [, requestId, targetUri] = (_match = match(join2(queryValue), /^([0-9]*)(.+)$/)) !== null && _match !== void 0 ? _match : [];
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
                            if ((queryValue = join2(query === null || query === void 0 ? void 0 : query[SCHEMA_QUERY])) != null) {
                                let serialized;
                                if (queryValue === "native") {
                                    serialized = JSON.stringify(this._schema.definitions, null, 2);
                                } else {
                                    serialized = new JsonSchemaAdapter(CORE_SCHEMA_NS + ":runtime").serialize(this._schema.schemas);
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
                            if ((queryValue = join2(query === null || query === void 0 ? void 0 : query[EVENT_HUB_QUERY])) != null) {
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
                                        postRequest = isJsonObject(body) ? body : JSON.parse(typeof body === "string" ? body : decodeUtf8(body));
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
                                                trusted: false
                                            }).all();
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
            trackerScript.push(PLACEHOLDER_SCRIPT(trackerRef, true));
        }
        const inlineScripts = [
            join2(trackerScript)
        ];
        const otherScripts = [];
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
                }
            }
        }
        if (html) {
            const keyPrefix = this._clientConfig.key ? JSON.stringify(this._clientConfig.key) + "," : "";
            if (tracker.resolved) {
                const pendingEvents = tracker.resolved.clientEvents;
                pendingEvents.length && inlineScripts.push(`${trackerRef}(${keyPrefix}${join2(pendingEvents, (event)=>typeof event === "string" ? event : JSON.stringify(event), ", ")});`);
            }
            if (initialCommands) {
                inlineScripts.push(`${trackerRef}(${keyPrefix}${isString(initialCommands) ? JSON.stringify(initialCommands) : httpEncode(initialCommands)});`);
            }
            otherScripts.push({
                src: `${endpoint !== null && endpoint !== void 0 ? endpoint : this.endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName ? `#${this._trackerName}` : ""}`,
                defer: true
            });
        }
        const js = join2([
            {
                inline: join2(inlineScripts)
            },
            ...otherScripts
        ], (script)=>{
            if ("inline" in script) {
                return html ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${script.inline}</script>` : script.inline;
            } else {
                var _map2, _this__config_client;
                return html ? `<script${(_map2 = map2((_this__config_client = this._config.client) === null || _this__config_client === void 0 ? void 0 : _this__config_client.scriptBlockerAttributes, ([key, value])=>` ${key}="${value.replaceAll('"', "&quot;")}"`)) === null || _map2 === void 0 ? void 0 : _map2.join("")} src='${script.src}?${INIT_SCRIPT_QUERY}${"&" + BUILD_REVISION_QUERY }'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
        _define_property$9(this, "instanceId", void 0);
        /** @internal */ _define_property$9(this, "_cookieNames", void 0);
        _define_property$9(this, "endpoint", void 0);
        _define_property$9(this, "environment", void 0);
        /** @internal */ _define_property$9(this, "_clientIdGenerator", void 0);
        let { trackerName, endpoint, extensions, cookies, client, clientIdGenerator, defaultConsent } = config = merge2({}, [
            config,
            DEFAULT
        ], {
            overwrite: false
        });
        this._config = Object.freeze(config);
        this._trackerName = trackerName;
        this.endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
        this._defaultConsent = defaultConsent;
        this._extensionFactories = filter2(extensions);
        this._cookies = new CookieMonster(cookies);
        this._clientIdGenerator = clientIdGenerator !== null && clientIdGenerator !== void 0 ? clientIdGenerator : new DefaultClientIdGenerator();
        this._cookieNames = {
            consent: cookies.namePrefix + ".consent",
            session: cookies.namePrefix + ".session",
            device: cookies.namePrefix + ".device",
            deviceByPurpose: obj2(DataPurposes.names, (purpose)=>[
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
        return this._cookieCipher[0](value);
    }
    _decryptCookie(value, logNameHint) {
        try {
            return this._cookieCipher[1](value);
        } catch  {
            try {
                return defaultTransport[1](value);
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
        const cookies = map2(new Map(concat(map2(this.cookies, ([name, cookie])=>[
                name,
                cookie.value
            ]), map2((_CookieMonster_parseCookieHeader = CookieMonster.parseCookieHeader(finalRequest.headers["cookies"])) === null || _CookieMonster_parseCookieHeader === void 0 ? void 0 : _CookieMonster_parseCookieHeader[requestCookies], ([name, cookie])=>[
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
    /**
   * Load device variables from the client, and store them as variables with a short TTL to avoid race conditions.
   *
   */ async _loadCachedDeviceVariables() {
        const variables = this._getClientDeviceVariables();
        if (variables) {
            var _this__clientDeviceCache;
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.loaded) {
                return;
            }
            this._clientDeviceCache.loaded = true;
            await this.set(map2(variables, ([, value])=>value), {
                trusted: true
            }).all(); // Ignore conflicts. That just means there are concurrent requests.
        }
    }
    _getClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = this._clientDeviceCache = {};
            let timestamp;
            DataPurposes.names.map((purposeName)=>{
                var _this_cookies_cookieName;
                // Device variables are stored with a cookie for each purpose.
                const cookieName = this._requestHandler._cookieNames.deviceByPurpose[purposeName];
                forEach2(this._decryptCookie((_this_cookies_cookieName = this.cookies[cookieName]) === null || _this_cookies_cookieName === void 0 ? void 0 : _this_cookies_cookieName.value, ` ${purposeName} device variables`), (value)=>{
                    var _deviceCache, _ref, _value_;
                    var _tryConvertLegacyDeviceVariable;
                    value = (_tryConvertLegacyDeviceVariable = tryConvertLegacyDeviceVariable(value)) !== null && _tryConvertLegacyDeviceVariable !== void 0 ? _tryConvertLegacyDeviceVariable : value;
                    var _variables, _;
                    (_ = (_ref = (_variables = (_deviceCache = deviceCache).variables) !== null && _variables !== void 0 ? _variables : _deviceCache.variables = {})[_value_ = value[0]]) !== null && _ !== void 0 ? _ : _ref[_value_] = {
                        scope: "device",
                        key: value[0],
                        version: value[1],
                        value: value[2],
                        created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
                        modified: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now()
                    };
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
        var _this_cookies_this__requestHandler__cookieNames_consent, _this_cookies_this__requestHandler__cookieNames_consent1;
        if (this._initialized === (this._initialized = true)) {
            return this;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        // TODO: Remove eventually when we can be sure, no one have old cookies in the browsers anymore.
        const legacyConsent = tryConvertLegacyConsent((_this_cookies_this__requestHandler__cookieNames_consent = this.cookies[this._requestHandler._cookieNames.consent]) === null || _this_cookies_this__requestHandler__cookieNames_consent === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_consent.value);
        this._consent = legacyConsent !== null && legacyConsent !== void 0 ? legacyConsent : DataUsage.deserialize((_this_cookies_this__requestHandler__cookieNames_consent1 = this.cookies[this._requestHandler._cookieNames.consent]) === null || _this_cookies_this__requestHandler__cookieNames_consent1 === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_consent1.value, this._defaultConsent);
        await this._ensureSession(timestamp, {
            deviceId,
            deviceSessionId,
            passive
        });
        return this;
    }
    async reset({ session = true, device = false, consent = false, referenceTimestamp, deviceId, deviceSessionId }) {
        if (consent) {
            await this.updateConsent({
                classification: "anonymous",
                purposes: {}
            });
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
    async updateConsent({ purposes, classification }) {
        if (!this._session) return;
        purposes = DataPurposes.parse(purposes);
        classification = DataClassification.parse(classification);
        purposes !== null && purposes !== void 0 ? purposes : purposes = this.consent.purposes;
        classification !== null && classification !== void 0 ? classification : classification = this.consent.classification;
        if (DataClassification.compare(classification !== null && classification !== void 0 ? classification : this.consent.classification, this.consent.classification) < 0 || some2(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]))) {
            // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
            await this.purge({
                // NOTE: We do not touch user variables automatically.
                // Consumers can hook into the apply or patch pipelines with an extension to provide their own logic -
                // they can see the current consent on the tracker in context, and the new consent from the event.
                scopes: [
                    "session",
                    "device"
                ],
                purposes: obj(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]) ? [
                        key,
                        true
                    ] : undefined),
                classification: {
                    gt: classification
                }
            }, {
                bulk: true,
                context: {
                    trusted: true
                }
            });
        }
        let previousLevel = this._consent.classification;
        this._consent = {
            classification,
            purposes
        };
        if (classification === "anonymous" !== (previousLevel === "anonymous")) {
            // We switched from cookie-less to cookies or vice versa.
            // Refresh scope infos and anonymous session pointer.
            await this._ensureSession(now(), {
                refreshState: true
            });
        }
    }
    async _ensureSession(timestamp = now(), { deviceId, deviceSessionId = this.deviceSessionId, passive = false, resetSession = false, resetDevice = false, refreshState = false } = {}) {
        var _this__session, _this_session, _this__decryptCookie, _this_cookies_this__requestHandler__cookieNames_session, _this__getClientDeviceVariables_SCOPE_INFO_KEY_value, _this__getClientDeviceVariables_SCOPE_INFO_KEY, _this__getClientDeviceVariables;
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
        } else if (((_this__session = this._session) === null || _this__session === void 0 ? void 0 : _this__session.value) && !refreshState) {
            // We already have a session value, and no refresh is needed (refresh is needed e.g. when changing consent.)
            // No refresh needed means this method has been called a second time, just to be sure the session is initialized.
            return;
        }
        var _ref;
        // In case we refresh (calling this method again, e.g. from consent change), we might already have an identified session ID.
        let identifiedSessionId = resetSession ? undefined : (_ref = ((_this_session = this.session) === null || _this_session === void 0 ? void 0 : _this_session.anonymous) ? undefined : this.sessionId) !== null && _ref !== void 0 ? _ref : (_this__decryptCookie = this._decryptCookie((_this_cookies_this__requestHandler__cookieNames_session = this.cookies[this._requestHandler._cookieNames.session]) === null || _this_cookies_this__requestHandler__cookieNames_session === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_session.value, "Session ID")) === null || _this__decryptCookie === void 0 ? void 0 : _this__decryptCookie.id;
        // We might also have an anonymous session ID.
        let anonymousSessionId;
        var _this_deviceId;
        deviceId = deviceId !== null && deviceId !== void 0 ? deviceId : resetDevice ? undefined : (_this_deviceId = this.deviceId) !== null && _this_deviceId !== void 0 ? _this_deviceId : (_this__getClientDeviceVariables = this._getClientDeviceVariables()) === null || _this__getClientDeviceVariables === void 0 ? void 0 : (_this__getClientDeviceVariables_SCOPE_INFO_KEY = _this__getClientDeviceVariables[SCOPE_INFO_KEY]) === null || _this__getClientDeviceVariables_SCOPE_INFO_KEY === void 0 ? void 0 : (_this__getClientDeviceVariables_SCOPE_INFO_KEY_value = _this__getClientDeviceVariables_SCOPE_INFO_KEY.value) === null || _this__getClientDeviceVariables_SCOPE_INFO_KEY_value === void 0 ? void 0 : _this__getClientDeviceVariables_SCOPE_INFO_KEY_value.id;
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
                init: ()=>useAnonymousTracking ? this.env.nextId("anonymous-session") : undefined
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
                if (identifiedSessionId || deviceId) {
                    // We switched from identified to anonymous tracking. Remove current session and device variables.
                    await this.env.storage.purge([
                        identifiedSessionId && {
                            scope: "session",
                            entityIds: [
                                identifiedSessionId
                            ]
                        },
                        deviceId && {
                            scope: "device",
                            entityIds: [
                                deviceId
                            ]
                        }
                    ], {
                        bulk: true,
                        context: {
                            trusted: true
                        }
                    });
                }
                this._device = undefined;
                this._session = await this.env.storage.get({
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    entityId: anonymousSessionId,
                    init: async ()=>createInitialScopeData(anonymousSessionId, timestamp, {
                            deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                            anonymous: true
                        })
                }, {
                    trusted: true
                });
            }
        } else {
            // If passive, identified session may be null at this point, and nothing will happen
            if (!passive) {
                var // 2. The session ID from the cookie has expired:
                _this__session1, _this__session2, _this__session3;
                // Make sure we have device ID and session IDs (unless passive, where new sessions are not created from context menu navigation links).
                if (// 1. We do not have an existing session ID from a cookie:
                !identifiedSessionId || ((_this__session1 = this._session) === null || _this__session1 === void 0 ? void 0 : _this__session1.entityId) !== identifiedSessionId && !(this._session = await this.env.storage.get({
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    entityId: identifiedSessionId
                }))) {
                    identifiedSessionId = await this.env.nextId("session");
                }
                // We might already have read the session above in check 2, or _ensureSession has already been called earlier.
                if (!((_this__session2 = this._session) === null || _this__session2 === void 0 ? void 0 : _this__session2.entityId) !== identifiedSessionId) {
                    this._session = await this.env.storage.get({
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        entityId: identifiedSessionId,
                        init: async ()=>// CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
                            // This means clients must make sure the initial request to the endpoint completes before more are sent (or at least do a fair effort).
                            // Additionally, analytics processing should be aware of empty sessions, and decide what to do with them (probably filter them out).
                            createInitialScopeData(identifiedSessionId, timestamp, {
                                anonymous: false,
                                // Initialize device ID here to keep it in the session.
                                deviceId: deviceId !== null && deviceId !== void 0 ? deviceId : await this.env.nextId("device"),
                                deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                                anonymousSessionId
                            })
                    }, {
                        trusted: true
                    });
                }
                deviceId = this._session.value.deviceId;
                this._device = await this.env.storage.get({
                    scope: "device",
                    key: SCOPE_INFO_KEY,
                    entityId: deviceId,
                    init: ()=>createInitialScopeData(deviceId, timestamp, {
                            sessions: 1
                        })
                }, {
                    trusted: true
                });
                if (((_this__session3 = this._session) === null || _this__session3 === void 0 ? void 0 : _this__session3.value.isNew) && !this._device.value.isNew) {
                    // New session, existing device. Update statistics.
                    await this.env.storage.set({
                        scope: "device",
                        key: SCOPE_INFO_KEY,
                        entityId: deviceId,
                        patch: (current)=>current && {
                                ...current,
                                sessions: current.sessions + 1,
                                lastSeen: timestamp
                            }
                    }, {
                        trusted: true
                    });
                }
                if (anonymousSessionId) {
                    // We went from anonymous to identified tracking.
                    await this.env.storage.set([
                        {
                            scope: "session",
                            key: SCOPE_INFO_KEY,
                            entityId: anonymousSessionId,
                            value: null,
                            force: true
                        },
                        this._anonymousSessionReferenceId && {
                            scope: "session",
                            key: SESSION_REFERENCE_KEY,
                            entityId: this._anonymousSessionReferenceId,
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
            }
        }
        if (this.deviceSessionId != null && deviceSessionId !== this.deviceSessionId) {
            // The sent device ID does not match the one in the current session.
            // For identified session this means an old tab woke up after being suspended.
            // For anonymous sessions this more likely indicates that multiple clients are active in the same session.
            this._expiredDeviceSessionId = deviceSessionId;
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
                value: DataUsage.serialize(this.consent)
            };
            const splits = {};
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.touched) {
                // We have updated device data and need to refresh to get whatever other processes may have written (if any).
                await consumeQueryResults((cursor)=>this.query({
                        scope: "device"
                    }, {
                        cursor
                    }), (variables)=>{
                    forEach2(variables, (variable)=>{
                        var _variable_schema;
                        forEach2(DataPurposes.parse((_variable_schema = variable.schema) === null || _variable_schema === void 0 ? void 0 : _variable_schema.usage.purposes, {
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
                    });
                });
            }
            const isAnonymous = this.consent.classification === "anonymous";
            if (isAnonymous) {
                // Clear session cookie if we have one.
                this.cookies[this._requestHandler._cookieNames.session] = {};
            }
            if (isAnonymous || ((_this__clientDeviceCache1 = this._clientDeviceCache) === null || _this__clientDeviceCache1 === void 0 ? void 0 : _this__clientDeviceCache1.touched)) {
                for (const purpose of DataPurposes.names){
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
                    [CONSENT_INFO_KEY]: ()=>DataUsage.clone(this.consent)
                }
            }
        };
    }
    async renew() {
        await this.env.storage.refresh({
            scopes: [
                "device",
                "session"
            ]
        }, this._getStorageContext());
    }
    get(getters, context) {
        return toVariableResultPromise("get", getters, async (getters)=>{
            if (getters.some((getter)=>getter.scope === "device")) {
                await this._loadCachedDeviceVariables();
            }
            const storageResults = await this.env.storage.get(getters, this._getStorageContext(context)).all();
            if (storageResults.some((result)=>result.scope === "device" && result.status === VariableResultStatus.Created)) {
                this._touchClientDeviceData();
            }
            return new Map(map2(storageResults, (result, index)=>[
                    getters[index],
                    result
                ]));
        });
    }
    set(setters, context) {
        return toVariableResultPromise("set", setters, async (setters)=>{
            if (setters.some((setter)=>setter.scope === "device")) {
                await this._loadCachedDeviceVariables();
            }
            const storageResults = await this.env.storage.set(setters, this._getStorageContext(context)).all();
            for (const result of storageResults){
                if (result.key === SCOPE_INFO_KEY) {
                    if (result.scope === "session") {
                        this._session = isVariableResult(result) ? result : undefined;
                    }
                    if (result.scope === "device") {
                        if (this._clientDeviceCache) {
                            this._clientDeviceCache.touched = true;
                        }
                        this._device = isVariableResult(result) ? result : undefined;
                        this._touchClientDeviceData();
                    }
                    this._changedVariables.push(result);
                }
            }
            return new Map(map2(storageResults, (result, index)=>[
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
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, cookieTransport, anonymousSessionReferenceId, defaultConsent, trustedContext }){
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
        _define_property$8(this, "requestItems", void 0);
        /** Transient variables that can be used by extensions whilst processing a request. */ _define_property$8(this, "transient", void 0);
        /**
   * Whether the tracker has been instantiated in a trusted context.
   * A trusted context is when the tracker's API is used for server-side tracker.
   *
   * Signing in without evidence is only possible in trusted contexts.
   *
   * Extensions may use this flag for additional functionality that is only available in server-side tracking context.
   */ _define_property$8(this, "trustedContext", void 0);
        /** Variables that have been added or updated during the request (cf. {@link TrackerStorageContext.push}). */ _define_property$8(this, "_changedVariables", []);
        _define_property$8(this, "_clientCipher", void 0);
        _define_property$8(this, "_cookieCipher", void 0);
        _define_property$8(this, "_defaultConsent", void 0);
        _define_property$8(this, "host", void 0);
        _define_property$8(this, "path", void 0);
        _define_property$8(this, "url", void 0);
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
        this._cookieCipher = cookieTransport !== null && cookieTransport !== void 0 ? cookieTransport : this._clientCipher;
        this._anonymousSessionReferenceId = anonymousSessionReferenceId;
    }
}

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
    deviceSessionTimeout: 10,
    client: {
        scriptBlockerAttributes: {
            "data-cookieconsent": "ignore"
        }
    },
    clientEncryptionKeySeed: "tailjs",
    cookiePerPurpose: false,
    json: false,
    defaultConsent: {
        classification: "anonymous",
        purposes: {}
    }
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
        get2(this._patches, namespace, ()=>[]).push(patch);
    }
    _applyPatches(schemas) {
        const usedPatches = new Set();
        for (const schema of schemas){
            forEach2(this._patches.get(schema.namespace), (patch)=>{
                usedPatches.add(patch);
                patch(schema);
            });
        }
        forEach2(this._patches, ([, patches])=>forEach2(patches, (patch)=>!usedPatches.has(patch) && patch(undefined)));
    }
    async build(host) {
        let schemas = [];
        for (let { source, type } of this._collected){
            if (typeof source === "string") {
                source = JSON.parse(required(await host.readText(source), `The schema definition file "${source}" does not exist.`));
            }
            if (type === "json-schema") {
                schemas.push(...JsonSchemaAdapter.parse(source));
                continue;
            }
            if (!("namespace" in source)) {
                throwError(`The definition ${ellipsis(JSON.stringify(source), 40, true)} is not a tail.js schema definition. The namespace property is not present.`);
            }
            schemas.push(source);
        }
        const usedNamespaces = new Set();
        for (const schema of schemas){
            if (!add2(usedNamespaces, schema.namespace)) {
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
        forEach2(cookies, ([key, cookie])=>{
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
            ...map2(extensions, (item)=>`'${item[0]}' failed: ${item[1]}`)
        ].join("\n"));
        _define_property$5(this, "validation", void 0);
        _define_property$5(this, "extensions", void 0);
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
const uuid = new ShortUniqueId();
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
        _define_property$4(this, "_crypto", void 0);
        _define_property$4(this, "_host", void 0);
        _define_property$4(this, "_logGroups", new Map());
        _define_property$4(this, "tags", void 0);
        _define_property$4(this, "cookieVersion", void 0);
        _define_property$4(this, "storage", void 0);
        this._host = host;
        this._crypto = crypto;
        this.tags = tags;
        this.cookieVersion = cookieVersion;
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
class DefaultClientIdGenerator {
    async generateClientId(environment, request, stationary) {
        const data = [
            stationary ? "" : request.clientIp,
            ...map2(this._headers, (header)=>request.headers[header] + "" || skip2)
        ];
        console.log(`Generated ${stationary ? "stationary" : "non-stationary"} client ID from the data: ${JSON.stringify(data)}.`);
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
        setTimeout(()=>this._purgeExpired, 10000);
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
    _hasExpired(variable, now) {
        return (variable === null || variable === void 0 ? void 0 : variable.ttl) != null && variable.accessed + variable.ttl < now;
    }
    _getVariable(key, now) {
        var _this__getVariables;
        const [, , variables] = (_this__getVariables = this._getVariables(key.scope, key.entityId, now)) !== null && _this__getVariables !== void 0 ? _this__getVariables : [];
        if (!variables) return undefined;
        let variable = variables.get(key.key);
        if (this._hasExpired(variable, now)) {
            // Expired.
            variables.delete(key.key);
            variable = undefined;
        }
        return variable;
    }
    async get(keys) {
        this._checkDisposed();
        const results = [];
        const now = Date.now();
        for (const getter of keys){
            const key = extractKey(getter);
            const variable = this._getVariable(getter, now);
            if (!variable) {
                results.push({
                    status: VariableResultStatus.NotFound,
                    ...key
                });
                continue;
            }
            if (getter.ifModifiedSince != null && variable.modified <= getter.ifModifiedSince || getter.ifNoneMatch != null && variable.version === getter.ifNoneMatch) {
                results.push({
                    status: VariableResultStatus.NotModified,
                    ...key
                });
                continue;
            }
            const result = {
                status: VariableResultStatus.Success,
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
            const key = extractKey(setter);
            let variable = this._getVariable(setter, now);
            if (!variable && (setter.value == null || setter.version != null)) {
                results.push({
                    status: VariableResultStatus.NotFound,
                    ...key
                });
                continue;
            }
            if (!setter.force && variable && variable.version !== setter.version) {
                results.push({
                    status: VariableResultStatus.Conflict,
                    ...variable
                });
                continue;
            }
            var _;
            const [, , variables] = get2((_ = (_this__entities = this._entities)[_key_scope = key.scope]) !== null && _ !== void 0 ? _ : _this__entities[_key_scope] = new Map(), key.entityId, ()=>[
                    now,
                    this._nextInternalId++,
                    new Map()
                ]);
            if (setter.value == null) {
                variables.delete(setter.key);
                results.push({
                    status: VariableResultStatus.Success,
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
                ttl: setter.ttl,
                created: (_variable_created = variable === null || variable === void 0 ? void 0 : variable.created) !== null && _variable_created !== void 0 ? _variable_created : now,
                modified: now,
                accessed: now,
                version: "" + this._nextVersion++,
                value: jsonClone(setter.value)
            });
            const result = {
                ...variable,
                value: jsonClone(variable.value),
                status: created ? VariableResultStatus.Created : VariableResultStatus.Success
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
        var _map2;
        let [cursorScopeIndex = 0, cursorEntityId = -1, cursorVariableIndex = 0] = (_map2 = map2(cursor === null || cursor === void 0 ? void 0 : cursor.split("."), (value)=>+value || 0)) !== null && _map2 !== void 0 ? _map2 : [];
        let scopeIndex = 0;
        const scopes = group2(queries, (query)=>[
                this._entities[query.scope],
                [
                    query,
                    query.entityIds && distinct2(query.entityIds)
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
                    if ((queryEntityIds === null || queryEntityIds === void 0 ? void 0 : queryEntityIds.has(entityId)) === false) continue;
                    for (const [variableKey, variable] of filterKeys(query.keys, entityVariables, ([key])=>key)){
                        if (variable && (action === "purge" || !this._hasExpired(variable, now)) && (!query.ifModifiedSince || variable.modified > query.ifModifiedSince)) {
                            if (action === "purge") {
                                if (entityVariables.delete(variableKey)) {
                                    ++affected;
                                }
                            } else if (action === "refresh") {
                                this._getVariable(variable, now);
                                ++affected;
                            } else {
                                matchedVariables.add(variable);
                            }
                        }
                    }
                }
                let variableIndex = 0;
                for (const variable of matchedVariables){
                    if (variableIndex++ < cursorVariableIndex) {
                        continue;
                    }
                    if (variables.length >= page) {
                        return {
                            variables,
                            cursor: `${scopeIndex - 1}.${internalEntityId}.${variableIndex}`
                        };
                    }
                    variables.push({
                        ...variable,
                        value: jsonClone(variable.value)
                    });
                }
                cursorVariableIndex = 0;
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
    async refresh(queries) {
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
    constructor(ttl){
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
        status: VariableResultStatus.BadRequest,
        ...extractKey(key),
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
            let storage = (_this__mappings_scope = this._mappings[scope]) === null || _this__mappings_scope === void 0 ? void 0 : _this__mappings_scope[source !== null && source !== void 0 ? source : ""];
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
                []
            ]);
            storageKeys[1].push(key);
            storageKeys[2].push(sourceIndex);
            sourceIndex++;
        }
        const tasks = [];
        for (const [storage, [source, keys, sourceIndices]] of splits){
            const task = (async ()=>{
                let i = 0;
                const actionResults = await action(source, storage, keys);
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
        return this._splitApply(keys, async (_source, storage, keys)=>{
            try {
                return (await storage.get(keys)).map((result, i)=>mergeTrace(result, keys[i]));
            } catch (error) {
                return keys.map((key)=>{
                    var _this__settings;
                    return mergeTrace({
                        status: VariableResultStatus.Error,
                        ...extractKey(key),
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
        return this._splitApply(values, async (_source, storage, setters)=>{
            if (isWritableStorage(storage)) {
                try {
                    return (await storage.set(setters)).map((setter, i)=>mergeTrace(setter, setters[i]));
                } catch (error) {
                    return setters.map((setter)=>{
                        var _this__settings;
                        return mergeTrace({
                            status: VariableResultStatus.Error,
                            ...extractKey(setter),
                            error: formatError(error, (_this__settings = this._settings) === null || _this__settings === void 0 ? void 0 : _this__settings.includeStackTraces),
                            transient: isTransientErrorObject(error)
                        }, setter);
                    });
                }
            } else {
                return setters.map((setter)=>mergeTrace({
                        status: VariableResultStatus.BadRequest,
                        ...extractKey(setter)
                    }, setter));
            }
        }, {
            notFound: unknownSource
        });
    }
    splitSourceQueries(queries) {
        const splits = [];
        for (const query of queries){
            for (const scope of filterKeys(query.scope ? [
                query.scope
            ] : query.scopes, keys2(this._mappings))){
                var _this__mappings_scope;
                for (const source of filterKeys(query.sources, keys2((_this__mappings_scope = this._mappings[scope]) !== null && _this__mappings_scope !== void 0 ? _this__mappings_scope : []))){
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
                purged += await storage.purge(queries);
            }
        }, {
            parallel: false
        });
        return purged;
    }
    async refresh(queries) {
        let refreshed = 0;
        await this._splitApply(this.splitSourceQueries(queries), async (_source, storage, queries)=>{
            if (isWritableStorage(storage)) {
                refreshed += await storage.refresh(queries);
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
        await forEachAwait2(this._mappings, ([, mappings])=>forEachAwait2(mappings, ([, storage])=>{
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
        for (const scope of VariableServerScope.levels){
            var _this__mappings, _scope;
            var _mappings_scope;
            const scopeMappings = (_mappings_scope = mappings[scope]) !== null && _mappings_scope !== void 0 ? _mappings_scope : defaultStorage && {
                storage: defaultStorage
            };
            if (!scopeMappings) {
                continue;
            }
            var _;
            ((_ = (_this__mappings = this._mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _this__mappings[_scope] = {})[""] = scopeMappings.storage;
            forEach2(scopeMappings.prefixes, ([prefix, config])=>{
                var _this__mappings, _scope;
                if (!config) return;
                var _;
                ((_ = (_this__mappings = this._mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _this__mappings[_scope] = {})[prefix] = config.storage;
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
                status: VariableResultStatus.Forbidden,
                ...extractKey(result),
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
            throw new Error(`An entity ID for ${target.scope} scope is required in this context.`);
        }
        return target;
    }
    const expectedId = context.scope[target.scope + "Id"];
    if (expectedId == undefined) {
        throw new Error(`No ID is available for ${target.scope} scope in the current session.`);
    }
    if (target.entityId && expectedId !== target.entityId) {
        throw new Error(`The specified ID in ${target.scope} scope does not match that in the current session.`);
    }
    target.entityId = expectedId;
    return target;
};
const getScopeSourceKey = (scope, source)=>source ? scope + "|" + source : scope;
const DEFAULT_USAGE = {
    readonly: false,
    visibility: "public",
    ...DataUsage.anonymous
};
class VariableStorageCoordinator {
    _getTypeResolver({ scope, source }) {
        var _this__storageTypeResolvers_get;
        return (_this__storageTypeResolvers_get = this._storageTypeResolvers.get(getScopeSourceKey(scope, source))) !== null && _this__storageTypeResolvers_get !== void 0 ? _this__storageTypeResolvers_get : throwError(`No storage is defined for ${scope}${source ? `:${source}` : ""}`);
    }
    _getVariable(key) {
        return this._getTypeResolver(key).getVariable(key.scope, key.key, false);
    }
    _assignResultSchemas(results) {
        for (const [, result] of results){
            clearTrace(result);
            if (isVariableResult(result)) {
                const variable = this._getVariable(result);
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
            message: formatVariableResult(result),
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
        return toVariableResultPromise("get", getters, async (getters)=>{
            const results = new Map();
            if (!getters.length) return results;
            let pendingGetters = [];
            let index = 0;
            for (const getter of getters){
                try {
                    validateEntityId(getter, context);
                } catch (error) {
                    results.set(getter, this._captureVariableError({
                        status: VariableResultStatus.BadRequest,
                        ...extractKey(getter),
                        error: formatError(error, this._settings.includeStackTraces)
                    }, error));
                    continue;
                }
                const type = this._getVariable(getter);
                if (type) {
                    const targetPurpose = getter.purpose;
                    if (type.dynamic) {
                        var _context_dynamicVariables_getter_scope_getter_key, _context_dynamicVariables_getter_scope, _context_dynamicVariables;
                        let value = (_context_dynamicVariables = context.dynamicVariables) === null || _context_dynamicVariables === void 0 ? void 0 : (_context_dynamicVariables_getter_scope = _context_dynamicVariables[getter.scope]) === null || _context_dynamicVariables_getter_scope === void 0 ? void 0 : (_context_dynamicVariables_getter_scope_getter_key = _context_dynamicVariables_getter_scope[getter.key]) === null || _context_dynamicVariables_getter_scope_getter_key === void 0 ? void 0 : _context_dynamicVariables_getter_scope_getter_key.call(_context_dynamicVariables_getter_scope, getter);
                        if (value) {
                            const errors = [];
                            const validationContext = mapValidationContext(context, getter.purpose, true);
                            value = type.censor(type.validate(value, undefined, validationContext, errors), validationContext);
                            if (value === VALIDATION_ERROR_SYMBOL) {
                                results.set(getter, {
                                    status: VariableResultStatus.Error,
                                    ...extractKey(getter),
                                    error: `Validation of the dynamically generated variable value failed: ${formatValidationErrors(errors)}.`
                                });
                                continue;
                            }
                        }
                        const timestamp = now();
                        results.set(getter, value == null ? getter.init ? {
                            status: VariableResultStatus.BadRequest,
                            ...extractKey(getter),
                            error: "Dynamic variables cannot be set."
                        } : {
                            status: VariableResultStatus.NotFound,
                            ...extractKey(getter)
                        } : {
                            status: VariableResultStatus.Success,
                            ...extractKey(getter),
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
                    status: VariableResultStatus.BadRequest,
                    ...extractKey(getter),
                    error: formatVariableKey(getter, "is not defined")
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
                    } else if (isTransientError(result)) {
                        pendingGetters.push(getter);
                    } else if (result.status === VariableResultStatus.NotFound && getter.init) {
                        const initValidationContext = mapValidationContext(context, getter.purpose);
                        try {
                            let initValue = await getter.init();
                            if (initValue == null) {
                                continue;
                            }
                            let errors = [];
                            const validated = type.validate(initValue, undefined, initValidationContext, errors);
                            if (validated === VALIDATION_ERROR_SYMBOL) {
                                results.set(getter, {
                                    status: VariableResultStatus.BadRequest,
                                    ...extractKey(getter),
                                    error: formatValidationErrors(errors)
                                });
                                continue;
                            }
                            initValue = type.censor(validated, initValidationContext);
                            if (initValue == null) {
                                results.set(getter, {
                                    status: VariableResultStatus.Forbidden,
                                    ...extractKey(getter),
                                    error: "The current consent prevents one or more required properties."
                                });
                                continue;
                            }
                            pendingSetters.push(withTrace({
                                ...extractKey(getter),
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
                                status: VariableResultStatus.Error,
                                ...extractKey(getter),
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
                    if (result.status === VariableResultStatus.Conflict) {
                        results.set(getter, censorResult({
                            ...result,
                            status: VariableResultStatus.Success
                        }, type, validationContext));
                    } else if (isTransientError(result)) {
                        pendingSetters.push(setter);
                    } else {
                        // Cast as any. The set result that doesn't overlap is a delete result,
                        // but a delete result at this point would mean an invariant was violated
                        // since we not add pending setters for null or undefined init results.
                        results.set(getter, censorResult(result, type, validationContext));
                    }
                }
            }
            return this._assignResultSchemas(results);
        });
    }
    set(setters, context = this._defaultContext) {
        return toVariableResultPromise("set", setters, async (setters)=>{
            const results = new Map();
            if (!setters.length) return results;
            const validationContext = mapValidationContext(context, undefined);
            const pendingSetters = [];
            let index = 0;
            for (const setter of setters){
                let type;
                try {
                    validateEntityId(setter, context);
                    type = this._getVariable(setter);
                } catch (error) {
                    results.set(setter, this._captureVariableError({
                        status: VariableResultStatus.BadRequest,
                        ...extractKey(setter),
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
                    status: VariableResultStatus.BadRequest,
                    ...extractKey(setter),
                    error: formatVariableKey(setter, "is not defined.")
                });
            }
            let retry = 0;
            while(pendingSetters.length && retry++ <= this._patchRetries.attempts){
                if (retry > 1) {
                    // Add random delay in the hope that we resolve conflict races.
                    await retryDelay(this._patchRetries);
                }
                const valueSetters = [];
                for (const current of (await this._storage.get(pendingSetters.splice(0).map((setter)=>copyTrace(extractKey(setter), setter))))){
                    const trace = getTrace(current);
                    const { source: setter, type } = trace;
                    if (!isSuccessResult(current, false)) {
                        results.set(setter, current);
                        // Retry
                        if (isTransientError(current) && trace.retries++ < this._errorRetries.attempts) {
                            pendingSetters.push(setter);
                        }
                        continue;
                    }
                    if (current.status === VariableResultStatus.NotModified) {
                        results.set(setter, {
                            status: VariableResultStatus.Error,
                            ...extractKey(current),
                            error: `Unexpected status 304 returned when requesting the current version of ${formatVariableKey(setter)}.`
                        });
                        continue;
                    }
                    const currentVariable = trace.current = isSuccessResult(current) ? current : undefined;
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
                                ...currentVariable !== null && currentVariable !== void 0 ? currentVariable : extractKey(setter),
                                status: VariableResultStatus.Success
                            });
                            continue;
                        }
                        if (value != null) {
                            value = type.censor(type.validate(value, currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.value, validationContext, errors), validationContext);
                        }
                        if (errors.length) {
                            results.set(setter, {
                                status: errors[0].forbidden ? VariableResultStatus.Forbidden : VariableResultStatus.BadRequest,
                                ...extractKey(setter),
                                error: formatValidationErrors(errors)
                            });
                            continue;
                        }
                        if (!setter.patch && !setter.force && setter.version !== (currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.version)) {
                            // Access tests are done before concurrency tests.
                            // It would be weird to be told there was a conflict, then resolve it, and then be told you
                            // were not allowed in the first place.
                            results.set(setter, !currentVariable ? {
                                status: VariableResultStatus.NotFound,
                                ...extractKey(setter)
                            } : {
                                ...currentVariable,
                                status: VariableResultStatus.Conflict
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
                            status: VariableResultStatus.Error,
                            ...extractKey(setter),
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
                    if (result.status === VariableResultStatus.Conflict && setter.patch && retry < this._patchRetries.attempts) {
                        // Reapply the patch.
                        pendingSetters.push(setter);
                        continue;
                    }
                    results.set(setter, censorResult(result, type, validationContext));
                }
            }
            return this._assignResultSchemas(results);
        });
    }
    async _queryOrPurge(filters, action, context, purgeFilter) {
        const mapped = [];
        for (let query of this._storage.splitSourceQueries(truish2(filters))){
            if (!context.trusted) {
                if (query.scope !== "global") {
                    var _query_entityIds, _query_entityIds1;
                    if (((_query_entityIds = query.entityIds) === null || _query_entityIds === void 0 ? void 0 : _query_entityIds.length) > 1) {
                        throwError(`Entity IDs are not allowed in query filters for the ${context.scope} scope from session context.`);
                    }
                    query.entityIds = [
                        validateEntityId({
                            scope: query.scope,
                            entityId: (_query_entityIds1 = query.entityIds) === null || _query_entityIds1 === void 0 ? void 0 : _query_entityIds1[0]
                        }, context).entityId
                    ];
                } else if (!query.entityIds) {
                    throwError("Specific Entity IDs are required for queries in the global scope from untrusted context.");
                }
            }
            let variableKeys = [];
            const resolver = this._getTypeResolver(query);
            if (query.classification || query.purposes) {
                const scopeVariables = resolver.variables[query.scope];
                forEach2(scopeVariables, ([key, variable])=>{
                    const usage = variable.usage;
                    if (!usage) return;
                    if (!filterRangeValue(usage.classification, query.classification, (classification)=>DataClassification.ranks[classification])) {
                        return;
                    }
                    if (query.purposes && !DataPurposes.test(usage.purposes, query.purposes, {
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
                    variableKeys = filterKeys(query.keys, variableKeys);
                }
                if (variableKeys.length < keyCount2(scopeVariables)) {
                    query = {
                        ...query,
                        keys: variableKeys
                    };
                }
            }
            mapped.push(query);
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
        filters = truish2(filters);
        if ((!bulk || !context.trusted) && some2(filters, (filter)=>!filter.entityIds)) {
            return throwError(context.trusted ? "If no entity IDs are specified, the bulk option must be set to true." : "Bulk delete are not allowed from untrusted context.");
        }
        let purged = 0;
        await this._queryOrPurge(filters, async (filters)=>purged += await this._storage.purge(filters), context, true);
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
                result.variables = map2(result.variables, (variable)=>{
                    const variableType = this._getVariable(variable);
                    const censored = variableType === null || variableType === void 0 ? void 0 : variableType.censor(variable.value, validationContext);
                    return variableType ? censored ? variable.value !== censored ? {
                        ...variable,
                        value: censored
                    } : variable : skip2 : variable;
                });
            }
            return result;
        }, context, false);
    }
    async refresh(filters, context = this._defaultContext) {
        if (!isArray(filters)) {
            filters = [
                filters
            ];
        }
        let refreshed = 0;
        await this._queryOrPurge(filters, async (filters)=>refreshed += await this._storage.refresh(filters), context, true);
        return refreshed;
    }
    async initialize(environment) {
        await this._storage.initialize(environment);
    }
    constructor({ storage, ...settings }, types, defaultContext = {
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
        if (!types) {
            throw new Error("A type resolver is required.");
        }
        this._storage = new VariableSplitStorage(storage);
        this._defaultContext = defaultContext;
        this._types = types;
        const defaultStorage = storage.default;
        for (const scope of VariableServerScope.levels){
            var _storage_scope;
            const scopeMappings = (_storage_scope = storage[scope]) !== null && _storage_scope !== void 0 ? _storage_scope : defaultStorage && {
                storage: defaultStorage
            };
            if (!scopeMappings) {
                continue;
            }
            this._storageTypeResolvers.set(getScopeSourceKey(scope), scopeMappings.schemas ? this._types.subset(scopeMappings.schemas) : this._types);
            forEach2(scopeMappings.prefixes, ([prefix, config])=>{
                if (!config) return;
                this._storageTypeResolvers.set(getScopeSourceKey(scope, prefix), config.schemas ? this._types.subset(config.schemas) : this._types);
            });
        }
        ({ retries: { patch: this._patchRetries, error: this._errorRetries }, errorLogger: this._errorLogger } = this._settings = merge2(settings, [
            defaultContext,
            DEFAULT_SETTINGS
        ], {
            overwrite: false
        }));
    }
}

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, MAX_CACHE_HEADERS, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, SchemaBuilder, Tracker, TrackerEnvironment, VariableSplitStorage, VariableStorageCoordinator, addSourceTrace, bootstrap, clearTrace, copyTrace, getDefaultLogSourceName, getErrorMessage, getTrace, isTransientErrorObject, isValidationError, isWritableStorage, requestCookieHeader, requestCookies, serializeLogMessage, withTrace };

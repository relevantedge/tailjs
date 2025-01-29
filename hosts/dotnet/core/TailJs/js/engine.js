import { isConsentEvent, isResetEvent, DataUsage, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, isTrackedEvent, isOrderEvent, isCartEvent, TypeResolver, isPassiveEvent, JsonSchemaAdapter, CORE_SCHEMA_NS, DataPurposes, ValidationError, DATA_PURPOSES, DataClassification, VariableResultStatus, consumeQueryResults, toVariableResultPromise, isVariableResult, extractKey, filterKeys, VariableServerScope, formatVariableResult, VALIDATION_ERROR_SYMBOL, formatValidationErrors, formatVariableKey, isTransientError, isSuccessResult, filterRangeValue } from '@tailjs/types';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m6eqfst8" ;
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
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const array = /*#__PURE__*/ (value, clone = false)=>value == null ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : [
        value
    ];
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
const merge = (target, ...values)=>(forEach(values, (values)=>forEach(values, ([key, value])=>{
            if (value != null) {
                if (isPlainObject(target[key]) && isPlainObject(value)) {
                    merge(target[key], value);
                } else {
                    target[key] = value;
                }
            }
        })), target);
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
        prototype[setSymbol] = function(key, value) {
            value || value === void 0 ? this.has(key) ? false : !!this.add(key) : this.delete(key);
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
let add2 = (target, key, value)=>(add2 = ensureAssignImplementations((target, key, value)=>(target === null || target === void 0 ? void 0 : target[setSymbol](key, value)) === true))(target, key, value);
let set2 = (target, key, value)=>(set2 = ensureAssignImplementations((target, key, value)=>{
        target[setSymbol](key, value);
        return value;
    }))(target, key, value);
const update2 = (target, key, update)=>{
    let updated = update(get2(target, key));
    return typeof (updated === null || updated === void 0 ? void 0 : updated.then) === "function" ? updated.then((value)=>set2(target, key, value)) : set2(target, key, updated);
};
const obj2 = (source, projection)=>{
    const target = {};
    forEach2(source, projection ? (item, index, seed)=>(item = projection(item, index, seed)) && (typeof item !== "symbol" || item !== skip2 && item !== stop2) ? target[item[0]] = item[1] : item : (item)=>item && (typeof item !== "symbol" || item !== skip2 && item !== stop2) ? target[item[0]] = item[1] : item);
    return target;
};
const merge2 = (target, sources, options = {})=>{
    const { deep = true, overwrite = true } = options;
    for (const source of iterable2(sources)){
        forEach2(source, (kv)=>{
            if (!kv) return;
            const [key, value] = kv;
            const current = target[key];
            if (current === void 0) {
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
const join2 = (source, arg1, arg2)=>source == null ? source : !isIterable(source) ? isEmptyString(source) ? "" : source === null || source === void 0 ? void 0 : source.toString() : filter2(typeof arg1 === "function" ? map2(source, arg1) : (arg2 = arg1, source), isEmptyString, true).join(arg2 !== null && arg2 !== void 0 ? arg2 : "");
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
                        timestamp: event.timestamp
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
            var _tracker_clientIp;
            const session = {
                sessionId: tracker.sessionId,
                deviceSessionId: tracker.deviceSessionId,
                deviceId: tracker.deviceId,
                userId: tracker.authenticatedUserId,
                consent: DataUsage.clone(tracker.consent),
                expiredDeviceSessionId: tracker._expiredDeviceSessionId,
                clientIp: (_tracker_clientIp = tracker.clientIp) !== null && _tracker_clientIp !== void 0 ? _tracker_clientIp : undefined
            };
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
                        session,
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
            } else if (isConsentEvent(event)) {
                await tracker.updateConsent(event.consent);
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
    var _map;
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
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
    "namespace": "urn:tailjs:core",
    "readonly": false,
    "visibility": "public",
    "classification": "anonymous",
    "purposes": {},
    "name": "urn:tailjs:core",
    "types": {
        "ScopeInfo": {
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
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo"
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
                "deviceSessionId": {
                    "primitive": "string",
                    "readonly": false,
                    "visibility": "trusted-write",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "deviceId": {
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
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#DataUsage"
            ],
            "properties": {}
        },
        "DataUsage": {
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
                    "reference": "urn:tailjs:core#DataPurposes",
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
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged"
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
                    "reference": "urn:tailjs:core#EventMetadata",
                    "description": "These properties are used to track the state of the event as it gets collected, and is not persisted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "session": {
                    "reference": "urn:tailjs:core#Session",
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
                        "reference": "urn:tailjs:core#Tag"
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
            "description": "Identifiers related to a user's session, login and device. Based on the user's consent some of these fields may be unavailable.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "originalSessionId": {
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
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
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
                    "reference": "urn:tailjs:core#UserConsent",
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
                "expiredDeviceSessionId": {
                    "primitive": "string",
                    "description": "This value indicates that an old device session \"woke up\" with an old device session ID and took over a new one. This allows post-processing to decide what to do when the same tab participates in two sessions (which goes against the definition of a device session).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "UserInteractionEvent": {
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
            ],
            "properties": {
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component"
            ],
            "properties": {
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedContent"
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
                    "reference": "urn:tailjs:core#Rectangle",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged",
                "urn:tailjs:core#ExternalReference",
                "urn:tailjs:core#Personalizable"
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "personalization": {
                    "item": {
                        "reference": "urn:tailjs:core#Personalization"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged"
            ],
            "properties": {
                "source": {
                    "reference": "urn:tailjs:core#ExternalReference",
                    "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.source }  corresponding to the test, but have different  {@link  Personalization.variable  } s.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variables": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationVariable"
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
                        "reference": "urn:tailjs:core#PersonalizationVariant"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
            ],
            "properties": {
                "sources": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationSource"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content"
            ],
            "properties": {
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference",
                "urn:tailjs:core#Tagged"
            ],
            "properties": {
                "commerce": {
                    "reference": "urn:tailjs:core#CommerceData",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CommerceData": {
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Position",
                "urn:tailjs:core#Size"
            ],
            "properties": {}
        },
        "Position": {
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Rectangle"
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
                    "reference": "urn:tailjs:core#Rectangle",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent": {
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                        "reference": "urn:tailjs:core#FormField"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                        "reference": "urn:tailjs:core#Position"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ElementInfo"
            ],
            "properties": {
                "component": {
                    "reference": "urn:tailjs:core#Component",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentViewEvent": {
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                    "reference": "urn:tailjs:core#Domain",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                    "reference": "urn:tailjs:core#ScreenPosition",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                        "reference": "urn:tailjs:core#SearchFilter"
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
                        "reference": "urn:tailjs:core#SearchResult"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference"
            ],
            "properties": {
                "references": {
                    "item": {
                        "reference": "urn:tailjs:core#ExternalReference"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent",
                "urn:tailjs:core#SessionScoped"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type",
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
                    "reference": "urn:tailjs:core#Domain",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
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
                    "reference": "urn:tailjs:core#View",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content",
                "urn:tailjs:core#Personalizable"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent",
                "urn:tailjs:core#SessionScoped"
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
                    "reference": "urn:tailjs:core#GeoEntity",
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
                    "reference": "urn:tailjs:core#GeoEntity",
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
                    "reference": "urn:tailjs:core#GeoEntity",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                    "reference": "urn:tailjs:core#UserConsent",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                }
            }
        },
        "CommerceEvent": {
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
            ],
            "properties": {}
        },
        "CartUpdatedEvent": {
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent",
                "urn:tailjs:core#CommerceEvent",
                "urn:tailjs:core#CartEventData"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity",
                "urn:tailjs:core#ExternalUse"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceData"
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent",
                "urn:tailjs:core#Order"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged"
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
                        "reference": "urn:tailjs:core#OrderLine"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity",
                "urn:tailjs:core#Tagged"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent",
                "urn:tailjs:core#Order"
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
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent"
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
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
            ],
            "properties": {}
        },
        "SignInEvent": {
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent"
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
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
            ],
            "properties": {}
        },
        "ImpressionTextStats": {
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats",
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent",
                "urn:tailjs:core#SystemEvent"
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
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component"
            ],
            "properties": {
                "track": {
                    "reference": "urn:tailjs:core#TrackingSettings",
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
                    "reference": "urn:tailjs:core#Domain",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ImpressionEvent_regions_type": {
            "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "top": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats",
                    "description": "The top 25 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "middle": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats",
                    "description": "The middle 25 - 75 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "bottom": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats",
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
            "description": "Patch type for urn:tailjs:core#FormEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
                        "reference": "urn:tailjs:core#FormField"
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
            "description": "Patch type for urn:tailjs:core#ComponentClickEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
            "description": "Patch type for urn:tailjs:core#ComponentClickIntentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "item": {
                        "reference": "urn:tailjs:core#Position"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo"
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
            "description": "Patch type for urn:tailjs:core#ComponentViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
            "description": "Patch type for urn:tailjs:core#NavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
                    "reference": "urn:tailjs:core#Domain",
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
            "description": "Patch type for urn:tailjs:core#ScrollEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "offset": {
                    "reference": "urn:tailjs:core#ScreenPosition",
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
            "description": "Patch type for urn:tailjs:core#SearchEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
                        "reference": "urn:tailjs:core#SearchFilter"
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
                        "reference": "urn:tailjs:core#SearchResult"
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
            "description": "Patch type for urn:tailjs:core#SessionStartedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#UserAgentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type",
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
            "description": "Patch type for urn:tailjs:core#ViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type",
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
                    "reference": "urn:tailjs:core#Domain",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
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
                    "reference": "urn:tailjs:core#View",
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
            "description": "Patch type for urn:tailjs:core#SessionLocationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                    "reference": "urn:tailjs:core#GeoEntity",
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
                    "reference": "urn:tailjs:core#GeoEntity",
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
                    "reference": "urn:tailjs:core#GeoEntity",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity",
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
            "description": "Patch type for urn:tailjs:core#AnchorNavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
            "description": "Patch type for urn:tailjs:core#ConsentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                    "reference": "urn:tailjs:core#UserConsent",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartUpdatedEvent_patch": {
            "description": "Patch type for urn:tailjs:core#CartUpdatedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
                    "reference": "urn:tailjs:core#ExternalReference",
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
            "description": "Patch type for urn:tailjs:core#OrderEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#OrderLine"
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
            "description": "Patch type for urn:tailjs:core#CartAbandonedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#OrderLine"
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
            "description": "Patch type for urn:tailjs:core#OrderConfirmedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#OrderCancelledEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#OrderCompletedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#PaymentAcceptedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#PaymentRejectedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#SignInEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#SignOutEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
            "description": "Patch type for urn:tailjs:core#ImpressionEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                        "reference": "urn:tailjs:core#ActivatedComponent"
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo",
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
                    "reference": "urn:tailjs:core#ViewTimingData",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats",
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
            "description": "Patch type for urn:tailjs:core#ResetEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent"
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
                "reference": "urn:tailjs:core#SessionInfo",
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
                "reference": "urn:tailjs:core#UserConsent",
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
                "reference": "urn:tailjs:core#DeviceInfo",
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
        text: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,y,m,w,k,S,T,I;function j(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var C=(e,t=e=>Error(e))=>{throw ea(e=e2(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ed(e)&&ed(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},U=(e,t,...r)=>e===t||0<r.length&&r.some(t=>U(e,t)),F=(e,t)=>null!=e?e:C(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),q=(e,t=!0,r)=>{try{return e()}catch(e){return ep(t)?eu(e=t(e))?C(e):e:et(t)?console.error(t?C(e):e):t}finally{null!=r&&r()}};class z extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),j(this,\"_action\",void 0),j(this,\"_result\",void 0),this._action=e}}var R=e=>new z(async()=>e2(e)),P=async(e,t=!0,r)=>{try{return await e2(e)}catch(e){if(!et(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,B=e=>!!e,D=e=>e===V,J=void 0,L=Number.MAX_SAFE_INTEGER,K=!1,V=!0,H=()=>{},G=e=>e,X=e=>null!=e,Z=Symbol.iterator,Y=Symbol.asyncIterator,Q=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:J,ee=(e,t)=>ep(t)?e!==J?t(e):J:(null==e?void 0:e[t])!==J?e:J,et=e=>\"boolean\"==typeof e,er=Q(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||J))),en=e=>e!==K,ei=e=>\"number\"==typeof e,ea=e=>\"string\"==typeof e,el=Q(ea,e=>null==e?void 0:e.toString()),eo=Array.isArray,eu=e=>e instanceof Error,es=(e,t=!1)=>null==e?J:!t&&eo(e)?e:eh(e)?[...e]:[e],ed=e=>e&&\"object\"==typeof e,ev=e=>(null==e?void 0:e.constructor)===Object,ec=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ef=e=>\"symbol\"==typeof e,ep=e=>\"function\"==typeof e,eh=(e,t=!1)=>!(null==e||!e[Z]||\"string\"==typeof e&&!t),eg=e=>e instanceof Map,ey=e=>e instanceof Set,em=(e,t)=>null==e?J:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,eb=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ew=e=>ea(e)&&(eb(e,\"{\",\"}\")||eb(e,\"[\",\"]\")),ek=!1,eS=e=>(ek=!0,e),eT=e=>null==e?J:ep(e)?e:t=>t[e],eI=(e,t,r)=>(null!=t?t:r)!==J?(e=eT(e),null==t&&(t=0),null==r&&(r=L),(n,i)=>t--?J:r--?e?e(n,i):n:r):e,ex=e=>null==e?void 0:e.filter(X),eA=(e,t,r,n)=>null==e?[]:!t&&eo(e)?ex(e):e[Z]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),ek){ek=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===J?t:eI(t,r,n)):ed(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),ek){ek=!1;break}}}(e,eI(t,r,n)):eA(ep(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eN=(e,t,r,n)=>eA(e,t,r,n),eE=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Z]||n&&ed(t))for(var a of i?eA(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eA(e,t,i,a),r+1,n,!1),eO=(e,t,r,n)=>{if(t=eT(t),eo(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!ek;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return ek=!1,a}return null!=e?es(eN(e,t,r,n)):J},e$=(e,t,r,n)=>null!=e?new Set([...eN(e,t,r,n)]):J,e_=(e,t,r=1,n=!1,i,a)=>es(eE(e,t,r,n,i,a)),ej=(...e)=>{var t;return eq(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...es(e))),t},eC=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,ek)){ek=!1;break}return i},eM=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,ek)){ek=!1;break}return r},eU=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,ek){ek=!1;break}return r},eF=(e,t,r,n)=>{var i;if(null!=e){if(eo(e))return eC(e,t,r,n);if(r===J){if(e[Z])return eM(e,t);if(\"object\"==typeof e)return eU(e,t)}for(var a of eA(e,t,r,n))null!=a&&(i=a);return i}},eq=eF,ez=async(e,t,r,n)=>{var i,a;if(null==e)return J;for(a of eN(e,t,r,n))if(null!=(a=await a)&&(i=a),ek){ek=!1;break}return i},eR=(e,t)=>{if(null==e)return J;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eP=(e,t,r)=>{var n,i,a;return null==e?J:et(t)||r?(a={},eq(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>eq(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eR(eO(e,t?(e,r)=>ee(t(e,r),1):e=>ee(e,1)))},eW=(e,t,r,n,i)=>{var l=()=>ep(r)?r():r;return null!=(e=eF(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eB=(e,t,r,n)=>eO(e,(e,r)=>e&&null!=t&&t(e,r)?e:J,r,n),eJ=(e,...t)=>null==e?J:ei(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ei(i)&&e<i?i:e,J,t[2],t[3]),eK=(e,t,r,n)=>{var i;return null==e?J:ev(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:B))?i:eF(e,t?(e,r)=>!!t(e,r)&&eS(!0):()=>eS(!0),r,n))&&i},eV=(e,t=e=>e)=>{var r;return null!=(r=es(e))&&r.sort((e,r)=>t(e)-t(r)),e},eH=(e,t,r)=>(e.constructor===Object||eo(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eG=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=ep(r)?r():r)&&eH(e,t,n),n},eX=(e,...t)=>(eq(t,t=>eq(t,([t,r])=>{null!=r&&(ev(e[t])&&ev(r)?eX(e[t],r):e[t]=r)})),e),eZ=(e,t,r,n)=>{if(e)return null!=r?eH(e,t,r,n):(eq(t,t=>eo(t)?eH(e,t[0],t[1]):eq(t,([t,r])=>eH(e,t,r))),e)},eY=(e,t,r)=>{var n;return ec(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ec(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ev(e)&&delete e[t],e},eQ=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):!eG(e,t)&&(eH(e,t,!0),!0),e0=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eG(e,t),ec(e,\"delete\")?e.delete(t):delete e[t],r},e1=(e,t)=>{if(e)return eo(t)?(eo(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e1(e,t)):eo(e)?t<e.length?e.splice(t,1)[0]:void 0:e0(e,t)},e2=e=>ep(e)?e():e,e6=(e,t)=>null==e?e:ep(e)?(...r)=>t(e,...r):t(()=>e),e4=(e,t=-1)=>eo(e)?t?e.map(e=>e4(e,t-1)):[...e]:ev(e)?t?eP(e,([e,r])=>[e,e4(r,t-1)]):{...e}:ey(e)?new Set(t?eO(e,e=>e4(e,t-1)):e):eg(e)?new Map(t?eO(e,e=>[e[0],e4(e[1],t-1)]):e):e,e5=(e,...t)=>null==e?void 0:e.push(...t),e3=(e,...t)=>null==e?void 0:e.unshift(...t),e8=(e,t)=>{var r,i,a;if(e)return ev(t)?(a={},ev(e)&&(eq(e,([e,l])=>{if(l!==t[e]){if(ev(r=l)){if(!(l=e8(l,t[e])))return;[l,r]=l}else ei(l)&&ei(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e4(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e9=\"undefined\"!=typeof performance?(e=V)=>e?Math.trunc(e9(K)):performance.timeOrigin+performance.now():Date.now,e7=(e=!0,t=()=>e9())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t=0)=>{var e=ep(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=to(!0).resolve(),c=e7(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await P(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!a,l)};function tr(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tn{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ti,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tr(this,\"_promise\",void 0),this.reset()}}class ti{then(e,t){return this._promise.then(e,t)}constructor(){var e;tr(this,\"_promise\",void 0),tr(this,\"resolve\",void 0),tr(this,\"reject\",void 0),tr(this,\"value\",void 0),tr(this,\"error\",void 0),tr(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===J||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?e2(t):new Promise(r=>setTimeout(async()=>r(await e2(t)),e)):C(`Invalid delay ${e}.`),to=e=>new(e?tn:ti),ts=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},Q=()=>{var e,t=new Set;return[(r,n)=>{var i=ts(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tv=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tf=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?J:null!=n[t]?t:r?C(`The ${e} \"${t}\" is not defined.`):J,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},tp=Symbol(),th=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(ea(t)?t=[t]:eo(t))&&tP(t,e=>1<(i=l[1].split(e)).length?tC(i):J)||(l[1]?[l[1]]:[]),l):J},tg=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?J:tk(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&J,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):J,path:v,query:!1===t?c:c?ty(c,{...n,delimiters:t}):J,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":J),e}),ty=(e,t)=>tm(e,\"&\",t),tm=(e,t,{delimiters:r=!0,...n}={})=>{e=tW(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=th(e,{...n,delimiters:!1===r?[]:!0===r?J:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tj}),t=t4(tJ(e,!1),([e,t])=>[e,!1!==r?1<t.length?tV(t):t[0]:t.join(\",\")]);return t&&(t[tp]=e),t},tb=(e,t)=>t&&null!=e?t.test(e):J,tw=(e,t,r)=>tk(e,t,r,!0),tk=(e,t,i,a=!1)=>null==(null!=e?e:t)?J:i?(r=J,a?(n=[],tk(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:J,tS=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tT=/\\z./g,tI=(e,t)=>(t=t9(e$(eB(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tT,tx={},tA=e=>e instanceof RegExp,tN=(r,n=[\",\",\" \"])=>{var i;return tA(r)?r:eo(r)?tI(eO(r,e=>null==(e=tN(e,n))?void 0:e.source)):et(r)?r?/./g:tT:ea(r)?null!=(i=(e=tx)[t=r])?i:e[t]=tk(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tI(eO(tE(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${t9(n,tS)}]`)),e=>e&&`^${t9(tE(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tS(tO(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):J},tE=(e,t,r=!0)=>null==e?J:r?tE(e,t,!1).filter(G):e.split(t),tO=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,t$=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eZ(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},t_=!1,tj=Symbol(),tC=e=>(t_=!0,e),tM=Symbol(),tU=Symbol(),tF=Symbol.iterator,tq=e=>{tq=e=>e;var n,t=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tj){if(a===tC)break;if(n=a,r&&r.push(a),t_){t_=!1;break}}return r||n},r=(Array.prototype[tM]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tj){if(l===tC)break;if(n=l,r&&r.push(l),t_){t_=!1;break}}return r||n},t());for(n of(Object.prototype[tM]=(e,n,i,a,l)=>{if(e[tF])return(e.constructor===Object?r:Object.getPrototypeOf(e)[tM]=t())(e,n,i,a,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=n?n(u,s++,a,l):u)!==tj){if(u===tC)break;if(a=u,i&&i.push(u),t_){t_=!1;break}}return i||a},Object.prototype[tU]=function(){var t,e;return this[tF]||this[Y]?this.constructor===Object?null!=(e=this[Y]())?e:this[tF]():((e=Object.getPrototypeOf(this))[tU]=null!=(t=e[Y])?t:e[tF],this[tU]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[Map.prototype,WeakMap.prototype,Set.prototype,WeakSet.prototype,Object.getPrototypeOf(function*(){})]))n[tM]=t(),n[tU]=n[tF];return Number.prototype[tM]=(e,t,n,i,a)=>r(tz(e),t,n,i,a),Number.prototype[tU]=tz,Function.prototype[tM]=(e,t,n,i,a)=>r(tR(e),t,n,i,a),Function.prototype[tU]=tR,e};function*tz(e=this){for(var t=0;t<e;t++)yield t}function*tR(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tP=(e,t,r,n)=>(tP=tq((e,t,r,n=e)=>e?e[tM](e,t,void 0,r,n):null==e?e:void 0))(e,t,r,n),tW=(e,t,r=[],n,i=e)=>(tW=tq((e,t,r=[],n,i=e)=>e||0===e||\"\"===e?e[tM](e,t,r,n,i):null==e?e:void 0))(e,t,r,i,n),tB=(e,t=!0,r=!1)=>tW(e,!0===t?e=>null!=e?e:tj:t?t.has?e=>null==e||t.has(e)===r?tj:e:(e,n,i)=>!t(e,n,i)===r?e:tj:e=>e||tj),tD=(e,t,r=-1,n=[],i,a=e)=>tW(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tD(e,void 0,r-1,n,e),tj):e,n,i,a),tJ=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tP(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t1(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tK=e=>null==e||eo(e)?e:e[tF]&&\"string\"!=typeof e?[...e]:[e],tV=(e,...t)=>{var r,n;for(n of e=!t.length&&eh(e)?e:[e,...t])if(null!=n){if(eh(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},tH=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),tG=(e,t,r)=>tK(e).sort(\"function\"==typeof t?(e,n)=>tH(t(e),t(n),r):eo(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=tH(t[a](e),t[a](n),r);return i}:(e,t)=>tH(e,t,r):(e,r)=>tH(e,r,t)),tX=Object.keys,tZ=Symbol(),tY=Symbol(),tQ=Symbol(),t0=e=>{for(var{prototype:t}of(t0=e=>e,[Map,WeakMap]))t[tZ]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},t[tY]=t.get;for(var{prototype:t}of[Set,WeakSet])t[tZ]=function(e,t){t||void 0===t?this.has(e)||this.add(e):this.delete(e)},t[tY]=t.has,t[tQ]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for(var{prototype:t}of(Array.prototype[tQ]=function(e){return this.push(...e),this},[Object,Array]))t[tZ]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},t[tY]=function(e){return this[e]};return e},t1=(e,t,r)=>(t1=t0((e,t,r)=>{if(null==e)return e;var n=e[tY](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[tZ](t,r));e[tZ](t,n)}return n}))(e,t,r),t2=(e,t,r)=>(t2=t0((e,t,r)=>(e[tZ](t,r),r)))(e,t,r),t6=(e,...t)=>(t6=t0((e,...t)=>null==e?e:e[tQ](t)))(e,...t),t4=(e,t)=>{var r={};return tP(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tj&&e!==tC)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tj&&e!==tC)?r[e[0]]=e[1]:e),r},t5=(e,...t)=>(t5=t0((e,...t)=>((null==e?void 0:e.constructor)===Object?tP(t,t=>tP(t,t=>t&&(e[t[0]]=t[1]))):tP(t,t=>tP(t,t=>t&&e[tZ](t[0],t[1]))),e)))(e,...t),t3=(e,t)=>null==e?e:t4(t,t=>null!=e[t]||t in e?[t,e[t]]:tj),t8=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),t9=(e,t,r)=>null==e?e:eh(e)?tB(\"function\"==typeof t?tW(e,t):(r=t,e),t8,!0).join(null!=r?r:\"\"):t8(e)?\"\":null==e?void 0:e.toString(),t7=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?t7(tW(e,t),r,n):(i=[],n=tP(e,(e,t,r)=>t8(e)?tj:(r&&i.push(r),e.toString())),[t,o]=eo(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},re=tf(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rt=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rr=t4(rt,e=>[e,e]),rn=(Object.freeze(eR(rt.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),ri=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},ra_parse=function(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),ea(e)&&(e=e.split(\",\")),eo(e)){var i,n={};for(i of e)rr[i]?\"necessary\"!==i&&(n[i]=!0):r&&C(`The purpose name '${i}' is not defined.`);e=n}return t?(t=tX(e)).length?t:[\"necessary\"]:e},ra_test=function(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rn(i,n))&&!t[rn(i,n)])return!1;if(e=ri(e,n),t=ri(t,n),r){for(var a in t)if(t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(e[a]){if(t[a])return!0;l=!0}return!l},rl=(tf(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${t7(ra_parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),ro={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&ra_test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=ra_parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=re.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=ra_parse(a,{validate:!1}))?e:{}}):t?ro.clone(t):{classification:\"anonymous\",purposes:{}}}},ru=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rd=Symbol(),rv=e=>void 0===e?\"undefined\":tv(JSON.stringify(e),40,!0),rc=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rf=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rp=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rh=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rg=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,ry=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rv(t)+` ${r}.`}),rd),rm=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rm((t?parseInt:parseFloat)(e),t,!1),rb={},rt=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rb[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rb[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:ry(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rc.test(e)&&!isNaN(+new Date(e))?e:ry(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rm(e,!1,!1)){if(!rm(e,!0,!1))return ry(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!rf.test(e)||isNaN(+new Date(e)))return ry(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rm(e,!0,!1)?+e:ry(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rm(e,!0,!1)?+e:ry(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rm(e,!1,!1)?e:ry(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rh.test(e)?e:ry(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rh.exec(e);return r?r[2]?e:ry(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):ry(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rh.exec(e);return r?\"urn\"!==r[1]||r[2]?ry(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:ry(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rg.test(e)?e.toLowerCase():ry(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:ry(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rp.exec(e))?void 0:r[1].toLowerCase():null)?r:ry(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rv(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rd&&e.length>d?ry(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rd||(null==c||c<=e)&&(null==f||e<=f)?e:ry(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rd)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+t7(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rd||u.has(e)?e:ry(t,e,p)}(e=>e instanceof Set||null==e||new Set(e[tF]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tf(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rk=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rS=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rT=((x=a=a||{})[x.Success=200]=\"Success\",x[x.Created=201]=\"Created\",x[x.NotModified=304]=\"NotModified\",x[x.Forbidden=403]=\"Forbidden\",x[x.NotFound=404]=\"NotFound\",x[x.BadRequest=405]=\"BadRequest\",x[x.Conflict=409]=\"Conflict\",x[x.Error=500]=\"Error\",(e,t=!0)=>e&&(e.status<400||!t&&404===e.status));function rI(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rx=e=>{var t=rk(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${a[e.status]}.`:`${t} failed with status ${e.status} - ${a[e.status]}${r?` (${r})`:\"\"}.`};class rA extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rI(this,\"succeeded\",void 0),rI(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rT(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rT(e,!1)))?t:[]}}var rN=(e,t,r)=>{var n=async(n,i)=>{var v,f,c,h,l=eo(t)?t:[t],o=await r(l.filter(e=>e)),u=[],s=[],d=[];for(v of l)v?(c=null!=(c=o.get(v))?c:C(`No result for ${rk(v)}.`),v.source=c,v.callback&&d.push(v.callback(c)),c.success=rT(c,i||\"set\"===e),!n||c.success?u.push(n&&c.status===a.NotFound?void 0:1<n?null!=(f=c.value)?f:void 0:c):s.push(rx(c))):u.push(void 0);if(s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rA(u,s.join(\"\\n\"));for(h of d)await h();return l===t?u:u[0]};return Object.assign(R(()=>n(1,!1)),{as:()=>n(1,!1),all:()=>n(0,!1),require:()=>n(1,!0),value:(e=!1)=>n(2,e),values:(e=!1)=>n(2,e)})},rE=e=>e&&\"string\"==typeof e.type,rO=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),r$=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,r_=(e,t)=>{var r;return t&&(!(o=e.get(l=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(l,t)},rj=(e,t=\"\",r=new Map)=>{if(e)return eh(e)?eq(e,e=>rj(e,t,r)):ea(e)?tk(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?r$(n)+\"::\":\"\")+t+r$(i),value:r$(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),r_(r,i)}):r_(r,e),r},rC=tf(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rM=tf(\"variable scope\",{...rC,...rt}),rU=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rF=e=>null!=e&&!!e.scope&&null!=rC.ranks[e.scope],rq=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rz=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rP=()=>()=>C(\"Not initialized.\"),rW=window,rB=document,rD=rB.body,rJ=(e,t)=>!(null==e||!e.matches(t)),rL=L,rK=(e,t,r=(e,t)=>rL<=t)=>{for(var n=0,i=K;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==V&&null!=a),V),n-1)!==K&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rB&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},rV=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||er(e);case\"n\":return parseFloat(e);case\"j\":return q(()=>JSON.parse(e),H);case\"h\":return q(()=>nR(e),H);case\"e\":return q(()=>null==nW?void 0:nW(e),H);default:return eo(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:rV(e,t[0])):void 0}},rH=(e,t,r)=>rV(null==e?void 0:e.getAttribute(t),r),rG=(e,t,r)=>rK(e,(e,n)=>n(rH(e,t,r))),rX=(e,t)=>null==(e=rH(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),rZ=e=>null==e?void 0:e.getAttributeNames(),rY=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,rQ=e=>null!=e?e.tagName:null,r1=e=>({x:em(scrollX,e),y:em(scrollY,e)}),r2=(e,t)=>tO(e,/#.*$/,\"\")===tO(t,/#.*$/,\"\"),r6=(e,t,r=V)=>(s=r4(e,t))&&W({xpx:s.x,ypx:s.y,x:em(s.x/rD.offsetWidth,4),y:em(s.y/rD.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),r4=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=r5(e),{x:d,y:v}):void 0,r5=e=>e?(c=e.getBoundingClientRect(),u=r1(K),{x:em(c.left+u.x),y:em(c.top+u.y),width:em(c.width),height:em(c.height)}):void 0,r3=(e,t,r,n={capture:!0,passive:!0})=>(t=es(t),ts(r,r=>eq(t,t=>e.addEventListener(t,r,n)),r=>eq(t,t=>e.removeEventListener(t,r,n)))),r9=()=>({...u=r1(V),width:window.innerWidth,height:window.innerHeight,totalWidth:rD.offsetWidth,totalHeight:rD.offsetHeight}),r7=new WeakMap,ne=e=>r7.get(e),nt=(e,t=K)=>(t?\"--track-\":\"track-\")+e,nr=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tP(rZ(e),l=>{var o;return null!=(o=(f=t[0])[p=l])?o:f[p]=(a=K,!ea(n=tP(t[1],([t,r,n],i)=>tb(l,t)&&(a=void 0,!r||rJ(e,r))&&eS(null!=n?n:l)))||(i=e.getAttribute(l))&&!er(i)||rj(i,tO(n,/\\-/g,\":\"),r),a)}),nn=()=>{},ni=(e,t)=>{if(h===(h=nv.tags))return nn(e,t);var r=e=>e?tA(e)?[[e]]:eh(e)?e_(e,r):[ev(e)?[tN(e.match),e.selector,e.prefix]:[tN(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tD(h,([,e])=>e,1))]];(nn=(e,t)=>nr(e,n,t))(e,t)},na=(e,t)=>t9(ej(rY(e,nt(t,V)),rY(e,nt(\"base-\"+t,V))),\" \"),nl={},no=(e,t,r=na(e,\"attributes\"))=>{var n;r&&nr(e,null!=(n=nl[r])?n:nl[r]=[{},tw(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tN(r||n),,t])],t),rj(na(e,\"tags\"),void 0,t)},nu=(e,t,r=K,n)=>null!=(r=null!=(r=r?rK(e,(e,r)=>r(nu(e,t,K)),ep(r)?r:void 0):t9(ej(rH(e,nt(t)),rY(e,nt(t,V))),\" \"))?r:n&&(g=ne(e))&&n(g))?r:null,ns=(e,t,r=K,n)=>\"\"===(y=nu(e,t,r,n))||(null==y?y:er(y)),nd=(e,t,r,n)=>e&&(null==n&&(n=new Map),no(e,n),rK(e,e=>{ni(e,n),rj(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nv={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nc=[],nf=[],np=(e,t=0)=>e.charCodeAt(t),ng=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nc[nf[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(nf[(16515072&t)>>18],nf[(258048&t)>>12],nf[(4032&t)>>6],nf[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),ny=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nc[np(e,r++)]<<2|(t=nc[np(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nc[np(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nc[np(e,r++)]);return a},nm={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nb=(e=256)=>e*Math.random()|0,nk={exports:{}},{deserialize:nS,serialize:nT}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i+=String.fromCharCode(a>>10|55296)+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nk.exports=n})(),(x=nk.exports)&&x.__esModule&&Object.prototype.hasOwnProperty.call(x,\"default\")?x.default:x),nI=\"$ref\",nx=(e,t,r)=>ef(e)?J:r?t!==J:null===t||t,nA=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nx(t,n,r)?s(n):J)=>(n!==i&&(i!==J||eo(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||ep(e)||ef(e))return J;if(ed(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nI]||(e[nI]=l,u(()=>delete e[nI])),{[nI]:l};if(ev(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!eh(e)||e instanceof Uint8Array||(!eo(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return q(()=>{var r;return t?nT(null!=(r=s(e))?r:null):q(()=>JSON.stringify(e,J,n?2:0),()=>JSON.stringify(s(e),J,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nN=e=>{var t,r,n=e=>ed(e)?e[nI]&&(r=(null!=t?t:t=[])[e[nI]])?r:(e[nI]&&delete(t[e[nI]]=e)[nI],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ea(e)?q(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?q(()=>nS(e),()=>(console.error(\"Invalid message received.\",e),J)):e)},nE=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>ei(e)&&!0===r?e:u(e=ea(e)?new Uint8Array(eO(e.length,t=>255&e.charCodeAt(t))):t?q(()=>JSON.stringify(e),()=>JSON.stringify(nA(e,!1,n))):nA(e,!0,n),r),a=e=>null==e?J:q(()=>nN(e),J);return t?[e=>nA(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nb()));for(r=0,a[n++]=g(v^16*nb(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nb();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=et(t)?64:t,h(),[l,u]=nm[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?G:ng)(l(nA(e,!0,n))),e=>null!=e?nN(o(e instanceof Uint8Array?e:(r&&ew(e)?a:ny)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},tf=(nE(),nE(null,{json:!0,decodeJson:!0}),nE(null,{json:!0,prettify:!0}),tE(\"\"+rB.currentScript.src,\"#\")),rt=tE(\"\"+(tf[1]||\"\"),\";\"),n_=tf[0],nj=rt[1]||(null==(x=tg(n_,{delimiters:!1}))?void 0:x.host),nC=e=>!(!nj||(null==(e=tg(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nj))!==V),tf=(...e)=>tO(t9(e),/(^(?=\\?))|(^\\.(?=\\/))/,n_.split(\"?\")[0]),nU=tf(\"?\",\"var\"),nF=tf(\"?\",\"mnt\"),nq=(tf(\"?\",\"usr\"),Symbol()),[nz,nR]=nE(),[nP,nW]=[rP,rP],nB=!0,[rt,nJ]=Q(),nV=(...e)=>{var t,i=e.shift();console.error(ea(e[1])?e.shift():null!=(t=null==(t=e[1])?void 0:t.message)?t:\"An error occurred\",null!=(t=i.id)?t:i,...e)},[nH,nG]=Q(),[nX,nZ]=Q(),nY=e=>n0!==(n0=e)&&nG(n0=!1,n6(!0,!0)),nQ=e=>n1!==(n1=!!e&&\"visible\"===document.visibilityState)&&nZ(n1,!e,n2(!0,!0)),n0=(nH(nQ),!0),n1=!1,n2=e7(!1),n6=e7(!1),n4=(r3(window,[\"pagehide\",\"freeze\"],()=>nY(!1)),r3(window,[\"pageshow\",\"resume\"],()=>nY(!0)),r3(document,\"visibilitychange\",()=>(nQ(!0),n1&&nY(!0))),nG(n0,n6(!0,!0)),!1),n5=e7(!1),[,n8]=Q(),n9=tt({callback:()=>n4&&n8(n4=!1,n5(!1)),frequency:2e4,once:!0,paused:!0}),x=()=>!n4&&(n8(n4=!0,n5(!0)),n9.restart()),ie=(r3(window,[\"focus\",\"scroll\"],x),r3(window,\"blur\",()=>n9.trigger()),r3(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],x),x(),()=>n5()),it=0,ir=void 0,ii=()=>(null!=ir?ir:rP())+\"_\"+ia(),ia=()=>(e9(!0)-(parseInt(ir.slice(0,-2),36)||0)).toString(36)+\"_\"+(++it).toString(36),iu=new Map,is={id:ir,heartbeat:e9()},id={knownTabs:new Map([[ir,is]]),variables:new Map},[iv,ic]=Q(),[ip,ih]=Q(),ig=rP,iy=(e,t=e9())=>{e=iu.get(ea(e)?e:rq(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},im=(...e)=>{var t=e9();return iw(tW(e,e=>(e.cache=[t],[rS(e),{...e,created:t,modified:t,version:\"0\"}])))},ib=e=>null!=(e=tW(e,e=>{var t,r;return e&&(t=rq(e[0]),(r=iu.get(t))!==e[1])?[t,e[1],r,e[0]]:tj}))?e:[],iw=e=>{var r,n,e=ib(e);null!=e&&e.length&&(r=e9(),tP(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),t5(iu,e),(n=tB(e,([,,,e])=>0<rM.compare(e.scope,\"tab\"))).length&&ig({type:\"patch\",payload:t4(n)}),ih(tW(e,([,e,t,r])=>[r,e,t]),iu,!0))},[,iS]=(rt((e,t)=>{nH(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),ir=null!=(n=null==r?void 0:r[0])?n:e9(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),iu=new Map(tV(tB(iu,([,e])=>\"view\"===(null==e?void 0:e.scope)),tW(null==r?void 0:r[1],e=>[rq(e),e])))):sessionStorage.setItem(\"_tail:state\",e([ir,tW(iu,([,e])=>e&&\"view\"!==e.scope?e:tj)]))},!0),ig=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([ir,t,r])),localStorage.removeItem(\"_tail:state\"))},r3(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==ir||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||ig({type:\"set\",payload:[tW(id.knownTabs),tW(id.variables)]},e):\"set\"===a&&r.active?(id.knownTabs=new Map(l[0]),id.variables=new Map(l[1]),iu=new Map(l[1]),r.trigger()):\"patch\"===a?(o=ib(tW(l,([e,t])=>[rz(e),t])),t5(id.variables,l),t5(iu,l),ih(tW(o,([,e,t,r])=>[r,e,t]),iu,!1)):\"tab\"===a&&(t2(id.knownTabs,e,l),l)&&ic(\"tab\",l,!1))});var r=tt(()=>ic(\"ready\",id,!0),-25),n=tt({callback(){var e=e9()-1e4;eq(id.knownTabs,([t,r])=>r[0]<e&&t2(id.knownTabs,t,void 0)),is.heartbeat=e9(),ig({type:\"tab\",payload:is})},frequency:5e3,paused:!0});nH(e=>(e=>{ig({type:\"tab\",payload:e?is:void 0}),e?(r.restart(),ig({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),Q()),[iT,iI]=Q(),ix=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?nW:nR)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?nP:nz)([ir,e9()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e9())&&(l(),(null==(d=i())?void 0:d[0])===ir))return 0<t&&(a=setInterval(()=>l(),t/2)),P(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=to(),[d]=r3(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[tl(null!=o?o:t),v],await Promise.race(e.map(e=>ep(e)?e():e)),d()}var e;null==o&&C(\"_tail:rq could not be acquired.\")}})(),iA=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&nB;var i,a,l=!1,o=r=>{var o=ep(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iS(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===J,i=e)),!l)&&(a=n?nP(i,!0):JSON.stringify(i))};if(!r)return ix(()=>ez(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?eS(C(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?nW:JSON.parse)?void 0:l(t):J)&&iI(l),eS(l)):eS()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&C(\"Beacon send failed.\")},tf=[\"scope\",\"key\",\"entityId\",\"source\"],iE=[...tf,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iO=[...tf,\"value\",\"force\",\"ttl\",\"version\"],i$=new Map,i_=(e,t)=>{var r=tt(async()=>{var e=eO(i$,([e,t])=>({...rz(e),result:[...t]}));e.length&&await l.get(e)},3e3),n=(e,t)=>t&&t1(i$,e,()=>new Set).add(t),l=(nH((e,t)=>r.toggle(e,e&&3e3<=t),!0),ip(e=>tP(e,([e,t])=>(e=>{var t,r;e&&(t=rq(e),null!=(r=e1(i$,t)))&&r.size&&tP(r,r=>!0===r(e)&&n(t,r))})(t?{status:a.Success,success:!0,...t}:{status:a.NotFound,success:!0,...e}))),{get:r=>rN(\"get\",r,async r=>{r[0]&&!ea(r[0])||(u=r[0],r=r.slice(1)),null!=t&&t.validateKey(u);var s=new Map,d=[],v=tW(r,e=>{var t=iy(rq(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))s.set(e,{...e,status:a.Forbidden,success:!1,error:`No consent for '${r}'.`});else if(!e.refresh&&t)s.set(e,{status:a.Success,success:!0,...t});else{if(!rF(e))return[t3(e,iE),e];var i,r=null==(i=e.init)?void 0:i.call(e);r&&(r={...rS(e),version:\"1\",created:c,modified:c,value:r,cache:[c,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},t6(d,[rS(r),r]),s.set(e,{status:a.Success,success:!0,...r}))}return tj}),c=e9(),u=v.length&&(null==(u=await iA(e,{variables:{get:tW(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=u.variables)?void 0:r.get)||[],p=[];return tP(u,(e,t)=>{var n,r;(null==e?void 0:e.status)===a.NotFound?null!=(r=null==(r=(n=v[t][1]).init)?void 0:r.call(n))&&p.push([n,{...rS(n),value:r}]):s.set(v[t][1],rU(e))}),p.length&&tP(await l.set(tW(p,([,e])=>e)).all(),(e,t)=>s.set(p[t][0],rU(e.status===a.Conflict?{...e,status:a.Success,success:!0}:e))),d.length&&iw(d),tP(s,([e])=>{e.callback&&(e.callback=e6(e.callback,(t,r)=>{P(async()=>!0===await t(r)&&n(rq(e),e.callback),!1)}))}),s}),set:r=>rN(\"set\",r,async r=>{r[0]&&!ea(r[0])||(v=r[0],r=r.slice(1)),null!=t&&t.validateKey(v);for(var n=[],i=new Map,o=e9(),u=[],s=tW(r,e=>{var s,r,t=iy(rq(e));return rF(e)?((r=null==(s=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rS(e),created:null!=(r=null==t?void 0:t.created)?r:o,modified:o,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:s,cache:[o,e.ttl]})&&(r.cache=[o,null!=(s=e.ttl)?s:3e3]),i.set(e,r?{status:t?a.Success:a.Created,success:!0,...r}:{status:a.Success,success:!0,...rS(e)}),t6(n,[rS(e),r]),tj):e.patch?(u.push(e),tj):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[t3(e,iO),e])}),d=0;!d++||u.length;){var v,f=await l.get(tW(u,e=>rS(e))).all(),f=(tP(f,(e,t)=>{var r=u[t];rT(e,!1)?t6(s,[{...r,patch:void 0,value:u[t].patch(null==e?void 0:e.value),version:e.version},r]):i.set(r,e)}),u=[],s.length?F(null==(f=(await iA(e,{variables:{set:tW(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:f.set,\"No result.\"):[]);tP(f,(e,t)=>{var[,t]=s[t];d<=3&&t.patch&&((null==e?void 0:e.status)===a.Conflict||(null==e?void 0:e.status)===a.NotFound)?t6(u,t):i.set(t,rU(e))})}return n.length&&iw(n),i})});return iT(({variables:e})=>{e&&null!=(e=tV(tW(e.get,e=>null!=e&&e.success?e:tj),tW(e.set,e=>null!=e&&e.success?e:tj)))&&e.length&&iw(tW(e,e=>[rS(e),e.success?e.value:void 0]))}),l},ij=Symbol(),iM=Symbol(),iU=[.75,.33],iF=[.25,.33],iz=e=>tW(tG(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rk(e)}, ${rF(e)?\"client-side memory only\":rl(null==(e=e.schema)?void 0:e.usage)})`,K]:tj),iP=()=>{var i,l,a,r=null==rW?void 0:rW.screen;return r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rW.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rW.devicePixelRatio,width:r,height:i,landscape:l}}):{}},iW=e=>e(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==k?void 0:k.clientId,languages:eO(navigator.languages,(e,t,r=e.split(\"-\"))=>W({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...iP()})),iB=(e,t=\"A\"===rQ(e)&&rH(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),iD=(e,t=rQ(e),r=ns(e,\"button\"))=>r!==K&&(U(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&U(rX(e,\"type\"),\"button\",\"submit\")||r===V),iJ=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tv((null==(r=rH(e,\"title\"))?void 0:r.trim())||(null==(r=rH(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?r5(e):void 0}},iK=e=>{if(w)return w;ea(e)&&([r,e]=nR(e),e=nE(r,{decodeJson:!0})[1](e)),eZ(nv,e),(e=>{nW===rP&&([nP,nW]=nE(e,{json:!e,prettify:!1}),nB=!!e,nJ(nP,nW))})(e1(nv,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,y,i=e1(nv,\"key\"),a=null!=(e=null==(r=rW[nv.name])?void 0:r._)?e:[];if(eo(a))return l=[],o=[],u=(e,...t)=>{var r=V;o=eB(o,n=>q(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:w,unsubscribe:()=>r=K}),r},(e=>t=>nV(e,t))(n)))},s=[],v=i_(nU,d={applyEventExtensions(e){null==e.clientId&&(e.clientId=ii()),null==e.timestamp&&(e.timestamp=e9()),h=V;var n=K;return eO(l,([,t])=>{var r;!n&&(null==(r=t.decorate)?void 0:r.call(t,e))!==K||(n=V)}),n?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&C(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eX(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):C(\"Source event not queued.\")},o=async(r,n=!0,i)=>{var a;return r[0]&&!ea(r[0])||(a=r[0],r=r.slice(1)),iA(e,{events:r=eO(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eX(e,{metadata:{posted:!0}}),e[ij]){if(!1===e[ij](e))return;delete e[ij]}return eX(ru(e4(e),!0),{timestamp:e.timestamp-e9()})}),variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},u=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=eO(es(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e5(l,e),eX(t.applyEventExtensions(e),{metadata:{queued:!0}})}),eq(l,e=>{}),!i)return o(e,!1,a);r?(n.length&&e3(e,...n.splice(0)),e.length&&await o(e,!0,a)):e.length&&e5(n,...e)};return tt(()=>u([],{flush:!0}),5e3),nX((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=eO(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),t}),n.length||e.length)&&u(ej(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,t,r)=>u(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var o=!1,s=()=>{o=!0};return i.set(e,e4(e)),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var a=i.get(e),[r,d]=null!=(r=e8(t(a,s),a))?r:[];if(r&&!M(d,a))return i.set(e,e4(d)),[l(e,r),o]}return[void 0,o]}),r&&u(e),s}}})(nU,d),f=null,p=0,g=h=K,y=!1,w=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||ea(e[0]))&&(t=e[0],e=e.slice(1)),ea(e[0])&&(r=e[0],e=ew(r)?JSON.parse(r):nR(r));var t,n=K;if((e=eB(e_(e,e=>ea(e)?nR(e):e),e=>{if(!e)return K;if(ac(e))nv.tags=eZ({},nv.tags,e.tagAttributes);else{if(af(e))return nv.disabled=e.disable,K;if(ag(e))return n=V,K;if(aS(e))return e(w),K}return g||am(e)||ah(e)?V:(s.push(e),K)})).length||n){var r=eV(e,e=>ah(e)?-100:am(e)?-50:ak(e)?-10:rE(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),q(()=>{var e=f[p];if(u(\"command\",e),h=K,rE(e))c.post(e);else if(ay(e))v.get(tK(e.get));else if(ak(e))v.set(tK(e.set));else if(am(e))e5(o,e.listener);else if(ah(e))(t=q(()=>e.extension.setup(w),t=>nV(e.extension.id,t)))&&(e5(l,[null!=(r=e.priority)?r:100,t,e.extension]),eV(l,([e])=>e));else if(aS(e))e(w);else{var r,n,t,a=K;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:K)break;a||nV(\"invalid-command\",e,\"Loaded extensions:\",l.map(e=>e[2].id))}},e=>nV(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(rW,nv.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+ii(),events:c,variables:v,__isTracker:V})),configurable:!1,writable:!1}),ip((e,t,r)=>{ej(iz(tW(e,([,e])=>e||tj)),[[{[nq]:iz(tW(t,([,e])=>e||tj))},\"All variables\",V]])}),iv(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:L}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(iW(w),e.hasUserAgent=!0),g=!0,s.length&&w(s),n(),y=!0,w(...eO(au,e=>({extension:e})),...a),w({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),w;C(`The global variable for the tracker \"${nv.name}\" is used for something else than an array of queued commands.`)},iV=()=>null==k?void 0:k.clientId,iH={scope:\"shared\",key:\"referrer\"},iG=(e,t)=>{w.variables.set({...iH,value:[iV(),e]}),t&&w.variables.get({scope:iH.scope,key:iH.key,result(r,n,i){return null!=r&&r.value?i():(null==n||null==(r=n.value)?void 0:r[1])===e&&t()}})},iX=e7(),iZ=e7(),iY=1,[i0,i1]=Q(),i2=e=>{var t=e7(e,iX),r=e7(e,iZ),n=e7(e,ie),i=e7(e,()=>iY);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},i6=i2(),[i5,i3]=Q(),i8=(e,t)=>(t&&tP(i7,t=>e(t,()=>!1)),i5(e)),i9=new WeakSet,i7=document.getElementsByTagName(\"iframe\");function at(e){if(e){if(null!=e.units&&U(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var an=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),ai=e=>nd(e,t=>t!==e&&!!an(r7.get(t)),e=>(T=r7.get(e),(T=r7.get(e))&&e_(ej(T.component,T.content,T),\"tags\"))),aa=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&eO(I,e=>({...e,rect:void 0}))},al=(e,t=K,r)=>{var n,i,a,l=[],o=[],u=0;return rK(e,e=>{var s,a,i=r7.get(e);i&&(an(i)&&(a=eB(es(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==V||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eK(a,e=>null==(e=e.track)?void 0:e.region))&&r5(e)||void 0,s=ai(e),i.content&&e3(l,...eO(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e3(o,...eO(a,e=>{var t;return u=eJ(u,null!=(t=e.track)&&t.secondary?1:2),aa({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nu(e,\"area\"))&&e3(o,...eO(es(a)))}),l.length&&e5(o,aa({id:\"\",rect:n,content:l})),tP(o,e=>{ea(e)?e5(null!=i?i:i=[],e):(null==e.area&&(e.area=t9(i,\"/\")),e3(null!=a?a:a=[],e))}),a||i?{components:a,area:t9(i,\"/\")}:void 0},ao=Symbol(),au=[{id:\"context\",setup(e){tt(()=>tP(i7,e=>eQ(i9,e)&&i3(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(t,r,i){var a;return null==k||null==t||!t.value||null!=k&&k.definition?(n=null==t?void 0:t.value,null!=t&&null!=(a=t.value)&&a.navigation&&f(!0)):(k.definition=t.value,null!=(a=k.metadata)&&a.posted&&e.events.postPatch(k,{definition:n})),i()}});var n,t,d=null!=(t=null==(t=iy({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=iy({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&im({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=iy({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=iy({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=K)=>{var a,l,o,i,p;r2(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=tg(location.href+\"\",{requireAuthority:!0}),k={type:\"view\",timestamp:e9(),clientId:ii(),tab:ir,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:r9(),duration:i6(void 0,!0)},0===v&&(k.firstTab=V),0===v&&0===d&&(k.landingPage=V),im({scope:\"tab\",key:\"viewIndex\",value:++d}),l=ty(location.href),eO([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return(null!=(n=(o=k).utm)?n:o.utm={})[e]=null==(n=es(l[\"utm_\"+e]))?void 0:n[0]}),!(k.navigationType=S)&&performance&&eO(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tO(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(null!=(t=k.navigationType)?t:k.navigationType=\"navigate\")&&(p=null==(i=iy(iH))?void 0:i.value)&&nC(document.referrer)&&(k.view=null==p?void 0:p[0],k.relatedEventId=null==p?void 0:p[1],e.variables.set({...iH,value:void 0})),(p=document.referrer||null)&&!nC(p)&&(k.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tg(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),k.definition=n,n=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:i6()})),i1(k))};return nX(e=>{e?(iZ(V),++iY):iZ(K)}),r3(window,\"popstate\",()=>(S=\"back-forward\",f())),eO([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",f()}}),f(),{processCommand:t=>av(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),V),decorate(e){!k||rO(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tP(e,e=>{var t,r;return null==(t=(r=e.target)[iM])?void 0:t.call(r,e)})),r=new Set,n=(tt({callback:()=>tP(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rB.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;l&&(o=eB(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==V}))&&(e=>{var r,n;return null==e?J:null!=(r=null!=(n=e.length)?n:e.size)?r:e[Z]?(r=0,null!=(n=eF(e,()=>++r))?n:0):Object.keys(e).length})(o)&&(p=f=K,g=h=0,y=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},e7(!1,ie),!1,!1,0,0,0,t$()];a[4]=t,a[5]=r,a[6]=n},m=[t$(),t$()],b=i2(!1),w=e7(!1,ie),k=-1,S=()=>{var O,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],N=f?iF:iU,r=(N[0]*l<T||N[0]<(T/t.height||0))&&(N[0]*r<S||N[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nv.impressionThreshold-250)&&(++h,b(f),s||e(s=eB(eO(o,e=>((null==(e=e.track)?void 0:e.impressions)||ns(a,\"impressions\",V,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:r6(a),viewport:r9(),timeOffset:i6(),impressions:h,...al(a,V)})||null))),null!=s)&&s.length&&(O=b(),d=eO(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;N=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:em(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:em(l/u+100*o/l),readTime:em(l/238*6e4),boundaries:v}})(null!=N?N:\"\"),u||t.height>=1.25*l){var _=rB.createTreeWalker(a,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(M=_.nextNode());){var M,U,F,P,B,z=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](M,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),B=t.top,C<3?y(0,F-B,P-B,v[1].readTime):(y(1,u[0][4],F-B,v[2].readTime),y(2,F-B,P-B,v[3].readTime)))}}}var r=t.left<0?-t.left:0,N=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(N,N+T)*m[1].push(r,r+S)/L),u&&tP(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[iM]=({isIntersecting:e})=>{eZ(r,S,e),e||(tP(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{eY(r7,e,e=>{var t;return(e=>null==e?void 0:{...e,component:es(e.component),content:es(e.content),tags:es(e.tags)})(\"add\"in n?{...e,component:ej(null==e?void 0:e.component,n.component),content:ej(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:ej(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,r7.get(e))};return{decorate(e){tP(e.components,e=>t2(e,\"track\",void 0))},processCommand:e=>ap(e)?(n(e),V):aw(e)?(eO(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=rH(i,e);){eQ(n,i);var l,o=tE(rH(i,e),\"|\");rH(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=el(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e5(a,d)}}}e5(r,...eO(a,e=>({add:V,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),V):K}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{r3(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=K;if(rK(n.target,e=>{iD(e)&&null==l&&(l=e),s=s||\"NAV\"===rQ(e);var t,d=ne(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tP(e.querySelectorAll(\"a,button\"),t=>iD(t)&&(3<(null!=u?u:u=[]).length?eS():u.push({...iJ(t,!0),component:rK(t,(e,t,r,n=null==(i=ne(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=ns(e,\"clicks\",V,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eK(d,e=>(null==(e=e.track)?void 0:e.clicks)!==K)),null==a&&(a=null!=(t=ns(e,\"region\",V,e=>null==(e=e.track)?void 0:e.region))?t:d&&eK(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=al(null!=l?l:o,!1,v),f=nd(null!=l?l:o,void 0,e=>eO(es(null==(e=r7.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?V:a)?{pos:r6(l,n),viewport:r9()}:null,...((e,t)=>{var n;return rK(null!=e?e:t,e=>\"IMG\"===rQ(e)||e===t?(n={element:iJ(e,!1)},K):V),n})(n.target,null!=l?l:o),...c,timeOffset:i6(),...f});if(l)if(iB(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=tg(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:ii(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:V,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||rH(h,\"target\")!==window.name?(iG(w.clientId),w.self=K,e(w)):r2(location.href,h.href)||(w.exit=w.external,iG(w.clientId))):(k=h.href,(b=nC(k))?iG(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nv.captureContextMenu&&(h.href=nF+\"=\"+T+encodeURIComponent(k),r3(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),r3(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{rK(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>ea(e=null==e||e!==V&&\"\"!==e?e:\"add\")&&U(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ed(e)?e:void 0)(null!=(r=null==(r=ne(e))?void 0:r.cart)?r:nu(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?J:eo(e)||ea(e)?e[e.length-1]:eF(e,(e,r)=>e,void 0,void 0))(null==(r=ne(e))?void 0:r.content))&&t(d)});c=at(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eY(t,o,r=>{var i=r4(o,n);return r?e5(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),i8(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r1(V);i0(()=>{return e=()=>(t={},r=r1(V)),setTimeout(e,250);var e}),r3(window,\"scroll\",()=>{var a,n=r1(),i={x:(u=r1(K)).x/(rD.offsetWidth-window.innerWidth)||0,y:u.y/(rD.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=V,e5(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=V,e5(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=V,e5(a,\"page-end\")),(n=eO(a,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return ad(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=at(r))&&e({...r,type:\"cart_updated\"}),V):ab(t)?(e({type:\"order\",...t.order}),V):K}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||rG(e,nt(\"form-value\")),e=(t&&(r=r?er(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tv(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=rG(a,nt(\"ref\"))||\"track_ref\",(s=t1(r,a,()=>{var t,r=new Map,n={type:\"form\",name:rG(a,nt(\"form-name\"))||rH(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:i6()})),((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),et(i)?i&&(a<0?en:D)(null==r?void 0:r())?n(r):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})());return r3(a,\"submit\",()=>{i=al(a),t[3]=3,s(()=>{(a.isConnected&&0<r5(a).width?(t[3]=2,s):()=>{o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&r5(a).width)),e.events.postPatch(n,{...i,totalTime:e9(V)-t[4]}),t[3]=1})()},750)}),t=[n,r,a,0,e9(V),1]}))[1].get(t)||eO(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{var d,v,a;e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:tO(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[ao]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!ns(e,\"ref\")||(e.value||(e.value=tO(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=iZ())),v=-(s-(s=e9(V))),c=i[ao],(i[ao]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=V,o[3]=2,tP(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&r3(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e9(V),u=iZ()):o()));d(document),i8(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",callback:t}).value(),i=async t=>{var r;if(t)return!(r=await n())||ro.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rW.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!1;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tW(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=o=!0)),{classification:o?\"indirect\":\"anonymous\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,s,t;return aT(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(t=l.key,(null!=(e=a[t])?e:a[t]=tt({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e;rB.hasFocus()&&(e=l.poll(s))&&!ro.equals(s,e)&&(await i(e),s=e)}).trigger()),V):K}}}}],x=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),ad=x(\"cart\"),av=x(\"username\"),ac=x(\"tagAttributes\"),af=x(\"disable\"),ap=x(\"boundary\"),ah=x(\"extension\"),ag=x(V,\"flush\"),ay=x(\"get\"),am=x(\"listener\"),ab=x(\"order\"),aw=x(\"scan\"),ak=x(\"set\"),aS=e=>\"function\"==typeof e,aT=x(\"consent\");Object.defineProperty(rW,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(iK)}})})();\n",
        gzip: "H4sIAAAAAAACCry96XrbRrYo-v8-BYl2M1VmiSaowRKoMrbtthPbie3EUxIIsSGyKMGGCkyhKEsh0d95mvtg90nut1YNACnKnX32-c7eHYuoeVy15kUI5Q-Wl5nqCKaZYpLlLGMFK9mCVWzKLtmEzdicnbMzds0u2Ff2hb1hb9mz8WwhJzovZeczwap0qTu57Ij41elnMdGDqZjlUrxW5VwofY1llpdZsRCRYkIuLoTKTgsRdYdsUspZfrbw319Vru3vmkYi0SlXNQzxMYdmuOAPnihVKiIoDF6fq_JrR2REcDGCtFgTQSNRs5-4GRrfCaFgPiOCc65XK7koCs4J_OlyEYtIU6qEXijZHY6h2JQI2uuJKdHwZ1AIeabPoa79SXHJcib5cDwrFclx6hS7SPK0y7lO8rTX6_6E3wy-mNoJfTfhuN-XtfnoSM65XbUv4roimtpuale6Zu_MXAaDgaL8gZ3H8FjZkr2eGlTlhSCaP3gHJSllT7EK5Q-aeT62c9axjoKHHSX-XORKTDu4MZ286lzkVZXLs4AJ_uDt9VzYhR4oMS-yiSDBYDAIWABFXeVBQCllf5q96Q6Zwk1R10s7O0FoPcn05JwI6tPmRNNYLIjgGrfsMW5ZJDSkT0pZlYUYCOxc20wa6XqWy6worpdmFqrXU4TW9XhSZFXV-asjrrSQ06rzWpUXeSWWZwLOZK7zrMj_ElPi-7ercJ5Xg49KVItC1_pcSFwv3Fo1NiXtehG1VpjGKmp_28wMLwShdOAba2YOreqNVvVGq_rbrbq23DL8H2q2aa2GlddqMdF4u5bVYi4UQRBRU_aZQE0W2KoBuyzzaWfYyjAdNBntnrio8RL_AvdXiq-dv0hWXcsJtG7uLXvNTcotByn7muW6g2WbZc1npIunhq6VglMFN1lTCx7G64eqWcQlViAGJKjYDD1ShNK6Zh9gsII9gj_drmD_wm_O-Xv2nJui7Ef-cnFxKtTgp4e_fnzz8OmTj89evn3y_ZNf2AveDdl7mMoP3Cwi-940-CsugrmW7Hf-5vritCwGuRYq06Viv7kUXI9nLvlnd6GJYpJ3h7ByRNHVSvd6stfzl6I5s0RROKvPmRCurr16Xc6fG0D5PLKTF27yAHIpFhBQFSFucFqWhchkwLm-noty1hFMKP4zERpgxbDLRa9HQs7FahXMsqISQZdjWqDVQgQcc54DqBASF6HL-Qsmcmxc4gqutZ1hRqUVgKN2RgGdZswuYHvYA12-wfIEein5Q6Wy60Fe4V8mFthtJ5eVzuQEWkPoxkRlYVdImzafR13d64mSCBqLSMBZi5PBYCDSKBEpE1NsrNcLSgTcayO8hLwbizpoXS7qIT4TE7czgXtSfWNbN4aJmVkaPCJrHc8x40YzkHXemmPXtbtadUXye7pa3VznXq-rKRNnN9bsp2zOxPWN5DdwDi7aL45dxRCeqlhEP2X6fKDKhZwScZdojt_z8isJh0z3et0hPJqxjoaU0nuaiVP7eMORTYYptNLricQ9xjshJCkmvuJQMnywiTglggXLgAV1QFcr85kELEgDOBJf4EKKN7g98DFkgjLxlov2iMXc7LnmDzRu9bNmJK3nU5kbAljHWyIoMw3oXo9oPnSfqtcjiv9IGZEsp_yB3tmJn0dqZycWscC0SEaKRoKJK77tRM_yQgtFfqVMPLTDYLK1wEnaPqdX-FAmv6exOwN3zZOWzxyyQxEoLjWMWtMxvnUWiZEd2HjqyxLJNZFM9fsU1vY6F8W0I2EZ6RKXcnyqRPalrkVRiQ60AK3ZVkwTslWvJoIpjmAnEs-ImQmNENfaHG97eJI1AzRYFuJePJFMJDJNx82Ac9gZkuOQo7wZdL5l0DCc9jAeErPxayNh6jbgTpc4InMcfEeajtXOjofAmgt4mcbU5uISMEmjVid8aDdIHA-pa9MdpB2xE9Kx6Pd9Ezs7Y7_c60duLHZ2fLF-H_uiDC7xy_bJgYnaDyaeOAw5hAclBOSf8gd-dIJYmqB1gjSeIIQa0qLI1O19Bnufx-Ih0TTSNOzCi4ojuitIBggwk6w7pJEZZWam0iyOGRoMgqk-lg0pE6_aw4eB2NPB8NS74zBkGU9SPCeKq-Nh7CBFX0X2ZYxVNGSSy3amtJkylpFLHKtj2et1xZcxHCRsv-AiUenY7WtccE0KlsM5K2ivlw3mi-qcFNSh9AbUZPUaviliURHx0s-GRs9rJu5s3msoCAjSG6EJPjlNjZTCg_xx665B209Ii4wDiPeZE2jBEXkOU-yIP-Gt5m7GMYBYgEJ-BL1eC9ZpnqTUTBFaq2DZKdM1E4_X9sYQRRkr7IX9P7ERuAcN_EpU2uuRnNudyIB-SFTKCoBScRblcNPXr7qdcl4z8ZN7oAySzyTLWG4Hm22AvwxhdwsUZrjfNJZAwd7SiaqZePfNThCE5bP1ppOMiSRL0_Uebuvg6c1FH7cgPAITvBpusx_78mPsmfPnllb9PfWFfsJRQ4GbOI0vZGjLeu3CtyAKbZYu5xkd-6WvmfiTi6dM_NXg-Bunxk2Bc9_d89bGtK5NA_AzbtD9jNoeb1s22Pxf_L5s68m8hMvaUA1L8_Lc2LgtuwXHJJHJME25TMKUrj-HhTlVBZYqsFQBpcat_XzdIBi2X1iOFuiwiAmQOauViknGl7CgAOFjIlqAw9DTsEb-DRJJmHJFsgSueMrgE8dsEzgmRIBDQXs6Fpugwh3TTVQ0TKGZhuYkkmc0yTk2C0SnTPK0ARxYgWW0jjyQua3N9tAAjEG1SPxCxCscIT5s_IEQRJs3LjTjF0SwkFJaM_GBN4DQrWqBNJiYE0VjRWikNiYouHhKBLPr6a8nrKhiuKaxiApCsU37u2bi0drj-sq0gONzW6B7PTNQJKfMw_scag0Gg3VkWeSAgSBmfJFduRKR-GBbha65TsI0hn8IohKqaWG1EjkBtEcc53EeCfac6WQE3KddIBtebAEbNw_ZJWLSXR0Pj9s8KeF4UpHHtdZ-cPghkAdF3X7mg0lWFLCg_iV5RCmM7Gl7I7tdszy9nnhDADvAfcKf5r73enB933vun3_ONrdQcfM2GW6Y0sT2AHTuDhLDTNRM_NBC6NfIMk-VrVYGozYTAUIjnopCaNEBEszyJKNWrhiYfP8DMKC1KoNK6Bj_BaSKRmKQTacx1MymgERF7ZqmAzjb4vtN4IAMSge3_BCI5GJwhl2cIaCIxOA8q2L81zVJbzIJJG_dCNiCH7A7SZmsmfi1dUyJ-JNophFQaEYSzVQKg_ItEjg7phdxCW2KX_EbZ4sTojXsAGXi902Uzk_IYQh2HHjEm55L5F1gVjKEg42wa208riJyGuCC_nZjAd1jBq9QUAkdtDaaSA78TrOGcM3bu2J3T9LI1M2m0wCWDtbeLDO9ZT97vbWdwtUwi2VWC-5c67jgMfXsnk1Ce7VaS_kgsi9vhI67bhCwFXYUiG13xffYEqSb1YGrBf-J4Tqu0qKltjDHO4rblpiZvxlxQG879Qxet7D97DaYBG6lwVN6vfDYY6La31yNBDPwfengIpsDa1uEhrcdmeupm2piUM2LfAIUS0gBmXVvytBgLEyMEHQY4p4gyX2wya4Qlvgnls2uzelXNNLIBYWju2fAEIoU7ChigeOD5vcgE_j8kWUW4d5CkdcAwxNhDmkimNgjCoumNFpC2ToSwIP1qL-O8TVZbxXo-zNX6idYFF8KH01oFp9N27LAie5veW08i8Gh9bCru98quJDVeT7TruzhBpprUbhmhy9xhw2ucmn5M3_aVShSeyAKlJWI1OCjl0TxghquLim4OCQFw1x3BMdJwVTKC4NkiZwA9SVyYjnOvR4pOLaxY1PGWSJSXjB7nuFdzLnYg6sKGaquKctpnGQsd2eGRrA9ac3EEQ8W0giypkHXYcNzoWaluoDbB-yf93AQzKOt1QJQ2yPygtKoVWyg8wvxSuVnuey3k2X5ldDoX5nGn0zcB3SjO2TaoCpHhLaoCN4XdzWhiJFafn_GBSuQH8xFnPf5juwjgkpplLMCUeIhZURwxI9NDlO0ZlqbUzz00j9uTv5yBmIdISfXkWbwep9mky8RnE22_HMhFiLKYYDzbFGJaZQB9alVfnYmVFTARyknIirhl6-8cLxvlc2iquaCTQFdbLCuge8TMKQhG1J2yXUJ7_9AiaosLgWhbMLFfdLNKJvxCaFsbuiIjjDHqDtdrbp5r3c5mAs5zeWZ5SiKRuCWzwi5GJwuqmtgnWMeIOljX2VMDTFx6R-I1eoSRiBg2QlyMk2J1wgNFgQGsjPrExwSpawbMsjoArhvhg4M-mM-XK1K2utdE-BpdP1IQlqzc1yhKa-EfptfiHJhoE0V47pU-qHMLzJgyDxV2YUgZzQ6I5Tp42G8oyNN2ZlZ4YsBSFouRa83J5Q1X-eAp15b_i_gTmRigPikEJlyPU6bKrzbJVMu4nNCoyFlF5Rd8KXJirohg4HDXyUqnSkdWSTL7ym-GWzBG2J_wa5JdwgvDmW6PDsrROSeti7nrttYxDom14j3XQzssYKZ0AgTI1y76MKfOH8CzK7MDYy5Jq5BfONqt5sXA9M16WasoHUjwNbq_4oE2wgptUSpJLbTyCONoGxuxJYDzKyhmBFW3VIMM7GYPcC3FbTZtTuRVhCwvXCrkBHg1UrAcvynWq6Mr4TXZmtpDo-Xzk3BKj-TWdGSDWNRPworRHS3EKs0otqtY2kJX1viTLrUyskpbckNQaXto3Y7lS__NztCgDr-Vncuy05zaw6yYG5m4OHYko6nYUu63fwA8b2b22BF5YTYV38puEZspiVqdGxXqGybo-0FsWn4GJznVaJjO5rIjjblyHNarRQDgSWWQlSz3czYSGobrYPAjq2TFUpk0-uOXa3pPbM4qHpQ05qypH1m3GZCkdRJnXWxgeutVnn1FHQD4IzFXaCdj_kwFiNAYdsLo_iDFlz2ImtFvDhaI6VBo8fk0zN5mRX5tDMVRXbdubMU9eATgDwr8yYi1jLSOWW62qRKkJHL3TYI_AGM8AyBu-wi4dANkd1EcoO-F2t5iP5om-egHjAskowVaQ3i45ayD7d4pi2YkDZfgOsKmB78gUY6AvBe-G2RfEF98yACAC0MQGBZngxTyvKaOfyZCK6YHsxK9SQDcb2dF9Bmac30peNjo1RSINli0PkHOlbxpztLMagQqQcZST0YDDpJJqewrk4KqOvORalE-ilqFd0JaT_4__7X_xtEAD5ma3hqwRRPUiYBK83hn8wy-AqA_ZoWIGhMCmAyb38Gcla4Z6BoAfrwm09CWFMmkyLlWb_PlBMWGPlWyQmuwdAfTh0_d8zwRKcga4wfk09vzwWeqE5wZ6lrVMGRpe5Y9HTwCUQDC768bUjhjSG5Pdw2z1xUJGfLeaYqEdnplkAZLACPk18qlyhtYiEuReFTlU2dlBfzTLkWDCgVXCZAN6VwBhMgA1OPcB3reCeM9LGIw2hYm0ZqPFJ6bnUi8BGALV1ORZFfgM5EBQKKYBWwYBwwEPayqZiUUxHBqrKi_CrU46wSkaz5sm44zoXvNracSCA5kI7UJOABdVQdHOPYNPnul2ePy4t5KYXURACScgEqNFY96mFRkKAP-lEB0P8ml8kYNBN-dMMA2pNSmoRwxoAXzIOAsiIZGc4w3IIMKCfNkW8EC0R7Pf2aoKJFeExyLGfHKSj1lPNjktPoOV2tsNk4gX_TKEkpK1DUpM9urhvo2RhFrocLfV6qXF-b3XOL1bAG9Rci2L0_SBzB_5KTr_3BTtqnEY3Jyb2TezSmMcGcP6L_SvuUxNEJfPxXepfS-L9oDAkJSf44SdM-PUlXJBnuHEVpf5X8ca-f9mOKRSJyMoUK2Gryxz_i9K6pGpPkj39gWySO_kEG8OvOvTPDGN2itWges2VVLtRERIJVk3NxAUdzoWSk4m4eAcHwnGV-3hlbVEDIsHlWVV9LNY1Kdl5W2l7GRbyIKjYvlUuYxng_nknAnqPnbJ7p8-iS_bkQ6topPkyiSayvyYQBjS9Ze-1rqDNT2dmFkDqa-fsoBtAQN39WK-DluCHGYrBQMg6CKLgXRM-BnUmZvnYQTl8AV6YXIBZmlDHWthvvQ2tv4bH_0CiD2EsAJNkF6lfdI3H0x-BufBKv_qB2-e8BPdOUBA5cwyIwZ1LjcwG3LBGwL2mLl34OJ3BzKXCtFCozGHbq80jVyGNP0htc-ht8CaebeO8kOUnv3GNBQGncNcLnRLDwuHA3pIgyUN9hWRrpz7ByXO8R_ZwIFDQDX0Jb7oytHh5rf7veo1AbWEt68LnMJQlYQBtBDorhEz1PuUDRqD71u-KYrSLWAy0qo3XF9NcGBcCrBdxORNK-cCcHb-skrXHk4udRHhPFn7MsJhJeNNuEE_d6jnhuUoD1a94deH1bq9ZUacoCx9ZL2Nxh0Chffc70m62aKn4XkpM_7pycDO72Y0KTk3RZr9J7Zyw4ObnTCyjTb_m9k78G986YfubV2TTXR0TcIeIREVsVu6zWLWXBCjb3F3H25GpONAvOFgGN9Fumr-At1w9v6CWZoky_5Kg0l-AD0QnSGyIQ_RDZ4ABwFY31M5A2qWYwcHZfGtFa67gjbIHl1Fg5vje4dxbpt5HI4NsLSKDyFU00VymKP4Ag1F-IWq2CwEDUk3tk0I_pyb14hZDtzr2zBWuOx40Z4_D0E6KYzflE4uMu_HdycnJC8Z_kzlIfEcn0G1qnnyheStHrffoD0zXoCtjKwc3KJyd3A1NFvyEaWIz3Tk7IgMJW3gkhKxjcDWh95xM1egza65K0MBl4NlSsjVpCN6ROn-l72gYW-lVzE7w48dYDhrx90CFiGlQnPJN8R1vpUBKmO8AL9bwz3kAR8TtRbIn3ANVavCAb1InyFDBqYTUrYzX4mk_1OVcDJaaLiXDSJNGH3WZDGtkSrOTDcel1scel0xrB14irpEQlJUEy4MxOYWjHQ-oRdOVY1yUbgrjTlR1C2TClx3xouKMuDev3emTB4TfPEO0eHvv2jRQVckPIBblrlzgUp4Lx9FtQu8L2sFYzJvvi0fGCZ7wZ4M6O4a7XtS-JahKJm3vKMxDA4rJEwxpYjR-RLvzcQt8eowIeZKACnv6plfeu9fvpDcVY_SdUXZo_wqqHGW7pTYFvxkqviVJ65Q5QGYk1KUFjBEtHJTAD9Wdc4wwe7ccUdQeQQuUZAzVzAzozyvRHusQpOT0yJxpZrWTNFCdG6XSuSl0CvzjRP6UbwmivGgDnhi28Es64PF7g2QG2OBdJmTJS4GABs8GhFq2hFjeGWrSGWvynoQIv2Kv9OVrnxrCtPYiT3iT6qVMYuUVyGqvItnUm9GvX3CuQC2Cb0G2r3bG5JlNW2Y2aegWZBU-mTCTTNGVkAWpBZMGqfh-rRYvWQiw2FiLjC5b3erlZiMXtC5GvVlnNbk79Xcodc9ByczQT4xarApZhtcJfv6Ux8hu2rkUL7cGiBHEa1wKhESGCb18uKEQpjqVRJkx-Q8UK3AbLankHjbb1CRuYZriZRiMw0QxenbQ2Ddcs-SmbN3NmIENcT3kj9Eb-esr2YTcDocuappRKt-tMmsnA2N1aWt3KLZdFWqU2RfRfyAS0KexmlXcp13-xp7bj_9DYL2uNbasEzf3CRMMfvgsjwB1sLS0fjvWxGOt-3-t2NuV_2VLeANux-QMMmxu6oVjudVswTvRrrv8kLoULfJZwYphmDRBQRt6IMC0HkDZqntqpwyDng-XYENEfmsbbGWK1Ghpt_QC19lsdGhB2e1859vaoMQUy-KsG_RXE7FG9qIXHfo50rI2eQoszhylEUCQF9OcIpQUGeKKqCP5ErQtoQeCQ9WfK9L8agy-GSDGg0MKNgAh7DrwWp9GWylG9COSIycZ7k_Z6TjO-29KMVzHR_yLCrz-qtcK5-gzSVnu29PNtWl0N08HrBjX6-r4PoCVQn4Entg_Q-9eviSdMSMatBNgqBmEv_nCZZ8MqGwt4sXs9HZKMgQYayqi8XhZqo9U0MoJarFPC8WiaKM3q-NYLbK6xjHKKX4VR_FIbil_YAehw1Uy_4O199tYVABO2LXXb4kK_b8mmnUy0pbfOu9rbwhlzDQGkHlRIG41BaTCpcyIpXZJGQqXWNFwlBXMhncuFqLcXkrSlkKnbCkUKOFghvWtsDeNhdNO2Ir6RBCoERTnJCvHYcMyA1gyjLeV2Qn_9HLNwGPlEHYeR2AGUuqU2pF-A9hZqVWyxDdFOg1D_APp0lGkikQA0Ghqe_rWlPEgzGtfDcXbcrHs3H2eAv3BoK8lSbA7-YouNNqiT_mmnq-NkiJig0HpR_9q2iWT69xZi-Fvr98-t30PEDu0Ilx6oR7ouZ8TkCnz53HuXUqoT_XvrvW9Le7zKjjZvvGd_G3s60BESiIf0et0uJoEAyaib6ET_lnJ8H8fbB5SAyYx9V9Otw9Cr1eYQDGA0uIdlzUfrY2u6Ps8q-P1zu9k2doAYsb_VoKXoGtW0je3Ut0zgJqq70dWajMgpj1sZHkus_RM28rf3oRkuYD8C4JDVN7IJqPBE7AfXuD1uSW4ZWyLShvdWMx22brMOuR6SBpDf1By2VAjodP2WEqNA7QcsW2CTSL7l-imredeysABTPpQtep04I2lU_EFL41AB2Pw9NeTw2P1u4JKs3bNMmR61pzRamxJpmkGlOV_noK37pw9spQ3lIATeP6eoK-dymd5bVw0CrWq33q-d5qd5z53CMqjUgq2gNWprnoDVSiCm3-vh38c0Vi3tYDAZNpKj_35NCtppen9tlvvrsyR_04gvRu48GIy5v8DFTzT2ps37F20pY5feqzIaQWJrIXdvaqgBxxKqO3sIDZSI0VtwSH6EyNDh2lu7xX7TIXgts0mmj9ZZMXaP8T3Vj7a_H4hcaRqBwSmiQYdwCQ2PtHk8A2BbHUI7QRB9w3KT6ftbbErKlk4OYqfx9qHcJ3Y0VnM0N8I-PHbNg4jD0J8jojyZCKq2bftRECqzMuX2FYwSplNWOiZsGZdRyYNMTgNqjBM9x0rHAQuAQ1v2g04QBZ2gT0r3AQxQnrsnNQj6uVkmDdm0X65ZwQQBA-igmavQ7_Q9GgNakTcQ8ZopwfWMBNNMZx1UY8hn-SQz5tpLKS6FigL8E7BMlvL6olxUUeB_BiyX01yJiY4C9ytgLsV9V0JWOWoDBf5nUFOmQAwnxURUVaauA9A98LpuAfMblhW5htyLTH0RGnUToGSFOX_ZwQaVmCxA5BGkTCng0ytttByZSClTkjuexUwJ8Zcg4heitJPYAQd_iPfJ2dZudsDROLlrALPdOHsa9WCjMI03xh41o_tmO64UjVvLgpAn34CQjr3wNwfk9bg3c9p4ucJ7YnVLFR2szSG-UZWr9RLRxvfNzph9em9kgAbCtxekmYBLcvrPWwbuigDAVtlHFLq1MYWlzC4ECjNDhvoXmTayXxRzbX2zgQgYzBdqXlaiAmDNm0_KvDlxIw5myA1vGRyiCoF1_mFMpFSSp-2N7nKew34ANQRYier1rBjf9tSBcXe-u7PM6-9uivPHgnsPIToGGcmva9LeqH3XUvB3orKPIF5aQ6LYMpcgY4MLrFg5N9v52k41kkxnCng4JiHKzXrdfC3wZPHlxkZHkrnNiSQI6nu99QUgOVeS5MaKo6sT-5GuqWUKrnIkL5iGX2h9oFq8eaOZgWanGThVAeOrtQaCrABDeK7oWh1kIwpTR6_VcZetNoZB3XDDOA97WNoeG9cwBZwp-1XUTBWceGgL2pAqt54xlvPFaZFPosD8DRg4Qai0mO6AeoYIoo3vJr-UxXUrGz9rL0_1Vlmf7ixvl5SsA354vVoQvu7gcGel6txZ6vvEXSiyRTHcHBJ3v0CZkdYdd3qrwSeA-SVfNi_Jcr3rtZfFVYuWdc0mRSkd7rZZaXMCrZoAEvy40KhwkRWVVyY1XnFErwe41UYr6L1nPanXszemBQuYbs27uTp4wm5eH1gSVgllHMx4fyzcL-r2VWwk_ZsDai0YaChv5BvBu7Eoawwf1sv0gyjoGw2Fmk1Fa3DOt03W0ntBYXgD5aKAss3t8ExsBRoJOCkQ5QF_Zev2NuXdImSoMGXAMqhCQdVlXdNIx6oc4FEAfsffPTx1zdTCy4673gCtdXQvhM7gmBvfKI5EzAfzEm4V89-o0j51vGwhtULFJwdk6WrlrFl8k4DhqmnDdFDo7cMTZiJumQxE-pI8f_Pq5cDwcfIZGHiwPdSEZmrC7_1xMl3u1Tsn0-XI_kvi6O1wGOH_QC48GA6HoAzz-517TM1uq4E_ota_WPVkugzZ_dpXn0P1ZYx6N9nO7OHO03R5WO-0P_f-O5_hqKYndQxNn_NtikFOL-h_qBbU1gr6W0pBTJ3xe38k2c5fw52j7j_u_LP33d3-PR7_8fHTclX_eyft4_p8qwC9-18w6JOE4HgGaZ-u3MJFaZ_Sk5SuSBzZNtLm50561yXS-GRA-98uYsZ7vWaSiBTJEtWJgoAhwwWOOLO6TJpdwAt7JiIFNjb9T507S1UbcDylTF00jd30rNPrEfAYYuUoLSXYXq_rE19mL5HN5BOeSS1AG1-A9o9qeLXtdtUFIdqrREX442lRZpoaoQvo2KhT4DIrzUHyZWwHAczNFagCobUCaX213eAgSmtl2IqLAeg2ehm2Ahm2ITKtTxO2YKWTnJVcnSaq3U0_2An6TbNigGSKtk1gbhdE5GUENUGMxB8sq685Op1qmqHLSVYJjyxFTjJqSI6bFHcsInUNenwssOhe1nlkS9ExtgVAcqMhWNqJUxwCJituTx_4_2A6hP7TtjRsNJGfvXnVOTwYhp13bx_Dyy86BIyRHLqZFaAeOWUd0KvV56Lz3e_fdQBKzvKrzsWi0p1T0cmmUzHt6LIDJOEE2nhclmqay0yLaeedzC-FqrKiA0rS1E0Eeql0djEPIj8xSAsiQ_EEZskD5FwEC5lfmRfPJEdNeb52QMZ-aZxaOuhuqwt8lPBdwjSTMMQEx6i_JnLLAr17-ezXTjNYQLv7wpiXYUMzt_KgMX5j4f9D4zdW_x4uPvk_tdLuIeetMTEVt74Gunz25pVja0R9UdtztlCGEG7OGsCL1rrFfTxUasu0XOUOcQOfq_Iyh7Fn4EOwKPJKTEo5rfxxyA0A-d_qztW1TVmQtq0lPAHxloZsHduCBV6Rv9H2-pvrvFD55lXeBu3O3cG4_fK9--WZ63Khio1GLeV_S9viCkxsGzcRsUpG6bd6-rFDcg3XOoNuWed0ofHnj21fjTSg32ghoLUbrPyfDRZbAEFlEqarFQ791m5f3jLwl5sD_8bkX_qhi4ssL_7O9p0127ehnX1LL9gy3FAlqipwfPZbu9i2V7aQOxKLfLp1mW94NdjSun8J1dwtf-s1DNONOUFxeN1uW8F3z_4FSzgVs2xRgL_IdVOcT9_dWSqw4W0YFVmnWsxBGVpMOx46d2B8g0-0rvHNn6Ly6NWPiEyzieOeTns9cslLYKdaJF7wS2PYDWdm2rhcfTB15-aTuJoIMa3wkbrIrvKLxYV7vTp3ltPaXnHgxUzOM5VNgHT7BKJrJgYXuQTDURxN42dmYrhQnM9WKzK32MLEau3M4k-nQn8VQnbuLCc1PpCf-rMoyHSnEFmlO0F_gl8XJX7M2C1zAsbEdLVyna5Wk2OO7CXfuTjmsxYYmYN2JeA3QePv7JKXY7SKXjjDHULW_BsShxKZv1Fi_qbeisGSpgnqIm6Mjm5uOMgkmuelppQOqvwvcaNc8NCtRilFBzq0vmR12YH71cnOMtDG3XAYizjanLtjCHuKgpVMWtPITtDX9-2U3ARuUFKUBaUK6DfWfGEFpu21rYnY5lKh0YK3y3u7VgIoFqSUkgWtKVn6w-_F9czhMPCSgJr5jASXmcrB8KZTTcq5CNjyrChPsyIKzF9gqlcVUr32R8Cm4jKfiCgwfwNjnBDAvwH40VBfOFl-Eddo2lCCTJYHARNS5_r62TRS8GUJBsmDAMydggA0P4Lvgr7oB98FDBgOM1VedL4L-hJTcvDFCMcu6INMwg4WEH5gGH0X9BUUS50eLzpjsdrwnYAytaYbLiJvfWFVpRmOFyT6dsxigH-bYcOWm581U285IVc849lqtaxpcjV4s5gAc5GPhsOUB_YrYFfJ1eCxEoAk8dEQLGrsl8l6Weqfymk-y8WU7w73Uh60UkyRp6U6zadTIfnecDflgf_2LTwF15V8z1XHT5P5KJv-Ygy1-d5wP-VBk2CHVspZkU8g-wjGZj9NJt4jvo8TemJsOK36lLeJq3SmF9Xx3nC4WgHttjfcQ6TYpIMapzNlVs_-rznjVuiw0vG7viDiya1RcsPfaoYO5ny67lSwZwIwxa-5Pu-YfLToMz_rzk7nzjJL3HdaDz5Fpuosy4v_Rr07SxV_6hAgjemnKAiAQLaeotVD7yoal3y55vcY-GTG83HLWfYrKTqlQmPDDqwi4r-VHdMAjv4za3DrZ9gY4_o8U3zD7thX4LezdJv7pt5a_htKJY0a6MC0-7fqdzcaMPax6uUNe1Rj6trSp75kMzZh56xohKIoEzWGsIoUa1CBsgXIXiv4Z-o8M17C81zQy5hM3GAnvERNmktK4wnY0L4sO8aPtOVRqy_kkqId7aWFInzCLgfOv0SvNzX8kiaJTChlE7OuVcXVWzJhOTi5FRqpScq6crXyBeKF1enq9Sb29ICnB3_p3SqGx9Jp9M74xFjp03jmPM1MaGTVXNQVjIBGtl3niSSfkcoxFs07Gg6PK688ZSt_-n-IsXGtnNZ9OPT-4PH8DQYD-okyeKfUQ1CKtgD4RAZWpfsclnlq3Vmck8YYGHVoFtECVPg3zD-B9XomyS_oekISQ0uzZVZFrQSWFYX9Hhp-jnnTmzLgvAMBC9hRoPESGQHLFBOrjVSwD1BPnCflG0juABWN1Stkv2jvUrklT4QC6KEffd9b39y3FKOUJMFlLr4GID--Y3u99wf5Z_Jw5ynw4pajepX88c-U3r1z7yxvOC73WgVaGVtNQkEDVH3kW_F5YEV3SWkcdYGC5UBnZy02lHZnyjCyqMUZMa-Eh1JhXkiP23Va6WYpoG3UQVOfjSYuKBI4ddEbfpiMquSfxvBKuWAONEIZaGxsPg379qSK_g1s3YjE3aQTceBdYvK_gUsLHNXqbhLx9KS6S-IoAKZvkPwRpHdXA3oXCwSrO3T1HWR8l_zx3b9bOd9BDmR07ho2cvIH643_AW1TSu9SelIZjm_n7r87d4EZbDncd6m1G01OKqjx77S_ukONWWgrmAVOmy91dhYRGas7RNJ-EEWoktHXfXUHzObti3in8X9s3VnGWVSAV86S1uNFrxeCcLthb5IFep80G7Gefi8E6P-RKJaDji3-MopH6jEqaqDSZ-cGcgjHNDKHlensNAp0dhqw6jxTYhoF5i9qXPzEtyKXYGT_GF1XaSj1Dg1uHKqJbDYsCcfFoVuIabgP7h4oGOxT3nYL2-36ylaE_3iAFuGJTU-Z-nMdC0w8loeYnxgYmfOzaeog1xAe0L8QoWjJ3CHZ3p2lRRdBVQpxSPRxZZuJRDJKQSr02lgCUf7gMQEkrR38Ad_oD_xrLqflV6Ye8Wk5WYDlLVP_4urR4LScXjP13N3cNR_pxgJSoIM3pn7kPzLlnCm68urHY67b-rGSD1nOX4zDBiK13mNZTsVbA7y6gHLIfp8aN5GOlGn88IKXp5zrLufv3ZpnlL2nTO6EQDC_QMVb6myeuBib7owlL2gTS_2kEDDXhuos3VjKQflVCvUvuxpIgT9C3Qdb0Fv7lnyj7MCyC97n4itt2puBlyLXodNgyGqmrAfH4K-gpUqJcwzglw8YgD9AZQ1ea02pZdNZ_lx3aBjKf1lO8roPS9BHD4I-MD6Nbb5niqxzRJAF0w1NU8ryqE8dOyaw8QpQ4mG5ji6v07rhLvOzz_wT308kVa2wlLIfbKnzjVLyl3au2MzF-cgPbgLygy3tmDRtT3q9nlm12E6-0Vpx1LPT9cNV8Yvy3rpSpNSpkNVMtdTZ1fubZ_dM6Idaq_x0gQ7_UHG0pW6uXjReVCVRLXeM6td1dUaQEf9g6HV_yLQfI2293-2dY-r3rQbI7WG9BFE7FP3N9XgmNLzSCy2mb_R1gaxxY7uEJNF79E-h7TiY-pm3DVXgnYYmjRROhQhOl1eRuCDVRJVF8SsAyuvm-zdEbpgaeRtwtKD9x-CusU-Hc_2K6FYKUwcOooBDOTDT3DNL0-t9IMur-VVUDa7YNf69ZqbvwdU99a9BOZtVQn9AS9Q9N4zBdZP1g8jPzjXkzbMz8bQsplWkYihioOEgl1IoU8odA8rU3nr8IFQ6mJeoEwGgq3EhekNbLTsTv9F4eWV__8quXWodiRhWbsquo8uaq3040_7bHUKm9hE9AzIBN_YR4OG5PHtc5ELqX8DVFNAXKiQvsLq4IJNBIWa6vxhc2SWYDHQ57y8G19Sao2Ia_qTs3EwWk8xv2up912ug8uUkm-uFQloY3EKgD7RhbazW8UVg6CtHWb-o4KQSdOifXAqpf8wrLaRQLsrAeiklLspLsbUgFD0yjxm85TjT924e7U0zu25nc3M3mS51VmChaOOkYI7d842TApt_HxFGaybBpID9UPetzQOT1n_gC1yHONjZ0SqbfNlBzSX8QfuCScXX_NFvweCNrbJ-TdTv0G5hUeZygwVeAsmFcCqZ8wIFs7NknoJ7ghesKzKCKr7QmnEEy2Rq4m2cIiqMj6jd3K5ardRzlBoZj8ONwm1hcO6cb8C4ApXXBLhdWq3UZ5Iz_YpIdu9kB6zhQWdGoWdryqR0zg5l3nZ7CrHDyDmXlwBJKi81lIbvb32P44nXDzHSTCLS1Kpdi4842CgxrkQTcENgEBLgbFeiEMC2YCAjFbP8Ko2wBEXPL2AFt6xZkqB2Bm7NyQ6NYRCAM99ZnexQUJq4lyKyCGZt54wkoGILpjIhpWk6JjArCwkQVwGoZM1cZOYh3BERn4n6DQqAk9z3cIbtV3CaVWIn6GMqRfc4TBagCSBLB_Vkhh513aJXAW057O31TM8eLy8ScKUgI_yBc9RfiTKUysmbPj2JHMFwQkwCqG_8cVIxo7wBJEr35M3dk8jSCk7fHBYPDKQpA5u7FDXJPxMzOFi2gDqzP5z-wg3_RdsLu3cerkD1_UXjExxYSljhBWiTGsfL3uuoXcEf7Aq21q-1bmhf1-uRMy6FcXUtyZlJhbdJVusDwlefXHPbLQIXL4q4jq8jocg1pUxO19yYezTRqH062pHJ0uhp4pxQgcMqbsIabUbQEn6pJFglUSaNDCEGMqxCB7nSULwVoWkdwXG45KgmBwRPDkxxNYmCex_14HMFaugVEDlT8GUFgnOEnBUC5rLST73j0pHYZdZzpnXbFu2LXSbkRF2jAt8LcW1W64v7kc1zn_i5KiV0kV_MlWHFvz1Xojovi2kUil1mH4THpdTiSv8k5AKGgFNaOtQsQZ3QnXwaMPMLJhUAjSInaJEww3_njRdWMQCp1eNyKh6iTwx5xjH4R_Dw0eN_PXn6_Q_Pnr_48aeXr17__Mubt-_ef_j1t9-z08lUzM7O889figtZzv9UlV5cfr26_msYjnb39g_uHx7tfARmvfW_5i7xJJEzYOSu9TmkYC7FWgZ0HThGEKfDSeNYjp40juWYgjG66vfT4-PwYOV-HtpfzNpUyFlCwoP9cH94f9TT9MGD8BCmnpDR_uFw79AkjUzS3nDXlDnA74Pdnm4EUN4AgssdBf5sHxiFhgEILx7bOVjfNSRHQHzNt80ESDI_G2NC-y6X-tBI0Hbvkvze3mpI-yTv7_Z26T936Vgd52OaJbLfTzms3Byucr9P0-Pj0QpYre00-uDBHlPHOQYxwCok3O9peny8t63sCMrSVuFdLHuwWi84bmgoecGXu6MoGYUHB-HuwegglCw8uH___kF4JFN2sBclw6vJ6Wx0NBF7h3uj0Wh3tC9ZODw62g_Dg9HhKAxlysLRIRQ8mByMRvdHYnj_9HQY7o0ORqeHo_D-_sHoaH-yfziVbHgVDm_-X7h7KtOaSXBxxEf7B3B-75oAX5mclheEroZMfuFLcQUSYqPyu2wpo0byDWt9vK05MWEGG6esPnAV4p0Xi0Ln8wL4DxtST2p5qVYe6TwwZuoMaVSUSEedJ1dz9BjZyWQHK4KA0o-g45o3wsfKSShNwIWNUxKODilavm6OzSufg9ORwrsmH0NompKIpEipCXhUtnQl8kG1OM2wYXD-0ohyANLmhqifsGLsaGAXkMWqqjSqphUJj0bUeLgYr6ulVUTE4dF-FB7trRVwijSNdHi8pg_otf_eZDPRaADGw2Og08UxD0f3QXg97PV2dkfHXMQga42GxyZ3tL8fT0kyGu4BPhHthKPDVkWTdYhZrsbB_v6urbPPxIMHD0z2zu7o_oGvCx-29lGrkGtjb3S0d3Rwf3RkGzrAMqM9_BMetJsdhXv39w53D_Z82z7FdBAOb63suttyQUzVkAGBcM8P54CalrRpSWNLGgv98z8UgrEOrw43unFjvpkTk4qMwpAyQBhpNIXQYjEOKRwdsmH7_9MoGQ3vs9H-_rf-S8FTieTSCMf_lekMWD7EMJXxVjxazGZCkUNUFBAauSMHewT9-1RkNNylbEo2LhLwBFBPpH0mnWoWmYAXA7IGxI1LCQ-_IfiuPFZjaVzmhKP7x2svGpj468bry7rh-sZYXKN3CZjQ71GKnoPAOb3C-2uokvUXs0CRTnkMACFLcgDgJV7wJSaPhntN-oMHB6vwaOSz9_dHR_vHZa9XHu8f7I6Mg6d-v3jA1To8e_f26c5hR0j0Z9nJJXjURI30aqFUeQYqgvMsVxZgLbaNcGG6WK327-_u7R4vvtWBUdtrNe51aTrDq6C_aEwkwwPaDzoZ8Fin4qoT9It-0CkXaFauMnkmAvC9j7MnJd7sgz4h4XC02yvp8XEIryx-LShiBqvR3pA1yxWOege7q3B0aFQx2xmr0Whv3FpYV9AmHez2SvxujKeyKGuD2dwcO6_lf8x3w7gi4cGwP4HrMjGwKxmF99kkjSYOMCWj8JBN8E5O4OKER_g12sM_4YHPg8NerB1rG1HLWmwipARwHa3poYDKZuyBsQJ3ZkCIAhJL6L1Q7I7RwgDSfmrpWBLa6w2PkT9z3EASA4X28ArrW6CKqxXeD-8fHR4chYd7ppq5-UTxUBzc3dIhgqkRU9DgHv45YOr4ePTgwYPhSreA3q1dkylJwqMjFo7-Tlemj_AA_xxCDA0Gmu9mH6NNjCBeoByuvbTNVd8InoIZj4vsYi6mmB8TgDsTLlrHw75k4dEBBK6IpqTwRyI8us8KHFSRRkl4dIhfoz38Ex74PDgSEwqOLtq9P7tlVM-kDg9uG-72nGdS745uq7I9B6H0N7IO9syKLKL2mbSh_YytnPduYALz6X6_ydXHPNyHgz467ENcGKKbizQa-bMQJaPR7m3nhFn1N2niL_rugC4FR42sBDBft58RR4PlM5KDvgz8N8gNWgh8y1-MH0GUTvwd1BEMNuEXaD859KsffNeZZBJ0105Fg0eiats2w_Rb-o9LclsWMdELottLYHAD73Wqs2iszzzm6Xdgb-_mDgzXdiC8bQec8w8ME6uONcZjLDHoIm16r2wsbkepHWf9sO3-anQ3bwaV9cMx1Xf5yDK-Nt5i8D6CUuwcgp2oOk_ARI1l_X7T3_Rmf95L6O3d-oX57_RunbqAK_a-X9pmJJd-3ZnggJTFG3gfW8PvIqL5vwnSStlpRfp9Qds4ImvlCdquSMdTkmzdo9tw1NbhUK3I9og3taI8OsVGkBa2QUALr4s3sSVQq205pxHrai1_lxTrnF5r0cFXuWOUWUHFqumHApHWohrhdqHBx9_qztzcVhfrjYFGqriY62vb6q3PBRE3kEVwT3SD8kM3o7Ih-6j1xJiDo0VEYsDBbqMk35B6OfE3F_kAMBz3NAOp5KMkjBHNPfRZe7suqyIa6CucSbi350vsH7kSUyixt2dKHDTNH4U-lhyUODCKSuHRCGWvLTa8Sd7F5K0Lj0sNaGRneDUJOzOQ2djFDY_2Ws0Zo-3waL-dNjRpB-1uF2QnZKFt4f6NnJHNObyRY6d5dNTOmTStjYbDGzkjmxPeyNmzOWtLUhKXvLuefGiT2zPuFMR1vL-e7Ho9WE92bd9fT3Ztr804820frSfbtsPherJtOwzXk23b4Wh9_rbtcHc92bW9t57s2t5fT3ZtH2y0fWDT16Z52dqn8PBGjuv56EaO7Xy0Nt9pq84ovJHj6qzNumrX2b2R4-r4azba3_d3dGe0f2BDmYBWaVlAbLzTxRkJLqqzeTb5YqBRFABpvO0GGf3371AB-7s2gUUkBrZA1OpcdH4yNqCvocnTXGbq2lj2EwN_OoF_7voBdWA3l2edzNBnQKgNASiO9vcHnbfnedWYdjRQE0KseEAFcQkatwzIU4VwYOPhMcQlp-CRvA8AC3VWEJRRYDn00EfwDkfOWQ4KgJHiRN1F1mHfwjzvTs_3VrR7A-zDdqOg3l11e8XSBfBVfI1fIQan-Jwx2RcDmOIrFHqyxt2Z7HPN8EjHCkgRiyEbZcfocCMDGRyQYWXmLVzM6GCjl2bNC2B1jIFz4YlQyWR_o1u1hk1hpAysL3iBjkKblVjW4-ExRntXSU5ouvasrOFI32olSX0rrYfqZjOX2ycj1wZPNrWHNZobGGKgzzUyaqyKUuuVA55Nhsybo_A46_Wy49FoDxE7dczlNkaFjezR5oSMdvC4Vkb-g3wHTnbDXoas9IPdnunP23SORru2r72h76sf_s3edrf1Fu5jb-FoRXx_W3o3cQ1Hu0eu_0P6rV4X8ossv0rDnTa9QsA15MRk3-DEIKAwob5hZqO_ObO9bTO7byZ2uD6xb00UPDBbMoPmfb5NUpPRcbMc2TEPw3AvDMNvLgYiFqh-sn3-zj4MaoUHHSWyyTlMYcfwnthtQ3nwIByugB13QPvbCiCPKlsZLl3jOhooTvRU2VyUybb7BhcmBLHaosX0H-3j-7jG64Ht2mvj0u5BgRDeQ5A27QF3hfYxvifI3fznCGRv5kskuynz5r-h2L1rPBIebmlZ-ZZH6y3vrbXc9LObAqEBXnoauuQugY3fTbHA3vow99eHedAe5v3NYfbVvVAYfABRkNtH-_fXYYcfMs0Btbmls614LL6i9hEFE4TM2M3ju4wRx4D-WRo3mAwKR6I2VhSSLxuplm57X0E7GzzI2gcnqsfyy8BKyLisKQSZvOJNGu31rgYfP4rqp3K6ANHXpqdyMG579VU6HTYTbfsKwvIiBySg8ZVT0YyuKJPPeHBHiVnA5FWjridAGdyEaehy_txxKPVqpZl86GPIGEVPo8SPYWTmSmidz64jiErWiqqECtfW7za6JwQJ2hU4dYII6BWREKIINIGse6y8i5HhrC9gEEvnayGEFybyLmSABlUOel_C68eaeK5NkHnKKi7W_HSuVhjZdLXCibrT9BxJvim680JfYLoEnU3jKxL1Zk0CaUz8gSBvxUcurH5s5hQeMqsc5SuIRD5LgX6Ev7ywM_Fzk89SMLCAv1FRj034W0Fp2307aRTQvcNn6hgSqE3RB-AC_BjAYgCodlFraBuX09GzXVzr1WprePcmorILYEwb_QGr4GlMy0qjloScIFyLzQkqUN2vvQ3peE27dcMyIpZvG5sGjOFuNVpo1NKobRl_sudMxiMIT7olFxrwBWgNHgYajdq8CU-_FpgOBsvky8aqzfhc5w_wmMS4YYDH8pZZGJjT0gSz0P8IsaVcNGybxQWFv5t-htpL68KXqy7qMEuC6mnExk2HPY58CAJJjHHGNl1jSHF0h1iHa1Cwo8RE5JfAqcSYhU7F1aocv3FNkFvasI5n1pthzzEydc2kiQHTirKGGoBLVKlB93wG9j2Hb3AOb4JRNbH5IIAXKs4hZMqNv5Oh9fW-gHuZueDXbX7MKy-_A83K0f5-b0OdBtxlxtsP0tYDJB8abxKgihmZj6HxSgcO5dvRbezCvcQT17hNjhMo5VthmdPrz_FvGpEEZ5tuiDidrqQJXSLZAv6xNnRDdsmHbMKHbMaHbA6JEz4cT47JbfGSxrM-nyeTDU2fSb9vveScA7cSVr_icNvnKbsEWrZHpnwGEZd3wjqy-oxnCHRddp_vVMmEk0k_pP90Jmxpn1TYGR5XF1dSxG6C5xi8OjzYIaThUdP-Hv1neHBTIrvX1_2cWiHv7thqyJwReQo31RAWIMl16Zd_hAd35SligzlFTnUrzygm2XrjHKgep9NzSloKNuiSjq2P2TC-d8dnxLcCFvTNHHb2dgi5_KPJ_2d4sFqFBxRD97hLuz69oQ2-sk0YrelYNsNvN7w5ULxtB3vbPVMj0w6D33AIJ0_jg71IM5hRUsDJkxcQYsbMrlFW4Y_ys2cS7AFhRC9JyUjxh0lbmyO9u_DjsbEdjL4IsYWt9shPz15-fPPw6ZOPz16-ffL9k19ov_jnRomHv66V2LmtJo2KBuvfPaB1atxMJD6OWPx9JM8oKUhzZ00QKwfn5EtS3sbqjQU6BAZGAUQ6k9coJDYwcuP60towop1wqt-YjIGuIjhdlJHhpMpeD2M2AN5mMCYXQMdUuYgvogueGGNjCyoxXuh6SgvhAvXzlCYy9SEInM_5GSfyCYRaebJRtwV20WXhjQJrjTP9BMxI1KPBZKHAeujNROVzPajUhAX_AEeoSnNThugZungBC4ZgDGq9H7megZWW_MyVxjwXeeqK6zMiP65FJDTuAC3cuhpAtEXKJAaI6pKu_NzUFlBb3Ky8FrYQ6zdgECy8P-T6nMjP6FrkvQkHa-PdgQXGEZyfe-QPEvOTmNIV-eNkAL_vUXqPyY_OjiZGN8-UyXdobwcuni8zcD0hn_qEC6kh4U_jExRSFhUUcZ4CKUvkX0z-knLco0S-ZvJDyhP1mqnXKZOPAKtOlGbyecp_hl1874dqERJQXqzO85kmGKCi9UDDu4ihGH2BaMMYHOMHtcJ-6YF9y9E_6ENpYo13ygnu-TRgvn4-yKdQKGc4mpol8gcmvzeDTOSvTP5uB_wbvo3G9e8QfZzI7-EXvIEHPgK8NMY1IRYLebcLBmCXeZWfFujtyxnmDTAtB9_Db3SmsbnfiQxZVzA5apobciJ_IPJnExMZWgyZHHFxH8LFM3ngf-1xonaJtQBMAjBIOc-n6JoafUgHJjSK_I2g7fNm2eq8_BpgzO7FRbvs0JT19oRBM-7JOWrCGJRK_kzMAHs9W40yXJ_24uBA992QEyYP7doeca3J0pm4G4PrvV5PHhK5hzPeN6OetfSg91gpJ9Z0ZVGB5jTc7iu0UehCbWKrD7E6ruYRxNEGNhOc2FysL9msnIA3zsBYOQUpu2ovU3BaLJSZrDwCK64zUBhcXx1jZ5kEX8T1tPwKjr6tSdH6F1jGbPRzRQyqJvdxZBqYz8pZdeS5sZaxVKGKcxWp14TSfvAx6OcZoB6ZjRN3BDPdIT52a6586OidEWW7B3S1GlK69tRgM6Tfz_V6OssXPhBPXvFlPo1yxc5FpvSpyHQkjgitWT7lS2Tlvc1Oq8iWJ0mSK5ZXKSizWANen1mzJL9k-cResnzO8nPzOz_j6jXLjcNIDu2bQK75wtCfmXV38-damG5naCkGk2xy3vxIhmnf_QzT48YyR9Qsv9iAP9ibV1z9alztY3xk0wIELGaJQiICXfWyiXHDAh4rrbuVSDPwYYeeboZBjSQiy08bczuCMWkFa5Fh3p0IMqBhZgiMIbipmbRxHGXAGwZBCFOmGAZ7wECvJpIsy7_yhuEmmeD5KdD0rcVxvhjAJ-QRsSGXwB7GBIZdgv6xX0I_7Y3QtC1LOMzH3hXbFbsQaInpfZIvgGoCZOGRaZ8Zi5vhsfppYGNmE2c0jbbf1Gur9Xr5GTHcp2AOVkABm2fXRZlNITSEhB7yc7M1ZuCGrkyUmQTLFwhoapaw_E3KidLOLmApf4AYI87mBsLLamK9Eb3RpcrOUD3rmRYXJPgIBhoReMsQgBBsFDOmbVtKwpVds65vW4ygE08ZmQu6fv1QKUKrhZyQELiOa8rm62UH82z6BgHYiAVgWN5cUQJBfB_B8jsbJ2Njv9VEG1cfJP0fbpi2wPmCKAN4yaAhQBM3lqDatlJMELj0-kN7DOb5E19bhvkY2QzC59X4puVn3PJe4AQSdBrwt_qBvadsrfytWwMOIxpQXpnigb-HyNcbr1XB8X4R16tVd8vhJ2IgxVdkGQKWBuxZiHgySoHxp1Yr8D1tznHmT3BRg6ZPgBG0YVeyWA2yCTjXWq2aYw9-XHyVBBZzOvDgFTcsnw48SKVpDdwT5_0lgxCZps14raI_JAVCl3YTrawwXTtQJkG1Hjt3K3H0pAQYoz-QohVdWpmIhrAzAAta_bDCgYfC3eLy9lscQmcAHMysiB6tzYcJaKWgvV4-IcaBRIGVamdwqDUyLyBbiWx6HbB8iudtZ7QPlHcb4bAqKgLh4k4o9sbiz_XuGhYWsOnBCfvGeFzAQni9q4F_Iw2kbXYXR-p2N6_AR0yD04AhVwuXGcsfCD5AQABvb0HEedUYNYuYqAbBafVqjlxNKToKODsrhMEZ3YcwfH9UusM1-hkx-vwty5_Zh_mKE7LU1uJM87CxOTMccyWQ7RdJHg7rFo_Moi4qlh8i-Qtdv94bAFf9CdA240OIVEz5g2-BAvVnwKDV15H8iyI8gJXu6zYfAX08KeBEcRfZJox8nLfxAhglOMgpCpmB79GdrlYQLfgYcQ8AR4CYWSIDi3kaA0MVc7junik-PNZojQtjBUTvMivwEGL8tnsjStlrohzDdjkpRKZ8uew_gjJYHnu8L7kuAXWapnwbWNP8wbKphPQ5QjLtgdZqdQknpSwuBYFGAb0pWvF_NGWXKTM-ll6r8iKvxEBBgGrhXC6g4CEG95vwjkwJRSGRc89RQjgQP4TOpFwU047VKM0m3lVijYKh_KH1x4XimFORTRwH1R0x6eKdwEOOMcQejb1EBgqW3D3uJRdz4AfdgNg5MPRdiAnkWpQgoXkDpkjufNhgN7ACOcMA6aTgOef8OcYPpaxbGHtrGcvXJEcl1g3uak4t_0S5U5FfGSnPXyRkOM-OdjzhsVes0jTeA7MXUliXYzOB3nvZ8kLo83IaOZFQ8PrVm7dBFHz_5G3AEAWLAlnu4K8AcNIp-LmBwBFBLifFAkjACxDJBZNSVQGg71PgLywDNPKUegdUb8G2XVzpe_Miy-UYDSMqoXlelTuHh_tHO2FQMyBuoqwGIxj0IxbboKdvyOOGh65ENS9lJaJO0DcTKQbQMvA1I894_5opST5ZP4KgpnNnKbwPPNDF0RrUFyGIRz-s7-2CgzTTmi5Av-0uCfvI-F4XWBmOwCYH3Q0ja9nyUBptjK4VdcJe9wKa-hA1Igh_9UH6HT2Hx-cZxKIWb8CKPhJv4CrRcUmGwNmX2WV-BoFWB5WQ00d4qsGeWHztPCrKUy_jSzI0Znfg_T_sAgz0MQlMcx1ouXHTh0yyJLB-koAKDcDVqvF6BAQnOpgLUpY_QZa4nrHAxp4IWJDPnNfIN7mJaZXPXpZS_IQvfsryV74SSouBs1AqLKh1AUwjQ_pA0TsN3bjhLgzeXXPZXZLg4hXJ7zQ4BHqFMHiE8ZWH1tQ6hbVtqBi3fUYuWQMFAs-6M9jHkLD5HSYMWW3cnlIbABLeF_mDIw38myiY6PV2xS44OzKoKUI6Sye50bVpt4Zoo6xxuI8dw_EEbAzkmMYJBDjIMPIeFP1IE92wpkTHS3Ojosw5AWXWfR-wN2DyddQUca77NsqgI1u2PBPwIj9QL0lwBqiksjAH4KPC4LbgUgLJkdWKLDj8Yoo7NgFwWVouUVxokxfimizM2-MRRvR8yC6BolUNRcvza2LoczRns-cL9XU2Qol55maOjt7OxUVGG_HlAth3PsAMyltdCFJDfvv18O5MmwUJGTL8IvC3CDAHFLTRxys4zPwOgkmMvRN8eGpnYAPf6-mmi_-4IS0tH_W0Eb4nehcelCdAOdknykd2AA4nGKC2ZolaDSBPQrIcDz5yGDwbIQw8n2HS8Bkmzp2bfQGSiTt-0IfWBY3z6KanQF2kNdMHZIqMDHBtlFL2d6es6kbgDXwHNjHI7YJfNqwFO9OFfcRykFQsGwYQnk79gVzCfULykNbWFfAbQ2E-m94c90aBNl9c8UWLGGrcYZ0JcHeUpChJbMXnXLA2NJJMjbfQxsbz7LqbzJtROojkl4lOgUZa31VldhWjgs2N6kYimd1b6T3x1Sn41IS1t80w9Q7OUU3Z3C-ofu2fLyipP5B5Q1pTOoCOfBxA09ocWhua1toeP51n3njj-tzc7RpQOsqmDVPmK5kiv6hy-7YULR-lpPng4qD1xRxh_7qB-QgB7VtOFMJBy2nw1ZBRXONKVBiCykO06j9DtMv_BkS7bFRGTUR1D9pKd7bRy-sahKtAM66Bcl6pFIBATJoTUqF_Oj2BKFb496YvKeMRMxLONabNaMCAu_obp6_NhDMlQD-jbOBD6QFIe-YmCSJzNvxhn0z7IUVws-67uvFpbY5t5SBOyYQBKIAQK8cjLR0cqhwcqiLkDTJnaqT8Y6djf_iizLm4vgF0ov8Il94g_QpwTToGLcA1DFhvd4AsvAoVJDcxjG_efrcceKztx81ld6WYhfevkFNWQ1SA4bg77ffBPbuzlXEOhnkbZ9EfyAK9kr5BQay9yTNO9GsyY-s40yLR6di5No71AalYgoeE4fScay-zQ1B47cC1J4fnzB8OP8EaViwyW6SMezdz9B1K_NRB9hknt4D2yoD26n8I2reA8xmMiwXed_IgoFGS0vHmSkEYW17BWk2P-S56dINl6PXIt4G8g4xeHvsfHgPcggVEBTYrpj3k9vGp26BTUpbXtAmMl78lpLVworasz0ZE8B5Z3HBMWNs7qfBOnYWJggyFqm8XMm5zW6Nx8gd7U1rFzemwhylF8FvULP_chIPLf2r9fseTwf19NtjdTVn-lCeDkftAX6f6A9HfE8FAV8i7SIWfX8R1imoLIk4E-4Q-sOGsgDdshKHBBB3h7VT5VHQuxEWprjsmcqQqSEsevoEyCoMy0pp-Yi9MmOjc-Ey1ypsFyzwuprznSfVhUE2UELIJ8EKWxhedcr7nclYqGJIJ3ZfVXLGCq-Oc7RwhQps56nPjx5oCZSbPCtS9UB8GreYgBehFbCkDzrFiecqTHIHY0lwQINEjdbx3OIyDi_I0L8Cf5jEPh6O9OEAX9jqAWArVF13OAYTDhKLldK6gN9PG6_xKFL9An-zG9IpMTqtJNhdRAaELwaNN_gHVA8kHx0SE2AwfszMhdcDOs-ptuZicR8Pjhsy9yK4w8TVIOSuM6PAQikdNEZ_G0AmwWaMvbo2-DMzOP5vCgM4WIJaOxCvS1PfJ1qtZ4053B12qfSAgpBS-emRwAXEG-4aSDQhokanrCHkXoBkyEwoMAiJgNADTOr8Qf0H4zmWeySx6JnUxANVq8FPwFCNfEOo4Z9NX6HGrInQA1X4vpWDG1WBEnEo2dU4OoFFjkgNC08FgkL9GdgHLH1nPsQ8xyuvPSByio7TgHBSaqSFng38E-I539QAZvEb3I_icXWYVarCAq778X6YtbAUOOxjbBKcLrUuJDSnjUpe8I5oFDwMWPHr39u2rlwFdrYJnL1-_e4teaXu9d0T9il7hgDdEfRMQAOD0ItdQHgIZv6csN16FjefzNcXXpXMs6l2MMuBuQNxI0kT4wYnqXBcgpWn5szVuUhsVGVc0A93vbxcUxkvkW3GlbxZk4XBIGaxs1KoA32vedH3EdowOrmN05tm4kc1fOE3sr47N93XsIiuDICPlxgGuAIUYBfd4TUkpCVMkkcXvRF6ivBQdzn2AE_AamrAKNPKJVzHtipYiE-hQgVINaIs8J1jYOIwIob1gzR1cEzbQ6KBWbMou2YTN2JydszN2DbxNUw9YRsCB3xD6wuJ_SOTlADy9pa11-miEz6jfXZLMM8ILQB5K-Ad9CALB3GAz78clF49IySR_0NKXzjfcYuZcAiIBQewNPYXNsCU6ehQq-soWslqcwuE_NT76FX9Ro_9x61JfvjdOZoEUo7XRNL3k-Uci37EpX2bzeXGNfvaeQLyMCq-yoD5uowNGhsCxHzwHGQBzZXxsPSzkv4zqAjvn78eGuHjhxfyvUFxmRe7munRlQzmD03s4KwpgxwZFqUGrGS4wHHb-Hl3BtVQaWpRN1ERZ6eZAH61WEDwAXEZAjJXHGPNKtONdGe7tF3ENAa6AtidrhHJDHTmvqV5lH5hp3wzw1YpYCwwxE5Y2Fr8SbZmeJhZCP_joRf56cv7W-z_3a1_T6DEJ3iAXsyNg43DwpkHkf5bcCX1AYtBE9_BRgW_Si9k2etEgt8L4YFTAoDT0n7eQuEFKNrYMiOFQJn61zHucebQ00Xnh8oOkLsk_mxjcXbDaxc-GhzT2Vgb5Z68HKX4lakHEnpXTsaU_bFHr4O2gTg7sYINg5v99NNxLYSRIKBdePLOcFYvq3MhmMC0CE9lWX1lb9lfYeFzI4UWTAE9E_81TslqJfVIAfITjMrjlxraX2dQzywwL_SdUByVvyrp5Y8eOqusZBUWQBlcXuwZWSRecBKS5mxzn0ujeZsDwb2ruG_AkqLcEsfLnBQHevlk2VFDbRz71ry2b0i56JLVtrVZ6tQr3h8NjhSQoLF3WcJ-RzNFMplw32koAPrKBNcsQQGr735SBw-Omca-Z3ustwCFra6qwyq2B1pThmY0W6IH0NRKaftALUuClX5sa4FmVFgp3CCuYu2pxNTQWsDK6bsgqg5uXINprOQxEJgEecwpWQPhJXDTUVrwBD_nkIK8el1Ki3w1KK2I5s8YcN3denRPFpmnjulYcEk0yVoFvY2CemJMKLOqfyJQ1L1lrRFOQiRdov8FKdy8TS3uXKSwAripwrUCwCa8MUPSojDznQ3bGz_kLdg2T_9pon-Uzcm3ttJyPl_C4pa3VBVWv1QqVYIEsQ5EDxopAIsjDLFfAKHjZ_K_ghbdlRKNoJH9BI2cjwoCXyUTME48IOmMGpN_YofxiXKE4wNf1uvdYJcOojNbpMxe_E_Rwi18YBOPMu5iuGlZ51jZTk5cD5_WWC_eTmcbP2uX4e5v6ppUqyFfKXjjoeLZaZRdo-JWhX-n3Eak8y-cF4Nn-CkhnPi_em-maGjvhcBhhG_HO_jDKvtjESD2BX0dDq_Lena1W3Zm7NufxvB9GM2egYxhS1Fj2z9GYRY3nxy5_PHfe9i44uPgeX0D89i3vCJhfXZh3pIUhCVMJvN6RYFJeXGQQpU0AnvGC4TDpBKPAg0TByTeMS5dLw3N6YbgKtJX9xWRXLrtaz4YFoWKfALuvsI7cW9mwdJRobkYpBsLBZWhnMYc9sohYKyufWukYQeietN6AucpLletrDPkzHIL_n6YisA3eG20jy_9uBoJHA85Ec_lBDVKzjL9AJi-gXBifC0pvqumhacNclcAIeWwWljbwpUG-Yhm9oMYTV7ZayfcksO6rdprtYMGPZQYx4Py4qyhghdebSEYp6JzTuka-zXvylWEAYSWzYkeYIHnAEawt5MDIXbirzUsCz3JdW--B5pxb9fXtMfHUB2axdxcaz5YzuuFkPUzWVwZUdGARbVAxzgllFhuatF77S_bxY169tQj5e6Bm10Psha0Qe0Cy5PPWuyc-k_yvRpkTt3S1Ap4VS5JlIv9MI5OvN_NrFjwsmshCVcDep8h9zS9Jo0li3H1bRQurBMZNFJZEsCK17FhzNRIbhKeJUAmc7-C_cjkrA2YlhPDMsVsKWjFju6xllf9Yp9S5AgfMbbqJbgH0W09haP78znFLwG__B7hL68mA4LMzQMCaQGtfSUWZJBSemSH7isfiFcmQ1UyW_kgC15ECsMoo-0qQd-vmZQIz4aQKPMiBZSwjTmUVxL6OH5NP4ILKhF1qgjyBlBUcuNjD0wnuLO3JqwOgNkC7DQtBUDN9Di5b8BTr80yC_2LjzaqcWay-Y-9VBWQJy9_zxtR1G9so_4H77TFxpMxEkM2jILYoy7_35MrXhteM8A9Y6vkPdrZJ_h4OPTzrutdrF4XjYnvJf2iJSfIfUE5ieNQEbR3pcg3NVYDZYvNxTqzyCkfPs474kxuiIOBZUXNogW8E2Hj-KxhQUJb_bv_-xkOW5EOWh1ZXb9QKXinug3jiVxTG48_fQUvC_ARU0fxETcnfaBN_HuNZLDGMBjCvIuskzhqyYJKyfuNQ2xRTZCvFhJCMckzCYR_wfITq_vss37UjPfTBbTXKOvP7GD0EbjyQrkiK7SMqmB956vON0Cy_31jSnAkXAap6dP3WcJpIkGOkpqDldBpDGpn4cK34TIOFzHUFHC-BmrOlROKeBdl0igYxaK1hLOmNOzis4Eg1V4kPj21OjDUjV7OxEUcFuUx6A_81OcPERdmj26QQ_39j17rctpGl_-9TDLEZbENsQqRk5QKqxYoVO3EUSxlLViaBORqIaEowIYALgLIVklX7Gvt6-yRb3-kLAJJ27EpFRANo3LpPn8t3vjNRUC2PRwklExD7jTipVFGpTifKmK5fUqmUQHYl6oImzQ2EA26g-V_Vl-RX5gL8yjOVIKB-1_UvUO6WwsbkDtM6rz4pYK9EfYuuKy_YKyVuNs8g8RGlurxKg1FH1bJrOI361mA_a6RLlDwCbaF5liFR0WdMscyTBluypPEqt81NfMGFKjTLYEwsmp4XFGdC-Ll2uyii1qh4ogS7to9x89h5kT_klQrgZyaPvhgVgTxjEZeNulCb5wKBAg81AYaOWM0-yEsRJcqi06-XjNSUK6luWzffNtmiJeGBTEk1141qk0Ieslz3EdXIHfOOFkL-zBZ1ipy5Xbg87AsZDYIDjBB9WTMUUhMwTG29ocYN8U4nI583PjX8jIkfFRKa1IJcu4WMHBqh9f3JEm5FikU1re2cLg0txTFXsLdAbvxfobFCyVApQ0cblBoAzZtpRvdA_jv8ENV3LOHOPqDI8rDFUUGn4Vai1SoZLe04K4OI49TAnro2A55HeR0yixYipHueqPIaqIsNJVl6S-0tUCIQWuI_WPIdhzc5OST5N5CHXg3E53L3etRcvNVPvRpBG9KE-1G7ptzMrD6KS_ZRoYPVY89cd6ZUyQQybsR2RcJxQg2wsPEvg27AwNMBnCTPXHdKqXgBa3Ys2t2wSMya3qDIV84zquhIWqhvXRJsRgQuuiMoxh5PaKVUnlde8a3SwYzgG-aVEaDevrFXoJly1s0CbXpFrgJwFHy-hyq6_VQHcKmqkx9dN3n43MlaA3ls3_cnH6Cl6XzmDvAIO8_fofGuW1Xrqg2tBLVdb0t6JQ19eOdtmGfpUsQCnCeEcaDiWnXqDU_4fFgcIOl6wicCQHh8ThWWQcxrtWKm3HrFKfArg4QjIxoux-qOtU7pOg5f6uq93y-qezIplY9qJnQ4U9cfrZ2owPsYRTIgiwfFSZHwiFhRBa_0fWAvgy2yp-6jstGMLSu94_whSjIo1u37RceKBgDvBVtg8NMtcXdAwVGwJAUFbipeqILcQfI1M3W-kKiBtezRddnMnyZFWV1Ft4jH6Vb8iWknYrtJdvdrdCcpXvfw2ZGvv1e3G0Pkiuqp_WY9Li9YaJDE3HmQcbJ4cLgziR7mUXKHECEyXNGi5DFyiZuRhGGLIIBlINCfef6ieqAitPgBF3Iox7VtLkuWhs6ierhxukhIs6Y5Sj17vMNmDRGDWLm4BPZOFlNEbLOJJKWksU06oyKqef6EE5hTd-AovWHmFzJOsLgAy2R-n-aLrOJb10MJRFXRef_dDQqn9ZCrwS9NCq_pXtp0PJrOm_1gSm31XZ8LPWdeo0mTJ5b85DXQpEbiZqd1SrIxfTwaDPjQuoO5OW9OdWf9QqYAYJHz9lW8fRDSAj9nMFkVj7O52Lq8kiaEiz9lc3UzsEbh9XijjxFLmmpzM3Gs52tJE8dO_ILT5Mho4s83WBP4znlvQtKqoy7LRk7gdDNUSLa9UjIKRERzZcp4Zr5ha_FhM69u-KTje6aS45fNKayC_gM28-pgQfZPiv8iae8P1ELsdpPfvSD5g51Rpc06xWeez3USJHV8KRwAJnvTvPgQFbHDp4w4QTBH4RUiA4ZI1Z1xA6J9nyBV6CmUXeEQ-4AzHtq2ce2a1hEXpvfB1XjZGI64GqJZU4ZYQct7FlTiJHqk2q1MsoqAHxCXIy190_wuyRxumoP6iHVQH5IvKhSCvva4CYlCV-rMVqvigtRkJjeLGbdih6jkR0epcV87Csh7xrUuZrS4hjqmXlMN9Sfbk1K1Sknm3sVtKYtHVAzS-QE7Mrrt8qnMBbonL0xeN2kqyLWoEHeermMO8zYTbIsQgVIINJlXkwjhqM-LaKpWNx1poZprx7A9qmM5qgIy9MF4QhjLN6BtsNEjFvHUCOfd6IAHfss_8Bm_HKYoTAA7Sz1aavNhGrbkpjnBWrVvm2ZP5ddV6MpGPfgmqcfWKbVFhufyk4xER0z22Vr5lOss-PaXAKPVZg3Duv4bJWfrGn5FIMM_xiPiYKoPfKkdJd1u4SkKnGAny9zaY7mS1FNxRkGfPn8Smy7JhDfAYsxkoC1Gi2CheNfGQIYlmI9hLT_6jcp9JbQv4tIgV05ngP9U6aPqK-aNh1H4bCwqHoVHY1HwKPx6LLI1fxAhdqtj-C28MkgG_SDqrmaiN-CXNXbuAkSTnyxVW4jtoq2p2FGv9VKEGUPB4zmSd_GzoPZCbdzmVZU_mF0oeMsLb8yvxGV4MO5dYpW6FJfhAL8Px_xcTEfJyyB5izrl52F_vJceX61W-HXMrvYrXfqW6C5cVx1RHF-aIy73K1Uvlw5AUGWOgkjwoM5FQU7OaYcAr3O0eScocLqjbGLv4AjwPdbt3vNbNvV4uVpJwJ-fg7qNjFDGPmP6t-dAVrKIO402h1__he-g2YGqp6zkZ93uIIIbFF8z8uA1VUuovwqURitTa3Ddk3s4ZREH0kSv39ajAALP2uvMLsQtNFVEq0tVAPivlsZKL41ttQMi0Thz7aC_2Lgv5S0pg4XrLqt8HizCPmU8PCRxnAIAPaBNNZ6CRXiAzTUvgYm8Uxi0CUc8ILjwa_el606QjNBs2p_4OAw_-R1ENDwLelx1hJh5y5kw28NzEVEuoU6rxIha3mK-RJQY_YjXOVm3KfFUDb438u7Fxzlzwnfv5stf1vj_-Xrc2vqv__uf_x3vrVjod0bjrudw527hmFzpPs9FH04zXqIiWCESX36UiM-CRHswHrHSdbvdBe32AlYiNBB1CfhiIpdfHze2cHTOu93UG6ozVSbTJ26Uas82G-r7i0XY5wQM_uaID8Y2BrYXrfoef4RHRdH9dQbDOK-9sqzxDHCKwQs-x51MVXjPvL_JFs2GTzzR_B5B9jvRH94dmzSW4V2368Xh3bjXQ5pIeDcWS43WrKskT_iHvIjL53KaFzKYcvP5UUx7un9w-O3e1_KZt0b_fW_I5qJzj5VrKsB9JCbdwXr94T5JEWi3KEiMN8nVTVjMCLe1x-A9oosGKUcECWjUMljwNKHS3-n-ojvo9_fy_dRr3U5qb4c3hxkhD-h5zkfnpN8ukPitBumJGPgHR3up0nBuap3gqpDytyidyYJF_DyP5cskrWThX_508dvN1Yt_Xnn8vejzU10gSb11OE9psRqeHjdywF6LGz-THyt0A9Z1dbHX_C1_yX_lz_mfZt17axb6t-J1c-pY4fbWrs1vA3Xh913x5_D9iXGlsJfiMTytFaqXutS3N_SS8PTvByNkDL3I4I4vZUXEKc6YveY4SR_ae9_90-On3e7fD1yXkTx5aUTHr2uFH9m57D0Xaik7PT4cofDay95z_mvvOX8MB2MrNryAPbEBJwn1bEzHPCIAbPfzJ3bQOPWwsQsh4rVOmqXl8Lg_6qlfQZ-fq8urNtx1n_8i9JK2Z4XSlKopP2BqU5T4nJ93r7y9B9wjNRS86F56-794fEERmEXtMxd6sW5eArzXHFzY0CjrRfskHaWBXcEbB0ViivptSa9ASlXYHw9z38h14jTCmkTO1_BwTOzE4eGY3NXdLg5vrm489yHCBfi1zc0n3j5xcffU5XJ6eyJj9VX2wc2tT6UUDdThez0WbJmUtUaf3Zk8jD9YwS8JcbZaIRcntjr3JUP4ovJzpfvDL61qc0FdN6L-KZA176v8nRXfcLmtEzdYVhs5X3CjazU6AFyuGckw3m3drsNBVJiZmqj0-tpjFHxKsr9lo60e338m6sSznRd7_8lQFJ1gglLwfW8o7w14FnbXvsdGV9ihH2HHhQhJlKkH45OoqBqX8LG9s0_s4KQiNQ_XOtOO42nPOnAWcyBw1JvLfLUF_BNxTlHemo2gGat92TRKYQTWr7DEJ68OCNqOCziWHWbNNwxlAJCISoNlGErXICagTXnBWhjchj1TjaggE8-swWj9LUT1cilTOany4vs0Zf8OgfQd_7umY040nou8leCrsEVPqMiTilv9xBLw3HpL-Q-GQPZQcxiDGlPv5M7K8YZqQ7l2bTYlAniL49ysvAsDe4pFHi4IweSAliRWraVwesSNOOoNApuZWCcSpoDejUrEeg4ViX553PciWze7tPiyvg7pmX1YlpPyPDpn0Ff3_xU678LleN-vZFmh01qPcJzNG66Kp2UsGti5SZfuXpfiW08o_CC95bp_LErXrcISFNqxwA-PyyMWcXI0yCNWNKNtbBnFcXBNTdyKjQTqJb3lqUho_dRB7cvkNk2yu6Hz2_M3eEuJyaawwZZUJLhFmdGS67luqtljTu-TNFa13qZw1BTIm4PI8stJlPmRQehx3VCPXw-8ztdecGb9JA3_6KafpAkLL4iIpThkBQ-RyIWxb-JdDzJbONyJFh_VDgzgFrM-3A8KkFicsUy7TBT-8AfFmaD8DuDlEUSHX65Wzvn31zZzRsMaY5EREta4MWNL2lM_47CT-SqtxbzI2HXrnOcOxhHN6q0p5UTcpNTA1kl-UH6uw2O2YcSbYCiYQQKdgko-058ZVThsSOfiDBaR9hHULl56jCZfgBXS4iQDJiQjPi9gAYBNIBuFL-ybypXDxuQrUEmCRjCJsoPoW3yBnamO8yBFEYk7Uysj--szkLFgUyYiRZ_TvgVl0P31LZgwefsWvuCEtTFbweyTC63_xvwR0qKTum7CJyIyBEhQZnI4Ux4Jvhu3mo0zWJyo6LS9er1AtNcwfJG5UVjVF-iUikOykSZ4HUTeaKnt9BSzr2WprxVRM87ZFU0BTMKwQCNCJsWJ8-r1j3ZaqPSPCgHcpVRiJUh-VvnEa37mBdceR5EOO-caT0wwscmWq8D3_emahDFBKpPn4MBZKuL1lE_EPfEVw6PbEY2Anm7jyhM_Nc73B66je7fk1L-nYNOXefaTKVPXEhvXcd17G6Zr7jNt2F_KqJjcN_eqFg3vcf4Tr_Cewnrmq-IPU02tJ4vAIIIFqBYrjezJKJvc58VNU4qqpkB1hfc5t0vAjF_xD-I3ttwISFJXzT4oYDIZqfcV3HITUgkmNvq48aLhB0mnwfXOyw9bohqlaCmoNTKPdCwGGjhjWlarzJ9URXoGfrFM8TPr31GqfhU_sXugijCwHEgD7RqkeABLfmQfar88_-Dj9sQZB5bXC4qDdvyRqyeFzf3Blx-TSnywYSTe7opABkKPJHYrslOEXEatg8gHpa7ErgTCzxvcmzp6whzf4Y7jocZZqQsz8W89frtaZY_-JJpXi0Keqlf3WmZYOtSFRfay6wine9VVFXLevnl1akQ4Qki72Ns0aYZmT6MwjtAUbliSLIdbDV2qmmpK1WCmrP3mheLaehUDTXiFofkBLOyeIjAuWqTFM_m0mDu7qJ5bDMZ1YBfmsH7eGXnJVEGw5iK-K0Ws09FCKx7FQUyeMcB1RF3cBl591yVdEYKNjBuPsHob-DxuFHisZxLs5aOlAuYFch3oIic6ROmxbTKX9jpbaPsCVVpoiYTfgBDrndhPKqlg-_ghWKtghi4-o0FHoa2hMBgHKnygi3-YVcRYBezTN6KNLKCvWAwWgYmI8GvIJqsVkG8QMhMTV8Od3qhXETs0qZXb0QTVrP5wo3UzLXYUlPzRdeXvrOI5Lyx9Y_EMmZo1zcmI1NnEC1girHTb6PYmUaF_dQNKDQgKESZjtaHQ44v1l4RQE-0n1r0Q3JPlWNE7fZ5j-K4JFzssbMwbwFIaTObt_aB3uG7BthoJiU8qribk3lRvl2totQN27Q2TvopJG0ynIrdsHkJ0NVeKJ5NJjuAASXTZjuOaS7EaBpOhA6jqy48BeLkG7Mzz_I_7rPhBu6ootNLbCraA0Zs_BQv_qXGsCrn0tqMwOHo9zPynE1H4T6SNhWPeqfxpnsaua3Z0D_pUEpGaxbUyZxxsABjXqRRrfE-53J2x6_pHxyKhDjf32bObrc1OZBZTD999t9kF7WmfjyaP-KWNPWVHof1-9Jc4E2xCPplXdfKbJDJpGwPG_FafPSADrW2j24qbllkUTSOmRY3QabtKZki2cypqYaRPWXsBKzCPqRCSVIx3fMd5a-URuKXr2a7zIpYFza7Kp99rY6x5-okAdNkKaOsAM8y0bCtpXwBkVYCxI6sYnd9TNH8EKAY-G1ngI1kgh8yZ3MvJ7Db_SAkVpCMQlQgZSZYXQVXZ2mytowAar-K_z5OMOdzZ2e8I5X3kZCbjkVMVCzBVTqO0lI6ls7FeEZUv6brVI2Zen0oXWKm_5omoGlwgJQdGEc9JqWV15nrxI4voHSjyhdVKuXBuqLgcK0U1YAVKHtWVK5qvVX8h9OtwgjbY_uidZgRK90grigALwuZqFflJbHFjDUh9n9cY_D6fJjKNS6LnKAVr41GyLxGmmRam8FBuavSE3GGSwAONGmEMgWqTqGh5k0wqbadTDGlIG5EH0DXKy48Im33cH8ks-MHbIhkHjy7KgAWmyAHmQ8Ir0ZCelOrBKNeWo6deFERNzAzgOvW6dIjXqdkpdMKoULS6FVzKh7xUoptFzXxROKeLIxZ5ynE-YnTwAS89VRsKLLsHxwKtlKRr6onGgionh4dj8INvdNno0PP4DsyqYoNLGt9WfseuvV4VPqN8E9zDgNBI_JujPnkgRZiB-Iz3OR3KB6DDhBdfgf5XK0jDHa4KIvXgly9-eXF6xRHI-f7Ni-8dr6WPAfARDaWvjCLnnsgUFQE6zcDaYI8BVijhl1dD0QsfhTSsEHEQhY9jKhMh1XBWE-CRp9GtTIPqwiheFkaL1CfaWdZw00gQs3JNnNMk8wjU1fj-v96Ve8zfG3nvyr13e6N35d5XgN19NXC8T88fmpv2UbTcGsWBo4vROjyM8nFAjlgFasso2xvkEfVDh5F6YhHxEl9AVywEYfnmq0PCtTGBAX3T3o6po1FJCmxtfgFF6Az66h_yUfu9Z_jft2bT_HP4ftgffDvev1PwArknBt6_IFOJ9iPHoHhDNowqaklJmhusuAMPVX_cwdHJidx_5rUqzkKLwfNCoTdSdg2uM16O15yyQsICSeh1GR3SWisQ2UZbEQAzTAsw0ESuG8JpBTImno25Yu5FVc3a0a1qxBEOiTBHoW5CoclY9NiixxYi-YOsl0fRY2UPbmLMC2QgigRfkTP6IzLEaTpCTKy5lPjTJE0vsG7CG1NviTw8Gne7SLdAG6Yy5VgUhQJ9lRa5ORGtdm80Cfog0LNnimueK0kC2JYeOHUaf-WnUVm9RKsgYg4aJcAF6pEAWBYx0DbQCF0R88S347krHnmxsbto71bvlhgcgA3oA6BBJRkKMB3oijfA4alfgNtxR9t645piSZlwrhsxC2MD2wp5YQtue6mXbPM1uP5KQU5l7eIv0dDjHRo6TUGL19N5lhu6TSYst_ankiM-lbFpYXbVWidqkh7e5uouoCZUZtmD9kbZoxlxDxW5L_97EaUlQ9XkUQhn1TjQTHntdbphM5nLqx-4Ol8qVg34HtukqeFfPMR6DAd_2OljgMEaWUZZlD5VyaS80Z6FwGkgoB1u8uIiGPj1Ma1mh89lUdLGn-SEafXV3OHwKK53PkTFTCKqis80WRStK5gWR4kStjQvYGk8OUpbCZb0iD_m-V0q_3aqaXxfo1T244GzAYGc5-BPVGnyMKV-85E88kv0JAsofjukkon1QPuDydEhR0oWRr0BiGE6lQoPDaNeDwyCErvGkCRg0UkMrCGF7Qc-Cwpqma-xi1lScTMYP4XQJX2M7gqGUVtkwrkrogzqPx11MA4raB8patGCLgM0z5MUydrTRPnGgnzkJJlCqDtwNubZ00OOalaGQBnEbvjn8WWNht4wc_RcKkg7tulg0ZUiNq1Ukl-pUy4VgzUVKqrbS2rfJPjegPxLUdRUryOpi3B6QB1rakmmeLE9jjCP7bw9OhQPRkopt3XPUVihTlyAv1Tiox4l9pjUt404dCAP1-TpU3UzGnv51nM8h7P0JeQdU1DT1KeBR8i7Ti0FSkrdMkyZunKzt_aadcN0dG09Rs0yU7VPx3EU44ePHGmISUf5HB0hIDryKYpFqWHVoNO2vj5ARz0exeIj054rHj1iw0CsSUVCQ4ulA61TtGomDmzPsW1ClGi4R4PNIkfLnfjIrrlDvATYfsIR5Onl0QN-G9YINNyiQVmvIPTHFgKP2JjRhjrvEsuUlUSNx-bRFT2Vnmbe8JN0B44P76n_viRuZocvG0QEWyQFSuZLbylZckbeJI95w__4f2blAwtADAEA",
        br: "Wz8MMRIhbBwA2LaiQVEEGwcBAv4RoB6KN8aL9o14yFl6RcthHSqShgx75GfBImvmU3i73_QqGoqEb6o5EYYCZynQemAPpJvpqUZRDg8Le1IV9jF92YF0hMY-ySVq7-OqPkWYwzX0Sbaq5BXCf-AHUbCxiv_fq2pfv8Fky2BtyYAobwdTlCrGVTa3jNsTcEk-c_SG-3BBicHJ-uWr-v9_f74MRNkchCqA05mH4S3VtxaSsjjiysaLAnmglZtWubfiZ1Hm-v50BQ2jyURhsWxN2dH1WbbmNbhZtnr1PDKWwWAsI8kGg_QPt8PA85Wpeboaio3pRzxK8CLV5DdaneWUuu90z86qzCanOMxK_Kxq6TS_Bn13SUhK5ziP0LnYM7mfTuYgQJUAinb7-0vfsmodNUbLeeARBLvfuakvpHZrBzkBM03_fyv1M61qAOQs655NOBkASbOHjhxEDkLWvfe9K7xXVT2oV9V90KvVjQZGDVL86gbIGYKiXlU16eom_pwGyD9uArOAnA2SN5D0In3vJCUefcqr_veyZT4_95qKs2zROLVDZ04ihw7tKLMuGXZuQFvc6xtC6r74zv_TrQVGB3uvcfyPv7IsyQn3JSubfd52257GPIQQggGta2-Aui1vgf68A4TDoBBkFEwYMeCIHhscsMMWJ9zhHnvc-Maf31ttPovxq_XGOR3NwXrXj-NHIiehPj17YcM4QNsdfHu3qbzESIUazrEQ249IAo6-ee3N6KqzqktwidxUE2gAhJTkn_XHHBIBsQpKF4EGap-1eQSvxrPg-RHaF7DrWCmZ19jFwavnIywbKiRSm_f183U9gc50lChaCQgvRolwHqcwNnWT5aLZ15rMK079tDzYncn86Ka8buqNkNSOUB9VuSbOnrHrMAd1pSnUQ1iHaKRv8_ON5-fnLvLS9Jv7roVU9i3HN5HLP3YVfwjm7bDyGlzl-xJaMWFHOsRtwxeb3tYRXBKxQDavQ-_U-Pw8IOw6oKGg4P8e38XK603ms16bDUiddZLdHzcWaueJgCy2uS9qBuU0sbWQGgAE9NDTYF0D_O-c7PaQitSZtV0Nfu0DF-sgO_a9TUuFYrUnMFAcyCL9jxVD1TUcskHFG3vT97zsj_64S3sxbsIDVawNqbmPkHNPMS_H5fgSRMYnUfG_Q9RWjOVsZrCG6RsjIzbR_w0_yylBCB4FimXFZiIlYh1SqdWJuiKr13VYbgOu-VXYMqRAdbfuy-Y6EjEpEdvQv4VaaEuQcsbxWaegpUuoLGK8SVg2IvV3IF_YQuwW_CvDpSbTfwFcO-Pbwa3JML5z286uW3vdvDf8pW0SZufZb__d2eDs4ONOwR7EqpngOjvxTw2RsT9G6vybq2YD_23_V_zeR8s0T8osx39cESfhyaTwVaUeLA5j5bH3NHHdVULKIVUMi25r4kqvG9ciDS-q3_p87K6ZZXIdCFgAsl2NJ8XBkeu-1103y4ZpMgpaN_vwrwMg56uCEuBynSJCQtsiKrVrwzRTdNehAddt6uAFIEaRAhTdlRgkQE1T-qyTidRy_0g1TLiUZIIud2MKpGQy7sxDo8VwHZgkLS0ITNb_E9klKPjXVCDez3QRlYTEmUA7G3w8o7fn5-fwkeBFL8JGSLa5T0OpptMnFwjtClZWrt8CHksnvGtWOcL8wmmIPnqQTNKHo8ZEVDi5-JzPcIr7b6ZSw-6_Y1dcf9ohGVHxhLcHfiYHYDbpK27A8C07NiZfDS12nGBJjvtmZQuLIN0efcg-pF1lSMZPfp8kpgEeBOg2enivuWYcvjckdogawbnrwAc4Omm0PxToChC-A0J9p7s6uc7xHcRrpTS4LCJwcPx9VFyVoY4xLvcuubwWd-EEGrsJ9b2WgOThXimnIpwbIBsn17_C-csHRINqW14bs-YiHNXZsvvvZJhxDQCfpGoS2Vbl3xHsgDINQ_K-9j2tqs86DaUadjpQi-GQUwqOo5UxRjdC7lOqD1yQ-UabK332_6hopBg8qhx-H38apMPenKl41Rs6dZVf_foXhEnjFRET3YsWdigL4GQ96wYncmMIeSsNcxaIVcNNSFow5eMokwHO_KhAO9q1InqbCr29kAJIKVCcncnjx23BGbzRG1REEpzYZdTqjRkX_g4SwqTWPiBdSLIYCSVsCqmHVkO8TExvPuNGoCKqomk3Zu9RniY7T_rljZmJquP9VKo4o57KecfB6y4cdNhq9eMbFKIMYcIyX2BT0RyRcwRZTA4p_5I8Uy3voAb17RQ7t1B1FllECN6uofIEpL5khxFE4CEgdT3y_5aAOM8CACMoREv5kiSGGoXpPa1c4vRW07lFMyqmdXwXW0yj0Tws5A2z2Ux4RNNbFpLh1yYxYRo_mwnnIcv2CrslJUNpzc3-MDdZySrW43dFcWIpfLMQnOXofsR1ioUsSs8gJHVvQGl2rFArw48WnZKD-M8coPsA4oUxFk-SlhavmcO7tC12uVaWzQInYiimQ-J3W2R6TzYxxucqBAqyFnsZoNL4_wYEmc0Zy4EpEF7nZ4LSqR-FFPfIzKk6fTBa2zMuItvrWou5QgnumsPGgk4SFqiFf9vs0JNjQn9q2bjrL_76S3SUjv5dkwBO_Pga7XyTQ8RbjJDkYqoe4lnBXhg8ISNGn9Bc8LP0Gz3lyDV8nLsez0pvc5UC6LuoFK3o9_zyd-Iw-JLzMylHZsOlCFu8Lhy76lhMPxaK_IloqiOhztW5CzjkpkatYTz_NueAgOUVXl6JAan8tjhzzRjNXDtoEuez_snnXC7lYi3Thba8Yg2Wnmzh5JGlUHctFsIZqacL4BZgHjRPHcEgk67eb6C5iAMASifwIV9zrRvgMs5DaZldUFyZ4igc4GzNd-6KRtGTMmr4OGZOPfPAQB1FM73R402DB6wMgg4FLuAcyhiQDOupcDS2zYObvqkFUtzWkgr01siMs0COv12ROjyTO0EcAnA6feHNOG5DnU2WOl4ah-QWdjEkQimv1ZBEBAIWZ6mo8XV_QYdOhsA8hIFA-711l3z6agZuY4bkB0jXjj6gizhR8Fj-h6mUB6I6E7fUJgNcS3cxpFsMxCnryCM0PZWm32LE-q1f6gzKRt5Kj5So0Q8Vapkq3WlBU0BrUvsWoBs7LEwzmTPAHl2SELCscDTW6RmqcPmmB5CbtMxidBzbJ-oRa-alpPKHvgr0KOKKqMWxUJ-eNePzxUo5k8yoJsqQAhhmw0S_ZNH4iDm-8QhIQelgW_GYlnZISfIeOSS9ni12GELYoUUiQN8H4ohBAJNi3sVgDEUj4m0ypS1cu7uksEMy2pvQUTBlrBVYDOo4SaDTk1aLu8fugnchyOXwQEyEe8A41h4wlZQinr4M37lV9EytaeJ3q3ggx9RRSgkCFiRzK3UnC3TyedcMyb_SMMnAWpO7d4p7JMoGzX28XyjSMqDjsuKCx_1QprIEHaPwX5n0ehtFjKjeC6d9IaVCGCGE4QXrnU0ySKrc5ZM5s72_UldY8NnrVKwBpDUTLihxD1V8BJhGGIJP_PcALMsrLErkd5A355yx-eKAoJ4QYCqVFdfnVjLLmoqTZJXNmcImjZal9pboNAaDen-XjLu34_PKRUfYqS7nkH_76-BjKkSLQCvbFX9ZatkSq-UmwIHL9wSw2WURs_EDkq7gHRqjJtgTCuQ7t05qBQGJsQyji9K610-IDqMEU2_b24CYQKge9uRz3hnEfHFqd8biv6FtUTJivgANPPmE7hj7gA0nRI0v8a2R2ZtttDgSRyzaQ8nuec2zmUbaNfmY8IN8UG5Jl7I7lfIKUbnCCTHhZCIKnfUlNXgcgHXUmfW5u0ImfsjwIcnwqmbKcN-yoFXDQObAGjwQQCEZkxlPcHRdrfKKZsugaWgbr1BiHZWJ7-t1ompvBUo3EVFEp_kU27Wqz3CSiG0lWt8CXBMDNdw15hPx9tRtKwivgIvaRhxCxqJduy37kDq--5qbA8BWAciUz-bK7La6JzHMR7woUrdKBcx_SwhkmPC_D8KmKJ7lCEZKTShySFA2GEHRmfYO65qy_KywcSMGU3_5uIbRCrEMUUifBvP6UpV6Mjokqw5V0gMVFyRNZQVY06gq6_TOEYRT__fH86RvxroBAyNFrCridOH7ysYGj2QmA4j_LjcfpbYntlSDumEvtQcadfggpSdVY6UmhXQbH9SmolexAKWbp3xcvItvJ8WMlWc6COrlfwSLm_UMRfnYSNQrvd2PVvXa2JtJvvRLjhD9U4Dpnm0igDUAVsGJ0cRHBv-fi12l1TW77nSmB6kCVh9bgURdusPS9HdU2YJj8otV4nZ3LH1UkaNO_bPBVmMrtWw1fSaG6hbL_sedvnMK0Y3UfjnXzfTUB-xyXNaMPKXdn5Ih2N8_VgYjYa-ljqblrZjzpVNXQeBh2Hj67lKFoDVbhO3GDCbO8A9MOEnlW50Y_9RtCAVpAmTSAw1bsfAN4AjSgtwYjQkw5ITyHdUxFVDJ-Ac-U3mQSLGdC7NE47s4-dNQDciaSuz_-5lfSFFpONJMYlyWTpKUZeKtE6AHdfKKCquRDnjCgyDikV7CS1hTJSkDRglgeyQlXlBvCcb1hGR__MSqkx9CxQYs5sAz2YUcILgxJHQVNZEcbHVtPjzsJa3S7NU3yXWV0jd_pNMJs7T-fAyOiSFT3WszSZ5MWc1_IlLznkggeU-kiLyDIAAdyHzZRSHV5Qliy9-9MSnRsLqR5XSMQEQpG_qUO3B-cGs6WoiCgNiM1u-0vdICiIOC4mYqKr-prbUsD4IAn1h8RmAsHpcQhOYH90kSE93QnbyFXvN8EIfy3gdVmorD0waSAtoN9zzc6prOq6iBnFnnkjez2rp6EZW05tzGMHEln74bmRGhAfXA73B9v2J7Qu_92yqwMjIcOFnMmWBnbsii0OeRLYgqDL7_Mh-76A-7nGJREX48Ty_5BZGc7_my1KYB2aevaPATUNYUnve52DfQJwtxwVJf5yUMdFwK-lVoEqAGqIdUuoa_A-qa4aiUoR9RmA7Gm6zslNwAeYP5swsj5fQKWcM-kxAi_e6fV1vsanLkXWn2aiM1s3_WyqiHW6kJjKRexrndf1V7R_H3uRf7P4eAyr6sekWGM_WaZKp0IJBOvlK-kvoTu44udzSP0BR8nSIXM7Pfe2gW_iEh0Vz2TaJq6goD0nHVCyMeyp5AW7QXHeI1R69vHLZfyKc_npmqfuaVRUZqM5ymZfK_1kut1AO_pIkzWMsHWY65ef2OAe9F8W1CiyyrMndQO9TazIXFhAVD8zK-LLiw8BMXYqePY5orAh1yzCELXR_Sop2FYAs2RJMR6SSrhGO7CGwIoFib85hu_sa_bikMmWxlEZoBAcE7pOtsTGtn5TW5gzVknVJb3eZTr3M5J51YdGM5W7kXAX2dsyNS9m207T9ff7fLgBV2IlulxkRq4LO8lRBdWpbwcbdm2TDPm32FU6Az6A9-UguBmt3FaHnCLk5A7cK-I0DSEDNJm7FF9-0Wk18BaxvK3PPuPapxrbtGHfV2aHhE6jGrmw7mE-4AScKYi1cSRiUoEGb3UH4BXwfwZImm_ucjtt1dNJ_1i4u6o1t0C9ddx9S1Zf11eKV6dztngwdH_9R1R7f96F0_Fvex39H647t4v2i7XFT90jhvnb_HbgyEMZ_rrj9p-kPw1QaMZ3iofYn5V32yuOoczbVcpAbNn__8gTHwVyT853BM-ci4NclUKaQLSN4jwRurrmS8v-qowFRTVMhrJ3swIw5ZcawO1oxTDTUQ3qS1OcLyVBo_PGJteisz6THjdQz4V3U4XgN11WzqZIQ4Mp-DFysFx2CuWY5V_3BrAxOWrLlWUSNnXO7J1zcBQmhBlQYZ6SIvOZcvNfiFW4MQUREcFsbL7_0ETf1h_rzpGl26Iph9cPjGbnvuJhB02aSqSag5oP2x-9MPfxagg_Cl3aBB-7HuhfG6n_3g1PfUZ_ZNWNa0z-rarn-9mIZA6SZM0b7GaLdcS_pbIz7g-kg--FIjyXX8BagCpxI9LKI4N8_wh8sNatA1sE_ejgUEVeagKn7Icewb1KNVdktGdrg2YMW-WqH0p_ghBsTX11ES1Cqv1IVT65hnsvo59AujFoXXEIvM1BuNVPlyr7hSV3z5ue1xvAjmrGCW_w1dQ8vGBNGn0gfY0YZmxJI4Z5-35aTr5s-rBu7U9bfT3j9cIfzdTciqvOqT7jFeXIEnJm2_s0JuwwJ4F5AAlcPViqGySv_P8fkdRHia_LYHr8JPzie5Y5tE3rvgWQ3n6smCRU8eahDDna7wmkE2fF5OIs7FIKb3mGfqNfsb-QugVJcR_By7mC-uDK-4UsJKEjg-4VNPQvf0NFN4FV_FK7UBV_3EdwvMq8ZB0yh382xqMiWR7FwjiKs8WGJq_xOa_5l_V7qp3ceHnyZH2Wbg5eT4yqHVWrRaToMIzmC5gKf4uQ3Wv17iOfc_R9cwd8UZLYTJqyFWnc_XK0cDUzrIkmZcGLfJKdYzadO070dlGCGtPCza3aNUdfALKsZTAC7EaNsYN0RDBGxp88iuKeYpJycZwgPHXBfQtIWV2atMXMObe-GwW88v-0gs8XhzfqRGKTpH954N4esyFDa12GNXmsVyBFukLt0VQ6UaRHpn1QBee_MI6aF3X19a0CiK_1Ljthux4ebOcfRnwoHjqk3ZxGZLw2mFj1LrtpUKYo7aw1SMOLceDxjSgku0eqdonSgEMm7Metirmb61aLdl_rf7Jkq64Mlwk6TszBsWX0Q4vWeE96XSmebv6cXr8cmHxrER34P7t8HgbCJGPaY5St-2oFijlIuBB5iNdKxIOWOIWhTth9Yv12Fh13Fv7AdwLnUHBR6S2P5OorLjbtKxMZCXq73SXOuMhqe8UMbbtPy9GnxsHgC08-1OhGlN9ANd47sIV7xxC7Cnps_Fefm8OL-kvEmpMf0T8zvZoMtlQuCANiMVHl5G0Z42bTHxbVyl0n6s_Lxfa7yQtB23X6tKc8BYWOXBSOajTkwj4AY_jAeazTJhjKqg0zEhY7npO4QTdD69yMlRZ8jJvnOdtbjOcQLN7gpAhdl1rPYf368j4IPlFuFdF7lGxvJXo7iIYKIMPBoFHhHTmhATuR_E4BuVe522KbT4GvVoklVgzREtTzwy8lPS9GNyyLea6hEzXA-7Sekn4zAC6BYw17jbiQEvJR9rGQL4JT6FfWU25fm8YVfLRX4J1HWiwTDiFr-wguTriXDJBQfMfF28COqanUS-StFG71PYVLbQZFTZd1phXuiCGK5fB281RftQ9DvWVo6vFKrFd3kYomnCzOGZIsQAhVBj0pQqRJZIkxjq_fCmRgKl25yJ58-V-mbLr4JhkSizsVHT03or7C4ORDKsutqwoHSPJka2LHv-xdCKrYLdO4eu3oWzA56uBxOZgcaTjOJ0ikUD7FPkReX-Ql9KwRjF6BBQJJFpgS05HRYTdCzzNcm1OS0_k3X84unyYiH7UAaQIjZmGy8aoK9b8pdll9XxwPZBls3-mcnrkE1D3FI6MG-yKdsuTQzUArcR2ayHCYyaDpoYBVrtf-RMskKQXTOMri1ts0q5kYSyFsOtFI0djV8wxCnoHCUvHcXGX_N5uVLKK4y31PK0ZS0s15Gn5aM7tdTFFG_006wXtW3X26xkebiYnyP3U6CCtxr0TZo67VlMuUFLNe5Wrq2sdWHPPZw8TpsaZY7RqEiVXqytlgOY5is-sraoZTvXaXmzzYN0mxgeCtRow291FqogDmMyPGGANgQaYvWio_PXU1DLirzlQ0JaEXavx8ght8RUN7NwKa7SJ7E1tro-1lRp4b5jUlNkGMX4ak78A4fx27IIlRrA8GqvA45n_F0cVOTdcpGz4INwWLwfX_xnZrmAsvzN2LfVrD_1xYc-t36yzbvcw9Xxoc1njU-GgZXPdp67wLEZRzshDVmkG5Ixzs5emJwM0vF-NXrcQxOoDXeTsm29uQflUKkUDGKOJH-I7vkJAR8nD_5hfOxP1HazRFIxfVJGOOJ9VIlnL3UmMsXd7OTseCwDcqHHi00lrBHRjSkLBhklIAVeJGyOhKPWiFA4mMYiIrTkwyc8W_1v3l1cqdEe0eSyR7718BxqRiTjFyNqBrporPOomFkFA7e-s5aygIA66xdlMuQC2iiOHFiSAtZoljis4xZv6lkN1zvkaraWrhZKVPCwwoWbPBc_5jbZ0RIDsOjjIqHJPOgn4XqVM46xHavStumtwrzBfKtcsO3MBC0FSvvdkHj-Pt2LhbAJiAA3PnSksu_xjZwus_ELURbk07aH3iEPRyHhFlN0-WsB4Y_QD9-B5_0CmQtrNs5jrkchl4lQnBsh2wUp6OsQiMZ_tLc5y3CykGcvOtmW29Rip0tt6m3IbhuCAtaV1IiFBFKHioj9pHYDqkLXlfNDaQ_2qEtvHiG3bJUrKDcpoe7BgpNseQjrUT8p_JD0OHMICgiX1VhmFR1PQfJGMAmKby3hG0ya0luYqScWuzOFIRn1AhZQ5F6rD6K1CIbad5Gds_FsLdg5XBKopDar6zaIEqoUvdzJslsSphYCcIgKEagdnVWizBEEhfErU08j-xLW8JLx24GM8y7r0GGwGrhrOMphdD1QR39N2zCcK4Gu8so7yqMcRt9sE71kspu6M23Y3Jz9ht-tVDWsiIJ862Jq8AhwGLZQpzP0vK8-9tLS8RrAo4_Yb_GkTZ7yYwpccOsF8mkqX6dEHcpMBIlf2ImJin6GBzEOcJB2-AsB4ehxSZ_T2lGD3GfSgEsGON8IoNiWO3NqSjbXXleEfemdrvf5mGyDH0D3Ncm45SQYoPnNnvgpqUjhTLCztIHOAZ69AdOue3KpeEtJC3reCSJgohS6HhfUd6GqK7_d9vgQb8YCGHaBTlV1kWJLJewgY6FDNCMQKwChxaRW8ssubFgG3lWcIwLJpOkhqfJFariGqYf44-tjqj9T6bcruJaQ-9NCyDuN75ipb_URwM9dku7L85XEnEZlWopKXHGsb0f-HqqGMawfRjjGteIsp8VA6jqIc2G3jKGAOsZqut4ykLA9JvpIdEmOphHnMD5MM7ugD2YxIjlWYtH756GFE4ueKlmxyiHsJJJOSIbD2rjfNVwJ81giXOH8XDjIYyFwRkBERupV8zXTlXC5fFvrQ0aOm_X7-_FOf25fPwxvBYYyX6OVbmxA1KRwOytsndOEOB-auGTWL_G_k6O2JIP5w8vm8lG-2vzX135HtlSqbHGH64SoY2jQ2CJf7cNkteL7M1mcW5MJc_Kpe2jQa818SvthluW3rM_sTFihkS0wbPU6Xc2TX8xS8ppxHpBDkpBigulZzklItaYoGS5w1K4-SGXZVQjRsu6YlpXM8DpZykTsCJhkgSYbKBtph06x81OttOeI580z_Z2PrAmRlcLx2iEFMAZvRbF9QYW49eWYiRYJd2TXPZ1njFTmR9O5iDmMhYi2YGbNpgrKfSCEYYK2ZHNy-JUBlYC8UfWJ_vgIg1QL0EfEchySOvSWrW6i0pWytNMRaojWHo7wbEG7rSJa0HqvENota0-ZQvUe4OELfGp3zqZhpw10glMRZo5gObsGm5lAvcSG_vvqj3yy7MbvyzyihYvh0tRvluX8AWPDsMCcv1Xd9f8WFlPvm8KNYnygca_abP1LWlEam2ODe_M8X59tds6-9re3eVT6UXs5GN795-OpW-885yEHyfufy3vqfp139JP79K_VDo3H5fd305PJU3q2WC3iV8vL1VFP_5_1SxyNrKnmDp96vN61-O3cV9weeSuGeAMfe3Y0tT2Fsdk69ocdf9Xp3dwt2oSfx2bTEgUtTkQpqoUAtTDmrAD4TAlxDZef6FOhLquziVIXyRd7qr9ZmEddpxYSqIaIsRQLERbqaN5RP_t8DmpiRSHnnPfxvFzgtWm7L5Y3iYIWpc3G1V9_7wbRwooDUNO7kOa-l4yo1kTm5VUHzRJBRTjAzVo529QtgN_IN-Xj2NTRFHRNLmBCodn77Ohd506dqGzDRlb7OIOewhrUocwwebQzpo1vHiZqekV5RO5GeY8bTGGMjh4NKtWk97JsfCYEEJp8TZn7Vqeh2gcFZdY3RK9-RB6iI0WHKHx0HtWOhGI5YSM_8ufLn-fmJ9E371dfUAhWkfCn0CoIO1rLQ4z-9h9-Qs3-4J5TAZIhtGlpW6xRyyNBakCUDl1gWAa9cgQO1GMbvR4_RLsOoBfKitdXneLRKBgz4y2RhO-jh1HTAX_blLeKCf-gOn3MeQmsP2omFklwYo8tD0PTO37EU8zQsrAf-7fY9Z7rwOhHQC_u_yfE2ObKvEh_zepW5ZJ7yb67-Rm00YtHXKc1PaEbmkq4rttxZ3qVsF7IpQWVueh5eRYrMhbHJEiCcpIQhJJvvJPSPFknirX8z7mQd0dzbIsowMLI1SLhie_D_pkPcmF-iRc8J45RM2D97cV3zqLFS4fc-x_F_m_gz3TNR_mvstviLoZr7R_OQGhhJU6zFMta9tn0Gh0d1ZaWJT38YzjC2-4pdu7asav3R3t7MT8t-9NtwtjDv5BG63UfwjNPmRjaI7mEtgsJK44MyO_rKe9JIyeLoydpfGRTNshzgWvDio8PgV0jHtSOcMHvX5r2Eou165P9h7gq3JnTcd7p07OFY5kKFFhRFir4TDUc_Pi4-cplUlgdEEj9e5H0KughqG8eQsItC0pDvs48birSjSfhuSDhd2nnDZ_48zHlsbjOP4Ir0bHfGWv2fRad25X_xhNUxB8HWd34yKI10-hD2riwqRQ3LYa4t5_NjV3R-u_-zrquJN_yqY0J8jnXw7JWMXfZ_XY2CFepVSp1eKvSdasDMbEHjnOr2xQl_YNiaOMUAppntSOL5zcqHDhJfDzSOAylWUSvv8Sksp_JILqnOuEjZvlwkh50HJewqphODSw3LFvvWOBWBI7qOTnjII8J5k5porHUTksOTIpyefTCjl5YZCtYMhDZvam_uhiyPCDe_cOgaTp-j8zCZBV4tERG8YiYCYbNtPTLy0GTcswAYa09sB2DtUktEU4kSckjbWkv6FKM--F1Enj1x4PwiAMvC7kfbr6doKDC32cGCfor4_FD-mAAez-wJkMAjMqBzE6G2hnZaVix-gNrlSHQtjzZ_wQRR0gB6AAE4z12Lq8pOKLB6BhUIuth5XqjrNxLJfC4vBibgWLEO3P7dfzwKpsZGH68oad-hlF94W-D-LX1r4J483M66VeNuKdQKj2eON3Hwivu5MUqty38WQt8aAvhFh26Km50a_2UkWX-K1ysLmFVqa37deZdquyv8HK1YDW2BbnwG15-SCX6bn6eDOTSPXfDUqSn5Ojv0G35l26YlwyfBgq3k0AUKp4XR8S6B1qXq2ztv13ycvUvXbdvSpnO_P-GnxDknvFPFizGXxufAScmc-Fhex-m9N0h9SsZ1IGPCenBf7S5Vr-arcrg3rd83q9q48Q17oZ8nPv2i12doXvc56s6BJ1kQS266jsPjPbxb9rHFfDdJpht84ezmCuQv1Sc_IOTSbccSp6Qa-0nI1lzj_lrbwTr2nkuuVzB4HBk0u-tIbuv_3vS9PDziE4-m5NK011tnOp3OmKDHjvkgVG802TYO11yyXAFTky94wt3IEQSqKIvyfovi7WH62sWbJr-UenrebTxTxmrOoJTr5bXPs6lDY4lyWrsS0ljohHSCDOxlHdIr9if6N7d9Cs9tFJyP09pXQe1ypVqiu3Bkp6FtE5Bm-w6yfgyJnvtZtbjjQ37MzPc7BujZb3XGC2L_NMXCWE36UHkEBYHSNSlrXY9VJOQLGh8-sQ813CPed9sV9JIE14H5_O5-8pZV0W-gxgtCuHm3zlA63Z3jblBD87UTiYEIx7NAx7M5JoxBVQuG6cur2VasS_96ZPOQ2EUe8pweJ9rRL1u6XM8FS5J5AlMPbkQOybtH0NJ6geoWblgJRVv1Kd-DoI5_MrlmCJoQuRNon8v6HOPorUPpbVS0V4Y6AsuX7FY4mn7WeNreNwf4naee7t82nOYLK4GUJfiQpO9M39a6MNrAN6JbXpF-FsXOyLRn57JWJIrUFTAdEWfAG2z9uuyVkbXzbRs-5aQogPsRzw04y9-gcZA6Cij2bSYCF3Sf598FV4YOnQIJDtp3qdnAKSt7c3_vx_799iY9qzue-i7PNMNbHdtv9h-POgRUZC_5yTD1h907g7vA6GauP3ZTueP08_-_1H6I9zUF-a9OGed6R_ef2n_DwIODuO6npdfABAWUG6vo92fWur2ps7F-qITNzV0kWHQPwpnSa5MzLYsIOtizd8DyG9VIjJMidermT4aff_JiB1M1p5N0axTSGF9GzsQp5GJAiUdjIx9z3oIK-kdFKgmsUXIR8Zu30PWQGY92Q1ESKq-SbCvk0nXBBAHXg98P_yB1uXR_rt_YKJ9tJdXqtSpryfdiOYmgdpQ91RITa6ZmaAQtHILPbzvsKRhq8ZYQOp137vNCg_cvnt4_b0lKL98tP58nJLk1skxSi_H1_WvRgWPu9MukX-C7yZjwzWjHQmznaRVHhNdjJEhpw0f3hn9vjTUbAYQVE8Ht9y3NuC7vS4rfd9v2V0gZQxH3M6kky5-4gDfh4r-V3_QCSpKM2-5_PXsiCPr2sMoV7VtkdglrLHTvyrArjZFAIsqRypSdmc40t8XQkDJ-dit_zxD1DVaIzDFboV8G9bznhpE00mazUvcZwQbI6vnGRb_6LIeT8nMB3vhzm4ToGae8XtQ4T9xDpmBP05B7UQ-OcJRRkm8ILV-UyQlX0FJxOFUdouZBsAnoq1Bjd2kAqoTMLr6vI_b4f8LAmJS4iUxBBHr_HwGjGR86GrdfHAu-Nr5hr6CgGfBBucCyKPcX5jL5fw8-0PvfxLr7irqvSBQf3pb7u_7Xi50LHvGMFXsNhDnKjLBgJoUNb14ppgLbAQw5gqDAChYImb4HtyQU6wAGpnnNkr7wZeb9Js68einU3XVUc6dC1NSnX0RJ8l4gN-hNDYiqMWeVu4w8-gtIYy6lh5G9xpKRQPaw3tXPYWUH033zvVmBDUlu0V4sjoD-uUu-J9OVoG6Gqz1jYbSyvYyPxi8CT-lU-4C9aTm3kPhG656gWbRNp7M_zRHfa11HbuYTX0zGpGo3Pky0tej5xkz_V3mh_GnGeMHnF6bE9z3yMZS2T8f1HgN2YNLr3g6azex4YIHsIW64vA39wrjVhuViPYpOMF_Mik4MCavjXggWCJC8SXKo7wmF7h04X768WG7dZfTns4rYGNvZbjefKybb4D6IRNiXd9ookFXAQ8uSuHTGIye5Gz-sIvdl1I70Ves8GCofkmr3egQPzxAcY3Z2OKTTkklddyMVV5h9EnPovqgvIaFmnBm7AX9YcG5Eu84cx1rBS29HMeZUmk2Ty7JaSCtU7BmzP8D7_52hQb1OYY2XIcldeDoyIsQ5RxRDY5hqHGSSS24Vxz3rF-QAPRWo1FMlajB0mOSXLbmPSQaDUF3NVR7EWsbM35nvYY1YeP-ujAsJ036vFY8zVfuS5s_2B3kZvOZwqO49bhhWdU93TAPzq5t3MF2DVyh4gRovmBj3dg66nueG7rbHMaKVBzgJ1Wl0vIL4Ep12EK69XO7-6DEck5l3a8azkUl_67lRRQ8j4Yn3WxxhWCC6qpooo0IHu6zAelT4B_mgcimS9qtKCHUI300ak2p3sgOt5ley36gXhvueLgbiae7m3KmUdJQcea5V7NS0uns0qFLK_WX3RrT8WRqMTTw8HT-nrnuEWg3r_5OGUCcMA99gxGmtg3tENspqOk-BS2MUWMelQbYXumBylSXqiWlnLPdeRG_13RNKcRaUUUFZnX1mY32GAQX1mzIqAqzku8USwAEid2LEO2NQ3Kd2-adoXPfKscNDOc6P8R7K5d0v0fuY91piN9B0bi9v6KBwIHdlJdNr7HY1f0FxjmHCIRJ0h-iPqZnSNVfxIMQdUkAAIeiIJwEQYtb2cBdM96ouK0TXQewEt6cVSDxZaY8KmJx4dh-s-MODAE-5vktLRXSHka2e7B-2m-Fp6jmX42n5HCWGY54_pN9MMjlpGg9UubcVFS2xf3HhpbhamK4EIkjGCje5IWLVhnR5do6VRtHiPoxMpFIrm8_2oidemQkCTMlqhx0elYHQ3_f_NGEpUuJPxeB5zWvVgUHz7H0BKQ6VGHhq7bMxXmRe1iQbls1T2mvb_IZEl_jdJ9iLNxvtGU82AHMNsEZi5Hi6tVXAWddr9eeF6kUhATmIJsVeAODFc7NM5MCh9D11AvcgoCpoJ9i7HFWgu6_KowpsUbneOQKBLNSO8e_rz0xxtJ_DWHn8739gx-Ojk-uT__6fXb-8s_F5dX1-vbu_iG5feyl_afnwcvr8G2Ujd_zYrooJ_vH5-xrWWEeuapvvl57GmwyI3ceXe0Dc9PuviPSaKZKNwaSkoNMpEBhRgXy5fiH1FeK0-j4eXuj3JvBfE_MQLV_qr4DytCQhWH6_Py2bt2xjaPE620eDS-mTz_dj002bBCKJ0H0Q20oWrSE1ACLXQ72wiHo15iSC-NbzhiaGeQcIppGe_5dr-WPUbT_JbgJeclvpAVy5IajN0ZVW7lZf-1qdPzc6qOrYxF4dBzH9sYbTP1Vnp8_8K5mOMDjE4BimOpf0JfeFfWh3e2AaX8Uaj_qP6D6xj8O54U1Uy2Rej21udZK7etnJz8v-Dt1-6v9LL4cgCGup1a6QzVRUL1-llC3_0lMzxOw8Crr6bKsjsTTDF2R6Hg-10tF85vkfz6j2lP1ae0ShByZhscX2Yru3JHrK_9wfkW03-IfhNTjL3apwvpVNmA1aBFmZeZV2PaUbFYPG4arkc9A4aliTFJQYZTM0xGDTgp6XI95zjAMUrIvJBN3OtUq4omNl8yU0iUUzX7N9F95JO7hCaql9RfY02z_JOKKh-mRR9jJuztOLonlM8hxOAc0xtCOfS8hN_vBEjxK3eEUuun2LtSgSgkjAzXtebqIpY4ztWtiZJoCYJincQL5DmK0WViAj-54BAkHaQXCGsD-cBzDvcMRxHYRDTx0_ElyxLdVFhZn8cQ9oQzTd6nYlDMF9u7E-s_n589NbzqsfAcF8VVojWzPz3q0tyhBWzaX5p2_3Pc2rX4zqy8vS7efVcmR21KxgJ3MyyRk_HJlMMqSl-Ik2-ZtzrRpfCn_Bv8ehr9np6S_ea_lia-ELp-B3EWUWEVa-M1bkPf3Mf7v7-LbWFgWc8R755aApkBS_cUuUwnYRwtgmbKUOKVu3VRlRhYwqUFI_vg2_ROyqF1YjFwlM72LKiRF0iWjZ90fEqEQCnIiKyHzFjLgPV9b2jSyOXcT1lGrnajKzSi_ZExez_KPtDhahGn0XU-YkQEghnmYeiYZtaYuwzpRaxUKta9dLsR1y-T6z64ZFn9c_vP5aVNDy4edAx1HC4fWOqeByNMDHI_lZ9MyjRbRFrxZHl_hRVCH9PqBgX8_rKVDUNPJ9aW_OfO3ev89L3M7tjdC3bMdYKbxJ_D39bJNk9xFScv1nIhICmvXFUrwC8dlayTUGDDQcveH5wmABDaabm8ktKiYTVsHr2124SiDv9vHZJtQ6JipnSc3wy-RKzUL5XOMGe3dmkB1RzRS1Po56TGm_7O34PRbF0o5JY1VUvkFuWbb4uQjFU6o6BT8hV0e4zTl2bnE-yHBj5ekTVy1xORXeFCRPRa4KIi2Wf5QINcV7IxiQ_YJMD7Qq13wS9WLv_Esh2ScBzxgNIVWaUIlkfZsvBcrWaTJJ9HS1ZWt5Y-5eDhQ0mtOR7Go-iqwan_5uifW1huP2XVbwTea87_HYJWFupngHFoyr3PqaM9drAiZGK2Ce_RNJHrt7H6L6u_O4V85fh-nq57IQtnTTpQkwrXZAHVy8f_Ckiw83ll4c4rHOEW3ucL74fbWpAT4YPJHn_G-21lJL_NXtrGfxhpGumFJPerzizd91m4mXQpaXXPKJCQEc74Zi446Bq0VKL71RlN0spg7a20G0sNKMHuytBKIAqerI0xCCfumz9NE1SZVyapE9sM62peMMwP_H8faNATYpS0R4_U3H2HSJmwBBpRoggEGFcv6wW1JRG_Lm5w-kh9-SbbJ7liEf8-IuuCjmtlmLGwz0Lj1yUfhp3BfKi9K8ZhKVrEXtGVNb9I6avmg1CHWxffJVoyIau82z-wx2L_tMl4XAze0M-vjrmnVkew_XFYztf7eRd8EEh3dfIFVhnxEp1nbjfMBKnjnii6OXss3pZ36mQ6gIZzV9hvnNt5QgPE_9JfeUbqFHI-i-qfJ_ftEDf-Fqassx2mkdqqdQIrK3R7bTjanx4XpThEWA3bbbqJtMR3TECVQwzFzI7tj3bPLrFxwiw89s-lW3FLaUbN7jpDDcNLH9TtJudd2Jm0hzoJBKR-EzaNVGYeDMApugb0_JDVaqN9BTY2xmWV8biqzPAra3atm5F6EBYCXRPWM3SXmlAA7sSclvr7MrdbF-liadH25-5dFl9Yvcf_ylC9rLe1fkmIa4682KJ52lSw_8jG6QbKYLv5OK1ctKAhWLvZ4nj7GQn0eFyWUa717YrJl8tq7wMvXgl_ShWTj4SxyW-DldcEvQaXhYxlbmJd4pYjjE-ImvyfkTX6Prxvbv6TOxiV9Jh6gclvwy-jCvARfm4SWGt-W-Nm0JM6m5TLIRzqo_n6saO_ytcDLNd9-AkSttwVeVtncEizpS2xJF1kN24jydsEaHMnORIqdgGdqu3P9VjxJFIMl0kOaAFFzEYKhsMEBLQ27k2WgMrfwOHFxQ0FIsW2XQU10NrvfBwmAytdVXiu61qJ3bVCfHMUKVVgwHueIz8vNSBXO03Go6WcjjDSDmTpMtX-FFzx4kw-M31vQqNBqDojF2SqmHnSCVxuhVGRoF1EoQRfBh_6imYvGs_VYcbGqdEpdzN7m1Eep0XcaZlGX-LZK68MiiYNJSymaAlmadKNgSNaR1e6IaCUTwuNBMe_80k2nyjDVHiM8bKTU_HGMRVSpSumI3qvCIqftQASdWwba4YprVmys_vnnc_JWl2UcVUuqnTS6TV--fObKKve5hz1A4zUAEyMGsbYpB9Qh8EQIrBFoSlzTEdwmirrxBa3D4RBbDG_c_ZraChVYcfCaQkMM3yRZubqw3dRIcDoiOL0x2XCTgAmUrYV7X-7yixHR-wu6L6bYJGx4z_MB8TY8d4b9uN0il4XgbtjUoFu3TLSExiwXswuLCjV0Pxr8gt5_ui9TIwcWqDCLrsavSd9HYbSmHbVGCRh4hVT9OXqEwBdKMJUfB3KOGJg0lJJeQjB0wzs_reT-z-e3skFyRyYtmhBOFccKUmeRj05OUKu0MstNU56DTHMqkcIN8G846sg0vAeeRd-e5kqlTxCHI07KISyrtFAufTmly_58vyjO3ToFeItebVpiuNls-1ldBktdugVP6GwcI419k84EN_aipgneq8ucl0zLPm2PdIlek0qGXB_f6LhYa4Q5oXkzioP5bVmsSek0uqqoKurm5CHAnXwSciaFqWDgvEGdWfSFcx8D9xdSlcQBZi2TQVGvrvZ6aUQ-Bq2m1MYHql-tM93HHy-5WMTXgSFRK4cJbq3z_xc8NuK43XpAEI6oR7-Pt__Q5kG1k9qFkvYD7VPAjvW-QFk1NOZjx3yKaOmsC2xHrxzbRkw5wUrmj3jI07Ic9GfGWIWUACFGMUrMjj9nlfYphMG178U0rmnLYiSylLos6QGDmf1N2QjraXAQdw6boqqynKR4utqM5nvqSLagFqlhd-xBt888_1nUHyIKXIuZ4W0SvchWBBVnpKb5Nw3lkRxnOhIK0kMgCFJsaBecnaxd8TppOTQifLijA86_65FrP5WmKRLuBUFCZ6LPoQIlEKNCRQWM0U_FDxas9Xl-DvKIfdpzqrksn8U792El_eUpKA6BQPKk6WX-DjUJoUEYH5mB_Ar3hPmcriuGa_bsiBmbr-Y1gJckVovRMJM9AfR3CNeaPY8GdYAl_O8U0sqLVRvqfYIyp1O17ik7m9nWgcNUSEoRPGgoFkSmcBT6tBtpkARRp-SILX7XGvQjk9aQHb3Mwlxd0mDXaYKiFoB3OrxVA60uXyZo5OIbgyqLu5NRtoFmeZHCNgKgnH4CWFd5ubRmD-UhZIdM_1n1einEIPGBsTmtKVfUM1oNDMeJ8k_9Uis54AGxAWLiVVHyWvEHNE8El_0tMwkY-GyQVPXcwOCDkct3j48zSs1fBARtYspPRLHtUJRQZpoUHE-4fhkSw4jIK51NXZOmVauTbaoouP36-9fdETGFeIIf5mR8SWJfUntxeiHm0a01HtPt3Y067HD6X1ftW5Fn0oPVTRQPrsf2afZRRSmnuyNshoxG5vj-wXtkDL4nBm7UnmchA6dRbwteqeX9o3i2dz1jHwXeTGPr-gWjg5hkxVvLwQby6TupVbZPR0TSnw-xvOQNPY3K7rhcJEo60JssKpbMjq1YV-q-DPRBed_w8Z_wdMjdFqFJCq229xNykjAb_UN7PuIL7LSQbJAs3QT4m4Dfm4u6FZv2aT8clzdeHhGP_-iBQG3tGp5g3yPszwqi33hHWTDywNAFC4JtebZnMcfdxp8_UKcGJXQoLpStqv_6QxChilJOfeftzRUfQhthZYDffr89-ZkTCL7afqYg5n_U0-Fsczj4SfB3IJyRQAxI4Wl-kj88by_bf-vKF69mTw3TM0Ru-TuLOAepiXLiJfYG-03Yk5acied8UXT-X1c-U8C9xjJRYAAWvIf2wdhMC7SczMrChgRG8wAVT-RzDUo8wE8laGrdQuLbUGHcahpXia123dmP5o7Jlai4JJ6haVW70YUo6BcHJ_NsCCTd-Z_XZ7QDtSBt3i568Ys1ZTtAfx1eCEFUdq8tDZ0TuyeP-SPCv6yil9RXB_tkXmo2UA6cr6rWifSuZmgv9HK_SJvvEh_IJ7EOV0IMLU_2UA_nxaauGpOoExOq_GJDCZNxTzMkxH_2F8zyhutl2rEXZQ6VJp4Ez7t_6us5boP6BB_wVXzXOHZ86ObbzmLjYWqduTSORUZbfbuu9JUU5t1BkMuHil_1Nipb74yPr5wUuaQW-GhM9gW7WM0OKDht5_a_q-TteHtpuzXe5CXs12qvSq3dCHCDCIwkh8HEWqatOBF2jKxpQkwIhw3SxVM1RH2uVR40neWFlEsaLWtHR2PtaTQKH-1Kkx3Hjjzq1c7d_IOx-_qRyP_qZTonUT7agnqwvMkF3rcJNnpFa22lhmV-YE9RWrV1k_OsU7WDaxgAK52Hb1hJxYtWr1wu7Jj9GbW6tuKkXhUZwAlV29zasV74mlmAUQqTUmAVprGBjnQcjKaiujdyIH6A3HROIE6Q_OJ03kuvTyE86Jyrofb1Yn94MrmSUYNxlPpAz4Yb3u6lx_Yjfi_brpQyS1aAv3etXyn_YOuh9jd8XtzgQvuXMhmw0AaUw6MHWqCmR4BHyVOMJts33v4PIDVqGm24xNTYMNPJu8YeokqFBcVS3BS2mfinY4jmWvZTeE1nK1BNDNOKMlRgdkyWW40Hqa3XG75TJQA6zGd2nNABY90z_Cxzm3LjbTWL7dgoJVKribYI26GtHsG_tao5--jnPjvHxRO7eqhu0Kq3waMqlfva6oQZz7-mFpy1ZzTHLk3yspsmpcG2OtUeZ3AeLHMiMGbeV1LSHFr4gZN4WcMX1DrT4DGjfY-Ooc879Ynejsp0IOWEWAd10gcNEpI3Y--sunmypeYTGcQb664ZyztCVKzZOW-HWn0rg9BF-SvWD3L70DQUtij22U3yjoSaTQf4icOpEOcsOyF-QnG2wvJdjp7XF2mXiccKu7krJp3VAEJD6LBArkQPOBGPoiKu1hIbNR06idkrcZM9qX4Qkhm9A6hdgdYIYnoMBh7eWEruETxmDqtuOMgcjRx09nz2bDjUgz74rB2L82KRyA06AdRo5K4bX_X4MXrr5r9_KHblxGmc_90GPNhITwKB0mFFwR0PyewUcne4zlyJ9fnwkOeF1CG-B6SuTgqbd0rTY71cLcpbcuJmx3zezQ4LJ4UikVjFKsQ4XAfb4dCRZDA0a8v1Mq1VTm_L-9dS8yhbsAlOyNNkk0mzsqAtYodqIY9phPMM_d37Q9K7AhBvuTAs32VTJYx81e4hkPOcaJ59_jRtPAJKOahN5lnTDn4EmNHAsnsBEQ03HWNrQEjS3FrbH41zSH94cj7xR4t1wC8w3_ci4alQg3DAdbuFx7-KZkY_PPvI4lyctjzOiwjbG2saQz8DCOmoSk0GGBLEln6ADaGlBiDaaKZXAPzbnleKBKTlsqTi4VyPBoS1G6sGYAuKPBdTlSb9mSIt31SK0GovLmJjVZGL1SEdKdQkWlsJ6TFuDXNC0bmEsa1J7S61kyaKRa_wRM6kEPRRqN0M6WbP6I24Gsae8sB2q4JcRIQ5J7_I4gQdfylkd4KrYYoAm4azzpQeRa8xGwxz0qFPWUNACy5gua720tx9z84f0RodUrQJLBsf5BjOlw-8O8lgLMjLgCGf6aeQpI9W0bieLDH0CFOo-HZCi5ps1-BkLrs98x3VjgHhKKPYcgw2FRObN2DhjZy0y5TsLiSEywpC7Uap0IMmeHmUL2uvSl05O1cLJzs-GePMWWczZPtOUHPPvjEfpMX-dpVGgNomn4bbfHu3i8niy2y7_h4wA0XI_5DWv_yotNlpmy8tEyC2pxeBJRCdp7ajiGzSLzaE-Q6BJaUJPdodqNKnRXFb1NhgABsVRVJLantqqJX7GciuWLUsz4DxerNxRq4tzyl-gUXXcukcfFkcaDt-O8s4e5XijIMtkziKEfOQtWnwrWhzyQahNJtnWQquqUrleAGLoYlTHPIA2kH16BUKRopCAkyqWSIgW-Cg7YqD1CkdCH2pwhKEvZESALoqj-QSdQ4OTeuO7GT-LEMrQlE5mTnGKUsbH7Hq7mNUBjRXCiv4uFAQyOxS-xKFaxCwY8Lk0UuhlwBNI8TwBmPB24JNwGdnKrvuWiUUq60e5SGzuU0RWbMgrIkqDCUsKSPWz5Ge9S9plewloH-ZZyaSHVMvp74kMd_MJqXgG2P-0RiSw0LanqF4Fa5BLjbDtkwYZY0tj3zPPO2lo3KQDAsTTvkhtFE95bbHLC8ChZntFWYOArjqxlmgV2HSp16SbzZornJwg1pkktFG6Wl270kNtMQCy_h05tIVHF2ezffGF6HARDm2_aLUEMD3HfdJPpJP52EN5b-gH50KIcWw13ojo5APL-5XLkFGHOK4bR3QLmIrD1pZUIFMKLr0SlHm8xxWEz60OU-wzBTKSi5rGIKz_-cnCzWumSmdyCouZSVwqU6oRRpmMjLowvnVopVh1wTw4Oa3-VN3nO8bWvFBLYbrPBIGchdZqeZsZ1J9BChLUqCVBD1RD0nKR15JJ0uxO9QDsHiPfYQzwLhhGPQpR-LSkFAVVqOEaz0CgwvnLKoLkM5EzWtlOUSi-wPaCwt9xyySYdOkrCmy5u2d04V2hKQMQW0J-rkuQreVj1-rJyMPIY1NquyFzI4mmkIkKzZHwG9B-jRU4bF0hqwI_VwvPhFASC_Oi2dHbZ5iaUd9JfZhqv9mddymVKL76HhEPVy6jGUiIQgkpUFjPlpAPsThcFtSaI-5qmKEEGiM8bVv5Jposw5tTL4v6_k5owact2lpnMvLmfCUloFe7riuncFtx3AiWz-EXTGxpRNUcLwFyaJI9ibnT_dJpvqHG41I_TDy2Ktd5OvUmfTRp3TeU4izk8VOjAGcDSWvzxi_az2jYNIKXYy5Sjak1AXnOGGSptbTBM8QPtBcFCdoH6g9_0z9WQYnxGVCujaeikncDkmcuc6DYmP6TJXDAfj3dFwD6MEIX02NuRxxf3odDcpYqzydmPhLlwxKqK7cwRoW9WFP0k3UAvXU45PcWWV5H5hMLQj7hn3KTQMww_HfFPcYbMd50BuFzPD7Bu7MxCN4QYQ2mCqySHc-LCAQptAObx3zFLw1z5rkgMUC0W9xcvg9S1MKNj7rnDpE0hhiMnpC074fTbR5dO6bUCLd0-DN_jFTn80glZnDqWMwGo-Ovp-UcWTnHTmD-TfoG81kOL4V08O3Xg8i_oVVT9OvQUk8RGpF2lUY6IZ-U-kg4i_i3rGwDhfZWDrMNzbVTybW69ssNOoRV9ms85x90k0fMsCM3NHHh02ntACFWWLzEaJzH74s90UpKOpzI14WUhlqGUVgsc7YUOP_W6XaSyx-tI6FI9qoa1W1eAtK-oY9E8ZS7vgIR0knExgWBFMdqaQ-EifFLbCvJ0vixtTQ1MCG3MlFAWd_ToHZ1ghdJ7QXU8qIcilE7NALZeDOacGIeVdXl0CRk0G_mulai6QbjqVOowCFiqL40vEel8K74VgWmb2BD4ZONyp7hVelfa8YIXOdXfDsPcomGVtRUrbNWQnEtF4ehQAUa33s8uOvfOiYiBIIGStkRz3rDCzzS-fgk6cNbGo1RpXqYb6MJDIcMjvPb9WUrtDTnJs_jQ0j2zZoN702OfpK3ni4y6YRKaFoBFFAAcRRAgPpRHcGC-AEwoFUdaz5cZhec0Az-ctmcfJ1ef-lbBiL9_nxx3LMK9LVxm9VBPrJn2YcNNJ7amwNuMf0bXzfPrS6xUwSFb_0kFDQc-n4i1BphYCHoTWBsVZm6c08qlPFp2Mr2rYGGGavxMhLUIM_rWGC6MYfSCppwVVDJuxMUFStxpcw7gPwvz22IXKLbYRSiEhQehTBx3OtCjgyrb-3_17Xbc__8uj54v1w9_DMRf2LkEzhC3m0kmpZoMAnfBrPbcu2wCc62A5W_SKxHPWtwOnrjf2gdy4qiXvkjA9lTDyz2TiPYU2-mq5GJB3XdiEW0wYEDpsv3z7828tHZzF5CSBOfej056YVF8Th8VI3R6a3FGfvGrWh9EDtjWwkym-Q0dMw6oOrtpWgCn1GtE0J9HjYob4lLcj8OZNAN_0q463Lz9duT3upR6lOsHzTLRn7XhlEOB-nvoHqm3kY5y6SPbg0Qvx5SsoOIsjXroorJdHNdULVxlcRsSvyL0DiF0wK3TlPEV13SbF0wLZptq4usCDBHfTf7DRfEgpLG39qEAKmeDqzj_fx0W-fHF7mhxmcs4N3CcpmFkld3SCrFv25DFSWYQUOvfgKC0-jG-JnjwrhFwVcjQgANtRAMCdcyojPZtZklJif83UYf_c106vzLv1PkYWF9wt6gvh7LBh1H3z8AFPlL4gDLaZpOUZqAbA62la7GqhYGSbscHrVfzqISCxNhVNL4dOlrdt_2brcGDnteYT_UQyn2aKhqqAYZBMkeFU8SeB6fPcvZHWfgLcgwo41_MdY12VX-1OVQfJId_6E3xmHw18NsCY2yGgPZkwh3sm0_hLAOo38Gn4TF2UyowoQjouGU4ktaQosntOJIt-CVOqBu2r_ZSXD8s0HpUhYE2LObcB2XTF2i8YQqNn6ba7tyCHc0BL0tEjJVvQUGzu8B_Ul903uypCLHRARXAWkmMMcM6ISSLmK6IRXPrApoMa3Qbtt7LxtDSHRgAUhkJkWsxMQsWbV8NQMENEItWLneCAJx6wDRxN_P1GaVa8mppWBXz4AndsPm56Sv8U--CjKFAnme1ZUbkCo8mLyJNzGx-e6FmJXgXGJM31GLfFbdzp4Zkp9KrTKYCb2eHmam3tMo2t-AbfuhaukQS7I6scvN4RmryqmkI4gi93agV1n4Lx2AaS1Z11--QqUdyMXSPgpFS5tOpAa9TF_PXyyCqEv9NxxLURDuAqgwfmQGd1Flgkr7uYlTjE-XzwT015ll4DSxYYEb7gmB2ejNdi9m4LhtBJNqY_0Aytldp0q81d_wfdqDDyvCII7tE9n8SfXv-fB84weElNOteQ0-RQymXzZXGubMxXWtCBDa0DAJ_FDaEa2M-yPL8tXNNA5_lWKoueHRa_gD4IAWkow0KAMJpAY8bbERNJjOX3GFxRq4KIzvcI4JabCPD9Kd5LnM1CPqaPizhoZ-tjMHHqhABhOhNMXPtwkfCVWOVn9SEFzSQOcxJ877_hEsK6rqzoTXNEQX6lxR5KWN7_AKoqzJuYyq0knFc22eTOcFM93dMet5rTTGxP9X5LJHgCJBgVLvIGUsqtS3pABlN4O41qbQjWFpQPc1HsUtJn_U1Valj0CcnFCq1vI6zGv8avQfkHJPRuw1xnDu36GwLW5wYwIZeaEDrr3T0nvUUdGavppX3XxbrlSMBNkSD6kUqk0PK7r5joT-kLpgabXuzjCfKNsq-AUZENJptTxU5A1JiDB9vLkQfAi2b1DKLDeQLqtmQmDuj2zyYDX_il5PB0q9J1ZYCnhk-orbwxhoq1vDMb9UT73jrJHnOwoQFJvojihZ1lhBLdk7rdpsRZvwLWn_CK9s7RIbqhrdj4lOQbfSO4f8ANFMKqi9NKQaX9nE2pwz4HKHVTKuuNhqZu-gwQc6-iYhZ6reiYtTV3dpPtIHNi45Y4rTwgI7y3QMG_RSYes9bxMt5vFlqrMvfq7ciIjBtQO8DouCL4lPMH5rJ_8ENe-IM1O17ALLhVEROtEvzUPNlHN7zzI1A5lGB0PKgC2v8dgWsw9zoyC8PNO4sH8myoR8NJan6wFLh-TqWreDkn5tkJs-nBg7ElvwvWexZd_FnKvLkvI79hWOrytKHSfL_a_Io5gn4srErKBSIfrTtwEmUwNz8K6hrxtrryyuVcnfJEfJO9WtPdLqk2lZpN1du7sTRRi44APoJSvs_v1YULLhjcPLT3nSklxL7ojme-HqnchYahLvodWzJ3dStIwiJTvEgnnp7gj1KSFXjV8ywl-SjDGQWRd_H_BnfxTyEJRtcy_nhmXGUtvnfOGUhgKYu72r9Jzo5A-LZ9PayWem0s4TqIxZu9OtDdCplHCF1M9IJffgmx_Tq6rhOHLPeJGBjKl_Dp3Gcu9MqNC9gnhCtCLzS7k0QUmslD1YCPgRaQUK_HhBthi6_VsVvJ47ZRK841AwqrQOCQxwnJcrYv60g7IuBM1dzHwzrfIFNHTukdYbEvQEHZ0FaoRpUfTQjqyXJtg1ZxkUhC0RdC5jZQvXtNv04KX7PEyZAzJYJUV3aMnHYTGNqAZuwPRIir2Nf72Iz5epuJK79uZdQKbvcXBCbPquO47gRfRL4TOikfeqSdgSnOydx96lmUzDVfOgT3TDVwPCOzROhUp3E1uIoJJqUZIUGMBkp07BokRD3OpROh3FP7vfMZoRwmpqtuLmsVQY-qfAJdv_JIDcuDQeps4NLkObFDVToHmRTUD7f573brXXYo2rmxRQWZrV9zJqJrUVY3j4Q6tCAQ3V8ucLAHyqCiwVkWFCL8VYSOMTfqm88pMwGVqVwkksfi-KfEHrblOnkyyFfZEAgKZPkXqm67v1jDKS7XClJxxzrv03Bp1qTEn1woKXZO6etNuGBF01NDjBoV5SdGXPOE0m6kedVkK9_BmLAMBrJ7ocYgHk96oRdXuMKW9tCWXzt3WUAkowJPg1IEsLyHd1EUp5tCJ12ySOloz9oimb1rSHI99Ei5KcAsR8ca78pZafXj9HvcNJl2OruDrFVan-oI2B7270TedhwVz0nlFbMmp--FB74opMysNAGAZQ_XAySz4Oe-IcUqfi43YSBqjv9Hr3c2mVZR_Z2NhjUWtNoXjnUa3OIgYoa_01B1zNuBlebsHetnlJnRrNs0Ii5Wi8xhtE55OpKStN4Z1Y-CZDgWoVx2xaFbYSzKQx4YzCq0x1mpafJPdNWmwyWbbq63pM8F9OKKkcFsyWkOJ4LR3pO6qIxqVbzVlYEXnpSeIrMZ1PnIuaw4j4WHic1rgTHnTmJrYCjgkoDqt_8IbZxW2zah8C-EGcQwUHhixZRlFCCRGfgt82zTx5-hNcKN-7md_ZJvCIiSRIYuVbAnSbMBRuem0z57C8OuMQMOjKzn6eCSU5rEVO1OIhi2vywlH0Z-YzUZot1PQF4O45LK_ea1JrjrrkfWLpT1pBc0UKSDS3Tgl8layeb4RlBqRhqY2UCDccqQMenUyirGjGmeU7LwnM8aVaWqPNaPf0K8uDN2KHtYUe8oST2d42UT8Mk2TYy_PzCSR0rEhLlIJOc3JwZZIlIKR9tQuK5M14XBH2EPrSJ4mZWBHgLCtgoiw_XgehYiOR6V63Ko4jy2VMHCFvQGfXbaV0IlpQ5M2yGpURRGs4Q-IGdz4I5DbFGHJKmKNTgUaRe-cIpUme7w-QZHA-FkTZqKfUbJhsy-QCfpbnOBs34ZyE3qDGFAx6OJxf-h2oDOltY_j7XkxomNPRp2UXYHTpqiRvorwNDxMVKWyBkJ6svSU4rg4-8KHk6_667Aw4jFYSBY8Bib2YuKzlmlVD2kzHW9fRMtDWsU2jO0hQsEg3gqMZtLJXWewxDHZY7bMGBtVwdpSClF5BAbOGK3qLNpmy6R7x4vQe1hCKP_qaxfTeLQFt0b6lFICfAW7422nNwsCB2PZ7yMHgls7bNHIwcizI7_VO56c68Tv1Gc96RbRcvupVzg8MMKGh5jwHO7giuk3g1Acmr468fruNXou_wvwaaEVLFmuhxR411cZdiOpJ1Cnjb19ZAPM0v8inMrsCXeWWYSBpyUT2pjcCh1IzaA01ny8yKcQvOwUqEDLFoZD7V3wm0tw-imEmzj7GSwnUgAQN6ACVPyEqjvIa9Kk3GNSKI2e0U2242QN07T0ZLA_2bEvX80W1-yBl3rQIJaIBiswgz_5yQ8cTT9rj6qx2L0HOZMD8po4l7CJE8MSBCuG067UN5RpripP-l0G2l3Wkq4eZ4yFe72fyjdGtLABYOSZE3z__HUoJLvQPaVjI_Z8Arvnk1hhX8zAePlJ3jCTkF7YMLHVsN2IxGq8BENTEizxg7ZDcx_7utPaBbGNPw0M2W7WeW4kA6SJVZcf39CwmuHNNF7pRJhOyaMsnWUXZtNs-y3z0NYpHDBK_ww6Ez0eLnWn8t60ZNn90Zog4GALS8KDWX3gPSuuDi4AcL3M0ei0e0aniZt59zYe6AUqURA3vrHn4CG5WrfgQp_hnN3CQ-Zh6Jf-vnHmD1xWZbxNOlBOuLmfIuUJy54ewaw1IcomBGozTki5M7F2ahnsOKYroBnZq-JowO94D1aHdjYWA__HVux1wKBudxos_00t9MEaH1XpfkIfrOhIORG9Mc5upiiS5bXfGZAmg8YZUr_gRmryKUCGvJ84I_LFgaYtllA35BDFcGlldVT1ggdPi1GXQPafBNSbJGncVLbw8gBnCNoOQy6_ni7ZwgiRP6DIDJoSGM8KVeiuQq1r6hSPrewgQXIElsOi0F4aMh8qLedN5QPBDI3T44eJQyelfQtYgBA0gnRZLTm7SUZRZaH7Y_8Tp2uJheyJswgVlDkC-bO6uQqlLgP667ie0m9SFQRedBwTRugScNwLxkgUAZ0q-QFnIYYw9CjsySalC8wY4rvWbbktEocbMZ39xHcRRvHn7oI7_C1BLqBHWhyff_u-1cwhYfyeglfOc2KsfhffFyi7TctLgWfzt1jwhL9NoTG7VwZhq8dpVHzosY-GE2SKmAmfswqYTD6GFg84nKAt-Pj5Za1ZSIfJ0hwcAkvWl6ooGZybB6W59ZqyK63rG64GfpwmT_Q_G2FsJiaK4u1PtNe0X_UR5MlCKkOmG-MNWmBIT2NdTZ2MOIL90d-bC3CjirscjYDOU9edPw9Y7R2TFtK35S11dULo1D2tO2XPs-AN_txf3AuQwq72Fk7GrbfK5Nk6cMOUhdxrO8jqpi77fP-i5SrKf7Vturk_YviGN-5iHH-vqVZu6lLrLD7gOTc2Hd71-rEz_qQYOGxbbyrdurDhjyVhf4skL-KZdH1dad24vyMuHHzi6E7_MB87h6LGB8qrbTbzSK_qoB7Vz0xO81gndhrnj-LGs6rqGreyUcdKWUaIhH_eEb3Ngu5_Vj44NRciCOq1wLU1N-ANAss4e9Y-FYziPoDxTaLNS2wCE2Ia1k7pBKZ3IOLOUATYJqIOZ6iCOy7a_7CfeSu1A79iBK-zelxgRtNjqiZAlxP-pBd-A3tha3gK6SjZjdQPkEJoeZIeNddSmvKO0sVV6ZhyNls8tKjHmMCMeRGDMCMisWnGRLm2WMdaYfPa6VYTwLR1zXzs9nr7QLV-8zkltl9MrYRUVZivbJg6RukB65osHr6FFFZ70HXdzfcv9as7n9dD5Zmf_U9jKtq5afrF3YnLLeZLe0-3uNObRlahOlVwIVUDkXd17EOqqoOWNSLCrlci5Bc5ejn9500FTGzf4VG11Woa-9MjeRb5z9r_bD9uDUxe5OCLbx65HeNg9cWhWgxJnHqSf-D1qSGDzBZjOGrM9Ij4x01vhvg4Dif3pDboSj-r3UD7pVs2ddsaBmDd7cB3buuPs6kiXpG0GWPT4pRseiwyk36-_yobJAFgqP2ozdL5-5qvz5eTbnxkT403rK51V2zYoLGPQuYVsyx7sxPTXAx4hPFGCrheZb443DIZS_sc3JsJeXD_eO68dIjCKnO3tFUvnc1jJrVmnURk_bn9qY3bmipNqFf9bO09Hue2lVP42C7o_PHHfA4xrk6LCJ5nQ_qf0xdcTheFmToX12W7-pmNV0yS0BECoGKFNVuvtnlgtWft8pQ9g1VNqZkD8X7PHr-d_uBLv_XXuk-__VDcGPsx-3ABV35bP8d_1o6_8XMUf21-_tmi6RM_tFt31agKfmD3_Sit9ffu6g26LTp7te-C2MBTp9YZ5ZkGhfaf2_h_9KheLdWqz4QyJfyh-Pj1vcymVV_8bavO_v5X26I_SOMPx899-dw8unYUHcMa8SStpZRzqX_Qs_jiuCe5ML54kQD1ZeOsEnFdLLS1bhqfe4HUweewYEdRrZUXCya94ais7rI3jhR_4nOfL39wIBfaxzk8-p2HH3AahSlMcPPDaeIM0L5W0sM-hsqK-7WfP9mtUUhprAk3PNy2tFFQEFNatcRlO9I1Gi6iSkhEuOtT7F7Xmmh-ByOpGm4AJR7T1Gj5LwHoqD7AyfmjLjE4QxOXnKXkz8O41tEoJe3wEy3OWrTqk9HTXAyUo_3pN0JFpWDb0O7eeVNqUv4HRBAKf662xuI-nhk0MrLQuT9iK2gXZ4t5IEZY-Iq9eZkaGCIIN-8jBa3MmUkZtrqalAGot_9-NGfW1r2-jDzdGuZgvjEzKt_YJwT_5gZ8NooWaGH4o20d7sRg5DsGv2JY4E7aJ3npjIrVcu3FnRrNpJQRVMx_4t5GHWHtsBR7cY5VugINulPHKMAoWpile6pjuo_tY6aKwz50XQUER1gwnsNIO8suaG1OjzGBuibkQ6mJc3i42X2aBi0k2-ZOI8NckNxLcMk7H5ZtEX1qsX2nxlckmQPF6UKI5XFRRVZ8uRLAAT-mQPl9Df4wqFbB3hs8oIHWLOBXBQWj1oxKGMRrTa1S-zqTJLbSKW7yD5Tqwh_2dEeGBn1EEAKaZydakwm_aSiDrocAC0L6F8ZWw9f3dhRHHLOgGdaT-6FqJuHmolFFohluw9_t_P5B0Bmw2GpLHBgCT8MCTacH4s-ZPgqBYMdnrdT0Mb-tWzeGJG6U2lhxYxixQQBs8M4xH3EbLrP0ematXEbRsa41xHR9Q61DxcB25_K8HS7i6Npw-7uLoHWdzqjgAZfZTF2S73GdaXvqyInf2z_Xpk50jfQ-KYjHx2QUyyTgQ9FOw3XV0mO4gpXYMNLMWxo13Din5g6tcaRwPvFCx7zgVN-dNySTz50zQ-sQywkKhJTY81MGNiEcxI19UKnGABTh5KepI8dK7dlv17NnMBJx2MdP5TSjz_JAuMcKZ6NZ5SsRLiNzZghp3rMyaQlzdna2aoQEhnWA4RZ_vw_rOmyxxY48i7JZuSQ0EcFNzS9cDu0SetNPUVwDBvNSUOxPNgSoMLtCEjHXDJ90r-w6UFIbp9hyS6mQ0piuMNHnDCE6UNfb1yS9SktSGI3zT2vHT66YwlkLId5wZVmhTt113khvxu36Dd2RKN9wkEukCMcS41qzDSmhpxBBggaNKgAVfUThHe_tIvvBbRqhZh9YlURGPXY_BQ-MRyGu9nQk7amCO_4K0X7sqx-WYe9-EmsGc1kjKowqYUsfDz7cvDv58Shr0BSQ7bQwzihaEqPLA_k46YpYo9XkOzvUWjuvWeAC3GE2dYGMaJWruospaod3zOi5o1kMUN3qfBzUY3Uf0PhwA4AP7yQ607eAfb0bcLpu6D76gtybRLfaIV0P1dn7WR300Fqj7TehGqi4NOpXD70b2pNHFl76omyHDr9p6M0qWuwZlLRA67FOSUrKvrEO4rR8qAZet8cb7_mCrEFJtM62h8Yn497GWcvc4gIIhv1ASmZkR7XXZPDmay-M1-JaTeEBd0MbrGara5FnpOqjKs1xX-bD033aRBrN4hnL8G1bObZDSFwbAVMED-KYwAnokXvY_MvW4MUaV-Lz3oPw1TFIH6GFfre6Pwfxii8p3BNgHSIa-DTzvIi3tD17pWtEOBS5ZuIb-Xqy6G_y8qDhbTrQpWx_RetfH-K20jyNBadIQkrGv0O0wzfLEP2xLFH71nslTCkIZwgKajiUEzQybjMh4WGhLxXZVLE1pbAASG4MiJuB1nVvZgr4li41_hhzwsWwddRkHJB7TlMxtgd3e5TaMOs9pIyYgqUq8txpYo15g_edgx3NwDj9oEAGNwDZZwmAYjbrEkR8vSwcvdBGvDGcKkRDX9gZYruKpdjyqg5yxC7NqmsD72O4BZwDFRMgLMvWGGuZou7jxn5GphmCAQ0hHqXX9EtLgxRv4bkmEZ7CR75nuKOFQjRdMWhSe8rW9hr7SpMWNHFv39G3Qee6jWDGJtBjGHpkAvQ7zTBZ9BA6-dOOIfE9osBJOJ7q6wpMBEps0vZVI2ohlW-16SSPC0-g8vbCOJN6BcIg_5Snehh1QYVNmhXtP1_RxMpbFL0mk6w-7g3IpZigZAxKuZ7uHVKRHRWlmUtEubObuOvzb7qcOo2qy-PSLJ4o-i-lbRoX1RUBAwRYqo9jLJedK0RUGGWWvKFWOT-YKALQ23D_sAT5diY3BlyAqvepnswUn_TTsEv6ScrwvDKrxaefzeNCBXHbVLWYrY1hL6Sdr0Tn6yqgvzHXXRoVFNYC2EKU48PGKc_aNWaaP906tTRzP9tg70lbVOdR72P6b79-8F7-ZmX4bkVjn0qmRI5Yeo10E3hSPnaxrAlwF1lM8-BjHqe_2nTSMvrphwgVk1SJctJR3ARt6i6VG7dmyY6iQBLGvjKJLSnF1UNE0CXPrJ9QAd11k63Htc5jDjOMt8O6wxbwwKXVZ6ZmS1i2g2ET9xURreJyJJcN2uE3SP0hUrGJnFp2rVvOxTXCqv4hAgj5xZLZh2kjIKet7D08EiBJ0vCik_LtTiz_kAX4dsHdQazCOww7UlLIaWDLq2nuc9ZZdBHiZ5WkBxKNwFOEsOL0Mmv2etePSDwQAYZ4VzCO6ig9xTiSKxySe7OiVhwlsNsEojegnRyvHg2f2DJyBJU82xxi7eGO2Wj1fiPOktimNfYjiY5DRkaclJdsCwZQysxWPWLvvDWCDXzCwrjUkLHb-g8qqtX4_tJcbaFDZDGvO37232Sr6Twy37EK9ajn1JQ4lR8wOhVcKqJ5kfm2Stvumg1G8Gb21fB1ba8RChVi0qhP0rqKYOXuwlH27IsyZxQA1Ku-oSTgubEw4FwYjcdgkdqLrdsDTS6-egJdLlp8HrqrsdZ-O0oRb5UowhX1-L4Xtq05irsc6WndYiT1_cvjivJjmAwOQaP2VdtQQPKD7ep5oUTMA1cgYQ8fP8NhIX52u5hsnOwLn4c0EXeMQnsiy8pTLrQ67asDazXC5ik5vqanI0EZYng04o6-UWGhJE2ZwBxxcTebPGcVo9LC9CfUEBYop-CIO_D3uBD08I2LY7is4K9bxPmfGodf7syzcLKCpxHzEOZPDg6FEPwehMtIc41JMh8mch3CJiFc2gGPnXysNuk4rRSj4GAi-mDStewGt0IyEA_Vz_YByjDeQkzCMEjdEh3Di9LL4K0Sfz_hzidt8_bz8XCFYvCDsBhbvtBL0h8odySdt0tibIkTNTOlvdGsnuVdw-Pz83npJVxnYwgzNOqF_2g1gn9IjD4VRiA5bAU_LRXIbTlZRgFkUt3lSlt-HdKikmsKrDHm97tRGFdcGqPgIiHeUZCUf75vGQPPMD2eTX1Qg0eeYWxgZN4YAHvqkTTGl91mIoQzyn2XSelFV8DzBeXxtsrVLO7pWCrnzaQ9LeLUI2P1VWWU7TK9DwS8PNawBNPrXFtKE0DdEonHmsqvrldBQR3u0STOgSmlqYjHCT4nKrQ2RsJaFAeO0_TbRfEI17KMU_wmmvgBlcbF3W-UNeB6A7h4tLWWTUqn_p7o4RWAvrYR0iDbSE4IIbEVh012tS2PSOCRMlFY233SQyv9hUaIDvmP51pmPNsw0tfOmyAx-qxNRrVrsOYYYFuc7bSWkMtCHSTwGaTGpEKPs1hi-1Vxu7q3VdB9RG0ZdTW3WNkLYgM-jbPDAPDKIpz6yaSA1HJkLn1a5aUndc6nWCLoQBcmmGVLpO-sL3MxE1nrIrD0Zu3cDJSeBnsFFLyMAuuXVPWD4qQicySEMzSHWizGzMGk0y7lX2mEE5N42HH1ggYJF4ib0oMLoHxWT8rkh5LyKCVLJtEhwBYgdDto7UqD5qQRBvNhaIgo-oese76GiN0Nz0RJJ0yoDSjsWVwo-QMf11zqkkSfQcIqgsbWR7ZfZ245o4ng7qxQkM71i3HikgodB5IZN0GW_alil7Uxgnz5pawymTFGdGZXZwHYQi6zw_OVV4AYmSKMkLOIivVxNfq-uTGTyHcW2v8M6ORek86MOBWYx4K8pC-0sY_XxuxARgrxlWk_Tru1bO-Io7cXXiObDyulsL4JeV22l7XnxQt4Z9g6JiMsahdgilcaHPzgAhOfHuFDVklgRvhRBom4N09rzuLiEbbNHD5gXYuxHKL6wcKf5st5zRLD5Iie52A7So8P0rv1iNJUolmDYukxTakD9pT6ghoHqJXGcpgSnqVnnkkOT_epvjbQJoC_7qwenlKXS2-ScgTc3C72YFGl9AGDj_A590pm93Z5ug8iudIqs9rtUUkeRCGGoNbjzwV95n2By8fMJlQgFnHpxYOJnk4mZyQT"
    },
    debug: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,y,m,w,k,S,T,x;function j(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var C=(e,t=e=>Error(e))=>{throw ea(e=e2(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ed(e)&&ed(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},U=(e,t,...r)=>e===t||0<r.length&&r.some(t=>U(e,t)),F=(e,t)=>null!=e?e:C(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),q=(e,t=!0,r)=>{try{return e()}catch(e){return ep(t)?eu(e=t(e))?C(e):e:et(t)?console.error(t?C(e):e):t}finally{null!=r&&r()}};class z extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),j(this,\"_action\",void 0),j(this,\"_result\",void 0),this._action=e}}var R=e=>new z(async()=>e2(e)),P=async(e,t=!0,r)=>{try{return await e2(e)}catch(e){if(!et(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,B=e=>!!e,D=e=>e===K,J=void 0,L=Number.MAX_SAFE_INTEGER,V=!1,K=!0,H=()=>{},G=e=>e,X=e=>null!=e,Z=Symbol.iterator,Y=Symbol.asyncIterator,Q=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:J,ee=(e,t)=>ep(t)?e!==J?t(e):J:(null==e?void 0:e[t])!==J?e:J,et=e=>\"boolean\"==typeof e,er=Q(et,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||J))),en=e=>e!==V,ei=e=>\"number\"==typeof e,ea=e=>\"string\"==typeof e,el=Q(ea,e=>null==e?void 0:e.toString()),eo=Array.isArray,eu=e=>e instanceof Error,es=(e,t=!1)=>null==e?J:!t&&eo(e)?e:eh(e)?[...e]:[e],ed=e=>e&&\"object\"==typeof e,ev=e=>(null==e?void 0:e.constructor)===Object,ec=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ef=e=>\"symbol\"==typeof e,ep=e=>\"function\"==typeof e,eh=(e,t=!1)=>!(null==e||!e[Z]||\"string\"==typeof e&&!t),eg=e=>e instanceof Map,ey=e=>e instanceof Set,em=(e,t)=>null==e?J:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,eb=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ew=e=>ea(e)&&(eb(e,\"{\",\"}\")||eb(e,\"[\",\"]\")),ek=!1,eS=e=>(ek=!0,e),eT=e=>null==e?J:ep(e)?e:t=>t[e],ex=(e,t,r)=>(null!=t?t:r)!==J?(e=eT(e),null==t&&(t=0),null==r&&(r=L),(n,i)=>t--?J:r--?e?e(n,i):n:r):e,eI=e=>null==e?void 0:e.filter(X),eA=(e,t,r,n)=>null==e?[]:!t&&eo(e)?eI(e):e[Z]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),ek){ek=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===J?t:ex(t,r,n)):ed(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),ek){ek=!1;break}}}(e,ex(t,r,n)):eA(ep(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eE=(e,t,r,n)=>eA(e,t,r,n),eN=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Z]||n&&ed(t))for(var a of i?eA(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eA(e,t,i,a),r+1,n,!1),eO=(e,t,r,n)=>{if(t=eT(t),eo(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!ek;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return ek=!1,a}return null!=e?es(eE(e,t,r,n)):J},e$=(e,t,r,n)=>null!=e?new Set([...eE(e,t,r,n)]):J,e_=(e,t,r=1,n=!1,i,a)=>es(eN(e,t,r,n,i,a)),ej=(...e)=>{var t;return eq(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...es(e))),t},eC=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,ek)){ek=!1;break}return i},eM=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,ek)){ek=!1;break}return r},eU=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,ek){ek=!1;break}return r},eF=(e,t,r,n)=>{var i;if(null!=e){if(eo(e))return eC(e,t,r,n);if(r===J){if(e[Z])return eM(e,t);if(\"object\"==typeof e)return eU(e,t)}for(var a of eA(e,t,r,n))null!=a&&(i=a);return i}},eq=eF,ez=async(e,t,r,n)=>{var i,a;if(null==e)return J;for(a of eE(e,t,r,n))if(null!=(a=await a)&&(i=a),ek){ek=!1;break}return i},eR=(e,t)=>{if(null==e)return J;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eP=(e,t,r)=>{var n,i,a;return null==e?J:et(t)||r?(a={},eq(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>eq(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eR(eO(e,t?(e,r)=>ee(t(e,r),1):e=>ee(e,1)))},eW=(e,t,r,n,i)=>{var l=()=>ep(r)?r():r;return null!=(e=eF(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eB=(e,t,r,n)=>eO(e,(e,r)=>e&&null!=t&&t(e,r)?e:J,r,n),eD=(e,t)=>{var r,n;if(null==e)return J;if(!t){if(null!=(r=null!=(n=e.length)?n:e.size))return r;if(!e[Z])return Object.keys(e).length}return r=0,null!=(n=eF(e,t?(e,n)=>t(e,n)?++r:r:()=>++r))?n:0},eJ=(e,...t)=>null==e?J:ei(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ei(i)&&e<i?i:e,J,t[2],t[3]),eV=(e,t,r,n)=>{var i;return null==e?J:ev(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:B))?i:eF(e,t?(e,r)=>!!t(e,r)&&eS(!0):()=>eS(!0),r,n))&&i},eK=(e,t=e=>e)=>{var r;return null!=(r=es(e))&&r.sort((e,r)=>t(e)-t(r)),e},eH=(e,t,r)=>(e.constructor===Object||eo(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eG=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=ep(r)?r():r)&&eH(e,t,n),n},eX=(e,...t)=>(eq(t,t=>eq(t,([t,r])=>{null!=r&&(ev(e[t])&&ev(r)?eX(e[t],r):e[t]=r)})),e),eZ=(e,t,r,n)=>{if(e)return null!=r?eH(e,t,r,n):(eq(t,t=>eo(t)?eH(e,t[0],t[1]):eq(t,([t,r])=>eH(e,t,r))),e)},eY=(e,t,r)=>{var n;return ec(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ec(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ev(e)&&delete e[t],e},eQ=(e,t)=>e instanceof Set||e instanceof WeakSet?!e.has(t)&&(e.add(t),!0):!eG(e,t)&&(eH(e,t,!0),!0),e0=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eG(e,t),ec(e,\"delete\")?e.delete(t):delete e[t],r},e1=(e,t)=>{if(e)return eo(t)?(eo(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e1(e,t)):eo(e)?t<e.length?e.splice(t,1)[0]:void 0:e0(e,t)},e2=e=>ep(e)?e():e,e6=(e,t)=>null==e?e:ep(e)?(...r)=>t(e,...r):t(()=>e),e4=(e,t=-1)=>eo(e)?t?e.map(e=>e4(e,t-1)):[...e]:ev(e)?t?eP(e,([e,r])=>[e,e4(r,t-1)]):{...e}:ey(e)?new Set(t?eO(e,e=>e4(e,t-1)):e):eg(e)?new Map(t?eO(e,e=>[e[0],e4(e[1],t-1)]):e):e,e5=(e,...t)=>null==e?void 0:e.push(...t),e3=(e,...t)=>null==e?void 0:e.unshift(...t),e8=(e,t)=>{var r,i,a;if(e)return ev(t)?(a={},ev(e)&&(eq(e,([e,l])=>{if(l!==t[e]){if(ev(r=l)){if(!(l=e8(l,t[e])))return;[l,r]=l}else ei(l)&&ei(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e4(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e9=\"undefined\"!=typeof performance?(e=K)=>e?Math.trunc(e9(V)):performance.timeOrigin+performance.now():Date.now,e7=(e=!0,t=()=>e9())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t=0)=>{var e=ep(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=to(!0).resolve(),c=e7(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await P(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!a,l)};function tr(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tn{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ti,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tr(this,\"_promise\",void 0),this.reset()}}class ti{then(e,t){return this._promise.then(e,t)}constructor(){var e;tr(this,\"_promise\",void 0),tr(this,\"resolve\",void 0),tr(this,\"reject\",void 0),tr(this,\"value\",void 0),tr(this,\"error\",void 0),tr(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===J||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?e2(t):new Promise(r=>setTimeout(async()=>r(await e2(t)),e)):C(`Invalid delay ${e}.`),to=e=>new(e?tn:ti),ts=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},Q=()=>{var e,t=new Set;return[(r,n)=>{var i=ts(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tv=(e,t,r)=>null==e?J:eo(t)?null==(t=t[0])?J:t+\" \"+tv(e,t,r):null==t?J:1===t?e:null!=r?r:\"is\"===e?\"are\":e+\"s\",tc=!0,tf=(e,t,r)=>r?(tc&&e5(r,\"\u001b[\",t,\"m\"),eo(e)?e5(r,...e):e5(r,e),tc&&e5(r,\"\u001b[m\"),r):tf(e,t,[]).join(\"\"),tp=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tg=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?J:null!=n[t]?t:r?C(`The ${e} \"${t}\" is not defined.`):J,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},ty=Symbol(),tm=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(ea(t)?t=[t]:eo(t))&&tD(t,e=>1<(i=l[1].split(e)).length?tF(i):J)||(l[1]?[l[1]]:[]),l):J},tb=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?J:tx(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&J,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):J,path:v,query:!1===t?c:c?tw(c,{...n,delimiters:t}):J,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":J),e}),tw=(e,t)=>tk(e,\"&\",t),tk=(e,t,{delimiters:r=!0,...n}={})=>{e=tJ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=tm(e,{...n,delimiters:!1===r?[]:!0===r?J:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tU}),t=t8(tK(e,!1),([e,t])=>[e,!1!==r?1<t.length?tX(t):t[0]:t.join(\",\")]);return t&&(t[ty]=e),t},tS=(e,t)=>t&&null!=e?t.test(e):J,tT=(e,t,r)=>tx(e,t,r,!0),tx=(e,t,i,a=!1)=>null==(null!=e?e:t)?J:i?(r=J,a?(n=[],tx(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:J,tI=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tA=/\\z./g,tE=(e,t)=>(t=rt(e$(eB(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tA,tN={},tO=e=>e instanceof RegExp,t$=(r,n=[\",\",\" \"])=>{var i;return tO(r)?r:eo(r)?tE(eO(r,e=>null==(e=t$(e,n))?void 0:e.source)):et(r)?r?/./g:tA:ea(r)?null!=(i=(e=tN)[t=r])?i:e[t]=tx(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tE(eO(t_(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rt(n,tI)}]`)),e=>e&&`^${rt(t_(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tI(tj(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):J},t_=(e,t,r=!0)=>null==e?J:r?t_(e,t,!1).filter(G):e.split(t),tj=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tC=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eZ(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},tM=!1,tU=Symbol(),tF=e=>(tM=!0,e),tq=Symbol(),tz=Symbol(),tR=Symbol.iterator,tP=e=>{tP=e=>e;var n,t=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tU){if(a===tF)break;if(n=a,r&&r.push(a),tM){tM=!1;break}}return r||n},r=(Array.prototype[tq]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tU){if(l===tF)break;if(n=l,r&&r.push(l),tM){tM=!1;break}}return r||n},t());for(n of(Object.prototype[tq]=(e,n,i,a,l)=>{if(e[tR])return(e.constructor===Object?r:Object.getPrototypeOf(e)[tq]=t())(e,n,i,a,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=n?n(u,s++,a,l):u)!==tU){if(u===tF)break;if(a=u,i&&i.push(u),tM){tM=!1;break}}return i||a},Object.prototype[tz]=function(){var t,e;return this[tR]||this[Y]?this.constructor===Object?null!=(e=this[Y]())?e:this[tR]():((e=Object.getPrototypeOf(this))[tz]=null!=(t=e[Y])?t:e[tR],this[tz]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[Map.prototype,WeakMap.prototype,Set.prototype,WeakSet.prototype,Object.getPrototypeOf(function*(){})]))n[tq]=t(),n[tz]=n[tR];return Number.prototype[tq]=(e,t,n,i,a)=>r(tW(e),t,n,i,a),Number.prototype[tz]=tW,Function.prototype[tq]=(e,t,n,i,a)=>r(tB(e),t,n,i,a),Function.prototype[tz]=tB,e};function*tW(e=this){for(var t=0;t<e;t++)yield t}function*tB(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tD=(e,t,r,n)=>(tD=tP((e,t,r,n=e)=>e?e[tq](e,t,void 0,r,n):null==e?e:void 0))(e,t,r,n),tJ=(e,t,r=[],n,i=e)=>(tJ=tP((e,t,r=[],n,i=e)=>e||0===e||\"\"===e?e[tq](e,t,r,n,i):null==e?e:void 0))(e,t,r,i,n),tL=(e,t=!0,r=!1)=>tJ(e,!0===t?e=>null!=e?e:tU:t?t.has?e=>null==e||t.has(e)===r?tU:e:(e,n,i)=>!t(e,n,i)===r?e:tU:e=>e||tU),tV=(e,t,r=-1,n=[],i,a=e)=>tJ(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tV(e,void 0,r-1,n,e),tU):e,n,i,a),tK=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tD(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t4(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tG=e=>null==e||eo(e)?e:e[tR]&&\"string\"!=typeof e?[...e]:[e],tX=(e,...t)=>{var r,n;for(n of e=!t.length&&eh(e)?e:[e,...t])if(null!=n){if(eh(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},tZ=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),tY=(e,t,r)=>tG(e).sort(\"function\"==typeof t?(e,n)=>tZ(t(e),t(n),r):eo(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=tZ(t[a](e),t[a](n),r);return i}:(e,t)=>tZ(e,t,r):(e,r)=>tZ(e,r,t)),tQ=Object.keys,t0=Symbol(),t1=Symbol(),t2=Symbol(),t6=e=>{for(var{prototype:t}of(t6=e=>e,[Map,WeakMap]))t[t0]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},t[t1]=t.get;for(var{prototype:t}of[Set,WeakSet])t[t0]=function(e,t){t||void 0===t?this.has(e)||this.add(e):this.delete(e)},t[t1]=t.has,t[t2]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for(var{prototype:t}of(Array.prototype[t2]=function(e){return this.push(...e),this},[Object,Array]))t[t0]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},t[t1]=function(e){return this[e]};return e},t4=(e,t,r)=>(t4=t6((e,t,r)=>{if(null==e)return e;var n=e[t1](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t0](t,r));e[t0](t,n)}return n}))(e,t,r),t5=(e,t,r)=>(t5=t6((e,t,r)=>(e[t0](t,r),r)))(e,t,r),t3=(e,...t)=>(t3=t6((e,...t)=>null==e?e:e[t2](t)))(e,...t),t8=(e,t)=>{var r={};return tD(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tU&&e!==tF)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tU&&e!==tF)?r[e[0]]=e[1]:e),r},t9=(e,...t)=>(t9=t6((e,...t)=>((null==e?void 0:e.constructor)===Object?tD(t,t=>tD(t,t=>t&&(e[t[0]]=t[1]))):tD(t,t=>tD(t,t=>t&&e[t0](t[0],t[1]))),e)))(e,...t),t7=(e,t)=>null==e?e:t8(t,t=>null!=e[t]||t in e?[t,e[t]]:tU),re=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),rt=(e,t,r)=>null==e?e:eh(e)?tL(\"function\"==typeof t?tJ(e,t):(r=t,e),re,!0).join(null!=r?r:\"\"):re(e)?\"\":null==e?void 0:e.toString(),rr=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?rr(tJ(e,t),r,n):(i=[],n=tD(e,(e,t,r)=>re(e)?tU:(r&&i.push(r),e.toString())),[t,o]=eo(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},rn=tg(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),ri=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],ra=t8(ri,e=>[e,e]),rl=(Object.freeze(eR(ri.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),ro=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},ru_parse=function(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),ea(e)&&(e=e.split(\",\")),eo(e)){var i,n={};for(i of e)ra[i]?\"necessary\"!==i&&(n[i]=!0):r&&C(`The purpose name '${i}' is not defined.`);e=n}return t?(t=tQ(e)).length?t:[\"necessary\"]:e},ru_test=function(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rl(i,n))&&!t[rl(i,n)])return!1;if(e=ro(e,n),t=ro(t,n),r){for(var a in t)if(t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(e[a]){if(t[a])return!0;l=!0}return!l},rs=(tg(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${rr(ru_parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),rd={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&ru_test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=ru_parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=rn.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=ru_parse(a,{validate:!1}))?e:{}}):t?rd.clone(t):{classification:\"anonymous\",purposes:{}}}},rv=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rc=e=>!(null==e||!e.patchTargetId),rf=Symbol(),rp=e=>void 0===e?\"undefined\":tp(JSON.stringify(e),40,!0),rh=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rg=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,ry=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rm=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rb=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rw=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rp(t)+` ${r}.`}),rf),rk=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rk((t?parseInt:parseFloat)(e),t,!1),rS={},ri=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rS[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rS[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rw(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rh.test(e)&&!isNaN(+new Date(e))?e:rw(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rk(e,!1,!1)){if(!rk(e,!0,!1))return rw(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!rg.test(e)||isNaN(+new Date(e)))return rw(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rk(e,!0,!1)?+e:rw(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rk(e,!0,!1)?+e:rw(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rk(e,!1,!1)?e:rw(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rm.test(e)?e:rw(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rm.exec(e);return r?r[2]?e:rw(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rw(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rm.exec(e);return r?\"urn\"!==r[1]||r[2]?rw(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rw(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rb.test(e)?e.toLowerCase():rw(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rw(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=ry.exec(e))?void 0:r[1].toLowerCase():null)?r:rw(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rp(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rf&&e.length>d?rw(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rf||(null==c||c<=e)&&(null==f||e<=f)?e:rw(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rf)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+rr(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rf||u.has(e)?e:rw(t,e,p)}(e=>e instanceof Set||null==e||new Set(e[tR]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tg(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rx=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rI=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rA=((I=a=a||{})[I.Success=200]=\"Success\",I[I.Created=201]=\"Created\",I[I.NotModified=304]=\"NotModified\",I[I.Forbidden=403]=\"Forbidden\",I[I.NotFound=404]=\"NotFound\",I[I.BadRequest=405]=\"BadRequest\",I[I.Conflict=409]=\"Conflict\",I[I.Error=500]=\"Error\",(e,t=!0)=>e&&(e.status<400||!t&&404===e.status));function rE(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rN=e=>{var t=rx(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${a[e.status]}.`:`${t} failed with status ${e.status} - ${a[e.status]}${r?` (${r})`:\"\"}.`};class rO extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rE(this,\"succeeded\",void 0),rE(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rA(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rA(e,!1)))?t:[]}}var r$=(e,t,r)=>{var n=async(n,i)=>{var v,f,c,h,l=eo(t)?t:[t],o=await r(l.filter(e=>e)),u=[],s=[],d=[];for(v of l)v?(c=null!=(c=o.get(v))?c:C(`No result for ${rx(v)}.`),v.source=c,v.callback&&d.push(v.callback(c)),c.success=rA(c,i||\"set\"===e),!n||c.success?u.push(n&&c.status===a.NotFound?void 0:1<n?null!=(f=c.value)?f:void 0:c):s.push(rN(c))):u.push(void 0);if(s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rO(u,s.join(\"\\n\"));for(h of d)await h();return l===t?u:u[0]};return Object.assign(R(()=>n(1,!1)),{as:()=>n(1,!1),all:()=>n(0,!1),require:()=>n(1,!0),value:(e=!1)=>n(2,e),values:(e=!1)=>n(2,e)})},r_=e=>e&&\"string\"==typeof e.type,rj=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rC=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rM=(e,t)=>{var r;return t&&(!(o=e.get(l=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(l,t)},rU=(e,t=\"\",r=new Map)=>{if(e)return eh(e)?eq(e,e=>rU(e,t,r)):ea(e)?tx(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rC(n)+\"::\":\"\")+t+rC(i),value:rC(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rM(r,i)}):rM(r,e),r},rF=tg(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rq=tg(\"variable scope\",{...rF,...ri}),rz=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rR=e=>null!=e&&!!e.scope&&null!=rF.ranks[e.scope],rP=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rW=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rD=()=>()=>C(\"Not initialized.\"),rJ=window,rL=document,rV=rL.body,rK=(e,t)=>!(null==e||!e.matches(t)),rH=((e=>tc=e)(!!rJ.chrome),L),rG=(e,t,r=(e,t)=>rH<=t)=>{for(var n=0,i=V;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==K&&null!=a),K),n-1)!==V&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==rL&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},rX=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||er(e);case\"n\":return parseFloat(e);case\"j\":return q(()=>JSON.parse(e),H);case\"h\":return q(()=>nV(e),H);case\"e\":return q(()=>null==nH?void 0:nH(e),H);default:return eo(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:rX(e,t[0])):void 0}},rZ=(e,t,r)=>rX(null==e?void 0:e.getAttribute(t),r),rY=(e,t,r)=>rG(e,(e,n)=>n(rZ(e,t,r))),rQ=(e,t)=>null==(e=rZ(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),r0=e=>null==e?void 0:e.getAttributeNames(),r1=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,r2=e=>null!=e?e.tagName:null,r4=e=>({x:em(scrollX,e),y:em(scrollY,e)}),r5=(e,t)=>tj(e,/#.*$/,\"\")===tj(t,/#.*$/,\"\"),r3=(e,t,r=K)=>(s=r8(e,t))&&W({xpx:s.x,ypx:s.y,x:em(s.x/rV.offsetWidth,4),y:em(s.y/rV.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),r8=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=r9(e),{x:d,y:v}):void 0,r9=e=>e?(c=e.getBoundingClientRect(),u=r4(V),{x:em(c.left+u.x),y:em(c.top+u.y),width:em(c.width),height:em(c.height)}):void 0,r7=(e,t,r,n={capture:!0,passive:!0})=>(t=es(t),ts(r,r=>eq(t,t=>e.addEventListener(t,r,n)),r=>eq(t,t=>e.removeEventListener(t,r,n)))),nt=()=>({...u=r4(K),width:window.innerWidth,height:window.innerHeight,totalWidth:rV.offsetWidth,totalHeight:rV.offsetHeight}),nr=new WeakMap,nn=e=>nr.get(e),ni=(e,t=V)=>(t?\"--track-\":\"track-\")+e,na=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tD(r0(e),l=>{var o;return null!=(o=(f=t[0])[p=l])?o:f[p]=(a=V,!ea(n=tD(t[1],([t,r,n],i)=>tS(l,t)&&(a=void 0,!r||rK(e,r))&&eS(null!=n?n:l)))||(i=e.getAttribute(l))&&!er(i)||rU(i,tj(n,/\\-/g,\":\"),r),a)}),nl=()=>{},no=(e,t)=>{if(h===(h=np.tags))return nl(e,t);var r=e=>e?tO(e)?[[e]]:eh(e)?e_(e,r):[ev(e)?[t$(e.match),e.selector,e.prefix]:[t$(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tV(h,([,e])=>e,1))]];(nl=(e,t)=>na(e,n,t))(e,t)},nu=(e,t)=>rt(ej(r1(e,ni(t,K)),r1(e,ni(\"base-\"+t,K))),\" \"),ns={},nd=(e,t,r=nu(e,\"attributes\"))=>{var n;r&&na(e,null!=(n=ns[r])?n:ns[r]=[{},tT(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[t$(r||n),,t])],t),rU(nu(e,\"tags\"),void 0,t)},nv=(e,t,r=V,n)=>null!=(r=null!=(r=r?rG(e,(e,r)=>r(nv(e,t,V)),ep(r)?r:void 0):rt(ej(rZ(e,ni(t)),r1(e,ni(t,K))),\" \"))?r:n&&(g=nn(e))&&n(g))?r:null,nc=(e,t,r=V,n)=>\"\"===(y=nv(e,t,r,n))||(null==y?y:er(y)),nf=(e,t,r,n)=>e&&(null==n&&(n=new Map),nd(e,n),rG(e,e=>{no(e,n),rU(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},np={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nh=[],ng=[],ny=(e,t=0)=>e.charCodeAt(t),nb=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nh[ng[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(ng[(16515072&t)>>18],ng[(258048&t)>>12],ng[(4032&t)>>6],ng[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nw=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nh[ny(e,r++)]<<2|(t=nh[ny(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nh[ny(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nh[ny(e,r++)]);return a},nk={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nS=(e=256)=>e*Math.random()|0,nx={exports:{}},{deserialize:nI,serialize:nA}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i+=String.fromCharCode(a>>10|55296)+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nx.exports=n})(),(I=nx.exports)&&I.__esModule&&Object.prototype.hasOwnProperty.call(I,\"default\")?I.default:I),nE=\"$ref\",nN=(e,t,r)=>ef(e)?J:r?t!==J:null===t||t,nO=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nN(t,n,r)?s(n):J)=>(n!==i&&(i!==J||eo(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||ep(e)||ef(e))return J;if(ed(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nE]||(e[nE]=l,u(()=>delete e[nE])),{[nE]:l};if(ev(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!eh(e)||e instanceof Uint8Array||(!eo(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return q(()=>{var r;return t?nA(null!=(r=s(e))?r:null):q(()=>JSON.stringify(e,J,n?2:0),()=>JSON.stringify(s(e),J,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},n$=e=>{var t,r,n=e=>ed(e)?e[nE]&&(r=(null!=t?t:t=[])[e[nE]])?r:(e[nE]&&delete(t[e[nE]]=e)[nE],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(ea(e)?q(()=>JSON.parse(e),()=>console.error(\"Invalid JSON received.\",e)):null!=e?q(()=>nI(e),()=>(console.error(\"Invalid message received.\",e),J)):e)},n_=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>ei(e)&&!0===r?e:u(e=ea(e)?new Uint8Array(eO(e.length,t=>255&e.charCodeAt(t))):t?q(()=>JSON.stringify(e),()=>JSON.stringify(nO(e,!1,n))):nO(e,!0,n),r),a=e=>null==e?J:q(()=>n$(e),J);return t?[e=>nO(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nS()));for(r=0,a[n++]=g(v^16*nS(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nS();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=et(t)?64:t,h(),[l,u]=nk[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?G:nb)(l(nO(e,!0,n))),e=>null!=e?n$(o(e instanceof Uint8Array?e:(r&&ew(e)?a:nw)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},[nj,,]=(n_(),n_(null,{json:!0,decodeJson:!0}),n_(null,{json:!0,prettify:!0})),tg=t_(\"\"+rL.currentScript.src,\"#\"),ri=t_(\"\"+(tg[1]||\"\"),\";\"),nF=tg[0],nq=ri[1]||(null==(I=tb(nF,{delimiters:!1}))?void 0:I.host),nz=e=>!(!nq||(null==(e=tb(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nq))!==K),tg=(...e)=>tj(rt(e),/(^(?=\\?))|(^\\.(?=\\/))/,nF.split(\"?\")[0]),nP=tg(\"?\",\"var\"),nW=tg(\"?\",\"mnt\"),nB=(tg(\"?\",\"usr\"),Symbol()),nD=Symbol(),nJ=(e,t,r=K,n=V)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tf(\"tail.js: \",\"90;3\"))+t);r=null==e?void 0:e[nD];null!=(e=r?e[nB]:e)&&console.log(ed(e)?tf(nj(e),\"94\"):ep(e)?\"\"+e:e),r&&r.forEach(([e,t,r])=>nJ(e,t,r,!0)),t&&console.groupEnd()},[nL,nV]=n_(),[nK,nH]=[rD,rD],nG=!0,[ri,nZ]=Q(),n0=(...e)=>{var t,i=e.shift();console.error(ea(e[1])?e.shift():null!=(t=null==(t=e[1])?void 0:t.message)?t:\"An error occurred\",null!=(t=i.id)?t:i,...e)},[n1,n2]=Q(),[n6,n4]=Q(),n5=e=>n8!==(n8=e)&&n2(n8=!1,ie(!0,!0)),n3=e=>n9!==(n9=!!e&&\"visible\"===document.visibilityState)&&n4(n9,!e,n7(!0,!0)),n8=(n1(n3),!0),n9=!1,n7=e7(!1),ie=e7(!1),it=(r7(window,[\"pagehide\",\"freeze\"],()=>n5(!1)),r7(window,[\"pageshow\",\"resume\"],()=>n5(!0)),r7(document,\"visibilitychange\",()=>(n3(!0),n9&&n5(!0))),n2(n8,ie(!0,!0)),!1),ir=e7(!1),[,ia]=Q(),il=tt({callback:()=>it&&ia(it=!1,ir(!1)),frequency:2e4,once:!0,paused:!0}),I=()=>!it&&(ia(it=!0,ir(!0)),il.restart()),iu=(r7(window,[\"focus\",\"scroll\"],I),r7(window,\"blur\",()=>il.trigger()),r7(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],I),I(),()=>ir()),is=0,id=void 0,iv=()=>(null!=id?id:rD())+\"_\"+ic(),ic=()=>(e9(!0)-(parseInt(id.slice(0,-2),36)||0)).toString(36)+\"_\"+(++is).toString(36),ig=new Map,iy={id:id,heartbeat:e9()},im={knownTabs:new Map([[id,iy]]),variables:new Map},[ib,iw]=Q(),[ik,iS]=Q(),iT=rD,ix=(e,t=e9())=>{e=ig.get(ea(e)?e:rP(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iI=(...e)=>{var t=e9();return iE(tJ(e,e=>(e.cache=[t],[rI(e),{...e,created:t,modified:t,version:\"0\"}])))},iA=e=>null!=(e=tJ(e,e=>{var t,r;return e&&(t=rP(e[0]),(r=ig.get(t))!==e[1])?[t,e[1],r,e[0]]:tU}))?e:[],iE=e=>{var r,n,e=iA(e);null!=e&&e.length&&(r=e9(),tD(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),t9(ig,e),(n=tL(e,([,,,e])=>0<rq.compare(e.scope,\"tab\"))).length&&iT({type:\"patch\",payload:t8(n)}),iS(tJ(e,([,e,t,r])=>[r,e,t]),ig,!0))},[,iO]=(ri((e,t)=>{n1(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),id=null!=(n=null==r?void 0:r[0])?n:e9(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),ig=new Map(tX(tL(ig,([,e])=>\"view\"===(null==e?void 0:e.scope)),tJ(null==r?void 0:r[1],e=>[rP(e),e])))):sessionStorage.setItem(\"_tail:state\",e([id,tJ(ig,([,e])=>e&&\"view\"!==e.scope?e:tU)]))},!0),iT=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([id,t,r])),localStorage.removeItem(\"_tail:state\"))},r7(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==id||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||iT({type:\"set\",payload:[tJ(im.knownTabs),tJ(im.variables)]},e):\"set\"===a&&r.active?(im.knownTabs=new Map(l[0]),im.variables=new Map(l[1]),ig=new Map(l[1]),r.trigger()):\"patch\"===a?(o=iA(tJ(l,([e,t])=>[rW(e),t])),t9(im.variables,l),t9(ig,l),iS(tJ(o,([,e,t,r])=>[r,e,t]),ig,!1)):\"tab\"===a&&(t5(im.knownTabs,e,l),l)&&iw(\"tab\",l,!1))});var r=tt(()=>iw(\"ready\",im,!0),-25),n=tt({callback(){var e=e9()-1e4;eq(im.knownTabs,([t,r])=>r[0]<e&&t5(im.knownTabs,t,void 0)),iy.heartbeat=e9(),iT({type:\"tab\",payload:iy})},frequency:5e3,paused:!0});n1(e=>(e=>{iT({type:\"tab\",payload:e?iy:void 0}),e?(r.restart(),iT({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),Q()),[i$,i_]=Q(),ij=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?nH:nV)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?nK:nL)([id,e9()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e9())&&(l(),(null==(d=i())?void 0:d[0])===id))return 0<t&&(a=setInterval(()=>l(),t/2)),P(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=to(),[d]=r7(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[tl(null!=o?o:t),v],await Promise.race(e.map(e=>ep(e)?e():e)),d()}var e;null==o&&C(\"_tail:rq could not be acquired.\")}})(),iC=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&nG;var i,a,l=!1,o=r=>{var o=ep(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iO(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===J,i=e)),!l)&&(a=n?nK(i,!0):JSON.stringify(i))};if(!r)return ij(()=>ez(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?eS(C(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?nH:JSON.parse)?void 0:l(t):J)&&i_(l),eS(l)):eS()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&C(\"Beacon send failed.\")},tg=[\"scope\",\"key\",\"entityId\",\"source\"],iU=[...tg,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iF=[...tg,\"value\",\"force\",\"ttl\",\"version\"],iq=new Map,iz=(e,t)=>{var r=tt(async()=>{var e=eO(iq,([e,t])=>({...rW(e),result:[...t]}));e.length&&await l.get(e)},3e3),n=(e,t)=>t&&t4(iq,e,()=>new Set).add(t),l=(n1((e,t)=>r.toggle(e,e&&3e3<=t),!0),ik(e=>tD(e,([e,t])=>(e=>{var t,r;e&&(t=rP(e),null!=(r=e1(iq,t)))&&r.size&&tD(r,r=>!0===r(e)&&n(t,r))})(t?{status:a.Success,success:!0,...t}:{status:a.NotFound,success:!0,...e}))),{get:r=>r$(\"get\",r,async r=>{r[0]&&!ea(r[0])||(u=r[0],r=r.slice(1)),null!=t&&t.validateKey(u);var s=new Map,d=[],v=tJ(r,e=>{var t=ix(rP(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))s.set(e,{...e,status:a.Forbidden,success:!1,error:`No consent for '${r}'.`});else if(!e.refresh&&t)s.set(e,{status:a.Success,success:!0,...t});else{if(!rR(e))return[t7(e,iU),e];var i,r=null==(i=e.init)?void 0:i.call(e);r&&(r={...rI(e),version:\"1\",created:c,modified:c,value:r,cache:[c,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},t3(d,[rI(r),r]),s.set(e,{status:a.Success,success:!0,...r}))}return tU}),c=e9(),u=v.length&&(null==(u=await iC(e,{variables:{get:tJ(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=u.variables)?void 0:r.get)||[],p=[];return tD(u,(e,t)=>{var n,r;(null==e?void 0:e.status)===a.NotFound?null!=(r=null==(r=(n=v[t][1]).init)?void 0:r.call(n))&&p.push([n,{...rI(n),value:r}]):s.set(v[t][1],rz(e))}),p.length&&tD(await l.set(tJ(p,([,e])=>e)).all(),(e,t)=>s.set(p[t][0],rz(e.status===a.Conflict?{...e,status:a.Success,success:!0}:e))),d.length&&iE(d),tD(s,([e])=>{e.callback&&(e.callback=e6(e.callback,(t,r)=>{P(async()=>!0===await t(r)&&n(rP(e),e.callback),!1)}))}),s}),set:r=>r$(\"set\",r,async r=>{r[0]&&!ea(r[0])||(v=r[0],r=r.slice(1)),null!=t&&t.validateKey(v);for(var n=[],i=new Map,o=e9(),u=[],s=tJ(r,e=>{var s,r,t=ix(rP(e));return rR(e)?((r=null==(s=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rI(e),created:null!=(r=null==t?void 0:t.created)?r:o,modified:o,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:s,cache:[o,e.ttl]})&&(r.cache=[o,null!=(s=e.ttl)?s:3e3]),i.set(e,r?{status:t?a.Success:a.Created,success:!0,...r}:{status:a.Success,success:!0,...rI(e)}),t3(n,[rI(e),r]),tU):e.patch?(u.push(e),tU):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[t7(e,iF),e])}),d=0;!d++||u.length;){var v,f=await l.get(tJ(u,e=>rI(e))).all(),f=(tD(f,(e,t)=>{var r=u[t];rA(e,!1)?t3(s,[{...r,patch:void 0,value:u[t].patch(null==e?void 0:e.value),version:e.version},r]):i.set(r,e)}),u=[],s.length?F(null==(f=(await iC(e,{variables:{set:tJ(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:f.set,\"No result.\"):[]);tD(f,(e,t)=>{var[,t]=s[t];d<=3&&t.patch&&((null==e?void 0:e.status)===a.Conflict||(null==e?void 0:e.status)===a.NotFound)?t3(u,t):i.set(t,rz(e))})}return n.length&&iE(n),i})});return i$(({variables:e})=>{e&&null!=(e=tX(tJ(e.get,e=>null!=e&&e.success?e:tU),tJ(e.set,e=>null!=e&&e.success?e:tU)))&&e.length&&iE(tJ(e,e=>[rI(e),e.success?e.value:void 0]))}),l},iR=Symbol(),iW=Symbol(),iB=[.75,.33],iD=[.25,.33],iL=e=>tJ(tY(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rx(e)}, ${rR(e)?\"client-side memory only\":rs(null==(e=e.schema)?void 0:e.usage)})`,V]:tU),iK=()=>{var i,l,a,r=null==rJ?void 0:rJ.screen;return r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rJ.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rJ.devicePixelRatio,width:r,height:i,landscape:l}}):{}},iH=e=>e(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==k?void 0:k.clientId,languages:eO(navigator.languages,(e,t,r=e.split(\"-\"))=>W({id:e,language:r[0],region:r[1],primary:0===t,preference:t+1})),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...iK()})),iG=(e,t=\"A\"===r2(e)&&rZ(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),iX=(e,t=r2(e),r=nc(e,\"button\"))=>r!==V&&(U(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&U(rQ(e,\"type\"),\"button\",\"submit\")||r===K),iZ=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tp((null==(r=rZ(e,\"title\"))?void 0:r.trim())||(null==(r=rZ(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?r9(e):void 0}},iQ=e=>{if(w)return w;ea(e)&&([r,e]=nV(e),e=n_(r,{decodeJson:!0})[1](e)),eZ(np,e),(e=>{nH===rD&&([nK,nH]=n_(e,{json:!e,prettify:!1}),nG=!!e,nZ(nK,nH))})(e1(np,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,y,i=e1(np,\"key\"),a=null!=(e=null==(r=rJ[np.name])?void 0:r._)?e:[];if(eo(a))return l=[],o=[],u=(e,...t)=>{var r=K;o=eB(o,n=>q(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:w,unsubscribe:()=>r=V}),r},(e=>t=>n0(e,t))(n)))},s=[],v=iz(nP,d={applyEventExtensions(e){null==e.clientId&&(e.clientId=iv()),null==e.timestamp&&(e.timestamp=e9()),h=K;var n=V;return eO(l,([,t])=>{var r;!n&&(null==(r=t.decorate)?void 0:r.call(t,e))!==V||(n=K)}),n?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&C(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eX(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):C(\"Source event not queued.\")},o=async(r,n=!0,i)=>{var a;return r[0]&&!ea(r[0])||(a=r[0],r=r.slice(1)),r=eO(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eX(e,{metadata:{posted:!0}}),e[iR]){if(!1===e[iR](e))return;delete e[iR]}return eX(rv(e4(e),!0),{timestamp:e.timestamp-e9()})}),nJ({[nD]:eO(r,e=>[e,e.type,V])},\"Posting \"+rr([tv(\"new event\",[eD(r,e=>!rc(e))||void 0]),tv(\"event patch\",[eD(r,e=>rc(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),iC(e,{events:r,variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},u=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=eO(es(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e5(l,e),eX(t.applyEventExtensions(e),{metadata:{queued:!0}})}),eq(l,e=>nJ(e,e.type)),!i)return o(e,!1,a);r?(n.length&&e3(e,...n.splice(0)),e.length&&await o(e,!0,a)):e.length&&e5(n,...e)};return tt(()=>u([],{flush:!0}),5e3),n6((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=eO(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),t}),n.length||e.length)&&u(ej(n.splice(0),e),{flush:!0})}),{post:u,postPatch:(e,t,r)=>u(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var o=!1,s=()=>{o=!0};return i.set(e,e4(e)),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))s();else{var a=i.get(e),[r,d]=null!=(r=e8(t(a,s),a))?r:[];if(r&&!M(d,a))return i.set(e,e4(d)),[l(e,r),o]}return[void 0,o]}),r&&u(e),s}}})(nP,d),f=null,p=0,g=h=V,y=!1,w=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||ea(e[0]))&&(t=e[0],e=e.slice(1)),ea(e[0])&&(r=e[0],e=ew(r)?JSON.parse(r):nV(r));var t,n=V;if((e=eB(e_(e,e=>ea(e)?nV(e):e),e=>{if(!e)return V;if(ab(e))np.tags=eZ({},np.tags,e.tagAttributes);else{if(aw(e))return np.disabled=e.disable,V;if(aT(e))return n=K,V;if(aO(e))return e(w),V}return g||aI(e)||aS(e)?K:(s.push(e),V)})).length||n){var r=eK(e,e=>aS(e)?-100:aI(e)?-50:aN(e)?-10:r_(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),q(()=>{var e=f[p];if(u(\"command\",e),h=V,r_(e))c.post(e);else if(ax(e))v.get(tG(e.get));else if(aN(e))v.set(tG(e.set));else if(aI(e))e5(o,e.listener);else if(aS(e))(t=q(()=>e.extension.setup(w),t=>n0(e.extension.id,t)))&&(e5(l,[null!=(r=e.priority)?r:100,t,e.extension]),eK(l,([e])=>e));else if(aO(e))e(w);else{var r,n,t,a=V;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:V)break;a||n0(\"invalid-command\",e,\"Loaded extensions:\",l.map(e=>e[2].id))}},e=>n0(w,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(rJ,np.name,{value:Object.freeze(Object.assign(w,{id:\"tracker_\"+iv(),events:c,variables:v,__isTracker:K})),configurable:!1,writable:!1}),ik((e,t,r)=>{var n=ej(iL(tJ(e,([,e])=>e||tU)),[[{[nD]:iL(tJ(t,([,e])=>e||tU))},\"All variables\",K]]);nJ({[nD]:n},tf(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eD(t)} in total).`,\"2;3\"))}),ib(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:L}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||(iH(w),e.hasUserAgent=!0),g=!0,s.length&&w(s),n(),y=!0,w(...eO(ah,e=>({extension:e})),...a),w({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),w;C(`The global variable for the tracker \"${np.name}\" is used for something else than an array of queued commands.`)},i0=()=>null==k?void 0:k.clientId,i1={scope:\"shared\",key:\"referrer\"},i2=(e,t)=>{w.variables.set({...i1,value:[i0(),e]}),t&&w.variables.get({scope:i1.scope,key:i1.key,result(r,n,i){return null!=r&&r.value?i():(null==n||null==(r=n.value)?void 0:r[1])===e&&t()}})},i6=e7(),i4=e7(),i5=1,[i8,i9]=Q(),i7=e=>{var t=e7(e,i6),r=e7(e,i4),n=e7(e,iu),i=e7(e,()=>i5);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},ae=i7(),[ar,an]=Q(),ai=(e,t)=>(t&&tD(al,t=>e(t,()=>!1)),ar(e)),aa=new WeakSet,al=document.getElementsByTagName(\"iframe\");function au(e){if(e){if(null!=e.units&&U(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ad=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),av=e=>nf(e,t=>t!==e&&!!ad(nr.get(t)),e=>(T=nr.get(e),(T=nr.get(e))&&e_(ej(T.component,T.content,T),\"tags\"))),ac=(e,t)=>t?e:{...e,rect:void 0,content:(x=e.content)&&eO(x,e=>({...e,rect:void 0}))},af=(e,t=V,r)=>{var n,i,a,l=[],o=[],u=0;return rG(e,e=>{var s,a,i=nr.get(e);i&&(ad(i)&&(a=eB(es(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==K||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eV(a,e=>null==(e=e.track)?void 0:e.region))&&r9(e)||void 0,s=av(e),i.content&&e3(l,...eO(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e3(o,...eO(a,e=>{var t;return u=eJ(u,null!=(t=e.track)&&t.secondary?1:2),ac({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nv(e,\"area\"))&&e3(o,...eO(es(a)))}),l.length&&e5(o,ac({id:\"\",rect:n,content:l})),tD(o,e=>{ea(e)?e5(null!=i?i:i=[],e):(null==e.area&&(e.area=rt(i,\"/\")),e3(null!=a?a:a=[],e))}),a||i?{components:a,area:rt(i,\"/\")}:void 0},ap=Symbol(),ah=[{id:\"context\",setup(e){tt(()=>tD(al,e=>eQ(aa,e)&&an(e)),1e3).trigger(),e.variables.get({scope:\"view\",key:\"view\",result(t,r,i){var a;return null==k||null==t||!t.value||null!=k&&k.definition?(n=null==t?void 0:t.value,null!=t&&null!=(a=t.value)&&a.navigation&&f(!0)):(k.definition=t.value,null!=(a=k.metadata)&&a.posted?e.events.postPatch(k,{definition:n}):nJ(k,k.type+\" (definition updated)\")),i()}});var n,t,d=null!=(t=null==(t=ix({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=ix({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&iI({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=ix({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=ix({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=V)=>{var a,l,o,i,p;r5(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=tb(location.href+\"\",{requireAuthority:!0}),k={type:\"view\",timestamp:e9(),clientId:iv(),tab:id,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:nt(),duration:ae(void 0,!0)},0===v&&(k.firstTab=K),0===v&&0===d&&(k.landingPage=K),iI({scope:\"tab\",key:\"viewIndex\",value:++d}),l=tw(location.href),eO([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return(null!=(n=(o=k).utm)?n:o.utm={})[e]=null==(n=es(l[\"utm_\"+e]))?void 0:n[0]}),!(k.navigationType=S)&&performance&&eO(performance.getEntriesByType(\"navigation\"),e=>{k.redirects=e.redirectCount,k.navigationType=tj(e.type,/\\_/g,\"-\")}),S=void 0,\"navigate\"===(null!=(t=k.navigationType)?t:k.navigationType=\"navigate\")&&(p=null==(i=ix(i1))?void 0:i.value)&&nz(document.referrer)&&(k.view=null==p?void 0:p[0],k.relatedEventId=null==p?void 0:p[1],e.variables.set({...i1,value:void 0})),(p=document.referrer||null)&&!nz(p)&&(k.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tb(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),k.definition=n,n=void 0,e.events.post(k),e.events.registerEventPatchSource(k,()=>({duration:ae()})),i9(k))};return n6(e=>{e?(i4(K),++i5):i4(V)}),r7(window,\"popstate\",()=>(S=\"back-forward\",f())),eO([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),S=\"navigate\",f()}}),f(),{processCommand:t=>am(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),K),decorate(e){!k||rj(e)||rc(e)||(e.view=k.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tD(e,e=>{var t,r;return null==(t=(r=e.target)[iW])?void 0:t.call(r,e)})),r=new Set,n=(tt({callback:()=>tD(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=rL.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;l&&(o=eB(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==K}))&&eD(o)&&(p=f=V,g=h=0,y=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},e7(!1,iu),!1,!1,0,0,0,tC()];a[4]=t,a[5]=r,a[6]=n},m=[tC(),tC()],b=i7(!1),w=e7(!1,iu),k=-1,S=()=>{var O,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],E=f?iD:iB,r=(E[0]*l<T||E[0]<(T/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=np.impressionThreshold-250)&&(++h,b(f),s||e(s=eB(eO(o,e=>((null==(e=e.track)?void 0:e.impressions)||nc(a,\"impressions\",K,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:r3(a),viewport:nt(),timeOffset:ae(),impressions:h,...af(a,K)})||null))),null!=s)&&s.length&&(O=b(),d=eO(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:em(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:em(l/u+100*o/l),readTime:em(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var _=rL.createTreeWalker(a,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(M=_.nextNode());){var M,U,F,P,B,z=null!=(U=null==(U=M.textContent)?void 0:U.length)?U:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](M,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),B=t.top,C<3?y(0,F-B,P-B,v[1].readTime):(y(1,u[0][4],F-B,v[2].readTime),y(2,F-B,P-B,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(E,E+T)*m[1].push(r,r+S)/L),u&&tD(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[iW]=({isIntersecting:e})=>{eZ(r,S,e),e||(tD(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{eY(nr,e,e=>{var t;return(e=>null==e?void 0:{...e,component:es(e.component),content:es(e.content),tags:es(e.tags)})(\"add\"in n?{...e,component:ej(null==e?void 0:e.component,n.component),content:ej(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:ej(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,nr.get(e))};return{decorate(e){tD(e.components,e=>t5(e,\"track\",void 0))},processCommand:e=>ak(e)?(n(e),K):aE(e)?(eO(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=rZ(i,e);){eQ(n,i);var l,o=t_(rZ(i,e),\"|\");rZ(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=el(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e5(a,d)}}}e5(r,...eO(a,e=>({add:K,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),K):V}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{r7(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=V;if(rG(n.target,e=>{iX(e)&&null==l&&(l=e),s=s||\"NAV\"===r2(e);var t,d=nn(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tD(e.querySelectorAll(\"a,button\"),t=>iX(t)&&(3<(null!=u?u:u=[]).length?eS():u.push({...iZ(t,!0),component:rG(t,(e,t,r,n=null==(i=nn(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=nc(e,\"clicks\",K,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eV(d,e=>(null==(e=e.track)?void 0:e.clicks)!==V)),null==a&&(a=null!=(t=nc(e,\"region\",K,e=>null==(e=e.track)?void 0:e.region))?t:d&&eV(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=af(null!=l?l:o,!1,v),f=nf(null!=l?l:o,void 0,e=>eO(es(null==(e=nr.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?K:a)?{pos:r3(l,n),viewport:nt()}:null,...((e,t)=>{var n;return rG(null!=e?e:t,e=>\"IMG\"===r2(e)||e===t?(n={element:iZ(e,!1)},V):K),n})(n.target,null!=l?l:o),...c,timeOffset:ae(),...f});if(l)if(iG(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=tb(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:iv(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:K,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||rZ(h,\"target\")!==window.name?(i2(w.clientId),w.self=V,e(w)):r5(location.href,h.href)||(w.exit=w.external,i2(w.clientId))):(k=h.href,(b=nz(k))?i2(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||np.captureContextMenu&&(h.href=nW+\"=\"+T+encodeURIComponent(k),r7(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),r7(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{rG(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>ea(e=null==e||e!==K&&\"\"!==e?e:\"add\")&&U(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ed(e)?e:void 0)(null!=(r=null==(r=nn(e))?void 0:r.cart)?r:nv(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?J:eo(e)||ea(e)?e[e.length-1]:eF(e,(e,r)=>e,void 0,void 0))(null==(r=nn(e))?void 0:r.content))&&t(d)});c=au(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eY(t,o,r=>{var i=r8(o,n);return r?e5(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),ai(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=r4(K);i8(()=>{return e=()=>(t={},r=r4(K)),setTimeout(e,250);var e}),r7(window,\"scroll\",()=>{var a,n=r4(),i={x:(u=r4(V)).x/(rV.offsetWidth-window.innerWidth)||0,y:u.y/(rV.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=K,e5(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=K,e5(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=K,e5(a,\"page-end\")),(n=eO(a,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return ay(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=au(r))&&e({...r,type:\"cart_updated\"}),K):aA(t)?(e({type:\"order\",...t.order}),K):V}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||rY(e,ni(\"form-value\")),e=(t&&(r=r?er(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tp(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=rY(a,ni(\"ref\"))||\"track_ref\",(s=t4(r,a,()=>{var t,r=new Map,n={type:\"form\",name:rY(a,ni(\"form-name\"))||rZ(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},s=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ae()})),((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),et(i)?i&&(a<0?en:D)(null==r?void 0:r())?n(r):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})());return r7(a,\"submit\",()=>{i=af(a),t[3]=3,s(()=>{(a.isConnected&&0<r9(a).width?(t[3]=2,s):()=>{o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&r9(a).width)),e.events.postPatch(n,{...i,totalTime:e9(K)-t[4]}),t[3]=1})()},750)}),t=[n,r,a,0,e9(K),1]}))[1].get(t)||eO(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA\"),(e,t)=>{var d,v,a;e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:tj(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[ap]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!nc(e,\"ref\")||(e.value||(e.value=tj(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value)}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=i4())),v=-(s-(s=e9(K))),c=i[ap],(i[ap]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=K,o[3]=2,tD(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&r7(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e9(K),u=i4()):o()));d(document),ai(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",callback:t}).value(),i=async t=>{var r;if(t)return!(r=await n())||rd.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rJ.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!1;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tJ(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=o=!0)),{classification:o?\"indirect\":\"anonymous\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,t,s,d;return a$(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(d=l.key,(null!=(t=a[d])?t:a[d]=tt({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e,t,r;rL.hasFocus()&&(e=l.poll(s))&&!rd.equals(s,e)&&([t,r]=await i(e),t&&nJ(r,\"Consent was updated from \"+d),s=e)}).trigger()),K):V}}}}],I=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),ay=I(\"cart\"),am=I(\"username\"),ab=I(\"tagAttributes\"),aw=I(\"disable\"),ak=I(\"boundary\"),aS=I(\"extension\"),aT=I(K,\"flush\"),ax=I(\"get\"),aI=I(\"listener\"),aA=I(\"order\"),aE=I(\"scan\"),aN=I(\"set\"),aO=e=>\"function\"==typeof e,a$=I(\"consent\");Object.defineProperty(rJ,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(iQ)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
                        this.environment.log(extension, "initialize", e);
                    }
                    return extension;
                }));
                this.environment.log(this, "Request handler initialized.", "info");
            } catch (error) {
                host.log(serializeLogMessage({
                    level: "error",
                    message: "An error occurred while initializing the request handler."
                }));
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
                !this._config.json && (clientEncryptionKey = this.environment.hash((this._config.clientEncryptionKeySeed || "") + await this._clientIdGenerator.generateClientId(this.environment, request, true), 64));
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
                sessionReferenceId: this.environment.hash(await this._clientIdGenerator.generateClientId(this.environment, request, false), 128),
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
                return html ? `<script src='${script.src}?${INIT_SCRIPT_QUERY}${"&" + BUILD_REVISION_QUERY }'${script.defer !== false ? " defer" : ""}></script>` : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({
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
            message: `An error occurred when invoking the method '${method}' on an extension.`,
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
        let { trackerName, endpoint, extensions, cookies, client, clientIdGenerator, defaultConsent } = config = merge({}, DEFAULT, config);
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
            await this.set(map2(variables, ([, value])=>value));
        }
    }
    _getClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = this._clientDeviceCache = {};
            let timestamp;
            DATA_PURPOSES.map((name)=>{
                var _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_name;
                var _deviceCache;
                // Device variables are stored with a cookie for each purpose.
                forEach2(this.httpClientDecrypt((_this_cookies_this__requestHandler__cookieNames_deviceByPurpose_name = this.cookies[this._requestHandler._cookieNames.deviceByPurpose[name]]) === null || _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_name === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_deviceByPurpose_name.value), (value)=>{
                    var _variables;
                    return update2((_variables = (_deviceCache = deviceCache).variables) !== null && _variables !== void 0 ? _variables : _deviceCache.variables = {}, value[0], (current)=>current !== null && current !== void 0 ? current : {
                            scope: "device",
                            key: value[0],
                            version: value[1],
                            value: value[2],
                            created: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now(),
                            modified: timestamp !== null && timestamp !== void 0 ? timestamp : timestamp = now()
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
        var _this_cookies_this__requestHandler__cookieNames_consent;
        if (this._initialized === (this._initialized = true)) {
            return this;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        this._consent = DataUsage.deserialize((_this_cookies_this__requestHandler__cookieNames_consent = this.cookies[this._requestHandler._cookieNames.consent]) === null || _this_cookies_this__requestHandler__cookieNames_consent === void 0 ? void 0 : _this_cookies_this__requestHandler__cookieNames_consent.value, this._defaultConsent);
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
    async _ensureSession(timestamp, { deviceId, deviceSessionId = this.deviceSessionId, passive = false, resetSession = false, resetDevice = false, refreshState = false } = {}) {
        var _this__session, _this__session1;
        if ((resetSession || resetDevice) && this._sessionReferenceId) {
            // Purge old data. No point in storing this since it will no longer be used.
            await this.purge({
                scopes: filter2([
                    resetSession && "session",
                    resetDevice && "device"
                ], false)
            }, {
                bulk: true
            });
        } else if (((_this__session = this._session) === null || _this__session === void 0 ? void 0 : _this__session.value) && !refreshState) {
            return;
        }
        // In case we refresh, we might already have a session ID.
        let sessionId = this.sessionId;
        let cachedDeviceData;
        const getDeviceId = async ()=>{
            var _ref;
            return this._consent.classification !== "anonymous" ? (_ref = deviceId !== null && deviceId !== void 0 ? deviceId : resetDevice ? undefined : cachedDeviceData === null || cachedDeviceData === void 0 ? void 0 : cachedDeviceData.id) !== null && _ref !== void 0 ? _ref : await this.env.nextId("device") : undefined;
        };
        if (this._consent.classification !== "anonymous") {
            var _this__getClientDeviceVariables_SCOPE_INFO_KEY, _this__getClientDeviceVariables, _this_httpClientDecrypt, _this_cookies_this__requestHandler__cookieNames_session;
            cachedDeviceData = resetDevice ? undefined : (_this__getClientDeviceVariables = this._getClientDeviceVariables()) === null || _this__getClientDeviceVariables === void 0 ? void 0 : (_this__getClientDeviceVariables_SCOPE_INFO_KEY = _this__getClientDeviceVariables[SCOPE_INFO_KEY]) === null || _this__getClientDeviceVariables_SCOPE_INFO_KEY === void 0 ? void 0 : _this__getClientDeviceVariables_SCOPE_INFO_KEY.value;
            if (sessionId && this._sessionReferenceId !== sessionId && !passive) {
                // We switched from cookie-less to cookies. Purge reference.
                await this.env.storage.set([
                    {
                        scope: "session",
                        key: SESSION_REFERENCE_KEY,
                        entityId: this._sessionReferenceId,
                        value: null,
                        force: true
                    },
                    {
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        entityId: sessionId,
                        patch: async (current)=>({
                                ...current,
                                deviceId: await getDeviceId()
                            })
                    }
                ], {
                    trusted: true
                });
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
        } else if (this._sessionReferenceId) {
            if (sessionId && this._sessionReferenceId === sessionId && !passive) {
                // We switched from cookies to cookie-less. Remove deviceId and device info.
                await this.env.storage.set([
                    {
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        entityId: sessionId,
                        patch: (current)=>({
                                ...current,
                                deviceId: undefined
                            })
                    },
                    this.deviceId && {
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        entityId: this.deviceId,
                        force: true,
                        value: undefined
                    }
                ], {
                    trusted: true
                });
                this._device = undefined;
            }
            this._sessionReferenceId = this._sessionReferenceId;
            sessionId = await this.env.storage.get({
                scope: "session",
                key: SESSION_REFERENCE_KEY,
                entityId: this._sessionReferenceId,
                init: async ()=>passive ? undefined : sessionId !== null && sessionId !== void 0 ? sessionId : await this.env.nextId()
            }, {
                trusted: true
            }).value();
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
        await this.env.storage.get({
            scope: "session",
            key: SCOPE_INFO_KEY,
            entityId: sessionId,
            init: async ()=>{
                if (passive) return undefined;
                return createInitialScopeData(sessionId, timestamp, {
                    deviceId: await getDeviceId(),
                    deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                    previousSession: cachedDeviceData === null || cachedDeviceData === void 0 ? void 0 : cachedDeviceData.lastSeen,
                    hasUserAgent: false
                });
            }
        }, {
            trusted: true
        });
        if ((_this__session1 = this._session) === null || _this__session1 === void 0 ? void 0 : _this__session1.value) {
            var _this_session;
            let device = this._consent.classification === "anonymous" && this.deviceId ? await this.env.storage.get({
                scope: "device",
                key: SCOPE_INFO_KEY,
                entityId: this.deviceId,
                init: async ()=>createInitialScopeData(this._session.value.deviceId, timestamp, {
                        sessions: 1
                    })
            }, {
                trusted: true
            }) : undefined;
            this._device = device;
            if ((device === null || device === void 0 ? void 0 : device.value) && device.status !== VariableResultStatus.Created && ((_this_session = this.session) === null || _this_session === void 0 ? void 0 : _this_session.isNew)) {
                // A new session started on an existing device.
                this._device = await this.env.storage.set({
                    scope: "device",
                    key: SCOPE_INFO_KEY,
                    entityId: this.deviceId,
                    patch: (device)=>device && {
                            ...device,
                            sessions: device.sessions + 1,
                            lastSeen: this.session.lastSeen
                        }
                });
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
                value: DataUsage.serialize(this.consent)
            };
            const splits = {};
            if ((_this__clientDeviceCache = this._clientDeviceCache) === null || _this__clientDeviceCache === void 0 ? void 0 : _this__clientDeviceCache.touched) {
                // We have updated device data and need to refresh to get whatever other processes may have written (if any).
                await consumeQueryResults((cursor)=>this.query({
                        scope: "device",
                        sources: [
                            "*"
                        ]
                    }, {
                        cursor
                    }), (variables)=>{
                    forEach2(variables, (variable)=>{
                        var _variable_schema;
                        var _splits, _purpose;
                        forEach2(DataPurposes.parse((_variable_schema = variable.schema) === null || _variable_schema === void 0 ? void 0 : _variable_schema.usage.purposes, {
                            names: true
                        }), ([purpose])=>{
                            var _;
                            return ((_ = (_splits = splits)[_purpose = purpose]) !== null && _ !== void 0 ? _ : _splits[_purpose] = []).push([
                                variable.key,
                                variable.schema.usage.classification,
                                variable.version,
                                variable.value,
                                variable.schema.usage.purposes
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
                for (const purpose of DataPurposes.parse(this.consent, {
                    names: true
                })){
                    const remove = isAnonymous || !splits[purpose];
                    const cookieName = this._requestHandler._cookieNames.deviceByPurpose[purpose];
                    if (remove) {
                        this.cookies[cookieName] = {};
                    } else if (splits[purpose]) {
                        this.cookies[cookieName] = {
                            httpOnly: true,
                            maxAge: Number.MAX_SAFE_INTEGER,
                            sameSitePolicy: "None",
                            essential: purpose === "necessary",
                            value: this.httpClientEncrypt(splits[purpose])
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
    constructor({ disabled = false, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, sessionReferenceId, defaultConsent, trustedContext }){
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
        _define_property$8(this, "_defaultConsent", void 0);
        _define_property$8(this, "host", void 0);
        _define_property$8(this, "path", void 0);
        _define_property$8(this, "url", void 0);
        /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
   *
   * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
   * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
   *
   */ _define_property$8(this, "_sessionReferenceId", void 0);
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
        this._sessionReferenceId = sessionReferenceId;
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
    client: 0,
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
        return [
            stationary ? "" : request.clientIp,
            ...this._headers.map((header)=>request.headers[header] + "")
        ].join("&");
    }
    constructor({ headers = [
        "accept-encoding",
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
                        let value = setter.patch ? setter.patch(// The patch function runs on uncensored data so external logic do not have to deal with missing properties.
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
                        if (!setter.patch && setter.version !== (currentVariable === null || currentVariable === void 0 ? void 0 : currentVariable.version)) {
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
        for (let query of this._storage.splitSourceQueries(filters)){
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

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, EventLogger, InMemoryStorage, MAX_CACHE_HEADERS, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, SchemaBuilder, Tracker, TrackerEnvironment, VariableSplitStorage, VariableStorageCoordinator, addSourceTrace, bootstrap, clearTrace, copyTrace, getErrorMessage, getTrace, isTransientErrorObject, isValidationError, isWritableStorage, requestCookieHeader, requestCookies, serializeLogMessage, withTrace };

import { isConsentEvent, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, DataUsage, isTrackedEvent, isOrderEvent, isCartEvent, TypeResolver, isPassiveEvent, JsonSchemaAdapter, CORE_SCHEMA_NS, DataPurposes, ValidationError, DataClassification, consumeQueryResults, toVariableResultPromise, VariableResultStatus, isVariableResult, extractKey, filterKeys, VariableServerScope, formatVariableResult, VALIDATION_ERROR_SYMBOL, formatValidationErrors, formatVariableKey, isTransientError, isSuccessResult, filterRangeValue } from '@tailjs/types';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m7290rtl" ;
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
// #endregion
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
 */ const findDeclaringScope = (target)=>target == null ? target : globalThis.window ? findPrototypeFrame(window, getRootPrototype(target)) : globalThis;
let stopInvoked = false;
const skip2 = Symbol();
const stop2 = (value)=>(stopInvoked = true, value);
// #region region_iterator_implementations
const forEachSymbol = Symbol();
const asyncIteratorFactorySymbol = Symbol();
const symbolIterator = Symbol.iterator;
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
    scope.Array.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
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
    scope.Object.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>{
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
    scope.Object.prototype[asyncIteratorFactorySymbol] = function() {
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
        scope.Map.prototype,
        scope.WeakMap.prototype,
        scope.Set.prototype,
        scope.WeakSet.prototype,
        // Generator function
        Object.getPrototypeOf(function*() {})
    ]){
        proto[forEachSymbol] = forEachIterable();
        proto[asyncIteratorFactorySymbol] = proto[symbolIterator];
    }
    scope.Number.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(range2(target), projection, mapped, seed, context);
    scope.Number.prototype[asyncIteratorFactorySymbol] = range2;
    scope.Function.prototype[forEachSymbol] = (target, projection, mapped, seed, context)=>genericForEachIterable(traverse2(target), projection, mapped, seed, context);
    scope.Function.prototype[asyncIteratorFactorySymbol] = traverse2;
    return retry();
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
const forEach2 = (source, projection, seed, context)=>{
    try {
        return source ? source[forEachSymbol](source, projection, undefined, seed, context) : source == null ? source : undefined;
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEach2(source, projection, seed, context));
    }
};
let map2 = (source, projection, target = [], seed, context = source)=>{
    try {
        return !source && source !== 0 && source !== "" ? source == null ? source : undefined : source[forEachSymbol](source, projection, target, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>map2(source, projection, target, seed, context));
    }
};
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
let forEachAwait2 = (source, projection, seed, context)=>{
    try {
        return iterateAsync2(source, projection, undefined, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>forEachAwait2(source, projection, seed, context));
    }
};
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
const distinct2 = (source)=>source == null ? source : source instanceof Set ? source : new Set(source[symbolIterator] && typeof source !== "string" ? source : [
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
        prototype[pushSymbol] = function(keys) {
            for (const key of keys)key !== void 0 && this.add(key);
            return this;
        };
    }
    scope.Array.prototype[pushSymbol] = function(values) {
        this.push(...values);
        return this;
    };
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
let get2 = (source, key, initialize)=>{
    try {
        if (source == null) return source;
        let value = source[getSymbol](key);
        if (value === void 0 && (value = typeof initialize === "function" ? initialize() : initialize) !== void 0) {
            if (value === null || value === void 0 ? void 0 : value.then) return value.then((value)=>value === void 0 ? value : source[setSymbol](key, value));
            source[setSymbol](key, value);
        }
        return value;
    } catch (e) {
        return ensureAssignImplementations(source, e, ()=>get2(source, key, initialize));
    }
};
let add2 = (target, key, value)=>{
    try {
        return (target === null || target === void 0 ? void 0 : target[setSymbol](key, value, true)) === true;
    } catch (e) {
        return ensureAssignImplementations(target, e, ()=>add2(target, key, value));
    }
};
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
/**
 * Itemizes an array of items by separating them with commas and a conjunction like "and" or "or".
 */ const itemize2 = (values, separators, result, rest)=>{
    if (!values && values !== 0) return values == null ? values : undefined;
    if (typeof separators === "function") {
        return itemize2(map2(values, separators), result, rest);
    }
    const first = [];
    const last = forEach2(values, (item, _, prev)=>isEmptyString(item) ? skip2 : (prev && first.push(prev), item.toString()));
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

function bootstrap({ host, endpoint = "./_t.js", schemas, cookies, extensions, storage, json, encryptionKeys, debugScript, environment, defaultConsent }) {
    var _map2;
    return new RequestHandler({
        host,
        schemas,
        endpoint,
        cookies,
        extensions: (_map2 = map2(extensions, (extension)=>typeof extension === "function" ? extension : async ()=>extension)) !== null && _map2 !== void 0 ? _map2 : [],
        storage,
        json,
        encryptionKeys,
        debugScript,
        environment,
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
    "version": "0.37.0-canary.1",
    "types": {
        "ScopeInfo": {
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "trusted-write",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ScopeInfo@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#DataUsage@0.37.0-canary.1"
            ],
            "properties": {}
        },
        "DataUsage": {
            "version": "0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#DataPurposes@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "The base type for all events that are tracked.\n\nThe naming convention is:\n- If the event represents something that can also be considered an entity like a \"page view\", \"user location\" etc. the name should be that.\n- If the event indicates something that happened, like \"session started\", \"view ended\" etc. the name should end with a verb in the past tense.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#EventMetadata@0.37.0-canary.1",
                    "description": "These properties are used to track the state of the event as it gets collected, and is not persisted.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "session": {
                    "reference": "urn:tailjs:core#Session@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
                        "reference": "urn:tailjs:core#Tag@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#UserConsent@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
            ],
            "properties": {
                "components": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "The component definition related to a user activation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.37.0-canary.1"
            ],
            "properties": {
                "content": {
                    "item": {
                        "reference": "urn:tailjs:core#ActivatedContent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#Rectangle@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.37.0-canary.1",
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
                "urn:tailjs:core#Personalizable@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "personalization": {
                    "item": {
                        "reference": "urn:tailjs:core#Personalization@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.37.0-canary.1"
            ],
            "properties": {
                "source": {
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
                    "description": "The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.\n\nIf you are using multiple services/system for personalization you can add this to  {@link  ExternalReference.source } .\n\nIf more than one component was changed by the same personalization logic they will share this source, but may have different variables.\n\nFor example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the  {@link  Personalization.source }  corresponding to the test, but have different  {@link  Personalization.variable  } s.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "variables": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationVariable@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#PersonalizationVariant@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A reference to a variable and its value in personalization.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A reference to the data/content item related to a variant in personalization.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
            ],
            "properties": {
                "sources": {
                    "item": {
                        "reference": "urn:tailjs:core#PersonalizationSource@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A specific aspect changed for a page or component for personalization as part of a  {@link  PersonalizationVariant } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The content definition related to a user activation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.37.0-canary.1"
            ],
            "properties": {
                "rect": {
                    "reference": "urn:tailjs:core#Rectangle@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Represents a content item that can be rendered or modified via a  {@link  Component } \n\nIf the content is personalized please add the criteria",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
                "urn:tailjs:core#Tagged@0.37.0-canary.1"
            ],
            "properties": {
                "commerce": {
                    "reference": "urn:tailjs:core#CommerceData@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CommerceData": {
            "version": "0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Position@0.37.0-canary.1",
                "urn:tailjs:core#Size@0.37.0-canary.1"
            ],
            "properties": {}
        },
        "Position": {
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Rectangle@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#Rectangle@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "FormEvent": {
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#FormField@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
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
                    "classification": "direct",
                    "readonly": false,
                    "visibility": "public",
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
            "version": "0.37.0-canary.1",
            "description": "The event is triggered when a component is clicked.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The event is triggered when a user probably wanted to click a component but nothing happened.\n\nUsed for UX purposes where it may indicate that navigation is not obvious to the users. This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.\n\nThis applies only to components that have click tracking configured,  either via  {@link  TrackingSettings.clicked  } , \"track-clicks\" in the containing DOM or \"--track-clicks\" via CSS.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#Position@0.37.0-canary.1"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Basic information about an HTML element that is associated with a component.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ElementInfo@0.37.0-canary.1"
            ],
            "properties": {
                "component": {
                    "reference": "urn:tailjs:core#Component@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ComponentViewEvent": {
            "version": "0.37.0-canary.1",
            "description": "This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#Domain@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#SearchFilter@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#SearchResult@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A filter that applies to a field in a search query.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A search filter that applies to a single field that must match a defined entity (e.g. \"manufacturer\").",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
            ],
            "properties": {
                "references": {
                    "item": {
                        "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1",
                "urn:tailjs:core#SessionScoped@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.37.0-canary.1"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "This event is sent a user navigates between views. (page, screen or similar).\n\nThis event does not",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#Domain@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type@0.37.0-canary.1",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#View@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Content@0.37.0-canary.1",
                "urn:tailjs:core#Personalizable@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "This event is triggered whenever the user's location changes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1",
                "urn:tailjs:core#SessionScoped@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3)",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.\n\nThis event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device. In the same way, such information is cleared if the user opts out.\n\nBackends are expected to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.\n\nThe user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with  {@link  nonEssentialTracking  }  `false` revokes the consent if already given. The event should ideally be sent from a cookie disclaimer.\n\nGranular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events. This event only ensures that non-essential tracking information is not stored at the user unless consent is given.\n\nAlso, \"consent\" and \"event\" rhymes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#UserConsent@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": true
                }
            }
        },
        "CommerceEvent": {
            "version": "0.37.0-canary.1",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
            ],
            "properties": {}
        },
        "CartUpdatedEvent": {
            "version": "0.37.0-canary.1",
            "description": "Indicates that a shopping cart was updated.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1",
                "urn:tailjs:core#CommerceEvent@0.37.0-canary.1",
                "urn:tailjs:core#CartEventData@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity@0.37.0-canary.1",
                "urn:tailjs:core#ExternalUse@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Base information for the amount of an item added to an  {@link  Order }  or cart that is shared between  {@link  CartUpdatedEvent }  and  {@link  OrderLine } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceData@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "An order submitted by a user.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.37.0-canary.1",
                "urn:tailjs:core#Order@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Represents an order for tracking purposes.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Tagged@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#OrderLine@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#OrderQuantity@0.37.0-canary.1",
                "urn:tailjs:core#Tagged@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The shopping cart was abandoned. Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.37.0-canary.1",
                "urn:tailjs:core#Order@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Base event for events that related to an order changing status.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "An order was accepted.\n\nThis may be useful to track if some backend system needs to validate if the order submitted by the user is possible, or just for monitoring whether your site is healthy and actually processes the orders that come in.\n\nThis event should also imply that the user got a confirmation.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "An order was cancelled.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "An order was cancelled.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Events related to order payments.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#CommerceEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "The payment for an order was accepted.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A payment for the order was rejected.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#PaymentEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Events related to users signing in, out etc..",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
            ],
            "properties": {}
        },
        "SignInEvent": {
            "version": "0.37.0-canary.1",
            "description": "A user signed in.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "A user actively signed out. (Session expiry doesn't count).",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#AuthenticationEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.",
            "abstract": true,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
            ],
            "properties": {}
        },
        "ImpressionTextStats": {
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "The event is triggered when more than 75 % of the component's has been visible for at least 1 second, or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.\n\n\nThis only gets tracked for components that have impression tracking configured,  either via  {@link  TrackingSettings.impressions } , \"track-impressions\" in the containing DOM or \"--track-impressions\" via CSS.\n\nNote that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via  {@link  TrackingSettings.impressions } .",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#UserInteractionEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type@0.37.0-canary.1",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "An event that can be used to reset the current session and optionally also device. Intended for debugging and not relayed to backends.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1",
                "urn:tailjs:core#SystemEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#Component@0.37.0-canary.1"
            ],
            "properties": {
                "track": {
                    "reference": "urn:tailjs:core#TrackingSettings@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#Domain@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "ImpressionEvent_regions_type": {
            "version": "0.37.0-canary.1",
            "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [],
            "properties": {
                "top": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.37.0-canary.1",
                    "description": "The top 25 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "middle": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.37.0-canary.1",
                    "description": "The middle 25 - 75 % of the component.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "bottom": {
                    "reference": "urn:tailjs:core#ImpressionRegionStats@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#FormEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
                        "reference": "urn:tailjs:core#FormField@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ComponentClickEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ComponentClickIntentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clicks": {
                    "item": {
                        "reference": "urn:tailjs:core#Position@0.37.0-canary.1"
                    },
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "clickables": {
                    "item": {
                        "reference": "urn:tailjs:core#ComponentElementInfo@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ComponentViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#NavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#Domain@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ScrollEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
                    "description": "Information about the activated element, if any.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "offset": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#SearchEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
                        "reference": "urn:tailjs:core#SearchFilter@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#SearchResult@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#SessionStartedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#UserAgentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#UserAgentLanguage@0.37.0-canary.1"
                    },
                    "description": "The user's language preferences as configured in the user's device.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "timezone": {
                    "reference": "urn:tailjs:core#UserAgentEvent_timezone_type@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "screen": {
                    "reference": "urn:tailjs:core#UserAgentEvent_screen_type@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ViewEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ViewEvent_utm_type@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#Domain@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ViewEvent_externalReferrer_type@0.37.0-canary.1",
                    "description": "External referrer. Internal referrers follows from the event's  {@link  TrackedEvent [\"relatedView\"] }  field.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#View@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#SessionLocationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "indirect",
                    "purposes": {
                        "performance": true
                    },
                    "required": false
                },
                "city": {
                    "reference": "urn:tailjs:core#GeoEntity@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#AnchorNavigationEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ConsentEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#UserConsent@0.37.0-canary.1",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                }
            }
        },
        "CartUpdatedEvent_patch": {
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#CartUpdatedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ExternalReference@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#OrderEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#OrderLine@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#CartAbandonedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#OrderLine@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#OrderConfirmedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#OrderCancelledEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#OrderCompletedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#PaymentAcceptedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#PaymentRejectedEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#SignInEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#SignOutEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ImpressionEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                        "reference": "urn:tailjs:core#ActivatedComponent@0.37.0-canary.1"
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "The time the event happened relative to the view were it was generated.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "pos": {
                    "reference": "urn:tailjs:core#ScreenPosition@0.37.0-canary.1",
                    "description": "The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "viewport": {
                    "reference": "urn:tailjs:core#Viewport@0.37.0-canary.1",
                    "description": "The viewport of the user's browser when the event happened.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "element": {
                    "reference": "urn:tailjs:core#ElementInfo@0.37.0-canary.1",
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
                    "reference": "urn:tailjs:core#ViewTimingData@0.37.0-canary.1",
                    "description": "For how long the component was visible. This counter starts after an impression has been detected.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "regions": {
                    "reference": "urn:tailjs:core#ImpressionEvent_regions_type@0.37.0-canary.1",
                    "description": "Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.",
                    "readonly": false,
                    "visibility": "public",
                    "classification": "anonymous",
                    "purposes": {},
                    "required": false
                },
                "text": {
                    "reference": "urn:tailjs:core#ImpressionTextStats@0.37.0-canary.1",
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
            "version": "0.37.0-canary.1",
            "description": "Patch type for urn:tailjs:core#ResetEvent.",
            "abstract": false,
            "readonly": false,
            "visibility": "public",
            "classification": "anonymous",
            "purposes": {},
            "extends": [
                "urn:tailjs:core#TrackedEvent@0.37.0-canary.1"
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
                "reference": "urn:tailjs:core#SessionInfo@0.37.0-canary.1",
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
                "reference": "urn:tailjs:core#UserConsent@0.37.0-canary.1",
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
                "reference": "urn:tailjs:core#DeviceInfo@0.37.0-canary.1",
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
        text: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,y,m,w,k,S,T,x,I,A;function U(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var M=(e,t=e=>Error(e))=>{throw eo(e=e4(e))?t(e):e},F=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ef(e)&&ef(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!F(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},q=(e,t,...r)=>e===t||0<r.length&&r.some(t=>q(e,t)),z=(e,t)=>null!=e?e:M(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),R=(e,t=!0,r)=>{try{return e()}catch(e){return eg(t)?ed(e=t(e))?M(e):e:en(t)?console.error(t?M(e):e):t}finally{null!=r&&r()}};class P extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),U(this,\"_action\",void 0),U(this,\"_result\",void 0),this._action=e}}var D=e=>new P(async()=>e4(e)),B=async(e,t=!0,r)=>{try{return await e4(e)}catch(e){if(!en(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,J=e=>!!e,L=e=>e===G,V=void 0,K=Number.MAX_SAFE_INTEGER,H=!1,G=!0,X=()=>{},Z=e=>e,Y=e=>null!=e,Q=Symbol.iterator,ee=Symbol.asyncIterator,et=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:V,er=(e,t)=>eg(t)?e!==V?t(e):V:(null==e?void 0:e[t])!==V?e:V,en=e=>\"boolean\"==typeof e,ei=et(en,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||V))),ea=e=>e!==H,el=e=>\"number\"==typeof e,eo=e=>\"string\"==typeof e,eu=et(eo,e=>null==e?void 0:e.toString()),es=Array.isArray,ed=e=>e instanceof Error,ev=(e,t=!1)=>null==e?V:!t&&es(e)?e:ey(e)?[...e]:[e],ec=e=>e&&\"object\"==typeof e,ef=e=>(null==e?void 0:e.constructor)===Object,ep=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),eh=e=>\"symbol\"==typeof e,eg=e=>\"function\"==typeof e,ey=(e,t=!1)=>!(null==e||!e[Q]||\"string\"==typeof e&&!t),em=e=>e instanceof Map,eb=e=>e instanceof Set,ew=(e,t)=>null==e?V:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ek=(e,t,r)=>e[0]===t&&e[e.length-1]===r,eS=e=>eo(e)&&(ek(e,\"{\",\"}\")||ek(e,\"[\",\"]\")),eT=!1,ex=e=>(eT=!0,e),eI=e=>null==e?V:eg(e)?e:t=>t[e],eA=(e,t,r)=>(null!=t?t:r)!==V?(e=eI(e),null==t&&(t=0),null==r&&(r=K),(n,i)=>t--?V:r--?e?e(n,i):n:r):e,eE=e=>null==e?void 0:e.filter(Y),eN=(e,t,r,n)=>null==e?[]:!t&&es(e)?eE(e):e[Q]?function*(e,t){if(null!=e)if(t){t=eI(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),eT){eT=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===V?t:eA(t,r,n)):ec(e)?function*(e,t){t=eI(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),eT){eT=!1;break}}}(e,eA(t,r,n)):eN(eg(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eO=(e,t,r,n)=>eN(e,t,r,n),e$=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Q]||n&&ec(t))for(var a of i?eN(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eN(e,t,i,a),r+1,n,!1),e_=(e,t,r,n)=>{if(t=eI(t),es(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!eT;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return eT=!1,a}return null!=e?tZ(eO(e,t,r,n)):V},ej=(e,t,r,n)=>null!=e?new Set([...eO(e,t,r,n)]):V,eC=(e,t,r=1,n=!1,i,a)=>tZ(e$(e,t,r,n,i,a)),eU=(...e)=>{var t;return eR(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...tZ(e))),t},eM=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,eT)){eT=!1;break}return i},eF=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,eT)){eT=!1;break}return r},eq=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,eT){eT=!1;break}return r},ez=(e,t,r,n)=>{var i;if(null!=e){if(es(e))return eM(e,t,r,n);if(r===V){if(e[Q])return eF(e,t);if(\"object\"==typeof e)return eq(e,t)}for(var a of eN(e,t,r,n))null!=a&&(i=a);return i}},eR=ez,eP=async(e,t,r,n)=>{var i,a;if(null==e)return V;for(a of eO(e,t,r,n))if(null!=(a=await a)&&(i=a),eT){eT=!1;break}return i},eD=(e,t)=>{if(null==e)return V;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eB=(e,t,r)=>{var n,i,a;return null==e?V:en(t)||r?(a={},eR(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>eR(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eD(e_(e,t?(e,r)=>er(t(e,r),1):e=>er(e,1)))},eW=(e,t,r,n,i)=>{var l=()=>eg(r)?r():r;return null!=(e=ez(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eJ=(e,t,r,n)=>e_(e,(e,r)=>e&&null!=t&&t(e,r)?e:V,r,n),eV=(e,...t)=>null==e?V:el(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||el(i)&&e<i?i:e,V,t[2],t[3]),eH=(e,t,r,n)=>{var i;return null==e?V:ef(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:J))?i:ez(e,t?(e,r)=>!!t(e,r)&&ex(!0):()=>ex(!0),r,n))&&i},eG=(e,t=e=>e)=>{var r;return null!=(r=ev(e))&&r.sort((e,r)=>t(e)-t(r)),e},eX=(e,t,r)=>(e.constructor===Object||es(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eZ=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=eg(r)?r():r)&&eX(e,t,n),n},eY=(e,...t)=>(eR(t,t=>eR(t,([t,r])=>{null!=r&&(ef(e[t])&&ef(r)?eY(e[t],r):e[t]=r)})),e),eQ=(e,t,r,n)=>{if(e)return null!=r?eX(e,t,r,n):(eR(t,t=>es(t)?eX(e,t[0],t[1]):eR(t,([t,r])=>eX(e,t,r))),e)},e0=(e,t,r)=>{var n;return ep(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ep(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ef(e)&&delete e[t],e},e2=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eZ(e,t),ep(e,\"delete\")?e.delete(t):delete e[t],r},e6=(e,t)=>{if(e)return es(t)?(es(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e6(e,t)):es(e)?t<e.length?e.splice(t,1)[0]:void 0:e2(e,t)},e4=e=>eg(e)?e():e,e5=(e,t=-1)=>es(e)?t?e.map(e=>e5(e,t-1)):[...e]:ef(e)?t?eB(e,([e,r])=>[e,e5(r,t-1)]):{...e}:eb(e)?new Set(t?e_(e,e=>e5(e,t-1)):e):em(e)?new Map(t?e_(e,e=>[e[0],e5(e[1],t-1)]):e):e,e3=(e,...t)=>null==e?void 0:e.push(...t),e8=(e,...t)=>null==e?void 0:e.unshift(...t),e9=(e,t)=>{var r,i,a;if(e)return ef(t)?(a={},ef(e)&&(eR(e,([e,l])=>{if(!F(l,t[e],-1)){if(ef(r=l)){if(!(l=e9(l,t[e])))return;[l,r]=l}else el(l)&&el(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e5(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e7=\"undefined\"!=typeof performance?(e=G)=>e?Math.trunc(e7(H)):performance.timeOrigin+performance.now():Date.now,te=(e=!0,t=()=>e7())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tr=(e,t=0)=>{var e=eg(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=tu(!0).resolve(),c=te(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await B(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!a,l)};function tn(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class ti{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ta,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tn(this,\"_promise\",void 0),this.reset()}}class ta{then(e,t){return this._promise.then(e,t)}constructor(){var e;tn(this,\"_promise\",void 0),tn(this,\"resolve\",void 0),tn(this,\"reject\",void 0),tn(this,\"value\",void 0),tn(this,\"error\",void 0),tn(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===V||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var to=(e,t)=>null==e||isFinite(e)?!e||e<=0?e4(t):new Promise(r=>setTimeout(async()=>r(await e4(t)),e)):M(`Invalid delay ${e}.`),tu=e=>new(e?ti:ta),td=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},et=()=>{var e,t=new Set;return[(r,n)=>{var i=td(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tc=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tp=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?V:null!=n[t]?t:r?M(`The ${e} \"${t}\" is not defined.`):V,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},th=Symbol(),tg=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(eo(t)?t=[t]:es(t))&&tJ(t,e=>1<(i=l[1].split(e)).length?tq(i):V)||(l[1]?[l[1]]:[]),l):V},ty=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?V:tS(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&V,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):V,path:v,query:!1===t?c:c?tm(c,{...n,delimiters:t}):V,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":V),e}),tm=(e,t)=>tb(e,\"&\",t),tb=(e,t,{delimiters:r=!0,...n}={})=>{e=tL(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=tg(e,{...n,delimiters:!1===r?[]:!0===r?V:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tF}),t=rt(tH(e,!1),([e,t])=>[e,!1!==r?1<t.length?tQ(t):t[0]:t.join(\",\")]);return t&&(t[th]=e),t},tw=(e,t)=>t&&null!=e?t.test(e):V,tk=(e,t,r)=>tS(e,t,r,!0),tS=(e,t,i,a=!1)=>null==(null!=e?e:t)?V:i?(r=V,a?(n=[],tS(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:V,tT=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tx=/\\z./g,tI=(e,t)=>(t=rl(ej(eJ(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tx,tA={},tE=e=>e instanceof RegExp,tN=(r,n=[\",\",\" \"])=>{var i;return tE(r)?r:es(r)?tI(e_(r,e=>null==(e=tN(e,n))?void 0:e.source)):en(r)?r?/./g:tx:eo(r)?null!=(i=(e=tA)[t=r])?i:e[t]=tS(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tI(e_(tO(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rl(n,tT)}]`)),e=>e&&`^${rl(tO(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tT(t$(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):V},tO=(e,t,r=!0)=>null==e?V:r?tO(e,t,!1).filter(Z):e.split(t),t$=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,t_=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eQ(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},tj=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},tC=(e,t)=>{if(!e||tj(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=tC(r.contentWindow,t))return e}catch(e){}},tU=e=>null==e?e:globalThis.window?tC(window,tj(e)):globalThis,tM=!1,tF=Symbol(),tq=e=>(tM=!0,e),tz=Symbol(),tR=Symbol(),tP=Symbol.iterator,tD=(e,t,r)=>{if(null==e||e[tz])throw t;e=tU(e);if(!e)throw t;var l,i=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tF){if(a===tq)break;if(n=a,r&&r.push(a),tM){tM=!1;break}}return r||n},a=(e.Array.prototype[tz]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tF){if(l===tq)break;if(n=l,r&&r.push(l),tM){tM=!1;break}}return r||n},i());for(l of(e.Object.prototype[tz]=(e,t,r,n,l)=>{if(e[tP])return(e.constructor===Object?a:Object.getPrototypeOf(e)[tz]=i())(e,t,r,n,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=t?t(u,s++,n,l):u)!==tF){if(u===tq)break;if(n=u,r&&r.push(u),tM){tM=!1;break}}return r||n},e.Object.prototype[tR]=function(){var t,e;return this[tP]||this[ee]?this.constructor===Object?null!=(e=this[ee]())?e:this[tP]():((e=Object.getPrototypeOf(this))[tR]=null!=(t=e[ee])?t:e[tP],this[tR]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))l[tz]=i(),l[tR]=l[tP];return e.Number.prototype[tz]=(e,t,r,n,i)=>a(tB(e),t,r,n,i),e.Number.prototype[tR]=tB,e.Function.prototype[tz]=(e,t,r,n,i)=>a(tW(e),t,r,n,i),e.Function.prototype[tR]=tW,r()};function*tB(e=this){for(var t=0;t<e;t++)yield t}function*tW(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tJ=(e,t,r,n)=>{try{return e?e[tz](e,t,void 0,r,n):null==e?e:void 0}catch(i){return tD(e,i,()=>tJ(e,t,r,n))}},tL=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[tz](e,t,r,n,i):null==e?e:void 0}catch(a){return tD(e,a,()=>tL(e,t,r,n,i))}},tV=(e,t=!0,r=!1)=>tL(e,!0===t?e=>null!=e?e:tF:t?t.has?e=>null==e||t.has(e)===r?tF:e:(e,n,i)=>!t(e,n,i)===r?e:tF:e=>e||tF),tK=(e,t,r=-1,n=[],i,a=e)=>tL(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tK(e,void 0,r-1,n,e),tF):e,n,i,a),tH=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tJ(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t8(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tX=e=>void 0===e?[]:null!=e&&e[tP]&&\"string\"!=typeof e?e:[e],tZ=e=>null==e||es(e)?e:e[tP]&&\"string\"!=typeof e?[...e]:[e],tQ=(e,...t)=>{var r,n;for(n of e=!t.length&&ey(e)?e:[e,...t])if(null!=n){if(ey(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},t0=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),t1=(e,t,r)=>tZ(e).sort(\"function\"==typeof t?(e,n)=>t0(t(e),t(n),r):es(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=t0(t[a](e),t[a](n),r);return i}:(e,t)=>t0(e,t,r):(e,r)=>t0(e,r,t)),t2=Object.keys,t6=Symbol(),t4=Symbol(),t5=Symbol(),t3=(e,t,r)=>{if(null==e||e[t4])throw t;var i,e=tU(e);if(!e||e.Object.prototype[t6])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[t6]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[t4]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[t6]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[t4]=i.has,i[t5]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[t5]=function(e){return this.push(...e),this},[e.Object,e.Array]))i[t6]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[t4]=function(e){return this[e]};return r()},t8=(e,t,r)=>{try{if(null==e)return e;var n=e[t4](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t6](t,r));e[t6](t,n)}return n}catch(n){return t3(e,n,()=>t8(e,t,r))}},t9=(e,t,r)=>{try{return!0===(null==e?void 0:e[t6](t,r,!0))}catch(n){return t3(e,n,()=>t9(e,t,r))}},t7=(e,t,r)=>{try{return e[t6](t,r),r}catch(n){return t3(e,n,()=>t7(e,t,r))}},re=(e,...t)=>{try{return null==e?e:e[t5](t)}catch(r){return t3(e,r,()=>re(e,...t))}},rt=(e,t)=>{var r={};return tJ(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tF&&e!==tq)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tF&&e!==tq)?r[e[0]]=e[1]:e),r},rr=(e,...t)=>{try{return(null==e?void 0:e.constructor)===Object?tJ(t,t=>tJ(t,t=>t&&(e[t[0]]=t[1]))):tJ(t,t=>tJ(t,t=>t&&e[t6](t[0],t[1]))),e}catch(r){return t3(e,r,()=>rr(e,...t))}},rn=(e,t,r={})=>{if(null!=e){var l,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(l of tX(t))tJ(l,t=>{var o,u;t&&([t,o]=t,u=e[t],(a?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?rn(u,o,r):i&&(e[t]=o))})}return e},ri=(e,t)=>null==e?e:rt(t,t=>null!=e[t]||t in e?[t,e[t]]:tF),ra=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),rl=(e,t,r)=>null==e?e:ey(e)?tV(\"function\"==typeof t?tL(e,t):(r=t,e),ra,!0).join(null!=r?r:\"\"):ra(e)?\"\":e.toString(),ro=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?ro(tL(e,t),r,n):(i=[],n=tJ(e,(e,t,r)=>ra(e)?tF:(r&&i.push(r),e.toString())),[t,o]=es(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},ru=tp(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rs=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rd=rt(rs,e=>[e,e]),rv=(Object.freeze(eD(rs.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),rc=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rf={names:rs,parse(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),eo(e)&&(e=e.split(\",\")),es(e)){var i,n={};for(i of e)rd[i]?\"necessary\"!==i&&(n[i]=!0):r&&M(`The purpose name '${i}' is not defined.`);e=n}return t?(t=t2(e)).length?t:[\"necessary\"]:e},getNames:e=>tL(e,([e,t])=>t?e:tF),get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rv(i,n))&&!t[rv(i,n)])return!1;if(e=rc(e,n),t=rc(t,n),r){for(var a in t)if(rd[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(rd[a]&&e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(rd[a]&&e[a]){if(t[a])return!0;l=!0}return!l}},rp=(tp(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${ro(rf.parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),rh={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rf.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rf.parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=ru.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rf.parse(a,{validate:!1}))?e:{}}):t?rh.clone(t):{classification:\"anonymous\",purposes:{}}}},rg=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rm=Symbol(),rb=e=>void 0===e?\"undefined\":tc(JSON.stringify(e),40,!0),rw=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rk=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rS=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rT=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rx=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rI=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rb(t)+` ${r}.`}),rm),rA=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rA((t?parseInt:parseFloat)(e),t,!1),rE={},rs=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rE[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rE[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rI(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rw.test(e)&&!isNaN(+new Date(e))?e:rI(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rA(e,!1,!1)){if(!rA(e,!0,!1))return rI(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!rk.test(e)||isNaN(+new Date(e)))return rI(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rA(e,!0,!1)?+e:rI(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rA(e,!0,!1)?+e:rI(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rA(e,!1,!1)?e:rI(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rT.test(e)?e:rI(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rT.exec(e);return r?r[2]?e:rI(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rI(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rT.exec(e);return r?\"urn\"!==r[1]||r[2]?rI(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rI(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rx.test(e)?e.toLowerCase():rI(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rI(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rS.exec(e))?void 0:r[1].toLowerCase():null)?r:rI(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rb(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rm&&e.length>d?rI(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rm||(null==c||c<=e)&&(null==f||e<=f)?e:rI(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rm)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+ro(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rm||u.has(e)?e:rI(t,e,p)}(e=>null==e||e instanceof Set||new Set(e[tP]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tp(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rO=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),r$=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},r_=((E=a=a||{})[E.Success=200]=\"Success\",E[E.Created=201]=\"Created\",E[E.NotModified=304]=\"NotModified\",E[E.Forbidden=403]=\"Forbidden\",E[E.NotFound=404]=\"NotFound\",E[E.BadRequest=405]=\"BadRequest\",E[E.Conflict=409]=\"Conflict\",E[E.Error=500]=\"Error\",(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status)),rj=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rC(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rU=e=>{var t=rO(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${a[e.status]}.`:`${t} failed with status ${e.status} - ${a[e.status]}${r?` (${r})`:\"\"}.`};class rM extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rC(this,\"succeeded\",void 0),rC(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rj(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rj(e,!1)))?t:[]}}var rF=e=>!!e.callback,rq=e=>!!e.poll,rz=Symbol(),rR=(e,t,r,{poll:n,logCallbackError:i}={})=>{var l=es(t)?t:[t],o=[],u=(async()=>{var s,d,u,v,t=await r(l.filter(e=>e)),a=[];for(u of l)u&&null!=(d=t.get(u))&&(d[rz]=u,rF(u)&&a.push([u,e=>!0===u.callback(e)]),rq(u))&&a.push([u,e=>{var t;return!r_(e,!1)||(t=!r_(e,!1)||u.poll(e.value,e[rz]===u,s),s=e.value,t)}]);for([u,v]of a)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${rO(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),s=async(r,n)=>{var v,c,f,i=await u,s=[],d=[];for(v of l)v?null==(f=i.get(v))?d.push(`No result for ${rO(v)}.`):!r||rj(f,n||\"set\"===e)?s.push(r&&f.status===a.NotFound?void 0:1<r?null!=(c=f.value)?c:void 0:f):d.push(rU(f)):s.push(void 0);if(d.push(...o),d.length)throw 10<d.length&&d.push(`\n(and ${d.splice(10).length} more...)`),new rM(s,d.join(\"\\n\"));return l===t?s:s[0]};return Object.assign(D(()=>s(1,!1)),{as:()=>s(1,!1),all:()=>s(0,!1),require:()=>s(1,!0),value:(e=!1)=>s(2,e),values:(e=!1)=>s(2,e)})},rP=e=>e&&\"string\"==typeof e.type,rD=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rB=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rW=(e,t)=>{var r;return t&&(!(o=e.get(l=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(l,t)},rJ=(e,t=\"\",r=new Map)=>{if(e)return ey(e)?tJ(e,e=>rJ(e,t,r)):eo(e)?tS(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rB(n)+\"::\":\"\")+t+rB(i),value:rB(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rW(r,i)}):rW(r,e),r},rL=tp(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rV=tp(\"variable scope\",{...rL,...rs}),rK=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rH=e=>null!=e&&!!e.scope&&null!=rL.ranks[e.scope],rG=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rX=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rY=()=>()=>M(\"Not initialized.\"),rQ=window,r0=document,r1=r0.body,r2=(e,t)=>!(null==e||!e.matches(t)),r6=K,r4=(e,t,r=(e,t)=>r6<=t)=>{for(var n=0,i=H;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==G&&null!=a),G),n-1)!==H&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==r0&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},r5=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return R(()=>JSON.parse(e),X);case\"h\":return R(()=>nY(e),X);case\"e\":return R(()=>null==n0?void 0:n0(e),X);default:return es(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r5(e,t[0])):void 0}},r3=(e,t,r)=>r5(null==e?void 0:e.getAttribute(t),r),r8=(e,t,r)=>r4(e,(e,n)=>n(r3(e,t,r))),r9=(e,t)=>null==(e=r3(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),r7=e=>null==e?void 0:e.getAttributeNames(),ne=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,nt=e=>null!=e?e.tagName:null,nn=e=>({x:ew(scrollX,e),y:ew(scrollY,e)}),ni=(e,t)=>t$(e,/#.*$/,\"\")===t$(t,/#.*$/,\"\"),na=(e,t,r=G)=>(s=nl(e,t))&&W({xpx:s.x,ypx:s.y,x:ew(s.x/r1.offsetWidth,4),y:ew(s.y/r1.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),nl=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=nu(e),{x:d,y:v}):void 0,nu=(e,t=!0)=>e?(c=e.getBoundingClientRect(),u=t?nn(H):{x:0,y:0},{x:ew(c.left+u.x),y:ew(c.top+u.y),width:ew(c.width),height:ew(c.height)}):void 0,ns=(e,t,r,n={capture:!0,passive:!0})=>(t=tZ(t),td(r,r=>tJ(t,t=>e.addEventListener(t,r,n)),r=>tJ(t,t=>e.removeEventListener(t,r,n)))),nv=()=>({...u=nn(G),width:window.innerWidth,height:window.innerHeight,totalWidth:r1.offsetWidth,totalHeight:r1.offsetHeight}),nc=new WeakMap,nf=e=>nc.get(e),np=(e,t=H)=>(t?\"--track-\":\"track-\")+e,nh=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tJ(r7(e),l=>{var o;return null!=(o=(f=t[0])[p=l])?o:f[p]=(a=H,!eo(n=tJ(t[1],([t,r,n],i)=>tw(l,t)&&(a=void 0,!r||r2(e,r))&&ex(null!=n?n:l)))||(i=e.getAttribute(l))&&!ei(i)||rJ(i,t$(n,/\\-/g,\":\"),r),a)}),ng=()=>{},ny=(e,t)=>{if(h===(h=nx.tags))return ng(e,t);var r=e=>e?tE(e)?[[e]]:ey(e)?eC(e,r):[ef(e)?[tN(e.match),e.selector,e.prefix]:[tN(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tK(h,([,e])=>e,1))]];(ng=(e,t)=>nh(e,n,t))(e,t)},nm=(e,t)=>rl(eU(ne(e,np(t,G)),ne(e,np(\"base-\"+t,G))),\" \"),nb={},nw=(e,t,r=nm(e,\"attributes\"))=>{var n;r&&nh(e,null!=(n=nb[r])?n:nb[r]=[{},tk(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tN(r||n),,t])],t),rJ(nm(e,\"tags\"),void 0,t)},nk=(e,t,r=H,n)=>null!=(r=null!=(r=r?r4(e,(e,r)=>r(nk(e,t,H)),eg(r)?r:void 0):rl(eU(r3(e,np(t)),ne(e,np(t,G))),\" \"))?r:n&&(g=nf(e))&&n(g))?r:null,nS=(e,t,r=H,n)=>\"\"===(y=nk(e,t,r,n))||(null==y?y:ei(y)),nT=(e,t,r,n)=>e&&(null==n&&(n=new Map),nw(e,n),r4(e,e=>{ny(e,n),rJ(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nx={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nI=[],nA=[],nE=(e,t=0)=>e.charCodeAt(t),nO=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nI[nA[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(nA[(16515072&t)>>18],nA[(258048&t)>>12],nA[(4032&t)>>6],nA[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),n$=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nI[nE(e,r++)]<<2|(t=nI[nE(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nI[nE(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nI[nE(e,r++)]);return a},n_={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nj=(e=256)=>e*Math.random()|0,nU={exports:{}},{deserialize:nM,serialize:nF}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i+=String.fromCharCode(a>>10|55296)+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nU.exports=n})(),(E=nU.exports)&&E.__esModule&&Object.prototype.hasOwnProperty.call(E,\"default\")?E.default:E),nq=\"$ref\",nz=(e,t,r)=>eh(e)?V:r?t!==V:null===t||t,nR=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nz(t,n,r)?s(n):V)=>(n!==i&&(i!==V||es(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||eg(e)||eh(e))return V;if(ec(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nq]||(e[nq]=l,u(()=>delete e[nq])),{[nq]:l};if(ef(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!ey(e)||e instanceof Uint8Array||(!es(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return R(()=>{var r;return t?nF(null!=(r=s(e))?r:null):R(()=>JSON.stringify(e,V,n?2:0),()=>JSON.stringify(s(e),V,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nP=e=>{var t,r,n=e=>ec(e)?e[nq]&&(r=(null!=t?t:t=[])[e[nq]])?r:(e[nq]&&delete(t[e[nq]]=e)[nq],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(eo(e)?R(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),V)):null!=e?R(()=>nM(e),()=>(console.error(\"Invalid message received.\",e,Error().stack),V)):e)},nD=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>el(e)&&!0===r?e:u(e=eo(e)?new Uint8Array(tL(e.length,t=>255&e.charCodeAt(t))):t?R(()=>JSON.stringify(e),()=>JSON.stringify(nR(e,!1,n))):nR(e,!0,n),r),a=e=>null==e?V:R(()=>nP(e),V);return t?[e=>nR(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nj()));for(r=0,a[n++]=g(v^16*nj(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nj();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=en(t)?64:t,h(),[l,u]=n_[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?Z:nO)(l(nR(e,!0,n))),e=>null!=e?nP(o(e instanceof Uint8Array?e:(r&&eS(e)?a:n$)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},tp=(nD(),nD(null,{json:!0,decodeJson:!0}),nD(null,{json:!0,prettify:!0}),tO(\"\"+r0.currentScript.src,\"#\")),rs=tO(\"\"+(tp[1]||\"\"),\";\"),nJ=tp[0],nL=rs[1]||(null==(E=ty(nJ,{delimiters:!1}))?void 0:E.host),nV=e=>!(!nL||(null==(e=ty(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nL))!==G),tp=(...e)=>t$(rl(e),/(^(?=\\?))|(^\\.(?=\\/))/,nJ.split(\"?\")[0]),nH=tp(\"?\",\"var\"),nG=tp(\"?\",\"mnt\"),nX=(tp(\"?\",\"usr\"),Symbol()),[nZ,nY]=nD(),[nQ,n0]=[rY,rY],n1=!0,[rs,n6]=et(),n3=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:eo(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[n8,n9]=et(),[n7,ie]=et(),it=e=>ii!==(ii=e)&&n9(ii,io(!0,!0)),ir=e=>ia!==(ia=!!e&&\"visible\"===document.visibilityState)&&ie(ia,!e,il(!0,!0)),ii=(n8(ir),!0),ia=!1,il=te(!1),io=te(!1),iu=(ns(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>it(!1)),ns(window,[\"pageshow\",\"resume\"],()=>it(!0)),ns(document,\"visibilitychange\",()=>(ir(!0),ia&&it(!0))),n9(ii,io(!0,!0)),!1),is=te(!1),[,iv]=et(),ic=tr({callback:()=>iu&&iv(iu=!1,is(!1)),frequency:2e4,once:!0,paused:!0}),E=()=>!iu&&(iv(iu=!0,is(!0)),ic.restart()),ih=(ns(window,[\"focus\",\"scroll\"],E),ns(window,\"blur\",()=>ic.trigger()),ns(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],E),E(),()=>is()),ig=0,iy=void 0,im=()=>(null!=iy?iy:rY())+\"_\"+ib(),ib=()=>(e7(!0)-(parseInt(iy.slice(0,-2),36)||0)).toString(36)+\"_\"+(++ig).toString(36),iS=new Map,iT={id:iy,heartbeat:e7()},ix={knownTabs:new Map([[iy,iT]]),variables:new Map},[iI,iA]=et(),[iE,iN]=et(),iO=rY,i$=(e,t=e7())=>{e=iS.get(eo(e)?e:rG(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},i_=(...e)=>{var t=e7();return iC(tL(e,e=>(e.cache=[t],[r$(e),{...e,created:t,modified:t,version:\"0\"}])))},ij=e=>null!=(e=tL(e,e=>{var t,r;return e&&(t=rG(e[0]),(r=iS.get(t))!==e[1])?[t,e[1],r,e[0]]:tF}))?e:[],iC=e=>{var r,n,e=ij(e);null!=e&&e.length&&(r=e7(),tJ(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),rr(iS,e),(n=tV(e,([,,,e])=>0<rV.compare(e.scope,\"tab\"))).length&&iO({type:\"patch\",payload:rt(n)}),iN(tL(e,([,e,t,r])=>[r,e,t]),iS,!0))},[,iM]=(rs((e,t)=>{n8(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),iy=null!=(n=null==r?void 0:r[0])?n:e7(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),iS=new Map(tQ(tV(iS,([,e])=>\"view\"===(null==e?void 0:e.scope)),tL(null==r?void 0:r[1],e=>[rG(e),e])))):sessionStorage.setItem(\"_tail:state\",e([iy,tL(iS,([,e])=>e&&\"view\"!==e.scope?e:tF)]))},!0),iO=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([iy,t,r])),localStorage.removeItem(\"_tail:state\"))},ns(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==iy||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||iO({type:\"set\",payload:[tL(ix.knownTabs),tL(ix.variables)]},e):\"set\"===a&&r.active?(ix.knownTabs=new Map(l[0]),ix.variables=new Map(l[1]),iS=new Map(l[1]),r.trigger()):\"patch\"===a?(o=ij(tL(l,([e,t])=>[rX(e),t])),rr(ix.variables,l),rr(iS,l),iN(tL(o,([,e,t,r])=>[r,e,t]),iS,!1)):\"tab\"===a&&(t7(ix.knownTabs,e,l),l)&&iA(\"tab\",l,!1))});var r=tr(()=>iA(\"ready\",ix,!0),-25),n=tr({callback(){var e=e7()-1e4;tJ(ix.knownTabs,([t,r])=>r[0]<e&&t7(ix.knownTabs,t,void 0)),iT.heartbeat=e7(),iO({type:\"tab\",payload:iT})},frequency:5e3,paused:!0});n8(e=>(e=>{iO({type:\"tab\",payload:e?iT:void 0}),e?(r.restart(),iO({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),et()),[iF,iq]=et(),iz=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?n0:nY)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?nQ:nZ)([iy,e7()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e7())&&(l(),(null==(d=i())?void 0:d[0])===iy))return 0<t&&(a=setInterval(()=>l(),t/2)),B(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=tu(),[d]=ns(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[to(null!=o?o:t),v],await Promise.race(e.map(e=>eg(e)?e():e)),d()}var e;null==o&&M(\"_tail:rq could not be acquired.\")}})(),iR=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n1;var i,a,l=!1,o=r=>{var o=eg(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iM(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===V,i=e)),!l)&&(a=n?nQ(i,!0):JSON.stringify(i))};if(!r)return iz(()=>eP(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?ex(M(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await to(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?n0:JSON.parse)?void 0:l(t):V)&&iq(l),ex(l)):ex()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&M(\"Beacon send failed.\")},tp=[\"scope\",\"key\",\"entityId\",\"source\"],iD=[...tp,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iB=[...tp,\"value\",\"force\",\"ttl\",\"version\"],iW=new Map,iJ=(e,t)=>{var r=tr(async()=>{var e=tL(iW,([e,t])=>({...rX(e),result:[...t]}));e.length&&await l.get(e)},3e3),n=(e,t)=>t&&t8(iW,e,()=>new Set).add(t),l=(n8((e,t)=>r.toggle(e,e&&3e3<=t),!0),iE(e=>tJ(e,([e,t])=>(e=>{var t,r;e&&(t=rG(e),null!=(r=e6(iW,t)))&&r.size&&tJ(r,r=>!0===r(e)&&n(t,r))})(t?{status:a.Success,...t}:{status:a.NotFound,...e}))),{get:r=>rR(\"get\",r,async r=>{r[0]&&!eo(r[0])||(o=r[0],r=r.slice(1)),null!=t&&t.validateKey(o);var u=new Map,s=[],d=tL(r,e=>{var t=i$(rG(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:a.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)u.set(e,{status:a.Success,...t});else{if(!rH(e))return[ri(e,iD),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...r$(e),version:\"1\",created:v,modified:v,value:r,cache:[v,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},re(s,[r$(r),r]),u.set(e,{status:a.Success,...r})):u.set(e,{status:a.NotFound,...r$(e)})}return tF}),v=e7(),o=d.length&&(null==(o=await iR(e,{variables:{get:tL(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=o.variables)?void 0:r.get)||[],f=[];return tJ(o,(e,t)=>{var n,r;(null==e?void 0:e.status)===a.NotFound?null!=(r=null==(r=(n=d[t][1]).init)?void 0:r.call(n))&&f.push([n,{...r$(n),value:r}]):u.set(d[t][1],rK(e))}),f.length&&tJ(await l.set(tL(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rK(e.status===a.Conflict?{...e,status:a.Success}:e))),s.length&&iC(s),u},{poll:(e,t)=>n(rG(e),t),logCallbackError:(e,t,r)=>n3(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rR(\"set\",r,async r=>{r[0]&&!eo(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,o=[],u=new Map,s=e7(),d=[],v=tL(r,e=>{var i,r,t=i$(rG(e));return rH(e)?((r=null==(i=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...r$(e),created:null!=(r=null==t?void 0:t.created)?r:s,modified:s,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[s,e.ttl]})&&(r.cache=[s,null!=(i=e.ttl)?i:3e3]),u.set(e,r?{status:t?a.Success:a.Created,...r}:{status:a.Success,...r$(e)}),re(o,[r$(e),r]),tF):e.patch?(d.push(e),tF):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[ri(e,iB),e])}),c=0;!c++||d.length;)tJ(await l.get(tL(d,e=>r$(e))).all(),(e,t)=>{var r=d[t];rj(e,!1)?re(v,[{...r,patch:void 0,value:d[t].patch(null==e?void 0:e.value),version:e.version},r]):u.set(r,e)}),d=[],tJ(v.length?z(null==(i=(await iR(e,{variables:{set:tL(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=v[t];c<=3&&t.patch&&((null==e?void 0:e.status)===a.Conflict||(null==e?void 0:e.status)===a.NotFound)?re(d,t):u.set(t,rK(e))});return o.length&&iC(o),u},{logCallbackError:(e,t,r)=>n3(\"Variables.set\",e,{operation:t,error:r})})});return iF(({variables:e})=>{e&&null!=(e=tQ(tL(e.get,e=>r_(e)?e:tF),tL(e.set,e=>rj(e)?e:tF)))&&e.length&&iC(tL(e,e=>[r$(e),rj(e)?e:void 0]))}),l},iL=Symbol(),iH=Symbol(),iG=[.75,.33],iX=[.25,.33],iY=e=>tL(t1(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rO(e)}, ${rH(e)?\"client-side memory only\":rp(null==(e=e.schema)?void 0:e.usage)})`,H]:tF),i2=(e,t=\"A\"===nt(e)&&r3(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),i6=(e,t=nt(e),r=nS(e,\"button\"))=>r!==H&&(q(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&q(r9(e,\"type\"),\"button\",\"submit\")||r===G),i4=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tc((null==(r=r3(e,\"title\"))?void 0:r.trim())||(null==(r=r3(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?nu(e):void 0}},i3=e=>{if(S)return S;eo(e)&&([r,e]=nY(e),e=nD(r,{decodeJson:!0})[1](e)),eQ(nx,e),(e=>{n0===rY&&([nQ,n0]=nD(e,{json:!e,prettify:!1}),n1=!!e,n6(nQ,n0))})(e6(nx,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,y,i=e6(nx,\"key\"),a=null!=(e=null==(r=rQ[nx.name])?void 0:r._)?e:[];if(es(a))return l=[],o=[],u=(e,...t)=>{var r=G;o=eJ(o,n=>R(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:S,unsubscribe:()=>r=H}),r},(e=>t=>n3(e,t))(n)))},s=[],v=iJ(nH,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=im()),null==e.timestamp&&(e.timestamp=e7()),h=G,tJ(l,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===H&&tq(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&M(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eY(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):M(\"Source event not queued.\")},o=e=>{i.set(e,e5(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!eo(r[0])||(a=r[0],r=r.slice(1)),iR(e,{events:r=tL(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eY(e,{metadata:{posted:!0}}),e[iL]){if(tJ(e[iL],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iL]}return eY(rg(e5(e),!0),{timestamp:e.timestamp-e7()})}),variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=tL(tZ(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e3(l,e),null!=(r=rn(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:tF}),tJ(l,e=>{}),!i)return u(e,!1,a);r?(n.length&&e8(e,...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&e3(n,...e)};return tr(()=>s([],{flush:!0}),5e3),n7((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tL(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),null!=t?t:tF}),n.length||e.length)&&s(eU(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r)=>s(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var u=!1,d=()=>{u=!0};return o(e),((e,t)=>{var r;(null!=(r=(w=e)[k=iL])?r:w[k]=new Set).add(t)})(e,o),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))d();else{var a=i.get(e),[r,s]=null!=(r=e9(t(a,d),a))?r:[];if(r&&!F(s,a))return i.set(e,e5(s)),[l(e,r),u]}return[void 0,u]}),r&&s(e),d}}})(nH,d),f=null,p=0,g=h=H,y=!1,S=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||eo(e[0]))&&(t=e[0],e=e.slice(1)),eo(e[0])&&(r=e[0],e=eS(r)?JSON.parse(r):nY(r));var t,n=H;if((e=eJ(tK(e,e=>eo(e)?nY(e):e),e=>{if(!e)return H;if(aA(e))nx.tags=eQ({},nx.tags,e.tagAttributes);else{if(aE(e))return nx.disabled=e.disable,H;if(a$(e))return n=G,H;if(aF(e))return e(S),H}return g||aj(e)||aO(e)?G:(s.push(e),H)})).length||n){var r=eG(e,e=>aO(e)?-100:aj(e)?-50:aM(e)?-10:rP(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),R(()=>{var e=f[p];if(u(\"command\",e),h=H,rP(e))c.post(e);else if(a_(e))v.get(tZ(e.get));else if(aM(e))v.set(tZ(e.set));else if(aj(e))e3(o,e.listener);else if(aO(e))(t=R(()=>e.extension.setup(S),t=>n3(e.extension.id,t)))&&(e3(l,[null!=(r=e.priority)?r:100,t,e.extension]),eG(l,([e])=>e));else if(aF(e))e(S);else{var r,n,t,a=H;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:H)break;a||n3(\"invalid-command\",e,\"Loaded extensions:\",tL(l,e=>e[2].id))}},e=>n3(S,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(rQ,nx.name,{value:Object.freeze(Object.assign(S,{id:\"tracker_\"+im(),events:c,variables:v,__isTracker:G})),configurable:!1,writable:!1}),iE((e,t,r)=>{eU(iY(tL(e,([,e])=>e||tF)),[[{[nX]:iY(tL(t,([,e])=>e||tF))},\"All variables\",G]])}),iI(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:K}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{S(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==T?void 0:T.clientId,languages:tL(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return W({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==rQ?void 0:rQ.screen,r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rQ.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rQ.devicePixelRatio,width:r,height:i,landscape:l}}):{})}));var i,l,a,r})(),e.hasUserAgent=!0),g=!0,s.length&&S(s),n(),y=!0,S(...tL(aS,e=>({extension:e})),...a),S({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),S;M(`The global variable for the tracker \"${nx.name}\" is used for something else than an array of queued commands.`)},i8=()=>null==T?void 0:T.clientId,i9={scope:\"shared\",key:\"referrer\"},i7=(e,t)=>{S.variables.set({...i9,value:[i8(),e]}),t&&S.variables.get({scope:i9.scope,key:i9.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},ae=te(),at=te(),ar=1,[ai,aa]=et(),al=e=>{var t=te(e,ae),r=te(e,at),n=te(e,ih),i=te(e,()=>ar);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},ao=al(),[as,ad]=et(),av=(e,t)=>(t&&tJ(af,t=>e(t,()=>!1)),as(e)),ac=new WeakSet,af=document.getElementsByTagName(\"iframe\");function ah(e){if(e){if(null!=e.units&&q(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ay=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),am=e=>nT(e,t=>t!==e&&!!ay(nc.get(t)),e=>(I=nc.get(e),(I=nc.get(e))&&eC(eU(I.component,I.content,I),\"tags\"))),ab=(e,t)=>t?e:{...e,rect:void 0,content:(A=e.content)&&tL(A,e=>({...e,rect:void 0}))},aw=(e,t=H,r)=>{var n,i,a,l=[],o=[],u=0;return r4(e,e=>{var s,a,i=nc.get(e);i&&(ay(i)&&(a=eJ(tZ(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==G||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eH(a,e=>null==(e=e.track)?void 0:e.region))&&nu(e)||void 0,s=am(e),i.content&&e8(l,...tL(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e8(o,...tL(a,e=>{var t;return u=eV(u,null!=(t=e.track)&&t.secondary?1:2),ab({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nk(e,\"area\"))&&e8(o,a)}),l.length&&e3(o,ab({id:\"\",rect:n,content:l})),tJ(o,e=>{eo(e)?e3(null!=i?i:i=[],e):(null==e.area&&(e.area=rl(i,\"/\")),e8(null!=a?a:a=[],e))}),a||i?{components:a,area:rl(i,\"/\")}:void 0},ak=Symbol(),aS=[{id:\"context\",setup(e){tr(()=>tJ(af,e=>t9(ac,e)&&ad(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==T||!t||null!=T&&T.definition?null!=(n=t)&&t.navigation&&f(!0):(T.definition=t,null!=(t=T.metadata)&&t.posted&&e.events.postPatch(T,{definition:n})),!0}});var n,t,d=null!=(t=null==(t=i$({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=i$({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&i_({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=i$({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=i$({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=H)=>{var a,l,o,i,p;ni(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=ty(location.href+\"\",{requireAuthority:!0}),T={type:\"view\",timestamp:e7(),clientId:im(),tab:iy,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:nv(),duration:ao(void 0,!0)},0===v&&(T.firstTab=G),0===v&&0===d&&(T.landingPage=G),i_({scope:\"tab\",key:\"viewIndex\",value:++d}),l=tm(location.href),tL([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=T).utm)?n:o.utm={})[e]=null==(n=tZ(l[\"utm_\"+e]))?void 0:n[0])?e:tF}),!(T.navigationType=x)&&performance&&tJ(performance.getEntriesByType(\"navigation\"),e=>{T.redirects=e.redirectCount,T.navigationType=t$(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(t=T.navigationType)?t:T.navigationType=\"navigate\")&&(p=null==(i=i$(i9))?void 0:i.value)&&nV(document.referrer)&&(T.view=null==p?void 0:p[0],T.relatedEventId=null==p?void 0:p[1],e.variables.set({...i9,value:void 0})),(p=document.referrer||null)&&!nV(p)&&(T.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=ty(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),T.definition=n,n=void 0,e.events.post(T),e.events.registerEventPatchSource(T,()=>({duration:ao()})),aa(T))};return n7(e=>{e?(at(G),++ar):at(H)}),ns(window,\"popstate\",()=>(x=\"back-forward\",f())),tJ([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:t=>aI(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),G),decorate(e){!T||rD(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=T.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tJ(e,e=>{var t,r;return null==(t=(r=e.target)[iH])?void 0:t.call(r,e)})),r=new Set,n=(tr({callback:()=>tJ(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=r0.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;l&&(o=eJ(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==G}))&&(e=>{var r,n;return null==e?V:null!=(r=null!=(n=e.length)?n:e.size)?r:e[Q]?(r=0,null!=(n=ez(e,()=>++r))?n:0):Object.keys(e).length})(o)&&(p=f=H,g=h=0,y=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},te(!1,ih),!1,!1,0,0,0,t_()];a[4]=t,a[5]=r,a[6]=n},m=[t_(),t_()],b=al(!1),w=te(!1,ih),k=-1,S=()=>{var O,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],E=f?iX:iG,r=(E[0]*l<T||E[0]<(T/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nx.impressionThreshold-250)&&(++h,b(f),s||e(s=tL(o,e=>((null==(e=e.track)?void 0:e.impressions)||nS(a,\"impressions\",G,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:na(a),viewport:nv(),timeOffset:ao(),impressions:h,...aw(a,G)})||tF)),null!=s)&&s.length&&(O=b(),d=tL(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ew(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:ew(l/u+100*o/l),readTime:ew(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var _=r0.createTreeWalker(a,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(U=_.nextNode());){var U,M,F,P,D,z=null!=(M=null==(M=U.textContent)?void 0:M.length)?M:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](U,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),D=t.top,C<3?y(0,F-D,P-D,v[1].readTime):(y(1,u[0][4],F-D,v[2].readTime),y(2,F-D,P-D,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(E,E+T)*m[1].push(r,r+S)/L),u&&tJ(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[iH]=({isIntersecting:e})=>{eQ(r,S,e),e||(tJ(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{e0(nc,e,e=>{var t;return(e=>null==e?void 0:{...e,component:tZ(e.component),content:tZ(e.content),tags:tZ(e.tags)})(\"add\"in n?{...e,component:eU(null==e?void 0:e.component,n.component),content:eU(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:eU(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,nc.get(e))};return{decorate(e){tJ(e.components,t=>{t7(t,\"track\",void 0),tJ(e.clickables,e=>t7(e,\"track\",void 0))})},processCommand:e=>aN(e)?(n(e),G):aU(e)?(tJ(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=r3(i,e);){((e,t)=>e instanceof Set||e instanceof WeakSet?e.has(t)||e.add(t):eZ(e,t)||eX(e,t,!0))(n,i);var l,o=tO(r3(i,e),\"|\");r3(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=eu(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e3(a,d)}}}e3(r,...tL(a,e=>({add:G,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),G):H}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ns(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=H;if(r4(n.target,e=>{i6(e)&&null==l&&(l=e),s=s||\"NAV\"===nt(e);var t,d=nf(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tJ(e.querySelectorAll(\"a,button\"),t=>i6(t)&&(3<(null!=u?u:u=[]).length?ex():u.push({...i4(t,!0),component:r4(t,(e,t,r,n=null==(i=nf(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=nS(e,\"clicks\",G,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eH(d,e=>(null==(e=e.track)?void 0:e.clicks)!==H)),null==a&&(a=null!=(t=nS(e,\"region\",G,e=>null==(e=e.track)?void 0:e.region))?t:d&&eH(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=aw(null!=l?l:o,!1,v),f=nT(null!=l?l:o,void 0,e=>tV(tZ(null==(e=nc.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?G:a)?{pos:na(l,n),viewport:nv()}:null,...((e,t)=>{var n;return r4(null!=e?e:t,e=>\"IMG\"===nt(e)||e===t?(n={element:i4(e,!1)},H):G),n})(n.target,null!=l?l:o),...c,timeOffset:ao(),...f});if(l)if(i2(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=ty(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:im(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:G,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r3(h,\"target\")!==window.name?(i7(w.clientId),w.self=H,e(w)):ni(location.href,h.href)||(w.exit=w.external,i7(w.clientId))):(k=h.href,(b=nV(k))?i7(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nx.captureContextMenu&&(h.href=nG+\"=\"+T+encodeURIComponent(k),ns(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),ns(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{r4(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>eo(e=null==e||e!==G&&\"\"!==e?e:\"add\")&&q(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ec(e)?e:void 0)(null!=(r=null==(r=nf(e))?void 0:r.cart)?r:nk(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?V:es(e)||eo(e)?e[e.length-1]:ez(e,(e,r)=>e,void 0,void 0))(null==(r=nf(e))?void 0:r.content))&&t(d)});c=ah(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&e0(t,o,r=>{var i=nl(o,n);return r?e3(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),av(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=nn(G);ai(()=>{return e=()=>(t={},r=nn(G)),setTimeout(e,250);var e}),ns(window,\"scroll\",()=>{var a,n=nn(),i={x:(u=nn(H)).x/(r1.offsetWidth-window.innerWidth)||0,y:u.y/(r1.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=G,e3(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=G,e3(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=G,e3(a,\"page-end\")),(n=tL(a,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return ax(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=ah(r))&&e({...r,type:\"cart_updated\"}),G):aC(t)?(e({type:\"order\",...t.order}),G):H}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||r8(e,np(\"form-value\")),e=(t&&(r=r?ei(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tc(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=r8(a,np(\"ref\"))||\"track_ref\",(s=t8(r,a,()=>{var t,r=new Map,n={type:\"form\",name:r8(a,np(\"form-name\"))||r3(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},l=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ao()})),()=>{1!==t[3]&&(o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&nu(a).width)),e.events.postPatch(n,{...i,completed:n.completed,totalTime:e7(G)-t[4]}),t[3]=1)}),s=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),en(i)?i&&(a<0?ea:L)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})();return ns(a.ownerDocument.body,\"submit\",e=>{var r,n;i=aw(a),t[3]=3,e.defaultPrevented?([r]=n8(e=>{e||(n||3===t[3]&&l(),r())}),n=!1,s(()=>{if((()=>{for(var e=a.ownerDocument;e;){if(((e,t)=>!0===tJ(e,(r,n,i)=>t(r)?tM=!0:r))(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||nu(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=R(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1})())return t[3]=2,n=!0;n&&(n=!1,t[3]=3),a.isConnected&&0<nu(a).width?t[3]=2:l(),r()},1750)):l()},{capture:!1}),t=[n,r,a,0,e7(G),1]}))[1].get(t)||tJ(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var d,v,a;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:t$(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[ak]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!nS(e,\"ref\")||(e.value||(e.value=t$(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value))}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=at())),v=-(s-(s=e7(G))),c=i[ak],(i[ak]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=G,o[3]=2,tJ(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&ns(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e7(G),u=at()):o()));d(document),av(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||rh.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rQ.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tL(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"direct\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,s,t;return aq(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(t=l.key,(null!=(e=a[t])?e:a[t]=tr({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e;r0.hasFocus()&&(e=l.poll(s))&&!rh.equals(s,e)&&(await i(e),s=e)}).trigger()),G):H}}}}],E=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),ax=E(\"cart\"),aI=E(\"username\"),aA=E(\"tagAttributes\"),aE=E(\"disable\"),aN=E(\"boundary\"),aO=E(\"extension\"),a$=E(G,\"flush\"),a_=E(\"get\"),aj=E(\"listener\"),aC=E(\"order\"),aU=E(\"scan\"),aM=E(\"set\"),aF=e=>\"function\"==typeof e,aq=E(\"consent\");Object.defineProperty(rQ,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(i3)}})})();\n",
        gzip: "H4sIAAAAAAACCry9-3bbOLIv_P95ComTUQMRrIjyJTZlhDtJ5zq5dMdJutM0k9ASZLNDgwoIOXYkzTpP8z3Y9yRnVeFCSpbTPWfvdfaejkUS90uhUPWrKkIovze_yFRLMM0UkyxnGStYyWasYmN2wUZswqbsjJ2yK3bOvrEv7Ii9ZZfsGbs_nMzkSOelbL0jmJ3OdSuXLRG_PvlTjHRvLCa5FL-ociqUvsI084usmIlIMSFn50JlJ4WI2n02KuUkP535528q1_b3kkYi0SlXS2jmSw7FcMHvPVKqVERQ6IA-U-W3liiJ4GIH3sWaCBqJJXvMTdP4VggJ8wkRnHO9WMhZUXBO4E-bi1hEmlIl9EzJdn8IySZE0E5HTIiGP71CyFN9BnntT4rDljPJ-8NJqUiOXadYRZKnbc51kqedTvsxPjN4Ymor9NWEw25XLs1DS3LO7ah9EVcV0dRWs3Spl-yr6Uuv11OU37P96B8qm7LTUb2qPBdE83tfISWl7Dtmofxe3c-Xts861lFwv6XE11muxLiFE9PKq9Z5XlW5PA2Y4PfeXk2FHeieEtMiGwkS9Hq9gAWQ1GXuBZRS9sbMTbvPFE6Kuprb3glCl6NMj86IoP7dKdE0FmMiuMYpe4lTFgkJ70elrMpC9ARWru1HGunlJJdZUVzNTS9Up6MIXS6HoyKrqtYvLXGphRxXrV9UeZ5XYn4qYE3mOs-K_LsYE1-_HYWzvOp9UqKaFXqpz4TE8cKpVUOT0o4XUSuJaayi5rP9mOGGIJT2fGF1z6FUvVaqXitV_7hUV5Ybhv-hYuvSljDyWs1GGnfXvJpNhSJIJpaUvSOQkwU2a8Auynzc6jc-mArqD82auFjiJv4Z9q8U31q_kKy6kiMo3exb9oCbNzcspOxblusWpq2HNZ-QNq4aupIKVhXsZE0teRiuLqp6EOeYgRiSoGLT9EgRSpdL9hs0VrDn8KfdFuwFPnPOn7D33CRl_-KvZucnQvVe3v_909H9x48-PXv19tGTR2_YU94O2RPoyu_cDCL7wxT4AQfBbEv2Kz-6Oj8pi16uhcp0qZgQ7hUOyDP_XrstTRSTvN2HsSOKLha605Gdjt8W9aolisJqfc-Ecnnt5mtz_t6QyveR7b5w3QeiSzGBgKwSmhuclGUhMhlwrq-mopy0BBM5F5oICeSi3-ai0yEh52KxCCZZUYmgzfFdoNVMBBy_vAdqITIchzbnT5kosHSJg7hSeIkfKq2AIjU_zLDWktlBbDa8p8sjzECgmorfVyq76uUV_mVijPW2clnpTI6gOKRwTFxY-hXSusz3UVt3OqIigsYiErBD4qTX64k0SkTKxAgL63SCEon3ShMn8O3asPYaG4x6qs_E1M1N4I5VX9jGqWHizIwNrpKVik_xw7Vi4NNVo49tV-5i0RbJr-licX2gO522pkycXxuzl9mUiZNrr4-EZuJb89SxoxjCcQXHT6bPeqqcyTERt4nm-Dwtv5Gwz3Sn0-7DwRnrqE8pvaOZ-GIPcFi0ST-FUjodkbgDeSuEV4qJI2xKiYc2EV-IYME8YMEyoIuFeUwCFqQBLIm3sCnFJU4PPPSZoEw846LZYnFq5lzzexqn-n7dksYRqsweAc7jGRGUmQJ0p0M077tH1ekQxf9FGZEsp_ye3tqK30dqaysWscB3kYwUjQQTj_imFT3JCy0U-UCZeGWbwWRjgJO0uU4f4WGZ_JrGbg3cNsdaPnEMD0XCONfQak2HeN5ZRka2YOKpT0sk10Qy1e1SGNurXBTjloRhpHMcyuGJEtmX5VIUlWhBCVCaLcUUIRv5lkQwxZHwROI-MT2hkRhB09fa22yeZHUDDaeF_BdPJBOJTNNh3eAcZobk2OQorxudb2g0NKfZjFfETPxKS5i6icDTObbILAdfkaZDtbXlabDmAk6nIbVfcQiYpFGjEt63EyQO-9SV6RbSltgK6VB0u76Ira2hH-7VJTcUW1s-WbeLdVEGm_h1c-VAR-0DE7cclxzCkRLCJYDye751gti7QWMFaVxBSDVkpyNG0EE39xnMfR6LV0TTSNOwDacqtui2IBkwwUyydp9GppWZ6Uo9OKZp0Aimupg2pEx8ajYfGmJXB8NV75ZDn2U8SXGdKK4O-7GjFF0V2bMxVlGfSS6bH6X9KGMZuZdDdSg7nbZ4O4SFhOUXXCQqHbp5jQuuScFyWGcF7XSy3nRWnZGCOrbekJpsucJzilj_QcRr3xsavV8y8ef6voaEwCQdCU3wyKlzpBSO5IcbZw3KvkUa1zmgeO84gRLcZc9xiy3xBg5r7nocA4kFKuRb0Ok0aJ3mSUpNF3u9HlQEB7leMvFyZW7MxShjhd2w_xMTgXNQ069EpZ0OybmdiQzuEIlKWQFUKs6iHHb66la3Xc6XTDx2B5Rh9JlkGcttY7M18pch7W6Qwgznm8YSbrE3VKKWTHz9YSVIwvLJatFJxkSSpelqDTdV8P36oA8bFB6JCW4NN9kvffoh1sz5e3tf_TX1iR5jqyHBdZ7GJzL3y-XKhm9QFFoPXc4zOvRDv2TiDRffmfil5vPXVo3rAue-uveNiWlsm5rgZ9yw_Bm1Nd40bDD5P_t52VSTOQnnS3NzmJuT59rEbZgtWCaJTPppymUSpnT1OCzMqiowVYGpCkg1bMzng5rBsPXCcDRIh2VM4KqzWKiYZHwOAwoUPiaiQTjMnRrGyJ9BIglTrkiWwBZPGTxim-0Lji8i4KGgPB2LdVLhluk6KxqmUEx97ySSZzTJORYLF0-Z5GlNODADy-gy8kTmpjKbTQMyBtki8TMRn7CFeLDxe0IRbc640LRfEcFCSumSid94TQjdqBZ4DxOnRNFYERqptQ4KLr4Twex4-u0JI6oYjmksooJQLNP-XjLxfOVw_WRKwPa5KdCdjmkoXqjMwfsecgEtXWGWRQEcCHLG59mlSxGJ32ypUDXXSZjG8A9BVkLVJSwWoiDA9ojDPM4jwd4znQxAArUN14anG8jG9UVmxF9tHfcPm3Ip4eRSkee1Vn5w-CFQDkXdfOa9UVYUMKD-JHlOKbTse3Mi220zPJ2OuCTAHeA84U-z3zsd2L5PvATQH2frU6i4uAC6ZyRiShNbA9x0t_A6zMSSid8bDP3KtczfyhYLw1GbjsBFIx6LQmjRgiuYlUtGja-iZ777H8ABrWTpVULH-C8wVTQSvWw8jiFnNh5D6mZOUwGsbfHHOnFAIaWjW74JRHLRO8UqTqEKKO8sq2L81xVJr4sJJG_sCJiC37E6SZlcMvGhsUyJeEM000goNCOJZiqFRvkSUXRqahETKFN8wGfsLXaILmEGKBO_rrN0vkOOQ7DtwCVe11yh9AI_JX1Y2Ei7VtrjMqKoATZo_9oAusNsCrfDSuigMdFEcpB5mjGEbd6cFTt7kkYmbzYeBzB0MPZmmOkN89nprMwUjoYZLDNasOcaywWX6WCVj2jcczYIr1uKiz8wPTNtM6UF9KYVyeDk2WseifUpj8NseIhOJzz0XKL2u0rjZRbksrR3nk1B9Cz2jOw5MltH19lEr5oW-QhuEyEFRtPR-4HhJpjYwW1tLt4Er8O7Zrej9N4WGAusClLuwkcQqUdWJoNDCEkeAKlMhFkLCRREFCZNaTSHtMtInEBax2HrGIn2aqlwjT53qV5C_3wqPJugWDydbMkC27y9gaj7m7znnikT-z9KOJPVWT7RLu3BGjdpOaV6siY4WYYlmFgxyBs7CkVq57b9mBQMxRnQv7nRcyhemN9tUnBxYFNQt6SGScFUygvD0IiCwE1HFMRKeDsdUnAsY8u-GWaJSHnB7PqEMyjnYhe2BXxQyyVlOY2TjOVuDdAI5ihdMnGXBzNpFEfjoO04z6lQk1Kdg5AJRC1PYDWYA1KrGbCRd8lTSqNGsp7Oz8VrlZ_mstt8LctvhEY_Zxp_Mi3gaG_3mTZswV1CGxw774rbmlDk_qx8PeOCFSh95SLOu3xLdpEZpDTKWYHsZ58yIjjyouYLU3TJtBG-8r7XuHGz0ucTUKMIObqKNIOT8iQbfYlggbL515mYiSiHBk6zWSXGUQY3Pa3y01OhogIeSjkSUQm_fOaZkzWrbBJVSy7YGFizmsPp-TqBG-mzPmUXXM_grO0pUZXFhSCUjbgWpJ1RNuEjQtnU8OwtYdfSeLFo553ORW8q5DiXp1Z6J2oFVz4h5Lx3MquuQFCN34AhHvosQ2oY9wtPjBeLC2iBgGEnKDU0KR6gDmJGoCFbky7BJlHK2iGDD20grXXTQRx-yPuLRUk7nSsC8oO2b0lIl-wMR2jMK6Hf5ueinGksv4pxXCp9X-bnGQg_HqvsXJBTGp0SyvRhP97Skabs1IzweQ80Gxei05kSyuqnM-AJnawV-BQyMkR5VIhMuRrHdRbebpMxF_EZoVGfsnPKzvncfIraIYOGw18lKp0pHVmGxs8pngFsxuuL9YxdkXYfpCyU6fL0tBCRk_23OXfVxiLWMblCHuu8Z5cV9IRG-DLCsYvO_YrzK8DMytQQmiviCqRQ49LN5nnPVE3aGSvoslYYa_n_RGNslII6Ry0gllPr_4xiamrUhD38uIRkRjl0QzL8iMnsAr4pof28dCvSCt03J24kMgqzpRIwHH-Vy6XxmXDbbEzN4QTTmUlY5acyKxq6WEzqW2GVdm4XYpZaNbqxLQ1lZ0N9SOdaOr2gTbmmGLR1LN1MZfP_y4qQoA5_VJ37ZLu58QuKO65_wMWx4T2uhg3v7eQHsBfY9WmwqmlC7NE_F1wjS9NQ7DkRJ2S2xdHmgNh3eBic5VWiY9uayLY25SjfWSwUA_UgpkLWsVnM0GhGay1_YNvWygolsvFVy47W-I4ZHFT1L-mSsqS5ZtxkQpLUaXl1uaYGWizy6jHo4mGNxW24px7yfix2gCVtDozi9xp02auIFfHqX41cPY1eks_P5EVW5OPWWBTZVevWXCx7nynTM6tjJiLWeaQzyvR4_QaAQlPupkHgDxA6Z0jcZRuZ9HaIoh2SI2ljxco3ZH-0_eaoHggHkowVwM4YtsIhbLjlNm3KhDQv4VyPQcLA72m8OsD9CH5brl1QXz7I2wH2AGwsy5N-Slm-ZMTiQojgiunepFSPMtCP247BRShdMj1yQmNUAYJ81_Hn93Ss4s-35qJXIZcOCollr9drJZkcw8A6lZtets5LJdLPUSPpVki7wf__v_-_IAL6MV3hVgumeJIyCbxpDv9kVppWAPHXtACtXlKARHfzOZCzwp0DRYPShz88E8IlZTIpUp51u0w5ybxRJpWc4Bj0_erU8XsneU50Coq9-CX5_PZM4JJqBbfmeomYF1nqluVPe59BDj_j85uaFF5rkpvDTf3MRUVyNp9mqhKR7W4J94MZMHLyS-VeSvuyEBei8G-VfTsqz6eZciUYWiq4TEA3msIaTEqiaeo5rkMdb4WRPhRxGPWXppAlLil9ZjEIcAqcwpTOx6LIzwGkUIE2IFgELBgGDDSrbCxG5VhEMKqsKL8J9TCrRCSXfL6sxbuFrza2Yj-4c-DFUJOAB9Td7WAZx6bId2-ePSzPp6UUUhMBXMo5YFYsHul-UZCgC4CkAC7b5iuTMcAAXrhmwGWSUpqEsMZA8MqDgLIiGRgxLOwCGJRYcxTS4BW-09HPiYZNGB6SHNPZdgpK_VX4K8lp9J4uFlhsnMC_aZSklBWo19FX18cNgC0GOXV_ps9KlesrM3tusGo5nD4igt35SOII_pccf-v2ttIujWhMju8c36ExjQl--Rj9V9qlJI6O4eG_0tuUxv9FY3iRkOTjcZp26XG6IEl_6yBKu4vk451u2o0pJonI8RgyYKnJx3_E6W2TNSbJx39gWSSO_kF68OvWnVMjhdwAFTSn2bwqZ2okIsGq0Zk4h6U5UzJScTuP4MbwnmW-3xmbVXCTYdOsqr6VahyV7KystN2Ms3gWVWxaKvdiHOP-eCaBfY7es2mmz6IL9nUm1JVDGYyiUazPyYjBTV-y5tgvIc9EZafnQupo4vej6EFB3PxZLIjo-SbGojdTMg6CKLgTRO9BdkiZPncUTp-AmKUTIBt2Yqhrc7pxPzTmFk77FzXywm4CuJOdI6DpDomjj73b8XG8-Ejt8N-BC02dEsRdtaDArEmNxwXsskTAvKQNwfUprMD1ocCxUogcMLLL95FaokA7Sa-JxK9JJxwY8M5xcpzeusOCgNK4bTS9iWDhYeF2SBFlgJVhWRrpxzByXGminxKBWl2QTmgro7HZw0Ptd9evqEEGWZHu_VnmkgQsoLXWBHXeiT5LuUA9pPbIE-0kmyLWPS0qA3JiugEnwa0FokXk0o64Uzo3AUArIrb4fZTHRPH3LIuJhBPNFuF0q178nJs3IGc15w6cvo1Rq7PUaUE86tVZbjFoVGa-Z_rtRliIn4Xk-OOt4-Pe7W5MaHKczpeL9M4pC46Pb3UCyvQlv3P8vXfnlOlnHj2muSqI-JOI50RsRFFZmCtlwQIm9404fXQ5JZoFp7OARvqS6ftwlutH10BAJinTrzhi1BI8IFpBek3foB-hzBkIrqKxfgaqHVU3BtbuK6PHaix3pC0wnBIzx3d6d04jfRmJEp69NgIy36eJ5ipFXQPcCPURUYtFEBiKenyH9LoxPb4TL5Cy3bpzOmP18rjWY2yefk0Us18-k_iwDf8dHx8fU_wnuTVXBZFMv6XL9DPFTSk6nc8f8b0G7aXNHFzPfHx8OzBZ9FuiQYl_5_iY9ChM5a0QPgW92wFd3vpMDWhAv_bcXH_l2FCxNorSdkgdeOgP2iQW-la9E7zu7sYFhoJ0AOwwDTAMDyPc0lYVk4TpFkhEvfCM11RE_EoUm-M-QAyJ1xoDdidPgaUWFsgYq963fKzPuOopMZ6NhFPdiC7obVifRjYFK3l_WHrw87B0EA08jbhKSkQECZKBfHYMTTvsU8-hKyeLLlkfdIsubR_Shik95H0jHnXvMH-nQ2YcfvMM2e7-oS_fqCzhawhfQcnZJo7FqaA93QbVrrA8zFW3yZ54dDjjGa8buLVlxOXLpU-JmITE9T3lGWg7cVii_hJkjX_CpPiB1lwM9ZBqhzA_FfoXVeoShKuvARGvPUUVS6YfNrUBcE3TfxIBUEXthc1DV7RCvXZvXI5mcKJC0Y8KAT-rB1dvs9NXID0L8glI0QJKAcqLGHz9kChQuWkh9W-5HIMotgYq1Nje5ZLpd03aJ6LTojzJirdw4_yGOWP9kHyzZUBLaSMJ0y_xjvy4wcl-ReAffEDgn_7e-Pam8fuXa6Bc_XPjClmjBxYLkejvqcUZ66Hg-p0FH7eFf2tuQjleCK-rpTNWerxM6SEoAGyJNSkB14KpoxLEqPoxLs4M5uQrRYQD3u15xgAQb84cuPK-pHMcAId2c0qixULCLYyIngHHTt1ygH6sKc09hAG2HJt5sNCwPJzhtssnwMMnZcpIgc0FphAbWzQaW1xrbNFobPFXjc0JpfbOWE6I6NmlfEPDC6fLSvQvDtpyg443zqIbtgXFMqHiRrlDQ2PGrLKTNfZQnhlPxkwk4zRlZIYDMWMVzltBo1ljKGbXhmLWGIrZXw3Fps6_SbkTrlppmGZi2BD1wEAsFvhLiDRGgc3G4ajZRpuWIFPoyiA0IkTcQEkgEaXYmhr6CGXg2QHZrbTqDZTahD_Wp4IRCBsAY6IZnNvp0pS8ZInovcymdceZ6P0msi_r746EvpZm9d3m9tcNovMlTSkt3BJgBfaqgD7UdwYLCv3B7smIfoASVfuGbcr0JuX6ARO9x7b6vyjwt7UCN2WDIn9jYBrjhe63oSU4q43B5v2hPhRD3e16cGqd_rcN6c0BNjR_QAp2DdyK6VbgMCumQDF2Cr9a6wlU7tf03by1R0Bey4F_JoLlqOzRz2sQGBwQLxwXBEImlnOxXudi0TeWBwFaIDSaYAbxptqz1dozU_uLRk6s_31t-GQuD5gEr1UIpGpcIh5HOtYGkdGQi-Ibc8aqWD-OUFdj5htBMfgT8SVQAvBbi4V-TJn-V23exvBGAvcX4VqAA5Y1GLzY4MJyBFKBFjdZO-HSTsfZALQbNgAqJvpfRPgJQwAvLMLHoPA2KFOmn27Cr9USH4-Cqi0TfB1wkUPkBk9sHWDhgPNsb4Uk41YJbyFQWItfhebgsbBqAexSp6P3ScYAa4fT5hFoiLtb0sjoyjFPCUdyXURpRseXXmBxtR2Yg7gVBuKm1iBuWAGg1ZZM_w68hsd8IFDfI2uRIG4acLiDi5TpP3hzkXgjlBuzNQxT9K8NbIFTZzfg_bytvdmgsWqBOjFDWgMrpeGBr4ikdE5q5aJaAQJLCpZVOpczsdycSNIGblU3kDhEgewxpLeNWWbcj66boMTXXgEEpChHWSEeGlknSAnCaEO6rdBvbSfm7Uf-pY7DSGzBZShsiAUA1mwALhtMaLQDWuo-wA4p00Ti1d2AZbzkwqbyhNMA0_vD7LAe93Y-zIB94lBWkqVYHPzFEmvQrFPc6r5tpFP_4guFhp560DQfZXqvwcfuNH7vNn5v38zM7qQrbGvOVljaxWITC7JX54Fez_2nKF-WE3Ny1-d1SnPIUnMtTZ2f3zDaMCpeB2KsGAGVJZCf6nTabXwFakQDIsqh9TyHRDe0A22UHE-wqR2GjHvSv1ioBm5Lx6ZGQ7F9A4zKJlptbt2as6yC37vNipo8DzL8nuAAVNQVWt_NUBG7qU-b2Pi1mlZ0h3bfWkUvclXOCs0UlNK_OTt1i5FZBCppsWX2BZp5EPvANU6aG5Ub2peI1ItlgYFher-xUO0Ncg23LYyJEMelSwx83TdTNkg5kXzDrlYW99iwbwFTStQ2e0Si0T2rBjkHKocL38hHhu53Te6kZSRk3cNtPM-Rkdh3EEVgIg7WOumM0TnfAJC2dSK844dVHDSruLuxilbdBaZ-WNjdRmFKNA-YRmk1K4WrkHgDaLVapsIylXClYKF6FeUGOHyX57nDChu-yEHcgQcD81JrBlmfhouFwBtXp4N_v9JYNfDkYGhu1J__eU4YJqbU5v7_TXvPGHVLGnlZ8xd0UInGarRhIKINaexcedQrQpl_NL5qZXyl4xeNKqJpLWKu-POxENMINNusvBAKFJsWfwYJK4SfLbnyN_GW_h24f_0cUIN22ko2G1qGrkw5wJIQaEoyewbPasT0jMYomC0jaRkszks3dOXmofMJZy7h7IYxVpLMWAkHZm5GN-UlBfhCLexS-bqtqohAPwGdcaZGGi7OBqbkLqQRcN8qW-HPNhhHuwtHwyKZqWJV8Gr3CvJg-v1mnsNcOWgE1tzAd6sMdr7RiNQMVxDQSGVQThBEq3WWG-yzyuHa9SjeWLcqia3eorBzo8vHDel7YurVjyOiOp3cKT3Yii02gEZgRVhWKUqYTlnpdCxlXEYlDzI5Dqgx9PUCaR0HLAAFTNkNWkEUtIIuKd0D6Dd47viuIOjmZlw0fKbdcsWiLAgY0HrNXIZuq-t5XUAxX78JMjXjekqCcaazFsKU8kk-yoz7g7kUF0JFAf4JWCZLeXVezqoo8D8DlstxrsRIR4H7FTD3xj1XQlY5ov0C_zNYUqYqngRSjERVZeoqAGyRx7IGzE9YVuQavp5n6ovQiD2ClBV--W4bG1RiNAONZpAyNQY1nKoMlJmJlDJ1wR38YqKE-C6I-JmoyinkQUHXR4Lj7NTXK-Bo6d82x6ydOLtDdW8tMY3X2h7VrfthOS4VjRvDgjR5tHZ2OPHX32yQt4lY_9K8-SncJxZArmhvpQ_xtaxcraaI1p6vV8Ys-3TtAyCMfjwgdQfcK2dLsKHhLgkeZRM-l9m5qCJVMdSug77YvAH8IUOAVaYNtgPV2BtZMLgq9qYzNS0rUQHB5fUjZd42v4Z7MNR2Nax3ESJkvekYe8NxkqfNmW5zDrQcL9zAWqpOx8J0bE0taHfrp1vzfPnTdbjOUHDvckfH4CVlsILmiJqbLQUHQqdCv8KREE6o4jTWGqUxFFK0wL7JHb_z1Slv95nflfDQ2MD2sTnN8MrNDUBZl8worwFUkEtQ3APZUKycmhp-seMbSaYzBeJM8yLKzSRdP5RwPfP5er2yrlYC-qfTWR11knN1QXJjh9XWiX1IV8DegqsR3nxByz9CThgwvrWZKMK9wPZ0nGQgocF_22BFuVJOkBXg0YIrupJVNLIKk1WvZHUbfmkM_drhurFtnRdHp5m7PyxgddunArilKSee8gPyWuXW6818Ojsp8lEUmL8BA-8mlRbjLWSYgmjtuf5eyuKq8Rkflx664a0tP9-a36yUXT2E4CRtnDbLFjZ3UqrWrbkqiZr0zJbeYIlilo7b6gCcpsuW20hV7zOcP2d8Xp9q89WqV045ly0Cnd2oKKXjsNczrXegkRPIk28XGAt_nWVF5YHrxuOV6HSAEV4rBT1zrb7qdNTEYj_qzupGv-sNhQvu-qaCIWGVUMZ5lPe1xP2gbh7FWkGw3qDGgIE1xNp3g_ExlqK10dRqmm4QBV0DhlqysWg0zvmtyhoQO8Td1AQ3Cihbnw6v71Ez1ylADYBAcOP01undIGSIzTQnBKAuIet8uaSRjtVZD5cCCOj-7uKBnXfqYSptb1jaWLrnQmewzI3XIydyyHvTEnYV889oPjN2yh4htUKMpaP3dLFwlnC-SGSvz2spmTpZk-A2zJMiPSLPj16_6hnBYz4BJp7toNUFU9_4nY_H4_nOcut4PB_Yf0kcve33I_wfQFB6_X4fcHd_3LrD1JebcuCPqPEvZj0ez0N2d-mzH0H2eYwQv2xrcn_rcTrfX241H3f-k8dwsKTHyxiKfss3YRAdBPG_iUBsAhD_Fv6QqUt-52OSbX3vbx20_3Hrn52fbnfv8Pjjp8_zxfLfW2kXx-dHCejt_4JGHycE29NLu3ThBi5Ku5Qep3RB4siWkdY_t9Lb7iWNj3u0--Mkpr3PVkyN8XY0R-RiEDAU48ESZxY2qdk5nLunIlInRNPuZ6DkS0OOzylTDUdE111mdToEPAFZJWMDcN_ptP3LV9krIuhi4V88k1qA5Y8AoKGqlQvNctV9QrRHX0b443FRZpoafSTA-dQj0KmoioOO2NgEA5mbKkAdomUUaTw13Vshe23hMoqLHsCoPVxGAVzG3HCtryI2Y6XTMZdcPUpUs5pusBV062JFDzkubYvAr21A45QR5AQNK783r77lCDqpi6HzUVYJz0JFDkdgrj_Xr_sgO3gGkGEWWM4zaz2wqegQywIiuVYQDO03h1EErQBOTxe0XWCmiL4RNxRsrB6eHb1u7e_1w9a7tw_h5BctAoaPjvPNCkBij1kLIPz6TLR--uOnFlDJSX7ZOp9VunUiWtl4LMYtXbbgejqCMh6WpRrnMtNi3Hon8wuhqqxogUEGdR2BWiqdnU-DyHcM3gWRuX0FZsgDFJsEM5lfmhPPvI7q9HxlgQz90MgGAEndx0MJzyV8Z1708YUTFT8jcsMAvXv17PdW3Vi4AXSFMWXFgr64kQfrlGsD_xeFXxv9Ozj45H9qpN1BzhttYipuPPV0-ezotROxRF2xtOtspsylvF5rKKapxy3u4qJSG7rlMreIa_hUlRc5tD0D_6BFkVdiVMpx5ZdDbgjI_1V1Lq8typK0TSXhCog3FGTz2BIs8Yr8jrbb32znmcrXt_ImavfWLYybN9-7N89clTNVrBVqpRA3lC0u0eGZ13PEKhmkP6rpRYvkGrZ1BtWy1slM488XTT-sFCSAN5YQ0KVrrPzvNRZLALV8EqaLBTb9xmpf3dDwV-sN_0HnX_mmi_MsL_7O9F3W07dmCHJDLVgy7FAlqipwMuIbq9g0VzaRWxKzfLxxmK95K9lQuj8J1ZEb_sZpGKZrfYLkcLrdNILvnv0MQzgWk2xWgC_YVbO_zz_dmitwh1DLTLJWNZuC3YUYtzx1bkH7ep_pcoln_hhx6pcvkJlmIyfJHXc65IKXzNv_EcEvjFMIWDPntTvle2O3bj6Ly5EQ4woPqfPsMj-fnbvTq3VrPl7aLQ5iodFZprIRXN0-A1CDid55LsFIHVtT-48aGYkY55PFgkwttzCyALdJ_PlE6G9CyNat-WiJB-Tn7iQKMt0qRFbpVtAd4dN5iQ8TdkOfQE5xvli4SheL0SFHSZevXBzySYOMTAHIDfxNUPsxvOAl6tbJzNkIErLit5Q4lsj8jRLzN_UGU_ZqmiDsea11dH3CQYHUwPxSSntV_l1cSxfcd6NRStGCCq2faF22YH-1stMMgP9rzqCRR5tytwxhTlFDk0lrht0Kuqq0XXIduHaToiwoVUB_MOYzq4Vvju2SrIBm1pyTLhZueP8CfUMpmdElBVW7XfweX8IcDwMnCVi0TElwkakcbPxa1aicioDNDQQ5CsxfEPBXFd567Y-AjcVFPhJRYP4Gxg4qgH8D8I-jXnMy_yKu0IqqnIIj0iBgQupcXz0bRwqe7IVB8iAAy8ogAJxT8FPQFd3gp4CBwGGiyvPWT0FX4pscfKzCsgu6oB-xjQWGHwRGPwVdBclSZzKATpas4U0roEzdWoVie0Mva5XBsL0AQbFtFj38Wzcbptz8XDL1iRPyiGc8WyzmS5o86h3NRiBy5IN-P-WBfQrYo-RR76ESwCTxQR-M9-yT-fSq1C_LcT7JxZhv93dSHjTemCSPS3WSj8dC8p3-dsoD_-xLeAwuafmOy46P5uODbPzGOIXgO_3dlAf1C9u0Uk6KfASfD6Bt9tF8xH3Ed7FDj4y9uAUL0hv9nxlvBHSxgJscMsA7_R3kkyud6VkFq-NPXhdjrlXm2-FOv28yruWpnS-oh__P3PUrxO47qdlrZF-5daNQS8nqloP9sV62Kph5Afzmt1yftcx3NEE2P5etrdateZa453TZ-xyZrJMsL_6DfLfmKv7cInDBpp-jIIBrtvUlr156Z_I4cfMVz-ggbTO-0Rvu9F9L0SoVWke3YBSRi65sm3qwgR5aFwG-h7X7AP_NJF_zlOAz8JsFw_WuVX9aKR7qWQ3qumfK_Vv522sFGIt-9dg6Qe85TzNMfXWvpmVRMNWwpVBvnNJ5Dt8iyYry9KHNiCMa5U3j4KJWDKNeOEnZjNfW_5gGDE1n7IJp6xVGkWKFVtHa--sMWIWCzryLszFHvDeZIWBknKjvKeDuH5NZ7bk1mYEoHkE3M99JsJumTH01OVdSrgjt2-qTGbTFgmjeeJrh4BC7r5nAqjmfsYqyirvXmi5TY-KQzNhFWk5aGdrLQBUjHpwKbcDL3gULNtP6zyENjkO6GQX4w4jS6GJoUo3gSBtZw0Isd8I_o3m766rTG7yGlHbdRi3YWL3PwzzOyYTNAIhQmkGYeCiFXlICnTHT1cAZmAgiuW3njFUwr2M3SRdmki4cvzsxwD1yQWk8NnV8flW2TFCBunEXFJw8RG21WKg_yYRJcF1ux4fGFuGmOp2J3ecwTp7Iu9EJD5UzdhjxiaW58ch5JZvQyLZAvSMTSiNbrHNylU_I2EPpSsrGTqhseKiwfzj2SE_Xlf9FjCuFsTPuCvs-zgdSjV6vRz9TBjyKekkqNraH77EMav8PaEkTV2hEtu5QACTsp5L8bLwZESMyYfOsihovWFYU9rlvxHaGdavTgD8opPxgmRfi2wFIxvFltfYWLM7UL84R_rW7TA8NLtTPKGXT3iN-Q4UNCTDICoYvseEVbkhGKUmCi1x8C2BPPrC13vlI_pnc33oMItf5YLlIPv4zpbdv3TnNa8HanUaCxoeNTgYA1q5-4xuvbXgmk9L4WQTUeE9npw1po3ZLycgrqb0a4LcS-CGF30J62MzTeG-GAspGQKsythTA7ymHgb_mqs_Ah6wpr3rugHoRat1j40XASOmPq-jfIL2PSNxOWhEHETW-_jcI40FwXt1OIp4eV7dJHAUg2w-Sj0F6e9GjtzFBsLhFFz_Bh5-Sjz_9u_HlJ_gCH1q3jbYg-cg6w39A2ZTS25QeV0aw37r979ZtkPlbRcZtaj0RJMcV5Ph32l3cosbRQCMmEXabz3V2GhEZqwdE0m4QRYgC6uquegCeWCzL8qB2X2-9EcdZVIBT5ZIuh7NOJwQ8RS3FxmOA5GYiVt_fCeF4_o0oloPhAP6yKMAXiA1CMHrr2h0AlmlkFivT2UkU6OwkYNVZpsQ4CsxfBPm85xvvEOC25QXG-6kg1b_QbtHdKFCaiilhuTiuGjlB98AdBwGNfcqbXr3hxLaZLWrkRQ99jCT2fcrUk1VmP_HMPDL4omcAB8_GqSNSfeBw0OJh3kB5wGu7d-b2VgDwRbwqoO9EW0wkkkEKyr8PxkSS8nsvCfDizfg9yET9yq25p-pzZ3nKVMhVv3dSjq-Y8i4zV0JcGJt649yDqT3-L6Z2HB7Spld7h1w3cfuS91nOnw7DTTDcnizH4q0hXm3gCWW3S42XX3djrd2og-PAnOs250_cmGeUPaFMboUgF3mKBgHUGYNyMTTVGd8QYOUgnWkt3YSVLL9JoX62o4GClj6ibWxC7z-i5Gtpe1Yq9D4X32hdHprsugrdMZ8tmbIuOYPvwSqEFBAjs6LwAV_wB8AiAzQdplYaa8Ww7b7RG3y3CoNVF8RgZBMEXZBvG28vXva1KvhCSVs7NEUpq4o4cVK3wMabETlIL41w2X1rNXa4-_in__gGz0-USFidOGW_21Rna6nkh-ZXsf7VsGR9z5P1bWoni2s6W-10zKjFtvM1TsoJSRyeFEfFD8qu9YQLvJ5BLS6Zaph3qN3ra_dU6Ptaq_xkhj5hEf3dANqrndoJtiRqu_amqw5WIbMABdg2Yhm_yLRvI22c382ZY-ruRpcWzWYh8Aqc-XiHA6dCwyk902J8pK8K1IAYG068s75Hj0fatoNJzZvWd3BOQ5FG2SoxohGZX0biG6lGqiyK34FQXtXPH5C5YdJjhI1Phn_0bhuPJ7CubxHdeMNk5igK-CglFZeFGZpO5zcyv5xeRlXvkl3h3ytm6u5d3lFhr5xMKqF_Q98GO64Zvav601ORn55p-DbNTsXjshhXkYohiaGGvVxKoUwqtwwok8VqCDjElkxLhL4A6ao9QF8DSGan4gON55f29-_syr1dRiKGkRuzq-hiyeUM1rR_douQyVlTSBGTkeGZHgAXnsvTh0UupH4DTgwpA4NpKclTGs0voz67AldUZm5GvUJMdHfWu7SjMurpctqd9a6o9XmA7_AnZWem__jK_KaNBlUeB83no2yqZ8qA8IBtvjDiC3SNov9AHxngkE3V-Hv06fzoQkj9Iq-0kOB63lihrqZS4ry8EBsTUsrkhTnf4HifcSnJE9eP5jyahWB7c32CmS51VmCiaG3x4Be7DNYWD6yHEfKQ1gqLSQxSJUfWpopJ47mNP8VxiIOtLa2y0ZctxKzhD9oVTJ7xlQgjG5h64xBDPyfqLpRbONuANeVHCXc-JF3JlBeokp8k0xR84DxlbVESBJpDaca1N5OpiaD0DbljPFft5OJtcID6QuNDvoZ9F4YNz_ka2SsQzChykgPs4TnJmb5FJLtzvAUuVwAtpTBWAWXy1LnUlVdN9xgQEZKccXkJxKXy-mJ5aqJoWCQyrH79CGOHJSJNLdpfPMTGRonxWp2ArxvDo4BOoxKFGGHEt95UiUl-mUaYgqJ7MbD2nS9ZkiAuB6fmeIvG0Ahgo28tjrcowGXupMg_gvnuGSMJAL0h-FxIaZoOifQ4K3mGnLY2vg7okknv4ArcBL0jEnBhErzhPIE1bJ-Ck6wSW0EX31L0wcbkCWBA5DdHCOU5-kh3g14FtOGCvdMxNXtW_SQBfz0ywh_YR_2FKHN5OT7q0uPI3SGOiXkBwJ2PxxUzsB24tbSPj24fR_b64KweYPDAfwJlAN9N0Z7hOTGNg2ELqDNvxu47R1H8aTOuhg8HocDiYqeO8qCI_IIZngKk2bjS976tzQjiIQkj2Bi_xrihHXGnQ065nJjgBZKcmrd4XB2tNggZAXLFbbVIXLwS6iq-ikROrqCmtyuBKWohEcKA3XWSyW8Gt4t9QujOlX3x_HpcROGHSoJ5HmXSaI9iuJlV6ItdmktwRWi6jGA5XBqMOdyBclCHqFEU3Pmke39WYAxRwb1nDA4TATKBlLNCwlxW-rF3jz0Q28z6Z7bOQaNdsc2EHKkrhG7-S1yZ0frifmTT3L_8swJ8dcjy86kySpi3Z0pUZ2UxjkKxzeyB8BC80lzql0LOoAnYpbnj1hJEA2_l44CZX9CpAK4t8hnaxdzHfx_Vvr5FD_SVD8uxuI-Ol-RrjuGcgvsPHv786PGTp8-e_-vFy1evf_n1zdHbd-9_-_3DH9nJaCwmp2f5n1-Kc1lOv6pKzy6-XV5974eD7Z3dvbv7B1ufQE1jnXy6TfwskfdB-L5SZ5-C4SVbcQgEsdSY9K5cWI7umg4lOAkSiep208PDcG_hfu7bX8xa9sj7CQn3dsPd_t1BR9N798J96HpCBrv7_Z1982pgXu30t02aPXze2-7oWvXozXC43FLgNf2egbL0QG310PbBOkgjORLiW3xTT-CW5ntjXAW8y6XeN7rT7dskv7Oz6NMuybvbnW36z206VIf5kGaJ7HZTDiP3CLZyt0vTw8MBCHBX3tF793aYOswxLA1mIeFuR9PDw51NaQeQljYSb2PavcVqwmF9rZKf-Hx7ECWDcG8v3N4b7IWShXt3797dCw9kyvZ2oqR_OTqZDA5GYmd_ZzAYbA92JQv7Bwe7Ybg32B-EoUxZONiHhHujvcHg7kD0756c9MOdwd7gZH8Q3t3dGxzsjnb3x5L1L8P-9f8Lt09kumQStEt8sLsH6_e2CdmYyXF5Tuiiz-Q7PheXgA0wYO95A4YcyZes8fB4yYkJHlu7_vahCJEVPZ8VOp8WIJJY03dTK0m1mmjn5zdTp3htRSxC1Hp0OUW_xK1MtjAjqKZ9C1queKN2rpxu2oTQWVsl4WCfopH-etu8FQI4aCp8QIshBBsriUiKlJoQdmUDJZP3qtlJhgWDh7Fa_VaCBw5zzx-xYuiuxS7ElgUp1SDjioQHA2o8AQ1XAYkVEXF4sBuFBzsrCRyEqsYFDFeQoB73eZRNRI39jPuH6JfikIeDuwBb6Hc6W9uDQy5i0LJH_UPzdbC7G49JMujvAD8RbYWD_UZG82kfP7kce7u72zbPLhP37t0zn7e2B3f3fF54sLkPGolcGTuDg52DvbuDA1vQHqYZ7OCfcK9Z7CDcubuzv72348v2b0wFYf_GzK66DRvEZA0ZXG_v-ObsUVOSNiVpLEljon_-RSJoa_9yf60a1-brX2JSkUEYUobhjaIxBIuMsUnhYJ_1m_-fRsmgf5cNdnd_9F8K3pwklwYW8XOmM5ACESNnxl3xYDaZCEX2ESIiNApM9nYIek6ryKC_TdmYrG0kEBMgQqi5Jh0oj4zAWwtZ9U-HrnM8_YaQ6vJQDaVxLhYO7h6unGjgjUTX3rFWfWystcUVepuAt48dStHLWgHyMdy_5layemIWqN0pD4EgZEkOBLzEDT7H14P-Tv3-3r29RXgw8J93dwcHu4dlp1Me7u5tD4wXwW63uMfVKj179_bx1n5LSHSa3MoluG1GW4RqplR5CuDQaZYrS7Bmm1o4M1UsFrt3t3e2D2c_qsAANhuFexRVq38ZdGe1oW64R7tBKwOx61hctoJu0Q1a5Qx9VKhMnooAIrxg70mJO3uvS0jYH2x3Snp4GMIpi08zipzBYrDTZ_VwhYPO3vYiHOwbEG7zw2Iw2Bk2BtYltK_2tjslPtcWfFmUNclsbpadt-845NthXJFwr98dwXYZGdqVDMK7bJRGI0eYkkG4z0a4J0ewccIDfBrs4J9wz3-DxV6sLGsbI9HaDSOlBHIdrQCPAKwbe2KswGcmXESBiSX0Tii2h2hbAu9eNtC1hHY6_UMU2RzWlMRQoR3cwvoGquJyhXfDuwf7ewfh_o7JZnY-UTwUe7c3VIhkasAUFLiDf_aYOjwc3Lt3r7_QDaJ3Y9VkTJLw4ICFg79Tlakj3MM_-xCuiV3ADQnnMVrnCOIZquaaQ1tv9TWwF354WGTnUzHG7zEBujPiorE87EkWHuxBjKRoTAq_JMKDu6zARhVplIQH-_g02ME_4Z7_BksClOxkpfZnN7TqmdTh3k3N3fzlmdTbg5uybP6CVPoHn_Z2zIjMouaatMFajbWk95hiQq3qbrf-qg95uAsLfbDfhWhiRNcbaTDwayFKBoPtm9YJs8BHaSLq-urgXgqOfFlJ0Ltb4xhxd7B8QnKAOMF_vdywhSDKfGOc1aLC4u-wjmA1DL8A9-bYr27wU2uUSUAtnoiaj0RQ4yb3CDfUH5fkpk_ExMiJbk6BIXS8G77WrLY79Jynn4Gdnesz0F-ZgfCmGah9uEJ0q0ONEXZLDKNL69qB8YMjzN3UDrNu2PQHOLid143KuuGQ6tt8YAVfa2cxuDJCxXYOIbXUMk_AOJFl3W5d3_h6fd4V9c3V-oH5T2q3TqMg4EfXD23dkgs_7kxwYMriNb6PrfB3EdH83wTvStlJRbpdQZs8Imt8E7SZkQ7HJNk4RzfxqI3FoWq7T4V8UyNur4O0ggKxSQIafF28zi0BoHqxqM0dV0Etf_cq1jq50qKFp3LLwJgBFlfXQ-GS1rg1wu5CU5-_VZ3ZuY0qVgsDLLI4n-orW-qNxwUR15hF8KR27eaHvqxlfe2j1lEruqRFJga8uNfmEfVVLyd-56IcAJrjjma4KvlYPENkc_f9p51t96kiGu5X2JNwZ8en2D1wKcaQYmfHpNiriz8IfXRQSLFnMEvhwaDpyRnYFvN6G19vHHgcamAjW_3LUdiagP7GDm54sNMozljvhwe7zXd9826vWe2MbIUstCXcvfZlYL_sX_tiu3lw0Pwyqksb9PvXvgzsl_Dalx37ZWVISuJeb6--3revmz1uFcRVvLv62tW6t_ralX139bUre6XHmS_7YPW1LTvsr762ZYfh6mtbdjhY7b8tO9xefe3K3ll97creXX3tyt5bK3vPvl_p5kVjnsL9a19czQfXvtjKByv9HTfyDMJrX1yelV5XzTzb1764PH6bDXZ3_R7dGuzu2YBZgAQuC4ioejI7JcF5dToF8CRSoyiAq_GmHWQsH35C6P1PzQsWkRg9CVmrM9F6aax_f4EiT3KZqSvj04EY-tMK_HHXDagju7k8bWXmfgYXtT4QxcHubq8FXtBro56aakIgL0-oMoBleF8bKFMFp1_D_qHe2hpSCHvRBYKFMBYkZRREDh10RL_FUXKWAyYwUpyo2yg67Fqa5z1_-tqKZm3AfdhqFOS7rW7OWDrcquIr8grRO8HjjMmu6EEXX6PSk9W-E2WXa4ZLOlZwFbEcssE_RvtrH1DAAR-sGr3BixncPIYC0LwAUccQJBf-EiqZ7K5Vq1a4KQzHdGiwOQV6Tq5HYr4c9g8FDkWSE5quHCsrPNKPSklSX0rjoLpezMXmzsiVxpP1mGkaDU3MZaDLNQpqLGqpccqBzCZD4c1BeJh1OtnhYLCDjJ065HKToMKGj2pKQgZbuFwro_9BuQMn22EnQ1H63nbH1OeteQeDbVvXTt_X1Q3_Zm3bm2oLd7G2cLAgvr4NtZvouYPtA1f_Pv1RrTP5RZbfpJFOm1ohrCdKYrIfSGKQUCCNwp4N_mbPdjb17K7p2P5qx37UUYg4YK8ZNO_yTZqajA7r4cgOeRiGO2EY_nAwkLFARMrm_jvLQMgV7rWUyEZn0IUtI3tiNzXl3r2wvwBx3B7tbkqAMqpsYaR0XqaUw40TnerWG2W0ab_BhglBrTZrCP0Hu3g-rsh6YLp2mry0O1A4ASDk4eFgB6QrtIuhpEHv5h8HoHszTyLZTpk3_A7F9m3j5XR_Q8nKlzxYLXlnpeS6nu0ULhrgtam-l9wmMPHbKSbYWW3m7moz95rNvLvezK66EwrDDyALcnNr__44bPF9sAEh-_SGyjbysXiK2kMUbAky4zEBz2WMawn3nzleZjSDxJFYGssXyee1Vks3_e6gbRQuZO0j4C2H8l3Pasi4RMsI8ojX72in86j36ZOoXpbjGai-1p0pg1nj62_SwdrQEoU8gmDuKAEJaPzIoTajR5TJrzy4pcQkYPJ7jeATEEDFxAJqc_7eSSj1YqGZfOMDlRnsp8H1Y6yyqRJa55Mr8AIaNkL3IQbbZDOh60GD9h2cfDFF44pIiIMHSCDroy1vY_xR67Yc1NL5SuD5GSoG8QMgqHLAgAkPmTVRw70HcYGWMuuOqk_RbwN21K2m93jlQ3tpRMj3dAkwTuPLFaG05gWpnTtU1rG1hXYUFjKbOcBDZsFRdXyaRH5N4f4If3lhe-L7Jr-mYHMBf6NiOTRB1gWlzQgXpMake8f21AkkEE3RBeIC8hjgYoCothE1tEnK6e6zbRzrxaLhCZx4aae_vzo38YLW-AGL-TTmgKWBJaEkCMdivYMK0Py1E9XhCuB1zVgilo9rMwd09WcRLTRqgGwbZr_sPZPxAIJgb_gKBfgEdAm-JWqQbe4mLF-NfgqNZfKX2hIR8X_waWSWpvwKjqsVb5jygSE1TfATep4hNpV1qKjtJy4o_F33MNUcWgxrAIPbRlgzBC2jzhutwjC2kQ_UIomx19gEP0bMoLt4iFXCBilbSoxEfgGiSibs_YOC_dPoC2XvqQsuJ2zh8uVfFWqdEP1lueDmXJrASA1rPoTUzxFygz4kDW18Ds_gXd1ERKwDxEIUSYTZIuUqjCecvo15MYN9iwOzLtJ74fV7gLwc7O521uA24NQ13rzQNi4w-cb4GQGoZmQe-saLIWt6-43f29Urf8EVWftojxNI5UuBmCEGnJPj3zQiCfY2XVOBOiylCQMl2Qz-scZyfXbB-2zE-2zC-2wKL0e8PxwdkpuC9g0nXT5NRmtIoFG3a_0nnYE0E0a_4kANpim7gLtuh4z5hLIR3wqXkcU7niJRdp-7fKtKRpyMuiH9Z-UCkHVJhZXhcnbBjUXsOnhG4HYY7m0RUsuwaXeH_jPcu66x3enqbk6tEnh7aBE0p0T-CTvZXDxA0-veX3wM927LP5FbzClKshvfDHDJ5hvmcCtymJ8_SQOAg84K2WqbjWB8e3hKfCngW6Huw9bOFiEXH-vv_wz3Fotwj2L8OLepV7vXN02Rm5TVmg5l3fxmwesNxd22t7MaumFFqIeBxLiQYFK7txNpBj1KClh58hME6zK9q8Es_EF--kyCCSG06BUpGSk-mncrfaS3Z749NsaNwZMQm9iiS14-e_Xp6P7jR5-evXr76MmjN7Rb_HMtxf3fV1Js3ZSTRkV9K9jeo8vUOCBJfDDL-I9IvqakIPWeNZEUHdWTv5DyJlFwLNBttTgCEpNF8hYqkQ3FXNu-dGmjutnbcLe2MgMsI7jjlJGRtMpOB2PXAF9nOCracBHf5ufxeXTOE2NAbkklBq1efdNgyACentJEpj6aigXrQrxt-TNYSvy8lrdBdtGZ5bUEK4Uz_RosT1S_N5opMDg6Gql8qnuVGrHgH-CtV1XcpCF6is5_wOghGALs9znXUzDski-4qvCbC3_4iOsrIp-vhMU1jiIt3XrUg5C_lMn3aE1O2vJFnRvcxK2FUMbMK7FzMX9NBsFq_7dcnxH5Ap3OPDExyW3QVX2LACSXsjvkI4n5cUzpgnw87sHvO5TeYfK5M72J0Rk5ZfIpmuiBI_KLDJySyCf-xbnU8OJ34y0W3swqSOIs4SlL5B9Mfkg5zlEif2Wyn_JEfWDqQ8pkCFx3oiom91IuwBhCbvu22lskhIStzvKJJhhsp3Few2WpsarxgI7hZc95EYSjE0MG-yKiDR73mkGFlcuLRqz3ZQurapUjXBbjgPn8WS8fQ6KMYXuXLJH7TB7YfiTyLsuFfcjRGifP0Zlwji5y5AHJc5aXpI0-MynLESyfZ5gm4-02WJVd5FV-UqCnOB9nEt_l4GD5SGcaysoFyTPWFiwv6uJyTuQ-yRWqXBmUGLK84FoQMHvOS_9rxomsXBTJJAArl7N8jC7W0Rd6wIITMSmVmMmizMaBiSmVa4L21etZq7PyW8ACMFsHdLBP2zdpvc1iUHdjdIbQGsOR5YqY9nY6Nhtl18YK2125HiQsv3ADPeJakbmz6ceDPJ91OvkFyWc4ApVp9qSBrN5hpfNInc0qwGIDPXiEVg9tyE1s9j5mx9Ed9cArcqY0rPH8bHUIJ-UIPLsGxpQqSNmj5jgFJ8VMmd7mIzAVOwUI4urwGGPOJPgirsblN3Bgb-2WVp_A1matnkfEMHd5hS07BXH2lbMTyc-N_Y29Z17F-VWkPhBKu8GnoJufwAie2Cidd6GnW8SHHM-vehUa7vfZ1oCy7T26WPQpXTmcsBjS7eanq-9ZfuRDmOVv-TwfR_kVOxOZ0ici05G4C8Fu8ks-R-Hg2-ykimx6kiT5FcvfpgCPsVbC_uOSJfkzlt93ey5_xPJXbim85uoDy02sXw41mAjk-ZG505bWedITOPBWTXPQrHiUjc7qH0k_7bqfYXpYW_uIJcs_rZIsU5sHwz40QSQE-j_FEjjIABJ1C03HICcbGac-4P_UOu-JNAOPiOg3qR8s8drJ8j9rqz6CwdQFa1ztvFsZFGpDz5CAQ1Ru02njhszQO4znEaZMMQzwghHKTQh0lj_ktRBPMsFziC07bAyO8-4A1PMuseHqwMbG-IefA6bZD6Hv9lpM9YbBHX7H2hXbFtsQpI4pRfIjUCgBg_HelM-MFU__UL3vjWwANGebjSbm1CPgOp38NTESrWAKlkUBm2ZXQMEgyomEGvJXxPq1Zyg5wmDsynSC5UcmxBCQl5cpJ6pytgZzuQ-xkJwdD8RF18T6tjrSpcpOEfL1TItzEnwCo48IfHFAEGC2lsyYy21ICZt2xYi_aYWCLmFlZLbo6gZEoIVWMzkiIUgyVwDsq2l702x8hCRswAKwX683KYHo8-9h-J3dlDHl32gJjqMP6IEX18xlYH1B_AzcZFAQsJZrQ1BtGikmCGx7_aLZBnMgim8N-38ThyA18hDc81aeAyuQoG-Cv1UPzD1lK-lvnBq489fEvDLJA78PUVY4XMmC7f0irhaL9obFT0RPim8ohgTODkS-4Kd_kIIwEWRbiWBmHWd-BRdLQA8FX2dCYdCQLFa9bASu2haLetmDXxifJYHBvOx5AosTll_2PFGl6RIkMs6bTAZReU2Z8UpGv0gKpC7NIhqfwnRlQZkXqnHcuV2JrScl0Bj9ghR1kIlE_Y7elWFmgBY06mGFIw-F28Xlzbs4hMqAOJheEX13pT9MQCkF8FH3ifFTUWCmpTNi1AoFHvBZiWx8FbD8Etfb1mAXbutNlsPCXgTSxa1Q7Az189XqarEYiP7Bpf9ae1x0WDi_3_b8KWkobT272FI3u_lbcEVTczVgHNbgZoZyn-ABBJfmzSWIOH9b206LmKiaxWnUapbcklL0R3B6WhgeTLoHYXQJCOTDMRLIIiX5Y5Z_dUfzd07IXFs7Ns3D2pLNyOGVQGFiJHnYb_rJshHEVSz7kfxAVzf4GslVXwP0idVnBeb6ETFQXwMGpf4ayT8oUgQY665uSh-sd6eSzbiL2hRGPtDlcAbiFWzkGFXXIC1pjxcLCHR_iNwHECRgzuy9A5P5a8cY9hKHDe9F7f1DjTa-0FZg9i6yApchBrC8M6CUPSDKiYHno0JkyqfL_pKYwfDYBX7B9Qy4p3HKNxE2iG1WZ8JbPdIy7cnWYnEBa6UsLgSBQoHBKRuxrTRlFykzbrB-UeV5XomeykYCbX7RtwOqM2Jw5wonyZhQVD05PyAlRLrxTWiNylkxblmcajbyrjeXqG7K31hPXKjkORHZyMld3RKTLpQPHOUY7TAcej0PJCy5O95LLk5BinSNZuegJvDez0DWUcI94SUYOLn1YQM5wQjkwGZhoN2cc_4eAzVT1i6MFbeM5a8kR2jsmkwWoiyj1EW5VZF_N7qjX0jIjDs0F3vORxsGqEi8A8Y0pLDOxyYCvUGz-bnQZ-U4coqm4JfXR2-DKHjy6G3AkAmLAllu4a8AuNIxONSBQCRBLkfFDK6F56DoC0alqgJg4ccglZgHaDoq9RYAesFiXlzqO9Miy-UQzS0qoXlelVv7-7sHW2GwZHDBibIlpdZPWWxDRl-Sl7UcXolqWspKRK2gazpS9KBkkIZGXnj_LVOSfLZ-KQH8g37drDdEQPhoDaBI8OXWDZd3tnufqV2MugTU3G0SdlFcvqoGM44C1-XurhlZw0KI0mitdY0oJna7F1BUP6oVG37rg049eg_Hz1dSUCYuwTY_EpewleiwJH3QB8jsIj-FMNW9SsjxA1zVYKUsvrUeFOWJ1xwmGZrIOwL_F7MADX1JAlNcC0quHTaiaC0JrEMmuIkG4LrXuFeCSye6PQ1Slv-MgnQ9ZYGNZRKwIJ84L6RHuYnXlk9elVK8xDM_ZfkDnwl10CBtKBUm1LoAUZO5_EDS3-q74_O1QGdarXlJxEtR_lvNRaCvCcNJGFd6aKOtUxjb-h7jps9oO5dwB4GD3fk-wYDa-W9MGJWbcaNLbYxaOF_kvrsc-FNRMNHpbItt8KpkmNNH6AXueTOQFmne3uprG62lTGIPKoblCfwYaEeNawlwu2G0RKgwkiYO65ISHc_Njooy51QWo2Auo_q98weIkitwgczmpwLO3nvqDUF3i0xZ6gKUUGEQcHBJgVePxQLiToC8U0HENePNj7o2I4jYBcX5l7gipTPjcrNoVTv6BVH17ZXnt4i5i6M5nF1JiPdZC4jnhZ85-o47E-cZrdWfM5Dd-dBEqK-dWeWyuWr7QfCOcBmK-CLwtggkBVDd6BIYPKP-BLFHhg5lBQfpBOzmOx1dF7t5uBtwIPW01tInCsTp-c9wHbKnjhdFgh03WKo2uoPwB1AswS0TlzJKDbxoIAy87OCilh1cOE9wlqYnF25BQRVaFzTOo-tOBnWRQnRbUqFwArwipZT9sJsKGMHrKZrrCxtcBx4FMQO7MLxsyWs_kcT76DJ7MQdlxryW-OAC1S_IGDYP3gbp0vqRPjIXymfj611aS9AUnYNHwvruU4t_TwU4UUpSNkHHAD4Eb8mapEcyNdxwFTb-hld9bl4XOBPJx4lO4Uq0Ot_KzDcGmptYZ6uS2WmX3r_fMnWDboth6l-wwpaUTfyA6uf-rIKU-gWZ1DdpSnsYt8_1yZQ2gdL6prSm-1Dn1jle20F2ISyBaaOsqgUvD0lF2Wxpvd86Fw1mf4PTjGvecOuwsNskeO9mpYeUSLC5dygcabtZ1ZJifDJPtKq_JlryPyBaskaVgm7auuStKRiuX_Dlyi5WCRlweg1i5rGnQAJiQlb2Ol6AY_v3uhcq40vT-8R2H2oq4Hb-2gprytVMClBTVDV5qDz9aPbevIIwsrXQ17-m3ZAitVl1bl47PTdLM3cEp2LC0BPgcJUTe1YbyBCK-zyVUf700rFfYFHmfKAbmhNtpkWG0AABK510FQiYfgxjaMba-a0V5nUdKH2DI3LbcZRf2ofrA-xSMUvXH6CYa0kRpdAedbuLxbg20Kq35KnZkmP0WXoLda6rO9IyOLDBh84jdawEuWAJLgCGHXLevczoQ-KVxXTNr7qfeN-lJYyRpSbKOH3DZa2fkwvHwn4nftGSG6hzZajzxX-TOm-gyGirxgLvCrkXUOBwG8MEwZT5BQzU6JBvo5M3GINOh_yYQjuy5vWtf0HJcfzH4APaDJf2ZNffvJoksDQk8O_SuurHtK6uJH9MSGPoxdKKO2u1wK8GHXQqNC6vT0bTAQFb8X1l3__p3xu_u422O82C20Y2qRmeFE-aYsnyF7XL8_xp4_cTnvTu7rLe9nbK8t950hu4hw_cBJPVIREM8ELesyr8_CKuUoQuiDgR7DM6vIaVBK6vkYAGI3Sct1XlY9E6F-elumqZuKJqSho68TW2UBi2kC7pZ_bURDDPB9aX530QC0rjJxn9VAVngCelhu8P_hEgfWzrHsrCjGo9-DO7yCoECICntHzPlGUsXBWX4HM4OJlpXUosSBknp-Qr0Sy4H7Dgwbu3b1-_CuhiETx79cu7t-gntNP5StQBOuWCSzT1RYDP_JPzXEN6iGb8hLJ8x_oXDNdxh3Pn6tE7fWRwDYSAjaQOrYMd1bkuQKDd8DBqHFfWCASXNAPo7Y8TCuOk76241NcTsrDfpwxGNmpkgOcV_6Z12HYITapjdK9YO_bMtx0Q9sjJQ46GLroyyHxTblySCsAbKABOrGBAkjDFG4b4lchLVC2hvy-8Rn2AIiw-Qf7sEXxt0cCJAEQFMAttweQewcTGXn8PygtWvHHV8foMxA_89xuP8FN2xk7ZFQiBTD64W4Oock0_BoP_ayIve-Boq4lQ-GT0dAivrUjmJYYFEG4XPUDgNaQ-SZ4MSy6AjZX8XgOumq95Jcy5BAoOkewNL4rFsDn62RMqOmIzWc1OYPGfGK_pij9dokdo6-RcWo-owMbSpbntXfD8OZFP2ZjPs-m0uEI3Z48gxASQfjS0XnGCC6FfYaNbr87ugZu15NL42HaYyD8ZZS8740_gFAONgtVKNrdJvW7hHBqVCqAUa3y4ZgLj7TztdPRX0LUtaUPt22AXo9rXZzsHpnOxAD_uYKoP4UheYpQp0YwwZeRbX8QVhJQCboGs3C5gzPIVb5UeKs0K_uOQWo0YsSAyMIFgY_GBaCsWMm7pu8EnrxbVo7O33hW1H-0ljV6S4AjlPC0BM4aNNwWihKg029HybmIXT0M2q0MhIGbCNdVH573OmmebWHPDZAjjEU_VbLbHq1_n2j2yHM8SysQHK_TE8YjmJkouRhenTCT5CxsM-znBB0act8A2WlUipFw2Qi0OPRA8f-GhaOIDUacEe4-CnrlfiVFjVW4hyAEmuz678_-cR_IibbnEzeVk3fNJMavOjKAb30VgxdioK1sNOGLJB4yq_sOQzP9oQS0WYpsUrCmqUpLo3g3buzkJpgAzCXAzQZEA7lRow5Kydl4bPiOYOEMBiPQcitg35E26YBKgK1uX5s0MGjIDYWqdc9tQNEE9dt9q9yoCclMziggA2kUZ4N2GFWAbfUjashYLvViEu_3-ocI7AoxkVkv2kDHVTKZc11gQ8PCR9SyQXlCW17_9TRQQ-DAgdT0eNtzpVOiPtO41jH-jzUvKcIlHFbqP_AWvCL79FTEOmVd6qcQp-OlVOGWYwWx463ETkdxzI78DKLtxBQtYqGWtboCDdJUm1XYP5BsYCnzhsNViFX1LvqR8TYCKZmclBeMPpCPEhT9teJ6vA7v08uphKSW6W6B0TKyczVhh5s6Zb6JYldYeS8UB0SRjY3BpC80wqx8ki49JxeoTtEHKINRUUiAsn83cXk_sfWuWwtDhfFA2XoLmCU43iMSHGNMp77NTfsafsisYtqMaIJRPyJU1z3GuPcLDBqCmDWicxQKBi8Bpo0wYowYgX-uJo0tgMDj2-xE4X23YTigayQ9o22pkzJI_tSHyxHPwi2vYbmNe8MF4wHAUtu0h1Zgluw9r1Pr65eJXgo5N8QnDIZx6z8JVLfjMHjWsk-Rlzzk75cL9ZKbwW810_Il9-7jxVpAjyp46inu6WGR_InHO4IIQP4lI5S_2T0Fv4jePdFbT4onprsmxFfb7EZYRb-32o-ylfRkpsGqID_oWydyeLBbtidtwZ_G0G0ZOxsb6KHagxqB7ijYKajg9dN-HU-dk7ZyDZ-fhOQRf2nBgwZ4_NwdWgzMTJhM4OyPBqDw_zyAsmwDG5inDZtIRhn0H-bCTUGdw2aMXRr7wh7kE0sbnl-Zz5T5Xq59hQKjYJiVQU-u_u_EZho4SzU0rRU84Eg_lzKYwR5YBbHzKx1Z9QfDESBrnylTlpcr1FQZ_6ffB7UudEW6CTwwgxMos64bg0oA1UW9-QKpplvGnJo4U0ynGV4LU60gqRKxPVQmSo4dmYGlNX2rWL5bRU2ocMGWLBVzXrdeirXo6WPCizCBcm293FQUMkSywt5JBCjBhulwiIn-bHDEMGKxkVmwJExQPhD9LSzhkp2MntT6N4KRfLq3POB93Ce7Fm6PXqV-ZvTS4IHY2ncHzktV4SUcM4JiB5e8BBnpOKLNc16jBQFywT5_y6q29BzyBQI2rwfDCRjA8uCnljxpnp3hH8g813A5ndLEA2QNLknkif08j812vf1-y4H5Rh5ipAvYkRRFb_ozUmv5G3K1iaGE63ITjSAQrUhctDHdGYqOx1BEpQZAZ_FcuJ2XArI4Hzkd2Q0KrJ2qmtZLPfy1T6hxAAzM4XufggPitvmFo9PquEur-qZAgjjJE4Ij85lA3EBrzU3aKVZ5l1dtyNjqL-oe1Vvg8u8SXvwAwuMKAmlhYVCfx7xgG5zFb4a1b928928-KTJ7OAMoNEr06v3-9InsDt_R1wJutOnL3bwTWlfClRQp5DeBcGQQWzdRVhDp_uF9PhALz_AgU9DC1wDV_L6WI5nkms-iZ1EUPLJ3BbeBjDEFKqIOcjF_jlbsiFJntP0opmPH8HxFnIU2dz0Eo1HjIAMRxr9fzUnP1q7_9_dqrRkoIyVRM5iY-gXLxCHJWKhgnI6LLllyxgqv_09i1LrdtZOn_-xQhNsNtiE2IlOzYBtVmOYose9aOMxaTTA3E0bQIUIIFARwA1CUkq_Y19vX2Sba-c7pxoegkrlRENIDGrfv0uXznO0ex7L-iIGUlbLZ-tJJqdXqVUL5N_jev0R1aEO2nnjSQf7mMpyqIyY-94mEDgIWfHz17ORg7t9llnKDsypEaDg6ejR2afaWDyqrFTZkt4K_Hk_ircJHjatzHT_FDlHzGNeWTx0t0GhYzvYj8ZLNx_dWGYAgc2kikljmhbNpDFqavvIK9UQeBzhADSoULDWggzyCyoCGfEQ5mVUlL-C9dfAjtyjNBfmQ757h6FE24hGSsY_zcbDkwvOxs9FH8C6RYXBuqrkSFEC4oZYxg-8b5dmWk4saBHQ5sHB2EymvlNUhkSMKW1zoFozLza2VzY-9-Y0R-AYNdxi9VnXy7aw7Fr1QlOrjYFT8IDfUcdW5l_KIy5M9qvzctzfDwx6_M0wbxS7xwaJxlt9s8FKLMXCV-1YjIxK8oJMPBN0quhEWLIhFiO10YMUgWkyUoNyG3N1JHSK1wpS7N31wNZaBjqbVB8OmkUdwU9ovU5PnknyWBIvEzvkb6I_3E-9K5FQ9EPoeBQCU7MDN9Q0hnUl6oKTccdYRCpZa00cIlRv2Ymui-M6Xhfw50IXVob_WuqqFcclR0TqVKsNCQoQ-UIGVnS10XCDmLSqnnddLNVWQrUBXfP07YryqcmCpFOQ2Ga31tSPz4_wYy7y3TuCzg340IUpulZO1JR4chJctQIgen7TP3HJ1gnQ72JDU4MnvGdKZvz6wT0gk3px8rNoFWUGNmq_y5u0IeM0ZwuVLfUpbBhJxar0suatXpgOFnZtMIaBa_V3X1lOYGognHsFTf15eU7-0F5HvXlp3AO7-sUDaoqkwBZnL-GkvLnOSLN6q-xW63_CDesCTZPoMkg743tVwa9D1cS6_hIh1U_qhnjTyKQmq43uyzjIj3Hkg8LmT2V-jNceNVPnWcUAlVU8EYJuyyRjfkVBwK-eO1q5FZYXX-SNl6bY_69rGLPLvNSg71pzZpPx_nfvROaBk16lJtnwvoClZfqq6xFDXVIXxIt-yMMK-X_CuJZIFdtW6_bXKjFAQesiXdUCG2MmSjlyIzfegn9WJB6vyLWMoKZ2dvFx696oWMh_4BRoi5rB0KiY1LJnaQNG9IdjpI7nDpU8OrHns6j6C_31AgI4-0QyMU90cFbpKmdyij60Ejdmy31XXRKyFBqMwfJxAdbpF2AEJv5xZdmHzT-KHyRMTS2QcsOXrZYsGg03Arer2Ox6tqcBW-ljjVr07d2FEu9U0dcNNnKqB7nnEBD9Rchz0WuSvj3WK5Bwf9K6FnEgETHZLQez4YuDUsX0a715fmYsw_qa5vueW3nzA5LT_bpNudsG0SQ3qN63Rh-sxGs4yztNudQ1f2RfNwVdajY9L0QJYee3Gp9iOZKV7l7BIT4nUxXcBygkt2Y4DOMBCfFIEWhNawj0mQ-Oop34N8ytk0K7kZLEbpg5ng93so9eXXOoDDn0--63bji9872WgBd-37_uoDtLSN37kDPMLO83dYRJtWebtyC4-CIrCXBb2Shr208zbss_QokAYmFDlHl-_cZvKMjOVilMZItZ7JmQKQHV-To4UIxa7XYsXwU7-UFOoF8gR50FDIy0fROqXnOHJlyvy-WZbX5HFg5-dEGfvKFCqt_faA91hlzieLGFVMkbSIEGaJmMm1X10GW2RvX-ui0YytSsyG2a2OUyi37ftFx5z8j_eCLfD6mZawNyRrDdxJfnoHzNHSoAN0Jmz1L6RaYNG563bFxJvHeVFO9CXCxKYVf0LaCe0-Tq9-0lcRhZEvfnfkm-_V64UQk6q8bb9ZwhMEFgksndsojJe3jnRm-nah4ytErpGlihaWoc60jaLbijVEquYUEJmauN6yvKW6tfiB-EUQTRtOnH-IJHCW5e2F00NyWeXDoQS5iP3oHTFpiBpYT-rB7XYXUT6HIZnOGFDb2CZlj-lsvn_ECcKpO3B4wZ94eRTGWCBQxdz-Ps6WaSmfXA-1E7kU9P75Bcqr9ZF7IR9sWq7tPqoS7IzUa_eDKfak7_pcKCiLGl4WfyviV24DRsOztttNf6nTjK054tLgwIc3HSzsecRrgKdNgL-iKMH78OlBSPT7PSOm0s2kWKgnl2fpQjj3X8SCbwYWIrxkn80xakVTb2EnUuUoXdFEqgRBLnmykCBYbHEnyJ1ywCInuKOeSMeO7_RSlFaueqXkEoiM5hKVytR-w9ZaJCZu3fDVCMuEM95XzSlNmovWYuLWAar0BcEUorHQJSom9no6d31dinekBtYpO4tsYdIaqeMH5QB11J9n-b3OQ0fOkTcBDSZw4EUky4Oo151pA4h9HSP15zGIesohhgFnOqrapnUkw8T6hNkHz_RDYzjiaoiyzgWCUi1nq1-q1_o9FX0VkSjJMwXxOTbSOMmu4tSRttmvj9j49SHZskQF6VNX2vg99J3OZL3OfyD9VkTbVZBbkW7U-6OjeNzXxjt5W6XRp6wm1lCp-DXV0H0yGin1qojITvt0WUT5HeoKGbz_jhztajllPZ_uyQ3id1O3mRWdJAaU55oC6LBLUyWekBxQSoCh_GqSGzwfyFzPebUzIT2qzHYEo6E8isYlYj4x6kczVvQzuBiqiKXQMrHCejeI5VZeynt5I89GCcoXwEDiR0uq_JaGEbhtB4hW0dymvVJ6da26olFIvqH1PD2lNqXwXF6ckugIybDacAiizmtvfwnwWm1XOqyrxFG6tan0l_tR8LfpmJiY6gN_My6OXi93mQjH38lFt3FFxpJ6rt5RjHAgH9W2CzuWDfehsBlly_HSXzI72xS-whjzMajlx6BR36-ANkYEGeSE6QzxHxdIKi-EOx3p4NlUlVIHz6cqlzr4bqrSjbxVAXbzMfIS_hSkd96ruqsb1aeIpr3XT6Cj_Gpx21w9Le2aqB1VXc9UAPxAmS2QjoufObXnvHGZlWV2a3ehLK7M3amcqLPgYNo_wyp1ps6CIX4fTuWJmo_jv_vxKQqcnwSD6V5yNFmv8etITPZLUyCXKCy6XT4iPzqzR5ztl1xVlw5ADG6Bsknd7r1YqJwcj3N4e-dqgTb3Ncqg7iiu2D94Doeu6PWu5aWYu7JYryNRKEpYhkEtfsdgb0-A9Exo6TTaHHn6BxZ_swOuwszCs26HGVf4qRbkeGvqmdCF2VFOy1JrZF2Tv_ZeaHnqblwTxeEhCoLP2gcsPqlLwsmXH0TBBYL_aFEszaLYVjggDK1rtRrun7Zuih0chb_sdldltvCXwYDSGW7jMEwifxkMaZNHkr8MDrC5kQX841cMkpxJRI78T17tcux2Z0ivajbtg_1Fh_gpryCcsaqaEdVR6sZd3Si7PTpRmrICTYIkxtLqEjNFU4rzHd7lbNOmxOMafZ-jq5OHhXCC8_PF6sMG__9xM21t_df__c__TvfWIvA642nPdaRztXRs1vNAZmoAP5csUDEsV7EXPRDxI0i2h9OxKLrdXm9Ju11fFHDU6x5BsWyI-7ujxhaOzmSvl7gjPpPDAl-5UapN22yo7y9UwUASKPjFcwm6JpMFvKfXA2QHUfYN6P46w1GY1Y5U0XgGYJHgvV7gTuYcB7bvb_aEMsMjHml5DTTGlRqMro4qWP5Vr-eGwdW031-vxV1wNVUrEz6qqyjP5H2Wh8X3xIPkz6X9_Ci2Pd8_OHy59130zN2g_4E7EgvVucaaNVcD-OlmveFmc38dJ0BkVDBdjLdI8k1UCCVZ1SaD74cu6icSsUbExwp_KZOYSoMn-8vecDDYy_bBhdC4naS6HdkcZgRRoec5GZ-QZrtECjcP0tdq6B0830tYt7motYFJHkW_6uQmyoWWP2Zh9DZOyij3zt59-vVicvL3iSu_qIE8NgWU-K3D30nL1Oj46K6WBT-rCy-NHkp0A1Z2vtjP8qN8K3-SP8jf7Ir30S7xH9XPzalTSbaP1ar80ecLf-mp30ZfXluninir7oLjWpV6a0qBuyM3Do7_cjBGutBJCg96EZVEguJMxc8SJ5lD-196v7nyuNf7y0G3K0ievLWi46cNA412Lng_KF7Ejo8OxyjM9rb_g_yp_4O8Ay-Z_VCuLx7FUJKEejalY-4AFaj2y0dx0Dj1sLELYIKNSX-lhfBoMO7zL38gT_jy3Ia7HsgPyixme5VQmlO15VtMbcITnMiT3sTdu8U9UkMu896Zu__BlUsyj5e1m1uZZbp5CfBiS3BlQ5esl-vXyTjxq7W7cZBWc9R3i_s5MKTBYDrKPCvXiZ8ICxK5ToPDKbEXB4dT8jD3eji8ubTJzIMIV-Dftjcfu_vE1d3ny2X09lQq6qvsg7vbnOpy9AjatxKruKh1-fTK5lf8TeSS2Iii9Rp40bDSts8EIg6ll7HWDzw21-6Com5F_aMf1byv0UCkMxk91YYbLKuNZC94vo0C7RNopxF8sL5p024iOFS4mZqoNPvGFRQvitNv0vF2jwAUfjVQJNNdF9t9CkcJ0kYcCZ7rLbW9gePD7toL2egKO_gRdl2IIGcpP5ic6bxsXMLD9s4-sUOSftQ83ChMO46nPRvfWS4A1eI3l3q8BaAc8UchYlkHvay9vmqaozD_6ldIOtCqfIE0ELqCY6leJB-YxLMbZriB6fiCkjRax9FI3bKmAWr7kdILU4y6U9fXP9Nm-VfRxmXWRk85ptpOMq2sysopQwwvZ1ESzcosf5Mk4l8BwOvTf9XMzrHBCJKLEyQVVf0UqhfFUalDEYMS113Ze2hRkJ5F5Raftwm7jglaIBCjjAxA1I_-QV2s19HfyVICMZdAWHtkKJTBzGkuKJ01QCi0wT7mKpMTIb_lkU3SGi0tPC9UWbAkpJ0DfpOQWwvl9Il4cdwf-lVGpBk9hYqWInTdcYFA0SFz_BdHA1dXZb2LCgc5MEFAuw9aQVz8qH8UUJf3_xk458Fquu-VUVGi01qNcZztGy7zx1WoGhjPWY_u3lQK3MwoDBK5q83gSBXdbhkUYPgOFX64MjokGCzgZIcib8bnxEqHoX9K4GhZSa0Y2i295bmKafk2YfCz-DKJ06uR8-v3n_GWYpttVCWiJSrGLUYprfhut5sYGprj6zgJuRTdHB6iHAl9kJheMdOppy2SVJqGevq4oJU-df13lYOm4ZjddtA0sydyYnRJC5HLwKFZZn3SD-VtlC4d6ejlA-_ApGgR_8PvwcDZ_JlIja-GcbLfMfkCOzxA8KOIrb9Yr50f3_xSZZYZ-G2o0jkBho0wDCv2n_oZR53U47Qv-yLDbrdOk-9gHJGseDJNHS1tyhnETPwdO9gOj8SW98CGT0Ex4i95ySRn7TNBU6uxOORoss6J2rdMj9FkKajWCPU6BZSEPPCEHgCagUwkuazeVMaeIpvIQxUTGlEtyp6jb_EnbFw-zoUQR0TwHS_M4o_PQEpelUukmYenfQtsT_7xLdjAevsW_sQJG2s1gyIoU0b9DuUdpEUn6XZjOVP63nw_6FIZvDh3BDOftJqtF1q9Ln8BQqG6er0-tZdQfJGF1Zf5C3QKpqNsINZOfe2OV8ZHkGD2tbwEG-aJxjk7wzqYL4aEGqG6SL123n88raYFZ0mVY5GqVcRixY-fca7zRr5z_VNXooZINecaT0yYsdkTN4XnefMNCWOC_sYHINNZMe97ImfqmuiS4UruqEZk0bRJDgHMrdf_Vpow4yVFE64p6vXnQgrxXPC11NZ1ut3rKl7Y3GfbsL-IdD67bu7lFgMIcv4Tr_Ca4ov2q-KP4KbWk2mQlWABqsVKVONKdTq7zvKLphTlJp-7wvtcVEvAjZzIe_WrWG1FRqmrZh8UqZmN-X35l9LGcvxZFQbdetFwwyRz_3Tn5UctUY1KuRRNG9tHOlJDA7WxLet16s3KPPlvEJWlzP1sfuuEf-WH4ho4JAwsB9LA-CQpECHiF-K-DgjIew-3p97JSNyDHT1uB0IlPylM_nsveohLdV_Fr2S7K9BM3SgzksSlSn8RN647bh1ELjC-kpgoxMG3aDxN2EY4niMdx0UJtsLUjZIvXXm5XqcP3kwvymUeHfOr-xilWDr4wio97TnK6U16XMDn58_vj60IFzfuTn5LQ6xpaNgofqQMFxyWpIoMrgY7lU01pWyQXNYO-5xJu96HACFOMDTvQQLvMhty3mJAvokelwtnF3F0iw65jjDDGjfPe0NOOq5X1lzEd2VSdjpGaIXj0A_JMQesj6pr7yCc0O2SrgjBRraVS-i-LUSftPYD1rMI5OnjFUP5_GjjmxosJjbqiqdEMe11NjfmTe4zlAlbDmVWdEIvLiNOL8EPJVr1OkxtHINYCqoSDsOpz3ELU3vEriLW1hBfvxFj4wGOI0KQE8yUvhahOxKz9RpYOQiZmQ3o4U4v-FWEDk1q9nraaF6lP1wY3cyIHc55uOt2o4EoZSbzigcyTZDJXNOrjEmdjV1fxKqSblvdXsSMQeAbYDXAz1UQT2VtePnLzZ-J3cbGTW16IYCoyLCidwYyQ7gOSRuwCatgO6CoNJjs2_vB7Oh2c_GkkVJGSMU17N7b6u1qg5BgKk7dkY45GG5RoMyS2TyEqHImTLgpIomoBEn0qB1AtpcSNR4nRQdQ1VcPvlhi453reg_7Ih8aTxnFdPpPojygB5eP_tJ7bBzLsZ7-0_APjt6MUu_xtcq9R9LGgqnslN48S8Ju1-7oHQyoYiM1q1M2ZxxsAFXXKZmDvs8ef2fa7XrPj1RMHW7vq85utjY7idKQenj1arsL2tM-H00uU1Ube6oahdX3o78E368SFMi8qtM7I-KlroLPmN_82X0y0Np2f1UQtKIofQDxozCiRpnkdpYZkdg5FY0wMqdsXB91Da65TlPE1Hlyx3kb9jIc0_WqrrM8jHKaXaVHvzfWWHPNEwFh8ySSbiLbMNPSJ6QWCmivHOm-6ULQ-X3mCyQIMhDdSDweRzFyHZ3ZdTS7ucweKPOHdATM5YKMpCpPhIuAbbfWQQgDlPG-ZHEqHOns7HeM6kLR7CYKx06ZL0F5OddJETkV1U7laaGoM0BGSFQ6GCBVOa-k_gbw-MrcTGQhtcLozm8pBbJmdshfCk3vgMlJ1mt2DF1Q7TtEFF-KHBWX3Bpq0Hit5guhX0cSpqLqj95pSjB2l7QiDTwSNtdrlLioAGwNFP5A1rD9gZzHURIW_mqzIW6CFhAm_TPCNDXCFA7SbY2eIEN4KKonExzCmQFF_-DIbrGDAGnUoaK6xsHhFEzbupkpTKBn7bIf3HXlDugoE63FsurNb_TceODohTh1-2XwjDIy4JceEhcZKBwIXNGotCYQyLd5vxXZlE1v73TyEc08K5mBJk9F7I4JdH40GEfa_-A-oVUHb3CKz42aw6YRoTFZqoaYpwQVQRnwEn31ta-bqCIAmqqNQmgvu0-j_IdWBQpLPCObuIkYNqk2z34oI1uP8aec3mkUjgWVz3vJsCVgN9Zr-2W6XQCW8QgEYe8MZSFswjf_sN6vSG3d0igauXwYa21cgYn4NG2SS4kE6PKj6gz8HPieHV4Sm7PBjENFPvNu6fPbIOZ1WS4K__x8__x8__7-3rvKsquEfLjn5_venhgfqfPzfTePoF_PrnWr9ZI7l85V7FR4E8qmJvxRY0AC8saWLo_JumpWZ8gFu6JR5cmqES_tb2RLWMbRfUOpvopKaPPLMgrPykfi5Cbf5jWxXbLWXivR67Uz4LZsoWdIxq1uIyKOOnjwjNNvY0tfbdxGUcjOYBSpXRUQG4kMzTttUDDmHr0w031DwWw954YlQEUiiSwlUaWG0zA8IK6REQgWaFDx2ASnQEsIDI4aYmDMZ_pmQG7k8MXzAQpu4ffKmE-cylqqIAW7oBxImv5yCAJZRMs4H2a9BsB-x2gjdid5dvLh5HgiETB98_nkjbT0Ty37A8gqPbLUULzSWJeqnYcdu_4Qbo3dBfa7VvvGtSsrBH6oQMCMhbQb3KnI8gmFvg7uplSNJWJBz0vDnUz0ZZT45bfWJKmQ7shepZ1F_RW1IvLyOruxSQPl89Xk_j_Piz3h7Y3d82LvfG98Xux9CyTst0PH_frKQqtW9ShmRR-HvmOqSDsy0DdTn8IejDNNifQDzCj1Qwean1hpieJcttQoqgJsvzrEHKxzCGhU4wecOwYoyGzn9heAvc5wwP_AKDDoP8P_XtpN-8-R-8Fg-HK6f8Wgn2hPDd1_QjgQYVSGUfSZrHuuRktp9lvE00MX5bi6w-evX0f7z9xWqWjo93hemLpW_4B8DUpZTDdSQ63iTN3KxRmTQVeCSk8_ic3ZgZ2DvEx3uwH8ucj9lOlUMjs26uHWcSWu3kjYQMIBBqYJJWJD1RfLvlgqTbzd8k71RdEXxKF5ioaZivEZpaA_KkUEtaPUrPIkxN48TpJPUCnhqKy3VBY8n_Z6yF1CG2Y4JSzlOQMxiwpNPVOtdnc88wfgtKzOVKcyY0ECKKUZOTWdS-kluijfolURtRMNE5AUmaEAqCSxPDdwQj0VytirBnRP3cl8a3fe3s3vljiUgNoZyJCKtXa7INGxlaWAjeVfgMBKx7hBphbgaeGk3a4WFbQURF0UoMhl1UutzdqvIc1X8jMqOBn-GeM13GG80hysMLQmV35L7U9VxV__taSjr2XdU2Zr2UzUNzn3ZKm2afFzrH2lXapg3xARQErsdfm1F_17qRP4mkp3HMCdO_UNyWVbk214FcxdmB9-Cdod5lyCd75NWRz8wbNspgiBBZ0Bxhns9ZVOdfJYxrPiwvjefKeRnOBIm2uqsXrXx7SaHbmI8oI2fiM3Zauv5g5H6rDeeavzmwiwB3yt2TJvXcG2OCxRxMq-gJX1dbI-76_oEU9Jcfrm2FBqf0St-7sDZwudTGlkpmaKTBVS1HWpP-jHKIdptEM42Wgo7CMY5R1SjdJA94fgEuuUHEAd6X4fFKARdk0hUEDHFlvcUQLvSAadAaqR_Rq7mGCZZcd68pSpn2WVD5CSVRVdnKtcQwHmow6mQQkDJYE2DLcQBb7q1wjWwfXaSSMY9ZoL-eRExj5LQM4xj9nF7GdjR6dZ-nibLQvk9lOuiSMtyTkS9fHPlas6l2HLV2BmXU4mZpWFqf_NrMQl59YWJtOZ-eSpcFjdXlD7Nt3-qFXXU0SKqfMuKeAVmUK6riC8KBHHCmapdyVipVXn7QHEpEcJJbHXPeugpKwe_KWSO_VAqo5JvKoRhw6jww25y7mOTWOvfPIcA0Qc3kIyClbcE4_GJkFnO7WgKCh50vLgmurs7sZtVvIzIeoNcMhV5U0TDGV6Jw-sAxCoDjvuHaUgXbI5irfxyGtQ3le6PYDfrtQP6kQY96_U77FhEyTQ8AYNLUomtJ6g1dAuYftHbNs4Pxo-oaHiZUDLt-pEnEqHWGiwfYEjKFwi9Rf8thRBaDhGA7uAXKl_xhai99j4SBt83lssaJWwajy21P-mpzIz0R19ldzG8RCC8L4URJ7uyFWDduYJJQ0vC5G7ikR8SC5ZmL3_8f8SKs9s_hUBAA",
        br: "W_0VMZlu8xHoDoC70muxpBEpekkCVA_FG-Oh_k4wJT2pbNZFNVQa7SZCbIj6yIfsBs-Hfgy_UsNrwTSDFKKxhbGh-_GNuawR9qy7cO8W_-CwzzYZoQq2Hmco2oHHcH0Gto38SU76fvRLrf_5-UIdD3llCpB275IrHc_tOS57TtSWsGjJbAh4oTW2Atjzb037r9_oznblBUtAsgtnw91ZnA3MLDIJx61qOOFy1FMqtWH0eL6Wfnq6mhPj4QmKdocufeBb0k92l5uwn9-eQBk7XLp-xv_-bauv3-kuJ3WPOcRlw5DjK5eNBrftVcZCDIoiUYItOjx4_rNXtWq5MLWai70A5PYNh3OcPkUTcHJERzg2oz8Ef3efiq6w9vPVaTU_VT-yn1waHGGalM6y5VZT7fWOHwGdAYiS47pDtwb-27cUmW0FCFRB0e643CVgpqlvqe2rlmoH-fYY6SmtbAM_NDUhd64Jy_9vpvWm1Q1DrueujDGZQmUAOCMfKlIUoe69793Be6-qF1XV3Qddbf50N4A_AEHsoAFyD0HzqqpJVTe4Og0QO2qCszoYE2BMAHJkZlYeJGfOiJQxNlWodI2PvhRKQaYg9aFCKcpk02RxArRMtxSO6376Gpo_x11iEBARieY70poMtf_KS7bU-waDoFuIAZfc_lDre9mfMjv1boIxzVQhJIGzW4C6nayJ_vcCimTQaSwcOXPiwD033HLHG17zgXd8z1ueee49v-Ov1ujDN0BxPVb948MIjmWTyUguoIRwemFjRUh8fXfguCtVpfhLpzD8nIUYPyMJeOWNgdXgtUfVEXSygFMNQCLET0r-d_wcoQSEZQD0MCAQfNXYq-m5Ap_hPUBdp2mqek27PHj9osFZKqAmtUVtD3cuYcZRlKgpIL4YJeV5nDPUtG3Zw5OvQeZl7_k03bQzQ34JU55WZU1J7dD2dB5BQZdDXSc5KC8NCFt_jlFP_5ueX3FwcECRlkYNQtdi-Prl-JXSydcO8H_R3B1WWr3X6b5CLtJ07SHiz4cvfvy2ttCJIgth89fROzU7OEicVh9QTyLwt-tvVFXJhkbnlpsVWJ3lksMf9wSh2yMgZdvE37UUw2nCYuBa7PAEsIxQKAVmTMluRnCrM2vd6v3SDi6-Dtmx8boInYrVCjwQDjST5o_CoeZSDsmg7I3YgJ7E_szrG6h7GiYAqHCtoOaIkFNPmOfSXHoRIfFJUfzvgNrCWMqqBkuYXo0ZmYq1R3yDfZlT9MDomuWbiUTE2iaoxYpQkNW3ZVj-HLjhL2CagQKV3divW2hfyqTMdUN4S7RQn6DmDAIZy1DblQUTMdhQLFuQeoxkYBYiOvavrbSaTP_JcO3C7wfXJzH-GLZdXbfyooHX-UP7sTDbr3-6uf-hs737FYO9lesmylVyon81QUb-B6nzby6adf7a_l_8Ps7Hvi9D1zOKYBRK6WaaPy7WWwsZqqr8PsmILSPCiFA0LM2tGaGxKxdiFF8UwO6v1l2Yy_JFiGAKaHg1QMqiqyHLT9s9lF3jy9a0bibi60D0FWNwCvyMN6UhAtveMM3yRTHDqYXrVI_rNnXrU0B0sAIbnbUYUKAaKnnQ5USqwH93_Um5WKYyL1dnCpAKK12ph6FXwzHjkbZckiDsDn8quzL-2rARBd6_4tOoIoJVALql-N4_fj04OEAePXLRRViPUKr9JJuqN3144dAuZCWy_E3Ge_74u6qVEWZnT108ywc1Jbl1ntJQ8eT8dzr9CfefzTTF_K9jS2F_2xEkIN7k9sivwx3jYdKFM1L_Kzm2JF_R3joNWKIc19HKOmYphZ29K5_RioogtcA-KdIGcAriteLDS8033v6WCOYRpBrcIXHOji4r7ucSrwDTmDjNO9oyqFA4ro24KJghJlkEAU59CMShGtcRnvK9I53csju3yY1djRqWE_A-CofKqcjnCqUmqMAL1A-fkoOOdnKrLQ-fBrPYnIV_PyNSIkDsqlaT67YD_0YcsTLKEPK-9VJX1W6phlz1ux6oy3hoLYXV0TCOwSrOjbx7j87Mr4h_xh7Dn5VDsiDjeZLv4x_6vqmigLigVZy6-bFm_kZhciEWgYku-YjbkwWkjE83xSZS83ACXQA8p7FYDZ6FtwVTvhNXH4SPfFSmHe-4MD-PhJ8v5sBSghXnaPjT9VCkkQ-xckUqwcSuEiprix3-9RJM5VpDAF0gmQ9CZTWZtIysAV5WplufW01REc9oWrXlvsiTaudSv1RbwnjePQwK4lh7KpejALc7NdNWyygfv9xpYA7LZvMHthZNCC3H2ohg3UTK_C_aM93ZEYQQfiyto-OqfWlmjvB2BquK4NRYclhAxB4yEssY_h0KcZ8EYEZoiFbzpUr0NDT1l7pyBcWsGdaikXhaP36E87RhKACmxkq4kU44Y80sIohdrJUJafx8ETxN5u01bpes0HWtUMw2V1kpcO3xXaEFSU98M-6A4xQ9jLhI8ZJECQyOUueMFNWOFWth6IPFds4B_ukZDN-CuFRicSlJj_GmCGdoe-tSrayZBUvEXIxGsHfrUn9JMgEjELsAeEMQ7QRQbvx_g8ai5oD5IDUQnxsz6MqNtkkWvmg51-hb6qU95SiS3fUg5gwlu0tk-JQPMxOozX7b5tClI6E_vJGywBf-8XkfJtF_ZG-Et3y8-jvs8SN4yxCSb0zFQ9wqaMfBPRpihITqgm_FPQTK8Gt4N_ExmIXetio5xLfpMlTxu7r9TO2HceLrZ2mOTEZBRdz8RebYRccy-pHJ7S8bqPYluoJP7MA2kxrVhtHyOPeAjGVlXlaOgap8T3z4xqOFb02VOFn0B8iJUiz5mqdTW_KEJVgC2c7JmUMIW7qjaRHq6QDpCONB89UBgzMZ6n62NJp5MKAMAgj5nGidgE5wHiln5oJwpbqjsIWDNe-5K4cMZxdquB8L77nxwEhtDUmvf7xJ9sCUQdSewA5wz2VEeIbxCBqNbNNQGN3SAlJcl5IK_VwvyjNBDt_NrQ4mcieEH4AyHb3qHJLnnm5psRovjQO5gWaBRC7lqRrBRSBmcaaKKt_iFdjTQbifxQF6x827zgtUI3CNGchvkXzrPqCLO5EjlsVpyn9JjhmWuespeKH8oZU_MuLAdKQrmmgCe4eEq9E2NY2S-FvJkaJqtEX5lKfKV17QCFib1L4H7gZ-MjOc5AC8BxN4CJhXOBpJfYYiXNpvBeQqLTUbHTp_I9Aq1ugDqLj2neMQRiCCuHHqk7NmfNic0iokRnVXhjqCYTZMtE3mU4jIkjOPgBeUjLaeTEWwQwrkXbDHHivrbhhi2LEFEdDvA3FnIMBIse1iNnpyCMk1meI1nDo3ncEOSbR70FQwEioVmA3qhiTo6ckI4va6u-AMonQyvCX3InPGGCs0nyIlfIPK69uwikzUEhJ9I8SpOiZ20ksQvKCaW9QhNWLyJd9Y2a8kTzKyBrk3TzEvRFmhFd4floYiGLosKzQ57oc8lTnoBMX_cvlYrbiFRH037PdFoEISIYHhEcudrTKoqkMWfQmu5rMbsNcjCndxjPwRxiEmFQkyBU6vJvOBRE1-xOoMDU-xFCWrKKe2NYTjXeep-Tm6rB51xB3pcfDtO7Ru3XuILZxNafPNokexLpbVzLODgnVArHBHLfgCaeiMXAHFFbdfJtplyuiBbd8CmHvog5u79Am2B7EcnVB4YC87lDPcKZg3gMAbJLR62FusnwA1PsVbg--9lgy7TK7lQb9tiDpwOA87s-R1yLomoHuQzLBCT7oFpEyKe5REsWBbaeeXUtikAWmEUCimkcr4jopFWIfyUavr1n0h81acmjYGKPoaDcAt0AqL8HiH0MVqj2i0Qh2FeugaF1YgMPFjGRIdfTW6HgSIfDotT7GmpbvRn7xPu-NqzRJaaQRVkjWNTq7kqWtYQ4DCj7dG35VjIJm0O8pn1PHts45uYRWa0Qpk5BqMr6H22nv11GbDag9QtLGvm8DSAvtvQ3A9bs9HzJCsJpwlAl0NzJBhxtRtEqluFTU0IkjbS6ffG7Qi_uqfoKQhl9_pVDmTwa7zm34qm9sTfwQ0VQLg9whV44UR-HN783fGzkGm0MBBWe5MFQldeF_bsIF76bO-Ff-iNvOws3GKx21wq43V7rQghQd9esJhmtIjfEl2XZWiBS-HTi6XeVa-S959DmetKqZjO0Hp82jRunbeS3uDHE_zy7qrimtzyyFB6a_7IYLfjJnO82NMtraAlXJiMNmO2f_7YsvIuuY_P2LGd6sUVvd1RXojpdF36iaFwPI313HauW7r993S2I_9d4JrxLXVKmvGEqngtZTN3YrWOSXGJ6t9OR8qaXtrwaKyMcyJNWqQG6L95bUSDoL7YHU0LXdGWo5tqZTMw3DI4jc6FU7NeJHqgTHOmrl-4swHqyqrCvzzsiEX1OwuSW-x5sIRGtgRqgWpCRETYMjR0p3WsRZQzpidsak8GFJFVP3M0fAuIQ-KdIwCLshO4__7NTxSx2Cofk8g4rL6AKlzSvy6AgigZlDsIOpri3vcCiXu6ylA_FkrqeG9nwg2IHWaefNPX3E7MRmOb1h0smMorcUidYBpWYwDgDNzQidREinA7h7N5odBkl2Iy_WqYd-ghOZ7ko6fufXHozMSQ6N6tw2SPJmSmn1DoWbdUEGybqgRWVuhAIGxaKVnheyeLiNX_50VklvDnXvsEyMCgVLW9olwsPwQ1ijkOPKC43C0Np7t29QTRlbQfUygMuveUaun30v8iY-sCIlFVS4g7O5_SJLY6w1dCMx3Pb0HqewK-rRp1tUXddTBA-gL7LvxWdcMvwwhhDNOndhm7iauXq0LWMuz7yVel6ub4aI7uNDyU_66Ihx3pD77mb-ngIu-qEPqcS4AG059ZYW-jKzToBn4tU-_WpfhsHknNkeWDpbpxeWUpOX7KYrV9saSpxjrUjaePE4Bva_IM-Jr0iPoXurb7EMIjMt3FaABbe61CD3LZ3m6b4weDKLZ2WtEKjmU_ZrA9ZA4mBnaGKm6J0gbNlD48NF3v7k5d-8uRqy_slcaChlrUWHDSriy2y2I8MHicfdWwH_ammIx_9gEoN491msKqf7S8E-VD3jWolYsbeGDFpgplLtAXfBLnSVfrP3dr-qFv8YqMXzJm8Uzs3WeOpTiUVkOpaWGNuWetj7XvPLOvV73d7m6-9Wr1VfvTBYqLPfSiDL8q3ipXVv865q1sDX3SuZjZlp_fe0HOP5uziLJauSxjVA7BYFq_rBiKhDTxfcpCliduFN9-jgo_GjAUCpHzHU9J5NbVlUZnNYmCenMVmU94xCeilo9aQaXoTjmjH_cfhCpT5sx1WQyDYdi31VeqGpJnBtMS3WKRGjLo4i3VJwuO8qMnCIv3Z-hfUdZ2TiyrV9-PrxOvwpXbq1Sg0nact00SMu9aQgTbzScoeHcsQY4t_kMhK9PammHxR-6lRUKERP3IEENNuO3zHFoQgWx82NkNyv82gJoDu_-gCMu2CbSQS-Wekf0l1j6dg7Wd9xBJAn0FM_MRSkoIswWB54XwfkW83tY-c_fZrF5jpPFLRTUsck3OXXqWLt0L2_NLdXmbV627on-lrpmofjb37ix0JPbUCzTEi9TcZ8nbrFkrC3YVJaQ8ny3-8q6vfVFC8QVfK69QvYbX-Sld5REZsIFaYtmlsccMAIfusG_D3IetUIndVrVEX7Vwh4Yz2a6UnhS08FIfKQokDfP7nM6cVf2mtXBYSfVUALhzKjDPeGeEmlwxkW6cfGGDZd4HWD8q2CPp32uyrZMBkiIGV3cnBJIvLlkLWH9tW3ZRTqZuEAE1Fstt-v2ADDNhhXTD2uSSV4kpy9t8XMt9IUoCA4EYvjpL_BSfs8u7cZO95QE4yfCNMrIWVgg8mVDUGxfK8ANkC28PvoJiA6KL030gF6qOk-DQah9cH8pFk-VUFgQ1mdtirfuPue0g75YFbKXwTZKKVnbU8vDX39beWhvRolj6ABgtcK_otxckJgf0_pd4xRCyDdwIdyOJRM9J9jv3eP17Br6IktCn7hd7nAlULNC6ucFKYlu50ri1Crn2vFMW8csjOjfRf813JG60BxD_aVkZP8qi6CV6-KPabc9DvPEnGXNMr8iEV1anCHWBHrpd33B0vSXEvPy7-z-YrPJLhOL-vzWrY-bOx2ZnjYXsUFN9MXmQ5IfqcNIWij393EAvABNgA5QOlxPmDYDfY-0_0lDTL98GkIT1qYuj2oXCETGO6wjxanFfbKKHj76HELtyp1rKarlIBx275ToIcy_haPRQJan-gWiVA8JfJ07z_JjqglWLGWPBL48YZPOEnN63Sq8TufgNM2uVv3atzkOEktpaKfazZWRT84i6aFGLy7qeIq1a1d4eVX9d2EzNH09__zXkQMEdUE53hJCxILd_TogMI25Ev6LLo21tdsFNFP7z8M1HFByBver1YvpyLqU9ztiA1M8TuNmCgjpnFMqZxJAtO8_VBi-cB9W3r1LFXUwC_15V88T1H3LgBJGteiOgWpp9WC-SeYRqibpwSnIpSwgjoR7jhfVY_XcIoZDuZ7xCxNWZnIMPbL7JrjE78s2CFNX8aimjQDoynqEaeAWqSP6ERVUg5mMVg3eaz004NJ9yqOvHNnQgPliU2hXugarPtNYewZnqVVbs4pNuOG0wkSxLbSVimyOmvyUj2tuPT2jTctfYqt3Cuoskyej2iIyr2aa1taVLMPf65qBNGo-UZok1YtCJ5F9k4SGGvUNZd66LsKsoVf_cACkvZBebwhqu0cAmmofE14AtK4TTPoN8pp92_IYh_sYFkVnTBIAnFe7q41t8DKE0T6NHWYnLHzvOx5TXdZ_kaWDGHB-WxoN0bWxDZVm3-YxFrPa7eT8HjerP8B_X1B7VD_r82fq4SfAXCP8wAHk285peq8fhzXeoQakSwBytfJrqDWkvVGY0TXdMo6YmdIIQwFwS9uFjTe0sStGTNppL4MqS5fwg1AO2L7fISMjtHc-zKDatKqNhJD3NqfZtsTqGQlAlgeRQFjSOs4ZxgDF7tdxFsJsLnqveumhCJ_YXLzssul7Zpm7zCwvqnTcaiKoUOpAkp378nyhELqlopN7P_28r8duadHQoAuO27RNrWcaA6cEKw1wnsfP6gfCD_kwz5ERz5zSzikz57nnmfOLmjMjwDlLG2J0XERD3AP_wm1StVG4fusjSpjvk-Z1YQwlnT8ppY6cUZuAwZDwkQV_BDq4_QASRlqFsyQEMocKi-L0d_yr75uqkCOT1D8k7ZF897wLfI2RzPucqn_07UXmUp77CIPlqZvq9ZEBH7JBaAmZKuGw2g0EDO27BF39bNoCoLuHFpH4ZW0xklmeb4foHA10zVZTf45fM03w3riMrZTN09bBaa7K0FA8A1QtOxe7po2YaYv3Kg3gimaTkJjkcCDtAoY3IoQGc1HH0xqxGci5LHh9B6B3-FRvTQcUGwnTcpAETe4YCne706x9XIIyy8IbHLX9-WAOm7R8yzb-5K4GPzVVqTFsWiGYym5IXNoTuUBl2LJR1KXt7CIdbxlpRppHUyhxPVFxd4O9E3uk_gxxU2yVYBvGhy8w0grGmFXHxAodI9yG-a1c080YBzBzutod9QdINHARN5_LexRAmj5QHWDYLKkPI6Gs0QnTk9sh9EbUenegYbiqmrg3aOqIb3JG3uKcSBsfsTIIsEyPmxF1GItvnHSMQiuWehL95WhvYeTYZMwYQ-yCLiR5LBjD3CbLXF4sC_grQd2oEzGvg_UZXYuVYmakh84GmNynO80oPBClP6v24JQRneILuEvbhvi3VMXQwci-iZveUi4HV5rgg0_7RoA1dzAOEgzcDNSxsXcxGxwNYFfzQuMEhfLH9RZ7osBUag3ajJauHcvZUa57_hAiPgCEaKtZcEAWb1xGZ3jFFjmtqDWIZiwgtJlALlnDaHyBLTu3eaguXreARLwUJF6lSao8GZx-rGmWxX1besNYKCV6NW_5By7jnwWclZ235du8R0Fzmh9BCqjFIaTjrFVeNr-snrlyl0sM7Yxlkt0m2FowlsWG5FbtQchLy-pL4uFzb-ttbbNrjhdrzLkk-_240BgxK9wPokILkVkaPFUngoi2MwkgkfIQBM0NZvsFOQSLL8h82U_2vJ6cpkfwFrlKtTZ7grpthoSX2UdgA9QDK47Zm1Zi-umbwsaE9wms3J5zuDJY-XTXbDJcdj3071bsk9RjYq-FI4XY18QwQk0p8GVCUwvmFBphU8JRzGT7URguJTR6h9Wp6m9i056F3Z5AGMq-pkDY2av5qM4flEMl2yP20RrjAhb16HGWzpDOCFilY02HmZ9kJH5VW1WeF8zEjCgsTcZknRiJifXUUa_4nAqSZncR4tG_M7PWL75Wiki-fsjXmWsjLDYyyS-LncKcWCny5BycYPlaUCLCxTG-MxZf2CO-r-R4o2aB3kD4IodCTk9QUWGrqxPDfr2PQrLeY8rDACt1521DVL0OOYqDOzHmU9v-JUe8DP1QoZdTBb0VEOYoveDP83Z4EcezRxPDMtkdkRgxQs18tVzVDujdVpwyAjo3BQYNDOvhs5WNrfGnR7qBwK2JQiXd8si5wdQ5YyzOYNeG2bbDuRk1XZvR17_cxjQ20Z8_Rt8LGNnw9PwC5jOtDzFzJBEew-jYCZCkwOuL7Ft5N-I4yil6wGp5m6BKslGqggPfzw6PljFAmhsd9qjkhhykQ9Jd4sMOEa74Dmp2XIPIlAjXofRjr4jNdG1JO4IdWkeYXbi7VzlG66Cx0UTa27nf8BIfAoltvD8fCyWHhty-KexJZoS642NAn9TBXCHYpRvS_plyR4XiiaP7mI5Kz8PKMNiXhdKfJldMIfQuLncm1uaCUeOKHUrOe3XLbqnjRsnI_SzdqLJa2lnfV0RLreRKwu8-iFBr8Br5qXpHmjUpZY9boctlINFpsWq83CKlpOwaffgI9frpVjHqyle--CSl9O9Wk8hK-3T4SKOmQzjab9pfWdU0uQuZ1sNa74OH_XTUR08Y8lE5Bis4801EjvyrEIwnHkbef_DADlh1yqPJsFpWOqLQpDqCuV3gQEUpndZBSiwcRN3_ufBh_7SkyVHqUYP18rDu9sPD7U54isdFpK5NtP40y4oAkd9PHMMx3Fo_QGlqmOhlOOgxC5W-8psiI4UDwdpyPEGG59kYbs7ini7XESVmxT3sDYC6gEH0OTkS9mdjV3Y2G-biPs5wBCrdnLSq5Ph8C_LhmDKCF2FCYkYdGnO48HjZqQ0zShQcG93AXjYYAaojXMNp2z7AP-5HD68hO60KTbvzcDlKWkR0DKQFbvcIBK-L8H1seBCscK-1vklkFJlajWzQgC-HjMneqpYsmaBhF2L6SSY1aGP6kHXg3OJiCHd_OQBMl7AShJw5S-5Rri7BmZ6EZiSeUBkbJszTB2pxOxe3R4mAHiHmt2cX_8LHYjUWwWsMDsB3B2K39RsoVVF5dvoR5Ot3fOmBj4XpsLS48Jqk1U7Pg6Yq2E9Yn4lJPytwoTc52M9FgUa2fYyhxE-ttpLDhY7aOSbnnWv_tP1z0zs9nMYmLa8b0200Y51ODxBsWOidE46-a0jcjkwccfk6d1fHjtmUDRH82FucIO8O7_e6v64swV5WrFNJcfEUxR3B003y7hpFf8huRj7rsmUbsjifePe1qqTfbmUz6FouO81ieiAs21hFsd_iOZ3GzQwyEJ716hF9hBCBEqxP0-7G6Hv4DzvAOSntQoWZLr1gYbR0nYp-Aimeb6mkiO0jJpm5SveUHWlHTtqZqU4pJ2VhUqq5S0mJtACijs8OhQcj6i1vMDvE3li_Tgw1SbjPJ-JnwAid82C6T2LbzlSvZVy2ErVqldYhI_QScv6cZYc_MRAykOtVPkFVHlDBSwEeUgBkdZz5iMUOys-Ep-Ur1sMhNH7V4SPmZqzA63z3EcK4RRZZ7NybpOwgPkhx7SFK7VAXBytIz0F9YORDj0de_GXll76431T_H-chmzrsLS_l_I3qO8BQ4ASS_lx16n_e58xXW6jIxztad6vVlh8nieJ5OL6E-X0338-Pm-kXY_0kD1q_x463tofkae7knYssHKK8_dG8JW63eUM_FSb_WIXVfsyn_y2vLj6OXu-TXF_eb3fj_83fU7fEUd-GarR_6_H4bZH_ObsKbZG3kAI38OTY8FLo5Kxsbt1-xZ90-iajxZjw88DhcGMx1y6iF2tp57YZS5bH0Mmy-BhNb-UDhGVXm5tQJa--kZyMKHParFoEzAYkOhoZdI_SSl6x9H3506hu000cx2AHABLPzMmgNvtNZCEwtSiu_6LpykAFgBvV5G6_yhorzXmzJgovn1XUeAzoCAeYxZajyAsEKDU_K0JmqJUr5iva4MxRdh8yirsFnTqRlINZSBtcIVNBBk2oBSIn6FLbYd48TI-DWmYet4DWmTW5GmUibxW5U0btCuEHhcMGmGqfDfvna50h1TyoKNO-IXrNV1mFR4oOkf90neQeCGA4jXw487vz46ge2m8uL7ZnAFd5Yl-hVRButaZ_Gfzn9f7CGof6hRMJkhm1aeVbrI9LFcF5GJThk2dYxsRSeA70IxMtMJOCXRvQiSqHz1id9GjkZJ_BFklK6-DJBxJS2G8WTPgX1eltYinBxQ86RAQSXLhny8HQCoie-uGsaJj_Gvr32KZr0oLbPgI6v_6fkEObC_O83DUuncoVx1De3B6DWZbjqQ9xTX_SBU5E3ALtsAt7ErEuRmlAJcqOl6vUkTL5LUHyl6OEIIR-562U-5NxIlvLfp9YZV1xPzZFZGB-pGoR8cT3Ub-N6lSYneN5F5Gj3wQYvzk7tBYNnt0wJKIf839FMfF77ut43879oW1rtf4xoaSVOc1SamvbZtNidahfU5q_SQf_XmzxAl3z6771Njm_v_sLOZrz6JBIzeE_SIP5tg_h9CR1MEhfNqHpQoKSb8WQ35nHizRytHjwZ13d0imWZNnApWGF54fALhEPau0v-Pf6qPehWLu8-ewuzvp46tC_D7t6fT_yAQDcpGRcLjiHhgvl_pgdZVIAB1x18yJyYoU30NxbhwjYa-RYkY-h_VNFvsm9kVSuvHkXd2648pO999VwHo8E17Fjf12HwJ7TomP9nN0UgEje91ty6yKLhlR9E-HJxnaa2NUYoo17b2zdO14enb-um1BIvuNqOaRJ_u44LXuV8K68HuZAfxVbZUqL16e5zzpoFzvguM-6bVaytgMmHidnaBnGe4396xXM4wT3I9Mu9VEtot8_L33JDZpCo9pSf3lPc-EwOujYiWTj_daA04lL1zuQuJGBozqSIxDKmGDeliQITfW08k5RUS5_gDBjOS196S3pifTW1J9cTJ9HhnA3p574ZPjuy9Ixk0qgtDJlEN8OBs6tUGYkZUkAvmj3rMdgaVJLlBNJUvHIOtY1OtXqJv1eNp7ddS_dIuNpXzfpYsxYKJW-n2kS5LHm5bY4C2jup4qUdmIY6nC-qYSIbDQsRP2pqSvtaCfn9Hq3-DhTCh1ghxAuOtGuORUh682HE6SDFc0GZX8r9v4YNoCElsTgG-fuCDmDjs2DvUzyRLObF5JLuDtE8mX9VJA8_bua5X3L-VQmm-b4yPk0EU5zpx5KbunvkvG0LYTXdLSwFxe6NI8-SySGl_VIJwqrSm2dvc984Lrwsh7raKzGpqCUDWU9fiMl-m5sPQ_sEFwtnC1F-pASOzhauEslumBaCvVDT-HzshFh8O5AA41WfTjYptYcVoLjf-hUVya6_ZBDnBc2ippWtL17dSztnLafRYDh_w1uk-wf46VmTyGPq7CeSClwFmS7HsYg36dwJ6k-7O2I9OAPPV2a79JZMf9Yd3ncye7EW_KOvM2_1-jeRWhkr_FW0q6pLejJV9m-4cEbHKmjV6iHTVLf5iJpsWAhd6msEHnbZALYl0xCwNpOu6RRS-Cvu1PgsJ1yy9cXSB72tZpLY8js2_8eNt1MHlFvjxC6nKBik_mhDI8_Sp7jKRyKjme1rN8pwVIeP90ZQ3Wf-ADhXOkcxutmf-ksCgCkDwabLszuiTLM_bSSX-WgAKtmdqFV8BuZs3AQzneIGWnkOxo8f1ybyT3M1Ftr_cwgIXoCe_Q6AAP5sTfrTgfc1xd-H3CL2_S1VfQpgDyk7ZBh_ULnlyc4adOakAPvA_3FfX4rGzOD1mzbKP1SBARmJsOCThU0dPJW6_DjqAIEYtsGxL6hs7mxGSFHwIvjra6GuEvvyr4DdWxaxN0FAZ-vcNyt3XXbcqYQY0BUt-hQqwVKgNCBCdIGxEXEc7fWZk5p6w8HanLv_17njbfyd2cf9cqe-tX3n3mXsgOdPYy__6tU_TT7F2wZ0zTfwqiOPvxZZoRDWoe44oxehlCzDQ54aGy0zXcbfZ9qaWwRrtjJS2xBGE1_EMusNKDTOZ031GtFParZcqhWYngn-gjkFPxhgFejFTQSXYWtWZbRW5JP2cE2Jg4F8LGn9jc0JhD9Tl8OJEslKiBn_xThW4pGxsAmJ12sEsVlbdBcJxpRfbP0OUvK_dczVK22NA6J67DhAqPOPsuTPS_QQ5UoYuYOpO3om066scEQYqQTCxPBYqEfrWtQ-nRwy1AuvS2br8nv8Tf_Ve0LsetPsB7mVvz-cc7-Ij_2gWv5XJO9MZvQwAdHgLzWphuWyx2MQmw9vUhJ6Bwhjp6iE72DUNXarscpjxZorMXDtlmi4AD6iNSqOZ4Ca4A-8eDTyfURCpEYzutdx0isg0C5ESkJuAKy-NqQ_v_vYz_LLxfFB6JL6Jtc0RaEvzTMroebukCQyvc8pdeM_ZTR_rElbRe0vV7p_GP09fdb8R_wrD6w79q8tPnv67_Q_x2APRFOXc9L3yfI_UVnhtvR9LfWvx1szVt3mS6I2MCMQK__7WhR5yg5nG8hsJj4LEF2F0MM-h55wYAkb0lPfmHMbWlBb9MRWecIKxXtINlYFETwg5Gy7VmnlSCvQTqSeCYwAXVnooUfhDzX0tsBkFWNRNhXqc6DpCQyvqwDTPoLjYgH80r_wtQtQYuXVGVS_xm7KFoVBFFF3SMxatZjMajgaX6FDt53oJS9qyIGkHrMVkZnxCu2vYmT-xV--WW4km-wstTNm8plVE6N5U2tjzE9aJNIP97YMoh94-YC0U8URrlIcOgOQOcW3t0z-Hfhx20ePlSRKp_qkM8m5_X02qxxQX3-PFerTLKZSTYX4oVj-DQBuap_yuVqitznHdfVq064-4V4T9e6tqi4cKq05i4Du17cwIjnidKvbLVyoCPxwCtd-tW61c8zDK4waoqpdetBAX49ILQuNKwk-hDEREwMr92T8CWRr5rkyYbAFme-QUgz05A4aNSPWAps2M1ZjszEYbvCUi7qNyzIlSyp_OF3TsT-VEXFTF_gE1EjYdPcEIDIClBsvKj1cvTfvwMwVtQrcjKJgeILw79S3nQ1blKdK_7u_ExfnuE5s2J9AMAst-eiVM4f5_6__BvkGiqBejcA-K_7XL_u-3SrY84LVctK8zczvwfD4xIEV6MZIee5AGBcKYb0kLdEyPDVW6GGWwHMRVftIR4HX1fib2L96EMBAzxf3y23TAj72CfjEkXdEsmRMqUG0mITKnGUevTmUCzXspi-nYbIV5dRG4WtLkOKAairJTsNAFuy3YprjurJLW_gGOsIPNhWA1kjGorD7WW5T_EFtnin_M6AD2qFPy4nRt8JRJeh_tPZE6onS63r0JlqGJ1gRDqll8qkGATPM2Y8K8v9-4tMyT0ffg8faL8L1ud8YVm_8VTgq2Ov4OYZD8RNEe6wd79rvuhyNQidMcoR7ZWUwR8RFSAA0wMbv0Rwtq3encuArCoXuLTxB_XT_fPm7_ywpT0HXOwtDNet-9DiE4BvMiLex_gEVNQdN_UmlKmqXrdHqcn_SX72MaB2ltwYYk0s92nDh7RJj4_anKxwO_mc3N9RcUnlk0QPoHtA6vg0IrlA0jt95MlRpQoXuqyFZSPIMARPYrwieZQe3UGQKFuOOPjDL9LeiJGoSZ2C6W72X9ej-FvGwSb-ilkxxMoviWNJkUH4KOMga-YFiRqHSQTCrSIqpP2BPKG79UgxEivm6CUTrzuuqm68Hza9DouOK-nCyXI5LZKePJwWYzwrl5Gsij0RxViLJrhG2ys16emR--_jvFX21TnvVLrll7Z-J7tMaysrgWwOFGNzb6nJuSjprxoylq3iAGOLUC_2GRIdeQv125Sq-EGurE8V0_-uxPpwbOlNODXD4ItXy_l7JkkkoSExnsjq7otvEhmwV0g3CWJystIVwof6SZ_gKKFQAsLY5R-23CMfGP-hbTu4Ez16mxs6Qj2lTmJN0btdz1in9NCFLg0SY7sN9cujfY-bg4envVmm7hFgpRf_mghAZsLT6zokDOHtuWHun4E--q1swRg1B65V-Om5tt0QGEpXibfN56-D9iWiMHTTO8QVqKLSbkjjtCRbQgQU1-JBo8r_ygxPiTeAaS4GeciwRxFs5-p6-6FgzqjjE_RnV69gA-aKt4-W6eleOyJ6S8Vw2powmqg72HJ5SXr1_at7TQge-QARCHMoPAc-U85QkE04EKKubAC6URD4r164b22Qd-InFbpissBfdbV4ddae5PSZvjWF4he4ZN_tsANLgM-9dK3ogX5UaNdbqMgaPHcUVQbq-UFWUwbDHVHXPLjvKfp4cG3wgjmFBSgCFTcp68YX7i76C9F3vG_FPZq8EUsIrkJ0BaMHKeinyER67CZetI7temRkCTPBM4d20GLd6MeO9pLyt5H8WRlXrLBWKWETJJ7-PDJRWay2dTmcjq_-QCB0UT6E3X7Yn9E369_4xxDzb5-07L3eALtRBmcsFrmLd48HXE_D5XY6LhSEbP2_4jvPJ01v-UuNLewT7-dufzQ-g4Ap03QJ43BsjN78LbdL7zu4JH2WcMhtteuA-KodK2PpP4R0_cn2zu7e_sFh80-rfXR8cnp2fnF5dX1ze9c57it_OD7W_3vXvG-7p__3Qzj99fxy_vB0uBSoeeSo8-9mEPqUCbl96HlTAJ-092GGhhQSBYKs5Bgm56J4XA9yWvpr1GORl3j7M7vCmE-94epxdM_fGm96wHBxTjTF48bCuHPFNuuDbdwnUe9Y9enV67Fem3Y_8lCcNc81IZNL6CxwGuPep_4QRNJCS5nxPWe8b8ZMTz4icgGXPvkR_tN_-l8Ft0Ca66ahBVLsmqNXjqpkqVF3PMfbn-JDz7tGZLxt8-zKTlD1V7Cxsdx3NaI13L4G0JuCf9GuuJjHTbvLAf18yzWaVv9Nwvf-r8M6WokQDYQcuzYyM6SOn_a2juYzPhz-Vi_0j2EAFH7sWq5ykcCAyPFTxFhH89m_9EDijfP5uBRD4HmApAfKXw7jlbn5RP6fa0Sf2SW5h6kt63EbnGUYvXNqOl9q5OmNCN_5v6jIxyXarNDdmxswkLXIfzM7QqyOSgbaR8XrVZ-3B2iq6I2WtH4lX3zEnZQifMehjXaG7ml2hRTPgRbRRnxg5SU1pnQQgwbqp7qvRGSQXEI1Z5-ww7HtpZHPOWzsXMCO3p3p86E0fMz00AUHBut0gPYbXBpNYwkxpRZyAtF4ezUsUKUYlIKU-N1UI4flK5ZpYjSqHHRTJLFB-QoHSGjhf8bd7LQp_gkyj8h5osy09d5h9-SqEcLsOn4hrfvtZKNl65ST7hFjZ_ouDt7L6T19ON7deNyo773qkPEADfGVK41szs93KCtSGWXYRISL9uu-hTD6ViuWNjTMfFYlSw4lbABbmZVIaPerpYOK5pwUBZk2qROqVeOL-Rf8e5T5HKyS7uatliO-DNVCksXR1nQyysytt6Ds7-vmf3-A72K0nN26P9p3pMAKlKcnvEJVXuxihDVTkhKLpdfxPQY0kbAIQJOf3b_s0nSC1SwrOVliukkAAoziZRIx7-EQBVmQkRP5HJm2kK36Jc6kEQTG3ojIvVQ7weB_pZCVQmcjzT3S4OASZvzodAQTMsjIMA1Ty2RQ7dC5hycoWaVQe_apEtclketx05hlu1298bg6saDleQdH-V6idckOoaAk-Ajbbd5okqfR9Ai9i4lP5kQEk-TMsOHILOAsaQTVsUxXmtmaP9fzdEg13ec7IW2yBTwZkBPms1nmwbq7MGhp7iwIG7LRxDluBEHGCcmUaYRACCV1Pz9OAMjQVvBwhUyLSjijdnB5WuMeZPC9vfU6EQMRN7Hx5LSwLXClZqE8j4StPKxRfPeF1LJak6Iej_F49oN3clsNg08RMVnMv6DUbMse84iZEyo6A75hlYs4RWl2IvJ2yPCDOWoLPok0dhjulGUPBPIRIuyWbIYcC6sxihXZJ6CdwzfdzLWq57_DsO1BG63NDrbJZbkJ5UTakvHdaM4i93wSpmSNKBl2m_APBiJ8i8VSzKq-gi7afn3Vapfsyvr4_NSMrz_rf8hgshGrOsI6NGRSJsSRZS6mWcjQqBW8SZ-NgtdO7veYTht7_-_h_ZOv9AQW6p5WFEURLs22YEXP-Z-fo4WLO4mXQp4XN6c_E1luxwt0tA-CC4Z_dBlvO8wqnMxf6bv9IfwdfV0wp-7343P_snE7p_FS0DScFKaaQuxWxzTe6tiqVx79tjJNwUlj7py2LBAfFgK5K40rZRKDTbSEacph2_Q7LSawGINQlDDUvO09JJgT_DdKvGoI4kxb1tHbrz7G57f0DLBvogoG2DmW4obrkojYmEUioS83vC5bbLMBn5y7DF3wXs1QZ8zNYw-59slH4Q9iNptfkOAxlcy_NyTTBqu0jlguKFaIdfF98irESKV3yy7JYbB-29aOZ72taKeWxx1Flc7tnyzBJAkvPuSNaPHWzotM0ud9Ws3a7pwLUME9FzA5eC3XFBdqZzoARjit7jfY63g9Aar_0F76UHsYsN0S9I-S2_cRdn5vGpONx6mveqodQfIiswTWnWzevVPT_SBlA3bdbqitMV2FIGynIY8c_HewOdaJjucwlSIDLbPR0tulqKFmtxzLWaIudvtWUuq1rUkaiOOfUH4TYXJ_RcbRQAqCe8DWH9KzzvG3VxNrbSRrP1ZFk91y0tyrJqRehAWAl0TxjM0l5scDK7ElJb6-aFqr0DaWJl1fMvuiV3H6vNmXgr9YUlw-HxwWumRtUDxtKmp24GNwwzEjdcxnXJ2PJi8ZOdOiBb4NuPqkmRFQry3vsaMpw3PrlJ17THWzKhdNPNoyX6bs3DLVzUKl4G0OnRpmWSXD8iF-kd9D4iK_B_PC5s8a58Ksmg4HCF-mujlkapiFXxKBs5Uvs-xcnOXn4lzhxS3pVbMcK9o695iycxVffj-wmfajP3MKX2ZhVp2ls6pIalhHlJcNTa0H0ywpTAiuwXm7-VgdjxUJc6QPKEmCqQjBUFjhAE7DbmSFwByUXEyctlY4_Lxtx7ot-zNdBwOyXZWaIq-ZNGS9S3V7VBQYV5mK8bh1v5pITCJzHs1SST8eoKQ6EK76d520MpvZtba_bPsOJPaIbBCyMwWxg27E6BdrvlRkaRdSiEBmwYdm0cxZ47l5INtYFbVKjewecpFbsdB3EmYRU_KuSFvjiCkJJk2SK8f0E9c58cpoHThpjohaMuFAHhTDxi_8y6gwTNTHCHce2QF8J6psAhoiaoi-GTNiq21PeJUlE5pRoIJaobH4959O0Dt9sjYvWhL1pP5N-tL4kwurzI-7WDw0yB4YmvmmaR1sglZ2JPYKrBGYS1zSEdwmCFCcL-mN1iGzsMrdW0rmGVhx8OChIaE9R1k5b7zdNILASQvg9HqvzU4CJlCyFvZ9yfi1iPFxUfc59FXEhEeWC4iD7vzp1-2wg2wWIhliVYMunVD2ARrzQgNmFhUavvs9YS_ambPrHKNvz8JeB0RT4y3pJfa9Na2AGiRg4WUUsbX_AIEflE0tOwzk6ECwGWLI8ArB0DXn_CFFX9t4XOApkntg0KIJ4VRRmELqciklggdhXSux7BnTHBSaU5EkzYD_0HoZmYT3wFe-q09zobKmQN70OCmTsCzSAhXwSxgFa4brJnl35-DvLr7pQul0r8H0czIHZpu0C76gsXGMVLVN2gu4thY1DemcOsdhVj_n2fZY5vAtKGfIdPGdDoulmh8C2Jt-LMyuy2JJSgukq4KuKJvLWYI76b8NmkC0cEkQMmR9_t82Bm7PFSplEsxaEhe85VD58qS3hMqjI8bgrdSvp3n9Ntn-pmp6dgfGa4LKMLSx-cMXo7aRDAXNt2zE3lrGvU2e_8RyCvlDm3spDkb-EZmm-wwCP6D6L-85HBIVpYYyxufIvm1EnhP8yn7Ku5EPoT6cJbTCX5k-Io67Evv6v2uT-AfKINGrMeIz2jNjOm0quSxJl4Od_S0xn9dz5yBu7GXABPl2JjiH26JD4GiZVGLV-ol2A3rWkuLCZdGYaTAPA8ABykn0XJtAUqyy3Q08aXPWj7Is8QPSgxcQpHinXVTwh9tO8Hu5Zd-Q_0jDrwT8G0cObir2ElwucsBLZ-L2PgElEKNCJRVMiM_ZD2as8YK-vdxnm3aeNVFlC-1g8eKX_PJzwCEQeJ80JNAU1CSEBmF4pHpyQcQmpJqvSK_pAybGLO8NdQAvSayWkGKf9KG_3ydekJ1dDakDiPDPKQSuTEe09dN1SOKAqlrTI3wyGrHNZOiQ3Dl40FDQk1RxV7TfjNRnvKxTylEg_quJ8J5KZcoOXhZKQY3y4JUiNgEUaR3ZJCGo1mUwZiMTBRl0h5gUU5y5gWl5_tkaSWqDqHYM1JX7d-RnwHtAWPBNDdsGC0JEt_ejKIaJOZI9ok-Jpl7QbqC7TuSP6mu9IgEnxDsQJ8mKi-GXGVDD8Qzfi-5spMBJBetVW-g4fDTp2aJ7Q7l5HyBVF9myI1nEZ7RGFNsmBccQLmCKjEgiKIsnI58R59Vokk2qGIYD6P7vnZHC6OMheTco41MSK6jasZsXxIC5JdOXKMTCtbpb4cS3tcUMGPc9Wr2O_Z2P2ECNGG9pKHVulVyCDapqhLVd7qIYfCpMuoZRe_wNnEd9kzFLLX-V2O-rj4IYI72qVnbcAvWOUVrcmwU5T37yrbVMwjgDqNz5AZaOXmH02u7oThondASX3YZFs-PG-AVtWwfaqLztleU_jIUAHGOYAM22txPyktg3uEwtI_EFNC0kHCRYOITuJuD4qttuzKR9qeePq9PuDLD8pwcCtT5PGMRDTpif5kVjnKM4GFlg6hx7wTY83bGY4g7RmyQzoIUWRUUSta31tipDFYw5923w_VhyH1oILWfoVf_jZqiZVb7a_j0Kc_5PPenPFmZnNwk-N4RT4mEHKS7TH-DwqLXkf3VlC9R0V8veY6S5ZeC4KK_UIEJS6hla3uBeRhxTKYl4Ypl3BMDbGicYwcGhNdLVZ_lzAL1MY2b6pFwzLQmHJLCaO7B47F8hoMYD_CpBW-OIwL-moqRWNUhyuu26c_-md-qpRNklMa5OqtqVMkRR3xycI-eoIhB2z-v9ldhBbZLc38568cvSlG1BTR2PPin382cViFZDcNcw2nP6wUCTmvTF0DsBoL-s2WGqCaOp8K7GRktZbZcsEB92Kn0jmqxx0bc8PkSdXhGhDhlXI8qPoWpbJhQxHNckV1z8sb9g5D48UrLtaBHDrjThJBiv_i3fZsgBAF_gd7zUt5bY8PsmUzv5yomjOfzG6cjtcS0OVO9ayqF6EOTSvuJXPg5D80bz7cu_Vb0cDX829nHHceta7EDDOXXm__Poecu8dcaeTgsqlT0rjlXXMEZtLMnstE6acG67htSizGGDKVWeNWVX-EdKgiFKjVW6MXsE1T3UxZ9ifxrIGl63wqTK-e6WNKNtiT8aDI1uvi7to86x7hcX-DVr7IX2ETnhS5-gsO6TybllrMP77KW0EqGP9E102h2tZGSZWL66autG_FnLeNS-DWWgd74Xp3W4Mvrg77V9zVGHj0hP-begHBRtw9Gql88uf2qOipNk0KeRLnCGvqGJHjooSKDH4NSeri_xlQpexhQOxDc4xEbHiLV0sPVPVumTEU43Wp471N4tPoKbyzF2PRjDC93uV75Y6Z_538C-qqsaYZEIBF2w6zNG_wv_DAVTOT2_xa42nSwhLGwI5QnBqRJQ093jrVgphMvdTCYNBZ0hz8GI0xGOTCuOd9_wNKxUOvlk-sp1hc9IBhEN6Fzr07vifLbCZdPYpRQVGG-TZlf9FLXxunKdehJp-99jRU74m-a6rfl3-G37t_AWNUvZlqQ_oNYftAVYC231QLbjVf-WeuC7fn4NHl2wZQUFFBr1Lnw696dtLf2cjdk_pl_oyR_Fv_mmKPvw4MsgWEOd-kQXACGcEosn-yyh7-lX-IUbOFKYNZyfdQ79zXR33nenj7Ydq9-y8_v1JeFKF_Lzdq1XElAa3JcxgZmU4bI38ZNu0Xh5IJTGGvHzLgj6fbZFNso_kW8zkgB2UphytvbK7TlDwMW2x9enT0Vc4fKy-Hr2WU_LJUdr7rP-wqSIhdncvJPWagC2IXSYiVcyPU6kyCjPq62ioiZpkriUExv0k_q2mvxeHwL5C4AaQEzhIST9SyzrGrl_RiNerbhmDkb2Ojs-fdAd6kEX_B2TR9M5EjmCnzNgDunKjq88e4blN8Grl1CwHJ-Nw8xbgAPr_RhQLZ3mn9121znXYmvCMcKVyI8ODzleCM2j6RHItsRmCKoYp72SWWEA1LGog2N5djhSMvpWYs7DEOPwqAn3pm106kZmIu1GUqscMpf1AwVXBNlUDCFZ2HCkyTQtEdrC4ahWmplEYk_R3znuOtX54njHIdNySagKe6BXV0kgx07RcP7s0eB4BB6ZUC04NmzNaQMTGhB7MyCCYc8ptJaE_fSBrO2O-BLhr00DgHgRmAETwXS_TJGxUJM-wW3bhce_ivv0f3j2kRm6WORCTosILxxo7IZuBrHUg6aUBNBjSKJ4BkUCdwdi32DGkrt1wUeXPRiXSxaLe0sYDUwz_VZNaOe5JDIjU0b9saEId9VHaHWSZbIRqcgZaw-NFNgTja1EuA3anTmi6JLD2MYkNhfbYeeKeRZ5ImWSDxY5_s9AgSwUV-jevgHwTPmBbVeFSxbhl5T8AkdHdXySz-6n1vwUMCipwkuFm9AbWnb0cyCjkSSgYASnOx7rkzj30OfXzjCqHVIoF8wbH-Wgs1uraaUFGgPx_5GI4CZfJLA20S-ykrKovkeYfMWXE34xkzUbHCBm12h-fY06gLCXfkz5Kpxb46dX4MhqTtJminabCUEpd1YUhsIykOD6UbpsY4x68-zsTX_s-NGcF41lG5PaB8HiXfkVfe2H_a0E6aD6ybdBN-YlbimRz3Hd4YdhXIuQXSWpf-5JSdk5De8oV4D4Hl0CAiEpPJVGcYPWRqc1fIcgluKMDu0McmsJo6hI6sAyYA0EKqWm1bbvUCs3PZDTvmqFnsHtcRMa52vL_4tfQOhmzV0Dfl0ICh5cV6Xobi1DY2_LSI4iMH3A2n7IW-ZWEO8I9dmkSpF1jUwpgxIQBiYnX_K32ia4zyWFJYSdgUcFj0XasoXf6gEOVnc_SVogatzbDTsjITB61brkN3V2OY36mYx9ZpG5GGGvHM2c4Jilg-NhdWHd1wOGK6OK-GiUyKjp-famkwgKaKEWh36V7k3Q4wgxc8JQcLdgJfDZRa6uu9AFYLXjKPeEG6dw9Ng0uGzZAXnxPWZE_tN_1D1BS5JontzLHIfV6Gt1Y0BNPReFfLgtKEJHXF5KSbKzSZcV7VfpMSvGiti6pLZMn7ngU0e-8m2oy2aQtESUwKW6zG37sh-Mwi8vD7IkgY11etYAVBpKqnN5mL31rDhX1KtOkuYgvSz7yxaAVpln2UaPTfAaFi9Xf7_-gYk9E5SE-iZqCAC-WI7qMq7W7Q5pu9FLbUNIve22blSsebq-u5oiZKASObe-sn0LU7krTDxxlAp7l07J2yiho2rChTYnExb3RUXNZXVucPKvFVMX4j_njP6BAjFBAYEJ6oQ6WoMZIrM0XI8zmkl8DaAHV7_O3UPv4S9fLQ-qM9zmkQghdZGRKqLORBsJvFbuE1EmaI26mSSx5Ja0uJadoe8A05f1zmnFMFdMdY8SKU4lDFXh7MVwbmBgcWqLxUyCqVhR81IYN5loAIHx3HX7cViT2dlBGlFKxIbR_C6uSRC9CapN0OuACe1WefxabRl5CKnHU2U7ZJwMqUqCqFMOwH-ClK5HfGpDC7RF6OeS8WkgIlyf7qoTGKa-CzBxt12YaMFZTbccIE0BVh0PhOTS3kNK5CXKJCXEkAZSMsah9BJF7pSqKmKEZRWHuhpiG9MEhK9nIwAu10UQ6uR6BpKLdcm7w3AlI3CYlgJUvxNbctSyFAEDx1sgpRXJGGfjG_-IcSgXH0nq3oHEyrEF25HP0PtjSAZqiPOTxhSPAaB1l87cGz-0rzWbNEIPfbbebx3M1NzmgGBiuJpPGAHMuCjO1wFMDv7V8Dq8_7GdsVs9ZCE0dytGGN1PkNsoQSN-0FP_1IJ9gL5DIi95BihC4h_Zh3UwaGlidC7OMHigulrgBzP2_p4anMjX437Pd7JmUeP7wJ6Wa7Cu16UsMAEoHL595uhVhxVCV3YcQ0fbzEdRGBqzr8-OjRqgCUyni9Jj4GdULagPRtK2WhgKELw2Lkha0mL1AO5xU3krTVMCfD5Oje0fuRsiQ7rE09dLt-ov2fDuG5n9vGmQjeYw0xxOobuZAXTemkODV94sSjnmk0Rmc96R4Go5eOidEEe2EkbAC6M-Sf4BQOI2UCvRLK_ANDSTilsRfgFHx_zaX2RicTvZ2CREmdLzoE1FHBlumQMAJ-tv6NuY4Bwo4Ap7zKc0_gAFirgWa9jWEtIpcMfcqAUuJ3LBU4INGEKcmzKuFzn8ngonmBZehU6Wl3MxisNqWDNkn5kBt2dnaDISYTZwf2dO79gI9uzv6aSEBD1NpostN3JOwKmfY1m6MaQLuypyUxZRmvIQOwSEMuxK1gL88qYOLYocJ0ng3CZ8TtHT90ynPhF5CkoRJkGfe01ZEYL8OKep0D2qco-KGB10ynf2ivyIMxuoxCbGIkhaBxneknatwSaT_2SDtoTnIQyskB7IrNMzby9uxSSYCldXF_GceRhAYyfLyWs15B10LqfKZCUH8wq_UqXu7V5gzz4SaHpKNNrFEQALyQg1jSnwwWdvtWaZo2yQQEbtZTWx_2zZHxZx7ybn0JPT7819Vq6M49WqnMgh17JEXK4dVFuKZ8rb_m37JuuOnhHh8PpjMJfmrO01mDI3x2PQHKggKynr5dZXIhucHO9IfvfCJ9ui476HHPxlBJCn1TUQnOID8hlGscK9YNqK26amcy_7ALBv91qIpCS1UxBplzYnStBbZM9H_eD5X2pf14OPzzw4OloLN9OH0a0ylH2VFgD2h8xN4BM-Q8dl3a3gFdFrB4t-EJiJmjLdgG562a9WIpR4i47xHf3iqVXDSfRS8vbn9QiNsi_S89x2bVrXBa1kpFWl0jXbMNT94_Kq5JGhxHoCUvd6Pq1fR4f0VfPIpDWpOL_TTAbwYa6ETp_A_5qYro3pXzlehy3Ly5WDBPxu_2dctw5XZaOEMZFp8gNgJ3R164_6skTjSdxDfyT3yIQfFTcFN0Vd5FoIeRYXSyPPtyBeeeCW2r-lchDuBoT64GQrMy5bbCUYu3nZCfRs_TbrdmQTHsqRWLSIezoukGH9M5hI5eySwzLIfaO8kSVVwBwcRS54IHDYuIitde0pYsKA-VVHU0rdkiEcBSDgA1dkpjmKeAuLYkNjBxqzr1ZpDiaKXMyzr795JYSufal9PY7WR8YHoH1axORaF8503h_iipGky-esWdRzEEgXg2SLVnUUWNnx0AnK6rRb8uxCLd6Y0eujaFTIhdbe1b6XM-fhyfSA585V66QKLQide5-oooYl-i3NVFHa7U3EAQ9aJgWBpM6s85p_ECBHg0kSO1F2ZgWj8UnqY_52-MEq1OHb641WqtmrQNeM6Q1MaC5ZgqGhvi7eIwK05OsESLXzdP3aVcac0PuEA31DUUFq6rrh-oGEmAX2NDUALlME47p0W5yzqxrDQC77SaaZJMVKSw6Yb6KIrZbNJ7Yxw5nBwtHoegINEWn6RlK2XaP4a-mOHDWH-LaZeF3SNHLwpVWAhhKUyIxJEkvEXwViZcSZHQLiTUjnTltG9fyiRhUNtLwxCKvalAX0VXNn7HIsT1xRt2RkmESycMpFDuM7EN5bDLHDJhQqZoqBJFIdopXnB7tFb40Mjnvw5_ot-IQQQGBPaYmNeYmZxRRbLlb5_cfY60kM1g4jJDAJ7962bAen4fEN1VF8Cdu-IcZ0RGQhELMo-strKCLVw6a0JRSCq94Ph1CSxBMHggyhS0x37ANKrQbTbRip-uDnAAwUAkFyIbqNqWdxfjCUeNMGCNHD_Qt1jMC9sYTA2ZJ-FT18y9-svwxJQgLSH8IB82sjAQGWxS55zpQxTT1LQcwITd-ge_T1EYUYeZOJMDlCk5NlRH-eR0xoDBTLLukDN_QlTVLL5_cJuNt1jOY1mbiI0-616py1b1bUyb18J0yChw3fKdGzQDBlhoBpoDYDOVj3NVKzy-FNAHO-ZAsNdOG90LmVt-4X3vvbNCAqDj1bHqHlJV5G78V0mM7cpZV4NaPeZeKdwdpoJKbvBH2v6skpby45E-uQGQdouFMK0JymyMjEUtTOzpwpsI80h_6c3k3hEtCMkcekFw4hkxIuhlt7z-SdGl7rRmsfos47QxIivwUPWLLIe1giJiPbq-2-8ZZWIvBo4MKgPC6EDFJogts5njwH0cdP7CQibsHayIYYWrPJi9AUbUnOHkH3upOOv3QAGK0ad9thmwCg97tTcYrlUZWAsWhNONgCfo7Y7nUh2iEJnlYUTw1bMDCjt6zVlpl7Pwc7Q2Wu276e5tYscdPC8Wb_NfLUuN9ck5CARAzuUtj3Mu3Vu6hU7eXpwk2ZaDv6WZ6U7wqb-YrqOE05JrorbtynWCucLeJmUio0qFvvximssLHL9MyXktBacKfZnR-53kXgUGhRujd3F7t2prEjEjwrW1pw5raAWQudGvC_B0DWINiLUfFe_V4UMG8HRZ60TLanpzmm4kv7soSxRhU0vO0_xeN6kVxauqxTJy62J6STqATam8v-2IWhWWqU-ruP5fREBjAnJYo7X-0Q-yhQhYRbJ_YiO1NmbLVLomnNSyp4pltQYCMNmwoUns4Kp5haU4nyGLv6t9xHuhZXrWbTbLILykW59JBETPPrtc7STTexWiUaQHkAKrxOpgid5plp8jxeKkjtBgCZeTQiwoHlEglL-3Im3ThbjKFDpBzsGjzlhoNkZJci30gKz6TgTEiml-r4AAUtvImaV35Tidi-5x9ve3Wn991klcAQb6Y6Oq7vlp8ncAm_Rbmr5Ejz9QTs-6WPGxd65lQjTWfCgh3TMa4GmO3Bfghp-sulgapDEpWQJNiia4FSh9dzZGGulAjMDNLb65Nj7OfBMvJu1Cz6ihI_Avq58kMOiEADQzh0qMUdqFDVPPCVJ8ldnpJ2bPOs_BPz5vypirfbk7UuH2dm3ZImeoZhD7C4gf5JpPMZ97G08btmBj2UHPzzuF86r_qXeBZFINWzzOBNSfjbOBmSNuRS7t3BPyFvlWBiXcjXZVo5-BpPw37_HM_6DnTSQ_IC5wyPGc-nLt5pS_muDU327bP6ux79mw9iia296hXPqesKN_xfzYteKWrZM49Dg4lKRoha6FeGnFd4epuv6JyRLjMdJ0_lkyfBqPP09zzeQiOLmDmf3-2o5AzHfpI-sPaX2_DYBH1zzjYSdKHHH02r2TTFGo6HvcOyzRJ14AH22c7s-KZRFrnahVR3GlnhKClwOZhIq29t9M2aLMN77yKZgxMhx1dPWKoXIc2CanhchG4sIYnlkaxDuP1vi0YGSh1tleb2hevM7ghSj261sJoLcircgEsOz5n9COeYIMNUJMaigYiwZJnuIKuKb1rDbIJ1U-tBoJhFZ1UQFprfo1y4uAX1ROYGh7IrcsbReTdfXp4WHOayKeurpqP5UFOTRc5LFxrtsV6vDPeZjuq-rl5hhlf0JRc3aDX1tcb8fWfHPSwY8RbKvu7jWu_1SAeu01FCe_GabBrx9V4Z0IAv6oDzKVEd7ChiKIcMQz8kZZVBGNYEiuDTtEJVoNbGvz9lpC1767N1sPhGbcDg9LyKkPaXnjrjyTjvz5MOcTb2PCJJBwoWloVtB5TOUKTuOewF3yeJmKj0PjOIzWgo_h-6vV6qSaG8UrE9Ojf3V_ZT6hnVPXYloclZOCIEuSkDZQa7XLj1-hr0VMBLm8q1b1MzGsC0Y3DBXEHGGyMxzYrXkgj9kWlhujW7NZve7hLwIHdsaBNbtd17OhgaQWQbDmXfU_ARnP72pG4PIZZmm7Q3Eu1PF0Bk1W-_Guc0mOXH7w4lwJQ88p1yULEVsEdBbbdWc99Zq1gdtuHuE-sJiPfSA6ZN5EwUFgIAk9s83o9J_kqd2TMjWvjKHel7Ye5Qti9-Luli-dlg0lIDk8ovj6U4MdHo_tGV9j2g8WAZ205jd3C_ZQFPkI2q4GKsWvW-CJByzJRscCNPWQxH7B16S_1ihmjYCTMaEoLqjTiASRDL-_OFSmCaG0cO5A5BjmTeABIiiBHGEhVm2rwlNcRVGGpNAegFSIhyW2N2GXWM5pQsnKa1YxauMO9dyXIypK4VKG2r9TCXkNUcHWwZe8kbSUftspKBhMMdoFygZiPPw-N0iEDtBvrTjExuBgqESI1uYq3YN0az3WEAVjUxikFEw5YId6wIRPpCyyE68MlPqRzAmfJCiDolDNwVvHOKTbO707ltCozWz4mfMX1Me-10O2_n6G6xOObGNlkDWCFclPctoHDWne46ZmyP38c_lCAC_XCUMekFMj1F3r7DBLs35wRqyX_Hzmc8Xp3bnB0yjIfamp5bPcZx5huJXUZUMWTgHArphbwz0G1Jq3nPAK8VnLsYQ3DSEGsMYi5FB4uMoHXG2JBeHQ-dhyuedGR7xC4zOX3_kTbcm4LP-nqXUiNc0G5_6H5vgKgJlPZu79sTXONgg_r2RpYZ2a2iwWRxJ_5LvMedhyFYDp86hf0DnD4e4Rq5fdu3ZgDNT0vnrhF9JJNccKPp3tVoRibzyYLfl6zVxsWnDiwMm07u9u5JMbwIno0A0PJ5a2NRtGZ4fVF8K3RKWsXIyTTy725MI_mr2SrQAe4S2mf2JvjHWS296uyGLm4G4kQAAOIGdGBuP6FaGOQ5yLocf1ErpEhXrITpNNwibHp8Cnm-uL0v3Y2mrtgCi3rQIKYECGfcBx_Z0Q8cTX7Uns6HqvII6S10EafA77GBy6YpZ1ZMy2y1ZgpFrysXeTAFky5d4mqLrsC1edQ5x3n8_kONCujDGD8jB-S8cofiU_eUbUks5x0HyRmDpY9XPM9ucH0bFu6_tjxaWDO01bDChyRt3ABLI0iGGFPoN86PnHdga1A8x1eDRLqdsWbY7wYHtqzevv_ytFCW73UQpRWeH2THOV_SLEy26eZb-wOTUtqhmEG5HvH1cPE85R6bMa6GGssmiaYIAokvDPF3-yJtA-_87BCHn_-VKjI0Ou1doyHD9bM3N-_kBMphENe9foWdg-RsDb2f9YW6JD9_l5gYWKrHC2cGEZlg8DJsRz9hb76LmCgMa8cMd7RRmyNNhkzGASb3JxZTTsjjmCyPxnCOYn-9LNG5DBETyRprLyesg3M6qeJYQ6XjP6qjjbHCp_M2orAx1uTg8vpT-TTokAyv3Sshj7x0hey7bq2uxQR9unhhZdOK-OcHMraYQmNPgbilWyOro6rn8t4M0d_nYfsJBryPkmhjLZPFA1wArrtEOnk-hODCoQk6BVWoZ3NkXBUw30050TUyx229OwWTrIRlHz7wPD3V4y19p457IMEJOdnbXSZ0Uty3GvAIcSXIqFUbs6tVFFSlHGrYcMThV2Iik2IVubwe5z97nDYXqVTXR3edpLMfuLIVodEOMWL47DoD5j-N0AFaVeQBFyNwsO0ssnMo8QhWStzZOhmdC79_Y6SALs7ji-LrroOb6k1jybD7mhylefdYryUC0UzIe6UyxsVqMPF1SqTfbgTYIWDxq8sPzOQPKe1mN6cgbHHiw-xDV40rHPCS59j2jNkfpXI7tDjF4ZBrwe3P-BzjkBqTpdn7AXN0l9lBDGfvoEfXnSljbh1vte4ndJosMRVtEOJYdkmFb2YKbTqf7ReUyVyfh4w2DDfgyJBIBgJiUIYgwSTp34TuWY9q_thNNP-hG2n-I7cI3qnXPWt9676TDYZ4jryXcfGtnvdqSve-v59ZMga396DYu96riLPrlrO2hmkft20uUKm5zfCLpisqf2qlONzOGJ63R2frcejD7ZZq4awuts7Rp5xq6_qN-D5T-ZSxZd9k59uk2njI56fAJBfJWERzrOuX9tlZ4Qyho_CJnYHh7td89rrPtpPo9AtbsJ232n0E9eOuULMYLLbTa2e58XfwNHnkO9vCaZreJqnVkjxkyY32tERwansOY1KvGVdk7sAdQso9CtY2aMo9fJDowFDXJCg8AcuxaErGLnXT2v4dyi8YV6Inh6IpTPJpwYG34We9s3q8z4WJus2CcUoplY4REXiVo_ywnx0GdEH1uDnCqPJJZt8MaaCJqbrQREuxyX0VD69Lp8K3co0oGWzYezQmPydgxyDGAfUMmHItv0iMgvJmvkYCGKtuWrTuFuut1NbWp7KEvhgkCfkpt5zTNrWPzwP2gSwe3n1JTL_1_Hbz9P-PuXT_TzlUnvn6H3md0B8srFtoJ7O9GPnsroWxMN8yqVo1ykVaUvX0DLs6pghJctKyhMhpZ0mL0bFkN_foR6ECNrZ3fJo0qHtjy7ovxyJ_WvvHduP6oL4hYvDmv89sPRI4nt2mU_KJ-kuSf-D1kaEEpuazP2rM8T3gy7M-9AVzGA7fkM2gc7ytbhAZm9dq2rWYGvPlXz6e6Z2_zg_pNGFv5bZ0IVmclMMNpxdLr-zCypZRAHa4fdZ27trxtv5rHlO68be9RM07VY_YJmzVwNAm1sxzJVpihRPjXAQ6hLGUcnym4oxZ3JTCSd1uHWRm6b_cv-sy9zlWae3mdjjpXBkwqjVCEpDxqfu8dtucpxlRr3vT2t3ieW3qN7k_agTtu977q0ey5nsYL48J_UMqgwdSR90_rDrb4Z9q-A0TJbSEYJ5YVB2r3zzs84PaG_1xsbaBVBc11cKPe8PXvvIXv_V_pZ5-_aZUMfAm-XDuVnpdMkffheU3_hm3_zX-3Gh57xOv2t5_U53yXrED_zmq9UvvzFcY5lsRPm8rEwpcNLv2KG9oUWj_-vSf-Af8Zklm_BwjT_FfZR9v75dsXuhF37aC7C__zcPROFvDV4fP_GVd3fvWWUcvRX6wlrmUc6xf6Zl5eNwHO9x95lEZqDOHVGGIszOiZ11peOoE0Mcnbjg_UoFWusyY9Jbjsror3ohT8LWnPI3v2INT7eNIxo84fYtzEzk3g7qPViwUZg3Mja2cL_sYuorsy28-uD1VSGismbb7eFv3mnPEYGrWMcnbkUZRbzFoEYh0x1Prfq81Q3kHK4nibQuPyVR4q6WPPdB2nOjk5EGPITimYTY5efkj726oBwk48BMtL17V58vtcYwFTuYAKRLdgmlSTQw17p1npSbVPx0F3_h3tQxl92NnAe3XD4J5RJdRI86QDIGg31yJ1oK4w0qG4NO8jRQMMW9GZVB1KCl9Ru_6MozCmXpYXHYWHchhYZ-7hW24s0sIes1V93RcPjDCkEjbONyI3si2DF4iDs-ddNPpgzUq0cs0FzdqriMldkHF7A_cWp8jzRqZQi8aiUoHQNCQOiYDO778zN0TTdJ9ah4zrAf1rlqDmGyxpB1CzTjFZqJyYyB4cqpejK1pLeoCnnkEoDMMcEXYpdKbqYk8GUeLYK-h3PDcsmTADFJ58W7Z8MNpxgRXK4B9ZLyl7uw5niCCOY_Dwdwm5DQxt3AJTlT10h0ZQmklVUXXK8_ZrrrlZOJwbm-oStObO1_VK0rQUWdoUNcxLKV5e5iqQHBmHs0J3X7NORsLf2eWVFvao5_zO8qhYYYtnUkpJb4Ih1POoyJFDHreJHxiAP0yTYaP6PxvTFmD52sraRMupNd0BMrtwBmQ1H3BhIO46V3TZl0uT6LZAGGrKnNQMo5G0YhGB-F5hpvYB4JboD2FiPab6KZjTS1MNQ5S9CKWYIRyuOcA--h2lcUeK1mZRXDO1fUAIR1v5UW46Apv39bH5kzGbk6__evsd-s6H3HEg9HGi3wu2Mdpxr5m8cSO7rHbkEhEf5kQc2uVbSYygWFFOwnFZMRxfw2ksYGzqZfkCApNqi69UYHsU0qrGDvM4BoTXjKVny8bx4bREpcDeAh5dpnLCHgN4cqurAIQtw1kIE75JDhpmmb5_qer0WUCBdcMMg74wlCnh9zgz_q6GqfAXQbm2BBhqLySvIT5RXpSbaaSw86gqoleVoFsRx1FhiCwjKXrE9QxF5sEsA2XkbzsAkJRWwIoGL5MXrHfeSfAxXQihEHhEYOgIGwmVZ1DqzAWR1Ia8CmNGo2gowN1u-1c0ovyWkGvoDkonL_BshcMy_NxRsHmNGpT3uaF9KZcbn-n-xKFgPZKjhRwX2M8SfYInRvZFzReKG5fZ6Xco5oPXmwi87HkUFcoBXaBVUalFKMPI3CnfBSi6pIkpY21tuPXMPQTnOCowniYpBUN9rK7dvZxeSY54MPV3c13-0mDRkptl2NoQdZSF18e7_ydpGtihRFId7avNdrOaaAK3BBuQ4aM6L-LvphT0PbeqHCjG5LJIE6uLlrvIqsb7gbwt5B__07UOP2uR0Hf9HzddrcCuoLsG6Z2tWJ86DO0t7M6mKFJrtt3oeqRgDfqh7u-6WOURxYWDZRt3-E39QFaWUvOcEtpZvAD25yUlI0YB3Fa2hUDr7rlue_1gLTeUTTONoc6SqONC7OmvOOZd_Q3PTipgR0EHwzIvVdOGKzZtZrCA-761luNq65Ft5GqZ005ks24b77xj0qk_yw-Ihvct_kSbpgi14phanBJ7Iw4QV_D-06Bl6zBi3DK1o9i70FEvzPUsG-h2a_eX_x-pYvk7yFs3DaIfKt9vlvO7xRXuAVdI4LByLYwn0sElEbKk-ekDq-jhuZQf6HlJx_g3TTHJJProhwjGn-fNPaToil5vMyN_t63oHEpiGsKUmzYh-Q1enBjMXizEJ7yqqrYmhLoCCTWBsRN0DrMCAR8XVqNOwZIBRlUDzo9GeLRSZLIdi_zsqzWz_oWUEc8yxIFeeZoyvpC-Ng5uEM6KA-TyYn_DnQpsMxCkaUT4UQMvzSsPt82RGhao8o6_YTOhxNdHOiOrN8D8sCmlbUemziOIzoT6ASGr0AOl-h_vpjkfs08OwR_HMJaSk4im-aiKu480Q3hqENSHEPtPHD_7yxsQFI3smcMqHkzzY6MJtq4B7rW254wGEzYBPn0Q4-MgGZbDZNZD417-KR9BJuHOJK0IE-NAUaGbJ5YpV1zRPZKKtvocNsdLhxBVYHThOo9t_H1Lcsc-m-nXJhEItb9_Y1IrCpHIAOZZGWHO8BRMULJEPQ-2_jmMdw2VIhqLlH4Tq_idpdHKUZPvVq_Q5zlZkX3JbSN4szyArBnAnP1QXQis3W5jJOjgsi1ta7lPs2zxqOs4Xg_R_F7hqc9PTBF-Kl8SOfkQT_19yQ_SBm-rs0aycNGY1KpIGKcqk7obqWpYmzcHl-TnsF7pKsmjUoaSwa2EB16P11rs11jxtmH0bmhqdvZBHtL0qDYhtXbvk_vN97K36xsIFct2lQyJnLA0u-Iws-DFLCJZQ3x3DQL5MHHNE6f0M4fVnrSj4CAe7rTJhA6sxuvDXCnfOPeZslRZEhitwtJQFkOCQcRsZmsfU1CGvS2nWw8LrIntit18tyfG2weN0DZpPemW-K9HcxB2EIJ8RV5XWwcNMOkNAMRDTnMGgL5YXTWBxFp0c_qreuwbiyRgnisCDICS9_CHRGSXA5PvCzb7LK1V_eBsVO892Le936YkZCbTgPJXnVLn6NxpJz9Yy5NE28rJ5qUhBWHQVrUHTqsw8KBCJREWwKH1FbrBvMk1cGZ2mQFrThKQDs04lWgmRyuoI0ma4_WqOQK7OaCkdhsTHzTSNsknuPaKpBMLEcUZWSYFx1TAULS1Fp9PcFjul1ahMLRAltND0OlFGetoa5HXSPMtj1go4UR8blsEJfqXog-SsTWqk4T82K67emzsYYVh_DHTnRwqbWoSPjn_Q24rfl5YjoD68w8Ko7axn5vzIzUUQ-GcHTEczg_8LfsyI-s0EDQR5IvI6gNj5gppyZ2Gn6yUfBKes4yYJhFq4FSK4xVMPHYmAsFE58ZEHcicPX_Cv83jwiejLx6W6ElCz1TR10C_EZlmkenO2O3al6UzN-8MVkOJHzCHXkHQc7qrtGotQop5yA-EceGB7qs34zoU9x6y0oAKeFxG0YCROXRfs5x1JFprTn6vCycL3BlJmhhJyA3uOCrzp7w5YOuqE3Xgse-f_9YbjE_W7BhOvYNzglL87xPLFKenxI-Pf2xOGcJ8e0hxBjsCayX2xVh7l5KpEVD-CYtugTV3K2KdHfKslQ346JWWE5Jl8DOmzebKm-I1F2omVwQ7cEMtmsTZBgHKW-d_ZP0q5lzgcojbiiovOsoKupDeiOmifdUrjR-HgQzgtEaD2P39mqkvCZtr2cBvWoqJxk4-FilPkgaG2YBi7YGUwqJMTHBliD7rBiHFJ4MXyVrPl8dy5IEVLINAuiqujXSdiptGKwq06I_lUGIu2Ziuzi2fMlZcNbioFpNnWaUUV-m816gKdR7SM3v8zZUkzJ7Kh7CPc-3a0MzNIqx3WEEK2rwhyMJjhQGPn6DRgrKpDYO8Jmef9UsD548nPKXXokr_tX53fVZukCIfHkTPgS_e-nMHt1kb68uwmS0BCXhRNsejwp7W2zWcVop_8QIEXwctHTVC5CuL7DA-GAIdLSHnyFyr5_E5Qm2ulC84d1R4u8nLL5Ym_3Np_eIP78DZluL_-oTolGqy0m0lKrEkRaH2qeKaaQxvaeP1PP742XuBthFR-BnaO7KOgjNVrXOKZ_xmuFoXQZzNt0gJetw65-TkTsgBu6FESb4XtNIJrQ8xnhUoicOjoQfiLiAXq8Mu4l9ZdBzzsuzZWPU4F7POdU4KTVtATfypAzNv3ZamLGqKW2gCcofCA9cwzEXt1Wu19F_6GWevIS-0iKWgxtrdlXNoo4mt8EBjx5rsOjeXV05ZiYApxSxx571BDwyHeqLNVrJO2FUaRDiVoPPidKzjSu0lLQBw0hN70ftSS1zkMK3TIm502g4SPq5MiqAuxTgY-nZUncKSqAQAfzIEaV0JcZmz5ESHXZSVEiT7BqtPCKeRyqMkenkNzw0YC92gOiQPzxePuWjxRAN-6yBR_2PvMfRrQMarG84FKuodaPtmYOzVBZlkhhAGFbljZ6zyTY8B6TQ10rJPLK2lNost-nYJeJJjyjgYjGIhNPIFn8jvX9qObKwflJVqZyUWla_xNvC34bI7FeSV0tfctNQM8EOS2_axlWjPWqwJ9LC8-Kw_khVY3KVii2B4C_wTqrTh7J4k1bEzHyjEa4Z51H7RYOhjEPJKFoUAMPU404oXy-eD3IpgxJNZkha5OhCs3HrCW81tfDI1Il67edWWwBmrK7nTCTZ_I57pIqEJBolpgcf10xqsERpR0LzTOOhxRWQsRbI1cXbLdgJ6ewe-qyJtzoE0RB2fiUn_NLiNOcbQor3AHOVGB3dpCF48jTW7CGKRWVO5PEMqfCCKWAzsySowZc_AKxdimCAMkg05Y_DzG0TUyrJ_bT192hBlB8YxJui7gbjBgTxWGOU6o_X5mJBSiQyJJgDDmS3TG-bV04XlpHtjhWZWN-QMsPvq9rpZuBlY-sYzn5R870OeJ7owQ8FYPzUE5DVyizCiW6UXiIO7aPIcZTcTb2aw9MxE6JDlEg8scy32VK8s1RAGeIlOtiONtFTgIhcoHgoB0mAZnEzSZYJ1hR3Bekl0Cseyb5--CoeM20G-CrMxCsTJRrQK9zH6VjYXHyRZILgubhd70aVSvESevDhc6JN-97d3iJtBPZhVKbGw1EJ3AQp64aIsz8rAur7jPMQTidLI2YD7NqjmS9RJuvJCg"
    },
    debug: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,m,y,w,k,S,T,x,A,I;function F(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var U=(e,t=e=>Error(e))=>{throw eo(e=e4(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ef(e)&&ef(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},q=(e,t,...r)=>e===t||0<r.length&&r.some(t=>q(e,t)),z=(e,t)=>null!=e?e:U(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),R=(e,t=!0,r)=>{try{return e()}catch(e){return eg(t)?ed(e=t(e))?U(e):e:en(t)?console.error(t?U(e):e):t}finally{null!=r&&r()}};class P extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),F(this,\"_action\",void 0),F(this,\"_result\",void 0),this._action=e}}var D=e=>new P(async()=>e4(e)),B=async(e,t=!0,r)=>{try{return await e4(e)}catch(e){if(!en(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},W=e=>e,J=e=>!!e,L=e=>e===G,V=void 0,H=Number.MAX_SAFE_INTEGER,K=!1,G=!0,X=()=>{},Z=e=>e,Y=e=>null!=e,Q=Symbol.iterator,ee=Symbol.asyncIterator,et=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:V,er=(e,t)=>eg(t)?e!==V?t(e):V:(null==e?void 0:e[t])!==V?e:V,en=e=>\"boolean\"==typeof e,ei=et(en,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||V))),ea=e=>e!==K,el=e=>\"number\"==typeof e,eo=e=>\"string\"==typeof e,eu=et(eo,e=>null==e?void 0:e.toString()),es=Array.isArray,ed=e=>e instanceof Error,ev=(e,t=!1)=>null==e?V:!t&&es(e)?e:em(e)?[...e]:[e],ec=e=>e&&\"object\"==typeof e,ef=e=>(null==e?void 0:e.constructor)===Object,ep=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),eh=e=>\"symbol\"==typeof e,eg=e=>\"function\"==typeof e,em=(e,t=!1)=>!(null==e||!e[Q]||\"string\"==typeof e&&!t),ey=e=>e instanceof Map,eb=e=>e instanceof Set,ew=(e,t)=>null==e?V:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ek=(e,t,r)=>e[0]===t&&e[e.length-1]===r,eS=e=>eo(e)&&(ek(e,\"{\",\"}\")||ek(e,\"[\",\"]\")),eT=!1,ex=e=>(eT=!0,e),eA=e=>null==e?V:eg(e)?e:t=>t[e],eI=(e,t,r)=>(null!=t?t:r)!==V?(e=eA(e),null==t&&(t=0),null==r&&(r=H),(n,i)=>t--?V:r--?e?e(n,i):n:r):e,eE=e=>null==e?void 0:e.filter(Y),eN=(e,t,r,n)=>null==e?[]:!t&&es(e)?eE(e):e[Q]?function*(e,t){if(null!=e)if(t){t=eA(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),eT){eT=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===V?t:eI(t,r,n)):ec(e)?function*(e,t){t=eA(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),eT){eT=!1;break}}}(e,eI(t,r,n)):eN(eg(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),e$=(e,t,r,n)=>eN(e,t,r,n),eO=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Q]||n&&ec(t))for(var a of i?eN(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eN(e,t,i,a),r+1,n,!1),eC=(e,t,r,n)=>{if(t=eA(t),es(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!eT;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return eT=!1,a}return null!=e?t0(e$(e,t,r,n)):V},e_=(e,t,r,n)=>null!=e?new Set([...e$(e,t,r,n)]):V,ej=(e,t,r=1,n=!1,i,a)=>t0(eO(e,t,r,n,i,a)),eF=(...e)=>{var t;return eR(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...t0(e))),t},eU=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,eT)){eT=!1;break}return i},eM=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,eT)){eT=!1;break}return r},eq=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,eT){eT=!1;break}return r},ez=(e,t,r,n)=>{var i;if(null!=e){if(es(e))return eU(e,t,r,n);if(r===V){if(e[Q])return eM(e,t);if(\"object\"==typeof e)return eq(e,t)}for(var a of eN(e,t,r,n))null!=a&&(i=a);return i}},eR=ez,eP=async(e,t,r,n)=>{var i,a;if(null==e)return V;for(a of e$(e,t,r,n))if(null!=(a=await a)&&(i=a),eT){eT=!1;break}return i},eD=(e,t)=>{if(null==e)return V;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eB=(e,t,r)=>{var n,i,a;return null==e?V:en(t)||r?(a={},eR(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>eR(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eD(eC(e,t?(e,r)=>er(t(e,r),1):e=>er(e,1)))},eW=(e,t,r,n,i)=>{var l=()=>eg(r)?r():r;return null!=(e=ez(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eJ=(e,t,r,n)=>eC(e,(e,r)=>e&&null!=t&&t(e,r)?e:V,r,n),eL=(e,t)=>{var r,n;if(null==e)return V;if(!t){if(null!=(r=null!=(n=e.length)?n:e.size))return r;if(!e[Q])return Object.keys(e).length}return r=0,null!=(n=ez(e,t?(e,n)=>t(e,n)?++r:r:()=>++r))?n:0},eV=(e,...t)=>null==e?V:el(e)?Math.max(e,...t):eW(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||el(i)&&e<i?i:e,V,t[2],t[3]),eK=(e,t,r,n)=>{var i;return null==e?V:ef(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:J))?i:ez(e,t?(e,r)=>!!t(e,r)&&ex(!0):()=>ex(!0),r,n))&&i},eG=(e,t=e=>e)=>{var r;return null!=(r=ev(e))&&r.sort((e,r)=>t(e)-t(r)),e},eX=(e,t,r)=>(e.constructor===Object||es(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eZ=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=eg(r)?r():r)&&eX(e,t,n),n},eY=(e,...t)=>(eR(t,t=>eR(t,([t,r])=>{null!=r&&(ef(e[t])&&ef(r)?eY(e[t],r):e[t]=r)})),e),eQ=(e,t,r,n)=>{if(e)return null!=r?eX(e,t,r,n):(eR(t,t=>es(t)?eX(e,t[0],t[1]):eR(t,([t,r])=>eX(e,t,r))),e)},e0=(e,t,r)=>{var n;return ep(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ep(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ef(e)&&delete e[t],e},e2=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eZ(e,t),ep(e,\"delete\")?e.delete(t):delete e[t],r},e6=(e,t)=>{if(e)return es(t)?(es(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e6(e,t)):es(e)?t<e.length?e.splice(t,1)[0]:void 0:e2(e,t)},e4=e=>eg(e)?e():e,e5=(e,t=-1)=>es(e)?t?e.map(e=>e5(e,t-1)):[...e]:ef(e)?t?eB(e,([e,r])=>[e,e5(r,t-1)]):{...e}:eb(e)?new Set(t?eC(e,e=>e5(e,t-1)):e):ey(e)?new Map(t?eC(e,e=>[e[0],e5(e[1],t-1)]):e):e,e3=(e,...t)=>null==e?void 0:e.push(...t),e8=(e,...t)=>null==e?void 0:e.unshift(...t),e9=(e,t)=>{var r,i,a;if(e)return ef(t)?(a={},ef(e)&&(eR(e,([e,l])=>{if(!M(l,t[e],-1)){if(ef(r=l)){if(!(l=e9(l,t[e])))return;[l,r]=l}else el(l)&&el(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e5(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e7=\"undefined\"!=typeof performance?(e=G)=>e?Math.trunc(e7(K)):performance.timeOrigin+performance.now():Date.now,te=(e=!0,t=()=>e7())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tr=(e,t=0)=>{var e=eg(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=tu(!0).resolve(),c=te(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await B(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&m(!1),!(y.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{y.active&&p(),y.active&&h()},m=(e,t=!e)=>(c(e,t),clearTimeout(d),y.active=!!(d=e?h():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,m(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!a,l)};function tn(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class ti{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ta,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tn(this,\"_promise\",void 0),this.reset()}}class ta{then(e,t){return this._promise.then(e,t)}constructor(){var e;tn(this,\"_promise\",void 0),tn(this,\"resolve\",void 0),tn(this,\"reject\",void 0),tn(this,\"value\",void 0),tn(this,\"error\",void 0),tn(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===V||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var to=(e,t)=>null==e||isFinite(e)?!e||e<=0?e4(t):new Promise(r=>setTimeout(async()=>r(await e4(t)),e)):U(`Invalid delay ${e}.`),tu=e=>new(e?ti:ta),td=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},et=()=>{var e,t=new Set;return[(r,n)=>{var i=td(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tc=(e,t,r)=>null==e?V:es(t)?null==(t=t[0])?V:t+\" \"+tc(e,t,r):null==t?V:1===t?e:null!=r?r:\"is\"===e?\"are\":e+\"s\",tf=!0,tp=(e,t,r)=>r?(tf&&e3(r,\"\u001b[\",t,\"m\"),es(e)?e3(r,...e):e3(r,e),tf&&e3(r,\"\u001b[m\"),r):tp(e,t,[]).join(\"\"),th=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tm=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?V:null!=n[t]?t:r?U(`The ${e} \"${t}\" is not defined.`):V,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:t<e?1:0},...u}}),i},ty=Symbol(),tb=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(eo(t)?t=[t]:es(t))&&tH(t,e=>1<(i=l[1].split(e)).length?tP(i):V)||(l[1]?[l[1]]:[]),l):V},tw=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?V:tA(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&V,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):V,path:v,query:!1===t?c:c?tk(c,{...n,delimiters:t}):V,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":V),e}),tk=(e,t)=>tS(e,\"&\",t),tS=(e,t,{delimiters:r=!0,...n}={})=>{e=tK(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=tb(e,{...n,delimiters:!1===r?[]:!0===r?V:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tR}),t=ri(tZ(e,!1),([e,t])=>[e,!1!==r?1<t.length?t2(t):t[0]:t.join(\",\")]);return t&&(t[ty]=e),t},tT=(e,t)=>t&&null!=e?t.test(e):V,tx=(e,t,r)=>tA(e,t,r,!0),tA=(e,t,i,a=!1)=>null==(null!=e?e:t)?V:i?(r=V,a?(n=[],tA(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:V,tI=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tE=/\\z./g,tN=(e,t)=>(t=rs(e_(eJ(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tE,t$={},tO=e=>e instanceof RegExp,tC=(r,n=[\",\",\" \"])=>{var i;return tO(r)?r:es(r)?tN(eC(r,e=>null==(e=tC(e,n))?void 0:e.source)):en(r)?r?/./g:tE:eo(r)?null!=(i=(e=t$)[t=r])?i:e[t]=tA(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tN(eC(t_(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${rs(n,tI)}]`)),e=>e&&`^${rs(t_(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tI(tj(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):V},t_=(e,t,r=!0)=>null==e?V:r?t_(e,t,!1).filter(Z):e.split(t),tj=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tF=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eQ(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},tU=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},tM=(e,t)=>{if(!e||tU(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=tM(r.contentWindow,t))return e}catch(e){}},tq=e=>null==e?e:globalThis.window?tM(window,tU(e)):globalThis,tz=!1,tR=Symbol(),tP=e=>(tz=!0,e),tD=Symbol(),tB=Symbol(),tW=Symbol.iterator,tJ=(e,t,r)=>{if(null==e||e[tD])throw t;e=tq(e);if(!e)throw t;var l,i=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tR){if(a===tP)break;if(n=a,r&&r.push(a),tz){tz=!1;break}}return r||n},a=(e.Array.prototype[tD]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tR){if(l===tP)break;if(n=l,r&&r.push(l),tz){tz=!1;break}}return r||n},i());for(l of(e.Object.prototype[tD]=(e,t,r,n,l)=>{if(e[tW])return(e.constructor===Object?a:Object.getPrototypeOf(e)[tD]=i())(e,t,r,n,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=t?t(u,s++,n,l):u)!==tR){if(u===tP)break;if(n=u,r&&r.push(u),tz){tz=!1;break}}return r||n},e.Object.prototype[tB]=function(){var t,e;return this[tW]||this[ee]?this.constructor===Object?null!=(e=this[ee]())?e:this[tW]():((e=Object.getPrototypeOf(this))[tB]=null!=(t=e[ee])?t:e[tW],this[tB]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))l[tD]=i(),l[tB]=l[tW];return e.Number.prototype[tD]=(e,t,r,n,i)=>a(tL(e),t,r,n,i),e.Number.prototype[tB]=tL,e.Function.prototype[tD]=(e,t,r,n,i)=>a(tV(e),t,r,n,i),e.Function.prototype[tB]=tV,r()};function*tL(e=this){for(var t=0;t<e;t++)yield t}function*tV(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tH=(e,t,r,n)=>{try{return e?e[tD](e,t,void 0,r,n):null==e?e:void 0}catch(i){return tJ(e,i,()=>tH(e,t,r,n))}},tK=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[tD](e,t,r,n,i):null==e?e:void 0}catch(a){return tJ(e,a,()=>tK(e,t,r,n,i))}},tG=(e,t=!0,r=!1)=>tK(e,!0===t?e=>null!=e?e:tR:t?t.has?e=>null==e||t.has(e)===r?tR:e:(e,n,i)=>!t(e,n,i)===r?e:tR:e=>e||tR),tX=(e,t,r=-1,n=[],i,a=e)=>tK(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tX(e,void 0,r-1,n,e),tR):e,n,i,a),tZ=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tH(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&re(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tQ=e=>void 0===e?[]:null!=e&&e[tW]&&\"string\"!=typeof e?e:[e],t0=e=>null==e||es(e)?e:e[tW]&&\"string\"!=typeof e?[...e]:[e],t2=(e,...t)=>{var r,n;for(n of e=!t.length&&em(e)?e:[e,...t])if(null!=n){if(em(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},t6=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),t4=(e,t,r)=>t0(e).sort(\"function\"==typeof t?(e,n)=>t6(t(e),t(n),r):es(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=t6(t[a](e),t[a](n),r);return i}:(e,t)=>t6(e,t,r):(e,r)=>t6(e,r,t)),t5=Object.keys,t3=Symbol(),t8=Symbol(),t9=Symbol(),t7=(e,t,r)=>{if(null==e||e[t8])throw t;var i,e=tq(e);if(!e||e.Object.prototype[t3])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[t3]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[t8]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[t3]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[t8]=i.has,i[t9]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[t9]=function(e){return this.push(...e),this},[e.Object,e.Array]))i[t3]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[t8]=function(e){return this[e]};return r()},re=(e,t,r)=>{try{if(null==e)return e;var n=e[t8](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t3](t,r));e[t3](t,n)}return n}catch(n){return t7(e,n,()=>re(e,t,r))}},rt=(e,t,r)=>{try{return!0===(null==e?void 0:e[t3](t,r,!0))}catch(n){return t7(e,n,()=>rt(e,t,r))}},rr=(e,t,r)=>{try{return e[t3](t,r),r}catch(n){return t7(e,n,()=>rr(e,t,r))}},rn=(e,...t)=>{try{return null==e?e:e[t9](t)}catch(r){return t7(e,r,()=>rn(e,...t))}},ri=(e,t)=>{var r={};return tH(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tR&&e!==tP)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tR&&e!==tP)?r[e[0]]=e[1]:e),r},ra=(e,...t)=>{try{return(null==e?void 0:e.constructor)===Object?tH(t,t=>tH(t,t=>t&&(e[t[0]]=t[1]))):tH(t,t=>tH(t,t=>t&&e[t3](t[0],t[1]))),e}catch(r){return t7(e,r,()=>ra(e,...t))}},rl=(e,t,r={})=>{if(null!=e){var l,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(l of tQ(t))tH(l,t=>{var o,u;t&&([t,o]=t,u=e[t],(a?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?rl(u,o,r):i&&(e[t]=o))})}return e},ro=(e,t)=>null==e?e:ri(t,t=>null!=e[t]||t in e?[t,e[t]]:tR),ru=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),rs=(e,t,r)=>null==e?e:em(e)?tG(\"function\"==typeof t?tK(e,t):(r=t,e),ru,!0).join(null!=r?r:\"\"):ru(e)?\"\":e.toString(),rd=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?rd(tK(e,t),r,n):(i=[],n=tH(e,(e,t,r)=>ru(e)?tR:(r&&i.push(r),e.toString())),[t,o]=es(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},rv=tm(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rc=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rf=ri(rc,e=>[e,e]),rp=(Object.freeze(eD(rc.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),rh=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rg={names:rc,parse(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),eo(e)&&(e=e.split(\",\")),es(e)){var i,n={};for(i of e)rf[i]?\"necessary\"!==i&&(n[i]=!0):r&&U(`The purpose name '${i}' is not defined.`);e=n}return t?(t=t5(e)).length?t:[\"necessary\"]:e},getNames:e=>tK(e,([e,t])=>t?e:tR),get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rp(i,n))&&!t[rp(i,n)])return!1;if(e=rh(e,n),t=rh(t,n),r){for(var a in t)if(rf[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(rf[a]&&e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(rf[a]&&e[a]){if(t[a])return!0;l=!0}return!l}},rm=(tm(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${rd(rg.parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),ry={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rg.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rg.parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=rv.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rg.parse(a,{validate:!1}))?e:{}}):t?ry.clone(t):{classification:\"anonymous\",purposes:{}}}},rb=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rw=e=>!(null==e||!e.patchTargetId),rk=Symbol(),rS=e=>void 0===e?\"undefined\":th(JSON.stringify(e),40,!0),rT=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rx=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rA=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rI=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rE=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rN=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rS(t)+` ${r}.`}),rk),r$=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&r$((t?parseInt:parseFloat)(e),t,!1),rO={},rc=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rO[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rO[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rN(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rT.test(e)&&!isNaN(+new Date(e))?e:rN(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||r$(e,!1,!1)){if(!r$(e,!0,!1))return rN(n,e,\"is not a valid UNIX timestamp\");e=+e}else if(!rx.test(e)||isNaN(+new Date(e)))return rN(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>r$(e,!0,!1)?+e:rN(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>r$(e,!0,!1)?+e:rN(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>r$(e,!1,!1)?e:rN(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rI.test(e)?e:rN(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rI.exec(e);return r?r[2]?e:rN(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rN(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rI.exec(e);return r?\"urn\"!==r[1]||r[2]?rN(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rN(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rE.test(e)?e.toLowerCase():rN(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rN(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rA.exec(e))?void 0:r[1].toLowerCase():null)?r:rN(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rS(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rk&&e.length>d?rN(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rk||(null==c||c<=e)&&(null==f||e<=f)?e:rN(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rk)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+rd(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rk||u.has(e)?e:rN(t,e,p)}(e=>null==e||e instanceof Set||new Set(e[tW]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tm(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),r_=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rj=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rF=((E=a=a||{})[E.Success=200]=\"Success\",E[E.Created=201]=\"Created\",E[E.NotModified=304]=\"NotModified\",E[E.Forbidden=403]=\"Forbidden\",E[E.NotFound=404]=\"NotFound\",E[E.BadRequest=405]=\"BadRequest\",E[E.Conflict=409]=\"Conflict\",E[E.Error=500]=\"Error\",(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status)),rU=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rM(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rq=e=>{var t=r_(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${a[e.status]}.`:`${t} failed with status ${e.status} - ${a[e.status]}${r?` (${r})`:\"\"}.`};class rz extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rM(this,\"succeeded\",void 0),rM(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rU(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rU(e,!1)))?t:[]}}var rR=e=>!!e.callback,rP=e=>!!e.poll,rD=Symbol(),rB=(e,t,r,{poll:n,logCallbackError:i}={})=>{var l=es(t)?t:[t],o=[],u=(async()=>{var s,d,u,v,t=await r(l.filter(e=>e)),a=[];for(u of l)u&&null!=(d=t.get(u))&&(d[rD]=u,rR(u)&&a.push([u,e=>!0===u.callback(e)]),rP(u))&&a.push([u,e=>{var t;return!rF(e,!1)||(t=!rF(e,!1)||u.poll(e.value,e[rD]===u,s),s=e.value,t)}]);for([u,v]of a)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${r_(u)} failed: ${t}.`;i?i(f,u,t):o.push(f)}return t})(),s=async(r,n)=>{var v,c,f,i=await u,s=[],d=[];for(v of l)v?null==(f=i.get(v))?d.push(`No result for ${r_(v)}.`):!r||rU(f,n||\"set\"===e)?s.push(r&&f.status===a.NotFound?void 0:1<r?null!=(c=f.value)?c:void 0:f):d.push(rq(f)):s.push(void 0);if(d.push(...o),d.length)throw 10<d.length&&d.push(`\n(and ${d.splice(10).length} more...)`),new rz(s,d.join(\"\\n\"));return l===t?s:s[0]};return Object.assign(D(()=>s(1,!1)),{as:()=>s(1,!1),all:()=>s(0,!1),require:()=>s(1,!0),value:(e=!1)=>s(2,e),values:(e=!1)=>s(2,e)})},rW=e=>e&&\"string\"==typeof e.type,rJ=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rL=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rV=(e,t)=>{var r;return t&&(!(o=e.get(l=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=o.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(l,t)},rH=(e,t=\"\",r=new Map)=>{if(e)return em(e)?tH(e,e=>rH(e,t,r)):eo(e)?tA(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rL(n)+\"::\":\"\")+t+rL(i),value:rL(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rV(r,i)}):rV(r,e),r},rK=tm(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rG=tm(\"variable scope\",{...rK,...rc}),rX=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rZ=e=>null!=e&&!!e.scope&&null!=rK.ranks[e.scope],rY=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rQ=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},r1=()=>()=>U(\"Not initialized.\"),r2=window,r6=document,r4=r6.body,r5=(e,t)=>!(null==e||!e.matches(t)),r3=((e=>tf=e)(!!r2.chrome),H),r8=(e,t,r=(e,t)=>r3<=t)=>{for(var n=0,i=K;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==G&&null!=a),G),n-1)!==K&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==r6&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},r9=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||ei(e);case\"n\":return parseFloat(e);case\"j\":return R(()=>JSON.parse(e),X);case\"h\":return R(()=>n5(e),X);case\"e\":return R(()=>null==n8?void 0:n8(e),X);default:return es(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r9(e,t[0])):void 0}},r7=(e,t,r)=>r9(null==e?void 0:e.getAttribute(t),r),ne=(e,t,r)=>r8(e,(e,n)=>n(r7(e,t,r))),nt=(e,t)=>null==(e=r7(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),nr=e=>null==e?void 0:e.getAttributeNames(),nn=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,ni=e=>null!=e?e.tagName:null,nl=e=>({x:ew(scrollX,e),y:ew(scrollY,e)}),no=(e,t)=>tj(e,/#.*$/,\"\")===tj(t,/#.*$/,\"\"),nu=(e,t,r=G)=>(s=ns(e,t))&&W({xpx:s.x,ypx:s.y,x:ew(s.x/r4.offsetWidth,4),y:ew(s.y/r4.offsetHeight,4),pageFolds:r?s.y/window.innerHeight:void 0}),ns=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:d,y:v}=nv(e),{x:d,y:v}):void 0,nv=(e,t=!0)=>e?(c=e.getBoundingClientRect(),u=t?nl(K):{x:0,y:0},{x:ew(c.left+u.x),y:ew(c.top+u.y),width:ew(c.width),height:ew(c.height)}):void 0,nc=(e,t,r,n={capture:!0,passive:!0})=>(t=t0(t),td(r,r=>tH(t,t=>e.addEventListener(t,r,n)),r=>tH(t,t=>e.removeEventListener(t,r,n)))),np=()=>({...u=nl(G),width:window.innerWidth,height:window.innerHeight,totalWidth:r4.offsetWidth,totalHeight:r4.offsetHeight}),nh=new WeakMap,ng=e=>nh.get(e),nm=(e,t=K)=>(t?\"--track-\":\"track-\")+e,ny=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tH(nr(e),l=>{var o;return null!=(o=(f=t[0])[p=l])?o:f[p]=(a=K,!eo(n=tH(t[1],([t,r,n],i)=>tT(l,t)&&(a=void 0,!r||r5(e,r))&&ex(null!=n?n:l)))||(i=e.getAttribute(l))&&!ei(i)||rH(i,tj(n,/\\-/g,\":\"),r),a)}),nb=()=>{},nw=(e,t)=>{if(h===(h=nE.tags))return nb(e,t);var r=e=>e?tO(e)?[[e]]:em(e)?ej(e,r):[ef(e)?[tC(e.match),e.selector,e.prefix]:[tC(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tX(h,([,e])=>e,1))]];(nb=(e,t)=>ny(e,n,t))(e,t)},nk=(e,t)=>rs(eF(nn(e,nm(t,G)),nn(e,nm(\"base-\"+t,G))),\" \"),nS={},nT=(e,t,r=nk(e,\"attributes\"))=>{var n;r&&ny(e,null!=(n=nS[r])?n:nS[r]=[{},tx(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tC(r||n),,t])],t),rH(nk(e,\"tags\"),void 0,t)},nx=(e,t,r=K,n)=>null!=(r=null!=(r=r?r8(e,(e,r)=>r(nx(e,t,K)),eg(r)?r:void 0):rs(eF(r7(e,nm(t)),nn(e,nm(t,G))),\" \"))?r:n&&(g=ng(e))&&n(g))?r:null,nA=(e,t,r=K,n)=>\"\"===(m=nx(e,t,r,n))||(null==m?m:ei(m)),nI=(e,t,r,n)=>e&&(null==n&&(n=new Map),nT(e,n),r8(e,e=>{nw(e,n),rH(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nE={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nN=[],n$=[],nO=(e,t=0)=>e.charCodeAt(t),n_=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nN[n$[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(n$[(16515072&t)>>18],n$[(258048&t)>>12],n$[(4032&t)>>6],n$[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nj=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nN[nO(e,r++)]<<2|(t=nN[nO(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nN[nO(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nN[nO(e,r++)]);return a},nF={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nU=(e=256)=>e*Math.random()|0,nq={exports:{}},{deserialize:nz,serialize:nR}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i+=String.fromCharCode(a>>10|55296)+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nq.exports=n})(),(E=nq.exports)&&E.__esModule&&Object.prototype.hasOwnProperty.call(E,\"default\")?E.default:E),nP=\"$ref\",nD=(e,t,r)=>eh(e)?V:r?t!==V:null===t||t,nB=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nD(t,n,r)?s(n):V)=>(n!==i&&(i!==V||es(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||eg(e)||eh(e))return V;if(ec(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nP]||(e[nP]=l,u(()=>delete e[nP])),{[nP]:l};if(ef(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!em(e)||e instanceof Uint8Array||(!es(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return R(()=>{var r;return t?nR(null!=(r=s(e))?r:null):R(()=>JSON.stringify(e,V,n?2:0),()=>JSON.stringify(s(e),V,n?2:0))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nW=e=>{var t,r,n=e=>ec(e)?e[nP]&&(r=(null!=t?t:t=[])[e[nP]])?r:(e[nP]&&delete(t[e[nP]]=e)[nP],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(eo(e)?R(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),V)):null!=e?R(()=>nz(e),()=>(console.error(\"Invalid message received.\",e,Error().stack),V)):e)},nJ=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>el(e)&&!0===r?e:u(e=eo(e)?new Uint8Array(tK(e.length,t=>255&e.charCodeAt(t))):t?R(()=>JSON.stringify(e),()=>JSON.stringify(nB(e,!1,n))):nB(e,!0,n),r),a=e=>null==e?V:R(()=>nW(e),V);return t?[e=>nB(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nU()));for(r=0,a[n++]=g(v^16*nU(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nU();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=en(t)?64:t,h(),[l,u]=nF[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?Z:n_)(l(nB(e,!0,n))),e=>null!=e?nW(o(e instanceof Uint8Array?e:(r&&eS(e)?a:nj)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=y?y:y=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},[nL,,]=(nJ(),nJ(null,{json:!0,decodeJson:!0}),nJ(null,{json:!0,prettify:!0})),tm=t_(\"\"+r6.currentScript.src,\"#\"),rc=t_(\"\"+(tm[1]||\"\"),\";\"),nG=tm[0],nX=rc[1]||(null==(E=tw(nG,{delimiters:!1}))?void 0:E.host),nZ=e=>!(!nX||(null==(e=tw(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nX))!==G),tm=(...e)=>tj(rs(e),/(^(?=\\?))|(^\\.(?=\\/))/,nG.split(\"?\")[0]),nQ=tm(\"?\",\"var\"),n0=tm(\"?\",\"mnt\"),n1=(tm(\"?\",\"usr\"),Symbol()),n2=Symbol(),n6=(e,t,r=G,n=K)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tp(\"tail.js: \",\"90;3\"))+t);r=null==e?void 0:e[n2];null!=(e=r?e[n1]:e)&&console.log(ec(e)?tp(nL(e),\"94\"):eg(e)?\"\"+e:e),r&&r.forEach(([e,t,r])=>n6(e,t,r,!0)),t&&console.groupEnd()},[n4,n5]=nJ(),[n3,n8]=[r1,r1],n9=!0,[rc,ie]=et(),ii=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:eo(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[ia,il]=et(),[io,iu]=et(),is=e=>iv!==(iv=e)&&il(iv,ih(!0,!0)),id=e=>ic!==(ic=!!e&&\"visible\"===document.visibilityState)&&iu(ic,!e,ip(!0,!0)),iv=(ia(id),!0),ic=!1,ip=te(!1),ih=te(!1),ig=(nc(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>is(!1)),nc(window,[\"pageshow\",\"resume\"],()=>is(!0)),nc(document,\"visibilitychange\",()=>(id(!0),ic&&is(!0))),il(iv,ih(!0,!0)),!1),im=te(!1),[,ib]=et(),iw=tr({callback:()=>ig&&ib(ig=!1,im(!1)),frequency:2e4,once:!0,paused:!0}),E=()=>!ig&&(ib(ig=!0,im(!0)),iw.restart()),iS=(nc(window,[\"focus\",\"scroll\"],E),nc(window,\"blur\",()=>iw.trigger()),nc(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],E),E(),()=>im()),iT=0,ix=void 0,iA=()=>(null!=ix?ix:r1())+\"_\"+iI(),iI=()=>(e7(!0)-(parseInt(ix.slice(0,-2),36)||0)).toString(36)+\"_\"+(++iT).toString(36),i$=new Map,iO={id:ix,heartbeat:e7()},iC={knownTabs:new Map([[ix,iO]]),variables:new Map},[i_,ij]=et(),[iF,iU]=et(),iM=r1,iq=(e,t=e7())=>{e=i$.get(eo(e)?e:rY(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iz=(...e)=>{var t=e7();return iP(tK(e,e=>(e.cache=[t],[rj(e),{...e,created:t,modified:t,version:\"0\"}])))},iR=e=>null!=(e=tK(e,e=>{var t,r;return e&&(t=rY(e[0]),(r=i$.get(t))!==e[1])?[t,e[1],r,e[0]]:tR}))?e:[],iP=e=>{var r,n,e=iR(e);null!=e&&e.length&&(r=e7(),tH(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),ra(i$,e),(n=tG(e,([,,,e])=>0<rG.compare(e.scope,\"tab\"))).length&&iM({type:\"patch\",payload:ri(n)}),iU(tK(e,([,e,t,r])=>[r,e,t]),i$,!0))},[,iB]=(rc((e,t)=>{ia(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),ix=null!=(n=null==r?void 0:r[0])?n:e7(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),i$=new Map(t2(tG(i$,([,e])=>\"view\"===(null==e?void 0:e.scope)),tK(null==r?void 0:r[1],e=>[rY(e),e])))):sessionStorage.setItem(\"_tail:state\",e([ix,tK(i$,([,e])=>e&&\"view\"!==e.scope?e:tR)]))},!0),iM=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([ix,t,r])),localStorage.removeItem(\"_tail:state\"))},nc(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==ix||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||iM({type:\"set\",payload:[tK(iC.knownTabs),tK(iC.variables)]},e):\"set\"===a&&r.active?(iC.knownTabs=new Map(l[0]),iC.variables=new Map(l[1]),i$=new Map(l[1]),r.trigger()):\"patch\"===a?(o=iR(tK(l,([e,t])=>[rQ(e),t])),ra(iC.variables,l),ra(i$,l),iU(tK(o,([,e,t,r])=>[r,e,t]),i$,!1)):\"tab\"===a&&(rr(iC.knownTabs,e,l),l)&&ij(\"tab\",l,!1))});var r=tr(()=>ij(\"ready\",iC,!0),-25),n=tr({callback(){var e=e7()-1e4;tH(iC.knownTabs,([t,r])=>r[0]<e&&rr(iC.knownTabs,t,void 0)),iO.heartbeat=e7(),iM({type:\"tab\",payload:iO})},frequency:5e3,paused:!0});ia(e=>(e=>{iM({type:\"tab\",payload:e?iO:void 0}),e?(r.restart(),iM({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),et()),[iW,iJ]=et(),iL=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?n8:n5)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?n3:n4)([ix,e7()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e7())&&(l(),(null==(d=i())?void 0:d[0])===ix))return 0<t&&(a=setInterval(()=>l(),t/2)),B(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=tu(),[d]=nc(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[to(null!=o?o:t),v],await Promise.race(e.map(e=>eg(e)?e():e)),d()}var e;null==o&&U(\"_tail:rq could not be acquired.\")}})(),iV=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n9;var i,a,l=!1,o=r=>{var o=eg(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iB(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===V,i=e)),!l)&&(a=n?n3(i,!0):JSON.stringify(i))};if(!r)return iL(()=>eP(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?ex(U(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await to(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?n8:JSON.parse)?void 0:l(t):V)&&iJ(l),ex(l)):ex()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&U(\"Beacon send failed.\")},tm=[\"scope\",\"key\",\"entityId\",\"source\"],iK=[...tm,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iG=[...tm,\"value\",\"force\",\"ttl\",\"version\"],iX=new Map,iZ=(e,t)=>{var r=tr(async()=>{var e=tK(iX,([e,t])=>({...rQ(e),result:[...t]}));e.length&&await l.get(e)},3e3),n=(e,t)=>t&&re(iX,e,()=>new Set).add(t),l=(ia((e,t)=>r.toggle(e,e&&3e3<=t),!0),iF(e=>tH(e,([e,t])=>(e=>{var t,r;e&&(t=rY(e),null!=(r=e6(iX,t)))&&r.size&&tH(r,r=>!0===r(e)&&n(t,r))})(t?{status:a.Success,...t}:{status:a.NotFound,...e}))),{get:r=>rB(\"get\",r,async r=>{r[0]&&!eo(r[0])||(o=r[0],r=r.slice(1)),null!=t&&t.validateKey(o);var u=new Map,s=[],d=tK(r,e=>{var t=iq(rY(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))u.set(e,{...e,status:a.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)u.set(e,{status:a.Success,...t});else{if(!rZ(e))return[ro(e,iK),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rj(e),version:\"1\",created:v,modified:v,value:r,cache:[v,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},rn(s,[rj(r),r]),u.set(e,{status:a.Success,...r})):u.set(e,{status:a.NotFound,...rj(e)})}return tR}),v=e7(),o=d.length&&(null==(o=await iV(e,{variables:{get:tK(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=o.variables)?void 0:r.get)||[],f=[];return tH(o,(e,t)=>{var n,r;(null==e?void 0:e.status)===a.NotFound?null!=(r=null==(r=(n=d[t][1]).init)?void 0:r.call(n))&&f.push([n,{...rj(n),value:r}]):u.set(d[t][1],rX(e))}),f.length&&tH(await l.set(tK(f,([,e])=>e)).all(),(e,t)=>u.set(f[t][0],rX(e.status===a.Conflict?{...e,status:a.Success}:e))),s.length&&iP(s),u},{poll:(e,t)=>n(rY(e),t),logCallbackError:(e,t,r)=>ii(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rB(\"set\",r,async r=>{r[0]&&!eo(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,o=[],u=new Map,s=e7(),d=[],v=tK(r,e=>{var i,r,t=iq(rY(e));return rZ(e)?((r=null==(i=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rj(e),created:null!=(r=null==t?void 0:t.created)?r:s,modified:s,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[s,e.ttl]})&&(r.cache=[s,null!=(i=e.ttl)?i:3e3]),u.set(e,r?{status:t?a.Success:a.Created,...r}:{status:a.Success,...rj(e)}),rn(o,[rj(e),r]),tR):e.patch?(d.push(e),tR):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[ro(e,iG),e])}),c=0;!c++||d.length;)tH(await l.get(tK(d,e=>rj(e))).all(),(e,t)=>{var r=d[t];rU(e,!1)?rn(v,[{...r,patch:void 0,value:d[t].patch(null==e?void 0:e.value),version:e.version},r]):u.set(r,e)}),d=[],tH(v.length?z(null==(i=(await iV(e,{variables:{set:tK(v,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=v[t];c<=3&&t.patch&&((null==e?void 0:e.status)===a.Conflict||(null==e?void 0:e.status)===a.NotFound)?rn(d,t):u.set(t,rX(e))});return o.length&&iP(o),u},{logCallbackError:(e,t,r)=>ii(\"Variables.set\",e,{operation:t,error:r})})});return iW(({variables:e})=>{e&&null!=(e=t2(tK(e.get,e=>rF(e)?e:tR),tK(e.set,e=>rU(e)?e:tR)))&&e.length&&iP(tK(e,e=>[rj(e),rU(e)?e:void 0]))}),l},iY=Symbol(),i1=Symbol(),i2=[.75,.33],i6=[.25,.33],i5=e=>tK(t4(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${r_(e)}, ${rZ(e)?\"client-side memory only\":rm(null==(e=e.schema)?void 0:e.usage)})`,K]:tR),i7=(e,t=\"A\"===ni(e)&&r7(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ae=(e,t=ni(e),r=nA(e,\"button\"))=>r!==K&&(q(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&q(nt(e,\"type\"),\"button\",\"submit\")||r===G),at=(e,t=!1)=>{var r;return{tagName:e.tagName,text:th((null==(r=r7(e,\"title\"))?void 0:r.trim())||(null==(r=r7(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?nv(e):void 0}},an=e=>{if(S)return S;eo(e)&&([r,e]=n5(e),e=nJ(r,{decodeJson:!0})[1](e)),eQ(nE,e),(e=>{n8===r1&&([n3,n8]=nJ(e,{json:!e,prettify:!1}),n9=!!e,ie(n3,n8))})(e6(nE,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,m,i=e6(nE,\"key\"),a=null!=(e=null==(r=r2[nE.name])?void 0:r._)?e:[];if(es(a))return l=[],o=[],u=(e,...t)=>{var r=G;o=eJ(o,n=>R(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:S,unsubscribe:()=>r=K}),r},(e=>t=>ii(e,t))(n)))},s=[],v=iZ(nQ,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=iA()),null==e.timestamp&&(e.timestamp=e7()),h=G,tH(l,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===K&&tP(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&U(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eY(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):U(\"Source event not queued.\")},o=e=>{i.set(e,e5(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!eo(r[0])||(a=r[0],r=r.slice(1)),r=tK(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eY(e,{metadata:{posted:!0}}),e[iY]){if(tH(e[iY],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iY]}return eY(rb(e5(e),!0),{timestamp:e.timestamp-e7()})}),n6({[n2]:tK(r,e=>[e,e.type,K])},\"Posting \"+rd([tc(\"new event\",[eL(r,e=>!rw(e))||void 0]),tc(\"event patch\",[eL(r,e=>rw(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),iV(e,{events:r,variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=tK(t0(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e3(l,e),null!=(r=rl(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:tR}),tH(l,e=>n6(e,e.type)),!i)return u(e,!1,a);r?(n.length&&e8(e,...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&e3(n,...e)};return tr(()=>s([],{flush:!0}),5e3),io((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tK(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),null!=t?t:tR}),n.length||e.length)&&s(eF(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r)=>s(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var u=!1,d=()=>{u=!0};return o(e),((e,t)=>{var r;(null!=(r=(w=e)[k=iY])?r:w[k]=new Set).add(t)})(e,o),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))d();else{var a=i.get(e),o=t(a,d),[o,v]=(n6({diff:{snapshot:a,patched:o},stack:Error().stack},\"Patch \"+a.type),null!=(o=e9(o,a))?o:[]);if(o&&!M(v,a))return i.set(e,e5(v)),[l(e,o),u]}return[void 0,u]}),r&&s(e),d}}})(nQ,d),f=null,p=0,g=h=K,m=!1,S=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||eo(e[0]))&&(t=e[0],e=e.slice(1)),eo(e[0])&&(r=e[0],e=eS(r)?JSON.parse(r):n5(r));var t,n=K;if((e=eJ(tX(e,e=>eo(e)?n5(e):e),e=>{if(!e)return K;if(aj(e))nE.tags=eQ({},nE.tags,e.tagAttributes);else{if(aF(e))return nE.disabled=e.disable,K;if(aq(e))return n=G,K;if(aW(e))return e(S),K}return g||aR(e)||aM(e)?G:(s.push(e),K)})).length||n){var r=eG(e,e=>aM(e)?-100:aR(e)?-50:aB(e)?-10:rW(e)?90:0);if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var y=f[p];y&&(d.validateKey(null!=t?t:y.key),R(()=>{var e=f[p];if(u(\"command\",e),h=K,rW(e))c.post(e);else if(az(e))v.get(t0(e.get));else if(aB(e))v.set(t0(e.set));else if(aR(e))e3(o,e.listener);else if(aM(e))(t=R(()=>e.extension.setup(S),t=>ii(e.extension.id,t)))&&(e3(l,[null!=(r=e.priority)?r:100,t,e.extension]),eG(l,([e])=>e));else if(aW(e))e(S);else{var r,n,t,a=K;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:K)break;a||ii(\"invalid-command\",e,\"Loaded extensions:\",tK(l,e=>e[2].id))}},e=>ii(S,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(r2,nE.name,{value:Object.freeze(Object.assign(S,{id:\"tracker_\"+iA(),events:c,variables:v,__isTracker:G})),configurable:!1,writable:!1}),iF((e,t,r)=>{var n=eF(i5(tK(e,([,e])=>e||tR)),[[{[n2]:i5(tK(t,([,e])=>e||tR))},\"All variables\",G]]);n6({[n2]:n},tp(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eL(t)} in total).`,\"2;3\"))}),i_(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:H}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{S(W({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==T?void 0:T.clientId,languages:tK(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return W({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==r2?void 0:r2.screen,r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:r2.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:r2.devicePixelRatio,width:r,height:i,landscape:l}}):{})}));var i,l,a,r})(),e.hasUserAgent=!0),g=!0,s.length&&S(s),n(),m=!0,S(...tK(a$,e=>({extension:e})),...a),S({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),S;U(`The global variable for the tracker \"${nE.name}\" is used for something else than an array of queued commands.`)},ai=()=>null==T?void 0:T.clientId,aa={scope:\"shared\",key:\"referrer\"},al=(e,t)=>{S.variables.set({...aa,value:[ai(),e]}),t&&S.variables.get({scope:aa.scope,key:aa.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},ao=te(),au=te(),as=1,[av,ac]=et(),af=e=>{var t=te(e,ao),r=te(e,au),n=te(e,iS),i=te(e,()=>as);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},ap=af(),[ag,am]=et(),ay=(e,t)=>(t&&tH(aw,t=>e(t,()=>!1)),ag(e)),ab=new WeakSet,aw=document.getElementsByTagName(\"iframe\");function aS(e){if(e){if(null!=e.units&&q(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ax=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),aA=e=>nI(e,t=>t!==e&&!!ax(nh.get(t)),e=>(A=nh.get(e),(A=nh.get(e))&&ej(eF(A.component,A.content,A),\"tags\"))),aI=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&tK(I,e=>({...e,rect:void 0}))},aE=(e,t=K,r)=>{var n,i,a,l=[],o=[],u=0;return r8(e,e=>{var s,a,i=nh.get(e);i&&(ax(i)&&(a=eJ(t0(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==G||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eK(a,e=>null==(e=e.track)?void 0:e.region))&&nv(e)||void 0,s=aA(e),i.content&&e8(l,...tK(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e8(o,...tK(a,e=>{var t;return u=eV(u,null!=(t=e.track)&&t.secondary?1:2),aI({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nx(e,\"area\"))&&e8(o,a)}),l.length&&e3(o,aI({id:\"\",rect:n,content:l})),tH(o,e=>{eo(e)?e3(null!=i?i:i=[],e):(null==e.area&&(e.area=rs(i,\"/\")),e8(null!=a?a:a=[],e))}),a||i?{components:a,area:rs(i,\"/\")}:void 0},aN=Symbol(),a$=[{id:\"context\",setup(e){tr(()=>tH(aw,e=>rt(ab,e)&&am(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==T||!t||null!=T&&T.definition?null!=(n=t)&&t.navigation&&f(!0):(T.definition=t,null!=(t=T.metadata)&&t.posted?e.events.postPatch(T,{definition:n}):n6(T,T.type+\" (definition updated)\")),!0}});var n,t,d=null!=(t=null==(t=iq({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=iq({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&iz({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=iq({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=iq({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=K)=>{var a,l,o,i,p;no(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=tw(location.href+\"\",{requireAuthority:!0}),T={type:\"view\",timestamp:e7(),clientId:iA(),tab:ix,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:np(),duration:ap(void 0,!0)},0===v&&(T.firstTab=G),0===v&&0===d&&(T.landingPage=G),iz({scope:\"tab\",key:\"viewIndex\",value:++d}),l=tk(location.href),tK([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=T).utm)?n:o.utm={})[e]=null==(n=t0(l[\"utm_\"+e]))?void 0:n[0])?e:tR}),!(T.navigationType=x)&&performance&&tH(performance.getEntriesByType(\"navigation\"),e=>{T.redirects=e.redirectCount,T.navigationType=tj(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(t=T.navigationType)?t:T.navigationType=\"navigate\")&&(p=null==(i=iq(aa))?void 0:i.value)&&nZ(document.referrer)&&(T.view=null==p?void 0:p[0],T.relatedEventId=null==p?void 0:p[1],e.variables.set({...aa,value:void 0})),(p=document.referrer||null)&&!nZ(p)&&(T.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tw(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),T.definition=n,n=void 0,e.events.post(T),e.events.registerEventPatchSource(T,()=>({duration:ap()})),ac(T))};return io(e=>{e?(au(G),++as):au(K)}),nc(window,\"popstate\",()=>(x=\"back-forward\",f())),tH([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:t=>a_(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),G),decorate(e){!T||rJ(e)||rw(e)||(e.view=T.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tH(e,e=>{var t,r;return null==(t=(r=e.target)[i1])?void 0:t.call(r,e)})),r=new Set,n=(tr({callback:()=>tH(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=r6.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,m,y,b,w,k,S;l&&(o=eJ(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==G}))&&eL(o)&&(p=f=K,g=h=0,m=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},te(!1,iS),!1,!1,0,0,0,tF()];a[4]=t,a[5]=r,a[6]=n},y=[tF(),tF()],b=af(!1),w=te(!1,iS),k=-1,S=()=>{var $,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],T=S[2]-S[0],S=S[1]-S[3],E=f?i6:i2,r=(E[0]*l<T||E[0]<(T/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nE.impressionThreshold-250)&&(++h,b(f),s||e(s=tK(o,e=>((null==(e=e.track)?void 0:e.impressions)||nA(a,\"impressions\",G,e=>null==(e=e.track)?void 0:e.impressions))&&W({type:\"impression\",pos:nu(a),viewport:np(),timeOffset:ap(),impressions:h,...aE(a,G)})||tR)),null!=s)&&s.length&&($=b(),d=tK(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:$,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:$.activeTime&&c&&n($.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:ew(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:ew(l/u+100*o/l),readTime:ew(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var C=r6.createTreeWalker(a,NodeFilter.SHOW_TEXT),_=0,j=0;for(null==u&&(u=[]);j<v.length&&(F=C.nextNode());){var F,U,M,P,D,z=null!=(U=null==(U=F.textContent)?void 0:U.length)?U:0;for(_+=z;_>=(null==(M=v[j])?void 0:M.offset);)i[j%2?\"setEnd\":\"setStart\"](F,v[j].offset-_+z),j++%2&&({top:M,bottom:P}=i.getBoundingClientRect(),D=t.top,j<3?m(0,M-D,P-D,v[1].readTime):(m(1,u[0][4],M-D,v[2].readTime),m(2,M-D,P-D,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=y[0].push(E,E+T)*y[1].push(r,r+S)/L),u&&tH(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[i1]=({isIntersecting:e})=>{eQ(r,S,e),e||(tH(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{e0(nh,e,e=>{var t;return(e=>null==e?void 0:{...e,component:t0(e.component),content:t0(e.content),tags:t0(e.tags)})(\"add\"in n?{...e,component:eF(null==e?void 0:e.component,n.component),content:eF(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:eF(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,nh.get(e))};return{decorate(e){tH(e.components,t=>{rr(t,\"track\",void 0),tH(e.clickables,e=>rr(e,\"track\",void 0))})},processCommand:e=>aU(e)?(n(e),G):aD(e)?(tH(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=r7(i,e);){((e,t)=>e instanceof Set||e instanceof WeakSet?e.has(t)||e.add(t):eZ(e,t)||eX(e,t,!0))(n,i);var l,o=t_(r7(i,e),\"|\");r7(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=eu(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch(e){}0<=s&&t[s]&&(d=t[s]),e3(a,d)}}}e3(r,...tK(a,e=>({add:G,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),G):K}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{nc(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=K;if(r8(n.target,e=>{ae(e)&&null==l&&(l=e),s=s||\"NAV\"===ni(e);var t,d=ng(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tH(e.querySelectorAll(\"a,button\"),t=>ae(t)&&(3<(null!=u?u:u=[]).length?ex():u.push({...at(t,!0),component:r8(t,(e,t,r,n=null==(i=ng(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=nA(e,\"clicks\",G,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eK(d,e=>(null==(e=e.track)?void 0:e.clicks)!==K)),null==a&&(a=null!=(t=nA(e,\"region\",G,e=>null==(e=e.track)?void 0:e.region))?t:d&&eK(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=aE(null!=l?l:o,!1,v),f=nI(null!=l?l:o,void 0,e=>tG(t0(null==(e=nh.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?G:a)?{pos:nu(l,n),viewport:np()}:null,...((e,t)=>{var n;return r8(null!=e?e:t,e=>\"IMG\"===ni(e)||e===t?(n={element:at(e,!1)},K):G),n})(n.target,null!=l?l:o),...c,timeOffset:ap(),...f});if(l)if(i7(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=tw(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(W({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,T,w=W({clientId:iA(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:G,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r7(h,\"target\")!==window.name?(al(w.clientId),w.self=K,e(w)):no(location.href,h.href)||(w.exit=w.external,al(w.clientId))):(k=h.href,(b=nZ(k))?al(w.clientId,()=>e(w)):(T=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nE.captureContextMenu&&(h.href=n0+\"=\"+T+encodeURIComponent(k),nc(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===T&&e(w),r())),nc(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{r8(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>eo(e=null==e||e!==G&&\"\"!==e?e:\"add\")&&q(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ec(e)?e:void 0)(null!=(r=null==(r=ng(e))?void 0:r.cart)?r:nx(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?V:es(e)||eo(e)?e[e.length-1]:ez(e,(e,r)=>e,void 0,void 0))(null==(r=ng(e))?void 0:r.content))&&t(d)});c=aS(d);(c||i)&&e(W(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&e0(t,o,r=>{var i=ns(o,n);return r?e3(r,i):(i=W({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),ay(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=nl(G);av(()=>{return e=()=>(t={},r=nl(G)),setTimeout(e,250);var e}),nc(window,\"scroll\",()=>{var a,n=nl(),i={x:(u=nl(K)).x/(r4.offsetWidth-window.innerWidth)||0,y:u.y/(r4.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=G,e3(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=G,e3(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=G,e3(a,\"page-end\")),(n=tK(a,e=>W({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return aC(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=aS(r))&&e({...r,type:\"cart_updated\"}),G):aP(t)?(e({type:\"order\",...t.order}),G):K}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||ne(e,nm(\"form-value\")),e=(t&&(r=r?ei(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&th(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=ne(a,nm(\"ref\"))||\"track_ref\",(s=re(r,a,()=>{var t,r=new Map,n={type:\"form\",name:ne(a,nm(\"form-name\"))||r7(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},l=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ap()})),()=>{1!==t[3]&&(o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&nv(a).width)),e.events.postPatch(n,{...i,completed:n.completed,totalTime:e7(G)-t[4]}),t[3]=1)}),s=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),en(i)?i&&(a<0?ea:L)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})();return nc(a.ownerDocument.body,\"submit\",e=>{var r,n;i=aE(a),t[3]=3,e.defaultPrevented?([r]=ia(e=>{e||(n?n6(\"The browser is navigating to another page after submit leaving a reCAPTCHA challenge. \"+tp(\"Form not submitted\",1)):3===t[3]?(n6(\"The browser is navigating to another page after submit. \"+tp(\"Form submitted\",1)),l()):n6(\"The browser is navigating to another page after submit, but submit was earlier cancelled because of validation errors. \"+tp(\"Form not submitted.\",1)),r())}),n=!1,s(()=>{if((()=>{for(var e=a.ownerDocument;e;){if(((e,t)=>!0===tH(e,(r,n,i)=>t(r)?tz=!0:r))(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||nv(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=R(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1})())return t[3]=2,n6(\"reCAPTCHA challenge is active.\"),n=!0;n&&(n=!1,n6(\"reCAPTCHA challenge ended (for better or worse).\"),t[3]=3),a.isConnected&&0<nv(a).width?(t[3]=2,n6(\"Form is still visible after 1750 ms, validation errors assumed. \"+tp(\"Form not submitted\",1))):(n6(\"Form is no longer visible 1750 ms after submit. \"+tp(\"Form submitted\",1)),l()),r()},1750)):(n6(\"Submit event triggered and default not prevented. \"+tp(\"Form submitted\",1)),l())},{capture:!1}),t=[n,r,a,0,e7(G),1]}))[1].get(t)||tH(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var d,v,a;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:tj(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[aN]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!nA(e,\"ref\")||(e.value||(e.value=tj(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value))}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=au())),v=-(s-(s=e7(G))),c=i[aN],(i[aN]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=G,o[3]=2,tH(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&nc(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e7(G),u=au()):o()));d(document),ay(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||ry.equals(r,t)?[!1,r]:(await e.events.post(W({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=r2.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tK(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"direct\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,t,s,d;return aJ(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(d=l.key,(null!=(t=a[d])?t:a[d]=tr({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e,t,r;r6.hasFocus()&&(e=l.poll(s))&&!ry.equals(s,e)&&([t,r]=await i(e),t&&n6(r,\"Consent was updated from \"+d),s=e)}).trigger()),G):K}}}}],E=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),aC=E(\"cart\"),a_=E(\"username\"),aj=E(\"tagAttributes\"),aF=E(\"disable\"),aU=E(\"boundary\"),aM=E(\"extension\"),aq=E(G,\"flush\"),az=E(\"get\"),aR=E(\"listener\"),aP=E(\"order\"),aD=E(\"scan\"),aB=E(\"set\"),aW=e=>\"function\"==typeof e,aJ=E(\"consent\");Object.defineProperty(r2,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(an)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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
            let { host, crypto, encryptionKeys, schemas, storage, environment, sessionTimeout } = this._config;
            try {
                var _this_environment_storage_initialize, _this_environment_storage;
                var _storage, _storage1, _storage2, _ref, _session, _storage3, _ref1, _device;
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
                (_ = (_ref = (_ttl = (_storage2 = storage).ttl) !== null && _ttl !== void 0 ? _ttl : _storage2.ttl = {})[_session = "session"]) !== null && _ !== void 0 ? _ : _ref[_session] = sessionTimeout * 1000;
                var _ttl1, _1;
                (_1 = (_ref1 = (_ttl1 = (_storage3 = storage).ttl) !== null && _ttl1 !== void 0 ? _ttl1 : _storage3.ttl = {})[_device = "device"]) !== null && _1 !== void 0 ? _1 : _ref1[_device] = 10 * 1000; // 10 seconds is enough to sort out race conditions.
                this.environment = new TrackerEnvironment(host, crypto !== null && crypto !== void 0 ? crypto : new DefaultCryptoProvider(encryptionKeys), new VariableStorageCoordinator({
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
                        })) !== null && _ref2 !== void 0 ? _ref2 : undefined;
                    } else {
                        var _ref3;
                        this._script = (_ref3 = await this.environment.readText("js/tail.debug.map.js")) !== null && _ref3 !== void 0 ? _ref3 : scripts.debug;
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
                var _tracker__getConsentStateForSession;
                const { trustedContext, consent } = (_tracker__getConsentStateForSession = tracker._getConsentStateForSession(ev.session)) !== null && _tracker__getConsentStateForSession !== void 0 ? _tracker__getConsentStateForSession : tracker;
                ev = eventType.validate(ev, undefined, {
                    trusted: trustedContext
                });
                var _eventType_censor;
                return (_eventType_censor = eventType.censor(ev, {
                    trusted: trustedContext,
                    consent: consent
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
                const cookieValue = (_this_cookies_cookieName = this.cookies[cookieName]) === null || _this_cookies_cookieName === void 0 ? void 0 : _this_cookies_cookieName.value;
                if (cookieName && cookieValue) {
                    var _this_cookies_cookieName1;
                    const decrypted = this._decryptCookie((_this_cookies_cookieName1 = this.cookies[cookieName]) === null || _this_cookies_cookieName1 === void 0 ? void 0 : _this_cookies_cookieName1.value, ` ${purposeName} device variables`);
                    if (!decrypted) {
                        // Deserialization error. Remove the cookie.
                        this.cookies[cookieName] = {};
                    }
                    forEach2(decrypted, (value)=>{
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
                }
            });
        }
        return this._clientDeviceCache.variables;
    }
    getRequestItems(source) {
        return get2(this._requestItems, source, ()=>new Map());
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
    async dispose() {
        for (const purgeOperation of this._purgeOperations){
            await purgeOperation();
        }
    }
    async updateConsent({ purposes, classification }) {
        if (!this._session) return;
        purposes = DataPurposes.parse(purposes);
        classification = DataClassification.parse(classification);
        purposes !== null && purposes !== void 0 ? purposes : purposes = this.consent.purposes;
        classification !== null && classification !== void 0 ? classification : classification = this.consent.classification;
        if (DataClassification.compare(classification !== null && classification !== void 0 ? classification : this.consent.classification, this.consent.classification) < 0 || some2(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]))) {
            // Capture these variables for lambda.
            const sessionId = this.sessionId;
            const deviceId = this.deviceId;
            const expiredPurposes = obj(this.consent.purposes, ([key])=>!(purposes === null || purposes === void 0 ? void 0 : purposes[key]) ? [
                    key,
                    true
                ] : undefined);
            // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
            this._purgeOperations.push(async ()=>await this.env.storage.purge([
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
                }));
        }
        let previousLevel = this._consent.classification;
        const previousConsent = this._consent;
        this._consent = {
            classification,
            purposes
        };
        if (classification === "anonymous" !== (previousLevel === "anonymous")) {
            // We switched from cookie-less to cookies or vice versa.
            // Refresh scope infos and anonymous session pointer.
            await this._ensureSession(now(), {
                previousConsent,
                refreshState: true
            });
        }
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
    async _ensureSession(timestamp = now(), { deviceId, deviceSessionId = this.deviceSessionId, passive = false, resetSession = false, resetDevice = false, refreshState = false, previousConsent } = {}) {
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
        const snapshot = this._snapshot(previousConsent);
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
                    this._purgeOperations.push(async ()=>{
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
                _this__session1, _this__session2, _this__session3, _this__session4, _this__session5, _snapshot_device, _this__device;
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
                if (this.sessionId !== identifiedSessionId) {
                    this._session = await this.env.storage.get({
                        scope: "session",
                        key: SCOPE_INFO_KEY,
                        entityId: identifiedSessionId,
                        init: async ()=>{
                            // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
                            // This means clients must make sure the initial request to the endpoint completes before more are sent (or at least do a fair effort).
                            // Additionally, analytics processing should be aware of empty sessions, and decide what to do with them (probably filter them out).
                            const data = createInitialScopeData(identifiedSessionId, timestamp, {
                                anonymous: false,
                                // Initialize device ID here to keep it in the session.
                                deviceId: deviceId !== null && deviceId !== void 0 ? deviceId : await this.env.nextId("device"),
                                deviceSessionId: deviceSessionId !== null && deviceSessionId !== void 0 ? deviceSessionId : await this.env.nextId("device-session"),
                                anonymousSessionId
                            });
                            return data;
                        }
                    }, {
                        trusted: true
                    });
                }
                deviceId = (_this__session2 = this._session) === null || _this__session2 === void 0 ? void 0 : _this__session2.value.deviceId;
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
                    const anonymousSessionReferenceId = this._anonymousSessionReferenceId;
                    this._purgeOperations.push(async ()=>{
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
                    });
                }
                this.cookies[this._requestHandler._cookieNames.session] = {
                    httpOnly: true,
                    sameSitePolicy: "None",
                    essential: true,
                    value: this._encryptCookie({
                        id: identifiedSessionId
                    })
                };
                if (this._session && ((snapshot === null || snapshot === void 0 ? void 0 : snapshot.session.id) !== ((_this__session4 = this._session) === null || _this__session4 === void 0 ? void 0 : _this__session4.value.id) || (snapshot === null || snapshot === void 0 ? void 0 : snapshot.session.deviceId) !== ((_this__session5 = this._session) === null || _this__session5 === void 0 ? void 0 : _this__session5.value.deviceId) || (snapshot === null || snapshot === void 0 ? void 0 : (_snapshot_device = snapshot.device) === null || _snapshot_device === void 0 ? void 0 : _snapshot_device.id) !== ((_this__device = this._device) === null || _this__device === void 0 ? void 0 : _this__device.value.id))) {
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
                consent: DataUsage.clone(this.consent)
            });
        }
    }
    /** @internal */ _getConsentStateForSession(session) {
        var _this__previousSessions;
        if (!(session === null || session === void 0 ? void 0 : session.sessionId)) return undefined;
        if (session.sessionId === this.sessionId) {
            return {
                trustedContext: this.trustedContext,
                consent: DataUsage.clone(this.consent)
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
            // Keep session alive in a fire and forget like fashion.
            if (this.sessionId) {
                (async ()=>{
                    try {
                        this.env.storage.renew([
                            {
                                scope: "session",
                                entityIds: truish2([
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
                    [CONSENT_INFO_KEY]: ()=>DataUsage.clone(this.consent)
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
        _define_property$8(this, "_previousSessions", void 0);
        _define_property$8(this, "_consent", {
            classification: "anonymous",
            purposes: {}
        });
        /**
   * Operations related to purging sessions or session/device data (consent changes etc.).
   *
   * These must be executed before the request ends, but _after_ tracker extensions' `post` methods,
   * since these extensions may rely on data in the "leaving" sessions,
   * e.g. the RavenDB extension map session IDs to sequential numbers based on a session variable.
   */ _define_property$8(this, "_purgeOperations", []);
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
        this._requestItems = new Map();
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
    },
    environment: {
        idLength: 12
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
    constructor(host, crypto, storage, { idLength = 12, tags, uidGenerator } = {}){
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
            ...map2(this._headers, (header)=>request.headers[header] + "" || skip2)
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
        let [cursorScopeIndex = 0, cursorEntityId = -1, cursorVariableId = -1] = (_map2 = map2(cursor === null || cursor === void 0 ? void 0 : cursor.split("."), (value)=>+value || 0)) !== null && _map2 !== void 0 ? _map2 : [];
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
                    var _query_keys;
                    if ((queryEntityIds === null || queryEntityIds === void 0 ? void 0 : queryEntityIds.has(entityId)) === false) continue;
                    const keyFilter = distinct2((_query_keys = query.keys) === null || _query_keys === void 0 ? void 0 : _query_keys.values);
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
            ] : query === null || query === void 0 ? void 0 : query.scopes, keys2(this._mappings))){
                var _this__mappings_scope;
                for (const source of filterKeys(query === null || query === void 0 ? void 0 : query.sources, keys2((_this__mappings_scope = this._mappings[scope]) !== null && _this__mappings_scope !== void 0 ? _this__mappings_scope : [
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
        await forEachAwait2(this._mappings, ([, mappings])=>forEachAwait2(mappings, ([, { storage }])=>{
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
            forEach2(scopeMappings.prefixes, ([prefix, config])=>{
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
            throwError(`An entity ID for ${target.scope} scope is required in this context.`);
        }
        return target;
    }
    const expectedId = context.scope[target.scope + "Id"];
    if (expectedId == undefined) {
        throwError(`No ID is available for ${target.scope} scope in the current session.`);
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
            const contextScopes = context.scope;
            if (contextScopes != null && query.scope !== "global") {
                const scopeEntityId = contextScopes[query.scope + "Id"];
                if (scopeEntityId != null) {
                    var _query_entityIds;
                    const invalidEntityIds = query === null || query === void 0 ? void 0 : (_query_entityIds = query.entityIds) === null || _query_entityIds === void 0 ? void 0 : _query_entityIds.filter((entityId)=>entityId !== scopeEntityId);
                    if (invalidEntityIds === null || invalidEntityIds === void 0 ? void 0 : invalidEntityIds.length) {
                        throwError(`The entity IDs ${itemize2(invalidEntityIds)} are not allowed in ${query.scope} scope.`);
                    }
                    query.entityIds = [
                        scopeEntityId
                    ];
                } else {
                    throwError(`No ID is available for ${query.scope} scope in the current session.`);
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
            const { scope, entityIds, keys, ifModifiedSince } = query;
            var _keys_not;
            const keyArray = array2((_keys_not = keys === null || keys === void 0 ? void 0 : keys.not) !== null && _keys_not !== void 0 ? _keys_not : keys);
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
        filters = truish2(filters);
        if ((!bulk || !context.trusted) && some2(filters, (filter)=>!filter.entityIds)) {
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
            throwError("A type resolver is required.");
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

export { CookieMonster, DEFAULT, DefaultClientIdGenerator, DefaultCryptoProvider, EventLogger, InMemoryStorage, MAX_CACHE_HEADERS, PostError, RequestHandler, SCRIPT_CACHE_HEADERS, SchemaBuilder, Tracker, TrackerEnvironment, VariableSplitStorage, VariableStorageCoordinator, addSourceTrace, bootstrap, clearTrace, copyTrace, detectPfx, getDefaultLogSourceName, getErrorMessage, getTrace, isTransientErrorObject, isValidationError, isWritableStorage, requestCookieHeader, requestCookies, serializeLogMessage, withTrace };

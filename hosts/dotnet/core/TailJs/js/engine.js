import { isConsentEvent, isResetEvent, isUserAgentEvent, isViewEvent, isSignInEvent, isSignOutEvent, DataUsage, isTrackedEvent, isOrderEvent, isCartEvent, TypeResolver, isPassiveEvent, JsonSchemaAdapter, CORE_SCHEMA_NS, DataPurposes, ValidationError, DataClassification, consumeQueryResults, toVariableResultPromise, VariableResultStatus, isVariableResult, extractKey, filterKeys, VariableServerScope, formatVariableResult, VALIDATION_ERROR_SYMBOL, formatValidationErrors, formatVariableKey, isTransientError, isSuccessResult, filterRangeValue } from '@tailjs/types';
import { defaultTransport, hash, createTransport, httpEncode, from64u, decodeUtf8, defaultJsonTransport, httpDecode } from '@tailjs/transport';

const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";
const INIT_SCRIPT_QUERY = "init";
const CLIENT_SCRIPT_QUERY = "opt";
const EVENT_HUB_QUERY = "var";
const CONTEXT_NAV_QUERY = "mnt";
const SCHEMA_QUERY = "$types";
const BUILD_REVISION_QUERY = "rev=" + "m72i7ii9" ;
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
const isObject = /*@__PURE__*/ (value)=>value && typeof value === "object";
const isPlainObject = /*@__PURE__*/ (value)=>(value === null || value === void 0 ? void 0 : value.constructor) === Object;
const isFunction = /*@__PURE__*/ (value)=>typeof value === "function";
const isPromiseLike = /*@__PURE__*/ (value)=>!!(value === null || value === void 0 ? void 0 : value["then"]);
const isIterable = /*@__PURE__*/ (value, acceptStrings = false)=>!!((value === null || value === void 0 ? void 0 : value[symbolIterator$1]) && (typeof value !== "string" || acceptStrings));
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
        text: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,y,b,w,k,S,x,T,I;function C(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var U=(e,t=e=>Error(e))=>{throw el(e=e5(e))?t(e):e},M=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ec(e)&&ec(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!M(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},F=(e,t,...r)=>e===t||0<r.length&&r.some(t=>F(e,t)),q=(e,t)=>null!=e?e:U(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),z=(e,t=!0,r)=>{try{return e()}catch(e){return eh(t)?es(e=t(e))?U(e):e:er(t)?console.error(t?U(e):e):t}finally{null!=r&&r()}};class R extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),C(this,\"_action\",void 0),C(this,\"_result\",void 0),this._action=e}}var P=e=>new R(async()=>e5(e)),D=async(e,t=!0,r)=>{try{return await e5(e)}catch(e){if(!er(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},B=e=>e,W=e=>!!e,J=e=>e===H,L=void 0,V=Number.MAX_SAFE_INTEGER,K=!1,H=!0,G=()=>{},X=e=>e,Z=e=>null!=e,Y=Symbol.iterator,Q=Symbol.asyncIterator,ee=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:L,et=(e,t)=>eh(t)?e!==L?t(e):L:(null==e?void 0:e[t])!==L?e:L,er=e=>\"boolean\"==typeof e,en=ee(er,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),ei=e=>e!==K,ea=e=>\"number\"==typeof e,el=e=>\"string\"==typeof e,eo=ee(el,e=>null==e?void 0:e.toString()),eu=Array.isArray,es=e=>e instanceof Error,ed=(e,t=!1)=>null==e?L:!t&&eu(e)?e:eg(e)?[...e]:[e],ev=e=>e&&\"object\"==typeof e,ec=e=>(null==e?void 0:e.constructor)===Object,ef=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ep=e=>\"symbol\"==typeof e,eh=e=>\"function\"==typeof e,eg=(e,t=!1)=>!(null==e||!e[Y]||\"string\"==typeof e&&!t),ey=e=>e instanceof Map,em=e=>e instanceof Set,eb=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ew=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ek=e=>el(e)&&(ew(e,\"{\",\"}\")||ew(e,\"[\",\"]\")),eS=!1,ex=e=>(eS=!0,e),eT=e=>null==e?L:eh(e)?e:t=>t[e],eI=(e,t,r)=>(null!=t?t:r)!==L?(e=eT(e),null==t&&(t=0),null==r&&(r=V),(n,i)=>t--?L:r--?e?e(n,i):n:r):e,eA=e=>null==e?void 0:e.filter(Z),eE=(e,t,r,n)=>null==e?[]:!t&&eu(e)?eA(e):e[Y]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),eS){eS=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===L?t:eI(t,r,n)):ev(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),eS){eS=!1;break}}}(e,eI(t,r,n)):eE(eh(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eN=(e,t,r,n)=>eE(e,t,r,n),eO=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Y]||n&&ev(t))for(var a of i?eE(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eE(e,t,i,a),r+1,n,!1),e$=(e,t,r,n)=>{if(t=eT(t),eu(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!eS;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return eS=!1,a}return null!=e?tX(eN(e,t,r,n)):L},e_=(e,t,r,n)=>null!=e?new Set([...eN(e,t,r,n)]):L,ej=(e,t,r=1,n=!1,i,a)=>tX(eO(e,t,r,n,i,a)),eC=(...e)=>{var t;return ez(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...tX(e))),t},eU=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,eS)){eS=!1;break}return i},eM=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,eS)){eS=!1;break}return r},eF=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,eS){eS=!1;break}return r},eq=(e,t,r,n)=>{var i;if(null!=e){if(eu(e))return eU(e,t,r,n);if(r===L){if(e[Y])return eM(e,t);if(\"object\"==typeof e)return eF(e,t)}for(var a of eE(e,t,r,n))null!=a&&(i=a);return i}},ez=eq,eR=async(e,t,r,n)=>{var i,a;if(null==e)return L;for(a of eN(e,t,r,n))if(null!=(a=await a)&&(i=a),eS){eS=!1;break}return i},eP=(e,t)=>{if(null==e)return L;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eD=(e,t,r)=>{var n,i,a;return null==e?L:er(t)||r?(a={},ez(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>ez(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eP(e$(e,t?(e,r)=>et(t(e,r),1):e=>et(e,1)))},eB=(e,t,r,n,i)=>{var l=()=>eh(r)?r():r;return null!=(e=eq(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eW=(e,t,r,n)=>e$(e,(e,r)=>e&&null!=t&&t(e,r)?e:L,r,n),eL=(e,...t)=>null==e?L:ea(e)?Math.max(e,...t):eB(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ea(i)&&e<i?i:e,L,t[2],t[3]),eK=(e,t,r,n)=>{var i;return null==e?L:ec(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:W))?i:eq(e,t?(e,r)=>!!t(e,r)&&ex(!0):()=>ex(!0),r,n))&&i},eH=(e,t=e=>e)=>{var r;return null!=(r=ed(e))&&r.sort((e,r)=>t(e)-t(r)),e},eG=(e,t,r)=>(e.constructor===Object||eu(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eX=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=eh(r)?r():r)&&eG(e,t,n),n},eZ=(e,...t)=>(ez(t,t=>ez(t,([t,r])=>{null!=r&&(ec(e[t])&&ec(r)?eZ(e[t],r):e[t]=r)})),e),eY=(e,t,r,n)=>{if(e)return null!=r?eG(e,t,r,n):(ez(t,t=>eu(t)?eG(e,t[0],t[1]):ez(t,([t,r])=>eG(e,t,r))),e)},eQ=(e,t,r)=>{var n;return ef(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ef(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ec(e)&&delete e[t],e},e1=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eX(e,t),ef(e,\"delete\")?e.delete(t):delete e[t],r},e2=(e,t)=>{if(e)return eu(t)?(eu(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e2(e,t)):eu(e)?t<e.length?e.splice(t,1)[0]:void 0:e1(e,t)},e5=e=>eh(e)?e():e,e3=(e,t=-1)=>eu(e)?t?e.map(e=>e3(e,t-1)):[...e]:ec(e)?t?eD(e,([e,r])=>[e,e3(r,t-1)]):{...e}:em(e)?new Set(t?e$(e,e=>e3(e,t-1)):e):ey(e)?new Map(t?e$(e,e=>[e[0],e3(e[1],t-1)]):e):e,e6=(e,...t)=>null==e?void 0:e.push(...t),e4=(e,...t)=>null==e?void 0:e.unshift(...t),e8=(e,t)=>{var r,i,a;if(e)return ec(t)?(a={},ec(e)&&(ez(e,([e,l])=>{if(!M(l,t[e],-1)){if(ec(r=l)){if(!(l=e8(l,t[e])))return;[l,r]=l}else ea(l)&&ea(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e3(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e9=\"undefined\"!=typeof performance?(e=H)=>e?Math.trunc(e9(K)):performance.timeOrigin+performance.now():Date.now,e7=(e=!0,t=()=>e9())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t=0)=>{var e=eh(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=to(!0).resolve(),c=e7(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((m.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await D(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&y(!1),!(m.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{m.active&&p(),m.active&&h()},y=(e,t=!e)=>(c(e,t),clearTimeout(d),m.active=!!(d=e?h():0),m),m={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,y(!0,!0)),toggle:(e,t)=>e!==m.active?e?t?(y(!0),m.trigger(),m):y(!0):y(!1):m,trigger:async e=>await p(e)&&(y(m.active),!0)};return m.toggle(!a,l)};function tr(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tn{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ti,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tr(this,\"_promise\",void 0),this.reset()}}class ti{then(e,t){return this._promise.then(e,t)}constructor(){var e;tr(this,\"_promise\",void 0),tr(this,\"resolve\",void 0),tr(this,\"reject\",void 0),tr(this,\"value\",void 0),tr(this,\"error\",void 0),tr(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?e5(t):new Promise(r=>setTimeout(async()=>r(await e5(t)),e)):U(`Invalid delay ${e}.`),to=e=>new(e?tn:ti),ts=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},ee=()=>{var e,t=new Set;return[(r,n)=>{var i=ts(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tv=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tf=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?L:null!=n[t]?t:r?U(`The ${e} \"${t}\" is not defined.`):L,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:+(t<e)},...u}}),i},tp=Symbol(),th=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(el(t)?t=[t]:eu(t))&&tW(t,e=>1<(i=l[1].split(e)).length?tF(i):L)||(l[1]?[l[1]]:[]),l):L},tg=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?L:tk(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&L,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):L,path:v,query:!1===t?c:c?ty(c,{...n,delimiters:t}):L,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":L),e}),ty=(e,t)=>tm(e,\"&\",t),tm=(e,t,{delimiters:r=!0,...n}={})=>{e=tJ(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=th(e,{...n,delimiters:!1===r?[]:!0===r?L:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tM}),t=re(tK(e,!1),([e,t])=>[e,!1!==r?1<t.length?tY(t):t[0]:t.join(\",\")]);return t&&(t[tp]=e),t},tb=(e,t)=>t&&null!=e?t.test(e):L,tw=(e,t,r)=>tk(e,t,r,!0),tk=(e,t,i,a=!1)=>null==(null!=e?e:t)?L:i?(r=L,a?(n=[],tk(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:L,tS=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tx=/\\z./g,tT=(e,t)=>(t=ra(e_(eW(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tx,tI={},tA=e=>e instanceof RegExp,tE=(r,n=[\",\",\" \"])=>{var i;return tA(r)?r:eu(r)?tT(e$(r,e=>null==(e=tE(e,n))?void 0:e.source)):er(r)?r?/./g:tx:el(r)?null!=(i=(e=tI)[t=r])?i:e[t]=tk(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tT(e$(tN(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${ra(n,tS)}]`)),e=>e&&`^${ra(tN(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tS(tO(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L},tN=(e,t,r=!0)=>null==e?L:r?tN(e,t,!1).filter(X):e.split(t),tO=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,t$=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eY(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},t_=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},tj=(e,t)=>{if(!e||t_(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=tj(r.contentWindow,t))return e}catch{}},tC=e=>null==e?e:globalThis.window?tj(window,t_(e)):globalThis,tU=!1,tM=Symbol(),tF=e=>(tU=!0,e),tq=Symbol(),tz=Symbol(),tR=Symbol.iterator,tP=(e,t,r)=>{if(null==e||e[tq])throw t;e=tC(e);if(!e)throw t;var l,i=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tM){if(a===tF)break;if(n=a,r&&r.push(a),tU){tU=!1;break}}return r||n},a=(e.Array.prototype[tq]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tM){if(l===tF)break;if(n=l,r&&r.push(l),tU){tU=!1;break}}return r||n},i());for(l of(e.Object.prototype[tq]=(e,t,r,n,l)=>{if(e[tR])return(e.constructor===Object?a:Object.getPrototypeOf(e)[tq]=i())(e,t,r,n,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=t?t(u,s++,n,l):u)!==tM){if(u===tF)break;if(n=u,r&&r.push(u),tU){tU=!1;break}}return r||n},e.Object.prototype[tz]=function(){var t,e;return this[tR]||this[Q]?this.constructor===Object?null!=(e=this[Q]())?e:this[tR]():((e=Object.getPrototypeOf(this))[tz]=null!=(t=e[Q])?t:e[tR],this[tz]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))l[tq]=i(),l[tz]=l[tR];return e.Number.prototype[tq]=(e,t,r,n,i)=>a(tD(e),t,r,n,i),e.Number.prototype[tz]=tD,e.Function.prototype[tq]=(e,t,r,n,i)=>a(tB(e),t,r,n,i),e.Function.prototype[tz]=tB,r()};function*tD(e=this){for(var t=0;t<e;t++)yield t}function*tB(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tW=(e,t,r,n)=>{try{return e?e[tq](e,t,void 0,r,n):null==e?e:void 0}catch(i){return tP(e,i,()=>tW(e,t,r,n))}},tJ=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[tq](e,t,r,n,i):null==e?e:void 0}catch(a){return tP(e,a,()=>tJ(e,t,r,n,i))}},tL=(e,t=!0,r=!1)=>tJ(e,!0===t?e=>null!=e?e:tM:t?t.has?e=>null==e||t.has(e)===r?tM:e:(e,n,i)=>!t(e,n,i)===r?e:tM:e=>e||tM),tV=(e,t,r=-1,n=[],i,a=e)=>tJ(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tV(e,void 0,r-1,n,e),tM):e,n,i,a),tK=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tW(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t4(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tG=e=>void 0===e?[]:null!=e&&e[tR]&&\"string\"!=typeof e?e:[e],tX=e=>null==e||eu(e)?e:e[tR]&&\"string\"!=typeof e?[...e]:[e],tY=(e,...t)=>{var r,n;for(n of e=!t.length&&eg(e)?e:[e,...t])if(null!=n){if(eg(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},tQ=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),t0=(e,t,r)=>tX(e).sort(\"function\"==typeof t?(e,n)=>tQ(t(e),t(n),r):eu(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=tQ(t[a](e),t[a](n),r);return i}:(e,t)=>tQ(e,t,r):(e,r)=>tQ(e,r,t)),t1=Object.keys,t2=Symbol(),t5=Symbol(),t3=Symbol(),t6=(e,t,r)=>{if(null==e||e[t5])throw t;var i,e=tC(e);if(!e||e.Object.prototype[t2])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[t2]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[t5]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[t2]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[t5]=i.has,i[t3]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[t3]=function(e){return this.push(...e),this},[e.Object,e.Array]))i[t2]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[t5]=function(e){return this[e]};return r()},t4=(e,t,r)=>{try{if(null==e)return e;var n=e[t5](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t2](t,r));e[t2](t,n)}return n}catch(n){return t6(e,n,()=>t4(e,t,r))}},t8=(e,t,r)=>{try{return!0===(null==e?void 0:e[t2](t,r,!0))}catch(n){return t6(e,n,()=>t8(e,t,r))}},t9=(e,t,r)=>{try{return e[t2](t,r),r}catch(n){return t6(e,n,()=>t9(e,t,r))}},t7=(e,...t)=>{try{return null==e?e:e[t3](t)}catch(r){return t6(e,r,()=>t7(e,...t))}},re=(e,t)=>{var r={};return tW(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tM&&e!==tF)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tM&&e!==tF)?r[e[0]]=e[1]:e),r},rt=(e,...t)=>{try{return(null==e?void 0:e.constructor)===Object?tW(t,t=>tW(t,t=>t&&(e[t[0]]=t[1]))):tW(t,t=>tW(t,t=>t&&e[t2](t[0],t[1]))),e}catch(r){return t6(e,r,()=>rt(e,...t))}},rr=(e,t,r={})=>{if(null!=e){var l,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(l of tG(t))tW(l,t=>{var o,u;t&&([t,o]=t,u=e[t],(a?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?rr(u,o,r):i&&(e[t]=o))})}return e},rn=(e,t)=>null==e?e:re(t,t=>null!=e[t]||t in e?[t,e[t]]:tM),ri=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),ra=(e,t,r)=>null==e?e:eg(e)?tL(\"function\"==typeof t?tJ(e,t):(r=t,e),ri,!0).join(null!=r?r:\"\"):ri(e)?\"\":e.toString(),rl=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?rl(tJ(e,t),r,n):(i=[],n=tW(e,(e,t,r)=>ri(e)?tM:(r&&i.push(r),e.toString())),[t,o]=eu(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},ro=tf(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),ru=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rs=re(ru,e=>[e,e]),rd=(Object.freeze(eP(ru.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),rv=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rc={names:ru,parse(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),el(e)&&(e=e.split(\",\")),eu(e)){var i,n={};for(i of e)rs[i]?\"necessary\"!==i&&(n[i]=!0):r&&U(`The purpose name '${i}' is not defined.`);e=n}return t?(t=t1(e)).length?t:[\"necessary\"]:e},getNames:e=>tJ(e,([e,t])=>t?e:tM),get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rd(i,n))&&!t[rd(i,n)])return!1;if(e=rv(e,n),t=rv(t,n),r){for(var a in t)if(rs[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(rs[a]&&e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(rs[a]&&e[a]){if(t[a])return!0;l=!0}return!l}},rf=(tf(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${rl(rc.parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),rp={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rc.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rc.parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=ro.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rc.parse(a,{validate:!1}))?e:{}}):t?rp.clone(t):{classification:\"anonymous\",purposes:{}}}},rh=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),ry=Symbol(),rm=e=>void 0===e?\"undefined\":tv(JSON.stringify(e),40,!0),rb=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rw=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rk=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rS=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rx=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rT=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rm(t)+` ${r}.`}),ry),rI=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rI((t?parseInt:parseFloat)(e),t,!1),rA={},ru=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=rA[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:rA[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rT(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rb.test(e)&&!isNaN(+new Date(e))?e:rT(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rI(e,!1,!1)){if(!rI(e,!0,!1))return rT(n,e,\"is not a valid UNIX timestamp\");e*=1}else if(!rw.test(e)||isNaN(+new Date(e)))return rT(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rI(e,!0,!1)?+e:rT(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rI(e,!0,!1)?+e:rT(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rI(e,!1,!1)?e:rT(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rS.test(e)?e:rT(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rS.exec(e);return r?r[2]?e:rT(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rT(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rS.exec(e);return r?\"urn\"!==r[1]||r[2]?rT(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rT(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rx.test(e)?e.toLowerCase():rT(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rT(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rk.exec(e))?void 0:r[1].toLowerCase():null)?r:rT(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rm(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==ry&&e.length>d?rT(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===ry||(null==c||c<=e)&&(null==f||e<=f)?e:rT(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===ry)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+rl(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===ry||u.has(e)?e:rT(t,e,p)}(e=>null==e||e instanceof Set||new Set(e[tR]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tf(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rN=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),rO=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},r$=((A={})[A.Success=200]=\"Success\",A[A.Created=201]=\"Created\",A[A.NotModified=304]=\"NotModified\",A[A.Forbidden=403]=\"Forbidden\",A[A.NotFound=404]=\"NotFound\",A[A.BadRequest=405]=\"BadRequest\",A[A.Conflict=409]=\"Conflict\",A[A.Error=500]=\"Error\",A),r_=(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status),rj=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rC(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rU=e=>{var t=rN(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${r$[e.status]}.`:`${t} failed with status ${e.status} - ${r$[e.status]}${r?` (${r})`:\"\"}.`};class rM extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rC(this,\"succeeded\",void 0),rC(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rj(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rj(e,!1)))?t:[]}}var rF=e=>!!e.callback,rq=e=>!!e.poll,rz=Symbol(),rR=(e,t,r,{poll:n,logCallbackError:i}={})=>{var a=eu(t)?t:[t],l=[],o=(async()=>{var s,d,u,v,t=await r(a.filter(e=>e)),o=[];for(u of a)u&&null!=(d=t.get(u))&&(d[rz]=u,rF(u)&&o.push([u,e=>!0===u.callback(e)]),rq(u))&&o.push([u,e=>{var t;return!r_(e,!1)||(t=!r_(e,!1)||u.poll(e.value,e[rz]===u,s),s=e.value,t)}]);for([u,v]of o)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${rN(u)} failed: ${t}.`;i?i(f,u,t):l.push(f)}return t})(),u=async(r,n)=>{var d,v,c,i=await o,u=[],s=[];for(d of a)d?null==(c=i.get(d))?s.push(`No result for ${rN(d)}.`):!r||rj(c,n||\"set\"===e)?u.push(r&&c.status===r$.NotFound?void 0:1<r?null!=(v=c.value)?v:void 0:c):s.push(rU(c)):u.push(void 0);if(s.push(...l),s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rM(u,s.join(\"\\n\"));return a===t?u:u[0]};return Object.assign(P(()=>u(1,!1)),{as:()=>u(1,!1),all:()=>u(0,!1),require:()=>u(1,!0),value:(e=!1)=>u(2,e),values:(e=!1)=>u(2,e)})},rP=e=>e&&\"string\"==typeof e.type,rD=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rB=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rW=(e,t)=>{var r;return t&&(!(l=e.get(a=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=l.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(a,t)},rJ=(e,t=\"\",r=new Map)=>{if(e)return eg(e)?tW(e,e=>rJ(e,t,r)):el(e)?tk(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rB(n)+\"::\":\"\")+t+rB(i),value:rB(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rW(r,i)}):rW(r,e),r},rL=tf(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rV=tf(\"variable scope\",{...rL,...ru}),rK=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rH=e=>null!=e&&!!e.scope&&null!=rL.ranks[e.scope],rG=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rX=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},rY=()=>()=>U(\"Not initialized.\"),rQ=window,r0=document,r1=r0.body,r2=(e,t)=>!(null==e||!e.matches(t)),r5=V,r3=(e,t,r=(e,t)=>r5<=t)=>{for(var n=0,i=K;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==H&&null!=a),H),n-1)!==K&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==r0&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},r6=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||en(e);case\"n\":return parseFloat(e);case\"j\":return z(()=>JSON.parse(e),G);case\"h\":return z(()=>nY(e),G);case\"e\":return z(()=>null==n0?void 0:n0(e),G);default:return eu(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r6(e,t[0])):void 0}},r4=(e,t,r)=>r6(null==e?void 0:e.getAttribute(t),r),r8=(e,t,r)=>r3(e,(e,n)=>n(r4(e,t,r))),r9=(e,t)=>null==(e=r4(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),r7=e=>null==e?void 0:e.getAttributeNames(),ne=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,nt=e=>null!=e?e.tagName:null,nn=e=>({x:eb(scrollX,e),y:eb(scrollY,e)}),ni=(e,t)=>tO(e,/#.*$/,\"\")===tO(t,/#.*$/,\"\"),na=(e,t,r=H)=>(u=nl(e,t))&&B({xpx:u.x,ypx:u.y,x:eb(u.x/r1.offsetWidth,4),y:eb(u.y/r1.offsetHeight,4),pageFolds:r?u.y/window.innerHeight:void 0}),nl=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:s,y:d}=nu(e),{x:s,y:d}):void 0,nu=(e,t=!0)=>e?(v=e.getBoundingClientRect(),o=t?nn(K):{x:0,y:0},{x:eb(v.left+o.x),y:eb(v.top+o.y),width:eb(v.width),height:eb(v.height)}):void 0,ns=(e,t,r,n={capture:!0,passive:!0})=>(t=tX(t),ts(r,r=>tW(t,t=>e.addEventListener(t,r,n)),r=>tW(t,t=>e.removeEventListener(t,r,n)))),nv=()=>({...o=nn(H),width:window.innerWidth,height:window.innerHeight,totalWidth:r1.offsetWidth,totalHeight:r1.offsetHeight}),nc=new WeakMap,nf=e=>nc.get(e),np=(e,t=K)=>(t?\"--track-\":\"track-\")+e,nh=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tW(r7(e),l=>{var o;return null!=(o=(c=t[0])[f=l])?o:c[f]=(a=K,!el(n=tW(t[1],([t,r,n],i)=>tb(l,t)&&(a=void 0,!r||r2(e,r))&&ex(null!=n?n:l)))||(i=e.getAttribute(l))&&!en(i)||rJ(i,tO(n,/\\-/g,\":\"),r),a)}),ng=()=>{},ny=(e,t)=>{if(p===(p=nT.tags))return ng(e,t);var r=e=>e?tA(e)?[[e]]:eg(e)?ej(e,r):[ec(e)?[tE(e.match),e.selector,e.prefix]:[tE(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tV(p,([,e])=>e,1))]];(ng=(e,t)=>nh(e,n,t))(e,t)},nm=(e,t)=>ra(eC(ne(e,np(t,H)),ne(e,np(\"base-\"+t,H))),\" \"),nb={},nw=(e,t,r=nm(e,\"attributes\"))=>{var n;r&&nh(e,null!=(n=nb[r])?n:nb[r]=[{},tw(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tE(r||n),,t])],t),rJ(nm(e,\"tags\"),void 0,t)},nk=(e,t,r=K,n)=>null!=(r=null!=(r=r?r3(e,(e,r)=>r(nk(e,t,K)),eh(r)?r:void 0):ra(eC(r4(e,np(t)),ne(e,np(t,H))),\" \"))?r:n&&(h=nf(e))&&n(h))?r:null,nS=(e,t,r=K,n)=>\"\"===(g=nk(e,t,r,n))||(null==g?g:en(g)),nx=(e,t,r,n)=>e&&(null==n&&(n=new Map),nw(e,n),r3(e,e=>{ny(e,n),rJ(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nT={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nI=[],nA=[],nE=(e,t=0)=>e.charCodeAt(t),nO=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nI[nA[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(nA[(16515072&t)>>18],nA[(258048&t)>>12],nA[(4032&t)>>6],nA[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),n$=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nI[nE(e,r++)]<<2|(t=nI[nE(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nI[nE(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nI[nE(e,r++)]);return a},n_={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nj=(e=256)=>e*Math.random()|0,nU={exports:{}},{deserialize:nM,serialize:nF}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i=(i+=String.fromCharCode(a>>10|55296))+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nU.exports=n})(),(A=nU.exports)&&A.__esModule&&Object.prototype.hasOwnProperty.call(A,\"default\")?A.default:A),nq=\"$ref\",nz=(e,t,r)=>ep(e)?L:r?t!==L:null===t||t,nR=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nz(t,n,r)?s(n):L)=>(n!==i&&(i!==L||eu(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||eh(e)||ep(e))return L;if(ev(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nq]||(e[nq]=l,u(()=>delete e[nq])),{[nq]:l};if(ec(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!eg(e)||e instanceof Uint8Array||(!eu(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return z(()=>{var r;return t?nF(null!=(r=s(e))?r:null):z(()=>JSON.stringify(e,L,2*!!n),()=>JSON.stringify(s(e),L,2*!!n))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nP=e=>{var t,r,n=e=>ev(e)?e[nq]&&(r=(null!=t?t:t=[])[e[nq]])?r:(e[nq]&&delete(t[e[nq]]=e)[nq],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(el(e)?z(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),L)):null!=e?z(()=>nM(e),()=>(console.error(\"Invalid message received.\",e,Error().stack),L)):e)},nD=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>ea(e)&&!0===r?e:u(e=el(e)?new Uint8Array(tJ(e.length,t=>255&e.charCodeAt(t))):t?z(()=>JSON.stringify(e),()=>JSON.stringify(nR(e,!1,n))):nR(e,!0,n),r),a=e=>null==e?L:z(()=>nP(e),L);return t?[e=>nR(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nj()));for(r=0,a[n++]=g(v^16*nj(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nj();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=er(t)?64:t,h(),[l,u]=n_[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?X:nO)(l(nR(e,!0,n))),e=>null!=e?nP(o(e instanceof Uint8Array?e:(r&&ek(e)?a:n$)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=y?y:y=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},tf=(nD(),nD(null,{json:!0,decodeJson:!0}),nD(null,{json:!0,prettify:!0}),tN(\"\"+r0.currentScript.src,\"#\")),ru=tN(\"\"+(tf[1]||\"\"),\";\"),nJ=tf[0],nL=ru[1]||(null==(A=tg(nJ,{delimiters:!1}))?void 0:A.host),nV=e=>!(!nL||(null==(e=tg(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nL))!==H),tf=(...e)=>tO(ra(e),/(^(?=\\?))|(^\\.(?=\\/))/,nJ.split(\"?\")[0]),nH=tf(\"?\",\"var\"),nG=tf(\"?\",\"mnt\"),nX=(tf(\"?\",\"usr\"),Symbol()),[nZ,nY]=nD(),[nQ,n0]=[rY,rY],n1=!0,[ru,n5]=ee(),n4=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:el(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[n8,n9]=ee(),[n7,ie]=ee(),it=e=>ii!==(ii=e)&&n9(ii,io(!0,!0)),ir=e=>ia!==(ia=!!e&&\"visible\"===document.visibilityState)&&ie(ia,!e,il(!0,!0)),ii=(n8(ir),!0),ia=!1,il=e7(!1),io=e7(!1),iu=(ns(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>it(!1)),ns(window,[\"pageshow\",\"resume\"],()=>it(!0)),ns(document,\"visibilitychange\",()=>(ir(!0),ia&&it(!0))),n9(ii,io(!0,!0)),!1),is=e7(!1),[,iv]=ee(),ic=tt({callback:()=>iu&&iv(iu=!1,is(!1)),frequency:2e4,once:!0,paused:!0}),A=()=>!iu&&(iv(iu=!0,is(!0)),ic.restart()),ih=(ns(window,[\"focus\",\"scroll\"],A),ns(window,\"blur\",()=>ic.trigger()),ns(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],A),A(),()=>is()),ig=0,iy=void 0,im=()=>(null!=iy?iy:rY())+\"_\"+ib(),ib=()=>(e9(!0)-(parseInt(iy.slice(0,-2),36)||0)).toString(36)+\"_\"+(++ig).toString(36),iS=new Map,ix={id:iy,heartbeat:e9()},iT={knownTabs:new Map([[iy,ix]]),variables:new Map},[iI,iA]=ee(),[iE,iN]=ee(),iO=rY,i$=(e,t=e9())=>{e=iS.get(el(e)?e:rG(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},i_=(...e)=>{var t=e9();return iC(tJ(e,e=>(e.cache=[t],[rO(e),{...e,created:t,modified:t,version:\"0\"}])))},ij=e=>null!=(e=tJ(e,e=>{var t,r;return e&&(t=rG(e[0]),(r=iS.get(t))!==e[1])?[t,e[1],r,e[0]]:tM}))?e:[],iC=e=>{var r,n,e=ij(e);null!=e&&e.length&&(r=e9(),tW(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),rt(iS,e),(n=tL(e,([,,,e])=>0<rV.compare(e.scope,\"tab\"))).length&&iO({type:\"patch\",payload:re(n)}),iN(tJ(e,([,e,t,r])=>[r,e,t]),iS,!0))},[,iM]=(ru((e,t)=>{n8(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),iy=null!=(n=null==r?void 0:r[0])?n:e9(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),iS=new Map(tY(tL(iS,([,e])=>\"view\"===(null==e?void 0:e.scope)),tJ(null==r?void 0:r[1],e=>[rG(e),e])))):sessionStorage.setItem(\"_tail:state\",e([iy,tJ(iS,([,e])=>e&&\"view\"!==e.scope?e:tM)]))},!0),iO=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([iy,t,r])),localStorage.removeItem(\"_tail:state\"))},ns(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==iy||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||iO({type:\"set\",payload:[tJ(iT.knownTabs),tJ(iT.variables)]},e):\"set\"===a&&r.active?(iT.knownTabs=new Map(l[0]),iT.variables=new Map(l[1]),iS=new Map(l[1]),r.trigger()):\"patch\"===a?(o=ij(tJ(l,([e,t])=>[rX(e),t])),rt(iT.variables,l),rt(iS,l),iN(tJ(o,([,e,t,r])=>[r,e,t]),iS,!1)):\"tab\"===a&&(t9(iT.knownTabs,e,l),l)&&iA(\"tab\",l,!1))});var r=tt(()=>iA(\"ready\",iT,!0),-25),n=tt({callback(){var e=e9()-1e4;tW(iT.knownTabs,([t,r])=>r[0]<e&&t9(iT.knownTabs,t,void 0)),ix.heartbeat=e9(),iO({type:\"tab\",payload:ix})},frequency:5e3,paused:!0});n8(e=>(e=>{iO({type:\"tab\",payload:e?ix:void 0}),e?(r.restart(),iO({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),ee()),[iF,iq]=ee(),iz=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?n0:nY)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?nQ:nZ)([iy,e9()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e9())&&(l(),(null==(d=i())?void 0:d[0])===iy))return 0<t&&(a=setInterval(()=>l(),t/2)),D(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=to(),[d]=ns(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[tl(null!=o?o:t),v],await Promise.race(e.map(e=>eh(e)?e():e)),d()}var e;null==o&&U(\"_tail:rq could not be acquired.\")}})(),iR=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n1;var i,a,l=!1,o=r=>{var o=eh(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iM(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===L,i=e)),!l)&&(a=n?nQ(i,!0):JSON.stringify(i))};if(!r)return iz(()=>eR(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?ex(U(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?n0:JSON.parse)?void 0:l(t):L)&&iq(l),ex(l)):ex()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&U(\"Beacon send failed.\")},tf=[\"scope\",\"key\",\"entityId\",\"source\"],iD=[...tf,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iB=[...tf,\"value\",\"force\",\"ttl\",\"version\"],iW=new Map,iL=Symbol(),iH=Symbol(),iG=[.75,.33],iX=[.25,.33],iY=e=>tJ(t0(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rN(e)}, ${rH(e)?\"client-side memory only\":rf(null==(e=e.schema)?void 0:e.usage)})`,K]:tM),i2=(e,t=\"A\"===nt(e)&&r4(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),i5=(e,t=nt(e),r=nS(e,\"button\"))=>r!==K&&(F(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&F(r9(e,\"type\"),\"button\",\"submit\")||r===H),i3=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tv((null==(r=r4(e,\"title\"))?void 0:r.trim())||(null==(r=r4(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?nu(e):void 0}},i4=e=>{if(k)return k;el(e)&&([r,e]=nY(e),e=nD(r,{decodeJson:!0})[1](e)),eY(nT,e),(e=>{n0===rY&&([nQ,n0]=nD(e,{json:!e,prettify:!1}),n1=!!e,n5(nQ,n0))})(e2(nT,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,y,i=e2(nT,\"key\"),a=null!=(e=null==(r=rQ[nT.name])?void 0:r._)?e:[];if(eu(a))return l=[],o=[],u=(e,...t)=>{var r=H;o=eW(o,n=>z(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:k,unsubscribe:()=>r=K}),r},(e=>t=>n4(e,t))(n)))},s=[],v=((e,t)=>{var r=tt(async()=>{var e=tJ(iW,([e,t])=>({...rX(e),result:[...t]}));e.length&&await a.get(e)},3e3),n=(e,t)=>t&&t4(iW,e,()=>new Set).add(t),a=(n8((e,t)=>r.toggle(e,e&&3e3<=t),!0),iE(e=>tW(e,([e,t])=>(e=>{var t,r;e&&(t=rG(e),null!=(r=e2(iW,t)))&&r.size&&tW(r,r=>!0===r(e)&&n(t,r))})(t?{status:r$.Success,...t}:{status:r$.NotFound,...e}))),{get:r=>rR(\"get\",r,async r=>{r[0]&&!el(r[0])||(l=r[0],r=r.slice(1)),null!=t&&t.validateKey(l);var o=new Map,u=[],s=tJ(r,e=>{var t=i$(rG(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))o.set(e,{...e,status:r$.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)o.set(e,{status:r$.Success,...t});else{if(!rH(e))return[rn(e,iD),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...rO(e),version:\"1\",created:d,modified:d,value:r,cache:[d,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},t7(u,[rO(r),r]),o.set(e,{status:r$.Success,...r})):o.set(e,{status:r$.NotFound,...rO(e)})}return tM}),d=e9(),l=s.length&&(null==(l=await iR(e,{variables:{get:tJ(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=l.variables)?void 0:r.get)||[],c=[];return tW(l,(e,t)=>{var n,r;(null==e?void 0:e.status)===r$.NotFound?null!=(r=null==(r=(n=s[t][1]).init)?void 0:r.call(n))&&c.push([n,{...rO(n),value:r}]):o.set(s[t][1],rK(e))}),c.length&&tW(await a.set(tJ(c,([,e])=>e)).all(),(e,t)=>o.set(c[t][0],rK(e.status===r$.Conflict?{...e,status:r$.Success}:e))),u.length&&iC(u),o},{poll:(e,t)=>n(rG(e),t),logCallbackError:(e,t,r)=>n4(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rR(\"set\",r,async r=>{r[0]&&!el(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,l=[],o=new Map,u=e9(),s=[],d=tJ(r,e=>{var i,r,t=i$(rG(e));return rH(e)?((r=null==(i=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...rO(e),created:null!=(r=null==t?void 0:t.created)?r:u,modified:u,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[u,e.ttl]})&&(r.cache=[u,null!=(i=e.ttl)?i:3e3]),o.set(e,r?{status:t?r$.Success:r$.Created,...r}:{status:r$.Success,...rO(e)}),t7(l,[rO(e),r]),tM):e.patch?(s.push(e),tM):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[rn(e,iB),e])}),v=0;!v++||s.length;)tW(await a.get(tJ(s,e=>rO(e))).all(),(e,t)=>{var r=s[t];rj(e,!1)?t7(d,[{...r,patch:void 0,value:s[t].patch(null==e?void 0:e.value),version:e.version},r]):o.set(r,e)}),s=[],tW(d.length?q(null==(i=(await iR(e,{variables:{set:tJ(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=d[t];v<=3&&t.patch&&((null==e?void 0:e.status)===r$.Conflict||(null==e?void 0:e.status)===r$.NotFound)?t7(s,t):o.set(t,rK(e))});return l.length&&iC(l),o},{logCallbackError:(e,t,r)=>n4(\"Variables.set\",e,{operation:t,error:r})})});return iF(({variables:e})=>{e&&null!=(e=tY(tJ(e.get,e=>r_(e)?e:tM),tJ(e.set,e=>rj(e)?e:tM)))&&e.length&&iC(tJ(e,e=>[rO(e),rj(e)?e:void 0]))}),a})(nH,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=im()),null==e.timestamp&&(e.timestamp=e9()),h=H,tW(l,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===K&&tF(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&U(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eZ(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):U(\"Source event not queued.\")},o=e=>{i.set(e,e3(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!el(r[0])||(a=r[0],r=r.slice(1)),iR(e,{events:r=tJ(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eZ(e,{metadata:{posted:!0}}),e[iL]){if(tW(e[iL],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iL]}return eZ(rh(e3(e),!0),{timestamp:e.timestamp-e9()})}),variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=tJ(tX(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e6(l,e),null!=(r=rr(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:tM}),tW(l,e=>{}),!i)return u(e,!1,a);r?(n.length&&e4(e,...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&e6(n,...e)};return tt(()=>s([],{flush:!0}),5e3),n7((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tJ(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),null!=t?t:tM}),n.length||e.length)&&s(eC(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r)=>s(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var u=!1,d=()=>{u=!0};return o(e),((e,t)=>{var r;(null!=(r=(b=e)[w=iL])?r:b[w]=new Set).add(t)})(e,o),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))d();else{var a=i.get(e),[r,s]=null!=(r=e8(t(a,d),a))?r:[];if(r&&!M(s,a))return i.set(e,e3(s)),[l(e,r),u]}return[void 0,u]}),r&&s(e),d}}})(nH,d),f=null,p=0,g=h=K,y=!1,k=(...e)=>{if(y){if(e.length){1<e.length&&(!e[0]||el(e[0]))&&(t=e[0],e=e.slice(1)),el(e[0])&&(r=e[0],e=ek(r)?JSON.parse(r):nY(r));var t,n=K;if((e=eW(tV(e,e=>el(e)?nY(e):e),e=>{if(!e)return K;if(aA(e))nT.tags=eY({},nT.tags,e.tagAttributes);else{if(aE(e))return nT.disabled=e.disable,K;if(a$(e))return n=H,K;if(aF(e))return e(k),K}return g||aj(e)||aO(e)?H:(s.push(e),K)})).length||n){var r=eH(e,e=>aO(e)?-100:aj(e)?-50:aM(e)?-10:90*!!rP(e));if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var m=f[p];m&&(d.validateKey(null!=t?t:m.key),z(()=>{var e=f[p];if(u(\"command\",e),h=K,rP(e))c.post(e);else if(a_(e))v.get(tX(e.get));else if(aM(e))v.set(tX(e.set));else if(aj(e))e6(o,e.listener);else if(aO(e))(t=z(()=>e.extension.setup(k),t=>n4(e.extension.id,t)))&&(e6(l,[null!=(r=e.priority)?r:100,t,e.extension]),eH(l,([e])=>e));else if(aF(e))e(k);else{var r,n,t,a=K;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:K)break;a||n4(\"invalid-command\",e,\"Loaded extensions:\",tJ(l,e=>e[2].id))}},e=>n4(k,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(rQ,nT.name,{value:Object.freeze(Object.assign(k,{id:\"tracker_\"+im(),events:c,variables:v,__isTracker:H})),configurable:!1,writable:!1}),iE((e,t,r)=>{eC(iY(tJ(e,([,e])=>e||tM)),[[{[nX]:iY(tJ(t,([,e])=>e||tM))},\"All variables\",H]])}),iI(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:V}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{k(B({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==S?void 0:S.clientId,languages:tJ(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return B({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==rQ?void 0:rQ.screen,r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:rQ.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:rQ.devicePixelRatio,width:r,height:i,landscape:l}}):{})}));var i,l,a,r})(),e.hasUserAgent=!0),g=!0,s.length&&k(s),n(),y=!0,k(...tJ(aS,e=>({extension:e})),...a),k({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),k;U(`The global variable for the tracker \"${nT.name}\" is used for something else than an array of queued commands.`)},i8=()=>null==S?void 0:S.clientId,i9={scope:\"shared\",key:\"referrer\"},i7=(e,t)=>{k.variables.set({...i9,value:[i8(),e]}),t&&k.variables.get({scope:i9.scope,key:i9.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},ae=e7(),at=e7(),ar=1,[ai,aa]=ee(),al=e=>{var t=e7(e,ae),r=e7(e,at),n=e7(e,ih),i=e7(e,()=>ar);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},ao=al(),[as,ad]=ee(),av=(e,t)=>(t&&tW(af,t=>e(t,()=>!1)),as(e)),ac=new WeakSet,af=document.getElementsByTagName(\"iframe\");function ah(e){if(e){if(null!=e.units&&F(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var ay=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),am=e=>nx(e,t=>t!==e&&!!ay(nc.get(t)),e=>(T=nc.get(e),(T=nc.get(e))&&ej(eC(T.component,T.content,T),\"tags\"))),ab=(e,t)=>t?e:{...e,rect:void 0,content:(I=e.content)&&tJ(I,e=>({...e,rect:void 0}))},aw=(e,t=K,r)=>{var n,i,a,l=[],o=[],u=0;return r3(e,e=>{var s,a,i=nc.get(e);i&&(ay(i)&&(a=eW(tX(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==H||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eK(a,e=>null==(e=e.track)?void 0:e.region))&&nu(e)||void 0,s=am(e),i.content&&e4(l,...tJ(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e4(o,...tJ(a,e=>{var t;return u=eL(u,null!=(t=e.track)&&t.secondary?1:2),ab({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nk(e,\"area\"))&&e4(o,a)}),l.length&&e6(o,ab({id:\"\",rect:n,content:l})),tW(o,e=>{el(e)?e6(null!=i?i:i=[],e):(null==e.area&&(e.area=ra(i,\"/\")),e4(null!=a?a:a=[],e))}),a||i?{components:a,area:ra(i,\"/\")}:void 0},ak=Symbol(),aS=[{id:\"context\",setup(e){tt(()=>tW(af,e=>t8(ac,e)&&ad(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==S||!t||null!=S&&S.definition?null!=(n=t)&&t.navigation&&f(!0):(S.definition=t,null!=(t=S.metadata)&&t.posted&&e.events.postPatch(S,{definition:n})),!0}});var n,t,d=null!=(t=null==(t=i$({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=i$({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&i_({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=i$({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=i$({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=K)=>{var a,l,o,i,p;ni(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=tg(location.href+\"\",{requireAuthority:!0}),S={type:\"view\",timestamp:e9(),clientId:im(),tab:iy,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:nv(),duration:ao(void 0,!0)},0===v&&(S.firstTab=H),0===v&&0===d&&(S.landingPage=H),i_({scope:\"tab\",key:\"viewIndex\",value:++d}),l=ty(location.href),tJ([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=S).utm)?n:o.utm={})[e]=null==(n=tX(l[\"utm_\"+e]))?void 0:n[0])?e:tM}),!(S.navigationType=x)&&performance&&tW(performance.getEntriesByType(\"navigation\"),e=>{S.redirects=e.redirectCount,S.navigationType=tO(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(t=S.navigationType)?t:S.navigationType=\"navigate\")&&(p=null==(i=i$(i9))?void 0:i.value)&&nV(document.referrer)&&(S.view=null==p?void 0:p[0],S.relatedEventId=null==p?void 0:p[1],e.variables.set({...i9,value:void 0})),(p=document.referrer||null)&&!nV(p)&&(S.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tg(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),S.definition=n,n=void 0,e.events.post(S),e.events.registerEventPatchSource(S,()=>({duration:ao()})),aa(S))};return n7(e=>{e?(at(H),++ar):at(K)}),ns(window,\"popstate\",()=>(x=\"back-forward\",f())),tW([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:t=>aI(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),H),decorate(e){!S||rD(e)||(e=>!(null==e||!e.patchTargetId))(e)||(e.view=S.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tW(e,e=>{var t,r;return null==(t=(r=e.target)[iH])?void 0:t.call(r,e)})),r=new Set,n=(tt({callback:()=>tW(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=r0.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,y,m,b,w,k,S;l&&(o=eW(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==H}))&&(e=>{var r,n;return null==e?L:null!=(r=null!=(n=e.length)?n:e.size)?r:e[Y]?(r=0,null!=(n=eq(e,()=>++r))?n:0):Object.keys(e).length})(o)&&(p=f=K,g=h=0,y=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},e7(!1,ih),!1,!1,0,0,0,t$()];a[4]=t,a[5]=r,a[6]=n},m=[t$(),t$()],b=al(!1),w=e7(!1,ih),k=-1,S=()=>{var O,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],x=S[2]-S[0],S=S[1]-S[3],E=f?iX:iG,r=(E[0]*l<x||E[0]<(x/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nT.impressionThreshold-250)&&(++h,b(f),s||(s=tJ(o,e=>((null==(e=e.track)?void 0:e.impressions)||nS(a,\"impressions\",H,e=>null==(e=e.track)?void 0:e.impressions))&&B({type:\"impression\",pos:na(a),viewport:nv(),timeOffset:ao(),impressions:h,...aw(a,H)})||tM),e(s)),null!=s)&&s.length&&(O=b(),d=tJ(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:O,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:O.activeTime&&c&&n(O.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:eb(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:eb(l/u+100*o/l),readTime:eb(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var _=r0.createTreeWalker(a,NodeFilter.SHOW_TEXT),j=0,C=0;for(null==u&&(u=[]);C<v.length&&(U=_.nextNode());){var U,M,F,P,D,z=null!=(M=null==(M=U.textContent)?void 0:M.length)?M:0;for(j+=z;j>=(null==(F=v[C])?void 0:F.offset);)i[C%2?\"setEnd\":\"setStart\"](U,v[C].offset-j+z),C++%2&&({top:F,bottom:P}=i.getBoundingClientRect(),D=t.top,C<3?y(0,F-D,P-D,v[1].readTime):(y(1,u[0][4],F-D,v[2].readTime),y(2,F-D,P-D,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=m[0].push(E,E+x)*m[1].push(r,r+S)/L),u&&tW(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[iH]=({isIntersecting:e})=>{eY(r,S,e),e||(tW(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{eQ(nc,e,e=>{var t;return(e=>null==e?void 0:{...e,component:tX(e.component),content:tX(e.content),tags:tX(e.tags)})(\"add\"in n?{...e,component:eC(null==e?void 0:e.component,n.component),content:eC(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:eC(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,nc.get(e))};return{decorate(e){tW(e.components,t=>{t9(t,\"track\",void 0),tW(e.clickables,e=>t9(e,\"track\",void 0))})},processCommand:e=>aN(e)?(n(e),H):aU(e)?(tW(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=r4(i,e);){((e,t)=>e instanceof Set||e instanceof WeakSet?e.has(t)||e.add(t):eX(e,t)||eG(e,t,!0))(n,i);var l,o=tN(r4(i,e),\"|\");r4(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=eo(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch{}0<=s&&t[s]&&(d=t[s]),e6(a,d)}}}e6(r,...tJ(a,e=>({add:H,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),H):K}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{ns(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=K;if(r3(n.target,e=>{i5(e)&&null==l&&(l=e),s=s||\"NAV\"===nt(e);var t,d=nf(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tW(e.querySelectorAll(\"a,button\"),t=>i5(t)&&(3<(null!=u?u:u=[]).length?ex():u.push({...i3(t,!0),component:r3(t,(e,t,r,n=null==(i=nf(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=nS(e,\"clicks\",H,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eK(d,e=>(null==(e=e.track)?void 0:e.clicks)!==K)),null==a&&(a=null!=(t=nS(e,\"region\",H,e=>null==(e=e.track)?void 0:e.region))?t:d&&eK(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=aw(null!=l?l:o,!1,v),f=nx(null!=l?l:o,void 0,e=>tL(tX(null==(e=nc.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?H:a)?{pos:na(l,n),viewport:nv()}:null,...((e,t)=>{var n;return r3(null!=e?e:t,e=>\"IMG\"===nt(e)||e===t?(n={element:i3(e,!1)},K):H),n})(n.target,null!=l?l:o),...c,timeOffset:ao(),...f});if(l)if(i2(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:m,source:b}=tg(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(B({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,x,w=B({clientId:im(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:m},self:H,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r4(h,\"target\")!==window.name?(i7(w.clientId),w.self=K,e(w)):ni(location.href,h.href)||(w.exit=w.external,i7(w.clientId))):(k=h.href,(b=nV(k))?i7(w.clientId,()=>e(w)):(x=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nT.captureContextMenu&&(h.href=nG+\"=\"+x+encodeURIComponent(k),ns(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===x&&e(w),r())),ns(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{r3(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>el(e=null==e||e!==H&&\"\"!==e?e:\"add\")&&F(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ev(e)?e:void 0)(null!=(r=null==(r=nf(e))?void 0:r.cart)?r:nk(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?L:eu(e)||el(e)?e[e.length-1]:eq(e,(e,r)=>e,void 0,void 0))(null==(r=nf(e))?void 0:r.content))&&t(d)});c=ah(d);(c||i)&&e(B(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eQ(t,o,r=>{var i=nl(o,n);return r?e6(r,i):(i=B({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),av(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=nn(H);ai(()=>{return e=()=>(t={},r=nn(H)),setTimeout(e,250);var e}),ns(window,\"scroll\",()=>{var a,n=nn(),i={x:(o=nn(K)).x/(r1.offsetWidth-window.innerWidth)||0,y:o.y/(r1.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=H,e6(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=H,e6(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=H,e6(a,\"page-end\")),(n=tJ(a,e=>B({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return aT(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=ah(r))&&e({...r,type:\"cart_updated\"}),H):aC(t)?(e({type:\"order\",...t.order}),H):K}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||r8(e,np(\"form-value\")),e=(t&&(r=r?en(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tv(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=r8(a,np(\"ref\"))||\"track_ref\",(s=t4(r,a,()=>{var t,r=new Map,n={type:\"form\",name:r8(a,np(\"form-name\"))||r4(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},l=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ao()})),()=>{1!==t[3]&&(o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&nu(a).width)),e.events.postPatch(n,{...i,completed:n.completed,totalTime:e9(H)-t[4]}),t[3]=1)}),s=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),er(i)?i&&(a<0?ei:J)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})();return ns(a.ownerDocument.body,\"submit\",e=>{var r,n;i=aw(a),t[3]=3,e.defaultPrevented?([r]=n8(e=>{e||(n||3===t[3]&&l(),r())}),n=!1,s(()=>{if((()=>{for(var e=a.ownerDocument;e;){if(((e,t)=>!0===tW(e,(r,n,i)=>t(r)?tU=!0:r))(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||nu(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=z(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1})())return t[3]=2,n=!0;n&&(n=!1,t[3]=3),a.isConnected&&0<nu(a).width?t[3]=2:l(),r()},1750)):l()},{capture:!1}),t=[n,r,a,0,e9(H),1]}))[1].get(t)||tW(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var d,v,a;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:tO(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[ak]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!nS(e,\"ref\")||(e.value||(e.value=tO(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value))}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=at())),v=-(s-(s=e9(H))),c=i[ak],(i[ak]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=H,o[3]=2,tW(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&ns(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e9(H),u=at()):o()));d(document),av(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||rp.equals(r,t)?[!1,r]:(await e.events.post(B({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=rQ.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tJ(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"direct\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,s,t;return aq(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(t=l.key,(null!=(e=a[t])?e:a[t]=tt({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e;r0.hasFocus()&&(e=l.poll(s))&&!rp.equals(s,e)&&(await i(e),s=e)}).trigger()),H):K}}}}],A=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),aT=A(\"cart\"),aI=A(\"username\"),aA=A(\"tagAttributes\"),aE=A(\"disable\"),aN=A(\"boundary\"),aO=A(\"extension\"),a$=A(H,\"flush\"),a_=A(\"get\"),aj=A(\"listener\"),aC=A(\"order\"),aU=A(\"scan\"),aM=A(\"set\"),aF=e=>\"function\"==typeof e,aq=A(\"consent\");Object.defineProperty(rQ,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(i4)}})})();\n",
        gzip: "H4sIAAAAAAACCry963rTyLYo-v88ha3JdFfhirGcC4mcQgtoaGhu3Q00TSsCFLucqFFKoVQOCbbnd57mPNh5kvONURdJjkP33Ht_Z63ZxKr7ddS4D0Iov7e4yFRHMM0UkyxnGStYyeasYlN2wSZsxs7ZKTthV-yYfWWf2Wt2yd6wp-PZXE50XsrOQ4KV6UJ3ctkR8avjv8RED6ZilkvxiyrPhdJXWGZxkRVzESkm5PxMqOy4EFF3yCalnOUnc__9VeXa_l7RSCQ65WoFg3zLoRku-L1HSpWKCArD16eq_NoRBRFc7EJarImgkVixF9wMjW-FUDCfEcE518ulnBcF5wT-dLmIRaQpVULPlewOx1BsQgTt9cSEaPgzKIQ80adQ1_6kuGg5k3w4npWK5Dh1il0kedrlXCd52ut1X-A3gy-mtkLfTTju9-XKfHQk59yu2mdxVRFNbTcrV3rFHpu5DAYDRfk9O4_hobIlez01qMozQTS_9xhKUsq-YBXK79XzfGvnrGMdBfc7SnyZ50pMO7gxnbzqnOVVlcuTgAl-783VubALPVDivMgmggSDwSBgARR1lQcBpZR9M3vTHTKFm6KuFnZ2gtDVJNOTUyKoTzslmsaiIoJr3LK3uGWRUJA-KWVVFmIgsHNtM2mkV7NcZkVxtTCzUL2eInS1Gk-KrKo6v3XEpRZyWnV-UeVZXonFiYAzmes8K_JvYkp8_3YVTvNq8FGJal7olT4VEtcLt1aNTUm7XkS1CtNYRc1vm5nhhSCUDnxj9cyhVb3Wql5rVX-_VdeWW4b_Q83Wra1g5bWaTzTerkU1PxeKIJBYUfaQQE0W2KoBuyjzaWfYyDAd1BnNnrhY4SX-Be6vFF87v5GsupITaN3cW_YjNyk3HKTsa5brDpatlzWfkS6eGtoqBacKbrKmFjyM24eqXsQFViAGJKjYDD1ShNLVij2AwQr2Dv50u4L9jN-c8yfsOTdF2e_85fzsWKjBi_t_fHx9__Gjj09fvnn006Pf2DPeDdkTmMpP3Cwi-8M0-CcugrmW7D1_fXV2XBaDXAuV6VKxX10KrsdTlyyEu9FEMcm7Q1g6ouhyqXs92ev5W1EfWqIoHNbnTGhX1969LufPDaR8HtnZCzd7gLkUCwioqmC0wXFZFiKTAef66lyUs45gQnIhiFAALYZdLno9EnIulstglhWVCLoc0wKt5iLgmPMcgIXIcRm6nD9jIsPWJa5hq_ECMyqtACA1M0rstWB2DZsDH-jyNVYg0M2c31cquxrkFf5losJ-O7msdCYn0BwCOCamFnyFtG7zedTVvZ6YE0FjEYkT-JsMBgORRolImbjAxnq9oETY3RriBPKuLeugcb-oB_pMzNzeBO5V9Y1t3Bomzs3a4ClpdXyKGdeagayTxhy7rt3lsiuS9-lyeX2he72upkxcXVuzF9k5E2fXkl8LzcRx89GxqxjCaxWL6EWmTweqnMspEbeJ5vh9Xn4l4ZDpXq87hHcz1tGQUnpHM_HVvt9waJNhCq30eiJx7_FWCEmKic84lALfbCK-EsGCRcCCVUCXS_OZBCxIAzgSr-FOikvcHvgYMkGZeMNFc8Ti1Oy55vc0bvXTeiSNF1SZOwKIxxsiKDMN6F6PaD50n6rXI4r_ThmRLKf8nt7aip9HamsrFrHAtEhGikaCift804me5YUWivxJmXhkh8FkY4GTtHlO7-NbmbxPY3cGbptXLZ85fIciXFxoGLWmY3zuLB4jO7Dx1Jclkmsimer3KaztVS6KaUfCMtIFLuX4WIns82olikp0oAVozbZimpCNeisimOIIeCLxlJiZ0EhcwNDXxtscnmT1AA2ihegXTyQTiUzTcT3gHHaG5DjkKK8HnW8YNAynOYxHxGx8ayRM3QTf6QJHZI6D70jTsdra8jBYcwGP05jaXFwCJmnU6IQP7QaJwyF1bbqDtCW2QjoW_b5vYmtr7Je7feTGYmvLF-v3sS_K4BK_bJ4cmKj9YOKVQ5JDeFJCoAAov-dHJ4glDBonSOMJQqghez1xARN0e5_B3uexeEQ0jTQNu_Co4ohuC5IBDswk6w5pZEaZmanUi2OGBoNgqo9lQ8rErebwYSD2dDA89e44DFnGkxTPieLqcBg7SNFXkX0bYxUNmeSymSltpoxl5BLH6lD2el3xegwHCdsvuEhUOnb7Ghdck4LlcM4K2utlg_N5dUoK6rB6A2qyVQvlFLH-g4iXfjY0er5i4uP6vYaCgCO9Fprgk1PXSCk8yX9t3DVo-xVp0HIA8R5yAi04Ss8hix3xDR5r7mYcA4gFKORH0Os1YJ3mSUrNFAeDAXQED7leMfG2tTeGLspYYS_s_4mNwD2o4Vei0l6P5NzuRAYkRKJSVgCUirMoh5vevup2yvmKiRfugTJ4PpMsY7kdbLYG_jKE3Q1QmOF-01gCEXtDJ2rFxOPvdoIgLJ-1m04yJpIsTds93NTBl-uLPm5AeAQmeDXcZr_15cfYM-fPLbn6PvWFXuCoocB1nMYXMuTlqnXhGxCF1kuX84yO_dKvmPjGxRcmfqvR_LVT46bAue_ueWNjGtemBvgZNxh_Rm2PNy0bbP4vfl829WRewsXKEA4L8_Jc27gNuwXHJJHJME25TMKUtp_DwpyqAksVWKqAUuPGfv5YIxi2X1iOBuiwiAlQOsuliknGF7CgAOFjIhqAw5DUsEb-DRJJmHJFsgSueMrgE8dsEzgmRIBDQXs6Fuugwh3TdVQ0TKGZmuwkkmc0yTk2C3SnTPK0BhxYgWV0FXkgc1ObzaEBGINqkfiFiFs4QnzY-D2hiTZvXGjGD18hpXTFxANeA0K3qgWSYeKUKBorQiO1NkHBxRcimF1Pfz1hRRXDNY1FVBCKbdrfKybetR7XW6YFHJ_bAt3rmYEiQWUe3udQC2BpC1kWGWAgiBmfZZeuRCQe2Faha66TMI3hH4KohKpbWC5FRgDtEYd5nEeCPWc6GQEDahvIhmcbwMb1Q2a4X10dDw-bbCnh2FKRx7VaPzj8EMiGom4_88EkKwpYUP-SvKMURvaluZHdrlmeXk9cEsAOcJ_wp7nvvR5c3yeeAeifs_UtVFxMAe4ZhpjSxPYAlO4WksNMrJj4qYHQt8gyT5UtlwajNhMBQiOeikJo0QESzLIlo0auGJh8_wMwoFaVQSV0jP8CUkUjMcim0xhqZtMplG7WNB3A2RZ_rAMH5FE6uOWHQCQXgxPs4gS6gPZOsyrGf12T9DqbQPLGjYAt-Am7k5TJFRN_No4pEd-IZhoBhWYk0UylMCjfInJOTS9iAm2KP_EbZ4sToivYAcrE-3WUzk_IYQh2HHjE657nyL3ArGQIBxthV2s8riKyGuCC_nptAd1jNgPqsBI6aGw0kRxYnmYN4Zo3d8XunqSRqZtNpwEsHay9WWZ6w372eq2dwtUwi2VWC-5c47jgMQ3beESDztnAu-4oLv7A8syMzbQW0JtOJIOXZ9R8EutXHpfZ4BC9XnjosUTtb5VGYhbYsnRwlp0D51mMDOs5MldH19XEoDov8glQEyEFRNPB-9BgE0zs4rU2hDdBcnjb3HZk3tsGY4FdQcltyASOemR5MriEUORHAJWJMGchgYaIwqIpjRZQdhWJMyjrMGwdI9Butwpk9JUr9QLm50vh2wTN4utkWxY45r0NQN1T8h57pkzsfK_gXFan-Uy7svtr2KTFlOrNmuBmGZRgYtkg3-wqFKnd2-4LUjBkZ8D8FkbMoXhhfndJwcW-LUHdkRonBVMpLwxCIzIClI7IiGXw9nqk4NjGlk0ZZ4lIecHs-YQ3KOdiG64FZKjVirKcxknGcncGaAR7lK6YOODBXBq50TToOszzXKhZqc6AyQSslidwGswDqdUc0MgD8ozSqFFsoPMz8UrlJ7nsN5Nl-ZXQ6MdM408m7sLT3h0ybdCCA0IbGDvvi9uaUMT-LHs944IVyH3lIs77fEv2ERmkNMpZgejnkDIiOOKiJocpumLaMF_50IvbuDnpixlIUYScXEWawUt5nE0-R3BA2eLLXMxFlMMAz7N5JaZRBpSeVvnJiVBRAR-lnIiohF--8tyxmlU2i6oVF2wKqFmN4Qx8n4CNDNmQsguuS3hrB0pUZXEhCGUTLu6SbkbZjE8IZecGZ-8Ie5amy2U37_UuBudCTnN5Yrl3opZv5TNCzgbH8-oKGNWYBwjx2FcZU4O4X3hgvFxewAgELDtBrqEp8SOKIOYEBrI16xMcEqWsGzLI6AJorYcO7PBDPlwuS9rrXRHgH3T9SEK6Yqe4QlNeCf0mPxPlXGP7VYzrUun7Mj_LgPnxWGVngpzQ6IRQpg-H8ZaONGUnZoXPBiDYuBC93jmhrP46BZzwyvJaAU8hEwOUJ4XIlOtxWlfh3S6ZchGfEhoNKTuj7IwvTFbUDRkMHP4qUelM6cgiNH5P8Q1gc14T1nN2RbpD4LJQpsuTk0JEjvff5dx1G4tYx-QKcayzgT1WMBMaYWKEaxed-RPnT4DZlXMDaK6Ia5BCjyu3m2cD0zXpZqygq1perNX_LwJjIxPUEoWA2E4t_jNyqXMjJRxg5gqKGdnQDcUwE4vZA3xTQZu9cifSMt03F24UMvKylRKwHH9Xy5XxlfDabCzN4QXTuSlY5ScyKxqiWCzqR2Fldu4WYpVaMrpxLA1ZZ0N6SBdaObGgLbkmF7R9rNxO5Yv_xY4QoI6_153LstPcmIPsjusZeDg2pONp2JBuNz-Au8Cub4OVTBNin_6F4BpRmoZgz7E4obJtjjYXxKbhY3CaV4mO7WgiO9qUI39nuVQMxINYClHHZjNjIxithfyBHVsnK5TIplcdu1rTO2ZxUNK_oivKkuaZcZsJRVIn5NXFmhhoucyrxyCKhzMWd4FOPeTDWOwCStpcGMXvNeCylxAr4qW_GrF6Gr0ln57Ki6zIp52pKLKrzq2FWA0-AcizImYiYi0jnVOmq3UKAJmm3G2DwB_AdM4QuMsuIundEFk7JEfQxopWHqI_2uY5qAfMgSRjBaAzgjfVa7jFNm3JhDSJcK4rglJUjaQD0Efw22Ltgvr2gd8OWg-AxrI8GaaU5StGrFoIEVwxPZiV6lEG4nE7MSCE0hXTF45pjCJA4O86_PyejlX86dZCDCrE0kEgsRoMBp0kk1NYWCdy06vOWalE-ilqFN0KaT_4f__v_yeIAH7MWthqwRRPUiYBN83hn8xy0woA_poWINVLCuDobn4Hcla4d6BoQPrwu29CuKJMJkXKs36fKceZN8KkkhNcg6E_nTp-7jjPiU5BsBe_JZ_enAo8Up3g1kKvUOVFlrpj8dPBJ-DDz_nipiGF14bk9nDTPHNRkZwtzjNVichOtwT6YA6InPxcuURpEwtxIQqfqmzqpDw7z5RrwcBSwWVSEkFTOINJSTRNPcZ1qOOtMOoTfQh0MraxwhOlz60KAj4CsKOLqSjyM1BRqEAYECwDFowDBoJVNhWTcioiWFRWlF-FephVIpIrvljV3N3C9xpbrh-QHEgXahLwgDrSDk5xbJp8-9vTh-XZeSmF1EQAknIGGitWG-l-UZCgD-pIAdDaJpfJGLQAnrthAC1JKU1COGLAd-VBQFmRjAwXFi5BAeST5sijAbqX9nr6HdFwB8NDkmM5O05BqaeEH5OcRs_pconNxgn8m0ZJSlmBYh19cn3dQK3F6E3dn-vTUuX6ymyeW6yaDac_E8HufCBxBP9Ljr72B1tpn0Y0Jkd3ju7QmMYEcz5E_5P2KYmjI_j4n_Q2pfH_0BgSEpJ8OErTPj1KlyQZbh1EaX-ZfLjTT_sxxSIROZpCBWw1-fCvOL1tqsYk-fAvbIvE0b_IAH7dunNimJAb1ATNY7aoyrmaiEiwanIqzuBkzpWMVNzNIyAYnrPMzztj8woIGXaeVdXXUk2jkp2WlbZ3cR7Po4qdl8olTGO8Hk8lYM_Rc3ae6dPogn2ZC3XllAwm0STWV2TCgNCXrLn2K6gzU9nJmZA6mvnrKAbQEDd_lksiBn6IsRjMlYyDIAruBNFzYB1Spq8cgNNnwGXpBYiFnRng2txuvA-NvYXH_uda8cJeAiDJzlCd6Q6Jow-D2_FRvPxA7fLfAXqmLgncrppPYM6kxtcCblkiYF_SBt_6FE7g-lLgWilUHDCsy-eRWiE_O0mvccSvMSecKuCdo-QovXWHBQGlcdcIehPBwsPC3ZAiykBVhmVppF_AynEliH5GBAp1gTmhLYvGVg8Ptb9d71GADKwiPfirzCUJWEBroQmKvBN9nnKBYkjtFU-0Y2yKWA-0qIyOE9MNbRK8WsBZRCTtM3cy56b-T4vDFj-P8pgo_pxlMZHwoNkmnGjVc59zkwJsVvPswOPbWLW6Sl0WuKNemuUOg0ZZ5nOmX2_UCvG7kBx9uHV0NLjdjwlNjtLFapneOWHB0dGtXkCZvuR3jr4N7pww_cYrj2muMiI-EvGOiI1KVFbJlbJgCZv7mzh5dHlONAtO5gGN9CXTT-Ep1_ev6QCZokw_4qiiluAD0QnSa-IGfR9ZzgBwFY31G5DsqHowcHYfGTFW47gjbIHlVFg5vjO4cxLpy0gU8O2FEVD5KU00VymKGoAg1J-JWi6DwEDUoztk0I_p0Z14iZDt1p2TOauPx7UZ4_D0S6KYzflE4sMu_Hd0dHRE8Z_k1kJlRDL9mq7STxQvpej1Pn3AdA3CS1s5uF756Oh2YKro10SDDP_O0REZUNjKWyFkBYPbAV3d-kSNzoB-6ZG5YevZULE2ctJuSJ3u0B-0CSz0q_omeNHdjQcM-eigr8M0aGF4LcItbSUxSZhuAUPU8854DUXEe6LYAu8BqpB4oTGo7uQpYNTC6jHGavA1n-pTrgZKTOcT4SQ3og9iGzakkS3BSj4cl171eVw6DQ18jbhKSlQIEiQD9uwUhnY4pB5BV44VXbIhiBZd2SGUDVN6yIeGO-rSsH6vR-YcfvMMse7hoW_fSCwhN4RckHF2iUNxKhhPvwG1K2wPa9Vjsi8eHc95xusBbm0Zbvlq5UuiSkLi5p7yDISduCzRcAWsxo-wKX6hNRdjPaba6ZefCP2LKnUJvNVXoA-vPUQVK6b_agoDgErTH4kATUXtec1j17RCsfZgWk7m8KJC048KAT-rB1dvspOXwDwL8hkw0QJKQZEXNfD1X0SBxE0Lqd_lclp-ZbUIQxjN3sVqxfTDJuAT0UlRHmfFG6A2v2K1WP9FvtoGYJi0UYTpt0gfv2igsY9R6Q8yUOlPf2nkfWv8_u2aPq7-pUE-1poDy6VI9JfUqhjrseD6odU77gqfaqigHInB6yLpjJVeV6b06ieg1BJrUoJOC5aOSmCh6hd4MjPYkMcUtRuQrucZA1148-BklOm3dIEL4DTdnIBouZRAgRExMIqx5-4swDzWBOZefQHuG5t7RaFxeTjHO5fPAIFPypSRAocLGCEOtmgMtrg22KIx2OLvBpsTSi29WM6IGNhzfMPACyfHSvRvTq3lBvlunEU33AmKbULHjXbHBsBMWWU3a-rVeOY8mTKRTNOUkTkuxJxVuG8FjeaNpZhfW4p5Yynmf7cUmyb_LeWOsWo5YZqJcYPNAwuxXOKvX9MYeTUbV6OBMmJRgviga4HQiBBxAxCBQpTiWGqlx-RXVADBjbBsqm_QaFPvsX4PDCfYaC4mmsGLna5MwyuWiMGL7LyeNRODdyL7vJ72WuhrZdppm4dfD4guVjSltHD7zwqcVAFzqKkFqw36nauTEf0jslJtCttU6VvK9Y9MDB7b7v-mwQdrDW6qBk0-YGAS47ntt2EkuKeNxebDsT4UY93ve63UuvyDDeXN0zU2f4D9dU2rFcu19GBaJkAxTgpzrdUESvVr4G5SrVlHXjOAfyGC5Sjl0e9q7S94HX52-A9wl1jOxXqfy-XQmBwEaHrQGIJZxJt6z9q9Z6b3nxs1sf_ntcGTIRuwCBJUqEHVIB9eRDrWRhWjwRDFFPO6qli_iFBIY_YbtWHwJyqWQAuAaS2X-gVl-vfarI0hLQKUi3AjwAXLGqhdbBTCctSgAvFtsva8pb2eU_7vNpT_VUz070T4DUPNXTiEL0DSbdRLmX62SXGt5vV49afaJMH3ASQcqmzwxPYBpg24z5YeJBm30ner-4S9-FNoXh2rTy0AUer19A7JGCjZ4bZ51TNUuFvRyAjJsU4J73HdRGlWx7deYHO1_ZfTbSuMbpta023DDkBNbcX0T4BoeGUP1ND3KrUIEDctOFDfImX6D948JN765MZqDYsU_b6hVODk2A29ft7V3lzQmLNAn1ghrTUqpcF-T4ikdEFqqaJqaQBLChZVOpdzsdpcSNKGwqpuqOAQBUzHkN425pjxMLpuexJfSwLdj6KcZIV4aJicwB8Iow3ltkJ_tR1_dxj5RB2HkdgCMmjYYAiAPrPRbNlgO6OdhqX-FfQNKdNEItFutGQ8z8KW8oDTaKQPx9lhve7dfJwB7sShrSRLsTn4iy3W2rJOYqt_tYN0cl9MUGjgqcOm2SjTowYSu9v4vd34vXczJrubtnDWnLXw2eVyE_4xquvArBc-K8pX5cy83PV7ndIcqtQoS1PY5y-MNmiKF34Y60VQxxKITPV63S4mVUJb7aEcRs9zKHTDONA4yeEEm8ZhwLgH_culaihs6dj0aCC2H4CR1UTt4dajOc0q-L3d7KiJ8yC27wEO6Ii6RmuqDCWwm-a0CYdf66klNLT31kp4Eaty5memoZT-w92pRwxonQAoaZXKbALadxD7wTVumluVG8aXiNQzZAGBYXqncVAt7bimsC2MbRDHo0uM3rofpmyAciL5hlutrMJjw7AFbChRzOxVEY3QWTXAOUA5PPiGMzJ2v2twJy0iIesZ7uF7jojEjtNNBCRif22Szgid8w2a0bZP1Ov4bhf7zS4ONnbRqafA1HcbO2g2drf5wDRaq1EpPIXEGz6rdpvKtHnXtQKNKtFWbwMFfFfnnVMSNniR020HHAzsSq39Y_0aLpcCya1eD_8-prFqKJKDgbmRe_73NWGZmNKb5_8PDT1jlCppxGXNX5A-JRq70QaBiDaUsXvl1V1Rh_k766t0a32VwxeNEKJpJmLo-8VUiPMIRNqsvBAKJJpW8QwKVqh3tuLKk-Ed_RNg__odqAvabSvZfGwRujLloI-EGqYks2_wvFaVntMYWbJlJC2CxXnplq7cvHS-4NwVnN-wxkqROSvhwczN6qa8pKC3ULO5lFw3UhUR4BMwGWdjpIFqNvpJjiCNAPtWeQs_22AV7QiOhikyU1mb5WrvCuJg-vlmnMOQHDQCM27Au1UON9_IQmqEKwhopHJoJwiidp_FBsOscrxGHsUb-1YFsd1b9evcCPHxQvqZmH71i4ioXi934g7WMsIGbRE4ERZVihKmU1Y66UoZl1HJg0xOA2osfD0rWscBC0D0UvaDThAFnaBPSvcBkg2eO7wrCPq5WRcN2bRftkzJgoABrNfMVeh3-h7XBfXl65QgUyXXMxJMM511UD8pn-WTzLg9WEhxIVQU4J-AZbKUV2flvIoC_zNguZzmSkx0FLhfAXMp7rsSsspRzS_wP4MVZWrOk0CKiaiqTF0FoFTklVgD5jcsK3INuWeZ-iw0Kh1ByQpzvtnBBpWYzEGWGaRMVSCAU3Ojw8xESpmacqd3MVNCfBNE_ELU3IniQTQ3RIDjDNTXO-Bo4t81z6zdOHtD9WCtMI3Xxh7Vo_tuO64UjRvLgjD5Yu3tcLyvfzggbwyxntOk_BTeE6s5ruigNYf4WlWu2iWite_rnTGLPl3LANWi7y9IPQGX5IwINgzcFcGnbMIXMjsTVaTmDOXqICk2KaB4yFCzKtNGqwMF2BtRMCAVB-dzdV5WogKAy-tPyrxRfq3owVDO1TDbRd0g60XHGBpWSZ42d7rLOcByJLgBtVS9ntXPsT11YNydH24t8tUP1_V0xoJ7Vzs6Bu8oYUuPI2pethQcB50I_RJXQjimipNVa-TGUCjRAcMm9_wu2lveHTJ_K-GjcYHtZ3ObIcntDeiwrpgRW4M6QS5BZA9gQ7Hy3PTwi13fSDKdKWBnmoQoN5t0_VHC88wX6_3KulsJej-9XnvVSc7VlOTGAKurE_uRtrS8BVcXSPmCfP8CMWFQ7q3tQ1HPC4xOqyQDDg3-2wXzyVY7QVaAKwuuaKuqaFQVpqpuVXUXfmUs_LrhupVtXRdXp1l7OC7gdNuvArClGSce8oPKtcqtt5vF-fy4yCdRYP4GDNyaVFpMtxBhCqK17zq_lMVVIxs_V15pw5tZfrq1uFkc236E4CVtvDarDg53VqrOrYUqiJoMzJXeYIJijo676qAxTVcdd5GqwSd4f875on7VFu2uW6-cqxaBwG5SlNJh2OuV1ifQqAngyY8LrIS_zLOi8hrrxtOV6PUAEV5rBT1ytZN6PTWxWh_1ZHVj3vWFwgN3_VLBkrBKKOM0yvtY4n5RN69iLSBYH1BjwcAMYi3faPcYE9HaWqpdph9EQd-oQa3YVDQG5_xVZQ3lOtS4qQFuFFC2vh1e2qNKNynQFwCG4Mbtrcu7RchQKdO8EKBuCVUXqxWNdKzOB3gUgEH3Tw8P3LxTr6DS9RaljaN7JnQGx9y4O3Ish3xwXsKtYv4b7WamTtgjpFaoXOngPV0unQmcbxLR66uaS6bO1ji4DbukSF-Qn1-_ejkwjMd8BkZibAfNLZg65nc-HE0XO6uto-liZP8lcfRmOIzwf6B8MhgOh6Bx9-etO0x9vakG_oga_2LVo-kiZHdXvvpnqL6IUbkv25rd33qcLvZXW83Pnf_mMxyt6NEqhqZf803ah0758H9T97CpeviPNA-ZuuR3PiTZ1rfh1kH3X7f-3fvhdv8Ojz98_LRYrv6zlfZxfb5XgN7-Hxj0UUJwPIO0T5du4aK0T-lRSpckjmwbaf1zK73tEml8NKD97xcx433TsjFG6miBOotBwJCNB0ecWYVJzc7g3T0RkTojmvY_ASRfGXB8RZlqeCC67iur1yPgAsgKGRua9r1e1ye-zF4SQZdLn_BUagEmPwJUDFUtXGi2q54Sor3eZYQ_HhdlpqmRR4Iin7oPMhU15yAiNsbAAObOFegbokkUaXw1_Vohem0VZRQXA9Cf9ooyChRlDIVrnRSxOSudiLnk6n6imt30g62gXzcrBohxadsE5nZBD6eMoCZIWPm9RfU1R0dydTN0Mckq4VGoyCkRGPLnOrkPvIM3oCzMAot5Zp0HthQdY1sAJNcagqU9dtqJIBXA7emDtAvsE9En4oaGjbnD09evOvt7w7Dz9s1DePlFh4DFo8N8swJ0sKesA7r7-lR0fvjzhw5AyVl-2TmbV7pzLDrZdCqmHV12gDydQBsPy1JNc5lpMe28lfmFUFVWdMASg7qJQC-Vzs7Og8hPDNKCyFBfgVnyANkmwVzml-bFM8lRXZ63DsjYL41sqB6pp_go4buEaSZhiAmOVfyGyA0L9Pbl0z869WDpWNzmobFhxYa-upUHs5RrC_83jV9b_Tu4-OT_1Eq7h5w3xsRU3Pga6PLp61eOxRL1xcqes7kyRHl91pBNU69b3MdDpTZMy1XuEDfwc1Ve5DD2DPyCFkVeiUkpp5U_DrkBIP9L3bm6tikL0ja1hCcg3tCQrWNbsMAr8jfaXn9znecqX7_Km6Dda3cwbr58b3976rqcq2KtUcuFuKFtcYnW2V7OEatklH6vp-cdkmu41hl0yzrHc40_nzf9r1LgAN7YQkBXbrDyf2-w2AKI5ZMwXS5x6Dd2-_KGgb9cH_h3Jv_SD12cZXnxT7bvst6-NROQG3rBluGGKlFVgeMR39jFpr2yhdyRmOfTjct8zU3Jhtb9S6g-u-VvvIZhujYnKA6v200r-Pbpj7CEUzHL5gX4gG3b-3364dZCgR-EmmeSdar5OVhciGnHQ-cOjG_wia5W-OZPUUP98jki02ziOLnTXo9c8BJYuxaJF_zCeIOAM3NVu1G-N3Xn5pO4nAgxrfCROssu87P5mXu9OrcW05W94sAWmpxmKpsA6fYJFDWYGJzlEqzTcTS146iJ4YhxPlsuybnFFiZWvW0WfzoW-qsQsnNrMVnhA_mpP4uCTHcKkVW6E_Qn-HVW4seM3TAn4FNcLZeu0-VycsiR0-U7F4d81gAj56DCDfhNUDswvOAlytbJ3BkHEtJyWEocSmT-Ron5m3pTKUuaJqjwvDY6ur7hIEBqaPtSSgdV_k1cKxfcd6tRStGBDq1_aF124H51spMMVP7XnEAjjnbO3TGEPUUJTSat_XUn6KvCTslN4BolRVlQqoB-Z83nVgrfXNsVaSnNrHklXS7d8v6N9g2lZE5XFETt9vB7_RLmcBh4ScCWZUaCi0zlYNzXqSbluQjYwugfR4H5Cwz-qkKq1_4I2FRc5BMRBeZvYCygAvg3AMc46iUni8_iCu2nynPwQBoETEid66un00jBlyUYJA8CMKkMAtBzCn4I-qIf_BAwYDjMVHnW-SHoS0zJwbkqHLugD_IRO1hA-IFh9EPQV1AsdcYC6F3Jmtx0AsrUq7YetjfxsvYYDMcLKih2zGKAf-thw5abnyumbnFCgGCgyf3B6_kEuI18NBymPLBfAbuf3B88VALwIz4agsWe_TJZL0v9opzms1xM-fZwJ-VBI8UUeVyq43w6FZLvDLdTHvhv38JjcEPLd1x1_DSZD7Lpb8YRBN8Z7qY8qBPs0Eo5K_IJZB_A2OynycQrxHdxQo-Mjfh9ytRHpy1Ib_R8ZvwQ0OUSSDnEgHeGO4goVzrT84oy9VejFUNWmazDneHQ1FurUntdUP__uelXb3kNmtRLRF-59Z9Qc8nqkYPhsV51Kth-Afjm11yfdkw-2h6bn6vOFtDEtxKXkK4GnyJTd5blxX9T8dZCxZ86BEhs-ikKAiC0rRd59cK7kcf9W7R8ogO_zXhFbzjSfyVFp1RoGN2BdUQ8urKDGsAVch7S_RxrzwE-zxRfc5LgK_CbWcP1vVV_WT4eSlqN3vXAtPuP6nfXGjDG_OqxdX8-cE5mmPriks7LomCqYT6hfnNi5wXkRZIV5clDWxFXNMqbhsFZLRrWYBCUoHjYG_5jGTAynbMLpq1DGEWyFrSC58I6fp0DspDRufduNuWo8U3mqDIyTdS3FNTuH5M57fVKw5ZJUCSKajdzP0kwmaZMfTE1WyVbbPuu-mgWbbkkmje-5rg4xF5sJrBrzuesoqziLlnTVWosHJI5u0jLWadEWxnoYsKDE6GN-rL3voLDtK5zSAPnkG5HJZmzCaXRxdiUmsCjNrFGhdjujH9Cy3Y3VSc5eAkl7bmNOnCzBp_GeZyTGZuDKkJhFmHmlSn0ihLK5tahZ0PTwBgF53acJZvDvlZuk6Zmk6YO450Y1T0ypTS2qmqfXpYdE06gHtyUgn-HqKuWS_UXmTAJXsvt-tB4bhUQer2JveeAMNzywN4tT3ionLXDBZ9YqBtfOI9kExrZIai3BJbRtuscXOUzUmvTFZRVjq9s0KhweFh5ZU83l_-LGDcKlbPsCoc-xAeCjcFgQD9RBmiKegHmI_b9PZJB7fsBzX7ieTQHi7A1ZwLAZD-R5BfrKclwTdgiq6JGAsuKwn4PDefOYG91GfAFhcAfzPJCTB0BcxwTq7VUMDdTvzgn-NfImQHaXKgfkdGmvTf8hhQbCmB8FYxcYiMr3FCMUpIEF7n4GsClfGB7vfOB_Du5v_UYuK6L0WqZfPh3Sm_funOS17y1O40CjYyNHgZAs1294xspN3yV0WUBHNWM64HOThoMR-2OkmFZUksdYF4BKJHCvJAeNus00s1SQNuo06qMhQOgfMqpwV9z02c0iKwdr_rZ6epFKHiPjQsBw6g_qqL_AAM_InE36UQcuNSY_B_gxwPvvLqdRDw9qm6TOAqAvR8kH4L09nJAb2OBYHmLLn-AjB-SDz_8p5HzA-RARue2ERgkH1hv_C9om1J6m9KjyvD2O7f_07kNbH8ry7hNrRuC5KiCGv9J-8tb1HgZaAQjwmnzhc5OIiJj9YBI2g-iCBWB-rqvHoAXFou1PKhd11tPxHEWFeBQuaSr8bzXC0GlomZk4ztAcrMR7fQ7IbzP74hiOdgO4C-rCPgc1YNQH71zjQyAYxqZw8p0dhwFOjsOWHWaKTGNAvMX9Xx-5xvJCHDZ8hxD_cyh1DO0W3REBTJUsSQcF4dYIzLoPrhDIWCwT3jTozc82bayVRx5PkD_IolNT5n6qY3vJx6fRxxfDIzOwdNp6oDUEFActFtYNBQ9INnenYUlDECDEakF9Jtom4lEMkpB_vfemEhSfu8tAZy8GboHsahfuTX3VEPuzE6ZCrkaDo7L6RVT3pdlK7yFMagX6JuTqV3-O1PbTiXSlle7h1w3VfclH7KcPxuHmzRxB7KcijcGeHUBKZT9PjUefh3RWrtQB6eBOdddzp-4Nc8oe0KZ3AqBNfIMbQKoMwblYmy6M44hwNBBOrtaukldsvwqhfrRrgbyWoaocGMLeucRJV8rO7CMod9z8ZXW7aG9ruvQvfPZiqk9C46-BW0tUlAamReFD_aCP0AzMkC7YWoZspYT2x0a0cE3KzNoux8GO5sg6AOL27h68eyvNu8LmW3d0DSlrDTi2DHeAhtrBtyFOf6yy-s0brjL_MtnfsP3E5kSVixO2U-21OlaKfm-mSvWcw1ONvRI2dCWduy4pqPVXs-sWmwnX6tKOT6JUynFVfGLsme94AKyZxQXV0w1FOfV3vWzeyL0fa1VfjxHf7CoAN5QQ1fbtQNsSdRO7UlXHbS1ZkEbYMdwZvwh036MtPF-N3eOqbsb_Vk0h4W6V-DJx2uGnwgNr_Rci-lrfVWgEMSYcSLZ-jt6O9J2HExq3jTAg3camjTyVikRnC4uI3FMqokqi-IPAJRX9fd7RG6YzL1LEXTI8K_BbePuBM71K6IbKUw6BV_0TwoMvcIsTa_3gCwuzy-j-eCSXeHfK4Z9zweXd1Q4KGezSuh36Nhgxw5jPriqs56I_ORUQ955diIel8W0ilQMRQw0HORSCmVKuWNAmSza0d9QveS8RO0XAF219-drOpLZiXhP48Wl_f0Hu3Kpq0jEsHIVu4qmKy5Bi4_5b3cImZw3-RQxuTA40wPAwnN58rDIhdS_gQNDINx0LCV5RqPFZTRkV9FwxczeXAwKMdP9cnBpV-VioMvzfjm4otbhAabhT8pOzfwxyfymjQFVXhWaLybZuZ4ro4cHaPOF4WCgXxT9BzrIAGdsqlbBR3_Ojy6E1M_zSgsJXviNIWq7lBJn5YXYWJBSJi_M-wbPe8mlJE_cPJr7aA6Cnc31DWa61FmBhaK1w4M59hisHR44DxPEIa0hFpMzvCITa1bF5LnZsme4DnGwtaVVNvm8hWpr-IP2BZOnvBVdZANSb7xh6HdE3YV2C2cesCb_KIHoQ9CVzHiBUvlJMkvBAc4z1hUFQV1zaM249WYyNdGTjsHmACMEuPhrSA6OUGRo_MfXmt-FQcNzvgb2CtRnFJLkoPnwM8mZfkUku3O0Bf5WQGFKYZwCyuSJc6crr5q-Mc7hgT7n8g0Al8qLjOWJiaBhlZHh9Ov7GDcsEWlqFf7FXzjYKDEeqxNwdGNwFBBrVKIQE4z2NjhXYpZfphGWoOhbDAx-FyuWJKiag1tztEVjGASg0beWR1sUNGbupIg_ggXvOSMJ6HpD3LmQ0jQdE3nigcMpYtra-DqgKybPPE6UEfGQSFANk-AK5wmcYfsVHGeV2Ar6mErRARuTx6AGIp2bJS7RO1bmFr0KaMP9eq9nevao-nECznpkhD9wjvorUYZ4OXrdp0eRoyGOiEkA3Z0PRxUzmjtAtXSPXt8-iiz54AwfYPHAfwJloMGboknDz8QMDpYtoM7CGaf_2Q3_WTOmhg8FocDoYruO8KCINI6gnoFWs3Gj7_1amxXERxJWsLF-jXVDU-Jej5xyOTOBCyQ5Nan4XL1uDwgRAXLC5efaHN7LoU7ik0hIcgI9XbaCUtRcItQEduQkk1-N6i7OCbV3rmzCz9dDIgq_VBIs9CiTRoAUA2VWoR92aYjgitB0FcFxeGPUzIEGykEioiZRcOejHvxVgT1EBXTPFJwlgtYEQs4KAXNZ6cfeNfZIbDPrm9k6Bo12xTYTcqKuUHvzmbgyq_XZ_cjOc5_4VwUq1iHLz86VkcO8OVWiOi2LaRSKbWYfhIfgkuZSvxByDkPAKS0ctpagQvBWPg2Y-QWTCoBskU_RNOY-_vuo9vMtBiCyfFhOxX30uiRfcQzlFNx_8PDHR49_evL052fPX7x89cuvv71-8_b3d3-8_zM7nkzF7OQ0_-tzcSbL8y-q0vOLr5dX34bhaHtnd-_u_sHWR5DUWAef7hI_TeR94L-3-hxSsL1kLW9AEEeNSe_KheXoq-lQgocgkah-Pz08DPeW7ue-_cWscY-8n5BwbzfcHd4d9TS9dy_ch6knZLS7P9zZN0kjk7Qz3DZl9vB7b7una-mjt8ThckuBx_R7RptlAJKrh3YO1jsayREQ3-KbZgJUmp-N8RbwNpd634hPt2-T_M7Ockj7JO9v97bpv7fpWB3mY5olst9POawcuBmDAFPp4eEIOLitNHrv3g5ThzmGpMEqJNztaXp4uLOp7AjK0kbhbSy7t2wXHNdklfzIF9ujKBmFe3vh9t5oL5Qs3Lt79-5eeCBTtrcTJcPLyfFsdDARO_s7o9Foe7QrWTg8ONgNw73R_igMZcrC0T4U3JvsjUZ3R2J49_h4GO6M9kbH-6Pw7u7e6GB3srs_lWx4GQ6v_1-4fSzTFZMgYOKj3T04v7dNuMZMTsszQpdDJt_yhbgE9QCj771oaCJH8gVrfDxecWLixtZuv30YQkRFz-aFzs8LYEmsibyp5aRaYbTz8ZupEyRbUR0h6jy6PEefxJ1MdrAiSKf9CDqueSN5rpx42oTPWTsl4Wifop3--ti8IQI4aCp8MIsxBBoriUiKlJrwdWVDUSYfVPPjDBsG92K1BK4EJxyGzp-wYuzIYhdey-op1XrGFQkPRtR4Ahq3dRIrIuLwYDcKD3ZaBZwWVa0aMG4pg3rVz9fZTNTqn_HwEF1THPJwdBc0F4a93tb26JCLGATt0fDQ5I52d-MpSUbDHcAnoq1wtN-oaLL2McvV2Nvd3bZ1dpm4d--eyd7aHt3d83Xhw9Y-aBRybeyMDnYO9u6ODmxDe1hmtIN_wr1ms6Nw5-7O_vbejm_bp5gOwuGNlV13Gy6IqRoyIG_v-OHsUdOSNi1pbEljoX__TSEY6_Byf60bN-brOTGpyCgMKbtAN2dTCBQZ45DC0T4bNv8_jZLR8C4b7e5-778U_DlJLo1mxI-ZzoALRAyfGW_Fg_lsJhTZRy0RoZFhsrdD0HNaRUbDbcqmZO0iAZsAlYSaZ9Lp5ZEJOGwhbed06D3Hw2-Ipi4P1Vga52Lh6O5h60UDhyS69o7VdrOxNhbX6G0CDj92KEUvawXwx_D-Gqqk_WIWKN0pDwEgZEkOALzEC77A5NFwp06_d29vGR6MfPbu7uhg97Ds9crD3b3tkXEh2O8X97hqw7O3bx5v7XeERI_JnVyCy2Y0R6jmSpUnoB96nuXKAqz5phHOTRfL5e7d7Z3tw_n3OjA6m43GvSJVZ3gZ9Oe1rW64R_tBJwO261RcdoJ-0Q865RzdVKhMnogAorvg7EmJN3uvT0g4HG33Snp4GMIri19zipjBcrQzZPVyhaPe3vYyHO0bPdxmxnI02hk3FtYVtEl7270Sv2sjvizKmmA2N8fOm3gc8u0wrki4N-xP4LpMDOxKRuFdNkmjiQNMySjcZxO8kxO4OOEBfo128E-45_PgsBetY23jI1rTYYSUAK6jlu4R6OvGHhgrcJgJhCggsYTeCcX2GM1LIO1FQ8GW0F5veIgsm8MakhgotINXWN8AVVyt8G5492B_7yDc3zHVzM0niodi7_aGDhFMjZiCBnfwzx5Th4eje_fuDZe6AfRu7JpMSRIeHLBw9E-6Mn2Ee_hnH0I1MQwji_sYrWME8RxFc82lra_6mr4XZjwssrNzMcX8mADcmXDROB72JQsP9iA-UjQlhT8S4cFdVuCgijRKwoN9_Brt4J9wz-fBkQDxMGn1_vSGUT2VOty7abibc55KvT26qcrmHITS38na2zErMo-aZ9IGajUGk95pigmzqvv9Olcf8nAXDvpovw-RxIiuL9Jo5M9ClIxG2zedE2Z1H6WJpuu7A7q0BO8BJUEHb41nxNFg-YzkoOUE_w1ygxYCK_M346kWBRb_BHUEw2H4BapvDv3qBz90JpkExcVjUeORqNe4yUPCDf3HJbkpi5j4ONHNJTB8jvfE15nXpoce8_Q7sLNzfQeGrR0Ib9qB2oErRLY61Bhdt8QQurTuHRA_eMIcpXaY9cOmS8DR7bweVNYPx1Tf5iPL-Fp7i8GbEQq2cwinpVZ5AvaJLOv36_6m1_vzfqhv7tYvzH_Tu_UbBcE--n5p65Fc-HVnggNSFq_hfayF30VE8_8QpJWy44r0-4I2cUTWyBO0WZGOpyTZuEc34aiNw6Fq00-FeFMjZq_TagUBYhMENPC6eB1bAp3q5bK2eGwrtfxTUqxzfKVFB1_ljtFkBr24uh8KRFqDaoTbhdY-_6g7c3MbXbQbA3VkcXaur2yrNz4XRFxDFsGZ2jXKDx1Zy5rso9ZRK7qkRSQGXLjXFhI1qZcTf3ORDwDDcU8zkEo-Ds8Y0dx9n7Wz7bIqooG-wpmEOzu-xO6BKzGFEjs7psRe3fxB6CODQok9o7MUHoyabpwBbTHJ25i8ceFxqQGN7AwvJ2FnBvIbu7jhwU6jOWPAHx7sNtOGJm2v2e2cbIUstC3cvZYzsjn713LsNA8OmjmTurXRcHgtZ2Rzwms5OzantSQlccnb7eR9m9yccacgruPddrLrda-d7Nq-2052bbdmnPm2D9rJtu1w2E62bYdhO9m2HY7a87dth9vtZNf2TjvZtb3bTnZt7621vWfTW9O8aOxTuH8tx_V8cC3Hdj5qzXfaqDMKr-W4Oq1ZV80629dyXB1_zUa7u_6Obo1292ywLFAFLguIpno8PyHBWXVyDtqTCI2iAEjjTTfIGD_8gNr3PzQJLCIxchKiVqei88IYAP8CTR7nMlNXxq0DMfCnE_jnrh9QB3ZzedLJDH0GhNoQgOJod3fQAS_otV1PDTUhiJcHVBmoZXh3G8hTBb9f4-Gh3toaU4h50QeAhWosCMoosBx66IV-iyPnLAedwEhxom4j67BvYZ53_ul7K5q9AfZhu1FQ77a6uWLpFFcVb_ErxOAYnzMm-2IAU3yFQk9Wu0-Ufa4ZHulYASliMWSj_xjtr2UggwMyrBi9gYsZ1XmMA6A5hJugY-BceCJUMtlf61a1sCkMxXRodHMKdJ5cr8RiNR4eClyKJCc0bT0rLRzpe60kqW-l8VBdb-Zi82Rka_BkPV6aRlsTQwz0uUZGDXUa3P6VA55Nhsybg_Aw6_Wyw9FoBxE7dcjlJkaFjR3V5ISMtvC4Vkb-g3wHTrbDXoas9L3tnunPG_SORtu2r52h76sf_sPetjf1Fu5ib-FoSXx_G3o3kXNH2weu_336vV7n8rMsv0rDnTa9QkhP5MRk3-HEIKBAGIUzG_3Dme1smtldM7H99sS-N1GIOGDJDJr3-SZJTUbH9XJkhzwMw50wDL-7GIhYoEbK5vk740CoFe51lMgmpzCFLcN7gogKN43m3r1wuASO3B6l_U0lkE-VLQ2nzvOVcqA60bdufVkmm-4cXJoQRGvzBuN_tItvZIvfA1u208Sn3aPCCShDHh6OdoDDQvsYShpkb_5zBPI38yWS7ZR5--9QbN82zk73N7SsfMujdss7rZbrfrZTIDbAeVNNm9wmsPnbKRbYaQ9ztz3MveYw764Ps6_uhMLgBIiG3Dzaf74OW3wfDEHIPr2hs424LL6k9iEFg4LMOE7AtxnjWgINtECCRjMoHImVMX-RfFFLtnTT_Q6aSOFh1j4E3mos3w6slIxLNI8g93mdRnu9-4OPH0X1opzOQfy17lMZrBtffZVOtQ3NUch9COaOXJCAxved5mZ0nzL5hQe3lJgFTH6rtfgEBOc1wYC6nD93XEq9XGomf_ORyoz-p9Htx2Bl50ponc-uwBlo2Ijdh3rYppoJXQ9StG_g64spGldEQiA80AayrtryLsYftd7LQTSdtwLPz1E4iBmgRZWDDYnwarMmarh3JC7QXGbdX_Upum_AibrT9BzJPpSRoJb8QJegymlcuqI6rUkgtY-Hyvq3tuodhVWbzZzSQ2YVpOoANYn8kgINCX95YWfi5ya_pGB3AX-jYjU2QdYFpc1AF6TWS_f-7aljSqBGRR-AC_BkAJMBwNpFzaFNnE5H03ZxrZfLhkNw4jmenoZ13uIFrXUIrN6nsQosjWoScoNwLdYnqECjv_alOm4pva4ZTMTycW3qUKE1u9FqoVFD0bZh_cues9HtbldStiEXGvAF6ApcTNSKtrnbsLwd_RQGy-QvtUEi6gBC1oU5mvIL-K9WvGHPB_bUNMEsdEBDbCnrV1HbLC4o_F13NNVcWoxuAIvbRdVmSVBFzTilVRjGNvLBWiQxNhubVJBRb9ARH6IN2KBkR4mJyC-AXcmEpUEoGEFNPlP2nLrocsI2Ll_8XaPWF9HftgvezuWPRumlNulDtfoFqt2gK0kDG3-Gb3CybkIi1gFiIYwkqtoi5MqMQ5yhDX0xh3uLC7PO1vvZy_hA-3K0u9tbU7kB367x5oO28YDJ34y7EVDXjMzH0DgzhPgazRhrdhl_wRNZu2qPEyjlW4HQIUZBJ8e_aUQSnG26JgZ1-pQmFJRkc_gHjOXYlA_ZBR-yCR-yGR-yc0ic8OF4ckhuito3nvX5eTJZ0waa9PvWjdIpcDRh9SsO0OA8ZRdA7_bIlM8om_CtcBVZnccTBMouu8-3qmTCyaQf0n87I7e0TyrsDI-zC24sYjfBUwIUYri3RUjNx6b9HfrvcO-61Hanr_s5tYLg7bHVojkh8i-4yYb4AGmvS7_4EO7dln8hxphT5GY38ozykq03zoEycno_f5GGEg76LGTtMRvm-Pb4hPhWwMVCPYetnS1CLj7U-f8O95bLcI9iADl3qdvTG5qhyE0Ca03Hsh5-s-H1geJt29tpR3BoMfYwmBgH7WMa7-1EmsGMkgJOnvwIAbvM7GqFFv4gP3kqwYwQRvSSlIwUH0xaa4709tyPx4a6MTolxBa2GiYvnr78-Pr-40cfn7588-inR7_RfvHvtRL3_2iV2LqpJlidespge4-uUuOHJPHRLOM_IvmKkoLUd9aEUnRQT_5CypvYwbFA79UCzH3jLJK3UJBsIOba9aUrG9nNUsT92tIM9BnBK6eMDLdV9noYwgbwOoNR0Yan-C6_iq-iK54YK3ILKjFodTulgZCBinpKE5n6oCpWYRfibcsfwVrix7W6DbCLPi2vFWg1zvRLsD5Rw8FkrsDo6PVE5ed6UKkJC_4FTnvVnJsyRM_QBxAYPgRjUP39mesZGHfJ51zNMc_FP7zP9QmRP7fi4hp_kRZu3R9AzF_K5O9oUk668nldW0Btcb1yK3gu1q_BIJjuv8v1KZHP0ffMExOT3EZd1a8IqOVSdod8IDE_iildkg9HA_h9h9I7TP7szG9i9ElOmXyCZnrgj_wiA98k8iefcCY1JPxhnMZCyryCIs4cnrJE_snk-5TjHiXyVyaHKU_Ue6bep0yGgHUnas7kbsoF2MfIHT9WS0VCTNjqNJ9pgjF3Gu81EEuNU40PdAyJA-dMEJ5OjBnsm4g2ON5rRhVWri4ast6XHeyqU07wWEwD5utng3wKhTKG412xRO4zeWDnkci7LBf2I0eLnDxHn8I5esqRByTPWV6SLrrOpCxHhfk8wzIZ73bBsuwir_LjAh3G-UCTmJaDn-XXOtPQVi5InrGuYHlRN5dzIvdJrlDsyqDFkOUFF3cJmD7npf8150RWLpJkEoCly2k-RU_r6BI9YMGxmJVKzGVRZtPAhJbKNUEb6_Wq1Wn5NWAB2K6DhrAvOzRlvd1iUE9jcorqNQYjyxUx4-31bDXKrq0VjrtyM0hYfuEWesK1Jgtn2I8PeT7v9fILks9xBSoz7FlDu3qHlc4xdTavQB8b4MF9tHzoQm1iqw-xOq7uZADOkTOl4Yznp-0lnJUTcPAaGHOqIAUXKHV-cFzMlZltPgFzsRNQQ2wvjzHoTILP4mpafgU_9tZ2qf0F9jZr_dwnBrnLKxzZCbC0r5ytSH5mbHAsnXkV51eRek8o7Qcfg35-DCt4bCN1HsBMt4iPOZ5fDSo03h-yrRFl23t0uRxS2nqcsBnS7-cn7XSWv_aRzPJLvsinUX7FTkWm9LHIdCQOIOZN_oYvkEH4JjuuIlueJEl-xfLLFFRkrKWwz1yxJH_K8vvuzuWPWP7SHYVXXL1n-S2DnUMPJgR5_trQtIX1ofQTPHht8xw0LZ5kk9P6RzJM--5nmB7WFj9ixfKPbZBlevMKsQ9NLAmBblCxBQ48gES9QvMxqMkmxsEPuEG1jnwizcAxIrpPGgYrJDtZ_ldt2UcwmrpgDdLOe5dBxjbMDAE4hOU2kzbeyAy8w7AeYcoUwzgvGKLcxEBn-UNeM_EkEzz_C_gEjcVxHh4Aeh4QG7UO7GyMm_gF6DX7JfTTXguq3jC6w3zsXbFtsQ2x6pjSJH8NQiVAMJ6b9pmx5Bkeqt8HExsHzdlno5k59VpwvV7-ihiOVnAO1kUBO8-uAIJBsBMJPeQviXVvz5BzhNHYlZkEy1-bSEMAXl6knKi5szdYyH0IieRseSAwuibWxdVrXarsBNW-nmpxRoKPYPgRgUMOiALM1ooZk7kNJeHStgz5m5Yo6BlWRuaKti8gKltoNZcTEgIns6XE3i47OM-mrxGEjVgANuz1JSUQfv45LL-znTLm_ButwXH1QYPguskMnC8Io4GXDBoC1HJtCapNK8UEgWuvf26OwTyI4mvDB4AJR5AafgjeecvPgRNI0D_BP-oH9p6yVvkbtwZo_hqYV6Z44O8h8grHrSo43s_iarnsbjj8RAyk-IpsSMDsgOUL7vpHKTATgbeVCGbOceZPcLECDaLgy1wojB2SxWqQTcBj23JZH3twDuOrJLCYbwYewOKG5W8GHqjSdAUcGedSJoPIvKbNuFXRH5ICoUuziUZWmLYOlElQjefO3UocPSkBxuifSVHHmkjUH-hkGXYGYEGjH1Y48FC4W1zefItD6AyAg5kV0Qet-TABrRSAR90nxldFgZVWzpBRa2R4QLYS2fQqYPkbPG9bo12g1psoh1V9EQgXt0KxM9bv2t3VbDFg_YNn_7XxuCCx8H5fDvwraSBtvbs4Ure7-SW4o6mxGjAQa2AzY7lP8AEConlzCyLOL2v7aRETVaM4jV7NkVtRij4JTk4KgTiYdB_CyBJQmQ_XCB5jeJofs_yLe5q_cUIW2tqyaR7W1myGD68EMhMjycNh01mWjSKuYjmM5HvavuBrIFd9AXib8SErsNb3gIH6EjBo9ddI_kkRIsBa93WT-2BdPIEvJxe8KYx8vMvxHNgrxvcTiq-BW9KdLpcQ6f4QsQ8ASICcWboDi3myYwp3icOF96z24aFGO18YKyB7F1mBxxDjWN4ZUcp-JMqxgReTQmTKl8v-FpjB8tgDfsF1CdjTNOWbABuEOKsrIVWPsEx7sLVcXsBZKYsLQaBRQHCKRogrTdlFyowvrF9UeZZXYqCyiUC7X_TvgOKMGLy6wksyJRRFT84XSAkBb_wQOpNyXkw7Vlc1m3gPnCsUN-W_WXdcKOQ5FtnE8V3dEZMuog885Rj0MBx7OQ8ULLl73ksuwHVHfA1m5yAm8C7QgNdRAp3wAoyc3Pmw8ZxgBXJAszDebs45f47xminrFsaSW8byV4LhzaI1niwEW0aui3KnIjfMV_EbCZnxieZC0Pmgw6AuEu-AQQ0prAeymUCn0GxxJvRpOY2coCn45dXrN0EU_PToTcAQCYsCWW7hrwCw0ik41YF4JEEuJ8UcyMIzEPQFk1JVAaDwU-BKLAI0H5V6C5R6wWpeXOo750WWyzGaXFRC87wqt_b3dw-2wmDFgMCJshWl1llZbCNHX5K3NR9eieq8lJWIOkHfTKQYQMvADY088_5rpiT5ZH1UggIQOnezPhFBy0drUIwEh279cHVne_CJ2sOoC9Ccu03CPrLL22Iw4y1wne_uhpE1rIQojdZG1whmYq97AU0No1qw4a8-yNSj5_D8fCEFZeIS7PMjcQlXiY5LMgR5gMwu8hOIVj2ohJw-wFMNlsria-dBUR57yWGSoZm8A_B_swsw0LckMM11oOXaayOy1pLAOmUCSjQAD77GxRIQnej9NEhZ_iMy0vWMBTakScCCfOY8kr7OTdi2fPaylOIFvvkpyx_4SiiDBm5DqbCg1gWwmgzxA0Xf1bTj89rRYv6k8fsnngzu7rLB9nbK8j94Mhi5j_fcBLHSQyIYCCi8Oyf4-VlcpcgrFXEi2Cd0swesHHC49wSjCk7QW8dWlU9F50ycleqqY-IZqRlpMOGqyak4yxpsuDnykFb0E3tmIifmI-tA6D7gIdI4Z0Pj-OAUBNhAnoKj2n8F6K2kqwf4-BpeXvBXdpFVyJEE9wz5rmnLqNUrLl9DM8dzrUuJDSnjWYk8JpoF9wMWPHj75s2rlwFdLoOnL395-wadE_V6j4k6QE8AcGupbwI8dR6f5RrKQxS1J5Tl29apSbgu6Fw4_zLe0wyDcweBYkjt0hsnqnNdAAbdcGtkvOXULE9XNANZ__cLCuMZ5I241NcLsnA4pAxWNmpUgO-WU6U6XCSERNIx-nSpvQnlO07y_tkB4M9jF9UNkMyUGz9IAhicCji1LaZzEqaoXS3eE_kGaVl0MoDSvffQhGWIyh-9yLArGoxp4IkDk7QrmNwlWNgYCY2gvaDlAqCOE2JkiuA1FLxQztg5O2Un7ApeHVMPLjPgRmsEOSz-r4l8MwDr_iZL9KNhDKA8f04yj6JYd6VJyubXQq_zJ-OSi3ekZJLfa8jH8zVXKDmX4HoaImiirofEZtgCnXsIFX1mc1nNj-HwHxtXjYo_W6EbOutZUVo3TGA5Q1dGcnjBSdvNv9ZrTlWRfZK_q-kN9ExjaA7jeRM9OugUoHDN8TCA3ulFrIBbASSA85TU6-kdaFUY4bzxu01tUGuWIU_WORjxKDMTvd622AYfbIaMfYQze9eMvEeafJ6awUNrfrQYQcfwkAHlBnoUxhENOOkx8mQ8ttIEbl5RouOFeXsjdcv5osbFX0WNDOc_FLnc4DWdLU4E4On31G8E_bMyZTERwJqAqAHmT0GQTbFckoLDL6YgSKPx_kndqNHowMXReiauwMjQoF0O4lvHqfpnompOF89vEcO3Q_NZ--qgfuBaDE0vKMnR12QLRucGRvtoZqjbUVpFFMOWq1fBe9BmKA-IwD8r4B9gBoJuxMGX8g8Qr2js1DIB656Bo41eT9ft3rDiDQVCfHjsDUswjEL-IzBPLI7qBRc5AsBcNyaEFwjE0MCTwuOMPEbPSAwDz2mc1pzGqfMdaTHAZMr83RQDrQsa59F1t6S6SCEkNpkjKxP8qKWUfX-eCujGDUWaZwyHXMcrBrYkBF0A2rfgtW9Z4vEqcyNzEH4uag4xHlL9MwF623CP6Mq6n39tGFBPp9cntVagKWoDL6Y1r6SGjScCHK-hXkKSNiJ3e_Gp4RMyNd7AOjNuytcc9V6XUBHJq0SnwENpb7myMBPu_MS6aJbM7rz0TkFXqVt22wxTz-CQrSib-BXV74gDblBS_0wmNeuN0gHG-3STMq1NoLWhaa3ldNg5hY_X75E9DCug8yib17zah2ROWbmyXrOdZxdzzcHXzjUv2nVA6R0S_O42ZoAASbCFd0QeaXtl1YpiZEMPu6q_h13yv4BdslZGB3UW-zbWgAyPsFVracEzIA4bMM2rrCMCSkjrwiPPLLZ_rzuvMy54vTN9l1GDAnf9185YkxVvSoBkc17DiLkHIs3ZmyQIQF3LiXwy7YcUQU47LEIdLsEcztxBnTkTBqgAbqWcpGS-ARahhMCDGuWfMR3XJwwOmw2bYCBPdANIMuAGAFnhZDIAyPQLWEaz3M7jtTDJxNsJbghiYOeOUg_7cX2NXSlm4fsDZI6vKCg7jbsX_f5yWdWmnfW9PDH3skJvx69QU6N9LS2yA7d87JzZx_oumbIEzwDDCTm_gGYDoHDrPF2LyeD33k9pBWtkQYoy7iLxZOt3ZOoI3y_En1tyA4yuDIye_m_C6A1wGa1cWeC9qA8CCnRxY5kgEjufwkJdHPJtdA8Ja9Drkb-B0w62eVLk7wA67kAFDuTNgmkPfd1VL5pwsDBw8J8CvOr7AK_uJH9MSGPxxcqKSWpx4nujVXgiNB6wj0ZCCsQrplc2_S-fbnx2N8buJJLuItmiZn1SfHCyFSXyCZvyRXZ-Xlyh07NHEHECthPNrlsucSEWLFDg1sez--CGyHNlfLA7LOS_jNiXnfInzLzIiZVPNunXmqCEszUpFShVrD2wmgkMwPOs19OPQeq2og0BcOMViGrPn90c3pLlEry6g-E-xCd5i2GnRDPklOF0fRZXEGMKFBBbhIuEW5W3fFd6pWlW8O_H2GoEjQWSwESGjcWfRFsGkXFS3w8-egGpnpy-8Y6p_WqvaPSWBK-R49MRsGM4eNMg8opKQydbkCy28Xw3IyOg9oQPeuHfuGsvbrbpxTWAQxj_eKp-Pb3m-vXH2OuY41tDmfjTsj9xPaKFCZuL4cYpE0n-3EbHfkfwgxHnO7CLNpaoXC4bsRfHXiU8f-6V0sSfRJ0SnD0Scgt_EqPGqdxCdQcE9_425v893PPMbblCqtdxvRezYl6dGpY3pkVg09joK2uKVAobPQvJYf2H4WX8VwdquRR7pGBNUlQpogc3XO_mJpgGzCYAwoHIPt5UGMOKsm5em0GjWnGGxI30MEfsGL6DdKElQGq2Tq3PjV5kBmzVuuaeYTUI6rX4rZyvIsBBNauIqkC7SOPfbdgEdtGjpG1rudTLZbg7HB4qfPdhJbOacsfHRjOZcl1rhYC_j2xgVeoFZXn92yOYoIsPC1L34xWIe70KvZPWs4b1b4x5RRke8ahCZ5K_4LPvx18R4565NUslTsBrr8Itwwrmwlv_m6jTvTBOmUCp3TiGBa2oVS14AA5XGybVFhDkGEwGvnK4arGKjpOvKV9jkKABWklZZuEIcfFQG37o6zgvg7x6WEqJzhconRJLQxubzNy59k0Uq9Laf6nYJxBhYgoObmEY5vQD3-AFqVjN2mqAsgrklwUq6LO5u-uJxaHmKSwd7gdl09XKvm4Qmg-1Tc_5kJ3wU_6MXcGyfa5VhfIZubKGOs7RR3jYUK3pgl7OcokqjPB2Is8HYwggw9kDR1fAaOPY_M_girVhRaFoJN-jpavhIUn-zMbME-_AS67hhxtDg_fGH4aDsF2vXI1VMnDoS63nXy7eE3Rzil8YHOHE-xmuaqZG9qhhpyTfDJzrUy7cT2Yav9Usx5_Y1MeNVEE-U_bMQdyT5TL7C4FzBhhH_CRqIOvPQILiL490NtTiiZmuqbEVDocRthFv7Q6j7IVNjA6Gt7td9QuSZLAMs-WyO3MX7jQ-74fRzFlgDJGUoMa8-xytFdT4_NDlj8-dy7UzPkvO0_EZxGLa8GDBnT8zD1aDZSpMJXB9RoJJeXaWQbA2AYjNM2ZGOME48MD7ceynDNA3emFohj8MWkcb2S9MduWyq3Y2LAgVe6QEaGq9eTeykfggmltp5EA4EA_tzM9hjyxntpGVTy17kuCLkTTelXOVlyrXVxgKZjgEJzB1RRDRPDGqIZYZUQ8Ejwacifryg86aZhl_ZsJKMQ1RpQqwys7WdapQd_1clUANPjQLS2v4UqN-sYyeUeOOKVsuAQG3Poy26u1gwfMyg_htftxVFDDUaYG7lYxSUBimqxXq5u-QzwwjCCuZFVvChMoDgm5lAYdEjg5sav0awUu_WlkPcj4KE1BNm8PZqV-Z5ea7qHa2nNHsJe3oSZ8ZKGYGlvEOCqFnhDKLdU0aCMQF-_gxr95YBv0TiNzYjo4XNqLjgQgjf9R4O8VDkr-vFe9wR5dLoCZYkiwS-UcamXy9nr9iwf2iDjhTBexJimRz_pTUMv9GGK5ibBV2uAnOkQhWpC54GN6MxMZmqUNUAn8i-J9czsqAWQYuvI_shoKWCdwsaxkav69S6txBAzI4XcfgAPi1Uxiav76thLp_IiRQmAYIfCYPnP4NxMr8mJ1gl6dZ9aacT06j4WEtHz7LLjHxF1ARrjDCJjYW1UV8GsNQPeYqvHbn_rVH-1mRyZM5KHUDlV7X98ktehqc1Nfhb7bqUN4PCJwr4VuLFOIagLkyiDSaqasIpf8g-JoJBcb6EYjqkS-Tn4lvpRTRIs9kFj2VuhiAzTM4EXyMMUkJdcon01coC6sIRWT7z1IKZuIARMTZSlPngRAaNf4yQPd4MBh4Zpj61VN_vw6qiRJCMhWThYlWoFx0gpyVCtbp_2vsWpfbNrL0_32KEJvlNswmRUp2YoNqsxxHjjyO44xpJzMFcTwtoinBggAGAHUJyap9jX29fZKt75xuXCg6iSsVEQ2gces-fS7f-Q4b3Xqrcpmo_DiW_WcUgqiEzc6PVnqtTi8SyrzJ_z5odIcWxP2pJw0MYC7jmQpj8k2tedgAahHkx4-fDifedXYeJyjCcqxGw8PHE49mX-mh1GpxVWZLuOHwJME6Wua4Gvfxc3xnkve4pnzweIlOo2KulyZItls_WG8JkMAey0RqmRPepj1kYfrKC9gbtav-ShS-TIUPDWgoryCyoCFPCRGzrqQlPBI-PoT25ZUg35Cbc1xLiiZcQjLWs74rthwYaHY1_ij-DYosrhRV16VCfAYEM1awfeV9vbZScevBDgdKjg5CHbbyEpQyJGHLS52CX5nZtrKFtXe_siK_gMEu46eqTsPdN4fiZ6oSHVz6ih-EhnqOwrcy_rYy5K9qXxYtzfDaxc_s04bxU7xwaJxlt9s8FKLMXiV-1nC0xs_I08o-dUqzhEWLkhFiN3EYwQUWkyUIOCG3t1IbJFn4EuhD-purkQx1LLW2WD6dNKqdmm-Rw80FT-knEpv4Z3yJREj6ifelcyceiIoOA4EKeGBmBpaezia_UFNuGesIj0otaaOFK44GMTXRfWdKwy0a6kLqyN3qTVVUueRwx4IKl2ChIUMfeEHK05a6LhcyNaXUizr95sK4elTFd_cfGPAgvJjqRnkNvmt9aSn9-P8WPD9YpXFZAHhhCFybpWTtSU9HEaXNUEoHJ_AzEx2d4JwO7iQ1PLZ7JnRm4M6sU9MJQafvK16Blp9y7mr--fu8mHPGcvlSX1O-wR05tZ6XXOKq0wHfz9wlFNAs_qDqWirNDfgHP8NS_VBfUn5wF5AffFeEAu_8vIqio8wyBY4IlWEtLXtSIF6r-ha73fJv4jVLkt0zSDLoW1vZpUHmw5X1GtiFYeWPOmpkVBRSw_XmnmVMLPjA5HFZs1-hN8eNV_nQcUIVVW1FY5iwqzpumVOpKGSS165G5ojV-T3l7bWhLrvHLvPsOis5hpe69P18kgfmjdDSNKpU7Z6LuDRWX6q1wawJ9g0XSl-zM8K-XvKvJJIFdtW6-7bJjVIQNMAVeOt2dW3Imscis33oB-VjQfH8o6iiPGV1u_DoVS9kMgoOMULsZd1QcH7zSeIGSfOGJJgStkR9Hc4AvogHOjfQ368IYZQb7dEIxf1RuZuk6R3K6HrQiD3XbXVd9FoC20JF_ziV6Jsd-g6A6d3coguTbxo_VK5FLL0DAJTN4xYfBp1GbvLNJp6sq8FVBFri1KA6detGudRXNRJOT1VI9zznch4owg57zPhr691iuQd8yVOh5xKQEB2R0HsyHPo1QF-a_etLczHmn1Tmt9zx20-ZqpafbdrtTtk2iSG9JnXiMH1mq1nGWdrtLqArB6J5uCrr0TFteiDLAXtxqRIkmSmDytklpsTwYruA5QSX7NZCnmEgPqgJLSgI6x6TwPHVU74GFZW3bdZ1syHWMgBHwR_3UOrzL3UAhz-ffNPtxp_-6GSrBdy07_uLD9DSNv7gDvAIe8_fYxFtW8Xuyp0wM0rCnhf0Shr20t7bcM_SI4QbOFHkAl2-8ZtpNDKWy3EaI-l6LucKkHZ8TYbxASO52Yg1A1GDUhK-BwFlZERDIS8vROuUnufJtS36-2JVXpLHgZ2fU2XtK1u2tPbbI2rvlLmALGLUNEX6IrCFJWIml0F1GWyRvX2pi0YztioxG2XXOk6h3LbvFx0zDQDeC7bA8mdbot6IrDWwKAXpjfBltLLxPp0JVwsMSRdYdG66XTEdLOK8KD_oc-A3bSv-RLQT2n2cXvysLwzhOz_94ci336vXiyAmVXnffrMUIQwdJlh61yaKV9ee9Ob6eqnjC0BKka-KFpah3qyNj9mJNRhVswuITE39waq8piq2-IH4RWhmDSfOP0QSeqvy-pPXQ5pZ5cOhVDnDfvSOmDZEDawnded3u0uTL2BIpnMGzDW2SdljYpvv7nGC8OoOPF7wp4PcRDEWCBQ1d79fZqu0lA-uh0qKXBj64OwTiq31kYUh71yCruveVKl2Vuq1-8EUe9B3fS4UlGWNGom_FvEzvxEa51nb7aa_1AnHzhzxaXDgw9sOlu68JVzLeNoEoAqKEryOHh6ElL8_MmIq3UyKpXpweZYuhHj_RSz5ZmAhwkv23h6j1jT1lm4iVY7SNU2kShDkkicLCYLlDouC3CsHHKSZO-qJdOIFXi9FoeWqV0ozgchoLlGpTN03bK1FYurXDV-MsEw5933dnNKkuWgtpn4doEq_JRiomQhdon5ir6dzP9CleENqYJ28s8yWNsGROr5THnAE_UWW3-o88uQCGRTQYEIPXkSyPIiI3Zs1YJaXMZKA7kPTUx5xDXizcdU2qyMZNtYn7D54pu8awxFXQ5R1IRCUajlbg1I916-pBKwwoiTPFMTnxErjJLuIU0-65qA-YhvUh2SrEvWkT33p4vfQdzrTzSb_nvRbYXZrIrci3aj-R0fxuK-Nd_K2SqtPOU2soVLxa6qhuWQ0UhJWYchOe3demPwGVYYsnndPtna1nLKeT_fkh_HpzG_mRyeJBdr4thw67NJUiQd0BwT5teRfTZqDJ0OZ6wWvdjakR3XajmE0lMdmUiLmE6OaNEPA3oOVoYpYCi0TJ6z3o8uv5bm8lVdyOk5QzAAGEj9aUmW6NIzAXTtAtEroNu2VclBXrisaZeUbWs_DU2pTCs81iFMSHREZVlsOQdQZ7u0vAYar3bqHdc04Sry2df_ywIT_nE2Ik6k-8Dfr4uj1cp8pcYK9rHRbX2QsqRfqDcUIh_Je7bqwY9lwHwqXW7aarIIV87TN4CuMMR_DWn4MG9X-CmhjRJVBTpjOCP9xuaTya-HPxjp8PFOl1OGTmcqlDr-ZqXQrr1WI3XyMPIc_BYmet6ru6kr1R3KqqjjVOxBTfrHUba4eFnpN1J4ar1MVpgJ1k5dIzMXPnNpz3jjPyjK7drtQJFfm_kzeqWl4OOtPaZVS03CE30czeaIWk_gfQfwDyp2fhMPZo-T4brPBr2Nxd1DacrlEZtHt8hH58dQdMT0oucYuHYAY3BJFlLrdW7FUOTkeF_D2LtQSbf5zFEXdU2qxf_gEDl3R613Kc7HwZbHZCAK2kxEpxB_Y6-3xn06Fll6jzZOnf2LwNzvgkswsO-t2WHFFkGpBfremmglVmP3ktCq1BtYluWtvhZan_tanII00FC_nYQq6zwZk-50CwwihXwsuGfxnC2NpF8a20gGB6Nyr1ZB_t3Nn7OQoglW3uy6zZbAKh4RVvo6jKDEBaJqwyaMpWIWH2NzKAj7yC85gmktEj4J3g9rt2O3OkULRbDoAF4yO8FNeQEBjZbWjqqPUlb--Um57fKI05QjadEmMp_U5ZoumhOcbvND5tk2Qx1X73puLk7ul8MKzs-X6xy3-_9N21tr67__7n_-dPdqIcNCZzHq-J72LledyoIcyU0P4umSBGmK5igfmjtg5Qbs9mk1E0e32eiva7QeigLNe9wiO5cLc3xw3tnB0Jnu9xB_zmRwa-MKNUrXaZkN9f5EKh5Iy9r59IkHeZHOCH-nNEJDYcGbJ_zqjcZTVzlTReAbgkeDBXuJOFhwLdu9v_oBAY0DM0vISiIwLNRxfHDvU6vii1_Oj8GLW72824ia8mKm1DSHVdZXn8jbLo-I7YkUKFtJ9fpTfXhwcHj199I157G_R_9Afi6XqXGLdWqghfHXz3mi7vb2ME6Ayqhw6jDcj-SYqlJKsqpXB_0MXDRKJeCNiZEWwkklMxcKTg1VvNBw-yg7AjNC4naS6HdkcZgRToec5mZyQdrtCQjcP0udqNDh88ihh_eZTrRF8yI35VSdXJhda_pRF5lWclCYfTE_f_frpw8k_PvjysxrKl7akEr91-DxpqRq_PL6pZcFH9WmQmrsS3YCnnS_2Ub6Vr-TP8nv5u1v13rpl_q362Jw6lXh7W63MbwO-8Oee-n38-blzrIhX6iZ8WatTr2xxcH_sx-HL_zqcIBPgJIUXvTAlUaJ4M_FR4iR7aP9z73dfvuz1_uuw2xUkT1450fHzlsFGexe97xUvZC-PjyYo1faq_738uf-9vAFLmftQfiDuxUiShHo8o2NuABeo9st7cdg49aixC4CCrU1xo8XweDjp869gKE_48tyGux7KH5Vd0B5VQmnR7YoLdY2pTZiCE3nSu_MfXeMeqSGXeW_qH_zoyxWZyKva1a3sUt28BFiyJZizoU_WS_bzZJIE1frdOEirBSq-xf0cONJwOBtnAyfXia0IqxK5T8OjGXEZh0cz8jL3eji8ub5RWoDBad9WNx_7B8Tc3efLZfT2VCrqqxyAydue6nMECRq4Euu4qPX59MKhpv8pckncRGazAWY0qjTuqUDUoRxkrPkjWZKreUFZd6L-PjA1C6z5u0jn0jzUiBucq408Dni_rRIdEHCnEYBw_mnbbqM4VMqZmqhY-9YXFDOK06_SyW6PABV-MVgk030X238KRwrSRiwJ3usd1b2B5cPu2hPZ6Ao7-BH2XYhgZyk_mJzrvGxcYoDtvX1ihyQlqXm41Zr2HE97toG3WgKuxW8uHfAWwHLEJoWoZR34cjb7ummSwgSsXyHpQOvyGXK06QqeI36RfGASz6-Y7wbmIydqt46jkbpjUQPY9hNlDqUYdad-oD_SZvmraGMza8OnnFC1J5lWlmXlmCG-l6lJzLzM8hdJIv4dAsA--3fN8xxbnCC5OUFZUVVUoQpSHJl6LGIQ5Pprdw8tQtKpKXfYvW3odULwAoE4pbEg0cD8g7rYbMwPZC2BpksgtD22hMrg6bQXlN4GQBTaYD9zlaSFsN_qOHML_8pB9CKVhStC23lgO4m4tVBen2gYJ_1RUCU72dFTKJOJyPcnBYJFR8z4XxwPfV0V-i4qLOTQBgLdPmgFcfGT_klAXT74V-idhevZwaA0RYlOazXG83ZvuMzv15Fq4DznPbp7WztwO4cuvd4Oj1XR7ZZhAbLvSOGHL803hIMFnuwbkTcDdGKtoyg4JXS0rERWDNWWXvFCxbR22zj4ND5P4vRi7P363Xu8otjxAFS5JYmKcX8mpeXe73YTy0jz8jJOIq5Mt4CLKEeWDsTloJjrdKAdlFTahnru-GCYPvWDN5WHpuGZ3fXQNNMnciJ3SQuRy9CjKeac0nfltUlXnvT06o53YEa0agDA8cHI2fxIpNZZw0DZJ5xdzR4PcP0oIu4vNhvvpxe_VJwPFn8bqXRBiGErCaOKCKh-xnEnHTAhg3uRUbcbVSpUB4OIBMWDOepp6cggIGPiJ-xhOzoWO-4DFz8F20iw4vWSvLVHguZVY2XI0eS8E7VzmR6jmYJcLRDqeQosCbngCT4AOAPZR3JVvamMXUUuk4eKJzTCWsRrQd_iL1i5fJwPCY6Q4BtelcWfnwGyjCqZSDMlT_sW2Jj881twkfX2LfyFE7bOZAZbUKas7h3JG4iKTtLtxnKu9K39flCkMrhxbghnftdqdm5o9bz8ERCF6ur14tReP_FFlk5Z5i_QKZiZsgFZOw20P1lbL0GC2dfyE2yZMhrn7I3rYL5YPmrE6ox67r1--0M1LThNqpyIVK0Ni5UgPuIExq184wenvkQ5kWrONZ6YQGPzB46KwWCw2JIkJuxvfAhenTVTwCdyri6JORm-5I5qhBZtm-QYwMK5_a-ljTOeUzjhksJefy2mEC8EX0vtXKfbvawChs19rg37C6Pz-WVzL7dYRJD3n3iFlxRgdF8VfwQ3tZ5Mg4oAq08tVkwNLNXp_DLLPzWlKDcF3BXe57JaAq7knbxV34n1TmiUumr2QaGa-YTfV3AuXTAnmFdx0J0XDR9MsghO915-3BLVKJxL4bSJe6RjNbJYG9ey2aSDeZknb8BZljINtP2tE_6VPxaXACJhYHmQBtYpSZEIEX8rbuuIgLwd4PbUG2nELYjS43YkVPKTwt6_HZi7uFS3VQBLtrsC49SVsiNJnKv0F3Hl-5PWQeT_4iuJO4VA-A6jp43bCG_gSc_zUZGtsGWk5FNfnm826YfBXC_LVW5e8qt7a1IsHXxhlf7Q85TXu-txLZ-P71-_dCIcKP59jHCWY9MyslEASVlaOCxJFS9cjXYqmzpK2eC7rD32OfN3vY6AQrzD0LwFH7zPxMh5iwz5ytyvlt4-DukWM3IdYoYpbp_3ijx0XL6suYjvS6XsdKzQiiZREJFXDmAfVZfhQTyh2yVFEYKNDCuf4H07kD7pjAesZwY86pM1Y_kCsw1sORYbHPXFQwqI9jqbW9smDxjLhC2PUis60SAuDeeX4IcSrdIdtkyOhSyFVTWH0SzgwIUtQ-JWEWdoiC_fiDXwgMcREfKN50pfisgfi_lmA7AchMzcRfRwp5_4VUQeTWp2ebpwXqU_fLK6mRU7nPRw0-2av4tSZjKvKCHTBBxDNW3ChNTZ2A9ErCrpttPtp5hBCHwDrAYEuQrjmaytrmC1_SvB29j6qG0vhBAVGVb0zlBmiNchawMGYRVtBxaVBpN7e9_bHd1uLh40Us4IqbiW6HtXvV1vERNMxak_1jFHwx0MlAkzm4cQBcYH5t4URiIsQRLdtCPI7lKiBuSk6ACq-vouEBk23vj-4O5A5CPrJqOgTv9BmAdM4fI-yAb3jWM52NN_GP_B0dtxOrh_rvLBPWlj4Ux2ysEiS6Ju1-3oHQ6pgCM1q1M2ZzxsAFbXKZmOvs_ufm_W7Q6eHKuYOtzdV53dbG12YtKIenj2bLcL2tM-H00-s1Zbe6oahdX3o7-E368yFMi8qvM7maK6ij5jfvNnD8hAaxv9VX3Qiq30AzgghRU1yma3s8wwYu9UtMLInrL1A5Q4uOSSTYa5seSe87bsYnhJ16u6zvLI5DS7ygH93jpjzbdPBIjNg1C6DW3DTEsf0M0pwL3yp_CyLAWd32fqQMIgA9KNzOOJQZmpwJtfmvnVeXZHqT-kI2AuF2QkVYkiXA9st7WOQFikzOBzFqfCk97eficoNGTmVyaaeGW-AvvlQieF8Sr-jMrNQmFnoIxuMPOGyFXOK6m_lbEqK3MzkYXUCqM7v6YcyJpzLX8qNL0Dpg3cbNgr9InK4CGm-FjkKL7k11iDxmu1Xwj9epJAFVV_9E5TwrH7pBVpAJKwudmg2kWFYGvA8Ieyxu0P5SI2SVQE6-2WyAlaSJj0rwjT1ApTeEd3NXrCDOGhqLRMeARnBhT9w2O3xQ4C5FFHisoch0czkG7rZqowoZ61z05w35d7sKNMoRTLqreg0XPjgc0zcer3y_AxpWTAKT1iKhQk1g79VtE1gUi-S_ytGGRcfnunk49p5jnJDDh5LmJ_Qqjz4-HExMHf_AcM66AQTvG5UYLYNiIuJkvVEPOUoSIoBV6ir74OdBNWBERTtVEIPchuU5N_3ypG4SghZRM4EcMm1fbZj6RxpRl_zumdmmgiqJLeU8YtAbyx2bgv0-0CsYxHIAx7ZyQL4TK--YdzfRm1c0tjM_b5MNbauBgTEea5LJcSGdDlR9UZBjkAPnu8JC5pg7lAi3w-uKbP7yKYl2W5LIKzs4Ozs4Pb29vBRZZdJOTAPTs7GDwSk2N1dnbg5wb69fxSt1rPuXPpXcReBTihdGoCIDUGJDBvbOnymKwLaHVGXLvLjCtPVg15aX8jV80yNrcNpfrClNDmV6WJpuU90XOTY_OSuOxYa6-V6M3GG3JbttRzZONWt2GIewoePOv027oqWFu_UR-yMxwbta8YYiOToXmnDXa1fEAvzHbfUDBbz7llCVDxwyFNSVS54TQMD4lsZAyGBRpUPDZBKtASAsPjhhiY8JmBHZBbOfr2yRC1t_B7bc0nzmUtVZiCNUwOJU1_OQJDJEJlnBCz2QBhv2e0Ee-qnJ78ePLyg0S09MX7kxfSEbO27A9Aq_TYkbbySuNcqm4edtz6Q8A1dhe471rtm9SurAgAogLRMhbSfnijjGP6jAId3syoMIthQc9Lw41M9LlJgvKdM0kqqDvSV2lnUX9FrYjHvE5vbBK0Bnw1efCvs-KRGDya-GfFo7NHk7Pi0deAwn498vwvryy0alWPYlf0SRR4tqi0J0N9NQso5sFA05RYP0CNUj90qPmJlZYFPpmtOooCAbuvDgEH5xwCHNX6AReeRQoy8bn7BWSvNxryP1AKDPuP8b-nbtP98-RBOBw9nR1cMOzHPFIj_18QDkTlmmEUvSfrngvTUp79Dgf1yEdlru7oyfPn5uCx36ocDf0ezwtT1-kfkK9hKYvZFgykRnKqbuXijMmgK8GPpR8E5tzAzkErrLvdEP5cJH_KdCaZKBulceugEhdyJHAgAQFD24RqsZHqi1VfrJQmCm95o_qi6CN8gpmENHIV4zNKQX9UivBpR6l55UmIB4s4Sd5BpYSjst5SWfhk1usheQltmOGUsZTnjMQsKjj1XLXa_ck8GIKrrjpTncqMBQmwlHbk1Hwu5SDRRfkKrYq4nWiYgKXIDgVgJYnGtQES6qlIxoNqQPfUjcx3duft3fxuiUQJkJ0hSDCpBgpYdFyRKYBj-RcwsNKzbpCZQ3g6PGm3q0WFLQX3LAUocln1Umuz7mtI-5WCjGpPRn_FeI32GK80BysQrU2W31H7U1VR2X8p6-hLafeU2lo2M_Vt0j1Zqm2G_BxrX-mWKtg3xASQEq90vhyY31Y6ga-p9Cch3LmzwDLXtTXZhlfB3oX9EZTg3WHSJXjn22yk4Z88y3aGEFjYGWKcwV5f61Qn92U8Lz5Z31vgNbITPOmSTTVW7_qYVrMnlyYvaON3clO2-mru8KSO6p3XOr8ywDzga81XeesKrsVjiSLW7gWsna-T9flgTY_4AylOX720hLlvs8h8dXPo7cCTKY_Mlk-RqUKOui71j_re5DCN9ggnFwqFfQSjvEOqURrq_ghkYp2So6dj3e-D189g1wwCBXxssQMdJfCOZNAZoBq5r7GP3pFpdpwnT9lSWk75ACtZVdzFu8g1FGA-6nAWljBQEmjDcAtR4Kt-jSAM3Gy81MCo11zTJyeu5XkCdo5FzC7mIJt4Os3S--tsVSC5n5JNPOk4jJGpj3--XNfJDDu-AjvrcjIxqzRM_RuzjZacXFvYVGcmjKYaYnV7Qe27fNrjVolPYRRz551TwMvYmrq-IMQosUEKpqH2JWKlVeftAcSsRwllsdc967CktB78peo79UCqjkkGVSMOHZmjLbnLuaRNY6988BxDRBxeQTIKVtyTAY1NAs92akFRUPakI7e0hdr9rd8s6mdD1NsZCgq6Ipw2GMr8TgPQDkCgeuy495SCdMkWqOPGI6_BaF3p9kB--1J_UC-Edf9K_RobLkMCDS8UlTRqcDKh9QStlncJ2z9h28X50fAODRUxA1q-Vi_EqfSIhgbbn3AEhUuk_ozfjiMIDS_RwC4gX-qP2EL0HhtvaYPPe4UFrRJWjceW-jd6KjsT_fEX2W28AUIQg88F0SJ7ct3gnXnAScPLgvHXRsSPySULs_c__h-GE_PTBhYBAA",
        br: "WwUWMRIhYxyAGaBfCYxEBBsHgA31UgHqsbgxBg2qVg2ZgiOrh5Sb6uAOvaITHJz0KP8j5UQKXYY-XxjBjwMXWhzBrIW9EouN-XL3W6TRaE7OS0bzgZ-ak4JUe6ojrDOwbeRPctL3-1pqpyuq5DG_TIEz11IqnWXzZF0IT8HqlsIEIw_diq0I5nA7RHv157TW9KsgeOLjAL5zM00as3aYegmYacrTr0kqf-J4nw7BJzdKlRUVCz0oFEptVrV0muPBoO8LSekc5xE6F3sm99PJHASoEkDR1_7-11uz_uu3lbNlepXA7pm3EA684oFe6V2mh2vpVHG70lf1jo7K0AqeL8vVn65ieQ2U6awDab7pSQxYMWu7fvW59N8_X5oxfnrrJUyfzumkKZwCckrLhS1ouLGpQR5akTZEVmn5-k7LOz0V6hC562eWUuXjxN8vugzNQWDpQzK49MlO35r2Ihq0E_nWGemp3zmd4F8aNf5lLU3N15t6bYoR6tpvmdIE6H5JZxpjje6IMKvDeuwU7jfnK7vF9UZsP7nPzx9g1nJS8unftv7_67e7y5faq7OIw0hg3e00MKggQ6dyqIhBwQgyKfiy_38rtTetaizk7Jz53tfQoTMAlLyHjhxFqHvve1d4r6r6o6q6-6B6O-oFGAEkMepukN8ARb2qatLVDc4_DRAzboIaH4jyAkkTEJQXzXgHScn6lJdlTR06nWWPvh3aQeYg3UM7cxRa1VYJJlcLC2riuPz2_VD7l47LjfVbF4iAaBKT9v4mLmu2bQr4H5MMJEty8O6Hqd9z6zhXk-xGCCFAiGOYC-TfAymZ7pn-9wCKZNBprJy4cObIAwduuOcNt7zjR37mjpfe8gffLxMPX0kCN-OuXz7OYBF2KwrJ1ZMwnF6RWFcSo7sDvh1tEolf3LvhVhbi_jlFIFKc7hANflRSbUFp9aYYQBbEcZL_HV9lyABhH8AwAwScXyV6sXYS-BwfAFJl7owem8rNmxcZVkMBJokXKT5f1Qew4ihI1BMQX9wl1nmSMxRjMxnh2dcA83Lk8TKctL0iPHVTvmzIgoDaIfGwr449uyFVyoG01CFM_hyjVr7Nzy99st12Ii_1lAwd52jPLscvk9Lv2sD_i-bsMPLq_Zjv62gtTPfsQzw6fHHwbS2hxMaC2DyK3iOr7RYkPXlAfcDgn2-_TiGRdc0O_TbrMKWkkt2f9AZh6BwQi23mtzjEzE_oC3wOOzwF6CLkZMA95mSve2imVPWa1fu-F1yMQnbiuE3TIsWKBw6UBipJV4qGmmUcskHFG7EUehYHhW9v4tFCNxGARGsdhUOCnHtKeSktpRdhMj1Jiv8dkjZSLFZFgxKm76qMFMXmPb5q55Kk6AFpmOVbTwJiTAloVYMTZPWtDMujwA2_F8UMEEh2q75O16GYSZnhhuEN0kJtgpwzSsiqDOq6kqAiRkuMZRJSHyO5UAuRW_R3D5pClS8Rjs_8-ebWEpT_dhuU6uRFBq_xpzwozNbnLzu9Q872ek8Ldi_PMwjPshO9S0JG_pKo9RuLZo2_5v8Wvw_ARRjbtBvlO1ekiX_mVUYq1b2NDIVEvg8zxO7moXqQDINxY0Mw7PqFWMQX8tf5nfVaW5YuggJzQL2rCaQ0upph_KyH88muD-1AqS2IfywQY0MKzARK37cMD-ymIvc4Ima4ZHedKnGdvr0rQAxTBTTas0ggUPWUvOjMk2rv315PIBeyVOTlc5kCoMKlPaOHIc5vVwVz2HI1gnC3-TvZlfCiwiYE6f6cq2jMgy4BDA3xen7y8GS79XH0iMVXgjUPsc5Poqn6_uMbhqaMFVnxNwSD8vEfalZOMLt4auKTPsgpycl6S0uKvfOv-fSXtP9scg8a_Tp3J_Y37SEYxJpuj_1VaQQfXpcuwf5zdkxKviJTlQGrk-MTtLKFv5Tczm8mV-hEeQiphX2ahS3gaMR3vYevcdR6-o0eNEJQinPbiXd0dFZvfyzxDTAdk6T5gXd3smuraSEachliVUTgYKUzIJoF1hHeyr0tpVtx526wMWtRl3ICxofdVPoinuuUopPtl6j3H5GDjky3wmy5CmZVter-3YwIiQBxYlxNdtsO_Ia4QGWSQeQDwxWvqhOphlL1Bx-ok3ioLIXS0dCNwV2YuzLtPdoyvzR-TQMOf56EaIL0-46-T74bht5nAdGYOzl1GLHuvJcwuQaLSIle8xa3rxpIKZ9OiBvk5mwCXwBwTkOxEpyFsQU-34orBxFFPDvSlretGZ8nwufLOaCUQMW6GP_2diRSx4e4Y0UswcBuEDoLMz38ayQYlXoJAXABZD4AlRQLqYtyi3SZmV6_04Kgw--TaRZmj0meZDuH-rnCLPT701lQEDXuKZ8vHJzuXL2lkSEfv8RpYAxLahoHJhfNEDXHZvWgX5mU5V-w57rVCwgh_NCyusWqdaLG7OBBBpuEwNS17DCBCD1EpCr98G8TiI0sADKCQ7ScL1miL9KUr3jlOsrL7aYt6kUL68dvYFvYMmQB5uq62Rp6nLNkOTwEbVzMhDC-WIWIJst2lz2IptJ5za7u2KQsV1j2-FOmOUlDfNs6UMvRWcRFiV4WZWCwk9qXYFQ7RqyVqQ8Wo5KD9Ofr6N6DOKuk4lCSBuMtGX7QTdVcK6dmQRMxFpMe9N2WlK_IJqQIwC4B3uTEUwaoNP6_QWNVvGA5SA7Er6sr6CqNlonGfdV6bTLG0KU95Sqy3XEnGoYS3TUyfM7HmQrURX-b6tChI6DfvxrS5gu__LSPk8l_w96IyOL5PdxlnynhDUVIpjGJh3gv4ykOnlERY0ioLvi9UMVAGXYNn2YuR0voTa2Sg3zbroJOfkcHfwxTwaOpn8U5Mhu2ibj5i8IxRcdQ-pHJ6i8ZoA5FOtuL92WTCY1qw6jfNx4QsazCyyoxYJXvSBRR65kWdaZKnK367yFnaqHle5nOncsXlGAZyDROzp1B2L1ZmjpRHw2QllAe1KwOGJhJV-fuSTcWAQGlE4SQXzPZDiileaysqgtKK9UchQkuRtNzj4QKTq6k4eNERB4rD4zU0lDwhk83iR6oMojaF7iHDSwjwjKsLqC7kV0e7MXrOkCJUykp0-dalTSCLL5TMyWYyZ0QpgBpOnnVHJJz39CwmpIu3QdwI22BRCzlS8WDiUDIYqOKKt9CBfTpKMzPQoLWcaNMrkPVA6cpA_geMeo8buhmTuSYyn9xuWsCxwotuy0heKGiI6vo2Ig71ZHOaKIH7G3BbMquqXkU1d5K3imYRleUz2Wq_JkLmgBrk_hnwG5kWpjhEi6Ae7CChYBlhXcjyc8gwsXrTkCu0lKL0aL1EoFOsfqYAMWxbx1PZgiEE1dGfbJpxpftyXWJzKhpytBSYGiGia7JfBgi0mDmO2AFJaNtBZQmd0sBvAP26Rfvmr0NMczYAgjw96HoKAhQUqy7GI0-CSGIYAoRXtopie6WTHYfugomQlKBxaCuQAKfng4n_r3tbfiBKKXbPbkXGSPGqULvKULCH2B5_c-tLDO1hkLfDNFlx8RJWgkCF2RzA7q19OB9JWqt9FcSJxlZA9zDSzwQUVZo9uCsFNNEDFqW3dDxIJSpLEErKP7n2xe_3kyI1HfD-YAHKEQRIhheUe5MlkFWHbNtS3A1n91_vZVR6MRxxY9SHEO5SICxOb-TLAciNdkRGyskLcWiSVZBVqE3hEOZXPY-R-edq464E8Muvu6etXcdIHYwNqXOd7ctii2xX6hnC7a2QexiRw0kAV8ADa16Z6Ow6_RLBF2mhL61wXNg7lEenNyhz7A1iXWxnP3BWHYo23CnQL4KBNY2gephPrB_AtD4I_40wr3fQcMuo2tg0H_UEHuWw37MyZIfY45KAqIHyQyz-xItoMKk-QwpUahIKm0_bZUkDYgj6EI1jdTUOxpW4ciWT7G6adlXMs6G1LSQoJbXKEFowa-wCo73pLva7RP1bCyj0A_tcmGXgOEHuit0jMHo5SBA5NOj4hLFDrxGf8E-Ta7VpiM0lQjqJGOe7VHJRxadQ1iFY1ujXXKMFEZ7q8kVSrz-zMoewWEFVCBXqMF0UcHa-_VA_5opGKAgsW-ZwEqB_bch2OLnXfUZoimEs3qgK8IMFawwHZAo9VlW9COCSnvxfNKgZfG8P6GQhlxP6FR5IIN9cpqfykZ74g6gqaoBJxGqpncG4C_k5m-NyUZnl-AoETpTQeAv_O1u2cKDOOlvxb9Pm7-d4iAcaka40d4U95Ki8FCenrLNPRQPL4KGTykoeDnwuBzmeflTYJbxYCHBHOkExf9xFi0L8l48NMjV3F9cuKpqMVMOyZZ-zYYI_mUC03688xmsHrARGgaLPnHw_77Y3con8d-PWPHaNAKbry1BeZNKk9_EIwXN0k-Wa9q-N3QXPGlkYv-dYIvYmqLK7TazUHCbyu6nq6zziBzPTPHXuq-Xd_RWW6M2NMyJy2mQG5395S0EjoK9NyXaljMi9aWljTDwsB4yPZ1TgdRMN6kfmOKiwXXPwjvTJEpLhPeWDUNBZHfpdY9Ta5a2ITiiaEFsQoQBrFlS_FTquBRQzrj7xqZ8Z4Aq9tWvHF3ukPePQjOyonjG_-9rthBfMNSYEYiwDBYg8abEuQqgBTVbJf7QMA98xocoxEP9CCv-XCqJ8D6MA9Mi8cy8-dArbsMl2-NPqjrZLpT1YpGGlkkQ4xDgjUNCr6ImkobJHc0OD1tJchC75a4Za1Da5q-kP37l1h-G4dEzalTvtuQlG1NUMz8pUbM-sYBkfWKJyHqIAqCoPow3KyR3uoTc_bfvENEaZu4xTowABEjZ2yf0oeUHvXotGyIvQhzOpPEM7t4Iw6Ag-pgA5S6Zowaj30vhE_NVRIpF_jSBkNt_RlHYlxt6J2t-w-g9TBkr6KNyL_PH76pLAcAI2Lej5ZO46T4hEmeaSm0zc4krV8MB1sLs-4kfcf3NILeDEss9f-3gDqrZE2zm7xhgbawaspqPAohw6isr9FmxRYPWwG--_c4q9pC8UzWOLB2t5oU0J9ny_RjVFHtjjUukJmLjCeMUtg_UeSDeFufgpOrb8CEE1PKvAvgBNPfYQwvyeZ4etUZ3atFwdpecCsJkvAy4HiIHg6Grs9TXK8QNCRQ-cfS9d2622bvJGRev7JWWQs3NRV3GPnEl2y0wN6t4unm9sv7jFgRb_GPygBpgrLsqqXxl4KfKVzyjqBVqS_i75GXsehfsC36Rs-Zra3_30i_8NaQwohpn8fspqfPEUKpOknQophLaoF1Rn-NIMXOv3_6G619_DMXqpz9QFsqJvdRjkv6deClFi39Di3qwlhaZj5lx_TVdiHA8MWcRZTWNEeLeKaXmR4O5QIEuXuYoZOrEQu3pkyCLJgNMpbLEWNfTy7IzGQ-pMlBwdJWqkj7FELAjgFytr2N6vBn_uGNUKacpSlomSZIax3S980GpkCjjBpukeoSGy35P4S1Wn0uWJCOrysv25_Lwjkqya8E2P7y9uUa_CldtrVyQSOq51_dIxdIghI03G1Yl4ZzYBJy6Yga016flQGyNjpzNYBcyCMNEp8Gx7_NYYW0ilH7I7HZFWJsAo-G9lxxxwe6ggzGs9c_or7Cydg7Xa9pBIgnZKd4qF2WgSDCTGnhRhU96plsn9f_720z5gYO9MDyUsssOCiXTtXX_ypxS5bdl6a0AfQXVtNNfOZfCyKWnNLJr3tz7RcehwlrLU951hJCXu51pLZXzVSXEEXzE01T_Vmccnu0JkZmigtShuf1-A0bgbRv8-yCX2aC0oYRN8bDS4h4Yz2S6XHlC08FE2UhRH2892ufhzP1k1KwsVm5SjRUQzoo6PFDUUwoanLMJB2trDFzTdYTpr5w73uRzRTdVMkAAzLXV7cmJIJhrTgPWX9tF0nQa9QLhUOtGbs_tA2DKIyamP0ySWV4g5y91-Llb4QtRESwIaeFnP-WLq9_nYrle-k2XBVPHDttErWdagSiXdUGqfVyD_Y9Juz7-DUgOSi_twgM6qdqroKNpH95fUcVTCRSG-Orz1sOH6-8W00TMCNLAXgO7rLVk8xBaHOH624pD1RslT6E7YCN4LsjJBYjlmNdva11CKGrhIridSJKYcYJs775In02CFVmU8InTZX4rCTQr5H5eEiXR7V1JiFr53fjO1DlmSYj-XYxVuCV1rVmG8pVgJHuVKdC66sKPW7sei3lSznBm2F-XCI4WF4hNgTGGXTcwmuFyYln-nd1M1uu56Jcspw_X9_v9-rhn-raeILJa2aP1m2C3p5qJtNLe72IC9Ig20APKh5sZ0xSZsTfa_6Qhpu2SCK1EN9bv1YkcEFlviy5MTK2akzTR4wvLIdQJ2TkOsVwPrMndKTJAWH7ti8lAkaf2BZJUzwD8DLuY7_ahVlghkwwJfHrKDZ8kjxllUHgT38HcI7WqX_phwSerZZeGS2_dHJlYShFJjTUFcVW1IUw3r_niSfP_lXXo7uvjT389M0FQjan52qGEWHB3YwYA5rFEoufo3ehs89ageuu_DMd8kmVncFOMV1PFulLf3XV0MIVaGjJjI6T1TqmeSfmhA7_QYPgS-zDK7l2qqoNdYOfdCGojCyQJo4JxY6BZ2njSqM3mCaol6UMXudYFFCNhxvGqMlaLrVQ4JOu57aKElTw4fh7JvQnO_nvXFmHrBpkUYxJ_Li8nKQ3skdryaBIKimGMRKvG4DWfWyDpPsnR109sacB-obW79ZOIuz7D2PwCF6lVmmxgm35YnbBR6Oyu3BDNUXOY8n7LrecHujTCJXq9R6AvKgpkVJhRzCtVtrVxkmX8B5ssoJzp8WFtUaqXoZTYt0goqVRuMubNmKYtht74agOIyK83OTViCMBI7QOsRyBVCZt-Cbwma1se3_AQU6LobEkCEObV7mt9BF6CMNqfsSXsBUn3nnG8L3XW-EUazl7ADdvSNIiOsxFUWoKax1pV9DRGzldRWX0p-PcZPU1qap7_UY9_lMl1JTtwCPm2M3eNNG3EjHeoBPFM9rjSqAmNhLQPCDPY0k3jJC9TnERQQLClZc1ML-hiT0xYsrJaOpVlSng5Eg44tt-hQnoY67yfQT3xXU9SEHJpMfc6CqsJAuFYnj0CcUljmrMIA9S5X81FCMtLvXvVZYAq3FVzDbLDpu-Fdem6sL2o2nZTSCC71oCgLA8VeLuSZEtZj8swPN434sawXmjABc9N2G5vZOoj5wwrjqI8T16URyIa42leEqO6cM47qy5cll4WHl_UkpkA1k_a3KKTIkqkHngOd1fF383xOkSKMM4nrOuGE0oof1JaiZzRkIDFkAmPgLQmIbDnAAiuoOyfpOxjDk0VJehv_b9h6H0tS24Bf5-yR_D5uYl5LAi29pyqf_z_me2lPIaIghGoW8r9ngl_LwOhNWKqxcMYMZBE6NDV58bPRucA3X10iMBXed6V23a-HaBLnLLT1J-Tp6GhuNdP7Dxf89wvWPGGMkrye8lUw83lTqn7cmP1Xi1LtqLdpCxMchqQthHDFwKEFnPRwJOJmNqRcyLw1j3QOT2VW9sDRQ_h3npIFCYnxsLfTu5pTkhQtC6CwUk7XAiWsFnL3bqmn1xl0lNDQazhoAqlqMwhxJXqKWviGCZRFHWph111y-sizMjzaDElmhMUZze4O1Ud1ZrapjkegdGLj1BgotnGwqqWCgMdM9vGRV1co1kxAWDhcmOzVAsyDXzEvrNbnYCI6QPVnfCaQe9hEShjWsL84nRIbCPK7A8MCTdU21KniQPfkIyyxSWReh5hGASQpSetsD3GGrXOOhY_K9RaEYxydLcycUww7pRC7INuIHkOGMu3zbalWqGu4K84dVUnYN6U0mexWmwUMxM9tDqz5D51WlB4BspwTs1ZKRPqChYwL9uU7W8q2JTBSF-Bu72jXCxV6RoG_KhXBLhnzuIopYAbFfqM2LuYLU4GhFbzEsMJGgmPWx0eiQpTTiNqCzJduyqrx7buhQOHeA8Qoht2wQNZvXEdvWGDHloZKAyFFmyhTDNJt2TNn_ElZdm-PVBbvGUCUtTFlniVNqnxZKn0EzGsnPatUEqGPynBiyOLP3Ad_wyJWeTakrcUUNCcp-YkzwPanjo6LdpBZPP76oW7d3mAzS7YJ6ptAqcFa1k4SG7HHcS8uBpfUXfvg97b6LPjhoszRluSDD-uNC5RFWaA6NACkSwNhKrtIQRti4QEkfIYBFktZocFMQQDL8h8OkiyXE_n3jwEi3ylVpsDQfyaMRFkDhG4APXIrmdm10oYP31T3BjwAQGP23eOVwYen-6bCYbrrucZu2X7LPUE2FejIYc41PAU1GgphWCZ0NRKcQqNMJlxlDLZYRSWiyUTvcOUUntvomvPEtqeQRgqvm6TXeeg5q05f5CEarZHoUdjcgs41JXVLL0hnQmwSceWDgs_UUf8rjaaPC-QiQVhH8zG7B4hEjNHqbNd8ZEqHc3-omzH8N4sOrp8sZiBfOOQr4uKucNOJvlloFNYEstNgVyCs_QOIeHXp5gaJKTP9nvC-4oWN2o06A3ILnIO5PwCDRUOudpP6O_3ydGEycMAKnXnXUNSvQG5SIM7MdlTO86SJV4HDlQYySubbwWEPcov-PN8ObJI49_9upiZlUhGRGKqCI3x1XotO4CtPcLLVlAfuyR8BpZ1_GxW-lD82ZmuCNzaKpV13YlLCamzpiq5SLnWzdYP547i0vERw_zl3MLYRH_-lnwvYGLL88cXsJzr2gwLJxLhKYyenQJFkbo-y7FRdiOmSU7JA05Lu8soyUGpCgz8IIc4WsbMaB50mNOR6zLJh6S_hIcdwSp4Bw07diEyRcJ3qP3EDzGQrp5EHBzCOiaS-rtfNjnrsKk0RNrf-l9vGT6ECLbrjHyslBwb8vsWq56ZHgrLY8SQ1MBSIdCl14T9I8VOisVTN3sMJw3t2BOzfJkc_VG0UZIK4-jHjPzaYE4a1xErVdyrE6koaaNk5X5sx-lkcSJp78uio2bxoMB3H0RoNLhLTowDpL7DtpJS5GyFrpM_otOvFXKSRYppsUP6-Lr0-uleJk3lg6ecpJj-vp4KubSclEaaNCludNAkpaxiYulCtnVc6_32sJ90PXrKlHPzFFziMd9CxMgXw714apiF8DsA97jsjkebYZMyHXHSpO4EU7tAABVn6TwPU7DBYTz8nwsfDu-WtDnJI2owXx73VX54uN8JTzFBROraROtP-7kisMfvJw7hGO82P8Tc1jg1y9ihJ1Wo9JVfERspHAg2loQEGZ5na1icVfvWZw-lyqX0rdcBmoLwoU-WSNiTjZ3Y2dUwB_cxrhFodHMyqrCE-QayhyUppLuIHyQ46RCx4cr8MY82bErCrtjoBvSyTg84OmJvyKztPfxj5uzuE65Os0Psds6WpcRtXI6R8ITbOwPObZpexoYHwAr3V-sbREaNrY3Msh7rcszxsDebxDMTNMyTmL6Shxq08fjQ5rUqu67_mhRXH6cwxrBOSvLLknLkahrk7yQMI_UDlVEwYZo-VH3fubg_Tjh0DzE_KC5_gRNh1YNFBqMT07sN-VfrN1CqgvLs7iNcr9_6MgDntWn7bTWoJt1qpTbrm4KDjs0XYlYXGZ_0blH5OSjAyN4eYyjxFaeoJVyYqAPGZA0490-Tyk1vdBGN3fT7FpnSjE-dLtUCGxdmF4Rj7hoT92MLSS3f4PfJuUs2pSCCH7PECerDQf3e9NeOGdivTutUp_j0FKc7Yk03qA8zE_0-6n_kp_WSbcy6-8Sb76ZKmXbrQ7YbatlpG6YHwtgasyj2W3Uumbe5EQbC3K4eUz2YB5fAPM24k6P1MT_MAOe0aJ5UmOhSTyyKlo5zOjKOYj5LRUXsEDHJlat0T5mRduyS1U5lcjgpA5NS7V0poqYCFerk7Jh6MKJe84Zgh1g3xrelYz0k3OMT-SRghJfzYIYeYnObuX7TuJYScSPlHApCPyHbPqvk8EcGQgJyvMI3JJUHNPSzABUJgKKOLI8Y7KD8_HeawYsZ0s74vsNHcGQsw_N85xPCuuEsVrFza0jZYfyA4pq0Sa3QFw5RkG57us0BgM9ILv6ysoLtuvW829lgszn0k_qf0ngDARQ4baQ_Vwr9_-HM9cNWuJD3b7i5U22IeQxOFE7CThH8vp2tffB6_-BudbBGv8MWe5txIQ8K3vqRhYEo738o74n7bd7RT_bjP1ba2n9G-9rk9Mws5gU70fWNza4fXmzhOBraUozqVcCrOdFfqy6jj7wVD7wGuaAn9e7kymLDlmrFn3RoromtCT-P_KQzFhx2EW8xJsRE0jfjmeUJ0mRJvDLTvfyAsN215q7LkjfWLLkQZfLLij1wM0Cio5Gx7RFaySvWXn59RWX3u9BesA0AiGcmF6jtdoMs3EutCzc__tm1iRuAaBTLE77KJpcmuVsTJy-PJWo6B03EDriKLcnHbYIMNd8UhWWolSsYFV3lwknbnjHJT2ru6lQRy1g47WJeTIUzaEMFWZzgGLoO4_Qw8cjM4yXg-_Y0uRrlRt4qcqeM2hXCD-xmHUy1z7r9emkzpLsHDWXaNySvfi6r6EjRIfIfzo7cAwEcJ5KHc9836r-WVZe39-bZdr9V3pyvsCrYtRqDvgz-f9pLWH3TXcsfQeaiJod8Q-Bx0bOZh9kYPgeGNUssRuBAP6JogblDtGsCnah40IyVJR-NnG4zmomkuIyefKAfhe2mYMJ3NKe3mSTBxQ9qikiCy_VseHiAjr95pGNFx_zv2L_H7vfkDm77COjT-_8JOba5MM_LX9PSmlx34MnZuzqYpRsP1aU1veQGnEi4Ns24C0efsC5H6UA5y56Xc9ORMuQtweiXk4Rgf37ndym3J-dEtpb9MSNZd9yOXREZmB9ntUh44vu4f826szA7x_MaiWPYEzD-8fHGW3J4cc-QiGHc_6V-Fdbc1_F12xYdeW_Nyi9QRVqZ16ybtrZ1Jg9Wi4d1pfGH8vDvxAFvwJrfijrv7v3hHi-ktmTtiAjd4T_EOfp2D-H8KpUMZKg9oetCb5KvhajvzONFFjlZHL_s_Es2q5KsPXBpWPb3Q2CWiId1Dhc8vzEeLRbjp5vzRVzr8VSav_e7fnjzzA8AcJOiybbgHBouj_u5qquiAY7C1mlI0cSyDNDc1y8eeNDGqSJfhU6LinKTW7NSLt_5lnZec62rdQg-Xr0jIWvsxF-70QnlNLhXr3y3p0AE5XBgNz4ymEfV9h4Wrq65c19jiPb2o77aOwke7b92gysk33bNuzBp3V1NvDEJP03uR9kxXIUsT77jrdw35RNoF3vgpJZP1qxkcw9MOE6OmBhWD9r61xtcxI5iNDMt9VEtot8_rX2xIZdCp1pSvlrSfDiODzp2IpkYvzFwEnHpdkeSDDLwVGfaA0IdEyLbkoygqZ5W2ispykkPEG50E7csWDIQ6a2pP7mYdjMi3t3nPfHJ-D1QrWMmlTNpefIovh0MnNdDW1C09QTw1bpnPQZLk7iQTiQZxKPAWMfoAqu76fcSeU3XvfQSkRd73U03l6igVPp-LhXIWmXdpQcF3f1IlQYSjFOXDmdeichGw0rUHznrGogzndJfVKifKSE6wG4gHHSmbjrloegtT8ukhxXtBpPxpdD8hmAAOSwJshsrO0bWcbGZzMsNFrT4eSV4hL9DBF_GTxnBT-8sN7LkQUOX02mljeZOO5Ocw88aedoW2mpaZl_EjW6Nr3fWgeFlO9edwqbSWvvjvTsXs_CyXehmbMauoFoNoV28SSP6rr98dvIPHLW7YUifUkUHy-yX_Ec3PI1CuwwULjv3OssexuDdgfsZTfZwsPtwDmvB1UvdK8vErv8ky5FL1LSi1Z3bz6Rt0zYzOC_8X0JW_S9RjexJ-cCzLsVDgbMg0_cw-fg-uQ_66cM-jsgO_tDi2vyhHA1uDO9bTR3U1fYkUvLOvDlQy949wDB7k9erRINtwUm-wuoLHsPRI1_0MvVqMtM3pUcaolfIY6qqRpJLOoeTv4z1tEkaowT-ujsDD5vnbuk6guVhb6t75Qy5ffvf45YXt46pd8kCXQ5MsSGcGsN9R8mThMKi6HpWq_lODdbJ9sHGGKsH1ImDc9Y97Ei1KncRM_E_2oOJpiuLe2IKcz-N5VgNnJi_qgVhaBr-xeEsHIX1HWJBG_nYMeJPk0fy0oIVR9BM3C-MEiIocEBvAjCR063ZdjrovrZovYg7vTslE_08gjyc3KFg9yvq12Y4a9WmUJPgA_zVQ_zqiV4GvBkYNGzThMLMHFjQq4J9Tt7UO3w7qk8Js3AAcSjZbAxmQckREOPqRj-o22VwZe-BqtkWaXdFwY-XO6jHbovZcKEQNSIqG3Sp9TtacZEHE1wNiDDYc7_GE5e89ecDNTv632q91UH1wxq9ga5Wu_7-XWYpe9AaYer9X6VpubcRBkbuMcZRDeP5ny49bM71bVP1jQxfRlGjS1I81A_a57zLBC98rQ8Ib8R8QlIKt-kvIpoZGHVWwTpeiapUo1OalnOEJ3oLKwV_pu6qd4JF4qnQW2232WsnqrKDVQvnMnjqW_3D_0EbBt5jPg-XqDVDATnspxK-5ZZEkJPTrjZXw66W9feZVtTgDHtWogJgK0NB1tSPiPu4eIMpZ5_k_b5nAKIKFFXhObDt-JtSTzZYQqR0kl4ipCsMY3UTWp-Oahkqpne6512LG_5tPS2_pLz-CPej2off3_nM42SxH8LX8gtL5spsLgPvHQGy3dYblsxtViG5PtrEgJMt0NFjcqIPoKsa63Ub66jNUx2e1y0iRQfAR7xWTSoHrAT6RIVPZ9VHWESClte7EipsgUC2EtkIOALk-PgU_v_vE_87vwjDF9qvMFY5opdQ_LXT3-F0UgcIEr6XKf2xefR59vjak6ZJtz80tP4x-fD_l8I_4KG-cO_YsrSmf3_8F_i_FfDYEXbDzksvA0j_oj_D6ejuPe4_nFwtW2fzScdpYEFg0P921JVsNYdtpwJb1P9OwN1V80HfEy9YkKwtaeHnp9gxrBg1nFB98SBqWYHZWBZE9IORsu55RxFkG-koYkkgA-oKihAKW0tvCkBRdTXBvkol55qSiHw-B7jpHcYRD2ar77DZlqCSNbW0qe9oF0XDgoCqaHsiR-V6KgcNPMuv0MMHrsvVuxKCA2Re9crBY8Sr1z2kkVd1fvnlSj3fxZRSN858k1FZqSo7FT9G9qBV4vzxjo2DatS6xUC8E4VTDhIcmQdodeHduYI_AS83xfdQTar0UJLPBrd6XW02uV3fOsHVipCfZVLEhXjGGD5LQO73vdytp8ht3nbdf50Qfd-Od3XNvcPGhXOkdd9nYDeHZsDw-47Lr2y4cqQj48DrXfyddfp5ToFnGAXBknWmC_ALQWhNKO2SmEOQ9DBBW7svo0yiQDUpjA3hLdZWnZBlZiBx2KQfMQfYsH-zHLuJNLtip1zWd8xJ6oGuht9_XjmcKqpY4At8InYk9M11AqCsgMZWF2ncjv__n4CNFWxAEhUKhi4mCCzlTXfnZsW64u_WF_rySN7Muo4BGLNcn8vOcv688NfunyYXwATavQrAd4-lfjzw1rWx5JnqZcWtF3drCwbJJZitRitizrMRwOhSDOyhYImY4bt3wAm3DMiLjprI84dfD9JvYuLoQwEJPH-0WW6XCXbzzRBj3WHOFPNg00BWTC4lllKP3hKK5WFjMbzXEP_qGoqR7tX5Sf3_tJ-r0wBwJZuuONmonvwyLbHI94AcTATprloojAfbehviGfLwHvE5gHdm9pdrhTH0AjFlqL09FyxP1lIVXaiygeSLPEqBqOdm0fOcFZ-29fbzWpdg4t3v4cz9O2Bts23P5zdeA3zvmVccnrGaxCjCArv12_X4t_BRaa1RjmhOoTb9iKQAEZjPTBQTIdIWmi-RH2VVucCnq19mnG-XG59zt6Z1B2zqrczP60eXtgTgm0yI9zGWsIqa5aHehMpU1bphqy75P8nbbROKk2jrGOfEehu2vAvb8viow1kKt4tjML2A5hpPLiWawfSAzHExYsU_0gd95tlTxTk6dEldViOQMYQwYrwjb5RviR2CmoMkGv74s5o3ghg1aVNI281-dzyKrzIOuvjratkYZ2FJHEtKDCJEGQdZixBItDhGExCtFUkh7Q-UCd2vRwpirKrE4DTx-qRVNePzsOk5Lto2ljMRlt0yalo4mzdlvJmEkayKPXHE2LQ2HsL2ak16fuIu_KoMyr7ap41az_zaEG1kj2m20Qz45gCxau536sYSlPqeUSmUreIAY5NQ73QbEg95A_vbrVXxw1xZn6q2_10FHcOxe7vlVB3Bp-vZYs-kiSU0FMYrS90DseaP8fJeqklgzbOU9vkrjFd7un9hO-WZ1k4AjKFHPJH-Qx15uB09-qvrukA9pcZiMtFXd2NJM5Smw5YGf7G9hvJ6b9-j5-DhaX2bdSMggEqv_tURkJoJj9d1SJjF27dn7h-BN_qHsANz9hyvGYR-q23XBajpyvGx-uI1aZ2J1NItnxDPQBOV9j9aLWOxJkRYcRzPllSS1VIo45BlDMIgDwv2yMPeubreeq4ZI-q4gOHs6BtswFz34Zet-_NVOyL6QMOw25swmtg72HJ5KfRqj-urJgQTP0ACwjYUPgY-UsxUkLc8CElXIqBuFAX-exD07AK31nih7LaYtPnLryberXNPVvrM25pi8TPcMx9m3IEjENG9ciMbgHlUaG7WUJE12vAUVQZqstWuKYPhvqhdN3YfYoytb6MrwRQGpAhU3KSsGd_ouxguxODx1ob73IpFLCK67OgIRidSMM6JibzY3erZ6tgqs6JIuE1UcxgHrXa9fuBsren01oLnnJyqwrgRSk6QXvrLyExifdq29Gg_5e5H5qCr-hx2-uF4wOCsPdtzjPm7haZ9ditg_8ngjSEbd_X99wkX0rDb7acUCkKp_l_6Yld7zWD5a40t7JPQ5055IZcgYoqGLmHckMfok99yF7y-g3PAtoRjbdP3OC_ZAan0HwLcu392fnF5dX1ze1ep1ur3D4-N5lOr3en-S8zah832R_fvz_5i2F3-N8a0_3V1ffg9LkYCNY-s3r8ODZNPeSK3Puf6mgaf3O9ZSFMMcgSComQhs3NRZmoPSln6a5RbkaR8_BzfKNait9w9Q-Dzt1ZfZ6BwcU4Mw0vb1J0GA-zFVo9Z1DyrPb18PzHrsB5IpsbZDNWqQXIJowXOX9x7Gw7BIS2knBnfcyaEZgpnDhFxDLjy7uftahfqfxXcBtn5hbRBZjccfVTqGnMoW6ny8bPUz7m-FzHk41TiGy8w81fQtotzV31uhJcvAfJh4F_WF8Z5vGh3O2Reb7nQtPpvkroR_jhcV5YI0UDIeeoiM0P6_Oxs1xXf0_b-uF_ElwFQ-HnquNtFAgWR87OEuq74Pr_MQOKN8_k2EkPgeYGkB9pfrvVaTftO_D-7RJ9rKVOZTC1hj5fRSlL0zh5n_aVdmDfifOf_YCOffInvGnQ-VILsWIP1N4sixOqolJx93Dg-dHt7gKaKDmnJ51cKxEf0Sam7dzUOExsDh5p9IfVyoNmzEZ9YeUlNKW1CEa1-qv-KExskh1Ap8R_sbGzwgiSVggg7BzCTd5vubluOT-GMvXBgsWYcsP2G1NA0FhBTaiEncI0HO1GDOsegFLzEb6eTKLVfqc0SY1LloJ8iiRDKdzgyQgMFtDrwYE_xTxADIddfiTjGs8MRRDsJAg8bP5_s_nujldmmFPyZUBvTd6F42LGs2dPZ8k770q7G3nDImMFBfOU6IKfzRY-2JpXQic1EOLabB5pI-vUsllYalj67EpAjCSfAILOEhKLfKBNMxKEUBaU2azOmLeCLmQV8j8P3BZTEm30NJD4PnX4O8k4C_EYS8TdaIPsHJv7-Hr6LlTknu8-tOzyYAqX-76qFaqsnSFNfM4mUeJb02ntKy5oi4Z51mvzklu07ToGdmJXcSJhuUYABJHyZXDfvbEgCRUCR0wg6UrZwj-pXatQQA4y9mZBHrXaqgs5GyEoZaiMNH5lwUMGgH21PGEGGPjKUYWqZpNSauizhCVpUCvHnlJW4bkKu_3hNMdv1xvZleVEjyMddHe1HmxtbvIZiGMHHOB5Lm6rT6HERet8e8WTu5dhLkg8JGw7JAh4ejRh1LBNLdwfz53r9vaaaHvsLrbfJAPhRgJzC9-G4b6-7h4K2IbN0lCFXBy48HAEyPhKZEgIFQmjS_fFxASCGjobnN2LaXMId1sG1xcaTZPA5OGZdhFoXN-F5ejHsRlwZWDgvI-Fos7Eh333Rm6p1M-vxZh7Pfw5Ofnei4EtCbJT0F0jNQM5UIikndLQKPsHLQawmmZ1J7A8MP1pYW-wjkTYfhiup7JFY_wjX2S1-UMhVFTVG0ZB9CkyO3vSGP9U9_30l2z6a5kY8um1yUZuQJtImxndjmkXGfBqlZFe0lF1n_L2BCr3FBhRV1RcwVdvNVy1PjW_s06Nlim848N9HsNFK3ZMAjhKZ1Rm1tGvuZCpkbFgFDxk7CXlNcb9H_9ez_3-N3y_3tjCBgu5pJhEW4dqshzpmKT9-YQsHtxInqziIVTTNFOkPEy4iHgUMxn_EjP2O0gTK_JUe7fdhAUNNqKmH_fjUsk3r7vlSjGk4qzxwCu1qdcr4GKLXbgfy391oCi5GuQvWZIAfVgK5K-UVz6z_qCsQHlYO26bfaiOFjSoYqhLuNW_5PuU1neDfqEbTELozzYMcvX3zETYehnuw-pswwWD1OT58O7Ylad3GrFEShsLhDWkjb5f2kXOXEQpeKzXYjLl980O2PrkUfi9mi_kFCZap3PH3VY0WaNJaamBQ6EB18X06RiaqvZu8ZcTAf-A23VaBDe3U-rht6Lpw-0fLMIsOlxRLijE-wrzMJnM-JGgOducwQAfnWsFg8hrYFO7UzrQAhnCa7Tc6bby-AJP_0F56X719Q8ejIPwk6X9AEPndCRut5TSUnWoySF4PVwJtJ3O_vXPtfhJRA6ZtN1YtphsQgv3vVo9M_jvYHGtnt8PtYyhyoWU22UZYCg01s-VYusAAY7cPkqTXBJNMEDeBwgM3ESkPV2UcDyIkuAem9YeDWefqt1cGa61nmj421DJdc9rcq2RIL_YFAEqiesbmEu-LBzyxJSW-Pmsad1gbS1Ooz5l91ruwfdrsc8GfbSncPx0cNhbJml3x5FXQbOITueFocdr4npo_RJMHSS60aJJeR9x9FhcE6LXumSalMj5953jpmvOLOpdSPJ6ZpzleWub8IpQbXpfQuWWR_cICWsLneHFw-qM58bSoLsRFPR8PEZ7m_BIytyzCL0ygxcrTIruQFvmFtFR4cU1m1b2XFfkuXXO8VPP0u4HdLR6dlhSeFmFRX6SLuhA1tBHldNVK9thhljyOEHzyzVvDxc3BQeKQRnoPPolAKaJuKDI4wNIwG1kh1L0nOZj4e7XCcecN3Lq6pU9DO7hwUFfFocpr8MCqd-2oHigeKa5CxXiS3X88gpiEcp6soaafjrDROrBf9e86ywPe8DB7fp2OFJQDIQdEdabQ7aDHSPSrNpSKIu0hChXQqvvQ3QKzarwwjxSIFTVQ6jruETe9Fhp9J_ssqlKbKm3TBEudTXp0XDkzhOJWLYIZtg5UmyPCSqZ1IA-LxfMzy0aVYcIeo9XncV8A34pJIQVBRRqiD6smGLSZCa_vjgnTsMU2gxqrf_7pjLw9ZZpK1ZKwk4ZP6XPrZ66sMj_u4p6h0ZqBsXmfadq2N6EGgUPCzhqx5hLXdNRvE0TcudjSPzfGyDDj7i01htpZcbgPvSEh7ywrHzDeXoQo4GTE7vTarAMmdSaQWAt4nzP-ajDNl3WfIt8gLJizMKC95y5ffl-PWgRZHIshmho0tdOW3vbGvMBIyqJMyN3vCL6sd58uS9TQmYW9DoimxlvShcPSmmZEJwlEeJlEbB2eIPCFB6WWTQO5gSDEDCkO3hWyoS06X1fMLPD2xfal4UVES3s__qa-qij2vXW5OkoEj_F1DYHZN8kdCM4jiRTZO_9D9noy2ecDH3lvU3PFsmkgCZc6KetlWaUNsulzFDa7y2VbkrtzG_AOvek24Ol-S-oXdAksNgkLPqDBcYI0aZ-0NnDDFwON8agucV00L_k0yOroLUg7ZGJ8p2mxZsMywcQZBmCmPUu1KT07uiq6ivq55AFVQd-TXhs1gRjhisJVqT-_tzPQP5e6lEgOgFqLEoPXdT2ernhLaEYiMZVPzfxmXvFJJW91Pja7Q3PwVYYZjo1XVwN6G-lQ0DiVpPNWl_FJtfwj6ykbUxtutnRDxo_KNJ1PAAKBar-zSjgkZkp1YxDpyP5tRKATAst-zP0spNRtDhoKUjp9RJw2JfH1f9e67AdikBgnE4gLMrVg16bcZ8nBHNwczCp8Xi8dhLhyjwEdLph5puRwU3UIJJlJ5VkNZk5qf7IWF9j0w34SsA_zwEGck9i6NgQynDKFKuAkIFk_qtqJXxAfPEOS4o32IIppszt_L2ULDYWPLPwycK1GdX4q9BPCLnLATWce9z4DJhCrQhUNTIj37Acz1-pCX4M8ZLt2mTWzzFbawZDFL-Xl54BHIHA_iTLQPaInIUQI4yM1kCsUk59qviO-phNNTNl6Se4AQZKYLSHHNukUwN8lXni0hFChDQDCP4-gbBKRbf16H-MSUFWxPRH3RIktkqFDeufgQUNFT1LVXdGn1ciExss2pR4F4m-cwHsqsykzelkpBXUtg9dTZggY01q-LRCoebmGbiMTDRl0c02JqWTmBrblxWerg6AdospEqOvXP9kLEEEgdvAVvVUdFvyIbu9HIYVJfxGTrE9RU6-oN8CyE_mj-kevQJAV4g1IlGTZJfHLTZjieEn8RWcxUOSkgvYqtzoPH09KP-_9C-3m64CQTWzZiSyKR5YjKlyTgZUIHzBFRyQRlYX7iQvSvBpssktljSRAX35vz8h9iMfEXaGMU0nioOI_WVZgwtyrHBV5mPZgb9TewBr-qGIoZ8l9j9c3fr6LBoyg-uD3rJTaN4I9YYNZLcJmE3tQCj6To1Y4aCcVeI96mzFLKx_s590pGiSDL_hI6NZuNs47xCQtHo0aNpAffmOKrnE9MUv-fA_bJT7S2nO749nR_ILO4NJxYNLsuDExQmnvwDiV1_Uf_pN1qaNaY1gA0TbXEwKT2Db4Hx8diS-AaSDiIN_CMfQ3Acg3jmNrXDrgg3DcWF6emA__2YFIbf27rBAiJ9xPC6LbekdFNLJA1bkIgul4umfxjDvC1V2TGdDCHUWTFGrbfP8-xFgFfS19V603THEIDaSWHj27xLNhKiGEavClibn-Z54MZ5PH534S4m4Ir8TDBlJdpt_DH2vN7fB_trIVarqrwtZTRG0dWMdRTV4kxV6i5WvsnxF1bvUknkl5qQD-qOq9CSQcOuVgfZ6-AxhjGBvdJ-WaaadwSAGsuROL6f_sgBYPZFgJ4loND2JsygxqVaOsptuef_Z1eKdMI8ouSXB10tSslCGa-vbkFLFgFYG0e1GDV-JcMUlub2a9-GVYyt5BrGozUEpt65IC0VQI7qHZWtKNyKypyV6VGvAB-stGYtMysXFbeE9ro1JfrpcyEM86Nb4ibmXjYmiZRkSdXg6hNhstsvITbGrFhQLG454Ui0s_xhdM34fbJNuKyjD1ShNPQvLq3_KtDiYAfMrf-SJ_WXbs_H09V1uL9eM0bklwLIfiHjfjuhxoKZmuB1EuXhl-4WKcGp3Ky-f381GSxJ-PffxLdFfaOQ3rwdr6zyOzG3aXsd2Q2HMpsb8SKYqxp7PTFmnChe0aUzSZwwZTqj5ryhn4B4aCITKLFYYz-wTzPbTF_8T2RMwa3hs0SZWD3S3qRqsE-GIxNPr5prKPo0QxLA7wKw_jqXaqnPAy5Cush9xyXleLfCg-0VYi9Jm9maSVWAizy8Tc1VVSqf6MOTxqvftvE7yLJX1UIo3Ss_fdQ5M44jPWU_6tCAdV27Ck4pOla0uTmEuTDPo02wVOzzc0sUUHBWnzGOyHc_Ul8VLBZQHhUHyD42u0SEykg2l_NsmQTEh6obm5Q-ud5jP4uZRj08MxvtDv_jwU6_0j_4rsG_rGBVaNQNAHe5Y5yhd8GQvu3Ov5DYa1e9YlhJUNoTwhODUAalk8vhQSxXCpX-mkoaAz5i0acSzCkWm68e6bnsaVSmeeTF-5vvIZySgios7NPv1MD6cqXDLRL6WYwJybtH3VTlGc13PfqVeytr-mFznlHyalrfl3uHZlrewqbHEVi_KMoj9bC1CMbeWJcscrvtZ64Nt6fAGPV-yeQAFFTr0DH_bldV1Tb0gz-8f0lXV_UV_LTdqO6Ty0SVFUSm-2AwnhfFg83WYNfU-_zlfNRGphtnBx1rrxT867i34xXxusm3fjGzV0qeFKB6qNdq2X8VEavdIxgWWV4Zw38UKnbr29IpTGoPp5Bzi9l23RHuWfyM_kSQA6KVw537Jie9YBuLr2-OT0KYvTW14Sn8w-7XTrUE3P0_rIoOyUcJubd3K3GsBtiB1m4uXMgBNHMsrz4kFUxJI2SUw5yUE_rZ8V-nu9D1RHAHoEMZeHkAwvSa6r5_4Rq3h1l23maOSgs-dTKafIDvrg75g83k-LQi7gjQDmECv7-MKjR-h-n2w9f4IljTaSmjcBD9ZKHVAtnQaf3XKfHFqxTWWK8CXy2uEhzwuleTQDAsWWpA1BE2NV14VLEEGdiCOk59lhSdGwuRIDHoYUh1sm3J9WlnS9DkPamUmrkmwu6wcqroiyuRjj3GHDGp6maSehqRyO6qiZSUT2FPvtQ5P4i8XxtiOmW4cTVWEX9KqSBZJ-ikj6MynC6Qi8BaPIZkCGxxToCoIGiT0MCDLsS9RaE-ZfH5I18aiePbyZ4wDQLgnc2SeCct8VkVyoOUbB7cKi8q9gnOGL5wCl0MUzXMiyiP2FI6VoiDN0Sz1o8iAAfQZBlV51RYJ1B92-wYpbztaVGh32IC8XjYv7q5sJpof5rbLTzmtHIjMxOetPxTS9qJ6gleahZCPWkRVrH88SiInJlj1cR11kZhRdNYyZTMK70I1rOOZZ5QnJpBxsclIdCaRdHaEX2DMhnEgfmLDKUlWEXyX5BU6W6PiknN1PFfMUCFJS1ZYKTxA2tEb0a2NGl0fJA0HwsY5X9SbPnfn4osMwO-RBuaBufJwn2c-X2iCNrjHo_j8WHnDyNQ7WNvqqqikL5lvClCueTvlqpiwb3EjMtGh-TY8jwL6XYVL5aVg3tqFehyXNnCRkYrvtgiBGWu6sCwyDLlDg-9F52UKK0j1bl_PTHT8meRU925Q0vhIs3pFfOnYhHhylSQfVT74J2rp1RndO8iVim1OCtkXorpK0vzQpIVsP4b_JFSC9JzeDQEg2T8VJ3aDNzcqI0CGIpbCgR9ujqmkJo6pIaosyAETUGKphiu07tMpNDxS1r7LSM7i92qZofU3lf_ELAN2qzQvg60ZQ8Oh9Soru1jI0DrZM5KgC03ss9mOcmZst3hDas1kWLeuamFwHJQAMSE4-E3M1IHiI5YcllJ2BW4LHKm2Zym_1AUdTup8kPxC17fSGvZHQFr1ifS6curqcRlzHPndVuBhhr5zMrOCUpUPwYWX76usBy-VJRXw0SWXU9Hx720kEG7RQmkevp1eBnkZIphPGgrMFK4HPr6pSvdYFYHPAUe4zWx84imwaXLbkgLz4LWW4DoC9cn7UkS-aL2iyTK5qCrW6nFRTk6qYDzcpY-iI6_MoSXY26Tid_SrdsGKsiG1pGiblkgM-cxZ8GFLX9lHT_FACluowB9aTMZKaL3ejrklbY11eMgCVppPqU2WYveWQONetzndqNAflNdnvmgOGZZ6THj21wo-weDn1-7UviAMT1AD6NgoEAH_HmIwDriftDhm80fNsQ6i87bReK1_q-OisugQZKJOe21rYHc1V7goTC5ZSYe_SK3lNKXRcIXxoCjRhfV-UtVxG5waf_nE1YiH-c64oU1SIFSoIrFAK-mRarAgKS8PFOKNhxMcAA7jxsu3Oew9_yWBxUJ3hNo9ECGcXOaky6My5kcBrpZwYM8Fo1MkkmyWnpJm1bE_9HJje5YGk6cJcN3UDrqQ4jjA0hVMXw4GBgcO5U1YzCbbIipbX0qLPRAMIrOfa7cdchdnipF8vf8RV85Nb55PTzXpH549Rt4KsXqUtYH8yS6dQ6T1sWNyyA3jNas_Cql9M-zoaUbnpTnka-nlPJJlG0xwAEEf6Y5uvqPH0ABev03PpiSXfYSI0cI9S1Ri0IYG8SleIwEV_k2q8ETmWhMFmL43gefk0WwZt1vfdI5dgewOFBulNjT_ulbvSU_i2iekemf6bamuze3xyRJBGsa0vG4vOVaq5RZyJTKpWg5uwCY446bsq1CY7O_0jjxnmNqOk7G2rvpDhbBRYnJoBk7WR5Jhz6O7Wv6Y2Sw8X3EHg1M4ybj12EkzdvG4EeqZ9U2QkiicMZfm6GByFLBe97_4uEy7vSpLdANGM4uSFFEPWI49bAc9wnIrYPbS7K5oBzK86evhUFwwBRQGAD-D0QrUEAaWrQUPbgAiF1A7M0cQGgGWFDKfFdujalk7oabRGOR-A1sNnNK-s28LGkwrSkGqdF4xYlsLK-EX8-reuqU9C28RQ6iOfd0OBxjhC3AQSvocOp0KuDD5uDKPuuIwv3QE82lfNxYpOcFf03lgxDbQAVO_hMQcJq__DuGCsiiCUirfbHMSdhtod9HSBwlxKxS2xAfWgzF7iRqiiWEyPoYBNYHuQA_BZ8N72WLB1qMFlhX2uQz8LhIdH--l1QoBt7QLQ-sD0YQLWYwB5coBJB9jxPBZoWxCXgpjRlEjGqdqT7lY1IhNSTfZc_jaUG_yo8QBMuFjJPETh6_neAa7bNCmVro94tNYkHxbDO3UHaAXNoEINkZQeXSkHIp7sgJyZpCytq8_2jKqnFOf6xDwVsitHaFdHdYOwuwkpcxFxBNPkaHJnybEu5tMzzk7oiN_hvSOjEGiOY8Lgqq3l0jLANlrFlX2AHQoE7tM-i_yOmgmYN6rX3sxhbg8V6yYSIRY-4ix7Zs0xQD8fEddTR6hw5h8Yx11yAZfCJF2oMzCx8vcB2rhg9Ef-kaIWWO1HftBuVnnxHlrCWjCY9TelDi3gTIt_DIwxrFZXJqxlpzPytimzGLUncsf270QVf1lxlLmWG_jjuwElxoQa69aYmyBIJRQLejHVCPc48wFLs5TobpumGrxEboYI1A4RcRMM5W9QPnRChxJ6aJCl7jMeqjxtsN6MpVS9EjpEivtRUop9lgMBVmzO9T5Y-laIwi27SXqRVCzvGK1bOFAV9YVUcBZBv0phEAQMOADzS8YoxcIw2yYGHuZx4l0nS-kM8T5zAODSX7vzzAInN3K2gOS-ifoDFEbSNnYq3dyT_mT2qJSa4PqHn_AktgFdnnOz_nqR8XdUWMFDaJbpw3mzMiM2Fqu2JHXaSSep1yQfkRF6kFnosd_Mc7fTRyATw_DygPrSk9UBqwDms_RkRCjNB1PIeqK4KBKTAsIZdkJtLCtirzZvArWT3DWCucsEYlDfNU9tIRQLHnicXFqy36KPcCkBq5sy7VyRnZHhxK4TSPvsG2qJVQ4os5laAB3qhyS5HPXahZebT9kd4iL_kA12SKczh_TU8YVTwOTDDorRvPB799Omd6ZszkY1sw-iy6KZNHhQYfh9QPv-YYdG9nygmSlh44pCgAhJnprHHLj8OVvNWaqVqyRQ3N1V2_jZdP8Z3r0b0dOz8-_MMUs345auFUkjqZ9RAUd_Raqe-pHiXObBQ_nk_AtGhzecg7ra1G9fjcmVOpZCY6aIVpQG5kPnS-jC2XpHlN4LJxPQSb-UC6AEt6jEWKQYdL0BpyGT2T2xz2f0m6MLowOwQNBc2imESQYnGmm72oXOE8zR4jqj-tggkPGZcXnzDwMUa6Cri0h8ntnAtYaetMcC7_CTTajrt-WNptIJ_AW6Z4xzYMZywUwMjQ2FbJ8IkO1qy4C-nacT2CwJcsr9E475DXUHiaU6eT8IRnCBXU-NQOwUQbu2dumhUmVySuOFlJxJ8q80FIP5CqrkbJmCY-srmnRYOC5dT0AiYlRfL-KqkxR_Lb5nTs0xruZDTnTTaHLwGVaAjhK8yJ3aypjGfzmI3YR0BMSgkN6dt4xS97JGmQfufCoqS9A34gMUyIxnTuVNi8U_MDJOIl1F56LI8R2IyCsSssM2g7KZfyBpV4cI5vkqf9FbooXjFvxv6x--IQawMVdcU2NeU2ahxAqJcUb-LHvexwDuMFzLV0K-B9ZNto8_3tCc9Jkw9jdi3SqlqrY9pKxWC_hnEYnqrMn1QGVz9OvxGRSc4okDQY7QrcpoeAh0troYd8NEU0ihAzBS2MApRr4T6R7swa_ESzysBbbYaXs7TRF41A8E9hbX3IU2rHXTX8UkoQPp5-38_CFdIAhosU8-ZnLLXbqUxIrY9K31Lgqcs8SIk0aZyQma4iwT-nIOhaEpUox9yRA4U584lBohv0_A345jMo915iqOvtcoReKfTFUnt_IdNwkeNvygk541hCkxdE0DtTsyh3WOiVSdDw8BzPmSqUXQpY9C-7Nq5XHpY_Q5DUiCRGjdCVpe4mVEXzwP02W9NAOcD6y3y3wz7Wiiy_Qre98benKO0yfn4oiMcYSGhc4AzfGKTMwEb5nZmTUH9olm0V_Od7f2CWhWkcfkKhxdlXBVuNnvubJX5Fa3mr1LOm-HLkRhC-6wZjD7MJRNRjFYg1Hr3TVD5dHAfUB5UggZpLAELxd4-h3EoKTYSUR0EUx4VQzNcvMitHVdkuNI0AOoqeOdDgAjWONmO-wEANx_dxq61ntNAsGqMe5gA7AxYRf3lWyHZH9aNiy6soORDbslTWsWXu6E2cHzMmltcx8RDSe169Pj66iwb59TcAKJFNyhcB1k2qp_JtKw0eLKezJTteQp_6UlhHYP4NRxbZd72J10O2_sM1_GZgeRtKNTIRJvvadYWPfSvmxnuZRs13Z90hrt4_5pf0zphRad9-6nmwk21dgQ2Z-VTJp35paARYt8qb7eB1kX0V7ICj3176qAeTso8mxltjpPS1Bh1DofmFpUwdHb_FOo15vUI8nT1Ylz7gn5JKCz5uoSvoAoNUuNYv_wMaueKA7mtERx4xsbxLXaUkj4deYyMjtjxlu7Ippm0VLBI70EFS7S8KpA4fHicIoRNhU5jzGrf91Rw3Pl1WLLHQkXfIxy5SGJmIbZa1ysm04S3ZZoINQDQsNbVInYaeyYxtDjlSrVXgWgMo96eDiwXCJhaV-q4iJn6jV0hFKkXZ0PgehLyXYpCo-kSFAKdhTO9BLwHYRC7Q9R88oPlYjBA_9zW-bv7b6TnhVIyFsolkzrF-VnB2e8tcEgJlLv6ynY92sfnRV2llS9TBfEgj3TJs9m0_nBfgO9-sNaQtqRKpaQTtgCaEhnh9fLZ2ExlQijCNLdy5SjBeJSGXk3WhaA4MSPAGqs_1QTltCAEI4da3GHGky1kMDyWLlLk3OSbezMSxyci_t5dTW-7tbh4wCtm9pmHzHsEhZX0H8Z6XzhfQxr_KFFXA-dDv6btF-8rPoXZTBFMFI33OBVyTb1NBmqN-RKcd7BSylbRbgYKusbqISHeKqnIQZAjhd_B9j1kL2AOcOt4_nI1ZOh1fdD6qu3zxze9-g__SDW3drzT3xOXSrc8C_Oi54watkDOCSHiWeGC_1fGSBW9oeX5YouHWlXaDmGKp8SCiadV8HnyebSWeVl5-OPuiE4wzEX0klsf4keb_tgjN6ZToIu8P7Rtbjkzm-0PMwOn3LXpAP32WeQ5WdPbXGuqx1InZxNVrjFM7CbKNIkXLuGZlPX8XP0kdzB8ZDjkygsPYibNRl8vD1Cr62uiPWeqkM4_W-KRjpaSbbKSvvKNssRXL_rXzPDMAULshK8AJYcNiKMhHNMoEooMmNVg4jwIXneQVEV3zSV2QS_otaDQDaLdiXNWGiYj3L-4lbUE5kbHNSuyBkn54dh8_Lo4DCXTZlmNZ0Ni5qaLHJ4ujBor-pHleEhz6OaFxsUFn9FX3KOgzZKP2zM37cLBugO9kuWsBjiuPejRAes01LCeiHSnia8CGwFDfgiuLpPFetgtxFjSTwMDAbKKgMzUidQBZ-lpYZDRVv8_oyZjextKJbg81UswxdHexa6KctFazEbF_1t1iHNpj7PWPUB28K2CvGA2hmqzD0JYPBjloiTSh8Lg6SOhup_0e-1iRV9lNfnYi_ezX2pgUpdHnogvCQ08hbShqB4ZYDMYJdL7zZ_FQam66XJ89q3MRqNYAAyOG-uIHxRRaAtKzElZfoj0_x0azZrtFMfEvAgN6xbzLXabT0fDI0gBg5HsvVgfITcv30Zkik01Gyx9gGi9bYCEqt2-53lqME2f_w-UQGeyRM_pDwV0wBhhGo0Ws39sFsl6nBIDx9BFJDuhhqzkVXdWAgzg_zm8XFC83vzZt8Ku_XeH-lbYe5Qsm_pLul6-pn4C8UIk8rvUlWcmmn08OjOCR_k8mAd205THR62LOAJSlUVUo1Vpz7gAYUFMyUT3MgjF0PavSPvbl8MFA3BqpMhrajejDumTCxvzzcqgWmUHDkwPwQ6kvsBkBBRjDCWqDLT5jWpMa7CUpMc0AugEOXGxmwXeyZ3ihZP89pehIqeHl9ehtw1IqXlZByVEto1JwdT3V4KRtJTyq0lVAsOd4B0gVjPAg6_-Q4wqasE4XQnkTcjFUKkJj-xVuyT07zv0AGrmpkEOdG4AxYe6wJxfuHOITlw4ccwT-BMp5ERezwxcFMClZ_KvdjzJW4KjM4vqF8pfUp7x4a7aA30t5gjc9c2WR24Q7go71tBYR1Z_S2sGF--Tz6XoAz9eJQx6QUyLaKo33GC3btv2NVS-E68WfHLJN0WXUsMT2Jjkm5rOXZj4EhsMmFMISNvoJCeKUADjAia1HsGeK3j0tUZgpOGWGMQoyo6XJQLraUjVgZ1OiXnd7z2yCbtLos8_fotbHlwBZeG-pBqJFwyPR259BwQNYHiwe9DB4JrHOzQ0MHIciO7VTRaAu_E38RHNTmP0XL00iscHsD08QjH7ObtwAwpzY9L574UQyQqNhw06ruYVxQynzL5fald7bom1YG5CdTJzd6xiCSrDtoEAA0vs40lkzXD6wvqW6FTOipGuaaRr_ELXalizbsCHcAuYXxmroJnzmrpyWc3dvUzACdWAJA2oANb-hOm9igvRda1-EJRa5GO2gSuE-FF2M70FPJyjntfeh8Nm1gDq3qxIEYGCCfeBx_ZyQ88TX7GD_ttU3mMuI5d7CX0e7zgkmnkmWXTbFttmlI66sq5HkzBkUlXvtrgMLBbJr3h0C8uPtSkQB0KJhEDcl7pqFHqPmIVC435QHI5V2Hp0w0vsxuc5oaVv3-mglpYMzTNsMKHzG2cCY4mkBxxqdCvXx664Qc2o2EZnxQS6fusso5-NzjGZXX7_kvKyOXfEunKXXiB3I5zvqRbeNqmu29sD0hKcY85AvV6wovx4vmZe2JFbREdyyaJ5gQCmS8c8e-2VXvysnd5kYjDR7_OigyLVnfXaMhw_ezh5r28QDkMYr3XWvYekoM29N7aC62ffv7-ZGJgqT7eODOIyBMGb-P2nBT254dIicKxls-whx-1XcNE7DKSmtxfWExZJo9jsjyawiWGw_WyRJeKR0yc1lh7OWUJLumkqsahSsd_VEtb4Awf9uOMwxY4p8jMa5eTS_JDcjy-1SBL4JUTZd9xY0otJujTNQwrmSbGPz9RLcVIGvtq-Hl452RldvNc3Jsh-vs8rD8lgLdJEvcYV7F6iCvAdY9K6fMNBBcOjaBT0IR6LkfGyQHzXZVTWxNzvGzt9olKsLDswwecp6_5Zfd2Xsc9lJCLnOztLjE2Ke0bDXiEuBJk1KiNmdUqiqqixBo2HJEQS4xnUkwmlzfi9GZTbHORSnV99NcpPvn1KlsJGm0RE4bPrrOHSUhYHuCuCjzkbFgdDHSRyabEI1gpyWpT5YHDs1WGtRDQ5VtoYPj06-CmesNYM-whMMz9T6Ok3OrVA_G_KXjFRu1iNJj4PieybzYCzBgwpNflo2j5I0qbmc0piFs1wHH2oX3jCklf8qRyzxgHUqrsQ0NuHBJfC9l_bhttHPJlMix7UzBHZ-sb2OLsH5zpOjNtyq2rq-Z-Qitm6a1oghCnxKUgvrvwatPxuL-gTuZyHjLZMt4AI0N2GQiIQaWChMikfxPaYJndomdO0qLnTqdFXzrN-UlZGyz2tvyokhF7TnyWc7fstBNepvj36_uGUhF3ew9K2Ou9quS89lxmDqM93rakQqXu1rn8olGLyp-4SDcvT5je6s3pyE-_lFROXeis4494Y6stndOvQskbRs_joXybu-rqc77dNJG5yNAiWmHrF7XypX2J0FH8UH3_p9bvQffw0uylRf3KBmzJRncfQXnZMWqWuMVWedHlx5Mf9vf8aDZwzp3I7YXpiC232dPOgUfWBmMyj8kzMHfgARHlDgVjHYzkzo4aCQxVTQLCE6wcS6Zk4lI3g-3fSn_DeEY6GjdhZmCAfVhwuvKN_TQFA_bSTN1m4TinlIrHhArEysl-3De-A7ig6l88nDW5VB0CygeNUdWBZjpKUc5ROLqpnNMw6JaKKRjIQZrSbyrQY5DjKHtGjHF8ugmsgvJW2aIATFm3LLL-wn0ns83lGysBfEEyCWUqt17eNnVI1EOsY5KHD18K1PfWH9bP_v-i1u7_uqbJcz_9kYWzf7JcXm_dgwr3gg7aWe3JXl43K0hQVc8lVTbWsGdw9tD3z62sIXLaTjQfJUt2dU9-mSbgYvDIh_0BfWtsXQ_lWZRYa_6YftwalVtS7W3fOjvTBVf_jvkAfaJ8xQAQgj4xTgCqeQlHzIol4J8PvesP5jgcPzDRoMu9_YE3CsKtYmzLY2-9vf3LfIu28dPMnYeilL0byZCtHA4caSw9yQvLGyYB2AX3eZvNi9tzeX8_T_nxt53Q817hHrtzowhDe1-qLptokZVOTHMR6BHGVMrJRYtzbccNrRzfbW_UhXV4vXzbdfO5L9Jy3DzASxfqiEmt7oqIrL50X9RwG0vuCfWmOzmej3051HFy_6kVtN7_hXAhSW4OI4xfv7vw31QZ3FMd1bvDOoPwD0W-EquEOyG4JxZXJ_qr50N-EP9o36_bNoDqoNB3-EE_8ivf-q2v_bPk01-9KVOMvDt9OIsrflU6R09j56_9w8__S3_8L2XrU2_zFL2qUnlvBYSfx71colcfscU41Is9hQLnz64124_iUFj_meU__hv4autH9QvMU_y32ccf3beVteCLXmdh9pd_9Xy8vTYt3z597rfrxiHqnHX0c-Q70zGXsp7pt3YWHp30zhxtvvC4BLyaQ6pAxLEa0VJHW77xAujjgjOtCyrUiicZU-_GA7f6Xb0Rr-BL38ib4hUewbnuSST9XziucGkm5xZw9_EysxvYUrZy69kn0FVsX7vzd3sIDRIWY9O617ctLzROWEyNPgV5O3Is6m8GzQPL7uqS9fc4C-o7OEmUcUgaoILT4j8D0HIc6eXsk55icMrM7Mk6LX3pzV3uRQIs_FTK6vM6fWnYYk7j2A6QP1ELuVPwnWvdOy9bodR_RQq-SfRqGsrupw4KTrDvBQ-iL6gVZ-iKQBBwrkhrRd5hI5dh1LyODDSLcyZjULW5aP1G73gZZ2FdPSrOOowOldjhkJuFQ3qwTwiCzdX3dHw-sMLQSNM5XEnByNwZPEUSgTvtkIxpNyrQy3QXV2qpKCU2QcPMT1pbmyMNIJliL6qBSRtAcJQ6IQN2fvmVuyeapQfUPmZYD-q_q0hMezEUIELLONpm4nnjQhvlNLuUWtNa1TaeWwMMhgE8I-zJ6GFqy0NzNNj3ulQmnluXDJxBni_eO8H8cNYxwfUgxD4xX3k9e44riKDOk3Aw1Ak5aMwe3-NEUy_9kaGpVtJUdL_yCO4cCg8trt0BmtJg5y426boWdPQxG9RYs1MaxofbDQjWzIRawPprLOWp8LcWycOltUVLvKBmGu6ypj1rKFkxwjGWM8GTSEGdWZho8AMMI_eY6__Vudzi871Z5AM-pNd2Bsr1gBmQKn7BjMO66R_St2G9OiprA4CNqsxhA3katSWaHIXrGQ5-CIT8QDmiiNb3eXI4-lR7jjlK0Y84YARzONcIO-n2tNVevJ6ZP3C21XEH0VzdqJbfoi-89e5t-pMauzV9-tXjn1StvACYvmS6qo4J-ySvOMxdPEmna6-uUA2helXwdWu2Q6VBgSuG5vlTZSOB--dQGhM6m3pLklBoMnjpjznIPp1mZbLHDK414RVTu7xeOTWNprgkrSfs2S53BcCGkGWDfZETUA8cHRwy77_xkHt8-csW3weBg-uOKg_4AlHnl9wYztqyqZfCXUbmicXDVp12KEiYWaSfp43UkiEEtDPRZR_KdtxxZhACa11aXkHbI4LYhrvOLbN0UNSWEAoGMFNQzA_eCARj2h7MgOERhcAWtpEqLrFlb4WJjEbq6EZd8bagA3W7LV2yi_pbAVvQvSuZv8y2FWwww8cbdlnSqEF5mzeym3K7_Y3uK1QLutygShQ0F08LBw-Fg8o3LF5q9rDFRnjANR9drSL3sdg4UaFOHBgFVEoZehaDe8lRiMKJO6WJtrbj6zCMM6TguMp4dYttNLjL7ts5wN1R5UAINx7OXlydGkQqNUjLUEfWUlPfJWL8Vspz4gzDcd6ZodZoOKcBK3BFGFxujPi_q76TU9T236hx0C33ZKAnVxa5e5HNXekH8Degf_-T8nH6Y5eCvun6ut1-BfIF7W-c7auZ477T0FzP5mCHBrtuPoSpx_reqJ8t-raTUR5ZWHVhbIYOv6kT0MhacopcSiOEH1nlpGTsqnOQpsWmGHjVjrf8rA-kdI-Sc6Y71FMaDTbOGvqRV-DRH7pwUiM7cN4UyP3PvDDas2u1xAf89V2w6rdPRnwbaXre5DWwi7F_tmclsoIWn5HOHgNtzw1T4lonlgyYxN6IU_RDn3sFXrKGIH4nbBbmM4gY9oa6EloY86vPF8Ff2SqFe4w4NwCRd9rm25X8UdayA8MiwsBob2G-VRAojasnj04dXieJx1J_qeO_3sPH3GvzUPOilCMZf5fMrj6iDcUrf4z0996B3aXgsym4smEnkpes4aZy8MXAeMqrnmJaSuAjkJYbkDY9qfrXQ8S3pCn4Y4QMkUH1oP0l8ZFOckc2u5m7MsUw619QOhJhlijIM8kpa4vA152L3YajhE4mJ1E8wFNgFYYiDcfEiSh-aWh9vg2I0DRXlTXGGZ8Px7w48kUsuw80hE0raz22b6yG-EygExBfQdheqv_lYpYHTcR3CFE5hLaUHE82DUtVPPxzSSI8dUSaZ6iRB_7_nZkZUfRB5Q0jeh5yL8hoosG-om-91YWDwRObwJ5-2JEJ0F1Vw2TWQ4QPH3bwoA_EiWQL-UjLMDG09cQq7aYjsjdS2U6Hq-Jx4QmqCjxKqeyxLa-vWRfXgTvnwiVSue7vb0JhkzgB6aiiOnvcQR4VE5SMQe_hyofnaGZFmanmErPv9Cpup99LrXpq3YY94qxJK_ovYW0SB5kXgKwJzNVH0YvMu8tlpBwVQHYXXf02zJPG45zDYdqkNj7jy64e2Fr4I3kXTsFsnzp8kp9kDF-7q0cw_y89aFQQM04153a33vscK1_2LyQC_YtsatKopLFGsIVY0vvlnJvtmSvmlzypjqauZxfMNUmHqjr2b5OP1wuv5W82ht9GDrWpZErkiKXfEYefqRSwiWXQeCKbaj74eI7TPxjkj2td6cdAQD7daU3CYHbjJYU75Rv3VnM6igxJbHapCKjLIeEh4iCRta1bYAZ9tk92HifbE9uVOlj25wabxwuI2aR3pxvavh0uwXJOSeQrakda5KAbbsk-EPGQQxEN5Pu51TGISJN_VktVtBtDwyAmFiGZYKlruBdC8sDgQZhlu11y-iw_cN1o770YAr4fbiTUqNPAsldftc_SNFLz_ikXh4zXy5kmBnFFOkiD71rbj1g8EOvAaHfIkFppvcY8i3s4dpusqBVHCWCHJGIFusnx6sDwiTUjy9DIEdjjBWOxmaj4bqt8k1jGOVYgFVmOqRJsmBcdcwEU0tRafa0gYLqbZAT7eIWthkdpUoyr11Cz82kRNrw9YuTCiPlcMmhPdS_EHyU2ShWki3l13Qz0-Sg648miZy70MMqRHcqZkqEIwWu-DFVn5D5Wj3JFbeNgKw2S1FIfZnAMzHM4VfC3HOq_mauBYNQs7yKoFY-ZqUqN8TR8M2TwSnhvmo2hoRZtOFoxmJrDtGVjgRTMFnJE5InAxQEW4W-cE-IZeRa3Qkdpeu4R7hIIcJRzPzqdFQdTzYuKoZzXZ5MjiRYk-OswyFvtJUrFqlR6DtITkWyY0mXrZogx4q23HASQEibccGUNWpqtxx9HvZjG3KMvy8pigSs0QRM8AaXBAV81F3zx5KSIu2uKY9-__tGucb_sYNu0HRLSidDv-UDQRHlxcvj05McQoiUUuocYY7Qn0F5uV6O5eylQHg2BmzT5ElRzNyrSncnjLXO3ntwKwyvpCtl582o3qR8ibdspUyCiSc1g-jbBYW3U1a8zf5JhdedcoHyPH2yRD50lRX3GcMQNbZ9KQdLnYTAjmEz56rqtvZEod5XdowvoVUq1ycDDJyrlIGlsmQWs2hls7FMQxQS7S9lnpDjivery2bLm81myLJmzJtsgIF5Vs1JaT6UNg1XluegvZRAir7nVenFs-ZZz4KzVUbU6cMwoo77Gp4PA7bN_G1p0iJNWkzJ7Kh7CA6-7a1N16I3JPMxDBBb8eCTBE3vh4zdqTFrdcI8jcsXnX_WXT8Syy19aiyP-ZKx3Q5YuECNf30QIIexeusJHt9jbexNhVLYEJSFFmwGPantbzdKxOqkOxQQRfRy1dNcLkK4OsEAqdTHScT-8hNi9ftKeJzjJSuHS-9CIv59y8OnQXp4-7lF_fiv8zSP-ohM7V7UrSTSlqiScFmntU7U20hjw0zeU_vty3ryE9OgIwgzDXVkHoYGr1jjHA2BzSa7LYM5GNdCadbx1zsnEHRAz90IPY32PNYIJra9TMumkJ2GOhCCIyIBeb_wHx9k4asdleb7KAgU8aMe5wFlnUw84qGZlaP61nWZMak1xD01Q9YZ44FyOObhpcrNt0XNvfectDN6KmBZurNkxSvXBQeveh8cmbLHJ1h2bnDITkKcUqcccBwXcoQ712EQbfydMKnVG5GoIObFyNRGF1oq8YJio6eO4E2llCVL8lrjQduqRo-Kf63UOCJoCAVlaWtvtkxIoRAA_csQpXc8xmmXkEY2dFGWnS2aNVh4RzyMVxiR_8sseG7CX20JyyB8mmE_5bDLEzj6D8mh40nsibx0Rtb7LodhA0Z02BxHOSlqUSG4AYZgqb_RZDb_hY0AKY2iEjCNbS6nNcpuOfSIW-lQO1x0DSTiNI-mX04cnrlmV9cOaRMWUVJ8FE28Ffxuj42FJ3g17yVVjacgdht20lRukvVgwh9bCI-Uw_khTl3KVslkjwV_hnVSnD3UNJs2MmfvKIlw7zmMOOw8UZaIlo2RhA-apV5PUPm88H-RiBiWazJC1KNyFxufWZ5EVxNokUw_q7v-xwgxghnEtZuHJ5hfEI1UpJNEkrT34uGayeCRWOxKa56Y4La6ATN2igBfvYeJOyGbnyCcNwtUikIaw8ys5BJim5z4CETK8Bxi9xORkhxHBw6kxxhNRqKpKIhM0pMIL5oDNzKKgBp-fAli7FNEAdZCYRp-EmetmKJWndtpMfDQh1ycYyJui7gYTBwRHSNewoj5ZzHUHKYnIZT0dkJLdcL1VIsVwYR0l8BiJie2NaYP9vqHbTzeItTFtjJewqC2uA14vegiDDUyfegayGplFONOPMkgkrH0SRUjJ3dQbNT0lmhAdosTjiVXAzdbrnZUEytA20cIgWrNPASJygMKNpJIAzcJJki8TmBQuBO8l0CvUZF8_fBXqzJwBvuyN6pmJFQ18271q2qZ7LowknyB4FM5qu5k3KTwBBx8-Z6q07d1dztdGYFOr8mw8Gp3DTZAqNkS1es5ZIx8ghySczpdGDAzYscczvjdVzCsr"
    },
    debug: "(()=>{var e,t,r,n,i,a,l,o,u,s,d,v,c,f,p,h,g,m,b,w,k,S,x,T,A;function j(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var F=(e,t=e=>Error(e))=>{throw el(e=e5(e))?t(e):e},U=(e,t,r=-1)=>{if(e===t||null==(null!=e?e:t))return!0;if(ec(e)&&ec(t)&&e.length===t.length){var i,n=0;for(i in e){if(e[i]!==t[i]&&!U(e[i],t[i],r-1))return!1;++n}return n===Object.keys(t).length}return!1},M=(e,t,...r)=>e===t||0<r.length&&r.some(t=>M(e,t)),q=(e,t)=>null!=e?e:F(null!=t?t:\"A required value is missing\",e=>TypeError(e.replace(\"...\",\" is required.\"))),z=(e,t=!0,r)=>{try{return e()}catch(e){return eh(t)?es(e=t(e))?F(e):e:er(t)?console.error(t?F(e):e):t}finally{null!=r&&r()}};class R extends Promise{get initialized(){return null!=this._result}then(e,t){var r;return(null!=(r=this._result)?r:this._result=this._action()).then(e,t)}catch(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).catch(e)}finally(e){var t;return(null!=(t=this._result)?t:this._result=this._action()).finally(e)}constructor(e){super(()=>{}),j(this,\"_action\",void 0),j(this,\"_result\",void 0),this._action=e}}var P=e=>new R(async()=>e5(e)),D=async(e,t=!0,r)=>{try{return await e5(e)}catch(e){if(!er(t))return await t(e);if(t)throw e;console.error(e)}finally{await(null==r?void 0:r())}},B=e=>e,W=e=>!!e,J=e=>e===K,L=void 0,V=Number.MAX_SAFE_INTEGER,H=!1,K=!0,G=()=>{},X=e=>e,Z=e=>null!=e,Y=Symbol.iterator,Q=Symbol.asyncIterator,ee=(e,t)=>(r,n=!0)=>e(r)||t&&n&&null!=r&&null!=(r=t(r))?r:L,et=(e,t)=>eh(t)?e!==L?t(e):L:(null==e?void 0:e[t])!==L?e:L,er=e=>\"boolean\"==typeof e,en=ee(er,e=>0!=e&&(1==e||\"false\"!==e&&(\"true\"===e||L))),ei=e=>e!==H,ea=e=>\"number\"==typeof e,el=e=>\"string\"==typeof e,eo=ee(el,e=>null==e?void 0:e.toString()),eu=Array.isArray,es=e=>e instanceof Error,ed=(e,t=!1)=>null==e?L:!t&&eu(e)?e:eg(e)?[...e]:[e],ev=e=>e&&\"object\"==typeof e,ec=e=>(null==e?void 0:e.constructor)===Object,ef=(e,t)=>\"function\"==typeof(null==e?void 0:e[t]),ep=e=>\"symbol\"==typeof e,eh=e=>\"function\"==typeof e,eg=(e,t=!1)=>!(null==e||!e[Y]||\"string\"==typeof e&&!t),em=e=>e instanceof Map,ey=e=>e instanceof Set,eb=(e,t)=>null==e?L:!1===t?e:Math.round(e*(t=Math.pow(10,t&&!0!==t?t:0)))/t,ew=(e,t,r)=>e[0]===t&&e[e.length-1]===r,ek=e=>el(e)&&(ew(e,\"{\",\"}\")||ew(e,\"[\",\"]\")),eS=!1,ex=e=>(eS=!0,e),eT=e=>null==e?L:eh(e)?e:t=>t[e],eA=(e,t,r)=>(null!=t?t:r)!==L?(e=eT(e),null==t&&(t=0),null==r&&(r=V),(n,i)=>t--?L:r--?e?e(n,i):n:r):e,eI=e=>null==e?void 0:e.filter(Z),eE=(e,t,r,n)=>null==e?[]:!t&&eu(e)?eI(e):e[Y]?function*(e,t){if(null!=e)if(t){t=eT(t);var r=0;for(n of e)if(null!=(n=t(n,r++))&&(yield n),eS){eS=!1;break}}else for(var n of e)null!=n&&(yield n)}(e,r===L?t:eA(t,r,n)):ev(e)?function*(e,t){t=eT(t);var n,r=0;for(n in e){var i=[n,e[n]];if(null!=(i=t?t(i,r++):i)&&(yield i),eS){eS=!1;break}}}(e,eA(t,r,n)):eE(eh(e)?function*(e,t,r=Number.MAX_SAFE_INTEGER){for(null!=t&&(yield t);r--&&null!=(t=e(t));)yield t}(e,r,n):function*(e=0,t){if(e<0)for(null==t&&(t=-e-1);e++;)yield t--;else for(null==t&&(t=0);e--;)yield t++}(e,r),t),eN=(e,t,r,n)=>eE(e,t,r,n),e$=(e,t,r=1,n=!1,i,a)=>function*e(t,r,n,i){if(null!=t)if(t[Y]||n&&ev(t))for(var a of i?eE(t):t)1!==r?yield*e(a,r-1,n,!0):yield a;else yield t}(eE(e,t,i,a),r+1,n,!1),eO=(e,t,r,n)=>{if(t=eT(t),eu(e)){var i=0,a=[];for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n&&!eS;r++){var l=e[r];null!=(t?l=t(l,i++):l)&&a.push(l)}return eS=!1,a}return null!=e?tQ(eN(e,t,r,n)):L},eC=(e,t,r,n)=>null!=e?new Set([...eN(e,t,r,n)]):L,e_=(e,t,r=1,n=!1,i,a)=>tQ(e$(e,t,r,n,i,a)),ej=(...e)=>{var t;return ez(1===e.length?e[0]:e,e=>null!=e&&(null!=t?t:t=[]).push(...tQ(e))),t},eF=(e,t,r,n)=>{var i,a,l=0;for(r=r<0?e.length+r:null!=r?r:0,n=n<0?e.length+n:null!=n?n:e.length;r<n;r++)if(null!=e[r]&&(i=null!=(a=t(e[r],l++))?a:i,eS)){eS=!1;break}return i},eU=(e,t)=>{var r,n,a,i=0;for(a of e)if(null!=a&&(r=null!=(n=t(a,i++))?n:r,eS)){eS=!1;break}return r},eM=(e,t)=>{var r,n,a,i=0;for(a in e)if(r=null!=(n=t([a,e[a]],i++))?n:r,eS){eS=!1;break}return r},eq=(e,t,r,n)=>{var i;if(null!=e){if(eu(e))return eF(e,t,r,n);if(r===L){if(e[Y])return eU(e,t);if(\"object\"==typeof e)return eM(e,t)}for(var a of eE(e,t,r,n))null!=a&&(i=a);return i}},ez=eq,eR=async(e,t,r,n)=>{var i,a;if(null==e)return L;for(a of eN(e,t,r,n))if(null!=(a=await a)&&(i=a),eS){eS=!1;break}return i},eP=(e,t)=>{if(null==e)return L;var r={};if(t){var n,a,i=0;for(a in e)(n=t([a,e[a]],i++))&&(r[n[0]]=n[1])}else for(var l of e)l&&(r[l[0]]=l[1]);return r},eD=(e,t,r)=>{var n,i,a;return null==e?L:er(t)||r?(a={},ez(e,r?(e,n)=>null!=(e=t(e,n))&&null!=(e[1]=r(a[e[0]],e[1]))&&(a[e[0]]=e[1]):e=>ez(e,t?e=>{var t;return null!=(null==e?void 0:e[1])&&((null!=(t=(n=a)[i=e[0]])?t:n[i]=[]).push(e[1]),a)}:e=>null!=(null==e?void 0:e[1])&&(a[e[0]]=e[1],a))),a):eP(eO(e,t?(e,r)=>et(t(e,r),1):e=>et(e,1)))},eB=(e,t,r,n,i)=>{var l=()=>eh(r)?r():r;return null!=(e=eq(e,(e,n)=>r=null!=(e=t(r,e,n))?e:l(),n,i))?e:l()},eW=(e,t,r,n)=>eO(e,(e,r)=>e&&null!=t&&t(e,r)?e:L,r,n),eJ=(e,t)=>{var r,n;if(null==e)return L;if(!t){if(null!=(r=null!=(n=e.length)?n:e.size))return r;if(!e[Y])return Object.keys(e).length}return r=0,null!=(n=eq(e,t?(e,n)=>t(e,n)?++r:r:()=>++r))?n:0},eL=(e,...t)=>null==e?L:ea(e)?Math.max(e,...t):eB(e,(e,r,n,i=t[1]?t[1](r,n):r)=>null==e||ea(i)&&e<i?i:e,L,t[2],t[3]),eH=(e,t,r,n)=>{var i;return null==e?L:ec(e)&&!t?0<Object.keys(e).length:null!=(i=null!=(i=null==(i=e.some)?void 0:i.call(e,null!=t?t:W))?i:eq(e,t?(e,r)=>!!t(e,r)&&ex(!0):()=>ex(!0),r,n))&&i},eK=(e,t=e=>e)=>{var r;return null!=(r=ed(e))&&r.sort((e,r)=>t(e)-t(r)),e},eG=(e,t,r)=>(e.constructor===Object||eu(e)?void 0===r?delete e[t]:e[t]=r:void 0===r?e.delete?e.delete(t):delete e[t]:e.set?e.set(t,r):e.add?r?e.add(t):e.delete(t):e[t]=r,r),eX=(e,t,r)=>{var n;if(e)return void 0===(n=e.get?e.get(t):e.has?e.has(t):e[t])&&null!=r&&null!=(n=eh(r)?r():r)&&eG(e,t,n),n},eZ=(e,...t)=>(ez(t,t=>ez(t,([t,r])=>{null!=r&&(ec(e[t])&&ec(r)?eZ(e[t],r):e[t]=r)})),e),eY=(e,t,r,n)=>{if(e)return null!=r?eG(e,t,r,n):(ez(t,t=>eu(t)?eG(e,t[0],t[1]):ez(t,([t,r])=>eG(e,t,r))),e)},eQ=(e,t,r)=>{var n;return ef(e,\"set\")?void 0===(n=r(e.get(t)))?e.delete(t):e.set(t,n):ef(e,\"add\")?r(n=e.has(t))?e.add(t):e.delete(t):e&&void 0===(n=e[t]=r(e[t]))&&ec(e)&&delete e[t],e},e1=(e,t)=>{var r;if(null!=(null!=e?e:t))return r=eX(e,t),ef(e,\"delete\")?e.delete(t):delete e[t],r},e2=(e,t)=>{if(e)return eu(t)?(eu(e)&&1<e.length?t.sort((e,t)=>t-e):t).map(t=>e2(e,t)):eu(e)?t<e.length?e.splice(t,1)[0]:void 0:e1(e,t)},e5=e=>eh(e)?e():e,e3=(e,t=-1)=>eu(e)?t?e.map(e=>e3(e,t-1)):[...e]:ec(e)?t?eD(e,([e,r])=>[e,e3(r,t-1)]):{...e}:ey(e)?new Set(t?eO(e,e=>e3(e,t-1)):e):em(e)?new Map(t?eO(e,e=>[e[0],e3(e[1],t-1)]):e):e,e6=(e,...t)=>null==e?void 0:e.push(...t),e4=(e,...t)=>null==e?void 0:e.unshift(...t),e8=(e,t)=>{var r,i,a;if(e)return ec(t)?(a={},ec(e)&&(ez(e,([e,l])=>{if(!U(l,t[e],-1)){if(ec(r=l)){if(!(l=e8(l,t[e])))return;[l,r]=l}else ea(l)&&ea(void 0)&&(l=(r=l)-void 0);a[e]=l,(null!=i?i:i=e3(t))[e]=r}}),i)?[a,i]:void 0):[e,e]},e9=\"undefined\"!=typeof performance?(e=K)=>e?Math.trunc(e9(H)):performance.timeOrigin+performance.now():Date.now,e7=(e=!0,t=()=>e9())=>{var r,n=+e*t(),i=0;return(a=e,l)=>(r=e?i+=-n+(n=t()):i,l&&(i=0),(e=a)&&(n=t()),r)},tt=(e,t=0)=>{var e=eh(e)?{frequency:t,callback:e}:e,{queue:i=!0,paused:a=!1,trigger:l=!1,once:o=!1,callback:u=()=>{},raf:s}=e,d=(t=null!=(e=e.frequency)?e:0,0),v=to(!0).resolve(),c=e7(!a),f=c(),p=async e=>{if(!d||!i&&v.pending&&!0!==e)return!1;if((y.busy=!0)!==e)for(;v.pending;)await v;return e||v.reset(),(!1===await D(()=>u(c(),-f+(f=c())),!1,()=>!e&&v.resolve())||t<=0||o)&&m(!1),!(y.busy=!1)},h=()=>d=setTimeout(()=>s?requestAnimationFrame(g):g(),t<0?-t:t),g=()=>{y.active&&p(),y.active&&h()},m=(e,t=!e)=>(c(e,t),clearTimeout(d),y.active=!!(d=e?h():0),y),y={active:!1,busy:!1,restart:(e,r)=>(t=null!=e?e:t,u=null!=r?r:u,m(!0,!0)),toggle:(e,t)=>e!==y.active?e?t?(m(!0),y.trigger(),y):m(!0):m(!1):y,trigger:async e=>await p(e)&&(m(y.active),!0)};return y.toggle(!a,l)};function tr(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}class tn{get value(){return this._promise.value}get error(){return this._promise.error}get pending(){return this._promise.pending}resolve(e,t=!1){return this._promise.resolve(e,t),this}reject(e,t=!1){return this._promise.reject(e,t),this}reset(){return this._promise=new ti,this}signal(e){return this.resolve(e),this.reset(),this}then(e,t){return this._promise.then(e,t)}constructor(){tr(this,\"_promise\",void 0),this.reset()}}class ti{then(e,t){return this._promise.then(e,t)}constructor(){var e;tr(this,\"_promise\",void 0),tr(this,\"resolve\",void 0),tr(this,\"reject\",void 0),tr(this,\"value\",void 0),tr(this,\"error\",void 0),tr(this,\"pending\",!0),this._promise=new Promise((...t)=>{e=t.map((e,t)=>(r,n)=>{if(this.pending)return this.pending=!1,this[t?\"error\":\"value\"]=r===L||r,e(r),this;if(n)return this;throw TypeError(\"Promise already resolved/rejected.\")})}),[this.resolve,this.reject]=e}}var tl=(e,t)=>null==e||isFinite(e)?!e||e<=0?e5(t):new Promise(r=>setTimeout(async()=>r(await e5(t)),e)):F(`Invalid delay ${e}.`),to=e=>new(e?tn:ti),ts=(e,t,r)=>{var n=!1,i=(...t)=>e(...t,a),a=()=>n!==(n=!1)&&(r(i),!0),l=()=>n!==(n=!0)&&(t(i),!0);return l(),[a,l]},ee=()=>{var e,t=new Set;return[(r,n)=>{var i=ts(r,e=>t.add(e),e=>t.delete(e));return n&&e&&r(...e,i[0]),i},(...r)=>(e=r,t.forEach(e=>e(...r)))]},tv=(e,t,r)=>null==e?L:eu(t)?null==(t=t[0])?L:t+\" \"+tv(e,t,r):null==t?L:1===t?e:null!=r?r:\"is\"===e?\"are\":e+\"s\",tc=!0,tf=(e,t,r)=>r?(tc&&e6(r,\"\u001b[\",t,\"m\"),eu(e)?e6(r,...e):e6(r,e),tc&&e6(r,\"\u001b[m\"),r):tf(e,t,[]).join(\"\"),tp=(e,t,r=!1)=>e&&(e.length>t?r?`${e.slice(0,t)}... [and ${e.length-t} more]`:e.slice(0,t-1)+\"…\":e),tg=(e,t)=>{var l,r=[],n={},i={},a=0;for(l in t)l===t[l]&&(Object.defineProperty(i,l,{value:l,writable:!1,enumerable:!0,configurable:!1}),n[l]=a++,r.push(l));var o=(t,r=!0)=>null==t?L:null!=n[t]?t:r?F(`The ${e} \"${t}\" is not defined.`):L,u={writable:!1,enumerable:!1,configurable:!1};return Object.defineProperties(i,{parse:{value:o,...u},ranks:{value:n,...u},levels:{value:r,...u},compare:{value(e,t){e=n[o(e)],t=n[o(t)];return e<t?-1:+(t<e)},...u}}),i},tm=Symbol(),ty=(e,{delimiters:t=[\"|\",\";\",\",\"],decode:r=!0,lowerCase:n}={})=>{var i,l;return e?(null==(l=e.split(\"=\").map(e=>(e=r?decodeURIComponent(e.trim()).replaceAll(\"+\",\" \"):e.trim(),n?e.toLowerCase():e)))[1]&&(l[1]=\"\"),l[2]=l[1]&&(el(t)?t=[t]:eu(t))&&tV(t,e=>1<(i=l[1].split(e)).length?tR(i):L)||(l[1]?[l[1]]:[]),l):L},tb=(e,{delimiters:t=!0,requireAuthority:r,...n}={})=>null==e?L:tT(e,/^(?:(?:([\\w+.-]+):)?(\\/\\/)?)?((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))?(?::(\\d*))?)?(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/g,(e,r,i,a,l,o,u,s,d,v,c,f)=>{e={source:e,scheme:r,urn:r?!i:!i&&L,authority:a,user:l,password:o,host:null!=u?u:s,port:null!=d?parseInt(d):L,path:v,query:!1===t?c:c?tw(c,{...n,delimiters:t}):L,fragment:f};return e.path=e.path||(e.authority?e.urn?\"\":\"/\":L),e}),tw=(e,t)=>tk(e,\"&\",t),tk=(e,t,{delimiters:r=!0,...n}={})=>{e=tH(null==e||null==(e=e.match(/(?:^.*?\\?|^)([^#]*)/))||null==(e=e[1])?void 0:e.split(t),e=>{var[e,a,l]=null!=(e=ty(e,{...n,delimiters:!1===r?[]:!0===r?L:r}))?e:[];return null!=(e=null==e?void 0:e.replace(/\\[\\]$/,\"\"))?!1!==r?[e,1<l.length?l:a]:[e,a]:tz}),t=rn(tX(e,!1),([e,t])=>[e,!1!==r?1<t.length?t1(t):t[0]:t.join(\",\")]);return t&&(t[tm]=e),t},tS=(e,t)=>t&&null!=e?t.test(e):L,tx=(e,t,r)=>tT(e,t,r,!0),tT=(e,t,i,a=!1)=>null==(null!=e?e:t)?L:i?(r=L,a?(n=[],tT(e,t,(...e)=>null!=(r=i(...e))&&n.push(r))):e.replace(t,(...e)=>r=i(...e)),r):null!=(a=e.match(t))?a:L,tA=e=>null==e?void 0:e.replace(/[\\^$\\\\.*+?()[\\]{}|]/g,\"\\\\$&\"),tI=/\\z./g,tE=(e,t)=>(t=ru(eC(eW(e,e=>null==e?void 0:e.length)),\"|\"))?RegExp(t,\"gu\"):tI,tN={},t$=e=>e instanceof RegExp,tO=(r,n=[\",\",\" \"])=>{var i;return t$(r)?r:eu(r)?tE(eO(r,e=>null==(e=tO(e,n))?void 0:e.source)):er(r)?r?/./g:tI:el(r)?null!=(i=(e=tN)[t=r])?i:e[t]=tT(r||\"\",/^(?:\\/(.+?)\\/?|(.*))$/gu,(e,t,r)=>t?RegExp(t,\"gu\"):tE(eO(tC(r,RegExp(`(?<!(?<!\\\\\\\\)\\\\\\\\)[${ru(n,tA)}]`)),e=>e&&`^${ru(tC(e,RegExp(\"(?<!(?<!\\\\\\\\)\\\\\\\\)\\\\*\")),e=>tA(t_(e,/\\\\(.)/g,\"$1\")),\".*\")}$`))):L},tC=(e,t,r=!0)=>null==e?L:r?tC(e,t,!1).filter(X):e.split(t),t_=(e,t,r)=>null!=(t=null==e?void 0:e.replace(t,r))?t:e,tj=(e=(e,t)=>e-t,t=e=>e[1]-e[0])=>{var r=[];return eY(r,{push(n,i){for(var a=[n,i],l=(e=!0)=>e?r.width=r.reduce((e,r)=>e+t(r),0):r.width,o=0;o<r.length;o++){var u,s,d=r[o];if(e(a[1],d[0])<0)return l(r.splice(o,0,a));if(e(a[0],d[1])<=0){if(e(a[0],d[0])<0&&(u=d[0]=a[0]),0<e(a[1],d[1])&&(u=d[1]=a[1]),!((null==(s=r[o+1])?void 0:s[0])<d[1]))return l(null!=u);u=a=r.splice(o--,1)[0]}}return l(a&&(r[r.length]=a))},width:0})},tF=e=>{for(var t=e;t;)t=Object.getPrototypeOf(e=t);return e},tU=(e,t)=>{if(!e||tF(e)===t)return e;for(var r of e.document.getElementsByTagName(\"iframe\"))try{if(e=tU(r.contentWindow,t))return e}catch{}},tM=e=>null==e?e:globalThis.window?tU(window,tF(e)):globalThis,tq=!1,tz=Symbol(),tR=e=>(tq=!0,e),tP=Symbol(),tD=Symbol(),tB=Symbol.iterator,tW=(e,t,r)=>{if(null==e||e[tP])throw t;e=tM(e);if(!e)throw t;var l,i=()=>(e,t,r,n,i)=>{var a,o,l=0;for(o of e)if((a=t?t(o,l++,n,i):o)!==tz){if(a===tR)break;if(n=a,r&&r.push(a),tq){tq=!1;break}}return r||n},a=(e.Array.prototype[tP]=(e,t,r,n,i)=>{for(var l,o=0,u=e.length;o<u;o++)if(l=e[o],(l=t?t(l,o,n,i):l)!==tz){if(l===tR)break;if(n=l,r&&r.push(l),tq){tq=!1;break}}return r||n},i());for(l of(e.Object.prototype[tP]=(e,t,r,n,l)=>{if(e[tB])return(e.constructor===Object?a:Object.getPrototypeOf(e)[tP]=i())(e,t,r,n,l);var u,d,s=0;for(d in e)if(u=[d,e[d]],(u=t?t(u,s++,n,l):u)!==tz){if(u===tR)break;if(n=u,r&&r.push(u),tq){tq=!1;break}}return r||n},e.Object.prototype[tD]=function(){var t,e;return this[tB]||this[Q]?this.constructor===Object?null!=(e=this[Q]())?e:this[tB]():((e=Object.getPrototypeOf(this))[tD]=null!=(t=e[Q])?t:e[tB],this[tD]()):function*(e){for(var t in e)yield[t,e[t]]}(this)},[e.Map.prototype,e.WeakMap.prototype,e.Set.prototype,e.WeakSet.prototype,Object.getPrototypeOf(function*(){})]))l[tP]=i(),l[tD]=l[tB];return e.Number.prototype[tP]=(e,t,r,n,i)=>a(tJ(e),t,r,n,i),e.Number.prototype[tD]=tJ,e.Function.prototype[tP]=(e,t,r,n,i)=>a(tL(e),t,r,n,i),e.Function.prototype[tD]=tL,r()};function*tJ(e=this){for(var t=0;t<e;t++)yield t}function*tL(e=this){for(var t=void 0;void 0!==(t=e(t));)yield t}var tV=(e,t,r,n)=>{try{return e?e[tP](e,t,void 0,r,n):null==e?e:void 0}catch(i){return tW(e,i,()=>tV(e,t,r,n))}},tH=(e,t,r=[],n,i=e)=>{try{return e||0===e||\"\"===e?e[tP](e,t,r,n,i):null==e?e:void 0}catch(a){return tW(e,a,()=>tH(e,t,r,n,i))}},tK=(e,t=!0,r=!1)=>tH(e,!0===t?e=>null!=e?e:tz:t?t.has?e=>null==e||t.has(e)===r?tz:e:(e,n,i)=>!t(e,n,i)===r?e:tz:e=>e||tz),tG=(e,t,r=-1,n=[],i,a=e)=>tH(e,(e,i,a)=>null!=(t?e=t(e,i,a):e)&&e[Symbol.iterator]&&\"string\"!=typeof e&&r?(tG(e,void 0,r-1,n,e),tz):e,n,i,a),tX=(e,t,r)=>{var n,i,a,l;return null!=t&&\"function\"!=typeof t&&([t,r]=[void 0,t]),tV(e,!1!==r?(a=new Map,(e,r,n)=>{void 0!==(l=t?t(e,r,n):e)[0]&&t7(a,l[0],()=>[]).push(l[1])}):(a={},(e,r,o)=>(l=t?t(e,r,o):e)&&void 0!==l[0]&&(null!=(r=(n=a)[i=l[0]])?r:n[i]=[]).push(l[1]))),a},tY=e=>void 0===e?[]:null!=e&&e[tB]&&\"string\"!=typeof e?e:[e],tQ=e=>null==e||eu(e)?e:e[tB]&&\"string\"!=typeof e?[...e]:[e],t1=(e,...t)=>{var r,n;for(n of e=!t.length&&eg(e)?e:[e,...t])if(null!=n){if(eg(n)){(null!=r?r:r=[]).push(...n);continue}(null!=r?r:r=[]).push(n)}return r},t2=(e,t,r)=>(r?-1:1)*(e===t?0:\"string\"==typeof e?\"string\"==typeof t?e.localeCompare(t):1:\"string\"==typeof t?-1:null==e?null==t?0:-1:null==t?1:e-t),t5=(e,t,r)=>tQ(e).sort(\"function\"==typeof t?(e,n)=>t2(t(e),t(n),r):eu(t)?t.length?(e,n)=>{for(var i=0,a=0;a<t.length&&!i;a++)i=t2(t[a](e),t[a](n),r);return i}:(e,t)=>t2(e,t,r):(e,r)=>t2(e,r,t)),t3=Object.keys,t6=Symbol(),t4=Symbol(),t8=Symbol(),t9=(e,t,r)=>{if(null==e||e[t4])throw t;var i,e=tM(e);if(!e||e.Object.prototype[t6])throw t;for({prototype:i}of[e.Map,e.WeakMap])i[t6]=function(e,t){return void 0===t?this.delete(e):this.get(e)!==t&&!!this.set(e,t)},i[t4]=i.get;for({prototype:i}of[e.Set,e.WeakSet])i[t6]=function(e,t,r=!1){return t||r&&void 0===t?!this.has(e)&&!!this.add(e):this.delete(e)},i[t4]=i.has,i[t8]=function(e){for(var t of e)void 0!==t&&this.add(t);return this};for({prototype:i}of(e.Array.prototype[t8]=function(e){return this.push(...e),this},[e.Object,e.Array]))i[t6]=function(e,t){return void 0===t?void 0!==this[e]&&(delete this[e],!0):(this[e]=t)!==t},i[t4]=function(e){return this[e]};return r()},t7=(e,t,r)=>{try{if(null==e)return e;var n=e[t4](t);if(void 0===n&&void 0!==(n=\"function\"==typeof r?r():r)){if(null!=n&&n.then)return n.then(r=>void 0===r?r:e[t6](t,r));e[t6](t,n)}return n}catch(n){return t9(e,n,()=>t7(e,t,r))}},re=(e,t,r)=>{try{return!0===(null==e?void 0:e[t6](t,r,!0))}catch(n){return t9(e,n,()=>re(e,t,r))}},rt=(e,t,r)=>{try{return e[t6](t,r),r}catch(n){return t9(e,n,()=>rt(e,t,r))}},rr=(e,...t)=>{try{return null==e?e:e[t8](t)}catch(r){return t9(e,r,()=>rr(e,...t))}},rn=(e,t)=>{var r={};return tV(e,t?(e,n,i)=>(e=t(e,n,i))&&(\"symbol\"!=typeof e||e!==tz&&e!==tR)?r[e[0]]=e[1]:e:e=>e&&(\"symbol\"!=typeof e||e!==tz&&e!==tR)?r[e[0]]=e[1]:e),r},ri=(e,...t)=>{try{return(null==e?void 0:e.constructor)===Object?tV(t,t=>tV(t,t=>t&&(e[t[0]]=t[1]))):tV(t,t=>tV(t,t=>t&&e[t6](t[0],t[1]))),e}catch(r){return t9(e,r,()=>ri(e,...t))}},ra=(e,t,r={})=>{if(null!=e){var l,{deep:n=!0,overwrite:i=!0,nulls:a=!1}=r;for(l of tY(t))tV(l,t=>{var o,u;t&&([t,o]=t,u=e[t],(a?null==u:void 0===u)?e[t]=o:n&&(null==o?void 0:o.constructor)===Object&&(null==u?void 0:u.constructor)===Object?ra(u,o,r):i&&(e[t]=o))})}return e},rl=(e,t)=>null==e?e:rn(t,t=>null!=e[t]||t in e?[t,e[t]]:tz),ro=e=>null==e||\"boolean\"==typeof e||\"\"===e.toString(),ru=(e,t,r)=>null==e?e:eg(e)?tK(\"function\"==typeof t?tH(e,t):(r=t,e),ro,!0).join(null!=r?r:\"\"):ro(e)?\"\":e.toString(),rs=(e,t,r,n)=>{var i,o;return e||0===e?\"function\"==typeof t?rs(tH(e,t),r,n):(i=[],n=tV(e,(e,t,r)=>ro(e)?tz:(r&&i.push(r),e.toString())),[t,o]=eu(t)?t:[,t],o=(null!=o?o:o=\"and\")[0]===(t=null==t?\",\":t)?o+\" \":\" \"+(o?o+\" \":\"\"),t=i.length?\"\"+i.join(t+\" \")+o+n:null!=n?n:\"\",r?r(t,i.length+ +(null!=n)):t):null==e?e:void 0},rd=tg(\"data classification\",{never:\"never\",anonymous:\"anonymous\",indirect:\"indirect\",direct:\"direct\",sensitive:\"sensitive\"}),rv=[\"necessary\",\"performance\",\"functionality\",\"marketing\",\"personalization\",\"security\"],rc=rn(rv,e=>[e,e]),rf=(Object.freeze(eP(rv.map(e=>[e,!0]))),(e,t)=>\"personalization\"===e&&!0!==(null==t?void 0:t.personalization)?\"functionality\":\"security\"===e&&!0!==(null==t?void 0:t.security)?\"necessary\":e),rp=(e,t)=>{var r=e;return!0!==(null==t?void 0:t.personalization)&&null!=r.personalization&&(null!=(r=r===e?{...e}:r).functionality?r.personalization=r.functionality:r.functionality=r.personalization,delete r.personalization),!0!==(null==t?void 0:t.security)&&null!=r.security&&delete(r=r===e?{...e}:r).security,r},rh={names:rv,parse(e,{names:t=!1,validate:r=!0}={}){if(null==e)return e;if(e.purposes&&(e=e.purposes),el(e)&&(e=e.split(\",\")),eu(e)){var i,n={};for(i of e)rc[i]?\"necessary\"!==i&&(n[i]=!0):r&&F(`The purpose name '${i}' is not defined.`);e=n}return t?(t=t3(e)).length?t:[\"necessary\"]:e},getNames:e=>tH(e,([e,t])=>t?e:tz),get all(){return{functionality:!0,marketing:!0,performance:!0,personalization:!0,security:!0}},test(e,t,{intersect:r,optionalPurposes:n,targetPurpose:i}){if(\"boolean\"==typeof n&&(n={personalization:n,security:n}),i&&\"necessary\"!==(i=rf(i,n))&&!t[rf(i,n)])return!1;if(e=rp(e,n),t=rp(t,n),r){for(var a in t)if(rc[a]&&t[a]&&!e[a])return!1;if(\"all\"===r)for(var a in e)if(rc[a]&&e[a]&&!t[a])return!1;return!0}var l=!1;for(a in e)if(rc[a]&&e[a]){if(t[a])return!0;l=!0}return!l}},rg=(tg(\"data restriction\",{public:\"public\",\"trusted-write\":\"trusted-write\",\"trusted-only\":\"trusted-only\"}),e=>{var t;return`${null!=(t=null==e?void 0:e.classification)?t:\"anonymous\"} data for ${rs(rh.parse(null==e?void 0:e.purposes,{names:!0}))}  purposes.`}),rm={anonymous:{classification:\"anonymous\",purposes:{}},clone:e=>e&&{classification:e.classification,purposes:{...e.purposes}},equals:(e,t)=>e===t||e&&t&&e.classification===t.classification&&rh.test(e.purposes,t.purposes,{intersect:\"all\",optionalPurposes:!0}),serialize(e){var t=rh.parse(e.purposes,{names:!0});return e.classification&&\"anonymous\"!==e.classification||null!=t&&t.length?e.classification+\":\"+t:null},deserialize(e,t){var a;return e?([e,a]=e.split(\":\"),{classification:null!=(e=rd.parse(e,!1))?e:\"anonymous\",purposes:null!=(e=rh.parse(a,{validate:!1}))?e:{}}):t?rm.clone(t):{classification:\"anonymous\",purposes:{}}}},ry=(e,t)=>(!(i=null==e?void 0:e.metadata)||t&&(delete i.posted,delete i.queued,Object.entries(i).length)||delete e.metadata,e),rb=e=>!(null==e||!e.patchTargetId),rw=Symbol(),rk=e=>void 0===e?\"undefined\":tp(JSON.stringify(e),40,!0),rS=/^\\d{4}-\\d{2}-\\d{2}(?:T00:00:00(?:\\.000)?)?Z$/,rx=/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,7})?)?Z$/,rT=/^\\{?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\}?$/,rA=/^(?:(?:([\\w+.-]+):)(\\/\\/)?)((?:([^:@]+)(?:\\:([^@]*))?@)?(?:\\[([^\\]]+)\\]|([0-9:]+|[^/+]+?))(?::(\\d*))?)(\\/[^#?]*)?(?:\\?([^#]*))?(?:#(.*))?$/,rI=/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(\\[(([0-9.]+)|([0-9a-f:]+))\\])|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9]))?$/,rE=(e,t,r)=>(e.push({path:\"\",type:null,source:t,message:rk(t)+` ${r}.`}),rw),rN=(e,t,r)=>\"number\"==typeof e&&(!t&&Number.isFinite(e)&&!Number.isNaN(e)||Number.isInteger(e))||r&&\"string\"==typeof e&&rN((t?parseInt:parseFloat)(e),t,!1),r$={},rv=((e=>{null==e.primitive&&(e.primitive=typeof(null!=(r=null==(r=e.enum)?void 0:r[0])?r:\"\"));var r,u,o=null!=(o=r$[r=e.primitive+\"-\"+(null!=(r=e.format)?r:\"\")+\"-\"+!1])?o:r$[r]=(e=>{switch(e.primitive){case\"boolean\":return(e,t)=>\"boolean\"==typeof e?e:rE(t,e,\"is not a Boolean\");case\"date\":return(e,t)=>e&&rS.test(e)&&!isNaN(+new Date(e))?e:rE(t,e,\"is not a valid ISO 8601 UTC date (time is not allowed, and the 'Z' postfix must be added to indicate Coordinated Universal Time)\");case\"timestamp\":case\"datetime\":var r=\"format\"in e?\"unix\"!==e.format:\"datetime\"===e.primitive;return(e,n)=>{if(!e||rN(e,!1,!1)){if(!rN(e,!0,!1))return rE(n,e,\"is not a valid UNIX timestamp\");e*=1}else if(!rx.test(e)||isNaN(+new Date(e)))return rE(n,e,\"is not a valid ISO 8601 UTC date/time (the 'Z' postfix must be added to indicate Coordinated Universal Time)\");return e=new Date(e),r?new Date(e).toISOString():+e};case\"duration\":return(e,r)=>rN(e,!0,!1)?+e:rE(r,e,\"is not a valid duration (must be provided as milliseconds)\");case\"integer\":return(e,r)=>rN(e,!0,!1)?+e:rE(r,e,\"is not a valid integer\");case\"number\":return(e,r)=>rN(e,!1,!1)?e:rE(r,e,\"is not a number\");case\"string\":switch(e.format){case\"uri\":return(e,t)=>\"string\"==typeof e&&rA.test(e)?e:rE(t,e,\"is not a valid URI\");case\"url\":return(e,t)=>{var r=\"string\"==typeof e&&rA.exec(e);return r?r[2]?e:rE(t,e,\"is not a valid URL (it is a URI, but a URL is required)\"):rE(t,e,\"is not a valid URL\")};case\"urn\":return(e,t)=>{var r=\"string\"==typeof e&&rA.exec(e);return r?\"urn\"!==r[1]||r[2]?rE(t,e,\"is not a valid URN (it is a URI, but a URN is required)\"):e:rE(t,e,\"is not a valid URN\")};case\"email\":return(e,t)=>\"string\"==typeof e&&rI.test(e)?e.toLowerCase():rE(t,e,\"is not a valid email address\")}return(e,t)=>\"string\"==typeof e?e:rE(t,e,\"is not a string\");case\"uuid\":return(e,t)=>{var r;return null!=(r=\"string\"==typeof e?null==(r=rT.exec(e))?void 0:r[1].toLowerCase():null)?r:rE(t,e,\"is not a valid UUID\")};default:throw TypeError(`'${rk(e)}' is not a supported primitive type.`)}})(e),d=e.maxLength,c=(null!=d&&(v=o,o=(e,t)=>(e=v(e,t))!==rw&&e.length>d?rE(t,e,`exceeds the maximum allowed ${d} number of characters`):e),e.min),f=e.max;if(null==c&&null==f||(p=null!=c?null!=f?`between ${c} and `+f:\"at least \"+c:\"at most \"+f,v=o,o=(e,t)=>(e=v(e,t))===rw||(null==c||c<=e)&&(null==f||e<=f)?e:rE(t,e,p)),\"enum\"in e){var v=o;if(!(u=new Set((Array.isArray(e.enum)?e.enum:[e.enum]).map(e=>{var t=[];if((e=v(e,t))===rw)throw TypeError(t[0]);return e}))).size)throw TypeError(\"At least one enum value to test against is required.\");var p=\"is not the constant value \"+rs(e.enum.map(e=>JSON.stringify(e)),\"or\"),o=(e,t)=>(e=v(e,t))===rw||u.has(e)?e:rE(t,e,p)}(e=>null==e||e instanceof Set||new Set(e[tB]&&\"string\"!=typeof e?e:[e]))(u)})({primitive:\"string\",format:\"uri\"}),tg(\"variable scope\",{global:\"global\",session:\"session\",device:\"device\",user:\"user\"})),rC=({key:e,scope:t=\"\",entityId:r=\"\",source:n=\"\"},i=\"\")=>[\"'\"+e+\"'\",n&&\"from '\"+n+\"'\",i,t&&\"in \"+t+\" scope\",r&&\"for '\"+r+\"'\"].filter(e=>e).join(\" \"),r_=e=>null==e?e:{source:e.source,key:e.key,scope:e.scope,entityId:e.entityId},rj=((I={})[I.Success=200]=\"Success\",I[I.Created=201]=\"Created\",I[I.NotModified=304]=\"NotModified\",I[I.Forbidden=403]=\"Forbidden\",I[I.NotFound=404]=\"NotFound\",I[I.BadRequest=405]=\"BadRequest\",I[I.Conflict=409]=\"Conflict\",I[I.Error=500]=\"Error\",I),rF=(e,t=!0)=>null!=(null==e?void 0:e.value)||!t&&(!e||404===e.status),rU=(e,t=!0)=>e&&(e.status<400||!t&&404===e.status);function rM(e,t,r){t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r}var rq=e=>{var t=rC(e),r=e.error;return e.status<400?`${t} succeeded with status ${e.status} - ${rj[e.status]}.`:`${t} failed with status ${e.status} - ${rj[e.status]}${r?` (${r})`:\"\"}.`};class rz extends Error{constructor(e,t){super(null!=t?t:\"One or more operations failed.\"),rM(this,\"succeeded\",void 0),rM(this,\"failed\",void 0),this.succeeded=null!=(t=null==e?void 0:e.filter(e=>rU(e,!1)))?t:[],this.failed=null!=(t=null==e?void 0:e.filter(e=>!rU(e,!1)))?t:[]}}var rR=e=>!!e.callback,rP=e=>!!e.poll,rD=Symbol(),rB=(e,t,r,{poll:n,logCallbackError:i}={})=>{var a=eu(t)?t:[t],l=[],o=(async()=>{var s,d,u,v,t=await r(a.filter(e=>e)),o=[];for(u of a)u&&null!=(d=t.get(u))&&(d[rD]=u,rR(u)&&o.push([u,e=>!0===u.callback(e)]),rP(u))&&o.push([u,e=>{var t;return!rF(e,!1)||(t=!rF(e,!1)||u.poll(e.value,e[rD]===u,s),s=e.value,t)}]);for([u,v]of o)try{var c=\"get\"===e?async e=>!0===await v(e)&&(null==n?void 0:n(u,c)):v;await c(u)}catch(t){var f=`${e} callback for ${rC(u)} failed: ${t}.`;i?i(f,u,t):l.push(f)}return t})(),u=async(r,n)=>{var d,v,c,i=await o,u=[],s=[];for(d of a)d?null==(c=i.get(d))?s.push(`No result for ${rC(d)}.`):!r||rU(c,n||\"set\"===e)?u.push(r&&c.status===rj.NotFound?void 0:1<r?null!=(v=c.value)?v:void 0:c):s.push(rq(c)):u.push(void 0);if(s.push(...l),s.length)throw 10<s.length&&s.push(`\n(and ${s.splice(10).length} more...)`),new rz(u,s.join(\"\\n\"));return a===t?u:u[0]};return Object.assign(P(()=>u(1,!1)),{as:()=>u(1,!1),all:()=>u(0,!1),require:()=>u(1,!0),value:(e=!1)=>u(2,e),values:(e=!1)=>u(2,e)})},rW=e=>e&&\"string\"==typeof e.type,rJ=(e=>t=>(null==t?void 0:t.type)&&e.some(e=>e===(null==t?void 0:t.type)))([\"view\"]),rL=e=>e&&/^(%[A-F0-9]{2}|[^%])*$/gi.test(e)&&/[A-F0-9]{2}/gi.test(e)?decodeURIComponent(e):e,rV=(e,t)=>{var r;return t&&(!(l=e.get(a=t.tag+(null!=(r=t.value)?r:\"\")))||(null!=(r=l.score)?r:1)<(null!=(r=t.score)?r:1))&&e.set(a,t)},rH=(e,t=\"\",r=new Map)=>{if(e)return eg(e)?tV(e,e=>rH(e,t,r)):el(e)?tT(e,/(?:([^\\s:~]+)::(?![ :=]))?([^\\s~]+?)(?:\\s*[:=]\\s*(?:\"((?:\"[^\"]*|.)*?)(?:\"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\\s~])))*))\\s*)?(?: *~ *(\\d*(?:\\.\\d*)?))?(?:[\\s,&;#~]+|$)/g,(e,n,i,a,l,o,u)=>{i={tag:(n?rL(n)+\"::\":\"\")+t+rL(i),value:rL(null!=(n=null!=a?a:l)?n:o)};u&&10!==parseFloat(u)&&(i.score=parseFloat(u)/10),rV(r,i)}):rV(r,e),r},rK=tg(\"local variable scope\",{view:\"view\",tab:\"tab\",shared:\"shared\"}),rG=tg(\"variable scope\",{...rK,...rv}),rX=e=>(\"global\"!==e.scope&&e.entityId&&(e.entityId=void 0),e),rZ=e=>null!=e&&!!e.scope&&null!=rK.ranks[e.scope],rY=e=>null==e?e:[e.scope,e.key,e.targetId].join(\"\\0\"),rQ=e=>{e=e.split(\"\\0\");return{scope:e[0],key:e[1],targetId:e[2]}},r1=()=>()=>F(\"Not initialized.\"),r2=window,r5=document,r3=r5.body,r6=(e,t)=>!(null==e||!e.matches(t)),r4=((e=>tc=e)(!!r2.chrome),V),r8=(e,t,r=(e,t)=>r4<=t)=>{for(var n=0,i=H;1===(null==e?void 0:e.nodeType)&&!r(e,n++)&&t(e,(e,t)=>(null!=e&&(a=e,i=t!==K&&null!=a),K),n-1)!==H&&!i;){var a,o=e;null===(e=e.parentElement)&&(null==o?void 0:o.ownerDocument)!==r5&&(e=null==o||null==(o=o.ownerDocument.defaultView)?void 0:o.frameElement)}return a},r9=(e,t=\"z\")=>{if(null!=e&&\"null\"!==e&&(\"\"!==e||\"b\"===t))switch(t){case!0:case\"z\":var r;return null==(r=(\"\"+e).trim())?void 0:r.toLowerCase();case!1:case\"r\":case\"b\":return\"\"===e||en(e);case\"n\":return parseFloat(e);case\"j\":return z(()=>JSON.parse(e),G);case\"h\":return z(()=>n6(e),G);case\"e\":return z(()=>null==n8?void 0:n8(e),G);default:return eu(t)&&\"\"!==e?(\"\"+e).split(\",\").map(e=>\"\"===e.trim()?void 0:r9(e,t[0])):void 0}},r7=(e,t,r)=>r9(null==e?void 0:e.getAttribute(t),r),ne=(e,t,r)=>r8(e,(e,n)=>n(r7(e,t,r))),nt=(e,t)=>null==(e=r7(e,t))||null==(t=e.trim())?void 0:t.toLowerCase(),nr=e=>null==e?void 0:e.getAttributeNames(),nn=(e,t)=>getComputedStyle(e).getPropertyValue(t)||null,ni=e=>null!=e?e.tagName:null,nl=e=>({x:eb(scrollX,e),y:eb(scrollY,e)}),no=(e,t)=>t_(e,/#.*$/,\"\")===t_(t,/#.*$/,\"\"),nu=(e,t,r=K)=>(u=ns(e,t))&&B({xpx:u.x,ypx:u.y,x:eb(u.x/r3.offsetWidth,4),y:eb(u.y/r3.offsetHeight,4),pageFolds:r?u.y/window.innerHeight:void 0}),ns=(e,t)=>null!=t&&t.pointerType&&null!=(null==t?void 0:t.pageY)?{x:t.pageX,y:t.pageY}:e?({x:s,y:d}=nv(e),{x:s,y:d}):void 0,nv=(e,t=!0)=>e?(v=e.getBoundingClientRect(),o=t?nl(H):{x:0,y:0},{x:eb(v.left+o.x),y:eb(v.top+o.y),width:eb(v.width),height:eb(v.height)}):void 0,nc=(e,t,r,n={capture:!0,passive:!0})=>(t=tQ(t),ts(r,r=>tV(t,t=>e.addEventListener(t,r,n)),r=>tV(t,t=>e.removeEventListener(t,r,n)))),np=()=>({...o=nl(K),width:window.innerWidth,height:window.innerHeight,totalWidth:r3.offsetWidth,totalHeight:r3.offsetHeight}),nh=new WeakMap,ng=e=>nh.get(e),nm=(e,t=H)=>(t?\"--track-\":\"track-\")+e,ny=(e,t,r,n,i,a)=>(null==t?void 0:t[1])&&tV(nr(e),l=>{var o;return null!=(o=(c=t[0])[f=l])?o:c[f]=(a=H,!el(n=tV(t[1],([t,r,n],i)=>tS(l,t)&&(a=void 0,!r||r6(e,r))&&ex(null!=n?n:l)))||(i=e.getAttribute(l))&&!en(i)||rH(i,t_(n,/\\-/g,\":\"),r),a)}),nb=()=>{},nw=(e,t)=>{if(p===(p=nE.tags))return nb(e,t);var r=e=>e?t$(e)?[[e]]:eg(e)?e_(e,r):[ec(e)?[tO(e.match),e.selector,e.prefix]:[tO(e)]]:[],n=[{},[[/^(?:track\\-)?tags?(?:$|\\-)(.*)/],...r(tG(p,([,e])=>e,1))]];(nb=(e,t)=>ny(e,n,t))(e,t)},nk=(e,t)=>ru(ej(nn(e,nm(t,K)),nn(e,nm(\"base-\"+t,K))),\" \"),nS={},nx=(e,t,r=nk(e,\"attributes\"))=>{var n;r&&ny(e,null!=(n=nS[r])?n:nS[r]=[{},tx(r,/(?:(\\S+)\\:\\s*)?(?:\\((\\S+)\\)|([^\\s,:]+))\\s*(?!\\S*\\:)/g,(e,t,r,n)=>[tO(r||n),,t])],t),rH(nk(e,\"tags\"),void 0,t)},nT=(e,t,r=H,n)=>null!=(r=null!=(r=r?r8(e,(e,r)=>r(nT(e,t,H)),eh(r)?r:void 0):ru(ej(r7(e,nm(t)),nn(e,nm(t,K))),\" \"))?r:n&&(h=ng(e))&&n(h))?r:null,nA=(e,t,r=H,n)=>\"\"===(g=nT(e,t,r,n))||(null==g?g:en(g)),nI=(e,t,r,n)=>e&&(null==n&&(n=new Map),nx(e,n),r8(e,e=>{nw(e,n),rH(null==r?void 0:r(e),void 0,n)},t),n.size)?{tags:[...n.values()]}:{},nE={name:\"tail\",src:\"/_t.js\",disabled:!1,postEvents:!0,postFrequency:2e3,requestTimeout:5e3,encryptionKey:null,key:null,apiKey:null,json:!1,impressionThreshold:1e3,captureContextMenu:!0,tags:{default:[\"data-id\",\"data-name\"]}},nN=[],n$=[],nO=(e,t=0)=>e.charCodeAt(t),n_=([...\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"].forEach((e,t)=>nN[n$[t]=e.charCodeAt(0)]=t),e=>{for(var t,r=0,n=e.length,i=[];r<n;)t=e[r++]<<16|e[r++]<<8|e[r++],i.push(n$[(16515072&t)>>18],n$[(258048&t)>>12],n$[(4032&t)>>6],n$[63&t]);return i.length+=n-r,(e=>String.fromCharCode(...e))(i)}),nj=e=>{for(var t,r=0,n=0,i=e.length,a=new Uint8Array(3*(i/4|0)+(i+3&3)%3);r<i;)a[n++]=nN[nO(e,r++)]<<2|(t=nN[nO(e,r++)])>>4,r<i&&(a[n++]=(15&t)<<4|(t=nN[nO(e,r++)])>>2,r<i)&&(a[n++]=(3&t)<<6|nN[nO(e,r++)]);return a},nF={32:[2166136261n,16777619n],64:[0xcbf29ce484222325n,1099511628211n],128:[0x6c62272e07bb014262b821756295c58dn,0x1000000000000000000013bn]},nU=(e=256)=>e*Math.random()|0,nq={exports:{}},{deserialize:nz,serialize:nR}=((()=>{function t(e,t){if(t&&t.multiple&&!Array.isArray(e))throw Error(\"Invalid argument type: Expected an Array to serialize multiple values.\");var r,n,i=new Uint8Array(128),a=0;if(t&&t.multiple)for(var l=0;l<e.length;l++)o(e[l]);else o(e);return i.subarray(0,a);function o(e,i){var c,l;switch(typeof e){case\"undefined\":s(192);break;case\"boolean\":s(e?195:194);break;case\"number\":(e=>{var t;isFinite(e)&&Number.isSafeInteger(e)?0<=e&&e<=127||e<0&&-32<=e?s(e):0<e&&e<=255?d([204,e]):-128<=e&&e<=127?d([208,e]):0<e&&e<=65535?d([205,e>>>8,e]):-32768<=e&&e<=32767?d([209,e>>>8,e]):0<e&&e<=4294967295?d([206,e>>>24,e>>>16,e>>>8,e]):-2147483648<=e&&e<=2147483647?d([210,e>>>24,e>>>16,e>>>8,e]):0<e&&e<=0x10000000000000000?d([211,(t=e/4294967296)>>>24,t>>>16,t>>>8,t,(t=e%4294967296)>>>24,t>>>16,t>>>8,t]):-0x8000000000000000<=e&&e<=0x8000000000000000?(s(211),v(e)):d(e<0?[211,128,0,0,0,0,0,0,0]:[207,255,255,255,255,255,255,255,255]):((n=n||new DataView(r=new ArrayBuffer(8))).setFloat64(0,e),s(203),d(new Uint8Array(r)))})(e);break;case\"string\":(c=(l=(e=>{for(var t=!0,r=e.length,n=0;n<r;n++)if(127<e.charCodeAt(n)){t=!1;break}for(var i=0,a=new Uint8Array(e.length*(t?1:4)),l=0;l!==r;l++){var o=e.charCodeAt(l);if(o<128)a[i++]=o;else{if(o<2048)a[i++]=o>>6|192;else{if(55295<o&&o<56320){if(++l>=r)throw Error(\"UTF-8 encode: incomplete surrogate pair\");var u=e.charCodeAt(l);if(u<56320||57343<u)throw Error(\"UTF-8 encode: second surrogate character 0x\"+u.toString(16)+\" at index \"+l+\" out of range\");a[i++]=(o=65536+((1023&o)<<10)+(1023&u))>>18|240,a[i++]=o>>12&63|128}else a[i++]=o>>12|224;a[i++]=o>>6&63|128}a[i++]=63&o|128}}return t?a:a.subarray(0,i)})(e)).length)<=31?s(160+c):d(c<=255?[217,c]:c<=65535?[218,c>>>8,c]:[219,c>>>24,c>>>16,c>>>8,c]),d(l);break;case\"object\":null===e?s(192):e instanceof Date?(e=>{var r,t=e.getTime()/1e3;0===e.getMilliseconds()&&0<=t&&t<4294967296?d([214,255,t>>>24,t>>>16,t>>>8,t]):0<=t&&t<17179869184?d([215,255,(r=1e6*e.getMilliseconds())>>>22,r>>>14,r>>>6,r<<2>>>0|t/4294967296,t>>>24,t>>>16,t>>>8,t]):(d([199,12,255,(r=1e6*e.getMilliseconds())>>>24,r>>>16,r>>>8,r]),v(t))})(e):Array.isArray(e)?u(e):e instanceof Uint8Array||e instanceof Uint8ClampedArray?((l=(c=e).length)<=255?d([196,l]):d(l<=65535?[197,l>>>8,l]:[198,l>>>24,l>>>16,l>>>8,l]),d(c)):(e instanceof Int8Array||e instanceof Int16Array||e instanceof Uint16Array||e instanceof Int32Array||e instanceof Uint32Array||e instanceof Float32Array||e instanceof Float64Array?u:e=>{var r,t=0;for(r in e)void 0!==e[r]&&t++;for(r in t<=15?s(128+t):d(t<=65535?[222,t>>>8,t]:[223,t>>>24,t>>>16,t>>>8,t]),e){var n=e[r];void 0!==n&&(o(r),o(n))}})(e);break;default:if(i||!t||!t.invalidTypeReplacement)throw Error(\"Invalid argument type: The type '\"+typeof e+\"' cannot be serialized.\");\"function\"==typeof t.invalidTypeReplacement?o(t.invalidTypeReplacement(e),!0):o(t.invalidTypeReplacement,!0)}}function u(e){var t=e.length;t<=15?s(144+t):d(t<=65535?[220,t>>>8,t]:[221,t>>>24,t>>>16,t>>>8,t]);for(var r=0;r<t;r++)o(e[r])}function s(e){if(i.length<a+1){for(var t=2*i.length;t<a+1;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i[a]=e,a++}function d(e){if(i.length<a+e.length){for(var t=2*i.length;t<a+e.length;)t*=2;var r=new Uint8Array(t);r.set(i),i=r}i.set(e,a),a+=e.length}function v(e){var t,e=0<=e?(t=e/4294967296,e%4294967296):(t=~(Math.abs(++e)/4294967296),~(Math.abs(e)%4294967296));d([t>>>24,t>>>16,t>>>8,t,e>>>24,e>>>16,e>>>8,e])}}function r(e,t){var r,n=0;if(\"object\"!=typeof(e=e instanceof ArrayBuffer?new Uint8Array(e):e)||void 0===e.length)throw Error(\"Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.\");if(!e.length)throw Error(\"Invalid argument: The byte array to deserialize is empty.\");if(e instanceof Uint8Array||(e=new Uint8Array(e)),t&&t.multiple)for(r=[];n<e.length;)r.push(i());else r=i();return r;function i(){var t=e[n++];if(0<=t&&t<=127)return t;if(128<=t&&t<=143)return s(t-128);if(144<=t&&t<=159)return d(t-144);if(160<=t&&t<=191)return v(t-160);if(192===t)return null;if(193===t)throw Error(\"Invalid byte code 0xc1 found.\");if(194===t)return!1;if(195===t)return!0;if(196===t)return u(-1,1);if(197===t)return u(-1,2);if(198===t)return u(-1,4);if(199===t)return c(-1,1);if(200===t)return c(-1,2);if(201===t)return c(-1,4);if(202===t)return o(4);if(203===t)return o(8);if(204===t)return l(1);if(205===t)return l(2);if(206===t)return l(4);if(207===t)return l(8);if(208===t)return a(1);if(209===t)return a(2);if(210===t)return a(4);if(211===t)return a(8);if(212===t)return c(1);if(213===t)return c(2);if(214===t)return c(4);if(215===t)return c(8);if(216===t)return c(16);if(217===t)return v(-1,1);if(218===t)return v(-1,2);if(219===t)return v(-1,4);if(220===t)return d(-1,2);if(221===t)return d(-1,4);if(222===t)return s(-1,2);if(223===t)return s(-1,4);if(224<=t&&t<=255)return t-256;throw console.debug(\"msgpack array:\",e),Error(\"Invalid byte value '\"+t+\"' at index \"+(n-1)+\" in the MessagePack binary data (length \"+e.length+\"): Expecting a range of 0 to 255. This is not a byte array.\")}function a(t){for(var a,r=0,i=!0;0<t--;)i?(r+=127&(a=e[n++]),128&a&&(r-=128),i=!1):r=(r*=256)+e[n++];return r}function l(t){for(var r=0;0<t--;)r=256*r+e[n++];return r}function o(t){var r=new DataView(e.buffer,n+e.byteOffset,t);return n+=t,4===t?r.getFloat32(0,!1):8===t?r.getFloat64(0,!1):void 0}function u(t,r){t<0&&(t=l(r));r=e.subarray(n,n+t);return n+=t,r}function s(e,t){e<0&&(e=l(t));for(var r={};0<e--;)r[i()]=i();return r}function d(e,t){e<0&&(e=l(t));for(var r=[];0<e--;)r.push(i());return r}function v(t,r){t<0&&(t=l(r));r=n;return n+=t,((e,t,r)=>{var n=t,i=\"\";for(r+=t;n<r;){var a=e[n++];if(127<a)if(191<a&&a<224){if(r<=n)throw Error(\"UTF-8 decode: incomplete 2-byte sequence\");a=(31&a)<<6|63&e[n++]}else if(223<a&&a<240){if(r<=n+1)throw Error(\"UTF-8 decode: incomplete 3-byte sequence\");a=(15&a)<<12|(63&e[n++])<<6|63&e[n++]}else{if(!(239<a&&a<248))throw Error(\"UTF-8 decode: unknown multibyte start 0x\"+a.toString(16)+\" at index \"+(n-1));if(r<=n+2)throw Error(\"UTF-8 decode: incomplete 4-byte sequence\");a=(7&a)<<18|(63&e[n++])<<12|(63&e[n++])<<6|63&e[n++]}if(a<=65535)i+=String.fromCharCode(a);else{if(!(a<=1114111))throw Error(\"UTF-8 decode: code point 0x\"+a.toString(16)+\" exceeds UTF-16 reach\");a-=65536,i=(i+=String.fromCharCode(a>>10|55296))+String.fromCharCode(1023&a|56320)}}return i})(e,r,t)}function c(e,t){e<0&&(e=l(t));t=l(1),e=u(e);return 255===t?(e=>{var r,t;if(4===e.length)return t=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],new Date(1e3*t);if(8===e.length)return r=(e[0]<<22>>>0)+(e[1]<<14>>>0)+(e[2]<<6>>>0)+(e[3]>>>2),t=4294967296*(3&e[3])+(e[4]<<24>>>0)+(e[5]<<16>>>0)+(e[6]<<8>>>0)+e[7],new Date(1e3*t+r/1e6);if(12===e.length)return r=(e[0]<<24>>>0)+(e[1]<<16>>>0)+(e[2]<<8>>>0)+e[3],n-=8,t=a(8),new Date(1e3*t+r/1e6);throw Error(\"Invalid data length for a date value.\")})(e):{type:t,data:e}}}var n={serialize:t,deserialize:r,encode:t,decode:r};nq.exports=n})(),(I=nq.exports)&&I.__esModule&&Object.prototype.hasOwnProperty.call(I,\"default\")?I.default:I),nP=\"$ref\",nD=(e,t,r)=>ep(e)?L:r?t!==L:null===t||t,nB=(e,t,{defaultValues:r=!0,prettify:n=!1})=>{var i,a,l,o=(e,t,n=e[t],i=nD(t,n,r)?s(n):L)=>(n!==i&&(i!==L||eu(e)?e[t]=i:delete e[t],u(()=>e[t]=n)),i),u=e=>(null!=i?i:i=[]).push(e),s=e=>{if(null==e||eh(e)||ep(e))return L;if(ev(e)){if(e.toJSON&&e!==(e=e.toJSON()))return s(e);if(null!=(l=null==a?void 0:a.get(e)))return e[nP]||(e[nP]=l,u(()=>delete e[nP])),{[nP]:l};if(ec(e))for(var t in(null!=a?a:a=new Map).set(e,a.size+1),e)o(e,t);else!eg(e)||e instanceof Uint8Array||(!eu(e)||Object.keys(e).length<e.length?[...e]:e).forEach((t,r)=>r in e?o(e,r):(e[r]=null,u(()=>delete e[r])))}return e};return z(()=>{var r;return t?nR(null!=(r=s(e))?r:null):z(()=>JSON.stringify(e,L,2*!!n),()=>JSON.stringify(s(e),L,2*!!n))},!0,()=>null==i?void 0:i.forEach(e=>e()))},nW=e=>{var t,r,n=e=>ev(e)?e[nP]&&(r=(null!=t?t:t=[])[e[nP]])?r:(e[nP]&&delete(t[e[nP]]=e)[nP],Object.entries(e).forEach(([t,r])=>r!==(r=n(r))&&(e[t]=r)),e):e;return n(el(e)?z(()=>JSON.parse(e),()=>(console.error(\"Invalid JSON received.\",e,Error().stack),L)):null!=e?z(()=>nz(e),()=>(console.error(\"Invalid message received.\",e,Error().stack),L)):e)},nJ=(e,t={})=>{var r=(e,{json:t=!1,decodeJson:r=!1,...n})=>{var l,o,u,i=(e,r)=>ea(e)&&!0===r?e:u(e=el(e)?new Uint8Array(tH(e.length,t=>255&e.charCodeAt(t))):t?z(()=>JSON.stringify(e),()=>JSON.stringify(nB(e,!1,n))):nB(e,!0,n),r),a=e=>null==e?L:z(()=>nW(e),L);return t?[e=>nB(e,!1,n),a,(e,t)=>i(e,t)]:([l,o,u]=(e=>{for(var t,r,n,i,a,o,l=0n,u=0n,s=[],d=0,v=0,c=0,f=0,p=[],c=0;c<(null==e?void 0:e.length);f+=p[c]=e.charCodeAt(c++));var h=e?()=>{s=[...p],v=255&(d=f),c=-1}:()=>{},g=e=>(v=255&(d+=-s[c=(c+1)%s.length]+(s[c]=e)),e);return[e?e=>{for(h(),i=16-((t=e.length)+4)%16,a=new Uint8Array(4+t+i),n=0;n<3;a[n++]=g(nU()));for(r=0,a[n++]=g(v^16*nU(16)+i);r<t;a[n++]=g(v^e[r++]));for(;i--;)a[n++]=nU();return a}:e=>e,e?e=>{for(h(),r=0;r<3;g(e[r++]));if((t=e.length-4-((v^g(e[r++]))%16||16))<=0)return new Uint8Array(0);for(n=0,a=new Uint8Array(t);n<t;a[n++]=v^g(e[r++]));return a}:e=>e,(e,t=64)=>{if(null==e)return null;for(o=er(t)?64:t,h(),[l,u]=nF[o],r=0;r<e.length;l=BigInt.asUintN(o,(l^BigInt(v^g(e[r++])))*u));return!0===t?Number(BigInt(Number.MIN_SAFE_INTEGER)+l%BigInt(Number.MAX_SAFE_INTEGER-Number.MIN_SAFE_INTEGER)):l.toString(36)}]})(e),[(e,t)=>(t?X:n_)(l(nB(e,!0,n))),e=>null!=e?nW(o(e instanceof Uint8Array?e:(r&&ek(e)?a:nj)(e))):null,(e,t)=>i(e,t)])};if(!e){var n=+(null!=(n=t.json)?n:0);if(n&&!1!==t.prettify)return(null!=m?m:m=[r(null,{json:!1}),r(null,{json:!0,prettify:!0})])[n]}return r(e,t)},[nL,,]=(nJ(),nJ(null,{json:!0,decodeJson:!0}),nJ(null,{json:!0,prettify:!0})),tg=tC(\"\"+r5.currentScript.src,\"#\"),rv=tC(\"\"+(tg[1]||\"\"),\";\"),nG=tg[0],nX=rv[1]||(null==(I=tb(nG,{delimiters:!1}))?void 0:I.host),nZ=e=>!(!nX||(null==(e=tb(e,{delimiters:!1}))||null==(e=e.host)?void 0:e.endsWith(nX))!==K),tg=(...e)=>t_(ru(e),/(^(?=\\?))|(^\\.(?=\\/))/,nG.split(\"?\")[0]),nQ=tg(\"?\",\"var\"),n0=tg(\"?\",\"mnt\"),n1=(tg(\"?\",\"usr\"),Symbol()),n2=Symbol(),n5=(e,t,r=K,n=H)=>{t&&(r?console.groupCollapsed:console.group)((n?\"\":tf(\"tail.js: \",\"90;3\"))+t);r=null==e?void 0:e[n2];null!=(e=r?e[n1]:e)&&console.log(ev(e)?tf(nL(e),\"94\"):eh(e)?\"\"+e:e),r&&r.forEach(([e,t,r])=>n5(e,t,r,!0)),t&&console.groupEnd()},[n3,n6]=nJ(),[n4,n8]=[r1,r1],n9=!0,[rv,ie]=ee(),ii=(...e)=>{var r,a=e.shift();console.error(e[1]instanceof Error?e[1].message:el(e[1])?e.shift():null!=(r=null==(r=e[1])?void 0:r.message)?r:\"An error occurred\",null!=(r=a.id)?r:a,...e)},[ia,il]=ee(),[io,iu]=ee(),is=e=>iv!==(iv=e)&&il(iv,ih(!0,!0)),id=e=>ic!==(ic=!!e&&\"visible\"===document.visibilityState)&&iu(ic,!e,ip(!0,!0)),iv=(ia(id),!0),ic=!1,ip=e7(!1),ih=e7(!1),ig=(nc(window,[\"pagehide\",\"freeze\",\"beforeunload\"],()=>is(!1)),nc(window,[\"pageshow\",\"resume\"],()=>is(!0)),nc(document,\"visibilitychange\",()=>(id(!0),ic&&is(!0))),il(iv,ih(!0,!0)),!1),im=e7(!1),[,ib]=ee(),iw=tt({callback:()=>ig&&ib(ig=!1,im(!1)),frequency:2e4,once:!0,paused:!0}),I=()=>!ig&&(ib(ig=!0,im(!0)),iw.restart()),iS=(nc(window,[\"focus\",\"scroll\"],I),nc(window,\"blur\",()=>iw.trigger()),nc(document.body,[\"keydown\",\"pointerdown\",\"pointermove\",\"scroll\"],I),I(),()=>im()),ix=0,iT=void 0,iA=()=>(null!=iT?iT:r1())+\"_\"+iI(),iI=()=>(e9(!0)-(parseInt(iT.slice(0,-2),36)||0)).toString(36)+\"_\"+(++ix).toString(36),i$=new Map,iO={id:iT,heartbeat:e9()},iC={knownTabs:new Map([[iT,iO]]),variables:new Map},[i_,ij]=ee(),[iF,iU]=ee(),iM=r1,iq=(e,t=e9())=>{e=i$.get(el(e)?e:rY(e));return null!=e&&e.cache&&e.cache[0]+e.cache[1]<=t?void 0:e},iz=(...e)=>{var t=e9();return iP(tH(e,e=>(e.cache=[t],[r_(e),{...e,created:t,modified:t,version:\"0\"}])))},iR=e=>null!=(e=tH(e,e=>{var t,r;return e&&(t=rY(e[0]),(r=i$.get(t))!==e[1])?[t,e[1],r,e[0]]:tz}))?e:[],iP=e=>{var r,n,e=iR(e);null!=e&&e.length&&(r=e9(),tV(e,([,e,t])=>{e&&!e.cache&&(e.cache=null!=(e=null==t?void 0:t.cache)?e:[r,3e3])}),ri(i$,e),(n=tK(e,([,,,e])=>0<rG.compare(e.scope,\"tab\"))).length&&iM({type:\"patch\",payload:rn(n)}),iU(tH(e,([,e,t,r])=>[r,e,t]),i$,!0))},[,iB]=(rv((e,t)=>{ia(r=>{var n;r?(r=t(sessionStorage.getItem(\"_tail:state\")),sessionStorage.removeItem(\"_tail:state\"),iT=null!=(n=null==r?void 0:r[0])?n:e9(!0).toString(36)+Math.trunc(1296*Math.random()).toString(36).padStart(2,\"0\"),i$=new Map(t1(tK(i$,([,e])=>\"view\"===(null==e?void 0:e.scope)),tH(null==r?void 0:r[1],e=>[rY(e),e])))):sessionStorage.setItem(\"_tail:state\",e([iT,tH(i$,([,e])=>e&&\"view\"!==e.scope?e:tz)]))},!0),iM=(t,r)=>{e&&(localStorage.setItem(\"_tail:state\",e([iT,t,r])),localStorage.removeItem(\"_tail:state\"))},nc(window,\"storage\",e=>{var a,l,o;\"_tail:state\"!==e.key||!(e=null==t?void 0:t(e.newValue))||e[2]&&e[2]!==iT||([e,{type:a,payload:l}]=e,\"query\"===a?r.active||iM({type:\"set\",payload:[tH(iC.knownTabs),tH(iC.variables)]},e):\"set\"===a&&r.active?(iC.knownTabs=new Map(l[0]),iC.variables=new Map(l[1]),i$=new Map(l[1]),r.trigger()):\"patch\"===a?(o=iR(tH(l,([e,t])=>[rQ(e),t])),ri(iC.variables,l),ri(i$,l),iU(tH(o,([,e,t,r])=>[r,e,t]),i$,!1)):\"tab\"===a&&(rt(iC.knownTabs,e,l),l)&&ij(\"tab\",l,!1))});var r=tt(()=>ij(\"ready\",iC,!0),-25),n=tt({callback(){var e=e9()-1e4;tV(iC.knownTabs,([t,r])=>r[0]<e&&rt(iC.knownTabs,t,void 0)),iO.heartbeat=e9(),iM({type:\"tab\",payload:iO})},frequency:5e3,paused:!0});ia(e=>(e=>{iM({type:\"tab\",payload:e?iO:void 0}),e?(r.restart(),iM({type:\"query\"})):r.toggle(!1),n.toggle(e)})(e),!0)},!0),ee()),[iW,iJ]=ee(),iL=(({timeout:t=1e3,encrypt:r=!0,retries:n=10}={})=>{var i=()=>(r?n8:n6)(localStorage.getItem(\"_tail:rq\")),a=0,l=()=>localStorage.setItem(\"_tail:rq\",(r?n4:n3)([iT,e9()+t]));return async(r,o,u=null!=o?1:n)=>{for(;u--;){var d=i();if((!d||d[1]<e9())&&(l(),(null==(d=i())?void 0:d[0])===iT))return 0<t&&(a=setInterval(()=>l(),t/2)),D(r,!0,()=>{clearInterval(a),localStorage.removeItem(\"_tail:rq\")});var v=to(),[d]=nc(window,\"storage\",t=>{\"_tail:rq\"!==t.key||t.newValue||v.resolve()});e=[tl(null!=o?o:t),v],await Promise.race(e.map(e=>eh(e)?e():e)),d()}var e;null==o&&F(\"_tail:rq could not be acquired.\")}})(),iV=async(e,t,{beacon:r=!1,encrypt:n=!0}={})=>{n=n&&n9;var i,a,l=!1,o=r=>{var o=eh(t)?null==t?void 0:t(i,r):t;return!1!==o&&(iB(e,i=null!=o&&!0!==o?o:i,r,e=>(l=i===L,i=e)),!l)&&(a=n?n4(i,!0):JSON.stringify(i))};if(!r)return iL(()=>eR(1,async t=>{var l;return o(t)?400<=(l=await fetch(e,{method:null!=i?\"POST\":\"GET\",cache:\"no-cache\",credentials:\"include\",mode:\"cors\",headers:{\"Content-Type\":\"text/plain; charset=iso-8859-1\"},body:a})).status?0===t?ex(F(\"Invalid response: \"+await l.text())):(console.warn(`Request to ${e} failed on attempt ${t+1}/3.`),await tl(200*(1+t))):(null!=(l=null!=(t=n?new Uint8Array(await l.arrayBuffer()):await l.text())&&t.length?null==(l=n?n8:JSON.parse)?void 0:l(t):L)&&iJ(l),ex(l)):ex()}));o(0)&&!navigator.sendBeacon(e,new Blob(null!=i?[a]:[],{type:\"text/plain; charset=iso-8859-1\"}))&&F(\"Beacon send failed.\")},tg=[\"scope\",\"key\",\"entityId\",\"source\"],iK=[...tg,\"purpose\",\"ifModifiedSince\",\"ifNoneMatch\"],iG=[...tg,\"value\",\"force\",\"ttl\",\"version\"],iX=new Map,iY=Symbol(),i1=Symbol(),i2=[.75,.33],i5=[.25,.33],i6=e=>tH(t5(e,[e=>e.scope,e=>e.key]),e=>e?[e,`${rC(e)}, ${rZ(e)?\"client-side memory only\":rg(null==(e=e.schema)?void 0:e.usage)})`,H]:tz),i7=(e,t=\"A\"===ni(e)&&r7(e,\"href\"))=>t&&\"#\"!=t&&!t.startsWith(\"javascript:\"),ae=(e,t=ni(e),r=nA(e,\"button\"))=>r!==H&&(M(t,\"A\",\"BUTTON\")||\"INPUT\"===t&&M(nt(e,\"type\"),\"button\",\"submit\")||r===K),at=(e,t=!1)=>{var r;return{tagName:e.tagName,text:tp((null==(r=r7(e,\"title\"))?void 0:r.trim())||(null==(r=r7(e,\"alt\"))?void 0:r.trim())||(null==(r=e.innerText)?void 0:r.trim()),100),href:null==(r=e.href)?void 0:r.toString(),rect:t?nv(e):void 0}},an=e=>{if(k)return k;el(e)&&([r,e]=n6(e),e=nJ(r,{decodeJson:!0})[1](e)),eY(nE,e),(e=>{n8===r1&&([n4,n8]=nJ(e,{json:!e,prettify:!1}),n9=!!e,ie(n4,n8))})(e2(nE,\"encryptionKey\"));var r,l,o,u,s,d,v,c,f,p,h,g,m,i=e2(nE,\"key\"),a=null!=(e=null==(r=r2[nE.name])?void 0:r._)?e:[];if(eu(a))return l=[],o=[],u=(e,...t)=>{var r=K;o=eW(o,n=>z(()=>{var i;return null!=(i=n[e])&&i.call(n,...t,{tracker:k,unsubscribe:()=>r=H}),r},(e=>t=>ii(e,t))(n)))},s=[],v=((e,t)=>{var r=tt(async()=>{var e=tH(iX,([e,t])=>({...rQ(e),result:[...t]}));e.length&&await a.get(e)},3e3),n=(e,t)=>t&&t7(iX,e,()=>new Set).add(t),a=(ia((e,t)=>r.toggle(e,e&&3e3<=t),!0),iF(e=>tV(e,([e,t])=>(e=>{var t,r;e&&(t=rY(e),null!=(r=e2(iX,t)))&&r.size&&tV(r,r=>!0===r(e)&&n(t,r))})(t?{status:rj.Success,...t}:{status:rj.NotFound,...e}))),{get:r=>rB(\"get\",r,async r=>{r[0]&&!el(r[0])||(l=r[0],r=r.slice(1)),null!=t&&t.validateKey(l);var o=new Map,u=[],s=tH(r,e=>{var t=iq(rY(e)),r=e.purpose;if(r&&!0!==(null==t||null==(i=t.schema)?void 0:i.usage.purposes[r]))o.set(e,{...e,status:rj.Forbidden,error:`No consent for '${r}'.`});else if(e.refresh&&t)o.set(e,{status:rj.Success,...t});else{if(!rZ(e))return[rl(e,iK),e];var i,r=null==(i=e.init)?void 0:i.call(e);r?(r={...r_(e),version:\"1\",created:d,modified:d,value:r,cache:[d,null!=(i=e.ttl)?i:null==t?void 0:t.ttl]},rr(u,[r_(r),r]),o.set(e,{status:rj.Success,...r})):o.set(e,{status:rj.NotFound,...r_(e)})}return tz}),d=e9(),l=s.length&&(null==(l=await iV(e,{variables:{get:tH(s,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId}))||null==(r=l.variables)?void 0:r.get)||[],c=[];return tV(l,(e,t)=>{var n,r;(null==e?void 0:e.status)===rj.NotFound?null!=(r=null==(r=(n=s[t][1]).init)?void 0:r.call(n))&&c.push([n,{...r_(n),value:r}]):o.set(s[t][1],rX(e))}),c.length&&tV(await a.set(tH(c,([,e])=>e)).all(),(e,t)=>o.set(c[t][0],rX(e.status===rj.Conflict?{...e,status:rj.Success}:e))),u.length&&iP(u),o},{poll:(e,t)=>n(rY(e),t),logCallbackError:(e,t,r)=>ii(\"Variables.get\",e,{operation:t,error:r})}),set:r=>rB(\"set\",r,async r=>{r[0]&&!el(r[0])||(n=r[0],r=r.slice(1)),null!=t&&t.validateKey(n);for(var n,i,l=[],o=new Map,u=e9(),s=[],d=tH(r,e=>{var i,r,t=iq(rY(e));return rZ(e)?((r=null==(i=e.patch?e.patch(null==t?void 0:t.value):e.value)?void 0:{...r_(e),created:null!=(r=null==t?void 0:t.created)?r:u,modified:u,version:null!=t&&t.version?\"\"+(parseInt(t.version)+1):\"1\",scope:e.scope,key:e.key,value:i,cache:[u,e.ttl]})&&(r.cache=[u,null!=(i=e.ttl)?i:3e3]),o.set(e,r?{status:t?rj.Success:rj.Created,...r}:{status:rj.Success,...r_(e)}),rr(l,[r_(e),r]),tz):e.patch?(s.push(e),tz):(void 0===(null==e?void 0:e.version)&&(e.version=null==t?void 0:t.version),[rl(e,iG),e])}),v=0;!v++||s.length;)tV(await a.get(tH(s,e=>r_(e))).all(),(e,t)=>{var r=s[t];rU(e,!1)?rr(d,[{...r,patch:void 0,value:s[t].patch(null==e?void 0:e.value),version:e.version},r]):o.set(r,e)}),s=[],tV(d.length?q(null==(i=(await iV(e,{variables:{set:tH(d,([e])=>e)},deviceSessionId:null==t?void 0:t.deviceSessionId})).variables)?void 0:i.set,\"No result.\"):[],(e,t)=>{var[,t]=d[t];v<=3&&t.patch&&((null==e?void 0:e.status)===rj.Conflict||(null==e?void 0:e.status)===rj.NotFound)?rr(s,t):o.set(t,rX(e))});return l.length&&iP(l),o},{logCallbackError:(e,t,r)=>ii(\"Variables.set\",e,{operation:t,error:r})})});return iW(({variables:e})=>{e&&null!=(e=t1(tH(e.get,e=>rF(e)?e:tz),tH(e.set,e=>rU(e)?e:tz)))&&e.length&&iP(tH(e,e=>[r_(e),rU(e)?e:void 0]))}),a})(nQ,d={applyEventExtensions(e){return null==e.clientId&&(e.clientId=iA()),null==e.timestamp&&(e.timestamp=e9()),h=K,tV(l,([,t])=>{var r;return(null==(r=t.decorate)?void 0:r.call(t,e))===H&&tR(!0)})?void 0:e},validateKey:(e,t=!0)=>!i&&!e||e===i||!!t&&F(`'${e}' is not a valid key.`)}),c=((e,t)=>{var n=[],i=new WeakMap,a=new Map,l=(e,t)=>{var r;return null!=(r=e.metadata)&&r.queued?eZ(t,{type:e.type+\"_patch\",patchTargetId:e.clientId}):F(\"Source event not queued.\")},o=e=>{i.set(e,e3(e))},u=async(r,n=!0,i)=>{var a;return r[0]&&!el(r[0])||(a=r[0],r=r.slice(1)),r=tH(r,e=>{if(null!=t&&t.validateKey(null!=a?a:e.key),eZ(e,{metadata:{posted:!0}}),e[iY]){if(tV(e[iY],(t,r,n)=>!1===t(e)||n,!1))return;delete e[iY]}return eZ(ry(e3(e),!0),{timestamp:e.timestamp-e9()})}),n5({[n2]:tH(r,e=>[e,e.type,H])},\"Posting \"+rs([tv(\"new event\",[eJ(r,e=>!rb(e))||void 0]),tv(\"event patch\",[eJ(r,e=>rb(e))||void 0])])+(n?\" asynchronously\":\" synchronously\")+\".\"),iV(e,{events:r,variables:i,deviceSessionId:null==t?void 0:t.deviceSessionId},{beacon:n})},s=async(e,{flush:r=!1,async:i=!0,variables:a}={})=>{var l=[];if(e=tH(tQ(e),e=>{var r;return null!=(r=e.metadata)&&r.queued||e6(l,e),null!=(r=ra(t.applyEventExtensions(e),{metadata:{queued:!0}}))?r:tz}),tV(l,e=>n5(e,e.type)),!i)return u(e,!1,a);r?(n.length&&e4(e,...n.splice(0)),e.length&&await u(e,!0,a)):e.length&&e6(n,...e)};return tt(()=>s([],{flush:!0}),5e3),io((e,t,r)=>{!e&&(n.length||t||1500<r)&&(e=tH(a,([e,t])=>{var[t,n]=t();return n&&(a.delete(e),i.delete(e)),null!=t?t:tz}),n.length||e.length)&&s(ej(n.splice(0),e),{flush:!0})}),{post:s,postPatch:(e,t,r)=>s(l(e,t),{flush:!0}),registerEventPatchSource(e,t,r=!1,n){var u=!1,d=()=>{u=!0};return o(e),((e,t)=>{var r;(null!=(r=(b=e)[w=iY])?r:b[w]=new Set).add(t)})(e,o),a.set(e,()=>{if(!1===(null==n?void 0:n.isConnected))d();else{var a=i.get(e),o=t(a,d),[o,v]=(n5({diff:{snapshot:a,patched:o},stack:Error().stack},\"Patch \"+a.type),null!=(o=e8(o,a))?o:[]);if(o&&!U(v,a))return i.set(e,e3(v)),[l(e,o),u]}return[void 0,u]}),r&&s(e),d}}})(nQ,d),f=null,p=0,g=h=H,m=!1,k=(...e)=>{if(m){if(e.length){1<e.length&&(!e[0]||el(e[0]))&&(t=e[0],e=e.slice(1)),el(e[0])&&(r=e[0],e=ek(r)?JSON.parse(r):n6(r));var t,n=H;if((e=eW(tG(e,e=>el(e)?n6(e):e),e=>{if(!e)return H;if(aj(e))nE.tags=eY({},nE.tags,e.tagAttributes);else{if(aF(e))return nE.disabled=e.disable,H;if(aq(e))return n=K,H;if(aW(e))return e(k),H}return g||aR(e)||aM(e)?K:(s.push(e),H)})).length||n){var r=eK(e,e=>aM(e)?-100:aR(e)?-50:aB(e)?-10:90*!!rW(e));if(!f||!f.splice(h?p+1:f.length,0,...r)){for(p=0,f=r;p<f.length;p++){var y=f[p];y&&(d.validateKey(null!=t?t:y.key),z(()=>{var e=f[p];if(u(\"command\",e),h=H,rW(e))c.post(e);else if(az(e))v.get(tQ(e.get));else if(aB(e))v.set(tQ(e.set));else if(aR(e))e6(o,e.listener);else if(aM(e))(t=z(()=>e.extension.setup(k),t=>ii(e.extension.id,t)))&&(e6(l,[null!=(r=e.priority)?r:100,t,e.extension]),eK(l,([e])=>e));else if(aW(e))e(k);else{var r,n,t,a=H;for([,t]of l)if(a=null!=(n=null==(n=t.processCommand)?void 0:n.call(t,e))?n:H)break;a||ii(\"invalid-command\",e,\"Loaded extensions:\",tH(l,e=>e[2].id))}},e=>ii(k,\"internal-error\",e)))}f=null,n&&c.post([],{flush:n})}}}}else a.push(...e)},Object.defineProperty(r2,nE.name,{value:Object.freeze(Object.assign(k,{id:\"tracker_\"+iA(),events:c,variables:v,__isTracker:K})),configurable:!1,writable:!1}),iF((e,t,r)=>{var n=ej(i6(tH(e,([,e])=>e||tz)),[[{[n2]:i6(tH(t,([,e])=>e||tz))},\"All variables\",K]]);n5({[n2]:n},tf(`Variables changed${r?\"\":\" - merging changes from another tab\"} (${e.length} changed, ${eJ(t)} in total).`,\"2;3\"))}),i_(async(e,t,r,n)=>{var l;\"ready\"===e&&([e,l]=await v.get([{scope:\"session\",key:\"@info\",refresh:!0},{scope:\"session\",key:\"@consent\",refresh:!0,cache:V}]).values(!0),d.deviceSessionId=e.deviceSessionId,e.hasUserAgent||((()=>{k(B({type:\"user_agent\",hasTouch:0<navigator.maxTouchPoints,userAgent:navigator.userAgent,view:null==S?void 0:S.clientId,languages:tH(navigator.languages,(e,t)=>{var[r,n]=e.split(\"-\");return B({id:e,language:r,region:n,primary:0===t,preference:t+1})}),timezone:{iana:Intl.DateTimeFormat().resolvedOptions().timeZone,offset:(new Date).getTimezoneOffset()},...(r=null==r2?void 0:r2.screen,r?({width:r,height:i,orientation:a}=r,l=r<i,-90!==(a=null!=(a=null!=(a=null==a?void 0:a.angle)?a:r2.orientation)?a:0)&&90!==a||([r,i]=[i,r]),{deviceType:r<480?\"mobile\":r<=1024?\"tablet\":\"desktop\",screen:{dpr:r2.devicePixelRatio,width:r,height:i,landscape:l}}):{})}));var i,l,a,r})(),e.hasUserAgent=!0),g=!0,s.length&&k(s),n(),m=!0,k(...tH(a$,e=>({extension:e})),...a),k({set:{scope:\"view\",key:\"loaded\",value:!0}}))},!0),k;F(`The global variable for the tracker \"${nE.name}\" is used for something else than an array of queued commands.`)},ai=()=>null==S?void 0:S.clientId,aa={scope:\"shared\",key:\"referrer\"},al=(e,t)=>{k.variables.set({...aa,value:[ai(),e]}),t&&k.variables.get({scope:aa.scope,key:aa.key,poll:(r,n,i)=>!!r||(null==i?void 0:i[1])===e&&t()&&!1})},ao=e7(),au=e7(),as=1,[av,ac]=ee(),af=e=>{var t=e7(e,ao),r=e7(e,au),n=e7(e,iS),i=e7(e,()=>as);return(e,a)=>({totalTime:t(e,a),visibleTime:r(e,a),activeTime:n(e,a),activations:i(e,a)})},ap=af(),[ag,am]=ee(),ay=(e,t)=>(t&&tV(aw,t=>e(t,()=>!1)),ag(e)),ab=new WeakSet,aw=document.getElementsByTagName(\"iframe\");function aS(e){if(e){if(null!=e.units&&M(e.action,null,\"add\",\"remove\")){if(0===e.units)return;e.action=0<e.units?\"add\":\"remove\"}return e}}var aT=e=>(null==e?void 0:e.component)||(null==e?void 0:e.content),aA=e=>nI(e,t=>t!==e&&!!aT(nh.get(t)),e=>(T=nh.get(e),(T=nh.get(e))&&e_(ej(T.component,T.content,T),\"tags\"))),aI=(e,t)=>t?e:{...e,rect:void 0,content:(A=e.content)&&tH(A,e=>({...e,rect:void 0}))},aE=(e,t=H,r)=>{var n,i,a,l=[],o=[],u=0;return r8(e,e=>{var s,a,i=nh.get(e);i&&(aT(i)&&(a=eW(tQ(i.component),e=>{var r;return 0===u||!t&&(1===u&&(null==(r=e.track)?void 0:r.secondary)!==K||(null==(r=e.track)?void 0:r.promote))}),n=(null!=r?r:eH(a,e=>null==(e=e.track)?void 0:e.region))&&nv(e)||void 0,s=aA(e),i.content&&e4(l,...tH(i.content,e=>({...e,rect:n,...s}))),null!=a)&&a.length&&(e4(o,...tH(a,e=>{var t;return u=eL(u,null!=(t=e.track)&&t.secondary?1:2),aI({...e,content:l.length?l:void 0,rect:n,...s},!!n)})),l=[]),a=i.area||nT(e,\"area\"))&&e4(o,a)}),l.length&&e6(o,aI({id:\"\",rect:n,content:l})),tV(o,e=>{el(e)?e6(null!=i?i:i=[],e):(null==e.area&&(e.area=ru(i,\"/\")),e4(null!=a?a:a=[],e))}),a||i?{components:a,area:ru(i,\"/\")}:void 0},aN=Symbol(),a$=[{id:\"context\",setup(e){tt(()=>tV(aw,e=>re(ab,e)&&am(e)),500).trigger(),e.variables.get({scope:\"view\",key:\"view\",poll(t){return null==S||!t||null!=S&&S.definition?null!=(n=t)&&t.navigation&&f(!0):(S.definition=t,null!=(t=S.metadata)&&t.posted?e.events.postPatch(S,{definition:n}):n5(S,S.type+\" (definition updated)\")),!0}});var n,t,d=null!=(t=null==(t=iq({scope:\"tab\",key:\"viewIndex\"}))?void 0:t.value)?t:0,v=null==(t=iq({scope:\"tab\",key:\"tabIndex\"}))?void 0:t.value,c=(null==v&&iz({scope:\"tab\",key:\"tabIndex\",value:v=null!=(t=null!=(t=null==(t=iq({scope:\"shared\",key:\"tabIndex\"}))?void 0:t.value)?t:null==(t=iq({scope:\"session\",key:\"@info\"}))||null==(t=t.value)?void 0:t.tabs)?t:0},{scope:\"shared\",key:\"tabIndex\",value:v+1}),null),f=(t=H)=>{var a,l,o,i,p;no(\"\"+c,c=location.href)&&!t||({source:t,scheme:i,host:a}=tb(location.href+\"\",{requireAuthority:!0}),S={type:\"view\",timestamp:e9(),clientId:iA(),tab:iT,href:t,path:location.pathname,hash:location.hash||void 0,domain:{scheme:i,host:a},tabNumber:v+1,tabViewNumber:d+1,viewport:np(),duration:ap(void 0,!0)},0===v&&(S.firstTab=K),0===v&&0===d&&(S.landingPage=K),iz({scope:\"tab\",key:\"viewIndex\",value:++d}),l=tw(location.href),tH([\"source\",\"medium\",\"campaign\",\"term\",\"content\"],(e,t)=>{var n;return null!=(e=(null!=(n=(o=S).utm)?n:o.utm={})[e]=null==(n=tQ(l[\"utm_\"+e]))?void 0:n[0])?e:tz}),!(S.navigationType=x)&&performance&&tV(performance.getEntriesByType(\"navigation\"),e=>{S.redirects=e.redirectCount,S.navigationType=t_(e.type,/\\_/g,\"-\")}),x=void 0,\"navigate\"===(null!=(t=S.navigationType)?t:S.navigationType=\"navigate\")&&(p=null==(i=iq(aa))?void 0:i.value)&&nZ(document.referrer)&&(S.view=null==p?void 0:p[0],S.relatedEventId=null==p?void 0:p[1],e.variables.set({...aa,value:void 0})),(p=document.referrer||null)&&!nZ(p)&&(S.externalReferrer={href:p,domain:(()=>{var{host:t,scheme:r,port:n}=tb(p,{delimiters:!1,requireAuthority:!0});return{host:t+(n?\":\"+n:\"\"),scheme:r}})()}),S.definition=n,n=void 0,e.events.post(S),e.events.registerEventPatchSource(S,()=>({duration:ap()})),ac(S))};return io(e=>{e?(au(K),++as):au(H)}),nc(window,\"popstate\",()=>(x=\"back-forward\",f())),tV([\"push\",\"replace\"],e=>{var t=history[e+=\"State\"];history[e]=(...e)=>{t.apply(history,e),x=\"navigate\",f()}}),f(),{processCommand:t=>a_(t)&&(e(t.username?{type:\"login\",username:t.username}:{type:\"logout\"}),K),decorate(e){!S||rJ(e)||rb(e)||(e.view=S.clientId)}}}},{id:\"components\",setup(e){var t=(e=>{var t=new IntersectionObserver(e=>tV(e,e=>{var t,r;return null==(t=(r=e.target)[i1])?void 0:t.call(r,e)})),r=new Set,n=(tt({callback:()=>tV(r,e=>e()),frequency:250,raf:!0}),(e,t,r=0)=>e<r?r:t<e?t:e),i=r5.createRange();return(a,l)=>{var o,u,s,d,v,c,f,p,h,g,m,y,b,w,k,S;l&&(o=eW(null==l?void 0:l.component,e=>{var t;return(null==(t=e.track)?void 0:t.impressions)||(null!=(t=null==(t=e.track)?void 0:t.secondary)?t:e.inferred)!==K}))&&eJ(o)&&(p=f=H,g=h=0,m=(e,t,r,n)=>{var i,a=null!=(a=(i=null!=u?u:u=[])[e])?a:i[e]=[{duration:0,impressions:0},e7(!1,iS),!1,!1,0,0,0,tj()];a[4]=t,a[5]=r,a[6]=n},y=[tj(),tj()],b=af(!1),w=e7(!1,iS),k=-1,S=()=>{var $,t=a.getBoundingClientRect(),r=window.innerWidth,l=window.innerHeight,S=[n(t.top,l),n(t.right,r),n(t.bottom,l),n(t.left,r)],x=S[2]-S[0],S=S[1]-S[3],E=f?i5:i2,r=(E[0]*l<x||E[0]<(x/t.height||0))&&(E[0]*r<S||E[0]<(S/t.width||0));if(p!==r&&w(p=r,!0),f!==(f=p&&w()>=nE.impressionThreshold-250)&&(++h,b(f),s||(s=tH(o,e=>((null==(e=e.track)?void 0:e.impressions)||nA(a,\"impressions\",K,e=>null==(e=e.track)?void 0:e.impressions))&&B({type:\"impression\",pos:nu(a),viewport:np(),timeOffset:ap(),impressions:h,...aE(a,K)})||tz),e(s)),null!=s)&&s.length&&($=b(),d=tH(s,t=>e.events.registerEventPatchSource(t,()=>({relatedEventId:t.clientId,duration:$,impressions:h,regions:u&&{top:u[0][0],middle:u[1][0],bottom:u[2][0]},seen:g,text:c,read:$.activeTime&&c&&n($.activeTime/c.readTime,g)})))),t.height!==k){k=t.height;E=a.textContent;if({boundaries:v,...c}=(e=>{for(var r,n,i=RegExp(\"[\\\\p{L}\\\\p{N}][\\\\p{L}\\\\p{N}'’]*|([.!?]+)\",\"gu\"),a=0,l=0,o=0,u=0,s=!1;r=i.exec(e);)r[1]?(s&&++u,s=!1):(s=!0,a+=r[0].length,6<r[0].length&&++o,++l);s&&++u;var i=RegExp(\"[\\\\p{L}\\\\p{N}]|([^\\\\p{L}\\\\p{N}]+)\",\"gu\"),d=[0,.25,.75,1].map(e=>e*a|0),v=[],f=0,p=!1;do{if(null!=(r=i.exec(e))&&r[1])p&&++f;else{for(var c=null==r?void 0:r.index,h=!1,g=0;g<d.length;g++)d[g]--||(v[g]={offset:null!=n?n:c,wordsBefore:f,readTime:eb(f/238*6e4)},h=!0);(p=!h)||(f=0),n=c+1}}while(r);return{text:e,length:e.length,characters:a,words:l,sentences:u,lix:eb(l/u+100*o/l),readTime:eb(l/238*6e4),boundaries:v}})(null!=E?E:\"\"),u||t.height>=1.25*l){var C=r5.createTreeWalker(a,NodeFilter.SHOW_TEXT),_=0,j=0;for(null==u&&(u=[]);j<v.length&&(F=C.nextNode());){var F,U,M,P,D,z=null!=(U=null==(U=F.textContent)?void 0:U.length)?U:0;for(_+=z;_>=(null==(M=v[j])?void 0:M.offset);)i[j%2?\"setEnd\":\"setStart\"](F,v[j].offset-_+z),j++%2&&({top:M,bottom:P}=i.getBoundingClientRect(),D=t.top,j<3?m(0,M-D,P-D,v[1].readTime):(m(1,u[0][4],M-D,v[2].readTime),m(2,M-D,P-D,v[3].readTime)))}}}var r=t.left<0?-t.left:0,E=t.top<0?-t.top:0,L=t.width*t.height;f&&(g=y[0].push(E,E+x)*y[1].push(r,r+S)/L),u&&tV(u,e=>{var r=n(t.top<0?-t.top:0,e[5],e[4]),i=n(t.bottom>l?l:t.bottom,e[5],e[4]),a=f&&0<i-r,o=e[0];o.duration=e[1](a),a&&(e[3]!==(e[3]=a)&&++e[0].impressions,o.seen=e[7].push(r,i)/(e[5]-e[4]),o.read=n(o.duration/e[6],o.seen))})},a[i1]=({isIntersecting:e})=>{eY(r,S,e),e||(tV(d,e=>e()),S())},t.observe(a))}})(e),n=({boundary:e,...n})=>{eQ(nh,e,e=>{var t;return(e=>null==e?void 0:{...e,component:tQ(e.component),content:tQ(e.content),tags:tQ(e.tags)})(\"add\"in n?{...e,component:ej(null==e?void 0:e.component,n.component),content:ej(null==e?void 0:e.content,n.content),area:null!=(t=null==n?void 0:n.area)?t:null==e?void 0:e.area,tags:ej(null==e?void 0:e.tags,n.tags),cart:null!=(t=n.cart)?t:null==e?void 0:e.cart,track:null!=(t=n.track)?t:null==e?void 0:e.track}:\"update\"in n?n.update(e):n)}),t(e,nh.get(e))};return{decorate(e){tV(e.components,t=>{rt(t,\"track\",void 0),tV(e.clickables,e=>rt(e,\"track\",void 0))})},processCommand:e=>aU(e)?(n(e),K):aD(e)?(tV(((e,t)=>{var r,n;return t?(r=[],n=new Set,document.querySelectorAll(`[${e}]`).forEach(i=>{if(!n.has(i))for(var a=[];null!=r7(i,e);){((e,t)=>e instanceof Set||e instanceof WeakSet?e.has(t)||e.add(t):eX(e,t)||eG(e,t,!0))(n,i);var l,o=tC(r7(i,e),\"|\");r7(i,e,null);for(var u=0;u<o.length;u++){var d=o[u];if(\"\"!==d){var s=\"-\"===d?-1:parseInt(null!=(s=eo(d))?s:\"\",36);if(s<0)a.length+=s;else{if(0===u&&(a.length=0),isNaN(s)&&/^[\"\\[{]/.test(d))for(var c=\"\";u<o.length;u++)try{d=JSON.parse(c+=o[u]);break}catch{}0<=s&&t[s]&&(d=t[s]),e6(a,d)}}}e6(r,...tH(a,e=>({add:K,...e,boundary:i})));var f=i.nextElementSibling;\"WBR\"===i.tagName&&null!=(l=i.parentNode)&&l.removeChild(i),i=f}}),r):[]})(e.scan.attribute,e.scan.components),n),K):H}}},{id:\"navigation\",setup(e){var t=new WeakMap,r=r=>{nc(r,[\"click\",\"contextmenu\",\"auxclick\"],n=>{var i,a,l,o,u,s=H;if(r8(n.target,e=>{ae(e)&&null==l&&(l=e),s=s||\"NAV\"===ni(e);var t,d=ng(e),d=null==d?void 0:d.component;!n.button&&null!=d&&d.length&&!u&&(tV(e.querySelectorAll(\"a,button\"),t=>ae(t)&&(3<(null!=u?u:u=[]).length?ex():u.push({...at(t,!0),component:r8(t,(e,t,r,n=null==(i=ng(e))?void 0:i.component)=>n&&t(n[0]),t=>t===e)}))),u)&&null==o&&(o=e),null==i&&(i=null!=(t=nA(e,\"clicks\",K,e=>null==(e=e.track)?void 0:e.clicks))?t:d&&eH(d,e=>(null==(e=e.track)?void 0:e.clicks)!==H)),null==a&&(a=null!=(t=nA(e,\"region\",K,e=>null==(e=e.track)?void 0:e.region))?t:d&&eH(d,e=>null==(e=e.track)?void 0:e.region))}),null!=o?o:o=l){var d,v=u&&!l&&i,c=aE(null!=l?l:o,!1,v),f=nI(null!=l?l:o,void 0,e=>tK(tQ(null==(e=nh.get(e))?void 0:e.tags))),p=(null==i&&(i=!s),{...(a=null==a?K:a)?{pos:nu(l,n),viewport:np()}:null,...((e,t)=>{var n;return r8(null!=e?e:t,e=>\"IMG\"===ni(e)||e===t?(n={element:at(e,!1)},H):K),n})(n.target,null!=l?l:o),...c,timeOffset:ap(),...f});if(l)if(i7(l)){var h=l,c=h.hostname!==location.hostname,{host:f,scheme:y,source:b}=tb(h.href,{delimiters:!1,requireAuthority:!0});if(h.host===location.host&&h.pathname===location.pathname&&h.search===location.search)return\"#\"===h.hash?void 0:void(h.hash!==location.hash&&0===n.button&&e(B({type:\"anchor_navigation\",anchor:h.hash,...p})));var k,x,w=B({clientId:iA(),type:\"navigation\",href:c?h.href:b,external:c,domain:{host:f,scheme:y},self:K,anchor:h.hash,...p});\"contextmenu\"!==n.type?n.button<=1&&(1===n.button||n.ctrlKey||n.shiftKey||n.altKey||r7(h,\"target\")!==window.name?(al(w.clientId),w.self=H,e(w)):no(location.href,h.href)||(w.exit=w.external,al(w.clientId))):(k=h.href,(b=nZ(k))?al(w.clientId,()=>e(w)):(x=(\"\"+Math.random()).replace(\".\",\"\").substring(1,8),b||nE.captureContextMenu&&(h.href=n0+\"=\"+x+encodeURIComponent(k),nc(window,\"storage\",(t,r)=>\"_tail:push\"===t.key&&(t.newValue&&(null==(t=JSON.parse(t.newValue))?void 0:t.requestId)===x&&e(w),r())),nc(r,[\"keydown\",\"keyup\",\"visibilitychange\",\"pointermove\"],(e,t)=>{t(),h.href=k}))))}else{r8(n.target,(e,t)=>{var r;return!!(null!=d?d:d=(e=>el(e=null==e||e!==K&&\"\"!==e?e:\"add\")&&M(e,\"add\",\"remove\",\"update\",\"clear\")?{action:e}:ev(e)?e:void 0)(null!=(r=null==(r=ng(e))?void 0:r.cart)?r:nT(e,\"cart\")))&&!d.item&&(d.item=(e=>null==e?L:eu(e)||el(e)?e[e.length-1]:eq(e,(e,r)=>e,void 0,void 0))(null==(r=ng(e))?void 0:r.content))&&t(d)});c=aS(d);(c||i)&&e(B(c?{type:\"cart_updated\",...p,...c}:{type:\"component_click\",...p}))}else v&&eQ(t,o,r=>{var i=ns(o,n);return r?e6(r,i):(i=B({type:\"component_click_intent\",...p,clicks:r=[i],clickables:u}),e.events.registerEventPatchSource(i,()=>({clicks:t.get(o)}),!0,o)),r})}})};r(document),ay(e=>e.contentDocument&&r(e.contentDocument))}},{id:\"scroll\",setup(e){var t={},r=nl(K);av(()=>{return e=()=>(t={},r=nl(K)),setTimeout(e,250);var e}),nc(window,\"scroll\",()=>{var a,n=nl(),i={x:(o=nl(H)).x/(r3.offsetWidth-window.innerWidth)||0,y:o.y/(r3.offsetHeight-window.innerHeight)||0};n.y>=r.y&&(a=[],!t.fold&&n.y>=r.y+200&&(t.fold=K,e6(a,\"fold\")),!t[\"page-middle\"]&&.5<=i.y&&(t[\"page-middle\"]=K,e6(a,\"page-middle\")),!t[\"page-end\"]&&.99<=i.y&&(t[\"page-end\"]=K,e6(a,\"page-end\")),(n=tH(a,e=>B({type:\"scroll\",scrollType:e,offset:i}))).length)&&e(n)})}},{id:\"cart\",setup:e=>({processCommand(t){var r;return aC(t)?(\"clear\"===(r=t.cart)?e({type:\"cart_updated\",action:\"clear\"}):(r=aS(r))&&e({...r,type:\"cart_updated\"}),K):aP(t)?(e({type:\"order\",...t.order}),K):H}})},{id:\"forms\",setup(e){var t,r=new Map,n=(e,t=!1)=>{var r=!t||ne(e,nm(\"form-value\")),e=(t&&(r=r?en(r):\"checkbox\"===e.type),e.selectedOptions?[...e.selectedOptions].map(e=>e.value).join(\",\"):\"checkbox\"===e.type?e.checked?\"true\":\"false\":e.value);return t&&(e=e&&tp(e,200)),r?e:void 0},i=t=>{var i,l,s,a=t.form;if(a)return l=ne(a,nm(\"ref\"))||\"track_ref\",(s=t7(r,a,()=>{var t,r=new Map,n={type:\"form\",name:ne(a,nm(\"form-name\"))||r7(a,\"name\")||a.id||void 0,activeTime:0,totalTime:0,fields:{}},l=(e.events.post(n),e.events.registerEventPatchSource(n,()=>({...n,timeOffset:ap()})),()=>{1!==t[3]&&(o(),2<=t[3]&&(n.completed=3===t[3]||!(a.isConnected&&nv(a).width)),e.events.postPatch(n,{...i,completed:n.completed,totalTime:e9(K)-t[4]}),t[3]=1)}),s=((e=0)=>{var t,r,n=(i,a=e)=>{if(void 0===i)return!!r;clearTimeout(t),er(i)?i&&(a<0?ei:J)(null==r?void 0:r())?n(r,a):r=void 0:(r=i,t=setTimeout(()=>n(!0,a),a<0?-a:a))};return n})();return nc(a.ownerDocument.body,\"submit\",e=>{var r,n;i=aE(a),t[3]=3,e.defaultPrevented?([r]=ia(e=>{e||(n?n5(\"The browser is navigating to another page after submit leaving a reCAPTCHA challenge. \"+tf(\"Form not submitted\",1)):3===t[3]?(n5(\"The browser is navigating to another page after submit. \"+tf(\"Form submitted\",1)),l()):n5(\"The browser is navigating to another page after submit, but submit was earlier cancelled because of validation errors. \"+tf(\"Form not submitted.\",1)),r())}),n=!1,s(()=>{if((()=>{for(var e=a.ownerDocument;e;){if(((e,t)=>!0===tV(e,(r,n,i)=>t(r)?tq=!0:r))(e.querySelectorAll(\"iframe\"),e=>e.src.match(RegExp(\"https:\\\\/\\\\/www.google.com\\\\/.*(?<=\\\\/)recaptcha\\\\/.*(?<=\\\\/)bframe\",\"gi\"))&&(e=>{if(!e||!e.isConnected||nv(e,!1).width<=0)return!1;for(;e;){var t=null==(t=e.ownerDocument.defaultView)?void 0:t.getComputedStyle(e);if(\"hidden\"===t.visibility||\"0\"===t.opacity)return!1;e=e.parentElement}return!0})(e)))return!0;e=z(()=>{var r;return null==(r=e.defaultView)||null==(r=r.frameElement)?void 0:r.ownerDocument},()=>{})}return!1})())return t[3]=2,n5(\"reCAPTCHA challenge is active.\"),n=!0;n&&(n=!1,n5(\"reCAPTCHA challenge ended (for better or worse).\"),t[3]=3),a.isConnected&&0<nv(a).width?(t[3]=2,n5(\"Form is still visible after 1750 ms, validation errors assumed. \"+tf(\"Form not submitted\",1))):(n5(\"Form is no longer visible 1750 ms after submit. \"+tf(\"Form submitted\",1)),l()),r()},1750)):(n5(\"Submit event triggered and default not prevented. \"+tf(\"Form submitted\",1)),l())},{capture:!1}),t=[n,r,a,0,e9(K),1]}))[1].get(t)||tV(a.querySelectorAll(\"INPUT,SELECT,TEXTAREA,BUTTON\"),(e,t)=>{var d,v,a;\"BUTTON\"===e.tagName&&\"submit\"!==e.type||(e.name&&\"hidden\"!==e.type?(a=null!=(d=(a=s[0].fields)[v=e.name])?d:a[v]={id:e.id||v,name:v,label:t_(null!=(v=null==(d=e.labels)||null==(a=d[0])?void 0:a.innerText)?v:e.name,/^\\s*(.*?)\\s*\\*?\\s*$/g,\"$1\"),activeTime:0,totalTime:0,type:null!=(d=e.type)?d:\"unknown\",[aN]:n(e),value:n(e,!0)},s[0].fields[a.name]=a,s[1].set(e,a)):\"hidden\"!==e.type||e.name!==l&&!nA(e,\"ref\")||(e.value||(e.value=t_(\"10000000-1000-4000-8000-100000000000\",/[018]/g,e=>((e*=1)^(e=>crypto.getRandomValues(e))(new Uint8Array(1))[0]&15>>e/4).toString(16))),s[0].ref=e.value))}),[t,s]},a=(e,[r,n]=null!=(t=i(e))?t:[],a=null==n?void 0:n[1].get(r))=>a&&[n[0],a,r,n],l=null,o=()=>{var r,i,a,o,d,v,c;l&&([r,i,a,o]=l,d=-(u-(u=au())),v=-(s-(s=e9(K))),c=i[aN],(i[aN]=n(a))!==c&&(null==i.fillOrder&&(i.fillOrder=o[5]++),i.filled&&(i.corrections=(null!=(c=i.corrections)?c:0)+1),i.filled=K,o[3]=2,tV(r.fields,([e,t])=>t.lastField=e===i.name)),i.value=n(a,!0),i.activeTime+=d,i.totalTime+=v,r.activeTime+=d,r.totalTime+=v,l=null)},u=0,s=0,d=e=>e&&nc(e,[\"focusin\",\"focusout\",\"change\"],(e,t,r=e.target&&a(e.target))=>r&&(l=r,\"focusin\"===e.type?(s=e9(K),u=au()):o()));d(document),ay(e=>e.contentDocument&&d(e.contentDocument),!0)}},{id:\"consent\",setup(e){var t,n=async t=>e.variables.get({scope:\"session\",key:\"@consent\",poll:t,refresh:!0}).value(),i=async t=>{var r;if(t)return!(r=await n())||rm.equals(r,t)?[!1,r]:(await e.events.post(B({type:\"consent\",consent:t}),{async:!1,variables:{get:[{scope:\"session\",key:\"@consent\"}]}}),[!0,t])},r={analytics_storage:\"performance\",functionality_storage:\"functionality\",personalization_storage:\"personalization\",ad_storage:\"marketing\",security_storage:\"security\"},a=(e({consent:{externalSource:{key:\"Google Consent Mode v2\",frequency:250,poll(){var e,n=r2.dataLayer,i=t,a=null==n?void 0:n.length;if(a&&(t!==(t=n[a-1])||!t))for(;a--&&((e=n[a])!==i||!i);){var l={},o=!0;if(\"consent\"===(null==e?void 0:e[0])&&\"update\"===e[1])return tH(r,([t,r])=>\"granted\"===e[2][t]&&(l[r]=!0,o=o&&(\"security\"===r||\"necessary\"===r))),{classification:o?\"anonymous\":\"direct\",purposes:l}}}}}}),{});return{processCommand(e){var r,l,t,s,d;return aJ(e)?((t=e.consent.get)&&n(t),(r=e.consent.set)&&(async()=>{var e;return(null!=(e=r.callback)?e:()=>{})(...await i(r))})(),(l=e.consent.externalSource)&&(d=l.key,(null!=(t=a[d])?t:a[d]=tt({frequency:null!=(e=l.frequency)?e:1e3})).restart(l.frequency,async()=>{var e,t,r;r5.hasFocus()&&(e=l.poll(s))&&!rm.equals(s,e)&&([t,r]=await i(e),t&&n5(r,\"Consent was updated from \"+d),s=e)}).trigger()),K):H}}}}],I=(...e)=>t=>t===e[0]||e.some(e=>\"string\"==typeof e&&void 0!==(null==t?void 0:t[e])),aC=I(\"cart\"),a_=I(\"username\"),aj=I(\"tagAttributes\"),aF=I(\"disable\"),aU=I(\"boundary\"),aM=I(\"extension\"),aq=I(K,\"flush\"),az=I(\"get\"),aR=I(\"listener\"),aP=I(\"order\"),aD=I(\"scan\"),aB=I(\"set\"),aW=e=>\"function\"==typeof e,aJ=I(\"consent\");Object.defineProperty(r2,\".tail.js.init\",{writable:!1,configurable:!1,value(e){e(an)}})})();\n//# sourceMappingURL=tail.debug.js.map\n"
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

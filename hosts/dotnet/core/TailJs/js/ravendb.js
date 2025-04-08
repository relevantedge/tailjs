import { VariableServerScope, extractKey, VariableResultStatus } from '@tailjs/types';

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
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
const withRetry = async (action, { retries = 3, retryDelay = 200, errorFilter, errorHandler } = {})=>{
    if (retries <= 0) {
        retries = 1;
    }
    let previousError = undefined;
    for(let i = 0; i < retries; i++){
        try {
            return await action(i, previousError);
        } catch (error) {
            previousError = error;
            const filterAction = i === retries - 1 ? "throw" : errorFilter === null || errorFilter === void 0 ? void 0 : errorFilter(error, i);
            if (filterAction === "throw") {
                if (errorHandler) {
                    return await errorHandler(error, i);
                }
                throw error;
            } else {
                await delay(typeof retryDelay === "function" ? retryDelay(i + 1) : retryDelay * (0.8 + 0.4 * Math.random()));
                if (filterAction === "reset") {
                    i = -1;
                    previousError = undefined;
                }
            }
        }
    }
    return void 0;
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolAsyncIterator = Symbol.asyncIterator;
const isBoolean = (value)=>typeof value === "boolean";
const isString = (value)=>typeof value === "string";
const isFunction = /*#__PURE__*/ (value)=>typeof value === "function";
const unwrap = (value)=>isFunction(value) ? value() : value;
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
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
        _define_property$3(this, "_promise", void 0);
        this.reset();
    }
}
class OpenPromise {
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
    }
    constructor(){
        _define_property$3(this, "_promise", void 0);
        _define_property$3(this, "resolve", void 0);
        _define_property$3(this, "reject", void 0);
        _define_property$3(this, "value", void 0);
        _define_property$3(this, "error", void 0);
        _define_property$3(this, "pending", true);
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
let map2 = (source, projection, target = [], seed, context = source)=>{
    try {
        return !source && source !== 0 && source !== "" ? source == null ? source : undefined : source[forEachSymbol](source, projection, target, seed, context);
    } catch (e) {
        return ensureForEachImplementations(source, e, ()=>map2(source, projection, target, seed, context));
    }
};
const batch2 = (source, batchSize)=>{
    if (source == null) return source;
    const batches = [];
    let batch = [];
    for (const item of source){
        batch.push(item);
        if (batch.length === batchSize) {
            batches.push(batch);
            batch = [];
        }
    }
    if (batch.length > 0) {
        batches.push(batch);
    }
    return batches;
};
const stringify2 = JSON.stringify;
const json2 = (value)=>value == null || value === "" ? undefined : typeof value === "object" ? value : JSON.parse(value + "");

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
class RavenDbTarget {
    async initialize(env) {
        this._env = env;
        if (this._settings.x509) {
            const cert = "cert" in this._settings.x509 ? this._settings.x509.cert : await this._env.read(this._settings.x509.certPath);
            var _ref;
            const key = "keyPath" in this._settings.x509 ? (_ref = await this._env.readText(this._settings.x509.keyPath)) !== null && _ref !== void 0 ? _ref : undefined : this._settings.x509.key;
            if (!cert) {
                throw new Error("Certificate not found.");
            }
            this._cert = {
                id: this.id,
                cert,
                key
            };
        }
    }
    async _request(method, relativeUrl, body, headers) {
        var _this__settings_maxRetries;
        const maxRetries = Math.max(1, (_this__settings_maxRetries = this._settings.maxRetries) !== null && _this__settings_maxRetries !== void 0 ? _this__settings_maxRetries : 5);
        var _this__settings_retryDelay;
        const retryDelay = Math.max(200, (_this__settings_retryDelay = this._settings.retryDelay) !== null && _this__settings_retryDelay !== void 0 ? _this__settings_retryDelay : 200);
        const url = `${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/${relativeUrl}`;
        const request = {
            method,
            url,
            headers: {
                ["content-type"]: "application/json",
                ...headers
            },
            x509: this._cert,
            body: body && (typeof body === "string" ? body : JSON.stringify(body))
        };
        return withRetry(async ()=>{
            const response = await this._env.request(request);
            if (response.status === 500) {
                const body = json2(response.body);
                response.error = new Error((body === null || body === void 0 ? void 0 : body.Type) ? `${body.Type}: ${body.Message}` : "(unspecified error)");
            }
            return response;
        }, {
            retries: maxRetries,
            retryDelay,
            errorFilter: (error, retry)=>{
                this._env.log(this, {
                    level: "error",
                    message: `Request to RavenDB failed on attempt ${retry + 1}.`,
                    error
                });
            },
            errorHandler: (error)=>{
                return {
                    request,
                    status: 500,
                    headers: {},
                    cookies: {},
                    body: stringify2({
                        Message: formatError(error, true)
                    }),
                    error
                };
            }
        });
    }
    constructor(settings){
        _define_property$2(this, "_settings", void 0);
        _define_property$2(this, "_env", void 0);
        _define_property$2(this, "_cert", void 0);
        this._settings = settings;
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
/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */ class RavenDbExtension extends RavenDbTarget {
    patchStorageMappings(mappings) {
        if (!this._storageScopes) return;
        const variableStorage = new RavenDbVariableStorage(this._settings);
        for (const scope of this._storageScopes){
            var _mappings, _scope, _ref;
            var _, _storage;
            (_storage = (_ref = (_ = (_mappings = mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _mappings[_scope] = {}).storage) !== null && _storage !== void 0 ? _storage : _ref.storage = variableStorage;
        }
    }
    async post({ events }, tracker) {
        try {
            const commands = [];
            for (let ev of events){
                commands.push({
                    Type: "PUT",
                    Id: `events/${ev.id}`,
                    Document: {
                        ...ev,
                        "@metadata": {
                            "@collection": "events"
                        }
                    }
                });
            }
            await this._request("POST", "bulk_docs", {
                Commands: commands
            });
        } catch (e) {
            tracker.env.error(this, e);
        }
    }
    async _getNextId() {
        let id = ++this._nextId;
        if (id >= this._idRangeMax) {
            const lockHandle = await this._lock();
            try {
                id = ++this._nextId;
                if (id >= this._idRangeMax) {
                    let idMax = this._idRangeMax + this._idBatchSize;
                    for(let i = 0; i <= 100; i++){
                        const response = (await this._request("PUT", `cmpxchg?key=NextEventId&index=${this._idIndex}`, {
                            Object: idMax
                        })).body;
                        const result = JSON.parse(response);
                        const success = result.Successful;
                        if (typeof success !== "boolean") {
                            throw new Error(`Unexpected response: ${response}`);
                        }
                        const index = result.Index;
                        const value = result.Value.Object;
                        this._idIndex = index;
                        if (success) {
                            this._idRangeMax = value;
                            this._nextId = this._idRangeMax - this._idBatchSize - 1;
                            break;
                        }
                        if (i >= 10) {
                            throw new Error(`Unable to allocate event IDs. Current counter is ${value}@${index}`);
                        }
                        idMax = value + this._idBatchSize;
                        this._env.debug(this, `The server reported the next global ID to be ${value}. Retrying with next ID ${idMax}.`);
                    }
                    id = ++this._nextId;
                }
            } catch (error) {
                this._env.log(this, {
                    level: "error",
                    message: "Generating the next sequence of IDs failed.",
                    error
                });
                throw error;
            } finally{
                lockHandle();
            }
        }
        return id.toString(36);
    }
    constructor({ variables = true, ...settings }){
        super(settings), _define_property$1(this, "id", "ravendb"), _define_property$1(this, "_lock", void 0), _define_property$1(this, "_storageScopes", void 0), _define_property$1(this, "_nextId", 0), _define_property$1(this, "_idIndex", 1), _define_property$1(this, "_idRangeMax", 0), _define_property$1(this, "_idBatchSize", 1000);
        if (variables) {
            this._storageScopes = variables === true ? VariableServerScope.levels : variables;
            if (!this._storageScopes.length) {
                this._storageScopes = undefined;
            }
        }
        this._lock = createLock();
    }
}
/** @obsolete Use the name RavenDbExtension instead. */ const RavenDbTracker = RavenDbExtension;

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
const UpdateExpiresScript = `this.ttl ? (this["@metadata"]["@expires"]=new Date(Date.now()+this.ttl).toISOString()) : delete this["@metadata"]["@expires"];`;
class RavenDbVariableStorage extends RavenDbTarget {
    async initialize(env) {
        await super.initialize(env);
        if (this._cleanExpiredFrequency) {
            const response = await this._request("POST", `admin/expiration/config`, {
                Disabled: false,
                DeleteFrequencyInSec: this._cleanExpiredFrequency
            });
            if (response.error) {
                env.log(this, {
                    level: "error",
                    message: "Cannot configure document expiration in RavenDB.",
                    error: response.error
                });
            }
        }
    }
    async get(keys) {
        const results = [];
        for (const batch of batch2(keys, 100)){
            const response = await this._request("GET", `docs?${batch.map((key)=>`id=${keyToDocumentId(key)}`).join("&")}`);
            const timestamp = now();
            const body = json2(response.body);
            const batchResults = body === null || body === void 0 ? void 0 : body.Results;
            let i = 0;
            for (const _ of batch){
                const result = mapDocumentResult(response.status, batchResults === null || batchResults === void 0 ? void 0 : batchResults[i++], timestamp);
                results.push(result.status === 200 ? mapVariableResult(200, result) : result.status === 404 ? mapNotFoundResult(batch[i]) : mapErrorResult(batch[i], result));
            }
        }
        return results;
    }
    async set(setters) {
        const timestamp = now();
        const requests = setters.map((setter)=>async ()=>{
                const createOperation = !setter.version;
                // An operation can be both create and update if the `force` flag is set.
                const updateOperation = setter.version || setter.force;
                const deleteOperation = setter.value == null;
                const version = setter.force || !setter.version && setter.value != null ? undefined : setter.version || "";
                const ttl = setter.ttl;
                const href = `docs?id=${encodeURIComponent(keyToDocumentId(setter))}`;
                const patchOptions = {
                    Script: `Object.assign(this, $values); (this["@metadata"] || (this["@metadata"]={}))["@collection"]=$collection;${UpdateExpiresScript}`,
                    Values: {
                        values: {
                            modified: timestamp,
                            ...extractKey(setter),
                            ttl,
                            expires: ttl > 0 ? timestamp + ttl : undefined,
                            value: setter.value
                        },
                        collection: setter.scope
                    }
                };
                let response = deleteOperation ? await this._request("DELETE", href, undefined, {
                    "If-Match": JSON.stringify(version)
                }) : await this._request("PATCH", href, {
                    Patch: updateOperation ? patchOptions : {
                        // Handle the case where an document has expired by local timestamp logic
                        // but not been deleted by RavenDB's background process. ($values.modified is our local timestamp)
                        Script: `if(this.expires <= $values.modified){${patchOptions.Script}}`,
                        Values: {
                            created: timestamp,
                            ...patchOptions.Values
                        }
                    },
                    PatchIfMissing: createOperation ? {
                        ...patchOptions,
                        Values: {
                            created: timestamp,
                            ...patchOptions.Values
                        }
                    } : undefined
                }, {
                    "If-Match": JSON.stringify(version)
                });
                let body = json2(response.body);
                let result = mapDocumentResult(response.status, body === null || body === void 0 ? void 0 : body.ModifiedDocument, timestamp, body);
                if (result.status === 404) {
                    return mapNotFoundResult(setter);
                } else if (result.status === 500) {
                    return mapErrorResult(setter, result);
                } else if (result.status === 204) {
                    return deleteOperation ? mapDeleteResult(setter) : mapErrorResult(setter, result);
                }
                if (// Update and delete: Normal conflict response.
                result.status === 409 || // Create: These requests cannot have an If-Modified header, but instead an empty Patch script
                // so if no patch was made it means the document already exists. (that is, conflict).
                createOperation && result.body.Status === "NotModified") {
                    var _body_Results;
                    // Get current version of the variable.
                    response = await this._request("GET", href);
                    body = json2(response.body);
                    result = mapDocumentResult(response.status, body === null || body === void 0 ? void 0 : (_body_Results = body.Results) === null || _body_Results === void 0 ? void 0 : _body_Results[0], timestamp);
                    if (// RavenDB returns status 404 for get requests when exactly one document is requested,
                    // so in this case we can count on it. Otherwise it's always 200.
                    result.status === 404) {
                        // The variable has disappeared (race condition).
                        return mapNotFoundResult(setter);
                    }
                    // We have the current version of the variable to include in the conflict response.
                    if (result.status === 200) {
                        return mapVariableResult(VariableResultStatus.Conflict, result);
                    }
                    return mapErrorResult(setter, result);
                }
                if (result.status === 200 || result.status === 201) {
                    return mapVariableResult(createOperation && !updateOperation ? 201 : result.status, result);
                }
                return mapErrorResult(setter, result);
            });
        const results = [];
        for (const batch of batch2(requests, 100)){
            results.push(...await Promise.all(batch.map((request)=>request())));
        }
        return results;
    }
    async purge(queries) {
        const queryParts = queries.map((query)=>queryToRql(query));
        for (const part of queryParts){
            const response = await this._request("DELETE", "queries", part);
            if (response.error) {
                throw response.error;
            }
        }
        return undefined;
    }
    async renew(queries) {
        const timestamp = now();
        const queryParts = queries.map((query)=>queryToRql(query, {
                fixed: [
                    "ttl != null"
                ],
                append: `update { if(this.ttl != null){this.expires = $now + this.ttl;}${UpdateExpiresScript} }`
            }));
        for (const query of queryParts){
            if (!query) continue;
            const response = await this._request("PATCH", "queries", {
                Query: {
                    Query: query.Query,
                    QueryParameters: {
                        ...query.QueryParameters,
                        now: timestamp
                    }
                }
            });
            if (response.error) {
                throw response.error;
            }
        }
        return undefined;
    }
    async query(queries, { page, cursor } = {}) {
        if (page <= 0) {
            return {
                variables: []
            };
        }
        const timestamp = now();
        const variables = [];
        const match = cursor === null || cursor === void 0 ? void 0 : cursor.match(/^(\d+)(?::(.*))?$/);
        let offset = match ? +match[1] : 0;
        let skipId = (match === null || match === void 0 ? void 0 : match[2]) || undefined;
        cursor = undefined;
        let i = 0;
        main: for (const query of queries){
            if (i++ < offset) {
                continue;
            }
            const rql = queryToRql(query, {
                fixed: i - 1 === offset && skipId ? [
                    `id() > ${stringify2(skipId)}`
                ] : undefined,
                append: page ? `order by id() limit ${page}` : undefined
            });
            if (!rql) continue;
            const response = await this._request("POST", "queries", rql);
            if (response.error) {
                throw response.error;
            }
            const json = json2(response.body);
            var _json_Results;
            for (const result of (_json_Results = json === null || json === void 0 ? void 0 : json.Results) !== null && _json_Results !== void 0 ? _json_Results : []){
                const variable = mapDocumentResult(200, result, timestamp).document;
                if (variable) {
                    variables.push(variable);
                    if (page && variables.length >= page) {
                        cursor = `${offset}:${keyToDocumentId(variable)}`;
                        break main;
                    }
                }
            }
        }
        return {
            variables,
            cursor
        };
    }
    constructor({ cleanExpiredFrequency = 60, ...settings }){
        super(settings), _define_property(this, "id", "ravendb-variables"), _define_property(this, "_cleanExpiredFrequency", void 0);
        this._cleanExpiredFrequency = cleanExpiredFrequency && cleanExpiredFrequency > 0 ? cleanExpiredFrequency : undefined;
    }
}
const keyToDocumentId = (key)=>`${key.scope}/${key.entityId}/${key.key}`;
const mapErrorResult = (key, result)=>{
    var _result_body;
    return {
        ...extractKey(key),
        status: VariableResultStatus.Error,
        error: result.status >= 500 ? ((_result_body = result.body) === null || _result_body === void 0 ? void 0 : _result_body.Type) || result.body.Message ? `${result.body.Type ? result.body.Type + ": " : ""}${result.body.Message}` : "(unspecified error)" : `Unexpected response (status ${result.status}): ${result.body}.`
    };
};
const mapNotFoundResult = (key)=>({
        status: VariableResultStatus.NotFound,
        ...extractKey(key)
    });
const mapDeleteResult = (key)=>({
        status: VariableResultStatus.Success,
        ...extractKey(key)
    });
const mapVariableResult = (status, { document: { scope, entityId, key, created, modified, ttl, expires, value, version } })=>({
        status,
        scope,
        entityId,
        key,
        created,
        modified,
        ttl,
        expires,
        value,
        version
    });
const mapDocumentResult = (status, document, timestamp, body)=>{
    var _document_metadata;
    if (status === 204 || status === 404 || status === 409 || status === 500) {
        return {
            status,
            body
        };
    } else if (!document) {
        return status === 200 || status === 201 ? {
            status: 404,
            body
        } : {
            status: 500,
            body: {
                Message: `Unsupported status code: ${status}`
            }
        };
    }
    if (document.expires - timestamp <= 0) {
        // We do not base our TTL calculations of Raven's dates.
        return {
            status: 404,
            body
        };
    }
    const { scope, entityId, key, created, modified, ttl, expires, value } = document;
    var _body_ChangeVector;
    return {
        status: status,
        body,
        document: {
            scope,
            entityId,
            key,
            created,
            modified,
            ttl,
            expires,
            value,
            version: (_body_ChangeVector = body === null || body === void 0 ? void 0 : body.ChangeVector) !== null && _body_ChangeVector !== void 0 ? _body_ChangeVector : (_document_metadata = document["@metadata"]) === null || _document_metadata === void 0 ? void 0 : _document_metadata["@change-vector"]
        }
    };
};
const queryToRql = (query, { fixed, ifEmpty, append } = {})=>{
    let where = fixed ? [
        ...fixed
    ] : [];
    const { entityIds, keys } = query;
    if (entityIds) {
        if (!entityIds.length) {
            return null;
        }
        if ((keys === null || keys === void 0 ? void 0 : keys.exclude) != false) {
            // Document ID prefixes unless we have specific keys (because those map to specific document IDs).
            const filters = `${entityIds.map((entityId)=>`startsWith(id(),${stringify2(keyToDocumentId({
                    scope: query.scope,
                    entityId,
                    key: ""
                }))})`).join(" or ")}`;
            where.push(entityIds.length > 1 ? `(${filters})` : filters);
        }
        if (keys) {
            // Specific document IDs must match (or not match).
            const comparer = keys.exclude ? "!=" : "==";
            const keyFilter = entityIds.flatMap((entityId)=>map2(keys.values, (key)=>`id() ${comparer} ${stringify2(keyToDocumentId({
                        scope: query.scope,
                        entityId,
                        key
                    }))}`));
            if (keyFilter.length) {
                where.push(keyFilter.length === 1 ? keyFilter[0] : `(${keyFilter.join(" or ")})`);
            } else if (!keys.exclude) {
                // No keys
                return null;
            }
        }
    } else if (keys) {
        const comparer = keys.exclude ? "!=" : "==";
        const keyFilter = map2(keys.values, (key)=>`key ${comparer} ${stringify2(key)}`).join(" or ");
        if (keyFilter) {
            where.push(`exact(${keyFilter})`);
        } else if (!keys.exclude) {
            return null;
        }
    }
    if (!where.length && (ifEmpty === null || ifEmpty === void 0 ? void 0 : ifEmpty.length)) {
        where = ifEmpty;
    }
    return {
        Query: `from ${query.scope}${where.length ? ` where ${where.join(" and ")}` : ""}${append ? ` ${append}` : ""}`,
        QueryParameters: {}
    };
};

export { RavenDbExtension, RavenDbTracker, RavenDbVariableStorage };

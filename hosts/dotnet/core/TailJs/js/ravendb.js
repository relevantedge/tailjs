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
class RavenDbConfiguration {
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
    async request(method, operation, payload) {
        if (operation[0] !== "/") {
            operation = "/" + operation;
        }
        const response = (await this._env.request({
            method: method,
            url: `${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/${operation}`,
            headers: {
                ["content-type"]: "application/json"
            },
            body: JSON.stringify(payload),
            x509: this._cert
        })).body;
        return JSON.parse(response);
    }
    constructor(id, settings){
        _define_property$4(this, "_env", void 0);
        _define_property$4(this, "_cert", void 0);
        _define_property$4(this, "_settings", void 0);
        _define_property$4(this, "id", void 0);
        this.id = id;
        this._settings = settings;
    }
}

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
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
    _request(method, relativeUrl, body) {
        return this._env.request({
            method,
            url: `${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/${relativeUrl}`,
            headers: {
                ["content-type"]: "application/json"
            },
            x509: this._cert,
            body: typeof body === "string" ? body : JSON.stringify(body)
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
 */ class RavenDbTracker extends RavenDbTarget {
    registerTypes(schema) {
        schema.registerSchema({
            namespace: "urn:tailjs:ravendb",
            variables: {
                session: {
                    rdb: {
                        classification: "anonymous",
                        purposes: {},
                        visibility: "trusted-only",
                        properties: {
                            sessionId: {
                                primitive: "string"
                            },
                            deviceSessionId: {
                                primitive: "string"
                            },
                            internalSessionId: {
                                primitive: "string"
                            },
                            internalDeviceSessionId: {
                                primitive: "string"
                            }
                        }
                    }
                }
            }
        });
    }
    async post(events, tracker) {
        if (!tracker.session) {
            return;
        }
        try {
            const commands = [];
            // We add a convenient integer keys to the session, device session and event entities to get efficient primary keys
            // when doing ETL on the data.
            let ids = await tracker.get({
                scope: "session",
                key: "rdb"
            }).value();
            var hasChanges = false;
            if (tracker.sessionId && (ids === null || ids === void 0 ? void 0 : ids.sessionId) !== tracker.sessionId) {
                (ids !== null && ids !== void 0 ? ids : ids = {}).internalSessionId = await this._getNextId();
                ids.sessionId = tracker.sessionId;
                hasChanges = true;
            }
            if (tracker.deviceSessionId && (ids === null || ids === void 0 ? void 0 : ids.deviceSessionId) !== tracker.deviceSessionId) {
                (ids !== null && ids !== void 0 ? ids : ids = {}).internalDeviceSessionId = await this._getNextId();
                ids.deviceSessionId = tracker.deviceSessionId;
                hasChanges = true;
            }
            if (!tracker.sessionId && !tracker.deviceSessionId) {
                ids = undefined;
                hasChanges = true;
            }
            if (hasChanges) {
                // Session and/or device session ID changed.
                await tracker.set({
                    scope: "session",
                    key: "rdb",
                    patch: ()=>ids
                });
            }
            for (let ev of events){
                ev = {
                    ...ev
                };
                // Integer primary key for the event entity.
                const internalEventId = await this._getNextId();
                ev["rdb:sessionId"] = ids === null || ids === void 0 ? void 0 : ids.internalSessionId;
                ev["rdb:deviceSessionId"] = ids === null || ids === void 0 ? void 0 : ids.internalDeviceSessionId;
                commands.push({
                    Type: "PUT",
                    Id: `events/${internalEventId}`,
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
                    group: this.id,
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
    constructor(settings){
        super(settings);
        _define_property$1(this, "id", "ravendb");
        _define_property$1(this, "_lock", void 0);
        _define_property$1(this, "_nextId", 0);
        _define_property$1(this, "_idIndex", 1);
        _define_property$1(this, "_idRangeMax", 0);
        _define_property$1(this, "_idBatchSize", 1000);
        this._lock = createLock();
    }
}

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
class RavenDbVariableStorage extends RavenDbTarget {
    async set(setters) {
        throw new Error("Method not implemented.");
    // const responses = JSON.parse(
    //   (
    //     await this._request("POST", "bulk_docs", {
    //       Commands: setters.map((setter) =>
    //         setter.value != null
    //           ? {
    //               Type: "PUT",
    //               Id: mapDocumentId(setter),
    //               ChangeVector: setter.version,
    //               Document: {
    //                 ...setter.value,
    //                 "@metadata": {
    //                   "@collection": "variables",
    //                 },
    //               },
    //             }
    //           : {
    //               Type: "DELETE",
    //               ChangeVector: setter.version,
    //               Id: mapDocumentId(setter),
    //             }
    //       ),
    //     })
    //   ).body
    // ).Results as any[];
    // const pendingGetters: VariableValueSetter[] = [];
    // for (const response of responses) {
    // }
    }
    purge(queries) {
        throw new Error("Method not implemented.");
    }
    refresh(queries) {
        throw new Error("Method not implemented.");
    }
    get(keys) {
        throw new Error("Method not implemented.");
    }
    query(queries, options) {
        throw new Error("Method not implemented.");
    }
    constructor(...args){
        super(...args);
        _define_property(this, "id", "ravendb-variables");
    }
} // export class RavenDbVariableStorage implements VariableStorage {
 //   private readonly _settings: RavenDbSettings;
 //   constructor(settings: RavenDbSettings) {
 //     this._settings = settings;
 //   }
 //   renew(
 //     scope: ServerVariableScope,
 //     targetIds: string[],
 //     context?: VariableStorageContext
 //   ): MaybePromise<void> {
 //     throw new Error("Method not implemented.");
 //   }
 //   set<V extends VariableSetters<true>>(
 //     variables: VariableSetters<true, V>,
 //     context?: VariableStorageContext
 //   ): MaybePromise<VariableSetResults<V>> {
 //     throw new Error("Method not implemented.");
 //   }
 //   purge(
 //     filters: VariableFilter<true>[],
 //     context?: VariableStorageContext
 //   ): MaybePromise<boolean> {
 //     throw new Error("Method not implemented.");
 //   }
 //   initialize?(environment: TrackerEnvironment): MaybePromise<void> {
 //     throw new Error("Method not implemented.");
 //   }
 //   get<K extends VariableGetters<true>>(
 //     keys: VariableGetters<true, K>,
 //     context?: VariableStorageContext
 //   ): MaybePromise<VariableGetResults<K>> {
 //     throw new Error("Method not implemented.");
 //   }
 //   head(
 //     filters: VariableFilter<true>[],
 //     options?: VariableQueryOptions<true>,
 //     context?: VariableStorageContext
 //   ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
 //     throw new Error("Method not implemented.");
 //   }
 //   query(
 //     filters: VariableFilter<true>[],
 //     options?: VariableQueryOptions<true>,
 //     context?: VariableStorageContext
 //   ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
 //     throw new Error("Method not implemented.");
 //   }
 // }

export { RavenDbConfiguration, RavenDbTracker, RavenDbVariableStorage };

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const tryCatchAsync = async (expression, errorHandler = true, always)=>{
    try {
        const result = await unwrap(expression);
        return isArray(errorHandler) ? errorHandler[0]?.(result) : result;
    } catch (e) {
        if (!isBoolean(errorHandler)) {
            if (isArray(errorHandler)) {
                if (!errorHandler[1]) throw e;
                return errorHandler[1](e);
            }
            const error = await errorHandler?.(e);
            if (error instanceof Error) throw error;
            return error;
        } else if (errorHandler) {
            throw e;
        } else {
            // `false` means "ignore".
            console.error(e);
        }
    } finally{
        await always?.();
    }
    return undefined;
};
/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Minify friendly version of `false`. */ const F = false;
/** Minify friendly version of `true`. */ const T = true;
const isBoolean = (value)=>typeof value === "boolean";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isFunction = (value)=>typeof value === "function";
const unwrap = (value)=>isFunction(value) ? value() : value;
let now = typeof performance !== "undefined" ? (round = T)=>round ? Math.trunc(now(F)) : performance.timeOrigin + performance.now() : Date.now;
class ResettablePromise {
    _promise;
    constructor(){
        this.reset();
    }
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
}
class OpenPromise {
    _promise;
    resolve;
    reject;
    value;
    error;
    pending = true;
    constructor(){
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
    then(onfulfilled, onrejected) {
        return this._promise.then(onfulfilled, onrejected);
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
        while(state && ownerId !== state[0] && (state[1] ?? 0) < now()){
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
                ownerId ?? true,
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

/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */ class RavenDbTracker {
    id = "ravendb";
    _settings;
    _lock;
    _env;
    _cert;
    constructor(settings){
        this._settings = settings;
        this._lock = createLock();
    }
    _nextId = 0;
    _idIndex = 1;
    _idRangeMax = 0;
    _idBatchSize = 1000;
    async initialize(env) {
        try {
            this._env = env;
            if (this._settings.x509) {
                const cert = "cert" in this._settings.x509 ? this._settings.x509.cert : await this._env.read(this._settings.x509.certPath);
                const key = "keyPath" in this._settings.x509 ? await this._env.readText(this._settings.x509.keyPath) ?? undefined : this._settings.x509.key;
                if (!cert) {
                    throw new Error("Certificate not found.");
                }
                this._cert = {
                    id: this.id,
                    cert,
                    key
                };
            }
        } catch (e) {
            env.log(this, {
                group: this.id,
                level: "error",
                source: `${this.id}:initialize`,
                message: "" + e
            });
        }
    }
    async post(events, tracker) {
        if (!tracker.session) {
            return;
        }
        try {
            const commands = [];
            // We add a convenient integer keys to the session, device session and event entities to get efficient primary keys
            // when doing ETL on the data.
            const ids = await tracker.get([
                {
                    scope: "session",
                    key: "rdb",
                    init: async ()=>({
                            classification: "anonymous",
                            purposes: "necessary",
                            value: {
                                source: [
                                    tracker.sessionId,
                                    tracker.deviceSessionId
                                ],
                                mapped: [
                                    await this._getNextId(),
                                    await this._getNextId()
                                ]
                            }
                        })
                }
            ]).value;
            var hasChanges = false;
            if (ids.source[0] !== tracker.sessionId) {
                ids.mapped[0] = await this._getNextId();
                hasChanges = true;
            }
            if (ids.source[1] !== tracker.deviceSessionId) {
                ids.mapped[1] = await this._getNextId();
                hasChanges = true;
            }
            if (hasChanges) {
                // Session and/or device session ID changed.
                await tracker.set([
                    {
                        scope: "session",
                        key: "rdb",
                        patch: (current)=>{
                            if (!current) return;
                            return {
                                ...current,
                                value: ids
                            };
                        }
                    }
                ]);
            }
            for (let ev of events){
                const session = ev.session;
                if (!session) {
                    continue;
                }
                // Integer primary key for the event entity.
                const internalEventId = await this._getNextId();
                ev["rdb:sessionId"] = ids.mapped[0];
                ev["rdb:deviceSessionId"] = ids.mapped[1];
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
            await this._env.request({
                method: "POST",
                url: `${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/bulk_docs`,
                headers: {
                    ["content-type"]: "application/json"
                },
                x509: this._cert,
                body: JSON.stringify({
                    Commands: commands
                })
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
                        const response = (await this._env.request({
                            method: "PUT",
                            url: `${this._settings.url}/databases/${encodeURIComponent(this._settings.database)}/cmpxchg?key=NextEventId&index=${this._idIndex}`,
                            headers: {
                                ["content-type"]: "application/json"
                            },
                            body: JSON.stringify({
                                Object: idMax
                            }),
                            x509: this._cert
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
            } catch (e) {
                this._env.log(this, {
                    group: this.id,
                    level: "error",
                    source: this.id,
                    message: "" + e
                });
            } finally{
                lockHandle();
            }
        }
        return id.toString(36);
    }
}

export { RavenDbTracker };

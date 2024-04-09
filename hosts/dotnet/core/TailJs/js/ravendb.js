const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const tryCatchAsync = async (expression, errorHandler = true, clean, retries = 1)=>{
    while(retries--){
        try {
            return await expression();
        } catch (e) {
            if (!isBoolean(errorHandler)) {
                const error = await errorHandler?.(e, !retries);
                if (error instanceof Error) throw error;
                return error;
            } else if (errorHandler && !retries) {
                throw e;
            } else {
                console.error(e);
            }
        } finally{
            clean?.();
        }
    }
    return undefined$1;
};
const isUndefined = (value)=>value === undefined$1;
const isDefined = (value)=>value !== undefined$1;
const isBoolean = (value)=>typeof value === "boolean";
const isInteger = Number.isSafeInteger;
const isNumber = (value)=>typeof value === "number";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const toArray = (value, clone = false)=>isUndefined(value) ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : [
        value
    ];
const isObject = (value, acceptIterables = false)=>value != null && typeof value === "object" && (acceptIterables || !value[symbolIterator]);
const isFunction = (value)=>typeof value === "function";
const isIterable = (value, acceptStrings = false)=>!!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));
const isAwaitable = (value)=>!!value?.then;
const throwError = (error, transform = (message)=>new TypeError(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};

let stopInvoked = false;
function* createFilteringIterator(source, action) {
    if (!source) return;
    let i = 0;
    for (let item of source){
        action && (item = action(item, i++));
        if (item !== undefined$1) {
            yield item;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createObjectIterator(source, action) {
    let i = 0;
    for(const key in source){
        let value = [
            key,
            source[key]
        ];
        action && (value = action(value, i++));
        if (value !== undefined$1) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset = 0) {
    while(length--)yield offset++;
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (isDefined(start)) yield start;
    while(maxIterations-- && isDefined(start = step(start))){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start ?? end) !== undefined$1 ? (start ??= 0, end ??= MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
const createIterator = (source, action, start, end)=>source == null ? [] : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? action : sliceAction(action, start, end)) : typeof source === "object" ? createObjectIterator(source, sliceAction(action, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), action);
const project = (source, projection, start, end)=>projection != null && !isFunction(projection) ? createIterator(source, undefined$1, projection, start) : createIterator(source, projection, start, end);
const map = (source, projection, start = undefined$1, end)=>{
    if (start === undefined$1 && isArray(source)) {
        let i = 0;
        const mapped = [];
        for(let j = 0, n = source.length; j < n && !stopInvoked; j++){
            let value = source[j];
            if (projection && value !== undefined$1) {
                value = projection(value, i++);
            }
            if (value !== undefined$1) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source !== undefined$1 ? toArray(project(source, projection, start, end)) : undefined$1;
};

const define = (target, ...args)=>{
    const add = (arg, defaults)=>{
        if (!arg) return;
        let properties;
        if (isArray(arg)) {
            if (isObject(arg[0])) {
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
                ...isObject(value) && ("get" in value || "value" in value) ? value : isFunction(value) && !value.length ? {
                    get: value
                } : {
                    value
                }
            }));
    };
    args.forEach((arg)=>add(arg));
    return target;
};
const unwrap = (value)=>isFunction(value) ? unwrap(value()) : isAwaitable(value) ? value.then((result)=>unwrap(result)) : value;

let now = ()=>typeof performance !== "undefined" ? Math.trunc(performance.timeOrigin + performance.now()) : Date.now();
const createTimer = (started = true)=>{
    let t0 = started && now();
    let elapsed = 0;
    return (toggle)=>{
        t0 && (elapsed += now() - t0);
        isDefined(toggle) && (t0 = toggle && now());
        return elapsed;
    };
};

class ResetablePromise {
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
                    this[i ? "error" : "value"] = !isDefined(value) || value;
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
const createLock = ()=>{
    const semaphore = promise(true);
    let currentLock;
    const t0 = createTimer();
    const wait = async (actionOrMs, ms)=>{
        if (isFunction(actionOrMs)) {
            const release = await wait(ms);
            return release ? await tryCatchAsync(actionOrMs, true, release) : undefined$1;
        }
        while(currentLock){
            if (isUndefined(await (actionOrMs ? race(delay(actionOrMs), semaphore) : semaphore))) {
                return undefined$1;
            }
            actionOrMs -= t0(); // If the above did not return undefined we got the semaphore.
        }
        return currentLock = ()=>semaphore.signal(!(currentLock = undefined$1));
    };
    return wait;
};
const delay = (ms, value)=>isUndefined(ms) || isInteger(ms) ? !ms || ms <= 0 ? unwrap(value) : new Promise((resolve)=>setTimeout(async ()=>resolve(await unwrap(value)), ms)) : throwError(`Invalid delay ${ms}.`);
const promise = (resetable)=>resetable ? new ResetablePromise() : new OpenPromise();
const race = (...args)=>Promise.race(args.map((arg)=>isFunction(arg) ? arg() : arg));

const createEnumAccessor = (sourceEnum, flags, enumName)=>{
    const names = Object.fromEntries(Object.entries(sourceEnum).filter(([key, value])=>isString(key) && isNumber(value)).map(([key, value])=>[
            key.toLowerCase(),
            value
        ]));
    const entries = Object.entries(names);
    const values = Object.values(names);
    const any = values.reduce((any, flag)=>any | flag, 0);
    const nameLookup = flags ? {
        ...names,
        any,
        none: 0
    } : names;
    const valueLookup = Object.fromEntries(entries.map(([key, value])=>[
            value,
            key
        ]));
    const parseValue = (value, validateNumbers)=>isString(value) ? nameLookup[value] ?? nameLookup[value.toLowerCase()] : isNumber(value) ? !flags && validateNumbers ? isDefined(valueLookup[value]) ? value : undefined$1 : value : undefined$1;
    const [tryParse, lookup] = flags ? [
        (value, validateNumbers)=>Array.isArray(value) ? value.reduce((flags, flag)=>(flag = parseValue(flag, validateNumbers)) == null ? flags : (flags ?? 0) | flag, undefined$1) : parseValue(value),
        (value, format)=>(value = tryParse(value, false)) == null ? undefined$1 : format && (value & any) === any ? "any" : (value = entries.filter(([, flag])=>value & flag).map(([name])=>name), format ? value.length ? value.length === 1 ? value[0] : value : "none" : value)
    ] : [
        parseValue,
        (value)=>(value = parseValue(value)) != null ? valueLookup[value] : undefined$1
    ];
    const throwError = (err)=>{
        throw err;
    };
    let originalValue;
    const parse = (value)=>value == null ? undefined$1 : (value = tryParse(originalValue = value)) == null ? throwError(new TypeError(`${JSON.stringify(originalValue)} is not a valid ${enumName} value.`)) : value;
    return define({}, [
        {
            enumerable: false
        },
        {
            parse,
            tryParse,
            entries,
            values,
            lookup,
            format: (value)=>lookup(value, true)
        },
        flags && {
            any,
            map: (flags, map)=>(flags = parse(flags), entries.filter(([, flag])=>flag & flags).map(map ?? (([, flag])=>flag)))
        }
    ]);
};

var DataClassification;
(function(DataClassification) {
    /**
   * The data cannot reasonably be linked to a specific user after the user leaves the website or app, and their session ends.
   *
   * Tail.js will collect this kind of data in a way that does not use cookies or rely on other information persisted in the user's device.
   *
   * Identifying returning visitors will not be possible at this level.
   * In-session personalization will be possible based on the actions a user has taken such as adding or removing things to a shopping basket, or reading an article.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */ DataClassification[DataClassification["Anonymous"] = 0] = "Anonymous";
    /**
   * The data may possibly identify the user if put into context with other data, yet not specifically on its own.
   *
   * Examples of data you should classify as at least indirect personal data are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
   *
   * Identifying returning visitors will be possible at this level of consent, but not across devices.
   * Some level of personalization to returning visitors will be possible without knowing their specific preferences with certainty.
   *
   * This level is the default when a user has consented to necessary infomration being collected via a  cookie discalimer or similar.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with its default settings, intended design or implementation.
   */ DataClassification[DataClassification["Indirect"] = 1] = "Indirect";
    /**
   * The data directly identifies the user on its own.
   *
   * Examples are name, username, street address and email address.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * Personalization based on past actions such as purchases will also be possible.
   *
   * This level is the default should be considered the default level if users are offered an option to create a user profile or link an existing user profile from an external identity provider (Google, GitHub, Microsoft etc.).
   *
   * Please note it is possible to access user data even when nothing is tracked beyond the bla... level
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */ DataClassification[DataClassification["Direct"] = 2] = "Direct";
    /**
   * Sensitive data about a user.
   *
   * Examples are data related to health, financial matters, race, political and religious views, and union membership.
   * If the user is given the option to consent at this level, it should be very clear, and you must make sure that all levels of your tail.js implementation and connected services meets the necessary levels of compliance for this in your infrastructure.
   *
   * Identifying returning visitors across devices will be possible at this level of consent.
   * and so will advanced personalization.
   *
   * As always, YOU (or client and/or employer) are responsible for the legality of the collection of data, its classification at any level of consent for any duration of time - not tail.js, even with default settings.
   */ DataClassification[DataClassification["Sensitive"] = 3] = "Sensitive";
})(DataClassification || (DataClassification = {}));
createEnumAccessor(DataClassification, false, "data classification");

var DataPurposes;
(function(DataPurposes) {
    /** Data without a purpose will not get stored and cannot be used for any reason. This can be used to disable parts of a schema. */ DataPurposes[DataPurposes["None"] = 0] = "None";
    /**
   * Data stored for this purpose is vital for the system, website or app to function.
   */ DataPurposes[DataPurposes["Necessary"] = 1] = "Necessary";
    /**
   * Data stored for this purpose is used for personalization or otherwise adjust the appearance of a website or app
   * according to a user's preferences.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposes.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */ DataPurposes[DataPurposes["Functionality"] = 2] = "Functionality";
    /**
   * Data stored for this purpose is used to gain insights on how users interact with a website or app optionally including
   * demographics and similar traits with the purpose of optimizing the website or app.
   *
   * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
   * of the website or app. Use {@link DataPurposes.Targeting} instead.
   *
   * It may be okay if the data is only used for different website and apps that relate to the same product or service.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   *
   */ DataPurposes[DataPurposes["Performance"] = 4] = "Performance";
    /**
   * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
   * or otherwise used to perform marketing outside the scope of the specific website or app.
   *
   * If the data is only used for different website and apps that relate to the same product or service, it might not be necessary
   * to use this category.
   * This would be the case if a user is able to use an app and website interchangably for the same service. Different areas of a brand may
   * also be distributed across multiple domain names.
   */ DataPurposes[DataPurposes["Targeting"] = 8] = "Targeting";
    /**
   * Data stored for this purpose is used for security purposes. As examples, this can both be data related to securing an authenticated user's session,
   * or for a website to guard itself against various kinds of attacks.
   */ DataPurposes[DataPurposes["Security"] = 16] = "Security";
    /**
   * Data stored for this purpose may be similar to the performance category, however it is specifically
   * only used for things such as health monitoring, system performance and error logging and unrelated to user behavior.
   */ DataPurposes[DataPurposes["Infrastructure"] = 32] = "Infrastructure";
    /**
   * Data can be used for any purpose.
   */ DataPurposes[DataPurposes["Any"] = 63] = "Any";
})(DataPurposes || (DataPurposes = {}));
createEnumAccessor(DataPurposes, true, "data purpose");
createEnumAccessor(DataPurposes, false, "data purpose");

var VariableScope;
(function(VariableScope) {
    VariableScope[VariableScope["Global"] = 0] = "Global";
    VariableScope[VariableScope["Session"] = 1] = "Session";
    VariableScope[VariableScope["Device"] = 2] = "Device";
    VariableScope[VariableScope["User"] = 3] = "User";
    VariableScope[VariableScope["Entity"] = 4] = "Entity";
})(VariableScope || (VariableScope = {}));
createEnumAccessor(VariableScope, false, "variable scope");

var SetStatus;
(function(SetStatus) {
    SetStatus[SetStatus["Success"] = 0] = "Success";
    SetStatus[SetStatus["Unchanged"] = 1] = "Unchanged";
    SetStatus[SetStatus["Conflict"] = 2] = "Conflict";
    SetStatus[SetStatus["Unsupported"] = 3] = "Unsupported";
    SetStatus[SetStatus["Denied"] = 4] = "Denied";
    SetStatus[SetStatus["ReadOnly"] = 5] = "ReadOnly";
    SetStatus[SetStatus["NotFound"] = 6] = "NotFound";
    SetStatus[SetStatus["Error"] = 7] = "Error";
})(SetStatus || (SetStatus = {}));
createEnumAccessor(SetStatus, false, "variable set status");
var VariablePatchType;
(function(VariablePatchType) {
    VariablePatchType[VariablePatchType["Add"] = 0] = "Add";
    VariablePatchType[VariablePatchType["Min"] = 1] = "Min";
    VariablePatchType[VariablePatchType["Max"] = 2] = "Max";
    VariablePatchType[VariablePatchType["IfMatch"] = 3] = "IfMatch";
})(VariablePatchType || (VariablePatchType = {}));
createEnumAccessor(VariablePatchType, false, "variable patch type");

function transformLocalIds(ev, transform) {
    ev = {
        ...ev
    };
    assign(ev, "id");
    assign(ev, "view");
    assign(ev, "related");
    return ev;
    function assign(target, property) {
        if (target?.[property]) {
            target[property] = transform(target[property]) || target[property];
        }
    }
}

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
        try {
            const commands = [];
            const [sessionId, deviceId] = await tracker.get([
                {
                    scope: "session",
                    key: "rdb_s",
                    initializer: async ()=>({
                            classification: "anonymous",
                            purposes: "necessary",
                            value: (await this._getNextId()).toString(36)
                        })
                },
                {
                    scope: "device",
                    key: "rdb_d",
                    initializer: async ()=>({
                            classification: "anonymous",
                            purposes: "necessary",
                            value: (await this._getNextId()).toString(36)
                        })
                }
            ]);
            for (let ev of events){
                ev["rdb:timestamp"] = Date.now();
                ev = transformLocalIds(ev, (id)=>`${sessionId}/${id}`);
                const internalEventId = (await this._getNextId()).toString(36);
                if (ev["id"] == null) {
                    ev["id"] = `${internalEventId}`;
                }
                if (ev.session) {
                    ev.session["rdb:deviceId"] = ev.session.deviceId;
                    ev.session["rdb:sessionId"] = ev.session.sessionId;
                    ev.session.deviceId = deviceId.value;
                    ev.session.sessionId = sessionId.value;
                }
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
        return id;
    }
}

export { RavenDbTracker };

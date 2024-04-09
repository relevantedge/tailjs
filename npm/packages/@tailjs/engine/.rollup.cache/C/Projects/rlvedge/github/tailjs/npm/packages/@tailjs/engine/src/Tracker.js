import { dataClassification, dataPurposes, isSuccessResult, variableScope, } from "@tailjs/types";
import { createTransport } from "@tailjs/util/transport";
import { map, params, unparam } from "./lib";
import { filter, forEach, isDefined, isNumber, now, update, } from "@tailjs/util";
const SCOPE_DATA_KEY = "_data";
const createInitialScopeData = (id, timestamp, additionalData) => ({
    id,
    firstSeen: timestamp,
    lastSeen: timestamp,
    views: 0,
    isNew: true,
    ...additionalData,
});
export class Tracker {
    /**
     * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
     *
     * Without this queue this might happen if one of the first extensions posted an event in the apply method.
     * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
     */
    _eventQueue = [];
    _extensionState = 0 /* ExtensionState.Pending */;
    _initialized;
    _requestId;
    /** @internal  */
    _clientEvents = [];
    /** @internal */
    _requestHandler;
    clientIp;
    cookies;
    disabled;
    env;
    headers;
    queryString;
    referrer;
    requestItems;
    /** Transient variables that can be used by extensions whilst processing a request. */
    transient;
    _clientCipher;
    clientKey;
    host;
    path;
    url;
    constructor({ disabled = false, clientIp = null, headers, host, path, url, queryString, cookies, requestHandler, clientKeySeed, }) {
        this.disabled = disabled;
        this._requestHandler = requestHandler;
        this.env = requestHandler.environment;
        this.host = host;
        this.path = path;
        this.url = url;
        this.queryString = queryString ?? {};
        this.headers = headers ?? {};
        this.cookies = cookies ?? {};
        this.transient = {};
        this.requestItems = new Map();
        this.clientIp =
            clientIp ??
                this.headers["x-forwarded-for"]?.[0] ??
                Object.fromEntries(params(this.headers["forwarded"]))["for"] ??
                null;
        this.referrer = this.headers["referer"] ?? null;
        let clientKey = `${this.clientIp}_${headers?.["user-agent"] ?? ""}`;
        clientKey = `${clientKey.substring(0, clientKey.length / 2)}${clientKeySeed}${clientKey.substring(clientKey.length / 2 + 1)}`;
        this._clientCipher = createTransport((this.clientKey = this.env.hash(clientKey, 64)));
    }
    get clientEvents() {
        return this._clientEvents;
    }
    /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
     *
     * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
     * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
     *
     */
    _sessionReferenceId;
    /** @internal */
    _session;
    /** @internal */
    _device;
    /**
     * See {@link Session.expiredDeviceSessionId}.
     * @internal
     */
    _expiredDeviceSessionId;
    /**
     * Device variables are only persisted in the device.
     * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
     */
    _clientDeviceCache;
    _consent = { level: 0 /* DataClassification.Anonymous */, purposes: 1 /* DataPurposes.Necessary */ };
    get consent() {
        return this._consent;
    }
    get requestId() {
        return `${this._requestId}`;
    }
    get session() {
        return this._session.value;
    }
    get sessionId() {
        return this.session.id;
    }
    get deviceSessionId() {
        return this._session.value?.deviceSessionId;
    }
    get device() {
        return this._device?.value;
    }
    get deviceId() {
        return this._session.value?.deviceId;
    }
    get authenticatedUserId() {
        return this._session.value?.userId;
    }
    async updateConsent(level, purposes) {
        level ??= this.consent.level;
        purposes ??= this.consent.purposes;
        if (level < this.consent.level || ~purposes & this.consent.purposes) {
            // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
            await this.env.storage.purge([
                {
                    keys: ["*"],
                    scopes: [
                        1 /* VariableScope.Session */,
                        2 /* VariableScope.Device */,
                        3 /* VariableScope.User */,
                    ],
                    purposes: ~purposes,
                    classification: {
                        min: level + 1,
                    },
                },
            ]);
        }
        if ((level === 0 /* DataClassification.Anonymous */) !==
            (this.consent.level === 0 /* DataClassification.Anonymous */)) {
            // We need to transition to or from cookie-less tracking which means the key used to refer to the session data changes.
            // (Non-cookieless uses a unique session ID, cookie-less uses a hash of request headers which is not guaranteed to be unique).
        }
        // if (consentLevel === this._consentLevel) return;
        // this._consentLevel = consentLevel;
        // if (consentLevel === DataClassification.None) {
        //   this._requestHandler._sessionStore.purge(this);
        // } else {
        //   // Copy current values from cookie-less store.
        //   await this._requestHandler._sessionStore.set(
        //     this,
        //     ...(await this._requestHandler._globalStorage.get(
        //       this,
        //       { scope: "session" },
        //       { scope: "device-session" },
        //       { scope: "device" },
        //       { scope: "user" }
        //     ))
        //   );
        //   await this._requestHandler._sessionStore.set(this, {
        //     scope: "session",
        //     key: "consent",
        //     value: consentLevel,
        //   });
        // }
    }
    httpClientEncrypt(value) {
        return this._clientCipher[0](value);
    }
    httpClientDecrypt(encoded) {
        return this._clientCipher[1](encoded);
    }
    /** @internal */
    async _applyExtensions(deviceSessionId, deviceId) {
        await this._initialize(deviceSessionId, deviceId);
        if (this._extensionState === 0 /* ExtensionState.Pending */) {
            this._extensionState = 1 /* ExtensionState.Applying */;
            try {
                await this._requestHandler.applyExtensions(this);
            }
            finally {
                this._extensionState = 2 /* ExtensionState.Done */;
                if (this._eventQueue.length) {
                    for (const [events, options] of this._eventQueue.splice(0)) {
                        await this.post(events, options);
                    }
                }
            }
        }
    }
    async forwardRequest(request) {
        const finalRequest = {
            url: request.url,
            binary: request.binary,
            method: request.method,
            headers: { ...this.headers },
        };
        if (request.headers) {
            Object.assign(finalRequest.headers, request.headers);
        }
        finalRequest.headers["cookie"] = unparam(Object.fromEntries(map(this.cookies, ([key, value]) => [key, value?.value])
            .filter((kv) => kv[1] != null)
            .concat(params(finalRequest.headers["cookie"]))));
        const response = await this._requestHandler.environment.request(finalRequest);
        return response;
    }
    getClientScripts() {
        return this._requestHandler.getClientScripts(this);
    }
    async post(events, options = {}) {
        if (this._extensionState === 1 /* ExtensionState.Applying */) {
            this._eventQueue.push([events, options]);
            return {};
        }
        return await this._requestHandler.post(this, events, options);
    }
    // #region DeviceData
    /**
     *
     * Called by {@link TrackerVariableStorage} after successful set operations, to give the tracker a chance to update its state.
     * (Session and device data)
     *
     * @internal
     */
    async _maybeUpdate(key, current) {
        const scope = variableScope(key.scope);
        if (key.key === SCOPE_DATA_KEY) {
            if (scope === 1 /* VariableScope.Session */) {
                // TODO: Reset session if purged.
                current && (this._session = current);
            }
            else if (scope === 2 /* VariableScope.Device */ &&
                this._consent.level > 0 /* DataClassification.Anonymous */) {
                this._device = current;
            }
        }
    }
    /**
     * Used by the {@link TrackerVariableStorage} to maintain deviec data stored in the device and only briefly cached on the server.
     * @internal
     */
    _getClientDeviceVariables() {
        if (!this._clientDeviceCache) {
            const deviceCache = (this._clientDeviceCache = {});
            dataPurposes.entries.map(([purpose, flag]) => {
                // Device variables are stored with a cookie for each purpose.
                forEach(this.httpClientDecrypt(this.cookies[this._requestHandler._cookieNames.device[purpose]]
                    ?.value), (value) => {
                    update((deviceCache.variables ??= {}), purpose, (current) => {
                        current ??= {
                            scope: 2 /* VariableScope.Device */,
                            key: value[0],
                            classification: value[1],
                            version: value[2],
                            value: value[3],
                        };
                        current.purposes = (current.purposes ?? 0) | flag;
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
     */
    _touchClientDeviceData() {
        if (this._clientDeviceCache) {
            this._clientDeviceCache.touched = true;
        }
    }
    // #endregion
    /**
     *
     * Initializes the tracker with session and device data.
     * The deviceId ans deviceSesssionId parameters are only used if no session already exists.
     * After that they will stick. This means if a device starts a new server session, its device session will remain.
     * Simlarily if an old frozen tab suddenly wakes up it will get the new device session.
     * (so yes, they can hypothetically be split across the same tab even though that goes against the definition).
     *
     * @internal */
    async _initialize(deviceId, deviceSessionId) {
        if (this._initialized === (this._initialized = true)) {
            return false;
        }
        this._requestId = await this.env.nextId("request");
        const timestamp = now();
        const consentData = (this.cookies["consent"]?.value ??
            `${dataClassification.anonymous}:${dataPurposes.necessary}`).split(":");
        this._consent = {
            level: dataClassification.tryParse(consentData[0]) ??
                0 /* DataClassification.Anonymous */,
            purposes: dataPurposes.tryParse(consentData[1].split(",")) ??
                1 /* DataPurposes.Necessary */,
        };
        await this._ensureSession(timestamp, deviceId, deviceSessionId);
    }
    async reset(session, device = false, consent = false, referenceTimestamp, deviceId, deviceSessionId) {
        if (consent) {
            await this.updateConsent(0 /* DataClassification.Anonymous */, 1 /* DataPurposes.Necessary */);
        }
        await this._ensureSession(referenceTimestamp ?? now(), deviceId, deviceSessionId, session, device);
    }
    async _ensureSession(timestamp, deviceId, deviceSessionId, resetSession, resetDevice) {
        const previousDeviceSessionId = this.deviceSessionId;
        if ((resetSession || resetDevice) && this._sessionReferenceId) {
            // Purge old data. No point in storing this since it will no longer be used.
            await this.env.storage.purge([
                {
                    keys: ["*"],
                    scopes: filter([
                        resetSession && 1 /* VariableScope.Session */,
                        resetDevice && 2 /* VariableScope.Device */,
                    ], isNumber),
                },
            ]);
        }
        if (this._consent.level > 0 /* DataClassification.Anonymous */) {
            // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
            // This means clients must make sure the initial request to endpoint completes before more or send (or at least do a fair effort).
            this._sessionReferenceId =
                (resetSession
                    ? undefined
                    : this.httpClientDecrypt(this.cookies["session"]?.value)?.id) ??
                    (await this.env.nextId("session"));
            this.cookies["session"] = {
                httpOnly: true,
                sameSitePolicy: "None",
                essential: true,
                value: this.httpClientEncrypt({ id: this._sessionReferenceId }),
            };
        }
        else {
            this._sessionReferenceId =
                await this._requestHandler._sessionReferenceMapper.mapSessionId(this);
        }
        this._session =
            // We bypass the TrackerVariableStorage here and uses the environment
            // becaues we use a different target ID than the unique session ID when doing cookie-less tracking.
            (await this.env.storage.get([
                {
                    scope: 1 /* VariableScope.Session */,
                    key: SCOPE_DATA_KEY,
                    targetId: this._sessionReferenceId,
                    initializer: async () => {
                        let cachedDeviceData;
                        if (this.consent.level > 0 /* DataClassification.Anonymous */) {
                            cachedDeviceData = resetDevice
                                ? undefined
                                : this._getClientDeviceVariables()?.[SCOPE_DATA_KEY]
                                    ?.value;
                        }
                        return {
                            classification: 0 /* DataClassification.Anonymous */,
                            purpose: 1 /* DataPurposes.Necessary */,
                            value: createInitialScopeData(await this.env.nextId(), timestamp, {
                                deviceId: this._consent.level > 0 /* DataClassification.Anonymous */
                                    ? deviceId ??
                                        (resetDevice ? undefined : cachedDeviceData?.id) ??
                                        (await this.env.nextId("device"))
                                    : undefined,
                                deviceSessionId: deviceSessionId ??
                                    (await this.env.nextId("device-session")),
                                previousSession: cachedDeviceData?.lastSeen,
                                hasUserAgent: false,
                            }),
                        };
                    },
                },
            ]))[0];
        if (this._session.value.deviceId) {
            const device = (await this.get([
                {
                    scope: 2 /* VariableScope.Device */,
                    key: SCOPE_DATA_KEY,
                    purpose: 1 /* DataPurposes.Necessary */,
                    initializer: async () => ({
                        classification: this.consent.level,
                        value: createInitialScopeData(this._session.value?.deviceId, timestamp, {
                            sessions: 1,
                        }),
                    }),
                },
            ]))[0];
            if (!device.initialized && this.session.isNew) {
                await this.set([
                    {
                        ...device,
                        patch: (current) => current?.value
                            ? {
                                value: {
                                    ...current.value,
                                    sessions: current.value.sessions + 1,
                                },
                            }
                            : undefined,
                    },
                ]);
            }
            if (previousDeviceSessionId && isDefined(this.deviceId)) {
                this._expiredDeviceSessionId = previousDeviceSessionId;
            }
        }
    }
    /**
     *  Must be called last by the request handler just before a response is sent.
     *  The tracker must not be used afterwards.
     *  @internal
     * */
    async _persist() {
        this.cookies[this._requestHandler._cookieNames.consent] = {
            httpOnly: true,
            maxAge: Number.MAX_SAFE_INTEGER,
            essential: true,
            sameSitePolicy: "None",
            value: this.consent.purposes + "@" + this.consent.level,
        };
        const splits = {};
        if (this._clientDeviceCache?.touched) {
            // We have updated device data and need to refresh to get whatever other processes may have written (if any).s
            const deviceValues = (await this.query([
                {
                    scopes: [2 /* VariableScope.Device */],
                    keys: [":*"],
                },
            ], {
                top: 1000,
                ifNoneMatch: map(this._clientDeviceCache?.variables, ([, variable]) => variable),
            })).results;
            forEach(deviceValues, (variable) => {
                dataPurposes.map(variable.purposes, ([purpose]) => (splits[purpose] ??= []).push([
                    variable.key,
                    variable.classification,
                    variable.version,
                    variable.value,
                ]));
            });
        }
        dataPurposes.entries.map(([purpose, flag]) => {
            const remove = this.consent.level === 0 /* DataClassification.Anonymous */ || !splits[purpose];
            const cookieName = this._requestHandler._cookieNames.device[purpose];
            if (remove) {
                if (this.cookies[cookieName]) {
                    this.cookies[cookieName].value = undefined;
                }
            }
            else if (splits[purpose]) {
                if (!this._clientDeviceCache?.touched) {
                    // Device data has not been touched. Don't send the cookies.
                    delete this.cookies[cookieName];
                }
                else {
                    this.cookies[cookieName] = {
                        httpOnly: true,
                        maxAge: Number.MAX_SAFE_INTEGER,
                        sameSitePolicy: "None",
                        essential: flag === 1 /* DataPurposes.Necessary */,
                        value: this.httpClientEncrypt(splits[purpose]),
                    };
                }
            }
        });
    }
    // #region Storage
    _getStorageContext() {
        return { tracker: this };
    }
    async renew() {
        for (const scope of [2 /* VariableScope.Device */, 1 /* VariableScope.Session */]) {
            await this.env.storage.renew(scope, 
            /* TrackerVariableStorage will fill this out */ ["(auto)"], this._getStorageContext());
        }
    }
    get(keys) {
        return this.env.storage.get(keys, this._getStorageContext()); // This conversion is okay because of the TrackerVariableStorage
    }
    head(filters, options) {
        return this.env.storage.head(filters, options, this._getStorageContext());
    }
    query(filters, options) {
        return this.env.storage.query(filters, options, this._getStorageContext());
    }
    async set(variables) {
        const results = await this.env.storage.set(variables, this._getStorageContext());
        for (const result of results) {
            if (isSuccessResult(result)) {
                if (result.source.key === SCOPE_DATA_KEY) {
                    result.source.scope === 1 /* VariableScope.Session */ &&
                        (this._session = result.current);
                    result.source.scope === 2 /* VariableScope.Device */ &&
                        (this._device = result.current);
                }
            }
        }
        if (!this._session) {
            // Being without session data violates an invariant, so if someone deleted the data, we create a new session. Ha!
            await this._ensureSession(now(), this.deviceId, this.deviceSessionId, true, false);
        }
        return results;
    }
    purge(alsoUserData = false) {
        return this.env.storage.purge([
            {
                scopes: [2 /* VariableScope.Device */, 1 /* VariableScope.Session */].concat(alsoUserData ? [3 /* VariableScope.User */] : []),
                keys: ["*"],
            },
        ], this._getStorageContext());
    }
}
//# sourceMappingURL=Tracker.js.map
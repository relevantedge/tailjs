import clientScripts from "@tailjs/client/script";
import { dataPurposes, } from "@tailjs/types";
import queryString from "query-string";
import { Lock } from "semaphore-async-await";
import urlParse from "url-parse";
import { CommerceExtension } from "./extensions";
import { any, DefaultCryptoProvider, map, merge, TrackerVariableStorage, } from "./lib";
import { CookieMonster, DEFAULT, InMemoryStorage, isValidationError, PostError, SessionEvents, Timestamps, Tracker, TrackerEnvironment, VariableStorageCoordinator, } from "./shared";
import { CONTEXT_MENU_COOKIE, MUTEX_REQUEST_COOKIE } from "@constants";
import { forEach, obj } from "@tailjs/util";
import { from64u } from "@tailjs/util/transport";
import { DefaultSessionReferenceMapper, } from "./ClientIdGenerator";
import { generateClientConfigScript } from "./lib/clientConfigScript";
const scripts = {
    main: {
        text: clientScripts.main.text,
        gzip: from64u(clientScripts.main.gzip),
        br: from64u(clientScripts.main.br),
    },
    debug: clientScripts.debug,
};
export let SCRIPT_CACHE_CONTROL = "private, max-age=604800"; // A week
export class RequestHandler {
    _allowUnknownEventTypes;
    _cookies;
    _debugScript;
    _endpoint;
    _extensionFactories;
    _lock = new Lock();
    _parser;
    _trackerName;
    _useSession;
    _extensions;
    _initialized = false;
    _script;
    /** @internal */
    _cookieNames;
    environment;
    /** @internal */
    _sessionTimeout;
    _clientKeySeed;
    _clientConfig;
    /** @internal */
    _sessionReferenceMapper;
    constructor(config) {
        let { trackerName, endpoint, host, extensions, parser, crypto, cookies, allowUnknownEventTypes, debugScript, useSession, environmentTags, manageConsents, sessionTimeout, deviceSessionTimeout, clientKeySeed, encryptionKeys, client, storage, sessionReferenceMapper, } = merge({}, DEFAULT, config);
        this._trackerName = trackerName;
        this._endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;
        this._extensionFactories = map(extensions);
        this._parser = parser;
        if (!storage) {
            storage = {
                mappings: {
                    default: new InMemoryStorage(),
                },
            };
        }
        const storageMappings = [];
        const mapPrefix = (scope, prefix, storage) => storage && (storageMappings[scope] ??= new Map()).set(prefix, storage);
        const mapStorages = (prefix, mappings) => {
            [
                [0 /* VariableScope.Global */, "global"],
                [3 /* VariableScope.User */, "user"],
                [2 /* VariableScope.Device */, "device"],
                [1 /* VariableScope.Session */, "session"],
                [4 /* VariableScope.Entity */, "entity"],
            ].forEach(([scope, key]) => mapPrefix(scope, prefix, mappings[key] ?? mappings.default));
            forEach(mappings?.prefixes, ([prefix, mappings]) => mapStorages(prefix, mappings));
        };
        this.environment = new TrackerEnvironment(host, crypto ?? new DefaultCryptoProvider(encryptionKeys), parser, manageConsents, new TrackerVariableStorage(new VariableStorageCoordinator({ mappings: storageMappings })), environmentTags);
        this._cookies = new CookieMonster(cookies);
        this._allowUnknownEventTypes = allowUnknownEventTypes;
        this._useSession = useSession;
        this._debugScript = debugScript;
        this._sessionReferenceMapper =
            sessionReferenceMapper ?? new DefaultSessionReferenceMapper();
        this._sessionTimeout = sessionTimeout;
        this._cookieNames = {
            consent: `${cookies.namePrefix}.consent`,
            session: `${cookies.namePrefix}.s`,
            device: obj(dataPurposes.entries.map(([name, flag]) => [
                name,
                // Necessary device data is just ".d" (no suffix)
                `${cookies.namePrefix}.d${flag !== dataPurposes.necessary ? `.${name[0]}` : ""}`,
            ])),
        };
        this._clientKeySeed = clientKeySeed;
        this._clientConfig = client;
        this._clientConfig.src = this._endpoint;
    }
    async applyExtensions(tracker) {
        //console.log(`EXT.IN: ${++this._activeExtensionRequests}`);
        for (const extension of this._extensions) {
            // Call the apply method in post context to let extension do whatever they need before events are processed (e.g. initialize session).
            try {
                await extension.apply?.(tracker);
            }
            catch (e) {
                this._logExtensionError(extension, "apply", e);
            }
        }
    }
    /** @internal */
    async _validateLoginEvent(userId, evidence) {
        //TODO
        return true;
    }
    getClientCookies(tracker) {
        return this._cookies.mapResponseCookies(tracker.cookies);
    }
    getClientScripts(tracker, nonce) {
        return this._getClientScripts(tracker, true, nonce);
    }
    async initialize() {
        if (this._initialized)
            return;
        await this._lock.acquire();
        try {
            if (this._initialized)
                return;
            if (typeof this._debugScript === "string") {
                this._script = await this.environment.readText(this._debugScript, async (_, newText) => {
                    const updated = await newText();
                    if (updated) {
                        this._script = updated;
                    }
                    return true;
                });
            }
            await this.environment.storage.initialize?.(this.environment);
            this._extensions = [
                Timestamps,
                this._useSession ? new SessionEvents() : null,
                new CommerceExtension(),
                ...(await Promise.all(this._extensionFactories.map(async (factory) => {
                    let extension = null;
                    try {
                        extension = await factory();
                        if (extension?.initialize) {
                            await extension.initialize?.(this.environment);
                            this.environment.log(extension, `The extension ${extension.id} was initialized.`);
                        }
                        return extension;
                    }
                    catch (e) {
                        this._logExtensionError(extension, extension ? "update" : "factory", e);
                        return null;
                    }
                }))),
            ].filter((item) => item != null);
            this._initialized = true;
        }
        finally {
            this._lock.release();
        }
    }
    async post(tracker, eventBatch, { deviceSessionId, deviceId, routeToClient }) {
        let events = eventBatch.add;
        await this.initialize();
        let parsed = this._parser.parseAndValidate(events, !this._allowUnknownEventTypes);
        const sourceIndices = new Map();
        parsed.forEach((item, i) => {
            sourceIndices.set(item, i);
        });
        await tracker._applyExtensions(deviceSessionId, deviceId);
        const validationErrors = [];
        function collectValidationErrors(parsed) {
            const events = [];
            for (const item of parsed) {
                if (isValidationError(item)) {
                    validationErrors.push({
                        // The key for the source index of a validation error may be the error itself during the initial validation.
                        sourceIndex: sourceIndices.get(item.source) ?? sourceIndices.get(item),
                        source: item.source,
                        error: item.error,
                    });
                }
                else {
                    events.push(item);
                }
            }
            return events;
        }
        const patchExtensions = this._extensions.filter((ext) => ext.patch);
        const callPatch = async (index, results) => {
            const extension = patchExtensions[index];
            const events = collectValidationErrors(this._parser.validate(results));
            if (!extension)
                return events;
            try {
                return collectValidationErrors(this._parser.validate(await extension.patch(events, async (events) => {
                    return await callPatch(index + 1, events);
                }, tracker)));
            }
            catch (e) {
                this._logExtensionError(extension, "update", e);
                return events;
            }
        };
        eventBatch.add = await callPatch(0, parsed);
        const extensionErrors = {};
        if (routeToClient) {
            tracker._clientEvents.push(...events);
        }
        else {
            await Promise.all(this._extensions.map(async (extension) => {
                try {
                    (await extension.post?.(eventBatch, tracker)) ?? Promise.resolve();
                }
                catch (e) {
                    extensionErrors[extension.id] =
                        e instanceof Error ? e : new Error(e?.toString());
                }
            }));
        }
        if (validationErrors.length || any(extensionErrors)) {
            throw new PostError(validationErrors, extensionErrors);
        }
        return {};
    }
    async processRequest({ method, url, headers: sourceHeaders, payload, clientIp, }) {
        //const requestTimer = timer("Request").start();
        if (!url)
            return null;
        await this.initialize();
        const { host, pathname: path, query } = urlParse(url);
        const parsedQuery = queryString.parse(query);
        const headers = Object.fromEntries(Object.entries(sourceHeaders)
            .filter(([k, v]) => !!v)
            .map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(",") : v]));
        const tracker = new Tracker({
            headers,
            host,
            path,
            url,
            queryString: Object.fromEntries(Object.entries(parsedQuery ?? {}).map(([key, value]) => [
                key,
                !value
                    ? []
                    : Array.isArray(value)
                        ? value.map((value) => value || "")
                        : [value],
            ])),
            clientIp,
            requestHandler: this,
            cookies: this._cookies.parseCookieHeader(headers["cookie"]),
            clientKeySeed: this._clientKeySeed,
        });
        try {
            let extensionRequestType = null;
            const result = async (response, discardTrackerCookies = false) => {
                if (extensionRequestType) {
                    !discardTrackerCookies && (await tracker._persist());
                    console.log(tracker.httpClientDecrypt(tracker.cookies[MUTEX_REQUEST_COOKIE]?.value));
                }
                if (response) {
                    response.headers ??= {};
                    response.cookies = this.getClientCookies(tracker);
                }
                return {
                    tracker,
                    response: response,
                };
            };
            let requestPath = path;
            if (requestPath.startsWith(this._endpoint)) {
                requestPath = requestPath.substring(this._endpoint.length);
                if ("init" in parsedQuery) {
                    // This is set by most modern browsers.
                    // It prevents external scripts to try to get a hold of the storage key via XHR.
                    const secDest = headers["sec-fetch-dest"];
                    if (secDest && secDest !== "script") {
                        return await result({
                            status: 400,
                            body: "This script can only be loaded from a script tag.",
                            headers: {
                                "content-type": "text/plain",
                                "cache-control": SCRIPT_CACHE_CONTROL,
                                vary: "sec-fetch-dest",
                            },
                        });
                    }
                    return await result({
                        status: 200,
                        body: generateClientConfigScript(tracker, {
                            ...this._clientConfig,
                            clientKey: tracker.clientKey,
                        }),
                        headers: {
                            "content-type": "application/javascript",
                            "cache-control": SCRIPT_CACHE_CONTROL,
                            vary: "sec-fetch-dest",
                        },
                    });
                }
                switch (method.toUpperCase()) {
                    case "GET": {
                        if ("opt" in parsedQuery) {
                            return await result({
                                status: 200,
                                body: this._getClientScripts(tracker, false),
                                cacheKey: "external-script",
                                headers: {
                                    "cache-control": SCRIPT_CACHE_CONTROL,
                                    "content-type": "application/javascript",
                                },
                            });
                        }
                        if ("mnt" in parsedQuery) {
                            const mnt = Array.isArray(parsedQuery["mnt"])
                                ? parsedQuery["mnt"].join("")
                                : parsedQuery["mnt"];
                            const contextMenuCookie = tracker.cookies[CONTEXT_MENU_COOKIE]?.value;
                            // Don't write any other cookies (that is, clear those we have).
                            // If for any reason this redirect is considered "link decoration" or similar
                            // we don't want the browser to store the rest of our cookies in a restrictive way.
                            tracker.cookies = {};
                            // This cookie is used to signal that external navigation happened from the "open in new tab" context menu.
                            // We do not want the server to echo this cookie.
                            if (contextMenuCookie) {
                                tracker.cookies[CONTEXT_MENU_COOKIE] = {
                                    essential: true,
                                    httpOnly: false,
                                    maxAge: 30,
                                    value: "" + (+contextMenuCookie + 1),
                                    sameSitePolicy: "Lax",
                                };
                            }
                            return await result({
                                status: 301,
                                headers: {
                                    location: mnt + "",
                                    "cache-control": "no-cache, no-store, must-revalidate",
                                    pragma: "no-cache",
                                    expires: "0",
                                },
                            });
                        }
                        if ("$types" in parsedQuery) {
                            return await result({
                                status: 200,
                                body: JSON.stringify(this._parser.events, null, 2),
                                headers: {
                                    "content-type": "application/json",
                                },
                                cacheKey: "types",
                            });
                        }
                        const scriptHeaders = {
                            "content-type": "application/javascript",
                            "cache-control": SCRIPT_CACHE_CONTROL,
                        };
                        let script = this._script;
                        if (!script) {
                            if (this._debugScript) {
                                script = scripts.debug;
                            }
                            else {
                                const accept = tracker.headers["accept-encoding"]
                                    ?.split(",")
                                    .map((value) => value.toLowerCase().trim()) ?? [];
                                if (accept.includes("br")) {
                                    script = scripts.main.br;
                                    scriptHeaders["content-encoding"] = "br";
                                }
                                else if (accept.includes("gzip")) {
                                    script = scripts.main.gzip;
                                    scriptHeaders["content-encoding"] = "gzip";
                                }
                                else {
                                    script = scripts.main.text;
                                }
                            }
                        }
                        return await result({
                            status: 200,
                            body: script,
                            cacheKey: "script",
                            headers: scriptHeaders,
                        });
                    }
                    case "POST": {
                        const payloadString = payload ? await payload() : null;
                        if (payloadString == null || payloadString === "") {
                            return await result({
                                status: 400,
                                body: "No data.",
                                headers: {
                                    "content-type": "text/plain",
                                },
                            });
                        }
                        const postRequest = this.environment.httpDecode(payloadString);
                        try {
                            extensionRequestType = "post";
                            const response = {};
                            if (postRequest.add || postRequest.patch) {
                                //requestTimer.print("post start");
                                await tracker.post({
                                    add: postRequest.add ?? [],
                                    patch: postRequest.patch ?? [],
                                }, {
                                    deviceSessionId: postRequest.deviceSessionId,
                                    deviceId: postRequest.deviceId,
                                });
                            }
                            return await result(response.eventIds || response.variables
                                ? { status: 200, body: tracker.httpClientEncrypt(response) }
                                : { status: 202 });
                        }
                        catch (error) {
                            this.environment.log({
                                group: "system/request-handler",
                                source: "post",
                            }, error);
                            if (error instanceof PostError) {
                                return result({
                                    status: Object.keys(error.extensions).length ? 500 : 400,
                                    body: error.message,
                                    headers: {
                                        "content-type": "text/plain",
                                    },
                                    error,
                                });
                            }
                            throw error;
                        }
                    }
                }
                return result({
                    status: 400,
                    body: `Bad request.`,
                    headers: {
                        "content-type": "text/plain",
                    },
                });
            }
        }
        catch (ex) {
            console.error(ex.stack);
            throw ex;
        }
        return { tracker, response: null };
    }
    _getClientScripts(tracker, html, nonce) {
        if (!this._initialized) {
            return undefined;
        }
        const trackerScript = [];
        const wrapTryCatch = (s) => `try{${s}}catch(e){console.error(e);}`;
        const trackerRef = this._trackerName;
        if (html) {
            trackerScript.push(`window.${trackerRef}||(${trackerRef}=[]);`);
        }
        const inlineScripts = [trackerScript.join("")];
        const otherScripts = [];
        this._extensions
            .map((extension) => extension.getClientScripts?.(tracker))
            .flatMap((item) => item ?? [])
            .forEach((script) => {
            if ("inline" in script) {
                // Prevent errors from preempting other scripts.
                script.inline = wrapTryCatch(script.inline);
                if (script.allowReorder !== false) {
                    inlineScripts.push(script.inline);
                    return;
                }
            }
            otherScripts.push(script);
        });
        if (html) {
            const variables = this._getClientVariables(tracker);
            if (Object.keys(variables).length) {
                inlineScripts.push(`${trackerRef}.push(${JSON.stringify({ set: variables })});`);
            }
            const pendingEvents = tracker.clientEvents;
            if (pendingEvents.length) {
                inlineScripts.push(`${trackerRef}.push(${pendingEvents
                    .map((event) => typeof event === "string" ? event : JSON.stringify(event))
                    .join(", ")});`);
            }
            otherScripts.push({
                src: `${this._endpoint}${this._trackerName && this._trackerName !== DEFAULT.trackerName
                    ? `#${this._trackerName}`
                    : ""}`,
                defer: true,
            });
        }
        const js = [{ inline: inlineScripts.join("") }, ...otherScripts]
            .map((script, i) => {
            if ("inline" in script) {
                return html
                    ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${script.inline}</script>`
                    : script.inline;
            }
            else {
                return html
                    ? `<script src='${script.src}?init'${script.defer !== false ? " defer" : ""}></script>`
                    : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify({ src: script.src, async: script.defer })}))}catch(e){console.error(e);}`;
            }
        })
            .join("");
        return js;
    }
    _getClientVariables(tracker) {
        return {
            ...tracker.transient,
            consent: tracker.consent,
        };
    }
    _logExtensionError(extension, method, error) {
        this.environment.log({
            group: "extensions",
            source: extension ? `${extension.id}.${method}` : method,
        }, error);
    }
}
//# sourceMappingURL=RequestHandler.js.map
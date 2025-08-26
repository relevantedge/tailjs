import { VariableServerScope, extractKey, VariableResultStatus } from '@tailjs/types';
import { withRetry, parseJson, stringify, formatError, createLock, batch, now, map } from '@tailjs/util';

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
                const body = parseJson(response.body);
                response.error = new Error((body === null || body === void 0 ? void 0 : body.Type) ? `${body.Type}: ${body.Message}` : "(unspecified error)");
            }
            return response;
        }, {
            retries: maxRetries,
            retryDelay,
            errorFilter: (error, retry)=>{
                if (retry) {
                    this._env.log(this, {
                        level: "error",
                        message: `Request to RavenDB failed on attempt ${retry + 1}.`,
                        error
                    });
                }
            },
            errorHandler: (error)=>{
                return {
                    request,
                    status: 500,
                    headers: {},
                    cookies: {},
                    body: stringify({
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
        for (const keyBatch of batch(keys, 100)){
            const response = await this._request("GET", `docs?${keyBatch.map((key)=>`id=${keyToDocumentId(key)}`).join("&")}`);
            const timestamp = now();
            const body = parseJson(response.body);
            const batchResults = body === null || body === void 0 ? void 0 : body.Results;
            let i = 0;
            for (const _ of keyBatch){
                const result = mapDocumentResult(response.status, batchResults === null || batchResults === void 0 ? void 0 : batchResults[i++], timestamp);
                results.push(result.status === 200 ? mapVariableResult(200, result) : result.status === 404 ? mapNotFoundResult(keyBatch[i]) : mapErrorResult(keyBatch[i], result));
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
                let body = parseJson(response.body);
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
                    body = parseJson(response.body);
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
        for (const requestBatch of batch(requests, 100)){
            results.push(...await Promise.all(requestBatch.map((request)=>request())));
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
                    `id() > ${stringify(skipId)}`
                ] : undefined,
                append: page ? `order by id() limit ${page}` : undefined
            });
            if (!rql) continue;
            const response = await this._request("POST", "queries", rql);
            if (response.error) {
                throw response.error;
            }
            const json = parseJson(response.body);
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
            const filters = `${entityIds.map((entityId)=>`startsWith(id(),${stringify(keyToDocumentId({
                    scope: query.scope,
                    entityId,
                    key: ""
                }))})`).join(" or ")}`;
            where.push(entityIds.length > 1 ? `(${filters})` : filters);
        }
        if (keys) {
            // Specific document IDs must match (or not match).
            const comparer = keys.exclude ? "!=" : "==";
            const keyFilter = entityIds.flatMap((entityId)=>map(keys.values, (key)=>`id() ${comparer} ${stringify(keyToDocumentId({
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
        const keyFilter = map(keys.values, (key)=>`key ${comparer} ${stringify(key)}`).join(" or ");
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

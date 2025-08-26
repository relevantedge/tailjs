'use strict';

var cosmos = require('@azure/cosmos');
var util = require('@tailjs/util');
var types = require('@tailjs/types');

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
const clearCosmosItemProperties = (item)=>{
    if (!item) return item;
    for(const key in item){
        if (key[0] === "_") {
            delete item[key];
        }
    }
    return item;
};
class CosmosDbTarget {
    async _getOrCreateContainer(database, name, configure) {
        try {
            // Try to get the container if it exists
            const container = database.container(name);
            await container.read(); // Check if container exists
            return container;
        } catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) === 404) {
                // Create container if it doesn't exist.
                const { container } = await database.containers.createIfNotExists({
                    id: name,
                    ...configure === null || configure === void 0 ? void 0 : configure()
                });
                return container;
            } else {
                throw error;
            }
        }
    }
    async initialize(env) {
        this._env = env;
    }
    async _bulkWithRetry(errorTrace, container, operations) {
        const succeeded = new Map();
        var _this__settings_maxRetries;
        const maxRetries = Math.max(1, (_this__settings_maxRetries = this._settings.maxRetries) !== null && _this__settings_maxRetries !== void 0 ? _this__settings_maxRetries : 5);
        let noProgress = 0;
        let pending = operations.slice(0);
        while(pending.length > 0){
            const result = await container.items.bulk(pending, {
                continueOnError: true
            });
            let previousCount = pending.length;
            pending = pending.filter((operation, i)=>{
                const response = result[i];
                if (!response) {
                    throw new Error(`No response for operation #${i}.`);
                }
                if (response.statusCode === 429) {
                    return true;
                }
                succeeded.set(operation, response);
                return false;
            });
            if (pending.length > 0) {
                if (pending.length === previousCount) {
                    if (noProgress++ === maxRetries) {
                        throw new Error(`Too many requests (429) for ${errorTrace} - ${pending.length} / ${previousCount} operations could not be completed without progress after ${noProgress} attempts.`);
                    }
                } else {
                    noProgress = 0;
                }
                this._env.log(this, {
                    level: "warn",
                    message: `Too many requests (429) for ${errorTrace} - ${pending.length} / ${previousCount} operations could not be completed. Retrying...`
                });
                // Wait one second (Azure throttles by RU/s) and also a little bit of jitter if we are fighting for capacity with someone else.
                await util.delay(1000 + Math.random() * 250);
            }
        }
        return operations.map((operation)=>succeeded.get(operation));
    }
    async _execute(action) {
        var _this__settings_maxErrorRetries;
        const maxRetries = Math.max(1, (_this__settings_maxErrorRetries = this._settings.maxErrorRetries) !== null && _this__settings_maxErrorRetries !== void 0 ? _this__settings_maxErrorRetries : 5);
        var _this__settings_retryDelay;
        const retryDelay = Math.max(100, (_this__settings_retryDelay = this._settings.retryDelay) !== null && _this__settings_retryDelay !== void 0 ? _this__settings_retryDelay : 500);
        return await util.withRetry(async (retry, previousError)=>{
            const client = new cosmos.CosmosClient({
                endpoint: this._settings.endpoint,
                key: this._settings.key
            });
            const db = client.database(this._settings.database);
            return await action(db, previousError);
        }, {
            retries: maxRetries,
            retryDelay,
            errorFilter: (error, retry)=>{
                if (retry) {
                    this._env.log(this, {
                        level: "error",
                        message: `Request to Cosmos DB (${this._settings.endpoint}, db: ${this._settings.database}) failed on attempt ${retry + 1}.`,
                        error
                    });
                }
            }
        });
    }
    constructor(settings){
        _define_property$2(this, "_settings", void 0);
        _define_property$2(this, "_containerPerScope", void 0);
        _define_property$2(this, "_batchSize", void 0);
        _define_property$2(this, "_env", void 0);
        this._settings = settings;
        var _this__settings_batchSize;
        this._batchSize = (_this__settings_batchSize = this._settings.batchSize) !== null && _this__settings_batchSize !== void 0 ? _this__settings_batchSize : 100;
        var _settings_containerPerScope;
        this._containerPerScope = (_settings_containerPerScope = settings.containerPerScope) !== null && _settings_containerPerScope !== void 0 ? _settings_containerPerScope : false;
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
const mapCosmosId = (key)=>{
    return `${key.scope}:${key.entityId}:${key.key}`;
};
const queryFilterToCosmosQuery = (containerPerScope, queryFilter)=>{
    const conditions = [];
    const parameters = [];
    if (queryFilter.entityIds) {
        conditions.push(`ARRAY_CONTAINS(@entityIds, c.entityId)`);
        parameters.push({
            name: "@entityIds",
            value: queryFilter.entityIds
        });
    }
    if (queryFilter.ifModifiedSince) {
        conditions.push(`c.modified >= @modifiedSince`);
        parameters.push({
            name: "@modifiedSince",
            value: queryFilter.ifModifiedSince
        });
    }
    if (!containerPerScope) {
        conditions.push("c.scope = @scope");
        parameters.push({
            name: "@scope",
            value: queryFilter.scope
        });
    }
    if (queryFilter.keys) {
        if (queryFilter.keys.exclude) {
            conditions.push(`NOT ARRAY_CONTAINS(@keys, c.key)`);
        } else {
            conditions.push(`ARRAY_CONTAINS(@keys, c.key)`);
        }
        parameters.push({
            name: "@keys",
            value: queryFilter.keys.values
        });
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return {
        query: `SELECT * FROM c ${whereClause}`,
        parameters
    };
};
const cosmosItemToVariable = (item)=>{
    if (!item) return item;
    item.version = item._etag;
    item.ttl = item.ttl ? item.ttl * 1000 : undefined;
    return clearCosmosItemProperties(item);
};
class CosmosDbVariableStorage extends CosmosDbTarget {
    async _getScopeContainer(database, scopeName) {
        if (!this._containers.has(scopeName)) {
            const container = await this._getOrCreateContainer(database, this._containerPerScope ? scopeName : "variables", ()=>({
                    defaultTtl: -1,
                    partitionKey: {
                        paths: [
                            "/entityId"
                        ]
                    }
                }));
            this._containers.set(scopeName, container);
        }
        return this._containers.get(scopeName);
    }
    async get(getters) {
        const resultMap = new Map();
        for (const [scope, scopeGetters] of util.group(getters, (key)=>[
                key.scope,
                key
            ])){
            await this._execute(async (db)=>{
                const container = await this._getScopeContainer(db, scope);
                const currentItems = await this._getVariables(container, scopeGetters);
                for (const [key, variable] of currentItems){
                    resultMap.set(key, variable);
                }
            });
        }
        var results = getters.map((getter)=>{
            const result = resultMap.get(mapCosmosId(getter));
            return result ? {
                status: types.VariableResultStatus.Success,
                ...result
            } : {
                status: types.VariableResultStatus.NotFound,
                scope: getter.scope,
                key: getter.key,
                entityId: getter.entityId
            };
        });
        return results;
    }
    async _getVariables(container, keys) {
        if (!util.isArray(keys)) {
            keys = [
                keys
            ];
        }
        const results = new Map();
        for (let keyBatch of util.batch(keys, this._batchSize)){
            const responses = await this._bulkWithRetry("read", container, keyBatch.map((key)=>({
                    operationType: "Read",
                    id: mapCosmosId(key),
                    partitionKey: key.entityId
                })));
            for (const response of responses){
                if (response.resourceBody) {
                    results.set(response.resourceBody.id, cosmosItemToVariable(response.resourceBody));
                }
            }
        }
        return results;
    }
    async set(values) {
        const results = new Map();
        const timestamp = util.now();
        for (const [scope, scopeSetters] of util.group(values, (key)=>[
                key.scope,
                key
            ])){
            // Process in batches
            for (let setterBatch of util.batch(scopeSetters, this._batchSize)){
                await this._execute(async (db)=>{
                    const container = await this._getScopeContainer(db, scope);
                    const currentVariables = await this._getVariables(container, setterBatch);
                    const operations = util.map(setterBatch, (setter)=>{
                        const key = types.extractKey(setter);
                        const itemId = mapCosmosId(setter); // Create a unique ID
                        const partitionKey = setter.entityId;
                        // Handle deletion
                        if (setter.value == null) {
                            const existingItem = currentVariables.get(itemId);
                            if (!setter.force) {
                                // Don't tell about conflicts if force. Not found item may be due to a conflict so are also ignored.
                                if (!existingItem) {
                                    // Does not exist,
                                    results.set(itemId, {
                                        status: types.VariableResultStatus.NotFound,
                                        ...key
                                    });
                                    return util.skip;
                                }
                                // Check version if not forced
                                if (!setter.version || existingItem.version !== setter.version) {
                                    results.set(itemId, {
                                        status: types.VariableResultStatus.Conflict,
                                        ...types.extractVariable(existingItem)
                                    });
                                    return util.skip;
                                }
                            }
                            if (existingItem) {
                                return [
                                    setter,
                                    {
                                        operationType: "Delete",
                                        id: itemId,
                                        partitionKey
                                    },
                                    (result)=>setter.force && result.statusCode === 404 || result.statusCode >= 200 && result.statusCode <= 204 ? {
                                            status: types.VariableResultStatus.Success,
                                            ...key
                                        } : result.statusCode === 404 ? {
                                            status: types.VariableResultStatus.NotFound,
                                            ...key
                                        } : undefined
                                ];
                            }
                        }
                        // Handle creation/update
                        const expires = setter.ttl ? timestamp + setter.ttl : undefined;
                        // Prepare the item
                        const itemToUpsert = {
                            id: itemId,
                            scope,
                            key: setter.key,
                            created: null,
                            version: null,
                            entityId: setter.entityId,
                            modified: timestamp,
                            expires,
                            ttl: setter.ttl ? Math.round(setter.ttl / 1000) : undefined,
                            value: setter.value
                        };
                        const existingItem = currentVariables.get(itemId);
                        if (setter.version == null || setter.force) {
                            // Force update or new item
                            if (existingItem && !setter.force) {
                                // This is a new item operation but item exists
                                results.set(itemId, {
                                    status: types.VariableResultStatus.Conflict,
                                    ...types.extractVariable(existingItem)
                                });
                                return util.skip;
                            }
                            var _existingItem_created;
                            // Add created timestamp from existing item
                            itemToUpsert.created = (_existingItem_created = existingItem === null || existingItem === void 0 ? void 0 : existingItem.created) !== null && _existingItem_created !== void 0 ? _existingItem_created : timestamp;
                        } else {
                            // Version-specific update
                            if (!existingItem) {
                                results.set(itemId, {
                                    status: types.VariableResultStatus.NotFound,
                                    ...key
                                });
                                return util.skip;
                            }
                            if (existingItem.version !== setter.version) {
                                results.set(itemId, {
                                    status: types.VariableResultStatus.Conflict,
                                    ...types.extractVariable(existingItem)
                                });
                                return util.skip;
                            }
                            var _existingItem_created1;
                            itemToUpsert.created = (_existingItem_created1 = existingItem === null || existingItem === void 0 ? void 0 : existingItem.created) !== null && _existingItem_created1 !== void 0 ? _existingItem_created1 : timestamp;
                        }
                        return [
                            setter,
                            {
                                operationType: "Upsert",
                                resourceBody: itemToUpsert,
                                ifMatch: setter.force ? undefined : existingItem ? existingItem.version : ""
                            },
                            (response)=>response.resourceBody && {
                                    status: response.statusCode === 201 ? types.VariableResultStatus.Created : types.VariableResultStatus.Success,
                                    ...types.extractVariable(cosmosItemToVariable(response.resourceBody))
                                }
                        ];
                    });
                    const bulkResults = await this._bulkWithRetry("set", container, operations.map((operation)=>operation[1]));
                    let i = 0;
                    const conflictKeys = [];
                    for (const bulkResult of bulkResults){
                        const [setter, , handler] = operations[i++];
                        if (bulkResult.statusCode === 409 || bulkResult.statusCode === 412) {
                            conflictKeys.push(setter);
                            continue;
                        }
                        var _handler;
                        const result = (_handler = handler(bulkResult)) !== null && _handler !== void 0 ? _handler : {
                            status: types.VariableResultStatus.Error,
                            ...setter,
                            error: `Unexpected response from Cosmos (${bulkResult.statusCode}): ${JSON.stringify(bulkResult.resourceBody)}`
                        };
                        results.set(mapCosmosId(setter), result);
                    }
                    if (conflictKeys.length) {
                        const conflictResults = await this._getVariables(container, conflictKeys);
                        for (const key of conflictKeys){
                            const cosmosId = mapCosmosId(key);
                            const current = conflictResults.get(cosmosId);
                            results.set(cosmosId, current ? {
                                status: types.VariableResultStatus.Conflict,
                                ...current
                            } : {
                                status: types.VariableResultStatus.NotFound,
                                ...key
                            });
                        }
                    }
                });
            }
        }
        return values.map((setter)=>{
            const itemId = mapCosmosId(setter);
            var _results_get;
            return (_results_get = results.get(itemId)) !== null && _results_get !== void 0 ? _results_get : util.throwError(`INV: All setter keys are mapped to operations. ${itemId} was not.`);
        });
    }
    async purge(queries) {
        let n = 0;
        for await (const { scope, results } of this._query(queries, {
            projection: [
                "id",
                "entityId"
            ]
        })){
            await this._execute(async (db)=>{
                const container = await this._getScopeContainer(db, scope);
                n += results.length;
                await this._bulkWithRetry("purge", container, results.map((item)=>({
                        operationType: "Delete",
                        id: item.id,
                        partitionKey: item.entityId
                    })));
            });
        }
        return n;
    }
    async *_query(queries, { projection, cursor } = {}) {
        const match = cursor === null || cursor === void 0 ? void 0 : cursor.match(/^([^:]+)(?::(.*))?$/);
        let cursorQueryIndex = +((match === null || match === void 0 ? void 0 : match[1]) || -1);
        let i = -1;
        for (const [scope, scopeQueries] of util.group(queries, (query)=>[
                query.scope,
                query
            ])){
            for (const query of scopeQueries){
                if (++i < cursorQueryIndex) {
                    continue;
                }
                let continuationToken = i === cursorQueryIndex && (match === null || match === void 0 ? void 0 : match[2]) || undefined;
                while(true){
                    const [items, nextToken] = await this._execute(async (db)=>{
                        const container = await this._getScopeContainer(db, scope);
                        const querySpec = queryFilterToCosmosQuery(this._containerPerScope, query);
                        if (projection && projection.length > 0) {
                            const selectFields = [
                                "c.id",
                                ...util.map(projection, (field)=>field === "id" ? util.skip : `c.${field}`)
                            ];
                            querySpec.query = querySpec.query.replace("SELECT *", `SELECT ${selectFields.join(", ")}`);
                        }
                        const cursor = container.items.query(querySpec, {
                            maxItemCount: this._batchSize,
                            continuationToken
                        });
                        const page = await cursor.fetchNext();
                        continuationToken = page.continuationToken;
                        return [
                            page.resources.map(cosmosItemToVariable),
                            page.hasMoreResults ? page.continuationToken : undefined
                        ];
                    });
                    yield {
                        scope,
                        cursor: nextToken ? `${i}:${nextToken}` : `${i + 1}`,
                        results: items
                    };
                    if (!(continuationToken = nextToken)) {
                        break;
                    }
                }
            }
        }
    }
    async renew(queries) {
        let n = 0;
        const timestamp = util.now();
        for await (const { scope, results } of this._query(queries, {
            projection: [
                "ttl",
                "scope",
                "id",
                "entityId"
            ]
        })){
            await this._execute(async (db)=>{
                n += results.length;
                const container = await this._getScopeContainer(db, scope);
                const upserts = util.map(results, (projection)=>{
                    if (!projection.ttl) {
                        return util.skip;
                    }
                    return {
                        operationType: "Patch",
                        id: projection.id,
                        partitionKey: projection.entityId,
                        resourceBody: {
                            operations: [
                                {
                                    op: "set",
                                    path: "/expires",
                                    value: timestamp + projection.ttl * 1000
                                },
                                {
                                    op: "set",
                                    path: "/ttl",
                                    value: Math.round(projection.ttl / 1000)
                                }
                            ]
                        }
                    };
                });
                await this._bulkWithRetry("renew", container, upserts);
            });
        }
        return n;
    }
    async query(queries, { cursor: currentCursor } = {}) {
        for await (const { results, cursor } of this._query(queries, {
            cursor: currentCursor
        })){
            return {
                variables: results.map(cosmosItemToVariable),
                cursor
            };
        }
        return {
            variables: []
        };
    }
    constructor(settings){
        super(settings), _define_property$1(this, "_containers", new Map());
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
class CosmosDbExtension extends CosmosDbTarget {
    patchStorageMappings(mappings) {
        if (!this._storageScopes) return;
        const variableStorage = new CosmosDbVariableStorage(this._settings);
        for (const scope of this._storageScopes){
            var _mappings, _scope, _ref;
            var _, _storage;
            (_storage = (_ref = (_ = (_mappings = mappings)[_scope = scope]) !== null && _ !== void 0 ? _ : _mappings[_scope] = {}).storage) !== null && _storage !== void 0 ? _storage : _ref.storage = variableStorage;
        }
    }
    async post({ events }) {
        await this._execute(async (db)=>{
            const container = await this._getOrCreateContainer(db, "events", ()=>({
                    partitionKey: {
                        paths: [
                            "/session/sessionId"
                        ]
                    }
                }));
            await container.items.bulk(events.map((event)=>({
                    operationType: "Create",
                    resourceBody: event
                })));
        });
    }
    constructor({ variables = true, ...settings }){
        super(settings), _define_property(this, "id", "cosmosdb"), _define_property(this, "_storageScopes", void 0);
        if (variables) {
            this._storageScopes = variables === true ? types.VariableServerScope.levels : variables;
            if (!this._storageScopes.length) {
                this._storageScopes = undefined;
            }
        }
    }
}

exports.CosmosDbExtension = CosmosDbExtension;
exports.CosmosDbVariableStorage = CosmosDbVariableStorage;

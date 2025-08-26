'use strict';

var mongodb = require('mongodb');
var util = require('@tailjs/util');

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
class MongoDbTarget {
    async _execute(action) {
        return await util.withRetry(async ()=>{
            var client = new mongodb.MongoClient(this._settings.url);
            try {
                await client.connect();
                const db = client.db(this._settings.database);
                return await action(db);
            } finally{
                client.close();
            }
        });
    }
    constructor(settings){
        _define_property$1(this, "_settings", void 0);
        this._settings = settings;
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
class MongoDbExtension extends MongoDbTarget {
    async post({ events }) {
        await this._execute(async (db)=>{
            const collection = db.collection("events");
            if (!await collection.indexExists("timestamp")) {
                await collection.createIndex({
                    timestamp: 1
                }, {
                    name: "timestamp"
                });
            }
            if (!await collection.indexExists("session")) {
                await collection.createIndex({
                    "session.sessionId": 1
                }, {
                    name: "session"
                });
            }
            await collection.insertMany(events);
        });
    }
    constructor(...args){
        super(...args), _define_property(this, "id", "mongodb");
    }
}

exports.MongoDbExtension = MongoDbExtension;

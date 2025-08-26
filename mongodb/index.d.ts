import { TrackerExtension, TrackedEventBatch } from '@tailjs/engine';
import { Db } from 'mongodb';

interface MongoDbSettings {
    url: string;
    database: string;
}

declare class MongoDbTarget {
    private readonly _settings;
    constructor(settings: MongoDbSettings);
    protected _execute<T>(action: (db: Db) => Promise<T>): Promise<T>;
}

declare class MongoDbExtension extends MongoDbTarget implements TrackerExtension {
    readonly id = "mongodb";
    post({ events }: TrackedEventBatch): Promise<void>;
}

export { MongoDbExtension, type MongoDbSettings };

import { TrackerEnvironmentInitializable, TrackerEnvironment, HttpRequest, HttpResponse, TrackerExtension, VariableStorageMappings, TrackedEventBatch, Tracker, VariableStorage, VariableStorageQuery } from '@tailjs/engine';
import { VariableServerScope, ReadOnlyVariableGetter, VariableGetResult, VariableValueSetter, VariableSetResult, VariableQueryOptions, VariableQueryResult } from '@tailjs/types';

interface RavenDbSettings {
    url: string;
    database: string;
    /**
     *  The maximum number of times to retry on transient exceptions.
     *  @default 5
     */
    maxRetries?: number;
    /** The delay between each retry, if a transient exception occurred. */
    retryDelay?: number;
    x509?: ({
        cert: Uint8Array | string;
        certPath?: undefined;
    } | {
        cert?: undefined;
        certPath: string;
    }) & ({
        key?: string;
    } | {
        keyPath: string;
    });
}

declare abstract class RavenDbTarget implements TrackerEnvironmentInitializable {
    protected readonly _settings: RavenDbSettings;
    protected _env: TrackerEnvironment;
    protected _cert?: HttpRequest["x509"];
    abstract id: string;
    constructor(settings: RavenDbSettings);
    initialize(env: TrackerEnvironment): Promise<void>;
    protected _request(method: string, relativeUrl: string, body?: any, headers?: {
        [name: string]: string | undefined;
    }): Promise<HttpResponse & {
        error?: any;
    }>;
}

interface RavenDbExtensionSettings extends RavenDbSettings, RavenDbVariableStorageSettings {
    variables?: boolean | VariableServerScope[];
}
/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */
declare class RavenDbExtension extends RavenDbTarget implements TrackerExtension {
    readonly id = "ravendb";
    private _lock;
    private _storageScopes?;
    constructor({ variables, ...settings }: RavenDbExtensionSettings);
    private _nextId;
    private _idIndex;
    private _idRangeMax;
    private _idBatchSize;
    patchStorageMappings(mappings: VariableStorageMappings): void;
    post({ events }: TrackedEventBatch, tracker: Tracker): Promise<void>;
}
/** @obsolete Use the name RavenDbExtension instead. */
declare const RavenDbTracker: typeof RavenDbExtension;

interface RavenDbVariableStorageSettings extends RavenDbSettings {
    /**
     * Expired variables are deleted at this interval (s).
     *
     * Tail.js will configure this in your RavenDB cluster at startup.
     * If you do not want tail.js to touch the configuration of your cluster, set this value to `false` or a non-positive number.
     *
     * [Read about document expiration here](https://ravendb.net/docs/article-page/6.2/nodejs/server/extensions/expiration)
     *
     * @default 60
     */
    cleanExpiredFrequency?: number | false;
}
declare class RavenDbVariableStorage extends RavenDbTarget implements VariableStorage {
    readonly id = "ravendb-variables";
    private readonly _cleanExpiredFrequency;
    constructor({ cleanExpiredFrequency, ...settings }: RavenDbVariableStorageSettings);
    initialize(env: TrackerEnvironment): Promise<void>;
    get(keys: readonly ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;
    set(setters: readonly VariableValueSetter[]): Promise<VariableSetResult[]>;
    purge(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
    renew(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
    query(queries: readonly VariableStorageQuery[], { page, cursor }?: VariableQueryOptions): Promise<VariableQueryResult>;
}

export { RavenDbExtension, type RavenDbExtensionSettings, type RavenDbSettings, RavenDbTracker, RavenDbVariableStorage, type RavenDbVariableStorageSettings };

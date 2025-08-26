import { TrackerEnvironment, TrackerExtension, VariableStorageMappings, TrackedEventBatch, VariableStorage, VariableStorageQuery } from '@tailjs/engine';
import { Database, ContainerRequest, Container, OperationInput, OperationResponse } from '@azure/cosmos';
import { VariableServerScope, ReadOnlyVariableGetter, VariableGetResult, VariableValueSetter, VariableSetResult, VariableQueryOptions, VariableQueryResult } from '@tailjs/types';

interface CosmosDbSettings {
    /**
     * The endpoint URI for the Cosmos DB account.
     * You can find this e.g. by going to the Cosmos DB account in the Azure portal, and look under Settings->Keys.
     */
    endpoint: string;
    /**
     *
     */
    key: string;
    /**
     * The name of the Cosmos DB database at the specified endpoint.
     */
    database: string;
    /**
     * The maximum number of times an operation is retried after 429 (too many requests) errors with no progress, before giving up.
     *
     * @default 5
     */
    maxRetries?: number;
    /**
     * The maximum number of times an operation is retried after transient errors before giving up.
     *
     * @default 5
     */
    maxErrorRetries?: number;
    /**
     * Number of milliseconds to way between each retry on transient errors.
     *
     * @default 500
     */
    retryDelay?: number;
    /**
     * Number of bulk operations per batch when inserting, updating, and deleting.
     *
     * @default 100
     */
    batchSize?: number;
    /**
     * Create a container per variable scope instead of using a shared one.
     * This enables clearer separation between, say, session and user data, yet it also requires more RU.
     *
     * @default false.
     */
    containerPerScope?: boolean;
}

declare class CosmosDbTarget {
    protected readonly _settings: CosmosDbSettings;
    protected _containerPerScope: boolean;
    protected _batchSize: number;
    constructor(settings: CosmosDbSettings);
    protected _getOrCreateContainer(database: Database, name: string, configure?: () => Omit<ContainerRequest, "id">): Promise<Container>;
    private _env;
    initialize(env: TrackerEnvironment): Promise<void>;
    protected _bulkWithRetry(errorTrace: string, container: Container, operations: OperationInput[]): Promise<OperationResponse[]>;
    protected _execute<T>(action: (db: Database, previousError?: any) => Promise<T>): Promise<T>;
}

interface CosmosDbExtensionSettings extends CosmosDbSettings {
    variables?: boolean | VariableServerScope[];
}
declare class CosmosDbExtension extends CosmosDbTarget implements TrackerExtension {
    readonly id = "cosmosdb";
    private _storageScopes?;
    constructor({ variables, ...settings }: CosmosDbExtensionSettings);
    patchStorageMappings(mappings: VariableStorageMappings): void;
    post({ events }: TrackedEventBatch): Promise<void>;
}

declare class CosmosDbVariableStorage extends CosmosDbTarget implements VariableStorage {
    private _containers;
    constructor(settings: CosmosDbSettings);
    private _getScopeContainer;
    get(getters: readonly ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;
    private _getVariables;
    set(values: readonly VariableValueSetter[]): Promise<VariableSetResult[]>;
    purge(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
    private _query;
    renew(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
    query(queries: readonly VariableStorageQuery[], { cursor: currentCursor }?: VariableQueryOptions): Promise<VariableQueryResult>;
}

export { CosmosDbExtension, type CosmosDbExtensionSettings, type CosmosDbSettings, CosmosDbVariableStorage };

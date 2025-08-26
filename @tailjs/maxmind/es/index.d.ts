import * as _tailjs_engine from '@tailjs/engine';
import { TrackerExtension, SchemaBuilder, TrackedEventBatch, NextPatchExtension, Tracker, TrackerEnvironment } from '@tailjs/engine';

type MmdbUrl = {
    fileName?: string;
    url: string;
    headers?: Record<string, string>;
};
type ClientLocationConfiguration = {
    language?: string;
    mmdb?: string;
    source?: MmdbUrl;
    accountId?: string;
    apiKey?: string;
};
declare class ClientLocation implements TrackerExtension {
    private readonly _language;
    private readonly _mmdbPath;
    private readonly _mmdbSource;
    private _initialized;
    private _reader;
    readonly id = "ClientLocation";
    constructor({ language, mmdb, source, }?: ClientLocationConfiguration);
    registerTypes(schema: SchemaBuilder): void;
    patch({ events }: TrackedEventBatch, next: NextPatchExtension, tracker: Tracker): Promise<_tailjs_engine.ServerTrackedEvent[]>;
    filterNames<T = any>(parent: T, language?: string): T | undefined;
    initialize(host: TrackerEnvironment): Promise<void>;
}

export { ClientLocation, type ClientLocationConfiguration };

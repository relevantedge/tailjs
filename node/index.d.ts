import { LogLevel, LogMessage, EngineHost, ResourceEntry, ChangeHandler, HttpRequest, HostResponse, ClientRequest, BootstrapSettings, Tracker, ClientResponseCookie, RequestHandler, EventLogger } from '@tailjs/engine';
import * as http from 'http';
import { MaybePromise as MaybePromise$1, Nullish } from '@tailjs/util';

interface DefaultLoggerSettings {
    /**
     * If specified, log messages will be written to files in this directory.
     * If set to `false`, messages will not be logged to the file system.
     *
     * Paths are resolved relatively to the {@link NativeHost}'s root directory.
     *
     * @default "logs"
     */
    basePath?: string | false;
    /**
     * The minimum level to log.
     */
    level?: LogLevel;
    /**
     * Whether to (also) log messages to the console.
     *
     * @default "info"
     */
    console?: LogLevel | false;
    /**
     * Maximum size of a single log file in bytes.
     *
     * @default 52428800 (10 MiB)
     */
    maxSize?: number;
    /**
     * The maximum number of log files to keep.
     *
     * @default 20
     */
    maxFiles?: number;
}
/** Default logger for {@link NativeHost}. It uses winston internally. */
declare class DefaultLogger implements NativeHostLogger {
    private readonly _settings;
    private readonly _groupLoggers;
    constructor(settings: DefaultLoggerSettings);
    _rootPath: string | null | undefined;
    initialize(rootPath: string | null): void;
    log(message: LogMessage): void;
}

type NativeHostLogger = {
    initialize?(rootPath: string | null): MaybePromise$1<void>;
    log(message: LogMessage): void;
};
interface NativeHostSettings {
    rootPath: string | false;
    /**
     * How to log messages.
     *
     * @default DefaultLoggerSettings (with default settings).
     */
    logger?: NativeHostLogger | DefaultLoggerSettings | "console" | false;
}
declare class NativeHost implements EngineHost {
    private readonly _rootPath;
    private readonly _logger;
    constructor({ rootPath, logger }: NativeHostSettings);
    ls(path: string): Promise<ResourceEntry[] | null>;
    private _throttleStats;
    private _initialized;
    log(message: LogMessage): any;
    read(path: string, changeHandler?: ChangeHandler<Uint8Array>): Promise<Uint8Array | null>;
    readText(path: string, changeHandler?: ChangeHandler<string>): Promise<string | null>;
    write(path: string, data: Uint8Array): Promise<void>;
    writeText(path: string, data: string): Promise<void>;
    delete(path: string): Promise<boolean>;
    private _resolvePath;
    private _read;
    request<Binary extends boolean = false>(request: HttpRequest<Binary>): Promise<HostResponse<Binary extends true ? Uint8Array : string>>;
    decompress(data: Uint8Array, algorithm: "tar" | "zip" | "tar.gz"): Promise<{
        name: string;
        data: Uint8Array;
    }[]>;
    compress(data: Uint8Array | string, algorithm: "br" | "gzip"): Promise<Uint8Array | Nullish>;
    nextId(scope: string): Promise<string> | string;
}

type MaybePromise<T> = T | Promise<T>;
/**
 * The minimal subset of {@link http.IncomingMessage} and the parsed request payload required by the middleware.
 * If a client IP is not specified explicitly, an attempt to resolve it from common headers and NodeJS internals
 * (in other words, you do not need to do this yourself if the request is some variation of a standard {@link http.IncomingMessage} request).
 */
interface TailJsMiddlewareRequest extends Pick<ClientRequest, "clientIp" | "body">, Pick<http.IncomingMessage, "url" | "method" | "headers"> {
}
interface TailJsRouteRequest extends Pick<Request, "url" | "method" | "headers" | "body"> {
    ip?: string;
}
interface TailJsMiddlewareResponse extends Pick<http.ServerResponse, "statusCode" | "getHeader" | "writeHead"> {
    setHeader(name: string, value: string | string[]): void;
    end(chunk?: any, encoding?: string): void;
}
type TailJsMiddleware = <T = void>(request: TailJsMiddlewareRequest, response: TailJsMiddlewareResponse, next?: (err?: any) => T | Promise<T>) => Promise<T>;
type TailJsRouteHandler = (request: Request) => Promise<Response>;
interface TailJsMiddlewareConfiguration extends Omit<BootstrapSettings, "host" | "endpoint">, Pick<NativeHostSettings, "logger"> {
    /**
     * The endpoint for the tracker script / API.
     *
     * If external rewrites are used you can pass the {@link ProcessRequestOptions.matchAnyPath} option
     * to {@link RequestHandler.processRequest} instead of configuring the endpoint explicitly here.
     * @default "/_t.js"
     */
    endpoint?: string;
    /**
     * Match any path as the script API route.
     * These is useful for configuration external rewrites without having to also mirror them in the tail.js configuration.
     */
    matchAnyPath?: boolean;
    /**
     * The path to tail.js resources directory.
     * If `false`, an "empty" filesystem is used, that is nothing can get read or written.
     *
     * @default ./res
     */
    resourcesPath?: string | false;
}
interface DisposableTracker extends Tracker {
    dispose(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
}
type TailJsMiddlewareConfigurationSource = TailJsMiddlewareConfiguration | null | undefined | TailJsMiddlewareConfigurationResolver | TailJsMiddlewareConfigurationSource[] | Promise<TailJsMiddlewareConfigurationSource> | {
    default: TailJsMiddlewareConfigurationSource;
};
type TrackerFromRequest = Tracker & {
    /** Adds the headers that reflects changes made with the tracker to the response. */
    updateResponse<T extends Response>(response: T): T;
};
type TrackerResolver = {
    (request: TailJsMiddlewareRequest, response: TailJsMiddlewareResponse): Promise<DisposableTracker | undefined>;
    (request: TailJsRouteRequest): Promise<(DisposableTracker & {
        writeTo<T extends Response>(response: T): Promise<T>;
        json(payload: any): Promise<Response>;
        getFinalCookies(): Promise<ClientResponseCookie[]>;
    }) | undefined>;
};
interface TailJsServerContext {
    middleware: TailJsMiddleware;
    routeHandler: TailJsRouteHandler;
    resolveTracker: TrackerResolver;
}
type TailJsMiddlewareConfigurationResolver = (current: TailJsMiddlewareConfiguration) => MaybePromise<TailJsMiddlewareConfiguration>;

/**
 * Use this method to add configuration to the middleware before it is created.
 *
 * Note that this assumes you are using the middleware as a singleton
 * which means you should not use this function if you intend to have multiple middleware instances.
 */
declare const addTailJsConfiguration: (configuration: TailJsMiddlewareConfigurationSource, replace?: boolean) => void;
declare const createServerContext: {
    (settings?: TailJsMiddlewareConfigurationSource, initializeOnFirstRequest?: false, defaults?: Partial<TailJsMiddlewareConfiguration>): Promise<TailJsServerContext>;
    (settings: TailJsMiddlewareConfigurationSource, initializeOnFirstRequest: true, defaults?: Partial<TailJsMiddlewareConfiguration>): TailJsServerContext;
    (requestHandler: RequestHandler): TailJsServerContext;
};

declare const serve: ({ host, port, ...settings }?: TailJsMiddlewareConfiguration & ({
    host?: string;
    port?: undefined;
} | {
    port?: number;
    host?: undefined;
})) => Promise<void>;

/** Logs collected tracker events to the console. */
declare class ConsoleLogger extends EventLogger {
    constructor();
}

export { ConsoleLogger, DefaultLogger, type DefaultLoggerSettings, type DisposableTracker, NativeHost, type NativeHostLogger, type NativeHostSettings, type TailJsMiddleware, type TailJsMiddlewareConfiguration, type TailJsMiddlewareConfigurationResolver, type TailJsMiddlewareConfigurationSource, type TailJsMiddlewareRequest, type TailJsMiddlewareResponse, type TailJsRouteHandler, type TailJsRouteRequest, type TailJsServerContext, type TrackerFromRequest, type TrackerResolver, addTailJsConfiguration, createServerContext, serve };

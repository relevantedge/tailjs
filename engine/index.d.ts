import { Tag, TrackedEvent, Session, SignInEvent, PostResponse, UserConsent, DataUsage, SessionInfo, DeviceInfo, ServerScoped, Variable, Timestamp, VariableOperationParameter, VariableGetter, WithCallbacks, VariableOperationResult, VariableKey, VariableSetter, VariableQuery, VariableServerScope, VariableQueryOptions, VariableQueryResult, VariablePurgeOptions, SchemaDefinition, OptionalPurposes, ScopeVariables, VariableGetResult, VariableValueSetter, VariableSetResult, ReadOnlyVariableGetter, KnownVariableMap, TypeResolver } from '@tailjs/types';
import * as _tailjs_util from '@tailjs/util';
import { Falsish, Wrapped, MaybePromiseLike, JsonObject, DeferredAsync, Freeze, Nullish, ReadonlyRecord, ArrayOrSelf, AllRequired, MaybePromise, MaybeUndefined } from '@tailjs/util';
import { HashFunction, Transport, Encodable } from '@tailjs/transport';
import { TrackerClientConfiguration as TrackerClientConfiguration$1 } from '@tailjs/client/external';
import { TrackerClientConfiguration } from '@tailjs/client';

interface ExtensionError {
    code: number;
    reason?: string;
    details?: string;
}

interface Cookie {
    maxAge?: number;
    /** @default  false */
    httpOnly?: boolean;
    /** @default "Lax" */
    sameSitePolicy?: "Strict" | "Lax" | "None";
    essential?: boolean;
    value?: string | null | undefined;
    /** @default false */
    fromRequest?: boolean;
}
interface ClientResponseCookie extends Cookie {
    essential: boolean;
    headerString: string;
    httpOnly: boolean;
    name: string;
    sameSitePolicy: Required<Cookie["sameSitePolicy"]>;
    secure: boolean;
}

/** Outputs collected tracker events to either the log or the console. */
declare class EventLogger implements TrackerExtension {
    readonly configuration: {
        group?: string;
        minimal?: boolean;
        console?: boolean;
    };
    readonly id = "event-logger";
    constructor(configuration: {
        group?: string;
        minimal?: boolean;
        console?: boolean;
    });
    post({ events }: TrackedEventBatch, tracker: Tracker): Promise<void>;
}

interface CryptoProvider {
    hash: HashFunction<string>;
    decrypt(cipher: string): any;
    encrypt(source: any): string;
}

/**
 * A crypto provider based on linear feedback XOR, entropy and padding.
 */
declare class DefaultCryptoProvider implements CryptoProvider {
    private readonly _currentCipherId;
    private readonly _ciphers;
    constructor(keys: string[] | null | undefined);
    hash(value: string, numericOrBits?: any): string;
    decrypt(cipher: string): any;
    encrypt(source: string): string;
}

interface BootstrapSettings extends Pick<RequestHandlerConfiguration, "cookies" | "defaultConsent" | "json" | "storage" | "schemas" | "environment" | "sessionTimeout" | "additionalPurposes"> {
    /** The host implementation to use.  */
    host: EngineHost;
    /**
     * The absolute URL to the Tail.js endpoint.
     *
     * @default /_t.js
     */
    endpoint?: string;
    /** {@link TrackerExtension}s that are loaded into the request handler.  */
    extensions?: Iterable<Falsish | TrackerExtension | (() => Promise<TrackerExtension> | TrackerExtension)>;
    /**
     * Whether event types that are not defined in a schema are allowed.
     * Only use this as a last resort if you have a burning deadline, and then make amends for your crime later.
     */
    allowUnknownEventTypes?: boolean;
    /**
     * Keys used for encryption.
     *
     * The first one is the active one, that is, all future communication will use this key.
     *
     * Key rollover is supported by adding keys once in a while.
     * If you delete keys be aware that you may lose old data from devices that were using that key.
     */
    encryptionKeys?: string[];
    /**
     * Whether to use the debug script that is easier to debug.
     * May also be a path to another script than the one bundled with the engine. This is useful for development.
     *
     */
    debugScript?: boolean | string;
    /**
     * If your deployment has multiple servers or environments, this can be used to identify them in the collected data.
     * These tags will only be added to {@link SessionStartedEvent}s.
     */
    environmentTags?: Tag[];
    /**
     * Configuration for the client script.
     */
    client?: Omit<TrackerClientConfiguration, "src">;
}
declare function bootstrap(settings: BootstrapSettings): RequestHandler;

interface ClientCertificate {
    id: string;
    pfx?: boolean;
    cert: Uint8Array | string;
    key?: string;
}

interface HttpRequest<Binary extends boolean = false> {
    body?: Binary extends true ? Uint8Array : string;
    binary?: Binary;
    headers?: Record<string, string>;
    method?: string;
    url: string;
    x509?: ClientCertificate;
}
interface ClientRequestHeaders {
    url: string | null;
    method: string;
    /**
     * The headers send by the client.
     * Be aware that all header names are normalized to lowercase (which is the responsibility of the host environments).
     */
    headers: Record<string, string | readonly string[] | undefined>;
    clientIp?: string | null;
}
interface ClientRequest extends ClientRequestHeaders {
    sessionReferenceId?: string;
    body?: Wrapped<MaybePromiseLike<Uint8Array | string | JsonObject | null | undefined>>;
}

interface HttpResponse<Binary extends boolean = false> {
    body: Binary extends true ? Uint8Array : string;
    cookies: Record<string, Cookie>;
    headers: Record<string, string>;
    request: HttpRequest<Binary>;
    status: number;
}
interface CallbackResponse {
    body?: string | Uint8Array;
    cacheKey?: string;
    cookies?: ClientResponseCookie[];
    error?: Error;
    headers: Record<string, string>;
    status: number;
}

type NextPatchExtension = (events: ParseResult[]) => Promise<ServerTrackedEvent[]>;
interface ServerTrackedEvent extends TrackedEvent {
    readonly id: string;
    timestamp: number;
    session: Session;
}
type TrackedEventBatch = {
    events: (ServerTrackedEvent & Record<string, any>)[];
};
type TrackerExtensionContext = {
    passive: boolean;
};
interface TrackerEnvironmentInitializable {
    initialize?(environment: TrackerEnvironment): MaybePromiseLike<void>;
}
/**
 * Tracker extensions enable the engine to interface with external systems, typically to store the collected events somewhere.
 * It may also be to extend the events collected from the client with additional data with Geo IP information being the canonical example.
 *
 * Without any extensions, nothing happens after events have been collected from clients.
 *
 * Since that is not very useful by itself, a common use case for extensions is to store the collected events in a database or forwarding them to a CDP.
 * You may also have some legacy analytics solutions, or even run more than one side-by-side. In such case tail.js
 * Since any number of extensions can be loaded with the engine, this concept allows the collected events to "fan out", that is, store them in different systems for different purposes.
 * For the latter use case you can think of tail.js as a "reverse proxy on steroids".
 *
 * Typically you should want to store all the raw event data in some kind of cheap storage, so they can later be used for reporting.
 * You may also want to send certain significant events/conversions to a CRM or CDP because they are used for personalization or some business process like a customer changing lead status after filling out a form.
 **
 *
 * Extensions may do anything from altering, updating and/or adding events before they are processed by other extensions.
 *
 * Be aware this interface my be split into separate interfaces for the different purposes in the future, but the
 * methods will keep their signatures to make this non-breaking.
 */
interface TrackerExtension extends TrackerEnvironmentInitializable {
    readonly id: string;
    /** This method is called before the extension is initialized allowing it to export is variable types and similar. */
    registerTypes?(schema: SchemaBuilder): void;
    /**
     * Allows the extension to update the RequestHandler's storage mappings as an alternative to configuration.
     *
     * This may be convenient if an extension both comes with event and variable logic (e.g. @tailjs/ravendb).
     */
    patchStorageMappings?(mappings: VariableStorageMappings): void;
    apply?(tracker: Tracker, context: TrackerExtensionContext): MaybePromiseLike<void>;
    patch?(events: TrackedEventBatch, next: NextPatchExtension, tracker: Tracker, context: TrackerExtensionContext): MaybePromiseLike<ParseResult[]>;
    post?(events: TrackedEventBatch, tracker: Tracker, context: TrackerExtensionContext): MaybePromiseLike<void>;
    getClientScripts?(tracker: DeferredAsync<Tracker>): ClientScript[] | undefined | null;
    validateSignIn?(tracker: Tracker, event: SignInEvent): Promise<boolean>;
}
/**
 * Definition of a additional client-side scripts that will get loaded with the tracker.
 */
type ClientScript = {
    /** An external source for the script. */
    src: string;
    /** The script can be loaded asynchronously. */
    defer?: boolean;
} | {
    /** A script expression that will get evaluated directly. */
    inline: string;
    /** There are dependencies between this script expression and others. If not, inline scripts can be merged more efficiently.  */
    allowReorder?: boolean;
};

declare function getErrorMessage(validationResult: any): any;
type ValidationErrorResult = {
    error: string;
    source: any;
};
declare const isValidationError: (item: any) => item is ValidationErrorResult;
type ParseResult = TrackedEvent | ValidationErrorResult;

declare const MAX_CACHE_HEADERS: {
    readonly "cache-control": "private, max-age=2147483648";
};
declare let SCRIPT_CACHE_HEADERS: {
    readonly "cache-control": "private, max-age=604800";
};
type ProcessRequestOptions = {
    /**
     * Any path is considered the main API route.
     * This is useful when rewriting this route from a reverse proxy without having to change the tracker configuration.
     */
    matchAnyPath?: boolean;
    /**
     * The request comes from a trusted context (typically, server-side tracking).
     */
    trustedContext?: boolean;
};
declare class RequestHandler {
    private readonly _cookies;
    private readonly _extensionFactories;
    private readonly _lock;
    private _schema;
    private readonly _trackerName;
    private _extensions;
    private _initialized;
    private _script;
    private readonly _clientConfig;
    private readonly _config;
    private readonly _defaultConsent;
    private readonly _host;
    readonly instanceId: string;
    readonly endpoint: string;
    readonly environment: TrackerEnvironment;
    constructor(config: RequestHandlerConfiguration);
    applyExtensions(tracker: Tracker, context: TrackerExtensionContext): Promise<void>;
    /**
     * This method must be called once when all operations have finished on the tracker
     * returned from {@link processRequest} outside the main API route to get the cookies
     * for the response when the tracker has been used externally.
     */
    getClientCookies(tracker: Tracker | undefined): Promise<ClientResponseCookie[]>;
    getClientScripts(tracker: DeferredAsync<Tracker>, { initialCommands, nonce }?: {
        initialCommands?: any;
        nonce?: string;
    }): Promise<string | undefined>;
    private _scriptCache;
    initialize(): Promise<void>;
    private _validateEvents;
    post(tracker: Tracker, eventBatch: TrackedEvent[], options: TrackerPostOptions): Promise<PostResponse>;
    private _clientKeys;
    private _getClientEncryptionKey;
    private _getConfiguredClientScript;
    processRequest(request: ClientRequest, { matchAnyPath, trustedContext }?: ProcessRequestOptions): Promise<{
        tracker: DeferredAsync<Tracker>;
        response: CallbackResponse | null;
    } | null>;
    private _getClientScripts;
    private _logExtensionError;
}

type TrackerServerConfiguration = {
    disabled?: boolean;
    /** Transport used for client-side communication with a key unique('ish) to the client. */
    transport?: Transport;
    clientIp?: string | null;
    headers?: Record<string, string>;
    host?: string;
    path: string;
    url: string;
    defaultConsent: UserConsent;
    /**
     * A pseudo-unique identifier based on information from the client's request.
     * If this is not provided cookie-less tracking will be disabled.
     */
    anonymousSessionReferenceId?: string;
    queryString: Record<string, string[]>;
    cookies?: Record<string, Cookie>;
    requestHandler: RequestHandler;
    trustedContext?: boolean;
} & Pick<RequestHandlerConfiguration, "additionalPurposes">;
interface TrackerInitializationOptions {
    deviceSessionId?: string;
    deviceId?: string;
    userId?: string;
    passive?: boolean;
}
interface TrackerPostOptions extends TrackerInitializationOptions {
    /**
     * The events are for an external client-side tracker.
     * This flag enables server-side generated events to be routed to an external destination via the client.
     *
     * This only works if an appropriate extension has been added to the client-side tracker to pick them ups.
     */
    routeToClient?: boolean;
}
type TrackerVariableStorageContext = Omit<VariableStorageContext, "scope">;
type TrackerSnapshot = {
    consent: Freeze<DataUsage>;
    session: Freeze<SessionInfo>;
    device?: Freeze<DeviceInfo>;
};
type SessionChangedCallback = (current: TrackerSnapshot, previous?: TrackerSnapshot) => void;
declare class Tracker {
    /**
     * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
     *
     * Without this queue this might happen if one of the first extensions posted an event in the apply method.
     * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
     */
    private _eventQueue;
    private _extensionState;
    private _initialized;
    private _requestId;
    readonly clientIp: string | Nullish;
    readonly cookies: Record<string, Cookie>;
    readonly disabled: boolean;
    readonly env: TrackerEnvironment;
    readonly headers: ReadonlyRecord<string, string>;
    readonly queryString: ReadonlyRecord<string, string[]>;
    readonly referrer: string | null;
    /** Can be used by extensions for book-keeping during a request.  */
    private readonly _requestItems;
    private readonly _sessionChangedEvent;
    /** Transient variables that can be used by extensions whilst processing a request. */
    readonly transient: Record<string, any>;
    /**
     * Whether the tracker has been instantiated in a trusted context.
     * A trusted context is when the tracker's API is used for server-side tracker.
     *
     * Signing in without evidence is only possible in trusted contexts.
     *
     * Extensions may use this flag for additional functionality that is only available in server-side tracking context.
     */
    readonly trustedContext: boolean;
    /** Variables that have been added or updated during the request through this tracker. */
    private readonly _changedVariables;
    /** Variables that have been added or updated during the request through this tracker. */
    getChangedVariables(): ReadonlyMap<string, ServerScoped<Variable<any>>>;
    private readonly _clientCipher;
    private readonly _defaultConsent;
    readonly host: string | undefined;
    readonly path: string;
    readonly url: string;
    readonly additionalPurposes: Required<Required<TrackerServerConfiguration>["additionalPurposes"]>;
    constructor({ disabled, clientIp, headers, host, path, url, queryString, cookies, requestHandler, transport: cipher, anonymousSessionReferenceId, defaultConsent, trustedContext, additionalPurposes, }: TrackerServerConfiguration);
    get clientEvents(): TrackedEvent[];
    /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
     *
     * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
     * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
     *
     */
    _anonymousSessionReferenceId: string | undefined;
    /**
     * Device variables are only persisted in the device.
     * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
     */
    private _clientDeviceCache?;
    private _previousSessions;
    private _consent;
    get consent(): Freeze<UserConsent>;
    get requestId(): string;
    get initialized(): boolean;
    get session(): Freeze<SessionInfo> | undefined;
    get sessionId(): string | undefined;
    get deviceSessionId(): string | undefined;
    get device(): Freeze<DeviceInfo> | undefined;
    get deviceId(): string | undefined;
    get authenticatedUserId(): string | undefined;
    private _encryptCookie;
    private _decryptCookie;
    httpClientEncrypt(value: any): string;
    httpClientDecrypt(encoded: string | null | undefined): any;
    forwardRequest(request: HttpRequest): Promise<HttpResponse>;
    post(events: TrackedEvent[], options?: TrackerPostOptions): Promise<PostResponse>;
    /**
     * Load device variables from the client, and store them as variables with a short TTL to avoid race conditions.
     *
     */
    private _loadCachedDeviceVariables;
    private _readClientDeviceVariables;
    getRequestItems(source: any): Map<any, any>;
    registerSessionChangedCallback(callback: SessionChangedCallback): _tailjs_util.Binders;
    reset({ session, device, consent, referenceTimestamp, deviceSessionId, }: {
        session: boolean;
        device?: boolean;
        consent?: boolean;
        referenceTimestamp?: Timestamp;
        deviceSessionId?: string;
    }): Promise<void>;
    dispose(): Promise<void>;
    updateConsent({ purposes, classification, source, }: Partial<UserConsent>): Promise<void>;
    private _snapshot;
    private _clearDevice;
    private _ensureSession;
    private _getStorageContext;
    renew(): Promise<void>;
    get<Getters extends VariableOperationParameter<"get", ServerScoped<VariableGetter> & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(getters: WithCallbacks<"get", Getters, KnownTrackerKeys>, context?: TrackerVariableStorageContext): VariableOperationResult<"get", Getters, ServerScoped<VariableKey>, KnownTrackerKeys>;
    set<Setters extends VariableOperationParameter<"set", ServerScoped<VariableSetter> & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(setters: WithCallbacks<"set", Setters, KnownTrackerKeys>, context?: TrackerVariableStorageContext): VariableOperationResult<"set", Setters, ServerScoped<VariableKey>, KnownTrackerKeys>;
    query(filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>, { context, ...options }?: VariableQueryOptions & {
        context?: VariableStorageContext;
    }): Promise<VariableQueryResult>;
    purge(filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>, { context, bulk, }?: VariablePurgeOptions & {
        context?: VariableStorageContext;
    }): Promise<void>;
}

/** Gives a hint what a string might be for methods that serialize results to strings */
type JsonString = string;
type CookieConfiguration = {
    namePrefix?: string;
    secure?: boolean;
};
type RequestHandlerConfiguration = {
    /**
     * The name of the global tracker object.
     * @default "tail"
     */
    trackerName?: string;
    /**
     * The API endpoint the client script communicates with.
     */
    endpoint: string;
    /**
     * An implementation of the engine host used to communicate with the outer world.
     * In pure V8 contexts, these methods must be implemented matching the V8 host's environment.
     */
    host: EngineHost;
    /**
     * The schemas defining the available events and variables.
     * If the tail.js core schema is not included here, it will automatically be added.
     *
     * Reasons for explicitly including it includes overriding the classifications and purposes of the properties.
     */
    schemas?: SchemaDefinition[];
    /**
     * Extensions that may enable events to be stored in a database,
     * variables to be read from various backend systems, event transformations,
     * client and/or server integrations with other tracking/analytics solutions etc.
     */
    extensions: Iterable<() => Promise<TrackerExtension> | TrackerExtension>;
    /**
     * An external implementation of the cryptographic routines specifically needed for
     * communication between the client and the server.
     */
    crypto?: CryptoProvider;
    /**
     * The master encryption key for communication. Only the first one is used,
     * but data from clients with cookies encrypted with a previous key can still be decrypted
     * as long as the previous keys are kept in this list (it is a simple rolling encryption scheme).
     */
    encryptionKeys?: string[];
    /**
     * Configuration of cookie names, and common security attributes for cookies.
     */
    cookies?: CookieConfiguration;
    /**
     * Either the path to an alternative script to use instead of the default minified one.
     * If true, a version of the script that outputs activity to the browser console and contains
     * a source map is used. Paths are resolved using the engine host, in particular, paths in the reserved
     * directory `js` will be resolved relative to the `@tailjs/client` package's `iife` directory
     * (for example, `js/tail.debug.map.js` is the same as setting this property to `true`).
     *
     * @default false
     */
    debugScript?: boolean | string;
    /**
     * Use JSON instead of LFSR encrypted MessagePack. This should only be set for debugging purposes
     * since it enables fingerprinting.
     */
    json?: boolean;
    /**
     * This is used to add entropy to temporary keys used for short-term communication and
     * cookie-less, pseudonomized client identifiers. This adds an extra protection against tracing
     * a pseudonomized client hash back to the user even if a temporary hash has escaped the system,
     * and the the user's IP and device is known at a specific time.
     *
     * Do specify your own value here instead of the default. That makes it significantly harder to guess...
     */
    clientEncryptionKeySeed?: string;
    /**
     * The configuration for the client-side tracker.
     */
    client?: Partial<TrackerClientConfiguration$1>;
    /**
     * The specific logic that maps a cookie-less client request to a unique'ish identifier.
     * This is kept separate from the environment host, but such a host may be able to leverage
     * additional information about the client such as a login-token or similar. Even so, the user's
     * data will still only be tracked anonymously without ability to trace it back to the user.
     *
     */
    clientIdGenerator?: ClientIdGenerator;
    /**
     * The default consent level the first time a user enters a website.
     *
     * @default Anonymous/Necessary
     */
    defaultConsent?: UserConsent;
    /**
     * Configured whether the two purposes personalization and security should be treated
     * as separate purposes, or just considered synonymous with functionality and necessary respectively.
     *
     * The default is to not treat them separately, and this follows the common options in cookie
     * disclaimers.
     *
     * Google Consent Mode v2 has separate flags for personalization and security, which is why
     * you might want to enable the distinction.
     *
     * When a purpose is not treated separately, the become synonymous with their counterpart,
     * and both are set if either is set when the user gives or updates their consent.
     * That is, consent for inactive purposes cannot be controlled independently if not active.
     *
     */
    additionalPurposes?: Partial<OptionalPurposes>;
    /**
     * Mappings of on or more backends that provides variables in the different scopes.
     * If a variable storage is not configured for a scope (such as User) this data will not get stored anywhere.
     */
    storage?: VariableStorageMappings;
    /**
     * The session timeout in minutes.
     *
     * @default 30
     */
    sessionTimeout?: number;
    /** Settings for the tracker environment. */
    environment?: TrackerEnvironmentSettings;
    /**
     * The number of different client keys. A version of client script will be cached for each of these.
     * @default 5
     */
    clientKeys?: number;
};
declare const DEFAULT: Omit<AllRequired<RequestHandlerConfiguration>, "schemas" | "backends" | "host" | "extensions" | "endpoint" | "scriptPath" | "environmentTags" | "crypto" | "encryptionKeys" | "storage" | "clientIdGenerator" | "additionalPurposes" | "defaultConsent" | "environment"> & Pick<Required<RequestHandlerConfiguration>, "environment" | "defaultConsent">;
type SchemaPatchFunction = (schema: SchemaDefinition | undefined) => void;
type SchemaFormat = "native" | "json-schema";
declare class SchemaBuilder {
    private readonly _collected;
    private readonly _patches;
    private readonly _coreSchema;
    constructor(initialSchemas?: SchemaDefinition[], coreSchema?: SchemaDefinition);
    registerSchema(path: string, type?: SchemaFormat): this;
    registerSchema(definition: SchemaDefinition): this;
    registerSchema(definition: Record<string, any>, type: SchemaFormat): this;
    /**
     * Can be used to patch another schema, e.g. to change privacy settings.
     *
     * If the intended target schema is not present, `undefined` is passed which gives an opportunity to do nothing or throw an error.
     */
    patchSchema(namespace: string, patch: SchemaPatchFunction): void;
    private _applyPatches;
    build(host: EngineHost): Promise<SchemaDefinition[]>;
}

interface ChangeHandler<T> {
    (path: string, data: () => Promise<T | null>): Promise<void | boolean>;
}

interface HostResponse<T = string> {
    status: number;
    headers: Record<string, string>;
    cookies: string[];
    body: T;
}

interface HostRequest<Binary extends boolean = false> {
    body?: string;
    headers: Record<string, string>;
    method: string;
    url: string;
    x509?: ClientCertificate;
    binary?: Binary;
}

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "critical";
interface LogMessage {
    /** When the message was created (UTC) in ISO 8601 format. */
    timestamp?: string;
    /** The severity of the event.  */
    level: LogLevel;
    /**
     * A message that summarizes the event.
     * Details should be added as structured data in {@link details} for easier analysis,
     * and if an error occurred its details should be put in {@link error}, and not the message.
     */
    message: string;
    /**
     * Details about the event in key/value format.
     * For example a value that was rejected during validation.
     */
    details?: JsonObject;
    /**
     * Details about an error, if the event was logged due to an error.
     */
    error?: {
        type?: string;
        message: string;
        stack?: string;
        details?: JsonObject;
    };
    /**
     * The log group. This can be used to configure different log destinations and generally categorize log messages.
     */
    group?: string;
    /**
     * The object that caused the event.
     */
    source?: string;
    /**
     * A key that can be used to prevent the logs from getting flooded with the same message over and over again.
     * If this is specified, messages with the same key not be logged more than three times within the same minute.
     * If the empty string is used, a hash of the entire log message will be used which may be convenient
     * instead of making sure keys are unique at the expense of a small performance overhead.
     *
     * The last log entry will indicate that further events will not get logged.
     */
    throttleKey?: string;
}
declare const serializeLogMessage: (message: LogMessage) => any;

interface ResourceEntry {
    path: string;
    name: string;
    type: "file" | "dir";
    readonly: boolean;
    created?: number;
    modified?: number;
}
interface EngineHost {
    log(message: LogMessage): void;
    ls(path: string): Promise<ResourceEntry[] | null>;
    read(path: string, changeHandler?: ChangeHandler<Uint8Array>): Promise<Uint8Array | null>;
    readText(path: string, changeHandler?: ChangeHandler<string>): Promise<string | null>;
    write(path: string, data: Uint8Array): Promise<void>;
    writeText(path: string, text: string): Promise<void>;
    delete(path: string): Promise<boolean>;
    request<Binary extends boolean = false>(request: HttpRequest<Binary>): Promise<HostResponse<Binary extends true ? Uint8Array : string>>;
    compress?(data: Uint8Array | string, algorithm: "br" | "gzip"): MaybePromise<Uint8Array | Nullish>;
    decompress(data: Uint8Array, algorithm: "tar" | "zip" | "tar.gz"): Promise<{
        name: string;
        data: Uint8Array;
    }[]>;
}

declare const requestCookieHeader: unique symbol;
declare const requestCookies: unique symbol;
type ParsedCookieHeaders = Record<string, Cookie> & {
    [requestCookies]: Record<string, Cookie & {
        chunks: number;
    }>;
    [requestCookieHeader]?: string;
};
declare class CookieMonster {
    private readonly _secure;
    constructor(config: CookieConfiguration);
    mapResponseCookies(cookies: ParsedCookieHeaders): ClientResponseCookie[];
    static parseCookieHeader(value: string | null | undefined): ParsedCookieHeaders;
    mapResponseCookie(name: string, cookie: Cookie): {
        name: string;
        value: string | null | undefined;
        maxAge: number | undefined;
        httpOnly: boolean;
        sameSitePolicy: "Strict" | "Lax" | "None";
        essential: boolean;
        secure: boolean;
        headerString: string;
    };
    private _getHeaderValue;
    private _mapClientResponseCookies;
}

declare class PostError extends Error {
    readonly validation: (ValidationErrorResult & {
        sourceIndex?: number;
    })[];
    readonly extensions: Record<string, Error>;
    constructor(validation: (ValidationErrorResult & {
        sourceIndex?: number;
    })[], extensions: Record<string, Error>);
}

declare const getDefaultLogSourceName: (source: any) => string | undefined;
type KnownTrackerKeys = {
    session: ScopeVariables["session"];
    device: ScopeVariables["device"];
};
type TrackerEnvironmentSettings = {
    /**
     * The length of the ShortUids generated.
     * The default of 10 is the largest number that can be represented as an 64 bit integer,
     * which may be convenient in data warehouse scenarios because they compress well.
     * (ZZZZZZZZZZ base 62 = 839299365868340223 base 10)
     *
     * @default 10
     */
    idLength?: number;
    /**
     * Common tags that will be added to all collected events. This can be used to differentiate between different
     * server nodes in a clustered environment, or the purpose of environment (like dev, qa, staging or production).
     */
    tags?: Tag[];
    /** A custom ID generator if ShortUid is not desired. */
    uidGenerator?: () => MaybePromise<string>;
};
declare const detectPfx: (cert: ClientCertificate | undefined) => ClientCertificate | undefined;
declare class TrackerEnvironment {
    private readonly _crypto;
    private readonly _host;
    private readonly _logGroups;
    private readonly _uidGenerator;
    readonly tags?: Tag[];
    readonly cookieVersion: string;
    readonly storage: VariableStorageCoordinator<KnownTrackerKeys>;
    constructor(host: EngineHost, crypto: CryptoProvider, storage: VariableStorageCoordinator, { idLength, tags, uidGenerator }?: TrackerEnvironmentSettings);
    httpEncrypt(value: Encodable): string;
    httpEncode(value: Encodable): string;
    httpDecode<T = any>(encoded: string | Uint8Array): T;
    httpDecode<T = any>(encoded: null | undefined): undefined;
    httpDecrypt<T = any>(encoded: string | Uint8Array): T;
    httpDecrypt<T = any>(encoded: null | undefined): undefined;
    hash<T extends string | null | undefined, B extends boolean>(source: T, numeric: B, secure?: boolean): B extends true ? number : MaybeUndefined<T>;
    hash<T extends string | null | undefined>(source: T, bits?: 32 | 64 | 128, secure?: boolean): MaybeUndefined<T, string>;
    log(source: any, message: LogMessage): void;
    log(source: any, message: string | Error | Nullish, logLevel?: LogLevel, error?: Error): void;
    nextId(scope?: string): Promise<string>;
    readText(path: string, changeHandler?: ChangeHandler<string>): Promise<string | null>;
    read(path: string, changeHandler?: ChangeHandler<Uint8Array>): Promise<Uint8Array | null>;
    request<Binary extends boolean = false>(request: HttpRequest<Binary>): Promise<HttpResponse<Binary>>;
    ls(path: string): Promise<ResourceEntry[] | null>;
    write(path: string, data: Uint8Array): Promise<void>;
    writeText(path: string, text: string): Promise<void>;
    delete(path: string): Promise<boolean>;
    compress(data: Uint8Array | string, algorithm: "br" | "gzip"): MaybePromise<Uint8Array | Nullish>;
    decompress(data: Uint8Array, algorithm: "tar" | "zip" | "tar.gz"): Promise<{
        name: string;
        data: Uint8Array;
    }[] | null>;
    trace(source: any, message: string): void;
    debug(source: any, message: string): void;
    warn(source: any, message: string, error?: Error): void;
    warn(source: any, message: string | null | undefined, error: Error): void;
    error(source: any, message: string, error?: Error): void;
    error(source: any, error: Error): void;
}

/**
 * This is used to generate a probabilistically unique identifier from a client request
 * for anonymous tracking. This identifier is used to reference an anonymous session
 * and will not get stored itself.
 * That means the generated identifier may contain pseudonomized personal data which is by all chance the case
 * if any client-specific information is used from the request.
 *
 */
interface ClientIdGenerator {
    /**
     * Generates a pseudo-unique identifier based on request information from the client.
     * Stationary identifiers are used to seed the client encryption key, and non-stationary are used for anonymous tracking.
     *
     * @param environment The tracker environment where the request happened.
     * @param request The client request information to use as the basis for the identifier.
     * @param stationary Whether to exclude information that may change during a session such as IP address.
     */
    generateClientId(environment: TrackerEnvironment, request: ClientRequestHeaders, stationary: boolean): Promise<string>;
}
interface ClientIdGeneratorSettings {
    /** The headers to consider when generating pseudo-unique identifiers. */
    headers?: string[];
}
declare class DefaultClientIdGenerator implements ClientIdGenerator {
    private readonly _headers;
    constructor({ headers, }?: ClientIdGeneratorSettings);
    generateClientId(environment: TrackerEnvironment, request: ClientRequestHeaders, stationary: boolean): Promise<string>;
}

interface InMemoryStorageSettings {
    ttl?: number;
}
declare class InMemoryStorage implements VariableStorage, Disposable {
    private _nextVersion;
    private _disposed;
    private _nextInternalId;
    private readonly _entities;
    private readonly _ttl;
    constructor({ ttl }?: InMemoryStorageSettings);
    private _purgeExpired;
    private _getVariables;
    private _getVariable;
    get(keys: readonly VariableGetter[]): Promise<VariableGetResult[]>;
    set(values: readonly VariableValueSetter[]): Promise<VariableSetResult[]>;
    private _purgeOrQuery;
    purge(queries: readonly VariableStorageQuery[]): Promise<number>;
    renew(queries: readonly VariableStorageQuery[]): Promise<number>;
    query(queries: readonly VariableStorageQuery[], options?: VariableQueryOptions): Promise<VariableQueryResult>;
    private _checkDisposed;
    [Symbol.dispose](): void;
}

type WithTrace<T, Trace> = T & {
    [traceSymbol]: Trace & {
        source: WithTrace<T, Trace>;
    };
};
type CopyTrace<T, Source> = T & {
    [traceSymbol]: Source extends {
        [traceSymbol]: infer Trace;
    } ? Trace : undefined;
};
type AddSourceTrace<Source, Trace> = Trace extends undefined ? Source & {
    [traceSymbol]?: undefined;
} : Source & {
    [traceSymbol]: [AddSourceTrace<Source, Trace>, Trace];
};
type SplitFields = Pick<VariableKey, "source" | "scope">;
declare const traceSymbol: unique symbol;
declare const addSourceTrace: <Item, Trace>(item: Item, trace: Trace) => AddSourceTrace<Item, Trace>;
declare const withTrace: <Item, Trace>(item: Item, trace: Trace) => WithTrace<Item, Trace>;
declare const copyTrace: <Item, Trace>(item: Item, trace: {
    [traceSymbol]: Trace;
}) => WithTrace<Item, Trace>;
declare const clearTrace: <Item>(item: Item) => Item extends {
    [traceSymbol]: any;
} ? Omit<Item, typeof traceSymbol> : Item;
declare const getTrace: <Trace>(item: {
    [traceSymbol]: Trace;
}) => Trace;
interface VariableSplitStorageSettings {
    includeStackTraces?: boolean;
}
interface StorageMappingSettings {
    /** Default time to live for variables in milliseconds. (Document will be deleted roughly after this time) */
    ttl: number | undefined;
}
declare class VariableSplitStorage implements VariableStorage, Disposable {
    private readonly _mappings;
    private readonly _settings;
    constructor(mappings: VariableStorageMappings, settings?: VariableSplitStorageSettings);
    private _splitApply;
    get<Getter extends ReadOnlyVariableGetter>(keys: Getter[]): Promise<CopyTrace<VariableGetResult, Getter>[]>;
    set<Setter extends VariableValueSetter>(values: Setter[]): Promise<CopyTrace<VariableSetResult, Setter>[]>;
    splitSourceQueries<T extends VariableQuery | VariableStorageQuery>(queries: readonly T[]): (T & SplitFields)[];
    purge(queries: VariableStorageQuery[]): Promise<number | undefined>;
    renew(queries: VariableStorageQuery[]): Promise<number | undefined>;
    query(queries: VariableStorageQuery[], { page, cursor: splitCursor }?: VariableQueryOptions): Promise<VariableQueryResult>;
    initialize(environment: TrackerEnvironment): Promise<void>;
    [Symbol.dispose](): void;
}

type VariableStorageQuery = {
    scope: string;
    entityIds?: string[];
    keys?: {
        exclude?: boolean;
        values: string[];
    };
    /** Gets variables that have changed since this timestamp. (Not implemented). */
    ifModifiedSince?: number;
};
interface ReadOnlyVariableStorage extends TrackerEnvironmentInitializable {
    /** Gets or initializes the variables with the specified keys. */
    get(keys: readonly ReadOnlyVariableGetter[]): Promise<VariableGetResult[]>;
    /** Gets the variables for the specified entities. */
    query(queries: readonly VariableStorageQuery[], options?: VariableQueryOptions): Promise<VariableQueryResult>;
}
interface VariableStorage extends ReadOnlyVariableStorage {
    /** Sets the variables with the specified keys and values. */
    set(values: readonly VariableValueSetter[]): Promise<VariableSetResult[]>;
    /** Purges all variables matching the specified queries. Returns the number of deleted variables.  */
    purge(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
    /** Extends the time-to-live for the variables matching the specified queries. */
    renew(queries: readonly VariableStorageQuery[]): Promise<number | undefined>;
}
declare const isWritableStorage: (storage: any) => storage is VariableStorage;

interface StorageMapping {
    storage: ReadOnlyVariableStorage;
    schemas?: string[];
}
interface RetrySettings {
    /** Maximum number of retries before giving up. */
    attempts: number;
    /** Delay between retries. */
    delay: number;
    /**
     * The maximum value of an additional random delay that gets added to the delay
     * to spread out retry attempts to break ties and reduce contention when multiple processes
     * are attempting the same action simultaneously.
     */
    jitter: number;
}
type VariableStorageMappings = {
    default?: VariableStorage;
    /** Default time to live in milliseconds (variables will be deleted after this.) for the different scopes. */
    ttl?: {
        [P in VariableServerScope]?: number | null | undefined;
    };
} & {
    [P in VariableServerScope]?: {
        storage?: VariableStorage;
        schemas?: string[];
        /** Default time to live in milliseconds (variables will be deleted after this.) */
        ttl?: number;
        prefixes?: {
            [P in string]: {
                storage: ReadOnlyVariableStorage;
                /** Default time to live in milliseconds (variables will be deleted after this.) */
                ttl?: number;
                schemas?: string[];
            };
        };
    };
};
type ErrorLogger = (message: LogMessage) => void;
interface VariableStorageCoordinatorSettings {
    retries?: {
        /**
         * Retry settings for patch conflicts.
         *
         * The default is 50 ms between a maximum of 10 retries with 25 ms jitter.
         */
        patch?: Partial<RetrySettings>;
        /**
         * Retry settings for transient errors.
         *
         * The default is 500 ms between a maximum of 3 retries with 250 ms jitter.
         */
        error?: Partial<RetrySettings>;
    };
    /** Include stack traces in errors. */
    includeStackTraces?: boolean;
    storage: VariableStorageMappings;
    errorLogger?: ErrorLogger | null;
}
declare const isTransientErrorObject: (error: any) => any;
interface VariableCache {
    get(key: VariableKey): MaybePromise<Variable | undefined>;
    /** TODO: Bulk purge operations do not clear the cache. */
    set?(key: VariableKey, variable: Variable | undefined): MaybePromise<void>;
}
type VariableStorageContext = {
    /** The current entity IDs for session and user scope. */
    scope?: {
        sessionId?: string;
        deviceId?: string;
        userId?: string;
        consent?: DataUsage;
    };
    optionalPurposes?: OptionalPurposes;
    /**
     * Whether restrictions on data access visibility applies.
     * @default false
     */
    trusted?: boolean;
    /** Value resolvers for dynamic variables. */
    dynamicVariables?: {
        [P in VariableServerScope]?: {
            [P in string]?: (key: VariableKey) => any;
        };
    };
    cache?: VariableCache;
};
type VariableStorageCoordinatorQueryOptions = VariableQueryOptions & {
    context?: VariableStorageContext;
};
type VariableStorageCoordinatorPurgeOptions = {
    context?: VariableStorageContext;
    bulk?: boolean;
};
declare class VariableStorageCoordinator<KnownVariables extends KnownVariableMap = never> {
    private readonly _storage;
    private readonly _types;
    private readonly _storageTypeResolvers;
    private readonly _defaultContext;
    private readonly _patchRetries;
    private readonly _errorRetries;
    private readonly _settings;
    private readonly _errorLogger;
    constructor({ storage, ...settings }: VariableStorageCoordinatorSettings, types: TypeResolver, defaultContext?: VariableStorageContext);
    private _getTypeResolver;
    private _getSchemaVariable;
    private _assignResultSchemas;
    private _captureVariableError;
    get<Getters extends VariableOperationParameter<"get", ServerScoped<VariableGetter, boolean> & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(getters: WithCallbacks<"get", Getters, KnownVariables>, context?: VariableStorageContext): VariableOperationResult<"get", Getters, ServerScoped<VariableKey, false>, KnownVariables>;
    set<Setters extends VariableOperationParameter<"set", ServerScoped<VariableSetter, boolean> & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(setters: WithCallbacks<"set", Setters, KnownVariables>, context?: VariableStorageContext): VariableOperationResult<"set", Setters, ServerScoped<VariableKey, false>, KnownVariables>;
    private _queryOrPurge;
    purge(filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>, { context, bulk, }?: VariableStorageCoordinatorPurgeOptions): Promise<number | undefined>;
    query(filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>, { context, ...options }?: VariableStorageCoordinatorQueryOptions): Promise<VariableQueryResult>;
    renew(filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>, context?: VariableStorageContext): Promise<number>;
    initialize?(environment: TrackerEnvironment): Promise<void>;
}

export { type AddSourceTrace, type BootstrapSettings, type CallbackResponse, type ChangeHandler, type ClientCertificate, type ClientIdGenerator, type ClientIdGeneratorSettings, type ClientRequest, type ClientRequestHeaders, type ClientResponseCookie, type ClientScript, type Cookie, type CookieConfiguration, CookieMonster, type CopyTrace, type CryptoProvider, DEFAULT, DefaultClientIdGenerator, DefaultCryptoProvider, type EngineHost, EventLogger, type ExtensionError, type HostRequest, type HostResponse, type HttpRequest, type HttpResponse, InMemoryStorage, type InMemoryStorageSettings, type JsonString, type KnownTrackerKeys, type LogLevel, type LogMessage, MAX_CACHE_HEADERS, type NextPatchExtension, type ParseResult, type ParsedCookieHeaders, PostError, type ProcessRequestOptions, type ReadOnlyVariableStorage, RequestHandler, type RequestHandlerConfiguration, type ResourceEntry, type RetrySettings, SCRIPT_CACHE_HEADERS, SchemaBuilder, type SchemaFormat, type SchemaPatchFunction, type ServerTrackedEvent, type SessionChangedCallback, type StorageMapping, type StorageMappingSettings, type TrackedEventBatch, Tracker, TrackerEnvironment, type TrackerEnvironmentInitializable, type TrackerEnvironmentSettings, type TrackerExtension, type TrackerExtensionContext, type TrackerInitializationOptions, type TrackerPostOptions, type TrackerServerConfiguration, type TrackerSnapshot, type TrackerVariableStorageContext, type ValidationErrorResult, type VariableCache, VariableSplitStorage, type VariableSplitStorageSettings, type VariableStorage, type VariableStorageContext, VariableStorageCoordinator, type VariableStorageCoordinatorPurgeOptions, type VariableStorageCoordinatorQueryOptions, type VariableStorageCoordinatorSettings, type VariableStorageMappings, type VariableStorageQuery, type WithTrace, addSourceTrace, bootstrap, clearTrace, copyTrace, detectPfx, getDefaultLogSourceName, getErrorMessage, getTrace, isTransientErrorObject, isValidationError, isWritableStorage, requestCookieHeader, requestCookies, serializeLogMessage, withTrace };

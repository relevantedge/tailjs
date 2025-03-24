import {
  CONSENT_INFO_KEY,
  SCOPE_INFO_KEY,
  SESSION_REFERENCE_KEY,
} from "@constants";
import { Transport, defaultTransport } from "@tailjs/transport";
import {
  DataClassification,
  DataPurposeName,
  DataPurposes,
  DataUsage,
  DeviceInfo,
  PostResponse,
  RestrictScopes,
  ScopeInfo,
  ServerScoped,
  Session,
  SessionInfo,
  Timestamp,
  TrackedEvent,
  UserConsent,
  Variable,
  VariableGetter,
  VariableKey,
  VariableOperationParameter,
  VariableOperationResult,
  VariablePurgeOptions,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableServerScope,
  VariableSetter,
  WithCallbacks,
  iterateQueryResults,
  isVariableResult,
  toVariableResultPromise,
} from "@tailjs/types";
import {
  ArrayOrSelf,
  Falsish,
  Freeze,
  Nullish,
  PartialRecord,
  ReadonlyRecord,
  concat,
  createEvent,
  forEach2,
  forEachAwait2,
  get2,
  isArray,
  map2,
  now,
  obj,
  some2,
  truish2,
} from "@tailjs/util";
import { tryConvertLegacyConsent, tryConvertLegacyDeviceVariable } from "./lib";
import {
  Cookie,
  CookieMonster,
  HttpRequest,
  HttpResponse,
  KnownTrackerKeys,
  RequestHandler,
  TrackerEnvironment,
  VariableStorageContext,
  requestCookies,
} from "./shared";

export interface TrackerServerConfiguration {
  disabled?: boolean;
  /** Transport used for client-side communication with a key unique('ish) to the client. */
  transport?: Transport;
  legacyCookieTransport: () => Promise<Transport>;

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
}

const enum ExtensionState {
  Pending = 0,
  Applying = 1,
  Done = 2,
}

export interface TrackerInitializationOptions {
  deviceSessionId?: string;
  deviceId?: string;
  userId?: string;
  passive?: boolean;
}

export interface TrackerPostOptions extends TrackerInitializationOptions {
  /**
   * The events are for an external client-side tracker.
   * This flag enables server-side generated events to be routed to an external destination via the client.
   *
   * This only works if an appropriate extension has been added to the client-side tracker to pick them ups.
   */
  routeToClient?: boolean;
}

interface SessionInitializationOptions extends TrackerInitializationOptions {
  resetSession?: boolean;
  resetDevice?: boolean;
  refreshState?: boolean;
  previousConsent?: UserConsent;
}

export type TrackerVariableStorageContext = Omit<
  VariableStorageContext,
  "scope"
>;

const createInitialScopeData = <T extends ScopeInfo, Data>(
  id: string,
  timestamp: Timestamp,
  additionalData: Omit<T, keyof ScopeInfo> & Data
): T & Data =>
  ({
    id,
    firstSeen: timestamp,
    lastSeen: timestamp,
    views: 0,
    isNew: true,
    ...additionalData,
  } as any);

interface DeviceVariableCache {
  /** Parsed variables from cookie. */
  variables?:
    | Record<string, RestrictScopes<Variable, "device", never>>
    | undefined;

  /** Only refresh device variables stored at client if changed.  */
  touched?: boolean;

  /** The cached variables from cookies has been loaded into storage. */
  loaded?: boolean;
}

type ClientDeviceDataBlob = ClientDeviceVariable[];

type ClientDeviceVariable = [key: string, version: string, value: any];

type PreviousSessionState = Pick<Tracker, "trustedContext" | "consent">;

export type TrackerSnapshot = {
  consent: Freeze<DataUsage>;
  session: Freeze<SessionInfo>;
  device?: Freeze<DeviceInfo>;
};
export type SessionChangedCallback = (
  current: TrackerSnapshot,
  previous?: TrackerSnapshot
) => void;

export class Tracker {
  /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */
  private _eventQueue: [
    events: TrackedEvent[],
    options: TrackerInitializationOptions
  ][] = [];
  private _extensionState = ExtensionState.Pending;
  private _initialized: boolean;
  private _requestId: string | undefined;

  /** @internal  */
  public readonly _clientEvents: TrackedEvent[] = [];

  /** @internal */
  public readonly _requestHandler: RequestHandler;
  public readonly clientIp: string | Nullish;

  public readonly cookies: Record<string, Cookie>;
  public readonly disabled: boolean;
  public readonly env: TrackerEnvironment;
  public readonly headers: ReadonlyRecord<string, string>;
  public readonly queryString: ReadonlyRecord<string, string[]>;

  public readonly referrer: string | null;

  /** Can be used by extensions for book-keeping during a request.  */
  private readonly _requestItems: Map<any, Map<any, any>>;

  private readonly _sessionChangedEvent =
    createEvent<Parameters<SessionChangedCallback>>();

  //private readonly _sessionChangedHandlers

  /** Transient variables that can be used by extensions whilst processing a request. */
  public readonly transient: Record<string, any>;

  /**
   * Whether the tracker has been instantiated in a trusted context.
   * A trusted context is when the tracker's API is used for server-side tracker.
   *
   * Signing in without evidence is only possible in trusted contexts.
   *
   * Extensions may use this flag for additional functionality that is only available in server-side tracking context.
   */
  public readonly trustedContext: boolean;

  /** Variables that have been added or updated during the request through this tracker. */
  private readonly _changedVariables = new Map<
    string,
    ServerScoped<Variable<any>>
  >();

  /** Variables that have been added or updated during the request through this tracker. */
  public getChangedVariables(): ReadonlyMap<
    string,
    ServerScoped<Variable<any>>
  > {
    return this._changedVariables;
  }

  private readonly _clientCipher: Transport;
  private readonly _legacyCookieCipher: () => Promise<Transport>;
  private readonly _defaultConsent: UserConsent;

  public readonly host: string | undefined;
  public readonly path: string;
  public readonly url: string;

  public constructor({
    disabled = false,
    clientIp,
    headers,
    host,
    path,
    url,
    queryString,
    cookies,
    requestHandler,
    transport: cipher,
    legacyCookieTransport,
    anonymousSessionReferenceId,
    defaultConsent,
    trustedContext,
  }: TrackerServerConfiguration) {
    this.disabled = disabled;
    this._requestHandler = requestHandler;
    this.env = requestHandler.environment;
    this.host = host;
    this.path = path;
    this.url = url;
    this._defaultConsent = defaultConsent;

    this.queryString = queryString ?? {};

    this.headers = headers ?? {};
    this.cookies = (cookies as Record<string, any>) ?? {};
    this.transient = {};
    this._requestItems = new Map();

    this.clientIp = clientIp;

    this.referrer = this.headers["referer"] ?? null;

    this.trustedContext = !!trustedContext;

    // Defaults to unencrypted transport if nothing is specified.
    this._clientCipher = cipher ?? defaultTransport;
    let cookieCipher: Transport | undefined = undefined;
    this._legacyCookieCipher = async () =>
      (cookieCipher ??= await legacyCookieTransport());

    this._anonymousSessionReferenceId = anonymousSessionReferenceId;
  }

  public get clientEvents() {
    return this._clientEvents;
  }

  /** A unique ID used to look up session data. This is a pointer to the session data that includes the actual session ID.
   *
   * In this way the session ID for a pseudonomized cookie-less identifier may be truly anonymized.
   * It also protects against race conditions. If one concurrent request changes the session (e.g. resets it), the other(s) will see it.
   *
   */
  public _anonymousSessionReferenceId: string | undefined;

  /** @internal */
  public _session: Variable<SessionInfo> | undefined;

  /** @internal */
  public _device?: Variable<DeviceInfo>;

  /**
   * See {@link Session.expiredDeviceSessionId}.
   * @internal
   */
  public _expiredDeviceSessionId?: string;

  /**
   * Device variables are only persisted in the device.
   * However, when used they are temporarily stored in memory like session variables to avoid race conditions.
   */
  private _clientDeviceCache?: DeviceVariableCache;

  private _previousSessions: Map<string, PreviousSessionState> | undefined;

  private _consent: UserConsent = {
    classification: "anonymous",
    purposes: {},
  };

  public get consent(): Freeze<DataUsage> {
    return this._consent;
  }

  public get requestId() {
    return `${this._requestId}`;
  }

  public get initialized() {
    return this._initialized;
  }

  public get session(): Freeze<SessionInfo> | undefined {
    return this._session?.value;
  }

  public get sessionId(): string | undefined {
    return this.session?.id;
  }

  public get deviceSessionId() {
    return this._session?.value?.deviceSessionId;
  }

  public get device(): Freeze<DeviceInfo> | undefined {
    return this._device?.value;
  }

  public get deviceId() {
    return this._device?.value.id;
  }

  public get authenticatedUserId() {
    return this._session?.value?.userId;
  }

  private _encryptCookie(value: any): string {
    return this.env.httpEncrypt(value);
  }

  private async _decryptCookie<T = any>(
    value: string | Nullish,
    logNameHint?: string
  ): Promise<T | undefined> {
    try {
      return !value ? undefined : (this.env.httpDecrypt(value) as any);
    } catch {
      try {
        return (await this._legacyCookieCipher())[1](value) as any;
      } catch (error) {
        this.env.log(this, {
          level: "error",
          message: "Could not decrypt cookie value.",
          error,
          details: {
            name: logNameHint,
            value,
          },
        });
        return undefined;
      }
    }
  }

  public httpClientEncrypt(value: any): string {
    return this._clientCipher[0](value);
  }

  public httpClientDecrypt(encoded: string | null | undefined): any {
    return this._clientCipher[1](encoded);
  }

  /** @internal */
  public async _applyExtensions(options: TrackerInitializationOptions) {
    await this._ensureInitialized(options);
    if (this._extensionState === ExtensionState.Pending) {
      this._extensionState = ExtensionState.Applying;
      try {
        await this._requestHandler.applyExtensions(this, {
          passive: !!options.passive,
        });
      } finally {
        this._extensionState = ExtensionState.Done;
        if (this._eventQueue.length) {
          for (const [events, options] of this._eventQueue.splice(0)) {
            await this.post(events, options);
          }
        }
      }
    }
  }

  public async forwardRequest(request: HttpRequest): Promise<HttpResponse> {
    const finalRequest = {
      url: request.url,
      binary: request.binary,
      method: request.method,
      headers: { ...this.headers },
    };

    if (request.headers) {
      Object.assign(finalRequest.headers, request.headers);
    }

    // Merge the requests cookies, and whatever cookies might have been added to the forwarded request.
    // The latter overwrites cookies with the same name if they were also sent by the client.
    const cookies = map2(
      new Map<string, string | Nullish>(
        concat(
          map2(this.cookies, ([name, cookie]) => [name, cookie.value]),
          map2(
            CookieMonster.parseCookieHeader(finalRequest.headers["cookies"])?.[
              requestCookies
            ],
            ([name, cookie]) => [name, cookie.value]
          )
        )
      ),
      ([...args]) =>
        args.map((value) => encodeURIComponent(value ?? "")).join("=")
    ).join("; ");

    if (cookies.length) {
      finalRequest.headers["cookie"] = cookies;
    }

    const response = await this._requestHandler.environment.request(
      finalRequest
    );

    return response;
  }

  public async post(
    events: TrackedEvent[],
    options: TrackerPostOptions = {}
  ): Promise<PostResponse> {
    if (this._extensionState === ExtensionState.Applying) {
      this._eventQueue.push([events, options]);
      return {};
    }

    return await this._requestHandler.post(this, events, options);
  }

  // #region DeviceData

  /**
   * Load device variables from the client, and store them as variables with a short TTL to avoid race conditions.
   *
   */
  private async _loadCachedDeviceVariables() {
    const variables = await this._getClientDeviceVariables();
    if (variables) {
      if (this._clientDeviceCache?.loaded) {
        return;
      }
      this._clientDeviceCache!.loaded = true;

      await this.set(
        map2(variables, ([, value]) => value),
        { trusted: true }
      ).all(); // Ignore conflicts. That just means there are concurrent requests.
    }
  }

  private async _getClientDeviceVariables() {
    if (!this._clientDeviceCache) {
      const deviceCache = (this._clientDeviceCache = {} as DeviceVariableCache);

      let timestamp: number | undefined;
      for (const purposeName of DataPurposes.names) {
        // Device variables are stored with a cookie for each purpose.

        const cookieName =
          this._requestHandler._cookieNames.deviceByPurpose[purposeName];
        const cookieValue = this.cookies[cookieName]?.value;

        if (cookieName && cookieValue) {
          const decrypted = (await this._decryptCookie(
            cookieValue,
            ` ${purposeName} device variables`
          )) as ClientDeviceDataBlob;
          if (!decrypted || !Array.isArray(decrypted)) {
            // Deserialization error. Remove the cookie.
            this.cookies[cookieName] = {};
          } else {
            for (let value of decrypted) {
              if (!value || !Array.isArray(value)) {
                continue;
              }

              value = tryConvertLegacyDeviceVariable(value) ?? value;
              (deviceCache.variables ??= {})[value[0]] ??= {
                scope: "device",
                key: value[0],
                version: value[1],
                value: value[2],
                created: (timestamp ??= now()),
                modified: (timestamp ??= now()),
              };
            }
          }
        }
      }
    }
    return this._clientDeviceCache.variables;
  }

  public getRequestItems(source: any): Map<any, any> {
    return get2(this._requestItems, source, () => new Map());
  }

  public registerSessionChangedCallback(callback: SessionChangedCallback) {
    return this._sessionChangedEvent[0](callback);
  }

  /**
   * Used by the {@link TrackerVariableStorage} to maintain device data stored in the device and only briefly cached on the server.
   * @internal
   */
  public _touchClientDeviceData() {
    if (this._clientDeviceCache) {
      this._clientDeviceCache.touched = true;
    }
  }

  // #endregion

  /**
   *
   * Initializes the tracker with session and device data.
   * The deviceId ans deviceSessionId parameters are only used if no session already exists.
   * After that they will stick. This means if a device starts a new server session, its device session will remain.
   * Similarly, if an old frozen tab suddenly wakes up it will get the new device session.
   * (so yes, they can hypothetically be split across the same tab even though that goes against the definition).
   *
   * @internal */
  public async _ensureInitialized({
    deviceId,
    deviceSessionId,
    passive,
  }: TrackerInitializationOptions = {}): Promise<this> {
    if (this._initialized === (this._initialized = true)) {
      return this;
    }
    this._requestId = await this.env.nextId("request");

    const timestamp = now();

    // TODO: Remove eventually when we can be sure, no one have old cookies in the browsers anymore.
    const legacyConsent = tryConvertLegacyConsent(
      this.cookies[this._requestHandler._cookieNames.consent]?.value
    );

    this._consent =
      legacyConsent ??
      DataUsage.deserialize(
        this.cookies[this._requestHandler._cookieNames.consent]?.value,
        this._defaultConsent
      );

    await this._ensureSession(timestamp, {
      deviceId,
      deviceSessionId,
      passive,
    });

    return this;
  }

  public async reset({
    session = true,
    device = false,
    consent = false,
    referenceTimestamp,
    deviceId,
    deviceSessionId,
  }: {
    session: boolean;
    device?: boolean;
    consent?: boolean;
    referenceTimestamp?: Timestamp;
    deviceId?: string;
    deviceSessionId?: string;
  }) {
    if (consent) {
      await this.updateConsent({ classification: "anonymous", purposes: {} });
    }
    if (this._session) {
      await this._ensureSession(referenceTimestamp ?? now(), {
        deviceId,
        deviceSessionId,
        resetSession: session,
        resetDevice: device,
      });
    }
  }

  /**
   * Operations related to purging sessions or session/device data (consent changes etc.).
   *
   * These must be executed before the request ends, but _after_ tracker extensions' `post` methods,
   * since these extensions may rely on data in the "leaving" sessions,
   * e.g. the RavenDB extension map session IDs to sequential numbers based on a session variable.
   */
  private _purgeOperations: (() => Promise<any>)[] = [];

  public async dispose() {
    for (const purgeOperation of this._purgeOperations) {
      await purgeOperation();
    }
  }

  public async updateConsent({
    purposes,
    classification,
  }: Partial<DataUsage>): Promise<void> {
    if (!this._session) return;

    purposes = DataPurposes.parse(purposes);
    classification = DataClassification.parse(classification);
    purposes ??= this.consent.purposes;
    classification ??= this.consent.classification;

    if (
      DataClassification.compare(
        classification ?? this.consent.classification,
        this.consent.classification
      ) < 0 ||
      some2(this.consent.purposes, ([key]) => !purposes?.[key])
    ) {
      // Capture these variables for lambda.
      const sessionId = this.sessionId;
      const deviceId = this.deviceId;
      const expiredPurposes = obj(this.consent.purposes, ([key]) =>
        !purposes?.[key] ? [key, true] : undefined
      );
      // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.
      this._purgeOperations.push(
        async () =>
          await this.env.storage.purge(
            [
              sessionId && {
                // NOTE: We do not touch user variables automatically.
                // Consumers can hook into the apply or patch pipelines with an extension to provide their own logic -
                // they can see the current consent on the tracker in context, and the new consent from the event.
                scopes: ["session"],
                entityIds: [sessionId],
                purposes: expiredPurposes,
                classification: { gt: classification },
              },
              deviceId && {
                scopes: ["device"],
                entityIds: [deviceId],
                purposes: expiredPurposes,
                classification: { gt: classification },
              },
            ],
            { bulk: true, context: { trusted: true } }
          )
      );
    }

    let previousLevel = this._consent.classification;
    const previousConsent = this._consent;
    this._consent = { classification, purposes };

    const timestamp = now();
    if ((classification === "anonymous") !== (previousLevel === "anonymous")) {
      // We switched from cookie-less to cookies or vice versa.
      // Refresh scope infos and anonymous session pointer.
      await this._ensureSession(timestamp, {
        previousConsent,
        refreshState: true,
      });
    }

    this._changedVariables.set(
      trackerVariableKey({ scope: "session", key: CONSENT_INFO_KEY }),
      {
        scope: "session",
        key: CONSENT_INFO_KEY,
        created: timestamp,
        modified: timestamp,
        value: DataUsage.clone(this._consent),
        version: timestamp.toString(),
      }
    );
  }

  private _snapshot(
    previousConsent?: UserConsent
  ): TrackerSnapshot | undefined {
    return (
      this.session && {
        consent: { ...(previousConsent ?? this.consent) },
        session: { ...this.session },
        device: this.device && { ...this.device },
      }
    );
  }
  private async _ensureSession(
    timestamp = now(),
    {
      deviceId,
      deviceSessionId = this.deviceSessionId,
      passive = false,
      resetSession = false,
      resetDevice = false,
      refreshState = false,
      previousConsent,
    }: SessionInitializationOptions = {}
  ) {
    const useAnonymousTracking = this._consent.classification === "anonymous";
    let sessionCreated = false;

    if ((resetSession || resetDevice) && this.sessionId) {
      // Purge old data. No point in storing this since it will no longer be used.
      await this.env.storage.purge(
        [
          resetSession &&
            this.sessionId && { scope: "session", entityIds: [this.sessionId] },
          resetSession &&
            this.sessionId &&
            useAnonymousTracking &&
            this._anonymousSessionReferenceId && {
              scope: "session",
              entityIds: [this._anonymousSessionReferenceId],
            },
          resetDevice &&
            this.deviceId && { scope: "device", entityIds: [this.deviceId] },
        ],
        { bulk: true, context: { trusted: true } }
      );
    } else if (this._session?.value && !refreshState) {
      // We already have a session value, and no refresh is needed (refresh is needed e.g. when changing consent.)
      // No refresh needed means this method has been called a second time, just to be sure the session is initialized.
      return;
    }

    const snapshot: TrackerSnapshot | undefined =
      this._snapshot(previousConsent);
    // In case we refresh (calling this method again, e.g. from consent change), we might already have an identified session ID.
    let identifiedSessionId = resetSession
      ? undefined
      : // Disregard the current session info if it anonymous.
        (this.session?.anonymous ? undefined : this.sessionId) ??
        (
          await this._decryptCookie(
            this.cookies[this._requestHandler._cookieNames.session]?.value,
            "Session ID"
          )
        )?.id;

    // We might also have an anonymous session ID.
    let anonymousSessionId: string | undefined;

    deviceId =
      deviceId ??
      (resetDevice
        ? undefined
        : this.deviceId ??
          (
            this._getClientDeviceVariables()?.[SCOPE_INFO_KEY]
              ?.value as DeviceInfo
          )?.id);

    if (!identifiedSessionId || useAnonymousTracking) {
      // We need to know the anonymous session ID (if any).
      // Either because it must be included as a hint in the identified session (for analytical processing)
      // or because we are using anonymous tracking.
      anonymousSessionId =
        (this.session?.anonymous ? this.sessionId : undefined) ??
        (await this.env.storage
          .get(
            {
              scope: "session",
              key: SESSION_REFERENCE_KEY,
              entityId: this._anonymousSessionReferenceId,
              // Only initialize if anonymous tracking.
              init: () =>
                !passive && useAnonymousTracking
                  ? this.env.nextId("anonymous-session")
                  : undefined,
            },
            { trusted: true }
          )
          .value());
    }

    if (useAnonymousTracking) {
      // Anonymous tracking.
      if (!passive) {
        // Clear session cookie, if any.
        this.cookies[this._requestHandler._cookieNames.session] = {
          httpOnly: true,
          sameSitePolicy: "None",
          essential: true,
          value: null,
        };

        if (identifiedSessionId || deviceId) {
          // We switched from identified to anonymous tracking. Remove current session and device variables.
          this._purgeOperations.push(async () => {
            await this.env.storage.purge(
              [
                identifiedSessionId && {
                  scope: "session",
                  entityIds: [identifiedSessionId],
                },
                deviceId && { scope: "device", entityIds: [deviceId] },
              ],
              { bulk: true, context: { trusted: true } }
            );
          });
        }
      }

      this._device = undefined;
      this._session = anonymousSessionId
        ? await this.env.storage.get(
            {
              scope: "session",
              key: SCOPE_INFO_KEY,
              entityId: anonymousSessionId,
              init: async () => {
                if (passive) {
                  return undefined;
                }
                sessionCreated = true;
                return createInitialScopeData(anonymousSessionId!, timestamp, {
                  deviceSessionId:
                    deviceSessionId ??
                    (await this.env.nextId("device-session")),
                  anonymous: true,
                });
              },
            },
            { trusted: true }
          )
        : undefined;
    } else {
      // Make sure we have device ID and session IDs (unless passive, where new sessions are not created from context menu navigation links).

      if (
        // 1. We do not have an existing session ID from a cookie:
        !identifiedSessionId ||
        // 2. The session ID from the cookie has expired:
        (this._session?.entityId !== identifiedSessionId &&
          !(this._session = await this.env.storage.get({
            scope: "session",
            key: SCOPE_INFO_KEY,
            entityId: identifiedSessionId,
          })))
      ) {
        identifiedSessionId = await this.env.nextId("session");
      }

      // We might already have read the session above in check 2, or _ensureSession has already been called earlier.
      if (this.sessionId !== identifiedSessionId) {
        this._session = await this.env.storage.get(
          {
            scope: "session",
            key: SCOPE_INFO_KEY,
            entityId: identifiedSessionId,
            init: async () => {
              if (passive) return undefined;
              sessionCreated = true;
              // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
              // This means clients must make sure the initial request to the endpoint completes before more are sent (or at least do a fair effort).
              // Additionally, analytics processing should be aware of empty sessions, and decide what to do with them (probably filter them out).

              const data = createInitialScopeData(
                identifiedSessionId,
                timestamp,
                {
                  anonymous: false,
                  // Initialize device ID here to keep it in the session.
                  deviceId: deviceId ?? (await this.env.nextId("device")),
                  deviceSessionId:
                    deviceSessionId ??
                    (await this.env.nextId("device-session")),
                  anonymousSessionId,
                }
              );

              return data;
            },
          },
          { trusted: true }
        );
      }

      deviceId = this._session?.value.deviceId;
      this._device = deviceId
        ? await this.env.storage.get(
            {
              scope: "device",
              key: SCOPE_INFO_KEY,
              entityId: deviceId,
              init: () =>
                passive
                  ? undefined
                  : (createInitialScopeData(deviceId!, timestamp, {
                      sessions: 1,
                    }) as DeviceInfo),
            },
            { trusted: true }
          )
        : undefined;

      if (this._session?.value.isNew && !this._device?.value.isNew) {
        // New session, existing device. Update statistics.
        await this.env.storage.set(
          {
            scope: "device",
            key: SCOPE_INFO_KEY,
            entityId: deviceId!,
            patch: (current: DeviceInfo) =>
              current &&
              ({
                ...current,
                sessions: current.sessions + 1,
                lastSeen: timestamp,
              } as DeviceInfo as DeviceInfo),
          },
          { trusted: true }
        );
      }

      if (!passive) {
        if (anonymousSessionId) {
          // We went from anonymous to identified tracking.
          const anonymousSessionReferenceId = this._anonymousSessionReferenceId;
          this._purgeOperations.push(async () => {
            await this.env.storage
              .set(
                [
                  {
                    scope: "session",
                    key: SCOPE_INFO_KEY,
                    entityId: anonymousSessionId,
                    value: null,
                    force: true,
                  },
                  anonymousSessionReferenceId && {
                    scope: "session",
                    key: SESSION_REFERENCE_KEY,
                    entityId: anonymousSessionReferenceId,
                    value: null,
                    force: true,
                  },
                ],
                { trusted: true }
              )
              .all();
          });
        }

        this.cookies[this._requestHandler._cookieNames.session] = {
          httpOnly: true,
          sameSitePolicy: "None",
          essential: true,
          value: this._encryptCookie({ id: identifiedSessionId }),
        };

        if (
          this._session &&
          (snapshot?.session.id !== this._session?.value.id ||
            snapshot?.session.deviceId !== this._session?.value.deviceId ||
            snapshot?.device?.id !== this._device?.value.id)
        ) {
          this._sessionChangedEvent[1](this._snapshot()!, snapshot);
        }
      }
    }

    if (
      this.deviceSessionId != null &&
      deviceSessionId !== this.deviceSessionId
    ) {
      // The sent device ID does not match the one in the current session.
      // For identified session this means an old tab woke up after being suspended.
      // For anonymous sessions this more likely indicates that multiple clients are active in the same session.
      this._expiredDeviceSessionId = deviceSessionId;
    }

    if (this.sessionId) {
      (this._previousSessions ??= new Map()).set(this.sessionId, {
        trustedContext: this.trustedContext,
        consent: DataUsage.clone(this.consent),
      });
    }
  }

  /** @internal */
  public _getConsentStateForSession(
    session: Session | undefined
  ): PreviousSessionState | undefined {
    if (!session?.sessionId) return undefined;
    if (session.sessionId === this.sessionId) {
      return {
        trustedContext: this.trustedContext,
        consent: DataUsage.clone(this.consent),
      };
    }
    return this._previousSessions?.get(session.sessionId);
  }

  /**
   *  Must be called last by the request handler just before a response is sent.
   *  The tracker must not be used afterwards.
   *  @internal
   * */
  public async _persist(sendCookies = false) {
    if (sendCookies) {
      this.cookies[this._requestHandler._cookieNames.consent] = {
        httpOnly: true,
        maxAge: Number.MAX_SAFE_INTEGER,
        essential: true,
        sameSitePolicy: "None",
        value: DataUsage.serialize(this.consent),
      };

      const splits: PartialRecord<DataPurposeName, ClientDeviceDataBlob> = {};

      if (this._clientDeviceCache?.touched) {
        // We have updated device data and need to refresh to get whatever other processes may have written (if any).

        for await (const variable of iterateQueryResults(this, {
          scope: "device",
        })) {
          forEach2(
            DataPurposes.parse(variable.schema?.usage.purposes, {
              names: true,
            }),
            (purpose) => {
              return (splits[purpose] ??= []).push([
                variable.key,
                variable.version,
                variable.value,
              ]);
            }
          );
        }
      }
      const isAnonymous = this.consent.classification === "anonymous";

      if (isAnonymous) {
        // Clear session cookie if we have one.
        this.cookies[this._requestHandler._cookieNames.session] = {};
      }

      if (isAnonymous || this._clientDeviceCache?.touched) {
        for (const purpose of DataPurposes.names) {
          const remove =
            isAnonymous ||
            (purpose !== "necessary" &&
              (!this._consent?.purposes[purpose] || !splits[purpose]));

          const cookieName =
            this._requestHandler._cookieNames.deviceByPurpose[purpose];

          if (remove) {
            this.cookies[cookieName] = {};
          } else if (splits[purpose]) {
            this.cookies[cookieName] = {
              httpOnly: true,
              maxAge: Number.MAX_SAFE_INTEGER,
              sameSitePolicy: "None",
              essential: purpose === "necessary",
              value: this._encryptCookie(splits[purpose]),
            };
          }
        }
      }
      // Keep session alive in a fire and forget like fashion.
      if (this.sessionId) {
        (async () => {
          try {
            this.env.storage.renew([
              {
                scope: "session",
                entityIds: truish2([
                  this.sessionId,
                  isAnonymous && this._anonymousSessionReferenceId,
                ]),
              },
              this.deviceId && {
                scope: "device",
                entityIds: [this.deviceId],
              },
            ]);
          } catch (e) {
            this.env.error(
              this,
              `An error occurred while renewing session ${this.sessionId} (keeping it alive).`
            );
          }
        })();
      }
    } else {
      (this.cookies as any) = {};
    }
  }

  // #region Storage
  private _getStorageContext(
    source?: TrackerVariableStorageContext
  ): VariableStorageContext {
    return {
      ...source,
      scope: this,
      trusted: source?.trusted ?? true,
      dynamicVariables: {
        session: { [CONSENT_INFO_KEY]: () => DataUsage.clone(this.consent) },
      },
    };
  }

  async renew(): Promise<void> {
    await this.env.storage.renew(
      { scopes: ["device", "session"] },
      this._getStorageContext()
    );
  }

  public get<
    Getters extends VariableOperationParameter<
      "get",
      ServerScoped<VariableGetter> & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    getters: WithCallbacks<"get", Getters, KnownTrackerKeys>,
    context?: TrackerVariableStorageContext
  ): VariableOperationResult<
    "get",
    Getters,
    ServerScoped<VariableKey>,
    KnownTrackerKeys
  > {
    return toVariableResultPromise(
      "get",
      getters,
      async (getters: VariableGetter[]) => {
        if (getters.some((getter) => getter.scope === "device")) {
          await this._loadCachedDeviceVariables();
        }

        const storageResults = await this.env.storage
          .get(getters as any, this._getStorageContext(context))
          .all();

        if (
          storageResults.some(
            (result) =>
              result.scope === "device" &&
              result.status === VariableResultStatus.Created
          )
        ) {
          this._touchClientDeviceData();
        }

        return new Map(
          map2(storageResults, (result, index) => [getters[index], result])
        );
      }
    ) as any;
  }

  public set<
    Setters extends VariableOperationParameter<
      "set",
      ServerScoped<VariableSetter> & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    setters: WithCallbacks<"set", Setters, KnownTrackerKeys>,
    context?: TrackerVariableStorageContext
  ): VariableOperationResult<
    "set",
    Setters,
    ServerScoped<VariableKey>,
    KnownTrackerKeys
  > {
    return toVariableResultPromise("set", setters, async (setters) => {
      if (setters.some((setter) => setter.scope === "device")) {
        await this._loadCachedDeviceVariables();
      }
      const storageResults = await this.env.storage
        .set(setters, this._getStorageContext(context))
        .all();

      for (const result of storageResults) {
        if (result.key === SCOPE_INFO_KEY) {
          if (result.scope === "session") {
            this._session = isVariableResult<SessionInfo>(result)
              ? result
              : undefined;
          }
          if (result.scope === "device") {
            if (this._clientDeviceCache) {
              this._clientDeviceCache.touched = true;
            }
            this._device = isVariableResult<DeviceInfo>(result)
              ? result
              : undefined;

            this._touchClientDeviceData();
          }

          if (isVariableResult(result)) {
            this._changedVariables.set(trackerVariableKey(result), result);
          }
        }
      }

      return new Map(
        map2(storageResults, (result, index) => [setters[index], result])
      );
    }) as any;
  }

  public async query(
    filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>,
    {
      context,
      ...options
    }: VariableQueryOptions & {
      context?: VariableStorageContext;
    } = {}
  ): Promise<VariableQueryResult> {
    if (!isArray(filters)) {
      filters = [filters];
    }

    if (
      filters.some(
        (filter: VariableQuery<VariableServerScope>) =>
          filter.scope === "device"
      )
    ) {
      await this._loadCachedDeviceVariables();
    }
    return this.env.storage.query(filters, {
      context: this._getStorageContext(context),
      ...options,
    });
  }

  public async purge(
    filters: ArrayOrSelf<VariableQuery<VariableServerScope> | Falsish>,
    {
      context,
      bulk,
    }: VariablePurgeOptions & {
      context?: VariableStorageContext;
    } = {}
  ) {
    await this.env.storage.purge(filters, {
      context: this._getStorageContext(context),
      bulk,
    });
  }

  // #endregion
}

export const trackerVariableKey = ({
  scope,
  entityId,
  key,
}: {
  scope: string;
  entityId?: string;
  key: string;
}) => `${scope}\0${entityId ?? ""}\0${key}`;

export const trackedResponseVariables = new Set([
  trackerVariableKey({ scope: "session", key: SCOPE_INFO_KEY }),
  trackerVariableKey({ scope: "session", key: CONSENT_INFO_KEY }),
]);

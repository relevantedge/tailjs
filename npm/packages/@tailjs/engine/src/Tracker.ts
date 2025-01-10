import { SCOPE_INFO_KEY, SESSION_REFERENCE_KEY } from "@constants";
import { Transport, defaultTransport } from "@tailjs/transport";
import {
  DATA_PURPOSES,
  DataClassification,
  DataPurposeName,
  DataUsage,
  DeviceInfo,
  PostResponse,
  RestrictScopes,
  ScopeInfo,
  ServerScoped,
  ServerVariableScope,
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
  VariableSetResult,
  VariableSetter,
  WithCallbacks,
  consumeQueryResults,
  dataPurposes,
  isVariableResult,
  toVariableResultPromise,
} from "@tailjs/types";
import {
  ArrayOrSelf,
  Freeze,
  Nullish,
  PartialRecord,
  ReadonlyRecord,
  concat,
  filter2,
  forEach2,
  isArray,
  map,
  map2,
  now,
  obj,
  some2,
  truish,
  update2,
} from "@tailjs/util";
import {
  Cookie,
  CookieMonster,
  HttpRequest,
  HttpResponse,
  KnownTrackerKeys,
  RequestHandler,
  TrackedEventBatch,
  TrackerEnvironment,
  VariableStorageContext,
  requestCookies,
} from "./shared";

export interface TrackerServerConfiguration {
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
  sessionReferenceId?: string;

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
}

export type TrackerVariableStorageContext = Omit<
  VariableStorageContext,
  "scope"
>;

const createInitialScopeData = <T extends ScopeInfo>(
  id: string,
  timestamp: Timestamp,
  additionalData: Omit<T, keyof ScopeInfo>
): T =>
  ({
    id,
    firstSeen: timestamp,
    lastSeen: timestamp,
    views: 0,
    isNew: true,
    ...additionalData,
  } as T);

interface DeviceVariableCache {
  /** Parsed variables from cookie. */
  variables?:
    | Record<
        string,
        RestrictScopes<Variable, "device", never> & {
          _changed?: boolean;
        }
      >
    | undefined;

  /** Only refresh device variables stored at client if changed.  */
  touched?: boolean;

  /** The cached variables from cookies has been loaded into storage. */
  loaded?: boolean;
}

type ClientDeviceDataBlob = ClientDeviceVariable[];

type ClientDeviceVariable = [key: string, version: string, value: any];

export class Tracker {
  /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */
  private _eventQueue: [
    events: TrackedEventBatch,
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
  public readonly requestItems: Map<any, any>;
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

  /** Variables that have been added or updated during the request (cf. {@link TrackerStorageContext.push}). */
  private readonly _changedVariables: VariableSetResult<any>[] = [];

  private readonly _clientCipher: Transport;
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
    sessionReferenceId,
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
    this.requestItems = new Map<any, any>();

    this.clientIp = clientIp;

    this.referrer = this.headers["referer"] ?? null;

    this.trustedContext = !!trustedContext;

    // Defaults to unencrypted transport if nothing is specified.
    this._clientCipher = cipher ?? defaultTransport;
    this._sessionReferenceId = sessionReferenceId;
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
  public _sessionReferenceId: string | undefined;

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
    return this._session?.value?.deviceId;
  }

  public get authenticatedUserId() {
    return this._session?.value?.userId;
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
    const cookies = map(
      new Map<string, string | Nullish>(
        concat(
          map(this.cookies, ([name, cookie]) => [name, cookie.value]),
          map(
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
    events: TrackedEventBatch,
    options: TrackerPostOptions = {}
  ): Promise<PostResponse> {
    if (this._extensionState === ExtensionState.Applying) {
      this._eventQueue.push([events, options]);
      return {};
    }

    const result = await this._requestHandler.post(this, events, options);
    if (this._changedVariables.length) {
      ((result.variables ??= {}).get ??= []).push(
        ...(this._changedVariables as any)
      );
    }
    return result;
  }

  // #region DeviceData

  private async _loadCachedDeviceVariables() {
    // Loads device variables into cache.
    const variables = this._getClientDeviceVariables();
    if (variables) {
      if (this._clientDeviceCache?.loaded) {
        return;
      }

      this._clientDeviceCache!.loaded = true;

      await this.set(map2(variables, ([, value]) => value));
    }
  }

  private _getClientDeviceVariables() {
    if (!this._clientDeviceCache) {
      const deviceCache = (this._clientDeviceCache = {} as DeviceVariableCache);

      let timestamp: number | undefined;
      DATA_PURPOSES.map((name) => {
        // Device variables are stored with a cookie for each purpose.

        forEach2(
          this.httpClientDecrypt(
            this.cookies[
              this._requestHandler._cookieNames.deviceByPurpose[name]
            ]?.value
          ) as ClientDeviceDataBlob,
          (value) =>
            update2(
              (deviceCache.variables ??= {}),
              value[0],
              (current) =>
                current ?? {
                  scope: "device",
                  key: value[0],
                  version: value[1],
                  value: value[2],
                  created: (timestamp ??= now()),
                  modified: (timestamp ??= now()),
                }
            )
        );
      });
      return this._clientDeviceCache.variables;
    }
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
    this._consent = DataUsage.deserialize(
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

  public async updateConsent({
    purposes,
    classification,
  }: Partial<DataUsage>): Promise<void> {
    if (!this._session) return;

    purposes = dataPurposes(purposes);
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
      // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.

      await this.purge({
        scopes: ["session", "device"],
        purposes: obj(this.consent.purposes, ([key]) =>
          !purposes?.[key] ? [key, true] : undefined
        ),
        classification: { gt: classification },
      });
    }

    let previousLevel = this._consent.classification;
    this._consent = { classification, purposes };

    if ((classification === "anonymous") !== (previousLevel === "anonymous")) {
      // We switched from cookie-less to cookies or vice versa.
      // Refresh scope infos and anonymous session pointer.
      await this._ensureSession(now(), { refreshState: true });
    }
  }

  private async _ensureSession(
    timestamp: number,
    {
      deviceId,
      deviceSessionId = this.deviceSessionId,
      passive = false,
      resetSession = false,
      resetDevice = false,
      refreshState = false,
    }: SessionInitializationOptions = {}
  ) {
    if ((resetSession || resetDevice) && this._sessionReferenceId) {
      // Purge old data. No point in storing this since it will no longer be used.
      await this.purge(
        {
          scopes: filter2([resetSession && "session", resetDevice && "device"]),
        },
        { bulk: true }
      );
    } else if (this._session?.value && !refreshState) {
      return;
    }

    // In case we refresh, we might already have a session ID.
    let sessionId = this.sessionId;

    let cachedDeviceData: DeviceInfo | undefined;
    const getDeviceId = async () =>
      this._consent.classification !== "anonymous"
        ? deviceId ??
          (resetDevice ? undefined : cachedDeviceData?.id) ??
          (await this.env.nextId("device"))
        : undefined;

    if (this._consent.classification !== "anonymous") {
      cachedDeviceData = resetDevice
        ? undefined
        : (this._getClientDeviceVariables()?.[SCOPE_INFO_KEY]
            ?.value as DeviceInfo);

      if (sessionId && this._sessionReferenceId !== sessionId && !passive) {
        // We switched from cookie-less to cookies. Purge reference.
        await this.env.storage.set(
          [
            {
              scope: "session",
              key: SESSION_REFERENCE_KEY,
              entityId: this._sessionReferenceId!,
              value: null,
              force: true,
            },
            {
              scope: "session",
              key: SCOPE_INFO_KEY,
              entityId: sessionId,
              patch: async (current: SessionInfo) => ({
                ...current,
                deviceId: await getDeviceId(),
              }),
            },
          ],

          { trusted: true }
        );
      }

      // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
      // This means clients must make sure the initial request to endpoint completes before more are sent (or at least do a fair effort).
      // Additionally, empty sessions should be filtered by analytics using the collected events.
      this._sessionReferenceId = sessionId =
        (resetSession
          ? undefined
          : this.httpClientDecrypt(
              this.cookies[this._requestHandler._cookieNames.session]?.value
            )?.id) ??
        (passive ? undefined : sessionId ?? (await this.env.nextId("session")));

      this.cookies[this._requestHandler._cookieNames.session] = {
        httpOnly: true,
        sameSitePolicy: "None",
        essential: true,
        value: this.httpClientEncrypt({ id: this._sessionReferenceId }),
      };
    } else if (this._sessionReferenceId) {
      if (sessionId && this._sessionReferenceId === sessionId && !passive) {
        // We switched from cookies to cookie-less. Remove deviceId and device info.
        await this.env.storage.set(
          truish([
            {
              scope: "session",
              key: SCOPE_INFO_KEY,
              entityId: sessionId,
              patch: (current) => ({
                ...current?.value,
                deviceId: undefined,
              }),
            },
            this.deviceId && {
              scope: "session",
              key: SCOPE_INFO_KEY,
              entityId: this.deviceId,
              force: true,
              value: undefined,
            },
          ])
        );
        this._device = undefined;
      }
      this._sessionReferenceId = this._sessionReferenceId;

      sessionId = await this.env.storage
        .get({
          scope: "session",
          key: SESSION_REFERENCE_KEY,
          entityId: this._sessionReferenceId,
          init: async () =>
            passive ? undefined : sessionId ?? (await this.env.nextId()),
        })
        .value();
    } else {
      // We do not have any information available for assigning a session ID.
      this._session = this._device = undefined;
      return;
    }

    if (sessionId == null) {
      return;
    }

    this._session =
      // We bypass the TrackerVariableStorage here and use the environment directly.
      // The session ID we currently have is provisional,
      // and will not become the tracker's actual session ID before the info variable has been set.

      await this.env.storage.get({
        scope: "session",
        key: SCOPE_INFO_KEY,
        entityId: sessionId,
        init: async () => {
          if (passive) return undefined;

          return createInitialScopeData<SessionInfo>(
            sessionId!, //INV: !passive => sessionId != null
            timestamp,
            {
              deviceId: await getDeviceId(),
              deviceSessionId:
                deviceSessionId ?? (await this.env.nextId("device-session")),
              previousSession: cachedDeviceData?.lastSeen,
              hasUserAgent: false,
            }
          );
        },
      });

    if (this._session?.value) {
      let device =
        this._consent.classification === "anonymous" && this.deviceId
          ? await this.env.storage.get({
              scope: "device",
              key: SCOPE_INFO_KEY,
              entityId: this.deviceId,
              init: async () =>
                createInitialScopeData<DeviceInfo>(
                  this._session!.value.deviceId!,
                  timestamp,
                  {
                    sessions: 1,
                  }
                ),
            })
          : undefined;

      this._device = device as any;

      if (
        device?.value &&
        device.status !== VariableResultStatus.Created &&
        this.session?.isNew
      ) {
        // A new session started on an existing device.
        this._device = await this.env.storage.set({
          scope: "device",
          key: SCOPE_INFO_KEY,
          entityId: this.deviceId!,
          patch: (device) =>
            device && {
              ...device,
              sessions: device.value.sessions + 1,
              lastSeen: this.session!.lastSeen,
            },
        });
      }

      if (
        deviceSessionId != null &&
        this.deviceSessionId != null &&
        deviceSessionId !== this.deviceSessionId
      ) {
        this._expiredDeviceSessionId = deviceSessionId;
      }
    }
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

        await consumeQueryResults(
          (cursor) =>
            this.query({ scope: "device", sources: ["*"] }, { cursor }),
          (variables) => {
            forEach2(variables, (variable) => {
              forEach2(
                dataPurposes(variable.schema?.usage.purposes, { names: true }),
                ([purpose]) =>
                  (splits[purpose] ??= []).push([
                    variable.key,
                    variable.schema!.usage.classification,
                    variable.version,
                    variable.value,
                    variable.schema!.usage.purposes,
                  ])
              );
            });
          }
        );
      }

      const isAnonymous = this.consent.classification === "anonymous";

      if (isAnonymous) {
        // Clear session cookie if we have one.
        this.cookies[this._requestHandler._cookieNames.session] = {};
      }

      if (isAnonymous || this._clientDeviceCache?.touched) {
        for (const purpose of dataPurposes(this.consent, { names: true })) {
          const remove = isAnonymous || !splits[purpose];

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
              value: this.httpClientEncrypt(splits[purpose]),
            };
          }
        }
      }
    } else {
      (this.cookies as any) = {};
    }
  }

  // #region Storage
  private _getStorageContext(
    source?: TrackerVariableStorageContext
  ): VariableStorageContext {
    return { ...source, scope: this };
  }

  async renew(): Promise<void> {
    await this.env.storage.refresh(
      { scopes: ["device", "session"] },
      this._getStorageContext()
    );
  }

  public get<
    Getters extends VariableOperationParameter<
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

        return new Map(
          map2(storageResults, (result, index) => [getters[index], result])
        );
      }
    ) as any;
  }

  public set<
    Setters extends VariableOperationParameter<
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
          }

          this._changedVariables.push(result);
        }
      }

      return new Map(
        map2(storageResults, (result, index) => [setters[index], result])
      );
    }) as any;
  }

  public async query(
    filters: ArrayOrSelf<VariableQuery<ServerVariableScope>>,
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

    if (filters.some((filter) => filter.scope === "device")) {
      await this._loadCachedDeviceVariables();
    }
    return this.env.storage.query(filters, {
      context: this._getStorageContext(context),
      ...options,
    });
  }

  public async purge(
    filters: ArrayOrSelf<VariableQuery<ServerVariableScope>>,
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

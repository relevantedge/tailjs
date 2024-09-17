import { SCOPE_INFO_KEY, SESSION_REFERENCE_KEY } from "@constants";
import { Transport, defaultTransport } from "@tailjs/transport";
import {
  DATA_PURPOSES,
  DataClassification,
  DataPurposeName,
  DataPurposes,
  DeviceInfo,
  PostResponse,
  ScopedKey,
  ScopeInfo,
  Session,
  SessionInfo,
  Timestamp,
  TrackedEvent,
  UserConsent,
  Variable,
  VariableGetter,
  VariableSetResult,
  VariableSetter,
  VariableResultStatus,
  VariableSuccessResult,
  dataClassification as dc,
  isSuccessResult,
  parseDataPurposes as dp,
  variableScope,
  VariableGetResult,
} from "@tailjs/types";
import {
  Nullish,
  PartialRecord,
  ReadonlyRecord,
  concat,
  forEach,
  map,
  now,
  obj,
  some,
  truish,
  update,
} from "@tailjs/util";
import {
  Cookie,
  CookieMonster,
  HttpRequest,
  HttpResponse,
  RequestHandler,
  TrackedEventBatch,
  TrackerEnvironment,
  VariableResultPromise,
  VariableStorageContext,
  requestCookies,
  toVariableResultPromise,
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

export type TrackerVariableGetter<T = any> = ScopedKey<VariableGetter<T>> & {
  /** Censor values that are server-side only. */
  client?: boolean;
};

export type TrackerVariableSetter<T = any> = ScopedKey<VariableSetter<T>> & {
  /** Censor values that are server-side only. */
  client?: boolean;
};

export type TrackerVariableStorageContext = Pick<
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
        ScopedKey<Variable> & {
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
  private readonly _changedVariables: VariableSuccessResult<any>[] = [];

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
  public _device?: Variable<DeviceInfo> | undefined;

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
    purposes: { necessary: true },
  };

  public get consent() {
    return this._consent;
  }

  public get requestId() {
    return `${this._requestId}`;
  }

  public get initialized() {
    return this._initialized;
  }

  public get session(): Readonly<SessionInfo> | undefined {
    return this._session?.value;
  }

  public get sessionId(): string | undefined {
    return this.session?.id;
  }

  public get deviceSessionId() {
    return this._session?.value?.deviceSessionId;
  }

  public get device(): Readonly<DeviceInfo> | undefined {
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
      await this._set(map(variables, ([, value]) => value) as any);
    }
  }

  private _getClientDeviceVariables() {
    if (!this._clientDeviceCache) {
      const deviceCache = (this._clientDeviceCache = {} as DeviceVariableCache);

      let timestamp: number | undefined;
      DATA_PURPOSES.map((name) => {
        // Device variables are stored with a cookie for each purpose.

        forEach(
          this.httpClientDecrypt(
            this.cookies[
              this._requestHandler._cookieNames.deviceByPurpose[name]
            ]?.value
          ) as ClientDeviceDataBlob,
          (value) => {
            update((deviceCache!.variables ??= {}), value[0], (current) => {
              current ??= {
                scope: "device",
                key: value[0],
                version: value[1],
                value: value[2],
                created: (timestamp ??= now()),
                modified: (timestamp ??= now()),
              };
              return current;
            });
          }
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
    const consentData = (
      this.cookies[this._requestHandler._cookieNames.consent]?.value ??
      `${this._defaultConsent.purposes}@${this._defaultConsent.classification}`
    ).split("@");

    this._consent = {
      classification:
        dc(consentData[1], false) ?? this._defaultConsent.classification,
      purposes: dp(consentData[0]?.split(",")) ?? this._defaultConsent.purposes,
    };

    await this._ensureSession(timestamp, {
      deviceId,
      deviceSessionId,
      passive,
    });

    return this;
  }

  public async reset(
    session: boolean,
    device = false,
    consent = false,
    referenceTimestamp?: Timestamp,
    deviceId?: string,
    deviceSessionId?: string
  ) {
    if (consent) {
      await this.updateConsent("anonymous", { necessary: true });
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

  public async updateConsent(
    classification?: DataClassification,
    purposes?: DataPurposes
  ): Promise<void> {
    if (!this._session) return;

    purposes ??= this.consent.purposes;
    classification ??= this.consent.classification;

    if (
      dc.compare(
        classification ?? this.consent.classification,
        this.consent.classification
      ) < 0 ||
      some(this.consent.purposes, ([key]) => !purposes?.[key])
    ) {
      // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.

      await this.purge({
        session: true,
        device: true,
        filter: {
          purposes: obj(this.consent.purposes, ([key]) =>
            !purposes?.[key] ? [key, true] : undefined
          ),
          classification: { gt: classification },
        },
      });
    }

    let previousLevel = this._consent.classification;
    this._consent = { classification, purposes };

    if (
      dc.compare(classification, "anonymous") <= 0 !==
      dc.compare(previousLevel, "anonymous") <= 0
    ) {
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
      await this.purge({ session: resetSession, device: resetDevice });
    } else if (this._session?.value && !refreshState) {
      return;
    }

    // In case we refresh, we might already have a session ID.
    let sessionId = this.sessionId;

    let cachedDeviceData: DeviceInfo | undefined;
    const getDeviceId = async () =>
      dc.compare(this._consent.classification, "anonymous") > 0
        ? deviceId ??
          (resetDevice ? undefined : cachedDeviceData?.id) ??
          (await this.env.nextId("device"))
        : undefined;

    if (dc.compare(this._consent.classification, "anonymous") > 0) {
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
              entityId: this._sessionReferenceId,
              value: null,
              force: true,
            },
          ],
          { trusted: true }
        );

        await this.env.storage.set(
          [
            {
              scope: "session",
              key: SCOPE_INFO_KEY,
              entityId: sessionId,
              patch: async (current: SessionInfo) =>
                ({
                  ...current,
                  deviceId: await getDeviceId(),
                } as SessionInfo),
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
        .get([
          {
            scope: "session",
            key: SESSION_REFERENCE_KEY,
            entityId: this._sessionReferenceId,
            init: async () =>
              passive ? undefined : sessionId ?? (await this.env.nextId()),
          },
        ])
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

      await this.env.storage
        .get([
          {
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
                    deviceSessionId ??
                    (await this.env.nextId("device-session")),
                  previousSession: cachedDeviceData?.lastSeen,
                  hasUserAgent: false,
                }
              );
            },
          },
        ])
        .first();

    if (this._session.value) {
      let device =
        dc.compare(this._consent.classification, "anonymous") && this.deviceId
          ? await this.env.storage
              .get([
                {
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
                },
              ])
              .first()
          : undefined;

      this._device = device as any;

      if (
        device?.value &&
        device.status !== VariableResultStatus.Created &&
        this.session?.isNew
      ) {
        // A new session started on an existing device.
        this._device = (await this.env.storage
          .set([
            {
              scope: "device",
              key: SCOPE_INFO_KEY,
              entityId: this.deviceId,
              patch: (device) =>
                device &&
                ({
                  ...device,
                  sessions: device.value.sessions + 1,
                  lastSeen: this.session!.lastSeen,
                } as DeviceInfo),
            },
          ])
          .value()) as any;
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
        value:
          dc.compare(this.consent.classification, "anonymous") > 0
            ? this.consent.purposes + "@" + this.consent.classification
            : null,
      };

      const splits: PartialRecord<DataPurposeName, ClientDeviceDataBlob> = {};

      if (this._clientDeviceCache?.touched) {
        // We have updated device data and need to refresh to get whatever other processes may have written (if any).

        const deviceValues = await this.query([
          {
            scope: "device",
            source: "",
          },
        ]);

        forEach(deviceValues, (variable) => {
          dataPurposes.map(variable.purposes, ([, purpose]) =>
            (splits[purpose] ??= []).push([
              variable.key,
              variable.classification,
              variable.version,
              variable.value,
              variable.purposes,
            ])
          );
        });
      }

      if (this.consent.level === dc.Anonymous) {
        // Clear session cookie if we have one.
        this.cookies[this._requestHandler._cookieNames.session] = {};
      }

      if (
        this.consent.level <= dc.Anonymous ||
        this._clientDeviceCache?.touched
      ) {
        dataPurposes.pure.map(([, purpose]) => {
          const remove = this.consent.level <= dc.Anonymous || !splits[purpose];

          const cookieName =
            this._requestHandler._cookieNames.deviceByPurpose[purpose];

          if (remove) {
            this.cookies[cookieName] = {};
          } else if (splits[purpose]) {
            this.cookies[cookieName] = {
              httpOnly: true,
              maxAge: Number.MAX_SAFE_INTEGER,
              sameSitePolicy: "None",
              essential: purpose === DataPurposeFlags.Necessary,
              value: this.httpClientEncrypt(splits[purpose]),
            };
          }
        });
      }
    } else {
      (this.cookies as any) = {};
    }
  }

  // #region Storage
  private _getStorageContext(
    source?: TrackerVariableStorageContext
  ): VariableStorageContext {
    return { ...source, tracker: this };
  }

  async renew(): Promise<void> {
    for (const scope of [VariableScope.Device, VariableScope.Session]) {
      await this.env.storage.renew(
        scope,
        /* TrackerVariableStorage will fill this out */ ["(auto)"],
        this._getStorageContext()
      );
    }
  }

  public get(
    keys: ScopedKey<VariableGetter>[],
    context?: TrackerVariableStorageContext
  ): VariableResultPromise<VariableGetResult[]> {
    return toVariableResultPromise(this._get(keys, context));
  }
  private async _get(
    keys: VariableGetter[],
    context?: TrackerVariableStorageContext
  ): Promise<VariableGetResult[]> {
    if (keys.some((key) => key.scope === "device")) {
      await this._loadCachedDeviceVariables();
    }

    const variables = await this.env.storage.get(
      keys,
      this._getStorageContext(context)
    );

    return variables;
  }

  async query(
    filters: VariableDataUsageQuery[],
    context?: TrackerVariableStorageContext
  ): Promise<Variable[]> {
    if (filters.some((filter) => filter.scope === "device")) {
      await this._loadCachedDeviceVariables();
    }
    return this.env.storage.query(filters, this._getStorageContext(context));
  }

  private async _set(
    variables: VariableSetter,
    context?: TrackerVariableStorageContext
  ): VariableResultPromise<ScopedKey<VariableSetResult>[]> {
    return toVariableResultPromise(
      async () => {
        if (
          variables.some(
            (key) => variableScope(key?.scope) === VariableScope.Device
          )
        ) {
          await this._loadCachedDeviceVariables();
        }

        const results = restrictTargets(
          await this.env.storage.set(
            variables as VariableSetter[],
            this._getStorageContext(context)
          ).all
        );

        for (const result of results) {
          if (isSuccessResult(result)) {
            if (result.key === SCOPE_INFO_KEY) {
              result.scope === VariableScope.Session &&
                (this._session = result.current!);
              result.scope === VariableScope.Device &&
                (this._device = result.current);
            }
          }
        }
        return results;
      },
      undefined,
      (results) =>
        forEach(results, (result) => {
          return (
            result.status !== VariableResultStatus.NotModified &&
            this._changedVariables.push({
              ...(result.current ?? copyKey(result.source)),
              status: result.status,
            } as any)
          );
        })
    ) as any;
  }

  async purge({
    session = false,
    device = false,
    user = false,
    keys = ["*"],
    filter: classification = undefined as
      | Pick<VariableDataUsageQuery, "classification" | "purposes">
      | undefined,
  }): Promise<void> {
    if (!this.sessionId) return;

    const filters: VariableDataUsageQuery[] = truish([
      session && {
        keys,
        scope: "session",
        entityId: this._sessionReferenceId,
        ...classification,
      },
      device &&
        this.deviceId && {
          keys,
          scope: "device",
          entityId: this.deviceId,
          ...classification,
        },
      user &&
        this.authenticatedUserId && {
          keys,
          scope: "user",
          entityId: this.authenticatedUserId,
          ...classification,
        },
    ]);
    filters.length &&
      (await this.env.storage.purge(filters, { trusted: true }));
  }

  // #endregion
}

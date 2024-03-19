import {
  DataClassification,
  DataPurposes,
  PostResponse,
  Timestamp,
  TrackedEvent,
  Variable,
  VariableClassification,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  dataClassification,
  dataPurposes,
  isSuccessResult,
  Session,
} from "@tailjs/types";
import { Transport, createTransport } from "@tailjs/util/transport";
import { ReadOnlyRecord, map, params, unparam } from "./lib";
import {
  Cookie,
  HttpRequest,
  HttpResponse,
  RequestHandler,
  RequestHandlerConfiguration,
  TrackedEventBatch,
  TrackerEnvironment,
  VariableStorageContext,
  VariableGetResults,
  VariableSetError,
  VariableSetResults,
  VariableStorage,
} from "./shared";
import {
  MaybePromise,
  filter,
  forEach,
  isDefined,
  isNumber,
  now,
  obj,
  update,
} from "@tailjs/util";

export type TrackerSettings = Pick<
  RequestHandlerConfiguration,
  "sessionTimeout" | "includeIp" | "clientKeySeed"
> & {
  disabled?: boolean;
  clientIp?: string | null;
  headers?: Record<string, string>;
  host: string;
  path: string;
  url: string;
  queryString: Record<string, string[]>;
  cookies?: Record<string, Cookie>;
  requestHandler: RequestHandler;
};

const enum ExtensionState {
  Pending = 0,
  Applying = 1,
  Done = 2,
}

export type TrackerPostOptions = {
  routeToClient?: boolean;
  deviceSessionId?: string;
  deviceId?: string;
  userId?: string;
};

const SCOPE_DATA_KEY = "_data";

export interface ScopeData {
  id: string;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  views: number;
  isNew?: boolean;
}

const createInitialScopeData = <T extends ScopeData>(
  id: string,
  timestamp: Timestamp,
  additionalData: Omit<T, "id" | "consent" | "firstSeen" | "lastSeen" | "views">
): T =>
  ({
    id,
    firstSeen: timestamp,
    lastSeen: timestamp,
    views: 0,
    isNew: true,
    ...additionalData,
  } as T);

export interface SessionData extends ScopeData {
  deviceSessionId?: string;
  deviceId?: string;
  userId?: string;
  previousSession?: Timestamp;
}

export interface InternalSessionData extends SessionData {
  hasUserAgent?: boolean;
}

export interface DeviceData extends ScopeData {
  sessions: number;
}

interface DeviceVariableCache {
  /** Parsed variables from cookie. */
  variables?: Record<string, Variable> | undefined;

  /** Only refresh device variables stored at client if changed.  */
  touched?: boolean;
}

type ClientDeviceDataBlob = ClientDeviceVariable[];

type ClientDeviceVariable = [
  key: string,
  classification: DataClassification,
  version: string | undefined,
  value: any
];

export class Tracker {
  /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */
  private _eventQueue: [
    events: TrackedEventBatch,
    options: TrackerPostOptions
  ][] = [];
  private _extensionState = ExtensionState.Pending;
  private _initialized: boolean;
  private _requestId: string | undefined;

  /** @internal  */
  public readonly _clientEvents: TrackedEvent[] = [];

  /** @internal */
  public readonly _requestHandler: RequestHandler;
  public readonly clientIp: string | null;

  public readonly cookies: Record<string, Cookie>;
  public readonly disabled: boolean;
  public readonly env: TrackerEnvironment;
  public readonly headers: ReadOnlyRecord<string, string>;
  public readonly queryString: ReadOnlyRecord<string, string[]>;
  public readonly referrer: string | null;
  public readonly requestItems: Map<any, any>;
  /** Transient variables that can be used by extensions whilst processing a request. */
  public readonly transient: Record<string, any>;

  private readonly _clientCipher: Transport;
  public readonly clientKey: string;

  public host: string;
  public path: string;
  public url: string;

  public constructor({
    disabled = false,
    clientIp = null,
    headers,
    host,
    path,
    url,
    queryString,
    cookies,
    requestHandler,
    clientKeySeed,
  }: TrackerSettings) {
    this.disabled = disabled;
    this._requestHandler = requestHandler;
    this.env = requestHandler.environment;
    this.host = host;
    this.path = path;
    this.url = url;

    this.queryString = queryString ?? {};

    this.headers = headers ?? {};
    this.cookies = (cookies as Record<string, any>) ?? {};
    this.transient = {};
    this.requestItems = new Map<any, any>();

    this.clientIp =
      clientIp ??
      this.headers["x-forwarded-for"]?.[0] ??
      Object.fromEntries(params(this.headers["forwarded"]))["for"] ??
      null;

    this.referrer = this.headers["referer"] ?? null;
    let clientKey = `${this.clientIp}_${headers?.["user-agent"] ?? ""}`;
    clientKey = `${clientKey.substring(
      0,
      clientKey.length / 2
    )}${clientKeySeed}${clientKey.substring(clientKey.length / 2 + 1)}`;
    this._clientCipher = createTransport(
      (this.clientKey = this.env.hash(clientKey, 64))
    );
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
  public _sessionReferenceId: string;

  /** @internal */
  public _session: Variable<InternalSessionData>;

  /** @internal */
  public _device?: Variable<DeviceData>;

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

  private _consent: {
    level: DataClassification;
    purposes: DataPurposes;
  } = { level: DataClassification.None, purposes: DataPurposes.Necessary };

  public get consent() {
    return this._consent;
  }

  public get requestId() {
    return `${this._requestId}`;
  }

  public get session(): Readonly<SessionData> {
    return this._session.value!;
  }

  public get sessionId(): string {
    return this.session.id;
  }

  public get deviceSessionId() {
    return this._session.value?.deviceSessionId;
  }

  public get device(): Readonly<DeviceData> | undefined {
    return this._device?.value;
  }

  public get deviceId() {
    return this._session.value?.deviceId;
  }

  public get authenticatedUserId() {
    return this._session.value?.userId;
  }

  public async updateConsent(
    level?: DataClassification,
    purposes?: DataPurposes
  ): Promise<void> {
    level ??= this.consent.level;
    purposes ??= this.consent.purposes;
    if (level < this.consent.level || ~purposes & this.consent.purposes) {
      // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.

      await this.env.storage.purge([
        {
          keys: ["*"],
          scopes: [
            VariableScope.Session,
            VariableScope.Device,
            VariableScope.User,
          ],
          purposes: dataPurposes.map(([, flag]) => flag, ~purposes),
          classification: {
            min: level + 1,
          },
        },
      ]);
    }

    if (
      (level === DataClassification.None) !==
      (this.consent.level === DataClassification.None)
    ) {
      // We need to transition to or from cookie-less tracking which means the key used to refer to the session data changes.
      // (Non-cookieless uses a unique session ID, cookie-less uses a hash of request headers which is not guaranteed to be unique).
    }
    // if (consentLevel === this._consentLevel) return;
    // this._consentLevel = consentLevel;
    // if (consentLevel === DataClassification.None) {
    //   this._requestHandler._sessionStore.purge(this);
    // } else {
    //   // Copy current values from cookie-less store.
    //   await this._requestHandler._sessionStore.set(
    //     this,
    //     ...(await this._requestHandler._globalStorage.get(
    //       this,
    //       { scope: "session" },
    //       { scope: "device-session" },
    //       { scope: "device" },
    //       { scope: "user" }
    //     ))
    //   );
    //   await this._requestHandler._sessionStore.set(this, {
    //     scope: "session",
    //     key: "consent",
    //     value: consentLevel,
    //   });
    // }
  }

  public httpClientEncrypt(value: any): string {
    return this._clientCipher[0](value);
  }

  public httpClientDecrypt(encoded: string | null | undefined): any {
    return this._clientCipher[1](encoded);
  }

  /** @internal */
  public async _applyExtensions(deviceSessionId?: string, deviceId?: string) {
    await this._initialize(deviceSessionId, deviceId);
    if (this._extensionState === ExtensionState.Pending) {
      this._extensionState = ExtensionState.Applying;
      try {
        await this._requestHandler.applyExtensions(this);
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

    finalRequest.headers["cookie"] = unparam(
      Object.fromEntries(
        map(this.cookies, ([key, value]) => [key, value?.value])
          .filter((kv) => kv[1] != null)
          .concat(params(finalRequest.headers["cookie"]))
      )
    );

    const response = await this._requestHandler.environment.request(
      finalRequest
    );

    return response;
  }

  public getClientScripts() {
    return this._requestHandler.getClientScripts(this);
  }

  public async post(
    events: TrackedEventBatch,
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
   *
   * Called by {@link TrackerVariableStorage} after successful set operations, to give the tracker a chance to update its state.
   * (Session and device data)
   *
   * @internal
   */
  public async _maybeUpdate(key: VariableKey, current: Variable | undefined) {
    if (key.key === SCOPE_DATA_KEY) {
      if (key.scope === VariableScope.Session) {
        // TODO: Reset session if purged.
        current && (this._session = current);
      } else if (
        key.scope === VariableScope.Device &&
        this._consent.level > DataClassification.None
      ) {
        this._device = current;
      }
    }
  }

  /**
   * Used by the {@link TrackerVariableStorage} to maintain deviec data stored in the device and only briefly cached on the server.
   * @internal
   */
  public _getClientDeviceVariables() {
    if (!this._clientDeviceCache) {
      const deviceCache = (this._clientDeviceCache = {} as DeviceVariableCache);

      dataPurposes.map(([purpose, flag]) => {
        // Device variables are stored with a cookie for each purpose.

        forEach(
          this.httpClientDecrypt(
            this.cookies[this._requestHandler._cookieNames.device[purpose]]
              ?.value
          ) as ClientDeviceDataBlob,
          (value) => {
            update((deviceCache!.variables ??= {}), purpose, (current) => {
              current ??= {
                scope: VariableScope.Device,
                key: value[0],
                classification: value[1],
                version: value[2],
                value: value[3],
              };
              current.purposes = (current.purposes ?? 0) | flag;
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
   * The deviceId ans deviceSesssionId parameters are only used if no session already exists.
   * After that they will stick. This means if a device starts a new server session, its device session will remain.
   * Simlarily if an old frozen tab suddenly wakes up it will get the new device session.
   * (so yes, they can hypothetically be split across the same tab even though that goes against the definition).
   *
   * @internal */
  public async _initialize(deviceId?: string, deviceSessionId?: string) {
    if (this._initialized === (this._initialized = true)) {
      return false;
    }
    this._requestId = await this.env.nextId("request");

    const timestamp = now();
    const consentData = (
      this.cookies["consent"]?.value ??
      `${dataClassification.none}:${dataPurposes.necessary}`
    ).split(":");

    this._consent = {
      level:
        dataClassification.parse(consentData[0]) ?? DataClassification.None,
      purposes:
        dataPurposes.parse(consentData[1].split(",")) ?? DataPurposes.Necessary,
    };
    await this._ensureSession(timestamp, deviceId, deviceSessionId);
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
      await this.updateConsent(DataClassification.None, DataPurposes.Necessary);
    }
    await this._ensureSession(
      referenceTimestamp ?? now(),
      deviceId,
      deviceSessionId,
      session,
      device
    );
  }

  private async _ensureSession(
    timestamp: number,
    deviceId?: string,
    deviceSessionId?: string,
    resetSession?: boolean,
    resetDevice?: boolean
  ) {
    const previousDeviceSessionId = this.deviceSessionId;

    if ((resetSession || resetDevice) && this._sessionReferenceId) {
      // Purge old data. No point in storing this since it will no longer be used.
      await this.env.storage.purge([
        {
          keys: ["*"],
          scopes: filter(
            [
              resetSession && VariableScope.Session,
              resetDevice && VariableScope.Device,
            ],
            isNumber
          ),
        },
      ]);
    }

    if (this._consent.level > DataClassification.None) {
      // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
      // This means clients must make sure the initial request to endpoint completes before more or send (or at least do a fair effort).
      this._sessionReferenceId =
        (resetSession
          ? undefined
          : this.httpClientDecrypt(this.cookies["session"]?.value)?.id) ??
        (await this.env.nextId("session"));

      this.cookies["session"] = {
        httpOnly: true,
        sameSitePolicy: "None",
        essential: true,
        value: this.httpClientEncrypt({ id: this._sessionReferenceId }),
      };
    } else {
      this._sessionReferenceId =
        await this._requestHandler._sessionReferenceMapper.mapSessionId(this);
    }

    this._session =
      // We bypass the TrackerVariableStorage here and uses the environment
      // becaues we use a different target ID than the unique session ID when doing cookie-less tracking.
      (
        await this.env.storage.get([
          {
            scope: VariableScope.Session,
            key: SCOPE_DATA_KEY,
            targetId: this._sessionReferenceId,
            initializer: async () => {
              let cachedDeviceData: DeviceData | undefined;
              if (this.consent.level > DataClassification.None) {
                cachedDeviceData = resetDevice
                  ? undefined
                  : (this._getClientDeviceVariables()?.[SCOPE_DATA_KEY]
                      ?.value as DeviceData);
              }

              return {
                classification: DataClassification.None,
                purpose: DataPurposes.Necessary,
                value: createInitialScopeData<InternalSessionData>(
                  await this.env.nextId(),
                  timestamp,
                  {
                    deviceId:
                      this._consent.level > DataClassification.None
                        ? deviceId ??
                          (resetDevice ? undefined : cachedDeviceData?.id) ??
                          (await this.env.nextId("device"))
                        : undefined,
                    deviceSessionId:
                      deviceSessionId ??
                      (await this.env.nextId("device-session")),
                    previousSession: cachedDeviceData?.lastSeen,
                    hasUserAgent: false,
                  }
                ),
              };
            },
          },
        ])
      )[0]!;

    if (this._session.value!.deviceId) {
      const device = (
        await this.get([
          {
            scope: VariableScope.Device,
            key: SCOPE_DATA_KEY,
            purpose: DataPurposes.Necessary,
            initializer: async () => ({
              classification: this.consent.level,
              value: createInitialScopeData<DeviceData>(
                this._session.value?.deviceId!,
                timestamp,
                {
                  sessions: 1,
                }
              ),
            }),
          },
        ])
      )[0];

      if (!device.initialized && this.session.isNew) {
        await this.set([
          {
            ...device,
            patch: (current) =>
              current?.value
                ? {
                    value: {
                      ...current.value,
                      sessions: current.value.sessions + 1,
                    } as DeviceData,
                  }
                : undefined,
          },
        ]);
      }

      if (previousDeviceSessionId && isDefined(this.deviceId)) {
        this._expiredDeviceSessionId = previousDeviceSessionId;
      }
    }
  }

  /**
   *  Must be called last by the request handler just before a response is sent.
   *  The tracker must not be used afterwards.
   *  @internal
   * */
  public async _persist() {
    this.cookies[this._requestHandler._cookieNames.consent] = {
      httpOnly: true,
      maxAge: Number.MAX_SAFE_INTEGER,
      essential: true,
      sameSitePolicy: "None",
      value: this.consent.purposes + "@" + this.consent.level,
    };

    const splits: Record<string, ClientDeviceDataBlob> = {};

    if (this._clientDeviceCache?.touched) {
      // We have updated device data and need to refresh to get whatever other processes may have written (if any).s

      const deviceValues = (
        await this.query(
          [
            {
              scopes: [VariableScope.Device],
              keys: [":*"],
            },
          ],
          {
            top: 1000,
            ifNoneMatch: map(
              this._clientDeviceCache?.variables,
              ([, variable]) => variable
            ),
          }
        )
      ).results;

      forEach(deviceValues, (variable) => {
        dataPurposes.map(
          ([purpose]) =>
            (splits[purpose] ??= []).push([
              variable.key,
              variable.classification,
              variable.version,
              variable.value,
            ]),
          variable.purposes
        );
      });
    }

    dataPurposes.map(([purpose, flag]) => {
      const remove =
        this.consent.level === DataClassification.None || !splits[purpose];
      const cookieName = this._requestHandler._cookieNames.device[purpose];

      if (remove) {
        if (this.cookies[cookieName]) {
          this.cookies[cookieName].value = undefined;
        }
      } else if (splits[purpose]) {
        if (!this._clientDeviceCache?.touched) {
          // Device data has not been touched. Don't send the cookies.
          delete this.cookies[cookieName];
        } else {
          this.cookies[cookieName] = {
            httpOnly: true,
            maxAge: Number.MAX_SAFE_INTEGER,
            sameSitePolicy: "None",
            essential: flag === DataPurposes.Necessary,
            value: this.httpClientEncrypt(splits[purpose]),
          };
        }
      }
    });
  }

  // #region Storage
  private _getStorageContext(): VariableStorageContext {
    return { tracker: this };
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

  get<K extends (VariableGetter<any> | null | undefined)[]>(
    keys: K & (VariableGetter<any> | null | undefined)[]
  ): MaybePromise<VariableGetResults<K>> {
    return this.env.storage.get(
      keys as VariableGetter<any>[],
      this._getStorageContext()
    ) as VariableGetResults<K>; // This conversion is okay because of the TrackerVariableStorage
  }
  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader>> {
    return this.env.storage.head(filters, options, this._getStorageContext());
  }
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<Variable<any>>> {
    return this.env.storage.query(filters, options, this._getStorageContext());
  }

  async set<V extends (VariableSetter<any> | null | undefined)[]>(
    variables: V & (VariableSetter<any> | null | undefined)[]
  ): Promise<VariableSetResults<V>> {
    const results = await this.env.storage.set(
      variables,
      this._getStorageContext()
    );

    for (const result of results) {
      if (isSuccessResult(result)) {
        if (result.source.key === SCOPE_DATA_KEY) {
          result.source.scope === VariableScope.Session &&
            (this._session = result.current!);
          result.source.scope === VariableScope.Device &&
            (this._device = result.current);
        }
      }
    }

    if (!this._session) {
      // Being without session data violates an invariant, so if someone deleted the data, we create a new session. Ha!
      await this._ensureSession(
        now(),
        this.deviceId,
        this.deviceSessionId,
        true,
        false
      );
    }

    return results;
  }
  purge(alsoUserData = false): MaybePromise<void> {
    return this.env.storage.purge(
      [
        {
          scopes: [VariableScope.Device, VariableScope.Session].concat(
            alsoUserData ? [VariableScope.User] : []
          ),
          keys: ["*"],
        },
      ],
      this._getStorageContext()
    );
  }

  // #endregion
}

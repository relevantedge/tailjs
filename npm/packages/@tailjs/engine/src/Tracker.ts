import {
  DataClassification,
  DataClassificationValue,
  DataPurpose,
  DataPurposeFlags,
  DataPurposeValue,
  PostResponse,
  RestrictVariableTargets,
  Session,
  Timestamp,
  TrackedEvent,
  Variable,
  VariableFilter,
  VariableGetResults,
  VariableGetSuccessResult,
  VariableGetter,
  VariableGetters,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableScope,
  VariableSetters,
  VariableSetResult,
  VariableSetResults,
  VariableSetter,
  dataClassification,
  dataPurposes,
  isSuccessResult,
  variableScope,
  ArrayOrSingle,
  VariableGetResult,
  getSuccessResults,
  VariableResultPromise,
  toVariableResultPromise,
  VariableSuccessResults,
  extractKey,
  VariableClassification,
} from "@tailjs/types";
import {
  MaybeArray,
  MaybePromise,
  Nullish,
  PartialRecord,
  PickPartial,
  filter,
  forEach,
  isArray,
  isDefined,
  isNumber,
  map,
  now,
  update,
} from "@tailjs/util";
import { Transport, createTransport } from "@tailjs/util/transport";
import { ReadOnlyRecord, params, unparam } from "./lib";
import {
  Cookie,
  HttpRequest,
  HttpResponse,
  RequestHandler,
  RequestHandlerConfiguration,
  TrackedEventBatch,
  TrackerEnvironment,
  VariableStorageContext,
} from "./shared";

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
  passive?: boolean;
};

const SCOPE_DATA_KEY = "_data";

export interface ScopeData {
  id: string;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  views: number;
  isNew?: boolean;
}

export type TrackerVariableGetter<T = any> = RestrictVariableTargets<
  VariableGetter<T, false>
>;

export type TrackerVariableSetter<T = any> = RestrictVariableTargets<
  VariableSetter<T, false>
>;

const createInitialScopeData = <T extends ScopeData>(
  id: string,
  timestamp: Timestamp,
  additionalData: Omit<T, keyof ScopeData>
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

export type InternalSessionData = SessionData & {
  hasUserAgent?: boolean;
};

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
  public readonly clientIp: string | Nullish;

  public readonly cookies: Record<string, Cookie>;
  public readonly disabled: boolean;
  public readonly env: TrackerEnvironment;
  public readonly headers: ReadOnlyRecord<string, string>;
  public readonly queryString: ReadOnlyRecord<string, string[]>;
  public readonly referrer: string | null;
  public readonly requestItems: Map<any, any>;
  /** Transient variables that can be used by extensions whilst processing a request. */
  public readonly transient: Record<string, any>;

  /** Variables that have been added or updated during the request (cf. {@link TrackerStorageContext.push}). */
  private readonly _changedVariables: PickPartial<
    VariableGetSuccessResult,
    keyof VariableClassification
  >[] = [];

  private readonly _clientCipher: Transport;

  public readonly clientKey: string;

  public host: string;
  public path: string;
  public url: string;

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

    this.clientIp = clientIp;

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
  public _session: Variable<InternalSessionData> | undefined;

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
    purposes: DataPurposeFlags;
  } = {
    level: DataClassification.Anonymous,
    purposes: DataPurposeFlags.Necessary,
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

  public get session(): Readonly<SessionData> | undefined {
    return this._session?.value;
  }

  public get sessionId(): string | undefined {
    return this.session?.id;
  }

  public get deviceSessionId() {
    return this._session?.value?.deviceSessionId;
  }

  public get device(): Readonly<DeviceData> | undefined {
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
  public async _applyExtensions(options: TrackerPostOptions) {
    await this._initialize(options.deviceSessionId, options.deviceId);
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

    const result = await this._requestHandler.post(this, events, options);
    if (this._changedVariables.length) {
      ((result.variables ??= {}).get ??= []).push(
        ...(this._changedVariables as any)
      );
    }
    return result;
  }

  // #region DeviceData

  /**
   *
   * Called by {@link TrackerVariableStorage} after successful set operations, to give the tracker a chance to update its state.
   * (Session and device data)
   *
   * @internal
   */
  public async _maybeUpdate(
    key: VariableKey<boolean>,
    current: Variable | undefined
  ) {
    const scope = variableScope.parse(key.scope);
    if (key.key === SCOPE_DATA_KEY) {
      if (
        scope === VariableScope.Session &&
        key.targetId === this._sessionReferenceId
      ) {
        current && (this._session = current);
      } else if (
        scope === VariableScope.Device &&
        this._consent.level > DataClassification.Anonymous
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

      dataPurposes.pure.map(([purpose, flag]) => {
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
                purposes: 0,
              };
              current.purposes |= flag;
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
  public async _initialize(
    deviceId?: string,
    deviceSessionId?: string,
    passive?: boolean
  ) {
    if (this._initialized === (this._initialized = true)) {
      return false;
    }
    this._requestId = await this.env.nextId("request");

    const timestamp = now();
    const consentData = (
      this.cookies["consent"]?.value ??
      `${DataClassification.Anonymous}:${DataPurposeFlags.Necessary}`
    ).split(":");

    this._consent = {
      level:
        dataClassification.tryParse(consentData[0]) ??
        DataClassification.Anonymous,
      purposes:
        dataPurposes.tryParse(consentData[1].split(",")) ??
        DataPurposeFlags.Necessary,
    };

    await this._ensureSession(timestamp, deviceId, deviceSessionId, {
      passive,
    });
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
      await this.updateConsent(
        DataClassification.Anonymous,
        DataPurposeFlags.Necessary
      );
    }
    if (this._session) {
      await this._ensureSession(
        referenceTimestamp ?? now(),
        deviceId,
        deviceSessionId,
        { resetSession: session, resetDevice: device }
      );
    }
  }

  public async updateConsent(
    level?: DataClassificationValue,
    purposes?: DataPurposeValue
  ): Promise<void> {
    if (!this._session) return;

    level = dataClassification.parse(level) ?? this.consent.level;
    purposes = dataPurposes.parse(purposes) ?? this.consent.purposes;

    if (level < this.consent.level || ~purposes & this.consent.purposes) {
      // If the user downgraded the level of consent or removed purposes we need to delete existing data that does not match.

      await this.env.storage.purge([
        {
          keys: ["*"],
          scopes: [
            VariableScope.Session,
            VariableScope.Device,
            // Actually, do we want to delete data from the user?
            // User data is per definition at least direct personal data.
            // It seems a bit extreme to delete the user, "right to be forgotten" is not fully implemeneted.
            // VariableScope.User
          ],
          purposes: ~purposes,
          classification: {
            min: level + 1,
          },
        },
      ]);
    }

    if (
      (level === DataClassification.Anonymous) !==
      (this.consent.level === DataClassification.Anonymous)
    ) {
      if (level === DataClassification.Anonymous) {
        this._sessionReferenceId =
          await this._requestHandler._sessionReferenceMapper.mapSessionId(this);
      } else {
        this._sessionReferenceId = this._session.targetId!;
      }

      // Change reference ID from cookie to cookie-less or vice versa.
      await this.env.storage.set([
        { ...this._session, value: undefined },
        { ...this._session, targetId: this._sessionReferenceId },
      ]);

      //if( )
    }

    this._consent = { level, purposes };
  }

  private async _ensureSession(
    timestamp: number,
    deviceId?: string,
    deviceSessionId?: string,
    { passive = false, resetSession = false, resetDevice = false } = {}
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

    let sessionId: string | undefined;
    if (this._consent.level > DataClassification.Anonymous) {
      // CAVEAT: There is a minimal chance that multiple sessions may be generated for the same device if requests are made concurrently.
      // This means clients must make sure the initial request to endpoint completes before more are sent (or at least do a fair effort).
      this._sessionReferenceId = sessionId =
        (resetSession
          ? undefined
          : this.httpClientDecrypt(
              this.cookies[this._requestHandler._cookieNames.session]?.value
            )?.id) ?? (await this.env.nextId("session"));

      this.cookies[this._requestHandler._cookieNames.session] = {
        httpOnly: true,
        sameSitePolicy: "None",
        essential: true,
        value: this.httpClientEncrypt({ id: this._sessionReferenceId }),
      };
    } else {
      this._sessionReferenceId =
        await this._requestHandler._sessionReferenceMapper.mapSessionId(this);
    }

    const x = this.get({
      key: "test",
      scope: "device",
      init: { value: 32 },
    }).value;

    this._session =
      // We bypass the TrackerVariableStorage here and uses the environment
      // becaues we use a different target ID than the unique session ID when doing cookie-less tracking.
      await this.env.storage.get([
        {
          scope: VariableScope.Session,
          key: SCOPE_DATA_KEY,
          targetId: this._sessionReferenceId,
          init: async () => {
            if (passive) return undefined;

            let cachedDeviceData: DeviceData | undefined;
            if (this.consent.level > DataClassification.Anonymous) {
              cachedDeviceData = resetDevice
                ? undefined
                : (this._getClientDeviceVariables()?.[SCOPE_DATA_KEY]
                    ?.value as DeviceData);
            }

            return {
              classification: DataClassification.Anonymous,
              purpose: DataPurposeFlags.Necessary,
              value: createInitialScopeData<InternalSessionData>(
                (sessionId ??= await this.env.nextId()),
                timestamp,
                {
                  deviceId:
                    this._consent.level > DataClassification.Anonymous
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
      ])[0];

    if (this._session?.value!.deviceId) {
      const device = await this.get({
        scope: VariableScope.Device,
        key: SCOPE_DATA_KEY,
        purposes: DataPurposeFlags.Necessary,
        init: async () =>
          passive
            ? undefined
            : {
                classification: this.consent.level,
                value: createInitialScopeData<DeviceData>(
                  this._session?.value?.deviceId!,
                  timestamp,
                  {
                    sessions: 1,
                  }
                ),
              },
      })[0];

      if (
        device &&
        device.status !== VariableResultStatus.Created &&
        this.session?.isNew
      ) {
        await this.set({
          ...device,
        });
      }

      if (previousDeviceSessionId && isDefined(this.deviceId)) {
        this._expiredDeviceSessionId = previousDeviceSessionId;
      }

      this._device = device;
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

    const splits: PartialRecord<DataPurpose, ClientDeviceDataBlob> = {};

    if (this._clientDeviceCache?.touched) {
      // We have updated device data and need to refresh to get whatever other processes may have written (if any).

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
        dataPurposes.map(variable.purposes, ([, purpose]) =>
          (splits[purpose] ??= []).push([
            variable.key,
            variable.classification,
            variable.version,
            variable.value,
          ])
        );
      });
    }

    if (
      this.consent.level === DataClassification.Anonymous &&
      this.cookies[this._requestHandler._cookieNames.session]
    ) {
      // Clear session cookie if we have one.
      this.cookies[this._requestHandler._cookieNames.session].value = undefined;
    }

    dataPurposes.pure.map(([purpose, flag]) => {
      const remove =
        this.consent.level === DataClassification.Anonymous || !splits[purpose];
      const cookieName = this._requestHandler._cookieNames.device[flag];

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
            essential: flag === DataPurposeFlags.Necessary,
            value: this.httpClientEncrypt(splits[purpose]),
          };
        }
      }
    });
  }

  // #region Storage
  private _getStorageContext(
    source?: VariableStorageContext
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

  public get<K extends VariableGetters<TrackerVariableGetter>>(
    ...keys: VariableGetters<TrackerVariableGetter, K>
  ): VariableResultPromise<VariableGetResults<K>, true> {
    return toVariableResultPromise(
      () => this.env.storage.get(keys, this._getStorageContext()).all,
      (results) =>
        results.forEach(
          (result) =>
            result?.status === VariableResultStatus.Created &&
            this._changedVariables.push(result)
        )
    ) as any;
  }

  head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    return this.env.storage.head(filters, options, this._getStorageContext());
  }
  query(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined
  ): MaybePromise<VariableQueryResult<Variable<any>>> {
    return this.env.storage.query(filters, options, this._getStorageContext());
  }

  async set<K extends VariableSetters<TrackerVariableSetter>>(
    ...variables: VariableSetters<TrackerVariableSetter, K>
  ): Promise<any> {
    return toVariableResultPromise(
      async () => {
        const results = await this.env.storage.set(
          variables as VariableSetter[],
          this._getStorageContext()
        ).all;

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
        return results;
      },
      (results) =>
        forEach(results, (result) => {
          return (
            result.status !== VariableResultStatus.Unchanged &&
            this._changedVariables.push({
              ...extractKey(result.source, result.current),
              status: result.status,
            })
          );
        })
    );
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

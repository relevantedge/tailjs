import {
  DataClassification,
  PostResponse,
  TrackedEvent,
  Variable,
  VariableFilter,
  VariableHeader,
  VariableKey,
  VariableGetter,
  VariablePatch,
  VariableQueryResult,
  VariableScope,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  isSuccessResult,
  Timestamp,
  Scoped,
  DataPurpose,
  VariableClassification,
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
  VariableContext,
  VariableGetResults,
  VariableSetError,
  copy,
  parseKey,
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

type PendingSetter = {
  setter: VariableSetter;
  resolve: (value: VariableSetResult) => void;
};

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

  /**
   * Variables with classifications higher than this will not be stored.
   * If purposes are not `undefined`, variables that do not contain one of these purposes will not be stored.
   */
  consent: VariableClassification;

  /** Variable version for optimistic concurrency. */
  version?: string;
}

export interface DeviceData extends ScopeData {}

export interface SessionData extends ScopeData {
  deviceSessionId?: string;
  device?: DeviceData;
  userId?: string;
  isNew: boolean;
  previouslySeen?: Timestamp;
}

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

  private _variables: Map<string, Variable>[];

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
   */
  private _sessionReference: string;
  private _session: SessionData;
  private _device?: DeviceData;

  private _consent: {
    level: DataClassification;
    purposes?: Set<DataPurpose>;
  } = { level: DataClassification.None };

  public get consent() {
    return this._consent;
  }

  public get requestId() {
    return `${this._requestId}`;
  }

  public get session(): SessionData {
    return this._session!;
  }

  public get sessionId(): string {
    return this._session!.id;
  }

  public get deviceSessionId() {
    return this._session.deviceSessionId;
  }

  public get device() {
    return this._device;
  }

  public get deviceId() {
    return this._device?.id;
  }

  /** @Internal */
  public _consentLevel: DataClassification = DataClassification.None;

  // #region  Variables
  private _pendingSetters: PendingSetter[] = [];

  private _mapVariable(variable: Variable | undefined) {
    return copy(
      variable,
      variable && {
        version:
          variable.scope === VariableScope.Session
            ? this._session.version
            : variable.scope === VariableScope.Device
            ? this._device?.version
            : undefined,
      }
    );
  }

  public async get<K extends (VariableGetter<any, true> | undefined)[]>(
    ...getters: K
  ): Promise<VariableGetResults<K>> {
    const targetedGetters = getters.map((getter) =>
      this._mapTrackerContext(getter)
    );
    const results: (Variable | undefined)[] = Array(getters.length);

    const external = map(
      // Find getters that must got to the actual story, if any.
      // At the same time populate the results with the variables we know from the tracker
      targetedGetters,
      (getter, sourceIndex) =>
        getter &&
        (getter.scope === VariableScope.Global ||
        getter.scope === VariableScope.Entity ||
        parseKey(getter.key)?.prefix
          ? { sourceIndex, getter }
          : ((results[sourceIndex] = this._mapVariable(
              this._variables[getter.scope]?.get(getter.key)
            )),
            undefined))
    );

    if (external.length) {
      (
        await this.env.storage.get(
          ...external.map((item) => item.getter as VariableGetter<any, false>)
        )
      ).forEach((result, i) => (results[i] = result));
    }

    return results as any;
  }

  private _mapTrackerContext<
    T extends (VariableKey & VariableContext) | undefined | null
  >(variable: T): T | undefined {
    if (!variable) return undefined;
    if (variable.scope === VariableScope.Session) {
      variable.targetId = this._session.id;
    } else if (variable.scope === VariableScope.Device) {
      variable.targetId = this._device?.id;
    } else if (variable.scope === VariableScope.User) {
      variable.targetId = this._session.userId;
    }

    if (variable.scope !== VariableScope.Global && variable.targetId) {
      return undefined;
    }

    variable.context = { tracker: this };
    return variable;
  }

  private _addPendingSetter(
    setter: TrackerVariableSetter
  ): TrackerVariableSetResult {
    const mapped = this._mapTrackerContext(setter);
    // Variable is for a scope that is not included in the consent.

    if (!mapped) {
      return () =>
        Promise.resolve<VariableSetResult>({
          status: VariableSetStatus.Denied,
          source: setter,
        });
    }

    let resolve: (value: VariableSetResult) => void = null!;
    let resolved = false;
    let result = new Promise<VariableSetResult>(
      (innerResolve) => ((resolved = true), (resolve = innerResolve))
    );

    this._pendingSetters.push({
      setter,
      resolve,
    });

    return async () => {
      if (!resolved) {
        await this._commitPendingSetters();
      }
      let resultValue = await result;
      if (!isSuccessResult(await result)) {
        throw new VariableSetError(resultValue);
      }
      return resultValue;
    };
  }

  private async _commitPendingSetters() {
    if (!this._pendingSetters.length) {
      return;
    }
    const capturedPending = this._pendingSetters;
    this._pendingSetters = [];
    const results = await this.env.storage.set(
      ...capturedPending.map((pending) => pending.setter)
    );
    for (let i = 0; i < capturedPending.length; i++) {
      capturedPending[i].resolve(
        results[i] ?? {
          status: VariableSetStatus.Error,
          error: new Error(
            "The provider did not return a result for the setter."
          ),
        }
      );
    }
  }

  public set(...setters: TrackerVariableSetter[]): TrackerVariableSetResult[];
  public set(
    ...setters: (TrackerVariableSetter | undefined)[]
  ): (TrackerVariableSetResult | undefined)[];
  public set(
    ...setters: (TrackerVariableSetter | undefined)[]
  ): (TrackerVariableSetResult | undefined)[] {
    return setters.map((setter) => setter && this._addPendingSetter(setter));
  }

  public async commit() {}

  public async query(
    ...filters: VariableFilter[]
  ): Promise<VariableQueryResult> {
    return { count: 0, results: [] };
  }

  public async purge(scopes: VariableScope[] | null = null) {
    scopes ??= [
      VariableScope.Session,
      VariableScope.DeviceSession,
      VariableScope.Device,
    ];

    const filters: (VariableFilter | boolean)[] = [
      scopes.includes(VariableScope.Session) && {
        targetIds: [this.sessionId!],
        scopes: [VariableScope.Session],
      },
      scopes.includes(VariableScope.DeviceSession) && {
        targetIds: [this.deviceSessionId!],
        scopes: [VariableScope.DeviceSession],
      },
      scopes.includes(VariableScope.Device) && {
        targetIds: [this.deviceId!],
        scopes: [VariableScope.Device],
      },
    ].filter((item) => item !== false && item.targetIds[0]);
    if (filters.length) {
      await this.env.storage.purge(filters as any);
    }
  }

  // #endregion

  // public async consent(consentLevel: DataClassification): Promise<void> {
  //   if (consentLevel === this._consentLevel) return;
  //   this._consentLevel = consentLevel;
  //   if (consentLevel === DataClassification.None) {
  //     this._requestHandler._sessionStore.purge(this);
  //   } else {
  //     // Copy current values from cookie-less store.
  //     await this._requestHandler._sessionStore.set(
  //       this,
  //       ...(await this._requestHandler._globalStorage.get(
  //         this,
  //         { scope: "session" },
  //         { scope: "device-session" },
  //         { scope: "device" },
  //         { scope: "user" }
  //       ))
  //     );
  //     await this._requestHandler._sessionStore.set(this, {
  //       scope: "session",
  //       key: "consent",
  //       value: consentLevel,
  //     });
  //   }
  // }

  public userId?: string;

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

  // private async _getStoreValue(
  //   store: TrackerStorage,
  //   scope: TrackerScope,
  //   key: string
  // ) {
  //   return (await store.get(this, { scope, key }))?.[0]?.value;
  // }

  /** @internal */
  public async _initialize(deviceSessionId?: string, deviceId?: string) {
    if (this._initialized === (this._initialized = true)) {
      return false;
    }
    this._requestId = await this.env.nextId("request");
    this._consentLevel = DataClassification.None;

    //if( this.cookies[this._requestHandler._cookieNames.essentialSession]?.value);

    await this.env.storage.get({
      scope: VariableScope.Session,
      key: SCOPE_DATA_KEY,
      targetId: this._sessionReference,
    });
    // (await this._getStoreValue(
    //   this._requestHandler._sessionStore,
    //   "session",
    //   "consent"
    // )) ?? "none";

    // if (this.consentLevel === "none") {
    //   this._sessionId = await this._getStoreValue(
    //     this._requestHandler._globalStorage,
    //     "global",
    //     this.clientKey
    //   );

    //   if (!this._sessionId) {
    //     this._sessionId = await this.env.nextId();
    //     await this._requestHandler._globalStorage.set(this, {
    //       scope: "global",
    //       key: this.clientKey,
    //       value: this._sessionId,
    //       ttl: 30 * 60 * 1000,
    //     });
    //   }
    // } else {
    //   this._sessionId = await this._getStoreValue(
    //     this._requestHandler._sessionStore,
    //     "session",
    //     "id"
    //   );
    //   if (!this._sessionId) {
    //     this._sessionId = await this.env.nextId();
    //     await this._requestHandler._sessionStore.set(this, {
    //       key: "id",
    //       scope: "session",
    //       value: this._sessionId,
    //       consentLevel: "essential",
    //     });
    //   }
    // }

    // this._deviceSessionId = deviceSessionId;
    // this._deviceId = deviceId ?? (await this.get("device", "id"));
    // if (!this._deviceId && this._consentLevel !== "none") {
    //   this._deviceId = await this.env.nextId();
    //   await this._requestHandler._sessionStore.set(this, {
    //     key: "id",
    //     scope: "device",
    //     value: this._sessionId,
    //   });
    // }
  }

  public async persistScopeData() {}

  private async _initializeScopeData() {
    //this._sessionReference = this._cons
  }
}

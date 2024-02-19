import {
  DataClassification,
  PostResponse,
  TrackedEvent,
  TrackerVariableFilter,
  TrackerScope,
  TrackerVariable,
  TRACKER_SCOPES,
} from "@tailjs/types";
import { isString, set } from "@tailjs/util";
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
  TrackerStorage,
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
};
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

  private _deviceId?: string;
  private _deviceSessionId?: string;
  private _sessionId?: string;

  /** @Internal */
  public _consentLevel: DataClassification = DataClassification.None;

  // #region  Variables

  private async _ensureVariables() {}

  public async get(
    scope: TrackerScope,
    key: string
  ): Promise<TrackerVariable | undefined> {
    return undefined;
  }

  public async query(
    ...filters: TrackerVariableFilter[]
  ): Promise<TrackerVariable[]> {
    return [];
  }

  public async purge(scopes: TrackerScope[] | null = null) {
    scopes ??= [
      TrackerScope.Session,
      TrackerScope.DeviceSession,
      TrackerScope.Device,
    ];
    await this._requestHandler._globalStorage.purge(
      this,
      ...scopes.map((scope) => ({ scope }))
    );
    await this._requestHandler._sessionStore.purge(
      this,
      ...scopes.map((scope) => ({ scope }))
    );
  }

  // #endregion

  public get consentLevel() {
    return this._consentLevel;
  }

  public get requestId() {
    return `${this._requestId}`;
  }

  public get sessionId() {
    return this._sessionId;
  }

  public get deviceSessionId() {
    return this._deviceSessionId;
  }

  public get deviceId() {
    return this._deviceId;
  }

  public async consent(consentLevel: DataClassification): Promise<void> {
    if (consentLevel === this._consentLevel) return;
    this._consentLevel = consentLevel;
    if (consentLevel === "none") {
      this._requestHandler._sessionStore.purge(this);
    } else {
      // Copy current values from cookie-less store.
      await this._requestHandler._sessionStore.set(
        this,
        ...(await this._requestHandler._globalStorage.get(
          this,
          { scope: "session" },
          { scope: "device-session" },
          { scope: "device" },
          { scope: "user" }
        ))
      );
      await this._requestHandler._sessionStore.set(this, {
        scope: "session",
        key: "consent",
        value: consentLevel,
      });
    }
  }

  public userid?: string;

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

  private async _getStoreValue(
    store: TrackerStorage,
    scope: TrackerScope,
    key: string
  ) {
    return (await store.get(this, { scope, key }))?.[0]?.value;
  }

  /** @internal */
  public async _initialize(deviceSessionId?: string, deviceId?: string) {
    if (this._initialized === (this._initialized = true)) {
      return false;
    }
    this._requestId = await this.env.nextId("request");
    this._consentLevel =
      (await this._getStoreValue(
        this._requestHandler._sessionStore,
        "session",
        "consent"
      )) ?? "none";

    if (this.consentLevel === "none") {
      this._sessionId = await this._getStoreValue(
        this._requestHandler._globalStorage,
        "global",
        this.clientKey
      );

      if (!this._sessionId) {
        this._sessionId = await this.env.nextId();
        await this._requestHandler._globalStorage.set(this, {
          scope: "global",
          key: this.clientKey,
          value: this._sessionId,
          ttl: 30 * 60 * 1000,
        });
      }
    } else {
      this._sessionId = await this._getStoreValue(
        this._requestHandler._sessionStore,
        "session",
        "id"
      );
      if (!this._sessionId) {
        this._sessionId = await this.env.nextId();
        await this._requestHandler._sessionStore.set(this, {
          key: "id",
          scope: "session",
          value: this._sessionId,
          consentLevel: "essential",
        });
      }
    }

    this._deviceSessionId = deviceSessionId;
    this._deviceId = deviceId ?? (await this.get("device", "id"));
    if (!this._deviceId && this._consentLevel !== "none") {
      this._deviceId = await this.env.nextId();
      await this._requestHandler._sessionStore.set(this, {
        key: "id",
        scope: "device",
        value: this._sessionId,
      });
    }

    return true;
  }
}

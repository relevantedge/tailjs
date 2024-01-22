import type { TrackedEvent } from "@tailjs/types";
import { Encodable, Transport, createTransport } from "@tailjs/util/transport";
import { ReadOnlyRecord, map, params, unparam } from "./lib";
import {
  ClientState,
  Cookie,
  HttpRequest,
  HttpResponse,
  RequestHandler,
  RequestHandlerConfiguration,
  TrackerEnvironment,
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
  affinity?: any;
};
export class Tracker
  implements Pick<ClientState, "username" | "consent" | "purgeCookies">
{
  /**
   * Used for queueing up events so they do not get posted before all extensions have been applied to the request.
   *
   * Without this queue this might happen if one of the first extensions posted an event in the apply method.
   * It would then pass through the post pipeline in a nested call and see `_extensionsApplied` to be `true` even though they were not, hence miss their logic.
   */
  private _eventQueue: [events: TrackedEvent[], options: TrackerPostOptions][] =
    [];
  private _extensionState = ExtensionState.Pending;
  private _initialized: boolean;
  private _requestId: string | undefined;

  /** @internal  */
  public readonly _clientEvents: TrackedEvent[] = [];
  /** @internal */
  public readonly _clientState: ClientState = null!;
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
  public readonly clientKey: string | null;

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
    this._clientState = new ClientState(this);
    let clientKey = headers?.["user-agent"] ?? "";
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

  public get consent() {
    return this._clientState.consent;
  }

  public set consent(value: ClientState["consent"]) {
    this._clientState.consent = value;
  }

  public get device() {
    return this._clientState!.device;
  }

  public get deviceSession() {
    return this._clientState!.deviceSession;
  }

  public get requestId() {
    return `${this._requestId}: ${this.url}`;
  }

  public get vars() {
    return this._clientState!.vars;
  }

  public get session() {
    return this._clientState!.session;
  }

  public get username() {
    return this._clientState.username;
  }

  public set username(value: string | undefined) {
    this._clientState.username = value;
  }

  public httpClientEncrypt(value: any): string {
    return this._clientCipher[0](value);
  }

  public httpClientDecrypt(encoded: string | null | undefined): any {
    return this._clientCipher[1](encoded);
  }

  /** @internal */
  public async _applyExtensions(
    affinity?: Encodable | null,
    variables?: Record<string, any>
  ) {
    await this._initialize(affinity);
    if (this._extensionState === ExtensionState.Pending) {
      this._extensionState = ExtensionState.Applying;
      try {
        await this._requestHandler.applyExtensions(this, variables);
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

  /** @internal */
  public _persist() {
    this._clientState.persist();
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

  public async post(events: TrackedEvent[], options: TrackerPostOptions = {}) {
    if (this._extensionState === ExtensionState.Applying) {
      this._eventQueue.push([events, options]);
      return;
    }
    return await this._requestHandler.post(this, events, options);
  }

  public purgeCookies(includeDevice = false) {
    this._clientState.purgeCookies(includeDevice);
  }

  /** @internal */
  public async _initialize(affinity?: Encodable | null) {
    if (this._initialized === (this._initialized = true)) {
      return false;
    }
    this._requestId = await this.env.nextId("request");

    await this._clientState.initialize(affinity);
    return true;
  }
}

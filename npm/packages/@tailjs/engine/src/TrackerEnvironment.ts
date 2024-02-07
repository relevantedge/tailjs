import {
  Encodable,
  hash,
  httpDecode,
  httpEncode,
} from "@tailjs/util/transport";
import ShortUniqueId from "short-unique-id";

import { formatError, params } from "./lib";
import {
  type ChangeHandler,
  type Cookie,
  type CryptoProvider,
  type EngineHost,
  type HttpRequest,
  type HttpResponse,
  type LogMessage,
  type ModelMetadata,
} from "./shared";
import { Nulls } from "@tailjs/util";

const SAME_SITE = { strict: "Strict", lax: "Lax", none: "None" };

const uuid = new ShortUniqueId();

export class TrackerEnvironment {
  private readonly _crypto: CryptoProvider;
  private readonly _host: EngineHost;
  public readonly metadata: ModelMetadata;
  public readonly tags?: string[];
  public readonly hasManagedConsents: boolean;
  public readonly cookieVersion: string;

  constructor(
    host: EngineHost,
    crypto: CryptoProvider,
    metadata: ModelMetadata,
    hasManagedConsents: boolean,
    tags?: string[],
    cookieVersion = "C"
  ) {
    this._host = host;
    this._crypto = crypto;
    this.metadata = metadata;
    this.tags = tags;
    this.cookieVersion = cookieVersion;
    this.hasManagedConsents = hasManagedConsents;
  }

  public httpEncrypt(value: Encodable) {
    return this._crypto.encrypt(value);
  }

  public httpEncode(value: Encodable) {
    return httpEncode(value);
  }

  public httpDecode<T = any>(encoded: string): T;
  public httpDecode<T = any>(encoded: string | null | undefined): T | null;
  public httpDecode(encoded: string): any {
    return httpDecode(encoded);
  }

  public httpDecrypt<T = any>(encoded: string): T;
  public httpDecrypt<T = any>(encoded: string | null | undefined): T | null;
  public httpDecrypt(encoded: string): any {
    if (encoded == null) return encoded as any;
    return this._crypto.decrypt(encoded);
  }

  public hash<T extends string | null | undefined, B extends boolean>(
    source: T,
    numeric: B,
    secure?: boolean
  ): B extends true ? number : T & Nulls<T>;
  public hash<T extends string | null | undefined>(
    source: T,
    bits?: 32 | 64 | 128,
    secure?: boolean
  ): string & Nulls<T>;
  public hash(value: any, numericOrBits: any, secure = false): any {
    return value == null
      ? (value as any)
      : secure
      ? this._crypto.hash(value, numericOrBits)
      : hash(value, numericOrBits);
  }

  public log(message: LogMessage<string | Record<string, any>>): void;
  public log(
    message: Omit<LogMessage<string | Record<string, any>>, "data">,
    error: any
  ): void;
  public log(
    message: LogMessage<string | Record<string, any>>,
    error?: Error
  ): void {
    if (error) {
      message.data = formatError(error);
      message.level ??= "error";
    }
    this._host.log(message);
  }

  public async nextId(scope?: string) {
    return uuid.rnd();
  }

  readText(
    path: string,
    changeHandler?: ChangeHandler<string>
  ): Promise<string | null> {
    return this._host.readText(path, changeHandler);
  }
  read(
    path: string,
    changeHandler?: ChangeHandler<Uint8Array>
  ): Promise<Uint8Array | null> {
    return this._host.read(path, changeHandler);
  }

  public async request<Binary extends boolean = false>(
    request: HttpRequest<Binary>
  ): Promise<HttpResponse<Binary>> {
    request.method ??= request.body ? "POST" : "GET";
    request.headers ??= {};
    delete request.headers["host"];
    delete request.headers["accept-encoding"];

    const response = await this._host.request({
      url: request.url,
      binary: request.binary,
      method: request.method,
      body: request.body,
      headers: request.headers ?? {},
      x509: request.x509,
    });

    const responseHeaders = Object.fromEntries(
      Object.entries(response.headers).map(([name, value]) => [
        name.toLowerCase(),
        value,
      ])
    );

    const cookies: Record<string, Cookie> = {};

    for (const cookie of response.cookies) {
      const ps = params(cookie);

      if (!ps[0]) continue;
      const [name, value] = ps[0];
      const rest = Object.fromEntries(
        ps.slice(1).map(([k, v]) => [k.toLowerCase(), v])
      );

      cookies[name] = {
        value,
        httpOnly: "httponly" in rest,
        sameSitePolicy: SAME_SITE[rest["samesite"]] ?? "Lax",
        maxAge: rest["max-age"] ? parseInt(rest["max-age"]) : undefined,
      };
    }

    responseHeaders["content-type"] ??= "text/plain";

    return {
      request,
      status: response.status,
      headers: responseHeaders,
      cookies,
      body: response.body,
    };
  }
}

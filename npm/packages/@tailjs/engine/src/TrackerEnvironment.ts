import {
  Encodable,
  hash,
  httpDecode,
  httpEncode,
} from "@tailjs/util/transport";
import ShortUniqueId from "short-unique-id";

import { Nulls, isString } from "@tailjs/util";
import { formatError, params } from "./lib";
import {
  LogLevel,
  type ChangeHandler,
  type Cookie,
  type CryptoProvider,
  type EngineHost,
  type HttpRequest,
  type HttpResponse,
  type LogMessage,
  type ModelMetadata,
  VariableStorage,
  SchemaManager,
} from "./shared";

const SAME_SITE = { strict: "Strict", lax: "Lax", none: "None" };

const uuid = new ShortUniqueId();

const getDefaultLogSourceName = (source: any): string => {
  if (!source) return "";
  if (isString(source)) return source;

  let logName = source.logName?.();
  if (!logName) {
    logName = source?.constructor?.name;
    if (logName === "Object" || logName === "Function") {
      logName = "" + source;
    }

    return logName;
  }

  return source?.logId?.() || source?.constructor.name || "" + source;
};

export class TrackerEnvironment {
  private readonly _crypto: CryptoProvider;
  private readonly _host: EngineHost;
  private readonly _logGroups = new Map<
    any,
    { group: string; name?: string }
  >();

  public readonly schema: SchemaManager;
  public readonly tags?: string[];
  public readonly cookieVersion: string;
  public readonly storage: VariableStorage<false>;

  constructor(
    host: EngineHost,
    crypto: CryptoProvider,
    schema: SchemaManager,
    storage: VariableStorage<false>,
    tags?: string[],
    cookieVersion = "C"
  ) {
    this._host = host;
    this._crypto = crypto;
    this.schema = schema;
    this.tags = tags;
    this.cookieVersion = cookieVersion;
    this.storage = storage;
  }

  /** @internal */
  public _setLogInfo(
    ...sources: { source: any; group: string; name: string }[]
  ) {
    sources.forEach((source) =>
      this._logGroups.set(source, {
        group: source.group,
        name: source.name ?? getDefaultLogSourceName(source),
      })
    );
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

  public log(source: any, message: LogMessage): void;
  public log(
    source: any,
    message: string | null | undefined,
    logLevel?: LogLevel,
    error?: Error
  ): void;
  public log(
    source: any,
    arg: LogMessage | string | null | undefined,
    level?: LogLevel,
    error?: Error
  ): void {
    const message: Partial<LogMessage> | null =
      error instanceof Error
        ? {
            message: arg ? `${arg}: ${formatError(error)}` : formatError(error),
            level: level ?? "error",
          }
        : isString(arg)
        ? {
            message: arg,
            level: level ?? "info",
          }
        : arg
        ? arg
        : null;
    if (!message) {
      return;
    }

    const { group, name } = this._logGroups.get(source) ?? {
      group: "",
      source: getDefaultLogSourceName(source),
    };

    message.group ??= group;
    message.source ??= name;

    this._host.log(message as LogMessage);
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

  // #region LogShortcuts

  public trace(source: any, message: string) {
    this.log(source, message, "trace");
  }

  public debug(source: any, message: string) {
    this.log(source, message, "debug");
  }

  public warn(source: any, message: string, error?: Error): void;
  public warn(
    source: any,
    message: string | null | undefined,
    error: Error
  ): void;
  public warn(source: any, message: string, error?: Error) {
    this.log(source, message, "warn", error);
  }

  public error(source: any, message: string, error?: Error): void;
  public error(source: any, error: Error): void;
  public error(source: any, message: string | Error, error?: Error) {
    this.log(
      source,
      isString(message) ? message : (error = message)?.message,
      "error",
      error
    );
  }
  // #endregion
}

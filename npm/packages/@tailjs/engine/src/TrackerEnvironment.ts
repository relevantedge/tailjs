import { Encodable, hash, httpDecode, httpEncode } from "@tailjs/transport";
import {
  MaybeUndefined,
  Nullish,
  isObject,
  isString,
  parameterListSymbol,
  parseHttpHeader,
} from "@tailjs/util";
import ShortUniqueId from "short-unique-id";
import {
  LogLevel,
  serializeLogMessage,
  VariableStorageCoordinator,
  type ChangeHandler,
  type Cookie,
  type CryptoProvider,
  type EngineHost,
  type HttpRequest,
  type HttpResponse,
  type LogMessage,
} from "./shared";
import { ScopeVariables, Tag } from "@tailjs/types";

const SAME_SITE = { strict: "Strict", lax: "Lax", none: "None" };

const uuid = new ShortUniqueId();

const getDefaultLogSourceName = (source: any): string | undefined => {
  if (!source) return undefined;
  if (!isObject(source)) return "" + source;

  let constructorName =
    source.constructor === Object ? undefined : source.constructor?.name;

  let name = source.logId ?? source.id;
  if (name) {
    return (constructorName ? constructorName + ":" : "") + name;
  }
  return constructorName ?? "" + source;
};

export type KnownTrackerKeys = {
  session: ScopeVariables["session"];
  device: ScopeVariables["device"];
};

export class TrackerEnvironment {
  private readonly _crypto: CryptoProvider;
  private readonly _host: EngineHost;
  private readonly _logGroups = new Map<
    any,
    { group: string; name?: string }
  >();

  public readonly tags?: Tag[];
  public readonly cookieVersion: string;
  public readonly storage: VariableStorageCoordinator<KnownTrackerKeys>;

  constructor(
    host: EngineHost,
    crypto: CryptoProvider,
    storage: VariableStorageCoordinator,
    tags?: Tag[],
    cookieVersion = "C"
  ) {
    this._host = host;
    this._crypto = crypto;
    this.tags = tags;
    this.cookieVersion = cookieVersion;
    this.storage = storage;
  }

  /** @internal */
  public _setLogInfo(
    ...sources: { source: any; group: string; name?: string }[]
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

  public httpDecode<T = any>(encoded: string | Uint8Array): T;
  public httpDecode<T = any>(encoded: null | undefined): undefined;
  public httpDecode(encoded: any): any {
    return encoded == null ? undefined : httpDecode(encoded);
  }

  public httpDecrypt<T = any>(encoded: string | Uint8Array): T;
  public httpDecrypt<T = any>(encoded: null | undefined): undefined;
  public httpDecrypt(encoded: any): any {
    if (encoded == null) return undefined;
    return this._crypto.decrypt(encoded);
  }

  public hash<T extends string | null | undefined, B extends boolean>(
    source: T,
    numeric: B,
    secure?: boolean
  ): B extends true ? number : MaybeUndefined<T>;
  public hash<T extends string | null | undefined>(
    source: T,
    bits?: 32 | 64 | 128,
    secure?: boolean
  ): MaybeUndefined<T, string>;
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
    message: string | Error | Nullish,
    logLevel?: LogLevel,
    error?: Error
  ): void;
  public log(
    source: any,
    arg: LogMessage | string | Error | Nullish,
    level?: LogLevel,
    error?: Error
  ): void {
    // This is what you get if you try to log nothing (null or undefined); Nothing.
    if (!arg) return;

    if (!error && arg instanceof Error) {
      error = arg;
    }
    const message: Partial<LogMessage> =
      !isObject(arg) || arg instanceof Error
        ? {
            message:
              arg instanceof Error ? `An error occurred: ${arg.message}` : arg,
            level: level ?? (error ? "error" : "info"),
            error: error ?? (arg instanceof Error ? arg : undefined),
          }
        : arg;

    const { group, name = getDefaultLogSourceName(source) } =
      this._logGroups.get(source) ?? {};

    message.group ??= group;
    message.source ??= name;

    this._host.log(serializeLogMessage(message as LogMessage));
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
      const ps = parseHttpHeader(cookie, {
        delimiters: false,
        lowerCase: true,
      });

      const [name, value] = ps[parameterListSymbol]?.[0] ?? [];
      if (!name) continue;

      cookies[name] = {
        value,
        httpOnly: "httponly" in ps,
        sameSitePolicy: SAME_SITE[ps["samesite"]] ?? "Lax",
        maxAge: ps["max-age"] ? parseInt(ps["max-age"]) : undefined,
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

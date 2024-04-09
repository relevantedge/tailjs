import { hash, httpDecode, httpEncode, } from "@tailjs/util/transport";
import ShortUniqueId from "short-unique-id";
import { isString } from "@tailjs/util";
import { formatError, params } from "./lib";
const SAME_SITE = { strict: "Strict", lax: "Lax", none: "None" };
const uuid = new ShortUniqueId();
const getDefaultLogSourceName = (source) => {
    if (!source)
        return "";
    if (isString(source))
        return source;
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
    _crypto;
    _host;
    _logGroups = new Map();
    metadata;
    tags;
    hasManagedConsents;
    cookieVersion;
    storage;
    constructor(host, crypto, metadata, hasManagedConsents, storage, tags, cookieVersion = "C") {
        this._host = host;
        this._crypto = crypto;
        this.metadata = metadata;
        this.tags = tags;
        this.cookieVersion = cookieVersion;
        this.hasManagedConsents = hasManagedConsents;
        this.storage = storage;
    }
    /** @internal */
    _setLogInfo(...sources) {
        sources.forEach((source) => this._logGroups.set(source, {
            group: source.group,
            name: source.name ?? getDefaultLogSourceName(source),
        }));
    }
    httpEncrypt(value) {
        return this._crypto.encrypt(value);
    }
    httpEncode(value) {
        return httpEncode(value);
    }
    httpDecode(encoded) {
        return httpDecode(encoded);
    }
    httpDecrypt(encoded) {
        if (encoded == null)
            return encoded;
        return this._crypto.decrypt(encoded);
    }
    hash(value, numericOrBits, secure = false) {
        return value == null
            ? value
            : secure
                ? this._crypto.hash(value, numericOrBits)
                : hash(value, numericOrBits);
    }
    log(source, arg, level, error) {
        const message = error instanceof Error
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
        this._host.log(message);
    }
    async nextId(scope) {
        return uuid.rnd();
    }
    readText(path, changeHandler) {
        return this._host.readText(path, changeHandler);
    }
    read(path, changeHandler) {
        return this._host.read(path, changeHandler);
    }
    async request(request) {
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
        const responseHeaders = Object.fromEntries(Object.entries(response.headers).map(([name, value]) => [
            name.toLowerCase(),
            value,
        ]));
        const cookies = {};
        for (const cookie of response.cookies) {
            const ps = params(cookie);
            if (!ps[0])
                continue;
            const [name, value] = ps[0];
            const rest = Object.fromEntries(ps.slice(1).map(([k, v]) => [k.toLowerCase(), v]));
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
    warn(source, message, error) {
        this.log(source, message, "warn", error);
    }
    error(source, message, error) {
        this.log(source, message, "warn", error);
    }
}
//# sourceMappingURL=TrackerEnvironment.js.map
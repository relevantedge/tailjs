import fs from "fs";
import http from "http";
import https from "https";
import * as p from "path";
import { v4 as uuid } from "uuid";
import zlib from "zlib";
export class NativeHost {
    _rootPath;
    _console;
    constructor(rootPath, console = true) {
        this._rootPath = p.resolve(rootPath);
        this._console = console;
    }
    async ls(path, rercursively) {
        path = p.join(this._rootPath, path);
        if (!path.startsWith(this._rootPath)) {
            throw new Error(`Invalid path (it is outside the root scope).`);
        }
        if (!fs.existsSync(path)) {
            return null;
        }
        const filePaths = await fs.promises.readdir(path);
        const resources = [];
        for (const path in filePaths) {
            if (!path.startsWith(this._rootPath)) {
                continue;
            }
            const stat = fs.statSync(path);
            const type = stat.isFile()
                ? "file"
                : stat.isDirectory()
                    ? "dir"
                    : undefined;
            if (!type) {
                continue;
            }
            resources.push({
                created: stat.birthtimeMs,
                modified: stat.mtimeMs,
                path: path.substring(this._rootPath.length),
                type,
                name: p.basename(path),
            });
            if (rercursively && stat.isDirectory()) {
                const children = await this.ls(path, true);
                if (children) {
                    resources.push(...children);
                }
            }
        }
        return resources;
    }
    async compress(data, algorithm) {
        if (algorithm === "br") {
            return await new Promise((resolve, reject) => {
                zlib.brotliCompress(typeof data === "string" ? data : Buffer.from(data).toString("utf-8"), {
                    params: {
                        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
                    },
                }, (error, result) => {
                    if (error)
                        reject(error);
                    resolve(new Uint8Array(result));
                });
            });
        }
        if (algorithm === "gzip") {
            return await new Promise((resolve, reject) => {
                zlib.gzip(typeof data === "string" ? data : Buffer.from(data).toString("utf-8"), {
                    level: 9,
                }, (error, result) => {
                    if (error)
                        reject(error);
                    resolve(new Uint8Array(result));
                });
            });
        }
        return null;
    }
    async log({ group = "console", message: data, level = "info", source, }) {
        const msg = JSON.stringify({
            timestamp: new Date().toISOString(),
            source,
            level,
            data,
        });
        if (group === "console" || this._console) {
            switch (level) {
                case "debug":
                    console.debug(msg);
                    break;
                case "warn":
                    console.warn(msg);
                    break;
                case "error":
                    console.error(msg);
                    break;
                default:
                    console.log(msg);
            }
            return;
        }
        let dir = p.join(this._rootPath, "logs");
        const parts = group.split("/");
        if (parts.length > 1) {
            const newDir = p.join(dir, ...parts.slice(0, parts.length - 1));
            if (!newDir.startsWith(dir)) {
                throw new Error(`Invalid group name '${group}'.`);
            }
        }
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.appendFile(p.join(dir, `${parts[parts.length - 1]}.json`), `${msg}\n`, "utf-8");
    }
    readText(path, changeHandler) {
        return this._read(path, true, changeHandler);
    }
    read(path, changeHandler) {
        return this._read(path, false, changeHandler);
    }
    async _read(path, text, changeHandler) {
        const fullPath = p.resolve(p.join(this._rootPath, path));
        if (!fullPath.startsWith(this._rootPath)) {
            throw new Error("The requested path is outside the root.");
        }
        if (!fs.existsSync(fullPath)) {
            return null;
        }
        if (changeHandler) {
            fs.watchFile(fullPath, async function listener() {
                try {
                    if ((await changeHandler(path, read)) !== true) {
                        fs.unwatchFile(fullPath, listener);
                        return;
                    }
                }
                catch (e) {
                    console.error(e);
                    // Don't crash the host with an unhandled async exception.
                }
            });
        }
        return await read();
        async function read() {
            if (text) {
                return (await fs.promises.readFile(fullPath, "utf-8"));
            }
            else {
                return new Uint8Array((await fs.promises.readFile(fullPath)).buffer);
            }
        }
    }
    request(request) {
        request.method ??= request.body ? "POST" : "GET";
        return new Promise((resolve, reject) => {
            const tryCatch = (action) => {
                try {
                    return action();
                }
                catch (e) {
                    reject(e);
                }
            };
            tryCatch(() => {
                if (!request)
                    return;
                const req = (request.url.startsWith("https:") ? https : http).request(request.url, {
                    headers: request.headers,
                    method: request.method,
                    cert: request.x509?.cert
                        ? typeof request.x509.cert === "string"
                            ? request.x509.cert
                            : Buffer.from(request.x509.cert.buffer)
                        : void 0,
                    key: request.x509?.key,
                }, (res) => {
                    if (!res?.statusCode) {
                        reject(new Error("The server did not reply with a status code."));
                        return;
                    }
                    const body = [];
                    res.on("data", (chunk) => tryCatch(() => body.push(chunk)));
                    res.on("end", () => tryCatch(() => {
                        if (!request)
                            return;
                        const response = Buffer.concat(body);
                        const headers = {};
                        const cookies = [];
                        for (let [name, value] of Object.entries(res.headers)) {
                            if (value == null)
                                continue;
                            name = name.toLowerCase();
                            if (name === "set-cookie") {
                                cookies.push(...(Array.isArray(value) ? value : [value]));
                                continue;
                            }
                            headers[name] = Array.isArray(value)
                                ? value.join(", ")
                                : value;
                        }
                        resolve({
                            status: res.statusCode ?? 502,
                            headers,
                            cookies,
                            body: (request.binary
                                ? new Uint8Array(response)
                                : response.toString("utf-8")),
                        });
                    }));
                });
                req.on("error", (err) => {
                    reject(err);
                });
                req.on("timeout", () => {
                    req.destroy();
                    reject(new Error("Request time out"));
                });
                if (request.body) {
                    req.end(request.body, "utf-8");
                }
            });
        });
    }
    nextId(scope) {
        // UUID v4, remove hyphens, reencode as if radix 16 with radix 36 to reduce number of characters further.
        return uuid()
            .replaceAll("-", "")
            .match(/[0-9a-fA-F]{1,13}/g)
            .map((value) => parseInt(value, 16).toString(36))
            .join("");
    }
}
//# sourceMappingURL=NativeHost.js.map
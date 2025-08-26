'use strict';

var util = require('@tailjs/util');
var nodePath = require('path');
var fs = require('fs');
var winston = require('winston');
require('winston-daily-rotate-file');
var http = require('http');
var https = require('https');
var zlib$1 = require('node:zlib');
var uuid = require('uuid');
var engine = require('@tailjs/engine');
var zlib = require('zlib');
var util$1 = require('util');
var tar = require('tar-stream');
var yauzl = require('yauzl');
var requestIp = require('request-ip');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var nodePath__namespace = /*#__PURE__*/_interopNamespaceDefault(nodePath);
var zlib__namespace$1 = /*#__PURE__*/_interopNamespaceDefault(zlib$1);
var zlib__namespace = /*#__PURE__*/_interopNamespaceDefault(zlib);
var tar__namespace = /*#__PURE__*/_interopNamespaceDefault(tar);
var yauzl__namespace = /*#__PURE__*/_interopNamespaceDefault(yauzl);

function _define_property$1(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
const tailJsLogLevels = {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
};
/** Default logger for {@link NativeHost}. It uses winston internally. */ class DefaultLogger {
    initialize(rootPath) {
        this._rootPath = rootPath;
        return;
    }
    log(message) {
        message = {
            timestamp: new Date().toISOString(),
            ...message
        };
        if (this._settings.console) {
            if (tailJsLogLevels[message.level] <= tailJsLogLevels[this._settings.console]) {
                switch(message.level){
                    case "trace":
                    case "debug":
                        console.debug(message);
                        break;
                    case "info":
                        console.info(message);
                        break;
                    case "warn":
                        console.warn(message);
                        break;
                    case "error":
                    case "critical":
                        console.error(message);
                        break;
                }
            }
        }
        if (this._settings.basePath && this._rootPath !== null) {
            var _message_group;
            const logger = util.get(this._groupLoggers, (_message_group = message.group) !== null && _message_group !== void 0 ? _message_group : "default", ()=>{
                var _this__rootPath;
                const directory = nodePath.join((_this__rootPath = this._rootPath) !== null && _this__rootPath !== void 0 ? _this__rootPath : util.throwError("Root path has not been initialized."), this._settings.basePath, message.group || "");
                if (!directory.startsWith(this._rootPath)) {
                    util.throwError(`Invalid path for the group '${message.group}' (${directory}).`);
                }
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, {
                        recursive: true
                    });
                }
                return winston.createLogger({
                    levels: tailJsLogLevels,
                    format: winston.format.json(),
                    transports: [
                        new winston.transports.DailyRotateFile({
                            datePattern: "YYYYMMDD-HH",
                            filename: nodePath.join(directory, "%DATE%.log.json"),
                            maxSize: this._settings.maxSize,
                            maxFiles: this._settings.maxFiles
                        })
                    ]
                });
            });
            logger.log(message);
        }
    }
    constructor(settings){
        _define_property$1(this, "_settings", void 0);
        _define_property$1(this, "_groupLoggers", new Map());
        _define_property$1(this, "_rootPath", void 0);
        this._settings = util.merge({}, [
            settings,
            {
                maxSize: 52428800,
                maxFiles: 20,
                basePath: "logs",
                level: "info",
                console: "info"
            }
        ], {
            overwrite: false
        });
    }
}

// SO... it finally came to this; using AI code. https://claude.ai/chat/03fad402-1e8e-4c13-bcad-150bc2d70826
// Promisify zlib functions
const gunzip = util$1.promisify(zlib__namespace.gunzip);
async function decompress(data, algorithm) {
    switch(algorithm){
        case "zip":
            return decompressZip(data);
        case "tar":
            return decompressTar(data);
        case "tar.gz":
            return decompressTarGz(data);
        default:
            throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
}
async function decompressZip(data) {
    return new Promise((resolve, reject)=>{
        const entries = [];
        yauzl__namespace.fromBuffer(Buffer.from(data), {
            lazyEntries: true
        }, (err, zipfile)=>{
            if (err) return reject(err);
            if (!zipfile) return reject(new Error("Failed to open ZIP file"));
            zipfile.readEntry();
            zipfile.on("entry", (entry)=>{
                // Skip directories
                if (/\/$/.test(entry.fileName)) {
                    zipfile.readEntry();
                    return;
                }
                zipfile.openReadStream(entry, (err, readStream)=>{
                    if (err) return reject(err);
                    if (!readStream) return reject(new Error("Failed to open read stream"));
                    const chunks = [];
                    readStream.on("data", (chunk)=>chunks.push(chunk));
                    readStream.on("end", ()=>{
                        const fileData = Buffer.concat(chunks);
                        entries.push({
                            name: entry.fileName,
                            data: new Uint8Array(fileData)
                        });
                        zipfile.readEntry();
                    });
                    readStream.on("error", reject);
                });
            });
            zipfile.on("end", ()=>resolve(entries));
            zipfile.on("error", reject);
        });
    });
}
async function decompressTar(data) {
    return new Promise((resolve, reject)=>{
        const entries = [];
        const extract = tar__namespace.extract();
        extract.on("entry", (header, stream, next)=>{
            // Skip directories
            if (header.type === "directory") {
                stream.resume();
                next();
                return;
            }
            const chunks = [];
            stream.on("data", (chunk)=>chunks.push(chunk));
            stream.on("end", ()=>{
                const fileData = Buffer.concat(chunks);
                entries.push({
                    name: header.name,
                    data: new Uint8Array(fileData)
                });
                next();
            });
            stream.on("error", reject);
            stream.resume();
        });
        extract.on("finish", ()=>resolve(entries));
        extract.on("error", reject);
        // Write the tar data to the extract stream
        extract.write(Buffer.from(data));
        extract.end();
    });
}
async function decompressTarGz(data) {
    try {
        const decompressedBuffer = await gunzip(Buffer.from(data));
        const decompressedData = new Uint8Array(decompressedBuffer);
        // Then extract the tar
        return decompressTar(decompressedData);
    } catch (error) {
        throw new Error(`Failed to decompress tar.gz: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class NativeHost {
    async ls(path) {
        if (!this._rootPath) {
            return [];
        }
        path = nodePath__namespace.join(this._rootPath, path);
        if (!path.startsWith(this._rootPath)) {
            throw new Error(`Invalid path (it is outside the root scope).`);
        }
        if (!fs.existsSync(path)) {
            return null;
        }
        const filePaths = await fs.promises.readdir(path);
        const resources = [];
        for(const path in filePaths){
            if (!path.startsWith(this._rootPath)) {
                continue;
            }
            const stat = fs.statSync(path);
            const type = stat.isFile() ? "file" : stat.isDirectory() ? "dir" : undefined;
            if (!type) {
                continue;
            }
            resources.push({
                created: stat.birthtimeMs,
                modified: stat.mtimeMs,
                path: path.substring(this._rootPath.length),
                readonly: false,
                type,
                name: nodePath__namespace.basename(path)
            });
        }
        return resources;
    }
    log(message) {
        var _this__logger;
        if (!this._initialized) {
            var _this__logger_initialize, _this__logger1;
            var _this__logger_initialize1;
            this._initialized = (_this__logger_initialize1 = (_this__logger1 = this._logger) === null || _this__logger1 === void 0 ? void 0 : (_this__logger_initialize = _this__logger1.initialize) === null || _this__logger_initialize === void 0 ? void 0 : _this__logger_initialize.call(_this__logger1, this._rootPath)) !== null && _this__logger_initialize1 !== void 0 ? _this__logger_initialize1 : true;
        }
        if (this._initialized instanceof Promise) {
            return this._initialized.then(()=>this.log(message));
        }
        const throttleKey = message.throttleKey == null ? null : message.throttleKey;
        if (throttleKey != null) {
            let throttleStats = this._throttleStats.get(throttleKey);
            if (!throttleStats) {
                throttleStats = [
                    util.now(),
                    0,
                    0
                ];
            } else {
                throttleStats = throttleStats[0] < util.now() + util.MINUTE ? [
                    throttleStats[0],
                    throttleStats[1] + 1,
                    throttleStats[2] + 1
                ] : [
                    util.now(),
                    0,
                    throttleStats[2] + 1
                ];
            }
            if (throttleStats[2] >= 3) {
                message.message += `\n(This kind of event has occurred ${throttleStats[2]} times since start`;
                if (throttleStats[1] < 3) {
                    message.message += ".)";
                } else if (throttleStats[1] === 3) {
                    message.message += " - further events of this kind will not be logged for the next minute.)";
                } else {
                    return;
                }
            }
        }
        (_this__logger = this._logger) === null || _this__logger === void 0 ? void 0 : _this__logger.log(message);
    }
    read(path, changeHandler) {
        return this._read(path, false, changeHandler);
    }
    readText(path, changeHandler) {
        return this._read(path, true, changeHandler);
    }
    async write(path, data) {
        const fullPath = this._resolvePath(path);
        if (!fullPath) {
            return;
        }
        const dir = nodePath__namespace.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
        await fs.promises.writeFile(fullPath, data);
    }
    async writeText(path, data) {
        const fullPath = this._resolvePath(path);
        if (!fullPath) {
            return;
        }
        const dir = nodePath__namespace.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }
        await fs.promises.writeFile(fullPath, data, "utf-8");
    }
    async delete(path) {
        const fullPath = this._resolvePath(path);
        if (!fullPath) {
            return false;
        }
        if (!fs.existsSync(fullPath)) return false;
        const type = await fs.promises.stat(fullPath);
        if (type.isDirectory()) {
            await fs.promises.rm(fullPath, {
                recursive: true
            });
        } else {
            await fs.promises.rm(fullPath);
        }
        return true;
    }
    _resolvePath(path) {
        if (!this._rootPath) {
            return null;
        }
        if (path === "js/tail.debug.map.js") {
            try {
                const resolved = require.resolve("@tailjs/client");
                return nodePath__namespace.join(nodePath__namespace.dirname(resolved), "iife", path.substring(3));
            } catch (e) {
                console.log(`${path} is not available - it requires the @tailjs/client package to be installed explicitly.`);
            }
        }
        const fullPath = nodePath__namespace.resolve(nodePath__namespace.join(this._rootPath, path));
        if (!fullPath.startsWith(this._rootPath)) {
            throw new Error("The requested path is outside the root.");
        }
        return fullPath;
    }
    async _read(path, text, changeHandler) {
        const fullPath = this._resolvePath(path);
        if (!fullPath || !fs.existsSync(fullPath)) {
            return null;
        }
        if (changeHandler) {
            fs.watchFile(fullPath, async function listener() {
                try {
                    if (await changeHandler(path, read) !== true) {
                        fs.unwatchFile(fullPath, listener);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                // Don't crash the host with an unhandled async exception.
                }
            });
        }
        return await read();
        async function read() {
            if (text) {
                return await fs.promises.readFile(fullPath, "utf-8");
            } else {
                return new Uint8Array((await fs.promises.readFile(fullPath)).buffer);
            }
        }
    }
    request(request) {
        var _request;
        var _method;
        (_method = (_request = request).method) !== null && _method !== void 0 ? _method : _request.method = request.body ? "POST" : "GET";
        return new Promise((resolve, reject)=>{
            const tryCatch = (action)=>{
                try {
                    return action();
                } catch (e) {
                    reject(e);
                }
            };
            tryCatch(()=>{
                var _request_x509;
                if (!request) return;
                const { cert, key, pfx } = {
                    ...engine.detectPfx(request.x509),
                    cert: ((_request_x509 = request.x509) === null || _request_x509 === void 0 ? void 0 : _request_x509.cert) ? typeof request.x509.cert === "string" ? request.x509.cert : Buffer.from(request.x509.cert.buffer) : void 0
                };
                var _obj;
                const headers = (_obj = util.obj(request.headers, (kv)=>kv[1] != null ? kv : util.skip)) !== null && _obj !== void 0 ? _obj : {};
                if (request.body) {
                    headers["content-length"] = "" + (typeof request.body === "string" ? Buffer.byteLength(request.body, "utf8") : request.body.length);
                }
                const req = (request.url.startsWith("https:") ? https : http).request(request.url, {
                    method: request.method,
                    headers,
                    ...pfx ? {
                        pfx: cert,
                        passphrase: key
                    } : {
                        cert,
                        key
                    }
                }, (res)=>{
                    if (!(res === null || res === void 0 ? void 0 : res.statusCode)) {
                        reject(new Error("The server did not reply with a status code."));
                        return;
                    }
                    const body = [];
                    res.on("data", (chunk)=>tryCatch(()=>body.push(chunk)));
                    res.on("end", ()=>tryCatch(()=>{
                            if (!request) return;
                            const response = Buffer.concat(body);
                            const headers = {};
                            const cookies = [];
                            for (let [name, value] of Object.entries(res.headers)){
                                if (value == null) continue;
                                name = name.toLowerCase();
                                if (name === "set-cookie") {
                                    cookies.push(...Array.isArray(value) ? value : [
                                        value
                                    ]);
                                    continue;
                                }
                                headers[name] = Array.isArray(value) ? value.join(", ") : value;
                            }
                            var _res_statusCode;
                            resolve({
                                status: (_res_statusCode = res.statusCode) !== null && _res_statusCode !== void 0 ? _res_statusCode : 502,
                                headers,
                                cookies,
                                body: request.binary ? new Uint8Array(response) : response.toString("utf-8")
                            });
                        }));
                });
                let rejected = false;
                req.on("error", (err)=>!rejected && reject(err));
                req.on("timeout", ()=>{
                    req.destroy();
                    !rejected && reject(new Error("Request time out"));
                });
                if (typeof request.body === "string") {
                    req.end(request.body, "utf-8");
                } else if (request.body) {
                    req.end(request.body);
                } else {
                    req.end();
                }
            });
        });
    }
    decompress(data, algorithm) {
        return decompress(data, algorithm);
    }
    async compress(data, algorithm) {
        const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
        const method = algorithm === "br" ? zlib__namespace$1.brotliCompress : algorithm === "gzip" ? zlib__namespace$1.gzip : null;
        return method == null ? null : new Promise((resolve, reject)=>{
            method(buffer, (error, result)=>{
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
    nextId(scope) {
        // UUID v4, remove hyphens, re-encode as if radix 16 with radix 36 to reduce number of characters further.
        return uuid.v4().replaceAll("-", "").match(/[0-9a-fA-F]{1,13}/g).map((value)=>parseInt(value, 16).toString(36)).join("");
    }
    constructor({ rootPath, logger = {} }){
        _define_property(this, "_rootPath", void 0);
        _define_property(this, "_logger", void 0);
        _define_property(this, "_throttleStats", new Map());
        _define_property(this, "_initialized", false);
        this._rootPath = rootPath ? nodePath__namespace.resolve(rootPath) : null;
        if (logger === "console") {
            logger = {
                basePath: false,
                console: "info"
            };
        }
        this._logger = !logger ? null : "log" in logger ? logger : new DefaultLogger(logger);
    }
}

let globalResolvers = [];
let globalResolversSealed = false;
const resolveConfig = async (resolver, config)=>{
    if (!resolver) return config;
    try {
        if (Array.isArray(resolver)) {
            for (const nestedResolver of resolver){
                config = {
                    ...config,
                    ...await resolveConfig(nestedResolver, config)
                };
            }
            return config;
        } else if (typeof resolver === "function") {
            return {
                ...config,
                ...await resolver(config)
            };
        } else if (resolver.then) {
            return resolveConfig(await resolver, config);
        } else {
            // Probe for ".default" if the configuration came from something webpack that may do this to default exports.
            if (resolver.default) {
                return resolveConfig(resolver.default, config);
            }
            // The resolver is a plain configuration object.
            return {
                ...config,
                ...resolver
            };
        }
    } catch (e) {
        console.error("tailjs: A configuration resolver failed.", e);
    }
};
/**
 * Use this method to add configuration to the middleware before it is created.
 *
 * Note that this assumes you are using the middleware as a singleton
 * which means you should not use this function if you intend to have multiple middleware instances.
 */ const addTailJsConfiguration = (configuration, replace = false)=>{
    if (globalResolversSealed) {
        throw new TypeError("The tail.js middleware can no longer be configured at this point since it has already been initialized.");
    }
    (replace ? globalResolvers = [] : globalResolvers).push(configuration);
};
const FINAL_COOKIES = Symbol();
const createServerContext = (config, initializeOnFirstRequest = true, defaults)=>{
    const trackerSymbol = Symbol();
    const tailCookies = Symbol();
    let finalConfig;
    let requestHandler;
    const initializeRequestHandler = async ()=>{
        var _finalConfig;
        finalConfig = await resolveConfig([
            globalResolvers,
            config
        ], {});
        if (defaults) {
            finalConfig = Object.assign(finalConfig !== null && finalConfig !== void 0 ? finalConfig : {}, defaults);
        }
        globalResolversSealed = true;
        var _finalConfig_resourcesPath;
        const host = new NativeHost({
            rootPath: (_finalConfig_resourcesPath = finalConfig.resourcesPath) !== null && _finalConfig_resourcesPath !== void 0 ? _finalConfig_resourcesPath : "./res",
            logger: finalConfig.logger
        });
        var _extensions;
        (_extensions = (_finalConfig = finalConfig).extensions) !== null && _extensions !== void 0 ? _extensions : _finalConfig.extensions = [
            (console.warn("tailjs: No extensions has been configured. Events are only logged to the console."), new engine.EventLogger({
                group: "events",
                minimal: true,
                console: true
            }))
        ];
        return engine.bootstrap({
            ...finalConfig,
            host
        });
    };
    if (config instanceof engine.RequestHandler) {
        requestHandler = config;
    } else if (!initializeOnFirstRequest) {
        return initializeRequestHandler().then((requestHandler)=>createServerContext(requestHandler));
    }
    const setCookies = (response, cookies)=>{
        let currentCookies = response[tailCookies];
        if (cookies || currentCookies) {
            let current = response.getHeader("set-cookie");
            current = (!current ? [] : Array.isArray(current) ? current : [
                "" + current
            ]).filter((current)=>(currentCookies === null || currentCookies === void 0 ? void 0 : currentCookies.has(current)) !== true);
            response.setHeader("set-cookie", cookies ? current.concat(cookies.map((cookie)=>cookie.headerString)) : current);
        }
    };
    const middleware = async (request, response, next, resolveTracker = false)=>{
        try {
            if (!requestHandler) {
                requestHandler = await initializeRequestHandler();
            }
            if (!resolveTracker) {
                next !== null && next !== void 0 ? next : next = ()=>{
                    response.statusCode = 404;
                    response.end(`'${request.url}' is not mapped to any action.`);
                };
            }
            if (!request.url) {
                return await (next === null || next === void 0 ? void 0 : next());
            }
            let body = request.body;
            if (!(finalConfig === null || finalConfig === void 0 ? void 0 : finalConfig.json) && typeof body === "string") {
                body = Uint8Array.from(body, (p)=>p.charCodeAt(0));
            }
            var _request_method, _ref;
            const { tracker, response: tailResponse } = (_ref = await requestHandler.processRequest({
                method: (_request_method = request.method) !== null && _request_method !== void 0 ? _request_method : "GET",
                url: request.url,
                headers: request.headers,
                body,
                clientIp: request.clientIp || requestIp.getClientIp(request)
            }, {
                matchAnyPath: !resolveTracker && finalConfig.matchAnyPath,
                trustedContext: resolveTracker
            })) !== null && _ref !== void 0 ? _ref : {};
            request[trackerSymbol] = tracker && util.deferred(async ()=>{
                const resolved = await tracker();
                resolved.dispose = async ()=>{
                    setCookies(response, await requestHandler.getClientCookies(resolved));
                };
                Symbol.asyncDispose && (resolved[Symbol.asyncDispose] = ()=>resolved.dispose());
                return resolved;
            });
            if (!resolveTracker && tailResponse) {
                response.statusCode = tailResponse.status;
                for(const name in tailResponse.headers){
                    response.setHeader(name, tailResponse.headers[name]);
                }
                setCookies(response, tailResponse.cookies);
                if (tailResponse.body == null) {
                    response.end();
                } else if (typeof tailResponse.body === "string") {
                    response.end(tailResponse.body, "utf-8");
                } else if (tailResponse.body instanceof Uint8Array) {
                    response.end(Buffer.from(tailResponse.body));
                }
                return;
            }
            return await (next === null || next === void 0 ? void 0 : next());
        } catch (e) {
            if (resolveTracker) {
                throw e;
            }
            response.statusCode = 500;
            console.error("tails.js: An error occurred", e);
            response.end("An error ocurred: " + e, "utf8");
            return undefined;
        }
    };
    const routeHandler = async (request, resolveTracker)=>{
        var _this, _request_body, _requestWrapper_trackerSymbol;
        if (resolveTracker && request[trackerSymbol]) {
            // Use the result we already have on subsequent requests.
            return request[trackerSymbol];
        }
        const responseHeaders = {};
        let responseBody;
        var _request_ip;
        const requestWrapper = {
            url: request.url,
            clientIp: (_request_ip = request.ip) !== null && _request_ip !== void 0 ? _request_ip : request.clientIp,
            method: request.method,
            headers: {},
            body: (_this = await ((_request_body = request.body) === null || _request_body === void 0 ? void 0 : _request_body.getReader().read())) === null || _this === void 0 ? void 0 : _this.value
        };
        request.headers.forEach((value, key)=>{
            const current = requestWrapper.headers[key];
            requestWrapper.headers[key] = current == null ? value : Array.isArray(current) ? [
                ...current,
                value
            ] : [
                current,
                value
            ];
        });
        const responseWrapper = {
            statusCode: 200,
            getHeader: (name)=>responseHeaders[name],
            setHeader: (name, value)=>responseHeaders[name] = value,
            end: (chunk)=>responseBody = chunk,
            writeHead: ()=>responseWrapper
        };
        await middleware(requestWrapper, responseWrapper, undefined, resolveTracker);
        if (!resolveTracker) {
            var _responseWrapper_statusCode;
            return new Response(responseBody == null ? undefined : new Blob([
                responseBody
            ]).stream(), {
                headers: Object.entries(responseHeaders).flatMap(([key, value])=>value == null ? [] : Array.isArray(value) ? value.map((value)=>[
                            key,
                            value
                        ]) : [
                        [
                            key,
                            value
                        ]
                    ]),
                status: (_responseWrapper_statusCode = responseWrapper.statusCode) !== null && _responseWrapper_statusCode !== void 0 ? _responseWrapper_statusCode : 200
            });
        }
        const tracker = await ((_requestWrapper_trackerSymbol = requestWrapper[trackerSymbol]) === null || _requestWrapper_trackerSymbol === void 0 ? void 0 : _requestWrapper_trackerSymbol.call(requestWrapper));
        if (tracker && !tracker.getFinalCookies) {
            var _tracker, _FINAL_COOKIES;
            // TODO: Maybe add an lock mechanism like "checkDisposed" internally in the tracker
            // so it can reject further operations if disposed.
            const dispose = tracker.dispose = async ()=>{
                var _;
                return (_ = (_tracker = tracker)[_FINAL_COOKIES = FINAL_COOKIES]) !== null && _ !== void 0 ? _ : _tracker[_FINAL_COOKIES] = await requestHandler.getClientCookies(tracker);
            };
            tracker.getFinalCookies = async ()=>{
                await dispose();
                return tracker[FINAL_COOKIES];
            };
            tracker.json = async (payload)=>tracker.writeTo(Response.json(payload));
            tracker.writeTo = async (response)=>{
                for (const cookie of (await tracker.getFinalCookies())){
                    response.headers.append("set-cookie", cookie.headerString);
                }
                return response;
            };
        }
        return tracker;
    };
    const context = {
        middleware: (request, response, next)=>middleware(request, response, next),
        routeHandler: async (request)=>routeHandler(request, false),
        async resolveTracker (request, response) {
            var _request_trackerSymbol;
            if (response === undefined) {
                return routeHandler(request, true);
            }
            if (request[trackerSymbol] === undefined) {
                var // Null means we tried but nothing came back.
                // This tells us not to invoke the middleware again next time someone asks during this request.
                _request, _trackerSymbol;
                await middleware(request, response, undefined, true);
                var _;
                (_ = (_request = request)[_trackerSymbol = trackerSymbol]) !== null && _ !== void 0 ? _ : _request[_trackerSymbol] = null;
            }
            var _request_trackerSymbol1;
            return (_request_trackerSymbol1 = (_request_trackerSymbol = request[trackerSymbol]) === null || _request_trackerSymbol === void 0 ? void 0 : _request_trackerSymbol.call(request)) !== null && _request_trackerSymbol1 !== void 0 ? _request_trackerSymbol1 : undefined;
        }
    };
    return context;
};

const serve = async ({ host, port, ...settings } = {})=>{
    var _settings;
    var _endpoint;
    (_endpoint = (_settings = settings).endpoint) !== null && _endpoint !== void 0 ? _endpoint : _settings.endpoint = "/_t.js";
    settings.debugScript = true;
    const { middleware } = await createServerContext({
        ...settings
    });
    const server = http.createServer((req, res)=>{
        const chunks = [];
        req.on("data", (chunk)=>{
            chunks.push(chunk);
        });
        req.on("end", ()=>{
            req.body = Buffer.concat(chunks);
            if (req.headers["content-type"] === "application/json") {
                req.body = req.body.toString("utf8");
            }
            middleware(req, res, ()=>{
                res.statusCode = 404;
                res.end("Not found.");
            });
        });
        req.on("error", (error)=>{
            res.statusCode = 500;
            res.end(error === null || error === void 0 ? void 0 : error.toString());
        });
    });
    server.on("listening", ()=>{
        console.log(`Tail.js server listening on ${host !== null && host !== void 0 ? host : "0.0.0.0:" + port}`);
    });
    if (host) {
        server.listen(host);
    } else {
        server.listen(port !== null && port !== void 0 ? port : port = 7412);
    }
};

/** Logs collected tracker events to the console. */ class ConsoleLogger extends engine.EventLogger {
    constructor(){
        super({
            console: true
        });
    }
}

exports.ConsoleLogger = ConsoleLogger;
exports.DefaultLogger = DefaultLogger;
exports.NativeHost = NativeHost;
exports.addTailJsConfiguration = addTailJsConfiguration;
exports.createServerContext = createServerContext;
exports.serve = serve;

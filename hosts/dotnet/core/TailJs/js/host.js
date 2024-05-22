((host, engine) => {
    const logLevels = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        critical: 5,
        none: 6
    };
    const proxy = {
        async request(request) {
            const response = await host.Request(request, {
                status: 0,
                headers: {},
                cookies: [],
                body: ""
            });

            if (typeof response === "string") {
                throw new Error(response);
            }
            return response;
        },
        async ls(path) {
            return [...await host.List(path)].map(entry => ({
                path: entry.path,
                name: entry.name,
                type: entry.type,
                readonly: entry.readonly,
                created: entry.created ? new Date(entry.created) : undefined,
                modified: entry.modified ? new Date(entry.modified) : undefined
            }));
        },
        
        read(path, changeHandler) {
            return host.Read(path, changeHandler, false);
        },
        readText(path, changeHandler) {
            return host.Read(path, changeHandler, true);
        },
        write(path, data) {
            return host.Write(path, data, false);
        },
        writeText(path, data) {
            return host.Write(path, data, true);
        },
        delete(path) {
            return host.Delete(path);
        },
        log({level, error, ...rest} = {}) {
            host.Log(JSON.stringify({
                level: logLevels[level] ?? 6,
                error: error != null ? {message: error.message, name: error.name, stack: error.stack} : null,
                ...rest
            }));
        },
    };
    const toLogString = (src, depth = 0) => {
        if (!depth && Array.isArray(src)) {
            if (src.length <= 1) {
                src = src[0];
            } else {
                return "\n" + src.map((value, i) => `#${i}: ${toLogString(value, 0)}`).join("\n");
            }
        }
        if (typeof src === "function") return src.toString();

        if (src != null && (Array.isArray(src) || Object.getPrototypeOf(src) === Object.prototype)) {

            const mapped = Array.isArray(src) ? [] : {};
            for (const [key, value] of Object.entries(src)) {
                mapped[key] = toLogString(value, depth + 1);
            }
            return depth ? mapped : JSON.stringify(mapped, null, 2);
        } else if (src instanceof Error) {
            return {message: src + "", stack: src.stack};
        }
        return depth ? src : "" + src;
    }
    const log = (level) =>
        (...args) => host.Log(JSON.stringify({
            level,
            message: toLogString(args)
        }));

    globalThis.console = {
        debug: log(2),
        log: log(2),
        warn: log(3),
        error: log(4)
    }
    return proxy;
});

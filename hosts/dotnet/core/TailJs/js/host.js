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
        readText(path, changeHandler) {
            return host.Read(path, changeHandler, true);
        },
        read(path, changeHandler) {
            return host.Read(path, changeHandler, false);
        },
        log({group, level, source, data} = {}) {
            host.Log(JSON.stringify({
                data,
                level: logLevels[level] ?? 6,
                group: group ?? null,
                source: source ?? null
            }));
        },
    };
    const log = (level) =>
        (...args) => host.Log(JSON.stringify({
            level,
            data: args.length > 1 ? JSON.stringify(args) : JSON.stringify(args[0])
        }));

    globalThis.console = {
        debug: log(2),
        log: log(2),
        warn: log(3),
        error: log(4)
    }
    return proxy;
});

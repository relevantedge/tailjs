((host, engine) => Object.assign(globalThis, {
    setTimeout(callback, delay = 0) {
        if (typeof callback !== "function") {
            throw new TypeError("Callback is not a function.");
        }
        return host.SetTimeout(engine, () => callback(), Math.round(delay), 0);
    },
    clearTimeout(id) {
        host.ClearTimeout(id);
    },
    setInterval(callback, delay = 0) {
        if (typeof callback !== "function") {
            throw new TypeError("Callback is not a function.");
        }
        callback();
        (function invoke() {
            callback();
            host.SetTimeout(engine, invoke, Math.round(delay), id);
        })();
        const id = host.SetTimeout(engine, invoke, Math.round(delay));
        return id;
    },
    clearInterval(id) {
        host.ClearTimeout(id);
    },
}));

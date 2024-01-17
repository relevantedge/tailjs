((host, engine) => Object.assign(globalThis, {
    setTimeout(callback, delay = 0) {
        if (typeof callback !== "function") {
            throw new TypeError("Callback is not a function.");
        }
        return host.SetTimeout(engine, () => callback(), delay, 0);
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
            host.SetTimeout(engine, invoke, delay, id);
        })();
        const id = host.SetTimeout(engine, invoke, delay);
        return id;
    },
    clearInterval(id) {
        host.ClearTimeout(id);
    },
}));
(env) => ({
    httpEncode(value) {
        return env.httpEncode(JSON.parse(value));
    },
    httpEncrypt(value) {
        return env.httpEncrypt(JSON.parse(value));
    },
    httpDecode(value) {
        return JSON.parse(env.httpDecode(value));
    },
    httpDecrypt(value) {
        return JSON.parse(env.httpDecrypt(value));
    },
    hash(value, secure, numeric) {
        return env.hash(value, secure, numeric);
    },
    nextId() {
        return env.nextId();
    },
    request(request) {
        env.request(request);
    }
});

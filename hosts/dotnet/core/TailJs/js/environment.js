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
    log({Message: message, Level: level, Group: group, Source: source, Error: error, Details: details}){
      env.log({
          level: level.ToString(),
          message,
          details: details !== null ? JSON.parse(details.ToString()) : undefined,
          error: error != null ? Object.assign(new Error(error.Message), {name: Error.Name, stack: Error.Stack}) : undefined,
          group,
          source,
          sticky
      });  
    },
    nextId() {
        return env.nextId();
    },
    request(request) {
        env.request(request);
    }
});

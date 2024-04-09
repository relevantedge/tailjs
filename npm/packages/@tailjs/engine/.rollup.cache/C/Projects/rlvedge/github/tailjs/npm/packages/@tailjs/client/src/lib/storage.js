import { F, T, TAB_ID, decode, encode, filter, fun, httpDecode, httpDecrypt, httpEncode, httpEncrypt, map, mapSharedId, nil, now, push, shift, timeout, undefined, } from ".";
const memoryStorage = () => {
    const values = {};
    return {
        getItem: (key) => values[key],
        setItem: (key, value) => (values[key] = value),
        removeItem: (key) => delete values[key],
    };
};
const serialize = (value, expires, sourceId, secure = false) => value == nil
    ? nil
    : (secure ? httpEncrypt : httpEncode)(sourceId || expires
        ? {
            $: [
                value,
                expires, // If there is a source ID we need a value to keep the array length.
                sourceId,
            ],
        }
        : value);
let decoded, expires;
const deserialize = (value, removeExpired, secure = false) => !value /* including empty string */
    ? nil
    : ((decoded = (secure ? httpDecrypt : httpDecode)(value)),
        decoded.$
            ? ((expires = +((decoded = decoded.$)[1] ?? 0)),
                expires > 0 && expires < now(F)
                    ? (removeExpired?.(), nil)
                    : [decoded[0], expires, decoded[2]])
            : [decoded]);
let entry;
let oldEntry;
const storage = (storage, register, secure) => {
    const sourceId = register ? TAB_ID : undefined;
    const removeExpired = (key) => () => key && storage.removeItem(key);
    const ownListeners = new Set();
    const accessor = Object.assign((arg0, arg1, arg2) => {
        if (fun(arg0)) {
            if (!register)
                return;
            // Listener.
            const [innerHandler, triggerSelf = F] = [arg0, arg1];
            const handler = (...args) => {
                let res = innerHandler(...args);
                return res === F && unlisten?.();
            };
            const listener = ({ key, newValue, oldValue }) => (((entry = deserialize(newValue, removeExpired(key), secure)),
                (oldEntry = deserialize(oldValue, undefined, secure))),
                key &&
                    handler(key, entry?.[0] ?? nil, oldEntry?.[0] ?? nil, entry?.[2] ?? nil));
            let unlisten = () => ((unlisten = nil), register(listener, T), ownListeners.delete(handler));
            register(listener);
            triggerSelf && ownListeners.add(handler);
            return unlisten;
        }
        let [key, value, timeout = 0] = [arg0, arg1, arg2];
        if (value === undefined) {
            // get
            return (deserialize(storage.getItem(key), removeExpired(key), secure)?.[0] ??
                nil);
        }
        if (fun(value)) {
            //update
            return accessor(key, value(accessor(key)), timeout);
        }
        // set
        const data = value == nil || timeout < 0
            ? nil
            : serialize(value, timeout && !storage.supportsExpiry ? now(T) + timeout : undefined, sourceId, secure);
        data == nil
            ? storage?.removeItem(key)
            : storage?.setItem(key, data, timeout > 0 ? timeout : undefined);
        ownListeners.size &&
            (((entry = deserialize(data, undefined, secure)),
                (oldEntry = deserialize(storage.getItem(key), undefined, secure))),
                ownListeners.forEach((handler) => handler(key, entry?.[0] ?? nil, oldEntry?.[0] ?? nil, entry?.[2] ?? nil)));
        return value;
    });
    return accessor;
};
export const cookieStorage = {
    getItem: (key) => ((key = encode(key)),
        decode(document.cookie
            .split(";")
            .map((kv) => kv.split("="))
            .find((kv) => kv[0].trim() === key)?.[1] || nil)),
    setItem: (key, value, maxAge) => (document.cookie = `${encode(key)}=${encode(value ?? "")}; Path=/; SameSite=Lax${!value || maxAge != nil
        ? `; Max-Age=${Math.round((maxAge ?? 0) / 1000)}`
        : ""}`),
    removeItem: (key) => cookieStorage.setItem(key, "", 0),
    supportsExpiry: true,
};
export const memory = storage(memoryStorage());
export const cookies = storage(cookieStorage);
export const secureCookies = storage(cookieStorage, undefined, true);
export const session = storage(sessionStorage);
export const shared = storage(localStorage, (listener, remove) => remove
    ? window.removeEventListener("storage", listener)
    : window.addEventListener("storage", listener), true);
export const bind = (storage, key, useSharedId = T) => {
    useSharedId && (key = mapSharedId(key));
    return (...args) => storage(key, ...args);
};
export const sharedQueue = (key, keyExpiry = 2000, useSharedId = T) => {
    const queue = bind(shared, key, useSharedId);
    return (item, replace = F) => {
        if (item === undefined) {
            // Get
            let match = nil;
            queue((current) => {
                current = filter(current, (item) => item[1] > now());
                match = shift(current)?.[0] ?? nil;
                return current;
            });
            return match;
        }
        let exists = T;
        const updateQueue = (replace) => queue((current) => replace
            ? map(current, (other) => other[0] === item
                ? ((exists = T), [item, now() + keyExpiry])
                : other)
            : push(current ?? [], [item, now() + keyExpiry]));
        updateQueue(replace);
        if (keyExpiry) {
            let poll = timeout();
            const refreshKey = () => (updateQueue(T), !exists && poll(), exists);
            poll(refreshKey, -keyExpiry / 2);
        }
        return () => exists;
    };
};
//# sourceMappingURL=storage.js.map
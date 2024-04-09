export function any(value) {
    if (typeof value !== "object") {
        return Array.isArray(value) ? value.length > 0 : value != null;
    }
    for (const _ in value) {
        return true;
    }
    return false;
}
export function stringVal(value, sep = ";") {
    return value == null ? value : Array.isArray(value) ? value.join(sep) : value;
}
function* countYields(items) {
    let n = 0;
    for (const item of items) {
        yield item;
        ++n;
    }
    return n;
}
function* iterateObject(source, projection) {
    let i = 0;
    for (const p in source) {
        yield projection(source, p);
        ++i;
    }
    return i;
}
export function keys(source) {
    return iterateObject(source, (src, key) => key);
}
export function values(source) {
    return iterateObject(source, (src, key) => src[key]);
}
export function entries(source) {
    return source == null
        ? []
        : iterateObject(source, (src, key) => [key, src[key]]);
}
export const isIterable = (value) => value[Symbol.iterator] !== void 0;
export const group = ((...values) => {
    const groups = new Map();
    for (const src of values) {
        if (src === undefined)
            continue;
        for (const [key, value] of src) {
            let current = groups.get(key);
            if (current === undefined) {
                groups.set(key, (current = []));
            }
            if (isIterable(value)) {
                current.push(...value);
            }
            else {
                current.push(value);
            }
        }
    }
    return groups;
});
export const flat = Object.assign((...args) => [...flat.it(...args)], {
    *it(...args) {
        for (const item in map.it(...args)) {
            if (Array.isArray(item)) {
                yield* item;
            }
            else {
                yield item;
            }
        }
    },
});
export const map = Object.assign((...args) => [...map.it(...args)], {
    *it(values, projection) {
        if (!values)
            return 0;
        const length = values["length"] ?? values["count"] ?? values["Count"];
        if (typeof length === "number") {
            const newValues = [];
            for (let i = 0; i < length; i++) {
                newValues[i] = values[i];
            }
            values = newValues;
        }
        const iterable = (values[Symbol.iterator]
            ? values
            : typeof values === "object"
                ? Object.entries(values)
                : [values]);
        if (!projection) {
            return yield* countYields(iterable);
        }
        let i = 0;
        let n = 0;
        for (const value of iterable) {
            const projected = projection(value, i++);
            if (projected === void 0)
                continue;
            if (Array.isArray(projected["flat"])) {
                for (const value of projected["flat"]) {
                    yield value;
                }
            }
            yield projected;
            ++n;
        }
        return n;
    },
});
export const filter = merge((values, evaluate) => [...filter.it(values, evaluate)], {
    *it(values, evaluate) {
        if (!values) {
            return 0;
        }
        if (!evaluate) {
            return yield* countYields(values);
        }
        let i = 0;
        let n = 0;
        for (const value of values) {
            if (evaluate(value, i++)) {
                ++n;
                yield value;
            }
        }
        return n;
    },
});
export const forEach = (values, action) => {
    let i = 0;
    for (const v of map.it(values)) {
        action(v, i++);
    }
};
export function merge(...args) {
    let target = args[0];
    for (const source of args.slice(1)) {
        for (const [key, value] of Object.entries(source)) {
            if (value === void 0) {
                // delete target[key];
            }
            else if (typeof target[key] === "object" && typeof value === "object") {
                if (Object.getPrototypeOf(value) === Object.prototype) {
                    merge(target[key], value);
                }
                else {
                    target[key] = value;
                }
            }
            else {
                target[key] = value;
            }
        }
    }
    return target;
}
export const params = (value, decode = true) => {
    if (!value)
        return [];
    return Array.isArray(value) ? value.map(split) : [split(value)];
    function split(value) {
        const parts = value
            .split("=")
            .map((v) => (decode ? decodeURIComponent(v.trim()) : v.trim()));
        parts[1] ??= "";
        return parts;
    }
};
export const unparam = (value, encode = true) => {
    if (!value)
        return "";
    return map(value, ([key, value]) => value
        ? `${encode ? encodeURIComponent(key) : key}=${encode ? encodeURIComponent(value) : value}`
        : key).join("; ");
};
export const tryParse = (value, update) => (value ? update(JSON.parse(value)) : update(null));
export const expandPaths = (obj) => {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const path = key.split(".");
        let target = result;
        for (let i = 0; i < path.length; i++) {
            if (i < path.length - 1) {
                target = target[path[i]] ??= {};
            }
            else {
                target[path[i]] = value;
            }
        }
    }
    return result;
};
export const replace = (s, replacements, encode) => s == null
    ? null
    : replacements.reduce((s, [from, to]) => s.replaceAll(encode ? from : to, encode ? to : from), s);
export const formatError = (error) => error == null
    ? "(Unspecified error)"
    : [error?.message ?? error, error?.stack].filter((s) => s).join("\n\n");
export const clone = (value) => value == null
    ? value
    : Array.isArray(value)
        ? value.map(clone)
        : typeof value === "object"
            ? Object.fromEntries(Object.entries(value).map(([key, value]) => [key, clone(value)]))
            : value;
export const equals = (lhs, rhs) => lhs === rhs ||
    (Array.isArray(lhs) || Array.isArray(rhs)
        ? Array.isArray(lhs) &&
            Array.isArray(rhs) &&
            lhs.length === rhs.length &&
            lhs.every((value, index) => equals(value, rhs[index]))
        : typeof lhs === "object" && typeof rhs === "object"
            ? objectsEqual(lhs, rhs)
            : false);
export const objectsEqual = (lhs, rhs) => {
    if (lhs === rhs || lhs == null || rhs == null)
        return lhs === rhs;
    const leftEntries = Object.entries(lhs);
    const rightEntries = Object.entries(rhs);
    return (leftEntries.length === rightEntries.length &&
        leftEntries.every(([key, value], index) => rightEntries[index][0] === key && equals(value, rightEntries[index][1])));
};
export const timer = (name) => {
    let elapsed = 0;
    let t0 = null;
    const timer = {
        start() {
            t0 ??= Date.now();
            return timer;
        },
        stop() {
            t0 != null && ((elapsed += Date.now() - t0), (t0 = null));
            return timer;
        },
        reset() {
            elapsed = 0;
            t0 !== null && (t0 = Date.now());
            return this;
        },
        print(milestone) {
            t0 !== null && ((elapsed += Date.now() - t0), (t0 = Date.now()));
            console.log(`${name}${milestone ? ` (${milestone})` : ""}: ${elapsed} ms.`);
            return timer;
        },
    };
    return timer;
};
//# sourceMappingURL=util.js.map
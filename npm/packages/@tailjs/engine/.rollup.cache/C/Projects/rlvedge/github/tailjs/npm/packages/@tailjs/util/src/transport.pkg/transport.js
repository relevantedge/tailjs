import msgpack from "@ygoe/msgpack";
const { deserialize, serialize } = msgpack;
import { from64u, lfsr, to64u } from ".";
import { hasValue, isArray, isDefined, isFunction, isIterable, isNumber, isObject, isString, isSymbol, isUndefined, map, tryCatch, } from "..";
const REF_PROP = "$ref";
const floatBuffer = new ArrayBuffer(8);
const floatView = new DataView(floatBuffer);
/**
 * Misc. fixes to the msgpack library. For example, it does not handle exponential numbers well.
 */
const patchSerialize = (value) => {
    let cleaners;
    let refs;
    let refIndex;
    const patchProperty = (value, key, val = value[key], patched = inner(val)) => ((val !== patched || isSymbol(key)) &&
        ((value[key] = patched), addCleaner(() => (value[key] = val))),
        val);
    const addCleaner = (cleaner) => (cleaners ??= []).push(cleaner);
    const inner = (value) => {
        if (value == null || isFunction(value) || isSymbol(value)) {
            return null;
        }
        if (Number.isFinite(value) && !Number.isSafeInteger(value)) {
            // A bug in @ygoe/msgpack means floats do not get encoded. We need to encode them in a different way.
            // This is how it landed, since data structure is highly unlikely to be encountered,
            // yet it is probably not the best way to do this (apart from fixing the bug ofc.)
            floatView.setFloat64(0, value, true);
            return { "": [...new Uint32Array(floatBuffer)] };
        }
        if (!isObject(value, true)) {
            return value;
        }
        if (value.toJSON && value !== (value = value.toJSON())) {
            return inner(value);
        }
        if (isDefined((refIndex = (refs ??= new Map()).get(value)))) {
            if (!value[REF_PROP]) {
                // Only assign ID parameter if used.
                value[REF_PROP] = refIndex;
                addCleaner(() => delete value[REF_PROP]);
            }
            return { [REF_PROP]: refIndex };
        }
        if (isObject(value)) {
            refs.set(value, refs.size + 1);
            Object.keys(value).forEach((k) => (isUndefined(patchProperty(value, k)) || isSymbol(k)) &&
                delete value[k]);
        }
        else if (isIterable(value)) {
            // Array with undefined values or iterable (which is made into array.). ([,1,2,3] does not reveal its first entry).
            (!isArray(value) || Object.keys(value).length < value.length
                ? [...value]
                : value).forEach((_, i) => i in value
                ? patchProperty(value, i)
                : ((value[i] = null), addCleaner(() => delete value[i])));
        }
        return value;
    };
    const serialized = serialize(inner(value));
    cleaners?.forEach((cleaner) => cleaner());
    return serialized;
};
const patchDeserialize = (value) => {
    let refs;
    let matchedRef;
    const inner = (value) => {
        if (!isObject(value, true))
            return value;
        if (isArray(value[""]) && (value = value[""]).length === 2) {
            return new DataView(new Uint32Array(value).buffer).getFloat64(0, true);
        }
        if (value[REF_PROP] && (matchedRef = (refs ??= [])[value[REF_PROP]])) {
            return matchedRef;
        }
        if (value[REF_PROP]) {
            refs[value[REF_PROP]] = value;
            delete value[REF_PROP];
        }
        Object.entries(value).forEach(([k, v]) => v !== (v = inner(v)) && (value[k] = v));
        return value;
    };
    return hasValue(value)
        ? tryCatch(() => inner(deserialize(value)), () => undefined)
        : undefined;
};
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lsfr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */
export const createTransport = (key, json = false) => {
    const [encrypt, decrypt, hash] = lfsr(key ?? "");
    const fastStringHash = (value, bitsOrNumeric) => {
        if (isNumber(value) && bitsOrNumeric === true)
            return value;
        value = isString(value)
            ? new Uint8Array(map(value.length, (i) => value.charCodeAt(i) & 255))
            : json
                ? JSON.stringify(value)
                : patchSerialize(value);
        return hash(value, bitsOrNumeric);
    };
    return json
        ? [
            (data) => JSON.stringify(data),
            (encoded) => encoded == null
                ? undefined
                : tryCatch(() => JSON.parse(encoded, undefined)),
            (value, numericOrBits) => fastStringHash(value, numericOrBits),
        ]
        : [
            (data) => to64u(encrypt(patchSerialize(data))),
            (encoded) => hasValue(encoded)
                ? patchDeserialize(decrypt(from64u(encoded)))
                : null,
            (value, numericOrBits) => fastStringHash(value, numericOrBits),
        ];
};
export const defaultTransport = createTransport();
export const [httpEncode, httpDecode, hash] = defaultTransport;
//# sourceMappingURL=transport.js.map
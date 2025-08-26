'use strict';

var util = require('@tailjs/util');
var msgpack = require('@ygoe/msgpack');

const codes = [];
const chars = [];
const charCode = (s, index = 0)=>s.charCodeAt(index);
const fromCharCodes = (chars)=>String.fromCharCode(...chars);
[
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
].forEach((p, i)=>codes[chars[i] = p.charCodeAt(0)] = i);
/**
 * Encodes an array of bytes to Base64URL without padding (URL safe Base64 using `-` and `_` instead of `+` and `/`).
 *
 * (thanks to Jon Leighton at https://gist.github.com/jonleighton/958841).
 */ const to64u = (bytes)=>{
    let i = 0;
    let chunk;
    const n = bytes.length;
    const base64 = [];
    while(i < n){
        chunk = bytes[i++] << 16 | bytes[i++] << 8 | bytes[i++];
        base64.push(chars[(chunk & 16515072) >> 18], chars[(chunk & 258048) >> 12], chars[(chunk & 4032) >> 6], chars[chunk & 63]);
    }
    base64.length += n - i;
    return fromCharCodes(base64);
};
/**
 * Decodes a BaseURL encoded string (without padding).
 */ const from64u = (encoded)=>{
    let i = 0;
    let j = 0;
    let p;
    const n = encoded.length;
    const bytes = new Uint8Array(3 * (n / 4 | 0) + (n + 3 & 3) % 3);
    while(i < n){
        bytes[j++] = codes[charCode(encoded, i++)] << 2 | (p = codes[charCode(encoded, i++)]) >> 4;
        if (i < n) {
            bytes[j++] = (p & 15) << 4 | (p = codes[charCode(encoded, i++)]) >> 2;
            if (i < n) {
                bytes[j++] = (p & 3) << 6 | codes[charCode(encoded, i++)];
            }
        }
    }
    return bytes;
};
/**
 * Decodes the specified UTF8 bytes to a string.
 *
 * [Thanks!](https://gist.github.com/Yaffle/5458286)
 */ const decodeUtf8 = (octets)=>{
    if (octets == null) return undefined;
    if (typeof octets === "string") return octets;
    const chars = [];
    let i = 0;
    while(i < octets.length){
        let octet = octets[i];
        let bytesNeeded = 0;
        let codePoint = 0;
        if (octet <= 0x7f) {
            bytesNeeded = 0;
            codePoint = octet & 0xff;
        } else if (octet <= 0xdf) {
            bytesNeeded = 1;
            codePoint = octet & 0x1f;
        } else if (octet <= 0xef) {
            bytesNeeded = 2;
            codePoint = octet & 0x0f;
        } else if (octet <= 0xf4) {
            bytesNeeded = 3;
            codePoint = octet & 0x07;
        }
        if (octets.length - i - bytesNeeded > 0) {
            var k = 0;
            while(k < bytesNeeded){
                octet = octets[i + k + 1];
                codePoint = codePoint << 6 | octet & 0x3f;
                k += 1;
            }
        } else {
            codePoint = 0xfffd;
            bytesNeeded = octets.length - i;
        }
        chars.push(codePoint);
        i += bytesNeeded + 1;
    }
    return String.fromCodePoint(...chars);
};

/** The number of leading entropy bytes. */ const ENTROPY = 4;
/** The padding length. Cipher texts will always be a multiple of this. */ const MAX_PADDING = 16;
const FNVs = {
    32: [
        0x811c9dc5n,
        0x01000193n
    ],
    64: [
        0xcbf29ce484222325n,
        0x100000001b3n
    ],
    128: [
        0x6c62272e07bb014262b821756295c58dn,
        0x1000000000000000000013bn
    ]
};
/** A random byte. */ const entropy = (max = 256)=>max * Math.random() | 0;
/**
 * Linear-feedback shift register encryption with leading entropy and fixed padding.
 *
 * Used for on-the-fly encryption. It is not the strongest encryption, yet it is annoyingly challenging to break.
 * Due to entropy the same text with the same key will result in a different cipher text every time.
 *
 *
 * "It is fast and small.", Bob said to Alice. "It is all right.", she replied.
 *
 * (Adapted from http://quinnftw.com/xor-ciphers/).
 */ const lfsr = (key)=>{
    /** Number of source bytes for (en/de)cryption. */ let n;
    /** Source byte index. */ let i;
    /** Target byte index. */ let j;
    /** Padding length. */ let pad;
    /** Holds the (en/de)crypted bytes. */ let target;
    /** Hash code. */ let hash = 0n;
    /** Bits for FNV-1a hash code. */ let bits = 0;
    /** Prime for FNV-1a hash code. */ let prime = 0n;
    /**
   * The sliding window with the past ciphers used to update for the mixer.
   * It works as a linear feedback shfit register to bolster against frequency analysis.
   *
   * http://quinnftw.com/xor-ciphers/.
   */ let window = [];
    /** The mixer used to iteratively update the key while (en/de)crypting. */ let mixer = 0;
    /** The mixer modulo 256. */ let mixer255 = 0;
    /** Current start of the mixer window. */ let iw = 0;
    /** Initial mixer. */ let mixer0 = 0;
    /** Initial bytes for the mixer. */ const window0 = [];
    for(iw = 0; iw < (key === null || key === void 0 ? void 0 : key.length); mixer0 += window0[iw] = key.charCodeAt(iw++));
    /** Resets the mixer when (en/de)cryption starts. */ const resetMixer = key ? ()=>{
        window = [
            ...window0
        ];
        mixer255 = (mixer = mixer0) & 255;
        iw = -1;
    } : ()=>{};
    /** Updates the mixer with the (en/de)crypted byte. */ const updateMixer = (c)=>(mixer255 = (mixer += // Subtract the byte leaving the window.
        -window[iw = (iw + 1) % window.length] + // Add the byte entering the window.
        (window[iw] = c)) & 255, c);
    return [
        // Encrypt
        key ? (source)=>{
            resetMixer();
            n = source.length;
            pad = MAX_PADDING - (n + ENTROPY) % MAX_PADDING;
            target = new Uint8Array(ENTROPY + n + pad);
            for(j = 0; j < ENTROPY - 1; target[j++] = updateMixer(entropy()));
            // Align last entropy byte to max padding and add padding.
            target[j++] = updateMixer(mixer255 ^ MAX_PADDING * entropy(256 / MAX_PADDING) + pad);
            for(i = 0; i < n; target[j++] = updateMixer(mixer255 ^ source[i++]));
            while(pad--)target[j++] = entropy();
            return target;
        } : (source)=>source,
        // Decrypt
        key ? (source)=>{
            resetMixer();
            for(i = 0; i < ENTROPY - 1; updateMixer(source[i++]));
            n = source.length - ENTROPY - // Padding. If padding is zero, all last PADDING characters are padding.
            ((mixer255 ^ updateMixer(source[i++])) % MAX_PADDING || MAX_PADDING);
            if (n <= 0) return new Uint8Array(0);
            target = new Uint8Array(n);
            for(j = 0; j < n; target[j++] = mixer255 ^ updateMixer(source[i++]));
            return target;
        } : (cipher)=>cipher,
        // FNV1a hash code.
        (source, numericOrBits = 64)=>{
            if (source == null) return null;
            bits = util.isBoolean(numericOrBits) ? 64 : numericOrBits;
            resetMixer();
            [hash, prime] = FNVs[bits];
            for(i = 0; i < source.length; hash = BigInt.asUintN(bits, (hash ^ BigInt(mixer255 ^ updateMixer(source[i++]))) * prime));
            return numericOrBits === true ? Number(BigInt(Number.MIN_SAFE_INTEGER) + hash % BigInt(Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER)) : hash.toString(36);
        }
    ];
};

const { deserialize: msgDeserialize, serialize: msgSerialize } = msgpack;
const REF_PROP = "$ref";
const includeValue = (key, value, includeDefaultValues)=>util.isSymbol(key) ? util.undefined : includeDefaultValues ? value !== util.undefined : value === null || value;
/**
 * Converts an in-memory object to a format that can be serialized over a wire including cyclic references.
 */ const serialize = (value, msgpack, { defaultValues = true, prettify = false })=>{
    let cleaners;
    let refs;
    let refIndex;
    const patchProperty = (target, key, value = target[key], patched = includeValue(key, value, defaultValues) ? inner(value) : util.undefined)=>(value !== patched && (patched === util.undefined && !util.isArray(target) ? delete target[key] : target[key] = patched, addCleaner(()=>target[key] = value)), patched);
    const addCleaner = (cleaner)=>(cleaners !== null && cleaners !== void 0 ? cleaners : cleaners = []).push(cleaner);
    const inner = (value)=>{
        if (value == null || util.isFunction(value) || util.isSymbol(value)) {
            return util.undefined;
        }
        if (!util.isObject(value)) {
            return value;
        }
        if (value.toJSON && value !== (value = value.toJSON())) {
            return inner(value);
        }
        if ((refIndex = refs === null || refs === void 0 ? void 0 : refs.get(value)) != null) {
            if (!value[REF_PROP]) {
                // Only assign ID parameter if used.
                value[REF_PROP] = refIndex;
                addCleaner(()=>delete value[REF_PROP]);
            }
            return {
                [REF_PROP]: refIndex
            };
        }
        if (util.isPlainObject(value)) {
            (refs !== null && refs !== void 0 ? refs : refs = new Map()).set(value, refs.size + 1);
            for(const key in value)patchProperty(value, key);
        } else if (util.isIterable(value) && !(value instanceof Uint8Array)) {
            // Array with undefined values or iterable (which is made into array.). ([,1,2,3] does not reveal its first entry).
            (!util.isArray(value) || Object.keys(value).length < value.length ? [
                ...value
            ] : value).forEach((_, i)=>i in value ? patchProperty(value, i) : (value[i] = null, addCleaner(()=>delete value[i])));
        }
        return value;
    };
    return util.tryCatch(()=>{
        var _inner;
        return msgpack ? msgSerialize((_inner = inner(value)) !== null && _inner !== void 0 ? _inner : null) : util.tryCatch(()=>JSON.stringify(value, util.undefined, prettify ? 2 : 0), ()=>JSON.stringify(inner(value), util.undefined, prettify ? 2 : 0));
    }, true, ()=>cleaners === null || cleaners === void 0 ? void 0 : cleaners.forEach((cleaner)=>cleaner()));
};
/**
 * Hydrates the format returned by {@link serialize} back to its original in-memory format.
 */ const deserialize = (value)=>{
    let refs;
    let matchedRef;
    const inner = (value)=>{
        if (!util.isObject(value)) return value;
        if (value[REF_PROP] && (matchedRef = (refs !== null && refs !== void 0 ? refs : refs = [])[value[REF_PROP]])) {
            return matchedRef;
        }
        if (value[REF_PROP]) {
            refs[value[REF_PROP]] = value;
            delete value[REF_PROP];
        }
        Object.entries(value).forEach(([k, v])=>v !== (v = inner(v)) && (value[k] = v));
        return value;
    };
    return inner(util.isString(value) ? util.tryCatch(()=>JSON.parse(value), ()=>(console.error(`Invalid JSON received.`, value, new Error().stack), util.undefined)) : value != null ? util.tryCatch(()=>!(value === null || value === void 0 ? void 0 : value.length) ? util.undefined : msgDeserialize(value), ()=>(console.error(`Invalid message received.`, value, new Error().stack), util.undefined)) : value);
};
let _defaultTransports;
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lfsr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */ const createTransport = (key, options = {})=>{
    const factory = (key, { json = false, decodeJson = false, ...serializeOptions })=>{
        const fastStringHash = (value, bitsOrNumeric)=>{
            if (util.isNumber(value) && bitsOrNumeric === true) return value;
            value = util.isString(value) ? new Uint8Array(util.map(value.length, (i)=>value.charCodeAt(i) & 255)) : json ? util.tryCatch(()=>JSON.stringify(value), ()=>JSON.stringify(serialize(value, false, serializeOptions))) : serialize(value, true, serializeOptions);
            return hash(value, bitsOrNumeric);
        };
        const jsonDecode = (encoded)=>encoded == null ? util.undefined : util.tryCatch(()=>deserialize(encoded), util.undefined);
        if (json) {
            return [
                (data)=>serialize(data, false, serializeOptions),
                jsonDecode,
                (value, numericOrBits)=>fastStringHash(value, numericOrBits)
            ];
        }
        const [encrypt, decrypt, hash] = lfsr(key);
        return [
            (data, binary)=>(binary ? util.IDENTITY : to64u)(encrypt(serialize(data, true, serializeOptions))),
            (encoded)=>encoded != null ? deserialize(decrypt(encoded instanceof Uint8Array ? encoded : decodeJson && util.isJsonString(encoded) ? jsonDecode(encoded) : from64u(encoded))) : null,
            (value, numericOrBits)=>fastStringHash(value, numericOrBits)
        ];
    };
    if (!key) {
        var _options_json;
        let json = +((_options_json = options.json) !== null && _options_json !== void 0 ? _options_json : 0);
        if (json && options.prettify !== false) {
            return (_defaultTransports !== null && _defaultTransports !== void 0 ? _defaultTransports : _defaultTransports = [
                factory(null, {
                    json: false
                }),
                factory(null, {
                    json: true,
                    prettify: true
                })
            ])[+json];
        }
    }
    return factory(key, options);
};
const defaultTransport = createTransport();
/** A transport that encrypts and decrypts messages, but also allows plain JSON message to be decoded.  */ const defaultJsonDecodeTransport = createTransport(null, {
    json: true,
    decodeJson: true
});
const defaultJsonTransport = createTransport(null, {
    json: true,
    prettify: true
});
const [httpEncode, httpDecode, hash] = defaultTransport;
const [jsonEncode, jsonDecode] = defaultJsonTransport;

exports.charCode = charCode;
exports.createTransport = createTransport;
exports.decodeUtf8 = decodeUtf8;
exports.defaultJsonDecodeTransport = defaultJsonDecodeTransport;
exports.defaultJsonTransport = defaultJsonTransport;
exports.defaultTransport = defaultTransport;
exports.from64u = from64u;
exports.fromCharCodes = fromCharCodes;
exports.hash = hash;
exports.httpDecode = httpDecode;
exports.httpEncode = httpEncode;
exports.jsonDecode = jsonDecode;
exports.jsonEncode = jsonEncode;
exports.lfsr = lfsr;
exports.to64u = to64u;

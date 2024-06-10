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

const throwError = (error, transform = (message)=>new Error(message))=>{
    throw isString(error = unwrap(error)) ? transform(error) : error;
};
const tryCatch = (expression, errorHandler = true, always)=>{
    try {
        return expression();
    } catch (e) {
        return isFunction(errorHandler) ? isError(e = errorHandler(e)) ? throwError(e) : e : isBoolean(errorHandler) ? console.error(errorHandler ? throwError(e) : e) : errorHandler;
    } finally{
        always?.();
    }
};

/** Minify friendly version of `false`. */ const undefined$1 = void 0;
/** Caching this value potentially speeds up tests rather than using `Number.MAX_SAFE_INTEGER`. */ const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** Minify friendly version of `null`. */ const nil = null;
/** The identity function (x)=>x. */ const IDENTITY = (item)=>item;
/** A function that filters out values != null. */ const FILTER_NULLISH = (item)=>item != nil;
/** Using this cached value speeds up testing if an object is iterable seemingly by an order of magnitude. */ const symbolIterator = Symbol.iterator;
const isBoolean = (value)=>typeof value === "boolean";
const isNumber = (value)=>typeof value === "number";
const isString = (value)=>typeof value === "string";
const isArray = Array.isArray;
const isError = (value)=>value instanceof Error;
/**
 * Returns the value as an array following these rules:
 * - If the value is undefined (this does not include `null`), so is the return value.
 * - If the value is already an array its original value is returned unless `clone` is true. In that case a copy of the value is returned.
 * - If the value is iterable, an array containing its values is returned
 * - Otherwise, an array with the value as its single item is returned.
 */ const array = (value, clone = false)=>value == null ? undefined$1 : !clone && isArray(value) ? value : isIterable(value) ? [
        ...value
    ] : // ? toArrayAsync(value)
    [
        value
    ];
const isObject = (value)=>value !== null && typeof value === "object";
const objectPrototype = Object.prototype;
const getPrototypeOf = Object.getPrototypeOf;
const isPlainObject = (value)=>value != null && getPrototypeOf(value) === objectPrototype;
const isSymbol = (value)=>typeof value === "symbol";
const isFunction = (value)=>typeof value === "function";
const isIterable = (value, acceptStrings = false)=>!!(value?.[symbolIterator] && (typeof value === "object" || acceptStrings));

let stopInvoked = false;
const wrapProjection = (projection)=>projection == null ? undefined$1 : isFunction(projection) ? projection : (item)=>item[projection];
function* createFilteringIterator(source, projection) {
    if (source == null) return;
    if (projection) {
        projection = wrapProjection(projection);
        let i = 0;
        for (let item of source){
            if ((item = projection(item, i++)) != null) {
                yield item;
            }
            if (stopInvoked) {
                stopInvoked = false;
                break;
            }
        }
    } else {
        for (let item of source){
            if (item != null) yield item;
        }
    }
}
function* createObjectIterator(source, action) {
    action = wrapProjection(action);
    let i = 0;
    for(const key in source){
        let value = [
            key,
            source[key]
        ];
        action && (value = action(value, i++));
        if (value != null) {
            yield value;
        }
        if (stopInvoked) {
            stopInvoked = false;
            break;
        }
    }
}
function* createRangeIterator(length = 0, offset) {
    if (length < 0) {
        offset ??= -length - 1;
        while(length++)yield offset--;
    } else {
        offset ??= 0;
        while(length--)yield offset++;
    }
}
function* createNavigatingIterator(step, start, maxIterations = Number.MAX_SAFE_INTEGER) {
    if (start != null) yield start;
    while(maxIterations-- && (start = step(start)) != null){
        yield start;
    }
}
const sliceAction = (action, start, end)=>(start ?? end) !== undefined$1 ? (action = wrapProjection(action), start ??= 0, end ??= MAX_SAFE_INTEGER, (value, index)=>start-- ? undefined$1 : end-- ? action ? action(value, index) : value : end) : action;
/** Faster way to exclude null'ish elements from an array than using {@link filter} or {@link map} */ const filterArray = (array)=>array?.filter(FILTER_NULLISH);
const createIterator = (source, projection, start, end)=>source == null ? [] : !projection && isArray(source) ? filterArray(source) : source[symbolIterator] ? createFilteringIterator(source, start === undefined$1 ? projection : sliceAction(projection, start, end)) : isObject(source) ? createObjectIterator(source, sliceAction(projection, start, end)) : createIterator(isFunction(source) ? createNavigatingIterator(source, start, end) : createRangeIterator(source, start), projection);
const project = (source, projection, start, end)=>createIterator(source, projection, start, end);
const map = (source, projection, start, end)=>{
    projection = wrapProjection(projection);
    if (isArray(source)) {
        let i = 0;
        const mapped = [];
        start = start < 0 ? source.length + start : start ?? 0;
        end = end < 0 ? source.length + end : end ?? source.length;
        for(; start < end && !stopInvoked; start++){
            let value = source[start];
            if ((projection ? value = projection(value, i++) : value) != null) {
                mapped.push(value);
            }
        }
        stopInvoked = false;
        return mapped;
    }
    return source != null ? array(project(source, projection, start, end)) : undefined$1;
};

const unwrap = (value)=>isFunction(value) ? value() : value;

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
    for(iw = 0; iw < key?.length; mixer0 += window0[iw] = key.charCodeAt(iw++));
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
            n = source.length - ENTROPY - // Padding. If padding is zero it all last PADDING characters are padding.
            ((mixer255 ^ updateMixer(source[i++])) % MAX_PADDING || MAX_PADDING);
            if (n <= 0) return new Uint8Array(0);
            target = new Uint8Array(n);
            for(j = 0; j < n; target[j++] = mixer255 ^ updateMixer(source[i++]));
            return target;
        } : (cipher)=>cipher,
        // FNV1a hash code.
        (source, numericOrBits = 64)=>{
            if (source == null) return null;
            bits = isBoolean(numericOrBits) ? 64 : numericOrBits;
            resetMixer();
            [hash, prime] = FNVs[bits];
            for(i = 0; i < source.length; hash = BigInt.asUintN(bits, (hash ^ BigInt(mixer255 ^ updateMixer(source[i++]))) * prime));
            return numericOrBits === true ? Number(BigInt(Number.MIN_SAFE_INTEGER) + hash % BigInt(Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER)) : hash.toString(36);
        }
    ];
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var msgpack$1 = {exports: {}};

(function (module) {
	(function () {

		// Serializes a value to a MessagePack byte array.
		//
		// data: The value to serialize. This can be a scalar, array or object.
		// options: An object that defines additional options.
		// - multiple: (boolean) Indicates whether multiple values in data are concatenated to multiple MessagePack arrays. Default: false.
		// - invalidTypeReplacement:
		//   (any) The value that is used to replace values of unsupported types.
		//   (function) A function that returns such a value, given the original value as parameter.
		function serialize(data, options) {
			if (options && options.multiple && !Array.isArray(data)) {
				throw new Error("Invalid argument type: Expected an Array to serialize multiple values.");
			}
			const pow32 = 0x100000000;   // 2^32
			let floatBuffer, floatView;
			let array = new Uint8Array(128);
			let length = 0;
			if (options && options.multiple) {
				for (let i = 0; i < data.length; i++) {
					append(data[i]);
				}
			}
			else {
				append(data);
			}
			return array.subarray(0, length);

			function append(data, isReplacement) {
				switch (typeof data) {
					case "undefined":
						appendNull();
						break;
					case "boolean":
						appendBoolean(data);
						break;
					case "number":
						appendNumber(data);
						break;
					case "string":
						appendString(data);
						break;
					case "object":
						if (data === null)
							appendNull();
						else if (data instanceof Date)
							appendDate(data);
						else if (Array.isArray(data))
							appendArray(data);
						else if (data instanceof Uint8Array || data instanceof Uint8ClampedArray)
							appendBinArray(data);
						else if (data instanceof Int8Array || data instanceof Int16Array || data instanceof Uint16Array ||
							data instanceof Int32Array || data instanceof Uint32Array ||
							data instanceof Float32Array || data instanceof Float64Array)
							appendArray(data);
						else
							appendObject(data);
						break;
					default:
						if (!isReplacement && options && options.invalidTypeReplacement) {
							if (typeof options.invalidTypeReplacement === "function")
								append(options.invalidTypeReplacement(data), true);
							else
								append(options.invalidTypeReplacement, true);
						}
						else {
							throw new Error("Invalid argument type: The type '" + (typeof data) + "' cannot be serialized.");
						}
				}
			}

			function appendNull(data) {
				appendByte(0xc0);
			}

			function appendBoolean(data) {
				appendByte(data ? 0xc3 : 0xc2);
			}

			function appendNumber(data) {
				if (isFinite(data) && Number.isSafeInteger(data)) {
					// Integer
					if (data >= 0 && data <= 0x7f) {
						appendByte(data);
					}
					else if (data < 0 && data >= -0x20) {
						appendByte(data);
					}
					else if (data > 0 && data <= 0xff) {   // uint8
						appendBytes([0xcc, data]);
					}
					else if (data >= -0x80 && data <= 0x7f) {   // int8
						appendBytes([0xd0, data]);
					}
					else if (data > 0 && data <= 0xffff) {   // uint16
						appendBytes([0xcd, data >>> 8, data]);
					}
					else if (data >= -0x8000 && data <= 0x7fff) {   // int16
						appendBytes([0xd1, data >>> 8, data]);
					}
					else if (data > 0 && data <= 0xffffffff) {   // uint32
						appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data]);
					}
					else if (data >= -0x80000000 && data <= 0x7fffffff) {   // int32
						appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data]);
					}
					else if (data > 0 && data <= 0xffffffffffffffff) {   // uint64
						// Split 64 bit number into two 32 bit numbers because JavaScript only regards
						// 32 bits for bitwise operations.
						let hi = data / pow32;
						let lo = data % pow32;
						appendBytes([0xd3, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
					}
					else if (data >= -0x8000000000000000 && data <= 0x7fffffffffffffff) {   // int64
						appendByte(0xd3);
						appendInt64(data);
					}
					else if (data < 0) {   // below int64
						appendBytes([0xd3, 0x80, 0, 0, 0, 0, 0, 0, 0]);
					}
					else {   // above uint64
						appendBytes([0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
					}
				}
				else {
					// Float
					if (!floatView) {
						floatBuffer = new ArrayBuffer(8);
						floatView = new DataView(floatBuffer);
					}
					floatView.setFloat64(0, data);
					appendByte(0xcb);
					appendBytes(new Uint8Array(floatBuffer));
				}
			}

			function appendString(data) {
				let bytes = encodeUtf8(data);
				let length = bytes.length;

				if (length <= 0x1f)
					appendByte(0xa0 + length);
				else if (length <= 0xff)
					appendBytes([0xd9, length]);
				else if (length <= 0xffff)
					appendBytes([0xda, length >>> 8, length]);
				else
					appendBytes([0xdb, length >>> 24, length >>> 16, length >>> 8, length]);

				appendBytes(bytes);
			}

			function appendArray(data) {
				let length = data.length;

				if (length <= 0xf)
					appendByte(0x90 + length);
				else if (length <= 0xffff)
					appendBytes([0xdc, length >>> 8, length]);
				else
					appendBytes([0xdd, length >>> 24, length >>> 16, length >>> 8, length]);

				for (let index = 0; index < length; index++) {
					append(data[index]);
				}
			}

			function appendBinArray(data) {
				let length = data.length;

				if (length <= 0xff)
					appendBytes([0xc4, length]);
				else if (length <= 0xffff)
					appendBytes([0xc5, length >>> 8, length]);
				else
					appendBytes([0xc6, length >>> 24, length >>> 16, length >>> 8, length]);

				appendBytes(data);
			}

			function appendObject(data) {
				let length = 0;
				for (let key in data) {
					if (data[key] !== undefined) {
						length++;
					}
				}

				if (length <= 0xf)
					appendByte(0x80 + length);
				else if (length <= 0xffff)
					appendBytes([0xde, length >>> 8, length]);
				else
					appendBytes([0xdf, length >>> 24, length >>> 16, length >>> 8, length]);

				for (let key in data) {
					let value = data[key];
					if (value !== undefined) {
						append(key);
						append(value);
					}
				}
			}

			function appendDate(data) {
				let sec = data.getTime() / 1000;
				if (data.getMilliseconds() === 0 && sec >= 0 && sec < 0x100000000) {   // 32 bit seconds
					appendBytes([0xd6, 0xff, sec >>> 24, sec >>> 16, sec >>> 8, sec]);
				}
				else if (sec >= 0 && sec < 0x400000000) {   // 30 bit nanoseconds, 34 bit seconds
					let ns = data.getMilliseconds() * 1000000;
					appendBytes([0xd7, 0xff, ns >>> 22, ns >>> 14, ns >>> 6, ((ns << 2) >>> 0) | (sec / pow32), sec >>> 24, sec >>> 16, sec >>> 8, sec]);
				}
				else {   // 32 bit nanoseconds, 64 bit seconds, negative values allowed
					let ns = data.getMilliseconds() * 1000000;
					appendBytes([0xc7, 12, 0xff, ns >>> 24, ns >>> 16, ns >>> 8, ns]);
					appendInt64(sec);
				}
			}

			function appendByte(byte) {
				if (array.length < length + 1) {
					let newLength = array.length * 2;
					while (newLength < length + 1)
						newLength *= 2;
					let newArray = new Uint8Array(newLength);
					newArray.set(array);
					array = newArray;
				}
				array[length] = byte;
				length++;
			}

			function appendBytes(bytes) {
				if (array.length < length + bytes.length) {
					let newLength = array.length * 2;
					while (newLength < length + bytes.length)
						newLength *= 2;
					let newArray = new Uint8Array(newLength);
					newArray.set(array);
					array = newArray;
				}
				array.set(bytes, length);
				length += bytes.length;
			}

			function appendInt64(value) {
				// Split 64 bit number into two 32 bit numbers because JavaScript only regards 32 bits for
				// bitwise operations.
				let hi, lo;
				if (value >= 0) {
					// Same as uint64
					hi = value / pow32;
					lo = value % pow32;
				}
				else {
					// Split absolute value to high and low, then NOT and ADD(1) to restore negativity
					value++;
					hi = Math.abs(value) / pow32;
					lo = Math.abs(value) % pow32;
					hi = ~hi;
					lo = ~lo;
				}
				appendBytes([hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
			}
		}

		// Deserializes a MessagePack byte array to a value.
		//
		// array: The MessagePack byte array to deserialize. This must be an Array or Uint8Array containing bytes, not a string.
		// options: An object that defines additional options.
		// - multiple: (boolean) Indicates whether multiple concatenated MessagePack arrays are returned as an array. Default: false.
		function deserialize(array, options) {
			const pow32 = 0x100000000;   // 2^32
			let pos = 0;
			if (array instanceof ArrayBuffer) {
				array = new Uint8Array(array);
			}
			if (typeof array !== "object" || typeof array.length === "undefined") {
				throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");
			}
			if (!array.length) {
				throw new Error("Invalid argument: The byte array to deserialize is empty.");
			}
			if (!(array instanceof Uint8Array)) {
				array = new Uint8Array(array);
			}
			let data;
			if (options && options.multiple) {
				// Read as many messages as are available
				data = [];
				while (pos < array.length) {
					data.push(read());
				}
			}
			else {
				// Read only one message and ignore additional data
				data = read();
			}
			return data;

			function read() {
				const byte = array[pos++];
				if (byte >= 0x00 && byte <= 0x7f) return byte;   // positive fixint
				if (byte >= 0x80 && byte <= 0x8f) return readMap(byte - 0x80);   // fixmap
				if (byte >= 0x90 && byte <= 0x9f) return readArray(byte - 0x90);   // fixarray
				if (byte >= 0xa0 && byte <= 0xbf) return readStr(byte - 0xa0);   // fixstr
				if (byte === 0xc0) return null;   // nil
				if (byte === 0xc1) throw new Error("Invalid byte code 0xc1 found.");   // never used
				if (byte === 0xc2) return false;   // false
				if (byte === 0xc3) return true;   // true
				if (byte === 0xc4) return readBin(-1, 1);   // bin 8
				if (byte === 0xc5) return readBin(-1, 2);   // bin 16
				if (byte === 0xc6) return readBin(-1, 4);   // bin 32
				if (byte === 0xc7) return readExt(-1, 1);   // ext 8
				if (byte === 0xc8) return readExt(-1, 2);   // ext 16
				if (byte === 0xc9) return readExt(-1, 4);   // ext 32
				if (byte === 0xca) return readFloat(4);   // float 32
				if (byte === 0xcb) return readFloat(8);   // float 64
				if (byte === 0xcc) return readUInt(1);   // uint 8
				if (byte === 0xcd) return readUInt(2);   // uint 16
				if (byte === 0xce) return readUInt(4);   // uint 32
				if (byte === 0xcf) return readUInt(8);   // uint 64
				if (byte === 0xd0) return readInt(1);   // int 8
				if (byte === 0xd1) return readInt(2);   // int 16
				if (byte === 0xd2) return readInt(4);   // int 32
				if (byte === 0xd3) return readInt(8);   // int 64
				if (byte === 0xd4) return readExt(1);   // fixext 1
				if (byte === 0xd5) return readExt(2);   // fixext 2
				if (byte === 0xd6) return readExt(4);   // fixext 4
				if (byte === 0xd7) return readExt(8);   // fixext 8
				if (byte === 0xd8) return readExt(16);   // fixext 16
				if (byte === 0xd9) return readStr(-1, 1);   // str 8
				if (byte === 0xda) return readStr(-1, 2);   // str 16
				if (byte === 0xdb) return readStr(-1, 4);   // str 32
				if (byte === 0xdc) return readArray(-1, 2);   // array 16
				if (byte === 0xdd) return readArray(-1, 4);   // array 32
				if (byte === 0xde) return readMap(-1, 2);   // map 16
				if (byte === 0xdf) return readMap(-1, 4);   // map 32
				if (byte >= 0xe0 && byte <= 0xff) return byte - 256;   // negative fixint
				console.debug("msgpack array:", array);
				throw new Error("Invalid byte value '" + byte + "' at index " + (pos - 1) + " in the MessagePack binary data (length " + array.length + "): Expecting a range of 0 to 255. This is not a byte array.");
			}

			function readInt(size) {
				let value = 0;
				let first = true;
				while (size-- > 0) {
					if (first) {
						let byte = array[pos++];
						value += byte & 0x7f;
						if (byte & 0x80) {
							value -= 0x80;   // Treat most-significant bit as -2^i instead of 2^i
						}
						first = false;
					}
					else {
						value *= 256;
						value += array[pos++];
					}
				}
				return value;
			}

			function readUInt(size) {
				let value = 0;
				while (size-- > 0) {
					value *= 256;
					value += array[pos++];
				}
				return value;
			}

			function readFloat(size) {
				let view = new DataView(array.buffer, pos + array.byteOffset, size);
				pos += size;
				if (size === 4)
					return view.getFloat32(0, false);
				if (size === 8)
					return view.getFloat64(0, false);
			}

			function readBin(size, lengthSize) {
				if (size < 0) size = readUInt(lengthSize);
				let data = array.subarray(pos, pos + size);
				pos += size;
				return data;
			}

			function readMap(size, lengthSize) {
				if (size < 0) size = readUInt(lengthSize);
				let data = {};
				while (size-- > 0) {
					let key = read();
					data[key] = read();
				}
				return data;
			}

			function readArray(size, lengthSize) {
				if (size < 0) size = readUInt(lengthSize);
				let data = [];
				while (size-- > 0) {
					data.push(read());
				}
				return data;
			}

			function readStr(size, lengthSize) {
				if (size < 0) size = readUInt(lengthSize);
				let start = pos;
				pos += size;
				return decodeUtf8(array, start, size);
			}

			function readExt(size, lengthSize) {
				if (size < 0) size = readUInt(lengthSize);
				let type = readUInt(1);
				let data = readBin(size);
				switch (type) {
					case 255:
						return readExtDate(data);
				}
				return { type: type, data: data };
			}

			function readExtDate(data) {
				if (data.length === 4) {
					let sec = ((data[0] << 24) >>> 0) +
						((data[1] << 16) >>> 0) +
						((data[2] << 8) >>> 0) +
						data[3];
					return new Date(sec * 1000);
				}
				if (data.length === 8) {
					let ns = ((data[0] << 22) >>> 0) +
						((data[1] << 14) >>> 0) +
						((data[2] << 6) >>> 0) +
						(data[3] >>> 2);
					let sec = ((data[3] & 0x3) * pow32) +
						((data[4] << 24) >>> 0) +
						((data[5] << 16) >>> 0) +
						((data[6] << 8) >>> 0) +
						data[7];
					return new Date(sec * 1000 + ns / 1000000);
				}
				if (data.length === 12) {
					let ns = ((data[0] << 24) >>> 0) +
						((data[1] << 16) >>> 0) +
						((data[2] << 8) >>> 0) +
						data[3];
					pos -= 8;
					let sec = readInt(8);
					return new Date(sec * 1000 + ns / 1000000);
				}
				throw new Error("Invalid data length for a date value.");
			}
		}

		// Encodes a string to UTF-8 bytes.
		function encodeUtf8(str) {
			// Prevent excessive array allocation and slicing for all 7-bit characters
			let ascii = true, length = str.length;
			for (let x = 0; x < length; x++) {
				if (str.charCodeAt(x) > 127) {
					ascii = false;
					break;
				}
			}

			// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
			let i = 0, bytes = new Uint8Array(str.length * (ascii ? 1 : 4));
			for (let ci = 0; ci !== length; ci++) {
				let c = str.charCodeAt(ci);
				if (c < 128) {
					bytes[i++] = c;
					continue;
				}
				if (c < 2048) {
					bytes[i++] = c >> 6 | 192;
				}
				else {
					if (c > 0xd7ff && c < 0xdc00) {
						if (++ci >= length)
							throw new Error("UTF-8 encode: incomplete surrogate pair");
						let c2 = str.charCodeAt(ci);
						if (c2 < 0xdc00 || c2 > 0xdfff)
							throw new Error("UTF-8 encode: second surrogate character 0x" + c2.toString(16) + " at index " + ci + " out of range");
						c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
						bytes[i++] = c >> 18 | 240;
						bytes[i++] = c >> 12 & 63 | 128;
					}
					else bytes[i++] = c >> 12 | 224;
					bytes[i++] = c >> 6 & 63 | 128;
				}
				bytes[i++] = c & 63 | 128;
			}
			return ascii ? bytes : bytes.subarray(0, i);
		}

		// Decodes a string from UTF-8 bytes.
		function decodeUtf8(bytes, start, length) {
			// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
			let i = start, str = "";
			length += start;
			while (i < length) {
				let c = bytes[i++];
				if (c > 127) {
					if (c > 191 && c < 224) {
						if (i >= length)
							throw new Error("UTF-8 decode: incomplete 2-byte sequence");
						c = (c & 31) << 6 | bytes[i++] & 63;
					}
					else if (c > 223 && c < 240) {
						if (i + 1 >= length)
							throw new Error("UTF-8 decode: incomplete 3-byte sequence");
						c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
					}
					else if (c > 239 && c < 248) {
						if (i + 2 >= length)
							throw new Error("UTF-8 decode: incomplete 4-byte sequence");
						c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
					}
					else throw new Error("UTF-8 decode: unknown multibyte start 0x" + c.toString(16) + " at index " + (i - 1));
				}
				if (c <= 0xffff) str += String.fromCharCode(c);
				else if (c <= 0x10ffff) {
					c -= 0x10000;
					str += String.fromCharCode(c >> 10 | 0xd800);
					str += String.fromCharCode(c & 0x3FF | 0xdc00);
				}
				else throw new Error("UTF-8 decode: code point 0x" + c.toString(16) + " exceeds UTF-16 reach");
			}
			return str;
		}

		// The exported functions
		let msgpack = {
			serialize: serialize,
			deserialize: deserialize,

			// Compatibility with other libraries
			encode: serialize,
			decode: deserialize
		};

		// Environment detection
		if (module && 'object' === "object") {
			// Node.js
			module.exports = msgpack;
		}
		else {
			// Global object
			window[window.msgpackJsName || "msgpack"] = msgpack;
		}

	})(); 
} (msgpack$1));

var msgpackExports = msgpack$1.exports;
var msgpack = /*@__PURE__*/getDefaultExportFromCjs(msgpackExports);

const { deserialize: msgDeserialize, serialize: msgSerialize } = msgpack;
const REF_PROP = "$ref";
const includeValue = (key, value, includeDefaultValues)=>isSymbol(key) ? undefined$1 : includeDefaultValues ? value !== undefined$1 : value === null || value;
/**
 * Converts an in-memory object to a format that can be serialized over a wire including cyclic references.
 */ const serialize = (value, msgpack, { defaultValues = true, prettify = false })=>{
    // TODO: Clone when required instead of adding "cleaners". Probably adds more overhead.
    let cleaners;
    let refs;
    let refIndex;
    const patchProperty = (target, key, value = target[key], patched = includeValue(key, value, defaultValues) ? inner(value) : undefined$1)=>(value !== patched && (patched === undefined$1 && !isArray(target) ? delete target[key] : target[key] = patched, addCleaner(()=>target[key] = value)), patched);
    const addCleaner = (cleaner)=>(cleaners ??= []).push(cleaner);
    const inner = (value)=>{
        if (value == null || isFunction(value) || isSymbol(value)) {
            return undefined$1;
        }
        if (!isObject(value)) {
            return value;
        }
        if (value.toJSON && value !== (value = value.toJSON())) {
            return inner(value);
        }
        if ((refIndex = refs?.get(value)) != null) {
            if (!value[REF_PROP]) {
                // Only assign ID parameter if used.
                value[REF_PROP] = refIndex;
                addCleaner(()=>delete value[REF_PROP]);
            }
            return {
                [REF_PROP]: refIndex
            };
        }
        if (isPlainObject(value)) {
            (refs ??= new Map()).set(value, refs.size + 1);
            for(const key in value)patchProperty(value, key);
        } else if (isIterable(value) && !(value instanceof Uint8Array)) {
            // Array with undefined values or iterable (which is made into array.). ([,1,2,3] does not reveal its first entry).
            (!isArray(value) || Object.keys(value).length < value.length ? [
                ...value
            ] : value).forEach((_, i)=>i in value ? patchProperty(value, i) : (value[i] = null, addCleaner(()=>delete value[i])));
        }
        return value;
    };
    return tryCatch(()=>msgpack ? msgSerialize(inner(value) ?? null) : tryCatch(()=>JSON.stringify(value, undefined$1, prettify ? 2 : 0), ()=>JSON.stringify(inner(value), undefined$1, prettify ? 2 : 0)), true, ()=>cleaners?.forEach((cleaner)=>cleaner()));
};
/**
 * Hydrates the format returned by {@link serialize} back to its original in-memory format.
 */ const deserialize = (value)=>{
    let refs;
    let matchedRef;
    const inner = (value)=>{
        if (!isObject(value)) return value;
        if (value[REF_PROP] && (matchedRef = (refs ??= [])[value[REF_PROP]])) {
            return matchedRef;
        }
        if (value[REF_PROP]) {
            refs[value[REF_PROP]] = value;
            delete value[REF_PROP];
        }
        Object.entries(value).forEach(([k, v])=>v !== (v = inner(v)) && (value[k] = v));
        return value;
    };
    return inner(isString(value) ? JSON.parse(value) : value != null ? tryCatch(()=>msgDeserialize(value), ()=>(console.error(`Invalid message received.`, value), undefined$1)) : value);
};
let _defaultTransports;
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lfsr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */ const createTransport = (key, options = {})=>{
    const factory = (key, { json = false, ...serializeOptions })=>{
        const fastStringHash = (value, bitsOrNumeric)=>{
            if (isNumber(value) && bitsOrNumeric === true) return value;
            value = isString(value) ? new Uint8Array(map(value.length, (i)=>value.charCodeAt(i) & 255)) : json ? tryCatch(()=>JSON.stringify(value), ()=>JSON.stringify(serialize(value, false, serializeOptions))) : serialize(value, true, serializeOptions);
            return hash(value, bitsOrNumeric);
        };
        const jsonDecode = (encoded)=>encoded == null ? undefined$1 : tryCatch(()=>deserialize(encoded), undefined$1);
        if (json) {
            return [
                (data)=>serialize(data, false, serializeOptions),
                jsonDecode,
                (value, numericOrBits)=>fastStringHash(value, numericOrBits)
            ];
        }
        const [encrypt, decrypt, hash] = lfsr(key);
        return [
            (data, binary)=>(binary ? IDENTITY : to64u)(encrypt(serialize(data, true, serializeOptions))),
            (encoded)=>encoded != null ? deserialize(decrypt(encoded instanceof Uint8Array ? encoded : from64u(encoded))) : null,
            (value, numericOrBits)=>fastStringHash(value, numericOrBits)
        ];
    };
    if (!key) {
        let json = +(options.json ?? 0);
        if (json && options.prettify !== false) {
            return (_defaultTransports ??= [
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
const defaultJsonTransport = createTransport(null, {
    json: true,
    prettify: true
});
const [httpEncode, httpDecode, hash] = defaultTransport;
const [jsonEncode, jsonDecode] = defaultJsonTransport;

export { charCode, createTransport, decodeUtf8, defaultJsonTransport, defaultTransport, from64u, fromCharCodes, hash, httpDecode, httpEncode, jsonDecode, jsonEncode, lfsr, to64u };

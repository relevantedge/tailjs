var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var buffer$1 = {};

var base64Js = {};

base64Js.byteLength = byteLength;
base64Js.toByteArray = toByteArray;
base64Js.fromByteArray = fromByteArray;

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens (b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4);

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

  var curByte = 0;

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen;

  var i;
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = (tmp >> 16) & 0xFF;
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    );
  }

  return parts.join('')
}

var ieee754 = {};

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
};

ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

(function (exports) {

	const base64 = base64Js;
	const ieee754$1 = ieee754;
	const customInspectSymbol =
	  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
	    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
	    : null;

	exports.Buffer = Buffer;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;

	const K_MAX_LENGTH = 0x7fffffff;
	exports.kMaxLength = K_MAX_LENGTH;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
	 *               implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * We report that the browser does not support typed arrays if the are not subclassable
	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	 * for __proto__ and has a buggy typed array implementation.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
	    typeof console.error === 'function') {
	  console.error(
	    'This browser lacks typed array (Uint8Array) support which is required by ' +
	    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
	  );
	}

	function typedArraySupport () {
	  // Can typed array instances can be augmented?
	  try {
	    const arr = new Uint8Array(1);
	    const proto = { foo: function () { return 42 } };
	    Object.setPrototypeOf(proto, Uint8Array.prototype);
	    Object.setPrototypeOf(arr, proto);
	    return arr.foo() === 42
	  } catch (e) {
	    return false
	  }
	}

	Object.defineProperty(Buffer.prototype, 'parent', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.buffer
	  }
	});

	Object.defineProperty(Buffer.prototype, 'offset', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.byteOffset
	  }
	});

	function createBuffer (length) {
	  if (length > K_MAX_LENGTH) {
	    throw new RangeError('The value "' + length + '" is invalid for option "size"')
	  }
	  // Return an augmented `Uint8Array` instance
	  const buf = new Uint8Array(length);
	  Object.setPrototypeOf(buf, Buffer.prototype);
	  return buf
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new TypeError(
	        'The "string" argument must be of type string. Received type number'
	      )
	    }
	    return allocUnsafe(arg)
	  }
	  return from(arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192; // not used by this implementation

	function from (value, encodingOrOffset, length) {
	  if (typeof value === 'string') {
	    return fromString(value, encodingOrOffset)
	  }

	  if (ArrayBuffer.isView(value)) {
	    return fromArrayView(value)
	  }

	  if (value == null) {
	    throw new TypeError(
	      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	      'or Array-like Object. Received type ' + (typeof value)
	    )
	  }

	  if (isInstance(value, ArrayBuffer) ||
	      (value && isInstance(value.buffer, ArrayBuffer))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof SharedArrayBuffer !== 'undefined' &&
	      (isInstance(value, SharedArrayBuffer) ||
	      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof value === 'number') {
	    throw new TypeError(
	      'The "value" argument must not be of type number. Received type number'
	    )
	  }

	  const valueOf = value.valueOf && value.valueOf();
	  if (valueOf != null && valueOf !== value) {
	    return Buffer.from(valueOf, encodingOrOffset, length)
	  }

	  const b = fromObject(value);
	  if (b) return b

	  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
	      typeof value[Symbol.toPrimitive] === 'function') {
	    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
	  }

	  throw new TypeError(
	    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	    'or Array-like Object. Received type ' + (typeof value)
	  )
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(value, encodingOrOffset, length)
	};

	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
	// https://github.com/feross/buffer/pull/148
	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
	Object.setPrototypeOf(Buffer, Uint8Array);

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be of type number')
	  } else if (size < 0) {
	    throw new RangeError('The value "' + size + '" is invalid for option "size"')
	  }
	}

	function alloc (size, fill, encoding) {
	  assertSize(size);
	  if (size <= 0) {
	    return createBuffer(size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpreted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(size).fill(fill, encoding)
	      : createBuffer(size).fill(fill)
	  }
	  return createBuffer(size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(size, fill, encoding)
	};

	function allocUnsafe (size) {
	  assertSize(size);
	  return createBuffer(size < 0 ? 0 : checked(size) | 0)
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(size)
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(size)
	};

	function fromString (string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8';
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('Unknown encoding: ' + encoding)
	  }

	  const length = byteLength(string, encoding) | 0;
	  let buf = createBuffer(length);

	  const actual = buf.write(string, encoding);

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    buf = buf.slice(0, actual);
	  }

	  return buf
	}

	function fromArrayLike (array) {
	  const length = array.length < 0 ? 0 : checked(array.length) | 0;
	  const buf = createBuffer(length);
	  for (let i = 0; i < length; i += 1) {
	    buf[i] = array[i] & 255;
	  }
	  return buf
	}

	function fromArrayView (arrayView) {
	  if (isInstance(arrayView, Uint8Array)) {
	    const copy = new Uint8Array(arrayView);
	    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
	  }
	  return fromArrayLike(arrayView)
	}

	function fromArrayBuffer (array, byteOffset, length) {
	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('"offset" is outside of buffer bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('"length" is outside of buffer bounds')
	  }

	  let buf;
	  if (byteOffset === undefined && length === undefined) {
	    buf = new Uint8Array(array);
	  } else if (length === undefined) {
	    buf = new Uint8Array(array, byteOffset);
	  } else {
	    buf = new Uint8Array(array, byteOffset, length);
	  }

	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(buf, Buffer.prototype);

	  return buf
	}

	function fromObject (obj) {
	  if (Buffer.isBuffer(obj)) {
	    const len = checked(obj.length) | 0;
	    const buf = createBuffer(len);

	    if (buf.length === 0) {
	      return buf
	    }

	    obj.copy(buf, 0, 0, len);
	    return buf
	  }

	  if (obj.length !== undefined) {
	    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
	      return createBuffer(0)
	    }
	    return fromArrayLike(obj)
	  }

	  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
	    return fromArrayLike(obj.data)
	  }
	}

	function checked (length) {
	  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= K_MAX_LENGTH) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0;
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return b != null && b._isBuffer === true &&
	    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
	};

	Buffer.compare = function compare (a, b) {
	  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
	  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError(
	      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
	    )
	  }

	  if (a === b) return 0

	  let x = a.length;
	  let y = b.length;

	  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	};

	Buffer.concat = function concat (list, length) {
	  if (!Array.isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  let i;
	  if (length === undefined) {
	    length = 0;
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length;
	    }
	  }

	  const buffer = Buffer.allocUnsafe(length);
	  let pos = 0;
	  for (i = 0; i < list.length; ++i) {
	    let buf = list[i];
	    if (isInstance(buf, Uint8Array)) {
	      if (pos + buf.length > buffer.length) {
	        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
	        buf.copy(buffer, pos);
	      } else {
	        Uint8Array.prototype.set.call(
	          buffer,
	          buf,
	          pos
	        );
	      }
	    } else if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    } else {
	      buf.copy(buffer, pos);
	    }
	    pos += buf.length;
	  }
	  return buffer
	};

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    throw new TypeError(
	      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
	      'Received type ' + typeof string
	    )
	  }

	  const len = string.length;
	  const mustMatch = (arguments.length > 2 && arguments[2] === true);
	  if (!mustMatch && len === 0) return 0

	  // Use a for loop to avoid recursion
	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) {
	          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
	        }
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	}
	Buffer.byteLength = byteLength;

	function slowToString (encoding, start, end) {
	  let loweredCase = false;

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0;
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length;
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0;
	  start >>>= 0;

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8';

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase();
	        loweredCase = true;
	    }
	  }
	}

	// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
	// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
	// reliably in a browserify context because there could be multiple different
	// copies of the 'buffer' package in use. This method works even for Buffer
	// instances that were created from another copy of the `buffer` package.
	// See: https://github.com/feross/buffer/issues/154
	Buffer.prototype._isBuffer = true;

	function swap (b, n, m) {
	  const i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16 () {
	  const len = this.length;
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (let i = 0; i < len; i += 2) {
	    swap(this, i, i + 1);
	  }
	  return this
	};

	Buffer.prototype.swap32 = function swap32 () {
	  const len = this.length;
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (let i = 0; i < len; i += 4) {
	    swap(this, i, i + 3);
	    swap(this, i + 1, i + 2);
	  }
	  return this
	};

	Buffer.prototype.swap64 = function swap64 () {
	  const len = this.length;
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (let i = 0; i < len; i += 8) {
	    swap(this, i, i + 7);
	    swap(this, i + 1, i + 6);
	    swap(this, i + 2, i + 5);
	    swap(this, i + 3, i + 4);
	  }
	  return this
	};

	Buffer.prototype.toString = function toString () {
	  const length = this.length;
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	};

	Buffer.prototype.toLocaleString = Buffer.prototype.toString;

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	};

	Buffer.prototype.inspect = function inspect () {
	  let str = '';
	  const max = exports.INSPECT_MAX_BYTES;
	  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
	  if (this.length > max) str += ' ... ';
	  return '<Buffer ' + str + '>'
	};
	if (customInspectSymbol) {
	  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (isInstance(target, Uint8Array)) {
	    target = Buffer.from(target, target.offset, target.byteLength);
	  }
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError(
	      'The "target" argument must be one of type Buffer or Uint8Array. ' +
	      'Received type ' + (typeof target)
	    )
	  }

	  if (start === undefined) {
	    start = 0;
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0;
	  }
	  if (thisStart === undefined) {
	    thisStart = 0;
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length;
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0;
	  end >>>= 0;
	  thisStart >>>= 0;
	  thisEnd >>>= 0;

	  if (this === target) return 0

	  let x = thisEnd - thisStart;
	  let y = end - start;
	  const len = Math.min(x, y);

	  const thisCopy = this.slice(thisStart, thisEnd);
	  const targetCopy = target.slice(start, end);

	  for (let i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i];
	      y = targetCopy[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset;
	    byteOffset = 0;
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff;
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000;
	  }
	  byteOffset = +byteOffset; // Coerce to Number.
	  if (numberIsNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1);
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1;
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0;
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding);
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF; // Search for a byte value [0-255]
	    if (typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  let indexSize = 1;
	  let arrLength = arr.length;
	  let valLength = val.length;

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase();
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2;
	      arrLength /= 2;
	      valLength /= 2;
	      byteOffset /= 2;
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  let i;
	  if (dir) {
	    let foundIndex = -1;
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i;
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex;
	        foundIndex = -1;
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
	    for (i = byteOffset; i >= 0; i--) {
	      let found = true;
	      for (let j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false;
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	};

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	};

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0;
	  const remaining = buf.length - offset;
	  if (!length) {
	    length = remaining;
	  } else {
	    length = Number(length);
	    if (length > remaining) {
	      length = remaining;
	    }
	  }

	  const strLen = string.length;

	  if (length > strLen / 2) {
	    length = strLen / 2;
	  }
	  let i;
	  for (i = 0; i < length; ++i) {
	    const parsed = parseInt(string.substr(i * 2, 2), 16);
	    if (numberIsNaN(parsed)) return i
	    buf[offset + i] = parsed;
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8';
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset;
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset >>> 0;
	    if (isFinite(length)) {
	      length = length >>> 0;
	      if (encoding === undefined) encoding = 'utf8';
	    } else {
	      encoding = length;
	      length = undefined;
	    }
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  const remaining = this.length - offset;
	  if (length === undefined || length > remaining) length = remaining;

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8';

	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return asciiWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	};

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	};

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end);
	  const res = [];

	  let i = start;
	  while (i < end) {
	    const firstByte = buf[i];
	    let codePoint = null;
	    let bytesPerSequence = (firstByte > 0xEF)
	      ? 4
	      : (firstByte > 0xDF)
	          ? 3
	          : (firstByte > 0xBF)
	              ? 2
	              : 1;

	    if (i + bytesPerSequence <= end) {
	      let secondByte, thirdByte, fourthByte, tempCodePoint;

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte;
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1];
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          fourthByte = buf[i + 3];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint;
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD;
	      bytesPerSequence = 1;
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000;
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
	      codePoint = 0xDC00 | codePoint & 0x3FF;
	    }

	    res.push(codePoint);
	    i += bytesPerSequence;
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	const MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray (codePoints) {
	  const len = codePoints.length;
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  let res = '';
	  let i = 0;
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    );
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F);
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i]);
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  const len = buf.length;

	  if (!start || start < 0) start = 0;
	  if (!end || end < 0 || end > len) end = len;

	  let out = '';
	  for (let i = start; i < end; ++i) {
	    out += hexSliceLookupTable[buf[i]];
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  const bytes = buf.slice(start, end);
	  let res = '';
	  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
	  for (let i = 0; i < bytes.length - 1; i += 2) {
	    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  const len = this.length;
	  start = ~~start;
	  end = end === undefined ? len : ~~end;

	  if (start < 0) {
	    start += len;
	    if (start < 0) start = 0;
	  } else if (start > len) {
	    start = len;
	  }

	  if (end < 0) {
	    end += len;
	    if (end < 0) end = 0;
	  } else if (end > len) {
	    end = len;
	  }

	  if (end < start) end = start;

	  const newBuf = this.subarray(start, end);
	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(newBuf, Buffer.prototype);

	  return newBuf
	};

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUintLE =
	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUintBE =
	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length);
	  }

	  let val = this[offset + --byteLength];
	  let mul = 1;
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUint8 =
	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  return this[offset]
	};

	Buffer.prototype.readUint16LE =
	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return this[offset] | (this[offset + 1] << 8)
	};

	Buffer.prototype.readUint16BE =
	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return (this[offset] << 8) | this[offset + 1]
	};

	Buffer.prototype.readUint32LE =
	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	};

	Buffer.prototype.readUint32BE =
	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	};

	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const lo = first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24;

	  const hi = this[++offset] +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    last * 2 ** 24;

	  return BigInt(lo) + (BigInt(hi) << BigInt(32))
	});

	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const hi = first * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  const lo = this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last;

	  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
	});

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let i = byteLength;
	  let mul = 1;
	  let val = this[offset + --i];
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	};

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset] | (this[offset + 1] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset + 1] | (this[offset] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	};

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	};

	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = this[offset + 4] +
	    this[offset + 5] * 2 ** 8 +
	    this[offset + 6] * 2 ** 16 +
	    (last << 24); // Overflow

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24)
	});

	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = (first << 24) + // Overflow
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last)
	});

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, true, 23, 4)
	};

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754$1.read(this, offset, false, 23, 4)
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, true, 52, 8)
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754$1.read(this, offset, false, 52, 8)
	};

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUintLE =
	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let mul = 1;
	  let i = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUintBE =
	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUint8 =
	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeUint16LE =
	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeUint16BE =
	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeUint32LE =
	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset + 3] = (value >>> 24);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 1] = (value >>> 8);
	  this[offset] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeUint32BE =
	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	function wrtBigUInt64LE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  return offset
	}

	function wrtBigUInt64BE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset + 7] = lo;
	  lo = lo >> 8;
	  buf[offset + 6] = lo;
	  lo = lo >> 8;
	  buf[offset + 5] = lo;
	  lo = lo >> 8;
	  buf[offset + 4] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset + 3] = hi;
	  hi = hi >> 8;
	  buf[offset + 2] = hi;
	  hi = hi >> 8;
	  buf[offset + 1] = hi;
	  hi = hi >> 8;
	  buf[offset] = hi;
	  return offset + 8
	}

	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = 0;
	  let mul = 1;
	  let sub = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  let sub = 0;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
	  if (value < 0) value = 0xff + value + 1;
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 3] = (value >>> 24);
	  return offset + 4
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (value < 0) value = 0xffffffff + value + 1;
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	};

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8);
	  }
	  ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
	  if (!start) start = 0;
	  if (!end && end !== 0) end = this.length;
	  if (targetStart >= target.length) targetStart = target.length;
	  if (!targetStart) targetStart = 0;
	  if (end > 0 && end < start) end = start;

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length;
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start;
	  }

	  const len = end - start;

	  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
	    // Use built-in when available, missing from IE11
	    this.copyWithin(targetStart, start, end);
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, end),
	      targetStart
	    );
	  }

	  return len
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start;
	      start = 0;
	      end = this.length;
	    } else if (typeof end === 'string') {
	      encoding = end;
	      end = this.length;
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	    if (val.length === 1) {
	      const code = val.charCodeAt(0);
	      if ((encoding === 'utf8' && code < 128) ||
	          encoding === 'latin1') {
	        // Fast path: If `val` fits into a single byte, use that numeric value.
	        val = code;
	      }
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255;
	  } else if (typeof val === 'boolean') {
	    val = Number(val);
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0;
	  end = end === undefined ? this.length : end >>> 0;

	  if (!val) val = 0;

	  let i;
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val;
	    }
	  } else {
	    const bytes = Buffer.isBuffer(val)
	      ? val
	      : Buffer.from(val, encoding);
	    const len = bytes.length;
	    if (len === 0) {
	      throw new TypeError('The value "' + val +
	        '" is invalid for argument "value"')
	    }
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len];
	    }
	  }

	  return this
	};

	// CUSTOM ERRORS
	// =============

	// Simplified versions from Node, changed for Buffer-only usage
	const errors = {};
	function E (sym, getMessage, Base) {
	  errors[sym] = class NodeError extends Base {
	    constructor () {
	      super();

	      Object.defineProperty(this, 'message', {
	        value: getMessage.apply(this, arguments),
	        writable: true,
	        configurable: true
	      });

	      // Add the error code to the name to include it in the stack trace.
	      this.name = `${this.name} [${sym}]`;
	      // Access the stack to generate the error message including the error code
	      // from the name.
	      this.stack; // eslint-disable-line no-unused-expressions
	      // Reset the name to the actual name.
	      delete this.name;
	    }

	    get code () {
	      return sym
	    }

	    set code (value) {
	      Object.defineProperty(this, 'code', {
	        configurable: true,
	        enumerable: true,
	        value,
	        writable: true
	      });
	    }

	    toString () {
	      return `${this.name} [${sym}]: ${this.message}`
	    }
	  };
	}

	E('ERR_BUFFER_OUT_OF_BOUNDS',
	  function (name) {
	    if (name) {
	      return `${name} is outside of buffer bounds`
	    }

	    return 'Attempt to access memory outside buffer bounds'
	  }, RangeError);
	E('ERR_INVALID_ARG_TYPE',
	  function (name, actual) {
	    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
	  }, TypeError);
	E('ERR_OUT_OF_RANGE',
	  function (str, range, input) {
	    let msg = `The value of "${str}" is out of range.`;
	    let received = input;
	    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
	      received = addNumericalSeparator(String(input));
	    } else if (typeof input === 'bigint') {
	      received = String(input);
	      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
	        received = addNumericalSeparator(received);
	      }
	      received += 'n';
	    }
	    msg += ` It must be ${range}. Received ${received}`;
	    return msg
	  }, RangeError);

	function addNumericalSeparator (val) {
	  let res = '';
	  let i = val.length;
	  const start = val[0] === '-' ? 1 : 0;
	  for (; i >= start + 4; i -= 3) {
	    res = `_${val.slice(i - 3, i)}${res}`;
	  }
	  return `${val.slice(0, i)}${res}`
	}

	// CHECK FUNCTIONS
	// ===============

	function checkBounds (buf, offset, byteLength) {
	  validateNumber(offset, 'offset');
	  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
	    boundsError(offset, buf.length - (byteLength + 1));
	  }
	}

	function checkIntBI (value, min, max, buf, offset, byteLength) {
	  if (value > max || value < min) {
	    const n = typeof min === 'bigint' ? 'n' : '';
	    let range;
	    if (byteLength > 3) {
	      if (min === 0 || min === BigInt(0)) {
	        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
	      } else {
	        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
	                `${(byteLength + 1) * 8 - 1}${n}`;
	      }
	    } else {
	      range = `>= ${min}${n} and <= ${max}${n}`;
	    }
	    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
	  }
	  checkBounds(buf, offset, byteLength);
	}

	function validateNumber (value, name) {
	  if (typeof value !== 'number') {
	    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
	  }
	}

	function boundsError (value, length, type) {
	  if (Math.floor(value) !== value) {
	    validateNumber(value, type);
	    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
	  }

	  if (length < 0) {
	    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
	  }

	  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
	                                    `>= ${type ? 1 : 0} and <= ${length}`,
	                                    value)
	}

	// HELPER FUNCTIONS
	// ================

	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

	function base64clean (str) {
	  // Node takes equal signs as end of the Base64 encoding
	  str = str.split('=')[0];
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = str.trim().replace(INVALID_BASE64_RE, '');
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '=';
	  }
	  return str
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity;
	  let codePoint;
	  const length = string.length;
	  let leadSurrogate = null;
	  const bytes = [];

	  for (let i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i);

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint;

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	        leadSurrogate = codePoint;
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	    }

	    leadSurrogate = null;

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint);
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF);
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  let c, hi, lo;
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i);
	    hi = c >> 8;
	    lo = c % 256;
	    byteArray.push(lo);
	    byteArray.push(hi);
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  let i;
	  for (i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i];
	  }
	  return i
	}

	// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
	// the `instanceof` check but they should be treated as of that type.
	// See: https://github.com/feross/buffer/issues/166
	function isInstance (obj, type) {
	  return obj instanceof type ||
	    (obj != null && obj.constructor != null && obj.constructor.name != null &&
	      obj.constructor.name === type.name)
	}
	function numberIsNaN (obj) {
	  // For IE11 support
	  return obj !== obj // eslint-disable-line no-self-compare
	}

	// Create lookup table for `toString('hex')`
	// See: https://github.com/feross/buffer/issues/219
	const hexSliceLookupTable = (function () {
	  const alphabet = '0123456789abcdef';
	  const table = new Array(256);
	  for (let i = 0; i < 16; ++i) {
	    const i16 = i * 16;
	    for (let j = 0; j < 16; ++j) {
	      table[i16 + j] = alphabet[i] + alphabet[j];
	    }
	  }
	  return table
	})();

	// Return not function with Error if BigInt not supported
	function defineBigIntMethod (fn) {
	  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
	}

	function BufferBigIntNotDefined () {
	  throw new Error('BigInt not supported')
	} 
} (buffer$1));

/**
 *  No-op function to validate types in TypeScript. Because function parameters are contravariant, passing an event that does not match on all properties will get red wiggly lines)
 */ const restrict = (item)=>item;

var lib$3 = {};

var global$1 = globalThis;

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}
function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
}
// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
var title = 'browser';
var platform = 'browser';
var browser$1 = true;
var env = {};
var argv = [];
var version = ''; // empty string to avoid regexp issues
var versions = {};
var release = {};
var config = {};

function noop() {}

var on = noop;
var addListener = noop;
var once$1 = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;

function binding(name) {
    throw new Error('process.binding is not supported');
}

function cwd () { return '/' }
function chdir (dir) {
    throw new Error('process.chdir is not supported');
}function umask() { return 0; }

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = global$1.performance || {};
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime%1)*1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds<0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds,nanoseconds]
}

var startTime = new Date();
function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

var process$1 = {
  nextTick: nextTick,
  title: title,
  browser: browser$1,
  env: env,
  argv: argv,
  version: version,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once$1,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config,
  uptime: uptime
};

var browser$2 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	addListener: addListener,
	argv: argv,
	binding: binding,
	browser: browser$1,
	chdir: chdir,
	config: config,
	cwd: cwd,
	default: process$1,
	emit: emit,
	env: env,
	hrtime: hrtime,
	nextTick: nextTick,
	off: off,
	on: on,
	once: once$1,
	platform: platform,
	release: release,
	removeAllListeners: removeAllListeners,
	removeListener: removeListener,
	title: title,
	umask: umask,
	uptime: uptime,
	version: version,
	versions: versions
});

var assert$1 = {exports: {}};

var errors$1 = {};

var util$3 = {};

var types = {};

/* eslint complexity: [2, 18], max-statements: [2, 33] */
var shams$1 = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

var hasSymbols$3 = shams$1;

/** @type {import('.')} */
var shams = function hasToStringTagShams() {
	return hasSymbols$3() && !!Symbol.toStringTag;
};

/** @type {import('.')} */
var esErrors = Error;

/** @type {import('./eval')} */
var _eval = EvalError;

/** @type {import('./range')} */
var range = RangeError;

/** @type {import('./ref')} */
var ref = ReferenceError;

/** @type {import('./syntax')} */
var syntax = SyntaxError;

/** @type {import('./type')} */
var type = TypeError;

/** @type {import('./uri')} */
var uri = URIError;

var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = shams$1;

var hasSymbols$2 = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

var test = {
	__proto__: null,
	foo: {}
};

var $Object = Object;

/** @type {import('.')} */
var hasProto$1 = function hasProto() {
	// @ts-expect-error: TS errors on an inherited property for some reason
	return { __proto__: test }.foo === test.foo
		&& !(test instanceof $Object);
};

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var toStr$4 = Object.prototype.toString;
var max = Math.max;
var funcType = '[object Function]';

var concatty = function concatty(a, b) {
    var arr = [];

    for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
    }

    return arr;
};

var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
    }
    return arr;
};

var joiny = function (arr, joiner) {
    var str = '';
    for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
            str += joiner;
        }
    }
    return str;
};

var implementation$7 = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr$4.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                concatty(args, arguments)
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        }
        return target.apply(
            that,
            concatty(args, arguments)
        );

    };

    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = '$' + i;
    }

    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

var implementation$6 = implementation$7;

var functionBind = Function.prototype.bind || implementation$6;

var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind$1 = functionBind;

/** @type {import('.')} */
var hasown = bind$1.call(call, $hasOwn);

var undefined$1;

var $Error = esErrors;
var $EvalError = _eval;
var $RangeError = range;
var $ReferenceError = ref;
var $SyntaxError$1 = syntax;
var $TypeError$2 = type;
var $URIError = uri;

var $Function = Function;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD$1 = Object.getOwnPropertyDescriptor;
if ($gOPD$1) {
	try {
		$gOPD$1({}, '');
	} catch (e) {
		$gOPD$1 = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError$2();
};
var ThrowTypeError = $gOPD$1
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD$1(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols$1 = hasSymbols$2();
var hasProto = hasProto$1();

var getProto$1 = Object.getPrototypeOf || (
	hasProto
		? function (x) { return x.__proto__; } // eslint-disable-line no-proto
		: null
);

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' || !getProto$1 ? undefined$1 : getProto$1(Uint8Array);

var INTRINSICS = {
	__proto__: null,
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols$1 && getProto$1 ? getProto$1([][Symbol.iterator]()) : undefined$1,
	'%AsyncFromSyncIteratorPrototype%': undefined$1,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined$1 : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined$1 : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': $Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': $EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols$1 && getProto$1 ? getProto$1(getProto$1([][Symbol.iterator]())) : undefined$1,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
	'%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols$1 || !getProto$1 ? undefined$1 : getProto$1(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
	'%RangeError%': $RangeError,
	'%ReferenceError%': $ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols$1 || !getProto$1 ? undefined$1 : getProto$1(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols$1 && getProto$1 ? getProto$1(''[Symbol.iterator]()) : undefined$1,
	'%Symbol%': hasSymbols$1 ? Symbol : undefined$1,
	'%SyntaxError%': $SyntaxError$1,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError$2,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
	'%URIError%': $URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet
};

if (getProto$1) {
	try {
		null.error; // eslint-disable-line no-unused-expressions
	} catch (e) {
		// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
		var errorProto = getProto$1(getProto$1(e));
		INTRINSICS['%Error.prototype%'] = errorProto;
	}
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen && getProto$1) {
			value = getProto$1(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	__proto__: null,
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = functionBind;
var hasOwn = hasown;
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError$1('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError$1('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError$2('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError$1('intrinsic ' + name + ' does not exist!');
};

var getIntrinsic = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError$2('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError$2('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError$1('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError$1('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError$2('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined$1;
			}
			if ($gOPD$1 && (i + 1) >= parts.length) {
				var desc = $gOPD$1(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

var callBind$2 = {exports: {}};

var esDefineProperty;
var hasRequiredEsDefineProperty;

function requireEsDefineProperty () {
	if (hasRequiredEsDefineProperty) return esDefineProperty;
	hasRequiredEsDefineProperty = 1;

	var GetIntrinsic = getIntrinsic;

	/** @type {import('.')} */
	var $defineProperty = GetIntrinsic('%Object.defineProperty%', true) || false;
	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
		} catch (e) {
			// IE 8 has a broken defineProperty
			$defineProperty = false;
		}
	}

	esDefineProperty = $defineProperty;
	return esDefineProperty;
}

var GetIntrinsic$2 = getIntrinsic;

var $gOPD = GetIntrinsic$2('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

var gopd$1 = $gOPD;

var $defineProperty$1 = requireEsDefineProperty();

var $SyntaxError = syntax;
var $TypeError$1 = type;

var gopd = gopd$1;

/** @type {import('.')} */
var defineDataProperty = function defineDataProperty(
	obj,
	property,
	value
) {
	if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
		throw new $TypeError$1('`obj` must be an object or a function`');
	}
	if (typeof property !== 'string' && typeof property !== 'symbol') {
		throw new $TypeError$1('`property` must be a string or a symbol`');
	}
	if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
		throw new $TypeError$1('`nonEnumerable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
		throw new $TypeError$1('`nonWritable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
		throw new $TypeError$1('`nonConfigurable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
		throw new $TypeError$1('`loose`, if provided, must be a boolean');
	}

	var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
	var nonWritable = arguments.length > 4 ? arguments[4] : null;
	var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
	var loose = arguments.length > 6 ? arguments[6] : false;

	/* @type {false | TypedPropertyDescriptor<unknown>} */
	var desc = !!gopd && gopd(obj, property);

	if ($defineProperty$1) {
		$defineProperty$1(obj, property, {
			configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
			enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
			value: value,
			writable: nonWritable === null && desc ? desc.writable : !nonWritable
		});
	} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
		// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
		obj[property] = value; // eslint-disable-line no-param-reassign
	} else {
		throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
	}
};

var $defineProperty = requireEsDefineProperty();

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	return !!$defineProperty;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!$defineProperty) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

var hasPropertyDescriptors_1 = hasPropertyDescriptors;

var GetIntrinsic$1 = getIntrinsic;
var define = defineDataProperty;
var hasDescriptors = hasPropertyDescriptors_1();
var gOPD$1 = gopd$1;

var $TypeError = type;
var $floor = GetIntrinsic$1('%Math.floor%');

/** @type {import('.')} */
var setFunctionLength = function setFunctionLength(fn, length) {
	if (typeof fn !== 'function') {
		throw new $TypeError('`fn` is not a function');
	}
	if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
		throw new $TypeError('`length` must be a positive 32-bit integer');
	}

	var loose = arguments.length > 2 && !!arguments[2];

	var functionLengthIsConfigurable = true;
	var functionLengthIsWritable = true;
	if ('length' in fn && gOPD$1) {
		var desc = gOPD$1(fn, 'length');
		if (desc && !desc.configurable) {
			functionLengthIsConfigurable = false;
		}
		if (desc && !desc.writable) {
			functionLengthIsWritable = false;
		}
	}

	if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
		if (hasDescriptors) {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length, true, true);
		} else {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length);
		}
	}
	return fn;
};

(function (module) {

	var bind = functionBind;
	var GetIntrinsic = getIntrinsic;
	var setFunctionLength$1 = setFunctionLength;

	var $TypeError = type;
	var $apply = GetIntrinsic('%Function.prototype.apply%');
	var $call = GetIntrinsic('%Function.prototype.call%');
	var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

	var $defineProperty = requireEsDefineProperty();
	var $max = GetIntrinsic('%Math.max%');

	module.exports = function callBind(originalFunction) {
		if (typeof originalFunction !== 'function') {
			throw new $TypeError('a function is required');
		}
		var func = $reflectApply(bind, $call, arguments);
		return setFunctionLength$1(
			func,
			1 + $max(0, originalFunction.length - (arguments.length - 1)),
			true
		);
	};

	var applyBind = function applyBind() {
		return $reflectApply(bind, $apply, arguments);
	};

	if ($defineProperty) {
		$defineProperty(module.exports, 'apply', { value: applyBind });
	} else {
		module.exports.apply = applyBind;
	} 
} (callBind$2));

var callBindExports = callBind$2.exports;

var GetIntrinsic = getIntrinsic;

var callBind$1 = callBindExports;

var $indexOf$1 = callBind$1(GetIntrinsic('String.prototype.indexOf'));

var callBound$3 = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf$1(name, '.prototype.') > -1) {
		return callBind$1(intrinsic);
	}
	return intrinsic;
};

var hasToStringTag$3 = shams();
var callBound$2 = callBound$3;

var $toString$1 = callBound$2('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag$3 && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString$1(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString$1(value) !== '[object Array]' &&
		$toString$1(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

var isArguments$1 = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

var toStr$3 = Object.prototype.toString;
var fnToStr$1 = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag$2 = shams();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag$2) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

var isGeneratorFunction = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr$1.call(fn))) {
		return true;
	}
	if (!hasToStringTag$2) {
		var str = toStr$3.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};

var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr$2 = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag$1 = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr$2.call(all) === toStr$2.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr$2.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

var isCallable$1 = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag$1) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr$2.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};

var isCallable = isCallable$1;

var toStr$1 = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach$1 = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr$1.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

var forEach_1 = forEach$1;

/** @type {import('.')} */
var possibleTypedArrayNames = [
	'Float32Array',
	'Float64Array',
	'Int8Array',
	'Int16Array',
	'Int32Array',
	'Uint8Array',
	'Uint8ClampedArray',
	'Uint16Array',
	'Uint32Array',
	'BigInt64Array',
	'BigUint64Array'
];

var possibleNames = possibleTypedArrayNames;

var g$1 = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;

/** @type {import('.')} */
var availableTypedArrays$1 = function availableTypedArrays() {
	var /** @type {ReturnType<typeof availableTypedArrays>} */ out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g$1[possibleNames[i]] === 'function') {
			// @ts-expect-error
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};

var forEach = forEach_1;
var availableTypedArrays = availableTypedArrays$1;
var callBind = callBindExports;
var callBound$1 = callBound$3;
var gOPD = gopd$1;

/** @type {(O: object) => string} */
var $toString = callBound$1('Object.prototype.toString');
var hasToStringTag = shams();

var g = typeof globalThis === 'undefined' ? commonjsGlobal : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound$1('String.prototype.slice');
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');

/** @type {<T = unknown>(array: readonly T[], value: unknown) => number} */
var $indexOf = callBound$1('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};

/** @typedef {(receiver: import('.').TypedArray) => string | typeof Uint8Array.prototype.slice.call | typeof Uint8Array.prototype.set.call} Getter */
/** @type {{ [k in `\$${import('.').TypedArrayName}`]?: Getter } & { __proto__: null }} */
var cache = { __proto__: null };
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			// @ts-expect-error TS won't narrow inside a closure
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				// @ts-expect-error TS won't narrow inside a closure
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			// @ts-expect-error TODO: fix
			cache['$' + typedArray] = callBind(descriptor.get);
		}
	});
} else {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		var fn = arr.slice || arr.set;
		if (fn) {
			// @ts-expect-error TODO: fix
			cache['$' + typedArray] = callBind(fn);
		}
	});
}

/** @type {(value: object) => false | import('.').TypedArrayName} */
var tryTypedArrays = function tryAllTypedArrays(value) {
	/** @type {ReturnType<typeof tryAllTypedArrays>} */ var found = false;
	forEach(
		// eslint-disable-next-line no-extra-parens
		/** @type {Record<`\$${TypedArrayName}`, Getter>} */ /** @type {any} */ (cache),
		/** @type {(getter: Getter, name: `\$${import('.').TypedArrayName}`) => void} */
		function (getter, typedArray) {
			if (!found) {
				try {
				// @ts-expect-error TODO: fix
					if ('$' + getter(value) === typedArray) {
						found = $slice(typedArray, 1);
					}
				} catch (e) { /**/ }
			}
		}
	);
	return found;
};

/** @type {(value: object) => false | import('.').TypedArrayName} */
var trySlices = function tryAllSlices(value) {
	/** @type {ReturnType<typeof tryAllSlices>} */ var found = false;
	forEach(
		// eslint-disable-next-line no-extra-parens
		/** @type {Record<`\$${TypedArrayName}`, Getter>} */ /** @type {any} */ (cache),
		/** @type {(getter: typeof cache, name: `\$${import('.').TypedArrayName}`) => void} */ function (getter, name) {
			if (!found) {
				try {
					// @ts-expect-error TODO: fix
					getter(value);
					found = $slice(name, 1);
				} catch (e) { /**/ }
			}
		}
	);
	return found;
};

/** @type {import('.')} */
var whichTypedArray$1 = function whichTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag) {
		/** @type {string} */
		var tag = $slice($toString(value), 8, -1);
		if ($indexOf(typedArrays, tag) > -1) {
			return tag;
		}
		if (tag !== 'Object') {
			return false;
		}
		// node < 0.6 hits here on real Typed Arrays
		return trySlices(value);
	}
	if (!gOPD) { return null; } // unknown engine
	return tryTypedArrays(value);
};

var whichTypedArray = whichTypedArray$1;

/** @type {import('.')} */
var isTypedArray = function isTypedArray(value) {
	return !!whichTypedArray(value);
};

(function (exports) {

	var isArgumentsObject = isArguments$1;
	var isGeneratorFunction$1 = isGeneratorFunction;
	var whichTypedArray = whichTypedArray$1;
	var isTypedArray$1 = isTypedArray;

	function uncurryThis(f) {
	  return f.call.bind(f);
	}

	var BigIntSupported = typeof BigInt !== 'undefined';
	var SymbolSupported = typeof Symbol !== 'undefined';

	var ObjectToString = uncurryThis(Object.prototype.toString);

	var numberValue = uncurryThis(Number.prototype.valueOf);
	var stringValue = uncurryThis(String.prototype.valueOf);
	var booleanValue = uncurryThis(Boolean.prototype.valueOf);

	if (BigIntSupported) {
	  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
	}

	if (SymbolSupported) {
	  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
	}

	function checkBoxedPrimitive(value, prototypeValueOf) {
	  if (typeof value !== 'object') {
	    return false;
	  }
	  try {
	    prototypeValueOf(value);
	    return true;
	  } catch(e) {
	    return false;
	  }
	}

	exports.isArgumentsObject = isArgumentsObject;
	exports.isGeneratorFunction = isGeneratorFunction$1;
	exports.isTypedArray = isTypedArray$1;

	// Taken from here and modified for better browser support
	// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
	function isPromise(input) {
		return (
			(
				typeof Promise !== 'undefined' &&
				input instanceof Promise
			) ||
			(
				input !== null &&
				typeof input === 'object' &&
				typeof input.then === 'function' &&
				typeof input.catch === 'function'
			)
		);
	}
	exports.isPromise = isPromise;

	function isArrayBufferView(value) {
	  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
	    return ArrayBuffer.isView(value);
	  }

	  return (
	    isTypedArray$1(value) ||
	    isDataView(value)
	  );
	}
	exports.isArrayBufferView = isArrayBufferView;


	function isUint8Array(value) {
	  return whichTypedArray(value) === 'Uint8Array';
	}
	exports.isUint8Array = isUint8Array;

	function isUint8ClampedArray(value) {
	  return whichTypedArray(value) === 'Uint8ClampedArray';
	}
	exports.isUint8ClampedArray = isUint8ClampedArray;

	function isUint16Array(value) {
	  return whichTypedArray(value) === 'Uint16Array';
	}
	exports.isUint16Array = isUint16Array;

	function isUint32Array(value) {
	  return whichTypedArray(value) === 'Uint32Array';
	}
	exports.isUint32Array = isUint32Array;

	function isInt8Array(value) {
	  return whichTypedArray(value) === 'Int8Array';
	}
	exports.isInt8Array = isInt8Array;

	function isInt16Array(value) {
	  return whichTypedArray(value) === 'Int16Array';
	}
	exports.isInt16Array = isInt16Array;

	function isInt32Array(value) {
	  return whichTypedArray(value) === 'Int32Array';
	}
	exports.isInt32Array = isInt32Array;

	function isFloat32Array(value) {
	  return whichTypedArray(value) === 'Float32Array';
	}
	exports.isFloat32Array = isFloat32Array;

	function isFloat64Array(value) {
	  return whichTypedArray(value) === 'Float64Array';
	}
	exports.isFloat64Array = isFloat64Array;

	function isBigInt64Array(value) {
	  return whichTypedArray(value) === 'BigInt64Array';
	}
	exports.isBigInt64Array = isBigInt64Array;

	function isBigUint64Array(value) {
	  return whichTypedArray(value) === 'BigUint64Array';
	}
	exports.isBigUint64Array = isBigUint64Array;

	function isMapToString(value) {
	  return ObjectToString(value) === '[object Map]';
	}
	isMapToString.working = (
	  typeof Map !== 'undefined' &&
	  isMapToString(new Map())
	);

	function isMap(value) {
	  if (typeof Map === 'undefined') {
	    return false;
	  }

	  return isMapToString.working
	    ? isMapToString(value)
	    : value instanceof Map;
	}
	exports.isMap = isMap;

	function isSetToString(value) {
	  return ObjectToString(value) === '[object Set]';
	}
	isSetToString.working = (
	  typeof Set !== 'undefined' &&
	  isSetToString(new Set())
	);
	function isSet(value) {
	  if (typeof Set === 'undefined') {
	    return false;
	  }

	  return isSetToString.working
	    ? isSetToString(value)
	    : value instanceof Set;
	}
	exports.isSet = isSet;

	function isWeakMapToString(value) {
	  return ObjectToString(value) === '[object WeakMap]';
	}
	isWeakMapToString.working = (
	  typeof WeakMap !== 'undefined' &&
	  isWeakMapToString(new WeakMap())
	);
	function isWeakMap(value) {
	  if (typeof WeakMap === 'undefined') {
	    return false;
	  }

	  return isWeakMapToString.working
	    ? isWeakMapToString(value)
	    : value instanceof WeakMap;
	}
	exports.isWeakMap = isWeakMap;

	function isWeakSetToString(value) {
	  return ObjectToString(value) === '[object WeakSet]';
	}
	isWeakSetToString.working = (
	  typeof WeakSet !== 'undefined' &&
	  isWeakSetToString(new WeakSet())
	);
	function isWeakSet(value) {
	  return isWeakSetToString(value);
	}
	exports.isWeakSet = isWeakSet;

	function isArrayBufferToString(value) {
	  return ObjectToString(value) === '[object ArrayBuffer]';
	}
	isArrayBufferToString.working = (
	  typeof ArrayBuffer !== 'undefined' &&
	  isArrayBufferToString(new ArrayBuffer())
	);
	function isArrayBuffer(value) {
	  if (typeof ArrayBuffer === 'undefined') {
	    return false;
	  }

	  return isArrayBufferToString.working
	    ? isArrayBufferToString(value)
	    : value instanceof ArrayBuffer;
	}
	exports.isArrayBuffer = isArrayBuffer;

	function isDataViewToString(value) {
	  return ObjectToString(value) === '[object DataView]';
	}
	isDataViewToString.working = (
	  typeof ArrayBuffer !== 'undefined' &&
	  typeof DataView !== 'undefined' &&
	  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
	);
	function isDataView(value) {
	  if (typeof DataView === 'undefined') {
	    return false;
	  }

	  return isDataViewToString.working
	    ? isDataViewToString(value)
	    : value instanceof DataView;
	}
	exports.isDataView = isDataView;

	// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
	var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
	function isSharedArrayBufferToString(value) {
	  return ObjectToString(value) === '[object SharedArrayBuffer]';
	}
	function isSharedArrayBuffer(value) {
	  if (typeof SharedArrayBufferCopy === 'undefined') {
	    return false;
	  }

	  if (typeof isSharedArrayBufferToString.working === 'undefined') {
	    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
	  }

	  return isSharedArrayBufferToString.working
	    ? isSharedArrayBufferToString(value)
	    : value instanceof SharedArrayBufferCopy;
	}
	exports.isSharedArrayBuffer = isSharedArrayBuffer;

	function isAsyncFunction(value) {
	  return ObjectToString(value) === '[object AsyncFunction]';
	}
	exports.isAsyncFunction = isAsyncFunction;

	function isMapIterator(value) {
	  return ObjectToString(value) === '[object Map Iterator]';
	}
	exports.isMapIterator = isMapIterator;

	function isSetIterator(value) {
	  return ObjectToString(value) === '[object Set Iterator]';
	}
	exports.isSetIterator = isSetIterator;

	function isGeneratorObject(value) {
	  return ObjectToString(value) === '[object Generator]';
	}
	exports.isGeneratorObject = isGeneratorObject;

	function isWebAssemblyCompiledModule(value) {
	  return ObjectToString(value) === '[object WebAssembly.Module]';
	}
	exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

	function isNumberObject(value) {
	  return checkBoxedPrimitive(value, numberValue);
	}
	exports.isNumberObject = isNumberObject;

	function isStringObject(value) {
	  return checkBoxedPrimitive(value, stringValue);
	}
	exports.isStringObject = isStringObject;

	function isBooleanObject(value) {
	  return checkBoxedPrimitive(value, booleanValue);
	}
	exports.isBooleanObject = isBooleanObject;

	function isBigIntObject(value) {
	  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
	}
	exports.isBigIntObject = isBigIntObject;

	function isSymbolObject(value) {
	  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
	}
	exports.isSymbolObject = isSymbolObject;

	function isBoxedPrimitive(value) {
	  return (
	    isNumberObject(value) ||
	    isStringObject(value) ||
	    isBooleanObject(value) ||
	    isBigIntObject(value) ||
	    isSymbolObject(value)
	  );
	}
	exports.isBoxedPrimitive = isBoxedPrimitive;

	function isAnyArrayBuffer(value) {
	  return typeof Uint8Array !== 'undefined' && (
	    isArrayBuffer(value) ||
	    isSharedArrayBuffer(value)
	  );
	}
	exports.isAnyArrayBuffer = isAnyArrayBuffer;

	['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
	  Object.defineProperty(exports, method, {
	    enumerable: false,
	    value: function() {
	      throw new Error(method + ' is not supported in userland');
	    }
	  });
	}); 
} (types));

var isBufferBrowser$1 = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
};

var inherits_browser$1 = {exports: {}};

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser$1.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  inherits_browser$1.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

var inherits_browserExports$1 = inherits_browser$1.exports;

(function (exports) {
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
	  function getOwnPropertyDescriptors(obj) {
	    var keys = Object.keys(obj);
	    var descriptors = {};
	    for (var i = 0; i < keys.length; i++) {
	      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
	    }
	    return descriptors;
	  };

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  if (typeof process$1 !== 'undefined' && process$1.noDeprecation === true) {
	    return fn;
	  }

	  // Allow for deprecating things in the process of starting up.
	  if (typeof process$1 === 'undefined') {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process$1.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process$1.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnvRegex = /^$/;

	if (process$1.env.NODE_DEBUG) {
	  var debugEnv = process$1.env.NODE_DEBUG;
	  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
	    .replace(/\*/g, '.*')
	    .replace(/,/g, '$|^')
	    .toUpperCase();
	  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
	}
	exports.debuglog = function(set) {
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (debugEnvRegex.test(set)) {
	      var pid = process$1.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').slice(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.slice(1, -1);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var length = output.reduce(function(prev, cur) {
	    if (cur.indexOf('\n') >= 0) ;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	exports.types = types;

	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;
	exports.types.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;
	exports.types.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;
	exports.types.isNativeError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = isBufferBrowser$1;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = inherits_browserExports$1;

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

	exports.promisify = function promisify(original) {
	  if (typeof original !== 'function')
	    throw new TypeError('The "original" argument must be of type Function');

	  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
	    var fn = original[kCustomPromisifiedSymbol];
	    if (typeof fn !== 'function') {
	      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
	    }
	    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
	      value: fn, enumerable: false, writable: false, configurable: true
	    });
	    return fn;
	  }

	  function fn() {
	    var promiseResolve, promiseReject;
	    var promise = new Promise(function (resolve, reject) {
	      promiseResolve = resolve;
	      promiseReject = reject;
	    });

	    var args = [];
	    for (var i = 0; i < arguments.length; i++) {
	      args.push(arguments[i]);
	    }
	    args.push(function (err, value) {
	      if (err) {
	        promiseReject(err);
	      } else {
	        promiseResolve(value);
	      }
	    });

	    try {
	      original.apply(this, args);
	    } catch (err) {
	      promiseReject(err);
	    }

	    return promise;
	  }

	  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

	  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
	    value: fn, enumerable: false, writable: false, configurable: true
	  });
	  return Object.defineProperties(
	    fn,
	    getOwnPropertyDescriptors(original)
	  );
	};

	exports.promisify.custom = kCustomPromisifiedSymbol;

	function callbackifyOnRejected(reason, cb) {
	  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
	  // Because `null` is a special error value in callbacks which means "no error
	  // occurred", we error-wrap so the callback consumer can distinguish between
	  // "the promise rejected with null" or "the promise fulfilled with undefined".
	  if (!reason) {
	    var newReason = new Error('Promise was rejected with a falsy value');
	    newReason.reason = reason;
	    reason = newReason;
	  }
	  return cb(reason);
	}

	function callbackify(original) {
	  if (typeof original !== 'function') {
	    throw new TypeError('The "original" argument must be of type Function');
	  }

	  // We DO NOT return the promise as it gives the user a false sense that
	  // the promise is actually somehow related to the callback's execution
	  // and that the callback throwing will reject the promise.
	  function callbackified() {
	    var args = [];
	    for (var i = 0; i < arguments.length; i++) {
	      args.push(arguments[i]);
	    }

	    var maybeCb = args.pop();
	    if (typeof maybeCb !== 'function') {
	      throw new TypeError('The last argument must be of type Function');
	    }
	    var self = this;
	    var cb = function() {
	      return maybeCb.apply(self, arguments);
	    };
	    // In true node style we process the callback on `nextTick` with all the
	    // implications (stack, `uncaughtException`, `async_hooks`)
	    original.apply(this, args)
	      .then(function(ret) { process$1.nextTick(cb.bind(null, null, ret)); },
	            function(rej) { process$1.nextTick(callbackifyOnRejected.bind(null, rej, cb)); });
	  }

	  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
	  Object.defineProperties(callbackified,
	                          getOwnPropertyDescriptors(original));
	  return callbackified;
	}
	exports.callbackify = callbackify; 
} (util$3));

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors$1;
	hasRequiredErrors = 1;

	// The whole point behind this internal module is to allow Node.js to no
	// longer be forced to treat every error message change as a semver-major
	// change. The NodeError classes here all expose a `code` property whose
	// value statically and permanently identifies the error. While the error
	// message may change, the code should not.
	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
	function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
	function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
	function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
	function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
	function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
	var codes = {};

	// Lazy loaded
	var assert;
	var util;
	function createErrorType(code, message, Base) {
	  if (!Base) {
	    Base = Error;
	  }
	  function getMessage(arg1, arg2, arg3) {
	    if (typeof message === 'string') {
	      return message;
	    } else {
	      return message(arg1, arg2, arg3);
	    }
	  }
	  var NodeError = /*#__PURE__*/function (_Base) {
	    _inherits(NodeError, _Base);
	    var _super = _createSuper(NodeError);
	    function NodeError(arg1, arg2, arg3) {
	      var _this;
	      _classCallCheck(this, NodeError);
	      _this = _super.call(this, getMessage(arg1, arg2, arg3));
	      _this.code = code;
	      return _this;
	    }
	    return _createClass(NodeError);
	  }(Base);
	  codes[code] = NodeError;
	}

	// https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js
	function oneOf(expected, thing) {
	  if (Array.isArray(expected)) {
	    var len = expected.length;
	    expected = expected.map(function (i) {
	      return String(i);
	    });
	    if (len > 2) {
	      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
	    } else if (len === 2) {
	      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
	    } else {
	      return "of ".concat(thing, " ").concat(expected[0]);
	    }
	  } else {
	    return "of ".concat(thing, " ").concat(String(expected));
	  }
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
	function startsWith(str, search, pos) {
	  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
	function endsWith(str, search, this_len) {
	  if (this_len === undefined || this_len > str.length) {
	    this_len = str.length;
	  }
	  return str.substring(this_len - search.length, this_len) === search;
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
	function includes(str, search, start) {
	  if (typeof start !== 'number') {
	    start = 0;
	  }
	  if (start + search.length > str.length) {
	    return false;
	  } else {
	    return str.indexOf(search, start) !== -1;
	  }
	}
	createErrorType('ERR_AMBIGUOUS_ARGUMENT', 'The "%s" argument is ambiguous. %s', TypeError);
	createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
	  if (assert === undefined) assert = requireAssert();
	  assert(typeof name === 'string', "'name' must be a string");

	  // determiner: 'must be' or 'must not be'
	  var determiner;
	  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
	    determiner = 'must not be';
	    expected = expected.replace(/^not /, '');
	  } else {
	    determiner = 'must be';
	  }
	  var msg;
	  if (endsWith(name, ' argument')) {
	    // For cases like 'first argument'
	    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  } else {
	    var type = includes(name, '.') ? 'property' : 'argument';
	    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  }

	  // TODO(BridgeAR): Improve the output by showing `null` and similar.
	  msg += ". Received type ".concat(_typeof(actual));
	  return msg;
	}, TypeError);
	createErrorType('ERR_INVALID_ARG_VALUE', function (name, value) {
	  var reason = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'is invalid';
	  if (util === undefined) util = util$3;
	  var inspected = util.inspect(value);
	  if (inspected.length > 128) {
	    inspected = "".concat(inspected.slice(0, 128), "...");
	  }
	  return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
	}, TypeError);
	createErrorType('ERR_INVALID_RETURN_VALUE', function (input, name, value) {
	  var type;
	  if (value && value.constructor && value.constructor.name) {
	    type = "instance of ".concat(value.constructor.name);
	  } else {
	    type = "type ".concat(_typeof(value));
	  }
	  return "Expected ".concat(input, " to be returned from the \"").concat(name, "\"") + " function but got ".concat(type, ".");
	}, TypeError);
	createErrorType('ERR_MISSING_ARGS', function () {
	  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	    args[_key] = arguments[_key];
	  }
	  if (assert === undefined) assert = requireAssert();
	  assert(args.length > 0, 'At least one arg needs to be specified');
	  var msg = 'The ';
	  var len = args.length;
	  args = args.map(function (a) {
	    return "\"".concat(a, "\"");
	  });
	  switch (len) {
	    case 1:
	      msg += "".concat(args[0], " argument");
	      break;
	    case 2:
	      msg += "".concat(args[0], " and ").concat(args[1], " arguments");
	      break;
	    default:
	      msg += args.slice(0, len - 1).join(', ');
	      msg += ", and ".concat(args[len - 1], " arguments");
	      break;
	  }
	  return "".concat(msg, " must be specified");
	}, TypeError);
	errors$1.codes = codes;
	return errors$1;
}

var assertion_error;
var hasRequiredAssertion_error;

function requireAssertion_error () {
	if (hasRequiredAssertion_error) return assertion_error;
	hasRequiredAssertion_error = 1;

	function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
	function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
	function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
	function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
	function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
	function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
	function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
	function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
	function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct.bind(); } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }
	function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
	function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }
	function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
	function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	var _require = util$3,
	  inspect = _require.inspect;
	var _require2 = requireErrors(),
	  ERR_INVALID_ARG_TYPE = _require2.codes.ERR_INVALID_ARG_TYPE;

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
	function endsWith(str, search, this_len) {
	  if (this_len === undefined || this_len > str.length) {
	    this_len = str.length;
	  }
	  return str.substring(this_len - search.length, this_len) === search;
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat
	function repeat(str, count) {
	  count = Math.floor(count);
	  if (str.length == 0 || count == 0) return '';
	  var maxCount = str.length * count;
	  count = Math.floor(Math.log(count) / Math.log(2));
	  while (count) {
	    str += str;
	    count--;
	  }
	  str += str.substring(0, maxCount - str.length);
	  return str;
	}
	var blue = '';
	var green = '';
	var red = '';
	var white = '';
	var kReadableOperator = {
	  deepStrictEqual: 'Expected values to be strictly deep-equal:',
	  strictEqual: 'Expected values to be strictly equal:',
	  strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
	  deepEqual: 'Expected values to be loosely deep-equal:',
	  equal: 'Expected values to be loosely equal:',
	  notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
	  notStrictEqual: 'Expected "actual" to be strictly unequal to:',
	  notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
	  notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
	  notEqual: 'Expected "actual" to be loosely unequal to:',
	  notIdentical: 'Values identical but not reference-equal:'
	};

	// Comparing short primitives should just show === / !== instead of using the
	// diff.
	var kMaxShortLength = 10;
	function copyError(source) {
	  var keys = Object.keys(source);
	  var target = Object.create(Object.getPrototypeOf(source));
	  keys.forEach(function (key) {
	    target[key] = source[key];
	  });
	  Object.defineProperty(target, 'message', {
	    value: source.message
	  });
	  return target;
	}
	function inspectValue(val) {
	  // The util.inspect default values could be changed. This makes sure the
	  // error messages contain the necessary information nevertheless.
	  return inspect(val, {
	    compact: false,
	    customInspect: false,
	    depth: 1000,
	    maxArrayLength: Infinity,
	    // Assert compares only enumerable properties (with a few exceptions).
	    showHidden: false,
	    // Having a long line as error is better than wrapping the line for
	    // comparison for now.
	    // TODO(BridgeAR): `breakLength` should be limited as soon as soon as we
	    // have meta information about the inspected properties (i.e., know where
	    // in what line the property starts and ends).
	    breakLength: Infinity,
	    // Assert does not detect proxies currently.
	    showProxy: false,
	    sorted: true,
	    // Inspect getters as we also check them when comparing entries.
	    getters: true
	  });
	}
	function createErrDiff(actual, expected, operator) {
	  var other = '';
	  var res = '';
	  var lastPos = 0;
	  var end = '';
	  var skipped = false;
	  var actualInspected = inspectValue(actual);
	  var actualLines = actualInspected.split('\n');
	  var expectedLines = inspectValue(expected).split('\n');
	  var i = 0;
	  var indicator = '';

	  // In case both values are objects explicitly mark them as not reference equal
	  // for the `strictEqual` operator.
	  if (operator === 'strictEqual' && _typeof(actual) === 'object' && _typeof(expected) === 'object' && actual !== null && expected !== null) {
	    operator = 'strictEqualObject';
	  }

	  // If "actual" and "expected" fit on a single line and they are not strictly
	  // equal, check further special handling.
	  if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
	    var inputLength = actualLines[0].length + expectedLines[0].length;
	    // If the character length of "actual" and "expected" together is less than
	    // kMaxShortLength and if neither is an object and at least one of them is
	    // not `zero`, use the strict equal comparison to visualize the output.
	    if (inputLength <= kMaxShortLength) {
	      if ((_typeof(actual) !== 'object' || actual === null) && (_typeof(expected) !== 'object' || expected === null) && (actual !== 0 || expected !== 0)) {
	        // -0 === +0
	        return "".concat(kReadableOperator[operator], "\n\n") + "".concat(actualLines[0], " !== ").concat(expectedLines[0], "\n");
	      }
	    } else if (operator !== 'strictEqualObject') {
	      // If the stderr is a tty and the input length is lower than the current
	      // columns per line, add a mismatch indicator below the output. If it is
	      // not a tty, use a default value of 80 characters.
	      var maxLength = process$1.stderr && process$1.stderr.isTTY ? process$1.stderr.columns : 80;
	      if (inputLength < maxLength) {
	        while (actualLines[0][i] === expectedLines[0][i]) {
	          i++;
	        }
	        // Ignore the first characters.
	        if (i > 2) {
	          // Add position indicator for the first mismatch in case it is a
	          // single line and the input length is less than the column length.
	          indicator = "\n  ".concat(repeat(' ', i), "^");
	          i = 0;
	        }
	      }
	    }
	  }

	  // Remove all ending lines that match (this optimizes the output for
	  // readability by reducing the number of total changed lines).
	  var a = actualLines[actualLines.length - 1];
	  var b = expectedLines[expectedLines.length - 1];
	  while (a === b) {
	    if (i++ < 2) {
	      end = "\n  ".concat(a).concat(end);
	    } else {
	      other = a;
	    }
	    actualLines.pop();
	    expectedLines.pop();
	    if (actualLines.length === 0 || expectedLines.length === 0) break;
	    a = actualLines[actualLines.length - 1];
	    b = expectedLines[expectedLines.length - 1];
	  }
	  var maxLines = Math.max(actualLines.length, expectedLines.length);
	  // Strict equal with identical objects that are not identical by reference.
	  // E.g., assert.deepStrictEqual({ a: Symbol() }, { a: Symbol() })
	  if (maxLines === 0) {
	    // We have to get the result again. The lines were all removed before.
	    var _actualLines = actualInspected.split('\n');

	    // Only remove lines in case it makes sense to collapse those.
	    // TODO: Accept env to always show the full error.
	    if (_actualLines.length > 30) {
	      _actualLines[26] = "".concat(blue, "...").concat(white);
	      while (_actualLines.length > 27) {
	        _actualLines.pop();
	      }
	    }
	    return "".concat(kReadableOperator.notIdentical, "\n\n").concat(_actualLines.join('\n'), "\n");
	  }
	  if (i > 3) {
	    end = "\n".concat(blue, "...").concat(white).concat(end);
	    skipped = true;
	  }
	  if (other !== '') {
	    end = "\n  ".concat(other).concat(end);
	    other = '';
	  }
	  var printedLines = 0;
	  var msg = kReadableOperator[operator] + "\n".concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
	  var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");
	  for (i = 0; i < maxLines; i++) {
	    // Only extra expected lines exist
	    var cur = i - lastPos;
	    if (actualLines.length < i + 1) {
	      // If the last diverging line is more than one line above and the
	      // current line is at least line three, add some of the former lines and
	      // also add dots to indicate skipped entries.
	      if (cur > 1 && i > 2) {
	        if (cur > 4) {
	          res += "\n".concat(blue, "...").concat(white);
	          skipped = true;
	        } else if (cur > 3) {
	          res += "\n  ".concat(expectedLines[i - 2]);
	          printedLines++;
	        }
	        res += "\n  ".concat(expectedLines[i - 1]);
	        printedLines++;
	      }
	      // Mark the current line as the last diverging one.
	      lastPos = i;
	      // Add the expected line to the cache.
	      other += "\n".concat(red, "-").concat(white, " ").concat(expectedLines[i]);
	      printedLines++;
	      // Only extra actual lines exist
	    } else if (expectedLines.length < i + 1) {
	      // If the last diverging line is more than one line above and the
	      // current line is at least line three, add some of the former lines and
	      // also add dots to indicate skipped entries.
	      if (cur > 1 && i > 2) {
	        if (cur > 4) {
	          res += "\n".concat(blue, "...").concat(white);
	          skipped = true;
	        } else if (cur > 3) {
	          res += "\n  ".concat(actualLines[i - 2]);
	          printedLines++;
	        }
	        res += "\n  ".concat(actualLines[i - 1]);
	        printedLines++;
	      }
	      // Mark the current line as the last diverging one.
	      lastPos = i;
	      // Add the actual line to the result.
	      res += "\n".concat(green, "+").concat(white, " ").concat(actualLines[i]);
	      printedLines++;
	      // Lines diverge
	    } else {
	      var expectedLine = expectedLines[i];
	      var actualLine = actualLines[i];
	      // If the lines diverge, specifically check for lines that only diverge by
	      // a trailing comma. In that case it is actually identical and we should
	      // mark it as such.
	      var divergingLines = actualLine !== expectedLine && (!endsWith(actualLine, ',') || actualLine.slice(0, -1) !== expectedLine);
	      // If the expected line has a trailing comma but is otherwise identical,
	      // add a comma at the end of the actual line. Otherwise the output could
	      // look weird as in:
	      //
	      //   [
	      //     1         // No comma at the end!
	      // +   2
	      //   ]
	      //
	      if (divergingLines && endsWith(expectedLine, ',') && expectedLine.slice(0, -1) === actualLine) {
	        divergingLines = false;
	        actualLine += ',';
	      }
	      if (divergingLines) {
	        // If the last diverging line is more than one line above and the
	        // current line is at least line three, add some of the former lines and
	        // also add dots to indicate skipped entries.
	        if (cur > 1 && i > 2) {
	          if (cur > 4) {
	            res += "\n".concat(blue, "...").concat(white);
	            skipped = true;
	          } else if (cur > 3) {
	            res += "\n  ".concat(actualLines[i - 2]);
	            printedLines++;
	          }
	          res += "\n  ".concat(actualLines[i - 1]);
	          printedLines++;
	        }
	        // Mark the current line as the last diverging one.
	        lastPos = i;
	        // Add the actual line to the result and cache the expected diverging
	        // line so consecutive diverging lines show up as +++--- and not +-+-+-.
	        res += "\n".concat(green, "+").concat(white, " ").concat(actualLine);
	        other += "\n".concat(red, "-").concat(white, " ").concat(expectedLine);
	        printedLines += 2;
	        // Lines are identical
	      } else {
	        // Add all cached information to the result before adding other things
	        // and reset the cache.
	        res += other;
	        other = '';
	        // If the last diverging line is exactly one line above or if it is the
	        // very first line, add the line to the result.
	        if (cur === 1 || i === 0) {
	          res += "\n  ".concat(actualLine);
	          printedLines++;
	        }
	      }
	    }
	    // Inspected object to big (Show ~20 rows max)
	    if (printedLines > 20 && i < maxLines - 2) {
	      return "".concat(msg).concat(skippedMsg, "\n").concat(res, "\n").concat(blue, "...").concat(white).concat(other, "\n") + "".concat(blue, "...").concat(white);
	    }
	  }
	  return "".concat(msg).concat(skipped ? skippedMsg : '', "\n").concat(res).concat(other).concat(end).concat(indicator);
	}
	var AssertionError = /*#__PURE__*/function (_Error, _inspect$custom) {
	  _inherits(AssertionError, _Error);
	  var _super = _createSuper(AssertionError);
	  function AssertionError(options) {
	    var _this;
	    _classCallCheck(this, AssertionError);
	    if (_typeof(options) !== 'object' || options === null) {
	      throw new ERR_INVALID_ARG_TYPE('options', 'Object', options);
	    }
	    var message = options.message,
	      operator = options.operator,
	      stackStartFn = options.stackStartFn;
	    var actual = options.actual,
	      expected = options.expected;
	    var limit = Error.stackTraceLimit;
	    Error.stackTraceLimit = 0;
	    if (message != null) {
	      _this = _super.call(this, String(message));
	    } else {
	      if (process$1.stderr && process$1.stderr.isTTY) {
	        // Reset on each call to make sure we handle dynamically set environment
	        // variables correct.
	        if (process$1.stderr && process$1.stderr.getColorDepth && process$1.stderr.getColorDepth() !== 1) {
	          blue = "\x1B[34m";
	          green = "\x1B[32m";
	          white = "\x1B[39m";
	          red = "\x1B[31m";
	        } else {
	          blue = '';
	          green = '';
	          white = '';
	          red = '';
	        }
	      }
	      // Prevent the error stack from being visible by duplicating the error
	      // in a very close way to the original in case both sides are actually
	      // instances of Error.
	      if (_typeof(actual) === 'object' && actual !== null && _typeof(expected) === 'object' && expected !== null && 'stack' in actual && actual instanceof Error && 'stack' in expected && expected instanceof Error) {
	        actual = copyError(actual);
	        expected = copyError(expected);
	      }
	      if (operator === 'deepStrictEqual' || operator === 'strictEqual') {
	        _this = _super.call(this, createErrDiff(actual, expected, operator));
	      } else if (operator === 'notDeepStrictEqual' || operator === 'notStrictEqual') {
	        // In case the objects are equal but the operator requires unequal, show
	        // the first object and say A equals B
	        var base = kReadableOperator[operator];
	        var res = inspectValue(actual).split('\n');

	        // In case "actual" is an object, it should not be reference equal.
	        if (operator === 'notStrictEqual' && _typeof(actual) === 'object' && actual !== null) {
	          base = kReadableOperator.notStrictEqualObject;
	        }

	        // Only remove lines in case it makes sense to collapse those.
	        // TODO: Accept env to always show the full error.
	        if (res.length > 30) {
	          res[26] = "".concat(blue, "...").concat(white);
	          while (res.length > 27) {
	            res.pop();
	          }
	        }

	        // Only print a single input.
	        if (res.length === 1) {
	          _this = _super.call(this, "".concat(base, " ").concat(res[0]));
	        } else {
	          _this = _super.call(this, "".concat(base, "\n\n").concat(res.join('\n'), "\n"));
	        }
	      } else {
	        var _res = inspectValue(actual);
	        var other = '';
	        var knownOperators = kReadableOperator[operator];
	        if (operator === 'notDeepEqual' || operator === 'notEqual') {
	          _res = "".concat(kReadableOperator[operator], "\n\n").concat(_res);
	          if (_res.length > 1024) {
	            _res = "".concat(_res.slice(0, 1021), "...");
	          }
	        } else {
	          other = "".concat(inspectValue(expected));
	          if (_res.length > 512) {
	            _res = "".concat(_res.slice(0, 509), "...");
	          }
	          if (other.length > 512) {
	            other = "".concat(other.slice(0, 509), "...");
	          }
	          if (operator === 'deepEqual' || operator === 'equal') {
	            _res = "".concat(knownOperators, "\n\n").concat(_res, "\n\nshould equal\n\n");
	          } else {
	            other = " ".concat(operator, " ").concat(other);
	          }
	        }
	        _this = _super.call(this, "".concat(_res).concat(other));
	      }
	    }
	    Error.stackTraceLimit = limit;
	    _this.generatedMessage = !message;
	    Object.defineProperty(_assertThisInitialized(_this), 'name', {
	      value: 'AssertionError [ERR_ASSERTION]',
	      enumerable: false,
	      writable: true,
	      configurable: true
	    });
	    _this.code = 'ERR_ASSERTION';
	    _this.actual = actual;
	    _this.expected = expected;
	    _this.operator = operator;
	    if (Error.captureStackTrace) {
	      // eslint-disable-next-line no-restricted-syntax
	      Error.captureStackTrace(_assertThisInitialized(_this), stackStartFn);
	    }
	    // Create error message including the error code in the name.
	    _this.stack;
	    // Reset the name.
	    _this.name = 'AssertionError';
	    return _possibleConstructorReturn(_this);
	  }
	  _createClass(AssertionError, [{
	    key: "toString",
	    value: function toString() {
	      return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
	    }
	  }, {
	    key: _inspect$custom,
	    value: function value(recurseTimes, ctx) {
	      // This limits the `actual` and `expected` property default inspection to
	      // the minimum depth. Otherwise those values would be too verbose compared
	      // to the actual error message which contains a combined view of these two
	      // input values.
	      return inspect(this, _objectSpread(_objectSpread({}, ctx), {}, {
	        customInspect: false,
	        depth: 0
	      }));
	    }
	  }]);
	  return AssertionError;
	}( /*#__PURE__*/_wrapNativeSuper(Error), inspect.custom);
	assertion_error = AssertionError;
	return assertion_error;
}

var toStr = Object.prototype.toString;

var isArguments = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

var implementation$5;
var hasRequiredImplementation$1;

function requireImplementation$1 () {
	if (hasRequiredImplementation$1) return implementation$5;
	hasRequiredImplementation$1 = 1;

	var keysShim;
	if (!Object.keys) {
		// modified from https://github.com/es-shims/es5-shim
		var has = Object.prototype.hasOwnProperty;
		var toStr = Object.prototype.toString;
		var isArgs = isArguments; // eslint-disable-line global-require
		var isEnumerable = Object.prototype.propertyIsEnumerable;
		var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
		var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
		var dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		];
		var equalsConstructorPrototype = function (o) {
			var ctor = o.constructor;
			return ctor && ctor.prototype === o;
		};
		var excludedKeys = {
			$applicationCache: true,
			$console: true,
			$external: true,
			$frame: true,
			$frameElement: true,
			$frames: true,
			$innerHeight: true,
			$innerWidth: true,
			$onmozfullscreenchange: true,
			$onmozfullscreenerror: true,
			$outerHeight: true,
			$outerWidth: true,
			$pageXOffset: true,
			$pageYOffset: true,
			$parent: true,
			$scrollLeft: true,
			$scrollTop: true,
			$scrollX: true,
			$scrollY: true,
			$self: true,
			$webkitIndexedDB: true,
			$webkitStorageInfo: true,
			$window: true
		};
		var hasAutomationEqualityBug = (function () {
			/* global window */
			if (typeof window === 'undefined') { return false; }
			for (var k in window) {
				try {
					if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
						try {
							equalsConstructorPrototype(window[k]);
						} catch (e) {
							return true;
						}
					}
				} catch (e) {
					return true;
				}
			}
			return false;
		}());
		var equalsConstructorPrototypeIfNotBuggy = function (o) {
			/* global window */
			if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
				return equalsConstructorPrototype(o);
			}
			try {
				return equalsConstructorPrototype(o);
			} catch (e) {
				return false;
			}
		};

		keysShim = function keys(object) {
			var isObject = object !== null && typeof object === 'object';
			var isFunction = toStr.call(object) === '[object Function]';
			var isArguments = isArgs(object);
			var isString = isObject && toStr.call(object) === '[object String]';
			var theKeys = [];

			if (!isObject && !isFunction && !isArguments) {
				throw new TypeError('Object.keys called on a non-object');
			}

			var skipProto = hasProtoEnumBug && isFunction;
			if (isString && object.length > 0 && !has.call(object, 0)) {
				for (var i = 0; i < object.length; ++i) {
					theKeys.push(String(i));
				}
			}

			if (isArguments && object.length > 0) {
				for (var j = 0; j < object.length; ++j) {
					theKeys.push(String(j));
				}
			} else {
				for (var name in object) {
					if (!(skipProto && name === 'prototype') && has.call(object, name)) {
						theKeys.push(String(name));
					}
				}
			}

			if (hasDontEnumBug) {
				var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

				for (var k = 0; k < dontEnums.length; ++k) {
					if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
						theKeys.push(dontEnums[k]);
					}
				}
			}
			return theKeys;
		};
	}
	implementation$5 = keysShim;
	return implementation$5;
}

var slice = Array.prototype.slice;
var isArgs = isArguments;

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : requireImplementation$1();

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

var objectKeys$1 = keysShim;

// modified from https://github.com/es-shims/es6-shim
var objectKeys = objectKeys$1;
var hasSymbols = shams$1();
var callBound = callBound$3;
var toObject = Object;
var $push = callBound('Array.prototype.push');
var $propIsEnumerable = callBound('Object.prototype.propertyIsEnumerable');
var originalGetSymbols = hasSymbols ? Object.getOwnPropertySymbols : null;

// eslint-disable-next-line no-unused-vars
var implementation$4 = function assign(target, source1) {
	if (target == null) { throw new TypeError('target must be an object'); }
	var to = toObject(target); // step 1
	if (arguments.length === 1) {
		return to; // step 2
	}
	for (var s = 1; s < arguments.length; ++s) {
		var from = toObject(arguments[s]); // step 3.a.i

		// step 3.a.ii:
		var keys = objectKeys(from);
		var getSymbols = hasSymbols && (Object.getOwnPropertySymbols || originalGetSymbols);
		if (getSymbols) {
			var syms = getSymbols(from);
			for (var j = 0; j < syms.length; ++j) {
				var key = syms[j];
				if ($propIsEnumerable(from, key)) {
					$push(keys, key);
				}
			}
		}

		// step 3.a.iii:
		for (var i = 0; i < keys.length; ++i) {
			var nextKey = keys[i];
			if ($propIsEnumerable(from, nextKey)) { // step 3.a.iii.2
				var propValue = from[nextKey]; // step 3.a.iii.2.a
				to[nextKey] = propValue; // step 3.a.iii.2.b
			}
		}
	}

	return to; // step 4
};

var implementation$3 = implementation$4;

var lacksProperEnumerationOrder = function () {
	if (!Object.assign) {
		return false;
	}
	/*
	 * v8, specifically in node 4.x, has a bug with incorrect property enumeration order
	 * note: this does not detect the bug unless there's 20 characters
	 */
	var str = 'abcdefghijklmnopqrst';
	var letters = str.split('');
	var map = {};
	for (var i = 0; i < letters.length; ++i) {
		map[letters[i]] = letters[i];
	}
	var obj = Object.assign({}, map);
	var actual = '';
	for (var k in obj) {
		actual += k;
	}
	return str !== actual;
};

var assignHasPendingExceptions = function () {
	if (!Object.assign || !Object.preventExtensions) {
		return false;
	}
	/*
	 * Firefox 37 still has "pending exception" logic in its Object.assign implementation,
	 * which is 72% slower than our shim, and Firefox 40's native implementation.
	 */
	var thrower = Object.preventExtensions({ 1: 2 });
	try {
		Object.assign(thrower, 'xy');
	} catch (e) {
		return thrower[1] === 'y';
	}
	return false;
};

var polyfill$2 = function getPolyfill() {
	if (!Object.assign) {
		return implementation$3;
	}
	if (lacksProperEnumerationOrder()) {
		return implementation$3;
	}
	if (assignHasPendingExceptions()) {
		return implementation$3;
	}
	return Object.assign;
};

var numberIsNaN = function (value) {
	return value !== value;
};

var implementation$2 = function is(a, b) {
	if (a === 0 && b === 0) {
		return 1 / a === 1 / b;
	}
	if (a === b) {
		return true;
	}
	if (numberIsNaN(a) && numberIsNaN(b)) {
		return true;
	}
	return false;
};

var implementation$1 = implementation$2;

var polyfill$1 = function getPolyfill() {
	return typeof Object.is === 'function' ? Object.is : implementation$1;
};

var defineProperties_1;
var hasRequiredDefineProperties;

function requireDefineProperties () {
	if (hasRequiredDefineProperties) return defineProperties_1;
	hasRequiredDefineProperties = 1;

	var keys = objectKeys$1;
	var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

	var toStr = Object.prototype.toString;
	var concat = Array.prototype.concat;
	var defineDataProperty$1 = defineDataProperty;

	var isFunction = function (fn) {
		return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
	};

	var supportsDescriptors = hasPropertyDescriptors_1();

	var defineProperty = function (object, name, value, predicate) {
		if (name in object) {
			if (predicate === true) {
				if (object[name] === value) {
					return;
				}
			} else if (!isFunction(predicate) || !predicate()) {
				return;
			}
		}

		if (supportsDescriptors) {
			defineDataProperty$1(object, name, value, true);
		} else {
			defineDataProperty$1(object, name, value);
		}
	};

	var defineProperties = function (object, map) {
		var predicates = arguments.length > 2 ? arguments[2] : {};
		var props = keys(map);
		if (hasSymbols) {
			props = concat.call(props, Object.getOwnPropertySymbols(map));
		}
		for (var i = 0; i < props.length; i += 1) {
			defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
		}
	};

	defineProperties.supportsDescriptors = !!supportsDescriptors;

	defineProperties_1 = defineProperties;
	return defineProperties_1;
}

var shim$1;
var hasRequiredShim$1;

function requireShim$1 () {
	if (hasRequiredShim$1) return shim$1;
	hasRequiredShim$1 = 1;

	var getPolyfill = polyfill$1;
	var define = requireDefineProperties();

	shim$1 = function shimObjectIs() {
		var polyfill = getPolyfill();
		define(Object, { is: polyfill }, {
			is: function testObjectIs() {
				return Object.is !== polyfill;
			}
		});
		return polyfill;
	};
	return shim$1;
}

var objectIs;
var hasRequiredObjectIs;

function requireObjectIs () {
	if (hasRequiredObjectIs) return objectIs;
	hasRequiredObjectIs = 1;

	var define = requireDefineProperties();
	var callBind = callBindExports;

	var implementation = implementation$2;
	var getPolyfill = polyfill$1;
	var shim = requireShim$1();

	var polyfill = callBind(getPolyfill(), Object);

	define(polyfill, {
		getPolyfill: getPolyfill,
		implementation: implementation,
		shim: shim
	});

	objectIs = polyfill;
	return objectIs;
}

var implementation;
var hasRequiredImplementation;

function requireImplementation () {
	if (hasRequiredImplementation) return implementation;
	hasRequiredImplementation = 1;

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	implementation = function isNaN(value) {
		return value !== value;
	};
	return implementation;
}

var polyfill;
var hasRequiredPolyfill;

function requirePolyfill () {
	if (hasRequiredPolyfill) return polyfill;
	hasRequiredPolyfill = 1;

	var implementation = requireImplementation();

	polyfill = function getPolyfill() {
		if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN('a')) {
			return Number.isNaN;
		}
		return implementation;
	};
	return polyfill;
}

var shim;
var hasRequiredShim;

function requireShim () {
	if (hasRequiredShim) return shim;
	hasRequiredShim = 1;

	var define = requireDefineProperties();
	var getPolyfill = requirePolyfill();

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	shim = function shimNumberIsNaN() {
		var polyfill = getPolyfill();
		define(Number, { isNaN: polyfill }, {
			isNaN: function testIsNaN() {
				return Number.isNaN !== polyfill;
			}
		});
		return polyfill;
	};
	return shim;
}

var isNan;
var hasRequiredIsNan;

function requireIsNan () {
	if (hasRequiredIsNan) return isNan;
	hasRequiredIsNan = 1;

	var callBind = callBindExports;
	var define = requireDefineProperties();

	var implementation = requireImplementation();
	var getPolyfill = requirePolyfill();
	var shim = requireShim();

	var polyfill = callBind(getPolyfill(), Number);

	/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

	define(polyfill, {
		getPolyfill: getPolyfill,
		implementation: implementation,
		shim: shim
	});

	isNan = polyfill;
	return isNan;
}

var comparisons;
var hasRequiredComparisons;

function requireComparisons () {
	if (hasRequiredComparisons) return comparisons;
	hasRequiredComparisons = 1;

	function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
	function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
	function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
	function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
	function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
	function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	var regexFlagsSupported = /a/g.flags !== undefined;
	var arrayFromSet = function arrayFromSet(set) {
	  var array = [];
	  set.forEach(function (value) {
	    return array.push(value);
	  });
	  return array;
	};
	var arrayFromMap = function arrayFromMap(map) {
	  var array = [];
	  map.forEach(function (value, key) {
	    return array.push([key, value]);
	  });
	  return array;
	};
	var objectIs = Object.is ? Object.is : requireObjectIs();
	var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function () {
	  return [];
	};
	var numberIsNaN = Number.isNaN ? Number.isNaN : requireIsNan();
	function uncurryThis(f) {
	  return f.call.bind(f);
	}
	var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
	var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
	var objectToString = uncurryThis(Object.prototype.toString);
	var _require$types = util$3.types,
	  isAnyArrayBuffer = _require$types.isAnyArrayBuffer,
	  isArrayBufferView = _require$types.isArrayBufferView,
	  isDate = _require$types.isDate,
	  isMap = _require$types.isMap,
	  isRegExp = _require$types.isRegExp,
	  isSet = _require$types.isSet,
	  isNativeError = _require$types.isNativeError,
	  isBoxedPrimitive = _require$types.isBoxedPrimitive,
	  isNumberObject = _require$types.isNumberObject,
	  isStringObject = _require$types.isStringObject,
	  isBooleanObject = _require$types.isBooleanObject,
	  isBigIntObject = _require$types.isBigIntObject,
	  isSymbolObject = _require$types.isSymbolObject,
	  isFloat32Array = _require$types.isFloat32Array,
	  isFloat64Array = _require$types.isFloat64Array;
	function isNonIndex(key) {
	  if (key.length === 0 || key.length > 10) return true;
	  for (var i = 0; i < key.length; i++) {
	    var code = key.charCodeAt(i);
	    if (code < 48 || code > 57) return true;
	  }
	  // The maximum size for an array is 2 ** 32 -1.
	  return key.length === 10 && key >= Math.pow(2, 32);
	}
	function getOwnNonIndexProperties(value) {
	  return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
	}

	// Taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
	// original notice:
	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	function compare(a, b) {
	  if (a === b) {
	    return 0;
	  }
	  var x = a.length;
	  var y = b.length;
	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break;
	    }
	  }
	  if (x < y) {
	    return -1;
	  }
	  if (y < x) {
	    return 1;
	  }
	  return 0;
	}
	var kStrict = true;
	var kLoose = false;
	var kNoIterator = 0;
	var kIsArray = 1;
	var kIsSet = 2;
	var kIsMap = 3;

	// Check if they have the same source and flags
	function areSimilarRegExps(a, b) {
	  return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
	}
	function areSimilarFloatArrays(a, b) {
	  if (a.byteLength !== b.byteLength) {
	    return false;
	  }
	  for (var offset = 0; offset < a.byteLength; offset++) {
	    if (a[offset] !== b[offset]) {
	      return false;
	    }
	  }
	  return true;
	}
	function areSimilarTypedArrays(a, b) {
	  if (a.byteLength !== b.byteLength) {
	    return false;
	  }
	  return compare(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
	}
	function areEqualArrayBuffers(buf1, buf2) {
	  return buf1.byteLength === buf2.byteLength && compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
	}
	function isEqualBoxedPrimitive(val1, val2) {
	  if (isNumberObject(val1)) {
	    return isNumberObject(val2) && objectIs(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
	  }
	  if (isStringObject(val1)) {
	    return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
	  }
	  if (isBooleanObject(val1)) {
	    return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
	  }
	  if (isBigIntObject(val1)) {
	    return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
	  }
	  return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
	}

	// Notes: Type tags are historical [[Class]] properties that can be set by
	// FunctionTemplate::SetClassName() in C++ or Symbol.toStringTag in JS
	// and retrieved using Object.prototype.toString.call(obj) in JS
	// See https://tc39.github.io/ecma262/#sec-object.prototype.tostring
	// for a list of tags pre-defined in the spec.
	// There are some unspecified tags in the wild too (e.g. typed array tags).
	// Since tags can be altered, they only serve fast failures
	//
	// Typed arrays and buffers are checked by comparing the content in their
	// underlying ArrayBuffer. This optimization requires that it's
	// reasonable to interpret their underlying memory in the same way,
	// which is checked by comparing their type tags.
	// (e.g. a Uint8Array and a Uint16Array with the same memory content
	// could still be different because they will be interpreted differently).
	//
	// For strict comparison, objects should have
	// a) The same built-in type tags
	// b) The same prototypes.

	function innerDeepEqual(val1, val2, strict, memos) {
	  // All identical values are equivalent, as determined by ===.
	  if (val1 === val2) {
	    if (val1 !== 0) return true;
	    return strict ? objectIs(val1, val2) : true;
	  }

	  // Check more closely if val1 and val2 are equal.
	  if (strict) {
	    if (_typeof(val1) !== 'object') {
	      return typeof val1 === 'number' && numberIsNaN(val1) && numberIsNaN(val2);
	    }
	    if (_typeof(val2) !== 'object' || val1 === null || val2 === null) {
	      return false;
	    }
	    if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
	      return false;
	    }
	  } else {
	    if (val1 === null || _typeof(val1) !== 'object') {
	      if (val2 === null || _typeof(val2) !== 'object') {
	        // eslint-disable-next-line eqeqeq
	        return val1 == val2;
	      }
	      return false;
	    }
	    if (val2 === null || _typeof(val2) !== 'object') {
	      return false;
	    }
	  }
	  var val1Tag = objectToString(val1);
	  var val2Tag = objectToString(val2);
	  if (val1Tag !== val2Tag) {
	    return false;
	  }
	  if (Array.isArray(val1)) {
	    // Check for sparse arrays and general fast path
	    if (val1.length !== val2.length) {
	      return false;
	    }
	    var keys1 = getOwnNonIndexProperties(val1);
	    var keys2 = getOwnNonIndexProperties(val2);
	    if (keys1.length !== keys2.length) {
	      return false;
	    }
	    return keyCheck(val1, val2, strict, memos, kIsArray, keys1);
	  }
	  // [browserify] This triggers on certain types in IE (Map/Set) so we don't
	  // wan't to early return out of the rest of the checks. However we can check
	  // if the second value is one of these values and the first isn't.
	  if (val1Tag === '[object Object]') {
	    // return keyCheck(val1, val2, strict, memos, kNoIterator);
	    if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
	      return false;
	    }
	  }
	  if (isDate(val1)) {
	    if (!isDate(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
	      return false;
	    }
	  } else if (isRegExp(val1)) {
	    if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
	      return false;
	    }
	  } else if (isNativeError(val1) || val1 instanceof Error) {
	    // Do not compare the stack as it might differ even though the error itself
	    // is otherwise identical.
	    if (val1.message !== val2.message || val1.name !== val2.name) {
	      return false;
	    }
	  } else if (isArrayBufferView(val1)) {
	    if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
	      if (!areSimilarFloatArrays(val1, val2)) {
	        return false;
	      }
	    } else if (!areSimilarTypedArrays(val1, val2)) {
	      return false;
	    }
	    // Buffer.compare returns true, so val1.length === val2.length. If they both
	    // only contain numeric keys, we don't need to exam further than checking
	    // the symbols.
	    var _keys = getOwnNonIndexProperties(val1);
	    var _keys2 = getOwnNonIndexProperties(val2);
	    if (_keys.length !== _keys2.length) {
	      return false;
	    }
	    return keyCheck(val1, val2, strict, memos, kNoIterator, _keys);
	  } else if (isSet(val1)) {
	    if (!isSet(val2) || val1.size !== val2.size) {
	      return false;
	    }
	    return keyCheck(val1, val2, strict, memos, kIsSet);
	  } else if (isMap(val1)) {
	    if (!isMap(val2) || val1.size !== val2.size) {
	      return false;
	    }
	    return keyCheck(val1, val2, strict, memos, kIsMap);
	  } else if (isAnyArrayBuffer(val1)) {
	    if (!areEqualArrayBuffers(val1, val2)) {
	      return false;
	    }
	  } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
	    return false;
	  }
	  return keyCheck(val1, val2, strict, memos, kNoIterator);
	}
	function getEnumerables(val, keys) {
	  return keys.filter(function (k) {
	    return propertyIsEnumerable(val, k);
	  });
	}
	function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
	  // For all remaining Object pairs, including Array, objects and Maps,
	  // equivalence is determined by having:
	  // a) The same number of owned enumerable properties
	  // b) The same set of keys/indexes (although not necessarily the same order)
	  // c) Equivalent values for every corresponding key/index
	  // d) For Sets and Maps, equal contents
	  // Note: this accounts for both named and indexed properties on Arrays.
	  if (arguments.length === 5) {
	    aKeys = Object.keys(val1);
	    var bKeys = Object.keys(val2);

	    // The pair must have the same number of owned properties.
	    if (aKeys.length !== bKeys.length) {
	      return false;
	    }
	  }

	  // Cheap key test
	  var i = 0;
	  for (; i < aKeys.length; i++) {
	    if (!hasOwnProperty(val2, aKeys[i])) {
	      return false;
	    }
	  }
	  if (strict && arguments.length === 5) {
	    var symbolKeysA = objectGetOwnPropertySymbols(val1);
	    if (symbolKeysA.length !== 0) {
	      var count = 0;
	      for (i = 0; i < symbolKeysA.length; i++) {
	        var key = symbolKeysA[i];
	        if (propertyIsEnumerable(val1, key)) {
	          if (!propertyIsEnumerable(val2, key)) {
	            return false;
	          }
	          aKeys.push(key);
	          count++;
	        } else if (propertyIsEnumerable(val2, key)) {
	          return false;
	        }
	      }
	      var symbolKeysB = objectGetOwnPropertySymbols(val2);
	      if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
	        return false;
	      }
	    } else {
	      var _symbolKeysB = objectGetOwnPropertySymbols(val2);
	      if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
	        return false;
	      }
	    }
	  }
	  if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
	    return true;
	  }

	  // Use memos to handle cycles.
	  if (memos === undefined) {
	    memos = {
	      val1: new Map(),
	      val2: new Map(),
	      position: 0
	    };
	  } else {
	    // We prevent up to two map.has(x) calls by directly retrieving the value
	    // and checking for undefined. The map can only contain numbers, so it is
	    // safe to check for undefined only.
	    var val2MemoA = memos.val1.get(val1);
	    if (val2MemoA !== undefined) {
	      var val2MemoB = memos.val2.get(val2);
	      if (val2MemoB !== undefined) {
	        return val2MemoA === val2MemoB;
	      }
	    }
	    memos.position++;
	  }
	  memos.val1.set(val1, memos.position);
	  memos.val2.set(val2, memos.position);
	  var areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType);
	  memos.val1.delete(val1);
	  memos.val2.delete(val2);
	  return areEq;
	}
	function setHasEqualElement(set, val1, strict, memo) {
	  // Go looking.
	  var setValues = arrayFromSet(set);
	  for (var i = 0; i < setValues.length; i++) {
	    var val2 = setValues[i];
	    if (innerDeepEqual(val1, val2, strict, memo)) {
	      // Remove the matching element to make sure we do not check that again.
	      set.delete(val2);
	      return true;
	    }
	  }
	  return false;
	}

	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using
	// Sadly it is not possible to detect corresponding values properly in case the
	// type is a string, number, bigint or boolean. The reason is that those values
	// can match lots of different string values (e.g., 1n == '+00001').
	function findLooseMatchingPrimitives(prim) {
	  switch (_typeof(prim)) {
	    case 'undefined':
	      return null;
	    case 'object':
	      // Only pass in null as object!
	      return undefined;
	    case 'symbol':
	      return false;
	    case 'string':
	      prim = +prim;
	    // Loose equal entries exist only if the string is possible to convert to
	    // a regular number and not NaN.
	    // Fall through
	    case 'number':
	      if (numberIsNaN(prim)) {
	        return false;
	      }
	  }
	  return true;
	}
	function setMightHaveLoosePrim(a, b, prim) {
	  var altValue = findLooseMatchingPrimitives(prim);
	  if (altValue != null) return altValue;
	  return b.has(altValue) && !a.has(altValue);
	}
	function mapMightHaveLoosePrim(a, b, prim, item, memo) {
	  var altValue = findLooseMatchingPrimitives(prim);
	  if (altValue != null) {
	    return altValue;
	  }
	  var curB = b.get(altValue);
	  if (curB === undefined && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
	    return false;
	  }
	  return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
	}
	function setEquiv(a, b, strict, memo) {
	  // This is a lazily initiated Set of entries which have to be compared
	  // pairwise.
	  var set = null;
	  var aValues = arrayFromSet(a);
	  for (var i = 0; i < aValues.length; i++) {
	    var val = aValues[i];
	    // Note: Checking for the objects first improves the performance for object
	    // heavy sets but it is a minor slow down for primitives. As they are fast
	    // to check this improves the worst case scenario instead.
	    if (_typeof(val) === 'object' && val !== null) {
	      if (set === null) {
	        set = new Set();
	      }
	      // If the specified value doesn't exist in the second set its an not null
	      // object (or non strict only: a not matching primitive) we'll need to go
	      // hunting for something thats deep-(strict-)equal to it. To make this
	      // O(n log n) complexity we have to copy these values in a new set first.
	      set.add(val);
	    } else if (!b.has(val)) {
	      if (strict) return false;

	      // Fast path to detect missing string, symbol, undefined and null values.
	      if (!setMightHaveLoosePrim(a, b, val)) {
	        return false;
	      }
	      if (set === null) {
	        set = new Set();
	      }
	      set.add(val);
	    }
	  }
	  if (set !== null) {
	    var bValues = arrayFromSet(b);
	    for (var _i = 0; _i < bValues.length; _i++) {
	      var _val = bValues[_i];
	      // We have to check if a primitive value is already
	      // matching and only if it's not, go hunting for it.
	      if (_typeof(_val) === 'object' && _val !== null) {
	        if (!setHasEqualElement(set, _val, strict, memo)) return false;
	      } else if (!strict && !a.has(_val) && !setHasEqualElement(set, _val, strict, memo)) {
	        return false;
	      }
	    }
	    return set.size === 0;
	  }
	  return true;
	}
	function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
	  // To be able to handle cases like:
	  //   Map([[{}, 'a'], [{}, 'b']]) vs Map([[{}, 'b'], [{}, 'a']])
	  // ... we need to consider *all* matching keys, not just the first we find.
	  var setValues = arrayFromSet(set);
	  for (var i = 0; i < setValues.length; i++) {
	    var key2 = setValues[i];
	    if (innerDeepEqual(key1, key2, strict, memo) && innerDeepEqual(item1, map.get(key2), strict, memo)) {
	      set.delete(key2);
	      return true;
	    }
	  }
	  return false;
	}
	function mapEquiv(a, b, strict, memo) {
	  var set = null;
	  var aEntries = arrayFromMap(a);
	  for (var i = 0; i < aEntries.length; i++) {
	    var _aEntries$i = _slicedToArray(aEntries[i], 2),
	      key = _aEntries$i[0],
	      item1 = _aEntries$i[1];
	    if (_typeof(key) === 'object' && key !== null) {
	      if (set === null) {
	        set = new Set();
	      }
	      set.add(key);
	    } else {
	      // By directly retrieving the value we prevent another b.has(key) check in
	      // almost all possible cases.
	      var item2 = b.get(key);
	      if (item2 === undefined && !b.has(key) || !innerDeepEqual(item1, item2, strict, memo)) {
	        if (strict) return false;
	        // Fast path to detect missing string, symbol, undefined and null
	        // keys.
	        if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) return false;
	        if (set === null) {
	          set = new Set();
	        }
	        set.add(key);
	      }
	    }
	  }
	  if (set !== null) {
	    var bEntries = arrayFromMap(b);
	    for (var _i2 = 0; _i2 < bEntries.length; _i2++) {
	      var _bEntries$_i = _slicedToArray(bEntries[_i2], 2),
	        _key = _bEntries$_i[0],
	        item = _bEntries$_i[1];
	      if (_typeof(_key) === 'object' && _key !== null) {
	        if (!mapHasEqualEntry(set, a, _key, item, strict, memo)) return false;
	      } else if (!strict && (!a.has(_key) || !innerDeepEqual(a.get(_key), item, false, memo)) && !mapHasEqualEntry(set, a, _key, item, false, memo)) {
	        return false;
	      }
	    }
	    return set.size === 0;
	  }
	  return true;
	}
	function objEquiv(a, b, strict, keys, memos, iterationType) {
	  // Sets and maps don't have their entries accessible via normal object
	  // properties.
	  var i = 0;
	  if (iterationType === kIsSet) {
	    if (!setEquiv(a, b, strict, memos)) {
	      return false;
	    }
	  } else if (iterationType === kIsMap) {
	    if (!mapEquiv(a, b, strict, memos)) {
	      return false;
	    }
	  } else if (iterationType === kIsArray) {
	    for (; i < a.length; i++) {
	      if (hasOwnProperty(a, i)) {
	        if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict, memos)) {
	          return false;
	        }
	      } else if (hasOwnProperty(b, i)) {
	        return false;
	      } else {
	        // Array is sparse.
	        var keysA = Object.keys(a);
	        for (; i < keysA.length; i++) {
	          var key = keysA[i];
	          if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict, memos)) {
	            return false;
	          }
	        }
	        if (keysA.length !== Object.keys(b).length) {
	          return false;
	        }
	        return true;
	      }
	    }
	  }

	  // The pair must have equivalent values for every corresponding key.
	  // Possibly expensive deep test:
	  for (i = 0; i < keys.length; i++) {
	    var _key2 = keys[i];
	    if (!innerDeepEqual(a[_key2], b[_key2], strict, memos)) {
	      return false;
	    }
	  }
	  return true;
	}
	function isDeepEqual(val1, val2) {
	  return innerDeepEqual(val1, val2, kLoose);
	}
	function isDeepStrictEqual(val1, val2) {
	  return innerDeepEqual(val1, val2, kStrict);
	}
	comparisons = {
	  isDeepEqual: isDeepEqual,
	  isDeepStrictEqual: isDeepStrictEqual
	};
	return comparisons;
}

var hasRequiredAssert;

function requireAssert () {
	if (hasRequiredAssert) return assert$1.exports;
	hasRequiredAssert = 1;

	function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
	function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	var _require = requireErrors(),
	  _require$codes = _require.codes,
	  ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT,
	  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
	  ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE,
	  ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE,
	  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;
	var AssertionError = requireAssertion_error();
	var _require2 = util$3,
	  inspect = _require2.inspect;
	var _require$types = util$3.types,
	  isPromise = _require$types.isPromise,
	  isRegExp = _require$types.isRegExp;
	var objectAssign = polyfill$2();
	var objectIs = polyfill$1();
	var RegExpPrototypeTest = callBound$3('RegExp.prototype.test');
	var isDeepEqual;
	var isDeepStrictEqual;
	function lazyLoadComparison() {
	  var comparison = requireComparisons();
	  isDeepEqual = comparison.isDeepEqual;
	  isDeepStrictEqual = comparison.isDeepStrictEqual;
	}
	var warned = false;

	// The assert module provides functions that throw
	// AssertionError's when particular conditions are not met. The
	// assert module must conform to the following interface.

	var assert = assert$1.exports = ok;
	var NO_EXCEPTION_SENTINEL = {};

	// All of the following functions must throw an AssertionError
	// when a corresponding condition is not met, with a message that
	// may be undefined if not provided. All assertion methods provide
	// both the actual and expected values to the assertion error for
	// display purposes.

	function innerFail(obj) {
	  if (obj.message instanceof Error) throw obj.message;
	  throw new AssertionError(obj);
	}
	function fail(actual, expected, message, operator, stackStartFn) {
	  var argsLen = arguments.length;
	  var internalMessage;
	  if (argsLen === 0) {
	    internalMessage = 'Failed';
	  } else if (argsLen === 1) {
	    message = actual;
	    actual = undefined;
	  } else {
	    if (warned === false) {
	      warned = true;
	      var warn = process$1.emitWarning ? process$1.emitWarning : console.warn.bind(console);
	      warn('assert.fail() with more than one argument is deprecated. ' + 'Please use assert.strictEqual() instead or only pass a message.', 'DeprecationWarning', 'DEP0094');
	    }
	    if (argsLen === 2) operator = '!=';
	  }
	  if (message instanceof Error) throw message;
	  var errArgs = {
	    actual: actual,
	    expected: expected,
	    operator: operator === undefined ? 'fail' : operator,
	    stackStartFn: stackStartFn || fail
	  };
	  if (message !== undefined) {
	    errArgs.message = message;
	  }
	  var err = new AssertionError(errArgs);
	  if (internalMessage) {
	    err.message = internalMessage;
	    err.generatedMessage = true;
	  }
	  throw err;
	}
	assert.fail = fail;

	// The AssertionError is defined in internal/error.
	assert.AssertionError = AssertionError;
	function innerOk(fn, argLen, value, message) {
	  if (!value) {
	    var generatedMessage = false;
	    if (argLen === 0) {
	      generatedMessage = true;
	      message = 'No value argument passed to `assert.ok()`';
	    } else if (message instanceof Error) {
	      throw message;
	    }
	    var err = new AssertionError({
	      actual: value,
	      expected: true,
	      message: message,
	      operator: '==',
	      stackStartFn: fn
	    });
	    err.generatedMessage = generatedMessage;
	    throw err;
	  }
	}

	// Pure assertion tests whether a value is truthy, as determined
	// by !!value.
	function ok() {
	  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	    args[_key] = arguments[_key];
	  }
	  innerOk.apply(void 0, [ok, args.length].concat(args));
	}
	assert.ok = ok;

	// The equality assertion tests shallow, coercive equality with ==.
	/* eslint-disable no-restricted-properties */
	assert.equal = function equal(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  // eslint-disable-next-line eqeqeq
	  if (actual != expected) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: '==',
	      stackStartFn: equal
	    });
	  }
	};

	// The non-equality assertion tests for whether two objects are not
	// equal with !=.
	assert.notEqual = function notEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  // eslint-disable-next-line eqeqeq
	  if (actual == expected) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: '!=',
	      stackStartFn: notEqual
	    });
	  }
	};

	// The equivalence assertion tests a deep equality relation.
	assert.deepEqual = function deepEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (isDeepEqual === undefined) lazyLoadComparison();
	  if (!isDeepEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'deepEqual',
	      stackStartFn: deepEqual
	    });
	  }
	};

	// The non-equivalence assertion tests for any deep inequality.
	assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (isDeepEqual === undefined) lazyLoadComparison();
	  if (isDeepEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notDeepEqual',
	      stackStartFn: notDeepEqual
	    });
	  }
	};
	/* eslint-enable */

	assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (isDeepEqual === undefined) lazyLoadComparison();
	  if (!isDeepStrictEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'deepStrictEqual',
	      stackStartFn: deepStrictEqual
	    });
	  }
	};
	assert.notDeepStrictEqual = notDeepStrictEqual;
	function notDeepStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (isDeepEqual === undefined) lazyLoadComparison();
	  if (isDeepStrictEqual(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notDeepStrictEqual',
	      stackStartFn: notDeepStrictEqual
	    });
	  }
	}
	assert.strictEqual = function strictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (!objectIs(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'strictEqual',
	      stackStartFn: strictEqual
	    });
	  }
	};
	assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
	  if (arguments.length < 2) {
	    throw new ERR_MISSING_ARGS('actual', 'expected');
	  }
	  if (objectIs(actual, expected)) {
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: 'notStrictEqual',
	      stackStartFn: notStrictEqual
	    });
	  }
	};
	var Comparison = /*#__PURE__*/_createClass(function Comparison(obj, keys, actual) {
	  var _this = this;
	  _classCallCheck(this, Comparison);
	  keys.forEach(function (key) {
	    if (key in obj) {
	      if (actual !== undefined && typeof actual[key] === 'string' && isRegExp(obj[key]) && RegExpPrototypeTest(obj[key], actual[key])) {
	        _this[key] = actual[key];
	      } else {
	        _this[key] = obj[key];
	      }
	    }
	  });
	});
	function compareExceptionKey(actual, expected, key, message, keys, fn) {
	  if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
	    if (!message) {
	      // Create placeholder objects to create a nice output.
	      var a = new Comparison(actual, keys);
	      var b = new Comparison(expected, keys, actual);
	      var err = new AssertionError({
	        actual: a,
	        expected: b,
	        operator: 'deepStrictEqual',
	        stackStartFn: fn
	      });
	      err.actual = actual;
	      err.expected = expected;
	      err.operator = fn.name;
	      throw err;
	    }
	    innerFail({
	      actual: actual,
	      expected: expected,
	      message: message,
	      operator: fn.name,
	      stackStartFn: fn
	    });
	  }
	}
	function expectedException(actual, expected, msg, fn) {
	  if (typeof expected !== 'function') {
	    if (isRegExp(expected)) return RegExpPrototypeTest(expected, actual);
	    // assert.doesNotThrow does not accept objects.
	    if (arguments.length === 2) {
	      throw new ERR_INVALID_ARG_TYPE('expected', ['Function', 'RegExp'], expected);
	    }

	    // Handle primitives properly.
	    if (_typeof(actual) !== 'object' || actual === null) {
	      var err = new AssertionError({
	        actual: actual,
	        expected: expected,
	        message: msg,
	        operator: 'deepStrictEqual',
	        stackStartFn: fn
	      });
	      err.operator = fn.name;
	      throw err;
	    }
	    var keys = Object.keys(expected);
	    // Special handle errors to make sure the name and the message are compared
	    // as well.
	    if (expected instanceof Error) {
	      keys.push('name', 'message');
	    } else if (keys.length === 0) {
	      throw new ERR_INVALID_ARG_VALUE('error', expected, 'may not be an empty object');
	    }
	    if (isDeepEqual === undefined) lazyLoadComparison();
	    keys.forEach(function (key) {
	      if (typeof actual[key] === 'string' && isRegExp(expected[key]) && RegExpPrototypeTest(expected[key], actual[key])) {
	        return;
	      }
	      compareExceptionKey(actual, expected, key, msg, keys, fn);
	    });
	    return true;
	  }
	  // Guard instanceof against arrow functions as they don't have a prototype.
	  if (expected.prototype !== undefined && actual instanceof expected) {
	    return true;
	  }
	  if (Error.isPrototypeOf(expected)) {
	    return false;
	  }
	  return expected.call({}, actual) === true;
	}
	function getActual(fn) {
	  if (typeof fn !== 'function') {
	    throw new ERR_INVALID_ARG_TYPE('fn', 'Function', fn);
	  }
	  try {
	    fn();
	  } catch (e) {
	    return e;
	  }
	  return NO_EXCEPTION_SENTINEL;
	}
	function checkIsPromise(obj) {
	  // Accept native ES6 promises and promises that are implemented in a similar
	  // way. Do not accept thenables that use a function as `obj` and that have no
	  // `catch` handler.

	  // TODO: thenables are checked up until they have the correct methods,
	  // but according to documentation, the `then` method should receive
	  // the `fulfill` and `reject` arguments as well or it may be never resolved.

	  return isPromise(obj) || obj !== null && _typeof(obj) === 'object' && typeof obj.then === 'function' && typeof obj.catch === 'function';
	}
	function waitForActual(promiseFn) {
	  return Promise.resolve().then(function () {
	    var resultPromise;
	    if (typeof promiseFn === 'function') {
	      // Return a rejected promise if `promiseFn` throws synchronously.
	      resultPromise = promiseFn();
	      // Fail in case no promise is returned.
	      if (!checkIsPromise(resultPromise)) {
	        throw new ERR_INVALID_RETURN_VALUE('instance of Promise', 'promiseFn', resultPromise);
	      }
	    } else if (checkIsPromise(promiseFn)) {
	      resultPromise = promiseFn;
	    } else {
	      throw new ERR_INVALID_ARG_TYPE('promiseFn', ['Function', 'Promise'], promiseFn);
	    }
	    return Promise.resolve().then(function () {
	      return resultPromise;
	    }).then(function () {
	      return NO_EXCEPTION_SENTINEL;
	    }).catch(function (e) {
	      return e;
	    });
	  });
	}
	function expectsError(stackStartFn, actual, error, message) {
	  if (typeof error === 'string') {
	    if (arguments.length === 4) {
	      throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
	    }
	    if (_typeof(actual) === 'object' && actual !== null) {
	      if (actual.message === error) {
	        throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error message \"".concat(actual.message, "\" is identical to the message."));
	      }
	    } else if (actual === error) {
	      throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error \"".concat(actual, "\" is identical to the message."));
	    }
	    message = error;
	    error = undefined;
	  } else if (error != null && _typeof(error) !== 'object' && typeof error !== 'function') {
	    throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
	  }
	  if (actual === NO_EXCEPTION_SENTINEL) {
	    var details = '';
	    if (error && error.name) {
	      details += " (".concat(error.name, ")");
	    }
	    details += message ? ": ".concat(message) : '.';
	    var fnType = stackStartFn.name === 'rejects' ? 'rejection' : 'exception';
	    innerFail({
	      actual: undefined,
	      expected: error,
	      operator: stackStartFn.name,
	      message: "Missing expected ".concat(fnType).concat(details),
	      stackStartFn: stackStartFn
	    });
	  }
	  if (error && !expectedException(actual, error, message, stackStartFn)) {
	    throw actual;
	  }
	}
	function expectsNoError(stackStartFn, actual, error, message) {
	  if (actual === NO_EXCEPTION_SENTINEL) return;
	  if (typeof error === 'string') {
	    message = error;
	    error = undefined;
	  }
	  if (!error || expectedException(actual, error)) {
	    var details = message ? ": ".concat(message) : '.';
	    var fnType = stackStartFn.name === 'doesNotReject' ? 'rejection' : 'exception';
	    innerFail({
	      actual: actual,
	      expected: error,
	      operator: stackStartFn.name,
	      message: "Got unwanted ".concat(fnType).concat(details, "\n") + "Actual message: \"".concat(actual && actual.message, "\""),
	      stackStartFn: stackStartFn
	    });
	  }
	  throw actual;
	}
	assert.throws = function throws(promiseFn) {
	  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	    args[_key2 - 1] = arguments[_key2];
	  }
	  expectsError.apply(void 0, [throws, getActual(promiseFn)].concat(args));
	};
	assert.rejects = function rejects(promiseFn) {
	  for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
	    args[_key3 - 1] = arguments[_key3];
	  }
	  return waitForActual(promiseFn).then(function (result) {
	    return expectsError.apply(void 0, [rejects, result].concat(args));
	  });
	};
	assert.doesNotThrow = function doesNotThrow(fn) {
	  for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
	    args[_key4 - 1] = arguments[_key4];
	  }
	  expectsNoError.apply(void 0, [doesNotThrow, getActual(fn)].concat(args));
	};
	assert.doesNotReject = function doesNotReject(fn) {
	  for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
	    args[_key5 - 1] = arguments[_key5];
	  }
	  return waitForActual(fn).then(function (result) {
	    return expectsNoError.apply(void 0, [doesNotReject, result].concat(args));
	  });
	};
	assert.ifError = function ifError(err) {
	  if (err !== null && err !== undefined) {
	    var message = 'ifError got unwanted exception: ';
	    if (_typeof(err) === 'object' && typeof err.message === 'string') {
	      if (err.message.length === 0 && err.constructor) {
	        message += err.constructor.name;
	      } else {
	        message += err.message;
	      }
	    } else {
	      message += inspect(err);
	    }
	    var newErr = new AssertionError({
	      actual: err,
	      expected: null,
	      operator: 'ifError',
	      message: message,
	      stackStartFn: ifError
	    });

	    // Make sure we actually have a stack trace!
	    var origStack = err.stack;
	    if (typeof origStack === 'string') {
	      // This will remove any duplicated frames from the error frames taken
	      // from within `ifError` and add the original error frames to the newly
	      // created ones.
	      var tmp2 = origStack.split('\n');
	      tmp2.shift();
	      // Filter all frames existing in err.stack.
	      var tmp1 = newErr.stack.split('\n');
	      for (var i = 0; i < tmp2.length; i++) {
	        // Find the first occurrence of the frame.
	        var pos = tmp1.indexOf(tmp2[i]);
	        if (pos !== -1) {
	          // Only keep new frames.
	          tmp1 = tmp1.slice(0, pos);
	          break;
	        }
	      }
	      newErr.stack = "".concat(tmp1.join('\n'), "\n").concat(tmp2.join('\n'));
	    }
	    throw newErr;
	  }
	};

	// Currently in sync with Node.js lib/assert.js
	// https://github.com/nodejs/node/commit/2a871df3dfb8ea663ef5e1f8f62701ec51384ecb
	function internalMatch(string, regexp, message, fn, fnName) {
	  if (!isRegExp(regexp)) {
	    throw new ERR_INVALID_ARG_TYPE('regexp', 'RegExp', regexp);
	  }
	  var match = fnName === 'match';
	  if (typeof string !== 'string' || RegExpPrototypeTest(regexp, string) !== match) {
	    if (message instanceof Error) {
	      throw message;
	    }
	    var generatedMessage = !message;

	    // 'The input was expected to not match the regular expression ' +
	    message = message || (typeof string !== 'string' ? 'The "string" argument must be of type string. Received type ' + "".concat(_typeof(string), " (").concat(inspect(string), ")") : (match ? 'The input did not match the regular expression ' : 'The input was expected to not match the regular expression ') + "".concat(inspect(regexp), ". Input:\n\n").concat(inspect(string), "\n"));
	    var err = new AssertionError({
	      actual: string,
	      expected: regexp,
	      message: message,
	      operator: fnName,
	      stackStartFn: fn
	    });
	    err.generatedMessage = generatedMessage;
	    throw err;
	  }
	}
	assert.match = function match(string, regexp, message) {
	  internalMatch(string, regexp, message, match, 'match');
	};
	assert.doesNotMatch = function doesNotMatch(string, regexp, message) {
	  internalMatch(string, regexp, message, doesNotMatch, 'doesNotMatch');
	};

	// Expose a strict only variant of assert
	function strict() {
	  for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
	    args[_key6] = arguments[_key6];
	  }
	  innerOk.apply(void 0, [strict, args.length].concat(args));
	}
	assert.strict = objectAssign(strict, assert, {
	  equal: assert.strictEqual,
	  deepEqual: assert.deepStrictEqual,
	  notEqual: assert.notStrictEqual,
	  notDeepEqual: assert.notDeepStrictEqual
	});
	assert.strict.strict = assert.strict;
	return assert$1.exports;
}

var lib$2 = {};

var decoder = {};

var utils$2 = {};

Object.defineProperty(utils$2, "__esModule", { value: true });
const concat2$1 = (a, b) => {
    return (a << 8) | b;
};
const concat3$1 = (a, b, c) => {
    return (a << 16) | (b << 8) | c;
};
const concat4$1 = (a, b, c, d) => {
    return (a << 24) | (b << 16) | (c << 8) | d;
};
const legacyErrorMessage$1 = `Maxmind v2 module has changed API.\n\
Upgrade instructions can be found here: \
https://github.com/runk/node-maxmind/wiki/Migration-guide\n\
If you want to use legacy library then explicitly install maxmind@1`;
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
utils$2.default = {
    assert,
    concat2: concat2$1,
    concat3: concat3$1,
    concat4: concat4$1,
    legacyErrorMessage: legacyErrorMessage$1,
};

var __importDefault$4 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(decoder, "__esModule", { value: true });
const utils_1$1 = __importDefault$4(utils$2);
utils_1$1.default.assert(typeof BigInt !== 'undefined', 'Apparently you are using old version of node. Please upgrade to node 10.4.x or above.');
var DataType;
(function (DataType) {
    DataType[DataType["Extended"] = 0] = "Extended";
    DataType[DataType["Pointer"] = 1] = "Pointer";
    DataType[DataType["Utf8String"] = 2] = "Utf8String";
    DataType[DataType["Double"] = 3] = "Double";
    DataType[DataType["Bytes"] = 4] = "Bytes";
    DataType[DataType["Uint16"] = 5] = "Uint16";
    DataType[DataType["Uint32"] = 6] = "Uint32";
    DataType[DataType["Map"] = 7] = "Map";
    DataType[DataType["Int32"] = 8] = "Int32";
    DataType[DataType["Uint64"] = 9] = "Uint64";
    DataType[DataType["Uint128"] = 10] = "Uint128";
    DataType[DataType["Array"] = 11] = "Array";
    DataType[DataType["Container"] = 12] = "Container";
    DataType[DataType["EndMarker"] = 13] = "EndMarker";
    DataType[DataType["Boolean"] = 14] = "Boolean";
    DataType[DataType["Float"] = 15] = "Float";
})(DataType || (DataType = {}));
const pointerValueOffset = [0, 2048, 526336, 0];
const noCache = {
    get: () => undefined,
    set: () => undefined,
};
const cursor = (value, offset) => ({ value, offset });
class Decoder {
    constructor(db, baseOffset = 0, cache = noCache) {
        this.telemetry = {};
        utils_1$1.default.assert(Boolean(db), 'Database buffer is required');
        this.db = db;
        this.baseOffset = baseOffset;
        this.cache = cache;
    }
    decode(offset) {
        let tmp;
        const ctrlByte = this.db[offset++];
        let type = ctrlByte >> 5;
        if (type === DataType.Pointer) {
            tmp = this.decodePointer(ctrlByte, offset);
            return cursor(this.decodeFast(tmp.value).value, tmp.offset);
        }
        if (type === DataType.Extended) {
            tmp = this.db[offset] + 7;
            if (tmp < 8) {
                throw new Error('Invalid Extended Type at offset ' + offset + ' val ' + tmp);
            }
            type = tmp;
            offset++;
        }
        const size = this.sizeFromCtrlByte(ctrlByte, offset);
        return this.decodeByType(type, size.offset, size.value);
    }
    decodeFast(offset) {
        const cached = this.cache.get(offset);
        if (cached) {
            return cached;
        }
        const result = this.decode(offset);
        this.cache.set(offset, result);
        return result;
    }
    decodeByType(type, offset, size) {
        const newOffset = offset + size;
        // ipv4 types occurrence stats:
        // 3618591 x utf8_string
        // 448163 x map
        // 175085 x uint32
        // 83040 x double
        // 24745 x array
        // 3 x uint16
        // 1 x uint64
        // 14 x boolean
        switch (type) {
            case DataType.Utf8String:
                return cursor(this.decodeString(offset, size), newOffset);
            case DataType.Map:
                return this.decodeMap(size, offset);
            case DataType.Uint32:
                return cursor(this.decodeUint(offset, size), newOffset);
            case DataType.Double:
                return cursor(this.decodeDouble(offset), newOffset);
            case DataType.Array:
                return this.decodeArray(size, offset);
            case DataType.Boolean:
                return cursor(this.decodeBoolean(size), offset);
            case DataType.Float:
                return cursor(this.decodeFloat(offset), newOffset);
            case DataType.Bytes:
                return cursor(this.decodeBytes(offset, size), newOffset);
            case DataType.Uint16:
                return cursor(this.decodeUint(offset, size), newOffset);
            case DataType.Int32:
                return cursor(this.decodeInt32(offset, size), newOffset);
            case DataType.Uint64:
                return cursor(this.decodeUint(offset, size), newOffset);
            case DataType.Uint128:
                return cursor(this.decodeUint(offset, size), newOffset);
        }
        throw new Error('Unknown type ' + type + ' at offset ' + offset);
    }
    sizeFromCtrlByte(ctrlByte, offset) {
        // The first three bits of the control byte tell you what type the field is. If
        // these bits are all 0, then this is an "extended" type, which means that the
        // *next* byte contains the actual type. Otherwise, the first three bits will
        // contain a number from 1 to 7, the actual type for the field.
        // var type = ctrlByte >> 3;
        // The next five bits in the control byte tell you how long the data field's
        // payload is, except for maps and pointers. Maps and pointers use this size
        // information a bit differently.``
        const size = ctrlByte & 0x1f;
        // If the five bits are smaller than 29, then those bits are the payload size in
        // bytes. For example:
        //   01000010          UTF-8 string - 2 bytes long
        //   01011100          UTF-8 string - 28 bytes long
        //   11000001          unsigned 32-bit int - 1 byte long
        //   00000011 00000011 unsigned 128-bit int - 3 bytes long
        if (size < 29) {
            return cursor(size, offset);
        }
        // If the value is 29, then the size is 29 + *the next byte after the type
        // specifying bytes as an unsigned integer*.
        if (size === 29) {
            return cursor(29 + this.db[offset], offset + 1);
        }
        // If the value is 30, then the size is 285 + *the next two bytes after the type
        // specifying bytes as a single unsigned integer*.
        if (size === 30) {
            return cursor(285 + this.db.readUInt16BE(offset), offset + 2);
        }
        // At this point `size` is always 31.
        // If the value is 31, then the size is 65,821 + *the next three bytes after the
        // type specifying bytes as a single unsigned integer*.
        return cursor(65821 +
            utils_1$1.default.concat3(this.db[offset], this.db[offset + 1], this.db[offset + 2]), offset + 3);
    }
    decodeBytes(offset, size) {
        return this.db.slice(offset, offset + size);
    }
    decodePointer(ctrlByte, offset) {
        // Pointers use the last five bits in the control byte to calculate the pointer value.
        // To calculate the pointer value, we start by subdividing the five bits into two
        // groups. The first two bits indicate the size, and the next three bits are part
        // of the value, so we end up with a control byte breaking down like this:
        // 001SSVVV.
        const pointerSize = (ctrlByte >> 3) & 3;
        const pointer = this.baseOffset + pointerValueOffset[pointerSize];
        let packed = 0;
        // The size can be 0, 1, 2, or 3.
        // If the size is 0, the pointer is built by appending the next byte to the last
        // three bits to produce an 11-bit value.
        if (pointerSize === 0) {
            packed = utils_1$1.default.concat2(ctrlByte & 7, this.db[offset]);
            // If the size is 1, the pointer is built by appending the next two bytes to the
            // last three bits to produce a 19-bit value + 2048.
        }
        else if (pointerSize === 1) {
            packed = utils_1$1.default.concat3(ctrlByte & 7, this.db[offset], this.db[offset + 1]);
            // If the size is 2, the pointer is built by appending the next three bytes to the
            // last three bits to produce a 27-bit value + 526336.
        }
        else if (pointerSize === 2) {
            packed = utils_1$1.default.concat4(ctrlByte & 7, this.db[offset], this.db[offset + 1], this.db[offset + 2]);
            // At next point `size` is always 3.
            // Finally, if the size is 3, the pointer's value is contained in the next four
            // bytes as a 32-bit value. In this case, the last three bits of the control byte
            // are ignored.
        }
        else {
            packed = this.db.readUInt32BE(offset);
        }
        offset += pointerSize + 1;
        return cursor(pointer + packed, offset);
    }
    decodeArray(size, offset) {
        let tmp;
        const array = [];
        for (let i = 0; i < size; i++) {
            tmp = this.decode(offset);
            offset = tmp.offset;
            array.push(tmp.value);
        }
        return cursor(array, offset);
    }
    decodeBoolean(size) {
        return size !== 0;
    }
    decodeDouble(offset) {
        return this.db.readDoubleBE(offset);
    }
    decodeFloat(offset) {
        return this.db.readFloatBE(offset);
    }
    decodeMap(size, offset) {
        let tmp;
        let key;
        const map = {};
        for (let i = 0; i < size; i++) {
            tmp = this.decode(offset);
            key = tmp.value;
            tmp = this.decode(tmp.offset);
            offset = tmp.offset;
            map[key] = tmp.value;
        }
        return cursor(map, offset);
    }
    decodeInt32(offset, size) {
        if (size === 0) {
            return 0;
        }
        return this.db.readInt32BE(offset);
    }
    decodeUint(offset, size) {
        switch (size) {
            case 0:
                return 0;
            case 1:
                return this.db[offset];
            case 2:
                return utils_1$1.default.concat2(this.db[offset + 0], this.db[offset + 1]);
            case 3:
                return utils_1$1.default.concat3(this.db[offset + 0], this.db[offset + 1], this.db[offset + 2]);
            case 4:
                return utils_1$1.default.concat4(this.db[offset + 0], this.db[offset + 1], this.db[offset + 2], this.db[offset + 3]);
            case 8:
                return this.decodeBigUint(offset, size);
            case 16:
                return this.decodeBigUint(offset, size);
        }
        return 0;
    }
    decodeString(offset, size) {
        return this.db.slice(offset, offset + size).toString();
    }
    decodeBigUint(offset, size) {
        const buffer = buffer$1.Buffer.alloc(size);
        this.db.copy(buffer, 0, offset, offset + size);
        let integer = BigInt(0);
        const numberOfLongs = size / 4;
        for (let i = 0; i < numberOfLongs; i++) {
            integer =
                integer * BigInt(4294967296) + BigInt(buffer.readUInt32BE(i << 2));
        }
        return integer.toString();
    }
}
decoder.default = Decoder;

var ip$1 = {};

const isIP = function(input) {
    if (exports.isIPv4(input)) {
        return 4;
    } else if (exports.isIPv6(input)) {
        return 6;
    } else {
        return 0;
    }
};
const isIPv4 = function(input) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(input);
};
const isIPv6 = function(input) {
    return /^(([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))$/.test(input);
};

var net = /*#__PURE__*/Object.freeze({
	__proto__: null,
	isIP: isIP,
	isIPv4: isIPv4,
	isIPv6: isIPv6
});

var require$$0$2 = /*@__PURE__*/getAugmentedNamespace(net);

var __importDefault$3 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(ip$1, "__esModule", { value: true });
const net_1$1 = __importDefault$3(require$$0$2);
const parseIPv4$1 = (input) => {
    const ip = input.split('.', 4);
    const o0 = parseInt(ip[0]);
    const o1 = parseInt(ip[1]);
    const o2 = parseInt(ip[2]);
    const o3 = parseInt(ip[3]);
    return [o0, o1, o2, o3];
};
const hex$1 = (v) => {
    const h = parseInt(v, 10).toString(16);
    return h.length === 2 ? h : '0' + h;
};
const parseIPv6$1 = (input) => {
    const addr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let i;
    let parsed;
    let chunk;
    // ipv4 e.g. `::ffff:64.17.254.216`
    const ip = input.indexOf('.') > -1
        ? input.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, (match, a, b, c, d) => {
            return hex$1(a) + hex$1(b) + ':' + hex$1(c) + hex$1(d);
        })
        : input;
    const [left, right] = ip.split('::', 2);
    if (left) {
        parsed = left.split(':');
        for (i = 0; i < parsed.length; i++) {
            chunk = parseInt(parsed[i], 16);
            addr[i * 2] = chunk >> 8;
            addr[i * 2 + 1] = chunk & 0xff;
        }
    }
    if (right) {
        parsed = right.split(':');
        const offset = 16 - parsed.length * 2; // 2 bytes per chunk
        for (i = 0; i < parsed.length; i++) {
            chunk = parseInt(parsed[i], 16);
            addr[offset + i * 2] = chunk >> 8;
            addr[offset + (i * 2 + 1)] = chunk & 0xff;
        }
    }
    return addr;
};
const parse$2 = (ip) => {
    return ip.indexOf(':') === -1 ? parseIPv4$1(ip) : parseIPv6$1(ip);
};
const bitAt$1 = (rawAddress, idx) => {
    // 8 bits per octet in the buffer (>>3 is slightly faster than Math.floor(idx/8))
    const bufIdx = idx >> 3;
    // Offset within the octet (basically equivalent to 8  - (idx % 8))
    const bitIdx = 7 ^ (idx & 7);
    // Shift the offset rightwards by bitIdx bits and & it to grab the bit
    return (rawAddress[bufIdx] >>> bitIdx) & 1;
};
const validate$1 = (ip) => {
    const version = net_1$1.default.isIP(ip);
    return version === 4 || version === 6;
};
ip$1.default = {
    bitAt: bitAt$1,
    parse: parse$2,
    validate: validate$1,
};

var metadata = {};

(function (exports) {
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isLegacyFormat = exports.parseMetadata = void 0;
	const decoder_1 = __importDefault(decoder);
	const utils_1 = __importDefault(utils$2);
	const METADATA_START_MARKER = buffer$1.Buffer.from('ABCDEF4D61784D696E642E636F6D', 'hex');
	const parseMetadata = (db) => {
	    const offset = findStart(db);
	    const decoder = new decoder_1.default(db, offset);
	    const metadata = decoder.decode(offset).value;
	    if (!metadata) {
	        throw new Error((0, exports.isLegacyFormat)(db)
	            ? utils_1.default.legacyErrorMessage
	            : 'Cannot parse binary database');
	    }
	    utils_1.default.assert([24, 28, 32].indexOf(metadata.record_size) > -1, 'Unsupported record size');
	    return {
	        binaryFormatMajorVersion: metadata.binary_format_major_version,
	        binaryFormatMinorVersion: metadata.binary_format_minor_version,
	        buildEpoch: new Date(metadata.build_epoch * 1000),
	        databaseType: metadata.database_type,
	        description: metadata.description,
	        ipVersion: metadata.ip_version,
	        languages: metadata.languages,
	        nodeByteSize: metadata.record_size / 4,
	        nodeCount: metadata.node_count,
	        recordSize: metadata.record_size,
	        searchTreeSize: (metadata.node_count * metadata.record_size) / 4,
	        // Depth depends on the IP version, it's 32 for IPv4 and 128 for IPv6.
	        treeDepth: Math.pow(2, metadata.ip_version + 1),
	    };
	};
	exports.parseMetadata = parseMetadata;
	const findStart = (db) => {
	    let found = 0;
	    let fsize = db.length - 1;
	    const mlen = METADATA_START_MARKER.length - 1;
	    while (found <= mlen && fsize-- > 0) {
	        found += db[fsize] === METADATA_START_MARKER[mlen - found] ? 1 : -found;
	    }
	    return fsize + found;
	};
	const isLegacyFormat = (db) => {
	    const structureInfoMaxSize = 20;
	    for (let i = 0; i < structureInfoMaxSize; i++) {
	        const delim = db.slice(db.length - 3 - i, db.length - i);
	        // Look for [0xff, 0xff, 0xff] metadata delimiter
	        if (delim[0] === 255 && delim[1] === 255 && delim[2] === 255) {
	            return true;
	        }
	    }
	    return false;
	};
	exports.isLegacyFormat = isLegacyFormat; 
} (metadata));

var walker = {};

var __importDefault$2 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(walker, "__esModule", { value: true });
const utils_1 = __importDefault$2(utils$2);
const readNodeRight24 = (db) => (offset) => utils_1.default.concat3(db[offset + 3], db[offset + 4], db[offset + 5]);
const readNodeLeft24 = (db) => (offset) => utils_1.default.concat3(db[offset], db[offset + 1], db[offset + 2]);
const readNodeLeft28 = (db) => (offset) => utils_1.default.concat4(db[offset + 3] >> 4, db[offset], db[offset + 1], db[offset + 2]);
const readNodeRight28 = (db) => (offset) => utils_1.default.concat4(db[offset + 3] & 0x0f, db[offset + 4], db[offset + 5], db[offset + 6]);
const readNodeLeft32 = (db) => (offset) => db.readUInt32BE(offset);
const readNodeRight32 = (db) => (offset) => db.readUInt32BE(offset + 4);
walker.default = (db, recordSize) => {
    switch (recordSize) {
        case 24:
            return { left: readNodeLeft24(db), right: readNodeRight24(db) };
        case 28:
            return { left: readNodeLeft28(db), right: readNodeRight28(db) };
        case 32:
            return { left: readNodeLeft32(db), right: readNodeRight32(db) };
    }
    throw new Error('Unsupported record size');
};

var response = {};

Object.defineProperty(response, "__esModule", { value: true });

(function (exports) {
	var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __exportStar = (commonjsGlobal && commonjsGlobal.__exportStar) || function(m, exports) {
	    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
	};
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Reader = void 0;
	const decoder_1 = __importDefault(decoder);
	const ip_1 = __importDefault(ip$1);
	const metadata_1 = metadata;
	const walker_1 = __importDefault(walker);
	const DATA_SECTION_SEPARATOR_SIZE = 16;
	class Reader {
	    constructor(db, opts = {}) {
	        this.opts = opts;
	        this.load(db);
	    }
	    load(db) {
	        if (!buffer$1.Buffer.isBuffer(db)) {
	            throw new Error(`mmdb-lib expects an instance of Buffer, got: ${typeof db}`);
	        }
	        this.db = db;
	        this.metadata = (0, metadata_1.parseMetadata)(this.db);
	        this.decoder = new decoder_1.default(this.db, this.metadata.searchTreeSize + DATA_SECTION_SEPARATOR_SIZE, this.opts.cache);
	        this.walker = (0, walker_1.default)(this.db, this.metadata.recordSize);
	        this.ipv4StartNodeNumber = this.ipv4Start();
	    }
	    get(ipAddress) {
	        const [data] = this.getWithPrefixLength(ipAddress);
	        return data;
	    }
	    getWithPrefixLength(ipAddress) {
	        const [pointer, prefixLength] = this.findAddressInTree(ipAddress);
	        const data = pointer ? this.resolveDataPointer(pointer) : null;
	        return [data, prefixLength];
	    }
	    findAddressInTree(ipAddress) {
	        const rawAddress = ip_1.default.parse(ipAddress);
	        const nodeCount = this.metadata.nodeCount;
	        const bitLength = rawAddress.length * 8;
	        // Binary search tree consists of certain (`nodeCount`) number of nodes. Tree
	        // depth depends on the ip version, it's 32 for IPv4 and 128 for IPv6. Each
	        // tree node has the same fixed length and usually 6-8 bytes. It consists
	        // of two records, left and right:
	        // |         node        |
	        // | 0x000000 | 0x000000 |
	        let bit;
	        let nodeNumber = 0;
	        let offset;
	        let depth = 0;
	        // When storing IPv4 addresses in an IPv6 tree, they are stored as-is, so they
	        // occupy the first 32-bits of the address space (from 0 to 2**32 - 1).
	        // Which means they're padded with zeros.
	        if (rawAddress.length === 4) {
	            nodeNumber = this.ipv4StartNodeNumber;
	        }
	        // Record value can point to one of three things:
	        // 1. Another node in the tree (most common case)
	        // 2. Data section address with relevant information (less common case)
	        // 3. Point to the value of `nodeCount`, which means IP address is unknown
	        for (; depth < bitLength && nodeNumber < nodeCount; depth++) {
	            bit = ip_1.default.bitAt(rawAddress, depth);
	            offset = nodeNumber * this.metadata.nodeByteSize;
	            nodeNumber = bit ? this.walker.right(offset) : this.walker.left(offset);
	        }
	        if (nodeNumber > nodeCount) {
	            return [nodeNumber, depth];
	        }
	        return [null, depth];
	    }
	    resolveDataPointer(pointer) {
	        // In order to determine where in the file this offset really points to, we also
	        // need to know where the data section starts. This can be calculated by
	        // determining the size of the search tree in bytes and then adding an additional
	        // 16 bytes for the data section separator.
	        // So the final formula to determine the offset in the file is:
	        //     $offset_in_file = ( $record_value - $node_count )
	        //                       + $search_tree_size_in_bytes
	        const resolved = pointer - this.metadata.nodeCount + this.metadata.searchTreeSize;
	        return this.decoder.decodeFast(resolved).value;
	    }
	    ipv4Start() {
	        if (this.metadata.ipVersion === 4) {
	            return 0;
	        }
	        const nodeCount = this.metadata.nodeCount;
	        let pointer = 0;
	        let i = 0;
	        for (; i < 96 && pointer < nodeCount; i++) {
	            const offset = pointer * this.metadata.nodeByteSize;
	            pointer = this.walker.left(offset);
	        }
	        return pointer;
	    }
	}
	exports.Reader = Reader;
	__exportStar(response, exports); 
} (lib$2));

var tinyLru = {};

/**
 * tiny-lru
 *
 * @copyright 2024 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 11.2.11
 */

class LRU {
	constructor (max = 0, ttl = 0, resetTtl = false) {
		this.first = null;
		this.items = Object.create(null);
		this.last = null;
		this.max = max;
		this.resetTtl = resetTtl;
		this.size = 0;
		this.ttl = ttl;
	}

	clear () {
		this.first = null;
		this.items = Object.create(null);
		this.last = null;
		this.size = 0;

		return this;
	}

	delete (key) {
		if (this.has(key)) {
			const item = this.items[key];

			delete this.items[key];
			this.size--;

			if (item.prev !== null) {
				item.prev.next = item.next;
			}

			if (item.next !== null) {
				item.next.prev = item.prev;
			}

			if (this.first === item) {
				this.first = item.next;
			}

			if (this.last === item) {
				this.last = item.prev;
			}
		}

		return this;
	}

	entries (keys = this.keys()) {
		return keys.map(key => [key, this.get(key)]);
	}

	evict (bypass = false) {
		if (bypass || this.size > 0) {
			const item = this.first;

			delete this.items[item.key];

			if (--this.size === 0) {
				this.first = null;
				this.last = null;
			} else {
				this.first = item.next;
				this.first.prev = null;
			}
		}

		return this;
	}

	expiresAt (key) {
		let result;

		if (this.has(key)) {
			result = this.items[key].expiry;
		}

		return result;
	}

	get (key) {
		let result;

		if (this.has(key)) {
			const item = this.items[key];

			if (this.ttl > 0 && item.expiry <= Date.now()) {
				this.delete(key);
			} else {
				result = item.value;
				this.set(key, result, true);
			}
		}

		return result;
	}

	has (key) {
		return key in this.items;
	}

	keys () {
		const result = [];
		let x = this.first;

		while (x !== null) {
			result.push(x.key);
			x = x.next;
		}

		return result;
	}

	set (key, value, bypass = false, resetTtl = this.resetTtl) {
		let item;

		if (bypass || this.has(key)) {
			item = this.items[key];
			item.value = value;

			if (bypass === false && resetTtl) {
				item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
			}

			if (this.last !== item) {
				const last = this.last,
					next = item.next,
					prev = item.prev;

				if (this.first === item) {
					this.first = item.next;
				}

				item.next = null;
				item.prev = this.last;
				last.next = item;

				if (prev !== null) {
					prev.next = next;
				}

				if (next !== null) {
					next.prev = prev;
				}
			}
		} else {
			if (this.max > 0 && this.size === this.max) {
				this.evict(true);
			}

			item = this.items[key] = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key: key,
				prev: this.last,
				next: null,
				value
			};

			if (++this.size === 1) {
				this.first = item;
			} else {
				this.last.next = item;
			}
		}

		this.last = item;

		return this;
	}

	values (keys = this.keys()) {
		return keys.map(key => this.get(key));
	}
}

function lru (max = 1000, ttl = 0, resetTtl = false) {
	if (isNaN(max) || max < 0) {
		throw new TypeError("Invalid max value");
	}

	if (isNaN(ttl) || ttl < 0) {
		throw new TypeError("Invalid ttl value");
	}

	if (typeof resetTtl !== "boolean") {
		throw new TypeError("Invalid resetTtl value");
	}

	return new LRU(max, ttl, resetTtl);
}

tinyLru.LRU = LRU;
tinyLru.lru = lru;

var fs = {};

var lib$1 = {exports: {}};

var Stats$1 = {};

var constants = {};

Object.defineProperty(constants, "__esModule", { value: true });
constants.constants = void 0;
constants.constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_SYMLINK_DIR: 1,
    UV_FS_SYMLINK_JUNCTION: 2,
    UV_FS_COPYFILE_EXCL: 1,
    UV_FS_COPYFILE_FICLONE: 2,
    UV_FS_COPYFILE_FICLONE_FORCE: 4,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4,
};

var getBigInt = {};

if (typeof BigInt === 'function') getBigInt.default = BigInt;
else
  getBigInt.default = function BigIntNotSupported() {
    throw new Error('BigInt is not supported in this environment.');
  };

Object.defineProperty(Stats$1, "__esModule", { value: true });
Stats$1.Stats = void 0;
const constants_1$1 = constants;
const getBigInt_1 = getBigInt;
const { S_IFMT: S_IFMT$1, S_IFDIR: S_IFDIR$1, S_IFREG: S_IFREG$1, S_IFBLK: S_IFBLK$1, S_IFCHR: S_IFCHR$1, S_IFLNK: S_IFLNK$1, S_IFIFO: S_IFIFO$1, S_IFSOCK: S_IFSOCK$1 } = constants_1$1.constants;
/**
 * Statistics about a file/directory, like `fs.Stats`.
 */
class Stats {
    static build(node, bigint = false) {
        const stats = new Stats();
        const { uid, gid, atime, mtime, ctime } = node;
        const getStatNumber = !bigint ? number => number : getBigInt_1.default;
        // Copy all values on Stats from Node, so that if Node values
        // change, values on Stats would still be the old ones,
        // just like in Node fs.
        stats.uid = getStatNumber(uid);
        stats.gid = getStatNumber(gid);
        stats.rdev = getStatNumber(0);
        stats.blksize = getStatNumber(4096);
        stats.ino = getStatNumber(node.ino);
        stats.size = getStatNumber(node.getSize());
        stats.blocks = getStatNumber(1);
        stats.atime = atime;
        stats.mtime = mtime;
        stats.ctime = ctime;
        stats.birthtime = ctime;
        stats.atimeMs = getStatNumber(atime.getTime());
        stats.mtimeMs = getStatNumber(mtime.getTime());
        const ctimeMs = getStatNumber(ctime.getTime());
        stats.ctimeMs = ctimeMs;
        stats.birthtimeMs = ctimeMs;
        stats.dev = getStatNumber(0);
        stats.mode = getStatNumber(node.mode);
        stats.nlink = getStatNumber(node.nlink);
        return stats;
    }
    _checkModeProperty(property) {
        return (Number(this.mode) & S_IFMT$1) === property;
    }
    isDirectory() {
        return this._checkModeProperty(S_IFDIR$1);
    }
    isFile() {
        return this._checkModeProperty(S_IFREG$1);
    }
    isBlockDevice() {
        return this._checkModeProperty(S_IFBLK$1);
    }
    isCharacterDevice() {
        return this._checkModeProperty(S_IFCHR$1);
    }
    isSymbolicLink() {
        return this._checkModeProperty(S_IFLNK$1);
    }
    isFIFO() {
        return this._checkModeProperty(S_IFIFO$1);
    }
    isSocket() {
        return this._checkModeProperty(S_IFSOCK$1);
    }
}
Stats$1.Stats = Stats;
Stats$1.default = Stats;

var Dirent$1 = {};

var encoding = {};

var buffer = {};

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.bufferFrom = exports.bufferAllocUnsafe = exports.Buffer = void 0;
	const buffer_1 = buffer$1;
	Object.defineProperty(exports, "Buffer", { enumerable: true, get: function () { return buffer_1.Buffer; } });
	function bufferV0P12Ponyfill(arg0, ...args) {
	    return new buffer_1.Buffer(arg0, ...args);
	}
	const bufferAllocUnsafe = buffer_1.Buffer.allocUnsafe || bufferV0P12Ponyfill;
	exports.bufferAllocUnsafe = bufferAllocUnsafe;
	const bufferFrom = buffer_1.Buffer.from || bufferV0P12Ponyfill;
	exports.bufferFrom = bufferFrom; 
} (buffer));

var errors = {};

(function (exports) {
	// The whole point behind this internal module is to allow Node.js to no
	// longer be forced to treat every error message change as a semver-major
	// change. The NodeError classes here all expose a `code` property whose
	// value statically and permanently identifies the error. While the error
	// message may change, the code should not.
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.E = exports.AssertionError = exports.message = exports.RangeError = exports.TypeError = exports.Error = void 0;
	const assert = requireAssert();
	const util = util$3;
	const kCode = typeof Symbol === 'undefined' ? '_kCode' : Symbol('code');
	const messages = {}; // new Map();
	function makeNodeError(Base) {
	    return class NodeError extends Base {
	        constructor(key, ...args) {
	            super(message(key, args));
	            this.code = key;
	            this[kCode] = key;
	            this.name = `${super.name} [${this[kCode]}]`;
	        }
	    };
	}
	const g = typeof globalThis !== 'undefined' ? globalThis : commonjsGlobal;
	class AssertionError extends g.Error {
	    constructor(options) {
	        if (typeof options !== 'object' || options === null) {
	            throw new exports.TypeError('ERR_INVALID_ARG_TYPE', 'options', 'object');
	        }
	        if (options.message) {
	            super(options.message);
	        }
	        else {
	            super(`${util.inspect(options.actual).slice(0, 128)} ` +
	                `${options.operator} ${util.inspect(options.expected).slice(0, 128)}`);
	        }
	        this.generatedMessage = !options.message;
	        this.name = 'AssertionError [ERR_ASSERTION]';
	        this.code = 'ERR_ASSERTION';
	        this.actual = options.actual;
	        this.expected = options.expected;
	        this.operator = options.operator;
	        exports.Error.captureStackTrace(this, options.stackStartFunction);
	    }
	}
	exports.AssertionError = AssertionError;
	function message(key, args) {
	    assert.strictEqual(typeof key, 'string');
	    // const msg = messages.get(key);
	    const msg = messages[key];
	    assert(msg, `An invalid error message key was used: ${key}.`);
	    let fmt;
	    if (typeof msg === 'function') {
	        fmt = msg;
	    }
	    else {
	        fmt = util.format;
	        if (args === undefined || args.length === 0)
	            return msg;
	        args.unshift(msg);
	    }
	    return String(fmt.apply(null, args));
	}
	exports.message = message;
	// Utility function for registering the error codes. Only used here. Exported
	// *only* to allow for testing.
	function E(sym, val) {
	    messages[sym] = typeof val === 'function' ? val : String(val);
	}
	exports.E = E;
	exports.Error = makeNodeError(g.Error);
	exports.TypeError = makeNodeError(g.TypeError);
	exports.RangeError = makeNodeError(g.RangeError);
	// To declare an error message, use the E(sym, val) function above. The sym
	// must be an upper case string. The val can be either a function or a string.
	// The return value of the function must be a string.
	// Examples:
	// E('EXAMPLE_KEY1', 'This is the error value');
	// E('EXAMPLE_KEY2', (a, b) => return `${a} ${b}`);
	//
	// Once an error code has been assigned, the code itself MUST NOT change and
	// any given error code must never be reused to identify a different error.
	//
	// Any error code added here should also be added to the documentation
	//
	// Note: Please try to keep these in alphabetical order
	E('ERR_ARG_NOT_ITERABLE', '%s must be iterable');
	E('ERR_ASSERTION', '%s');
	E('ERR_BUFFER_OUT_OF_BOUNDS', bufferOutOfBounds);
	E('ERR_CHILD_CLOSED_BEFORE_REPLY', 'Child closed before reply received');
	E('ERR_CONSOLE_WRITABLE_STREAM', 'Console expects a writable stream instance for %s');
	E('ERR_CPU_USAGE', 'Unable to obtain cpu usage %s');
	E('ERR_DNS_SET_SERVERS_FAILED', (err, servers) => `c-ares failed to set servers: "${err}" [${servers}]`);
	E('ERR_FALSY_VALUE_REJECTION', 'Promise was rejected with falsy value');
	E('ERR_ENCODING_NOT_SUPPORTED', enc => `The "${enc}" encoding is not supported`);
	E('ERR_ENCODING_INVALID_ENCODED_DATA', enc => `The encoded data was not valid for encoding ${enc}`);
	E('ERR_HTTP_HEADERS_SENT', 'Cannot render headers after they are sent to the client');
	E('ERR_HTTP_INVALID_STATUS_CODE', 'Invalid status code: %s');
	E('ERR_HTTP_TRAILER_INVALID', 'Trailers are invalid with this transfer encoding');
	E('ERR_INDEX_OUT_OF_RANGE', 'Index out of range');
	E('ERR_INVALID_ARG_TYPE', invalidArgType);
	E('ERR_INVALID_ARRAY_LENGTH', (name, len, actual) => {
	    assert.strictEqual(typeof actual, 'number');
	    return `The array "${name}" (length ${actual}) must be of length ${len}.`;
	});
	E('ERR_INVALID_BUFFER_SIZE', 'Buffer size must be a multiple of %s');
	E('ERR_INVALID_CALLBACK', 'Callback must be a function');
	E('ERR_INVALID_CHAR', 'Invalid character in %s');
	E('ERR_INVALID_CURSOR_POS', 'Cannot set cursor row without setting its column');
	E('ERR_INVALID_FD', '"fd" must be a positive integer: %s');
	E('ERR_INVALID_FILE_URL_HOST', 'File URL host must be "localhost" or empty on %s');
	E('ERR_INVALID_FILE_URL_PATH', 'File URL path %s');
	E('ERR_INVALID_HANDLE_TYPE', 'This handle type cannot be sent');
	E('ERR_INVALID_IP_ADDRESS', 'Invalid IP address: %s');
	E('ERR_INVALID_OPT_VALUE', (name, value) => {
	    return `The value "${String(value)}" is invalid for option "${name}"`;
	});
	E('ERR_INVALID_OPT_VALUE_ENCODING', value => `The value "${String(value)}" is invalid for option "encoding"`);
	E('ERR_INVALID_REPL_EVAL_CONFIG', 'Cannot specify both "breakEvalOnSigint" and "eval" for REPL');
	E('ERR_INVALID_SYNC_FORK_INPUT', 'Asynchronous forks do not support Buffer, Uint8Array or string input: %s');
	E('ERR_INVALID_THIS', 'Value of "this" must be of type %s');
	E('ERR_INVALID_TUPLE', '%s must be an iterable %s tuple');
	E('ERR_INVALID_URL', 'Invalid URL: %s');
	E('ERR_INVALID_URL_SCHEME', expected => `The URL must be ${oneOf(expected, 'scheme')}`);
	E('ERR_IPC_CHANNEL_CLOSED', 'Channel closed');
	E('ERR_IPC_DISCONNECTED', 'IPC channel is already disconnected');
	E('ERR_IPC_ONE_PIPE', 'Child process can have only one IPC pipe');
	E('ERR_IPC_SYNC_FORK', 'IPC cannot be used with synchronous forks');
	E('ERR_MISSING_ARGS', missingArgs);
	E('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
	E('ERR_NAPI_CONS_FUNCTION', 'Constructor must be a function');
	E('ERR_NAPI_CONS_PROTOTYPE_OBJECT', 'Constructor.prototype must be an object');
	E('ERR_NO_CRYPTO', 'Node.js is not compiled with OpenSSL crypto support');
	E('ERR_NO_LONGER_SUPPORTED', '%s is no longer supported');
	E('ERR_PARSE_HISTORY_DATA', 'Could not parse history data in %s');
	E('ERR_SOCKET_ALREADY_BOUND', 'Socket is already bound');
	E('ERR_SOCKET_BAD_PORT', 'Port should be > 0 and < 65536');
	E('ERR_SOCKET_BAD_TYPE', 'Bad socket type specified. Valid types are: udp4, udp6');
	E('ERR_SOCKET_CANNOT_SEND', 'Unable to send data');
	E('ERR_SOCKET_CLOSED', 'Socket is closed');
	E('ERR_SOCKET_DGRAM_NOT_RUNNING', 'Not running');
	E('ERR_STDERR_CLOSE', 'process.stderr cannot be closed');
	E('ERR_STDOUT_CLOSE', 'process.stdout cannot be closed');
	E('ERR_STREAM_WRAP', 'Stream has StringDecoder set or is in objectMode');
	E('ERR_TLS_CERT_ALTNAME_INVALID', "Hostname/IP does not match certificate's altnames: %s");
	E('ERR_TLS_DH_PARAM_SIZE', size => `DH parameter size ${size} is less than 2048`);
	E('ERR_TLS_HANDSHAKE_TIMEOUT', 'TLS handshake timeout');
	E('ERR_TLS_RENEGOTIATION_FAILED', 'Failed to renegotiate');
	E('ERR_TLS_REQUIRED_SERVER_NAME', '"servername" is required parameter for Server.addContext');
	E('ERR_TLS_SESSION_ATTACK', 'TSL session renegotiation attack detected');
	E('ERR_TRANSFORM_ALREADY_TRANSFORMING', 'Calling transform done when still transforming');
	E('ERR_TRANSFORM_WITH_LENGTH_0', 'Calling transform done when writableState.length != 0');
	E('ERR_UNKNOWN_ENCODING', 'Unknown encoding: %s');
	E('ERR_UNKNOWN_SIGNAL', 'Unknown signal: %s');
	E('ERR_UNKNOWN_STDIN_TYPE', 'Unknown stdin file type');
	E('ERR_UNKNOWN_STREAM_TYPE', 'Unknown stream file type');
	E('ERR_V8BREAKITERATOR', 'Full ICU data not installed. ' + 'See https://github.com/nodejs/node/wiki/Intl');
	function invalidArgType(name, expected, actual) {
	    assert(name, 'name is required');
	    // determiner: 'must be' or 'must not be'
	    let determiner;
	    if (expected.includes('not ')) {
	        determiner = 'must not be';
	        expected = expected.split('not ')[1];
	    }
	    else {
	        determiner = 'must be';
	    }
	    let msg;
	    if (Array.isArray(name)) {
	        const names = name.map(val => `"${val}"`).join(', ');
	        msg = `The ${names} arguments ${determiner} ${oneOf(expected, 'type')}`;
	    }
	    else if (name.includes(' argument')) {
	        // for the case like 'first argument'
	        msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
	    }
	    else {
	        const type = name.includes('.') ? 'property' : 'argument';
	        msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
	    }
	    // if actual value received, output it
	    if (arguments.length >= 3) {
	        msg += `. Received type ${actual !== null ? typeof actual : 'null'}`;
	    }
	    return msg;
	}
	function missingArgs(...args) {
	    assert(args.length > 0, 'At least one arg needs to be specified');
	    let msg = 'The ';
	    const len = args.length;
	    args = args.map(a => `"${a}"`);
	    switch (len) {
	        case 1:
	            msg += `${args[0]} argument`;
	            break;
	        case 2:
	            msg += `${args[0]} and ${args[1]} arguments`;
	            break;
	        default:
	            msg += args.slice(0, len - 1).join(', ');
	            msg += `, and ${args[len - 1]} arguments`;
	            break;
	    }
	    return `${msg} must be specified`;
	}
	function oneOf(expected, thing) {
	    assert(expected, 'expected is required');
	    assert(typeof thing === 'string', 'thing is required');
	    if (Array.isArray(expected)) {
	        const len = expected.length;
	        assert(len > 0, 'At least one expected value needs to be specified');
	        // tslint:disable-next-line
	        expected = expected.map(i => String(i));
	        if (len > 2) {
	            return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or ` + expected[len - 1];
	        }
	        else if (len === 2) {
	            return `one of ${thing} ${expected[0]} or ${expected[1]}`;
	        }
	        else {
	            return `of ${thing} ${expected[0]}`;
	        }
	    }
	    else {
	        return `of ${thing} ${String(expected)}`;
	    }
	}
	function bufferOutOfBounds(name, isWriting) {
	    if (isWriting) {
	        return 'Attempt to write outside buffer bounds';
	    }
	    else {
	        return `"${name}" is outside of buffer bounds`;
	    }
	} 
} (errors));

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.strToEncoding = exports.assertEncoding = exports.ENCODING_UTF8 = void 0;
	const buffer_1 = buffer;
	const errors$1 = errors;
	exports.ENCODING_UTF8 = 'utf8';
	function assertEncoding(encoding) {
	    if (encoding && !buffer_1.Buffer.isEncoding(encoding))
	        throw new errors$1.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
	}
	exports.assertEncoding = assertEncoding;
	function strToEncoding(str, encoding) {
	    if (!encoding || encoding === exports.ENCODING_UTF8)
	        return str; // UTF-8
	    if (encoding === 'buffer')
	        return new buffer_1.Buffer(str); // `buffer` encoding
	    return new buffer_1.Buffer(str).toString(encoding); // Custom encoding
	}
	exports.strToEncoding = strToEncoding; 
} (encoding));

Object.defineProperty(Dirent$1, "__esModule", { value: true });
Dirent$1.Dirent = void 0;
const constants_1 = constants;
const encoding_1 = encoding;
const { S_IFMT, S_IFDIR, S_IFREG, S_IFBLK, S_IFCHR, S_IFLNK, S_IFIFO, S_IFSOCK } = constants_1.constants;
/**
 * A directory entry, like `fs.Dirent`.
 */
class Dirent {
    constructor() {
        this.name = '';
        this.mode = 0;
    }
    static build(link, encoding) {
        const dirent = new Dirent();
        const { mode } = link.getNode();
        dirent.name = (0, encoding_1.strToEncoding)(link.getName(), encoding);
        dirent.mode = mode;
        return dirent;
    }
    _checkModeProperty(property) {
        return (this.mode & S_IFMT) === property;
    }
    isDirectory() {
        return this._checkModeProperty(S_IFDIR);
    }
    isFile() {
        return this._checkModeProperty(S_IFREG);
    }
    isBlockDevice() {
        return this._checkModeProperty(S_IFBLK);
    }
    isCharacterDevice() {
        return this._checkModeProperty(S_IFCHR);
    }
    isSymbolicLink() {
        return this._checkModeProperty(S_IFLNK);
    }
    isFIFO() {
        return this._checkModeProperty(S_IFIFO);
    }
    isSocket() {
        return this._checkModeProperty(S_IFSOCK);
    }
}
Dirent$1.Dirent = Dirent;
Dirent$1.default = Dirent;

var volume = {};

var path = {exports: {}};

var util$2 = {};

var isBufferBrowser = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
};

var inherits_browser = {exports: {}};

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  inherits_browser.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  inherits_browser.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}

var inherits_browserExports = inherits_browser.exports;

(function (exports) {
	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(commonjsGlobal.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process$1.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process$1.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process$1.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process$1.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process$1.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var length = output.reduce(function(prev, cur) {
	    if (cur.indexOf('\n') >= 0) ;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = isBufferBrowser;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = inherits_browserExports;

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	} 
} (util$2));

var isWindows = process$1.platform === 'win32';
var util$1 = util$2;


// resolves . and .. elements in a path array with directory names there
// must be no slashes or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  var res = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];

    // ignore empty parts
    if (!p || p === '.')
      continue;

    if (p === '..') {
      if (res.length && res[res.length - 1] !== '..') {
        res.pop();
      } else if (allowAboveRoot) {
        res.push('..');
      }
    } else {
      res.push(p);
    }
  }

  return res;
}

// returns an array with empty elements removed from either end of the input
// array or the original array if no elements need to be removed
function trimArray(arr) {
  var lastIndex = arr.length - 1;
  var start = 0;
  for (; start <= lastIndex; start++) {
    if (arr[start])
      break;
  }

  var end = lastIndex;
  for (; end >= 0; end--) {
    if (arr[end])
      break;
  }

  if (start === 0 && end === lastIndex)
    return arr;
  if (start > end)
    return [];
  return arr.slice(start, end + 1);
}

// Regex to split a windows path into three parts: [*, device, slash,
// tail] windows-only
var splitDeviceRe =
    /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;

// Regex to split the tail part of the above into [*, dir, basename, ext]
var splitTailRe =
    /^([\s\S]*?)((?:\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))(?:[\\\/]*)$/;

var win32 = {};

// Function to split a filename into [root, dir, basename, ext]
function win32SplitPath(filename) {
  // Separate device+slash from tail
  var result = splitDeviceRe.exec(filename),
      device = (result[1] || '') + (result[2] || ''),
      tail = result[3] || '';
  // Split the tail into dir, basename and extension
  var result2 = splitTailRe.exec(tail),
      dir = result2[1],
      basename = result2[2],
      ext = result2[3];
  return [device, dir, basename, ext];
}

function win32StatPath(path) {
  var result = splitDeviceRe.exec(path),
      device = result[1] || '',
      isUnc = !!device && device[1] !== ':';
  return {
    device: device,
    isUnc: isUnc,
    isAbsolute: isUnc || !!result[2], // UNC paths are always absolute
    tail: result[3]
  };
}

function normalizeUNCRoot(device) {
  return '\\\\' + device.replace(/^[\\\/]+/, '').replace(/[\\\/]+/g, '\\');
}

// path.resolve([from ...], to)
win32.resolve = function() {
  var resolvedDevice = '',
      resolvedTail = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1; i--) {
    var path;
    if (i >= 0) {
      path = arguments[i];
    } else if (!resolvedDevice) {
      path = process$1.cwd();
    } else {
      // Windows has the concept of drive-specific current working
      // directories. If we've resolved a drive letter but not yet an
      // absolute path, get cwd for that drive. We're sure the device is not
      // an unc path at this points, because unc paths are always absolute.
      path = process$1.env['=' + resolvedDevice];
      // Verify that a drive-local cwd was found and that it actually points
      // to our drive. If not, default to the drive's root.
      if (!path || path.substr(0, 3).toLowerCase() !==
          resolvedDevice.toLowerCase() + '\\') {
        path = resolvedDevice + '\\';
      }
    }

    // Skip empty and invalid entries
    if (!util$1.isString(path)) {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    var result = win32StatPath(path),
        device = result.device,
        isUnc = result.isUnc,
        isAbsolute = result.isAbsolute,
        tail = result.tail;

    if (device &&
        resolvedDevice &&
        device.toLowerCase() !== resolvedDevice.toLowerCase()) {
      // This path points to another device so it is not applicable
      continue;
    }

    if (!resolvedDevice) {
      resolvedDevice = device;
    }
    if (!resolvedAbsolute) {
      resolvedTail = tail + '\\' + resolvedTail;
      resolvedAbsolute = isAbsolute;
    }

    if (resolvedDevice && resolvedAbsolute) {
      break;
    }
  }

  // Convert slashes to backslashes when `resolvedDevice` points to an UNC
  // root. Also squash multiple slashes into a single one where appropriate.
  if (isUnc) {
    resolvedDevice = normalizeUNCRoot(resolvedDevice);
  }

  // At this point the path should be resolved to a full absolute path,
  // but handle relative paths to be safe (might happen when process.cwd()
  // fails)

  // Normalize the tail path
  resolvedTail = normalizeArray(resolvedTail.split(/[\\\/]+/),
                                !resolvedAbsolute).join('\\');

  return (resolvedDevice + (resolvedAbsolute ? '\\' : '') + resolvedTail) ||
         '.';
};


win32.normalize = function(path) {
  var result = win32StatPath(path),
      device = result.device,
      isUnc = result.isUnc,
      isAbsolute = result.isAbsolute,
      tail = result.tail,
      trailingSlash = /[\\\/]$/.test(tail);

  // Normalize the tail path
  tail = normalizeArray(tail.split(/[\\\/]+/), !isAbsolute).join('\\');

  if (!tail && !isAbsolute) {
    tail = '.';
  }
  if (tail && trailingSlash) {
    tail += '\\';
  }

  // Convert slashes to backslashes when `device` points to an UNC root.
  // Also squash multiple slashes into a single one where appropriate.
  if (isUnc) {
    device = normalizeUNCRoot(device);
  }

  return device + (isAbsolute ? '\\' : '') + tail;
};


win32.isAbsolute = function(path) {
  return win32StatPath(path).isAbsolute;
};

win32.join = function() {
  var paths = [];
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (!util$1.isString(arg)) {
      throw new TypeError('Arguments to path.join must be strings');
    }
    if (arg) {
      paths.push(arg);
    }
  }

  var joined = paths.join('\\');

  // Make sure that the joined path doesn't start with two slashes, because
  // normalize() will mistake it for an UNC path then.
  //
  // This step is skipped when it is very clear that the user actually
  // intended to point at an UNC path. This is assumed when the first
  // non-empty string arguments starts with exactly two slashes followed by
  // at least one more non-slash character.
  //
  // Note that for normalize() to treat a path as an UNC path it needs to
  // have at least 2 components, so we don't filter for that here.
  // This means that the user can use join to construct UNC paths from
  // a server name and a share name; for example:
  //   path.join('//server', 'share') -> '\\\\server\\share\')
  if (!/^[\\\/]{2}[^\\\/]/.test(paths[0])) {
    joined = joined.replace(/^[\\\/]{2,}/, '\\');
  }

  return win32.normalize(joined);
};


// path.relative(from, to)
// it will solve the relative path from 'from' to 'to', for instance:
// from = 'C:\\orandea\\test\\aaa'
// to = 'C:\\orandea\\impl\\bbb'
// The output of the function should be: '..\\..\\impl\\bbb'
win32.relative = function(from, to) {
  from = win32.resolve(from);
  to = win32.resolve(to);

  // windows is not case sensitive
  var lowerFrom = from.toLowerCase();
  var lowerTo = to.toLowerCase();

  var toParts = trimArray(to.split('\\'));

  var lowerFromParts = trimArray(lowerFrom.split('\\'));
  var lowerToParts = trimArray(lowerTo.split('\\'));

  var length = Math.min(lowerFromParts.length, lowerToParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (lowerFromParts[i] !== lowerToParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  if (samePartsLength == 0) {
    return to;
  }

  var outputParts = [];
  for (var i = samePartsLength; i < lowerFromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('\\');
};


win32._makeLong = function(path) {
  // Note: this will *probably* throw somewhere.
  if (!util$1.isString(path))
    return path;

  if (!path) {
    return '';
  }

  var resolvedPath = win32.resolve(path);

  if (/^[a-zA-Z]\:\\/.test(resolvedPath)) {
    // path is local filesystem path, which needs to be converted
    // to long UNC path.
    return '\\\\?\\' + resolvedPath;
  } else if (/^\\\\[^?.]/.test(resolvedPath)) {
    // path is network UNC path, which needs to be converted
    // to long UNC path.
    return '\\\\?\\UNC\\' + resolvedPath.substring(2);
  }

  return path;
};


win32.dirname = function(path) {
  var result = win32SplitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


win32.basename = function(path, ext) {
  var f = win32SplitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


win32.extname = function(path) {
  return win32SplitPath(path)[3];
};


win32.format = function(pathObject) {
  if (!util$1.isObject(pathObject)) {
    throw new TypeError(
        "Parameter 'pathObject' must be an object, not " + typeof pathObject
    );
  }

  var root = pathObject.root || '';

  if (!util$1.isString(root)) {
    throw new TypeError(
        "'pathObject.root' must be a string or undefined, not " +
        typeof pathObject.root
    );
  }

  var dir = pathObject.dir;
  var base = pathObject.base || '';
  if (!dir) {
    return base;
  }
  if (dir[dir.length - 1] === win32.sep) {
    return dir + base;
  }
  return dir + win32.sep + base;
};


win32.parse = function(pathString) {
  if (!util$1.isString(pathString)) {
    throw new TypeError(
        "Parameter 'pathString' must be a string, not " + typeof pathString
    );
  }
  var allParts = win32SplitPath(pathString);
  if (!allParts || allParts.length !== 4) {
    throw new TypeError("Invalid path '" + pathString + "'");
  }
  return {
    root: allParts[0],
    dir: allParts[0] + allParts[1].slice(0, -1),
    base: allParts[2],
    ext: allParts[3],
    name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
  };
};


win32.sep = '\\';
win32.delimiter = ';';


// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var posix = {};


function posixSplitPath(filename) {
  return splitPathRe.exec(filename).slice(1);
}


// path.resolve([from ...], to)
// posix version
posix.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process$1.cwd();

    // Skip empty and invalid entries
    if (!util$1.isString(path)) {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path[0] === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(resolvedPath.split('/'),
                                !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
posix.normalize = function(path) {
  var isAbsolute = posix.isAbsolute(path),
      trailingSlash = path && path[path.length - 1] === '/';

  // Normalize the path
  path = normalizeArray(path.split('/'), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
posix.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
posix.join = function() {
  var path = '';
  for (var i = 0; i < arguments.length; i++) {
    var segment = arguments[i];
    if (!util$1.isString(segment)) {
      throw new TypeError('Arguments to path.join must be strings');
    }
    if (segment) {
      if (!path) {
        path += segment;
      } else {
        path += '/' + segment;
      }
    }
  }
  return posix.normalize(path);
};


// path.relative(from, to)
// posix version
posix.relative = function(from, to) {
  from = posix.resolve(from).substr(1);
  to = posix.resolve(to).substr(1);

  var fromParts = trimArray(from.split('/'));
  var toParts = trimArray(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};


posix._makeLong = function(path) {
  return path;
};


posix.dirname = function(path) {
  var result = posixSplitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


posix.basename = function(path, ext) {
  var f = posixSplitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


posix.extname = function(path) {
  return posixSplitPath(path)[3];
};


posix.format = function(pathObject) {
  if (!util$1.isObject(pathObject)) {
    throw new TypeError(
        "Parameter 'pathObject' must be an object, not " + typeof pathObject
    );
  }

  var root = pathObject.root || '';

  if (!util$1.isString(root)) {
    throw new TypeError(
        "'pathObject.root' must be a string or undefined, not " +
        typeof pathObject.root
    );
  }

  var dir = pathObject.dir ? pathObject.dir + posix.sep : '';
  var base = pathObject.base || '';
  return dir + base;
};


posix.parse = function(pathString) {
  if (!util$1.isString(pathString)) {
    throw new TypeError(
        "Parameter 'pathString' must be a string, not " + typeof pathString
    );
  }
  var allParts = posixSplitPath(pathString);
  if (!allParts || allParts.length !== 4) {
    throw new TypeError("Invalid path '" + pathString + "'");
  }
  allParts[1] = allParts[1] || '';
  allParts[2] = allParts[2] || '';
  allParts[3] = allParts[3] || '';

  return {
    root: allParts[0],
    dir: allParts[0] + allParts[1].slice(0, -1),
    base: allParts[2],
    ext: allParts[3],
    name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
  };
};


posix.sep = '/';
posix.delimiter = ':';


if (isWindows)
  path.exports = win32;
else /* posix */
  path.exports = posix;

path.exports.posix = posix;
path.exports.win32 = win32;

var pathExports = path.exports;

var node = {};

var process = {};

var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(browser$2);

var setImmediate$1 = {};

Object.defineProperty(setImmediate$1, "__esModule", { value: true });
let _setImmediate;
if (typeof setImmediate === 'function')
    _setImmediate = setImmediate.bind(typeof globalThis !== 'undefined' ? globalThis : commonjsGlobal);
else
    _setImmediate = setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : commonjsGlobal);
setImmediate$1.default = _setImmediate;

// Here we mock the global `process` variable in case we are not in Node's environment.
Object.defineProperty(process, "__esModule", { value: true });
process.createProcess = void 0;
/**
 * Looks to return a `process` object, if one is available.
 *
 * The global `process` is returned if defined;
 * otherwise `require('process')` is attempted.
 *
 * If that fails, `undefined` is returned.
 *
 * @return {IProcess | undefined}
 */
const maybeReturnProcess = () => {
    if (typeof process$1 !== 'undefined') {
        return process$1;
    }
    try {
        return require$$0$1;
    }
    catch (_a) {
        return undefined;
    }
};
function createProcess() {
    const p = maybeReturnProcess() || {};
    if (!p.cwd)
        p.cwd = () => '/';
    if (!p.nextTick)
        p.nextTick = setImmediate$1.default;
    if (!p.emitWarning)
        p.emitWarning = (message, type) => {
            // tslint:disable-next-line:no-console
            console.warn(`${type}${type ? ': ' : ''}${message}`);
        };
    if (!p.env)
        p.env = {};
    return p;
}
process.createProcess = createProcess;
process.default = createProcess();

var events = {exports: {}};

var R = typeof Reflect === 'object' ? Reflect : null;
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };

var ReflectOwnKeys;
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
};

function EventEmitter() {
  EventEmitter.init.call(this);
}
events.exports = EventEmitter;
events.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    }
    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

var eventsExports = events.exports;

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.File = exports.Link = exports.Node = exports.SEP = void 0;
	const process_1 = process;
	const buffer_1 = buffer;
	const constants_1 = constants;
	const events_1 = eventsExports;
	const Stats_1 = Stats$1;
	const { S_IFMT, S_IFDIR, S_IFREG, S_IFLNK, O_APPEND } = constants_1.constants;
	const getuid = () => { var _a, _b; return (_b = (_a = process_1.default.getuid) === null || _a === void 0 ? void 0 : _a.call(process_1.default)) !== null && _b !== void 0 ? _b : 0; };
	const getgid = () => { var _a, _b; return (_b = (_a = process_1.default.getgid) === null || _a === void 0 ? void 0 : _a.call(process_1.default)) !== null && _b !== void 0 ? _b : 0; };
	exports.SEP = '/';
	/**
	 * Node in a file system (like i-node, v-node).
	 */
	class Node extends events_1.EventEmitter {
	    constructor(ino, perm = 0o666) {
	        super();
	        // User ID and group ID.
	        this._uid = getuid();
	        this._gid = getgid();
	        this._atime = new Date();
	        this._mtime = new Date();
	        this._ctime = new Date();
	        this._perm = 0o666; // Permissions `chmod`, `fchmod`
	        this.mode = S_IFREG; // S_IFDIR, S_IFREG, etc.. (file by default?)
	        // Number of hard links pointing at this Node.
	        this._nlink = 1;
	        this._perm = perm;
	        this.mode |= perm;
	        this.ino = ino;
	    }
	    set ctime(ctime) {
	        this._ctime = ctime;
	    }
	    get ctime() {
	        return this._ctime;
	    }
	    set uid(uid) {
	        this._uid = uid;
	        this.ctime = new Date();
	    }
	    get uid() {
	        return this._uid;
	    }
	    set gid(gid) {
	        this._gid = gid;
	        this.ctime = new Date();
	    }
	    get gid() {
	        return this._gid;
	    }
	    set atime(atime) {
	        this._atime = atime;
	        this.ctime = new Date();
	    }
	    get atime() {
	        return this._atime;
	    }
	    set mtime(mtime) {
	        this._mtime = mtime;
	        this.ctime = new Date();
	    }
	    get mtime() {
	        return this._mtime;
	    }
	    set perm(perm) {
	        this._perm = perm;
	        this.ctime = new Date();
	    }
	    get perm() {
	        return this._perm;
	    }
	    set nlink(nlink) {
	        this._nlink = nlink;
	        this.ctime = new Date();
	    }
	    get nlink() {
	        return this._nlink;
	    }
	    getString(encoding = 'utf8') {
	        this.atime = new Date();
	        return this.getBuffer().toString(encoding);
	    }
	    setString(str) {
	        // this.setBuffer(bufferFrom(str, 'utf8'));
	        this.buf = (0, buffer_1.bufferFrom)(str, 'utf8');
	        this.touch();
	    }
	    getBuffer() {
	        this.atime = new Date();
	        if (!this.buf)
	            this.setBuffer((0, buffer_1.bufferAllocUnsafe)(0));
	        return (0, buffer_1.bufferFrom)(this.buf); // Return a copy.
	    }
	    setBuffer(buf) {
	        this.buf = (0, buffer_1.bufferFrom)(buf); // Creates a copy of data.
	        this.touch();
	    }
	    getSize() {
	        return this.buf ? this.buf.length : 0;
	    }
	    setModeProperty(property) {
	        this.mode = (this.mode & ~S_IFMT) | property;
	    }
	    setIsFile() {
	        this.setModeProperty(S_IFREG);
	    }
	    setIsDirectory() {
	        this.setModeProperty(S_IFDIR);
	    }
	    setIsSymlink() {
	        this.setModeProperty(S_IFLNK);
	    }
	    isFile() {
	        return (this.mode & S_IFMT) === S_IFREG;
	    }
	    isDirectory() {
	        return (this.mode & S_IFMT) === S_IFDIR;
	    }
	    isSymlink() {
	        // return !!this.symlink;
	        return (this.mode & S_IFMT) === S_IFLNK;
	    }
	    makeSymlink(steps) {
	        this.symlink = steps;
	        this.setIsSymlink();
	    }
	    write(buf, off = 0, len = buf.length, pos = 0) {
	        if (!this.buf)
	            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
	        if (pos + len > this.buf.length) {
	            const newBuf = (0, buffer_1.bufferAllocUnsafe)(pos + len);
	            this.buf.copy(newBuf, 0, 0, this.buf.length);
	            this.buf = newBuf;
	        }
	        buf.copy(this.buf, pos, off, off + len);
	        this.touch();
	        return len;
	    }
	    // Returns the number of bytes read.
	    read(buf, off = 0, len = buf.byteLength, pos = 0) {
	        this.atime = new Date();
	        if (!this.buf)
	            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
	        let actualLen = len;
	        if (actualLen > buf.byteLength) {
	            actualLen = buf.byteLength;
	        }
	        if (actualLen + pos > this.buf.length) {
	            actualLen = this.buf.length - pos;
	        }
	        const buf2 = buf instanceof buffer$1.Buffer ? buf : buffer$1.Buffer.from(buf.buffer);
	        this.buf.copy(buf2, off, pos, pos + actualLen);
	        return actualLen;
	    }
	    truncate(len = 0) {
	        if (!len)
	            this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
	        else {
	            if (!this.buf)
	                this.buf = (0, buffer_1.bufferAllocUnsafe)(0);
	            if (len <= this.buf.length) {
	                this.buf = this.buf.slice(0, len);
	            }
	            else {
	                const buf = (0, buffer_1.bufferAllocUnsafe)(len);
	                this.buf.copy(buf);
	                buf.fill(0, this.buf.length);
	                this.buf = buf;
	            }
	        }
	        this.touch();
	    }
	    chmod(perm) {
	        this.perm = perm;
	        this.mode = (this.mode & ~0o777) | perm;
	        this.touch();
	    }
	    chown(uid, gid) {
	        this.uid = uid;
	        this.gid = gid;
	        this.touch();
	    }
	    touch() {
	        this.mtime = new Date();
	        this.emit('change', this);
	    }
	    canRead(uid = getuid(), gid = getgid()) {
	        if (this.perm & 4 /* S.IROTH */) {
	            return true;
	        }
	        if (gid === this.gid) {
	            if (this.perm & 32 /* S.IRGRP */) {
	                return true;
	            }
	        }
	        if (uid === this.uid) {
	            if (this.perm & 256 /* S.IRUSR */) {
	                return true;
	            }
	        }
	        return false;
	    }
	    canWrite(uid = getuid(), gid = getgid()) {
	        if (this.perm & 2 /* S.IWOTH */) {
	            return true;
	        }
	        if (gid === this.gid) {
	            if (this.perm & 16 /* S.IWGRP */) {
	                return true;
	            }
	        }
	        if (uid === this.uid) {
	            if (this.perm & 128 /* S.IWUSR */) {
	                return true;
	            }
	        }
	        return false;
	    }
	    del() {
	        this.emit('delete', this);
	    }
	    toJSON() {
	        return {
	            ino: this.ino,
	            uid: this.uid,
	            gid: this.gid,
	            atime: this.atime.getTime(),
	            mtime: this.mtime.getTime(),
	            ctime: this.ctime.getTime(),
	            perm: this.perm,
	            mode: this.mode,
	            nlink: this.nlink,
	            symlink: this.symlink,
	            data: this.getString(),
	        };
	    }
	}
	exports.Node = Node;
	/**
	 * Represents a hard link that points to an i-node `node`.
	 */
	class Link extends events_1.EventEmitter {
	    get steps() {
	        return this._steps;
	    }
	    // Recursively sync children steps, e.g. in case of dir rename
	    set steps(val) {
	        this._steps = val;
	        for (const [child, link] of Object.entries(this.children)) {
	            if (child === '.' || child === '..') {
	                continue;
	            }
	            link === null || link === void 0 ? void 0 : link.syncSteps();
	        }
	    }
	    constructor(vol, parent, name) {
	        super();
	        this.children = {};
	        // Path to this node as Array: ['usr', 'bin', 'node'].
	        this._steps = [];
	        // "i-node" number of the node.
	        this.ino = 0;
	        // Number of children.
	        this.length = 0;
	        this.vol = vol;
	        this.parent = parent;
	        this.name = name;
	        this.syncSteps();
	    }
	    setNode(node) {
	        this.node = node;
	        this.ino = node.ino;
	    }
	    getNode() {
	        return this.node;
	    }
	    createChild(name, node = this.vol.createNode()) {
	        const link = new Link(this.vol, this, name);
	        link.setNode(node);
	        if (node.isDirectory()) {
	            link.children['.'] = link;
	            link.getNode().nlink++;
	        }
	        this.setChild(name, link);
	        return link;
	    }
	    setChild(name, link = new Link(this.vol, this, name)) {
	        this.children[name] = link;
	        link.parent = this;
	        this.length++;
	        const node = link.getNode();
	        if (node.isDirectory()) {
	            link.children['..'] = this;
	            this.getNode().nlink++;
	        }
	        this.getNode().mtime = new Date();
	        this.emit('child:add', link, this);
	        return link;
	    }
	    deleteChild(link) {
	        const node = link.getNode();
	        if (node.isDirectory()) {
	            delete link.children['..'];
	            this.getNode().nlink--;
	        }
	        delete this.children[link.getName()];
	        this.length--;
	        this.getNode().mtime = new Date();
	        this.emit('child:delete', link, this);
	    }
	    getChild(name) {
	        this.getNode().mtime = new Date();
	        if (Object.hasOwnProperty.call(this.children, name)) {
	            return this.children[name];
	        }
	    }
	    getPath() {
	        return this.steps.join(exports.SEP);
	    }
	    getName() {
	        return this.steps[this.steps.length - 1];
	    }
	    // del() {
	    //     const parent = this.parent;
	    //     if(parent) {
	    //         parent.deleteChild(link);
	    //     }
	    //     this.parent = null;
	    //     this.vol = null;
	    // }
	    /**
	     * Walk the tree path and return the `Link` at that location, if any.
	     * @param steps {string[]} Desired location.
	     * @param stop {number} Max steps to go into.
	     * @param i {number} Current step in the `steps` array.
	     *
	     * @return {Link|null}
	     */
	    walk(steps, stop = steps.length, i = 0) {
	        if (i >= steps.length)
	            return this;
	        if (i >= stop)
	            return this;
	        const step = steps[i];
	        const link = this.getChild(step);
	        if (!link)
	            return null;
	        return link.walk(steps, stop, i + 1);
	    }
	    toJSON() {
	        return {
	            steps: this.steps,
	            ino: this.ino,
	            children: Object.keys(this.children),
	        };
	    }
	    syncSteps() {
	        this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name];
	    }
	}
	exports.Link = Link;
	/**
	 * Represents an open file (file descriptor) that points to a `Link` (Hard-link) and a `Node`.
	 */
	class File {
	    /**
	     * Open a Link-Node pair. `node` is provided separately as that might be a different node
	     * rather the one `link` points to, because it might be a symlink.
	     * @param link
	     * @param node
	     * @param flags
	     * @param fd
	     */
	    constructor(link, node, flags, fd) {
	        this.link = link;
	        this.node = node;
	        this.flags = flags;
	        this.fd = fd;
	        this.position = 0;
	        if (this.flags & O_APPEND)
	            this.position = this.getSize();
	    }
	    getString(encoding = 'utf8') {
	        return this.node.getString();
	    }
	    setString(str) {
	        this.node.setString(str);
	    }
	    getBuffer() {
	        return this.node.getBuffer();
	    }
	    setBuffer(buf) {
	        this.node.setBuffer(buf);
	    }
	    getSize() {
	        return this.node.getSize();
	    }
	    truncate(len) {
	        this.node.truncate(len);
	    }
	    seekTo(position) {
	        this.position = position;
	    }
	    stats() {
	        return Stats_1.default.build(this.node);
	    }
	    write(buf, offset = 0, length = buf.length, position) {
	        if (typeof position !== 'number')
	            position = this.position;
	        const bytes = this.node.write(buf, offset, length, position);
	        this.position = position + bytes;
	        return bytes;
	    }
	    read(buf, offset = 0, length = buf.byteLength, position) {
	        if (typeof position !== 'number')
	            position = this.position;
	        const bytes = this.node.read(buf, offset, length, position);
	        this.position = position + bytes;
	        return bytes;
	    }
	    chmod(perm) {
	        this.node.chmod(perm);
	    }
	    chown(uid, gid) {
	        this.node.chown(uid, gid);
	    }
	}
	exports.File = File; 
} (node));

var setTimeoutUnref$1 = {};

Object.defineProperty(setTimeoutUnref$1, "__esModule", { value: true });
/**
 * `setTimeoutUnref` is just like `setTimeout`,
 * only in Node's environment it will "unref" its macro task.
 */
function setTimeoutUnref(callback, time, args) {
    const ref = setTimeout.apply(typeof globalThis !== 'undefined' ? globalThis : commonjsGlobal, arguments);
    if (ref && typeof ref === 'object' && typeof ref.unref === 'function')
        ref.unref();
    return ref;
}
setTimeoutUnref$1.default = setTimeoutUnref;

var streamBrowser;
var hasRequiredStreamBrowser;

function requireStreamBrowser () {
	if (hasRequiredStreamBrowser) return streamBrowser;
	hasRequiredStreamBrowser = 1;
	streamBrowser = eventsExports.EventEmitter;
	return streamBrowser;
}

var _nodeResolve_empty = {};

var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	default: _nodeResolve_empty
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

var buffer_list;
var hasRequiredBuffer_list;

function requireBuffer_list () {
	if (hasRequiredBuffer_list) return buffer_list;
	hasRequiredBuffer_list = 1;

	function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
	function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
	function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
	function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
	function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
	function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
	var _require = buffer$1,
	  Buffer = _require.Buffer;
	var _require2 = require$$0,
	  inspect = _require2.inspect;
	var custom = inspect && inspect.custom || 'inspect';
	function copyBuffer(src, target, offset) {
	  Buffer.prototype.copy.call(src, target, offset);
	}
	buffer_list = /*#__PURE__*/function () {
	  function BufferList() {
	    _classCallCheck(this, BufferList);
	    this.head = null;
	    this.tail = null;
	    this.length = 0;
	  }
	  _createClass(BufferList, [{
	    key: "push",
	    value: function push(v) {
	      var entry = {
	        data: v,
	        next: null
	      };
	      if (this.length > 0) this.tail.next = entry;else this.head = entry;
	      this.tail = entry;
	      ++this.length;
	    }
	  }, {
	    key: "unshift",
	    value: function unshift(v) {
	      var entry = {
	        data: v,
	        next: this.head
	      };
	      if (this.length === 0) this.tail = entry;
	      this.head = entry;
	      ++this.length;
	    }
	  }, {
	    key: "shift",
	    value: function shift() {
	      if (this.length === 0) return;
	      var ret = this.head.data;
	      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
	      --this.length;
	      return ret;
	    }
	  }, {
	    key: "clear",
	    value: function clear() {
	      this.head = this.tail = null;
	      this.length = 0;
	    }
	  }, {
	    key: "join",
	    value: function join(s) {
	      if (this.length === 0) return '';
	      var p = this.head;
	      var ret = '' + p.data;
	      while (p = p.next) ret += s + p.data;
	      return ret;
	    }
	  }, {
	    key: "concat",
	    value: function concat(n) {
	      if (this.length === 0) return Buffer.alloc(0);
	      var ret = Buffer.allocUnsafe(n >>> 0);
	      var p = this.head;
	      var i = 0;
	      while (p) {
	        copyBuffer(p.data, ret, i);
	        i += p.data.length;
	        p = p.next;
	      }
	      return ret;
	    }

	    // Consumes a specified amount of bytes or characters from the buffered data.
	  }, {
	    key: "consume",
	    value: function consume(n, hasStrings) {
	      var ret;
	      if (n < this.head.data.length) {
	        // `slice` is the same for buffers and strings.
	        ret = this.head.data.slice(0, n);
	        this.head.data = this.head.data.slice(n);
	      } else if (n === this.head.data.length) {
	        // First chunk is a perfect match.
	        ret = this.shift();
	      } else {
	        // Result spans more than one buffer.
	        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
	      }
	      return ret;
	    }
	  }, {
	    key: "first",
	    value: function first() {
	      return this.head.data;
	    }

	    // Consumes a specified amount of characters from the buffered data.
	  }, {
	    key: "_getString",
	    value: function _getString(n) {
	      var p = this.head;
	      var c = 1;
	      var ret = p.data;
	      n -= ret.length;
	      while (p = p.next) {
	        var str = p.data;
	        var nb = n > str.length ? str.length : n;
	        if (nb === str.length) ret += str;else ret += str.slice(0, n);
	        n -= nb;
	        if (n === 0) {
	          if (nb === str.length) {
	            ++c;
	            if (p.next) this.head = p.next;else this.head = this.tail = null;
	          } else {
	            this.head = p;
	            p.data = str.slice(nb);
	          }
	          break;
	        }
	        ++c;
	      }
	      this.length -= c;
	      return ret;
	    }

	    // Consumes a specified amount of bytes from the buffered data.
	  }, {
	    key: "_getBuffer",
	    value: function _getBuffer(n) {
	      var ret = Buffer.allocUnsafe(n);
	      var p = this.head;
	      var c = 1;
	      p.data.copy(ret);
	      n -= p.data.length;
	      while (p = p.next) {
	        var buf = p.data;
	        var nb = n > buf.length ? buf.length : n;
	        buf.copy(ret, ret.length - n, 0, nb);
	        n -= nb;
	        if (n === 0) {
	          if (nb === buf.length) {
	            ++c;
	            if (p.next) this.head = p.next;else this.head = this.tail = null;
	          } else {
	            this.head = p;
	            p.data = buf.slice(nb);
	          }
	          break;
	        }
	        ++c;
	      }
	      this.length -= c;
	      return ret;
	    }

	    // Make sure the linked list only shows the minimal necessary information.
	  }, {
	    key: custom,
	    value: function value(_, options) {
	      return inspect(this, _objectSpread(_objectSpread({}, options), {}, {
	        // Only inspect one level.
	        depth: 0,
	        // It should not recurse.
	        customInspect: false
	      }));
	    }
	  }]);
	  return BufferList;
	}();
	return buffer_list;
}

var destroy_1;
var hasRequiredDestroy;

function requireDestroy () {
	if (hasRequiredDestroy) return destroy_1;
	hasRequiredDestroy = 1;

	// undocumented cb() API, needed for core, not for public API
	function destroy(err, cb) {
	  var _this = this;
	  var readableDestroyed = this._readableState && this._readableState.destroyed;
	  var writableDestroyed = this._writableState && this._writableState.destroyed;
	  if (readableDestroyed || writableDestroyed) {
	    if (cb) {
	      cb(err);
	    } else if (err) {
	      if (!this._writableState) {
	        process$1.nextTick(emitErrorNT, this, err);
	      } else if (!this._writableState.errorEmitted) {
	        this._writableState.errorEmitted = true;
	        process$1.nextTick(emitErrorNT, this, err);
	      }
	    }
	    return this;
	  }

	  // we set destroyed to true before firing error callbacks in order
	  // to make it re-entrance safe in case destroy() is called within callbacks

	  if (this._readableState) {
	    this._readableState.destroyed = true;
	  }

	  // if this is a duplex stream mark the writable part as destroyed as well
	  if (this._writableState) {
	    this._writableState.destroyed = true;
	  }
	  this._destroy(err || null, function (err) {
	    if (!cb && err) {
	      if (!_this._writableState) {
	        process$1.nextTick(emitErrorAndCloseNT, _this, err);
	      } else if (!_this._writableState.errorEmitted) {
	        _this._writableState.errorEmitted = true;
	        process$1.nextTick(emitErrorAndCloseNT, _this, err);
	      } else {
	        process$1.nextTick(emitCloseNT, _this);
	      }
	    } else if (cb) {
	      process$1.nextTick(emitCloseNT, _this);
	      cb(err);
	    } else {
	      process$1.nextTick(emitCloseNT, _this);
	    }
	  });
	  return this;
	}
	function emitErrorAndCloseNT(self, err) {
	  emitErrorNT(self, err);
	  emitCloseNT(self);
	}
	function emitCloseNT(self) {
	  if (self._writableState && !self._writableState.emitClose) return;
	  if (self._readableState && !self._readableState.emitClose) return;
	  self.emit('close');
	}
	function undestroy() {
	  if (this._readableState) {
	    this._readableState.destroyed = false;
	    this._readableState.reading = false;
	    this._readableState.ended = false;
	    this._readableState.endEmitted = false;
	  }
	  if (this._writableState) {
	    this._writableState.destroyed = false;
	    this._writableState.ended = false;
	    this._writableState.ending = false;
	    this._writableState.finalCalled = false;
	    this._writableState.prefinished = false;
	    this._writableState.finished = false;
	    this._writableState.errorEmitted = false;
	  }
	}
	function emitErrorNT(self, err) {
	  self.emit('error', err);
	}
	function errorOrDestroy(stream, err) {
	  // We have tests that rely on errors being emitted
	  // in the same tick, so changing this is semver major.
	  // For now when you opt-in to autoDestroy we allow
	  // the error to be emitted nextTick. In a future
	  // semver major update we should change the default to this.

	  var rState = stream._readableState;
	  var wState = stream._writableState;
	  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
	}
	destroy_1 = {
	  destroy: destroy,
	  undestroy: undestroy,
	  errorOrDestroy: errorOrDestroy
	};
	return destroy_1;
}

var errorsBrowser = {};

var hasRequiredErrorsBrowser;

function requireErrorsBrowser () {
	if (hasRequiredErrorsBrowser) return errorsBrowser;
	hasRequiredErrorsBrowser = 1;

	function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

	var codes = {};

	function createErrorType(code, message, Base) {
	  if (!Base) {
	    Base = Error;
	  }

	  function getMessage(arg1, arg2, arg3) {
	    if (typeof message === 'string') {
	      return message;
	    } else {
	      return message(arg1, arg2, arg3);
	    }
	  }

	  var NodeError =
	  /*#__PURE__*/
	  function (_Base) {
	    _inheritsLoose(NodeError, _Base);

	    function NodeError(arg1, arg2, arg3) {
	      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
	    }

	    return NodeError;
	  }(Base);

	  NodeError.prototype.name = Base.name;
	  NodeError.prototype.code = code;
	  codes[code] = NodeError;
	} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


	function oneOf(expected, thing) {
	  if (Array.isArray(expected)) {
	    var len = expected.length;
	    expected = expected.map(function (i) {
	      return String(i);
	    });

	    if (len > 2) {
	      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
	    } else if (len === 2) {
	      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
	    } else {
	      return "of ".concat(thing, " ").concat(expected[0]);
	    }
	  } else {
	    return "of ".concat(thing, " ").concat(String(expected));
	  }
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


	function startsWith(str, search, pos) {
	  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


	function endsWith(str, search, this_len) {
	  if (this_len === undefined || this_len > str.length) {
	    this_len = str.length;
	  }

	  return str.substring(this_len - search.length, this_len) === search;
	} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


	function includes(str, search, start) {
	  if (typeof start !== 'number') {
	    start = 0;
	  }

	  if (start + search.length > str.length) {
	    return false;
	  } else {
	    return str.indexOf(search, start) !== -1;
	  }
	}

	createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
	  return 'The value "' + value + '" is invalid for option "' + name + '"';
	}, TypeError);
	createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
	  // determiner: 'must be' or 'must not be'
	  var determiner;

	  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
	    determiner = 'must not be';
	    expected = expected.replace(/^not /, '');
	  } else {
	    determiner = 'must be';
	  }

	  var msg;

	  if (endsWith(name, ' argument')) {
	    // For cases like 'first argument'
	    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  } else {
	    var type = includes(name, '.') ? 'property' : 'argument';
	    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
	  }

	  msg += ". Received type ".concat(typeof actual);
	  return msg;
	}, TypeError);
	createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
	createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
	  return 'The ' + name + ' method is not implemented';
	});
	createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
	createErrorType('ERR_STREAM_DESTROYED', function (name) {
	  return 'Cannot call ' + name + ' after a stream was destroyed';
	});
	createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
	createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
	createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
	createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
	createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
	  return 'Unknown encoding: ' + arg;
	}, TypeError);
	createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
	errorsBrowser.codes = codes;
	return errorsBrowser;
}

var state;
var hasRequiredState;

function requireState () {
	if (hasRequiredState) return state;
	hasRequiredState = 1;

	var ERR_INVALID_OPT_VALUE = requireErrorsBrowser().codes.ERR_INVALID_OPT_VALUE;
	function highWaterMarkFrom(options, isDuplex, duplexKey) {
	  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
	}
	function getHighWaterMark(state, options, duplexKey, isDuplex) {
	  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
	  if (hwm != null) {
	    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
	      var name = isDuplex ? duplexKey : 'highWaterMark';
	      throw new ERR_INVALID_OPT_VALUE(name, hwm);
	    }
	    return Math.floor(hwm);
	  }

	  // Default value
	  return state.objectMode ? 16 : 16 * 1024;
	}
	state = {
	  getHighWaterMark: getHighWaterMark
	};
	return state;
}

var browser;
var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browser;
	hasRequiredBrowser = 1;
	/**
	 * Module exports.
	 */

	browser = deprecate;

	/**
	 * Mark that a method should not be used.
	 * Returns a modified function which warns once by default.
	 *
	 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
	 *
	 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
	 * will throw an Error when invoked.
	 *
	 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
	 * will invoke `console.trace()` instead of `console.error()`.
	 *
	 * @param {Function} fn - the function to deprecate
	 * @param {String} msg - the string to print to the console when `fn` is invoked
	 * @returns {Function} a new "deprecated" version of `fn`
	 * @api public
	 */

	function deprecate (fn, msg) {
	  if (config('noDeprecation')) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (config('throwDeprecation')) {
	        throw new Error(msg);
	      } else if (config('traceDeprecation')) {
	        console.trace(msg);
	      } else {
	        console.warn(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	}

	/**
	 * Checks `localStorage` for boolean values for the given `name`.
	 *
	 * @param {String} name
	 * @returns {Boolean}
	 * @api private
	 */

	function config (name) {
	  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
	  try {
	    if (!commonjsGlobal.localStorage) return false;
	  } catch (_) {
	    return false;
	  }
	  var val = commonjsGlobal.localStorage[name];
	  if (null == val) return false;
	  return String(val).toLowerCase() === 'true';
	}
	return browser;
}

var _stream_writable;
var hasRequired_stream_writable;

function require_stream_writable () {
	if (hasRequired_stream_writable) return _stream_writable;
	hasRequired_stream_writable = 1;

	_stream_writable = Writable;

	// It seems a linked list but it is not
	// there will be only 2 of these for each stream
	function CorkedRequest(state) {
	  var _this = this;
	  this.next = null;
	  this.entry = null;
	  this.finish = function () {
	    onCorkedFinish(_this, state);
	  };
	}
	/* </replacement> */

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Writable.WritableState = WritableState;

	/*<replacement>*/
	var internalUtil = {
	  deprecate: requireBrowser()
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream = requireStreamBrowser();
	/*</replacement>*/

	var Buffer = buffer$1.Buffer;
	var OurUint8Array = (typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
	function _uint8ArrayToBuffer(chunk) {
	  return Buffer.from(chunk);
	}
	function _isUint8Array(obj) {
	  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
	}
	var destroyImpl = requireDestroy();
	var _require = requireState(),
	  getHighWaterMark = _require.getHighWaterMark;
	var _require$codes = requireErrorsBrowser().codes,
	  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
	  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
	  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
	  ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
	  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
	  ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
	  ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
	  ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;
	var errorOrDestroy = destroyImpl.errorOrDestroy;
	inherits_browserExports$1(Writable, Stream);
	function nop() {}
	function WritableState(options, stream, isDuplex) {
	  Duplex = Duplex || require_stream_duplex();
	  options = options || {};

	  // Duplex streams are both readable and writable, but share
	  // the same options object.
	  // However, some cases require setting options to different
	  // values for the readable and the writable sides of the duplex stream,
	  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.
	  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;
	  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex);

	  // if _final has been called
	  this.finalCalled = false;

	  // drain event flag.
	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // has it been destroyed
	  this.destroyed = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function (er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;
	  this.bufferedRequest = null;
	  this.lastBufferedRequest = null;

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;

	  // Should close be emitted on destroy. Defaults to true.
	  this.emitClose = options.emitClose !== false;

	  // Should .destroy() be called after 'finish' (and potentially 'end')
	  this.autoDestroy = !!options.autoDestroy;

	  // count buffered requests
	  this.bufferedRequestCount = 0;

	  // allocate the first CorkedRequest, there is always
	  // one allocated and free to use, and we maintain at most two
	  this.corkedRequestsFree = new CorkedRequest(this);
	}
	WritableState.prototype.getBuffer = function getBuffer() {
	  var current = this.bufferedRequest;
	  var out = [];
	  while (current) {
	    out.push(current);
	    current = current.next;
	  }
	  return out;
	};
	(function () {
	  try {
	    Object.defineProperty(WritableState.prototype, 'buffer', {
	      get: internalUtil.deprecate(function writableStateBufferGetter() {
	        return this.getBuffer();
	      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
	    });
	  } catch (_) {}
	})();

	// Test _writableState for inheritance to account for Duplex streams,
	// whose prototype chain only points to Readable.
	var realHasInstance;
	if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
	  realHasInstance = Function.prototype[Symbol.hasInstance];
	  Object.defineProperty(Writable, Symbol.hasInstance, {
	    value: function value(object) {
	      if (realHasInstance.call(this, object)) return true;
	      if (this !== Writable) return false;
	      return object && object._writableState instanceof WritableState;
	    }
	  });
	} else {
	  realHasInstance = function realHasInstance(object) {
	    return object instanceof this;
	  };
	}
	function Writable(options) {
	  Duplex = Duplex || require_stream_duplex();

	  // Writable ctor is applied to Duplexes, too.
	  // `realHasInstance` is necessary because using plain `instanceof`
	  // would return false, as no `_writableState` property is attached.

	  // Trying to use the custom `instanceof` for Writable here will also break the
	  // Node.js LazyTransform implementation, which has a non-trivial getter for
	  // `_writableState` that would lead to infinite recursion.

	  // Checking for a Stream.Duplex instance is faster here instead of inside
	  // the WritableState constructor, at least with V8 6.5
	  var isDuplex = this instanceof Duplex;
	  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
	  this._writableState = new WritableState(options, this, isDuplex);

	  // legacy.
	  this.writable = true;
	  if (options) {
	    if (typeof options.write === 'function') this._write = options.write;
	    if (typeof options.writev === 'function') this._writev = options.writev;
	    if (typeof options.destroy === 'function') this._destroy = options.destroy;
	    if (typeof options.final === 'function') this._final = options.final;
	  }
	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function () {
	  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
	};
	function writeAfterEnd(stream, cb) {
	  var er = new ERR_STREAM_WRITE_AFTER_END();
	  // TODO: defer error events consistently everywhere, not just the cb
	  errorOrDestroy(stream, er);
	  process$1.nextTick(cb, er);
	}

	// Checks that a user-supplied chunk is valid, especially for the particular
	// mode the stream is in. Currently this means that `null` is never accepted
	// and undefined/non-string values are only allowed in object mode.
	function validChunk(stream, state, chunk, cb) {
	  var er;
	  if (chunk === null) {
	    er = new ERR_STREAM_NULL_VALUES();
	  } else if (typeof chunk !== 'string' && !state.objectMode) {
	    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
	  }
	  if (er) {
	    errorOrDestroy(stream, er);
	    process$1.nextTick(cb, er);
	    return false;
	  }
	  return true;
	}
	Writable.prototype.write = function (chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;
	  var isBuf = !state.objectMode && _isUint8Array(chunk);
	  if (isBuf && !Buffer.isBuffer(chunk)) {
	    chunk = _uint8ArrayToBuffer(chunk);
	  }
	  if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }
	  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
	  if (typeof cb !== 'function') cb = nop;
	  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
	  }
	  return ret;
	};
	Writable.prototype.cork = function () {
	  this._writableState.corked++;
	};
	Writable.prototype.uncork = function () {
	  var state = this._writableState;
	  if (state.corked) {
	    state.corked--;
	    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
	  }
	};
	Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
	  // node::ParseEncoding() requires lower case.
	  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
	  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
	  this._writableState.defaultEncoding = encoding;
	  return this;
	};
	Object.defineProperty(Writable.prototype, 'writableBuffer', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState && this._writableState.getBuffer();
	  }
	});
	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
	    chunk = Buffer.from(chunk, encoding);
	  }
	  return chunk;
	}
	Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState.highWaterMark;
	  }
	});

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
	  if (!isBuf) {
	    var newChunk = decodeChunk(state, chunk, encoding);
	    if (chunk !== newChunk) {
	      isBuf = true;
	      encoding = 'buffer';
	      chunk = newChunk;
	    }
	  }
	  var len = state.objectMode ? 1 : chunk.length;
	  state.length += len;
	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret) state.needDrain = true;
	  if (state.writing || state.corked) {
	    var last = state.lastBufferedRequest;
	    state.lastBufferedRequest = {
	      chunk: chunk,
	      encoding: encoding,
	      isBuf: isBuf,
	      callback: cb,
	      next: null
	    };
	    if (last) {
	      last.next = state.lastBufferedRequest;
	    } else {
	      state.bufferedRequest = state.lastBufferedRequest;
	    }
	    state.bufferedRequestCount += 1;
	  } else {
	    doWrite(stream, state, false, len, chunk, encoding, cb);
	  }
	  return ret;
	}
	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}
	function onwriteError(stream, state, sync, er, cb) {
	  --state.pendingcb;
	  if (sync) {
	    // defer the callback if we are being called synchronously
	    // to avoid piling up things on the stack
	    process$1.nextTick(cb, er);
	    // this can emit finish, and it will always happen
	    // after error
	    process$1.nextTick(finishMaybe, stream, state);
	    stream._writableState.errorEmitted = true;
	    errorOrDestroy(stream, er);
	  } else {
	    // the caller expect this to happen before if
	    // it is async
	    cb(er);
	    stream._writableState.errorEmitted = true;
	    errorOrDestroy(stream, er);
	    // this can emit finish, but finish must
	    // always follow error
	    finishMaybe(stream, state);
	  }
	}
	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}
	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;
	  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
	  onwriteStateUpdate(state);
	  if (er) onwriteError(stream, state, sync, er, cb);else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(state) || stream.destroyed;
	    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
	      clearBuffer(stream, state);
	    }
	    if (sync) {
	      process$1.nextTick(afterWrite, stream, state, finished, cb);
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}
	function afterWrite(stream, state, finished, cb) {
	  if (!finished) onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}

	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;
	  var entry = state.bufferedRequest;
	  if (stream._writev && entry && entry.next) {
	    // Fast case, write everything using _writev()
	    var l = state.bufferedRequestCount;
	    var buffer = new Array(l);
	    var holder = state.corkedRequestsFree;
	    holder.entry = entry;
	    var count = 0;
	    var allBuffers = true;
	    while (entry) {
	      buffer[count] = entry;
	      if (!entry.isBuf) allBuffers = false;
	      entry = entry.next;
	      count += 1;
	    }
	    buffer.allBuffers = allBuffers;
	    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

	    // doWrite is almost always async, defer these to save a bit of time
	    // as the hot path ends with doWrite
	    state.pendingcb++;
	    state.lastBufferedRequest = null;
	    if (holder.next) {
	      state.corkedRequestsFree = holder.next;
	      holder.next = null;
	    } else {
	      state.corkedRequestsFree = new CorkedRequest(state);
	    }
	    state.bufferedRequestCount = 0;
	  } else {
	    // Slow case, write chunks one-by-one
	    while (entry) {
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;
	      doWrite(stream, state, false, len, chunk, encoding, cb);
	      entry = entry.next;
	      state.bufferedRequestCount--;
	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        break;
	      }
	    }
	    if (entry === null) state.lastBufferedRequest = null;
	  }
	  state.bufferedRequest = entry;
	  state.bufferProcessing = false;
	}
	Writable.prototype._write = function (chunk, encoding, cb) {
	  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
	};
	Writable.prototype._writev = null;
	Writable.prototype.end = function (chunk, encoding, cb) {
	  var state = this._writableState;
	  if (typeof chunk === 'function') {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }
	  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending) endWritable(this, state, cb);
	  return this;
	};
	Object.defineProperty(Writable.prototype, 'writableLength', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState.length;
	  }
	});
	function needFinish(state) {
	  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
	}
	function callFinal(stream, state) {
	  stream._final(function (err) {
	    state.pendingcb--;
	    if (err) {
	      errorOrDestroy(stream, err);
	    }
	    state.prefinished = true;
	    stream.emit('prefinish');
	    finishMaybe(stream, state);
	  });
	}
	function prefinish(stream, state) {
	  if (!state.prefinished && !state.finalCalled) {
	    if (typeof stream._final === 'function' && !state.destroyed) {
	      state.pendingcb++;
	      state.finalCalled = true;
	      process$1.nextTick(callFinal, stream, state);
	    } else {
	      state.prefinished = true;
	      stream.emit('prefinish');
	    }
	  }
	}
	function finishMaybe(stream, state) {
	  var need = needFinish(state);
	  if (need) {
	    prefinish(stream, state);
	    if (state.pendingcb === 0) {
	      state.finished = true;
	      stream.emit('finish');
	      if (state.autoDestroy) {
	        // In case of duplex streams we need a way to detect
	        // if the readable side is ready for autoDestroy as well
	        var rState = stream._readableState;
	        if (!rState || rState.autoDestroy && rState.endEmitted) {
	          stream.destroy();
	        }
	      }
	    }
	  }
	  return need;
	}
	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished) process$1.nextTick(cb);else stream.once('finish', cb);
	  }
	  state.ended = true;
	  stream.writable = false;
	}
	function onCorkedFinish(corkReq, state, err) {
	  var entry = corkReq.entry;
	  corkReq.entry = null;
	  while (entry) {
	    var cb = entry.callback;
	    state.pendingcb--;
	    cb(err);
	    entry = entry.next;
	  }

	  // reuse the free corkReq.
	  state.corkedRequestsFree.next = corkReq;
	}
	Object.defineProperty(Writable.prototype, 'destroyed', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    if (this._writableState === undefined) {
	      return false;
	    }
	    return this._writableState.destroyed;
	  },
	  set: function set(value) {
	    // we ignore the value if the stream
	    // has not been initialized yet
	    if (!this._writableState) {
	      return;
	    }

	    // backward compatibility, the user is explicitly
	    // managing destroyed
	    this._writableState.destroyed = value;
	  }
	});
	Writable.prototype.destroy = destroyImpl.destroy;
	Writable.prototype._undestroy = destroyImpl.undestroy;
	Writable.prototype._destroy = function (err, cb) {
	  cb(err);
	};
	return _stream_writable;
}

var _stream_duplex;
var hasRequired_stream_duplex;

function require_stream_duplex () {
	if (hasRequired_stream_duplex) return _stream_duplex;
	hasRequired_stream_duplex = 1;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	};
	/*</replacement>*/

	_stream_duplex = Duplex;
	var Readable = require_stream_readable();
	var Writable = require_stream_writable();
	inherits_browserExports$1(Duplex, Readable);
	{
	  // Allow the keys array to be GC'ed.
	  var keys = objectKeys(Writable.prototype);
	  for (var v = 0; v < keys.length; v++) {
	    var method = keys[v];
	    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
	  }
	}
	function Duplex(options) {
	  if (!(this instanceof Duplex)) return new Duplex(options);
	  Readable.call(this, options);
	  Writable.call(this, options);
	  this.allowHalfOpen = true;
	  if (options) {
	    if (options.readable === false) this.readable = false;
	    if (options.writable === false) this.writable = false;
	    if (options.allowHalfOpen === false) {
	      this.allowHalfOpen = false;
	      this.once('end', onend);
	    }
	  }
	}
	Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState.highWaterMark;
	  }
	});
	Object.defineProperty(Duplex.prototype, 'writableBuffer', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState && this._writableState.getBuffer();
	  }
	});
	Object.defineProperty(Duplex.prototype, 'writableLength', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._writableState.length;
	  }
	});

	// the no-half-open enforcer
	function onend() {
	  // If the writable side ended, then we're ok.
	  if (this._writableState.ended) return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process$1.nextTick(onEndNT, this);
	}
	function onEndNT(self) {
	  self.end();
	}
	Object.defineProperty(Duplex.prototype, 'destroyed', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    if (this._readableState === undefined || this._writableState === undefined) {
	      return false;
	    }
	    return this._readableState.destroyed && this._writableState.destroyed;
	  },
	  set: function set(value) {
	    // we ignore the value if the stream
	    // has not been initialized yet
	    if (this._readableState === undefined || this._writableState === undefined) {
	      return;
	    }

	    // backward compatibility, the user is explicitly
	    // managing destroyed
	    this._readableState.destroyed = value;
	    this._writableState.destroyed = value;
	  }
	});
	return _stream_duplex;
}

var string_decoder = {};

var safeBuffer = {exports: {}};

/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */

var hasRequiredSafeBuffer;

function requireSafeBuffer () {
	if (hasRequiredSafeBuffer) return safeBuffer.exports;
	hasRequiredSafeBuffer = 1;
	(function (module, exports) {
		/* eslint-disable node/no-deprecated-api */
		var buffer = buffer$1;
		var Buffer = buffer.Buffer;

		// alternative to using Object.keys for old browsers
		function copyProps (src, dst) {
		  for (var key in src) {
		    dst[key] = src[key];
		  }
		}
		if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
		  module.exports = buffer;
		} else {
		  // Copy properties from require('buffer')
		  copyProps(buffer, exports);
		  exports.Buffer = SafeBuffer;
		}

		function SafeBuffer (arg, encodingOrOffset, length) {
		  return Buffer(arg, encodingOrOffset, length)
		}

		SafeBuffer.prototype = Object.create(Buffer.prototype);

		// Copy static methods from Buffer
		copyProps(Buffer, SafeBuffer);

		SafeBuffer.from = function (arg, encodingOrOffset, length) {
		  if (typeof arg === 'number') {
		    throw new TypeError('Argument must not be a number')
		  }
		  return Buffer(arg, encodingOrOffset, length)
		};

		SafeBuffer.alloc = function (size, fill, encoding) {
		  if (typeof size !== 'number') {
		    throw new TypeError('Argument must be a number')
		  }
		  var buf = Buffer(size);
		  if (fill !== undefined) {
		    if (typeof encoding === 'string') {
		      buf.fill(fill, encoding);
		    } else {
		      buf.fill(fill);
		    }
		  } else {
		    buf.fill(0);
		  }
		  return buf
		};

		SafeBuffer.allocUnsafe = function (size) {
		  if (typeof size !== 'number') {
		    throw new TypeError('Argument must be a number')
		  }
		  return Buffer(size)
		};

		SafeBuffer.allocUnsafeSlow = function (size) {
		  if (typeof size !== 'number') {
		    throw new TypeError('Argument must be a number')
		  }
		  return buffer.SlowBuffer(size)
		}; 
	} (safeBuffer, safeBuffer.exports));
	return safeBuffer.exports;
}

var hasRequiredString_decoder;

function requireString_decoder () {
	if (hasRequiredString_decoder) return string_decoder;
	hasRequiredString_decoder = 1;

	/*<replacement>*/

	var Buffer = requireSafeBuffer().Buffer;
	/*</replacement>*/

	var isEncoding = Buffer.isEncoding || function (encoding) {
	  encoding = '' + encoding;
	  switch (encoding && encoding.toLowerCase()) {
	    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
	      return true;
	    default:
	      return false;
	  }
	};

	function _normalizeEncoding(enc) {
	  if (!enc) return 'utf8';
	  var retried;
	  while (true) {
	    switch (enc) {
	      case 'utf8':
	      case 'utf-8':
	        return 'utf8';
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return 'utf16le';
	      case 'latin1':
	      case 'binary':
	        return 'latin1';
	      case 'base64':
	      case 'ascii':
	      case 'hex':
	        return enc;
	      default:
	        if (retried) return; // undefined
	        enc = ('' + enc).toLowerCase();
	        retried = true;
	    }
	  }
	}
	// Do not cache `Buffer.isEncoding` when checking encoding names as some
	// modules monkey-patch it to support additional encodings
	function normalizeEncoding(enc) {
	  var nenc = _normalizeEncoding(enc);
	  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
	  return nenc || enc;
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters.
	string_decoder.StringDecoder = StringDecoder;
	function StringDecoder(encoding) {
	  this.encoding = normalizeEncoding(encoding);
	  var nb;
	  switch (this.encoding) {
	    case 'utf16le':
	      this.text = utf16Text;
	      this.end = utf16End;
	      nb = 4;
	      break;
	    case 'utf8':
	      this.fillLast = utf8FillLast;
	      nb = 4;
	      break;
	    case 'base64':
	      this.text = base64Text;
	      this.end = base64End;
	      nb = 3;
	      break;
	    default:
	      this.write = simpleWrite;
	      this.end = simpleEnd;
	      return;
	  }
	  this.lastNeed = 0;
	  this.lastTotal = 0;
	  this.lastChar = Buffer.allocUnsafe(nb);
	}

	StringDecoder.prototype.write = function (buf) {
	  if (buf.length === 0) return '';
	  var r;
	  var i;
	  if (this.lastNeed) {
	    r = this.fillLast(buf);
	    if (r === undefined) return '';
	    i = this.lastNeed;
	    this.lastNeed = 0;
	  } else {
	    i = 0;
	  }
	  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
	  return r || '';
	};

	StringDecoder.prototype.end = utf8End;

	// Returns only complete characters in a Buffer
	StringDecoder.prototype.text = utf8Text;

	// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
	StringDecoder.prototype.fillLast = function (buf) {
	  if (this.lastNeed <= buf.length) {
	    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
	    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
	  }
	  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
	  this.lastNeed -= buf.length;
	};

	// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
	// continuation byte. If an invalid byte is detected, -2 is returned.
	function utf8CheckByte(byte) {
	  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
	  return byte >> 6 === 0x02 ? -1 : -2;
	}

	// Checks at most 3 bytes at the end of a Buffer in order to detect an
	// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
	// needed to complete the UTF-8 character (if applicable) are returned.
	function utf8CheckIncomplete(self, buf, i) {
	  var j = buf.length - 1;
	  if (j < i) return 0;
	  var nb = utf8CheckByte(buf[j]);
	  if (nb >= 0) {
	    if (nb > 0) self.lastNeed = nb - 1;
	    return nb;
	  }
	  if (--j < i || nb === -2) return 0;
	  nb = utf8CheckByte(buf[j]);
	  if (nb >= 0) {
	    if (nb > 0) self.lastNeed = nb - 2;
	    return nb;
	  }
	  if (--j < i || nb === -2) return 0;
	  nb = utf8CheckByte(buf[j]);
	  if (nb >= 0) {
	    if (nb > 0) {
	      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
	    }
	    return nb;
	  }
	  return 0;
	}

	// Validates as many continuation bytes for a multi-byte UTF-8 character as
	// needed or are available. If we see a non-continuation byte where we expect
	// one, we "replace" the validated continuation bytes we've seen so far with
	// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
	// behavior. The continuation byte check is included three times in the case
	// where all of the continuation bytes for a character exist in the same buffer.
	// It is also done this way as a slight performance increase instead of using a
	// loop.
	function utf8CheckExtraBytes(self, buf, p) {
	  if ((buf[0] & 0xC0) !== 0x80) {
	    self.lastNeed = 0;
	    return '\ufffd';
	  }
	  if (self.lastNeed > 1 && buf.length > 1) {
	    if ((buf[1] & 0xC0) !== 0x80) {
	      self.lastNeed = 1;
	      return '\ufffd';
	    }
	    if (self.lastNeed > 2 && buf.length > 2) {
	      if ((buf[2] & 0xC0) !== 0x80) {
	        self.lastNeed = 2;
	        return '\ufffd';
	      }
	    }
	  }
	}

	// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
	function utf8FillLast(buf) {
	  var p = this.lastTotal - this.lastNeed;
	  var r = utf8CheckExtraBytes(this, buf);
	  if (r !== undefined) return r;
	  if (this.lastNeed <= buf.length) {
	    buf.copy(this.lastChar, p, 0, this.lastNeed);
	    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
	  }
	  buf.copy(this.lastChar, p, 0, buf.length);
	  this.lastNeed -= buf.length;
	}

	// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
	// partial character, the character's bytes are buffered until the required
	// number of bytes are available.
	function utf8Text(buf, i) {
	  var total = utf8CheckIncomplete(this, buf, i);
	  if (!this.lastNeed) return buf.toString('utf8', i);
	  this.lastTotal = total;
	  var end = buf.length - (total - this.lastNeed);
	  buf.copy(this.lastChar, 0, end);
	  return buf.toString('utf8', i, end);
	}

	// For UTF-8, a replacement character is added when ending on a partial
	// character.
	function utf8End(buf) {
	  var r = buf && buf.length ? this.write(buf) : '';
	  if (this.lastNeed) return r + '\ufffd';
	  return r;
	}

	// UTF-16LE typically needs two bytes per character, but even if we have an even
	// number of bytes available, we need to check if we end on a leading/high
	// surrogate. In that case, we need to wait for the next two bytes in order to
	// decode the last character properly.
	function utf16Text(buf, i) {
	  if ((buf.length - i) % 2 === 0) {
	    var r = buf.toString('utf16le', i);
	    if (r) {
	      var c = r.charCodeAt(r.length - 1);
	      if (c >= 0xD800 && c <= 0xDBFF) {
	        this.lastNeed = 2;
	        this.lastTotal = 4;
	        this.lastChar[0] = buf[buf.length - 2];
	        this.lastChar[1] = buf[buf.length - 1];
	        return r.slice(0, -1);
	      }
	    }
	    return r;
	  }
	  this.lastNeed = 1;
	  this.lastTotal = 2;
	  this.lastChar[0] = buf[buf.length - 1];
	  return buf.toString('utf16le', i, buf.length - 1);
	}

	// For UTF-16LE we do not explicitly append special replacement characters if we
	// end on a partial character, we simply let v8 handle that.
	function utf16End(buf) {
	  var r = buf && buf.length ? this.write(buf) : '';
	  if (this.lastNeed) {
	    var end = this.lastTotal - this.lastNeed;
	    return r + this.lastChar.toString('utf16le', 0, end);
	  }
	  return r;
	}

	function base64Text(buf, i) {
	  var n = (buf.length - i) % 3;
	  if (n === 0) return buf.toString('base64', i);
	  this.lastNeed = 3 - n;
	  this.lastTotal = 3;
	  if (n === 1) {
	    this.lastChar[0] = buf[buf.length - 1];
	  } else {
	    this.lastChar[0] = buf[buf.length - 2];
	    this.lastChar[1] = buf[buf.length - 1];
	  }
	  return buf.toString('base64', i, buf.length - n);
	}

	function base64End(buf) {
	  var r = buf && buf.length ? this.write(buf) : '';
	  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
	  return r;
	}

	// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
	function simpleWrite(buf) {
	  return buf.toString(this.encoding);
	}

	function simpleEnd(buf) {
	  return buf && buf.length ? this.write(buf) : '';
	}
	return string_decoder;
}

var endOfStream;
var hasRequiredEndOfStream;

function requireEndOfStream () {
	if (hasRequiredEndOfStream) return endOfStream;
	hasRequiredEndOfStream = 1;

	var ERR_STREAM_PREMATURE_CLOSE = requireErrorsBrowser().codes.ERR_STREAM_PREMATURE_CLOSE;
	function once(callback) {
	  var called = false;
	  return function () {
	    if (called) return;
	    called = true;
	    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	      args[_key] = arguments[_key];
	    }
	    callback.apply(this, args);
	  };
	}
	function noop() {}
	function isRequest(stream) {
	  return stream.setHeader && typeof stream.abort === 'function';
	}
	function eos(stream, opts, callback) {
	  if (typeof opts === 'function') return eos(stream, null, opts);
	  if (!opts) opts = {};
	  callback = once(callback || noop);
	  var readable = opts.readable || opts.readable !== false && stream.readable;
	  var writable = opts.writable || opts.writable !== false && stream.writable;
	  var onlegacyfinish = function onlegacyfinish() {
	    if (!stream.writable) onfinish();
	  };
	  var writableEnded = stream._writableState && stream._writableState.finished;
	  var onfinish = function onfinish() {
	    writable = false;
	    writableEnded = true;
	    if (!readable) callback.call(stream);
	  };
	  var readableEnded = stream._readableState && stream._readableState.endEmitted;
	  var onend = function onend() {
	    readable = false;
	    readableEnded = true;
	    if (!writable) callback.call(stream);
	  };
	  var onerror = function onerror(err) {
	    callback.call(stream, err);
	  };
	  var onclose = function onclose() {
	    var err;
	    if (readable && !readableEnded) {
	      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
	      return callback.call(stream, err);
	    }
	    if (writable && !writableEnded) {
	      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
	      return callback.call(stream, err);
	    }
	  };
	  var onrequest = function onrequest() {
	    stream.req.on('finish', onfinish);
	  };
	  if (isRequest(stream)) {
	    stream.on('complete', onfinish);
	    stream.on('abort', onclose);
	    if (stream.req) onrequest();else stream.on('request', onrequest);
	  } else if (writable && !stream._writableState) {
	    // legacy streams
	    stream.on('end', onlegacyfinish);
	    stream.on('close', onlegacyfinish);
	  }
	  stream.on('end', onend);
	  stream.on('finish', onfinish);
	  if (opts.error !== false) stream.on('error', onerror);
	  stream.on('close', onclose);
	  return function () {
	    stream.removeListener('complete', onfinish);
	    stream.removeListener('abort', onclose);
	    stream.removeListener('request', onrequest);
	    if (stream.req) stream.req.removeListener('finish', onfinish);
	    stream.removeListener('end', onlegacyfinish);
	    stream.removeListener('close', onlegacyfinish);
	    stream.removeListener('finish', onfinish);
	    stream.removeListener('end', onend);
	    stream.removeListener('error', onerror);
	    stream.removeListener('close', onclose);
	  };
	}
	endOfStream = eos;
	return endOfStream;
}

var async_iterator;
var hasRequiredAsync_iterator;

function requireAsync_iterator () {
	if (hasRequiredAsync_iterator) return async_iterator;
	hasRequiredAsync_iterator = 1;

	var _Object$setPrototypeO;
	function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
	function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
	function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
	var finished = requireEndOfStream();
	var kLastResolve = Symbol('lastResolve');
	var kLastReject = Symbol('lastReject');
	var kError = Symbol('error');
	var kEnded = Symbol('ended');
	var kLastPromise = Symbol('lastPromise');
	var kHandlePromise = Symbol('handlePromise');
	var kStream = Symbol('stream');
	function createIterResult(value, done) {
	  return {
	    value: value,
	    done: done
	  };
	}
	function readAndResolve(iter) {
	  var resolve = iter[kLastResolve];
	  if (resolve !== null) {
	    var data = iter[kStream].read();
	    // we defer if data is null
	    // we can be expecting either 'end' or
	    // 'error'
	    if (data !== null) {
	      iter[kLastPromise] = null;
	      iter[kLastResolve] = null;
	      iter[kLastReject] = null;
	      resolve(createIterResult(data, false));
	    }
	  }
	}
	function onReadable(iter) {
	  // we wait for the next tick, because it might
	  // emit an error with process.nextTick
	  process$1.nextTick(readAndResolve, iter);
	}
	function wrapForNext(lastPromise, iter) {
	  return function (resolve, reject) {
	    lastPromise.then(function () {
	      if (iter[kEnded]) {
	        resolve(createIterResult(undefined, true));
	        return;
	      }
	      iter[kHandlePromise](resolve, reject);
	    }, reject);
	  };
	}
	var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
	var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
	  get stream() {
	    return this[kStream];
	  },
	  next: function next() {
	    var _this = this;
	    // if we have detected an error in the meanwhile
	    // reject straight away
	    var error = this[kError];
	    if (error !== null) {
	      return Promise.reject(error);
	    }
	    if (this[kEnded]) {
	      return Promise.resolve(createIterResult(undefined, true));
	    }
	    if (this[kStream].destroyed) {
	      // We need to defer via nextTick because if .destroy(err) is
	      // called, the error will be emitted via nextTick, and
	      // we cannot guarantee that there is no error lingering around
	      // waiting to be emitted.
	      return new Promise(function (resolve, reject) {
	        process$1.nextTick(function () {
	          if (_this[kError]) {
	            reject(_this[kError]);
	          } else {
	            resolve(createIterResult(undefined, true));
	          }
	        });
	      });
	    }

	    // if we have multiple next() calls
	    // we will wait for the previous Promise to finish
	    // this logic is optimized to support for await loops,
	    // where next() is only called once at a time
	    var lastPromise = this[kLastPromise];
	    var promise;
	    if (lastPromise) {
	      promise = new Promise(wrapForNext(lastPromise, this));
	    } else {
	      // fast path needed to support multiple this.push()
	      // without triggering the next() queue
	      var data = this[kStream].read();
	      if (data !== null) {
	        return Promise.resolve(createIterResult(data, false));
	      }
	      promise = new Promise(this[kHandlePromise]);
	    }
	    this[kLastPromise] = promise;
	    return promise;
	  }
	}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
	  return this;
	}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
	  var _this2 = this;
	  // destroy(err, cb) is a private API
	  // we can guarantee we have that here, because we control the
	  // Readable class this is attached to
	  return new Promise(function (resolve, reject) {
	    _this2[kStream].destroy(null, function (err) {
	      if (err) {
	        reject(err);
	        return;
	      }
	      resolve(createIterResult(undefined, true));
	    });
	  });
	}), _Object$setPrototypeO), AsyncIteratorPrototype);
	var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
	  var _Object$create;
	  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
	    value: stream,
	    writable: true
	  }), _defineProperty(_Object$create, kLastResolve, {
	    value: null,
	    writable: true
	  }), _defineProperty(_Object$create, kLastReject, {
	    value: null,
	    writable: true
	  }), _defineProperty(_Object$create, kError, {
	    value: null,
	    writable: true
	  }), _defineProperty(_Object$create, kEnded, {
	    value: stream._readableState.endEmitted,
	    writable: true
	  }), _defineProperty(_Object$create, kHandlePromise, {
	    value: function value(resolve, reject) {
	      var data = iterator[kStream].read();
	      if (data) {
	        iterator[kLastPromise] = null;
	        iterator[kLastResolve] = null;
	        iterator[kLastReject] = null;
	        resolve(createIterResult(data, false));
	      } else {
	        iterator[kLastResolve] = resolve;
	        iterator[kLastReject] = reject;
	      }
	    },
	    writable: true
	  }), _Object$create));
	  iterator[kLastPromise] = null;
	  finished(stream, function (err) {
	    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
	      var reject = iterator[kLastReject];
	      // reject if we are waiting for data in the Promise
	      // returned by next() and store the error
	      if (reject !== null) {
	        iterator[kLastPromise] = null;
	        iterator[kLastResolve] = null;
	        iterator[kLastReject] = null;
	        reject(err);
	      }
	      iterator[kError] = err;
	      return;
	    }
	    var resolve = iterator[kLastResolve];
	    if (resolve !== null) {
	      iterator[kLastPromise] = null;
	      iterator[kLastResolve] = null;
	      iterator[kLastReject] = null;
	      resolve(createIterResult(undefined, true));
	    }
	    iterator[kEnded] = true;
	  });
	  stream.on('readable', onReadable.bind(null, iterator));
	  return iterator;
	};
	async_iterator = createReadableStreamAsyncIterator;
	return async_iterator;
}

var fromBrowser;
var hasRequiredFromBrowser;

function requireFromBrowser () {
	if (hasRequiredFromBrowser) return fromBrowser;
	hasRequiredFromBrowser = 1;
	fromBrowser = function () {
	  throw new Error('Readable.from is not available in the browser')
	};
	return fromBrowser;
}

var _stream_readable;
var hasRequired_stream_readable;

function require_stream_readable () {
	if (hasRequired_stream_readable) return _stream_readable;
	hasRequired_stream_readable = 1;

	_stream_readable = Readable;

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	/*<replacement>*/
	eventsExports.EventEmitter;
	var EElistenerCount = function EElistenerCount(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream = requireStreamBrowser();
	/*</replacement>*/

	var Buffer = buffer$1.Buffer;
	var OurUint8Array = (typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {}).Uint8Array || function () {};
	function _uint8ArrayToBuffer(chunk) {
	  return Buffer.from(chunk);
	}
	function _isUint8Array(obj) {
	  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
	}

	/*<replacement>*/
	var debugUtil = require$$0;
	var debug;
	if (debugUtil && debugUtil.debuglog) {
	  debug = debugUtil.debuglog('stream');
	} else {
	  debug = function debug() {};
	}
	/*</replacement>*/

	var BufferList = requireBuffer_list();
	var destroyImpl = requireDestroy();
	var _require = requireState(),
	  getHighWaterMark = _require.getHighWaterMark;
	var _require$codes = requireErrorsBrowser().codes,
	  ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
	  ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
	  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
	  ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;

	// Lazy loaded to improve the startup performance.
	var StringDecoder;
	var createReadableStreamAsyncIterator;
	var from;
	inherits_browserExports$1(Readable, Stream);
	var errorOrDestroy = destroyImpl.errorOrDestroy;
	var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];
	function prependListener(emitter, event, fn) {
	  // Sadly this is not cacheable as some libraries bundle their own
	  // event emitter implementation with them.
	  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

	  // This is a hack to make sure that our error handler is attached before any
	  // userland ones.  NEVER DO THIS. This is here only because this code needs
	  // to continue to work with older versions of Node.js that do not include
	  // the prependListener() method. The goal is to eventually remove this hack.
	  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
	}
	function ReadableState(options, stream, isDuplex) {
	  Duplex = Duplex || require_stream_duplex();
	  options = options || {};

	  // Duplex streams are both readable and writable, but share
	  // the same options object.
	  // However, some cases require setting options to different
	  // values for the readable and the writable sides of the duplex stream.
	  // These options can be provided separately as readableXXX and writableXXX.
	  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex;

	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;
	  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex);

	  // A linked list is used to store data chunks instead of an array because the
	  // linked list can remove elements from the beginning faster than
	  // array.shift()
	  this.buffer = new BufferList();
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the event 'readable'/'data' is emitted
	  // immediately, or on a later tick.  We set this to true at first, because
	  // any actions that shouldn't happen until "later" should generally also
	  // not happen before the first read call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;
	  this.resumeScheduled = false;
	  this.paused = true;

	  // Should close be emitted on destroy. Defaults to true.
	  this.emitClose = options.emitClose !== false;

	  // Should .destroy() be called after 'end' (and potentially 'finish')
	  this.autoDestroy = !!options.autoDestroy;

	  // has it been destroyed
	  this.destroyed = false;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;
	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder) StringDecoder = requireString_decoder().StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}
	function Readable(options) {
	  Duplex = Duplex || require_stream_duplex();
	  if (!(this instanceof Readable)) return new Readable(options);

	  // Checking for a Stream.Duplex instance is faster here instead of inside
	  // the ReadableState constructor, at least with V8 6.5
	  var isDuplex = this instanceof Duplex;
	  this._readableState = new ReadableState(options, this, isDuplex);

	  // legacy
	  this.readable = true;
	  if (options) {
	    if (typeof options.read === 'function') this._read = options.read;
	    if (typeof options.destroy === 'function') this._destroy = options.destroy;
	  }
	  Stream.call(this);
	}
	Object.defineProperty(Readable.prototype, 'destroyed', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    if (this._readableState === undefined) {
	      return false;
	    }
	    return this._readableState.destroyed;
	  },
	  set: function set(value) {
	    // we ignore the value if the stream
	    // has not been initialized yet
	    if (!this._readableState) {
	      return;
	    }

	    // backward compatibility, the user is explicitly
	    // managing destroyed
	    this._readableState.destroyed = value;
	  }
	});
	Readable.prototype.destroy = destroyImpl.destroy;
	Readable.prototype._undestroy = destroyImpl.undestroy;
	Readable.prototype._destroy = function (err, cb) {
	  cb(err);
	};

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function (chunk, encoding) {
	  var state = this._readableState;
	  var skipChunkCheck;
	  if (!state.objectMode) {
	    if (typeof chunk === 'string') {
	      encoding = encoding || state.defaultEncoding;
	      if (encoding !== state.encoding) {
	        chunk = Buffer.from(chunk, encoding);
	        encoding = '';
	      }
	      skipChunkCheck = true;
	    }
	  } else {
	    skipChunkCheck = true;
	  }
	  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function (chunk) {
	  return readableAddChunk(this, chunk, null, true, false);
	};
	function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
	  debug('readableAddChunk', chunk);
	  var state = stream._readableState;
	  if (chunk === null) {
	    state.reading = false;
	    onEofChunk(stream, state);
	  } else {
	    var er;
	    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
	    if (er) {
	      errorOrDestroy(stream, er);
	    } else if (state.objectMode || chunk && chunk.length > 0) {
	      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
	        chunk = _uint8ArrayToBuffer(chunk);
	      }
	      if (addToFront) {
	        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
	      } else if (state.ended) {
	        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
	      } else if (state.destroyed) {
	        return false;
	      } else {
	        state.reading = false;
	        if (state.decoder && !encoding) {
	          chunk = state.decoder.write(chunk);
	          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
	        } else {
	          addChunk(stream, state, chunk, false);
	        }
	      }
	    } else if (!addToFront) {
	      state.reading = false;
	      maybeReadMore(stream, state);
	    }
	  }

	  // We can push more data if we are below the highWaterMark.
	  // Also, if we have no data yet, we can stand some more bytes.
	  // This is to work around cases where hwm=0, such as the repl.
	  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
	}
	function addChunk(stream, state, chunk, addToFront) {
	  if (state.flowing && state.length === 0 && !state.sync) {
	    state.awaitDrain = 0;
	    stream.emit('data', chunk);
	  } else {
	    // update the buffer info.
	    state.length += state.objectMode ? 1 : chunk.length;
	    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
	    if (state.needReadable) emitReadable(stream);
	  }
	  maybeReadMore(stream, state);
	}
	function chunkInvalid(state, chunk) {
	  var er;
	  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
	    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
	  }
	  return er;
	}
	Readable.prototype.isPaused = function () {
	  return this._readableState.flowing === false;
	};

	// backwards compatibility.
	Readable.prototype.setEncoding = function (enc) {
	  if (!StringDecoder) StringDecoder = requireString_decoder().StringDecoder;
	  var decoder = new StringDecoder(enc);
	  this._readableState.decoder = decoder;
	  // If setEncoding(null), decoder.encoding equals utf8
	  this._readableState.encoding = this._readableState.decoder.encoding;

	  // Iterate over current buffer to convert already stored Buffers:
	  var p = this._readableState.buffer.head;
	  var content = '';
	  while (p !== null) {
	    content += decoder.write(p.data);
	    p = p.next;
	  }
	  this._readableState.buffer.clear();
	  if (content !== '') this._readableState.buffer.push(content);
	  this._readableState.length = content.length;
	  return this;
	};

	// Don't raise the hwm > 1GB
	var MAX_HWM = 0x40000000;
	function computeNewHighWaterMark(n) {
	  if (n >= MAX_HWM) {
	    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2 to prevent increasing hwm excessively in
	    // tiny amounts
	    n--;
	    n |= n >>> 1;
	    n |= n >>> 2;
	    n |= n >>> 4;
	    n |= n >>> 8;
	    n |= n >>> 16;
	    n++;
	  }
	  return n;
	}

	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function howMuchToRead(n, state) {
	  if (n <= 0 || state.length === 0 && state.ended) return 0;
	  if (state.objectMode) return 1;
	  if (n !== n) {
	    // Only flow one buffer at a time
	    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
	  }
	  // If we're asking for more than the current hwm, then raise the hwm.
	  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
	  if (n <= state.length) return n;
	  // Don't have enough
	  if (!state.ended) {
	    state.needReadable = true;
	    return 0;
	  }
	  return state.length;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function (n) {
	  debug('read', n);
	  n = parseInt(n, 10);
	  var state = this._readableState;
	  var nOrig = n;
	  if (n !== 0) state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
	    return null;
	  }
	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0) endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  } else if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0) state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	    // If _read pushed data synchronously, then `reading` will be false,
	    // and we need to re-evaluate how much data we can return to the user.
	    if (!state.reading) n = howMuchToRead(nOrig, state);
	  }
	  var ret;
	  if (n > 0) ret = fromList(n, state);else ret = null;
	  if (ret === null) {
	    state.needReadable = state.length <= state.highWaterMark;
	    n = 0;
	  } else {
	    state.length -= n;
	    state.awaitDrain = 0;
	  }
	  if (state.length === 0) {
	    // If we have nothing in the buffer, then we want to know
	    // as soon as we *do* get something into the buffer.
	    if (!state.ended) state.needReadable = true;

	    // If we tried to read() past the EOF, then emit end on the next tick.
	    if (nOrig !== n && state.ended) endReadable(this);
	  }
	  if (ret !== null) this.emit('data', ret);
	  return ret;
	};
	function onEofChunk(stream, state) {
	  debug('onEofChunk');
	  if (state.ended) return;
	  if (state.decoder) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;
	  if (state.sync) {
	    // if we are sync, wait until next tick to emit the data.
	    // Otherwise we risk emitting data in the flow()
	    // the readable code triggers during a read() call
	    emitReadable(stream);
	  } else {
	    // emit 'readable' now to make sure it gets picked up.
	    state.needReadable = false;
	    if (!state.emittedReadable) {
	      state.emittedReadable = true;
	      emitReadable_(stream);
	    }
	  }
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  debug('emitReadable', state.needReadable, state.emittedReadable);
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    process$1.nextTick(emitReadable_, stream);
	  }
	}
	function emitReadable_(stream) {
	  var state = stream._readableState;
	  debug('emitReadable_', state.destroyed, state.length, state.ended);
	  if (!state.destroyed && (state.length || state.ended)) {
	    stream.emit('readable');
	    state.emittedReadable = false;
	  }

	  // The stream needs another readable event if
	  // 1. It is not flowing, as the flow mechanism will take
	  //    care of it.
	  // 2. It is not ended.
	  // 3. It is below the highWaterMark, so we can schedule
	  //    another readable later.
	  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
	  flow(stream);
	}

	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process$1.nextTick(maybeReadMore_, stream, state);
	  }
	}
	function maybeReadMore_(stream, state) {
	  // Attempt to read more data if we should.
	  //
	  // The conditions for reading more data are (one of):
	  // - Not enough data buffered (state.length < state.highWaterMark). The loop
	  //   is responsible for filling the buffer with enough data if such data
	  //   is available. If highWaterMark is 0 and we are not in the flowing mode
	  //   we should _not_ attempt to buffer any extra data. We'll get more data
	  //   when the stream consumer calls read() instead.
	  // - No data in the buffer, and the stream is in flowing mode. In this mode
	  //   the loop below is responsible for ensuring read() is called. Failing to
	  //   call read here would abort the flow and there's no other mechanism for
	  //   continuing the flow if the stream consumer has just subscribed to the
	  //   'data' event.
	  //
	  // In addition to the above conditions to keep reading data, the following
	  // conditions prevent the data from being read:
	  // - The stream has ended (state.ended).
	  // - There is already a pending 'read' operation (state.reading). This is a
	  //   case where the the stream has called the implementation defined _read()
	  //   method, but they are processing the call asynchronously and have _not_
	  //   called push() with new data. In this case we skip performing more
	  //   read()s. The execution ends in this method again after the _read() ends
	  //   up calling push() with more data.
	  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
	    var len = state.length;
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function (n) {
	  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
	};
	Readable.prototype.pipe = function (dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;
	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
	  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process$1.stdout && dest !== process$1.stderr;
	  var endFn = doEnd ? onend : unpipe;
	  if (state.endEmitted) process$1.nextTick(endFn);else src.once('end', endFn);
	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable, unpipeInfo) {
	    debug('onunpipe');
	    if (readable === src) {
	      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
	        unpipeInfo.hasUnpiped = true;
	        cleanup();
	      }
	    }
	  }
	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);
	  var cleanedUp = false;
	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', unpipe);
	    src.removeListener('data', ondata);
	    cleanedUp = true;

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
	  }
	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    debug('dest.write', ret);
	    if (ret === false) {
	      // If the user unpiped during `dest.write()`, it is possible
	      // to get stuck in a permanently paused state if that write
	      // also returned false.
	      // => Check whether `dest` is still a piping destination.
	      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
	        debug('false write response, pause', state.awaitDrain);
	        state.awaitDrain++;
	      }
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
	  }

	  // Make sure our error handler is attached before userland ones.
	  prependListener(dest, 'error', onerror);

	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);
	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }
	  return dest;
	};
	function pipeOnDrain(src) {
	  return function pipeOnDrainFunctionResult() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain) state.awaitDrain--;
	    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}
	Readable.prototype.unpipe = function (dest) {
	  var state = this._readableState;
	  var unpipeInfo = {
	    hasUnpiped: false
	  };

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0) return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes) return this;
	    if (!dest) dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest) dest.emit('unpipe', this, unpipeInfo);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    for (var i = 0; i < len; i++) dests[i].emit('unpipe', this, {
	      hasUnpiped: false
	    });
	    return this;
	  }

	  // try to find the right one.
	  var index = indexOf(state.pipes, dest);
	  if (index === -1) return this;
	  state.pipes.splice(index, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1) state.pipes = state.pipes[0];
	  dest.emit('unpipe', this, unpipeInfo);
	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function (ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);
	  var state = this._readableState;
	  if (ev === 'data') {
	    // update readableListening so that resume() may be a no-op
	    // a few lines down. This is needed to support once('readable').
	    state.readableListening = this.listenerCount('readable') > 0;

	    // Try start flowing on next tick if stream isn't explicitly paused
	    if (state.flowing !== false) this.resume();
	  } else if (ev === 'readable') {
	    if (!state.endEmitted && !state.readableListening) {
	      state.readableListening = state.needReadable = true;
	      state.flowing = false;
	      state.emittedReadable = false;
	      debug('on readable', state.length, state.reading);
	      if (state.length) {
	        emitReadable(this);
	      } else if (!state.reading) {
	        process$1.nextTick(nReadingNextTick, this);
	      }
	    }
	  }
	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;
	Readable.prototype.removeListener = function (ev, fn) {
	  var res = Stream.prototype.removeListener.call(this, ev, fn);
	  if (ev === 'readable') {
	    // We need to check if there is someone still listening to
	    // readable and reset the state. However this needs to happen
	    // after readable has been emitted but before I/O (nextTick) to
	    // support once('readable', fn) cycles. This means that calling
	    // resume within the same tick will have no
	    // effect.
	    process$1.nextTick(updateReadableListening, this);
	  }
	  return res;
	};
	Readable.prototype.removeAllListeners = function (ev) {
	  var res = Stream.prototype.removeAllListeners.apply(this, arguments);
	  if (ev === 'readable' || ev === undefined) {
	    // We need to check if there is someone still listening to
	    // readable and reset the state. However this needs to happen
	    // after readable has been emitted but before I/O (nextTick) to
	    // support once('readable', fn) cycles. This means that calling
	    // resume within the same tick will have no
	    // effect.
	    process$1.nextTick(updateReadableListening, this);
	  }
	  return res;
	};
	function updateReadableListening(self) {
	  var state = self._readableState;
	  state.readableListening = self.listenerCount('readable') > 0;
	  if (state.resumeScheduled && !state.paused) {
	    // flowing needs to be set to true now, otherwise
	    // the upcoming resume will not flow.
	    state.flowing = true;

	    // crude way to check if we should resume
	  } else if (self.listenerCount('data') > 0) {
	    self.resume();
	  }
	}
	function nReadingNextTick(self) {
	  debug('readable nexttick read 0');
	  self.read(0);
	}

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function () {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    // we flow only if there is no one listening
	    // for readable, but we still have to call
	    // resume()
	    state.flowing = !state.readableListening;
	    resume(this, state);
	  }
	  state.paused = false;
	  return this;
	};
	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process$1.nextTick(resume_, stream, state);
	  }
	}
	function resume_(stream, state) {
	  debug('resume', state.reading);
	  if (!state.reading) {
	    stream.read(0);
	  }
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading) stream.read(0);
	}
	Readable.prototype.pause = function () {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (this._readableState.flowing !== false) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  this._readableState.paused = true;
	  return this;
	};
	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  while (state.flowing && stream.read() !== null);
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function (stream) {
	  var _this = this;
	  var state = this._readableState;
	  var paused = false;
	  stream.on('end', function () {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length) _this.push(chunk);
	    }
	    _this.push(null);
	  });
	  stream.on('data', function (chunk) {
	    debug('wrapped data');
	    if (state.decoder) chunk = state.decoder.write(chunk);

	    // don't skip over falsy values in objectMode
	    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;
	    var ret = _this.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (this[i] === undefined && typeof stream[i] === 'function') {
	      this[i] = function methodWrap(method) {
	        return function methodWrapReturnFunction() {
	          return stream[method].apply(stream, arguments);
	        };
	      }(i);
	    }
	  }

	  // proxy certain important events.
	  for (var n = 0; n < kProxyEvents.length; n++) {
	    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
	  }

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  this._read = function (n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };
	  return this;
	};
	if (typeof Symbol === 'function') {
	  Readable.prototype[Symbol.asyncIterator] = function () {
	    if (createReadableStreamAsyncIterator === undefined) {
	      createReadableStreamAsyncIterator = requireAsync_iterator();
	    }
	    return createReadableStreamAsyncIterator(this);
	  };
	}
	Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._readableState.highWaterMark;
	  }
	});
	Object.defineProperty(Readable.prototype, 'readableBuffer', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._readableState && this._readableState.buffer;
	  }
	});
	Object.defineProperty(Readable.prototype, 'readableFlowing', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._readableState.flowing;
	  },
	  set: function set(state) {
	    if (this._readableState) {
	      this._readableState.flowing = state;
	    }
	  }
	});

	// exposed for testing purposes only.
	Readable._fromList = fromList;
	Object.defineProperty(Readable.prototype, 'readableLength', {
	  // making it explicit this property is not enumerable
	  // because otherwise some prototype manipulation in
	  // userland will fail
	  enumerable: false,
	  get: function get() {
	    return this._readableState.length;
	  }
	});

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function fromList(n, state) {
	  // nothing buffered
	  if (state.length === 0) return null;
	  var ret;
	  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
	    // read it all, truncate the list
	    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
	    state.buffer.clear();
	  } else {
	    // read part of list
	    ret = state.buffer.consume(n, state.decoder);
	  }
	  return ret;
	}
	function endReadable(stream) {
	  var state = stream._readableState;
	  debug('endReadable', state.endEmitted);
	  if (!state.endEmitted) {
	    state.ended = true;
	    process$1.nextTick(endReadableNT, state, stream);
	  }
	}
	function endReadableNT(state, stream) {
	  debug('endReadableNT', state.endEmitted, state.length);

	  // Check that we didn't get one last unshift.
	  if (!state.endEmitted && state.length === 0) {
	    state.endEmitted = true;
	    stream.readable = false;
	    stream.emit('end');
	    if (state.autoDestroy) {
	      // In case of duplex streams we need a way to detect
	      // if the writable side is ready for autoDestroy as well
	      var wState = stream._writableState;
	      if (!wState || wState.autoDestroy && wState.finished) {
	        stream.destroy();
	      }
	    }
	  }
	}
	if (typeof Symbol === 'function') {
	  Readable.from = function (iterable, opts) {
	    if (from === undefined) {
	      from = requireFromBrowser();
	    }
	    return from(Readable, iterable, opts);
	  };
	}
	function indexOf(xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	return _stream_readable;
}

var _stream_transform;
var hasRequired_stream_transform;

function require_stream_transform () {
	if (hasRequired_stream_transform) return _stream_transform;
	hasRequired_stream_transform = 1;

	_stream_transform = Transform;
	var _require$codes = requireErrorsBrowser().codes,
	  ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
	  ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
	  ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
	  ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;
	var Duplex = require_stream_duplex();
	inherits_browserExports$1(Transform, Duplex);
	function afterTransform(er, data) {
	  var ts = this._transformState;
	  ts.transforming = false;
	  var cb = ts.writecb;
	  if (cb === null) {
	    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
	  }
	  ts.writechunk = null;
	  ts.writecb = null;
	  if (data != null)
	    // single equals check for both `null` and `undefined`
	    this.push(data);
	  cb(er);
	  var rs = this._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    this._read(rs.highWaterMark);
	  }
	}
	function Transform(options) {
	  if (!(this instanceof Transform)) return new Transform(options);
	  Duplex.call(this, options);
	  this._transformState = {
	    afterTransform: afterTransform.bind(this),
	    needTransform: false,
	    transforming: false,
	    writecb: null,
	    writechunk: null,
	    writeencoding: null
	  };

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;
	  if (options) {
	    if (typeof options.transform === 'function') this._transform = options.transform;
	    if (typeof options.flush === 'function') this._flush = options.flush;
	  }

	  // When the writable side finishes, then flush out anything remaining.
	  this.on('prefinish', prefinish);
	}
	function prefinish() {
	  var _this = this;
	  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
	    this._flush(function (er, data) {
	      done(_this, er, data);
	    });
	  } else {
	    done(this, null, null);
	  }
	}
	Transform.prototype.push = function (chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function (chunk, encoding, cb) {
	  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
	};
	Transform.prototype._write = function (chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function (n) {
	  var ts = this._transformState;
	  if (ts.writechunk !== null && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};
	Transform.prototype._destroy = function (err, cb) {
	  Duplex.prototype._destroy.call(this, err, function (err2) {
	    cb(err2);
	  });
	};
	function done(stream, er, data) {
	  if (er) return stream.emit('error', er);
	  if (data != null)
	    // single equals check for both `null` and `undefined`
	    stream.push(data);

	  // TODO(BridgeAR): Write a test for these two error cases
	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
	  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
	  return stream.push(null);
	}
	return _stream_transform;
}

var _stream_passthrough;
var hasRequired_stream_passthrough;

function require_stream_passthrough () {
	if (hasRequired_stream_passthrough) return _stream_passthrough;
	hasRequired_stream_passthrough = 1;

	_stream_passthrough = PassThrough;
	var Transform = require_stream_transform();
	inherits_browserExports$1(PassThrough, Transform);
	function PassThrough(options) {
	  if (!(this instanceof PassThrough)) return new PassThrough(options);
	  Transform.call(this, options);
	}
	PassThrough.prototype._transform = function (chunk, encoding, cb) {
	  cb(null, chunk);
	};
	return _stream_passthrough;
}

var pipeline_1;
var hasRequiredPipeline;

function requirePipeline () {
	if (hasRequiredPipeline) return pipeline_1;
	hasRequiredPipeline = 1;

	var eos;
	function once(callback) {
	  var called = false;
	  return function () {
	    if (called) return;
	    called = true;
	    callback.apply(void 0, arguments);
	  };
	}
	var _require$codes = requireErrorsBrowser().codes,
	  ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
	  ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;
	function noop(err) {
	  // Rethrow the error if it exists to avoid swallowing it
	  if (err) throw err;
	}
	function isRequest(stream) {
	  return stream.setHeader && typeof stream.abort === 'function';
	}
	function destroyer(stream, reading, writing, callback) {
	  callback = once(callback);
	  var closed = false;
	  stream.on('close', function () {
	    closed = true;
	  });
	  if (eos === undefined) eos = requireEndOfStream();
	  eos(stream, {
	    readable: reading,
	    writable: writing
	  }, function (err) {
	    if (err) return callback(err);
	    closed = true;
	    callback();
	  });
	  var destroyed = false;
	  return function (err) {
	    if (closed) return;
	    if (destroyed) return;
	    destroyed = true;

	    // request.destroy just do .end - .abort is what we want
	    if (isRequest(stream)) return stream.abort();
	    if (typeof stream.destroy === 'function') return stream.destroy();
	    callback(err || new ERR_STREAM_DESTROYED('pipe'));
	  };
	}
	function call(fn) {
	  fn();
	}
	function pipe(from, to) {
	  return from.pipe(to);
	}
	function popCallback(streams) {
	  if (!streams.length) return noop;
	  if (typeof streams[streams.length - 1] !== 'function') return noop;
	  return streams.pop();
	}
	function pipeline() {
	  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
	    streams[_key] = arguments[_key];
	  }
	  var callback = popCallback(streams);
	  if (Array.isArray(streams[0])) streams = streams[0];
	  if (streams.length < 2) {
	    throw new ERR_MISSING_ARGS('streams');
	  }
	  var error;
	  var destroys = streams.map(function (stream, i) {
	    var reading = i < streams.length - 1;
	    var writing = i > 0;
	    return destroyer(stream, reading, writing, function (err) {
	      if (!error) error = err;
	      if (err) destroys.forEach(call);
	      if (reading) return;
	      destroys.forEach(call);
	      callback(error);
	    });
	  });
	  return streams.reduce(pipe);
	}
	pipeline_1 = pipeline;
	return pipeline_1;
}

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var streamBrowserify = Stream;

var EE = eventsExports.EventEmitter;
var inherits = inherits_browserExports$1;

inherits(Stream, EE);
Stream.Readable = require_stream_readable();
Stream.Writable = require_stream_writable();
Stream.Duplex = require_stream_duplex();
Stream.Transform = require_stream_transform();
Stream.PassThrough = require_stream_passthrough();
Stream.finished = requireEndOfStream();
Stream.pipeline = requirePipeline();

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

var promises = {};

var FileHandle$1 = {};

var util = {};

Object.defineProperty(util, "__esModule", { value: true });
util.promisify = void 0;
function promisify(fs, fn, getResult = input => input) {
    return (...args) => new Promise((resolve, reject) => {
        fs[fn].bind(fs)(...args, (error, result) => {
            if (error)
                return reject(error);
            return resolve(getResult(result));
        });
    });
}
util.promisify = promisify;

Object.defineProperty(FileHandle$1, "__esModule", { value: true });
FileHandle$1.FileHandle = void 0;
const util_1$2 = util;
class FileHandle {
    constructor(fs, fd) {
        this.fs = fs;
        this.fd = fd;
    }
    appendFile(data, options) {
        return (0, util_1$2.promisify)(this.fs, 'appendFile')(this.fd, data, options);
    }
    chmod(mode) {
        return (0, util_1$2.promisify)(this.fs, 'fchmod')(this.fd, mode);
    }
    chown(uid, gid) {
        return (0, util_1$2.promisify)(this.fs, 'fchown')(this.fd, uid, gid);
    }
    close() {
        return (0, util_1$2.promisify)(this.fs, 'close')(this.fd);
    }
    datasync() {
        return (0, util_1$2.promisify)(this.fs, 'fdatasync')(this.fd);
    }
    read(buffer, offset, length, position) {
        return (0, util_1$2.promisify)(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, position);
    }
    readFile(options) {
        return (0, util_1$2.promisify)(this.fs, 'readFile')(this.fd, options);
    }
    stat(options) {
        return (0, util_1$2.promisify)(this.fs, 'fstat')(this.fd, options);
    }
    sync() {
        return (0, util_1$2.promisify)(this.fs, 'fsync')(this.fd);
    }
    truncate(len) {
        return (0, util_1$2.promisify)(this.fs, 'ftruncate')(this.fd, len);
    }
    utimes(atime, mtime) {
        return (0, util_1$2.promisify)(this.fs, 'futimes')(this.fd, atime, mtime);
    }
    write(buffer, offset, length, position) {
        return (0, util_1$2.promisify)(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(this.fd, buffer, offset, length, position);
    }
    writeFile(data, options) {
        return (0, util_1$2.promisify)(this.fs, 'writeFile')(this.fd, data, options);
    }
}
FileHandle$1.FileHandle = FileHandle;

Object.defineProperty(promises, "__esModule", { value: true });
promises.createPromisesApi = void 0;
const FileHandle_1 = FileHandle$1;
const util_1$1 = util;
function createPromisesApi(vol) {
    if (typeof Promise === 'undefined')
        return null;
    return {
        FileHandle: FileHandle_1.FileHandle,
        access(path, mode) {
            return (0, util_1$1.promisify)(vol, 'access')(path, mode);
        },
        appendFile(path, data, options) {
            return (0, util_1$1.promisify)(vol, 'appendFile')(path instanceof FileHandle_1.FileHandle ? path.fd : path, data, options);
        },
        chmod(path, mode) {
            return (0, util_1$1.promisify)(vol, 'chmod')(path, mode);
        },
        chown(path, uid, gid) {
            return (0, util_1$1.promisify)(vol, 'chown')(path, uid, gid);
        },
        copyFile(src, dest, flags) {
            return (0, util_1$1.promisify)(vol, 'copyFile')(src, dest, flags);
        },
        lchmod(path, mode) {
            return (0, util_1$1.promisify)(vol, 'lchmod')(path, mode);
        },
        lchown(path, uid, gid) {
            return (0, util_1$1.promisify)(vol, 'lchown')(path, uid, gid);
        },
        link(existingPath, newPath) {
            return (0, util_1$1.promisify)(vol, 'link')(existingPath, newPath);
        },
        lstat(path, options) {
            return (0, util_1$1.promisify)(vol, 'lstat')(path, options);
        },
        mkdir(path, options) {
            return (0, util_1$1.promisify)(vol, 'mkdir')(path, options);
        },
        mkdtemp(prefix, options) {
            return (0, util_1$1.promisify)(vol, 'mkdtemp')(prefix, options);
        },
        open(path, flags, mode) {
            return (0, util_1$1.promisify)(vol, 'open', fd => new FileHandle_1.FileHandle(vol, fd))(path, flags, mode);
        },
        readdir(path, options) {
            return (0, util_1$1.promisify)(vol, 'readdir')(path, options);
        },
        readFile(id, options) {
            return (0, util_1$1.promisify)(vol, 'readFile')(id instanceof FileHandle_1.FileHandle ? id.fd : id, options);
        },
        readlink(path, options) {
            return (0, util_1$1.promisify)(vol, 'readlink')(path, options);
        },
        realpath(path, options) {
            return (0, util_1$1.promisify)(vol, 'realpath')(path, options);
        },
        rename(oldPath, newPath) {
            return (0, util_1$1.promisify)(vol, 'rename')(oldPath, newPath);
        },
        rmdir(path, options) {
            return (0, util_1$1.promisify)(vol, 'rmdir')(path, options);
        },
        rm(path, options) {
            return (0, util_1$1.promisify)(vol, 'rm')(path, options);
        },
        stat(path, options) {
            return (0, util_1$1.promisify)(vol, 'stat')(path, options);
        },
        symlink(target, path, type) {
            return (0, util_1$1.promisify)(vol, 'symlink')(target, path, type);
        },
        truncate(path, len) {
            return (0, util_1$1.promisify)(vol, 'truncate')(path, len);
        },
        unlink(path) {
            return (0, util_1$1.promisify)(vol, 'unlink')(path);
        },
        utimes(path, atime, mtime) {
            return (0, util_1$1.promisify)(vol, 'utimes')(path, atime, mtime);
        },
        writeFile(id, data, options) {
            return (0, util_1$1.promisify)(vol, 'writeFile')(id instanceof FileHandle_1.FileHandle ? id.fd : id, data, options);
        },
    };
}
promises.createPromisesApi = createPromisesApi;

var url = {};

var punycode = {exports: {}};

/*! https://mths.be/punycode v1.4.1 by @mathias */
punycode.exports;

var hasRequiredPunycode;

function requirePunycode () {
	if (hasRequiredPunycode) return punycode.exports;
	hasRequiredPunycode = 1;
	(function (module, exports) {
(function(root) {

			/** Detect free variables */
			var freeExports = exports &&
				!exports.nodeType && exports;
			var freeModule = module &&
				!module.nodeType && module;
			var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal;
			if (
				freeGlobal.global === freeGlobal ||
				freeGlobal.window === freeGlobal ||
				freeGlobal.self === freeGlobal
			) {
				root = freeGlobal;
			}

			/**
			 * The `punycode` object.
			 * @name punycode
			 * @type Object
			 */
			var punycode,

			/** Highest positive signed 32-bit float value */
			maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

			/** Bootstring parameters */
			base = 36,
			tMin = 1,
			tMax = 26,
			skew = 38,
			damp = 700,
			initialBias = 72,
			initialN = 128, // 0x80
			delimiter = '-', // '\x2D'

			/** Regular expressions */
			regexPunycode = /^xn--/,
			regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
			regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

			/** Error messages */
			errors = {
				'overflow': 'Overflow: input needs wider integers to process',
				'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
				'invalid-input': 'Invalid input'
			},

			/** Convenience shortcuts */
			baseMinusTMin = base - tMin,
			floor = Math.floor,
			stringFromCharCode = String.fromCharCode,

			/** Temporary variable */
			key;

			/*--------------------------------------------------------------------------*/

			/**
			 * A generic error utility function.
			 * @private
			 * @param {String} type The error type.
			 * @returns {Error} Throws a `RangeError` with the applicable error message.
			 */
			function error(type) {
				throw new RangeError(errors[type]);
			}

			/**
			 * A generic `Array#map` utility function.
			 * @private
			 * @param {Array} array The array to iterate over.
			 * @param {Function} callback The function that gets called for every array
			 * item.
			 * @returns {Array} A new array of values returned by the callback function.
			 */
			function map(array, fn) {
				var length = array.length;
				var result = [];
				while (length--) {
					result[length] = fn(array[length]);
				}
				return result;
			}

			/**
			 * A simple `Array#map`-like wrapper to work with domain name strings or email
			 * addresses.
			 * @private
			 * @param {String} domain The domain name or email address.
			 * @param {Function} callback The function that gets called for every
			 * character.
			 * @returns {Array} A new string of characters returned by the callback
			 * function.
			 */
			function mapDomain(string, fn) {
				var parts = string.split('@');
				var result = '';
				if (parts.length > 1) {
					// In email addresses, only the domain name should be punycoded. Leave
					// the local part (i.e. everything up to `@`) intact.
					result = parts[0] + '@';
					string = parts[1];
				}
				// Avoid `split(regex)` for IE8 compatibility. See #17.
				string = string.replace(regexSeparators, '\x2E');
				var labels = string.split('.');
				var encoded = map(labels, fn).join('.');
				return result + encoded;
			}

			/**
			 * Creates an array containing the numeric code points of each Unicode
			 * character in the string. While JavaScript uses UCS-2 internally,
			 * this function will convert a pair of surrogate halves (each of which
			 * UCS-2 exposes as separate characters) into a single code point,
			 * matching UTF-16.
			 * @see `punycode.ucs2.encode`
			 * @see <https://mathiasbynens.be/notes/javascript-encoding>
			 * @memberOf punycode.ucs2
			 * @name decode
			 * @param {String} string The Unicode input string (UCS-2).
			 * @returns {Array} The new array of code points.
			 */
			function ucs2decode(string) {
				var output = [],
				    counter = 0,
				    length = string.length,
				    value,
				    extra;
				while (counter < length) {
					value = string.charCodeAt(counter++);
					if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
						// high surrogate, and there is a next character
						extra = string.charCodeAt(counter++);
						if ((extra & 0xFC00) == 0xDC00) { // low surrogate
							output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
						} else {
							// unmatched surrogate; only append this code unit, in case the next
							// code unit is the high surrogate of a surrogate pair
							output.push(value);
							counter--;
						}
					} else {
						output.push(value);
					}
				}
				return output;
			}

			/**
			 * Creates a string based on an array of numeric code points.
			 * @see `punycode.ucs2.decode`
			 * @memberOf punycode.ucs2
			 * @name encode
			 * @param {Array} codePoints The array of numeric code points.
			 * @returns {String} The new Unicode string (UCS-2).
			 */
			function ucs2encode(array) {
				return map(array, function(value) {
					var output = '';
					if (value > 0xFFFF) {
						value -= 0x10000;
						output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
						value = 0xDC00 | value & 0x3FF;
					}
					output += stringFromCharCode(value);
					return output;
				}).join('');
			}

			/**
			 * Converts a basic code point into a digit/integer.
			 * @see `digitToBasic()`
			 * @private
			 * @param {Number} codePoint The basic numeric code point value.
			 * @returns {Number} The numeric value of a basic code point (for use in
			 * representing integers) in the range `0` to `base - 1`, or `base` if
			 * the code point does not represent a value.
			 */
			function basicToDigit(codePoint) {
				if (codePoint - 48 < 10) {
					return codePoint - 22;
				}
				if (codePoint - 65 < 26) {
					return codePoint - 65;
				}
				if (codePoint - 97 < 26) {
					return codePoint - 97;
				}
				return base;
			}

			/**
			 * Converts a digit/integer into a basic code point.
			 * @see `basicToDigit()`
			 * @private
			 * @param {Number} digit The numeric value of a basic code point.
			 * @returns {Number} The basic code point whose value (when used for
			 * representing integers) is `digit`, which needs to be in the range
			 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
			 * used; else, the lowercase form is used. The behavior is undefined
			 * if `flag` is non-zero and `digit` has no uppercase form.
			 */
			function digitToBasic(digit, flag) {
				//  0..25 map to ASCII a..z or A..Z
				// 26..35 map to ASCII 0..9
				return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
			}

			/**
			 * Bias adaptation function as per section 3.4 of RFC 3492.
			 * https://tools.ietf.org/html/rfc3492#section-3.4
			 * @private
			 */
			function adapt(delta, numPoints, firstTime) {
				var k = 0;
				delta = firstTime ? floor(delta / damp) : delta >> 1;
				delta += floor(delta / numPoints);
				for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
					delta = floor(delta / baseMinusTMin);
				}
				return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
			}

			/**
			 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
			 * symbols.
			 * @memberOf punycode
			 * @param {String} input The Punycode string of ASCII-only symbols.
			 * @returns {String} The resulting string of Unicode symbols.
			 */
			function decode(input) {
				// Don't use UCS-2
				var output = [],
				    inputLength = input.length,
				    out,
				    i = 0,
				    n = initialN,
				    bias = initialBias,
				    basic,
				    j,
				    index,
				    oldi,
				    w,
				    k,
				    digit,
				    t,
				    /** Cached calculation results */
				    baseMinusT;

				// Handle the basic code points: let `basic` be the number of input code
				// points before the last delimiter, or `0` if there is none, then copy
				// the first basic code points to the output.

				basic = input.lastIndexOf(delimiter);
				if (basic < 0) {
					basic = 0;
				}

				for (j = 0; j < basic; ++j) {
					// if it's not a basic code point
					if (input.charCodeAt(j) >= 0x80) {
						error('not-basic');
					}
					output.push(input.charCodeAt(j));
				}

				// Main decoding loop: start just after the last delimiter if any basic code
				// points were copied; start at the beginning otherwise.

				for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

					// `index` is the index of the next character to be consumed.
					// Decode a generalized variable-length integer into `delta`,
					// which gets added to `i`. The overflow checking is easier
					// if we increase `i` as we go, then subtract off its starting
					// value at the end to obtain `delta`.
					for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

						if (index >= inputLength) {
							error('invalid-input');
						}

						digit = basicToDigit(input.charCodeAt(index++));

						if (digit >= base || digit > floor((maxInt - i) / w)) {
							error('overflow');
						}

						i += digit * w;
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

						if (digit < t) {
							break;
						}

						baseMinusT = base - t;
						if (w > floor(maxInt / baseMinusT)) {
							error('overflow');
						}

						w *= baseMinusT;

					}

					out = output.length + 1;
					bias = adapt(i - oldi, out, oldi == 0);

					// `i` was supposed to wrap around from `out` to `0`,
					// incrementing `n` each time, so we'll fix that now:
					if (floor(i / out) > maxInt - n) {
						error('overflow');
					}

					n += floor(i / out);
					i %= out;

					// Insert `n` at position `i` of the output
					output.splice(i++, 0, n);

				}

				return ucs2encode(output);
			}

			/**
			 * Converts a string of Unicode symbols (e.g. a domain name label) to a
			 * Punycode string of ASCII-only symbols.
			 * @memberOf punycode
			 * @param {String} input The string of Unicode symbols.
			 * @returns {String} The resulting Punycode string of ASCII-only symbols.
			 */
			function encode(input) {
				var n,
				    delta,
				    handledCPCount,
				    basicLength,
				    bias,
				    j,
				    m,
				    q,
				    k,
				    t,
				    currentValue,
				    output = [],
				    /** `inputLength` will hold the number of code points in `input`. */
				    inputLength,
				    /** Cached calculation results */
				    handledCPCountPlusOne,
				    baseMinusT,
				    qMinusT;

				// Convert the input in UCS-2 to Unicode
				input = ucs2decode(input);

				// Cache the length
				inputLength = input.length;

				// Initialize the state
				n = initialN;
				delta = 0;
				bias = initialBias;

				// Handle the basic code points
				for (j = 0; j < inputLength; ++j) {
					currentValue = input[j];
					if (currentValue < 0x80) {
						output.push(stringFromCharCode(currentValue));
					}
				}

				handledCPCount = basicLength = output.length;

				// `handledCPCount` is the number of code points that have been handled;
				// `basicLength` is the number of basic code points.

				// Finish the basic string - if it is not empty - with a delimiter
				if (basicLength) {
					output.push(delimiter);
				}

				// Main encoding loop:
				while (handledCPCount < inputLength) {

					// All non-basic code points < n have been handled already. Find the next
					// larger one:
					for (m = maxInt, j = 0; j < inputLength; ++j) {
						currentValue = input[j];
						if (currentValue >= n && currentValue < m) {
							m = currentValue;
						}
					}

					// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
					// but guard against overflow
					handledCPCountPlusOne = handledCPCount + 1;
					if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
						error('overflow');
					}

					delta += (m - n) * handledCPCountPlusOne;
					n = m;

					for (j = 0; j < inputLength; ++j) {
						currentValue = input[j];

						if (currentValue < n && ++delta > maxInt) {
							error('overflow');
						}

						if (currentValue == n) {
							// Represent delta as a generalized variable-length integer
							for (q = delta, k = base; /* no condition */; k += base) {
								t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
								if (q < t) {
									break;
								}
								qMinusT = q - t;
								baseMinusT = base - t;
								output.push(
									stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
								);
								q = floor(qMinusT / baseMinusT);
							}

							output.push(stringFromCharCode(digitToBasic(q, 0)));
							bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
							delta = 0;
							++handledCPCount;
						}
					}

					++delta;
					++n;

				}
				return output.join('');
			}

			/**
			 * Converts a Punycode string representing a domain name or an email address
			 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
			 * it doesn't matter if you call it on a string that has already been
			 * converted to Unicode.
			 * @memberOf punycode
			 * @param {String} input The Punycoded domain name or email address to
			 * convert to Unicode.
			 * @returns {String} The Unicode representation of the given Punycode
			 * string.
			 */
			function toUnicode(input) {
				return mapDomain(input, function(string) {
					return regexPunycode.test(string)
						? decode(string.slice(4).toLowerCase())
						: string;
				});
			}

			/**
			 * Converts a Unicode string representing a domain name or an email address to
			 * Punycode. Only the non-ASCII parts of the domain name will be converted,
			 * i.e. it doesn't matter if you call it with a domain that's already in
			 * ASCII.
			 * @memberOf punycode
			 * @param {String} input The domain name or email address to convert, as a
			 * Unicode string.
			 * @returns {String} The Punycode representation of the given domain name or
			 * email address.
			 */
			function toASCII(input) {
				return mapDomain(input, function(string) {
					return regexNonASCII.test(string)
						? 'xn--' + encode(string)
						: string;
				});
			}

			/*--------------------------------------------------------------------------*/

			/** Define the public API */
			punycode = {
				/**
				 * A string representing the current Punycode.js version number.
				 * @memberOf punycode
				 * @type String
				 */
				'version': '1.4.1',
				/**
				 * An object of methods to convert from JavaScript's internal character
				 * representation (UCS-2) to Unicode code points, and back.
				 * @see <https://mathiasbynens.be/notes/javascript-encoding>
				 * @memberOf punycode
				 * @type Object
				 */
				'ucs2': {
					'decode': ucs2decode,
					'encode': ucs2encode
				},
				'decode': decode,
				'encode': encode,
				'toASCII': toASCII,
				'toUnicode': toUnicode
			};

			/** Expose `punycode` */
			// Some AMD build optimizers, like r.js, check for specific condition patterns
			// like the following:
			if (freeExports && freeModule) {
				if (module.exports == freeExports) {
					// in Node.js, io.js, or RingoJS v0.8.0+
					freeModule.exports = punycode;
				} else {
					// in Narwhal or RingoJS v0.7.0-
					for (key in punycode) {
						punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
					}
				}
			} else {
				// in Rhino or a web browser
				root.punycode = punycode;
			}

		}(commonjsGlobal)); 
	} (punycode, punycode.exports));
	return punycode.exports;
}

var objectInspect;
var hasRequiredObjectInspect;

function requireObjectInspect () {
	if (hasRequiredObjectInspect) return objectInspect;
	hasRequiredObjectInspect = 1;
	var hasMap = typeof Map === 'function' && Map.prototype;
	var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
	var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
	var mapForEach = hasMap && Map.prototype.forEach;
	var hasSet = typeof Set === 'function' && Set.prototype;
	var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
	var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
	var setForEach = hasSet && Set.prototype.forEach;
	var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
	var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
	var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
	var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
	var hasWeakRef = typeof WeakRef === 'function' && WeakRef.prototype;
	var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
	var booleanValueOf = Boolean.prototype.valueOf;
	var objectToString = Object.prototype.toString;
	var functionToString = Function.prototype.toString;
	var $match = String.prototype.match;
	var $slice = String.prototype.slice;
	var $replace = String.prototype.replace;
	var $toUpperCase = String.prototype.toUpperCase;
	var $toLowerCase = String.prototype.toLowerCase;
	var $test = RegExp.prototype.test;
	var $concat = Array.prototype.concat;
	var $join = Array.prototype.join;
	var $arrSlice = Array.prototype.slice;
	var $floor = Math.floor;
	var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;
	var gOPS = Object.getOwnPropertySymbols;
	var symToString = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol.prototype.toString : null;
	var hasShammedSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'object';
	// ie, `has-tostringtag/shams
	var toStringTag = typeof Symbol === 'function' && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? 'object' : 'symbol')
	    ? Symbol.toStringTag
	    : null;
	var isEnumerable = Object.prototype.propertyIsEnumerable;

	var gPO = (typeof Reflect === 'function' ? Reflect.getPrototypeOf : Object.getPrototypeOf) || (
	    [].__proto__ === Array.prototype // eslint-disable-line no-proto
	        ? function (O) {
	            return O.__proto__; // eslint-disable-line no-proto
	        }
	        : null
	);

	function addNumericSeparator(num, str) {
	    if (
	        num === Infinity
	        || num === -Infinity
	        || num !== num
	        || (num && num > -1000 && num < 1000)
	        || $test.call(/e/, str)
	    ) {
	        return str;
	    }
	    var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
	    if (typeof num === 'number') {
	        var int = num < 0 ? -$floor(-num) : $floor(num); // trunc(num)
	        if (int !== num) {
	            var intStr = String(int);
	            var dec = $slice.call(str, intStr.length + 1);
	            return $replace.call(intStr, sepRegex, '$&_') + '.' + $replace.call($replace.call(dec, /([0-9]{3})/g, '$&_'), /_$/, '');
	        }
	    }
	    return $replace.call(str, sepRegex, '$&_');
	}

	var utilInspect = require$$0;
	var inspectCustom = utilInspect.custom;
	var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;

	objectInspect = function inspect_(obj, options, depth, seen) {
	    var opts = options || {};

	    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
	        throw new TypeError('option "quoteStyle" must be "single" or "double"');
	    }
	    if (
	        has(opts, 'maxStringLength') && (typeof opts.maxStringLength === 'number'
	            ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity
	            : opts.maxStringLength !== null
	        )
	    ) {
	        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
	    }
	    var customInspect = has(opts, 'customInspect') ? opts.customInspect : true;
	    if (typeof customInspect !== 'boolean' && customInspect !== 'symbol') {
	        throw new TypeError('option "customInspect", if provided, must be `true`, `false`, or `\'symbol\'`');
	    }

	    if (
	        has(opts, 'indent')
	        && opts.indent !== null
	        && opts.indent !== '\t'
	        && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)
	    ) {
	        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
	    }
	    if (has(opts, 'numericSeparator') && typeof opts.numericSeparator !== 'boolean') {
	        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
	    }
	    var numericSeparator = opts.numericSeparator;

	    if (typeof obj === 'undefined') {
	        return 'undefined';
	    }
	    if (obj === null) {
	        return 'null';
	    }
	    if (typeof obj === 'boolean') {
	        return obj ? 'true' : 'false';
	    }

	    if (typeof obj === 'string') {
	        return inspectString(obj, opts);
	    }
	    if (typeof obj === 'number') {
	        if (obj === 0) {
	            return Infinity / obj > 0 ? '0' : '-0';
	        }
	        var str = String(obj);
	        return numericSeparator ? addNumericSeparator(obj, str) : str;
	    }
	    if (typeof obj === 'bigint') {
	        var bigIntStr = String(obj) + 'n';
	        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
	    }

	    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
	    if (typeof depth === 'undefined') { depth = 0; }
	    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
	        return isArray(obj) ? '[Array]' : '[Object]';
	    }

	    var indent = getIndent(opts, depth);

	    if (typeof seen === 'undefined') {
	        seen = [];
	    } else if (indexOf(seen, obj) >= 0) {
	        return '[Circular]';
	    }

	    function inspect(value, from, noIndent) {
	        if (from) {
	            seen = $arrSlice.call(seen);
	            seen.push(from);
	        }
	        if (noIndent) {
	            var newOpts = {
	                depth: opts.depth
	            };
	            if (has(opts, 'quoteStyle')) {
	                newOpts.quoteStyle = opts.quoteStyle;
	            }
	            return inspect_(value, newOpts, depth + 1, seen);
	        }
	        return inspect_(value, opts, depth + 1, seen);
	    }

	    if (typeof obj === 'function' && !isRegExp(obj)) { // in older engines, regexes are callable
	        var name = nameOf(obj);
	        var keys = arrObjKeys(obj, inspect);
	        return '[Function' + (name ? ': ' + name : ' (anonymous)') + ']' + (keys.length > 0 ? ' { ' + $join.call(keys, ', ') + ' }' : '');
	    }
	    if (isSymbol(obj)) {
	        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, '$1') : symToString.call(obj);
	        return typeof obj === 'object' && !hasShammedSymbols ? markBoxed(symString) : symString;
	    }
	    if (isElement(obj)) {
	        var s = '<' + $toLowerCase.call(String(obj.nodeName));
	        var attrs = obj.attributes || [];
	        for (var i = 0; i < attrs.length; i++) {
	            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
	        }
	        s += '>';
	        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
	        s += '</' + $toLowerCase.call(String(obj.nodeName)) + '>';
	        return s;
	    }
	    if (isArray(obj)) {
	        if (obj.length === 0) { return '[]'; }
	        var xs = arrObjKeys(obj, inspect);
	        if (indent && !singleLineValues(xs)) {
	            return '[' + indentedJoin(xs, indent) + ']';
	        }
	        return '[ ' + $join.call(xs, ', ') + ' ]';
	    }
	    if (isError(obj)) {
	        var parts = arrObjKeys(obj, inspect);
	        if (!('cause' in Error.prototype) && 'cause' in obj && !isEnumerable.call(obj, 'cause')) {
	            return '{ [' + String(obj) + '] ' + $join.call($concat.call('[cause]: ' + inspect(obj.cause), parts), ', ') + ' }';
	        }
	        if (parts.length === 0) { return '[' + String(obj) + ']'; }
	        return '{ [' + String(obj) + '] ' + $join.call(parts, ', ') + ' }';
	    }
	    if (typeof obj === 'object' && customInspect) {
	        if (inspectSymbol && typeof obj[inspectSymbol] === 'function' && utilInspect) {
	            return utilInspect(obj, { depth: maxDepth - depth });
	        } else if (customInspect !== 'symbol' && typeof obj.inspect === 'function') {
	            return obj.inspect();
	        }
	    }
	    if (isMap(obj)) {
	        var mapParts = [];
	        if (mapForEach) {
	            mapForEach.call(obj, function (value, key) {
	                mapParts.push(inspect(key, obj, true) + ' => ' + inspect(value, obj));
	            });
	        }
	        return collectionOf('Map', mapSize.call(obj), mapParts, indent);
	    }
	    if (isSet(obj)) {
	        var setParts = [];
	        if (setForEach) {
	            setForEach.call(obj, function (value) {
	                setParts.push(inspect(value, obj));
	            });
	        }
	        return collectionOf('Set', setSize.call(obj), setParts, indent);
	    }
	    if (isWeakMap(obj)) {
	        return weakCollectionOf('WeakMap');
	    }
	    if (isWeakSet(obj)) {
	        return weakCollectionOf('WeakSet');
	    }
	    if (isWeakRef(obj)) {
	        return weakCollectionOf('WeakRef');
	    }
	    if (isNumber(obj)) {
	        return markBoxed(inspect(Number(obj)));
	    }
	    if (isBigInt(obj)) {
	        return markBoxed(inspect(bigIntValueOf.call(obj)));
	    }
	    if (isBoolean(obj)) {
	        return markBoxed(booleanValueOf.call(obj));
	    }
	    if (isString(obj)) {
	        return markBoxed(inspect(String(obj)));
	    }
	    // note: in IE 8, sometimes `global !== window` but both are the prototypes of each other
	    /* eslint-env browser */
	    if (typeof window !== 'undefined' && obj === window) {
	        return '{ [object Window] }';
	    }
	    if (
	        (typeof globalThis !== 'undefined' && obj === globalThis)
	        || (typeof commonjsGlobal !== 'undefined' && obj === commonjsGlobal)
	    ) {
	        return '{ [object globalThis] }';
	    }
	    if (!isDate(obj) && !isRegExp(obj)) {
	        var ys = arrObjKeys(obj, inspect);
	        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
	        var protoTag = obj instanceof Object ? '' : 'null prototype';
	        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? 'Object' : '';
	        var constructorTag = isPlainObject || typeof obj.constructor !== 'function' ? '' : obj.constructor.name ? obj.constructor.name + ' ' : '';
	        var tag = constructorTag + (stringTag || protoTag ? '[' + $join.call($concat.call([], stringTag || [], protoTag || []), ': ') + '] ' : '');
	        if (ys.length === 0) { return tag + '{}'; }
	        if (indent) {
	            return tag + '{' + indentedJoin(ys, indent) + '}';
	        }
	        return tag + '{ ' + $join.call(ys, ', ') + ' }';
	    }
	    return String(obj);
	};

	function wrapQuotes(s, defaultStyle, opts) {
	    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
	    return quoteChar + s + quoteChar;
	}

	function quote(s) {
	    return $replace.call(String(s), /"/g, '&quot;');
	}

	function isArray(obj) { return toStr(obj) === '[object Array]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isDate(obj) { return toStr(obj) === '[object Date]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isRegExp(obj) { return toStr(obj) === '[object RegExp]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isError(obj) { return toStr(obj) === '[object Error]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isString(obj) { return toStr(obj) === '[object String]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isNumber(obj) { return toStr(obj) === '[object Number]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isBoolean(obj) { return toStr(obj) === '[object Boolean]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }

	// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
	function isSymbol(obj) {
	    if (hasShammedSymbols) {
	        return obj && typeof obj === 'object' && obj instanceof Symbol;
	    }
	    if (typeof obj === 'symbol') {
	        return true;
	    }
	    if (!obj || typeof obj !== 'object' || !symToString) {
	        return false;
	    }
	    try {
	        symToString.call(obj);
	        return true;
	    } catch (e) {}
	    return false;
	}

	function isBigInt(obj) {
	    if (!obj || typeof obj !== 'object' || !bigIntValueOf) {
	        return false;
	    }
	    try {
	        bigIntValueOf.call(obj);
	        return true;
	    } catch (e) {}
	    return false;
	}

	var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
	function has(obj, key) {
	    return hasOwn.call(obj, key);
	}

	function toStr(obj) {
	    return objectToString.call(obj);
	}

	function nameOf(f) {
	    if (f.name) { return f.name; }
	    var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
	    if (m) { return m[1]; }
	    return null;
	}

	function indexOf(xs, x) {
	    if (xs.indexOf) { return xs.indexOf(x); }
	    for (var i = 0, l = xs.length; i < l; i++) {
	        if (xs[i] === x) { return i; }
	    }
	    return -1;
	}

	function isMap(x) {
	    if (!mapSize || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        mapSize.call(x);
	        try {
	            setSize.call(x);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof Map; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakMap(x) {
	    if (!weakMapHas || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakMapHas.call(x, weakMapHas);
	        try {
	            weakSetHas.call(x, weakSetHas);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakRef(x) {
	    if (!weakRefDeref || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakRefDeref.call(x);
	        return true;
	    } catch (e) {}
	    return false;
	}

	function isSet(x) {
	    if (!setSize || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        setSize.call(x);
	        try {
	            mapSize.call(x);
	        } catch (m) {
	            return true;
	        }
	        return x instanceof Set; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakSet(x) {
	    if (!weakSetHas || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakSetHas.call(x, weakSetHas);
	        try {
	            weakMapHas.call(x, weakMapHas);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isElement(x) {
	    if (!x || typeof x !== 'object') { return false; }
	    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
	        return true;
	    }
	    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
	}

	function inspectString(str, opts) {
	    if (str.length > opts.maxStringLength) {
	        var remaining = str.length - opts.maxStringLength;
	        var trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
	        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
	    }
	    // eslint-disable-next-line no-control-regex
	    var s = $replace.call($replace.call(str, /(['\\])/g, '\\$1'), /[\x00-\x1f]/g, lowbyte);
	    return wrapQuotes(s, 'single', opts);
	}

	function lowbyte(c) {
	    var n = c.charCodeAt(0);
	    var x = {
	        8: 'b',
	        9: 't',
	        10: 'n',
	        12: 'f',
	        13: 'r'
	    }[n];
	    if (x) { return '\\' + x; }
	    return '\\x' + (n < 0x10 ? '0' : '') + $toUpperCase.call(n.toString(16));
	}

	function markBoxed(str) {
	    return 'Object(' + str + ')';
	}

	function weakCollectionOf(type) {
	    return type + ' { ? }';
	}

	function collectionOf(type, size, entries, indent) {
	    var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ', ');
	    return type + ' (' + size + ') {' + joinedEntries + '}';
	}

	function singleLineValues(xs) {
	    for (var i = 0; i < xs.length; i++) {
	        if (indexOf(xs[i], '\n') >= 0) {
	            return false;
	        }
	    }
	    return true;
	}

	function getIndent(opts, depth) {
	    var baseIndent;
	    if (opts.indent === '\t') {
	        baseIndent = '\t';
	    } else if (typeof opts.indent === 'number' && opts.indent > 0) {
	        baseIndent = $join.call(Array(opts.indent + 1), ' ');
	    } else {
	        return null;
	    }
	    return {
	        base: baseIndent,
	        prev: $join.call(Array(depth + 1), baseIndent)
	    };
	}

	function indentedJoin(xs, indent) {
	    if (xs.length === 0) { return ''; }
	    var lineJoiner = '\n' + indent.prev + indent.base;
	    return lineJoiner + $join.call(xs, ',' + lineJoiner) + '\n' + indent.prev;
	}

	function arrObjKeys(obj, inspect) {
	    var isArr = isArray(obj);
	    var xs = [];
	    if (isArr) {
	        xs.length = obj.length;
	        for (var i = 0; i < obj.length; i++) {
	            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
	        }
	    }
	    var syms = typeof gOPS === 'function' ? gOPS(obj) : [];
	    var symMap;
	    if (hasShammedSymbols) {
	        symMap = {};
	        for (var k = 0; k < syms.length; k++) {
	            symMap['$' + syms[k]] = syms[k];
	        }
	    }

	    for (var key in obj) { // eslint-disable-line no-restricted-syntax
	        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
	        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
	        if (hasShammedSymbols && symMap['$' + key] instanceof Symbol) {
	            // this is to prevent shammed Symbols, which are stored as strings, from being included in the string key section
	            continue; // eslint-disable-line no-restricted-syntax, no-continue
	        } else if ($test.call(/[^\w$]/, key)) {
	            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
	        } else {
	            xs.push(key + ': ' + inspect(obj[key], obj));
	        }
	    }
	    if (typeof gOPS === 'function') {
	        for (var j = 0; j < syms.length; j++) {
	            if (isEnumerable.call(obj, syms[j])) {
	                xs.push('[' + inspect(syms[j]) + ']: ' + inspect(obj[syms[j]], obj));
	            }
	        }
	    }
	    return xs;
	}
	return objectInspect;
}

var sideChannel;
var hasRequiredSideChannel;

function requireSideChannel () {
	if (hasRequiredSideChannel) return sideChannel;
	hasRequiredSideChannel = 1;

	var GetIntrinsic = getIntrinsic;
	var callBound = callBound$3;
	var inspect = requireObjectInspect();

	var $TypeError = type;
	var $WeakMap = GetIntrinsic('%WeakMap%', true);
	var $Map = GetIntrinsic('%Map%', true);

	var $weakMapGet = callBound('WeakMap.prototype.get', true);
	var $weakMapSet = callBound('WeakMap.prototype.set', true);
	var $weakMapHas = callBound('WeakMap.prototype.has', true);
	var $mapGet = callBound('Map.prototype.get', true);
	var $mapSet = callBound('Map.prototype.set', true);
	var $mapHas = callBound('Map.prototype.has', true);

	/*
	* This function traverses the list returning the node corresponding to the given key.
	*
	* That node is also moved to the head of the list, so that if it's accessed again we don't need to traverse the whole list. By doing so, all the recently used nodes can be accessed relatively quickly.
	*/
	/** @type {import('.').listGetNode} */
	var listGetNode = function (list, key) { // eslint-disable-line consistent-return
		/** @type {typeof list | NonNullable<(typeof list)['next']>} */
		var prev = list;
		/** @type {(typeof list)['next']} */
		var curr;
		for (; (curr = prev.next) !== null; prev = curr) {
			if (curr.key === key) {
				prev.next = curr.next;
				// eslint-disable-next-line no-extra-parens
				curr.next = /** @type {NonNullable<typeof list.next>} */ (list.next);
				list.next = curr; // eslint-disable-line no-param-reassign
				return curr;
			}
		}
	};

	/** @type {import('.').listGet} */
	var listGet = function (objects, key) {
		var node = listGetNode(objects, key);
		return node && node.value;
	};
	/** @type {import('.').listSet} */
	var listSet = function (objects, key, value) {
		var node = listGetNode(objects, key);
		if (node) {
			node.value = value;
		} else {
			// Prepend the new node to the beginning of the list
			objects.next = /** @type {import('.').ListNode<typeof value>} */ ({ // eslint-disable-line no-param-reassign, no-extra-parens
				key: key,
				next: objects.next,
				value: value
			});
		}
	};
	/** @type {import('.').listHas} */
	var listHas = function (objects, key) {
		return !!listGetNode(objects, key);
	};

	/** @type {import('.')} */
	sideChannel = function getSideChannel() {
		/** @type {WeakMap<object, unknown>} */ var $wm;
		/** @type {Map<object, unknown>} */ var $m;
		/** @type {import('.').RootNode<unknown>} */ var $o;

		/** @type {import('.').Channel} */
		var channel = {
			assert: function (key) {
				if (!channel.has(key)) {
					throw new $TypeError('Side channel does not contain ' + inspect(key));
				}
			},
			get: function (key) { // eslint-disable-line consistent-return
				if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
					if ($wm) {
						return $weakMapGet($wm, key);
					}
				} else if ($Map) {
					if ($m) {
						return $mapGet($m, key);
					}
				} else {
					if ($o) { // eslint-disable-line no-lonely-if
						return listGet($o, key);
					}
				}
			},
			has: function (key) {
				if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
					if ($wm) {
						return $weakMapHas($wm, key);
					}
				} else if ($Map) {
					if ($m) {
						return $mapHas($m, key);
					}
				} else {
					if ($o) { // eslint-disable-line no-lonely-if
						return listHas($o, key);
					}
				}
				return false;
			},
			set: function (key, value) {
				if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
					if (!$wm) {
						$wm = new $WeakMap();
					}
					$weakMapSet($wm, key, value);
				} else if ($Map) {
					if (!$m) {
						$m = new $Map();
					}
					$mapSet($m, key, value);
				} else {
					if (!$o) {
						// Initialize the linked list as an empty node, so that we don't have to special-case handling of the first node: we can always refer to it as (previous node).next, instead of something like (list).head
						$o = { key: {}, next: null };
					}
					listSet($o, key, value);
				}
			}
		};
		return channel;
	};
	return sideChannel;
}

var formats;
var hasRequiredFormats;

function requireFormats () {
	if (hasRequiredFormats) return formats;
	hasRequiredFormats = 1;

	var replace = String.prototype.replace;
	var percentTwenties = /%20/g;

	var Format = {
	    RFC1738: 'RFC1738',
	    RFC3986: 'RFC3986'
	};

	formats = {
	    'default': Format.RFC3986,
	    formatters: {
	        RFC1738: function (value) {
	            return replace.call(value, percentTwenties, '+');
	        },
	        RFC3986: function (value) {
	            return String(value);
	        }
	    },
	    RFC1738: Format.RFC1738,
	    RFC3986: Format.RFC3986
	};
	return formats;
}

var utils$1;
var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils$1;
	hasRequiredUtils = 1;

	var formats = requireFormats();

	var has = Object.prototype.hasOwnProperty;
	var isArray = Array.isArray;

	var hexTable = (function () {
	    var array = [];
	    for (var i = 0; i < 256; ++i) {
	        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
	    }

	    return array;
	}());

	var compactQueue = function compactQueue(queue) {
	    while (queue.length > 1) {
	        var item = queue.pop();
	        var obj = item.obj[item.prop];

	        if (isArray(obj)) {
	            var compacted = [];

	            for (var j = 0; j < obj.length; ++j) {
	                if (typeof obj[j] !== 'undefined') {
	                    compacted.push(obj[j]);
	                }
	            }

	            item.obj[item.prop] = compacted;
	        }
	    }
	};

	var arrayToObject = function arrayToObject(source, options) {
	    var obj = options && options.plainObjects ? Object.create(null) : {};
	    for (var i = 0; i < source.length; ++i) {
	        if (typeof source[i] !== 'undefined') {
	            obj[i] = source[i];
	        }
	    }

	    return obj;
	};

	var merge = function merge(target, source, options) {
	    /* eslint no-param-reassign: 0 */
	    if (!source) {
	        return target;
	    }

	    if (typeof source !== 'object') {
	        if (isArray(target)) {
	            target.push(source);
	        } else if (target && typeof target === 'object') {
	            if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
	                target[source] = true;
	            }
	        } else {
	            return [target, source];
	        }

	        return target;
	    }

	    if (!target || typeof target !== 'object') {
	        return [target].concat(source);
	    }

	    var mergeTarget = target;
	    if (isArray(target) && !isArray(source)) {
	        mergeTarget = arrayToObject(target, options);
	    }

	    if (isArray(target) && isArray(source)) {
	        source.forEach(function (item, i) {
	            if (has.call(target, i)) {
	                var targetItem = target[i];
	                if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
	                    target[i] = merge(targetItem, item, options);
	                } else {
	                    target.push(item);
	                }
	            } else {
	                target[i] = item;
	            }
	        });
	        return target;
	    }

	    return Object.keys(source).reduce(function (acc, key) {
	        var value = source[key];

	        if (has.call(acc, key)) {
	            acc[key] = merge(acc[key], value, options);
	        } else {
	            acc[key] = value;
	        }
	        return acc;
	    }, mergeTarget);
	};

	var assign = function assignSingleSource(target, source) {
	    return Object.keys(source).reduce(function (acc, key) {
	        acc[key] = source[key];
	        return acc;
	    }, target);
	};

	var decode = function (str, decoder, charset) {
	    var strWithoutPlus = str.replace(/\+/g, ' ');
	    if (charset === 'iso-8859-1') {
	        // unescape never throws, no try...catch needed:
	        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
	    }
	    // utf-8
	    try {
	        return decodeURIComponent(strWithoutPlus);
	    } catch (e) {
	        return strWithoutPlus;
	    }
	};

	var limit = 1024;

	/* eslint operator-linebreak: [2, "before"] */

	var encode = function encode(str, defaultEncoder, charset, kind, format) {
	    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
	    // It has been adapted here for stricter adherence to RFC 3986
	    if (str.length === 0) {
	        return str;
	    }

	    var string = str;
	    if (typeof str === 'symbol') {
	        string = Symbol.prototype.toString.call(str);
	    } else if (typeof str !== 'string') {
	        string = String(str);
	    }

	    if (charset === 'iso-8859-1') {
	        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
	            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
	        });
	    }

	    var out = '';
	    for (var j = 0; j < string.length; j += limit) {
	        var segment = string.length >= limit ? string.slice(j, j + limit) : string;
	        var arr = [];

	        for (var i = 0; i < segment.length; ++i) {
	            var c = segment.charCodeAt(i);
	            if (
	                c === 0x2D // -
	                || c === 0x2E // .
	                || c === 0x5F // _
	                || c === 0x7E // ~
	                || (c >= 0x30 && c <= 0x39) // 0-9
	                || (c >= 0x41 && c <= 0x5A) // a-z
	                || (c >= 0x61 && c <= 0x7A) // A-Z
	                || (format === formats.RFC1738 && (c === 0x28 || c === 0x29)) // ( )
	            ) {
	                arr[arr.length] = segment.charAt(i);
	                continue;
	            }

	            if (c < 0x80) {
	                arr[arr.length] = hexTable[c];
	                continue;
	            }

	            if (c < 0x800) {
	                arr[arr.length] = hexTable[0xC0 | (c >> 6)]
	                    + hexTable[0x80 | (c & 0x3F)];
	                continue;
	            }

	            if (c < 0xD800 || c >= 0xE000) {
	                arr[arr.length] = hexTable[0xE0 | (c >> 12)]
	                    + hexTable[0x80 | ((c >> 6) & 0x3F)]
	                    + hexTable[0x80 | (c & 0x3F)];
	                continue;
	            }

	            i += 1;
	            c = 0x10000 + (((c & 0x3FF) << 10) | (segment.charCodeAt(i) & 0x3FF));

	            arr[arr.length] = hexTable[0xF0 | (c >> 18)]
	                + hexTable[0x80 | ((c >> 12) & 0x3F)]
	                + hexTable[0x80 | ((c >> 6) & 0x3F)]
	                + hexTable[0x80 | (c & 0x3F)];
	        }

	        out += arr.join('');
	    }

	    return out;
	};

	var compact = function compact(value) {
	    var queue = [{ obj: { o: value }, prop: 'o' }];
	    var refs = [];

	    for (var i = 0; i < queue.length; ++i) {
	        var item = queue[i];
	        var obj = item.obj[item.prop];

	        var keys = Object.keys(obj);
	        for (var j = 0; j < keys.length; ++j) {
	            var key = keys[j];
	            var val = obj[key];
	            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
	                queue.push({ obj: obj, prop: key });
	                refs.push(val);
	            }
	        }
	    }

	    compactQueue(queue);

	    return value;
	};

	var isRegExp = function isRegExp(obj) {
	    return Object.prototype.toString.call(obj) === '[object RegExp]';
	};

	var isBuffer = function isBuffer(obj) {
	    if (!obj || typeof obj !== 'object') {
	        return false;
	    }

	    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
	};

	var combine = function combine(a, b) {
	    return [].concat(a, b);
	};

	var maybeMap = function maybeMap(val, fn) {
	    if (isArray(val)) {
	        var mapped = [];
	        for (var i = 0; i < val.length; i += 1) {
	            mapped.push(fn(val[i]));
	        }
	        return mapped;
	    }
	    return fn(val);
	};

	utils$1 = {
	    arrayToObject: arrayToObject,
	    assign: assign,
	    combine: combine,
	    compact: compact,
	    decode: decode,
	    encode: encode,
	    isBuffer: isBuffer,
	    isRegExp: isRegExp,
	    maybeMap: maybeMap,
	    merge: merge
	};
	return utils$1;
}

var stringify_1;
var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify_1;
	hasRequiredStringify = 1;

	var getSideChannel = requireSideChannel();
	var utils = requireUtils();
	var formats = requireFormats();
	var has = Object.prototype.hasOwnProperty;

	var arrayPrefixGenerators = {
	    brackets: function brackets(prefix) {
	        return prefix + '[]';
	    },
	    comma: 'comma',
	    indices: function indices(prefix, key) {
	        return prefix + '[' + key + ']';
	    },
	    repeat: function repeat(prefix) {
	        return prefix;
	    }
	};

	var isArray = Array.isArray;
	var push = Array.prototype.push;
	var pushToArray = function (arr, valueOrArray) {
	    push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
	};

	var toISO = Date.prototype.toISOString;

	var defaultFormat = formats['default'];
	var defaults = {
	    addQueryPrefix: false,
	    allowDots: false,
	    allowEmptyArrays: false,
	    arrayFormat: 'indices',
	    charset: 'utf-8',
	    charsetSentinel: false,
	    delimiter: '&',
	    encode: true,
	    encodeDotInKeys: false,
	    encoder: utils.encode,
	    encodeValuesOnly: false,
	    format: defaultFormat,
	    formatter: formats.formatters[defaultFormat],
	    // deprecated
	    indices: false,
	    serializeDate: function serializeDate(date) {
	        return toISO.call(date);
	    },
	    skipNulls: false,
	    strictNullHandling: false
	};

	var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
	    return typeof v === 'string'
	        || typeof v === 'number'
	        || typeof v === 'boolean'
	        || typeof v === 'symbol'
	        || typeof v === 'bigint';
	};

	var sentinel = {};

	var stringify = function stringify(
	    object,
	    prefix,
	    generateArrayPrefix,
	    commaRoundTrip,
	    allowEmptyArrays,
	    strictNullHandling,
	    skipNulls,
	    encodeDotInKeys,
	    encoder,
	    filter,
	    sort,
	    allowDots,
	    serializeDate,
	    format,
	    formatter,
	    encodeValuesOnly,
	    charset,
	    sideChannel
	) {
	    var obj = object;

	    var tmpSc = sideChannel;
	    var step = 0;
	    var findFlag = false;
	    while ((tmpSc = tmpSc.get(sentinel)) !== void undefined && !findFlag) {
	        // Where object last appeared in the ref tree
	        var pos = tmpSc.get(object);
	        step += 1;
	        if (typeof pos !== 'undefined') {
	            if (pos === step) {
	                throw new RangeError('Cyclic object value');
	            } else {
	                findFlag = true; // Break while
	            }
	        }
	        if (typeof tmpSc.get(sentinel) === 'undefined') {
	            step = 0;
	        }
	    }

	    if (typeof filter === 'function') {
	        obj = filter(prefix, obj);
	    } else if (obj instanceof Date) {
	        obj = serializeDate(obj);
	    } else if (generateArrayPrefix === 'comma' && isArray(obj)) {
	        obj = utils.maybeMap(obj, function (value) {
	            if (value instanceof Date) {
	                return serializeDate(value);
	            }
	            return value;
	        });
	    }

	    if (obj === null) {
	        if (strictNullHandling) {
	            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key', format) : prefix;
	        }

	        obj = '';
	    }

	    if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
	        if (encoder) {
	            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key', format);
	            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value', format))];
	        }
	        return [formatter(prefix) + '=' + formatter(String(obj))];
	    }

	    var values = [];

	    if (typeof obj === 'undefined') {
	        return values;
	    }

	    var objKeys;
	    if (generateArrayPrefix === 'comma' && isArray(obj)) {
	        // we need to join elements in
	        if (encodeValuesOnly && encoder) {
	            obj = utils.maybeMap(obj, encoder);
	        }
	        objKeys = [{ value: obj.length > 0 ? obj.join(',') || null : void undefined }];
	    } else if (isArray(filter)) {
	        objKeys = filter;
	    } else {
	        var keys = Object.keys(obj);
	        objKeys = sort ? keys.sort(sort) : keys;
	    }

	    var encodedPrefix = encodeDotInKeys ? prefix.replace(/\./g, '%2E') : prefix;

	    var adjustedPrefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encodedPrefix + '[]' : encodedPrefix;

	    if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
	        return adjustedPrefix + '[]';
	    }

	    for (var j = 0; j < objKeys.length; ++j) {
	        var key = objKeys[j];
	        var value = typeof key === 'object' && typeof key.value !== 'undefined' ? key.value : obj[key];

	        if (skipNulls && value === null) {
	            continue;
	        }

	        var encodedKey = allowDots && encodeDotInKeys ? key.replace(/\./g, '%2E') : key;
	        var keyPrefix = isArray(obj)
	            ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(adjustedPrefix, encodedKey) : adjustedPrefix
	            : adjustedPrefix + (allowDots ? '.' + encodedKey : '[' + encodedKey + ']');

	        sideChannel.set(object, step);
	        var valueSideChannel = getSideChannel();
	        valueSideChannel.set(sentinel, sideChannel);
	        pushToArray(values, stringify(
	            value,
	            keyPrefix,
	            generateArrayPrefix,
	            commaRoundTrip,
	            allowEmptyArrays,
	            strictNullHandling,
	            skipNulls,
	            encodeDotInKeys,
	            generateArrayPrefix === 'comma' && encodeValuesOnly && isArray(obj) ? null : encoder,
	            filter,
	            sort,
	            allowDots,
	            serializeDate,
	            format,
	            formatter,
	            encodeValuesOnly,
	            charset,
	            valueSideChannel
	        ));
	    }

	    return values;
	};

	var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
	    if (!opts) {
	        return defaults;
	    }

	    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
	        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
	    }

	    if (typeof opts.encodeDotInKeys !== 'undefined' && typeof opts.encodeDotInKeys !== 'boolean') {
	        throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided');
	    }

	    if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
	        throw new TypeError('Encoder has to be a function.');
	    }

	    var charset = opts.charset || defaults.charset;
	    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
	        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
	    }

	    var format = formats['default'];
	    if (typeof opts.format !== 'undefined') {
	        if (!has.call(formats.formatters, opts.format)) {
	            throw new TypeError('Unknown format option provided.');
	        }
	        format = opts.format;
	    }
	    var formatter = formats.formatters[format];

	    var filter = defaults.filter;
	    if (typeof opts.filter === 'function' || isArray(opts.filter)) {
	        filter = opts.filter;
	    }

	    var arrayFormat;
	    if (opts.arrayFormat in arrayPrefixGenerators) {
	        arrayFormat = opts.arrayFormat;
	    } else if ('indices' in opts) {
	        arrayFormat = opts.indices ? 'indices' : 'repeat';
	    } else {
	        arrayFormat = defaults.arrayFormat;
	    }

	    if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
	        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
	    }

	    var allowDots = typeof opts.allowDots === 'undefined' ? opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;

	    return {
	        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
	        allowDots: allowDots,
	        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
	        arrayFormat: arrayFormat,
	        charset: charset,
	        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
	        commaRoundTrip: opts.commaRoundTrip,
	        delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
	        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
	        encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
	        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
	        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
	        filter: filter,
	        format: format,
	        formatter: formatter,
	        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
	        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
	        sort: typeof opts.sort === 'function' ? opts.sort : null,
	        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
	    };
	};

	stringify_1 = function (object, opts) {
	    var obj = object;
	    var options = normalizeStringifyOptions(opts);

	    var objKeys;
	    var filter;

	    if (typeof options.filter === 'function') {
	        filter = options.filter;
	        obj = filter('', obj);
	    } else if (isArray(options.filter)) {
	        filter = options.filter;
	        objKeys = filter;
	    }

	    var keys = [];

	    if (typeof obj !== 'object' || obj === null) {
	        return '';
	    }

	    var generateArrayPrefix = arrayPrefixGenerators[options.arrayFormat];
	    var commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip;

	    if (!objKeys) {
	        objKeys = Object.keys(obj);
	    }

	    if (options.sort) {
	        objKeys.sort(options.sort);
	    }

	    var sideChannel = getSideChannel();
	    for (var i = 0; i < objKeys.length; ++i) {
	        var key = objKeys[i];

	        if (options.skipNulls && obj[key] === null) {
	            continue;
	        }
	        pushToArray(keys, stringify(
	            obj[key],
	            key,
	            generateArrayPrefix,
	            commaRoundTrip,
	            options.allowEmptyArrays,
	            options.strictNullHandling,
	            options.skipNulls,
	            options.encodeDotInKeys,
	            options.encode ? options.encoder : null,
	            options.filter,
	            options.sort,
	            options.allowDots,
	            options.serializeDate,
	            options.format,
	            options.formatter,
	            options.encodeValuesOnly,
	            options.charset,
	            sideChannel
	        ));
	    }

	    var joined = keys.join(options.delimiter);
	    var prefix = options.addQueryPrefix === true ? '?' : '';

	    if (options.charsetSentinel) {
	        if (options.charset === 'iso-8859-1') {
	            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
	            prefix += 'utf8=%26%2310003%3B&';
	        } else {
	            // encodeURIComponent('✓')
	            prefix += 'utf8=%E2%9C%93&';
	        }
	    }

	    return joined.length > 0 ? prefix + joined : '';
	};
	return stringify_1;
}

var parse$1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse$1;
	hasRequiredParse = 1;

	var utils = requireUtils();

	var has = Object.prototype.hasOwnProperty;
	var isArray = Array.isArray;

	var defaults = {
	    allowDots: false,
	    allowEmptyArrays: false,
	    allowPrototypes: false,
	    allowSparse: false,
	    arrayLimit: 20,
	    charset: 'utf-8',
	    charsetSentinel: false,
	    comma: false,
	    decodeDotInKeys: false,
	    decoder: utils.decode,
	    delimiter: '&',
	    depth: 5,
	    duplicates: 'combine',
	    ignoreQueryPrefix: false,
	    interpretNumericEntities: false,
	    parameterLimit: 1000,
	    parseArrays: true,
	    plainObjects: false,
	    strictDepth: false,
	    strictNullHandling: false
	};

	var interpretNumericEntities = function (str) {
	    return str.replace(/&#(\d+);/g, function ($0, numberStr) {
	        return String.fromCharCode(parseInt(numberStr, 10));
	    });
	};

	var parseArrayValue = function (val, options) {
	    if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
	        return val.split(',');
	    }

	    return val;
	};

	// This is what browsers will submit when the ✓ character occurs in an
	// application/x-www-form-urlencoded body and the encoding of the page containing
	// the form is iso-8859-1, or when the submitted form has an accept-charset
	// attribute of iso-8859-1. Presumably also with other charsets that do not contain
	// the ✓ character, such as us-ascii.
	var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

	// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
	var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

	var parseValues = function parseQueryStringValues(str, options) {
	    var obj = { __proto__: null };

	    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
	    cleanStr = cleanStr.replace(/%5B/gi, '[').replace(/%5D/gi, ']');
	    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
	    var parts = cleanStr.split(options.delimiter, limit);
	    var skipIndex = -1; // Keep track of where the utf8 sentinel was found
	    var i;

	    var charset = options.charset;
	    if (options.charsetSentinel) {
	        for (i = 0; i < parts.length; ++i) {
	            if (parts[i].indexOf('utf8=') === 0) {
	                if (parts[i] === charsetSentinel) {
	                    charset = 'utf-8';
	                } else if (parts[i] === isoSentinel) {
	                    charset = 'iso-8859-1';
	                }
	                skipIndex = i;
	                i = parts.length; // The eslint settings do not allow break;
	            }
	        }
	    }

	    for (i = 0; i < parts.length; ++i) {
	        if (i === skipIndex) {
	            continue;
	        }
	        var part = parts[i];

	        var bracketEqualsPos = part.indexOf(']=');
	        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

	        var key, val;
	        if (pos === -1) {
	            key = options.decoder(part, defaults.decoder, charset, 'key');
	            val = options.strictNullHandling ? null : '';
	        } else {
	            key = options.decoder(part.slice(0, pos), defaults.decoder, charset, 'key');
	            val = utils.maybeMap(
	                parseArrayValue(part.slice(pos + 1), options),
	                function (encodedVal) {
	                    return options.decoder(encodedVal, defaults.decoder, charset, 'value');
	                }
	            );
	        }

	        if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
	            val = interpretNumericEntities(val);
	        }

	        if (part.indexOf('[]=') > -1) {
	            val = isArray(val) ? [val] : val;
	        }

	        var existing = has.call(obj, key);
	        if (existing && options.duplicates === 'combine') {
	            obj[key] = utils.combine(obj[key], val);
	        } else if (!existing || options.duplicates === 'last') {
	            obj[key] = val;
	        }
	    }

	    return obj;
	};

	var parseObject = function (chain, val, options, valuesParsed) {
	    var leaf = valuesParsed ? val : parseArrayValue(val, options);

	    for (var i = chain.length - 1; i >= 0; --i) {
	        var obj;
	        var root = chain[i];

	        if (root === '[]' && options.parseArrays) {
	            obj = options.allowEmptyArrays && (leaf === '' || (options.strictNullHandling && leaf === null))
	                ? []
	                : [].concat(leaf);
	        } else {
	            obj = options.plainObjects ? Object.create(null) : {};
	            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
	            var decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, '.') : cleanRoot;
	            var index = parseInt(decodedRoot, 10);
	            if (!options.parseArrays && decodedRoot === '') {
	                obj = { 0: leaf };
	            } else if (
	                !isNaN(index)
	                && root !== decodedRoot
	                && String(index) === decodedRoot
	                && index >= 0
	                && (options.parseArrays && index <= options.arrayLimit)
	            ) {
	                obj = [];
	                obj[index] = leaf;
	            } else if (decodedRoot !== '__proto__') {
	                obj[decodedRoot] = leaf;
	            }
	        }

	        leaf = obj;
	    }

	    return leaf;
	};

	var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
	    if (!givenKey) {
	        return;
	    }

	    // Transform dot notation to bracket notation
	    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

	    // The regex chunks

	    var brackets = /(\[[^[\]]*])/;
	    var child = /(\[[^[\]]*])/g;

	    // Get the parent

	    var segment = options.depth > 0 && brackets.exec(key);
	    var parent = segment ? key.slice(0, segment.index) : key;

	    // Stash the parent if it exists

	    var keys = [];
	    if (parent) {
	        // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
	        if (!options.plainObjects && has.call(Object.prototype, parent)) {
	            if (!options.allowPrototypes) {
	                return;
	            }
	        }

	        keys.push(parent);
	    }

	    // Loop through children appending to the array until we hit depth

	    var i = 0;
	    while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
	        i += 1;
	        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
	            if (!options.allowPrototypes) {
	                return;
	            }
	        }
	        keys.push(segment[1]);
	    }

	    // If there's a remainder, check strictDepth option for throw, else just add whatever is left

	    if (segment) {
	        if (options.strictDepth === true) {
	            throw new RangeError('Input depth exceeded depth option of ' + options.depth + ' and strictDepth is true');
	        }
	        keys.push('[' + key.slice(segment.index) + ']');
	    }

	    return parseObject(keys, val, options, valuesParsed);
	};

	var normalizeParseOptions = function normalizeParseOptions(opts) {
	    if (!opts) {
	        return defaults;
	    }

	    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
	        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
	    }

	    if (typeof opts.decodeDotInKeys !== 'undefined' && typeof opts.decodeDotInKeys !== 'boolean') {
	        throw new TypeError('`decodeDotInKeys` option can only be `true` or `false`, when provided');
	    }

	    if (opts.decoder !== null && typeof opts.decoder !== 'undefined' && typeof opts.decoder !== 'function') {
	        throw new TypeError('Decoder has to be a function.');
	    }

	    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
	        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
	    }
	    var charset = typeof opts.charset === 'undefined' ? defaults.charset : opts.charset;

	    var duplicates = typeof opts.duplicates === 'undefined' ? defaults.duplicates : opts.duplicates;

	    if (duplicates !== 'combine' && duplicates !== 'first' && duplicates !== 'last') {
	        throw new TypeError('The duplicates option must be either combine, first, or last');
	    }

	    var allowDots = typeof opts.allowDots === 'undefined' ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;

	    return {
	        allowDots: allowDots,
	        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
	        allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults.allowPrototypes,
	        allowSparse: typeof opts.allowSparse === 'boolean' ? opts.allowSparse : defaults.allowSparse,
	        arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults.arrayLimit,
	        charset: charset,
	        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
	        comma: typeof opts.comma === 'boolean' ? opts.comma : defaults.comma,
	        decodeDotInKeys: typeof opts.decodeDotInKeys === 'boolean' ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
	        decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults.decoder,
	        delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
	        // eslint-disable-next-line no-implicit-coercion, no-extra-parens
	        depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults.depth,
	        duplicates: duplicates,
	        ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
	        interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
	        parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults.parameterLimit,
	        parseArrays: opts.parseArrays !== false,
	        plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults.plainObjects,
	        strictDepth: typeof opts.strictDepth === 'boolean' ? !!opts.strictDepth : defaults.strictDepth,
	        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
	    };
	};

	parse$1 = function (str, opts) {
	    var options = normalizeParseOptions(opts);

	    if (str === '' || str === null || typeof str === 'undefined') {
	        return options.plainObjects ? Object.create(null) : {};
	    }

	    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
	    var obj = options.plainObjects ? Object.create(null) : {};

	    // Iterate over the keys and setup the new object

	    var keys = Object.keys(tempObj);
	    for (var i = 0; i < keys.length; ++i) {
	        var key = keys[i];
	        var newObj = parseKeys(key, tempObj[key], options, typeof str === 'string');
	        obj = utils.merge(obj, newObj, options);
	    }

	    if (options.allowSparse === true) {
	        return obj;
	    }

	    return utils.compact(obj);
	};
	return parse$1;
}

var lib;
var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;

	var stringify = requireStringify();
	var parse = requireParse();
	var formats = requireFormats();

	lib = {
	    formats: formats,
	    parse: parse,
	    stringify: stringify
	};
	return lib;
}

/*
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var hasRequiredUrl;

function requireUrl () {
	if (hasRequiredUrl) return url;
	hasRequiredUrl = 1;

	var punycode = requirePunycode();

	function Url() {
	  this.protocol = null;
	  this.slashes = null;
	  this.auth = null;
	  this.host = null;
	  this.port = null;
	  this.hostname = null;
	  this.hash = null;
	  this.search = null;
	  this.query = null;
	  this.pathname = null;
	  this.path = null;
	  this.href = null;
	}

	// Reference: RFC 3986, RFC 1808, RFC 2396

	/*
	 * define these here so at least they only have to be
	 * compiled once on the first module load.
	 */
	var protocolPattern = /^([a-z0-9.+-]+:)/i,
	  portPattern = /:[0-9]*$/,

	  // Special case for a simple path URL
	  simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/,

	  /*
	   * RFC 2396: characters reserved for delimiting URLs.
	   * We actually just auto-escape these.
	   */
	  delims = [
	    '<', '>', '"', '`', ' ', '\r', '\n', '\t'
	  ],

	  // RFC 2396: characters not allowed for various reasons.
	  unwise = [
	    '{', '}', '|', '\\', '^', '`'
	  ].concat(delims),

	  // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
	  autoEscape = ['\''].concat(unwise),
	  /*
	   * Characters that are never ever allowed in a hostname.
	   * Note that any invalid chars are also handled, but these
	   * are the ones that are *expected* to be seen, so we fast-path
	   * them.
	   */
	  nonHostChars = [
	    '%', '/', '?', ';', '#'
	  ].concat(autoEscape),
	  hostEndingChars = [
	    '/', '?', '#'
	  ],
	  hostnameMaxLen = 255,
	  hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
	  hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
	  // protocols that can allow "unsafe" and "unwise" chars.
	  unsafeProtocol = {
	    javascript: true,
	    'javascript:': true
	  },
	  // protocols that never have a hostname.
	  hostlessProtocol = {
	    javascript: true,
	    'javascript:': true
	  },
	  // protocols that always contain a // bit.
	  slashedProtocol = {
	    http: true,
	    https: true,
	    ftp: true,
	    gopher: true,
	    file: true,
	    'http:': true,
	    'https:': true,
	    'ftp:': true,
	    'gopher:': true,
	    'file:': true
	  },
	  querystring = requireLib();

	function urlParse(url, parseQueryString, slashesDenoteHost) {
	  if (url && typeof url === 'object' && url instanceof Url) { return url; }

	  var u = new Url();
	  u.parse(url, parseQueryString, slashesDenoteHost);
	  return u;
	}

	Url.prototype.parse = function (url, parseQueryString, slashesDenoteHost) {
	  if (typeof url !== 'string') {
	    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
	  }

	  /*
	   * Copy chrome, IE, opera backslash-handling behavior.
	   * Back slashes before the query string get converted to forward slashes
	   * See: https://code.google.com/p/chromium/issues/detail?id=25916
	   */
	  var queryIndex = url.indexOf('?'),
	    splitter = queryIndex !== -1 && queryIndex < url.indexOf('#') ? '?' : '#',
	    uSplit = url.split(splitter),
	    slashRegex = /\\/g;
	  uSplit[0] = uSplit[0].replace(slashRegex, '/');
	  url = uSplit.join(splitter);

	  var rest = url;

	  /*
	   * trim before proceeding.
	   * This is to support parse stuff like "  http://foo.com  \n"
	   */
	  rest = rest.trim();

	  if (!slashesDenoteHost && url.split('#').length === 1) {
	    // Try fast path regexp
	    var simplePath = simplePathPattern.exec(rest);
	    if (simplePath) {
	      this.path = rest;
	      this.href = rest;
	      this.pathname = simplePath[1];
	      if (simplePath[2]) {
	        this.search = simplePath[2];
	        if (parseQueryString) {
	          this.query = querystring.parse(this.search.substr(1));
	        } else {
	          this.query = this.search.substr(1);
	        }
	      } else if (parseQueryString) {
	        this.search = '';
	        this.query = {};
	      }
	      return this;
	    }
	  }

	  var proto = protocolPattern.exec(rest);
	  if (proto) {
	    proto = proto[0];
	    var lowerProto = proto.toLowerCase();
	    this.protocol = lowerProto;
	    rest = rest.substr(proto.length);
	  }

	  /*
	   * figure out if it's got a host
	   * user@server is *always* interpreted as a hostname, and url
	   * resolution will treat //foo/bar as host=foo,path=bar because that's
	   * how the browser resolves relative URLs.
	   */
	  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@/]+@[^@/]+/)) {
	    var slashes = rest.substr(0, 2) === '//';
	    if (slashes && !(proto && hostlessProtocol[proto])) {
	      rest = rest.substr(2);
	      this.slashes = true;
	    }
	  }

	  if (!hostlessProtocol[proto] && (slashes || (proto && !slashedProtocol[proto]))) {

	    /*
	     * there's a hostname.
	     * the first instance of /, ?, ;, or # ends the host.
	     *
	     * If there is an @ in the hostname, then non-host chars *are* allowed
	     * to the left of the last @ sign, unless some host-ending character
	     * comes *before* the @-sign.
	     * URLs are obnoxious.
	     *
	     * ex:
	     * http://a@b@c/ => user:a@b host:c
	     * http://a@b?@c => user:a host:c path:/?@c
	     */

	    /*
	     * v0.12 TODO(isaacs): This is not quite how Chrome does things.
	     * Review our test case against browsers more comprehensively.
	     */

	    // find the first instance of any hostEndingChars
	    var hostEnd = -1;
	    for (var i = 0; i < hostEndingChars.length; i++) {
	      var hec = rest.indexOf(hostEndingChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) { hostEnd = hec; }
	    }

	    /*
	     * at this point, either we have an explicit point where the
	     * auth portion cannot go past, or the last @ char is the decider.
	     */
	    var auth, atSign;
	    if (hostEnd === -1) {
	      // atSign can be anywhere.
	      atSign = rest.lastIndexOf('@');
	    } else {
	      /*
	       * atSign must be in auth portion.
	       * http://a@b/c@d => host:b auth:a path:/c@d
	       */
	      atSign = rest.lastIndexOf('@', hostEnd);
	    }

	    /*
	     * Now we have a portion which is definitely the auth.
	     * Pull that off.
	     */
	    if (atSign !== -1) {
	      auth = rest.slice(0, atSign);
	      rest = rest.slice(atSign + 1);
	      this.auth = decodeURIComponent(auth);
	    }

	    // the host is the remaining to the left of the first non-host char
	    hostEnd = -1;
	    for (var i = 0; i < nonHostChars.length; i++) {
	      var hec = rest.indexOf(nonHostChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) { hostEnd = hec; }
	    }
	    // if we still have not hit it, then the entire thing is a host.
	    if (hostEnd === -1) { hostEnd = rest.length; }

	    this.host = rest.slice(0, hostEnd);
	    rest = rest.slice(hostEnd);

	    // pull out port.
	    this.parseHost();

	    /*
	     * we've indicated that there is a hostname,
	     * so even if it's empty, it has to be present.
	     */
	    this.hostname = this.hostname || '';

	    /*
	     * if hostname begins with [ and ends with ]
	     * assume that it's an IPv6 address.
	     */
	    var ipv6Hostname = this.hostname[0] === '[' && this.hostname[this.hostname.length - 1] === ']';

	    // validate a little.
	    if (!ipv6Hostname) {
	      var hostparts = this.hostname.split(/\./);
	      for (var i = 0, l = hostparts.length; i < l; i++) {
	        var part = hostparts[i];
	        if (!part) { continue; }
	        if (!part.match(hostnamePartPattern)) {
	          var newpart = '';
	          for (var j = 0, k = part.length; j < k; j++) {
	            if (part.charCodeAt(j) > 127) {
	              /*
	               * we replace non-ASCII char with a temporary placeholder
	               * we need this to make sure size of hostname is not
	               * broken by replacing non-ASCII by nothing
	               */
	              newpart += 'x';
	            } else {
	              newpart += part[j];
	            }
	          }
	          // we test again with ASCII char only
	          if (!newpart.match(hostnamePartPattern)) {
	            var validParts = hostparts.slice(0, i);
	            var notHost = hostparts.slice(i + 1);
	            var bit = part.match(hostnamePartStart);
	            if (bit) {
	              validParts.push(bit[1]);
	              notHost.unshift(bit[2]);
	            }
	            if (notHost.length) {
	              rest = '/' + notHost.join('.') + rest;
	            }
	            this.hostname = validParts.join('.');
	            break;
	          }
	        }
	      }
	    }

	    if (this.hostname.length > hostnameMaxLen) {
	      this.hostname = '';
	    } else {
	      // hostnames are always lower case.
	      this.hostname = this.hostname.toLowerCase();
	    }

	    if (!ipv6Hostname) {
	      /*
	       * IDNA Support: Returns a punycoded representation of "domain".
	       * It only converts parts of the domain name that
	       * have non-ASCII characters, i.e. it doesn't matter if
	       * you call it with a domain that already is ASCII-only.
	       */
	      this.hostname = punycode.toASCII(this.hostname);
	    }

	    var p = this.port ? ':' + this.port : '';
	    var h = this.hostname || '';
	    this.host = h + p;
	    this.href += this.host;

	    /*
	     * strip [ and ] from the hostname
	     * the host field still retains them, though
	     */
	    if (ipv6Hostname) {
	      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
	      if (rest[0] !== '/') {
	        rest = '/' + rest;
	      }
	    }
	  }

	  /*
	   * now rest is set to the post-host stuff.
	   * chop off any delim chars.
	   */
	  if (!unsafeProtocol[lowerProto]) {

	    /*
	     * First, make 100% sure that any "autoEscape" chars get
	     * escaped, even if encodeURIComponent doesn't think they
	     * need to be.
	     */
	    for (var i = 0, l = autoEscape.length; i < l; i++) {
	      var ae = autoEscape[i];
	      if (rest.indexOf(ae) === -1) { continue; }
	      var esc = encodeURIComponent(ae);
	      if (esc === ae) {
	        esc = escape(ae);
	      }
	      rest = rest.split(ae).join(esc);
	    }
	  }

	  // chop off from the tail first.
	  var hash = rest.indexOf('#');
	  if (hash !== -1) {
	    // got a fragment string.
	    this.hash = rest.substr(hash);
	    rest = rest.slice(0, hash);
	  }
	  var qm = rest.indexOf('?');
	  if (qm !== -1) {
	    this.search = rest.substr(qm);
	    this.query = rest.substr(qm + 1);
	    if (parseQueryString) {
	      this.query = querystring.parse(this.query);
	    }
	    rest = rest.slice(0, qm);
	  } else if (parseQueryString) {
	    // no query string, but parseQueryString still requested
	    this.search = '';
	    this.query = {};
	  }
	  if (rest) { this.pathname = rest; }
	  if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
	    this.pathname = '/';
	  }

	  // to support http.request
	  if (this.pathname || this.search) {
	    var p = this.pathname || '';
	    var s = this.search || '';
	    this.path = p + s;
	  }

	  // finally, reconstruct the href based on what has been validated.
	  this.href = this.format();
	  return this;
	};

	// format a parsed object into a url string
	function urlFormat(obj) {
	  /*
	   * ensure it's an object, and not a string url.
	   * If it's an obj, this is a no-op.
	   * this way, you can call url_format() on strings
	   * to clean up potentially wonky urls.
	   */
	  if (typeof obj === 'string') { obj = urlParse(obj); }
	  if (!(obj instanceof Url)) { return Url.prototype.format.call(obj); }
	  return obj.format();
	}

	Url.prototype.format = function () {
	  var auth = this.auth || '';
	  if (auth) {
	    auth = encodeURIComponent(auth);
	    auth = auth.replace(/%3A/i, ':');
	    auth += '@';
	  }

	  var protocol = this.protocol || '',
	    pathname = this.pathname || '',
	    hash = this.hash || '',
	    host = false,
	    query = '';

	  if (this.host) {
	    host = auth + this.host;
	  } else if (this.hostname) {
	    host = auth + (this.hostname.indexOf(':') === -1 ? this.hostname : '[' + this.hostname + ']');
	    if (this.port) {
	      host += ':' + this.port;
	    }
	  }

	  if (this.query && typeof this.query === 'object' && Object.keys(this.query).length) {
	    query = querystring.stringify(this.query, {
	      arrayFormat: 'repeat',
	      addQueryPrefix: false
	    });
	  }

	  var search = this.search || (query && ('?' + query)) || '';

	  if (protocol && protocol.substr(-1) !== ':') { protocol += ':'; }

	  /*
	   * only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	   * unless they had them to begin with.
	   */
	  if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
	    host = '//' + (host || '');
	    if (pathname && pathname.charAt(0) !== '/') { pathname = '/' + pathname; }
	  } else if (!host) {
	    host = '';
	  }

	  if (hash && hash.charAt(0) !== '#') { hash = '#' + hash; }
	  if (search && search.charAt(0) !== '?') { search = '?' + search; }

	  pathname = pathname.replace(/[?#]/g, function (match) {
	    return encodeURIComponent(match);
	  });
	  search = search.replace('#', '%23');

	  return protocol + host + pathname + search + hash;
	};

	function urlResolve(source, relative) {
	  return urlParse(source, false, true).resolve(relative);
	}

	Url.prototype.resolve = function (relative) {
	  return this.resolveObject(urlParse(relative, false, true)).format();
	};

	function urlResolveObject(source, relative) {
	  if (!source) { return relative; }
	  return urlParse(source, false, true).resolveObject(relative);
	}

	Url.prototype.resolveObject = function (relative) {
	  if (typeof relative === 'string') {
	    var rel = new Url();
	    rel.parse(relative, false, true);
	    relative = rel;
	  }

	  var result = new Url();
	  var tkeys = Object.keys(this);
	  for (var tk = 0; tk < tkeys.length; tk++) {
	    var tkey = tkeys[tk];
	    result[tkey] = this[tkey];
	  }

	  /*
	   * hash is always overridden, no matter what.
	   * even href="" will remove it.
	   */
	  result.hash = relative.hash;

	  // if the relative url is empty, then there's nothing left to do here.
	  if (relative.href === '') {
	    result.href = result.format();
	    return result;
	  }

	  // hrefs like //foo/bar always cut to the protocol.
	  if (relative.slashes && !relative.protocol) {
	    // take everything except the protocol from relative
	    var rkeys = Object.keys(relative);
	    for (var rk = 0; rk < rkeys.length; rk++) {
	      var rkey = rkeys[rk];
	      if (rkey !== 'protocol') { result[rkey] = relative[rkey]; }
	    }

	    // urlParse appends trailing / to urls like http://www.example.com
	    if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
	      result.pathname = '/';
	      result.path = result.pathname;
	    }

	    result.href = result.format();
	    return result;
	  }

	  if (relative.protocol && relative.protocol !== result.protocol) {
	    /*
	     * if it's a known url protocol, then changing
	     * the protocol does weird things
	     * first, if it's not file:, then we MUST have a host,
	     * and if there was a path
	     * to begin with, then we MUST have a path.
	     * if it is file:, then the host is dropped,
	     * because that's known to be hostless.
	     * anything else is assumed to be absolute.
	     */
	    if (!slashedProtocol[relative.protocol]) {
	      var keys = Object.keys(relative);
	      for (var v = 0; v < keys.length; v++) {
	        var k = keys[v];
	        result[k] = relative[k];
	      }
	      result.href = result.format();
	      return result;
	    }

	    result.protocol = relative.protocol;
	    if (!relative.host && !hostlessProtocol[relative.protocol]) {
	      var relPath = (relative.pathname || '').split('/');
	      while (relPath.length && !(relative.host = relPath.shift())) { }
	      if (!relative.host) { relative.host = ''; }
	      if (!relative.hostname) { relative.hostname = ''; }
	      if (relPath[0] !== '') { relPath.unshift(''); }
	      if (relPath.length < 2) { relPath.unshift(''); }
	      result.pathname = relPath.join('/');
	    } else {
	      result.pathname = relative.pathname;
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    result.host = relative.host || '';
	    result.auth = relative.auth;
	    result.hostname = relative.hostname || relative.host;
	    result.port = relative.port;
	    // to support http.request
	    if (result.pathname || result.search) {
	      var p = result.pathname || '';
	      var s = result.search || '';
	      result.path = p + s;
	    }
	    result.slashes = result.slashes || relative.slashes;
	    result.href = result.format();
	    return result;
	  }

	  var isSourceAbs = result.pathname && result.pathname.charAt(0) === '/',
	    isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === '/',
	    mustEndAbs = isRelAbs || isSourceAbs || (result.host && relative.pathname),
	    removeAllDots = mustEndAbs,
	    srcPath = result.pathname && result.pathname.split('/') || [],
	    relPath = relative.pathname && relative.pathname.split('/') || [],
	    psychotic = result.protocol && !slashedProtocol[result.protocol];

	  /*
	   * if the url is a non-slashed url, then relative
	   * links like ../.. should be able
	   * to crawl up to the hostname, as well.  This is strange.
	   * result.protocol has already been set by now.
	   * Later on, put the first path part into the host field.
	   */
	  if (psychotic) {
	    result.hostname = '';
	    result.port = null;
	    if (result.host) {
	      if (srcPath[0] === '') { srcPath[0] = result.host; } else { srcPath.unshift(result.host); }
	    }
	    result.host = '';
	    if (relative.protocol) {
	      relative.hostname = null;
	      relative.port = null;
	      if (relative.host) {
	        if (relPath[0] === '') { relPath[0] = relative.host; } else { relPath.unshift(relative.host); }
	      }
	      relative.host = null;
	    }
	    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
	  }

	  if (isRelAbs) {
	    // it's absolute.
	    result.host = relative.host || relative.host === '' ? relative.host : result.host;
	    result.hostname = relative.hostname || relative.hostname === '' ? relative.hostname : result.hostname;
	    result.search = relative.search;
	    result.query = relative.query;
	    srcPath = relPath;
	    // fall through to the dot-handling below.
	  } else if (relPath.length) {
	    /*
	     * it's relative
	     * throw away the existing file, and take the new path instead.
	     */
	    if (!srcPath) { srcPath = []; }
	    srcPath.pop();
	    srcPath = srcPath.concat(relPath);
	    result.search = relative.search;
	    result.query = relative.query;
	  } else if (relative.search != null) {
	    /*
	     * just pull out the search.
	     * like href='?foo'.
	     * Put this after the other two cases because it simplifies the booleans
	     */
	    if (psychotic) {
	      result.host = srcPath.shift();
	      result.hostname = result.host;
	      /*
	       * occationaly the auth can get stuck only in host
	       * this especially happens in cases like
	       * url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	       */
	      var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
	      if (authInHost) {
	        result.auth = authInHost.shift();
	        result.hostname = authInHost.shift();
	        result.host = result.hostname;
	      }
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    // to support http.request
	    if (result.pathname !== null || result.search !== null) {
	      result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
	    }
	    result.href = result.format();
	    return result;
	  }

	  if (!srcPath.length) {
	    /*
	     * no path at all.  easy.
	     * we've already handled the other stuff above.
	     */
	    result.pathname = null;
	    // to support http.request
	    if (result.search) {
	      result.path = '/' + result.search;
	    } else {
	      result.path = null;
	    }
	    result.href = result.format();
	    return result;
	  }

	  /*
	   * if a url ENDs in . or .., then it must get a trailing slash.
	   * however, if it ends in anything else non-slashy,
	   * then it must NOT get a trailing slash.
	   */
	  var last = srcPath.slice(-1)[0];
	  var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === '.' || last === '..') || last === '';

	  /*
	   * strip single dots, resolve double dots to parent dir
	   * if the path tries to go above the root, `up` ends up > 0
	   */
	  var up = 0;
	  for (var i = srcPath.length; i >= 0; i--) {
	    last = srcPath[i];
	    if (last === '.') {
	      srcPath.splice(i, 1);
	    } else if (last === '..') {
	      srcPath.splice(i, 1);
	      up++;
	    } else if (up) {
	      srcPath.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (!mustEndAbs && !removeAllDots) {
	    for (; up--; up) {
	      srcPath.unshift('..');
	    }
	  }

	  if (mustEndAbs && srcPath[0] !== '' && (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
	    srcPath.unshift('');
	  }

	  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
	    srcPath.push('');
	  }

	  var isAbsolute = srcPath[0] === '' || (srcPath[0] && srcPath[0].charAt(0) === '/');

	  // put the host back
	  if (psychotic) {
	    result.hostname = isAbsolute ? '' : srcPath.length ? srcPath.shift() : '';
	    result.host = result.hostname;
	    /*
	     * occationaly the auth can get stuck only in host
	     * this especially happens in cases like
	     * url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	     */
	    var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
	    if (authInHost) {
	      result.auth = authInHost.shift();
	      result.hostname = authInHost.shift();
	      result.host = result.hostname;
	    }
	  }

	  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

	  if (mustEndAbs && !isAbsolute) {
	    srcPath.unshift('');
	  }

	  if (srcPath.length > 0) {
	    result.pathname = srcPath.join('/');
	  } else {
	    result.pathname = null;
	    result.path = null;
	  }

	  // to support request.http
	  if (result.pathname !== null || result.search !== null) {
	    result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
	  }
	  result.auth = relative.auth || result.auth;
	  result.slashes = result.slashes || relative.slashes;
	  result.href = result.format();
	  return result;
	};

	Url.prototype.parseHost = function () {
	  var host = this.host;
	  var port = portPattern.exec(host);
	  if (port) {
	    port = port[0];
	    if (port !== ':') {
	      this.port = port.substr(1);
	    }
	    host = host.substr(0, host.length - port.length);
	  }
	  if (host) { this.hostname = host; }
	};

	url.parse = urlParse;
	url.resolve = urlResolve;
	url.resolveObject = urlResolveObject;
	url.format = urlFormat;

	url.Url = Url;
	return url;
}

var correctPath = {};

var hasRequiredCorrectPath;

function requireCorrectPath () {
	if (hasRequiredCorrectPath) return correctPath;
	hasRequiredCorrectPath = 1;

	Object.defineProperty(correctPath, "__esModule", {
	  value: true
	});
	correctPath.correctPath = correctPath$1;
	correctPath.unixify = unixify;
	var isWin = process$1.platform === 'win32';
	function removeTrailingSeparator(str) {
	  var i = str.length - 1;
	  if (i < 2) {
	    return str;
	  }
	  while (isSeparator(str, i)) {
	    i--;
	  }
	  return str.substr(0, i + 1);
	}
	function isSeparator(str, i) {
	  var _char = str[i];
	  return i > 0 && (_char === '/' || isWin && _char === '\\');
	}
	function normalizePath(str, stripTrailing) {
	  if (typeof str !== 'string') {
	    throw new TypeError('expected a string');
	  }
	  str = str.replace(/[\\\/]+/g, '/');
	  if (stripTrailing !== false) {
	    str = removeTrailingSeparator(str);
	  }
	  return str;
	}
	function unixify(filepath) {
	  var stripTrailing = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
	  if (isWin) {
	    filepath = normalizePath(filepath, stripTrailing);
	    return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
	  }
	  return filepath;
	}
	function correctPath$1(filepath) {
	  return unixify(filepath.replace(/^\\\\\?\\.:\\/, '\\'));
	}
	return correctPath;
}

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.FSWatcher = exports.StatWatcher = exports.Volume = exports.toUnixTimestamp = exports.bufferToEncoding = exports.dataToBuffer = exports.dataToStr = exports.pathToSteps = exports.filenameToSteps = exports.pathToFilename = exports.flagsToNumber = exports.FLAGS = void 0;
	const pathModule = pathExports;
	const node_1 = node;
	const Stats_1 = Stats$1;
	const Dirent_1 = Dirent$1;
	const buffer_1 = buffer;
	const setImmediate_1 = setImmediate$1;
	const process_1 = process;
	const setTimeoutUnref_1 = setTimeoutUnref$1;
	const stream_1 = streamBrowserify;
	const constants_1 = constants;
	const events_1 = eventsExports;
	const encoding_1 = encoding;
	const errors$1 = errors;
	const util = util$3;
	const promises_1 = promises;
	const resolveCrossPlatform = pathModule.resolve;
	const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_SYNC, O_DIRECTORY, F_OK, COPYFILE_EXCL, COPYFILE_FICLONE_FORCE, } = constants_1.constants;
	const { sep, relative, join, dirname } = pathModule.posix ? pathModule.posix : pathModule;
	const isWin = process_1.default.platform === 'win32';
	const kMinPoolSpace = 128;
	// const kMaxLength = require('buffer').kMaxLength;
	// ---------------------------------------- Error messages
	// TODO: Use `internal/errors.js` in the future.
	const ERRSTR = {
	    PATH_STR: 'path must be a string or Buffer',
	    // FD:             'file descriptor must be a unsigned 32-bit integer',
	    FD: 'fd must be a file descriptor',
	    MODE_INT: 'mode must be an int',
	    CB: 'callback must be a function',
	    UID: 'uid must be an unsigned int',
	    GID: 'gid must be an unsigned int',
	    LEN: 'len must be an integer',
	    ATIME: 'atime must be an integer',
	    MTIME: 'mtime must be an integer',
	    PREFIX: 'filename prefix is required',
	    BUFFER: 'buffer must be an instance of Buffer or StaticBuffer',
	    OFFSET: 'offset must be an integer',
	    LENGTH: 'length must be an integer',
	    POSITION: 'position must be an integer',
	};
	const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;
	// const ERRSTR_FLAG = flag => `Unknown file open flag: ${flag}`;
	const ENOENT = 'ENOENT';
	const EBADF = 'EBADF';
	const EINVAL = 'EINVAL';
	const EPERM = 'EPERM';
	const EPROTO = 'EPROTO';
	const EEXIST = 'EEXIST';
	const ENOTDIR = 'ENOTDIR';
	const EMFILE = 'EMFILE';
	const EACCES = 'EACCES';
	const EISDIR = 'EISDIR';
	const ENOTEMPTY = 'ENOTEMPTY';
	const ENOSYS = 'ENOSYS';
	const ERR_FS_EISDIR = 'ERR_FS_EISDIR';
	function formatError(errorCode, func = '', path = '', path2 = '') {
	    let pathFormatted = '';
	    if (path)
	        pathFormatted = ` '${path}'`;
	    if (path2)
	        pathFormatted += ` -> '${path2}'`;
	    switch (errorCode) {
	        case ENOENT:
	            return `ENOENT: no such file or directory, ${func}${pathFormatted}`;
	        case EBADF:
	            return `EBADF: bad file descriptor, ${func}${pathFormatted}`;
	        case EINVAL:
	            return `EINVAL: invalid argument, ${func}${pathFormatted}`;
	        case EPERM:
	            return `EPERM: operation not permitted, ${func}${pathFormatted}`;
	        case EPROTO:
	            return `EPROTO: protocol error, ${func}${pathFormatted}`;
	        case EEXIST:
	            return `EEXIST: file already exists, ${func}${pathFormatted}`;
	        case ENOTDIR:
	            return `ENOTDIR: not a directory, ${func}${pathFormatted}`;
	        case EISDIR:
	            return `EISDIR: illegal operation on a directory, ${func}${pathFormatted}`;
	        case EACCES:
	            return `EACCES: permission denied, ${func}${pathFormatted}`;
	        case ENOTEMPTY:
	            return `ENOTEMPTY: directory not empty, ${func}${pathFormatted}`;
	        case EMFILE:
	            return `EMFILE: too many open files, ${func}${pathFormatted}`;
	        case ENOSYS:
	            return `ENOSYS: function not implemented, ${func}${pathFormatted}`;
	        case ERR_FS_EISDIR:
	            return `[ERR_FS_EISDIR]: Path is a directory: ${func} returned EISDIR (is a directory) ${path}`;
	        default:
	            return `${errorCode}: error occurred, ${func}${pathFormatted}`;
	    }
	}
	function createError(errorCode, func = '', path = '', path2 = '', Constructor = Error) {
	    const error = new Constructor(formatError(errorCode, func, path, path2));
	    error.code = errorCode;
	    if (path) {
	        error.path = path;
	    }
	    return error;
	}
	// ---------------------------------------- Flags
	// List of file `flags` as defined by Node.
	var FLAGS;
	(function (FLAGS) {
	    // Open file for reading. An exception occurs if the file does not exist.
	    FLAGS[FLAGS["r"] = O_RDONLY] = "r";
	    // Open file for reading and writing. An exception occurs if the file does not exist.
	    FLAGS[FLAGS["r+"] = O_RDWR] = "r+";
	    // Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache.
	    FLAGS[FLAGS["rs"] = O_RDONLY | O_SYNC] = "rs";
	    FLAGS[FLAGS["sr"] = FLAGS.rs] = "sr";
	    // Open file for reading and writing, telling the OS to open it synchronously. See notes for 'rs' about using this with caution.
	    FLAGS[FLAGS["rs+"] = O_RDWR | O_SYNC] = "rs+";
	    FLAGS[FLAGS["sr+"] = FLAGS['rs+']] = "sr+";
	    // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
	    FLAGS[FLAGS["w"] = O_WRONLY | O_CREAT | O_TRUNC] = "w";
	    // Like 'w' but fails if path exists.
	    FLAGS[FLAGS["wx"] = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL] = "wx";
	    FLAGS[FLAGS["xw"] = FLAGS.wx] = "xw";
	    // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
	    FLAGS[FLAGS["w+"] = O_RDWR | O_CREAT | O_TRUNC] = "w+";
	    // Like 'w+' but fails if path exists.
	    FLAGS[FLAGS["wx+"] = O_RDWR | O_CREAT | O_TRUNC | O_EXCL] = "wx+";
	    FLAGS[FLAGS["xw+"] = FLAGS['wx+']] = "xw+";
	    // Open file for appending. The file is created if it does not exist.
	    FLAGS[FLAGS["a"] = O_WRONLY | O_APPEND | O_CREAT] = "a";
	    // Like 'a' but fails if path exists.
	    FLAGS[FLAGS["ax"] = O_WRONLY | O_APPEND | O_CREAT | O_EXCL] = "ax";
	    FLAGS[FLAGS["xa"] = FLAGS.ax] = "xa";
	    // Open file for reading and appending. The file is created if it does not exist.
	    FLAGS[FLAGS["a+"] = O_RDWR | O_APPEND | O_CREAT] = "a+";
	    // Like 'a+' but fails if path exists.
	    FLAGS[FLAGS["ax+"] = O_RDWR | O_APPEND | O_CREAT | O_EXCL] = "ax+";
	    FLAGS[FLAGS["xa+"] = FLAGS['ax+']] = "xa+";
	})(FLAGS = exports.FLAGS || (exports.FLAGS = {}));
	function flagsToNumber(flags) {
	    if (typeof flags === 'number')
	        return flags;
	    if (typeof flags === 'string') {
	        const flagsNum = FLAGS[flags];
	        if (typeof flagsNum !== 'undefined')
	            return flagsNum;
	    }
	    // throw new TypeError(formatError(ERRSTR_FLAG(flags)));
	    throw new errors$1.TypeError('ERR_INVALID_OPT_VALUE', 'flags', flags);
	}
	exports.flagsToNumber = flagsToNumber;
	// ---------------------------------------- Options
	function getOptions(defaults, options) {
	    let opts;
	    if (!options)
	        return defaults;
	    else {
	        const tipeof = typeof options;
	        switch (tipeof) {
	            case 'string':
	                opts = Object.assign({}, defaults, { encoding: options });
	                break;
	            case 'object':
	                opts = Object.assign({}, defaults, options);
	                break;
	            default:
	                throw TypeError(ERRSTR_OPTS(tipeof));
	        }
	    }
	    if (opts.encoding !== 'buffer')
	        (0, encoding_1.assertEncoding)(opts.encoding);
	    return opts;
	}
	function optsGenerator(defaults) {
	    return options => getOptions(defaults, options);
	}
	function validateCallback(callback) {
	    if (typeof callback !== 'function')
	        throw TypeError(ERRSTR.CB);
	    return callback;
	}
	function optsAndCbGenerator(getOpts) {
	    return (options, callback) => typeof options === 'function' ? [getOpts(), options] : [getOpts(options), validateCallback(callback)];
	}
	const optsDefaults = {
	    encoding: 'utf8',
	};
	const getDefaultOpts = optsGenerator(optsDefaults);
	const getDefaultOptsAndCb = optsAndCbGenerator(getDefaultOpts);
	const readFileOptsDefaults = {
	    flag: 'r',
	};
	const getReadFileOptions = optsGenerator(readFileOptsDefaults);
	const writeFileDefaults = {
	    encoding: 'utf8',
	    mode: 438 /* MODE.DEFAULT */,
	    flag: FLAGS[FLAGS.w],
	};
	const getWriteFileOptions = optsGenerator(writeFileDefaults);
	const appendFileDefaults = {
	    encoding: 'utf8',
	    mode: 438 /* MODE.DEFAULT */,
	    flag: FLAGS[FLAGS.a],
	};
	const getAppendFileOpts = optsGenerator(appendFileDefaults);
	const getAppendFileOptsAndCb = optsAndCbGenerator(getAppendFileOpts);
	const realpathDefaults = optsDefaults;
	const getRealpathOptions = optsGenerator(realpathDefaults);
	const getRealpathOptsAndCb = optsAndCbGenerator(getRealpathOptions);
	const mkdirDefaults = {
	    mode: 511 /* MODE.DIR */,
	    recursive: false,
	};
	const getMkdirOptions = (options) => {
	    if (typeof options === 'number')
	        return Object.assign({}, mkdirDefaults, { mode: options });
	    return Object.assign({}, mkdirDefaults, options);
	};
	const rmdirDefaults = {
	    recursive: false,
	};
	const getRmdirOptions = (options) => {
	    return Object.assign({}, rmdirDefaults, options);
	};
	const getRmOpts = optsGenerator(optsDefaults);
	const getRmOptsAndCb = optsAndCbGenerator(getRmOpts);
	const readdirDefaults = {
	    encoding: 'utf8',
	    withFileTypes: false,
	};
	const getReaddirOptions = optsGenerator(readdirDefaults);
	const getReaddirOptsAndCb = optsAndCbGenerator(getReaddirOptions);
	const statDefaults = {
	    bigint: false,
	};
	const getStatOptions = (options = {}) => Object.assign({}, statDefaults, options);
	const getStatOptsAndCb = (options, callback) => typeof options === 'function' ? [getStatOptions(), options] : [getStatOptions(options), validateCallback(callback)];
	// ---------------------------------------- Utility functions
	function getPathFromURLPosix(url) {
	    if (url.hostname !== '') {
	        throw new errors$1.TypeError('ERR_INVALID_FILE_URL_HOST', process_1.default.platform);
	    }
	    const pathname = url.pathname;
	    for (let n = 0; n < pathname.length; n++) {
	        if (pathname[n] === '%') {
	            const third = pathname.codePointAt(n + 2) | 0x20;
	            if (pathname[n + 1] === '2' && third === 102) {
	                throw new errors$1.TypeError('ERR_INVALID_FILE_URL_PATH', 'must not include encoded / characters');
	            }
	        }
	    }
	    return decodeURIComponent(pathname);
	}
	function pathToFilename(path) {
	    if (typeof path !== 'string' && !buffer_1.Buffer.isBuffer(path)) {
	        try {
	            if (!(path instanceof requireUrl().URL))
	                throw new TypeError(ERRSTR.PATH_STR);
	        }
	        catch (err) {
	            throw new TypeError(ERRSTR.PATH_STR);
	        }
	        path = getPathFromURLPosix(path);
	    }
	    const pathString = String(path);
	    nullCheck(pathString);
	    // return slash(pathString);
	    return pathString;
	}
	exports.pathToFilename = pathToFilename;
	let resolve = (filename, base = process_1.default.cwd()) => resolveCrossPlatform(base, filename);
	if (isWin) {
	    const _resolve = resolve;
	    const { unixify } = requireCorrectPath();
	    resolve = (filename, base) => unixify(_resolve(filename, base));
	}
	function filenameToSteps(filename, base) {
	    const fullPath = resolve(filename, base);
	    const fullPathSansSlash = fullPath.substring(1);
	    if (!fullPathSansSlash)
	        return [];
	    return fullPathSansSlash.split(sep);
	}
	exports.filenameToSteps = filenameToSteps;
	function pathToSteps(path) {
	    return filenameToSteps(pathToFilename(path));
	}
	exports.pathToSteps = pathToSteps;
	function dataToStr(data, encoding = encoding_1.ENCODING_UTF8) {
	    if (buffer_1.Buffer.isBuffer(data))
	        return data.toString(encoding);
	    else if (data instanceof Uint8Array)
	        return (0, buffer_1.bufferFrom)(data).toString(encoding);
	    else
	        return String(data);
	}
	exports.dataToStr = dataToStr;
	function dataToBuffer(data, encoding = encoding_1.ENCODING_UTF8) {
	    if (buffer_1.Buffer.isBuffer(data))
	        return data;
	    else if (data instanceof Uint8Array)
	        return (0, buffer_1.bufferFrom)(data);
	    else
	        return (0, buffer_1.bufferFrom)(String(data), encoding);
	}
	exports.dataToBuffer = dataToBuffer;
	function bufferToEncoding(buffer, encoding) {
	    if (!encoding || encoding === 'buffer')
	        return buffer;
	    else
	        return buffer.toString(encoding);
	}
	exports.bufferToEncoding = bufferToEncoding;
	function nullCheck(path, callback) {
	    if (('' + path).indexOf('\u0000') !== -1) {
	        const er = new Error('Path must be a string without null bytes');
	        er.code = ENOENT;
	        if (typeof callback !== 'function')
	            throw er;
	        process_1.default.nextTick(callback, er);
	        return false;
	    }
	    return true;
	}
	function _modeToNumber(mode, def) {
	    if (typeof mode === 'number')
	        return mode;
	    if (typeof mode === 'string')
	        return parseInt(mode, 8);
	    if (def)
	        return modeToNumber(def);
	    return undefined;
	}
	function modeToNumber(mode, def) {
	    const result = _modeToNumber(mode, def);
	    if (typeof result !== 'number' || isNaN(result))
	        throw new TypeError(ERRSTR.MODE_INT);
	    return result;
	}
	function isFd(path) {
	    return path >>> 0 === path;
	}
	function validateFd(fd) {
	    if (!isFd(fd))
	        throw TypeError(ERRSTR.FD);
	}
	// converts Date or number to a fractional UNIX timestamp
	function toUnixTimestamp(time) {
	    // tslint:disable-next-line triple-equals
	    if (typeof time === 'string' && +time == time) {
	        return +time;
	    }
	    if (time instanceof Date) {
	        return time.getTime() / 1000;
	    }
	    if (isFinite(time)) {
	        if (time < 0) {
	            return Date.now() / 1000;
	        }
	        return time;
	    }
	    throw new Error('Cannot parse time: ' + time);
	}
	exports.toUnixTimestamp = toUnixTimestamp;
	function validateUid(uid) {
	    if (typeof uid !== 'number')
	        throw TypeError(ERRSTR.UID);
	}
	function validateGid(gid) {
	    if (typeof gid !== 'number')
	        throw TypeError(ERRSTR.GID);
	}
	function flattenJSON(nestedJSON) {
	    const flatJSON = {};
	    function flatten(pathPrefix, node) {
	        for (const path in node) {
	            const contentOrNode = node[path];
	            const joinedPath = join(pathPrefix, path);
	            if (typeof contentOrNode === 'string') {
	                flatJSON[joinedPath] = contentOrNode;
	            }
	            else if (typeof contentOrNode === 'object' && contentOrNode !== null && Object.keys(contentOrNode).length > 0) {
	                // empty directories need an explicit entry and therefore get handled in `else`, non-empty ones are implicitly considered
	                flatten(joinedPath, contentOrNode);
	            }
	            else {
	                // without this branch null, empty-object or non-object entries would not be handled in the same way
	                // by both fromJSON() and fromNestedJSON()
	                flatJSON[joinedPath] = null;
	            }
	        }
	    }
	    flatten('', nestedJSON);
	    return flatJSON;
	}
	/**
	 * `Volume` represents a file system.
	 */
	class Volume {
	    static fromJSON(json, cwd) {
	        const vol = new Volume();
	        vol.fromJSON(json, cwd);
	        return vol;
	    }
	    static fromNestedJSON(json, cwd) {
	        const vol = new Volume();
	        vol.fromNestedJSON(json, cwd);
	        return vol;
	    }
	    get promises() {
	        if (this.promisesApi === null)
	            throw new Error('Promise is not supported in this environment.');
	        return this.promisesApi;
	    }
	    constructor(props = {}) {
	        // I-node number counter.
	        this.ino = 0;
	        // A mapping for i-node numbers to i-nodes (`Node`);
	        this.inodes = {};
	        // List of released i-node numbers, for reuse.
	        this.releasedInos = [];
	        // A mapping for file descriptors to `File`s.
	        this.fds = {};
	        // A list of reusable (opened and closed) file descriptors, that should be
	        // used first before creating a new file descriptor.
	        this.releasedFds = [];
	        // Max number of open files.
	        this.maxFiles = 10000;
	        // Current number of open files.
	        this.openFiles = 0;
	        this.promisesApi = (0, promises_1.createPromisesApi)(this);
	        this.statWatchers = {};
	        this.props = Object.assign({ Node: node_1.Node, Link: node_1.Link, File: node_1.File }, props);
	        const root = this.createLink();
	        root.setNode(this.createNode(true));
	        const self = this; // tslint:disable-line no-this-assignment
	        this.StatWatcher = class extends StatWatcher {
	            constructor() {
	                super(self);
	            }
	        };
	        const _ReadStream = FsReadStream;
	        this.ReadStream = class extends _ReadStream {
	            constructor(...args) {
	                super(self, ...args);
	            }
	        };
	        const _WriteStream = FsWriteStream;
	        this.WriteStream = class extends _WriteStream {
	            constructor(...args) {
	                super(self, ...args);
	            }
	        };
	        this.FSWatcher = class extends FSWatcher {
	            constructor() {
	                super(self);
	            }
	        };
	        root.setChild('.', root);
	        root.getNode().nlink++;
	        root.setChild('..', root);
	        root.getNode().nlink++;
	        this.root = root;
	    }
	    createLink(parent, name, isDirectory = false, perm) {
	        if (!parent) {
	            return new this.props.Link(this, null, '');
	        }
	        if (!name) {
	            throw new Error('createLink: name cannot be empty');
	        }
	        return parent.createChild(name, this.createNode(isDirectory, perm));
	    }
	    deleteLink(link) {
	        const parent = link.parent;
	        if (parent) {
	            parent.deleteChild(link);
	            return true;
	        }
	        return false;
	    }
	    newInoNumber() {
	        const releasedFd = this.releasedInos.pop();
	        if (releasedFd)
	            return releasedFd;
	        else {
	            this.ino = (this.ino + 1) % 0xffffffff;
	            return this.ino;
	        }
	    }
	    newFdNumber() {
	        const releasedFd = this.releasedFds.pop();
	        return typeof releasedFd === 'number' ? releasedFd : Volume.fd--;
	    }
	    createNode(isDirectory = false, perm) {
	        const node = new this.props.Node(this.newInoNumber(), perm);
	        if (isDirectory)
	            node.setIsDirectory();
	        this.inodes[node.ino] = node;
	        return node;
	    }
	    getNode(ino) {
	        return this.inodes[ino];
	    }
	    deleteNode(node) {
	        node.del();
	        delete this.inodes[node.ino];
	        this.releasedInos.push(node.ino);
	    }
	    // Generates 6 character long random string, used by `mkdtemp`.
	    genRndStr() {
	        const str = (Math.random() + 1).toString(36).substring(2, 8);
	        if (str.length === 6)
	            return str;
	        else
	            return this.genRndStr();
	    }
	    // Returns a `Link` (hard link) referenced by path "split" into steps.
	    getLink(steps) {
	        return this.root.walk(steps);
	    }
	    // Just link `getLink`, but throws a correct user error, if link to found.
	    getLinkOrThrow(filename, funcName) {
	        const steps = filenameToSteps(filename);
	        const link = this.getLink(steps);
	        if (!link)
	            throw createError(ENOENT, funcName, filename);
	        return link;
	    }
	    // Just like `getLink`, but also dereference/resolves symbolic links.
	    getResolvedLink(filenameOrSteps) {
	        let steps = typeof filenameOrSteps === 'string' ? filenameToSteps(filenameOrSteps) : filenameOrSteps;
	        let link = this.root;
	        let i = 0;
	        while (i < steps.length) {
	            const step = steps[i];
	            link = link.getChild(step);
	            if (!link)
	                return null;
	            const node = link.getNode();
	            if (node.isSymlink()) {
	                steps = node.symlink.concat(steps.slice(i + 1));
	                link = this.root;
	                i = 0;
	                continue;
	            }
	            i++;
	        }
	        return link;
	    }
	    // Just like `getLinkOrThrow`, but also dereference/resolves symbolic links.
	    getResolvedLinkOrThrow(filename, funcName) {
	        const link = this.getResolvedLink(filename);
	        if (!link)
	            throw createError(ENOENT, funcName, filename);
	        return link;
	    }
	    resolveSymlinks(link) {
	        // let node: Node = link.getNode();
	        // while(link && node.isSymlink()) {
	        //     link = this.getLink(node.symlink);
	        //     if(!link) return null;
	        //     node = link.getNode();
	        // }
	        // return link;
	        return this.getResolvedLink(link.steps.slice(1));
	    }
	    // Just like `getLinkOrThrow`, but also verifies that the link is a directory.
	    getLinkAsDirOrThrow(filename, funcName) {
	        const link = this.getLinkOrThrow(filename, funcName);
	        if (!link.getNode().isDirectory())
	            throw createError(ENOTDIR, funcName, filename);
	        return link;
	    }
	    // Get the immediate parent directory of the link.
	    getLinkParent(steps) {
	        return this.root.walk(steps, steps.length - 1);
	    }
	    getLinkParentAsDirOrThrow(filenameOrSteps, funcName) {
	        const steps = filenameOrSteps instanceof Array ? filenameOrSteps : filenameToSteps(filenameOrSteps);
	        const link = this.getLinkParent(steps);
	        if (!link)
	            throw createError(ENOENT, funcName, sep + steps.join(sep));
	        if (!link.getNode().isDirectory())
	            throw createError(ENOTDIR, funcName, sep + steps.join(sep));
	        return link;
	    }
	    getFileByFd(fd) {
	        return this.fds[String(fd)];
	    }
	    getFileByFdOrThrow(fd, funcName) {
	        if (!isFd(fd))
	            throw TypeError(ERRSTR.FD);
	        const file = this.getFileByFd(fd);
	        if (!file)
	            throw createError(EBADF, funcName);
	        return file;
	    }
	    /**
	     * @todo This is not used anymore. Remove.
	     */
	    /*
	    private getNodeByIdOrCreate(id: TFileId, flags: number, perm: number): Node {
	      if (typeof id === 'number') {
	        const file = this.getFileByFd(id);
	        if (!file) throw Error('File nto found');
	        return file.node;
	      } else {
	        const steps = pathToSteps(id as PathLike);
	        let link = this.getLink(steps);
	        if (link) return link.getNode();
	  
	        // Try creating a node if not found.
	        if (flags & O_CREAT) {
	          const dirLink = this.getLinkParent(steps);
	          if (dirLink) {
	            const name = steps[steps.length - 1];
	            link = this.createLink(dirLink, name, false, perm);
	            return link.getNode();
	          }
	        }
	  
	        throw createError(ENOENT, 'getNodeByIdOrCreate', pathToFilename(id));
	      }
	    }
	    */
	    wrapAsync(method, args, callback) {
	        validateCallback(callback);
	        (0, setImmediate_1.default)(() => {
	            let result;
	            try {
	                result = method.apply(this, args);
	            }
	            catch (err) {
	                callback(err);
	                return;
	            }
	            callback(null, result);
	        });
	    }
	    _toJSON(link = this.root, json = {}, path) {
	        let isEmpty = true;
	        let children = link.children;
	        if (link.getNode().isFile()) {
	            children = { [link.getName()]: link.parent.getChild(link.getName()) };
	            link = link.parent;
	        }
	        for (const name in children) {
	            if (name === '.' || name === '..') {
	                continue;
	            }
	            isEmpty = false;
	            const child = link.getChild(name);
	            if (!child) {
	                throw new Error('_toJSON: unexpected undefined');
	            }
	            const node = child.getNode();
	            if (node.isFile()) {
	                let filename = child.getPath();
	                if (path)
	                    filename = relative(path, filename);
	                json[filename] = node.getString();
	            }
	            else if (node.isDirectory()) {
	                this._toJSON(child, json, path);
	            }
	        }
	        let dirPath = link.getPath();
	        if (path)
	            dirPath = relative(path, dirPath);
	        if (dirPath && isEmpty) {
	            json[dirPath] = null;
	        }
	        return json;
	    }
	    toJSON(paths, json = {}, isRelative = false) {
	        const links = [];
	        if (paths) {
	            if (!(paths instanceof Array))
	                paths = [paths];
	            for (const path of paths) {
	                const filename = pathToFilename(path);
	                const link = this.getResolvedLink(filename);
	                if (!link)
	                    continue;
	                links.push(link);
	            }
	        }
	        else {
	            links.push(this.root);
	        }
	        if (!links.length)
	            return json;
	        for (const link of links)
	            this._toJSON(link, json, isRelative ? link.getPath() : '');
	        return json;
	    }
	    // TODO: `cwd` should probably not invoke `process.cwd()`.
	    fromJSON(json, cwd = process_1.default.cwd()) {
	        for (let filename in json) {
	            const data = json[filename];
	            filename = resolve(filename, cwd);
	            if (typeof data === 'string') {
	                const dir = dirname(filename);
	                this.mkdirpBase(dir, 511 /* MODE.DIR */);
	                this.writeFileSync(filename, data);
	            }
	            else {
	                this.mkdirpBase(filename, 511 /* MODE.DIR */);
	            }
	        }
	    }
	    fromNestedJSON(json, cwd) {
	        this.fromJSON(flattenJSON(json), cwd);
	    }
	    reset() {
	        this.ino = 0;
	        this.inodes = {};
	        this.releasedInos = [];
	        this.fds = {};
	        this.releasedFds = [];
	        this.openFiles = 0;
	        this.root = this.createLink();
	        this.root.setNode(this.createNode(true));
	    }
	    // Legacy interface
	    mountSync(mountpoint, json) {
	        this.fromJSON(json, mountpoint);
	    }
	    openLink(link, flagsNum, resolveSymlinks = true) {
	        if (this.openFiles >= this.maxFiles) {
	            // Too many open files.
	            throw createError(EMFILE, 'open', link.getPath());
	        }
	        // Resolve symlinks.
	        let realLink = link;
	        if (resolveSymlinks)
	            realLink = this.resolveSymlinks(link);
	        if (!realLink)
	            throw createError(ENOENT, 'open', link.getPath());
	        const node = realLink.getNode();
	        // Check whether node is a directory
	        if (node.isDirectory()) {
	            if ((flagsNum & (O_RDONLY | O_RDWR | O_WRONLY)) !== O_RDONLY)
	                throw createError(EISDIR, 'open', link.getPath());
	        }
	        else {
	            if (flagsNum & O_DIRECTORY)
	                throw createError(ENOTDIR, 'open', link.getPath());
	        }
	        // Check node permissions
	        if (!(flagsNum & O_WRONLY)) {
	            if (!node.canRead()) {
	                throw createError(EACCES, 'open', link.getPath());
	            }
	        }
	        const file = new this.props.File(link, node, flagsNum, this.newFdNumber());
	        this.fds[file.fd] = file;
	        this.openFiles++;
	        if (flagsNum & O_TRUNC)
	            file.truncate();
	        return file;
	    }
	    openFile(filename, flagsNum, modeNum, resolveSymlinks = true) {
	        const steps = filenameToSteps(filename);
	        let link = resolveSymlinks ? this.getResolvedLink(steps) : this.getLink(steps);
	        if (link && flagsNum & O_EXCL)
	            throw createError(EEXIST, 'open', filename);
	        // Try creating a new file, if it does not exist.
	        if (!link && flagsNum & O_CREAT) {
	            // const dirLink: Link = this.getLinkParent(steps);
	            const dirLink = this.getResolvedLink(steps.slice(0, steps.length - 1));
	            // if(!dirLink) throw createError(ENOENT, 'open', filename);
	            if (!dirLink)
	                throw createError(ENOENT, 'open', sep + steps.join(sep));
	            if (flagsNum & O_CREAT && typeof modeNum === 'number') {
	                link = this.createLink(dirLink, steps[steps.length - 1], false, modeNum);
	            }
	        }
	        if (link)
	            return this.openLink(link, flagsNum, resolveSymlinks);
	        throw createError(ENOENT, 'open', filename);
	    }
	    openBase(filename, flagsNum, modeNum, resolveSymlinks = true) {
	        const file = this.openFile(filename, flagsNum, modeNum, resolveSymlinks);
	        if (!file)
	            throw createError(ENOENT, 'open', filename);
	        return file.fd;
	    }
	    openSync(path, flags, mode = 438 /* MODE.DEFAULT */) {
	        // Validate (1) mode; (2) path; (3) flags - in that order.
	        const modeNum = modeToNumber(mode);
	        const fileName = pathToFilename(path);
	        const flagsNum = flagsToNumber(flags);
	        return this.openBase(fileName, flagsNum, modeNum);
	    }
	    open(path, flags, a, b) {
	        let mode = a;
	        let callback = b;
	        if (typeof a === 'function') {
	            mode = 438 /* MODE.DEFAULT */;
	            callback = a;
	        }
	        mode = mode || 438 /* MODE.DEFAULT */;
	        const modeNum = modeToNumber(mode);
	        const fileName = pathToFilename(path);
	        const flagsNum = flagsToNumber(flags);
	        this.wrapAsync(this.openBase, [fileName, flagsNum, modeNum], callback);
	    }
	    closeFile(file) {
	        if (!this.fds[file.fd])
	            return;
	        this.openFiles--;
	        delete this.fds[file.fd];
	        this.releasedFds.push(file.fd);
	    }
	    closeSync(fd) {
	        validateFd(fd);
	        const file = this.getFileByFdOrThrow(fd, 'close');
	        this.closeFile(file);
	    }
	    close(fd, callback) {
	        validateFd(fd);
	        this.wrapAsync(this.closeSync, [fd], callback);
	    }
	    openFileOrGetById(id, flagsNum, modeNum) {
	        if (typeof id === 'number') {
	            const file = this.fds[id];
	            if (!file)
	                throw createError(ENOENT);
	            return file;
	        }
	        else {
	            return this.openFile(pathToFilename(id), flagsNum, modeNum);
	        }
	    }
	    readBase(fd, buffer, offset, length, position) {
	        const file = this.getFileByFdOrThrow(fd);
	        return file.read(buffer, Number(offset), Number(length), position);
	    }
	    readSync(fd, buffer, offset, length, position) {
	        validateFd(fd);
	        return this.readBase(fd, buffer, offset, length, position);
	    }
	    read(fd, buffer, offset, length, position, callback) {
	        validateCallback(callback);
	        // This `if` branch is from Node.js
	        if (length === 0) {
	            return process_1.default.nextTick(() => {
	                if (callback)
	                    callback(null, 0, buffer);
	            });
	        }
	        (0, setImmediate_1.default)(() => {
	            try {
	                const bytes = this.readBase(fd, buffer, offset, length, position);
	                callback(null, bytes, buffer);
	            }
	            catch (err) {
	                callback(err);
	            }
	        });
	    }
	    readFileBase(id, flagsNum, encoding) {
	        let result;
	        const isUserFd = typeof id === 'number';
	        const userOwnsFd = isUserFd && isFd(id);
	        let fd;
	        if (userOwnsFd)
	            fd = id;
	        else {
	            const filename = pathToFilename(id);
	            const steps = filenameToSteps(filename);
	            const link = this.getResolvedLink(steps);
	            if (link) {
	                const node = link.getNode();
	                if (node.isDirectory())
	                    throw createError(EISDIR, 'open', link.getPath());
	            }
	            fd = this.openSync(id, flagsNum);
	        }
	        try {
	            result = bufferToEncoding(this.getFileByFdOrThrow(fd).getBuffer(), encoding);
	        }
	        finally {
	            if (!userOwnsFd) {
	                this.closeSync(fd);
	            }
	        }
	        return result;
	    }
	    readFileSync(file, options) {
	        const opts = getReadFileOptions(options);
	        const flagsNum = flagsToNumber(opts.flag);
	        return this.readFileBase(file, flagsNum, opts.encoding);
	    }
	    readFile(id, a, b) {
	        const [opts, callback] = optsAndCbGenerator(getReadFileOptions)(a, b);
	        const flagsNum = flagsToNumber(opts.flag);
	        this.wrapAsync(this.readFileBase, [id, flagsNum, opts.encoding], callback);
	    }
	    writeBase(fd, buf, offset, length, position) {
	        const file = this.getFileByFdOrThrow(fd, 'write');
	        return file.write(buf, offset, length, position);
	    }
	    writeSync(fd, a, b, c, d) {
	        validateFd(fd);
	        let encoding;
	        let offset;
	        let length;
	        let position;
	        const isBuffer = typeof a !== 'string';
	        if (isBuffer) {
	            offset = (b || 0) | 0;
	            length = c;
	            position = d;
	        }
	        else {
	            position = b;
	            encoding = c;
	        }
	        const buf = dataToBuffer(a, encoding);
	        if (isBuffer) {
	            if (typeof length === 'undefined') {
	                length = buf.length;
	            }
	        }
	        else {
	            offset = 0;
	            length = buf.length;
	        }
	        return this.writeBase(fd, buf, offset, length, position);
	    }
	    write(fd, a, b, c, d, e) {
	        validateFd(fd);
	        let offset;
	        let length;
	        let position;
	        let encoding;
	        let callback;
	        const tipa = typeof a;
	        const tipb = typeof b;
	        const tipc = typeof c;
	        const tipd = typeof d;
	        if (tipa !== 'string') {
	            if (tipb === 'function') {
	                callback = b;
	            }
	            else if (tipc === 'function') {
	                offset = b | 0;
	                callback = c;
	            }
	            else if (tipd === 'function') {
	                offset = b | 0;
	                length = c;
	                callback = d;
	            }
	            else {
	                offset = b | 0;
	                length = c;
	                position = d;
	                callback = e;
	            }
	        }
	        else {
	            if (tipb === 'function') {
	                callback = b;
	            }
	            else if (tipc === 'function') {
	                position = b;
	                callback = c;
	            }
	            else if (tipd === 'function') {
	                position = b;
	                encoding = c;
	                callback = d;
	            }
	        }
	        const buf = dataToBuffer(a, encoding);
	        if (tipa !== 'string') {
	            if (typeof length === 'undefined')
	                length = buf.length;
	        }
	        else {
	            offset = 0;
	            length = buf.length;
	        }
	        const cb = validateCallback(callback);
	        (0, setImmediate_1.default)(() => {
	            try {
	                const bytes = this.writeBase(fd, buf, offset, length, position);
	                if (tipa !== 'string') {
	                    cb(null, bytes, buf);
	                }
	                else {
	                    cb(null, bytes, a);
	                }
	            }
	            catch (err) {
	                cb(err);
	            }
	        });
	    }
	    writeFileBase(id, buf, flagsNum, modeNum) {
	        // console.log('writeFileBase', id, buf, flagsNum, modeNum);
	        // const node = this.getNodeByIdOrCreate(id, flagsNum, modeNum);
	        // node.setBuffer(buf);
	        const isUserFd = typeof id === 'number';
	        let fd;
	        if (isUserFd)
	            fd = id;
	        else {
	            fd = this.openBase(pathToFilename(id), flagsNum, modeNum);
	            // fd = this.openSync(id as PathLike, flagsNum, modeNum);
	        }
	        let offset = 0;
	        let length = buf.length;
	        let position = flagsNum & O_APPEND ? undefined : 0;
	        try {
	            while (length > 0) {
	                const written = this.writeSync(fd, buf, offset, length, position);
	                offset += written;
	                length -= written;
	                if (position !== undefined)
	                    position += written;
	            }
	        }
	        finally {
	            if (!isUserFd)
	                this.closeSync(fd);
	        }
	    }
	    writeFileSync(id, data, options) {
	        const opts = getWriteFileOptions(options);
	        const flagsNum = flagsToNumber(opts.flag);
	        const modeNum = modeToNumber(opts.mode);
	        const buf = dataToBuffer(data, opts.encoding);
	        this.writeFileBase(id, buf, flagsNum, modeNum);
	    }
	    writeFile(id, data, a, b) {
	        let options = a;
	        let callback = b;
	        if (typeof a === 'function') {
	            options = writeFileDefaults;
	            callback = a;
	        }
	        const cb = validateCallback(callback);
	        const opts = getWriteFileOptions(options);
	        const flagsNum = flagsToNumber(opts.flag);
	        const modeNum = modeToNumber(opts.mode);
	        const buf = dataToBuffer(data, opts.encoding);
	        this.wrapAsync(this.writeFileBase, [id, buf, flagsNum, modeNum], cb);
	    }
	    linkBase(filename1, filename2) {
	        const steps1 = filenameToSteps(filename1);
	        const link1 = this.getLink(steps1);
	        if (!link1)
	            throw createError(ENOENT, 'link', filename1, filename2);
	        const steps2 = filenameToSteps(filename2);
	        // Check new link directory exists.
	        const dir2 = this.getLinkParent(steps2);
	        if (!dir2)
	            throw createError(ENOENT, 'link', filename1, filename2);
	        const name = steps2[steps2.length - 1];
	        // Check if new file already exists.
	        if (dir2.getChild(name))
	            throw createError(EEXIST, 'link', filename1, filename2);
	        const node = link1.getNode();
	        node.nlink++;
	        dir2.createChild(name, node);
	    }
	    copyFileBase(src, dest, flags) {
	        const buf = this.readFileSync(src);
	        if (flags & COPYFILE_EXCL) {
	            if (this.existsSync(dest)) {
	                throw createError(EEXIST, 'copyFile', src, dest);
	            }
	        }
	        if (flags & COPYFILE_FICLONE_FORCE) {
	            throw createError(ENOSYS, 'copyFile', src, dest);
	        }
	        this.writeFileBase(dest, buf, FLAGS.w, 438 /* MODE.DEFAULT */);
	    }
	    copyFileSync(src, dest, flags) {
	        const srcFilename = pathToFilename(src);
	        const destFilename = pathToFilename(dest);
	        return this.copyFileBase(srcFilename, destFilename, (flags || 0) | 0);
	    }
	    copyFile(src, dest, a, b) {
	        const srcFilename = pathToFilename(src);
	        const destFilename = pathToFilename(dest);
	        let flags;
	        let callback;
	        if (typeof a === 'function') {
	            flags = 0;
	            callback = a;
	        }
	        else {
	            flags = a;
	            callback = b;
	        }
	        validateCallback(callback);
	        this.wrapAsync(this.copyFileBase, [srcFilename, destFilename, flags], callback);
	    }
	    linkSync(existingPath, newPath) {
	        const existingPathFilename = pathToFilename(existingPath);
	        const newPathFilename = pathToFilename(newPath);
	        this.linkBase(existingPathFilename, newPathFilename);
	    }
	    link(existingPath, newPath, callback) {
	        const existingPathFilename = pathToFilename(existingPath);
	        const newPathFilename = pathToFilename(newPath);
	        this.wrapAsync(this.linkBase, [existingPathFilename, newPathFilename], callback);
	    }
	    unlinkBase(filename) {
	        const steps = filenameToSteps(filename);
	        const link = this.getLink(steps);
	        if (!link)
	            throw createError(ENOENT, 'unlink', filename);
	        // TODO: Check if it is file, dir, other...
	        if (link.length)
	            throw Error('Dir not empty...');
	        this.deleteLink(link);
	        const node = link.getNode();
	        node.nlink--;
	        // When all hard links to i-node are deleted, remove the i-node, too.
	        if (node.nlink <= 0) {
	            this.deleteNode(node);
	        }
	    }
	    unlinkSync(path) {
	        const filename = pathToFilename(path);
	        this.unlinkBase(filename);
	    }
	    unlink(path, callback) {
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.unlinkBase, [filename], callback);
	    }
	    symlinkBase(targetFilename, pathFilename) {
	        const pathSteps = filenameToSteps(pathFilename);
	        // Check if directory exists, where we about to create a symlink.
	        const dirLink = this.getLinkParent(pathSteps);
	        if (!dirLink)
	            throw createError(ENOENT, 'symlink', targetFilename, pathFilename);
	        const name = pathSteps[pathSteps.length - 1];
	        // Check if new file already exists.
	        if (dirLink.getChild(name))
	            throw createError(EEXIST, 'symlink', targetFilename, pathFilename);
	        // Create symlink.
	        const symlink = dirLink.createChild(name);
	        symlink.getNode().makeSymlink(filenameToSteps(targetFilename));
	        return symlink;
	    }
	    // `type` argument works only on Windows.
	    symlinkSync(target, path, type) {
	        const targetFilename = pathToFilename(target);
	        const pathFilename = pathToFilename(path);
	        this.symlinkBase(targetFilename, pathFilename);
	    }
	    symlink(target, path, a, b) {
	        const callback = validateCallback(typeof a === 'function' ? a : b);
	        const targetFilename = pathToFilename(target);
	        const pathFilename = pathToFilename(path);
	        this.wrapAsync(this.symlinkBase, [targetFilename, pathFilename], callback);
	    }
	    realpathBase(filename, encoding) {
	        const steps = filenameToSteps(filename);
	        const realLink = this.getResolvedLink(steps);
	        if (!realLink)
	            throw createError(ENOENT, 'realpath', filename);
	        return (0, encoding_1.strToEncoding)(realLink.getPath() || '/', encoding);
	    }
	    realpathSync(path, options) {
	        return this.realpathBase(pathToFilename(path), getRealpathOptions(options).encoding);
	    }
	    realpath(path, a, b) {
	        const [opts, callback] = getRealpathOptsAndCb(a, b);
	        const pathFilename = pathToFilename(path);
	        this.wrapAsync(this.realpathBase, [pathFilename, opts.encoding], callback);
	    }
	    lstatBase(filename, bigint = false, throwIfNoEntry = false) {
	        const link = this.getLink(filenameToSteps(filename));
	        if (link) {
	            return Stats_1.default.build(link.getNode(), bigint);
	        }
	        else if (!throwIfNoEntry) {
	            return undefined;
	        }
	        else {
	            throw createError(ENOENT, 'lstat', filename);
	        }
	    }
	    lstatSync(path, options) {
	        const { throwIfNoEntry = true, bigint = false } = getStatOptions(options);
	        return this.lstatBase(pathToFilename(path), bigint, throwIfNoEntry);
	    }
	    lstat(path, a, b) {
	        const [{ throwIfNoEntry = true, bigint = false }, callback] = getStatOptsAndCb(a, b);
	        this.wrapAsync(this.lstatBase, [pathToFilename(path), bigint, throwIfNoEntry], callback);
	    }
	    statBase(filename, bigint = false, throwIfNoEntry = true) {
	        const link = this.getResolvedLink(filenameToSteps(filename));
	        if (link) {
	            return Stats_1.default.build(link.getNode(), bigint);
	        }
	        else if (!throwIfNoEntry) {
	            return undefined;
	        }
	        else {
	            throw createError(ENOENT, 'stat', filename);
	        }
	    }
	    statSync(path, options) {
	        const { bigint = true, throwIfNoEntry = true } = getStatOptions(options);
	        return this.statBase(pathToFilename(path), bigint, throwIfNoEntry);
	    }
	    stat(path, a, b) {
	        const [{ bigint = false, throwIfNoEntry = true }, callback] = getStatOptsAndCb(a, b);
	        this.wrapAsync(this.statBase, [pathToFilename(path), bigint, throwIfNoEntry], callback);
	    }
	    fstatBase(fd, bigint = false) {
	        const file = this.getFileByFd(fd);
	        if (!file)
	            throw createError(EBADF, 'fstat');
	        return Stats_1.default.build(file.node, bigint);
	    }
	    fstatSync(fd, options) {
	        return this.fstatBase(fd, getStatOptions(options).bigint);
	    }
	    fstat(fd, a, b) {
	        const [opts, callback] = getStatOptsAndCb(a, b);
	        this.wrapAsync(this.fstatBase, [fd, opts.bigint], callback);
	    }
	    renameBase(oldPathFilename, newPathFilename) {
	        const link = this.getLink(filenameToSteps(oldPathFilename));
	        if (!link)
	            throw createError(ENOENT, 'rename', oldPathFilename, newPathFilename);
	        // TODO: Check if it is directory, if non-empty, we cannot move it, right?
	        const newPathSteps = filenameToSteps(newPathFilename);
	        // Check directory exists for the new location.
	        const newPathDirLink = this.getLinkParent(newPathSteps);
	        if (!newPathDirLink)
	            throw createError(ENOENT, 'rename', oldPathFilename, newPathFilename);
	        // TODO: Also treat cases with directories and symbolic links.
	        // TODO: See: http://man7.org/linux/man-pages/man2/rename.2.html
	        // Remove hard link from old folder.
	        const oldLinkParent = link.parent;
	        if (oldLinkParent) {
	            oldLinkParent.deleteChild(link);
	        }
	        // Rename should overwrite the new path, if that exists.
	        const name = newPathSteps[newPathSteps.length - 1];
	        link.name = name;
	        link.steps = [...newPathDirLink.steps, name];
	        newPathDirLink.setChild(link.getName(), link);
	    }
	    renameSync(oldPath, newPath) {
	        const oldPathFilename = pathToFilename(oldPath);
	        const newPathFilename = pathToFilename(newPath);
	        this.renameBase(oldPathFilename, newPathFilename);
	    }
	    rename(oldPath, newPath, callback) {
	        const oldPathFilename = pathToFilename(oldPath);
	        const newPathFilename = pathToFilename(newPath);
	        this.wrapAsync(this.renameBase, [oldPathFilename, newPathFilename], callback);
	    }
	    existsBase(filename) {
	        return !!this.statBase(filename);
	    }
	    existsSync(path) {
	        try {
	            return this.existsBase(pathToFilename(path));
	        }
	        catch (err) {
	            return false;
	        }
	    }
	    exists(path, callback) {
	        const filename = pathToFilename(path);
	        if (typeof callback !== 'function')
	            throw Error(ERRSTR.CB);
	        (0, setImmediate_1.default)(() => {
	            try {
	                callback(this.existsBase(filename));
	            }
	            catch (err) {
	                callback(false);
	            }
	        });
	    }
	    accessBase(filename, mode) {
	        this.getLinkOrThrow(filename, 'access');
	        // TODO: Verify permissions
	    }
	    accessSync(path, mode = F_OK) {
	        const filename = pathToFilename(path);
	        mode = mode | 0;
	        this.accessBase(filename, mode);
	    }
	    access(path, a, b) {
	        let mode = F_OK;
	        let callback;
	        if (typeof a !== 'function') {
	            mode = a | 0; // cast to number
	            callback = validateCallback(b);
	        }
	        else {
	            callback = a;
	        }
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.accessBase, [filename, mode], callback);
	    }
	    appendFileSync(id, data, options = appendFileDefaults) {
	        const opts = getAppendFileOpts(options);
	        // force append behavior when using a supplied file descriptor
	        if (!opts.flag || isFd(id))
	            opts.flag = 'a';
	        this.writeFileSync(id, data, opts);
	    }
	    appendFile(id, data, a, b) {
	        const [opts, callback] = getAppendFileOptsAndCb(a, b);
	        // force append behavior when using a supplied file descriptor
	        if (!opts.flag || isFd(id))
	            opts.flag = 'a';
	        this.writeFile(id, data, opts, callback);
	    }
	    readdirBase(filename, options) {
	        const steps = filenameToSteps(filename);
	        const link = this.getResolvedLink(steps);
	        if (!link)
	            throw createError(ENOENT, 'readdir', filename);
	        const node = link.getNode();
	        if (!node.isDirectory())
	            throw createError(ENOTDIR, 'scandir', filename);
	        if (options.withFileTypes) {
	            const list = [];
	            for (const name in link.children) {
	                const child = link.getChild(name);
	                if (!child || name === '.' || name === '..') {
	                    continue;
	                }
	                list.push(Dirent_1.default.build(child, options.encoding));
	            }
	            if (!isWin && options.encoding !== 'buffer')
	                list.sort((a, b) => {
	                    if (a.name < b.name)
	                        return -1;
	                    if (a.name > b.name)
	                        return 1;
	                    return 0;
	                });
	            return list;
	        }
	        const list = [];
	        for (const name in link.children) {
	            if (name === '.' || name === '..') {
	                continue;
	            }
	            list.push((0, encoding_1.strToEncoding)(name, options.encoding));
	        }
	        if (!isWin && options.encoding !== 'buffer')
	            list.sort();
	        return list;
	    }
	    readdirSync(path, options) {
	        const opts = getReaddirOptions(options);
	        const filename = pathToFilename(path);
	        return this.readdirBase(filename, opts);
	    }
	    readdir(path, a, b) {
	        const [options, callback] = getReaddirOptsAndCb(a, b);
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.readdirBase, [filename, options], callback);
	    }
	    readlinkBase(filename, encoding) {
	        const link = this.getLinkOrThrow(filename, 'readlink');
	        const node = link.getNode();
	        if (!node.isSymlink())
	            throw createError(EINVAL, 'readlink', filename);
	        const str = sep + node.symlink.join(sep);
	        return (0, encoding_1.strToEncoding)(str, encoding);
	    }
	    readlinkSync(path, options) {
	        const opts = getDefaultOpts(options);
	        const filename = pathToFilename(path);
	        return this.readlinkBase(filename, opts.encoding);
	    }
	    readlink(path, a, b) {
	        const [opts, callback] = getDefaultOptsAndCb(a, b);
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.readlinkBase, [filename, opts.encoding], callback);
	    }
	    fsyncBase(fd) {
	        this.getFileByFdOrThrow(fd, 'fsync');
	    }
	    fsyncSync(fd) {
	        this.fsyncBase(fd);
	    }
	    fsync(fd, callback) {
	        this.wrapAsync(this.fsyncBase, [fd], callback);
	    }
	    fdatasyncBase(fd) {
	        this.getFileByFdOrThrow(fd, 'fdatasync');
	    }
	    fdatasyncSync(fd) {
	        this.fdatasyncBase(fd);
	    }
	    fdatasync(fd, callback) {
	        this.wrapAsync(this.fdatasyncBase, [fd], callback);
	    }
	    ftruncateBase(fd, len) {
	        const file = this.getFileByFdOrThrow(fd, 'ftruncate');
	        file.truncate(len);
	    }
	    ftruncateSync(fd, len) {
	        this.ftruncateBase(fd, len);
	    }
	    ftruncate(fd, a, b) {
	        const len = typeof a === 'number' ? a : 0;
	        const callback = validateCallback(typeof a === 'number' ? b : a);
	        this.wrapAsync(this.ftruncateBase, [fd, len], callback);
	    }
	    truncateBase(path, len) {
	        const fd = this.openSync(path, 'r+');
	        try {
	            this.ftruncateSync(fd, len);
	        }
	        finally {
	            this.closeSync(fd);
	        }
	    }
	    truncateSync(id, len) {
	        if (isFd(id))
	            return this.ftruncateSync(id, len);
	        this.truncateBase(id, len);
	    }
	    truncate(id, a, b) {
	        const len = typeof a === 'number' ? a : 0;
	        const callback = validateCallback(typeof a === 'number' ? b : a);
	        if (isFd(id))
	            return this.ftruncate(id, len, callback);
	        this.wrapAsync(this.truncateBase, [id, len], callback);
	    }
	    futimesBase(fd, atime, mtime) {
	        const file = this.getFileByFdOrThrow(fd, 'futimes');
	        const node = file.node;
	        node.atime = new Date(atime * 1000);
	        node.mtime = new Date(mtime * 1000);
	    }
	    futimesSync(fd, atime, mtime) {
	        this.futimesBase(fd, toUnixTimestamp(atime), toUnixTimestamp(mtime));
	    }
	    futimes(fd, atime, mtime, callback) {
	        this.wrapAsync(this.futimesBase, [fd, toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
	    }
	    utimesBase(filename, atime, mtime) {
	        const fd = this.openSync(filename, 'r');
	        try {
	            this.futimesBase(fd, atime, mtime);
	        }
	        finally {
	            this.closeSync(fd);
	        }
	    }
	    utimesSync(path, atime, mtime) {
	        this.utimesBase(pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime));
	    }
	    utimes(path, atime, mtime, callback) {
	        this.wrapAsync(this.utimesBase, [pathToFilename(path), toUnixTimestamp(atime), toUnixTimestamp(mtime)], callback);
	    }
	    mkdirBase(filename, modeNum) {
	        const steps = filenameToSteps(filename);
	        // This will throw if user tries to create root dir `fs.mkdirSync('/')`.
	        if (!steps.length) {
	            throw createError(EEXIST, 'mkdir', filename);
	        }
	        const dir = this.getLinkParentAsDirOrThrow(filename, 'mkdir');
	        // Check path already exists.
	        const name = steps[steps.length - 1];
	        if (dir.getChild(name))
	            throw createError(EEXIST, 'mkdir', filename);
	        dir.createChild(name, this.createNode(true, modeNum));
	    }
	    /**
	     * Creates directory tree recursively.
	     * @param filename
	     * @param modeNum
	     */
	    mkdirpBase(filename, modeNum) {
	        const fullPath = resolve(filename);
	        const fullPathSansSlash = fullPath.substring(1);
	        const steps = !fullPathSansSlash ? [] : fullPathSansSlash.split(sep);
	        let link = this.root;
	        let created = false;
	        for (let i = 0; i < steps.length; i++) {
	            const step = steps[i];
	            if (!link.getNode().isDirectory())
	                throw createError(ENOTDIR, 'mkdir', link.getPath());
	            const child = link.getChild(step);
	            if (child) {
	                if (child.getNode().isDirectory())
	                    link = child;
	                else
	                    throw createError(ENOTDIR, 'mkdir', child.getPath());
	            }
	            else {
	                link = link.createChild(step, this.createNode(true, modeNum));
	                created = true;
	            }
	        }
	        return created ? fullPath : undefined;
	    }
	    mkdirSync(path, options) {
	        const opts = getMkdirOptions(options);
	        const modeNum = modeToNumber(opts.mode, 0o777);
	        const filename = pathToFilename(path);
	        if (opts.recursive)
	            return this.mkdirpBase(filename, modeNum);
	        this.mkdirBase(filename, modeNum);
	    }
	    mkdir(path, a, b) {
	        const opts = getMkdirOptions(a);
	        const callback = validateCallback(typeof a === 'function' ? a : b);
	        const modeNum = modeToNumber(opts.mode, 0o777);
	        const filename = pathToFilename(path);
	        if (opts.recursive)
	            this.wrapAsync(this.mkdirpBase, [filename, modeNum], callback);
	        else
	            this.wrapAsync(this.mkdirBase, [filename, modeNum], callback);
	    }
	    // legacy interface
	    mkdirpSync(path, mode) {
	        return this.mkdirSync(path, { mode, recursive: true });
	    }
	    mkdirp(path, a, b) {
	        const mode = typeof a === 'function' ? undefined : a;
	        const callback = validateCallback(typeof a === 'function' ? a : b);
	        this.mkdir(path, { mode, recursive: true }, callback);
	    }
	    mkdtempBase(prefix, encoding, retry = 5) {
	        const filename = prefix + this.genRndStr();
	        try {
	            this.mkdirBase(filename, 511 /* MODE.DIR */);
	            return (0, encoding_1.strToEncoding)(filename, encoding);
	        }
	        catch (err) {
	            if (err.code === EEXIST) {
	                if (retry > 1)
	                    return this.mkdtempBase(prefix, encoding, retry - 1);
	                else
	                    throw Error('Could not create temp dir.');
	            }
	            else
	                throw err;
	        }
	    }
	    mkdtempSync(prefix, options) {
	        const { encoding } = getDefaultOpts(options);
	        if (!prefix || typeof prefix !== 'string')
	            throw new TypeError('filename prefix is required');
	        nullCheck(prefix);
	        return this.mkdtempBase(prefix, encoding);
	    }
	    mkdtemp(prefix, a, b) {
	        const [{ encoding }, callback] = getDefaultOptsAndCb(a, b);
	        if (!prefix || typeof prefix !== 'string')
	            throw new TypeError('filename prefix is required');
	        if (!nullCheck(prefix))
	            return;
	        this.wrapAsync(this.mkdtempBase, [prefix, encoding], callback);
	    }
	    rmdirBase(filename, options) {
	        const opts = getRmdirOptions(options);
	        const link = this.getLinkAsDirOrThrow(filename, 'rmdir');
	        // Check directory is empty.
	        if (link.length && !opts.recursive)
	            throw createError(ENOTEMPTY, 'rmdir', filename);
	        this.deleteLink(link);
	    }
	    rmdirSync(path, options) {
	        this.rmdirBase(pathToFilename(path), options);
	    }
	    rmdir(path, a, b) {
	        const opts = getRmdirOptions(a);
	        const callback = validateCallback(typeof a === 'function' ? a : b);
	        this.wrapAsync(this.rmdirBase, [pathToFilename(path), opts], callback);
	    }
	    rmBase(filename, options = {}) {
	        const link = this.getResolvedLink(filename);
	        if (!link) {
	            // "stat" is used to match Node's native error message.
	            if (!options.force)
	                throw createError(ENOENT, 'stat', filename);
	            return;
	        }
	        if (link.getNode().isDirectory()) {
	            if (!options.recursive) {
	                throw createError(ERR_FS_EISDIR, 'rm', filename);
	            }
	        }
	        this.deleteLink(link);
	    }
	    rmSync(path, options) {
	        this.rmBase(pathToFilename(path), options);
	    }
	    rm(path, a, b) {
	        const [opts, callback] = getRmOptsAndCb(a, b);
	        this.wrapAsync(this.rmBase, [pathToFilename(path), opts], callback);
	    }
	    fchmodBase(fd, modeNum) {
	        const file = this.getFileByFdOrThrow(fd, 'fchmod');
	        file.chmod(modeNum);
	    }
	    fchmodSync(fd, mode) {
	        this.fchmodBase(fd, modeToNumber(mode));
	    }
	    fchmod(fd, mode, callback) {
	        this.wrapAsync(this.fchmodBase, [fd, modeToNumber(mode)], callback);
	    }
	    chmodBase(filename, modeNum) {
	        const fd = this.openSync(filename, 'r');
	        try {
	            this.fchmodBase(fd, modeNum);
	        }
	        finally {
	            this.closeSync(fd);
	        }
	    }
	    chmodSync(path, mode) {
	        const modeNum = modeToNumber(mode);
	        const filename = pathToFilename(path);
	        this.chmodBase(filename, modeNum);
	    }
	    chmod(path, mode, callback) {
	        const modeNum = modeToNumber(mode);
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.chmodBase, [filename, modeNum], callback);
	    }
	    lchmodBase(filename, modeNum) {
	        const fd = this.openBase(filename, O_RDWR, 0, false);
	        try {
	            this.fchmodBase(fd, modeNum);
	        }
	        finally {
	            this.closeSync(fd);
	        }
	    }
	    lchmodSync(path, mode) {
	        const modeNum = modeToNumber(mode);
	        const filename = pathToFilename(path);
	        this.lchmodBase(filename, modeNum);
	    }
	    lchmod(path, mode, callback) {
	        const modeNum = modeToNumber(mode);
	        const filename = pathToFilename(path);
	        this.wrapAsync(this.lchmodBase, [filename, modeNum], callback);
	    }
	    fchownBase(fd, uid, gid) {
	        this.getFileByFdOrThrow(fd, 'fchown').chown(uid, gid);
	    }
	    fchownSync(fd, uid, gid) {
	        validateUid(uid);
	        validateGid(gid);
	        this.fchownBase(fd, uid, gid);
	    }
	    fchown(fd, uid, gid, callback) {
	        validateUid(uid);
	        validateGid(gid);
	        this.wrapAsync(this.fchownBase, [fd, uid, gid], callback);
	    }
	    chownBase(filename, uid, gid) {
	        const link = this.getResolvedLinkOrThrow(filename, 'chown');
	        const node = link.getNode();
	        node.chown(uid, gid);
	        // if(node.isFile() || node.isSymlink()) {
	        //
	        // } else if(node.isDirectory()) {
	        //
	        // } else {
	        // TODO: What do we do here?
	        // }
	    }
	    chownSync(path, uid, gid) {
	        validateUid(uid);
	        validateGid(gid);
	        this.chownBase(pathToFilename(path), uid, gid);
	    }
	    chown(path, uid, gid, callback) {
	        validateUid(uid);
	        validateGid(gid);
	        this.wrapAsync(this.chownBase, [pathToFilename(path), uid, gid], callback);
	    }
	    lchownBase(filename, uid, gid) {
	        this.getLinkOrThrow(filename, 'lchown').getNode().chown(uid, gid);
	    }
	    lchownSync(path, uid, gid) {
	        validateUid(uid);
	        validateGid(gid);
	        this.lchownBase(pathToFilename(path), uid, gid);
	    }
	    lchown(path, uid, gid, callback) {
	        validateUid(uid);
	        validateGid(gid);
	        this.wrapAsync(this.lchownBase, [pathToFilename(path), uid, gid], callback);
	    }
	    watchFile(path, a, b) {
	        const filename = pathToFilename(path);
	        let options = a;
	        let listener = b;
	        if (typeof options === 'function') {
	            listener = a;
	            options = null;
	        }
	        if (typeof listener !== 'function') {
	            throw Error('"watchFile()" requires a listener function');
	        }
	        let interval = 5007;
	        let persistent = true;
	        if (options && typeof options === 'object') {
	            if (typeof options.interval === 'number')
	                interval = options.interval;
	            if (typeof options.persistent === 'boolean')
	                persistent = options.persistent;
	        }
	        let watcher = this.statWatchers[filename];
	        if (!watcher) {
	            watcher = new this.StatWatcher();
	            watcher.start(filename, persistent, interval);
	            this.statWatchers[filename] = watcher;
	        }
	        watcher.addListener('change', listener);
	        return watcher;
	    }
	    unwatchFile(path, listener) {
	        const filename = pathToFilename(path);
	        const watcher = this.statWatchers[filename];
	        if (!watcher)
	            return;
	        if (typeof listener === 'function') {
	            watcher.removeListener('change', listener);
	        }
	        else {
	            watcher.removeAllListeners('change');
	        }
	        if (watcher.listenerCount('change') === 0) {
	            watcher.stop();
	            delete this.statWatchers[filename];
	        }
	    }
	    createReadStream(path, options) {
	        return new this.ReadStream(path, options);
	    }
	    createWriteStream(path, options) {
	        return new this.WriteStream(path, options);
	    }
	    // watch(path: PathLike): FSWatcher;
	    // watch(path: PathLike, options?: IWatchOptions | string): FSWatcher;
	    watch(path, options, listener) {
	        const filename = pathToFilename(path);
	        let givenOptions = options;
	        if (typeof options === 'function') {
	            listener = options;
	            givenOptions = null;
	        }
	        // tslint:disable-next-line prefer-const
	        let { persistent, recursive, encoding } = getDefaultOpts(givenOptions);
	        if (persistent === undefined)
	            persistent = true;
	        if (recursive === undefined)
	            recursive = false;
	        const watcher = new this.FSWatcher();
	        watcher.start(filename, persistent, recursive, encoding);
	        if (listener) {
	            watcher.addListener('change', listener);
	        }
	        return watcher;
	    }
	}
	exports.Volume = Volume;
	/**
	 * Global file descriptor counter. UNIX file descriptors start from 0 and go sequentially
	 * up, so here, in order not to conflict with them, we choose some big number and descrease
	 * the file descriptor of every new opened file.
	 * @type {number}
	 * @todo This should not be static, right?
	 */
	Volume.fd = 0x7fffffff;
	function emitStop(self) {
	    self.emit('stop');
	}
	class StatWatcher extends events_1.EventEmitter {
	    constructor(vol) {
	        super();
	        this.onInterval = () => {
	            try {
	                const stats = this.vol.statSync(this.filename);
	                if (this.hasChanged(stats)) {
	                    this.emit('change', stats, this.prev);
	                    this.prev = stats;
	                }
	            }
	            finally {
	                this.loop();
	            }
	        };
	        this.vol = vol;
	    }
	    loop() {
	        this.timeoutRef = this.setTimeout(this.onInterval, this.interval);
	    }
	    hasChanged(stats) {
	        // if(!this.prev) return false;
	        if (stats.mtimeMs > this.prev.mtimeMs)
	            return true;
	        if (stats.nlink !== this.prev.nlink)
	            return true;
	        return false;
	    }
	    start(path, persistent = true, interval = 5007) {
	        this.filename = pathToFilename(path);
	        this.setTimeout = persistent
	            ? setTimeout.bind(typeof globalThis !== 'undefined' ? globalThis : commonjsGlobal)
	            : setTimeoutUnref_1.default;
	        this.interval = interval;
	        this.prev = this.vol.statSync(this.filename);
	        this.loop();
	    }
	    stop() {
	        clearTimeout(this.timeoutRef);
	        process_1.default.nextTick(emitStop, this);
	    }
	}
	exports.StatWatcher = StatWatcher;
	var pool;
	function allocNewPool(poolSize) {
	    pool = (0, buffer_1.bufferAllocUnsafe)(poolSize);
	    pool.used = 0;
	}
	util.inherits(FsReadStream, stream_1.Readable);
	exports.ReadStream = FsReadStream;
	function FsReadStream(vol, path, options) {
	    if (!(this instanceof FsReadStream))
	        return new FsReadStream(vol, path, options);
	    this._vol = vol;
	    // a little bit bigger buffer and water marks by default
	    options = Object.assign({}, getOptions(options, {}));
	    if (options.highWaterMark === undefined)
	        options.highWaterMark = 64 * 1024;
	    stream_1.Readable.call(this, options);
	    this.path = pathToFilename(path);
	    this.fd = options.fd === undefined ? null : options.fd;
	    this.flags = options.flags === undefined ? 'r' : options.flags;
	    this.mode = options.mode === undefined ? 0o666 : options.mode;
	    this.start = options.start;
	    this.end = options.end;
	    this.autoClose = options.autoClose === undefined ? true : options.autoClose;
	    this.pos = undefined;
	    this.bytesRead = 0;
	    if (this.start !== undefined) {
	        if (typeof this.start !== 'number') {
	            throw new TypeError('"start" option must be a Number');
	        }
	        if (this.end === undefined) {
	            this.end = Infinity;
	        }
	        else if (typeof this.end !== 'number') {
	            throw new TypeError('"end" option must be a Number');
	        }
	        if (this.start > this.end) {
	            throw new Error('"start" option must be <= "end" option');
	        }
	        this.pos = this.start;
	    }
	    if (typeof this.fd !== 'number')
	        this.open();
	    this.on('end', function () {
	        if (this.autoClose) {
	            if (this.destroy)
	                this.destroy();
	        }
	    });
	}
	FsReadStream.prototype.open = function () {
	    var self = this; // tslint:disable-line no-this-assignment
	    this._vol.open(this.path, this.flags, this.mode, (er, fd) => {
	        if (er) {
	            if (self.autoClose) {
	                if (self.destroy)
	                    self.destroy();
	            }
	            self.emit('error', er);
	            return;
	        }
	        self.fd = fd;
	        self.emit('open', fd);
	        // start the flow of data.
	        self.read();
	    });
	};
	FsReadStream.prototype._read = function (n) {
	    if (typeof this.fd !== 'number') {
	        return this.once('open', function () {
	            this._read(n);
	        });
	    }
	    if (this.destroyed)
	        return;
	    if (!pool || pool.length - pool.used < kMinPoolSpace) {
	        // discard the old pool.
	        allocNewPool(this._readableState.highWaterMark);
	    }
	    // Grab another reference to the pool in the case that while we're
	    // in the thread pool another read() finishes up the pool, and
	    // allocates a new one.
	    var thisPool = pool;
	    var toRead = Math.min(pool.length - pool.used, n);
	    var start = pool.used;
	    if (this.pos !== undefined)
	        toRead = Math.min(this.end - this.pos + 1, toRead);
	    // already read everything we were supposed to read!
	    // treat as EOF.
	    if (toRead <= 0)
	        return this.push(null);
	    // the actual read.
	    var self = this; // tslint:disable-line no-this-assignment
	    this._vol.read(this.fd, pool, pool.used, toRead, this.pos, onread);
	    // move the pool positions, and internal position for reading.
	    if (this.pos !== undefined)
	        this.pos += toRead;
	    pool.used += toRead;
	    function onread(er, bytesRead) {
	        if (er) {
	            if (self.autoClose && self.destroy) {
	                self.destroy();
	            }
	            self.emit('error', er);
	        }
	        else {
	            var b = null;
	            if (bytesRead > 0) {
	                self.bytesRead += bytesRead;
	                b = thisPool.slice(start, start + bytesRead);
	            }
	            self.push(b);
	        }
	    }
	};
	FsReadStream.prototype._destroy = function (err, cb) {
	    this.close(err2 => {
	        cb(err || err2);
	    });
	};
	FsReadStream.prototype.close = function (cb) {
	    var _a;
	    if (cb)
	        this.once('close', cb);
	    if (this.closed || typeof this.fd !== 'number') {
	        if (typeof this.fd !== 'number') {
	            this.once('open', closeOnOpen);
	            return;
	        }
	        return process_1.default.nextTick(() => this.emit('close'));
	    }
	    // Since Node 18, there is only a getter for '.closed'.
	    // The first branch mimics other setters from Readable.
	    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/readable.js#L1243
	    if (typeof ((_a = this._readableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
	        this._readableState.closed = true;
	    }
	    else {
	        this.closed = true;
	    }
	    this._vol.close(this.fd, er => {
	        if (er)
	            this.emit('error', er);
	        else
	            this.emit('close');
	    });
	    this.fd = null;
	};
	// needed because as it will be called with arguments
	// that does not match this.close() signature
	function closeOnOpen(fd) {
	    this.close();
	}
	util.inherits(FsWriteStream, stream_1.Writable);
	exports.WriteStream = FsWriteStream;
	function FsWriteStream(vol, path, options) {
	    if (!(this instanceof FsWriteStream))
	        return new FsWriteStream(vol, path, options);
	    this._vol = vol;
	    options = Object.assign({}, getOptions(options, {}));
	    stream_1.Writable.call(this, options);
	    this.path = pathToFilename(path);
	    this.fd = options.fd === undefined ? null : options.fd;
	    this.flags = options.flags === undefined ? 'w' : options.flags;
	    this.mode = options.mode === undefined ? 0o666 : options.mode;
	    this.start = options.start;
	    this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
	    this.pos = undefined;
	    this.bytesWritten = 0;
	    if (this.start !== undefined) {
	        if (typeof this.start !== 'number') {
	            throw new TypeError('"start" option must be a Number');
	        }
	        if (this.start < 0) {
	            throw new Error('"start" must be >= zero');
	        }
	        this.pos = this.start;
	    }
	    if (options.encoding)
	        this.setDefaultEncoding(options.encoding);
	    if (typeof this.fd !== 'number')
	        this.open();
	    // dispose on finish.
	    this.once('finish', function () {
	        if (this.autoClose) {
	            this.close();
	        }
	    });
	}
	FsWriteStream.prototype.open = function () {
	    this._vol.open(this.path, this.flags, this.mode, function (er, fd) {
	        if (er) {
	            if (this.autoClose && this.destroy) {
	                this.destroy();
	            }
	            this.emit('error', er);
	            return;
	        }
	        this.fd = fd;
	        this.emit('open', fd);
	    }.bind(this));
	};
	FsWriteStream.prototype._write = function (data, encoding, cb) {
	    if (!(data instanceof buffer_1.Buffer || data instanceof Uint8Array))
	        return this.emit('error', new Error('Invalid data'));
	    if (typeof this.fd !== 'number') {
	        return this.once('open', function () {
	            this._write(data, encoding, cb);
	        });
	    }
	    var self = this; // tslint:disable-line no-this-assignment
	    this._vol.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
	        if (er) {
	            if (self.autoClose && self.destroy) {
	                self.destroy();
	            }
	            return cb(er);
	        }
	        self.bytesWritten += bytes;
	        cb();
	    });
	    if (this.pos !== undefined)
	        this.pos += data.length;
	};
	FsWriteStream.prototype._writev = function (data, cb) {
	    if (typeof this.fd !== 'number') {
	        return this.once('open', function () {
	            this._writev(data, cb);
	        });
	    }
	    const self = this; // tslint:disable-line no-this-assignment
	    const len = data.length;
	    const chunks = new Array(len);
	    var size = 0;
	    for (var i = 0; i < len; i++) {
	        var chunk = data[i].chunk;
	        chunks[i] = chunk;
	        size += chunk.length;
	    }
	    const buf = buffer_1.Buffer.concat(chunks);
	    this._vol.write(this.fd, buf, 0, buf.length, this.pos, (er, bytes) => {
	        if (er) {
	            if (self.destroy)
	                self.destroy();
	            return cb(er);
	        }
	        self.bytesWritten += bytes;
	        cb();
	    });
	    if (this.pos !== undefined)
	        this.pos += size;
	};
	FsWriteStream.prototype.close = function (cb) {
	    var _a;
	    if (cb)
	        this.once('close', cb);
	    if (this.closed || typeof this.fd !== 'number') {
	        if (typeof this.fd !== 'number') {
	            this.once('open', closeOnOpen);
	            return;
	        }
	        return process_1.default.nextTick(() => this.emit('close'));
	    }
	    // Since Node 18, there is only a getter for '.closed'.
	    // The first branch mimics other setters from Writable.
	    // See https://github.com/nodejs/node/blob/v18.0.0/lib/internal/streams/writable.js#L766
	    if (typeof ((_a = this._writableState) === null || _a === void 0 ? void 0 : _a.closed) === 'boolean') {
	        this._writableState.closed = true;
	    }
	    else {
	        this.closed = true;
	    }
	    this._vol.close(this.fd, er => {
	        if (er)
	            this.emit('error', er);
	        else
	            this.emit('close');
	    });
	    this.fd = null;
	};
	FsWriteStream.prototype._destroy = FsReadStream.prototype._destroy;
	// There is no shutdown() for files.
	FsWriteStream.prototype.destroySoon = FsWriteStream.prototype.end;
	// ---------------------------------------- FSWatcher
	class FSWatcher extends events_1.EventEmitter {
	    constructor(vol) {
	        super();
	        this._filename = '';
	        this._filenameEncoded = '';
	        // _persistent: boolean = true;
	        this._recursive = false;
	        this._encoding = encoding_1.ENCODING_UTF8;
	        // inode -> removers
	        this._listenerRemovers = new Map();
	        this._onParentChild = (link) => {
	            if (link.getName() === this._getName()) {
	                this._emit('rename');
	            }
	        };
	        this._emit = (type) => {
	            this.emit('change', type, this._filenameEncoded);
	        };
	        this._persist = () => {
	            this._timer = setTimeout(this._persist, 1e6);
	        };
	        this._vol = vol;
	        // TODO: Emit "error" messages when watching.
	        // this._handle.onchange = function(status, eventType, filename) {
	        //     if (status < 0) {
	        //         self._handle.close();
	        //         const error = !filename ?
	        //             errnoException(status, 'Error watching file for changes:') :
	        //             errnoException(status, `Error watching file ${filename} for changes:`);
	        //         error.filename = filename;
	        //         self.emit('error', error);
	        //     } else {
	        //         self.emit('change', eventType, filename);
	        //     }
	        // };
	    }
	    _getName() {
	        return this._steps[this._steps.length - 1];
	    }
	    start(path, persistent = true, recursive = false, encoding = encoding_1.ENCODING_UTF8) {
	        this._filename = pathToFilename(path);
	        this._steps = filenameToSteps(this._filename);
	        this._filenameEncoded = (0, encoding_1.strToEncoding)(this._filename);
	        // this._persistent = persistent;
	        this._recursive = recursive;
	        this._encoding = encoding;
	        try {
	            this._link = this._vol.getLinkOrThrow(this._filename, 'FSWatcher');
	        }
	        catch (err) {
	            const error = new Error(`watch ${this._filename} ${err.code}`);
	            error.code = err.code;
	            error.errno = err.code;
	            throw error;
	        }
	        const watchLinkNodeChanged = (link) => {
	            var _a;
	            const filepath = link.getPath();
	            const node = link.getNode();
	            const onNodeChange = () => {
	                let filename = relative(this._filename, filepath);
	                if (!filename) {
	                    filename = this._getName();
	                }
	                return this.emit('change', 'change', filename);
	            };
	            node.on('change', onNodeChange);
	            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
	            removers.push(() => node.removeListener('change', onNodeChange));
	            this._listenerRemovers.set(node.ino, removers);
	        };
	        const watchLinkChildrenChanged = (link) => {
	            var _a;
	            const node = link.getNode();
	            // when a new link added
	            const onLinkChildAdd = (l) => {
	                this.emit('change', 'rename', relative(this._filename, l.getPath()));
	                setTimeout(() => {
	                    // 1. watch changes of the new link-node
	                    watchLinkNodeChanged(l);
	                    // 2. watch changes of the new link-node's children
	                    watchLinkChildrenChanged(l);
	                });
	            };
	            // when a new link deleted
	            const onLinkChildDelete = (l) => {
	                // remove the listeners of the children nodes
	                const removeLinkNodeListeners = (curLink) => {
	                    const ino = curLink.getNode().ino;
	                    const removers = this._listenerRemovers.get(ino);
	                    if (removers) {
	                        removers.forEach(r => r());
	                        this._listenerRemovers.delete(ino);
	                    }
	                    Object.values(curLink.children).forEach(childLink => {
	                        if (childLink) {
	                            removeLinkNodeListeners(childLink);
	                        }
	                    });
	                };
	                removeLinkNodeListeners(l);
	                this.emit('change', 'rename', relative(this._filename, l.getPath()));
	            };
	            // children nodes changed
	            Object.entries(link.children).forEach(([name, childLink]) => {
	                if (childLink && name !== '.' && name !== '..') {
	                    watchLinkNodeChanged(childLink);
	                }
	            });
	            // link children add/remove
	            link.on('child:add', onLinkChildAdd);
	            link.on('child:delete', onLinkChildDelete);
	            const removers = (_a = this._listenerRemovers.get(node.ino)) !== null && _a !== void 0 ? _a : [];
	            removers.push(() => {
	                link.removeListener('child:add', onLinkChildAdd);
	                link.removeListener('child:delete', onLinkChildDelete);
	            });
	            if (recursive) {
	                Object.entries(link.children).forEach(([name, childLink]) => {
	                    if (childLink && name !== '.' && name !== '..') {
	                        watchLinkChildrenChanged(childLink);
	                    }
	                });
	            }
	        };
	        watchLinkNodeChanged(this._link);
	        watchLinkChildrenChanged(this._link);
	        const parent = this._link.parent;
	        if (parent) {
	            // parent.on('child:add', this._onParentChild);
	            parent.setMaxListeners(parent.getMaxListeners() + 1);
	            parent.on('child:delete', this._onParentChild);
	        }
	        if (persistent)
	            this._persist();
	    }
	    close() {
	        clearTimeout(this._timer);
	        this._listenerRemovers.forEach(removers => {
	            removers.forEach(r => r());
	        });
	        this._listenerRemovers.clear();
	        const parent = this._link.parent;
	        if (parent) {
	            // parent.removeListener('child:add', this._onParentChild);
	            parent.removeListener('child:delete', this._onParentChild);
	        }
	    }
	}
	exports.FSWatcher = FSWatcher; 
} (volume));

var lists = {};

Object.defineProperty(lists, "__esModule", {
  value: true
});
lists.fsSyncMethods = lists.fsProps = lists.fsAsyncMethods = void 0;
lists.fsProps = ['constants', 'F_OK', 'R_OK', 'W_OK', 'X_OK', 'Stats'];
lists.fsSyncMethods = ['renameSync', 'ftruncateSync', 'truncateSync', 'chownSync', 'fchownSync', 'lchownSync', 'chmodSync', 'fchmodSync', 'lchmodSync', 'statSync', 'lstatSync', 'fstatSync', 'linkSync', 'symlinkSync', 'readlinkSync', 'realpathSync', 'unlinkSync', 'rmdirSync', 'mkdirSync', 'mkdirpSync', 'readdirSync', 'closeSync', 'openSync', 'utimesSync', 'futimesSync', 'fsyncSync', 'writeSync', 'readSync', 'readFileSync', 'writeFileSync', 'appendFileSync', 'existsSync', 'accessSync', 'fdatasyncSync', 'mkdtempSync', 'copyFileSync', 'rmSync', 'createReadStream', 'createWriteStream'];
lists.fsAsyncMethods = ['rename', 'ftruncate', 'truncate', 'chown', 'fchown', 'lchown', 'chmod', 'fchmod', 'lchmod', 'stat', 'lstat', 'fstat', 'link', 'symlink', 'readlink', 'realpath', 'unlink', 'rmdir', 'mkdir', 'mkdirp', 'readdir', 'close', 'open', 'utimes', 'futimes', 'fsync', 'write', 'read', 'readFile', 'writeFile', 'appendFile', 'exists', 'access', 'fdatasync', 'mkdtemp', 'copyFile', 'rm', 'watchFile', 'unwatchFile', 'watch'];

(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.memfs = exports.fs = exports.createFsFromVolume = exports.vol = exports.Volume = void 0;
	const Stats_1 = Stats$1;
	const Dirent_1 = Dirent$1;
	const volume_1 = volume;
	const { fsSyncMethods, fsAsyncMethods } = lists;
	const constants_1 = constants;
	const { F_OK, R_OK, W_OK, X_OK } = constants_1.constants;
	exports.Volume = volume_1.Volume;
	// Default volume.
	exports.vol = new volume_1.Volume();
	function createFsFromVolume(vol) {
	    const fs = { F_OK, R_OK, W_OK, X_OK, constants: constants_1.constants, Stats: Stats_1.default, Dirent: Dirent_1.default };
	    // Bind FS methods.
	    for (const method of fsSyncMethods)
	        if (typeof vol[method] === 'function')
	            fs[method] = vol[method].bind(vol);
	    for (const method of fsAsyncMethods)
	        if (typeof vol[method] === 'function')
	            fs[method] = vol[method].bind(vol);
	    fs.StatWatcher = vol.StatWatcher;
	    fs.FSWatcher = vol.FSWatcher;
	    fs.WriteStream = vol.WriteStream;
	    fs.ReadStream = vol.ReadStream;
	    fs.promises = vol.promises;
	    fs._toUnixTimestamp = volume_1.toUnixTimestamp;
	    fs.__vol = vol;
	    return fs;
	}
	exports.createFsFromVolume = createFsFromVolume;
	exports.fs = createFsFromVolume(exports.vol);
	/**
	 * Creates a new file system instance.
	 *
	 * @param json File system structure expressed as a JSON object.
	 *        Use `null` for empty directories and empty string for empty files.
	 * @param cwd Current working directory. The JSON structure will be created
	 *        relative to this path.
	 * @returns A `memfs` file system instance, which is a drop-in replacement for
	 *          the `fs` module.
	 */
	const memfs = (json = {}, cwd = '/') => {
	    const volume = exports.Volume.fromJSON(json, cwd);
	    const fs = createFsFromVolume(volume);
	    return fs;
	};
	exports.memfs = memfs;
	module.exports = Object.assign(Object.assign({}, module.exports), exports.fs);
	module.exports.semantic = true; 
} (lib$1, lib$1.exports));

var libExports = lib$1.exports;

var __importDefault$1 = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(fs, "__esModule", { value: true });
const fs_1 = __importDefault$1(libExports);
const util_1 = __importDefault$1(util$3);
fs.default = {
    existsSync: fs_1.default.existsSync,
    readFile: util_1.default.promisify(fs_1.default.readFile),
    watchFile: fs_1.default.watchFile,
};

var ip = {};

var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(ip, "__esModule", { value: true });
const net_1 = __importDefault(require$$0$2);
const parseIPv4 = (input) => {
    const ip = input.split('.', 4);
    const o0 = parseInt(ip[0]);
    const o1 = parseInt(ip[1]);
    const o2 = parseInt(ip[2]);
    const o3 = parseInt(ip[3]);
    return [o0, o1, o2, o3];
};
const hex = (v) => {
    v = parseInt(v, 10).toString(16);
    return v.length === 2 ? v : '0' + v;
};
const parseIPv6 = (ip) => {
    const addr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let i;
    let parsed;
    let chunk;
    if (ip.indexOf('.') > -1) {
        ip = ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, (match, a, b, c, d) => {
            return hex(a) + hex(b) + ':' + hex(c) + hex(d);
        });
    }
    const [left, right] = ip.split('::', 2);
    if (left) {
        parsed = left.split(':');
        for (i = 0; i < parsed.length; i++) {
            chunk = parseInt(parsed[i], 16);
            addr[i * 2] = chunk >> 8;
            addr[i * 2 + 1] = chunk & 0xff;
        }
    }
    if (right) {
        parsed = right.split(':');
        const offset = 16 - parsed.length * 2;
        for (i = 0; i < parsed.length; i++) {
            chunk = parseInt(parsed[i], 16);
            addr[offset + i * 2] = chunk >> 8;
            addr[offset + (i * 2 + 1)] = chunk & 0xff;
        }
    }
    return addr;
};
const parse = (ip) => {
    return ip.indexOf(':') === -1 ? parseIPv4(ip) : parseIPv6(ip);
};
const bitAt = (rawAddress, idx) => {
    const bufIdx = idx >> 3;
    const bitIdx = 7 ^ (idx & 7);
    return (rawAddress[bufIdx] >>> bitIdx) & 1;
};
const validate = (ip) => {
    const version = net_1.default.isIP(ip);
    return version === 4 || version === 6;
};
ip.default = {
    bitAt,
    parse,
    validate,
};

var isGzip = {};

Object.defineProperty(isGzip, "__esModule", { value: true });
isGzip.default = (buf) => {
    if (!buf || buf.length < 3) {
        return false;
    }
    return buf[0] === 0x1f && buf[1] === 0x8b && buf[2] === 0x08;
};

var utils = {};

Object.defineProperty(utils, "__esModule", { value: true });
const concat2 = (a, b) => {
    return (a << 8) | b;
};
const concat3 = (a, b, c) => {
    return (a << 16) | (b << 8) | c;
};
const concat4 = (a, b, c, d) => {
    return (a << 24) | (b << 16) | (c << 8) | d;
};
const legacyErrorMessage = `Maxmind v2 module has changed API.\n\
Upgrade instructions can be found here: \
https://github.com/runk/node-maxmind/wiki/Migration-guide\n\
If you want to use legacy libary then explicitly install maxmind@1`;
utils.default = {
    concat2,
    concat3,
    concat4,
    legacyErrorMessage,
};

(function (exports) {
	var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __exportStar = (commonjsGlobal && commonjsGlobal.__exportStar) || function(m, exports) {
	    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
	};
	var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
	    return (mod && mod.__esModule) ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Reader = exports.validate = exports.init = exports.openSync = exports.open = void 0;
	const assert_1 = __importDefault(requireAssert());
	const mmdb_lib_1 = lib$2;
	Object.defineProperty(exports, "Reader", { enumerable: true, get: function () { return mmdb_lib_1.Reader; } });
	const tiny_lru_1 = tinyLru;
	const fs_1 = __importDefault(fs);
	const ip_1 = __importDefault(ip);
	const is_gzip_1 = __importDefault(isGzip);
	const utils_1 = __importDefault(utils);
	const open = async (filepath, opts, cb) => {
	    var _a;
	    (0, assert_1.default)(!cb, utils_1.default.legacyErrorMessage);
	    const database = await fs_1.default.readFile(filepath);
	    if ((0, is_gzip_1.default)(database)) {
	        throw new Error('Looks like you are passing in a file in gzip format, please use mmdb database instead.');
	    }
	    const cache = (0, tiny_lru_1.lru)(((_a = opts === null || opts === void 0 ? void 0 : opts.cache) === null || _a === void 0 ? void 0 : _a.max) || 10000);
	    const reader = new mmdb_lib_1.Reader(database, { cache });
	    if (opts && !!opts.watchForUpdates) {
	        if (opts.watchForUpdatesHook &&
	            typeof opts.watchForUpdatesHook !== 'function') {
	            throw new Error('opts.watchForUpdatesHook should be a function');
	        }
	        const watcherOptions = {
	            persistent: opts.watchForUpdatesNonPersistent !== true,
	        };
	        fs_1.default.watchFile(filepath, watcherOptions, async () => {
	            const waitExists = async () => {
	                for (let i = 0; i < 3; i++) {
	                    if (fs_1.default.existsSync(filepath)) {
	                        return true;
	                    }
	                    await new Promise((a) => setTimeout(a, 500));
	                }
	                return false;
	            };
	            if (!(await waitExists())) {
	                return;
	            }
	            const updatedDatabase = await fs_1.default.readFile(filepath);
	            cache.clear();
	            reader.load(updatedDatabase);
	            if (opts.watchForUpdatesHook) {
	                opts.watchForUpdatesHook();
	            }
	        });
	    }
	    return reader;
	};
	exports.open = open;
	const openSync = () => {
	    throw new Error(utils_1.default.legacyErrorMessage);
	};
	exports.openSync = openSync;
	const init = () => {
	    throw new Error(utils_1.default.legacyErrorMessage);
	};
	exports.init = init;
	exports.validate = ip_1.default.validate;
	__exportStar(lib$2, exports);
	exports.default = {
	    init: exports.init,
	    open: exports.open,
	    openSync: exports.openSync,
	    validate: ip_1.default.validate,
	};
	
} (lib$3));

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class ClientLocation {
    registerTypes(schema) {
        schema.registerSchema({
            namespace: "urn:tailjs:maxmind",
            variables: {
                session: {
                    mx: {
                        visibility: "trusted-only",
                        primitive: "string"
                    },
                    country: {
                        primitive: "string"
                    }
                }
            }
        });
    }
    async patch(events, next, tracker) {
        if (!tracker.session) return next(events);
        if (!this._initialized) throw new Error("Not initialized");
        //if (!tracker.consent?.active) return events;
        const env = tracker.env;
        let country = "NA";
        const ip = tracker.clientIp;
        if (ip) {
            // Send a new location event whenever the consent changes.
            // The new consent may influence how much data gets tracked.
            const clientHash = env.hash(ip + JSON.stringify(tracker.consent));
            if (await tracker.get({
                scope: "session",
                key: "mx"
            }).value() !== clientHash) {
                var _this__reader, _location_country;
                const location = this.filterNames((_this__reader = this._reader) === null || _this__reader === void 0 ? void 0 : _this__reader.get(ip));
                tracker.requestItems.set(ClientLocation.name, this.filterNames(location, this._language));
                if (location) {
                    var _location_location, _location_postal, _location_location1, _location_location2, _this__reader_metadata_buildEpoch, _this__reader1;
                    var _this__reader_metadata_buildEpoch_toString;
                    events = [
                        ...events,
                        restrict({
                            type: "session_location",
                            accuracy: (_location_location = location.location) === null || _location_location === void 0 ? void 0 : _location_location.accuracy_radius,
                            city: location.city ? {
                                name: location.city.names[this._language],
                                geonames: location.city.geoname_id,
                                confidence: location.city.confidence
                            } : undefined,
                            zip: (_location_postal = location.postal) === null || _location_postal === void 0 ? void 0 : _location_postal.code,
                            subdivision: location.subdivisions ? location.subdivisions.map((sub)=>({
                                    name: sub.names[this._language],
                                    geonames: sub.geoname_id,
                                    iso: sub.iso_code,
                                    confidence: sub.confidence
                                }))[0] : undefined,
                            country: location.country ? {
                                name: location.country.names[this._language],
                                geonames: location.country.geoname_id,
                                iso: location.country.iso_code
                            } : undefined,
                            continent: location.continent ? {
                                name: location.continent.names[this._language],
                                geonames: location.continent.geoname_id,
                                iso: location.continent.code
                            } : undefined,
                            lat: (_location_location1 = location.location) === null || _location_location1 === void 0 ? void 0 : _location_location1.latitude,
                            lng: (_location_location2 = location.location) === null || _location_location2 === void 0 ? void 0 : _location_location2.longitude,
                            tags: [
                                {
                                    tag: "maxmind:build-epoch",
                                    value: (_this__reader_metadata_buildEpoch_toString = (_this__reader1 = this._reader) === null || _this__reader1 === void 0 ? void 0 : (_this__reader_metadata_buildEpoch = _this__reader1.metadata.buildEpoch) === null || _this__reader_metadata_buildEpoch === void 0 ? void 0 : _this__reader_metadata_buildEpoch.toString()) !== null && _this__reader_metadata_buildEpoch_toString !== void 0 ? _this__reader_metadata_buildEpoch_toString : "(unknown)"
                                }
                            ]
                        })
                    ];
                }
                var _location_country_names_this__language;
                country = (_location_country_names_this__language = location === null || location === void 0 ? void 0 : (_location_country = location.country) === null || _location_country === void 0 ? void 0 : _location_country.names[this._language]) !== null && _location_country_names_this__language !== void 0 ? _location_country_names_this__language : "NA";
                await tracker.set([
                    {
                        scope: "session",
                        key: "mx",
                        value: clientHash,
                        force: true
                    },
                    {
                        scope: "session",
                        key: "country",
                        value: country,
                        force: true
                    }
                ]);
            }
        }
        return await next(events);
    }
    filterNames(parent, language = "en") {
        if (typeof parent !== "object") return;
        for(const p in parent){
            const value = parent[p];
            if (typeof value !== "object") continue;
            if (p === "names") {
                var _value_language;
                const primaryName = (_value_language = value[language]) !== null && _value_language !== void 0 ? _value_language : value["en"];
                if (primaryName) {
                    parent[p] = {
                        [language]: value[language]
                    };
                }
                continue;
            }
            this.filterNames(value);
        }
        return parent;
    }
    async initialize(host) {
        if (this._initialized == (this._initialized = true)) {
            return;
        }
        const createReader = async (watch)=>{
            const data = await host.read(this._mmdb, watch ? async ()=>await createReader(false) : undefined);
            this._reader = data ? new lib$3.Reader(buffer$1.Buffer.from(data)) : null;
            if (this._reader == null) {
                host.error(this, `'${this._mmdb}' could not be loaded from the environment host.`);
            }
        };
        await createReader(true);
    }
    constructor({ language = "en", mmdb = "maxmind/GeoLite2-City.mmdb" } = {}){
        _define_property(this, "_language", void 0);
        _define_property(this, "_mmdb", void 0);
        _define_property(this, "_i", 0);
        _define_property(this, "_initialized", false);
        _define_property(this, "_reader", void 0);
        _define_property(this, "id", "ClientLocation");
        this._language = language;
        this._mmdb = mmdb;
    }
}

export { ClientLocation };

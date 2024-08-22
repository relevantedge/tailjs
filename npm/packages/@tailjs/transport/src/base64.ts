const codes: number[] = [];
const chars: number[] = [];
export const charCode = (s: string, index = 0) => s.charCodeAt(index);
export const fromCharCodes = (chars: number[]) => String.fromCharCode(...chars);

[..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"].forEach(
  (p, i) => (codes[(chars[i] = p.charCodeAt(0))] = i)
);

/**
 * Encodes an array of bytes to Base64URL without padding (URL safe Base64 using `-` and `_` instead of `+` and `/`).
 *
 * (thanks to Jon Leighton at https://gist.github.com/jonleighton/958841).
 */
export const to64u = (bytes: Uint8Array) => {
  let i = 0;
  let chunk: number;
  const n = bytes.length;

  const base64: number[] = [];
  while (i < n) {
    chunk = (bytes[i++] << 16) | (bytes[i++] << 8) | bytes[i++];
    base64.push(
      chars[(chunk & 16515072) >> 18],
      chars[(chunk & 258048) >> 12],
      chars[(chunk & 4032) >> 6],
      chars[chunk & 63]
    );
  }
  base64.length += n - i;

  return fromCharCodes(base64);
};

/**
 * Decodes a BaseURL encoded string (without padding).
 */
export const from64u = (encoded: string) => {
  let i = 0;
  let j = 0;
  let p: number;
  const n = encoded.length;
  const bytes = new Uint8Array(3 * ((n / 4) | 0) + (((n + 3) & 3) % 3));
  while (i < n) {
    bytes[j++] =
      (codes[charCode(encoded, i++)] << 2) |
      ((p = codes[charCode(encoded, i++)]) >> 4);
    if (i < n) {
      bytes[j++] = ((p & 15) << 4) | ((p = codes[charCode(encoded, i++)]) >> 2);
      if (i < n) {
        bytes[j++] = ((p & 3) << 6) | codes[charCode(encoded, i++)];
      }
    }
  }
  return bytes;
};

/**
 * Decodes the specified UTF8 bytes to a string.
 *
 * [Thanks!](https://gist.github.com/Yaffle/5458286)
 */
export const decodeUtf8 = <T extends Uint8Array | string | null | undefined>(
  octets: T
): T extends null | undefined ? undefined : string => {
  if (octets == null) return undefined as any;
  if (typeof octets === "string") return octets as any;

  const chars: number[] = [];
  let i = 0;
  while (i < octets.length) {
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
      while (k < bytesNeeded) {
        octet = octets[i + k + 1];
        codePoint = (codePoint << 6) | (octet & 0x3f);
        k += 1;
      }
    } else {
      codePoint = 0xfffd;
      bytesNeeded = octets.length - i;
    }
    chars.push(codePoint);
    i += bytesNeeded + 1;
  }

  return String.fromCodePoint(...chars) as any;
};

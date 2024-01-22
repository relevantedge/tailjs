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

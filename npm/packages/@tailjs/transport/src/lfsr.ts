import { Nullish, isBoolean } from "@tailjs/util";

/** The number of leading entropy bytes. */
const ENTROPY = 4;
/** The padding length. Cipher texts will always be a multiple of this. */
const MAX_PADDING = 16;

// https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV_hash_parameters
type Fnv1aConfiguration = [offset: bigint, prime: bigint];
const FNVs: Record<number, Fnv1aConfiguration> = {
  32: [0x811c9dc5n, 0x01000193n],
  64: [0xcbf29ce484222325n, 0x100000001b3n],
  128: [0x6c62272e07bb014262b821756295c58dn, 0x1000000000000000000013bn],
};

/** A random byte. */
const entropy = (max = 256) => (max * Math.random()) | 0;

export type HashFunction<T> = {
  (value: T, bits?: 32 | 64 | 128): string;
  <B extends boolean>(value: T, numeric: B): B extends true ? number : string;
};

export type CipherFunction = (data: Uint8Array) => Uint8Array;
export type CipherFunctions = [
  CipherFunction,
  CipherFunction,
  HashFunction<Uint8Array>
];

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
 */
export const lfsr = (key?: string | Nullish): CipherFunctions => {
  /** Number of source bytes for (en/de)cryption. */
  let n: number;
  /** Source byte index. */
  let i: number;
  /** Target byte index. */
  let j: number;
  /** Padding length. */
  let pad: number;

  /** Holds the (en/de)crypted bytes. */
  let target: Uint8Array;

  /** Hash code. */
  let hash = 0n;

  /** Bits for FNV-1a hash code. */
  let bits = 0;

  /** Prime for FNV-1a hash code. */
  let prime = 0n;

  /**
   * The sliding window with the past ciphers used to update for the mixer.
   * It works as a linear feedback shfit register to bolster against frequency analysis.
   *
   * http://quinnftw.com/xor-ciphers/.
   */
  let window: number[] = [];

  /** The mixer used to iteratively update the key while (en/de)crypting. */
  let mixer = 0;
  /** The mixer modulo 256. */
  let mixer255 = 0;

  /** Current start of the mixer window. */
  let iw = 0;
  /** Initial mixer. */
  let mixer0 = 0;
  /** Initial bytes for the mixer. */
  const window0: number[] = [];

  for (
    iw = 0;
    iw < key?.length!;
    mixer0 += window0[iw] = key!.charCodeAt(iw++)
  );

  /** Resets the mixer when (en/de)cryption starts. */
  const resetMixer = key
    ? () => {
        window = [...window0];
        mixer255 = (mixer = mixer0) & 255;
        iw = -1;
      }
    : () => {};

  /** Updates the mixer with the (en/de)crypted byte. */
  const updateMixer = (c: number) => (
    (mixer255 =
      (mixer +=
        // Subtract the byte leaving the window.
        -window[(iw = (iw + 1) % window.length)] +
        // Add the byte entering the window.
        (window[iw] = c)) & 255),
    c
  );

  return [
    // Encrypt
    key
      ? (source) => {
          resetMixer();
          n = source.length;
          pad = MAX_PADDING - ((n + ENTROPY) % MAX_PADDING);
          target = new Uint8Array(ENTROPY + n + pad);

          for (j = 0; j < ENTROPY - 1; target[j++] = updateMixer(entropy()));

          // Align last entropy byte to max padding and add padding.
          target[j++] = updateMixer(
            mixer255 ^ (MAX_PADDING * entropy(256 / MAX_PADDING) + pad)
          );

          for (i = 0; i < n; target[j++] = updateMixer(mixer255 ^ source[i++]));
          while (pad--) target[j++] = entropy();

          return target;
        }
      : (source) => source,

    // Decrypt
    key
      ? (source) => {
          resetMixer();
          for (i = 0; i < ENTROPY - 1; updateMixer(source[i++]));
          n =
            source.length -
            ENTROPY -
            // Padding. If padding is zero it all last PADDING characters are padding.
            ((mixer255 ^ updateMixer(source[i++])) % MAX_PADDING ||
              MAX_PADDING);
          if (n <= 0) return new Uint8Array(0);

          target = new Uint8Array(n);

          for (j = 0; j < n; target[j++] = mixer255 ^ updateMixer(source[i++]));
          return target;
        }
      : (cipher) => cipher,

    // FNV1a hash code.
    (source: Uint8Array, numericOrBits: any = 64) => {
      if (source == null) return null;
      bits = isBoolean(numericOrBits) ? 64 : numericOrBits;

      resetMixer();

      [hash, prime] = FNVs[bits];

      for (
        i = 0;
        i < source.length;
        hash = BigInt.asUintN(
          bits,
          (hash ^ BigInt(mixer255 ^ updateMixer(source[i++]))) * prime
        )
      );

      return numericOrBits === true
        ? Number(
            BigInt(Number.MIN_SAFE_INTEGER) +
              (hash % BigInt(Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER))
          )
        : (hash.toString(36) as any);
    },
  ];
};

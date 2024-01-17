// import {
//   BinaryLike,
//   CipherKey,
//   createCipheriv,
//   createDecipheriv,
//   createHash,
//   getCipherInfo,
// } from "crypto";
// import {
//   CryptoProvider,
//   DefaultCryptoProvider,
//   KeyConfiguration,
// } from "../shared";

// // It is fast and small, as Alice said to Bob.
// const DEFAULT_ALGORITHM = "des-ede-cbc";

// type Cipher = readonly [
//   algorithm: string,
//   key: CipherKey,
//   iv: BinaryLike | null
// ];

// export class NativeCryptoProvider implements CryptoProvider {
//   // The first one is the active one. The other ones can be used for key rotation.
//   private readonly _ciphers: Record<string, Cipher | null>; //[algorithm,key,iv,success indicator]
//   private readonly _currentCipher: readonly [string, Cipher | null];
//   public get enabled() {
//     return this._currentCipher?.[1] != null;
//   }

//   constructor(keys: KeyConfiguration[]) {
//     const ciphers = keys
//       .map(({ id, algorithm, key }) => {
//         id = DefaultCryptoProvider.hash(this.hash(id));
//         if (!key) return [id, null] as const; // No key (encryption disabled).
//         const keyHash = createHash("sha256");
//         const bytes = keyHash.update(key, "utf-8").digest();
//         algorithm = algorithm || DEFAULT_ALGORITHM;
//         const { ivLength, keyLength } = getCipherInfo(algorithm) ?? {};
//         if (keyLength) {
//           return [
//             id,
//             [
//               algorithm,
//               bytes.subarray(0, keyLength),
//               ivLength ? bytes.subarray(keyLength, keyLength + ivLength) : null,
//             ] as Cipher,
//           ] as const;
//         } else {
//           console.error(`Unsupported algorithm ${algorithm}`);
//           return null!;
//         }
//       })
//       .filter(Boolean);
//     this._currentCipher = ciphers[0];
//     this._ciphers = Object.fromEntries(ciphers);
//   }

//   public hash(cipherText: string) {
//     const hash = createHash("sha1");
//     hash.update(cipherText, "utf-8");
//     return hash.digest("base64");
//   }

//   public decrypt(cipherText: string) {
//     if (!this._currentCipher) {
//       // Encryption is disabled.
//       return null;
//     }
//     // Cipher ID? ')' payload
//     const parts = cipherText.match(/^([^)]*)\)(.*)/);
//     if (!parts?.[1]) {
//       return !parts ? cipherText : parts[2];
//     }
//     const cipher = this._ciphers[parts[1]];
//     cipherText = parts[2];
//     if (!cipher || !cipherText) {
//       return "";
//     }

//     const [algorithm, key, iv] = cipher;

//     const decipher = createDecipheriv(algorithm, key, iv);
//     return `${decipher.update(
//       `${cipherText}`.replace(/[\-_]/g, (m) =>
//         m === "-" ? "+" : m === "_" ? "/" : m === "." ? "=" : m
//       ),
//       "base64",
//       "utf8"
//     )}${decipher.final("utf8")}`;
//   }

//   public encrypt(text: string) {
//     if (!this._currentCipher) {
//       // Encryption is disabled
//       return null;
//     }

//     const [id, cipherConfig] = this._currentCipher;
//     if (!cipherConfig) {
//       return `)${text}`;
//     }
//     const [algorithm, key, iv] = cipherConfig;
//     const cipher = createCipheriv(algorithm, key, iv);
//     return `${id})${cipher.update(text, "utf8", "base64")}${cipher.final(
//       "base64"
//     )}`.replace(/[\+\/\=]/g, (m) =>
//       m === "+" ? "-" : m === "/" ? "_" : m === "=" ? "." : m
//     );
//   }
// }

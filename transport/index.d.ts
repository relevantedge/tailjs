import { Nullish, IsNever } from '@tailjs/util';

declare const charCode: (s: string, index?: number) => number;
declare const fromCharCodes: (chars: number[]) => string;
/**
 * Encodes an array of bytes to Base64URL without padding (URL safe Base64 using `-` and `_` instead of `+` and `/`).
 *
 * (thanks to Jon Leighton at https://gist.github.com/jonleighton/958841).
 */
declare const to64u: (bytes: Uint8Array) => string;
/**
 * Decodes a BaseURL encoded string (without padding).
 */
declare const from64u: (encoded: string) => Uint8Array<ArrayBuffer>;
/**
 * Decodes the specified UTF8 bytes to a string.
 *
 * [Thanks!](https://gist.github.com/Yaffle/5458286)
 */
declare const decodeUtf8: <T extends Uint8Array | string | null | undefined>(octets: T) => T extends null | undefined ? undefined : string;

type HashFunction<T> = {
    (value: T, bits?: 32 | 64 | 128): string;
    <B extends boolean>(value: T, numeric: B): B extends true ? number : string;
};
type CipherFunction = (data: Uint8Array) => Uint8Array;
type CipherFunctions = [
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
declare const lfsr: (key?: string | Nullish) => CipherFunctions;

type ConverterFunctionValue<T> = T extends {
    toJSON(): infer V;
} ? V : T extends {
    valueOf(): infer V;
} ? V : T;
type ConverterValue<T> = T extends ConverterFunctionValue<T> ? never : ConverterFunctionValue<T>;
type EncodableArray = Encodable[];
type EncodableTuple = [...Items: Encodable[]];
type EncodableObject = Partial<{
    [K in string | number]?: Encodable;
}>;
/**
 * All possible values that can be represented with JSON.
 */
type Encodable = null | undefined | string | number | boolean | EncodableArray | EncodableTuple | EncodableObject;
/**
 * The shape of the data that will come back when decoding the encoded value of a type.
 *
 * This assumes that only the shapes permitted by {@link Encodable} are serialized.
 * Otherwise not ignored since functions are in fact serialized as `{}`.
 */
type Decoded<T = Encodable> = Encodable extends T ? Encodable : T extends void ? undefined : T extends string | number | boolean | null | undefined ? T : IsNever<ConverterValue<T>> extends false ? Decoded<ConverterValue<T>> : T extends any[] ? {
    [index in keyof T]: Decoded<T[index]>;
} : T extends Iterable<infer T> ? Decoded<T>[] : T extends (...args: any[]) => any ? undefined : T extends object ? {
    -readonly [P in keyof T as P extends string | number ? Decoded<T[P]> extends undefined ? never : P : never]: Decoded<T[P]>;
} : never;
/**
 * The broadest possible subtype of a given type that can be serialized and then deserialized without violating the type's contract,
 * with the exception of well-known symbol properties. Those are ignored.
 *
 * Not violating the contract does not mean that the type can loslessly be serialized and then deserialized back.
 * It just means that its contract will not be violated if values of a certain type are omitted or deserialized back to another valid subtype.
 * For example, an iterable that is not an array will be deserialized as an array.
 *
 * In particular functions or promises are serialized as empty objects `{}`, and cannot be deserialized back.
 * This means that required constraints on properties that only allow these types can never be met.
 * Similarly, arrays the can only hold functions or promises must be empty (`never[]`) to satisfy the type constraint.
 *
 */
type EncodableContract<T = Encodable> = Encodable extends T ? Encodable : T extends void ? undefined : T extends string | number | boolean | null | undefined | void ? T : IsNever<ConverterValue<T>> extends false ? EncodableContract<ConverterValue<T>> : T extends any[] ? {
    [index in keyof T]: EncodableContract<T[index]>;
} : T extends Iterable<any> ? T : T extends (...args: any[]) => any ? undefined : T extends object ? {
    [P in keyof T as P extends symbol ? never : P]: EncodableContract<T[P]>;
} : never;
/**
 * Encodes the specified value to an HTTP querystring/header safe string, that is, does not need to be URI escaped.
 * The function is analogous to `JSON.stringify`, except this one also supports references.
 * @param value The value to encode.
 * @param binary whether to serialize to a string (URL safe base 64) or Uint8Array. @default false
 *
 * @returns The HTTP encoded representation of the value.
 */
type Encoder = {
    <Binary extends boolean = false>(value: any, binary?: Binary): Binary extends true ? Uint8Array : string;
};
/**
 * Decodes a value encoded with an {@link Encoder}.
 */
type Decoder = <T = any>(encoded: string | Uint8Array | Nullish) => T | undefined;
type Transport = [
    encode: Encoder,
    decode: Decoder,
    hash: HashFunction<any>
];
interface TransportOptions {
    /**
     * Serialize/deserialize as JSON.
     *
     * @default false
     */
    json?: boolean;
    /**
     * Omit falsish values (`""`, `0` and `false`) unless explicitly set to `null`.
     *
     * @default true
     */
    defaultValues?: boolean;
    /** Indent JSON encoded strings. @default true */
    prettify?: boolean;
    /** Allow received messages to be JSON. */
    decodeJson?: boolean;
}
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lfsr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */
declare const createTransport: (key?: string | Nullish, options?: TransportOptions) => Transport;
declare const defaultTransport: Transport;
/** A transport that encrypts and decrypts messages, but also allows plain JSON message to be decoded.  */
declare const defaultJsonDecodeTransport: Transport;
declare const defaultJsonTransport: Transport;
declare const httpEncode: Encoder;
declare const httpDecode: Decoder;
declare const hash: HashFunction<any>;
declare const jsonEncode: Encoder;
declare const jsonDecode: Decoder;

export { type CipherFunction, type CipherFunctions, type Decoded, type Decoder, type Encodable, type EncodableArray, type EncodableContract, type EncodableObject, type EncodableTuple, type Encoder, type HashFunction, type Transport, type TransportOptions, charCode, createTransport, decodeUtf8, defaultJsonDecodeTransport, defaultJsonTransport, defaultTransport, from64u, fromCharCodes, hash, httpDecode, httpEncode, jsonDecode, jsonEncode, lfsr, to64u };

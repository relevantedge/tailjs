import msgpack from "@ygoe/msgpack";
const { deserialize, serialize } = msgpack;

import {
  IsNever,
  Nullish,
  isAnyObject,
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isNumber,
  isPlainObject,
  isString,
  isSymbol,
  isUndefined,
  map,
  tryCatch,
  undefined,
} from "@tailjs/util";
import { HashFunction, from64u, lfsr, to64u } from ".";

type ConverterFunctionValue<T> = T extends { toJSON(): infer V }
  ? V
  : T extends { valueOf(): infer V }
  ? V
  : T;

type ConverterValue<T> = T extends ConverterFunctionValue<T>
  ? never
  : ConverterFunctionValue<T>;

export type EncodableArray = Encodable[];

export type EncodableTuple = [...Items: Encodable[]];

export type EncodableObject = Partial<{
  [K in string | number]?: Encodable;
}>;

/**
 * All possible values that can be represented with JSON.
 */
export type Encodable =
  | null
  | undefined
  | string
  | number
  | boolean
  | EncodableArray
  | EncodableTuple
  | EncodableObject;

/**
 * The shape of the data that will come back when decoding the encoded value of a type.
 *
 * This assumes that only the shapes permitted by {@link Encodable} are serialized.
 * Otherwise not ignored since functions are in fact serialized as `{}`.
 */
export type Decoded<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reason, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? Decoded<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: Decoded<T[index]> }
  : T extends Iterable<infer T>
  ? Decoded<T>[]
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      -readonly [P in keyof T as P extends string | number
        ? Decoded<T[P]> extends undefined
          ? never
          : P
        : never]: Decoded<T[P]>;
    }
  : never;

/**
 * The broadest possible subtype of a given type that can be serialized and then deserialized without violating the type's contract,
 * with the exception of well-known symbol properties. Those are ignored.
 *
 * Not violating the constract does not mean that the type can loslessly be serialized and then deserialized back.
 * It just means that its contract will not be violated if values of a certain type are omitted or deserialized back to another valid subtype.
 * For example, an iterable that is not an array will be deserialized as an array.
 *
 * In particular functions or promises are serialized as empty objects `{}`, and cannot be deserialized back.
 * This means that required constraints on properies that only allow these types can never be met.
 * Similarly, arrays the can only hold functions or promises must be empty (`never[]`) to satisfy the type constraint.
 *
 */
export type EncodableContract<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reasons, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined | void
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? EncodableContract<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: EncodableContract<T[index]> }
  : T extends Iterable<any>
  ? T
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      // Fun fact: TypeScript keeps optional properties if we iterate keyof P and then exclude symbols with the `extends` construct.
      //  `(keyof T & symbol)` or `Exclude <keyof T, symbol>` makes all properties required. (`{ a?: undefined}` becomes `{a:undefined}`)
      // Keeping optional `undefined` properties means that the property name is still allowed in a type like `{a()?: boolean}`, even though functions are not allowed.
      [P in keyof T as P extends symbol ? never : P]: EncodableContract<T[P]>;
    }
  : never;

/**
 * Encodes the specified value to an HTTP querystring/header safe string, that is, does not need to be URI escaped.
 * The function is analogous to `JSON.stringify`, except this one also supports references.
 * @param value The value to encode.
 * @param validate This property has no effect other than letting TypeScript validate whether the value can be deserialized back to its original form without losing properties.
 *
 * @returns The HTTP encoded representation of the value.
 */
export type Encoder = {
  (value: any, validate?: false): string;
  <T = Encodable>(value: T & EncodableContract<T>, validate: true): string;
};

/**
 * Decodes a value encoded with an {@link Encoder}.
 */
export type Decoder = <T = any>(encoded: string | Nullish) => T | undefined;

const REF_PROP = "$ref";

/**
 * Misc. fixes to the msgpack library. For example, it does not handle exponential numbers well.
 */
const patchSerialize = (value: any) => {
  let cleaners: (() => void)[] | undefined;
  let refs: Map<any, number> | undefined;
  let refIndex: number;
  const patchProperty = (
    value: any,
    key: any,
    val = value[key],
    patched = inner(val)
  ) => (
    (val !== patched || isSymbol(key)) &&
      ((value[key] = patched), addCleaner(() => (value[key] = val))),
    val
  );
  const addCleaner = (cleaner: () => void) => (cleaners ??= []).push(cleaner);

  const inner = (value: any) => {
    if (value == null || isFunction(value) || isSymbol(value)) {
      return null;
    }

    // if (Number.isFinite(value) && !Number.isSafeInteger(value)) {
    //   // A bug in @ygoe/msgpack means floats do not get encoded. We need to encode them in a different way.
    //   // This is how it landed, since data structure is highly unlikely to be encountered,
    //   // yet it is probably not the best way to do this (apart from fixing the bug ofc.)
    //   floatView.setFloat64(0, value, true);
    //   return { "": [...new Uint32Array(floatBuffer)] };
    // }

    if (!isAnyObject(value)) {
      return value;
    }

    if ((value as any).toJSON && value !== (value = (value as any).toJSON())) {
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

    if (isPlainObject(value)) {
      refs.set(value, refs.size + 1);

      Object.keys(value).forEach(
        (k) =>
          (isUndefined(patchProperty(value, k)) || isSymbol(k)) &&
          delete value[k]
      );
    } else if (isIterable(value)) {
      // Array with undefined values or iterable (which is made into array.). ([,1,2,3] does not reveal its first entry).
      (!isArray(value) || Object.keys(value).length < value.length
        ? [...(value as any)]
        : value
      ).forEach((_, i) =>
        i in value
          ? patchProperty(value, i)
          : ((value[i] = null), addCleaner(() => delete value[i]))
      );
    }

    return value;
  };

  const serialized = serialize(inner(value));
  cleaners?.forEach((cleaner) => cleaner());
  return serialized;
};

const patchDeserialize = (value: Uint8Array) => {
  let refs: any[] | undefined;
  let matchedRef: any;

  const inner = (value: any) => {
    if (!isAnyObject(value)) return value;

    // if (isArray(value[""]) && (value = value[""]).length === 2) {
    //   return new DataView(new Uint32Array(value).buffer).getFloat64(0, true);
    // }

    if (value[REF_PROP] && (matchedRef = (refs ??= [])[value[REF_PROP]])) {
      return matchedRef;
    }

    if (value[REF_PROP]) {
      refs![value[REF_PROP]] = value;
      delete value[REF_PROP];
    }

    Object.entries(value).forEach(
      ([k, v]) => v !== (v = inner(v)) && (value[k] = v)
    );

    return value;
  };

  return value != null ? inner(deserialize(value)) : undefined;
};

export type Transport = [
  encode: Encoder,
  decode: Decoder,
  hash: HashFunction<any>
];

let _defaultTransports: [cipher: Transport, json: Transport] | undefined;
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lfsr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */
export const createTransport = (
  key?: string | Nullish,
  json = false,
  jsonDecodeFallback = true
): Transport => {
  const factory = (
    key?: string | Nullish,
    json = false,
    jsonDecodeFallback = true
  ): Transport => {
    const fastStringHash = (value: any, bitsOrNumeric: any) => {
      if (isNumber(value) && bitsOrNumeric === true) return value;

      value = isString(value)
        ? new Uint8Array(map(value.length, (i) => value.charCodeAt(i) & 255))
        : json
        ? JSON.stringify(value)
        : patchSerialize(value);
      return hash(value, bitsOrNumeric);
    };
    const jsonDecode = (encoded: any) =>
      encoded == null
        ? undefined
        : tryCatch(() => JSON.parse(encoded, undefined));
    if (json) {
      return [
        (data: any) => JSON.stringify(data),
        jsonDecode,
        (value: any, numericOrBits?: any) =>
          fastStringHash(value, numericOrBits) as any,
      ];
    }
    const [encrypt, decrypt, hash] = lfsr(key);

    return [
      (data: any) => to64u(encrypt(patchSerialize(data))),
      (encoded: any) =>
        encoded != null
          ? // JSON fallback.
            jsonDecodeFallback && (encoded?.[0] === "{" || encoded?.[0] === "[")
            ? jsonDecode(encoded)
            : patchDeserialize(decrypt(from64u(encoded)))
          : null,
      (value: any, numericOrBits?: any) =>
        fastStringHash(value, numericOrBits) as any,
    ];
  };

  if (!key) {
    return (_defaultTransports ??= [factory(null, false), factory(null, true)])[
      +json
    ];
  }
  return factory(key, json, jsonDecodeFallback);
};

export const defaultTransport = createTransport();
export const defaultJsonTransport = createTransport(null, true);

export const [httpEncode, httpDecode, hash] = defaultTransport;

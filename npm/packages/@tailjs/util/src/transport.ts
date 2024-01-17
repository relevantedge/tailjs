import { deserialize, serialize } from "@ygoe/msgpack";

// Use below when ad-hoc testing with nodmon. It doesn't like the import above (probabaly because of mangling).
//import msgpack from "@ygoe/msgpack";
//const { serialize, deserialize } = msgpack;

import {
  Encodable,
  EncodableContract,
  HashFunction,
  Nullish,
  from64u,
  hasValue,
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isNull,
  isNumber,
  isObject,
  isPureObject,
  isSymbol,
  isUndefined,
  lfsr,
  nil,
  to64u,
  tryCatch,
} from ".";
import { isFloat64Array } from "util/types";

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

const floatBuffer = new ArrayBuffer(8);
const floatView = new DataView(floatBuffer);

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
    if (isNull(value)) return nil;
    if (isUndefined(value) || isFunction(value) || isSymbol(value)) {
      return null;
    }

    if (Number.isFinite(value) && !Number.isSafeInteger(value)) {
      floatView.setFloat64(0, value, true);

      return { "": [...new Uint32Array(floatBuffer)] };
    }

    if (!isObject(value)) {
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

    if (isPureObject(value)) {
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
    if (!isObject(value)) return value;

    if (isArray(value[""]) && (value = value[""]).length === 2) {
      return new DataView(new Uint32Array(value).buffer).getFloat64(0, true);
    }

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

  return hasValue(value)
    ? tryCatch(
        () => inner(deserialize(value)),
        () => undefined
      )
    : value;
};

export type Transport = [
  encode: Encoder,
  decode: Decoder,
  hash: HashFunction<string>
];

/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lsfr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */
export const createTransport = (key?: null | string): Transport => {
  const [encrypt, decrypt, hash] = lfsr(key ?? "");

  return [
    (data: any) => to64u(encrypt(patchSerialize(data))),
    (encoded: any) =>
      hasValue(encoded) ? patchDeserialize(decrypt(from64u(encoded))) : null,
    (data: any, numericOrBits?: any) =>
      hash(serialize(data), numericOrBits) as any,
  ];
};

export const defaultTransport = createTransport();
export const [httpEncode, httpDecode, hash] = defaultTransport;

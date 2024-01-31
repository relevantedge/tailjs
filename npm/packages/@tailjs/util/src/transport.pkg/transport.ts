import { deserialize, serialize } from "@ygoe/msgpack";

import { HashFunction, from64u, lfsr, to64u } from ".";
import {
  IsNever,
  Nullish,
  hasValue,
  isArray,
  isDefined,
  isFunction,
  isIterable,
  isNull,
  isObject,
  isSymbol,
  isUndefined,
  nil,
  tryCatch,
} from "..";

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
    if (value == null || isFunction(value) || isSymbol(value)) {
      return null;
    }

    if (Number.isFinite(value) && !Number.isSafeInteger(value)) {
      floatView.setFloat64(0, value, true);

      return { "": [...new Uint32Array(floatBuffer)] };
    }

    if (!isObject(value, true)) {
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

    if (isObject(value)) {
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
    if (!isObject(value, true)) return value;

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
    : undefined;
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
export const createTransport = (
  key?: null | string,
  json = false
): Transport => {
  const [encrypt, decrypt, hash] = lfsr(key ?? "");
  return json
    ? [
        (data: any) => JSON.stringify(data),
        (encoded) =>
          encoded == null
            ? undefined
            : tryCatch(() => JSON.parse(encoded, undefined)),
        (data: any, numericOrBits?: any) =>
          hash(serialize(data), numericOrBits) as any,
      ]
    : [
        (data: any) => to64u(encrypt(patchSerialize(data))),
        (encoded: any) =>
          hasValue(encoded)
            ? patchDeserialize(decrypt(from64u(encoded)))
            : null,
        (data: any, numericOrBits?: any) =>
          hash(patchSerialize(data), numericOrBits) as any,
      ];
};

export const defaultTransport = createTransport();
export const [httpEncode, httpDecode, hash] = defaultTransport;
